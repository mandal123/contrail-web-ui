/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

//@@ sourceURL=tenant_monitor_network.js

var durationStr = ' (last 30 mins)';
var durationTitle = 'Last 30 mins';
var timerId;

var TOP_IN_LAST_MINS = 30;
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
    var context = obj['context'];
    //Decide context based on fqName length
    if((context == null) && (length > 0)) {
        var contextMap = ['domain','project'];
        context = contextMap[length-1];
    }

    if(obj['type'] == 'flowdetail') {
        url = "/api/tenant/networking/network/flows"
    }
    //Pickup the correct URL in this if loop
    if(obj['type'] == 'portdetail' && obj['widget'] == 'flowseries') {
        url = "/api/tenant/networking/network/flow-series/port"
    } else if(context == 'domain') {
        url = "/api/tenant/networking/domain/stats/top"
        if(obj['type'] == 'summary') 
            url = "/api/tenant/networking/domain/summary"
    } else if(context == 'project') {
        url = "/api/tenant/networking/project/stats/top"
        if(obj['type'] == 'summary') 
            url = "/api/tenant/networking/project/summary"
    } else if(context == 'network') {
        url = "/api/tenant/networking/network/stats/top"
        var urlMap = {summary: '/api/tenant/networking/vn/summary',flowseries:'/api/tenant/networking/flow-series/vn',
                        details:'/api/tenant/networking/network/details'}
        if(ifNull(obj['widget'],obj['type']) in urlMap)
            url = urlMap[ifNull(obj['widget'],obj['type'])];
    } else if(context == 'connected-nw') { 
        url = "/api/tenant/networking/network/connected/stats/top"
        var urlMap = {flowseries:'/api/tenant/networking/flow-series/vn',
                        summary:'/api/tenant/networking/network/connected/stats/summary'}
        if(ifNull(obj['widget'],obj['type']) in urlMap)
            url = urlMap[ifNull(obj['widget'],obj['type'])];
    } else if(context == 'instance') { //Instance
        url = "/api/tenant/networking/vm/stats/top"
        var urlMap = {flowseries:'/api/tenant/networking/flow-series/vm',
                        summary:'/api/tenant/networking/vm/stats/summary'}
        if(ifNull(obj['widget'],obj['type']) in urlMap)
            url = urlMap[ifNull(obj['widget'],obj['type'])];
        //If UUID name is displayed
        //if(obj['fqName'].match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)) {
        //}
    } 
    var reqParams = {
    };
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
            var startEndUTC = getFromToUTC(obj['time']);
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

    
    //Add extra parameters for flowseries
    if(obj['widget'] == 'flowseries') {
        $.extend(reqParams,{'sampleCnt':NUM_DATA_POINTS_FOR_FLOW_SERIES});
    }
    //Strip-off type if not required
    if(obj['type'] != null && ($.inArray(obj['type'],['summary','flowdetail']) == -1) && 
            ($.inArray(obj['widget'],['flowseries']) == -1))
        $.extend(reqParams,{type:obj['type']});

    //Specific
    if(obj['type'] == 'flowdetail') {
        var fields = ['sourcevn','destvn','protocol','sport','dport','sourceip','destip'];
        reqParams = {};
        $.each(fields,function(idx,field) {
            reqParams[field] = obj[field];
        });
        reqParams['minsSince'] = TOP_IN_LAST_MINS;
        reqParams['limit'] = 100;
    }

    //Always send the startTime and endTime instead of minsSince
    if(reqParams['minsSince'] != null) {
        reqParams['endTime'] = new Date().getTime();
        reqParams['startTime'] = new Date(new XDate().addMinutes(-reqParams['minsSince'])).getTime();
        //delete reqParams['minsSince'];
    }

    return url + '?' + $.param(reqParams);
}

//str will be [0-9]+(m|h|s|d)
//Returns an array of current time and end time such that the difference beween them will be given str
function getFromToUTC(str) {
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
}

var portColumns = [{
        field:'name',
        title:'Port',
        template: cellTemplate($.extend({cellText:'#= formatPortName(data)#',tooltip:true,name:'port'},flowCellConfig['port'])),
    },{
        field:'protocol',
        title:'Protocol',
        template:'#= formatProtocol(protocol)#'
    },{
        field:'inBytes',
        title:'Traffic In',
        template:'#= formatBytes(inBytes) #'
    },{
        field:'outBytes',
        title:'Traffic Out',
        template:'#= formatBytes(outBytes) #'
    }];
    var peerColumns = [{
        field:'network',
        title:'Network',
        template: cellTemplate({cellText:'#= formatNetworkName(data)#',tooltip:true,name:'network'}),
    },{
        field:'name',
        title:'Peer IP',
        template: cellTemplate($.extend({cellText:'#= formatPeerName(data)#',tooltip:true,name:'peer'},flowCellConfig['peer'])),
    },{
        field:'inBytes',
        title:'Traffic In',
        template:'#= formatBytes(inBytes) #'
    },{
        field:'outBytes',
        title:'Traffic Out',
        template:'#= formatBytes(outBytes) #'
}];

