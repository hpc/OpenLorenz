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

package Lorenz::Cluster;

#===============================================================================
#					Cluster.pm
#-------------------------------------------------------------------------------
#  Purpose:	Cluster-centric methods (native)
#  Author:	Jeff Long
#  Notes:
#===============================================================================

use strict;
use vars qw(@ISA);
use Date::Format;
use Date::Parse;
use Lorenz::Base;
use Lorenz::Cache;
use Lorenz::Host;
use Lorenz::User;
use Lorenz::System;
use Lorenz::Util;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();

# Establish connection to Lorenz data
my $ldata = Lorenz::LData->new();

#--------------------------------------------------

sub getUserClusters {
	my ($self,$user) = @_;
	my $out;

	return ("hosta");
}

#
# @h = getAllClusters() -- List of hosts which have batch queues  #jwl Was getClusterList
#
sub getAllClusters {
	my $self = shift;

	return qw / hosta hostb /;
}

sub getClusterInfo {
	my ($self,$cluster) = @_;

	my $content = $self->getClusterDetails($cluster);
	my $obj = JSON::from_json($content);

	return %$obj;
}

sub getClusterBatchStatus {
	my ($self,@clusters) = @_;
	
	# Status of given clusters...
	my @allobjs=();
	
	# Process nodeinfo for each host
	foreach my $host (@clusters) {

		my %parts = ();
		my $cluster	  = $host;
		my $partition = "pdebug";
		my $default = 1;
		my @nodecnt = 20;
			
		$parts{$partition} =  {
			'host'		 => $cluster,
			'partition'	 => $partition,
			'default'	 => $default,
			'allocated'	 => 17,
			'idle'		 => 2,
			'other'		 => 1,
			'total'		 => 20
		};
		my $accessible = 1;
		
		my $obj = {
			'host' => $host,
			'partitions' => \%parts,
			'accessible' => $accessible,
			'last_update' => "2013-03-08 17:04:02",
			'last_update_ms' => 1362791042000
		};
		push @allobjs, $obj;
	}
	return \@allobjs;
}

sub getClusterBatchDetails {
	my ($self,@clusters) = @_;
	
	# Batch details for given clusters
	my @parts;

	my $banks = { bank1 => { bank => "bank1", default => 1, qos => ["normal", "standby"] }};
	$parts[0] = { pbatch => { cpuspernode => 12, default => 1, defaulttime => "NONE", gres => ["ignore"], host => $clusters[0],
							  maxnodes => 1, maxtme => "8-08:00:00", minnodes => 1, partition => "pbatch", runsmoab => 1,
							  schedmode => "processor", totalcpus => 984, totalnodes => 82 } };

	my $obj = { banks => $banks,
				homedir => "/home/usera",
				host => $clusters[0],
				partitions => @parts };

	return $obj;
}


sub getClusterDetails {
	my ($self,$cluster) = @_;

	my $content=<<EOF;
{
   "cpuspeed" : "2.2 GHz",
   "cpuspernode" : "16",
   "cputype" : "AMD Opteron",
   "mounts.gpfs" : null,
   "mounts.lustre" : "/scratch",
   "mounts.nfs" : "/nfs/scratch", "/home",
   "mounts.scratch" : "/nfs/scratch,/scratch",
   "name" : "$cluster",
   "os" : "CHAOS",
   "os.version" : "MY_OS 2.0",
   "purpose" : "$cluster is a cluster.",
   "rampernode" : "32 GB",
   "totalnodes" : "144"
}
EOF
	return $content;
}

sub getClusterJobLimits {
	my ($self,$cluster) = @_;

	return "here is the job limit info for $cluster";
}


#======================================================================
#  $hashref = getAllClusterDetails()  -- return node/mem details about all clusters
#======================================================================
sub getAllClusterDetails {
	my $self = shift;

	my @clusters = $self->getAllClusters();
	my %info=();

	foreach my $cluster (@clusters) {
		my $content = getClusterDetails($cluster);
		# Output already in json format...
		my ($out, $status) = Lorenz::Util->lorenz_from_json($content);

		$info{$cluster} = $out;
	}
	return \%info;
}

