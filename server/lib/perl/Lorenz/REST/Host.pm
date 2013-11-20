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

package Lorenz::REST::Host;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Host.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling host-related Lorenz REST calls.
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
use Lorenz::Host;
use Lorenz::REST::RESTHandler;
@ISA = ("Lorenz::REST::RESTHandler");


#--------------------------------------------------

#======================================================================
#  /hosts -- Show all hosts
#======================================================================
sub getAllHosts {
	my $self = shift;

	my @h = Lorenz::Host->getAllHosts();

	return $self->prepout( { 'accounts' => \@h } );
}

#======================================================================
#  /user/[user]/hosts -- Show hosts on which user has account
#======================================================================

sub getUserHosts {
	my ($self,$args) = @_;
	my $user = $args->{user} || return $self->preperr("user not defined");

	my @h = Lorenz::User->getUserHosts($user);

	return $self->prepout( { 'accounts' => \@h } );
}

#======================================================================
#  /user/[user]/sshhosts -- Show hosts to which user can ssh from web server
#======================================================================

sub getUserSshHosts {
	my ($self,$args) = @_;
	my $user = $args->{user} || return $self->preperr("user not defined");

	my @h = Lorenz::User->getUserSshHosts($user);

	return $self->prepout( { 'accounts' => \@h } );
}


#======================================================================
#  /user/[user]/transferhosts -- Show hosts to which user can transfer files from web server
#======================================================================

sub getUserFileTransferHosts {
	my ($self,$args) = @_;
	my $user = $args->{user} || return $self->preperr("user not defined");

	my %objs;
	my @h = Lorenz::User->getUserFileTransferHostsInfo($user);

	foreach my $hostInfo (@h) {
		my $host = $hostInfo->{host};
		
		$objs{$host} = $hostInfo;
	}
						 
	return $self->prepout(\%objs);
}


#======================================================================
#  /host/[host] -- Show information about requested host
#======================================================================
sub getHostInfo {
	my ($self,$args) = @_;
	my $host = $args->{host} || return $self->preperr("host not defined");

	# First look for job.lim file in /var/news for this host:
	my $content = Lorenz::Cluster->getClusterJobLimits($host);

	if ($content) {
		my $obj = { 'name' => $host,
					'info' => "<pre>\n$content\n</pre>"};
		return $self->prepout($obj);
	}
	
	# No job.lim file; look for host spec file
	$content = Lorenz::Host->getHostSpecs($host);

	# Output already in json format...
	return $self->prepjson($content, "", Lorenz::Util->STATUS_OK);
}

#======================================================================
#  /status/host/[host] -- Report whether given host is up or not
#======================================================================
sub getHostStatus {
	my ($self,$args) = @_;
	my $host = $args->{host} || return $self->preperr("'host' not defined");

	my $status = Lorenz::Host->getHostStatus($host);

	my $obj = { 'host'   => $host,
				'hostStatus' => ($status) ? "up" : "down"};
	return $self->prepout($obj);
}

				
1;

