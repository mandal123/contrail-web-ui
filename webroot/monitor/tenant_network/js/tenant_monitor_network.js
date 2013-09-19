/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

//@@ sourceURL=tenant_monitor_network.js

var durationStr = ' (last 30 mins)';
var durationTitle = 'Last 30 mins';
var FLOW_QUERY_TIMEOUT = 115000;
var timerId;
var elements;
//var nodesInTopo=new Array();
//var nodes_project=new Array();
var TOP_IN_LAST_MINS = 10;
var NUM_DATA_POINTS_FOR_FLOW_SERIES = 240;
var ENABLE_PEER_CLICK = 1;
var ENABLE_PORT_CLICK = 1;
var ENABLE_FLOW_CLICK = 1;
//var flowCellConfig = {port:{name:'port'},peer:{name:'peer'},flow:{name:'flow'}};
var flowCellConfig = {port:{},peer:{},flow:{}};

function constructReqURL(obj) {
    var url = "";
    var length = 0;
    if(obj['fqName'] != null)
        length = obj['fqName'].split(':').length;
    else
        obj['fqName'] = "*";
    var context = obj['context'];
    //Decide context based on fqName length
    if((context == null) && (length > 0)) {
        var contextMap = ['domain','project'];
        context = contextMap[length-1];
    }

    //Pickup the correct URL in this if loop
    if(context == 'domain') {
        url = "/api/tenant/networking/domain/stats/top"
        if(obj['type'] == 'summary') 
            url = "/api/tenant/networking/domain/summary"
    } else if(context == 'project') {
        url = "/api/tenant/networking/project/stats/top"
        if(obj['type'] == 'summary') 
            url = "/api/tenant/networking/project/summary"
        else if(obj['type']=='portRangeDetail') 
            url="/api/admin/reports/query";
    } else if(context == 'network') {
        url = "/api/tenant/networking/network/stats/top"
        if(obj['type']=='portRangeDetail') 
            url="/api/admin/reports/query";
        var urlMap = {  summary: '/api/tenant/networking/vn/summary',
                        flowseries:'/api/tenant/networking/flow-series/vn',
                        details:'/api/tenant/networking/network/details'
                    }
        if(ifNull(obj['widget'],obj['type']) in urlMap)
            url = urlMap[ifNull(obj['widget'],obj['type'])];
    } else if(context == 'connected-nw') { 
        url = "/api/tenant/networking/network/connected/stats/top"
        var urlMap = {  flowseries:'/api/tenant/networking/flow-series/vn',
                        summary:'/api/tenant/networking/network/connected/stats/summary'
                    }
        if(ifNull(obj['widget'],obj['type']) in urlMap)
            url = urlMap[ifNull(obj['widget'],obj['type'])];
    } else if(context == 'instance') { //Instance
        url = "/api/tenant/networking/vm/stats/top"
        var urlMap = {  flowseries:'/api/tenant/networking/flow-series/vm',
                        summary:'/api/tenant/networking/vm/stats/summary'
                    }
        if(ifNull(obj['widget'],obj['type']) in urlMap)
            url = urlMap[ifNull(obj['widget'],obj['type'])];
    } 
    //End - pick the correct URL
    if((obj['type'] == 'instance') && (obj['context'] != 'instance')) {
        url = "/api/tenant/networking/virtual-machines"
    }
    //If need statistics from the beginning
    if(obj['source'] == 'uve') {
        if($.inArray(obj['type'],['project','network']) > -1)
            url = '/api/tenant/networking/virtual-network/summary'
    }
    var reqParams = { };
    //No time range required as summary stats are from the beginning
    if(obj['type'] != 'summary') {
        //Retrieve only top 5 if it's not the entire list
        //Exclude list where limit is not applicable
        if($.inArray(obj['view'],['list','flowseries']) == -1) {
            if(obj['widget'] != 'flowseries')
                obj['limit'] = ifNull(obj['limit'],5); 
        }
        //Time-related queries
        if(obj['fromUTC'] != null) {
        } else if(obj['time'] == null) {
            obj['time'] = '10m';
        }
        if(obj['time'] != null) {
            var startEndUTC = tenantNetworkMonitorUtils.getFromToUTC(obj['time']);
            delete obj['time'];
            obj['fromUTC'] = startEndUTC[0];
            obj['toUTC'] = startEndUTC[1];
        }
        $.extend(reqParams,{minsSince : TOP_IN_LAST_MINS});
    }
    if(obj['limit'] != null)
        $.extend(reqParams,{limit:obj['limit']});
    else 
        $.extend(reqParams,{limit:100});    //Hack

    //Rename fqName variable as per NodeJS API requirement 
    if(obj['fqName'] != null) {
        //For flow-series,need to pass fqName as srcVN
        if(context == 'connected-nw') {
            $.extend(reqParams,{'srcVN':obj['srcVN'],'destVN':obj['fqName']});
        } else if(obj['widget'] == 'flowseries') {
            if(context == 'instance') {
                $.extend(reqParams,{'fqName':ifNull(obj['vnName'],obj['fqName']),'ip':obj['ip']});
            } else 
                $.extend(reqParams,{'fqName':obj['fqName']});        //change queryParameter to fqName
        } else if(obj['type'] == 'details') {
            if(context == 'network')
                $.extend(reqParams,{'uuid':obj['uuid']});
        } else if(context == 'instance') {
            $.extend(reqParams,{'fqName':obj['vnName'],'ip':obj['ip']});
        } else
            $.extend(reqParams,{'fqName':obj['fqName']});
    }

    //If port argument is present,just copy it..arguments that need to be copied to reqParams as it is
    $.each(['port','protocol','vmName','vmVnName'],function(idx,field) {
        if(obj[field] != null) {
            //$.extend(reqParams,{port:obj[field]});
            reqParams[field] = obj[field];
        }
    });
    if(obj['type']=='portRangeDetail') {
        var fqName=obj['fqName'],protocolCode;
        reqParams['timeRange']=600;
        reqParams['table']='FlowSeriesTable';
        if(obj['startTime'] != null) {
            reqParams['fromTimeUTC']=obj['startTime'];
            reqParams['toTimeUTC']=obj['endTime'];
        } else {
            reqParams['fromTimeUTC']=new XDate().addMinutes(-10).getTime();
            reqParams['toTimeUTC']=new XDate().getTime();
        }
        var protocolMap = {tcp:6,icmp:1,udp:17};
        var protocolCode = [];
        $.each(obj['protocol'],function(idx,value) {
            protocolCode.push(protocolMap[value]);
        });
        if(fqName.split(':').length==2) {
            fqName+=':*';//modified the fqName as per the flow series queries
        }
        var portType = obj['portType'] == 'src' ? 'sport' : 'dport';
        var whereArr = [];
        $.each(protocolCode,function(idx,currProtocol) {
            whereArr.push(kendo.format("({3}={0} AND sourcevn={1} AND protocol={2})",obj['port'],fqName,currProtocol,portType));
        });
        if(obj['portType']=='src'){
            if(fqName.indexOf('*')>-1)
                reqParams['select']="sourcevn, destvn, sourceip, destip, protocol, sport, dport, sum(bytes), sum(packets)";
            else
                reqParams['select']="destvn, sourceip, destip, protocol, sport, dport, sum(bytes), sum(packets)";
            //reqParams['where']=kendo.format("(sport={0} AND sourcevn={1} AND protocol={2})",obj['port'],fqName,protocolCode);
            reqParams['where']=whereArr.join(' OR ');
        }else if(obj['portType']=='dst'){
            if(fqName.indexOf('*')>-1)
                reqParams['select']="sourcevn, destvn, sourceip, destip, protocol, sport, dport, sum(bytes), sum(packets)";
            else
                reqParams['select']="destvn, sourceip, destip, protocol, sport, dport, sum(bytes), sum(packets)";
            //reqParams['where']=kendo.format("(dport={0} AND sourcevn={1} AND protocol={2})",obj['port'],fqName,protocolCode);
            reqParams['where']=whereArr.join(' OR ');
        }
        delete reqParams['fqName'];
        delete reqParams['protocol'];
    }
    //Strip-off type if not required
    if(obj['type'] != null && ($.inArray(obj['type'],['summary','flowdetail','portRangeDetail']) == -1) && 
            ($.inArray(obj['widget'],['flowseries']) == -1))
        $.extend(reqParams,{type:obj['type']});

    //Add extra parameters for flowseries
    if(obj['widget'] == 'flowseries') {
        $.extend(reqParams,{'sampleCnt':NUM_DATA_POINTS_FOR_FLOW_SERIES});
        $.extend(reqParams,{'minsSince':30});
    }

    //Always send the startTime and endTime instead of minsSince
    if(reqParams['minsSince'] != null) {
        reqParams['endTime'] = new Date().getTime();
        reqParams['startTime'] = new Date(new XDate().addMinutes(-reqParams['minsSince'])).getTime();
        //delete reqParams['minsSince'];
    }

    //Strip-off limit & minsSince if not required
    if(((obj['type'] == 'instance') && (obj['context'] != 'instance')) || (obj['source'] == 'uve') || obj['type'] == 'portRangeDetail') {
        delete reqParams['limit'];
        delete reqParams['minsSince'];
        delete reqParams['endTime'];
        delete reqParams['startTime'];
    }
    if(obj['source'] == 'uve') {
        if(obj['type'] != 'instance') {
            delete reqParams['fqName'];
            if(obj['fqName'] == '' || obj['fqName'] == '*')
                reqParams['fqNameRegExp'] = '*';
            else
                reqParams['fqNameRegExp'] = '*' + obj['fqName'] + ':*';
        } else {
            reqParams['fqName'] = '';
        }
    }

    if((obj['portType'] != null) && (obj['port'].toString().indexOf('-') > -1)) {
        //As NodeJS API expects same URL for project & network and only fqName will be different
        if(url.indexOf('/top') > -1) {
            url = '/api/tenant/networking/network/stats/top';
            reqParams['portRange'] = obj['port'];
            if(obj['startTime'] != null)
                reqParams['startTime'] = obj['startTime'];
            if(obj['endTime'] != null)
                reqParams['endTime'] = obj['endTime'];
            delete reqParams['port'];
        }
    }
    //reqParams['limit'] = 100;
    delete reqParams['limit'];

    return url + '?' + $.param(reqParams);
}


