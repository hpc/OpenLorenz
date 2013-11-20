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
    module("Lorenz");

    test("Creating Lorenz Object", function(){        
        ok($.isPlainObject(Lorenz), 'Lorenz is not an initialized object, missing Lorenz.js?');
    });
    
    asyncTest("getGroups", function(){
       Lorenz.getGroups()
        .done(function(){ok(true, 'Succesful call to getGroups')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getGroups: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getAccounts", function(){
       Lorenz.getAccounts()
        .done(function(){ok(true, 'Succesful call to getAccounts')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getAccounts: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getClusters", function(){
       Lorenz.getClusters()
        .done(function(){ok(true, 'Succesful call to getClusters')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getClusters: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getGroupInfo", function(){
       Lorenz.getGroupInfo()
        .done(function(){ok(true, 'Succesful call to getGroupInfo')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getGroupInfo: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getHostInfo", function(){
       Lorenz.getHostInfo()
        .done(function(){ok(true, 'Succesful call to getHostInfo')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getHostInfo: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getAllMachineLoads", function(){
       Lorenz.getAllMachineLoads()
        .done(function(){ok(true, 'Succesful call to getAllMachineLoads')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getAllMachineLoads: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getAllClusterUtilizations", function(){
       Lorenz.getAllClusterUtilizations()
        .done(function(){ok(true, 'Succesful call to getAllClusterUtilizations')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getAllClusterUtilizations: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getNews", function(){
       Lorenz.getAccounts()
        .done(function(){ok(true, 'Succesful call to getNews')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getNews: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getNewsItem", function(){
       Lorenz.getNewsItem('thisNewsItem')
        .done(function(){ok(true, 'Succesful call to getNewsItem')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getNewsItem: '+status+", "+e);})
        .then(start, start);   
    });
    
    asyncTest("getDiskQuotaInfo", function(){
       Lorenz.getDiskQuotaInfo()
        .done(function(){ok(true, 'Succesful call to getDiskQuotaInfo')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getDiskQuotaInfo: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("getCpuUsage", function(){
       Lorenz.getCpuUsage()
        .done(function(){ok(true, 'Succesful call to getCpuUsage')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getCpuUsage: '+status+", "+e);})
        .then(start, start);        
    });

    asyncTest("getJobs", function(){
       Lorenz.getJobs()
        .done(function(){ok(true, 'Succesful call to getJobs')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getJobs: '+status+", "+e)})
        .then(start, start);        
    });

    //asyncTest("getRss", function(){
    //   Lorenz.getRss()
    //    .done(function(){ok(true, 'Succesful call to getRss')})
    //    .fail(function(jqXHR, status, e){ok(false, 'Server error during request to getRss: '+status+", "+e);})
    //    .then(start, start);        
    //});

    asyncTest("execCommand", function(){
       Lorenz.execCommand('oslic', {data: {command: 'ls -l'}})
        .done(function(){ok(true, 'Succesful call to execCommand')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to execCommand: '+status+", "+e);})
        .then(start, start);        
    });

    asyncTest("storeWrite", function(){
       Lorenz.storeWrite('lorenzTest', {data: '123'})
        .done(function(){ok(true, 'Succesful call to storeWrite')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to storeWrite: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("storeAppend", function(){
       Lorenz.storeAppend('lorenzTest', {data: '456'})
        .done(function(){ok(true, 'Succesful call to storeAppend')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to storeAppend: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("storeRead", function(){
       Lorenz.storeRead('lorenzTest')
        .done(function(){ok(true, 'Succesful call to storeRead')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to storeRead: '+status+", "+e);})
        .then(start, start);        
    });
    
    asyncTest("storeDelete", function(){
       Lorenz.storeDelete('lorenzTest')
        .done(function(){ok(true, 'Succesful call to storeDelete')})
        .fail(function(jqXHR, status, e){ok(false, 'Server error during request to storeDelete: '+status+", "+e);})
        .then(start, start);        
    }); 

})(jQuery);
