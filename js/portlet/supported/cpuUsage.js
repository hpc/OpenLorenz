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
    $.widget("lorenz.cpuUsage", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'my historic cpu usage',
			userPortlet: 1,
			dynamicRendering: 1,
            mySettings: {
                defaultClusters: 'all'				
            }
        },
                
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getCpuUsage() ];
        },
        
        render: function(response) {            
            response = this._cachedResponseHandle(response);
			
            var obj = this,
				clusters = obj._getSelectedClusters(response),
				hostnames = obj._getClusterHostNames(clusters),
                sparkOpts = obj._getSparkOpts(hostnames),
                $table = $('<table width = "100%"></table>'),
				timeoutId = -1,
				portletType = obj.widgetName;
            
            obj.$wrapper.append('<div>My cpu usage for the past 14 days (daily)</div><hr width = 100% />').append($table);
            
            if(clusters.length == 0){
                obj.$wrapper.append('You don\'t have any machines selected to monitor cpu usage.  Or, you have not utilized any cpu during the last 14 days.');
            }
            else{
                for(var i = 0, il = clusters.length; i < il; i++){
                    var current = clusters[i],
                        host = current.host,
                        history = current.history,
                        bankHistory = current.bank_history,
                        yVals = [];
                    
                    //build sparklines array
                    for(var x in history){ yVals.push(history[x]); }               
                    
                    //our little image they click on to bring up the highcharts graph
                    var $hcLink = obj._buildHighChartLink(host, bankHistory);

                    var $row = $('<tr><td>'+host+':&nbsp;</td><td><span class = "dynamicSparkline">&nbsp;</span></td></tr>');
                    
                    var $sparkElement = $table.append($row).find('.dynamicSparkline:eq('+i+')');
                    
                    if(yVals.length > 0){
                        $row.find('td:eq(1)').append($hcLink);
                        $sparkElement.sparkline(yVals, sparkOpts);
                        $.sparkline_display_visible();
                    }
                    else{                    
                        $sparkElement.append('No data');
                    }
                }
            }
			
			obj._bindWindowResizeRefresh();
			
            $table.find('td').css({paddingBottom: '10px'}); 
        },
        
        _buildHighChartLink: function(host, bankHistory){
            //returns the ui-icon they can click on to get the highcharts plot in a dialog
            return $('<div class="ui-state-default" title = "show detailed plot"><span class="ui-icon ui-icon-image"></span></div>')
                .addClass('portlet-ui-icon portlet-floatRight')
                .hover(
                    function(){ $(this).addClass('ui-state-hover').addClass('portlet-ui-icon-hover') },
                    function(){ $(this).removeClass('ui-state-hover') }
                ).click({
                    measuringName: 'cpu usage',
                    dialogTitle: 'Detailed cpu usage plot',
                    units: 'cpu hours',
                    chartTitle: 'user vs total bank usage ('+host+')',
                    host: host,
                    bankHistory: bankHistory
                }, $.proxy(this, '_buildBanksChart'));
        },
        
        _buildBanksChart: function(e){
            var obj = this,
                bankHistory = e.data.bankHistory,
                series = [];
			
            showLoadingScreen();
            
            var bPromises = obj._buildUserBanksSeries(bankHistory, series);
            
            //once we have all total bank usage...
            $.when.apply(this, bPromises)
                .done(function(){
                    var args = Array.prototype.slice.call(arguments);
                    
                    obj._buildTotalBanksSeries(args, series);

                    e.data.series = series;
                    
                    hideLoadingScreen();
                    
                    obj._buildHighChartDialog(e);                                
                })
                .fail(function(){hideLoadingScreen()});                        
        },
        
        _buildUserBanksSeries: function(bankHistory, series){
            var bPromises = [];
            
            //user bank usage plot set building
            for(var j = 0, jl = bankHistory.length; j < jl; j++){
                var bankObj = bankHistory[j],
                    bHistory = bankObj.history,
                    name = bankObj.bank,
                    plotSet = {data: [], color: this._getHighchartColor(j), name: name + ' ('+bankObj.user+')'};
                    
                for(var day in bHistory){
                    plotSet.data.push({x: this._parseDate(day), y: parseFloat(bHistory[day])});
                }
                
                //while we're at it lets get total bank usage and return deferred promises to these calls
                bPromises.push(this.oLorenz.getBankHistoryForHost(name, bankObj.host));
                
                series.push(plotSet);
            }
            
            return bPromises;
        },
		
		_parseDate: function(date){
			var d = date.split('-');
			
			return new Date(d[0], d[1]-1, d[2]).valueOf();
		},
		
        _buildTotalBanksSeries: function(args, series){			
            for(var i = 0, il = args.length; i < il; i++){
                var output = args[i];
                
                for(var j = 0, jl = output.length; j < jl; j++){
                    var curr = output[j],                                        
                    history = curr.history,
                    set = {data: [], dashStyle: 'ShortDash', color: this._getHighchartColor(i), name: curr.bank + ' (total)'};
                    
                    for(var d in history){
                        set.data.push({x: this._parseDate(d), y: parseFloat(history[d])});
                    }
                    
                    series.push(set);                                        
                }
            }
        },
		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {},
				clusters = this.currentDataSet,
				defaultClusters = typeSpecificSettings.defaultClusters,
				$select = this._buildClusterSelect(clusters);

			var $all = $('<span class = "dialogLink">all</span>')
				.addClass('portlet-allClustersLink')
				.click(function(e){
					$select.find('option').prop('selected', true);
					$select.trigger('change');
				});
		
			if(defaultClusters == 'all'){             
				$select.find('option').attr('selected', true);
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
			
			return {
				defaultClusters: $('<div><div style = "display: table-cell; vertical-align: middle;">Clusters shown:&nbsp;&nbsp;</div><div style = "display: table-cell; vertical-align: middle;"></div></div>')
					.append($all)                          
					.find('div:eq(1)')
					.append($select)
					.end()
			};
		}
    });
}(jQuery));
