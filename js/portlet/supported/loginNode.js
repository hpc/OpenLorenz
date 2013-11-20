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
    $.widget("lorenz.loginNode", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'login node status',
			mySettings: {
                defaultClusters: 'mine'
				//commented out these options because of extreme complications
				//in trying to maintain these states in addition to auto-refresh
				//state saving
				//defaultTab: 'clusterSummary',
				//defaultHost: 'oslic'
            }
        },
        
        refreshRate: 300,
        
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
			var oLorenz = this.oLorenz;
			
            return [ oLorenz.getLoginNodeStatus({xhrCache: 'loginStatusCache'}), oLorenz.getSSHhosts({xhrCache: 'sshHostCache'}) ];
        },
        
		loginStatus: {},
		
		firstLoad: true,
		
		submenu: {},
		
		userAccounts: [],
		
        render: function(loginStatus, sshHosts) {
            if(loginStatus && $.isPlainObject(loginStatus) && !$.isEmptyObject(loginStatus)){
                var self = this,
					selectedMachines = this._getSelectedClusters(loginStatus),
					mySettings = this.options.mySettings,
					submenuArgs = {
						panes: [
							{
								content: '',
								buttonText: 'cluster summary'
							},        
							{
								content: '',
								buttonText: 'login nodes by cluster',
								render: function(){
									var host = self._getTabHost();
									
									self._updateTable(host);
								}
							}
						]
					};
				
				//reset these two variables, for refreshing
				this._allDown = false;				
				this._atLeastOneDown = false;
				
				this.userAccounts = sshHosts.accounts,
				
				this.loginStatus = this._prepLoginStatus(selectedMachines);
                
				submenuArgs.panes[0].content = this._getClusterSummary();
			
				submenuArgs.panes[1].content = this._getNodesByCluster();
			
				this.submenu = this._renderSubmenu(submenuArgs);
                
				this._bindTableEvents();
				
				this._bindHostSelect();
				
				this._bindLoadAvgDesc();
            }
            else{
                this._error({
                    technicalError: 'Either a null response or a non object data source came back from the server: '+loginStatus,
                    friendlyError: "I'm sorry there was an unexpected data error rendering your portlet. This has been reported, thank you.",
                    location: 'inside render loginNode',
                    type: 'portlet'
                });
            }            
        },
		
		states: {},
		
		_saveState: function(){
			var state = {};
			
			state.currentTab = this.$mainWrapper.find('.submenuButton:eq(0)').hasClass('ui-state-active') ? 0 : 1;
				
			if(state.currentTab === 1){
				state.currentHost = $('#portlet-clusterSummary-select').val(); 
			}
			
			this.states = state;
		},
		
		_restoreState: function(){
			var states = this.states;
			
			//this.submenu.changePage(states.currentTab);
			
			if(states.currentTab === 1){
				$('#portlet-clusterSummary-select').val(states.currentHost).trigger('change');
			}
		},
		
		_getTabHost: function(){
			var host,
				$select = $('#portlet-clusterSummary-select');
			
			//This _currentHost stuff is necessary because during an auto refresh
			//The user isn't aware we're re-rendering the portlet and this actually
			//resets the clusterSummary select... so we need to remember the last
			//host they had selected
			if(this._currentHost && $select.find('option[value="'+this._currentHost+'"]').length > 0){
				host = this._currentHost;
				
				$select.val(host);
			}
			else{
				host = $select.val();
			}
			
			return host;
		},
		
		_allDown: false,
		
		_atLeastOneDown: false,
		
		_atLeastOneHeavy: {},
		
		_atLeastOneModerate: {},
		
		_prepLoginStatus: function(lStatus){
			var loginStatus= $.extend(true, {},lStatus);
			
			for(var host in loginStatus){
				var hostData = loginStatus[host],
					loginNodes = hostData.login_node_data;
				
				if(hostData.total_nodes_up === 0 && hostData.total_nodes > 0){
					this._allDown = true;
				}
				else if(hostData.total_nodes_down > 0){
					this._atLeastOneDown = true;
				}
				
				loginStatus[host].last_update_ms = this._getLastUpStr(hostData.last_update_ms);
				
				for(var node in loginNodes){
					loginStatus[host].login_node_data[node].last_update_ms = this._getLastUpStr(loginNodes[node].last_update_ms);
				}
			}
			
			return loginStatus;
		},
		
		_bindLoadAvgDesc: function(){
			var self = this;
			
			this.$wrapper.on('click', '#interpretLoadAvg', function(e){
				self._toggleDialog({
					title: 'Understanding load average',
					modal: true,
					width: 600
				}, $.tmpl(self._loadDescTmpl, {}));
				
				return false;
			});
		},
		
		_currentHost: '',
		
		_bindHostSelect: function(){
			var self = this,
				loginStatus = this.loginStatus;
			
			this.$wrapper.on('change', '#portlet-clusterSummary-select', function(e){
                var host = $(this).val();
                
				self._currentHost = host;
				
				self._updateTable(host);
			});
		},
		
		_updateTable: function(host){
			var hostData = this.loginStatus[host];
			
			if(hostData){
				$.tmpl(this._clusterSummary, {
					nodes: hostData.login_node_data,
					hasModerate: hostData.num_moderate > 0,
					hasHeavy: hostData.num_heavy > 0,
					foundUp: hostData.total_nodes_up > 0,
					foundDown: hostData.total_nodes_down > 0
				}).appendTo($('#clusterSummary-results').empty());
			}
		},
        
        _bindTableEvents: function(){
			var self = this;
			
            this.$wrapper
                .on('mouseenter', '.portlet-ui-table tr:not(.nohover)', function(e){
                    var $tr = $(this);
                    
                    $tr.addClass('ui-state-hover');
                    
                    if($tr.hasClass('ui-state-highlight')){
                        $tr.removeClass('ui-state-highlight').data('classToAdd', 'ui-state-highlight');
                    }
                    else if($tr.hasClass('ui-state-error')){
                        $tr.removeClass('ui-state-error').data('classToAdd', 'ui-state-error');
                    }
                })
                .on('mouseleave', '.portlet-ui-table tr:not(.nohover)', function(e){
                    var $tr = $(this);
					
                    $tr.removeClass('ui-state-hover');
                    
					//adding ui-state-hover to an element that already has ui-state-highlight or error
					//will not show the hover class... so we remove it and add it back manually
                    self._classToAdd($tr);
                })
				.on('click', '.portlet-ui-table tr.portlet-summaryRow:not(.nohover)', function(e){
					var $tr = $(this);
					
					self._classToAdd($tr);
					
					self._focusLoginNodePanel($tr.removeClass('ui-state-hover').find('td:eq(0)').text());
				})
				.on('click', '.portlet-ui-table tr.portlet-loginNodeRow:not(.nohover)', function(e){
					self._showLoginNodeDialog($('#portlet-clusterSummary-select').val(), $(this).find('td:eq(0)').text());
				});
        },
		
		_classToAdd: function($tr){
			var toAdd = $tr.data('classToAdd');
			
			if(toAdd){
				$tr.addClass(toAdd);
			}
		},
		
		_isUserAccount: function(host) {
			var accounts = this.userAccounts;
			for (var account in accounts) {
				if (accounts[account] == host) {
					return true;
				}
			}
			return false;
		},
		
		_focusLoginNodePanel: function(host){
			this.$mainWrapper.find('.submenuButton:eq(1)').click()
				.end()
			.find('#portlet-clusterSummary-select')
				.val(host).trigger('change');
		},
		
		_showLoginNodeDialog: function(host, node){
			var obj = this,
				content = this.loginStatus[host].login_node_data[node],
				tmpl = content ? this._nodeDetailTmpl : 'Unable to find details for '+node;
						
			this._toggleDialog({
				title: "Login Node Summary: "+node,
				width: 710,
				height: 'auto',
				modal: true
			}, $.tmpl(tmpl, {loginDetails: content, hasAccount: obj._isUserAccount(host)}));

			// Event handler for button to run the 'top' command on a login node
			$('#loginNodeCommandButton')
				.button()
				.click(function() {
					showLoadingScreen();
					
					obj.oLorenz.execCommand(node, {data: {timeout: 60, command: 'top -b -n 1'}, context: obj})
						.done(function(response) {
							  obj._buildCommand(response);
							  $('#loginNodeCommandBack')
								.button()
								.click(function() {
									obj._showLoginNodeDialog(host, node);
									return false;
								});
						})
						.fail(function(e){									
							obj._error({
								technicalError: e,
								friendlyError: 'It appears as if there was an error running your remote command.  It\'s possible the server you tried running it on is down or the command you tried to run failed.  \
												You can try a different host or a simple command like "ls".  If it still fails please send an error report.  Thank you.',
								location: 'command'
							});
						})
						.always(hideLoadingScreen);
						
						return false;
				});
						
		},
		
		_buildCommand: function(response) {
			var pre = '<a href="#" id="loginNodeCommandBack"> Back to login node summary </a><br /><br />'
            this._doCommandDialog(pre, response, '');
        },
		        
        _getNodesByCluster: function(){
            return $.tmpl(this._nodeTmpl, {
                status: this.loginStatus
            });
        },
        
        _getClusterSummary: function(){		
            return $.tmpl(this._clusterTmpl, {
                status: this.loginStatus,
				atLeastOneDown: this._atLeastOneDown,
				allDown: this._allDown
            });
        },
		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {},
				clusters = this.currentDataSet,
				defaultClusters = typeSpecificSettings.defaultClusters,
				$select = this._buildClusterSelect(clusters),
				$hostSelect = this._buildClusterSelect(clusters, undefined, false, 'defaultHost'),
				$links = this._buildClusterSelectLinks($select, defaultClusters);
	
			return {
				defaultClusters: $links.find('div:eq(1)').append($select).end()
				//defaultTab: $('<div>Default tab: <select name="defaultTab"><option value="clusterSummary">cluster summary</option><option value="loginNodes">login nodes</option></select></div>').find('select').val(typeSpecificSettings.defaultTab).end(),
				//defaultHost: $("<div>Default node host: </div>").append($hostSelect.val(typeSpecificSettings.defaultHost))
			};
		},
      		
		_loadDescTmpl:
			'<div>'+
				'The load averages displayed in the portlet table are "normalized" percentage values given the number '+
				'of CPUs a given node has.  The loadavg numbers are generated through the use of the "uptime" command. '+
				'The output of such a command will look like this: <br/><br/><pre>load average: 0.09, 0.05, 0.01 </pre><br/>'+
				'The numbers shown are the 1, 5, and 15 minute averages respectively.  The true load of the node is '+
				'dependent on the number of cpus.  For example, if a node with 12 cpus reported a 5 min load average of '+
				'12.0, that would mean that all 12 cpus are running at 100% capacity.  This 100% would be the normalized version '+
				'of load average you see in the table we display.  The formula for load average percentage is then: <br/><br/><pre>(loadavg/ncpus) * 100</pre><br/>'+
				'It is possible for the number to be greater than 100%.  This would indicate that there is actually a backlog of pending '+
				'executions waiting to even get in the cpu.<br/><br/>Additional resource: <a target="_blank" href="http://blog.scoutapp.com/articles/2009/07/31/understanding-load-averages">Understanding Linux CPU Load</a>'+
			'</div>',
		
		_nodeDetailTmpl:
			'{{if hasAccount}}' +
				'<a href="#" id="loginNodeCommandButton"> Display current Linux tasks (\'top\') </a><br /><br />' +
			'{{/if}}' + 
			'<table width=100% class="portlet-ui-table">'+
				'<thead>'+
					'<tr>'+
						'<th align=left class="ui-state-default">Field</th>'+
						'<th align=left class="ui-state-default">Summary</th>'+
					'</tr>'+
				'</thead>'+
				'<tbody>'+
					'{{each loginDetails}}'+
					'{{if $index != "last_update_ms" && $index != "loadAvg"}}'+
					'<tr>'+
						'<td>${$index}</td>'+
						'<td>${$value}</td>'+
					'</tr>'+
					'{{/if}}'+
					'{{/each}}'+
				'</tbody>'+	
			'</table>',
        
        _nodeTmpl:
            '<div>'+
                'See the breakdown on individual login nodes within this view.  Also, please read how to better <a href="#" id="interpretLoadAvg">interpret load average.</a><hr width=100% />'+
                '<div style="margin-bottom: 5px">Host: <select id="portlet-clusterSummary-select">{{each status}}<option value="${$index}">${$index}</option>{{/each}}</select></div>'+
				'<div id="clusterSummary-results">'+
				'</div>'+
            '</div>',
        
		_clusterSummary:
			'<table width=100% class="portlet-ui-table icon-table">'+
				'<thead>'+
					'<tr>'+
						'<th class="ui-state-default" align=left>Login Node</th>'+
						'<th class="ui-state-default">State</th>'+
						'<th class="ui-state-default"># Users</th>'+
						'<th class="ui-state-default">Load (5 min avg)</th>'+
						'<th class="ui-state-default" width=80>Last Update</th>'+
					'</tr>'+
				'</thead>'+
				'<tbody>'+
					'{{if $.isEmptyObject(nodes)}}<tr class="nohover"><td colspan=5 align=center>No login nodes available for selected host</td></tr>'+
					'{{else}}'+
						'{{each nodes}}'+
							'{{if state == "up"}}'+
								'<tr class="portlet-loginNodeRow portlet-cursorPointer" {{if isNaN(normalized_load) === false}}title="ncpus: ${ncpus}, loadavg1: ${loadavg1}, loadavg5: ${loadavg5}, loadavg15: ${loadavg15}"{{/if}}>'+
									'<td>${$index}</td>'+
									'<td align=center>'+							
										'<div class="ui-state-default" style="display: inline-block;"><span class="ui-icon ui-icon-check"></span></div>'+
									'</td>'+
									'<td align=center>${nusers}</td>'+
									'<td align=center '+
										'class="'+
										'{{if load_state === "moderate"}}'+
											'ui-state-highlight'+
										'{{else load_state === "high"}}'+
											'ui-state-error'+
										'{{else}}'+
										'{{/if}}'+
										'"'+
									'>'+
										'{{if isNaN(normalized_load)}}&nbsp;{{else normalized_load > 100}}>100%{{else}}${normalized_load}%{{/if}}'+
									'</td>'+
									'<td align=center>${last_update_ms}</td>'+
								'</tr>'+
							'{{else}}'+
								'<tr class="portlet-loginNodeRow portlet-cursorPointer">'+
									'<td>${$index}</td>'+
									'<td align=center><div class="ui-state-error" style="display: inline-block;"><span class="ui-icon ui-icon-closethick"></span></div></td>'+
									'<td>&nbsp;</td>'+
									'<td>&nbsp;</td>'+
									'<td align=center>${last_update_ms}</td>'+
							'{{/if}}'+
						'{{/each}}'+
					'{{/if}}'+
				'</tbody>'+
			'</table>'+
			'{{if foundUp}}<div class="portlet-statusLegendItem"><div class="ui-state-default" style="display: inline-block;"><span class="ui-icon ui-icon-check"></span></div> = This node is up and working</div>{{/if}}'+
			'{{if foundDown}}<div class="portlet-statusLegendItem"><div class="ui-state-error" style="display: inline-block;"><span class="ui-icon ui-icon-closethick"></span></div> = This node is down</div>{{/if}}'+
			'{{if hasModerate}}<div class="portlet-statusLegendItem"><span class="portlet-legendItem ui-state-highlight">&nbsp;</span> = This node is under moderate load</div>{{/if}}'+
			'{{if hasHeavy}}<div class="portlet-statusLegendItem"><span class="portlet-legendItem ui-state-error">&nbsp;</span> = This node is under severe load</div>{{/if}}',
		
        _clusterTmpl:
            '<div>'+
                'Shown is a high level summary of total and unavailable login nodes for all clusters.<hr width=100% />'+
                '<table width=100% style="margin-bottom: 10px;" class="portlet-ui-table" id="portlet-loginNode-clusterSummaryTable">'+
                    '<thead>'+
                        '<tr>'+
                            '<th class="ui-state-default" align=left>Machine</th>'+
                            '<th class="ui-state-default">Total Login Nodes</th>'+
							'<th class="ui-state-default">Login Nodes Down</th>'+
							'<th class="ui-state-default">Login Nodes Under Heavy Load</th>'+
							'<th class="ui-state-default" width=80>Last Update</th>'+
                        '</tr>'+
                    '</thead>'+
                    '<tbody>'+
					'{{if $.isEmptyObject(status)}}<tr class="nohover"><td colspan=5 align=center>No clusters available or selected within the settings panel</td></tr>'+
                    '{{else}}{{each status}}'+
                        '<tr class="portlet-summaryRow portlet-cursorPointer '+
						'{{if total_nodes_down === total_nodes && total_nodes > 0}}'+
							'ui-state-error'+
						'{{else total_nodes_down > 0 && total_nodes > total_nodes_down}}'+
							'ui-state-highlight'+
						'{{/if}}'+
						'">'+
                            '<td>${$index}</td>'+
                            '<td align=center>${total_nodes}</td>'+
                            '<td align=center {{if total_nodes_down > 0}}style="color:red"{{/if}}>${total_nodes_down}</td>'+
							'<td align=center>${num_heavy}</td>'+
							'<td align=center>${last_update_ms}</td>'+
                        '</tr>'+
                    '{{/each}}{{/if}}'+
                    '</tbody>'+
                '</table>'+
				'{{if atLeastOneDown}}<div><span class="ui-state-highlight portlet-legendItem">&nbsp;</span> = At least one login node is down</div>{{/if}}'+
				'{{if allDown}}<div style="margin-top:10px;"><span class="ui-state-error portlet-legendItem">&nbsp;</span> = All login nodes are down</div>{{/if}}'+
            '</div>'
    });
}(jQuery));