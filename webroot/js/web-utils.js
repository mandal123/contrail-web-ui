/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var DEFAULT_TIME_SLICE = 3600000,
    pageContainer = "#content-container",
    dblClick = 0;
var CONTRAIL_STATUS_USER = [];
var CONTRAIL_STATUS_PWD = [];
var flowKeyStack = [];
var aclIterKeyStack = [];
var d3Colors = {red:'#d62728',green:'#2ca02c',blue:'#08519C',orange:'#ff7f0e'};
var timeoutTemplate = kendo.template($('#timeoutTemplate').html());

var templateLoader = (function ($, host) {
    //Loads external templates from path and injects in to page DOM
    return{
        loadExtTemplate:function (path, deferredObj, containerName) {
            //Load the template only if it doesn't exists in DOM
            var tmplLoader = $.get(path)
                .success(function (result) {
                    //Add templates to DOM
                    if (containerName != null) {
                        $('body').append('<div id="' + containerName + '"></div>');
                        $('#' + containerName).append(result);
                    } else
                        $("body").append(result);
                    if (deferredObj != null)
                        deferredObj.resolve();
                })
                .error(function (result) {
                    console.log("Error Loading Templates.");
                });

            tmplLoader.complete(function () {
                $(host).trigger("TEMPLATE_LOADED", [path]);
            });
        }
    };
})(jQuery, document);

var siteMap = {};
var siteMapSearchStrings = [];

!function ($) {
    $.extend($.fn, {
        busyIndicator:function (c) {
            b = $(this);
            var d = b.find(".k-loading-mask");
            c ? d.length || (d = $("<div class='k-loading-mask'><span class='k-loading-text'>Loading...</span><div class='k-loading-image'/><div class='k-loading-color'/></div>").width(b.outerWidth()).height(b.outerHeight()).prependTo(b)) : d && d.remove()
        }
    });
}(jQuery);

function keys(obj) {
    var count = 0;
    for (var i in obj) {
        if (obj.hasOwnProperty(i)) {
            count++;
        }
    }
    return count;
}

testData = (function () {
    var self = this;
    return {
        getRandomIp:function () {
            return self.getRandomNum(0, 255) + '.' + self.getRandomNum(0, 255) + '.' + self.getRandomNum(0, 255) + '.' + self.getRandomNum(0, 255);
        },
        getRandomNum:function (min, max) {
            return min + Math.floor(((max - min) * Math.random()));
        },
        getRandomNums:function (max, num) {
            var randomNums = [];
            for (var i = 0; i < num; i++) {
                var currNum = testData.getRandomNum(0, max);
                while (randomNums.indexOf(currNum) != -1)
                    currNum = testData.getRandomNum(0, max);
                randomNums.push(currNum);
            }
            return randomNums;
        },
        getRandomArrValues:function (arr, num) {
            //Generate num random numbers between 0 and arr.length
            var randomNums = self.getRandomNums(arr.length - 1, num);
            var retArr = [];
            for (var i = 0; i < randomNums.length; i++) {
                retArr.push(arr[randomNums[i]]);
            }
            return retArr;
        },
        getRandomArrVal:function (arr) {
            return arr[self.getRandomNum(0, arr.length - 1)];
        },
        //Get the random numbers such that their count is 100
        getRandomNumsForPie:function (cnt) {
            var sum = 0;
            var retArr = [];
            for (var i = 0; i < cnt - 1; i++) {
                //Add the current random num to sum and if it exceeds 100 retry again
                var num = self.getRandomNum(10, Math.floor(100 / cnt));
                retArr.push(num);
                sum += num;
            }
            retArr.push(100 - sum);
            retArr.sort();
            retArr.reverse();
            return retArr;
        }
    }
})();

//Adjust the date object by adding/subtracting the given interval(min/day/month/year)
function adjustDate(dt, obj) {
    if (obj['min'] != null) {
        dt.setUTCMinutes(dt.getUTCMinutes() + obj['min'])
    }
    if (obj['day'] != null) {
        dt.setUTCDate(dt.getUTCDate() + obj['day'])
    }
    if (obj['sec'] != null) {
        dt.setTime(dt.getTime() + (obj['sec'] * 1000))
    }
    if (obj['ms'] != null) {
        dt.setTime(dt.getTime() + obj['ms'])
    }
    return dt;
}

function formatDate(dt) {
    return dt.getUTCFullYear() + '/' + (((dt.getUTCMonth() + 1) < 10) ? ('0' + (dt.getUTCMonth() + 1)) : (dt.getUTCMonth() + 1)) + '/' +
        ((dt.getUTCDate() < 10) ? ('0' + dt.getUTCDate()) : dt.getUTCDate());
}

function getFormattedTime(dt) {
    return dt.getUTCHours() + ':' + dt.getUTCMinutes() + ':' + dt.getUTCSeconds();
}

function filterEventsData(events, criteria) {
    var retEvents = [];
    if (criteria == 'last24') {
        var maxDt = new Date();
        var minDt = new Date(maxDt);
        minDt.setUTCHours(minDt.getUTCHours() - 24);
    }
    for (var i = 0; i < events.length; i++) {
        if (events['date'] > minDt)
            retEvents.push(events[i]);
    }
}

var defaultSeriesColors = [ "#70b5dd", "#1083c7", "#1c638d" ];
var defColors = ['#1c638d', '#4DA3D5'];
var lineChartDefColors = ['#4e4141', '#1c638d'];

function showChartNoData(selector) {
    $(selector).hide();
    if ($(selector).siblings('.no-data').length == 0) {
        $(selector).after($('<div/>', {class:'no-data'}));
        var noDataTemplate = kendo.template($('#no-data').html());
        $(selector).siblings('.no-data').html(noDataTemplate);
    } else {
        $(selector).siblings('.no-data').show();
    }
}

function hideChartNoData(selector) {
    $(selector).siblings('.no-data').hide();
    $(selector).show();
}

function showLoadingMask() {
    var loadingMaskTemplate = kendo.template($('#loading-mask').html());
    $(pageContainer).html(loadingMaskTemplate);
}

function hideLoadingMask() {
}

function showProgressMask(selector, showHide) {
    if (showHide == null)
        showHide = false;
    kendo.ui.progress($(selector), showHide);
}

function refreshTree() {
    var loadingTemplate = kendo.template($("#loading-template").html());
    $('#tree-loading').html(loadingTemplate);
    $('#treeNetworkTopology').css('visibility', 'hidden');
    setTimeout(refreshTreeData, 200);
}

function refreshTreeData() {
    var treeView = $('#treeNetworkTopology').data('kendoTreeView');
    //Don't retrieve from Redis cache
    updateDataSourceURL(treeView, treeView.options.dataSource.options.transport.read.url + '?forceRefresh=1');
    treeView.options.dataSource.read();
}

function updateDataSourceURL(kWidget, url) {
    kWidget.options.dataSource.options.transport.read.url = url;
}
//Given a fq_name,there can be multiple views like network view/connected network view
//Switches between sub-views in tenant monitor
function selTreeNode(obj) {
    var treeView = obj['tree'], fq_name = obj['fqName'], expandMatchedNode = obj['expand'],
        triggerSelect = ifNull(obj['trigger'], true);
    if (treeView == null) {
        //Pick the first available tree
        if ($('.k-treeview').length != 0)
            treeView = $($('.k-treeview')[0]).data('kendoTreeView');
    }
    if (((fq_name == null) && (obj['selectFirst'] == null)) || (treeView == null))
        return;

    //Strip off the domain name if it's default ('default-domain') and if not present in tree
    if ((fq_name != null) && fq_name.indexOf('default-domain') == 0) {
        if (treeView.element.find('.k-first').text().indexOf('default-domain') == -1)
            fq_name = fq_name.substr(fq_name.indexOf(':') + 1);
    }
    var rootNode = treeView.root.find('.k-item:first').parent().parent();
    var currNode;
    var matchedNode = [];
    if (fq_name != null) {
        var fqNameArr = fq_name.split(':');
        for (var i = 0; i < fqNameArr.length - 1; i++) {
            currNode = getMatchedNode(rootNode, fqNameArr[i]);
            treeView.expand(currNode);
            //If it's lazy load,need to wait till the node is expanded before going to select its child node
            rootNode = currNode;
        }
        matchedNode = getMatchedNode(rootNode, fqNameArr[fqNameArr.length - 1]);
    }
    //If matchedNode is not found,return false
    if (matchedNode.length == 0) {
        if ((obj['selectFirst'] != null) && (obj['selectFirst'] == true)) {
            //Select the first node if given node is not present
            matchedNode = $(treeView.element).find('.k-first');
            //selTreeNode({fqName:$($(treeView.element).find('.k-first').find('.k-in')[0]).text(),expand:true});
        } else
            return false;
    }
    treeView.select(matchedNode);
    if ((expandMatchedNode != null) && (expandMatchedNode == true))
        treeView.expand(matchedNode);
    if (triggerSelect == true) {
        treeView.trigger('select', {node:matchedNode});
        $(matchedNode).trigger('click');
    }
    else
        return treeView.dataItem(matchedNode);
}

function initTreeNodeClickListener(selector, callbackFn) {
    $(selector).on('click', '.k-item', function (e) {
        var clickedNode = $(this);
        callbackFn({node:clickedNode});
        //Stop propogating click handler to its parent node in tree
        e.stopPropagation();
    });
}

function getMatchedNode(rootNode, text) {
    var selNodeText = $('> ul > li > div > span:contains(' + text + ')', rootNode);
    var selNode = selNodeText.closest('.k-item');
    if (selNode.length > 1)
    //console.info(selNode,text);
        selNode = selNode.filter(function (idx) {
            //Pick the node appropriately on multiple matches
            return ($(this).text().indexOf(text) == 0)
        });
    return selNode;
}

function selectTreeNode(fq_name) {
    var treeView = $('#treeview-images').data('kendoTreeView');
    treeView.collapse('.k-item');
    for (var i = 0; i < fq_name.length - 1; i++) {
        var matchNode = treeView.findByText(fq_name[i]);
        treeView.expand(matchNode);
        //var matchDataItem = treeView.dataItem(matchNode);
    }
    var selNodes = treeView.findByText(fq_name[fq_name.length - 1]);
    treeView.select(selNodes[0]);
    treeView.trigger('select', {node:selNodes[0]});
    //May be useful for filtering the treenodes based on a search string
    /*
     var leafNodeText = fq_name[fq_name.length-1];
     var selNodes = treeView.findByText(leafNodeText);
     var reqNode;
     for(var i=0;i<selNodes.length;i++) {
     var currDataItem = treeView.dataItem(selNodes[i]);
     var fqname = currDataItem.fq_name.join(':');
     if(fqname == fq_name.join(':')) {
     reqNode = selNodes[i];
     break;
     }
     }
     //Get all the parent nodes;
     var reqDataItem = treeView.dataItem(reqNode);
     var parNodes;
     while(reqDataItem.parentNode()) {
     parNodes.push(reqDataItem.parentNode());
     reqDataItem = reqDataItem.parentNode();
     }
     parNodes.reverse();
     for(var i=0;i<parNodes.length;i++) {
     treeView.expand(parNodes[i]);
     }*/
}

function getBarChartHeight(dataPointCnt) {
    var barWidth = 25;
    return (dataPointCnt * barWidth) + (10 * (dataPointCnt + 1));
}

function getColumnChartWidth(dataPointCnt) {
    var barWidth = 50;
    return(dataPointCnt * barWidth) + (10 * (dataPointCnt + 1));
}

function changeChartType(selector, chartType) {
    //Look for .k-chart under the given selector
    var charts = $(selector + ' .k-chart');
    var formatFunc;
    for (var i = 0; i < charts.length; i++) {
        var currElem = $(charts[i]);
        var currChart = $(charts[i]).data('kendoChart');
        var series = currChart.options.series;
        var dataSource = currChart.dataSource.data();
        if (chartType == 'bar') {
            delete currChart.options.categoryAxis.labels.rotation;
        } else if (chartType == 'column') {
            currChart.options.categoryAxis.labels.rotation = 60;
        }
        for (var j = 0; j < series.length; j++) {
            //Negate the datavalues of 2nd chart in case of bar chart
            if (i == 1) {
                if (chartType == 'bar') {
                    formatFunc = makeNegative;
                } else if (chartType == 'column') {
                    formatFunc = makePositive;
                }
                for (var k = 0; k < dataSource.length; k++) {
                    dataSource[k][series[j]['field']] = formatFunc(dataSource[k][series[j]['field']]);
                }
                currChart.dataSource.data(dataSource);
            }
            currChart.options.series[j].type = chartType;
        }
        $(currElem).css('width', '');
        $(currElem).css('height', '');
        if (chartType == 'bar') {
            $(currElem).removeClass('column-chart').addClass('bar-chart');
            currChart.options.chartArea.height = getBarChartHeight(dataSource.length);
            //currChart.options.chartArea.width = 400;
            delete currChart.options.chartArea.width;
        } else if (chartType == 'column') {
            $(currElem).removeClass('bar-chart').addClass('column-chart');
            currChart.options.chartArea.width = getColumnChartWidth(dataSource.length);
            //currChart.options.chartArea.height = 300;
            delete currChart.options.chartArea.height;
        }
        currChart.refresh();
    }
}

function getGridConfig() {

}

/**
 * @options['objectType']   project|network|flow|peer|port
 * @options['view']         chart|list
 * Do any logarthmic calculations here
 */
function chartsParseFn(options, response) {
    var obj = response;
    var view = options['view'];
    var objType = options['objectType'];
    var objSource = options['source'];
    var fqName = options['fqName'];
    var logScale = ifNull(options['logScale'], 0);
    if (options['chart'] != null) {
        var selector = options['chart'];
        if ($(selector).hasClass('negate') || (logScale > 0)) {
            var data = obj;
            var fields = [];
            var series = options['series'];
            $.each(series, function (idx, obj) {
                fields.push(obj['field']);
            });
            if ($(selector).hasClass('negate')) {
                $.each(data, function (idx, obj) {
                    $.each(fields, function (i, field) {
                        data[idx][field] = -1 * data[idx][field];
                    });
                });
            }
            if (logScale > 0) {
                $.each(data, function (idx, obj) {
                    $.each(fields, function (i, field) {
                        data[idx][field] = log2(data[idx][field]);
                    });
                });
            }
        }
    }

    if(objType == 'project' && objSource == 'uve') {
        obj = $.map(tenantNetworkMonitorUtils.filterVNsNotInCfg(response['value'],fqName), function (currObj, idx) {
            currObj['inBytes'] = jsonPath(currObj, '$..in_bytes')[0];
            currObj['outBytes'] = jsonPath(currObj, '$..out_bytes')[0];
            currObj['project'] = currObj['name'].split(':').slice(0, 2).join(':');
            return currObj;
        });
        var projArr = [], projData = {};
        $.each(obj, function (idx, d) {
            if (!(d['project'] in projData)) {
                projData[d['project']] = {
                    inBytes:0,
                    inThroughput:0,
                    outThroughput:0,
                    outBytes:0,
                    vnCount:0
                }
            }
            projData[d['project']]['inBytes'] += ifNull(jsonPath(d, '$..in_bytes')[0], 0);
            projData[d['project']]['outBytes'] += ifNull(jsonPath(d, '$..out_bytes')[0], 0);
            projData[d['project']]['inThroughput'] += ifNull(jsonPath(d, '$..in_bandwidth_usage')[0], 0);
            projData[d['project']]['outThroughput'] += ifNull(jsonPath(d, '$..out_bandwidth_usage')[0], 0);
            projData[d['project']]['vnCount']++;
        });
        $.each(projData, function (key, obj) {
            $.extend(obj, {name:key});
            projArr.push(obj);
        });
        obj = projArr;
    } else if (objType == 'network') {
        if (objSource == 'uve') {
            obj = $.map(tenantNetworkMonitorUtils.filterVNsNotInCfg(response['value'], fqName), function (currObj, idx) {
                currObj['rawData'] = $.extend(true,{},currObj);
                currObj['inBytes'] = ifNull(jsonPath(currObj, '$..in_bytes')[0], 0);
                currObj['outBytes'] = ifNull(jsonPath(currObj, '$..out_bytes')[0], 0);
                currObj['instCnt'] = ifNull(jsonPath(currObj, '$..virtualmachine_list')[0], []).length;
                currObj['inThroughput'] = ifNull(jsonPath(currObj, '$..in_bandwidth_usage')[0], 0);
                currObj['outThroughput'] = ifNull(jsonPath(currObj, '$..out_bandwidth_usage')[0], 0);
                return currObj;
            });
        } else {
            obj = $.map(response, function (obj, idx) {
                return obj;
            });
        }
    } else if (objType == 'instance') {
        obj = $.map(response, function (obj, idx) {
            var currObj = obj['value'];
            obj['rawData'] = $.extend(true,{},currObj);
            obj['inBytes'] = 0;
            obj['outBytes'] = 0;
            obj['vmName'] = ifNull(jsonPath(currObj, '$..vm_name')[0], obj['name']);
            obj['vRouter'] = ifNull(jsonPath(currObj, '$..vrouter')[0], obj['name']);
            obj['intfCnt'] = ifNull(jsonPath(currObj, '$..interface_list')[0], []).length;
            obj['vn'] = ifNull(jsonPath(currObj, '$..virtual_network'),[]);
            obj['ip'] = ifNull(jsonPath(currObj, '$..interface_list[*].ip_address'), []);
            var floatingIPs = flattenArr(ifNull(jsonPath(currObj, '$..interface_list[*].floating_ips'), []));
            obj['floatingIP'] = [];
            $.each(floatingIPs, function (idx, fipObj) {
                if (fipObj['ip_address'] != null)
                    obj['floatingIP'].push(kendo.format('{0}', fipObj['ip_address'], fipObj['virtual_network']));
            });
            $.each(jsonPath(currObj, '$..in_bytes'), function (idx, value) {
                obj['inBytes'] += value;
            });
            $.each(jsonPath(currObj, '$..out_bytes'), function (idx, value) {
                obj['outBytes'] += value;
            });
            return obj;
        });
    } else if (objType == 'port') {
        obj = $.map(response, function (obj, idx) {
            var protocol = formatProtocol(obj['protocol']), name;
            obj['port'] = ifNull(obj['sport'], obj['dport']);
            if ($.inArray(protocol, ['ICMP', 'IGMP']) > -1)
                obj['name'] = protocol;
            else
                obj['name'] = kendo.format('{0}, Port {1}', protocol, obj['port']);
            //obj['name'] = obj['protocol'] + ':' + ifNull(obj['sport'],obj['dport']);
            return obj;
        });
    } else if (objType == 'peer') {
        obj = $.map(response, function (obj, idx) {
            obj['name'] = long2ip(ifNull(obj['sourceip'], obj['destip']));
            obj['sourceip'] = long2ip(obj['sourceip']);
            obj['destip'] = long2ip(obj['destip']);
            obj['network'] = ifNull(obj['sourcevn'], obj['destvn']);
            return obj;
        });
    } else if ($.inArray(objType, ['flow', 'flowdetail']) > -1) {
        obj = $.map(response, function (obj, idx) {
            obj['sourceip'] = long2ip(obj['sourceip']);
            obj['destip'] = long2ip(obj['destip']);
            //obj['protocol'] = formatProtocol(obj['protocol']);
            if (view == 'list') {
                //obj['bytes'] = formatBytes(obj['bytes']);
            }
            obj['name'] = ifNull(obj['sourceip'], obj['destip']);
            obj['name'] += ':' + ifNull(obj['sport'], obj['dport']);
            return obj;
        });
    }
    return obj;
}

