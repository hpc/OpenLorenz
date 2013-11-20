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

package Lorenz::REST::Cluster;

###########################################################################
# $URL: https://sourceforge.llnl.gov/svn/repos/lorenz/trunk/server/lib/perl/Lorenz/REST/Cluster.pm $
# $Author: long6 $
# $Date: 2011-02-04 13:05:41 -0800 (Fri, 04 Feb 2011) $
# $Rev: 93 $
###########################################################################


#===============================================================================
#					Cluster.pm
#-------------------------------------------------------------------------------
#  Purpose:	Class for handling cluster-related Lorenz REST calls.
#  Author:	Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#	01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use Lorenz::Config;
use Lorenz::Cluster;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();

# Cache user's cluster list
my @myClusters=Lorenz::Cluster->getUserClusters(Lorenz::User->getUsername());

#--------------------------------------------------

#======================================================================
#  /cluster/	 -- get list of all clusters
#  /clusters/
#======================================================================
sub getAllClusters {
	my ($self,$args) = @_;

	my @h = Lorenz::Cluster->getAllClusters();

	return $self->prepout( { 'accounts' => \@h } );
}

#======================================================================
#  /user/:user/clusters	 -- get list of user's clusters
#======================================================================
sub getUserClusters {
	my ($self,$args) = @_;

	my @h = Lorenz::Cluster->getUserClusters($args->{user});

	return $self->prepout( { 'accounts' => \@h } );
}

#======================================================================
#  /status/clusters	 -- show slurm status of all clusters
#======================================================================

sub getAllClusterBatchStatus {
	my ($self,$args) = @_;

	my $obj = Lorenz::Cluster->getClusterBatchStatus(Lorenz::Cluster->getAllClusters());

	return $self->prepout($obj);
}

#======================================================================
#  /status/clusters/user/[user]	 -- show slurm status of all clusters
#======================================================================
sub getUserClusterBatchStatus {
	my ($self,$args) = @_;
	my $user = $args->{user} || return $self->preperr("user not defined");

	my $obj = Lorenz::Cluster->getClusterBatchStatus(Lorenz::Cluster->getUserClusters($user));

	return $self->prepout($obj);
}

#======================================================================
#  /status/cluster/[cluster]  -- show slurm status of given cluster
#======================================================================

sub getClusterBatchStatus {
	my ($self,$args) = @_;
	
	my $obj = Lorenz::Cluster->getClusterBatchStatus($args->{cluster});
	
	return $self->prepout($obj);
}

#======================================================================
#  /cluster/[cluster]/topo  -- show topology info for given cluster
#======================================================================
sub showClusterTopo {
	my ($self,$args) = @_;
	my $cluster = $args->{cluster} || return $self->preperr("'cluster' not defined");

	my $topoImage = "$conf{clusterTopoDir}/$cluster.png";
	my $obj = { 'host' => $cluster, 'url' => '' };

	if (-r $topoImage) {
		my $server = (defined $ENV{SERVER_NAME}) ? $ENV{SERVER_NAME} : "lc.llnl.gov";
		my $url = "https://${server}$main::lorenzRootUrl/lora/lora.cgi/file/localhost${topoImage}?view=read&format=image/png";
		$obj = {
			'host' => $cluster,
			'url'  => $url
			};
	}
	return $self->prepout($obj);
}

#======================================================================
#  /cluster/[cluster]/details  -- show node/mem details about one cluster
#======================================================================
sub getClusterDetails {
	my ($self,$args) = @_;
	my $cluster = $args->{cluster} || return $self->preperr("'cluster' not defined");

	my $content = Lorenz::Cluster->getClusterDetails($cluster);

	if (not $content) {
		$content = "{ \"error\" : \"No info is available about the host: $cluster\"}";
	}

	# Output already in json format...
	return $self->prepjson($content, "", Lorenz::Util::STATUS_OK);
}

#======================================================================
#  /clusters/details  -- show node/mem details about all clusters
#======================================================================
sub showAllClusterDetails {
	my ($self,$args) = @_;

	my $info = Lorenz::Cluster->getAllClusterDetails();
	return $self->prepout($info);
}


#======================================================================
#  /cluster/[cluster]/joblimits  -- show joblimits info about one cluster
#======================================================================
sub getClusterJobLimits {
	my ($self,$args) = @_;
	my $cluster = $args->{cluster} || return $self->preperr("'cluster' not defined");

	my $content = Lorenz::Cluster->getClusterJobLimits($cluster);

	if ($content) {
		my $obj = { 'host' => $cluster,
					'joblimits' => "<pre>\n$content\n</pre>"};
		return $self->prepout($obj);
	} else {
		return $self->prepout("No job limits found for: $cluster");
	}
}


#======================================================================
#  /user/[user]/cluster/[cluster]/batchdetails -- show job submission details about given cluster
#======================================================================
sub getClusterBatchDetails {
	my ($self,$args) = @_;
	my $user    = $args->{user}    || return $self->preperr("'user' not defined");
	my $cluster = $args->{cluster} || return $self->preperr("'cluster' not defined");

	my $obj = Lorenz::Cluster->getClusterBatchDetails($user,$cluster);
	return $self->prepout ($obj);
}

#======================================================================
#  /status/machines -- show machine status for all clusters
#======================================================================
sub getMachStatus {
	my ($self,$args) = @_;

	my $obj = Lorenz::Cluster->getMachStatus();

	if ($obj) {
		return $self->prepout($obj);
	} else {
		return $self->preperr("Could not get loginNodeStatus");
	}
}

#======================================================================
#  /clusters/backfill -- get backfill info for all clusters
#======================================================================
sub getClusterBackfill{
	my ($self,$args) = @_;

	my ($obj,$err) = Lorenz::Cluster->getClusterBackfill();
	
	if ($err) {
		return $self->preperr($err);
	} else {
		return $self->prepout($obj);
	}
}

#======================================================================
#  /status/loginNode -- get login node status for all clusters
#======================================================================
sub getLoginNodeStatus{
	my ($self,$args) = @_;

	my $out = Lorenz::Cluster->getLoginNodeStatus();
	if (not $out->{error}) {
		return $self->prepout($out);
	} else {
		return $self->preperr($out->{error});
	}
}

#======================================================================
#  /user/:user/cluster/:cluster/processes -- get user processes on one cluster
#======================================================================
sub getUserProcessesByCluster {
	my ($self,$args) = @_;
	my $cluster = $args->{cluster};
	my $user = $args->{user};
	
	my $obj = Lorenz::Cluster->getUserProcessesByCluster($user,$cluster);
	return $self->prepout($obj);
}

#======================================================================
#  /user/:user/cluster/processes -- get user processes on all clusters
#======================================================================
sub getAllUserProcesses {
	my ($self,$args) = @_;
	my $user = $args->{user};
	
	my @sshHosts = Lorenz::User->getUserSshHosts($user);
	my $out;
	
	foreach my $host (@sshHosts) {
		$out->{$host} = $self->getUserProcessesByCluster({cluster => $host, user => $user})->{output};
	}
	
	return $self->prepout($out);
}

#======================================================================
#  /cluster/processes -- kill given processes
#======================================================================
# Returns an array of objects containing pids and corresponding exit codes (status) / errors returned from kill command
sub killProcesses {
	my ($self,$args) = @_;
	my $clusters = $args->{'clusters[]'};
	my $processes = $args->{'processes[]'};
	my @clusters = split(',', $clusters);
	my @processes = split(',', $processes);

	my $obj = Lorenz::System->killProcesses(\@clusters,\@processes);
	
	return $self->prepout($obj);
}

1;

