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
    $.widget("lorenz.accounts", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'my accounts',
			userPortlet: 1,
            mySettings: {
                buttonPadding: 2
            }
        },
                
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getAccounts() ];
        },
        
        render: function(response) {            
            var accounts = response.accounts;
            
            if($.isArray(accounts) && accounts.length > 0){
                var columns = 4,                    
                    $table = $('<table class="portlet-buttonTable" width = 100%></table>');
                    
                $table.append.apply($table, this._buildAccountRows(columns, accounts));
                
                this.$wrapper.append($table);
            }
            else{
                this.$wrapper.append('No accounts found');
            }        
        },
        
        _buildAccountRows: function(columns, accounts){
            var rowArr = [],
                rows = Math.ceil(accounts.length / columns),
                width = 100/columns;
            
            for(var i = 0, il = rows; i < il; i++){
                var $row = $('<tr></tr>');
                
                for(j = 0, jl = columns; j < jl; j++){
                    var $td = $('<td>&nbsp;</td>'),
                        a = accounts[columns*i+j];
                    
                    if(a){
                        this._buildAccountCol($td.empty().append(a), width);  
                    }                    
                    
                    $row.append($td);    
                }
                
                rowArr.push($row);
            }
            
            return rowArr;
        },
        
        _buildAccountCol: function($td, width){
			var obj = this;
			
            $td
                .css({width: width+'%', padding: this.options.mySettings.buttonPadding+'px', cursor: 'pointer'})
                .addClass('ui-corner-all ui-state-default')
                .hover(function(){ $(this).toggleClass('ui-state-hover') })
                .click($td.text(), function(e){
					obj._doHostInfoDialog(e.data);
				});
        },
		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {};
			
			return {
				buttonPadding: 'Button padding (px): <input type = "text" size = "3" name = "buttonPadding" value = "'+typeSpecificSettings.buttonPadding+'" />'
			};
		}
    });
}(jQuery));
