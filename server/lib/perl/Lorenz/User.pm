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

package Lorenz::User;

###########################################################################
# $URL: https://sourceforge.llnl.gov/svn/repos/lorenz/trunk/server/lib/perl/Lorenz/Cache.pm $
# $Author: long6 $
# $Date: 2011-03-02 13:07:13 -0800 (Wed, 02 Mar 2011) $
# $Rev: 162 $
###########################################################################


#===============================================================================
#									User.pm
#-------------------------------------------------------------------------------
#  Purpose:		User-centric methods (native)
#  Author:		Jeff Long
#  Notes:
#
#===============================================================================

use strict;
use Lorenz::Base;
use Lorenz::Host;
use Lorenz::System;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my %conf = Lorenz::Config::getLorenzConfig();

#
# $user = getUsername()
#

sub getUsername {
	my $self = shift;
	my @ret = getpwuid($>);
	return 0 if (not scalar(@ret));
	return($ret[0]);
}


#
# @users = getAllUserInfo()  -- Returns array of user info objects
#
sub getAllUserInfo{
	my $self = shift;
	my @users = ();
	
	# Stub
	my $out = "user1,user1,User One,1\nuser2,user2,User Two,1";

	foreach my $line (split /\n/, $out) {
		chomp $line;
		
		my ($lcName, $oun, $fullName, $primary) = split(',', $line);
		
		push(@users, {value => $lcName, label => $fullName, oun => $oun, primary => $primary});
	}
	return @users;
}

# @users = listAllUsers()

sub listAllUsers {
	my ($self,$args) = @_;

	# Stub
	my @h = qw / user1 user2 /;

	return (sort @h);
}

#
#  %info = getUserInfo(user) -- Return the user info for a given user
#

sub getUserInfo {
	my $self = shift;
	my $user = shift || $self->getUsername();

	my $info = { 'field1' => "value1",
				 'field2' => "value2",
				 'uid' => $user };
	
	return %$info;
}

#
# @h = getUserHosts()
#
sub getUserHosts {
	my $self = shift;
	my $user = shift || $self->getUsername();

	my @hosts = qw / hosta hostb /;
	return sort @hosts;
}


#
# @h = getUserSshHosts()
#
sub getUserSshHosts {
	my $self = shift;
	my $username = shift;

	my @hosts = qw / hosta hostb /;
	return sort @hosts;
}

#======================================================================
#   Groups support
#======================================================================

#
# @grps = getUserGroups(user)
#
sub getUserGroups {
	my $self = shift;
	my $user = shift;

	my $groups = { 'groupa' => 8001,
				   'groupb' => 8002 };
	return %$groups;
}

# @mems = getGroupMembers(group)

sub getGroupMembers {
	my $self = shift;
	my $group = shift;

	my @gmem= qw / user1 user2 /;
}

# $href = getGroupInfo(group)
sub getGroupInfo {
	my ($self,$group) = @_;

	my @gmem = qw / user1 user2 /;
	
	my $obj = {
		'gname'	  => $group,
		'gid'	  => 8000,
		'coordinators' => "user1",
		'approvers' => "user2",
		'members' => [@gmem]
		};

	return $obj;
}

# @grps = getAllGroups()
sub getAllGroups {
	my $self = shift;

	my @g = qw / groupa groupb /;

	return @g;
}


#======================================================================
#   File Transfer support
#======================================================================

#
# @h = getUserFileTransferHostsInfo() -- Return object array
#
sub getUserFileTransferHostsInfo {
	my ($self,$username) = @_;

	my %userInfo = $self->getUserInfo($username);
	my @objs=();

	# Ssh hosts can be transferred to/from
	my $defHost = "hosta";
	my @hosts   = qw / hosta hostb /;

	foreach my $host (@hosts) {

		my @j = $self->getUserJumpdirs($host, $username);
		
		push @objs, { 'host'    => $host,
					  'homedir' => $self->getUserHomeDir($username),
					  'jumpdirs' => \@j,
					  'default' => ($host eq $defHost) ? 1: 0 };
	}

	return @objs;
}

#
# @dirs = getUserJumpdirs(host, user)
#
sub getUserJumpdirs {
	my ($self,$host,$user) = @_;
	return () if $host eq "storage";

	return qw ( /scratch/$user /home/$user );
}

#=================================================================================
#  dir = getUserHomeDirOnHost(host,user)   - Return user's home dir for given host
#=================================================================================

#
# $homedir = getUserHomeDirOnHost(host, user)
#
sub getUserHomeDirOnHost {
	my $self = shift;
	my $host = shift || return "";
	my $user = shift || return "";

	return "/home/$user";
}


#=================================================================================
#  getUserHomeDir - Return user's NFS-mounted homedir on the web server.
#
#  Note: User home dirs are not included in the server's passwd file, hence the 
#  extra layer of indirection to get this info.
#
#=================================================================================

#
# $homedir = getUserHomeDir(user)
#
sub getUserHomeDir {
	my $self = shift;
	my $username = shift || return 0;

	return "/home/$username";
}

#=================================================================================
#  getUserLorenzDir - Return user-specific Lorenz project dir (typically ~/.lorenz)
#					  on the web server)
#
#  Note: This will create the directory if it doesn't already exist.
#
#=================================================================================

#
# $dir = getUserLorenzDir(user)
#
sub getUserLorenzDir {
	my $self = shift;
	my $username = shift || $self->getUsername();

	my $homedir = $self->getUserHomeDir($username) || return 0;

	my $lorenzdir = "$homedir/.lorenz";

#	File::Path::mkpath($lorenzdir, 0, 0700);
#	return $lorenzdir if (-d $lorenzdir);
#	return 0;

	return $lorenzdir;
}

#
# $dir = getUserLorenzTmpDir(user)
#
sub getUserLorenzTmpDir{
	my $self = shift;
	my $username = shift || $self->getUsername();
	
	my $tmpPath = $self->getUserLorenzDir()."/tmp";
	
	if(!-e $tmpPath){
#		File::Path::mkpath($tmpPath, 0, 0700);
	}
	
	return $tmpPath;
}

#
# clearUserLorenzTmpDir(user)
#
sub clearUserLorenzTmpDir {
	my $self = shift;
	my $dir = $self->getUserLorenzTmpDir();
	
	if(-e $dir && $dir =~ /\.lorenz/){
		#delete files older than 24 hours in tmp dir to clean up
		my $out = `find $dir/* -mmin +1440 -exec /bin/rm -rf {} \\; 2>/dev/null 1>\&2`;
	}
}

#
# debugLog(msg) -- Write msg to debug log in user's home dir
#

sub debugLog {
	my $self = shift;
	my $msg = shift;
	
	my $home = $self->getUserHomeDir($self->getUsername());
	my $logf = "$home/lorenz.dbg";
	my $date = `date +%Y-%m-%d_%T`; chomp $date;
	
	open LOG, ">>$logf";
	print LOG "[$date]\n$msg\n";
	close LOG;
}


#
# $email = getUserEmail(user)
#
sub getUserEmail {
	my $self = shift;
	my $username = shift || $self->getUsername();

	return $username . '@mysite.com';
}


1;
