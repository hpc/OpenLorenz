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
    $.widget("lorenz.processViewer", $.lorenzSuper.portlet, {
        // These options will be used as defaults
        options: {
            displayName: 'my processes',
            mySettings: {
            }
        },

        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getSSHhosts({xhrCache: 'sshHostCache'} ) ];
        },

		refreshRate: 0,
		        
        userAccounts: [],
        
        _currentHost: '',

        render: function(sshHosts) {
			if($.isArray(sshHosts.accounts)) {
                this.userAccounts = sshHosts.accounts;                
                this.$wrapper.append(this._showAccountsList());
                
				this._getTabHost();
				
                this._bindProcessBtn();
                this._bindTableEvents();
			}
			else {
				this._error({
                    technicalError: 'Either a null response or a non object data source came back from the server: '+ status,
                    friendlyError: "I'm sorry, there was an unexpected data error rendering your portlet. This has been reported, thank you.",
                    location: 'inside render processViewer',
                    type: 'portlet'
                });
			}
		},
        
		// Remembers the currently selected host in the select menu
        _getTabHost: function() {
			var host,
				$select = $('#portlet-processViewer-select');
			
			if(this._currentHost && $select.find('option[value="'+this._currentHost+'"]').length > 0){
				host = this._currentHost;
				
				$select.val(host);
			}
			else{
				host = $select.val();
			}
		},
		
		_updateTable: function(host) {
			var self = this,
				$results = $('#processViewer-results');
			
			$results.empty().addClass("portletLoading");
			
			return this.oLorenz.getUserProcessesByCluster(host).done(function(response) {
				if (response) {
					$.tmpl(self._processTableTmpl, {
						processes: response.processes,
						errors: response.errors
					}).appendTo($results.removeClass('portletLoading').empty());
            
					self._bindKillButton();
				}
				else {                     
					$results.removeClass('portletLoading').empty().append('<div align="center">I\'m sorry, there was an unexpected data error.</div>');
				}
			});
		},
		
		_bindProcessBtn: function() {
			var self = this;
			
			$('#process-get-button')
				.button()
				.on('click', function() {
					var host = $('#portlet-processViewer-select').val(),
						$getBtn = $(this);
					
					self._currentHost = host;
					
					$getBtn.button('disable');
					self._updateTable(host).always(function(){
						$getBtn.button('enable');
					});
					
					return false;
				});
		},
        
         _showAccountsList: function() {
            return $.tmpl(this._processByClusterTmpl, {
                accounts: this.userAccounts
            });
        },
        
        _resetKillButton: function() {
            var $killBtn = $('#process-kill-button');
            if ($('.process-clickable.ui-state-active')[0]) {
                $killBtn.button("enable");
            } else {
                $killBtn.button("disable");
            }
        },
		
		_bindKillButton: function() {
			var self = this;
			
			$('#process-kill-button')
                .button({disabled: true})
                .on('click', function() {
					var pids = new Array(),
						nodes = new Array();
					
					// Find selected rows	
                    $('.process-clickable.ui-state-active').each(function(index, elt) {
                        var $elt = $(elt),
							node = $elt.data('node'),
							pid = $elt.data('pid');
                                           
						nodes.push(node);			   
						pids.push(pid);
                    });
					
					self.oLorenz.killProcess(nodes, pids).done(function(response) {
						var errs = [];
						for (var i = 0; i < response.length; i++) {
							var result = response[i];
							if (result.status == 0) {
								// remove the row from the current list of processes								
								$('[data-pid=' + result.pid + ']').remove();
								
								self._resetKillButton();
							} else {
								errs.push(result.err);
							}
						}
						if (errs.length > 0) {
							self._toggleDialog({title: 'Command failed', height: 'auto', width: 'auto', maxWidth: 900}, errs.join('<br />'));
						}
					});
					
					return false;
                });
		},
        
        _bindTableEvents: function() {
            var self = this;
            
            this.$wrapper
				.on('hover', '.portlet-processViewerTable tr.process-clickable', function(e){
                    $(this).toggleClass('ui-state-hover');
                })
                .on('click', '.portlet-processViewerTable tr.process-clickable', function(e) {
					$(this).toggleClass('ui-state-active process-selected');
                    self._resetKillButton();
				});
        },
        
		_processByClusterTmpl: '<div style="max-height: 350px; width=100%">'+
                                    'Select a host and click "Get processes" to get a list of user-owned processes by cluster. Select one or more processes and click "Kill Process(es)" to terminate.' +
									'<hr width=100% style="margin-bottom: 10px;" />' +
                                    '<div style="display: table; width:100%;">' +
                                        '<div style="display: table-row;">' + 
                                            '<div style="margin-bottom: 5px; display: table-cell">Host: ' +
                                                '<select id="portlet-processViewer-select">' +
                                                    '{{each accounts}}<option value="${$value}">${$value}</option>{{/each}}' +
                                                '</select>' +
                                            '</div>'+
                                            '<div style="display: table-cell; text-align:right"><a href="#" id="process-get-button">Get processes</a></div>' +
                                        '</div>' +
                                    '</div>' +
									'<hr width=100% style="margin-top: 10px;" />' +
                                    '<div id="processViewer-results" >'+
										'<div style="text-align: center; margin-top: 30px; margin-bottom: 30px"> --empty-- </div>' + 
                                    '</div>' +
                                '</div>',
        
        _processTableTmpl:
			'<a href="#" id="process-kill-button" style="margin-top: 5px;o">Kill process(es) </a><br />' +
			'{{each errors}}' +
				'<div width="100%" class="ui-state-highlight"> Error running command on ${node}: ${error}</div>' +
			'{{/each}}' +
			'<br />' + 
			'<table width=100% class="portlet-ui-table portlet-processViewerTable">' +
				'<thead>' +
					'<tr>' +
						'<th class="ui-state-default" align="left">PID</th>' +
						//'<th class="ui-state-default">PPID</th>' +
						'<th class="ui-state-default" align="left">Command</th>' +
						'<th class="ui-state-default">Node</th>' +
					'</tr>' +
				'</thead>' +
				'<tbody>' +
					'{{if $.isEmptyObject(processes)}}<tr><td colspan=3 align=center>No processes for selected host</td></tr>'+
					'{{else}}' +
						'{{each processes}}' +
                            '<tr class="portlet-cursorPointer process-clickable" id="process-${pid}" title="${command}" data-node="${node}" data-pid="${pid}">' +
                                '<td>${pid}</td>' +
                                //'<td align="center">${ppid}</td>'+
                                '<td align="left" style="max-width: 100px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden">${command}</td>'+
                                '<td align="center">${node}</td>'+
                            '</tr>'+
						'{{/each}}' +
					'{{/if}}' +
				'</tbody>' +
			'</table>'
    });
}(jQuery));
