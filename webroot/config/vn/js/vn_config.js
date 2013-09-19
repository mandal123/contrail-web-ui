/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

virtualnetworkConfigObj = new VirtualNetworkConfig();

function VirtualNetworkConfig() {
    //Variable definitions
    //Dropdowns
    var ddDomain, ddProject, ddIPOptions;

    //Comboboxes

    //Grids
    var gridVN, gridIPBlocks, gridRouteTargets, gridFipPools;

    //Buttons
    var btnCreateVN, btnDeleteVN, btnAddIPBlock, btnDeleteIPBlock,
        btnAddRouteTarget, btnDeleteRouteTarget, btnCreateVNCancel,
        btnCreateVNOK, btnAddFipPool, btnDeleteFipPool,
        btnRemovePopupOK, btnRemovePopupCancel,
        btnCnfRemoveMainPopupOK, btnCnfRemoveMainPopupCancel;

    //Textboxes
    var txtVNName, txtIPBlock, txtASN, txtRouteTarget, txtFipPoolName, txtGateway;

    //Multiselects
    var msNetworkPolicies, msFipProjects;

    //Datasources
    var dsGridVN;

    //Windows
    var windowCreateVN, confirmRemove, confirmMainRemove;

    //Misc
    var mode = "";

    //Method definitions
    this.load = load;
    this.init = init;
    this.initComponents = initComponents;
    this.initActions = initActions;
    this.fetchData = fetchData;
    this.fetchDataForGridVN = fetchDataForGridVN;
    this.populateDomains = populateDomains;
    this.handleDomains = handleDomains;
    this.populateProjects = populateProjects;
    this.handleProjects = handleProjects;
    this.showVNEditWindow = showVNEditWindow;
    this.closeCreateVNWindow = closeCreateVNWindow;
    this.autoPopulateGW = autoPopulateGW;
    this.deleteVN = deleteVN;
    this.successHandlerForGridVN = successHandlerForGridVN;
    this.failureHandlerForGridVN = failureHandlerForGridVN;
    this.createVNSuccessCb = createVNSuccessCb;
    this.createVNFailureCb = createVNFailureCb;
    this.validate = validate;
    this.destroy = destroy;
}

