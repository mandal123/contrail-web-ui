/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

checkAndSetStrTrim();
bgpConfigObj = new bgpConfigObj();

function bgpConfigObj() {
	var mode = "", guuid = "",
    ghref = "", ggasn = "", ggasnObj = "";

	var bgpGrid, bgpwindow, gasnwindow, selectedName, bgpData,
	    bgp_details_data, bgpavailabledata, bgpselectdata, globalData, bgpColumnDisplay;
	
	//Method definitions
	this.load = load;
	this.loadBgpPeerConfig = loadBgpPeerConfig;
	this.populateGW = populateGW;
	this.isJuniperControlNode = isJuniperControlNode;
	this.isGlobalASN = isGlobalASN;
	this.handleltor = handleltor;
	this.handlertol = handlertol;
	this.clearBgpWindow = clearBgpWindow;
	this.closeBgpWindow = closeBgpWindow;
	this.validate = validate;
	this.getBGPJson = getBGPJson;
	this.addEditBgp = addEditBgp;
	this.onChange = onChange;
	this.getNodes = getNodes;
	this.setActions = setActions;
	this.onActionChange = onActionChange;
	this.onPageChange = onPageChange;
	this.deleteBgp = deleteBgp;
	this.loadBgpConfigNodes = loadBgpConfigNodes;
	this.populateMultiselect = populateMultiselect;
	this.selectExternal = selectExternal;
	this.closeGasnWindow = closeGasnWindow;
	this.openGasnWindow = openGasnWindow;
	this.validateGasn = validateGasn;
	this.getGasnJSON = getGasnJSON;
	this.gasnSuccess = gasnSuccess;
	this.gasnFailure = gasnFailure;
	this.submitGasn = submitGasn;
	this.destroy = destroy;
}

function load() {
	loadBgpPeerConfig();
}

