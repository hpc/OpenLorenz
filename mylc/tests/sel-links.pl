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

our $module = Lorenz::Test::Utilities->new($ARGV[0], $ARGV[1]);
our $sel = $module->getSelenium();

#============================================================
# Initialize by rendering the links portlet on the dashboard
#============================================================
$module->test("Initalize" => sub {
	#open mylc
	$module->openMylcDashboard();
	
	#render only the links portlet
	$module->disableAllPortlets();
	$module->enablePortlet("supported", "links");
	$module->checkForError();
});

#============================================================
# Tests whether main elements of links portlet are in place
#============================================================
$module->test("Main elements of portlet are in place" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	my $container = "//div[\@portlettype='links']";
	$sel->is_element_present_ok($container, "links portlet container found");
	
	$sel->is_element_present_ok("css=ul#portletDefaultLinks", "found default links section");
	$sel->is_element_present_ok("css=ul#portletUserLinks", "found user links section");
	
	$sel->get_xpath_count_ok("$container//ul[\@id='portletDefaultLinks']/li", "found some default links");
	ok($sel->get_text("css=div[portlettype='links'] button:eq(0) span") eq 'add new link', "new link button found");
	ok($sel->get_text("css=div[portlettype='links'] button:eq(1) span") eq 'edit links', "organize links button found");
});

#============================================================
# Check 'add new link' dialog
#============================================================
$module->test("Add new link dialog check" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	my $addNewLinkButton = "css=div[portlettype='links'] button:eq(0) span";
	$sel->is_element_present_ok($addNewLinkButton, "new link button found");
	
	$sel->click($addNewLinkButton);
	$module->waitForDialog();
	
	my $container = "css=#portlet_dialog";
	ok($sel->get_text("css=#ui-dialog-title-portlet_dialog") eq 'Add new links', "found appropriate dialog title");
	$sel->is_element_present_ok("$container input[name='linkText']", "input box for link text found");
	$sel->is_element_present_ok("$container input[name='linkUrl']", "input box for link url found");
	ok($sel->get_value("$container input[name='linkUrl']") eq 'http://', "initial url value is set");
	
	
	$module->checkNumOfPortletDialogButtons(2);
	$module->checkPortletDialogButtonName(0, 'save');
	$module->checkPortletDialogButtonName(1, 'cancel');
	
	$module->clickPortletDialogButton(1);
	ok(!$module->isPortletDialogOpen(), "dialog closed when using cancel button");
});

#============================================================
# Check error handling on 'add new link' dialog
#============================================================
$module->test("Add new link error handling" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	my $addNewLinkButton = "css=div[portlettype='links'] button:eq(0) span";
	$sel->is_element_present_ok($addNewLinkButton, "new link button found");
	
	$sel->click($addNewLinkButton);
	$module->waitForDialog();
	
	my $container = "css=#portlet_dialog";
	my $linkInput = "$container input[name='linkText']";
	my $urlInput = "$container input[name='linkUrl']";
	
	#check that error feedback was received
	sub assertFeedbackError {		
		$module->clickPortletDialogButton(0);
		ok($module->isPortletDialogOpen(), "dialog still open");
		$sel->is_element_present_ok("css=#portlet_dialog .feedbackError", "feedback error received");
	}
	
	#no title, no url
	$sel->type_ok($linkInput, "");
	$sel->type_ok($urlInput, "");
	assertFeedbackError();
	
	#no title
	$sel->type_ok($linkInput, "");
	$sel->type_ok($urlInput, "https://www.llnl.gov");
	assertFeedbackError();
	
	#no url
	$sel->type_ok($linkInput, "something");
	$sel->type_ok($urlInput, "");
	assertFeedbackError();
	
	$module->clickPortletDialogButton(1);
	ok(!$module->isPortletDialogOpen(), "dialog closed when using cancel button");
});

#============================================================
# Check add a new valid link functionality
#============================================================
$module->test("Add valid new link" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	my $addNewLinkButton = "css=div[portlettype='links'] button:eq(0) span";
	
	$sel->click($addNewLinkButton);
	$module->waitForDialog();
	
	my $container = "css=#portlet_dialog";
	my $linkInput = "$container input[name='linkText']";
	my $urlInput = "$container input[name='linkUrl']";
	
	#check that error feedback was received
	sub assertSuccessAdd{
		my $title = shift;
		
		$module->clickPortletDialogButton(0);
		$module->waitForAJAX();
		ok(!$module->isPortletDialogOpen(), "dialog not open");
		$sel->is_element_present_ok("css=ul#portletUserLinks li[id=\"li_$title\"]", "found the added link");
	}
	
	for(my $i = 0; $i < 3; $i++){
		#proper title and url
		my $title = "LLNL ".localtime;
		$sel->type_ok($linkInput, $title);
		$sel->type_ok($urlInput, "https://www.llnl.gov");
		assertSuccessAdd($title);
		sleep(1);
	}
});

