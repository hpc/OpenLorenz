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

package Lorenz::Simple;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Simple.pm
#-------------------------------------------------------------------------------
#  Purpose:		Provide simple high-level Perl API to Lorenz server functions.
#  Author:		Jeff Long, 2/18/2013
#  Notes:
#               
#				This module is auto-generated by running the generateSimplePm.pl
#				script. Do not edit this file directly.
#
#===============================================================================

use strict;
use Class::Delegator;

use Lorenz::Base;
use Lorenz::Bank;
use Lorenz::Cluster;
use Lorenz::Host;
use Lorenz::System;
use Lorenz::User;
use Lorenz::Util;
use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my $className = "Simple";

use Class::Delegator
     send => [qw(getAllBanks
                 getBankCpuUsage
                 getBankInfo
                 getBankMembers
                 getUserAccountBankInfo
                 getUserBankDetails
                 getUserBankObjs
                 getUserBanks
              )],
     to => '{bank}',

     send => [qw(getAllClusterDetails
                 getAllClusters
                 getClusterBackfill
                 getClusterBatchDetails
                 getClusterBatchStatus
                 getClusterDetails
                 getClusterInfo
                 getClusterJobLimits
                 getLoginNodeStatus
                 getMachStatus
                 getUserClusters
                 getUserProcessesByCluster
                 showClusterBatchStatusDELETE_ME_MAYBE
              )],
     to => '{cluster}',

     send => [qw(clustername
                 getAllHosts
                 getAvailableLoginNodes
                 getDeadHosts
                 getHostSpecs
                 getHostStatus
                 getLoginNodes
                 isStorageHost
                 pickLoginNode
              )],
     to => '{host}',

     send => [qw(getDirectoryList
                 killProcesses
                 runApprovedCommand
                 runCommand
                 runCommand2
                 runCommandWithOpts
                 runLorenzCommand
                 safeRun
              )],
     to => '{system}',

     send => [qw(clearUserLorenzTmpDir
                 debugLog
                 getAllGroups
                 getAllUserInfo
                 getGroupInfo
                 getGroupMembers
                 getOun
                 getOunFromUsername
                 getUserContacteesByOun
                 getUserDefaultHost
                 getUserEmail
                 getUserEnclaveStatus
                 getUserFileTransferHostsInfo
                 getUserGroups
                 getUserHomeDir
                 getUserHomeDirOnHost
                 getUserHosts
                 getUserInfo
                 getUserJumpdirs
                 getUserLorenzDir
                 getUserLorenzTmpDir
                 getUserSshHosts
                 getUsername
                 getUsernameFromOun
                 listAllUsers
                 lookUpCoord
              )],
     to => '{user}',

     send => [qw(callersId
                 expandAbbrevs
                 fileModifiedWithin
                 getCanonicalPath
                 getChildren
                 getLastModTime
                 getWeather
                 isApprovedHost
                 isApprovedPath
                 isValidFileName
                 lorenz_from_json
                 moveFiles
                 sendEmail
                 sendEmail_WithMail
                 sendEmail_WithSMTP
                 sendEmail_WithSendmail
                 timeoutExec
                 toText
                 wraperr
                 wrapit
                 wrapjson
                 wrapout
              )],
     to => '{util}'
;

sub new {
	my $proto = shift;
	my $class = ref($proto) || $proto;
	my $self  = {};

	$className = $class;

	my $args = shift;
	if ($args) {
		foreach (keys %$args) {
			$self->{$_} = $args->{$_};
		}
	}
	# Sub-objects to which methods should be delegated.
	$self->{bank}        = Lorenz::Bank->new();
	$self->{cluster}     = Lorenz::Cluster->new();
	$self->{host}        = Lorenz::Host->new();
	$self->{system}      = Lorenz::System->new();
	$self->{user}        = Lorenz::User->new();
	$self->{util}        = Lorenz::Util->new();

	bless ($self, $class);
	return $self;
}

1;

