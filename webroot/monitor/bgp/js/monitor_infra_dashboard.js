/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var infraNodesTree;
var noDataStr = '-';
function infraMonitorClass() {
    var self = this;
    var xhrObjects = [];
    var isLoaded = 0;
    self.bgpPeerDeferredObj = $.Deferred();
    self.consoleTimer = [];
    self.downNodeCnt = {vRouter:0,controlNode:0,configNode:0,analyticNode:0};
    //Present either in config or UVE but not both
    self.transitNodeCnt = {vRouter:0,controlNode:0,configNode:0,analyticNode:0};
    self.tabsLoaded = {vRouter:0,controlNode:0,configNode:0,analyticNode:0}
    var infraViewModel; 
    var dashboardDataObj = kendo.observable({
        'ctrlNodesData' :[],
        'vRoutersData'  :[],
        'analyticNodesData':[],
        'configNodesData':[]
    });

    this.initInfraViewModel = function() {
        infraViewModel = kendo.observable({
            vRouterCnt:function() { return this.get('vRouterUpCnt') === '' ? '' : this.get('vRouterUpCnt') + this.get('vRouterDownCnt');},
            ctrlNodeCnt:function() { return this.get('ctrlNodeUpCnt') === '' ? '' : this.get('ctrlNodeUpCnt') + this.get('ctrlNodeDownCnt');},
            analyticNodeCnt:function() { return this.get('analyticNodeUpCnt') === '' ? '' : this.get('analyticNodeUpCnt') + this.get('analyticNodeDownCnt');},
            configNodeCnt:function() { return this.get('configNodeUpCnt') === '' ? '' : this.get('configNodeUpCnt') + this.get('configNodeDownCnt');},
            vRouterUpCnt:'',
            analyticNodeUpCnt:'',
            ctrlNodeUpCnt:'',
            configNodeUpCnt:'',
            vRouterDownCnt:0,
            analyticNodeDownCnt:0,
            ctrlNodeDownCnt:0,
            configNodeDownCnt:0
        });
        infraViewModel.bind('change',function(e) {
            //Fields that need to be shown only when non-zero
            //Show only if down node count is > 0
            var fields = ['vRouterDownCnt','analyticNodeDownCnt','ctrlNodeDownCnt','configNodeDownCnt'];
            if($.inArray(e.field,fields) > -1)
                if(this.get(e.field) > 0) 
                    $('[data-bind="text:' + e.field + '"]').show();
                else
                    $('[data-bind="text:"' + e.field + '"]').hide();
        });
    }

    this.onWindowResize = function () {

    }

    this.destroy = function () {
        //Cancel the pending ajax calls

    }

    this.updatevRouterDashboard = function(deferredObj) {
        if(infraMonitorView.tabsLoaded['vRouter'] == 0) {
            infraMonitorView.tabsLoaded['vRouter'] = 1;
            deferredObj.done(function(response) {
                var data = dashboardDataObj.get('vRoutersData');
                var instBuckets,vnBuckets,intfBuckets;
                var vnCount=0,intfCnt=0,instCnt=0,vns=[];
                var vRouterCF = crossfilter(data.toJSON());
                $.each(data,function(idx,obj) {
                    intfCnt += obj['intfCnt'];
                    instCnt += obj['instCnt'];
                    $.each(obj['vns'],function(idx,val) {
                        if($.inArray(val,vns) == -1)
                            vns.push(val);
                    });
                });
                vnCnt = vns.length;
                vnBuckets = bucketizeCFData(vRouterCF,function(d) { return d.vnCnt});
                instBuckets = bucketizeCFData(vRouterCF,function(d) { return d.instCnt});
                intfBuckets = bucketizeCFData(vRouterCF,function(d) { return d.intfCnt});
                chartsData = [{title:'Instances',dataSource:{data:instBuckets['data']},tooltipTemplate:
                        '#= (value <= ' + instBuckets['zeroValue'] + ') ? 0 : value # vRouters with #= dataItem.name # instances',chartType:'sparkLine'},
                    {title:'Interfaces',dataSource:{data:intfBuckets['data']},chartType:'sparkLine',tooltipTemplate:
                        '#= (value <= ' + intfBuckets['zeroValue'] + ') ? 0 : value # vRouters with #= dataItem.name # interfaces'},
                    {title:'VNs',dataSource:{data:vnBuckets['data']},chartType:'sparkLine',tooltipTemplate:
                        '#= (value <= ' + vnBuckets['zeroValue'] + ') ? 0 : value # vRouters with #= dataItem.name # networks'}];

                var sparkLineTemplate  = kendo.template($('#sparkline-template').html());
                var instElem = $('<div></div>').html(sparkLineTemplate({title:'Instances',totalCnt:instCnt,id:'infobox-vRouter'})); 
                var intfElem = $('<div></div>').html(sparkLineTemplate({title:'Interfaces',totalCnt:intfCnt,id:'infobox-ctrlNode'})); 
                var vnElem = $('<div></div>').html(sparkLineTemplate({title:'VNs',totalCnt:vnCnt,id:'infobox-analyticsNode'})); 
                $(instElem).find('.sparkline').initSparkLineChart(chartsData[0]);
                $(intfElem).find('.sparkline').initSparkLineChart(chartsData[1]);
                $(vnElem).find('.sparkline').initSparkLineChart(chartsData[2]);
                $('#sparkLineStats').html('');
                $('#sparkLineStats').append(instElem,intfElem,vnElem);
            });

            $('#vrouterStats-header').initWidgetHeader({title:'vRouters',link:{hashParams:{p:'mon_infra_dashboard',q:{node:'vRouters'}}}});
            initDeferred({deferredObj:deferredObj,renderFn:'initScatterChart',selector:$('#vrouter-bubble'),parseFn:function(response) {
                return {title:'vRouters',d:[{key:'vRouters',values:dashboardDataObj.get('vRoutersData').toJSON()}]};
            }});
        } else {
            if($('#vrouter-bubble').data('chart') != null)
                $('#vrouter-bubble').data('chart').update();
        }
    }

    this.getLogs = function(deferredObj) {
        var retArr = [];
        $.ajax({
            url:'/api/admin/reports/query?where=&filters=&level=4&fromTimeUTC=' + new Date(new XDate().addMinutes(-10)).getTime() + 
                '&toTimeUTC=' + (new Date()).getTime()   + '&table=MessageTable&async=false&take=500&skip=0&page=1&pageSize=500'
        }).done(function(result) {
            retArr = $.map(result['data'],function(obj,idx) {
                obj['message'] = formatXML2JSON(obj['Xmlmessage']);
                obj['timeStr'] = diffDates(new XDate(obj['MessageTS']/1000),new XDate());
                if(obj['Source'] == null)
                    obj['moduleId'] = kendo.format('{0}',obj['ModuleId']);
                else
                    obj['moduleId'] = kendo.format('{0} ({1})',obj['ModuleId'],obj['Source']);
                return obj;
            });
            deferredObj.resolve(retArr);
        }).fail(function(result) {
            deferredObj.resolve(retArr);
        });
    }

    this.updatectrlNodeDashboard = function(deferredObj) {
        if(infraMonitorView.tabsLoaded['controlNode'] == 0) {
            infraMonitorView.tabsLoaded['controlNode'] == 1;
            $('#ctrlNodeStats-header').initWidgetHeader({title:'Control Nodes',link:{hashParams:{p:'mon_infra_control',q:{node:'Control Nodes'}}}});
            initDeferred({deferredObj:deferredObj,renderFn:'initScatterChart',selector:$('#ctrlNode-bubble'),parseFn:function(response) {
                return {title:'Control Nodes',d:[{key:'Control Nodes',values:dashboardDataObj.get('ctrlNodesData').toJSON()}]};
            }});
        } else {
            if($('#ctrlNode-bubble').data('chart') != null) 
                $('#ctrlNode-bubble').data('chart').update();
        }
    }
    this.updateconfigNodeDashboard = function(deferredObj) {
        if(infraMonitorView.tabsLoaded['configNode'] == 0) {
            infraMonitorView.tabsLoaded['configNode'] == 1;
            $('#configNodeStats-header').initWidgetHeader({title:'Config Nodes',link:{hashParams:{p:'mon_infra_config',q:{node:'Config Nodes'}}}});
            initDeferred({deferredObj:deferredObj,renderFn:'initScatterChart',selector:$('#configNode-bubble'),parseFn:function(response) {
                return {title:'Config Nodes',d:[{key:'Config Nodes',values:dashboardDataObj.get('configNodesData').toJSON()}]};
            }});
        } else {
            if($('#configNode-bubble').data('chart') != null)
                $('#configNode-bubble').data('chart').update();
        }
    }

    this.updateanalyticNodeDashboard = function(deferredObj) {
        if(infraMonitorView.tabsLoaded['analyticNode'] == 0) {
            infraMonitorView.tabsLoaded['analyticNode'] == 1;
            $('#analyticNodeStats-header').initWidgetHeader({title:'Analytics Nodes',link:{hashParams:{p:'mon_infra_analytics',q:{node:'Analytics Nodes'}}}});
            initDeferred({deferredObj:deferredObj,renderFn:'initScatterChart',selector:$('#analyticNode-bubble'),parseFn:function(response) {
                return {title:'Analytic Nodes',d:[{key:'Analytics Nodes',values:dashboardDataObj.get('analyticNodesData').toJSON()}]};
            }});
        } else {
            if($('#analyticNode-bubble').data('chart') != null)
                $('#analyticNode-bubble').data('chart').update();
        }
    }

    this.clearTimers = function () {
        $.each(self.consoleTimer, function (idx, value) {
            logMessage("clearing timer:", value);
            clearTimeout(value)
        });
        self.consoleTimer = [];
    }

    //Select the appropriate node in the tree and trigger the corresponding handler
    this.loadViewFromNode = function (hashObj) {
        //Initialize the details view if coming from dashboard
        if(hashObj == '') {
            hashObj = {};
            hashObj['node'] = 'Control Nodes';
        }
        if (hashObj['node'].indexOf('Control Nodes:') == 0) {
            var dataItem = selTreeNode({tree:infraNodesTree, fqName:hashObj['node'], trigger:false});
            ctrlNodeView.load({name:hashObj['node'].split(':')[1], ip:hashObj['ip'],tab:hashObj['tab']});
        } else if (hashObj['node'].indexOf('vRouters:') == 0) {
            var dataItem = selTreeNode({tree:infraNodesTree, fqName:hashObj['node'], trigger:false});
            if(dataItem != false)
                cmpNodeView.load({name:hashObj['node'].split(':')[1], ip:hashObj['ip'], uuid:hashObj['uuid'], tab:hashObj['tab'], filters:hashObj['filters']});
        } else if (hashObj['node'].indexOf('Analytics Nodes:') == 0) {
            var dataItem = selTreeNode({tree:infraNodesTree, fqName:hashObj['node'], trigger:false});
            if(dataItem != false)
                aNodeView.load({name:hashObj['node'].split(':')[1], ip:hashObj['ip'], uuid:hashObj['uuid'], tab:hashObj['tab']});
        } else if (hashObj['node'].indexOf('Config Nodes:') == 0) {
            var dataItem = selTreeNode({tree:infraNodesTree, fqName:hashObj['node'], trigger:false});
            if(dataItem != false)
                confNodeView.load({name:hashObj['node'].split(':')[1], ip:hashObj['ip'], uuid:hashObj['uuid'], tab:hashObj['tab']});
        } else {
            selTreeNode({tree:infraNodesTree, fqName:hashObj['node'], expand:true,trigger:false});
            if(hashObj['node'] == 'vRouters')
                cmpNodesView.load();
            else if(hashObj['node'] == 'Analytics Nodes')
                aNodesView.load();
            else if(hashObj['node'] == 'Config Nodes')
                confNodesView.load();
            else
                ctrlNodesView.load();
        }
    }

    this.updateViewByHash = function (hashObj, lastHashObj) {
        //If no current state,load dashboard 
        if((hashObj == null) || hashObj['node'] == null || (getKeyCnt(hashObj) == 0))  {
            self.load({hashParams:hashObj});
        } else if ((hashObj != null) && (hashObj != '')) {
            self.loadViewFromNode(hashObj);
        }
    }

    function loadInfoBoxes(hashParams) {
        var infoBoxTemplate  = kendo.template($('#infobox-template').html());
        var VROUTER_IDX = 0,CTRLNODE_IDX = 1,ANALYTICNODE_IDX = 2,CONFIGNODE_IDX = 3;
        var TOTAL_FIELD_IDX = 0, ACTIVE_FIELD_IDX = 1,INACTIVE_FIELD_IDX = 2;
        var dashboardConfig = [{
                title:'vRouters',
                dataFields: ['vRouterCnt','vRouterUpCnt','vRouterDownCnt'],
                renderFn:'updatevRouterDashboard',
                getFn:'getvRoutersDashboardData'
            },{
                title:'Control Nodes',
                dataFields:['ctrlNodeCnt','ctrlNodeUpCnt','ctrlNodeDownCnt'],
                renderFn:'updatectrlNodeDashboard',
                getFn:'getControlNodesDashboardData'
            },{
                title:'Analytics Nodes',
                dataFields:['analyticNodeCnt','analyticNodeUpCnt','analyticNodeDownCnt'],
                renderFn:'updateanalyticNodeDashboard',
                getFn:'getAnalyticsNodesDashboardData'

            },{
                title:'Config Nodes',
                dataFields:['configNodeCnt','configNodeUpCnt','configNodeDownCnt'],
                renderFn:'updateconfigNodeDashboard',
                getFn:'getConfigNodesDashboardData'
            }];
        var deferredObjs = [];
        $.each(dashboardConfig,function(idx,obj) {
            $('#topStats').append(infoBoxTemplate({title:obj['title'],totalCntField:obj['dataFields'][TOTAL_FIELD_IDX],
                activeCntField:obj['dataFields'][ACTIVE_FIELD_IDX],inactiveCntField:obj['dataFields'][INACTIVE_FIELD_IDX]})); 
            //Select the first infobox
            if(idx == 0) {
                $('#topStats div:first').addClass('infobox-blue infobox-dark active');
                $('#topStats div:first').removeClass('infobox-grey');
            }
            //Issue calls to fetch data
            deferredObjs.push($.Deferred());
            infraMonitorView[obj['getFn']](deferredObjs[idx]);
        });
        //Reset infraViewModel
        kendo.bind($('#topStats'),infraViewModel);

        var tabs = ['vRouter','ControlNode','AnalyticNode','ConfigNode'];
        $('.infobox-container').on('click','.infobox',function() {
            var tabIdx = $(this).index();
            var renderFns = ['updatevRouterDashboard','updatectrlNodeDashboard','updateanalyticNodeDashboard','updateconfigNodeDashboard']
            var bubbleCharts = ['vrouter-bubble','ctrlNode-bubble','analyticNode-bubble','configNode-bubble'];
            layoutHandler.setURLHashParams({tab:tabs[tabIdx]},{triggerHashChange:false});
            if(tabIdx >= 0) {
                infraMonitorView[renderFns[tabIdx]](deferredObjs[tabIdx]);
            }
            //Hide all tab contents
            $('#dashboard-charts .dashboard-chart-item').hide();
            $('.infobox').removeClass('infobox-blue infobox-dark active').addClass('infobox-grey');
            $($('.infobox')[tabIdx]).removeClass('infobox-grey').addClass('infobox-blue infobox-dark active');
            $($('#dashboard-charts .dashboard-chart-item')[tabIdx]).show();
            if($('#' + bubbleCharts[tabIdx]).data('chart') != null)
                $('#' + bubbleCharts[tabIdx]).data('chart').update();
        });
        //Select node tab based on URL hash parameter
        var tabIdx = $.inArray(ifNull(hashParams['tab']),tabs);
        if(tabIdx <= -1)
            tabIdx = 0;
        $($('.infobox-container .infobox')[tabIdx]).trigger('click');
        $.when.apply(window,deferredObjs).done(
            function(ctrlNodeData,analyticsData,configData,vRouterData) {
                //Initialize dashboard stats
                var logListTemplate = kendo.template($("#logList-template").html());
                var logDeferredObj = $.Deferred();
                infraMonitorView.getLogs(logDeferredObj);
                logDeferredObj.done(function(data) {
                    $('#logs-box .widget-main').empty().html(logListTemplate(data.reverse()));
                });

                var infoListTemplate = kendo.template($("#infoList-template").html());
                var alertTemplate=kendo.template($("#alerts-template").html());
                var dashboardDataArr = [];
                var dashboardData = dashboardDataObj.toJSON();
                var nodeAlerts=self.processAlerts(dashboardDataObj);
                //dashboardData.nodeAlerts=nodeAlerts;
                //var alerts=constructAlerts(dashboardData);
                var alerts_fatal=[],alerts_stop=[],alerts_nodes=[];
                var nodes = ['ctrlNodesData','vRoutersData','analyticNodesData','configNodesData'];
                $.each(nodes,function(idx,value) {
                    dashboardDataArr = dashboardDataArr.concat(dashboardDataObj.get(value).toJSON());
                    for(var i=0;i<dashboardData[value].length;i++) {
                    	if(dashboardData[value][i]['alerts']!=undefined) {
                    		for(var j=0;j<dashboardData[value][i]['alerts'].length;j++){
                    			if(dashboardData[value][i]['alerts'][j]['type']=='fatal')
                    				alerts_fatal.push(dashboardData[value][i]['alerts'][j]);
                    			else if (dashboardData[value][i]['alerts'][j]['type']=='stopped')
                    			    alerts_stop.push(dashboardData[value][i]['alerts'][j]);}
                    	}
                    }
                });
                for(var i=0;i<nodeAlerts.length;i++){
                	alerts_nodes.push({nName:nodeAlerts[i]['name'],pName:nodeAlerts[i]['type'],timeStamp:'-',msg:nodeAlerts[i]['msg'],type:'nodeAlerts'});
                }
                alerts_fatal.sort(function(a,b){return b.timeStamp-a.timeStamp;})
                alerts_stop.sort(function(a,b){return b.timeStamp-a.timeStamp;})
                alerts=alerts_fatal.concat(alerts_stop);
                alerts=alerts.concat(alerts_nodes);
                $('#header ul li.nav-header').text(alerts.length+' New Alerts');
                for(var i=0;i<alerts.length;i++){
                	alerts[i]['timeStamp']=getFormattedDate(alerts[i]['timeStamp']/1000);//Time in response is microsecs 
                }
                var dashboardCF = crossfilter(dashboardDataArr);
                var nameDimension = dashboardCF.dimension(function(d) { return d.name });
                var verDimension = dashboardCF.dimension(function(d) { return d.version });
                var verGroup = verDimension.group();
                var verArr = [];
                var systemCnt = nameDimension.group().all().length;
                var infoData = [{lbl:'No of servers',value:systemCnt}];
                //Distinct Versions
                if(verGroup.all().length > 1) {
                    //verArr = verGroup.order(function(d) { return d.value;}).top(2);
                    verArr = verGroup.top(Infinity);
                    var unknownVerInfo = [];
                    $.each(verArr,function(idx,value) {
                        if(verArr[idx]['key'] == '' || verArr[idx]['key'] ==  '-')
                           unknownVerInfo.push({lbl:'Logical nodes with version unknown',value:verArr[idx]['value']}) ;
                        else
                            infoData.push({lbl:'Logical nodes with version ' + verArr[idx]['key'],value:verArr[idx]['value']});
                    });
                    if(unknownVerInfo.length > 0)
                        infoData = infoData.concat(unknownVerInfo);
                } else if(verGroup.all().length == 1)
                    infoData.push({lbl:'version',value:verGroup.all()[0]['key']});
                $('#system-info-stat').html(infoListTemplate(infoData));
                //$("#alerts-box-content").data('alerts',alerts);
                $("#sidebar").data('alerts',alerts);
                $("#sidebar").data('alert_exists',false);
                if(alerts.length>0)
                	$("#sidebar").data('alert_exists',true);
                $('#alerts-box-content').html(alertTemplate(alerts));
            });
    }

    //Construct Alerts looping through all nodes
    this.processAlerts = function(data) {
        var alertsList = [];
        $.each(data.get('vRoutersData'),function(idx,obj) {
            var infoObj = {name:obj['name'],type:'vRouter',ip:obj['ip']};
            if(obj['isUveMissing'] == true)
                alertsList.push($.extend({},{msg:"doesn't exist in opserver"},infoObj));
            if(obj['isConfigMissing'] == true)
                alertsList.push($.extend({},{msg:"doesn't exist in api server"},infoObj));
            if(obj['xmppPeerDownCnt'] == 1)
                alertsList.push($.extend({},{msg:kendo.format('{0} XMPP Peer down',obj['xmppPeerDownCnt'])},infoObj));
            else if(obj['xmppPeerDownCnt'] > 1)
                alertsList.push($.extend({},{msg:kendo.format('{0} XMPP Peers down',obj['xmppPeerDownCnt'])},infoObj));
        });
        $.each(data.get('ctrlNodesData'),function(idx,obj) {
            var downPeerCnt = obj['totalBgpPeerCnt'] - obj['upBgpPeerCnt'];
            var infoObj = {name:obj['name'],type:'Control Node',ip:obj['ip']};
            if(obj['isUveMissing'] == true)
                alertsList.push($.extend({},{msg:"doesn't exist in opserver"},infoObj));
            if(obj['isConfigMissing'] == true)
                alertsList.push($.extend({},{msg:"doesn't exist in api server"},infoObj));
            if(downPeerCnt == 1)
                alertsList.push($.extend({},{msg:kendo.format('{0} BGP Peer down',downPeerCnt)},infoObj));
            else if(downPeerCnt > 1)
                alertsList.push($.extend({},{msg:kendo.format('{0} BGP Peers down',downPeerCnt)},infoObj));
        });
        return alertsList;
    }

    this.load = function (obj) {
        var hashParams = ifNull(obj['hashParams'],{});
        infraMonitorView.initInfraViewModel();
        if(hashParams['node'] != null) {
            var infraMonitorTemplate = kendo.template($("#bgp-monitor-template").html());
            $(contentContainer).html('');
            $(contentContainer).html(infraMonitorTemplate);

            self.nodeTree = $('#splitter').kendoSplitter({
                panes:[
                    { resizable:true, size:'200px'},
                    {resizable:true}
                ]
            }).data('kendoSplitter');

            infraMonitorView.loadViewFromNode(hashParams);
        } else {    //Load Dashboard
            infraMonitorView['tabsLoaded'] = {vRouter:0,controlNode:0,configNode:0,analyticNode:0};
            var infraDashboardTemplate = kendo.template($('#infra-dashboard').html());
            $(contentContainer).html('');
            $(contentContainer).html(infraDashboardTemplate);

            loadInfoBoxes(hashParams);
            
            //Initialize the common stuff
            $($('#dashboard-stats .widget-header')[0]).initWidgetHeader({title:'Logs'});
            $($('#dashboard-stats .widget-header')[1]).initWidgetHeader({title:'System Information'});
            $($('#dashboard-stats .widget-header')[2]).initWidgetHeader({title:'Alerts'});
        }
    }

    this.parsevRoutersDashboardData = function(result) {
        var retArr = [];
        //Reset the counter
        infraMonitorView.downNodeCnt['vRouter'] = 0;
        infraMonitorView.transitNodeCnt['vRouter'] = 0;
        $.each(result,function(idx,d) {
            if(d['nodeStatus'] == 'Down')
                infraMonitorView.downNodeCnt['vRouter']++;
            var obj = {};
            obj['nodeState'] = d['nodeStatus'];
            obj['x'] = parseFloat(ifNull(jsonPath(d,'$..cpu_info.cpu_share')[0],'--'));
            obj['y'] = parseInt(ifNull(jsonPath(d,'$..meminfo.virt')[0],'--'))/1024; //Convert to MB
            obj['cpu'] = $.isNumeric(obj['x']) ? obj['x'].toFixed(2) : '-';
            obj['histCpuArr'] = parseUveHistoricalValues(d,'$..cpu_share[*].history-10');
            obj['ip'] = ifNull(jsonPath(d,'$..VrouterAgent..control_ip')[0],'-');
            obj['uveIP'] = ifNull(jsonPath(d,'$..VrouterAgent..control_ip')[0],'-');
            obj['isConfigMissing'] = $.isEmptyObject(jsonPath(d,'$..ConfigData')[0]) ? true : false;
            //nodeStatus is down and is present in Config server implies that it's missing in UVE
            obj['isUveMissing'] = (d['nodeStatus'] == 'Down') && (obj['isConfigMissing'] == false);
            obj['configIP'] = ifNull(jsonPath(d,'$..ConfigData..virtual_router_ip_address')[0],'-');
            /*if(obj['configIP'] != '-'){
            	obj['ip'] = obj['configIP'];
            } else {
            	obj['ip'] = ifNull(jsonPath(d,'$..self_ip_list[0]')[0],'-');
            }*/
            obj['memory'] = formatMemory(ifNull(jsonPath(d,'$..meminfo')[0],'--'));
            obj['size'] = ifNull(jsonPath(d,'$..phy_if_1min_usage[0]["out_bandwidth_usage"]')[0],0) + ifNull(jsonPath(d,'$..phy_if_1min_usage[0]["in_bandwidth_usage"]')[0],0) + 1;
            obj['shape'] = 'circle';

            var xmppPeers = ifNull(jsonPath(d,'$..xmpp_peer_list')[0],[]);
            obj['xmppPeerDownCnt'] = 0;
            $.each(xmppPeers,function(idx,currPeer) {
                if(currPeer['status'] != true) {
                    obj['xmppPeerDownCnt']++;
                    //return false;
                }
            });

            obj['name'] = d['name'];
            obj['instCnt'] = ifNull(jsonPath(d,'$..virtual_machine_list')[0],[]).length;
            obj['intfCnt'] = ifNull(jsonPath(d,'$..interface_list')[0],[]).length;
            obj['errorIntfCnt'] = ifNull(jsonPath(d,'$..error_intf_list')[0],[]).length;
            if(obj['errorIntfCnt'] > 0){
            	obj['errorIntfCntText'] = "<span class='text-error'>" + obj['errorIntfCnt'] + " Down</span>";
            } else {
            	obj['errorIntfCntText'] = obj['errorIntfCnt'] + " Down";
            } 
            obj['vns'] = ifNull(jsonPath(d,'$..connected_networks')[0],[]);
            obj['vnCnt'] = ifNull(jsonPath(d,'$..connected_networks')[0],[]).length;
            obj['version'] = ifEmpty(getNodeVersion(d),'-');
            //System CPU
            //obj['cpu'] = parseFloat(jsonPath(d,'$..CpuLoadInfo.CpuLoadAvg.one_min_avg')[0]);
            obj['type'] = 'vRouter';
            obj['status'] = getNodeUpTime(d);
            //Decide color based on parameters
            obj['color'] = getvRouterColor(d,obj);
            obj['hostNameColor'] = 'blue';
            if(d['nodeStatus'] != 'Up'){
                obj['color'] = 'red';
                obj['hostNameColor'] = 'red';
            }
            obj['alerts']=getAlerts(d);
            retArr.push(obj);
        });
        infraViewModel.set('vRouterDownCnt',infraMonitorView.downNodeCnt['vRouter']);
        infraViewModel.set('vRouterUpCnt',retArr.length-infraMonitorView.downNodeCnt['vRouter']);
        return retArr;
    }

    function getvRouterColor(d,obj) {
        obj = ifNull(obj,{});
        var netIntfCnt = obj['intfCnt'] - obj['errorIntfCnt'];
        var instCnt = obj['instCnt'];
        if(d['nodeStatus'] == 'Down')
            return d3Colors['red'];
        if(obj['xmppPeerDownCnt'] > 0)
            return d3Colors['red'];
        if(obj['errorIntfCnt'] > 0)
            return d3Colors['orange'];
        if(instCnt == 0)
            return d3Colors['blue'];
        else if(instCnt > 0)
            return d3Colors['green'];
    }

    function getControlNodeColor(d,obj) {
        obj= ifNull(obj,{});
        var downPeerCnt = obj['totalBgpPeerCnt'] - obj['upBgpPeerCnt'];
        if(d['nodeStatus'] == 'Down')
            return d3Colors['red'];
        //If 0 bgp peers,show in blue
        if(obj['totalBgpPeerCnt'] == 0)
            return d3Colors['blue'];
        else if(downPeerCnt > 0)
            return d3Colors['red'];
        else if(downPeerCnt == 0)
            return d3Colors['green'];
    }
    this.parseControlNodesDashboardData = function(result) {
        var retArr = [];
        //Reset the counter
        infraMonitorView.downNodeCnt['controlNode'] = 0;
        infraMonitorView.transitNodeCnt['controlNode'] = 0;
        $.each(result,function(idx,d) {
            if(d['nodeStatus'] == 'Down')
                infraMonitorView.downNodeCnt['controlNode']++;

            var obj = {};
            obj['x'] = parseFloat(jsonPath(d,'$..cpu_info.cpu_share')[0]);
            obj['y'] = parseInt(jsonPath(d,'$..meminfo.virt')[0])/1024; //Convert to MB
            obj['cpu'] = $.isNumeric(obj['x']) ? obj['x'].toFixed(2) : '-';
            obj['histCpuArr'] = parseUveHistoricalValues(d,'$..cpu_share[*].history-10');
            obj['uveIP'] = jsonPath(d,'$..bgp_router_ip_list[0]')[0];
            obj['configIP'] = ifNull(jsonPath(d,'$..ConfigData..bgp_router_parameters.address')[0],'-');
            obj['isConfigMissing'] = $.isEmptyObject(jsonPath(d,'$..ConfigData')[0]) ? true : false;
            //nodeStatus is down and is present in Config server implies that it's missing in UVE
            obj['isUveMissing'] = (d['nodeStatus'] == 'Down') && (obj['isConfigMissing'] == false);
            if(obj['configIP'] != '-'){
            	obj['ip'] = obj['configIP'];
            } else {
            	obj['ip'] = jsonPath(d,'$..bgp_router_ip_list[0]')[0];
            }
            obj['memory'] = formatMemory(ifNull(jsonPath(d,'$..meminfo')[0]),'--');
            obj['size'] = ifNull(jsonPath(d,'$..output_queue_depth')[0],0)+1; 
            obj['shape'] = 'circle';
            obj['name'] = d['name'];
            obj['version'] = ifEmpty(getNodeVersion(d),'-');
            obj['totalPeerCount'] = ifNull(jsonPath(d,'$..num_bgp_peer')[0],0) + ifNull(jsonPath(d,'$..num_xmpp_peer')[0],0);
            obj['totalBgpPeerCnt'] = ifNull(jsonPath(d,'$..num_bgp_peer')[0],0);
            obj['upBgpPeerCnt'] = ifNull(jsonPath(d,'$..num_up_bgp_peer')[0],0);
            obj['downBgpPeerCnt'] = obj['totalBgpPeerCnt'] - obj['upBgpPeerCnt'];
            if(obj['downBgpPeerCnt'] > 0){
            	obj['downBgpPeerCntText'] = "<span class='text-error'>" + obj['downBgpPeerCnt'] + " Down</span>";
            } else {
            	obj['downBgpPeerCntText'] = obj['downBgpPeerCnt'] + " Down";
            }
            obj['establishedPeerCount'] = ifNull(jsonPath(d,'$..num_up_bgp_peer')[0],0);
            obj['activevRouterCount'] = ifNull(jsonPath(d,'$..num_up_xmpp_peer')[0],0);
            obj['upXMPPPeerCnt'] = ifNull(jsonPath(d,'$..num_up_xmpp_peer')[0],0);
            obj['totalXMPPPeerCnt'] = ifNull(jsonPath(d,'$..num_xmpp_peer')[0],0);
            obj['downXMPPPeerCnt'] = obj['totalXMPPPeerCnt'] - obj['upXMPPPeerCnt'];
            if(obj['downXMPPPeerCnt'] > 0){
            	obj['downXMPPPeerCntText'] = "<span class='text-error'>" + obj['downXMPPPeerCnt'] + " Down</span>";
            } else {
            	obj['downXMPPPeerCntText'] = obj['downXMPPPeerCnt'] + " Down";
            }
            //System CPU
            //obj['cpu'] = parseFloat(jsonPath(d,'$..CpuLoadInfo.CpuLoadAvg.one_min_avg')[0]);
            obj['type'] = 'controlNode';
            var upTime = new XDate(jsonPath(d,'$..uptime')[0]/1000);
            var currTime = new XDate();
            obj['status'] = getNodeUpTime(d);
            obj['color'] = getControlNodeColor(d,obj);
            obj['hostNameColor'] = 'blue';
            if(d['nodeStatus'] != 'Up'){
                obj['color'] = d3Colors['red'];
                obj['hostNameColor'] = d3Colors['red'];
            }
            obj['alerts']=getAlerts(d);
            retArr.push(obj);
        });
        infraViewModel.set('ctrlNodeDownCnt',infraMonitorView.downNodeCnt['controlNode']);
        infraViewModel.set('ctrlNodeUpCnt',retArr.length-infraMonitorView.downNodeCnt['controlNode']);
        return retArr;
    }
    this.parseAnalyticNodesDashboardData = function(result) {
        var retArr = [];
        $.each(result,function(idx,d) {
            var obj = {};
            obj['x'] = parseFloat(jsonPath(d,'$..ModuleCpuState.module_cpu_info[?(@.module_id=="Collector")]..cpu_share')[0]);
            obj['y'] = parseInt(jsonPath(d,'$..ModuleCpuState.module_cpu_info[?(@.module_id=="Collector")]..meminfo.virt')[0])/1024;
            obj['cpu'] = $.isNumeric(obj['x']) ? obj['x'].toFixed(2) : obj['x'];
            obj['memory'] = formatBytes(obj['y']*1024*1024);
            obj['histCpuArr'] = parseUveHistoricalValues(d,'$..cpu_share[*].history-10');
            obj['size'] = Math.random();
            obj['size'] = ifNull(jsonPath(d,'$..QueryStats.queries_being_processed')[0],[]).length + 1; 
            obj['size'] = ifNull(jsonPath(d,'$..QueryStats.pending_queries')[0],[]).length + 1; 
            obj['shape'] = 'circle';
            obj['type'] = 'analyticsNode';
            obj['version'] = getNodeVersion(d);
            obj['color'] = Math.floor(Math.random()*5);
            obj['color'] = 4;
            obj['name'] = d['name'];
            obj['alerts']=getAlerts(d);
            retArr.push(obj);
        });
        //infraViewModel.set('analyticNodeDownCnt',infraMonitorView.downNodeCnt['analyticNode']);
        infraViewModel.set('analyticNodeUpCnt',retArr.length);
        return retArr;
    }
    this.parseConfigNodesDashboardData = function(result) {
        var retArr = [];
        $.each(result,function(idx,d) {
            var obj = {};
            obj['x'] = parseFloat(jsonPath(d,'$..ModuleCpuState.module_cpu_info[?(@.module_id=="ApiServer")]..cpu_share')[0]);
            obj['y'] = parseInt(jsonPath(d,'$..ModuleCpuState.module_cpu_info[?(@.module_id=="ApiServer")]..meminfo.virt')[0])/1024;
            obj['cpu'] = $.isNumeric(obj['x']) ? obj['x'].toFixed(2) : obj['x'];
            obj['memory'] = formatBytes(obj['y']*1024*1024);
            obj['size'] = Math.random();
            obj['version'] = getNodeVersion(d);
            obj['shape'] = 'circle';
            obj['type'] = 'configNode';
            obj['color'] = Math.floor(Math.random()*5);
            obj['color'] = 4;
            obj['name'] = d['name'];
            obj['alerts']=getAlerts(d);
            retArr.push(obj);
        });
        //infraViewModel.set('configNodeDownCnt',infraMonitorView.downNodeCnt['configNode']);
        infraViewModel.set('configNodeUpCnt',retArr.length);
        return retArr;
    }
    this.getvRoutersDashboardData = function(deferredObj,isSummaryPage) {
    	var summaryUrl = '/api/admin/monitor/infrastructure/vrouters/summary';
    	if(isSummaryPage){
    		summaryUrl = '/api/admin/monitor/infrastructure/vrouters/summary?addGen';
    	}
        $.ajax({
            url:summaryUrl
        }).done(function(result) {
            dashboardDataObj.set('vRoutersData',infraMonitorView.parsevRoutersDashboardData(result));
            deferredObj.resolve(dashboardDataObj.get('vRoutersData').toJSON());
        });
    }

    this.getControlNodesDashboardData = function(deferredObj) {
        /*$.ajax({
            url:'/api/admin/monitor/infrastructure/controlnode/bgppeer-details'
        }).done(function(result) {
            bgpPeerDeferredObj.resolve(result);
        });*/
        $.ajax({
            url:'/api/admin/monitor/infrastructure/controlnodes/summary'
        }).done(function(result) {
            dashboardDataObj.set('ctrlNodesData',infraMonitorView.parseControlNodesDashboardData(result));
            deferredObj.resolve(dashboardDataObj.get('ctrlNodesData').toJSON());
        });
    }
    this.getAnalyticsNodesDashboardData = function(deferredObj) {
        $.ajax({
            url:'/api/admin/monitor/infrastructure/analyticsnodes/summary'
        	//url:'/res.json'
        }).done(function(result) {
            dashboardDataObj.set('analyticNodesData',infraMonitorView.parseAnalyticNodesDashboardData(result));
            deferredObj.resolve(dashboardDataObj.get('analyticNodesData').toJSON());
        }).fail(function(result) {
            dashboardDataObj.set('analyticNodesData',[]);
            deferredObj.resolve([]);
        });
    }
    this.getConfigNodesDashboardData = function(deferredObj) {
        $.ajax({
            url:'/api/admin/monitor/infrastructure/confignodes/summary'
        }).done(function(result) {
                dashboardDataObj.set('configNodesData',infraMonitorView.parseConfigNodesDashboardData(result));
                deferredObj.resolve(dashboardDataObj.get('configNodesData').toJSON());
        }).fail(function(result) {
                dashboardDataObj.set('configNodesData',[]);
                deferredObj.resolve([]);
        });
    }


    this.setSplitterHeight = function () {
        $('#splitter').height(layoutHandler.getViewHeight());
    }

    this.populateMessagesTab = function (nodeType, options, obj) {
        var consoleTabTemplate = kendo.template($('#console-tab-template').html());
        var cboMsgType, cboMsgCategory, cboMsgLevel, cboTimeRange;
        var lastMsgLogTime, lastLogLevel, userChangedQuery = false, defaultTimeRange = 5 * 60;//5 mins by default
        if (nodeType == 'control') {
            layoutHandler.setURLHashParams({tab:'console', node:kendo.format('Control Nodes:{0}', obj['name'])},{triggerHashChange:false});
            $('#ctrlNodeMessagesTab').html(consoleTabTemplate({}));
        } else if (nodeType == "analytics"){
            layoutHandler.setURLHashParams({tab:'console', node:kendo.format('Analytics Nodes:{0}', obj['name'])},{triggerHashChange:false});
            $('#analyticsNodeMessagesTab').html(consoleTabTemplate({}));
        } else if (nodeType == "config"){
            layoutHandler.setURLHashParams({tab:'console', node:kendo.format('Config Nodes:{0}', obj['name'])},{triggerHashChange:false});
            $('#configNodeMessagesTab').html(consoleTabTemplate({}));
        } else {
            layoutHandler.setURLHashParams({tab:'console', node:kendo.format('vRouters:{0}', obj['name'])},{triggerHashChange:false});
            $('#computeNodeMessagesTab').html(consoleTabTemplate({}));
        }
        initWidget4Id('#console-msgs-box');
        //Disable Auto-refresh for time-being
        //$('#msgAutoRefresh').attr('disabled','disabled');

        var MIN = 60, HOUR = MIN * 60;
        if ($('#msgTimeRange').data('kendoDropDownList') == null) {
            $('#msgAutoRefresh').attr('checked', 'checked');
            $('#msgAutoRefresh').on('click', function () {
                if ($(this).is(':checked')) {
                	if (userChangedQuery)
                		loadLogs();
                	else 
                		fetchLastLogtimeAndCallLoadLogs('',nodeType);
                } else {
                    infraMonitorView.clearTimers();
                }
            });
            $('#msgTimeRange').kendoDropDownList({
                dataSource:[
                    {lbl:'Last 5 mins', value:5 * MIN},
                    {lbl:'Last 10 mins', value:10 * MIN},
                    {lbl:'Last 30 mins', value:30 * MIN},
                    {lbl:'Last 1 hr', value:1 * HOUR},
                    {lbl:'Last 2 hrs', value:2 * HOUR},
                    {lbl:'Last 4 hrs', value:4 * HOUR},
                    {lbl:'Last 6 hrs', value:6 * HOUR},
                    {lbl:'Last 10 hrs', value:10 * HOUR},
                    {lbl:'Last 12 hrs', value:12 * HOUR},
                    {lbl:'Last 18 hrs', value:18 * HOUR},
                    {lbl:'Last 24 hrs', value:24 * HOUR},
                    {lbl:'Custom', value:'custom'}
                ],
                dataTextField:'lbl',
                dataValueField:'value',
                value:'custom',
            });
            var timerangedropdownlist = $("#msgTimeRange").data("kendoDropDownList");
            timerangedropdownlist.bind("change", function(e) {
            	selectTimeRange(timerangedropdownlist.value());
            });
            $("#console-from-time").kendoDateTimePicker({
            	format:"MMM dd, yyyy hh:mm:ss tt",
                min:new Date(2013, 2, 1),
                value:new Date(),
                timeFormat:"hh:mm:ss tt",
                interval:10
            });
            $("#console-to-time").kendoDateTimePicker({
            	format:"MMM dd, yyyy hh:mm:ss tt",
                min:new Date(2013, 2, 1),
                value: new Date(),
                timeFormat:"hh:mm:ss tt",
                interval:10
            });
            $('#msgType').kendoComboBox({
                dataSource:[],
                value:''
            });
            $('#msgCategory').kendoComboBox({
                dataSource:{
                    transport:{
                        read:{
                            url:'/api/admin/table/values/MessageTable/Category'
                        }
                    },
                    schema:{
                        parse:function (response) {
                            if (nodeType == 'control')
                                return ifNull(response['ControlNode'], []);
                            else if (nodeType == 'compute')
                                return ifNull(response['VRouterAgent'], []);
                            else if (nodeType == 'analytics')
                                return ifNull(response['Collector'], []);
                            else if (nodeType == 'config')
                                return ifNull(response['ApiServer'], []);
                        }
                    }
                },
                value:''
            });
            $('#msgLevel').kendoComboBox({
                dataSource:{
                    transport:{
                        read:{
                            url:'/api/admin/table/values/MessageTable/Level'
                        }
                    },
                    schema:{
                        parse:function (response) {
                            var retArr = [];
                            $.map(response, function (value) {
                                $.each(value, function (key, value) {
                                    retArr.push({text:value, value:key});
                                });
                            });
                            return retArr;
                        }
                    }
                },
                dataTextField:'text',
                dataValueField:'value',
                value:'5'
            });
            $('#msgLimit').kendoComboBox({
                dataSource:$.map([10, 50, 100, 200, 500], function (value) {
                    return {value:value, text:kendo.format('Limit {0} messages', value)};
                }),
                dataTextField:'text',
                dataValueField:'value'
            });
        }
        cboTimeRange = $('#msgTimeRange').data('kendoDropDownList');
        cboMsgCategory = $('#msgCategory').data('kendoComboBox');
        cboMsgType = $('#msgType').data('kendoComboBox');
        cboMsgLevel = $('#msgLevel').data('kendoComboBox');
        cboMsgLimit = $('#msgLimit').data('kendoComboBox');
        cboMsgFromTime = $('#console-from-time').data('kendoDateTimePicker');
        cboMsgToTime = $('#console-to-time').data('kendoDateTimePicker');

        cboMsgCategory.input.attr('placeholder', 'All');
        cboMsgType.input.attr('placeholder', 'any');
        cboMsgLevel.input.attr('placeholder', 'SYS_NOTICE');
        cboMsgLimit.input.attr('placeholder', 'No Limit');

        $('#btnDisplayLogs').on('click', function () {
        	collapseWidget('#console-msgs-box');
        	userChangedQuery = true;
        	loadLogs();
        });

        //var gridConsole;
        //To show the latest records
        function moveToLastPage(e) {
            //Process only if grid is visible
            //console.info('console grid dataBound',gridConsole.dataSource._total,gridConsole.dataSource._page);
            //console.info('console grid dataBound',e.response.length,gridConsole.dataSource._page);
            //if($(gridConsole.element).is(':visible')) {
            //console.info('console grid visible',$(gridConsole.element).is(':visible'));
            if (e.response == null)
                return;
            var hashParams = layoutHandler.getURLHashParams();
            if (hashParams['tab'] != null && hashParams['tab'] == 'console') {
                var totalCnt = e.response.length, pageSize = gridConsole.dataSource._pageSize;
                if (totalCnt > 0) {
                    var lastPageNo = Math.ceil(totalCnt / pageSize);
                    setTimeout(function () {
                        selectGridPage(lastPageNo);
                    }, 100);
                }
                if ($('#msgAutoRefresh').is(':checked')) {
                    //Don't start the timer,if one is already pending
                    if (self.consoleTimer.length == 0) {
                        var timerId = setTimeout(function () {
                        	if(userChangedQuery)
                        		loadLogs(timerId);
                        	else 
                        		fetchLastLogtimeAndCallLoadLogs(timerId,nodeType);
                        }, 90000);
                        logMessage("Setting timer:", timerId);
                        self.consoleTimer.push(timerId);
                    }
                }
            }
        }
        function selectGridPage(lastPageNo) {
            gridConsole.dataSource.page(lastPageNo);
            gridConsole.content.scrollTop(gridConsole.tbody.height());
        }
        function fetchLastLogtimeAndCallLoadLogs(timerId,nodeType){
        	var type;
        	if(nodeType == 'compute'){
        		type = 'vrouter';
        	} else if (nodeType == 'control'){
        		type = 'controlnode';
        	} else if (nodeType == 'analytics'){
        		type = 'analyticsnode';
        	} else if (nodeType == 'config'){
        		type = 'confignode';
        	}
        	$.ajax({
                url:'/api/admin/monitor/infrastructure/'+type+'/details?hostname=' + obj['name']
            }).done(function (result) {
            	if(result.ModuleServerState != null && result.ModuleServerState.msg_stats[0] != null && 
            			result.ModuleServerState.msg_stats[0].log_level_stats[0] != null){
            		var logLevelStats =	jsonPath(result,"$..log_level_stats")[0];
            		var lastLog = getMaxGeneratorValueInArray(logLevelStats,"last_msg_timestamp");
            		lastMsgLogTime = parseInt(lastLog.last_msg_timestamp)/1000 + 1;
            		lastLogLevel = lastLog.level;
            	}
            	if(lastMsgLogTime != null && lastLogLevel != null){
	            	var dateTimePicker = $("#console-to-time").data("kendoDateTimePicker");
	            	dateTimePicker.value(new Date(lastMsgLogTime));
	            	dateTimePicker = $("#console-from-time").data("kendoDateTimePicker");
	            	dateTimePicker.value(adjustDate(new Date(lastMsgLogTime), {sec:-1 * defaultTimeRange}));
	            	
	            	//select the level option which has the last log
	            	//$("#msgLevel option:contains(" + lastLogLevel + ")").attr('selected', 'selected');
	            	var dropdownlist = $("#msgLevel").data("kendoComboBox");
	            	dropdownlist.select(function(dataItem) {
	            	    return dataItem.text === lastLogLevel;
	            	});
            	} else {
            		var timerangedropdownlistvalue = $("#msgTimeRange").data("kendoDropDownList");
            		timerangedropdownlistvalue.select(0);
            		$('#consoleFromTimeDiv').hide();
                    $('#consoleToTimeDiv').hide();
                    $('#msgFromTime').hide();
                    $('#msgToTime').hide();
            		selectTimeRange("1800") ;
            	}
            	loadLogs(timerId,true);
            	gridConsole.dataSource.unbind('requestEnd');
                gridConsole.dataSource.bind('requestEnd', moveToLastPage);
            }).fail(displayAjaxError.bind(null, $('#computenode-dashboard')));
        }
        function selectTimeRange(val) {
            if (val == 'custom') {
                $('#consoleFromTimeDiv').show();
                $('#consoleToTimeDiv').show();
                $('#msgFromTime').show();
                $('#msgToTime').show();
            } else {
            	$('#consoleFromTimeDiv').hide();
                $('#consoleToTimeDiv').hide();
                $('#msgFromTime').hide();
                $('#msgToTime').hide();
                
            }
        }
        function loadLogs(timerId) {
            logMessage("Timer triggered:", timerId);
            if ((timerId != null) && (timerId != '') && $.inArray(timerId, self.consoleTimer) == -1) {
                logMessage("Timer cancelled:", timerId);
                return;
            } else if (timerId != null && ($.inArray(timerId, self.consoleTimer) != -1)) {
                //Remove timerId from self.consoleTimer (pending timers)
                self.consoleTimer.splice($.inArray(timerId, self.consoleTimer), 1);
            }
            var timerangedropdownlistvalue = $("#msgTimeRange").data("kendoDropDownList").value();
             
            var filterObj = {
                table:'MessageTable',
                source:options['source']
                //messageType:'any'
            };
            if (nodeType == 'control') {
                filterObj['moduleId'] = 'ControlNode';
            } else if (nodeType == 'compute') {
                filterObj['moduleId'] = 'VRouterAgent';
            } else if (nodeType == 'config') {
                filterObj['where'] = '(ModuleId=Schema+AND+Source='+obj['name']+')+OR+(ModuleId=ApiServer+AND+Source='+obj['name']+')+OR+(ModuleId=ServiceMonitor+AND+Source='+obj['name']+')';
            } else if (nodeType == 'analytics') {
                filterObj['where'] = '(ModuleId=OpServer+AND+Source='+obj['name']+')+OR+(ModuleId=Collector+AND+Source='+obj['name']+')';
            }

            if (cboMsgCategory.value() != '') {
                filterObj['category'] = cboMsgCategory.value();
            }
            if ((cboMsgLevel.value() != null) && (cboMsgLevel.value() != '')) {
                filterObj['level'] = cboMsgLevel.value();
            } else
                filterObj['level'] = 5;
            if (cboMsgType.value() != '')
                filterObj['messageType'] = cboMsgType.value();
            if (cboMsgLimit.value() != '')
                filterObj['limit'] = cboMsgLimit.value();
         /*   if(!userChangedQuery){
            	filterObj['toTimeUTC'] = lastMsgLogTime;
            	filterObj['fromTimeUTC'] = adjustDate(new Date(filterObj['toTimeUTC']), {sec:-1 * defaultTimeRange}).getTime();
            }
            else {
            	filterObj['toTimeUTC'] = (new Date()).getTime();
            	filterObj['fromTimeUTC'] = adjustDate(new Date(filterObj['toTimeUTC']), {sec:-1 * cboTimeRange.value()}).getTime();
            }
          */
            if(timerangedropdownlistvalue === 'custom'){
	            filterObj['toTimeUTC'] = new Date(cboMsgToTime.value()).getTime();
	            filterObj['fromTimeUTC'] = new Date(cboMsgFromTime.value()).getTime();
            } else {
            	filterObj['toTimeUTC'] = (new Date()).getTime();
            	filterObj['fromTimeUTC'] = adjustDate(new Date(filterObj['toTimeUTC']), {sec:-1 * cboTimeRange.value()}).getTime();
            }
            loadSLResults({elementId:'gridConsole', btnId:'btnDisplayLogs', timeOut:60000,
                pageSize:20, //gridHeight:500,
                reqFields:['MessageTS', 'Category','Messagetype', 'Xmlmessage']}, $.param(filterObj));
            gridConsole = $('#gridConsole').data('kendoGrid');
            //Take to the last page and scroll to bottom
            //gridConsole.bind('dataBound',function() {
            //gridConsole.bind('dataBinding',function() {
            //gridConsole.bind('dataBound',moveToLastPage);
        };
        //$('#btnDisplayLogs').trigger('click');
        if(userChangedQuery){
        	loadLogs();
        	gridConsole.dataSource.unbind('requestEnd');
            gridConsole.dataSource.bind('requestEnd', moveToLastPage);
        }
        else {
        	fetchLastLogtimeAndCallLoadLogs('',nodeType);
        }
        
        $('#btnResetLogs').on('click', function () {
            cboTimeRange.value(5 * MIN);
            cboMsgType.value('');
            cboMsgLimit.value('');
            cboMsgCategory.value('');
            cboMsgLevel.value('custom');
            if(userChangedQuery)
            	loadLogs();
            else 
            	fetchLastLogtimeAndCallLoadLogs('',nodeType);
        });
    }
}
function getAlerts(data){
    var res=ifNull(jsonPath(data,'$..ModuleCpuState.process_state_list')[0],[]);
    var alerts=[];
	for(var i=0;i<res.length;i++){
		  if(res[i]['process_state']=='PROCESS_STATE_FATAL')
			alerts.push({nName:data['name'],pName:res[i]['process_name'],timeStamp:res[i]['last_exit_time'],diff:diffDates(new XDate(res[i]['last_exit_time']/1000),new XDate()),type:'fatal'});
		  else if(res[i]['process_state']=='PROCESS_STATE_STOPPED')
			alerts.push({nName:data['name'],pName:res[i]['process_name'],timeStamp:res[i]['last_stop_time'],diff:diffDates(new XDate(res[i]['last_stop_time']/1000),new XDate()),type:'stopped'});  
	}
    return alerts;
}
function getCores(data){
	var fileList=[],result=[];
    var fileArrList=ifNull(jsonPath(data,'$...process_state_list[*].core_file_list'),[]);
    for(var i=0;i<fileArrList.length;i++){
    	var files=fileArrList[i];
       for(var j=0;j<files.length;j++)
    	   fileList.push(files[j])}
    if(fileList.length==1){
    	result.push({lbl:'Core File',value:fileList[0]});
    }else if(fileList.length>1){
    	result.push({lbl:'Cores Files',value:fileList[0]});
    		for(var i=1;i<fileList.length;i++)
    			result.push({lbl:'',value:fileList[i]});}
    return result;
}
function getFormattedDate(timeStamp){
	if(!$.isNumeric(timeStamp))
		return '';
	else{
	var date=new Date(timeStamp),fmtDate="",mnth,hrs,mns,secs,dte;
	dte=date.getDate()+"";
	if(dte.length==1)
		dte="0"+dte;
	mnth=parseInt(date.getMonth()+1)+"";
	if(mnth.length==1)
		mnth="0"+mnth;
	hrs=parseInt(date.getHours())+"";
	if(hrs.length==1)
		hrs="0"+hrs;
	mns=date.getMinutes()+"";
	if(mns.length==1)
		mns="0"+mns;
	secs=date.getSeconds()+"";
	if(secs.length==1)
		secs="0"+secs;
	fmtDate=date.getFullYear()+"-"+mnth+"-"+dte+"  "+hrs+":"+mns+":"+secs;
	return fmtDate;}
}
var infraMonitorView = new infraMonitorClass();



