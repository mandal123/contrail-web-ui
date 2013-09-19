computeNodesView = function () {
    var computeNodesGrid,vRoutersData = [];
    var vRouterCF;
    var dimensions = [],filterDimension;
    var self = this;
    this.getvRouterCF = function() {
        return vRouterCF;
    }
    this.getvRoutersData = function() {
        return vRoutersData;
    }
    this.setvRoutersData = function(data) {
        vRoutersData = data;
    }
    this.getCFDimensions = function() {
        return dimensions;
    }
    this.load = function (obj) {
        populateComputeNodes();
        layoutHandler.setURLHashParams({node:'vRouters'},{merge:false,triggerHashChange:false});
    }
    this.destroy = function () {
        //contView.destroy();
    }

    function populateComputeNodes() {

        infraMonitorView.clearTimers();
        var compNodesTemplate = kendo.template($("#computenodes-template").html());
        $(pageContainer).html(compNodesTemplate({}));

        //Initialize widget header
        $('#vrouter-header').initWidgetHeader({title:'vRouters'});

        //Initialize bubble chart
        var vRouterDeferredObj = $.Deferred();
        infraMonitorView.getvRoutersDashboardData(vRouterDeferredObj,true);
        vRouterDeferredObj.done(function(data) {
            self.setvRoutersData(data);
            computeNodesGrid.dataSource.data(data);
            var chartsData = [{title:'vRouters',d:[{key:'vRouters',values:data}],link:{hashParams:{p:'mon_bgp',q:{node:'vRouters'}}}}];
            $('#vrouter-bubble').initScatterChart(chartsData[0]);
            vRouterCF = crossfilter(data);
            var intfDimension = vRouterCF.dimension(function(d) { return d.intfCnt;});
            var instDimension = vRouterCF.dimension(function(d) { return d.instCnt;});
            var vnDimension = vRouterCF.dimension(function(d) { return d.vnCnt;});
            dimensions.push(intfDimension,instDimension,vnDimension);
            filterDimension = vRouterCF.dimension(function(d) { return d.intfCnt;});
            //Set crossfilter bucket count based on number of max VNs/interfaces/instances on a vRouter
            var vnCnt = 24;
            var intfCnt = 24;
            var instCnt = 24;
            //Max bar value across all 3 cross-filter charts
            var vnMaxValue=0,instMaxValue=0,intfMaxValue=0;
            if(vnDimension.top(1).length > 0) {
                vnCnt = Math.max(vnCnt,d3.max(vnDimension.group().all(),function(d) { return d['key'] }));
                vnMaxValue = d3.max(vnDimension.group().all(),function(d) { return d['value'] });
            }
            if(instDimension.top(1).length > 0) {
                instCnt = Math.max(instCnt,d3.max(instDimension.group().all(),function(d) { return d['key'] })); 
                instMaxValue = d3.max(instDimension.group().all(),function(d) { return d['value'] }); 
            }
            if(intfDimension.top(1).length > 0) {
                intfCnt = Math.max(intfCnt,d3.max(intfDimension.group().all(),function(d) { return d['key'] })); 
                intfMaxValue = d3.max(intfDimension.group().all(),function(d) { return d['value'] }); 
            }
            var maxBarValue = Math.max(vnMaxValue,instMaxValue,intfMaxValue);

            //Initialize CrossFilter Charts
            charts = [
                barChart()
                    .dimension(vnDimension)
                    .group(vnDimension.group(Math.floor))
                    .toolTip(true)
                  .x(d3.scale.linear()
                    .domain([0, vnCnt+(vnCnt/24)])
                    .rangeRound([0, 10 * 26])) //Width
                  .y(d3.scale.linear()
                    .domain([0,maxBarValue])
                    .range([50,0])),

                barChart()
                    .dimension(instDimension)
                    .group(instDimension.group())
                    .toolTip(false)
                  .x(d3.scale.linear()
                    .domain([0, instCnt+(instCnt/24)])
                    .rangeRound([0, 10 * 26]))
                  .y(d3.scale.linear()
                    .domain([0,maxBarValue])
                    .range([50,0])),

                barChart()
                    .dimension(intfDimension)
                    .group(intfDimension.group())
                    .toolTip(false)
                  .x(d3.scale.linear()
                    .domain([0, intfCnt+(intfCnt/24)])
                    .rangeRound([0, 10 * 26]))
                  .y(d3.scale.linear()
                    .domain([0,maxBarValue])
                    .range([50,0]))
                ];
              chart = d3.selectAll(".chart")
                  .data(charts)
                  .each(function(currChart) { currChart.on("brush", function() {
                      logMessage('bgpMonitor',filterDimension.top(10));
                      updateView();
                      renderAll(chart);
                  }).on("brushend", function() { 
                      updateView();
                      renderAll(chart);
                  }); 
              });
              renderAll(chart);
              //Add reset listener
              $('.reset').on('click',function() {
                  var idx = $(this).closest('.chart').index();
                  charts[idx].filter(null);
                  renderAll(chart);
                  updateView();
              });
        });

        function updateView() {
          //Update the grid
          computeNodesGrid.dataSource.data(filterDimension.top(Infinity));
          //Update the bubble chart
          var chartRenderer = $('#vrouter-bubble').data('chart')
          d3.select($('#vrouter-bubble')[0]).select('svg').datum([{key:'vRouters',values:filterDimension.top(Infinity)}]);
          chartRenderer.update();
        }

        //Mark the down nodes name in red color
        function decorateGridCells() {
        }

        $('#divcomputesgrid').contrailKendoGrid({
            pageable: {
                numeric:false,
                previousNext:false,
                messages: {
                    display:'Total : {2}'
                }
            },
            dataSource:{
                transport:{
                    read:{
                        url:'/api/admin/monitor/infrastructure/vrouters/summary?addGen'
                    }
                },
                schema: {
                    parse:function(response) {
                        return infraMonitorView.parsevRoutersDashboardData(response);
                    }
                }
            },
            selectable:'cell',
            autoBind:false,
            columns:[
                {
                    field:"name",
                    title:"Host name",
                    width:150,
                    //template:cellTemplate({cellText:'name', tooltip:true, name:'name'}),
                    template:cellTemplate({cellText:'name', tooltip:true, name:'name',applyColor:true}),
                },
                {
                    field:"ip",
                    title:"IP Address",
                    template:'#= validateNodeIPAddress(data) #',
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
                    width:160
                },
                {
                    field:"cpu",
                    title:"CPU (%)",
                    width:130,
                    template:'<div class="gridSparkline display-inline"></div><span class="display-inline">#= cpu #</span>'
                },
                {
                    field:"memory",
                    title:"Memory",
                    width:150
                },
                {
                    field:"vnCnt",
                    title:"Networks"
                },
                {
                    field:"instCnt",
                    title:"Instances"
                },
                {
                    field:"intfCnt",
                    title:"Interfaces",
                    template:'#= kendo.format("{0} Up, {1}",intfCnt,errorIntfCntText)#'
                },/*{
                 field:"traffic",
                 title:"Traffic (In/Out)",
                 template:'#= trafficIn# / #= trafficOut#'
                 }*/
            ],
            change:onComputeNodeChange,
            dataBound:function(data) {
                addExtraStylingToGrid();
                decorateGridCells();
            },
            searchToolbar: true,
            widgetGridTitle: 'Virtual Routers',
            searchPlaceholder: 'Search Virtual Routers'
        });
        showGridLoading('#divcomputesgrid');
        computeNodesGrid = $('#divcomputesgrid').data('kendoGrid');
        applyGridDefHandlers(computeNodesGrid, {noMsg:'No vRouters to display',
            selector:$('#vrouter-header h4'),
            //totalCntFn: function() { return infraMonitorView.getDashboardData()['vRoutersData'].length;}});
            totalCntFn: function() { 
                return self.getvRoutersData().length;
            }});

        function onComputeNodeChange() {
            var name;
            if (name = isCellSelectable(this.select())) {
                var selRowDataItem = computeNodesGrid.dataSource.view()[this.select().closest('tr').index()];
                var tree = $("#treeInfraNode").data("kendoTreeView");
                if (tree) {
                    selTreeNode({tree:tree, fqName:'vRouters:' + selRowDataItem['name'],trigger:false});
                }
                cmpNodeView.load({name:selRowDataItem['name'], ip:selRowDataItem['ip'], uuid:selRowDataItem['uuid']});
                //layoutHandler.setURLHashParams({node:'vRouters:' + selRowDataItem['name']},{merge:false});
            }
        }
    }
}