function ObjectListView() {
    //Context & type 
    this.load = function(obj) {
        var listTemplate = kendo.template($("#list-template").html());
        var context = obj['context'];
        var objectType = obj['type'];
        if(objectType == 'flowdetail') {
            layoutHandler.setURLHashParams(obj,{merge:false});
        } else if(context == 'instance') {
            layoutHandler.setURLHashParams({fqName:obj['fqName'],view:'list',type:obj['type'],context:obj['context'],ip:obj['ip'],vnName:obj['vnName']});
        } else
            layoutHandler.setURLHashParams({fqName:obj['fqName'],view:'list',type:obj['type'],context:obj['context']});
        if(objectType == 'network') {
            obj['title'] = kendo.format('Networks Summary for {0} ({1})',capitalize(context),obj['fqName'].split(':').pop());
            columns = [{
                field:'name',
                title:'Network',
                template: cellTemplate({cellText:'name',tooltip:true,name:'network'}),
            },{
                field:'inBytes',
                title:'Traffic In',
                template:'#= formatBytes(inBytes)#'
            },{
                field:'outBytes',
                title:'Traffic Out',
                template:'#= formatBytes(outBytes)#'
            }];
        } else if(objectType == 'project') {
            obj['title'] = kendo.format('Top Projects for Domain ({0})',obj['fqName']);
            columns = [{
                field:'name',
                title:'Project',
                template: cellTemplate({cellText:'name',tooltip:true,name:'project'}),
            },{
                field:'vnCount',
                title:'Networks',
            },{
                field:'inBytes',
                title:'Traffic In',
                template:'#= formatBytes(inBytes) #'
            },{
                field:'outBytes',
                title:'Traffic Out',
                template:'#= formatBytes(outBytes) #'
            }];
        } else if(objectType == 'port') {
            obj['title'] = kendo.format('Top Ports for {0} ({1})',capitalize(context),obj['fqName']);
            if(context == 'connected-nw') {
                obj['title'] = kendo.format('Top Ports {0}',getConnectedTitleFromContextObj(obj));
            }
            columns = portColumns;
        } else if(objectType == 'peer') {
            obj['title'] = kendo.format('Top Peers for {0} ({1})',capitalize(context),obj['fqName']);
            columns = peerColumns;
            if(context == 'connected-nw') {
                obj['title'] = kendo.format('Top Peers {0}',getConnectedTitleFromContextObj(obj));
            }
        } else if($.inArray(objectType,['flow','flowdetail']) > -1) {
            if(objectType == 'flowdetail') {
                obj['title'] = kendo.format('Flows Summary');
                /*obj['subTitle'] = kendo.format('Traffic Statistics for Source VN {0} Source IP {1} Source Port {2} Destination VN {3}  Destination IP {4} Destination Port {5} Protocol {6}',
                            obj['sourcevn'],obj['sourceip'],obj['sport'],obj['destvn'],obj['destip'],obj['dport'],formatProtocol(obj['protocol']));*/
                obj['subTitle'] = kendo.format('Traffic Statistics for Protocol {6} {0} : {1} : {2}  -> {3} : {4} : {5}',
                            obj['sourcevn'],obj['sourceip'],obj['sport'],obj['destvn'],obj['destip'],obj['dport'],formatProtocol(obj['protocol']));
            } else  {
                obj['title'] = kendo.format('Top Flows for {0} ({1})',capitalize(context),obj['fqName']);
                if(context == 'connected-nw') 
                    obj['title'] = kendo.format('Top Flows {0}',getConnectedTitleFromContextObj(obj));
            }
            columns = [{
                field:'sourcevn',
                title:'Source VN',
                template: cellTemplate({cellText:'sourcevn',tooltip:true,name:'network'}),
            },{
                field:'sourceip',
                title:'Source IP',
                template: cellTemplate($.extend({cellText:'sourceip'},flowCellConfig['peer'])),
            },{
                field:'sport',
                title:'Source Port',
                template: cellTemplate($.extend({cellText:'sport'},flowCellConfig['port'])),
            },{
                field:'destvn',
                title:'Destination VN',
                template: cellTemplate({cellText:'destvn',tooltip:true,name:'network'}),
            },{
                field:'destip',
                title:'Destination IP',
                template: cellTemplate($.extend({cellText:'destip'},flowCellConfig['port'])),
            },{
                field:'dport',
                title:'Destination Port',
                template: cellTemplate($.extend({cellText:'dport'},flowCellConfig['port'])),
            },{
                field:'protocol',
                title:'Protocol',
                template:'#= formatProtocol(protocol)#'
            },{
                field:'bytes',
                title:'Total Bytes',
            },{
                field:'pkts',
                title:'Total Pkts',
            }];
        }
        $(pageContainer).html(listTemplate(obj));
        obj['columns'] = columns;
        obj['context'] = context;
        obj['objectType'] = objectType;
        obj['url'] = constructReqURL(obj);
        var contextObj = getContextObj(obj);
        obj['parseFn'] = chartsParseFn.bind(null,{objectType:obj['type'],view:'list'});
        $(pageContainer).find('.list-view').initListTemplate(obj);
    }
}
var objListView = new ObjectListView();