function load() {
    var configTemplate = kendo.template($("#vn-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    currTab = 'config_networking_vn';
    init();
}

function init() {
    this.initComponents();
    this.initActions();
    this.fetchData();
}

function fetchData() {
    fetchDomains("populateDomains");
}

function initComponents() {
    btnAddFipPool = $("#btnAddFipPool");
    btnDeleteFipPool = $("#btnDeleteFipPool");
    btnCreateVN = $("#btnCreateVN");
    btnDeleteVN = $("#btnDeleteVN");
    btnAddIPBlock = $("#btnAddIPBlock");
    btnDeleteIPBlock = $("#btnDeleteIPBlock");
    btnAddRouteTarget = $("#btnAddRouteTarget");
    btnDeleteRouteTarget = $("#btnDeleteRouteTarget");
    btnCreateVNCancel = $("#btnCreateVNCancel");
    btnCreateVNOK = $("#btnCreateVNOK");
    btnRemovePopupOK = $("#btnRemovePopupOK");
    btnRemovePopupCancel = $("#btnRemovePopupCancel");
    btnCnfRemoveMainPopupOK = $("#btnCnfRemoveMainPopupOK");
    btnCnfRemoveMainPopupCancel = $("#btnCnfRemoveMainPopupCancel");

    txtVNName = $("#txtVNName");
    txtFipPoolName = $("#txtFipPoolName");
    txtIPBlock = $("#txtIPBlock");
    txtGateway = $("#txtGateway");
    txtASN = $("#txtASN");
    txtRouteTarget = $("#txtRouteTarget");

    ddDomain = $("#ddDomain").kendoDropDownList({
        change:handleDomains
    });
    ddProject = $("#ddProject").kendoDropDownList({});
    ddIPOptions = $("#ddIPOptions").kendoDropDownList();

    msNetworkPolicies = $("#msNetworkPolicies").kendoMultiSelect();
    msFipProjects = $("#msFipProjects").kendoMultiSelect();

    dsGridVN = new kendo.data.DataSource({
        batch:true
    });

    gridVN = $("#gridVN").contrailKendoGrid({
        dataSource:dsGridVN,
        sortable: false,
        selectable: true,
        scrollable: false,
        pageable: false,
        change:this.gridVNRowChange,
        columns:[
            {
                field:"",
                menu: false,
                title:"<input id='cb_gridVN' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btnDeleteVN'); /><span class='ace-lbl'></span>",
                width:30,
                template:"<input id='gridVN_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btnDeleteVN'); /><span class='ace-lbl'></span>"
            },
            {
                field:"Network",
                title:"Network"
            },
            {
                field:"AttachedPolicies",
                title:"Attached Policies",
                template:' # if(typeof AttachedPolicies === "object") { # ' +
                    ' #     for(var i=0;i < AttachedPolicies.length,i<2;i++) { # ' +
                    ' #        if(typeof AttachedPolicies[i] !== "undefined") { # ' +
                    ' #:           AttachedPolicies[i] # ' +
                    '              <br> ' +
                    ' #        } #  ' +
                    ' #     } #  ' +
                    ' #     if(AttachedPolicies.length > 2) { # ' +
                    '           <span class="moredataText">( #: (AttachedPolicies.length-2) # more)</span> ' +
                    '           <span class="moredata" style="display:none;" > ' +
                    '           </span> ' +
                    ' #     } # ' +
                    ' # } # '
            },
            {
                field:"IPBlocks",
                title:"IP Blocks",
                template:' # if(typeof IPBlocks === "object") { # ' +
                    ' #     for(var i=0;i < IPBlocks.length,i<2;i++) { # ' +
                    ' #        if(typeof IPBlocks[i] !== "undefined") { # ' +
                    ' #:           IPBlocks[i] # ' +
                    '              <br> ' +
                    ' #        } #  ' +
                    ' #     } #  ' +
                    ' #     if(IPBlocks.length > 2) { # ' +
                    '           <span class="moredataText">( #: (IPBlocks.length-2) # more)</span> ' +
                    '           <span class="moredata" style="display:none;" > ' +
                    '           </span> ' +
                    ' #     } # ' +
                    ' # } # '
            },
            {
                field:"NetworkUUID",
                hidden:true
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
                    '            <a onclick="showVNEditWindow(\'edit\');" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
                    '                <i class="icon-edit"></i> &nbsp; Edit' +
                    '            </a>' +
                    '        </li>' +
                    '        <li>' +
                    '            <a onclick="showRemoveWindow();" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                    '                <i class="icon-trash"></i> &nbsp; Delete' +
                    '            </a>' +
                    '        </li>' +
                    '    </ul>' +
                    '</div>'
                 
            }
        ],
        detailTemplate:kendo.template($("#gridVNDetailTemplate").html()),
        detailInit:initGridVNDetail,
        searchToolbar: true,
        showSearchbox: true,
        searchPlaceholder: 'Search Networks',
        widgetGridTitle: '',
        collapseable: false
    });

    gridVN = $("#gridVN").data("kendoGrid");
    
    showGridLoading("#gridVN");
    
    gridIPBlocks = $('#gridIPBlocks').kendoGrid({
        width:170,
        height:100,
        selectable:true,
        columns:[
            { field:"IPAM", title:"IPAM" },
            { field:"IPBlock", title:"IP Block" },
            { field:"Gateway", title:"Gateway" }
        ]
    });
    gridIPBlocks = gridIPBlocks.data("kendoGrid");

    gridFipPools = $('#gridFipPools').kendoGrid({
        dataSource:{
            data:[],
            schema: {
            	model: {
            		fields: {
            			FIPPoolName: {editable: false},
            			FIPProjects: {editable: true}
            		}
            	}
            }
        },
        editable: {
        	confirmation: false
        },
        height:100,
        width:170,
        columns:[
            { field:"FIPPoolName", title:"Pool Name" },
            { field:"FIPProjects", title:"Projects", editor: msEditor, template: "#=FIPProjects.join()#" }
        ],
        selectable:true
    });
    gridFipPools = gridFipPools.data("kendoGrid");

    gridRouteTargets = $('#gridRouteTargets').kendoGrid({
        dataSource:{
            data:[]
        },
        height:100,
        width:170,
        columns:[
            { field:"RouteTarget", title:"Route Target" }
        ],
        selectable:true
    });
    gridRouteTargets = gridRouteTargets.data("kendoGrid");
    
    $('body').append($("#windowCreateVN"));
    windowCreateVN = $("#windowCreateVN");
    windowCreateVN.on("hide", closeCreateVNWindow);
    windowCreateVN.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmMainRemove"));
    confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmRemove"));
    confirmRemove = $("#confirmRemove");
    confirmRemove.modal({backdrop:'static', keyboard: false, show:false});
}

function msEditor(container, options) {
	$("<select class='span5 pull-left' data-role='multiselect'" +
		" multiple='multiple' data-placeholder='Select Projects...'" +
		" data-bind='value:" + options.field + "' data-value-field='" +
		options.field + "'></select>")
    .appendTo(container)
    .kendoMultiSelect({
        dataSource: {
            data: msFipProjects.data("kendoMultiSelect").dataSource.data()
        }
    });
}

function deleteVN(selected_rows) {
	//showMessageDialog();
	btnDeleteVN.attr("disabled","disabled");
    var deleteAjaxs = [];
    if (selected_rows && selected_rows.length > 0) {
        for (var i = 0; i < selected_rows.length; i++) {
        	var selected_row_data = selected_rows[i];
            deleteAjaxs[i] = $.ajax({
                url:"/api/tenants/config/virtual-network/" + selected_row_data["NetworkUUID"],
                type:"DELETE"
            });
        }
        $.when.apply($, deleteAjaxs).then(
            function () {
                //all success
                var results = arguments;
                //showSuccessMessage();
                fetchDataForGridVN();
            },
            function () {
                //If atleast one api fails
                var results = arguments;
                //closeMessageDialog(0);
                showInfoWindow(results[0].responseText, results[0].statusText);
                fetchDataForGridVN();
            });
    }
}

function initActions() {
    btnCreateVN.click(function (e) {
        e.preventDefault();
        showVNEditWindow("add");
        return false;
    });

    btnDeleteVN.click(function (a) {
        confirmMainRemove.find('.modal-header-title').text("Confirm");
        confirmMainRemove.modal('show');
    });

    btnRemovePopupCancel.click(function (a) {
        confirmRemove.modal('hide');
    });

    btnCnfRemoveMainPopupCancel.click(function (a) {
        confirmMainRemove.modal('hide');
    });

    btnRemovePopupOK.click(function (a) {
    	var selected_row = gridVN.dataItem(gridVN.select());
    	deleteVN([selected_row]);
        confirmRemove.modal('hide');
    });

    btnCnfRemoveMainPopupOK.click(function (a) {
        var selected_rows = getCheckedRows("gridVN");
        deleteVN(selected_rows);
        confirmMainRemove.modal('hide');
    });
    
    btnAddIPBlock.click(function (a) {
    	if($(this).hasClass("k-state-disabled"))
    		return;
        var ipblock = txtIPBlock.val();
        var ipam = $(ddIPOptions).val();
        var gateway = txtGateway.val();
        
        if ("" === ipblock.trim() || !validip(ipblock.trim())) {
            showInfoWindow("Enter a valid IP address in xxx.xxx.xxx.xxx/xx format", "Invalid input");
            return false;
        }
        if(ipblock.split("/").length != 2) {
            showInfoWindow("Enter a valid IP address in xxx.xxx.xxx.xxx/xx format", "Invalid input");
            return false;
        }
        var subnetMask = parseInt(ipblock.split("/")[1]); 
        if(subnetMask > 30) {
            showInfoWindow("Subnet mask can not be greater than 30", "Invalid input");
            return false;
        }

        if (validip(gateway.trim())) {
            if(gateway.split("/").length >= 2) {
                showInfoWindow("Enter a valid Gateway IP address in xxx.xxx.xxx.xxx format", "Invalid input");
                return false;
            }
        } else {
        	if("" !== gateway.trim()) {
                showInfoWindow("Enter a valid Gateway IP address in xxx.xxx.xxx.xxx format", "Invalid input");
                return false;
        	}
        }

        var existing = gridIPBlocks.dataSource.data();
        var ipamFound = false;
        if (existing.length > 0) {
            for (var i = 0; i < existing.length; i++) {
                var row = existing[i];
                if (row.IPAM === ipam) {
                    ipamFound = true;
                    existing.splice(i + 1, 0, {"IPBlock":ipblock, "IPAM":"", "Gateway":gateway});
                    break;
                }
            }
            if (ipamFound !== true) {
                existing.push({"IPBlock":ipblock, "IPAM":ipam, "Gateway":gateway});
            }
        } else {
            existing.push({"IPBlock":ipblock, "IPAM":ipam, "Gateway":gateway});
        }

        gridIPBlocks.dataSource.data(existing);
        gridIPBlocks.refresh();
        txtIPBlock.val("");
        txtGateway.val("");
    });

    btnDeleteIPBlock.click(function (a) {
    	if($(this).hasClass("k-state-disabled"))
    		return;
        var selected_rows = gridIPBlocks.select();
        if (selected_rows && selected_rows.length > 0) {
        	for (var i = 0; i < selected_rows.length; i++) {
        		if(null !== gridIPBlocks.dataItem($($(selected_rows[i]).next())) &&
        		typeof gridIPBlocks.dataItem($($(selected_rows[i]).next())) !== "undefined" &&
        		"" === gridIPBlocks.dataItem($($(selected_rows[i]).next())).IPAM)
        			gridIPBlocks.dataItem($($(selected_rows[i]).next())).IPAM = 
        				gridIPBlocks.dataItem(selected_rows[i]).IPAM;
        		gridIPBlocks.removeRow(selected_rows[i]);
        	}
        }
    });

    btnAddFipPool.click(function (a) {
        var poolName = txtFipPoolName.val();
        if (typeof poolName === "undefined" || poolName === "") {
            showInfoWindow("Enter Pool name", "Input required");
            return false;
        }

        var projects = msFipProjects.data("kendoMultiSelect").value();
        if (null === projects || typeof projects === "undefined") {
            projects = [];
        }
        var existing = gridFipPools.dataSource.data();
        existing.push({"FIPPoolName":poolName, "FIPProjects":projects});
        gridFipPools.dataSource.data(existing);
        txtFipPoolName.val("");
        msFipProjects.data("kendoMultiSelect").value("");
    });

    btnDeleteFipPool.click(function (a) {
        var selected_rows = gridFipPools.select();
        if (selected_rows && selected_rows.length > 0) {
        	for (var i = 0; i < selected_rows.length; i++) {
        		gridFipPools.removeRow(selected_rows[i]);
        	}
        }
    });

    btnAddRouteTarget.click(function (a) {
        var asn = txtASN.val();
        var rt = txtRouteTarget.val();
        if (typeof asn === "undefined" || asn === "" || !isNumber(asn)) {
            showInfoWindow("Enter ASN between 1 to 65534", "Input required");
            return false;
        } else if (isNumber(asn)) {
            asn = parseInt(asn);
            if (asn < 1 || asn > 65534) {
                showInfoWindow("Enter ASN between 1 to 65534", "Input required");
                return false;
            }
        }
        if (typeof rt === "undefined" || rt === "" || !isNumber(rt)) {
            showInfoWindow("Enter ASN between 0 to 4294967295", "Input required");
            return false;
        } else if (isNumber(rt)) {
            rt = parseInt(rt);
            if (rt < 0 || rt > 4294967295) {
                showInfoWindow("Enter ASN between 0 to 4294967295", "Input required");
                return false;
            }
        }

        var existing = gridRouteTargets.dataSource.data();
        existing.push({"RouteTarget":asn + ":" + rt});
        gridRouteTargets.dataSource.data(existing);
        txtASN.val("");
        txtRouteTarget.val("");
    });

    btnDeleteRouteTarget.click(function (a) {
        var selected_rows = gridRouteTargets.select();
        if (selected_rows && selected_rows.length > 0) {
        	for (var i = 0; i < selected_rows.length; i++) {
        		gridRouteTargets.removeRow(selected_rows[i]);
        	}
        }
    });

    btnCreateVNCancel.click(function (a) {
        windowCreateVN.hide();
    });

    btnCreateVNOK.click(function (a) {
        if (validate() !== true)
            return;

        var selectedDomain = $(ddDomain).val();
        var selectedProject = $(ddProject).val();
        if(!isValidDomainAndProject(selectedDomain, selectedProject)) {
        	showGridMessage("#gridVN", "Error in getting data.");
        	return;
        }
        	
        var vnConfig = {};
        vnConfig["virtual-network"] = {};
        vnConfig["virtual-network"]["parent_type"] = "project";

        vnConfig["virtual-network"]["fq_name"] = [];
        vnConfig["virtual-network"]["fq_name"][0] = selectedDomain;
        vnConfig["virtual-network"]["fq_name"][1] = selectedProject;
        vnConfig["virtual-network"]["fq_name"][2] = txtVNName.val();

        var policies = msNetworkPolicies.data("kendoMultiSelect").value();
        if (policies && policies.length > 0) {
            vnConfig["virtual-network"]["network_policy_refs"] = [];
            for (var i = 0; i < policies.length; i++) {
                vnConfig["virtual-network"]["network_policy_refs"][i] = {};
                vnConfig["virtual-network"]["network_policy_refs"][i]["attr"] = {};
                vnConfig["virtual-network"]["network_policy_refs"][i]["to"] = [];
                vnConfig["virtual-network"]["network_policy_refs"][i]["to"][0] = selectedDomain;
                vnConfig["virtual-network"]["network_policy_refs"][i]["to"][1] = selectedProject;
                vnConfig["virtual-network"]["network_policy_refs"][i]["to"][2] = policies[i];
            }
        }

        var mgmtOptions = gridIPBlocks.dataSource.data();
        if (mgmtOptions && mgmtOptions.length > 0) {
            vnConfig["virtual-network"]["network_ipam_refs"] = [];
            var ipamIndex = 0;
            for (var i = 0; i < mgmtOptions.length; i++) {
                var ipBlock = mgmtOptions[i].IPBlock;
                var ipam = mgmtOptions[i].IPAM;
                var gateway = mgmtOptions[i].Gateway;
                if (ipam !== "") {
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex] = {};
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["to"] = [];
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["to"][0] = selectedDomain;
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["to"][1] = selectedProject;
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["to"][2] = ipam;
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"] = {};
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"] = [];
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][0] = {};
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][0]["subnet"] = {};
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][0]["subnet"]["ip_prefix"] = ipBlock.split("/")[0];
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][0]["subnet"]["ip_prefix_len"] = parseInt(ipBlock.split("/")[1]);
                    vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][0]["default_gateway"] = gateway;
                }

                for (var j = i + 1; typeof mgmtOptions[j] !== "undefined"; j++) {
                    var newIpam = mgmtOptions[j].IPAM;
                    var newIpBlock = mgmtOptions[j].IPBlock;
                    var gateway = mgmtOptions[j].Gateway;
                    if (newIpam == "") {
                        i++;
                        var subnetLen = vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"].length;
                        vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][subnetLen] = {};
                        vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"] = {};
                        vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"]["ip_prefix"] = newIpBlock.split("/")[0];
                        if (null !== newIpBlock.split("/")[1] && "" !== newIpBlock.split("/")[1].trim() && isNumber(parseInt(newIpBlock.split("/")[1])))
                            vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"]["ip_prefix_len"]
                                = parseInt(newIpBlock.split("/")[1]);
                        else
                            vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"]["ip_prefix_len"] = 32;
                        vnConfig["virtual-network"]["network_ipam_refs"][ipamIndex]["attr"]["ipam_subnets"][subnetLen]["default_gateway"] = gateway;
                    } else {
                        break;
                    }
                }
                ipamIndex++;
            }
        }

        var floatingIpPools = gridFipPools.dataSource.data();
        if (floatingIpPools && floatingIpPools.length > 0) {
            vnConfig["virtual-network"]["floating_ip_pools"] = [];
            for (var i = 0; i < floatingIpPools.length; i++) {
                var fipPoolName = floatingIpPools[i].FIPPoolName;
                vnConfig["virtual-network"]["floating_ip_pools"][i] = {};
                vnConfig["virtual-network"]["floating_ip_pools"][i]["to"] = [];
                vnConfig["virtual-network"]["floating_ip_pools"][i]["to"][0] = selectedDomain;
                vnConfig["virtual-network"]["floating_ip_pools"][i]["to"][1] = selectedProject;
                vnConfig["virtual-network"]["floating_ip_pools"][i]["to"][2] = txtVNName.val();
                vnConfig["virtual-network"]["floating_ip_pools"][i]["to"][3] = fipPoolName;

                var projects = floatingIpPools[i].FIPProjects;
                if (projects && projects.length > 0) {
                	vnConfig["virtual-network"]["floating_ip_pools"][i]["projects"] = [];
                	for (var j = 0; j < projects.length; j++) {
                		vnConfig["virtual-network"]["floating_ip_pools"][i]["projects"][j] = {};
                		vnConfig["virtual-network"]["floating_ip_pools"][i]["projects"][j]["to"] = [];
                		vnConfig["virtual-network"]["floating_ip_pools"][i]["projects"][j]["to"][0] = selectedDomain;
                		vnConfig["virtual-network"]["floating_ip_pools"][i]["projects"][j]["to"][1] = projects[j];
                		var projectUUId = jsonPath(configObj, "$.projects[?(@.fq_name[1]=='" + projects[j] + "')]")[0].uuid;
                		vnConfig["virtual-network"]["floating_ip_pools"][i]["projects"][j]["uuid"] = projectUUId;
                	}
                }
            }
        }

        var routeTargets = gridRouteTargets.dataSource.data();
        if (routeTargets && routeTargets.length > 0) {
            vnConfig["virtual-network"]["route_target_list"] = {};
            vnConfig["virtual-network"]["route_target_list"]["route_target"] = [];
            for (var i = 0; i < routeTargets.length; i++) {
                var routeTarget = routeTargets[i].RouteTarget;
                routeTarget = "target:" + routeTarget;
                vnConfig["virtual-network"]["route_target_list"]["route_target"][i] = routeTarget;
            }
        }

        //console.log(vnConfig);
        if (txtVNName[0].disabled == true)
            mode = "edit";
        else
            mode = "add";

        if (mode === "add") {
            doAjaxCall("/api/tenants/config/virtual-networks", "POST", JSON.stringify(vnConfig),
                "createVNSuccessCb", "createVNFailureCb");
        }
        else if (mode === "edit") {
            var vnUUID = jsonPath(configObj, "$.virtual-networks[?(@.fq_name[2]=='" + txtVNName.val() + "')]")[0].uuid;
            doAjaxCall("/api/tenants/config/virtual-network/" + vnUUID, "PUT", JSON.stringify(vnConfig),
                "createVNSuccessCb", "createVNFailureCb", null, null, 120000);
        }
        windowCreateVN.modal("hide");
        //showMessageDialog();
    });
}

