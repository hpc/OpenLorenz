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

package Lorenz::REST::Queue;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Queue.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling queue-related Lorenz REST calls.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use vars qw(@ISA);
use JSON;
use Date::Parse;
use Date::Format;
use Lorenz::Config;
use Lorenz::Queue;
use Lorenz::REST::Job;
use Lorenz::REST::RESTHandler;
@ISA = ("Lorenz::REST::RESTHandler");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();

#--------------------------------------------------

sub get {
	my ($self,$args) = @_;

	if (defined $args->{host}) {
		$self->getAllJobsOnHost($args);
	} else {
		$self->getAllJobs();
	}
}

#======================================================================
#  /queue -- list all active jobs (all users and all hosts)
#======================================================================

sub getAllJobs {
	my ($self,$args) = @_;

#	my @jobs = Lorenz::Queue->getAllJobs();
	my @jobs = $self->_getFakeJobs();
	
	return $self->_prepJobList(@jobs);
}

#======================================================================
#  /queue/<host> -- list active jobs on given host
#======================================================================

sub getAllJobsOnHost {
	my ($self,$args) = @_;

	my $host     = $args->{host}     || return $self->preperr("'host' not defined");
	my $livedata = $args->{livedata} || 0;

#	my @jobs = Lorenz::Queue->getAllJobsOnHost($host,$livedata);
	my @jobs = $self->_getFakeJobs();

	return $self->_prepJobList(@jobs);
}

#======================================================================
#  /queue/<host>/<jobid>/steps -- show job steps for given job on given host
#======================================================================

sub getJobSteps {
	my ($self,$args) = @_;

	my $host = $args->{host};
	my $jobid = $args->{jobid};

	my @steps = ();

	my $obj = {
		'jobstep_count' => scalar(@steps),
		'jobstep_ids'   => \@steps
	};

	return $self->prepout($obj);
	
}


#======================================================================
#  /queue/<host>/<jobid> -- show details for given job on given host
#======================================================================

sub getJobInfo {
	my ($self,$args) = @_;

	my $host = $args->{host};
	my $jobid = $args->{jobid};
	my $livedata = $args->{livedata} || 0;

#	my %jobattrs = Lorenz::Queue->getJobInfo($host,$jobid,$livedata);
	my @jobs = $self->_getFakeJobs();

	return $self->prepout($jobs[0]);
}

#======================================================================
#  /queue/<host>/reservations -- list reservations on given host
#======================================================================
sub getReservations {
	my ($self,$args) = @_;

	my @list = Lorenz::Queue->getReservations($args->{host});

	return $self->prepout (\@list);
}

#======================================================================
#  /queue/<host>/reservation/<res> -- show details about given reservation
#======================================================================
sub getReservation {
	my ($self,$args) = @_;

	my %info = Lorenz::Queue->getReservation($args->{host},$args->{res});

	if (%info and scalar(keys %info)) {
		return $self->prepout(\%info);
	} else {
		return $self->preperr("Reservation: $args->{res} not found");
	}
}

#======================================================================
#  /user/<user>/queue -- show user's jobs across individual or all hosts
#======================================================================

sub getUsersQueue {
	my ($self,$args) = @_;

	my @jobs = $self->_getFakeJobs();

	return $self->_prepJobList(@jobs);
}

sub _prepJobList {
	my ($self,@jobs) = @_;

	my @d = localtime();
	my $now = strftime('%Y-%m-%d %T', @d);
	
	my $obj = {
		'jobs' => \@jobs,
		'last_update' => $now,
		'last_update_ms' => int(str2time($now)) * 1000
		};
	
	return $self->prepout ($obj);
}

# This is just here to provide fake data for the stubbed-out version of Lorenz server

sub _getFakeJobs {
	my $self = shift;
	
	my @jobs = (
         {
            "Dependency" => "",
            "EndTime" => "",
            "Host" => "hosta",
            "JobId" => "111111",
            "JobScheduler" => "slurm",
            "JobState" => "Idle",
            "JobSubmitter" => "moab",
            "MetaJobState" => "Running",
            "Name" => "myjob",
            "NumCPUs" => "4",
            "NumNodes" => "4",
            "Partition" => "pbatch",
            "Reason" => "",
            "StartTime" => "",
            "TimeLimit" => "16:00",
            "User" => "usera"
         }
		);
	return @jobs;
}

1;
