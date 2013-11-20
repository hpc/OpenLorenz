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

// if console is not defined, e.g., Firebug console is not enabled or Non-Firefox browser
if (typeof console == 'undefined') {
    var console = {};
    console.log = function(msg) {
        return;
    };
}

(function($){
    $.fn.portletExt = {};
	
    var _pExt = $.fn.portletExt,    
		//our global dialog for use by all portlets
		$dialog = $('<div id = "portlet_dialog"></div>').css({fontSize: '14px'}).prompt(),	
		$errorPrompt = $('<div id = "portlet_errorDialog"></div>').css({fontSize: '14px'}).prompt(),	
		allPortletConf = -1,	
		oLorenz = Object.create(Lorenz),	
		defaultHost = '',		
		windowFocused = true,	
		hasStorage = (function() {
			try {
					localStorage.setItem('foo', 'foo');
					localStorage.removeItem('foo');
					return true;
				} catch(e) {
					return false;
				}
			}());
	
	if(hasStorage){
		//This is our one indicator that the user has not cleared their cache
		//If later in the code we dont' find this flag, we know they cleared it
		localStorage.setItem('lorenz-flag', true);
	}
	
	_pExt._setPortletConf = function(c){
		allPortletConf = c;
	};
	
	oLorenz.getCredentialLifetime()
		.done(function(creds){
			if(!isNaN(creds.expireDate_ms)){
				$.lorenzSuper.portlet.prototype.credentialExpiration = new Date(creds.expireDate_ms);
			}
		});

	$(window)
		.focus(function(){
			windowFocused = true;
		})
		.blur(function(){
			windowFocused = false;
		});

    var Portlet = {
        //Unique options for 
        options: {            
            dataType: 'json',
			
			author: 'LORENZ',
			
			visibleBy: '',
			
			dynamicRendering: 0,
			
			dataTimestamp: 0,
			
			userPortlet: 0,
			            
            settingWidget: {
                enabled: true,
                x: 20,
                y: 0
            },
            
            refreshWidget: {
                enabled: true,
                x: 38,
                y: 0
            },
			
			minimizeWidget: {
                enabled: true,
				state: 'open',
                x: 0,
                y: 0
            },
            
            //Global settings
            settings: {
                fontSize: 12
            }
        },
		
		//Flag to disable or enable ALL portlet auto-refreshes
		globalRefresh: true,
		
		//refresh rate (seconds)
		refreshRate: 0,
		
		//Date when creds will expire, epoch milliseconds
		credentialExpiration: -1,
		
		//wrapper div for all portlet internal content
        $wrapper: {},
        
        $mainWrapper: {},
		
		$contentBody: {},
		
		$contentBox: {},
		
		$refreshWidget: {},
		
		$contentHeader: {},
		
		//For maintaining sub menu state (if used)
		lastFocus: undefined,
		
		currentDataSet: {},
		
		//Used in bindwindowresizerefresh... global timeout id to clear if needed
		_timeoutId: -1,
		
		$dialog: $dialog,
		
		//set of default highcharts colors
		highChartsColors: ['#4572A7', '#AA4643', '#89A54E', '#80699B', '#3D96AE', '#DB843D', '#92A8CD', '#A47D7C', '#B5CA92'],

        //Reference to Lorenz API for use by this object
        oLorenz: oLorenz,
		
		refreshClicked: false,
        
        _create: function(){
			var dfd = $.Deferred(),				
				obj = this;    

			//What's returned from getPortletInfo is a Deferred object promise... we attach our fail and done handlers
			$.when(this._getPortletSettings())
				.done(function(){
					obj.renderPortlet().then(dfd.resolve, dfd.reject);
				})
				.fail(function(e){
					obj._error({
						friendlyError: 'There was an error getting the portlet settings.  This is usually a sign of a server side issue.  Please report this error.  Thank you.',
						technicalError: e,
						location: '_getPortletSettings'
					});
				});
			
            var promise = dfd.promise();
            
            this.element.data('promise', promise);
            
            return promise;
        },
		
        // Use the _setOption method to respond to changes to options
        _setOption: function( key, value ) {
            this._superApply(arguments);
        },
        
		data: function(){
			return [];
		},
		
		render: function(){
			this.$wrapper.append('This is the "render" function stub.  If you\'re seeing this it means you haven\'t defined your own render function in your portlet.');
		},
		
		//A very simple stub implementation of refresh... can be ran in "silentRefresh" mode
		//which doesnt show the loading gif
		refresh: function(type){
			var self = this,
				creds = this.credentialExpiration,
				xhr = $.Deferred(),
				credRequest;

			if(hasStorage && !$.lorenzSuper.portlet.prototype.globalRefresh && type === 'silentRefresh'){
				return setTimeout(function(){
					self._initRefreshInterval();
				}, 10000);
			}
			//we're doing a silent auto refresh and creds are expired or they've cleared their cache
			//can only determine if cache is cleared by using localStorage... so if its an old browser without
			//localStorage support we just continue on normally... if their creds expire they may get an auth storm
			//if the browser is left alone long enough
			else if(hasStorage && $.lorenzSuper.portlet.prototype.globalRefresh && type === 'silentRefresh' && ((creds !== -1 && (creds.valueOf() < new Date().valueOf())) || !localStorage.getItem('lorenz-flag'))){
				$.lorenzSuper.portlet.prototype.globalRefresh = false;
				
				credRequest = function(){
					self.oLorenz.getCredentialLifetime()
						.done(function(c){
							if(!isNaN(c.expireDate_ms)){
                                location.reload();
								//$.lorenzSuper.portlet.prototype.credentialExpiration = new Date(c.expireDate_ms);
								//
								//$.lorenzSuper.portlet.prototype.globalRefresh = true;
								//
								//localStorage.setItem('lorenz-flag', true);
								//
								//self._initRefresh(type)
								//	.then(xhr.resolve, xhr.reject);
							}
						})
						.fail(xhr.reject);
				}
				
				if(windowFocused){
					credRequest();
				}
				else{
					$(window).one('focus.creds', function(args){
						credRequest();
					});
				}
				
				return xhr.promise();
			}
			else{
				return this._initRefresh(type);
			}
		},
		
		_initRefresh: function(type){
			var self = this;
			
			//if portlets have implemented a function to preserve their state after a hard refresh
			//call it... its up to the implementing portlet to handle this correctly
			if(typeof self._saveState === 'function'){
				self._saveState();	
			}
			
			return self.renderPortlet(type)
				.done(function(){
					if(typeof self._restoreState === 'function'){
						self._restoreState();	
					}
				});
		},
		
		_hasStorage: hasStorage,
		
		_checkLocalStorage: function(){
			try {
				localStorage.setItem(mod, mod);
				localStorage.removeItem(mod);
				return true;
			} catch(e) {
				return false;
			}
		},

		renderXHR: {},
		
		lastData: [],
		
		renderPortlet: function(type){
			var obj = this,
				data,
				dfd = $.Deferred();				

			//must abort old requests in jqxhrCheck BEFORE recalling new requests in the data
			//function because they may use XHRcaching.  Its possible that we could get a cached XHR
			//That failed from the last go around
			obj._renderJqxhrCheck();
			
			data = this.data();
			
			if($.isArray(data) && data.length > 0){
				//A view switch is where we just want to re-render the portlet to a different
				//Lora user view... in this case the entire portletPreLoad is uncessary (re rendering widgets, etc)
				if(type !== undefined && type === 'viewSwitch'){
					this._updateHeader();
					this._enablePortletLoadingMode();
				}
				else if(type !== 'silentRefresh'){
					this._portletPreload();
					this._enablePortletLoadingMode();
				}
				
				this.lastData = data;
				
				this.renderXHR = $.when.apply(undefined, data)
					.always($.proxy(this, '_portletPostAlways'))
					.done(function(){
						//turn off refresh button so they cant click it and clear the $wrapper before
						//its had a chance to be rendered, causing errors... very slim chance as its only a small window
						//but I've done it before
						obj.refreshClicked = true;
						
						var args = Array.prototype.slice.call(arguments);
						
						obj.currentDataSet = args[0];
					
						if(type === 'silentRefresh'){
							//This height stuff is a bug fix that causes the page to jump around if a
							//tall portlet refreshes itself and causes the scroll bar to disappear
							//so we just set it as a static height before refreshing
							obj.$mainWrapper.css('height', obj.$mainWrapper.height());
							
							obj._clearWrappers();
						}
						
						obj._portletPostDone(args).then(dfd.resolve, dfd.reject)
							.always(function(){
								obj.refreshClicked = false;
								
								obj._updateRefreshWidgetTitle();
								
								//reset height of bug fix above
								if(type === 'silentRefresh'){
									obj.$mainWrapper.css('height', '');
								}
							});
					})
					.fail([$.proxy(this, '_portletPostFail'), dfd.reject]);
			}
			else{
				dfd.reject('Data not array or undefined');
				
				this._error({
					technicalError: 'Data not array or undefined',
					friendlyError: 'We have detected you have either not defined the "data" call for your <b>'+this.widgetName+'</b> portlet or it isn\'t returning an array',
					location: this.widgetName+' data error'				
				});
			}
			
			return dfd.promise();
		},
		
		_renderJqxhrCheck: function(){
			var renderXHR = this.renderXHR,
				lastData = this.lastData;
			
			if(typeof renderXHR.state === 'function' && renderXHR.state() === 'pending' && $.isArray(lastData)){
				for(var i = 0, il = lastData.length; i < il; i++){
					var l = lastData[i];
					
					if(l.jqXhr){
						l.jqXhr.abort();
					}
				}
			}
		},
		
		_enablePortletLoadingMode: function(){
			this._clearWrappers();
			
			this.$wrapper.addClass('portletLoading');
		},
		
		_clearWrappers: function(){
			this.$wrapper = this._buildNewInteriorWrapper();
			
			this.$mainWrapper.empty().append(this.$wrapper);
		},
		
		_portletPostFail: function(e){
			//if its abort, its because they clicked refresh during an auto refresh
			//therefore, aborting the current request... this is normal and we dont
			//want to turn off auto refresh in this case
			if(e.statusText && e.statusText !== 'abort'){
				this.refreshRate = 0;
			}
			
			if(e.statusText !== 'abort' && !/nsIXMLHttpRequest\.getAllResponseHeaders/g.test(e.statusText)){
				this._error({
					technicalError: e,
					friendlyError: this._getPortletError(),
					location: this.widgetName,
					type: 'portlet'
				});	
			}
		},
		
		_portletPostAlways: function(){
			this.$wrapper.removeClass('portletLoading');
		},
		
		_portletPostDone: function(args){
			var dfd = $.Deferred();
			
			//This is a class we use to determine easily if a portlet is in an "error" state for automated testing
			this.element.removeClass('portlet-error-state');
			
			try{							
				this.render.apply(this, args);
								
				if(this.options.dataTimestamp === 1){
					this._addDataTimestamp(args[0]);
				}
				
				this._initRefreshInterval();
				
				dfd.resolve();
			}
			catch(e){
				e = e || 'The variable "e" in the try:render catch block was undefined';
				
				var eString = $.browser.msie ? JSON.stringify(e) : e.toString();
				
				if(e.stack){
					eString = eString + ', Stack: ' + e.stack;
				}
                
                if(e.message){
                    eString = eString + ': '+e.message;
                }
                
                if(e.lineNumber){
                    eString = eString + ', LineNum: ' + e.lineNumber;
                }
                
                if(e.line){
                    eString = eString + ', Line: '+ e.line;
                }
				
                if(e.fileName){
                    eString = eString + ', Filename: ' + e.fileName;
                }
                
				dfd.reject(eString);
				
				console.log(e);
				
				this._error({
					friendlyError: 'There was a fatal error rendering your portlet.  This is usually a code based error and needs to be resolved by the tech team.  Please send an error report. Thank you.',					
					technicalError: eString,
					location: 'try:render:'+this.widgetName,
                    type: 'portlet'
				});
			}
			
			return dfd.promise();
		},
		
		_currentInterval: -1,
		
		_initRefreshInterval: function(){
			var self = this,
                refreshRate = (this.options.settings.refreshRate ? this.options.settings.refreshRate : this.refreshRate),
                minRefresh = this.options.minRefresh;
			
			if(this._currentInterval !== -1){
				clearTimeout(this._currentInterval);
			}
			
			if(refreshRate > 0 && (minRefresh === undefined || (minRefresh !== undefined  && refreshRate > minRefresh))){
				this._currentInterval = setTimeout(function(){
					self.refresh.apply(self, ['silentRefresh']);
				}, refreshRate*1000);	//interval in milliseconds
			}
		},

		_portletPreload: function(){
				//Build the content box and internal wrappers
				this._buildWrappers();

				this._portletPreConfig();	
		},
	    
		_setPortletSettings: function(settings){
			var pSettings = this.options.mySettings,
				gSettings = this.options.settings;
				
			if(!$.isEmptyObject(settings.general)){
				this.options.settings = $.extend(true, gSettings, settings.general);
			}
			
			if(!$.isEmptyObject(settings.specific)){
				this.options.mySettings = $.extend(true, pSettings, settings.specific);
			}
			
			if(settings.visible !== undefined){							
				this.options.minimizeWidget.state = settings.visible == 0 ? 'close' : 'open';						
			}
		},
		
        _getPortletSettings: function(){
			if(allPortletConf !== -1){
				var mySettings = allPortletConf[this.widgetName];

				if(mySettings){
					this._setPortletSettings(JSON.parse(mySettings));
				}
				
				return mySettings;
			}
			else{		
				return this.oLorenz.storeRead(this._getPortletSettingsDir(), {context: this})
					.done(function(r){
						if(r){
							this._setPortletSettings(JSON.parse(r));
						}
					});
			}
        },
        
        _getPortletSettingsDir: function(){
            return 'portletConf/'+this.widgetName+'/'+this.widgetName+'Conf';  
        },
        
        _getDisplayName: function(){
            var portletType = this.widgetName,
                currentName = this.options.displayName,				
                loraUser = this.oLorenz.loraUser;
                
            if(this.options.userPortlet === 1 && this._inUserView() && currentName.length <= 33){
                if(loraUser.length  + currentName.length > 33){                
                    loraUser = loraUser.substring(0, 28-currentName.length) + '...'; 
                }
                
                return currentName + ' ('+loraUser+')';
            }
            else{
                if(currentName.length > 33){
                    return currentName.substring(0, 30) + '...';
                }
                else{
                    return currentName;    
                }                
            }
        },
		
		_updateHeader: function(){
			this.$contentHeader.find('span.portlet-headerTitle').html(this._getDisplayName());
		},
		
		_inUserView: function(){
			return this.oLorenz.loraUser !== 'ME';
		},
				
		_buildNewInteriorWrapper: function(){
			//The content wrapper is the portion which is nested inside the main wrapper... it controls the overflow of content
			//This way we can have global elements like the settings widget outside of the content portion, and position it where ever we wish
			return $("<div class = 'portletContent_wrapper'></div>").css({overflow: 'auto', padding: '10px'});
		},
        
        _buildWrappers: function(){
			var options = this.options,											
                displayName = this._getDisplayName(),				
				$contentBox = $('<div class = "portlet-contentBox" portletType = "'+this.widgetName+'">'+
									'<div class = "portlet-contentHeader ui-widget-header"><span class = "portlet-headerTitle">'+displayName+'</span></div>'+
									'<div class = "portlet-contentBody ui-widget-content"></div>'+
								'</div>'),
				
			//The main wrapper surrounds everything, we use it as the nearest relatively positioned element, against which
			//All other elements within the portlet are positioned
			$mainWrapper = $("<div class = 'portletInterior_wrapper'></div>").css({position: 'relative', fontSize: options.settings.fontSize+'px'}),
			
			//The content wrapper is the portion which is nested inside the main wrapper
			$contentWrapper = this._buildNewInteriorWrapper();
				
			this.$contentBody = $contentBox.find('.portlet-contentBody')
									.css({display: (options.minimizeWidget.state == 'close' ? 'none' : '')})
									.append($mainWrapper.append($contentWrapper), this._getVisibleByElem());
									
            this.$mainWrapper = $mainWrapper;            
            this.$wrapper = $contentWrapper;
			this.$contentBox = $contentBox;
			this.$contentHeader = $contentBox.find('.portlet-contentHeader');
		
			this.element.empty().append($contentBox);
        },
        
		_getVisibleByElem: function(){
			var visBy = this.options.visibleBy;
			
			if(visBy){
				return '<div class="visByDiv"><strong>Visibility restricted to: </strong>'+visBy+'<div>';
			}
			else{
				return '';
			}
		},
		
        //This closes the global dialog, cleans it up (destroy, empty), then reinitializes it to a new fresh dialog, and opens it based on whats passed in
        _toggleDialog: function(userOpts, content){
            $dialog.prompt('info', userOpts, content);
        },
				
		_escapeHtml: function(htmlString){
			return htmlString.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
		},
  	
		_serverSideError: function(){			
			return 	'Sorry :( there was a server side error.  Please ensure you are authenticated, '+
					'and refresh the page to try your action again.  If the problem '+
					'persists please contact '+this._lorenzEmail()+' with whats shown under '+
					'"Show Details".  Alternatively, you can send a report via the "Send Error Report" link below.';
		},
		
		/* Used to generate a submenu for your portlet. See chaosUpdate for an
		 * example. Note that 'display:none' can't be used to hide tabs, because 
		 * it causes Highcharts to complain in Firefox 3.6.
		 * Modified: 3/16 - jjm
		 */
		_renderSubmenu: function(options) {
			var self = this,
				tmplOpts = {
					saveState: true,
					buttonWidth: function(){
						return 100/tmplOpts.panes.length;
					},
					panes: [{
						content: 'I am some content',
						buttonText: 'Button1',
						render: $.noop
					}]
				},
				$buttons,
				$mainWrapper = this.$mainWrapper;
				
			$.extend(true, tmplOpts, options);
			
			this._prepSubmenuArgs(tmplOpts);
			
			$.tmpl(this._submenuTmpl, tmplOpts).prependTo($mainWrapper);
			
			$buttons = $mainWrapper.find('.submenuButton')
				.hover(function(){
					$(this).toggleClass('ui-state-hover');
				})
				.click(function(e){
					var $b = $(this),
						bIndex = $buttons.index($b),
						activeIndex = $buttons.filter('.ui-state-active').index();
	
					self._currentSubButton = bIndex;
					
					$buttons.removeClass('ui-state-active');
					
					$b.addClass('ui-state-active');
					
					self._updateSubmenu(tmplOpts.panes[bIndex], activeIndex, bIndex);
				});
			
			if(tmplOpts.saveState){
				$buttons.eq(self._currentSubButton).click();
			}
			else{
				$buttons.eq(0).click();
			}
			
			this._detachedPanes = {};
			
			return {
				changePage: function(index){
					if(index !== undefined){
						$buttons.eq(index).click();
					}
				}
			}
		},
		
		_prepSubmenuArgs: function(opts){
			var panes = opts.panes;
			
			for(var i = 0, il = panes.length; i < il; i++){
				var c = panes[i].content;
				
				if(typeof c === 'string'){
					panes[i].content = '<span>'+c+'</span>';
				}
				else if(c instanceof jQuery){
					panes[i].content = $('<span></span>').append(c);
				}
			}
		},
		
		_updateSubmenu: function(pane, activeIndex, bIndex) {
			var $wrapper = this.$wrapper,
				content = pane.content;
				
			this.$mainWrapper.css('height', this.$mainWrapper.height());

			if(activeIndex !== -1){
				this._detachedPanes[activeIndex] = $wrapper.children().detach();
				
				content = this._detachedPanes[bIndex] || pane.content;
			}
			
			$wrapper.append(content);

			if(typeof pane.render === 'function'){
				if (!(content instanceof jQuery)){
					content = $(content);
				}
				
				pane.render(content);
			}
			
			this.$mainWrapper.css('height', '');
		},
		
		_detachedPanes: {},
		
		_currentSubButton: 0,
		
		_submenuTmpl:
			'<div width="100%" class="submenu ui-state-default">'+
				'{{each panes}}'+
					'<div class="submenuButton ui-state-default" style="width: ${$data.buttonWidth()}%;">${buttonText}</div>'+
				'{{/each}}'+
			'</div>',
		
		_bindWindowResizeRefresh: function(){
			var portletType = this.widgetName,
				obj = this;
			
			$(window).unbind('resize.'+portletType);
			
			$(window).bind('resize.'+portletType, function(e){
				//Turns out elements that are jquery UI's "resizable", bubble up a resize event
				//to the window, and it was triggering this code... so now we do a check to see
				//if it's a DOM element where the event orginated, cause if it was an actual window
				//resize, instance of "Window" is just a plain object and then re-render
				if(obj._isNotElementNode(e.target)){
					clearTimeout(obj._timeoutId);
					
					obj._timeoutId = setTimeout(function(){
						obj.render('cache');
					}, 500);
				}
			});
		},
        
        _isNotElementNode: function(el){
            if($.browser.msie){
                return el.nodeType === 9;
            }
            else{
                return !(el instanceof HTMLElement);
            }
        },
		
		_cachedResponseHandle: function(response){
			if(response === 'cache'){	
				this._clearWrappers();
				
				return this.cachedResponse;
			}
			else{
				this.cachedResponse = response;
				
				return response;
			}
		},
        
        _portletPreConfig: function(){           
            var options = this.options;
            
			if(options.minimizeWidget.enabled){
                this._buildMinimizeWidget();
            }
			
            if(options.settingWidget.enabled){
                this._buildSettingWidget();
            }
            
            if(options.refreshWidget.enabled){
                this._buildRefreshWidget();   
            }
        },
		
		_buildMinimizeWidget: function(){
			var minSettings = this.options.minimizeWidget,
				iconClass = minSettings.state == 'close' ? 'ui-icon-plusthick' : 'ui-icon-minusthick';
			
			var $min = $('<div class = "portlet-iconWrapper" title = "minimize/maximize portlet"><span class="ui-icon '+iconClass+'"></span></div>')
                .css({ 
                    top: this.options.minimizeWidget.y,
                    right: this.options.minimizeWidget.x
                })
                .hover(
                    function(){
                        $(this).addClass('ui-state-hover')
                            .addClass('portlet-ui-icon-hover');
                    },
                    function(){
                        $(this).removeClass('ui-state-hover');
                    }
                );
				
			$min.click({minIcon: $min}, $.proxy(this, 'portletDisplayToggle'));
                
            this.$contentHeader.prepend($min);
		},
		
		//Left public to allow the user to minimize/maximize the portlet programmatically
		portletDisplayToggle: function(e){
			var obj = this,
				$icon = e.data.minIcon.find('.ui-icon'),
				portletType = obj.widgetName,
				state = obj.options.minimizeWidget.state;
			
			$icon.toggleClass("ui-icon-minusthick").toggleClass("ui-icon-plusthick");
			
			$icon.parents("div.portlet-contentBox:first").find(".portlet-contentBody").toggle();
			
			if(state == 'close'){
				$.sparkline_display_visible();

				//If the portlet needs dynamic rendering, rerender here using a cache
				if(obj.options.dynamicRendering && !obj.$wrapper.hasClass('portletLoading')){	
					obj.render('cache');
				}
				
				this.options.minimizeWidget.state = 'open';
			}
			else{
				
				this.options.minimizeWidget.state = 'close';
			}

			this._writePortletSettings();
		},
		
		_updateRefreshWidgetTitle: function(){
			var d = new Date(),
				$refresh = this.$refreshWidget;
			
			if(!$.isEmptyObject($refresh)){
				$refresh.attr("title", "refresh this portlet, last refresh: "+(d.getMonth()+1)+"/"+d.getDate()+" "+d.toLocaleTimeString());
			}
		},
		
        _buildRefreshWidget: function(){
            var self = this,
				$refresh = $('<div class = "portlet-iconWrapper"><span class="ui-icon ui-icon-arrowrefresh-1-e"></span></div>')
                .css({
                    top: this.options.refreshWidget.y,
                    right: this.options.refreshWidget.x
                })
                .hover(
                    function(){
                        $(this).addClass('ui-state-hover')
                            .addClass('portlet-ui-icon-hover');
                    },
                    function(){
                        $(this).removeClass('ui-state-hover');
                    }
                ).click(function(e){
					if(!self.refreshClicked){
						self.refreshClicked = true;
						
						self.refresh()
							.always(function(){							
								self.refreshClicked = false;
							});
						
						self._updateRefreshWidgetTitle();
					}
				});
				
				this.$refreshWidget = $refresh;
				
				this._updateRefreshWidgetTitle();
				
                this.$contentHeader.prepend($refresh);
        },
		
		$settingWidget: undefined,
        
        _buildSettingWidget: function(){
            var $gear = $('<div class = "portlet-iconWrapper" title = "change portlet settings"><span class="ui-icon ui-icon-gear"></span></div>')
                .css({                    
                    top: this.options.settingWidget.y,
                    right: this.options.settingWidget.x
                })
                .hover(
                    function(){
                        $(this).addClass('ui-state-hover')
                            .addClass('portlet-ui-icon-hover');
                    },
                    function(){
                        $(this).removeClass('ui-state-hover');
                    }
                )   
                .click($.proxy(this, '_doSettingDialog'));              
            
			this.$settingWidget = $gear;
			
            this.$contentHeader.prepend($gear);
        },
        
        refreshEditable: false,
        
		_buildGeneralSettingForm: function(){
			var settingToTmpl = this._getGeneralTmpl(),
				settings = this.options.settings,
				$generalForm = $('<form></form>').data('hasChanged', false).submit(function(){return false;}).change(function(){$(this).data('hasChanged', true)}),
				$rate = '',
				$container = $('<div></div>');
			
			for(var s in settings){
                var sHtml = settingToTmpl[s];
				
                if(sHtml){ $generalForm.append($('<div></div>').append(sHtml).css({marginBottom: '3px'})); }
            }
			
			if(this.refreshRate && this.refreshRate > 0 && !this.refreshEditable){
                $rate = $('<div style="margin-bottom: 10px">Refresh rate (s): '+this.refreshRate+'</div>');    
			}
			
			return $container.append($rate, $generalForm);
		},
		
		_buildSpecificSettingForm: function(){
			var specificToTmpl = this._settingToTmpl(),
				theseSettings = this.options.mySettings,
				$container = $("<div></div>"),
				$specificForm = $('<form></form>').data('hasChanged', false)
									.submit(function(){return false;})
									.change(function(){
										$(this).data('hasChanged', true);
									});
				
			for(var tS in theseSettings){
                var pTmpl = specificToTmpl[tS];
                
                if(pTmpl){ $specificForm.append($('<div></div>').append(pTmpl).css({marginBottom: '3px'})); }
            }
			
			
			return $specificForm;
		},
		
        _doSettingDialog: function(e){
            var obj = this,
                options = obj.options,
				$generalForm = obj._buildGeneralSettingForm(),
				$specificForm = obj._buildSpecificSettingForm(),
				$authorCredits = options.author !== 'LORENZ' ? $('<div class = "dialog-descText">Contributed by: '+options.author+'</div>') : '';
            
            obj._toggleDialog({
                title: 'Settings for '+(options.displayName || obj.widgetName),
                width: 'auto',
                draggable: false,
                resizable: false,
                show: 'blind',
                closeOnEscape: false,
                closeText: '',
                position: obj._getMouseXY(e),
                buttons: {
                    save: function(){
						if(obj._validateSettingDialog($dialog)){
							obj._settingDialogSave($generalForm, $specificForm);
							
							$(this).dialog('close');	
						}
                    },
                    cancel: function(e){
                        $(this).dialog('close');
                    }
                }           
            }, [$generalForm, $specificForm, $authorCredits]);
        },
		
		//Added in case any custom portlet wants to implement setting dialog error checking
		_validateSettingDialog: function($dialog){
			return true;
		},
		
		_getNewSettings: function($generalForm){
			var newSettings = {};
			
			//Thank you to jQuery's ":input" selector which selects all inputs, selects, text areas, radios, etc...
			$generalForm.find(':input').each(function(){
				var $input = $(this);                                
				newSettings[$input.attr('name')] = $input.val();
			});
			
			//create completely new object so this doesnt point to a reference to the old settings
			newSettings = $.extend({}, this.options.settings, newSettings);
			
			return newSettings;
		},
		
		_getNewSpecificSettings: function($specificForm){
			var newSpecificSettings = {},
				obj = this;
			
			$specificForm.find(':input').each(function(){
				var $input = $(this),
					name = $input.attr('name');
				
				//special handling for defaultCluster's "mine" vs "all" determination
				//we just save a string of "mine" or "all" if we detect they have all or
				//just their clusters selected... in the future we may need a more generic
				//solution to handle other inputs that can have special handling like this
				if(name === 'defaultClusters'){
					newSpecificSettings[name] = obj._getDefaultClustersVal($input);  
				}
				else{
					newSpecificSettings[name] = $input.val();    
				}
			});
			
			//did this so that we clone an object, not point to a reference to mySettings
			newSpecificSettings = $.extend({}, this.options.mySettings, newSpecificSettings)
			
			return newSpecificSettings;
		},
		
		_settingDialogSave: function($generalForm, $specificForm){
			var obj = this;
            
			//only save if data in form changed
			if($generalForm.find('form').data('hasChanged') || $specificForm.data('hasChanged')){
				//Show the loading gif when loading
				obj.initLoad = false;

				//Set to the new settings based on the forms
				obj.options.settings = obj._getNewSettings($generalForm),
				obj.options.mySettings = obj._getNewSpecificSettings($specificForm);

				//After we've saved the current settings and reloaded the portlet
				$.when(obj._writePortletSettings(), obj.refresh())
					.fail(function(e){
						if(e.statusText && e.statusText !== 'abort'){
							obj._error({
								technicalError: e,
								friendlyError: obj._serverSideError(),
								location: 'settings save'
							});
						}
					});
			}
		},
		
		_getMouseXY: function(e){
			return [e.pageX - $(window).scrollLeft(), e.pageY - $(window).scrollTop()];
		},
		
		_getGeneralTmpl: function(){
			var options = this.options,
				settings = options.settings,
				refreshRate = settings.refreshRate,
				tmpl = {					
					fontSize: 'Font size (px): <input type = "text" size = "3" name = "fontSize" value = "'+settings.fontSize+'" />'
				};
			
			if(refreshRate !== undefined && refreshRate >= 0 && this.refreshEditable){
				tmpl['refreshRate'] = 'Refresh rate (<em>seconds</em>, min: <span id="portlet-optionsMinRefresh">'+options.minRefresh+'</span>): <input type = "text" size = "3" name = "refreshRate" value = "'+refreshRate+'"/>';
			}

			return tmpl;
		},
		
		//function stub, should be implemented by the portlet with custom settings
		_settingToTmpl: function(){     
            return {};
        },
		
		_getClusterHostNames: function(clusters){
			var hostnames = [];
			
			for(var i = 0, il = clusters.length; i < il; i++){
				hostnames.push(clusters[i].host);
			}
			
			return hostnames;
		},
		
		_buildHighChartDialog: function(e){
            var measuringName = e.data.measuringName || '',                
                dialogTitle = e.data.dialogTitle || 'Detailed plot',
                series = e.data.series || [],
                units = e.data.units || 'units',
                seriesType = e.data.seriesType || 'line',
                chartTitle = e.data.chartTitle || 'Detailed plot',
                min = e.data.min || 0,
                max = e.data.max || null,
				dateFormat = units == '%' ? '%b %e, %Y %H:%M' : '%b %e, %Y',
				dialogFooter = e.data.dialogFooter !== undefined ? e.data.dialogFooter : '';
            
            if(this.currentChart){
                this.currentChart.destroy();
            }
            
            this._toggleDialog({title: dialogTitle, height: 455, width: 800, resizable: false}, $('<div id = "portlet-highchart"></div>'+dialogFooter));

			Highcharts.setOptions({
				global: {
					useUTC: false
				}
			});
			
            this.currentChart = new Highcharts.Chart({
                chart: {
                    renderTo: 'portlet-highchart',
                    zoomType: 'x',
                    defaultSeriesType: seriesType,
					animation: false
                },           
                tooltip: {										
					formatter: function(){						
						return '<strong>'+this.series.name+'</strong><br/>'+Highcharts.dateFormat(dateFormat, this.x)+': '+this.y+' ('+units+')';
					},					
					crosshairs: true
                },
                title: {
                    text: chartTitle,
                    style: {
                        color: "#000000"
                    }
                },
                credits: {
                    enabled: false  
                },
                xAxis: {
                    type: 'datetime'
                },
                series: series,                
                yAxis: {
                    min: min,
                    max: max,
                    minPadding: 0,
                    maxPadding: 0,             
                    title: {
                        text: units,
                        style: {
                            color: '#000000'
                        }
                    }
                },
                toolbar: {
                    itemStyle: {
                        fontWeight: 'bold',
                        color: '#AF1515'
                    }
                },
                plotOptions: {            
                    area: {
                        events: {
                            legendItemClick: function(event) {
                                return false;
                            }
                        },
                        lineWidth: 1,						
                        fillColor: this._getSparkFillColor()
                    },
                    series: {
						animation: false,
                        marker: {
                            enabled: false,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        }
                    }
                }
            });  
        },
		
		_keys: function(obj){
			var keys = [];
			
			if($.isPlainObject(obj)){
				for(var k in obj){
					keys.push(k);
				}	
			}
			
			return keys;
		},
		
		_hasFlash: function(){
			return swfobject.hasFlashPlayerVersion("9.0.18");
		},
		
		_getHighchartColor: function(index){
			//ensure its a number 0..length-1... generally used when you want to start over at the beginning
			//of an array after you get to the end and beyond...
			var i = index % this.highChartsColors.length;
			
			return this.highChartsColors[i];
		},
		
		_getSparkOpts: function(hostnames){			
			return	{
						chartRangeMin: 0,
						chartRangeMax: 1,
						lineColor: this._getSparkLineColor(),
						fillColor: this._getSparkFillColor(),
						spotColor: false,
						minSpotColor: false,
						maxSpotColor: false,
						width: (this.element.find('.portlet-contentHeader').innerWidth() - 20) - (this._getMaxWidth(hostnames) + 16 + 20)  // add icon width and horizontal padding
					};
		},
		
		_getMaxWidth: function(elements){         
            var $div = $("<div></div>").css({
                position: 'absolute',
                top: 0,
                left: '-999999em',
				fontSize: '13px'
            }).appendTo("body");

            var fragment = document.createDocumentFragment();

            for(var i = 0, il = elements.length; i < il; i++){
                fragment.appendChild($('<div>'+elements[i]+'</div>')[0]);  
            }
            
            $div.append(fragment);
            
            var max = $div.width();
			
			$div.remove();
			
			return max;
		},
		
		_getSparkLineColor: function(){
			var $div = $("#sparklineColor-palette");
			
			if($div.length === 0){
				$div = $("<div id='sparklineColor-palette'></div>")
					.css({
						position: 'absolute',
						top: 0,
						left: '-999999em'
					})
					.appendTo('body')
					.addClass('ui-widget-content');
			}

			return $div.css('color');
		},
        
		_getSparkFillColor: function(){
			var $div = $('#sparkfillColor-palette'),
				isThemed = false;
				
			if(typeof getCurrentTheme === 'function'){				
				if(getCurrentTheme().theme === 'lorenz-default'){					
					isThemed = true;
				}
			}
			
			if(isThemed){
				return '#737373';
			}
			else{			
				if($div.length === 0){		
					$div = $("<div id='sparkfillColor-palette'></div>")
						.css({
							position: 'absolute',
							top: 0,
							left: '-999999em'
						})
						.appendTo('body')
						.addClass('ui-widget-header');			
				}

				return $div.css('backgroundColor');
			}			
		},
		
		_buildClusterSelect: function(clusters, access, multiple, name){
			var options = '';
			
			name = name || 'defaultClusters';
			multiple = multiple === undefined ? true : multiple;
			
			if($.isArray(clusters) && clusters.length > 0){
				clusters = clusters || [];
				
				for(var i = 0, il = clusters.length; i < il; i++){
					var current = clusters[i],
						host = current.host,
						accessible = $.isPlainObject(access) ? (access[host] === 1 ? 1 : 0) : current.accessible;
					
					options += '<option accessible = "'+accessible+'" value = "'+host+'">'+host+'</option>';
				}
			}
			else if($.isPlainObject(clusters)){
				for(var host in clusters){
					options += '<option accessible = "'+clusters[host].accessible+'" value = "'+host+'">'+host+'</option>';
				}
			}
			
			var $select = $('<select '+(multiple ? 'multiple="multiple" size = "5"' : '')+' name = "'+name+'"></select>').append(options);
			
			return $select;
		},
		
		_buildClusterSelectLinks: function($select, defaultClusters){
			var $all = $('<span class = "dialogLink">all</span>')
				.addClass('portlet-allClustersLink')
				.click(function(e){
					$select.find('option').prop('selected', true);
					$select.trigger('change');
				});
		   
			var $mine = $('<span class = "dialogLink">mine only</span>')
				.addClass('portlet-mineClustersLink')
				.click(function(e){
					$select.find('option').prop('selected', false).end().find('option[accessible=1]').prop('selected', true);
					$select.trigger('change');
				});
		
			if(defaultClusters == 'all'){             
				$select.find('option').attr('selected', true);
			}
			else if(defaultClusters == 'mine'){
				$select.find('option[accessible=1]').attr('selected', true);
			}
			else{
				if(typeof defaultClusters == 'string'){
					$select.find("option[value="+defaultClusters+"]").attr('selected', true);
				}
				else if($.isArray(defaultClusters)){
					for(var i = 0, il = defaultClusters.length; i < il; i++){
						$select.find("option[value="+defaultClusters[i]+"]").attr('selected', true);
					}
				}
			}
			
			return $('<div><div style = "display: table-cell; vertical-align: middle;">Clusters shown:&nbsp;&nbsp;</div><div style = "display: table-cell; vertical-align: middle;"></div></div>')
                            .append($all, $mine);
		},
		
		_getSelectedClusters: function(data, accessibility){
            var defaultClusters = this.options.mySettings.defaultClusters;
			
			if($.isArray(data)){
				var clusterArr = [];

				for(var j = 0, jl = data.length; j < jl; j++){
					var c = data[j],
						accessible = $.isPlainObject(accessibility) ? accessibility[c.host] : c.accessible;
					
					if(this._isSelectedCluster(defaultClusters, c.host, accessible)){
						clusterArr.push(c);
					}
				}
				
				return clusterArr;
			}			
			else if($.isPlainObject(data)){
				var clusterObj = {};

				for(var host in data){
					if(this._isSelectedCluster(defaultClusters, host, data[host].accessible)){						
						clusterObj[host] = data[host];
					}
				}
				
				return clusterObj;
			}
			else{
				return '';
			}
        },
		
		_isSelectedCluster: function(defaultClusters, host, accessible){			
			if(defaultClusters === 'all'){
				return true;
			}
			else if(defaultClusters === 'mine'){
				return accessible === 1;
			}
			else{
				if(typeof defaultClusters == 'string' && host == defaultClusters){
					return true;
				}
				else if($.isArray(defaultClusters)){
					return $.inArray(host,defaultClusters) !== -1;
				}
				else{
					return false;
				}
			} 
		},
        
        _getDefaultClustersVal: function($input){
            var options = $input.find("option").length,
                selected = $input.val() ? $input.val().length : -1;
                
            if(options === selected){
                return 'all';
            }			
            else if(this._allAccessibleSelected($input)){
                return 'mine';
            }
            else{                
                return $input.val() || [];
            }
        },
		
		_padZeros: function(n){
            if(n < 10){
                n = '0'+n;
            }
            
            return n;
        },
		
		//Check if all accesible=1 options are selected
		_allAccessibleSelected: function($input){
			var allAccessible = $.map($input.find("option[accessible=1]"), function(e) { return e.value; }),
				selected = $input.val() || [],
				allSelected = true;
            
			// if for whatever reason all their accessible's = 0, then just return false so they can get what they selected
			if(!$.isArray(allAccessible) || allAccessible.length === 0){
				allSelected = false;
			}
			else if(!$.isArray(selected) || selected.length === 0){
				allSelected = false;
			}
            else if(selected.length !== allAccessible.length){
                allSelected = false;
            }
			else{
				$.each(selected, function(index, value){
					if($.inArray(value, allAccessible) === -1){
						allSelected = false;
						return false;
					}
				});
			}
			
			return allSelected;
		},
		
		_writePortletSettings: function(){
			return this.oLorenz.storeWrite(this._getPortletSettingsDir(), {
				data: this._exportPortletSettings(),
				context: this
			});
		},
		
		_exportPortletSettings: function(){
			var options = this.options;

			return JSON.stringify({
				general: options.settings,
				specific: options.mySettings,
				visible: options.minimizeWidget.state == 'close' ? 0 : 1
			});
		},
		
		_doHostInfoDialog: function(host, defaultTab){
			var obj = this,
				lor = obj.oLorenz;
			
			showLoadingScreen();
			
			$.when(lor.getHostJobLimits(host),
				lor.getHostDetails(host),
				lor.getHostTopology(host),
				lor.getAllJobsForHost(host))
			.always(hideLoadingScreen)
			.done(function(lim, det, top, jobs){
				obj._showAccountDialog(lim, det, top, jobs, defaultTab);
			})
			.fail(function(e){
				obj._error({
					technicalError: e,
					friendlyError: obj._serverSideError(),
					location: 'get account info'
				});
			});
		},
		
		_showAccountDialog: function(jResponse, dResponse, tResponse, hostJobs, defaultTab){			
			var obj = this,
				html = "",
				joblim = jResponse.joblimits === undefined ? jResponse : jResponse.joblimits,
				hostname = tResponse.host,
				topoImage = tResponse.url,
				topoData = (topoImage !== "") ? "<img src='"+topoImage+"' alt='No topology is available for: "+hostname+"' />" : "No topology is available for: "+hostname;
				
			html +=  "<div id='accountsInfo'>";
			// Tab Headers
			html += "<ul><li><a href='#accountsInfoJoblimits'>job limits</a></li><li><a href='#accountsInfoDetails'>details</a></li><li><a href='#accountsInfoTopology'>topology</a></li><li><a href='#currentMachineLoadInfo'>current machine load</a></li></ul>";
			
			// Job Limits
			html +=  "<div id='accountsInfoJoblimits'>"+joblim+"</div>";
			
			// Details
			html += "<div id='accountsInfoDetails'><table style='max-width: 600px'>";
			if(dResponse.error !== undefined){
				html += "<tr><td style='padding:10px'>"+dResponse.error+"</td></tr>";
			}
			else{
				for(var k in dResponse){
					html += "<tr><td style='padding:10px'><b>"+k+":</b></td><td>"+dResponse[k]+"</td></tr>";    
				}
			}
			html += '</table></div>';
			
			// Topology
			html += "<div id='accountsInfoTopology'>"+topoData+"</div>";
			
			html += "<div id='currentMachineLoadInfo'></div>"
			
			html += "</div>";

			obj._toggleDialog({resizable: false, title: 'Information for '+hostname, width: (defaultTab === 3 ? 920 : 'auto'), height:'auto'}, html);

			$('#currentMachineLoadInfo')
				.prepend(this._buildJobToggleLink(hostJobs.jobs))
				.append(this._buildLoadTable());
			
			this._initJobLoadDataTable(hostJobs.jobs);

			$dialog.find("div#accountsInfo").tabs({
				activate: function(event, ui) {
					if(defaultTab != 3){
						var dim = obj._getNiceDims(920, 600, $(ui.newPanel));
						
						$dialog.dialog('option', { width: dim.width, height: dim.height });
					}
					
					if(obj.oTable.length > 0){
						obj.oTable.fnAdjustColumnSizing();
					}
				},
				active: defaultTab !== undefined ? defaultTab : 0
			});
			
			$dialog.dialog("option", {position: 'center'});
        },
		
		_initJobLoadDataTable: function(jobs){
            var self = this;
            
			this.oTable = this.$machineLoadTable.dataTable({
				"bJQueryUI": true,
                "sPaginationType": "full_numbers",
				"asStripeClasses": [ 'ui-widget-content', ''],			
                "oLanguage": {
					"sEmptyTable": 'No jobs found'
				},
				"sScrollX": 800,
				"sScrollY": 400,
				"bScrollCollapse": true,
                "aaSorting": [[3,'asc'], [0,'asc']],     
                "aLengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]]
			});
			
            this.oTable.on('page', function(){
                self.oTable.fnAdjustColumnSizing(false);
            });
            
			this._populateLoadTable(jobs, 'RUNNING');			
		},
		
		_buildJobToggleLink: function(jobs){
			var obj = this;
			
			var $link = $(
				'<div id="jobToggleRadio">'+
					'<input type="radio" id="runningJobsOnly" name="radio" checked="checked"/><label for="runningJobsOnly">Running Jobs Only</label>'+
					'<input type="radio" id="allJobs" name="radio" /><label for="allJobs">All Jobs</label>\
				</div>'
			).css({'fontSize': '10px', 'marginBottom': '3px'}).buttonset();
	
			$link.find('#runningJobsOnly').click(function(){				
				$('#currentMachineLoadInfo').append(obj._populateLoadTable(jobs, 'RUNNING'));
			});
			
			$link.find('#allJobs').click(function(){
				$('#currentMachineLoadInfo').append(obj._populateLoadTable(jobs));
			});
			
			return $link;
		},
		
		$machineLoadTable: {},
		
		_buildLoadTable: function(jobs, state){			
			if(!$.isEmptyObject(this.$machineLoadTable)){				
				this.$machineLoadTable.dataTable({bRetrieve: true}).fnDestroy();
			}

			this.$machineLoadTable  = $('<table id="portlet-machineLoadTable" class="portlet-hostJobTable display" width="860">\
										<thead>\
											<tr>\
												<th>Job Id</th>\
												<th>Partition</th>\
												<th>Name</th>\
												<th>User</th>\
												<th>State</th>\
												<th>End Time</th>\
												<th>Nodes</th>\
												<th>Node List</th>\
											</tr>\
										</thead>\
										<tbody></tbody></table>');
			
			return this.$machineLoadTable;
		},
		
		_populateLoadTable: function(jobs, state){
			var dataArr = [],
				oTable = this.oTable;
			
			oTable.fnClearTable();
			
			for(var i = 0, il = jobs.length; i < il; i++){
				var currJob = jobs[i];
				
				if((state !== undefined && currJob.JobState === state) || (state === undefined)){
					//Replace nulls with empty strings... datatables complains with null values
					dataArr.push([
						currJob.JobId || '',
						currJob.Partition || '',
						currJob.Name || '',
						currJob.User || '',
						currJob.JobState || '',
						currJob.EndTime || '',
						currJob.NumNodes || '',
						currJob.NodeList || ''
					]);
				}
			}
			
			oTable.fnAddData(dataArr);			
		},
		
		_getLastUpStr: function(ms){
			var d = new Date(ms);

			return d ? this._padZeros((d.getMonth()+1))+'/'+this._padZeros(d.getDate())+' '+this._padZeros(d.getHours())+':'+this._padZeros(d.getMinutes()) : 'n/a';
		},
		
		_switchUserView: function(lcname){
			if(lcname !== undefined){
				if($.lorenzAdmin.portletControls){
					$("#portletControls").portletControls('changeUserEvent', lcname)
				}
				else{
					window.location = window.location.protocol+"//"+window.location.host+window.location.pathname+'?loraUser='+lcname;
				}				
			}
		},
		
		_getNiceDims: function(maxWidth, maxHeight, $elem){
			var niceWidth, niceHeight;

			if($elem !== undefined){
				niceWidth = $elem.width() > maxWidth ? maxWidth : 'auto';
				
				niceHeight = $elem.height() > maxHeight ? maxHeight : 'auto';
			}
			else{
				niceWidth = $dialog.dialog('widget').width() > maxWidth ? maxWidth : 'auto';
				
				niceHeight = $dialog.dialog('widget').height() > maxHeight ? maxHeight : 'auto';
			}            
			
            return { width: niceWidth, height: niceHeight };
        },
		
		_getPortletError: function(){
			var portletType = this.widgetName,
				typeToError = {
					diskQuota: 'There was an error rendering the disk quota portlet.  Usually this means there is an issue with one of the production file systems that is causing the quota command to fail.  Please ensure the scratch file systems are up and working through the <a href="https://lc.llnl.gov/lorenz/utilities/apps/machineStatus/machineStatus.cgi">machine status page</a>.  If so, send an error report via the link below.',
					licenseStatus: 'There was an error rendering the license status portlet.  A common cause for this error is unwanted output from your LC dot files.  Please run the <a href="https://lc.llnl.gov/lorenz/utilities/apps/diagnostics/diagnostics.cgi">LC diagnostics tool</a> and ensure you pass all the tests.  If you do, please send an error report.  Thank you.'
				},
				def = 'Whoops looks like there was a server side error rendering your '+portletType+' portlet.  First, try refreshing the page.  If the problem persists you can send an error report via the link below or email us ('+this._lorenzEmail()+'). Thank you and sorry for any inconvenience.';
				
			return typeToError[portletType] || def;
		},
     		
		_lorenzEmail: function(){
			return "<a href='mailto:lorenz-info@llnl.gov'>lorenz-info@llnl.gov</a>";
		},
        
        _error: function(err){
			if(err.type === 'portlet'){
				this._internalPortletError(err);
			}
			else{
				hideLoadingScreen();
				
				$errorPrompt.prompt('error', err);
			}
        },
        
		_internalPortletError: function(err){
			var self = this,
                technicalError = $dialog.prompt('getTechnicalError', err.technicalError),
                friendlyError = err.friendlyError,
                loc = err.location,
                $error = $dialog.prompt('buildErrorContent', technicalError),
				$reportLink = $dialog.prompt('buildReportLink', err);
			
			this.element.addClass('portlet-error-state');
			
			this.$contentHeader.find('.portlet-headerErrorIcon').remove().end().prepend(this._getErrorIcon());
			
			this.$wrapper.empty().append(friendlyError, $reportLink, $error, $dialog.prompt('buildLink'));
			
			$dialog.prompt('sendAdminErrorReport', technicalError, loc, err.technicalError);			
		},
		
		_getErrorIcon: function(){
			return $('<div class="ui-state-error portlet-headerErrorIcon"><span class="ui-icon ui-icon-alert"></span></div>');
		},
		
		_getIcons: function(type){
			var icons = {
					filesystem: {
						up : '<div style="display: inline-block;" class="ui-state-default"><span class="ui-icon ui-icon-check"></span></div>',
						down: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-closethick"></span></div>',
						heavyLoad: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-notice"></span></div>',
						noInfo: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-alert"></span></div>',
						noLogin: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-cancel"></span></div>',
						noStatus: '<div style="display: inline-block;"><span>n/a</span></div>',
						moreInfo: '<div style="display: inline-block;" class="ui-state-default"><span class="ui-icon ui-icon-info"></span></div>'
					},
					machine: {
						up : '<div style="display: inline-block;" class="ui-state-default"><span class="ui-icon ui-icon-check"></span></div>',
						down: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-closethick"></span></div>',
						heavyLoad: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-notice"></span></div>',
						noInfo: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-alert"></span></div>',
						noLogin: '<div style="display: inline-block;" class="ui-state-error"><span class="ui-icon ui-icon-cancel"></span></div>'
					}
				},
				defType = type || "machine";
				
				return icons[type];
		},
			
		_buildStatusLegend: function(statusTrack, icons, type){
			var stToLegend = {
					filesystem: {
						up: 'This filesystem is up and working.',
						down: 'This filesystem is down.',
						heavyLoad: 'This filesystem is up but under heavy load.',
						noInfo: 'Information unavailable or filesystem inactive.',
						noLogin: 'Logins on this filesystem have been disabled.',
						noStatus: 'Status information not tracked.',
						moreInfo: "Click for more detail."
					},
					machine: {
						up: 'This machine is up and working.',
						down: 'This machine is down.',
						heavyLoad: 'This machine is up but under heavy load.',
						noInfo: 'Information unavailable or machine inactive.',
						noLogin: 'Logins on this machine have been disabled.'
					}
				},
				statusToIcon = icons || this._getIcons(type),
				legend = '',
				defType = type || "machine";
			
			for(var st in statusTrack){
				legend += '<div class="portlet-statusLegendItem">'+statusToIcon[st] +' = '+stToLegend[defType][st]+'</div>';
			}
			
			return '<div class="portlet-statusLegend">'+legend+'</div>';
		},
		
		_getDataTimestamp: function(data){
			if(!$.isArray(data) && data.last_update_ms !== undefined)
				return data.last_update_ms;
		},
		
		_addDataTimestamp: function(data){			
			var time = this._getDataTimestamp(data);
			
			if(time !== undefined && $.isNumeric(time)){
				var d = new Date(time),
					$stamp = $('<div class="portlet-dataTimestamp ui-state-disabled"></div>')
						.append("Data Last Updated: "+d.toDateString()+" "+d.toLocaleTimeString());
								
				this.$mainWrapper.append($stamp);
			}
		},
		
		_doCommandDialog: function(pre, response, post){            
            var html = pre + '<pre>'+(response.command_out ? this._escapeHtml(response.command_out) : 'Command ran successfully, but with no output.')+'</pre>' + post;
			 
            this._toggleDialog({title: 'Output for '+response.command, height: 300, width: 'auto', maxWidth: 900}, html);
        }
    };
    
    $.widget("lorenzSuper.portlet", Portlet);        
})(jQuery);
