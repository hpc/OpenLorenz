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
    $.widget("lorenz.licenseStatus", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'license status',
			mySettings: {}
        },
		
		refreshRate: 600,

        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getAllLicenseInfo() ];
        },
		
		featureStates: {},
        
        render: function(response){	
			var $licenseDiv = $("<div width='100%'>Click the refresh icon to get new data.<hr width='100%'/></div>");

            for(var license in response){
				var licData = response[license];
			
				$licenseDiv.append.apply($licenseDiv, this._buildLicenseStatusRow(licData));
            }
            
            this.$wrapper.addClass('portlet-licenseStatusWrapper').append($licenseDiv, this._buildLicenseStatusLegend($licenseDiv));	
		},	
		
		//This will get called on an auto refresh and set the features that may have been open back to open by default
		_restoreState: function(){
			var featureStates = this.featureStates,
				$wrapper = this.$wrapper;
			
			if(!$.isEmptyObject(featureStates)){
				for(var tool in featureStates){
					if(featureStates[tool] === 'open'){
						$wrapper.find('#toggle-'+tool).trigger('click', ['instant']);
					}
				}
			}
		},
		
		_saveState: function(){
			var $rows = this.$wrapper.find('div.portlet-featureRow'),
				states = {};
			
			$rows.each(function(){
				var $row = $(this),
					tool = $row.find('.portlet-titleRow-title').text(),
					$icon = $row.find('.portlet-featureToggle span.ui-icon');
				
				states[tool] = $icon.hasClass('ui-icon-triangle-1-e') ? 'closed' : 'open';
			});
			
			this.featureStates = states;
			
			return states;
		},		
        
        _buildLicenseStatusLegend: function($div){
            var legend = "";
            
            if($div.find("div.portlet-titleRow.ui-state-error span.ui-icon-alert").length){
                legend += "<div><div class='ui-state-error portlet-ui-icon portlet-bottomLegend'><span class='ui-icon ui-icon-alert'></span></div><span> = this license or one of its features is fully utilized </span></div>";
            }
			
            if($div.find("div.portlet-titleRow span.ui-icon-notice").length){
                legend += "<div><div class='ui-state-default portlet-ui-icon portlet-bottomLegend'><span class='ui-icon ui-icon-notice'></span></div><span> = few licenses are free</span></div>";
            }
			
			if($div.find("div.portlet-titleRow span.ui-icon-cancel").length){
                legend += "<div><div class='ui-state-error portlet-ui-icon portlet-bottomLegend'><span class='ui-icon ui-icon-cancel'></span></div><span> = error retrieving license info</span></div>";
            }
            
            if(legend !== ""){
                legend = "<hr noshade=''>" + legend;
            }
            
            return legend;
        },
			
		_buildLicenseStatusRow: function(data){
			var features = data.features,
				status = this._getStatus(data.status, features),	
                $title = this._buildTitle(data.tool, status, features),				
                $used = this._buildUsed(data.used, data.total, features),
				licenseDetail = this._buildDetail(data.contact, status, data.reason, data.detail, features),
				$row = $("<div class='portlet-titleRow portlet-cursorPointer "+this.statusToClass[status.status].statusClass+"'></div>")
							.append($title, $used)
							.hover(function(){ $(this).toggleClass("ui-state-hover") })
							.click({licData: data, detail: licenseDetail}, $.proxy(this, '_licenseRowClick')),
				$features = '';
				
				if(features){					
					$row = $('<div class="portlet-featureRow" style="display: table; margin-bottom: 5px;" width=100%><div style="display:table-cell; padding-right: 2px; width: 100%;" class="licRowCont"></div></div>').find(".licRowCont").append($row.css('marginBottom', '0px')).end();
					
					$row.append(this._buildFeatureLink(data.tool));					
					
					$features = this._buildFeatures(features, status);	
				}
				
				return [$row, $features];
		},
		
		_buildDetail: function(contact, status, reason, detail, features){			
			return "<p class='ui-state-highlight'><span class='bold'>Contact: </span>" + contact + "</p><br /><p class='ui-state-highlight'><span class='bold'>Reason: </span>" + (status.reason || reason) + "</p><pre>\n\n" + detail + "</pre>";
		},
		
		_buildFeatures: function(features, status){
			var $list = $('<ul class="portlet-featureContainer"></ul>');
			
			for(var i = 0, il = features.length; i < il; i++){
				var f = features[i],
					statusClass = f.status === 'red' || f.status === 'error' ? this.statusToClass[f.status].statusClass : '';
				
				$list.append('<li class="'+statusClass+'"><strong>'+f.feature+'</strong>: <span class="portlet-floatRight">'+f.used+'/'+f.total+' in use</span></li>');
			}
			
			return $list;
		},
		
		_getStatus: function(status, features){
			if(features){
				var featureStatus = 'green',
					reason = 'All features are available.';
				
				for(var i = 0, il = features.length; i < il; i++){
					var f = features[i];
					
					if(f.status === 'red'){
						featureStatus = f.status;
						reason = f.reason;
						break;
					}
					else if(f.status === 'yellow'){
						featureStatus = f.status;
						reason = f.reason;
					}					
				}
				
				return {status: featureStatus, reason: reason};
			}
			else{
				return {status: status};
			}
		},
		
		_buildUsed: function(used, total, features){
			var $used;
			
			if(features){			
				$used = $("<span class='portlet-titleRow-rightCell'></span>").css({width: "50%"});				
			}
			else{
				$used = $("<span class='portlet-titleRow-rightCell'>"+used+"/"+total+" in use</span>").css({width: "30%"});	
			}
			
			return $used;
		},
		
		_buildFeatureLink: function(tool){
			var $link = $("<div id='toggle-"+tool+"' style='display:table-cell;vertical-align: middle;' class='portlet-featureToggle portlet-ui-icon ui-state-default'><span class = 'ui-icon ui-icon-triangle-1-e'></span></div>").click(function(e, speed){
					var $clicked = $(this);
					
					$clicked.parent('div').next('.portlet-featureContainer').slideToggle((speed === 'instant' ? 0 : 'fast'))
						.end()
					.find('span').toggleClass('ui-icon-triangle-1-e').toggleClass('ui-icon-triangle-1-s');
					
					return false;
				})
				.hover(function(){
					$(this).toggleClass('ui-state-hover');
				});
				
			return $link;
		},
		
		_buildTitle: function(tool, status, features){
			var width = features ? '50%' : '70%';
			
			return $("<span class='portlet-titleRow-leftCell'><span class='"+this.statusToClass[status.status].iconClass+"'></span><span class='portlet-titleRow-title'>"+tool+"</span></span>").css({width: width});
		},
		
		_licenseRowClick: function(e){
			var licData = e.data.licData;
						
			if(licData.isError){
				this._error({
					technicalError: licData.reason,
					friendlyError: licData.detail,
					location: 'get license data'
				});
			}
			else{
				this._toggleDialog({
						title: licData.tool+' Details',
						width: 'auto',
						resizable: true
					},
					$("<div id='portlet-licenseStatusDetails'>"+e.data.detail+"</div>")
				);
				
				var nice = this._getNiceDims(850, 600);
			
				this.$dialog.dialog('option', { width: nice.width, height: nice.height });
				
				this.$dialog.dialog('option', 'position', 'center');
			}
		},
        
        statusToClass: {            
			red: {
				iconClass: "ui-icon ui-icon-alert",
				statusClass: "ui-state-error"
			},
			yellow: {
				iconClass: "ui-icon ui-icon-notice",
				statusClass: "ui-state-default"
			},
			green: {
				iconClass: "",
				statusClass: "ui-state-default"
			},
			error: {
				iconClass: "ui-icon ui-icon-cancel",
				statusClass: "ui-state-error"
			}
        }
    });
}(jQuery));
