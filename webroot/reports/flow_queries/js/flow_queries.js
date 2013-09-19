/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var queries = {
    fs:{fromTime:"", toTime:"", queryViewModel:"", selectTemplate:"", selectWindow:"", selectViewModel:"", filterTemplate:"", filterWindow:"", filterViewModel:"", whereTemplate:"", whereWindow:"", whereViewModel:"", whereCounter:1, orClauseTemplate:"", editORClauseTemplate:"", chartViewModel:"", confirmWindow:""},
    fr:{fromTime:"", toTime:"", queryViewModel:"", selectTemplate:"", selectWindow:"", selectViewModel:"", filterTemplate:"", filterWindow:"", filterViewModel:"", whereTemplate:"", whereWindow:"", whereViewModel:"", whereCounter:1, orClauseTemplate:"", editORClauseTemplate:"", confirmWindow:""}
};

var msgTemplate = kendo.template($("#message-template").html()),
    qeTemplate = kendo.template($("#qe-template").html());

var fsColumnDisplay = [
    {select:"T", display:{field:"T", width:"180px", title:"Time", template:"#= formatMicroDate(T) #", filterable:false, groupable:false}},
    {select:"time-granularity", display:{field:"T", width:"180px", title:"Time", template:"#= formatMicroDate(T) #", filterable:false, groupable:false}},
    {select:"flow_class_id", display:{field:"flow_class_id", title:"Flow Class Id", groupable:true, hidden:true}},
    {select:"vrouter", display:{field:"vrouter", width:"150px", title:"Virtual Router", groupable:false, template:"#= handleNull4Grid(vrouter) #"}},
    {select:"sourcevn", display:{field:"sourcevn", width:"250px", title:"Source VN", groupable:false, template:"#= handleNull4Grid(sourcevn) #"}},
    {select:"destvn", display:{field:"destvn", width:"250px", title:"Destination VN", groupable:false, template:"#= handleNull4Grid(destvn) #"}},
    {select:"sourceip", display:{field:"sourceip", width:"150px", title:"Source IP", groupable:false, template:"#= handleNull4Grid(sourceip) #"}},
    {select:"destip", display:{field:"destip", width:"150px", title:"Destination IP", groupable:false, template:"#= handleNull4Grid(destip) #"}},
    {select:"sport", display:{field:"sport", width:"150px", title:"Source Port", groupable:false, template:"#= handleNull4Grid(sport) #"}},
    {select:"dport", display:{field:"dport", width:"150px", title:"Destination Port", groupable:false, template:"#= handleNull4Grid(dport) #"}},
    {select:"direction_ing", display:{field:"direction_ing", width:"150px", title:"Direction", groupable:true, template:"#= handleNull4Grid(getDirName(direction_ing)) #"}},
    {select:"protocol", display:{field:"protocol", width:"150px", title:"Protocol", groupable:true, template:"#= handleNull4Grid(getProtocolName(protocol)) #"}},
    {select:"bytes", display:{field:"bytes", width:"150px", title:"Bytes", format:"{0:n0}", groupable:false}},
    {select:"sum(bytes)", display:{field:"sum_bytes", width:"150px", title:"SUM(Bytes)", format:"{0:n0}", groupable:false}},
    {select:"avg(bytes)", display:{field:"avg_bytes", width:"150px", title:"AVG(Bytes)", format:"{0:n0}", groupable:false}},
    {select:"packets", display:{field:"packets", width:"150px", title:"Packets", format:"{0:n0}", groupable:false}},
    {select:"sum(packets)", display:{field:"sum_packets", width:"150px", title:"SUM(Packets)", format:"{0:n0}", groupable:false}},
    {select:"avg(packets)", display:{field:"avg_packets", width:"150px", title:"AVG(Packets)", format:"{0:n0}", groupable:false}}
];

var fcColumnDisplay = [
    {select:"flow_class_id", display:{field:"flow_class_id", hidden:true}},
    {select:"sourcevn", display:{field:"sourcevn", width:"250px", title:"Source VN", groupable:false, template:"#= handleNull4Grid(sourcevn) #", width:"200px"}},
    {select:"destvn", display:{field:"destvn", width:"250px", title:"Destination VN", groupable:false, template:"#= handleNull4Grid(destvn) #", width:"200px"}},
    {select:"sourceip", display:{field:"sourceip", title:"Source IP", groupable:false, template:"#= handleNull4Grid(sourceip) #", width:"100px"}},
    {select:"destip", display:{field:"destip", title:"Destination IP", groupable:false, template:"#= handleNull4Grid(destip) #", width:"100px"}},
    {select:"sport", display:{field:"sport", title:"Source Port", groupable:false, template:"#= handleNull4Grid(sport) #", width:"100px"}},
    {select:"dport", display:{field:"dport", title:"Destination Port", groupable:false, template:"#= handleNull4Grid(dport) #", width:"100px"}},
    {select:"protocol", display:{field:"protocol", title:"Protocol", groupable:true, template:"#= handleNull4Grid(getProtocolName(protocol)) #", width:"80px"}}
];

