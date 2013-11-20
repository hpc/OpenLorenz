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
    $.widget("lorenz.jobs", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'my jobs',
			userPortlet: 1,
			dataTimestamp: 1,
            mySettings: {
                displayLength: 10
            }
        },
                
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getJobs() ];
        },
		
		refreshRate: 60,
		
		oTable: {},
        
		_state: {
			selectedRowId: -1,
			currentPage: -1
		},
		
		_colVisArr: -1,
		
		_saveState: function(){
			var self = this,
				$coll = $("div.ColVis_collection");
			
			this._state.selectedRowId = this.$wrapper.find('.portlet-clickableTable tr.ui-state-highlight td:eq(0)').text();
			
			this._state.currentPage = this.oTable.fnPagingInfo().iPage;
			
			if($coll.length > 0){
				this._colVisArr = [];
				
				$coll.find("input:checkbox").each(function(index){
					if(!$(this).is(':checked')){
						self._colVisArr.push(index+1);
					}
				})
			}			
		},
		
		_restoreState: function(){
			var state = this._state,
				selected = state.selectedRowId;
			
			this.oTable.fnPageChange(state.currentPage);
			
			if(selected){
				this.$wrapper.find('.portlet-clickableTable tr td:first-child')
					.each(function(){
						var $td = $(this);
						
						if($td.text() === selected){
							$td.parent('tr').click();
							
							return false;
						}
					})
			}
		},
		
        render: function(response) {
			this._destroyTable();
			
			var $table = this._buildTableMarkup(response.jobs),
				desc = this._buildHeaderDesc(),
				$buttonSet = this._buildJobButtons();
			
            this.$wrapper.append(desc, $table, $buttonSet);
            
            this._initTable($table);
			
			this._toggleButtons('disable');
        },
		
		_destroyTable: function(){
			//this is necessary as the colvis plugin does not clean up its collections when the table
			//is destroyed
			$(".ColVis_collection").remove();
		},
		
		_buildJobButtons: function(){
			var $set = $('<span id="portlet-jobButtonSet" class="portlet-buttonSet"></span>');
			
			//Only allow cancel if looking at my jobs
			if(!this._inUserView()){
				$set.append(this._buildCancel());
			}
			
			return $set.append(this._buildDetails());
		},
		
		_buildCancel: function(){
			return $("<button style='margin-right: 5px;' id='portlet-jobCancel'>cancel job</button>").button()
					.click($.proxy(this, '_jobCancelClick'));
		},
		
		_buildDetails: function(){
			return $("<button id='portlet-getJobDetails'>get job details</button>").button()
					.click($.proxy(this, '_jobDetailsClick'));
		},
		
		_jobCancelClick: function(e){
			var obj = this,
				job = this._getSelectedJob();
			
			this.$wrapper.find('#portlet-jobWarning').remove();
			
			if(job !== -1){
				this._toggleDialog({
					modal: true,
					resizable: false,
					draggable: false,
					width: 330,
					title: 'Job cancel confirmation',
					buttons: {
						ok: function(){
							showLoadingScreen();
							
							obj.oLorenz.cancelJob(job[3], job[0])
								.done($.proxy(obj, '_jobCanceledDone'))
								.fail(function(e){
									obj._error({
										technicalError: e,
										friendlyError: 'There was an error trying to cancel this job.  It\'s possible the job completed or was cancelled by another source.  Often the job table is using a cached version of your jobs and is not in sync with the real time status of the queue.  Please try refreshing the portlet using the icon in the top right corner and try to cancel again. If the problem persists send an error report via the link below.',
										location: 'cancel job host: '+job[3]+', jobid: '+job[0]						
									});
								})
								.always(hideLoadingScreen);
								
							$(this).dialog('close');	
						},
						cancel: function(){
							$(this).dialog('close');
						}
					}
				}, 'Are you sure you want to cancel this job? This action is permanent.<br/>\
						<table width="100%" class="portlet-table"><tr><td width=75 class="portlet-bold">Name: </td><td>'+job[1]+'</td></tr>\
						<tr><td class="portlet-bold">Job Id: </td><td>'+job[0]+'</td></tr>\
						<tr><td class="portlet-bold">Host: </td><td>'+job[3]+'</td></tr>'
				);
			}
			else{
				this._doSelectedJobWarning();
			}
		},
		
		_jobCanceledDone: function(){			
			this._removeJobFromTable();
			
			this._toggleButtons('disable');			
		},
		
		_removeJobFromTable: function(){
			var self = this,				
				$row = this.$wrapper.find('table.portlet-clickableTable tr.portlet-selectedJob').addClass('portlet-canceledJobRow'),
				$columns = $row.find('td'),
				animCount = 0,
				total = $columns.length;
			
			if($row.length > 0 && total > 1){
				$row.removeClass('ui-state-highlight');
				
				$columns.animate({ opacity: 0 }, 1000, function(){
					animCount++;
					
					//Need to know when we're on the last animation completing for all the td's
					if(animCount === total){
						self.oTable.fnDeleteRow($row[0]);
					}			
				});
			}
		},
		
		_jobDetailsClick: function(e){
			var job = this._getSelectedJob();
			
			this.$wrapper.find('#portlet-jobWarning').remove();
			
			if(job !== -1){
				showLoadingScreen();
				
				this.oLorenz.getJobDetails(job[3], job[0])
					.done($.proxy(this, '_jobDetailsDone'))
					.fail(function(e){
						obj._error({
							technicalError: e,
							friendlyError: 'There was an error trying to get details for this job.  It\'s possible the host the job was on is currently down.  Check the machine status portlet.  Otherwise, please try refreshing the page and try your operation again.  If the problem persists send an error report via the link below.',
							location: 'get job details'						
						});
					})
					.always(hideLoadingScreen);
			}
			else{
				this._doSelectedJobWarning();
			}
		},
		
		_doSelectedJobWarning: function(){
			var $set = this.$wrapper.find("#portlet-jobButtonSet"),
				$err = $('<span id="portlet-jobWarning" style="display:block; width: 100%; text-align: center; margin-top: 5px; font-weight: bold;">Your selected job was not found in the table.</span>');
			
			$set.after($err);
			
			setTimeout(function(){
				if($err.length){
					$err.fadeOut('slow');
				}
			}, 2000);
		},
		
		_jobDetailsDone: function(details){
			var table = '<table width=100%>';
			
			delete details['operationsSupported'];

			for(var field in details){
				table += '<tr><td class="portlet-bold">'+field+': </td><td>'+details[field]+'</td></tr>';
			}
			
			table += '</table>';
			
			this._toggleDialog({
				title: 'Job details for JobID: '+details.JobId,
				height: 500,
				width: 500
			},
			table);
		},
		
		_getSelectedJob: function(){
			var row = this.$wrapper.find('table.portlet-clickableTable tr.portlet-selectedJob')[0],
				oTable = this.oTable,
				pos = -1;
			
			if(row){
				pos = oTable.fnGetPosition(row);	
			}			
				
			if(pos >= 0){
				return oTable.fnGetData(pos);
			}
			else{
				return -1;
			}
		},
		
		_toggleButtons: function(state){
			var $wrapper = this.$wrapper,
				$cancel = $wrapper.find('#portlet-jobCancel'),
				$details = $wrapper.find('#portlet-getJobDetails'),
				$set = $wrapper.find("#portlet-jobButtonSet"),
				toggle = state === 'enable' ? false : true;
				
			$cancel.button("option", "disabled", toggle);
			$details.button("option", "disabled", toggle);
			
			if(state === 'enable'){
				$set.removeClass('ui-state-disabled');
			}
			else{
				$set.addClass('ui-state-disabled');
			}
		},
		
		_buildHeaderDesc: function(){
			return 'Click any job in the table to view details or perform actions.<hr width=100%/>';
		},
		
		_buildTableMarkup: function(jobs){
			var $table = $('<table class="display portlet-clickableTable" width = "100%"><thead></thead><tbody></tbody></table>'),
				rows = '',
				thead = '<tr>'+
							'<th>Job ID</th>'+
							'<th>Name</th>'+
							'<th>State</th>'+
							'<th>Host</th>'+
							
							'<th>EndTime</th>'+
							'<th>Dependency</th>'+
							'<th>JobScheduler</th>'+
							'<th>JobSubmitter</th>'+
							'<th>NumNodes</th>'+
							'<th>Partition</th>'+
							'<th>Reason</th>'+
							'<th>TimeLimit</th>'+
						'</tr>';
			
			$table.find('thead').append(thead);
        
            for(var i = 0, il = jobs.length; i < il; i++){
                var job = jobs[i];
                
                rows += '<tr title="'+(job.EndTime ? 'EndTime: '+job.EndTime : '')+'">'+
							'<td>'+job.JobId+'</td>'+
							'<td>'+job.Name+'</td>'+
							'<td>'+job.JobState+'</td>'+
							'<td>'+job.Host+'</td>'+
							
							'<td>'+job.EndTime+'</td>'+
							'<td>'+job.Dependency+'</td>'+
							'<td>'+job.JobScheduler+'</td>'+
							'<td>'+job.JobSubmitter+'</td>'+
							'<td>'+job.NumNodes+'</td>'+
							'<td>'+job.Partition+'</td>'+
							'<td>'+job.Reason+'</td>'+
							'<td>'+job.TimeLimit+'</td>'+
						'</tr>'

            }
            
            $table.find('tbody').append(rows);
			
			return $table;
		},
		
		_initTable: function($table){
			var self = this,
				settings = this.options.mySettings,
				aTargets = self._colVisArr !== -1 ? self._colVisArr : [ 4,5,6,7,8,9,10,11 ],
				dOpts = {
					"iDisplayLength": settings.displayLength || 10,
					"bJQueryUI": true,
					"sPaginationType": "full_numbers",
					"sScrollX": "100%",
					"bScrollCollapse": true,
					"oLanguage": {
						"sEmptyTable": 'You have no jobs.'
					},
					"bStateSave": true,
					"fnStateSave": function (oSettings, oData) {
                        if(self._hasStorage){
                            localStorage.setItem( 'DataTables_'+window.location.pathname, JSON.stringify(oData) );
                        }
					},
					"fnStateLoad": function (oSettings) {
                        if(self._hasStorage){
    						var data = localStorage.getItem('DataTables_'+window.location.pathname);
                            return JSON.parse(data);
                        }
					},
					"asStripeClasses": [ 'ui-widget-content', ''],
					"aaSorting": [[3,'asc'], [0,'asc']],     
					"aLengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
					"sDom": 'C<"clear"><"H"lfr>t<"F"ip>',
					"oColVis": {
						"buttonText": "Show/Hide Columns",
						"bRestore": true,
						"sRestore": 'Restore to Initial',
						"sSize": "css",
						"aiExclude": [0],
						"iOverlayFade": 0,
						"fnStateChange": function(){
							self.oTable.fnAdjustColumnSizing();
						}
					},
					"aoColumnDefs": [
                        { "bVisible": false, "aTargets": aTargets }
                    ] 
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
									"sTitle": "My Jobs",
									"sFileName": "MyLC Jobs Export.csv"
								},
								{
									"sExtends": "xls",
									"sTitle": "My Jobs",
									"sFileName": "MyLC Jobs Export.xls"
								},
								{
									"sExtends": "pdf",
									"sTitle": "My Jobs",
									"sFileName": "MyLC Jobs Export.pdf"
								}]
							}
						]
					}
				};

			$(document).on('click', '.ColVis_Restore', function(){
				//Bit of a hack... ColVis plugin doesn't auto resize columns after turning on/off
				//Cols... and the restore to default button doesnt tirgger the fnStateChange event
				//So I bind my own event here to do it
				self.oTable.fnAdjustColumnSizing();
			});
			
			if(self._hasFlash()){
				$.extend(dOpts, exportOpts);
			}
			
			this.oTable = $table.dataTable(dOpts);
			
			$("div.DTTT_container").find('button').addClass("ui-corner-all");
			
			$("div.ColVis").find('button').hover(function(){$(this).toggleClass('ui-state-hover')}).addClass("ui-corner-all");
			
			var timeoutId = -1;
			
			$(window).bind('resize', function(e){
				//Turns out elements that are jquery UI's "resizable", bubble up a resize event
				//to the window, and it was triggering this code... so now we do a check to see
				//if it's a DOM element where the event orginated, cause if it was an actual window
				//resize, instance of "Window" is just a plain object and then re-render
				if(self._isNotElementNode(e.target)){
					clearTimeout(timeoutId);
					
					//bit of a datatables bug fix... the columns have a static width
					//when you specify sScrollX.. so if it resizes, lets adjust col widths
					timeoutId = setTimeout(function(){
						self.oTable.fnAdjustColumnSizing();
					}, 500);
				}
			});
			
			this._attachClickListener($table);
		},
		
		_attachClickListener: function($table){
			var oTable = this.oTable,
				obj = this;
			
			$table.delegate('tr', 'click', function(event){
				if(oTable.fnSettings().fnRecordsTotal() > 0){
					var $selected = $(this);
					
					if($selected.hasClass('portlet-selectedJob')){
						obj._toggleButtons('disable');
						
						$selected.removeClass('portlet-selectedJob ui-state-highlight');
					}
					else{
						$(oTable.fnSettings().aoData).each(function (){
							$(this.nTr).removeClass('portlet-selectedJob ui-state-highlight');
						});
						
						obj._toggleButtons('enable');
						
						obj.$wrapper.find('#portlet-jobWarning').remove();
						
						$selected.addClass('portlet-selectedJob ui-state-highlight');
					}					
				}
			});
		},
		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {};
					
			return {
				displayLength: $('<span>Default table rows: <select name = "displayLength"><option value = "-1">All</option><option value = "10">10</option><option value = "25">25</option><option value = "50">50</option><option value = "100">100</option></select></span>').find('option[value='+typeSpecificSettings.displayLength+']').attr('selected', 'selected').end()
			};
		}
    });
}(jQuery));
