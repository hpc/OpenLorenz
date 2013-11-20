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

package Lorenz::DependencyManager;

#===============================================================================
#                                   DependencyManager.pm
#-------------------------------------------------------------------------------
#  Purpose:     Maintain and manage Lorenz App dependencies
#  Author:      Joel Martinez, 5/12/2011
#  Notes:
#       See the individual subs for more modification history info.
#===============================================================================

use strict;
use Exporter;
use CGI qw(:standard);
use HTTP::BrowserDetect;
use HTML::Template;
use Lorenz::Config;
use Lorenz::Store;
use Lorenz::Util;
use Lorenz::REST::Store;

use vars qw($VERSION @ISA @EXPORT @EXPORT_OK %EXPORT_TAGS);
@ISA         = qw(Exporter);
@EXPORT      = (); #export by default

#export by tag
%EXPORT_TAGS = (
    'standard' => [
        qw(
            getTemplate
            getMobileTemplate
            outputTemplate
			getLorenzApps
            isMobileDevice
		)
    ],
	'compiler' => [
		qw(
			buildAppsJs
			buildGlobalJs
			changePerms
			buildLorenz
            buildCSS
		)
	]
);

@EXPORT_OK   = (@{$EXPORT_TAGS{'standard'}}, @{$EXPORT_TAGS{'compiler'}}); #export by request

my %conf = getLorenzConfig();

#Paths
my $serverBase = '/usr/global/web-pages/lc/www';
my $lorenzRoot = $main::lorenzRootDir;
my $lorenzRootUrl = $main::lorenzRootUrl;
my $pathToCompiler = $lorenzRoot.'/build/closure-compiler/compiler.jar';
my $pathToCssCompressor = $lorenzRoot.'/build/minify/min_extras/cli/minify.php';
my $pathToPhp = '/usr/bin/php';
my $pathToJava = '/usr/global/tools/sdm/java/Linux/x86_64/java6/bin/java';
my $pathToYuiCompressor = $lorenzRoot.'/build/yuicompressor/build/yuicompressor-2.4.7.jar';
my $pathToJS = $lorenzRootUrl.'/js';
my $cssPath = $lorenzRootUrl.'/css';
my $baseTemplatePath = $lorenzRoot.'/templates';
my $pathToJquery = $pathToJS.'/jquery';
my $pathToJqueryUIRoot = $pathToJS.'/jqueryui';
my $pathToJqueryUI = $pathToJqueryUIRoot.'/1.9.1';
my $pathToJqueryUIPreRelease = $pathToJqueryUIRoot.'/1.9m6';
my $pathToGlobals = $pathToJS.'/globals';
my $pathToObjects = $pathToJS.'/objects';
my $pathToSupportedPortlets = $pathToJS.'/portlet/supported';
my $pathToThirdParty = $pathToJS.'/thirdParty';
my $jqueryUIcssPath = $pathToJqueryUIRoot.'/1.9.1/css';
my $jqueryUIFile = 'jquery-ui.css';
my $absoluteJsPath = $lorenzRoot.'/js';
my $absoluteJqueryUIPath = $absoluteJsPath.'/jqueryui';
my $absoluteJqueryUICssPath = $absoluteJqueryUIPath.'/1.9.1/css';

#Outputs
my $lorenzGlobalsOutput = $pathToGlobals.'/lorenzGlobals.compiled.js';
my $lorenzGlobalCssOutput = $cssPath.'/lorenzGlobalCss.compiled.css';

#DEFAULT LORENZ THEME#
my $defaultTheme = 'lorenz-default';

#The users theme
my $theme = '';

#Global var to determine if file system is available
my $fileSystemUnavailable = 0;

#Global Dependencies
my @globals = (
    {jsFile => $pathToJquery.'/jquery-1.8.2.min.js'},
    {jsFile => $pathToGlobals.'/uibackcompat.js'},
    {jsFile => $pathToJqueryUI.'/js/jquery-ui-1.9.1.custom.min.js'},
    {jsFile => $pathToGlobals.'/fadeBox.js'},
	{jsFile => $pathToObjects.'/Object.js'},
	{jsFile => $pathToObjects.'/Prompt.js'},
	{jsFile => $pathToJquery.'/parseQuery/jquery.parseQuery.js'},
    {jsFile => $pathToObjects.'/Lorenz.js'}, 
    {jsFile => $pathToGlobals.'/headerInfo.js'},
    {jsFile => $pathToGlobals.'/json2.js'},
    {jsFile => $pathToJquery.'/preloadCssImages/preloadCssImages.js'}
);

# Mobile Paths
my $pathToJqueryMobile = $pathToJS. '/jquerymobile/1.1.0';
my $pathToJqueryMobileCss = $pathToJqueryMobile. '/css';
my $pathToMobile = $lorenzRootUrl. '/m';

