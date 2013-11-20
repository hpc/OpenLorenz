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

package Lorenz::TempFile;

###########################################################################
# $URL: https://sourceforge.llnl.gov/svn/repos/lorenz/trunk/server/lib/perl/Lorenz/TempFile.pm $
# $Author: long6 $
# $Date: 2011-03-02 13:07:13 -0800 (Wed, 02 Mar 2011) $
# $Rev: 162 $
###########################################################################


#===============================================================================
#									TempFile.pm
#-------------------------------------------------------------------------------
#  Purpose:		Simple temporary file implementation.
#  Author:		Jeff Long, 3/2/2011
#  Notes:
#		See the individual subs for more modification history info.
#
#  Modification History:
#		03/02/2011 - jwl: Initial version
#===============================================================================

use strict;
use Lorenz::User;

our (@ISA, @EXPORT);
BEGIN {
	require Exporter;
	@ISA = qw(Exporter);
	@EXPORT = qw(get put list age);
}

sub new {
	my $proto = shift;
	my $class = ref($proto) || $proto;
	my $self  = {};

	bless ($self, $class);
	return $self;
}

sub make {
	my $self = shift;
	my $name = shift;
	my $contents = shift;
	
	my $tmpDir = $self->_checkTempFileDir();
	my $path = "$tmpDir/$name";

	unlink $path if (-e $path);
	
	open (F, ">$path") or return (0);
	print F $contents;
	close F;

	return $path;
}

sub list {
	my $self = shift;
	my $tmpDir = $self->_checkTempFileDir();

	my @s = `cd $tmpDir; /bin/ls -1 2>/dev/null`;
	my @tmps=();
	foreach (@s) {
		chomp;
		push @tmps, $_;
	}

	return @tmps;
}

sub age () {
	my $self = shift;
	my $tmp = shift;
	
	my $tmpDir = $self->_checkTempFileDir();
	my $c = "$tmpDir/$tmp";

	if (not -f $c or not -r _) {
		return -1;
	} else {
		return (stat($c))[9];
	}
}


sub _checkTempFileDir {
	my $self = shift;

	my $lorenzDir = Lorenz::User->getUserLorenzDir();
	my $tmpDir = $lorenzDir.'/tmp';
	
	#If no tmp directory create it
	if(!-e $tmpDir){
		mkdir($tmpDir);
	}

	return ($tmpDir);
}	

1;