function populateDomains(result) {
    if (result && result.domains && result.domains.length > 0) {
        var domains = jsonPath(result, "$.domains[*].fq_name[0]");
        ddDomain.data("kendoDropDownList").dataSource.data(domains);
    }
    fetchProjects("populateProjects");
}

function handleDomains() {
    fetchDataForGridVN();
}

function populateProjects(result) {
    if (result && result.projects && result.projects.length > 0) {
        var projects = jsonPath(result, "$.projects[*].fq_name[1]");
        $("#ddProject").kendoDropDownList({
            dataSource:projects,
            change:handleProjects
        });
        var sel_project = getSelectedProject();
        $("#ddProject").data("kendoDropDownList").value(sel_project);
        msFipProjects.data("kendoMultiSelect").dataSource.data(projects);
    }
    fetchDataForGridVN();
}

function handleProjects(e) {
    var pname = e.sender._current.text();
    setCookie("project", pname);
    fetchDataForGridVN();
}

function autoPopulateGW(e) {
	var ip = $("#txtIPBlock").val();
	if(ip.indexOf("/") !== -1) {
		try {
			var ip_arrs = ip_range(ip, []);
			var default_gw = ip_arrs[ip_arrs.length - 1];
			$("#txtGateway").val(default_gw);
		} catch (e) {
			$("#txtGateway").val("");
		}
	}
}

