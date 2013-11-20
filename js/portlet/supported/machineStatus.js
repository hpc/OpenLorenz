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
    $.widget("lorenz.machineStatus", $.lorenzSuper.portlet, {
        // These options will be used as defaults
        options: {
            displayName: 'machine status',
            mySettings: {
                defaultClusters: 'mine'
            }
        },

        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getMachineStatus() ];
        },

		refreshRate: 300,

		machineStatus: {},

        render: function(status) {
			this._atLeastOneUp = false,
			this._atLeastOneDegraded = false,
			this._atLeastOneDown = false;
			
			if($.isPlainObject(status) && !$.isEmptyObject(status)) {
				var selectedMachines = this._getSelectedClusters(status);
				this.machineStatus = this._getMachineDetails(selectedMachines);
				
				this.$wrapper.append(this._updateTable());
				
				this._bindTableEvents();
			}
			else {
				this._error({
                    technicalError: 'Either a null response or a non object data source came back from the server: '+ status,
                    friendlyError: "I'm sorry, there was an unexpected data error rendering your portlet. This has been reported, thank you.",
                    location: 'inside render machineStatus',
                    type: 'portlet'
                });
			}
		},

		_atLeastOneUp: false,

		_atLeastOneDegraded: false,

		_atLeastOneDown: false,

		_bindTableEvents: function() {
			var self = this;

            this.$wrapper
                .on('mouseenter', '.portlet-machineStatusTable tr:not(.nohover)', function(e){
                    $(this).addClass('ui-state-hover');
                })
                .on('mouseleave', '.portlet-machineStatusTable tr:not(.nohover)', function(e){
                    $(this).removeClass('ui-state-hover');
                })
				.on('click', '.portlet-machineStatusTable tr.portlet-summaryRow:not(.nohover)', function(e){
					self._doHostInfoDialog($(this).find('td:eq(0)').text(), 3);
				});
        },

		_getMachineDetails: function(machines) {
			var machineList = $.extend(true, {},machines);
			
			for (var cluster in machineList) {
				var clusterDetails = machineList[cluster],
					state = clusterDetails.status;
				
				// Convert time (ms) to formatted string
				machineList[cluster].lastUpdated = this._getLastUpStr(clusterDetails.lastUpdated);
				
				// Check for status
				if (state === "up") {
					this._atLeastOneUp = true;
				} else if (state === "down") {
					this._atLeastOneDown = true;
				} else {
					this._atLeastOneDegraded = true;
				}
			}

			return machineList;
		},

		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {},
				clusters = this.currentDataSet,
				defaultClusters = typeSpecificSettings.defaultClusters,
				$select = this._buildClusterSelect(clusters),
				$links = this._buildClusterSelectLinks($select, defaultClusters);

			return {
				defaultClusters: $links.find('div:eq(1)').append($select).end()
			};
		},

		_updateTable: function(){
			return $.tmpl(this._machineTableTmpl, {
				machStatus: this.machineStatus,
				legendUp: this._atLeastOneUp,
				legendDown: this._atLeastOneDown,
				legendDegraded: this._atLeastOneDegraded
			});
		},

		_machineTableTmpl: 'Below is a list of machines and their corresponding status. Click a row to get detailed information.\
							<hr width="100%"/>\
							<table width="100%" class="portlet-ui-table portlet-machineStatusTable portlet-center"> \
								<thead>\
									<tr>\
										<th align="left" class="ui-state-default">Machine</th>\
										<th class="ui-state-default">Status</th>\
										<th class="ui-state-default">Users</th>\
										<th class="ui-state-default">Last Update</th>\
									</tr>\
								</thead>\
								<tbody>\
									{{if $.isEmptyObject(machStatus)}}<tr class="nohover"><td colspan=5 align=center>No machines found.</td></tr>\
									{{else}}\
										{{each machStatus}}\
											<tr class="portlet-summaryRow portlet-cursorPointer">\
												<td align="left">${$index}</td>\
												<td align=center>\
													{{if status == "up"}}\
														<div class="ui-state-default" style="display: inline-block;"><span class="ui-icon ui-icon-check"></span></div>\
													{{else status == "degraded"}}\
														<div class="ui-state-highlight" style="display: inline-block;"><span class="ui-icon ui-icon-notice"></span></div>\
													{{else}}\
														<div class="ui-state-error" style="display: inline-block;"><span class="ui-icon ui-icon-closethick"></span></div>\
													{{/if}}\
												</td>\
												<td> ${users} </td>\
												<td> ${lastUpdated} </td>\
											</tr>\
										{{/each}}\
									{{/if}}\
								</tbody>\
							</table>\
							<br />\
							{{if legendUp}}\
								<div class="portlet-statusLegendItem">\
									<div class="ui-state-default" style="display: inline-block;"><span class="ui-icon ui-icon-check"></span></div>\
									= This machine is up and working\
								</div>\
							{{/if}}\
							{{if legendDegraded}}\
								<div class="portlet-statusLegendItem">\
									<div class="ui-state-highlight" style="display: inline-block;"><span class="ui-icon ui-icon-notice"></span></div>\
									= Some login nodes on this machine are down\
								</div>\
							{{/if}}\
							{{if legendDown}}\
								<div class="portlet-statusLegendItem">\
									<div class="ui-state-error" style="display: inline-block;"><span class="ui-icon ui-icon-closethick"></span></div>\
									= All login nodes on this machine are down\
								</div>\
							{{/if}}'
    });
}(jQuery));
