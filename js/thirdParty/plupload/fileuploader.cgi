#!/usr/bin/perl
#Filename: fileuploader.cgi
#Author: Joel Martinez
#Date: 10 7 2011
#Description: Ajax handler for lc file xfer utility
BEGIN {
    # Number of levels down in the hierarchy this file is from the Lorenz root
    my $levelsFromLorenzRoot = 3;
    
    my $pathToInit = '../' x $levelsFromLorenzRoot . "init.pl";
    require $pathToInit;
    lorenzInit($levelsFromLorenzRoot);
}
use Lorenz::Server;
use Lorenz::Lftp;
use strict;
use CGI qw(:standard);
use JSON;
use File::Path qw(mkpath rmtree);

if(param('action')){
    if(param('action') eq 'transfer'){
        my $id = param('id') || die "Id not specified";
        my $host = param('host') || die "No host specified for upload";
        my $sinkDir = param('sinkDir') || die "No dir specified for upload";
        my $fileDir = getUserLorenzTmpDir().'/'.$id;
        my @files = getFiles($fileDir);
        
        eval{
			# Treat storage specially
			if ($host eq "storage" or $host eq "storage.llnl.gov") {
				my $defaultHost = getUserDefaultHost();
				my ($o,$e,$s) = Lftp::transferAllFiles ($defaultHost, $fileDir, $host, $sinkDir);
				if ($s and $e) {
					$@ = "file transfer failed: $e";
				}
			} else {
				moveFiles($host, $sinkDir, @files);
			}
        };
        if($@) {
            die "Moving files failed: $@";
        }        
        
        rmtree($fileDir);
        
        success("Transfer complete");
    }
    elsif(param('action') eq 'clean'){
        my $id = param('id') || die "Id not specified";
        my $fileDir = getUserLorenzDir().'/tmp/'.$id;
        
        rmtree($fileDir);
        
        success("Clean complete");
    }
}
else{
    my $chunks = defined param('chunks') ? param('chunks') : 0;
    my $chunk = defined param('chunk') ? param('chunk') : 0;
    my $batchId = param('batchId') || die ("Must specify a batch id");
    my $fileName = param('name') || die ('Must specifiy a file name');
    my $FH = upload('file') || die "No file sent";
    my $uploaddir = getUserLorenzDir().'/tmp/'.$batchId;
    my $filePath = $uploaddir.'/'.$fileName;
    
    eval{
        if(!-e $uploaddir){
            mkpath($uploaddir);
        }
    };
    if($@){
        die "Failed making directory $uploaddir. $@";
        exit;
    }
    
    if($FH){
        open(OUT, ">>$filePath") || die "Failed to open file: $!";
        binmode OUT;
        while(<$FH>){
            print OUT;
        }
        close OUT;
    }
    
    success("File successfully uploaded");
}

sub getFiles{
    my $dir = shift;
    my @files = ();
    
    opendir (DIR, $dir) or die $!;
    while (my $file = readdir(DIR)) {
        next if $file =~ /^\./;
        
        $file =~ s/\s/\\ /g;
        
        push(@files, $dir.'/'.$file);
    }
    closedir DIR;
    
    return @files;
}

sub success{
    my $out = shift;
    print header('application/json');
    print to_json({success => JSON::true, output => $out});
    exit;
}