function ObjectListView() {
    //Context & type 
    this.load = function(obj) {
        var listTemplate = kendo.template($("#list-template").html());
        var context = obj['context'];
        //If context is all,set fqName = *
        var objectType = obj['type'];
        if(objectType == 'flowdetail') {
            layoutHandler.setURLHashParams(obj,{merge:false,triggerHashChange:false});
        } else if(context == 'instance') {
            layoutHandler.setURLHashParams({fqName:obj['fqName'],view:'list',type:obj['type'],context:obj['context'],ip:obj['ip'],vnName:obj['vnName']},
                {p:'mon_net_instances',merge:false,triggerHashChange:false});
        } else if(obj['selector'] != null)  {
        } else 
            layoutHandler.setURLHashParams({fqName:obj['fqName'],view:'list',type:obj['type'],source:obj['source'],context:obj['context']},{merge:false,triggerHashChange:false});
        if(objectType == 'network') {
            obj['detailParseFn'] = tenantNetworkMonitorUtils.parseNetworkDetails;
            if((obj['fqName'] == null) || (obj['fqName'] == '') || obj['fqName'] == '*')
                obj['title'] = kendo.format('Networks Summary');
            else
                obj['title'] = kendo.format('Networks Summary for {0} ({1})',capitalize(context),obj['fqName'].split(':').pop());
            if((obj['source'] != null) && obj['source'] == 'uve')
                obj['subTitle'] = '';
            columns = [{
                field:'name',
                title:'Network',
                template: cellTemplate({cellText:'name',tooltip:true,name:'network'}),
                searchable: true
            },{
                field:'instCnt',
                title:'Instances',
            },{
                field:'inBytes',
                title:'Traffic (In/Out)',
                template:'#= kendo.format("{0} / {1}",formatBytes(inBytes),formatBytes(outBytes)) #'
            },{
                field:'outBytes',
                title:'Throughput (In/Out)',
                template:'#= formatThroughput(inThroughput) #' + ' / ' + '#= formatThroughput(outThroughput) #'
            }];
        } else if(objectType == 'instance') { 
            //obj['title'] = kendo.format('Instances Summary for {0} ({1})',capitalize(context),obj['fqName'].split(':').pop());
            obj['title'] = 'Instances Summary';
            obj['subTitle'] = '';
            obj['detailParseFn'] = tenantNetworkMonitorUtils.parseInstDetails; 
            columns = [{
                field:'name',
                title:'Instance',
                template: cellTemplate({cellText:'vmName',tooltip:true,name:'instance'}),
                searchable: true
            },{
                field:'name',
                title:'UUID',
                searchable: true
            },{
                field:'intfCnt',
                title:'Interfaces',
                width:90
            },{
                field:'vRouter',
                title:'vRouter',
                template: cellTemplate({cellText:'vRouter',tooltip:true,name:'vRouter'}),
                width:80
            },{
                field:'ip',
                title:'IP Address',
                template:'#=getMultiValueStr(ip)#',
                width:120
            },{
                field:'floatingIP',
                title:'Floating IP',
                template:'#=getMultiValueStr(floatingIP)#',
                width:120
            },{
                field:'inBytes',
                title:'Traffic (In/Out)',
                template:'#= formatBytes(inBytes) #' + ' / ' + '#= formatBytes(outBytes) #'
            }];
            if((context == null) || (context == '') || (context == 'project')) {
                columns.splice(2,0,{
                    field:'vn',
                    title:'Virtual Network',
                    template:'#=getMultiValueStr(vn)#',
                    searchable:true
                });
            }
        } else if(objectType == 'project') {
            if(obj['fqName'] == null || obj['fqName'] == '' || obj['fqName'] == '*')
                obj['title'] = kendo.format('Projects Summary');
            else
                obj['title'] = kendo.format('Top Projects for Domain ({0})',obj['fqName']);
            if((obj['source'] != null) && obj['source'] == 'uve')
                obj['subTitle'] = '';
            columns = [{
                field:'name',
                title:'Project',
                template: cellTemplate({cellText:'name',tooltip:true,name:'project'}),
                searchable:true
            },{
                field:'vnCount',
                title:'Networks'
            },{
                field:'inBytes',
                title:'Traffic (In/Out)',
                template:'#= kendo.format("{0} / {1}",formatBytes(inBytes),formatBytes(outBytes)) #'
            },{
                field:'outBytes',
                title:'Throughput (In/Out)',
                template:'#= kendo.format("{0} / {1}",formatThroughput(inThroughput),formatThroughput(outThroughput)) #'
            }];
        }
        var listContainer;
        if(obj['selector'] == null) 
            listContainer = pageContainer;
        else
            listContainer = obj['selector'];
        $(listContainer).html(listTemplate(obj));
        obj['columns'] = columns;
        obj['context'] = context;
        obj['objectType'] = objectType;
        obj['url'] = constructReqURL(obj);
        var contextObj = getContextObj(obj);
        obj['parseFn'] = chartsParseFn.bind(null,{fqName:obj['fqName'],source:obj['source'],objectType:obj['type'],view:'list'});
        obj['config'] = {searchToolbar: true, widgetGridTitle: obj['title']};
        if(objectType == 'instance') {
            //Keep autoBind as true for Instances page
            if(layoutHandler.getURLHashObj()['p'] != 'mon_net_instances')
                obj['config']['autoBind'] = false;
        }
        $(listContainer).find('.list-view').initListTemplate(obj);
    }
}
var objListView = new ObjectListView();