//Center Region
function contentView() {
    this.destroy = function () {
        //$('#main-container').html('');
    }
}

contView = new contentView();

//peerNodeView = new bgpPeerView();

function getIPOrHostName(obj) {
    return (obj['ip'] == noDataStr) ? obj['name'] : obj['ip'];
}

function formatProtcolRange(rangeStr) {
    if (rangeStr == "0 - 255")
        return "any";
    else
        return rangeStr;
}

function formatPortRange(rangeStr) {
    if (rangeStr == null || rangeStr == "undefined - undefined" || rangeStr == "0 - 65535")
        return "any";
    else
        return rangeStr;
}

function formatPeerType(encoding, peer_type) {
    if (encoding == "XMPP") {
        return "vRouter";
    } else if ((peer_type == "internal") && (encoding == "BGP")) {
        return 'Control Node'
    } else if ((peer_type == "external") && (encoding == "BGP")) {
        return 'BGP Peer'
    }
}
function floatingIPCellTemplate(fip) {
    var fipArray = [];
    if(!(fip instanceof Array)){
    	if($.isEmptyObject(fip))
    		fip = [];
    	else 
    		fip = [fip];
    }
    $.each(fip, function (idx, obj) {
        fipArray.push(obj['ip_addr']);
    });
    if (fipArray.length == 0)
        return 'None';
    else
        return fipArray.join(', ');
}

