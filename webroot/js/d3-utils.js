/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

d3.scale.category5 = function () {
    return d3.scale.ordinal().range(d3_category5);
};

d3.scale.category2 = function () {
    return d3.scale.ordinal().range(d3_category2);
};

var d3_category2 = [ "#1f77b4", "#2ca02c"];

var d3_category5 = [ "#1f77b4", "#2ca02c", "#d6616b", "#756bb1", "#ff7f0e"];

function chartHandler(dataUrl, methodType, postData, initHandler, dataParser, successCallBack, failureCallback, cacheEnabled, callbackParams, reqTimeOut) {
    var contentType = null, dataType = null, ajaxConfig = {},
        selector = callbackParams.selector;

    cacheEnabled = (cacheEnabled) == null ? false : cacheEnabled;

    if (typeof window[initHandler] === "function") {
        window[initHandler](callbackParams);
    } else {
        defaultChartInitHandler(callbackParams);
    }

    if (isSet(methodType)) {
        if (methodType == "POST" || methodType == "PUT" || methodType == "DELETE") {
            if (!isSet(postData)) {
                postData = "{}";
            }
            contentType = "application/json; charset=utf-8";
            dataType = "json";
            ajaxConfig.dataType = dataType;
            ajaxConfig.contentType = contentType;
        }
    } else {
        methodType == "GET"
    }

    ajaxConfig.type = methodType;
    ajaxConfig.cache = cacheEnabled;
    ajaxConfig.url = dataUrl;
    ajaxConfig.data = postData;

    if (isSet(reqTimeOut) && isNumber(reqTimeOut) && reqTimeOut > 0) {
        ajaxConfig.timeout = reqTimeOut;
    }
    $.ajax(ajaxConfig)
        .success(function (response) {
            if (typeof window[dataParser] === "function") {
                var chartData = window[dataParser](response, callbackParams)
            } else {
                chartData = response;
            }
            endWidgetLoading($(selector).attr("id"));
            $(callbackParams.selector).empty();
            if (typeof window[successCallBack] === "function") {
                window[successCallBack](chartData, callbackParams);
            } else {
                defaultChartSuccessCallback(chartData, callbackParams);
            }
        })
        .fail(function (response) {
            endWidgetLoading($(selector).attr("id"));
            if (response.responseText && response.responseText != "") {
                showInfoWindow(response.responseText, response.statusText);
            }
            if (typeof window[failure] === "function") {
                window[failureCallback](response, cbParams);
            } else {
                defaultChartFailureCallback(response, callbackParams);
            }
        });
};

function defaultChartSuccessCallback(response, cbParams) {
    // TODO
}

function defaultChartFailureCallback(response, cbParams) {
    // TODO
}

function defaultChartInitHandler(cbParams) {
    var selector = cbParams.selector;
    startWidgetLoading($(selector).attr("id"));
}

function createD3MemCPUChart(selector, url, options) {
    var cbParams = {selector:selector, options:options};
    chartHandler(url(), "GET", null, null, options.parser, "successHandlerLineChart", null, false, cbParams, 60000);
}

function createD3SparkLines(selector, data, dataParser, propertyNames, slConfig) {
    var property, parentId;
    parentId = $(selector).attr('id');
    if (typeof window[dataParser] === "function") {
        var slineData = window[dataParser](data, propertyNames, slConfig);
        for (property in slineData) {
            try {
                drawSparkLine(parentId, property + '_sparkline', slineData[property].color, slineData[property].data);
            } catch (error) {
                console.log(error.stack);
            }
        }
    }
}

function successHandlerLineChart(data, cbParams) {
    var boxId = $(cbParams.selector).attr("id") + '-box';
    var selectorId = $(cbParams.selector).attr("id") + '-link';
    var isBoxVisible = $('#' + boxId).hasClass('hide') ? false : true;
    var options = cbParams.options;
    if (isBoxVisible) {
        onClickLineChart(data, cbParams);
    }
    $('.' + selectorId).click(function () {
        toggleWidgetsVisibility(options.showWidgetIds, options.hideWidgetIds);
        onClickLineChart(data, cbParams)
    });
};

