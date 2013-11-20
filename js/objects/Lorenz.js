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

var Lorenz = {
    preInit: function() {
        if (typeof $.parseQuery === 'function') {
            var q = $.parseQuery();

            if (typeof q.loraUser === 'string' && q.loraUser.length > 0) {
                this.loraUser = q.loraUser;
            }
        }

        //You can define a custom hidden input on the page to define how many
        //levels from the project root the current app is.  #levelsFromLorenzRoot
        this.setLoraRoot();
    },

    loraUser: 'ME',

    //This NEEDS to be set to the URL of where lora.cgi is
    loraRoot: '../lora/lora.cgi',

    cachedDeferred: {},

    cachedData: {},

    setLoraRoot: function(context) {
        //This context param stuff is a specific fix for the lorenz mobile stuff
        //With mobile we actually bring in many pages at once, so we
        //need to know exactly where to look for this levelsFromLorenzRoot input
        var levelsFromRoot = context ? parseInt($('#'+context+' input[name=levelsFromLorenzRoot]').val()) : parseInt($('input[name=levelsFromLorenzRoot]').val());

        if (levelsFromRoot !== undefined && levelsFromRoot >= 0) {
            var s = '';

            for (i = 0, il = levelsFromRoot; i < il; i++) {
                s += '../'
            }

            this.loraRoot = s + 'lora/lora.cgi';
        }
    },
    
    username: '',
    
    getLoraUserName: function(){
        if(this.loraUser === 'ME'){
            if(!this.username){
                this.username = $("#userId").text();
            }
            return this.username;
        }
        else{
            return this.loraUser;
        }
    },

    getGroups: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/groups'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getBanks: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/banks'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllBanks: function(uOptions) {
        var options = {
            url: this.loraRoot + '/banks'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getUserBanksByHost: function(all, uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/bankhosts' + (all ? '?all=1' : '')
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAccounts: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/hosts'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getClusters: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/clusters',
            xhrCache: 'getClusters',
            dataCache: 'getClusters'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllJobsForHost: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/queue/' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getDefaultHost: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/default/host',
            dataCache: 'getDefaultHost',
            xhrCache: 'getDefaultHost'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getGroupInfo: function(group, uOptions) {
        var options = {
            url: this.loraRoot + '/group/' + group
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getBankInfo: function(bank, uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/bank/' + bank
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getHostInfo: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/host/' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getHostJobLimits: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/cluster/' + host + '/joblimits',
            xhrCache: 'getHostJobLimits-' + host,
            dataCache: 'getHostJobLimits-' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getHostDetails: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/cluster/' + host + '/details',
            xhrCache: 'getHostDetails-' + host,
            dataCache: 'getHostDetails-' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getHostTopology: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/cluster/' + host + '/topo',
            xhrCache: 'getHostTopology-' + host,
            dataCache: 'getHostTopology-' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllMachineLoads: function(uOptions) {
        var options = {
            url: this.loraRoot + '/status/clusters'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllClusterUtilizations: function(uOptions) {
        var options = {
            url: this.loraRoot + '/status/clusters/utilization/hourly2'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getNews: function(uOptions) {
        var options = {
            url: this.loraRoot + '/news'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getNewsItem: function(item, uOptions) {
        var options = {
            url: this.loraRoot + '/news/' + item
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getDiskQuotaInfo: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/quotas',
            timeout: 30000,
            xhrCache: 'getDiskQuotaInfo'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getCpuUsage: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/cpuutil/daily'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getJobs: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/queue'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getMyJobs: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/queue'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getJobsForHost: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/queue?host=' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getBankHistory: function(bank, uOptions) {
        var options = {
            url: this.loraRoot + '/bank/' + bank + '/cpuutil/daily'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getBankHistoryForHost: function(bank, host, uOptions) {
        var options = {
            url: this.loraRoot + '/cluster/' + host + '/bank/' + bank + '/cpuutil/daily'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getUserInfo: function(user, uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + user
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getUserOun: function(user, uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + user + '/oun'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getUserLinks: function(uOptions) {
        return this.storeRead('portletConf/userLinks', uOptions);
    },

    getJobDetails: function(host, jobId, uOptions) {
        var options = {
            url: this.loraRoot + '/queue/' + host + '/' + jobId + '?livedata=1'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getFileSystemStatus: function(uOptions) {
        var options = {
            url: this.loraRoot + '/status/filesystem'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getCompletedJobs: function(period, uOptions) {
        var options = {
            url: this.loraRoot + '/user/' + this.loraUser + '/queue?type=completed&period=' + period
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getPathStat: function(host, path, uOptions) {
        var options = {
            url: this.loraRoot + '/file/' + host + path + '?view=stat'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getDefaultLinks: function(host, path, uOptions) {
        var options = {
            url: this.loraRoot + '/support/defaultLinks',
            xhrCache: 'getDefaultLinks',
            dataCache: 'getDefaultLinks'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    execCommand: function(host, uOptions) {
        var options = {
            type: 'POST',
            url: this.loraRoot + '/command/' + host + '?format=text'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    sendJobSignal: function(host, jobId, signal, uOptions) {
        var options = {
            type: 'PUT',
            url: this.loraRoot + '/queue/' + host + '/' + jobId,
            data: {
                operator: 'signal',
                signal: signal
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getClusterBatchDetails: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/cluster/' + host + '/batchdetails',
            dataCache: 'getClusterBatchDetails-' + host,
            xhrCache: 'getClusterBatchDetails-' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    submitJob: function(host, uOptions) {
        var options = {
            type: 'POST',
            url: this.loraRoot + '/queue/' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    cancelJob: function(host, jobId, uOptions) {
        var options = {
            type: 'DELETE',
            url: this.loraRoot + '/queue/' + host + '/' + jobId
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    clearCache: function(uOptions) {
        var options = {
            type: 'DELETE',
            url: this.loraRoot + '/user/ME/cache'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    editJobParams: function(host, jobId, uOptions) {
        var options = {
            type: 'PUT',
            url: this.loraRoot + '/queue/' + host + '/' + jobId,
            data: {
                operator: 'modify'
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    holdJob: function(host, jobId, uOptions) {
        var options = {
            type: 'PUT',
            url: this.loraRoot + '/queue/' + host + '/' + jobId,
            data: {
                operator: 'hold'
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    unholdJob: function(host, jobId, uOptions) {
        var options = {
            type: 'PUT',
            url: this.loraRoot + '/queue/' + host + '/' + jobId,
            data: {
                operator: 'unhold'
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getLicenses: function(uOptions) {
        var options = {
            url: this.loraRoot + '/status/license'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getLicenseInfo: function(license, uOptions) {
        var options = {
            url: this.loraRoot + '/status/license/' + license
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllLicenseInfo: function(uOptions) {
        var options = {
            url: this.loraRoot + '/status/license/all'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    storeWrite: function(storeName, uOptions) {
        var options = {
            type: 'PUT',
            url: this.loraRoot + '/store/' + storeName,
            processData: false
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getMachineStatus: function(uOptions) {
        var options = {
            url: this.loraRoot + '/status/machines'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    storeDelete: function(storeName, uOptions) {
        var options = {
            type: 'DELETE',
            url: this.loraRoot + '/store/' + storeName
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    storeAppend: function(storeName, uOptions) {
        var options = {
            type: 'POST',
            url: this.loraRoot + '/store/' + storeName
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    storeRead: function(storeName, uOptions) {
        var options = {
            url: this.loraRoot + '/store/' + storeName
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    sendEmail: function(to, subject, body, uOptions) {
        var options = {
            url: this.loraRoot + '/email',
            type: 'POST',
            data: {
                to: to,
                subject: 'LORENZ FEEDBACK: ' + subject,
                body: body
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllPortletConf: function(uOptions) {
        //This is a special global variable that may or not be set in the landing .cgi script as a string in the .tmpl file
        //This is an optimization we dont need ajax request to start rendering the portlets
        if (typeof allLorenzConfJson !== 'undefined') {
            return allLorenzConfJson;
        }
        
        var options = {
            url: this.loraRoot + '/portlet/getAllPortletConf'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getCustomPortlets: function(uOptions) {
        if (typeof lorenzCustomPortletPreCache !== 'undefined') {
            return true;
        }

        var options = {
            url: this.loraRoot + '/portlet/getCustomPortlets',
            dataType: 'script',
            //special option to ignore the wrapper envelope, just always send the output through
            ignoreEnvelope: true
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getJobSteps: function(host, jobId, uOptions) {
        var options = {
            url: this.loraRoot + '/queue/' + host + '/' + jobId + '/steps'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    generateStackTrace: function(host, jobStepId, uOptions) {
        var options = {
            url: this.loraRoot + '/queue/' + host + '/' + jobStepId + '/STAT',
            type: 'PUT'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getSSHhosts: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/sshhosts'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getBankMembership: function(bank, host, uOptions) {
        var options = {
            url: this.loraRoot + '/bank/' + bank + '/membership/' + host
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getScratchFilesystems: function(uOptions) {
        var options = {
            url: this.loraRoot + '/scratchfs',
            xhrCache: 'getScratchFilesystems',
            dataCache: 'getScratchFilesystems'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getPurgedFiles: function(days, uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/purgedFiles' + (days ? '?days=' + days : '')
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllUserInfo: function(uOptions) {
        var options = {
            url: this.loraRoot + '/users?info=all',
            xhrCache: 'getAllUserInfo',
            dataCache: 'getAllUserInfo'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getFile: function(host, path, uOptions) {
        var options = {
            url: this.loraRoot + '/file/' + host + '/' + path + '?view=read&format=auto',
            ignoreEnvelope: true,
            dataType: ''
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    //reads text file
    readFile: function(host, path, uOptions) {
        var options = {
            url: this.loraRoot + '/file/' + host + '/' + path + '?view=read',
            ignoreEnvelope: true
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getTransferHosts: function(uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/transferhosts'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    reportError: function(error, context, uOptions) {
        var options = {
            url: this.loraRoot + '/support/reportError',
            type: 'POST',
            data: {
                errorBody: error,
                context: context,
                url: location.href,
                browserName: navigator.appCodeName,
                browserVersion: navigator.appVersion,
                platform: navigator.platform,
                userAgent: navigator.userAgent
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    authCheck: function(uOptions) {
        var options = {
            url: this.loraRoot + '/noop'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getNetworkInfo: function(uOptions) {
        var options = {
            url: this.loraRoot + '/support/network'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getLoraEndpoints: function(uOptions) {
        var options = {
            url: this.loraRoot + '/lora/endpoints'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    executeScript: function(host, script, args, timeout, uOptions) {
        var options = {
            type: 'POST',
            url: this.loraRoot + '/script/' + host + '/' + script,
            data: {
                arg: args
            }
        };

        if (timeout !== undefined) {
            options['timeout'] = timeout * 1000; //function takes in seconds, $.ajax need milliseconds
        }

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getWeather: function(uOptions) {
        var options = {
            url: this.loraRoot + '/weather'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getCredentialLifetime: function(uOptions) {
        var options = {
            url: this.loraRoot + '/support/getCredentialLifetime'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getLoginNodeStatus: function(uOptions) {
        var options = {
            url: this.loraRoot + '/status/loginNode'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getUserProcessesByCluster: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/cluster/' + host + '/processes'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    getAllUserProcesses: function(host, uOptions) {
        var options = {
            url: this.loraRoot + '/user/ME/cluster/processes'
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    killProcess: function(hosts, pids, uOptions) {
        var options = {
            type: 'POST',
            url: this.loraRoot + '/cluster/processes',
            data: {
                clusters: hosts,
                processes: pids
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },

    tailFile: function(host, path, tail, uOptions){
        var options = {
            type: 'POST',
            url: this.loraRoot + '/data/' + host,
            data:{
                host: host,
                path: path,
                tail: tail,
                type: 'text'
            }
        };

        $.extend(true, options, uOptions);

        return this.sendRequest(options);
    },
    
    sendRequest: function(options) {
        //Some generic defaults
        var ajaxOptions = {
            url: '/',
            dataType: 'json',
            type: 'GET'
        },
        xhrCache = options.xhrCache,
        doLora = function() {},
        httpVerb = ajaxOptions.type.toUpperCase(),
        bResponse;

        //IE likes to cache EVERYTHING... including endpoints we don't want cached e.g., my jobs
        if ($.browser.msie) {
            ajaxOptions['cache'] = false;
        }

        //Mixin what they've passed
        $.extend(true, ajaxOptions, options);

        if (this.bundleMode) {
            bResponse = this._bundleRequest(ajaxOptions);

            if (bResponse.found) {
                return bResponse.promise;
            }
        }

        doLora = this._getDoLora(ajaxOptions);

        if (xhrCache !== undefined) {
            return this._handleCachedDeferred(xhrCache, doLora);
        } else {
            return doLora();
        }

    },
    
    _handleCachedDeferred: function(xhrCache, doLora) {
        var self = this,
            cachedXhr = this.cachedDeferred[xhrCache],
            promise;

        if (cachedXhr !== undefined) {
            return cachedXhr;
        } else {
            promise = doLora();

            this.cachedDeferred[xhrCache] = promise.always(function() {
                delete self.cachedDeferred[xhrCache];
            });

            return promise;
        }
    },

    _getDoLora: function(ajaxOptions) {
        var self = this,
            dataCache = ajaxOptions.dataCache;

        return function() {
            var dfd = $.Deferred(),
                jqXhr, promise = dfd.promise();

            //If they've set an option to try and use a data cache if available
            if (dataCache && self.cachedData[dataCache] !== undefined) {
                dfd.resolveWith(this, [self.cachedData[dataCache]]);
            } else {
                jqXhr = $.ajax(ajaxOptions).done(function(response, textStatus, jqXHR) {
                    if (response) {
                        if (ajaxOptions.ignoreEnvelope) {
                            dfd.resolveWith(this, [response.output]);
                        } else if (response.status == 'OK') {
                            //Cache data if they've specified it
                            if (dataCache) {
                                self.cachedData[dataCache] = response.output;
                            }

                            dfd.resolveWith(this, [response.output]);
                        } else if (response.status == 'ERROR') {
                            dfd.rejectWith(this, ['An error occurred processing your request: ' + response.error, response]);
                        } else {
                            dfd.rejectWith(this, ['Unrecognized response status.']);
                        }
                    } else {
                        dfd.rejectWith(this, ['Response is null']);
                    }
                }).fail(dfd.reject);

                promise.jqXhr = jqXhr;
            }

            return promise;
        }
    }
};

Lorenz.preInit();