# Mobile global dependencies
my @mobileGlobals = (
    {jsFile => $pathToJquery.'/jquery-1.8.2.min.js'},
    {jsFile => $pathToObjects.'/Object.js'},
    {jsFile => $pathToObjects.'/Lorenz.js'},
    {jsFile => $pathToJquery.'/parseQuery/jquery.parseQuery.js'},
    {jsFile => $pathToJqueryMobile.'/js/jquery.mobile.js'},
    {jsFile => $pathToThirdParty.'/amplify/amplify.core.js'},
    {jsFile => $pathToThirdParty.'/amplify/amplify.store.js'}
);

# Mobile-specific dependencies
my @mobileGlobalCss = (
    {cssFile => $pathToJqueryMobileCss.'/jquery.mobile.css'}
);

#jquery ui theme css is statically included in the top of the page
#so that the rest of the css can be compiled into one file on prod
#and we can use the theme switcher to select the specific css link tag
#holding the theme css file via an id
my @globalCss = (
	{cssFile => $cssPath.'/reset.css'},
	{cssFile => $cssPath.'/prompt.css'},
	{cssFile => $cssPath.'/lorenz.css'}	
);

#App specific dependencies
my %apps = (
    mylc => {
        js => [
            {jsFile => $pathToJquery.'/sparkline/jquery.sparkline.min.js'},
            {jsFile => $pathToThirdParty.'/swfobject/swfobject.js'},     
            {jsFile => $pathToJquery.'/datatables/js/jquery.dataTables.min.js'},
            {jsFile => $pathToJquery.'/datatables/js/jquery.dataTables.fnPagingInfo.js'},
            {jsFile => $pathToJquery.'/datatables/TableTools/media/js/ZeroClipboard.js'},
            {jsFile => $pathToJquery.'/datatables/TableTools/media/js/TableTools.min.js'},
            {jsFile => $pathToJquery.'/datatables/ColVis/media/js/ColVis.min.js'},
            {jsFile => $pathToJquery.'/highcharts/js/highcharts.js'},
			{jsFile => $pathToJquery.'/tmpl/jquery.tmpl.min.js'},
            {jsFile => $pathToJquery.'/lcPersonAutocomplete/lcPersonAutocomplete.js'},
            {jsFile => $pathToSupportedPortlets.'/portlet.js'},
			{jsFile => $pathToSupportedPortlets.'/accounts.js'},
			{jsFile => $pathToSupportedPortlets.'/groups.js'},
			{jsFile => $pathToSupportedPortlets.'/banks.js'},
			{jsFile => $pathToSupportedPortlets.'/machineLoad.js'},
			{jsFile => $pathToSupportedPortlets.'/clusterUtilization.js'},
			{jsFile => $pathToSupportedPortlets.'/news.js'},
			{jsFile => $pathToSupportedPortlets.'/diskQuota.js'},
			{jsFile => $pathToSupportedPortlets.'/links.js'},
			{jsFile => $pathToSupportedPortlets.'/cpuUsage.js'},
			{jsFile => $pathToSupportedPortlets.'/command.js'},
			{jsFile => $pathToSupportedPortlets.'/jobs.js'},
			{jsFile => $pathToSupportedPortlets.'/licenseStatus.js'},
			{jsFile => $pathToSupportedPortlets.'/machineStatus.js'},
			{jsFile => $pathToSupportedPortlets.'/lcLookup.js'},
            {jsFile => $pathToSupportedPortlets.'/loginNode.js'},
            {jsFile => $pathToSupportedPortlets.'/processViewer.js'},
            {jsFile => $pathToObjects.'/PortletControls.js'},
			{jsFile => $lorenzRootUrl.'/mylc/scripts/mylc.js'}
        ],
		css => [
			{cssFile => $lorenzRootUrl.'/mylc/css/mylc.css'},
			{cssFile => $pathToJquery.'/datatables/css/demo_table_jui.css'},
            {cssFile => $pathToJquery.'/datatables/TableTools/media/css/TableTools_JUI.css'},
            {cssFile => $pathToJquery.'/datatables/ColVis/media/css/ColVis.css'},
			{cssFile => $lorenzRootUrl.'/css/portlet.css'}
		],
		title => 'My Lorenz Dashboard',
		template => $lorenzRoot.'/mylc/templates/mylc.tmpl',
        compiledJs => $lorenzRootUrl.'/mylc/scripts/mylc.compiled.js',
		compiledCss => $lorenzRootUrl.'/mylc/css/mylc.compiled.css',
    },
	
    jobManagement => {
        js => [
			{jsFile => $pathToJquery.'/contextMenu/jquery.contextMenu.js'},			
			{jsFile => $pathToJquery.'/tmpl/jquery.tmpl.min.js'},
			{jsFile => $pathToJquery.'/fileTree/fileTree.js'},            
            {jsFile => $pathToThirdParty.'/swfobject/swfobject.js'},     
            {jsFile => $pathToJquery.'/datatables/js/jquery.dataTables.min.js'},
            {jsFile => $pathToJquery.'/datatables/TableTools/media/js/ZeroClipboard.js'},
            {jsFile => $pathToJquery.'/datatables/TableTools/media/js/TableTools.min.js'},
            {jsFile => $pathToJquery.'/datatables/ColVis/media/js/ColVis.min.js'},
			{jsFile => $pathToThirdParty.'/dateJS/date.js'},
			{jsFile => $pathToThirdParty.'/dateJS/time.js'},
			{jsFile => $pathToJquery.'/datetimepicker/js/jquery-ui-timepicker-addon.js'},                                   			
            {jsFile => $lorenzRootUrl.'/jobManagement/scripts/JobManager.js'},
            {jsFile => $lorenzRootUrl.'/jobManagement/scripts/jobManagement.js'}
        ],
        css => [			
			{cssFile => $pathToJquery.'/datatables/css/demo_table_jui.css'},
            {cssFile => $pathToJquery.'/datatables/TableTools/media/css/TableTools_JUI.css'},
            {cssFile => $pathToJquery.'/datatables/ColVis/media/css/ColVis.css'},
			{cssFile => $pathToJquery.'/contextMenu/jquery.contextMenu.css'},
			{cssFile => $pathToJquery.'/fileTree/fileTree.css'},	
			{cssFile => $pathToJquery.'/datetimepicker/css/datetimepicker.css'},
            {cssFile => $lorenzRootUrl.'/jobManagement/css/jobManagement.css'}
		],
		title => 'Job Management',
        template => $lorenzRoot.'/jobManagement/templates/jobManagement.tmpl',
        compiledJs => $lorenzRootUrl.'/jobManagement/scripts/jobManagement.compiled.js',
		compiledCss => $lorenzRootUrl.'/jobManagement/css/jobManagement.compiled.css'
    }
);

