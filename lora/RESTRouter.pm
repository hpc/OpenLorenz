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

package RESTRouter;

###########################################################################
# $URL: 
# $Author: long6 $
# $Date: 2011-03-02 13:07:13 -0800 (Wed, 02 Mar 2011) $
# $Rev: 162 $
###########################################################################


#===============================================================================
#									RESTRouter.pm
#-------------------------------------------------------------------------------
#  Purpose:		Simple REST router implementation.
#  Author:		Jeff Long
#  Notes:
#===============================================================================

use strict;
use CGI;

our (@ISA, @EXPORT);
BEGIN {
	require Exporter;
	@ISA = qw(Exporter);
	@EXPORT = qw(addRoute addRoutes matchRoute listRoutes execMatch);
}

sub new {
	my $proto = shift;
	my $class = ref($proto) || $proto;
	my $self  = {};

	$self->{query} = CGI->new();
	$self->{routes} = ();
#	$self->{debug}=1; #jwl

	bless ($self, $class);
	return $self;
}

sub addRoute {
	my ($self,$route) = @_;

	$route->{via} = "get" unless (defined $route->{via});
	
	push @{$self->{routes}}, $route;
}

sub addRoutes {
	my ($self,@routes) = @_;

	foreach (@routes) {
		$self->addRoute($_);
	}
}

sub listRoutes {
	my $self = shift;

	foreach my $r (@{$self->{routes}}) {
		print "$r->{path}\n";
	}
}

sub matchRoute {
    my ($self,$uri,$reqmeth) = @_;

	my ($url,$queryargs) = $self->_validate_uri($uri);

	$reqmeth = $self->_validate_reqMethod($reqmeth);

    foreach my $route (@{$self->{routes}}) {

		next unless ($reqmeth eq lc($route->{via}));
		
		if (my $argref = $self->_url_matches($url, $route->{path})) {
			if ($queryargs) {
				# Don't overwrite a route arg with a query string arg
				foreach my $a (keys %{$queryargs}) {
					if (not defined $argref->{$a}) {
						$argref->{$a} = $queryargs->{a};
					}
				}
			}
			$route->{args} = $argref;
			return ($route);
		}
    }
	return undef;
}

sub execMatch {
	my ($self,$route) = @_;
	my $output="";
	my $error="";

	if (ref $route->{action} eq "CODE") {
		eval {
			$output = &{$route->{action}}($route->{args});
			print "eval got output=$output\n";
		};
		$error = $@;
	} else {
		my ($module,$method) = split '->', $route->{action};
		$error = $self->_validate_module($module,$method);

		if (not $error) {
			eval {
				my $app = $module->new($route->{args});
				$output = $app->$method($route->{args});
			};
			$error = $@;
		}
    }
	return ($output,$error);
}

sub _validate_module {
	my ($self,$module,$method) = @_;

	# Validate module
    $module or return("Module name not provided");
    ($module) = ($module =~ /^([A-Za-z][A-Za-z0-9_\-\:\']+)$/);  #untaint the module name

    unless($module) {
        return("Invalid characters in module name: $_[1]");
    }

    eval "require $module";
    if ($@) {
		my $module_path = $module;
		$module_path =~ s/::/\//g;

		if ($@ =~ /Can't locate $module_path.pm/) {
			return("Unable to locate module '$module'");
		} else {
			return("Unable to load module '$module': $@");
		}
	}

	if (not $module->can("new") ) {
		return ("module: $module missing new() method");
	}

	# Validate method
	if ($method) {
		# check for method existence
		if (not $module->can("$method") ) {
			return ("Invalid method: $method for module: $module");
		}
	}
	return "";
}


sub _validate_uri {
	my ($self,$url) = @_;

	$url =~ s,^(.*?lora\.cgi)/?,/,; # Remove non-REST portion of URL                                          
	$url =~ s,\?.*$,,;              # Strip off query params

	my %queryArgs=("format" => "json");
	if ($self->{query} and $self->{query}->param) {
		my @names = $self->{query}->param;
		foreach (@names) {
			warn "$_ = " . $self->{query}->param($_) . "\n" if ($self->{debug});

			my @tmp = $self->{query}->param($_);  # In case this is a multi-valued parameter                          
			$queryArgs{$_} = join ',', @tmp;
		}
	}

	return $url;
}

sub _validate_reqMethod {
	my ($self,$reqm) = @_;

    my @validReqMethods = ("get", "put", "post", "delete");

    $reqm = lc($reqm);
    if (! grep(/$reqm/, @validReqMethods)) {
        die("Invalid request method: $reqm\n" .
			"Must be one of: @validReqMethods\n");
    }
	return $reqm;
}

sub _url_matches {
	my ($self,$url,$route) = @_;

    my %named_args=();           # Named args matched in URL regex                                         
	my @names = ();

	# translate the rule into a regular expression, but remember where the named args are
	# '/:foo' will become '/([^\/]*)'
	# and
	# '/:bar?' will become '/?([^\/]*)?'
	# and then remember which position it matches

	$route =~ s{
            (^|/)                 # beginning or a /
            (:([^/\?]+)(\?)?)     # stuff in between
        }{
            push(@names, $3);
            $1 . ($4 ? '?([^/]*)?' : '([^/]*)')
	}gxe;

	# '/*/' will become '/(.*)/$' the end / is added to the end of
	# both $route and $url elsewhere
	if($route =~ m{/\*$}) {
		$route =~ s{/\*$}{/(.*)\$};
		push(@names, 'url_remainder');
	}

	if(my @values = ($url =~ m#^$route$#)) {
            warn "[url_matches] Matched!\n" if $self->{debug};

            my %named_args = ();
            @named_args{@names} = @values if @names;

            return \%named_args;
	}
	return 0;
}

1;