var fsSchemaModel = [
    {select:"sport", model:{field:"sport", type:"number" }},
    {select:"dport", model:{field:"dport", type:"number" }},
    {select:"protocol", model:{field:"protocol", type:"number" }},
    {select:"bytes", model:{field:"bytes", type:"number" }},
    {select:"sum(bytes)", model:{field:"sum_bytes", type:"number"}},
    {select:"avg(bytes)", model:{field:"avg_bytes", type:"number" }},
    {select:"packets", model:{field:"packets", type:"number" }},
    {select:"sum(packets)", model:{field:"sum_packets", type:"number" }},
    {select:"avg(packets)", model:{field:"avg_packets", type:"number" }}
];

var frColumnDisplay = [
    {select:"setup_time", display:{field:"setup_time", width:"180px", title:"Setup Time", template:"#= formatMicroDate(setup_time) #", filterable:false, groupable:false}},
    {select:"teardown_time", display:{field:"teardown_time", width:"180px", title:"Teardown Time", template:"#= formatTeardownTime(teardown_time) #", filterable:false, groupable:false}},
    {select:"vrouter", display:{field:"vrouter", width:"150px", title:"Virtual Router", groupable:false, template:"#= handleNull4Grid(vrouter) #"}},
    {select:"sourcevn", display:{field:"sourcevn", width:"250px", title:"Source VN", groupable:true, template:"#= handleNull4Grid(sourcevn) #"}},
    {select:"destvn", display:{field:"destvn", width:"250px", title:"Destination VN", groupable:true, template:"#= handleNull4Grid(destvn) #"}},
    {select:"sourceip", display:{field:"sourceip", width:"150px", title:"Source IP", groupable:true, template:"#= handleNull4Grid(sourceip) #"}},
    {select:"destip", display:{field:"destip", width:"150px", title:"Destination IP", groupable:true, template:"#= handleNull4Grid(destip) #"}},
    {select:"sport", display:{field:"sport", width:"150px", title:"Source Port", groupable:true, template:"#= handleNull4Grid(sport) #"}},
    {select:"dport", display:{field:"dport", width:"150px", title:"Destination Port", groupable:true, template:"#= handleNull4Grid(dport) #"}},
    {select:"direction_ing", display:{field:"direction_ing", width:"150px", title:"Direction", groupable:true, template:"#= handleNull4Grid(getDirName(direction_ing)) #"}},
    {select:"protocol", display:{field:"protocol", width:"150px", title:"Protocol", groupable:true, template:"#= handleNull4Grid(getProtocolName(protocol)) #"}},
    {select:"agg-bytes", display:{field:"agg_bytes", width:"150px", title:"Aggregate Bytes", format:"{0:n0}", groupable:false}},
    {select:"agg-packets", display:{field:"agg_packets", width:"150px", title:"Aggregate Packets", format:"{0:n0}", groupable:false}}
];

var frSchemaModel = [
    {select:"sport", model:{field:"sport", type:"number" }},
    {select:"dport", model:{field:"dport", type:"number" }},
    {select:"protocol", model:{field:"protocol", type:"number" }},
    {select:"agg-bytes", model:{field:"agg_bytes", type:"number" }},
    {select:"agg-packets", model:{field:"agg_packets", type:"number" }}
];

var frDefaultColumns = ['vrouter', 'sourcevn', 'sourceip', 'sport', 'destvn', 'destip', 'dport', 'protocol', 'direction_ing'],
    fsDefaultColumns = ['flow_class_id', 'direction_ing'];

function getDirName(dirId) {
    if (dirId == 1) {
        return "INGRESS";
    } else if (dirId == 0) {
        return "EGRESS"
    } else {
        return dirId;
    }
};

function initFlowPages() {
    initConfirmWindow4Queue("fqq");
};

//Flow Series Query - Begin

queries.fs.queryViewModel = kendo.observable({
    defaultTRValue:1800,
    timeRange:[
        {"name":"Last 10 Mins", "value":600},
        {"name":"Last 30 Mins", "value":1800},
        {"name":"Last 1 Hr", "value":3600},
        {"name":"Last 6 Hrs", "value":21600},
        {"name":"Last 12 Hrs", "value":43200},
        {"name":"Custom", "value":0}
    ],
    isCustomTRVisible:false,
    tgUnits:[
        {name:"secs", value:"secs"},
        {name:"mins", value:"mins"}
    ],
    isTGVisible:false,
    direction:[
        {name:"INGRESS", value:"1"},
        {name:"EGRESS", value:"0"}
    ]
});

