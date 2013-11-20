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

(function($){
	if($.fn.dataTableExt){
		$.fn.dataTableExt.oApi.fnDisplayRow = function ( oSettings, nRow )
		{
			var iPos = -1;
			for( var i=0, iLen=oSettings.aiDisplay.length ; i<iLen ; i++ )
			{
				if( oSettings.aoData[ oSettings.aiDisplay[i] ].nTr == nRow )
				{
					iPos = i;
					break;
				}
			}
			 
			if( iPos >= 0 )
			{
				oSettings._iDisplayStart = ( Math.floor(i / oSettings._iDisplayLength) ) * oSettings._iDisplayLength;
				this.oApi._fnCalculateEnd( oSettings );
			}
			 
			this.oApi._fnDraw( oSettings );
		}
	}
	
	var JobManager = {
		init: function(elem, options){
			var self = this;
			
			this.options = $.extend(true, {}, this.options, options);
			
            $(window).click(function(){
                $('.popup-menu').hide();
            });
            
			this.$elem = $("<div></div>").appendTo($(elem));
			
			if($.parseQuery){
				//parse the url for any cgi params
				this.query = $.parseQuery();
			}
			
			//instantiate new Lorenz object
			this.oLorenz = Object.create(Lorenz);
			
			this.userId = this.getUserId();
			
			//creates our global reusable dialog box
			this.initDialog();
			
			if(!self.options.exportFormMode){	
				//gets all jquery tmpls from remote file
				this.getTemplates()
					.success(function(){
						self.buildInterface();			
					});
			}
			else{
				self.exportInterface();
			}
		},
		
		options: {
			tmplUrl: 'templates/jobManager.tmpl.html'
		},
		
		userId: '',
		
		jobManagementConfDir: 'jobMgmtConf',
		
		rowSelectedClass: 'row_selected',
		
		selectedRowJobId: -1,
		
		currentJobId: -1,
		
		currentJobHost: '',
		
		currentJobStatus: '',
		
		currentJobDetails: {},
		
		currentCompletedJobId: '',
		
		currentCompletedJobName: '',
		
		currentCompletedJobStatus: '',
		
		currentCompletedJobHost: '',
		
		currentClusters: [],
		
		currentInterface: '',
		
		currentJobName: '',
		
		completedPeriod: 1,
		
		remainingTimeInterval: -1,
		
		preJobId: -1,
		
		refreshInterval: -1,
		
		createNewJobs: [],
		
		allCompletedDetails: {},
		
		//partition specific details
		batchDetails: {},

		query: {},

		oLorenz: {},
		
		jobTable: {},
		
		completedJobTable: {},
		
		activeJobsPane: {},
		
		quickSubmitPane: {},

		completedJobsPane: {},
		
		createNewJobPane: {},
		
		formConfigurations: [],
		
		$dialog: {},
		
		showHidden: 0,
		
		formIsReady: true,
		
		validateDeferreds: [],
		
		unselectedCluster: '--- Select a Cluster ---',
		
		baseDir: '~',
	
		//This could be temporary, but this is to export a simple job form with similar parameters
		//and ids on the inputs... we bind validation and population of the fields.  
		exportInterface: function(){
			var self = this,
				$exportForm;
			
			$.when(self.oLorenz.getClusters(), $.ajax({url: this.options.tmplUrl}))
				.done(function(clusters, tmpl){					
					$('body').append(tmpl[0]);
					
					$("#tmpl-"+self.options.form).template(self.options.form);
					
					var tmpCluster = clusters.accounts.slice(0);
					tmpCluster.unshift(self.unselectedCluster);
					
					$.tmpl('exportForm', {
						clusters: tmpCluster,
						id: self.options.formId
					}).appendTo(self.$elem);
					
					$exportForm = self.$elem.find('#'+self.options.formId);
					
					$exportForm.find(':input').not('#job_cluster').each(function(){						
						self.toggleDisable($(this), true);
					});
					
					$exportForm.find('#job_cluster').bind("change", function(){
						var $input = $(this),
							selectedCluster = $input.val(),
							oLorenz = self.oLorenz;
						
						self.validateInput($input);
						
						if(selectedCluster !== self.unselectedCluster){
							showLoadingScreen();
							
							$.when(oLorenz.getClusterBatchDetails(selectedCluster), oLorenz.getJobsForHost(selectedCluster))
								.done(function(details, jobs){
									var formCached = self.buildJobInfo($exportForm);
									
									self.buildNewJobDependencies(details, jobs, formCached, $exportForm);
								})
								.always(hideLoadingScreen);
						}
					});
					
					$exportForm.find(':input').bind('blur', $.proxy(self, 'event_createNewJob_validateInput'));
					
					if(typeof self.options.exportComplete === 'function'){
						self.options.exportComplete();
					}
				});
		},		
		
		initDialog: function(){
			this.$dialog = $('<div id = "jobManagement_dialog"></div>').prompt();
		},
		
		toggleDialog: function(userOpts, content){
            this.$dialog.prompt('info', userOpts, content);  
		},
		
		toggleFileTree: function(container, o){
			var self = this,
				$container = $(container);
			
			$.when(this.oLorenz.getScratchFilesystems())
				.done(function(scratchFs){
					var defaults = {
						handler: '../js/jquery/fileTree/connectors/fileTree.cgi',														
						jumpToOpts: self.getJumpToList(scratchFs),
                        dataSrc: 'Lorenz'
					};
					
					var options = $.extend(true, {}, defaults, o);
					
					if($container.data('fileTree')){
						$container.fileTree("destroy");
					}
                
					$container.empty().fileTree(options);
				})
				.fail(function(e){
					self.error({
						friendlyError: 'An error ocurred getting a list of scratch file systems.  This is most likely a server error.  Please use the send error report link below.  Thank you.',
						technicalError: e,
						location: 'get scratch fs'
					});
				});
		},
		
		getUserId: function(){			
			return $('#userId').text();
		},
		
		isLoraUserMe: function(){
			return this.oLorenz.loraUser === 'ME' ? true : false;
		},
		
		buildInterface: function(){
            var view = this.query.view || 'activeJobs';
			
			this.delegateEvents();
			
			this.mainToolbar();			
			
			if(view === 'createNewJob'){
				this.createNewJob();
			}			
			else if(view === 'quickSubmit'){
				this.quickSubmit();				
			}
			else if(view === 'completedJobs'){
				this.completedJobs();
			}		
			else{
				this.activeJobs();				
			}			
		},
		
		//Event delegation used throughout for performance reasons...
		//The event doesnt have to bubble all the way up to the root of the DOM
		delegateEvents: function(){
			this.interfaceEvents();
			this.delegate_activeJobs();
			this.delegate_quickSubmit();
			this.delegate_mainToolbar();			
			this.delegate_completedJobs();
			this.delegate_createNewJob();
		},
		
		interfaceEvents: function(){
			var $elem = this.$elem;
			
			$elem.bind("interfaceChange", $.proxy(this, 'event_interfaceChange'));
			
			$elem.bind("interfaceDone", $.proxy(this, 'event_interfaceDone'));
		},
		
		delegate_mainToolbar: function(){
			var $elem = this.$elem;
			
			$elem.delegate('#jobManagementToolbar #createNewJob', 'click', $.proxy(this, 'event_mainToolbar_createNewJob'));
			
			$elem.delegate('#jobManagementToolbar #quickSubmit', 'click', $.proxy(this, 'event_mainToolbar_quickSubmit'));
			
			$elem.delegate('#jobManagementToolbar #activeJobs', 'click', $.proxy(this, 'event_mainToolbar_activeJobs'));
			
			$elem.delegate('#jobManagementToolbar #completedJobs', 'click', $.proxy(this, 'event_mainToolbar_completedJobs'));
		
			$elem.delegate('#jobManagementToolbar button', 'hover', function(){
				$(this).toggleClass('ui-state-hover');
			});
		},
		
		delegate_activeJobs: function(){
			var $elem = this.$elem;
			
			$elem.delegate('#jobTable tbody', 'click', $.proxy(this, 'event_activeJobs_jobSelect'));
			
			$elem.delegate('#detailsPane #cancelJob', 'click', $.proxy(this, 'event_activeJobs_cancelJob'));
			
			$elem.delegate('#jobFields #moreDetails', 'click', $.proxy(this, 'event_activeJobs_moreDetails'));
			
			$elem.delegate('#jobTableWrapper #refreshJobData', 'click', $.proxy(this, 'event_activeJobs_refreshTable'));
			
			$elem.delegate('#detailsPane #editParams', 'click', $.proxy(this, 'event_activeJobs_editParams'));
			
			$elem.delegate('#detailsPane #holdJob', 'click', $.proxy(this, 'event_activeJobs_holdJob'));
			
			$elem.delegate('#detailsPane #unholdJob', 'click', $.proxy(this, 'event_activeJobs_unholdJob'));
			
			$elem.delegate('#detailsPane #examineJob', 'click', $.proxy(this, 'event_activeJobs_examineJob'));
			
			$('#editJobForm #job_bank').live('change', $.proxy(this, 'event_createNewJob_bankChange'));
			
			$('#editJobForm #job_partition').live('change', $.proxy(this, 'event_createNewJob_partitionChange'));
			
			$('#examineDialog #loadExamineFile').live('click', $.proxy(this, 'event_activeJobs_loadExamineFile'));
			
			$('#statDialog #getJobStat').live('click', $.proxy(this, 'event_activeJobs_getJobStat'));
			
			$('#statDialog #loadJobStat').live('click', $.proxy(this, 'event_activeJobs_loadJobStat'));
		},
				
		delegate_completedJobs: function(){
			var $elem = this.$elem;
			
			$elem.delegate('#completedJobsPane #pastCompletedDays', 'change', $.proxy(this, 'event_completedJobs_changePeriod'));
			
			$elem.delegate('#completedJobsPane #completedJobsTable tbody', 'click', $.proxy(this, 'event_completedJobs_completedJobSelect'));
			
			$elem.delegate('#completedDetailsPane #completedJobExamine', 'click', $.proxy(this, 'event_completedJobs_examineJob'));
		},
		
		delegate_createNewJob: function(){
			var $elem = this.$elem,
				self = this;
			
			$elem.delegate('#createNewJobPane #startWithNewJob', 'click', $.proxy(this, 'event_createNewJob_newJob'));			
			
			$elem.delegate('#createNewJobPane #startWithExistingScript', 'click', $.proxy(this, 'event_createNewJob_loadExistingScript'));
			
			$elem.delegate('#createNewJobPane #job_cluster', 'change', $.proxy(this, 'event_createNewJob_populateClusterDependencies'));
			
			$elem.delegate('#createNewJobPane #advancedOptionsLink', 'click', $.proxy(this, 'event_createNewJob_showAdvancedOptions'));
			
			$elem.delegate('#createNewJobPane #job_bank', 'change', $.proxy(this, 'event_createNewJob_bankChange'));
			
			$elem.delegate('#createNewJobPane #job_partition', 'change', $.proxy(this, 'event_createNewJob_partitionChange'));
			
			$elem.delegate('#createNewJobPane #saveConfiguration', 'click', $.proxy(this, 'event_createNewJob_saveNewJobConfiguration'));
			
			$('#saveConfName').live('keyup', function(e){
				if(e.which === 13){					
					self.event_createNewJob_dialogSaveConfiguration();
				}
			});			
			
			$elem.delegate('#createNewJobPane #clusterDetailLink', 'click', $.proxy(this, 'event_createNewJob_showClusterDetails'));
			
			$elem.delegate('#createNewJobPane #newJobForm :input', 'blur', $.proxy(this, 'event_createNewJob_validateInput'));
			
			$elem.delegate('#createNewJobPane #submitScript', 'click', $.proxy(this, 'event_createNewJob_submitScript'));
			
			$elem.delegate('#createNewJobPane #browseLaunchDir', 'click', $.proxy(this, 'event_createNewJob_launchDirBrowser'));
						
			$elem.delegate('#createNewJobPane #job_dependencies', 'change', $.proxy(this, 'event_createNewJob_dependencySelect'));
			
			$elem.delegate('#createNewJobPane #job_gres', 'change', $.proxy(this, 'event_createNewJob_gresSelect'));

			$('#loadExistingPath').live('keyup', function(e){
				if(e.which === 13){
					//self.event_createNewJob_parseScript();
				}
			})
		},
		
		delegate_quickSubmit: function(){
			var self = this,
				$elem = self.$elem;
			
			$elem.delegate('#fileLoadPane #quickSubmitScript', 'keyup', $.proxy(this, 'event_quickSubmit_keyUp'));
					
			$elem.delegate('#fileLoadPane button#loadScript', 'click', $.proxy(this, 'event_quickSubmit_loadScript'));
		},
		
		event_interfaceDone: function(e){			
			hideLoadingScreen();			
		},
		
		event_interfaceChange: function(e, opts){
			showLoadingScreen();

			this.destroyInterface();			

			this.currentInterface = opts.newInterface;
			
			$('#jobManagementToolbar')
				.find('button').removeClass('ui-state-active')
			.end()
				.find('#'+opts.newInterface).addClass('ui-state-active');
		},
		
		event_createNewJob_newJob: function(e){			
			if(confirm('Are you sure you want to create a new job?  This will reset the form below and you will lose the configuration, if not saved.')){
				this.createNewJob();
			}
		},
		
		event_createNewJob_loadExistingScript: function(e){		
			if($("#job_cluster").val() !== this.unselectedCluster){
				showLoadingScreen();
				
				this.toggleDialog({
					title: 'Load Existing Script',
					width: 'auto',
					height: 543,
					width: 479,
					minWidth: 478,
					buttons: {
						load: function(){
							$(this).dialog('close');
						},
						cancel: function(){
							$(this).dialog('close');
						}
					}
				},
				$.tmpl('loadExistingDialog', {existingHosts: this.currentClusters}));
				
		
			}
			else{
				this.warning({
					msg: "You must select a cluster before loading an existing script.",					
					location: 'load existing script'
				});
			}
		},
		
		event_createNewJob_populateClusterDependencies: function(e){
			var self = this,
				$input = $("#job_cluster"),
				selectedCluster = $input.val(),
				oLorenz = self.oLorenz;
			
			self.validateInput($input);
			
			if(selectedCluster !== self.unselectedCluster){
				showLoadingScreen();
				
				$("#clusterDetailLink").html('(details for: '+selectedCluster+')').removeClass('display-none');
				
				return $.when(oLorenz.getClusterBatchDetails(selectedCluster), oLorenz.getJobsForHost(selectedCluster))
					.done(function(details, jobs){
						var formCached = self.buildJobInfo();
						
						self.buildNewJobDependencies(details, jobs, formCached);
					})
					.always(hideLoadingScreen);
			}
			else{
				$("#clusterDetailLink").addClass('display-none');
				return 0;
			}
		},
		
		event_createNewJob_showAdvancedOptions: function(e){
			$('#advancedOptionsTriangle').toggleClass('ui-icon-triangle-1-e').toggleClass('ui-icon-triangle-1-s');
			$("#advancedOptions").toggle('blind', 'fast');
		},
		
		event_createNewJob_bankChange: function(e){			
			this.buildOpts(this.batchDetails.banks[$('#job_bank').val()].qos, '#job_qos', 'normal');
		},
		
		event_createNewJob_partitionChange: function(e){
			var currentPartition = $('#job_partition').val(),
				partitionDetails = this.batchDetails.partitions[currentPartition],
				formCached = this.buildJobInfo($("#editJobForm"));

			this.setWallClockLimit(partitionDetails, formCached);

			this.setNodesAndTasks(partitionDetails);

			this.buildDependencyList();
						
			this.buildOpts(partitionDetails.gres, '#job_gres', this.getGres(formCached['job_gres'], partitionDetails.gres));
		},
		
		event_createNewJob_saveNewJobConfiguration: function(e){
			var self = this,
				cluster = $('#job_cluster').val();
			
			if(cluster !== self.unselectedCluster){			
				self.toggleDialog({
					title: 'Save Job Configuration',
					resizable: false,
					draggable: false,
					modal: true,
					buttons: {
						"Save": $.proxy(self, 'event_createNewJob_dialogSaveConfiguration'),
						"Cancel": function() {
							$(this).dialog("close");
						}
					}		
				}, $.tmpl('saveConfigurationDialog'));
								
				$('#saveConfName').val(self.saveConfName);				
			}
			else{
				self.warning({
					msg: 'You must select a cluster before saving configurations.',
					location: 'save new configuration'
				});
			}
		},
		
		event_createNewJob_dialogSaveConfiguration: function(){
			var $saveConfInput = $("#saveConfName"),
				confName = $saveConfInput.val(),
				self = this,
				nameValidRegEx = /[^\w_\-]/g; //if we find a non-word character, i.e., anything but 0-9,A-Z,a-z, - and _
		
			self.saveConfName = confName;
				
			if(confName && !nameValidRegEx.test(confName) && confName.length < 25){
				if($.inArray(confName, self.formConfigurations) !== -1){
					if(confirm('Found existing configuration with the name: '+confName+'. Do you want to overwrite/replace the old one with the new one?')){
						self.saveConfiguration(confName);
					}
				}
				else{
					self.saveConfiguration(confName);
				}
				
				self.$dialog.dialog("close");
			}
			else{
				self.warning({
					msg: 'Save failed.  The following conditions must be met before saving:<br/><br/>1) Supply a name<br/>2) Name must be only alpha-numeric (a-z, A-Z, 0-9, _)<br/>3) Name cannot exceed 24 characters<br/>4) Choose a cluster',
					location: 'save configuration',
					ok: $.proxy(self, 'event_createNewJob_saveNewJobConfiguration')
				});
			}
		},
		
		event_createNewJob_showClusterDetails: function(e){
			var self = this,
				selectedCluster = $("#job_cluster").val();
			
			if(selectedCluster !== self.unselectedCluster){
				self.oLorenz.getHostInfo(selectedCluster).done(function(info){
					self.toggleDialog({
						title: 'Details for '+selectedCluster,
						width: 'auto',
						dialogClass: 'clusterDetailInfo'
					}, info.info);
				});				
			}
		},
		
		event_createNewJob_validateInput: function(e){
			this.validateInput(e.target);			
		},
		
		event_createNewJob_launchDirBrowser: function(e){
			var self = this;
			
			if($("#job_cluster").val() !== self.unselectedCluster){	
				this.toggleDialog({
					title: 'Load Directory Browser',				
					height: 543,
					width: 579,
					minWidth: 478,
					buttons: [
						{
							text: 'select',
							click: function(){							
								$("#job_launchDirectory").val($("#launchDirBrowseInput").val());
								
								$(this).dialog('close');
							}
						},
						{
							text: 'cancel',
							click: function(){
								$(this).dialog('close');
							}
						}
					]
				}, $.tmpl('launchDirBrowser'));
				
				this.toggleFileTree('#launchDirBrowserFileTree', {				
					showFiles: false,
					hostSwitching: false,
					host: $('#job_cluster').val(),
					dirSelect: function(e, dir){
						$("#launchDirBrowseInput").val(dir);
					},
					dirDoubleClick: function(e, dir){
						$("#job_launchDirectory").val(dir);
						
						self.$dialog.dialog('close');
					}
				});
			}
			
			return false;
		},
		
		event_createNewJob_submitScript: function(e){
			showLoadingScreen();
			
			this.validateForm();
			
			if(this.validateDeferreds.length > 0){				
				$.when.apply($, this.validateDeferreds).always($.proxy(this, 'submitScript'));
			}
			else{
				this.submitScript();
			}
		},
		
		event_createNewJob_dependencySelect: function(e){
			var jobDeps = $("#job_dependencies").val();
			
			if(!jobDeps || ($.isArray(jobDeps) && !jobDeps[0])){
				this.toggleDisable($('#job_depType'), true);
			}
			else{				
				this.toggleDisable($('#job_depType'), false);
			}
		},
		
		event_createNewJob_gresSelect: function(e){
			var $gres = $('#job_gres'),
				selected = $gres.val();
				
			if($.isArray(selected)){
				for(var i = 0, il = selected.length; i < il; i++){
					if(selected[i] === 'ignore'){
						$gres.val('ignore');
						break;
					}
				}
			}
		},		
						
		event_quickSubmit_loadScript: function(e){
			var script = $('#quickSubmitScript').val(),
				cluster = $("#fileTree").fileTree('getCurrentHost');
				
			if(script && cluster){
				this.oLorenz.submitJob(cluster, {data: {jobfile: script}})
					.done($.proxy(this, 'jobSubmissionSuccess'))
					.fail($.proxy(this, 'jobSubmissionFail'));
			}
			else{
				this.warning({
					msg: 'You need to specify a script path and cluster before quick submitting!',
					location: 'quick submit'					
				});
			}
		},
		
		event_quickSubmit_keyUp: function(e){
			if(e.which === 13){
				this.event_quickSubmit_loadScript();
			}
		},
		
		event_mainToolbar_completedJobs: function(e){
			if(this.currentInterface !== 'completedJobs'){
				this.completedJobs();
			}
		},
		
		event_mainToolbar_quickSubmit: function(e){
			if(this.currentInterface !== 'quickSubmit'){
				this.quickSubmit();
			}
		},
		
		event_mainToolbar_createNewJob: function(e){
			if(this.currentInterface !== 'createNewJob'){
				this.createNewJob();
			}
		},
		
		event_mainToolbar_activeJobs: function(e){
			if(this.currentInterface !== 'activeJobs'){
				this.activeJobs();
			}
		},
		
		event_activeJobs_moreDetails: function(e){
			$('#moreDetailTriangle').toggleClass('ui-icon-triangle-1-e').toggleClass('ui-icon-triangle-1-s');
			$("#additionalDetails").toggle('blind', 'fast');
		},

		event_activeJobs_cancelJob: function(e){
			var self = this;
			
			if(confirm('Are you sure you want to cancel, name: '+this.currentJobName+', jobID: '+this.currentJobId+', host: '+this.currentJobHost+'?')){
				showLoadingScreen();
				
				this.oLorenz.cancelJob(this.currentJobHost, this.currentJobId)
				.done(function(r){
					self.removeJobFromTable('error');
					
					hideLoadingScreen();
					
					self.disableRefreshTable();
				})
				.fail(function(e){
					self.error({
						friendlyError: 'There was an error trying to cancel the selected job(s).  It\'s possible the job(s) were completed or cancelled by another source.  Often the job table is using a cached version of your jobs and is not in sync with the real time status of the queue.  Please try refreshing the job table using the "Refresh Table" button and try to cancel again. If the problem persists send an error report via the link below.',
						technicalError: e,
						location: 'cancel job host: '+self.currentJobHost+', jobid: '+self.currentJobId
					});
				})
				.always(hideLoadingScreen);	
			}			
		},
		
		event_activeJobs_jobSelect: function(e){			
			var selectedRow = e.target.parentNode,
				jobTable = this.jobTable,
				job = jobTable.fnGetData(selectedRow);
					
			this.removeJobFromTable('success', '.completedJobRow');
			
			//If they select a new job, clear any existing remaining time intervals they may have been observing
			this.disableRemainingTimeInterval();
			
			if($.isArray(job) && job.length > 0){
				this.activateRow($(selectedRow));						
			
				this.jobDetails(job);
			}			
		},
		
		event_activeJobs_refreshTable: function(e){		
			this.selectedRowJobId = this.getDataForRowClass(this.rowSelectedClass, 1);
			
			this.activeJobs();
		},
				
		event_activeJobs_editParams: function(e){
			var self = this,
				selectedCluster = self.currentJobHost,
				oLorenz = self.oLorenz;
			
			$.when(oLorenz.getClusterBatchDetails(selectedCluster), oLorenz.getJobsForHost(selectedCluster))
				.done(function(batchDetails, jobs){
					self.toggleDialog({
						title: 'Edit Job Params For: '+self.currentJobId,
						width: 540,
						buttons: {
							'Save': function(){
								self.saveEditParams();
							},
							'Reset Form': function(){
								self.buildEditParamForm(batchDetails, jobs);							
							},
							'Cancel': function(){
								$(this).dialog('close');
							}
						}
					},
					$.tmpl('editJobParams', {activeJobs: []}));
					
					self.buildEditParamForm(batchDetails, jobs);					
				})
				.fail(function(e){
					self.error({
						friendlyError: "Unable to load edit params interface. The cluster on which the job you selected may currently be down.  Please send an error report.",
						technicalError: e,
						location: "edit params"
					});
				});			
		},
		
		event_activeJobs_examineJob: function(e){
			var workDir = this.currentJobDetails.WorkingDir ? this.currentJobDetails.WorkingDir : this.currentJobDetails.WorkDir;
			
			this.buildExamineDialog(this.currentJobHost, workDir, this.currentJobStatus, this.currentJobId);
		},
		
		event_activeJobs_holdJob: function(e){
			var obj = this;
			
			showLoadingScreen();
			
			this.oLorenz.holdJob(this.currentJobHost, this.currentJobId)
				.done(function(r){
					obj.holdJobSuccessFeedback();
				})
				.fail(function(e){
					obj.error({
						friendlyError: 'A server error occurred holding job. Email lorenz tech support with this error. Thank you.',
						technicalError: e,
						location: 'hold job'
					});
				})
				.always(hideLoadingScreen);
		},
		
		event_activeJobs_unholdJob: function(e){
			var obj = this;
			
			showLoadingScreen();
			
			this.oLorenz.unholdJob(this.currentJobHost, this.currentJobId)
				.done(function(r){
					obj.unholdJobSuccessFeedback();
				})
				.fail(function(e){
					obj.error({
						friendlyError: 'A server error occurred unholding job. Email lorenz-info@your.site.here with this error. Thank you.',
						technicalError: e,
						location: 'unhold job'
					});
				})
				.always(hideLoadingScreen);;
		},
		
		event_activeJobs_loadExamineFile: function(e){
			var filePath = $("#examineFile").val();
			
			if(filePath !== ''){
				window.open(window.location.protocol+"//"+window.location.host+'/lorenz/lora/lora.cgi'+'/file/'+this.currentJobHost+filePath+'?view=read&format=auto');
			}
		},
		
		event_activeJobs_getJobStat: function(){
			var self = this,
				$jobSelect = $('#examineStatJobStepIds'),
				$imageSelect = $('#statImages'),
				jobStepId =  $jobSelect.val();
			
			self.$dialog.find('.stackError').remove();
			
			if(jobStepId){
				showLoadingScreen();
				
				this.oLorenz.generateStackTrace(this.currentJobHost,jobStepId)
					.always(hideLoadingScreen)
					.done(function(stats){
						var newStats = [];
						
						for(var i = 0, il = stats.length; i < il; i++){
							var s = stats[i];
							
							newStats.push('<option value="'+s.url+'">'+s.file+'</option>');	
						}
						
						$imageSelect.append.apply($imageSelect, newStats);
					})
					.fail(function(e){
						self.error({
							friendlyError: "There was a server side error generating the stack trace for this jobstep.  Please send an error report via the link below.  Thank you.",
							technicalError: e,
							location: 'generate stack trace'
						});
					});
			}
			else{
				var $err = $('<div class="stackError" style="color: red;">Your job needs to have at least one job step in order to run a stack trace.</div>');
				
				$('#getJobStat').after($err);
				
				setTimeout(function(){
					if($err.length){
						$err.fadeOut('slow');
					}
				}, 5000);
			}
		},
		
		event_activeJobs_loadJobStat: function(){
			var $jobSelect = $('#statImages'),
				self = this,
				imgUrl = $jobSelect.val(),
				$currShowing = $('#currentlyShowingStat'),
				$img = $('<img src="'+imgUrl+'" class="statPreviewImg" alt="Couldn\'t load image." />').hide();
				
			$img.load(function() {			  
			  var ratio = this.width/this.height;
			  
			  this.height = 500;
			  
			  this.width = this.height * ratio;
			  
			  $(this).fadeIn('slow');
			  
			  self.$dialog.dialog('option', 'position', 'center');
			  
			  $currShowing.html($jobSelect.find(':selected').text());
			})
			.error(function(e){
				self.error({
					friendlyError: "There was a fatal error loading your STAT trace image.  Please send an error report.",
					technicalError: e,
					location: 'load STAT image'
				});
			})
			.click(function(){
				window.open(imgUrl);
			});

			$('#statPreview').empty()
				.append($img);
		},
		
		event_completedJobs_changePeriod: function(e){
			this.completedPeriod = $("#pastCompletedDays").val();
			
			this.completedJobs();
		},
		
		event_completedJobs_completedJobSelect: function(e){
			var selectedRow = e.target.parentNode,
				jobTable = this.completedJobTable,
				job = jobTable.fnGetData(selectedRow);
			
			this.activateRow($(selectedRow), jobTable);
			
			this.completedJobDetails(job);
		},
		
		event_completedJobs_examineJob: function(){
			this.buildExamineDialog(this.currentCompletedJobHost, '~', this.currentCompletedJobStatus, this.currentCompletedJobId);
		},
			
		completedJobs: function(){
			var self = this,
				$elem = self.$elem;
			
			$elem.trigger("interfaceChange", [{newInterface: 'completedJobs'}]);
			
			self.oLorenz.getCompletedJobs(self.completedPeriod).done(function(jobs){				
				$.tmpl('completedJobs', {
					id: 'completedJobsPane',
					title: 'Completed Jobs'+ (self.isLoraUserMe() ? '' : ' ('+self.oLorenz.loraUser+')'),
					rows: jobs,
					headers: ['Job ID', 'Name', 'State', 'Host', 'Elapsed',
								'Partition', 'Account', 'CPUTime', 'AllocCPUS', 'EndTime', 'JobScheduler',
								'JobSubmitter', 'NNodes', 'NTasks', 'NodeList', 'TimeLimit']
				})
				.appendTo($elem);
				
				self.completedJobsPane = $("#completedJobsPane");
				
				self.allCompletedDetails = jobs;
				
				$('#pastCompletedDays').val(self.completedPeriod);
				
				self.initCompletedJobsTable();
				
				self.initCompletedJobsDetails();
			})
			.fail(function(e){
				self.error({
					friendlyError: "It appears as if the request to get the selected job's details failed.  The most common reason for this is because the request took too long and the server closed the connection.  It's also very possible the cluster is down for your selected job.  You can check the <a target='_blank' href='/dfs/www/cgi-bin/lccgi/customstatus.cgi'>cluster status page</a> for more details.  If the cluster status is up, try selecting the job again.  If the problem persists please email Lorenz tech support with this error.  Thank you and sorry for any inconvenience.",
					technicalError: e,
					location: 'load completed jobs'
				});
			})
			.always($.proxy(this, 'interfaceDone'));	
		},
		
		initCompletedJobsDetails: function(jobs){
			var completedJobTable = this.completedJobTable;
			
			if(completedJobTable.find('tbody tr:eq(0) td').length > 1){
				var pos = completedJobTable.fnGetPosition(completedJobTable.find('tbody tr:eq(0)')[0]);
				
				if(pos >= 0){
					this.completedJobDetails(completedJobTable.fnGetData(pos));
				}
			}
		},
		
		completedJobDetails: function(job){
			var	self = this,
				jobId = job[0],
				jobName = job[1],
				jobStatus = job[2].toLowerCase(),
				host = job[3];				
			
			self.currentCompletedJobId = jobId;
			self.currentCompletedJobName = jobName;
			self.currentCompletedJobStatus = jobStatus;
			self.currentCompletedJobHost = host;
			
			$("#completedJobDetailsWrapper").remove();
			
			var details = self.findCompletedDetails(jobId, host);
			
			$.tmpl('completedJobDetails', {
				jobName: jobName,
				commonDetails: self.getCommonDetails(details, 'completed'),
				additionalDetails: self.getAdditionalDetails(details),
				opButtons: [
					{id: 'completedJobExamine', text: 'Examine'}	
				]
			})
			.appendTo(self.completedJobsPane.find('.contentBody'));
			
			$("#completedJobButtons button").button();
		},
		
		findCompletedDetails: function(jobId, host){
			var details = {},
				allCompletedDetails = this.allCompletedDetails;
				
			for(var i = 0, il = allCompletedDetails.length; i < il; i++){
				var d = $.extend({}, allCompletedDetails[i]);
				
				if(jobId === d['JobID'] && host === d['Cluster']){
					details = d;
					break;
				}
			}
			
			return details;
		},
		
		initCompletedJobsTable: function(){
			var self = this,
				dOpts = {
					"iDisplayLength": 10,
					"bJQueryUI": true,
					"sPaginationType": "full_numbers",
					
					"asStripeClasses": [ 'ui-widget-content', ''],
					"oLanguage": {
						"sEmptyTable": 'You have no completed jobs in the past '+$('#pastCompletedDays').val()+' day(s).'
					},
					"aoColumnDefs": [
						{ "bVisible": false, "aTargets": [ 5,6,7,8,9,10,11,12,13,14,15 ] }
					],
					"aLengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
					"sDom": 'C<"clear"><"H"lfr>t<"F"ip>',
					"sScrollX": "100%",
					"bScrollCollapse": true,
					"oColVis": {
						"buttonText": "Show/Hide Columns",
						"bRestore": true,
						"sRestore": 'Restore to Initial',
						"sSize": "css",
						"iOverlayFade": 0,
						"fnStateChange": function(){
							self.completedJobTable.fnAdjustColumnSizing();
						}
					}
				},
				exportOpts = {
					"sDom": 'TC<"clear"><"H"lfr>t<"F"ip>',
					"oTableTools": {
						"sSwfPath": "../js/jquery/datatables/TableTools/media/swf/copy_cvs_xls_pdf.swf",
						"aButtons": [
							{
								"sExtends":    "collection",
								"sButtonText": "Export Table As...",
								"aButtons":    [ {
									"sExtends": "csv",
									"sTitle": "My Completed Jobs",
									"sFileName": "MyLC Completed Jobs Export.csv"
								},
								{
									"sExtends": "xls",
									"sTitle": "My Completed Jobs",
									"sFileName": "MyLC Completed Jobs Export.xls"
								},
								{
									"sExtends": "pdf",
									"sTitle": "My Completed Jobs",
									"sFileName": "MyLC Completed Jobs Export.pdf"
								}]
							}
						]
					}
				};

			if(self._hasFlash()){
				$.extend(dOpts, exportOpts);
			}				
			
			this.completedJobTable = this.completedJobsPane.find("#completedJobsTable").dataTable(dOpts);
			
			$(document).on('click', '.ColVis_Restore', function(){
				//Bit of a hack... ColVis plugin doesn't auto resize columns after turning on/off
				//Cols... and the restore to default button doesnt tirgger the fnStateChange event
				//So I bind my own event here to do it
				if(self.completedJobTable.fnAdjustColumnSizing){
					self.completedJobTable.fnAdjustColumnSizing();
				}
			});
			
			var timeoutId = -1;
			
			$(window).bind('resize.completedJobTable', function(e){
				//Turns out elements that are jquery UI's "resizable", bubble up a resize event
				//to the window, and it was triggering this code... so now we do a check to see
				//if it's a DOM element where the event orginated, cause if it was an actual window
				//resize, instance of "Window" is just a plain object and then re-render
				if(!(e.target instanceof HTMLElement)){
					clearTimeout(timeoutId);
					
					//bit of a datatables bug fix... the columns have a static width
					//when you specify sScrollX.. so if it resizes, lets adjust col widths
					timeoutId = setTimeout(function(){
						self.completedJobTable.fnAdjustColumnSizing();
					}, 500);
				}
			});

			$("div.DTTT_container").css('marginBottom', '5px').find('button').addClass("ui-corner-all");
			$("div.ColVis").find('button').hover(function(){$(this).toggleClass('ui-state-hover')}).addClass("ui-corner-all");			
			
			this.activateRow(this.completedJobTable.find('tbody tr:eq(0)'), this.completedJobTable);			
		},
		
		activeJobs: function(){
			var self = this,
				$elem = self.$elem;
			
			$elem.trigger("interfaceChange", [{newInterface: 'activeJobs'}]);		
			
			$.when(self.oLorenz.getJobs(), self.oLorenz.getClusters()).done(function(jobs, clusters){		
				$.tmpl('activeJobs', {
					id: 'activeJobsPane',
					title: 'Active Job Management' + (self.isLoraUserMe() ? '' : ' ('+self.oLorenz.loraUser+')'),
					rows: self.addRowCheckboxes(jobs.jobs),
					headers: ['', 'Job ID', 'Name', 'State', 'Host', 'Start Time', 'End Time',
							  'Partition', 'Reason', 'Time Limit', 'Dependency', 'Job Scheduler',
							  'Job Submitter', 'Num Nodes'],
					hosts: clusters.accounts
				})				
				.appendTo($elem);
				
				$('#refreshJobData').button();
				
				self.disableRefreshTable();
				
				self.activeJobsPane = $("#activeJobsPane");
				
				self.initActiveJobsTable();			
				
				self.initJobDetails();

				self.renderCheckboxFunctions();
				
				self.initStaleDataCheck(jobs.jobs);
			})
			.fail(function(e){
				self.error({
					friendlyError: "It appears there was an error retrieving your active jobs. This error should only appear when there was a server error.  Try refreshing the page. If that doesn't work contact the lorenz team (lorenz-info@your.site.here) with this error message.",
					technicalError: e,
					location: 'load active jobs'
				});
			})
			.always($.proxy(this, 'interfaceDone'));
		},
		
		staleDataInterval: -1,
		
		initStaleDataCheck: function(currentJobs){
			var self = this;
			
			if(this.staleDataInterval === -1){
				this.staleDataInterval = setInterval(function(){
					self.oLorenz.getJobs()
						.done(function(jobs){
							try{
								if(self.staleDataInterval !== -1 && !self.compareJobLists(currentJobs, self.addRowCheckboxes(jobs.jobs))){
									self.staleDataWarning();
								}
							}
							catch(e){
								if(typeof console !== 'undefined'){
									console.log(e);
								}
								
								clearInterval(self.staleDataInterval);
							}
						});
				}, 300000)	
			}
		},
		
		staleDataWarning: function(){
			$('#staleDataNotice').show();
		},
		
		compareJobLists: function(oldJobs, newJobs){
			var same = false,
				matches = 0,
				newString = '',
				oldString = '';
			
			if($.isArray(oldJobs) && $.isArray(newJobs) && oldJobs.length === newJobs.length){
				var oldString = this.buildJobsString(oldJobs),
					newString = this.buildJobsString(newJobs);
				
				//I can get away with this object comparison here because the JSON will not contain methods
				//And the fields are always in the same order...so stringify does fine
				if(newString === oldString){
					same = true;
				}
			}
			
			return same;
		},
		
		buildJobsString: function(jobs){
			var s = '',
				activeCompareList = this.activeCompareList;;
			
			for(var i = 0, il = jobs.length; i < il; i++){
				var nj = jobs[i];
				
				if(!activeCompareList[nj.JobId+nj.Host]){
					s += JSON.stringify(nj);
				}
			}
		},
		
		renderCheckboxFunctions: function(){
			var self = this,
				$masterButton = this.$elem.find("#masterCheckbox-menu"),
				$masterCheckbox = this.$elem.find("#masterCheckbox"),
                $menu = $("#masterCheckbox-popup");
			
			this.$masterCheckbox = $masterCheckbox.click(function(){
				self.toggleTableCheckboxes($masterCheckbox.is(":checked"));
				
				self.enableSelectActions();
			});
			
			this.jobTable.delegate('input[name=job_selectBox]', 'click', function(){
				self.enableSelectActions();				
			});
            
            $masterButton.click(function(){
                $menu.toggle();
                
                return false;
            });
            
			$menu.menu({
				select: function(event, ui){					
					self.multiSelectMenuAction(ui.item.text());
                    
                    $menu.hide();
				}
			});
			
			this.$cancelAll = $("#cancelAllSelected")
				.attr("tabIndex", -1)
				.attr("title", "Cancel All Selected")
				.button({
					disabled: true,
                    icons: {
                        primary: "ui-icon-cancel"
                    }                    
                })
                .removeClass("ui-corner-all")
				.addClass("ui-corner-left ui-button-icon")
				.click($.proxy(this, 'cancelAll'));
			
			this.$holdAll = $("#holdAllSelected")
				.attr("tabIndex", -1)
				.attr("title", "Hold All Selected")
				.button({
					disabled: true,
                    icons: {
                        primary: "ui-icon-clock"
                    }                    
                })
                .removeClass("ui-corner-all")
				.addClass("ui-corner-right ui-button-icon")
				.click($.proxy(this, 'holdAll'));
			
			this.$masterButton = $masterButton
                .attr("tabIndex", -1)
				.attr("title", "Select")
                .button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                })
                .removeClass("ui-corner-all")
				.addClass("ui-corner-right ui-button-icon");
		},
		
		cancelAll: function(){
			var self = this,
				checked = this.jobTable.find("tbody tr td :checked"),
				cancelList = [],
				hostCol = self._getColIndex('Host'),
				jobIdCol = self._getColIndex('Job ID');
			
			if(checked.length > 0){
				showLoadingScreen();
				
				checked.each(function(){					
					var $tr = $(this).parents('tr:first');
						host = $tr.find('td:eq('+hostCol+')').text(),
						jobId = $tr.find('td:eq('+jobIdCol+')').text();
					
					cancelList.push(self.oLorenz.cancelJob(host, jobId));
				});
				
				$.when.apply(undefined, cancelList)
					.done(function(r){
						self.removeJobFromTable('error', ':has(input[type="checkbox"]:checked)');
						
						self.disableRefreshTable();
					})
					.fail(function(e){
						self.error({
							friendlyError: 'There was an error trying to cancel the selected job(s).  It\'s possible the job(s) were completed or cancelled by another source.  Often the job table is using a cached version of your jobs and is not in sync with the real time status of the queue.  Please try refreshing the job table using the "Refresh Table" button and try to cancel again. If the problem persists send an error report via the link below.',
							technicalError: e,
							location: 'cancel jobs batch'
						});
					})
					.always(hideLoadingScreen);
			}
		},
		
		_getColIndex: function(name){
			var col = 0;
			
			$(".dataTables_wrapper").find('thead th')
				.each(function(){
					var $th = $(this);
					
					if($th.text() === name){
						col = $th.index();
						
						return false;
					}
				})
			
			return col;
		},
		
		holdAll: function(){
			var self = this,
				checked = this.jobTable.find("tbody tr td :checked"),
				holdList = [],
				hostCol = self._getColIndex('Host'),
				jobIdCol = self._getColIndex('Job ID');
			
			if(checked.length > 0){
				showLoadingScreen();
				
				checked.each(function(){					
					var $tr = $(this).parents('tr:first');
						host = $tr.find('td:eq('+hostCol+')').text(),
						jobId = $tr.find('td:eq('+jobIdCol+')').text();
					
					holdList.push(self.oLorenz.holdJob(host, jobId));
				});
				
				$.when.apply(undefined, holdList)
					.done(function(r){
						self.holdJobSuccessFeedback(':has(input[type="checkbox"]:checked)');
					})
					.fail(function(e){
						self.error({
							friendlyError: 'A server error occurred holding jobs. Email lorenz tech support with this error. Thank you.',
							technicalError: e,
							location: 'hold jobs batch'
						});
					})
					.always(hideLoadingScreen);
			}
		},
		
		multiSelectMenuAction: function(selected){
			this.toggleTableCheckboxes(false);
			
			if(selected === 'All'){
				this.toggleTableCheckboxes(true);
				this.$masterCheckbox.prop('checked', true);
			}
			else if(selected === 'None'){
				this.toggleTableCheckboxes(false);
				this.$masterCheckbox.prop('checked', false);
			}
			else if(selected === 'Pending'){
				this.selectCheckboxes(4, selected);
			}
			else if(selected === 'Running'){
				this.selectCheckboxes(4, selected);
			}
			else{
				this.selectCheckboxes(5, selected);
			}
			
			this.enableSelectActions();
		},
		
		//Selects checkboxes in table where the value contained in col equals value		
		selectCheckboxes: function(col, value){
			this.jobTable.find('td:nth-child('+col+')').filter(':contains('+value+')')
				.each(function(){
					$(this).parent('tr').find('input[type="checkbox"]').prop('checked', true);
				});
		},
		
		toggleTableCheckboxes: function(toggle){
			this.jobTable.find('input[type="checkbox"]').prop('checked', toggle);
		},
		
		addRowCheckboxes: function(jobs){
			for(var i = 0, il = jobs.length; i < il; i++){
				var job = jobs[i];
				
				job['checkbox'] = job.JobId;
			}
			
			return jobs;
		},
		
		enableSelectActions: function(){
			var checked = this.jobTable.find("tbody tr td :checked");
			
			if(this.$cancelAll){
				this.enableCancelButton(checked);
			}
			
			if(this.$holdAll){
				this.enableHoldButton(checked);
			}
			
			if(checked.length === 0){
				if(this.$masterCheckbox){
					this.$masterCheckbox.prop('checked', false);
				}
			}			
		},
		
		//If any job is selected enable cancel button, else disable it
		enableCancelButton: function(checked){
			if(checked.length > 0){
				this.$cancelAll.button('option', 'disabled', false);
			}
			else{
				this.$cancelAll.button('option', 'disabled', true);
			}
		},
		
		//Only enable hold if every selected job is in "Pending" state
		enableHoldButton: function(checked){
			var allPending = true;
			
			if(checked.length > 0){
				checked.each(function(){
					var state = $(this).parents('tr:first').find('td:eq(3)').text();
					
					if(state !== 'Pending'){
						allPending = false;
						
						return false;
					}
				});
				
				if(allPending){
					this.$holdAll.button('option', 'disabled', false);
				}
				else{
					this.$holdAll.button('option', 'disabled', true);
				}
			}
			else{
				this.$holdAll.button('option', 'disabled', true);
			}
		},
		
		disableRefreshTable: function(){
			var self = this,
				countDown = 10,
				$notice = $("#refreshJobNotice").show(),
				$count = $("#refreshCount").html(countDown),
				$button = $("#refreshJobData").button('option', 'disabled', true);

			if(self.refreshInterval !== -1){
				clearInterval(self.refreshInterval);
			}	
		
			self.refreshInterval = setInterval(function(){				
				$count.html(--countDown);
				
				if(countDown === 0){					
					$button.button("option", "disabled", false);
					
					$notice.hide();
					
					clearInterval(self.refreshInterval);
				}
				else if(countDown === 3){
					$count.css({fontWeight: 'bold', color: 'red'})
				}
			}, 1000);
		},
		
		initJobDetails: function(){
			var jobTable = this.jobTable;				
			
			//Only init job details if there already isnt a row selected
			if(this.getSelectedRow().length === 0){
				//If the table is populated
				if(this.jobTable.find('tbody tr:eq(0) td').length > 1){
					var $row = this.getInitDetailsRow();
					
					var data = this.getDataForRow(this.activateRow($row)[0])
					
					if(data !== -1){
						this.jobDetails(data);
					}
				}
				else{
					$("#jobDetailsWrapper").remove();
				}
			}
		},
		
		activateRow: function($row, table){
			var $prev = $row.prev('tr'),
				jobTable = table || this.jobTable;

			//this prev('tr') stuff is a hack for FF... there was an issue where it would always show
			//the preceding siblings bottom border over the current row's top border... very annoying so I just toggle it
			//on and off here
			jobTable
				.find('tbody tr')
				.removeClass(this.rowSelectedClass+' ui-state-highlight')
				.prev('tr')
				.css('borderBottom', '');					
		
			$row.addClass(this.rowSelectedClass+' ui-state-highlight');
			
			if($prev.length > 0){
				$prev.css({borderBottom: 'none'})
			}
			
			return $row;
		},
		
		firstLoad: true,		
		
		getInitDetailsRow: function(){
			var $row = {};
			
			if(this.firstLoad && this.query.jobId !== undefined){
				$row = this.getAnyRowForCellValue(2, this.query.jobId);
				
				this.firstLoad = false;
			}
			
			if($.isEmptyObject($row)){
				if(this.selectedRowJobId !== -1){				
					$row = this.getRowForCellValue(2, this.selectedRowJobId);				
				}
				
				if($.isEmptyObject($row)){
					$row = this.jobTable.find('tbody tr:eq(0)');				
				}
			}
			return $row;
		},
		
		getAnyRowForCellValue: function(col, value){
			var jobTable = this.jobTable,
				allRows = jobTable.fnGetNodes(),
				data,
				pos,
				row,
				$row = {};
			
			for(i = 0, il = allRows.length; i < il; i++){
				row = allRows[i];
				data = jobTable.fnGetData(allRows[i]);
				
				if(value === data[1]){
					jobTable.fnDisplayRow(row);
					$row = $(row);
					break;
				}				
			}
			
			return $row;
		},
		
		getRowForCellValue: function(col, value){
			var $row = {};
			
			this.jobTable.find('tbody td:nth-child('+col+')').each(function(){
				var $cell = $(this);
				
				if($cell.text() === value){
					$row = $cell.parent('tr');
					
					return false;
				}
			});
			
			return $row;
		},
		
		initActiveJobsTable: function(){
			var self = this,
				dOpts = {
					"iDisplayLength": 10,
					"bJQueryUI": true,
					"sPaginationType": "full_numbers",
					"asStripeClasses": [ 'ui-widget-content', ''],
					"fnDrawCallback": function(){					
						if(!$.isEmptyObject(self.jobTable)){						
							self.enableSelectActions();
							
							//bug fix to remove potentially selected rows on other pages
							self.getSelectedRow().each(function(){
								var $s = $(this);
								
								if($s.find("td:eq(1)").text() !== self.preJobId && self.preJobId !== -1){								
									$s.removeClass(self.rowSelectedClass + ' ui-state-highlight');
								}
							});
						}
					},
					"oLanguage": {
						"sEmptyTable": 'You have no active jobs.'
					},
					"aoColumnDefs": [
						{
							"fnRender": function (oObj) {							
								return '<input type="checkbox" id="'+oObj.aData[0]+'" name="job_selectBox"/>';							
							},
							"sWidth": '23px',
							"bSortable": false,
							"bSearchable": false,
							"aTargets": [0] //columns definition applies to
						},
						{ "bVisible": false, "aTargets": [ 7,8,9,10,11,12,13 ] }
					],
					"bStateSave": true,
					"aLengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
					"sDom": 'C<"clear"><"H"lfr>t<"F"ip>',
					"sScrollX": "100%",
					"bScrollCollapse": true,
					"oColVis": {
						"buttonText": "Show/Hide Columns",
						"aiExclude": [0, 1, 4],
						"bRestore": true,
						"sRestore": 'Restore to Initial',
						"sSize": "css",
						"iOverlayFade": 0,
						"fnStateChange": function(){
							self.jobTable.fnAdjustColumnSizing();
						}
					}
				},
				exportOpts = {
					"sDom": 'TC<"clear"><"H"lfr>t<"F"ip>',
					"oTableTools": {
						"sSwfPath": "../js/jquery/datatables/TableTools/media/swf/copy_cvs_xls_pdf.swf",
						"aButtons": [
							{
								"sExtends":    "collection",
								"sButtonText": "Export Table As...",
								"aButtons":    [ {
									"sExtends": "csv",
									"sTitle": "My Active Jobs",
									"sFileName": "MyLC Active Jobs Export.csv"
								},
								{
									"sExtends": "xls",
									"sTitle": "My Active Jobs",
									"sFileName": "MyLC Active Jobs Export.xls"
								},
								{
									"sExtends": "pdf",
									"sTitle": "My Active Jobs",
									"sFileName": "MyLC Active Jobs Export.pdf"
								}]
							}
						]
					}
				};
				
			$(document).on('click', '.ColVis_Restore', function(){
				//Bit of a hack... ColVis plugin doesn't auto resize columns after turning on/off
				//Cols... and the restore to default button doesnt tirgger the fnStateChange event
				//So I bind my own event here to do it
				if(self.jobTable.fnAdjustColumnSizing){
					self.jobTable.fnAdjustColumnSizing();
				}
			});
			
			var timeoutId = -1;
			
			$(window).bind('resize.jobTable', function(e){
				//Turns out elements that are jquery UI's "resizable", bubble up a resize event
				//to the window, and it was triggering this code... so now we do a check to see
				//if it's a DOM element where the event orginated, cause if it was an actual window
				//resize, instance of "Window" is just a plain object and then re-render
				if(!(e.target instanceof HTMLElement)){
					clearTimeout(timeoutId);
					
					//bit of a datatables bug fix... the columns have a static width
					//when you specify sScrollX.. so if it resizes, lets adjust col widths
					timeoutId = setTimeout(function(){
						self.jobTable.fnAdjustColumnSizing();
					}, 500);
				}
			});
			
			if(self._hasFlash()){
				$.extend(dOpts, exportOpts);
			}
				
			this.jobTable = this.activeJobsPane.find("#jobTable").dataTable(dOpts);
			
			var TT = $("div.DTTT_container").find('button').addClass("ui-corner-all").end().detach(),
				CV = $("div.ColVis").find('button').hover(function(){$(this).toggleClass('ui-state-hover')}).addClass("ui-corner-all").end().detach();
			
			$('table.jobTable-toolbar')
				.find('.tableTools-container').append(TT)
			.end()
				.find('.colVis-container').append(CV);
		},
		
		_hasFlash: function(){
			return swfobject.hasFlashPlayerVersion("9.0.18");
		},
		
		jobDetails: function(job, force){
			var	self = this,
				jobId = job[1],
				jobName = job[2],
				jobStatus = job[3].toLowerCase(),
				host = job[4],
				forceLoad = force || false,
				$contentBody = self.contentLoading(self.activeJobsPane.find('.contentBody'), 'hide');			
			
			hideLoadingScreen();
			
			if(forceLoad || (jobStatus !== 'completing' && jobId !== self.currentJobId)){				
				$("#jobDetailsWrapper").remove();
				
				self.disableActiveJobsTable();
				
				self.contentLoading($contentBody, 'show', {marginTop: '30px'});
				
				self.abortXhrCheck();
				
				self.preJobId = jobId;
				
				self.currDetailsXhr = self.oLorenz.getJobDetails(host, jobId)
					.done(function(details){					
						self.renderJobDetails(details, jobId, jobName, jobStatus, host);
					})
					.fail(function(e, textStatus){					
						self.contentLoading($contentBody, 'hide');
						
						if(textStatus !== 'abort'){							
							self.error({
								friendlyError: "It appears as if the request to get the selected job's details failed.  The most common reason for this is because the request took too long and the server closed the connection.  It's also very possible the cluster is down for your selected job.  You can check the <a target='_blank' href='/dfs/www/cgi-bin/lccgi/customstatus.cgi'>cluster status page</a> for more details.  If the cluster status is up, try selecting the job again.  If the problem persists please email Lorenz tech support with this error.  Thank you and sorry for any inconvenience.",
								technicalError: e,
								location: 'load job details'
							});
						}
					})
					.always(function(){
						self.enableActiveJobsTable();
					});
			}
		},
		
		abortXhrCheck: function(){			
			if(this.currDetailsXhr !== -1){
				this.currentJobId = -1;

				this.currDetailsXhr.jqXhr.abort();
				
				this.currDetailsXhr = -1;
			}
		},
		
		currDetailsXhr: -1,
		
		renderJobDetails: function(details, jobId, jobName, jobStatus, host){
			var self = this;
			
			//need to keep pristine copy of details object before we call getCommon/AdditionalDetails
			//As these functions  may delete certain key value pairs
			self.currentJobDetails = $.extend({}, details);

			if(!self.currentJobDetails.MetaJobState){						
				//Means the job is no longer considered an "active" job, usually because it completed or was cancelled
				self.flagCompletedJob();					
			}
			else{						
				$.tmpl('jobDetails', {
					jobName: jobName || 'n/a',
					opButtons: self.getActiveJobButtons(self.currentJobDetails.operationsSupported),
					commonDetails: self.getCommonDetails(details, 'active'),
					additionalDetails: self.getAdditionalDetails(details),						
					renderMenu: jobStatus === 'running' ? true : false //menu for sendSignal button
				})			
				.appendTo(self.contentLoading(self.activeJobsPane.find('.contentBody'), 'hide'));
				
				self.currentJobId = jobId;
				self.currentJobHost = host;
				self.currentJobName = jobName;
				self.currentJobStatus = jobStatus;
				
				$("#activeJobButtons button").button();
				
				var $signal = $("#signalJob").button('option', 'icons', {secondary: 'ui-icon-triangle-1-s'});

				var $menu = self.renderSignalMenu(host, jobId);
				
                $signal.click(function(){
                    $menu.toggle();
                    
                    return false;
                });
                
				if(!self.isLoraUserMe()){						
					self.disableJobDetailButtons(jobStatus);
				}
				
				if(jobStatus === 'running'){							
					self.initRemainingTimeCountdown(self.currentJobDetails.EndTime);
				}
			}
		},
		
		disableActiveJobsTable: function(){
			this.$elem.undelegate('#jobTable tbody', 'click', $.proxy(this, 'event_activeJobs_jobSelect'));
		},
		
		enableActiveJobsTable: function(){
			this.$elem.delegate('#jobTable tbody', 'click', $.proxy(this, 'event_activeJobs_jobSelect'));
		},
		
		flagCompletedJob: function(type){
			var obj = this,
				$contentBody = this.activeJobsPane.find('.contentBody');

			if(type === 'deferred'){
				this.getSelectedRow().addClass("completedJobRow");
			}
			else{
				this.contentLoading($contentBody, 'hide');
			
				$("#jobDetailsWrapper").remove();
				
				this.warning({
					msg: "The job selected is no longer an active job.  This usually means the job completed or was cancelled sometime after your last active jobs table refresh.  It's also possible the server the job was submitted on is currently down.  Check the completed jobs tab to see if your job actually completed.",
					location: 'completed job found',
					ok: function(){
						obj.removeJobFromTable(undefined, undefined, false);						
					}
				});			
			}
		},
		
		renderSignalMenu: function(host, jobId){
			var self = this;

			return $("#signalMenu").menu({
				select: function(event, ui){
					$(this).hide();
					
					self.oLorenz.sendJobSignal(host, jobId, ui.item.text())
						.done(function(){
							self.disableRefreshTable();
						});
				}
			});
		},
		
		contentLoading: function($elem, task, css){
			if(task === 'hide'){
				return $elem.find(".ajaxLoader").remove().end();
			}
			else{
				return $elem.append($('<span class="ajaxLoader centerMargins"></span>').css(css));
			}
		},
		
		activeCompareList: {},
		
		removeJobFromTable: function(type, rowFilter, reinit){
			var self = this,
				reinitTable = reinit !== undefined ? reinit : true,
				jobType = type || 'success',
				typeToAnimation = {
					error: {
						css: 'canceledJobRow'
					},
					success: {
						css: 'completedJobRow'
					}
				},
				filter = rowFilter || '.'+self.rowSelectedClass,				
				$row = $("#jobTable tbody tr").filter(filter).addClass(typeToAnimation[jobType].css),
				rowCount = $row.length;
			
			if($row.length > 0){
				$row.each(function(index){
					var $r = $(this),
						$columns = $r.find('td'),
						total = $columns.length,
						animCount = 0,
						data;
					
					if(total > 1){
						data = self.jobTable.fnGetData($r[0])
				
						self.activeCompareList[data[1]+data[4]] = 1;
						
						$r.removeClass(self.rowSelectedClass + ' ui-state-highlight');
						
						$columns.animate({ opacity: 0 }, 1000, function(){
							animCount++;
							
							//Need to know when we're on the last animation completing for all the td's
							if(animCount === total){
								self.jobTable.fnDeleteRow($r[0]);
								
								if((index + 1) === rowCount && reinitTable){
									self.initJobDetails();
								}
							}							
						});
					}
				});
				
			}
		},
		
		holdJobSuccessFeedback: function(rowFilter){
			var self = this;
			
			if(rowFilter !== undefined){
				var $rows = this.jobTable.find('tbody tr').filter(rowFilter);
				
				$rows.each(function(){
					self.jobTable.fnUpdate('JobHeldUser', $(this)[0], 3);
				});
			}
			else{
				this.jobTable.fnUpdate('JobHeldUser', this.getSelectedRow()[0], 3);	
			}
			
			this.disableRefreshTable();
		},
		
		unholdJobSuccessFeedback: function(){
			this.jobTable.fnUpdate('Pending', this.getSelectedRow()[0], 3);
			
			this.disableRefreshTable();
		},
		
		initRemainingTimeCountdown: function(endTime){
			var $cached = $('#jobDetailsTable #detailValue-RemainingTime');
			
			this.disableRemainingTimeInterval();
			
			if(endTime){
				var self = this,
					end = Date.parse(endTime),
					timeSpan = new TimeSpan(end - new Date());
				
				if(self.noTimeRemaining(timeSpan)){
					self.showRemainingTime($cached, 0, 0, 0, 0);
					
					self.flagCompletedJob('deferred');
				}
				else{
					self.showRemainingTime($cached, timeSpan.days, timeSpan.hours, timeSpan.minutes, timeSpan.seconds);				
				
					this.remainingTimeInterval = setInterval(function(){
						var newSpan = new TimeSpan(end - new Date());
						
						self.showRemainingTime($cached, newSpan.days, newSpan.hours, newSpan.minutes, newSpan.seconds);

						if(self.noTimeRemaining(newSpan)){						
							clearInterval(self.remainingTimeInterval);
							
							self.flagCompletedJob('deferred');
						}
					}, 1000);
				}
			}
			else{
				$cached.html('Undefined');
			}
		},
		
		showRemainingTime: function($container, d, h, m, s){			
			$container.html(d+'d '+h+'h '+m+'m '+s+'s');
		},
		
		noTimeRemaining: function(timeSpan){
			return timeSpan.days <= 0 && timeSpan.hours <= 0 && timeSpan.minutes <= 0 && timeSpan.seconds <= 0;
		},
		
		disableRemainingTimeInterval: function(){
			if(this.remainingTimeInterval !== -1){
				clearInterval(this.remainingTimeInterval);
			}
		},
		
		disableJobDetailButtons: function(status){
			if(status === 'pending'){
				$('#cancelJob, #holdJob, #examine, #editParams, #addDependency').button('option', 'disabled', true);
			}
			else if(status === 'running'){
				$('#cancelJob, #resubmitJob, #interact, #examine, #signalJob').button('option', 'disabled', true);
			}
			else if(status === 'held'){
				
			}
		},
		
		getAdditionalDetails: function(details){
			var additional = [],
				fields = this.getObjectKeys(details, ['MetaJobState', 'operationsSupported']);
			
			for(var i = 0, il = fields.length; i < il; i+=2){
				
				additional.push({cols: [{name: fields[i], value: details[fields[i]]},
								 {name: fields[i+1], value: details[fields[i+1]]}]});			
			}
			
			return additional;
		},
		
		getObjectKeys: function(obj, exclusions){
			var keys = [],
				eArr = $.isArray(exclusions) ? exclusions : [];
			
			for(var k in obj){
				if($.inArray(k, eArr) === -1){
					keys.push(k);
				}
			}
			
			return keys;
		},
		
		getCommonDetails: function(details, type){
			var common = [],
				typeToAdd = {
					'active' : ["JobId", "Partition", "Name", "JobState", "SubmitTime", "RemainingTime",
								"NumNodes", "NodeList", "Dependency", "Account", "QOS",
								"Priority", "TimeLimit", "Reason"],
					
					'completed' : ['JobID', 'Partition', 'JobName', 'UID', 'User', 'Submit', 'End', 'Elapsed', 'NNodes',
								   'NodeList', 'Account', 'QOS', 'Priority', 'Timelimit', 'Cluster', 'CPUTime']
				},
				toAdd = typeToAdd[type] || [];         
			
			
            for(var i = 0, il = toAdd.length; i < il; i+=2){
                var	name1 = toAdd[i],
					value1 = details[name1],
					name2 = toAdd[i+1] || '',
					value2= details[name2],
					tmp = [];  				
                
                tmp.push({name: name1, value: value1});
				
				delete details[name1];
				
				//if its our last iteration and theres no name2, it means our
				//toAdd array is of odd length and we don't append that last column
				if(i+1 < il && name2){
					tmp.push({name: name2, value: value2});
					
					delete details[name2];
				}
				
				common.push({cols: tmp});
            }
			
			return common;	
		},
				
		getActiveJobButtons: function(supported){
			var supportedToButton = {
				"cancel" : {id: 'cancelJob', text: 'Cancel'},
				"hold" : {id: 'holdJob', text: 'Hold'},
				"unhold" : {id: 'unholdJob', text: 'Unhold'},
				"modify" : {id: 'editParams', text: 'Edit Params'},
				"signal" : {
					id: 'signalJob',
					text: 'Send Signal',
					subMenu: this.getJobSignals(),
					menuId: 'signalMenu'
				},				
				"examine" : {id: 'examineJob', text: 'Examine'}
				//"interact" : {id: 'interactJob', text: 'Interact'}
			},			
			buttons = [];
			
			for(var key in supported){
				var tmpButton = supportedToButton[key];
				
				if(tmpButton && supported[key] === 1){
					buttons.push(tmpButton);
				}
			}
			
			return buttons;
		},
		
		getJobSignals: function(){
			return ['HUP', 'INT', 'QUIT', 'ABRT', 'KILL', 'ALRM', 'TERM',
					'USR1', 'USR2', 'CONT', 'STOP', 'TSTP', 'TTIN', 'TTOU'];
		},
		
		buildEditParamForm: function(batchDetails, jobs){			
			this.batchDetails = batchDetails;

			var defaults = this.buildEditParamsDefaults();
			
			this.buildNewJobDependencies(batchDetails, jobs, defaults);
			
			$("#job_name").val(defaults['job_name']);
			
			$("#job_reservation").val(defaults['job_reservation']);
			
			$("#job_nNodes").val(defaults['job_nNodes']);
			
			$("#job_nTasks").val(defaults['job_nTasks']);
						
			$("#job_gres").val(defaults['job_gres']);

			$("#job_dependencies").val(this.convertDepsToArray(defaults['job_dependencies']));
			
			this.cachedEditJobForm = this.buildJobInfo($("#editJobForm"));
		},
		
		saveEditParams: function(){		
			this.validateForm($("#editJobForm"));
			
			if(this.validateDeferreds.length > 0){
				$.when.apply($, this.validateDeferreds).always($.proxy(this, 'submitEditParams'));
			}
			else{
				this.submitEditParams();
			}
		},	
		
		submitEditParams: function(){
			var self = this;
			
			if(self.formIsReady){
				showLoadingScreen();
				
				var jobInfo = self.getChangedEditParamVals();
				
				if(!$.isEmptyObject(jobInfo)){
					self.oLorenz.editJobParams(self.currentJobHost, self.currentJobId, {
						data: jobInfo
					})
					.done(function(r){
						self.disableRefreshTable();
						
						self.toggleDialog({
							title: 'Edit Job Params Successful'
						},
						'Job parameters edited successfully!  The command output is below:<br/><br/>'+r);
												
						self.jobDetails(self.getDataForRow(self.getSelectedRow()[0]), true);
					})
					.fail(function(e){
						self.error({
							friendlyError: "Unable to edit job params. The cluster on which the job you selected may currently be down.  Please send an error report.",
							technicalError: e,
							location: "edit params"
						});
					})
					.always(hideLoadingScreen);
				}
				else{
					hideLoadingScreen();
					
					self.toggleDialog({
						title: 'No changes'
					}, 'We detected no parameters were changed before you clicked save.  Therefore, no editing of parameters took place.');
				}				
			}
		},
		
		getChangedEditParamVals: function(){
			var cached = this.cachedEditJobForm,
				newData = this.buildJobInfo($("#editJobForm")),
				jobInfo = {};

			for(var val in cached){
				var cVal = cached[val],
					nVal = newData[val];
				
				if($.isArray(cVal) && $.isArray(nVal)){
					if(cVal.join('') !== nVal.join('')){
						jobInfo[val] = nVal;
					}
				}
				else if(cVal !== nVal){					
					jobInfo[val] = nVal;
				}
			}
			
			return jobInfo;
		},
		
		buildExamineDialog: function(host, workingDir, jobStatus, jobId){
			var self = this;
	
			self.toggleDialog({
					title: 'Examine Job',
					width: 700,
					height: 'auto',
					minHeight: 360,
					minWidth: 515,
					modal: true
				},
				$.tmpl('examineDialog', {					
					running: jobStatus === 'running' ? true : false
				})
			);
			
			$("#loadExamineFile").button();
			
			//sometimes workingDir is $HOME and this is considered an illegal char
			//in file tree
			workingDir = workingDir === '$HOME' ? '~' : workingDir;
			
			self.toggleFileTree('#examineFileTree', {					
				host: host,
				baseDir: workingDir,
				hostSwitching: false
			});
			
			self.renderTabs();
			
			//self.renderStatTab(host, jobId);
			
			$("#jqueryFileTreeContainer").css({height: '150px'});
		},
		
		renderStatTab: function(host, jobId){
			var $statPane = $('#examineStatJob'),
				self = this,
				oLorenz = self.oLorenz;
			
			if($statPane.length > 0){
				$.when(oLorenz.getJobSteps(host, jobId), oLorenz.getStackTraces(host, jobId))
					.done(function(jobSteps, stackTraces){
						$.tmpl('statDialog', {
							jobStepIds: jobSteps.jobstep_ids,
							statImage: stackTraces
						})
						.appendTo($statPane);
						
						$('#getJobStat').button();
						
						$('#loadJobStat').button();					
					})
					.fail(function(e){
						self.error({
							friendlyError: "An error occurred retrieving the job steps for jobid: "+jobId+ "on host: "+host+". This is usually a sign the host is down.  Please send an error report.",
							technicalError: e,
							location: 'render STAT tab'
						});
					});
			}
		},	
		
		renderTabs: function(){
			$('#examineDialogTabs').tabs();			
		},
		
		convertDepsToArray: function(deps){
			var niceArr = [];
			
			if(deps){
				var depArr = deps.split(',');
					
				for(var i = 0, il = depArr.length; i < il; i++){
					var indiv = depArr[i].split(':');

					if(this.currentJobId !== indiv[1]){
						niceArr.push(indiv[1]);
					}
				}
			}
			
			return niceArr;
		},
		
		saveConfiguration: function(name){
			var self = this,
				conf = self.buildJobInfo();
			
			showLoadingScreen();					
			
			//If its already in the menu, it means we are overwriting it, so just leave it in the array
			if($.inArray(name, self.formConfigurations) === -1){
				self.formConfigurations.push(name);
			}
			
			self.oLorenz.storeWrite(self.jobManagementConfDir+'/'+name, {data: JSON.stringify(conf)})
				.done(function(){
					self.saveConfName = '';
					
					self.refreshConfigurationMenu('#configurationMenu');
					self.refreshConfigurationMenu('#deleteConfMenu');
                    
                    self.jobOptionsFeedback('Successfully saved <strong>'+name+'</strong>!');
				})
				.always(hideLoadingScreen);
		},
		
		refreshConfigurationMenu: function(menu){		
			var items = '',
				formConfigurations = this.formConfigurations,
				fcl = formConfigurations.length;
			
			if(fcl > 0){
				for(var i = 0; i < fcl; i++){
					items += '<li><a>'+formConfigurations[i]+'</a></li>';
				}
			}
			else{
				items = '<li><a>-- empty --</a></li>';
			}
			
			$(menu).empty().append(items).menu("refresh");
		},
		
		createNewJob: function(){
			var self = this,
				$elem = self.$elem;
			
			$elem.trigger("interfaceChange", [{newInterface: 'createNewJob'}]);
			
			return $.when(this.oLorenz.getClusters(), this.oLorenz.storeRead(this.jobManagementConfDir)).done(function(clusters, configurations){
				self.currentClusters = clusters.accounts.slice(0);
				
				var tmpCluster = clusters.accounts.slice(0);
				tmpCluster.unshift(self.unselectedCluster);
				
				if($.isArray(configurations.files) && configurations.files.length > 0){
					self.formConfigurations = configurations.files;
				}
				
				var conf = self.formConfigurations.length > 0 ? self.formConfigurations : ['-- empty --'];
				
				$.tmpl('createNewJob', {
					id: 'createNewJobPane',
					title: 'Create New Job',
					createNewButtons: [
						{id: 'startWithNewJob', text: 'New Job'}
						//{id: 'startWithExistingScript', text: 'Load Existing Script'}						
					],
					configurationButtons: [
						{id: 'saveConfiguration', text: 'Save'},
						{id: 'loadConfiguration', text: 'Load', configurations: conf, menuId: 'configurationMenu'},
						{id: 'deleteConfiguration', text: 'Delete', configurations: conf, menuId: 'deleteConfMenu'}
					],					
					clusters: tmpCluster,
					depTypes: ['after', 'afterany', 'afterok', 'afternotok'],
					activeJobs: []
				})
				.appendTo($elem);
				
				self.createNewJobPane = $('#createNewJobPane');				
				
				self.createNewJobPane.find("button").button();
				
				$('#job_beginTime').datetimepicker({
					dateFormat: 'yy-mm-dd',
					timeFormat: 'hh:mm:ss', //'2010-01-20T12:34:00'
					separator: 'T',
					changeMonth: true,
					changeYear: true,
					minDate: new Date()
				});
				
				self.initializeMenus();
				
				$('#newJobForm').find(':input').not('#job_cluster').each(function(){					
					self.toggleDisable($(this), true);
				});
			})
			.fail(function(e){
				self.error({
					friendlyError: "An error occurred loading create new job form.  Please email lorenz-info@your.site.here with this error.",
					technicalError: e,
					location: 'create new job'
				});
			})
			.always($.proxy(self, 'interfaceDone'));		
		},
		
		toggleDisable: function($input, toggle){
			if(!toggle){				
				return $input.removeClass('ui-state-disabled').prop("disabled", false)
					.parents('td:first').removeClass('ui-state-disabled').end().siblings('[errorType=missingRequired]').remove().end();
			}
			else{				
				return $input.addClass('ui-state-disabled').prop("disabled", true)
					.parents('td:first').addClass('ui-state-disabled').end().siblings('[errorType=missingRequired]').remove().end();
			}
		},
		
		initializeMenus: function(){
			var self = this;
            
			var $conf = $("#configurationMenu").menu({
				select: function(event, ui){
					var selected = ui.item.text();
					
					$(this).hide();
					
					if(selected !== '-- empty --'){
						self.oLorenz.storeRead(self.jobManagementConfDir+'/'+selected)
							.done($.proxy(self, 'loadConfiguration'));
					}
				}
			});
			
            $("#loadConfiguration").click(function(){
                $conf.toggle();
                
                $delete.hide();
                return false;
            });
            
			var $delete = $("#deleteConfMenu").menu({
				select: function(event, ui){
					var selected = ui.item.text();
					
					$(this).hide();
					
					if(selected !== '-- empty --'){
                        showLoadingScreen();
                        
						self.oLorenz.storeDelete(self.jobManagementConfDir+'/'+selected)
							.done(function(){
								self.deleteConfiguration(selected);
                                
                                self.jobOptionsFeedback('Successfully deleted <strong>'+selected+'</strong>!');
							})
                            .always(hideLoadingScreen);
					}
				}
			});
            
            $("#deleteConfiguration").click(function(){
                $delete.toggle();
                
                $conf.hide();
                return false;
            });
		},
        
        jobOptionsFeedback: function(msg){
            var $f = $('#jobOptionsFeedback'),
                currentId = $f.data('fadeid');
            
            $f.empty().show().html(msg);
            
            if(currentId){
                clearTimeout(currentId);
            }
        
            var id = setTimeout(function(){
                $f.fadeOut('fast');
                
                $.removeData($f);
            }, 2800);
            
            $f.data('fadeid', id);
        },
		
		deleteConfiguration: function(name){
			this.formConfigurations.splice($.inArray(name, this.formConfigurations), 1);

			this.refreshConfigurationMenu('#deleteConfMenu');
			this.refreshConfigurationMenu('#configurationMenu');
		},
		
		loadConfiguration: function(conf){
			var configuration = JSON.parse(conf),
				self = this;
				
			//Need to first set the cluster, then get batch details for that cluster
			//Then populate the form fields.  
			this.createNewJob().done(function(){				
				$("#job_cluster").val(configuration['job_cluster']);	
				
				$.when(self.event_createNewJob_populateClusterDependencies()).done(function(r){
					if(r !== 0){
						for(var confName in configuration){
							var $input = $('#'+confName);
							
							if($input.attr('type') === 'checkbox'){
								$input.prop('checked', configuration[confName] === 1 ? true : false);
							}
							else{
								$('#'+confName).val(configuration[confName]);	
							}						
						}
						
						self.buildDependencyList();
						
						$('#job_dependencies').trigger("change");
					}
					else{
						self.warning({
							msg: "We couldn't load this configuration because the host (<strong>"+configuration['job_cluster']+"</strong>) wasn't found in your valid cluster list.  This can sometimes mean the cluster is temporarily down, has been retired, or moved to a new network.  Contact <a href='mailto:lorenz-info@your.site.here'>lorenz-info@your.site.here</a> if you have further questions.",
							location: 'cant load configuration'				  
						});
					}
				});
			});
		},
		
		buildNewJobDependencies: function(details, jobs, formCached, $form){
			var banks = details.banks,				
				partitions = details.partitions || {},
				defPartition = this.buildOpts(partitions, '#job_partition', formCached['job_partition'], 'pbatch').find('option:selected').val(),
				defBank = this.buildOpts(banks, '#job_bank', formCached['job_bank']).find('option:selected').val(),
				partitionDetails = partitions[defPartition] || {},
				$jobForm = $form || $("#newJobForm"),
				self = this;
			
			this.createNewJobs = jobs.jobs;
			
			this.batchDetails = details;
			
			self.buildDependencyList();
			
			$jobForm.find(':input').not('#job_depType').each(function(){
				self.toggleDisable($(this), false);
			});
			
			this.setWallClockLimit(partitionDetails,  formCached);
			
			this.setNodesAndTasks(partitionDetails);
			
			$('#job_launchDirectory').val(formCached['job_launchDirectory'] || details.homedir);
	
			this.buildOpts(partitionDetails.gres, '#job_gres', this.getGres(formCached['job_gres'], partitionDetails.gres));
			
			if(banks[defBank] !== undefined){
				this.buildOpts(banks[defBank].qos, '#job_qos', formCached['job_qos'], 'normal');
			}
			else{
				this.error({
					friendlyError: 'We have detected you don\'t have a bank account on the selected cluster.  This signifies a data error on the server.  Please contact the Lorenz team lorenz-info@your.site.here and copy/paste this message.  Thank you.',
					location: 'build new job dependencies'
				});
			}
		},
		
		getGres: function(cached, gres){
			if($.isArray(cached) && cached.length > 0){
				return cached;
			}
			else{
				if($.isArray(gres) && gres.length > 0){
					var index = -1,
						tmp = gres.slice(0);
						
					for(var i = 0, il = tmp.length; i < il; i++){
						if(tmp[i] === 'ignore'){
							index = i;
							break;
						}
					}
					
					if(index !== -1){
						tmp.splice(index, 1);
					}
					
					return tmp;
				}
				else{
					return '';
				}
			}
		},
		
		buildDependencyList: function(){
			var deps = [],
				jobs = this.createNewJobs,
				currentPartition = $("#job_partition").val(),
				batchDetails = this.batchDetails,
				currId = this.currentJobId,
				runsMoab = batchDetails.partitions[currentPartition].runsmoab;				

			for(var i = 0, il = jobs.length; i < il; i++){
				var currJob = jobs[i],					
					submitter = currJob.JobSubmitter;

				if(batchDetails.host === currJob.Host &&
				   currentPartition === currJob.Partition &&
				   (submitter === 'moab' && runsMoab === '1' || submitter === 'slurm' && runsMoab === '0')){
					
					// -1 means we're in the create new job page
					if(currId === -1){
						deps.push(currJob);
					}
					// non negative one means we're populating the edit params dialog dep list
					else if(currId !== currJob.JobId){
						deps.push(currJob);
					}
				}
			}
			
			return $.tmpl('dependencyList', {activeJobs: deps}).appendTo($('#depContainer').empty());			
		},
		
		setWallClockLimit: function(details, cache){
			var defaultTime = details.defaulttime,
				maxTime = details.maxtime || 'UNLIMITED',
				$job_days = $('#job_days'),
				$job_hours = $('#job_hours'),
				$job_minutes = $('#job_minutes');				
			
			if(cache && cache['job_days'] || cache['job_hours'] || cache['job_minutes']){
				$job_days.val(cache['job_days']);
				$job_hours.val(cache['job_hours']);
				$job_minutes.val(cache['job_minutes']);
			}
			else if(defaultTime && defaultTime !== 'NONE'){	
				var fullTime = this.parseWclTime(defaultTime),
					days = fullTime.days,
					hours = fullTime.hours,
					minutes = fullTime.minutes;		
			
				if(hours > 23){
					days += Math.floor(hours / 24);
					hours = hours % 24;		
				}
				
				if(minutes > 59){
					hours += Math.floor(minutes / 60);
					minutes = minutes % 60;
				}
				
				$job_days.val(days);
				$job_hours.val(hours);
				$job_minutes.val(minutes);				
			}
			
			$('#wclMaxTime').html(maxTime);
		},
		
		parseWclTime: function(time){
			var fullTime = time.split('-'),				
					days = fullTime[1] !== undefined ? +fullTime[0] : 0,
					hoursMinutes = fullTime[1] !== undefined ? fullTime[1].split(':') : fullTime[0].split(':'),
					hours = +hoursMinutes[0],
					minutes = +hoursMinutes[1];
					
			return {days: days, hours: hours, minutes: minutes};
		},
		
		setNodesAndTasks: function(details){		
			var	maxNodes = details.maxnodes || 'n/a',
				$nNodes = $("#job_nNodes"),
				$nTasks = $("#job_nTasks"),
				$totalNodes = $('#totalNodes').html(details.totalnodes || 'n/a'),
				$maxNodes = $('#maxNodes').html(maxNodes === 'UNLIMITED' ? details.totalnodes : maxNodes),
				$maxTasks = $('#maxTasks').html(details.cpuspernode),
				schedMode = details.schedmode;
			
			if(schedMode === 'node'){				
				this.toggleDisable($nTasks, true).val('');
			}
			else if(schedMode === 'processor'){	
				if(+maxNodes === 1){
					//disable
					this.toggleDisable($nNodes, true).val(1);
					
					$nTasks.val(1);
				}				
			}			
		},
			
		buildOpts: function(fields, container, defaultSelected, fallbackDefault){
			var opts = '',
				defOpts = defaultSelected,
				$container = $(container);
			
			if($.isArray(fields) === true){
				for(var i = 0, il = fields.length; i < il; i++){
					var o = fields[i];
					
					opts += '<option value="'+o+'">'+o+'</option>';
				}
			}
			else if($.isPlainObject(fields) === true){			
				for(var f in fields){
					//if no default was passed in, look for it in the data structure
					if(!defaultSelected && fields[f]['default'] === 1){
						defOpts = f;
					}
					
					opts += '<option value="'+f+'">'+f+'</option>';
				}
			}			
			
			$container.empty().append(opts);
	
			//If for whatever reason the user has passed in a default, and the list doesnt have it
			//because we can't anticipate what we'll get back... revert to some fallback default value
			if($.isArray(defOpts) && $container.find('option').filter(function(){ return $.inArray($(this).attr('value'), defOpts) !== -1 }).length > 0){
				return $container.val(defOpts);				
			}
			else if(!$.isArray(defOpts) && $container.has('option[value='+defOpts+']').length > 0){				
				return $container.val(defOpts);
			}
			else{				
				return $container.val(fallbackDefault);
			}			
		},
		
		buildEditParamsDefaults: function(){		
			var currentJobDetails = this.currentJobDetails,
				wclTime = this.parseWclTime(currentJobDetails.TimeLimit),
				detailToForm = {
					"Partition" : "job_partition",
					"Account" : "job_bank",
					"QOS" : "job_qos",
					"Dependency" : "job_dependencies",
					"NumNodes" : "job_nNodes",
					"NumCPUs" : "job_nTasks",
					"Name" : "job_name",
					"Reservation" : "job_reservation",
					"GRes": "job_gres"					
				},
				defaults = {};
			
			for(var key in currentJobDetails){
				if(detailToForm[key] && currentJobDetails[key] !== '(null)'){
					var value;
					
					if(key === 'GRes'){
						value = this.convertGresToArray(currentJobDetails[key]);
					}
					else{
						value = currentJobDetails[key];
					}
					
					defaults[detailToForm[key]] = value;
				}
			}
			
			defaults['job_days'] = wclTime.days;
			defaults['job_hours'] = wclTime.hours;
			defaults['job_minutes'] = wclTime.minutes;
			
			return defaults;
		},
		
		convertGresToArray: function(gres){
			var arr = gres.split(','),
				fsArr = [];
			
			for(var i = 0, il = arr.length; i < il; i++){
				var fs = arr[i].split(':');
				
				fsArr.push(fs[0]);
			}
			
			return fsArr;
		},
		
		submitScript: function(){			
			if(this.formIsReady){
				var jobInfo = this.buildJobInfo();			
				
				this.oLorenz.submitJob(jobInfo['job_cluster'], {data: jobInfo})
					.always(hideLoadingScreen)
					.done($.proxy(this, 'jobSubmissionSuccess'))
					.fail($.proxy(this, 'jobSubmissionFail'));
			}
			else{
				hideLoadingScreen();
			}				
		},
		
		jobSubmissionSuccess: function(r){
			this.warning({
				msg: "Your job has been submitted succesfully.  It will show up in the <a href='jobManagement.cgi?view=activeJobs'>active jobs panel</a> within a few seconds.<br/><br/>"+
				  "<table id='jobSuccessTable'>"+
				  "<tr><td width=65><b>JobId:<b></td> <td>"+r.JOBID+"</td></tr>"+
				  "<tr><td><b>Name:<b></td> <td>"+r.NAME+"</td></tr>"+
				  "<tr><td><b>Partition:<b></td> <td> "+r.PARTITION+"</td></tr>"+
				  "<tr><td><b>Time:<b></td> <td> "+r.TIME+"</td></tr>"+
				  "<tr><td><b>User:<b></td> <td> "+r.USER+"</td></tr>"+
				  "<tr><td><b>Cluster:<b></td> <td> "+r.lorenz_host+"</td></tr></table>",
				
				location: 'job submitted succesfully'				  
			});
		},
		
		jobSubmissionFail: function(e){
			this.error({
				friendlyError: 	"Job submission failed!  This is most commonly because the job submitter (moab/slurm) "+
								"took longer than expected and the server dropped the connection.  It's also very possible "+
								"the host you tried to submit your job on is down.  You can check the <a target='_blank' href='/dfs/www/cgi-bin/lccgi/customstatus.cgi'>cluster status "+
								"page</a> to be sure.  If the cluster is up, please try to submit your job again.  If it continues to fail, please "+
								"send lorenz tech support an error report.  Thank you and sorry for any inconvenience.",
				technicalError: e,
				location: 'job submission'
			});
		},
		
		buildJobInfo: function($form){
			var conf = {},
				$jobForm = $form || $("#newJobForm");
			
			$jobForm.find(":input").not(':disabled').each(function(index){
				var input = $(this),
					id = input.attr('id');
				
				//Dont need to save button inputs
				//uncomment this line if you want to NOT save script body
				//if(this.tagName.toUpperCase() !== 'BUTTON' && id !== 'jobscript'){
				if(this.tagName.toUpperCase() !== 'BUTTON'){	
					if(input.attr('type') === 'checkbox'){
						conf[id] = input.prop('checked') ? 1 : 0;
					}
					else{
						conf[id] = input.val();
					}					
				}
			});
			
			return conf;
		},
		
		validateForm: function($form){
			var self = this,
				$jobForm = $form || $("#createNewJobPane #newJobForm");
			
			self.formIsReady = true;
			
			self.validateDeferreds = [];
			
			if(self.validateRequired($jobForm)){
				$jobForm.find(':input').each(function(i, elem){
					self.validateInput($(elem));
				});				
			}
			
			return self.formIsReady;
		},
		
		validateRequired: function($jobForm){
			var self = this;
			
			$jobForm.find(".required").each(function(){
				var $input = $(this);
								
				$input.siblings('[errorType=missingRequired]').remove();
								
				if(!$input.is(":disabled") && !$input.val()){
					$input.parent('td').addClass('errorText');
					self.inputError($input, 'missingRequired', 'Missing required field');
				}
				else if(!$input.is(":disabled") && $input.val()){					
					$input.parent('td').removeClass('errorText');
				}
			});
			
			return self.formIsReady;
		},
		
		validateInput: function(input){
			var $input = $(input),
				id = $input.attr('id');
			
			$input.removeData("error");
        
			if(id === 'job_nNodes'){
				this.validateNodes($input);
			}
			else if(id === 'job_nTasks'){
				this.validateTasks($input);
			}
			else if(id === 'job_cluster'){
				this.validateCluster($input);
			}			
			else if(id === 'job_launchDirectory'){
				this.validateDirectory($input);
			}
			else if(id === 'job_name'){
				this.validateJobName($input);
			}
			else if(id == 'job_outputPath'){
				this.validateFilePath($input);
			}
			else if(id == 'job_errorPath'){
				this.validateFilePath($input);
			}
			else if(id === 'job_days' || id === 'job_hours' || id === 'job_minutes'){				
				this.validateWcl($input);
			}
			else if(id === 'job_reservation'){
				this.validateReservation($input);
			}	
		},
		
		validateReservation: function($input){
			var val = $input.val();
			
			$input.siblings('[errorType=invalidReservation]').remove();
			
			if(/\S/g.test(val)){
				//If its anything besides are allowed characters
				if(/[^\w_.\-\s\(\)\[\]\@]/.test(val)){
					this.inputError($input, 'invalidReservation', 'Only allowed characters A-Za-z0-9_.[]()@ and space');
				}
			}
		},
		
		validateWcl: function($input){
			var maxTime = $('#wclMaxTime').text() || 'UNLIMITED',				
				$days = $('#job_days'),
				$hours = $('#job_hours'),
				$minutes = $('#job_minutes'),
				total = 0;
			
			$input.siblings('[errorType=invalidWclTime]').remove();
			
			if(this.validateNumber($days, true) && this.validateNumber($hours, true) && this.validateNumber($minutes, true)){				
				if(maxTime !== 'UNLIMITED'){
					total = ($days.val()*24*60) + ($hours.val()*60) + (+$minutes.val());
					
					maxTime = this.parseWclTime(maxTime);
					
					maxTime = (maxTime.days*24*60) + (maxTime.hours*60) + (parseInt(maxTime.minutes));
					
					if(total > maxTime){
						this.inputError($input, 'invalidWclTime', 'You have entered a wall clock time greater than the max time');						
					}					
				}				
			}			
		},
		
		validateJobName: function($input){
			var val = $input.val();
			
			$input.siblings('[errorType=invalidName]').remove();
			
			if(/\S/g.test(val)){
				//If its anything besides are allowed characters
				if(/[^\w_.\-]/.test(val)){
					this.inputError($input, 'invalidName', 'Only alphanumeric, underscore, dash, and period characters allowed');
				}
			}
		},
		
		validateFilePath: function($input){
			var val = $input.val(),
				self = this,
				selectedCluster = $('#job_cluster').val();
				
			$input.siblings('[errorType=invalidFilePath]').remove();
			
			if(/\S/g.test(val)){
				if(val === '/'){
					self.inputError($input, 'invalidFilePath', 'A file path is required, this is a directory');
				}
				//Path must be absolute
				else if(!/^\//.test(val)){
					self.inputError($input, 'invalidFilePath', 'Path to file must be absolute');
				}
				else if(!/\w/g.test(val)){
					self.inputError($input, 'invalidFilePath', 'Invalid path specified');
				}
				else{
					if(selectedCluster !== self.unselectedCluster){
						var statPromise = self.oLorenz.getPathStat(selectedCluster, val);
						
						self.validateDeferreds.push(statPromise);
						
						statPromise.done(function(stat){
							$input.siblings('[errorType=invalidFilePath]').remove();							
							
							if(stat){
								if(stat.type === 'dir'){
									self.inputError($input, 'invalidFilePath', 'The path you specified is a directory, need a file path');
								}
								else if(stat.exists === 1 && stat.writeable === 0){				
									self.inputError($input, 'invalidFilePath', 'File not writeable by you');								
								}
							}						
						})
						.fail(function(){
							$input.siblings('[errorType=invalidFilePath]').remove();
							
							self.inputError($input, 'invalidFilePath', 'Validation failed.  Server side error.  Email lorenz-info@your.site.here with error.');
						});
					}
				}
			}
		},
		
		validateDirectory: function($input){
			var val = $input.val(),
				self = this,
				selectedCluster = $('#job_cluster').val();
			
			$input.siblings('[errorType=invalidPath]').remove();
			
			if(/\S/g.test(val)){
				if(val === '/'){
					self.inputError($input, 'invalidPath', 'Cannot specify root directory');
				}
				//Path must be absolute
				else if(!/^\//.test(val)){
					self.inputError($input, 'invalidPath', 'Path must be absolute');
				}
				else if(!/\w/g.test(val)){
					self.inputError($input, 'invalidPath', 'Invalid path specified');
				}
				else{
					if(selectedCluster !== self.unselectedCluster){
						var statPromise = self.oLorenz.getPathStat(selectedCluster, val);
						
						self.validateDeferreds.push(statPromise);
						
						statPromise.done(function(stat){
							$input.siblings('[errorType=invalidPath]').remove();							
							
							if(stat){						
								if(stat.exists === 0){
									self.inputError($input, 'invalidPath', 'Directory not found');
								}
								if(stat.exists === 1 && stat.type != 'dir'){
									self.inputError($input, 'invalidPath', 'The path you specified is not a directory');
								}
								else if(stat.exists === 1 && stat.writeable === 0){				
									self.inputError($input, 'invalidPath', 'Directory not writeable by you');								
								}
							}						
						})
						.fail(function(){
							$input.siblings('[errorType=invalidPath]').remove();
							
							self.inputError($input, 'invalidPath', 'Validation failed.  Server side error.  Email lorenz-info@your.site.here with error.');
						});
					}
				}
			}			
		},
		
		validateCluster: function($input){
			var val = $input.val();
			
			$input.siblings('[errorType=noClusterSelected], .siml-fail').remove();
			
			if(val === this.unselectedCluster){
				this.inputError($input, 'noClusterSelected', 'You must select a cluster');				
			}			
		},
		
		validateTasks: function($input){
			if(this.validateNumber($input)){
				var total = $('#maxTasks').text(),
					val = $input.val();				
				
				$input.siblings('[errorType=tasksBeyondMax]').remove();
				
				if(!isNaN(total) && +val > +total){
					this.inputError($input, 'tasksBeyondMax', 'Must be less than max tasks');					
				}				
			}			
		},
		
		validateNodes: function($input){
			if(this.validateNumber($input)){
				var total = $('#maxNodes').text(),
					val = $input.val();				
				
				$input.siblings('[errorType=nodesBeyondMax]').remove();
				
				if(!isNaN(total) && +val > +total){
					this.inputError($input, 'nodesBeyondMax', 'Must be less than max nodes');					
				}			
			}		
		},
		
		validateNumber: function($input, allowZero){
			var val = $input.val();		
			
			$input.siblings('[errorType=numError]').remove();
			
			//Need to check for existence of non white space, means theres SOMETHING in the input
			if(/\S/g.test(val)){			
				val = val.replace(/\s/g, '');	
				var isNotANum = isNaN(val);
				
				if(isNotANum){
					this.inputError($input, 'numError', 'Not a valid number');
					return false;
				}
				else if(!isNotANum && (!allowZero && parseInt(val) === 0) || parseInt(val) < 0){
					this.inputError($input, 'numError', 'Number must be integer greater than 0');
					return false;
				}
				else{					
					$input.val(parseInt(val));
					return true;
				}
			}
			else{
				return true;
			}
		},
		
		inputError: function($input, type, msg){
			this.formIsReady = false;
			
			$input							
				.parent('td')				
				.append("<div class = 'inputDescText errorText siml-fail' errorType="+type+">("+msg+")</div>");			
		},
		
		quickSubmit: function(){
			var self = this,
				$elem = self.$elem,
				$quickSubmit;
			
			$elem.trigger("interfaceChange", [{newInterface: 'quickSubmit'}]);
			
			$.when(self.oLorenz.getClusters()).done(function(clusters){				
				$.tmpl('quickSubmit', {
					id: 'fileLoadPane',
					title: 'Quick Submit Existing Script'									
				})
				.appendTo($elem);
				
				self.quickSubmitPane = $('#fileLoadPane');	
				
				$("#loadScript").button();
				
				$quickSubmit = $("#quickSubmitScript");
				
				$quickSubmit[0].focus();
				
				//Initializes the tree
				self.toggleFileTree('#fileTree', {
					hostList: clusters.accounts,
					host: clusters.accounts[0],
					fileSelected: function(e, file){
						$quickSubmit.val(file);
					}
				});				
			})
			.always($.proxy(self, 'interfaceDone'));
		},
		
		getJumpToList: function(scratch){
			var userId = this.userId,
				opts = [];
				
			for(var i = 0, il = scratch.length; i < il; i++){
				opts.push({value: scratch[i]+'/'+userId, text: scratch[i]+'/'+userId});
			}
			
			return opts;
		},
		
		getDataForRow: function(row){
			if(row){
				var pos = this.jobTable.fnGetPosition(row);
				
				if(pos >= 0){
					return this.jobTable.fnGetData(pos);
				}
				else{
					return -1;
				}
			}
			else{
				return -1;
			}
		},
		
		getDataForRowClass: function(rowClass, col){			
			var data = this.getDataForRow(this.getRowForClass(rowClass)[0]);
			
			return data[col];
		},
		
		getSelectedRow: function(){
			return this.jobTable.find("tr."+this.rowSelectedClass);
		},
		
		getRowForClass: function(rowClass){
			return this.jobTable.find("tr."+rowClass);
		},
		
		mainToolbar: function(){
			$.tmpl('mainToolbar', {
				loraUser: this.oLorenz.loraUser
			})
			.appendTo(this.$elem);
			
			//$("#userViewButtons").buttonset();
		},
		
		interfaceDone: function(){
			this.$elem.trigger("interfaceDone");
		},
		
		destroyInterface: function(){
			var currentInterface = this.currentInterface;
			
			if(currentInterface){
				if(currentInterface === 'activeJobs'){
					this.destroyActiveJobs();
				}
				else if(currentInterface === 'createNewJob'){
					this.destroyCreateNewJob();
				}
				else if(currentInterface === 'quickSubmit'){
					this.destroyQuickSubmit();
				}
				else if(currentInterface === 'completedJobs'){
					this.destroyCompletedJobs();
				}			
			}
		},
		
		destroyCreateNewJob: function(){
			this.showHidden = 0;
			
			this.$dialog.dialog('close').empty(); 
			
			if(this.createNewJobPane.remove){
				this.createNewJobPane.remove();
			}
		},		
		
		destroyCompletedJobs: function(){
			if(this.completedJobsPane.remove){
				$(".DTTT_collection").remove();
				
				this.completedJobTable.fnDestroy();
				
				this.completedJobTable = {};
				
				$(window).unbind("resize.completedJobTable");
				
				this.completedJobsPane.remove();
			}
		},
		
		destroyQuickSubmit: function(){
			if(this.quickSubmitPane.remove){
				this.quickSubmitPane.remove();
			}
		},
		
		destroyActiveJobs: function(){
			this.currentJobId = -1; //Reset as this is a fresh entrance into job details
			
			this.preJobId = -1;
			
			this.abortXhrCheck();
			
			this.currentJobHost = '';
			
			this.currentJobName = '';
			
			this.selectedRowJobId = this.getDataForRowClass(this.rowSelectedClass, 1);
			
			$(".DTTT_collection").remove();
			
			this.jobTable.fnDestroy();
			
			this.jobTable = {};
			
			$(window).unbind("resize.jobTable");
			
			this.$dialog.dialog('close').empty();
			
			this.$cancelAll.button('destroy').unbind('click');
			
			this.$holdAll.button('destroy').unbind('click');
			
			this.$masterButton.button('destroy').unbind('click');
			
			if(this.remainingTimeInterval !== -1){
				clearInterval(this.remainingTimeInterval);
			}
			
			if(this.refreshInterval !== -1){
				clearInterval(this.refreshInterval);
			}
			
			if(this.staleDataInterval !== -1){
				clearInterval(this.staleDataInterval);
				
				this.staleDataInterval = -1;
			}
	
			this.activeJobsPane.remove();
		},
		
		getTemplates: function(){
			var self = this;
			
			return  $.ajax({url: this.options.tmplUrl})
                        .success(function(tmpl){
                            $('body').append(tmpl);
                            
                            //cache all templates                                        
                            $("#tmpl-contentBox").template('contentBox');					
                            $("#tmpl-mainToolbar").template('mainToolbar');					
                            $("#tmpl-jobDetails").template('jobDetails');					
                            $("#tmpl-activeJobs").template('activeJobs');
                            $("#tmpl-jobFields").template('jobFields');
                            $("#tmpl-jobTable").template('jobTable');
                            $("#tmpl-quickSubmitScript").template('quickSubmit');
							$("#tmpl-completedJobs").template('completedJobs');							
							$("#tmpl-completedJobDetails").template('completedJobDetails');
							$("#tmpl-dependencyList").template('dependencyList');
							$("#tmpl-createNewJob").template('createNewJob');
							$("#tmpl-saveConfigurationDialog").template('saveConfigurationDialog');
							$("#tmpl-loadExistingDialog").template('loadExistingDialog');
							$("#tmpl-editJobParamsDialog").template('editJobParams');
							$("#tmpl-examineDialog").template('examineDialog');
							//$("#tmpl-statDialog").template('statDialog');
							$("#tmpl-launchDirBrowser").template('launchDirBrowser');									
                        });
		},
		
		error: function(err){
			this.$dialog.prompt('error', err);
		},		
		
		warning: function(warning){
			this.$dialog.prompt('warning', warning);
		}
	};
	
	// Start a plugin
    $.fn.jobManager = function(options) {
      // Don't act on absent elements -via Paul Irish's advice
        if (this.length) {
            return this.each(function(){
                // Create a new portlet
                var jobManager = Object.create(JobManager);
                
                //Initialize our object
                jobManager.init(this, options);                
        
                // Save the reference to the JobManager in the elem's data object
                $(this).data('jobManagement', jobManager);
            });
        }
    }; 
})(jQuery);