function formatCPU(cpu) {

}

function formatMemory(memory) {
    if(memory == null || memory['virt'] == null)
        return noDataStr;
    var usedMemory = parseInt(memory['virt']) * 1024;
    //var totalMemory = parseInt(memory['total']) * 1024;
    return kendo.format('{0}', formatBytes(usedMemory));
}

function uniqueArray(arr) {
    var retArr = [];
    $.each(arr,function(idx,value) {
        if($.inArray(value,retArr) == -1)
            retArr.push(value);
    });
    return retArr;
}
//Initialize BGP Monitoring tree - Begin

function convertMicroTSToDate(microTS) {
    return new Date(microTS/1000);
}

function getCPUMemoryChartConfig(type) {
    var memTitle = 'Memory';
    cpuTitle = 'CPU utilization'
   /* if(type == 'controlNode') {
        memTitle = 'control-node Memory';
        cpuTitle = 'control-node CPU utilization';
    } else if(type == 'vRouter')  {
        memTitle = 'vnswad Memory';
        cpuTitle = 'vnswad CPU utilization';
    } else if(type == 'analyticsNode')  {
        memTitle = 'Memory';
        cpuTitle = 'CPU utilization';
    } else if(type == 'configNode')  {
        memTitle = 'Memory';
        cpuTitle = 'CPU utilization';
    }*/
    
    return {
        columns:[{field:'cpu',name:cpuTitle,axis:'cpu', tooltipTemplate:'CPU : #= value#'},
            {field:'memory',name:memTitle,axis:'memory',tooltipTemplate:'Memory : #= formatBytes(value*1024) #'}],
        parseFn: parseCPUMemoryTimeSeriesResponse
    }
}