function stripOffDomain(lbl) {
    return lbl.split(':').slice(1).join(':');
}

function stripOffProject(lbl) {
    return lbl.split(':').slice(2).join(':');
}

function chartLblTemplate(data, lbl) {
    //console.info(data,lbl);
    var context = data['context'];
    var objectType = data['objectType'];
    if ($.inArray(objectType, ['network', 'project']) > -1) {
        if (context == 'domain') {
            //return lbl.split(':').slice(1).join(':');
            return stripOffDomain(lbl);
        } else if (context == 'project')
            return stripOffProject(lbl);
    } else if (objectType == 'peer') {
        return long2ip(lbl);
    } else if (objectType == 'port') {
        return lbl;
    } else if (objectType == 'flow') {
        return '';
    }
    return lbl;
}

(function ($) {
    $.extend($.fn, {
        initPortletStats:function (data) {
            var chartsTemplate = kendo.template($('#charts-template').html());
            $(this).html(chartsTemplate(data));
            var dashboardTemplate = kendo.template($('#dashboard-template').html());
            $(this).find('.stack-chart').each(function (idx) {
                $(this).html(dashboardTemplate({colCount:1, d:data['d'][idx]['data']}));
            });
        },
        initWidgetHeader:function (data) {
            var widgetHdrTemplate = kendo.template($("#widget-header-template").html());
            $(this).html(widgetHdrTemplate(data));
            if (data['link'] != null)
                $(this).find('span').addClass('href-link');
            $(this).find('span').on('click', function () {
                if ((data['link'] != null) && (data['link']['hashParams'] != null))
                    layoutHandler.setURLHashObj(data['link']['hashParams']);
            });
        },
        initCharts:function (data) {
            var chartsTemplate = kendo.template($('#charts-template').html());
            var networkChart, chartSelector;
            if ((data['chartType'] == null) && ($.inArray(ifNull(data['context'], ''), ['domain', 'network', 'connected-nw', 'project', 'instance']) > -1)) {
                networkChart = true;
                chartSelector = '.stack-chart';
            } else {
                networkChart = false;
                //chartSelector = '.d3-chart';
                chartSelector = '.stack-chart';
            }
            $(this).html(chartsTemplate(data));
            if (networkChart == true) {
                //Add durationStr
                $.each(data['d'], function (idx, obj) {
                    if (ifNull(obj['duration'], true)) {
                        if (obj['title'].indexOf('(') < 0)
                            obj['title'] += durationStr;
                    }
                });
                //Set the chart height to parent height - title height
            }
            //$(this).find('.stack-chart').setAvblSize();
            var charts = $(this).find(chartSelector);
            $.each(charts, function (idx, chart) {
                //Bind the function to pass on the context of url & objectType to schema parse function
                var chartData = data['d'][idx];
                var chartType = ifNull(chartData['chartType'], '');
                var fields;
                var objectType = chartData['objectType'];
                if (networkChart == true) {
                    if (chartData['columns'] != null) {
                        fields = chartData['columns'];
                    } else if (objectType == 'flow') {
                        fields = [
                            {
                                field:'bytes',
                                name:'Total Traffic'
                            }
                        ];
                    } else {
                        fields = [
                            {
                                field:'inBytes',
                                name:'Traffic In',
                            },
                            {
                                field:'outBytes',
                                name:'Traffic Out',
                            }
                        ];
                    }
                    var parseFn = function (response) {
                        return chartsParseFn({logScale:ifNull(chartData['logScale'], 0),
                            series:fields, chart:chart, url:chartData['url'], objectType:chartData['objectType'],
                            view:'chart'}, response);
                    }
                    if (typeof(chartData['parseFn']) == 'function') {
                        parseFn = chartData['parseFn'];
                    }
                    //Copy the parameters required for maintaing the context on drill-downs
                    var contextObj = getContextObj(data);
                    $(this).initStackChart($.extend({}, chartData, {parseFn:parseFn, columns:fields, context:data['context']}, contextObj));
                    $(this).data('objectType', chartData['objectType']);
                    $(this).data('context', chartData['context']);
                } else if (chartType == 'sparkLine') {
                    $(this).initSparkLineChart($.extend({}, chartData, {}));
                } else {
                    //Load asynchronously
                    initDeferred($.extend({},chartData,{selector:$(this),renderFn:'initScatterChart'}));
                }
                //If title is clickable
                if (chartData['link'] != null) {
                    var titleElem;
                    if ($(this).siblings('.example-title').length > 0)
                        titleElem = $(this).siblings('.example-title');
                    else
                        titleElem = $(this).parents('.widget-body').siblings('.widget-header').find('h4.smaller');
                    //titleElem.addClass('chart-title-link');
                    titleElem.on('click', function () {
                        if (chartData['link']['hashParams'] == null) {
                            var viewObj = tenantNetworkMonitorView;
                            var detailObj = chartData['link'];
                            //console.info(data['context']);
                            if (chartData['link']['context'] == 'instance') {
                                //Get the instance ip from drop-down
                                var instObj = getSelInstanceFromDropDown();
                                $.extend(detailObj, {ip:instObj['ip'], vnName:instObj['vnName']});
                            }
                            if (chartData['class'] != null)
                                viewObj = chartData['class'];
                            viewObj.loadSubView(detailObj);
                        } else {
                            //layoutHandler.setURLHashObj(chartData['link']['hashParams']);
                            layoutHandler.setURLHashParams(chartData['link']['hashParams']['q'], chartData['link']['conf']);
                        }
                    });
                }
                /*console.info(data['d'][idx]['url']);
                 var chartElem = $(this);
                 $(this).hide();
                 //kendo.ui.progress($(this).closest('.table-cell'),true);
                 console.info('progress',$(this).closest('.table-cell'));
                 $(this).kendoChart({
                 dataBound: function() {
                 //chartElem.show();
                 //kendo.ui.progress(chartElem.closest('.table-cell'),false);
                 },
                 });*/
            });
        },
        initSummaryStats:function (data) {
            var statsRowTemplate = kendo.template($('#summary-stats-template').html());
            //If data['url'] == null,implies that populating the data will be handled by respective screen
            $(this).html(statsRowTemplate(data['list']));
            var self = $(this);
            var statsElem = $(this);
            var statsDatasource;
            if (data['url'] != null) {
                statsDatasource = new kendo.data.DataSource({
                    transport:{
                        read:{
                            url:data['url']
                        }
                    },
                    requestEnd:function (e) {
                        //console.info(self);
                        $(self).data('loaded', true);
                    },
                    schema:{
                        parse:function (response) {
                            if (data['parseFn'] != null)
                                return data['parseFn'](response);
                            else
                                return [response];
                        }
                    }
                });
                statsDatasource.read();
                statsElem.data('dataSource', statsDatasource);
                statsDatasource.bind('change', function () {
                    kendo.bind(statsElem, statsDatasource.at(0));
                });
            } else
                kendo.bind(statsElem, data['viewModel']);
        },
        initTemplates:function (data) {
            var statsLen = $(this).find('.summary-stats').length;
            if (!(data['stats'] instanceof Array))
                data['stats'] = [data['stats']];
            if (!(data['grids'] instanceof Array))
                data['grids'] = [data['grids']];
            if (!(data['charts'] instanceof Array))
                data['charts'] = [data['charts']];

            $(this).find('.summary-stats').each(function (idx) {
                $(this).initSummaryStats(data['stats'][idx]);
            });
            //Assuming that all summary charts will be displayed at the bottom
            //console.info($(this).find('.summary-charts').parent().height());
            //$(this).find('.summary-charts').setAvblSize();
            $(this).find('.summary-charts').each(function (idx) {
                var contextObj = getContextObj(data);
                $(this).initCharts($.extend({}, data['charts'][idx], {context:data['context']}, contextObj));
            });
            $(this).find('.z-grid').each(function (idx) {
                //If grid height is set pass height as 100%
                if ($(this).height() > 0) {
                    if (data['grids'][idx]['config'] == null)
                        data['grids'][idx]['config'] = {};
                    $.extend(data['grids'][idx]['config'], {height:$(this).height()});
                }
                $(this).initGrid(data['grids'][idx]);
            });
            $(this).find('.ts-chart').each(function (idx) {
                $(this).initD3TSChart(data['ts-chart']);
            });
            if (data['topology'] != null && (typeof data['topology']['renderFn'] == 'function')) {
                data['topology']['renderFn']();
                //loadGraph();
            }
        },
        initHeatMap:function (data) {
            var selector = $(this);
            var deferredObj = $.Deferred();
            var margin = { top:20, right:0, bottom:100, left:20 },
                width = 960 - margin.left - margin.right,
                height = 230 - margin.top - margin.bottom,
                gridSize = Math.floor(width / 64),
                legendElementWidth = gridSize * 2,
                buckets = 9,
                colors = ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#253494", "#081d58"], // alternatively colorbrewer.YlGnBu[9]
                colors = ["white", "#599AC9"]; // alternatively colorbrewer.YlGnBu[9]
            var maxValue = d3.max(data, function (d) {
                return d.value;
            });
            if (maxValue == 0)
                colors = ['white'];
            var colorScale = d3.scale.quantile()
                .domain([0, buckets - 1, maxValue])
                .range(colors);

            var svg = d3.select($(selector)[0]).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var xValues = [], yValues = [];
            for (var i = 0; i < 64; i++) {
                xValues.push(i);
            }
            for (var i = 0; i < 4; i++) {
                yValues.push(i);
            }
            var yLabels = svg.selectAll(".xLabel")
                .data(yValues)
                .enter().append("text")
                //.text(function (d) { return d; })
                .attr("x", 0)
                .attr("y", function (d, i) {
                    return i * gridSize;
                })
                .style("text-anchor", "end")
                .attr("transform", "translate(-6," + gridSize / 1.5 + ")")
                .attr("class", function (d, i) {
                    return ((i >= 0 && i <= 4) ? "xLabel mono axis axis-workweek" : "xLabel mono axis");
                });

            var xLabels = svg.selectAll(".xLabel")
                .data(xValues)
                .enter().append("text")
                //.text(function(d) { return d; })
                .attr("x", function (d, i) {
                    return i * gridSize;
                })
                .attr("y", 0)
                .style("text-anchor", "middle")
                .attr("transform", "translate(" + gridSize / 2 + ", -6)")
                .attr("class", function (d, i) {
                    return ((i >= 7 && i <= 16) ? "xLabel mono axis axis-worktime" : "xLabel mono axis");
                });

            var heatMap = svg.selectAll(".hour")
                .data(data)
                .enter().append("rect")
                .attr("x", function (d) {
                    return (d.x - 1) * gridSize;
                })
                .attr("y", function (d) {
                    return (d.y - 1) * gridSize;
                })
                //.attr("rx", 4)
                //.attr("ry", 4)
                .attr("class", "hour bordered")
                .attr("width", gridSize)
                .attr("height", gridSize)
                .style("fill", colors[0]);

            heatMap.transition().duration(1000)
                .style("fill", function (d) {
                    return colorScale(d.value);
                });

            heatMap.append("title").text(function (d) {
                var startRange = ((64 * d.y) + d.x) * 256;
                //return 'Hello' + d.value;
                return startRange + ' - ' + (startRange + 255);
            });

            var legend = svg.selectAll(".legend")
                .data([0].concat(colorScale.quantiles()), function (d) {
                    return d;
                })
                .enter().append("g")
                .attr("class", "legend");
            /*
             legend.append("rect")
             .attr("x", function(d, i) { return legendElementWidth * i; })
             .attr("y", height)
             .attr("width", legendElementWidth)
             .attr("height", gridSize / 2)
             .style("fill", function(d, i) { return colors[i]; });

             legend.append("text")
             .attr("class", "mono")
             .text(function(d) { return "� " + Math.round(d); })
             .attr("x", function(d, i) { return legendElementWidth * i; })
             .attr("y", height + gridSize);
             */
            //});
        },
        initSummaryTemplate:function (data) {
            //Check for optional elements('ts-chart');
            $(this).find('.summary-stats').initSummaryStats(data['stats']);
            //$(this).find('.summary-charts').setAvblSize();
            $(this).find('.summary-charts').initCharts(data['charts']);
        },
        //Requires url & columns
        initGrid:function (data) {
            function onChange(e) {
                var name;
                if (name = isCellSelectable(this.select())) {
                    var kGrid = $(this.select()).closest('.k-grid').data('kendoGrid');
                    var selRowDataItem = kGrid.dataSource.view()[this.select().closest('tr').index()];
                    var contextObj = getContextObj(data);
                    var reqObj = {};
                    //Can't use exactly the same logic as chart as there are multiple cells that can be clickable here
                    if ($.inArray(name, ['network', 'project']) > -1) {
                        selTreeNode({fqName:this.select().text(),trigger:false});
                        layoutHandler.setURLHashParams({fqName:this.select().text()},{merge:false});
                    } else if ((ENABLE_PEER_CLICK == 1) && ($.inArray(name, ['peer']) > -1)) {
                        var network = selRowDataItem.network;
                        $.extend(reqObj, {type:'peerdetail', ip:ifNull(selRowDataItem.sourceip, selRowDataItem.destip),
                            vnName:ifNull(selRowDataItem.sourcevn, selRowDataItem.destvn)}, contextObj);
                        objSummaryView.load(reqObj);
                        //selTreeNode({fqName:network + ':Instances',exapnd:true});
                    } else if ((ENABLE_PORT_CLICK == 1) && ($.inArray(name, ['port']) > -1)) {
                        $.extend(reqObj, {type:'portdetail', ip:ifNull(selRowDataItem.sourceip, selRowDataItem.destip), vnName:ifNull(selRowDataItem.sourcevn, selRowDataItem.destvn),
                            port:selRowDataItem.port, protocol:selRowDataItem.protocol}, contextObj, getSelInstanceFromDropDown());
                        objSummaryView.load(reqObj);
                    } else if($.inArray(name,['instance']) > -1) {
                        layoutHandler.setURLHashParams({vmName:selRowDataItem['vmName'],fqName:selRowDataItem['name'],srcVN:selRowDataItem['vn'][0]},{merge:false,p:'mon_net_instances'});
                    } else if($.inArray(name,['vRouter']) > -1) {
                        layoutHandler.setURLHashParams({node:'vRouters:' + selRowDataItem['vRouter'], tab:''}, {p:'mon_infra_compute',merge:false});
                    }
                }
            }

            var gridDetailConfig = { };
            if (data['detailParseFn'] != null)
                gridDetailConfig = {
                    detailTemplate:kendo.template($('#gridDetailTemplate').html()),
                    detailInit:function (e) {
                        var detailTemplate = kendo.template($('#detailTemplate').html());
                        var rowData = e.data;
                        e.detailRow.find('.row-fluid.basicDetails').html(detailTemplate(data['detailParseFn'](rowData)));
                    }
                }
            var transportCfg = {};
            if(data['timeout'] != null)
                transportCfg = {timeout:data['timeout']};

            if (data != null) {
                $(this).contrailKendoGrid($.extend({
                    dataSource:{
                        transport:{
                            read:$.extend({
                                url:data['url']
                            },transportCfg)
                        },
                        schema:{
                            parse:function (response) {
                                if (data['parseFn'] != null)
                                    return data['parseFn'](response);
                                else
                                    return response;
                            }
                        }
                    },
                    columns:data['columns'],
                    change:onChange,
                    dataBound:function (e) {
                        var sender = e.sender;
                        $(sender.element).data('loaded', true);
                        addExtraStylingToGrid(sender);
                    },
                    selectable:'cell',
                    searchToolbar:(data['config'] != null && data['config']['widgetGridTitle'] != null) ? true : false
                    //searchToolbar:true
                }, gridDetailConfig, data['config']));
                showGridLoading($(this));
                applyGridDefHandlers($(this).data('kendoGrid'),data['config']);
            } else {
                $(this).kendoGrid();
            }
        },
        initListTemplate:function (data) {
            $(this).find('.z-grid').initGrid(data);
        },
        getUnusedSize:function (sizingProperty) {
            sizingProperty = ifNull(sizingProperty, 'height');
            var innerSizingFn, sizingFn, outerSizingFn;
            if (sizingProperty == 'height') {
                innerSizingFn = 'innerHeight';
                sizingFn = 'height';
                outerSizingFn = 'outerHeight';
            } else {
                innerSizingFn = 'innerWidth';
                sizingFn = 'width';
                outerSizingFn = 'outerWidth';
            }
            //With box-sizing:border-box, innerHeight is more than height!!
            var parentSize = Math.min($(this).parent()[innerSizingFn](), $(this).parent()[sizingFn]());
            //console.info('parentSize:',parentSize);
            //if($(this).parent()[0].style.height == 'auto')
            if (parentSize < 1)
                parentSize = $(this).parent().parent()[innerSizingFn]();
            var siblingsSize = 0;
            //Handle vertical margin collapse scenario
            $(this).siblings().each(function () {
                //Exclude hidden siblings;
                if ($(this).is(':visible') == false)
                    return;
                siblingsSize += $(this)[outerSizingFn](true);
                //console.info($(this),$(this).outerHeight(true));
            });
            //console.info(parentSize,parentSize-siblingsSize);
            return parentSize - siblingsSize;
        },
        setAvblSize:function (sizingProperty, buffer) {
            sizingProperty = ifNull(sizingProperty, 'height');
            var sizingFn;
            buffer = ifNull(buffer, 0);
            if (sizingProperty == 'height')
                sizingFn = 'height';
            else
                sizingFn = 'width';
            //To work for an array of elements
            $(this).each(function () {
                var unusedSize = $(this).getUnusedSize(sizingProperty);
                //logMessage('Setting Height:',$(this),unusedHeight);
                $(this)[sizingFn](unusedSize - buffer);
            });
        }
    });
})(jQuery);

