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

var Confluence = {
    init: function(){
        
    },
    
    baseUrl: '/confluence/rest/prototype/latest/',
    
    search: function(query, maxResults, type, uOptions){
        var options ={
            url: this.baseUrl + 'search',
            data: {
                query: query,
                //THIS DOESNT WORK!!!! OH WELL.  Confluence REST API bug
                'max-results': typeof maxResults !== 'undefined' ? maxResults : 50,
                type: typeof type !== 'undefined' ? type : ''
            }
        };
        
        //The "search" field must be set to search for users only
        if(type === 'user'){
            options.data['search'] = type;
        }
        
        $.extend(true, options, uOptions);
        
        return this.sendRequest(options);
    },
    
    getSpaces: function(uOptions){
        var options ={
            url: this.baseUrl + 'space?type=global&expand=space'
        };
        
        $.extend(true, options, uOptions);
        
        return this.sendRequest(options);
    },
    
    getSpaceDetails: function(key, expand, uOptions){
        var options ={
            url: this.baseUrl + 'space/'+key,
            data: {
                expand: expand || ''
            }
        };
        
        $.extend(true, options, uOptions);
        
        return this.sendRequest(options);
    },
    
    sendRequest: function(options) {
        //Some generic defaults
        var ajaxOptions = {
            url: this.baseUrl,
            dataType: 'json',
            type: 'GET'
        };
        
        $.extend(true, ajaxOptions, options);

        return $.ajax(ajaxOptions);
    }
};

Confluence.init();