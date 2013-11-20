# ===============================================================================
#
# Copyright (c) 2013, Lawrence Livermore National Security, LLC.
# Produced at the Lawrence Livermore National Laboratory.
# Written by Jeff Long <long6@llnl.gov>, et. al.
# LLNL-CODE-640252
#
# This file is part of Lorenz.
#
# This program is free software; you can redistribute it and/or modify it
# under the terms of the GNU General Public License (as published by the
# Free Software Foundation) version 2, dated June 1991.
#
# This program is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the IMPLIED WARRANTY OF
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# terms and conditions of the GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software Foundation,
# Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
#
# ===============================================================================

package Lorenz::Store;

#===============================================================================
#									Store.pm
#-------------------------------------------------------------------------------
#  Purpose:		Methods for implementing a server-side data store (native)
#  Author:		Jeff Long
#  Notes:
#
#===============================================================================

use strict;
use JSON;
use File::Path qw(mkpath rmtree);
use File::Basename;
use Lorenz::Base;
use Lorenz::Host;
use Lorenz::System;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my %conf = Lorenz::Config::getLorenzConfig();


# $data = getStore(store)

sub getStore {
	my ($self,$store) = @_;

	my ($storeDir, $store) = $self->_checkStoreDir($store);
	return undef if (not $storeDir);
	
	my $currStore = "$storeDir/$store";
	my $data = '';
		
	if(-d $currStore){
		my @files = ();
		my @dirs = ();
		
		opendir(DIR, $currStore) || return "";
		while(my $item = readdir(DIR)){	
			next if $item =~ /^\./;
			
			push(@files, $item) if -f "$currStore/$item";
			
			push(@dirs, $item) if -d "$currStore/$item";
		}

		$data = {files => \@files, dirs => \@dirs};
	}
	else{
		open(IN, "<$currStore") or return undef;		
		while (<IN>) {
			$data .= $_;
		}
		close IN;
	}
	return $data;
}

# @storenames = getStoreList()

sub getStoreList {
	my $self = shift;

	my ($storeDir, $store) = $self->_checkStoreDir();

    my @s = `cd $storeDir; /usr/bin/find . -print 2>/dev/null`;
    my @stores=();
    foreach (@s) {
        chomp;
        next if $_ eq ".";
        s,^\./,,;
        push @stores, $_;
    }

    return @stores;
}

sub createStore {
	my ($self,$store,$data) = @_;

	my ($storeDir, $store) = $self->_checkStoreDir($store);
	return 0 if (not $storeDir);

	open(OUT, ">$storeDir/$store");
	print OUT $data; 
	close OUT;

	return 1;
}

sub appendToStore {
	my ($self,$store,$data) = @_;

	my ($storeDir, $store) = $self->_checkStoreDir($store);
	return 0 if (not $storeDir);

	open(OUT, ">>$storeDir/$store");
	print OUT $data; #the POST data comes through STDIN, as with all CGI scripts
	close OUT;
	
	return 1;
}


sub deleteStore {
	my ($self,$store) = @_;
	
	return Lorenz::Util->wraperr("[Store::delete] store not defined")
		if (not defined $store);

	my ($storeDir, $store) = $self->_checkStoreDir($store);
	return Lorenz::Util->wraperr("[Store::delete] $store")
		if (not $storeDir);

	my $nrm = rmtree ("$storeDir/$store", 0, 0);

	return $nrm;
}



sub _checkStoreDir {
	my ($self,$store) = @_;

	if ($store) {
		return("", "Invalid chars in store name")
			if ($store =~ /\.\./);	# Don't allow .. in paths
	}

	my $lorenzDir = Lorenz::User->getUserLorenzDir();
	return ("", "Could not locate user's home directory")
	  if (not $lorenzDir);
	my $storeDir = $lorenzDir.'/store';
	
	#If no store directory create it
	if(!-e $storeDir){
		mkdir($lorenzDir.'/store');
	}

	# If store contains subdirs, make sure those exist
	if ($store) {
		my $subpath = dirname($store);
		if ($subpath and $subpath ne ".") {
			$subpath = "$storeDir/$subpath";
			eval { mkpath($subpath) };
			if ($@) {
				return ("", "Could not create store path: $store. This is most likely because your home directory is not registered with Lorenz.  Please email lorenz-info\@your.site.here with this error.");
			}
		}
	}
	
	return ($storeDir, $store);
}	

1;