function stackChartToolTip(passOnObject, data) {
    var series = data['series'], dataItem = data['dataItem'], category = dataItem['category'], value = dataItem['value'];
    var objType = passOnObject['objectType'], context = passOnObject['context'], logScale = ifNull(passOnObject['logScale'], 0);
    var seriesFields = ifNull(passOnObject['seriesFields'], []);

    //console.info(data);
    var fieldArr = [
        {field:'inBytes', lbl:'Total In Bytes', parseFn:formatBytes},
        {field:'outBytes', lbl:'Total Out Bytes', parseFn:formatBytes},
        {field:'inPkts', lbl:'Pkts'},
        {field:'name', lbl:'Name'}
    ];
    if (objType == 'flow') {
        fieldArr = [
            {field:'sourcevn', lbl:'Source VN'},
            {field:'sourceip', lbl:'Source IP'},
            {field:'destvn', lbl:'Destination VN'},
            {field:'destip', lbl:'Destination IP'},
            {field:'protocol', lbl:'Protocol'},
            {field:'sport', lbl:'Source Port'},
            {field:'dport', lbl:'Destination Port'},
            {field:'bytes', lbl:'Bytes', parseFn:makePositive}
        ];
    }
    var tooltipStr = '<div class="table chart-tooltip">';
    //Functions for which only the current field value is required
    var standAloneFns = [formatBytes, makePositive];
    var infoObj = [];
    $.each(fieldArr, function (idx, obj) {
        var key = obj['field'];
        var currValue = dataItem[key];
        //If curr field is displayed in series and logarthmic scale is applied,do the reverse operation
        if ($.inArray(key, seriesFields) > -1) {
            if (logScale > 0)
                currValue = parseInt(Math.pow(logScale, currValue));
        }
        var currLbl = obj['lbl'];
        if (obj['parseFn'] != null) {
            if ($.inArray(formatBytes, standAloneFns) > -1)
                currValue = obj['parseFn'](currValue);
            else
                currValue = obj['parseFn'](dataItem);
        }
        infoObj.push({lbl:currLbl, value:currValue});
        tooltipStr += '<div class="table-row">'
        tooltipStr += kendo.format('<div class="table-cell lbl">{0}</div> <div class="table-cell">&nbsp;:&nbsp;</div>  <div class="table-cell value">{1}</div>', currLbl, currValue);
        tooltipStr += '</div>'
    });
    tooltipStr += '</div>';
    var tooltipTemplateSel = '#title-lblval-tooltip-template';
    var tooltipTemplate = kendo.template($(tooltipTemplateSel).html());
    return tooltipTemplate(infoObj);
}

function formatLblValueTooltip(infoObj) {
    if (infoObj == null)
        infoObj = [
            {lbl:'Version', value:255},
            {lbl:'Host Name', value:'1.1.1.1'}
        ];
    var tooltipTemplateSel = '#title-lblval-tooltip-template';
    var tooltipTemplate = kendo.template($(tooltipTemplateSel).html());
    return tooltipTemplate(infoObj);
}