#============================================================
# Check 'edit links' dialog
#  prereq: at least one custom link
#============================================================
$module->test("Edit links dialog check" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	my $editLinksButton = "css=div[portlettype='links'] button:eq(1) span";
	$sel->is_element_present_ok($editLinksButton, "edit links button found");
	
	$sel->click($editLinksButton);
	$module->waitForDialog();
	
	my $container = "css=#portlet_dialog";
	ok($sel->get_text("css=#ui-dialog-title-portlet_dialog") eq 'Edit links', "found appropriate dialog title");
	
	$sel->is_element_present_ok("$container ul[id=portletUserLinks_clone][class~=ui-sortable]", "found links list");
	my $numOfLinks = $sel->get_xpath_count("//div[\@id='portlet_dialog']//ul[\@id='portletUserLinks_clone']/li");
	ok($numOfLinks, "found some list items");
	
	#checks the link for the right components
	sub checkLi{
		my $id = shift;
		my $name = (split("li_", $id))[1];
		my $link = "css=#portlet_dialog li[id='$id']";
		
		ok($name, "name of link: $name");
		$sel->is_element_present_ok("$link span.portlet-linksOrganizeIcon");
		
		#check for proper 'a' element
		$sel->is_element_present_ok("$link a[href][target='_blank']", "a proper 'a href' found");
		my $linkText = $sel->get_text("$link a[href][target='_blank']");
		ok($linkText == $name, "link display text, found text: $linkText");
		
		#check for 'edit'
		$sel->is_element_present_ok("$link span.editLink_live", "edit link found");
		ok($sel->get_text("$link span.editLink_live") eq "edit", "edit link span is named properly");
		
		#check for 'delete'
		$sel->is_element_present_ok("$link span.deleteLink_live", "delete link found");
		ok($sel->get_text("$link span.deleteLink_live") eq "delete", "delete link span is named properly");
	}
	
	#check the li item of each link
	for(my $i = 0, $i < $numOfLinks, $i++){
		checkLi($sel->get_attribute("$container ul#portletUserLinks_clone li:eq($i)\@id"));
	}
	
	#check the buttons
	$module->checkNumOfPortletDialogButtons(2);
	$module->checkPortletDialogButtonName(0, 'save');
	$module->checkPortletDialogButtonName(1, 'cancel');
	
	#cancel, close dialog
	$module->clickPortletDialogButton(1);
	ok(!$module->isPortletDialogOpen(), "dialog closed when using cancel button");
});

#============================================================
# Check edit functionality of 'edit links'
#  prereq: at least one custom link present
#============================================================
$module->test("Edit links - edit functionality" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	#click edit links
	my $editLinksButton = "css=div[portlettype='links'] button:eq(1) span";
	$sel->click($editLinksButton);
	$module->waitForDialog();
	
	my $container = "css=#portlet_dialog";
	my $liX = "//div[\@id='portlet_dialog']//ul[\@id='portletUserLinks_clone']/li";
	my $numOfLinks = $sel->get_xpath_count($liX);
	
	sub changeValues{
		my $id = shift;
		my $newName = shift;
		my $newUrl = shift;
		
		my $link = "css=#portlet_dialog li[id='$id']";
		my $name = $sel->get_text("$link a[href][target='_blank']");
		my $url = $sel->get_attribute("$link a\@href");
		
		$sel->click_ok("$link span.editLink_live", "click 'edit'");
		my $editLinkText = "$link input[name='editLinkText']";
		my $editLinkUrl = "$link input[name='editLinkUrl']";
		
		#check for input boxes and sanity checks
		$sel->is_element_present_ok($editLinkText, "found link text input box");
		$sel->is_element_present_ok($editLinkUrl, "found link url input box");
		ok($sel->get_value($editLinkText) == $name, "link text is what we expect");
		ok($sel->get_value($editLinkUrl) == $name, "link url is what we expect");
		
		$sel->type_ok($editLinkText, $newName);
		$sel->type_ok($editLinkUrl, $newUrl);		
	}
	
	sub assertChangedValues{
		my $name = shift;
		my $url = shift;
		my $item = "css=ul#portletUserLinks li[id=\"li_$name\"]";
		
		$sel->is_element_present_ok($item, "found changed link");
		ok($sel->get_text("$item a") == $name, "changed text found");
		ok($sel->get_attribute("$item a\@href") == $url, "changed url found");
	}
	
	#edit one link and save
	changeValues($sel->get_attribute("$container ul#portletUserLinks_clone li:eq(0)\@id"), "LC Web", "https://lc.llnl.gov");
	
	$module->clickPortletDialogButton(0);
	$module->waitForAJAX();
	
	assertChangedValues("LC Web", "https://lc.llnl.gov");
	
	$sel->click($editLinksButton);
	$module->waitForDialog();
	ok($sel->get_xpath_count($liX) == $numOfLinks, "number of links did not change");
	
	#edit a random number of links and save
	my $randNum = int(rand($numOfLinks));
	
	for(my $i = 0; $i < $randNum; $i++){
		changeValues($sel->get_attribute("$container ul#portletUserLinks_clone li:eq($i)\@id"), "LC - $i", "https://lc.llnl.gov/$1");
	}
	
	$module->clickPortletDialogButton(0);
	$module->waitForAJAX();
	
	for(my $i = 1; $i < $randNum; $i++){
		assertChangedValues("LC - $i", "https://lc.llnl.gov/$1");		
	}
});

