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
    $.widget("lorenz.news", $.lorenzSuper.portlet, {
        // These options will be used as defaults    
        options: { 
            displayName: 'news',
            mySettings: {
                
            }
        },
        
        readStore: 'portletConf/news/readConfv2',

        //Required function, must return an array of data sources.  "Sources" can be either deferred promises
        //or static data sources: strings, numbers, functions that return something, objects, arrays, etc...
        data: function(){
            return [ this.oLorenz.getNews(), this.oLorenz.storeRead(this.readStore) ];
        },
        
        render: function(response, readConf){
            var obj = this,
				news = response.newsItems,
				$ul = obj._buildNewsLinks(news),
				dateColumn = '<span class="portlet-col-header">title</span><span class = "portlet-col-header portlet-floatRight">date modified</span>';
				
            obj.$wrapper.addClass('portlet-newsWrapper').append(dateColumn, $ul);
            
            obj._checkReadItems(readConf, news);
        },
        
        _buildNewsLinks: function _buildNewsLinks(newsItems){
			var obj = this,
				$ul = $('<ul class="portlet-newsList"></ul>');
            
            for(var i = 0, il = newsItems.length; i < il; i++){
                var newsItem = newsItems[i],
					item = newsItem.item,
					$item = $('<span class = "portlet-newsArticle">'+item+'</span>').click(item, function(e){
						obj.oLorenz.getNewsItem(e.data, {context: obj}).done(obj._showNewsDialog);
						
						// Selector called this way to handle ids with periods in them
						$(this).parent('li')
							.addClass('portlet-newsRead')
							.data("readNewsItem", { title: e.data, read: obj._formatDate(new Date()) });
						
						obj._updateReadItems();
					}),					
					$li = $('<li class="portlet-newsListItem" id='+item+'><span class="portlet-floatRight">'+newsItem.update_time.split(' ')[0]+'</span></li>')
						.prepend($item);
				
                $ul.append($li);
            }
			
			return $ul;
		},
		
		_formatDate: function(date){
			return date.getFullYear()+"-" +this._padZeros(date.getMonth()+1)+"-"+this._padZeros(date.getDate())+ " "+this._padZeros(date.getHours())+":" +this._padZeros(date.getMinutes())+ ":"+this._padZeros(date.getSeconds());
		},
		
		_checkReadItems: function(data, newsItems){			
			if(data !== ""){
				data = JSON.parse(data),
				$ul = $('ul.portlet-newsList');
				
				for(var i = 0, il = newsItems.length; i < il; i++){
					var newsItem = newsItems[i],
						item = newsItem.item,
						lastRead = data[item],
						update_time = newsItem.update_time,
						tmp;
					
					if(lastRead !== undefined){
						tmp = [];
						
						tmp.push(lastRead, update_time);
						
						if(tmp.sort()[0] === update_time){
							$ul.find('li[id="'+item+'"]')
								.data("readNewsItem", {
									title: item,
									read: lastRead
								}).addClass('portlet-newsRead');
						}
					}
				}
			}
		},
		
		_updateReadItems: function(){
			var o = {};
				
			$('ul.portlet-newsList li.portlet-newsRead').each(function(index, value){
				var readData = $(value).data("readNewsItem");
				o[readData.title] = readData.read;
			});
			
			this.oLorenz.storeWrite(this.readStore, { context: this, data: JSON.stringify(o) });
		},
        
        _showNewsDialog: function(response){
            var html = 'No news data available.';
            
            if(response.news){
                html = response.news;
            }
            
            this._toggleDialog({title: 'News for '+response.item, width: 'auto'} , '<pre>'+html+'</pre>');
			
			var nice = this._getNiceDims(850, 600);
			
			this.$dialog.dialog('option', { width: nice.width, height: nice.height });
			
			this.$dialog.dialog('option', 'position', 'center');
        }
    });
}(jQuery));
