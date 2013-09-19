/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var queries = {
    sl:{fromTime:"", toTime:"", queryViewModel:"", filterTemplate:"", filterWindow:"", filterViewModel:"", whereTemplate:"", whereWindow:"", whereViewModel:"", whereCounter:1, orClauseTemplate:"", editORClauseTemplate:"", filterTemplate:"", filterWindow:"", filterViewModel:"", filterCounter:1},
    ot:{fromTime:"", toTime:"", queryViewModel:"", selectTemplate:"", selectWindow:"", selectViewModel:"", filterTemplate:"", filterWindow:"", filterViewModel:"", whereTemplate:"", whereWindow:"", whereViewModel:"", whereCounter:1, orClauseTemplate:"", editORClauseTemplate:"", filterTemplate:"", filterWindow:"", filterViewModel:"", filterCounter:1}
};

var otSelectFieldsOptions = ['ObjectLog', 'SystemLog'],
    msgTemplate = kendo.template($("#message-template").html()),
    qeTemplate = kendo.template($("#msg-template").html());

function initLogPages() {
    initConfirmWindow4Queue("lqq");
};

//System Logs Query - Begin

queries.sl.queryViewModel = kendo.observable({
    defaultTRValue: 1800,
    timeRange:[
        {"name":"Last 10 Mins", "value":600},
        {"name":"Last 30 Mins", "value":1800},
        {"name":"Last 1 Hr", "value":3600},
        {"name":"Last 6 Hrs", "value":21600},
        {"name":"Last 12 Hrs", "value":43200},
        {"name":"Custom", "value":0}
    ],
    levels:[],
    selectedLevel:null,
    categories:[],
    isCustomTRVisible:false
});

queries.sl.filterViewModel = kendo.observable({
    opValues:[
        {name:"!=", value:"!="},
        {name:"RegEx=", value:"RegEx="}
    ],
    selectFields:[],
    filterClauseSubmit:[],
    filterClauseView:"",
    ModuleId:[],
    Messagetype:[],
    Source:[]
});

queries.sl.whereViewModel = kendo.observable({
    opValues:[
        {name:"=", value:"="}
    ],

    selectFields:[],
    whereClauseView:[],
    whereClauseSubmit:[],
    whereClauseEdit:[],
    selectedORClauseIndex:"-1",
    ModuleId:[],
    Messagetype:[],
    Source:[]
});

function loadSystemLogs() {
    $(contentContainer).html('');
    $(contentContainer).html(qeTemplate);

    initLogPages();

    setSLValidValues();
    initSLQueryView('sl');
    kendo.bind($('#sl-query'), queries.sl.queryViewModel);
    initWidgetBoxes();
    currTab = 'query_log_system';
};

function initSLQueryView(queryPrefix) {
    var query = queries[queryPrefix],
        defaultToTime = new Date(),
        defaultFromTime = new Date(defaultToTime.getTime() - 600000);
    $('#' + queryPrefix + '-query').html(kendo.template($('#' + queryPrefix + "-query-template").html()));

    query.fromTime = createDTPicker(queryPrefix + '-from-time', slChangeFromTime, defaultFromTime);
    query.toTime = createDTPicker(queryPrefix + '-to-time', slChangeToTime, defaultToTime);

    query.fromTime.max(query.toTime.value());
    query.toTime.min(query.fromTime.value());

    query.filterTemplate = kendo.template($('#' + queryPrefix + '-filter-popup-template').html());
    query.whereTemplate = kendo.template($('#' + queryPrefix + '-where-popup-template').html());
};

function setSLValidValues() {
    var viewModels = [queries.sl.whereViewModel, queries.sl.filterViewModel];
    setValidLevelValues('/api/admin/table/values/MessageTable/Level', 'levels', queries.sl.queryViewModel);
    setValidValues('/api/admin/table/values/MessageTable/Category', 'Category', viewModels, 'ControlNode');
    setColumnValues('/api/admin/table/schema/MessageTable', 'selectFields', [queries.sl.whereViewModel], 'columns');
    setColumnValues('/api/admin/table/schema/MessageTable', 'selectFields', [queries.sl.filterViewModel], 'columns', null, true, [
        {"name":'Xmlmessage', "value":'Xmlmessage'}
    ]);
    setValidValues('/api/admin/table/values/MessageTable/ModuleId', 'ModuleId', viewModels);
    setValidValues('/api/admin/table/values/MessageTable/Source', 'Source', viewModels);
};

