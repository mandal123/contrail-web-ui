var instSummaryView = new instSummaryRenderer();
function instSummaryRenderer() {
    var instViewModel = kendo.observable({
        network:'',
        vRouter:''
    });
    this.load = function(cfg) {
        var obj = $.extend({},cfg);
        var data = {stats:{},charts:{},grids:{}};
        layoutHandler.setURLHashParams({vmName:obj['vmName'],fqName:obj['fqName'],srcVN:obj['srcVN']},{p:'mon_net_instances',merge:false,triggerHashChange:false});
        pushBreadcrumb([obj['vmName']]);
        template = 'inst-template';
        obj['title'] = kendo.format("Traffic Statistics",obj['fqName'],obj['srcVN'].split(':').pop()); 
        data['stats'] = [{},{}];
        data['stats'][0] = {
            'list' : [
                { lbl : 'Traffic In',field:'toNetwork' },
                { lbl : 'TrafficOut',field:'fromNetwork',cls:'out' }
            ],
            url:function() {
                return getInstanceURL($.extend({},obj,{context:'instance',type:'summary'}));
            },
            parseFn:function(response) {
                return [{   
                    'toNetwork': formatBytes(response['in_bytes']) ,
                    'fromNetwork': formatBytes(response['out_bytes']) 
                    }]
            }
        }
        data['stats'][1] = {
            'list' : [
                { lbl : 'Network',field:'network' },
                { lbl : 'vRouter',field:'vRouter'}
            ],
            viewModel:instViewModel
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
                url:function() {
                    return getInstanceURL($.extend({},obj,{context:'instance',type:'port'}));
                },
                objectType:'port'
            },{
                title:'Top Peers',
                link:{view:'list',type:'peer',fqName:obj['fqName'],srcVN:obj['srcVN'],context:'instance'},
                url: function() {
                    return getInstanceURL($.extend({},obj,{context:'instance',type:'peer'}));
                },
                objectType:'peer'
            },{
                title :'Top Flows',
                link :{view:'list',type:'flow',fqName:obj['fqName'],srcVN:obj['srcVN'],context:'instance'},
                url: function() {
                    return getInstanceURL($.extend({},obj,{context:'instance',type:'flow'}));
                },
                objectType:'flow'
            }];
        $.ajax({
            url:'/api/tenant/networking/virtual-machine/summary?fqNameRegExp=' + obj['fqName'] + '*'
        }).done(function(result) {
            $("#uve-information").text(JSON.stringify(result, null, 1));
            instDeferredObj.done(function(response) {
                var statData = [{ lbl : 'Network',field:'network'},
                                { lbl : 'vRouter',field:'vRouter'}];
                var vRouter = ifNull(jsonPath(result,'$..vrouter')[0],'--');
                instViewModel.set('vRouter',vRouter);
                instViewModel.set('network',obj['srcVN']);
                var dataSource = $('.summary-stats').data('dataSource');
                var dashboardTemplate = kendo.template($('#dashboard-template').html());
                $('#inst-stats').html(dashboardTemplate({noTitle:true,colCount:2,d:statData}));
            });
        });

        //Render the template
        var summaryTemplate = kendo.template($('#' + template).html());
        var container = cfg['container'];
        $(container).html(summaryTemplate(obj));
        var instDeferredObj = $.Deferred();
        var dropdownIP = $(container).find('.z-dropdown').kendoDropDownList({
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
                                    instDeferredObj.resolve();
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
                            response['fipList'] = $.map(response['fipList'],function(obj,idx) {
                                obj['name'] = kendo.format('{0} ({1})',obj['ip_address'],obj['virtual_network']);
                                return obj;
                            });
                            return response['ipList'].concat(response['fipList']);
                        }
                    },
                    requestEnd: function(e) {
                    }
                },
                change:onInstanceIntfChange
            }).data('kendoDropDownList');



        $('#instance-tabs').kendoTabStrip({
        }).data('kendoTabStrip').select(0);

        function onInstanceIntfChange(e,refresh) {
            var refresh = ifNull(refresh,true);
            var ip = getSelInstanceFromDropDown()['ip'];
            var network = getSelInstanceFromDropDown()['vnName'];
            instViewModel.set('network',network);
            $('.example-title.main').html(function(idx,oldHtml) {
                var str = $.trim(oldHtml);
                return str.replace(/(.* -) ([^ ]*) (\(.*\))/,'$1 ' + ip + ' $3');
            });
            if(refresh == true) {
                monitorRefresh();
            }
        }
    }
}
