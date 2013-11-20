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

package Lorenz::Host;

#===============================================================================
#									Host.pm
#-------------------------------------------------------------------------------
#  Purpose:		Host-centric methods (native)
#  Author:		Jeff Long
#  Notes:
#
#===============================================================================

use strict;
use Lorenz::Base;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my %conf = Lorenz::Config::getLorenzConfig();

my $clustername = "";


#======================================================================
#   Hosts support
#======================================================================

#
# $clustername = clustername()  # Name of the host we're on
#
sub clustername {
	my $self = shift;
	return "hosta";
}


#
# @h = getAllHosts()
#
sub getAllHosts {
	my $self = shift;

	return qw / hosta hostb /;
}

# Return list of all login nodes for given cluster
sub getLoginNodes {
	my $self = shift;
	my $cluster = shift;

	my %nodes;
	$nodes{"${cluster}1"} = "up";
	$nodes{"${cluster}2"} = "up";

	return %nodes;
}


sub pickLoginNode {
	my $self = shift;
	my $host = shift;

	return "${host}1";
}

sub getAvailableLoginNodes {
	my $self = shift;
	my $host = shift;

	return ("${host}1", "${host}2");
}


sub isStorageHost {
	my $host = shift;

	return 0;
}

# json_str = getHostSpecs(host) -- Return host specifications (num cpus, etc.)
sub getHostSpecs {
	my ($self,$host) = @_;

	my $content = Lorenz::Cluster->getClusterDetails($host);

	# Output already in json format...
	return $content;
}

# bool = getHostStatus(host) -- Report wheter host is up or down (returns 1 or 0)
sub getHostStatus {
	my ($self,$host) = @_;

	return 1;
}

1;
