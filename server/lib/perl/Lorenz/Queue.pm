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

package Lorenz::Queue;

#===============================================================================
#									Queue.pm
#-------------------------------------------------------------------------------
#  Purpose:		Methods related to interacting with the batch queue (native)
#  Author:		Jeff Long
#  Notes:
#
#===============================================================================

use strict;
use JSON;
use File::Path qw(mkpath rmtree);
use File::Basename;
use Lorenz::Base;
use Lorenz::Job;
use Lorenz::System;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my %conf = Lorenz::Config::getLorenzConfig();

# Establish connection to Lorenz data
my $ldata = Lorenz::LData->new();

#======================================================================
#  @jobs = getAllJobs()
#======================================================================

sub getAllJobs {
	my ($self,$args) = @_;

}

#======================================================================
#  @jobs = getAllJobsOnHost(host,livedata)
#======================================================================

sub getAllJobsOnHost {
	my ($self,$host,$livedata) = @_;
}

#======================================================================
#  @steps = getJobSteps(host,jobid)
#======================================================================

sub getJobSteps {
	my ($self,$host,$jobid) = @_;
}


#======================================================================
#  %jobinfo = getJobInfo($host,jobid,livedata)
#======================================================================

sub getJobInfo {
	my ($self,$host,$jobid,$livedata) = @_;
}

#======================================================================
#  @list = getReservations(host)
#======================================================================
sub getReservations {
	my ($self,$host) = @_;
}

#======================================================================
#  %info = getReservation(host,res)
#======================================================================
sub getReservation {
	my ($self,$host,$res) = @_;

}


#======================================================================
#  @jobs = getUsersQueue(user,host,type,livedata,showjobsteps)
#======================================================================

sub getUsersQueue {
	my ($self,$user,$args) = @_;

}

1;
