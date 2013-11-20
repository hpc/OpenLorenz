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
    $.widget("lorenz.groups", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'my groups',
            userPortlet: 1,
            mySettings: {
                buttonPadding: 2
            }
        },
                
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getGroups() ];
        },
        
        render: function(response) {            
            var groups = response.groups;
            
            if($.isArray(groups) && groups.length > 0){
                var columns = 4,                    
                    $table = $('<table class="portlet-buttonTable" width = 100%></table>');
                    
                $table.append.apply($table, this._buildGroupRows(columns, groups));
                
                this.$wrapper.append($table);
            }
            else{
                this.$wrapper.append('No groups found');
            }        
        },
        
        _buildGroupRows: function(columns, groups){
            var rowArr = [],
                rows = Math.ceil(groups.length / columns),
                width = 100/columns;
            
            for(var i = 0, il = rows; i < il; i++){
                var $row = $('<tr></tr>');
                
                for(j = 0, jl = columns; j < jl; j++){
                    var $td = $('<td>&nbsp;</td>'),
                        g = groups[columns*i+j];
                    
                    if(g){
                        this._buildGroupCol($td.empty().append(g.gname), width);  
                    }                    
                    
                    $row.append($td);    
                }
                
                rowArr.push($row);
            }
            
            return rowArr;
        },
        
        _buildGroupCol: function($td, width){ 
            $td
                .css({width: width+'%', padding: this.options.mySettings.buttonPadding+'px', cursor: 'pointer'})
                .addClass('ui-corner-all ui-state-default')
                .hover(function(){ $(this).toggleClass('ui-state-hover') })
                .click($td.text(), $.proxy(this, '_groupButtonClick'));
        },
        
        _groupButtonClick: function(e){
            showLoadingScreen();
            
            this.oLorenz.getGroupInfo(e.data, {context: this})
                .always(hideLoadingScreen)
                .done(this._showGroupDialog)
                .fail(function(e){
                    this._error({
                        technicalError: e,
                        friendlyError: this._serverSideError(),
                        location: 'get group info'
                    });
                });
        },
        
        _showGroupDialog: function(response){
            var html = 'No group data found.'
            
            if(response.gname){
                var members = response.members;
                
                html = '<table width = 100% cellspacing=10 cellpadding=10>';                
                html += '<tr><td width = 115><b>Group Name:</b></td><td>'+response.gname+'</td></tr>';
                html += '<tr><td valign="top"><b>Approver(s):</b></td><td>'+response.approvers+'</td></tr>';
                html += '<tr><td valign="top"><b>Coordinator(s):</b></td><td>'+response.coordinators+'</td></tr>';
                html += '<tr><td valign="top"><b>Group ID:</b></td><td>'+response.gid+'</td></tr>';
                html += '<tr><td valign="top"><b>Members:</b></td><td style="max-width: 400px">'+members.join(', ')+'</td></tr>';                
                html += '</table>';
            }
            
            this._toggleDialog({title: 'group details for '+response.gname, 'width': 'auto'}, html);      
        },
        
        _settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {};
			
			return {
				buttonPadding: 'Button padding (px): <input type = "text" size = "3" name = "buttonPadding" value = "'+typeSpecificSettings.buttonPadding+'" />'
			};
		}
    });
}(jQuery));
