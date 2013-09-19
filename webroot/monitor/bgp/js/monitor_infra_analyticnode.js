analyticsNodesView = function () {
    var self = this,analyticNodesData;
    var ctrlNodesGrid;

    this.load = function (obj) {
        populateAnalyticsNodes();
        layoutHandler.setURLHashParams({node:'Analytics Nodes'},{merge:false,triggerHashChange:false});
    }
    this.getAnalyticNodesData = function() {
        return analyticNodesData;
    }
    this.setAnalyticNodesData = function(data) {
        analyticNodesData = data;
    }

    this.destroy = function () {
        //contView.destroy();
    }

    function populateAnalyticsNodes() {
        infraMonitorView.clearTimers();
        var aNodesTemplate = kendo.template($("#analyticsnodes-template").html());
        $(pageContainer).html(aNodesTemplate({}));

        //Initialize widget header
        $('#analyticNodes-header').initWidgetHeader({title:'Analytics Nodes'});

        $('#analytics-nodes-grid').contrailKendoGrid({
            dataSource:{
                transport:{
                    read:{
                        url:'/api/admin/monitor/infrastructure/analyticsnodes/summary?addGen',
                        //url:'res.json',
        				//Change the default timeout explictly for this URL
                        //timeout:10000
                    }

                },
                schema:{
                    //May be this is applicable only for server-side pagination??
                    pageSize:10,
                    parse:function(response) {
                        $('#analyticNodes-bubble').initScatterChart({title:'Analytic Nodes',d:[{key:'vRouters',values:infraMonitorView.parseAnalyticNodesDashboardData(response)}],
                            link:{hashParams:{p:'mon_bgp',q:{node:'Analytics Nodes'}}}});
                        response  = $.each(response,function(idx,obj) {
                        	obj['status'] = getNodeUpTime(obj);
                            obj['histCpuArr'] = parseUveHistoricalValues(obj,'$..collector_cpu_share[*].history-10');
                        	if(obj['status'].toLowerCase().search("down") != -1) {
                        		obj['hostNameColor'] = "red";
                        	} else {
                        		obj['hostNameColor'] = "blue";
                        	}
                          //get the cpu for analytics node
                            var cpuInfo = jsonPath(obj,'$..ModuleCpuState.module_cpu_info')[0];
                            obj['analyticsCpu'] = "--";
                            obj['analyticsMem'] = "--";
                            if(cpuInfo != null) {
	                            for(var i=0; i < cpuInfo.length; i++) {
	                            	if(cpuInfo[i].module_id == 'Collector'){
	                            		obj['analyticsCpu'] = cpuInfo[i].cpu_info.cpu_share;
	                            		obj['analyticsMem'] = formatBytes(cpuInfo[i].cpu_info.meminfo.virt);
	                            	}
	                            }
                            }
                            obj['analyticsCpu'] = $.isNumeric(obj['analyticsCpu']) ? obj['analyticsCpu'].toFixed(2) : "--";
                            obj['version'] = getNodeVersion(obj);
                            //get the ips
                            var iplist = jsonPath(obj,'$..self_ip_list'); 
                            if(iplist)
                            		obj['ips'] = iplist.toString();
                            return obj;
                        });
                        return response;
                    }
                }
                //pageSize: 10
            },
            selectable:'cell',
            columns:[
                {
                    field:"name",
                    title:"Host name",
                    template:cellTemplate({cellText:'name', tooltip:true, name:'name',applyColor:true}),
                    width:140
                },
                {
                    field:"ips",
                    title:"IP address",
                    width:110
                },
                {
                    field:"version",
                    title:"Version",
                    width:110
                },
                {
                    field:"status",
                    title:"Status",
                    width:110
                },
                {
                    field:"analyticsCpu",
                    title:"CPU (%)",
                    template:'<div class="gridSparkline display-inline"></div><span class="display-inline">#= analyticsCpu #</span>',
                    width:130
                },
                {
                    field:"analyticsMem",
                    title:"Memory",
                    width:150
                },
                {
                    field:"generators",
                    title:"Generators",
                    template:'# var gencount;#'+
                        '# if(value.CollectorState["generator_infos"]!=null) #'+
                        '#   gencount = value.CollectorState["generator_infos"].length#'+
                        '#= ifNull(gencount,noDataStr)#',
                    width:85
                }
            ],
            change:onAnalyticsNodeRowSelChange, 
            dataBound:addExtraStylingToGrid,
            searchToolbar: true,
            widgetGridTitle: 'Analytics Nodes',
            searchPlaceholder: 'Search Analytics Nodes'
        });
        showGridLoading('#analytics-nodes-grid');
        aNodesGrid = $('#analytics-nodes-grid').data('kendoGrid');
        
        applyGridDefHandlers(aNodesGrid, {noMsg:'No Analytics Nodes to display'});
    }

    function onAnalyticsNodeRowSelChange() {
        //Check if cell is clickable
        if ($(this.select()).find('*[name]').length > 0) {
            //var selRowDataItem = aNodesGrid.dataItem(aNodesGrid.select());
            var selRowDataItem = aNodesGrid.dataSource.view()[this.select().closest('tr').index()];
            //Info:Check if this event is triggered on row unselect also??
            //No unselect happens in current use case as we navigate to a different page on row select
            if (aNodesGrid.select().length == 1) {
            	var selRowDataItem = aNodesGrid.dataSource.view()[this.select().closest('tr').index()];
                var tree = $("#treeInfraNode").data("kendoTreeView");
                if (tree) {
                    selTreeNode({tree:tree, fqName:'Analytics Nodes:' + selRowDataItem['name'],trigger:false})
                }
                aNodeView.load({name:selRowDataItem['name'], ip:selRowDataItem['ips']});
                //layoutHandler.setURLHashParams({node:'Control Nodes:' + selRowDataItem['hostName']},{merge:false});
            }
        }
    }
}

