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

use strict;
use warnings;

print <<EOF;
Content-Type: text/html

<?xml version="1.0" encoding="iso-8859-1"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
   "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
    <title>MyLC Unavailable</title>
    <link rel="icon" type="image/png" href="/lorenz/images/favicon.png" />        
	<link id="jqueryUiCss" rel="StyleSheet" type="text/css" media="screen" href="/lorenz/js/jqueryui/1.8.13/css/lorenz-default/jquery-ui.css" />
    <link rel="StyleSheet" type="text/css" media="screen" href="/lorenz/css/reset.css" />
    <link rel="StyleSheet" type="text/css" media="screen" href="/lorenz/css/lorenz.css" />
    
</head>
<body>
    
<div class="wrapper">
	<input type="hidden" name="levelsFromLorenzRoot" value="1"/>
	
    <div class="ui-state-error" style="margin: 10px; padding: 10px; font-size: 14px;">
        <div style="text-decoration: underline;font-size: 22px; margin-bottom: 10px;">MyLC is currently unavailable</div>
        
        <div>
            LC is currently performing a file system upgrade on all OCF CZ systems.  Due to MyLC's heavy reliance on these systems, it will be unavailable during this time.  We anticipate the upgrade process will last approximately 3 hours starting at 7 a.m. on Wednesday, October 24th.  <br/><br/>For additional details about this upgrade please see <a href="https://lc.llnl.gov/computing/techbulletins/bulletin477.pdf">the technical bulletin</a>.
        </div>
    </div>
        
    
        <div class="ui-state-highlight" style="margin: 10px; padding: 10px; font-size: 14px;">
            Oh, hi there.  I see you're a Lorenz admin.  I suppose you want to enable the site now.  You can either:
			
			<ul style="list-style: disc; margin-left: 25px; margin-top: 10px;">
				<li><a id="reenableMylC" href="#">Click Here</a></li>
				<li>Delete the mylc disabled file (devMylcDisabled or mylcDisabled) in /usr/global/tools/lorenz/data</li>
				<li>Click "Re-Enable MyLC" from the <a href="/lorenz/utilities/apps/mylcAdmin/mylcAdmin.cgi">MyLC Admin utility</a></li>
			</ul>
        </div>
    
</div>
	
    <script type="text/javascript" src="/lorenz/js/jquery/jquery-1.7.2.js"> </script>

	<script>
        jQuery('#reenableMylC').click(function(e){
			jQuery.ajax({
                type: 'DELETE',
                url: '/lorenz/lora/lora.cgi/support/mylcToggle'
            })
            .done(function(o){
                if(o.status === 'OK'){
                    alert('MyLC successfully enabled.')
                    window.location.reload();
                }
                else{
                    alert(o.error);
                }
            });
			
			return false;
		})
	</script>
</body>
</html>
EOF
