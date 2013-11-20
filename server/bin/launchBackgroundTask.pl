#!/usr/bin/perl
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


#===============================================================================
#									launchBackgroundTask.pl
#-------------------------------------------------------------------------------
#  Purpose:		Launch a task in the background, returning immediately.
#  Notes:
#
#		This script will return immediately after launching the background task.
#		The pid of the launched process is the only return value.
#
#  Usage:	launchBackgroundTask.pl command args
#
#===============================================================================

BEGIN {
	require '/usr/global/tools/lorenz/lib/lorenz.pl';
}

use Lorenz::Server;

my $cmd = join " ", @ARGV;
my $pid = execcmd($cmd);
my @kids = Lorenz::Server::getChildren($pid);

if ($pid > 0) {
	# pid returned is for the parent sub-shell of the desired process (defunct). The child of that pid is the one we want.
	if (@kids) {
		print "$kids[0]\n";
		exit 0;
	} else {
		print "0\n";
		exit 1;
	}
} else {
	exit 1;
}



sub execcmd {
	my $cmd = shift;

	return (0) if (length($cmd) <= 0);
	my $pid;

  FORK: {
	if ($pid = fork) {
		# The parent. Child process ID in $pid.
		return ($pid);	 
	} elsif (defined $pid) {
		# The child. Parent process ID avail with getppid().

		# create new process group
		setpgrp;
		exec $cmd or die "$0: exec failed: $!\n";
	} elsif ($! =~ /No more process/) {
		# EAGAIN, a supposedly recoverable fork error
		sleep 5;
		redo FORK;

	} else {
		# Weird fork error
		return (0);
	}
  } # FORK
	return 0;
}
