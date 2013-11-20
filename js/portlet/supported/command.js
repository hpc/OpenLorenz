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
    $.widget("lorenz.command", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'run a command',
            mySettings: {
                defaultHost: 'oslic',
                defaultCommand: 'top -b -n 1',
				cmdTimeout: 60
            }
        },
                
        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getSSHhosts({xhrCache: 'sshHostCache'}) ];
        },
        
        $runButton: {},
        
        render: function(response) {            
            var obj = this,
                settings = obj.options.mySettings,
                accounts = response.accounts;
			$.tmpl(obj._tmpl, {				
				defaultCommand: settings.defaultCommand || ''
			})
			.appendTo(obj.$wrapper);

			obj._buildHostSelect(accounts);
           
			obj._buildRunButton();

			obj._initEnterKeyListener();
	
			if(accounts === undefined || !$.isArray(accounts) || ($.isArray(accounts) && accounts.length === 0)){
				obj.$runButton.attr('disabled', true).addClass('ui-state-disabled');
				
				obj.$wrapper.append('<div style="margin-top: 10px"><strong>Notice:</strong> We have detected you don\'t have any LC hosts you can SSH to.  You will not be able to run a command until you have at least one valid account with SSH access.</div>');
			}
        },
        
        _buildRunButton: function(){
            var obj = this,
				$wrapper = this.$wrapper,
				$runButton = $wrapper.find('#runCommand_runButton'),
				$select = $wrapper.find('#runCommand_select'),
				$commandInput = $wrapper.find('#portlet-runCommandInput');
            
            this.$runButton = $runButton.button()
                .click(function(){
					$runButton.prop('disabled', true);
            
					if($commandInput.val()){
						showLoadingScreen();
						
						obj.oLorenz.execCommand($select.val(), {data: {timeout: obj.options.mySettings.cmdTimeout, command: $commandInput.val()}, context: obj})
						.done(obj._buildCommand)
						.fail(function(e){					
							if(/command not found/g.test(e)){
								obj._error({
									technicalError: e,
									friendlyError: 'Failed running command. The command you specified was not found.  Output:<br/><br/><pre>'+e+'</pre>',
									location: 'invalid command',
									quietError: true
								});
							}
							else{						
								obj._error({
									technicalError: e,
									friendlyError: 'It appears as if there was an error running your remote command.  It\'s possible the server you tried running it on is down or the command you tried to run failed.  You can try a different host or a simple command like "ls".  If it still fails please send an error report.  Thank you.',
									location: 'command'
								});
							}
							
							$runButton.attr('disabled', false);
						})
						.always(hideLoadingScreen);
					}
				});			
        },
        
        _initEnterKeyListener: function(){
            var obj = this,
				$runButton = this.$wrapper.find('#runCommand_runButton');
            
            obj.$wrapper.delegate('#portlet-runCommandInput', 'keyup', function(e){
				if(e.keyCode === 13){					
					$runButton.trigger('click');
				}
			});
        },
        
        _buildHostSelect: function(accounts){
            var $select = this.$wrapper.find('#runCommand_select');
            
            for(var i = 0, il = accounts.length; i < il; i++){
                var acc = accounts[i];
                
                var option = '<option value = "'+acc+'">'+acc+'</option>';
                
                $select.append(option);
            }
            
            $select.find('option[value^='+this.options.mySettings.defaultHost+']').attr('selected', 'selected');
			
			return $select;
        },
        
        _buildCommand: function(response){
            this.$runButton.attr('disabled', false).button('refresh');
            
            this._doCommandDialog('', response, '');
        },
		
		_settingToTmpl: function(){
			var typeSpecificSettings = this.options.mySettings || {},
				accounts = this.currentDataSet ? this.currentDataSet.accounts || [] : [],
				options = '';
				
			for(var i = 0, il = accounts.length; i < il; i++){
				var acc = accounts[i];
				
				options += '<option value = "'+acc+'">'+acc+'</option>';
			}
			
			var $select = $('<select name = "defaultHost"></select>').append(options).find('option[value^='+typeSpecificSettings.defaultHost+']').attr('selected', true).end();
			
			return {
				defaultHost: $('<span>Default host: </span>').append($select),
				defaultCommand: 'Default command: <input type = "text" name = "defaultCommand" size = "20" value = "'+typeSpecificSettings.defaultCommand+'"/>',
				cmdTimeout: 'Command timeout (s): <input type = "text" name = "cmdTimeout" size = "3" value = "'+typeSpecificSettings.cmdTimeout+'"/>'
			};
		},
		
		_tmpl: '\
			<span class="descText">Type a command and click run.  The output will appear in a dialog box.  Please <strong>DO NOT</strong> run commands that are interactive.</span><hr width="100%">\
			<span>Host: </span><select id="runCommand_select"></select><br/>\
			<table width="100%">\
				<tbody>\
					<tr>\
						<td style="padding-right: 15px;">\
							<input type="text" id="portlet-runCommandInput" size="" value="${defaultCommand}" style="width: 100%;">\
						</td>\
						<td style="width: 50px; text-align: right;">\
							<button id="runCommand_runButton">run</button>\
						</td>\
					</tr>\
				</tbody>\
			</table>\
		'
    });
}(jQuery));
