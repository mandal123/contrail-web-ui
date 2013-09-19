/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

dummyData = (function() {
    var self = this;
    return {
        initVolumeChart : function(selector,data,series) {
            $(selector).kendoChart({
                dataSource: data,
                legend: {
                    visible:true
                },
                series: series,
                seriesDefaults: {
                    gap: 0.7,
                    stack: 1,
                    type: "column",
                    color: "#1c638d",
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
                        color: "#727f8e"
                    }
                },
                tooltip: {
                    visible: true
                },
                valueAxis: {
                    visible: false
                },
                //legend: { visible: false }
            });
        },
        initBubbleChart : function() {
            //var chartHeight = $('#br-portlet').closest('.k-block').height()-26;
            var chartHeight = $('#br-portlet').closest('.k-block').height()-$('#br-portlet').siblings('.k-header').outerHeight();
            $("#br-portlet").kendoChart({
                theme: sessionStorage.getItem('kendoSkin') || "default",
                chartArea: {
                    height: chartHeight
                },
                theme: $(document).data("kendoSkin") || "default",
                title: {
                    text: "Job Growth for 2011"
                },
                legend: {
                    visible: false
                },
                series: [{
                    type: "bubble",
                    data: [{
                        x: -2500,
                        y: 50000,
                        size: 500000,
                        category: "Microsoft"
                    }, {
                        x: 500,
                        y: 110000,
                        size: 7600000,
                        category: "Starbucks"
                    }, {
                        x: 7000,
                        y: 19000,
                        size: 700000,
                        category: "Google"
                    }, {
                        x: 1400,
                        y: 150000,
                        size: 700000,
                        category: "Publix Super Markets"
                    }, {
                        x: 2400,
                        y: 30000,
                        size: 300000,
                        category: "PricewaterhouseCoopers"
                    }, {
                        x: 2450,
                        y: 34000,
                        size: 90000,
                        category: "Cisco"
                    }, {
                        x: 2700,
                        y: 34000,
                        size: 400000,
                        category: "Accenture"
                    }, {
                        x: 2900,
                        y: 40000,
                        size: 450000,
                        category: "Deloitte"
                    }, {
                        x: 3000,
                        y: 55000,
                        size: 900000,
                        category: "Whole Foods Market"
                    }]
                }],
                xAxis: {
                    labels: {
                        format: "{0:N0}",
                        skip: 1
                    },
                    axisCrossingValue: -5000,
                    majorUnit: 2000,
                    plotBands: [{
                        from: -5000,
                        to: 0,
                        color: "#00f",
                        opacity: 0.05
                    }]
                },
                yAxis: {
                    labels: {
                        format: "{0:N0}"
                    },
                    line: {
                        width: 0
                    }
                },
                tooltip: {
                    visible: true,
                    format: "{3}: {2:N0} applications",
                    opacity: 1
                }
            });
        },
        initPieChart : function(selector) {
            $(selector).kendoChart({
                //theme: $(document).data("kendoSkin") || "default",
                theme: sessionStorage.getItem('kendoSkin') || "blueopal",
                chartArea: {
                    height:200,
                    width:200,
                    background:""
                },
                title: {
                    text: "Top External Networks"
                },
                legend: {
                    visible:true,
                    position: "bottom",
                    labels: {
                        template: "#= text # (#= value #%)"
                    }
                },
                seriesDefaults: {
                    labels: {
                        visible: false,
                        format: "{0}%"
                    }
                },
                series: [{
                    type: "pie",
                    data: [ {
                        category: "Hydro",
                        value: 22
                    }, {
                        category: "Solar",
                        value: 2
                    }, {
                        category: "Nuclear",
                        value: 49
                    }, {
                        category: "Wind",
                        value: 27
                    } ]
                }],
                tooltip: {
                    visible: true,
                    format: "{0}%"
                }
            });
        },
        initColumnChart : function(selector) {
            $(selector).kendoChart({
                //theme: $(document).data("kendoSkin") || "default",
                theme: sessionStorage.getItem('kendoSkin') || "default",
                title: {
                    text: "Top Applications"
                },
                legend: {
                    position: "bottom"
                },
                chartArea: {
                    height:200,
                    width:200,
                    background: ""
                },
                seriesDefaults: {
                    //type: "line"
                    //type: "bar"
                    type: "column"
                },
                series: [
                {
                    name: "TCP",
                    data: [67.96]
                }, 
                {
                    name: "UDP",
                    data: [ 58.93]
                },
                {
                    name: "ICMP",
                    data: [15.7]
                }
                ],
                valueAxis: {
                    min: 0,
                    max: 100,
                    majorUnit:40,
                    labels: {
                        format: "{0} %"
                    }
                },
                categoryAxis: {
                    //categories: ['11:00', '12:00','13:00','14:00','15:00']
                },
                tooltip: {
                    visible: true,
                    //format: "{0} Mb/s"
                    format: "{0} %"
                }
            });
        },
        initBarChart : function(selector) {
            $(selector).kendoChart({
                theme: $(document).data("kendoSkin") || "default",
                title: {
                    text: "Top Protocols"
                },
                legend: {
                    position: "bottom"
                },
                chartArea: {
                    height:200,
                    width:200,
                    background: ""
                },
                seriesDefaults: {
                    //type: "line"
                    type: "bar"
                },
                series: [{
                    name: "TCP",
                    data: [15.7, 16.7,  23.5,20, 26.6]
                }, 
                {
                    name: "UDP",
                    data: [67.96,  75,68.93, 74, 78]
                },
                {
                    name: "ICMP",
                    data: [ 58.93,77.96, 65, 84, 88]
                }
                ],
                valueAxis: {
                    min: 0,
                    max: 100,
                    majorUnit:20,
                    labels: {
                        format: "{0} Mb/s"
                    }
                },
                categoryAxis: {
                    categories: ['11:00', '12:00','13:00','14:00','15:00']
                },
                tooltip: {
                    visible: true,
                    format: "{0} Mb/s"
                }
            }); 
        },
        initLineChart : function(selector) {
             $(selector).kendoChart({
                //theme: $(document).data("kendoSkin") || "default",
                theme: sessionStorage.getItem('kendoSkin') || "default",
                title: {
                    text: "Top Instances"
                },
                legend: {
                    position: "bottom"
                },
                chartArea: {
                    height:200,
                    width:200,
                    background: "#FBFBFB"
                },
                seriesDefaults: {
                    type: "line"
                },
                series: [{
                    name: "VN1",
                    data: [15.7, 16.7, 20, 23.5, 26.6]
                }, 
                {
                    name: "VN2",
                    data: [67.96, 68.93, 75, 74, 78]
                },
                {
                    name: "VN3",
                    data: [77.96, 58.93, 65, 84, 88]
                }
                ],
                valueAxis: {
                    min: 0,
                    max: 100,
                    majorUnit:20,
                    labels: {
                        format: "{0} Mb/s"
                    }
                },
                categoryAxis: {
                    categories: ['11:00', '12:00','13:00','14:00','15:00']
                },
                tooltip: {
                    visible: true,
                    format: "{0} Mb/s"
                }
            }); 
        }

    }

})();

