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

package Lorenz::REST::CpuUsage;

###########################################################################
# $URL: https://sourceforge.llnl.gov/svn/repos/lorenz/trunk/server/lib/perl/Lorenz/REST/CpuUsage.pm $
# $Author: long6 $
# $Date: 2011-02-07 12:01:00 -0800 (Mon, 07 Feb 2011) $
# $Rev: 102 $
###########################################################################



#===============================================================================
#									CpuUsage.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling CpuUsage-related Lorenz REST calls.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#		02/07/2011 - jwl: Initial version
#===============================================================================

use strict;
use Lorenz::CpuUsage;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");

my %conf = Lorenz::Config::getLorenzConfig();

# Cache user's cluster list
my @myClusters = Lorenz::Cluster->getUserClusters(Lorenz::User->getUsername());

#======================================================================
#  /status/clusters/utilization/hourly2 -- Show cluster utilization (all clusters)
#======================================================================
sub getAllClusterHourlyUtilization2 {
	my ($self,$args) = @_;

	# Get cpu util for all clusters (hourly)
	my $content = Lorenz::CpuUsage->getClusterUtilization2("hourly");

	return $self->prepjson($content, "", 0);
}

#======================================================================
#  /status/clusters/utilization/daily2 -- Show cluster utilization (all clusters)
#======================================================================
sub getAllClusterDailyUtilization2 {
	my ($self,$args) = @_;

	# Get cpu util for all clusters (daily)
	my $content = Lorenz::CpuUsage->getClusterUtilization2("daily");

	return $self->prepjson($content, "", 0);
}

#======================================================================
#  /user/[user]/cpuutil/daily -- Show cpu usage for given user, broken up by day
#======================================================================
sub getUsersDailyCpuUsage {
	my ($self,$args) = @_;
	my $user = $args->{user} ||	return $self->preperr("'user' not defined");

	my $usage=<<'EOF';
{
   "error" : "",
   "output" : [
      {
         "bank_history" : [],
         "history" : {
            "2013-02-25" : 0,
            "2013-02-26" : 0,
            "2013-02-27" : 0,
            "2013-02-28" : 0,
            "2013-03-01" : 0,
            "2013-03-02" : 0,
            "2013-03-03" : "0.0",
            "2013-03-04" : "0.0",
            "2013-03-05" : 0,
            "2013-03-06" : 0,
            "2013-03-07" : 0,
            "2013-03-08" : 0,
            "2013-03-09" : 0,
            "2013-03-10" : 0
         },
         "host" : "hosta",
         "last_update" : "2013-03-10 11:02:08",
         "last_update_ms" : 1362938528000,
         "user" : "usera"
      },
      {
         "bank_history" : [
            {
               "bank" : "bank1",
               "history" : {
                  "2013-02-25" : 0,
                  "2013-02-26" : 0,
                  "2013-02-27" : 0,
                  "2013-02-28" : 0,
                  "2013-03-01" : 0,
                  "2013-03-02" : 0,
                  "2013-03-03" : 5,
                  "2013-03-04" : 16,
                  "2013-03-05" : 0,
                  "2013-03-06" : 0,
                  "2013-03-07" : 0,
                  "2013-03-08" : 0,
                  "2013-03-09" : 0,
                  "2013-03-10" : 0
               },
               "host" : "hostb",
               "user" : "usera"
            }
         ],
         "history" : {
            "2013-02-25" : 0,
            "2013-02-26" : 0,
            "2013-02-27" : 0,
            "2013-02-28" : 0,
            "2013-03-01" : 0,
            "2013-03-02" : 0,
            "2013-03-03" : "5.1",
            "2013-03-04" : "16.2",
            "2013-03-05" : 0,
            "2013-03-06" : 0,
            "2013-03-07" : 0,
            "2013-03-08" : 0,
            "2013-03-09" : 0,
            "2013-03-10" : 0
         },
         "host" : "hostb",
         "last_update" : "2013-03-10 11:02:08",
         "last_update_ms" : 1362938528000,
         "user" : "user1"
      }
   ],
   "status" : "OK"
}
EOF
	return $usage;
}

