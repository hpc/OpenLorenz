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
    $.widget("lorenz.machineLoad", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'current machine loads',
            mySettings: {
				defaultPartition: 'pbatch',
				defaultClusters: 'mine'
            }
        },
		
		refreshRate: 60,
		
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getAllMachineLoads() ];
        },
		
        render: function(response) {
			if(response === undefined || !$.isArray(response)){
				response = [];
				
				response[0].partitions = undefined;
			}
			
			var clusters = this._getSelectedClusters(response);
			
			this.$wrapper.css("maxHeight", "400px");			
			
			this._clusterData = clusters;

			$.tmpl(this._tmpl, {
				clusterStatus: this._buildTmplData(),
				tableTmpl: this._table
			}).appendTo(this.$wrapper);
			
			this._bindTable();
        },

		_bindTable: function(){
			this.$wrapper.find('table.portlet-ui-table tr.host-clickable')
				.hover(function(e){
					$(this).toggleClass('ui-state-hover');
				})
				.click(function(e){
					$(this).toggleClass('ui-state-active host-clickable-expanded').nextUntil('.host-default').toggle();
				})
		},
		
		_buildTmplData: function(pDef){
			var clusters = this._clusterData,
				defPartition = pDef || this.options.mySettings.defaultPartition,
				tmplItems = [];
			
			clusters = clusters || [];
			
			for(var i = 0, il = clusters.length; i < il; i++){
				var entry = clusters[i];
				
				tmplItems.push(this._getPartition(entry.partitions, defPartition, this._getLastUpStr(entry.last_update_ms)));
			}
			
			return tmplItems;
		},

		_getPartition: function(pList, defaultP, lastUp){
			var selectedPartition = '',
				first = '',
				entry = {};
			
			pList = pList || {};		
			
			for(var partition in pList){
				pList[partition].lastUpdate = lastUp;
				
				if(!first){
					first = partition;
				}
				
				if(partition === defaultP){
					selectedPartition = partition;					
				}
			}
			
			//Didnt find default partition, try to revert to pbatch, and if
			//no pbatch just grab the first in the list
			if(!selectedPartition){
				selectedPartition = pList && pList['pbatch'] ? 'pbatch' : first;
			}
			
			entry['defaultP'] = selectedPartition && pList[selectedPartition] ? pList[selectedPartition] : 'pbatch';
			
			delete pList[selectedPartition];
			
			entry['other'] = pList;
			
			return entry;
		},

		_state: {},

		_restoreState: function(){
			var state = this._state;
			
			if(!$.isEmptyObject(state)){
				this.$wrapper.find('table.portlet-ui-table tr.host-clickable > td:first-child')
					.each(function(){
						if(state[this.innerHTML]){
							$(this).parent('tr').click();
						}
					});
			}
		},
		
		_saveState: function(){
			var self = this;

			self._state = {};			
			
			this.$wrapper.find('table.portlet-ui-table tr.host-clickable-expanded > td:first-child')
				.each(function(){
					self._state[$(this).text()] = 1;
				})
		},
 		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {},
				clusters = this.currentDataSet,
				defaultClusters = typeSpecificSettings.defaultClusters,
				$select = this._buildClusterSelect(clusters),
				$links = this._buildClusterSelectLinks($select, defaultClusters);
					
				return {
					defaultPartition: $('<span>Default Partition: <select name = "defaultPartition"><option value = "pbatch">pbatch</option><option value = "pdebug">pdebug</option><option value = "pshort">pshort</option></select></span>')
						.find('option[value='+typeSpecificSettings.defaultPartition+']')
						.attr('selected', 'selected')
						.end(),
					defaultClusters: $links                            
						.find('div:eq(1)')
						.append($select)
						.end()
				};
		},

		_table: '\
			<table class="portlet-ui-table" width="100%">\
				<thead>\
					<tr>\
						<th class="ui-state-default" align="left">Machine</th>\
						<th class="ui-state-default" width="65" align="left">Partition</th>\
						<th class="ui-state-default">Nodes Available</th>\
						<th class="ui-state-default" width="80">Last Update</th>\
					</tr>\
				</thead>\
				<tbody>\
					{{if clusterStatus.length}}\
						{{each clusterStatus}}\
							{{if $value.defaultP && $value.defaultP.host}}\
								<tr class="host-default {{if !$.isEmptyObject($value.other)}}host-clickable{{/if}}">\
									<td>${$value.defaultP.host}</td>\
									<td>${$value.defaultP.partition}</td>\
									<td align="center" style="{{if $value.defaultP.idle == 0}}color:red{{/if}}">${$value.defaultP.idle}</td>\
									<td align="center">${$value.defaultP.lastUpdate}</td>\
								</tr>\
								{{each $value.other}}\
									<tr class="host-hidden">\
										<td>&nbsp;</td>\
										<td>${$value.partition}</td>\
										<td align="center" style="{{if $value.idle == 0}}color:red{{/if}}">${$value.idle}</td>\
										<td align="center">${$value.lastUpdate}</td>\
									</tr>\
								{{/each}}\
							{{/if}}\
						{{/each}}\
					{{else}}\
						<tr><td align=center colspan=4>No clusters selected.  Use the gear icon to add some.</td></tr>\
					{{/if}}\
				</tbody>\
			</table>',
		
		_tmpl: '\
			Save your default partition using the gear icon in the top right corner.  Click a row to expand more partitions (if available).<hr width="100%"/>\
			<div id="machineLoadTableContainer">\
				{{tmpl tableTmpl}}\
			</div>'

    });
}(jQuery));
