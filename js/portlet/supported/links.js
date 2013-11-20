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

(function($) {
    $.widget("lorenz.links", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'my links',
            mySettings: {
                buttonPadding: 2
            }
        },
        
        defaultLinks: [],
        
        linkStore: 'portletConf/userLinks',

        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
			var oLorenz = this.oLorenz;
			
            return [ oLorenz.getUserLinks(), oLorenz.getDefaultLinks()];
        },
        
        render: function(response, defaultLinks) {            
            var obj = this;
			
            obj.$wrapper.empty();
            
            var $ul = $('<ul id = "portletUserLinks"></ul>');           
            
            if(response){              
                var links = response.split('_++_');
            
                for(var i = 0, il = links.length; i < il; i++){
                    var link = links[i];
         
                    if(link){
                        link = JSON.parse(link);
      
                        var $li = $('<li id = "li_'+link.text.replace( /\"/g, "&quot;")+'"><a href = "'+link.url.replace(/\"/g, "&quot;")+'" target="_blank">'+obj._escapeHtml(link.text)+'</a></li>');
                        $ul.append($li);
                    }               
                }
            }
            else{
                var $li = $('<li id = "no_links">No user links found.</li>');
                $ul.append($li);
            }
            
            var $addButton = obj._createLinkAddButton();           
            
            var $orgButton  = obj._createOrganizeLinkButton();    
            
            obj.$wrapper.append('<span style = "font-weight: bold; font-size: 1.2em;">LC Links</span>', '<hr width = "100%" />', '<span style = "font-weight: bold; font-size: 1.2em;">Custom Links</span>', $ul, $addButton, $orgButton);
			
			obj._populateDefaultLinks(defaultLinks);
        },
          
        _populateDefaultLinks: function(response){
			var obj = this,
				lcLinks = response;
				$defaultUl = $('<ul id = "portletDefaultLinks"></ul>');				
				
			for(var j = 0, jl = lcLinks.length; j < jl; j++){
                var link = lcLinks[j];
                
                var $li = $('<li id = "li_'+link.text.replace( /\"/g, "&quot;")+'"><a href = "'+link.url.replace(/\"/g, "&quot;")+'" target="_blank">'+link.text+'</a></li>');
                
                $defaultUl.append($li);
            }
			
			obj.$wrapper.find('hr').before($defaultUl);
		},
        
        _createOrganizeLinkButton: function(){
            var obj = this;           
            
            var $orgButton = $('<button>edit links</button>').css({marginTop: '10px'}).button().click(function(e){               
                var $linksClone = obj.$wrapper.find('#portletUserLinks').clone().attr('id', 'portletUserLinks_clone').addClass('portlet-organizeLinkUl');
                
                var $deleteLink = obj._buildLinkDelete(),
                    $editLink = obj._buildLinkEdit();
                
                $linksClone.find('li')
                    .remove('#no_links')
                    .addClass('ui-state-default portlet-linkOrganizeContainer')              
                    .prepend('<span class="ui-icon ui-icon-arrowthick-2-n-s portlet-linksOrganizeIcon"></span>')
                    .append($deleteLink)
                    .append($editLink)
                    .find('a')
                    //disable the link
                    .click(function(e){return false});

                var organizeSettings = {
                    title: 'Edit links',
                    width: 400,
                    position: obj._getMouseXY(e),
                    buttons: {
                        save: $.proxy(obj, '_editLinkSave'),
                        cancel: function(){
                            $(this).dialog('close');
                    }
                }};
                
                obj._toggleDialog(organizeSettings, $linksClone.find('li').length > 0 ? $linksClone.sortable({placeholder: 'ui-sortable-placeholder-custom'}) : 'No links to edit.  Add links through the "add new link" button in the portlet.');
            });
            
            return $orgButton;
        },
        
        _editLinkSave: function(){    
            var $d = this.$dialog,
                obj = this,
                lString = '',
                $changedLinks = $d.find("#portletUserLinks_clone li a"),
                validated = 1;
            
            $changedLinks.each(function(){
                var $a = $(this),
                    $li = $a.parent('li'),
                    href = '',
                    text = '';
                
                if($a.hasClass('editMode')){
                    var $text = $li.find('input[name=editLinkText]'),
                        $url = $li.find('input[name=editLinkUrl]');

                    if(obj._validateLinkUrlAndText($text, $url)){
                        href = $url.val();
                        text = $text.val();
                    }
                    else{
                        validated = 0
                        return false;
                    }
                }
                else{
                    href = $a.attr('href');
                    text = $a.text();
                }
                
                lString += JSON.stringify({text: text, url: href})+'_++_';
            });
            
            var doLinks = function(result){ 
                $d.dialog('close');                                
                
                $.when(obj.oLorenz.getUserLinks(), obj.oLorenz.getDefaultLinks())
                    .done(function(ul, dl){
                        obj.render(ul, dl);
                    })
                    .fail(function(e){
                        obj._error({
                            technicalError: e,
                            friendlyError: 'There was an error retrieving the set of user links.  This usually indicates a server issue.  Please refresh and try again.  Otherwise, send an error report',
                            location: 'organize links'
                        })
                    });
            };
            
            if(validated){
                showLoadingScreen();
                
                obj.oLorenz.storeWrite(obj.linkStore, {data: lString, context: obj}).done(doLinks).always(hideLoadingScreen);
            }
        },
        
        _buildLinkDelete: function(){
            return $('<span class = "linkDiv portlet-floatRight descText deleteLink_live">delete</span>')
                .click(function(){
                    var $li = $(this).parent('li');
                        $ul = $li.parent('ul');
                    
                    $li.remove();
                    
                    if($ul.find('li').length === 0){
                        $ul.after('All links deleted. Please click save to make changes permanent.');   
                    }                  
                });
        },
        
        _buildLinkEdit: function(){
            var obj = this;
            
            var $link = $('<span style="margin-right: 5px;" class = "linkDiv portlet-floatRight descText editLink_live">edit</span>')
                            .click(function(){
                                var $span = $(this),
                                    $li = $span.parent('li'),
                                    mode = $span.text(),
                                    $a = $li.find('a');
                                
                                if(mode === 'edit'){
                                    $span.html('cancel');
                                    
                                    var $aEdit = $a.hide().addClass('editMode');
                                    
                                    $li
                                        .css('height', '65px')
                                        .append('<div class="editLinkInputs" style="margin-bottom: 8px; margin-left: 5px;">Text: <input type="text" size="30" value="'+$a.text()+'" name="editLinkText"/></div>')
                                        .append('<div class="editLinkInputs" style="margin-left: 5px;">URL:  <input type="text" size="30" style="margin-left: 2px;" value="'+$a.attr('href')+'" name="editLinkUrl"/></div>');
                                }
                                else{
                                    $span.html('edit');
                                    
                                    $a.show().removeClass('editMode');
                                    
                                    $li
                                        .css('height', '18px')
                                        .find('div.editLinkInputs')
                                        .remove();
                                }
                            });

            return $link;
        },
        
        _createLinkAddButton: function(){
            var obj = this,
				table = '<table width = "100%"><tr><td>Display Text:</td><td><input type = "text" name = "linkText" size = "32" /></td></tr><tr><td>URL:</td><td><input type = "text" name = "linkUrl" size = "32" value = "http://" /></td></tr></table>'
            
			this.$dialog.undelegate('input[name=linkUrl], input[name=linkText]', 'keyup');
			
			this.$dialog.delegate('input[name=linkUrl], input[name=linkText]', 'keyup', function(e){
				if(e.keyCode === 13){
					obj._saveUserLink();
				}
			});

            var $addButton  = $('<button>add new link</button>').css({marginTop: '10px'}).button().click(function(e){
                var linkAddSettings = {
                    title: 'Add new links',
                    width: 'auto',
                    position: obj._getMouseXY(e),
                    buttons: {
                    'save': $.proxy(obj, '_saveUserLink'),
                    'cancel': function(){
                        $(this).dialog("close");
                    }
                }};
                
                obj._toggleDialog(linkAddSettings, table);
            });
            
            return $addButton;
        },
        
        _validateLinkUrlAndText: function($text, $url){
            var linkText = $text.val(),                           
				linkUrl = $url.val();
            
            this.$dialog.find('.feedbackError').remove();
            
            if(!linkText){
                this._inputError($text, '(Text must be non-blank)');
                return false;
            }
            else if(!linkUrl){
                this._inputError($url, '(URL must be non-blank)');
                return false;
            }
            else if(!linkUrl.match(/^http:\/\//) && !linkUrl.match(/^https:\/\//)){				
                this._inputError($url, '(Links MUST begin with "http://" or "https://"!)');
                return false;
            }
            else{
                return true;
            }
        },
		
		_saveUserLink: function(){
			var obj = this,				
				$text = this.$dialog.find('input[name=linkText]'),
				$url = this.$dialog.find('input[name=linkUrl]'),
				linkText = $text.val(),                           
				linkUrl = $url.val();
		
			if(obj._validateLinkUrlAndText($text, $url)){			
				showLoadingScreen();
				
				obj.oLorenz.storeAppend(obj.linkStore, {					
					//"data" is the key used to get the POST data on the other side, the reason why we dont
					//need a key like this for the storeWrite requests, is because that data is read from STDIN
					data: {data: JSON.stringify({text: linkText, url: linkUrl})+'_++_'}
				})
				.done(function(result){           
					//reread and populate the links portlet, with our newly created link
					$.when(obj.oLorenz.getUserLinks(), obj.oLorenz.getDefaultLinks())
						.done(function(ul, dl){                            
                            obj.render(ul, dl);                            
                        })
						.fail(function(e){
							obj._error({
								technicalError: e,
								friendlyError: 'There was an error repopulating your links.  Please send an error report via the link below.  Thank you.',
								location: 'storeRead links'
							});								
						})
						.always(hideLoadingScreen);
						
					obj.$dialog.dialog('close');
				})
				.fail(function(e){
					obj._error({
						technicalError: e,
						friendlyError: 'It appears there was an error saving your links. Please send an error report via the link below.  Thank you.',
						location: 'storeAppend links'
					});								
				})
				.always(hideLoadingScreen);                                                              
			}
		},
		
		_inputError: function($input, msg){
			var $err = $('<span class="feedbackError" style="display:block">'+msg+'</span>');
    
			$input.after($err);
			
			setTimeout(function(){
				if($err.length){
					$err.fadeOut('slow');
				}
			}, 3000);
		}
    });
}(jQuery));
