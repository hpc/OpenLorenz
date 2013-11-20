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

BEGIN {
	push @INC, "/usr/global/tools/lorenz/perl5/lib/site_perl/5.14.1";
	push @INC, "/usr/global/tools/lorenz/perl/lib/perl5/site_perl/5.8.8";
	push @INC, "/usr/global/tools/lorenz/perl/lib/perl5/site_perl/5.8.8/json";

	use FindBin qw($Bin);
	use File::Basename;
	my $d = $Bin; 

	for (my $i=0; $i<2; $i++) {
		$d = dirname($d);
    }
	$main::lorenzRootDir = $main::lorenzRootUrl = $d;
	push @INC, "$main::lorenzRootDir/server/lib/perl";
	push @INC, "/usr/global/web-pages/lc/www/lorenz/server/lib/perl";
}

use Time::HiRes qw(sleep);
use Test::WWW::Selenium;
use Test::More "no_plan";
use Test::Exception;
use Lorenz::Test::Utilities;

my $module = Lorenz::Test::Utilities->new($ARGV[0], $ARGV[1]);
my $sel = $module->getSelenium();

#============================================================
# Automates QUnit tests, DISABLED as of 9/13 due to QUnit tests needing to be updated!
#============================================================
$module->none("QUnit tests" => sub { 
	#open mylc in unit test mode
	$sel->open_ok("mylc/mylc.cgi?testMode=on", "opening unit tests");	
	
	#perform checks to see if we failed any qunit tests
	$module->qunitTest();
});

#============================================================
# Tests whether main page elements for mylc are in place
#============================================================
$module->test("Main page elements are present" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	#verify core elements are present
	$sel->is_element_present_ok("css=div.wrapper");
	$sel->is_element_present_ok("css=div.footer");
	$sel->is_element_present_ok("css=#header");
	$sel->is_element_present_ok("css=#portletControls");
	$sel->is_element_present_ok("css=#portletContainer");
	
	#verify mylc tab is highlighted
	$sel->text_is("css=#navMenu li.ui-state-active a", "dashboard");
	
	#verify user login information is shown
	$sel->is_element_present_ok("css=#loginInfo");
	my $loginUser = $sel->get_text("css=#loginInfo #userId");
	ok($sel->get_expression($loginUser) =~ /[a-z]+[0-9]*/, "username $loginUser seems okay");
	
	#verify 3 columns for portlets
	my $columns = $sel->get_xpath_count("//div[\@id=\"portletContainer\"]/div");
	ok($columns == 3, "3 portlet columns found");
	
	$module->checkForError();
	
	pass;
});

#============================================================
# Tests user actions with the portlet control panel
#============================================================
$module->test("Portlet control panel (smoke test)" => sub { 
	#open mylc
	$module->openMylcDashboard();

	#open control panel
	$module->openPortletControlPanel();
	
	#reset user view
	$module->resetUserView();
	
	#open control panel
	$module->openPortletControlPanel();
	
	#reset portlet arrangement - all portlets
	$module->resetPortletArrangement();
	
	#open control panel
	$module->openPortletControlPanel();
	
	#disable all supported portlets
	$module->disableAllPortletsOfType("supported");
	
	#disable all custom portlets
	$module->disableAllPortletsOfType("custom");
	
	#reopen mylc
	$module->openMylcDashboard();
	
	#check that no portlets are on page
	$supportedOnPage = $module->countPortletsOnPage();
	ok($supportedOnPage == 0, "no portlets displayed on page");
	
	pass;
});

#============================================================
# Tests for portlet render errors
#	prerequisite: no portlets should be visible
#============================================================
$module->test("Portlets render error test" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	#check that no portlets were placed on page	
	my $portletsOnPage = $module->countPortletsOnPage();
	ok($portletsOnPage == 0, "no portlets on page as expected");
	
	#enable/check all supported portlets
	$module->enableAllPortletsOfType("supported");
	
	#enable/check all custom portlets
	$module->enableAllPortletsOfType("custom");
	
	pass;
});

#============================================================
# Tests portlet controls
#============================================================
$module->test("Portlet controls test" => sub {
	#open mylc
	$module->openMylcDashboard();
	
	my $portletsOnPage = $module->countPortletsOnPage();
	
	my %minPortlets = ();
	
	#test portlet controls on random portlets
	for(my $i = 1; $i <= 15; $i++){
		my $randPortletNum = int(rand($portletsOnPage));
		my $portletName = $module->portletIndexToName($randPortletNum);
		
		$module->togglePortletMinimization($portletName);

		$minPortlets{$portletName} = $module->isPortletMinimized($portletName);
	}
	
	#reopen mylc
	$module->openMylcDashboard();
	
	while(($key, $value) = each(%minPortlets)){
		ok(($module->isPortletMinimized($key) == $value), "expected portlet visibility found after reload");
	}
	
	$module->resetPortletArrangement();
	$module->maximizeAllPortlets();
	
	pass;
});

#============================================================
# Tests portlet arrangement
#============================================================
$module->test("Portlet arrangement test" => sub {
	#open mylc
	$module->openMylcDashboard();
	
	#prime test for all portlets
	$module->enableAllPortletsOfType("supported");
	$module->enableAllPortletsOfType("custom");
	
	#reopen mylc
	$module->openMylcDashboard();
	
	my $portletsOnPage = $module->countPortletsOnPage();
	
	#test random portlet arrangements
	for(my $i = 1; $i <= 15; $i++){
		my $randPortletNum = int(rand($portletsOnPage));
		my $randCol = int(rand(3))+1;
		
		$module->movePortletToColumn($sel->get_attribute("sizzle=div[portlettype]:eq($randPortletNum)\@portlettype"), $randCol);
	}
	
	#prime test for only custom portlets
	$module->disableAllPortletsOfType("supported");
	$module->enableAllPortletsOfType("custom");
	
	#reopen mylc
	$module->openMylcDashboard();
	
	$portletsOnPage = $module->countPortletsOnPage();
	
	#test random portlet arrangements
	for(my $i = 1; $i <= 5; $i++){
		my $randPortletNum = int(rand($portletsOnPage));
		my $randCol = int(rand(3))+1;
		
		$module->movePortletToColumn($sel->get_attribute("sizzle=div[portlettype]:eq($randPortletNum)\@portlettype"), $randCol);
	}
	
	pass;
});


undef($sel);
undef($module);
1;