queries.fs.chartViewModel = kendo.observable({
    isFCVisible:false,
    flowClasses:[],
    fsChartData:{},
    seriesValues:[],
    navigatorValues:[],
    plotFields:[],
    options:{},
    selectedFlows:[]
});

queries.fs.selectViewModel = kendo.observable({
    checkedFields:[],
    isEnabled:{"bytes":true, "packets":true, "sum(bytes)":true, "sum(packets)":true}
});

queries.fs.whereViewModel = kendo.observable({
    opValues:[
        {name:"=", value:"="}
    ],
    selectFields:[],
    whereClauseView:[],
    whereClauseSubmit:[],
    whereClauseEdit:[],
    selectedORClauseIndex:"-1"
});

queries.fs.filterViewModel = kendo.observable({
    orderTypes:[
        {name:"ASC", value:"asc"},
        {name:"DESC", value:"desc"}
    ],
    checkedOrderBy:[],
    isEnabled:{sourcevn:false, destvn:false, sourceip:false, destip:false, sport:false, dport:false, protocol:false, sort:false, bytes:false, "sum(bytes)":false, packets:false, "sum(packets)":false, "vrouter":false},
    limit:"",
    sortOrder:"asc"
});

function loadFlowSeries() {
    var urlHashParams = layoutHandler.getURLHashParams(), autoRun;
    $(contentContainer).html('');
    $(contentContainer).html(qeTemplate);

    initFlowPages();

    setFSValidValues();
    initFSQueryView('fs');
    kendo.bind($('#fs-query'), queries.fs.queryViewModel);
    kendo.bind($('#fs-chart'), queries.fs.chartViewModel);

    initWidgetBoxes();
    currTab = 'query_flow_series';

    autoRun = urlHashParams['autorun'];
    if (autoRun == "true") {
        autoRunFlowSeries(urlHashParams);
    }
};

function autoRunFlowSeries(urlHashParams) {
    var queryJSON = {"table":'FlowSeriesTable', "start_time":"", "end_time":"", "select_fields":[]},
        tg = 60, tgUnit = 'secs', whereClauseAND, selectClause, whereClause = [];
    queryJSON["start_time"] = urlHashParams["start_time"];
    queryJSON["end_time"] = urlHashParams["end_time"];
    selectClause = splitString2Array(urlHashParams["select_fields"], "|");
    queryJSON["select_fields"] = ['flow_class_id', "direction_ing"].concat(selectClause);
    whereClauseAND = constructWhereClause(urlHashParams["sourcevn"], urlHashParams["sport"], urlHashParams["dport"]);
    if (whereClauseAND.length > 0) {
        whereClause.push([
            {name:"protocol", value:"6", op:1}
        ].concat(whereClauseAND));
        whereClause.push([
            {name:"protocol", value:"17", op:1}
        ].concat(whereClauseAND));
        queryJSON['where'] = whereClause;
    }
    queryJSON['dir'] = 1;
    populateFSQueryForm(queryJSON, tg, tgUnit);
    runFSQuery();
}

function constructWhereClause(sourceVN, sPort, dPort) {
    var whereClause = [], portArray, port;
    if (sourceVN && sourceVN != "") {
        whereClause.push({name:"sourcevn", value:sourceVN, op:1});
    }
    if (sPort && sPort != "") {
        portArray = splitString2Array(sPort, "-");
        if (portArray.length == 2) {
            whereClause.push({name:"sport", value:portArray[0], value2:portArray[1], op:3});
        }
    } else if (dPort && dPort != "") {
        portArray = splitString2Array(dPort, "-");
        if (portArray.length == 2) {
            whereClause.push({name:"dport", value:portArray[0], value2:portArray[1], op:3});
        }
    }
    return whereClause;
}

function initFSQueryView(queryPrefix) {
    var query = queries[queryPrefix],
        defaultToTime = new Date(),
        defaultFromTime = new Date(defaultToTime.getTime() - 600000);
    $('#' + queryPrefix + '-query').html(kendo.template($('#' + queryPrefix + "-query-template").html()));

    query.fromTime = createDTPicker(queryPrefix + '-from-time', fsChangeFromTime, defaultFromTime);
    query.toTime = createDTPicker(queryPrefix + '-to-time', fsChangeToTime, defaultToTime);

    query.fromTime.max(query.toTime.value());
    query.toTime.min(query.fromTime.value());

    query.selectTemplate = kendo.template($('#' + queryPrefix + '-select-popup-template').html());
    query.whereTemplate = kendo.template($('#' + queryPrefix + '-where-popup-template').html());
    query.filterTemplate = kendo.template($('#' + queryPrefix + '-filter-popup-template').html());
};

