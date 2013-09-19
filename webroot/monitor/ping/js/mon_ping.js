/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

function monitorPingClass() {
    this.load = function(obj) {
        var monitorPingTemplate = kendo.template($("#monitor-ping-template").html());
        $(obj['containerId']).html('');
        $(obj['containerId']).html(monitorPingTemplate);
        kendo.init($('#formPing'));
        loadPingLayout();
    }
}

var monitorPingView = new monitorPingClass();

var pingViewModel = kendo.observable({
    vRoutersVN:[],
    sourceVN:[],
    pingResponseModel:[],
    pingRespSummary:[]
});

function loadPingLayout() {
    loadVRoutersDropDown('/api/admin/monitor/infrastructure/vrouters?name=vRouters');
    initializeActions();
};

//Make an ajax call and load the Vrouters dropdownlist
function loadVRoutersDropDown(urlPath) {
    $.ajax({
        url:urlPath,
        dataType:"json",
        success:function (response) {
            var vRouterNames = jsonPath(response, "$..name");
            var vRouterIPs = jsonPath(response, "$..ip");
            var    results = [];
            for (i = 0; i < vRouterNames.length; i++) {
                results.push({"name":vRouterNames[i], "value":vRouterIPs[i]});
            }
            pingViewModel.set('vRoutersVN', results);
            kendo.bind($('#pingContainer'), pingViewModel);
            var vrdropdownlist = $("#ddListvRouter").data("kendoDropDownList");
            loadInterfacesDropDown('/api/admin/monitor/infrastructure/vrouter/interface?ip=' + vrdropdownlist.value());
        },
        error:function (message) {
            if (message.responseText) {
                showInfoWindow('Error: ' + message.responseText,'Error');
            } else {
                showInfoWindow('Request to get vRouters failed.','Error');
            }
        }
    });
};

//Make an ajax call and load the vn dropdownlist
function loadInterfacesDropDown(urlPath) {
    $.ajax({
        url:urlPath,
        dataType:"json",
        success:function (response) {
            var vnIps = jsonPath(response, "$..ip_addr");
            var vnNames = jsonPath(response, "$..vn_name");
            var    results = [];
            for (i = 0; i < vnIps.length; i++) {
                results.push({"name":vnIps[i], "value":vnNames[i]});
            }
            pingViewModel.set('sourceVN', results);
            kendo.bind($('#pingContainer'), pingViewModel);
            var vndropdownlist = $("#ddListvn").data("kendoDropDownList");
            $("#txtVN").val(vndropdownlist.value());//setting the value to network field
        },
        error:function (message) {
            if (message.responseText) {
                showInfoWindow('Error: ' + message.responseText,'Error');
            } else {
                showInfoWindow('Request to get source vns failed. Please try again later.','Error');
            }
        }
    });
};