sub getLorenzApps{
	return %apps;
}

sub getCurrentTheme{
    my $appName = shift;
    
    my $timedOut = 0;
    
    my $customPath = '';
    my $success = 0;
    my $attempts = 0;
    my $themePath = "$jqueryUIcssPath/$defaultTheme/$jqueryUIFile";
    
    #do this so we don't access the filesystem... mylcDisabled is the appname for our mylc-disabled.cgi script
    return $themePath if $appName eq 'mylcDisabled';
    
    my $themeStore = 'theme/lorenzTheme';
    
    local $SIG{ALRM} = sub {
        if($attempts == 2){
            $fileSystemUnavailable = 1;
            sendEmail('MyLCFatalError', $conf{errorEmailAddress}, 'Lorenz getTheme Error!', 'ALRM signal was triggered in DependencyManager.pm getCurrentTheme.  This could mean home directories are currently unavailable.  Please check access. User: '.$ENV{REMOTE_USER});
        }
        
        die "alarm\n";
    };
    
    #make 3 attempts (3 seconds each) at accessing their home direcotry through Store->getStore()
    #which attemps to read their theme file... if we dont succeed after 3
    #we disable the site and send an email to the error team
    for($attempts = 0; $attempts < 3; $attempts++){
        eval{
            alarm 3;
            
            $customPath = '/'. Lorenz::Store->getStore($themeStore) .'/'.$jqueryUIFile;
            
            alarm 0;
            
            $success = 1;
            
            #check absolute path for existence, but return the web root relative path
            if(-e $absoluteJqueryUICssPath.$customPath){
                $themePath = $jqueryUIcssPath.$customPath;
            }
        };

        last if $success == 1;
    }
    
    return $themePath;
}

sub getTemplate{
    my $options = shift;
    
    $theme = getCurrentTheme($options->{appName});

    my $appname = $options->{appName};
    my $app = $apps{$appname};
    my $user = $ENV{REMOTE_USER};
    my $title = $app->{title};
    my @js = getAppsJs($app, $appname);
    my @css = (@globalCss, @{$app->{css}});
    my $templatePath = defined $options->{template} ? $options->{template} : $app->{template};
    my %tmplOpts = (filename => $templatePath, die_on_bad_params => 0);
    
    if(defined $options->{tmplOpts}){
        @tmplOpts{keys %{$options->{tmplOpts}}} = values %{$options->{tmplOpts}};
    }

    my $template = HTML::Template->new(%tmplOpts);    
    
    setWeather($template);
    
    $template->param(js => \@js);
    $template->param(css => \@css);
    $template->param(title => $title);  
    $template->param(user => $user);
    $template->param(webRoot => $lorenzRootUrl);

    $template->param(levelsFromRoot => defined $main::rootLevels ? $main::rootLevels : 1);
    
    $template->param(mylcSupportEmail => $conf{errorEmailAddress});
    $template->param(hotlineEmail => $conf{hotlineEmail});
    $template->param(accountSupportEmail => $conf{supportEmail});
    $template->param(lorenzAdmin => isLorenzAdmin());

    $template->param(isProduction => isProduction($app, $options));
    $template->param(compiledJs => $app->{compiledJs});
    $template->param(compiledCss => $app->{compiledCss});
    $template->param(currentThemePath => $theme);
    
    $template->param(lorenzBlurb => 'your gateway into HPC resources');
    $template->param(lorenzBrand => 'MyHPC');

    return $template;
}