function fsChangeFromTime() {
    var fromTime = queries.fs.fromTime.value();
    if (fromTime) {
        fromTime = new Date(fromTime);
        fromTime.setDate(fromTime.getDate());
        queries.fs.toTime.min(fromTime);
    }
};

function fsChangeToTime() {
    var toTime = queries.fs.toTime.value();
    if (toTime) {
        toTime = new Date(toTime);
        toTime.setDate(toTime.getDate());
        queries.fs.fromTime.max(toTime);
    }
};

function openFSSelect() {
    openSelect('fs');
};

function openFSWhere() {
    openWhere('fs');
};

function openFSFilter() {
    openFilter('fs');
};

function addFSSelect() {
    var query = queries['fs'],
        selectedFields = $('#fs-select-popup-form').serializeArray(),
        selectValue = "", fieldValue, checkedFields = [];
    query.selectWindow.modal('hide');
    $.each(selectedFields, function (i, selectedFields) {
        fieldValue = selectedFields.value;
        checkedFields.push(fieldValue);
        selectValue += (i != 0 ? ", " : "") + fieldValue;
    });
    if (checkedFields.indexOf('bytes') != -1 || checkedFields.indexOf('packets') != -1) {
        selectValue = 'T, ' + selectValue;
    }
    query.selectViewModel.set('checkedFields', checkedFields);
    $('#fs-select').val(selectValue);
    initTimeGranularity(checkedFields, query);
    resetFSCheckedFilters(checkedFields);
};

function initTimeGranularity(checkedFields, query) {
    if (checkedFields.indexOf('time-granularity') > -1) {
        query.queryViewModel.set('isTGVisible', true);
        if ($("#tg-value").data("kendoNumericTextBox") == null) {
            $('#tg-value').kendoNumericTextBox({
                min:1,
                max:60,
                step:1,
                format:"#",
                value:60
            });
        }
        $('#tg-value').removeAttr('required');
        $('#tg-value').removeAttr('validationMessage');
        $('#tg-value').attr('required', 'required');
        $('#tg-value').attr('validationMessage', 'Time Granularity Required.');
    } else {
        query.queryViewModel.set('isTGVisible', false);
        $('#tg-value').removeAttr('required');
        $('#tg-value').removeAttr('validationMessage');
    }
};

function resetTGValues(isCustom) {
    var timeRange, secTimeInterval,
        tgUnits = [
            {name:"secs", value:"secs"},
            {name:"mins", value:"mins"},
            {name:"hrs", value:"hrs"},
            {name:"days", value:"days"}
        ];
    timeRange = getTimeRange('fs');
    secTimeInterval = (timeRange.toTime - timeRange.fromTime) / 1000;
    if (isCustom) {
        tgUnits = [
            {name:"secs", value:"secs"},
            {name:"mins", value:"mins"},
            {name:"hrs", value:"hrs"},
            {name:"days", value:"days"}
        ];
    } else if (secTimeInterval <= 60) {
        tgUnits = [
            {name:"secs", value:"secs"}
        ];
    } else if (secTimeInterval <= 3600) {
        tgUnits = [
            {name:"secs", value:"secs"},
            {name:"mins", value:"mins"}
        ];
    } else if (secTimeInterval <= 86400) {
        tgUnits = [
            {name:"secs", value:"secs"},
            {name:"mins", value:"mins"},
            {name:"hrs", value:"hrs"}
        ];
    }
    queries.fs.queryViewModel.set('tgUnits', tgUnits);
};

function resetFSCheckedFilters(checkedFields) {
    var query = queries['fs'],
        filtersModel = query.filterViewModel,
        fsFilterSortFields = {sourcevn:false, destvn:false, sourceip:false, destip:false, sport:false, dport:false, protocol:false, sort:false, bytes:false, "sum(bytes)":false, packets:false, "sum(packets)":false, "vrouter":false};
    for (key in fsFilterSortFields) {
        if (checkedFields.indexOf(key) != -1) {
            fsFilterSortFields[key] = true;
            if (!fsFilterSortFields['sort']) {
                fsFilterSortFields['sort'] = true;
            }
        }
    }
    filtersModel.set('isEnabled', fsFilterSortFields);
    filtersModel.set('checkedOrderBy', []);
    addFSFilter();
}

function appendFSWhere() {
    appendWhere('fs');
};

function submitFSWhere() {
    var selectedORClauseIndex = queries['fs'].whereViewModel.get('selectedORClauseIndex');
    if (selectedORClauseIndex == -1) {
        addFSWhere();
    } else {
        editFSWhere();
    }
    submitWhere('fs');
};

function addFSWhere() {
    addWhere('fs');
    selectORClause('fs', -1);
};

function editFSWhere() {
    editWhere('fs');
};