function fetchDataForGridVN() {
    $("#cb_gridVN").attr("checked", false);
    var selectedDomain = $(ddDomain).val();
    var selectedProject = $(ddProject).val();
    if(!isValidDomainAndProject(selectedDomain, selectedProject)) {
    	showGridMessage("#gridVN", "Error in getting data.");
    	return;
    }
    	
    showGridLoading("#gridVN");
    doAjaxCall(
        "/api/tenants/config/virtual-networks?tenant_id=" +
            selectedDomain + ":" + selectedProject, "GET",
        null, "successHandlerForGridVN", "failureHandlerForGridVN", null, null
    );
}

function successHandlerForGridVN(result) {
    var uuids = jsonPath(result, "$..uuid");
    var getAjaxs = [];
    for (var i = 0; i < uuids.length; i++) {
        getAjaxs[i] = $.ajax({
            url:"/api/tenants/config/virtual-network/" + uuids[i],
            type:"GET"
        });
    }
    $.when.apply($, getAjaxs).then(
        function () {
            //all success
            var results = arguments;
            successHandlerForGridVNRow(results);
        },
        function () {
            //If atleast one api fails
            var results = arguments;
            failureHandlerForGridVNRow(results);
        });
}

function failureHandlerForGridVN(result) {
    showGridMessage("#gridVN", "Error in getting data.");
}

