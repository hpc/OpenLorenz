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


#
# Simple script for assisting Lorenz with getting remote dir listings, running cmds, ...
#
# Jeff Long, 11/1/2010
#
BEGIN {
	require '/usr/global/tools/lorenz/lib/lorenz.pl';
}

use strict;
use JSON;
use Lorenz::Server;
use Lorenz::Config;
use POSIX qw(strftime);
use File::Path;
use File::Basename;
use Sys::Hostname;

my %conf = Lorenz::Config::getLorenzConfig();
my $dir = "";
my $storageDir = "";
my $cmd = "";
my $statPath = "";
my $debug = 0;
my $errstring = "";
my $format = "json";
my $timeout = 0;

while (@ARGV) {
	$_ = shift;
	if (/^-h$/ or /^-help$/) {
		Usage();
	} elsif (/^-t$/) {
		$format = "text";
	} elsif (/^-timeout$/) {
		$timeout = shift;
	} elsif (/^list$/) {
		$dir = shift || $ENV{HOME};
	} elsif (/^liststorage$/) {
		$storageDir = shift;
	} elsif (/^run$/) {
		$cmd = shift || Usage("$0: Missing argument to run option");
	} elsif (/^stat$/) {
		$statPath = shift || Usage("$0: Missing argument to stat option");
	} else {
		Usage("$0: Unknown or improperly used argument: '$_'");
	}
}

if ($dir or $storageDir) {
	#--------------------------------------------------
	# Generate dir listing
	#--------------------------------------------------
	my $out = "";
	my @listing=();

	if ($dir) {
		# dir must be absolute
		$dir = "/$dir" if ($dir !~ m,^/,);
		@listing = getLongDirList ($dir);
	} elsif ($storageDir) {
		@listing = getStorageLongDirList ($storageDir);
	}
	
	if ($format eq "text") {
		print @listing;
		exit 0;
	}

	my $n=0;
	foreach (@listing) {
		chomp;
		my ($perms,$user,$group,$size,$date,$name,$linkname,$linktype,$junk) = split /\|/, $_, 9;
		$out .= ",\n" if ($n++ > 0);
		$out .=<<EOF;
		{ "perms": "$perms", "user": "$user", "group": "$group", "size": $size, 
		  "date": "$date", "name": "$name", "linkname": "$linkname", "linktype": "$linktype" }
EOF
		}

	print "[ " . $out . " ]\n";

} elsif ($statPath) {
	my %stat = (
				type => '',
				readable => 0,
				writeable => 0,
				executable => 0,
				exists => 0,
				size => 0
				);
	
	if (-e $statPath) {		
		$stat{exists} = 1;
		
		$stat{readable} = 1 if -r $statPath;
		
		$stat{writeable} = 1 if -w $statPath;
		
		$stat{executable} = 1 if -x $statPath;
		
		$stat{type} = -f $statPath ? 'file' : (-d $statPath ? 'dir' : '');
		
		$stat{size} = -s $statPath;	
	}
	
	print to_json(wrapout(\%stat));
} elsif ($cmd) {
	#--------------------------------------------------
	# Run arbitrary command
	#--------------------------------------------------

	my ($stdout,$stderr,$status) = Lorenz::Server::runCommand2("localhost", $cmd, $timeout);

	chomp $stdout;
	chomp $stderr;
	if ($status eq 0) {
		$status = STATUS_OK;
	} else {
		$status = STATUS_ERROR;
	}

	if ($format eq "text") {
		if ($stderr) {
			$stdout .= "\n$stderr";
		}
		print "$stdout\n";
	} else {
	
		my $host = hostname;

		my $obj = {
				   "command" => "$host: $cmd",
				   "command_out" => $stdout
				  };
		
		print to_json(wrapit($obj, $stderr, $status));
	}
}


exit 0;