function deleteFSWhereClause(clause) {
    deleteWhereClause(clause, 'fs');
};

function addFSFilter() {
    addFilter('fs');
};

function runFSQuery() {
    var reqQueryString = $('#fs-query-form').serialize(),
        validator = $("#fs-query-form").kendoValidator().data("kendoValidator"),
        select = $("#fs-query-form input[name='select']").val(),
        showChartToggle = (select.indexOf('time-granularity') != -1) ? true : false,
        options = getFSDefaultOptions(showChartToggle),
        queryId, fsGridDisplay, selectArray, labelStepUnit, schemaModelFields, fcGridDisplay,
        tg, tgUnit;
    if (validator.validate()) {
        prepare4QueryResults("fs");
        $('#fs-chart-loading').show();
        queryId = randomUUID();
        options.queryId = queryId;
        reqQueryString = setUTCTime('fs', reqQueryString, options);
        reqQueryString += '&table=FlowSeriesTable' + '&queryId=' + queryId + '&async=true';
        selectArray = parseStringToArray(select, ',');
        selectArray = selectArray.concat(fsDefaultColumns);
        fsGridDisplay = getColumnDisplay4Grid(fsColumnDisplay, selectArray);
        schemaModelFields = getSchemaModel4Grid(fsSchemaModel, selectArray);
        fcGridDisplay = getColumnDisplay4Grid(fcColumnDisplay, selectArray);
        if (selectArray.indexOf('time-granularity') != -1) {
            tg = $('#tg-value').val();
            tgUnit = $('#tg-units').val();
            labelStepUnit = getLabelStepUnit(tg, tgUnit);
            options.labelStep = labelStepUnit.labelStep;
            options.baseUnit = labelStepUnit.baseUnit
            options.interval = labelStepUnit.secInterval;
            initFSChartLoading();
        }
        loadFlowResults(options, reqQueryString, fsGridDisplay, schemaModelFields, fcGridDisplay);
    }
};

function viewFSQueryResults(dataItem) {
    var options, queryId = dataItem.queryId,
        queryJSON = dataItem.queryJSON, reqQueryString = "queryId=" + queryId,
        tg = dataItem.tg, tgUnit = dataItem.tgUnit, tgIndex,
        selectArray, fsGridDisplay, schemaModelFields, labelStepUnit, fcGridDisplay;
    selectArray = queryJSON['select_fields'];

    setFSValidValues();
    initFSQueryView('fs');
    collapseWidget("#fqq-widget");
    collapseWidget("#fr-result-widget");
    kendo.bind($('#fs-query'), queries.fs.queryViewModel);
    kendo.bind($('#fs-chart'), queries.fs.chartViewModel);
    initWidget4Id('#fs-query-widget');

    if (tg != '' && tgUnit != '') {
        options = getFSDefaultOptions(true)
        selectArray.push('time-granularity');
        labelStepUnit = getLabelStepUnit(tg, tgUnit);
        options.labelStep = labelStepUnit.labelStep;
        options.baseUnit = labelStepUnit.baseUnit
        options.interval = labelStepUnit.secInterval;
        options.fromTime = queryJSON['start_time'] / 1000;
        options.toTime = queryJSON['end_time'] / 1000;
        options.queryId = queryId;
        tgIndex = selectArray.indexOf("T=" + options.interval);
        selectArray.splice(tgIndex, 1);
        initFSChartLoading();
    } else {
        options = getFSDefaultOptions(false);
    }
    populateFSQueryForm(queryJSON, tg, tgUnit);
    toggleToGrid();
    fsGridDisplay = getColumnDisplay4Grid(fsColumnDisplay, selectArray);
    schemaModelFields = getSchemaModel4Grid(fsSchemaModel, selectArray);
    fcGridDisplay = getColumnDisplay4Grid(fcColumnDisplay, selectArray);
    prepare4QueryResults("fs");
    $('#fs-chart-loading').show();
    loadFlowResults(options, reqQueryString, fsGridDisplay, schemaModelFields, fcGridDisplay);
};

function populateFSQueryForm(queryJSON, tg, tgUnit) {
    var queryPrefix = 'fs', selectFields = queryJSON['select_fields'];
    resetTGValues(true);
    populateTimeRange(queryPrefix, queryJSON['start_time'], queryJSON['end_time']);
    populateSelect(queryPrefix, selectFields, fsDefaultColumns);
    populateTimeGranularity(queryPrefix, selectFields, tg, tgUnit);
    if (queryJSON['where'] != null) {
        populateWhere(queryPrefix, queryJSON['where']);
    }
    populateDirection(queryPrefix, queryJSON['dir']);
    populateFilter(queryPrefix, queryJSON['sort_fields'], queryJSON['sort'], queryJSON['limit']);
};