function slChangeFromTime() {
    var fromTime = queries.sl.fromTime.value();
    if (fromTime) {
        fromTime = new Date(fromTime);
        fromTime.setDate(fromTime.getDate());
        queries.sl.toTime.min(fromTime);
    }
};

function slChangeToTime() {
    var toTime = queries.sl.toTime.value();
    if (toTime) {
        toTime = new Date(toTime);
        toTime.setDate(toTime.getDate());
        queries.sl.fromTime.max(toTime);
    }
};

function openSLFilter() {
    var queryPrefix = 'sl',
        query = queries[queryPrefix], filterClauseSubmit = query.filterViewModel.get('filterClauseSubmit'),
        count = filterClauseSubmit.length;
    $('#sl-filter-popup-container').remove();
    openFilter('sl');
    query.editFilterClauseTemplate = kendo.template($('#' + queryPrefix + '-edit-filter-clause-template').html());
    $('#' + queryPrefix + '-new-filter').append(query.editFilterClauseTemplate(filterClauseSubmit));
    count = filterClauseSubmit.length;
    kendo.bind($('#' + queryPrefix + '-filter-popup-container'), query.filterViewModel);
    if (count != 0) {
        for (var i = 0; i < count; i++) {
            loadFilterOptions(queryPrefix + '-filter-clause' + i, queryPrefix);
        }
    } else {
        loadFilterOptions(queryPrefix + '-first-filter-clause', queryPrefix, -1);
    }
};

function submitSLFilter() {
    var queryPrefix = 'sl',
        query = queries[queryPrefix],
        fieldArray = [], opArray = [], valArray = [],
        filterClauseSubmit = [], filterClauseViewStr = "", i, length, filterForm;
    filterForm = $('#' + queryPrefix + '-filter-popup-form');
    filterForm.find("select[name='field[]']").each(function () {
        fieldArray.push($(this).val());
    });
    filterForm.find("select[name='operator[]']").each(function () {
        opArray.push($(this).val());
    });
    filterForm.find("input[name='value[]']").each(function () {
        valArray.push($(this).val());
    });
    length = fieldArray.length;
    for (i = 0; i < length; i += 1) {
        if (valArray[i] != '') {
            filterClauseViewStr += ((i != 0 && filterClauseViewStr != '') ? " AND " : "") + fieldArray[i] + " " + opArray[i] + " " + valArray[i];
            filterClauseSubmit.push({field:fieldArray[i], operator:opArray[i], value:valArray[i]});
        }
    }
    query.filterViewModel.set('filterClauseSubmit', filterClauseSubmit);
    query.filterViewModel.set('filterClauseView', filterClauseViewStr);
    $('#' + queryPrefix + '-filter').val(filterClauseViewStr);
    query.filterWindow.modal('hide');
};