function onClickLineChart(data, cbParams) {
    var selectorId = $(cbParams.selector).attr("id"), property;
    $('#' + selectorId).empty();
    for (property in data) {
        var elementId = property + "-chart";
        cbParams.selector.append("<div id='" + elementId + "'></div>");
        if (property == 'cpu') {
            initCPULineChart("#" + selectorId + " #" + elementId, data[property]['ds'], cbParams.options);
        } else {
            initMemoryLineChart("#" + selectorId + " #" + elementId, data[property]['ds'], cbParams.options);
        }
    }
}

function parseProcessMemCPUData(response, cbParams) {
    var flowSeries = response['flow-series'];
    var titles = cbParams.options.titles;
    var data = {}, time, cpuDS = [], memDS = [], startTime, endTime;
    startTime = parseInt(response['summary']['start_time']);
    endTime = parseInt(response['summary']['end_time']);
    if (flowSeries.length == 1) {
        addMemCPU2DS(startTime, flowSeries[0], cpuDS, memDS);
        addMemCPU2DS(endTime, flowSeries[0], cpuDS, memDS);
    } else {
        for (var i = 0; i < flowSeries.length; i++) {
            time = parseInt(flowSeries[i]['MessageTS']);
            addMemCPU2DS(time, flowSeries[i], cpuDS, memDS);
        }
        if (time < endTime && flowSeries.length > 0) {
            addMemCPU2DS(endTime, flowSeries[flowSeries.length - 1], cpuDS, memDS);
        }
    }
    data['cpu'] = {ds:[
        {values:cpuDS, key:titles.cpuTitle, color:d3_category2[0]}
    ]};
    data['memory'] = {ds:[
        {values:memDS, key:titles.memTitle, color:d3_category2[1]}
    ]};
    return data;
};

function addMemCPU2DS(time, dataRecord, cpuDS, memDS) {
    var cpuShare = dataRecord['cpuData']['cpu_share'];
    if (cpuShare != null && cpuShare != "-") {
        try {
            cpuShare = parseFloat(cpuShare);
            cpuDS.push({x:time, y:cpuShare});
        } catch (error) {
            // Ignore
        }
    }
    var virtMemory = dataRecord['memData']['memInfo']['virt'];
    if (virtMemory != null && virtMemory != "-") {
        try {
            virtMemory = parseInt(virtMemory);
            memDS.push({x:time, y:virtMemory});
        } catch (error) {
            // Ignore
        }
    }
}

function parseSystemMemCPUData(response, cbParams) {
    var flowSeries = response['flow-series'];
    var titles = cbParams.options.titles;
    var data = {}, time, cpuDS = [], memDS = [], avgCPU, usedMem;
    for (var i = 0; i < flowSeries.length; i++) {
        time = parseInt(flowSeries[i]['MessageTS']);
        avgCPU = flowSeries[i]['cpuData']['cpuLoadAvg']['one_min_avg'];
        if (avgCPU != null && avgCPU != "-") {
            try {
                avgCPU = parseFloat(avgCPU);
                cpuDS.push({x:time, y:parseFloat(flowSeries[i]['cpuData']['cpuLoadAvg']['one_min_avg'])});
            } catch (error) {
                // Ignore
            }
        }
        usedMem = flowSeries[i]['memData']['sysMemInfo']['used'];
        if (usedMem != null && usedMem != "-") {
            try {
                usedMem = parseFloat(usedMem);
                memDS.push({x:time, y:usedMem});
            } catch (error) {
                // Ignore
            }
        }
    }
    data['cpu'] = {ds:[
        {values:cpuDS, key:titles.cpuTitle, color:d3_category2[0]}
    ]};
    data['memory'] = {ds:[
        {values:memDS, key:titles.memTitle, color:d3_category2[1]}
    ]};
    return data;
};

function parseMemCPUData4SparkLines(data, propertyNames, slConfig) {
    var key, slData = {};
    var endTime = slConfig.endTime;
    var startTime = slConfig.startTime;
    for (key in propertyNames) {
        var properties = propertyNames[key];
        for (var i = 0; i < properties.length; i++) {
            var propValues = data[key][properties[i].name], propValue, propValueArray, propdata = [];
            if (propValues != null && propValues.length > 0) {
                propValue = propValues[0]['history-10'];
                propValueArray = convertMemCPUJSON2Array(propValue);
                propdata = formatMemCPUSparkLineData(propValueArray, startTime, endTime)
            }
            slData[properties[i].name] = {data:propdata, color:properties[i].color};
        }
    }
    return slData;
};