function parseCPUMemoryTimeSeriesResponse(response) {
    var summary = response['summary'];
    var startTime = summary['start_time'],interval=summary['timeGran_microsecs'],
        endTime = summary['end_time'];
    var data = response['flow-series'];
    //CPU/Memory Samples are sent only at a interval of 1min
    interval = 60*1000;
    if(data.length == 0)
        return [];
    //Weed out empty samples until it's fixed in NodeJS
    data = $.map(data,function(obj,idx) {
        //If both CPU/Memory stats are empty,remove the sample
        if($.isEmptyObject(obj['cpuData']) && $.isEmptyObject(obj['memData']['memInfo']) &&
            $.isEmptyObject(obj['memData']['sysMemInfo']))
            return null;
        else {
            if(idx > 0) {
                if($.isEmptyObject(obj['cpuData']))
                    obj['cpuData'] = data[idx-1]['cpuData'];
                if($.isEmptyObject(obj['memData']['memInfo']))
                    obj['memData']['memInfo'] = data[idx-1]['memData']['memInfo'];
                if($.isEmptyObject(obj['memData']['sysMemInfo']))
                    obj['memData']['sysMemInfo'] = data[idx-1]['memData']['sysMemInfo'];
            }
            return obj;
        }
    });
    data = $.map(data,function(obj,idx) {
        obj['date'] = convertMicroTSToDate(obj['MessageTS']);
        obj['date'].setSeconds(0);
        obj['date'].setMilliseconds(0);
        return obj;
    });
    startTime = data[0]['date'].getTime();
    endTime = endTime/1000;
    for(var i=startTime,j=0;i<=endTime;i=i+interval,j++) {
        if((data[j] == null) || (data[j]['date'].getTime() != i)) {
            data.splice(j,0,{
                //MessageTS:i,
                date:new Date(i),
                cpuData:data[j-1]['cpuData'],
                memData:data[j-1]['memData']
            });
        }
    }
    var retArr = $.map(data,function(obj,idx) {
        //obj['date'] = convertMicroTSToDate(obj['MessageTS']);
        obj['cpu'] = parseFloat(obj['cpuData']['cpu_share']);
        obj['memory'] = parseInt(obj['memData']['memInfo']['virt']);
        obj['max'] = summary['numCpu'];
        return obj;
    });
    return retArr;
}