function loadBgpPeerConfig() {
    var configTemplate = kendo.template($("#bgp-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    loadBgpConfigNodes();
    currTab = 'config_infra_bgp';
}

function populateGW() {
    var ip_input = $("#txtiprange").val().trim();
    if ("" != ip_input) {
        populateIp();
        if (iprange_data.length > 0) {
            $("#txtgw").val(iprange_data[iprange_data.length - 1].ip)
        }
    }
}

function isJuniperControlNode(vendor) {
    if (!isSet(vendor) || vendor == null || vendor.trim().toLowerCase() == "" ||
        vendor.trim() == "-" || vendor.trim().toLowerCase() == "contrail") {
        return true;
    }
    return false;
}

function isGlobalASN() {
    var asn = $('#txtasn').val().trim();
    if (asn == ggasn) {
        return true;
    } else {
        return false;
    }
}

function handleltor() {
    var i = 0;
    var dataItems = [];
    var bgpavailablelist = $("#bgpavailablelist").data("kendoListView");
    var bgpselectlist = $("#bgpselectlist").data("kendoListView");
    var selected = bgpavailablelist.element.children().closest(".k-state-selected").find("span");
    var type = "";
    if ($("#chkjnpr")[0].checked === true)
        type = "control";
    else
        type = "external";
    if (selected.length > 0) {
        for (var i = 0; i < selected.length; i++) {
            for (var j = 0; j < globalData.length; j++) {
                if (globalData[j].name == selected[i].innerHTML) {
                    if (type == "external") {
                        if (!isJuniperControlNode(globalData[j].vendor)) {
                            showInfoWindow("BGP peer(" +
                                globalData[j].name +
                                ") can be paired only with Control Nodes.",
                                "Selection Error");
                            return;
                        }
                    }
                }
            }
        }
    }

    if (selected.length > 0) {
        for (var i = 0; i < selected.length; i++) {
            dataItems.push(selected[i].innerHTML);
        }
    }
    var selectdata = bgpselectlist.dataSource.data();
    var availdata = bgpavailablelist.dataSource.data();
    for (var i = 0; i < dataItems.length; i++) {
        selectdata.push({"bgppeer":dataItems[i]});
    }
    for (var i = 0; i < dataItems.length; i++) {
        for (var j = 0; j < availdata.length; j++) {
            if (dataItems[i] == availdata[j].bgppeer) {
                availdata.splice(j, 1);
            }
        }
    }
    bgpselectlist.dataSource.data(selectdata);
    bgpavailablelist.dataSource.data(availdata);
}

function handlertol() {
    var i = 0;
    var dataItems = [];
    var bgpavailablelist = $("#bgpavailablelist").data("kendoListView");
    var bgpselectlist = $("#bgpselectlist").data("kendoListView");
    var selected = bgpselectlist.element.children().closest(".k-state-selected").find("span");
    var type = "";
    if ($("#chkjnpr")[0].checked === true)
        type = "control";
    else
        type = "external";
    if (selected.length > 0) {
        if (isGlobalASN()) {
            showInfoWindow("Peer cannot be unpaired.", "Selection Error");
            return;
        } else {
            for (var i = 0; i < selected.length; i++) {
                for (var j = 0; j < globalData.length; j++) {
                    if (globalData[j].name == selected[i].innerHTML) {
                        if (type == "control") {
                            if (isJuniperControlNode(globalData[j].vendor)) {
                                showInfoWindow("Control Node('" +
                                    globalData[j].name + "') cannot be unpaired.",
                                    "Selection Error");
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    if (selected.length > 0) {
        for (var i = 0; i < selected.length; i++) {
            dataItems.push(selected[i].innerHTML);
        }
    }
    var selectdata = bgpselectlist.dataSource.data();
    var availdata = bgpavailablelist.dataSource.data();
    for (var i = 0; i < dataItems.length; i++) {
        availdata.push({"bgppeer":dataItems[i]});
    }
    for (var i = 0; i < dataItems.length; i++) {
        for (var j = 0; j < selectdata.length; j++) {
            if (dataItems[i] == selectdata[j].bgppeer) {
                selectdata.splice(j, 1);
            }
        }
    }
    bgpselectlist.dataSource.data(selectdata);
    bgpavailablelist.dataSource.data(availdata);
}

function clearBgpWindow() {
    mode = "";
    $("#txtvendor").val("");
    $("#txtname").val("");
    $("#txtasn").val("");
    $("#txtrid").val("");
    $("#txtaddr").val("");
    $("#txtport").val("");
    $("#txtname")[0].disabled = false;
    $("#txtasn")[0].disabled = false;
    $("#txtvendor")[0].disabled = false;
    $("#txtrid")[0].disabled = false;
    $("#txtport")[0].disabled = false;
    $("#txtaddr")[0].disabled = false;
    $("#chkexternal").click();
    var bgpavailablelist = $("#bgpavailablelist").data("kendoListView");
    var bgpselectlist = $("#bgpselectlist").data("kendoListView");
    bgpselectdata = [];
    bgpselectlist.dataSource.data([]);
    bgpavailablelist.dataSource.data([]);
}

function closeBgpWindow() {
    bgpwindow.modal('hide');
    clearBgpWindow();
}

function validate() {
    var name, asn, rid, addr, port, vendor, family = [], peers = [];
    name = $("#txtname").val().trim();
    asn = $("#txtasn").val().trim();
    rid = $("#txtrid").val().trim();
    addr = $("#txtaddr").val().trim();
    port = $("#txtport").val().trim();
    family = $("#txtfamily").val().trim();
    family = family.split("-");
    vendor = $("#txtvendor").val().trim();

    if ("" == name) {
        showInfoWindow("Enter a BGP router name", "Input required");
        return false;
    }
    try {
        asn = parseInt(asn);
        if (asn < 1 || asn > 65534 || isNaN(asn)) {
            showInfoWindow("Enter valid BGP ASN number between 1-65534", "Invalid input");
            return false;
        }
    } catch (e) {
        showInfoWindow("Enter valid BGP ASN number between 1-65534", "Invalid input");
        return false;
    }
    if ("" == rid || !validip(rid) || rid.indexOf("/") != -1) {
        showInfoWindow("Enter a valid BGP router ID in the format xxx.xxx.xxx.xxx", "Invalid input");
        return false;
    }
    if ("" == addr || !validip(addr) || addr.indexOf("/") != -1) {
        showInfoWindow("Enter a vaid BGP peer address in the format xxx.xxx.xxx.xxx", "Invalid input");
        return false;
    }
    try {
        port = parseInt(port);
        if (port <= 0 || port > 9999 || isNaN(port)) {
            showInfoWindow("Enter valid BGP port number between 1-9999", "Invalid input");
            return false;
        }
    } catch (e) {
        showInfoWindow("Enter valid BGP port number between 1-9999", "Invalid input");
        return false;
    }
    if ($(chkextern)[0].checked === true) {
        if ("" == vendor.trim()) {
            showInfoWindow("Enter valid vendor name or SKU such as 'Juniper' or 'MX-40'.", "Input required");
            return false;
        }

        if ("contrail" == vendor.toLowerCase()) {
            showInfoWindow("Vendor name cannot be 'contrail'. Enter valid vendor name or SKU such as 'Juniper' or 'MX-40'.", "Invalid input");
            return false;
        }
    }
    if ("" == family || family.length <= 0) {
        showInfoWindow("Enter BGP peer address family", "Input required");
        return false;
    }

    var bgpselectlist = $("#bgpselectlist").data("kendoListView");
    var selectdata = bgpselectlist.dataSource.data();
    for (var i = 0; i < selectdata.length; i++) {
        peers[i] = selectdata[i].bgppeer;
    }
    return true;
}

function getBGPJson() {
    var bgp_params = [];
    var name, asn, rid, addr, port, vendor, family = [], peers = [], type;
    name = $("#txtname").val().trim();
    asn = parseInt($("#txtasn").val().trim());
    rid = $("#txtrid").val().trim();
    addr = $("#txtaddr").val().trim();
    port = parseInt($("#txtport").val().trim());
    family = $("#txtfamily").val().trim();
    vendor = $("#txtvendor").val().trim();
    if ($("#chkjnpr")[0].checked === true) {
        type = "control";
        vendor = "contrail";
        asn = parseInt(ggasn);
    } else {
        type = "external";
    }
    peers = [];
    if(type == "control") {
    	//If user is trying to create a new control node, 
    	//peer with all control nodes and external bgp peers.
        for (var j = 0; j < bgpData.length; j++) {
            peers.push({"uuid":bgpData[j].uuid, "href":bgpData[j].href, "_id_params":bgpData[j]._id_params,
            "to":["default-domain", "default-project" , "ip-fabric", "__default__", bgpData[j].name]});
        }
    } else {
    	//If user is trying to create a new external BGP node, 
    	//peer with all control nodes.
        var bgpselectlist = $("#bgpselectlist").data("kendoListView");
        var selectdata = bgpselectlist.dataSource.data();
        for (var i = 0; i < selectdata.length; i++) {
            if ("" != selectdata[i].bgppeer.trim()) {
                for (var j = 0; j < bgpData.length; j++) {
                    if (bgpData[j].name == selectdata[i].bgppeer) {
                        peers.push({"uuid":bgpData[j].uuid, "href":bgpData[j].href, "_id_params":bgpData[j]._id_params,
                            "to":["default-domain", "default-project" , "ip-fabric", "__default__", selectdata[i].bgppeer]});
                        break;
                    }
                }
            }
        }
    }
    if (peers.length > 0) {
        if (mode == "add") {
            bgp_params = {
                "bgp-router":{
                    "parent_type":"routing-instance",
                    "fq_name":["default-domain", "default-project", "ip-fabric", "__default__", name],
                    "parent_name":"__default__",
                    "bgp_router_parameters":{
                        "address_families":{
                            "family":["inet-vpn"]
                        },
                        "autonomous_system":asn,
                        "address":addr,
                        "identifier":rid,
                        "port":port,
                        "vendor":vendor
                    },
                    "bgp_router_refs":peers,
                    "name":name
                }
            };
        } else if (mode == "edit") {
            bgp_params = {
                "bgp-router":{
                    "uuid":guuid,
                    "href":ghref,
                    "id_perms":_gid_perms,
                    "_type":"bgp-router",
                    "fq_name":["default-domain", "default-project", "ip-fabric", "__default__", name],
                    "parent_name":"__default__",
                    "bgp_router_parameters":{
                        "address_families":{
                            "family":["inet-vpn"]
                        },
                        "autonomous_system":asn,
                        "address":addr,
                        "identifier":rid,
                        "port":port,
                        "vendor":vendor
                    },
                    "bgp_router_refs":peers,
                    "name":name
                }
            };
        }
    } else {
        if (mode == "add") {
            bgp_params = {
                "bgp-router":{
                    "parent_type":"routing-instance",
                    "fq_name":["default-domain", "default-project", "ip-fabric", "__default__", name],
                    "parent_name":"__default__",
                    "bgp_router_parameters":{
                        "address_families":{
                            "family":["inet-vpn"]
                        },
                        "autonomous_system":asn,
                        "address":addr,
                        "identifier":rid,
                        "port":port,
                        "vendor":vendor
                    },
                    "name":name
                }
            };
        }
        else if (mode == "edit") {
            bgp_params = {
                "bgp-router":{
                    "uuid":guuid,
                    "href":ghref,
                    "id_perms":_gid_perms,
                    "_type":"bgp-router",
                    "fq_name":["default-domain", "default-project", "ip-fabric", "__default__", name],
                    "parent_name":"__default__",
                    "bgp_router_parameters":{
                        "address_families":{
                            "family":["inet-vpn"]
                        },
                        "autonomous_system":asn,
                        "address":addr,
                        "identifier":rid,
                        "port":port,
                        "vendor":vendor
                    },
                    "name":name
                }
            };
        }
    }
    return bgp_params;
}

function addEditBgp(data) {
    var bgp_params;
    if (mode == "edit") {
        var vendor, detailStr, peers = [],
            bgpselectlist = $("#bgpselectlist").data("kendoListView"),
            bgpavailablelist = $("#bgpavailablelist").data("kendoListView"),
            tmp_availablelist = [],
            tmp_selectlist = [];

        if (data.role.indexOf("Control") != -1) {
            $("#chkjnpr").click();
        } else {
            $("#chkextern").click();
        }
        $("#txtname").val(data.name);
        $("#txtname")[0].disabled = true;
        $("#txtport")[0].disabled = true;
        $("#txtaddr").val(data.ip);
        detailStr = data['detailStr'];
        detailStr = detailStr.split(";");
        for (var i = 0; i < detailStr.length; i++) {
            if (detailStr[i].indexOf("BGP ASN") != -1) {
                $("#txtasn").val(detailStr[i].split("BGP ASN")[1].trim());
            } else if (detailStr[i].indexOf("Router ID") != -1) {
                $("#txtrid").val(detailStr[i].split("Router ID")[1].trim());
            } else if (detailStr[i].indexOf("BGP Port") != -1) {
                $("#txtport").val(detailStr[i].split("BGP Port")[1].trim());
            } else if (detailStr[i].indexOf("Address family") != -1) {
                $("#txtfamily").val(detailStr[i].split("Address family")[1].trim());
            } else if (detailStr[i].indexOf("Vendor") != -1) {
                $("#txtvendor").val(detailStr[i].split("Vendor")[1].trim());
            }
        }
        data.details.forEach(function (d) {
            if (d.name == "Peers") {
                peers = d.value.split(",");
                peers.forEach(function (a) {
                    bgpselectdata.push({"bgppeer":a});
                });
                bgpselectlist.dataSource.data(bgpselectdata);
                tmp_selectlist = clone(bgpselectdata);
            }
        });
        vendor = $("#txtvendor").val().trim();
        if (isJuniperControlNode(vendor)) {
            for (var j = 0; j < bgpData.length; j++) {
                if (!isJuniperControlNode(bgpData[j].vendor) &&
                    $("#txtname").val() != bgpData[j].name)
                    tmp_availablelist.push({'bgppeer':bgpData[j].name});
            }
        } else {
            if ("" != $("#txtvendor").val().trim()) {
                for (var j = 0; j < bgpData.length; j++) {
                    if (isJuniperControlNode(bgpData[j].vendor) &&
                        $("#txtname").val() != bgpData[j].name)
                        tmp_availablelist.push({'bgppeer':bgpData[j].name});
                }
            }
        }
        for (var i = 0; i < tmp_selectlist.length; i++) {
            for (var j = 0; j < tmp_availablelist.length; j++) {
                if (tmp_selectlist[i].bgppeer == tmp_availablelist[j].bgppeer) {
                    tmp_availablelist.splice(j, 1);
                }
            }
        }

        bgpavailablelist.dataSource.data(tmp_availablelist);
    }
}

function onChange(arg) {
    bgp_details_data.splice(0, bgp_details_data.length);

    var grid = bgpGrid.data("kendoGrid");
    var i = 0;
    var dataItems = [];
    if (grid.select().length == 1) {
        grid.select().each(function () {
            dataItems.push(grid.dataItem($(this)));
        });
    }
}

function getNodes() {
    showGridLoading("#gridBGP");
    $('#cb_gridBGP').attr('checked', false);
    $.ajax({
        type:"GET",
        cache:false,
        url:"/api/tenants/admin/config/global-asn"
    }).success(function (res) {
            ggasnObj = jsonPath(res, "$.*")[0];
            ggasn = ggasnObj["autonomous_system"];
            $("#btneditgasn").val("Global ASN - " + ggasn);
            toggleButtonStateByID("btneditgasn", true);
        }).fail(function (msg) {
            showInfoWindow("Error in getting Global ASN.", "Error");
            toggleButtonStateByID("btneditgasn", true);
        });
    $.ajax({
        type:"GET",
        cache:false,
        url:"/api/admin/nodes/bgp"
    }).success(function (res) {
            showGridLoading("#gridBGP");
            var counter = 0;
            bgpavailabledata.splice(0, bgpavailabledata.length);
            bgpGrid.data("kendoGrid").dataSource.data([]);
            bgpavailabledata.splice(0, bgpavailabledata.length);
            bgpData.splice(0, bgpData.length);
            globalData.splice(0, globalData.length);
            bgpselectdata.splice(0, bgpselectdata.length);
            if (res.hasOwnProperty("bgp-routers") && res["bgp-routers"].length == 0) {
                showGridMessage("#gridBGP", "No BGP peer found.");
                return;
            }
            res.forEach(function (d) {
                if (null != d) {
                    var type = (d.type) ? d.type : "",
                        append = "", role = "", roles, addr_families = [],
                        peers = [], details = [], detailStr = "";
                    if (type.indexOf("bgp-router") != -1) {
                        globalData.push(d);
                        bgpavailabledata.push({"bgppeer":d.name});
                        if (isJuniperControlNode(d.vendor)) {
                            append = "Control Node";
                        } else {
                            append = "BGP Peer";
                        }
                        roles = type.split(", ");
                        roles.forEach(function (e) {
                            if (e == "bgp-router") {
                                role = append;
                            }
                        });
                        if (d.address_families && d.address_families.family) {
                            d.address_families.family.forEach(function (e) {
                                addr_families.push(e);
                            });
                        }
                        addr_families = addr_families.toString();
                        //tbd bgp peers
                        if (d.bgp_refs) {
                            peers = d.bgp_refs.toString();
                            details.push({ "name":"Peers", "value":peers });
                        }
                        if (type.indexOf("bgp-router") != -1) {
                            if (d.vendor && d.vendor.trim() != "") {
                                detailStr = "Vendor " + d.vendor + "; ";
                                details.push({ "name":"Vendor", "value":d.vendor });
                            }
                            if (d.autonomous_system) {
                                detailStr += "BGP ASN " + d.autonomous_system + ";";
                                details.push({ "name":"BGP ASN", "value":d.autonomous_system });
                            }
                            if (d.identifier && d.identifier.trim() != "") {
                                detailStr += "Router ID " + d.identifier + "; ";
                                details.push({ "name":"Router ID", "value":d.identifier });
                            }
                            if (d.port) {
                                detailStr += "BGP Port " + d.port + "; ";
                                details.push({ "name":"BGP Port", "value":d.port });
                            }
                            if (addr_families && addr_families.trim() != "") {
                                detailStr += "Address family " + addr_families + "; ";
                                details.push({ "name":"Address family", "value":addr_families });
                            }
                        }
                        if (d.address && "" != d.address) {
                            bgpData.push({
                                "id":counter++,
                                "uuid":d.uuid,
                                "href":d.href,
                                "id_perms":d.id_perms,
                                "ip":d.address,
                                "role":role,
                                "name":d.name,
                                "vendor":(d.vendor == null) ? "-" : d.vendor,
                                "details":details,
                                "detailStr":detailStr
                            });
                        } else if (d.ip_address && "" != d.ip_address) {
                            bgpData.push({
                                "id":counter++,
                                "uuid":d.uuid,
                                "href":d.href,
                                "id_perms":d.id_perms,
                                "ip":d.ip_address,
                                "role":role,
                                "name":d.name,
                                "vendor":(d.vendor == null) ? "-" : d.vendor,
                                "details":details,
                                "detailStr":detailStr
                            });
                        }
                    }
                }
                //counter++;
            });
            setActions();
            check4GridEmpty('#gridBGP', 'No BGP Peers found.');            
        }).fail(function (msg) {
            showGridMessage("#gridBGP", "Error in getting data.");
            showInfoWindow("Error in getting data.", "Error");
        });
}

function setActions(mode) {
    var grid = bgpGrid.data("kendoGrid");
    grid.dataSource.data(bgpData);
    if (mode == "edit") {
        for (var j = 0; j < bgpData.length; j++) {
            if (bgpData[j].name == selectedName) {
                break;
            }
        }
        grid.select("tr:eq(" + (j + 1) + ")");
    }
    mode = "";
    selectedName = "";
}

function onActionChange(who) {
    var selectedRow = bgpGridData.dataItem(bgpGridData.select());
    guuid = selectedRow.uuid;
    ghref = selectedRow.href;
    _gid_perms = selectedRow.id_perms;

    if (who == "edit-control") {
        mode = "edit";
        addEditBgp(selectedRow);
        bgpwindow.modal('show');
        bgpwindow.find('h6').text("Edit BGP Peer");
    } else if (who == "debug-control") {
        $.bbq.pushState({p:"mon_bgp", q:{node:'Control Nodes:' + edit_data.name, tab:'console'}});
    } else if (who == "delete") {
        $("#btndelbgp").click();
    }
}

function onPageChange() {
    setActions();
}

function deleteBgp(selectedRows) {
	//showMessageDialog();
	$("#btndelbgp").attr("disabled","disabled");
    var deleteAjaxs = [];
    if (selectedRows && selectedRows.length > 0) {
        for (var i = 0; i < selectedRows.length; i++) {
            var selected_row_data = selectedRows[i];
            deleteAjaxs[i] = $.ajax({
                url:"/api/admin/bgp-router/" + selected_row_data["uuid"],
                type:"DELETE"
            });
        }
        $.when.apply($, deleteAjaxs).then(
            function () {
                //all success
            	showGridLoading("#gridBGP");
            	//showSuccessMessage();
                getNodes();
            },
            function () {
                //If atleast one api fails
            	//closeMessageDialog(0);
            	showGridLoading("#gridBGP");
                showInfoWindow("Error while deleting peer", "Error");            	
                getNodes();
            });
    }
}

function loadBgpConfigNodes() {
	bgpavailabledata = [];
	bgpData = [];
    bgp_details_data = [];
    bgpavailabledata = [];
    bgpselectdata = [];
    globalData = [];
	var bgpColumnDisplay = [
    {
        field:"",
        menu: false,
        title:"<input id='cb_gridBGP' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btndelbgp') /><span class='ace-lbl'></span>",
        width:30,
        template:"<input id='gridBGP_#: id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btndelbgp'); /><span class='ace-lbl'></span>"
    },
    {
        field:"ip",
        title:"IP Address"
    },
    {
        field:"role",
        title:"Type"
    },
    {
        field:"vendor",
        title:"Vendor"
    },
    {
        field:"name",
        title:"HostName"
    },
    {
    	field:"",
    	menu: false,
        attributes: {
            "class": "table-cell"
        },
        width: 30,
        template:'<div class="inline position-relative">' +
            '    <div class="dropdown-toggle" data-toggle="dropdown">' +
            '        <i class="icon-cog icon-only bigger-110"></i>' +
            '    </div>' +
            '    <ul class="dropdown-menu dropdown-icon-only dropdown-light pull-right dropdown-caret dropdown-close">' +
            '        <li>' +
            '            <a onclick="onActionChange(\'edit-control\');" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
            '                <i class="icon-edit"></i> &nbsp; Edit' +
            '            </a>' +
            '        </li>' +
            '    </ul>' +
            '</div>'
    }
];    
    $("#bgpavailablelist").kendoListView({
        dataSource:bgpavailabledata,
        template:kendo.template($("#bgppeertemplate").html()),
        selectable:"multiple row"
    });
    bgpavailablelist = $("#bgpavailablelist");
    $("#bgpselectlist").kendoListView({
        dataSource:bgpselectdata,
        template:kendo.template($("#bgppeertemplate").html()),
        selectable:"multiple row"
    });

    $('#gridBGP').contrailKendoGrid({
        dataSource:bgpData,
        scrollable:false,
        pageable:false,
        selectable:true,
        sortable: false,
        change:onChange,
        columns:bgpColumnDisplay,
        detailTemplate:kendo.template($("#gridBGPDetailTemplate").html()),
        searchToolbar: true,
        showSearchbox: true,
        searchPlaceholder: 'Search BGP Peers',
        widgetGridTitle: '',
        collapseable: false
    });

    bgpGrid = $('#gridBGP');
    bgpGridData = bgpGrid.data("kendoGrid");

    bgpwindow = $("#bgpwindow");
    bgpwindow.on("hide", clearBgpWindow);
    bgpwindow.modal({backdrop:'static', keyboard: 'false', show:false});

    gasnwindow = $("#gasnwindow");
    gasnwindow.modal({backdrop:'static', keyboard: 'false', show:false});

    $('body').append($("#confirmMainRemove"));
    confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.modal({backdrop:'static', keyboard: false, show:false});

    $("#btneditgasn").click(function (a) {
        openGasnWindow();
    });

    $("#btnaddbgp").click(function (a) {
        var list = bgpavailablelist.data("kendoListView");
        list.dataSource.data(bgpavailabledata);
        mode = "add";
        bgpwindow.modal('show');
        bgpwindow.find('.modal-body').scrollTop(0);
        bgpwindow.find('h6').text("Create BGP Peer");
        $("#txtasn").val(ggasn);
        $("#txtport").val("179");
        $("#chkextern").click();
    });

    $("#btndelbgp").click(function (a) {
        confirmMainRemove.find('.modal-header-title').text("Confirm");
        confirmMainRemove.modal('show');
    });

    $("#btnCnfRemoveMainPopupCancel").click(function (a) {
        confirmMainRemove.modal('hide')
    });

    $("#btnCnfRemoveMainPopupOK").click(function (a) {
        var selected_rows = getCheckedRows("gridBGP");
        deleteBgp(selected_rows);
        confirmMainRemove.modal('hide');
    });
    
    $("#btnbgpcancel").click(function (a) {
        bgpwindow.modal('hide')
    });
    $("#btnbgpok").click(function (a) {
        if (validate()) {
            bgp_params = getBGPJson();
            var params;
            if (window.JSON) {
                params = {"content":bgp_params}
                params = JSON.stringify(params);
            }
            else {
                params = {"content":bgp_params}
                params = $.toJSON(params);
            }

            //showMessageDialog();
            if (mode == "add") {
            	bgpwindow.modal('hide');
                $.ajax({
                    type:"POST",
                    url:"/api/admin/bgp-router",
                    data:params,
                    contentType:"application/json; charset=utf-8",
                    headers:{'X-Tenant-Name':'default-project'},
                    dataType:"json"
                }).success(function (msg) {
                        guuid = "";
                        ghref = "";
                        _gid_perms = [];
                        mode = "add";
                        bgpData = [];
                        bgp_details_data = [];
                        showGridLoading("#gridBGP");
                        //showSuccessMessage();
                        getNodes();
                        //var grid = bgpGrid.data("kendoGrid");
                        //grid.dataSource.read();
                    }).fail(function (msg) {
                    	showGridLoading("#gridBGP");
                    	//closeMessageDialog(0);
                        showInfoWindow("Error in submitting data", "Error");
                        selectedName = "";
                        mode = "";
                        getNodes();
                    });
            }
            else if (mode == "edit") {
                selectedName = $("#txtname").val().trim();
                bgpwindow.modal('hide');
                $.ajax({
                    type:"PUT",
                    url:"/api/admin/bgp-router/" + bgp_params["bgp-router"].uuid,
                    data:params,
                    contentType:"application/json; charset=utf-8",
                    dataType:"json"
                }).success(function (msg) {
                        guuid = "";
                        ghref = "";
                        _gid_perms = [];
                        showGridLoading("#gridBGP");
                        //showSuccessMessage();
                        mode = "edit";
                        bgpData = [];
                        bgp_details_data = [];
                        getNodes();
                        //var grid = bgpGrid.data("kendoGrid");
                        //grid.dataSource.read();

                    }).fail(function (msg) {
                    	showGridLoading("#gridBGP");
                    	//closeMessageDialog(0);
                        showInfoWindow("Error in submitting data", "Error");
                        selectedName = "";
                        mode = "";
                        getNodes();
                    });
            }
        }
    });
    getNodes();
}

function initGridBGPDetail(e) {
    var detailRow = e.detailRow;
}

function copyToRouterID() {
    $("#txtrid").val($("#txtaddr").val());
}
function selectJnpr() {
    //chkjnpr clicked.
    $("#txtasn").hide();
    $('#lblasn').hide();
    $("#txtasn").val(ggasn);
    $("#vendor-n-family").hide();
    $("#peers").hide();
    populateMultiselect("chkjnpr");
}
function populateMultiselect(who) {
    var jnprs = [];
    var externs = [];
    if (isSet(globalData) && globalData.length > 0) {
        for (var i = 0; i < globalData.length; i++) {
            if (isJuniperControlNode(globalData[i].vendor)) {
                if (mode == "edit" &&
                    $("#txtname").val() != globalData[i].name)
                    jnprs.push({"bgppeer":globalData[i].name});
                else if (mode == "add")
                    jnprs.push({"bgppeer":globalData[i].name});
            }
            else {
                if (who == "chkjnpr") {
                    if (mode == "edit" &&
                        $("#txtname").val() != globalData[i].name)
                        externs.push({"bgppeer":globalData[i].name});
                    else if (mode == "add")
                        externs.push({"bgppeer":globalData[i].name});
                }
            }
        }
    }
    var bgpavailablelist = $("#bgpavailablelist").data("kendoListView");
    var bgpselectlist = $("#bgpselectlist").data("kendoListView");
    if (who == "chkjnpr") {
        bgpselectlist.dataSource.data(jnprs);
        bgpavailablelist.dataSource.data(externs);
    } else if (who == "chkexternal") {
        if (isGlobalASN()) {
            bgpselectlist.dataSource.data(jnprs);
            bgpavailablelist.dataSource.data([]);
        } else {
            bgpselectlist.dataSource.data([]);
            bgpavailablelist.dataSource.data(jnprs);
        }
    }
}

function selectExternal() {
    //chkexternal clicked.
    $("#txtasn").show();
    $('#lblasn').show();
    $("#vendor-n-family").show();
    $("#peers").show();
    populateMultiselect("chkexternal");
}

function closeGasnWindow() {
    $("#txtgasn").val("");
    $("#txtgasn")[0].disabled = false;
    gasnwindow.modal('hide');
}

function openGasnWindow() {
    $("#txtgasn").val(ggasn);
    gasnwindow.modal('show');
}

function validateGasn() {
    var gasn = $("#txtgasn").val().trim();
    if ("" == gasn) {
        showInfoWindow("Enter Global ASN between 1 - 65534", "Invalid input");
        return false;
    }
    try {
        if (isNumber(gasn)) {
            gasn = parseInt(gasn);
            if (gasn < 1 || gasn > 65534 || isNaN(gasn)) {
                showInfoWindow("Enter valid BGP ASN number between 1-65534", "Invalid input");
                return false;
            }
        }
        else {
            showInfoWindow("Enter valid BGP ASN number between 1-65534", "Invalid input");
            return false;
        }
    } catch (e) {
        showInfoWindow("Enter valid BGP ASN number between 1-65534", "Invalid input");
        return false;
    }
    return true;
}

function getGasnJSON() {
    var gasn_params = {};
    var gasn = $("#txtgasn").val().trim();
    ggasn = gasn;
    gasn_params = {
        "global-system-config":{
            "_type":ggasnObj._type,
            "uuid":ggasnObj.uuid,
            "autonomous_system":parseInt(gasn)
        }
    };
    return gasn_params;
}

function gasnSuccess(res) {
    $("#btneditgasn").val("Global ASN - " + ggasn);
    closeGasnWindow();
    //showSuccessMessage();
    showGridLoading("#gridBGP");
    getNodes();
}

function gasnFailure() {
    //closeMessageDialog(0);
    showGridLoading("#gridBGP");
    ggasn = ggasnObj["global-system-config"]["autonomous_system"];
    showInfoWindow("Error in submitting data", "Error");
}

function submitGasn() {
    if (validateGasn() === false)
        return false;
    var gasn_params = getGasnJSON();
    gasn_params = JSON.stringify(gasn_params);
    //showMessageDialog();
    doAjaxCall("/api/tenants/admin/config/global-asn",
        "PUT", gasn_params, "gasnSuccess", "gasnFailure");
}

function destroy() {
	var gridBGP = $("#gridBGP").data("kendoGrid");
	gridBGP.destroy();

    var gasnwindow = $("#gasnwindow");
	gasnwindow.remove();
	gasnwindow = $();

	var bgpwindow = $("#bgpwindow");
	bgpwindow.remove();
	bgpwindow = $();

	var confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.remove();
    confirmMainRemove = $();

    var gridBgpDetailTemplate = $("#gridBGPDetailTemplate");
    gridBgpDetailTemplate.remove();
    gridBgpDetailTemplate = $();

    var bgppeertemplate = $("#bgppeertemplate");
    bgppeertemplate.remove();
    bgppeertemplate = $();

    var bgpConfigTemplate = $("#bgp-config-template");
    bgpConfigTemplate.remove();
    bgpConfigTemplate = $();
    
    var btndelbgp = $("#btndelbgp");
    btndelbgp.remove();
    btndelbgp = $();
    
    var btnaddbgp = $("#btnaddbgp");
    btnaddbgp.remove();
    btnaddbgp = $();
    
    var btneditgasn = $("#btneditgasn");
    btneditgasn.remove();
    btneditgasn = $();
}