function getFSDefaultOptions(showChartToggle) {
    return {
        elementId:'fs-results', gridHeight:480, timeOut:120000,
        pageSize:100, queryPrefix:'fs', export:true, showChartToggle:showChartToggle,
        labelStep:1, baseUnit:'mins', fromTime:0, toTime:0, interval:0,
        btnId:'fs-query-submit'
    };
};

function getLabelStepUnit(tg, tgUnit) {
    var baseUnit, secInterval = 0;
    if (tgUnit == 'secs') {
        secInterval = tg;
        if (tg < 60) {
            tg = (-1 * tg);
        } else {
            tg = Math.floor(parseInt(tg / 60));
        }
        baseUnit = 'minutes';
    } else if (tgUnit == 'mins') {
        secInterval = tg * 60;
        baseUnit = 'minutes';
    } else if (tgUnit == 'hrs') {
        secInterval = tg * 3600;
        baseUnit = 'hours';
    } else if (tgUnit == 'days') {
        secInterval = tg * 86400;
        baseUnit = 'days';
    }
    return {labelStep:(1 * tg), baseUnit:baseUnit, secInterval:secInterval};
};

function setFSValidValues() {
    queries.fs.whereViewModel.set('selectFields', flowWhereFields);
    setNetworkValues('/api/admin/networks', ['sourcevn_sourceip', 'destvn_destip'], queries.fs.whereViewModel);
    setProtocolValues(['protocol_sport', 'protocol_dport'], queries.fs.whereViewModel);
    //TODO: Create a cache and get the values from that cache
};

function setNetworkValues(url, viewModelKeys, viewModel) {
    $.ajax({
        url:url,
        dataType:"json",
        success:function (response) {
            var validValueDS = formatNetworkNames(response);
            for (var i = 0; i < viewModelKeys.length; i++) {
                viewModel.set(viewModelKeys[i], validValueDS);
            }
        }
    });
};

function setProtocolValues(viewModelKeys, viewModel) {
    for (var i = 0; i < viewModelKeys.length; i++) {
        viewModel.set(viewModelKeys[i], protocolList);
    }
};

function formatNetworkNames(response, tableName) {
    var res = jsonPath(response, "$.virtual-networks[*].fq_name"),
        i, results = [];
    for (i = 0; i < res.length; i++) {
        results.push({"name":res[i].join(':'), "value":res[i].join(':')});
    }
    return results;
};

function loadSelectedFSChart(element) {
    var val = parseInt(element.value),
        fsChartData = queries['fs']['chartData'],
        selectedFlows = queries.fs.chartViewModel.get('selectedFlows'),
        chart = $('#ts-chart').data('kendoStockChart'),
        navigatorValues = queries.fs.chartViewModel.get('navigatorValues'),
        plotFields = queries.fs.chartViewModel.get('plotFields'),
        options = queries.fs.chartViewModel.get('options'),
        index, plotData = [], selectedFlow, flowClassId;
    index = findIndexInSelectedFlows(selectedFlows, val);
    if (element.checked) {
        if (selectedFlows.length >= 5) {
            $(element).prop('checked', false);
            showMessagePopup('Alert', 'You can select maximum 5 flows.');
            return;
        } else if (index == -1) {
            selectedFlows.push({flowClassId:val, sumBytes:null, sumPackets:null});
        }
    } else {
        if (selectedFlows.length == 1) {
            $(element).prop('checked', true);
            showMessagePopup('Alert', 'You must select at least 1 flow.');
            return;
        }
        if (index != -1) {
            selectedFlow = selectedFlows[index];
            flowClassId = selectedFlow['flowClassId'];
            assignColors2FlowClass({"flowClassId":flowClassId, "sumBytes":null, "sumPackets":null});
            selectedFlows.splice(index, 1);
        }
    }
    for (var i = 0; i < selectedFlows.length; i++) {
        selectedFlow = selectedFlows[i];
        flowClassId = selectedFlow['flowClassId'];
        assignColors2FlowClass(selectedFlow, flowClassId);
        if (i == 0) {
            plotData = addMissingPoints(fsChartData[flowClassId], options, plotFields);
        } else {
            plotData = plotData.concat(addMissingPoints(fsChartData[flowClassId], options, plotFields));
        }
    }
    chart.dataSource.data(plotData);
};

function findIndexInSelectedFlows(selectedFlows, val) {
    for (var i = 0; i < selectedFlows.length; i++) {
        if (selectedFlows[i]['flowClassId'] == val) {
            return i;
        }
    }
    return -1;
}

function getFlowChartData(fsChartData, flowClassId) {
    if (fsChartData[flowClassId] != null) {
        return fsChartData[flowClassId];
    } else {
        return fetchFlowChartData(fsChartData, flowClassId)
    }
};

function populateFlowChartData(fsChartData, flowClassId) {

};

