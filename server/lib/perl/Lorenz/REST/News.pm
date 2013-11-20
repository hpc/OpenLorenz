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

package Lorenz::REST::News;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									News.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling news-related Lorenz REST calls.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use JSON;
use Lorenz::Config;
use Lorenz::News;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();

#--------------------------------------------------

#======================================================================
#  /news/<newsitem> -- Show contents of given news item
#======================================================================

sub getNews {
	my ($self,$args) = @_;
	my $item = $args->{newsid};

	my $out = Lorenz::News->getNews($item);

	my $obj = {
		'item' => $item,
		'news' => $out
		};

	return $self->prepout($obj);
}

#======================================================================
#  /news/EXCERPT -- Show excerpts from all news items
#======================================================================

sub getNewsExcerpts {
	my ($self,$args) = @_;
	my $self = shift;

	my $data = Lorenz::News->getNewsExcerpts();

	return $self->prepout($data);
}

#======================================================================
#  /news/ALL -- Show contents of all news items
#======================================================================

sub getAllNews {
	my ($self,$args) = @_;

	my $obj = {
		'newsItems' => Lorenz::News->getAllNews()
	};

	return $self->prepout($obj);
}

#======================================================================
#  /news -- Show list of news items
#======================================================================
sub getNewsList {
	my ($self,$args) = @_;

	my ($objs, $err) = Lorenz::News->getNewsList();

	return $self->preperr($err) if ($err);

	my $obj = {
		'newsItems' => $objs
		};

	return $self->prepout($obj);
}

#======================================================================
#  /user/ME/news -- Show list of news items only for hosts user has access to
#======================================================================

sub getUserNews {
	my ($self,$args) = @_;

	my $user = $args->{user} || Lorenz::User->getUsername();

	my ($myNews,$err) = Lorenz::News->getUserNews($user);

	if (not $err) {
		return $self->prepout( {newsItems => $myNews} );
	} else {
		return $self->preperr($err);
	}
}

1;


