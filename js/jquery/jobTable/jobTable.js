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

/*
jobTable.js - render a table of jobs
*/
(function($, Lorenz) {
    $.widget("lorenzUtils.jobTable", {
        options: {
            tableType: 'scroll',
            headers: ['JobId', 'Name', 'JobState', 'Host', 'StartTime', 'EndTime'],
            data: []
        },
        
        $table: '',
        
        _create: function(){
            this.oLorenz = Object.create(Lorenz);
            
            showLoadingScreen();
            
            this.oLorenz.getMyJobs()
                .always(hideLoadingScreen)
                .done($.proxy(this, 'renderTable'))
                .fail(function(){
                    alert('Failed getting jobs! \n\nError: '+JSON.stringify(arguments));
                });
        },
        
        renderTable: function(jobs){
            var options = this.options;
            
            if(options.tableType === 'scroll'){
                this.$table = this.element.scrollTable({
                    data: this.formatData(jobs),
                    headers: options.headers
                }).find('table');
            }
            else if(options.tableType === 'datatable'){
                this.renderDatatable(jobs);
            }
        },
        
        renderDatatable: function(jobs){
            var colDefs = [];
                
            this.$table = this.element.html('<table width=100% class="display jobTable-datatable"></table>')
                .find('table')
                .dataTable({
                    aaData: this.formatData(jobs),
                    aoColumnDefs: colDefs.concat(this.buildColDefs()),
                    bJQueryUI: true,
                    sPaginationType: "full_numbers",
                    asStripeClasses: [ 'ui-widget-content', ''],
                    aLengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
                    sScrollX: "100%",
                    bScrollCollapse: true
                });
                
            this.bindTableEvents();
        },
        
        bindTableEvents: function(){
            var self = this,
                options = this.options,
                $table = this.$table;
            
            if(typeof options.rowSelect === 'function'){
                this.element
                    .on('hover', 'table.jobTable-datatable tbody tr', function(){
                        $(this).toggleClass('ui-state-hover');
                    })
                    .on('click', 'table.jobTable-datatable tbody tr', function(){
                        if(self.$table.fnGetData().length > 0){
                            var $r = $(this);
                            
                            self.selectRow($r);
                        
                            options.rowSelect(this, self.$table.fnGetData(this)); 
                        }
                    });
                
                $table.addClass('rowSelectable');
            }
        },

        selectRow: function($r){
            this.$table.find('tbody tr').removeClass('ui-state-active');

            $r.addClass('ui-state-active');
        },
        
        buildColDefs: function(){
            var defs = [],
                headers = this.options.headers;
            
            for(var i = 0, il = headers.length; i < il; i++){
                defs.push({sTitle: headers[i], aTargets: [i]});
            }
            
            return defs;
        },
        
        formatData: function(jobs){
            var jobArr = jobs.jobs,
                headers = this.options.headers,
                data = [];
            
            for(var i = 0, il = jobArr.length; i < il; i++){
                var j = jobArr[i],
                    tmp = [];
                
                for(var k = 0, kl = headers.length; k < kl; k++){
                    tmp.push(j[headers[k]]);
                }
                
                data.push(tmp);
            }
            
            return data;
        },
        
        _setOption: function(){
            this._superApply(arguments);
        }
    });
}(jQuery, Lorenz));