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

#Filename: mylc.cgi
#Author: Joel Martinez
#Date: Nov 16 2010
#Description: This is the landing dashboard page for the lorenz project
BEGIN {
	require '/usr/global/tools/lorenz/lib/lorenz.pl';
} 

use strict;
use warnings;
use Lorenz::DependencyManager qw(:standard);
use Lorenz::Simple;
use Lorenz::REST::Portlet;
use JSON;

my $lo = Lorenz::Simple->new();
$lo->clearUserLorenzTmpDir();

my $template = getTemplate({appName => 'mylc'});

#If allLorenzConfJson or lorenzCustomPortletPreCache are not defined, the Lorenz PortletControls will try
#to get this info by making calls to the getCustomPortlets and getAllPortletConf REST endpoints in Lorenz.js

#This is a way to bootstrap the custom user preferences saved via the gear widget menu in each portlet
#my ($pConf,$err) = Lorenz::Portlet->getAllPortletConf();
#$template->param('preJSContent' => '<script>var allLorenzConfJson = '.to_json($pConf).';</script>');

#If you want to get custom portlets, define the Lorenz::REST::Portlet::getCustomPortlets function to be able to return a string of all custom widgets
#concatenated together.  This method should also handle an ajax request, in this case I just pass a flag to tell it what to return.
#$template->param('postJSContent' => '<script>var lorenzCustomPortletPreCache = true;'.Lorenz::Portlet->getCustomPortlets().'</script>');

#This is custom css for each custom portlet
#$template->param('postCSSContent' => Lorenz::Portlet->getCustomPortletsCss());

outputTemplate($template);