/**
 * Common utility functions for tenant network monitoring page
 */
var tenantNetworkMonitorUtils = {
    parsePortDistribution: function(result,cfg) {
        var portCF = crossfilter(result);
        var portField = ifNull(cfg['portField'],'sport');
        var flowCntField = ifNull(cfg['flowCntField'],'outFlowCnt');
        var bandwidthField = ifNull(cfg['bandwidthField'],'outBytes');
        var portDim = portCF.dimension(function(d) {return d[cfg['portField']];});
        var PORT_LIMIT = 65536;
        var PORT_STEP = 256;
        var startPort = ifNull(cfg['startPort'],0);
        var endPort = ifNull(cfg['endPort'],PORT_LIMIT);
        if(endPort - startPort == 255)
            PORT_STEP = 1;
        //var PORT_LIMIT = 33400;
        var color;
        if(portField == 'sport') {
            color = d3Colors['green'];
            color = '#1f77b4';
        } else  {
            color = d3Colors['blue'];
            color = '#aec7e8';
        }

        var portArr = [];
        //Have a fixed port bucket range of 100
        for(var i=startPort;i<=endPort;i=i+PORT_STEP) {
            var name,range;
            if(PORT_STEP == 1) {
                portDim.filter(i);
                name =  i;
                range = i;
            } else {
                portDim.filter([i,Math.min(i+PORT_STEP-1,65536)]);
                name =  i + ' - ' + Math.min(i+PORT_STEP-1,65536);
                range = i + '-' + Math.min(i+PORT_STEP-1,65536);
            }
            var totalBytes = 0;
            var flowCnt = 0;
            $.each(portDim.top(Infinity),function(idx,obj) {
                totalBytes += obj[bandwidthField];
                flowCnt += obj[flowCntField];
            });
            var x = Math.floor(i + Math.min(i+PORT_STEP-1,65536))/2
            if(portDim.top(Infinity).length > 0)
                portArr.push({
                    startTime:cfg['startTime'],
                    endTime:cfg['endTime'],
                    x:x,
                    y:totalBytes,
                    name: name,
                    range: range,
                    size:flowCnt + 1,
                    color:color,
                    type:portField
                });
        }
        return portArr;
    },
    parsePortMap: function(response) {
        var value = 0;
        var portMap = [0,0,0,0,0,0,0,0];
        //var portMap = [0,0,0,0];

        //If portmap received from multiple vRouters
        if((response instanceof Array) && (response[0] instanceof Array)) {
            $.each(response,function(idx,obj) {
                for(var i=0;i<8;i++) {
                    portMap[i] |= parseInt(obj[0][i]);
                }
            });
        } else if(response instanceof Array)
            portMap = response;
        if(portMap != null) {
            var strPortMap = [];
            $.each(portMap,function(idx,value) {
                strPortMap.push(reverseString(get32binary(parseInt(value))));
            });
            //console.info(strPortMap);
        }
        //To plot in 4 rows
        var stringPortMap = [];
        for(var i=0,j=0;j<4;i+=2,j++)
            stringPortMap[j] = strPortMap[i] + strPortMap[i+1]
        var chartData = [];
        for(var i=0;i<64;i++) {
          for(var j=0;j<4;j++) {
              chartData.push({
                  x:i,
                  y:j,
                  value:(response == null) ? 0 : parseInt(stringPortMap[j][i])
              });
          }
        }
        return chartData;
    },
    parseInstDetails: function(data) {
        var d = data['value'];
        var interfaces = ifNullOrEmptyObject(jsonPath(d,'$..interface_list')[0],[]);
        var intfStr = [];
        var retArr = [];
        var ifStatsList = ifNullOrEmptyObject(jsonPath(d,'$..if_stats_list')[0],[]);
        var floatingIPs = ifNullOrEmptyObject(jsonPath(d,'$..interface_list[*].floating_ips'),[]);
        var floatingIPArr = [];
        //retArr.push({lbl:'vRouter',value:ifNull(jsonPath(d,'$..vrouter')[0],'-')});
        $.each(interfaces,function(idx,obj) {
            var name = obj['name'];
            var currIfStatObj = $.grep(ifStatsList,function(statObj,idx) {
                if(statObj['name'] == obj['name'])
                    return true;
                else
                    return false;
            });
            intfStr[idx] = wrapLabelValue('IP Address',obj['ip_address']) + wrapLabelValue('Label',obj['label']) + wrapLabelValue('Mac Address',obj['mac_address']) 
                + wrapLabelValue(' Network',obj['virtual_network']); 
            if(currIfStatObj.length > 0) {
                intfStr[idx] += wrapLabelValue('Traffic (In/Out)',formatBytes(currIfStatObj[0]['in_bytes']) + '/' + formatBytes(currIfStatObj[0]['out_bytes']));
            }
            if(obj['gateway'] != null)
                intfStr[idx] += wrapLabelValue('Gateway',obj['gateway']);
            if(idx == 0)
                retArr.push({lbl:'Interfaces',value:intfStr[idx]});
            else
                retArr.push({lbl:'',value:intfStr[idx]});
        });
        //flattenList didn't work as it's not an instance of array
        //$.each(flattenList(floatingIPs),function(idx,obj) {
        $.each(flattenArr(floatingIPs),function(idx,obj) {
            /*if(obj['length'] !=null) {
                $.each(obj,function(idx,currObj) {
                    if(currObj['ip_address'] != null)
                        floatingIPArr.push(kendo.format('{0} ({1})',currObj['ip_address'],currObj['virtual_network']));
                });
            } else*/ if(obj['ip_address'] != null)
                floatingIPArr.push(kendo.format('{0} ({1})',obj['ip_address'],obj['virtual_network']));
        });
        if(floatingIPArr.length > 0)
            retArr.push({lbl:'Floating IP',value:floatingIPArr.join(' , ')});
        retArr.push({lbl:'UUID',value:data['name']});
        //retArr.push({lbl:'CPU',value:ifNull(jsonPath(d,'$..cpu_one_min_avg')[0],'-').toFixed(2)});
        retArr.push({lbl:'CPU',value:kendo.toString(ifNull(jsonPath(d,'$..cpu_one_min_avg')[0],'-'),'0.00')});
        var usedMemory = ifNullOrEmptyObject(jsonPath(d,'$..rss')[0],'-');
        var totalMemory = ifNullOrEmptyObject(jsonPath(d,'$..vm_memory_quota')[0],'-');
        if(usedMemory != '-' && totalMemory != '-') {
            if(usedMemory > totalMemory)
                usedMemory = totalMemory;
        }
        retArr.push({lbl:'Memory (Used/Total)',value:formatBytes(usedMemory*1024) + ' / ' + 
            formatBytes(totalMemory*1024)});
        return retArr;
    },
    parseNetworkDetails: function(data) {
        var d = data['value'];
        var retArr = [];
        var connectedNetworks = ifNull(jsonPath(d,'$..UveVirtualNetworkConfig.connected_networks')[0],[]);
        var flowCnt = ifNullOrEmptyObject(jsonPath(d,'$..flow_count')[0],0);
        var policies = ifNullOrEmptyObject(jsonPath(d,'$..attached_policies')[0],[]);
        var policyArr = [];
        $.each(policies,function(idx,obj) {
            policyArr.push(obj['vnp_name']);
        });
        //var partiallyConnectedNetworks = ifNull(jsonPath(d,'$..UveVirtualNetworkConfig.connected_networks')[0],[]);
        retArr.push({lbl:'Connected Networks',value:connectedNetworks.join(', ')});
        retArr.push({lbl:'Flows',value:flowCnt});
        retArr.push({lbl:'ACL',value:ifNullOrEmptyObject(jsonPath(d,'$..acl')[0],'')});
        retArr.push({lbl:'ACL Rules',value:ifNullOrEmptyObject(jsonPath(d,'$..total_acl_rules')[0],0)});
        retArr.push({lbl:'Interfaces',value:ifNullOrEmptyObject(jsonPath(d,'$..interface_list')[0],[]).length});
        //retArr.push({lbl:'Instances',value:ifNull(jsonPath(d,'$..virtualmachine_list')[0],[]).length});
        retArr.push({lbl:'VRF',value:ifNullOrEmptyObject(jsonPath(d,'$..vrf_stats_list[0].name')[0],'')});
        retArr.push({lbl:'Policies',value:policyArr.join(', ')});
        //Remove the label/values where value is empty
        retArr = $.map(retArr,function(obj,idx) {
            if(obj['value'] !== '')
                return obj;
            else
                return null;
        });
        return retArr;
    },
    filterVNsNotInCfg: function(uveData,fqName) {
        var filteredVNs = [];
        var cfgVNListURL = '/api/tenants/config/virtual-networks';
        if(fqName == null || fqName == '' || fqName == '*') {
        } else if(fqName.split(':').length == 2)  //Project
            cfgVNListURL += '?tenant_id='  + fqName;
        $.ajax({
                url:cfgVNListURL,
                async:false
        }).done(function(configData) {
            var configVNs = []
            $.each(configData['virtual-networks'],function(idx,obj) {
                configVNs.push(obj['fq_name'].join(':'));
            });
            filteredVNs = $.map(uveData,function(obj,idx) {
                if($.inArray(obj['name'],configVNs) > -1) {
                    return obj;
                } else
                    return null;
            });
        });
        return filteredVNs;
    },
    //str will be [0-9]+(m|h|s|d)
    //Returns an array of current time and end time such that the difference beween them will be given str
    getFromToUTC: function(str) {
        var startDt = new XDate(true);
        var endDt = new XDate(true);
        var fnMap = {d:'addDays',m:'addMinutes',s:'addSeconds',h:'addHours'}
        var unit = str.charAt(str.length-1);
        var value = parseInt(str);
        //If unit is not specified,take it as secs
        if($.inArray(unit,['d','m','s','h']) == -1)
            unit = 's';
        endDt[fnMap[unit]](value);
        return [startDt.getTime(),endDt.getTime()];
    },
    statsParseFn: function(response) {
        //If response in Array,sumup inBytes/outBytes/interVNInBytes/interVNOutBytes across all elements
        var obj = {inBytes:0,outBytes:0,interVNInBytes:0,interVNOutBytes:0};
        if(response instanceof Array) {
            $.each(response,function(idx,value) {
                $.each(['inBytes','outBytes','interVNInBytes','interVNOutBytes'],function(idx,field) {
                    obj[field] += parseInt(value[field]);
                });
            });
        } else
            obj = response;
        $.each(obj,function(key,value) {
            if($.inArray(key,['inBytes','outBytes','interVNInBytes','interVNOutBytes']) > -1)
                obj[key] = formatBytes(value);
        });
        return [obj];
    }
}

