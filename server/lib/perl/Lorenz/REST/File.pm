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

package Lorenz::REST::File;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################

#===============================================================================
#									File.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling file-related Lorenz REST calls.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use vars qw(@ISA);
use JSON;
use MIME::Types;
use File::Basename;
use Lorenz::Config;
use Lorenz::Lftp;
use Lorenz::System;
use Lorenz::Util;
use Lorenz::TempFile;
use Lorenz::REST::Host;
use Lorenz::REST::RESTHandler;
use URI::Escape;

@ISA = ("Lorenz::REST::RESTHandler");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();

#--------------------------------------------------


#======================================================================
#  /file/[host]/[path]  [GET] -- get dir list, file contents, or file stats -- based on view parameter
#======================================================================

sub get {
	my ($self,$args) = @_;

	if (not defined $args->{host} or not defined $args->{path}) {
		return ($self->preperr("host or path not defined"));
	}

	if (exists $args->{view} and $args->{view} eq "read") {
		$self->displayFileContents($args->{host}, $args->{path}, $args);
	} elsif (exists $args->{view} and $args->{view} eq "stat") {
		$self->displayStatListing($args->{host}, $args->{path}, $args);
	} else {
		$self->displayDirectoryListing($args->{host}, $args->{path}, $args);
	}
}

#======================================================================
#  /file/[host]/[path] PUT -- create file
#======================================================================

sub put {
	my ($self,$args) = @_;

	if (not defined $args->{host} or not defined $args->{path}) {
		return ($self->preperr("host or path not defined"));
	}
	
	my $host = $args->{host};

	return $self->preperr("$args->{host}:$args->{path} is not an approved host:path combo")
		unless (Lorenz::Util->isApprovedPath($args->{host},$args->{path}));

	my @data = <STDIN>;

	my $tmp = Lorenz::TempFile->new();
	my $tmpPath = $tmp->make("tmp.file.$$", join '', @data);

	my ($out,$err,$status) = Lorenz::System->runCommand2($args->{host}, "/bin/mv $tmpPath \"$args->{path}\"");

	return $self->prepit ($out, $err, $status);
}

#======================================================================
#  /file/[host]/[path]?view=read -- get contents of given path on given host
#======================================================================

sub displayFileContents {
	my ($self,$host,$path,$args) = @_;
	my $format = $args->{format} || "auto";
	my $out = "";
	my $mime = "";

	return $self->preperr("$host:$path is not an approved host:path combo")
		unless (Lorenz::Util->isApprovedPath($host,$path));

	if ($format eq "auto") {
		# Pick mime type based on file extension
		my $mimetypes = MIME::Types->new;
		$mime = $mimetypes->mimeTypeOf($path) || "application/octet-stream";
	} elsif ($format =~ m,^[a-zA-Z]+/[a-zA-Z0-9\-]+$,) {
		# Caller provided their own mime type
		$mime = $format;
	} elsif ($format eq "binary") {
		# Shortcut for binary mode
		$mime = "application/octet-stream";
	}

	if ($args->{debug}) {
		warn "File::displayFileContents] getting contents of \"$path\" on \"$host\"\n";
	}

	my ($out,$err,$status);

	# ...
}

#======================================================================
#  /file/[host]/[path]?view=stat -- get statistics about a given file/dir on a host
#======================================================================
sub displayStatListing{
	my ($self, $host, $path, $args) = @_;

	return $self->preperr("$host:$path is not an approved host:path combo")
		unless (Lorenz::Util->isApprovedPath($host,$path));

	if ($args->{debug}) {
		warn "File::displayStatListing] listing \"$path\" on \"$host\"\n";
	}
	
	Lorenz::System->runLorenzCommand($host, "stat", $path);
}

#======================================================================
#  /file/[host]/[path] -- list given path on given host
#======================================================================

sub displayDirectoryListing {
	my ($self, $host, $path, $args) = @_;
	my $out;

	return $self->preperr("$host:$path is not an approved host:path combo")
		unless (Lorenz::Util->isApprovedPath($host,$path));

	if ($args->{debug}) {
		warn "File::displayDirectoryListing] listing \"$path\" on \"$host\"\n";
	}

	Lorenz::System->runLorenzCommand($host, "list", $path);
}