(function ($) {
    $.extend($.fn, {
        initPieChart:function (obj) {
            $(selector).kendoChart({
                //theme: $(document).data("kendoSkin") || "default",
                theme:sessionStorage.getItem('kendoSkin') || "blueopal",
                legend:{
                    visible:true,
                    position:"bottom",
                    labels:{
                        template:"#= text # (#= value #%)"
                    }
                },
                seriesDefaults:{
                    labels:{
                        visible:false,
                        format:"{0}%"
                    }
                },
                series:[
                    {
                        type:"pie",
                        data:[
                            {
                                category:"Hydro",
                                value:22
                            },
                            {
                                category:"Solar",
                                value:2
                            },
                            {
                                category:"Nuclear",
                                value:49
                            },
                            {
                                category:"Wind",
                                value:27
                            }
                        ]
                    }
                ],
                tooltip:{
                    visible:true,
                    format:"{0}%"
                }
            });
        },
        initMemCPUSparkLines: function(data, parser, propertyNames, slConfig) {
            var selector = $(this);
            createD3SparkLines(selector, data, parser, propertyNames, slConfig);
        },
        initMemCPULineChart:function (obj, height) {
            var selector = $(this);
            var options = {};
            var url = obj.url;
            options.titles = obj.titles;
            options.height = height;
            options.parser = obj.parser;
            options.plotOnLoad = obj.plotOnLoad;
            options.showWidgetIds = obj.showWidgetIds;
            options.hideWidgetIds = obj.hideWidgetIds;
            createD3MemCPUChart(selector, url, options);
        },
        initLineChart:function (obj, height, title) {
            var selector = $(this);
            var columns = obj['columns'];
            var series = constructChartSeries(columns, {colors:lineChartDefColors});
            var chartDS = constructChartDS(obj, $(this));
            var chartHeight = 350;
            var chartTitle = "";

            if (height != null) {
                chartHeight = height;
            }
            if (title != null) {
                chartTitle = title;
            }
            $(selector).kendoChart({
                title:{
                    text:chartTitle,
                    color:lineChartDefColors[1],
                    font:"14px calibiri"
                },
                legend:{
                    position:"top"
                },
                chartArea:{
                    background:"",
                    height:chartHeight
                },
                dataSource:chartDS,
                dataBound: function(e) {
                    var chart = e.sender;
                    var dataPointCnt = chart.dataSource.data().length;
                    //Hide the chart
                    if (dataPointCnt == 0) {
                        showChartNoData(selector);
                    } else {
                        var ds = chart.dataSource.data();
                        var minMemory = ds[0]['memory'], maxMemory = ds[0]['memory'];
                        var memTitlePostfix = "", mem;
                        $.each(ds, function (idx, obj) {
                            minMemory = Math.min(minMemory, obj['memory']);
                            maxMemory = Math.max(maxMemory, obj['memory']);
                            mem = formatBytes(obj['memory'] * 1024, true);
                            memTitlePostfix = mem.split(" ")[1];
                        });
                        chart['options']['valueAxis'][0]['min'] = Math.max(0, minMemory * .80);
                        chart['options']['valueAxis'][0]['max'] = Math.max(102400, maxMemory * 1.2);
                        chart['options']['valueAxis'][1]['visible'] = true;
                        chart['options']['valueAxis'][1]['labels']['visible'] = true;
                        chart['options']['valueAxis'][1]['title']['visible'] = true;
                        chart['options']['valueAxis'][0]['title']['text'] = obj['memTitle'] + ' (' + memTitlePostfix + ')';
                    }
                },
                seriesDefaults:{
                    type:"line",
                    width:2,
                    markers:{
                        visible:false
                    }
                },
                series:series,
                valueAxis:[
                    {
                        name:'memory',
                        color:lineChartDefColors[1],
                        labels:{
                            template:'#var mem = formatBytes(value*1024,true) #' +
                                '#= mem.split(" ")[0]#'
                        },
                        line:{
                            visible:false
                        },
                        min:0,
                        max:102400
                    },
                    {
                        visible:false,
                        name:'cpu',
                        color:lineChartDefColors[0],
                        labels:{
                            format:"{0}",
                            //step:2,
                            visible:false
                        },
                        line:{
                            visible:false
                        },
                        title:{
                            text:obj['cpuTitle'],
                            visible:false
                        },
                        //min:0,
                        // max:100
                    }
                ],
                //dateField:'date',
                categoryAxis:{
                    axisCrossingValues:[0, 10000],
                    field:'date',
                    majorGridLines:{
                        visible:false
                    },
                    labels:{
                        step:8
                    },
                    baseUnit:'minutes'
                },
                tooltip:{
                    visible:true,
                    format:"{0}%",
                    template:"#= series.name #: #= value #"
                }
            });
        },
        initLineChartWithOnlyMem:function (obj, height, width, title) {
            var selector = $(this);
            var columns = obj['columns'];
            var series = constructChartSeries(columns, {colors:lineChartDefColors});
            var chartDS = constructChartDS(obj);
            var chartHeight = 350;
            var chartWidth;
            var chartTitle = "";
            if (width != null) {
                chartWidth = width;
            }
            if (height != null) {
                chartHeight = height;
            }
            if (title != null) {
                chartTitle = title;
            }
            $(selector).kendoChart({
                title:{
                    text:chartTitle,
                    color:lineChartDefColors[1],
                    font:"14px calibiri"
                },
                legend:{
                    position:"top"
                },
                chartArea:{
                    background:"",
                    height:300,
                    width:chartWidth
                },
                dataSource:chartDS,
                dataBound: function(e) {
                    var chart = e.sender;
                    var dataPointCnt = chart.dataSource.data().length;
                    //Hide the chart
                    if (dataPointCnt == 0) {
                        showChartNoData(selector);
                    } else {
                        var ds = chart.dataSource.data();
                        var minMemory = ds[0]['memory'], maxMemory = ds[0]['memory'];
                        $.each(ds, function (idx, obj) {
                            minMemory = Math.min(minMemory, obj['memory']);
                            maxMemory = Math.max(maxMemory, obj['memory']);
                        });
                        chart['options']['valueAxis']['min'] = Math.max(0, minMemory * .80);
                        chart['options']['valueAxis']['max'] = Math.max(102400, maxMemory * 1.2);
                    }
                },
                seriesDefaults:{
                    type:"line",
                    width:2,
                    markers:{
                        visible:false
                    }
                },
                series:series,
                valueAxis:[
                    {
                        name:'memory',
                        color:lineChartDefColors[1],
                        labels:{
                            template:'#= formatBytes(value*1024) #'
                        },
                        line:{
                            visible:false
                        },
                        title:{
                            text:obj['memTitle']
                        },
                        min:0,
                        max:102400
                    }
                ],
                //dateField:'date',
                categoryAxis:{
                    axisCrossingValues:[0, 10000],
                    field:'date',
                    majorGridLines:{
                        visible:false
                    },
                    labels:{
                        step:8
                    },
                    baseUnit:'minutes'
                },
                tooltip:{
                    visible:true,
                    format:"{0}%",
                    template:"#= series.name #: #= value #"
                }
            });
        },
        initD3TSChart: function (obj) {
            var selector = $(this);
            var url = (typeof(obj['url']) == 'function') ? obj['url']() : obj['url'];
            var cbParams = {selector: selector};
            chartHandler(url, "GET", null, null, 'parseTSChartData', "successHandlerTSChart", null, false, cbParams, null);
        },
        initTSChart:function (obj) {
            var selector = $(this);
            var url = obj['url'];
            var tooltipTemplateSel = '#ts-tooltip-template';
            var dateField = 'date', fields1 = [
                {field:'inBytes', name:'In', aggregate:'sum'},
                {field:'outBytes', name:'Out', aggregate:'sum'}
            ];
            var fields = ['inBytes', 'outBytes'];
            var columns = ifNull(obj['columns'], fields1);
            var series = constructChartSeries(columns);

            var valueAxes = {
                labels:{
                    template:"#=  formatBytes(value,true) #",
                    step:2
                },
                majorGridLines:{
                    visible:true
                },
                line:{
                    visible:false
                },
                min:0,
                //min:-1024*1024*6,
                max:1024 * 1024 * 6
            }
            var valueAxisDefaults = {};

            $(selector).kendoStockChart({
                theme:$(document).data("kendoSkin") || 'bootstrap',
                transitions:false,
                dataSource:{
                    serverFiltering:true,
                    transport:{
                        read:{
                            url:function () {
                                var urlStr = "";
                                if (typeof(url) == 'function') {
                                    urlStr = url();
                                } else
                                    urlStr = url;
                                var urlParams = $.deparam(urlStr);
                                delete urlParams['minsSince'];
                                delete urlParams['startTime'];
                                delete urlParams['endTime'];
                                //delete urlParams['sampleCnt'];
                                var path = urlStr.split('?')[0];
                                return path + '?' + $.param(urlParams);
                            }
                        },
                        parameterMap:function (data) {
                            //return {filter:JSON.stringify(data)};
                            data = data['filter']['filters'];
                            //Don't trigger stack charts refresh for the first time
                            if (globalObj['startDt'] == null) {
                                globalObj['startDt'] = new XDate(data[0]['value']);
                                globalObj['endDt'] = new XDate(data[1]['value']);
                            } else {
                                globalObj['startDt'] = new XDate(data[0]['value']);
                                globalObj['endDt'] = new XDate(data[1]['value']);
                                //refreshStackCharts();
                            }
                            //Get the end points for the bottom chart
                            var navigatorDS = $(selector).data('kendoStockChart')._navigator.dataSource;
                            var navigatorSmplCnt = navigatorDS.data().length;
                            var navigatorURL = $(selector).data('kendoStockChart').options.navigator.dataSource.transport.read.url();
                            var navigatorParams = $.deparam(navigatorURL);
                            logMessage('flowSeriesChart', 'selected range in navigator', new XDate(data[0]['value']), new XDate(data[1]['value']));
                            var retParams = {
                                startTime:new XDate(data[0]['value']).getTime(), endTime:new XDate(data[1]['value']).getTime(), timeGran:7
                            }
                            /*if(navigatorSmplCnt > 0) {
                             $.extend(retParams,{ relStartTime:navigatorDS.data()[0]['date'].getTime(),relEndTime:navigatorDS.data()[navigatorSmplCnt-1]['date'].getTime() });
                             }*/
                            $.extend(retParams, { relStartTime:navigatorParams['startTime'], relEndTime:navigatorParams['endTime']});
                            return retParams;
                        },
                    },
                    change:function () {
                        //console.info('datasource updated');
                    },
                    schema:{
                        parse:function (response) {
                            return parseFlowSeriesData(response, 'top');
                        }
                    }
                },
                dataBound:function (e) {
                    var chart = e.sender;
                    var dataPointCnt = chart.dataSource.data().length;
                    var data = chart.dataSource.data();
                    var inBytesMinMax = d3.extent(data, function (obj) {
                        return obj['inBytes']
                    });
                    var outBytesMinMax = d3.extent(data, function (obj) {
                        return Math.abs(obj['outBytes']);
                    });
                    //if all samples are zero,don't reset the initial min/max
                    if (inBytesMinMax[1] == 0 && outBytesMinMax[1] == 0) {
                    } else {
                        //Set the scaling of value axes to auto
                        delete chart['options']['valueAxis'][0]['min'];
                        delete chart['options']['valueAxis'][0]['max'];
                    }
                    //Refresh other charts on the page
                    //if(dataPointCnt > 0) {
                    hideChartNoData(selector);
                    //Can't use ceil as it may exceed the array length
                    var startIndex = Math.floor(parseInt(dataPointCnt * .1));
                    var endIndex = Math.floor(parseInt(dataPointCnt * .9));
                    //logMessage('flowSeriesChart', "Start Date:", data[0]['date'], "End Date:", data[data.length - 1]['date']);
                    //logMessage('flowSeriesChart', "StartIndex:", startIndex, data[startIndex]['date'], "End Index:", endIndex, data[endIndex]['date']);
                    //Once we add severSideFiltering,can't change the navigator selector range inside dataBound as it again tirggers refresh and dataBound
                    //chart.options.navigator.select.from = data[startIndex]['date'];
                    //chart.options.navigator.select.to = data[endIndex]['date'];
                    /*} else {
                     showChartNoData(selector);
                     }*/
                },
                valueAxis:valueAxes,
                tooltip:{
                    visible:true,
                    format:"{0} b",
                    template:kendo.template($(tooltipTemplateSel).html()),
                },
                categoryAxis:{
                    majorGridLines:{
                        visible:false
                    },
                    majorTicks:{
                        visible:false,
                        size:3,
                        width:1
                    },
                    labels:{
                        mirror:true,
                        //step:2,
                        skip:3,
                        noOfLbls:8,
                        color:"#727f8e"
                    },
                    baseUnit:'seconds',
                    //If we keep baseUnitStep as 10 sec,then alternate 10 sec buckets will have 2 data points
                    baseUnitStep:7
                },
                dateField:dateField,
                seriesDefaults:{
                    type:"line",
                    width:2,
                    markers:{
                        visible:false
                    }
                },
                legend:{
                    visible:true,
                    labels:{
                        font:"14px Arial,Helvetica,sans-serif",
                    },
                },
                series:series,
                navigator:{
                    dataSource:{
                        transport:{
                            read:{
                                url:function () {
                                    //Handle the scenario if url itself is a function
                                    var urlStr = "";
                                    if (typeof(url) == 'function') {
                                        urlStr = url();
                                    } else
                                        urlStr = url;
                                    var urlParams = $.deparam(urlStr);
                                    //urlParams['minsSince'] = 30;
                                    var path = urlStr.split('?')[0];
                                    return path + '?' + $.param(urlParams);
                                }
                            },
                        },
                        schema:{
                            parse:function (response) {
                                return parseFlowSeriesData(response, 'navigator');
                            }
                        }
                    },
                    tooltip:{
                        visible:true,
                        format:"{0} b",
                        template:kendo.template($(tooltipTemplateSel).html()),
                    },
                    hint:{
                        visible:false,
                        template:"From: #= from # To: #= to #"
                    },
                    categoryAxis:{
                        baseUnit:'minutes',
                        baseUnitStep:1,
                        /*baseUnit:'minutes',
                         autoBaseUnitSteps: {
                         minutes:[1]
                         },*/
                        labels:{
                            color:"#727f8e",
                            mirror:false,
                            step:1,
                            visible:false,
                            template:'#=value#'
                        }
                    },
                    series:[
                        {
                            type:"line",
                            field:fields[0],
                            color:defColors[0],
                            aggregate:'sum',
                            labels:{
                                visible:false
                            },
                            tooltip:{
                                visible:true,
                                format:"{0} b/s",
                            }
                        },
                        {
                            type:"line",
                            field:fields[1],
                            aggregate:'sum',
                            color:defColors[1],
                            labels:{
                                visible:false
                            }
                        }
                    ],
                    select:{
                        from:new Date(new XDate().addMinutes(-10)),
                        to:new Date()
                    },
                }
            });
        },
        initScatterChart:function (data) {
            var chart, elem = $(this);
            var color = d3.scale.category10().range().slice().splice(1, 1), d;
            color = d3.scale.category10().range().splice(0, 1);
            var tooltipFn = ifNull(data['tooltipFn'], bgpMonitor.nodeTooltipFn);
            var xLbl = ifNull(data['xLbl'], 'CPU (%)'), xLblFormat = ifNull(data['xLblFormat'], d3.format());
            var yLbl = ifNull(data['yLbl'], 'Memory (MB)'), yLblFormat = ifNull(data['yLblFormat'], d3.format());
            var yDataType = ifNull(data['yDataType'], '');
            if ($.inArray(ifNull(data['title'], ''), ['vRouters', 'Analytic Nodes', 'Config Nodes', 'Control Nodes']) > -1) {
                data['forceX'] = [0, 0.15];
                xLblFormat = ifNull(data['xLblFormat'], d3.format('.02f'));
                //yLblFormat = ifNull(data['xLblFormat'],d3.format('.02f'));
            }
            if (data['d'] != null)
                d = data['d'];

            //Merge the data values array if there are multiple categories plotted in chart, to get min/max values
            var dValues = $.map(d,function(obj,idx) {
                return obj['values'];
            });
            dValues = flattenList(dValues);

            if(data['yLblFormat'] == null) {
                yLblFormat = function(y) {
                    return parseFloat(d3.format('.02f')(y)).toString();
                };
            }

            //If the axis is bytes,check the max and min and decide the scale KB/MB/GB
            //Set size domain
            var sizeMinMax = d3.extent(dValues, function (obj) {
                return  obj['size']
            });
            if (sizeMinMax[0] == sizeMinMax[1]) {
                sizeMinMax = [sizeMinMax[0] * .9, sizeMinMax[0] * 1.1];
            } else
                sizeMinMax = [sizeMinMax[0] * .9, sizeMinMax[1]];
            logMessage('scatterChart', 'sizeMinMax', sizeMinMax);
            var toFormat = '';
            //Decide the best unit to display in y-axis (B/KB/MB/GB/..) and convert the y-axis values to that scale
            if (yDataType == 'bytes') {
                yMaxMin = $.map(d3.extent(dValues, function (obj) {
                    return  obj['y']
                }), function (value, idx) {
                    return formatBytes(value);
                });
                if (yMaxMin[0].split(' ')[1] == yMaxMin[1].split(' ')[1]) {
                    toFormat = yMaxMin[0].split(' ')[1];
                } else
                    toFormat = yMaxMin[1].split(' ')[1];
                $.each(d,function(idx,obj) {
                    d[idx]['values'] = $.map(d[idx]['values'], function (obj, idx) {
                        obj['origY'] = obj['y'];
                        obj['y'] = prettifyBytes({bytes:obj['y'], stripUnit:true, prefix:toFormat});
                        return obj;
                    });
                });
                if (toFormat != null)
                    yLbl += ' (' + toFormat + ')';
            }

            //$(elem).show();
            nv.addGraph(function () {
                chart = nv.models.scatterChart()
                    .showDistX(true)
                    .showDistY(true)
                    //.forceX([0, 0.15])
                    //.height(500)
                    //.sizeDomain([0, 1])
                    .sizeDomain(sizeMinMax)
                    //.useVoronoi(true)
                    .tooltipXContent(null)
                    .tooltipYContent(null)
                    //.color(d3.scale.category10().range().splice(0,1));
                    //.color(color)
                    .showTooltipLines(false)
                    .tooltipContent(tooltipFn);

                if (data['forceX'] != null)
                    chart.forceX(data['forceX']);
                if (data['forceY'] != null)
                    chart.forceY(data['forceY']);

                //If more than one category is displayed,enable showLegend
                if(d.length == 1)
                    chart.showLegend(false);

                $(elem).data('chart', chart);

                /*
                 var dataCF = crossfilter(dValues);
                 var xDimension = dataCF.dimension(function (d) {
                 return d.x;
                 });
                 var yDimension = dataCF.dimension(function (d) {
                 return d.y;
                 });
                 var filterDimension = dataCF.dimension(function (d) {
                 return d.y;
                 });

                 //Set the tick value manually
                 var yRange = d3.extent(dValues, function (obj) {
                 return parseInt(obj['y']);
                 });
                 var start, step;
                 if (yRange[0] - yRange[1] < 20) {
                 step = 5;
                 start = yRange[0] - (yRange[0] % 5)
                 } else {
                 start = yRange[0] - (yRange[0] % 5)
                 step = (yRange[0] - yRange[1]) / 4;
                 }
                 var yTickValues = [];
                 for (var i = 0; i < 4; i++) {
                 yTickValues.push(start + (i * step));
                 }*/
                //chart.yAxis.tickValues(yTickValues);

                //Start - Axis customization
                chart.xAxis.tickFormat(xLblFormat);
                chart.yAxis.tickFormat(yLblFormat);
                chart.xAxis.showMaxMin(false);
                //chart.yAxis = d3.scale.linear().domain([0,1]).range(0,50);//tickFormat(formatBytes);
                chart.yAxis.showMaxMin(false);
                chart.yAxis.axisLabel(yLbl);
                chart.xAxis.axisLabel(xLbl);
                //chart.yAxis.nice();
                //chart.yAxis.tickFormat(d3.format('.02f'))
                //chart.yAxis.tickFormat(function() { return '';});
                //chart.xAxis.tickFormat(function() { return '';});
                chart.yAxis.ticks(3);
                //chart.xAxis.height(20);
                //chart.yAxis.width(30);
                //End - Axis customization
                //chart.yDomain([0,1]);
                //chart.forceY([0,2]);
                //$(elem).append($('svg'));
                $(elem).append('<svg></svg>');

                function zoom() {
                    console.info('zoom');
                    console.info(chart.xScale().domain(), chart.yScale().domain());
                    //Try rendering only x-axis/y-axis,instead of entire chart
                    //chart.update({x:chart.xScale().domain(),y:chart.yScale().domain()});
                    //chart.xAxis.scale(chart.xScale().domain());
                    //chart.yAxis.scale(chart.yScale().domain());
                    chart.update();
                }

                d3.select($(elem)[0]).select('svg')
                    //d3.select('.stack-chart svg')
                    .datum(d)
                    .transition().duration(500)
                    .call(chart);
                //d3.select($(elem)[0]).call(d3.behavior.zoom().x(chart.xScale()).y(chart.yScale()).scaleExtent([1, 8]).on("zoom", zoom))
                //   .on('mousemove.zoom', null).on('mousedown.zoom', null).on('mousewheel.zoom', null);

                nv.utils.windowResize(chart.update);

                chart.dispatch.on('stateChange', function (e) {
                    //nv.log('New State:', JSON.stringify(e));
                });

                chart.scatter.dispatch.on('elementClick', function (e) {
                    if (e['point']['type'] == 'vRouter') {
                        layoutHandler.setURLHashParams({node:'vRouters:' + e['point']['name'], tab:'', ip:e['point']['ip']}, {p:'mon_infra_compute'});
                    } else if (e['point']['type'] == 'controlNode') {
                        layoutHandler.setURLHashParams({node:'Control Nodes:' + e['point']['name'], tab:'', ip:e['point']['ip']}, {p:'mon_infra_control'});
                    } else if (e['point']['type'] == 'analyticsNode') {
                        layoutHandler.setURLHashParams({node:'Analytics Nodes:' + e['point']['name'], tab:'', ip:e['point']['ip']}, {p:'mon_infra_analytics'});
                    } else if (e['point']['type'] == 'configNode') {
                        layoutHandler.setURLHashParams({node:'Config Nodes:' + e['point']['name'], tab:'', ip:e['point']['ip']}, {p:'mon_infra_config'});
                    } else if (e['point']['type'] == 'network') {
                        layoutHandler.setURLHashParams({fqName:e['point']['name']}, {p:'mon_net_networks'});
                    } else if (e['point']['type'] == 'project') {
                        layoutHandler.setURLHashParams({fqName:e['point']['name']}, {p:'mon_net_projects'});
                    } else if ($.inArray(e['point']['type'], ['sport' | 'dport'] > -1)) {
                        /*var reqObj = {
                         autorun:true,
                         select_fields:'sport|sourcevn|time-granularity|sum(bytes)',
                         sourcevn:data['fqName'],
                         sport:e['point']['range'],
                         tg:60,
                         tgUnit:'secs',
                         end_time:new Date().getTime() * 1000,
                         start_time:new Date(new XDate().addMinutes(-30)).getTime() * 1000
                         };
                         if (e['point']['type'] == 'dport') {
                         delete reqObj['sport'];
                         reqObj['dport'] = e['point']['range'];
                         reqObj['select_fields'] = 'dport|sourcevn|time-granularity|sum(bytes)'
                         }
                         layoutHandler.setURLHashParams(reqObj, {p:'query_flow_series'});*/
                        var obj= {
                            fqName:data['fqName'],
                            port:e['point']['range']
                        };
                        if(e['point']['startTime'] != null && e['point']['endTime'] != null) {
                            obj['startTime'] = e['point']['startTime'];
                            obj['endTime'] = e['point']['endTime'];
                        }

                        if(e['point']['type'] == 'sport')
                            obj['portType']='src';
                        else if(e['point']['type'] == 'dport')
                            obj['portType']='dst';
                        if(obj['fqName'].split(':').length == 2) {
                            layoutHandler.setURLHashParams(obj,{p:'mon_net_projects'});
                        } else
                            layoutHandler.setURLHashParams(obj,{p:'mon_net_networks'});
                    }
                    //nv.log('New State:', JSON.stringify(e));
                });
                //Render hoirzontal/vertical sliders
                var hSlider = $(elem).siblings('.hSlider').kendoRangeSlider({
                    tickPlacement:'none',
                    min:Math.floor(chart.xScale().domain()[0] * 100),
                    max:Math.floor(chart.xScale().domain()[1] * 100),
                    //selectionStart:chart.xScale().domain()[0],
                    //selectionEnd:chart.xScale().domain()[1]
                }).data('kendoRangeSlider');
                var vSlider = $(elem).parent().parent().children('.vSlider').kendoRangeSlider({
                    orientation:'vertical',
                    showButtons:false,
                    tickPlacement:'none',
                    min:Math.floor(chart.yScale().domain()[0] * 100),
                    max:Math.floor(chart.yScale().domain()[1] * 100)
                }).data('kendoRangeSlider');
                if (hSlider != null)
                    hSlider.bind('change', function (e) {
                        //var hRange = e.value;
                        //var vRange = vSlider.value();
                        updateChart(e.value, vSlider.value());
                    });
                if (vSlider != null)
                    vSlider.bind('change', function (e) {
                        updateChart(hSlider.value(), e.value);
                    });

                function updateChart(hRange, vRange) {
                    xDimension.filterAll();
                    xDimension.filter([hRange[0] / 100, hRange[1] / 100]);
                    yDimension.filterAll();
                    yDimension.filter([vRange[0] / 100, vRange[1] / 100]);
                    chart.scatter.xDomain([hRange[0] / 100, hRange[1] / 100]);
                    chart.scatter.yDomain([vRange[0] / 100, vRange[1] / 100]);
                    d3.select($(elem)[0]).select('svg').datum([
                        {key:'vRouters', values:filterDimension.top(Infinity)}
                    ]);
                    //chart.datum({key:'vRouters',values:filterDimension.top(Infinity)});
                    chart.update();
                }

                return chart;
            });
            //$(elem).hide();
        },
        initSparkLineChart:function (data) {
            var data = ifNull(data, {});
            var selector = $(this);
            var container = ifNull(data['container'], '');
            var valueField = ifNull(data['valueField'],'value');
            var chartType = 'column';
            var dataArr = [];
            var zeroValue = ifNull(data['zeroValue'], 1);
            var tooltipTemplate = '#= dataItem.name # : #= value <= ' + zeroValue + '? 0 : value #';
            if (data['tooltipTemplate'] != null)
                tooltipTemplate = data['tooltipTemplate'];
            var chartDS = constructChartDS(data);
            if (data['viewType'] != null)
                chartType = data['viewType'];

            var gridSparkLineConfig = {
                seriesDefaults:{
                    tooltip:{
                        visible:false
                    }
                },
                chartArea: {
                    background:'transparent'
                },
                tooltip:{
                    visible:false
                },
                categoryAxis:{
                    crosshair:{
                        visible:true,
                        tooltip:{
                            visible:false
                        }
                    }
                }
            };

            var sparkLineConfig = {
                type:chartType,
                dataSource:chartDS,
                dataBound:function (e) {
                    //Triggered only when data is specified via dataSource
                    var chart = e.sender;
                    var dataPointCnt = chart.dataSource.data().length;
                    /*if (chartType == 'column')
                     chart.options.chartArea.width = dataPointCnt * 15;*/
                    if(container != 'gridCell')
                        chart.options.chartArea.height = 44;
                },
                seriesDefaults:{
                    tooltip:{
                        visible:true,
                        template:tooltipTemplate
                    }
                },
                series:[
                    {
                        color:defColors[1],
                        field:valueField,
                    }
                ],
                valueAxis:{
                    crosshair:{
                        visible:false
                    },
                    line:{
                        width:3,
                        visible:true,
                        color:'red',
                    },
                    min:0,
                    //max:100
                }
            };

            if (container == 'gridCell') {
                //delete sparkLineConfig['chartArea']['width'];
                $.extend(true, sparkLineConfig, gridSparkLineConfig);
            }

            $(selector).kendoSparkline(sparkLineConfig);
            return $(selector);
        },
        initStackChart:function (data) {
            //If both fields are zero,then ignore that category
            var chartData = [];
            var selector = $(this);
            var series = constructChartSeries(data['columns']);
            var cfgObj = {};
            var logScale = ifNull(data['logScale'], 0);
            cfgObj = ifNull(data['cfgObj'], cfgObj);
            var categoryLabels = true;
            var stack = 1;
            stack = ifNull(data['stack'], stack);
            categoryLabels = ifNull(data['categoryLabels'], categoryLabels);
            var chartType = null;
            var chartDS = constructChartDS(data);

            var chartType = 'bar';
            if (data['chartType'] != null)
                chartType = data['chartType'];
            var lblRotation = 0;
            var tooltipTemplateSel = '#traffic-tooltip-template';

            var seriesFields = [];
            $.each(data['columns'], function (idx, obj) {
                seriesFields.push(obj['field']);
            });
            var passOnObject = {seriesFields:seriesFields, objectType:data['objectType'], context:data['context'], logScale:logScale};
            var tooltipCfgObj = {};
            var tooltipTemplate = kendo.template($(tooltipTemplateSel).html());
            if ($.inArray(ifNull(data['objectType'], ''), ['project', 'network', 'peer', 'port']) > -1) {
                tooltipCfgObj = {
                    template:kendo.template($(tooltipTemplateSel).html()),
                    //template: kendo.render(tooltipTemplate,'#= stackChartToolTip(' + JSON.stringify(passOnObject) + ',data)'),
                    //template: tooltipTemplate([{lbl:"Hello",value:"Hai"}]),
                    //template: tooltipTemplate(stackChartToolTip(JSON.stringify(passOnObject),data)),
                    //template: '#= tooltipTemplate(stackChartToolTip(' + JSON.stringify(passOnObject) + ',data))#',
                    //template: '#= stackChartToolTip(' + JSON.stringify(passOnObject) + ',data)#',
                    visible:true
                };
            } else if ($.inArray(ifNull(data['objectType'], ''), ['flow']) > -1) {
                tooltipCfgObj = {
                    position:'left',
                    template:'#= stackChartToolTip(' + JSON.stringify(passOnObject) + ',data) #',
                    //template: kendo.template('#= stackChartToolTip(' + JSON.stringify(passOnObject) + ',data) #'),
                    //template: '#= tooltipTemplate(stackChartToolTip(' + JSON.stringify(passOnObject) + ',data)) #',
                    //template: kendo.render(tooltipTemplate,'#= stackChartToolTip(' + JSON.stringify(passOnObject) + ',data)'),
                    //template: kendo.render(tooltipTemplate,'#= stackChartToolTip(' + JSON.stringify(passOnObject) + ',data)'),
                    visible:true
                };
            } else if (data['tooltipTemplate'] != null) {
                /*tooltipCfgObj = {
                 template: data['tooltipTemplate'],
                 visible:true
                 }*/
            }

            var finalCfgObj = $.extend(true, {
                plotAreaClick:function (e) {
                },
                seriesClick:function (e) {
                    //console.info('seriesClick');
                    //if((options != null) && (options['assignBarClick'] != null) && options['assignBarClick'] == true) {
                    //console.info(data['context'],data['objectType']);
                    if ($.inArray(data['objectType'], ['project', 'network']) != -1) {
                        selTreeNode({fqName:e.dataItem.name, exapnd:true});
                    } else if ((ENABLE_PEER_CLICK == 1) && ($.inArray(data['objectType'], ['peer']) != -1)) {
                        var network = e.dataItem.network;
                        var contextObj = getContextObj(data);
                        var reqObj = {};
                        $.extend(reqObj, {type:'peerdetail', ip:ifNull(e.dataItem.sourceip, e.dataItem.destip), vnName:ifNull(e.dataItem.sourcevn, e.dataItem.destvn)}, contextObj);
                        objSummaryView.load(reqObj);
                        //selTreeNode({fqName:network + ':Instances',exapnd:true});
                    } else if ((ENABLE_PORT_CLICK == 1) && ($.inArray(data['objectType'], ['port']) != -1)) {
                        var contextObj = getContextObj(data);
                        var reqObj = {};
                        $.extend(reqObj, {type:'portdetail', ip:ifNull(e.dataItem.sourceip, e.dataItem.destip), vnName:ifNull(e.dataItem.sourcevn, e.dataItem.destvn),
                            port:e.dataItem.port, protocol:e.dataItem.protocol}, contextObj, getSelInstanceFromDropDown());
                        objSummaryView.load(reqObj);
                    } else if ((ENABLE_FLOW_CLICK == 1) && ($.inArray(data['objectType'], ['flow']) != -1)) {
                        var fields = ['sourcevn', 'destvn', 'protocol', 'sport', 'dport', 'sourceip', 'destip'];
                        var reqParams = {};
                        $.each(fields, function (idx, field) {
                            reqParams[field] = e.dataItem[field];
                        });
                        var viewObj = tenantNetworkMonitorView;
                        viewObj.loadSubView($.extend(reqParams, {'view':'list', 'type':'flowdetail'}));
                    } else if (data['objectType'] == 'connected-nw') {
                        var srcVN = data['fqName'];
                        var dstVN = e.dataItem.name;
                        var srcVNArr = srcVN.split(':'), dstVNArr = dstVN.split(':');
                        var matchIdx = 0;
                        $.each(srcVNArr, function (idx, name) {
                            if (name == dstVNArr[idx])
                                matchIdx++;
                            else
                                return false;
                        });
                        dstVNArr.splice(0, matchIdx);
                        selTreeNode({fqName:kendo.format('{0}:Connected Networks:{1}', srcVN, dstVNArr.join(':')), exapnd:true});
                    }
                },
                axisLabelClick:function (e) {
                },
                dataSource:chartDS,
                dataBound:function (e) {
                    logMessage('chart dataBound');
                    var chart = e.sender;
                    //Update Chart title if globalObj.startDt is not null
                    if (globalObj.startDt != null) {
                        var titleElem = $(chart).siblings('.example-title')
                        var titleText = titleElem.text();
                        titleText = titleText.split('(')[0];
                        titleText += ' ' + globalObj.startDt.toString('M/d/yy h:mm') + ' - ' + globalObj.endDt.toString('M/d/yy h:mm');
                        titleElem.text(titleText);
                    }
                    //Indicate that chart has loaded
                    $(e.sender.element).data('loaded', true);
                    var stack = chart.options.seriesDefaults.stack;
                    var dataPointCnt;
                    if (stack == 1)
                        dataPointCnt = chart.dataSource.data().length;
                    else
                        dataPointCnt = chart.dataSource.data().length * chart.options.series.length;
                    //if(dataPointCnt < 3 && dataPointCnt > 0) {
                    if (dataPointCnt > 0) {
                        hideChartNoData(selector);
                        if (chartType == 'bar') {
                            chart.options.chartArea.height = getBarChartHeight(dataPointCnt);
                            chart.options.chartArea.width = 375;
                            $(selector).width(375);
                        }
                        else if (chartType == 'column') {
                            chart.options.chartArea.width = getColumnChartWidth(dataPointCnt);
                            //To apply margin auto,set the chart container element width also
                            $(selector).width(getColumnChartWidth(dataPointCnt));
                            chart.options.categoryAxis.labels.rotation = 60;
                        }
                    }
                    //Hide the chart
                    if (dataPointCnt == 0) {
                        showChartNoData(selector);
                    }
                },
                legend:{
                    visible:false,
                    position:"left"
                },
                series:series,
                seriesDefaults:{
                    gap:0.7,
                    stack:stack,
                    type:chartType,
                    //color: "#1c638d",
                    border:{
                        width:0
                    },
                    overlay:{
                        gradient:"none"
                    }
                },
                axisDefaults:{
                    majorGridLines:{ visible:false },
                    majorTicks:{ visible:false }
                },
                categoryAxis:{
                    field:"name",
                    //visible:false,
                    labels:{
                        rotation:lblRotation,
                        //format: "MMM",
                        color:"#727f8e",
                        visible:categoryLabels,
                        mirror:true,
                        //color:'#BDBDBD',
                        color:'#D9D9D9',
                        font:"12px Arial,Helvetica,sans-serif",
                        template:'#=chartLblTemplate(' + JSON.stringify(getContextObj(data)) + ',value)#',
                        //reverse:true
                    }
                },
                tooltip:tooltipCfgObj,
                valueAxis:{
                    visible:false
                },
                //legend: { visible: false }
            }, cfgObj);
            $(this).kendoChart(finalCfgObj);
        }
    })
})(jQuery);

