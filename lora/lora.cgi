#!/usr/bin/env perl
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



#================================================================================
#  lora.cgi -- LOrenz Rest Api: map RESTful URI specs to specific Perl modules and methods
#-------------------------------------------------------------------------------
#  Author:      Jeff Long, 1/20/2011
#  Notes:
#     Large portions of this code were lifted from or influenced by the module
#     CGI::Application::Dispatch.pm, by Michael Peters and Mark Stosberg 2008.
#
#  Modification History:
#       01/20/2011 - jwl: Initial version
#  
#
#================================================================================

BEGIN {
	require '/usr/global/tools/lorenz/lib/lorenz.pl';
}

use strict;
use CGI;
use RESTRouter;
use Lorenz::Util;
require Data::Dumper;

my $query = CGI->new; 
my $debug = 0;
my $rtr = RESTRouter->new();

my @routes = (
   { 'path' => "/jefftest",                                       'via' => "get",    'action' => sub { my $msg="got here!"; return ($msg); } },
   { 'path' => "/jefftest/*",                                     'via' => "get",    'action' => sub { mydie("Invalid URL specified"); } },
   { 'path' => "/bank/?",                                         'via' => "get",    'action' => "Lorenz::REST::Bank->getAllBanks" }, 
   { 'path' => "/bank/:bank",                                     'via' => "get",    'action' => "Lorenz::REST::Bank->getBankInfo" }, 
   { 'path' => "/bank/:bank/cpuutil",                             'via' => "get",    'action' => "Lorenz::REST::Bank->getBankCpuUsage" }, 
   { 'path' => "/bank/:bank/cpuutil/daily",                       'via' => "get",    'action' => "Lorenz::REST::Bank->getBankCpuUsage" }, 
   { 'path' => "/bank/:bank/membership/:cluster",                 'via' => "get",    'action' => "Lorenz::REST::Bank->getBankMembers" }, 
   { 'path' => "/banks/?",                                        'via' => "get",    'action' => "Lorenz::REST::Bank->getAllBanks" }, 
   { 'path' => "/banks/cpuutil",                                  'via' => "get",    'action' => "Lorenz::REST::Bank->getAllBanksCpuUsage" }, 
   { 'path' => "/cluster/?",                                      'via' => "get",    'action' => "Lorenz::REST::Cluster->getAllClusters" }, 
   { 'path' => "/cluster/:cluster/bank/:bank/cpuutil/daily",      'via' => "get",    'action' => "Lorenz::REST::Bank->getBankCpuUsage" }, 
   { 'path' => "/cluster/:cluster/details",                       'via' => "get",    'action' => "Lorenz::REST::Cluster->getClusterDetails" }, 
   { 'path' => "/cluster/:cluster/joblimits",                     'via' => "get",    'action' => "Lorenz::REST::Cluster->getClusterJobLimits" }, 
   { 'path' => "/cluster/:cluster/topo",                          'via' => "get",    'action' => "Lorenz::REST::Cluster->showClusterTopo" }, 
   { 'path' => "/cluster/processes",                              'via' => "post",   'action' => "Lorenz::REST::Cluster->killProcesses" }, 
   { 'path' => "/clusters/?",                                     'via' => "get",    'action' => "Lorenz::REST::Cluster->getAllClusters" }, 
   { 'path' => "/clusters/backfill",                              'via' => "get",    'action' => "Lorenz::REST::Cluster->getClusterBackfill" }, 
   { 'path' => "/clusters/details",                               'via' => "get",    'action' => "Lorenz::REST::Cluster->showAllClusterDetails" }, 
   { 'path' => "/command/:host",                                  'via' => "post",   'action' => "Lorenz::REST::Command->runApprovedCommand" }, 
   { 'path' => "/data/:host",                                     'via' => "post",   'action' => "Lorenz::REST::Data->post" }, 
   { 'path' => "/email",                                          'via' => "post",   'action' => "Lorenz::REST::Support->send" }, 
   { 'path' => "/file/:host/:path",                               'via' => "get",    'action' => "Lorenz::REST::File->get" }, 
   { 'path' => "/file/:host/:path/*",                             'via' => "get",    'action' => "Lorenz::REST::File->get" }, 
   { 'path' => "/file/image/:host/:path",                         'via' => "get",    'action' => "Lorenz::REST::File->getImage" }, 
   { 'path' => "/file/image/:host/:path/*",                       'via' => "get",    'action' => "Lorenz::REST::File->getImage" }, 
   { 'path' => "/group/:group",                                   'via' => "get",    'action' => "Lorenz::REST::Group->getGroupInfo" }, 
   { 'path' => "/groups",                                         'via' => "get",    'action' => "Lorenz::REST::Group->getAllGroups" }, 
   { 'path' => "/host/?",                                         'via' => "get",    'action' => "Lorenz::REST::Host->getAllHosts" }, 
   { 'path' => "/host/:host",                                     'via' => "get",    'action' => "Lorenz::REST::Host->getHostInfo" }, 
   { 'path' => "/hosts/?",                                        'via' => "get",    'action' => "Lorenz::REST::Host->getAllHosts" }, 
   { 'path' => "/lora/endpoints",                                 'via' => "get",    'action' => "Lorenz::REST::Support->listEndpoints" }, 
   { 'path' => "/news/?",                                         'via' => "get",    'action' => "Lorenz::REST::News->getNewsList" }, 
   { 'path' => "/news/ALL",                                       'via' => "get",    'action' => "Lorenz::REST::News->getAllNews" }, 
   { 'path' => "/news/EXCERPT",                                   'via' => "get",    'action' => "Lorenz::REST::News->getNewsExcerpts" }, 
   { 'path' => "/news/:newsid",                                   'via' => "get",    'action' => "Lorenz::REST::News->getNews" }, 
   { 'path' => "/noop",                                           'via' => "get",    'action' => "Lorenz::REST::Support->noop" }, 
   { 'path' => "/parallelfs",                                     'via' => "get",    'action' => "Lorenz::REST::File->listParallelFilesys" }, 
   { 'path' => "/portlet/getAllPortletConf",                      'via' => "get",    'action' => "Lorenz::REST::Portlet->getAllPortletConf" }, 
   { 'path' => "/portlet/getCustomPortlets",                      'via' => "get",    'action' => "Lorenz::REST::Portlet->getCustomPortlets" }, 
   { 'path' => "/queue/",                                         'via' => "get",    'action' => "Lorenz::REST::Queue->get" }, 
   { 'path' => "/queue/:host",                                    'via' => "get",    'action' => "Lorenz::REST::Queue->get" }, 
   { 'path' => "/queue/:host",                                    'via' => "post",   'action' => "Lorenz::REST::Job->submitJob" }, 
   { 'path' => "/queue/:host/reservations",                       'via' => "get",    'action' => "Lorenz::REST::Queue->getReservations" }, 
   { 'path' => "/queue/:host/reservation/:res",                   'via' => "get",    'action' => "Lorenz::REST::Queue->getReservation" }, 
   { 'path' => "/queue/:host/:jobid/lorenzmd",                    'via' => "get",    'action' => "Lorenz::REST::Data->getLorenzMetaDataForId" }, 
   { 'path' => "/queue/:host/:jobid/steps",                       'via' => "get",    'action' => "Lorenz::REST::Queue->getJobSteps" }, 
   { 'path' => "/queue/:host/:jobid",                             'via' => "delete", 'action' => "Lorenz::REST::Job->cancelJob" }, 
   { 'path' => "/queue/:host/:jobid",                             'via' => "get",    'action' => "Lorenz::REST::Queue->getJobInfo" }, 
   { 'path' => "/queue/:host/:jobid",                             'via' => "put",    'action' => "Lorenz::REST::Job->operateOnJob" }, 
   { 'path' => "/scratchfs",                                      'via' => "get",    'action' => "Lorenz::REST::File->listScratchFilesys" }, 
   { 'path' => "/script/:host/:script",                           'via' => "post",   'action' => "Lorenz::REST::Command->runRegisteredScript" }, 
   { 'path' => "/sqlog/:host",                                    'via' => "post",   'action' => "Lorenz::REST::Sqlog->post" }, 
   { 'path' => "/status/cluster",                                 'via' => "get",    'action' => "Lorenz::REST::Cluster->getAllClusterBatchStatus" }, 
   { 'path' => "/status/cluster/:cluster",                        'via' => "get",    'action' => "Lorenz::REST::Cluster->getClusterBatchStatus" }, 
   { 'path' => "/status/cluster/:cluster/ib",                     'via' => "get",    'action' => "Lorenz::REST::IB->get" }, 
   { 'path' => "/status/cluster/:cluster/utilization/daily",      'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getClusterDailyUtilization" }, 
   { 'path' => "/status/cluster/:cluster/utilization/hourly",     'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getClusterHourlyUtilization" }, 
   { 'path' => "/status/clusters",                                'via' => "get",    'action' => "Lorenz::REST::Cluster->getAllClusterBatchStatus" }, 
   { 'path' => "/status/clusters/ME/utilization/daily",           'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getMyClusterDailyUtilization" }, 
   { 'path' => "/status/clusters/ME/utilization/hourly",          'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getMyClusterHourlyUtilization" }, 
   { 'path' => "/status/clusters/user/:user",                     'via' => "get",    'action' => "Lorenz::REST::Cluster->getUserClusterBatchStatus" }, 
   { 'path' => "/status/clusters/utilization/daily",              'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getAllClusterDailyUtilization" }, 
   { 'path' => "/status/clusters/utilization/daily2",             'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getAllClusterDailyUtilization2" }, 
   { 'path' => "/status/clusters/utilization/hourly",             'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getAllClusterHourlyUtilization" }, 
   { 'path' => "/status/clusters/utilization/hourly2",            'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getAllClusterHourlyUtilization2" }, 
   { 'path' => "/status/filesystem",                              'via' => "get",    'action' => "Lorenz::REST::DiskUsage->getFilesystemUsage" }, 
   { 'path' => "/status/filesystem/*",                            'via' => "get",    'action' => "Lorenz::REST::DiskUsage->getFilesystemUsage" }, 
   { 'path' => "/status/host/:host",                              'via' => "get",    'action' => "Lorenz::REST::Host->getHostStatus" }, 
   { 'path' => "/status/license",                                 'via' => "get",    'action' => "Lorenz::REST::License->listLicense" }, 
   { 'path' => "/status/license/:license",                        'via' => "get",    'action' => "Lorenz::REST::License->getLicense" }, 
   { 'path' => "/status/loginNode",                               'via' => "get",    'action' => "Lorenz::REST::Cluster->getLoginNodeStatus" }, 
   { 'path' => "/status/machines",                                'via' => "get",    'action' => "Lorenz::REST::Cluster->getMachStatus" }, 
   { 'path' => "/store",                                          'via' => "get",    'action' => "Lorenz::REST::Store->getStoreList" }, 
   { 'path' => "/store/:store",                                   'via' => "get",    'action' => "Lorenz::REST::Store->getStore" }, 
   { 'path' => "/store/:store/*",                                 'via' => "get",    'action' => "Lorenz::REST::Store->getStore" }, 
   { 'path' => "/store/:store",                                   'via' => "delete", 'action' => "Lorenz::REST::Store->deleteStore" }, 
   { 'path' => "/store/:store/*",                                 'via' => "delete", 'action' => "Lorenz::REST::Store->deleteStore" }, 
   { 'path' => "/store/:store",                                   'via' => "post",   'action' => "Lorenz::REST::Store->appendToStore" }, 
   { 'path' => "/store/:store/*",                                 'via' => "post",   'action' => "Lorenz::REST::Store->appendToStore" }, 
   { 'path' => "/store/:store",                                   'via' => "put",    'action' => "Lorenz::REST::Store->createStore" }, 
   { 'path' => "/store/:store/*",                                 'via' => "put",    'action' => "Lorenz::REST::Store->createStore" }, 
   { 'path' => "/support/defaultLinks",                           'via' => "get",    'action' => "Lorenz::REST::Support->defaultLinks" }, 
   { 'path' => "/support/getCredentialLifetime",                  'via' => "get",    'action' => "Lorenz::REST::Support->getCredentialLifetime" }, 
   { 'path' => "/support/lorenzAlert",                            'via' => "delete", 'action' => "Lorenz::REST::Support->deleteLorenzAlert" }, 
   { 'path' => "/support/lorenzAlert",                            'via' => "get",    'action' => "Lorenz::REST::Support->getLorenzAlert" }, 
   { 'path' => "/support/lorenzAlert",                            'via' => "put",    'action' => "Lorenz::REST::Support->createLorenzAlert" }, 
   { 'path' => "/support/mylcToggle",                             'via' => "delete", 'action' => "Lorenz::REST::Support->enableMyLC" }, 
   { 'path' => "/support/mylcToggle",                             'via' => "get",    'action' => "Lorenz::REST::Support->checkMyLCState" }, 
   { 'path' => "/support/mylcToggle",                             'via' => "put",    'action' => "Lorenz::REST::Support->disableMyLC" }, 
   { 'path' => "/support/network",                                'via' => "get",    'action' => "Lorenz::REST::Support->getNetworkInfo" }, 
   { 'path' => "/support/reportError",                            'via' => "post",   'action' => "Lorenz::REST::Support->reportError" }, 
   { 'path' => "/user/?",                                         'via' => "get",    'action' => "Lorenz::REST::User->get" }, 
   { 'path' => "/user/:user",                                     'via' => "get",    'action' => "Lorenz::REST::User->get" }, 
   { 'path' => "/user/:user/bank/:bank",                          'via' => "get",    'action' => "Lorenz::REST::Bank->getUserBankDetails" }, 
   { 'path' => "/user/:user/bankhosts",                           'via' => "get",    'action' => "Lorenz::REST::Bank->getUserAccountBankInfo" }, 
   { 'path' => "/user/:user/banks",                               'via' => "get",    'action' => "Lorenz::REST::Bank->getUserBanks" }, 
   { 'path' => "/user/:user/cluster/:cluster/batchdetails",       'via' => "get",    'action' => "Lorenz::REST::Cluster->getClusterBatchDetails" }, 
   { 'path' => "/user/:user/cluster/:cluster/processes",          'via' => "get",    'action' => "Lorenz::REST::Cluster->getUserProcessesByCluster" }, 
   { 'path' => "/user/:user/cluster/processes",                   'via' => "get",    'action' => "Lorenz::REST::Cluster->getAllUserProcesses" }, 
   { 'path' => "/user/:user/clusters",                            'via' => "get",    'action' => "Lorenz::REST::Cluster->getUserClusters" }, 
   { 'path' => "/user/:user/contactees",                          'via' => "get",    'action' => "Lorenz::REST::User->getUserContacteesByOun" }, 
   { 'path' => "/user/:user/cpuutil/daily",                       'via' => "get",    'action' => "Lorenz::REST::CpuUsage->getUsersDailyCpuUsage" }, 
   { 'path' => "/user/:user/default/host",                        'via' => "get",    'action' => "Lorenz::REST::User->getUserDefaultHost" }, 
   { 'path' => "/user/:user/enclavestatus",                       'via' => "get",    'action' => "Lorenz::REST::User->getEnclaveStatus" }, 
   { 'path' => "/user/:user/groups",                              'via' => "get",    'action' => "Lorenz::REST::Group->getUserGroups" }, 
   { 'path' => "/user/:user/hosts",                               'via' => "get",    'action' => "Lorenz::REST::Host->getUserHosts" }, 
   { 'path' => "/user/:user/news",                                'via' => "get",    'action' => "Lorenz::REST::News->getUserNews" }, 
   { 'path' => "/user/:user/oun",                                 'via' => "get",    'action' => "Lorenz::REST::User->getOun" }, 
   { 'path' => "/user/:user/purgedFiles",                         'via' => "get",    'action' => "Lorenz::REST::DiskUsage->getPurgedFileList" }, 
   { 'path' => "/user/:user/queue",                               'via' => "get",    'action' => "Lorenz::REST::Queue->getUsersQueue" }, 
   { 'path' => "/user/:user/quotas",                              'via' => "get",    'action' => "Lorenz::REST::DiskUsage->getUserQuotas" }, 
   { 'path' => "/user/:user/quotas/*",                            'via' => "get",    'action' => "Lorenz::REST::DiskUsage->getUserQuotas" }, 
   { 'path' => "/user/:user/sshhosts",                            'via' => "get",    'action' => "Lorenz::REST::Host->getUserSshHosts" }, 
   { 'path' => "/user/:user/transferhosts",                       'via' => "get",    'action' => "Lorenz::REST::Host->getUserFileTransferHosts" }, 
   { 'path' => "/user/ME/cache",                                  'via' => "delete", 'action' => "Lorenz::REST::Cache->delete" }, 
   { 'path' => "/user/ME/cache",                                  'via' => "get",    'action' => "Lorenz::REST::Cache->getList" }, 
   { 'path' => "/user/ME/cache/:cache",                           'via' => "delete", 'action' => "Lorenz::REST::Cache->delete" }, 
   { 'path' => "/user/ME/cache/:cache",                           'via' => "get",    'action' => "Lorenz::REST::Cache->get" }, 
   { 'path' => "/user/ME/news",                                   'via' => "get",    'action' => "Lorenz::REST::News->getUserNews" }, 
   { 'path' => "/user/ME/take",                                   'via' => "get",    'action' => "Lorenz::REST::GiveTake->getTakeStatus" }, 
   { 'path' => "/user/ME/take",                                   'via' => "post",   'action' => "Lorenz::REST::GiveTake->takeFiles" }, 
   { 'path' => "/users/?",                                        'via' => "get",    'action' => "Lorenz::REST::User->get" } 
);

$rtr->addRoutes (@routes);

my %queryArgs=("format" => "json");
if ($query and $query->param) {
    my @names = $query->param;
    foreach (@names) {
		warn "$_ = " . $query->param($_) . "\n" if ($debug);

		my @tmp = $query->param($_);  # In case this is a multi-valued parameter
		$queryArgs{$_} = join ',', @tmp;
	}
}

my $headerPrinted = 0;
my $printFormat = $queryArgs{format} || "json";

my $url = $ENV{REQUEST_URI};
$url =~ s,^(.*?lora\.cgi)/?,/,;	# Remove non-REST portion of URL


# Debug
my $SEP = "=============================================================\n";
my $OUT = "$url";
$OUT .= " ($ENV{REQUEST_METHOD}" if ($ENV{REQUEST_METHOD} ne "GET");
$OUT .= "\n";


$url =~ s,\?.*$,,;				# Strip off query params
my $path = $url;

dispatch ($path,
		  $ENV{REQUEST_METHOD},
		  \%queryArgs);

open (F, ">>/g/g0/jwlong/lora-out");
print F $OUT;
close F;

#$rtr->listRoutes();

sub dispatch {
	my ($uri,$reqm,$moreargs) = @_;
	$reqm = "get" unless ($reqm);

	if ($debug) {
		warn "-------------------------------------\n";
		warn "dispatched: $uri\n";
		warn "-------------------------------------\n";
	}

	if (my $match = $rtr->matchRoute($uri,$reqm)) {

		patchArgs($match->{args});
		if ($moreargs) {
			foreach (keys %{$moreargs}) {
				$match->{args}->{$_} = $moreargs->{$_};
			}
		}

		if ($debug) {
			warn "--> Matched $match->{path} [$match->{via}]\n";
			warn "    with route args=" . Data::Dumper::Dumper($match->{args}) . "\n";
		}

		my ($out,$err) = $rtr->execMatch($match);

		displayOutput($out,$err,$moreargs);

	} else {
		displayOutput("","[lora.cgi] No matching route for $uri [$reqm]");
	}
}

sub displayOutput {
	my ($output,$error,$moreargs) = @_;

    my $maybe_newline = "\n";

	maybePrintHeader();

	if ($error) {
        # catch invalid run-mode stuff
        if (not ref $error and  $error =~ /No such run mode/) {
            $output = JSON::to_json(Lorenz::Util->wrapout("Requested method not found"));
        } else {
            $output = JSON::to_json(Lorenz::Util->wrapit("", $error, Lorenz::Util::STATUS_OK));
        }
    } else {
		# Special cases where custom mime specified -- e.g., for downloading raw data, images, etc.
		if ($output and ref($output) and exists $output->{mime}) {
			if (exists $output->{download}) {
				# Caller wants to pop up a browser 'save as' dialog
				print "Content-type: $output->{mime}\n";
				
				if(exists $output->{size}){
					print "Content-length: ".$output->{size}."\n";	
				}
				print "Content-disposition: attachment; filename=$output->{download}\n\n";
			} else {
				print "Content-type: $output->{mime}\n\n";
			}
			$output = $output->{content};
			$maybe_newline = ""; # No trailing newline if binary file
		} elsif ($output and ($output =~ /^[{\[]/)) {
			# Output already wrapped and in json format
		} elsif ($output and ref($output)) {
			# Output already wrapped; just convert to json. canonical flag sorts hashes.
			$output = JSON::to_json($output, getJsonOpts());
		} else {
			# Output needs to be wrapped and converted to json
			$output = JSON::to_json(Lorenz::Util->wrapout($output), getJsonOpts());
		}
    }

	if ($moreargs and defined $moreargs->{callback}) {
		# Wrap for JSONP
		$output = "$moreargs->{callback}" . "({" . $output . "});";
	}

    print $output . $maybe_newline;
	$OUT .= $output . $maybe_newline;
	$OUT .= $SEP;
}

sub getJsonOpts{
    my $opts = {canonical => 1, pretty => 1};
    
#    if($query->param('pretty')){
#        $opts->{pretty} = 1;    
#    }
    
    return $opts;
}


sub patchArgs {
	my $args = shift;

	# For LORA usage, special case 'path' arg to make it into a valid unix path
	if (defined $args->{path}) {
		$args->{path} = "/$args->{path}";
		if (defined $args->{url_remainder}) {
			$args->{path} .= "/$args->{url_remainder}";
			delete $args->{url_remainder};
		}
	}

	if (defined $args->{user} and $args->{user} eq "ME") {
		$args->{user} = Lorenz::User->getUsername();
	}
}
		
	
sub maybePrintHeader {
    if (not $headerPrinted) {
		if ($printFormat eq "json") {
			print "Content-type: application/json\n\n";
		} elsif ($printFormat eq "auto" or
				 $printFormat eq "binary" or
				 $printFormat =~ /^[a-zA-Z]+\/[a-zA-Z0-9\-]+$/) {
			# Assume mime type will be returned by lower-level method, and printed at appropriate time
			# no-op
		} else {
			print "Content-type: text/plain; charset=iso-8859-1\n\n";
		}
		$headerPrinted = 1;
    }
}

sub mydie {
	my $err = shift;
	return Lorenz::Util->wrapit("","[lora.cgi] Terminating because: $err\n", Lorenz::Util::STATUS_ERROR);
}

sub testme {

	dispatch("/user/hamel2/queue");
	dispatch("/queue/sierra/reservations");
	dispatch("/queue/sierra/reservation/110107");
	dispatch("/queue/herd");
	dispatch("/queue/herd/478692");
	dispatch("/queue/herd", "post", {jobfile=>"/g/g0/jwlong/myjob.sh",job_partition=>"pdebug"});
	dispatch("/queue/herd", "get", {livedata=>1});
	dispatch("/queue/herd/478972", "delete", {operator=>"cancel"});

# portlet

	dispatch("/portlet/getCustomPortlets");
	dispatch("/portlet/getAllPortletConf");


# disk usage

	dispatch("/status/filesystem");
	dispatch("/user/jwlong/quotas");
	dispatch("/user/jwlong/purgedFiles");

# cpu usage

	dispatch("/status/cluster/aztec/utilization/daily");
	dispatch("/status/cluster/aztec/utilization/hourly");
	dispatch("/status/clusters/utilization/daily");
	dispatch("/status/clusters/utilization/daily2");
	dispatch("/status/clusters/ME/utilization/daily", "get", {ndays=>1} );
	dispatch("/user/hamel2/cpuutil/daily");

# news

	dispatch("/news");
	dispatch("/news/pm_cab");
	dispatch("/news/ALL");
	dispatch("/news/EXCERPT");
	dispatch("/user/springme/news");
	dispatch("/user/fake/news");

# support

	dispatch("/support/defaultLinks");
	dispatch("/support/network");
	dispatch("/support/getCredentialLifetime");
	dispatch("/support/lorenzAlert", "get");
	dispatch("/support/mylcToggle", "get");

# data

	dispatch("/scratchfs");
	dispatch("/parallelfs");

# file
	dispatch("/file/sierra/g/g0/jwlong/.cshrc", "get", {view=>"stat"});
	dispatch("/file/sierra/g/g0/jwlong/.cshrc", "get", {view=>"read"});
	dispatch("/file/sierra/g/g0/jwlong/tmp", "get");

# license

	dispatch("/status/license");
	dispatch("/status/license/all");
	dispatch("/status/license/ensight", "get", {_envelope=>0});

# store
	dispatch("/store");
	dispatch("/store/junk", "post", { 'data' => 'This is my store data' } );
	dispatch("/store/junk", "get");
	dispatch("/store/junk", "delete");
	dispatch("/store/junk", "get");

# cache
	dispatch("/user/ME/cache", "get");
	dispatch("/user/ME/cache/groups.sue", "get");
	dispatch("/user/ME/cache/groups.sue", "delete");
	dispatch("/user/ME/cache/groups.sue", "get");

# stores
	dispatch("/store");
	dispatch("/store/junk", "post", { 'data' => 'This is my store data' } );
	dispatch("/store/junk", "get");
	dispatch("/store/junk", "delete");
	dispatch("/store/junk", "get");

# users
	dispatch("/user/czjwlong/oun");
	dispatch("/user/czjwlong/hosts");
	dispatch("/user/jwlong");
	dispatch("/users");
	dispatch("/user/jwlong/default/host");
	dispatch("/user/long6/contactees");
	dispatch("/user/czjwlong/enclavestatus");

# hosts
	dispatch("/hosts");
	dispatch("/user/springme/hosts");
	dispatch("/user/springme/sshhosts");
	dispatch("/user/springme/transferhosts");
	dispatch("/host/aztec");
	dispatch("/status/host/aztec");

# bank
	dispatch("/bank", "get");
	dispatch("/banks", "get");
	dispatch("/bank/views", "get");
	dispatch("/bank/views/membership/edge", "get");
	dispatch("/user/jwlong/banks", "get");
	dispatch("/user/jwlong/bank/views", "get");
	dispatch("/user/jwlong/bankhosts", "get");

# clusters
	dispatch("/clusters");
	dispatch("/user/springme/clusters");
	dispatch("/status/clusters");
	dispatch("/status/clusters/user/springme");
	dispatch("/status/cluster/herd");
	dispatch("/cluster/aztec/details");
	dispatch("/cluster/dingleberry/details");
	dispatch("/cluster/aztec/joblimits");
	dispatch("/cluster/dingleberry/joblimits");
	dispatch("/user/jwlong/cluster/aztec/batchdetails");
	dispatch("/clusters/details");
	dispatch("/status/loginNode");
	dispatch("/status/machines");
	dispatch("/clusters/backfill");
	dispatch("/user/jwlong/cluster/herd/processes");
	dispatch("/user/jwlong/cluster/processes");
	dispatch("/cluster/processes", "post",
			 { 'clusters[]' => "aztec,aztec,herd",
			   'processes[]' => "11111111,222222222,3333333" } );

# commands
	dispatch("/command/herd", "post", { 'command' => 'hostname' });
	dispatch("/script/oslic/aquota", "post", {'arg' => '-c "show allowance"' });

# groups
	dispatch("/group/lorenz");
	dispatch("/groups");
	dispatch("/user/jwlong/groups");

# embedded code

	dispatch("/jefftest", "get");
	dispatch("/jefftest/2", "get");
	return;
}
