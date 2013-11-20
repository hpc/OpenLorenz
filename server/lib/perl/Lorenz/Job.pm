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

package Lorenz::Job;

#===============================================================================
#									Job.pm
#-------------------------------------------------------------------------------
#  Purpose:		Job-centric methods (native)
#  Author:		Jeff Long
#  Notes:
#
#===============================================================================

use strict;
use File::Basename;
use Lorenz::Base;
use Lorenz::System;
use Lorenz::TempFile;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my %conf = Lorenz::Config::getLorenzConfig();

#
#  (out,err) = submitJob(host,submitType,{})  
#

sub submitJob {
	my ($self,$host,$submitType,$args) = @_;

}

#
#  (out,err,status) = cancelJob(host,jobid);
#

sub cancelJob {
	my ($self,$host,$jobid,$args) = @_;

}

#
#  (out,err,status) = submitJob(host,jobid,signal);
#
sub signalJob {
	my ($self,$host,$jobid,$signal,) = @_;

}

#
#  (out,err,status) = holdJob(host,jobid);
#

sub holdJob {
	my ($self,$host,$jobid) = @_;

}

#
#  (out,err,status) = unholdJob(host,jobid);
#

sub unholdJob {
	my ($self,$host,$jobid) = @_;

}

#
#  (out,err,status) = modifyJob(host,jobid);
#

sub modifyJob {
	my ($self,$host,$jobid,%atts) = @_;

}


#
#  %details = getJobSummary(host,jobid)
#

sub getJobSummary {
	my ($self,$host,$jobid) = @_;
	
}

sub getMetaJobState {
	my ($self,$host,$jobid) = @_;

}

sub mapJobStates {
	my ($self,$inputState) = @_;

}



1;