function prettifyBytes(obj) {
    var bytes = obj['bytes'];
    var maxPrecision = obj['maxPrecision'];
    var noDecimal = obj['noDecimal'];
    var stripUnit = obj['stripUnit'];
    if (!$.isNumeric(bytes))
        return '-';
    if (bytes == 0)
        return (stripUnit != null) ? 0 : '0 B';
    var formatStr = '';
    var decimalDigits = 2;
    if ((maxPrecision != null) && (maxPrecision == true))
        decimalDigits = 6;
    if (noDecimal != null && noDecimal == true)
        decimalDigits = 0;
    //Ensure that bytes is always positive
    bytes = parseInt(bytes);
    bytes = makePositive(bytes);
    var bytePrefixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB'];
    var multipliers = [1, 1024, 1024 * 1024, 1024 * 1024 * 1024];
    var prefixIdx = 0;
    var multiplier = 1;
    if ($.inArray(obj['prefix'], bytePrefixes) > -1) {
        prefixIdx = $.inArray(obj['prefix'], bytePrefixes);
        multiplier = multipliers[prefixIdx];
    } else
        $.each(bytePrefixes, function (idx, prefix) {
            //Can be converted into higher unit
            if (bytes / multiplier > 1024) {
                multiplier = multiplier * 1024;
                prefixIdx++;
            } else
                return false;
        });
    if (stripUnit != null)
        formatStr = parseFloat((bytes / multiplier).toFixed(decimalDigits));
    else
        formatStr = kendo.format('{0} {1}', (bytes / multiplier).toFixed(decimalDigits), bytePrefixes[prefixIdx]);
    logMessage('formatBytes', bytes, multiplier, prefixIdx, bytes / multiplier);
    return formatStr;
}

function formatThroughput(bytes,noDecimal,maxPrecision) {
    return formatBytes(bytes,noDecimal,maxPrecision).replace('B','b') + 'ps';
}

function formatBytes(bytes, noDecimal, maxPrecision) {
    if (!$.isNumeric(bytes))
        return '-';
    if (bytes == 0)
        return '0 B';
    var formatStr = '';
    var decimalDigits = 2;
    if ((maxPrecision != null) && (maxPrecision == true))
        decimalDigits = 6;
    if (noDecimal != null && noDecimal == true)
        decimalDigits = 0;
    //Ensure that bytes is always positive
    bytes = parseInt(bytes);
    bytes = makePositive(bytes);
    var bytePrefixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB']
    $.each(bytePrefixes, function (idx, prefix) {
        if (bytes < 1024) {
            formatStr = kendo.format('{0} {1}', parseFloat(bytes.toFixed(decimalDigits)), prefix);
            return false;
        } else {
            //last iteration
            if (idx == (bytePrefixes.length - 1))
                formatStr = kendo.format('{0} {1}', parseFloat(bytes.toFixed(decimalDigits)), prefix);
            else
                bytes = bytes / 1024;
        }
    });
    return formatStr;
}

function convertToBytes(formattedBytes) {
    var formatStr;
    var decimalDigits = 2;
    var arr = formattedBytes.split(" ");
    var value = arr[0];
    var unit = arr[1];
    var unitMultiplier = {'B':1, 'KB':1024, 'MB':1024 * 1024, 'GB':1024 * 1024 * 1024};
    return value * unitMultiplier[unit];
}

function fixDecimals(number, maxPrecision) {
    try {
        return parseInt(number).toFixed(maxPrecision);
    } catch (e) {
        return number;
    }
}

function ifNull(value, defValue) {
    if (value == null)
        return defValue;
    else
        return value;
}

function ifNullOrEmptyObject(value, defValue) {
    //If value is null or an empty object
    if (value == null || ($.isPlainObject(value) && $.isEmptyObject(value)))
        return defValue;
    else
        return value;
}

function ifEmpty(value, defValue) {
    if (value == '')
        return defValue;
    else
        return value;
}

function ifNotEmpty(value,defValue) {
    if(value != '')
        return defValue;
    else
        value;
}

function makePositive(num) {
    if (num < 0)
        return -1 * num;
    else
        return num;
}

function makeNegative(num) {
    if (num > 0)
        return -1 * num;
    else
        return num;
}

function dot2num(dot) {
    var d = dot.split('.');
    return ((((((+d[0]) * 256) + (+d[1])) * 256) + (+d[2])) * 256) + (+d[3]);
}

function num2dot(num) {
    var d = num % 256;
    for (var i = 3; i > 0; i--) {
        num = Math.floor(num / 256);
        d = num % 256 + '.' + d;
    }
    return d;
}

function ip2long(ip) {
    if (typeof(ip) != 'string')
        return ip;
    var ipl = 0;
    ip.split('.').forEach(function (octet) {
        ipl <<= 8;
        ipl += parseInt(octet);
    });
    return(ipl >>> 0);
}

function long2ip(ipl) {
    if (typeof(ipl) != 'number')
        return ipl;
    return ( (ipl >>> 24) + '.' +
        (ipl >> 16 & 255) + '.' +
        (ipl >> 8 & 255) + '.' +
        (ipl & 255) );
}

function pushBreadcrumb(breadcrumbsArr) {
    for (var i = 0; i < breadcrumbsArr.length; i++) {
        //Remove active class
        $('#breadcrumb').children('li').removeClass('active');
        if (i == 0) {
            //Add divider icon for previous breadcrumb
            $('#breadcrumb').children('li:last').append('<span class="divider"><i class="icon-angle-right"></i></span>')
        }
        if (i == breadcrumbsArr.length - 1) {
            $('#breadcrumb').append('<li class="active"><a>' + breadcrumbsArr[i] + '</a></li>');
        } else {
            $('#breadcrumb').append('<li><a>' + breadcrumbsArr[i] + '</a><span class="divider"><i class="icon-angle-right"></i></span></li>');
        }
    }
}

