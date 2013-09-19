/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var queueSchemaModel = [
    {field:"progress", type:"number" },
    {field:"ttl", type:"number" },
    {field:"count", type:"number" }
];

var objectIdsMap = {};

var serializer = new XMLSerializer(),
    domParser = new DOMParser(),
    loadingOTGridColumns = [
        { field:"MessageTS", title:"Time", width:"210px" },
        { field:"Source", title:"Source", width:"210px" },
        { field:"ModuleId", title:"Module Id", width:"210px" },
        { field:"Xmlmessage", title:"Log" }
    ],
    flowClassFields = ['sourcevn', 'destvn', 'sourceip', 'destip', 'sport', 'dport', 'protocol'],
    placeHolders = {"Xmlmessage": ["Use RegEx= operator to search Xmlmessage"], "ObjectLog": ["Use RegEx= operator to search ObjectLog"], "SystemLog": ["Use RegEx= operator to search SystemLog"], "protocol_sport":["Protocol", "Any Source Port"], "protocol_dport":["Protocol", "Any Destination Port"], "sourcevn_sourceip":["Source VN", "Any Source IP"], "destvn_destip":["Destination VN", "Any Destination IP"] },
    flowWhereFields = [
        {"name":"Source VN, Source IP", "value":"sourcevn_sourceip"},
        {"name":"Dest. VN, Dest. IP", "value":"destvn_destip"},
        {"name":"Protocol, Source Port", "value":"protocol_sport"},
        {"name":"Protocol, Dest. Port", "value":"protocol_dport"}
    ],
    chartColors = [ "#0069a5", "#0098ee", "#76b800", "#ffae00", "#e34a00", "#7030a0", "#515967", "#d8e404", "#002060", "#a8a8a8"];
//chartColors = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f","#bcbd22","#17becf"];
var slSchemeFields = {
    MessageTS:{ type:"string" },
    Messagetype:{ type:"string" },
    ModuleId:{ type:"string" },
    Source:{ type:"string" },
    Level:{ type:"string"},
    Xmlmessage:{ type:"string" }
};

var otSchemeFields = {
    MessageTS:{ type:"string" },
    Source:{ type:"string" },
    ModuleId:{ type:"string" },
    SystemLog:{ type:"string" }
};

var slColumnsDisplay = [
    {
        field:"MessageTS",
        title:"Time",
        width:"210px",
        template:"#= (MessageTS && MessageTS!='')  ? (formatMicroDate(MessageTS)) : '' #",
        attributes:{style:"vertical-align:top;"},
        filterable:false,
        groupable:false
    },
    {
        field:"Source",
        title:"Source",
        width:"150px",
        template:"#= handleNull4Grid(Source)#",
        attributes:{style:"vertical-align:top;"}
    },
    {
        field:"ModuleId",
        title:"Module Id",
        width:"150px",
        template:"#= handleNull4Grid(ModuleId)#",
        attributes:{style:"vertical-align:top;"}
    },
    {
        field:"Category",
        title:"Category",
        width:"150px",
        template:"#= handleNull4Grid(Category)#",
        attributes:{style:"vertical-align:top;"}
    },
    {
        field:"Messagetype",
        title:"Log Type",
        width:"250px",
        template:"#= handleNull4Grid(Messagetype)#",
        attributes:{style:"vertical-align:top;"}
    },
    {
        field:"Level",
        title:"Level",
        width:"150px",
        hidden:true,
        template:"#= getLevelName4Value(Level) #",
        attributes:{style:"vertical-align:top;"}
    },
    {
        field:"Xmlmessage",
        title:"Log",
        template:"#= formatXML2JSON(Xmlmessage)#",
        width:"400px",
        sortable:false,
        filterable:false,
        groupable:false
    }
];

var queryQueue = {
    fqq:{},
    lqq:{}
};

function getQueueColumnDisplay(queueId) {
    return [
        {field:"startTime", title:"Date", width:150, template:"#= kendo.toString(new Date(startTime), 'yyyy-MM-dd HH:mm:ss') #"},
        {field:"queryJSON", title:"Query", template:"#= JSON.stringify(queryJSON, null, 1) #", sortable:false, id:'queryTip'},
        {field:"progress", title:"Progress", width:100, format:"{0}%"},
        {field:"count", title:"Records", width:100},
        {field:"status", title:"Status", width:100},
        {field:"errorMessage", hidden:true},
        {field:"timeTaken", title:"Time Taken", width:120, template:"#= ((timeTaken == -1) ? '-' : (parseInt(timeTaken) + ' secs')) #", sortable:false},
        {field:"", menu: false, attributes: { "class": "table-cell" }, width: 50, template: "#= getQueueActionColumn(\'" + queueId + "\', status, queryId, errorMessage)#"}
    ];
};

function getQueueActionColumn(queueId, status, queryId, errorMessage) {
    var queueId4Redis = splitString2Array(queueId, "-")[0];
    var template = '<div class="inline position-relative">' +
        '<div class="dropdown-toggle" data-toggle="dropdown">' +
        '   <i class="icon-cog icon-only bigger-110"></i>' +
        '</div>' +
        '<ul class="dropdown-menu dropdown-icon-only dropdown-light pull-right dropdown-caret dropdown-close">';
    if(status != "error") {
        template += '<li>' +
            '<a onclick="viewQueryResult(\'' + queueId + '\', this);" class="tooltip-success" data-rel="tooltip" data-placement="left">' +
            '   <i class="icon-list-alt"></i> &nbsp; View Results' +
            '</a>' +
            '</li>';
    } else if(errorMessage != null) {
        template += '<li>' +
            '<a onclick="showInfoWindow(\'' + errorMessage + '\', \'Error\');" class="tooltip-success" data-rel="tooltip" data-placement="left">' +
            '   <i class="icon-exclamation-sign"></i> &nbsp; View Error' +
            '</a>' +
            '</li>';
    }
    template += '<li>' +
        '<a onclick="deleteQueryCache4Id(\'' + queueId + '\', this, \'' + queueId4Redis + '\', \'' + queryId + '\');" class="tooltip-success" data-rel="tooltip" data-placement="left">' +
        '   <i class="icon-trash"></i> &nbsp; Delete' +
        '</a>' +
        '</li>' +
        '</ul>' +
    '</div>';
    return template;
}

function createDTPicker(elementId, changeFunction, defaultTime) {
    return $("#" + elementId).kendoDateTimePicker({
        change:changeFunction,
        format:"MMM dd, yyyy hh:mm:ss tt",
        min:new Date(2013, 2, 1),
        value:defaultTime || new Date(),
        timeFormat:"hh:mm:ss tt",
        interval:10
    }).data("kendoDateTimePicker");
};

function deleteAppendedWhere(id) {
    $('#' + id).remove();
};

function viewQueryResult(gridId, e) {
    var dataItem = $('#' + gridId).data().kendoGrid.dataItem($(e).closest("tr")),
        tableName = dataItem.tableName;
    if (dataItem.progress == 100) {
        if (tableName == 'FlowRecordTable') {
            viewFRQueryResults(dataItem);
        } else if (tableName == 'FlowSeriesTable') {
            viewFSQueryResults(dataItem);
        } else if (tableName == 'MessageTable') {
            viewSLQueryResults(dataItem);
        }
    }
};

function deleteQueryCache4Queue(queueId) {
    var gridDataSource = $("#" + queueId + "-results").data('kendoGrid').dataSource;
    if (gridDataSource && gridDataSource._view.length != 0) {
        queryQueue[queueId].delConfirmWindow.data("kendoWindow").center().open();
    }
};

function successDelQueryQueueCache(response, cbParams) {
    var gridId = cbParams.gridId,
        queueId = cbParams.queueId;
    $('#' + gridId).data().kendoGrid.dataSource.read();
    showOnlyQueryQueue(queueId);
};

function showOnlyQueryQueue(queueId) {
    if(queueId == 'lqq') {
        $("#sl-query-widget").addClass('hide');
        $("#sl-result-widget").addClass('hide');
        $("#ot-query-widget").addClass('hide');
        $("#ot-result-widget").addClass('hide');
    } else {
        $("#fs-query-widget").addClass('hide');
        $("#fs-result-widget").addClass('hide');
        $("#fr-query-widget").addClass('hide');
        $("#fr-result-widget").addClass('hide');
    }
}

function failureDeleteQueryCache(error) {
    showInfoWindow("Error in clearing query queue: " + error, "Error");
};

function deleteQueryCache4Id(gridId, self, queueId, queryId) {
   var url = '/api/admin/reports/query';
   var postDataJSON = {queryQueue: queueId, queryIds: [queryId]};
   doAjaxCall(url, "DELETE", JSON.stringify(postDataJSON), "successDeleteQueryCache", "failureDeleteQueryCache", null, {gridId: gridId, queueId: queueId, self:self});
};

function successDeleteQueryCache(response, cbParams) {
    var gridId = cbParams.gridId, queueId = cbParams.queueId;
    $('#' + gridId).data().kendoGrid.removeRow($(cbParams.self).closest("tr"));
    showOnlyQueryQueue(queueId);
    check4GridEmpty("#" + gridId, "No query found in queue.");
};

function failureDeleteQueryCache(error) {
    showInfoWindow("Error in deleting query cache.", "Error");
};

function enableButton(elementId) {
    $("#" + elementId).removeAttr('disabled');
    $("#" + elementId).removeClass("k-state-disabled");
};

function disableButton(elementId) {
    $("#" + elementId).attr("disabled", "disabled");
    $("#" + elementId).addClass("k-state-disabled");
};

