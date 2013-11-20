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
    $.widget("lorenz.lcLookup", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'Person lookup',
            mySettings: {
                
            },
            // Refresh functionality not intuitive/necessary for this portlet
            refreshWidget: { enabled: false }
        },

        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            //Even though we don't directly use getAllUserInfo's results in this code, the lcPersonAutoComplete plugin
            //makes this same call.  Since getAllUserInfo does datacaching, this call here ensures the data is already cached
            //so by the time lcPersonAutocomplete calls it it just uses the cached version.. instead of not making the call until
            //the portlet is rendered
            return [ this.oLorenz.getAllUserInfo()];
        },
   
        _autoComplete: {},
        
        currXhr: -1,

        render: function(users){
            var content = 'Type LC username, OUN, or full name into the box. Click a result or navigate using arrow keys and press enter to search.<hr width="100%"/>',
                $autoComplete = this._buildAutoComplete();

            this.$wrapper.append(content, $autoComplete, '<div style="margin-top: 15px;" id="lookupResults"><strong>Results for: </strong><span id="resultsFor">n/a</span><hr width="100%"/><div id="lookupContent" style="height: 78px; position: relative;"><div class="portlet-emptyDiv">-- empty --</div></div></div>');
        },
        
        _buildAutoComplete: function(){
            var $input = $("<input type='text' style='width: 87%' name='lcLookupInput' />").lcPersonAutocomplete({
                    select: $.proxy(this, '_userSelect')
                }),
                $div = $("<div><strong>User:</strong> </div>").append($input);
            
            this._autoComplete = $input;
            
            return $div;
        },
        
        _userSelect: function(event, ui){            
            ui.item.value = ui.item.value.replace(/\<\/?strong\>/g, '');
            
            this._getResults(ui.item.value);
        },
        
        _getResults: function(userName){
            var self = this,
                $results = self.$wrapper.find("#lookupContent").empty().addClass('portletLoading'),
                currXhr = this.currXhr;

            if(currXhr !== -1 && (currXhr.state() !== 'resolved' || currXhr.state() !== 'rejected')){                
                this.currXhr.jqXhr.abort();
                this.currXhr = -1;
            }
            
            this.currXhr = this.oLorenz.getUserInfo(userName)                
                .done(function(r){
                    $results.removeClass('portletLoading').append(self._buildResults(r, userName));                    
                });
        },
        
        _buildResults: function(r, username){
            var obj = this,
                $resultsFor = this.$wrapper.find("#resultsFor").empty()
                                .append('"'+username+'"', '<div style="margin-top:5px">(<a class="portlet-allDetails" href="#">all details</a>, <a class="portlet-switchUserView" href="#">mylc user view</a>'+this._buildNameLinK(r.lcoun)+')</div>');
            
            $resultsFor.find("a.portlet-allDetails").click(function(){
                obj._showAllDetails(r, username);
                return false;
            })
            .end()
            .find('a.portlet-switchUserView').click(function(){
                obj._switchUserView(username);
                return false;
            });
            
            if($.isPlainObject(r) && !$.isEmptyObject(r)){
                var table = '<table width="100%">';
                
                table += '<tr><td width="75"><strong>Full Name:</strong></td><td>'+r.displayname+'</td></tr>';
                table += '<tr><td><strong>Email:</strong></td><td><a href="mailto:'+r.mail+'">'+r.mail+'</a></td></tr>';
                table += '<tr><td><strong>Telephone:</strong></td><td>'+r.telephonenumber+'</td></tr>';
                table += '<tr><td><strong>LC Name:</strong></td><td>'+username+'</td></tr>';
                table += '<tr><td><strong>OUN:</strong></td><td>'+r.lcoun+'</td></tr>';
                                
                table += '</table>';
                
                return table;
            }
            else{
                return '<div class="portlet-emptyDiv">-- no results --</div>';
            }
        },
        
        _showAllDetails: function(r, username){
            var table = '<table class="portlet-allDetails" width=100%>';
            
            table += '<tr><td><strong>Display Name:</strong></td><td>'+r.displayname+'</td></tr>';
            table += '<tr><td><strong>Employee Number:</strong></td><td>'+r.employeenumber+'</td></tr>';            
            table += '<tr><td><strong>Employee Type:</strong></td><td>'+r.employeetype+'</td></tr>';
            table += '<tr><td><strong>GID Number:</strong></td><td>'+r.gidnumber+'</td></tr>';
            table += '<tr><td><strong>Given Name:</strong></td><td>'+r.givenname+'</td></tr>';
            table += '<tr><td><strong>Home Directory:</strong></td><td>'+r.homedirectory+'</td></tr>';
            table += '<tr><td><strong>Acct Type:</strong></td><td>'+r.lcaccttype+'</td></tr>';
            table += '<tr><td><strong>Acct Valid:</strong></td><td>'+r.lcacctvalid+'</td></tr>';
            table += '<tr><td><strong>Computer Coordinator Org:</strong></td><td>'+r.lccomputercoordinatororg+'</td></tr>';
            table += '<tr><td><strong>Default Group:</strong></td><td>'+r.lcdefaultgroup+'</td></tr>';
            table += '<tr><td><strong>Citizenship:</strong></td><td>'+r.lccitizenship+'</td></tr>';            
            table += '<tr><td><strong>HPSS Home Directory:</strong></td><td>'+r.lchpsshomedir+'</td></tr>';
            table += '<tr><td><strong>OUN:</strong></td><td>'+r.lcoun+'</td></tr>';            
            table += '<tr><td><strong>Point of Contact:</strong></td><td>'+r.lcpointofcontact+'</td></tr>';
            table += '<tr><td><strong>Storage Type:</strong></td><td>'+r.lcstoragetype+'</td></tr>';
            table += '<tr><td><strong>Login Shell:</strong></td><td>'+r.loginshell+'</td></tr>';
            table += '<tr><td><strong>Email:</strong></td><td>'+r.mail+'</td></tr>';            
            table += '<tr><td><strong>Telephone:</strong></td><td>'+r.telephonenumber+'</td></tr>';
            table += '<tr><td><strong>UID:</strong></td><td>'+r.uid+'</td></tr>';
            table += '<tr><td><strong>UID Number:</strong></td><td>'+r.uidnumber+'</td></tr>';
            
            table += '</table>';
            
            this._toggleDialog({
                title: "All lookup details for "+username,
                width: 'auto'                
            }, table);   
        },
        
        _buildNameLinK: function(oun){
            var link = '';
            
            if(this.oLorenz.loraNetwork !== 'scf'){
                link = ', <a href = "https://webcenter.llnl.gov/myllnl/faces/adf.task-flow?adf.tfDoc=%2FWEB-INF%2Ftaskflows%2Fpeoplesearch-taskflow.xml&adf.tfId=peoplesearch-taskflow&searchvalue='+oun+'&searchfield=official_id" target="_blank">ph lookup</a>';
            }
            
            return link;
        }
    });
}(jQuery));