var portSummaryView = new portSummaryRenderer();
function portSummaryRenderer() {
    this.load = function(cfg) {
        var obj = $.extend({},cfg);
        var data = {stats:{},charts:{},grids:{}};
        var portTitle = (obj['portType'] == 'src') ? 'Source Port' : 'Destination Port'
        var portRange = [];
        var startPort,endPort;
        if(obj['port'].indexOf('-') > -1) {
            portRange = obj['port'].split("-") 
            startPort = parseInt(portRange[0]);
            endPort= parseInt(portRange[1]);
            pushBreadcrumb([obj['fqName'],portTitle + 's (' + obj['port'] + ')']);
        } else {
            portRange = [obj['port'],obj['port']];
            pushBreadcrumb([obj['fqName'],portTitle + ' ' + obj['port']]);
        }

        //Initialize bubble chart only if portRange is provided
        if(obj['port'].indexOf('-') > -1) {
            //Issue port distribution query.
            var portDeferredObj = $.Deferred();
            var portDistributionURL = constructReqURL($.extend({},obj,{type:'port'}));
            var portDistributionParams = $.deparam(portDistributionURL);
            $.ajax({
                url: constructReqURL($.extend({},obj,{type:'port'})),
                timeout:FLOW_QUERY_TIMEOUT
            }).done(function(result) {
                portDeferredObj.resolve(result);
            });
            data['charts']['chartType'] = 'bubble';
            data['charts']['colCount'] = 1;
            data['charts']['d'] = [
                {deferredObj:portDeferredObj,title:'Port Distribution',parseFn:function(response) {
                    var portData,valueField,flowCntField;
                    if(obj['portType'] == 'src') {
                        portData = response['sport'];
                    } else {
                        portData = response['dport'];
                    }
                    var portType = obj['portType'] == 'dst' ? 'dport' : 'sport';
                    flowCntField = obj['portType'] == 'dst' ? 'inFlowCount' : 'outFlowCount';
                    portData = $.map(portData,function(currObj,idx) {
                        if(currObj[portType] >= portRange[0] && currObj[portType] <= parseInt(portRange[1]))
                            return currObj;
                        else
                            return null;
                    });
                    if(obj['portType'] == 'src')
                        portData = tenantNetworkMonitorUtils.parsePortDistribution(portData,{startTime:portDistributionParams['startTime'],endTime:portDistributionParams['endTime'],
                            bandwidthField:'outBytes',flowCntField:'outFlowCount',portField:'sport',startPort:startPort,endPort:endPort});
                    else
                        portData = tenantNetworkMonitorUtils.parsePortDistribution(portData,{startTime:portDistributionParams['startTime'],endTime:portDistributionParams['endTime'],
                            bandwidthField:'inBytes',flowCntField:'inFlowCount',portField:'dport',startPort:startPort,endPort:endPort});

                    var retObj = {d:[{key:'Source Port',values:portData}],
                        forceX:[startPort,endPort],xLblFormat:d3.format(''),yDataType:'bytes',fqName:obj['fqName'],
                        yLbl:'Bandwidth',link:{hashParams:{q:{view:'list',type:'project',fqName:obj['fqName'],context:'domain'}}},
                        tooltipFn:tenantNetworkMonitor.portTooltipFn,title:'Port Distribution',xLbl:'Port'
                        }
                    return retObj;
                    }
                }];
        }
        if(obj['port'].indexOf('-') > -1)
            template='portRangeDetail-template';
        else
            template = 'portDetail-template';
        var lcolumns=[];
        var columns=[
            {
                field:"sourceip",
                title:"Source IP"
            },{
                field:"destip",
                title:"Destination IP"
            },{
                field:"protocol",
                title:"Protocol",
                template:'#= getProtocolName(protocol) #'
            },{
                field:"sport",
                title:"Source Port"
            },{
                field:"dport",
                title:"Destination Port" 
            },{
                field:"sum_bytes",
                title:"Sum(Bytes)"   
            },{
                field:"sum_packets",
                title:"Sum(Packets)"
            }];
        if(obj['fqName'].split(':').length==2)
            lcolumns=[
                {
                    field:'sourcevn',
                    title:'Source VN',
                    searchable:true
                },{
                    field:'destvn',
                    title:'Destination VN',
                    searchable:true
                }];
        else if(obj['fqName'].split(':').length==3 && obj['portType']=='src')
            lcolumns=[
                {   field:'destvn',
                    title:'Destination VN',
                    searchable:true
                }];
        else if(obj['fqName'].split(':').length==3 && obj['portType']=='dst')
            lcolumns=[
                {
                    field:'destvn',
                    title:'Destination VN',
                    searchable:true
                }];
        data['grids']={
            url:function() {
                var protocol='TCP';
                if($('.toggleProtocol.selected').length > 0) {
                    //protocol = $('.toggleProtocol.selected').text();
                    protocol = $.map($('.toggleProtocol.selected'),function(obj,idx) {
                        return $(obj).text().toLowerCase();
                    });
                }
                return constructReqURL($.extend({},obj,{protocol:protocol}));
            },
            timeout:FLOW_QUERY_TIMEOUT,
            config:{
                widgetGridTitle:'Flows',
                widgetGridActions: ['<a class="toggleProtocol selected">ICMP</a>','<a class="toggleProtocol selected">UDP</a>','<a class="toggleProtocol selected">TCP</a>'],
                noMsg:'No Flows for the given criteria'
            },
            columns:lcolumns.concat(columns),
            parseFn:function(response){
                //objSummaryView['gridData'] = response['data'];
                //self.gridData = response['data'];
                $.each(response['data'],function(idx,currObj) {
                    currObj['sport'] = getIANAServiceForPort(currObj['protocol'],currObj['sport']);
                    currObj['dport'] = getIANAServiceForPort(currObj['protocol'],currObj['dport']);
                    currObj['sum_bytes'] = formatBytes(currObj['sum_bytes']);
                });
                return response.data;
            }
        };

        //Render the template
        var summaryTemplate = kendo.template($('#' + template).html());
        var container = cfg['container'];
        $(container).html(summaryTemplate(obj));
        $(container).initTemplates(data);

        $('.toggleProtocol').on('click',function() {
            $(this).toggleClass('selected');
            //If no protocol is selected,select all
            if($('.toggleProtocol.selected').length == 0) {
                $('.toggleProtocol').addClass('selected');        
            }
            //Have client side filtering of protocols
            var protocolMap = {tcp:6,icmp:1,udp:17};
            var selProtocolArr = $.map($('.toggleProtocol.selected'),function(obj,idx) {
                return protocolMap[$(obj).text().toLowerCase()];
            });
            var flowsGrid = $('.k-grid').data('kendoGrid');
            flowsGrid.dataSource.filter([]);
            var filterArr = [];
            $.each(selProtocolArr,function(idx,value) {
                filterArr.push({field:'protocol',operator:'eq',value:value});
            });
            flowsGrid.dataSource.filter({logic:'or',filters:filterArr});
            
            //showGridLoading($('.k-grid').data('kendoGrid'));
            //reloadKendoGrid($('.k-grid').data('kendoGrid'));
        });
    }
    /* Start - Port Histogram
    portDeferredObj.done(function(response) {
        var portCF = crossfilter(portData);
        var portDim = portCF.dimension(function(d) { return d[portType]});
        var allPortData = [];
        var maxValue = d3.max(portData, function (d) {
            return d[flowCntField];
        });
        var zeroValue = maxValue/20;
        zeroValue = 0;
        for(var i=startPort;i<=endPort;i++) {
            if(portDim.filter(i).top(Infinity).length == 1)
                allPortData.push(portDim.filter(i).top(1)[0]);
            else {
                if(obj['portType'] == 'dst')
                    allPortData.push({
                        dport : i,
                        inFlowCount :zeroValue 
                    });
                else
                    allPortData.push({
                        sport : i,
                        outFlowCnt : zeroValue
                    });
            }
        }
        $('.sparkline').initSparkLineChart({dataSource:{data:allPortData},valueField:flowCntField,
            tooltipTemplate: 'Port #= dataItem.' + portType + '# : ' + '#= dataItem.' + flowCntField + '#'});
    });
     End - Port Histogram */
    //Initialize crossfilter chart once grid is initialized
    /*$('.k-grid').data('kendoGrid').bind('dataBound',function(gridData) {
        var gridData = $('.k-grid').data('kendoGrid').dataSource.data();
        //gridData = self.gridData;
        function plotPortCrossFilter(gridData) {
            var flowCF = crossfilter(gridData);
            var flowDim = flowCF.dimension(function(d) { return d[portType == 'sport' ? 'dport' : 'sport']});
            var filterDim = flowCF.dimension(function(d) { return d[portType == 'sport' ? 'dport' : 'sport']});
            charts = [
                barChart()
                    .dimension(flowDim)
                    .group(flowDim.group())
                    .toolTip(true)
                  .x(d3.scale.linear()
                    .domain([0, 68000])
                    .rangeRound([0, 10 * 100])), //Width
                ];
          chart = d3.selectAll(".chart")
              .data(charts)
              .each(function(currChart) { currChart.on("brush", function() {
                  logMessage('networkMonitor',filterDim.top(10));
                  updateView();
                  //renderAll(chart);
              }).on("brushend", function() { 
                  //updateView();
                  //renderAll(chart);
              }); 
            });
            renderAll(chart);
            function updateView() {
                $('.k-grid').data('kendoGrid').dataSource.data(filterDim.top(Infinity));
            }
          $('.reset').on('click',function() {
              //var idx = $(this).closest('.chart').index();
              //charts[idx].filter(null);
              //renderAll(chart);
              //updateView();
          });
        }
    });*/
}
var connectedNetworkView = new connectedNetworkRenderer();
function connectedNetworkRenderer() {
    this.load = function(cfg) {
        var obj = $.extend({},cfg);
        var data = {stats:{},charts:{},grids:{}};
        pushBreadcrumb([obj['fqName'] + ' <-> ' + obj['srcVN']]);
        layoutHandler.setURLHashParams({fqName:obj['fqName'],srcVN:obj['srcVN']},{p:'mon_net_networks',merge:false,triggerHashChange:false});
        //Show Ingress/Egress Traffic in different colors
        data['stats'] = {
            'list' : [
                { lbl : kendo.format('Ingress/Egress from {0} to {1}',obj['srcVN'].split(':').pop(),obj['fqName'].split(':').pop()),field:'toNetwork'},
                { lbl : kendo.format('Egress/Ingress from {0} to {1}',obj['fqName'].split(':').pop(),obj['srcVN'].split(':').pop()),field:'fromNetwork'}
            ],
            parseFn: function(response) {
                return [{   
                    'toNetwork': kendo.format("<span class='in'>{0}</span> <span class='seperator'>/</span>" +  
                            " <span class='out'>{1}</span>",formatBytes(response['toNW']['inBytes']),formatBytes(response['toNW']['outBytes'])),
                    'fromNetwork': kendo.format("<span class='out'>{0}</span> <span class='seperator'>/</span>" +  
                            " <span class='in'>{1}</span>",formatBytes(response['toNW']['inBytes']),formatBytes(response['toNW']['outBytes'])) 
                    }]
            }
        }
        template = 'connected-nw-template';
        data['stats']['url'] = constructReqURL($.extend({},obj,{type:'summary'}));
        data['ts-chart'] = {};
        data['ts-chart']['url'] = constructReqURL($.extend({},obj,{widget:'flowseries'}));
        //Render the template
        var summaryTemplate = kendo.template($('#' + template).html());
        var container = cfg['container'];
        $(container).html(summaryTemplate(obj));
        $(container).initTemplates(data);
    }
}
/**
 * Network Summary page
 */
