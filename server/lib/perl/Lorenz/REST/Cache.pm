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

package Lorenz::REST::Cache;

###########################################################################
# $URL: https://sourceforge.llnl.gov/svn/repos/lorenz/trunk/server/lib/perl/Lorenz/REST/Cache.pm $
# $Author: long6 $
# $Date: 2011-05-28 18:35:52 -0700 (Sat, 28 May 2011) $
# $Rev: 379 $
###########################################################################


#===============================================================================
#									Cache.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling Lorenz server cache via REST calls.
#  Author:		Jeff Long
#===============================================================================

use strict;
use vars qw(@ISA);
use Lorenz::REST::RESTHandler;
@ISA = ("Lorenz::REST::RESTHandler");

#--------------------------------------------------

#======================================================================
#  /user/ME/cache -- Get list of user's cache
#======================================================================
sub getList {
	my ($self,$args) = @_;

	my @caches = Lorenz::Cache->list();

	return $self->prepout(\@caches);
}

#======================================================================
#  /user/ME/cache/:cache -- Get contents of given cache
#======================================================================

sub get {
	my ($self,$args) = @_;

	my $data = Lorenz::Cache->get($args->{cache});

	if ($data) {
		if ($args->{format} and $args->{format} eq "binary") {
			return { "binary" => 1,
					 "content" => $data	};
		}  else {
			return $self->prepout($data);
		}
	} else {
		return $self->preperr("Could not retrieve cache: $args->{cache}");
	}
}


#======================================================================
#  /user/ME/cache [DELETE] -- Delete given cache (or all caches)
#======================================================================
sub delete {
	my ($self,$args) = @_;
	my $cache = $args->{cache} || "_all_";

	my $nrm = Lorenz::Cache->delete($cache);
	
	return $self->prepout("$nrm items removed from Lorenz server cache.");
}

sub _checkCacheDir {
	my $self = shift;

	my $cache;
	if ($self->{cache}) {
		# Get cache name; allow subdir structure.
		$cache = $self->{cache};
		$cache .= "/$self->{dispatch_url_remainder}"
			if exists $self->{dispatch_url_remainder};
		return("", "Invalid chars in cache name")
			if ($cache =~ /\.\./);	# Don't allow .. in paths
	}

	my $lorenzDir = getUserLorenzDir();
	my $cacheDir = $lorenzDir.'/cache';
	
	#If no cache directory create it
	if(!-e $cacheDir){
		mkdir($lorenzDir.'/cache');
	}

	# If cache contains subdirs, make sure those exist
	if ($self->{cache}) {
		my $subpath = dirname($cache);
		if ($subpath and $subpath ne ".") {
			$subpath = "$cacheDir/$subpath";
			eval { mkpath($subpath) };
			if ($@) {
				return ("", "Could not create cache path: $cache");
			}
		}
	}
	
	return ($cacheDir, $cache);
}	


1;
