// ===============================================================================
// Copyright (c) 2013, Lawrence Livermore National Security, LLC.
// Produced at the Lawrence Livermore National Laboratory.
// Written by Joel Martinez <martinez248@llnl.gov>, et. al.
// LLNL-CODE-640252
//
// This file is part of Lorenz.
//
// This program is free software; you can redistribute it and/or modify it
// under the terms of the GNU General Public License (as published by the
// Free Software Foundation) version 2, dated June 1991.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the IMPLIED WARRANTY OF
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// terms and conditions of the GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software Foundation,
// Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
// ===============================================================================

var oLorenz = Object.create(Lorenz);

$(document).ready(function(){
	browserCheck();
	
    updateClock();
    
    //clock updates every minute
    setInterval(updateClock, 60000);
 
    setNavEvents();
    
    buildThemeInput();
    
    buildFeedbackForm();
});


function browserCheck(){
    //IE8 reports itself as Trident/4.0... really only way to make sure it's IE8
    var trident = /Trident\/4\.0/g;
    
	if($.browser.msie && parseInt($.browser.version, 10) < 8 && !trident.test(navigator.userAgent)){
		alert('We have detected that you are using Internet Explorer (IE) version 7 or lower.  IE7 and below are NOT a supported browsers for Lorenz.  The page will not function properly and will not render correctly.  Please use Mozilla Firefox, Chrome, or Safari when trying to use Lorenz.');   
	}
}

function buildFeedbackForm(){
	var $to;
    var $prompt = $('<div></div>').prompt();        
    
    $("#giveFeedbackLink").bind('click', function(){
        $prompt.prompt('info', {
            title: 'Contact Us Form',
            width: 500,
            modal: true,
            buttons: {
                Send: function(){
                    var $subj = $('#feedbackSubject'),
                        $body = $('#feedbackBody');
                    
                    if(validateFeedbackForm($subj, $body, $to)){
                        showLoadingScreen();
                        
                        oLorenz.sendEmail($to.val(), $subj.val(), $body.val())
                            .done(function(){
                                var $success = $('<span class="feedbackSuccess">Successfully submitted! Thank you!</span>');
                                
                                $subj.val('');
                                $body.val('');
                                
                                $prompt.dialog('widget').find(".ui-dialog-content")
                                    .append($success);
                                    
                                setTimeout(function(){                                
                                    $success.fadeOut('slow');
                                }, 4000);
                            })
                            .fail(function(e){
                                $prompt.prompt('error', {
                                    friendlyError: 'There was a server side error sending your feedback.  Please click "send error report" below or email lorenz-info@your.site.here to notify the Lorenz team.  Thank you.',
                                    technicalError: e,
                                    location: 'Send Feedback'
                                });
                            })
                            .always(hideLoadingScreen);
                    }
                },
                Cancel: function(){
                    $(this).dialog('close');
                }
            }
        }, getFormMarkup());
		
		$to = $('#feedbackToEmail');

		$to.change(function() {			
			var e = getContactEmails(),
				selectedVal = $to.val();
			
			var msg = "<br />Support is provided Monday through Friday, 8:00 a.m. - noon, 1:00 - 4:45 p.m. For support off hours and weekends, please call 925-422-0484.";
			if (selectedVal === e.lcHotline || selectedVal === e.mylcSupport)  {
				$('#supportInfo').html(msg);
			} else {
				$('#supportInfo').html('');
			}
		});
    });
	
}

function validateFeedbackForm($subj, $body, $to){
    var valid = true;
    
    $('.feedbackError, .feedbackSuccess').remove();
    
    if($subj.val() === ''){        
        feedbackError($subj, '(Field cannot be blank)');

        valid = false;    
    }
    
    if($body.val() === ''){
        feedbackError($body, '(Field cannot be blank)');
        
        valid = false;
    }
	
	if ($to.val() === 'default') {
		feedbackError($to, '(Must select an issue)');
        
        valid = false;
	}
    
    return valid;
}

function feedbackError($input, msg){
    var $err = $('<span class="feedbackError" style="display:block">'+msg+'</span>');
    
    $input.after($err);
    
    setTimeout(function(){
        if($err.length){
            $err.fadeOut('slow');
        }
    }, 3000);
}

function getContactEmails() {
	var emails = {
        email1: 'changeme@yoursite.com',
        email2: 'changeme@yoursite.com',
        email3: 'changeme@yoursite.com'
    };
    
	return emails;
}