#============================================================
# getLongDirList -- return extended directory list in special
#					easily parseable format.
#============================================================
sub getLongDirList {
	my $dir = shift;
	my @out=();
	my $file;

	# Don't need special escaping for directory paths
	$dir =~ s/\\//g;

	my ($perms,$user,$group,$size,$time,$file,$linktarget,$linktype);

	if (not -e "$dir") {

		if ($format eq "text") {
#			return "Error: Path does not exist: $dir\n";
			return "Error: noexist\n";
		} else {
			print to_json(wraperr("Path does not exist: $dir\n"));
			exit 1;
		}
		
	} elsif (-d "$dir") {
		if (not opendir(DIR, "$dir")) {
			if ($format eq "text") {
#				return "Error: Cannot open directory: $dir\n";
				return "Error: perms\n";
			} else {
				print to_json(wraperr("Can't opendir $dir : $!"));
				exit 1;
			}
		}
		
		while ( defined( $file = readdir(DIR) ) ) {
			
			next if ($file eq "." or $file eq "..");
			
			($perms,$user,$group,$size,$time,$file,$linktarget,$linktype) = getFileStats("$dir","$file");
			next if (not $perms || not $group);
			
			push @out, sprintf "%s|%s|%s|%d|%s|%s|%s|%s|\n",
			$perms,$user,$group,$size,$time,$file,$linktarget,$linktype;
		}
	} else {
		# Not a dir
		$file = basename("$dir");
		$dir = dirname("$dir");
		($perms,$user,$group,$size,$time,$file,$linktarget,$linktype) = getFileStats("$dir","$file");
		if (not $perms || not $group) {
			if ($format eq "text") {
#				return "Error: Cannot stat $dir/$file";
				return "Error: stat";
			} else {
				print to_json(wraperr("Error stat'ing $dir/$file"));
				exit 1;
			}
		}
		
		push @out, sprintf "%s|%s|%s|%d|%s|%s|%s|%s|\n",
		$perms,$user,$group,$size,$time,$file,$linktarget,$linktype;
	}
	
	return @out;
}

#============================================================
# getStorageLongDirList -- return extended directory list in special
#			         	   easily parseable format.
#============================================================
sub getStorageLongDirList {
	my $dir = shift;
	
	my $cmd = "$conf{chopperCmd} ls -l hpss%storage:$dir";
	my $timeout = 30;
	my @out = ();

	my ($out,$err,$status) = runCommand2("localhost", $cmd, $timeout);
	if ($err) {
		print to_json(wraperr("Could not get storage listing: $err"));
		exit 1;
	}
	
	foreach my $line (split /\n/, $out) {
		my ($perms,$user,$group,$size,$day,$time,$file,$linktarget);
		($perms,$user,$group,$size,$day,$time,$file) = split /\s+/, $line, 7;
		if ($file  =~ /^(\S+) -> (\S+)$/) {
			$file = $1;
			$linktarget = $2;
		}
		# Strip off dir path and trailing / from file name
		if ($dir eq "/") {
			$file =~ s,^/,,;
		} else {
			$file =~ s,^$dir/,,;
		}
		$file =~ s,/$,,;
		my $date = "$day $time";

		push @out, sprintf "%s|%s|%s|%d|%s|%s|%s|\n",
		$perms,$user,$group,$size,$date,$file,$linktarget;
	}
	return @out;
}


