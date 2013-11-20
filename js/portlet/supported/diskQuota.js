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
    $.widget("lorenz.diskQuota", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'my disk usage',
			userPortlet: 1,
			dataTimestamp: 1,
            mySettings: {
                buttonPadding: 2
            }
        },
        
		refreshRate: 3600,
		  
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
			var oLorenz = this.oLorenz;
			
            return [ oLorenz.getDiskQuotaInfo(), oLorenz.getDefaultHost() ];
        },
		
		purgeData: {},
        
        render: function(response, defaultHost) {
			this.defaultHost = defaultHost;
			
            this.$wrapper.append(this._getQuotaHeaderDesc(), this._buildQuotaTable(response.filesystems));
            
            this._getPurgeData();
        },
        
        _getPurgeData: function(){
            var self = this;
            
            this.oLorenz.getPurgedFiles()
                .done(function(r){
                    self._buildPurgeLinks(r);
                });
        },
        
        _buildQuotaTable: function(fileSystems){
            var table = this._getQuotaTable(),
                tbody = table.find('tbody');
                
            if(fileSystems.length > 0){
                this._sortFileSystems(fileSystems);

                for(var i = 0, il = fileSystems.length; i < il; i++){	
					tbody.append(this._buildFileSystemRow(fileSystems[i]));
                }
            }
            else{
                tbody.append('<tr><td colspan=4 align=center>No data found</td></tr>');
            }
            
            return table;
        },
        
        _getQuotaHeaderDesc: function(){
            return '<div><span style = "color:#FC9C02;font-weight:bold">Orange</span> bolded rows means the quota is between 90% and 97%.  <span style = "color: red;font-weight:bold">Red</span> rows are quotas at 98% or above.</div><hr width = 100% />';    
        },
        
        _getQuotaTable: function(){
            return $('<table width=100% class = "diskQuotaTable">'+
                        '<thead>'+
                            '<tr align=left><th style = "padding-right: 10px">File System</th><th># Files</th><th># Bytes</th><th>Quota</th><th>pct</th></tr>'+
                        '</thead>'+
                        '<tbody></tbody></table>');
        },
        
        _buildFileSystemRow: function(item){
            var $row = $('<tr class = "portlet-diskQuota-row" data-filesystem="'+item.filesystem+'"><td style = "padding-right: 10px" align=left>'+item.filesystem+'</td><td>'+item.nfiles+'</td><td>'+item.used+'</td><td>'+item.limit+'</td><td>'+item.pct+'%</td></tr>');
            
            if(item.pct >= 90 && item.pct <= 97){
                $row.css({fontWeight: 'bold', color: '#FC9C02'});
            }
            else if(item.pct >= 98){
                $row.css({fontWeight: 'bold', color: 'red'});
            }
            
            var $last = $row.find('td:last');
			
			$last
				.append(this._buildDiskQuotaDetailsLink(item.details));

            return $row;
        },
		
		_buildPurgeLinks: function(pd){
			var obj = this,
				purgeData = pd || {},
				$purgeLink = '',
                $rows = this.$wrapper.find('.diskQuotaTable tr.portlet-diskQuota-row');
                
            $rows.each(function(){
                var $r = $(this),
                    fs = $r.data('filesystem');
                
                if(purgeData[fs] && !obj._inUserView()){
                    $purgeLink = $('<div class="ui-state-default" title = "purge details"><span class="ui-icon ui-icon-alert"></span></div>')
                        .addClass('portlet-ui-icon portlet-floatRight')
                        .hover(
                            function(){ $(this).addClass('ui-state-hover').addClass('portlet-ui-icon-hover') },
                            function(){ $(this).removeClass('ui-state-hover') }
                        ).click(function(){
                            obj._toggleDialog({
                                title: 'Purge details for '+fs,
                                width: 'auto',
                                resizable: false
                            },
                            obj._buildPurgeDialogContent(purgeData[fs], fs));
                        });
                 
                    $r.find('td:last').append($purgeLink);
                }
            });
		},
		
		_buildPurgeDialogContent: function(fsData, fs){
			var obj = this,
				$content = $('<div></div>');
                
			for(var i = 0, il = fsData.length; i < il; i++){
				var data = fsData[i],
					$listLink = $("<a href='#'>see list</a>")
					.click(data.purgeFile, function(e){
						window.open(window.location.protocol+"//"+window.location.host+'/lorenz/lora/lora.cgi/file/'+obj.defaultHost.host+e.data+'?view=read&format=auto&download=1');
						return false;
					})
					
				$content.append(data.purgeDate + ' - ' + (data.totalPurged || 0) +' files purged (', $listLink, ')<br/>');
			}
			
			return $content;
		},
        
        _sortFileSystems: function(fileSystems){
            //custom sort function for 2d array based on filesystem name
            fileSystems.sort(function(a, b){
                if(a.filesystem > b.filesystem){
                    return 1;
                }
                else if(a.filesystem < b.filesystem){
                    return -1;
                }
                return 0;
            });
        },
        
        _buildDiskQuotaDetailsLink: function(details){
			var obj = this,
				$detailLink = "";
		
			if(details !== undefined){
				$detailLink = $('<div class="ui-state-default" title = "show details"><span class="ui-icon ui-icon-info"></span></div>')
				.addClass('portlet-ui-icon portlet-floatRight')
				.hover(
					function(){ $(this).addClass('ui-state-hover').addClass('portlet-ui-icon-hover') },
					function(){ $(this).removeClass('ui-state-hover') }
				).click(function(){
					obj._toggleDialog({title: 'Disk Quota Details', width: 'auto', resizable: false}, $('<div id = "portlet-details"><pre>'+details+'</pre></div>'));
				});
			}
			
			return $detailLink;
		}
    });
}(jQuery));
