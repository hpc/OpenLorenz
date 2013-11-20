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

package Lorenz::REST::Bank;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#					Bank.pm
#-------------------------------------------------------------------------------
#  Purpose:	Class for handling bank-related Lorenz REST calls.
#  Author:	Jeff Long, 1/20/2011
#  Notes:
#		"new" sub is inherited from superclass
#
#  Modification History:
#	01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
use vars qw(@ISA);
use Date::Parse;
use Lorenz::Config;
use Lorenz::Bank;
use Lorenz::REST::RESTHandler;
@ISA = ("Lorenz::REST::RESTHandler");

my $debug = 0;
my %conf = Lorenz::Config::getLorenzConfig();

my $sacctmgrUserQuery =
 "/usr/bin/sacctmgr -P -o show user withasso format=user,cluster,account,defaultaccount,qos";


#--------------------------------------------------

#======================================================================
#  /banks -- list all slurm accts/banks ('repos' is NERSC term)
#======================================================================

sub getAllBanks {
	my ($self,$args) = @_;
	my $livedata = ($args->{livedata}) ? 1 : 0;

	my $obj = { "data" => Lorenz::Bank->getAllBanks($livedata)
			  };

	return $self->prepout ($obj);
}



#======================================================================
#  /bank/[bankname] -- show info about specific slurm bank (repo)
#======================================================================

sub getBankInfo {
	my ($self,$args) = @_;
	my $bank = $args->{bank} || return ($self->preperr("bank not defined"));

	return $self->prepout (Lorenz::Bank->getBankInfo($bank));
}

#======================================================================
#  /user/<user>/bankhosts -- show info about a user's accounts, banks
#======================================================================

sub getUserAccountBankInfo {
	my ($self,$args) = @_;

	my $user     =  $args->{user} || return ($self->preperr("user not defined"));
	my $livedata = ($args->{livedata}) ? 1 : 0;
	my $all      = ($args->{all}) ? 1 : 0;

	my $obj = Lorenz::Bank->getUserAccountBankInfo ($user, {'livedata' => $livedata,
															 'all' => $all});
	return $self->prepout ($obj);
}

#======================================================================
#  /user/<user>/banks -- show user's banks
#======================================================================

sub getUserBanks {
	my ($self,$args) = @_;

	my $user = $args->{user} || return ($self->preperr("user not defined"));

	my $obj = {
			   'banks' => Lorenz::Bank->getUserBankObjs($user)
			  };

	return $self->prepout ($obj);
}

#======================================================================
#  /user/<user>/bank/<bank> -- show user's bank details for given bank
#======================================================================

sub getUserBankDetails {
	my ($self,$args) = @_;
	my $user = $args->{user} || return ($self->preperr("user not defined"));
	my $bank = $args->{bank} || return ($self->preperr("bank not defined"));

	my $obj = Lorenz::Bank->getUserBankDetails($user,$bank);

	if (not $obj) {
		return $self->preperr("Could not get bank details for bank: $bank user : $user");
	} else {
		return $self->prepout($obj);
	}
}


#======================================================================
#  /banks/cpuutil -- Show cpu usage for all banks, broken up by day & cluster
#======================================================================
sub getAllBanksCpuUsage {
	my ($self,$args) = @_;
	return $self->preperr("This method not yet implemented.");
}


#======================================================================
#  /cluster/[cluster]/bank/[bank]/cpuutil/daily
#  /bank/[bank]/cpuutil 
#
#	-- Show cpu usage for given bank, broken up by day & cluster
#======================================================================
sub getBankCpuUsage {
	my ($self,$args) = @_;
	my $bank = $args->{bank} ||	return $self->preperr("'bank' not defined");
	my $cluster = $args->{cluster} || "";
	my $ndays	= $args->{ndays}   || 14;

	my $objs = Lorenz::Bank->getBankCpuUsage($bank,{'cluster' => $cluster, 'ndays' => $ndays});

	if (not $objs) {
		return $self->preperr("Could not get bank cpu usage for bank: $bank on cluster: $cluster");
	} else {
		return $self->prepout($objs);
	}
}

#======================================================================
#  /bank/<bank>/membership/<cluster>
#======================================================================
sub getBankMembers {
	my ($self,$args) = @_;
    my $bank = $args->{bank};
    my $cluster = $args->{cluster};

	my $obj = Lorenz::Bank->getBankMembers($bank, $cluster);

	if (not ref($obj) eq 'ARRAY') {
		# Returned an err msg
		return $self->preperr($obj);
	} else {
		return $self->prepout($obj);
	}
}

1;