function showRemoveWindow() {
    confirmRemove.find('.modal-header-title').text("Remove");
    confirmRemove.modal('show');
}

function successHandlerForGridVNRow(result) {
    var vnData = [];
    var idCount = 0;
    var networks = jsonPath(result, "$..virtual-network");
    configObj["virtual-networks"] = [];
    for (var i = 0; i < networks.length; i++) {
        configObj["virtual-networks"][i] = networks[i];
        var vn = networks[i];
        var vnName = jsonPath(vn, "$.fq_name[2]");

        if (typeof vnName === "object" && vnName.length === 1)
            vnName = vnName[0];
        else
            vnName = "";

        var uuid = jsonPath(vn, "$.uuid");
        if (typeof uuid === "object" && uuid.length === 1)
            uuid = uuid[0];

        var policies = jsonPath(vn, "$.network_policy_refs[*].to[2]");
        if (policies === false) {
            policies = "";
        }

        var subnets = jsonPath(vn, "$.network_ipam_refs[*].subnet.ipam_subnet");
        if (subnets === false) {
            subnets = "";
        }

        var ipams = jsonPath(vn, "$.network_ipam_refs[*].subnet.ipam[2]");
        if (ipams === false) {
            ipams = "";
        }
        
        var gateways = jsonPath(vn, "$.network_ipam_refs[*].subnet.default_gateway");
        if (gateways === false) {
        	gateways = "";
        }
        
        var fips = jsonPath(vn, "$.floating_ip_pools[*].to[3]");
        if (fips === false) {
            fips = "";
        }
        var fipoolProjects = jsonPath(vn, "$.floating_ip_pools[*]");
        if (fipoolProjects === false) {
        	fipoolProjects = "";
        }

        var routeTargets = jsonPath(vn, "$.route_target_list.route_target[*]");
        if (routeTargets === false) {
            routeTargets = "";
        }
        vnData.push({"Id":idCount++, "Network":vnName, "AttachedPolicies":policies, "IPBlocks":subnets, "Ipams":ipams, "Gateways": gateways, "FloatingIPs":fips, "FloatingIPPools":fipoolProjects, "RouteTargets":routeTargets, NetworkUUID:uuid});
    }
    dsGridVN.data(vnData);
    check4GridEmpty('#gridVN', 'No Networks found.');
}