function clearGrid(elementId) {
    $("#" + elementId).html('');
};

function removeGridMessage(gridSel) {
    //$(grid.options.table).find('.no-record').remove();
    $(gridSel).find('.k-grid-content tbody').html('');
};

function openSelect(queryPrefix) {
    var query = queries[queryPrefix];

    if($('#' + queryPrefix + '-select-popup-container').length == 0){
        $('body').append(query.selectTemplate);
    }
    kendo.bind($('#' + queryPrefix + '-select-popup-container'), query.selectViewModel);
    query.selectWindow = $('#' + queryPrefix + '-select-popup-container');
    query.selectWindow.modal('show');
};

function openWhere(queryPrefix) {
    var query = queries[queryPrefix],
        whereClauseView = query.whereViewModel.get('whereClauseView'),
        whereClauseEdit = query.whereViewModel.get('whereClauseEdit'),
        selectedORClauseIndex = query.whereViewModel.get('selectedORClauseIndex');

    $('#' + queryPrefix + '-where-popup-container').remove();
    $('body').append(query.whereTemplate);
    query.whereWindow = $('#' + queryPrefix + '-where-popup-container');

    query.orClauseTemplate = kendo.template($('#' + queryPrefix + '-or-clause-template').html());
    query.editORClauseTemplate = kendo.template($('#' + queryPrefix + '-edit-or-clause-template').html());
    $('#' + queryPrefix + '-current-or-clause-pane').find('#' + queryPrefix + '-or-clauses').append(query.orClauseTemplate(whereClauseView));
    $('#' + queryPrefix + '-new-or-clause-pane').append(query.editORClauseTemplate(whereClauseEdit));
    kendo.bind($('#' + queryPrefix + '-where-popup-container'), query.whereViewModel);
    $('#' + queryPrefix + '-pane-container').kendoSplitter({
        orientation:"vertical",
        panes:[
            { collapsible:true, resizable:true, size:"200px" },
            { collapsible:true, resizable:true, size:"300px" }
        ]
    });
    $(".k-splitbar", '#' + queryPrefix + '-pane-container').css({ "border-color":" #ccc"});
    if (selectedORClauseIndex == -1) {
        loadWhereOptions(queryPrefix + '-first-where-clause', queryPrefix, selectedORClauseIndex);
    } else {
        for (var i = 0; i < whereClauseEdit.length; i++) {
            loadWhereOptions(queryPrefix + '-where-clause' + i, queryPrefix, selectedORClauseIndex);
        }
    }

    query.whereWindow.modal('show');
};

function selectORClause(queryPrefix, id) {
    var query = queries[queryPrefix],
        whereClauseEdit = [];
    if (id == -1) {
        $('#' + queryPrefix + '-new-or-clause-pane').html('');
        query.whereViewModel.set('whereClauseEdit', []);
        query.whereViewModel.set('selectedORClauseIndex', -1);
        $('#' + queryPrefix + '-new-or-clause-pane').append(query.editORClauseTemplate(whereClauseEdit));
        kendo.bind($('#' + queryPrefix + '-where-popup-container'), query.whereViewModel);
        loadWhereOptions(queryPrefix + '-first-where-clause', queryPrefix, id);
    } else {
        whereClauseEdit = query.whereViewModel.get('whereClauseSubmit')[id];
        $('#' + queryPrefix + '-new-or-clause-pane').html('');
        query.whereViewModel.set('whereClauseEdit', whereClauseEdit);
        query.whereViewModel.set('selectedORClauseIndex', id);
        $('#' + queryPrefix + '-new-or-clause-pane').append(query.editORClauseTemplate(whereClauseEdit));
        kendo.bind($('#' + queryPrefix + '-where-popup-container'), query.whereViewModel);
        for (var i = 0; i < whereClauseEdit.length; i++) {
            loadWhereOptions(queryPrefix + '-where-clause' + i, queryPrefix, id);
        }
    }
};

function openFilter(queryPrefix) {
    var query = queries[queryPrefix];

    if($('#' + queryPrefix + '-filter-popup-container').length == 0){
        $('body').append(query.filterTemplate);
    }
    query.filterWindow = $('#' + queryPrefix + '-filter-popup-container');
    kendo.bind($('#' + queryPrefix + '-filter-popup-container'), query.filterViewModel);
    query.filterWindow.modal('show');

};

function addSelect(queryPrefix) {
    var query = queries[queryPrefix];
    query.selectWindow.modal('hide');
    var selectedFields = $('#' + queryPrefix + '-select-popup-form').serializeArray(),
        selectValue = "", fieldValue, checkedFields = [];
    $.each(selectedFields, function (i, selectedFields) {
        fieldValue = selectedFields.value;
        checkedFields.push(fieldValue);
        selectValue += (i != 0 ? ", " : "") + fieldValue;
    });
    query.selectViewModel.set('checkedFields', checkedFields);
    $('#' + queryPrefix + '-select').val(selectValue);
};

function appendWhere(queryPrefix) {
    var query = queries[queryPrefix],
        appendAndClauseTemplate = kendo.template($('#' + queryPrefix + '-append-and-clause-template').html()),
        newId = "append-where-clause-" + query.whereCounter++,
        selectedORClauseIndex = query.whereViewModel.get('selectedORClauseIndex');
    $('#' + queryPrefix + '-where-clause').append(appendAndClauseTemplate);
    $('#' + queryPrefix + '-appended-and-clause').attr('id', newId);
    $('#' + newId).find('#' + queryPrefix + '-delete-new-and-clause').attr("onclick", "deleteAppendedWhere('" + newId + "');");
    $('#' + newId).find('#' + queryPrefix + '-new-and-clause-field').attr("onchange", "loadWhereOptions('" + newId + "', '" + queryPrefix + "');");
    kendo.bind($('#' + queryPrefix + '-where-popup-container'), query.whereViewModel);
    loadWhereOptions(newId, queryPrefix, selectedORClauseIndex);
};

function appendFilter(queryPrefix) {
    var query = queries[queryPrefix],
        appendFilterClauseTemplate = kendo.template($('#' + queryPrefix + '-append-filter-clause-template').html()),
        newId = "append-filter-clause-" + query.filterCounter++,
        selectedIndex = -1;
    $('#' + queryPrefix + '-filter-clause').append(appendFilterClauseTemplate);
    $('#' + queryPrefix + '-appended-filter-clause').attr('id', newId);
    $('#' + newId).find('#' + queryPrefix + '-delete-new-filter-clause').attr("onclick", "deleteAppendedWhere('" + newId + "');");
    $('#' + newId).find('#' + queryPrefix + '-new-filter-clause-field').attr("onchange", "loadFilterOptions('" + newId + "', '" + queryPrefix + "');");
    kendo.bind($('#' + queryPrefix + '-filter-popup-container'), query.filterViewModel);
    loadFilterOptions(newId, queryPrefix, selectedIndex);
};

function updateWhere(queryPrefix, query) {
    var whereClause = query.whereViewModel.get('whereClauseView'),
        whereClauseStr = "", whereClauseLength;
    whereClauseLength = whereClause.length;
    for (var i = 0; i < whereClauseLength; i += 1) {
        whereClauseStr += (i != 0 ? " OR " : "") + whereClause[i];
    }
    $('#' + queryPrefix + '-where').val(whereClauseStr);
};

function submitWhere(queryPrefix) {
    var query = queries[queryPrefix];
    query.whereWindow.modal('hide');
    updateWhere(queryPrefix, query);
};

function closePopupWindow(queryPrefix, windowName) {
    queries[queryPrefix][windowName].modal('hide');
    queries[queryPrefix][windowName].on('hidden', function(){
        $(this).remove();
    });
};

function addWhere(queryPrefix) {
    var query = queries[queryPrefix],
        fieldArray = [], opArray = [], valArray = [], val2Array = [],
        whereClauseArray = query.whereViewModel.get('whereClauseView'),
        whereClauseSubmitArray = query.whereViewModel.get('whereClauseSubmit'),
        whereClauseSubmit = [], whereClauseViewStr = "", i, length, whereForm, whereCurrentORClauses, splitFlowFieldArray = [];
    whereForm = $('#' + queryPrefix + '-where-popup-form');
    whereCurrentORClauses = $('#' + queryPrefix + '-current-or-clause-pane').find('#' + queryPrefix + '-or-clauses');
    whereForm.find("select[name='field[]']").each(function () {
        fieldArray.push($(this).val());
    });
    whereForm.find("select[name='operator[]']").each(function () {
        opArray.push($(this).val());
    });
    whereForm.find("input[name='value[]']").each(function () {
        valArray.push($(this).val());
    });
    if (queryPrefix == 'fs' || queryPrefix == 'fr') {
        whereForm.find("input[name='value2[]']").each(function () {
            val2Array.push($(this).val());
        });
    }
    length = fieldArray.length;
    for (i = 0; i < length; i += 1) {
        if (queryPrefix == 'fs' || queryPrefix == 'fr') {
            splitFlowFieldArray = fieldArray[i].split('_');
            whereClauseViewStr += (valArray[i] != '') ? (((i != 0 && whereClauseViewStr != '') ? " AND " : "") + splitFlowFieldArray[0] + " " + opArray[i] + " " + valArray[i]) : "";
            whereClauseViewStr += (val2Array[i] != '') ? (((whereClauseViewStr != '') ? " AND " : "") + splitFlowFieldArray[1] + " " + opArray[i] + " " + val2Array[i]) : "";
            whereClauseSubmit.push({field:fieldArray[i], operator:opArray[i], value:valArray[i], value2:val2Array[i] });
        } else {
            whereClauseViewStr += (valArray[i] != '') ? (((i != 0 && whereClauseViewStr != '') ? " AND " : "") + fieldArray[i] + " " + opArray[i] + " " + valArray[i]) : "";
            whereClauseSubmit.push({field:fieldArray[i], operator:opArray[i], value:valArray[i]});
        }
    }
    if (whereClauseViewStr != "") {
        whereClauseArray.push("(" + whereClauseViewStr + ")");
        whereClauseSubmitArray.push(whereClauseSubmit);
        whereCurrentORClauses.html('');
        whereCurrentORClauses.append(query.orClauseTemplate(whereClauseArray));
        whereForm.find("input[name='value[]']").each(function () {
            $(this).data('kendoComboBox').value('');
        });
        if (queryPrefix == 'fs' || queryPrefix == 'fr') {
            whereForm.find("input[name='value2[]']").each(function () {
                $(this).attr('value', '');
            });
        }
    }
    updateWhere(queryPrefix, query);
};

