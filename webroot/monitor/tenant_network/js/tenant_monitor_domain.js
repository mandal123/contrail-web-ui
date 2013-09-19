/** 
 * Domain Summary Page
 */
var domainSummaryView = new domainSummaryRenderer();
function domainSummaryRenderer() {
    this.load = function(cfg) {
        layoutHandler.setURLHashParams({fqName:cfg['fqName']},{merge:false,triggerHashChange:false});
        var obj = {};
        var data = {stats:{},charts:{},grids:{}};
        obj['title'] = kendo.format('Traffic Statistics for Domain ({0})',cfg['fqName']);
        data['stats']['list'] = [
            { lbl : 'Total Traffic In',field:'inBytes'},
            { lbl : 'Total Traffic Out',field:'outBytes'},
            { lbl : 'Inter VN Traffic In',field:'interVNInBytes'},
            { lbl : 'Inter VN Traffic Out',field:'interVNOutBytes'},
        ];
        data['stats']['parseFn']  = tenantNetworkMonitorUtils.statsParseFn;
        data['charts']['colCount'] = 2;
        data['stats']['url'] = constructReqURL($.extend({},obj,cfg,{type:'summary'}));
        data['charts']['id'] = 'domain';
        var template = 'summary-template';
        var container = cfg['container'];
        var domainDeferredObj = $.Deferred();
        getDomainDashboardData(domainDeferredObj);
        domainDeferredObj.fail(function() {
            $('.stack-chart').html(timeoutTemplate({}));
        });
        data['charts']['chartType'] = 'bubble';
        data['charts']['d'] = [
            {deferredObj:domainDeferredObj,title:'Projects',parseFn:function(response) {
                return {
                    d:[{key:'Control Nodes',values:response['projectsData']}],xLbl:'Interfaces',yLbl:'Networks',forceX:[0,5],forceY:[0,10],
                    link:{hashParams:{q:{view:'list',type:'project',fqName:obj['fqName'],context:'domain',source:'uve'}},
                    conf:{p:'mon_net_projects',merge:false}},yDataType:'bytes',
                    tooltipFn:tenantNetworkMonitor.projectTooltipFn
                }}},
            {deferredObj:domainDeferredObj,title:'Networks',forceX:[0,5],forceY:[0,10],parseFn:function(response) {
                return {
                    d:[{key:'Analytics Nodes',values:response['networksData']}],xLbl:'Interfaces',yLbl:'Connected Networks',forceX:[0,5],forceY:[0,10],yDataType:'bytes',
                    link:{hashParams:{q:{view:'list',type:'network',fqName:obj['fqName'],source:'uve',context:'domain'}},
                    conf:{p:'mon_net_networks',merge:false}},
                    tooltipFn:tenantNetworkMonitor.networkTooltipFn
                    }}}];
        var summaryTemplate = kendo.template($('#' + template).html());
        $(container).html(summaryTemplate(obj));
        $(container).initTemplates(data);
    }
    function getDomainDashboardData(deferredObj) {
        var vnDeferredObj = $.Deferred();
        getVirtualNetworksData(vnDeferredObj,'default-domain:*');
        vnDeferredObj.fail(function() {
            deferredObj.reject();
        });
        vnDeferredObj.done(function(result) {
            var vnArr = [],obj = {},projArr = [];projData = {};
            $.each(result,function(idx,d) {
                obj = {};
                obj['name'] = d['name'];
                obj['project'] = obj['name'].split(':').slice(0,2).join(':');
                obj['intfCnt'] = ifNull(jsonPath(d,'$..interface_list')[0],[]).length;
                obj['vnCnt'] = ifNull(jsonPath(d,'$..connected_networks')[0],[]).length;
                obj['inThroughput'] = ifNull(jsonPath(d,'$..in_bandwidth_usage')[0],0);
                obj['outThroughput'] = ifNull(jsonPath(d,'$..out_bandwidth_usage')[0],0);
                obj['throughput'] = obj['inThroughput'] + obj['outThroughput'];
                obj['x'] = obj['intfCnt'];
                obj['y'] = obj['vnCnt'];
                obj['size'] = obj['throughput']+1;
                obj['type'] = 'network';
                vnArr.push(obj);
            });
            var vnCF = crossfilter(vnArr);
            var projDimension = vnCF.dimension(function(d) { return d.project;});
            $.each(vnArr,function(idx,d) {
                if(!(d['project'] in projData)) {
                    projData[d['project']] = {
                            intfCnt : 0,
                            vnCnt   : 0,
                            throughput:0
                        };
                }
                projData[d['project']]['intfCnt'] += d['intfCnt'];
                projData[d['project']]['throughput'] += d['throughput'];
                projData[d['project']]['vnCnt']++;
            });
            $.each(projData,function(key,obj) {
                $.extend(obj,{type:'project',name:key,size:obj['throughput']+1,x:obj['intfCnt'],y:obj['vnCnt']});
                projArr.push(obj);
            });
            deferredObj.resolve({networksData:vnArr,projectsData:projArr});
        });
    }
    function getVirtualNetworksData(deferredObj,regExp) {
        $.when($.ajax({
                    url:'/api/tenant/networking/virtual-network/summary?fqNameRegExp=' + regExp  
                }), $.ajax({
                    url:'/api/tenants/config/virtual-networks'
                })).done(function(uveData,configData) {
                    var configVNs = [],filteredVNs=[];
                    $.each(configData[0]['virtual-networks'],function(idx,obj) {
                        configVNs.push(obj['fq_name'].join(':'));
                    });
                    if(uveData[0]['value'] != null)
                    filteredVNs = $.map(uveData[0]['value'],function(obj,idx) {
                        if($.inArray(obj['name'],configVNs) > -1) {
                            return obj;
                        } else
                            return null;
                    });
                    deferredObj.resolve(filteredVNs);
                }).fail(function() {
                    deferredObj.reject();
                });
    }
}