#======================================================================
#  /parallelfs -- list parallel filesystems
#======================================================================
sub listParallelFilesys {
	my $self = shift;

	my @fs=();
	open(F, $conf{parallelFilesysFile}) || return $self->preperr("Could not get list of parallel filesystems");
	while (<F>) {
		chomp;
		push @fs, $_;
	}
	close F;

	return $self->prepout(\@fs);
}

#======================================================================
#  /scratchfs -- list scratch filesystems
#======================================================================
sub listScratchFilesys {
	my $self = shift;

	my @fs=();
	open(F, $conf{scratchFilesysFile}) || return $self->preperr("Could not get list of scratch filesystems");
	while (<F>) {
		chomp;
		push @fs, $_;
	}
	close F;

	return $self->prepout(\@fs);
}



# Determine if given data contains (mostly) text. This is more forgiving than
# Perl's -T test.
sub _isText {
	my ($self,$data) = @_;

    my $length = length($data);
	my $maxlen = 1024;
    my $nbinchars = 0;

    return 1 if ($length == 0);
	$length = $maxlen if ($length > $maxlen);

	my $buf = substr $data, 0, $maxlen;

    foreach my $ascval (unpack("C*", $buf)) {
        $nbinchars++ if ($ascval < 32 or $ascval > 126);
    }
    my $nbinratio = $nbinchars / $length;

    # If more than 20% of the chars found are non-ascii, call it binary.
    return ($nbinratio > .2) ? 0 : 1;
}
sub removeFile {
	my ($self, $host, $path) = @_;

	my ($out,$err,$status);

	($out, $err, $status) = Lorenz::System->runCommand2($host, "/bin/rm -fR $path");
	
	return ($out, $err, $status);
}

sub newFileOrFolder{
	my ($self, $host, $path, $type) = @_;
	
	my ($out,$err,$status);

	my $cmd = $type eq 'folder' ? 'mkdir' : 'touch';
	
	($out, $err, $status) = Lorenz::System->runCommand2($host, "$cmd $path");
	
	return ($out, $err, $status);
}

sub moveFile {
	my ($self, $host, $from, $to) = @_;
	# Note: $from is an array ref
	
	my ($out,$err,$status, $fromString);

	$fromString = join(' ', @$from);
		
	($out, $err, $status) = Lorenz::System->runCommand2($host, "mv $fromString $to");
	
	return ($out, $err, $status);
}

sub transferFiles {
	my ($self, $sourceHost, $sourceDir, $sinkHost, $sinkDir, @paths) = @_;
	# paths assumed to be absolute paths

	# Normal case on a cluster; move from a temp dir into final location
	return Lorenz::System::moveFile ($sourceHost, $sourceDir, @paths);
}

sub copyFile {
	my ($self, $host, $from, $to) = @_;
	# Note: $from is an array ref
	
	my ($out,$err,$status,$fromString);

	$fromString = join(' ', @$from);
	($out, $err, $status) = Lorenz::System->runCommand2($host, "cp -R $fromString $to");
	
	return ($out, $err, $status);
}


sub getFileInfo {
	my ($self, $host, $path) = @_;
	
	my ($out,$err,$status);

	($out, $err, $status) = Lorenz::System->runCommand2($host, "/bin/ls -ldh $path");
	
	return ($out, $err, $status);
}

#==================================================
#  /file/image/:host/:path/*
#==================================================

sub getImage{
    my ($self,$args) = @_;
    my $host = $args->{host} || return $self->resterr('No host specified for getImage');
    my $path = $args->{path} || return $self->resterr('No path specified for getImage');
    
    if($args->{nameFormat}){
        return $self->getRecentImage($host, $path, $args->{nameFormat});
    }
}

sub getRecentImage{
    my ($self, $host, $path, $format) = @_;
    
    my($filename, $directories, $suffix) = fileparse($path);
    
    my $fullFormat = $directories.$format;

    if($format =~ m/;/g){
        return $self->resterr('Illegal characters in name format.');
    }
    
    my $file = `ls -rt $fullFormat | tail -1`;
    
    if ($? == -1) {
        return $self->resterr("Get most recent image failed: $!");
    }
    else{
        chomp $file;
        
        return $self->prepout({src => $file});
    }
}
1;