function editWhere(queryPrefix) {
    var query = queries[queryPrefix],
        whereViewArray = query.whereViewModel.get('whereClauseView'),
        whereSubmitArray = query.whereViewModel.get('whereClauseSubmit'),
        selectedORClauseIndex = query.whereViewModel.get('selectedORClauseIndex');
    whereViewArray.splice(selectedORClauseIndex, 1);
    whereSubmitArray.splice(selectedORClauseIndex, 1);
    addWhere(queryPrefix);
    orClause = $('#' + queryPrefix + '-current-or-clause-pane').find('#' + queryPrefix + '-or-clauses');
    orClause.html('');
    orClause.append(query.orClauseTemplate(whereViewArray));
    selectORClause(queryPrefix, -1);
};

function deleteWhereClause(clause, queryPrefix) {
    var query = queries[queryPrefix],
        whereViewArray = query.whereViewModel.get('whereClauseView'),
        whereSubmitArray = query.whereViewModel.get('whereClauseSubmit'),
        orClause, index;
    index = whereViewArray.indexOf(clause);
    whereViewArray.splice(index, 1);
    whereSubmitArray.splice(index, 1);
    orClause = $('#' + queryPrefix + '-current-or-clause-pane').find('#' + queryPrefix + '-or-clauses');
    orClause.html('');
    orClause.append(query.orClauseTemplate(whereViewArray));
    updateWhere(queryPrefix, query);
    selectORClause(queryPrefix, -1);
};

function addFilter(queryPrefix) {
    var query = queries[queryPrefix],
        selectedFields = $('#' + queryPrefix + '-filter-popup-form').serializeArray(),
        orderByValue = "", checkedFilters = [],
        sortOrder, limit, fieldValue;
    if (query.filterWindow != "") {
        query.filterWindow.modal('hide');
    }
    $.each(selectedFields, function (i, selectedFields) {
        if (selectedFields.name == 'sortBy') {
            fieldValue = selectedFields.value;
            checkedFilters.push(fieldValue);
            orderByValue += (orderByValue.length != 0 ? ", " : "sort_fields: [") + fieldValue;
        }
    });
    if (orderByValue != '') {
        orderByValue += "]";
        sortOrder = $("#" + queryPrefix + "-filter-popup-form select[name=sortOrder]").val();
        orderByValue += ", sort: " + sortOrder;
    }
    limit = $("#" + queryPrefix + "-filter-popup-form input[name=limit]").val();
    if (limit != null && limit.length > 0) {
        orderByValue += (orderByValue.trim() == '' ? '' : ', ') + "limit: " + limit;
    }
    query.filterViewModel.set('checkedFilters', checkedFilters);
    query.filterViewModel.set('limit', limit);
    query.filterViewModel.set('sortOrder', sortOrder);
    $("#" + queryPrefix + "-filter").val(orderByValue);
};

function setValidValues(url, viewModelKey, viewModels, responseField, addAny) {
    $.ajax({
        url:url,
        dataType:"json",
        success:function (response) {
            var count, validValues, validValueDS = addAny ? [
                {"name":"Any", "value":""}
            ] : [];
            responseField ? (validValues = response[responseField]) : (validValues = response);
            count = validValues ? validValues.length : 0;
            for (var i = 0; i < count; i += 1) {
                validValueDS.push({"name":validValues[i], "value":validValues[i]});
            }
            for (var j = 0; j < viewModels.length; j++) {
                viewModels[j].set(viewModelKey, validValueDS);
            }
        }
    });
};

function initObjectTypes() {
    var url = "/api/admin/tables", tableType, tableName, tableDisplayName;
    $.ajax({
        url:url,
        dataType:"json",
        success:function (response) {
            var tables, objectTables = [];
            tables = response;
            for (var i = 0; i < tables.length; i += 1) {
                tableType = tables[i]['type'];
                if(tableType && tableType == 'OBJECT') {
                    tableDisplayName = tables[i]["display_name"];
                    tableName = tables[i]["name"];
                    if(tableDisplayName == null) {
                        tableDisplayName = tableName;
                    }
                    objectTables.push({"name": tableDisplayName, "value": tableName});
                }
            }
            queries.ot.queryViewModel.set('objectTypes', objectTables);
            if(objectTables.length > 0) {
                setOTValidValues(objectTables[0]['value']);
            }
        }
    });
};

function setValidLevelValues(url, viewModelKey, viewModel) {
    $.ajax({
        url:url,
        dataType:"json",
        success:function (response) {
            var validValues, validValueDS = [];
            validValues = response;
            for (var i = 0; i < validValues.length; i += 1) {
                for (key in validValues[i]) {
                    validValueDS.push({"name":validValues[i][key], "value":key});
                }
            }
            viewModel.set(viewModelKey, validValueDS);
            viewModel.set('selectedLevel', validValueDS[7]);
        }
    });
};

function setColumnValues(url, viewModelKey, viewModels, responseField, ignoreValues, isIndexed, addValues) {
    var defaultIgnoreValues = ['Level', 'ObjectId', 'direction_ing'];
    ignoreValues = (ignoreValues != null) ? ignoreValues : defaultIgnoreValues;
    isIndexed = (isIndexed != null) ? isIndexed : true;
    $.ajax({
        url:url,
        dataType:"json",
        success:function (response) {
            var validValues, validValueDS = [];
            responseField ? (validValues = response[responseField]) : (validValues = response);
            for (var i = 0; i < validValues.length; i += 1) {
                if (validValues[i].index == isIndexed && ignoreValues.indexOf(validValues[i].name) == -1) {
                    validValueDS.push({"name":validValues[i].name, "value":validValues[i].name});
                }
            }
            validValueDS = addValues != null ? validValueDS.concat(addValues) : validValueDS;
            for (var j = 0; j < viewModels.length; j += 1) {
                viewModels[j].set(viewModelKey, validValueDS);
            }
        }
    });
};

function onQueryRequestStart(btnId) {
    disableButton(btnId);
};

function onQueryResult(gridId, message, status, queueId) {
    if (status != null && status == 'queued') {
        message = 'Your query has been queued.';
        queryQueue[queueId].confirmWindow.data("kendoWindow").center().open();
    } else {
        message = message ? message : 'No Records Found.';
    }
    var gridDataSource = $('#' + gridId).data('kendoGrid').dataSource;
    if (gridDataSource._view.length == 0) {
        showGridMessage('#' + gridId, message);
    }
    window.setTimeout(function () {
        var grid = $('#' + gridId).data('kendoGrid');
        if (grid != null && grid.dataSource._view.length == 0) {
            showGridMessage('#' + gridId, message);
        }
    }, 500);
};

function showMessagePopup(title, message) {
    var msgWindow;
    if (msgTemplate != null) {
        msgWindow = $("<div />").kendoWindow({
            title:title,
            resizable:false,
            modal:true,
            width:300
        });
        msgWindow.data("kendoWindow").content(msgTemplate({msg:message})).center().open();
        msgWindow.find("#confirm").click(function () {
            msgWindow.data("kendoWindow").close();
        }).end();
    } else {
        alert(message);
    }
};

function createConfirmWindow(queueId) {
    var kendoWindow = $("<div />").kendoWindow({
        title:"View Query Queue",
        resizable:false,
        modal:true
    });

    kendoWindow.data("kendoWindow").content($("#" + queueId + "-confirmation").html());

    kendoWindow.find("#" + queueId + "-confirm").click(function () {
        var menuObject;
        kendoWindow.data("kendoWindow").close();
        if(queueId == "lqq") {
            menuObject = menuHandler.getMenuObjByHash("query_log_queue");
            menuHandler.loadViewFromMenuObj(menuObject);
        } else if (queueId == "fqq") {
            menuObject = menuHandler.getMenuObjByHash("query_flow_queue");
            menuHandler.loadViewFromMenuObj(menuObject);
        }
    }).end();

    kendoWindow.find("#" + queueId + "-cancel").click(function () {
        kendoWindow.data("kendoWindow").close();
    }).end();

    return kendoWindow;
};

function createDeleteConfirmWindow(queueId) {
    var kendoWindow = $("<div />").kendoWindow({
        title:"Delete Confirmation",
        resizable:false,
        modal:true
    });

    kendoWindow.data("kendoWindow").content($("#" + queueId + "-del-confirmation").html());

    kendoWindow.find("#" + queueId + "-del-confirm").click(function () {
        var url = '/api/admin/reports/query/queue';
        var postDataJSON = {queryQueue: queueId};
        doAjaxCall(url, "DELETE", JSON.stringify(postDataJSON), "successDelQueryQueueCache", "failureDelQueryQueueCache", null, {gridId: queueId + "-results", queueId: queueId});
        kendoWindow.data("kendoWindow").close();
    }).end();

    kendoWindow.find("#" + queueId + "-del-cancel").click(function () {
        kendoWindow.data("kendoWindow").close();
    }).end();

    return kendoWindow;
};

