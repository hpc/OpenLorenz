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

package Lorenz::REST::Command;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									Command.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling command-related Lorenz REST calls.
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
use Lorenz::Config;
use Lorenz::System;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");

my $debug = 0;
my %registeredScripts = Lorenz::Config::getLorenzRegisteredScripts();

#--------------------------------------------------

sub runApprovedCommand {
	my ($self,$args) = @_;
	my $host = $args->{host} || $self->preperr("host not specified");
	my $command = $args->{command} || $self->preperr("command not specified");

	my ($out,$err,$status,$node) = Lorenz::System->runApprovedCommand($host,$command,$args);

	if ($err or $status eq Lorenz::Util::STATUS_ERROR) {
		return $self->preperr("Failed to run command: \'$command\' on $host: $err");
	}
	
	my $obj = {
		"command" => "$host: $command",
		"command_out" => $out,
		"hostname" => $node
	};
	
	return $self->prepit($obj, $err, $status);
}


sub runRegisteredScript {
	my ($self,$args) = @_;
	my $host    = $args->{host};
	my $script  = $args->{script};
	my $argStr  = $args->{arg} || "";
	my $timeout = $args->{timeout} || 0;

	# Run specific, registered script/command
	if (not $host or not $script) {
		return $self->preperr("[Command::runRegisteredScript] host or command not provided");
	} else {
		if ($host eq "localhost" or Lorenz::Util->isApprovedHost($host)) {
			return $self->preperr("[Command::runRegisteredScript] $script is not a registered script")
				unless defined $registeredScripts{$script};
			my ($o,$e,$s) = Lorenz::System->runCommand2 ($host, "$registeredScripts{$script} $argStr", $timeout);
			
			if($s != 0){
				$s = 'ERROR';
			}
			else{
				$s = 'OK';
			}
			
			return $self->prepjson($o,$e,$s);
		} else {
			return $self->preperr("[Command::runRegisteredScript] $host is not an approved host");
		}
	}
}

1;


