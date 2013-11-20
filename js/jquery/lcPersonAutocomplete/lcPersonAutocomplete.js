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
    var oLorenz = Object.create(Lorenz);
    
    $.widget("lorenzUtils.lcPersonAutocomplete", {
        // These options will be used as defaults    
        options: { 
            minLength: 2,
            source: null,
            delay: 0,
            focus: function(event, ui){ui.item.value = ui.item.value.replace(/\<\/?strong\>/g, '')},
            autoFocus: true,
            invalidMsg: 'One of your entered values holds an invalid character.',
            validate: /[\W_]/
        },
        
        _create: function(){
            var self = this,
                element = this.element,
                options = self.options;
            
            if(!options.source){
                self.options.source = $.proxy(self, '_customSearch');
            }
                        
            if(options.multiple){
                self.options.focus =function() {
					// prevent value inserted on focus
					return false;
				};
                
				self.options.select = function(event, ui) {
					var terms = self._split(this.value);
                    
					event.stopPropagation();
					
                    ui.item.value = ui.item.value.replace(/\<\/?strong\>/g, '');
                    
					// remove the current input
					terms.pop();
                    
					// add the selected item
					terms.push(ui.item.value);
                    
					// add placeholder to get the comma-and-space at the end
					terms.push("");
                    
					this.value = terms.join(", ");
                    
					return false;
				};
            }
            
            oLorenz.getAllUserInfo()
                .done(function(users){
                    self.users = users;
                    
                    if(options.multiple){
                        // don't navigate away from the field on tab when selecting an item
                        element.bind("keydown", function(event){
                            var ac = $(this).data("autocomplete").menu;
                            
                            self._trigger("ackeydown", event, {menuHidden: ac.element.is(":hidden")});
                            
                            if (event.keyCode === $.ui.keyCode.TAB && ac.active){
                                event.preventDefault();
                            }
                        })
                    }
                    
                    element.autocomplete(options);

                    element.data("autocomplete")._renderItem = function(ul, item) {                
                        return $( "<li></li>" )
                            .data("item.autocomplete", item)
                            .append("<a style='width:100%'><strong>Name:</strong> " + item.label + "<br/><strong>OUN:</strong> "+item.oun+"<br/><strong>LC Username:</strong> " + item.value + "</a>")
                            .appendTo(ul);
                    };
                    
                    self._trigger('complete');
                });
        },
        
        clear: function(){
            this.element.val('');
        },
        
        get: function(){
            var val = this.element.val(),
                a = val.split(/,\s*/),
                n = [],
                tmp,
                reg = this.options.validate;
            
            for(var i = 0, il = a.length; i < il; i++){
                tmp = a[i];
                
                if(reg.test(tmp)){
                    n = this.options.invalidMsg;
                    
                    break;
                }
                if(tmp !== undefined && tmp !== ''){
                    n.push(tmp);
                }
            }
            
            return n;        
        },
        
        _split: function (val){
			return val.split(/,\s*/);
		},
        
        _extractLast: function (term){
			return this._split(term).pop();
		},
        
        _customSearch: function(request, response){
            var term = this.options.multiple ? this._extractLast(request.term) : request.term,
                escapedTerm = $.ui.autocomplete.escapeRegex(term),
                searchTermReg = new RegExp("^"+escapedTerm, "i"),
                nonRootSearch = new RegExp(escapedTerm, "i"),
                replaceReg = new RegExp("(?![^&;]+;)(?!<[^<>]*)("+escapedTerm+")(?![^<>]*>)(?![^&;]+;)", "gi"),
                replaceWith = "<strong>$1</strong>",
                users = this.users,
                results = [],
                u = {},
                val,
                label,
                oun;
            
            for(var i = 0, il = users.length; i < il; i++){
                u = users[i],
                val = u.value,
                label = u.label,
                oun = u.oun,
                primary = u.primary == "0" ? "1" : "0";
                
                //we're doing some extra stuff here to improve the order the results appear in.  We add a priority to the type of result
                //(i.e., lc name, oun etc... ) it is and whether it is a "primary" lc account.  Then a second pass sort is done with these
                //priorities
                if(searchTermReg.test(val)){
                    results.push({sortValue: "1"+primary+val, value: val.replace(replaceReg, replaceWith), label: label, oun: oun});
                }
                else if(nonRootSearch.test(val)){
                    results.push({sortValue: "2"+primary+val, value: val.replace(replaceReg, replaceWith), label: label, oun: oun});
                }
                else if(searchTermReg.test(label)){
                    results.push({sortValue: "3"+primary+label, value: val, label: label.replace(replaceReg, replaceWith), oun: oun});
                }
                else if(searchTermReg.test(oun)){
                    results.push({sortValue: "4"+primary+oun, value: val, label: label, oun: oun.replace(replaceReg, replaceWith)});
                }    
            }
         
            results.sort(function(a, b){
                return a.sortValue > b.sortValue;
            });
            
            response(results);
        },
        
        _setOption: function(){
            this._superApply(arguments);
        }
    });
})(jQuery);
    