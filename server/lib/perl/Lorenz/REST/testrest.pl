#!/usr/bin/env perl
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
	require '/usr/global/tools/lorenz/lib/lorenz.pl';
}

use strict;
use Lorenz::REST::Bank;
require Data::Dumper;


my $testBank   = 1;
my $testHost   = 0;
my $testSystem = 0;
my $testUtil   = 0;


# Test methods from Lorenz::REST::Bank

if ($testBank) {
	my $a = Lorenz::REST::Bank->new();
#	test_rest_method($a, "getAllBanks", {});
	test_rest_method($a, "getBankInfo", {'bank' => 'views'});
	test_rest_method($a, "getUserAccountBankInfo", {'user' => 'jwlong'});
	test_rest_method($a, "getUserAccountBankInfo", {'user' => 'jwlong', 'livedata' => 1});
	test_rest_method($a, "getUserBanks",  {'user' => 'jwlong'});

	test_rest_method($a, "getUserBankDetails", {'user' => 'jwlong', 'bank' => 'views'});
	test_rest_method($a, "getBankCpuUsage",  {'bank' => 'views', 'cluster' => 'edge'});
	test_rest_method($a, "getBankMembers",  {'bank' => 'views', 'cluster' => 'edge'});
}


sub test_rest_method {
	my ($method,$name,$args)=@_;

	my $argstring = "";
	foreach (keys %{$args}) {
		$argstring .= "$_=>$args->{$_},";
	}
	chop $argstring;
	print "============ [testrest.pl]\n$name($argstring) =>\n";
	print Data::Dumper::Dumper($method->$name($args));

}
