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

package Lorenz::REST::RESTHandler;

###########################################################################
# $URL$
# $Author$
# $Date$
# $Rev$
###########################################################################


#===============================================================================
#									RESTHandler.pm
#-------------------------------------------------------------------------------
#  Purpose:		Base class for Lorenz REST handlers.
#  Author:		Jeff Long, 1/20/2011
#  Notes:
#		Implements default versions of the put(), get(), post(), and delete() methods.
#
#  Modification History:
#		01/20/2011 - jwl: Initial version
#===============================================================================

use strict;
my $debug = 0;
my $className = "RESTHandler";
use JSON;

use constant STATUS_OK	   => "OK";
use constant STATUS_ERROR  => "ERROR";

sub new {
	my $proto = shift;
	my $class = ref($proto) || $proto;
	my $self  = {};

	$className = $class;

	my $args = shift;
	$self->{_args} = $args;

	$debug = 1 if ($self->{debug} or ($args and $args->{debug}));
	
	if ($debug) {
		require Data::Dumper;
		warn "[RESTHandler] Final args to pass to new(): " . Data::Dumper::Dumper($args) . "\n";
	}

	bless ($self, $class);
	return $self;
}

sub myerror {
	my $msg = shift;

	warn "[" . __PACKAGE__ . "] ERROR: $msg\n";
	exit 1;
}

# replacement of $self->preperr in Server.pm... renamed due to exporting conflict in Server.pm
sub resterr {
    my $self = shift;
	my $err = shift;

	# Prepend calling sub's name if not already provided
	if ($err !~ /^\[/) {
		$err = "[" . $self->_callersId(2) . "] $err";
	}

	warn("Lorenz: $err"); # Make sure error message goes to web server log
    
    if($self->{exitOnError} == 0){
        return ( { status => STATUS_ERROR,
                   error  => $err,
                   output => ""}
               );
    }
    else{
        my $obj = { status => STATUS_ERROR,
                    error  => $err,
                    output => "" };
    
        print "Content-type: application/json\n\n";
        my $output = to_json($obj, {canonical => 1, pretty => 1});
        print $output;
    
        exit (1);
    }
}

# Prepare lorenz output/error; hashref 'args' controls whether:
#
# - output is wrapped in envelope                  {_envelope => 0|1}
# - output format (raw vs json)                    {_format => raw|json}
# - output is returned vs printed followed by exit {_printAndExit => 0|1}

sub prepit {
    my ($self,$out,$err,$status,$args) = @_;

	if ($status =~ /^-{0,1}\d+/) {
		$status = ($status == 0) ? STATUS_OK : STATUS_ERROR;
	}
	
	$self->_prepareOutput($out, $err, $status, $args);

}

sub prepjson {
    my ($self,$out,$err,$status,$args) = @_;
	my $output = $out;;

	# Output already in json format. Just add json wrappings
	# for other fields...

	$args = $self->_setOutputArgs($args);
	$args->{_mime} = "application/json";

	if ($status =~ /^-{0,1}\d+/) {
		$status = ($status == 0) ? STATUS_OK : STATUS_ERROR;
	}

	if ($args->{_envelope}) {
		$output = "{\"status\":\"$status\",\"error\":\"$err\",\"output\":$out}";
	}

	# Default is to just return output, but can print and exit now
	if ($args->{_printAndExit}) {
		print "Content-type: $args->{_mime}\n\n";
		print $output;
		exit (0);
	} else {
		return $output;
	}
}
			
sub prepout {
    my ($self,$out,$args) = @_;

	$self->_prepareOutput($out, "", STATUS_OK, $args);
}

sub preperr {
    my ($self,$err,$args) = @_;

	# Prepend calling sub's name if not already provided
	if ($err !~ /^\[/) {
		$err = "[" . $self->_callersId(2) . "] $err";
	}

	$self->_prepareOutput("", $err, STATUS_ERROR, $args);
}

sub _prepareOutput {
    my ($self,$out,$err,$status,$args) = @_;
	my $output;

	$args = $self->_setOutputArgs($args);
	
	# An output/error/status envelope is default, but can be disabled.
	if ($args->{_envelope} == 0) {
		$output = $out;
	} else {
		$output =  { status => $status, error => $err, output => $out };
	}

	# Default output format is raw; json is optional.
	if ($args->{_format} eq "json") {
		if (ref($output)) {
			$output = to_json($output,  {canonical => 1, pretty => 1});
		} else {
			# scalar
			if ($output and $output !~ /^[{\[]/) {   # Not already in json format?
				$output = to_json( { 'value' => $output } );
			}
		}
	}

	# Default is to just return output, but can print and exit now
	if ($args->{_printAndExit}) {
		print "Content-type: $args->{_mime}\n\n";
		print $output;
		exit (0);
	}

	return $output;
}

# Make sure output-related args are set
sub _setOutputArgs {
	my ($self,$args) = @_;

	my $defaults = {
		'_envelope'     => 1,
		'_format'       => "raw",
		'_printAndExit' => 0,
		'_mime'         => "application/json" };

	# Arguments can be overridden in the prepout/err method call: prepout(out,args), but
	# fall back to the args provided to the new(args) method.
	$args = $self->{_args} if (not $args and $self->{_args});

	return $defaults if (not $args or not ref $args);

	if (not defined $args->{_envelope}) {
		$args->{_envelope} = $defaults->{_envelope};
	}
	if (not defined $args->{_format}) {
		$args->{_format} = $defaults->{_format};
	}
	if (not defined $args->{_printAndExit}) {
		$args->{_printAndExit} = $defaults->{_printAndExit};
	}
	if (not defined $args->{_mime}) {
		if (defined $args->{mime}) {
			$args->{_mime} = $args->{mime};
		} elsif ($args->{_format} eq "json") {
			$args->{_mime} = "application/json";
		} else {
			$args->{_mime} = "text/plain; charset=iso-8859-1";
		}
	}
	return $args;
}

# Return caller's module (or file) and subroutine name, for use in error reporting
sub _callersId {
	my $self = shift;
	my $uplevels = shift || 1;

	my @c = caller($uplevels);
	my $ret = $c[3];
	if ($ret =~ m/main::(.*$)/) {
		$ret = $c[1] . "::" . $1;
	}
	return	$ret;
}

1;
