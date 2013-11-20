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
    # Number of levels down in the hierarchy this file is from the Lorenz root
    my $levelsFromLorenzRoot = 4;
    
    my $pathToInit = '../' x $levelsFromLorenzRoot . "init.pl";
    require $pathToInit;
    lorenzInit($levelsFromLorenzRoot);

}

use strict;
use HTML::Entities ();
use URI::Escape;
use Lorenz::Server;
use Lorenz::REST::File;
use File::Basename;
use CGI qw(:standard);
use JSON;

my $oFile = Lorenz::REST::File->new();

if(param('deletePath')){
	my $host = param('host') || ajaxError("A host is required to delete");
	my $path = param('path') || ajaxError("A path is required to delete");
	
	$path =~ s/ /\\ /g;
	
	my ($out, $err, $status) = $oFile->removeFile($host, $path);
		
	if($status != 0){
		ajaxError('Failed deleting path: '.$path.', '.$err.' '.$out);
	}
	else{
		ajaxSuccess({out=> $out, err=>$err, status=>$status});
	}
}
elsif(param('newFileFolder')){
	my $host = param('host') || ajaxError("A host is required to create");
	my $path = param('path') || ajaxError("A path is required to create");
	my $type = param('type') || 'file';
		
	$path =~ s/ /\\ /g;
	
	my ($out, $err, $status) = $oFile->newFileOrFolder($host, $path, $type);
	
	if($status != 0){
		ajaxError('Failed making '.$type.': '.$path.', '.$err.' '.$out);
	}
	else{
		ajaxSuccess({out=> $out, err=>$err, status=>$status});
	}
}
elsif(param('renameFile')){
	my $host = param('host') || ajaxError("A host is required to move");		
	my $from = param('from') || ajaxError("A from path is required to rename"); #singular from when doing rename
	my $to = param('to') || ajaxError("A to path is required to move");	
	my $out;
	my $err;
	my $status;	
	
	$from =~ s/ /\\ /g;		
	$to =~ s/ /\\ /g;
	
	($out, $err, $status) = $oFile->moveFile($host, [$from], $to);

	if($status != 0){
		ajaxError('Failed renaming: '.$from.' to '.$to.', '.$err.' '.$out);
	}
	else{
		ajaxSuccess({out=> $out, err=>$err, status=>$status});
	}
}
elsif(param('moveFile')){
	my $host = param('host') || ajaxError("A host is required to move");	
	param('from[]') || ajaxError("A from path is required to move");	
	my $to = param('to') || ajaxError("A to path is required to move");
	my $type = param('type') || 'copy';
	my $out;
	my $err;
	my $status;
	#my $fName = basename($from);
	my $fromString = '';
	my @from = ();
	foreach (param('from[]')){
		$_ =~ s/ /\\ /g;		
		push(@from, $_);
	}
	
	$to =~ s/ /\\ /g;
	
	if($type eq 'cut'){
		#only be explicit in move if its a cut
		#$to = $to =~ /^.*\/$/ ? $to.$fName : $to.'/'.$fName if $type eq 'cut';
		
		($out, $err, $status) = $oFile->moveFile($host, \@from, $to);
	}
	else{
		($out, $err, $status) = $oFile->copyFile($host, \@from, $to);
	}
		
	if($status != 0){
		ajaxError('Failed '.$type.': '.$fromString.' to '.$to.', '.$err.' '.$out);
	}
	else{
		ajaxSuccess({out=> $out, err=>$err, status=>$status});
	}
}
elsif(param('getInfo')){
	my $host = param('host') || ajaxError("A host is required to get info");
	my $path = param('path') || ajaxError("A path is required to get info");
	
	$path =~ s/ /\\ /g;
	
	my ($out, $err, $status) = $oFile->getFileInfo($host, $path);
	
	if($status != 0){
		ajaxError("Failed getting info for $path: $err");
	}
	else{
		ajaxSuccess({out=> $out, err=>$err, status=>$status});
	}
}
else{
	my $host = param('host') || "";
	my $pSort = param('sort');
	my $sorted = defined $pSort && ($pSort eq 'asc' || $pSort eq 'desc') ? $pSort : 'asc';
	my $fullDir = (param('dir') && param('dir') ne '~' && param('dir') ne '$HOME') ? param('dir') : Lorenz::Server::getHomeDir($host, $ENV{REMOTE_USER});
	
	$fullDir =~ s,//,/,g;  # Remove duplicate slashes...
	if ($fullDir ne "/") { # ...and trailing slash
		$fullDir =~ s,/$,,;
	}
	
	my ($list,$total,$status) = getDirListing ($host, $fullDir);
	
	printAndExit($status, $fullDir, $host) if ($status);
	printAndExit('empty', $fullDir, $host) if (not $list);
	printAndExit('empty', $fullDir, $host) if $total == 0;

	my $tree = '';
	
	$tree .= "<ul class=\"fileTree-tree\" style=\"display: none;\">";
	
	my @keys = $sorted eq 'asc' ? sort keys %$list : reverse sort keys %$list;	
	
	foreach my $file (@keys){
		my $type = $list->{$file};
		
		if($type eq 'folder'){
			$tree .= '<li class="directory collapsed"><a href="#" rel="'. 
				&HTML::Entities::encode("$fullDir/$file").'/">'. 
				&HTML::Entities::encode($file).'</a></li>';
		}
		else{
			my $ext = '';
			
			if($file =~ /\.(.+)$/){
				$ext = $1;
			}
			
			$tree .= '<li class="file ext_'.$ext.'"><a href="#" rel="'. 
				&HTML::Entities::encode("$fullDir/$file").'">'.
				&HTML::Entities::encode($file).'</a></li>';
		}
	}

	$tree .= "</ul>\n";
	
	printAndExit($tree, $fullDir, $host);
}