sub getFileStats {
	my $dir = shift;
	my $file = shift | "";

	my $fullpath = $dir;
	$fullpath .= "/$file" if ($file);

	my ($dev, $ino, $mode, $nlink, $uid, $gid, $rdev, $size,
		$atime, $mtime, $ctime, $blksize, $blocks);
	my $filetype;

	if (-l "$fullpath") {
		($dev, $ino, $mode, $nlink, $uid, $gid, $rdev, $size,
		 $atime, $mtime, $ctime, $blksize, $blocks) = lstat(_);

		$filetype = "l";
	} else {
		($dev, $ino, $mode, $nlink, $uid, $gid, $rdev, $size,
		 $atime, $mtime, $ctime, $blksize, $blocks) = stat(_);

		$filetype=getFileType();
	}

	# If Lustre metadata is corrupted, ignore the file.
	return 0 if ($filetype eq "?" or not $ino);


	my $user = lookupUid($uid);
	my $group = lookupGid($gid);
	my $linktarget = ($filetype eq "l") ? readlink("$fullpath") : "";
	my $linktype = "";

	my $perms = convertOctalPermsToRwx($mode);

	$mode &= 0777;
	my $permissions = sprintf "%03o", $mode & 0777;

	my $tmp=$file;
	if ( ($tmp =~ tr/\|\x01-\x1F\x7F-\xFF//d) > 0 ) {
		# Filename contains "weird" chars. Encode.
		$file = "<%>" . encodeString($file);
	}
	if ($linktarget) {
		my $path = ($linktarget =~ m,^/,) ? $linktarget : "$dir/$linktarget";
		my $canonPath = Lorenz::Server::getCanonicalPath($path);
		$linktype = getFileType ($canonPath);
		
		$tmp = $linktarget;
		if ( ($tmp =~ tr/\!\x01-\x1F\x80-\xFF//d) > 0 ) {
			# Link target contains "weird" chars. Encode.
			$linktarget = "<%>" . encodeString($linktarget);
		}
	}

	my $time = strftime "%Y-%m-%d %T", localtime($mtime);
	
	return ($perms,$user,$group,$size,$time,$file,$linktarget,$linktype);

}

sub getFileType {
	# Assume special variable "_" defined by earlier stat
	if (-f _) {
		return "-";
	} elsif (-b _) {
		return "b";
	} elsif (-p _) {
		return "p";
	} elsif (-S _) {
		return "s";
	} elsif (-c _) {
		return "c";
	} elsif (-d _) {
		return "d";
	} else {
		return "?";
	}
}

my %uids=();
sub lookupUid {
	my $uid = shift;

	return $uids{$uid} if (defined $uids{$uid});
	
	my $user = getpwuid($uid);
	$user = $uid if (not $user);
	$uids{$uid} = $user;
	return $user;
}

my %gids=();
sub lookupGid {
	my $gid = shift;

	return $gids{$gid} if (defined $gids{$gid});
	
	my $group = getgrgid($gid);
	$group = $gid if (not $group);
	$gids{$gid} = $group;
	return $group;
}

sub encodeString {
	my $str = shift;
	my $out = "";
	foreach (split //, $str) {
		$out .= "%" . sprintf("%02x",ord($_));
	}
	return($out);
}

sub convertOctalPermsToRwx {
	my $perms = shift;
	my $info = "";

	if (($perms & 0xC000) == 0xC000) {
		# Socket
		$info = 's';
	} elsif (($perms & 0xA000) == 0xA000) {
		# Symbolic Link
		$info = 'l';
	} elsif (($perms & 0x8000) == 0x8000) {
		# Regular
		$info = '-';
	} elsif (($perms & 0x6000) == 0x6000) {
		# Block special
		$info = 'b';
	} elsif (($perms & 0x4000) == 0x4000) {
		# Directory
		$info = 'd';
	} elsif (($perms & 0x2000) == 0x2000) {
		# Character special
		$info = 'c';
	} elsif (($perms & 0x1000) == 0x1000) {
		# FIFO pipe
		$info = 'p';
	} else {
		# Unknown
		$info = 'u';
	}

	# Owner
	$info .= (($perms & 0x0100) ? 'r' : '-');
	$info .= (($perms & 0x0080) ? 'w' : '-');
	$info .= (($perms & 0x0040) ?
			  (($perms & 0x0800) ? 's' : 'x' ) :
			  (($perms & 0x0800) ? 'S' : '-'));

	# Group
	$info .= (($perms & 0x0020) ? 'r' : '-');
	$info .= (($perms & 0x0010) ? 'w' : '-');
	$info .= (($perms & 0x0008) ?
			  (($perms & 0x0400) ? 's' : 'x' ) :
			  (($perms & 0x0400) ? 'S' : '-'));

	# World
	$info .= (($perms & 0x0004) ? 'r' : '-');
	$info .= (($perms & 0x0002) ? 'w' : '-');
	$info .= (($perms & 0x0001) ?
			  (($perms & 0x0200) ? 't' : 'x' ) :
			  (($perms & 0x0200) ? 'T' : '-'));

	return $info;
}

sub getTmpDir {
	my $tmpDir = "/tmp/" . getUserName() . "/lorenz";

	if (not -d $tmpDir) {
		mkpath($tmpDir, 0, 0700);	
	}
	return $tmpDir;
}

sub getUserName {
	#	 if (defined($ENV{LOGNAME}) and $ENV{LOGNAME}) {
	#		return($ENV{LOGNAME});
	#	 } else {
	my @ret = getpwuid($>);
	return 0 if (not scalar(@ret));
	return($ret[0]);
	#	 }
}


sub Usage {
	my $msg=shift;

	my $err;

	if ($msg) {
		$err = "Error: $msg\n";
	}
	
	$err .= "Usage: $0 [-help] [list directory] [run \"command\"]\n";

	print to_json(wraperr("$err"));
	exit 1;
}