function MenuHandler() {
    var self = this;
    var menuObj;
    self.deferredObj = $.Deferred();
    var menuDefferedObj = $.Deferred(), orchDefferedObj = $.Deferred();

    this.loadMenubox = function () {
        var menuTemplate = kendo.template($('#menu-box-template').html());
        $('#mainmenu').addClass('menubox');
        $('#mainmenu').html(menuTemplate(processMenu(menuObj['items']['item'])));
        assignMenuEvents();
    }

    this.loadMenu = function () {
        $.get('/menu.xml', function (xml) {
            menuObj = $.xml2json(xml);
            processXMLJSON(menuObj);
            // TODO: Required cleanup by Naga
            /*
             var menuTemplate = kendo.template($('#menu-template').html());
             var menuTemplate = kendo.template($('#menu-box-template').html());
             $('#mainmenu').addClass('menubox');
             var processedMenuObj = processMenu(menuObj['items']['item']);
             $('#mainmenu').html(menuTemplate(processedMenuObj));
             */
            assignMenuEvents();
            menuDefferedObj.resolve();
        });
        $.ajax({
            url:'/api/service/networking/orchestration/model'
        }).done(function (result) {
                globalObj['orchModel'] = result['orchestrationModel'];
                orchDefferedObj.resolve();
            });
        $.when.apply(window, [menuDefferedObj, orchDefferedObj]).done(function () {
            self.deferredObj.resolve();
        });
    }

    this.toggleMenuButton = function (menuButton, currPageHash, lastPageHash) {
        var currentBCTemplate = kendo.template($('#current-breadcrumb').html());
        var currPageHashArray, subMenuId, reloadMenu, linkId;
        if (menuButton == null) {
            currPageHashArray = currPageHash.split('_');
            //Looks scalable only till 2nd level menu
            subMenuId = '#' + currPageHashArray[0] + '_' + currPageHashArray[1];
            linkId = '#' + currPageHashArray[0] + '_' + currPageHashArray[1] + '_' + currPageHashArray[2];
            menuButton = getMenuButtonName(currPageHashArray[0]);
            //If user has switched between top-level menu
            reloadMenu = check2ReloadMenu(lastPageHash, currPageHashArray[0]);
        }
        if (reloadMenu == null || reloadMenu) {
            $('#menu').html('');
            $('#menu').html(kendo.template($('#' + menuButton + '-menu-template').html()));
            if ($('#sidebar').hasClass('menu-min')) {
                $('#sidebar-collapse').find('i').toggleClass('icon-chevron-left').toggleClass('icon-chevron-right');
            }
            this.selectMenuButton("#btn-" + menuButton);
        }
        if (subMenuId == null) {
            subMenuId = "#" + $('.item:first').find('ul:first').attr("id");
            window.location = $(subMenuId).find('li:first a').attr("href"); // TODO: Avoid reload of page; fix it via hash.
        } else {
            toggleSubMenu($(subMenuId), linkId);
            var currURL = window.location.href.split(window.location.host)[1];
            //Modify breadcrumb only if current URL is same as default one
            //Reset to default menu breadcrumbs
            //if($(linkId + ' a').attr('href') == currURL) {
            //var breacrumbsArr = [$(linkId).parents('li').parents('ul').children('li:first').children('a').text().trim(),
            //    $(linkId + ' a').text().trim(),$(linkId).parents('li').children('a').text().trim()];
            var breadcrumbsArr = [{
                href:$(linkId + ' a:first').attr('href').trim(),
                link:$(linkId + ' a:first').text().trim()
            }];
            if ($(linkId).parents('ul').length == 2) {
                breadcrumbsArr.unshift({
                    href:$(linkId).parents('li').children('a:first').attr('data-link').trim(),
                    link:$(linkId).parents('li').children('a:first').text().trim()
                });
                breadcrumbsArr.unshift({
                    href:$(linkId).parents('li').parents('ul').children('li:first').children('a:first').attr('data-link').trim(),
                    link:$(linkId).parents('li').parents('ul').children('li:first').children('a:first').text().trim()
                });
            } else {
                breadcrumbsArr.unshift({
                    href:$(linkId).parents('li').parents('ul').children('li:first').children('a:first').attr('data-link').trim(),
                    link:$(linkId).parents('li').parents('ul').children('li:first').children('a:first').text().trim()
                });
            }
            $('#breadcrumb').html(currentBCTemplate(breadcrumbsArr));
            //}
        }
    }

    this.selectMenuButton = function (buttonId) {
        $('#btn-monitor').removeClass("active");
        $('#btn-configure').removeClass("active");
        $('#btn-query').removeClass("active");
        $('#btn-setting').removeClass("active");
        $(buttonId).addClass("active");
    }

    /*
     * post-processing of menu XML JSON
     * JSON expectes item to be an array,but xml2json make item as an object if there is only one instance
     */
    function processXMLJSON(json) {
        if ((json['items'] != null) && (json['items']['item'] != null)) {
            if (json['items']['item'] instanceof Array) {
                for (var i = 0; i < json['items']['item'].length; i++) {
                    processXMLJSON(json['items']['item'][i]);
                    add2SiteMap(json['items']['item'][i]);
                }
            } else {
                processXMLJSON(json['items']['item']);
                add2SiteMap(json['items']['item']);
                json['items']['item'] = [json['items']['item']];
            }
        }
    }

    function add2SiteMap(item) {
        var searchStrings = item.searchStrings, hash = item.hash, queryParams = item.queryParams;
        if (hash != null && searchStrings != null) {
            var searchStrArray = splitString2Array(searchStrings, ',');
            siteMap[hash] = {searchStrings:searchStrArray, queryParams:queryParams};
            for (var j = 0; j < searchStrArray.length; j++) {
                siteMapSearchStrings.push(searchStrArray[j]);
            }
        }
    }

    function isDependencyOk(dependencies) {
        return true;
    }

    /*
     * Strip down the menu object to only required fields
     */
    function formatMenuObj(currMenu) {
        var retMenuObj = {};
        $.each(['label', 'class', 'name'], function (index, value) {
            if (value == 'class') {
                if ((currMenu[value] == null) && (currMenu['loadFn'] == null))
                    retMenuObj['cls'] = 'disabled';
                else
                    retMenuObj['cls'] = 'enabled';
                if (currMenu['hide'] == 'true')
                    retMenuObj['cls'] = 'hide';
            } else {
                retMenuObj[value] = currMenu[value];
            }
        });
        return retMenuObj;
    }

    function processMenu(menuObj) {
        var retMenuObj = [];
        for (var i = 0, j = 0; i < menuObj.length; i++) {
            //Process this menu only if dependencies are OK
            if (isDependencyOk(menuObj[i])) {
                retMenuObj[j] = formatMenuObj(menuObj[i]);
                if ((menuObj[i]['items'] != null) && (menuObj[i]['items']['item'] != null) && (menuObj[i]['items']['item'].length > 0)) {
                    retMenuObj[j]['items'] = {};
                    retMenuObj[j]['items'] = processMenu(menuObj[i]['items']['item']);
                }
                j++;
            }
        }
        return retMenuObj;
    }

    this.destroyView = function (currMenuObj) {
        if (currMenuObj == null)
            return;
        //Call destory function on viewClass which is being unloaded
        if ((currMenuObj['class'] != null) && (typeof(window[currMenuObj['class']]) == 'function' || typeof(window[currMenuObj['class']]) == 'object') &&
            (typeof(window[currMenuObj['class']]['destroy']) == 'function')) {
            try {
                window[currMenuObj['class']]['destroy']();
            } catch (error) {
                console.log(error.stack);
            }
        }
        //window[currMenuObj['class']] = null;
    }

    this.getMenuObjByHash = function (menuHash, currMenuObj) {
        if (currMenuObj == null)
            currMenuObj = menuObj['items']['item'];
        for (var i = 0; i < currMenuObj.length; i++) {
            //console.info(currMenuObj[i]['hash']);
            if (currMenuObj[i]['hash'] == menuHash)
                return currMenuObj[i];
            if ((currMenuObj[i]['items'] != null) && (currMenuObj[i]['items']['item'] != null) && (currMenuObj[i]['items']['item'].length > 0)) {
                var retVal = self.getMenuObjByHash(menuHash, currMenuObj[i]['items']['item']);
                if (retVal != -1)
                    return retVal;
            }
        }
        return -1;
    }

    this.getMenuObjByName = function (menuName) {
        menuName = menuName.replace('menu_', '');
        var currMenuObj = menuObj;
        for (var i = 0; i < menuName.length; i++) {
            var currMenuIdx = menuName[i];
            currMenuObj = currMenuObj['items']['item'][currMenuIdx];
        }
        return currMenuObj;
    }

    this.loadResourcesFromMenuObj = function(currMenuObj,deferredObj) {
        if (currMenuObj['rootDir'] != null) {
            //Update page Hash only if we are moving to a different view
            var currHashObj = layoutHandler.getURLHashObj();
            if (currHashObj['p'] != currMenuObj['hash']) {
                layoutHandler.setURLHashObj({p:currMenuObj['hash'], q:currMenuObj['queryParams']});
                globalObj.hashUpdated = 1;
            }
            var deferredObjs = [];
            var rootDir = currMenuObj['rootDir'];
            var viewDeferredObj = $.Deferred();
            if (currMenuObj['view'] != null) {
                templateLoader.loadExtTemplate(rootDir + '/views/' + currMenuObj['view'], viewDeferredObj, currMenuObj['hash']);
            } 
            //View file need to be downloaded first before executing any JS file
            viewDeferredObj.done(function() {
                if (currMenuObj['js'] instanceof Array) {
                } else
                    currMenuObj['js'] = [currMenuObj['js']];
                var isLoadFn = currMenuObj['loadFn'] != null ? true : false;
                var isReloadRequired = true;
                //Restrict not re-loading scripts only for monitor infrastructure and monitor networks for now
                if(currMenuObj['class'] == 'infraMonitorView' || currMenuObj['class'] == 'tenantNetworkMonitorView')
                    isReloadRequired = false;
                $.each(currMenuObj['js'], function () {
                    //Load the JS file only if it's not loaded already
                    //if (window[currMenuObj['class']] == null)
                    if(($.inArray(rootDir + '/js/' + this,globalObj['loadedScripts']) == -1) ||
                        (isLoadFn == true) || (isReloadRequired == true))
                        deferredObjs.push(getScript(rootDir + '/js/' + this));
                });
                /*$.each(currMenuObj['css'],function() {
                     deferredObjs.push(loadCSS(rootDir + '/css/' + this));
                 });*/
                $.when.apply(window, deferredObjs).done(function () {
                    deferredObj.resolve();
                });
            });
        }
    }

    this.loadViewFromMenuObj = function (currMenuObj) {
        //Store in globalObj
        globalObj.currMenuObj = currMenuObj;
        var deferredObj = $.Deferred();
        try {
                self.loadResourcesFromMenuObj(currMenuObj,deferredObj);
                deferredObj.done(function () {
                    if (currMenuObj['loadFn'] != null) {
                        window[currMenuObj['loadFn']]();
                    } else if (currMenuObj['class'] != null) {
                        //Cleanup the container
                        $(contentContainer).html('');
                        window[currMenuObj['class']].load({containerId:contentContainer, hashParams:layoutHandler.getURLHashParams()});
                    }
                });
        } catch (error) {
            console.log(error.stack);
        }
    }

    function assignMenuEvents() {
        $('#mainmenu').on('hover', '> ul > li.disabled', function (event) {
            //Find the index of menu clicked and show the corresponding popup
            var menuId = $(this).attr('id');
            $('.menu-popup').hide();
            $(this).find('.menu-popup').show();
            //$(this).find('.menu-popup').slideDown();
        });

        $('#mainmenu').on('click', '> ul > li.enabled', function (event) {
            $('.menu-popup').hide();
            loadViewByName($(this).attr('name'));
        });
        $('#mainmenu').on('mouseleave', '> ul > li', function (event) {
            $('.menu-popup').hide();
        });
        /*
         $('.menu-popup').on('mouseleave',function(event) {
         console.info('mouseleave menupopup');
         var currElem = document.elementFromPoint(event.clientX,event.clientY);
         //On mouse leave and mouse pointer is not on #mainmenu
         //Vice-versa also need to be added on #mainmenu leave and mouse pointer not on .menu-poup??
         if($(currElem).parents('#mainmenu').length == 0) {
         } else {
         $('.menu-popup').hide();
         }
         });*/

        $('.menu-popup').on('click', 'li,h3', function (event) {
            $('.menu-popup').hide();
            loadViewByName($(this).attr('name'));
        });
    }

    function loadViewByName(name) {
        //Destory current view
        self.destroyView(globalObj.currMenuObj);
        var currMenuObj = self.getMenuObjByName(name);
        self.loadViewFromMenuObj(currMenuObj);
    }
}

kendoChartLib = {
    //Changes the type of each series to given chartType
    setChartType:function (selector, chartType, isStockChart) {
        var currChart = $(selector).data('kendoChart');
        //if(isStockChart != null && isStockChart == true)
        if (currChart == null)
            currChart = $(selector).data('kendoStockChart');
        for (var i = 0; i < currChart.options.series.length; i++) {
            currChart.options.series[i].type = chartType;
        }
        currChart.refresh();
    },
    //Changes the type of all charts under the given parentSelector
    initChartTypesBar:function (selector, parentSelector, defaultSel) {
        var chartTypesMap = {'bar':'Bar', 'column':'Column'};
        //Render the chartType template
        var chartTypeTemplate = kendo.template($('#chart-type-template').html());
        $(selector).html(chartTypeTemplate);
        if (defaultSel != null) {
            $(selector + ' li').removeClass('active');
            $(selector + ' li:contains(' + chartTypesMap[defaultSel] + ')').addClass('active');
        }
        $(selector).on('click', 'li:even', function (event) {
            $(selector + ' li:even').removeClass('active');
            $(this).addClass('active');
            if ($(this).text() == 'Bar') {
                changeChartType(parentSelector, 'bar')
            } else if ($(this).text() == 'Column') {
                changeChartType(parentSelector, 'column')
            }
        });
    },
    initIntervalTypesBar:function (selector, callbackFn, defaultSel) {
        var intervalTypesTemplate = kendo.template($('#interval-type-template').html());
        $(selector).html(intervalTypesTemplate);
        var intvlMap = {"10m":'600000',
            "1h":'3600000',
            "24h":'86400000'};
        $(selector).on('click', 'li', function (event) {
            $(selector + ' li').removeClass('active');
            $(this).addClass('active');
            callbackFn(intvlMap[$(this).text()]);
        });
    }
}

function initToggleOptions(selector) {
}

function initConfigLinks(selector) {
    $(selector).on('click', 'li', function (event) {
        var text = $(this).text();
        $('.config-panel').hide();
        $('#config-' + text).show();
        $(this).addClass('active');
    });
    $('.config-panel').on('click', '.close-icon', function (event) {
        $('.config-panel').hide();
        $(selector + ' li').removeClass('active');
    });
}

function strUtil() {
    this.splitStrToChunks = function (value) {
        var valueArr = [];
        var startIdx = 0;
        do {
            valueArr.push(value.substr(startIdx, 10));
            startIdx += 10;
        } while (startIdx < value.length)
        valueArr.push(value.substr(startIdx));
        //console.info(valueArr);
        return valueArr;
    }
}

function createPortlet(selector) {

}

function getObjectIdxInArray(filter, arr) {
    var arrLen = arr.length;
    var retIdx = -1;
    if ((filter['key'] == null) || (filter['value'] == null))
        return retIdx;
    for (var i = 0; i < arrLen; i++) {
        if (arr[i][filter['key']] == filter['value']) {
            retIdx = i;
            break;
        }
    }
    return retIdx;
}

var stringUtil = new strUtil();

function initMasterTooltip() {
    // Tooltip only Text
    $('body').on({
        'mouseenter':function () {
            // Hover over code
            var title = $(this).attr('title');
            $(this).data('tipText', title).removeAttr('title');
            $('<p class="tooltip"></p>')
                .html(title)
                .appendTo('body')
                .fadeIn('slow');
        },
        'mouseleave':function () {
            // Hover out code
            $(this).attr('title', $(this).data('tipText'));
            $('.tooltip').remove();
        },
        'mousemove':function (e) {
            var mousex = e.pageX + 20; //Get X coordinates
            var mousey = e.pageY + 10; //Get Y coordinates
            //If tooltip truncates,set the right as 0?
            $('.tooltip')
                .css({ top:mousey, left:mousex })

        },
        'mousedown':function () {
            //Remove the tooltip on mouse down
            $('.tooltip').remove();
        }}, '.mastertooltip');
}

function isInitialized(selector) {
    if ($(selector).attr('data-role') != null)
        return true;
    else
        return false;
}

function flattenList(arr) {
    //Flatten one-level of the list
    return $.map(arr, function (val) {
        return val;
    });
}
function flattenArr(arr) {
    var retArr = [];
    $.each(arr, function (idx, obj) {
        if (obj['length'] != null)
            $.each(obj, function (idx, obj) {
                retArr.push(obj);
            });
        else
            retArr.push(obj);
    });
    return retArr;
}

$.deparam = function (query) {
    var query_string = {};
    if (query.indexOf('?') > -1)
        query = query.substr(query.indexOf('?') + 1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        pair[0] = decodeURIComponent(pair[0]);
        pair[1] = decodeURIComponent(pair[1]);
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]], pair[1] ];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(pair[1]);
        }
    }
    return query_string;
};

function showInfoWindow(msg, title) {
    var infoWindow = $('#infoWindow');
    if (title == null)
        title = 'Information Window';

    infoWindow.find('.modal-header-title').text(title);

    infoWindow.find("#infowindow-message").text(msg);

    infoWindow.modal({backdrop:'static', keyboard:false});

}
function reloadKendoGrid(kGrid) {
    //Only reset the HTML of grid as setting the dataSource to empty triggers change event on dataSource
    //kGrid.dataSource.data([]);
    //showGridMessage(kGrid.element,'');
    kGrid.dataSource.read();
}

/**
 * Template to show the tooltip on grid cells
 */
function cellTemplate(options) {
    var name = null, nameStr = '', cellText = '', titleStr = '', nameCls = '', tooltipCls = '', onclickAction = '',colorCls = '';
    if (options == null)
        options = {};
    name = ifNull(options['name'], name);
    cellText = ifNull(options['cellText'], cellText);
    //Assign title attribute only if tooltipCls is present
    if ((cellText != null) && (cellText.indexOf('#') != 0))
        cellText = '#=' + cellText + '#';
    var tooltipText = cellText;
    tooltipText = ifNull(options['tooltipText'], tooltipText);

    if (name != null) {
        nameStr = 'name="' + name + '"';
        nameCls = 'cell-hyperlink';
    }
    if ((options['tooltip'] == true) || (options['tooltipText'] != null) || (options['tooltipFn'] != null)) {
        tooltipCls = 'mastertooltip';
        if (options['tooltipFn'] != null) {
            titleStr = 'title="#=tooltipFns.' + options['tooltipFn'] + '(data)#"';
        } else
            titleStr = 'title="' + tooltipText + '"';
    }
    if (options['onclick'] != null) {
        onclickAction = 'onclick="' + options['onclick'] + '"';
    }
    if (options['applyColor']){
        colorCls = '#=decideColor(\'{1}\',hostNameColor)#';
    } else {
        colorCls = nameCls;
    }
    return kendo.format("<div class='{1} {5}' {0} {2} {4}>{3}</div>", nameStr, tooltipCls, titleStr, cellText, onclickAction, colorCls);
}

/**
 * Default jQuery Ajax Error Handler
 */
function ajaxDefErrorHandler(xhr) {
    return;
    var responseText = x.responseText;
    if (x.status == 0) {
        showInfoWindow('You are offline!!n Please Check Your Network. ' + responseText);
    } else if (x.status == 404) {
        showInfoWindow('Requested URL not found. ' + responseText);
    } else if (x.status == 500) {
        showInfoWindow('Internel Server Error. ' + responseText);
    } else if (e == 'parsererror') {
        showInfoWindow('Error Parsing JSON Request failed. ' + responseText);
    } else if (e == 'timeout') {
        showInfoWindow('Request Time out. ' + responseText);
    } else {
        showInfoWindow('Unknow Error.n ' + x.responseText);
    }
}

function setGridContentHeight(kGrid) {
    return;
    //Set the height of k-grid-content
    var headerHeight = kGrid.element.find('.k-grid-header').height();
    var tableHeight = kGrid.element.height();
    kGrid.element.find('.k-grid-content').height(tableHeight - headerHeight);
}

function applyGridDefHandlers(kGrid, options) {
    var options = ifNull(options,{});
    if (typeof kGrid == "undefined")
        return;
    var noMsg = 'No data to display';
    if (options['noMsg'] != null)
        noMsg = options['noMsg'];
    kGrid.bind('dataBound',function(data) {
        $('.gridSparkline').each(function() {
            var rowIndex = $(this).closest('td').parent().index();
            $(this).initSparkLineChart({viewType:'line',container:'gridCell',dataSource:{tooltipTemplate:null,data:kGrid.dataSource.at(rowIndex)['histCpuArr']}});
        });
    });
    kGrid.dataSource.bind('change', function () {
        if (kGrid.dataSource.view().length == 0)
            showGridMessage('#' + $(kGrid.element).attr('id'), noMsg);
        //Append the current row count
        if (options['selector'] != null) {
            var innerText = options['selector'].text().split('(')[0].trim();
            var totalCnt = kGrid.dataSource.data().length;
            var filteredCnt = kGrid.dataSource.total();
            totalCnt = ifNull(options['totalCntFn'](), totalCnt);
            if (totalCnt == filteredCnt)
                innerText += ' (' + totalCnt + ')';
            else
                innerText += ' (' + filteredCnt + ' of ' + totalCnt + ')';
            options['selector'].text(innerText);
        }
    });
    kGrid.dataSource.bind('error', function (xhr, error) {
        if (xhr.errorThrown == 'timeout')
            showGridMessage(kGrid, 'Timeout in fetching the details');
        else
            showGridMessage(kGrid, 'Error in run query: ' + xhr.errorThrown);
    });
}

function sort(object) {
    if (Array.isArray(object)) {
        return object.sort();
    }
    else if (typeof object !== "object" || object === null) {
        return object;
    }

    return Object.keys(object).sort().map(function (key) {
        return {
            key:key,
            value:sort(object[key])
        };
    });
}

function isCellSelectable(elem) {
    if ($(elem).find('*[name]').length > 0)
        return $(elem).find('*[name]').attr('name');
    else
        return false;
}

function selectKendoTab(kTabStrip, tabIdx, filters) {
    kTabStrip.select(tabIdx);
    //Trigger select if it's the same tab
    //KendoUI doesn't trigger the select handler on calling select method with a tabIdx that is already current selected
    kTabStrip.trigger('select', {item:kTabStrip.element.find('.k-item.k-state-active')[tabIdx], filters:filters});
}

function displayAjaxError(jQueryElem, xhr, textStatus, errorThrown) {
    showProgressMask(jQueryElem, false);
    var errMsg = "";
    if (textStatus == 'timeout')
        errMsg = "Timeout occured in fetching the details";
    else
        errMsg = 'Unexpected Error in fetching the details';
    jQueryElem.html(kendo.format('<div class="ajax-error">{0}</div>', errMsg));
}

