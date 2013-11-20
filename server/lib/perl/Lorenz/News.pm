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

package Lorenz::News;

#===============================================================================
#									News.pm
#-------------------------------------------------------------------------------
#  Purpose:		News-centric methods (native)
#  Author:		Jeff Long
#  Notes:
#
#===============================================================================

use strict;
use JSON;
use File::Path qw(mkpath rmtree);
use File::Basename;
use Lorenz::Base;
use Lorenz::System;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my %conf = Lorenz::Config::getLorenzConfig();


# ($newsitemsRef,$error) = getNewsList()

sub getNewsList {
	my $self = shift;

	my @objs=();

	foreach my $item (qw / newsitem1 newsitem2 /) {
		my $modtime = "2013-03-08 12:17:28";

		my $obj = {
				   'item' => $item,
				   'update_time' => $modtime
				  };
		
		push @objs, $obj;
	}
	return (\@objs, "");
}

# $newsref = getNews(newsitem)

sub getNews {
	my ($self,$item) = @_;

	return "This is the news about $item";
}


# $newsref = getAllNews()

sub getAllNews {
	my $self = shift;

	my @objs=();

	foreach my $item ($self->getNewsList()) {
		chomp $item;

		my $obj = {
			'item' => $item,
			'news' => $self->getNews($item)
			};
		
		push @objs, $obj;
	}

	return (\@objs);
}

#  $newsref = getNewsExcerpts 

sub getNewsExcerpts {
	my $self = shift;
}

# $newsref = getUerNews(user)

sub getUserNews {
	my ($self,$user) = @_;

	return $self->getAllNews();
}

1;