function getCPUMemoryChartConfigForSystem(type) {
    var memTitle = 'Memory';
    if(type == 'system')  {
        memTitle = 'Memory';
    }
    return {
        columns:[{field:'cpu',name:cpuTitle,axis:'cpu', tooltipTemplate:'CPU : #= value#'},
            {field:'memory',name:memTitle,axis:'memory',tooltipTemplate:'Memory : #= formatBytes(value*1024) #'}],
        parseFn: function(response) {
            console.info(response);
            var summary = response['summary'];
            var startTime = summary['start_time'],interval=summary['timeGran_microsecs'],
                endTime = summary['end_time'];
            var data = response['flow-series'];
            //CPU/Memory Samples are sent only at a interval of 1min
            interval = 60*1000;
            if(data.length == 0)
                return [];
            //Weed out empty samples until it's fixed in NodeJS
            data = $.map(data,function(obj,idx) {
                //If both CPU/Memory stats are empty,remove the sample
                if($.isEmptyObject(obj['cpuData']) && $.isEmptyObject(obj['memData']['sysMemInfo']))
                    return null;
                else {
                    if(idx > 0) {
                        if($.isEmptyObject(obj['cpuData']))
                            obj['cpuData'] = data[idx-1]['cpuData'];
                        if($.isEmptyObject(obj['memData']['sysMemInfo']))
                            obj['memData']['sysMemInfo'] = data[idx-1]['memData']['sysMemInfo'];
                    }
                    return obj;
                }
            });
            data = $.map(data,function(obj,idx) {
                obj['date'] = convertMicroTSToDate(obj['MessageTS']);
                obj['date'].setSeconds(0);
                obj['date'].setMilliseconds(0);
                return obj;
            });
            startTime = data[0]['date'].getTime();
            endTime = endTime/1000;
            for(var i=startTime,j=0;i<=endTime;i=i+interval,j++) {
                if((data[j] == null) || (data[j]['date'].getTime() != i)) {
                    data.splice(j,0,{
                        //MessageTS:i,
                        date:new Date(i),
                        cpuData:data[j-1]['cpuData'],
                        memData:data[j-1]['memData']
                    });
                }
            }
            var retArr = $.map(data,function(obj,idx) {
                //obj['date'] = convertMicroTSToDate(obj['MessageTS']);
                obj['cpu'] = parseFloat(obj['cpuData']['cpuLoadAvg']['one_min_avg']);
                obj['memory'] = parseInt(obj['memData']['sysMemInfo']['total']);
                //obj['max'] = summary['numCpu'];
                return obj;
            });
            return retArr;
        }
    }
}


