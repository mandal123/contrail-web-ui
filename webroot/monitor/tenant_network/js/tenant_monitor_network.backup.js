/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

//@@ sourceURL=tenant_monitor_network.js

function tenantNetworkMonitorClass() {
    var self = this;
    this.timeObj = {};
    var treeView = null,currView = null;
    
    //Pass on the window resize event to the respective view
    this.onWindowResize = function() {
        return;
        //Reduce the main-container width by 20px to compensate the padding in tree
        var mainContainerWidth = $('#splitter #main-container').width();
        $('#splitter #main-container').width(mainContainerWidth - 40);
    }

    this.destroy = function() {
        //To unload dynamically loaded javascript,ensure that you define it inside a closure 
        //so that there will be only one handle to that closure execution context and can be
        //removed easily.
        delete projView;
        delete projectView;
        delete contView;
        delete contentView;
        delete vnView;
        delete networkView;
        delete instView;
        delete instanceView;
        delete vnLinkView;
        delete linkView;
    }

    this.updateViewByHash = function(hashObj) {
        //If there is any hash string present in the URL,select that node accordingly
        if((hashObj != null) && (hashObj != '')) {
            selTreeNode(null,hashObj);
        } else {
            treeView.select('.k-first');
            treeView.trigger('select',{node:$('#treeview-images .k-first')});
        }
    }

    this.load = function() {
        var monitorTemplate = kendo.template($("#monitor-template").html());
        $('#container').html('');
        $('#container').html(monitorTemplate);
        self.setSplitterHeight();
        $('#splitter').kendoSplitter({
                panes:[
                        {resizable:true,size:'200px'},
                        {resizable:true}
                        //{collapsible:true,resizable:true,size:'300px',collapsed:true}
                    ]});

        self.initProjectTree("#treeview-images");
    }

    this.resetViewHeight = function() {
        //Instead of resetting the height,let's make the height enough to accomodate content height
        var mainContainerHeight = $('#main-container').outerHeight();
        var viewHeight = layoutHandler.getViewHeight();
        if(viewHeight > mainContainerHeight)
            mainContainerHeight = viewHeight;
        /*else 
            mainContainerHeight = mainContainerHeight + 30;*/
        $('#splitter').height(mainContainerHeight);
        $('#splitter .k-splitbar').height(mainContainerHeight);
        $('.splitter-pane').height(mainContainerHeight);
        //console.info("Hello");
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
            dataSource: new kendo.data.HierarchicalDataSource({
                transport: {
                    read: {
                        url:'/api/tenants/projects/tree',
                        //contentType: "application/json",
                        //type: "GET",
                    }
                },
                error: function(e) {
                    $('.treeview-back').html('An unexpected error occured.<br/>Please try reloading the page');
                    $('#main-container').html('An unexpected error occured.<br/>Please try reloading the page');
                },
                requestEnd: function(e) {
                    if((e != null) && (e.response != null)) {
                    //Need to check if there is any event that triggers on widget initialization complete
                        setTimeout(function() {
                            $('#tree-loading').html('');
                            $('#treeview-images').css('visibility','visible');
                            self.updateViewByHash();
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
                    parse:function(response) {
                        var data =response;
                        for(var i=0;i<response.length;i++) {
                            var currProj = response[i];
                            for(var j=0;j<currProj.items.length;j++) {
                                var currVN = currProj.items[j];
                                for(var m=0;m<currVN['items'][0]['items'].length;m++) {
                                    var currLink = currVN['items'][0]['items'][m];
                                    var fq_name = currLink['name'].split(':');
                                    if(fq_name[1] == currProj['name']) {
                                        currLink['name'] = fq_name[2];
                                        if(currLink['name'] == currVN['name']) 
                                            currLink['name'] += ' (Self)';
                                    }
                                }
                            }
                        }
                        /*
                        return [{
                                    name:'default-domain',
                                    items:data
                            }];*/
                        return data;
                    }
                },
            }),
            dataTextField: [ "name", "name","name","name"],
            select:onNodeSelect,
            expand:onNodeExpand
        }).data('kendoTreeView');
        
        function onNodeSelect(e) {
            //var levels = {domain:0,project:1,vn:2,label:3,vm:4,connectedvn:4};
            var levels = {domain:-1,project:0,vn:1,label:2,vm:3,connectedvn:3};
            //try {
                //console.info(this.text(e.node));
                var dataItem = treeView.dataItem(e.node);
                var level = dataItem.level();
                var name = dataItem.get('name');
                //Clicking on Level @("Connected Networks","Instances"),select the first child element
                if(level == levels.label) {
                    treeView.expand(e.node);
                    //Clicking on "Connected Networks" node,select the first connected network
                    var firstChildNode = $(e.node).find('ul li:nth-child(1)');
                    if(firstChildNode.length > 0) {
                        window.setTimeout(function() {treeView.select(firstChildNode); },500);
                        treeView.trigger('select',{node:firstChildNode});
                        return;
                    } else
                        return;
                }
                if(currView != null) {
                    currView.destroy();
                }
                //Show loading mask
                showLoadingMask();

                //contView.destroy();
                if(level == levels.project) {
                    currView = projView;
                    var fqNameArr = dataItem.get('fq_name');
                    var q = fqNameArr.join(':');
                    layoutHandler.setURLHashParams(q);
                    projView.load({'fq_name':fqNameArr,'uuid':dataItem.get('uuid'),'name':name});
                } else if(level == levels.vn) {
                    currView = vnView;
                    var fqNameArr = dataItem.get('fq_name');
                    var q = fqNameArr.join(':');
                    layoutHandler.setURLHashParams(q);
                    vnView.load({'fq_name':fqNameArr,'name':name});
                } else if(level == levels.label) {
                } else if($.inArray(level,[levels.vm,levels.connectedvn]) > -1) {
                    var parentText = dataItem.parentNode().name;
                    var networkNode = dataItem.parentNode().parentNode();
                    var network = networkNode.name;
                    var projectNode = networkNode.parentNode();
                    var project = projectNode.name;
                    if(parentText == 'Connected Networks') {
                        currView = vnLinkView;
                        var arrFqName = dataItem.get('fq_name').split(':');
                        var arrSrcVn = ['default-domain',project,network],arrDstVn = arrFqName;
                        var q = arrSrcVn.join(':') + ':Connected Networks:' + arrFqName[arrFqName.length-1];
                        layoutHandler.setURLHashParams(q);
                        currView.load({'network':network,'project':project,'srcvn':arrSrcVn,'dstvn': arrDstVn,'name':name});
                    } else if(parentText == 'Instances') {
                        currView = instView;
                        var arrFqName = ['default-domain',project,network];
                        var q = arrFqName.join(':') + ':Instances:' + name;
                        layoutHandler.setURLHashParams(q);
                        currView.load({'network':network,'project':project,'fq_name':arrFqName,'name':name});
                    }
                }
            /*} catch(e) {
                alert('Unexpected error occured');
            }*/

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
var tenantNetworkMonView = new tenantNetworkMonitorClass();

domainView = function() {


}
domainView.prototype = tenantNetworkMonView;

projectView = function() {
    var that = this; 
    var self = this;
    this.projData;
    this.projInfo;
    this.deferred;
    this.load = function(obj) {
        that.projInfo = obj;
        var uuid = obj['uuid'];
        this.deferred = $.Deferred();
        this.getProjectData(obj)
        this.deferred.done(function() {
            that.populateDetails(that.projData,obj);
            //window.setTimeout(tenantNetworkMonitor.resetLayoutHeight,200);
            self.resetLayoutHeight();
        });
    }
    this.getProjectData = function(obj) {
        var retObj;
        $.ajax({
            url: "/api/tenants/project-details/" + obj['fq_name'].join(':'),
            success: function(result) {
                that.projData = result;
                that.deferred.resolve();
            }
        });
    }

    var getNegatedArray = function(arr) {

    }

    this.refreshCharts = function(chartType) {
        $('.intervn-traffic-chart').data('kendoChart').destroy();
        $('.intervn-traffic-chart').html('');
        $('.vn-traffic-chart').data('kendoChart').destroy();
        $('.vn-traffic-chart').html('');
        var data = that.projData;
        var negate = false;
        
        initStackedChart('.vn-traffic-chart',data['virtual-networks'],[{field:'inBytes',name:'Traffic In'},
            {field:'outBytes',name:'Traffic Out'}],{tooltipTemplate:'dataItem.fq_name',assignBarClick:true,chartType:chartType});
        if(chartType == 'bar')
            negate = true;
        initStackedChart('.intervn-traffic-chart',data['virtual-networks'],[{field:'interVNInBytes',name:'Traffic In'},
            {field:'interVNOutBytes',name:'Traffic Out'}],{assignBarClick:true,negate:negate,chartType:chartType});
    }

    this.populateDetails = function() {
        var data = that.projData;
        var obj = that.projInfo;
        var projectTemplate = kendo.template($("#project-template").html());
        $('#main-container').html(projectTemplate(obj));
        $('#main-container').css('background-color','white');
        //initToggleOptions('#toggle-chartType');
        //initToggleOptions('#toggle-chartInterval');
        initConfigLinks('.config-links');
        //Stats-row container
        var statsRowTemplate = kendo.template($('#stats-row-template').html());
        //var statsRowTemplate = kendo.template($('#stats-portlet').html());
        var statsObj = [{'lbl':'Total Traffic In','cls':'proj-traffic-in'},
                        {'lbl':'Total traffic Out','cls':'proj-traffic-out'},
                        {'lbl':'Inter VN Traffic In','cls':'intervn-traffic-in'},
                        {'lbl':'Inter VN Traffic Out','cls':'intervn-traffic-out'}];
        $('.project-stats').addClass('margin-auto');
        $('.project-stats').addClass('stats-row');
        $('.project-stats').addClass('table');
        $('.project-stats').html(statsRowTemplate(statsObj));

        var vns = data['virtual-networks'];
        var inBytes =0,outBytes=0,interVNInBytes=0,interVNOutBytes=0;
        for(var i=0;i<vns.length;i++) {
            inBytes += parseInt(vns[i]['inBytes'] || 0);
            outBytes += parseInt(vns[i]['outBytes'] || 0);
            interVNInBytes += vns[i]['interVNInBytes'] || 0;
            interVNOutBytes += vns[i]['interVNOutBytes'] || 0;
        }
        data['inBytes'] = inBytes;
        data['outBytes'] = outBytes;
        data['interVNInBytes'] = interVNInBytes;
        data['interVNOutBytes'] = interVNOutBytes;

        var container = $("#main-container"),
        sparklineOptions = function(field, color, data) {
            return {
                dataSource: data || getEventsData(),
                series: [{
                    field: field,
                    color: color
                }],
                seriesDefaults: {
                    type: "line",
                    markers: { visible: false },
                    line: { width: 2 }
                },
                axisDefaults: {
                    visible: false,
                    majorGridLines: { visible: false }
                },
                legend: { visible: false }
            };
        };

        container
            .find(".proj-traffic-in").text(formatBytes(data['inBytes'])).end()
            .find(".proj-traffic-out").text(formatBytes(data['outBytes'])).end()
            .find(".intervn-traffic-in").text(formatBytes(data['interVNInBytes'])).end()
            .find(".intervn-traffic-out").text(formatBytes(data['interVNOutBytes'])).end()

        var chartType,negate;
        if(data['virtual-networks'].length <= 5)
            chartType = 'column';
        else {
            chartType = 'bar';
            negate = true;
        }
        initStackedChart('.vn-traffic-chart',data['virtual-networks'],[{field:'inBytes',name:'Traffic In'},
                        {field:'outBytes',name:'Traffic Out'}],
                        {tooltipTemplate:'dataItem.fq_name',assignBarClick:true,chartType:chartType});
        initStackedChart('.intervn-traffic-chart',data['virtual-networks'],[{field:'interVNInBytes',name:'Traffic In'},
            {field:'interVNOutBytes',name:'Traffic Out'}],{assignBarClick:true,negate:negate,chartType:chartType});

        kendoChartLib.initChartTypesBar('#toggle-projectCharts','#project-charts',chartType);
    }

    this.destroy = function() {
        if($('#vn-app-chart').data('kendoChart') != null)
            $('#vn-app-chart').data('kendoChart').destroy();

        if($('#vn-external-chart').data('kendoChart') != null)
            $('#vn-external-chart').data('kendoChart').destroy();

        contView.destroy();
    }
}
projectView.prototype = tenantNetworkMonView;

instanceView = function() {
    var self = this;
    this.instData,this.deferred;
    this.load = function(obj) {
        this.deferred = $.Deferred();
        var instData = this.getInstanceData(obj);
        this.deferred.done(function() {
            self.populateDetails(self.instData,obj)
            //window.setTimeout(tenantNetworkMonitor.resetLayoutHeight,200);
            self.resetLayoutHeight();
        });
    }
    this.getInstanceData = function(obj) {
        var fq_name = obj['fq_name'].slice(0,2);
        fq_name.push(obj['name']);
        //If UUID name is displayed
        if(obj['name'].match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)) {
            fq_name = [obj['name']];
        }
        $.ajax({
            url:'/api/tenants/vn-traffic/' + fq_name.join(':'),
            success: function(result) {
                self.instData  = result;
                self.deferred.resolve();
            }
        });
    }
    this.populateDetails = function(data,obj) {
        var instData = self.instData;
        var instanceTemplate = kendo.template($("#instance-template").html());
        obj['ip'] = instData['ip'] || '1.1.1.1';
        obj['floatingIPs'] = instData['floating_ip']
        obj['trafficIn'] = formatBytes(instData['int-stat']['inBytes']);
        obj['trafficOut'] = formatBytes(instData['int-stat']['outBytes']);
        obj['totTrafficIn'] = formatBytes(instData['int-stat']['inBytes'] + instData['ext-stat']['inBytes']);
        obj['totTrafficOut'] = formatBytes(instData['int-stat']['outBytes'] + instData['ext-stat']['outBytes']);
        obj['network'] = obj['fq_name'][2];
        $('#main-container').html(instanceTemplate(obj));

        var statsRowTemplate = kendo.template($('#stats-row-template').html());
        var instTrafficObj = [{'lbl':'Traffic In','value':obj['trafficIn']},
                            {'lbl':'Traffic Out','value':obj['trafficOut']}];
        $('.inst-traffic-stats').html(statsRowTemplate(instTrafficObj));

        var instTotalStatsObj = [{'lbl':'Traffic In','value':obj['totTrafficIn']},
                                {'lbl':'Traffic Out','value':obj['totTrafficOut']}];
        $('.inst-total-stats').html(statsRowTemplate(instTotalStatsObj));

        var instSummaryStats = [{cls:'small',lbl:'IP Addresses',value:obj['floatingIPs'].join('<br/>')}];
        $('.inst-summary-stats').html(statsRowTemplate(instSummaryStats));

        initStackedChart('#instance-chart',data['virtual-network'],[{field:'inBytes',name:'Traffic In'},{field:'outBytes',name:'Traffic Out'}]);
    }
    function processInstData(data) {

    }
    this.destroy = function() {
        contView.destroy();
    }
}
instanceView.prototype = tenantNetworkMonView;

linkView = function() {
    var self = this;
    this.linkData,this.deferred;
    this.linkInfo;
    this.load = function(obj) {
        this.linkInfo = obj;
        this.getLinkData();

        //populateVNLinkDetails(linkData);
    }
    this.getLinkData = function() {
        var obj = {};
        self.linkInfo['src_vn'] = self.linkInfo['srcvn'].join(':');
        self.linkInfo['dst_vn'] = self.linkInfo['dstvn'].join(':');
        self.linkInfo['timeSlice'] = DEFAULT_TIME_SLICE;
        self.deferred = $.Deferred();
        var flowData = getFlowData(self.linkInfo,self.deferred);
        self.deferred.done(function(data) {
            self.linkData = data;
            self.populateDetails(data,obj);
            //window.setTimeout(tenantNetworkMonitor.resetLayoutHeight,200);
            self.resetLayoutHeight();
        });
    }

    this.refreshFlowData = function(timeSlice) {
        self.linkInfo['timeSlice'] = timeSlice;
        self.dataDeferredObj = $.Deferred();
        getFlowData(self.linkInfo,self.dataDeferredObj);
        self.dataDeferredObj.done(function(data) {
            self.linkData['tsData'] = data['tsData'];
            //$('#chart-top').data('kendoStockChart').dataSource.data(self.networkData['tsData']);
            initTimeSeriesChart('#link-chart-top',self.linkData['tsData']);
        });
    }

    this.populateDetails = function(data) {
        var linkTemplate = kendo.template($("#vn-link-template").html());
        $('#main-container').html(linkTemplate(self.linkInfo));
        initTimeSeriesChart("#link-chart-top",data['tsData']);
        //kendoChartLib.initChartTypesBar('#ts-chart-types',vnLinkView.setTSChartType,true);
        kendoChartLib.initIntervalTypesBar('#link-ts-interval',vnLinkView.refreshFlowData,true);
        var chartType='column',negate=false;
        //If either "top apps" or "top peers" is > 5,display it as bar chart
        if((data['appData'].length > 5) || (data['peerData'].length > 5)) {
            chartType = 'bar';
            negate = true;
        }
        initStackedChart('.link-app-chart',data['appData'],[{field:'inBytes',name:'Traffic In'},{field:'outBytes',name:'Traffic Out'}],{chartType:chartType});
        initStackedChart('.link-peer-chart',data['peerData'],[{field:'inBytes',name:'Traffic In'},{field:'outBytes',name:'Traffic Out'}],{negate:negate,chartType:chartType});
        kendoChartLib.initChartTypesBar('#toggle-linkCharts','#project-charts',chartType);
    }

    this.setTSChartType = function(chartType) {
        kendoChartLib.setChartType('#link-chart-top',chartType);
    }

    this.destroy = function() {
        if(($('#link-chart-top') != null) && ($('#link-chart-top').data('kendoStockChart') != null))
            $('#link-chart-top').data('kendoStockChart').destroy();
        contView.destroy();
    }
}
linkView.prototype = tenantNetworkMonView;

networkView = function() {
    var self = this;
    this.networkData,this.deferred;
    this.networkInfo = {};
    this.timer = $.timer(function() {self.refreshFlowData()});
    this.tsChart;

    this.loadStatic = function() {
        this.load({'fq_name':['default-domain','admin','vn8'],'name':'vn8'}) 
    }

    this.load = function(obj) {
        this.networkInfo = obj;
        //Render Template
        this.getNetworkData(obj);
        this.deferred = $.Deferred();
        this.deferred.done(function() {
                self.populateDetails(self.networkData,obj)
                //window.setTimeout(tenantNetworkMonitor.resetLayoutHeight,200);
                self.resetLayoutHeight();
                //Set timer for autorefresh
                //self.timer.set({time:5000,autoStart:true});
                self.timer.set({time:5000});
                //self.timer.play();
            });
    }

    this.populateDetails = function(data,obj) {
        var networkTemplate = kendo.template($("#network-template").html());
        var appData = data['appData'];
        var tsData = data['tsData'];
        var peerData = data['peerData'];
        var interVNData = data['interVNData'];
        $('#main-container').html(networkTemplate({'name':obj['name']}));
        var linkCnt = 0,interVNTotalIn = formatBytes(0),interVNTotalOut = formatBytes(0);
        if((keys(interVNData) != 0) && (typeof(interVNData['interVNData']) != 'undefined') && (interVNData['interVNData'].length)) {
            linkCnt = interVNData['interVNData'].length;
            interVNTotalIn = formatBytes(interVNData['interVNTrafficIn']);
            interVNTotalOut = formatBytes(interVNData['interVNTrafficOut']);
        } 

        $('#network-tabs').kendoTabStrip({
        }).data('kendoTabStrip').select(0);

        var statsRowTemplate = kendo.template($('#stats-row-template').html());
        var statsObj = [{'lbl':'Connected Networks','value':linkCnt},
                        {'lbl':'All Connected Networks Traffic In','value':interVNTotalIn},
                        {'lbl':'All Connected Networks Traffic Out','value':interVNTotalOut}];
        $('.connected-vn-stats').html(statsRowTemplate(statsObj));
        initTimeSeriesChart("#chart-top",tsData);
        self.tsChart = $('#chart-top').data('kendoStockChart');
        //Initialize chart types bar
        //kendoChartLib.initChartTypesBar('#ts-chart-types',vnView.setTSChartType,true);
        kendoChartLib.initIntervalTypesBar('#network-ts-interval',vnView.refreshFlowData,true);
        if(data['interVNData']['interVNData'] != null)
            interVNData = data['interVNData']['interVNData'];
        else
            interVNData = [];
        var chartType='column',negate=false;
        //If either "top apps" or "top peers" is > 5,display it as bar chart
        if((appData.length > 5) || (peerData.length > 5)) {
            chartType = 'bar';
            negate = true;
        }
        initStackedChart('.vn-app-chart',appData,[{field:'inBytes',name:'Traffic In'},{field:'outBytes',name:'Traffic Out'}],{chartType:chartType});
        initStackedChart('.vn-peer-chart',peerData,[{field:'inBytes',name:'Traffic In'},{field:'outBytes',name:'Traffic Out'}],{negate:negate,chartType:chartType});
        kendoChartLib.initChartTypesBar('#toggle-networkCharts','#project-charts',chartType);

        //Clicking on a VN bar in 'Connected Networks' page need to take to the corresponding VN link page
        for(var i=0;i<interVNData.length;i++) {
            var arrFqName = interVNData[i]['fq_name'];
            var dstVN = arrFqName[arrFqName.length-1];
            arrFqName.pop();
            //arrFqName.push(interVNData[i]['name']);
            arrFqName.push(obj['name']);
            arrFqName.push('Connected Networks');
            arrFqName.push(dstVN);
            interVNData[i]['fq_name'] = arrFqName;
        }

        initStackedChart('#vn-external-chart',interVNData,[{field:'inBytes',name:'Traffic In'},{field:'outBytes',name:'Traffic Out'}],{assignBarClick:true});
        //Initialize checkbox
        $('#chkbox-refresh').on('click',function() {
            if($(this).is(':checked')) {
                //console.info('checked');
                self.timer.play();
            } else {
                self.timer.stop();
            }
        });
    }

    this.setTSChartType = function(chartType) {
        kendoChartLib.setChartType('#chart-top',chartType);
    }

    processFlowData = function(obj,data,deferredObj) {
        var tsData = processTSData(obj,data);
        var appData = processAppData(data);
        var peerData = processPeerData(data);
        deferredObj.resolve({'tsData':tsData,'appData':appData,'peerData':peerData});
    }

    getKeyFromObj = function(obj) {
        for(var key in obj)
            return key;
    }

    processTSData = function(obj,networkData) {
        var inTSData = networkData['ingressObj']['tsData'];
        var outTSData = networkData['egressObj']['tsData'];
        var tsData = [];
        var timeObj = obj['timeObj'];
        var startTime = timeObj['startTime'];
        var stepIntvl = timeObj['stepIntvl'];
        var currIterTimeStamp;
        if((inTSData.length ==0) && (outTSData.length == 0))
            return tsData;
        for(var i=0;i<globalObj.NUM_FLOW_DATA_POINTS;i++) {
            //var currIterTimeStamp = (startTime+(stepIntvl*cnt))*1000;
            var outBytes = 0,inBytes=0,inPkts=0,outPkts=0;
            if(outTSData[i] != null) {
                currIterTimeStamp = getKeyFromObj(outTSData[i]);
                outBytes = outTSData[i][currIterTimeStamp][0];
                outPkts = outTSData[i][currIterTimeStamp][1];
            }
            if(inTSData[i] != null) {
                currIterTimeStamp = getKeyFromObj(inTSData[i]);
                inBytes = inTSData[i][currIterTimeStamp][0];
                inPkts = inTSData[i][currIterTimeStamp][1];
            }
            tsData.push({'date':new Date(currIterTimeStamp/1000),
                            'inBytes':inBytes,'outBytes':-1*parseInt(outBytes),
                            'inPkts':inPkts,'outPkts':outPkts});
        }
        for(var i=0;i<tsData.length;i++) {
            //Print non-zero values
            if((tsData[i]['inBytes'] != 0) || (tsData[i]['outBytes'] != 0)) {
                //console.info(i,tsData[i]['date'],formatBytes(tsData[i]['inBytes']),formatBytes(tsData[i]['outBytes']));
            }
        }
        //Put the timeseries data in sorted order
        //tsData.reverse();
        //tsData = tsData.sort(sortByDate);

        function sortByDate(a,b) {
            if(a['date'] > b['date'])
                return -1;
            else if(a['date'] < b['date'])
                return 1;
            else
                return 0;
        }
        return tsData;
    }

    processAppData = function(networkData) {
        var inAppData = networkData['ingressObj']['appData'];
        var outAppData = networkData['egressObj']['appData']
        var appData = {};
        for(var currApp in inAppData) {
            appData[currApp] = {'inBytes':inAppData[currApp]['bytes'],'outBytes':0,
                                'inPkts':inAppData[currApp]['pkts'],'outPkts':0};
        }
        for(var currApp in outAppData) {
            if(appData[currApp] == null) {
                appData[currApp] = {'inBytes':0,'inPkts':0};
            }
            appData[currApp]['outBytes'] = outAppData[currApp]['bytes'];
            appData[currApp]['outPkts'] = outAppData[currApp]['pkts'];
        }
        var appDataSource = [];
        for(var currApp in appData) {
            appDataSource.push({'name':getIANAServiceForPort(currApp),'inBytes':appData[currApp]['inBytes'],'outBytes':appData[currApp]['outBytes'],
                                                'inPkts':appData[currApp]['inPkts'],'outPkts':appData[currApp]['outPkts']});
        }
        function sortByTotalTraffic(a,b) {
            if((a['inBytes'] + a['outBytes']) > (b['inBytes'] + b['outBytes']))
                return 1;
            else if((a['inBytes'] + a['outBytes']) < (b['inBytes'] + b['outBytes']))
                return -1;
            else
                return 0;
        }
        appDataSource.sort(sortByTotalTraffic);
        appDataSource = appDataSource.reverse();
        var TOP_N = 7;
        var otherInBytes =0;otherOutBytes =0,otherInPkts=0,otherOutPkts=0;
        if(appDataSource.length > TOP_N) {
            for(var i=TOP_N;i<appDataSource.length;i++) {
                otherInBytes += appDataSource[i]['inBytes'];
                otherOutBytes += appDataSource[i]['outBytes'];
                otherInPkts += appDataSource[i]['inPkts'];
                otherOutPkts += appDataSource[i]['outPkts'];
            }
        }
        if(appDataSource.length > TOP_N)
            appDataSource = appDataSource.slice(0,TOP_N).concat({'name':'Others','inBytes':otherInBytes,'outBytes':otherOutBytes,
                                                                'inPkts':otherInPkts,'outPkts':otherOutPkts});
        return appDataSource;
    }

    processPeerData = function(networkData) {
        var inAppData = networkData['ingressObj']['peerData'];
        var outAppData = networkData['egressObj']['peerData']
        var peerData = {};
        for(var currPeer in inAppData) {
            peerData[currPeer] = {'inBytes':inAppData[currPeer]['bytes'],'outBytes':0,
                                    'inPkts': inAppData[currPeer]['pkts'],'outPkts':0};
        }
        for(var currPeer in outAppData) {
            if(peerData[currPeer] == null) {
                peerData[currPeer] = {'inBytes':0,'inPkts':0};
            }
            peerData[currPeer]['outBytes'] = outAppData[currPeer]['bytes'];
            peerData[currPeer]['outPkts'] = outAppData[currPeer]['pkts'];
        }
        var peerDataSource = [];
        for(var currPeer in peerData) {
            peerDataSource.push({'name':num2dot(currPeer),'inBytes':peerData[currPeer]['inBytes'],'outBytes':peerData[currPeer]['outBytes'],
                                                            'inPkts':peerData[currPeer]['inPkts'],'outPkts':peerData[currPeer]['outPkts']});
        }
        function sortByTotalTraffic(a,b) {
            if((a['inBytes'] + a['outBytes']) > (b['inBytes'] + b['outBytes']))
                return 1;
            else if((a['inBytes'] + a['outBytes']) < (b['inBytes'] + b['outBytes']))
                return -1;
            else
                return 0;
        }
        peerDataSource.sort(sortByTotalTraffic);
        peerDataSource = peerDataSource.reverse();
        var TOP_N = 7;
        var otherInBytes =0;otherOutBytes =0,otherInPkts=0,otherOutPkts=0;
        if(peerDataSource.length > TOP_N) {
            for(var i=TOP_N;i<peerDataSource.length;i++) {
                otherInBytes += peerDataSource[i]['inBytes'];
                otherOutBytes += peerDataSource[i]['outBytes'];
                otherInPkts += peerDataSource[i]['inPkts'];
                otherOutPkts += peerDataSource[i]['outPkts'];
            }
        }
        if(peerDataSource.length > TOP_N)
            peerDataSource = peerDataSource.slice(0,TOP_N).concat({'name':'Others','inBytes':otherInBytes,'outBytes':otherOutBytes,
                                                                'inPkts':otherInPkts,'outPkts':otherOutPkts});
        return peerDataSource;
    }

    getIANAServiceForPort = function(appN) {
        var portNo = appN.split(':')[1];
        var protNo = appN.split(':')[0];
        var ianaMap = {'443':'HTTPS','80':'HTTP','23':'Telnet','22':'SSH'};
        var protMAP = {'17':'UDP','6':'TCP','2':'IGMP','0':'ICMP'}
        var retStr = '';
        if(appN == '1:0')
            return 'ICMP';
        if(protNo in protMAP)
            retStr += protMAP[protNo] + ':';
        else
            retStr += protNo + ':';
        if((protMAP[protNo] == 'TCP') && (portNo in ianaMap))
            retStr += ianaMap[portNo];
        else
            retStr += portNo;
        return retStr;
    }

    this.getNetworkData = function(obj) {
        self.dataDeferredObj = $.Deferred();
        //10-Min
        self.networkInfo['timeSlice'] = DEFAULT_TIME_SLICE;
        getFlowData(obj,self.dataDeferredObj);
        self.dataDeferredObj.done(function(data) {
            self.dataDeferredObj = $.Deferred();
            self.networkData = data;
            self.getNetworkInterVNData(self.networkData,obj);
        });
    }

    this.refreshFlowData = function(timeSlice) {
        if(timeSlice != null) 
            self.networkInfo['timeSlice'] = timeSlice;
        self.dataDeferredObj = $.Deferred();
        getFlowData(self.networkInfo,self.dataDeferredObj);
        self.dataDeferredObj.done(function(data) {
            self.networkData['tsData'] = data['tsData'];
            //$('#chart-top').data('kendoStockChart').dataSource.data(self.networkData['tsData']);
            if(self.tsChart == null) {
                initTimeSeriesChart('#chart-top',self.networkData['tsData']);
            } else {
                //navigator.select.from
                //Retain the selection if both from and to are with in the new data range
                self.tsChart.dataSource.data(self.networkData['tsData']);
                var navigatorSelectRange = self.tsChart.options.navigator.select;
                //console.info("StartIndex:",startIndex,data['tsData'][startIndex]['date'],"End Index:",endIndex,data['tsData'][endIndex]['date']);
                console.info("Current Nav StartDate:",navigatorSelectRange['from'],"Current Nav EndDate:",navigatorSelectRange['to']);
                console.info("Start Date:",data['tsData'][0]['date'],"End Date:",data['tsData'][data['tsData'].length-1]['date']);
                if((navigatorSelectRange['from'] < self.networkData['tsData'][0]['date']) || 
                    (navigatorSelectRange['to'] < self.networkData['tsData'][0]['date'])) {
                    var count = globalObj.NUM_FLOW_DATA_POINTS;
                    var startIndex = Math.floor(parseInt(count*.05));
                    var endIndex = Math.floor(parseInt(count*.95));
                    console.info("New StartIndex:",startIndex,data['tsData'][startIndex]['date'],"New End Index:",endIndex,data['tsData'][endIndex]['date']);
                    self.tsChart.options.navigator.select.from = self.networkData['tsData'][startIndex]['date'];
                    self.tsChart.options.navigator.select.from = self.networkData['tsData'][endIndex]['date'];
                    self.tsChart.refresh();
                }

            }
            //self.tsChart.dataSource.read();
            //self.tsChart.refresh();
        });
    }

    this.getNetworkInterVNData = function(data,obj) {
        var interVNData = {};
        //External Links call
        $.ajax({
            url:'/api/tenants/virtual-network-details/' + obj['fq_name'].join(':'),
            success: function(result) {
                data['interVNData'] = result;
                self.deferred.resolve();
            }
        });
    }
    this.destroy = function() {
        if(($('#chart-top') != null) && ($('#chart-top').data('kendoStockChart') != null))
            $('#chart-top').data('kendoStockChart').destroy();
        contView.destroy();
    }
}
networkView.prototype = tenantNetworkMonView;
//Center Region
function contentView() {
    this.destroy = function() {
        $('#main-container').html('');
    }
}

contView = new contentView();
projView = new projectView();
vnView   = new networkView();
instView = new instanceView();
vnLinkView = new linkView();

function decorateProject() {

}

function decorateNetwork() {

}

function getFlowData(obj,deferredObj) {
    var ingressObj=null,egressObj=null;
    //Get the last 24 hr data
    var endDt = new XDate(true);
    //convert date to UTC time
    //dt = new Date(dt.getTime() + (dt.getTimezoneOffset()*60*1000));
    //dt = new Date(getUTCTime(dt));
    //timeSlice in milliseconds
    //var timeSlice = obj['timeSlice'] || 360000; 
    var timeSlice = obj['timeSlice']; 
    if(obj['timeSlice'] == null)
        debugger;
    //var startTime = adjustDate(new Date(dt),{ms:-1*timeSlice}).getTime();
    var startDt = new XDate(true)
    startDt.addMilliseconds(-1*timeSlice);
    var startTime = startDt.getTime();
    //returns time in milliseconds
    var endTime = endDt.getTime();
    obj['timeObj'] = {'startTime' : startTime,'endTime': endTime};
    console.info("Getting flowData for:", new Date(startTime), " to:",new Date(endTime));
    if(obj['src_vn'] == null)
        obj['src_vn'] = obj['fq_name'].join(':');
    if(obj['dst_vn'] == null)
        obj['dst_vn'] = obj['fq_name'].join(':');
    var stepIntvl = (endTime - startTime)/globalObj.NUM_FLOW_DATA_POINTS;
    obj['timeObj']['stepIntvl'] = stepIntvl;
    $.when($.ajax({
        url: "/api/tenants/flow-stat/" + (startTime*1000) + '/' + (endTime*1000) + '/' + obj['src_vn'] + '/' + obj['dst_vn'] + '/' + 'ingress/' + stepIntvl*1000,
        success: function(result) {
        }
    }),
    $.ajax({
        url: "/api/tenants/flow-stat/" + (startTime*1000) + '/' + (endTime*1000) + '/' + obj['src_vn'] + '/' + obj['dst_vn'] + '/' + 'egress/' + stepIntvl*1000,
        success: function(result) {
        }
    })).done(function(a1,a2) {
        processFlowData(obj,{'ingressObj':a1[0],'egressObj':a2[0]},deferredObj);
    });
}
//@@ sourceURL=tenant_monitor_network.js
//Selector can be jQuery element
function initStackedChart(selector,data,fields,options) {
    //If both fields are zero,then ignore that category
    var chartData = [];
    var categoryLabels = true;
    if((options != null) && (options['categoryLabels'] != null))
        categoryLabels = options['categoryLabels'];
    var negate = false;
    var chartType = null;
    var treeView = null;
    if(options != null)  {
        if(options['negate'] != null)
            negate = options['negate'];
        if(options['chartType'] != null)
            chartType = options['chartType'];
        //To bind chart click with kendoTreeView
        if(options['treeView'] != null)
            treeView = options['treeView'];
    } 
    var chartDS = {};

    var dataSetLen = 0;
    if(data instanceof Array) {
        for(var i=0;i<data.length;i++) {
            //Plot the category if any of the stacked values are > 0
            if((data[i][fields[0]['field']] != 0) || (data[i][fields[1]['field']] != 0)) {
                data[i]['sum'] = data[i][fields[0]['field']] + data[i][fields[1]['field']];
                chartData.push($.extend(true,{},data[i]));
            }
        }
        chartDS['data'] = chartData;
    } else {
        chartDS = data;
    }
    //Use column chart if number of data points is < 5
    if(chartType == null) {
        if(data.length <=5) {
            chartType = 'column';
            negate = false;
        } else 
            chartType = 'bar';
    }
    var tooltipTemplate = "formatBytes(value)";
    var tooltipTemplateSel = '#traffic-tooltip-template';
    if((options != null) && (options['tooltipTemplate'] != null))
        tooltipTemplate = options['tooltipTemplate'];

    var legendVisible = true;
    chartData.sort(sortArrayForStackedChart);
    for(var i=0;i<chartData.length;i++) {
        if(negate == true) {
            chartData[i][fields[0]['field']] = -1*chartData[i][fields[0]['field']];
            chartData[i][fields[1]['field']] = -1*chartData[i][fields[1]['field']];
            legendVisible = false;
        }
    }
    //var minChartWidth = 250,chartWidth=minchartWidth;
    //if(((chartData.length*barWidth)+100) > minchartWidth)
    var dataPointCnt = chartData.length;

    $(selector).kendoChart({
        plotAreaClick:function(e) {
            /*if((options != null) && (options['assignBarClick'] != null) && options['assignBarClick'] == true)
                selTreeNode(treeView,e.dataItem.fq_name.join(':'));*/
        },
        seriesClick:function(e) {
            //console.info('seriesClick');
            if((options != null) && (options['assignBarClick'] != null) && options['assignBarClick'] == true) {
                selTreeNode({fqName:e.dataItem.fq_name.join(':')});
            }
        },
        axisLabelClick:function(e) {
           /* if((options != null) && (options['assignBarClick'] != null) && options['assignBarClick'] == true)
                selTreeNode(treeView,e.dataItem.fq_name.join(':'));*/
        },
        /*dataSource: {
            data:chartData,
            schema: {
                parse: function(response) {
                    //Available via Closure
                    console.info(selector);
                    return response;
                }
            }
        },*/
        dataSource:chartDS,
        dataBound: function(e) {
            logMessage('chart dataBound');
            /*//Use column chart if number of data points is < 5
            if(chartType == null) {
                if(data.length <=5) {
                    chartType = 'column';
                    negate = false;
                } else 
                    chartType = 'bar';
            }*/
            var chart = e.sender;
            var dataPointCnt = chart.dataSource.data().length;
            //if(dataPointCnt < 3 && dataPointCnt > 0) {
            if(dataPointCnt > 0) {
                hideChartNoData(selector);
                if(chartType == 'bar')
                    chart.options.chartArea.height = getBarChartHeight(dataPointCnt);
                else if(chartType == 'column') {
                    chart.options.chartArea.width = getColumnChartWidth(dataPointCnt);
                    //To apply margin auto,set the chart container element width also
                    $(selector).width(getColumnChartWidth(dataPointCnt));
                    chart.options.categoryAxis.labels.rotation = 60;
                }
            }
            //Hide the chart
            if(dataPointCnt == 0) {
                showChartNoData(selector);
            }
        },
        legend: {
            visible:false,
            position:"left"
        },
        series: [{
                name: fields[0]['name'],
                field: fields[0]['field'],
                color: "#1c638d",
            },{
                name:fields[1]['name'],
                field: fields[1]['field'],
                color:'#4DA3D5'
            }],
        seriesDefaults: {
            gap: 0.7,
            stack: 1,
            type:chartType,
            //color: "#1c638d",
            border: {
                width: 0
            },
            overlay: {
                gradient: "none"
            }
        },
        axisDefaults: {
            majorGridLines: { visible: false },
            majorTicks: { visible: false }
        },
        categoryAxis: {
            field: "name",
            labels: {
                //format: "MMM",
                color: "#727f8e",
                visible:categoryLabels
                //template : kendo.template($('#label-template').html())
                //mirror:true
            }
        },
        tooltip: {
            //template: "# return 'Bytes:' + formatBytes(value) + '<br/>' +  'Packets:' + value #",
            template: kendo.template($(tooltipTemplateSel).html()),
            visible: true
        },
        valueAxis: {
            visible: false
        },
        //legend: { visible: false }
    });

    function sortArrayForStackedChart(a,b) {
        if(a['sum'] > b['sum'])
            return -1;
        else if(a['sum'] < b['sum'])
            return 1;
        else
            return 0;
    }
}

function initTimeSeriesChart(selector, data, options) {
    if(selector == null) 
        return;

    var tooltipTemplateSel = '#ts-tooltip-template';
    var tsData = data,dateField='date',fields=['inBytes','outBytes'];

    var count = data.length;

    var colors = ['#B79F80','#535353','#F5946A','#B79F80','#957244','#F26223'];
    colors = ['red','yellow','orange','blue','green'];

    var valueAxes = {
        labels: {
            template: "# if(value < 0) return formatBytes(-1*value,true); else return formatBytes(value,true); #",
            step : 2
        },
        majorGridLines : {
            visible:true
        },
        line: {
            visible:false
        },
        //majorUnit:majorUnit,
    }
    var valueAxisDefaults = {};

    $(selector).find('.ts-chart').kendoStockChart({
        theme: $(document).data("kendoSkin") || 'bootstrap',
        transitions:false,
        /*dataSource: {
            data:tsData,
            change: function() {
                console.info('datasource updated');
            }
        },*/
        chartArea: {
            height:400
        },
        dataSource: tsData,
        dataBound: function(e) {
            var chart = e.sender;
            var dataPointCnt = chart.dataSource.data().length;
            var data = chart.dataSource.data();
            if(dataPointCnt > 0) {
                hideChartNoData(selector);
                var startIndex = Math.floor(parseInt(dataPointCnt*.05));
                var endIndex = Math.floor(parseInt(dataPointCnt*.95));
                console.info("Start Date:",data[0]['date'],"End Date:",data[data.length-1]['date']);
                console.info("StartIndex:",startIndex,data[startIndex]['date'],"End Index:",endIndex,data[endIndex]['date']);
                chart.options.navigator.select.from = data[startIndex]['date'];
                chart.options.navigator.select.to = data[endIndex]['date'];
            } else {
                showChartNoData(selector);
            }

        },
        valueAxis: valueAxes,
        tooltip: {
            visible: true,
            format: "{0} b",
            template: kendo.template($(tooltipTemplateSel).html()),
        },
        title: {
            //text: "Events"
        },
        categoryAxis: {
            title:{ 
                //text:'Hello',
                //position:'right'
            },
            majorGridLines: {
                visible:false
            },
            labels: {
                //template: "# formatBytes(parseInt(category)) #"
                //rotation:50,
                //skip:4,
                mirror:true,
                step:4,
                color: "#727f8e"
            },
            baseUnit: 'minutes',
            /*baseUnitStep: "auto",
            autoBaseUnitSteps: {
                minutes: [1]
            },*/
        },
        dateField:dateField,
        seriesDefaults: {
            //type:"area",
            type:"line",
            //stack:1,
            width:2,
            markers: {
                visible:false
            }/*,
            tooltip: {
                visible:false
            }*/
        },
        legend: {
            visible:true,
            //position: "left",
            // set the background color to a dark blue
            //background: "#336699",
            labels: {
                // set the font to a size of 14px
                font: "14px Arial,Helvetica,sans-serif",
                // set the color to red
                //color: "red"
            },
            // move the legend to the left
            //position: "right",
            // move the legend a bit closer to the chart by setting the x offset to 20
            //offsetX: 20,
            // move the legend up to the top by setting the y offset to -100
            //offsetY: -100,
        },
        series: [{
            name: "Total In",
            field:fields[0],
            aggregate:'sum',
            //dashType:'dot',
            color: defaultSeriesColors[1],
            //color:'#8BC2E2',
            //color:'red',
            //color:colors[0],
            /*tooltip: {
                //template: "#= category # - #= value #"
            },
            labels: {
                visible:true,
                template:'#= value #'
            }*/
        },{
            name:"Total Out",
            tooltip: {
                //template: "#= category # - #= value #"
            },
            field:fields[1],
            //color:'#278ECC',
            color: defaultSeriesColors[2],
            //color:'yellow',
            //color:colors[1],
            aggregate:'sum'
        }
        ],
        yAxis: {
        },
        axisDefaults: {
            //valueAxis : valueAxisDefaults
        },
        navigator: {
            series: [
            {
                type: "line",
                field:fields[0],
                //color:'red',
                color:defaultSeriesColors[1],
                aggregate:'sum',
                markers:{
                    //visible:true
                },
                labels: {
                    visible:false
                },
                tooltip: {
                    //template: "#= category # - #= value #",
                    visible:true,
                    format: "{0} b/s",
                }
            },
            {
                type: "line",
                field:fields[1],
                aggregate:'sum',
                markers:{
                    //visible:true
                },
                //color:'blue',
                color:defaultSeriesColors[2],
                labels: {
                    visible:false
                }
            }],
        }
    });
}