function logMessage() {
    return;
    var allTypes = ['flowSeriesChart','hashChange','scatterChart','formatBytes'];
    var reqTypes = [];
    var timeMessages = ['flowSeriesChart'];
    var args = [], logType;
    if (arguments.length != 0) {
        args = Array.prototype.slice.call(arguments);
        logType = args.shift();
    }
    if ($.inArray(logType, reqTypes) == -1)
        return;
    //Can make the last argument as a context for message that enables controlling the logmessages
    //Append time only for certain types
    if($.inArray(logType,timeMessages) > -1)
        args.push(new Date());
    //args.unshift(logType);
    console.log.apply(console, args);
}

addExtraStylingToGrid = function (selector) {
    $("table.k-selectable tbody td").hover(
        function () {
            //Check if it has any div with name
            if ($(this).find('*[name]').length > 0) {
                $(this).toggleClass("hyperlink-active");
            }
        });
};

function formatProtocol(proto) {
    var protMAP = {17:'UDP', 6:'TCP', 2:'IGMP', 1:'ICMP'}
    return (protMAP[proto] != null) ? protMAP[proto] : proto;
}

function log10(val) {
    return Math.log(val) / Math.LN10;
}

function log2(val) {
    return Math.log(val) / Math.LN2;
}

function getContextObj(data) {
    var contextObj = {};
    $.each(['fqName', 'srcVN', 'destVN', 'vnName', 'ip', 'objectType', 'context'], function (idx, field) {
        if (data[field] != null)
            contextObj[field] = data[field];
    });
    return contextObj;
}

function capitalize(s) {
    return s[0].toUpperCase() + s.slice(1);
}

function constructChartSeries(columns, config) {
    //Construct series
    return $.map(columns, function (obj, idx) {
        var colors = defColors;
        if (config != null)
            colors = ifNull(config['colors'], defColors);
        obj['color'] = ifNull(obj['color'], colors[idx])
        if (obj['tooltipTemplate'] != null)
            obj['tooltip'] = {
                visible:true,
                template:obj['tooltipTemplate']
            }
        return obj;
    });
}

function constructChartDS(obj, elem) {
    var chartDS;
    if (obj['url'] != null) {
        chartDS = {
            transport:{
                read:{
                    url:function () {
                        //If user has changed the default selection in the chart navigator
                        if (globalObj.startDt != null && (typeof(obj['url']) == 'string')) {
                            var url = obj['url'];
                            var urlParams = $.deparam(obj['url']);
                            //delete urlParams['minsSince'];
                            delete urlParams['sampleCnt'];
                            urlParams['startTime'] = globalObj.startDt.getTime();
                            urlParams['endTime'] = globalObj.endDt.getTime();
                            var path = url.split('?')[0];
                            return path + '?' + $.param(urlParams);
                        } else if (typeof(obj['url'] == 'string')) {
                            return obj['url'];
                        }
                    }
                }
            },
            schema:{
                parse:function (response) {
                    if (obj['parseFn'] != null)
                        return obj['parseFn'](response);
                }
            }
        }
        if (typeof(obj['url']) != 'string') {
            $.extend(true, chartDS, {transport:{read:{url:obj['url']}}});
        }
    } else
        chartDS = obj['dataSource'];
    return chartDS;
}

var tooltipFns = {
    multiPathTooltip:function (data) {
        if (data['alternatePaths'].length > 0) {
            return 'Source:' + data['alternatePaths'][0]['source'] + '<br/>' +
                'AS Path:' + data['alternatePaths'][0]['as_path'];
        } else
            return data['source'].split(':').pop();
    }
}

function monitorRefresh(selector) {
    if (selector == null)
        selector = $(pageContainer);
    //Refresh summary stats
    $(selector).find('.summary-stats').each(function (idx, elem) {
        var elemDS = $(elem).data('dataSource');
        $(elem).data('loaded', false);
        if(elemDS != null)
            elemDS.read();
    });
    refreshStackCharts(selector);
    $(selector).find('.z-grid').each(function (idx) {
        var gridDS = $(this).data('kendoGrid').dataSource;
        $(this).data('loaded', false);
        gridDS.read();
    });
    $(selector).find('.ts-chart').each(function (idx) {
        var tsChart = $(this).data('kendoStockChart');
        var tsChartDS = $(this).data('kendoStockChart').dataSource;
        $(this).data('loaded', false);
        tsChartDS.read();
        //Refresh navigator
        if(tsChart._navigator != null)
            tsChart._navigator.dataSource.read();
    });
}
function refreshStackCharts(selector) {
    if (selector == null)
        selector = $(pageContainer);
    $(selector).find('.stack-chart').each(function (idx) {
        var chartDS = $(this).data('kendoChart').dataSource;
        $(this).data('loaded', false);
        chartDS.read();
    });
}

var bgpMonitor = {
    nodeTooltipFn:function (e) {
        //Get the count of overlapping bubbles
        var series = e['series'];
        var matchedRecords = $.grep(e['series']['values'],function(currObj,idx) {
            return (currObj['cpu'] == e['point']['cpu']) && (currObj['memory'] == e['point']['memory']);
        })
        matchedRecords = [];
        var tooltipContents = [
            {lbl:'Host Name', value:matchedRecords.length > 1 ? e['point']['name'] +
                kendo.format(' ({0})',matchedRecords.length) : e['point']['name']},
            {lbl:'Version', value:e['point']['version']},
            //{lbl:'CPU', value:e['point']['x'].toFixed(2) + ' %'},
            //{lbl:'Memory', value:parseInt(e['point']['y']) + ' MB'}
            {lbl:'CPU', value:$.isNumeric(e['point']['cpu']) ? e['point']['cpu'] + '%' : e['point']['cpu']},
            {lbl:'Memory', value:e['point']['memory']}
        ];
        if (e['point']['type'] == 'vRouter') {
            //tooltipContents.push({lbl:'Throughput', value:e['point']['size']-1});
            if(e['point']['errorIntfCnt'] > 0)
                tooltipContents.push({lbl:'Interfaces', value:kendo.format('{0} Down',e['point']['errorIntfCnt'])});
            if(e['point']['xmppPeerDownCnt'] > 0)
                tooltipContents.push({lbl:'XMPP Peers', value:kendo.format('{0} Down',e['point']['xmppPeerDownCnt'])});
        } else if (e['point']['type'] == 'controlNode') {
            //tooltipContents.push({lbl:'XMPP Queue Size', value:e['point']['size']-1});
            //tooltipContents.push({lbl:'Down BGP Peers', value:e['point']['downBgpPeerCnt']});
            //tooltipContents.push({lbl:'Total BGP Peers', value:e['point']['totalBgpPeerCnt']});
            if (e['point']['downBgpPeerCnt'] > 0)
                tooltipContents.push({lbl:'BGP Peers', value:e['point']['downBgpPeerCnt'] + ' Down'});
            //tooltipContents.push({lbl:'BGP Peers', value:e['point']['totalBgpPeerCnt'] + ' (' + e['point']['downBgpPeerCnt'] + ')'});
        } else if (e['point']['type'] == 'analyticsNode') {
            tooltipContents.push({lbl:'Pending Queries', value:e['point']['size'] - 1});
        }
        return formatLblValueTooltip(tooltipContents);
    },
    getNextHopType:function (data) {
        return data['path']['nh']['NhSandeshData']['type'];
    },
    getNextHopDetails:function (data) {
        var nhType = bgpMonitor.getNextHopType(data);
        //var nhData = jsonPath(data,'$..PathSandeshData').pop();
        var nhData = data['path'];
        nhData['nh'] = nhData['nh']['NhSandeshData'];
        var intf = nhData['nh']['itf'], mac = nhData['nh']['mac'], destVN = nhData['dest_vn'], source = nhData['peer'], policy = nhData['nh']['policy'], lbl = nhData['label'];
        var sip = nhData['nh']['sip'], dip = nhData['nh']['dip']
        if (nhType == 'arp') {
            //return kendo.format('Intf: {0} VRF: {1} Mac: {2} Source IP: {3}',nhData['nh']['itf'],nhData['nh']['vrf'],nhData['nh']['mac'],nhData['nh']['sip']);
            return kendo.format(wrapLabelValue('Interface', nhData['nh']['itf']) + wrapLabelValue('Mac', nhData['nh']['mac']) + wrapLabelValue('IP', nhData['nh']['sip']));
        } else if (nhType == 'resolve' || nhType == 'receive') {
            return kendo.format(wrapLabelValue('Source', nhData['peer']) + wrapLabelValue('Destination VN', nhData['dest_vn']));
        } else if (nhType == 'interface') {
            return kendo.format(wrapLabelValue('Interface', intf) + wrapLabelValue('Destination VN', destVN));
        } else if (nhType == 'tunnel') {
            return kendo.format(wrapLabelValue('Destination IP', dip) + wrapLabelValue('Destination VN', destVN) + wrapLabelValue('Label', lbl));
        } else if (nhType.toLowerCase() == 'composite') {
            var vrf = nhData['nh']['vrf'];
            var refCount = nhData['nh']['ref_count'];
            var policy = nhData['nh']['policy'];
            var valid = nhData['nh']['valid'];
            var label = nhData['label'];
            var mcDataString = '';
            var mcData;
            if (nhData['nh']['mc_list'] != null && nhData['nh']['mc_list']['list'] != null && nhData['nh']['mc_list']['list']['McastData'] != null) {
                mcData = nhData['nh']['mc_list']['list']['McastData'];
                if (mcData.length > 1) {
                    for (var a = 0; a < mcData.length; a++) {
                        mcDataString = mcDataString.concat("{");
                        var dataObj = mcData[a]
                        for (x in dataObj) {
                            if (x == "type" || x == "sip" || x == "dip" || x == "label" || x == "itf")
                                mcDataString = mcDataString.concat(' ' + x + ': ' + dataObj[x]);
                        }
                        mcDataString = mcDataString.concat("}");
                    }
                } else {
                    mcDataString = mcDataString.concat("{");
                    for (x in mcData) {
                        if (x == "type" || x == "sip" || x == "dip" || x == "label" || x == "itf")
                            mcDataString = mcDataString.concat(' ' + x + ': ' + mcData[x]);
                    }
                    mcDataString = mcDataString.concat("}");
                }
            }
            var x = kendo.format(wrapLabelValue('Source IP', sip) + wrapLabelValue('Destination IP', dip) + wrapLabelValue('vrf', vrf) + wrapLabelValue('Ref count', refCount) +
                wrapLabelValue('Policy', policy) + wrapLabelValue('Valid', valid) + wrapLabelValue('Label', label) + wrapLabelValue('Multicast Data', mcDataString));
            return x;
        }
    },
    getNextHopDetailsForMulticast:function (data) {
        var nhType = bgpMonitor.getNextHopType(data);
        //var nhData = jsonPath(data,'$..PathSandeshData').pop();
        var nhData = data['path'];
        nhData['nh'] = nhData['nh']['NhSandeshData'];
        // var intf = nhData['nh']['itf'], mac = nhData['nh']['mac'], destVN = nhData['dest_vn'], source = nhData['peer'], policy = nhData['nh']['policy'], lbl = nhData['label'];
        //var sip = nhData['nh']['sip'], dip = nhData['nh']['dip']
        var refCount = nhData['nh']['ref_count'];
        var valid = nhData['nh']['valid'];
        var policy = nhData['nh']['policy'];
        var sip = nhData['nh']['sip'];
        var dip = nhData['nh']['dip'];
        var vrf = nhData['nh']['vrf'];
        var label = nhData['nh']['label'];
        var mcDataString = '';
        var mcData;
        if (nhData['nh']['mc_list'] != null && nhData['nh']['mc_list']['list'] != null && nhData['nh']['mc_list']['list']['McastData'] != null) {
            mcData = nhData['nh']['mc_list']['list']['McastData'];
            if (mcData.length > 1) {
                for (var a = 0; a < mcData.length; a++) {
                    mcDataString = mcDataString.concat("{");
                    var dataObj = mcData[a]
                    for (x in dataObj) {
                        if (x == "type" || x == "sip" || x == "dip" || x == "label" || x == "itf")
                            mcDataString = mcDataString.concat(' ' + x + ': ' + dataObj[x]);
                    }
                    mcDataString = mcDataString.concat("}");
                }
            } else {
                mcDataString = mcDataString.concat("{");
                for (x in mcData) {
                    if (x == "type" || x == "sip" || x == "dip" || x == "label" || x == "itf")
                        mcDataString = mcDataString.concat(' ' + x + ': ' + mcData[x]);
                }
                mcDataString = mcDataString.concat("}");
            }
        }
        if (nhType == 'arp') {
            return kendo.format(wrapLabelValue('Interface', nhData['nh']['itf']) + wrapLabelValue('Mac', nhData['nh']['mac']) + wrapLabelValue('Source IP', nhData['nh']['sip']));
        } else if (nhType == 'resolve') {
            return kendo.format(wrapLabelValue('Source', nhData['peer']) + wrapLabelValue('Destination VN', nhData['dest_vn']));
        } else if (nhType == 'receive') {
            return kendo.format(wrapLabelValue('Reference Count', refCount) + wrapLabelValue('Valid', valid) + wrapLabelValue('Policy', policy));
        } else if (nhType == 'interface') {
            return kendo.format(wrapLabelValue('Interface', intf) + wrapLabelValue('Destination VN', destVN));
        } else if (nhType == 'tunnel') {
            return kendo.format(wrapLabelValue('Destination IP', dip) + wrapLabelValue('Destination VN', destVN) + wrapLabelValue('Label', lbl));
        } else if (nhType == 'Composite') {
            var x = kendo.format(wrapLabelValue('Source IP', sip) + wrapLabelValue('Destination IP', dip) + wrapLabelValue('vrf', vrf) + wrapLabelValue('Ref count', refCount) +
                wrapLabelValue('Policy', policy) + wrapLabelValue('Valid', valid) + wrapLabelValue('Label', label) + wrapLabelValue('Multicast Data', mcDataString));
            return x;
        }
    }
}

function getOverlappedBubbles(e) {
    //Get the count of overlapping bubbles
    var series = e['series'];
    var matchedRecords = $.grep(e['series']['values'],function(currObj,idx) {
        return (currObj['x'] == e['point']['x']) && (currObj['y'] == e['point']['y']);
    });
    matchedRecords = [];
    return matchedRecords;
}

var tenantNetworkMonitor = {
    projectTooltipFn : function(e) {
        //Get the count of overlapping bubbles
        var matchedRecords = getOverlappedBubbles(e);
        var tooltipContents = [
            {lbl:'Name', value:matchedRecords.length > 1 ? e['point']['name'] +
                kendo.format(' ({0})',matchedRecords.length) : e['point']['name']},
            {lbl:'Interfaces', value:e['point']['x']},
            {lbl:'Networks', value:e['point']['y']},
            {lbl:'Throughput', value:formatThroughput(e['point']['throughput'])}
        ];
        return formatLblValueTooltip(tooltipContents);
    },
    networkTooltipFn:function (e) {
        var matchedRecords = getOverlappedBubbles(e);
        var tooltipContents = [
            {lbl:'Name', value:matchedRecords.length > 1 ? e['point']['name'] +
                kendo.format(' ({0})',matchedRecords.length) : e['point']['name']},
            {lbl:'Interfaces', value:e['point']['x']},
            {lbl:'Connected Networks', value:e['point']['y']},
            {lbl:'Throughput', value:formatThroughput(e['point']['throughput'])}
        ];
        return formatLblValueTooltip(tooltipContents);
    },
    portTooltipFn: function(e) {
        /*var tooltipContents = [
         {lbl:'Name', value:typeof(e) == 'string' ? e : e['point']['type']},
         ];*/
        if(e['point']['name'].toString().indexOf('-') > -1)
            name = 'Port Range (' + e['point']['name'] + ')';
        else
            name = 'Port ' + e['point']['name'];
        var tooltipContents = [
            {lbl:'Port Range', value:name},
            {lbl:'Flows', value:e['point']['size']-1},
            {lbl:'Bandwidth', value:formatBytes(ifNull(e['point']['origY'],e['point']['y']))},
            //{lbl:'Type', value:e['point']['type']}
        ];
        return formatLblValueTooltip(tooltipContents);
    }
}

function wrapValue(str) {
    return '<span class="text-info">' + str + '</span>';
}

function wrapLbl(str) {
    return '<span class="lighter">' + str + '</span>';
}

function wrapLabelValue(lbl, value) {
    return '<span class="label-value-text">' + lbl + ': <span class="value">' + value + '</span></span>';
}

function searchInDataSource(ds) {
    var children = ds.data();
    $.each(children, function (idx, obj) {
        if (obj[name] == 'vn1')
            return true;
        //Leaf node
        if (obj.children.data().length > 0) {
            return searchInDataSource(obj.children);
        }
    });
}

function randomData(groups, points) { //# groups,# points per group
    var data = [],
        shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
        random = d3.random.normal();

    for (i = 0; i < groups; i++) {
        data.push({
            key:'Group ' + i,
            values:[]
        });

        for (j = 0; j < points; j++) {
            data[i].values.push({
                x:testData.getRandomNum(0, 100), //Generate a random number 0-100
                //y: testData.getRandomNum(0,1024*1024*1024),
                y:Math.random() * 2,
                size:Math.random(),
                shape:shapes[j % 6]
            });
        }
    }

    return data;
}

function searchInDataSource(ds) {
    var children = ds.data();
    $.each(children, function (idx, obj) {
        if (obj[name] == 'vn1')
            return true;
        //Leaf node
        if (obj.children.data().length > 0) {
            return searchInDataSource(obj.children);
        }
    });
}

function randomData(groups, points) { //# groups,# points per group
    var data = [],
        shapes = ['circle', 'cross', 'triangle-up', 'triangle-down', 'diamond', 'square'],
        random = d3.random.normal();

    for (i = 0; i < groups; i++) {
        data.push({
            key:'Group ' + i,
            values:[]
        });

        for (j = 0; j < points; j++) {
            data[i].values.push({
                x:random(),
                y:random(),
                color:Math.floor(Math.random() * 5),
                size:Math.random(),
                shape:shapes[j % 6]
            });
        }
    }
    return data;
}