#============================================================
# Check organize functionality of 'edit links'
#  prereq: more than one custom link present
#============================================================
$module->test("Edit links - organize functionality" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	#click edit links
	my $portlet = "css=div[portlettype='links']";	
	my $container = "css=#portlet_dialog";
	
	my $liX = "//div[\@portlettype='links']//ul[\@id='portletUserLinks']/li";
	my $numOfLinks = $sel->get_xpath_count($liX);	
	
	if($numOfLinks <= 1){ fail("number of links less than required"); }
	
	my $editLinksButton = "$portlet button:eq(1) span";
	$sel->click($editLinksButton);
	$module->waitForDialog();
	
	my $dliX = "//div[\@id='portlet_dialog']//ul[\@id='portletUserLinks_clone']/li";
	ok($sel->get_xpath_count($dliX) == $numOfLinks, "num of links match");
	
	for(my $i = 0; $i < 5; $i++){
		my ($iIndex, $fIndex);
		while($iIndex == $fIndex){
			$iIndex = int(rand($numOfLinks));
			$fIndex = int(rand($numOfLinks));
		}
		$sel->drag_and_drop_to_object_ok("$container ul#portletUserLinks_clone li:eq($iIndex)", "$container ul#portletUserLinks_clone li:eq($fIndex)", "moved link $iIndex to $fIndex");
	}
	
	my @fLinks = ();
	
	for(my $i = 0; $i < $numOfLinks; $i++){
		push(@fLinks, $sel->get_attribute("$container ul#portletUserLinks_clone li:eq($i)\@id"));
	}
	
	$module->clickPortletDialogButton(0);
	$module->waitForAJAX();
	
	for(my $i = 0; $i < $numOfLinks; $i++){
		ok($sel->get_attribute("$portlet ul#portletUserLinks li:eq($i)\@id") == $fLinks[$i], "link order correct for index $i");
	}
});

#============================================================
# Check delete functionality of 'edit links'
#  prereq: at least one custom link present
#============================================================
$module->test("Edit links - delete functionality" => sub { 
	#open mylc
	$module->openMylcDashboard();
	
	my $portlet = "css=div[portlettype='links']";
	my $editLinksButton = "$portlet button:eq(1) span";
	
	#click edit links
	$sel->click($editLinksButton);
	$module->waitForDialog();
	
	my $container = "css=#portlet_dialog";
	my $numOfLinks = $sel->get_xpath_count("//div[\@id='portlet_dialog']//ul[\@id='portletUserLinks_clone']/li");
	
	sub deleteLink{
		my $id = shift;
		my $link = "css=#portlet_dialog li[id='$id']";
		
		$sel->is_element_present_ok($link, "link is present in the list");
		$sel->click_ok("$link span.deleteLink_live", "clicking 'delete'");
		ok(!$sel->is_element_present($link), "link is not present in the list");
	}
	
	#delete all links
	for(my $i = 0; $i < $numOfLinks; $i++){
		deleteLink($sel->get_attribute("$container ul#portletUserLinks_clone li:eq(0)\@id"));
	}
	
	#save, close dialog
	$module->clickPortletDialogButton(0);
	$module->waitForAJAX();
	ok(!$module->isPortletDialogOpen(), "dialog closed when using save button");
	
	#check that for no custom links
	ok($sel->get_xpath_count("//div[\@id='portlet_dialog']//ul[\@id='portletUserLinks_clone']/li") == 0, "all links deleted successfully");
	
	#reload dashboard and check again
	$module->openMylcDashboard();
	ok($sel->get_xpath_count("//div[\@id='portlet_dialog']//ul[\@id='portletUserLinks_clone']/li") == 0, "all links deleted successfully");
});

undef($sel);
undef($module);
1;