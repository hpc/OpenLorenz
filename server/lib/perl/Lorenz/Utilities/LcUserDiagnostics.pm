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

package Lorenz::Utilities::LcUserDiagnostics;

use strict;
use JSON;
#use Switch;
use Lorenz::Server;
use Lorenz::REST::User;
use Lorenz::Config;

our (@ISA, @EXPORT);
BEGIN {
	require Exporter;
	@ISA = qw(Exporter);
	@EXPORT = qw(DIAG_PASS DIAG_WARN DIAG_FAIL isValidTest allTestNames getTests 
				dotfcheck unixgrps userpath qdotf hdirperm sshkperm hdirwperm
				validuid pathorder pathulb userDiagInfo storageacct);
}

use constant DIAG_PASS  => "OK";
use constant DIAG_WARN  => "WARN";
use constant DIAG_FAIL  => "ERROR";

my $dotf_solution = <<EOF;
Both sftp and scp have known problems which cause them to fail if
dot files generate output; see <a href="http://www.openssh.org/faq.html#2.9" target="_blank">http://www.openssh.org/faq.html#2.9</a>
. Problems with xemacs have also been reported as a result of unexpected
dot file output.

There are a number of things that cause this, including:
(1) "echo" statements
(2) Using dotkit's "use" command without the -q (quiet) option
(3) Errors caused by running interactive commands like stty in a
   non-interactive shell

If you are using csh or tcsh as your login shell, check your dot files for
the existence of something like this:

	if ( ! \$?ENVIRONMENT ) then
		setenv ENVIRONMENT INTERACTIVE
	endif



Unfortunately, for csh and tcsh shell users, this has the effect of
always setting the ENVIRONMENT variable equal to "INTERACTIVE".

An example of correct shell code, which can be found in /etc/csh.login,
is the following:

	if ( ! \$?ENVIRONMENT ) then
		if (\$?prompt) then
			setenv  ENVIRONMENT INTERACTIVE
		else
			setenv  ENVIRONMENT BATCH
		endif
	endif



The problem with having an improperly set ENVIRONMENT variable is that
this variable is commonly used to restrict certain commands in
the .cshrc file from running during non-interactive login sessions.  In
particular, it is used to prevent the execution of commands that might
otherwise produce console output during the login process for
non-interactive sessions.  Console output during non-interactive
sessions is bad because it can interfere with SCP and SFTP file
transfers.



If all else fails, you can redirect the output from the offending commands
to /dev/null. E.g., for csh users who are getting an error from stty
during non-interactive logins, try:

  stty erase ^H >& /dev/null

EOF