function onChangeTGSelect(element) {
    var fsSelectModel = queries.fs.selectViewModel,
        checkedFields = fsSelectModel.get('checkedFields'),
        selectFields = true, selectSumFields = false;
    if (element.checked) {
        removeElementFromArray(checkedFields, 'bytes');
        removeElementFromArray(checkedFields, 'packets');
        selectFields = false;
        selectSumFields = true;
    } else {
        selectFields = true;
        selectSumFields = true;
    }
    fsSelectModel.set("isEnabled['bytes']", selectFields);
    fsSelectModel.set("isEnabled['packets']", selectFields);
    fsSelectModel.set("isEnabled['sum(bytes)']", selectSumFields);
    fsSelectModel.set("isEnabled['sum(packets)']", selectSumFields);
};

function onChangeFSSelect(element, disableIds) {
    var fsSelectModel = queries.fs.selectViewModel,
        checkedFields = fsSelectModel.get('checkedFields');
    if (checkedFields.indexOf('time-granularity') == -1) {
        if (element.checked) {
            for (var i = 0; i < disableIds.length; i++) {
                removeElementFromArray(checkedFields, disableIds[i]);
                fsSelectModel.set("isEnabled['" + disableIds[i] + "']", false);
            }
        } else {
            for (var i = 0; i < disableIds.length; i++) {
                fsSelectModel.set("isEnabled['" + disableIds[i] + "']", true);
            }
        }
    }
};

function formatTime4Tip(dataItem) {
    if (dataItem == null || dataItem.date == null) {
        return '';
    } else {
        return ' at ' + kendo.toString(new Date(dataItem.date), "HH:mm");
    }
}

//Flow Series Query - End

//Flow Record Query - Begin

queries.fr.queryViewModel = kendo.observable({
    defaultTRValue:1800,
    timeRange:[
        {"name":"Last 10 Mins", "value":600},
        {"name":"Last 30 Mins", "value":1800},
        {"name":"Last 1 Hr", "value":3600},
        {"name":"Last 6 Hrs", "value":21600},
        {"name":"Last 12 Hrs", "value":43200},
        {"name":"Custom", "value":0}
    ],
    isCustomTRVisible:false,
    direction:[
        {name:"INGRESS", value:"1"},
        {name:"EGRESS", value:"0"}
    ]
});

queries.fr.selectViewModel = kendo.observable({
    checkedFields:[]
});

queries.fr.whereViewModel = kendo.observable({
    opValues:[
        {name:"=", value:"="}
    ],
    selectFields:[],
    whereClauseView:[],
    whereClauseSubmit:[],
    whereClauseEdit:[],
    selectedORClauseIndex:"-1"
});

queries.fr.filterViewModel = kendo.observable({
    orderTypes:[
        {name:"ASC", value:"asc"},
        {name:"DESC", value:"desc"}
    ],
    checkedOrderBy:[],
    limit:""
});

function loadFlowRecords() {
    $(contentContainer).html('');
    $(contentContainer).html(qeTemplate);

    initFlowPages();

    setFRValidValues();
    initFRQueryView('fr');
    kendo.bind($('#fr-query'), queries.fr.queryViewModel);

    initWidgetBoxes();
    currTab = 'query_flow_records';
};

function initFRQueryView(queryPrefix) {
    var query = queries[queryPrefix],
        defaultToTime = new Date(),
        defaultFromTime = new Date(defaultToTime.getTime() - 600000);
    $('#' + queryPrefix + '-query').html(kendo.template($("#" + queryPrefix + "-query-template").html()));

    query.fromTime = createDTPicker(queryPrefix + '-from-time', frChangeFromTime, defaultFromTime);
    query.toTime = createDTPicker(queryPrefix + '-to-time', frChangeToTime, defaultToTime);

    query.fromTime.max(query.toTime.value());
    query.toTime.min(query.fromTime.value());

    query.selectTemplate = kendo.template($('#' + queryPrefix + '-select-popup-template').html());
    query.whereTemplate = kendo.template($('#' + queryPrefix + '-where-popup-template').html());
    query.filterTemplate = kendo.template($('#' + queryPrefix + '-filter-popup-template').html());
};

function frChangeFromTime() {
    var fromTime = queries.fr.fromTime.value();
    if (fromTime) {
        fromTime = new Date(fromTime);
        fromTime.setDate(fromTime.getDate());
        queries.fr.toTime.min(fromTime);
    }
};

function frChangeToTime() {
    var toTime = queries.fr.toTime.value();
    if (toTime) {
        toTime = new Date(toTime);
        toTime.setDate(toTime.getDate());
        queries.fr.fromTime.max(toTime);
    }
};

function openFRSelect() {
    openSelect('fr');
};

