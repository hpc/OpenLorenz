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

package Lorenz::Base;

#===============================================================================
#									Lorenz::Base.pm
#-------------------------------------------------------------------------------
#  Purpose:		Base class for Lorenz native classes.
#  Author:		Jeff Long
#  Notes:
#		Implements default versions of the new() class
#===============================================================================

use strict;
my $debug = 0;
my $className = "Base";
use JSON;
use File::Path qw(mkpath);

use Lorenz::Cache;
use Lorenz::Config;
use Lorenz::LData;
use Lorenz::Util;

my %conf = Lorenz::Config::getLorenzConfig();

sub new {
	my $proto = shift;
	my $class = ref($proto) || $proto;
	my $self  = {};

	$className = $class;

	my $args = shift;
	if ($args) {
		foreach (keys %$args) {
			$self->{$_} = $args->{$_};
		}
	}
	$self->{conf} = \%conf;

	bless ($self, $class);
	return $self;
}