my $tests = {
    'dotfcheck' =>  {
					 name    => 'Unwanted Output from Dot Files',
					 desc    => 'Checks to see if your LC dot files generate unwanted output ' .
								'during a non-interactive login. Output for these logins can ' . 
								'cause sftp and scp to fail, and xemacs to behave oddly.',
					 sol     => $dotf_solution
                    },
    'unixgrps'  =>  {
					 name    => 'Unix Group Count',
					 desc    => 'Determines if you are assigned to more than 16 Unix groups,' .
								'which can cause problems on BGL/uBGL and the LC web server.',
					 sol     => 'If you experience problems related to being in too many groups, ' .
								'review your list of groups via "mylc" and request to be removed ' .
								'from any that you no longer need.'
                    },
    'userpath'  =>  {
					 name    => 'User PATH Defined',
					 desc    => 'Checks to see if your PATH variable is set. If PATH is not set, ' .
								'you will have problems in your login sessions',
					 sol     => 'Edit the invocation of quota in your dot files to use something '.
								'like: "quota -t 10" or "quota -v -t 10" to have a 10-second timeout.' 
                    },
    'qdotf'     =>  {
					 name    => 'Quota Command Invoked without Timeout',
					 desc    => 'Checks to see if your dot files execute the quota command ' .
								'without using the timeout option (-t). Running quota without ' .
								'-t while a Lustre filesystem is down can cause quota to hang.',
					 sol     => 'Add a -t flag to your quota invocation to prevent hangs when Lustre is down.'
                    },
    'hdirperm'  =>  {
					 name    => 'Home/SSH Directory Permissions',
					 desc    => 'Checks that the permissions on key ssh directories are appropriate. ' .
								'Inappropriate permissions will cause ssh keys to fail.',
					 sol     => 'Issue the command: "chmod g-w,o-w ~ ~/.ssh" on an LC system.'
                    },
    'sshkperm'  =>  {
					 name    => 'SSH Private Key Permissions',
					 desc    => 'Checks that permissions on your ssh keys are appropriate. Inappropriate '.
								'permissions will cause ssh keys to fail.',
					 sol     => 'Issue the command: "chmod -R g-rwx,o-rwx ~/.ssh" on an LC system.'
                    },
    'hdirwperm' =>  {
					 name    => 'Home Dir World Permissions',
					 desc    => 'Checks for world access to your home directory.',
					 sol     => 'Issue the command: "chmod o-rwx ~" on an LC system.'
                    },
    'validuid'  =>  {
					 name    => 'User UID Valid',
					 desc    => 'Checks to see if your user id (uid) is less than 1000. These uids ' .
								'are treated specially and can break several subtle things.',
					 sol     => 'If you experience problems related to your UID, contact the Hotline.'
                    },
    'pathorder' =>  {
					 name    => 'PATH Order Validation',
					 desc    => 'Verifies that /usr/local/bin is before /usr/bin in your search path. ' .
								'Changing this order can have undesirable effects, so beware of ' .
								'possible side effects from doing this.',
					 sol     => 'If you are not intentionally setting /usr/bin to occur before ' .
								'/usr/local/bin, edit your dot files to modify the PATH definition.'
                    },
    'pathulb'   =>  {
					 name    => '/usr/local/bin In PATH',
					 desc    => 'Checks to see if /usr/local/bin exists in your search path.',
					 sol     => 'Edit your dot files to include /usr/local/bin in the definition of PATH.'
                    },
	'storageacct' => {
						name => 'Storage Access',
						desc => 'Determines whether or not a given user can actually login to storage.',
						sol => 'Please contact the hotline about this issue.  They will most likely need to establish a storage account for you.'
					}
};

sub dotfcheck {
    my $host = shift;
    
    my ($out,$err,$status) = runCommand2($host, "/bin/true");
    
	if($out eq "" && $err eq ""){
		return pass($tests->{dotfcheck}->{name}." - Passed");
	}else{
		return fail("No output", "Your dot files generated unexpected output.\n<i>STDOUT from your dot files:</i>\n$out<i>STDERR from your dot files:</i>\n$err", $tests->{dotfcheck}->{sol});
	}
}

sub unixgrps {
    my @out = `groups`;	
    my $count = 0;
    
    foreach(@out){
		my @grps = split(/ /);
		$count += scalar @grps;
	}
	
    if($count <= 16){
        return pass("$tests->{unixgrps}->{name} - Passed");
    }else{
        return fail("User belongs to less than 16 groups", "User belongs to $count groups", $tests->{unixgrps}->{sol});
    }
}

sub storageacct{	
	my %conf = getLorenzConfig();		
	my $oUser = Lorenz::REST::User->new();		
	$oUser->{user} = getUsername();
	
	my $status = $oUser->showEnclaveStatus();
	
	if(($conf{lc_zone} eq 'cz' && $status->{output}->{storageType} ne 'Any Unclassified') || $conf{lc_zone} eq 'rz' || $conf{network} eq 'scf'){
		my $out = runlstorage();
		
		if($out =~ /Contents of directory/ or $out =~ /lstorage is not installed/){
			return pass("$tests->{storageacct}->{name} - Passed");
		}
		else{
			return fail("The lstorage command to list storage contents.", "The lstorage command failed with:\n$out", $tests->{storageacct}->{sol});
		}
	}
	else{
		return warning("You cannot access storage on the CZ.", "Your storage account type indicates you should not be able to access storage in this zone.", "Switch to the RZ to check your storage access.");
	}
}

sub runlstorage{
	my $lstoragePath = "/usr/local/bin/lstorage";
	if (not -e $lstoragePath) {
		return "lstorage is not installed on this host";
	} else {
		my $output = `$lstoragePath`;
		return $output;
	}
}

