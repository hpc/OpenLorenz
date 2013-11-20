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

package Lorenz::REST::Support;

#===============================================================================
#								Support.pm
#-------------------------------------------------------------------------------
#  Purpose:		Lorenz utility functions -- reporting errors, etc.
#  Author:		Jeff Long, 7/14/2011
#  Notes:
#		See the individual subs for more modification history info.
#
#  Modification History:
#		07/14/2011 - jwl: Initial version
#===============================================================================

use strict;
use Date::Manip;
use Date::Parse;
use HTML::Entities;
use Lorenz::Config;
use Lorenz::User;
use Lorenz::Util;
use Lorenz::DependencyManager;
use Lorenz::REST::RESTHandler;

use vars qw(@ISA);
@ISA = ("Lorenz::REST::RESTHandler");

our (@ISA, @EXPORT);
BEGIN {
	require Exporter;
	@ISA = qw(Exporter);
	@EXPORT = qw(reportError);
}

my %conf = Lorenz::Config::getLorenzConfig();


#======================================================================
#  /support/reportError - Report an error to lorenz developers
#======================================================================

sub reportError {
	my ($self,$args) = @_;
	my $self = shift;

	my $user = Lorenz::User->getUsername();
	
	if($main::isProduction && errorReportingActive() && !userIgnored($user)){
		$self->preperr("Insufficient details provided")
		  if (not $self->{errorBody} or
			  not $self->{context} or
			  not $self->{url});
	
		my $from = 'LorenzErrorReport@your.site.here';
        my $replyTo = Lorenz::User->getUserEmail($user);
		my $date = `/bin/date`; chomp $date;
		my $subj = $self->{admin} ? "LORENZ ADMIN ERROR REPORT for user $user" : "LORENZ USER ERROR REPORT from user $user";
		
		my $msg = $self->getReportStyles().$self->buildReportBody($user, $date);
		my $to = $conf{errorEmailAddress};

		sendEmail($from, $to, $subj, $msg, 'text/html', $replyTo);
	}
	else{
		$self->prepout('Failed sending error report. Either not production, user is listed in userErrorIgnore file, or error reporting not active in: '.$conf{adminErrorFile});
	}
}

sub userIgnored{
	my $user = shift;
	
	my $file = $conf{userIgnoredFile};
	
	if(-e $file && -r $file){
		my $found = 0;
		
		open(IN, $file) || return 0;
		my $users = join('', <IN>);
		close IN;
		
		$users =~ s/\s//g;
		
		my @uList = split(',', $users);
		
		foreach(@uList){
			if($user eq $_){
				$found = 1;
				last;
			}
		}
		
		return $found;
	}
	else{
		return 0;
	}
}

sub errorReportingActive{
	my $file = $conf{adminErrorFile};
	
	#PUT SOMETHING IN THE FILE TO TURN OFF ERROR REPORTING
	if(-e $file && (-s $file > 0)){
		return 0;
	}
	else{
		return 1;
	}
}

sub getReportStyles{
	return "
		<style>
			table, td, th{
				border-color: black;
				border-style: solid;
			}
			
			table{
				font-family: \"century gothic\", arial;
				border-width: 0 0 1px 1px;
				border-spacing: 0;
				border-collapse: collapse;
			}
			
			td, th {
				padding: 4px;
				border-width: 1px 1px 0 0;				
			}
			
			thead th{
				text-align: left;
				background-color: black;
				color: white;
				font-size:26px;
			}
		</style>
	";
}

sub buildReportBody{
	my ($self, $user, $date) = @_;
	
	return "		
		<table>
			<thead>
				<tr>
					<th colspan=2>Lorenz Error Report</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td style='font-weight: bold;'>User:</td>
					<td>$user</td>
				</tr>
				<tr>
					<td style='font-weight: bold;'>Date:</td>
					<td>$date</td>
				</tr>
				<tr>
					<td style='font-weight: bold;'>URL:</td>
					<td>$self->{url}</td>
				</tr>
				<tr>
					<td style='font-weight: bold;'>Browser:</td>
					<td>$self->{browserName}, $self->{browserVersion}</td>
				</tr>
				<tr>
					<td style='font-weight: bold;'>Platform:</td>
					<td>$self->{platform}</td>
				</tr>
				<tr>
					<td style='font-weight: bold;'>UserAgent:</td>
					<td>$self->{userAgent}</td>
				</tr>
				<tr>
					<td style='font-weight: bold;'>Context:</td>
					<td>$self->{context}</td>
				</tr>
				<tr>
					<td style='font-weight: bold;'>Error:</td>
					<td>".encode_entities($self->{errorBody})."</td>
				</tr>
			</tbody>
		</table>
	";
}

#======================================================================
#  /support/defaultLinks - Retrieve default links for 'my links' portlet
#======================================================================

sub defaultLinks {
	my ($self,$args) = @_;
	my $self = shift;

	my @objs = ();

	push @objs, { 'text' => "Here is a link",
				  'url'  => "http://www.llnl.gov" };

	$self->prepout(\@objs);
}

#======================================================================
#  /support/network - Return network info for this installation
#======================================================================

sub getNetworkInfo {
	my ($self,$args) = @_;
	my $self = shift;

	my $obj = {
			   "network" => $conf{network},
			   "lc_zone" => $conf{lc_zone}
			  };
	return $self->prepout($obj);
}

#======================================================================
#  /email - General purpose email sending REST endpoint
#======================================================================