sub ajaxSuccess{
	my ($data) = @_;
	print "Content-type: application/json\n\n";
	print to_json({
		status => "OK",
		data => $data
	});
	exit;
}

sub ajaxError{
	my ($err) = @_;
	print "Content-type: application/json\n\n";
	print to_json({
		status => "ERROR",
		error => $err
	});
	exit;
}

sub printAndExit{
	my ($data, $dir, $host) = @_;
	print "Content-type: application/json\n\n";
	print to_json({data => $data, dir => $dir, host=>$host});
	exit;
}

sub getDirListing {
    my $host = shift;
    my $dir = shift;

    my %fileOrFolder;
    my $total = 0;

    if (not $host and -e $dir) {
		# Perform directory listing on web server itself
		$host = "localhost";
    } elsif (not $host) {
		$host = getUserDefaultHost();
    }
    
	$dir =~ s/ /\\\\ /g;
	
    my @listing = Lorenz::Server::getDirectoryList($host, $dir, 1);
	
	my $status = shift @listing;
	
	if(!$status){
		foreach (@listing) {
			chomp;
			my ($perms,$user,$group,$size,$date,$name,$linkname,$linktype,$junk) = split /\|/, $_, 9;
			
			next if $name eq '.' or $name eq '..' or (!param('showHidden') && $name =~ /^\./);
			
			if($name =~ /^<%>/){
				$name =~ s/^<%>//g;
				
				$name = decodeString($name);
			}
			
			if($linktype){
				if($linktype eq 'd'){
					$fileOrFolder{$name} = 'folder';
					$total++;
				}
				else{
					$fileOrFolder{$name} = 'file';
					$total++;
				}
			}
			elsif ($perms =~ /^d/) {
				$fileOrFolder{$name} = 'folder';
				$total++;
			} elsif ($perms =~ /^\-/ or $perms =~ /^l/) {
				$fileOrFolder{$name} = 'file';
				$total++;
			}
		}
	}
	else{
		$status =~ s/Error:\s(.*)/$1/g;
		$status =~ s/\n//g;
	}
	
    return (\%fileOrFolder, $total, $status);
}

sub decodeString {
	$_ = shift;
	
	s/%(c.)%(..)/pack('U0C*', hex($1), hex($2))/eg;  # Convert extended ASCII into unicode
	s/%(..)/pack('C', hex($1))/eg; # Convert everything else into unsignedchar
	
	return($_);
}