function failureHandlerForGridVNRow(result, cbParam) {
    showGridMessage("#gridVN", "Error in getting data.");
}

function initGridVNDetail(e) {
    var detailRow = e.detailRow;
}

function closeCreateVNWindow() {
    clearValuesFromDomElements();
}

function clearValuesFromDomElements() {
    mode = "";
    txtVNName.val("");
    txtVNName[0].disabled = false;
    txtIPBlock.val("");
    txtGateway.val("");
    txtASN.val("");
    txtRouteTarget.val("");
    txtFipPoolName.val("");

    $("#ddIPOptions").data("kendoDropDownList").dataSource.data({});
    $("#ddIPOptions").data("kendoDropDownList").text("");
    $("#ddIPOptions").data("kendoDropDownList").value("");
        
    msFipProjects.data("kendoMultiSelect").value("");
    msNetworkPolicies.data("kendoMultiSelect").value("");

    gridIPBlocks.dataSource.data([]);
    gridFipPools.dataSource.data([]);
    gridRouteTargets.dataSource.data([]);
}

function showVNEditWindow(mode) {
    var selectedDomain = $(ddDomain).val();
    var selectedProject = $(ddProject).val();
    if(!isValidDomainAndProject(selectedDomain, selectedProject)) {
    	return;
    }

    var getAjaxs = [];
    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/policys?tenant_id=" + selectedDomain + ":" + selectedProject,
        type:"GET"
    });

    getAjaxs[1] = $.ajax({
        url:"/api/tenants/config/ipams?tenant_id=" + selectedDomain + ":" + selectedProject,
        type:"GET"
    });
    $.when.apply($, getAjaxs).then(
        function () {
            //all success
            clearValuesFromDomElements();
            var results = arguments;
            var networkPolicies = jsonPath(results[0][0], "$.network-policys[*].fq_name[2]");
            msNetworkPolicies.data("kendoMultiSelect").dataSource.data(networkPolicies);
            var networkIpams = jsonPath(results[1][0], "$.network-ipams[*].fq_name[2]");
            if(networkIpams && networkIpams.length > 0) {
            	ddIPOptions.data("kendoDropDownList").dataSource.data(networkIpams);
            }
            else {
            	ddIPOptions.data("kendoDropDownList").enable(false);
            	txtIPBlock.attr("disabled","disabled");
            	txtGateway.attr("disabled","disabled");
            	btnAddIPBlock.addClass("k-state-disabled");
            	btnDeleteIPBlock.addClass("k-state-disabled");
            }

            if (mode === "add") {
                windowCreateVN.find('h6').text('Create Network');
            } else if (mode === "edit") {
                var selectedRow = gridVN.dataItem(gridVN.select());
                txtVNName.val(selectedRow.Network);
                txtVNName[0].disabled = true;
                windowCreateVN.find('h6').text('Edit Network ' + selectedRow.Network);
                var rowId = selectedRow["Id"];
                var selectedVN = configObj["virtual-networks"][rowId];

                var policies = jsonPath(selectedVN, "$.network_policy_refs[*].to[2]");
                if (policies && policies.length > 0)
                    msNetworkPolicies.data("kendoMultiSelect").value(policies);
                else
                    msNetworkPolicies.data("kendoMultiSelect").value("");

                var ipamNames = jsonPath(selectedVN, "$.network_ipam_refs[*].subnet.ipam[2]");
                var ipBlocks = jsonPath(selectedVN, "$.network_ipam_refs[*].subnet.ipam_subnet");
                var gateways = jsonPath(selectedVN, "$.network_ipam_refs[*].subnet.default_gateway");
                if (ipamNames && ipamNames.length > 0) {
                	var existing = [];
                	for (var i = 0; i < ipamNames.length; i++) {
                		var ipblock = ipBlocks[i];
                		var ipam = ipamNames[i];
                		var gateway = gateways[i];
                		existing = gridIPBlocks.dataSource.data();
                		var ipamFound = false;
                		if (existing.length > 0) {
                			for (var j = 0; j < existing.length; j++) {
                				var row = existing[j];
                				if (row.IPAM === ipam) {
                					ipamFound = true;
                					existing.splice(j + 1, 0, {"IPBlock":ipblock, "IPAM":"", "Gateway":gateway});
                					break;
                				}
                			}
                			if (ipamFound !== true) {
                				existing.push({"IPBlock":ipblock, "IPAM":ipam, "Gateway":gateway});
                			}
                		} else {
                			existing.push({"IPBlock":ipblock, "IPAM":ipam, "Gateway":gateway});
                		}
                	}
                	gridIPBlocks.dataSource.data(existing);
                	gridIPBlocks.refresh();
                }

                var poolNames = [];
                var floatingIPPools = jsonPath(selectedVN, "$.floating_ip_pools[*]");
                if (floatingIPPools && floatingIPPools.length > 0) {
                    var fipPools = [];
                    for (var i = 0; i < floatingIPPools.length; i++) {
                        var fipPool = floatingIPPools[i];
                        poolNames[i] = jsonPath(fipPool, "$.to[3]")[0];
                        var projects = jsonPath(fipPool, "$.projects[*].to[1]");
                        if (null === projects || typeof projects === "undefined" 
                        	|| projects == false) {
                            projects = [];
                        }
                        fipPools.push({"FIPPoolName":poolNames[i], "FIPProjects":projects});
                    }
                    gridFipPools.dataSource.data(fipPools);
                }

                var routeTargets = jsonPath(selectedVN, "$.route_target_list.route_target[*]");
                if (routeTargets && routeTargets.length > 0) {
                    var rts = [];
                    for (var i = 0; i < routeTargets.length; i++) {
                        routeTargets[i] = routeTargets[i].split("target:")[1];
                        rts.push({"RouteTarget":routeTargets[i]});
                    }
                    gridRouteTargets.dataSource.data(rts);
                }

            }
            $("#gridIPBlocks").data("kendoGrid").refresh();
            $("#gridFipPools").data("kendoGrid").refresh();
            $("#gridRouteTargets").data("kendoGrid").refresh();

        },
        function () {
            //If atleast one api fails
            var results = arguments;

        });
    windowCreateVN.modal("show");
    windowCreateVN.find('.modal-body').scrollTop(0);
}

