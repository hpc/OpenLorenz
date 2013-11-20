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

package Lorenz::REST::Job;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Job.pm
#-------------------------------------------------------------------------------
#  Purpose:		Helper functions for dealing with batch jobs within Lorenz.
#  Author:		Jeff Long, 6/5/2011
#  Notes:
#		See the individual subs for more modification history info.
#
#  Modification History:
#		06/05/2011 - jwl: Initial version
#===============================================================================

use strict;
use Lorenz::Job;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");


#--------------------------------------------------


#======================================================================
#  /queue/<host> [POST] -- submit job to queue for given host
#======================================================================
sub submitJob {
	my ($self,$args) = @_;

	my $host = $args->{host} ||
		return $self->preperr("'host' not defined");
	my $submitType = "";
	my %jobParams=();

	if (defined $args->{jobfile} and $args->{jobfile}) {
		$submitType = "jobfile";
		$jobParams{jobfile} = $args->{jobfile};
	} elsif (defined $args->{jobscript} and $args->{jobscript}) {
		$submitType = "jobscript";
		$jobParams{jobscript} = $args->{jobscript};
	} else {
		return $self->preperr ("Must define either 'jobfile' or 'jobscript'");
	}

	# Collect all of the job-related parameters passed from the UI -- these
	# will be converted to execute line options for msub/sbatch
	foreach (keys %$args) {
		if (/^job_/) {
			$jobParams{$_} = $args->{$_};
		}
	}

	my ($out,$err) = Lorenz::Job->submitJob($host,$submitType,\%jobParams);

	if (not $err) {
		return $self->prepit ($out,$err,0);
	} else {
		# Some kind of error return
		return $self->preperr ("submitJob ($host) => $err");
	}
		
}

#======================================================================
#  /queue/<host>/<jobid> [DELETE] -- cancel given job
#======================================================================

sub cancelJob {
	my ($self,$args) = @_;

	my $host = $args->{host}   || return $self->preperr("'host' not defined");
	my $jobid = $args->{jobid} || return $self->preperr("'jobid' not defined");
	return ($self->preperr("Invalid 'jobid' on host $host")) unless $jobid =~ /^[\d\.]+$/;

	my ($out,$err,$status) = Lorenz::Job->cancelJob($host,$jobid);

	if (not $err) {
		return $self->prepit($out, $err, $status);
	} else {
		return $self->preperr("cancelJob ($host) => $err");
	}
}

#======================================================================
#  /queue/<host>/<jobid> [PUT] -- operate on a job in some way
#======================================================================
sub operateOnJob {
	my ($self,$args) = @_;

	my $host = $args->{host};
	my $jobid = $args->{jobid};

	my %atts = ();
	my @d = <STDIN>;
	my $data = join '\n', @d;

	# PUT data is read from stdin; should be in the form of att=val&att=val\n
	# Assume this is one line.
	chomp $data;
	if ($data) {
		my @attlist = split /&/, $data;
		foreach (@attlist) {
			my ($type, $value) = split /=/, $_;
			$atts{$type} = $value if ($type and $value);
		}
	}

	my $operator = $atts{operator} || return ($self->preperr("'operator' not defined"));
	
	if ($operator eq "signal") {
		my $signal = $atts{signal} || return ($self->preperr("'signal' not defined"));
		$self->signalJob ($host, $jobid, $signal);
	} elsif ($operator eq "hold") {
		$self->holdJob ($host, $jobid);
	} elsif ($operator eq "unhold") {
		$self->unholdJob ($host, $jobid);
	} elsif ($operator eq "modify") {
		delete $atts{operator};
		$self->modifyJob ($host, $jobid, %atts);
	}
}



#======================================================================
#  /queue/<host>/<jobid> [PUT] {operator=signal}-- signal a given job
#======================================================================

sub signalJob {
	my ($self,$host,$jobid,$signal) = @_;

	return $self->preperr("Invalid 'jobid'") unless $jobid =~ /^[\d\.]+$/;

	my ($out,$err,$status) = Lorenz::Job->signalJob($host,$jobid,$signal);

	if (not $err) {
		return $self->prepit($out, $err, $status);
	} else {
		return $self->preperr("signalJob ($host) => $err");
	}
}

#======================================================================
#  /queue/<host>/<jobid> [PUT] {operator=hold}-- hold a pending job
#======================================================================

sub holdJob {
	my ($self,$host,$jobid) = @_;

	return $self->preperr("Invalid 'jobid'") unless $jobid =~ /^[\d\.]+$/;

	my ($out,$err,$status) = Lorenz::Job->holdJob($host,$jobid);

	if (not $err) {
		return $self->prepit($out, $err, $status);
	} else {
		return $self->preperr("holdJob ($host) => $err");
	}
}

#======================================================================
#  /queue/<host>/<jobid> [PUT] {operator=unhold}-- resume a held job
#======================================================================

sub unholdJob {
	my ($self,$host,$jobid) = @_;

	return $self->preperr("Invalid 'jobid'") unless $jobid =~ /^[\d\.]+$/;

	my ($out,$err,$status) = Lorenz::Job->unholdJob($host,$jobid);

	if (not $err) {
		return $self->prepit($out, $err, $status);
	} else {
		return $self->preperr("unholdJob ($host) => $err");
	}
}

#======================================================================
#  /queue/<host>/<jobid> [PUT] {operator=modify} -- modify a pending job
#======================================================================

sub modifyJob {
	my ($self,$host,$jobid,%atts) = @_;

	return $self->preperr("Invalid 'jobid'") unless $jobid =~ /^[\d\.]+$/;

	my ($out,$err,$status) = Lorenz::Job->modifyJob($host,$jobid,%atts);

	if (not $err) {
		return $self->prepit($out, $err, $status);
	} else {
		return $self->preperr("modifyJob ($host) => $err");
	}
}

1;


