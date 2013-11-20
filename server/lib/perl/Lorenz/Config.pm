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

package Lorenz::Config;

#===============================================================================
#									Config.pm
#-------------------------------------------------------------------------------
#  Purpose:		Configuration information for this installation of Lorenz.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		See the individual subs for more modification history info.
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;

our (@ISA, @EXPORT);
BEGIN {
	require Exporter;
	@ISA = qw(Exporter);
	@EXPORT = qw(getLorenzConfig getLorenzDispatchTable getNfsFilerLogs getDefaultLinks getNetwork isLorenzAdmin getLcZone);
}

# Edit this for other installations
my $lc_zone = "zone1";
my $network = "ocf";
	

# Patch Lorenz root dir variable for off-webserver processes
$main::lorenzRootDir =~ s,/www/staged,/usr/global/web-pages/lc,;

my ($defaultHost,$defaultCluster,$emailContacts,$hotlineEmail,$supportEmail);

if ($lc_zone eq "zone1") {
	$defaultHost	= "hosta";
	$defaultCluster = "hosta";
	$emailContacts = "admin\@your.site.here";
	$hotlineEmail  = "hotline\@your.site.here";
	$supportEmail  = "support\@your.site.here";
}

#
#  General Lorenz configuration
#
my %conf = (
			# Network & zone for this installation
			"network"	   => $network,
			"lc_zone"      => $lc_zone,
			
			# Default host for making remote connections
			"defaultHost"  => $defaultHost,

			# Default cluster for making remote connections
			"defaultCluster"  => $defaultCluster,
			
			"lorenzAdmins" => {admin1 => 1},

			# Email address to which error reports should be sent
			"errorEmailAddress" => $emailContacts,
			
			# LC Hotline Email
			"hotlineEmail" => $hotlineEmail,
			
			# Account support email
			"supportEmail" => $supportEmail,

			# Global data dir where collected info is stored:
			"dataDir"	   => "/usr/global/tools/lorenz/data"

			);

sub getLorenzConfig () {
	return %conf;
}

sub isLorenzAdmin{
	return defined $conf{lorenzAdmins}->{$ENV{REMOTE_USER}};
}

sub getNetwork(){
	return $network;
}

#======================================================================
#
#  * NFS filesystem info -- usage, quota statistics
#  * Default links       -- links to LC pages
#
#======================================================================

my %nfsFilerLogs=();
my @defaultLinks=getDefaultLinks();


sub getDefaultLinks {
	my $links = {
		zone1 => [
			"LC Home|https://computing.llnl.gov",
			"LC Resources|https://computing.llnl.gov/?set=resources&page=index"
		]
	};
	
	return @{$links->{$lc_zone}};
}

sub getMyIP {
	use Socket;
	use Sys::Hostname;
	return inet_ntoa(scalar(gethostbyname(hostname())));
}

sub getLcZone{
	return $lc_zone;
}


1;

