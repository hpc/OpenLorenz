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

package Lorenz::DiskUsage;

#===============================================================================
#					DiskUsage.pm
#-------------------------------------------------------------------------------
#  Purpose:	Methods related to disk usage and quotas (native)
#  Author:	Jeff Long
#  Notes:
#===============================================================================

use strict;
use vars qw(@ISA);
use Date::Format;
use Date::Parse;
use Lorenz::Base;
use Lorenz::System;
use Lorenz::Util;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my $defaultHost = "hosta";

# href = getUserQuotas($user,$showAll)

sub getUserQuotas {
	my ($self,$user,$showAll) = @_;

	my %objs;

	$objs{"/home/$user"} = {
		'filesystem' => "/home/$user",
		'used'		 => "50GB",
		'limit'		 => "100GB",
		'nfiles'	 => 10000,
		'pct'		 => 50,
		'user'		 => $user
	};

	return \%objs;
}

# (href,errmsg) = getFilesystemUsage($user,{url_remainder=""|"/path"})

sub getFilesystemUsage {
	my ($self,$fs) = @_;

	my @d = localtime();
	my $dataTimestamp = strftime('%Y-%m-%d %T', @d);

	my @objs;
		
	push @objs, {
			'filesystem' => "/home",
			'capacity'	 => "100TB",
			'type'	     => "nfs",
			'used'		 => "90TB",
			'remaining'	 => "10 TB",
			'pct'		 => "90",
			'status'     => "up"
	};

	my $obj = {
		'filesystems' => \@objs,
		'last_update' => $dataTimestamp,
		'last_update_ms' => int(str2time($dataTimestamp)) * 1000
	};
	
	return ($obj,"");
}

# ($status,$err) = getFilesystemStatus() -- Return fs status

sub getFilesystemStatus{
	my $self = shift;
	
	my $ldata = Lorenz::LData->new();

	my $out = $ldata->get("filesystemStatus");

	my @status;
	foreach (split /\n/, $out) {
		push @status, $_;
	}
	
	my ($status,$err) = Lorenz::Util->lorenz_from_json(join('', @status));

	if (not $err) {
		return ($status,"");
	} else {
		return (undef, $err) if ($err);
	}
}

# (list,errmsg) = getPurgedFileList(user, pastDays)

sub getPurgedFileList {
	my ($self,$user,$pastDays) = @_;

	return ("","");
}

1;