sub userpath {
    if(defined($ENV{PATH})){
		return pass("$tests->{userpath}->{name} - Passed");
	}else{
		return fail("User PATH is defined", "User PATH not defined", $tests->{userpath}->{sol});
	}
}

sub qdotf {
    my @user = getpwnam(getUsername());
	my $shell = $user[8];
	my @dotfiles = ();

	if ($shell eq "/bin/sh") {
		push @dotfiles, "~/.profile";
	} elsif ($shell eq "/bin/bash") {
		push @dotfiles, "~/.bashrc", "~/.profile";
	} elsif ($shell eq  "/bin/ksh") {
		push @dotfiles, "~/.kshrc", "~/.profile";
	} elsif ($shell eq "/bin/csh")  {
		push @dotfiles, "~/.cshrc", "~/.login";
	} elsif ($shell eq "/bin/tcsh") {
		push @dotfiles, "~/.cshrc", "~/.login";
	} elsif ($shell eq "/bin/zsh")	{
		push @dotfiles, "~/.zshrc";
	} else {
		return fail("Supported shell", "You are using an unsupported shell: $shell", "Please contact lorenz developers");
	}
	
	my $f = join ' ', @dotfiles;
	my ($out,$err,$status)  = runCommand2("localhost", "grep quota $f 2>/dev/null");
		
	if($status == 0){
		chomp($out);
		my @lines = split /\n/, $out;
		foreach(@lines){
			my $quotaFlag = 0;
			my $tFlag = 0;
			my @tokens = split /\s/, $_;
			foreach(@tokens){
				if($_ =~ /(.*:)?quota/){
					$quotaFlag = 1;
				}elsif($_ eq "-t"){
					$tFlag = 1;
				}
			}
			if($quotaFlag && !$tFlag){
				return fail("Quota command has -t switch specified",
							"Quota command is invoked without the -t switch in your dot files,<br>which can cause a hang during login if one of the Lustre filesystems is down.",
							$tests->{qdotf}->{sol})
			}
		}
	}
	return pass("$tests->{qdotf}->{name} - Passed");
}

sub hdirperm {
	my ($out,$err,$status)  = runCommand2("localhost", "ls -ld ~ 2>/dev/null | awk '{print \$1}'");
	my ($out2,$err2,$status2)  = runCommand2("localhost", "ls -ld ~/.ssh 2>/dev/null | awk '{print \$1}'");

	if($status == 0 && $status2 == 0){
		chomp($out);
		if(checkGroupWorldWrite($out) && checkGroupWorldWrite($out2)){
			return pass("$tests->{hdirperm}->{name} - Passed");
		}else{
			return fail("No group and world write permissions on home or .ssh directory",
						"Group or world write permission found on your home or .ssh directory", $tests->{hdirperm}->{sol})
		}
	}
	return fail("Test success", "Test encountered an error!", "Please contact lorenz developers");
}

sub sshkperm {
	my @sshKeyFiles = `ls -I*.pub ~/.ssh 2>/dev/null | grep "^id"`;
	
	my @canonicalPaths = ();
	foreach (@sshKeyFiles){
		my $filePath = "$ENV{HOME}/.ssh/".$_;
		chomp $filePath;
		push @canonicalPaths, Lorenz::Server::getCanonicalPath($filePath);
	}

	if(@canonicalPaths){
		my $testFiles = join ' ', @canonicalPaths;
		my ($out,$err,$status)  = runCommand2("localhost", "ls -ld $testFiles 2>/dev/null | awk '{print \$1}'");
		
		if($status == 0){
			my @perms = split /\n/, $out;
			foreach (@perms){
				if($_ && !checkGroupWorldRead($_)){
					return fail("SSH private key not readable by group and world", "One or more SSH private key files is readable by group or world", $tests->{sshkperm}->{sol})
				}
			}
			return pass("$tests->{sshkperm}->{name} - Passed");
		}
		return fail("Test success", "Test encountered an error!", "Please contact lorenz developers");
	}else{
		return pass("$tests->{sshkperm}->{name} - Passed; No files to check.");
	}
}

