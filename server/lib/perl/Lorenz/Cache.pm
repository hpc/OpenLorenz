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

package Lorenz::Cache;

#===============================================================================
#									Cache.pm
#-------------------------------------------------------------------------------
#  Purpose:		Simple file-based cache implementation. Uses space in user's home dir.
#  Author:		Jeff Long, 3/2/2011
#  Notes:
#		See the individual subs for more modification history info.
#
#  Modification History:
#		03/02/2011 - jwl: Initial version
#===============================================================================

use strict;

our (@ISA, @EXPORT);
BEGIN {
	require Exporter;
	@ISA = qw(Exporter);
	@EXPORT = qw(get put list age exists);
}

sub new {
	my $proto = shift;
	my $class = ref($proto) || $proto;
	my $self  = {};

	bless ($self, $class);
	return $self;
}

# data = get(cache)

sub get {
	my $self = shift;
	my $cache = shift;
	
	my $cacheDir = $self->_checkCacheDir();
	my $contents="";
	open (F, "$cacheDir/$cache") or return (0);
	while (<F>) {
		$contents .= $_;
	}
	return $contents;
}

# ok = put(cache,contents)

sub put {
	my $self = shift;
	my $cache = shift;
	my $contents = shift;
	
	my $cacheDir = $self->_checkCacheDir();
	my $cacheFile = "$cacheDir/$cache";

	open (F, ">$cacheFile") or return (0);
	print F $contents;
	close F;

	# Deal with over quota or other file I/O issue
	if (length($contents) > 0 and -z "$cacheFile") {
		unlink $cacheFile;
		return 0;
	}

	return 1;
}

sub list {
	my $self = shift;
	my $cacheDir = $self->_checkCacheDir();

	my @s = `cd $cacheDir; /bin/ls -1 2>/dev/null`;
	my @caches=();
	foreach (@s) {
		chomp;
		push @caches, $_;
	}

	return @caches;
}

# ms = age(cache)

sub age() {
	my $self = shift;
	my $cache = shift;
	
	my $cacheDir = $self->_checkCacheDir();
	my $c = "$cacheDir/$cache";

	if (not -f $c or not -r _) {
		return -1;
	} else {
		return (stat($c))[9];
	}
}

# bool = newer(cache, fileOrTime) -- Return 1 if given cache is newer than given file (or time)

sub newer() {
	my $self = shift;
	my $cache = shift || return -1;
	my $fileOrTime  = shift || return -1; # Either an epoch time or path to file

	my $fileAge;
	
	my $cacheDir = $self->_checkCacheDir();
	my $c = "$cacheDir/$cache";

	if ($fileOrTime =~ /^\d+$/) {   # Supplied a time since epoch
		$fileAge = $fileOrTime;
	} elsif (not -f $c or not -r _ or not -r $fileOrTime) {
		return -1;
	} else {                        # Supplied a file path
		$fileAge  = (stat($fileOrTime))[9];
	} 

	my $cacheAge = (stat($c))[9];
	return ($cacheAge > $fileAge) ? 1 : 0;
}

# bool = exists(cache)

sub exists {
	my $self = shift;
	my $cache = shift;
	
	my $cacheDir = $self->_checkCacheDir();
	my $c = "$cacheDir/$cache";

	if (-f $c) {
		return 1;
	} else {
		return 0;
	}
}

# $numRemoved = delete(cache | "_all_")

sub delete {
	my $self = shift;
	my $cache = shift;
	
	my @caches = ();
	my $cacheDir = $self->_checkCacheDir();
	
	if ($cache eq "_all_") {
		@caches = $self->list();
	} else {
		push @caches, $cache;
	}

	my $nrm = 0;
	
	foreach my $c (@caches) {
		my $cfile = "$cacheDir/$cache";

		if (-f $cfile) {
			unlink $cfile;
			$nrm++;
		}
	}
	return $nrm;
}


sub _checkCacheDir {
	my $self = shift;

	my $lorenzDir = Lorenz::User->getUserLorenzDir();
	my $cacheDir = $lorenzDir.'/cache';
	
	#If no cache directory create it
	if(!-e $cacheDir){
		mkdir($cacheDir);
	}

	return ($cacheDir);
}	

1;

