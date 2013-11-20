/*
scrollTable.js - jquery plugin to make vertical scrolling tables
deps: jquery tmpl, jquery ui widget factory, jquery
*/
(function($) {
    $.widget("lorenzUtils.scrollTable", {
        options: {
            data: [],
            headers: [],
            maxHeight: 300
        },
        
        _create: function(){
            var element = this.element;
            
            element.append(this.buildTable());
            
            this.$container = element.find('.scrolltable-container');
            
            if(this.options.maxHeight && this.$container.height() > this.options.maxHeight){
                this.$container.css('height', this.options.maxHeight+'px');
            }
        },
        
        buildTable: function(){
            return $.tmpl(this.table, {
                headers: this.options.headers,
                rows: this.options.data 
            });
        },
        
        _setOption: function(){
            $.Widget.prototype._setOption.apply( this, arguments );
        },
        
        destroy: function(){
            $.Widget.prototype.destroy.call( this );
        },
        
        table:
            '<div class="scrolltable-container">'+
                '<table width=100% class="scrolltable">'+
                    '<thead>'+
                        '<tr>'+
                            '{{each headers}}'+
                                '<th class="ui-state-default">'+
                                    '${$value}'+
                                '</th>'+
                            '{{/each}}'+
                        '</tr>'+
                    '</thead>'+
                    '<tbody>'+
                        '{{each rows}}'+
                            '<tr>'+
                                '{{each $value}}'+
                                    '<td class="ui-widget-content">${$value}</td>'+
                                '{{/each}}'+
                            '</tr>'+
                        '{{/each}}'+
                    '</tbody>'+
                '</table>'+
            '</div>'
    });
}(jQuery));