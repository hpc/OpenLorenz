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
    $.widget("lorenz.banks", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'my banks',
			userPortlet: 1,
            mySettings: {
                buttonPadding: 2
            }
        },
                
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getBanks() ];
        },
        
        render: function(response) {            
            var banks = response.banks;
            
            if($.isArray(banks) && banks.length > 0){
                var columns = 4,                    
                    $table = $('<table class="portlet-buttonTable" width = 100%></table>');
                    
                $table.append.apply($table, this._buildBankRows(columns, banks));
                
                this.$wrapper.append($table, '&nbsp;* = default bank');  
            }
            else{
                this.$wrapper.append('No banks found');
            }        
        },
        
        _buildBankRows: function(columns, banks){
            var rowArr = [],
                rows = Math.ceil(banks.length / columns),
                width = 100/columns;
            
            for(var i = 0, il = rows; i < il; i++){
                var $row = $('<tr></tr>');
                
                for(j = 0, jl = columns; j < jl; j++){
                    var $td = $('<td>&nbsp;</td>'),
                        a = banks[columns*i+j];
                    
                    if(a){
                        this._buildBankCol($td.empty().append(a.bank + (a['default'] ? ' *' : '')), width, a.bank);  
                    }                    
                    
                    $row.append($td);    
                }
                
                rowArr.push($row);
            }
            
            return rowArr;
        },
        
        _buildBankCol: function($td, width, bank){
            $td
                .css({width: width+'%', padding: this.options.mySettings.buttonPadding+'px', cursor: 'pointer'})
                .addClass('ui-corner-all ui-state-default')
                .hover(function(){ $(this).toggleClass('ui-state-hover') })
                .click(bank, $.proxy(this, '_bankButtonClick'));
        },
        
        _bankButtonClick: function(e){
            showLoadingScreen();
            //proxy used here to ensure showBankDialog gets run in the context of the Portlet Object "obj"
            this.oLorenz.getBankInfo(e.data, {context: this})
                .always(hideLoadingScreen)
                .done(this._showBankDialog)
                .fail(function(e){
                    this._error({
                        technicalError: e,
                        friendlyError: this._serverSideError(), 
                        location: 'get bank info'
                    });
                });	
        },
        
        _showBankDialog: function(response){
            var html = 'No bank data found.'
            
            if(response.bankDetails){                
                html = '<table width = 100% cellspacing=10 cellpadding=10>';                
		        html += '<tr><th align="left">User</th><th align="left">Cluster</th><th align="left">Bank</th><th align="left">QoS</th></tr>';    

                for(var i = 0, il = response.bankDetails.length; i < il; i++){
                    var item = response.bankDetails[i];
                    
                    html += '<tr><td>'+item.user+'</td><td>'+item.cluster+'</td><td>'+item.bank+'</td><td>'+item.qos+'</td></tr>';    
                }              
                html += '</table>';
            }
            
            this._toggleDialog({title: 'Bank Details for '+response.bank}, html);      
        },
		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {};
			
			return {
				buttonPadding: 'Button padding (px): <input type = "text" size = "3" name = "buttonPadding" value = "'+typeSpecificSettings.buttonPadding+'" />'
			};
		}
    });
}(jQuery));