randomData = (function() {
    return {
        getTopSeriesData : function(type) {
            var applications = ['Port 9090','Port 8080','Port 8093','HTTP','SMTP','SSH','FTP','Oracle','Cassandra','SNMP','IMAP','Telnet','DHCP','TFTP']; 
            var ips = [];
            for(var i=0;i<10;i++) {
                ips.push(getRandomIp());
            }
            var values;
            if(type == 'apps')
                values  = getRandomArrValues(applications,5);
            else
                values = getRandomArrValues(ips,5);
            //As we need to change the labels,series also need to be updated
            var series = [];
            var colors = ['red','green','blue','yellow','orange'];
            //colors = ['#B79F80','#535353','#F5946A','#B79F80','#957244','#F26223'];
            var fields = ['high','low','medium','high1','low1'];
            for(var i=0;i<values.length;i++) {
                series.push({
                    'name' : values[i],
                    //'field' :'val' + i, 
                    'field' :fields[i], 
                    'aggregate':'sum',
                    'color' : colors[i]             /*Default colors are not good*/
                });
            }
            return series;
        },
        getTopData : function(seriesCnt) {
            topData = [];
            var MAX_EVENTS = 50;
            for(var i=0;i<MAX_EVENTS;i++) {
                dt = adjustDate(dt,{min:-getRandomNum(0,200)});
                //For each generated time,push random number(1-20) of high/low/medium
                var high=0,low=0,medium=0;
                var obj = {'time':getFormattedTime(dt),'Date':new Date(dt)};
                for(var j=0;j<seriesCnt;j++) {
                    obj['val' + j] = getRandomNum(10,20);
                }
                obj['high'] = getRandomNum(0,20);
                topData.push(obj);
            }
            topData.reverse();
            return topData;
        },
        getEventsData : function() {
            var events = [];
            var dt = new Date();
            var networks = ['VN1','VN2','VN3','VN4','VN5'];
            var eventTypes = ['TCP Flow established','UDP Flow established','TCP Flow disconnected','UDP Flow established']
            var eventSeverities = ['high','low','medium'];
            var MAX_EVENTS = 50;
            for(var i=0;i<MAX_EVENTS;i++) {
                //dt = adjustDate(dt,{min:-getRandomNum(0,200)});
                dt = adjustDate(dt,{day:-1});
                //Clone the date object to avoid passby reference
                //events.push([new Date(dt),getRandomIp(),getRandomIp(),getRandomArrVal(eventTypes),getRandomArrVal(networks)]);
                var eventSeverity = getRandomArrVal(eventSeverities);
                var eventType = getRandomArrVal(eventTypes);
                //For each generated time,push random number(1-20) of high/low/medium
                var high=0,low=0,medium=0;
                events.push({'time':getFormattedTime(dt),'Date':new Date(dt),
                        'srcIP':getRandomIp(),'destIP':getRandomIp(),'type':eventType,
                        'severity':eventSeverity,'network':getRandomArrVal(networks),
                        'high':getRandomNum(1,20),'low':-1 * (getRandomNum(10,20)),'medium':getRandomNum(1,20),
                        'high1' : getRandomNum(1,20),'low1':getRandomNum(1,20)});
            }
            events.reverse();
            return events;
        }

    }
})();