function initCPULineChart(selector, data, options) {
    var svgElement = selector + " svg";

    if ($(selector).find("svg") != null) {
        $(selector).empty();
    }

    $(selector).append("<svg style='height:" + options.height + "px'></svg>");

    nv.addGraph(function () {
        var chart = nv.models.lineChart().margin({top:30, right:60, bottom:30, left:70});
        chart.xAxis.tickFormat(function (d) {
            return d3.time.format('%H:%M:%S')(new Date(d / 1000));
        });
        chart.yAxis.tickFormat(function (d) {
            return d3.format(',.02f')(d);
        });
        chart.lines.forceY([0]);
        d3.select(svgElement).datum(data).transition().duration(options.height).call(chart);
        nv.utils.windowResize(function () {
            d3.select(svgElement).call(chart)
        });
        return chart;
    });
};

function initMemoryLineChart(selector, data, options) {
    var svgElement = selector + " svg";
    if ($(selector).find("svg") != null) {
        $(selector).empty();
    }
    $(selector).append("<svg style='height:" + options.height + "px;'></svg>");
    nv.addGraph(function () {
        var chart = nv.models.lineChart().margin({top:30, right:60, bottom:30, left:70});
        chart.xAxis.tickFormat(function (d) {
            return d3.time.format('%H:%M:%S')(new Date(d / 1000));
        });
        chart.yAxis.tickFormat(function (d) {
            return d3.format(',.01f')(d / 1024);
        });
        chart.lines.forceY([0]);
        d3.select(svgElement).datum(data).transition().duration(options.height).call(chart);
        nv.utils.windowResize(function () {
            d3.select(svgElement).call(chart)
        });
        return chart;
    });
};

function startWidgetLoading(selectorId) {
    selectorId = "#" + selectorId + "-loading";
    $(selectorId).show();
};

function endWidgetLoading(selectorId) {
    selectorId = "#" + selectorId + "-loading";
    $(selectorId).hide();
};

function drawSparkLine(parentId, selectorId, className, data) {
    var selector = "#" + parentId + ' #' + selectorId;
    if ($(selector).find("svg") != null) {
        $(selector).empty();
    }
    var sortedData = ([].concat(data)).sort(function (a, b) {
        return a - b
    });
    var graph = d3.select(selector).append("svg:svg").attr('class', className);
    var maxY = sortedData[sortedData.length - 1];
    var x = d3.scale.linear().domain([0, 10]).range([0, 100]);
    var y = d3.scale.linear().domain([sortedData[0], maxY * 1.2]).range([8, 0]);
    var sparkLine = d3.svg.line()
        .x(function (d, i) {
            return x(i);
        })
        .y(function (d) {
            return y(d);
        });
    graph.append("svg:path").attr("d", sparkLine(data));
};

function drawNVD3SparkLine(parentId, selectorId, className, data) {
    var selector = "#" + parentId + ' #' + selectorId;
    if ($(selector).find("svg") != null) {
        $(selector).empty();
    }
    $(selector).append("<svg class='" + className + "'></svg>");
    nv.addGraph({
        generate:function () {
            var chart = nv.models.sparkline().width(200).height(10);
            d3.select(selector + ' svg').datum(data).call(chart);
            return chart;
        },
        callback:function (graph) {
        }
    });
};

function drawNVD3SparkLinePlus(parentId, selectorId, className, data) {
    var selector = "#" + parentId + ' #' + selectorId;
    if ($(selector).find("svg") != null) {
        $(selector).empty();
    }
    $(selector).append("<svg class='" + className + "'></svg>");
    nv.addGraph(function () {
        var chart = nv.models.sparklinePlus().width(200).height(10);
        chart.x(function (d, i) {
            return i
        }).xTickFormat(function (d) {
                return d3.time.format('%x')(new Date(data[d].x))
            });
        d3.select(selector + ' svg').datum(data).transition().duration(250).call(chart);
        return chart;
    });
};