function showObjLog(objId, type){
    var defaultTimeRange = 1800;//30mins
    if(type == 'vRouter' || type =='XMPP_peer' || type == 'BGP_peer' || type == 'vn'){
	    $('body').append($("#objLogWindow"));
    	bgpwindow = $("#objLogWindow");
	    bgpwindow.on("hide", closeObjectLogWindow);
	    bgpwindow.modal({backdrop:'static', keyboard: false, show:false});
	    $("btnObjLogWindowCancel").click(function (a) {
	    	bgpwindow.hide();
	    });
	    runOTQuery(objId, defaultTimeRange, type);
	    bgpwindow.modal('show');
    }
};

function closeObjectLogWindow() {
	clearValuesFromDomElements();
}

function showStatus(ip){
	if(CONTRAIL_STATUS_USER["ip_"+ip] == null || CONTRAIL_STATUS_PWD["ip_"+ip] == null){
		showLoginWindow(ip);
	} else {
		populateStatus(CONTRAIL_STATUS_USER["ip_"+ip],CONTRAIL_STATUS_PWD["ip_"+ip],ip);
	}
}

function showLoginWindow(ip){
	var username;
	var password;
    $('body').append($("#loginWindow"));
	loginWindow = $("#loginWindow");
	loginWindow.on("hide", closeObjectLogWindow);
	loginWindow.modal({backdrop:'static', keyboard: false, show:false});
    $("#btnLoginWindowCancel").click(function (a) {
    	loginWindow.hide();
    });
    $("#btnLoginWindowLogin").click(function (a) {
    	username = $('#txtLoginUserName').val();
    	password = $('#txtLoginPassword').val();
    	populateStatus(username,password,ip);
    	$('#divLoginError').html("");
    	loginWindow.hide();
    });
    loginWindow.modal('show');
};

