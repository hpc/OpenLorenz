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

(function($){    
    var PortletControls = {
        _create: function(elem, options){
			var obj = this,
				dfd = $.Deferred(),
				oLorenz = obj.oLorenz;
			
            showLoadingScreen();
     
			obj.query = $.parseQuery();
			
			obj.parseRenderQuery();
			
			obj.$prompt = $("<div id='portletControls-prompt'></div>").prompt();
			
			obj._initUserViewBanner();
			
            try{ 
				$.when(oLorenz.getAllPortletConf(), oLorenz.getCustomPortlets())
					//The arguments to "done" are the responses from each of the async calls
					.done(function(conf){
						try{
							obj.initPortletConf(conf);
	
							obj.renderPortlets();
							
							obj.renderCustomPortlets();
							
							obj.renderStaffPortlets();
					
							obj.arrangePortlets();
							
							obj.buildControlPanel();
							
							obj.initSortable();
					
							hideLoadingScreen();
							
							dfd.resolve();
						}
						catch(e){							
                            hideLoadingScreen();
							dfd.reject('An error occurred during the rendering process: '+e);
						}
					})
					.fail(function(e){hideLoadingScreen(); dfd.reject(e);});  
            }
            catch(e){				
				if($.isPlainObject(e)){
					e = JSON.stringify(e);	
				}
				
                hideLoadingScreen();
                dfd.reject('Error inside PortletControls.js init: '+e);
            }
            
			dfd.promise()
				.done(function(){
					obj._trigger('loaded');
				})
				.fail(function(e){
					obj._trigger('failed', {}, e);
				});			
        },
				
		$viewBanner: {},
		
		_initUserViewBanner: function(){
			var self = this,
				height = '40px',
				html = '\
				<div id="staticUserWrapper" style="display: none; text-align:left; padding-left: 10px; width:100%; height:'+height+'; position:fixed; left:0pt; top:0pt; z-index:1000; font-size:14px;" class="ui-state-highlight">\
					<div style="vertical-align:middle; display: table-cell;">\
						You are currently in user view mode for:&nbsp;&nbsp;\
						<input style="font-size: 16px; font-weight: bold;" size="9" class="userViewLcName" value="" />\
						<button id="viewBanner-changeUser">change user</button>\
						<button id="viewBanner-resetUser">reset user</button>\
					</div>\
				</div>\
			',
			$viewDiv = $(html),
			$input;
			
			$('body').prepend($viewDiv);
			
			this.$viewBanner = $viewDiv;
			
			$input = this.$viewBanner.find('input.userViewLcName')
			
			this.$viewBanner.find('button#viewBanner-changeUser').button().click(function(){
				self.changeUserEvent($input.val());
			})
			.end()
			.find('button#viewBanner-resetUser').button().click(function(){
				self.changeUserEvent($input.val(), 'reset');					
			});
			
			$input.keyup(function(e){
				if(e.which === 13){
					self.changeUserEvent($input.val());
					
					return false;
				}
			});
			
			self.handleUserViewMode('init');
		},

		_setOption: function(key, value) {
			this._superApply(arguments);
		},
		
        //Unique options for portletControls
        options: {
			
        },
		
		query: {},
		
		supportedPortletsArray: [],
        
		customPortlets: {},
		
		customPortletNames: [],
        
        customPortletsArray: [],
		
		staffPortletNames: [],
		
		staffPortletsArray: [],
		
		//1=visible, 0=not
		//{accounts: 1, groups: 0}
		portletVisibility: {},
		
		supportedPortlets: {},
		
		iePortletExclusions: {
			//chaosUpdateStats: 1 //seems to work in IE 8 after upgrading HighCharts and adding ie=edge meta tag
		},
		
		//The default column arrangement of portlets
		//Desc: {colNum: [{name: 'p1'}, p2,...], ...}
		//Ex: {0: [{name: 'news'} , {name: 'command'}, {name: 'machineLoad'}],
		defaultArrangement: {
			0: [
                {name: 'loginNode'},
				{name: 'lcLookup'},
				{name: 'news'},
				{name: 'machineLoad'},
				{name: 'command'},
			],
			1: [
				{name: 'machineStatus'},
				{name: 'clusterUtilization'},
				{name: 'jobs'},
				{name: 'licenseStatus'}
			],
			2: [
				{name: 'accounts'},
				{name: 'groups'},
				{name: 'banks'},
				{name: 'diskQuota'},
				{name: 'links'},
				{name: 'cpuUsage'},
                {name: 'processViewer'}
			]
		},
        
		portletArrangement: {},
		
        $accordion: {},
		
		queryRenderOverride: {},
        
        oLorenz: Object.create(Lorenz),
		
		initPortletConf: function(conf){
			$.fn.portletExt._setPortletConf(conf.portletConf || {});
			
			this.addCustomToDefaultArrangement();
			
			this.setPortletArrangement(conf.arrangement);

			this.setPortletVisibility(conf.visibility);
			
			this.setPortletAutoRefresh(conf.autoRefresh);
			
			this.buildCustomPortletArray();

			this.buildSupportedPortlets();
			
			this.buildStaffPortlets();
		},
		
		parseRenderQuery: function(){
			var q = this.query;
			
			if(q.r){
				var r = q.r				
				
				if($.isArray(r)){
					for(var i = 0, il = r.length; i < il; i++){
						this.queryRenderOverride[r[i]] = 1;	
					}
				}
				else{
					if(r === 'none'){
						this.queryRenderOverride['none'] = 1;
					}
					else{
						this.queryRenderOverride[r] = 1;
					}
				}
			}
		},
		
		initSortable: function(){
            var obj = this;
            
			var $s = $(".column").sortable({
				connectWith: ".column",
				handle: ".portlet-contentHeader",
				stop: $.proxy(obj, 'savePortletArrangement')
			});
		},
		
		//custom portlets could come from anywhere, by default we append them to the first col
		addCustomToDefaultArrangement: function(){
			for(var cType in $.lorenzCustom){
				this.defaultArrangement[0].push({ name: cType });
			}
		},
		
		setPortletAutoRefresh: function(autoRefresh){
			if(autoRefresh){
				if(JSON.parse(autoRefresh).enabled === 0){					
					$.lorenzSuper.portlet.prototype.globalRefresh = false;
				}
			}
		},
		
		setPortletArrangement: function(portletArrangement){
			//These two (arrangement and visibility) return simply the pure response, since Lorenz strips out everything else
			if(portletArrangement !== null && !$.isEmptyObject(portletArrangement) && portletArrangement){
				this.portletArrangement = JSON.parse(portletArrangement);                                
			}
			else{
				this.portletArrangement = $.extend(true, {}, this.defaultArrangement);
			}
		},
		
		setPortletVisibility: function(portletVisibility){
			if(portletVisibility !== null && portletVisibility){
				this.portletVisibility = JSON.parse(portletVisibility);
			}
		},
				
		buildSupportedPortlets: function(){
			var supportedPortlets = $.lorenz;
			
			for(var name in supportedPortlets){
				this.supportedPortletsArray.push(name);
					
				this.supportedPortlets[name] = supportedPortlets[name].prototype.options.displayName;
			}
		},
		
		buildStaffPortlets: function(){
			var staffPortlets = $.lorenzStaff;
			
			for(var name in staffPortlets){
				this.staffPortletsArray.push({name: name, displayName: (staffPortlets[name].prototype.options.displayName || name)});
					
				this.staffPortletNames.push(name);
			}
		},
        
        buildCustomPortletArray: function(){
            var customPortlets = $.lorenzCustom;
            
            for(var name in customPortlets){
                this.customPortletsArray.push({name: name, displayName: (customPortlets[name].prototype.options.displayName || name)});
				
				this.customPortletNames.push(name);				
            }        
        },
        
        arrangePortlets: function(arrangementOverride){
            var portletArrangement = arrangementOverride || this.portletArrangement,
                allPortlets = {}; 
            
            //Get all portlets on the page
            $('div[portletType]').each(function(){
                allPortlets[$(this).attr('portletType')] = 0;
            });
             
            for(var col in portletArrangement){
                var p = portletArrangement[col];
                var $column = $('div.column:eq('+col+')');                
                   
                for(var i = 0, il = p.length; i < il; i++){
                    $column.append($('div[portletType='+p[i].name+']').parent().detach());
                    
                    allPortlets[p[i].name] = 1;
                }
            }
            
            //If there was a portlet we didn't find through portletArrangement, it usually means its a custom
            //portlet we haven't seen yet.  By default, lets just append it to the top of the third col
            for(var pType in allPortlets){
                if(allPortlets[pType] == 0){
                    $('div.column:eq(0)').append($('div[portletType='+pType+']').parent().detach());
                }
            }
            
            hideLoadingScreen();
        },
        
        savePortletArrangement: function(){
			var obj = this,
				portletData = {};				
					
            $('.column').each(function(){
                var index = $('.column').index(this);
                
                if(portletData[index] === undefined){
                    portletData[index] = [];
                }
				
                //only count visible portlets as apart of the arrangement
                $(this).find('div.portlet-contentBox:visible').each(function(){
                    portletData[index].push({ name: $(this).attr('portletType') });	
                });
            });
			
			this.portletArrangement = portletData;
            
            return obj.oLorenz.storeWrite('portletConf/portletArrangement', {data: JSON.stringify(portletData)});
        },
		
		renderPortlets: function(){
			var portlets = this.supportedPortletsArray,				
                deferredArr = [];
			
			//Lorenz._engageBundleMode();
			
			for(var i = 0, il = portlets.length; i < il; i++){
				var portletType = portlets[i];
				
				//Either not saved in portletVisibility yet or set as "1" in visibility
				if(this.isPortletVisible(portletType) && typeof $.lorenz[portletType] === 'function' && this.ieRenderCheck(portletType)){
					var $portlet = $('<div></div>')[portletType]()
										.appendTo('.column:eq('+this.getColumnForPortlet(portletType)+')');
				}
            }
			
			//Lorenz._disableBundleMode();
		},
		
		renderCustomPortlets: function(){
			var portlets = this.customPortletsArray,				
                deferredArr = [];
				
			for(var i = 0, il = portlets.length; i < il; i++){
				var portletType = portlets[i].name;
				
				//Either not saved in portletVisibility yet or set as "1" in visibility
				if(this.isPortletVisible(portletType) && typeof $.lorenzCustom[portletType] === 'function' && this.ieRenderCheck(portletType)){
					var $portlet = $('<div></div>')[portletType]()
										.appendTo('.column:eq(0)');
				}			
            }
		},
		
		ieRenderCheck: function(portletType){
			return !(this.iePortletExclusions[portletType] && $.browser.msie);
		},
		
		renderStaffPortlets: function(){
			var portlets = this.staffPortletsArray,				
                deferredArr = [];
				
			for(var i = 0, il = portlets.length; i < il; i++){
				var portletType = portlets[i].name;
				
				//Either not saved in portletVisibility yet or set as "1" in visibility
				if(this.isPortletVisible(portletType) && typeof $.lorenzStaff[portletType] === 'function' && this.ieRenderCheck(portletType)){
					var $portlet = $('<div></div>')[portletType]()
										.appendTo('.column:eq('+this.getColumnForPortlet(portletType)+')');
				}			
            }
		},
		
		getColumnForPortlet: function(portletType){
			var portletArrangement = this.portletArrangement;			
			
			for(var column in portletArrangement){
				var p = portletArrangement[column];				
				
				for(var i = 0, il = p.length; i < il; i++){
					if(portletType == p[i].name){						
						return column;				
					}
				}
			}
			
			return 0; //default to append to first column
		},	
		
		buildControlPanel: function(){
			var $accordion = $('<div><h3>Portlet Control Panel</h3><div class = "p_content_acc_div"><div id = "controls-supported"><strong id="controls-supportedTitle">Lorenz Supported Portlets</strong><br/></div><div id = "controls-custom"><strong>User Developed Portlets</strong><br/></div><div id = "controls-staff"><strong>LC Staff Portlets</strong> <br/></div></div></div>'),                    
                $content = $accordion.find('div#controls-supported').css({marginBottom: '10px'}),
                $main = $accordion.find('div.p_content_acc_div');	
			
			this.buildPortletVisibilityCheckboxes($main, $content);
			
			this.buildCheckUncheckAllLinks($content);
			
			this.buildUserViewInput($main);

			this.buildResetLinks($main);

            this.element.append($accordion);

            this.$accordion = $accordion;
            
			this.addCustomToControlPanel();
			
			this.addStaffToControlPanel();
            
            this.$accordion.accordion({
                        active: false,
                        collapsible: true,
                        autoHeight: 'content'
                    });
		},
		
		buildCheckUncheckAllLinks: function($content){
			var $title = $content.find('#controls-supportedTitle'),
				$checkAll = $('<a href="javascript:void(0)">check all</a>').click('check', $.proxy(this, 'checkToggle')),
				$uncheckAll = $('<a href="javascript:void(0)">uncheck all</a>').click('uncheck', $.proxy(this, 'checkToggle')),
				$span = $("<span style='font-size: 10px;'></span>");
			
			$span.append('&nbsp;(', $checkAll, ' | ', $uncheckAll, ')');
			
			$title.after($span);
		},
		
		checkToggle: function(e){
			var obj = this,
				type = e.data,
				selector = type === 'check' ? "input[type=checkbox].portlet-visibilityBox:not(:checked)" : "input[type=checkbox].portlet-visibilityBox:checked";
			
			this.$accordion.find(selector).each(function(){
				var $checkbox = $(this);
				
				$checkbox.prop('checked', $checkbox.prop('checked') ? false : true);

				obj._togglePortletVis($checkbox.attr('name'));
			});
			
			if(this.isEmptyArrangement() && type === 'check'){				
				this.arrangePortlets(this.defaultArrangement);
			}
			
			this.savePortletArrangement();
			
			this._writePortletVisibility();			
		},
		
		isEmptyArrangement: function(){
			var arrangement = this.portletArrangement,
				isEmpty = true;
			
			for(var col in arrangement){
				if(arrangement[col].length > 0){
					isEmpty = false;
					break;
				}
			}
			
			return isEmpty;
		},		
		
		buildResetLinks: function($main){
			var $toggleRefresh = $("<span id='autoRefreshToggle'>toggle portlet auto refresh: <input type='checkbox' "+($.lorenzSuper.portlet.prototype.globalRefresh ? "checked='checked'" : "")+"/></span>")
				.find('input')
				.click($.proxy(this, 'toggleAutoRefresh'))
				.end();
               
			var $clearServerCache = $("<span class = 'whiteLink' id='clearServerCache'>clear server cache</span>")
                .click($.proxy(this, 'clearServerCache'));
            
            var $defaultArrangement = $("<span class = 'whiteLink' id='resetArrangement'>reset portlet arrangement</span>")
                .click($.proxy(this, 'resetPortletArrangement'));
				
			$main.append($toggleRefresh, $clearServerCache, $defaultArrangement);
		},
		
		toggleAutoRefresh: function(e){
			var $box = $(e.target),
				checked = $box.is(':checked');
	
			$box.addClass('ui-state-disabled').prop('disabled', true);
			
			$.lorenzSuper.portlet.prototype.globalRefresh = checked;

			this.oLorenz.storeWrite('portletConf/portletAutoRefresh', {context: this, data: JSON.stringify({enabled: (checked ? 1 : 0)})})
				.always(function(r){
					$box.removeClass('ui-state-disabled').prop('disabled', false);
				});
		},
		
		buildPortletListUI: function(listArray){
			var listFragment = document.createDocumentFragment();
			
			this.sortPortletList(listArray);
			
			for(var i = 0, il = listArray.length; i < il; i++){
				var listItem = listArray[i],
					portletType = listItem.name,
					displayName = listItem.displayName,
					$li = $('<li></li>')
						.append($('<input class="portlet-visibilityBox" type="checkbox" name="'+portletType+'"/>')
						.attr('checked', this.isPortletVisible(portletType))
						.click({portletType: portletType}, $.proxy(this, 'savePortletVis'))
						.css({marginLeft: '10px'}), displayName ? displayName : portletType);
				
				if(this.ieRenderCheck(portletType)){
					listFragment.appendChild($li[0]);
				}
			}
			
			return $('<ul class="portletVisibilityList"></ul>').append(listFragment);
		},
		
		sortPortletList: function(listArray){
			listArray.sort(function(a,b){
				var aName = a.displayName.toLowerCase(),
					bName = b.displayName.toLowerCase();
					
				if(aName > bName){
					return 1;
				}
				else if(aName < bName){
					return -1;
				}
				return 0;
			});
		},
		
		buildPortletVisibilityCheckboxes: function($main, $content){
			var supportedPortlets = this.supportedPortlets,
				listArray = [];
			
			$main.prepend('<h2>Portlet Visibility</h2><span>Check/uncheck the boxes to turn on and off individual portlets.</span><hr width = "100%"/>');
			
			for(var name in supportedPortlets){
				var displayName = supportedPortlets[name] ? supportedPortlets[name] : name;
				
				listArray.push({displayName: displayName, name: name});
			}
			
			$content.append(this.buildPortletListUI(listArray));
		},
		
		buildUserViewInput: function($main){
			var self = this,
				hover = false;
			
			$main.append('<hr width = "100%"/><h2>User Views</h2><span>Type in a user\'s name and press enter or click "change user" to change data views.</span><br/><strong>LC name/OUN: </strong><input name = "switchUserInput" type = "text" value = "'+(this.oLorenz.loraUser === 'ME' ? '' : this.oLorenz.loraUser)+'" size = "30" />');
       
			var $switchUserText = $main.find('input[name=switchUserInput]').bind('keyup', function(e){
				if(e.keyCode === 13 && hover === false){
					self.changeUserEvent($switchUserText.val());
				}
				
				//this hover stuff is so that the first time they press enter and it's in autocomplete...
				//It doesn't submit the request.. it just populates the field
				hover = $switchUserText.autocomplete('widget').find('.ui-state-hover').length > 0;
			})
			.lcPersonAutocomplete();
			
			self.$switchUserText = $switchUserText;
			
            $('<button>change user</button>').button().css({marginLeft: '10px'})
				.click(function(e){
					self.changeUserEvent($switchUserText.val());
				})
				.appendTo($main);
            
            $('<button>reset user</button>').button().css({marginLeft: '10px'}).click(function(e){                
                self.changeUserEvent($switchUserText.val(), 'reset');
				
				$switchUserText.val('');
            })
            .appendTo($main);
		},
		
		changeUserEvent: function(user, type){
			var self = this,
				switchType = type || 'user',
				userChange = {lcname: 'ME'},
				loraUser = self.oLorenz.loraUser,
				$switchUserText = $('input[name=switchUserInput]');
				
			if(user && (switchType === 'user' && user !== loraUser || switchType === 'reset' && loraUser !== 'ME')){				
				if(switchType === 'user'){
					showLoadingScreen();
					
					userChange = this.oLorenz.getUserOun(user);					
				}
				else{
					$switchUserText.val('');
				}
				
				$.when(userChange)
					.done(function(r){
						var lcname = r.lcname,
							allPortlets = {},
							$portlet;
						
						if(lcname !== undefined){
							Lorenz.loraUser = lcname;
							
							allPortlets = $.extend({}, $.lorenz, $.lorenzCustom, $.lorenzStaff);
							
							for(var p in allPortlets){
								if(allPortlets[p].prototype.options.userPortlet === 1){
									$('div[portletType="'+p+'"]').parent('div')[p]('renderPortlet', 'viewSwitch');
								}
							}
						
							hideLoadingScreen();
							
							//just ensure that the input gets set to what the user view is... this is necessary if
							//this changeUserEvent function is called somewhere outside of the context of this object definition
							if(lcname !== 'ME' && ($switchUserText.val() === '' || $switchUserText.val() !== lcname)){
								$switchUserText.val(lcname);
							}
							
							self.handleUserViewMode();
						}
						else{
							hideLoadingScreen();
							self.error('The user specified was not found.  Please try again.', '', 'change user', true);
						}
					})
					.fail(function(e){
						hideLoadingScreen();
						self.error('An error occurred changing user.  This is usually a server error.  Please try again.  This incident has been reported.', e, 'change user fail');
					});                    
			}
		},
		
		handleUserViewMode: function(mode){
			var self = this,
				$viewBanner = this.$viewBanner,
				$wrapper = $(".wrapper"),
				user = this.oLorenz.loraUser;
			
			if(user !== 'ME'){
				if($viewBanner.is(':hidden')){
					$viewBanner.show('blind', {}, 500).css({display: 'table'});
				
					$wrapper.animate({marginTop: $viewBanner.height()+'px'}, 500);
				}
				
				this.$viewBanner.find('input.userViewLcName').val(user)
			}
			else if(mode !== 'init'){
				$viewBanner.hide('blind', {}, 500);
				
				$wrapper.animate({marginTop: '0px'}, 500);
			}
		},
        
		reRenderFromCache: function(portlets){
			var pArray = [];
			
			if(portlets === 'all'){				
				pArray = this.supportedPortletsArray.concat(this.customPortletNames, this.staffPortletNames);
			}
			else{
				pArray = portlets;
			}			
			
			for(var i = 0, il = pArray.length; i < il; i++){
				var portletType = pArray[i];
				
				if(this.isPortletVisible(portletType)){					
					var oPortlet = this.getPortletObject(portletType);
					
					if(oPortlet && oPortlet.options.dynamicRendering){
						oPortlet.render('cache');
					}
				}	
			}		
		},		
		
		getPortletObject: function(portletType){
			return $("div[portletType="+portletType+"]")
				.parent('div')
				.data(portletType);
		},
		
		addCustomToControlPanel: function(){			
			var customPortletsArray = this.customPortletsArray,
				$custom = this.$accordion.find('div#controls-custom');
				
			if(customPortletsArray.length === 0){
                $custom.append('No user portlets found');
			}
			else{				
				$custom.append(this.buildPortletListUI(customPortletsArray));
			}            
		},
		
		addStaffToControlPanel: function(){
			var staffPortletsArray = this.staffPortletsArray,
				$staff = this.$accordion.find('div#controls-staff');
				
			if(staffPortletsArray.length === 0){
                $staff.remove();
			}
			else{				
				$staff.append(this.buildPortletListUI(staffPortletsArray));
			} 
		},
		
		clearServerCache: function(){
			var obj = this;
			
			showLoadingScreen();
			
            this.oLorenz.clearCache()
				.then(
					function(){
						location.reload(true);
					},
					function(e){
						hideLoadingScreen();
						
						obj.error('An error occurred clearing the server cache.  This is most likely a server issue.  First try your operation again.  If the issue persists, please email lorenz tech support with this error.', e, 'clear server cache')
					}
				);
		},
		
        resetPortletArrangement: function(){
			var obj = this;
			
            showLoadingScreen();
			
            $.when(this.oLorenz.storeDelete('portletConf/portletArrangement'), this.oLorenz.storeDelete('portletConf/portletVisibility'))
				.then(
					function(){
						location.reload(true);
					},
					function(e){
						hideLoadingScreen();
						obj.error('An error occurred resetting portlet configuration.  This is most likely a server issue.  First try your operation again.  If the problem persists, please email lorenz-info@llnl.gov with this error.', e, 'reset portlet configuration');
					}
				);
        },
		
		isPortletVisible: function(portletType){
			var portletVisibility = this.portletVisibility;
			
			if($.isEmptyObject(this.queryRenderOverride)){
				if(!$.isEmptyObject(portletVisibility) && portletVisibility[portletType] !== undefined && portletVisibility[portletType] == 0){
					return false; //hidden
				}
				else{
					return true; //visible
				}
			}
			else{
				return this.testQueryOverride(portletType);
			}
		},
		
		testQueryOverride: function(portletType){
			var override = this.queryRenderOverride;
			
			if(override['none']){
				return false;
			}
			else{
				if(override[portletType]){
					return true;
				}
				else{
					return false;
				}
			}
		},
		
		getPortletArrangement: function(){
			return this.oLorenz.storeRead('portletConf/portletArrangement', {context: this});
		},
		
		getVisiblePortlets: function(){	
			return this.oLorenz.storeRead('portletConf/portletVisibility', {context: this});
		},
        
        savePortletVis: function(e){			
            var portletType = e.data.portletType;
			
            this._writePortletVisibility();
			
			this._togglePortletVis(portletType);
			
			this.savePortletArrangement();
        },
		
		_togglePortletVis: function(portletType){
			var portletDom = $('div[portletType='+portletType+']');
			
			//toggle hides the portlet if visible, and shows it if hidden
			if(portletDom.length > 0){
				//found and removed
				portletDom.toggle();
				
				//Bug-fix, re-render the portlets that have sparklines in them if they were hidden on the page and now shown
				//This is required by sparklines cause the containing element needs a width
				if(!portletDom.is(':hidden')){
					this.reRenderFromCache([portletType]);
				}				
			}
			//was never on the page, lets add it
			else{
                this.addPortlet(portletType);
			}
		},
		
		_writePortletVisibility: function(){
			var portletStates = {},
				pVis = '';
            
            this.$accordion.find('.portlet-visibilityBox:checkbox').each(function(){
                var $cBox = $(this);
                
                portletStates[$cBox.attr('name')] = $cBox.prop('checked') == false ? 0 : 1;
            }); 
            
			this.portletVisibility = portletStates;
			
			pVis = JSON.stringify(portletStates);
			
            this.oLorenz.storeWrite('portletConf/portletVisibility', {context: this, data: pVis});
		},
        
        addPortlet: function(portletType){
			var getDefaultCol = this.getDefaultArrangementCol(portletType);
			
			return $('<div></div>')[portletType]()						
                .prependTo('.column:eq('+getDefaultCol+')')
                .data('promise');
        },
		
		getDefaultArrangementCol: function(portletType){
			var defaultArrangement = this.defaultArrangement,
				defCol = 2;
			
			outerLoop:
			for(var col in defaultArrangement){
				var p = defaultArrangement[col];
				
				for(var i = 0, il = p.length; i < il; i++){
					if(p[i].name === portletType){
						defCol = col;
						
						break outerLoop;
					}
				}				
			}
			
			return defCol;
		},
		
		error: function(msg, e, loc, quietError){
			this.$prompt.prompt('error', {
				friendlyError: msg,
				technicalError: e,
				location: loc || 'portletControls',
				quietError: quietError
			});
		}
    };
    	
	$.widget("lorenzAdmin.portletControls", PortletControls);	
})(jQuery);