var networkSummaryView = new networkSummaryRenderer();
function networkSummaryRenderer() {
    this.load = function(cfg) {
        var obj = $.extend({},cfg);
        var data = {stats:{},charts:{},grids:{}};
        var context = 'network';
        layoutHandler.setURLHashParams({fqName:obj['fqName']},{p:'mon_net_networks',merge:false,triggerHashChange:false});
        pushBreadcrumb([obj['fqName']]);
        template = 'network-template';
        data['stats'] = [{},{}];
        data['grids'] = [{},{}];
        var detailURL = constructReqURL($.extend({},obj,{type:'details'}));
        //Summary Stats
        data['stats'][0] = {
            list : [
                { lbl : 'Total Traffic In',field:'inBytes'},
                { lbl : 'Total Traffic Out',field:'outBytes'},
                { lbl : 'Inter VN Traffic In',field:'interVNInBytes'},
                { lbl : 'Inter VN Traffic Out',field:'interVNOutBytes'}],
            parseFn : tenantNetworkMonitorUtils.statsParseFn,
            url : constructReqURL($.extend({},obj,{type:'summary'}))
        };
        data['stats'][1] = {
            list : [
                { lbl : 'Total Interfaces',field:'intfCnt'},
                { lbl : 'Instances',field:'vmCnt'},
                { lbl : 'ACL Rules',field:'aclRuleCnt'}],
            url :  detailURL,
            parseFn: function(response) {
                response['intfCnt'] = response['intfList'].length;
                return [response];
            }
        };

        //Time-series chart
        data['ts-chart'] = {};
        data['ts-chart'] = {
           'url' : constructReqURL($.extend({},obj,{widget:'flowseries'}))
        }

        //For Network Topology
        data['topology']={renderFn:function(){
                topologyView.drawTopology(obj['fqName'])
            }
        }
        //data['charts'] = {};
        data['charts']['chartType'] = 'bubble';
        var portDeferredObj = $.Deferred();
        var portDistributionURL = constructReqURL($.extend({},obj,{type:'port'}));
        var portDistributionParams = $.deparam(portDistributionURL);
        $.ajax({
            url: portDistributionURL,
            timeout:FLOW_QUERY_TIMEOUT
        }).done(function(result) {
            portDeferredObj.resolve(result);
        });
        var uveDeferredObj = $.Deferred();
        $.ajax({
            url:'/api/tenant/networking/virtual-network/summary?fqNameRegExp=' + obj['fqName'] 
        }).done(function(result) {
            $("#uve-information").text(JSON.stringify(result, null, 1));
            uveDeferredObj.resolve(result);
        });
        data['charts']['colCount'] = 1;
        data['charts']['d'] = [
            {deferredObj:portDeferredObj,title:'Port Distribution',parseFn:function(response) {
                var retObj = {d:[{key:'Source Port',values:tenantNetworkMonitorUtils.parsePortDistribution(response['sport'],{startTime:portDistributionParams['startTime'],
                    endTime:portDistributionParams['endTime'],bandwidthField:'outBytes',flowCntField:'outFlowCount',portField:'sport'})},
                           {key:'Destination Port',values:tenantNetworkMonitorUtils.parsePortDistribution(response['dport'],{startTime:portDistributionParams['startTime'],
                       endTime:portDistributionParams['endTime'],bandwidthField:'inBytes',flowCntField:'inFlowCount',portField:'dport'})}],
                    forceX:[0,1000],xLblFormat:d3.format(''),yDataType:'bytes',fqName:obj['fqName'],
                    yLbl:'Bandwidth',link:{hashParams:{q:{view:'list',type:'project',fqName:obj['fqName'],context:'domain'}}},
                    tooltipFn:tenantNetworkMonitor.portTooltipFn,title:'Port Distribution',xLbl:'Port'
                    }
                return retObj;
                }
             }];
        //Render the template
        var summaryTemplate = kendo.template($('#' + template).html());
        var container = cfg['container'];
        $(container).html(summaryTemplate(obj));
        $(container).initTemplates(data);

        var instanceTabLoaded = 0;
        $('#network-tabs').kendoTabStrip({
            activate: function(e) {    
                var selTab = $(e.item).text();
                if(selTab == 'Port Distribution')
                    $(window).resize();
                else if(selTab == 'Instances') {
                    if(instanceTabLoaded == 0) {
                        $('#networkInstances .k-grid').data('kendoGrid').dataSource.read();
                        instanceTabLoaded = 1;
                    }
                }
                var topo_divId=obj['fqName'].replace(/-/g,'_').replace(/:/g,'_');
                if($('#network-tabs').find('div.k-state-active').find('#topology').length>0 && 
                        $("#"+topo_divId).data('topology')!=undefined){
                          $("#"+topo_divId).html('');
                          topologyView.renderTopology($("#"+topo_divId).data('topology'));
                      }
                },
            }).data('kendoTabStrip').select(0);
            //Init Port Distribution map charts
            initDeferred({deferredObj:uveDeferredObj,renderFn:'initHeatMap',selector:$('#srcUdpPortMap'),parseFn:function(response) {
                    return tenantNetworkMonitorUtils.parsePortMap(jsonPath(response,'$..udp_sport_bitmap')[0]);
                }
            });
            initDeferred({deferredObj:uveDeferredObj,renderFn:'initHeatMap',selector:$('#dstUdpPortMap'),parseFn:function(response) {
                    return tenantNetworkMonitorUtils.parsePortMap(jsonPath(response,'$..udp_dport_bitmap')[0]);
                }
            });
            initDeferred({deferredObj:uveDeferredObj,renderFn:'initHeatMap',selector:$('#srcTcpPortMap'),parseFn:function(response) {
                    return tenantNetworkMonitorUtils.parsePortMap(jsonPath(response,'$..tcp_sport_bitmap')[0]);
                }
            });
            initDeferred({deferredObj:uveDeferredObj,renderFn:'initHeatMap',selector:$('#dstTcpPortMap'),parseFn:function(response) {
                    return tenantNetworkMonitorUtils.parsePortMap(jsonPath(response,'$..tcp_dport_bitmap')[0]);
                }
            });
            objListView.load({view:'list',type:'instance',fqName:obj['fqName'],context:'network',selector:'#networkInstances'});
    }
}

