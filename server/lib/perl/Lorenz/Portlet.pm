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

package Lorenz::Portlet;

#===============================================================================
#					Portlet.pm
#-------------------------------------------------------------------------------
#  Purpose:	Methods related to portlet access (native)
#  Author:	Jeff Long
#  Notes:
#===============================================================================

use strict;
use Fcntl ':mode';
use Lorenz::Base;
use Lorenz::System;
use Lorenz::Util;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my $approvedDir = $main::lorenzRootDir."/js/portlet/approved";
my $staffDir = $main::lorenzRootDir."/js/portlet/staff";
my $portletDevDir = Lorenz::User->getUserLorenzDir()."/portletDev";
my $js = '';
my $css = '';
my $visibleString = '';
my $dirToNamespace = {
	staff => 'lorenzStaff',
	custom => 'lorenzCustom'
};

my %conf     = Lorenz::Config::getLorenzConfig();
my $pConfDir = Lorenz::User->getUserLorenzDir().'/store/portletConf';

# (href,err) = getAllPortletConf()

sub getAllPortletConf{
	my $self = shift;

    my %portletConf = ();
    
    if(-e $pConfDir){
        opendir(DIR, $pConfDir) || return ("", 'Couldnt open users portletConf directory. '.$!);
        while(my $portletType = readdir(DIR)){        
            next if $portletType =~ /^\./;
            
            my $confDir = $pConfDir.'/'.$portletType;        
            
            if(-d $confDir && -e $confDir){
                opendir(CONF, $confDir) || return ("", 'Couldnt open users portlet specific conf dir. '.$!);
             
                while(my $f = readdir(CONF)){
                    next if $f =~ /^\./;
        
                    my $confFile = $confDir.'/'.$f;
                    
                    if(-f $confFile && -e $confFile && $f =~ /Conf$/){
                        open(IN, '<'.$confFile) || return ("", 'Couldnt open portlet conf file. '.$!);
                        my $conf = <IN>;
                        close IN; 
                        
                        $portletConf{portletConf}->{$portletType} = $conf;
                    }
                }
                
                close CONF;
            }
        }
        closedir DIR;
    }
    
    $self->_getPortletPreInit(\%portletConf);
    
    $portletConf{network} = $conf{network};
    $portletConf{lcZone} = $conf{lc_zone};
    
    return(\%portletConf, "");    
}

sub _getPortletPreInit{
	my ($self, $pConf) = @_;
    
    my $visFile = $pConfDir.'/portletVisibility';
    my $arrangementFile = $pConfDir.'/portletArrangement';
    my $autoRefreshFile = $pConfDir.'/portletAutoRefresh';
    
    if(-e $autoRefreshFile){
        open(IN, '<'.$autoRefreshFile) || return ("", 'Couldnt open autoRefreshFile conf file. '.$!);
        my $af = <IN>;
        close IN;
        
        $pConf->{autoRefresh} = $af;
    }
    
    if(-e $visFile){
        open(IN, '<'.$visFile) || return ("", 'Couldnt open vis conf file. '.$!);
        my $vis = <IN>;
        close IN;
        
        $pConf->{visibility} = $vis;
    }
    
    if(-e $arrangementFile){
        open(IN, '<'.$arrangementFile) || return ("", 'Couldnt open arrangement conf file. '.$!);
        my $arr = <IN>;
        close IN;
        
        $pConf->{arrangement} = $arr;
    }    
}

# jsString = getCustomPortlets()

sub getCustomPortlets{
    my ($self) = @_;
    
    #If no portletDev directory create it
    if(!-e $portletDevDir){
        mkdir($portletDevDir);
    }
    
	my @approved = $self->_getFiles($approvedDir, 'custom');	
	my @custom = $self->_getFiles($portletDevDir, 'custom');
	my @staff = $self->_getFiles($staffDir, 'staff');
	
	$self->_parseFiles(\@approved);
	$self->_parseFiles(\@custom);
	$self->_parseFiles(\@staff);

	return $js . $visibleString;
}

# cssString = getCustomPortletsCss()
#
# Pre-condition: must have already called getCustomPortlets

sub getCustomPortletsCss{
	my ($self) = @_;

	return $css;
}

sub _getFiles{
	my ($self, $dir, $type) = @_;
	
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
			
			$self->_appendToVisibleString($file, $fullPath, $type);
			
			push(@list, $fullPath);
		}
	}
	
	return @list;
}

#This will automatically look at the file and determine who has read permissions.  If world doesn't have read perms
#then we create a JS string that forces the widgets prototype "visibleBy" option to be the owner (by default, still overwriteable when initiating a portlet)
#.  This way we show this in the portlet when rendered
sub _appendToVisibleString{
	my ($self, $name, $path, $type) = @_;
	
	my $namespace = $dirToNamespace->{$type} || 'lorenzCustom';
	
	my $visibleBy = $self->_getVisibleBy($path);
	
	if($visibleBy){
		$visibleString .= '$.'.$namespace.'.'.$name.'.prototype.options.visibleBy = "'.$visibleBy.'";';
	}
}

sub _getVisibleBy{
	my ($self,$path) = @_;

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

sub _parseFiles{
    my ($self,$files) = @_;
	
    foreach my $file (@$files){
		open(IN, "<$file");
		my @lines = <IN>;
		close IN;
		
		$js .= join('', @lines);

		my $cssFile = $file;
		if($cssFile =~ s/\.js$/\.css/ && -e $cssFile){
			open(IN, "<$cssFile");
			@lines = <IN>;
			close IN;
			
			$css .= join('', @lines);
		}
    }
}

1;