sub send {
	my ($self,$args) = @_;
	my $self = shift;

	$self->preperr("Insufficient details provided")
	  if (not $self->{to} or
		  not $self->{subject} or
		  not $self->{body});


	my $user = Lorenz::User->getUsername();
	my $from = Lorenz::User->getUserEmail($user);
	my $date = `/bin/date`; chomp $date;

	sendEmail($from, $self->{to}, $self->{subject}, $self->{body});
}

#======================================================================
#  /noop
#======================================================================

sub noop{
	my ($self,$args) = @_;
	return $self->prepout('');
}

#======================================================================
#  /lora/endpoints
#======================================================================

sub listEndpoints {
	my ($self,$args) = @_;

    my @table = Lorenz::Config::getLorenzDispatchTable();
	my @endpoints=();

	for (my $i=0; $i < scalar(@table); $i+=2) {
		if ($table[$i] !~ /\*/) {
            $table[$i] =~ s/\[.*\]//g;
			push @endpoints, $table[$i];
		}
	}
    
    my @unique = makeUnique(\@endpoints);

    return $self->prepout(\@unique);
}

sub makeUnique {
    my $endpoints = shift;
    my %unique = ();
    
    foreach my $ep (@$endpoints) {
      $unique{$ep} = 1;
    }
    
    return sort keys(%unique);   
}

#======================================================================
#  /support/getCredentialLifetime - Return time user's credentials
#		will expire on the web server
#======================================================================

sub getCredentialLifetime {
	my ($self,$args) = @_;

	# Change this to get the expiration date of your credentials; this
	# is just for demo purposes.

	my $dt = `date +%m/%d/%y %T`; chomp $dt;
	my $err="";
	my ($startDay,$startTime,@junk) = split /\s+/, $dt;
	my $expireTime = DateCalc("$startDay $startTime", "+ 12hours", \$err);

	my $obj = {
			   "startDate"     => "$startDay $startTime",
			   "startDate_ms"  => Date::Manip::UnixDate("$startDay $startTime", "%s") * 1000,
			   "expireDate"    => "$expireTime",
			   "expireDate_ms" => Date::Manip::UnixDate($expireTime, "%s") * 1000
			  };
	return $self->prepout($obj);
}

sub getLorenzAlert{
	my ($self,$args) = @_;
	
	if(Lorenz::Config->isLorenzAdmin()){
		my $alertPath = $main::isProduction ? $conf{lorenzAlertFile} : $conf{devLorenzAlertFile};
		
		if(-e $alertPath && -r $alertPath){
			open(IN, "<$alertPath") || $self->preperr("Couldnt open alert file $alertPath: $!");
			my $alert = join('', <IN>);
			close IN;
			
			return $self->prepout({alert=>$alert});
		}
		else{
			return $self->prepout({alert=>''});	
		}
	}
	else{
		return $self->preperr('Only Lorenz admins may use this endpoint');
	}
}

sub createLorenzAlert{
	my ($self,$args) = @_;
	
	if(Lorenz::Config->isLorenzAdmin()){
		my $alertPath = $main::isProduction ? $conf{lorenzAlertFile} : $conf{devLorenzAlertFile};
		
		my @data = <STDIN>;
		
		open(OUT, ">$alertPath") || $self->preperr("Couldnt open alert file $alertPath: $!");
		print OUT @data;
		close OUT;
		
		return $self->prepout("Alert file $alertPath successfully written");
	}
	else{
		return $self->preperr('Only Lorenz admins may use this endpoint');
	}
}

sub deleteLorenzAlert{
	my ($self,$args) = @_;
	
	if(Lorenz::Config->isLorenzAdmin()){
		my $alertPath = $main::isProduction ? $conf{lorenzAlertFile} : $conf{devLorenzAlertFile};
		
		open(OUT, ">$alertPath") || $self->preperr("Couldnt open alert file $alertPath: $!");
		print OUT '';
		close OUT;
		
		return $self->prepout("Alert file $alertPath successfully cleared");
	}
	else{
		return $self->preperr('Only Lorenz admins may use this endpoint');
	}
}

sub enableMyLC{
	my ($self,$args) = @_;

	if(Lorenz::Config->isLorenzAdmin()){
		my $disableFile = $main::isProduction ? $conf{mylcDisableFile} : $conf{devMylcDisableFile};
		
		if(-e $disableFile && -w $disableFile){
			unlink $disableFile;
			
			return $self->prepout("MyLC successfully enabled");
		}
		else{
			return $self->preperr("Unable to delete disable file $disableFile $!");
		}
	}
	else{
		return $self->preperr('Only Lorenz admins may use this endpoint');
	}
}

sub disableMyLC{
	my ($self,$args) = @_;

	if(Lorenz::Config->isLorenzAdmin()){
		my $disableFile = $main::isProduction ? $conf{mylcDisableFile} : $conf{devMylcDisableFile};
		
		open(OUT, ">$disableFile") || $self->preperr("Couldn't open mylcDisableFile $disableFile. $!");
		print OUT <STDIN>;
		close OUT;
		
		return $self->prepout("Disable file successfully written");
	}
	else{
		return $self->preperr('Only Lorenz admins may use this endpoint');
	}
}

sub checkMyLCState{
	my ($self,$args) = @_;

	my $availability = Lorenz::DependencyManager::checkSiteAvailability();
	
	if($availability){
		return $self->prepout({state=>'disabled', msg=>$availability});
	}
	else{
		return $self->prepout({state=>'enabled'});
	}
}
1;


