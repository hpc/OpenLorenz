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

package Lorenz::Util;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Util.pm
#-------------------------------------------------------------------------------
#  Purpose:		Utility functions for Lorenz server-side.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use Cwd;
use File::Spec;
use Net::SMTP;
use Lorenz::Base;
use Lorenz::Cache;
use Lorenz::Cluster;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

use constant STATUS_OK	   => "OK";
use constant STATUS_ERROR  => "ERROR";

my %conf = Lorenz::Config::getLorenzConfig();
my $uname = `uname`; chomp $uname;


#======================================================================
#   Text support
#======================================================================

# $str = toText(sourceString, separator, format) -- Split sourceString on separator & return in rqsted format
sub toText {
	my $self = shift;
	my $string = shift;
	my $separator = shift;
	my $format = shift || "";
	my $header = shift || "";

	my $out="";


	foreach (split /\n/, $string) {
		my @s = split /$separator/, $_;
		$out .= sprintf "${format}", @s;
	}
	return $out;
}

# expandAbbrevs(@strings) -- Convert 32k to 32000, e.g. Converts input array in place.
sub expandAbbrevs {
	my $self = shift;

	foreach (@_) {
		s/\s+//g;
		if (/^(.*)Ki?B?$/i) {
			$_ = $1 * 1000;
		} elsif (/^(.*)Mi?B?$/i) {
			$_ = $1 * 1000*1000;
		} elsif (/^(.*)Gi?B?$/i) {
			$_ = $1 * 1000*1000*1000;
		} elsif (/^(.*)Ti?B?$/i) {
			$_ = $1 * 1000*1000*1000*1000;
		}
		$_ = "$_";				# Make sure it's a string
	}
}


sub wrapit {
	my $self = shift;
	my ($out,$err,$status) = @_;

	if ($status =~ /^-{0,1}\d+/) {
		$status = ($status == 0) ? STATUS_OK : STATUS_ERROR;
	}

	return ( { status => $status,
			   error  => $err,
			   output => $out }
		   );
}

