configNodesView = function () {
    var self = this;
    var ctrlNodesGrid,configNodesData;

    this.load = function (obj) {
        populateConfigNodes();
        layoutHandler.setURLHashParams({node:'Config Nodes'},{merge:false,triggerHashChange:false});
    }

    this.getConfigNodesData = function() {
        return configNodesData;
    }
    this.setConfigNodesData = function(data) {
        configNodesData = data;
    }

    this.destroy = function () {
        //contView.destroy();
    }

    function populateConfigNodes() {
        infraMonitorView.clearTimers();
        var confNodesTemplate = kendo.template($("#confignodes-template").html());
        $(pageContainer).html(confNodesTemplate({}));

        //Initialize widget header
        $('#configNodes-header').initWidgetHeader({title:'Config Nodes'});

        $('#config-nodes-grid').contrailKendoGrid({
            dataSource:{
                transport:{
                    read:{
                        url:'/api/admin/monitor/infrastructure/confignodes/summary?addGen',
                        //Change the default timeout explictly for this URL
                        //timeout:10000
                    },
                    schema:{
                        //May be this is applicable only for server-side pagination??
                        pageSize:10
                    }
                },
                schema:{
                    //May be this is applicable only for server-side pagination??
                    pageSize:10,
                    parse:function(response) {
                        $('#configNodes-bubble').initScatterChart({title:'Config Nodes',d:[{key:'vRouters',values:infraMonitorView.parseConfigNodesDashboardData(response)}],
                            link:{hashParams:{p:'mon_bgp',q:{node:'Config Nodes'}}}});
                        response  = $.each(response,function(idx,obj) {
                        	obj['ip'] = ifNull(jsonPath(obj,'$..config_node_ip')[0],'--');
                        	obj['status'] = getNodeUpTime(obj);
                        	if(obj['status'].toLowerCase().search("down") != -1) {
                        		obj['hostNameColor'] = "red";
                        	} else {
                        		obj['hostNameColor'] = "blue";
                        	}
                        	var apiServerStatus = getConfigNodesStatus(obj,'ApiServer');
                        	var serviceMonitorStatus = getConfigNodesStatus(obj,'ServiceMonitor');
                        	var schemaStatus = getConfigNodesStatus(obj,'Schema');
                        	if(apiServerStatus.search('Down') != -1 || serviceMonitorStatus.search('Down') != -1  
                        			|| schemaStatus.search('Down') != -1 ){
                        		obj['hostNameColor'] = "red";
                        	}
                            //get the cpu for config node
                            var cpuInfo1 ;
                            try{
                            	cpuInfo1 = jsonPath(obj,'$..configNode.ModuleCpuState.module_cpu_info');
                            }catch(e){}
                            obj['configCpu'] = '--';
                            obj['configMem'] = '--';
                            if(cpuInfo1[0] != null) {
	                            for(var i=0; i < cpuInfo1[0].length; i++) {
	                            	if(cpuInfo1[0][i] != null && cpuInfo1[0][i].module_id == 'ApiServer' && 
	                            			cpuInfo1[0][i].cpu_info != null){
	                            		obj['configCpu'] = cpuInfo1[0][i].cpu_info.cpu_share;
                                        //As memory is reported in KB in UVE
	                            		obj['configMem'] = formatBytes(cpuInfo1[0][i].cpu_info.meminfo.virt*1024);
	                            	}
	                            }
                            }
                           obj['version'] = getNodeVersion(obj);
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
                    field:"hostName",
                    title:"Host name",
                    template:cellTemplate({cellText:'name', tooltip:true, name:'hostName', applyColor:true}),
                    width:140
                },
                {
                    field:"ip",
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
                    field:"cpu",
                    title:"CPU (%)",
                    template:'#= $.isNumeric(configCpu) ? configCpu.toFixed(2) : "--"#',
                    width:75
                },
                {
                    field:"configMem",
                    title:"Memory",
                    width:150
                }
            ],
            change:onConfigNodeRowSelChange,
            dataBound:addExtraStylingToGrid,
            searchToolbar: true,
            widgetGridTitle: 'Config Nodes',
            searchPlaceholder: 'Search Config Nodes'
        });
        showGridLoading('#config-nodes-grid');
        confNodesGrid = $('#config-nodes-grid').data('kendoGrid');
        applyGridDefHandlers(confNodesGrid, {noMsg:'No Config Nodes to display'});
    }

   
    function onConfigNodeRowSelChange() {
        //Check if cell is clickable
        if ($(this.select()).find('*[name]').length > 0) {
            //var selRowDataItem = configNodesGrid.dataItem(confNodesGrid.select());
            var selRowDataItem = confNodesGrid.dataSource.view()[this.select().closest('tr').index()];
            //Info:Check if this event is triggered on row unselect also??
            //No unselect happens in current use case as we navigate to a different page on row select
            if (confNodesGrid.select().length == 1) {
            	var selRowDataItem = confNodesGrid.dataSource.view()[this.select().closest('tr').index()];
                var tree = $("#treeInfraNode").data("kendoTreeView");
                if (tree) {
                    selTreeNode({tree:tree, fqName:'Config Nodes:' + selRowDataItem['name'],trigger:false})
                }
                confNodeView.load({name:selRowDataItem['name'], ip:selRowDataItem['ip']});
                //layoutHandler.setURLHashParams({node:'Control Nodes:' + selRowDataItem['hostName']},{merge:false});
            }
        }
    }
}

configNodeView = function () {
    var peersGrid, routesGrid, consoleGrid, ctrlNodeTabStrip;
    var generatorsGrid;
    var confNodeInfo = {}, self = this;
    var confNodeData = {};
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
        if (obj['name'] != null)
            selTreeNode({tree:infraNodesTree, fqName:obj['name'], expand:true, trigger:false});
        confNodeInfo = obj;
        //Select tab
        self.populateConfigNode(obj);
        //Update URL Hashparams only if tab is empty
    }

    this.destroy = function () {
        //contView.destroy();
    }


    function populateDetailsTab(obj) {
        var endTime = new Date().getTime(), startTime = endTime - 600000;
        var slConfig = {startTime: startTime, endTime: endTime};
        var nodeIp;
        //Compute the label/value pairs to be displayed in dashboard pane
        //As details tab is the default tab,don't update the tab state in URL
        layoutHandler.setURLHashParams({tab:'',ip:obj['ip'], node:kendo.format('Config Nodes:{0}', obj['name'])},{triggerHashChange:false});
        startWidgetLoading('config-sparklines');
        toggleWidgetsVisibility(['apiServer-chart-box'], ['serviceMonitor-chart-box', 'schema-chart-box']);
        $.ajax({
            url:'/api/admin/monitor/infrastructure/confignode/details?hostname=' + obj['name']
        }).done(function (result) {
                $('#apiServer-sparklines').initMemCPUSparkLines(result.configNode, 'parseMemCPUData4SparkLines', {'ModuleCpuState':[{name: 'api_server_cpu_share', color: 'blue-sparkline'}, {name: 'api_server_mem_virt', color: 'green-sparkline'}]}, slConfig);
                $('#serviceMonitor-sparklines').initMemCPUSparkLines(result.configNode, 'parseMemCPUData4SparkLines', {'ModuleCpuState':[{name: 'service_monitor_cpu_share', color: 'blue-sparkline'}, {name: 'service_monitor_mem_virt', color: 'green-sparkline'}]}, slConfig);
                $('#schema-sparklines').initMemCPUSparkLines(result.configNode, 'parseMemCPUData4SparkLines', {'ModuleCpuState':[{name: 'schema_xmer_cpu_share', color: 'blue-sparkline'}, {name: 'schema_xmer_mem_virt', color: 'green-sparkline'}]}, slConfig);
                endWidgetLoading('config-sparklines');
                confNodeData = result;
                var cpu = "N/A",
                    memory = "N/A",
                    dashboardTemplate = kendo.template($('#dashboard-template').html()),
                    confNodeDashboardInfo, oneMinCPU, fiveMinCPU, fifteenMinCPU,
                    usedMemory, totalMemory;
                confNodeDashboardInfo = [
                    {lbl:'IP Address', value:(function (){
                    	nodeIp = ifNull(jsonPath(confNodeData,'$..config_node_ip')[0],'--');
                    	return nodeIp;
                    })()},
                    {lbl:'Status', value:(function(){
                    	return getNodeUpTime(confNodeData);
                	})()},
                	{lbl:'Analytics Node', value:confNodeData.ApiServer.ModuleClientState.client_info.collector_name},
                	{lbl:'ApiServer', value:(function(){
                    	try{
                    		var ip = '',statusstr ='';
                			ip = ifNull(jsonPath(confNodeData,'$..ApiServer..ModuleClientState..primary')[0],'--');
                			statusstr = getConfigNodesStatus(confNodeData,'ApiServer');
                    		return ip + ' ' + statusstr;
                    	}catch(e){ return '--';}
                    })()},
                    {lbl:'Schema', value:(function(){
                    	try{
                    		var ip = '',statusstr ='';
                			ip = ifNull(jsonPath(confNodeData,'$..Schema..ModuleClientState..primary')[0],'--');
                			statusstr = getConfigNodesStatus(confNodeData,'Schema');
                    		return ip + ' ' + statusstr;
                    	}catch(e){ return '--';}
                    })()},
                    {lbl:'Service Monitor', value:(function(){
                    	try{
                    		var ip = '',statusstr ='';
                			ip = ifNull(jsonPath(confNodeData,'$..ServiceMonitor..ModuleClientState..primary')[0],'--');
                			statusstr = getConfigNodesStatus(confNodeData,'ServiceMonitor');
                    		return ip + ' ' + statusstr;
                    	}catch(e){ return '--';}
                    })()},
                  //  {lbl:'Analytics Messages', value:(function(){return (parseInt(confNodeData.ApiServer.ModuleServerState["generator_info"]["connect_time"]) 
                  //    > parseInt(confNodeData.ModuleServerState["generator_info"]["reset_time"]))?"Up":"Down"})()},
                    {lbl:'CPU', value:(function(){
                    	var cpuInfo;
                    	try{
                    		cpuInfo = confNodeData.configNode.ModuleCpuState.module_cpu_info;
                    	} catch(e){}
                    	if(cpuInfo != null){
		                    for(var i=0; i < cpuInfo.length; i++) {
		                    	if(cpuInfo[i].module_id == 'ApiServer'){
		                    		return ifNull(cpuInfo[i].cpu_info.cpu_share,noDataStr) + ' %';
		                    	}
		                    }
                    	}
	                    })()},
                    {lbl:'Memory', value:(function(){
                    	var cpuInfo;
                    	try{
                    		cpuInfo = confNodeData.configNode.ModuleCpuState.module_cpu_info;
                    	} catch(e){}
                    	if(cpuInfo != null){
		                    for(var i=0; i < cpuInfo.length; i++) {
		                    	if(cpuInfo[i].module_id == 'ApiServer'){
		                    		return ifNull(formatBytes(cpuInfo[i].cpu_info.meminfo.virt),noDataStr)
		                    	}
		                    }
                    	}
                    	})()},
                	{lbl:'Last Log', value: (function(){
                		var lmsg;
                		try {
                			lmsg = confNodeData.ApiServer.ModuleServerState.msg_stats[0].log_level_stats[0].last_msg_timestamp;
                		} catch(err){}
                		if(lmsg != null) {
                			var d = new Date(parseInt(confNodeData.ApiServer.ModuleServerState.msg_stats[0].log_level_stats[0].last_msg_timestamp)/1000);
                        	return d.toLocaleString()	;
                		}
                		})()}
                ]
                var cores=getCores(confNodeData);
                for(var i=0;i<cores.length;i++)
                	confNodeDashboardInfo.push(cores[i]);
                //showProgressMask('#confignode-dashboard');
                $('#confignode-dashboard').html(dashboardTemplate({title:'Configuration Node',colCount:2, d:confNodeDashboardInfo, nodeData:confNodeData, showSettings:true, ip:nodeIp}));
                $('#linkIntrospect').click(function(){
            		window.open('http://'+obj['ip']+':8084/', '_blank');
            	});
                $('#linkStatus').on('click', function(){
                	showStatus(nodeIp);
                });
                initWidget4Id('#dashboard-box');
                initWidget4Id('#apiServer-chart-box');
                initWidget4Id('#serviceMonitor-chart-box');
                initWidget4Id('#schema-chart-box');
            }).fail(displayAjaxError.bind(null, $('#confignode-dashboard')));
        $('#apiServer-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=ApiServer&minsSince=30&sampleCnt=10&source=' + obj['name'];
        }, parser: "parseProcessMemCPUData", parser: "parseProcessMemCPUData", plotOnLoad: true, showWidgetIds: ['apiServer-chart-box'], hideWidgetIds: ['serviceMonitor-chart-box', 'schema-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}),110);
        $('#serviceMonitor-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=ServiceMonitor&minsSince=30&sampleCnt=10&source=' + obj['name'];
        }, parser: "parseProcessMemCPUData", plotOnLoad: false, showWidgetIds: ['serviceMonitor-chart-box'], hideWidgetIds: ['apiServer-chart-box', 'schema-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}),110);
        $('#schema-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=Schema&minsSince=30&sampleCnt=10&source=' + obj['name'];
        }, parser: "parseProcessMemCPUData", plotOnLoad: false, showWidgetIds: ['schema-chart-box'], hideWidgetIds: ['apiServer-chart-box', 'serviceMonitor-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}),110);
    }

    this.populateConfigNode = function (obj) {
        //Render the view only if URL HashParam doesn't match with this view
        var tabs = ['details', 'console', 'generators', 'qequeries'];

        //Implies that we are already in config node details page
        if (!isInitialized('#config_tabstrip')) {
            var confNodeTemplate = kendo.template($("#confignode-template").html());
            $(pageContainer).html(confNodeTemplate(confNodeInfo));

            kendo.init($('#formRoutes'));
            kendo.bind($('#formRoutes'), routesViewModel);

            //Set the height of all tabstrip containers to viewheight - tabstrip
            var tabContHeight = layoutHandler.getViewHeight() - 42;
          //  $('#config_tabstrip > div').height(tabContHeight);

            confNodeTabStrip = $("#config_tabstrip").kendoTabStrip({
                height:"300px",
                animation:{
                    open:{
                        effects:"fadeIn"
                    }
                },
                select:function (e) {
                    infraMonitorView.clearTimers();
                    var selTab = $(e.item).text();
                    if (selTab == 'Console') {
                        infraMonitorView.populateMessagesTab('config', {source:confNodeInfo['name']}, confNodeInfo);
                    } else if (selTab == 'Details') {
                        populateDetailsTab(confNodeInfo);
                    }
                }
            }).data('kendoTabStrip');
        }
        var tabIdx = $.inArray(obj['tab'], tabs);
        if (tabIdx == -1)
            tabIdx = 0;
        //If any tab is stored in URL,select it else select the first tab
        confNodeTabStrip.select(tabIdx);
        confNodeTabStrip.trigger('select', {item:confNodeTabStrip.element.find('.k-item.k-state-active')[tabIdx]});
    }
}

confNodesView = new configNodesView();
confNodeView = new configNodeView();