sub setWeather{
    my $template = shift;

    $template->param(temperature =>'n/a &deg; F | n/a &deg; C');    
}

sub isProduction{
	my ($app, $options) = @_;
	
	my $isProduction = 0;
    
    if(defined param('dev') && param('dev')){
        $isProduction = 0;
    }
	#Only gonna allow potential for inclusion of compiled js/css if it exists and is readable
	elsif(defined $app->{compiledJs} && -e $serverBase.$app->{compiledJs} && -r $serverBase.$app->{compiledJs}
          && defined $app->{compiledCss} && -e $serverBase.$app->{compiledCss} && -r $serverBase.$app->{compiledCss}){
		if(defined $options->{prodOverride} && $options->{prodOverride}){
			$isProduction = 1;
		}
		elsif(defined param('prodOverride') && param('prodOverride')){
			$isProduction = 1;
		}
		else{
			$isProduction = $main::isProduction;
		}
	}
	
	return $isProduction;
}

sub outputTemplate{
    my $template = shift;
    
    print "Content-type: text/html\n\n".$template->output;
    exit;
}

sub getAppsJs{
    my $app = shift;
    my $appname = shift || 'mylc';
    
	my @js = ();
    
    if ($appname eq 'mylc-mobile') {
        @js = (@mobileGlobals, @{$app->{js}});
    } else {
        @js = (@globals, @{$app->{js}});
    }
    
	return @js;
}

sub buildLorenz{
    my $onlyApps = shift;

    if(defined $onlyApps){
        foreach my $oApp (@$onlyApps){
            if(defined $apps{$oApp}){
                print "Building $oApp JS\n";
                closureCompile(buildCompileString($oApp, $oApp), $serverBase.$apps{$oApp}->{compiledJs}, $oApp);
                
                print "Building $oApp CSS\n";
                buildCss(buildCssString($apps{$oApp}, $oApp),  $serverBase.$apps{$oApp}->{compiledCss}, $oApp)
            }
            else{
                print "Cannot find app $oApp.  No compiling will be performed for it.\n";    
            }
        }
    }
    else{
        foreach my $app (keys %apps){
            print "Building $app JS\n";
            
            closureCompile(buildCompileString($app, $app), $serverBase.$apps{$app}->{compiledJs});
            
            print "Building $app CSS\n";
            buildCss(buildCssString($apps{$app}, $app),  $serverBase.$apps{$app}->{compiledCss}, $app)
        }
    }
}

sub buildCssString{
    my $app = shift;
    my $appName = shift;
    
    my $toCompile = '';
    my @cssGlobals = $appName eq 'mylc-mobile' ? @mobileGlobalCss : @globalCss;

    my @css = (@cssGlobals, @{$app->{css}});
    
    foreach my $css (@css){
        my $fullPath = $serverBase.$css->{cssFile};
        
        $toCompile .= "$fullPath "; 
    }
    
    return $toCompile;
}

sub buildCss{
    my ($cssString, $outFile, $app) = @_;
    
    #first pass is through minify.php, which does url_rewriting and a first pass minification
    my $command = `$pathToPhp $pathToCssCompressor -t css -d /usr/global/web-pages/lc/www/ -o $outFile $cssString`;
    
    if($? == -1){
        print "Failed running css compile using minify for $app: $!\n";
    }
    
    #then we run it through YUI compressor, which does much more intelligent minification and optimizations
    my $yuiCommand = `$pathToJava -jar $pathToYuiCompressor --type css -o $outFile $outFile`;
    
    if($? == -1){
        print "Failed running css compile using YUI for $app: $!\n";
    }
}

sub buildCompileString{
    my $app = shift;
    my $appName = shift;
    
    my $deps = $apps{$app};    
    my $toCompile = '';
    
    my @js = getAppsJs($deps, $appName);
    
    foreach my $js (@js){
        my $fullPath = $serverBase.$js->{jsFile};
        
        $toCompile .= "--js $fullPath "; 
    }
    
    return $toCompile;
}

sub closureCompile{
	my ($jsString, $outputPath) = @_;
	
	my $output = `$pathToJava -jar $pathToCompiler $jsString --js_output_file $outputPath --warning_level QUIET`;	
}
