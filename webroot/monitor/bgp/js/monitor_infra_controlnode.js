controlNodesView = function () {
    var self = this;
    var ctrlNodesGrid,ctrlNodesData = [];

    this.load = function (obj) {
        populateControlNodes();
        layoutHandler.setURLHashParams({node:'Control Nodes'},{merge:false,triggerHashChange:false});
    }
    this.setCtrlNodesData = function(data) {
        ctrlNodesData = data;
    }
    this.getCtrlNodesData = function() {
        return ctrlNodesData;
    }

    this.destroy = function () {
        //contView.destroy();
    }

    function populateControlNodes() {
        infraMonitorView.clearTimers();
        var ctrlNodesTemplate = kendo.template($("#controlnodes-template").html());
        $(pageContainer).html(ctrlNodesTemplate({}));

        //Initialize widget header
        $('#controlNodes-header').initWidgetHeader({title:'Control Nodes'});

        $('#gridControlNodes').contrailKendoGrid({
            dataSource:{
                transport:{
                    read:{
                        url:'/api/admin/monitor/infrastructure/controlnodes/summary?addGen',
                        //Change the default timeout explictly for this URL
                        //timeout:10000
                    },
                    schema:{
                        //May be this is applicable only for server-side pagination??
                        //pageSize:10,
                    }
                },
                schema: {
                    parse: function(response) {
                        response = infraMonitorView.parseControlNodesDashboardData(response);
                        var chartsData = [{title:'vRouters',d:[{key:'vRouters',values:response}],link:{hashParams:{p:'mon_bgp',q:{node:'vRouters'}}}}];
                        $('#controlNodes-bubble').initScatterChart(chartsData[0]);
                        return response;
                    }
                }
                //pageSize: 10
            },
            selectable:'cell',
            columns:[
                {
                    field:"name",
                    template:cellTemplate({cellText:'name', tooltip:true, name:'name', applyColor:true}),
                    title:"Host name",
                    width:140
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
                    template:'<div class="gridSparkline display-inline"></div><span class="display-inline">#= cpu #</span>',
                    width:150
                },
                {
                    field:"memory",
                    title:"Memory",
                    width:150
                },
                {
                    field:"establishedPeerCount",
                    title:"BGP Peers",
                    width:180,
                    template:'#= kendo.format("{0} Up, {1}",upBgpPeerCnt,downBgpPeerCntText)#'
                },
                {
                    field:"activevRouterCount",
                    title:"vRouters",
                    template:'#= kendo.format("{0} Up, {1}",upXMPPPeerCnt,downXMPPPeerCntText)#',
                    width:180
                }
            ],
            change:onCtrlNodeRowSelChange,
            dataBound:function(data) {
                addExtraStylingToGrid();
                addActions(data);
            },
            searchToolbar: true,
            widgetGridTitle: 'Control Nodes',
            searchPlaceholder: 'Search Control Nodes',
        });
        showGridLoading('#gridControlNodes');
        ctrlNodesGrid = $('#gridControlNodes').data('kendoGrid');
        applyGridDefHandlers(ctrlNodesGrid, {noMsg:'No Control Nodes to display'});
    }

    function addActions(data) {
        $('.gridSparkline').each(function() {
            var rowIndex = $(this).closest('td').parent().index();
            $(this).initSparkLineChart({viewType:'line',container:'gridCell'});
        });
    }

    function onCtrlNodeRowSelChange() {
        //Check if cell is clickable
        if ($(this.select()).find('*[name]').length > 0) {
            //var selRowDataItem = ctrlNodesGrid.dataItem(ctrlNodesGrid.select());
            var selRowDataItem = ctrlNodesGrid.dataSource.view()[this.select().closest('tr').index()];
            //Info:Check if this event is triggered on row unselect also??
            //No unselect happens in current use case as we navigate to a different page on row select
            if (ctrlNodesGrid.select().length == 1) {
                var tree = $("#treeInfraNode").data("kendoTreeView");
                if (tree) {
                    selTreeNode({tree:tree, fqName:'Control Nodes:' + selRowDataItem['hostName'],trigger:false})
                }
                ctrlNodeView.load({name:selRowDataItem['name'], ip:selRowDataItem['ip']});
                //layoutHandler.setURLHashParams({node:'Control Nodes:' + selRowDataItem['hostName']},{merge:false});
            }
        }
    }
}



