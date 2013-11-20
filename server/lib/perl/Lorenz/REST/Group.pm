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

package Lorenz::REST::Group;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Group.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling group-related Lorenz REST calls.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use Lorenz::Config;
use Lorenz::REST::RESTHandler;
use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");

#======================================================================
#  /group/[group] -- Show info about one group
#======================================================================

sub getGroupInfo {
	my ($self,$args) = @_;
	my $group = $args->{group} ||
		return Lorenz::Util->$self->preperr("'group' not defined");

	my $obj = Lorenz::User->getGroupInfo($group);

	return $self->prepout($obj);
}

#======================================================================
#  /groups -- List all groups
#======================================================================
sub getAllGroups {
	my $self = shift;

	my @grps = Lorenz::User->getAllGroups();

	return $self->prepout( { 'groups' => \@grps } );
}

#======================================================================
#  /user/[user]/groups -- Show groups to which user belongs
#======================================================================

sub getUserGroups {
	my ($self,$args) = @_;
	my $user = $args->{user} ||
		return Lorenz::Util->$self->preperr("'user' not defined");

	my $out="";

	my %groups = Lorenz::User->getUserGroups($user);

	my @objs=();
	foreach (sort keys %groups) {
		
		push @objs, {
			'gname' => $_,
			'gid'	=> $groups{$_}
			};
	}

	return $self->prepout( { 'groups' => \@objs } );
}


1;
