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

#Filename: test-lora.cgi
#Author: Joel Martinez
#Date: Jan 26 2012
#Description: Form to test LORA endpoints
BEGIN {
    # Number of levels down in the hierarchy this file is from the Lorenz root
    my $levelsFromLorenzRoot = 1;
    
    my $pathToInit = '../' x $levelsFromLorenzRoot . "init.pl";
    require $pathToInit;
    lorenzInit($levelsFromLorenzRoot);
}

use strict;
use warnings;
use Lorenz::DependencyManager qw(:standard);

my $template = getTemplate({appName => 'testLora'});

outputTemplate($template);