controlNodeView = function () {
    var peersGrid, routesGrid, consoleGrid, ctrlNodeTabStrip;
    var ctrlNodeInfo = {}, self = this;
    var ctrlNodeData = {};
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
    	ctrlNodeInfo = obj;
    	if((ctrlNodeInfo == null || ctrlNodeInfo.ip ==  null ||  ctrlNodeInfo.ip == '') && ctrlNodeInfo.tab != null){
			//issue details call and populate ip
			var controlNodeDeferredObj = $.Deferred();
			self.getControlNodeDetails(controlNodeDeferredObj,ctrlNodeInfo);
			controlNodeDeferredObj.done(function(data) {
            	ctrlNodeInfo['ip'] = data.BgpRouterState.bgp_router_ip_list[0];
            	if (ctrlNodeInfo)
    	            selTreeNode({tree:infraNodesTree, fqName:ctrlNodeInfo['name'], expand:true, trigger:false});
    	        self.populateControlNode(ctrlNodeInfo);
            });
		} else {
			if (ctrlNodeInfo['name'] != null)
	            selTreeNode({tree:infraNodesTree, fqName:ctrlNodeInfo['name'], expand:true, trigger:false});
	        self.populateControlNode(ctrlNodeInfo);
		}
    }

    this.destroy = function () {
        //contView.destroy();
    }
    
    this.getControlNodeDetails = function(deferredObj,obj) {
        $.ajax({
            url:'/api/admin/monitor/infrastructure/controlnode/details?hostname=' + obj['name']
        }).done(function(result) {
            deferredObj.resolve(result);
        });
    }


    function populatePeersTab(obj) {
        layoutHandler.setURLHashParams({tab:'peers',  ip:ctrlNodeInfo['ip'],node:kendo.format('Control Nodes:{0}', obj['name'])},{triggerHashChange:false});
        //Intialize the grid only for the first time
        if (!isInitialized('#gridPeers')) {
            $('#gridPeers').contrailKendoGrid({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/controlnode/bgppeer?hostname=' + obj['name'];
                            }
                        }
                    },
                    schema:{
                    	parse: function(response) {
                            response = processPeerInfo(response,obj['name']);
                            return response;
                        }
                    }
                },
                columns:[
                    {
                        field:"peer_address",
                        title:"Peer",
                        width:110,
                        template:cellTemplate({name:'#= (peer_address == "' + noDataStr + '")  ? peer.split(":").pop()  : peer_address #',cellText:'#= (peer_address == "' + noDataStr + '")  ? peer.split(":").pop()  : peer_address #', tooltip:true,
                            //onclick:showObjLog('#= (peer_address == "' + noDataStr + '")  ? peer.split(":").pop()  : peer_address #')})
                            onclick:'showObjLog(\'#=name#\',\'#=encoding#_peer\')' 
                        })
                    },
                    {
                        field:"encoding",
                        title:"Peer Type",
                        width:125,
                        //template:cellTemplate({cellText:'#= formatPeerType(encoding,peer_type)#', tooltip:true})
                        template:cellTemplate({cellText:'encoding', tooltip:true})
                    },
                    {
                        field:"peer_asn",
                        title:"Peer ASN",
                        width:80
                    },
                    {
                        field:"introspect_state",
                        title:"Status",
                        template:cellTemplate({cellText:'introspect_state', tooltip:true}),
                        width:140
                    },
                    //{field:"errors",    title:"Last error"},
                    {
                        field:"last_flap",
                        title:"Last flap",
                        width:110                    
                    },
                    {
                        field:"preference",
                        title:"Preference",
                        hidden:true,
                        width:110
                    },
                    {
                        field:"active_holdtime",
                        title:"Hold Time",
                        hidden:true,
                        width:110
                    },
                    {
                        field:"flap_count",
                        title:"Flap Count",
                        hidden:true,
                        width:110
                    },
                    {
                        field:'messsages_in',
                        template:'#= messsages_in# / #=messsages_out#',
                        headerAttributes:{style:'min-width:160px;'},
                        width:160,
                        title:"Messages (Recv/Sent)"
                    },/*{
                     field:'action',
                     //template:'<select class="input-elem"></select>',
                     //template:'<ul class="main" style="width:120px"><li style="width:120px">Actions<ul style="width:120px"><li>Troubleshoot</li></ul></li></ul>',
                     template:'<div class="gridSparkline display-inline"></div><div class="display-inline">100</div>',
                     //template: "#= initGridSparkline(data) #",
                     width:130,
                     title:'Actions'
                     }*/
                ],
                //change: onPeerRowSelChange,
                dataBound:addActions,
                searchToolbar: true,
                widgetGridTitle: 'Peers',
                searchPlaceholder: 'Search Peers'
            });
            showGridLoading('#gridPeers');
            peersGrid = $('#gridPeers').data('kendoGrid');
            applyGridDefHandlers(peersGrid, {noMsg:'No Peers to display'});
        } else {
            reloadKendoGrid(peersGrid);
        }
        
        function processPeerInfo (peerInfo,hostname)
        {
        	var ret = [];
        	
            try {
            	//first process the bgp peers
            	var bgpPeerInfo = peerInfo['bgp-peer']['value'];
            	ret = processPeerDetails(bgpPeerInfo,'bgp',ret,hostname);
            	//now process xmpp peers
            	var xmppPeerInfo = peerInfo['xmpp-peer']['value'];
            	ret = processPeerDetails(xmppPeerInfo,'xmpp',ret,hostname);
            } catch(e) {}
            return ret;
        }
        
        function processPeerDetails(bgpPeerInfo,type,ret,hostname){
        	for(var i = 0; i < bgpPeerInfo.length; i++) {
        		var obj = {};
        		var peerInfodata ;
        		if(type == 'bgp'){
	        		try {
	    	            var nameArr = bgpPeerInfo[i]['name'].split(':');
	    	            if ((hostname == nameArr[4])) {
	    	                obj['encoding'] = 'BGP';
	    	                obj['peer_address'] = bgpPeerInfo[i].value.BgpPeerInfoData.peer_address;
	    	            } else {
	    	            	continue;//skip if it is not for this control node
	    	            }
	    	            peerInfodata = bgpPeerInfo[i].value.BgpPeerInfoData;
	    	        } catch(e) {
	    	        	obj['peer_address'] = '-';
	    	        }
        		} else if (type == 'xmpp') {
        			try{
	                    var nameArr = bgpPeerInfo[i]['name'].split(':');
	                    obj['peer_address'] = nameArr[1];
	                    obj['encoding'] = 'XMPP';
	                    peerInfodata = bgpPeerInfo[i].value.XmppPeerInfoData;
        			} catch(e){}
        		}
        		try{
        			obj['name'] = jsonPath(bgpPeerInfo[i],'$..name')[0];
        		}catch(e){
        			obj['name'] = "-"
        		}
        		try{
        			obj['send_state'] = jsonPath(peerInfodata,'$..send_state');
        			if(obj['send_state'] == false) 
                    	obj['send_state'] = '-';
        		}catch(e){
        			obj['send_state'] = '-';
        		}
        		try{
        			obj['peer_asn'] = jsonPath(peerInfodata,'$..peer_asn')[0];
        			if(obj['peer_asn'] == null) 
                    	obj['peer_asn'] = '-';
        		}catch(e){
        			obj['peer_asn'] = '-';
        		}
        		try{
        			obj = copyObject(obj, peerInfodata['state_info']);
        		}catch(e){}
        		try{
        			obj = copyObject(obj, peerInfodata['event_info']);
        		}catch(e){
        			obj['routing_tables'] = '-';
        		}	
        		try{
                	obj['routing_tables'] = peerInfodata['routing_tables'];
        		}catch(e){}
                try {
                    obj['last_flap'] = new XDate(peerInfodata['flap_info']['flap_time']/1000).toLocaleString();
                } catch(e) {
                    obj['last_flap'] = '-';
                }
                try {
                    obj['messsages_in'] = peerInfodata['peer_stats_info']['rx_proto_stats']['total'];
                } catch(e) {
                    obj['messsages_in'] = '-';
                }
                try {
                    obj['messsages_out'] = peerInfodata['peer_stats_info']['tx_proto_stats']['total'];
                } catch(e) {
                    obj['messsages_out'] = '-';
                }
                try {
                    var state = obj['state'];
                    var introspecState = null;
                    if (null == state) {
                        introspecState = '' + obj['send_state'];
                    } else {
                        introspecState = state + ', ' + obj['send_state'];
                    }
                    obj['introspect_state'] = introspecState;
                } catch(e) {
                    obj['introspect_state'] = '-';
                }
                ret.push(obj);
        	}//for loop for bgp peers END
        	return ret;
        }
        
        function copyObject(dest, src)
        {
            for (key in src) {
                dest[key] = src[key];
            }
            return dest;
        }

        function initGridSparkline(data) {

        }

        function addActions() {
            $('td').each(function () {
                var colIndex = $(this).index();
                var rowIndex = $(this).parent().index();
                var cellHeader = $(this).closest('.k-grid-content').siblings('.k-grid-header').find('thead tr th')[colIndex]
                if ($(cellHeader).text() == 'Actions') {
                    //$(this).addClass('cell-menu');
                    $(this).css('overflow', 'visible');
                }
            });
            $('.gridSparkline').each(function() {
                $(this).initSparkLineChart({chartType:'line'});
            });
            $('select', peersGrid.element).each(function () {
                $(this).kendoDropDownList({});
            });
            $('ul.main', peersGrid.element).each(function () {
                $(this).kendoMenu({
                    popupCollision:false,
                    select:onMenuSelect
                });
            });
            function onMenuSelect(e) {
                //console.info('Hello');
                var selMenu = $(e.item).text();
                var rowIndex = $(this.element).closest('tr').index();
                var selRowDataItem = peersGrid.dataSource.view()[rowIndex];
                //console.info(selMenu,rowIndex);
                if (selMenu == 'Troubleshoot') {
                    var menuObj = menuHandler.getMenuObjByHash('query_log_system');
                    menuHandler.loadViewFromMenuObj(menuObj);
                }
            }
        }

        function onPeerRowSelChange() {
            var selRowDataItem = peersGrid.dataItem(peersGrid.select());
            if (currView != null) {
                currView.destroy();
            }
            currView = peerNodeView;
            peerNodeView.load({name:selRowDataItem['address']});
        }
    }

    function populateRoutesTab(obj) {
        layoutHandler.setURLHashParams({tab:'routes',  ip:ctrlNodeInfo['ip'],node:kendo.format('Control Nodes:{0}', obj['name'])},{triggerHashChange:false});
        var comboRoutingInstance = $('#comboRoutingInstance').data('kendoComboBox'),
            comboRoutingTable = $('#comboRoutingTable').data('kendoDropDownList'),
            comboPeerSource = $('#comboPeerSource').data('kendoComboBox'),
            txtPrefixSearch = $('#txtPrefixSearch').data('kendoAutoComplete'),
            comboLimit = $('#comboRouteLimit').data('kendoDropDownList'),
            comboProtocol = $('#comboProtocol').data('kendoDropDownList'),
            txtLimit = $('#txtLimit');

        $(txtPrefixSearch.element).attr('placeholder', 'Prefix');
        comboRoutingInstance.input.attr('placeholder', 'All');
        //comboRoutingTable.input.attr('placeholder', 'All');
        //comboPeerSource.input.attr('placeholder', 'All');

        comboRoutingInstance.list.width(500);
        //comboRoutingTable.list.width(300);
        comboPeerSource.list.width(300);
        var routeQueryString = {}, routeTableSel = '';
        $.ajax({
            url:'/api/admin/monitor/infrastructure/controlnode/routes/autocompletelist?ip=' + getIPOrHostName(ctrlNodeInfo),
        }).done(function (result) {
                //Render the drop-down if it's not initialized
                routesViewModel.set('routingInstances', ['All'].concat(result['routeInstances']));
                var routeTableList = [];
                result['route'] = $.map(result['route'], function (value, idx) {
                    return (value.split('.').length == 3) ? value.split('.')[1] : value
                });
                result['route'] = uniqueArray(result['route']);
                $.each(result['route'], function (idx, value) {
                    routeTableList.push(value);
                });
                routesViewModel.set('routeTables', ['All'].concat(routeTableList));
                //Need to check setting viewmodel doesn't pickup
                comboRoutingTable.value('All');
                routesViewModel.set('peerSources',['All'].concat(result['peerSource']));
                comboPeerSource.value('All');
            });


        function getRouteTableVal() {
            if (routeTableSel == '')
                return routeTableSel;
            else
                return '.' + routeTableSel + '.';
        }

        function filterRoutes() {
            var routeDS = routesGrid.dataSource;
            if (routesGrid.dataSource.filter() == null) {
                routesGrid.dataSource.filter([
                    {
                        //field:'table',
                        field:function(d) {
                            return d;
                        },
                        operator:function (a, b) {
                            //console.info('customFilter',a,routeTableSel);
                            if ((typeof(a) == 'string') && (a != null) && (routeTableSel != '')) {
                                if (a.indexOf(routeTableSel) > -1)
                                    return true;
                            }
                            if (routeTableSel == '' || (typeof(a) != 'string'))
                                return true;
                            return false;
                        },
                        //operator:'contains',
                        //value:getRouteTableVal()
                        //value:'inet'
                    }
                ])
            }
        }

        function onRouteChange() {
            var name;
            if (name = isCellSelectable(this.select())) {
                if (name == 'source') {
                    selectKendoTab(ctrlNodeTabStrip, 0);
                }
            }
        }
        if (!isInitialized($('#gridRoutes'))) {
            $('#btnRouteReset').on('click', function () {
                //routesGrid.dataSource.data([]);
                routesViewModel.set('routingInstanceValue', 'All');
                routesViewModel.set('peerSourceValue', '');
                routesViewModel.set('limit', '50');
                routesViewModel.set('prefix', '');
                routesViewModel.set('routeTableValue', 'All');
                $('#btnDisplayRoutes').trigger('click');
            });

            $('#btnDisplayRoutes').on('click', function (e) {
                //Frame the filter query string
                routeQueryString = { };
                var routeInst = comboRoutingInstance.value(), routeTable = comboRoutingTable.value(),
                    peerSource = comboPeerSource.value(), protocol = comboProtocol.value();
                if (routeInst != 'All')
                    routeQueryString['routingInst'] = routeInst;
                if (routeTable != 'All') {
                	routeQueryString['addrFamily'] = routeTable;
                } else
                	routeQueryString['addrFamily'] = '';
                if (peerSource != 'All')
                    routeQueryString['peerSource'] = peerSource;
                if (protocol != 'All')
                    routeQueryString['protocol'] = protocol;
                if (routesViewModel['prefix'] != '')
                    routeQueryString['prefix'] = routesViewModel['prefix'];
                if (routesViewModel['limit'] != '')
                    routeQueryString['limit'] = routesViewModel['limit'];
                //routesGrid.dataSource.read();
                //routesGrid.dataSource.filter({});
                filterRoutes();
                reloadKendoGrid(routesGrid);
            });
            $('#gridRoutes').contrailKendoGrid({
                dataSource:new kendo.data.DataSource({
                    /*filter: {
                     field:'table',
                     operator:'contains',
                     value:getRouteTableVal()
                     },*/
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/controlnode/routes?ip=' + getIPOrHostName(ctrlNodeInfo) + '&' + $.param(routeQueryString)
                            }
                        },
                    },
                    schema:{
                        parse:function (response) {
                            var routesArr = [], routeTables = [], routeInstances = [];
                            var routes = response;
                            var selAddFamily = comboRoutingTable.value();
                            var selPeerSrc = comboPeerSource.value();
                            var selProtocol = comboProtocol.value();
                            routes = jsonPath(response, '$..ShowRoute');
                            routeTables = jsonPath(response, '$..routing_table_name');
                            routeInstances = jsonPath(response, '$..routing_instance');
                            //routes = flattenList(routes);
                            var routesLen = routes.length;
                            for (var i = 0; i < routesLen; i++) {
                            	var isRtTableDisplayed = false;
                            	if(!(routes[i] instanceof Array)) {
                            		routes[i] = [routes[i]];
                                }
                                $.each(routes[i], function (idx, value) {
                                    var currRoute = value;
                                    var paths = jsonPath(currRoute,"$..ShowRoutePath")[0];
                                    if(!(paths instanceof Array)) {
                                    	paths = [paths];
                                    }
                                    var pathsLen = paths.length;
                                    var alternatePaths = [],bestPath = {};
                                    var rtTable = routeTables[i];
                                    var securityGroup = "--";
                                    //Multiple paths can be there for a given prefix
                                    $.each(paths, function (idx,obj) {
                                    	if(isRtTableDisplayed){
                                        	rtTable = '';
                                        } 
                                    	var rtable= routeTables[i];
                                    	var origVn = obj['origin_vn'];
                                    	var addfamily = '-';
                                    	if(rtable != null){
                                    		addfamily = (rtable.split('.').length == 3) ? rtable.split('.')[1] : rtable;
                                    	}
                                    	var rawJson = obj;
                                    	var sg = getSecurityGroup(jsonPath(obj,"$..communities..element")[0]);
                                    	//Fitering based on Address Family, Peer Source and Protocol selection
                                    	if((selAddFamily == "All" || selAddFamily == addfamily) && 
                                    			(selPeerSrc == "All" || selPeerSrc == obj['source']) &&
                                    			(selProtocol == "All" || selProtocol == obj['protocol'])){
	                                    	origVn = ifNullOrEmptyObject(origVn, "-") ;
	                                        if(idx == 0) {
	                                            /*bestPath = $.extend(obj, {
	                                            	prefix:currRoute['prefix'], 
	                                            	dispPrefix:currRoute['prefix'],
	                                            	table:rtTable,
	                                                instance:routeInstances[i],
	                                                addrFamily:addfamily,
	                                                sg:sg,
	                                                raw_json:rawJson,
	                                                originVn:origVn});
	                                            routesArr.push(bestPath);*/
	                                        	routesArr.push({
	                                        		prefix:currRoute['Prefix'],
	                                            	dispPrefix:currRoute['prefix'],
	                                            	table:rtTable,
	                                            	instance:routeInstances[i],
	                                            	addrFamily:addfamily,
	                                            	sg:ifEmpty(sg,'-'),
	                                            	raw_json:rawJson,
	                                            	originVn:origVn,
	                                            	protocol:obj['protocol'],
	                                            	source:obj['source'],
	                                            	next_hop:obj['next_hop'],
	                                            	label:obj['label']
	                                        	});
	                                        } else {
	                                            //alternatePaths.push(obj);
	                                            /*routesArr.push($.extend(obj,{
	                                            	prefix:currRoute['Prefix'],
	                                            	dispPrefix:'',
	                                            	table:rtTable,
	                                            	instance:routeInstances[i],
	                                            	addrFamily:addfamily,
	                                            	sg:sg,
	                                            	raw_json:rawJson,
	                                            	originVn:origVn}));*/
	                                        	routesArr.push({
	                                        		prefix:currRoute['Prefix'],
	                                            	dispPrefix:'',
	                                            	table:rtTable,
	                                            	instance:routeInstances[i],
	                                            	addrFamily:addfamily,
	                                            	sg:ifEmpty(sg,'-'),
	                                            	raw_json:rawJson,
	                                            	originVn:origVn,
	                                            	protocol:obj['protocol'],
	                                            	source:obj['source'],
	                                            	next_hop:obj['next_hop'],
	                                            	label:obj['label']
	                                        	});
	                                        }
	                                        isRtTableDisplayed = true;
                                    	}
                                    });
                                    //routesArr.push($.extend(bestPath,{alternatePaths:alternatePaths}));
                                });
                            }
                            routesArr = flattenList(routesArr);
                            return routesArr;
                        }
                    },
                }),
                //dataBound:filterRoutes,
                //dataBinding:filterRoutes,
                //autoBind:false,
                columns:[
					{
					    field:"table",
					    title:"Routing Table",
					    width:250
					},
                    {
                        field:"dispPrefix",
                        title:"Prefix",
                        width:200
                    },
					{
                        field:"protocol",
                        title:"Protocol",
                        width:75
                    },
                    {
                        field:"source",
                        title:"Source",
                        width:90,
                        template:cellTemplate({cellText:'#= source.split(":").pop() #', tooltip:true})
                        //template:cellTemplate({cellText:'#= source.split(":").pop() #', name:'source', tooltipFn:'multiPathTooltip'})
                    },
                    {
                        field:"next_hop",
                        title:"Next hop",
                        width:80
                    }/*,
                     {
                     field:"metric",
                     title:"Metric",
                     width:70
                     }*/,
                    {
                        field:"label",
                        title:"Label",
                        width:70
                    },
                    /*{
                     field:"local_asn",
                     title:"ASNs",
                     width:70,
                     template:'#=local_asn#' + '/' + '#=peer_asn#'
                     },
                    {
                        field:"local_preference",
                        title:"Local Preference",
                        width:125
                    },
                    {
                        field:"as_path",
                        title:"AS Path",
                        width:75
                    }*/
                    {
                        field:"sg",
                        title:"Security Group",
                        width:50
                    },
                    {
	                    field:"originVn",
	                    title:"Origin VN",
	                    width:90
                    },
                ],
                detailTemplate:kendo.template($("#gridsTemplateJSONDump").html()),
                detailInit:initGridDetail,
                sortable:false,
                change:onRouteChange,
                pageable: {
                	info:false,
                },
                searchToolbar: true,
                widgetGridTitle: 'Routes',
                searchPlaceholder: 'Search Routes'
            });
            showGridLoading('#gridRoutes');
            routesGrid = $('#gridRoutes').data('kendoGrid');
            //filterRoutes();
            applyGridDefHandlers(routesGrid, {noMsg:'No Routes to display for the given search criteria'});
        }
    }
    
    function populateServiceChainingTab(obj) {
        layoutHandler.setURLHashParams({tab:'servicechaining',  ip:ctrlNodeInfo['ip'],node:kendo.format('Control Nodes:{0}', obj['name'])},{triggerHashChange:false});
        //Intialize the grid only for the first time
        if (!isInitialized('#gridServiceChaining')) {
            serviceChainingGrid = $('#gridServiceChaining').kendoGrid($.extend({
                dataSource:{
                    transport:{
                        read:{
                            url:function () {
                                return '/api/admin/monitor/infrastructure/controlnode/sandesh?ip='+ obj['ip']+'&type=service-chain' ;
                            }
                        }
                    },
                    schema:{
                    	parse: function(response) {
                            response = processServiceChainInfo(response,obj['name']);
                            return response;
                        }
                    }
                },
                columns:[
                    {
                        field:"dest_rt_instance",
                        title:"Destination Route Instance",
                        width:110,
                        template:cellTemplate({name:'#= (peer_address == "' + noDataStr + '")  ? peer.split(":").pop()  : peer_address #',cellText:'#= (peer_address == "' + noDataStr + '")  ? peer.split(":").pop()  : peer_address #', tooltip:true,
                            //onclick:showObjLog('#= (peer_address == "' + noDataStr + '")  ? peer.split(":").pop()  : peer_address #')})
                            onclick:'showObjLog(\'default-domain%3Adefault-project%3Aip-fabric%3A__default__%3A#=peer_address#\',\'#=encoding#_peer\')' 
                        })
                    },
                    {
                        field:"connected_route",
                        title:"Connected Routes",
                        width:125,
                        //template:cellTemplate({cellText:'#= formatPeerType(encoding,peer_type)#', tooltip:true})
                        template:cellTemplate({cellText:'encoding', tooltip:true})
                    }
                ],
                //change: onPeerRowSelChange,
                dataBound:addActions,
                detailTemplate:kendo.template($("#gridsTempDetailServiceChaining").html()),
                detailInit:initGridsvcInstancesDetail
            }, kendoGlobalGridDefault.basic, {/*height:'100%'*/})).data('kendoGrid');
            applyGridDefHandlers(serviceChainingGrid, {noMsg:'No Service Chains to display'});
        } else {
            reloadKendoGrid(serviceChainingGrid);
        }
        
        function initGridsvcInstancesDetail(e) {
            var detailRow = e.detailRow;
        }
        
        function processServiceChainInfo (peerInfo,hostname)
        {
        	var ret = [];
        	
            try {
            	//first process the bgp peers
            	var bgpPeerInfo = peerInfo['bgp-peer']['value'];
            	ret = processPeerDetails(bgpPeerInfo,'bgp',ret,hostname);
            	//now process xmpp peers
            	var xmppPeerInfo = peerInfo['xmpp-peer']['value'];
            	ret = processPeerDetails(xmppPeerInfo,'xmpp',ret,hostname);
            } catch(e) {}
            return ret;
        }
        
        function addActions() {
            $('td').each(function () {
                var colIndex = $(this).index();
                var rowIndex = $(this).parent().index();
                var cellHeader = $(this).closest('.k-grid-content').siblings('.k-grid-header').find('thead tr th')[colIndex]
                if ($(cellHeader).text() == 'Actions') {
                    //$(this).addClass('cell-menu');
                    $(this).css('overflow', 'visible');
                }
            });
            $('.gridSparkline').each(function() {
                $(this).initSparkLineChart({chartType:'line'});
            });
            $('select', serviceChainingGrid.element).each(function () {
                $(this).kendoDropDownList({});
            });
            $('ul.main', serviceChainingGrid.element).each(function () {
                $(this).kendoMenu({
                    popupCollision:false,
                    select:onMenuSelect
                });
            });
            function onMenuSelect(e) {
                //console.info('Hello');
                var selMenu = $(e.item).text();
                var rowIndex = $(this.element).closest('tr').index();
                var selRowDataItem = serviceChainingGrid.dataSource.view()[rowIndex];
                //console.info(selMenu,rowIndex);
                if (selMenu == 'Troubleshoot') {
                    var menuObj = menuHandler.getMenuObjByHash('query_log_system');
                    menuHandler.loadViewFromMenuObj(menuObj);
                }
            }
        }

        function onPeerRowSelChange() {
            var selRowDataItem = serviceChainingGrid.dataItem(serviceChainingGrid.select());
            if (currView != null) {
                currView.destroy();
            }
            currView = peerNodeView;
            peerNodeView.load({name:selRowDataItem['address']});
        }
    }
    function populateDetailsTab(obj) {
        var endTime = new Date().getTime(), startTime = endTime - 600000;
        var slConfig = {startTime: startTime, endTime: endTime};
        var nodeIp;
        //Compute the label/value pairs to be displayed in dashboard pane
        //As details tab is the default tab,don't update the tab state in URL
        layoutHandler.setURLHashParams({tab:'',ip:obj['ip'], node:kendo.format('Control Nodes:{0}', obj['name'])},{triggerHashChange:false});
        //showProgressMask('#controlnode-dashboard', true);
        startWidgetLoading('control-sparklines');
        $.ajax({
            url:'/api/admin/monitor/infrastructure/controlnode/details?hostname=' + obj['name']
        }).done(function (result) {
                ctrlNodeData = result;
                var cpu = "N/A",
                    memory = "N/A",
                    dashboardTemplate = kendo.template($('#dashboard-template').html()),
                    ctrlNodeDashboardInfo, oneMinCPU, fiveMinCPU, fifteenMinCPU,
                    usedMemory, totalMemory;
                $('#control-sparklines').initMemCPUSparkLines(result, 'parseMemCPUData4SparkLines', {'BgpRouterState':[{name: 'cpu_share', color: 'blue-sparkline'}, {name: 'virt_mem', color: 'green-sparkline'}]}, slConfig);
                endWidgetLoading('control-sparklines');
                /*  $('#control-chart2').initLineChart($.extend({url:function() {
                 return '/api/tenant/networking/flow-series/cpu?moduleId=ControlNode&minsSince=30&sampleCnt=10&source=' + ctrlNodeInfo['name'];
                 }},getCPUMemoryChartConfig('controlNode'),{memTitle:'control-node Memory',cpuTitle:'control-node CPU Utilization'}),250,375,"System");
                 $('#control-chart3').initLineChart($.extend({url:function() {
                 return '/api/tenant/networking/flow-series/cpu?moduleId=ControlNode&minsSince=30&sampleCnt=10&source=' + ctrlNodeInfo['name'];
                 }},getCPUMemoryChartConfig('controlNode'),{memTitle:'control-node Memory',cpuTitle:'control-node CPU Utilization'}),250,375,"Bandwidth");
                 TODO uncomment to put the 3 charts back*/
                ctrlNodeDashboardInfo = [
                 	{lbl:'Hostname', value:obj['name']},
                    {lbl:'IP Address',value:(function(){
                    	var ip = noDataStr;
                    	var configip = noDataStr;
                        try{
                        	ip = jsonPath(ctrlNodeData,'$..bgp_router_ip_list[0]')[0];
                        	configip = ifNull(jsonPath(ctrlNodeData,'$..ConfigData..bgp_router_parameters.address')[0],'-');
                        	if(ip != configip){
                        		ip = "<span class='text-error' title='Config IP mismatch'>"+ ip +"</span>"
                        	}
                        } catch(e){}
                        nodeIp = ip;
                        return ip;
                    })()},
                    {lbl:'Status', value:(function(){
                        return getNodeUpTime(ctrlNodeData);
                    })()},
                    {lbl:'Config Node', value:(function(){
                    	var cnfNode = '';
                    	try{
	                    	var url = ctrlNodeData.BgpRouterState.ifmap_info.url;
	                    	var pos = url.indexOf(':8443');
	                        var tempUrl = url.substr(0, pos);
	                        pos = tempUrl.indexOf('https://');
	                        cnfNode = tempUrl.slice(pos + 8) ;
	                        var status = ctrlNodeData.BgpRouterState.ifmap_info.connection_status;
	                        cnfNode = cnfNode.concat( ' (' + status + ')');
                    	}catch (e){}
                        return ifNull(cnfNode,noDataStr);
                    })()},
                    {lbl:'Analytics Node', value:(function(){
                    	var anlNode = noDataStr; 
                    	var secondaryAnlNode, status;
                    	try{
                    		//anlNode = ifNull(computeNodeData.VrouterAgent.collector,noDataStr);
                    		anlNode = jsonPath(ctrlNodeData,"$..ModuleClientState..primary")[0].split(':')[0];
                    		status = jsonPath(ctrlNodeData,"$..ModuleClientState..status")[0];
                    		secondaryAnlNode = jsonPath(ctrlNodeData,"$..ModuleClientState..secondary")[0].split(':')[0];
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
                    //TODO{lbl:'Config Messages', value:ctrlNodeData['configMessagesIn'] + ' In, ' + ctrlNodeData['configMessagesOut'] + ' Out'},
                    {lbl:'Analytics Messages', value:(function(){
                    	var msgTypeStats;
                    	try{ 
                    		msgTypeStats = ctrlNodeData.ModuleServerState.msg_stats[0].msgtype_stats;
                    	} catch(e) {}
                    	var msgCount = 0;
                    	var msgBytes = 0;
                    	if(msgTypeStats != null ) {
	                    	for(var i=0; i < msgTypeStats.length; i++){
	                    		msgCount += parseInt(msgTypeStats[i].messages); 
	                    		msgBytes += parseInt(msgTypeStats[i].bytes); 
	                    	}
                    	}
                    	return msgCount  + ' [' + formatBytes(msgBytes) + ']';
                    })()},
            		{lbl:'Peers', value:(function(){
            			var totpeers = ifNull(jsonPath(ctrlNodeData,'$..BgpRouterState.num_bgp_peer')[0],0);
            			var uppeers = ifNull(jsonPath(ctrlNodeData,'$..BgpRouterState.num_up_bgp_peer')[0],0);
            			var downpeers = totpeers - uppeers;
            			if (downpeers > 0){
            				downpeers = "<span class='text-error'>"+ downpeers +" Down</span>"
            			} else {
            				downpeers = downpeers + " Down"
            			}
            			return kendo.format('BGP Peers: {0} Total, {1}',totpeers,downpeers);
            		})()},
                    {lbl:'',value:kendo.format('vRouters: {0} Established in Sync',
                        ifNull(jsonPath(ctrlNodeData,'$..BgpRouterState.num_up_xmpp_peer')[0],0))},
                    {lbl:'CPU', value:(function(){
                    	try{
                    	 return ifNull(parseFloat(ctrlNodeData.BgpRouterState.cpu_info.cpu_share),noDataStr) + ' %';
                    	}catch(e){ return '--';}
                    })()},
                    {lbl:'Memory', value:(function(){
                    	try{
                    		return ifNull(formatBytes(ctrlNodeData.BgpRouterState.cpu_info.meminfo.virt*1024),noDataStr);
                    	}catch(e){ return '--';}
                    })()},
                    {lbl:'Last Log', value: (function(){
                    	var lmsg;
                		try {
                			lmsg = ctrlNodeData.ModuleServerState.msg_stats[0].log_level_stats[0].last_msg_timestamp;
                		} catch(err){}
                		if(lmsg != null){
	                        var d = new Date(parseInt(ctrlNodeData.ModuleServerState.msg_stats[0].log_level_stats[0].last_msg_timestamp)/1000);
	                        return d.toLocaleString()	;
                		}})()}
                ]
                var cores=getCores(ctrlNodeData);
                for(var i=0;i<cores.length;i++)
                	ctrlNodeDashboardInfo.push(cores[i]);
                //showProgressMask('#controlnode-dashboard');
                $('#controlnode-dashboard').html(dashboardTemplate({title:'Control Node',colCount:2, d:ctrlNodeDashboardInfo, nodeData:ctrlNodeData, showSettings:true, ip:nodeIp}));
                $('#linkIntrospect').click(function(){
            		window.open('http://'+obj['ip']+':8083/', '_blank');
            	});
                $('#linkStatus').on('click', function(){
                	showStatus(nodeIp);
                });
                initWidget4Id('#dashboard-box');
                initWidget4Id('#control-chart-box');
            }).fail(displayAjaxError.bind(null, $('#controlnode-dashboard')));
        $('#control-chart').initMemCPULineChart($.extend({url:function() {
            return '/api/tenant/networking/flow-series/cpu?moduleId=ControlNode&minsSince=30&sampleCnt=10&source=' + ctrlNodeInfo['name'];
        }, parser: "parseProcessMemCPUData", plotOnLoad: true, showWidgetIds: [], hideWidgetIds: [], titles: {memTitle:'Memory (in MB)',cpuTitle:'% CPU Utilization'}}),110);
    }

    this.populateControlNode = function (obj) {
        //Render the view only if URL HashParam doesn't match with this view
        var tabs = ['details', 'console', 'peers', 'routes', 'servicechaining'];

        //Implies that we are already in control node details page
        if (!isInitialized('#control_tabstrip')) {
            var ctrlNodeTemplate = kendo.template($("#controlnode-template").html());
            $(pageContainer).html(ctrlNodeTemplate(ctrlNodeInfo));

            kendo.init($('#formRoutes'));
            kendo.bind($('#formRoutes'), routesViewModel);

            //Set the height of all tabstrip containers to viewheight - tabstrip
            var tabContHeight = layoutHandler.getViewHeight() - 42;
            //$('#control_tabstrip > div').height(tabContHeight);

            ctrlNodeTabStrip = $("#control_tabstrip").kendoTabStrip({
                //height:"300px",
                animation:{
                    open:{
                        effects:"fadeIn"
                    }
                },
                select:function (e) {
                    infraMonitorView.clearTimers();
                    var selTab = $(e.item).text();
                    if (selTab == 'Peers') {
                        populatePeersTab(ctrlNodeInfo);
                    } else if (selTab == 'Routes') {
                        populateRoutesTab(ctrlNodeInfo);
                    } else if (selTab == 'Console') {
                        infraMonitorView.populateMessagesTab('control', {source:ctrlNodeInfo['name']}, ctrlNodeInfo);
                    } else if (selTab == 'Details') {
                        populateDetailsTab(ctrlNodeInfo);
                    } else if (selTab == 'Service Chaining') {
                        populateServiceChainingTab(ctrlNodeInfo);
                    }
                }
            }).data('kendoTabStrip');
        }
        var tabIdx = $.inArray(obj['tab'], tabs);
        if (tabIdx == -1)
            tabIdx = 0;
        //If any tab is stored in URL,select it else select the first tab
        selectKendoTab(ctrlNodeTabStrip,tabIdx);
    }
}

ctrlNodesView = new controlNodesView();
ctrlNodeView = new controlNodeView();
