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
    var $bodyRow = $("#bodyRow"),
        $paramRow = $("#paramDataRow"),
        $addParam = $("#addParam"),
        $removeParam = $("#removeParam"),
        $submit = $("#test-submit").button(),
        $saveAs = $("#test-save").button(),
        $saveAsInput = $("#test-saveAs"),
        $loadExistingSelect = $("#test-loadExisting"),
        $load = $("#test-load").button(),
        $procData = $('#test-processData'),
        $kv = $('.keyValDiv'),
        $kvc = $('.keyValCol'),
        $out = $("#test-output"),
        endpoints = [],
        $url = $("#test-url"),
        hover = false,
        $table = $('.testLoraTable'),
        oLorenz = Object.create(Lorenz),
        testLoraConf = {autoSaves: {}, userSaves: {}};
    
    updateExistingSelect();
    
    $kv.find(":input").keyup(function(e){
        var $in = $(this),
            $p;
        
        if(e.which === 13 && e.shiftKey){
            $addParam.click();
            return false;
        }
        else if(e.which === 8 && e.shiftKey){            
            $p = $in.parent('.keyValDiv');
            
            if($p.siblings().length > 0){
                if($p.remove());
                
                focusFirstParamKey();
            }
            
            return false;   
        }
    });
    
    $saveAsInput.keyup(function(e){
        if(e.which === 13){
            $saveAs.click();
            return false;
        }
    });
    
    $saveAs.click(function(){
        var found = false,
          name = $.trim($saveAsInput.val());
        
        if(/\W/.test(name)){
            $saveAsInput.blur();
            alert('Found non-word character in save name.  Only alphanumeric plus underscore is allowed.');
        }
        else if(name !== ''){
            $loadExistingSelect.find("option").each(function(){
                if(name === $(this).text()){
                    found = true;
                    return false;
                }
            });
            
            if(!found){
                writeFormData(name);                
            }
            else{
                alert("Found duplicate named configuration.  This name must be unique.");
            }
        }        
    })
    .keyup(function(e){
        if(e.which === 13){
            return false;
        }
    });
    
    function writeFormData(name, quiet, autoSave){
        var data = exportFormData(),
            created = new Date().valueOf();
       
        if(quiet === undefined || quiet === false){
            showLoadingScreen();    
        }
        
        if(autoSave !== undefined && autoSave === true){
            data.autoSave = 1;
            
            if(noDuplicateConfs(data)){       
                name = generateAutoSaveName(data, created);

                truncateAutoSaves();
                
                testLoraConf.autoSaves[name] = {created: created, form: data};
                
                writeToConfStore(name, autoSave);
            }
        }
        else{
            testLoraConf.userSaves[name] = {created: created, form: data};
            
            writeToConfStore(name);
        }
    }
    
    function truncateAutoSaves(){
        var $options = $loadExistingSelect.find('#test-loadExisting-autoSaved option');

        if($options.length > 9){
            var toRemove = $options.first(),
                name = toRemove.val();
            
            delete testLoraConf.autoSaves[name];
            
            toRemove.remove();
        }
    }
    
    function generateAutoSaveName(data, created){
        var d = new Date(parseInt(created)),
            dateStr =  (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(),
            timeStr = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds(),
            url = encodeHtml(data['test-url']);
        
        return (url === '' ? '/' : url) + ' ['+data['test-httpVerb']+'] ' + dateStr + ' ' + timeStr;
    }
    
    function encodeHtml(html){
        html = html.replace(/</g, '&lt;');
        
        html = html.replace(/>/g, '&gt;');
        
        return html;
    }
    
    function noDuplicateConfs(data){
        var noDuplicates = true,
            autoSaves = testLoraConf.autoSaves;
        
        for(var confs in autoSaves){
            if(JSON.stringify(autoSaves[confs].form) === JSON.stringify(data)){
                noDuplicates = false;
                break;
            }
        }
        
        return noDuplicates;
    }
    
    function writeToConfStore(name, autoSave){            
        oLorenz.storeWrite('loraTestConf', {
            data: JSON.stringify(testLoraConf)
        })
        .done(function(){
            $saveAsInput.val('');
            
            addToSelect(name, autoSave);
        })
        .always(hideLoadingScreen);
    }
    
    function exportFormData(){
        var data = {parameters: []};
        
        $table.find(":input").each(function(){
            var $input = $(this);
            
            if(!$input.hasClass('test-param-value') && this.nodeName.toLowerCase() !== 'button'){
                if($input.hasClass('test-param-key')){
                    data.parameters.push({'test-param-key': $input.val(), 'test-param-value': $input.siblings('input.test-param-value:first').val()});
                }
                else{
                    if($input.is(":checkbox")){
                        data[this.id] = $input.is(":checked") ? 1 : 0;   
                    }
                    else{
                        data[this.id] = $input.val();    
                    }                            
                }
            }                    
        });
        
        return data;
    }
    
    $load.click(function(){
        var $selected = $loadExistingSelect.find('option:selected'),
            $parent = $selected.parent('optgroup'),
            name = $selected.val();
        
        if(name !== 'noneAvailable'){
            if($parent[0].id === 'test-loadExisting-autoSaved'){
                loadConf(testLoraConf.autoSaves[name].form);
            }
            else{
                loadConf(testLoraConf.userSaves[name].form);
            }
        }
    });
    
    $url.one('focus', function(){
        $url.select();   
    }).focus();
    
    $('#testLora').delegate(':input:not(textarea)', 'keyup', function(e){        
        if(e.which === 13 && hover === false){
            $submit.click();
        }
        
        hover = $url.autocomplete('widget').find('.ui-state-hover').length > 0;
    });
    
    Lorenz.getLoraEndpoints()
        .done(function(r){
            endpoints = r;
            
            initUrlAutoComplete();
        });
    
    $procData.click(function(){
        updateDisabledRows();
    });
    
    function updateDisabledRows(){
        if($procData.is(":checked")){
            $bodyRow.addClass('ui-state-disabled').find(':input').prop('disabled', true);
            $paramRow.removeClass('ui-state-disabled').find(':input').prop('disabled', false);
        }
        else{        
            $paramRow.addClass('ui-state-disabled').find(':input').prop('disabled', true);
            $bodyRow.removeClass('ui-state-disabled').find(':input').prop('disabled', false);
        }
    }
    
    $addParam.click(function(){
        $kvc.append($kv.clone(true).find(":input").val('').end());
        
        focusFirstParamKey();
    })
    .hover(function(){
        $addParam.toggleClass('ui-state-hover');
    });

    $removeParam.click(function(){
        var divs = $kvc.find('.keyValDiv');
        
        if(divs.length > 1){
            divs.last().remove();
            
            focusFirstParamKey();
        }
        else if(divs.length === 1){
            focusFirstParamKey();
        }
    })
    .hover(function(){
        $removeParam.toggleClass('ui-state-hover');
    });
    
    $submit.click(function(){
        var url = $('#test-url').val(),
            verb = $('#test-httpVerb').val(),
            procData = $('#test-processData').is(":checked"),
            params = {};
            
        if(procData === false){
            params = $('#test-entityBody').val();            
        }
        else{
            $kvc.find('.keyValDiv').each(function(){
                var $d = $(this),
                    k = $.trim($d.find('input.test-param-key').val()),
                    v = $.trim($d.find('input.test-param-value').val()),
                    tmp;
                
                if(k !== ''){
                    //If they have duplicate keys lets convert it to an array, or push onto it if its already an array
                    if(params[k] !== undefined){
                        if($.isArray(params[k])){
                            params[k].push(v);
                        }
                        else{
                            tmp = params[k];
                            
                            params[k] = [];
                            
                            params[k].push(v, tmp);
                        }
                    }
                    else{
                        params[k] = v;   
                    }                    
                }                
            });
        }
        
        $out.empty().addClass('loading');
        
        $.ajax({
            url: 'lora.cgi'+url,
            type: verb,
            processData: procData,
            data: params
        })
        .done(function(r){
            autoSaveConf();
        })
        .always(function(r){
            $out.removeClass('loading').empty().append(syntaxHighlight(r));
        })
    });
    
    function focusFirstParamKey(){
        var found = false,
            $keys = $kvc.find(":input");
        
        $keys.each(function(){
            $in = $(this);
            
            if($in.val() === ''){
                $in.focus();
                
                found = true;
                
                return false;
            }
        });
        
        if(!found){
            $keys.eq(0).focus().select();
        }
    }
    
    function autoSaveConf(){
        var options = $loadExistingSelect.find('option.autoSave');
        
        if(options.length > 9){
            options.eq(0).remove();
        }
        
        writeFormData(undefined, true, true);
    }
    
    function loadConf(c){
        var keyDivs = $('.keyValDiv'),
            toAdd = 0,
            params = c.parameters,
            pLength = c.parameters.length,
            kLength = keyDivs.length,
            $field;
        
        if(pLength > 1 && kLength < pLength){
            toAdd = pLength - kLength;
            
            for(var i = 0, il = toAdd; i < il; i++){
                $addParam.click();
            }
        }
        
        keyDivs = $('.keyValDiv');
        
        for(var field in c){
            if(field === 'parameters'){
                for(var j = 0, jl = pLength; j < jl; j++){
                    keyDivs.eq(j).find('.test-param-key').val(params[j]['test-param-key'])
                    
                    keyDivs.eq(j).find('.test-param-value').val(params[j]['test-param-value'])
                }
            }
            else{
                $field = $('#'+field);
                
                if($field.is(":checkbox")){
                    $field.prop("checked", (c[field] === 1 ? true : false));
                }
                else{
                    $field.val(c[field]);
                }
            }
        }
        
        updateDisabledRows();
    }
    
    function updateExistingSelect(){
        var autoSaves = {},
            userSaves = {};
            
        oLorenz.storeRead('loraTestConf')
            .done(function(r){
                if(r){
                    testLoraConf = JSON.parse(r);
    
                    autoSaves = testLoraConf.autoSaves;
                    
                    userSaves = testLoraConf.userSaves;
                    
                    for(var name in autoSaves){
                        addToSelect(name, true);
                    }
                    
                    for(var name in userSaves){
                        addToSelect(name);
                    }
                    
                    setDefaultSelected();
                }
            });            
    }
    
    function setDefaultSelected(){
        var $options = $loadExistingSelect.find('option');
        
        $options.each(function(){
            var $o = $(this);
           
            if($o.attr("value") !== 'noneAvailable'){
                $o.prop('selected', 'selected');
                return false;
            }
        });
    }
    
    function addToSelect(name, autoSave){
        var $userOptGroup = $loadExistingSelect.find('#test-loadExisting-userSaved'),
            $autoOptGroup = $loadExistingSelect.find('#test-loadExisting-autoSaved'),
            userOptions = $userOptGroup.find('option'),
            autoOptions = $autoOptGroup.find('option'),
            $option = $('<option value="'+name+'">'+name+'</option>'),
            $options,
            $group;
        
        if(autoSave){
            $options = autoOptions;            
            $group = $autoOptGroup;
        }
        else{
            $options = userOptions;            
            $group = $userOptGroup;
        }
        
        if($options.length === 1 && $options.eq(0).attr("value") === 'noneAvailable'){
            $group.empty();            
        }
        
        $group.append($option);       
    }
    
    function initUrlAutoComplete(){
        $url.autocomplete({
            source: endpoints
        });
    }
    
    function syntaxHighlight(json) {
        if (typeof json != 'string') {
             json = JSON.stringify(json, undefined, 2);
        }
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            var cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

})(jQuery);