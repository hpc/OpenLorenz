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

package Lorenz::REST::Portlet;

#===============================================================================
#									Portlet.pm
#-------------------------------------------------------------------------------
#  Purpose:		Class for handling portlet related queries
#  Author:		Joel Martinez, 8/18/2011
#
#  Modification History:
#		08/18/2011 - jjm: Initial version
#===============================================================================

use strict;
use Lorenz::Portlet;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");


#==================================================
#  /portlet/getAllPortletConf
#==================================================

sub getAllPortletConf{
	my ($self,$args) = @_;

	my ($portletConf,$err) = Lorenz::Portlet->getAllPortletConf();

	if (not $err) {
		$self->prepout($portletConf);
	} else {
		$self->preperr($err);
	}
}

#==================================================
#  /portlet/getCustomPortlets
#==================================================

sub getCustomPortlets{
    my ($self, $args) = @_;

	my $js = Lorenz::Portlet->getCustomPortlets();

	if (not $js) {
		$js = "//no custom portlets";
	}
    
    if ($args and defined $args->{return} and $args->{return} == 1){
        return $js;
    }
    else{
        print "Content-type: application/javascript\n\n";
        print $js;
        exit;
    }
}

#  Called by mylc.cgi
#  Pre-condition: must have already called getCustomPortlets

sub getCustomPortletsCss{
	my ($self, $args) = @_;

	my $css = Lorenz::Portlet->getCustomPortletsCss();
	
    if($args and defined $args->{return} and $args->{return} == 1){
        return $css;
    }
    else{
        print "Content-type: text/css\n\n";
        print $css;
        exit;
    }
}

