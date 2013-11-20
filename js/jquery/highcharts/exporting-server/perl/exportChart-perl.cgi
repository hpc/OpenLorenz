#!/usr/bin/perl
use CGI qw(:standard);
use strict;
use warnings;

#Set this to your batik jar path
my $batikPath = '/usr/global/tools/lorenz/batik/batik-rasterizer.jar';

my $type = param('type');
my $svg = param('svg');
my $filename = param('filename') || 'chart';
my $tmpName = time;
my $typeString = '';
my $ext = '';
my $width = '';

if ($type eq 'image/png') {
	$typeString = '-m image/png';
	$ext = 'png';
	
} elsif ($type eq 'image/jpeg') {
	$typeString = '-m image/jpeg';
	$ext = 'jpg';

} elsif ($type eq 'application/pdf') {
	$typeString = '-m application/pdf';
	$ext = 'pdf';

} elsif ($type eq 'image/svg+xml') {
	$ext = 'svg';	
}

my $outfile = "/tmp/$tmpName.$ext";

if ($typeString) {
	if (param('width')) {
		$width = param('width');
		if ($width) {
            $width = "-w $width";
        }
	}

	# generate the temporary file
    open(OUT, ">/tmp/$tmpName.svg") or die "Couldn't open tmp svg file /tmp/$tmpName.svg: $!";
    print OUT $svg;
    close OUT;
		
	# do the conversion
	my $output = `java -jar $batikPath $typeString -d $outfile $width /tmp/$tmpName.svg`;
	
	# catch error
	if (!-e $outfile || -s $outfile < 10) {
		die "$outfile was not successfully written during batik conversion: $?";
	} 	
	# stream it
	else {
		print "Content-Disposition: attachment; filename=\"$filename.$ext\"\n";
		print "Content-Type: $type\n\n";
		open(IN, $outfile) or die "Couldn't open $outfile for writing: $!";
        print join('', <IN>);
        close IN;
	}
	
	# delete it
	unlink "/tmp/$tmpName.svg";
	unlink $outfile;
}
# SVG can be streamed directly back
elsif ($ext eq 'svg') {
	print "Content-Disposition: attachment; filename=\"$filename.$ext\"\n";
	print "Content-Type: $type\n\n";
	print $svg;
}
else {
	die "No image type specified to script";
}