computeNodeView = function () {
    var intfGrid, vnGrid, aclGrid, flowGrid, computeNodeTabStrip, computeNodeInfo,computeNodeData;
    var self = this;
    var aclViewModel = kendo.observable({
    	aclList:[],
        limit:50
    });
    this.load = function (obj) {
        pushBreadcrumb([obj['name']]);
    	computeNodeInfo = obj;
		if((computeNodeInfo == null || computeNodeInfo.ip ==  null ||  computeNodeInfo.ip == '') && computeNodeInfo.tab != null){
			//issue details call and populate ip
			var computeNodeDeferredObj = $.Deferred();
			self.getComputeNodeDetails(computeNodeDeferredObj,computeNodeInfo);
            computeNodeDeferredObj.done(function(data) {
            	computeNodeInfo['ip'] = data.VrouterAgent.self_ip_list[0];
            	if (computeNodeInfo)
    	            selTreeNode({tree:infraNodesTree, fqName:computeNodeInfo['name'], expand:true, trigger:false});
    	        self.populateComputeNode(computeNodeInfo);
            });
		} else {
			if (computeNodeInfo['name'] != null)
	            selTreeNode({tree:infraNodesTree, fqName:computeNodeInfo['name'], expand:true, trigger:false});
	        self.populateComputeNode(computeNodeInfo);
		}
    }

    this.destroy = function () {
        //contView.destroy();
    }
    
    this.getComputeNodeDetails = function(deferredObj,obj) {
        $.ajax({
            url:'/api/admin/monitor/infrastructure/vrouter/details?hostname=' + obj['name']
        }).done(function(result) {
            deferredObj.resolve(result);
        });
    }

    function populateInterfaceTab(obj) {
        layoutHandler.setURLHashParams({tab:'interfaces', ip:computeNodeInfo['ip'],node:kendo.format('vRouters:{0}', obj['name'])},{triggerHashChange:false});
        if (!isInitialized('#gridComputeInterfaces')) {
            $('#gridComputeInterfaces').contrailKendoGrid({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/vrouter/interface?ip=' + getIPOrHostName(computeNodeInfo)
                            }
                        }
                    },
                    schema:{
                        parse:function (response) {
                        	var retArray = [];
                        	var sdata = jsonPath(response,'$..ItfSandeshData')[0];
                        	if(sdata != null){
	                        	if(!(sdata instanceof Array)){
	                        		sdata = [sdata];
	                        	}
	                        	$.each(sdata, function (idx, obj) {
	                        		obj['vn_name'] = ifNullOrEmptyObject(obj['vn_name'],noDataStr);
	                        		obj['vm_uuid'] = ifNullOrEmptyObject(obj['vm_uuid'],noDataStr);
	                        		if(obj['type'] == "vport"){
	                        			if(obj.fip_list != null) {
	                        				var fipList = [];
	                        				try{
	                        					fipList = jsonPath(obj,"$..FloatingIpSandeshList")[0];
	                        				}catch(e){}
	                        				obj['disp_fip_list'] = floatingIPCellTemplate(fipList);
	                        			}
	                        			retArray.push(obj);
	                        		}
	                            });
                        	}
                            return retArray;
                        }
                    }
                },
                columns:[
                    {
                        field:"name",
                        title:"Name",
                        width:125
                    },
                    {
                        field:"label",
                        title:"Label",
                        width:70
                    },
                    {
                        field:"status",
                        title:"Status",
                        width:95,
                        template:cellTemplate({cellText:'#= (active == "Active")? "Up": "Down"#', tooltip:false}),
                    },
                    {
                        field:"vn_name",
                        title:"Network",
                        template:cellTemplate({cellText:'#= vn_name #', name:'network', tooltip:true}),
                        width:220
                    },
                    {
                        field:"ip_addr",
                        title:"IP Address",
                        width:150
                    },
                    {
                        field:"disp_fip_list",
                        title:"Floating IP",
                        //Need to check the scope of template javascript functions
                        template:cellTemplate({cellText:'#= disp_fip_list#', tooltip:true})
                    },
                    {
                        field:"vm_uuid",
                        title:"Instance",
                        template:cellTemplate({cellText:'#= vm_uuid#', name:'network', tooltip:true}),
                    }/*TODO uncomment to add actions column,
                     {
                     field:"action",
                     title:"Action"
                     }
                     */
                ],
                detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                detailInit:initGridDetail,
                selectable:"cell",
                change:onIntfChange,
                searchToolbar: true,
                widgetGridTitle: 'Interfaces',
                searchPlaceholder: 'Search Interfaces'
            })
            showGridLoading('#gridComputeInterfaces');
            intfGrid = $('#gridComputeInterfaces').data('kendoGrid');
            applyGridDefHandlers(intfGrid, {noMsg:'No interfaces to display'});
        } else {
            reloadKendoGrid(intfGrid);
        }
        function onIntfChange() {
            var name;
            if (name = isCellSelectable(this.select())) {
                if (name == 'network') {
                    var tabIdx = 3;
                    computeNodeTabStrip.select(tabIdx);
                    computeNodeTabStrip.trigger('select', {item:computeNodeTabStrip.element.find('.k-item.k-state-active')[tabIdx]});
                }
            }
        }
    }
    function populateVNTab(obj) {

        if (obj == null)
            obj = computeNodeInfo;
        layoutHandler.setURLHashParams({tab:'networks',ip:computeNodeInfo['ip'], node:kendo.format('vRouters:{0}', obj['name'])},{triggerHashChange:false});
        if (!isInitialized('#gridComputeVN')) {
             $('#gridComputeVN').contrailKendoGrid({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/vrouter/vn?ip=' + getIPOrHostName(computeNodeInfo)
                            }
                        }
                    },
                    schema:{
                        parse:function (response) {
                        	var data = jsonPath(response,'$..VnSandeshData')[0];
                        	if(data != null){
                        		if(!(data instanceof Array)){
                            		data = [data];
                            	}
                        		data = $.each(data, function (idx, obj) {
                        			//obj['raw_json'] = obj;
                                    if($.isEmptyObject(obj['acl_uuid'])){
                                    	obj['acl_uuid'] = "--";
                                    }
                                    if($.isEmptyObject(obj['vrf_name'])){
                                    	obj['vrf_name'] = "--";
                                    }
                                });
                        		return data;
                        	}
                        	else {
                        		return [];
                        	}
                        }
                    }
                },
                columns:[
                    {
                        field:"name",
                        title:"Name"
                    },
                    {
                        field:"acl_uuid",
                        title:"ACLs",
                        template:cellTemplate({cellText:'acl_uuid', name:'acl'})
                    },
                    {
                        field:"vrf_name",
                        title:"VRF",
                        template:cellTemplate({cellText:'vrf_name', name:'vrf'})
                    },
                    {
                    	field:"",
                        menu: false,
                        attributes: {
                            "class": "table-cell"
                        },
                        width: 30,
                        template:'<div class="inline position-relative">' +
                            '    <div class="dropdown-toggle" data-toggle="dropdown">' +
                            '        <i class="icon-cog icon-only bigger-110"></i>' +
                            '    </div>' +
                            '    <ul class="dropdown-menu dropdown-icon-only dropdown-light pull-right dropdown-caret dropdown-close width-150">' +
                            '        <li>' +
                            '            <a href="/tenants/monitor/network\\#p=config_net_vn&q=">' +
                            '                <i class="icon-cog" ></i> &nbsp; Configure' +
                            '            </a>' +
                            '        </li>' +
                            '        <li>' +
                            '            <a href="/tenants/monitor/network\\#p=mon_net_dashboard&q[fqName]=default-domain">' +
                            '                <i class="icon-tasks"></i> &nbsp; Monitor' +
                            '           </a>' +
                            '        </li>' +
                            '        <li>' +
                            '            <a onclick="showObjLog(\'#=name#\',\'vn\');">' +
                            '                <i class="icon-list-alt"></i> &nbsp; View Object Logs' +
                            '            </a>' +
                            '        </li>' +
                            '    </ul>' +
                            '</div>'
                    }
                ],
                detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                detailInit:initGridDetail,
                scrollable: false,
                selectable:"cell",
                change:onVNChange,
                searchToolbar: true,
                widgetGridTitle: 'Networks',
                searchPlaceholder: 'Search Networks'
            });
            showGridLoading('#gridComputeVN');
            vnGrid = $('#gridComputeVN').data('kendoGrid');
            applyGridDefHandlers(vnGrid, {noMsg:'No Networks to display'});
        } else {
            reloadKendoGrid(vnGrid);
        }
        function onVNChange() {
            var name;
            if (name = isCellSelectable(this.select())) {
                if (name == 'acl') {
                	var tabIdx = 4;
                    computeNodeTabStrip.select(tabIdx);
                	/* TODO add this to do context switching var dataItem = this.dataItem(this.select()[0].parentNode);
                    var filters = dataItem.vrf;
                	layoutHandler.setURLHashParams({tab:'acl', ip:computeNodeInfo['ip'],node:kendo.format('vRouters:{0}', obj['name']), filters:filters});
                	*/
                } else if (name == 'vrf') {
                    //var obj = computeNodeInfo;
                    //ctrlNodeView.load({ip:obj['ip'], name:'Control Nodes:' + obj['name'], tab:'routes'});
                	//commenting out so that the filter happens for routes
                    //var tabIdx = 6;
                    //computeNodeTabStrip.select(tabIdx);
                	var dataItem = this.dataItem(this.select()[0].parentNode);
                    var filters = dataItem.vrf;
                	layoutHandler.setURLHashParams({tab:'routes', ip:computeNodeInfo['ip'],node:kendo.format('vRouters:{0}', obj['name']), filters:filters});
                }
            }
        }
        
    }
    
    function populateDetailsTab(obj) {
        var endTime = new Date().getTime(), startTime = endTime - 600000;
        var slConfig = {startTime: startTime, endTime: endTime};
        var nodeIp;
        layoutHandler.setURLHashParams({tab:'', node:kendo.format('vRouters:{0}', obj['name']),ip:obj['ip']},{triggerHashChange:false});
        //showProgressMask('#computenode-dashboard', true);
        startWidgetLoading('vrouter-sparklines');
        toggleWidgetsVisibility(['vrouter-chart-box'], ['system-chart-box']);
        $.ajax({
            //url: '/api/admin/monitor/infrastructure/vrouter/detail?uuid=' + computeNodeInfo['uuid'] + '&' + 'ip=' + getIPOrHostName(computeNodeInfo),
            url:'/api/admin/monitor/infrastructure/vrouter/details?hostname=' + obj['name']
        }).done(function (result) {
                    computeNodeData = result;
                    var noDataStr = '--',
                    cpu = "N/A",
                    memory = "N/A",
                    dashboardTemplate = kendo.template($('#dashboard-template').html()),
                    computeNodeDashboardInfo, oneMinCPU, fiveMinCPU, fifteenMinCPU,
                    usedMemory, totalMemory;
                // var chartWidths3 = $('#vrouter-detail-charts').width();
                //var cwd1 = (parseInt(chartWidths3));
                //var cwd = cwd1/3;
                var parentWidth = parseInt($('#computenode-dashboard').width());
                var chartWdth = parentWidth/2;
                $('#vrouter-sparklines').initMemCPUSparkLines(result, 'parseMemCPUData4SparkLines', {'VrouterStatsAgent':[{name: 'cpu_share', color: 'blue-sparkline'}, {name: 'virt_mem', color: 'green-sparkline'}]}, slConfig);
                $('#system-sparklines').initMemCPUSparkLines(result, 'parseMemCPUData4SparkLines', {'VrouterStatsAgent':[{name: 'one_min_avg_cpuload', color: 'blue-sparkline'}, {name: 'used_sys_mem', color: 'green-sparkline'}]}, slConfig);
                endWidgetLoading('vrouter-sparklines');
                /*  $('#bandwidth-chart').initLineChart($.extend({url:function() {
                 return '/api/tenant/networking/flow-series/cpu?moduleId=vRouterAgent&minsSince=30&sampleCnt=1000&source=' + computeNodeInfo['name'];
                 }},getCPUMemoryChartConfig('vRouter'),{memTitle:'vnswad Memory',cpuTitle:'vnswad CPU Utilization'}),250,375,"Bandwidth");
                 TODO uncomment to include bandwidth chart when data is available from back end.*/
               
                computeNodeDashboardInfo = [
                    {lbl:'Hostname', value:obj['name']},
                    {lbl:'IP Address', value:(function(){
                        var ip = noDataStr;
                    	var configip = noDataStr;
                        try{
                        	ip = jsonPath(computeNodeData,'$..VrouterAgent.control_ip')[0];
                        	configip = ifNull(jsonPath(computeNodeData,'$..ConfigData..virtual_router_ip_address')[0],'-');
                        	if(ip != configip){
                        		ip = "<span class='text-error' title='Config IP mismatch'>"+ ip +"</span>"
                        	}
                        } catch(e){}
                        nodeIp = ip;
                        return ip;
                    })()},
                    {lbl:'Status', value:(function(){
                    	return getNodeUpTime(computeNodeData);
                    })()},
                    {lbl:'Analytics Node', value:(function(){
                    	var anlNode = noDataStr; 
                    	var secondaryAnlNode, status;
                    	try{
                    		//anlNode = ifNull(computeNodeData.VrouterAgent.collector,noDataStr);
                    		anlNode = jsonPath(computeNodeData,"$..ModuleClientState..primary")[0].split(':')[0];
                    		status = jsonPath(computeNodeData,"$..ModuleClientState..status")[0];
                    		secondaryAnlNode = jsonPath(computeNodeData,"$..ModuleClientState..secondary")[0].split(':')[0];
                    	}catch(e){
                    		anlNode = "--";
                    	}
                    	try{
                    		if(anlNode != null && anlNode != noDataStr && status.toLowerCase() == "established")
                    			anlNode = anlNode.concat(' (Up)');
                    	}catch(e){
                    		if(anlNode != null && anlNode != noDataStr) {
                    			anlNode = anlNode.concat(' (Down)');
                    		}
                    	}
                    	if(secondaryAnlNode != null && secondaryAnlNode != "" && secondaryAnlNode != "0.0.0.0"){
                    		anlNode.concat(', ' + secondaryAnlNode);
                    	}
                    	return ifNull(anlNode,noDataStr);
                    })()},
                    {lbl:'Control Nodes', value:(function(){
                        var peerList ;
                        try{
                        	peerList = computeNodeData.VrouterAgent.xmpp_peer_list;
                        }catch(e){}
                        var nodeArr="" ;
                        if(peerList != null && peerList.length>0){
                            nodeArr = '<div class="table-cell dashboard-item-value">';
                            var nodes = '';

                            for (var i=0; i< peerList.length;i++){
                                var node = '';
                                node = '<span onclick="showObjLog(\'default-domain%3Adefault-project%3Aip-fabric%3A__default__%3A'+peerList[i].ip+'\',\'vRouter\');" onmouseover="" style="cursor: pointer;">'+ peerList[i].ip +'</span>' ;

                                if(peerList[i].primary != null && peerList[i].primary == true){
                                    if(peerList[i].status == true){
                                    	if((i+1) == peerList.length){//only primary present
                                    		node =  node + "* (Up) " ;
                                    	} else {
                                    		node = node + "* (Up), " ;
                                    	}
                                    } else {
                                        node = "<span class='text-error'>" + node + "* (Down)</span>, " ;
                                    }
                                    if(nodes == ''){
                                        nodes = node;
                                    } else {
                                        nodes = node + nodes
                                    }
                                } else {
                                    if(peerList[i].status == true)
                                        node = node + " (Up)" ;
                                    else
                                        node = "<span class='text-error'>" + node + " (Down)</span>" ;
                                    if(node != ''){
                                        nodes = nodes + node
                                    } else {
                                        nodes = node;
                                    }
                                }
                            }
                            nodeArr = nodeArr + nodes + '</div>'
                        }
                        return nodeArr;
                    })(),clk:'url'},

                    //Best way to get the primary node - jsonPath(computeNodeData,'$.VrouterAgent.xmpp_peer_list[?(@.primary==true)].ip')},
                    {lbl:'Analytics Messages', value:(function(){
                    	var msgStats ;
                    	try{
                    		msgStats = computeNodeData["ModuleServerState"]["msg_stats"][0]["msgtype_stats"];
                    	} catch(e){}
                        var msgsCount = 0;
                        var msgsBytes = 0;
                        var msgString = '';
                        if(msgStats != null ){
	                        for (var i = 0; i < msgStats.length; i++) { 
	                        	msgsCount += parseInt(msgStats[i]["messages"]);
	                        	msgsBytes += parseInt(msgStats[i]["bytes"]);
	                        }
                        }
                        return msgsCount + ' [' + formatBytes(msgsBytes) + ']';
                    })()},
                    {lbl:'XMPP Messages', value:ifNull(computeNodeData.VrouterStatsAgent.xmpp_stats_list[0].in_msgs, noDataStr) + ' In, ' + 
                        ifNull(computeNodeData.VrouterStatsAgent.xmpp_stats_list[0].out_msgs, noDataStr) + ' Out'},
                    {lbl:'Flow', value:ifNull(computeNodeData.VrouterStatsAgent.active_flows, noDataStr) + ' Active, ' + 
                        ifNull(computeNodeData.VrouterStatsAgent.total_flows, noDataStr) + ' Total'},
                    {lbl:'Networks', value:(function(){
                        if(computeNodeData.VrouterAgent.connected_networks != null)return computeNodeData.VrouterAgent.connected_networks.length;else return '0'})()},
                    {lbl:'Interfaces', value:(function(){
                    	var downInts = ifNull(jsonPath(computeNodeData,'$..error_intf_list')[0],[]).length;
                    	var totInts = ifNull(jsonPath(computeNodeData,'$..interface_list')[0],[]).length;
                    	var ret;
                        if(downInts > 0){
                        	downInts = "<span class='text-error'>" + downInts + " (Down)</span>";
                        } else {
                        	downInts = downInts + " (Down)";
                        } 
                        return totInts + " (Up), " + downInts;
                    })()},
                    {lbl:'Instances', value:(function(){
                        if(computeNodeData.VrouterAgent.virtual_machine_list != null)return computeNodeData.VrouterAgent.virtual_machine_list.length;else return '0'})()},
                    {lbl:'Last Log', value: (function(){
                    	var lmsg;
                		try {
                			lmsg = computeNodeData.ModuleServerState.msg_stats[0].log_level_stats[0].last_msg_timestamp;
                		} catch(err){}
                		if(lmsg != null){
	                        var d = new Date(parseInt(lmsg)/1000);
	                        return d.toLocaleString()	;
                        }})()},
                ]
                var cores=getCores(computeNodeData);
                for(var i=0;i<cores.length;i++)
                	computeNodeDashboardInfo.push(cores[i]);
                //showProgressMask('#computenode-dashboard');
                $('#computenode-dashboard').html(dashboardTemplate({title:'vRouter',colCount:2, d:computeNodeDashboardInfo, nodeData:computeNodeData, showSettings:true, ip:nodeIp}));
                $('#linkIntrospect').click(function(){
            		window.open('http://'+obj['ip']+':8085/', '_blank');
            	});
                $('#linkStatus').on('click', function(){
                	showStatus(nodeIp);
                });
                initWidget4Id('#dashboard-box');
                initWidget4Id('#vrouter-chart-box');
                initWidget4Id('#system-chart-box');
            }).fail(displayAjaxError.bind(null, $('#computenode-dashboard')));
        $('#vrouter-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=vRouterAgent&minsSince=30&sampleCnt=10&source=' + computeNodeInfo['name'];
        }, parser: "parseProcessMemCPUData", plotOnLoad: true, showWidgetIds: ['vrouter-chart-box'], hideWidgetIds: ['system-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}), 110);
        $('#system-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=vRouterAgent&minsSince=30&sampleCnt=10&source=' + computeNodeInfo['name'];
        }, parser: "parseSystemMemCPUData", plotOnLoad: false, showWidgetIds: ['system-chart-box'], hideWidgetIds: ['vrouter-chart-box'], titles: {memTitle:'Memory (in MB)',cpuTitle:'Avg CPU Load'}}),110);
    };

    function populateACLTab(obj) {
        layoutHandler.setURLHashParams({tab:'acl', ip:computeNodeInfo['ip'],node:kendo.format('vRouters:{0}', obj['name'])},{triggerHashChange:false});
       //TODO add this for context switching when the bug is fixed var comboAcl = $("#aclComboBox").kendoComboBox({change:onAclSelect});
        var selectedAcl = 'All';
    	if(obj['filters'] != null){
    		selectedAcl = obj['filters'];
    	}
    	
        if (!isInitialized($('#gridComputeACL'))) {
            $('#gridComputeACL').contrailKendoGrid({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/vrouter/acl?ip=' + getIPOrHostName(computeNodeInfo)
                            }
                        }
                    },
                    schema:{
                        parse:function (response) {
                            var retArr = [];
                            response = jsonPath(response,"$..AclSandeshData")[0];
                            //Loop through ACLs
                            if(response != null){
	                            if(!(response instanceof Array)) {
	                            	response = [response];
	                            } 
	                            for (var i = 0; i < response.length; i++) {
	                                var currACL = [];
	                                try{
	                                	currACL = jsonPath(response[i],"$..AclEntrySandeshData")[0];
	                                } catch (e) {
	                                }
	                                //Loop through ACEs
	                                if(!(currACL instanceof Array)) {
	                                	currACL = [currACL];
	                                } 
	                                for (var j = 0; j < currACL.length; j++) {
	                                    var currACE = currACL[j];
	                                        var dispuuid = uuid = response[i]['uuid'];
	                                        var flowCnt = response[i]['flow_count'];
	                                        if(flowCnt == null){
	                                        	flowCnt = 0;
	                                        }
	                                        if(j > 0) {
	                                        	dispuuid = '';
	                                            flowCnt = '';
	                                        }
	                                        var protoRange = srcPortRange = dstPortRange = actionVal = noDataStr;
	                                        try{
	                                        	protoRange = jsonPath(currACE,"$..proto_l..min")[0] + " - " + jsonPath(currACE,"$..proto_l..max")[0];
	                                        } catch(e){}
	                                        try{
	                                        	srcPortRange = jsonPath(currACE,"$..src_port_l..min")[0] + " - " + jsonPath(currACE,"$..src_port_l..max")[0];
	                                        }catch(e){}
	                                        try{
	                                        	dstPortRange = jsonPath(currACE,"$..dst_port_l..min")[0] + " - " + jsonPath(currACE,"$..dst_port_l..max")[0];
	                                        }catch(e){}
	                                        try{
	                                        	actionVal = jsonPath(currACE,"$..action_l..action")[0];
	                                        }catch(e){}
	                                        retArr.push({uuid:uuid,
	                                        	dispuuid:dispuuid,
	                                            dst_vn:currACE['dst'],
	                                            src_vn:currACE['src'], 
	                                            flow_count:flowCnt,
	                                            aceId:currACE['ace_id'], 
	                                            proto:protoRange,
	                                            src_port:srcPortRange, 
	                                            dst_port:dstPortRange,
	                                            ace_action:actionVal,
	                                            raw_json:response[i]});
	                                }
	                            }
	                            var acls = jsonPath(response,'$..uuid');
	                            aclViewModel.set('aclList', ['All'].concat(acls)); 
	                            //aclViewModel.set('aclList', acls);
	                           /* TODO for context switching if(selectedAcl != null){
	                            	comboAcl.select(function(dataItem) {
		                        	    return dataItem.text === selectedAcl;
		                        	});
	                            } else {
	                            	onAclSelect();
	                            } */
                        	}
                            return retArr;
                        }
                    }
                },
                columns:[
                    {
                        field:"dispuuid",
                        title:"UUID",
                        width:110,
                        template:cellTemplate({cellText:'dispuuid', tooltip:true})
                    },
                    {
                        field:"flow_count",
                        title:"Flows",
                        template:cellTemplate({cellText:'flow_count', name:'flows'}),
                        width:65
                    },
                    {
                        field:"ace_action",
                        title:"Action",
                        width:60
                    },
                    //{field:"type",  title:"Type"},
                    {
                        field:"proto",
                        title:"Protocol",
                        width:76,
                        template:'#= formatProtcolRange(proto) #'
                    },
                    {
                        field:"src_vn",
                        title:"Source Network or Prefix",
                        width:175,
                        template:cellTemplate({cellText:'src_vn', tooltip:true, name:'src_vn'})
                    },
                    //{field:"src_ip",     title:"Source IP",width:95},
                    {
                        field:"src_port",
                        title:"Source Port",
                        width:95,
                        template:'#= formatPortRange(src_port) #'
                    },
                    {
                        field:"dst_vn",
                        title:"Destination Network or Prefix",
                        template:cellTemplate({cellText:'dst_vn', tooltip:true, name:'dst_vn'}),
                        width:200
                    },
                    //{field:"dst_ip",       title:"Destination IP",width:110},
                    {
                        field:"dst_port",
                        title:"Destination Port",
                        template:'#= formatPortRange(dst_port) #',
                        width:120
                    },
                    /*{
                        field:"proto_range",
                        title:"Source Policy Rule",
                        width:125
                    },*/
                    {
                        field:"aceId",
                        title:"ACE Id",
                        width:60
                    }
                ],
                detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                detailInit:initGridDetail,
                selectable:"cell",
                sortable:false,
                change:onACLChange,
                searchToolbar: true,
                widgetGridTitle: 'ACL',
                searchPlaceholder: 'Search ACL'
            })
            showGridLoading('#gridComputeACL');
            aclGrid = $('#gridComputeACL').data('kendoGrid');
            applyGridDefHandlers(aclGrid, {noMsg:'No ACL to display'});
        } else {
            reloadKendoGrid(aclGrid);
        }
        function onACLChange() {
            var name;
            if (name = isCellSelectable(this.select())) {
                if ($.inArray(name, ['src_vn', 'dst_vn']) > -1)
                    selectKendoTab(computeNodeTabStrip, 3);
                if (name == 'flows') {
                    var dataItem = this.dataItem(this.select()[0].parentNode);
                    var filters = dataItem.uuid;
                    $('#compute_tabstrip').data(filters, uuid);
                    selectKendoTab(computeNodeTabStrip, 5,filters);
                    //TODO removing the filtering because of some issues layoutHandler.setURLHashParams({tab:'flows', ip:computeNodeInfo['ip'],node:kendo.format('vRouters:{0}', obj['name']), filters:filters});
                }
            }
        }
        function onAclSelect(){
        	var datasource = $("#gridComputeACL").data("kendoGrid").dataSource;
            var filters = datasource.filter();
            var selectedAcl = $('#aclComboBox').data("kendoComboBox").value();
            if(selectedAcl == "All")
            	filters = [];
            else 
            	filters = { field: "uuid", operator: "eq", value: selectedAcl };
            datasource.filter(filters);
        }
    }

    function populateFlowsTab(obj,filters) {
    	var isAclPrevFirstTimeClicked = true;
    	var isAllPrevFirstTimeClicked = true;
    	var selectedAcl = 'All';
    	flowKeyStack = [];
    	aclIterKeyStack = [];
    	/*TODO this filtering is causing issues like unable to move next and previous so commenting for now.
    	 * if(obj['filters'] != null){
    		selectedAcl = obj['filters'];
    	}*/
    	$('#btnNextFlows').unbind("click").click(onNextClick);
    	$('#btnPrevFlows').unbind("click").click(onPrevClick);
        layoutHandler.setURLHashParams({tab:'flows', ip:computeNodeInfo['ip'],node:kendo.format('vRouters:{0}', obj['name'])},{triggerHashChange:false});
        $('#aclDropDown').kendoComboBox({
            dataSource:{
                transport:{
                    read:{
                        url: '/api/admin/monitor/infrastructure/vrouter/acl?ip=' + getIPOrHostName(computeNodeInfo)
                    }
                },
                schema:{
                    parse:function (response) {
                        var retArr = [{text:'All',value:'All'}];
                        response = jsonPath(response,'$..AclSandeshData')[0];
                        var uuidArr = [];
                        if(response != null){
                        	if(!(response instanceof Array)){
                        		response = [response];
                        	}
	                        for (var i = 0; i < response.length; i++) {
	                        	uuidArr.push(response[i].uuid);
	                        }
                        }
                       // $.map(uuidArr, function (value) {
                            $.each(uuidArr, function (key, value) {
                                retArr.push({text:value, value:value});
                            });
                       // });
                        return retArr;
                    }
                }
            },
            dataTextField:'text',
            dataValueField:'value',
            value:selectedAcl,
            width:350,
            change: onSelectAcl
        });
        
        if (!isInitialized('#gridComputeFlows')) {
            $('#gridComputeFlows').contrailKendoGrid({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                            	var aclFilter = '';
                            	if(selectedAcl != 'All'){
                            		aclFilter = '&aclUUID=' + selectedAcl;
                            	}
                                return '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo) + aclFilter;
                            },
                            timeout:300000
                        }
                    },
                    schema:{
                        parse:function (response) {
                        	var origResponse = response;
                        	var isFromACLFlows = false;
                        	response = jsonPath(origResponse,"$..SandeshFlowData")[0];
                        	if (response == null){
                        		isFromACLFlows = true;
                        		response = jsonPath(origResponse,"$..FlowSandeshData")[0];
                        	}
                        	var flowKey = jsonPath(origResponse,"$..flow_key")[0];
                        	var iterationKey = jsonPath(origResponse,"$..iteration_key")[0];
                           // var retArr = [];
                           /* for (var i = 0; i < response.length; i++) {
                                var currACL = response[i];
                                for (var j = 0; j < currACL['flowData'].length; j++) {
                                    var currFlow = currACL['flowData'][j];
                                    var aclUuid = currACL['acl_uuid'];
                                    retArr.push($.extend(currFlow, {acl_uuid:aclUuid}));
                                }
                            }*/
                        	if( response != null ){
                        		if(!(response instanceof Array)){
                        			response = [response];
                        		}
                        		if(isFromACLFlows) {
                        			response = $.each(response,function(idx,obj) {
                        				obj['src_vn'] = obj['source_vn'];
                        				obj['dst_vn'] = obj['dest_vn'];
                        				obj['sip'] = obj['src'];
                        				obj['dip'] = obj['dst'];
                        				obj['stats_bytes'] = obj['bytes'];
                        				obj['stats_packets'] = obj['packets'];
                                    });
                        		}
                        	}
                            //Push the flowKey to the stack for Next use
                            if(flowKey != null && !$.isEmptyObject(flowKey)){
                            	//Had to add this hack because sometimes we get into to this parse function twice leading this to be added twice to the stack
                            	if(flowKey != "0:0:0:0:0.0.0.0:0.0.0.0" && flowKeyStack[flowKeyStack.length - 1] != flowKey) 
                            		flowKeyStack.push(flowKey);
                            }
                            //Push the aclIterKey to the stack for Next use
                            if(iterationKey != null && !$.isEmptyObject(iterationKey)){
                            	//Had to add this hack because sometimes we get into to this parse function twice leading this to be added twice to the stack
                            	if(iterationKey.indexOf('0:0:0:0:0.0.0.0:0.0.0.0') == -1 && aclIterKeyStack[aclIterKeyStack.length - 1] != iterationKey)
                            		aclIterKeyStack.push(iterationKey);
                            }
                            //$('#flowCnt').text(response.flowData.length);
                            var ret = [];
                            if(response != null)
                            	ret = response; 
                            return ret;
                        }
                    },
                    filter:{field: "acl_uuid", operator: "startswith", value: filters}
                },
                //filterable:true,
                columns:[
                    {
                     field:"acl_uuid",
                     title:"ACL / SG UUID",
                     template:cellTemplate({cellText:'#= this.getAclSgUuuidString(data) #', tooltipText:'#=getAclSgUuuidString(data)#'}),
                     width:250
                     },
                    {
                        field:"protocol",
                        title:"Protocol",
                        width:110,
                        template:'#= formatProtocol(protocol) #'
                    },
                    {
                        field:"src_vn",
                        title:"Src Network",
                        //template: cellTemplate({cellText:'source_vn',tooltip:true,name:'src_vn'}),
                        template:cellTemplate({cellText:'#= src_vn #', tooltipText:'#=src_vn#', name:'src_vn'}),
                        width:150
                    },
                    {
                        field:"sip",
                        title:"Src IP",
                        width:110
                    },
                    {
                        field:"src_port",
                        title:"Src Port",
                        width:70
                    },
                    {
                        field:"dst_vn",
                        title:"Dest Network",
                        //template: cellTemplate({cellText:'dest_vn',tooltip:true,name:'dst_vn'}),
                        template:cellTemplate({cellText:'#= dst_vn #', tooltipText:'#=dst_vn#', name:'dst_vn'}),
                        width:150
                    },
                    {
                        field:"dip",
                        title:"Dest IP",
                        width:110
                    },
                    {
                        field:"dst_port",
                        title:"Dest Port",
                        width:70
                    },
                    {
                        field:"respcode",
                        title:"Bytes/Pkts",
                        width:135,
                        template:cellTemplate({cellText:'#= stats_bytes#' + '/' + '#=stats_packets#', tooltip:true})
                    },
                    {
                        field:"setup_time_utc",
                        title:"Setup Time",
                        template:"#= new XDate(setup_time_utc/1000).toLocaleString()#",
                        width:210
                    }/*,{
                     field:"teardown_time",
                     title:"Teardown Time",
                     width:210
                     }*/
                ],
                detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                detailInit:initGridDetail,
                change:onFlowChange,
                pageable: false,
                searchToolbar: true,
                selectable:'cell',
                widgetGridTitle: 'Flow Results',
                searchPlaceholder: 'Search Flow Results'
                
            });
            flowGrid = $('#gridComputeFlows').data('kendoGrid');
            
            applyGridDefHandlers(flowGrid, {noMsg:'No Active Flows'});
            if(filters == null || filters == "" || filters == undefined){
                flowGrid.dataSource.filter({});
            }
        } else {
            if(filters != null) {
                flowGrid.filter({field: "acl_uuid", operator: "startswith", value: filters});
            }
            reloadKendoGrid(flowGrid);
        }
        this.getAclSgUuuidString = function(data){
        	var aclUuid = ifNull(jsonPath(data,"$..policy..FlowAclUuid..uuid")[0],noDataStr);
        	var sgUuid = ifNull(jsonPath(data,"$..sg..FlowAclUuid..uuid")[0],noDataStr);
        	if(aclUuid != null)
        	var ret = aclUuid;
        	if(sgUuid != null && sgUuid != noDataStr){
        		ret = ret + ' / </br>' + sgUuid;
        	}
        	return ret;
        }
        function onSelectAcl() {
        	var acluuid = $('#aclDropDown').data("kendoComboBox").value();
        	var flowGrid = $('#gridComputeFlows').data('kendoGrid');
        	flowKeyStack = [];
        	aclIterKeyStack = [];
        	if (acluuid != 'All') {
        		flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo) 
															+ '&aclUUID=' + acluuid;
        		reloadKendoGrid(flowGrid);
        		flowGrid.hideColumn(0);
        	} else {
        		flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo);
        		reloadKendoGrid(flowGrid);
        		flowGrid.showColumn(0);
        	}
        }
        function onNextClick(){
        	var flowGrid = $('#gridComputeFlows').data('kendoGrid');
        	var acluuid = $('#aclDropDown').data("kendoComboBox").value();
        	isAllPrevFirstTimeClicked = true;
        	isAclPrevFirstTimeClicked = true;
        	if(acluuid == 'All' && flowKeyStack.length > 0 && flowKeyStack[flowKeyStack.length - 1] != null){
	        	flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo) 
	        											+ '&flowKey=' + flowKeyStack[flowKeyStack.length - 1];
        	}
        	else if (acluuid != 'All' && aclIterKeyStack.length > 0 && aclIterKeyStack[aclIterKeyStack.length -1] != null){
	        	flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo) 
	        											+ '&iterKey=' + aclIterKeyStack[aclIterKeyStack.length -1];
        	} else if (acluuid == "All"){
        		flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo);
        	}
        	reloadKendoGrid(flowGrid);
        }
        function onPrevClick(){
        	var flowGrid = $('#gridComputeFlows').data('kendoGrid');
        	var acluuid = $('#aclDropDown').data("kendoComboBox").value();
        	if(isAllPrevFirstTimeClicked) {
        		//we need to do this because when we click the prev for the first time the stack would contain the next uuid as well. 
        		//We need to pop out the uuids 3 times to get the prev uuid.
        		flowKeyStack.pop();
        		isAllPrevFirstTimeClicked = false;
        	}
        	flowKeyStack.pop();//need to pop twice to get the prev last flowkey
        	if(isAclPrevFirstTimeClicked) {
        		aclIterKeyStack.pop();
        		isAclPrevFirstTimeClicked = false;
        	}
        	aclIterKeyStack.pop();
        	if(acluuid == 'All' && flowKeyStack.length > 0) {
        		flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo) 
        											+ '&flowKey=' + flowKeyStack.pop();
        	} else if (acluuid == 'All' && flowKeyStack.length < 1){
        		flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo);
        	} else if(acluuid != 'All' && aclIterKeyStack.length > 0) {
        		flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo) 
				+ '&iterKey=' + aclIterKeyStack.pop();
        	} else if(acluuid != 'All' && aclIterKeyStack.length < 1) {
        		flowGrid.dataSource.transport.options.read.url = '/api/admin/monitor/infrastructure/vrouter/flows?ip=' + getIPOrHostName(computeNodeInfo)
        		+ '&aclUUID=' + acluuid;
        	}
        	reloadKendoGrid(flowGrid);
        }
        function onFlowChange() {
            var name;
            if (name = isCellSelectable(this.select())) {
                if ($.inArray(name, ['src_vn', 'dst_vn']) > -1)
                    selectKendoTab(computeNodeTabStrip, 3);
            }
        }
    }

    function populateRoutesTab(obj) {
        layoutHandler.setURLHashParams({tab:'routes', ip:computeNodeInfo['ip'],node:kendo.format('vRouters:{0}', obj['name'])},{triggerHashChange:false});
        var routesGrid,ucIndex,mcIndex;
        var rdoRouteType = $('#routeType').val();
        var cboVRF;
        var selectedRoute;
    	if(obj['filters'] != null){
    		var postfix = obj['filters'].split(':');
    		selectedRoute = obj['filters'] + ':' + postfix[postfix.length - 1];
    	}
        if(isInitialized('#comboVRF')) {
            cboVRF = $('#comboVRF').data('kendoDropDownList');
            cboVRF.select(function(dataItem) {
                return dataItem.name === selectedRoute;
            });
            cboVRF.dataSource.read();
        } else {
            cboVRF = $('#comboVRF').kendoDropDownList({
                dataSource: {
                    transport: {
                        read:{
                            url:'/api/admin/monitor/infrastructure/vrouter/vrf-list?ip=' + getIPOrHostName(computeNodeInfo)
                        }
                    },
                    schema: {
                        parse:function(response) {
                            return response;
                        }
                    }
                },
                dataValueField:'name',
                dataTextField:'name',
                dataBound: function(e) {
                    window.setTimeout(function() { initUnicastRoutesGrid(); },200);
                },
                change:onVRFChange,
                value:selectedRoute,
            }).data('kendoDropDownList');
            cboVRF.list.width(300);
            $('input[name="routeType"]').change(onRouteTypeChange);
        }
        function onRouteTypeChange() {
        	//TODO may remove this : destroy the grid and rebuild it
        	/*var grid = $("#gridvRouterRoutes").data("kendoGrid");
        	if(grid !=null)
        		grid.destroy();
        	$("#gridvRouterRoutes").removeAttr('data-role');*/
        	if($('#rdboxUnicast').is(':checked') == true) {
            	if($("#gridvRouterMulticastRoutes").data("kendoGrid") !=null) {
            		$("#gridvRouterMulticastRoutes").data("kendoGrid").destroy();
            		$("#gridvRouterUnicastRoutes").html('');
            		$("#gridvRouterMulticastRoutes").html('');
            		//removeAllAttributesOfElement("#gridvRouterMulticastRoutes");
            		//$("#gridvRouterMulticastRoutes").removeAttributes();
            		$("#gridvRouterMulticastRoutes").removeAttr('style');
            		$("#gridvRouterMulticastRoutes").removeAttr('data-role');
            		$("#gridvRouterMulticastRoutes").hide();
            	}
            	//removeAllAttributesOfElement("#gridvRouterUnicastRoutes");
            	//$("#gridvRouterUnicastRoutes").removeAttributes();
        		initUnicastRoutesGrid();
        		$("#gridvRouterUnicastRoutes").show();
        	}
        	else {
            	if($("#gridvRouterUnicastRoutes").data("kendoGrid") !=null) {
            		$("#gridvRouterUnicastRoutes").data("kendoGrid").destroy();
            		$("#gridvRouterUnicastRoutes").html('');
            		$("#gridvRouterMulticastRoutes").html('');
            		//removeAllAttributesOfElement("#gridvRouterUnicastRoutes");
            		//$("#gridvRouterUnicastRoutes").removeAttributes();
            		$("#gridvRouterUnicastRoutes").removeAttr('style');
            		$("#gridvRouterUnicastRoutes").removeAttr('data-role');
            		$("#gridvRouterUnicastRoutes").hide();
            	}
            	//removeAllAttributesOfElement("#gridvRouterMulticastRoutes");
            	//$("#gridvRouterMulticastRoutes").removeAttributes();
        		initMulticastRoutesGrid();
        		$("#gridvRouterMulticastRoutes").show();
        	}
        }

        function onVRFChange(e) {
            routesGrid.dataSource.read();
        }

        //Initialize grid only after getting vrfList
        function initUnicastRoutesGrid() {
            if (!isInitialized($('#gridvRouterUnicastRoutes'))) {
            	/*cboVRF.select(function(dataItem) {
            	    return dataItem.text === selectedRoute;
            	});*/
            	//cboVRF.select(1);
                routesGrid = $('#gridvRouterUnicastRoutes').contrailKendoGrid({
                    dataSource:new kendo.data.DataSource({
                        transport:{
                            read:{
                                url:function () {
                                    var dataItem = cboVRF.dataItem();
                                    ucIndex =  dataItem['ucindex'];
                                    mcIndex = dataItem['mcindex'];
                                    return '/api/admin/monitor/infrastructure/vrouter/ucast-routes?ip=' + getIPOrHostName(computeNodeInfo) + '&vrfindex=' + ucIndex;
                                 }
                            },
                        },
                        schema:{
                            parse:function (response) {
                                var ucastPaths = jsonPath(response,'$..PathSandeshData');
                                var paths = [];
                                var uPaths = [];
                                ucastPaths = $.each(ucastPaths,function(idx,obj) {
                                    if(obj instanceof Array) {
                                        uPaths.push(obj);
                                    } else {
                                        uPaths.push([obj]);
                                    }
                                });
                                var srcIPs = jsonPath(response,'$..src_ip');
                                var srcPrefixLens = jsonPath(response,'$..src_plen');
                                var srcVRFs = jsonPath(response,'$..src_vrf');

                                $.each(uPaths,function(idx,obj) {
                                    $.each(obj,function(i,currPath) {
                                        if(i == 0)
                                            paths.push({dispPrefix:srcIPs[idx] + ' / ' + srcPrefixLens[idx],path:currPath,src_ip:srcIPs[idx],src_plen:srcPrefixLens[idx],src_vrf:srcVRFs[idx]});
                                        else
                                            paths.push({dispPrefix:'',path:currPath,src_ip:srcIPs[idx],src_plen:srcPrefixLens[idx],src_vrf:srcVRFs[idx]});

                                    });
                                });
                               /* paths = $.map(paths,function(obj,idx) {
                                    if(obj['path']['nh']['NhSandeshData']['type'] == 'Composite')
                                        return null;
                                    else
                                        return obj;
                                });*/
                                //console.info(paths);
                                return paths;
                            }
                        },
                    }),
                    columns:[
                        {
                            field:"dispPrefix",
                            title:"Prefix",
                            //template:'#= src_ip # / #= src_plen #',
                            width:200
                        },
                        {
                            field:"next_hop",
                            title:"Next hop Type",
                            template:'#= bgpMonitor.getNextHopType(data) #',
                            width:90
                        },
                        {
                            field:"label",
                            title:"Next hop details",
                            template:'#= bgpMonitor.getNextHopDetails(data) #',
                            //width:70
                        }
                    ],
                    detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                    detailInit:initGridDetail,
                    sortable:false,
                    searchToolbar: true,
                    widgetGridTitle: 'Routes',
                    searchPlaceholder: 'Search Routes'
                });
                showGridLoading('#gridvRouterUnicastRoutes');
                routesGrid = $('#gridvRouterUnicastRoutes').data('kendoGrid');
                applyGridDefHandlers(routesGrid, {noMsg:'No Routes to display for the given search criteria'});
            } else {
                routesGrid = $('#gridvRouterUnicastRoutes').data('kendoGrid');
                reloadKendoGrid(routesGrid);
            }
        }
        
      //Initialize grid only after getting vrfList
        function initMulticastRoutesGrid() {
            if (!isInitialized($('#gridvRouterMulticastRoutes'))) {
                $('#gridvRouterMulticastRoutes').contrailKendoGrid({
                    dataSource:new kendo.data.DataSource({
                        transport:{
                            read:{
                                url:function () {
                                    var dataItem = cboVRF.dataItem();
                                    ucIndex =  dataItem['ucindex'];
                                    mcIndex = dataItem['mcindex'];
                                    return '/api/admin/monitor/infrastructure/vrouter/mcast-routes?ip=' + getIPOrHostName(computeNodeInfo) + '&vrfindex=' + mcIndex;
                                }
                            },
                        },
                        schema:{
                            parse:function (response) {
                                var ucastPaths = jsonPath(response,'$..RouteMcSandeshData');
                                var paths = [];
                                var uPaths = [];
                                ucastPaths = $.each(ucastPaths,function(idx,obj) {
                                    if(obj instanceof Array) {
                                        uPaths.push(obj);
                                    } else {
                                        uPaths.push([obj]);
                                    }
                                });
                                var srcIPs = jsonPath(response,'$..src');
                                var srcPrefixLens = jsonPath(response,'$..grp');

                                $.each(uPaths,function(idx,obj) {
                                    $.each(obj,function(i,currPath) {
                                        if(i == 0)
                                            paths.push({dispPrefix:srcIPs[idx] + ' / ' + srcPrefixLens[idx],path:currPath,src_ip:srcIPs[idx],src_plen:srcPrefixLens[idx]});
                                        else
                                            paths.push({dispPrefix:'',path:currPath,src_ip:srcIPs[idx],src_plen:srcPrefixLens[idx]});

                                    });
                                });
                               /* TODO i am not ignoring the composite paths for the multicast 
                                * paths = $.map(paths,function(obj,idx) {
                                    if(obj['path']['nh']['NhSandeshData']['type'] == 'Composite')
                                        return null;
                                    else
                                        return obj;
                                }); */
                                //console.info(paths);
                                return paths;
                            }
                        },
                    }),
                    columns:[
                        {
                            field:"dispPrefix",
                            title:"Source / Group",
                            //template:'#= src_ip # / #= src_plen #',
                            width:200
                        },
                        {
                            field:"next_hop",
                            title:"Next hop type",
                            template:'#= bgpMonitor.getNextHopType(data) #',
                            width:90
                        },
                        {
                            field:"label",
                            title:"Next hop details",
                            template:'#= bgpMonitor.getNextHopDetailsForMulticast(data) #',
                            //width:70
                        }
                    ],
                    detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                    detailInit:initGridDetail,
                    sortable:false,
                    searchToolbar: true,
                    widgetGridTitle: 'Routes',
                    searchPlaceholder: 'Search Routes',
                });
                showGridLoading('#gridvRouterMulticastRoutes');
                routesGrid = $('#gridvRouterMulticastRoutes').data('kendoGrid');
                applyGridDefHandlers(routesGrid, {noMsg:'No Routes to display for the given search criteria'});
            } else {
                routesGrid = $('#gridvRouterMulticastRoutes').data('kendoGrid');
                reloadKendoGrid(routesGrid);
            }
        }
    }


    this.populateComputeNode = function (obj) {

        var tabs = ['details', 'console', 'interfaces', 'networks', 'acl', 'flows','routes'];
        var tabIdx = $.inArray(obj['tab'], tabs);
        if (tabIdx == -1)
            tabIdx = 0;
        //if ($('#compute_tabstrip').length == 0) {
        if (!isInitialized('#compute_tabstrip')) {
            var compNodeTemplate = kendo.template($("#computenode-template").html());
            $(pageContainer).html(compNodeTemplate(computeNodeInfo));
            //Set the height of all tabstrip containers to viewheight - tabstrip
            var tabContHeight = layoutHandler.getViewHeight() - 42;
      //      $('#compute_tabstrip > div').height(tabContHeight);
            kendo.init($('#contACL'));
            kendo.bind($('#contACL'), aclViewModel);
            computeNodeTabStrip = $("#compute_tabstrip").kendoTabStrip({
                height:"300px",
                animation:{
                    open:{
                        effects:"fadeIn"
                    }
                },
                select:function (e) {
                    //activate: function(e) {
                    infraMonitorView.clearTimers();
                    var selTab = $(e.item).text();
                    //alert($(e.item).text() + ","+e.filters);
                    if (selTab != 'Console') {
                    }

                    if (selTab == 'Interfaces') {
                        populateInterfaceTab(computeNodeInfo);
                    } else if (selTab == 'Networks') {
                        populateVNTab(computeNodeInfo);
                    } else if (selTab == 'ACL') {
                        populateACLTab(computeNodeInfo);
                    } else if (selTab == 'Flows') {
                        populateFlowsTab(computeNodeInfo, e.filters);
                    } else if (selTab == 'Console') {
                        infraMonitorView.populateMessagesTab('compute', {source:computeNodeInfo['name']}, computeNodeInfo);
                    } else if (selTab == 'Debug Info') {
                        populateDebugTab(computeNodeInfo);
                    } else if (selTab == 'Details') {
                        populateDetailsTab(computeNodeInfo);
                    } else if(selTab == 'Routes') {
                        populateRoutesTab(computeNodeInfo);
                    }
                }
            }).data('kendoTabStrip');
            selectKendoTab(computeNodeTabStrip,tabIdx);
        } else {
            selectKendoTab(computeNodeTabStrip,tabIdx);
        }
    }
}

cmpNodesView = new computeNodesView();
cmpNodeView = new computeNodeView();