# $href = getLoginNodeStatus();
sub getLoginNodeStatus {
	my ($self) = shift;
	my ($out,$status);

	my $status=<<'EOF';
{
   "error" : "",
   "output" : {
	   "hosta" : {
         "accessible" : 0,
         "last_update" : "2013-03-09 21:10:01",
         "last_update_ms" : 1362892201000,
         "login_node_data" : {
			 "hosta1" : {
               "cpu_info" : "Cpu(s):  5.8%us, 13.5%sy,  0.0%ni, 78.0%id,  0.3%wa,  0.0%hi,  2.4%si,  0.0%st",
               "host" : "hosta1",
               "last_update" : "2013-03-09 21:10:01",
               "last_update_ms" : 1362892201000,
               "load_state" : "moderate",
               "loadavg1" : "6.10",
               "loadavg15" : "6.16",
               "loadavg5" : "6.04",
               "mem_info" : "Mem:    23.457G total, 7016.930M used,   16.605G free,   20.605M buffers",
               "ncpus" : "12",
               "normalized_load" : 50,
               "nusers" : "40",
               "state" : "up",
               "swap_info" : "Swap: 3814.480M total,   69.559M used, 3744.922M free, 2305.504M cached",
               "task_info" : "Tasks: 607 total,   7 running, 598 sleeping,   2 stopped,   0 zombie",
               "uptime" : "61 days, 20:53"
			 },
			 "hosta2" : {
               "cpu_info" : "Cpu(s):  5.5%us, 20.4%sy,  0.0%ni, 70.1%id,  0.3%wa,  0.0%hi,  3.7%si,  0.0%st",
               "host" : "hosta2",
               "last_update" : "2013-03-09 21:10:02",
               "last_update_ms" : 1362892202000,
               "load_state" : "moderate",
               "loadavg1" : "10.28",
               "loadavg15" : "10.03",
               "loadavg5" : "10.09",
               "mem_info" : "Mem:    23.457G total, 3954.973M used,   19.595G free,   17.453M buffers",
               "ncpus" : "12",
               "normalized_load" : 84,
               "nusers" : "17",
               "state" : "up",
               "swap_info" : "Swap: 3814.480M total,  100.016M used, 3714.465M free,  679.078M cached",
               "task_info" : "Tasks: 620 total,  11 running, 606 sleeping,   0 stopped,   3 zombie",
               "uptime" : "68 days, 10:57"
			   }
         },
         "num_heavy" : 0,
         "num_moderate" : 2,
         "total_nodes" : 2,
         "total_nodes_down" : 0,
         "total_nodes_up" : 2,
         "total_users" : 57
	   },
	   "hostb" : {
         "accessible" : 0,
         "last_update" : "2013-03-09 21:10:01",
         "last_update_ms" : 1362892201000,
         "login_node_data" : {
			 "hostb1" : {
               "cpu_info" : "Cpu(s):  5.8%us, 13.5%sy,  0.0%ni, 78.0%id,  0.3%wa,  0.0%hi,  2.4%si,  0.0%st",
               "host" : "hostb1",
               "last_update" : "2013-03-09 21:10:01",
               "last_update_ms" : 1362892201000,
               "load_state" : "moderate",
               "loadavg1" : "6.10",
               "loadavg15" : "6.16",
               "loadavg5" : "6.04",
               "mem_info" : "Mem:    23.457G total, 7016.930M used,   16.605G free,   20.605M buffers",
               "ncpus" : "12",
               "normalized_load" : 50,
               "nusers" : "80",
               "state" : "up",
               "swap_info" : "Swap: 3814.480M total,   69.559M used, 3744.922M free, 2305.504M cached",
               "task_info" : "Tasks: 607 total,   7 running, 598 sleeping,   2 stopped,   0 zombie",
               "uptime" : "61 days, 20:53"
			 },
			 "hostb2" : {
               "cpu_info" : "Cpu(s):  5.5%us, 20.4%sy,  0.0%ni, 70.1%id,  0.3%wa,  0.0%hi,  3.7%si,  0.0%st",
               "host" : "hostb2",
               "last_update" : "2013-03-09 21:10:02",
               "last_update_ms" : 1362892202000,
               "load_state" : "moderate",
               "loadavg1" : "10.28",
               "loadavg15" : "10.03",
               "loadavg5" : "10.09",
               "mem_info" : "Mem:    23.457G total, 3954.973M used,   19.595G free,   17.453M buffers",
               "ncpus" : "12",
               "normalized_load" : 84,
               "nusers" : "18",
               "state" : "up",
               "swap_info" : "Swap: 3814.480M total,  100.016M used, 3714.465M free,  679.078M cached",
               "task_info" : "Tasks: 620 total,  11 running, 606 sleeping,   0 stopped,   3 zombie",
               "uptime" : "68 days, 10:57"
			   }
         },
         "num_heavy" : 0,
         "num_moderate" : 2,
         "total_nodes" : 2,
         "total_nodes_down" : 0,
         "total_nodes_up" : 2,
         "total_users" : 57
	   }
   },
   "status" : "OK"
}
EOF
			 
	my ($out, $retstatus) = Lorenz::Util->lorenz_from_json($status);

    $out = $out->{output};

	my @myClusters = Lorenz::Cluster->getUserClusters (Lorenz::User->getUsername());
	
	if ($retstatus == 0){
		foreach my $host (keys %$out){
			my $accessible = (grep(/$host/, @myClusters)) ? 1 : 0;
			
			$out->{$host}->{accessible} = $accessible;
		}
	} else {
		$out->{error} = $out;
	}
	return $out;
}

# $href = getMachStatus() -- Return status of all machines
sub getMachStatus {
	my $self = shift;
	my %machines;
	
	foreach my $machine ($self->getAllClusters()) {
		
		my %host = (
			'lastUpdated' => 1362790802000,
			'users' => 10,
			'accessible' => 1,
			'status' => "up"
		);
		
		$machines{$machine} = \%host;
	}
	return \%machines;
}

# $href = getUserProcessesByCluster($user,$cluster);
sub getUserProcessesByCluster {
	my ($self,$user,$cluster) = @_;

	my @processes=();
	my @nodeErrs=();
	
	my %out = ( processes => \@processes, errors => \@nodeErrs );

	return \%out;
}


1;


