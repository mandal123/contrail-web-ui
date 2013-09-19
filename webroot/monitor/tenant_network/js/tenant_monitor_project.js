/**
 * Project Summary page
 */
var projSummaryView = new projSummaryRenderer();
function projSummaryRenderer() {
    this.load = function(cfg) {
        var obj = $.extend({},cfg);
        var data = {stats:{},charts:{},grids:{}};
        var context = 'project';
        layoutHandler.setURLHashParams({fqName:obj['fqName']},{p:'mon_net_projects',merge:false,triggerHashChange:false});
        pushBreadcrumb([cfg['fqName']]);
        template = 'project-template';
        obj['title'] = kendo.format('Traffic Statistics for Project ({0})',obj['fqName'].split(':').pop());
        //obj['topologyTitle'] = kendo.format('Topology for Project ({0})',obj['fqName'].split(':').pop());
        obj['topologyTitle'] = kendo.format('Connectivity Details');
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
        //For Project Topology
        data['topology']={renderFn:function(){
            topologyView.drawTopology(obj['fqName']);
            }
        }

        var deferredObj = $.Deferred();
        var portDistributionURL = constructReqURL($.extend({},obj,{type:'port'}));
        var portDistributionParams = $.deparam(portDistributionURL);
        $.ajax({
            url:constructReqURL($.extend({},obj,{type:'port'})),
            timeout:FLOW_QUERY_TIMEOUT
        }).done(function(result) {
            deferredObj.resolve(result);
        });
        data['charts']['chartType'] = 'bubble';
        data['charts']['colCount'] = 1;
        data['charts']['d'] = [
            {deferredObj:deferredObj,title:'Port Distribution',parseFn:function(response) {
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
        $('#project-tabs').kendoTabStrip({
            activate: function(e) {    
                var topo_divId=obj['fqName'].replace(/-/g,'_').replace(/:/g,'_');
                if($('#project-tabs').find('div.k-state-active').find('#topology').length>0
                        && $("#"+topo_divId).data('topology')!=undefined){
                    $("#"+topo_divId).html('');
                    topologyView.renderTopology($("#"+topo_divId).data('topology'));
                }
                var selTab = $(e.item).text();
                if(selTab == 'Summary')
                    $(window).resize();
                else if(selTab == 'Instances') {
                    //Issue the request only for the first time when Instances tab is selected
                    if(instanceTabLoaded == 0) {
                        $('.k-grid').data('kendoGrid').dataSource.read();
                        instancesTabLoaded = 1;
                    }
                }
            }
        }).data('kendoTabStrip').select(0);
        objListView.load({view:'list',type:'instance',fqName:obj['fqName'],context:'project',selector:'#projInstances'});
    }
}