#======================================================================
#  /status/clusters/utilization/daily -- Show cluster utilization (all clusters)
#======================================================================
sub getAllClusterDailyUtilization {
	my ($self,$args) = @_;

	my $timeformat=(exists $args->{time}) ? $args->{time} : "local";
	my $ndays = $args->{ndays} || 14;

	# Get cpu util for all clusters (daily)
	my ($o,$e) = Lorenz::CpuUsage->getClusterUtilization("daily", $conf{dailyClusterUtilizationDir},
														 $timeformat, $ndays,
														 Lorenz::Cluster->getAllClusters());
	if (not $e) {
		return $self->prepout($o);
	} else {
		return $self->preperr($e);
	}
}

#======================================================================
#  /status/clusters/utilization/hourly -- Show cluster utilization (all clusters)
#======================================================================
sub getAllClusterHourlyUtilization {
	my ($self,$args) = @_;

	my $timeformat=(exists $args->{time}) ? $args->{time} : "local";
	my $ndays = $args->{ndays} || 14;

	# Get cpu util for all clusters (hourly)
	my ($o,$e) = Lorenz::CpuUsage->getClusterUtilization("hourly", $conf{hourlyClusterUtilizationDir},
														 $timeformat, $ndays,
														 Lorenz::Cluster->getAllClusters());
	if (not $e) {
		return $self->prepout($o);
	} else {
		return $self->preperr($e);
	}
}

#======================================================================
#  /status/clusters/ME/cpuutil/daily -- Show cluster utilization (my clusters)
#======================================================================
sub getMyClusterDailyUtilization {
	my ($self,$args) = @_;

	my $timeformat=(exists $args->{time}) ? $args->{time} : "local";
	my $ndays = $args->{ndays} || 14;

	# Get cpu util for all clusters (daily)
	my ($o,$e) =  Lorenz::CpuUsage->getClusterUtilization("daily", $conf{dailyClusterUtilizationDir},
														  $timeformat, $ndays,
														  @myClusters);
	if (not $e) {
		return $self->prepout($o);
	} else {
		return $self->preperr($e);
	}
}

#======================================================================
#  /status/clusters/ME/cpuutil/hourly -- Show cluster utilization (my clusters only)
#======================================================================
sub getMyClusterHourlyUtilization {
	my ($self,$args) = @_;

	my $timeformat=(exists $args->{time}) ? $args->{time} : "local";
	my $ndays = $args->{ndays} || 14;

	# Get cpu util for all clusters (hourly)
	my ($o,$e) =  Lorenz::CpuUsage->getClusterUtilization("hourly", $conf{hourlyClusterUtilizationDir},
														  $timeformat, $ndays, @myClusters);
	if (not $e) {
		return $self->prepout($o);
	} else {
		return $self->preperr($e);
	}
}


#======================================================================
# /status/cluster/<cluster>/cpuutil/daily -- Show cluster utilization (one cluster)
#======================================================================

sub getClusterDailyUtilization {
	my ($self,$args) = @_;

	my $cluster = $args->{cluster} || return $self->preperr("'cluster' not defined");

	my $timeformat=(exists $args->{time}) ? $args->{time} : "local";
	my $ndays = $args->{ndays} || 14;

	# Get cpu utilization for one cluster (daily)
	my ($o,$e) =  Lorenz::CpuUsage->getClusterUtilization("daily", $conf{dailyClusterUtilizationDir},
														  $timeformat, $ndays,
														  $cluster);
	if (not $e) {
		return $self->prepout($o);
	} else {
		return $self->preperr($e);
	}
}

#======================================================================
# /status/cluster/<cluster>/cpuutil/hourly -- Show cluster utilization (one cluster)
#======================================================================

sub getClusterHourlyUtilization {
	my ($self,$args) = @_;

	my $cluster = $args->{cluster} || return $self->preperr("'cluster' not defined");

	my $timeformat=(exists $args->{time}) ? $args->{time} : "local";
	my $ndays = $args->{ndays} || 14;

	# Get cpu utilization for one cluster (hourly)
	my ($o,$e) =  Lorenz::CpuUsage->getClusterUtilization("hourly", $conf{hourlyClusterUtilizationDir},
														  $timeformat, $ndays,
														  $cluster);
	if (not $e) {
		return $self->prepout($o);
	} else {
		return $self->preperr($e);
	}
}


# Not used?
sub _parseDate {
	my $date = shift;

	my @d=(); # sec,min,hr,day,mon,yr
	
	if ($date =~ /T/) {
		$date =~ m/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;
		@d=($6,$5,$4,$3,$2,$1);
	} else {
		$date =~ m/^(\d{4})-(\d{2})-(\d{2})/;
		@d=(0,0,0,$3,$2,$1);
	}
	return @d;
}





1;
