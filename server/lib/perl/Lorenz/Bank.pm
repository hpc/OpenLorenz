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

package Lorenz::Bank;

#===============================================================================
#					Bank.pm
#-------------------------------------------------------------------------------
#  Purpose:	Bank-centric methods (native)
#  Author:	Jeff Long
#  Notes:
#===============================================================================

use strict;
use vars qw(@ISA);
use Date::Parse;
use Lorenz::Base;
use Lorenz::Host;
use Lorenz::User;
use Lorenz::System;

use vars qw(@ISA);
@ISA = ("Lorenz::Base");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();



#--------------------------------------------------


#======================================================================
#  $href = getAllBanks(livedata)
#======================================================================

sub getAllBanks {
	my $self = shift;
	my $livedata = shift;

	my ($out,$err,$status);

	my %data = ();

	return \%data;
}


#======================================================================
#  $href = getBankInfo(bank)
#======================================================================

sub getBankInfo {
	my $self = shift;
	my $bank = shift;

	my $obj = {
			   'account'      => 'a',
			   'description'  => 'b',
			   'organization' => 'c',
			   'bank'         => $bank
			  };
	
	return $obj;
}

#======================================================================
#  $href = getUserAccountBankInfo(user,args)
#======================================================================

sub getUserAccountBankInfo {
	my $self = shift;
	my $user = shift;
	my $args = shift;

}

#======================================================================
#  $aref = getUserBankObjs(user,cluster)
#======================================================================

sub getUserBankObjs {
	my $self = shift;
	my $user = shift;
	my $cluster = shift || "";

	my @objs=();
	foreach ($self->getUserBanks($user, $cluster)) {
		my $default = 0;
		if (s/ \*$//) {
			$default = 1;
		}
		
		push @objs, {
					 'bank'	  => $_,
					 'default' => $default
					};
	}
	return \@objs;
}

#======================================================================
#  @banks = getUerBanks(user,cluster)
#======================================================================

sub getUserBanks {
	my ($self,$user,$cluster) = @_;

	return ("bank1 *", "bank2");
}


#======================================================================
#  $href = getUserBankDetails(user,bank)
#======================================================================

sub getUserBankDetails {
	my ($self,$user,$bank) = @_;

	my @objs=();
	
	push @objs, {
				 'user'	   => $user,
				 'bank'	   => $bank,
				 'cluster' => 'hosta',
				 'qos'	   => 'normal'
				};

	my $obj = {
			   'bank' => $bank,
			   'user' => $user,
			   'bankDetails' => \@objs
			  };

	return $obj;
}

#======================================================================
#  $href = getBankCpuUsage(bank,args)
#	-- Show cpu usage for given bank, broken up by day & cluster
#======================================================================
sub getBankCpuUsage {
	my ($self,$bank,$args) = @_;

	my @objs=();
	return \@objs;
}

sub getBankMembers {
    my ($self,$bank,$cluster) = @_;
    
    my @users=();
    return \@users;
}

1;