sub wraperr {
	my $self = shift;
	my $err = shift;

	if ($err !~ /^\[/) {
		$err = "[" . $self->callersId(2) . "] $err";
	}

	warn("Lorenz: $err"); # Make sure error message goes to web server log

#	return ( { status => STATUS_ERROR,
#			   error  => $err,
#			   output => ""}
#		   );

	my $obj = { status => STATUS_ERROR,
				error  => $err,
				output => "" };

	print "Content-type: application/json\n\n";
	my $output = JSON::to_json($obj, {canonical => 1, pretty => 1});
	print $output;

	exit (1);
}

sub wrapout {
	my $self = shift;
	my $out = shift;

	return ( { status => STATUS_OK,
			   error  => "",
			   output => $out}
		   );
}

sub wrapjson {
	my $self = shift;
	my ($out,$err,$status) = @_;

	# Output already in json format. Just add json wrappings
	# for other fields...
	
	if ($status =~ /^-{0,1}\d+/) {
		$status = ($status == 0) ? STATUS_OK : STATUS_ERROR;
	}

	return ("{\"status\":\"$status\",\"error\":\"$err\",\"output\":$out}");
}

sub moveFiles {
	my ($self,$host,$sinkDir,@sourcePaths) = @_;

	return wraperr("Invalid dir path on $host: $sinkDir")   if (not isApprovedPath($host, $sinkDir));

	my ($out,$err,$status) = Lorenz::System->runCommand2($host, "/bin/mv @sourcePaths $sinkDir");

	return ($err) ? $err : 0;
}	


sub getLastModTime {
	my $self = shift;
	my $path = shift;

	my $modtime = Lorenz::System->runCommand("localhost",
							 "/usr/bin/stat $path | /bin/grep Modify");
	chomp $modtime;
	$modtime =~ s/^Modify:\s+//;
	$modtime =~ s/\..*$//;

	return $modtime;
}


# Return true if given file modified within given number of minutes
sub fileModifiedWithin {
	my $self = shift;
	my $path = shift;
	my $nminutes = shift;

	return 0 if (not -e $path);
	
	my $filemod = (stat(_))[9];
	my $cutoff = localtime() - ($nminutes * 60);

	return ($filemod >= $cutoff) ? 1 : 0;
}


# Return caller's module (or file) and subroutine name, for use in error reporting
sub callersId {
	my $self = shift;
	my $uplevels = shift || 1;

	my @c = caller($uplevels);
	my $ret = $c[3];
	if ($ret =~ m/main::(.*$)/) {
		$ret = $c[1] . "::" . $1;
	}
	return	$ret;
}

#============================================================
# isApprovedHost -- Determines if given host is approved for
#                   running commands and accessing files
#============================================================
sub isApprovedHost {
	my $self = shift;
	my $host = shift;

	my @clusters = (Lorenz::Cluster->getAllClusters());
	$host =~ m/^(\D+)\d*/;
	my $shortHost = $1;
	if (grep (/^${shortHost}$/, @clusters)) {
		return 1;
	} else {
		return 0;
	}
}

#============================================================
# isApprovedPath -- Determines if given host/path combo is 
#                   approved for accessing/storing
#============================================================
sub isApprovedPath {
	my $self = shift;
	my $host = shift;
	my $path = shift;

	return 1 if ($self->isApprovedHost ($host));

	if ($host eq "localhost") {

		return 0 if (not $path or
					 $path eq "/" or
					 $path !~ /^\//);	# Must start with /

		my @validLocalhostPaths = ("/g/", "/usr/global/", "/collab/");

		my $cpath = $self->getCanonicalPath($path);
		foreach my $validPath (@validLocalhostPaths) {
			return 1 if (index($cpath, $validPath) == 0);
		}
	}
	return 0;
}


#============================================================
# getChildren -- Return children of given pid.
#============================================================
sub getChildren {
	my $self = shift;
    my $parentPid = shift;

    return () if (not $parentPid or $parentPid < 0);
    my @children = ();

    # parentPid is the pid of the proc that launched the process(es) we want 
    # to identify. Find the children, grandchildren, etc. of that proc.

    my %psCmds = (   "SunOS"  => "ps -opid,ppid,pgid,comm -d",
                   "Linux"  => "ps -opid,ppid,pgid,cmd -d",
                   "AIX"    => "ps -opid,ppid,pgid,comm -d",
                   "IRIX64" => "ps -opid,ppid,pgid,comm -d",
                   "Darwin" => "ps -opid,ppid,pgid,cmdline -x",
                   "OSF1"   => "ps -opid,ppid,pgid,comm -d"
                 );
    if (not defined $psCmds{$uname}) {
        return ();
    }
    my $psCmd = $psCmds{$uname};

    $/ = "\n";		# Somehow this gets unset occasionally    
    my @ps = `$psCmd | grep -vi PPID`;

    foreach (@ps) {
        s/^\s+//;  s/\s+$//;
        my ($pid,$ppid,$pgid,$comm) = split /\s+/, $_, 4;

        next if (not $pid or $pid == $parentPid);

        if ($parentPid == $ppid || $parentPid == $pgid) {
            push @children, $pid;
            my @c = $self->getChildren($pid);
            if (scalar(@c)) {
                push @children, @c;
            }
        }
    }
    return @children;
}



sub sendEmail {
	my $self = shift;
	# Set this to the style supported by the web server.
	sendEmail_WithSendmail(@_);
}


sub sendEmail_WithMail {
	my $self = shift;
	my $from = shift;
	my $to = shift;
	my $subj = shift;
	my $msg = shift;
	my $contentType = shift || 'text/plain';

	# Use the Mail utility to send email. (Useful if smtp or sendmail are not available.)
	my @tos = split /,/, $to;

	open (MAIL, "| Mail -s \'$subj\' @tos 2>&1") or return 0;

	print MAIL "Content-type: $contentType\n";
	print MAIL "Subject: $subj\n";
	print MAIL "\n\n";

    #Send the message. 
	print MAIL $msg;
	print MAIL "\n\n";
    close MAIL;

	return 1;
}

sub sendEmail_WithSMTP {
	my $self = shift;
	my $from = shift;
	my $to = shift;
	my $subj = shift;
    my $msg = shift;
	my $contentType = shift || 'text/plain';

	# Use smtp to send mail, since sendmail is not config'ed properly on web server
	my $smtp = Net::SMTP->new('smtp.your.site.here',
							  Timeout => 30
							  #Debug => 1
							  );

	my @tos = split /,/, $to;

	$smtp->mail($tos[0]);
	foreach (@tos) {
		$_ =~ s/\s//g;
		$smtp->to($_);
	}

	$smtp->data();
	foreach (@tos) {
		$_ =~ s/\s//g;
		$smtp->datasend("To: $_\n");
	}
	$smtp->datasend("From: $from\n");
	$smtp->datasend("Reply-To: $from\n");
	$smtp->datasend("Content-type: $contentType\n");
	$smtp->datasend("Subject: $subj\n");
	$smtp->datasend("\n\n");

    #Send the message. 
	$smtp->datasend($msg);
	$smtp->datasend("\n\n");
	$smtp->dataend();
	$smtp->quit();
}

sub sendEmail_WithSendmail {
	my $self = shift;
	my $from = shift;
	my $to = shift;
	my $subj = shift;
    my $msg = shift;
	my $contentType = shift || 'text/plain';
    my $replyTo = shift || $from;

	my $sendmail= "/usr/lib/sendmail -t";

    # Open Sendmail
    open (SENDMAIL,"| $sendmail") || die "Could not initiate sendmail";
	print SENDMAIL "Content-type: $contentType\n";
    print SENDMAIL "To: $to\n";
    print SENDMAIL "From: $from\n";
    print SENDMAIL "Reply-To: $replyTo\n";
    print SENDMAIL "Subject: $subj\n";
    print SENDMAIL "$msg\n";
    close (SENDMAIL);

    return (1);
}

#======================================================================
#  getCanonicalPath -- Return canonical path for given path. The
#                      returned path has resolved symlinks, etc.
#======================================================================
sub getCanonicalPath {
	my $self = shift;
    my $path = shift;

    if (not $path) {
        return 0;
    }

    my $canPath = "";

    if (-d $path) {
        # Either a dir or symlink to a dir
        $canPath = Cwd::abs_path($path);
        if (not $canPath) {
            # Dir probably has 000 perms, so just return path
            $canPath = $path;
        }
    } else {
        # Plain file or symlink to non-dir
        # NOTE that this routine assumes that '/' is the only directory separator.

        my ($dir, $file) = $path =~ m{^(.*)/(.+)$};
		 if (not $dir or not $file) {
			 $canPath = $ENV{PWD} . '/' . $path;
		 } elsif (-l $path) {
			 my $link_target = readlink($path);
			 
			 if (not defined $link_target) {
				 return 0;
			 }
			 
			 $link_target = $dir . '/' . $link_target
				 unless File::Spec->file_name_is_absolute($link_target);
			 
			 $canPath = Cwd::abs_path($link_target);
			 
			 if (not $canPath) {
				 # Dangling link; set path back to target
				 $canPath = $link_target;
			 }
		 } else {
			 $canPath = Cwd::abs_path($dir) . '/' . $file;
		 }
	}

    return $canPath;		
}


sub isValidFileName{
	my $self = shift;
	my $name = shift;
	
	return ($name !~ /[\?\*\\\'\"\$\;\<\>\|\`\#]/g) ? 1 : 0;
}

# lorenz_from_json -- Lorenz-specific version of from_json that does more error handling.
#
#		Returns: ($output, $errStatus)
#		If no error, errStatus==0 and output==converted data structure
#		If error, errStatus==1 and ouput==error message from conversion
sub lorenz_from_json {
	my $self = shift;
	my @in = @_;
	my $err = "";
	my $out = "";

	eval {
		$out = JSON::from_json($in[0]);
	};

	if ($@) {
		my $me = $self->callersId();
		my $caller = $self->callersId(2);
		return ("Error in $me from $caller. Error = $@.\nInput to from_json:\n@in", 1);
	} 
	
	return ($out, 0);
}

sub timeoutExec{
	my $self = shift;
    my $sub = shift;
    my $timeout = shift;
    
    my @out;
    
    eval {
		local $SIG{ALRM} = sub { die "Your subroutine timed out after $timeout seconds. $!\n" }; # NB: \n required
		alarm $timeout;
		
        @out = $sub->(@_);
        
		alarm 0;
	};
    
    if($@){
        return (1, $@);
    }
    else{
        return (0, @out);
    }
}

sub getWeather{
    my ($self, $raw) = @_;
    
    return("");
    
}


1;