function ObjectSummaryView() {
    var statsDataSource,template;
    var self = this;
    this.load = function(obj) {
        var data = {stats:{},charts:{},grids:{}};
        if($.inArray(obj['type'],['domain','project','network']) > -1) {
            data['stats']['parseFn']  = tenantNetworkMonitorUtils.statsParseFn;
        }
        var context = obj['type'];
        var objType = obj['type'];
        data['context'] = context;
        //Domain
        if(objType == 'domain') {
            domainSummaryView.load($.extend({container:pageContainer},obj));
        } else if(objType == 'project') { //Project
            projSummaryView.load($.extend({container:pageContainer},obj));
        } else if(objType == 'network') {  //Network
            networkSummaryView.load($.extend({container:pageContainer},obj));
        } else if(objType == 'connected-nw') {  //Connected Network
            connectedNetworkView.load($.extend({container:pageContainer},obj));
        } else if(objType == 'instance') {  //Instance
            instSummaryView.load($.extend({container:pageContainer},obj));
        } else if(objType=='portRangeDetail'){
            portSummaryView.load($.extend({container:pageContainer},obj));
        }
        var contextObj = getContextObj(obj);
        $.extend(data,contextObj);
        //Load the data for the components not handled by initTemplates
        //Also, feed the data if same dataSource URL is used for multiple components
    }
}
var objSummaryView = new ObjectSummaryView();