analyticsNodeView = function () {
    var peersGrid, routesGrid, consoleGrid, ctrlNodeTabStrip;
    var generatorsGrid;
    var aNodeInfo = {}, self = this;
    var aNodeData = {};
    var routesViewModel = kendo.observable({
        routingInstances:[],
        routingInstanceValue:'All',
        routeTables:[],
        routeTableValue:'All',
        peerSources:[],
        peerSourceValue:'',
        prefix:'',
        routeLimits:$.map([10, 50, 100, 200], function (value) {
            return {text:'Limit ' + value + ' Routes', value:value};
        }),
        limit:50
    });

    this.load = function (obj) {
        pushBreadcrumb([obj['name']]);
        aNodeInfo = obj;
    	if((aNodeInfo == null || aNodeInfo.ip ==  null ||  aNodeInfo.ip == '') && aNodeInfo.tab != null){
			//issue details call and populate ip
			var analyticsNodeDeferredObj = $.Deferred();
			self.getAnalyticsNodeDetails(analyticsNodeDeferredObj,aNodeInfo);
			analyticsNodeDeferredObj.done(function(data) {
				try{
					aNodeInfo['ip'] = data.CollectorState.self_ip_list[0];
				} catch(e){}
            	if (aNodeInfo)
    	            selTreeNode({tree:infraNodesTree, fqName:aNodeInfo['name'], expand:true, trigger:false});
    	        self.populateAnalyticsNode(aNodeInfo);
            });
		} else {
			if (aNodeInfo['name'] != null)
	            selTreeNode({tree:infraNodesTree, fqName:aNodeInfo['name'], expand:true, trigger:false});
	        self.populateAnalyticsNode(aNodeInfo);
		}
    }

    this.destroy = function () {
        //contView.destroy();
    }

    this.getAnalyticsNodeDetails = function(deferredObj,obj) {
        $.ajax({
            url:'/api/admin/monitor/infrastructure/analyticsnode/details?hostname=' + obj['name']
        }).done(function(result) {
            deferredObj.resolve(result);
        });
    }

    function populateDetailsTab(obj) {
        var endTime = new Date().getTime(), startTime = endTime - 600000;
        var slConfig = {startTime: startTime, endTime: endTime};
        var nodeIp;
        //Compute the label/value pairs to be displayed in dashboard pane
        //As details tab is the default tab,don't update the tab state in URL
        layoutHandler.setURLHashParams({tab:'',ip:obj['ip'], node:kendo.format('Analytics Nodes:{0}', obj['name'])},{triggerHashChange:false});
        //showProgressMask('#analyticsnode-dashboard', true);
        //Destroy chart if it exists
        startWidgetLoading('analytics-sparklines');
        toggleWidgetsVisibility(['collector-chart-box'], ['queryengine-chart-box', 'opServer-chart-box']);
        $.ajax({
            url:'/api/admin/monitor/infrastructure/analyticsnode/details?hostname=' + obj['name']
        }).done(function (result) {
                aNodeData = result;
                var cpu = "N/A",
                    memory = "N/A",
                    dashboardTemplate = kendo.template($('#dashboard-template').html()),
                    aNodeDashboardInfo, oneMinCPU, fiveMinCPU, fifteenMinCPU,
                    usedMemory, totalMemory;
                /*if (ctrlNodeData['cpu']['one_min_avg'] != null) {
                 oneMinCPU = ctrlNodeData['cpu']['one_min_avg'];
                 fiveMinCPU = ctrlNodeData['cpu']['five_min_avg'];
                 fifteenMinCPU = ctrlNodeData['cpu']['fifteen_min_avg'];
                 cpu = kendo.format('{0} / {1} / {2}', oneMinCPU, fiveMinCPU, fifteenMinCPU);
                 }
                 if (ctrlNodeData['memory']['virt'] != null) {
                 usedMemory = parseInt(ctrlNodeData['memory']['virt']) * 1024;
                 //totalMemory = parseInt(ctrlNodeData['memory']['total']) * 1024;
                 memory = kendo.format('{0} / {1}', formatBytes(usedMemory), formatBytes(totalMemory));
                 }*/
                $('#collector-sparklines').initMemCPUSparkLines(result, 'parseMemCPUData4SparkLines', {'ModuleCpuState':[{name: 'collector_cpu_share', color: 'blue-sparkline'}, {name: 'collector_mem_virt', color: 'green-sparkline'}]}, slConfig);
                $('#queryengine-sparklines').initMemCPUSparkLines(result, 'parseMemCPUData4SparkLines', {'ModuleCpuState':[{name: 'queryengine_cpu_share', color: 'blue-sparkline'}, {name: 'queryengine_mem_virt', color: 'green-sparkline'}]}, slConfig);
                $('#opServer-sparklines').initMemCPUSparkLines(result, 'parseMemCPUData4SparkLines', {'ModuleCpuState':[{name: 'opserver_cpu_share', color: 'blue-sparkline'}, {name: 'opserver_mem_virt', color: 'green-sparkline'}]}, slConfig);
                endWidgetLoading('analytics-sparklines');
                aNodeDashboardInfo = [
                    {lbl:'Hostname', value:(function (){
                    	try{
                    		return ifNull(aNodeData.ModuleClientState.client_info.collector_name,noDataStr);
                    	}catch(e){
                    		return noDataStr;
                    	}
                    })()},
                    {lbl:'IP Address', value:(function(){
                        var ips = '',iplist;
                        try{
                        	iplist = aNodeData.CollectorState.self_ip_list;
                        } catch(e){}
                        if(iplist != null && iplist.length>0){
                            for (var i=0; i< iplist.length;i++){
                                if(i+1 == iplist.length) {
                                    ips = ips + iplist[i];
                                } else {
                                    ips = ips + iplist[i] + ', ';
                                }
                            }
                        } else {
                        	ips = '--';
                        }
                        nodeIp = ips;
                        return ips;
                    })()},
                    //(function(){})()},
                    {lbl:'Status', value:(function(){
                        return getNodeUpTime(aNodeData);
                    })()},
                    {lbl:'CPU', value:(function(){
                    	try{
	                    	var cpuInfo = aNodeData.ModuleCpuState.module_cpu_info;
		                    for(var i=0; i < cpuInfo.length; i++) {
		                    	if(cpuInfo[i].module_id == 'Collector'){
		                    		return ifNull(cpuInfo[i].cpu_info.cpu_share,noDataStr) + ' %';
		                    	}
		                    }
                    	}catch(e){return '--';}
	                    })()},
                    {lbl:'Memory', value:(function(){
                    	try{
	                    	var cpuInfo = aNodeData.ModuleCpuState.module_cpu_info;
		                    for(var i=0; i < cpuInfo.length; i++) {
		                    	if(cpuInfo[i].module_id == 'Collector'){
		                    		return ifNull(formatBytes(cpuInfo[i].cpu_info.meminfo.virt),noDataStr)
		                    	}
		                    }
                    	}catch(e){return '--';}
	                    })()},
                    {lbl:'Messages', value:(function(){
                    	var msgTypeStats ;
                    	try{
                    		msgTypeStats = aNodeData.ModuleServerState.msg_stats[0].msgtype_stats;
                    	} catch(e) {}
                    	var msgCount = 0;
                    	var msgBytes = 0;
                    	if(msgTypeStats != null) {
	                    	for(var i=0; i < msgTypeStats.length; i++){
	                    		msgCount += parseInt(msgTypeStats[i].messages); 
	                    		msgBytes += parseInt(msgTypeStats[i].bytes); 
	                    	}
                    	}
                    	return msgCount + ' [' + formatBytes(msgBytes) + ']';
                    })()},
                    {lbl:'Generators', value:(function(){
                        var ret='';
                        //ret = ret + 'Total ';
                        var genno;
                        try{
	                        if(aNodeData.CollectorState["generator_infos"]!=null){
	                            genno = aNodeData.CollectorState["generator_infos"].length;
	                        };
	                        ret = ret + ifNull(genno,noDataStr);
                    	}catch(e){}
                        return ret;
                    })()},
                    {lbl:'Last Log', value: (function(){
                    	var lmsg;
                		try {
                			lmsg = aNodeData.ModuleServerState.msg_stats[0].log_level_stats[0].last_msg_timestamp;
                		} catch(err){}
                    	if(lmsg != null){
                    		var d = new Date(parseInt(aNodeData.ModuleServerState.msg_stats[0].log_level_stats[0].last_msg_timestamp)/1000);
                    		return d.toLocaleString();
                    	}
                        })()}
                    //'vRouters ' + aNodeData['establishedPeerCount'] + ', ' +
                    //'Collectors ' + aNodeData['activevRouterCount'] + ', ' +
                    //'Analytics Nodes ' + aNodeData['activevRouterCount'] + ', ' +
                    //'Config Nodes ' + aNodeData['activevRouterCount']},
                ]
                var cores=getCores(aNodeData);
                for(var i=0;i<cores.length;i++)
                	aNodeDashboardInfo.push(cores[i]);
                //showProgressMask('#analyticsnode-dashboard');
                $('#analyticsnode-dashboard').html(dashboardTemplate({title:'Analytics Node',colCount:2, d:aNodeDashboardInfo, nodeData:aNodeData, showSettings:true, ip:nodeIp}));
                $('#linkIntrospect').click(function(){
            		window.open('http://'+obj['ip']+':8089/', '_blank');
            	});
                $('#linkStatus').on('click', function(){
                	showStatus(nodeIp);
                });
                initWidget4Id('#dashboard-box');
                initWidget4Id('#collector-chart-box');
                initWidget4Id('#queryengine-chart-box');
                initWidget4Id('#opServer-chart-box');
            }).fail(displayAjaxError.bind(null, $('#analyticsnode-dashboard')));
        $('#collector-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=Collector&minsSince=30&sampleCnt=10&source=' + obj['name'];
        }, parser: "parseProcessMemCPUData", plotOnLoad: true, showWidgetIds: ['collector-chart-box'], hideWidgetIds: ['queryengine-chart-box', 'opServer-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}),110);
        $('#queryengine-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=QueryEngine&minsSince=30&sampleCnt=10&source=' + obj['name'];
        }, parser: "parseProcessMemCPUData", plotOnLoad: false, showWidgetIds: ['queryengine-chart-box'], hideWidgetIds: ['collector-chart-box', 'opServer-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}),110);
        $('#opServer-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=OpServer&minsSince=30&sampleCnt=10&source=' + obj['name'];
        }, parser: "parseProcessMemCPUData", plotOnLoad: false, showWidgetIds: ['opServer-chart-box'], hideWidgetIds: ['collector-chart-box', 'queryengine-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}),110);
    }

    function populateGeneratorsTab(obj) {
        layoutHandler.setURLHashParams({tab:'generators',ip:aNodeInfo['ip'], node:kendo.format('Analytics Nodes:{0}', obj['name'])},{triggerHashChange:false});
        //Intialize the grid only for the first time
        if (!isInitialized('#gridGenerators')) {
            $('#gridGenerators').contrailKendoGrid({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/analyticsnode/generators?ip=' + aNodeInfo['ip'] + '&hostname=' + obj['name']
                            }
                        }
                    }
                },
                columns:[
                    {
                        field:"name",
                        title:"Name",
                        width:110
                        //template:cellTemplate({cellText:'#=  name.split(":")  #', tooltip:true})
                    },
                    {
                        field:"status",
                        title:"Status",
                        template:'# var generatorInfo = value["ModuleServerState"]["generator_info"]; #'+ 
                        	'# var collectorName = value["ModuleClientState"]["client_info"]["collector_name"]; #'+
                        	'# var strtTime = value["ModuleClientState"]["client_info"]["start_time"]; #'+
                        	'#= getStatusForGenerator(generatorInfo,collectorName,strtTime)#',
                        width:210
                    },
                    {
                        field:'messages',
                        template:'# var msgStats;#'+
                        	'# try { msgStats= value["ModuleServerState"]["msg_stats"][0]["msgtype_stats"];}catch(e){}#'+
                            '# var msgsCount = 0;#'+
                            '#if(msgStats != null){#'+
                            '#for (var i = 0; i < msgStats.length; i++) { #'+
                            '# msgsCount += parseInt(msgStats[i]["messages"]); #'+
                            '# } #'+
                            '# } #'+
                            '#= msgsCount #',
                        headerAttributes:{style:'min-width:160px;'},
                        width:160,
                        title:"Messages"
                    },
                    {
                        field:"bytes",
                        title:"Bytes",
                        template:'# var msgStats;#'+
                    		'# try { msgStats= value["ModuleServerState"]["msg_stats"][0]["msgtype_stats"];}catch(e){}#'+
                            '# var msgsCount = 0;#'+
                            '#if(msgStats != null){#'+
                            '#for (var i = 0; i < msgStats.length; i++) { #'+
                            '# msgsCount += parseInt(msgStats[i]["bytes"]); #'+
                            '# } #'+
                            '# } #'+
                            '#= formatBytes(msgsCount) #',
                        width:140
                    }/*{
                     field:'action',
                     //template:'<select class="input-elem"></select>',
                     template:'<ul class="main" style="width:120px"><li style="width:120px">Actions<ul style="width:120px"><li>Troubleshoot</li></ul></li></ul>',
                     width:130,
                     title:'Actions'
                     }*/
                ],
                //change: onPeerRowSelChange,
                detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                detailInit:initGridDetail,
                dataBound:addActions,
                searchToolbar: true,
                widgetGridTitle: 'Generators',
                searchPlaceholder: 'Search Generators'
            })
            showGridLoading('#gridGenerators');
            generatorsGrid = $('#gridGenerators').data('kendoGrid');
            applyGridDefHandlers(generatorsGrid, {noMsg:'No generators to display'});
        } else {
            reloadKendoGrid(generatorsGrid);
        }
        function addActions() {
            $('td').each(function () {
                var colIndex = $(this).index();
                var cellHeader = $(this).closest('.k-grid-content').siblings('.k-grid-header').find('thead tr th')[colIndex]
                if ($(cellHeader).text() == 'Actions') {
                    //$(this).addClass('cell-menu');
                    $(this).css('overflow', 'visible');
                }
            });
            $('select', generatorsGrid.element).each(function () {
                $(this).kendoDropDownList({});
            });
            $('ul.main', generatorsGrid.element).each(function () {
                $(this).kendoMenu({popupCollision:false,
                    select:onMenuSelect});
            });
            function onMenuSelect(e) {
                //console.info('Hello');
                var selMenu = $(e.item).text();
                var rowIndex = $(this.element).closest('tr').index();
                var selRowDataItem = generatorsGrid.dataSource.view()[rowIndex];
                //console.info(selMenu,rowIndex);
                if (selMenu == 'Troubleshoot') {
                    var menuObj = menuHandler.getMenuObjByHash('mon_syslog');
                    menuHandler.loadViewFromMenuObj(menuObj);
                }
            }
        }

        function onGeneratorRowSelChange() {
            var selRowDataItem = generatorsGrid.dataItem(generatorsGrid.select());
            if (currView != null) {
                currView.destroy();
            }
            currView = generatorNodeView;
            generatorNodeView.load({name:selRowDataItem['address']});
        }
    }

    function populateQEQueriesTab(obj) {
        layoutHandler.setURLHashParams({tab:'qequeries', node:kendo.format('Analytics Nodes:{0}', obj['name'])},{triggerHashChange:false});
        //Intialize the grid only for the first time
        if (!isInitialized('#gridQEQueries')) {
            qequeriesGrid = $('#gridQEQueries').contrailKendoGrid({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/analyticsnode/details?hostname=' + aNodeInfo['name']
                            }
                        }
                    },
                    schema:{
                        parse:function (response) {
                        	try {
                        	response =  response.QueryStats.queries_being_processed;
                        	} catch(e) {response = null;}
                            //response =  ifNull(jsonPath(response,'$..QueryStats.queries_being_processed')[0],[]);
                            response = ifNull(response,[]);
                            response  = $.each(response,function(idx,obj) {
                              var enqtime = jsonPath(obj,'$..enqueue_time');
                              var enqueueTime
                              if(enqtime != null)
                            	  enqueueTime = new XDate(enqtime/1000).toString('M/d/yy h:mm:ss');;
                              obj['time'] = enqueueTime;
                              return obj;
                            });
                        	return response;
                        }
                    }
                },
                columns:[
                    {
                        field:"time",
                        title:"Enqueue Time",
                        width:110
                    },
                    {
                        field:"query",
                        title:"Query",
                        width:125
                    },
                    {
                        field:"progress",
                        title:"Progress (%)",
                        width:140
                    }
                    /*{
                        field:'records',
                        title:"Records",
                        headerAttributes:{style:'min-width:160px;'},
                        width:160
                    },{
                        field:"timetaken",
                        title:"Time Taken",
                        width:140
                    }
                    */
                ],
                //change: onPeerRowSelChange,
                dataBound:addActions,
                searchToolbar: true,
                widgetGridTitle: 'QE Queries',
                searchPlaceholder: 'Search QE Queries'
            });
            showGridLoading('#gridQEQueries');
            qequeriesGrid = $('#gridQEQueries').data('kendoGrid');
            applyGridDefHandlers(qequeriesGrid, {noMsg:'No QE Queries to display'});
        } else {
            reloadKendoGrid(qequeriesGrid);
        }
        function addActions() {
            $('td').each(function () {
                var colIndex = $(this).index();
                var cellHeader = $(this).closest('.k-grid-content').siblings('.k-grid-header').find('thead tr th')[colIndex]
                if ($(cellHeader).text() == 'Actions') {
                    //$(this).addClass('cell-menu');
                    $(this).css('overflow', 'visible');
                }
            });
            $('select', qequeriesGrid.element).each(function () {
                $(this).kendoDropDownList({});
            });
            $('ul.main', qequeriesGrid.element).each(function () {
                $(this).kendoMenu({popupCollision:false,
                    select:onMenuSelect});
            });
            function onMenuSelect(e) {
                //console.info('Hello');
                var selMenu = $(e.item).text();
                var rowIndex = $(this.element).closest('tr').index();
                var selRowDataItem = qequeriesGrid.dataSource.view()[rowIndex];
                //console.info(selMenu,rowIndex);
                if (selMenu == 'Troubleshoot') {
                    var menuObj = menuHandler.getMenuObjByHash('mon_syslog');
                    menuHandler.loadViewFromMenuObj(menuObj);
                }
            }
        }

        function onGeneratorRowSelChange() {
            var selRowDataItem = qequeriesGrid.dataItem(qequeriesGrid.select());
            if (currView != null) {
                currView.destroy();
            }
            currView = generatorNodeView;
            generatorNodeView.load({name:selRowDataItem['address']});
        }
    }

    this.populateAnalyticsNode = function (obj) {
        //Render the view only if URL HashParam doesn't match with this view
        var tabs = ['details', 'console', 'generators', 'qequeries'];

        //Implies that we are already in analytics node details page
        if (!isInitialized('#analytics_tabstrip')) {
            var aNodeTemplate = kendo.template($("#analyticsnode-template").html());
            $(pageContainer).html(aNodeTemplate(aNodeInfo));

            kendo.init($('#formRoutes'));
            kendo.bind($('#formRoutes'), routesViewModel);

            //Set the height of all tabstrip containers to viewheight - tabstrip
            var tabContHeight = layoutHandler.getViewHeight() - 42;
          //  $('#analytics_tabstrip > div').height(tabContHeight);

            aNodeTabStrip = $("#analytics_tabstrip").kendoTabStrip({
                height:"300px",
                animation:{
                    open:{
                        effects:"fadeIn"
                    }
                },
                select:function (e) {
                    infraMonitorView.clearTimers();
                    var selTab = $(e.item).text();
                    if (selTab == 'Generators') {
                        populateGeneratorsTab(aNodeInfo);
                    } else if (selTab == 'QE Queries') {
                        populateQEQueriesTab(aNodeInfo);
                    } else if (selTab == 'Console') {
                        infraMonitorView.populateMessagesTab('analytics', {source:aNodeInfo['name']}, aNodeInfo);
                    } else if (selTab == 'Details') {
                        populateDetailsTab(aNodeInfo);
                    }
                }
            }).data('kendoTabStrip');
        }
        var tabIdx = $.inArray(obj['tab'], tabs);
        if (tabIdx == -1)
            tabIdx = 0;
        //If any tab is stored in URL,select it else select the first tab
        //aNodeTabStrip.select(tabIdx);
        //aNodeTabStrip.trigger('select', {item:aNodeTabStrip.element.find('.k-item.k-state-active')[tabIdx]});
        selectKendoTab(aNodeTabStrip,tabIdx);
    }
}

aNodesView = new analyticsNodesView();
aNodeView = new analyticsNodeView();
