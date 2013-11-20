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

#Filename: portletImport.cgi
#Author: Joel Martinez
#Date: Mar 3 2011
#Description: This page is responsible for returning all approved portlet extensions the user has permissions to read
BEGIN {
	require '/usr/global/tools/lorenz/lib/lorenz.pl';
} 

use strict;
use CGI qw(:standard);
use warnings;
use JSON;
use Data::Dumper;
use Lorenz::Simple;
use Fcntl ':mode';

my $lo = Lorenz::Simple->new();

my $approvedDir = $main::lorenzRootDir."/js/portlet/approved";
my $staffDir = $main::lorenzRootDir."/js/portlet/staff";
my $portletDevDir = $lo->getUserLorenzDir()."/portletDev";
my $js = '';
my $visibleString = '';
my $dirToNamespace = {
	staff => 'lorenzStaff',
	custom => 'lorenzCustom'
};

#If no portletDev directory create it
if(!-e $portletDevDir){
	mkdir($portletDevDir);
}

if(param('request')){
	my $request = param('request');
	
	if($request eq 'getAllCustomPortlets'){
		getPortletCode();
	}
	else{
		error("Not a supported request.");
	}
}
else{
	error('Didn\'t include request parameter');
}

sub getPortletCode{
	my @approved = getFiles($approvedDir, 'custom');	
	my @custom = getFiles($portletDevDir, 'custom');
	my @staff = getFiles($staffDir, 'staff');
	
	parseFiles(\@approved);
	parseFiles(\@custom);
	parseFiles(\@staff);
	
	success('application/javascript', $js.$visibleString);	
}

sub getFiles{
	my ($dir, $type) = @_;
	
	my @list = ();
	
	opendir(DIR, $dir);
	my @files = readdir DIR;
	close DIR;
	
	foreach my $file (@files){
		my $fullPath = "$dir/$file";
        
        #if file exists, is readable, and a js extension
        if(-e $fullPath && -r $fullPath && $fullPath =~ /\.js$/){
			#just the name of the file without extension
            $file =~ s/^(.*)\.js$/$1/g;
			
			appendToVisibleString($file, $fullPath, $type);
			
			push(@list, $fullPath);
		}
	}
	
	return @list;
}

#This will automatically look at the file and determine who has read permissions.  If world doesn't have read perms
#then we create a JS string that forces the widgets prototype "visibleBy" option to be the owner (by default, still overwriteable when initiating a portlet)
#.  This way we show this in the portlet when rendered
sub appendToVisibleString{
	my ($name, $path, $type) = @_;
	
	my $namespace = $dirToNamespace->{$type} || 'lorenzCustom';
	
	my $visibleBy = getVisibleBy($path);
	
	if($visibleBy){
		$visibleString .= '$.'.$namespace.'.'.$name.'.prototype.options.visibleBy = "'.$visibleBy.'";';
	}
}

sub getVisibleBy{
	my $path = shift;

	my ($dev,$ino,$mode,$nlink,$uid,$gid,$rdev,$size,$atime,$mtime,$ctime,$blksize,$blocks) = stat($path);
	
	my $userRead = ($mode & S_IRUSR) >> 6;
	my $groupRead = ($mode & S_IRGRP) >> 3;
	my $otherRead = $mode & S_IROTH;
	my $visibleBy = '';
	
	#not world readable
	if($otherRead == 0){
		#group readable
		if($groupRead != 0){
			#group name
			$visibleBy = (getgrgid($gid))[0];
		}
		#user readable
		elsif($userRead != 0){
			#user name
			$visibleBy = (getpwuid($uid))[0];
		}
	}
	
	return $visibleBy;
}

sub parseFiles{
    my ($files) = @_;
	
    foreach my $file (@$files){
		open(IN, "<$file");
		my @lines = <IN>;
		close IN;
		
		$js .= join('', @lines);
    }
}

sub success{
	my ($contentType, $data) = @_;
	
	print header($contentType);
	print $data;
	exit;
}

sub error{
	my ($err) = @_;
	
	print header('text/html', '400 Bad Request');
	print $err;
	exit;
}