function openFRWhere() {
    openWhere('fr');
};

function openFRFilter() {
    openFilter('fr');
};

function addFRSelect() {
    addSelect('fr');
};

function appendFRWhere() {
    appendWhere('fr');
};

function submitFRWhere() {
    var selectedORClauseIndex = queries['fr'].whereViewModel.get('selectedORClauseIndex');
    if (selectedORClauseIndex == -1) {
        addFRWhere();
    } else {
        editFRWhere();
    }
    submitWhere('fr');
};

function addFRWhere() {
    addWhere('fr');
    selectORClause('fr', -1);
};

function editFRWhere() {
    editWhere('fr');
};

function deleteFRWhereClause(clause) {
    deleteWhereClause(clause, 'fr');
};

function addFRFilter() {
    addFilter('fr')
};

function runFRQuery() {
    var reqQueryString = $('#fr-query-form').serialize(),
        validator = $("#fr-query-form").kendoValidator().data("kendoValidator"),
        options = getFRDefaultOptions(),
        select = $("#fr-query-form input[name='select']").val(),
        columnDisplay, selectArray, schemaModelFields, queryId;
    if (validator.validate()) {
        prepare4QueryResults("fr");
        queryId = randomUUID();
        reqQueryString = setUTCTime('fr', reqQueryString);
        reqQueryString += '&table=FlowRecordTable' + '&queryId=' + queryId + '&async=true';
        selectArray = parseStringToArray(select, ',');
        selectArray = selectArray.concat(frDefaultColumns);
        columnDisplay = getColumnDisplay4Grid(frColumnDisplay, selectArray);
        schemaModelFields = getSchemaModel4Grid(frSchemaModel, selectArray);
        loadFlowResults(options, reqQueryString, columnDisplay, schemaModelFields);
    }
};

function viewFRQueryResults(dataItem) {
    var options = getFRDefaultOptions(), queryId = dataItem.queryId,
        queryJSON = dataItem.queryJSON, reqQueryString = "queryId=" + queryId,
        selectArray, columnDisplay, schemaModelFields;
    selectArray = queryJSON['select_fields'];

    setFRValidValues();
    initFRQueryView('fr');
    collapseWidget("#fqq-widget");
    collapseWidget("#fs-result-widget");
    kendo.bind($('#fr-query'), queries.fr.queryViewModel);
    initWidget4Id("#fr-query-widget");

    populateFRQueryForm(queryJSON);
    columnDisplay = getColumnDisplay4Grid(frColumnDisplay, selectArray);
    schemaModelFields = getSchemaModel4Grid(frSchemaModel, selectArray);
    prepare4QueryResults("fr");
    loadFlowResults(options, reqQueryString, columnDisplay, schemaModelFields);
};

function getFRDefaultOptions() {
    return {
        elementId:'fr-results', gridHeight:480,
        timeOut:60000, pageSize:100, queryPrefix:'fr', export:true,
        btnId:'fr-query-submit'
    };
};

function populateFRQueryForm(queryJSON) {
    var queryPrefix = 'fr';
    populateTimeRange(queryPrefix, queryJSON['start_time'], queryJSON['end_time']);
    populateSelect(queryPrefix, queryJSON['select_fields'], frDefaultColumns);
    if (queryJSON['where'] != null) {
        populateWhere(queryPrefix, queryJSON['where']);
    }
    populateDirection(queryPrefix, queryJSON['dir']);
};

function populateDirection(queryPrefix, direction) {
    $("#" + queryPrefix + "-select-dir").data('kendoDropDownList').value(direction);
};

function setFRValidValues() {
    queries.fr.whereViewModel.set('selectFields', flowWhereFields);
    setNetworkValues('/api/admin/networks', ['sourcevn_sourceip', 'destvn_destip'], queries.fr.whereViewModel);
    setProtocolValues(['protocol_sport', 'protocol_dport'], queries.fr.whereViewModel);
    //TODO: Create a cache and get the values from that cache
};

//Flow Record Query - End

//Flow Queue - Begin

function loadFlowQueryQueue() {
    $(contentContainer).html('');
    $(contentContainer).html(qeTemplate);

    initFlowPages();

    initFlowQueueView();
    initWidgetBoxes();
    currTab = 'query_flow_queue';
};

function initFlowQueueView() {
    var options = {elementId:'fqq-results', queueType:'fqq', timeOut:60000, gridHeight:530, pageSize:6},
        intervalId;
    $("#fqq-widget").show();
    loadQueryQueue(options);
    intervalId = setInterval(function () {
        var grid = $('#fqq-results').data('kendoGrid');
        if (grid != null) {
            grid.dataSource.read();
        } else {
            clearInterval(intervalId);
        }
    }, 60000);
    options.intervalId = intervalId;
};

//Flow Queue - End