function getFormMarkup(){	
	var e = getContactEmails();
	
    return '\
        Please feel free to use the form below to contact the selected support team with any comments/questions. <hr width="100%"/> \
		<strong>Issue:</strong> \
		<select id="feedbackToEmail">\
			<option value="default">Please select an issue...</option>\
			<option value="'+e.email1+'">Change Issue 1</option>\
			<option value="'+e.email2+'">Change Issue 2</option>\
			<option value="'+e.email3+'">Change Issue 3</option>\
		</select>\
		<span id="supportInfo"></span>\
		<br/><br/>\
        <strong>Subject:</strong><br/><input type="text" size="64" id="feedbackSubject"/> <br/><br/> \
        <strong>Comments:</strong> <textarea rows="10" cols="76" id="feedbackBody"></textarea> \
    ';
}

function buildThemeInput(){
    var $select = buildThemeSelect(),
        currentTheme = getCurrentTheme();
		
    $select.change(function(){        
        var strippedTheme = $(this).val(),
            currentTheme = getCurrentTheme(),
            newTheme = currentTheme.elem.attr('href').replace(currentTheme.theme, strippedTheme);

        showLoadingScreen();
        
        currentTheme.elem.attr('href', newTheme);
        
        oLorenz.storeWrite('theme/lorenzTheme', {
            data: strippedTheme
        })
        .always(hideLoadingScreen)
        .done(function(){
            var $controls = $("#portletControls");
            
            if($controls.length > 0){
                $controls.data('portletControls').reRenderFromCache('all');    
            }
			
			$select.trigger("themeChange");
        })
        .fail(function(){
            alert("Failed to save theme!  Please email lorenz-info@your.site.here with this error. Thank you.");
        });
        
    }).val(currentTheme.theme);		
    
    $("#themeContainer").append($select);
}
        
function getCurrentTheme(){
    var $cssLink = $("#jqueryUiCss"),
            href = $cssLink.attr('href');
        
    return {
        theme: href.replace(/.*jqueryui\/.*\/css\/(.*)\/.*/g, '$1'),
        elem: $cssLink
    }
}
		
function buildThemeSelect(){
    var $select = $("<select id='lorenzThemeSelect'></select>"),
        themes = getLorenzThemes(),
        options = '';
    
    for(var theme in themes){
        options += '<option value='+theme+'>'+themes[theme]+'</option>';
    }
    
    return $select.append(options);
}
		
function getLorenzThemes(){
    return {
        'lorenz-default': 'Lorenz Default',
        'start': 'Start',
        'black-tie': 'Black Tie',
        'blitzer': 'Blitzer',
        'cupertino': 'Cupertino',
        'dark-hive': 'Dark Hive',
        'dot-luv': 'Dot Luv',
        'eggplant': 'Eggplant',
        'excite-bike': 'Excite Bike',
        'flick': 'Flick',
        'hopper': 'Hopper',
        'hot-sneaks': 'Hot Sneaks',
        'humanity': 'Humanity',
        'le-frog': 'Le Frog',
        'mint-choc': 'Mint Chocolate',
        'overcast': 'Overcast',
        'pepper-grinder': 'Pepper Grinder',
        'redmond': 'Redmond',
        'smoothness': 'Smoothness',
        'south-street': 'South Street',
        'sunny': 'Sunny',
        'swanky-purse': 'Swanky Purse',
        'trontastic': 'Trontastic',
        'ui-darkness': 'UI-Darkness',
        'ui-lightness': 'UI-Lightness',
        'vader': 'Vader'
    };
}

function setNavEvents(){
	var $nav = $("#navMenu"),
        $active;

	$active = $nav.find("li a[href='"+location.pathname+"']").parent('li');

    //ui states
    $nav.find('li').hover(function(){$(this).toggleClass("ui-state-hover")})
    
    $active.addClass('ui-state-active');
}

function updateClock(){
    var currentTime = new Date ( );

    var month = currentTime.getMonth() + 1;
    var day = currentTime.getDate();
    var year = currentTime.getFullYear(); 

    var currentHours = currentTime.getHours ( );
    var currentMinutes = currentTime.getMinutes ( );
  
    // Pad the minutes and seconds with leading zeros, if required
    currentMinutes = ( currentMinutes < 10 ? "0" : "" ) + currentMinutes;
  
    // Choose either "AM" or "PM" as appropriate
    var timeOfDay = ( currentHours < 12 ) ? "AM" : "PM";
  
    // Convert the hours component to 12-hour format if needed
    currentHours = ( currentHours > 12 ) ? currentHours - 12 : currentHours;
  
    // Convert an hours component of "0" to "12"
    currentHours = ( currentHours == 0 ) ? 12 : currentHours;
  
    // Compose the string for display
    var currentTimeString = currentHours + ":" + currentMinutes + " " + timeOfDay;
  
    // Update the time display
    $("#currDate").html(month + "/" + day + "/" + year + ' ' + currentTimeString);
}