function populateStatus(usrName,pwd,ip) {
	CONTRAIL_STATUS_USER["ip_"+ip] = usrName;
	CONTRAIL_STATUS_PWD["ip_"+ip] = pwd;
	var postData = {"username":usrName,"password":pwd};
	$.ajax({
        url:'/api/service/networking/device-status/' + ip,
        type:'post',
        data:postData
    }).done(function(response) {
    	var htmlString = '<pre>' + response + '</pre>';
    	$('#divContrailStatus').html(htmlString);
        $('#divBasic').hide();
        $('#divAdvanced').hide();
        $('#divStatus').show();
        $('#divAdvanced').parents('.widget-box').find('.widget-header h4 .subtitle').remove();
    	$('#divAdvanced').parents('.widget-box').find('.widget-header h4').append('<span class="subtitle">(Status)</span>')
    }).fail(function(response) {
    	if(response.responseText.search("Error: Authentication failure") != -1){
    		$('#divLoginError').html("Invalid username or password");
    		showLoginWindow(ip);
    	} else {
    		$('#divContrailStatus').html("Error fetching status");
    	}
    });
}

function clearValuesFromDomElements() {
	
	/*msFipProjects.data("ot-results").value("");
	msNetworkPolicies.data("kendoMultiSelect").value("");
	
	gridIPBlocks.dataSource.data([]);
	gridFipPools.dataSource.data([]);
	gridRouteTargets.dataSource.data([]);
	*/
}

