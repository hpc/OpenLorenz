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

#================================================================================
#  init.pl -- Lorenz CGI path/INC init code.
#-------------------------------------------------------------------------------
#  Author:		Jeff Long, 5/10/2011
#  Notes:
#	  CGI or server perl scripts should "require" this code in the BEGIN section to 
#	  make sure the root directory & url paths are set, and to make sure @INC
#	  is set up correctly.
#
#	  We support having a production lorenz directory and any number of separate
#	  development versions under a dev/ subdirectory. This code allows dev scripts
#	  to use the associated dev libraries, etc.
#  Usage:
#
#		Preferred:
#		Use a centralized lorenz.pl script that all perl apps making use of Lornez
#		will include in a BEGIN block. E.g.:
#		BEGIN {
#          require '/usr/global/tools/lorenz/lib/lorenz.pl';
#		}
#
#		The lorenz.pl script properly invokes the init.pl script in each Lorenz dir.
#		An example lorenz.pl is included in this directory.
#
#================================================================================


# Absolute path inclusions...

push @INC, "/collab/usr/global/tools/lcweb/perl/share/perl5";
push @INC, "/collab/usr/global/tools/lcweb/perl/lib/perl5";
push @INC, "/collab/usr/global/tools/lcweb/perl/lib/perl5/site_perl/5.8.8";
push @INC, "/collab/usr/global/tools/lcweb/perl/lib64/perl5/site_perl/5.8.8/x86_64-linux-thread-multi";
push @INC, "/collab/usr/global/tools/lcweb/perl/lib/perl5/site_perl/5.8.8/json";
#push @INC, "/collab/usr/global/tools/lcweb/perl/lib64/perl5";


# Relative path inclusions, invoked by caller's BEGIN section...

sub lorenzInit {
	my $levelsFromRoot = shift;
    
	my $prodPath = '/usr/global/web-pages/lc/www/lorenz_base/prod/current';
    
	$levelsFromRoot = defined $levelsFromRoot ? $levelsFromRoot : 1;
	
	$main::rootLevels = $levelsFromRoot;
	
	use FindBin qw($Bin);
	use File::Basename;

	my $d = $Bin;
	for (my $i=0; $i<$levelsFromRoot; $i++) {
		$d = dirname($d);
	}
	
	$main::lorenzRootDir = $main::lorenzRootUrl = $d;
	$main::lorenzRootUrl =~ s,^.*?/lorenz,/lorenz,;

	push @INC, "$main::lorenzRootDir/server/lib/perl";

    if($main::lorenzRootDir eq readlink $prodPath || $main::lorenzRootDir =~ /^\/www\/staged/){
        $main::isProduction = 1;
    }
    else{
        $main::isProduction = 0;
    }
}


1;
