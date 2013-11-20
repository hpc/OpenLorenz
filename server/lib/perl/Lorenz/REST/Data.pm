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

package Lorenz::REST::Data;

#===============================================================================
#                                                                       Data.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling data-related Lorenz REST calls.
#  Author:      Jeff Long, 8/03/2012
#  Notes:
#               "new" sub is inherited from superclass
#===============================================================================

use strict;
use JSON;
use Lorenz::Cache;
use Lorenz::Config;
use Lorenz::REST::RESTHandler;
use Lorenz::REST::Cluster;
use File::Basename;
use Scalar::Util qw(looks_like_number);

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();


#--------------------------------------------------

sub post {
	my ($self,$args) = @_;
}

1;
