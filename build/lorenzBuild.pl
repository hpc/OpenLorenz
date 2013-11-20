#!/usr/bin/perl
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

#Filename: lorenzBuild.pl
#Author: Joel Martinez
#Date: May 12 2011
#Description: This script will be used to compile and minify all dependencies
#             for Lorenz's individual apps.  (Most) paths are relative to this scripts
#             location.
BEGIN {
    # Number of levels down in the hierarchy this file is from the Lorenz root
    my $levelsFromLorenzRoot = 1;

    require "../" x $levelsFromLorenzRoot ."init.pl";    
 
    lorenzInit($levelsFromLorenzRoot);
}
use strict;
use warnings;
use Lorenz::DependencyManager qw(:compiler);

my $app = $ARGV[0];

if($app){
    my @apps = split(/,\s*/, $app);
    buildLorenz(\@apps);
}
else{
    buildLorenz();
}