function appendSLFilter() {
    var queryPrefix = 'sl',
        query = queries[queryPrefix],
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

function openSLWhere() {
    openWhere('sl');
};

function appendSLWhere() {
    appendWhere('sl');
};

function submitSLWhere() {
    var selectedORClauseIndex = queries['sl'].whereViewModel.get('selectedORClauseIndex');
    if (selectedORClauseIndex == -1) {
        addSLWhere();
    } else {
        editSLWhere();
    }
    submitWhere('sl');
};

function addSLWhere() {
    addWhere('sl');
    selectORClause('sl', -1);
};

function editSLWhere() {
    editWhere('sl');
};

function deleteSLWhereClause(clause) {
    deleteWhereClause(clause, 'sl');
};

function runSLQuery() {
    var reqQueryString = $('#sl-query-form').serialize(),
        validator = $("#sl-query-form").kendoValidator().data("kendoValidator"),
        options = getSLDefaultOptions(), queryId;
    if (validator.validate()) {
        prepare4QueryResults("sl");
        queryId = randomUUID();
        reqQueryString = setUTCTime('sl', reqQueryString);
        reqQueryString += '&table=MessageTable' + '&queryId=' + queryId + '&async=true';
        loadSLResults(options, reqQueryString);
    }
};

function getSLDefaultOptions() {
    return {
        elementId:'sl-results', gridHeight:480,
        timeOut:90000, pageSize:100, export:true, pageable:true, virtual:false,
        btnId:'sl-query-submit'
    };
}

function viewSLQueryResults(dataItem) {
    var options = getSLDefaultOptions(), queryId = dataItem.queryId,
        queryJSON = dataItem.queryJSON, reqQueryString = "queryId=" + queryId;

    setSLValidValues();
    initSLQueryView('sl');
    collapseWidget("#lqq-widget");
    kendo.bind($('#sl-query'), queries.sl.queryViewModel);
    initWidget4Id("#sl-query-widget");

    populateSLQueryForm(queryJSON);
    prepare4QueryResults("sl");
    loadSLResults(options, reqQueryString);
};

function populateSLQueryForm(queryJSON) {
    var queryPrefix = 'sl';
    populateTimeRange(queryPrefix, queryJSON['start_time'], queryJSON['end_time']);
    populateLevel(queryPrefix, queryJSON['filter']);
    if (queryJSON['where'] != null) {
        populateLogWhere(queryPrefix, queryJSON['where']);
    }
    if (queryJSON['filter'] != null) {
        populateLogFilter(queryPrefix, queryJSON['filter']);
    }
};

//System Logs Query - End

//Object Traces Query - Begin

queries.ot.queryViewModel = kendo.observable({
    defaultTRValue: 1800,
    timeRange:[
        {"name":"Last 10 Mins", "value":600},
        {"name":"Last 30 Mins", "value":1800},
        {"name":"Last 1 Hr", "value":3600},
        {"name":"Last 6 Hrs", "value":21600},
        {"name":"Last 12 Hrs", "value":43200},
        {"name":"Custom", "value":0}
    ],
    objectTypes:[],
    objectIds:[],
    levels:[],
    categories:[],
    isCustomTRVisible:false
});

queries.ot.filterViewModel = kendo.observable({
    opValues:[
        {name:"!=", value:"!="},
        {name:"RegEx=", value:"RegEx="}
    ],
    selectFields:[],
    filterClauseSubmit:[],
    filterClauseView:"",
    ModuleId:[],
    Messagetype:[],
    Source:[]
});

queries.ot.selectViewModel = kendo.observable({
    checkedFields:["ObjectLog", "SystemLog"],
    selectFields:[]
});

queries.ot.whereViewModel = kendo.observable({
    opValues:[
        {name:"=", value:"="}
    ],
    Source:[],
    ModuleId:[],
    selectFields:[],
    whereClauseView:[],
    whereClauseSubmit:[],
    whereClauseEdit:[],
    selectedORClauseIndex:"-1"
});

function loadObjectLogs() {
    $(contentContainer).html('');
    $(contentContainer).html(qeTemplate);

    initLogPages();

    initObjectTypes();
    initOTView('ot');
    kendo.bind($('#ot-query'), queries.ot.queryViewModel);
    $('#ot-select-obj-id').data("kendoComboBox").list.width(300);
    $('#ot-select-obj-id').data("kendoComboBox").value('');

    initWidgetBoxes();
    currTab = 'query_log_object';
};

function initOTView(queryPrefix) {
    var query = queries[queryPrefix],
        defaultToTime = new Date(),
        defaultFromTime = new Date(defaultToTime.getTime() - 600000);
    $('#' + queryPrefix + '-query').html(kendo.template($('#' + queryPrefix + "-query-template").html()));

    query.fromTime = createDTPicker(queryPrefix + '-from-time', otChangeFromTime, defaultFromTime);
    query.toTime = createDTPicker(queryPrefix + '-to-time', otChangeToTime, defaultToTime);

    query.fromTime.max(query.toTime.value());
    query.toTime.min(query.fromTime.value());

    query.filterTemplate = kendo.template($('#' + queryPrefix + '-filter-popup-template').html());
    query.selectTemplate = kendo.template($('#' + queryPrefix + '-select-popup-template').html());
    query.whereTemplate = kendo.template($('#' + queryPrefix + '-where-popup-template').html());
};

function setOTValidValues(tableName, resetValues) {
    var viewModels = [queries.ot.whereViewModel, queries.ot.filterViewModel];
    queries.ot.queryViewModel.set('objectIds', []);
    setObjectIdValues('/api/admin/object-ids/' + tableName, tableName, [queries.ot.queryViewModel], 'objectIds');
    setValidLevelValues('/api/admin/table/values/' + tableName + '/Level', 'levels', queries.ot.queryViewModel);
    setColumnValues('/api/admin/table/schema/' + tableName, 'selectFields', [queries.ot.whereViewModel], 'columns');
    setColumnValues('/api/admin/table/schema/' + tableName, 'selectFields', [queries.ot.filterViewModel], 'columns', null, true, [
        {"name":'ObjectLog', "value":'ObjectLog'},
        {"name":'SystemLog', "value":'SystemLog'}
    ]);
    setValidValues('/api/admin/table/values/' + tableName + '/ModuleId', 'ModuleId', viewModels);
    setValidValues('/api/admin/table/values/' + tableName + '/Source', 'Source', viewModels);
    queries.ot.selectViewModel.set('selectFields', otSelectFieldsOptions);
    if (resetValues) {
        queries.ot.whereViewModel.set('whereClauseView', []);
        $('#ot-where').attr('value', '');
        $('#ot-select-obj-id').data('kendoComboBox').value('');
    }
};

function initObjectIdValues(url, tableName, viewModels, viewModelKey) {
    var timeRange = getTimeRange("ot");
    url += "?fromTimeUTC=" + timeRange.fromTime;
    url += "&toTimeUTC=" + timeRange.toTime;
    $.ajax({
        url:url,
        dataType:"json",
        success:function (response) {
            var validValueDS = formatObjectIds(response, tableName);
            if (viewModelKey != null) {
                for (var j = 0; j < viewModels.length; j++) {
                    viewModels[j].set(viewModelKey, validValueDS);
                }
            }
        }
    });
}

function setObjectIdValues(url, tableName, viewModels, viewModelKey) {
    for (var j = 0; j < viewModels.length; j++) {
        viewModels[j].set(viewModelKey, []);
    }
    initObjectIdValues(url, tableName, viewModels, viewModelKey);
};

function formatObjectIds(response, tableName) {
    var objectIdArray = response['data'],
        results = [], objId;
    if (objectIdArray.length != 0) {
        for (var i = 0; i < objectIdArray.length; i++) {
            objId = objectIdArray[i]['ObjectId'];
            results.push({"name":objId, "value":objId});
        }
    } else {
        results.push({"name":"No object id available in selected time-range.", "value":""});
    }
    return results;
};

function otChangeFromTime() {
    var fromTime = queries.ot.fromTime.value();
    if (fromTime) {
        fromTime = new Date(fromTime);
        fromTime.setDate(fromTime.getDate());
        queries.ot.toTime.min(fromTime);
    }
};

function otChangeToTime() {
    var toTime = queries.ot.toTime.value();
    if (toTime) {
        toTime = new Date(toTime);
        toTime.setDate(toTime.getDate());
        queries.ot.fromTime.max(toTime);
    }
};

function openOTFilter() {
    var queryPrefix = 'ot',
        query = queries[queryPrefix], filterClauseSubmit = query.filterViewModel.get('filterClauseSubmit'),
        count = filterClauseSubmit.length;
    $('#ot-filter-popup-container').remove();
    openFilter('ot');
    query.editFilterClauseTemplate = kendo.template($('#' + queryPrefix + '-edit-filter-clause-template').html());
    $('#' + queryPrefix + '-new-filter').append(query.editFilterClauseTemplate(filterClauseSubmit));
    count = filterClauseSubmit.length;
    kendo.bind($('#' + queryPrefix + '-filter-popup-container'), query.filterViewModel);
    if (count != 0) {
        for (var i = 0; i < count; i++) {
            loadFilterOptions(queryPrefix + '-filter-clause' + i, queryPrefix);
        }
    } else {
        loadFilterOptions(queryPrefix + '-first-filter-clause', queryPrefix, -1);
    }
};

function addOTFilter() {
    addFilter('ot');
};

function openOTSelect() {
    var selectTemplate = kendo.template($('#ot-select-popup-template').html());
    queries.ot.selectTemplate = selectTemplate(queries.ot.selectViewModel.get('selectFields'));
    openSelect('ot', 430);
};

function addOTSelect() {
    addSelect('ot');
};

function openOTWhere() {
    openWhere('ot');
};

function appendOTWhere() {
    appendWhere('ot');
};

function appendOTFilter() {
    var queryPrefix = 'ot',
        query = queries[queryPrefix],
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

function submitOTWhere() {
    var selectedORClauseIndex = queries['ot'].whereViewModel.get('selectedORClauseIndex');
    if (selectedORClauseIndex == -1) {
        addOTWhere();
    } else {
        editOTWhere();
    }
    submitWhere('ot');
};

function addOTWhere() {
    addWhere('ot');
    selectORClause('ot', -1);
};

function editOTWhere() {
    editWhere('ot');
};

function submitOTFilter() {
    var queryPrefix = 'ot',
        query = queries[queryPrefix],
        fieldArray = [], opArray = [], valArray = [],
        filterClauseSubmit = [], filterClauseViewStr = "", i, length, filterForm;
    filterForm = $('#' + queryPrefix + '-filter-popup-form');
    filterForm.find("select[name='field[]']").each(function () {
        fieldArray.push($(this).val());
    });
    filterForm.find("select[name='operator[]']").each(function () {
        opArray.push($(this).val());
    });
    filterForm.find("input[name='value[]']").each(function () {
        valArray.push($(this).val());
    });
    length = fieldArray.length;
    for (i = 0; i < length; i += 1) {
        if (valArray[i] != '') {
            filterClauseViewStr += ((i != 0 && filterClauseViewStr != '') ? " AND " : "") + fieldArray[i] + " " + opArray[i] + " " + valArray[i];
            filterClauseSubmit.push({field:fieldArray[i], operator:opArray[i], value:valArray[i]});
        }
    }
    query.filterViewModel.set('filterClauseSubmit', filterClauseSubmit);
    query.filterViewModel.set('filterClauseView', filterClauseViewStr);
    $('#' + queryPrefix + '-filter').val(filterClauseViewStr);
    query.filterWindow.modal('hide');
};

function deleteOTWhereClause(clause) {
    deleteWhereClause(clause, 'ot');
};

function runOTQuery() {
    var reqQueryString = $('#ot-query-form').serialize(),
        validator = $("#ot-query-form").kendoValidator().data("kendoValidator"),
        options = {
            elementId:'ot-results', gridHeight:480,
            timeOut:90000, pageSize:50,
            export:true, btnId:'ot-query-submit'
        }, table, select;
    if (validator.validate()) {
    	collapseWidget('#ot-query-widget');
    //    prepare4QueryResults("ot");
        table = $("#ot-query-form select[name='objectType']").val();
        select = $("#ot-query-form input[name='select']").val();
        reqQueryString = setUTCTime('ot', reqQueryString);
        reqQueryString += '&table=' + table + '&async=false';
        if (select == null || select == '') {
            select = 'ObjectLog,SystemLog';
        }
        loadOTResults(options, reqQueryString, parseStringToArray(select, ','));
    }
};

function loadOTSources() {
    var element = document.getElementById("ot-select-obj-type"),
        idx = element.selectedIndex,
        val = element.options[idx].value;
        setOTValidValues(val, true);
};

//Object Traces Query - End

//Flow Queue - Begin

function loadLogQueryQueue() {
    $(contentContainer).html('');
    $(contentContainer).html(qeTemplate);

    initLogPages();

    initLogQueueView();
    initWidgetBoxes();
};

function initLogQueueView() {
    var options = {elementId:'lqq-results', queueType:'lqq', timeOut:60000, gridHeight:530, pageSize:6},
        intervalId;
    $("#lqq-widget").show();
    loadQueryQueue(options);
    intervalId = setInterval(function () {
        var grid = $('#lqq-results').data('kendoGrid');
        if (grid != null) {
            grid.dataSource.read();
        } else {
            clearInterval(intervalId);
        }
    }, 60000);
    options.intervalId = intervalId;
};

//Flow Queue - End