function selectTab(elementId, negIndex) {
    var tabStrip = $(elementId).data("kendoTabStrip");
    tabStrip.select(tabStrip.tabGroup.children("li").length - negIndex);
};

function loadSLResults(options, reqQueryString) {
    var btnId = options['btnId'],
        grid = $('#' + options.elementId).data('kendoGrid'),
        reqFields;
    queryStr = reqQueryString;
    if (options.reqFields != null) {
        reqFields = options.reqFields;
        $.each(slSchemeFields, function (fieldName) {
            if ($.inArray(fieldName, reqFields) == -1)
                delete slSchemeFields[fieldName];
        });
        slColumnsDisplay = $.grep(slColumnsDisplay, function (obj, idx) {
            if ($.inArray(obj['field'], reqFields) > -1)
                return true;
            else
                return false;
        });
    }
    if (grid != null) {
        grid.destroy();
    }
    $("#" + options.elementId).contrailKendoGrid({
        dataSource:{
            transport:{
                read:{
                    url:function () {
                        return "/api/admin/reports/query?" + queryStr;
                    },
                    timeout:options.timeOut
                }
            },
            requestStart:onQueryRequestStart(btnId),
            error:function (xhr, error) {
                if ($('#' + options.elementId).data('kendoGrid') != null)
                    $("#" + options.elementId).data('kendoGrid').dataSource.data([]);
                showGridMessage('#' + options.elementId, 'Error in run query: ' + xhr.errorThrown);
                enableButton(btnId);
            },
            schema:{
                type:"json",
                model:{
                    fields:slSchemeFields
                },
                data:"data",
                total:"total",
                parse:function (response) {
                    onQueryResult(options.elementId, "No System Logs found for the given duration.", response['status'], 'lqq');
                    enableButton(btnId);
                    return response;
                }
            },
            serverPaging:options.pageable ? true : false,
            serverSorting:options.pageable ? true : false,
            pageSize:options.pageSize,
            sort: { field: "MessageTS", dir: "desc" }
        },
        groupable:false,
        columns:slColumnsDisplay,
        pageable: {
            pageSize: options.pageSize,
            pageSizes: false
        },
        searchToolbar: false
    });

    showGridLoading("#" + options.elementId);
};

function formatXML2JSON(xmlString) {
    if (xmlString && xmlString != '') {
        var xmlDoc = filterXML(xmlString);
        return convertXML2JSON(serializer.serializeToString(xmlDoc));
    } else {
        return '';
    }
};

function formatXML2JSONString(xmlString, prettify) {
    if (xmlString && xmlString != '') {
        var xmlDoc = filterXML(xmlString);
        return convertXML2JSONString(serializer.serializeToString(xmlDoc), prettify);
    } else {
        return '';
    }
};

function filterXML(xmlString) {
    var xmlDoc = parseXML(xmlString);
    $(xmlDoc).find("[type='struct']").each(function () {
        formatStruct(this);
    });
    $(xmlDoc).find("[type='sandesh']").each(function () {
        formatSandesh(this);
    });
    return xmlDoc;
}

function formatStruct(xmlNode) {
    $(xmlNode).find("[type]").each(function () {
        removeAttributes(this, ['type', 'size', 'identifier', 'aggtype']);
    });
    $(xmlNode).find("list").each(function () {
        $(this).children().unwrap();
    });
    $(xmlNode).children().unwrap();
};

function formatSandesh(xmlNode) {
    var messageString = '', nodeCount, i, node, nodeHTML;
    $(xmlNode).find("file").each(function () {
        $(this).remove();
    });
    $(xmlNode).find("line").each(function () {
        $(this).remove();
    });
    nodeCount = $(xmlNode).find("[identifier]").length;
    for (i = 1; i < (nodeCount + 1); i++) {
        $(xmlNode).find("[identifier='" + i + "']").each(function () {
            messageString += $(this).text() + ' ';
            $(this).remove();
        });
    }
    if (messageString != '') {
        $(xmlNode).text(messageString);
    }
    removeAttributes(xmlNode, ['type']);
};

function removeAttributes(xmlNode, attrArray) {
    for (var i = 0; i < attrArray.length; i++) {
        xmlNode.removeAttribute(attrArray[i]);
    }
};

function convertXML2JSON(xmlString) {
    return $.xml2json(xmlString);
};

function convertXML2JSONString(xmlString, prettify) {
    var jsonObj = convertXML2JSON(xmlString);
    if (prettify) {
        jsonString = JSON.stringify(jsonObj, null, 1);
        jsonString = jsonString.replace(/{/g, '').replace(/}\n/g, '').replace(/}/g, '');
        return "<pre class='prettyprint'>" + jsonString + "</pre>";
    } else {
        jsonString = JSON.stringify(jsonObj, null, 1);
        return jsonString;
    }
};

function getOTJSON(columns, rows, reqQueryString, options, selectedFields) {
    var columnArray = [], btnId = options.btnId,
        count, xmlString, xmlDoc, filteredJSON, logName;
    loadOTGrid(options, [], loadingOTGridColumns);
    showGridLoading("#" + options.elementId);
    $.ajax({
        type:"GET",
        url:"/api/admin/reports/query?" + reqQueryString,
        timeout:options.timeOut,
        success:function (responseJSON) {
            var data = responseJSON['data'];
            count = data.length;
            for (var i = 0; i < count; i++) {
                rows[i] = {};
                rows[i]['MessageTS'] = data[i]['MessageTS'];
                rows[i]['ModuleId'] = data[i]['ModuleId'];
                rows[i]['Source'] = data[i]['Source'];
                for (var j = 0; j < selectedFields.length; j++) {
                    xmlString = data[i][selectedFields[j]];
                    if (xmlString && xmlString != '') {
                        xmlDoc = filterXML(xmlString);
                        filteredJSON = $.xml2json(serializer.serializeToString(xmlDoc));
                        if (selectedFields[j] == 'ObjectLog') {
                            for (logName in filteredJSON) {
                                if (filteredJSON.hasOwnProperty(logName) && typeof(logName) !== 'function') {
                                    createOTColumns(filteredJSON, rows[i], columnArray, columns, null, logName);
                                }
                            }
                        } else if(selectedFields[j] == 'SystemLog') {
                            rows[i]['SystemLog'] = xmlString;
                        }
                    }
                }
            }
            if (rows.length == 0) {
                showGridMessage('#' + options.elementId, 'No Object Logs found for the given duration');
            } else {
                loadOTGrid(options, rows, columns);
            }
            enableButton(btnId);
        },
        error:function (xhr) {
            showGridMessage('#' + options.elementId, 'Error in run query: ' + xhr.statusText);
            enableButton(btnId);
        }
    });
};

function createOTColumns(json, row, columnArray, columns, columnPrefix, selectedFieldName) {
    var element = jsonPath(json, "$.*"),
        fieldName, newColumnName, elementValue, elementValueStr;
    for (fieldName in element[0]) {
        newColumnName = columnPrefix ? (columnPrefix + "_" + fieldName) : fieldName;
        elementValue = element[0][fieldName];
        if (typeof elementValue === 'object') {
            elementValueStr = JSON.stringify(elementValue, null, 1);
            push2OTColumns(columnArray, newColumnName, columns, selectedFieldName, false);
            row[newColumnName] = elementValueStr;
            /*
             if (fieldName.indexOf('list') == -1 && elementValueStr.indexOf('{') != -1) {
             createOTColumns(elementValue, row, columnArray, columns, newColumnName, selectedFieldName);
            } else {
                push2OTColumns(columnArray, newColumnName, columns, selectedFieldName, false);
                row[newColumnName] = elementValueStr;
            }
             */
        } else {
            push2OTColumns(columnArray, newColumnName, columns, selectedFieldName, true);
            row[newColumnName] = elementValue;
        }
    }
};

function push2OTColumns(columnArray, newColumnName, columns, selectedFieldName, groupable) {
    var fieldTitleTemplate = selectedFieldName + "<br> [" + newColumnName + "]";
    if (columnArray.indexOf(newColumnName) == -1) {
        columnArray.push(newColumnName);
        if (groupable) {
            columns.push({field:newColumnName, width:"300px", headerTemplate:fieldTitleTemplate, attributes:{style:"vertical-align:top;"}, searchable: true});
        } else {
            columns.push({field:newColumnName, width:"300px", headerTemplate:fieldTitleTemplate, groupable:false, attributes:{style:"vertical-align:top;"}, searchable: true});
        }
    }
};

function loadOTResults(options, reqQueryString, selectedFields) {
    var rows = [],
        columns = [
            {
                field:"MessageTS",
                title:"Time",
                width:"210px",
                template:"#= (MessageTS && MessageTS != '')  ? (formatMicroDate(MessageTS)) : '' #",
                attributes:{style:"vertical-align:top;"},
                filterable:false,
                groupable:false
            },
            {
                field:"Source",
                title:"Source",
                width:"150px",
                template:"#= handleNull4Grid(Source)#",
                attributes:{style:"vertical-align:top;"},
                searchable: true
            },
            {
                field:"ModuleId",
                title:"Module Id",
                width:"150px",
                template:"#= handleNull4Grid(ModuleId)#",
                attributes:{style:"vertical-align:top;"},
                searchable:true
            }
        ];
    if(selectedFields.indexOf("SystemLog") != -1) {
        columns.push({title:"System Log", field:"SystemLog", width:"300px", attributes:{style:"vertical-align:top;"}, template:"#= formatXML2JSON(SystemLog)#", searchable:true});
    }
    disableButton(options.btnId);
    getOTJSON(columns, rows, reqQueryString, options, selectedFields);
};

