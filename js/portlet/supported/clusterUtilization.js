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
    $.widget("lorenz.clusterUtilization", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'cluster utilization',
			dynamicRendering: 1,
            mySettings: {
                defaultClusters: 'mine'                
            }
        },
		
		//refresh rate (seconds)
		refreshRate: 3600,

        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getAllClusterUtilizations() ];
        },
        
        render: function(response) {            
           response = this._cachedResponseHandle(response);

            var obj = this,
				clusters = obj._getSelectedClusters(response.data, response.accessibility),
				hostnames = obj._getClusterHostNames(clusters),
                sparkOpts = obj._getSparkOpts(hostnames),
                $table = $('<table width = "100%"></table>');
   
            obj.$wrapper.append('<div>Cluster Utilization for the past 14 days (hourly)</div><hr width = 100% />').append($table);
     
            for(var i = 0, il = clusters.length; i < il; i++){
                var current = clusters[i],
                    host = current.host,
                    lastUpdate = current.last_update_ms,
                    history = current.history,                    
                    dataVals = obj._buildDataSeries(history, host);
                
                var $hcLink = obj._buildClusterHcLink(host, dataVals.series, lastUpdate);
                
                var $row = $('<tr><td>'+host+':&nbsp;</td><td><span class = "dynamicSparkline">&nbsp;</span></td></tr>');
                
                var $sparkElement = $table.append($row).find('.dynamicSparkline:eq('+i+')');
                
                if(dataVals.yVals.length > 0){
                    $row.find('td:eq(1)').append($hcLink);
                    $sparkElement.sparkline(dataVals.yVals, sparkOpts);
                    $.sparkline_display_visible();
                }
                else{             
                    $sparkElement.append('No data');
                }
            }
            
            if(clusters.length == 0){
                obj.$wrapper.append('You have no clusters selected. Or you have the "defaultClusters" setting set to "mine", and you aren\'t in the LC bank.  Click the gear icon to change clusters.');
            }	

			obj._bindWindowResizeRefresh();		

            $table.find('td').css({paddingBottom: '10px'});
        },
        
        _buildClusterHcLink: function(host, series, lastUpdate){
			var self = this,
				sCache = series;
	
            return $('<div class="ui-state-default" title = "show detailed plot"><span class="ui-icon ui-icon-image"></span></div>')
                .addClass('portlet-ui-icon portlet-floatRight')
                .hover(
                    function(){ $(this).addClass('ui-state-hover').addClass('portlet-ui-icon-hover') },
                    function(){ $(this).removeClass('ui-state-hover') }
                ).click(function(e){
                	var d = new Date(lastUpdate);
                	
					e.data = {
						measuringName: 'cluster utilization',
						dialogTitle: 'detailed cluster utilization plot',
						series: series,
						units: '%',
						seriesType: 'area',
						chartTitle: host+ ' cluster utilization',
						max: 100,
						dialogFooter: '<div class="ui-state-disabled dialog-smallNote" style="text-align:right">Data Last Updated: '+d.toDateString()+' '+d.toLocaleTimeString()+'</div>'
					};
					
					self._buildHighChartDialog(e);
					
					series = sCache;
				});
        },
        
        _buildDataSeries: function(history, host){
            var plotSet = {data: [], color: this._getSparkLineColor(), name: host, fillOpacity: '0.5'},
                series = [],
                yVals = [];

            for(var x in history){
                yVals.push(history[x]);
                plotSet.data.push({x: parseInt(x), y: parseInt(history[x]*100)});
            }
            
            series.push(plotSet);
            
            return {series: series, yVals: yVals};
        },
		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {},
				clusters = this.currentDataSet.data,
				defaultClusters = typeSpecificSettings.defaultClusters,
				$select = this._buildClusterSelect(clusters, this.currentDataSet.accessibility),
				$links = this._buildClusterSelectLinks($select, defaultClusters);
					
			return {
				defaultClusters: $links.find('div:eq(1)').append($select).end()
			};
		}
    });
}(jQuery));
