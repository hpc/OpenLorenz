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
    module("Portlet");
    
    test("Zero configuration initialization", function(){
        var $portlet = $('<div></div>').portlet();
        
        var $pData = $portlet.data('portlet');
        
        ok(!$.isEmptyObject($pData), 'Portlet DOM to Object Link Exists');
        
        ok(!$.isEmptyObject($.fn.portletExt), 'Portlet Extensions exist');
        
        ok(!$.isEmptyObject($.fn.portletExt.portletDesc), 'Portlet Description Exists for Portlet Controls exist');
    });
    
    asyncTest("Portlet Controls basic init", function(){
        var $pControl = $('<div></div>').portletControls({portletDesc: $.fn.portletExt.portletDesc});
        
        var promise = $pControl.data('promise');
        
        promise.then(
            function(r){ok(true, 'Successful initialization of portlet controls'); start();},
            function(e){ok(false, 'Failed to build portlet controls: '+e); start();}
        );
    });
    
    asyncTest("accounts portlet", function(){
        var expected = {
            "accounts" : [
               "alastor",
               "ansel",
               "atlas"
            ]
        };
        
        var $pObj = $('<div></div>').portlet({portletType: "accounts", portletDataSource: {accounts: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "accounts"});
        
        var promise = $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        //Our local data test
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("groups portlet", function(){
        var expected = {
            "groups" : [
                {
                   "gid" : "37031",
                   "gname" : "joeltine"
                },
                {
                   "gid" : "1606",
                   "gname" : "lorenz"
                }
            ]            
        };          
        
        var $pObj = $('<div></div>').portlet({portletType: "groups", portletDataSource: {groups: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "groups"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("machineLoad portlet", function(){
        var expected =  [{
            "host" : "ansel",
            "partitions" : [
                {
                    "allocated" : "0",
                    "default" : 0,
                    "host" : "ansel",
                    "idle" : "16",
                    "other" : "0",
                    "partition" : "pdebug",
                    "total" : "16"
                },
                {
                    "allocated" : "292",
                    "default" : 1,
                    "host" : "ansel",
                    "idle" : "4",
                    "other" : "0",
                    "partition" : "pbatch",
                    "total" : "296"
                }
            ]
        }];       
        
        var $pObj = $('<div></div>').portlet({portletType: "machineLoad", portletDataSource: {machineLoad: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "machineLoad"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("clusterUtilization portlet", function(){
        var expected = [
            {
                "accessible" : 0,
                "history" : {},
                "host" : "alastor",
                "last_update" : "2011-02-24 09:01:15"
            },
            {
               "accessible" : 1,
               "history" : {
                    "2011-02-10T10:59:59" : "0.95",
                    "2011-02-10T11:59:59" : "0.99",
                    "2011-02-10T12:59:59" : "0.99",
                    "2011-02-10T13:59:59" : "0.79",
                    "2011-02-10T14:59:59" : "0.89",
                    "2011-02-10T15:59:59" : "0.91"        
                },
                "host" : "ansel",                    
                "last_update" : "2011-02-24 09:01:15"
            }
        ];
         
        var $pObj = $('<div></div>').portlet({portletType: "clusterUtilization", portletDataSource: {clusterUtilization: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "clusterUtilization"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("news portlet", function(){
        var expected = {    
             "newsItems" : [
                {
                    "item" : "diff_vim_vi",
                    "update_time" : "2011-02-24 09:18:53"
                },
                {
                    "item" : "llnl_backbone",
                    "update_time" : "2011-02-23 15:45:10"
                }
            ]            
        };          
        
        var $pObj = $('<div></div>').portlet({portletType: "news", portletDataSource: {news: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "news"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("diskQuota portlet", function(){
        var expected = {         
            "filesystems" : [
                {
                   "filesystem" : "/usr/gapps",
                   "limit" : "n/a",
                   "nfiles" : "0",
                   "used" : "0",
                   "user" : "joeltine"
                },
                {
                   "filesystem" : "/nfs/tmp2",
                   "limit" : "2.0T",
                   "nfiles" : "0",
                   "used" : "0",
                   "user" : "joeltine"
                }
            ]            
        };          
        
        var $pObj = $('<div></div>').portlet({portletType: "diskQuota", portletDataSource: {diskQuota: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "diskQuota"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("links portlet", function(){
        var expected = "{\"text\":\"Google\",\"url\":\"http://www.google.com\"}_++_{\"text\":\"thesaurus\",\"url\":\"http://www.thesaurus.com\"}_++_";
        
        var $pObj = $('<div></div>').portlet({portletType: "links", portletDataSource: {links: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "links"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("cpuUsage portlet", function(){
        var expected = [
            {
                "bank_history" : [{
                   "bank" : "cms",
                   "history" : {
                        "2011-02-11" : 0,
                        "2011-02-12" : 0,
                        "2011-02-13" : 0,
                        "2011-02-14" : 0,
                        "2011-02-15" : 0,
                        "2011-02-16" : 0,
                        "2011-02-17" : 0,
                        "2011-02-18" : 0,
                        "2011-02-19" : 0,
                        "2011-02-20" : 0,
                        "2011-02-21" : 0,
                        "2011-02-22" : 0,
                        "2011-02-23" : 0,
                        "2011-02-24" : 0
                   },
                   "host" : "hera"
                }],
                "history" : {
                    "2011-02-11" : 51501,
                    "2011-02-12" : 0,
                    "2011-02-13" : 0,
                    "2011-02-14" : 0,
                    "2011-02-15" : 37966,
                    "2011-02-16" : 349150,
                    "2011-02-17" : 196580,
                    "2011-02-18" : 44392,
                    "2011-02-19" : 0,
                    "2011-02-20" : 0,
                    "2011-02-21" : 0,
                    "2011-02-22" : 0,
                    "2011-02-23" : 0,
                    "2011-02-24" : 0
                },
                "host" : "hera",
                "last_update" : "2011-02-24 10:01:15"
            },
            {
                "bank_history" : [{
                      "bank" : "cms",
                      "history" : {
                            "2011-02-11" : 0,
                            "2011-02-12" : 0,
                            "2011-02-13" : 0,
                            "2011-02-14" : 0,
                            "2011-02-15" : 0,
                            "2011-02-16" : 61963,
                            "2011-02-17" : 33234,
                            "2011-02-18" : 18192,
                            "2011-02-19" : 58865,
                            "2011-02-20" : 116945,
                            "2011-02-21" : 5787,
                            "2011-02-22" : 0,
                            "2011-02-23" : 439,
                            "2011-02-24" : 0
                      },
                      "host" : "prism"
                }],
                "history" : {
                    "2011-02-11" : 0,
                    "2011-02-12" : 0,
                    "2011-02-13" : 0,
                    "2011-02-14" : 0,
                    "2011-02-15" : 0,
                    "2011-02-16" : 61963,
                    "2011-02-17" : 33234,
                    "2011-02-18" : 18192,
                    "2011-02-19" : 58865,
                    "2011-02-20" : 116945,
                    "2011-02-21" : 5787,
                    "2011-02-22" : 0,
                    "2011-02-23" : 439,
                    "2011-02-24" : 0
                },
                "host" : "prism",
                "last_update" : "2011-02-24 10:01:15"
            }
        ];
        
        var $pObj = $('<div></div>').portlet({portletType: "cpuUsage", portletDataSource: {cpuUsage: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "cpuUsage"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("command portlet", function(){
        var expected = {
            "accounts" : [
                "ansel",
                "atlas"
            ]
        };
        
        var $pObj = $('<div></div>').portlet({portletType: "command", portletDataSource: {command: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "command"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    asyncTest("jobs portlet", function(){
        var expected = {
            "jobs" : [
                {
                    "host" : "atlas",
                    "jobid" : "309875",
                    "name" : "PYR-30GPa.500K",
                    "state" : "RUNNING",
                    "user" : "ikuo"
                },
                {
                    "host" : "atlas",
                    "jobid" : "309874",
                    "name" : "PYR-15GPa.500K",
                    "state" : "RUNNING",
                    "user" : "ikuo"
                }
            ]
        };
        
        var $pObj = $('<div></div>').portlet({portletType: "jobs", portletDataSource: {jobs: {type: 'local', source: expected}}});
        
        var $pAsyncObj = $('<div></div>').portlet({portletType: "jobs"});
        
        var promise =  $pObj.data('promise');
        var aPromise = $pAsyncObj.data('promise');
        
        promise.then(
            function(r){ok(true, 'Building of portlet after local data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        //Our remote data test        
        aPromise.then(
            function(r){ok(true, 'Building of portlet after async data callback');},
            function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
        );
        
        $.when(promise, aPromise).then(start, start);
    });
    
    //asyncTest("rss portlet", function(){
    //    var expected = [{title: "this rss feed", content: "some content"}];
    //    
    //    var $pObj = $('<div></div>').portlet({portletType: "rss", portletDataSource: {rss: {type: 'local', source: expected}}});
    //    
    //    var $pAsyncObj = $('<div></div>').portlet({portletType: "rss"});
    //    
    //    var promise =  $pObj.data('promise');
    //    var aPromise = $pAsyncObj.data('promise');
    //    
    //    promise.then(
    //        function(r){ok(true, 'Building of portlet after local data callback');},
    //        function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
    //    );
    //    
    //    //Our remote data test        
    //    aPromise.then(
    //        function(r){ok(true, 'Building of portlet after async data callback');},
    //        function(r){ok(false, 'Fatal error while building portlet, most likely within the portlets callback function: '+r);}
    //    );
    //    
    //    $.when(promise, aPromise).then(start, start);
    //});

})(jQuery);
