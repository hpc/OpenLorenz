#================================================================================
#  lorenz.pl -- 'require' this to set appropriate Perl paths for codes using 
#               Lorenz-related libraries.
#-------------------------------------------------------------------------------
#  Author:     Jeff Long
#  Notes:
#         CGI scripts should "require" this code in the BEGIN section to make
#         sure the root directory & url paths are set, and to make sure @INC
#         is set up correctly.
#
#         The main reason for all of this is to include the Lorenz init.pl file
#         associated with the version of Lorenz being used. If a Lorenz script
#         (dev/beta/prod) is the invoker, that version's init.pl will be used. If this 
#         is being invoked by a non-Lorenz script then the production version's
#         init.pl will be used.
#
#         THIS FILE IS USED ACROSS ALL PRODUCTION AND DEVELOPMENT VERSIONS, SO BE
#         SURE YOU KNOW WHAT YOU'RE DOING BEFORE EDITING THIS FILE!
#
#  Usage:
#
#         BEGIN {
#             require '/usr/global/tools/lorenz/lib/lorenz.pl';
#         }
#================================================================================

BEGIN {
	use FindBin qw($Bin);
	use File::Basename;
	my $d = $Bin;		    # d = absolute path to the directory containing the perl script being run

	# Top-level lorenz installation dirs
	my @lorenzDirs = ("/www/staged/www/lorenz",
					  "/usr/global/web-pages/lc/www/lorenz",
					  "/usr/global/web-pages/lc/www/lorenz_base");

	# Production dir varies between web server and cluster
	my $lorenzProdDir = (-e "/www/staged/www/lorenz") ? "/www/staged/www/lorenz" :
	                                                    "/usr/global/web-pages/lc/www/lorenz";
	my $levelsFromRoot = 0;

	#================================================================================
	# Option 1: we're inside an official Lorenz installation dir; use the init.pl
	#           associated with this installation.
	#================================================================================
	if (main::_beginsWith($d, @lorenzDirs)) {
		# We're in an official lorenz base dir, so assume this is a lorenz s/w component
		while ($d ne "/" and not -f "$d/init.pl") {
			$d = dirname($d);
			$levelsFromRoot++;
		}
		if ($d ne "/") {
			require "$d/init.pl";
			lorenzInit($levelsFromRoot);
			return;
		}
	}

	#================================================================================
	# Option 2: we're outside of an official Lorenz installation dir; use the init.pl
	#           associated with the production installation.
	#================================================================================
	$d = $lorenzProdDir;
	$main::lorenzRootDir = $main::lorenzRootUrl = $d;
	$main::lorenzRootUrl =~ s,^.*/lorenz,/lorenz,;
	$main::isProduction = 1;
	
	require "$d/init.pl";
	push @INC, "$main::lorenzRootDir/server/lib/perl";



	sub main::_beginsWith {
		# Return 1 if any item from list occurs at the beginning of patt
		my $patt = shift;
		my @list = @_;

		foreach my $item (@list) {
			if ($patt =~ /^$item/) {
				return 1;
			}
		}
		return 0;
	}
	
}

1;