function statsParseFn(response) {
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

function formatPortName(data) {
    return ifNull(data['sport'],data['dport']);
}

function formatPeerName(data) {
    return long2ip(ifNull(data['sourceip'],data['destip']));
}

function formatNetworkName(data) {
    return ifNull(data['sourcevn'],data['destvn']);
}

function formatFlowName(data) {
    return data;
}

function getDomainDashboardData(deferredObj) {
    $.ajax({
        url:'/api/tenant/networking/virtual-network/summary?fqNameRegExp=default-domain:*',
    }).done(function(result) {
        console.info('Hello');
        var vnArr = [],obj = {},projArr = [];projData = {};
        $.each(result['value'],function(idx,d) {
            obj = {};
            obj['name'] = d['name'];
            obj['project'] = obj['name'].split(':').slice(0,2).join(':');
            obj['intfCnt'] = ifNull(jsonPath(d,'$..interface_list')[0],[]).length;
            obj['vnCnt'] = ifNull(jsonPath(d,'$..connected_networks')[0],[]).length;
            obj['x'] = obj['intfCnt'];
            obj['y'] = obj['vnCnt'];
            vnArr.push(obj);
        });
        var vnCF = crossfilter(vnArr);
        var projDimension = vnCF.dimension(function(d) { return d.project;});
        $.each(vnArr,function(idx,d) {
            if(!(d['project'] in projData)) {
                projData[d['project']] = {
                        intfCnt : 0,
                        vnCnt   : 0
                    };
            }
            projData[d['project']]['intfCnt'] += d['intfCnt'];
            projData[d['project']]['vnCnt']++;
        });
        $.each(projData,function(key,obj) {
            $.extend(obj,{name:key,x:obj['intfCnt'],y:obj['vnCnt']});
            projArr.push(obj);
        });
        deferredObj.resolve({networksData:vnArr,projectsData:projArr});
    });
}


function ObjectSummaryView() {
    var statsDataSource,template;
    this.load = function(obj) {
        var data = {stats:{},charts:{},grids:{}};
        if($.inArray(obj['type'],['domain','project','network']) > -1) {
            data['stats']['parseFn']  = statsParseFn;
        }
        //Common for Domain & Project
        if($.inArray(obj['type'],['domain','project']) > -1) {
            template = 'summary-template';
            layoutHandler.setURLHashParams({fqName:obj['fqName']},{merge:false});
            data['stats']['list'] = [
                { lbl : 'Total Traffic In',field:'inBytes'},
                { lbl : 'Total Traffic Out',field:'outBytes'},
                { lbl : 'Inter VN Traffic In',field:'interVNInBytes'},
                { lbl : 'Inter VN Traffic Out',field:'interVNOutBytes'},
            ];
            data['charts']['colCount'] = 2;
        }
        var context = obj['type'];
        var objType = obj['type'];
        data['context'] = context;
        //Domain
        if(objType == 'domain') {
            obj['title'] = kendo.format('Traffic Statistics for Domain ({0})',obj['fqName']);
            data['stats']['url'] = constructReqURL($.extend({},obj,{type:'summary'}));
            //Charts
            data['charts']['d'] = [{
                    title:kendo.format('Projects with most throughput',durationStr),
                    link:{view:'list',type:'project',fqName:obj['fqName'],context:context},
                    class:tenantNetworkMonitorView,
                    url:constructReqURL($.extend({},obj,{type:'project'})),
                    objectType:'project'
                },{
                    title:kendo.format('Networks with most throughput',durationStr),
                    class:tenantNetworkMonitorView,
                    link:{view:'list',type:'network',fqName:obj['fqName'],context:context},
                    url:constructReqURL($.extend({},obj,{type:'network'})),
                    objectType:'network'
                },{
                    title:kendo.format('Top Peers',durationStr),
                    url:constructReqURL($.extend({},obj,{type:'peer'})),
                    link:{view:'list',type:'peer',fqName:obj['fqName'],context:context},
                    objectType:'peer'
                },{
                    title :kendo.format('Top Ports',durationStr),
                    url:constructReqURL($.extend({},obj,{type:'port'})),
                    link:{view:'list',type:'port',fqName:obj['fqName'],context:context},
                    objectType:'port'
                }];
            data['charts']['id'] = 'domain';
        } else if(objType == 'project') { //Project
            obj['title'] = kendo.format('Traffic Statistics for Project ({0})',obj['fqName'].split(':').pop());
            data['stats']['url'] = constructReqURL($.extend({},obj,{type:'summary'}));
            data['charts']['d'] = [{
                    title:'Networks with most throughput' ,
                    link:{view:'list',type:'network',fqName:obj['fqName'],context:context},
                    class:tenantNetworkMonitorView,
                    url:constructReqURL($.extend({},obj,{type:'network'})),
                    objectType:'network'
                },{
                    title:'Top Peers',
                    link:{view:'list',type:'peer',fqName:obj['fqName'],context:context},
                    class:tenantNetworkMonitorView,
                    url:constructReqURL($.extend({},obj,{type:'peer'})),
                    objectType:'peer'
                },{
                    title:'Top Ports',
                    link:{view:'list',type:'port',fqName:obj['fqName'],context:context},
                    class:tenantNetworkMonitorView,
                    url:constructReqURL($.extend({},obj,{type:'port'})),
                    objectType:'port'
                },{
                    title :'Top Flows',
                    link:{view:'list',type:'flow',fqName:obj['fqName'],context:context},
                    class:tenantNetworkMonitorView,
                    url:constructReqURL($.extend({},obj,{type:'flow'})),
                    objectType:'flow'
                }];
            data['charts']['id'] = 'project';
        } else if(objType == 'network') {  //Network
            layoutHandler.setURLHashParams({fqName:obj['fqName']},{merge:false});
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
                parseFn : statsParseFn,
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

            //Grids
            data['grids'][1] = {
                url:'/api/tenant/networking/domain/summary?type=network',
                columns : [{
                    field:name,
                    title:'Partially Connected Networks'
                }]
            };
            data['grids'][0] = {
                url: detailURL,
                columns: [{
                    field:'name',
                    title:'Attached Policies'
                }],
                parseFn: function(response) {
                    return response['policyList'];
                }
            }
            
            //Time-series chart
            data['ts-chart'] = {};
            data['ts-chart'] = {
               'url' : constructReqURL($.extend({},obj,{widget:'flowseries'}))
            }

            //Charts
            data['charts'] = [];
            data['charts'][0] = {
                    d : [{
                            title:'Top Ports' ,
                            link:{view:'list',type:'port',fqName:obj['fqName'],context:context},
                            class:tenantNetworkMonitorView,
                            url:constructReqURL({context:'network',type:'port',fqName:obj['fqName']}),
                            objectType:'port',
                            //logScale:10
                        },{
                            title:'Top Peers',
                            link:{view:'list',type:'peer',fqName:obj['fqName'],context:context},
                            url:constructReqURL({context:'network',type:'peer',fqName:obj['fqName']}),
                            objectType:'peer'
                        },{
                            title :'Top Flows',
                            link:{view:'list',type:'flow',fqName:obj['fqName'],context:context},
                            url:constructReqURL({context:'network',type:'flow',fqName:obj['fqName']}),
                            objectType:'flow',
                            //logScale:2
                        }],
                    id:'network',
                    colCount:3
            };
            data['charts'][1] = {
                d: [{
                    title:'Connected Networks Traffic Ingress/Egress',
                    //url:constructReqURL({context:'network',type:'port',fqName:obj['fqName']}),
                    url:'/api/tenant/networking/network/connected/stats/details?fqName=' + obj['fqName'],
                    duration:false,
                    objectType:'connected-nw',
                    columns: [{
                        field:'fromIngress',
                        name:'Ingress',
                        color:defColors[0]
                    }/*,{
                        field:'ingressMisMatch',
                        name:'Ingress MisMatch',
                        color:'red'
                    }*/,{
                        field:'fromEgress',
                        name:'Egress',
                        color:defColors[1]
                    }/*,{
                        field:'egressMisMatch',
                        name:'Egress Mismatch',
                        color:'red'
                    }*/],
                    parseFn: function(response) {
                        var retObj = $.map(response,function(arr,idx) {
                            $.each(arr,function(i,obj) {
                                //Convert to integers
                                $.each(['inBytes','inPkts','outBytes','outPkts'],function(idx,field) {
                                    obj[field] = parseInt(obj[field]);
                                });
                            });
                            return { 
                                name:arr[0]['destVN'],
                                fromIngress:arr[0]['outBytes'], //Bytes sent from Src
                                fromEgress:arr[0]['inBytes'],   //Bytes recieved at Src
                                toIngress:arr[1]['outBytes'],   //Bytes sent from Dst
                                toEgress:arr[1]['inBytes'],     //Bytes received at Dst
                                ingress: Math.min(arr[0]['inBytes'],arr[1]['outBytes']),
                                egress:Math.min(arr[0]['outBytes'],arr[1]['inBytes']),
                                ingressMisMatch : Math.abs(arr[0]['inBytes']-arr[1]['outBytes']),
                                egressMisMatch : Math.abs(arr[0]['outBytes']-arr[1]['inBytes'])
                            }
                        });
                        return retObj;
                    }
                }],
                colCount:1,
                id:'connected-nw'
            }
        } else if(objType == 'connected-nw') {
            //Show Ingress/Egress Traffic in different colors
            data['stats'] = {
                'list' : [
                    { lbl : kendo.format('Ingress/Egress Traffic from {0} to {1}',obj['srcVN'].split(':').pop(),obj['fqName'].split(':').pop()),field:'toNetwork'},
                    { lbl : kendo.format('Egress/Ingress Traffic from {0} to {1}',obj['fqName'].split(':').pop(),obj['srcVN'].split(':').pop()),field:'fromNetwork'}
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
            layoutHandler.setURLHashParams({fqName:obj['fqName'],srcVN:obj['srcVN']});
            template = 'connected-nw-template';
            data['stats']['url'] = constructReqURL($.extend({},obj,{type:'summary'}));
            data['ts-chart'] = {};
            data['ts-chart']['url'] = constructReqURL($.extend({},obj,{widget:'flowseries'}));
            data['charts']['colCount'] = 3;
            data['charts']['id'] = 'network';
            data['charts']['d'] = [{
                    title:'Top Ports' ,
                    link:{view:'list',type:'port',srcVN:obj['srcVN'],fqName:obj['fqName'],context:'connected-nw'},
                    class:tenantNetworkMonitorView,
                    url:constructReqURL({context:'connected-nw',type:'port',fqName:obj['fqName'],srcVN:obj['srcVN']}),
                    objectType:'port'
                },{
                    title:'Top Peers',
                    link:{view:'list',type:'peer',fqName:obj['fqName'],srcVN:obj['srcVN'],context:'connected-nw'},
                    url:constructReqURL({context:'connected-nw',type:'peer',fqName:obj['fqName'],srcVN:obj['srcVN']}),
                    objectType:'peer'
                },{
                    title :'Top Flows',
                    link:{view:'list',type:'flow',fqName:obj['fqName'],srcVN:obj['srcVN'],context:'connected-nw'},
                    url:constructReqURL({context:'connected-nw',type:'flow',fqName:obj['fqName'],srcVN:obj['srcVN']}),
                    objectType:'flow'

                }];
        } else if(objType == 'instance') {
            layoutHandler.setURLHashParams({fqName:obj['srcVN'] + ':Instances:' + obj['fqName'].split(':').pop()});
            template = 'inst-template';
            obj['title'] = kendo.format("Traffic Statistics for Instance - {0} (Network {1})",obj['fqName'],obj['srcVN'].split(':').pop()); 
            data['stats'] = [{},{}];
            data['stats'][0] = {
                'list' : [
                    { 
                        lbl : 'Traffic In',field:'toNetwork'
                    }
                ],
                url:function() {
                    return getInstanceURL($.extend({},obj,{context:'instance',type:'summary'}));
                },
                parseFn:function(response) {
                    return [{   
                        'toNetwork': formatBytes(response['in_bytes']) 
                        }]
                }
            }
            data['stats'][1] = {
                'list' : [
                    { 
                        lbl : 'TrafficOut',field:'fromNetwork',cls:'out'
                    }
                ],
                url:function() {
                    return getInstanceURL($.extend({},obj,{context:'instance',type:'summary'}));
                },
                parseFn:function(response) {
                    return [{   
                        'fromNetwork': formatBytes(response['out_bytes']) 
                        }]
                }
            }
            data['grids'] = {
                url:'/api/tenant/networking/vm/ip-list?vmName=' + obj['fqName'],
                columns : [{
                    field:'fip_ip',
                    title:'Floating IPs'
                }],
                parseFn: function(response) {
                    response = $.map(response['fipList'],function(obj,idx) {
                        obj['fip_ip'] = kendo.format('{0} ({1})',obj['ip_address'],obj['virtual_network']);
                        return obj;
                    });
                    return response;
                }
            };
            data['ts-chart'] = {};
            data['ts-chart']['url'] = function() {
                return getInstanceURL($.extend({},obj,{context:'instance',widget:'flowseries'}));
            };
            function getInstanceURL(obj) {
                var vmIntfObj = $('#dropdownIP').data('kendoDropDownList').dataItem();
                return constructReqURL($.extend({},obj,{ip:vmIntfObj['ip_address'],vnName:vmIntfObj['virtual_network'],vmName:obj['fqName'],vmVnName:vmIntfObj['vm_vn_name']}));
            }
            data['charts']['colCount'] = 3;
            data['charts']['id'] = 'instance';
            data['charts']['d'] = [{
                    title:'Top Ports' ,
                    link:{view:'list',type:'port',fqName:obj['fqName'],srcVN:obj['srcVN'],context:'instance'},
                    class:tenantNetworkMonitorView,
                    //url:constructReqURL({context:'instance',type:'port',fqName:obj['fqName']})
                    url:function() {
                        return getInstanceURL($.extend({},obj,{context:'instance',type:'port'}));
                    },
                    objectType:'port'
                },{
                    title:'Top Peers',
                    link:{view:'list',type:'peer',fqName:obj['fqName'],srcVN:obj['srcVN'],context:'instance'},
                    //url:constructReqURL({context:'instance',type:'peer',fqName:obj['fqName']})
                    url: function() {
                        return getInstanceURL($.extend({},obj,{context:'instance',type:'peer'}));
                    },
                    objectType:'peer'
                },{
                    title :'Top Flows',
                    link :{view:'list',type:'flow',fqName:obj['fqName'],srcVN:obj['srcVN'],context:'instance'},
                    //url:constructReqURL({context:'instance',type:'flow',fqName:obj['fqName']}),
                    url: function() {
                        return getInstanceURL($.extend({},obj,{context:'instance',type:'flow'}));
                    },
                    objectType:'flow'
                }];
        } else if(objType == 'portdetail') {
            layoutHandler.setURLHashParams($.extend(obj,{view:'summary'}),{merge:false});
            template = 'port-detail-template';
            if(obj['context'] == 'instance') {
                obj['title'] = kendo.format('Traffic Statistics for Protocol {2} Port {0} {1}',obj['port'], getTitleFromContextObj(obj),formatProtocol(obj['protocol']));
                obj['gridTitle'] = kendo.format('Top Peers for Protocol {2} Port {0} {1}',obj['port'], getTitleFromContextObj(obj),formatProtocol(obj['protocol']));
            } else {
                obj['title'] = kendo.format('Traffic Statistics for Protocol {2} Port {0} ({1})',obj['port'], getTitleFromContextObj(obj),formatProtocol(obj['protocol']));
                obj['gridTitle'] = kendo.format('Top Peers for Protocol {2} Port {0} ({1})',obj['port'], getTitleFromContextObj(obj),formatProtocol(obj['protocol']));
            }
            data['ts-chart'] = {};
            data['ts-chart']['url'] = constructReqURL($.extend({},obj,{widget:'flowseries'}));
            data['grids'] = {
                url:constructReqURL($.extend({},obj,{type:'peer',view:'list'})),
                columns : peerColumns
            };
        } else if(objType == 'peerdetail') {
            template = 'port-detail-template';
            layoutHandler.setURLHashParams($.extend(obj,{view:'summary'}),{merge:false});
            obj['title'] = kendo.format('Traffic Statistics for {0} ({1})',obj['ip'], obj['vnName']);
            obj['gridTitle'] = kendo.format('Top Ports for {0} ({1})',obj['ip'], obj['vnName']);
            data['ts-chart'] = {};
            data['ts-chart']['url'] = constructReqURL($.extend({},obj,{context:'instance',widget:'flowseries'}));
            data['grids'] = {
                url:constructReqURL($.extend({},obj,{type:'port',context:'instance',view:'list'})),
                columns : portColumns
            };
        }
        var summaryTemplate = kendo.template($('#' + template).html());
        $(pageContainer).html(summaryTemplate(obj));
        //$('#main-container').find('.summary-view');
        var contentElem = $(pageContainer);

        var contextObj = getContextObj(obj);
        $.extend(data,contextObj);
        //Load the data for the components not handled by initTemplates
        //Also, feed the data if same dataSource URL is used for multiple components
        if(obj['type'] == 'instance') {
            function onInstanceIntfChange(e,refresh) {
                var refresh = ifNull(refresh,true);
                var ip = getSelInstanceFromDropDown()['ip'];
                $('.example-title.main').html(function(idx,oldHtml) {
                    var str = $.trim(oldHtml);
                    return str.replace(/(.* -) ([^ ]*) (\(.*\))/,'$1 ' + ip + ' $3');
                });
                if(refresh == true) {
                    monitorRefresh();
                }
            }
            var dropdownIP = contentElem.find('.z-dropdown').kendoDropDownList({
                    //template:'#= data.ip_address # (#= data.virtual_network#)',
                    dataTextField:'name',
                    dataSource: {
                        transport: {
                            read: {
                                url:'/api/tenant/networking/vm/ip-list?vmName=' + obj['fqName']
                            }
                        },
                        schema: {
                            parse:function(response) {
                                if(response['ipList'].length > 0) {
                                    setTimeout(function() {
                                        $(pageContainer).initTemplates(data);
                                        onInstanceIntfChange(null,false);
                                        },200);
                                } else {
                                    $('.ts-chart').html("<div class='no-data'><div class='no-data-text'>Error in fetching Instance IP List</div></div>");
                                    $('.z-dropdown').hide();
                                    $('.flow-series.sub-title').hide();
                                }
                                response['ipList'] = $.map(response['ipList'],function(obj,idx) {
                                    obj['name'] = kendo.format('{0} ({1})',obj['ip_address'],obj['virtual_network']);
                                    return obj;
                                });
                                return response['ipList'];
                            }
                        },
                        requestEnd: function(e) {
                        }
                    },
                    change:onInstanceIntfChange
                }).data('kendoDropDownList');
        }

        if(obj['type'] == 'network') {
            $('#network-tabs').kendoTabStrip({
                activate: function() {
                    var unUsedHeight = $('#network-tabs').find('.k-content').filter(':visible').getUnusedSize('height');
                    $('#network-tabs').find('.k-content').filter(':visible').height(unUsedHeight);
                    logMessage('tenantMonitorNetwork','tab content height',$('#network-tabs').find('.k-content').filter(':visible').parent().height());
                    }
                }).data('kendoTabStrip').select(0);
                $(pageContainer).initTemplates(data);
        /*} else if(obj['type'] == 'domain') {
            domainDeferredObj.done(function(d) {
                data['charts']['chartType'] = 'bubble';
                data['charts']['d'] = [
                    {title:'Projects',xLbl:'Intf Count',yLbl:'VN Count',d:[{key:'Control Nodes',values:d['projectsData']}],
                        link:{hashParams:{q:{view:'list',type:'project',fqName:obj['fqName'],context:'domain'}}},tooltipFn:tenantNetworkMonitor.projectTooltipFn},
                    {title:'Networks',xLbl:'Intf Count',yLbl:'Connected NW Count',d:[{key:'Analytics Nodes',values:d['networksData']}],
                        link:{hashParams:{q:{view:'list',type:'network',fqName:obj['fqName'],context:'domain'}}},tooltipFn:tenantNetworkMonitor.networkTooltipFn}];
                $(pageContainer).initTemplates(data);
            });*/
        } else if(obj['type'] == 'instance') {

        } else
            $(pageContainer).initTemplates(data);   //We are not passing the contextObj to initTemplates as context is already encoded in URL

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
        //Reduce the main-container width by 20px to compensate the padding in tree
        var mainContainerWidth = $('#splitter #page-container').width();
        $('#splitter #page-container').width(mainContainerWidth - 40);
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
                if(hashObj['srcVN'] != null)  {
                    //Connected Network
                    dataItem = selTreeNode({fqName:hashObj['srcVN']+':Connected Networks:' + hashObj['fqName'].split(':').pop(),expand:true,selectFirst:true,trigger:false}); 
                    if(dataItem != false) {
                        objSummaryView.load({context:'connected-nw',type:'connected-nw',fqName:hashObj['fqName'],srcVN:hashObj['srcVN']}); 
                    }
                } else {
                    dataItem = selTreeNode({fqName:hashObj['fqName'],expand:true,selectFirst:true,trigger:false}); 
                    if(dataItem != false) {
                        if(fqNameLen == 1) {     //Domain
                            objSummaryView.load({context:'domain',type:'domain',fqName:hashObj['fqName']}); 
                        } else if(fqNameLen == 2) {    //Project
                            objSummaryView.load({context:'project',type:'project',fqName:hashObj['fqName']}); 
                        } else if(fqNameLen == 3) {
                            objSummaryView.load({uuid:dataItem.get('uuid'),context:'network',type:'network',fqName:hashObj['fqName']}); 
                        } else if(fqNameLen > 2) {   //Instance
                            var matchArr = hashObj['fqName'].match(/(.*):Instances:(.*)/);
                            objSummaryView.load({type:'instance',fqName:matchArr[2],srcVN:matchArr[1]}); 
                        }
                    } else {
                        //Select default page

                    }
                }
            } else if(hashObj['view'] != null) {
                if(hashObj['fqName'] != null) {
                    selTreeNode({fqName:hashObj['fqName'],expand:true,selectFirst:true,trigger:false}); 
                } else {
                    //Select default view
                    selTreeNode({expand:true,selectFirst:true,trigger:false}); 
                }
                subViews[hashObj['view']].load(hashObj);
            } else {
                selTreeNode({expand:true,selectFirst:true,trigger:false}); 
            }
        } else {
            selTreeNode({expand:true,selectFirst:true,trigger:false}); 
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
        //self.setSplitterHeight();
        $('#splitter').kendoSplitter({
                panes:[
                        {resizable:true,size:'200px'},
                        {resizable:true}
                        //{collapsible:true,resizable:true,size:'300px',collapsed:true}
                    ]});

        self.initProjectTree("#treeNetworkTopology");
        initializeRefreshBtn();
    }

    var subViews = {list:objListView,summary:objSummaryView};
    this.loadSubView = function(obj) {
        if(obj['view'] != "") {
            subViews[obj['view']].load(obj); 
            //subViews[obj['view']].load({fqName:'default-domain',type:'network'}); 
        }
    }

    this.resetViewHeight = function() {
        //Instead of resetting the height,let's make the height enough to accomodate content height
        var mainContainerHeight = $(pageContainer).outerHeight();
        var viewHeight = layoutHandler.getViewHeight();
        if(viewHeight > mainContainerHeight)
            mainContainerHeight = viewHeight;
        /*else 
            mainContainerHeight = mainContainerHeight + 30;*/
        $('#splitter').height(mainContainerHeight);
        $('#splitter .k-splitbar').height(mainContainerHeight);
        $('.splitter-pane').height(mainContainerHeight);
    }

    //To avoid scrollbar for the main container
    this.resetLayoutHeight = function() {
        window.setTimeout(self.resetViewHeight,200);
    }

    this.setSplitterHeight = function() {
        $('#splitter').height(layoutHandler.getViewHeight());
    }

    this.initProjectTree = function(selector) {
        treeView = $(selector).kendoTreeView({
            template: "#= formatNodeTextInTree(item) #",
            dataSource: new kendo.data.HierarchicalDataSource({
                transport: {
                    read: {
                        url:'/api/tenant/monitoring/topology',
                        //contentType: "application/json",
                        //type: "GET",
                    }
                },
                error: function(e) {
                    $('.treeview-back').html('An unexpected error occured.<br/>Please try reloading the page');
                    $(pageContainer).html('An unexpected error occured.<br/>Please try reloading the page');
                },
                requestEnd: function(e) {
                    if((e != null) && (e.response != null)) {
                    //Need to check if there is any event that triggers on widget initialization complete
                        setTimeout(function() {
                            $('#tree-loading').html('');
                            $('#treeNetworkTopology').css('visibility','visible');
                            self.updateViewByHash(layoutHandler.getURLHashParams());
                        },200);
                    }
                },
                schema: {
                    model: {
                        children:'items'
                    },
                    data:function(response) {
                        return response;
                    },
                },
            }),
            dataTextField: [ "name", "name","name","name"],
            //select:onNodeSelect,
            //change:onNodeSelect,
            expand:onNodeExpand
        }).data('kendoTreeView');

        initTreeNodeClickListener(selector,onNodeSelect);
        
        function onNodeSelect(e) {
            var levels = {domain:0,project:1,vn:2,label:3,vm:4,connectedvn:4};
            //console.info(this.text(e.node));
            var dataItem = treeView.dataItem(e.node);
            var level = dataItem.level();
            var name = dataItem.get('name');
            var uuid = dataItem.get('uuid');
            var fqNameArr = dataItem.fq_name;
            //Clicking on Level @("Connected Networks","Instances"),select the first child element
            if(level == levels.label) {
                treeView.expand(e.node);
                //Clicking on "Connected Networks" node,select the first connected network
                var firstChildNode = $(e.node).find('ul li:nth-child(1)');
                if(firstChildNode.length > 0) {
                    window.setTimeout(function() {treeView.select(firstChildNode); },500);
                    treeView.trigger('select',{node:firstChildNode});
                    $(firstChildNode).trigger('click');
                    return;
                } else
                    return;
            }
            if(currView != null) {
                currView.destroy();
            }
            //Show loading mask
            showLoadingMask();

            //On loading a new screen,reset globalObj.startDt and globalObj.endDt
            delete globalObj['startDt'];
            delete globalObj['endDt'];

            //contView.destroy();
            if(level == levels.domain) {
               objSummaryView.load({context:'domain',type:'domain',fqName:name}); 
            } else if(level == levels.project) {
               objSummaryView.load({context:'project',type:'project',fqName:fqNameArr.join(':')}); 
            } else if(level == levels.vn) {
                objSummaryView.load({uuid:uuid,context:'network',type:'network',fqName:fqNameArr.join(':')}); 
            } else if(level == levels.label) {
            } else if($.inArray(level,[levels.vm,levels.connectedvn]) > -1) {
                var parentNode = dataItem.parentNode();
                var parentText = parentNode.name;
                var networkNode = parentNode.parentNode();
                var network = networkNode.name;
                var projectNode = networkNode.parentNode();
                var project = projectNode.name;
                var domainNode = projectNode.parentNode();
                if(parentText == 'Connected Networks') {
                    var arrSrcVn = [domainNode.name,project,network];
                    objSummaryView.load({context:'connected-nw',type:'connected-nw',fqName:fqNameArr,srcVN:arrSrcVn.join(':')}); 
                } else if(parentText == 'Instances') {
                    var arrSrcVn = [domainNode.name,project,network];
                    objSummaryView.load({type:'instance',fqName:fqNameArr,srcVN:arrSrcVn.join(':')}); 
                }
            }

            //We need not hide the loading mask as the content will be overwritten??
            //hideLoadingMask();
        }
    }

    function onNodeExpand(e) {
        var expandNode = e.node;
        var level = treeView.dataItem(expandNode);
        //Select all siblings except the current one 
        var prevNodes = $(expandNode).prevAll();
        var nextNodes = $(expandNode).nextAll();
        //Combine 2 jquery selectors
        var siblingNodes = prevNodes.add(nextNodes);
        for(var i=0;i<siblingNodes.length;i++) {
            var currNode = siblingNodes[i];
            treeView.collapse(currNode);
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
function formatNodeTextInTree(item) {
    logMessage('Hello');
    if(item['fq_name'] != null) {
        var parents = [],tmp;
        tmp = item;
        while((tmp = tmp.parent()) != null) {
            if(tmp.length == null)
                parents.push(tmp);
        }
        if((parents[0] != null) && (parents[0]['name'] == 'Connected Networks')) {
            var fqNameArr = item.fq_name.split(':')
            if((fqNameArr[0] == parents[3].name) && (fqNameArr[1] == parents[2].name) && (fqNameArr[2] == parents[1].name))
                return fqNameArr.pop() + ' (Self)';
            else if((fqNameArr[0] == parents[3].name) && (fqNameArr[1] == parents[2].name))
                return fqNameArr.pop();
        }
    }
    return item.name;
}

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