//Perform ping action by getting all the fields validating them and making an ajax call
function doPing() {
    $('#pingResponse').html('');
    if(isValid()){
        var selectedVRouter = $("#ddListvRouter").data("kendoDropDownList").value();
        var selectedVnItem = $("#ddListvn").data("kendoDropDownList").dataItem();
        var selectedVn = selectedVnItem.name;
        var selectedProtocol = $("#listProtocol").val();
        var selectedDest = $("#comboDestIP").val();
        var selectedSrcPort = $("#txtSrcPort").val();
        var selectedDestPort = $("#txtDestPort").val();
        var selectedPacketSize = $("#txtPktSize").val();
        var selectedCount = $("#txtCnt").val();
        var selectedInterval = $("#txtInterval").val();
        var selectedNetwork = $("#txtVN").val();
        var parts = selectedNetwork.split(':');
        var selectedNetwork = selectedNetwork + ":" + parts[parts.length - 1];//formatting the vrf by appending the postfix again as per requirement
        //min reqd uri
        var urlPath = '/api/service/networking/ping?ip='+selectedVRouter+'&srcIP='+ selectedVn +'&destIP='+selectedDest+'&protocol='+selectedProtocol+'&vrfName='+selectedNetwork;
        
        //keep appending optional params to the uri if they are entered parallely form the pingResults string
        var    pingResults = 'Probe from ' + selectedVn;
        if(selectedSrcPort != null && selectedSrcPort !="") {
            urlPath = urlPath.concat('&srcPort='+selectedSrcPort);
            pingResults = pingResults.concat(':'+selectedSrcPort);
        }
        pingResults = pingResults.concat(' to ' + selectedDest);
        if(selectedDestPort != null && selectedDestPort !="") {
            urlPath = urlPath.concat('&destPort='+selectedDestPort);
            pingResults = pingResults.concat(':'+selectedDestPort);
        }
        pingResults = pingResults.concat('</br>');
        if(selectedPacketSize != null && selectedPacketSize !="") {
            urlPath = urlPath.concat('&pktSize='+selectedPacketSize);
        }
        if(selectedInterval != null && selectedInterval !="") {
            urlPath = urlPath.concat('&interval='+selectedInterval);
        }
        if(selectedCount != null && selectedCount !="") {
            urlPath = urlPath.concat('&count='+selectedCount);
        }    
        $.ajax({
            url:urlPath,
            dataType:"json",
            success:function (response) {
                var pingResps = jsonPath(response, "$..pingResp.*");
                var pingSummary = jsonPath(response, "$..pingSummResp[0]");
                //var rtts = [];
                for (i = 0; i < pingResps.length; i++) {
                    if(pingResps[i].resp.toLowerCase() == 'success'){
                        pingResults = pingResults.concat('seq=' + pingResps[i].seq_no + ' time=' + pingResps[i].rtt + '</br>');
                    } else {
                        pingResults = pingResults.concat('seq=' + pingResps[i].seq_no + ' request timed out </br>');
                    }
                }
                pingResults = pingResults.concat('--- Statistics ---</br>');
                pingResults = pingResults.concat(pingSummary[0].request_sent + ' packets transmitted, '+ pingSummary[0].response_received +' packets received, ' 
                        + pingSummary[0].pkt_loss + '% packet loss');
                if(pingSummary[0].average_rtt != undefined){
                    pingResults = pingResults.concat(', ' + pingSummary[0].average_rtt+' average round trip');
                }
                $('#pingResponse').html(pingResults);
            },
            error:function (message) {
                if (message.responseText) {
                    showInfoWindow('Error: ' + message.responseText,'Error');
                } else {
                    showInfoWindow('Request to do ping failed.','Error');
                }
            }
        });
    }
};

//Validation for the page
function isValid(){
    var destIp = $("#comboDestIP").val();
    if(!isSet(destIp)){
        showInfoWindow('Destination IP not set','Error');
        return false;
    }
    if(!validip($("#comboDestIP").val())){
        showInfoWindow('Destination IP is not a valid IP Address','Error');
        return false;
    }
    return true;
};

//Initialize all the actions performed in the page
function initializeActions(){
    //Initializing the action to fetch the vns when a specific vrouter is selected
    var vrdropdownlist = $("#ddListvRouter").data("kendoDropDownList");
    var protocolList = $("#listProtocol").data("kendoDropDownList");
    vrdropdownlist.bind("change", function(e) {
        loadInterfacesDropDown('/api/admin/monitor/infrastructure/vrouter/interface?ip=' + vrdropdownlist.value());
    });
    //Initializing action to set the network value when a vn is selected
    var vndropdownlist = $("#ddListvn").data("kendoDropDownList");
    vndropdownlist.bind("change", function(e) {
        $("#txtVN").val(vndropdownlist.value());        
    });
    //Setting the action for button click
    $("#btnStartProbe").click(function(){doPing();});
    //Setting the action for button click
    $("#btnReset").click(function(){
        $("#comboDestIP").val('');
        $("#txtSrcPort").val('');
        $("#txtDestPort").val('');
        $("#listProtocol").val('');
        $("#txtPktSize").val('');
        $("#txtCnt").val('');
        $("#txtInterval").val('');
        vrdropdownlist.select(0);
        vndropdownlist.select(0);
        $("#txtVN").val(vndropdownlist.value());
        protocolList.select(0);
        $('#pingResponse').html('');
    });
};


