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

package Lorenz::REST::DiskUsage;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################



#===============================================================================
#									DiskUsage.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling DiskUsage-related Lorenz REST calls.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use Date::Format;
use Date::Parse;
use Lorenz::DiskUsage;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");


#======================================================================
#  /user/[user]/quotas -- Show disk quotas for given user
#======================================================================
sub getUserQuotas {
	my ($self,$args) = @_;
	my $user = $args->{user} ||
		return $self->preperr("'user' not defined");

    my $quotaInfo = Lorenz::DiskUsage->getUserQuotas($user,(defined $args->{showAll} and $args->{showAll}) ? 1 : 0);

    # Convert to array
	my @objs=();
    foreach my $fs ( sort keys %{$quotaInfo} ) {
        push @objs, $quotaInfo->{$fs};
    }

	my @d = localtime();
	my $now = strftime('%Y-%m-%d %T', @d);
	
	my $obj = {
		'filesystems' => \@objs,
		'last_update' => $now,
		'last_update_ms' => int(str2time($now)) * 1000
		};

	return $self->prepout($obj);
}

#======================================================================
#  /status/filesystem -- Show filesystem usage
#======================================================================
sub getFilesystemUsage {
	my ($self,$args) = @_;

	my $fs_choice="";  # Default is to report on all filesystmes

    my ($obj,$err) = Lorenz::DiskUsage->getFilesystemUsage($fs_choice);

    if ($err) {
		return $self->preperr($err);
	}
	
	return $self->prepout($obj);
}

#======================================================================
#  /user/[user]/purgedFiles -- Show info about user's purged files in Lustre
#======================================================================
sub getPurgedFileList{
	my ($self,$args) = @_;

	my $user = $args->{user} || Lorenz::User->getUsername();
	my $pastDays = $args->{days} || 60;

    my ($list,$err) = Lorenz::DiskUsage->getPurgedFileList($user, $pastDays);

	if (not $err) {
		return $self->prepout($list);
	} else {
		return $self->preperr($err);
	}
}


1;