function convertMemCPUJSON2Array(json) {
    var time, array = [], timeJSON, ts;
    for (time in json) {
        timeJSON = JSON.parse(time);
        ts = Math.floor(timeJSON['ts'] / 1000);
        array.push({ts:ts, value:json[time]})
    }
    array = sortArrayByKey(array, 'ts');
    return array;
};

function sortArrayByKey(array, key) {
    return array.sort(function (a, b) {
        var x = a[key];
        var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
};

function formatMemCPUSparkLineData(propValueArray, startTime, endTime) {
    var results = [], msTime, length = propValueArray.length, lastTime, firstTime;
    startTime = startTime - 90000;
    if (length > 0) {
        lastTime = propValueArray[length - 1]['ts'];
        firstTime = propValueArray[0]['ts'];
        if (lastTime < startTime) {
            for (var j = 0; j < 10; j++) {
                results.push(propValueArray[length - 1].value);
            }
        } else if (startTime <= lastTime) {
            /*
             if (startTime < firstTime) {
             for(var l = 0; l < 10; l++) {
             if (firstTime < (startTime + (l * 60000))) {
             results.push(0);
             } else {
             break;
             }
             }
             }*/
            for (var j = 0; j < propValueArray.length; j++) {
                msTime = propValueArray[j].ts
                if (msTime >= startTime) {
                    results.push(propValueArray[j].value);
                    startTime = startTime + 60000;
                }
            }
            for (var k = results.length; k < 10; k++) {
                results.push(propValueArray[length - 1].value);
            }
        } else {
            for (var j = 0; j < propValueArray.length; j++) {
                msTime = propValueArray[j].ts
                results.push(propValueArray[j].value);
            }
        }
    }
    return results;
};

function parseTSChartData(response, cbParams) {
    var rawdata = response['flow-series'],
        inBytes = {key:"In Bytes (MB)", values:[]}, outBytes = {key:"Out Bytes (MB)", values:[]},
        inPackets = {key:"In Packets", values:[]}, outPackets = {key:"Out Packets", values:[]},
        chartData = [inBytes, outBytes];

    for (var i = 0; i < rawdata.length; i++) {
        var ts = Math.floor(rawdata[i].time / 1000);
        inBytes.values.push({x:ts, y:rawdata[i].inBytes});
        outBytes.values.push({x:ts, y:rawdata[i].outBytes});
        inPackets.values.push({x:ts, y:rawdata[i].inPkts});
        outPackets.values.push({x:ts, y:rawdata[i].outPkts});
    }
    return chartData;
}

function successHandlerTSChart(data, cbParams) {
    var selectorId = "#" + $(cbParams.selector).attr('id');
    initTrafficTSChart(selectorId, data, {height:300});
};

function initTrafficTSChart(selector, data, options) {
    var svgElement = selector + " svg";

    if ($(selector).find("svg") != null) {
        $(selector).empty();
    }
    $(selector).append("<svg style='height:" + options.height + "px;'></svg>");

    nv.addGraph(function () {
        var values = data[0].values, start, end, brushExtent = null;
        if (values.length >= 86) {
            start = values[values.length - 86];
            end = values[values.length - 1];
            brushExtent = [start.x, end.x];
        }

        var chart = nv.models.lineWithFocusChart().height2(90).margin2({top:10, right:30, bottom:20, left:60}).brushExtent(brushExtent);

        chart.interpolate("monotone");

        chart.xAxis.tickFormat(function (d) {
            return d3.time.format('%H:%M:%S')(new Date(d));
        });

        chart.x2Axis.tickFormat(function (d) {
            return d3.time.format('%H:%M:%S')(new Date(d));
        });

        chart.yAxis.tickFormat(function (d) {
            return d3.format(',.01f')(d / 1024);
        });

        chart.y2Axis.tickFormat(function (d) {
            return d3.format(',.01f')(d / 1024);
        });

        chart.lines.forceY([0]);
        chart.lines2.forceY([0]);

        d3.select(svgElement).datum(data).transition().duration(500).call(chart);

        nv.utils.windowResize(chart.update);

        return chart;
    });
};