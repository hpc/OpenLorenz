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
    $.widget('lorenzUtils.notification', {
        options: {
            framework: 'ui',
            open: false,
            duration: 0
        },
        
        $tmpl: '',
        
        _create: function(){
            var options = this.options;
            
            this.$tmpl = $(this.tmpl[options.framework]);
            
            this.element
                .addClass('lorenz-notification-'+options.framework)
                .append(this.$tmpl)
                .toggle(options.open);
        },
        
        hideId: -1,
        
        show: function(message, type){
            var self = this,
                eventType = type || 'info',
                options = this.options;
            
            this.element
                    .children(':first')
                    .removeClass()
                    .addClass(this.classes[options.framework][eventType])
                        .find('.notification-body')
                        .html(message)  
                    .end()
                .end()
                .show();
                
            if(options.duration > 0){
                clearTimeout(this.hideId);
                
                this.hideId = setTimeout(function(){
                    self.hide();
                }, options.duration);
            }
        },
        
        hide: function(){
            this.element.fadeOut();
        },
        
        classes: {
            ui: {
                warning: 'ui-state-highlight',
                error: 'ui-state-error',
                info: 'ui-state-highlight',
                success: 'ui-state-highlight'
            },
            
            bs: {
                warning: 'alert',
                error: 'alert alert-error',
                info: 'alert alert-info',
                success: 'alert alert-success'
            }
        },        
        
        tmpl: {
            ui: '<div class="ui-state-highlight"><div class="notification-body">Default Body</div></div>',
        
            bs: '<div class="alert">'+
                    '<button type="button" class="close" data-dismiss="alert">x</button>'+
                    '<div class="notification-body">Default Body</div>'+
                '</div>'
        }
    });
    
}(jQuery));