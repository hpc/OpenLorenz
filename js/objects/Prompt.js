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
    $.widget("lorenzUtils.prompt",{
        // These options will be used as defaults
        options: { 
            title: 'Global Prompt',
            autoOpen: false,
            height: 'auto',        
            ok: function(){}
        },
        
        oLorenz: {},
        
        $dialog: {},
    
        // Set up the widget
         _create: function(){
            this.$dialog = $(this.element)						
                .appendTo('body')
                .dialog(this.options);
                
            this.oLorenz = Object.create(Lorenz);
        },
        
        info: function(userOpts, content){
            this.clearClasses();
            
            this.element.addClass('prompt-info');
            
            this.togglePrompt(userOpts, content);
        },
        
        _encodeHtml: function(h){
            h = h.replace(/</g, '&lt;')
            h = h.replace(/>/g, '&gt;')
            
            return h;
        },
        
        error: function(err){
            var self = this,
                technicalError = this.getTechnicalError(err.technicalError),
                friendlyError = err.friendlyError,
                loc = err.location,
                $error = '',
                $reportError = '';
            
            this.clearClasses();
            
            this.element.addClass('prompt-error');
            
            var errOpts = {
                title: "<div class='ui-state-error' style='display: inline-block; margin-right: 10px;'><span class='ui-icon ui-icon-alert'></span></div>Error in: "+loc,
                width: '500',
                modal: true,
                buttons: {
                    Ok: function() {
                        $(this).dialog("close");
                        
                        if(typeof err.ok === 'function'){
                            err.ok();
                        }
                    }
                }
            };
    
            if(err.quietError === undefined || !err.quietError){
                this.sendAdminErrorReport(technicalError, loc, err);
                
                $error = this.buildErrorContent(technicalError);
                
                $reportError = this.buildReportLink(err);
            }
            
            this.togglePrompt(errOpts, [friendlyError, $reportError, $error]);
            
            this.buildLorenzTechLink();
        },
        
        sendAdminErrorReport: function(technicalError, loc, err){
            if(typeof err === 'object'){
                //We dont want to report an error of readyState == 0 and statusText == 'error'... this
                //signifies that an ajax request was made but it was cut off mid stream... this is caused
                //by closing the browser window or navigating to a new page.  We do however want to report
                //errors that have statusText == 'timeout'... which could possibly be a client timeout we have set
                if(err.readyState === 0 && err.statusText !== 'error' && !/getAllResponseHeaders/g.test(err.statusText)){
                    this.oLorenz.reportError((technicalError || JSON.stringify(err)), loc, {data: {admin: 1}});
                }
                else if(err.readyState !== 0){
                    this.oLorenz.reportError((technicalError || JSON.stringify(err)), loc, {data: {admin: 1}});
                }
            }
            else{
                this.oLorenz.reportError((technicalError || JSON.stringify(err)), loc, {data: {admin: 1}});
            }
        },
        
        buildErrorContent: function(technicalError){
            if(technicalError){
                return $('<div id="lorenz-errorDialogContent"><br/><a id="showDetails-error" href="javascript:void(0)">Show Details</a><div style="display:none" id="lorenz-tech-error"></div>')
                        .find('#showDetails-error')
                        .click(function(){
                            $(this).next('#lorenz-tech-error').toggle();
                        })
                        .end()
                        .find('#lorenz-tech-error')
                        .append(technicalError)
                        .end();
            }
            else{
                return '';
            }
        },
        
        buildLorenzTechLink: function(){
            this.$dialog
                .dialog("widget")
                .find('.ui-dialog-buttonpane')
                .append(this.buildLink());
        },
        
        buildLink: function(){
            return '<div class="lorenzTechLink">Lorenz Tech Support: <a href="mailto:lorenz-info@llnl.gov">lorenz-info@llnl.gov</a></div>';
        },
        
        buildReportLink: function(err){
            var self = this;
            
            return $('<div style="margin-top: 15px"></div>').append($('<a id="errorReportLink" href="javascript:void(0)">Send Error Report</a>')
                        .bind('click.sendReport', function(){
                            var $link = $(this),
                                error = self.getTechnicalError(err.technicalError) || 'Technical error was undefined.  Friendly Error: '+err.friendlyError;
                            
                            showLoadingScreen();
                            
                            self.oLorenz.reportError(error, err.location)
                                .done(function(){
                                    $link.unbind('click.sendReport');
                                    
                                    $link.bind('click.noMore', function(){
                                        alert("You've already reported this error.  We appreciate your enthusiasm, but I assure you we've received your error report and will be addressing it as soon as possible :).");
                                    });
                                    
                                    alert('Error report successfully sent!  We appreciate you taking the time to notify us of any issues with Lorenz.  A member of the Lorenz team should contact you shortly.');
                                })
                                .fail(function(){
                                    alert('Failed to report error!  Please email lorenz-info@llnl.gov directly.  Thank you.');
                                })
                                .always(hideLoadingScreen);                            
                        }));
        },
        
        getTechnicalError: function(technicalError){            
            if(typeof technicalError === 'object'){                
                if(technicalError.responseText){                    
                    return this._encodeHtml(technicalError.responseText);
                }				
                else{                    
                    return this._encodeHtml(JSON.stringify(technicalError));
                }
            }
            else{				
                return this._encodeHtml(technicalError);
            }
        },
        
        warning: function(warning){
            this.clearClasses();
            
            this.element.addClass('prompt-warning');
            
            this.togglePrompt({
                    title: "<div class='ui-state-highlight' style='display: inline-block; margin-right: 10px;'><span class='ui-icon ui-icon-notice'></span></div>Notice: "+warning.location,
                    width: '500',
                    modal: true,
                    buttons: {
                        Ok: function() {
                            $(this).dialog("close");
                            
                            if(typeof warning.ok === 'function'){								
                                warning.ok();
                            }
                        }
                    }
                },
                warning.msg
            );
        },
         
        togglePrompt: function(userOpts, content){
            var $dialog = this.$dialog,
                defaultOpts = this.options;
            
            $dialog.dialog('close').dialog('destroy').empty();           
            
            var opts = $.extend({}, defaultOpts, userOpts);
            
            this.setContent(content);
            
            $dialog.dialog(opts).dialog('open');  
        },
        
        setContent: function(content){
            var $dialog = this.$dialog;
            
            if($.isArray(content)){
                $dialog.append.apply($dialog, content);
            }
            else{            
                $dialog.append(content);            
            }
        },
    
        // Use the _setOption method to respond to changes to options
        _setOption: function(key, value){
            this._superApply(arguments);
        },
        
        clearClasses: function(){
            this.element
                .removeClass('prompt-info')
                .removeClass('prompt-warning')
                .removeClass('prompt-error');
        },
        
        // Use the destroy method to clean up any modifications your widget has made to the DOM 
        _destroy: function() {
            this.clearClasses();
        }
    });
})(jQuery);
 
