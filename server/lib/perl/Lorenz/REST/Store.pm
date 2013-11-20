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

package Lorenz::REST::Store;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Store.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling store-related Lorenz REST calls.
#  Author:		Joel Martinez (code), Jeff Long (mapping to modules)
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#	01/31/2011 - jwl: Initial version, based entirely on work done by Joel Martinez
#	01/31/2011 - jwl: Added list option, when no store name given to GET method
#	02/25/2011 - jwl: Added delete method
#===============================================================================

use strict;
use vars qw(@ISA);
use Lorenz::Store;
use Lorenz::REST::RESTHandler;
@ISA = ("Lorenz::REST::RESTHandler");

#--------------------------------------------------

#======================================================================
#  /store/:store -- get value of given store
#======================================================================
sub getStore {
	my ($self,$args) = @_;

	return $self->preperr("[Store::getStore] store not defined")
		if (not defined $args->{store});

	my $store = $self->_fixStoreName($args);

	my $data = Lorenz::Store->getStore($store);

	if (not defined $data) {
# We should probably change this to return a 'missing' status rather than an 'ok'. jwl, 3/5/13
		return $self->prepout("");
#		return $self->preperr("[Store::getStore] store: $store not found");
	} 
	elsif ($args->{format} and $args->{format} eq "binary") {
		return { "binary" => 1,
				 "content" => $data
				 };
	}
	elsif($args->{format} and $args->{format} eq "raw"){
		return $data;
	}else {
		return $self->prepout($data);
	}
}

#======================================================================
# /store/:store [PUT] -- Create new store
#======================================================================
sub createStore {
	my ($self,$args) = @_;
	return $self->preperr("[Store::createStore] store not defined")
		if (not defined $args->{store});

	my $store = $self->_fixStoreName($args);

	my @data = <STDIN>;

	my $ok = Lorenz::Store->createStore($store,join '', @data);

	if ($ok) {
		return $self->prepout("Data store: $args->{store} successfully created.");
	} else {
		return $self->preperr("Could not create store: $args->{store}.");
	}
}

#======================================================================
# /store/:store [POST] -- Append to existing store
#======================================================================
sub appendToStore {
	my ($self,$args) = @_;

	return $self->preperr("[Store::appendToStore] store not defined")
		if (not defined $args->{store});

	my $store = $self->_fixStoreName($args);
	
	my $data = $args->{data};

	my $ok = Lorenz::Store->appendToStore($store, $data);

	if ($ok) {
		return $self->prepout("Data store successfully appended to.");
	} else {
		return $self->preperr("Could not append to store: $args->{store}.");
	}
}

#======================================================================
# /store/:store [DELETE] -- Remove store
#======================================================================
sub deleteStore {
	my ($self,$args) = @_;
	return $self->preperr("[Store::delete] store not defined")
		if (not defined $args->{store});

	my $store = $self->_fixStoreName($args);
	
	my $nrm = Lorenz::Store->deleteStore($store);

	return $self->prepout("$nrm items removed from data store.");
}


#======================================================================
# /store [GET] -- Generate list of stores
#======================================================================
sub getStoreList {
	my ($self,$args) = @_;

	my @stores = Lorenz::Store->getStoreList();

	return $self->prepout(\@stores);
}

sub _fixStoreName {
	my ($self,$args) = @_;

	my $store = $args->{store};

	if ($store) {
		# Get store name; allow subdir structure.
		$store .= "/$args->{path}"
			if exists $args->{path};
	}
	return $store;
}



1;
