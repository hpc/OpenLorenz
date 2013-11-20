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

package Lorenz::LData;
#===============================================================================
#									LData.pm
#-------------------------------------------------------------------------------
#  Purpose:		Module for interacting with Lorenz data (in Redis or files)
#  Author:		Jeff Long, 10/10/2012
#  Notes:
#
#===============================================================================

use strict;
use Redis;
use Lorenz::Config;

use constant KEY_LIFETIME => 86400;   # One day

our (@ISA, @EXPORT);
BEGIN {
	require Exporter;
	@ISA = qw(Exporter);
	@EXPORT = qw();
}

my %conf = Lorenz::Config::getLorenzConfig();

sub new {
	my $proto = shift;
	my $class = ref($proto) || $proto;
	my %params = @_;
	my $self  = {};
	bless ($self, $class);

	# Defaults
	$self->{timeout} = 3;

	for my $att ( keys %params ) {
		$self->{$att} = $params{$att};
	}

	my $instance = (exists $self->{instance}) ? $self->{instance} : $conf{lc_zone};
	my $server   = (exists $self->{server})   ? $self->{server}   : $conf{defaultRedisServer};
	my $auth     = (exists $self->{auth})     ? $self->{auth}     : "";

	if (not defined $main::redis{$server}) {
		# Just use one shared Redis connection across entire app.
		eval {
			local $SIG{ALRM} = sub { die "timeout\n" }; # NB: \n required
			alarm $self->{timeout};
			$main::redis{$server} =  Redis->new (server => $server, encoding => undef);
			$main::redis{$server}->auth ($auth);
			alarm 0;
		};
		if ($@) {
			$main::redis{$server} = undef;
			warn ("REDIS connection failure from " . (caller)[0] . ":" . (caller)[2] . "\n");
		}
	}
	$self->{r} = $main::redis{$server};
	
	return $self;
}

sub set {
	my $self = shift;
	my $key = shift;
	my $value = shift;

	my $err="";

	# Put the info into Redis
	my $ok = $self->dbset($key, $value);

	# Put the info into a file only if the above failed
	if (not $ok) {
		$err = $self->fileset($key, $value);
	}

	return $err;
}

sub get {
	my $self = shift;
	my $key = shift;

	my $value="";

	# Try to retrieve info from Redis
	$value = $self->dbget($key);
	return $value if ($value);

	# If redis failed, try to retrieve info from file
	return ("ERROR: Value not found for $key in db or file") if (not -e "$conf{dataDir}/$key");
	$value = $self->fileget($key);

	return $value;
}

sub mget {
	my $self = shift;
	my @keys = @_;

	my @values=();

	# Keys can contain optional "wildcards" like %c, which expands to all clusters

	foreach my $key (_expandWildcards(@keys)) {

		push @values, $self->get($key);

	}
	return @values;
}

sub hmset {
	my $self = shift;
	my $key = shift;
	my %hash = @_;

	# Put the hash into Redis
	my $ok = $self->dbhmset($key, %hash);

	# jwl fixme: Add flat file equivalent function
	return $ok;
}

sub hgetall {
	my $self = shift;
	my $key = shift;

	# Read hash from Redis
	my %hash = $self->dbgetall($key);

	# jwl fixme: Add flat file equivalent function
	return %hash;
}

sub hget {
	my $self = shift;
	my $key = shift;
	my $hashkey = shift;

	# Read one hash value from Redis hash
	my $val = $self->dbhget($key, $hashkey);

	# jwl fixme: Add flat file equivalent function
	return $val;
}

sub get_ts {
	# Get data timestamp, in seconds since epoch
	my $self = shift;
	my $key = shift;

	# Try getting ts from redis, then from file
	my $ts = $self->dbget_ts($key);
	if ($ts == -1) {
		$ts = $self->fileget_ts($key);
	}
	return $ts;
}



sub dbset {
	# Write raw data to Redis
	my $self = shift;
	my $key = shift;
	my $value = shift;

	return undef if not ($self->{r} or not $key);

	# Set timestamp for this key
	$self->{r}->set("lorenz:${key}_ts" => time());

    # Set key itself
	return $self->{r}->set("lorenz:$key" => "$value");
}

sub dbhmset {
	# Write an entire hash to Redis
	my $self = shift;
	my $key = shift;
	my %hash = @_;

	return undef if not ($self->{r} or not $key);

	# Set timestamp for this key
	$self->{r}->set("lorenz:${key}_ts" => time());

	$self->{r}->hmset("lorenz:$key", $_, $hash{$_}, sub {}) for keys %hash;
	return $self->{r}->wait_all_responses;
}

sub dbget {
	# Get raw data from Redis
	my $self = shift;
	my $key = shift;

	return undef if not ($self->{r} or not $key);

	return $self->{r}->get("lorenz:$key");
}

sub dbhgetall {
	# Get hash data structure from Redis
	my $self = shift;
	my $key = shift;

	my %h = $self->{r}->hgetall("lorenz:$key");
	return %h;
}

sub dbhget {
	# Get one value from hash data structure from Redis
	my $self = shift;
	my $key = shift;
	my $hashkey = shift;

	my $val = $self->{r}->hget("lorenz:$key", $hashkey);
	return $val;
}

sub dbget_ts {
	# Get data timestamp, in seconds since epoch
	my $self = shift;
	my $key = shift;

	return -1 unless $self->{r};

	my $ttl = $self->{r}->get("lorenz:${key}_ts");
	if ($ttl) {
		return ($ttl);
	} else {
		return -1;
	}
}

sub fileset {
	# Write raw data to a Lorenz data file
	my $self = shift;
	my $key = shift;
	my $value = shift;

	my $outf = "$conf{dataDir}/$key";

	my $tmpf = "/tmp/lorenz-ldata-tmp.$$";
	unlink $tmpf if (-e $tmpf);

	open (F, ">$tmpf") or return ("ERROR: Could not open tmp file: $tmpf");
	print F $value;
	close F;

	system("/bin/rm -f $outf; /bin/mv $tmpf $outf; /bin/chmod 664 $outf; /bin/chgrp lorenz $outf");
	if ($? == -1) {
		return "ERROR: $!";
	}
}

sub fileget {
	# Read raw data from a Lorenz data file
	my $self = shift;
	my $key = shift;

	my $outf = "$conf{dataDir}/$key";

	return `cat $outf 2>&1`;
}

sub fileget_ts {
	# Get data timestamp, in seconds since epoch
	my $self = shift;
	my $key = shift;

	# Try getting last mod time from file
	my $f = "$conf{dataDir}/$key";
	if (-e $f) {
		chomp(my $t = `/usr/bin/stat -c%Y $f`);
		return $t;
	} else {
		return -1;
	}
}

sub keys {
	# Return list of keys matching given pattern; this only uses redis
	my $self = shift;
	my $patt = shift;

	return () if not ($self->{r});

	my @keys = $self->{r}->keys("lorenz:$patt");

	foreach (@keys) {
		s/^lorenz://;
	}
	
	return (@keys);
}

sub _expandWildcards {
	
	my @keys = @_;
	my @newkeys = ();
	foreach my $key (@keys) {
		if ($key =~ /\%c/) {
			foreach my $cluster (Lorenz::Cluster->getAllClusters()) {
				my $k = $key;
				$k =~ s/\%c/$cluster/;
				push @newkeys, $k;
			}
		} else {
			push @newkeys, $key;
		}
	}
	return @newkeys;
}


1;
