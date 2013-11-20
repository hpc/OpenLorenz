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

# Lorenz Test Runner (interactive)
BEGIN {
	require '/usr/global/tools/lorenz/lib/lorenz.pl';
}

use strict;
use URI::Escape;
use Capture::Tiny qw(capture_merged);
use POSIX qw(strftime);
use Lorenz::DependencyManager qw(:standard);

my $username = getlogin();
my $passwd;
print "Lorenz Test Runner\n";

my %apps = getLorenzApps();
my ($a, $c) = split(/-/, $ARGV[0]);

my $dir = "/usr/global/tools/lorenz/selenium/";
my $command = "java -jar $dir/selenium-server-standalone-2.6.0.jar -userExtensions $dir/user-extensions.js  -firefoxProfileTemplate $dir/firefox-template";
$| = 1;
my $p = open(COMMAND, "$command > /dev/null 2>&1 |");
sleep(5);

print "Password: ";
system "stty -echo"; # disable echo
chomp(my $pass = <STDIN>);
system "stty echo"; # enable echo
$passwd = uri_escape($pass);
print "\n";

if(defined($a)){
	if($apps{$a}){
		runSuiteTests($a, $c);
	}else{
		die("Invalid application name! Accepted forms are 'appName' or 'appName-testName'");
	}
}else{
	for(keys %apps){
		runSuiteTests($_);
	}
}
my $pp = `pgrep -P $p`;
`kill $p`;
`kill $pp`;
close COMMAND;

sub runSuiteTests {
	my $a = shift;
	my $c = shift;
	
	print "\nApplication $a:\n";
	
	if(defined($c)){
		my $s = "$main::lorenzRootDir/$a/tests/sel-$c.pl";
		
		if(-e "$s"){
			print "\n";
			startTest($c, $s);
		}else{
			die "Could not find test suite \"$c\" in application $a, searched for script: $s";
		}
	}else{
		my @tests = <$main::lorenzRootDir/$a/tests/sel-*.pl>;
		
		if(!scalar @tests){
			print "No tests found\n";
		}
		
		foreach(@tests){
			$_ =~ m/.*\/sel-(.*).pl/;
			startTest($1, $_);
		}
	}
}

sub startTest {
	my $c = shift;
	my $s = shift;
    print "Running test suite $c...";
    
	my $i;
	my $out = capture_merged {
		my @args = ("perl", "$s", $username, $passwd);
		$i = system(@args);
	};
    
    my $status = $i ? "FAILED!" : "OK";
    print "$status\n";
    
	if($i){
        my $fn = "$ENV{'HOME'}/test_$c".strftime("_%b-%e-%H:%M:%S", localtime).".log";
        open(RES, ">$fn");
        print RES "$out";
        close(RES);
        print ">>Test output: $fn\n";
    }
}