function tenantNetworkMonitorClass() {
    var self = this;
    this.timeObj = {};
    var treeView = null,currView = null;
    
    //Pass on the window resize event to the respective view
    this.onWindowResize = function() {
        return;
    }

    this.destroy = function() {
        //To unload dynamically loaded javascript,ensure that you define it inside a closure 
        //so that there will be only one handle to that closure execution context and can be
        //removed easily.
        delete contView;
        delete contentView;
        //Revert back ajax defaultTimeout
        $.ajaxSetup({
            timeout:30000
        });
    }

    this.updateViewByHash = function(hashObj,lastHashObj) {
        var dataItem;
        //If there is any hash string present in the URL,select that node accordingly
        if((hashObj != null) && (hashObj != '') && typeof(hashObj) == 'object') {
            if(currView != null)
                currView.destroy();
            if((hashObj['fqName'] != null) && hashObj['view'] == null) {
                var fqNameLen = hashObj['fqName'].split(':').length;
                if(hashObj['srcVN'] != null)  { //Connected Network
                    if(hashObj['fqName'].match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)) {
                        objSummaryView.load({type:'instance',vmName:hashObj['vmName'],fqName:hashObj['fqName'],srcVN:hashObj['srcVN']}); 
                    } else
                        objSummaryView.load({context:'connected-nw',type:'connected-nw',fqName:hashObj['fqName'],srcVN:hashObj['srcVN']}); 
                } else {
                    if(fqNameLen == 1) {     //Domain
                        objSummaryView.load({context:'domain',type:'domain',fqName:hashObj['fqName']}); 
                    } else if(fqNameLen == 2) {    //Project
                        if(hashObj['portType']!=null && hashObj['port']!=null){
                            objSummaryView.load({context:'project',type:'portRangeDetail',startTime:hashObj['startTime'],endTime:hashObj['endTime'],
                                fqName:hashObj['fqName'],port:hashObj['port'],protocol:hashObj['protocol'],portType:hashObj['portType']})}
                        else
                        objSummaryView.load({context:'project',type:'project',fqName:hashObj['fqName']}); 
                    } else if(fqNameLen == 3) { //Network
                        if(hashObj['portType']!=null && hashObj['port']!=null) {
                            objSummaryView.load({context:'network',type:'portRangeDetail',startTime:hashObj['startTime'],endTime:hashObj['endTime'],
                                fqName:hashObj['fqName'],port:hashObj['port'],protocol:hashObj['protocol'],portType:hashObj['portType']})}
                        else
                        objSummaryView.load({context:'network',type:'network',fqName:hashObj['fqName']}); 
                    } else if(fqNameLen > 2) {   //Instance
                        var matchArr = hashObj['fqName'].match(/(.*):Instances:(.*)/);
                        objSummaryView.load({type:'instance',fqName:matchArr[2],srcVN:matchArr[1]}); 
                    }
                }
            } else if(hashObj['view'] != null) {
                subViews[hashObj['view']].load(hashObj);
            } 
        }
    }

    this.load = function() {
        //Change ajax defaultTimeout for this screen
        $.ajaxSetup({
            timeout:60000
        });
        var monitorTemplate = kendo.template($("#monitor-template").html());
        $(contentContainer).html('');
        $(contentContainer).html(monitorTemplate);
        self.updateViewByHash(layoutHandler.getURLHashParams());
        initializeRefreshBtn();
    }

    var subViews = {list:objListView,summary:objSummaryView};
    this.loadSubView = function(obj) {
        if(obj['view'] != "") {
            subViews[obj['view']].load(obj); 
            //subViews[obj['view']].load({fqName:'default-domain',type:'network'}); 
        }
    }
}
var tenantNetworkMonitorView = new tenantNetworkMonitorClass();