sub hdirwperm {
	my ($out,$err,$status)  = runCommand2("localhost", "ls -ld ~ 2>/dev/null | awk '{print \$1}'");
	
	if($status == 0){
		chomp($out);
		if(checkWorldPerms($out)){
			return pass("$tests->{hdirwperm}->{name} - Passed");
		}else{
			return warning("No home directory world permissions", "World permissions found on home directory", $tests->{hdirwperm}->{sol})
		}
	}
	return fail("Test success", "Test encountered an error!", "Please contact lorenz developers");
}

sub validuid {
	if($< >= 1000){
		return pass("$tests->{validuid}->{name} - Passed");
	}
	return warning("UID is NOT less than 1000", "UID is less than 1000", $tests->{validuid}->{sol});
}

sub pathorder {
	my @paths = split /:/, $ENV{PATH};
	my $ub = 0;
	
	foreach(@paths){
		if($_ eq '/usr/bin'){
			$ub = 1;
		}
		if($ub && $_ eq '/usr/local/bin'){
			return warning("/usr/bin not before /usr/local/bin in PATH", "/usr/bin found before /usr/local/bin in PATH", $tests->{pathorder}->{sol})
		}
	}
	return pass("$tests->{pathorder}->{name} - Passed");
}

sub pathulb {
	my @paths = split /:/, $ENV{PATH};
	
	foreach(@paths){
		if($_ eq '/usr/local/bin' || $_ eq '/usr/local/bin/'){
			return pass("$tests->{pathulb}->{name} - Passed");
		}
	}
	return warning("PATH includes /usr/local/bin", "PATH does not include /usr/local/bin", $tests->{pathulb}->{sol})
}

sub checkGroupWorldRead {
	my $perm = shift;
	
	if($perm eq ""){
		return 1;
	}
	return substr($perm, 4, 1) eq "-" && substr($perm, 7, 1) eq "-";
}

sub checkGroupWorldWrite {
	my $perm = shift;
	
	if($perm eq ""){
		return 1;
	}
	return substr($perm, 5, 1) eq "-" && substr($perm, 8, 1) eq "-";
}

sub checkWorldPerms {
	my $perm = shift;
	
	if($perm eq ""){
		return 1;
	}
	return substr($perm, 7, 1) eq "-" && substr($perm, 8, 1) eq "-" && substr($perm, 9, 1) eq "-";
}

sub isValidTest {
	my $test = shift;
	
	return defined ($tests->{$test});
}

sub allTestNames {
	my %t = %$tests;
	delete $t{dotfcheck};
	
	return keys %t;
}

sub getTests {
	return %$tests;
}

sub pass {
    my $msg = shift;
    
    my $obj = {
				status => DIAG_PASS,
				details  => $msg
              };
    
    return $obj;
}

sub fail {
    my $expected = shift;
    my $output = shift;
    my $solution = shift;
    
    my $res = "<b>Test Failed!\nExpected:</b> $expected\n<b>Actual:</b> $output\n<b>Solution:</b> $solution";
    
    my $obj = {
				status => DIAG_FAIL,
				details  => $res
              };
    
    return $obj;
}

sub warning {
    my $expected = shift;
    my $output = shift;
    my $solution = shift;
    
    my $res = "<b>Test generated warnings!\nExpected:</b> $expected\n<b>Actual:</b> $output\n<b>Solution:</b> $solution";
    
    my $obj = {
				status => DIAG_WARN,
				details  => $res
              };
    
    return $obj;
}

sub userDiagInfo{
	
	my @user = getpwnam(getUsername());
	my $host = `hostname`;
	chomp $host;
	
	my $obj = {
				username => $user[0],
				host => $host,
				shell => $user[8]
			  };
	
	my ($out,$err,$status)  = runCommand2("localhost", "/usr/bin/env|sort");

	my %envVars=();
	foreach my $line (split /\n/, $out) {
		my ($var,$val) = split /=/, $line, 2;
		$envVars{$var} = $val;
	}
	
	if($status == 0){
		$obj->{env} = \%envVars;
	}
	
	return $obj;
}

1;
