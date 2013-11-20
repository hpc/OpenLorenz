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
    var $dialog = $('<div id="fileTree-dialog"></div>').dialog({autoOpen: false});
    
	var tHostXhr = undefined;
	
	var $errorPrompt = $('<div id = "portlet_errorDialog"></div>').css({fontSize: '14px'}).prompt();
	
    $.widget("lorenzWidgets.fileTree", {
        options: {
            baseDir: '~',
            handler: 'fileTree.cgi',
            folderEvent: 'click',
            expandSpeed: 300,
            collapseSpeed: 300,
            expandEasing: '',
            collapseEasing: '',
            dirLength: 60,
            multiFolder: true,
            jumpToOpts: [],
            loadMessage: 'Loading...',
            showHidden: 0,
            host: 'localhost',
            showFiles: true,
			dblClickDownload: true,
			hostSwitching: true,
            hostList: [],
			iconOpts: {},
			dataSrc: '',
			textField: '',
            blurEnabled: true,
            transferHostsCache: '',
            toggleOnClick: true
        },
        
        $fileTreeContainer: undefined,
        
        $dirHistory: undefined, 
        
        _directoryHistory: [],
        
        _clipboard: -1,
		
		oLora: {},
		
		isMac: false,
        
        transferHosts: '',
        
		_getTransferHosts: function(){
			this.oLora = Object.create(Lorenz);
			
            if(this.options.transferHostsCache){
                return this.options.transferHostsCache;
            }
            
			if(tHostXhr === undefined){
				tHostXhr = this.oLora.getTransferHosts();				
			}
			
			return tHostXhr;
		},
		
        _create: function(){
			var self = this,
				dataAvail = true;
			
			self.isMac = navigator.appVersion.indexOf("Mac") != -1;
			
			if(this.options.dataSrc === 'Lorenz'){				
				dataAvail = $.when(self._getTransferHosts({dataCache: 'fileTree-transferhosts'})).done(function(transferHosts){
                    self.transferHosts = transferHosts;
                    
					self._setLorenzOptions(transferHosts);				
				});
			}
			
			$.when(dataAvail)
				.done(function(){					
					self._buildDialog();
					
					self._buildMarkup();
					
					self._bindDirectoryEvents();
					
					self._bindIconEvents();
					
					self._buildJumpTo();
					
					self._setupContextMenu();            
					
                    if(self.options.blurEnabled){
                        self._bindBlurEvents();
                    }
					
					self.element.addClass('fileTree');
 
					self._showTree(self.$fileTreeContainer, self.options.baseDir, self);
				})
				.fail();
        },
        
        getTransferHosts: function(){
            return this.transferHosts;  
        },
		
		_bindBlurEvents: function(){
			var self = this;
			
			self.element.click(function(event){
				event.stopPropagation();
			});
			
			$('html').click(function(){
				self.$fileTreeContainer.find('a:visible').removeClass('ui-state-active').blur();
			});			
		},
	
		_setLorenzOptions: function getDefaults(tHosts){
			var tmpHosts = [];
			
			for(var h in tHosts){
				var entry = tHosts[h];
				
				tmpHosts.push(h);
				
				if(entry['default'] === 1){
					this.options.host = this.options.host != 'localhost' ? this.options.host : h;
					
                    //Only go to home dir if the user hasn't overwritten baseDir
                    if(this.options.baseDir === '~'){
                        this.options.baseDir = entry.homedir;
                    }
					
					this.options.jumpToOpts = this._getJumpToList(entry.jumpdirs);
				}
			}
			
			this.options.hostList = tmpHosts;					
		},
		
		_getJumpToList: function (scratch){
			var scratchList = scratch || [],
				userId = $('#userId').text(),
				opts = [];
				
			for(var i = 0, il = scratchList.length; i < il; i++){
				opts.push({value: scratchList[i], text: scratchList[i]});
			}
			
			return opts;
		} ,
		
		getCurrentDirectory: function(){
			return this._currentDirectory;
		},
		
		getCurrentHost: function(){
			return this.options.host;
		},
        
        searchable: false,
        
        _buildDialog: function(){
            this.$dialog = $dialog;
        },
        
        _toggleDialog: function(userOpts, content){
            var $dialog = this.$dialog,
                defaultOpts = {
                    title: 'Default title'
                };
            
            $dialog.dialog('close').dialog('destroy').empty();           
            
            var opts = $.extend({}, defaultOpts, userOpts);
            
            if($.isArray(content)){
                $dialog.append.apply($dialog, content);
            }
            else{            
                $dialog.append(content);            
            }
            
            $dialog.dialog(opts).dialog('open');  
        },
        
        _bindDirectoryEvents: function(){
            var self = this,
                element = this.element,
                $input = element.find('#fileTree-currentDirectory'),
                $button = element.find('#fileTree-getHistory');
              
            $input.bind('keyup', function(e){				
                if(e.which === 13){
                    self._clearTree();
                    
                    self._showTree(self.$fileTreeContainer, escape($(this).val()), true);
                }				
            })
			.bind('keydown', function(e){				
				if(e.which === 9){		
					var $active = self._getActiveLink();
					
					if($active.length){
						self._moveActiveLink($active, 'same');	
					}
					else{
						self._moveActiveLink(undefined, 'init');
					}
					
					return false;
				}				
			});

            this.$dirHistory = $input.autocomplete({
                source: this._directoryHistory,
                minLength: 0,                
                search: function(){
                    if(!self.searchable){
                        return false;
                    }
                },
                select: function(e, ui){
                    if(e.which !== 13){
                        self._clearTree();
                    
                        self._showTree(self.$fileTreeContainer, escape(ui.item.value), true);
                    }
                    else{
                        return false;
                    }
                }
            });
            
            $button
                .attr("tabIndex", -1)
				.attr("title", "Show Directory History")
                .button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                })
                .removeClass("ui-corner-all")
				.addClass("ui-corner-right ui-button-icon")
                .click(function(){
                    var input = self.$dirHistory;
                    
                    // close if already visible
                    if (input.autocomplete("widget").is(":visible")){
                        input.autocomplete("close");
                        return;
                    }
                    
                    // work around a bug (likely same cause as #5265)
                    $(this).blur();
                    
                    self.searchable = true;                    
                    // pass empty string as value to search for, displaying all results
                    input.autocomplete("search", "");
                    input.focus();
                    self.searchable = false;
                });
        },
        
        $menuFile: undefined,
        
        $menuDir: undefined,
        
        _setupContextMenu: function(){
            var self = this,
				$menuFile = $(this._contextMenuFile),
                $menuDir = $(this._contextMenuDir),
				$menuRoot = $(this._contextMenuRoot),
                $menuHost = $.tmpl(this._hostMenu, {hosts: this.options.hostList.length > 0 ? this.options.hostList : ['localhost']}),
                color = this._getSeparatorColor();

            $menuFile.find('li.separator').css({borderTop: '1px solid '+color});
            $menuDir.find('li.separator').css({borderTop: '1px solid '+color});
			$menuRoot.find('li.separator').css({borderTop: '1px solid '+color});    
            
            this.$menuFile = $menuFile;
            this.$menuDir = $menuDir;
			this.$menuRoot = $menuRoot;
            
            $('body').append($menuDir, $menuFile, $menuHost, $menuRoot);
			
			$("#lorenzThemeSelect").bind("themeChange", function(){
				var newColor = self._getSeparatorColor();
				
				$menuFile.find('li.separator').css({borderTop: '1px solid '+newColor});
				$menuDir.find('li.separator').css({borderTop: '1px solid '+newColor});
				$menuRoot.find('li.separator').css({borderTop: '1px solid '+newColor}); 
			});
			
			self.$fileTreeContainer.contextMenu({
                menu: 'fileTree-menuRoot'
            }, function(){				
				self._menuSelect.apply(self, Array.prototype.slice.call(arguments))
			})
			.click(function(){
				self.$fileTreeContainer.find('a').removeClass('ui-state-active');
			})
			.bind('contextmenu', function(e){
				self.$fileTreeContainer.find('a').removeClass('ui-state-active');
			});
        },
        
        _getSeparatorColor: function(){
			var $div = $("<div id='fileTree-colorPicker'></div>")
				.css({
					position: 'absolute',
					top: 0,
					left: '-999999em'
				})
				.appendTo('body')
				.addClass('ui-state-default');	
			
			var color = $div.css('borderTopColor');
			
			$div.remove();
			
			return color;
		},
        
        currXhr: -1,
        
        _replaceHomeSpecialWords: function(dir){
            var xHosts = this.transferHosts,
                host = this.options.host;

            if(/^\$HOME/.test(dir)){
                dir = dir.replace('$HOME', xHosts[host].homedir);
            }
            
            if(/^~/.test(dir)){
                dir = dir.replace('~', xHosts[host].homedir);
            }
            
            return dir;
        },
        
        _showTree: function($container, directory, isDirChange){
            var self = this,
                options = this.options;

            if(self.transferHosts){
                directory = self._replaceHomeSpecialWords(directory);
            }
            
			if(!this._illegalName(directory, 'show directory')){
				if(!isDirChange){
					$container.addClass('wait');
				}
				else{
					self.xhrCheck();
					
					self.$fileTreeContainer.addClass('fileTree-loading');    
				}
				
				this.currXhr = $.post(options.handler, {
					sort: self._sortOrder,
					dir: unescape( directory ),
					showHidden: options.showHidden,
					host: options.host
				})
				.done(function(treeData){
					try{
						self._renderTree($container, treeData, isDirChange);
					}catch(e){
						self._trigger('error', undefined, e);
					}
				})
				.always(function(){
					self._trigger("showTree");
					
					this.currXhr = -1;
				})
				.error(function(e){
					if(e.statusText !== 'abort'){
						$container.removeClass('fileTree-loading wait').find("ul:first").remove().end().append(self._getEmptyDiv('error', isDirChange, e.statusText));
					}
				});
				
				return this.currXhr;
			}
			else{
				return $.Deferred().reject().promise();
			}
        },
        
        xhrCheck: function(){
            if(this.currXhr != -1){
                this.currXhr.abort();
                
                this.currXhr = -1;
            }
        },
        
        _buildJumpTo: function(){
            var self = this,
                $select = this.element.find('#fileTree-jumpToOpts').empty().unbind('change'),
                opts = this.options.jumpToOpts,
                options = '<option value = "none">-- none --</option>';
					
            for(var i = 0, il = opts.length; i < il; i++){
                options += '<option value = "'+opts[i].value+'">'+opts[i].text+'</option>'
            }
            
            $select.append(options);

            $select.change(function(){
                var val = $(this).val();
					
                if(val !== 'none'){
                    self._clearTree();
                
                    self._showTree(self.$fileTreeContainer, escape(val), true);
                }
            });			
        },
        
        _bindIconEvents: function(){
            this._bindHomeIcon();
            
            this._bindRootIcon();
            
            this._bindUpDirIcon();
            
            this._bindRefreshIcon();
            
            this._bindHiddenIcon();
            
            this._bindHostSelect();

			this._bindFolderIcon();
			
			this._bindFileIcon();
			
			this._bindHelpIcon();
			
			this._bindTrashIcon();

			this._bindSortIcon();
			
			this._checkIconOpts();
			
			$(".fileTree-icon").click(function(){
				$(".contextMenu").hide();
			});
        },

		_sortOrder: 'asc',		
		
		_bindSortIcon: function(){
			var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-sortIcon"));
			
			$icon.click(function(){
				self._sortOrder = self._sortOrder === 'asc' ? 'desc' : 'asc';
				
				self._sortCurrentFolder(self._sortOrder, self.$fileTreeContainer.find('ul.fileTree-tree:first-child').children('li'));
			});
		},

		_sortCurrentFolder: function(order, $li){
			var self = this,
				$topLevel = $li.eq(0).parent('ul'),
				toSort = $li.detach().toArray(),
				fragment = document.createDocumentFragment();
			
			if($li.length > 0){
				$li.each(function(){
					var $nested = $(this).children('ul');
					
					if($nested.length > 0){
						self._sortCurrentFolder(order, $nested.children('li'));	
					}					
				});
				
				order = order === 'asc' || order === 'desc' ? order : 'asc';
				
				toSort.sort(function(a, b){
					a = $(a), b = $(b);
					
					if(order === 'asc'){					
						return a.find('a:first-child').attr('rel') > b.find('a:first-child').attr('rel') ? 1 : -1;
					}
					else{
						return a.find('a:first-child').attr('rel') < b.find('a:first-child').attr('rel') ? 1 : -1;
					}
				});
				
				for(var i = 0, il = toSort.length; i < il; i++){
					fragment.appendChild(toSort[i]);
				}
				
				$topLevel.append(fragment);
			}
		},
		
		_bindTrashIcon: function(){
			var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-trashIcon"));
			
			$icon.click(function(){
				var $toDelete = self.$fileTreeContainer.find('a.ui-state-active:visible');
				
				if($toDelete.length > 0){
					self._deleteFile($toDelete);
				}
			});
		},
		
		_bindHelpIcon: function(){
			var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-helpIcon"));
			
			$icon.click(function(){				
				self._toggleDialog({
						title: 'Shortcuts',
						width: '400',
						height: 'auto',
						modal: true
					}, self._buildKeyboardShortcutText());
			});
		},
		
		_buildKeyboardShortcutText: function(){
			var html = '\
				The navigation and action commands work on the highlighted files in the file tree.  Copy, cut, paste, and delete are currently the only actions available to multiple selected files/folders.<hr width=100% />\
				<table width=100% class="shortcutTable">\
					<thead>\
						<tr><th>Command</th><th>Windows/Linux</th><th>Mac</th></tr>\
					</thead>\
					<tbody>\
						<tr><td>Copy</td><td>Ctrl + C</td><td>Cmd + C</td></tr>\
						<tr><td>Cut</td><td>Ctrl + C</td><td>Cmd + C</td></tr>\
						<tr><td>Paste</td><td>Ctrl + V</td><td>Cmd + V</td></tr>\
						<tr><td>Delete</td><td>Delete</td><td>Delete</td></tr>\
						<tr><td>Navigation</td><td>Arrow Keys</td><td>Arrow Keys</td></tr>\
						<tr><td>Open folder</td><td>Enter</td><td>Enter</td></tr>\
						<tr><td>Download File</td><td>Dbl Click</td><td>Dbl Click</td></tr>\
						<tr><td>Context Menu</td><td>Right Click</td><td>Right Click</td></tr>\
						<tr><td>Select Range</td><td>Shift Click</td><td>Shift Click</td></tr>\
						<tr><td>Select Individual</td><td>Ctrl Click</td><td>Cmd Click</td></tr>\
					</tbody>\
				</table>\
			  \
			';
			
			return html;
		},
		
		_bindFolderIcon: function(){
			var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-folderIcon"));
			
			
			$icon.click(function(){				
				self._newFileFolder(self.$fileTreeContainer, 'folder');
			});
		},
		
		_bindFileIcon: function(){
			var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-fileIcon"));
				
				//its possible to bind this twice due to the _disableIcon function re-enabling
				//the icon based on a custom iconOpts functions passed in by the user
				//so we first unbind any other identical event that was bound in the past
				$icon.unbind('click.newFile').bind('click.newFile', function(){				
					self._newFileFolder(self.$fileTreeContainer);
				});	
		},
        
        _bindHostSelect: function(){
            var self = this,
                $select = this.element.find("#fileTree-switchHostSelect");
            
			$select.val(this.options.host);
			
			if(self.options.hostSwitching){				
				$select.change(function(e){
					var host = $select.val();
					
					self._trigger("hostChange", undefined, {host: host, widget: self});
					
					self._clearTree();                
					
					self.options.host = host;
					
					self._checkIconOpts();
					
					self._checkMenuOpts();
					
					self._clipboard = -1;
					
					self._disablePaste();
	
					self._clearHistory();
					
					self._showTree(self.$fileTreeContainer, escape(self.options.baseDir), true)
						.done(function(){
							self._moveActiveLink(undefined, 'init');
						});
				});
			}
			else{
				$select.prop('disabled', true);
			}
        },
        
        changeHost: function(host){
            var $select = this.element.find("#fileTree-switchHostSelect");
            
            $select.val(host);
            
            $select.trigger('change');
        },
		
		_checkMenuOpts: function(){
			var self = this,
				opts = this.options.menuOpts;
			
			if(!$.isEmptyObject(opts)){
				for(var menuItem in opts){
					var mOpts = opts[menuItem];
					
					self._disableMenuOpts(menuItem, mOpts.disabled);
					
					//add more functions here for more icon options added
				}
				
			}
		},
		
		_disableMenuOpts: function(menuItem, disabled){
			var toggle = true;
			
			if(typeof disabled === 'function'){
				toggle = disabled.apply(this, []);					
			}
			else if(typeof disabled === 'boolean'){
				toggle = disabled;
			}
			
			this._menuItemToDisabled[menuItem] = toggle;
			
			this._disableMenuItem(menuItem, toggle);
		},
		
		//Note: the li for the menu item you want to be disabled has to have a class
		//on it like fileTree-{menuItem}, also the function that handles the action
		//e.g., adding a new file, needs to do a check for _menuItemToDisabled[menuItem]
		_disableMenuItem: function(menuItem, toggle){
			if(toggle){				
				this.$menuFile.find('.fileTree-'+menuItem).addClass("ui-state-disabled");
				this.$menuDir.find('.fileTree-'+menuItem).addClass("ui-state-disabled");
				this.$menuRoot.find('.fileTree-'+menuItem).addClass("ui-state-disabled");
			}
			else{				
				this.$menuFile.find('.fileTree-'+menuItem).removeClass("ui-state-disabled");
				this.$menuDir.find('.fileTree-'+menuItem).removeClass("ui-state-disabled");
				this.$menuRoot.find('.fileTree-'+menuItem).removeClass("ui-state-disabled");
			}			
		},
		
		_menuItemToDisabled: {},
		
		_checkIconOpts: function(){
			var self = this,
				opts = this.options.iconOpts;
			
			if(!$.isEmptyObject(opts)){
				for(var icon in opts){
					var iOpts = opts[icon];
					
					self._disableIconOpts(icon, iOpts.disabled);
					
					//add more functions here for more icon options added
				}
				
			}
		},
		
		_disableIconOpts: function(icon, disabled){
			var toggle = true;
			
			if(typeof disabled === 'function'){
				toggle = disabled.apply(this, []);					
			}
			else if(typeof disabled === 'boolean'){
				toggle = disabled;
			}
			
			this._disableIcon(icon, toggle);			
		},
		
		_disableIcon: function(icon, disabled){
			var e = disabled !== undefined ? disabled : true,
				$icon = this.element.find("#fileTree-"+icon),
				iconToBind = {
					//NOTE IF YOU ADD MORE HERE, YOU NEED TO UNBIND THE EVENT FIRST
					//LIKE IT IS DONE IN _bindFileIcon... see function for details
					fileIcon: '_bindFileIcon'
				};
			
			if(e){
				$icon.addClass('ui-state-disabled').unbind();
			}
			else{
				this[iconToBind[icon]]();
				
				$icon.removeClass('ui-state-disabled');							
			}
		},
        
        _bindHomeIcon: function(){
            var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-homeIcon"));
            
            $icon.click(function(){
                self._clearTree();                
                
                self._showTree(self.$fileTreeContainer, '~', true)
					.done(function(){
						self._moveActiveLink(undefined, 'init');
					});
            });
        },
        
        _bindRootIcon: function(){
            var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-rootIcon"));
            
            $icon.click(function(){
                self._clearTree();                
                
                self._showTree(self.$fileTreeContainer, '/', true)
					.done(function(){
						self._moveActiveLink(undefined, 'init');
					});;
            });		
        },
        
        _bindUpDirIcon: function(){
            var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-parentIcon"));
            
            $icon.click(function(){                
                var tmpDir = self._currentDirectory.replace(/^(.*\/).*$/gi, "$1");
					
                if(tmpDir){						
                    self._clearTree();                
                
                    self._showTree(self.$fileTreeContainer, escape(tmpDir), true)
						.done(function(){
							self._moveActiveLink(undefined, 'init');
						});
                }
            });
        },
        
        _bindRefreshIcon: function(){
            var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-refreshIcon"));
			
            $icon.click(function(){
				var $active = self._getActiveLink();
				
                self._refresh()
					.done(function(){
						self._moveActiveLink($active, 'same');
					});                
            });
        },
        
        _refresh: function(){
            this._clearTree();                
                
            return this._showTree(this.$fileTreeContainer, escape(this._currentDirectory), true);
        },
		
		refresh: function(){
			this._refresh();
		},
		
		loading: function(){
			this._clearTree();
			
			this.$fileTreeContainer.addClass('fileTree-loading');  
		},
        
        _bindHiddenIcon: function(){
            var self = this,
                $icon = this._hoverable(this.element.find("#fileTree-hiddenIcon")); 
            
            $icon.click(function(){
                self.options.showHidden = self.options.showHidden === 1 ? 0 : 1;
                
                self._clearTree();                
                
                self._showTree(self.$fileTreeContainer, escape(self._currentDirectory), true);
            });
        },
		
		_getActiveFolder: function(){
			var $a = this.$fileTreeContainer.find('a.ui-state-active'),
				$li = $a.parent(),
				currentDir = this._currentDirectory === '/' ? '/' : this._currentDirectory + '/';
			
			//found selected item
			if($a.length > 0){
				if($li.hasClass('directory')){
					return $a[0];
				}
				else{
					var parentTree = $a.parents('.fileTree-tree:first'),
						parentLink = parentTree.prev('a'),
						parentContainer = parentTree.parent('li');
				
					if(parentLink.length > 0){                
						return parentLink[0];    
					}
					else{                
						return $('<a rel="'+currentDir+'" href="#" style="cursor: pointer;" class=""></a>')[0];
					}
				}				
			}
			else{
				return $('<a rel="'+currentDir+'" href="#" style="cursor: pointer;" class=""></a>')[0];
			}
		},
        
        _clearTree: function(){
            this.element.find('.fileTree-tree').remove().end().find("#fileTree-emptyDiv").remove();
        },
        
        _renderTree: function($container, treeData, isDirChange){        
            var markup = treeData.data,
                directory = treeData.dir,
                host = treeData.host,
                options = this.options,
                element = this.element;
           
            //Changing the base of view for the directory
            if(isDirChange){
                this.$fileTreeContainer.removeClass('fileTree-loading');
                
                this._handleDirChange(directory, host);                
            }				
            
            $container.removeClass('wait');
            
            if(markup && /^\<ul/.test(markup)){				
                $container.find("ul:first").remove().end().append(markup);
				
                if(!options.showFiles){
                    $container.find('li.file').remove();
                }
               
                if(options.baseDir === directory){
                    $container.find('ul:hidden').show();				
                }
                else {
                    $container.find('ul:hidden').slideDown({ duration: options.expandSpeed, easing: options.expandEasing });
                }

                this._bindTree($container);
            }
            else{
                $container.find("ul:first").remove().end().append(this._getEmptyDiv(markup, isDirChange));
            }
        },
        
        _getEmptyDiv: function(markup, isDirChange, extra){
            var $ul =  $('<ul id="fileTree-emptyDiv"><li>-- '+this._getDirMessage(markup)+(extra !== undefined ? ': "'+extra+'"' : '')+' --</li></ul>');
            
            if(isDirChange){
                $ul.addClass('fileTree-centerFull').css({lineHeight: this.$fileTreeContainer.height()+'px'});
            }
            
            return $ul;
        },
        
        _getDirMessage: function(msg){
            var msgToText = {
                empty: 'Empty',
                noexist: 'No Such Directory',
                perms: 'Permission Denied',
                stat: 'Permission Denied',
				error: 'An error occurred'
            };
            
            return msgToText[msg] || msg;
        },
        
        _handleDirChange: function(directory, host){
			directory = unescape(directory);
			
            this._trigger('dirChange', undefined, directory);
            
            this._updateHistory(directory);
            
            this._currentDirectory = directory;
            
            this.element
                .find("#fileTree-emptyDiv").remove().end()
                .find('#fileTree-currentDirectory').val(directory).end()
                .find('#fileTree-currentHost').empty().html(host);			
        },
        
        _updateHistory: function(directory){
            var maxLength = 10,
                _directoryHistory = this._directoryHistory;                
            
            _directoryHistory.unshift(directory);
			
			_directoryHistory = this._uniqueArray(_directoryHistory);
            
            if(_directoryHistory.length > maxLength){
                _directoryHistory.pop();
            }
            
            this.$dirHistory.autocomplete('option', 'source', _directoryHistory);
        },
		
		_uniqueArray: function(array){
			var o = {},			
				r = [];
			
			for(var i = 0, il = array.length; i < il; i++){
				o[array[i]] = array[i];
			}
			
			for(i in o){
				r.push(o[i]);
			}
			
			return r;
		},
        
        _clearHistory: function(){
            this._directoryHistory = [];
            
            this.$dirHistory.autocomplete('option', 'source', this._directoryHistory);
        },
        
		_prevFocused: {},
		
        _bindTree: function($container){
            var self = this,
				$links = this._hoverable($container.find('li a'));
            
			//Keep track of previously focused links in case we need to revert focus back later
			$links.blur(function(){
				self._prevFocused = $(this);	
			});
			
            this._bindFolderEvent($links);
            
			this._bindContextMenuEvents($links, $container);
            
			this._bindDoubleClickEvent($links);
			
			this._bindKeyboardEvents($links);
			
			this._bindMultiSelectEvents($links);
        },
        
		_bindFolderEvent: function($links){
			var self = this,
				folderEvent = self.options.folderEvent.toLowerCase();
			
			$links.bind(folderEvent, function(e, keypressed){
                var $a = $(this).focus(),
                    $li = $a.parent(),
                    directory = $a.attr('rel').match(/.*\//),
					removeActive = keypressed ? false : true;
				
				if(folderEvent !== 'click' && folderEvent !== 'dblclick'){
					self._folderEventListener($a, $li, directory, removeActive);
				}
				else if(!e.shiftKey && !e.ctrlKey && !e.metaKey){
					self._folderEventListener($a, $li, directory, removeActive);
				}
				
                return false;
			});
			
			// Prevent <a> from triggering the # on non-click events
            if(folderEvent.toLowerCase !== 'click'){
                $links.bind('click', function() { return false });
            }
		},
		
		_bindContextMenuEvents: function($links, $container){
			var self = this;
			
			$links.bind('contextmenu', function(e){                
                self.$fileTreeContainer.find('a').removeClass('ui-state-active');
                
                $(this).addClass("ui-state-active");
                
                return false;
            });
			
			$container.find('li.file a').contextMenu({
                menu: 'fileTree-menuFile'
            }, $.proxy(this, '_menuSelect'));
            
            $container.find('li.directory a').contextMenu({
                menu: 'fileTree-menuDir'
            }, $.proxy(this, '_menuSelect'));
		},
		
		_bindDoubleClickEvent: function($links){
			var self = this;
			
			$links.bind('dblclick', function(){
                var $a = $(this);
                    $li = $a.parent(),
                    directory = $a.attr('rel').match(/.*\//);                    
                
				if(self.options.dblClickDownload){
					if($li.hasClass('file')){
						self._downloadFile(this);
					}
				}

                self._doubleClickListener($a, $li, directory);
            });
		},
		
		_bindKeyboardEvents: function($links){
			var self = this;
						
			$links.bind('keypress', function(e, key){
				var keyPressed = key || e.keyCode;
				
				//top arrow
				if(keyPressed === 38 && !e.shiftKey){
					self._moveActiveLink($(this), 'up');
					return false;
				}			
				//down arrow
				else if(keyPressed === 40 && !e.shiftKey){
					self._moveActiveLink($(this), 'down');
					return false;
				}				
				
				return true;
			})
			.bind('keydown', function(e){
				var keyPressed = e.which,
					isMac = self.isMac,
					$fileTreeContainer = self.$fileTreeContainer;
				
				//hack here for webkit browsers (chrome,safari) as they only register keydowns
				//when arrow keys are held down, whereas FF registers keydowns... so I just forward
				//the keydowns on as keypresses for 38/40 keycodes  if its webkit
				
				//up arrow
				if(keyPressed === 38 && !e.shiftKey){				
					if($.browser.webkit){						
						$(this).trigger('keypress', keyPressed);
					}
					return false;
				}			
				//down arrow
				else if(keyPressed === 40 && !e.shiftKey){					
					if($.browser.webkit){						
						$(this).trigger('keypress', keyPressed);
					}
					return false;
				}	
				//delete
				else if(keyPressed === 46){				
					self._deleteFile($fileTreeContainer.find('a.ui-state-active:visible'));
					return false;
				}
				//metakey is the apple command key
				//ctrl + c
				else if(keyPressed === 67 && ((!isMac && e.ctrlKey) || (isMac && e.metaKey))){
					self._copyFile($fileTreeContainer.find('a.ui-state-active:visible'));
					return false;
				}
				//ctrl + v
				else if(keyPressed === 86 && ((!isMac && e.ctrlKey) || (isMac && e.metaKey))){
					self._paste($(this));
					return false;
				}
				//ctrl + x
				else if(keyPressed === 88 && ((!isMac && e.ctrlKey) || (isMac && e.metaKey))){
					self._cutFile($fileTreeContainer.find('a.ui-state-active:visible'));
					return false;
				}
				else if(keyPressed === 13){
					//little weirdness here as the browser automatically triggers a "click" event
					//when <a> tags are focused and enter key is pressed... so I have to manually
					//trigger the click and prevent the default action, so I can actually tell the
					//event was trigger by a keypress and not a mouse click (by passing an extra param to trigger)
					$(this).trigger("click", true).focus();
					
					return false;
				}
				//tab, screws up focus if they tab through links, so disable default actions here
				else if(keyPressed === 9){
					return false;
				}
			});
		},
		
		_bindMultiSelectEvents: function($links){
			var self = this,
				$fileTreeContainer = self.$fileTreeContainer,
				isMac = self.isMac;
			
			$links.bind('click', function(e){
				var $a = $(this);
				
				if(e.shiftKey){
					self._shiftKeyMultiSelect($a);
				}
				if((!isMac && e.ctrlKey) || (isMac && e.metaKey)){
					self._ctrlKeyMultiSelect($a);					
				}
			})
			.bind('keydown', function(e){
				var keyPressed = e.which,
					$a = $(this);
				
				//down arrow
				if(keyPressed === 40 && e.shiftKey){					
					self._shiftKeyMultiSelect($a, 'down');
					return false;
				}				
				//up arrow
				else if(keyPressed === 38 && e.shiftKey){				
					self._shiftKeyMultiSelect($a, 'up');
					return false;
				}
			});
		},
		
		_ctrlKeyMultiSelect: function($target){
			if($target.hasClass('ui-state-active')){
				$target.removeClass('ui-state-active');
				
				this._prevFocused.focus();
			}
			else{
				$target.addClass('ui-state-active').focus();	
			}
		},
		
		_shiftKeyMultiSelect: function($target, direction){
			if(direction){
				this._multiShiftSelectArrowKey($target, direction);
			}
			else{
				this._multiShiftSelectClick($target);
			}			
		},
		
		_multiShiftSelectArrowKey: function($target, direction){
			var $fileTreeContainer = this.$fileTreeContainer,
				$links = $fileTreeContainer.find('a:visible'),
				$selected = $fileTreeContainer.find('a.ui-state-active'),
				totalSelected = $selected.length,
				selectedIndex = $links.index($selected),
				targetIndex = $links.index($target),
				noGaps = {pre: false, post: false},
				endPoint = direction === 'up' ? (targetIndex - 1 >= 0 ? targetIndex - 1 : 0) : targetIndex + 1,
				selectStart = $links.index($selected.first()),
				selectEnd = $links.index($selected.last());
			
			//get the target element depending on whether they pressed up or down
			$target = $links.eq(endPoint);
			
			noGaps.pre = (selectEnd - selectStart) + 1 === totalSelected;

			//here we only remove if the target is the last or first element in the set, meaning they're on the tail end of a selection
			if($target.hasClass('ui-state-active') && (targetIndex !== 0 || (targetIndex === 0 && selectStart === 0 && direction !== 'up'))&& (targetIndex === selectStart || targetIndex === selectEnd)){
				$links
					.eq(targetIndex).removeClass('ui-state-active');
			}
			else{
				$target.addClass('ui-state-active');
			}
			
			$selected = $fileTreeContainer.find('a.ui-state-active'),
			selectEnd = $links.index($selected.last()),
			selectStart = $links.index($selected.first());
			
			noGaps.post = (selectEnd - selectStart) + 1 === $selected.length;
			
			//If it was a gapped list, and then we filled it, jump to either top or bottom of select list depending on arrow key direction
			if(noGaps.pre === false && noGaps.post === true){
				if(direction === 'up'){
					$selected.first().focus();
				}
				else{
					$selected.last().focus();
				}
			}			
			else{
				$target.focus();	
			}
		},
		
		_multiShiftSelectClick: function($target){
			var $fileTreeContainer = this.$fileTreeContainer,
				$links = $fileTreeContainer.find('a:visible'),
				$selected = $fileTreeContainer.find('a.ui-state-active'),
				selectedIndex = $links.index($selected),
				targetIndex = $links.index($target),
				startPoint = Math.min(selectedIndex, targetIndex),
				endPoint = Math.max(selectedIndex, targetIndex);
				
			$links.removeClass('ui-state-active');
		
			if($selected.length > 0 && startPoint !== endPoint){					
				$links							
					.slice(startPoint, endPoint+1)
					.addClass('ui-state-active');
			}
			else{
				$target.addClass('ui-state-active');
			}
		},
		
		_moveActiveLink: function($a, direction){			
			var $siblings = this.$fileTreeContainer.find('a:visible'),
				total = $siblings.length,
				myIndex = $siblings.index($a),
				toIndex = myIndex;
				
			if(direction === 'init'){
				toIndex = 0;
			}
			else{
				if(direction === 'up'){
					if(myIndex === 0){
						toIndex = total-1;
					}
					else{
						toIndex--;
					}
				}
				else if(direction === 'down'){
					if(myIndex === total-1){
						toIndex = 0;
					}
					else{
						toIndex++;
					}
				}			
				
				$a.removeClass('ui-state-active');
			}
			
			if(direction === 'same'){
				$siblings.removeClass('ui-state-active').filter('[rel="'+$a.attr('rel')+'"]').addClass('ui-state-active').focus();
			}
			else if(toIndex !== -1){
				$siblings.removeClass('ui-state-active').eq(toIndex).addClass('ui-state-active').focus();
			}
		},
		
        _menuSelect: function(action, el, pos){			
            if(action === 'refresh'){
                this._refreshView(el);
            }
            else if(action === 'root'){
                this._makeRoot(el);
            }
            else if(action === 'delete'){
                this._deleteFile($(el));
            }
            else if(action === 'newFile'){
                this._newFileFolder(el);
            }
            else if(action === 'newFolder'){
                this._newFileFolder(el, 'folder');
            }
            else if(action === 'download'){
                this._downloadFile(el);
            }
			else if(action === 'open'){
                this._openFile(el);
            }
            else if(action === 'cut'){
                this._cutFile($(el));
            }
            else if(action === 'copy'){
                this._copyFile($(el));
            }
            else if(action === 'paste'){
                this._paste($(el));
            }
			else if(action === 'rename'){
				this._rename(el);
			}
			else if(action === 'getInfo'){
				this._getInfo(el, pos);
			}
        },
		
		_illegalName: function(fileName, name){            
			if(/[\?\*\\'"$;<>\|`#]/g.test(fileName)){
				this._error({
					friendlyError: 'We have detected you are trying to perform an action on a file or folder with an illegal character.  Any file/folder with the following characters cannot have actions performed on them within the fileTree: ?, *, >, <, \\, \', ", |, `, # and $.',
					technicalError: 'Illegal character found in path in '+name+': '+fileName,
					location: name+' illegal'
				});
				
				return true;
			}
			else{
				return false;
			}
        },
		
		_getInfo: function(el, pos){
			var self = this,
				$a = $(el),
				path = $a.attr('rel');
			
			if(!self._illegalName(path, 'get info')){
				self._sendRequest({
					getInfo: 1,
					path: path,
					host: self.options.host
				})
				.done(function(r){
					if(r.status === 'OK'){
						self._toggleDialog({
							title: 'Get Info',
							width: 'auto',
							height: 60,
							position: [pos.docX, pos.docY]
						}, r.data.out);
					}
					else{
						alert('Failed getting info for '+path+': '+r.error);
					}
				})
				.fail(function(e){
					self._error({
						friendlyError: 'Failed error getting info for '+path+'.  This is usually a server side error.  Try refreshing the page.  If the action still fails send an error report, thank you.',
						technicalError: e,
						location: 'get info server error'
					});
				});
			}
		},
		
		_rename: function(el){
			var self = this,
				$a = $(el),
				$li = $a.parent(),
				makeType = $li.hasClass('directory') ? 'folder' : 'file',				
				oldPath = $a.attr('rel'),
				nameOnly = makeType === 'folder' ? oldPath.replace(/^.*\/(.*)\/$/g, "$1") : oldPath.replace(/^.*\/(.*)$/g, "$1"),
				$input = $("<input type='text' value='"+nameOnly+"' class='fileTree-renameInput'/>")
							.focus(function(){
								$(this).select()
							})
							.blur(function(){
								$li.find('.fileTree-renameInput').remove().end()
									.find('.fileTree-error').remove().end()
									.prepend($a);								
							})
							.keyup(function(e){
								if(e.which === 13){
									moveFile();
								}
							}),
				moveFile = function(){
					var $fileName = $li.find(".fileTree-renameInput"),						
						basePath = makeType === 'folder' ? oldPath.replace(/^(.*\/).*\/$/g, "$1") : oldPath.replace(/^(.*\/).*$/g, "$1");
						trimmedName = $.trim($fileName.val()),
						newPath = basePath+trimmedName+(makeType === 'folder' ? '/' : '');
					
					$li.addClass("wait");
					
					if(self._validateName($fileName, makeType) && self._isNotDuplicate($fileName, $li)){
						self._sendRequest({
							renameFile: 1,                                
							from: oldPath,
							to: newPath,
							type: 'rename',
							host: self.options.host
						})
						.done(function(r){							
							if(r.status === 'OK'){
								$a.attr('rel', newPath).text(trimmedName);
								
								$li.find('.fileTree-renameInput').remove().end().prepend($a);
								
								if(makeType === 'folder' && $li.hasClass("expanded")){
									self._refreshView($a);
								}
								else{									
									$li.removeClass(function(index, c){										
										var matches = c.match(/ext_\w*/g) || [];
										
										return (matches.join (' '));
									});
									
									trimmedName.match(/\.(.*)$/g);
									
									$li.addClass('ext_'+RegExp.$1);
								}
							}
							else{
								alert("Failed renaming "+makeType+" "+oldPath+". Error: "+r.error);
							}							
						})
						.always(function(){							
							$li.removeClass("wait fileTree-renameContainer");
						})
						.fail(function(e){
							self._error({
								friendlyError: 'Fatal error renaming file.  This is usually a server side error.  Try refreshing the page.  If the action still fails send an error report, thank you.',
								technicalError: e,
								location: 'rename file server error'
							});
						});						
					}
					else{
						$li.removeClass("wait fileTree-renameContainer");						
					}
				};
			
			if(!self._illegalName($a.attr('rel'), 'rename file')){
				$a.detach();
				
				$li.prepend($input).addClass('fileTree-renameContainer');
				
				$input.trigger("focus");
			}
		},
        
        _paste: function($a){
            var self = this,                
                clipboard = this._clipboard,
                targetDir,
                type,
				rels = [];
            
            if(this._pasteable){
                targetDir = this._getTargetDir($a);
                type = clipboard.hasClass('ui-state-disabled') ? 'cut' : 'copy';
                
				clipboard.each(function(){
					rels.push($(this).attr('rel'));
				});
				
                self._sendRequest({
                    moveFile: 1,
                    type: type,
                    from: rels,
                    to: targetDir,
                    host: self.options.host
                })
                .done(function(r){
					if(r.status === 'OK'){
						self._refreshView($a);
						
						if(type === 'cut'){
							self._removeFile(self._clipboard);
						}
					}
					else{						
						alert(r.error);
					}
                })  
                .always(function(){
					self._clipboard.removeClass('ui-state-disabled');
                    self._clipboard = -1;
                })
				.fail(function(e){
					self._error({
						friendlyError: 'Fatal error pasting file.  This is usually a server side error.  Try refreshing the page.  If the action still fails send an error report, thank you.',
						technicalError: e,
						location: 'paste file server error'
					});
				});                
            
                this._disablePaste();
            }
        },
        
        _removeFile: function($file){
            var cut = $file,
                ul = cut.parents('.fileTree-tree:first')
                parentLink = ul.prev('a'),
                isDirChange = parentLink.length > 0 ? false : true;
            
            cut.parent().remove();
            
            if(ul.find('li').length === 0){
               ul.append(this._getEmptyDiv('empty', isDirChange));
            }
        },
        
        _getTargetDir: function($a){
            var $li = $a.parent(),                
                parentLink = $a.parents('.fileTree-tree:first').prev('a');                
            
			if($a.is(this.$fileTreeContainer)){
				return this._currentDirectory;
			}
            if($li.hasClass('directory')){
                return $a.attr('rel');
            }
            else if(parentLink.length > 0){
                return parentLink.attr('rel');
            }
            else{
                return this._currentDirectory;
            }       
        },
        
        _copyFile: function($a){
			if(!this._batchIllegal($a, 'copy file')){
				if(!this._menuItemToDisabled['copyFile']){
					this._saveToClipboard($a);
					
					this._enablePaste();
				}
			}
        },
        
        _cutFile: function($a){
			if(!this._batchIllegal($a, 'cut file')){
				this._saveToClipboard($a);
				
				$a.addClass('ui-state-disabled');
				
				this._enablePaste();
			}
        },
		
		_batchIllegal: function($a, name){
			var self = this,
				illegal = false;
			
			$a.each(function(){
				if(self._illegalName($(this).attr('rel'), name)){
					illegal = true;					
					return false;
				}
			});
			
			return illegal;
		},
        
        _pasteable: false,
        
        _enablePaste: function(){
            this._pasteable = true;
            this.$menuFile.find('.fileTree-paste').removeClass("ui-state-disabled");
            this.$menuDir.find('.fileTree-paste').removeClass("ui-state-disabled");
			this.$menuRoot.find('.fileTree-paste').removeClass("ui-state-disabled");
        },
        
        _disablePaste: function(){
            this._pasteable = false;
            this.$menuFile.find('.fileTree-paste').addClass("ui-state-disabled");
            this.$menuDir.find('.fileTree-paste').addClass("ui-state-disabled");
			this.$menuRoot.find('.fileTree-paste').addClass("ui-state-disabled");
        },
        
        _saveToClipboard: function($a){            
            if(this._clipboard != -1){
                this._clipboard.removeClass("ui-state-disabled")
            }
            
            this._clipboard = $a;       
        },
        
        _newFileFolder: function(el, type){
            var self = this,
                makeType = type || 'file',
                $a = $(el),				
				basePath = $a.is(self.$fileTreeContainer) ? self._currentDirectory+(self._currentDirectory === '/' ? '' : '/') : $a.attr('rel'),
                fileName = '',
				$input = $('<input type="text" id="fileTree-newFileName" />')
							.keyup(function(e){
								if(e.which === 13){
									doMakeItem();
								}
							}),
				doMakeItem = function(){
					var $fileName = $("#fileTree-newFileName"),
                            path = basePath+$.trim($fileName.val());
                        
					if(self._validateName($fileName, makeType) && self._isNotDuplicate($fileName, $a)){
						self._sendRequest({
							newFileFolder: 1,
							type: makeType,
							path: path,
							host: self.options.host
						})
						.done(function(r){
							if(r.status === 'OK'){
								self._refreshView(el);
							}
							else{
								alert("Failed Making "+makeType+" "+path+". Error: "+r.error);
							}
						})
						.fail(function(e){
							self._error({
								friendlyError: 'Fatal error creating file or folder.  This is usually a server side error.  Try refreshing the page.  If the action still fails send an error report, thank you.',
								technicalError: e,
								location: 'new file/folder server error'
							});
						});
						
						self.$dialog.dialog('close');
					}					
				};
            
			if((makeType === 'file' && !this._menuItemToDisabled['newFile']) || makeType == 'folder'){
				this._toggleDialog({
					title: "Enter "+makeType+" name",
					modal: true,
					close: function(){
						self.$fileTreeContainer.find('a.ui-state-active').focus();
					},
					buttons: {
						OK: function(e){
							e.stopPropagation();
							
							doMakeItem();	
						},
						Cancel: function(e){
							e.stopPropagation();
							
							$(this).dialog('close');
						}
					}
				}, $('<div>Name: </div>').append($input));
			}
        },
		
		_isNotDuplicate: function($input, $elem){
			var $fileTreeContainer = this.$fileTreeContainer,
				$childLinks,
				name = $input.val(),
				isNotDuplicate = true;
			
			$input.siblings('.fileTree-error').remove();
			
			//if they pass an li, we know they're doing a rename, so we want to inspect our siblings for a duplicate
			//as opposed to a next sibilings internal tree
			if($elem.is('li')){
				$childLinks = $elem.siblings('li').children('a');
			}			
			else if($elem.is(":hidden") || $elem.is($fileTreeContainer)){		
				$childLinks = $fileTreeContainer.children('ul.fileTree-tree').children('li').children('a');
			}
			else{
				$childLinks = $elem.next('ul.fileTree-tree').children('li').children('a')
			}
			
			$childLinks.each(function(){
				var link = $(this).attr("rel"),
					re = new RegExp("\/"+name+"\/?$", "g");
				
				//if we find a duplicate file name
				if(re.test(link)){					
					isNotDuplicate = false;
					
					return false;
				}
			});
			
			if(!isNotDuplicate){
				$input.after("<div class='fileTree-error'>(Found a duplicate named file or directory.  This name must be unique.)</div>");
			}
			
			return isNotDuplicate;
		},
        
        _validateName: function($input, type){
            var val = $input.val(),
                makeType = type || 'file',
                regTest = makeType === 'folder' ? /[^\w_\-]/g: /[^\w_\-\.\s]/g;
            
			$input.siblings('.fileTree-error').remove();
			
            if(!val){
                $input.after("<div class='fileTree-error'>(Name cannot be blank)</div>'");
                return false;
            }
            else if(regTest.test(val)){
                if(makeType === 'file'){
                    $input.after("<div class='fileTree-error'>(Name can only contain alphanumeric, _, -, and spaces)</div>");
                }
                else{
                    $input.after("<div class='fileTree-error'>(Name can only contain alphanumeric, _, and -)</div>");
                }
                return false;
            }
            else{
                return true;
            }
        },
        
        _downloadFile: function(el){
            var path = $(el).attr("rel");
            
			if(!this._illegalName(path, 'download file')){
				window.open(Lorenz.loraRoot+'/file/'+this.options.host+escape(path)+'?view=read&format=auto&download=1');
			}
        },
		
		_openFile: function(el){
			var path = $(el).attr("rel");
            
			if(!this._illegalName(path, 'open file')){
				window.open(Lorenz.loraRoot+'/file/'+this.options.host+path+'?view=read&format=auto');
			}
		},		
        
        _deleteFile: function($a){
            var self = this;
			
			var d = function(){
				$a.each(function(){
					var $this = $(this),
						path = $this.attr("rel");
						
					if(!self._illegalName(path, 'delete file')){
						self._sendRequest({deletePath: 1, host: self.options.host, path: path})
							.done(function(r){
								if(r.status === 'OK'){
									self._moveActiveLink($this, 'down');
									
									self._removeFile($this);
								}
								else{
									alert("Failed deleting "+path+". Error: "+r.error);
								}
							})
							.fail(function(e){
								self._error({
									friendlyError: 'Fatal error deleting file.  This is usually a server side error.  Try refreshing the page.  If the action still fails send an error report, thank you.',
									technicalError: e,
									location: 'delete file server error, host: '+self.options.host+', path: '+path
								});
							});
					}
					else{						
						return false;
					}
				});
			};
			
			if(self._showDeleteConfirm){
				var $dContent = $('<div>Are you sure you want to delete: <b>'+($a.length > 1 ? $a.length+' items' : $a.attr('rel'))+'</b>?<div id="fileTree-dontShow">Don\'t show this message again<input type="checkbox" id="fileTree-deleteConfirmation"/></div></div>')
									.click(function(e){e.stopPropagation()})
									
				self._toggleDialog({
					title: "Delete confirmation",
					modal: true,
					resizable: false,
					buttons: {
						Delete: function(e){
							e.stopPropagation();
							
							if($('#fileTree-deleteConfirmation').is(":checked")){
								self._showDeleteConfirm = false;	
							}
							
							d();
							
							$(this).dialog('close');
						},
						Cancel: function(e){
							//Stop propagation so it doesnt unhilight potentially selected items
							e.stopPropagation();
							
							$(this).dialog('close');
							
							self.$fileTreeContainer.find('a.ui-state-active').focus();
						}
					}
				},
				$dContent);
				
				//stop propagation so it doesnt de-select selected file tree items
				self.$dialog.click(function(e){					
					e.stopPropagation();
				})
			}
			else{
				d();
			}
        },
		
		_showDeleteConfirm: true,
            
        _refreshCurrentDir: function($a){
            var parentTree = $a.parents('.fileTree-tree:first'),
                parentLink = parentTree.prev('a'),
                parentContainer = parentTree.parent('li');
            
            if(parentLink.length > 0){                
                this._showTree(parentContainer, escape(parentLink.attr('rel')));    
            }
            else{                
                this._clearTree();
                
                this._showTree(this.$fileTreeContainer, escape(this._currentDirectory), true);
            }
        },
        
        _makeRoot: function(el){
            var self = this,
				$a = $(el);
            
			if(!this._illegalName($a.attr('rel'), 'make root')){
				this._clearTree();
				
				this._showTree(this.$fileTreeContainer, escape($a.attr('rel')), true)
					.done(function(){
						self._moveActiveLink(undefined, 'init');
					})
			}
        },
        
        _refreshView: function(el){
            var self = this,
				$a = $(el),
                $li = $a.parent()
            
			if(!this._illegalName($a.attr('rel'), 'refresh view')){
				if($a.is(this.$fileTreeContainer)){				
					this._refresh();   
				}
				else if($li.hasClass('file') || !$li.length){				
					this._clearTree();
					
					this._showTree(this.$fileTreeContainer, escape(this._currentDirectory), true)
						.done(function(){
							self._moveActiveLink(undefined, 'init');
						});
				}
				else if($li.hasClass('expanded')){				
					this._showTree($li, escape($a.attr('rel')));
				}
			}
        },
        
        _hoverable: function($elem){
			$elem.unbind('hover.hoverable');
			
            return $elem
                .bind('hover.hoverable', function(){
                    $(this).toggleClass("ui-state-hover");
                })
                .css({cursor: 'pointer'});	
        },
        
        _doubleClickListener: function($a, $li, directory){
			var self = this;
			
            if($li.hasClass('directory')){							
                this.element.find('.fileTree-tree').remove();

                this._currentDirectory = directory;

                this._showTree(this.$fileTreeContainer, escape(directory), true)
					.done(function(){
						self._moveActiveLink(undefined, 'init');
					});

                this._trigger('dirDoubleClick', undefined, directory);
            }
            else{
                this._trigger('fileDoubleClick', undefined, $a.attr('rel'));                    
            }
        },
        
        _folderEventListener: function($a, $li, directory, removeActive){
            var options = this.options,
				hadClass = $a.hasClass('ui-state-active');
            
			if(removeActive){
                if(options.toggleOnClick || !hadClass){
                    this.$fileTreeContainer.find('a').removeClass('ui-state-active');
                }
			}
			
			if(!hadClass || $li.hasClass('collapsed')){
				$a.addClass('ui-state-active');
			}
			else{
				$a.blur();
			}
			
            if($li.hasClass('directory')){						
                if($li.hasClass('collapsed')){
                    this._expandFolder($li, directory);
                }
                else {					
                    this._collapseFolder($li);
                }

                this._trigger('dirSelect', undefined, directory);
            }
            else {                
                this._trigger("fileSelected", undefined, $a.attr('rel'));							
            }            
        },
		
		_getActiveLink: function(){
			return this.$fileTreeContainer.find("a.ui-state-active");
		},
        
        _expandFolder: function($li, directory){
            var options = this.options;
            
            if(!options.multiFolder){
                $li.parent()
                    .find('ul').slideUp({ duration: options.collapseSpeed, easing: options.collapseEasing }).end()
                    .find('li.directory').removeClass('expanded').addClass('collapsed');
            }

            $li.removeClass('collapsed').addClass('expanded').find('ul').remove(); // cleanup

            this._showTree($li, escape(directory)); 
        },
        
        _collapseFolder: function($li){
            var options = this.options;
            
            $li
                .find('ul').slideUp({ duration: options.collapseSpeed, easing: options.collapseEasing }).end()
                .removeClass('expanded').addClass('collapsed');
        },
        
        _truncateString: function(string){
            var limit = this.options.dirLength,
                tmp = string.slice(0);
            
            if(tmp.length > limit){
                tmp = $('<span>'+tmp.slice(0, limit-3)+' <span class="linkDiv" id="moreString" title="'+string+'">...</span></span>');
            }
            
            return tmp;
        },
		
		changeDirectory: function(dir, host){
			this._clearTree();                
            
            if(host){
                this.options.host = host;
                this.element.find("#fileTree-switchHostSelect").val(host);
            }
            
            if(this.transferHosts){
                dir = this._replaceHomeSpecialWords(dir);
            }
            
            return this._showTree(this.$fileTreeContainer, escape(dir), true);
		},
        
        currentDirectory: function(){
            return this._currentDirectory;
        },
        
        _buildMarkup: function(){
            var element = this.element;
            
			if(element.is("input[type='text']")){
				var $browse = this._buildBrowseLink();

				element.after($browse);			
			}
			else{
				$.tmpl(this._template, {
					currentDir: '',
					loadMessage: this.options.loadMessage,
					hostList: this.options.hostList
				})
				.appendTo(element);
				
				this.$fileTreeContainer = element.find("#fileTree-container");
			}            
        },
        
		_buildBrowseLink: function(){
			var self = this,
				$tree = $("<div></div>");
				
			self.element = $tree;
				
			$.tmpl(this._template, {
				currentDir: '',
				selectFields: true,
				loadMessage: this.options.loadMessage
			})
			.appendTo($tree);
			
			this.$fileTreeContainer = $tree.find("#fileTree-container");
			
			this.options.dirSelect = function(e, dir){
				$("#fileTree-inputSelection").val(dir);
			};
			
			this.options.dirDoubleClick = function(e, dir){
				$(self.options.textField).val(dir).trigger('change');
				
				self.$dialog.dialog('close');
			};
			
			var $link = $('<a class="fileTree-browseLink" href="#">browse</a>')
				.click(function(){
					self.$dialog.find('.fileTree').detach();
					
					self._toggleDialog({
						title: "Browse Directory",
						width: "600",
						buttons: {
							Select: function(){
								$(self.options.textField).val($("#fileTree-inputSelection").val()).trigger('change');
								
								$(this).dialog('close');
							},
							Cancel: function(){								
								$(this).dialog('close');
							}
						}
					}, $tree);
					
					return false;
				});
				
			return $link;
		},
		
        _setOption: function(key, value) {
			$.Widget.prototype._setOption.apply(this, arguments);
			
			if(key === 'jumpToOpts'){
				this._buildJumpTo();
			}			
        },
        
        _sendRequest: function(params){
            var self = this;
            
            return $.ajax({
                url: self.options.handler,
                data: params,
				type: 'POST',
				timeout: 30000
            })
            .fail(function(e){
                self._trigger("error", undefined, e);   
            });  
        },
		
		_error: function(err){			
			$errorPrompt.prompt('error', err);
        },
        
        _contextMenuDir:
            '<ul id="fileTree-menuDir" class="fileTree-menu ui-widget ui-state-default contextMenu">\
                <li><a href="#root">Make This Folder Root</a></li>\
                <li><a href="#refresh">Refresh View</a></li>\
				<li class="separator"><a href="#rename">Rename</a></li>\
				<li><a href="#getInfo">Get Info</a></li>\
                <li class="separator fileTree-newFile"><a href="#newFile">New File</a></li>\
                <li><a href="#newFolder">New Folder</a></li>\
				<li class="separator"><a href="#cut">Cut</a></li>\
                <li><a href="#copy" class="fileTree-copyFile">Copy</a></li>\
                <li class="ui-state-disabled fileTree-paste"><a href="#paste">Paste</a></li>\
                <li class="separator"><a href="#delete">Delete</a></li>\
            </ul>',
			
		_contextMenuRoot:
		'<ul id="fileTree-menuRoot" class="fileTree-menu ui-widget ui-state-default contextMenu">\
			<li><a href="#refresh">Refresh View</a></li>\
			<li class="separator fileTree-newFile"><a href="#newFile">New File</a></li>\
			<li><a href="#newFolder">New Folder</a></li>\
			<li class="separator ui-state-disabled fileTree-paste"><a href="#paste">Paste</a></li>\
		</ul>',
        
        _contextMenuFile:
            '<ul id="fileTree-menuFile" class="fileTree-menu ui-widget ui-state-default contextMenu">\
                <li><a href="#cut">Cut</a></li>\
                <li><a href="#copy" class="fileTree-copyFile">Copy</a></li>\
                <li class="ui-state-disabled fileTree-paste"><a href="#paste">Paste</a></li>\
				<li class="separator"><a href="#rename">Rename</a></li>\
				<li><a href="#getInfo">Get Info</a></li>\
                <li class="separator"><a href="#download">Download</a></li>\
				<li><a href="#open">Open</a></li>\
                <li><a href="#delete">Delete</a></li>\
            </ul>',
        
        _template:
            '<div id="fileTree-wrapper" class="lorenzWidgets-fileTree ui-widget ui-widget-content ui-helper-clearfix ui-corner-all">\
				{{if selectFields}}\
				<div id="fileTree-selectFields">\
					<input type="text" id="fileTree-inputSelection"/>\
				</div>\
				{{/if}}\
                <div id="fileTree-iconContainer" class="ui-widget-header ui-helper-clearfix ui-corner-all">\
                    <div id="fileTree-homeIcon" class="ui-state-default ui-corner-all fileTree-icon" title="To Home Directory">\
                        <span class="ui-icon ui-icon-home"></span>\
                    </div>\
                    <div id="fileTree-rootIcon" class="ui-state-default ui-corner-all fileTree-icon" title="To Root Directory">\
                        <span class="ui-icon ui-icon-arrowthickstop-1-n"></span>\
                    </div>\
                    <div id="fileTree-parentIcon" class="ui-state-default ui-corner-all fileTree-icon" title="To Parent Directory">\
                        <span class="ui-icon ui-icon-arrowthick-1-n"></span>\
                    </div>\
                    <div id="fileTree-refreshIcon" class="ui-state-default ui-corner-all fileTree-icon" title="Refresh Current Directory">\
                        <span class="ui-icon ui-icon-arrowrefresh-1-n"></span>\
                    </div>\
                    <div id="fileTree-hiddenIcon" class="ui-state-default ui-corner-all fileTree-icon" title="Toggle Hidden Files">\
                        <span class="ui-icon ui-icon-locked"></span>\
                    </div>\
					<div id="fileTree-sortIcon" class="ui-state-default ui-corner-all fileTree-icon" title="Sort Files Ascending/Descending">\
                        <span class="ui-icon ui-icon-arrowthick-2-n-s"></span>\
                    </div>\
					<div id="fileTree-folderIcon" class="ui-state-default ui-corner-all fileTree-icon" title="Add Folder">\
                        <span class="ui-icon ui-icon-folder-collapsed"></span>\
                    </div>\
					<div id="fileTree-fileIcon" class="ui-state-default ui-corner-all fileTree-icon" title="Add File">\
                        <span class="ui-icon ui-icon-document"></span>\
                    </div>\
					<div id="fileTree-trashIcon" class="ui-state-default ui-corner-all fileTree-icon" title="Delete File(s)/Folder(s)">\
                        <span class="ui-icon ui-icon-trash"></span>\
                    </div>\
					<div id="fileTree-helpIcon" class="ui-state-default ui-corner-all fileTree-icon" title="Keyboard Shortcuts">\
                        <span class="ui-icon ui-icon-help"></span>\
                    </div>\
                    <span style="float:right">Jump To: <select id="fileTree-jumpToOpts"></select></span>\
                </div>\
                <div id="fileTree-detailPane"><table><tr><td><select id="fileTree-switchHostSelect">{{each hostList}}<option value="${$value}">${$value}</option>{{/each}}</select></td><td style="padding-right: 6px; width:100%;"><input type="text" id="fileTree-currentDirectory" value="${currentDir}" style="width: 100%"/></td><td><button id="fileTree-getHistory">&nbsp;</button></td></tr></table></div>\
                <div id="fileTree-container">\
                </div>\
            </div>'
    });
}(jQuery));