//Center Region
function contentView() {
    this.destroy = function() {
        $(pageContainer).html('');
    }
}

contView = new contentView();

//@@ sourceURL=tenant_monitor_network.js

function getSelInstanceFromDropDown() {
    if($('#dropdownIP').length == 0)
        return {};
    var vmIntfObj = $('#dropdownIP').data('kendoDropDownList').dataItem();
    return {ip:vmIntfObj['ip_address'],vnName:vmIntfObj['virtual_network']};
}

function getTitleFromContextObj(ctxObj) {
    if(ctxObj['fqName'] != null)  {
        if(ctxObj['srcVN'] == null) {   //Project/Network/Domain
            return ctxObj['fqName'];
        } else if(ctxObj['ip'] != null) {   //Instance
            return ', ' + ctxObj['ip'] + ' (' + ifNull(ctxObj['vnName'],ctxObj['srcVN']) + ')';
        } else if(ctxObj['srcVN'] != null) {    //Connected-network
            if(ctxObj['fqName'] == ctxObj['srcVN'])
                return 'with in ' + stripOffProject(ctxObj['fqName']);
            else
                return stripOffProject(ctxObj['fqName']) + ' -> ' + stripOffProject(ctxObj['srcVN']);
        } 
    }
}

function getConnectedTitleFromContextObj(ctxObj) {
    if(ctxObj['srcVN'] == ctxObj['fqName']) {
        return kendo.format("with in virtual network {0}",stripOffProject(ctxObj['srcVN']));
    } else
        return kendo.format("between virtual network {0} and {1}",stripOffProject(ctxObj['srcVN']),stripOffProject(ctxObj['fqName']));
}

function initializeRefreshBtn() {
    $(pageContainer).siblings().filter('.refresh-btn').on('click',function() {
        monitorRefresh($(pageContainer));
    });
}

function autoRefresh() {
    //Once the view is loaded,call autoRefresh and cancel on switching to a different view
    //Start the timer only after all the ajax calls are done..Need to poll for this
    //Some-times only one ajax call is issued if datasource is shared,but good thing that parseFn is called twice
}

function areAllCompsLoaded(selector) {
    var classes = ['.summary-stats','.stack-chart','.z-grid','.ts-chart'];
    var elems = [],loadedElems=[];
    $.each(classes,function(idx,value) {
        if(elems.length == 0)
            elems = $(selector).find(value);
        else
            elems = elems.add($(selector).find(value));
    });
    elems = flattenList(elems);
    var loadedElems = $.map(elems,function(obj,idx) {
        if($(obj).data('loaded') == true)
            return true;
        else
            return null;
    });
    if(elems.length == loadedElems.length)
        return true;
    return false;
}


function reverseString(str) {
    return str.split("").reverse().join("");
}

function getMultiValueStr(arr) {
    var retStr = '';
    var entriesToShow = 2;
    $.each(arr,function(idx,value) {
        if(idx == 0)
            retStr += value; 
        else if(idx < entriesToShow)
            retStr += '<br/>' + value;
        else
            return;
    });
    if(arr.length > 2)
        retStr += '<br/>' + kendo.format('({0} more)',arr.length-entriesToShow);
    return retStr;
}

function getIANAServiceForPort(protNo,portNo) {
    var ianaMap = {'443':'HTTPS','80':'HTTP','23':'Telnet','22':'SSH'};
    var protMAP = {'17':'UDP','6':'TCP','2':'IGMP','0':'ICMP'}
    var retStr = '';
    /*if(protNo == 1 && portNo == 0)
        return 'ICMP';*/
    if(portNo in ianaMap) {
        return ianaMap[portNo] + ' (' + portNo + ')';
    } else
        return portNo;
}
function getProtocolName(protNo) {
    var protMAP = {'17':'UDP','6':'TCP','2':'IGMP','0':'ICMP'}
    if(protNo in protMAP)
        return protMAP[protNo];
    else
        return protNo;
}