function runOTQuery(objId, timeRange, type) {
    var currTime = new Date();
    var currTimeInSecs = currTime.getTime();
    var toTime =encodeURIComponent(kendo.toString(currTime, "MMM dd, yyyy HH:mm:ss tt"));
    var fromTimeInSecs = currTimeInSecs - timeRange*1000;
    var fromTime = encodeURIComponent(kendo.toString(new Date((fromTimeInSecs)), "MMM dd, yyyy HH:mm:ss tt"));

    var objectType;
    var objectId;
    //build the query string
    if(type == "vRouter") {
        objectType = "ObjectBgpRouter";
    } else if (type == "XMPP_peer") {
        objectType = "ObjectXmppPeerInfo";
    } else if (type == "BGP_peer") {
        objectType = "ObjectBgpPeer";
    } else if(type == "vn") {
    	objectType = "ObjectVNTable";
    }
    var reqQueryString ="timeRange="+timeRange+
        "&fromTime="+fromTime+
        "&toTime="+toTime+
        "&objectType="+objectType+
        //"&objectId_input="+objId+
        "&objectId="+objId+
        "&select=ObjectLog" +
        "&where=" +
        "&fromTimeUTC="+fromTimeInSecs+
        "&toTimeUTC="+currTimeInSecs+
        "&table=" +objectType+
        "&async=true";
    var    options = {
        elementId:'ot-results', gridHeight:480,gridWidth:600,
        timeOut:90000, pageSize:50,
        export:true, btnId:'ot-query-submit'
    };
    select = 'ObjectLog,SystemLog';
    loadOTResults(options, reqQueryString, parseStringToArray(select, ','));
};


function getCrossFilterDimensionGroup(dataCF,accessorFn) {
}

function bucketizeData(data,fieldName) {
    var retObj = {},retArr=[];keys=[];
    $.each(data,function(idx,obj) {
        //Add key if it doesn't exist
        if($.inArray(obj[fieldName],keys) == -1)
            keys.push(obj[fieldName]);
        if(obj[fieldName] in retObj) {
            retObj[obj[fieldName]]++;
        } else {
            retObj[obj[fieldName]] = 1;
        }
    });
    var maxKey = d3.extent(keys);
    for(var i=maxKey[0];i<=maxKey[1];i++) {
        var value = 0;
        if(retObj[i] != null) {
            value = retObj[i];
            retArr.push({name:i,value:value});
        }
    }
    return retArr;
}

function getNodeVersion(d) {
    var verStr = '';
    if(jsonPath(d,'$..build_info').length > 0)
        var buildInfo = JSON.parse(jsonPath(d,'$..build_info')[0]);
        if((buildInfo != null) && (buildInfo['build-info'] instanceof Array)) {
            var buildObj = buildInfo['build-info'][0];
            verStr = buildObj['build-version'] + ' (Build ' + buildObj['build-number'] + ')'
        }
    return verStr;
}

function getNodeUpTime(d) {
    var upTimeStr = '-';
    if(jsonPath(d,'$..start_time').length > 0) {
        var upTime = new XDate(jsonPath(d,'$..start_time')[0]/1000);
        var currTime = new XDate();
        upTimeStr = 'Up since ' + diffDates(upTime,currTime);
    } else if(jsonPath(d,'$..ModuleServerState..reset_time').length > 0){
		var resetTime = jsonPath(d,'$..reset_time')[0]/1000;
		var currTime = new XDate();
		upTimeStr = 'Down since ' + diffDates(resetTime,currTime);
    } else {
    	upTimeStr = "Down";
    }
    return upTimeStr;
}

//Compare IP adress in UVE and config server and if mismatch is there report it in red
function validateNodeIPAddress(data) {
    if(data['configIP'] != data['uveIP'])  {
        var ipAddress = ifNull(data['configIP'],data['IP']);
        return '<span class="text-error" title="Config IP mismatch">' + ipAddress + '</span>';
     } else
        return data['ip'];
}

function decideColor(origClass,color){
	if(color == 'red' || color == "#d62728"){
		return 'cell-hyperlink-text-error';
	} else {
		return 'cell-hyperlink';
	}
}

function getGridCellCssClass() {

}

function initGridDetail(e) {
    var detailRow = e.detailRow;
}

function showAdvancedDetails(){
	$('#divBasic').hide();
	$('#divStatus').hide();
	$('#divAdvanced').show();
	$('#divAdvanced').parents('.widget-box').find('.widget-header h4 .subtitle').remove();
	$('#divAdvanced').parents('.widget-box').find('.widget-header h4').append('<span class="subtitle">(Advanced)</span>')
}

function showBasicDetails(){
	$('#divAdvanced').hide();
	$('#divStatus').hide();
	$('#divBasic').show();
	$('#divAdvanced').parents('.widget-box').find('.widget-header h4 .subtitle').remove();
}

function parseUveHistoricalValues(d,path) {
    var histData = ifNull(jsonPath(d,path)[0],[]);
    var histDataArr = [];
    $.each(histData,function(key,value) {
        histDataArr.push([key['ts'],value]);
    });
    histDataArr.sort(function(a,b) { return a[0] > b[0];});
    histDataArr = $.map(histDataArr,function(value,idx) {
        return value[1];
    });
    return histDataArr;
}

function getStatusForGenerator(data,collectorName,strtTime){
	var maxConnectTimeGenerator = getMaxGeneratorValueInArray(data,"connect_time");
	var maxResetTimeGenerator = getMaxGeneratorValueInArray(data,"reset_time");
	var maxResetTime = jsonPath(maxResetTimeGenerator,"$..reset_time")[0];
	var maxConnectTime = jsonPath(maxConnectTimeGenerator,"$..connect_time")[0];
	var statusString = '--';
	var resetTime = new XDate(maxResetTime/1000);
	var connectTime = new XDate(maxConnectTime/1000);
	var startTime;
	var maxGeneratorHostName = jsonPath(maxConnectTimeGenerator,"$..hostname")[0];
	if(strtTime != null){
		startTime = new XDate(strtTime/1000);
	}
    var currTime = new XDate();
	if(maxResetTime > maxConnectTime){//Means disconnected
        statusString = 'Disconnected since ' + diffDates(resetTime,currTime);
	} else {
		if(maxGeneratorHostName != collectorName){
			statusString = "Connection Error since " + diffDates(connectTime,currTime);
		} else {
			statusString = "Up since " + diffDates(startTime,currTime) + " , Connected since " + diffDates(connectTime,currTime);
		}
	}
	return statusString;
}

function getMaxGeneratorValueInArray(inputArray,selector) {
	var maxVal;
	if(inputArray != null && inputArray['length'] != null && inputArray['length'] > 1) {
		maxVal = inputArray[0];
		for(var i = 1; i < inputArray.length; i++){
			var curSelectorVal = jsonPath(inputArray[i],"$.."+selector)[0];
			var maxSelectorVal = jsonPath(maxVal,"$.."+selector)[0];
			if(curSelectorVal > maxSelectorVal){
				maxVal = inputArray[i];
			}
		}
		return maxVal;
	} else {
		return inputArray;
	}
}

function getConfigNodesStatus(data,type){
	var statusstr='';
	try{
		var generatorInfo =jsonPath(data, '$..'+type+'..ModuleServerState..generator_info')[0];
		var maxConnectTimeGenerator = getMaxGeneratorValueInArray(generatorInfo,"connect_time");
		var maxResetTimeGenerator = getMaxGeneratorValueInArray(generatorInfo,"reset_time");
		var maxResetTime = jsonPath(maxResetTimeGenerator,"$..reset_time")[0];
		var maxConnectTime = jsonPath(maxConnectTimeGenerator,"$..connect_time")[0];
		if(maxConnectTime > maxResetTime){
			statusstr = "(Up)";
		} else {
			statusstr = "(Down)";
		}
	}catch(e){}
	return statusstr;
}

function getSecurityGroup(sg){
	var ret = "";
	sg = ifNullOrEmptyObject(sg,[]);
	for(var i=0; i < sg.length; i++){
		if(sg[i].search("security group") != -1) {
			if(ret == ""){
				ret = sg[i].split(":")[1];
			} else {
				ret = ret + ", " + sg[i].split(":")[1];
			}
		}
	}
	return ret;
}

function toggleDetails(divId){
	var div = $('#'+divId);
	var iconId = '#icon_' + divId;
	var iconClass = $(iconId).attr("class");
	if(iconClass == 'icon-expand-alt') {
		$(iconId).removeClass(iconClass).addClass('icon-collapse-alt');
	} else {
		$(iconId).removeClass(iconClass).addClass('icon-expand-alt');
	}
	$('#'+divId).toggle();
}