function loadOTGrid(options, rows, columns) {
    var grid = $('#' + options.elementId).data('kendoGrid');
    if (grid) {
        grid.destroy();
        // TODO: Update columns header and data without destroying the grid
        $("#" + options.elementId).html('');
    }
    $("#" + options.elementId).show().contrailKendoGrid({
        dataSource:{
            data:rows,
            pageSize:options.pageSize,
            schema: {
                model:{
                    fields:otSchemeFields
                }
            }
        },
        columns:columns,
        pageable: {
        	pageSize: options.pageSize,
            pageSizes: false
        },
        searchToolbar: true,
        searchPlaceholder:"Search Object Logs",
        widgetGridTitle : '<i class="icon-tasks blue"></i> Query Results',
        widgetGridActions : ['<a onclick=exportJSON2CSV("ot"); title="Export as CSV"><i class="icon-download-alt"></i></a>']
    });
};

function loadXMLDoc(dname) {
    var xhttp;
    if (window.XMLHttpRequest) {
        xhttp = new XMLHttpRequest();
    } else {
        xhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhttp.open("GET", dname, false);
    xhttp.send("");
    return xhttp.responseXML;
};

function parseXML(xmlString) {
    if (window.DOMParser) {
        xmlDoc = domParser.parseFromString(xmlString, "text/xml");
    }
    // Internet Explorer
    else {
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = false;
        xmlDoc.loadXML(xmlString);
    }
    return xmlDoc;
};

function loadFlowResults(options, reqQueryString, columnDisplay, schemaModelFields, fcGridDisplay) {
    var grid = $('#' + options.elementId).data('kendoGrid'),
        url = "/api/admin/reports/query?" + reqQueryString,
        btnId = options.btnId;
    if (grid) {
        grid.destroy();
        // TODO: Update columns header and data without destroying the grid
        $("#" + options.elementId).html('');
        $('#ts-chart').empty();
    }
    
    $("#" + options.elementId).kendoGrid(kendoGlobalGridDefault.extend({
        dataSource:{
            transport:{
                read:{
                    url:url,
                    timeout:options.timeOut
                }
            },
            requestStart:onQueryRequestStart(btnId),
            error:function (xhr, error) {
                showMessagePopup('Error', 'Error in run query: ' + xhr.errorThrown);
                showGridMessage('#' + options.elementId, 'Error in run query: ' + xhr.errorThrown);
                enableButton(btnId);
                endFSChartLoading(false);
                $('#ts-chart').html(kendo.template($('#no-data').html()));
                $("#fs-chart").addClass('no-data');
            },
            schema:{
                type:"json",
                model:{
                    fields:schemaModelFields
                },
                data:"data",
                total:"total",
                parse:function (response) {
                    var status = response['status'];
                    if (status == 'queued') {
                        options.showChartToggle = false;
                    }
                    onQueryResult(options.elementId, "No flows found for the given duration.", status, 'fqq');
                    enableButton(btnId);
                    return response;
                }
            },
            serverPaging:true,
            serverSorting:true,
            pageSize:options.pageSize
        },
        dataBound:function (e) {
            var chart;
            if (options.showChartToggle) {
                queries.fs.chartViewModel.set('options', options);
                chart = $('#ts-chart').data('kendoStockChart');
                if (chart == null) {
                    $('#fs-chart-loading').show();
                    plotFSChart(options, columnDisplay, fcGridDisplay);
                }
            } else if (options.showChartToggle != null) {
                endFSChartLoading(false);
                $('#ts-chart').html(kendo.template($('#no-data').html()));
                $("#fs-chart").addClass('no-data');
            }
        },
        columns:columnDisplay,
        pageable: {
        	pageSize: options.pageSize,
            pageSizes: false,
        }
    }));
    
    showGridLoading("#" + options.elementId);
};

function loadQueryQueue(options) {
    var grid = $('#' + options.elementId).data('kendoGrid'),
        url = "/api/admin/reports/query/queue?queryQueue=" + options.queueType;
    if (grid == null) {
        $("#" + options.elementId).contrailKendoGrid({
            dataSource:{
                transport:{
                    read:{
                        url:url,
                        timeout:options.timeOut
                    }
                },
                error:function (xhr) {
                    showMessagePopup('Error', 'Error in getting query queue: ' + xhr.errorThrown);
                    showGridMessage('#' + options.elementId, 'Error in getting query queue: ' + xhr.errorThrown);
                    clearInterval(options.intervalId);
                },
                schema:{
                    type:"json",
                    model:{
                        fields:queueSchemaModel
                    },
                    parse:function (response) {
                        onQueryResult(options.elementId, "No query found in queue.");
                        return response;
                    }
                },
                serverPaging:false,
                serverSorting:false,
                sort:{ field:"startTime", dir:"desc"},
                pageSize:options.pageSize
            },
            scrollable:false,
            dataBound:function (e) {
                var grid = $("#" + options.elementId).data("kendoGrid"),
                    gridData = grid.dataSource.view(),
                    currentUid, currenRow, editButton;
                for (var i = 0; i < gridData.length; i++) {
                    currentUid = gridData[i].uid;
                    currenRow = grid.table.find("tr[data-uid='" + currentUid + "']");
                    editButton = $(currenRow).find(".dropdown-toggle");
                    if (gridData[i].progress != 100 && gridData[i].status != 'error') {
                        editButton.addClass("hide");
                    } else {
                        editButton.removeClass("hide");
                    }
                }
            },
            columns:getQueueColumnDisplay(options.elementId),
            pageable: {
            	pageSize: options.pageSize,
                pageSizes: false
            }
        });
        
        showGridLoading("#" + options.elementId);
    } else {
        grid.dataSource.read();
    }
};

function getColumnDisplay4Grid(columnDisplay, selectArray) {
    var newColumnDisplay = [],
        displayLength = columnDisplay.length,
        i, j = 0;
    for (i = 0; i < displayLength; i++) {
        if (selectArray.indexOf(columnDisplay[i].select) != -1) {
            newColumnDisplay[j++] = columnDisplay[i].display;
        }
    }
    return newColumnDisplay;
};

function getSchemaModel4Grid(schemaModel, selectArray) {
    var newSchemaModel = {},
        length = schemaModel.length,
        i;
    for (i = 0; i < length; i++) {
        if (selectArray.indexOf(schemaModel[i].select) != -1) {
            newSchemaModel[schemaModel[i].model.field] = {type:schemaModel[i].model.type};
        }
    }
    return newSchemaModel;
};

function parseStringToArray(parseString, delimiter) {
    var resultArray = parseString.split(delimiter),
        resultLength = resultArray.length,
        i;
    for (i = 0; i < resultLength; i++) {
        resultArray[i] = resultArray[i].trim();
    }
    return resultArray;
};

function loadWhereOptions(element, queryPrefix, selectedIndex) {
    var query = queries[queryPrefix],
        fieldName = $('#' + element).find("select[name='field[]']").val(),
        valueNode = $('#' + element).find("input[name='value[]']"),
        fieldData = query.whereViewModel[fieldName],
        value2Node;
    valueNode.kendoComboBox({
        placeholder:(placeHolders[fieldName] != null ? placeHolders[fieldName][0] : 'Select'),
        dataTextField:"name",
        dataValueField:"value",
        dataSource:{
            data:fieldData
        }
    });
    if (selectedIndex == -1) {
        valueNode.data('kendoComboBox').value('');
    }
    if (placeHolders[fieldName] != null) {
        value2Node = $('#' + element).find("input[name='value2[]']");
        if (selectedIndex == -1) {
            value2Node.val('');
        }
        value2Node.attr('placeholder', placeHolders[fieldName][1]);
    }
    valueNode.data("kendoComboBox").list.width(390);
};

// TODO: Merge with load where options.
function loadFilterOptions(element, queryPrefix, selectedIndex) {
    var query = queries[queryPrefix],
        fieldName = $('#' + element).find("select[name='field[]']").val(),
        valueNode = $('#' + element).find("input[name='value[]']"),
        fieldData = query.filterViewModel[fieldName];
    valueNode.kendoComboBox({
        placeholder:(placeHolders[fieldName] != null ? placeHolders[fieldName][0] : 'Select'),
        dataTextField:"name",
        dataValueField:"value",
        dataSource:{
            data:fieldData
        }
    });
    if (selectedIndex == -1) {
        valueNode.data('kendoComboBox').value('');
    }
    valueNode.data("kendoComboBox").list.width(390);
};

function exportJSON2CSV(queryPrefix) {
    var gridData = JSON.stringify($('#' + queryPrefix + '-results').data("kendoGrid").dataSource.data());
    downloadJSON2CSV(gridData);
};

function downloadJSON2CSV(objArray) {
    var jsonArray = typeof objArray != 'object' ? JSON.parse(objArray) : objArray,
        valueCSVString = '', jsonLength = jsonArray.length,
        line = '', fieldName, fieldValue,
        headerLine = '', headerArray = [], headerLength;
    for (var k = 0; k < jsonLength; k++) {
        for (fieldName in jsonArray[k]) {
            headerLine = addFieldName2Header(fieldName, headerLine, headerArray);
        }
    }
    valueCSVString += headerLine + '\r\n';
    headerLength = headerArray.length;
    for (var i = 0; i < jsonLength; i++) {
        line = '';
        for (var j = 0; j < headerLength; j++) {
            fieldName = headerArray[j];
            fieldValue = jsonArray[i][fieldName];
            if (fieldValue == null || fieldValue == '') {
                fieldValue = '-';
            } else if (fieldName == 'Xmlmessage') {
                fieldValue = (fieldValue && fieldValue != '') ? formatJSON4CSV(formatXML2JSONString(fieldValue, false)) : '';
            } else if (fieldName == 'MessageTS' || fieldName == 'T' || fieldName == 'setup_time' || fieldName == 'teardown_time') {
                fieldValue = (fieldValue && fieldValue != '') ? (kendo.toString(new Date(fieldValue / 1000), 'yyyy-MM-dd HH:mm:ss:fff')) : '';
            } else if (typeof fieldValue === 'object') {
                fieldValue = (fieldValue && fieldValue != '') ? formatJSON4CSV(JSON.stringify(fieldValue)) : '';
            } else if (typeof fieldValue === 'string' && fieldValue.indexOf('{') != -1 && fieldValue.indexOf('}') != -1) {
                fieldValue = (fieldValue && fieldValue != '') ? formatJSON4CSV(fieldValue) : '';
            }
            line += '"' + fieldValue + '",';
        }
        valueCSVString += line + '\r\n';
    }
    window.open("data:text/csv;charset=utf-8," + escape(valueCSVString));
};

function addFieldName2Header(fieldName, headerLine, headerArray) {
    if (headerArray.indexOf(fieldName) == -1) {
        headerArray.push(fieldName);
        headerLine += '"' + fieldName + '",';
    }
    return headerLine;
}

function formatJSON4CSV(jsonString) {
    jsonString = jsonString.replace(/"/g, '');
    return jsonString;
};

function selectTimeRange(element, queryPrefix) {
    var idx = element.selectedIndex,
        val = element.options[idx].value;
    if (val == 0) {
        queries[queryPrefix].queryViewModel.set('isCustomTRVisible', true);
    } else {
        queries[queryPrefix].queryViewModel.set('isCustomTRVisible', false);
    }
    if (queryPrefix == 'fs') {
        resetTGValues(val == 0);
    }
    if (queryPrefix == 'ot') {
        loadOTSources();
    }
};

function setUTCTime(queryPrefix, reqQueryString, options) {
    var timeTange = getTimeRange(queryPrefix);
    if (options != null) {
        options.fromTime = timeTange.fromTime;
        options.toTime = timeTange.toTime;
    }
    reqQueryString += '&fromTimeUTC=' + timeTange.fromTime;
    reqQueryString += '&toTimeUTC=' + timeTange.toTime;
    return reqQueryString;
};

function getTimeRange(queryPrefix) {
    var selectId = '#' + queryPrefix + '-query-form',
        timeRange = $(selectId + " select[name='timeRange']").val(),
        fromDate, toDate, fromTime, toTime, now;
    if (timeRange != 0) {
        now = new Date();
        now.setSeconds(0);
        now.setMilliseconds(0);
        toTime = now.getTime();
        fromTime = toTime - (timeRange * 1000);
    } else {
        fromDate = $(selectId + " input[name='fromTime']").val();
        fromTime = new Date(fromDate).getTime();
        toDate = $(selectId + " input[name='toTime']").val();
        toTime = new Date(toDate).getTime();
    }
    return {fromTime:fromTime, toTime:toTime};
};

function toggleToGrid() {
    $('#fs-chart').hide();
    $('#fs-results').show();

    $('#fs-chart-link').removeClass('selected');
    $('#fs-results-link').addClass('selected');

};

function toggleToChart() {
    $('#fs-results').hide();
    $('#fs-chart').show();
    var chart = $('#ts-chart').data('kendoStockChart');

    if(chart != null){
        $('#ts-chart').kendoStockChart('redraw');
    }

    var grid = $("#fs-flow-classes").data("kendoGrid");
    if(grid != null){
        grid.refresh();
    }

    $('#fs-results-link').removeClass('selected');
    $('#fs-chart-link').addClass('selected');
};

function getPlotFields(columnDisplay) {
    var plotFields = [],
        statFields = ['sum_bytes', 'avg_bytes', 'sum_packets', 'avg_packets'];
    for (var j = 0; j < columnDisplay.length; j++) {
        if (statFields.indexOf(columnDisplay[j].field) != -1) {
            plotFields.push(columnDisplay[j].field);
        }
    }
    return plotFields;
};

function initFSChartLoading() {
    var chartElement = $('#ts-chart'),
        chart = chartElement.data('kendoStockChart');
    if (chart != null) {
        chart.destroy();
        chartElement.html('');
    }
    queries.fs.chartViewModel.set('isFCVisible', false);
};

function endFSChartLoading(isFCVisible) {
    queries.fs.chartViewModel.set('isFCVisible', isFCVisible);
    $('#fs-chart-loading').hide();
};

function initFSChart(columnDisplay, data, flowClassArray, fcGridDisplay) {
    var plotFields = getPlotFields(columnDisplay),
        selector = '#fs-chart', missingValues = 'zero',
        validFCId = findFirstValidFCId(flowClassArray);
    queries.fs.chartViewModel.set('flowClasses', flowClassArray);
    if (isEmptyObject(data) || data == null) {
        endFSChartLoading(false);
        $('#ts-chart').html(kendo.template($('#no-data').html()));
        $(selector).addClass('no-data');
        return;
    }
    $(selector).removeClass('no-data');
    initFlowclassGrid("#fs-flow-classes", flowClassArray, fcGridDisplay);
    var bytesTooltip = '#fs-bytes-tooltip-template',
        packetsTooltip = '#fs-pkts-tooltip-template',
        seriesValues = [], navigatorValues = [],
        tsData = data[validFCId];
    for (var j = 0; j < plotFields.length; j++) {
        if (plotFields[j] == 'sum_bytes' || plotFields[j] == 'avg_bytes' || plotFields[j] == 'bytes') {
            seriesValues.push({name:plotFields[j], field:plotFields[j], aggregate:'sum', axis:"bytes", tooltip:{visible:true, format:"{0} B", template:kendo.template($(bytesTooltip).html())}, missingValues:missingValues, groupNameTemplate:"#= setGroupName(group, series) #"});
            navigatorValues.push({navigator:true, type:"line", field:plotFields[j], tooltip:{visible:true, format:"{0} B", template:kendo.template($(bytesTooltip).html())}, missingValues:'interpolate'});
        } else {
            seriesValues.push({name:plotFields[j], field:plotFields[j], aggregate:'sum', axis:"packets", tooltip:{visible:true, format:"{0} packets", template:kendo.template($(packetsTooltip).html())}, missingValues:missingValues, groupNameTemplate:"#= setGroupName(group, series) #"});
            navigatorValues.push({navigator:true, type:"line", field:plotFields[j], tooltip:{visible:true, format:"{0} packets", template:kendo.template($(packetsTooltip).html())}, missingValues:'interpolate'});
        }
    }
    queries.fs.chartViewModel.set('seriesValues', seriesValues);
    queries.fs.chartViewModel.set('plotFields', plotFields);
    queries.fs.chartViewModel.set('navigatorValues', navigatorValues);
    queries.fs.chartViewModel.set('selectedFlows', [{flowClassId: validFCId, sumBytes: null, sumPackets: null}]);
    createFSChart(selector, tsData, navigatorValues);
};

function setGroupName(group, series) {
    return ""
}

function findFirstValidFCId(flowClassArray) {
    for(var i = 0; i < flowClassArray.length; i++) {
        if(flowClassArray[i]['sourcevn'] != "__UNKNOWN__" && flowClassArray[i]['destvn'] != "__UNKNOWN__") {
            return flowClassArray[i]['flow_class_id'];
        }
    }
    if(flowClassArray.length > 0) {
        return flowClassArray[0]['flow_class_id'];
    } else {
        return null;
    }
}

function initFlowclassGrid(elementId, flowClassArray, columnDisplay) {
    var grid = $(elementId).data('kendoGrid'),
        display = [
            {
                field:"", title:"", width:"22px", template:"<input id='fc-checkbox-#= flow_class_id #' type='checkbox' onchange='loadSelectedFSChart(this)' value='#= flow_class_id #' class='ace-input'/><span class='ace-lbl margin-5-0'></span>"
            },
            {
                field:"", title:"", width:"180px", template:"<span id='label-sum-bytes-#= flow_class_id #' class='hide'>Sum(Bytes)</span> <span id='label-sum-packets-#= flow_class_id #' class='hide'>Sum(Packets)</span>"
            }
        ];
    columnDisplay = display.concat(columnDisplay);
    if (grid) {
        grid.destroy();
        $(elementId).html('');
    }
    $(elementId).contrailKendoGrid({
        dataSource:{
            data:flowClassArray,
            serverPaging:false,
            serverSorting:false,
            pageSize:20
        },
        dataBound:function () {
            var selectedFlows = queries['fs']['chartViewModel'].get('selectedFlows'),
                count = selectedFlows.length, flowClassId;
            for (var i = 0; i < count; i++) {
                flowClassId = selectedFlows[i]['flowClassId'];
                $('#fc-checkbox-' + flowClassId).prop('checked', true);
                assignColors2FlowClass(selectedFlows[i]);
            }
        },
        searchToolbar: false,
        widgetGridTitle: "Flow Classes",
        columns:columnDisplay
    });
};

function assignColors2FlowClass(selectedFlow) {
    var flowClassId = selectedFlow['flowClassId'];
    if(selectedFlow["sumBytes"] != null) {
        $('#label-sum-bytes-' + flowClassId).show();
        $('#label-sum-bytes-' + flowClassId).removeAttr("class");
        $('#label-sum-bytes-' + flowClassId).addClass("badge " + selectedFlow["sumBytes"]);
    } else {
        $('#label-sum-bytes-' + flowClassId).hide();
    }
    if(selectedFlow["sumPackets"] != null) {
        $('#label-sum-packets-' + flowClassId).show();
        $('#label-sum-packets-' + flowClassId).removeAttr("class");
        $('#label-sum-packets-' + flowClassId).addClass("badge " + selectedFlow["sumPackets"]);
    } else {
        $('#label-sum-packets-' + flowClassId).hide();
    }
}

function plotFSChart(options, columnDisplay, fcGridDisplay) {
    var query = queries[options.queryPrefix],
        queryId = options.queryId,
        chartUrl = '/api/admin/reports/query/chart-data?queryId=' + queryId,
        flowUrl = '/api/admin/reports/query/flow-classes?queryId=' + queryId,
        data, flowClasses, chartDataReq, flowClassesReq;
    chartDataReq = $.ajax({
        type:"GET",
        url:chartUrl,
        timeout:options.timeOut,
        dataType:"json",
        success:function (resultData) {
            query['chartData'] = resultData;
        },
        error:function (xhr) {
            endFSChartLoading(false);
            $('#ts-chart').html(kendo.template($('#no-data').html()));
        }
    });
    flowClassesReq = $.ajax({
        type:"GET",
        url:flowUrl,
        timeout:options.timeOut,
        dataType:"json",
        success:function (resultData) {
            flowClasses = resultData;
        },
        error:function (xhr) {
            endFSChartLoading(false);
            $('#ts-chart').html(kendo.template($('#no-data').html()));
        }
    });
    $.when(chartDataReq, flowClassesReq).done(function () {
        initFSChart(columnDisplay, query['chartData'], flowClasses, fcGridDisplay);
    });
};

function createFSChart(selector, tsData, navigatorValues, addMissing) {
    var seriesValues = queries.fs.chartViewModel.get('seriesValues'),
        plotFields = queries.fs.chartViewModel.get('plotFields'),
        options = queries.fs.chartViewModel.get('options'),
        selectedFlows = queries.fs.chartViewModel.get('selectedFlows'),
        labelStep = options.labelStep,
        baseUnit = options.baseUnit,
        maxPoints = 12, missingValues = "zero", select = {}, step = 5, rotation = 0,
        timeRange, estimatedPoints, plotData, startTime, endTime, startIndex, endIndex, count, axisCrossingValue;
    if (addMissing == null || addMissing) {
        plotData = addMissingPoints(tsData, options, plotFields);
    } else {
        plotData = tsData;
    }
    count = plotData.length / selectedFlows.length;
    startTime = new Date(plotData[0].date).getTime();
    endTime = new Date(plotData[count - 1].date).getTime();
    if (labelStep < 0) {
        labelStep = 1;
    }
    timeRange = (endTime - startTime) / 60000;
    if (baseUnit == 'hours') {
        timeRange = timeRange / 60;
    } else if (baseUnit == 'days') {
        timeRange = timeRange / 3600;
    }
    estimatedPoints = timeRange / labelStep;
    step = Math.floor(parseInt(estimatedPoints / maxPoints));
    if (step < 1) {
        step = 1;
    }
    if (count != 1) {
        startIndex = Math.floor(parseInt(count * .1));
        endIndex = Math.floor(parseInt(count * .9));
        select['from'] = plotData[startIndex].date;
        select['to'] = plotData[endIndex].date;
    }

    if(plotFields.length == 2) {
        axisCrossingValue = [0, estimatedPoints];
    } else {
        axisCrossingValue = null;
    }

    $('#ts-chart').kendoStockChart({
        theme:'blueopal',
        transitions:false,
        chartArea:{
            margin:1
        },
        dataSource:{
            data:plotData,
            group:{field:"flow_class_id"},
            sort:{
                field:"date",
                dir:"asc"
            }
        },
        valueAxis:getValueAxis(plotFields),
        categoryAxis:{
            majorTicks:{
                visible:true,
                size:3,
                width:1
            },
            minorGridLines:{
                visible:false
            },
            labels:{
                step:step,
                rotation:rotation
            },
            baseUnit:baseUnit,
            baseUnitStep:labelStep,
            axisCrossingValue:axisCrossingValue
        },
        dateField:'date',
        seriesDefaults:{
            type:"line",
            width:1.5,
            markers:{
                visible:false,
                size:1
            },
            tooltip:{
                border:{
                    width:1
                }
            },
            missingValues:missingValues
        },
        legend:{
            visible:true,
            labels:{
                template:"#= formatLegendLabel(text, series) #"
            },
            position:"top"
        },
        series:seriesValues,
        navigator:{
            series:navigatorValues,
            select:select,
            categoryAxis:{
                baseUnit:baseUnit,
                baseUnitStep:labelStep,
                labels:{visible:false},
                majorTicks:{
                    visible:false
                },
                minorGridLines:{
                    visible:false
                }
            }
        },
        dataBound:function () {
            endFSChartLoading(true);
            var colors = this.options.seriesColors;
            var series = $.grep(this.options.series, function (s) {
                return s.navigator;
            });
            for (var j = 0; j < chartColors.length; j++) {
                colors[j] = chartColors[j % chartColors.length];
            }
            for (var i = 0; i < series.length; i++) {
                var fieldName, flowClassId, color, counter, index, selectedFlow;
                counter = i % colors.length;
                color = colors[counter];
                series[i].color = color;
                if(series[i].data && series[i].data.length > 0) {
                    fieldName = series[i].field;
                    flowClassId = series[i].data[0]['flow_class_id'];
                    index = findIndexInSelectedFlows(selectedFlows, flowClassId);
                    if(index != -1) {
                        selectedFlow = selectedFlows[index];
                        if(fieldName == "sum_bytes") {
                            selectedFlow["sumBytes"] = "badge-color-" + counter;
                        } else if(fieldName == "sum_packets") {
                            selectedFlow["sumPackets"] = "badge-color-" + counter;
                        }
                        assignColors2FlowClass(selectedFlow);
                    }
                }
            }
        }
    });
};

function addMissingPoints(tsData, options, plotFields) {
    var fromTime = options.fromTime,
        toTime = options.toTime,
        interval = options.interval * 1000,
        plotData = [], addPoint, flowClassId;
    for (key in tsData) {
        if (tsData[key]['flow_class_id'] != null) {
            flowClassId = tsData[key]['flow_class_id'];
            break;
        }
    }
    // TODO: We should add missing points only once.
    for (var i = fromTime + interval; i <= toTime; i += interval) {
        addPoint = {'date':new Date(i), 'flow_class_id':flowClassId};
        for (var k = 0; k < plotFields.length; k++) {
            if (tsData[i.toString()] != null) {
                addPoint[plotFields[k]] = tsData[i.toString()][plotFields[k]];
            } else {
                addPoint[plotFields[k]] = 0;
            }
        }
        plotData.push(addPoint);
    }
    return plotData;
};

function formatLegendLabel(text, series) {
    if (text == 'sum_bytes') {
        text = 'SUM(Bytes)';
    } else if (text == 'sum_packets') {
        text = 'SUM(Packets)';
    } else {
        text = text.replace('sum_bytes', 'SUM(Bytes)');
        text = text.replace('sum_packets', 'SUM(Packets)');
    }
    return text;
};

function getValueAxis(plotFields) {
    var valueAxes = [];
    if (plotFields.indexOf('sum_bytes') != -1 || plotFields.indexOf('avg_bytes') != -1 || plotFields.indexOf('bytes') != -1) {
        valueAxes.push({
            name:"bytes", labels:{template:"# return formatBytes4FSChart(value); #", step: 5 }, majorGridLines:{ visible:true }, line:{ visible:true }, title:{text:"Bytes"}
        });
    }
    if (plotFields.indexOf('sum_packets') != -1 || plotFields.indexOf('avg_packets') != -1 || plotFields.indexOf('packets') != -1) {
        valueAxes.push({
            name:"packets", labels:{format:"{0}", step: 2}, majorGridLines:{ visible:true }, line:{ visible:true }, title:{text:"Packets"}
        });
    }
    return valueAxes;
};

function formatMicroDate(microDateTime) {
    var microTime = microDateTime % 1000,
        resultString = kendo.toString(new Date(microDateTime / 1000), 'yyyy-MM-dd HH:mm:ss:fff')
    if (microTime > 0) {
        resultString += ':' + microTime;
    } else {
        resultString += ':0';
    }
    return resultString;
};

function formatTeardownTime(tearDownTime) {
    if (tearDownTime == null || tearDownTime == '') {
        return 'active';
    } else {
        return formatMicroDate(tearDownTime);
    }
};

function isEmptyObject(obj) {
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false;
    }
    return true;
};

function getLevelName4Value(value) {
    var levelsArray = queries.sl.queryViewModel.get('levels'),
        count = levelsArray.length;
    for (var i = 0; i < count; i++) {
        if (levelsArray[i].value == value) {
            return levelsArray[i].name;
        }
    }
    return value;
};

function handleNull4Grid(value, placeHolder) {
    if(value == 0) {
        return 0;
    } else if (value != null && value != '') {
        return value;
    } else if (placeHolder != null) {
        return placeHolder;
    } else {
        return '';
    }
};

function removeElementFromArray(array, element) {
    var index = array.indexOf(element);
    if (index != -1) {
        array.splice(index, 1);
    }
};

function randomUUID() {
    var s = [], itoh = '0123456789ABCDEF';
    for (var i = 0; i < 36; i++) {
        s[i] = Math.floor(Math.random() * 0x10);
    }
    s[14] = 4;
    s[19] = (s[19] & 0x3) | 0x8;
    for (var i = 0; i < 36; i++) {
        s[i] = itoh[s[i]];
    }
    s[8] = s[13] = s[18] = s[23] = s[s.length] = '-';
    s[s.length] = (new Date()).getTime()
    return s.join('');
};

function resizeGrid(elementid) {
    var gridElement = $(elementid),
        dataArea = gridElement.find(".k-grid-content"),
        gridHeight = gridElement.innerHeight(),
        otherElements = gridElement.children().not(".k-grid-content"),
        otherElementsHeight = 0;
    otherElements.each(function () {
        otherElementsHeight += $(this).outerHeight();
    });
    dataArea.height(gridHeight - otherElementsHeight);
};

function splitString2Array(strValue, delimiter) {
    var strArray = strValue.split(delimiter),
        count = strArray.length;
    for (var i = 0; i < count; i++) {
        strArray[i] = strArray[i].trim();
    }
    return strArray;
};

function populateTimeRange(queryPrefix, startTime, endTime) {
    var timeRange = $("#" + queryPrefix + "-time-range");
    timeRange.data('kendoDropDownList').value(0);
    queries[queryPrefix].queryViewModel.set('isCustomTRVisible', true);
    setDateTime('#' + queryPrefix + '-from-time', startTime);
    setDateTime('#' + queryPrefix + '-to-time', endTime);
};

function setDateTime(elementId, time) {
    var dateTimePicker = $(elementId).data("kendoDateTimePicker"),
        dateTime = kendo.toString(new Date(time / 1000), 'MMM dd, yyyy hh:mm:ss tt');
    dateTimePicker.value(dateTime);
};

function populateSelect(queryPrefix, selectArray, defaultColumns) {
    var selectString = '', select = [],
        query = queries[queryPrefix];
    for (var i = 0; i < selectArray.length; i++) {
        if (defaultColumns.indexOf(selectArray[i]) == -1) {
            select.push(selectArray[i]);
            selectString += (selectString.length == 0) ? selectArray[i] : (',' + selectArray[i]);
        }
    }
    $('#' + queryPrefix + '-select').val(selectString);
    query.selectViewModel.set('checkedFields', select);
};

function populateTimeGranularity(queryPrefix, selectFields, tg, tgUnit) {
    initTimeGranularity(selectFields, queries[queryPrefix]);
    if (tg != '' && tgUnit != '') {
        $('#tg-value').data('kendoNumericTextBox').value(tg);
        $('#tg-units').data('kendoDropDownList').value(tgUnit);
    }
};

function populateWhere(queryPrefix, where) {
    var whereClauseStr = '', whereClauseViewArray = [],
        whereORClauseArray, whereORClauseStr;
    for (var i = 0; i < where.length; i++) {
        whereORClauseArray = where[i];
        whereORClauseStr = '';
        for (var j = 0; j < whereORClauseArray.length; j++) {
            whereORClauseStr += (j == 0) ? '(' : ' AND ';
            if(whereORClauseArray[j].op == 3) {
                whereORClauseStr += whereORClauseArray[j].name + getOperatorFromCode(whereORClauseArray[j].op) + whereORClauseArray[j].value + "-" + whereORClauseArray[j].value2;
            } else {
                whereORClauseStr += whereORClauseArray[j].name + getOperatorFromCode(whereORClauseArray[j].op) + whereORClauseArray[j].value;
            }
            whereORClauseStr += (j == (whereORClauseArray.length - 1)) ? ')' : '';
        }
        whereClauseStr += (i == 0) ? '' : ' OR ';
        whereClauseStr += whereORClauseStr;
        whereClauseViewArray.push(whereORClauseStr);
    }
    $('#' + queryPrefix + '-where').val(whereClauseStr);
    // ToDo: Allow edit of where clause on populate.
};

function populateLogWhere(queryPrefix, where) {
    var whereClauseStr = '', whereClauseViewArray = [],
        whereORClauseArray, whereORClauseStr, whereORClauseSubmit, whereORClauseSubmitArray, whereClauseSubmitArray = [];
    for (var i = 0; i < where.length; i++) {
        whereORClauseArray = where[i];
        whereORClauseStr = '';
        whereORClauseSubmitArray = [];
        for (var j = 0; j < whereORClauseArray.length; j++) {
            whereORClauseStr += (j == 0) ? '(' : ' AND ';
            whereORClauseStr += whereORClauseArray[j].name + getOperatorFromCode(whereORClauseArray[j].op) + whereORClauseArray[j].value;
            whereORClauseStr += (j == (whereORClauseArray.length - 1)) ? ')' : '';
            whereORClauseSubmit = {field:whereORClauseArray[j].name, operator:whereORClauseArray[j].op, value:whereORClauseArray[j].value};
            whereORClauseSubmitArray.push(whereORClauseSubmit);
        }
        whereClauseStr += (i == 0) ? '' : ' OR ';
        whereClauseStr += whereORClauseStr;
        whereClauseViewArray.push(whereORClauseStr);
        whereClauseSubmitArray.push(whereORClauseSubmitArray);
    }
    $('#' + queryPrefix + '-where').val(whereClauseStr);
    queries[queryPrefix].whereViewModel.set('whereClauseView', whereClauseViewArray);
    queries[queryPrefix].whereViewModel.set('whereClauseSubmit', whereClauseSubmitArray);
};

function populateLogFilter(queryPrefix, filters) {
    var filterClauseStr = '', filterANDClauseStr, filterName,
        filterANDClauseSubmit, filterClauseSubmitArray = [];
    for (var i = 0; i < filters.length; i++) {
        filterName = filters[i].name;
        if(filterName == 'Type' || filterName == 'Level') {
            continue;
        }
        filterANDClauseStr = filterName + getOperatorFromCode(filters[i].op) + filters[i].value;
        filterANDClauseSubmit = {field:filters[i].name, operator:filters[i].op, value:filters[i].value};
        filterClauseStr += (filterClauseStr == '') ? '' : ' AND ';
        filterClauseStr += filterANDClauseStr;
        filterClauseSubmitArray.push(filterANDClauseSubmit);
    }
    $('#' + queryPrefix + '-filter').val(filterClauseStr);
    queries[queryPrefix].filterViewModel.set('filterClauseView', filterClauseStr);
    queries[queryPrefix].filterViewModel.set('filterClauseSubmit', filterClauseSubmitArray);
};

function populateLevel(queryPrefix, filter) {
    var level;
    for (var j = 0; j < filter.length; j++) {
        if (filter[j].name == 'Level') {
            level = filter[j].value;
            ;
            break;
        }
    }
    $('#' + queryPrefix + '-select-level').data('kendoDropDownList').value(level);
};

function getOperatorFromCode(opCode) {
    if (opCode == 1 || opCode == 3) {
        return " = "
    } else if (opCode == 2) {
        return " != "
    } else if (opCode == 8) {
        return " RegEx= "
    } else {
        return " NA "
    }
};

function populateFilter(queryPrefix, sortFields, sort, limit) {
    var filterStr = '', sortOrder = 'asc',
        query = queries[queryPrefix];
    resetFSCheckedFilters(query.selectViewModel.get('checkedFields'));
    if (sortFields != null && sortFields.length != 0) {
        filterStr = 'sort_fields: ';
        for (var i = 0; i < sortFields.length; i++) {
            filterStr += ((i == 0) ? '[' : ',') + sortFields[i];
            filterStr += ((i == (sortFields.length - 1)) ? ']' : '');
        }
        if (sort == 1) {
            filterStr += ', sort: asc';
        } else if (sort == 2) {
            sortOrder = 'desc';
            filterStr += ', sort: desc';
        }
        query.filterViewModel.set('checkedOrderBy', sortFields[0]);
    }
    if (limit != null) {
        filterStr += ((filterStr.length != 0) ? ', limit: ' : 'limit: ') + limit;
    }
    $('#' + queryPrefix + '-filter').val(filterStr);
    query.filterViewModel.set('checkedFilters', sortFields);
    query.filterViewModel.set('sortOrder', sortOrder);
    query.filterViewModel.set('limit', limit);

};

function formatBytes4FSChart(bytes, decimalDigits) {
    var formatStr = '', decimalDigits = decimalDigits ? decimalDigits : 2,
        bytePrefixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB'];
    if (!$.isNumeric(bytes)) {
        return '-';
    } else if (bytes == 0) {
        return '0 B';
    }
    $.each(bytePrefixes, function (idx, prefix) {
        if (bytes < 10) {
            formatStr = kendo.format('{0} {1}', bytes.toFixed(decimalDigits), prefix);
            return false;
        } else {
            if (idx == (bytePrefixes.length - 1)) {
                formatStr = kendo.format('{0} {1}', bytes.toFixed(decimalDigits), prefix);
            } else {
                bytes = bytes / 1024;
            }
        }
    });
    return formatStr;
};

function prepare4QueryResults(queryPrefix) {
    collapseWidget('#' + queryPrefix + '-query-widget');
    $('#' + queryPrefix + '-result-widget').removeClass("hide");
    openWidget('#' + queryPrefix + '-result-widget');
};

function initConfirmWindow4Queue(queueId) {
    queryQueue[queueId].confirmWindow = createConfirmWindow(queueId);
    queryQueue[queueId].delConfirmWindow = createDeleteConfirmWindow(queueId);
};
