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

package Lorenz::REST::User;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


use strict;
use JSON;
use Lorenz::Util;
use Lorenz::REST::RESTHandler;
use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");


#======================================================================
#  /user/<user> -- Return info about given user/oun
#  /users       -- List all users
#======================================================================
sub get {
	my ($self,$args) = @_;

	if(defined $args->{info} && $args->{info} eq 'all'){
		$self->getAllUserInfo($args);
	}
	elsif (not $args->{user}) {
		$self->listAllUsers($args);
	} else {
		$self->getUserInfo($args);
	}
}

sub getAllUserInfo{
	my ($self,$args) = @_;

	my @userObjs = Lorenz::User->getAllUserInfo();
	
	return $self->prepout(\@userObjs);
}

#======================================================================
#  /user/:user
#======================================================================
sub getUserInfo {
	my ($self,$args) = @_;
	my $user = $args->{user} ||
		return $self->preperr("'user' not defined");

	my %i = Lorenz::User->getUserInfo($user);

	return $self->prepout(\%i);
}

#======================================================================
#  /users
#======================================================================
sub listAllUsers {
	my ($self,$args) = @_;

	my @u = Lorenz::User->listAllUsers();
	my $obj = { 'accounts' => \@u };
	return $self->prepout($obj);
}


#======================================================================
#  /user/<user>/default/host -- Return the default user for a given user
#======================================================================
sub getUserDefaultHost {
	my ($self,$args) = @_;
	my $user = $args->{user} || $self->preperr("'user' not defined");
	
	my $host = Lorenz::User->getUserDefaultHost($user);

	return $self->prepout( { 'host' => $host } );
}

#======================================================================
#  /user/<oun>/contactee -- Return the list of people for whom oun is the LC point of contact
#======================================================================
sub getUserContacteesByOun {
	my ($self,$args) = @_;
	my $user = $args->{user} || $self->preperr("'user' not defined");
	
	my @users = Lorenz::User->getUserContacteesByOun($user);

	my $obj = {
			 'point_of_contact' => $user,
			 'users' => \@users
			 };

	return $self->prepout($obj);
}

#======================================================================
#  /user/<user>/enclavestatus -- Return user's HPC Enclave status
#======================================================================

sub getEnclaveStatus {
	my ($self,$args) = @_;
	my $username = $args->{user} || $self->preperr("'user' not defined");

	my %h = Lorenz::User->getUserEnclaveStatus ($username);

	return $self->prepout(\%h);
}

#======================================================================
#  /user/<user>/oun -- Return user's OUN and LC username (accepts either form)
#======================================================================

sub getOun {
	my ($self,$args) = @_;
	my $username = $args->{user} || $self->preperr("'user' not defined");

	my %i = Lorenz::User->getOun($username);

	return $self->prepout(\%i);
}

1;