function createVNSuccessCb() {
    //showSuccessMessage();
    showGridLoading("#gridVN");    
    fetchDataForGridVN();
}

function createVNFailureCb() {
    //closeMessageDialog(0);
    showGridLoading("#gridVN");
    fetchDataForGridVN();
}

function getAssignedProjectsForIpam(fips) {
    var aps = jsonPath(fips, "$.projects[*].to");
    var ap = [];
    if (isSet(aps) && aps !== false) {
        for (var i = 0; i < aps.length; i++) {
        	ap[i] = aps[i][0] + ":" + aps[i][1];
        }
    }
    if(ap.length > 0) {
    	return "(" + ap.toString() + ")";	
    }
    return "";
}

function validate() {
    var vnName = txtVNName.val().trim();
    if (typeof vnName === "undefined" || vnName === "") {
        showInfoWindow("Enter a valid network name", "Input required");
        return false;
    }
    /*var mgmtOptions = gridIPBlocks.dataSource.data();
    if (mgmtOptions && mgmtOptions.length <= 0) {
        showInfoWindow("Enter atleast one IPAM", "Input required");
        return false;
    }*/

    return true;
}

function destroy() {
    ddDomain = $("#ddDomain").data("kendoDropDownList");
    ddDomain.destroy();

    ddProject = $("#ddProject").data("kendoDropDownList");
    ddProject.destroy();

    ddIPOptions = $("#ddIPOptions").data("kendoDropDownList");
    ddIPOptions.destroy();

    msNetworkPolicies = $("#msNetworkPolicies").data("kendoMultiSelect");
    msNetworkPolicies.destroy();

    msFipProjects = $("#msFipProjects").data("kendoMultiSelect");
    msFipProjects.destroy();

    gridVN = $("#gridVN").data("kendoGrid");
    gridVN.destroy();

    gridFipPools = $("#gridFipPools").data("kendoGrid");
    gridFipPools.destroy();

    gridIPBlocks = $("#gridIPBlocks").data("kendoGrid");
    gridIPBlocks.destroy();

    gridRouteTargets = $("#gridRouteTargets").data("kendoGrid");
    gridRouteTargets.destroy();

    btnCreateVN.remove();
    btnCreateVN = $();

    btnDeleteVN.remove();
    btnDeleteVN = $();

    btnAddIPBlock.remove();
    btnAddIPBlock = $();

    btnDeleteIPBlock.remove();
    btnDeleteIPBlock = $();

    btnAddRouteTarget.remove();
    btnAddRouteTarget = $();

    btnDeleteRouteTarget.remove();
    btnDeleteRouteTarget = $();

    btnCreateVNCancel.remove();
    btnCreateVNCancel = $();

    btnCreateVNOK.remove();
    btnCreateVNOK = $();

    btnRemovePopupOK.remove();
    btnRemovePopupOK = $();

    btnRemovePopupCancel.remove();
    btnRemovePopupCancel = $();

    btnCnfRemoveMainPopupOK.remove();
    btnCnfRemoveMainPopupOK = $();

    btnCnfRemoveMainPopupCancel.remove();
    btnCnfRemoveMainPopupCancel = $();
    
    txtVNName.remove();
    txtVNName = $();

    txtIPBlock.remove();
    txtIPBlock = $();

    txtGateway.remove();
    txtGateway	 = $();

    txtASN.remove();
    txtASN = $();

    txtRouteTarget.remove();
    txtRouteTarget = $();

    windowCreateVN = $("#windowCreateVN");
    windowCreateVN.remove();
    windowCreateVN = $();

    confirmRemove = $("#confirmRemove");
    confirmRemove.remove();
    confirmRemove = $();

    confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.remove();
    confirmMainRemove = $();

    var gridVNDetailTemplate = $("#gridVNDetailTemplate");
    gridVNDetailTemplate.remove();
    gridVNDetailTemplate = $();

    var vnConfigTemplate = $("#vn-config-template");
    vnConfigTemplate.remove();
    vnConfigTemplate = $();

}