function formatTooltipDate(str) {
    return new XDate(str).toString('M/d/yy h:mm:ss');
}

//Get the number of keys in an object
function getKeyCnt(obj) {
    var len = 0;
    for (var i in obj) {
        if (obj.hasOwnProperty(i))
            len++;
    }
    return len;
}

function parseFlowSeriesData(response, type) {
    //console.info(url);
    var retObj = response;
    if (response == null)
        return response;
    var summary = response['summary'];
    var data = response['flow-series'];
    var startTime = summary['start_time'], interval = summary['timeGran_microsecs'],
        endTime = summary['end_time'];
    var newData = [];
    //Round-off to minute granularity
    /*var startDt = convertMicroTSToDate(startTime);
     startDt.setSeconds(0);
     startDt.setMilliseconds(0);*/

    //check whether all saamples fit in the slots with given time granualrity
    //console.info('granularity check',data[0]['time']/1000000);
    $.each(data, function (idx, obj) {
        //logMessage('flowSeriesChart', obj['time'] / 1000000, ((obj['time'] / 1000000) - (data[0]['time'] / 1000000)) / 7);
    });
    //if(data.length != 0) {
    //check whether all samples fit in the slots with given time granualrity
    //console.info('granularity check',data[0]['time']/1000000);
    logMessage('flowSeriesChart', type, 'Retrieved sample cnt', data.length);
    logMessage('flowSeriesChart', 'startTime', new Date(startTime / 1000), 'endTime', new Date(endTime / 1000));
    $.each(data, function (idx, obj) {
        logMessage('flowSeriesChart', type, obj['time'] / 1000000, new Date(obj['time'] / 1000), ((obj['time']) - (data[0]['time'])) / (interval), obj['inBytes'], obj['outBytes']);
    });
    //Fill the missing points
    for (var i = startTime + interval, j = 0; i < endTime; i = i + interval) {
        if ((data[j] == null) || (data[j]['time'] != i)) {
            newData.push({
                time:i,
                outBytes:0,
                outPkts:0,
                inBytes:0,
                inPkts:0,
                totalBytes:0,
                totalPkts:0
            });
        } else {
            //Once the data point matches with the iterator,then go to next data point
            newData.push(data[j]);
            j++;
        }
    }
    //}
    if (data.length > 0) {
        $.each(newData, function (idx, obj) {
            logMessage('flowSeriesChart', type + '_new', obj['time'] / 1000000, new Date(obj['time'] / 1000), ((obj['time']) - (data[0]['time'])) / (interval));
        });
    }
    retObj = $.map(newData, function (obj, idx) {
        obj['date'] = new Date(obj['time'] / 1000);
        obj['outPkts'] = -1 * obj['outPkts'];
        obj['outBytes'] = -1 * obj['outBytes'];
        //console.info('Data fed to chart',obj['date'],obj['inBytes'],obj['outBytes']);
        return obj;
    });
    return retObj;

}

function diffDates(startDt, endDt) {
    var dayCnt = 0, hrCnt = 0, minCnt = 0;
    //No of days
    dayCnt = Math.floor(startDt.diffDays(endDt));
    hrCnt = Math.floor(startDt.diffHours(endDt));
    minCnt = Math.floor(startDt.diffMinutes(endDt));
    hrCnt = hrCnt - (dayCnt * 24);
    minCnt = minCnt - (((dayCnt * 24) + hrCnt) * 60);
    if (dayCnt == 0 && hrCnt == 0)
        return  minCnt + 'm';
    else if (dayCnt == 0)
        return hrCnt + 'h ' + minCnt + 'm';
    else
        return dayCnt + 'd ' + hrCnt + 'h ' + minCnt + 'm';
}

//Start - Crossfilter chart routines
//Renders the specified chart or list.
function render(method) {
    d3.select(this).call(method);
}

//Whenever the brush moves, re-rendering everything.
function renderAll(chart) {
    chart.each(render);
    //list.each(render);
    //d3.select("#active").text(formatNumber(all.value()));
}

function reset(i) {
    /*charts[i].filter(null);
     renderAll(chart);*/
};

function barChart() {
    if (!barChart.id) barChart.id = 0;
    var toolTip_text = "";
    var margin = {top:0, right:10, bottom:10, left:10},
        x,
        y = d3.scale.linear().range([50, 0]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("bottom"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round,
        toolTip;

    function chart(div) {
        var width = x.range()[1],
            height = y.range()[0],
            xaxis_max_value = x.domain()[1];
        logMessage('crossFilterChart','Start');
        $.each(group.top(Infinity),function(idx,obj) {
            logMessage('crossFilterChart',obj['key'],obj['value']);
        });
        /*
         if(group.top(1).length > 0)
         y.domain([0, group.top(1)[0].value]);
         else
         y.domain([0, 0]);
         */

        div.each(function () {
            var div = d3.select(this),
                g = div.select("g");

            // Create the skeletal chart.
            if (g.empty()) {
                div.select(".title").append("span")
                    //.attr("href", "javascript:reset(" + id + ")") //Can be commented
                    .attr("class", "reset")
                    .text("reset")
                    .style("display", "none");

                g = div.insert("svg", "div.title")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                g.append("clipPath")
                    .attr("id", "clip-" + id)
                    .append("rect")
                    .attr("width", width)
                    .attr("height", height);
                var bars = g.selectAll(".bar")
                    .data(["background", "foreground"])
                    .enter().append("path")
                    .attr("class", function (d) {
                        return d + " bar";
                    })
                    .datum(group.all());
                if (toolTip) {
                    var data;
                    bars.call(d3.helper.tooltip()
                        .style({color:'blue'})
                        .text(function (eve) {
                            return toolTip_text;
                        })
                    )
                        .on('mouseover', function (eve) {
                            var co = d3.mouse(this);
                            var x = co[0] * (xaxis_max_value / width);//scaling down the width(240) of the rectangle to x-axis(26) values
                            for (var i = 0; i < eve.length; i++) {
                                if (x >= eve[i].key && x <= (eve[i].key + 10)) {
                                    data = [
                                        {lbl:div.select('.title').text().split('reset')[0], value:eve[i].key},
                                        {lbl:'Virtual Routers', value:eve[i].value}
                                    ];
                                    toolTip_text = kendo.template($('#lblval-tooltip-template').html())(data);
                                }
                            }
                        });
                }
                g.selectAll(".foreground.bar")
                    .attr("clip-path", "url(#clip-" + id + ")");

                g.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(axis);
                // Initialize the brush component with pretty resize handles.
                var gBrush = g.append("g").attr("class", "brush").call(brush);
                gBrush.selectAll("rect").attr("height", height);
                gBrush.selectAll(".resize").append("path").attr("d", resizePath);
            }
            // Only redraw the brush if set externally.
            if (brushDirty) {
                brushDirty = false;
                g.selectAll(".brush").call(brush);
                div.select(".title span").style("display", brush.empty() ? "none" : null);
                if (brush.empty()) {
                    g.selectAll("#clip-" + id + " rect")
                        .attr("x", 0)
                        .attr("width", width);
                } else {
                    var extent = brush.extent();
                    g.selectAll("#clip-" + id + " rect")
                        .attr("x", x(extent[0]))
                        .attr("width", x(extent[1]) - x(extent[0]));
                }
            }

            g.selectAll(".bar").attr("d", barPath);
        });

        function barPath(groups) {
            var path = [],
                i = -1,
                n = groups.length,
                d;
            while (++i < n) {
                d = groups[i];
                path.push("M", x(d.key), ",", height, "V", y(d.value), "h9V", height);
            }
            if(path.length == 0)
                return null;
            else
                return path.join("");
        }

        function resizePath(d) {
            var e = +(d == "e"),
                x = e ? 1 : -1,
                y = height / 3;
            return "M" + (.5 * x) + "," + y
                + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
                + "V" + (2 * y - 6)
                + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
                + "Z"
                + "M" + (2.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8)
                + "M" + (4.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8);
        }
    }

    brush.on("brushstart.chart", function () {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title span").style("display", null);
    });

    brush.on("brush.chart", function () {
        var g = d3.select(this.parentNode),
            extent = brush.extent();
        if (round) g.select(".brush")
            .call(brush.extent(extent = extent.map(round)))
            .selectAll(".resize")
            .style("display", null);
        g.select("#clip-" + id + " rect")
            .attr("x", x(extent[0]))
            .attr("width", x(extent[1]) - x(extent[0]));
        dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function () {
        if (brush.empty()) {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".title span").style("display", "none");
            div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
            dimension.filterAll();
        }
    });

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.x = function (_) {
        if (!arguments.length) return x;
        x = _;
        axis.scale(x);
        brush.x(x);
        return chart;
    };

    chart.y = function (_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
    };

    chart.dimension = function (_) {
        if (!arguments.length) return dimension;
        dimension = _;
        return chart;
    };

    chart.filter = function (_) {
        if (_) {
            brush.extent(_);
            dimension.filterRange(_);
        } else {
            brush.clear();
            dimension.filterAll();
        }
        brushDirty = true;
        return chart;
    };

    chart.group = function (_) {
        if (!arguments.length) return group;
        group = _;
        return chart;
    };

    chart.round = function (_) {
        if (!arguments.length) return round;
        round = _;
        return chart;
    };
    chart.toolTip = function (_) {
        if (!arguments.length) return toolTip;
        toolTip = _;
        return chart;
    };

    return d3.rebind(chart, brush, "on");
}

//End - Crossfilter chart routines

function getRandomPortDistMap() {
    var chartData = [];
    for (var i = 0; i < 64; i++) {
        for (var j = 0; j < 4; j++) {
            chartData.push({
                x:i,
                y:j,
                value:Math.round(Math.random())
            });
        }
    }
    return chartData;
}
function selectInfoBox(selector) {

}

String.prototype.padleft = function (length, character) {
    return new Array(length - this.length + 1).join(character || ' ') + this;
}

function get64binary(int) {
    if (int >= 0)
        return int
            .toString(2)
            .padleft(64, "0");
    // else
    return (-int - 1)
        .toString(2)
        .replace(/[01]/g, function (d) {
            return +!+d;
        })// hehe: inverts each char
        .padleft(64, "1");
};

function get32binary(int) {
    if (int >= 0)
        return int
            .toString(2)
            .padleft(32, "0");
    // else
    return (-int - 1)
        .toString(2)
        .replace(/[01]/g, function (d) {
            return +!+d;
        })// hehe: inverts each char
        .padleft(32, "1");
};

function initDeferred(data) {
    var deferredObj = $.Deferred();
    //To load asynchronously
    if (data['deferredObj'] != null) {
        deferredObj = data['deferredObj'];
    } else if (data['url'] != null) {
        $.ajax({
            url:data['url'],
        }).done(function (result) {
                deferredObj.resolve(result);
            });
    } else {
        deferredObj.resolve(data);
    }
    deferredObj.done(function (response) {
        if (data['parseFn'] != null && typeof(data['parseFn']) == 'function') {
            response = data['parseFn'](response);
        }
        $(data['selector'])[data['renderFn']](response);
    });
}

d3.helper = {};

d3.helper.tooltip = function () {
    var tooltipDiv;
    var bodyNode = d3.select('body').node();
    var attrs = {};
    var text = '';
    var styles = {};

    function tooltip(selection) {

        selection.on('mouseover.tooltip', function (pD, pI) {
            var name, value;
            // Clean up lost tooltips
            d3.select('body').selectAll('div.tooltip').remove();
            // Append tooltip
            tooltipDiv = d3.select('body').append('div');
            tooltipDiv.attr(attrs);
            tooltipDiv.style(styles);
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style({
                left:(absoluteMousePos[0] + 10) + 'px',
                top:(absoluteMousePos[1] - 15) + 'px',
                position:'absolute',
                'z-index':1001
            });
            // Add text using the accessor function, Crop text arbitrarily
            tooltipDiv.style('width', function (d, i) {
                return (text(pD, pI).length > 80) ? '300px' : null;
            })
                .html(function (d, i) {
                    return text(pD, pI);
                });
        })
            .on('mousemove.tooltip', function (pD, pI) {
                // Move tooltip
                var absoluteMousePos = d3.mouse(bodyNode);
                tooltipDiv.style({
                    left:(absoluteMousePos[0] + 10) + 'px',
                    top:(absoluteMousePos[1] - 15) + 'px'
                });
                // Keep updating the text, it could change according to position
                tooltipDiv.html(function (d, i) {
                    return text(pD, pI);
                });
            })
            .on('mouseout.tooltip', function (pD, pI) {
                // Remove tooltip
                tooltipDiv.remove();
            });

    }

    tooltip.attr = function (_x) {
        if (!arguments.length) return attrs;
        attrs = _x;
        return this;
    };

    tooltip.style = function (_x) {
        if (!arguments.length) return styles;
        styles = _x;
        return this;
    };

    tooltip.text = function (_x) {
        if (!arguments.length) return text;
        text = d3.functor(_x);
        return this;
    };

    return tooltip;
};

//DNS TTL Validations
function validateTTLRange(v){
    if(v >=0 && v<=2147483647)
        return true;
    return false;
}

function  allowNumeric(v){
    for(var i=0;i<v.length;i++){
        if(v[i] ==="-")
            continue;
        if(isNaN(parseInt(v[i],10)))
            return false;
    }
    return true;
}
function validateIPAddress(inputText){
    var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if(inputText.match(ipformat))
        return true;
    else
        return false;
}
function getFormattedDateTime(dt) {

}

function bucketizeCFData(dataCF,accessorFn,cfg) {
    var sparkLineMultiplier = 20;
    var retArr = [],value;
    var dimension = dataCF.dimension(accessorFn);
    var cfGroup = dimension.group();
    var maxKey = 0;
    var cfg = ifNull(cfg,{});
    var bucketCnt = ifNull(cfg['bucketCnt'],8);
    var bucketRange= ifNull(cfg['bucketRange'],1);
    if(cfGroup.all().length > 0)
        maxKey = cfGroup.all()[cfGroup.all().length-1]['key'];
    //No data to bucketize
    if(maxKey == 0)
        return retArr;
    //Max no of occurrences in any bucket
    var maxValue = 0;
    $.each(cfGroup.all(),function(idx,obj) {
        if(obj['value'] > maxValue)
            maxValue = obj['value'];
    });
    var zeroValue = maxValue/sparkLineMultiplier;
    //Have buckets 0-8
    if(maxKey <= 5) {
        maxKey = 5;
    } else {
        //Restrict bucket count to no more than 8
        if(cfg['bucketRange'] == null)
            bucketRange = Math.ceil(maxKey/bucketCnt);
    }
    for(var i=0;i<=maxKey;i+=bucketRange) {
        dimension.filterAll();
        if(bucketRange == 1) {
            value = dimension.filter(i).top(Infinity).length;
            if(value == 0)
                value = zeroValue;
            retArr.push({name:i,min:i,max:i+bucketRange-1,value:value});
        } else {
            value = dimension.filter(function(d) { return ((d >= i) && (d <= (i+bucketRange-1))); }).top(Infinity).length;
            if(value == 0)
                value = zeroValue;
            retArr.push({name:i + '-' + (i+bucketRange-1),min:i,max:i+bucketRange-1,value:value});
        }
    }
    dimension.filterAll();
    return {data:retArr,zeroValue:zeroValue};
}

function getMaxNumericValueInArray(inputArray) {
    var maxVal;
    if(inputArray != null && inputArray instanceof Array){
        maxVal = inputArray[0];
        for(var i = 1; i < inputArray.length; i++){
            if(inputArray[i] > maxVal)
                maxVal = inputArray[i];
        }
        return maxVal;
    } else {
        return inputArray;
    }
}

function toggleDivs(hideDetailId,showDetailId){
    $('#'+hideDetailId).hide();
    $('#'+showDetailId).show();
}

function showMoreAlerts(){
    var currentUrl=layoutHandler.getURLHashObj();
    if(currentUrl['p']!='mon_infra_dashboard' && currentUrl['q']['tab']!='vRouter')
        layoutHandler.setURLHashParams({}, {p:'mon_infra_dashboard',merge:false});
    var data=$("#sidebar").data('alerts');
    var int=setInterval(function(){
        data=$("#sidebar").data('alerts');
        if(data!=undefined){
            $('#header ul li.nav-header').text(data.length+' New Alerts');
            var alerts=kendo.template($("#alerts-template").html());
            for(var i=0;i<data.length;i++){
                if(data[i]['type']=='fatal')
                    data[i]['status']='Down';
                else if(data[i]['type']=='stopped')
                    data[i]['status']='Stopped';
                else if(data[i]['type']=='nodeAlerts')
                    data[i]['status']=data[i]['msg'];}
            $('body').append($("#moreAlerts"));
            alertsWindow=$("#moreAlerts");
            alertsWindow.modal({backdrop:'static',keyboard:false,show:false});
            $("#alertsClose").click(function(){
                alertsWindow.hide();
            });
            $("#alertContent").contrailKendoGrid({
                dataSource:{
                    data:data},
                sortable: true,
                columns:[ {field:'nName',
                    title:'Node'
                } , {field:'pName',
                    title:'Process',
                    width:170
                } , {field:'status',
                    title:'Status'
                } , {field:'timeStamp',
                    title:'Date',
                    width:160
                }],
                pageable: false,
                searchToolbar: true,
                widgetGridTitle: 'Details'
            });
            check4GridEmpty('#alertContent', 'No Alerts Found.');
            alertsWindow.modal('show');
            clearInterval(int);
        }//else if(!$("#sidebar").data('alert_exists'))
        //clearInterval(int);
    },300);
}
