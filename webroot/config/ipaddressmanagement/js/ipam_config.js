/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

IPAddressManagementObj = new IPAMObjConfig();
function IPAMObjConfig() {
    //Variable definitions
    //Dropdowns
    var ddDomain, ddProject, ddDnsVirtual, ddDNS, ddNetworks;

    //TextBoxes
    var txtIPAMName, txtdnsTenant, txtDomainName, txtNTPServer, txtIPBlock, txtGateway;

    //Grids
    var gridipam, gridVnIpBlocks;

    //Buttons
    var btnCreateEditipam, btnDeleteIpam,
        btnCreateEditipamCancel, btnCreateEditipamOK,
        btnRemovePopupOK, btnRemovePopupCancel,
        btnCnfRemoveMainPopupOK, btnCnfRemoveMainPopupCancel,
        btnAddIPBlock, btnDeleteIPBlock;

    //Datasources
    var dsGridIPAM;

    //Windows
    var windowCreateipam, confirmRemove, confirmMainRemove;

    //Method definitions
    this.load                       = load;
    this.init                       = init;
    this.initComponents             = initComponents;
    this.initActions                = initActions;
    this.fetchData                  = fetchData;
    this.fetchDataForGridIPAM       = fetchDataForGridIPAM;
    this.populateDomains            = populateDomains;
    this.handleDomains              = handleDomains;
    this.populateProjects           = populateProjects;
    this.handleProjects             = handleProjects;
    this.deleteIPAM                 = deleteIPAM;
    this.closeCreateIPAMWindow      = closeCreateIPAMWindow;
    this.autoPopulateGW             = autoPopulateGW;
    this.ipamCreateEditWindow       = ipamCreateEditWindow;
    this.successHandlerForGridIPAM  = successHandlerForGridIPAM;
    this.failureHandlerForGridIPAM  = failureHandlerForGridIPAM;
    this.createIPAMSuccessCb        = createIPAMSuccessCb;
    this.createIPAMFailureCb        = createIPAMFailureCb;
    this.destroy                    = destroy;
}

function load() {
    var configTemplate = kendo.template($("#ipam-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    currTab = 'config_networking_ipam';
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
    btnCreateEditipam           = $("#btnCreateEditipam");
    btnDeleteIpam               = $("#btnDeleteIpam");
    btnCreateEditipamCancel     = $("#btnCreateEditipamCancel");
    btnCreateEditipamOK         = $("#btnCreateEditipamOK");
    btnRemovePopupOK            = $("#btnRemovePopupOK");
    btnRemovePopupCancel        = $("#btnRemovePopupCancel");
    btnCnfRemoveMainPopupOK     = $("#btnCnfRemoveMainPopupOK");
    btnCnfRemoveMainPopupCancel = $("#btnCnfRemoveMainPopupCancel");
    txtIPAMName                 = $("#txtIPAMName");
    txtdnsTenant                = $("#txtdnsTenant");
    txtDomainName               = $("#txtDomainName");
    txtNTPServer                = $("#txtNTPServer");
    btnAddIPBlock               = $("#btnAddIPBlock");
    btnDeleteIPBlock            = $("#btnDeleteIPBlock");
    txtIPBlock                  = $("#txtIPBlock");
    txtGateway                  = $("#txtGateway");

    ddDomain = $("#ddDomainSwitcher").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:handleDomains
    });
    ddProject = $("#ddProjectSwitcher").kendoDropDownList({});
    ddNetworks = $("#ddNetworks").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value"
        //change: loadGridIPBlock
    });
    ddDnsVirtual = $("#ddDnsVirtual").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
    });
    ddDNS = $("#ddDNS").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:checkVirtualNetwork
    });

    dsGridIPAM = new kendo.data.DataSource({
        batch:true
    });

    gridipam = $("#gridipam").contrailKendoGrid({
        dataSource  :dsGridIPAM,
        scrollable:false,
        sortable: false,
        pageable    :false,
        selectable  :true,
        searchToolbar: true,
    	searchPlaceholder: 'Search IPAMs',
	    widgetGridTitle: '',
   	    collapseable: false,
   	    showSearchbox: true,
  	    columnMenu: false,
        columns:[
            {
                field:"",
                menu: false,
                title:"<input id='cb_gridipam' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btnDeleteIpam'); /><span class='ace-lbl'></span>",
                width:30,
                template:"<input id='gridipam_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btnDeleteIpam'); /><span class='ace-lbl'></span>",
                searchable: false
            },
            {
                field:"ipam_name",
                title:"IPAM",
                searchable: true
            },
            {
                field:"ip_blocks",
                title:"IP Blocks",
                template:' # if(typeof ip_blocks === "object") { # ' +
                    ' #     if(ip_blocks.length > 0) { #' +
                    ' #     for(var i = 0;i < ip_blocks.length,i<2;i++) { # ' +
                    ' #        if(typeof ip_blocks[i] !== "undefined") { # ' +
                    ' #:           ip_blocks[i] #  ' +
                    ' #        } #  ' +
                    ' #     } #  ' +
                    ' #     if(ip_blocks.length > 2) { # ' +
                    '           <span class="moredataText">( #: (ip_blocks.length-2) # more)</span> ' +
                    '           <span class="moredata" style="display:none;" > ' +
                    '           </span> ' +
                    ' #     } # ' +
                    ' #   } else { # - # } # ' +
                    ' # } # ',
                searchable: true
            },
            {
                field:"uuid",
                title:"UUID",
                hidden:true,
                searchable: false
            },
            {
                field:"domain_Name",
                title:"Domain Name",
                hidden:true,
                searchable: true
            },
            {
                field:"dns",
                title:"DNS Server",
                searchable: true
            },
            {
                field:"ntp",
                title:"NTP Server",
                searchable: true
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
                    '            <a onclick="ipamCreateEditWindow(\'edit\');" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
                    '                <i class="icon-edit"></i> &nbsp; Edit' +
                    '            </a>' +
                    '        </li>' +
                    '        <li>' +
                    '            <a onclick="showRemoveWindow();" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                    '                <i class="icon-trash"></i> &nbsp; Delete' +
                    '            </a>' +
                    '        </li>' +
                    '    </ul>' +
                    '</div>',
                  searchable: false
            }
        ],
        detailTemplate:kendo.template($("#gridIpamDetailTemplate").html()),
        detailInit:initGridIpamDetail
    });

    gridipam = $("#gridipam").data("kendoGrid");
    showGridLoading("#gridipam");

    gridVnIpBlocks = $('#gridVnIpBlocks').kendoGrid({
        width:170,
        height:100,
        selectable:'multiple',
        columns:[
            { field:"Network", title:"Network" },
            { field:"IPBlock", title:"IP Block" },
            { field:"Gateway", title:"Gateway" }
        ]
    });
    
    $('body').append($("#windowCreateipam"));
    windowCreateipam = $("#windowCreateipam");
    windowCreateipam.on("hide", closeCreateIPAMWindow);
    windowCreateipam.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmMainRemove"));
    confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmRemove"));
    confirmRemove = $("#confirmRemove");
    confirmRemove.modal({backdrop:'static', keyboard: false, show:false});

    var dnspool = [
        {text:"Default", value:"default-dns-server"},
        {text:"Virtual DNS", value:"virtual-dns-server"},
        {text:"Tenant", value:"tenant-dns-server"},
        {text:"None", value:"none"}
    ];
    ddDNS.data("kendoDropDownList").dataSource.data(dnspool);
}

function initGridIpamDetail(e) {
    var detailRow = e.detailRow;
}

function initActions() {
    btnCreateEditipam.click(function (a) {
        ipamCreateEditWindow("add");
    });

    btnDeleteIpam.click(function (a) {
        confirmMainRemove.find('.modal-header-title').text("Confirm");
        confirmMainRemove.modal('show');
    });

    btnCreateEditipamCancel.click(function (a) {
        windowCreateipam.modal('hide');
    });

    btnRemovePopupCancel.click(function (a) {
        confirmRemove.modal('hide');
    });

    btnCnfRemoveMainPopupCancel.click(function (a) {
        confirmMainRemove.modal('hide')
    });

    btnRemovePopupOK.click(function (a) {
        //Delete inidvidual IPAM from action
        var selected_row = gridipam.dataItem(gridipam.select());
    	deleteIPAM([selected_row]);
    });

    btnCnfRemoveMainPopupOK.click(function (a) {
        //Delete IPAM from top delete button
        var selected_rows = getCheckedRows("gridipam");
        deleteIPAM(selected_rows);
 
    });

    btnCreateEditipamOK.click(function (a) {
        //showMessageDialog();
        var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
        var selectedDomain = selectedDomaindd.text();
        var selectedProjectdd = $("#ddProjectSwitcher").data("kendoDropDownList");
        var selectedProject = selectedProjectdd.text();
        if(!isValidDomainAndProject(selectedDomain, selectedProject))
        	return;
        var ipamName = $(txtIPAMName).val();
        var selectedvDNSdd = $("#ddDnsVirtual").data("kendoDropDownList");
        var selectedvDNStxt = selectedvDNSdd.text();
        var selectedvDNSuid = $("#ddDnsVirtual").val();
        var ntpIp = $(txtNTPServer).val();
        var dnsMethod = $(ddDNS).val();
        var dnsIP = $(txtdnsTenant).val();
        var dns_domain = $(txtDomainName).val();
        var selectedRow = gridipam.dataItem(gridipam.select());
        var mode = "";

        //alert("DNS Method " + dnsMethod);
        var ipam = {};
        var verify = validate();
        if (verify == true) {
            ipam["network-ipam"] = {};
            ipam["network-ipam"]["parent_type"] = "project";
            ipam["network-ipam"]["fq_name"] = [];
            ipam["network-ipam"]["fq_name"] = [selectedDomain, selectedProject, ipamName];
            ipam["network-ipam"]["network_ipam_mgmt"] = {};
            ipam["network-ipam"]["ipam_method"] = null;
            ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_method"] = dnsMethod;
            ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"] = {};
            ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"] = {};
            ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"]["virtual_dns_server_name"] = null;
            if (dnsMethod == "tenant-dns-server" || ntpIp.length || dns_domain.length) {
                ipam["network-ipam"]["network_ipam_mgmt"]["dhcp_option_list"] = {};
                ipam["network-ipam"]["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"] = [];
            }
            if (ntpIp.length) {
                ipam["network-ipam"]["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"].push(
                    {dhcp_option_name:"4", dhcp_option_value:ntpIp});
            }
            if (dns_domain.length) {
                ipam["network-ipam"]["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"].push(
                    {dhcp_option_name:"15", dhcp_option_value:dns_domain});
            }
            if (dnsMethod == "tenant-dns-server" && dnsIP.length) {
                //ipam["network-ipam"]["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"].push(
                //{dhcp_option_name : "6", dhcp_option_value: dnsIP});
                ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"]["ip_address"] = [];
                ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"]["ip_address"][0] = dnsIP;
                ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"]["virtual_dns_server_name"] = null;
            }

            ipam["network-ipam"]["virtual_DNS_refs"] = [];

            if (dnsMethod == "virtual-dns-server") {
                ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"] = {};
                ipam["network-ipam"]["network_ipam_mgmt"]["ipam_dns_server"]["virtual_dns_server_name"] = selectedvDNStxt;
                ipam["network-ipam"]["virtual_DNS_refs"][0] = {};
                var dnsFaqName = [];
                dnsFaqName = selectedvDNStxt.split(':');
                ipam["network-ipam"]["virtual_DNS_refs"][0] = {to:dnsFaqName,
                    uuid:selectedvDNSuid};
            }

            var mgmtOptions = $("#gridVnIpBlocks").data("kendoGrid").dataSource.data();
            if (mgmtOptions && mgmtOptions.length > 0) {
            	ipam["network-ipam"]["virtual_network_refs"] = [];
                var nwIndex = 0;
                for (var i = 0; i < mgmtOptions.length; i++) {
                    var ipBlock = mgmtOptions[i].IPBlock;
                    var nw = mgmtOptions[i].Network;
                    var gateway = mgmtOptions[i].Gateway;
                    if (nw !== "") {
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex] = {};
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["to"] = [];
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["to"][0] = selectedDomain;
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["to"][1] = selectedProject;
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["to"][2] = nw;
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["uuid"] = 
                        jsonPath($("#ddNetworks").data("kendoDropDownList").dataSource.data(), "$.[?(@.text=='" + nw + "')]")[0]["value"];
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"] = {};
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"] = [];
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][0] = {};
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][0]["subnet"] = {};
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][0]["subnet"]["ip_prefix"] = ipBlock.split("/")[0];
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][0]["subnet"]["ip_prefix_len"] = parseInt(ipBlock.split("/")[1]);
                        ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][0]["default_gateway"] = gateway;
                    }

                    for (var j = i + 1; typeof mgmtOptions[j] !== "undefined"; j++) {
                        var newNetwork = mgmtOptions[j].Network;
                        var newIpBlock = mgmtOptions[j].IPBlock;
                        if (newNetwork == "") {
                            i++;
                            var subnetLen = ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"].length;
                            ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][subnetLen] = {};
                            ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"] = {};
                            ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"]["ip_prefix"] = newIpBlock.split("/")[0];
                            if (null !== newIpBlock.split("/")[1] && "" !== newIpBlock.split("/")[1].trim() && isNumber(parseInt(newIpBlock.split("/")[1])))
                                ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"]["ip_prefix_len"]
                                    = parseInt(newIpBlock.split("/")[1]);
                            else
                                ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][subnetLen]["subnet"]["ip_prefix_len"] = 32;
                            ipam["network-ipam"]["virtual_network_refs"][nwIndex]["attr"]["ipam_subnets"][subnetLen]["default_gateway"] = gateway;
                        } else {
                            break;
                        }
                    }
                    nwIndex++;
                }
            }

            if ($(txtIPAMName)[0].disabled == true)
                mode = "edit";
            else
                mode = "add";
            if (mode === "add") {
                doAjaxCall("/api/tenants/config/ipams", "POST", JSON.stringify(ipam),
                    "createIPAMSuccessCb", "createIPAMFailureCb");
            }
            else if (mode === "edit") {
                doAjaxCall("/api/tenants/config/ipam/" + selectedRow.uuid, "PUT", JSON.stringify(ipam),
                    "createIPAMSuccessCb", "createIPAMFailureCb");
            }
            windowCreateipam.modal('hide');
        }
    });

    $("#btnAddIPBlock").click(function (a) {
        var ipblock = $("#txtIPBlock").val();
        var nw = $("#ddNetworks").data("kendoDropDownList").text();
        var gateway = $("#txtGateway").val();
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

        var existing = $("#gridVnIpBlocks").data("kendoGrid").dataSource.data();
        var nwFound = false;
        if (existing.length > 0) {
            for (var i = 0; i < existing.length; i++) {
                var row = existing[i];
                if (row.Network === nw) {
                    nwFound = true;
                    existing.splice(i + 1, 0, {"IPBlock":ipblock, "Network":"", "Gateway":gateway});
                    break;
                }
            }
            if (nwFound !== true) {
                existing.push({"IPBlock":ipblock, "Network":nw, "Gateway":gateway});
            }
        } else {
            existing.push({"IPBlock":ipblock, "Network":nw, "Gateway":gateway});
        }

        $("#gridVnIpBlocks").data("kendoGrid").dataSource.data(existing);
        $("#gridVnIpBlocks").data("kendoGrid").refresh();
        $("#txtIPBlock").val("");
        $("#txtGateway").val("");
    });

    $("#btnDeleteIPBlock").click(function (a) {
    if($(this).hasClass("k-state-disabled"))
    		return;
        var selected_rows = $("#gridVnIpBlocks").data("kendoGrid").select();
        gridVnIpBlocks = $("#gridVnIpBlocks").data("kendoGrid");
        if (selected_rows && selected_rows.length > 0) {
        	for (var i = 0; i < selected_rows.length; i++) {
        		if(null !== gridVnIpBlocks.dataItem($($(selected_rows[i]).next())) &&
        		typeof gridVnIpBlocks.dataItem($($(selected_rows[i]).next())) !== "undefined" &&
        		"" === gridVnIpBlocks.dataItem($($(selected_rows[i]).next())).Network)
        			gridVnIpBlocks.dataItem($($(selected_rows[i]).next())).Network = 
        				gridVnIpBlocks.dataItem(selected_rows[i]).Network;
        		gridVnIpBlocks.removeRow(selected_rows[i]);
        	}
        }
    });
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

function deleteIPAM(selected_rows){
    btnDeleteIpam.attr("disabled","disabled");
    //showMessageDialog();
    btnDeleteIpam.attr("disabled","disabled");
    //var selected_rows = gridipam.select();
     var deleteAjaxs = [];
     if(selected_rows && selected_rows.length > 0) {
         for(var i=0; i<selected_rows.length; i++) {
             var selected_row_data = selected_rows[i];
             deleteAjaxs[i] = $.ajax({
                url: "/api/tenants/config/ipam/" + selected_row_data.uuid,
                type: "DELETE"
             });
         }
     }
     if(selected_rows && selected_rows.length > 0) {
         for(var i=0; i<selected_rows.length; i++) {
            gridipam.removeRow(selected_rows[i]);
         }
     }
     $.when.apply($, deleteAjaxs).then(
     function() {
        //all success
        //showSuccessMessage();
        var results = arguments;
        createIPAMSuccessCb();
     },
     function () {
         //If atleast one api fails
         //closeMessageDialog(0);
         var results = arguments;
         if(results[0] && results[0].status === 409) {
             if(results[0].responseText.indexOf("virtual-network") != -1 &&
                 results[0].responseText.indexOf("still exist") != -1)
         	showInfoWindow("Reference to virtual network(s) exist. Remove references of this IPAM in virtual networks and try again.", results[0].statusText);
         }
        createIPAMFailureCb();
     });
     confirmMainRemove.modal('hide');
     confirmRemove.modal('hide');
}

function validate() {
    var temp = $(txtIPAMName).val().trim();
    if (typeof temp === "undefined" || temp === "") {
        showInfoWindow("Enter a valid Name", "Input required");
        return false;
    }
    temp = $(ddDnsVirtual).val();
    if (typeof temp === "undefined" || temp === "") {
        showInfoWindow("Enter a valid DNS Server", "Input required");
        return false;
    }
    var selectedDNS = $("#ddDNS").data("kendoDropDownList");
    var selectedDNSText = selectedDNS.text();

    if (selectedDNSText === "Tenant") {
        temp = $(txtdnsTenant).val().trim();
        if (temp != "" && !validip(temp.trim())) {
            showInfoWindow("Enter valied Tenant DNS Server IP.", "Input required");
            return false;
        }
    }
    temp = $(txtNTPServer).val().trim();
    if (temp != "") {
        if (!validip(temp.trim())) {
            showInfoWindow("Enter valied NTP Server IP.", "Input required");
            return false;
        }
    }
    return true;
}

function checkVirtualNetwork() {

    var selectedDNS = $("#ddDNS").data("kendoDropDownList");
    var selectedDNSText = selectedDNS.text();
    document.getElementById("dnsvirtualBlock").style.display = "none";
    document.getElementById("dnsTenantBlock").style.display = "none";
    document.getElementById("dnsDomainName").style.display = "block";

    if (selectedDNSText == "Virtual DNS") {
        document.getElementById("dnsvirtualBlock").style.display = "block";
        document.getElementById("dnsDomainName").style.display = "none";
    }
    if (selectedDNSText == "Tenant") {
        document.getElementById("dnsTenantBlock").style.display = "block";
    }
}

function populateDomains(result) {
    if (result && result.domains && result.domains.length > 0) {
        var domains = [];
        for (i = 0; i < result.domains.length; i++) {
            var domain = result.domains[i];
            tmpDomain = {text:domain.fq_name[0], value:domain.uuid};
            domains.push(tmpDomain);
        }
        ddDomain.data("kendoDropDownList").dataSource.data(domains);
        fetchProjects("populateProjects");
    }
}

function handleDomains() {
    fetchDataForGridIPAM();
}

function populateProjects(result) {
    if (result && result.projects && result.projects.length > 0) {
        var projects = [];
        for (i = 0; i < result.projects.length; i++) {
            var project = result.projects[i];
            tempProjectDetail = {text:project.fq_name[1], value:project.uuid};
            projects.push(tempProjectDetail);
        }
        //ddProject.data("kendoDropDownList").dataSource.data(projects);
        $("#ddProjectSwitcher").kendoDropDownList({
            dataSource:projects,
            dataTextField:"text",
            dataValueField:"value",
            change:handleProjects
        });
        var sel_project = getSelectedProjectObj();
        $("#ddProjectSwitcher").data("kendoDropDownList").value(sel_project);
        setCookie("project", $("#ddProjectSwitcher").data("kendoDropDownList").text()); 
    }
    fetchDataForGridIPAM();
}

function handleProjects(e) {
    var pname = e.sender._current.text();
    setCookie("project", pname);
    fetchDataForGridIPAM();
}

function fetchDataForGridIPAM() {
	var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
    var selectedDomain = selectedDomaindd.text();
    var selectedProjectdd = $("#ddProjectSwitcher").data("kendoDropDownList");
    var selectedProject = selectedProjectdd.text();
    if(!isValidDomainAndProject(selectedDomain, selectedProject))
    	return;
    doAjaxCall(
        "/api/tenants/config/ipams?tenant_id=" + selectedDomain + ":" + selectedProject, "GET",
        null, "successHandlerForGridIPAM", "failureHandlerForGridIPAM", null, null
    );
}

function successHandlerForGridIPAM(result) {
    $("#cb_gridipam").attr("checked", false);
    var ipamNames = jsonPath(result, "$..fq_name[2]");
    var uuids = jsonPath(result, "$..uuid");
    var getAjaxs = [];
    for (var i = 0; i < uuids.length; i++) {
        getAjaxs[i] = $.ajax({
            url:"/api/tenants/config/ipam/" + uuids[i] + "?_=" + Math.random(),
            type:"GET"
        });
    }
    $.when.apply($, getAjaxs).then(
        function () {
            //all success
            var results = arguments;
            successHandlerForGridIPAMRow(results);
        },
        function () {
            //If atleast one api fails
            var results = arguments;
            failureHandlerForGridVNRow(results);
        }
    );
}

function failureHandlerForGridIPAM(result) {
    showInfoWindow("Error in fetching data", "Error");
}
function showRemoveWindow() {
    confirmRemove.find('.modal-header-title').text("Remove");
    confirmRemove.modal('show');
}

function successHandlerForGridIPAMRow(result) {
    var ipamData = [];
    var idCount = 0;
    var ipams = jsonPath(result, "$..network-ipam");
    configObj["network-ipams"] = [];
    for (var i = 0; i < ipams.length; i++) {
        var ipam = ipams[i];
        configObj["network-ipams"][i] = ipams[i];

        var ip_blocks_obj = [];
        var vn_ref_len = 0;
        if ("virtual_network_back_refs" in ipam) {
            vn_ref_len = ipam["virtual_network_back_refs"].length
        }
        for (var j = 0; j < vn_ref_len; j++) {
            var ip_block_len = 0;
            var vn_ref = ipam.virtual_network_back_refs[j];
            if ("attr" in vn_ref && "ipam_subnets" in vn_ref["attr"]) {
                ip_block_len = vn_ref["attr"]["ipam_subnets"].length
            }
            for (var k = 0; k < ip_block_len; k++) {
                var ip_block = "";
                var ip_block_ref = vn_ref["attr"]["ipam_subnets"][k];
                ip_block = vn_ref["to"][2] + " : " +
                    ip_block_ref["subnet"]["ip_prefix"] + "/" +
                    ip_block_ref["subnet"]["ip_prefix_len"];
                if(null !== ip_block_ref["default_gateway"] &&
                	typeof ip_block_ref["default_gateway"] !== "undefined" &&
                	"" !== ip_block_ref["default_gateway"].trim())
                    ip_block += "(" + ip_block_ref["default_gateway"] + ") ";
                ip_blocks_obj.push(ip_block);
            }
        }
        var dnsServer = "";
        var ntpServer = "";
        var domainName = "";
        var dhcp_opt_len = 0;
        var dhcp_opt_ref = [];

        if ("network_ipam_mgmt" in ipam &&
            "dhcp_option_list" in ipam["network_ipam_mgmt"] &&
            ipam["network_ipam_mgmt"]["dhcp_option_list"] &&
            "dhcp_option" in ipam["network_ipam_mgmt"]["dhcp_option_list"]) {
            dhcp_opt_len = ipam["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"].length;
        }
        for (var j = 0; j < dhcp_opt_len; j++) {
            dhcp_opt_ref = ipam["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"][j];
            if (parseInt(dhcp_opt_ref.dhcp_option_name) == 15 && !(domainName.length)) {
                domainName += " " + dhcp_opt_ref.dhcp_option_value;
            }
            if (parseInt(dhcp_opt_ref.dhcp_option_name) == 4 && !(ntpServer.length)) {
                ntpServer += " " + dhcp_opt_ref.dhcp_option_value;
            }
            if (parseInt(dhcp_opt_ref.dhcp_option_name) == 6 && !(dnsServer.length)) {
                dnsServer = "Tenant Managed DNS: " + dhcp_opt_ref.dhcp_option_value;
            }
        }
        try {
            if ("network_ipam_mgmt" in ipam &&
                "ipam_dns_server" in ipam["network_ipam_mgmt"]) {

                if ((ipam["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"] != null) &&
                    "ip_address" in ipam["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"] &&
                    (ipam["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"]["ip_address"].length))
                    dnsServer += " Tenant Managed DNS: " +
                        ipam["network_ipam_mgmt"]["ipam_dns_server"]["tenant_dns_server_address"]["ip_address"];
                if ((ipam["network_ipam_mgmt"]["ipam_dns_server"]["virtual_dns_server_name"] != null) &&
                    (ipam["network_ipam_mgmt"]["ipam_dns_server"]["virtual_dns_server_name"].length))
                    dnsServer += " Virtual DNS: " +
                        ipam["network_ipam_mgmt"]["ipam_dns_server"]["virtual_dns_server_name"];
            }
        } catch (e) {
        }

        if ("network_ipam_mgmt" in ipam &&
            "ipam_dns_method" in ipam["network_ipam_mgmt"] &&
            ipam["network_ipam_mgmt"]["ipam_dns_method"] == "none") {
            if(dnsServer != "") dnsServer += ", ";
            dnsServer += "DNS Mode : None";
        }

        if (!domainName.length) domainName = "-";
        if (!ntpServer.length)   ntpServer = "-";
        if (!dnsServer.length)   dnsServer = "-";

        ipamData.push({"Id":idCount++, "ipam_name":ipam.fq_name[2],
            "uuid":ipam.uuid, "ip_blocks":ip_blocks_obj,
            "dns":dnsServer, "ntp":ntpServer,
            "domain_Name":domainName});
    }
    dsGridIPAM.data(ipamData);
    check4GridEmpty('#gridipam', 'No IPAM found.');
}

function closeCreateIPAMWindow() {
	clearCreateEdit();
    mode = "";
}

function clearCreateEdit() {
    var ddDNSPtr = $("#ddDNS").data("kendoDropDownList");
    var ddDNSVirtualP = $("#ddDnsVirtual").data("kendoDropDownList");
    var dnsMethod = "default-dns-server";

    ddDNSPtr.select(function (dataItem) {
        return dataItem.value == dnsMethod;
    });
    $(ddDNS).val(dnsMethod);
    ddDNSVirtualP.select(0);

    if(typeof $("#ddNetworks").data("kendoDropDownList") !== "undefined") {
        $("#ddNetworks").data("kendoDropDownList").text("");
        $("#ddNetworks").data("kendoDropDownList").value("");
    }
    if(typeof $("#gridVnIpBlocks").data("kendoGrid") !== "undefined") {
        $("#gridVnIpBlocks").data("kendoGrid").dataSource.data([]);
    }

    $(txtIPAMName).val("");
    txtIPAMName[0].disabled = false;
    $(txtNTPServer).val("");
    $(txtdnsTenant).val("");
    $(txtDomainName).val("");
    $(txtIPBlock).val("");
    $(txtGateway).val("");
}

/**
 * Populate edited IPAM's values in controls
 */
function populateIpamEditWindow() {
    var selectedRow = gridipam.dataItem(gridipam.select());
    var rowId = selectedRow["Id"];
    var selectedIpam = configObj["network-ipams"][rowId];

    txtIPAMName.val(selectedRow.ipam_name);
    txtIPAMName[0].disabled = true;
    var ddDNSPtr = $("#ddDNS").data("kendoDropDownList");
    var ddDNSVirtualP = $("#ddDnsVirtual").data("kendoDropDownList");
    var dnsMethod = "none";

    if ("network_ipam_mgmt" in selectedIpam &&
        "ipam_dns_method" in selectedIpam["network_ipam_mgmt"] &&
        selectedIpam["network_ipam_mgmt"]["ipam_dns_method"] != null) {
        dnsMethod = selectedIpam["network_ipam_mgmt"]["ipam_dns_method"];

    }
    ddDNSPtr.select(function (dataItem) {
        return dataItem.value == dnsMethod;
    });
    $(ddDNS).val(dnsMethod);

    if (dnsMethod == "tenant-dns-server") {
        var tenantDnsIP = "";
        tenantDNSIp = selectedIpam["network_ipam_mgmt"]["ipam_dns_server"]
            ["tenant_dns_server_address"]["ip_address"];
        txtdnsTenant.val(tenantDNSIp);
    }
    if (dnsMethod == "virtual-dns-server") {
        var virtualDnsP = "";
        virtualDnsP = selectedIpam["network_ipam_mgmt"]["ipam_dns_server"]
            ["virtual_dns_server_name"];
        ddDNSVirtualP.select(function (dataItem) {
            return dataItem.text == virtualDnsP;
        });
    }

    var dhcp_opt_len = 0;
    var dhcp_opt_ref = [];
    var domainName = "";
    var ntpServer = "";

    if ("network_ipam_mgmt" in selectedIpam &&
        "dhcp_option_list" in selectedIpam["network_ipam_mgmt"] &&
        "dhcp_option" in selectedIpam["network_ipam_mgmt"]["dhcp_option_list"]) {
        dhcp_opt_len = selectedIpam["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"].length;
    }
    for (var j = 0; j < dhcp_opt_len; j++) {
        dhcp_opt_ref = selectedIpam["network_ipam_mgmt"]["dhcp_option_list"]["dhcp_option"][j];
        if (parseInt(dhcp_opt_ref.dhcp_option_name) == 15 && !(domainName.length)) {
            domainName = dhcp_opt_ref.dhcp_option_value;
        }
        if (parseInt(dhcp_opt_ref.dhcp_option_name) == 4 && !(ntpServer.length)) {
            ntpServer = dhcp_opt_ref.dhcp_option_value;
        }
    }

    var nwNames = jsonPath(selectedIpam, "$.virtual_network_back_refs[*].to[2]");
    
    if (nwNames && nwNames.length > 0) {
        var nws = [];
        for (var i = 0; i < nwNames.length; i++) {
        	var vn = jsonPath(selectedIpam, "$.virtual_network_back_refs[?(@.to[2]=='" + nwNames[i] + "')]")[0];
        	var ipBlocks = jsonPath(vn, "$.attr.ipam_subnets[*]");
        	for(var j=0; j<ipBlocks.length; j++) {
        		if(j==0)
        			nws.push({"IPBlock":ipBlocks[j]["subnet"]["ip_prefix"] + "/" + ipBlocks[j]["subnet"]["ip_prefix_len"], "Network":nwNames[i], "Gateway":ipBlocks[j]["default_gateway"]});
        		else
        			nws.push({"IPBlock":ipBlocks[j]["subnet"]["ip_prefix"] + "/" + ipBlocks[j]["subnet"]["ip_prefix_len"], "Network":"", "Gateway":ipBlocks[j]["default_gateway"]});
        	}
        }
        $("#gridVnIpBlocks").data("kendoGrid").dataSource.data(nws);
        $("#gridVnIpBlocks").data("kendoGrid").refresh();
    }

    txtNTPServer.val(ntpServer);
    txtDomainName.val(domainName);
    checkVirtualNetwork();
}

/**
 * IPAM Create window
 */
function ipamCreateEditWindow(mode) {
    var selectedDomain = $("#ddDomainSwitcher").val();
    var selectedDomainName =  $("#ddDomainSwitcher").data("kendoDropDownList").text();
    var selectedProjectName = $("#ddProjectSwitcher").data("kendoDropDownList").text();
    
    if(!isValidDomainAndProject(selectedDomainName, selectedProjectName))
	return;
    
    var getAjaxs = [];
    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/virtual-DNSs/" + selectedDomain,
        type:"GET"
    });
    getAjaxs[1] = $.ajax({
        url:"/api/tenants/config/virtual-networks?tenant_id=" + selectedDomainName + ":" + selectedProjectName,
        type:"GET"
    });

    $.when.apply($, getAjaxs).then(
        function () {
            var results = arguments;
            var vns = jsonPath(results[1][0], "$.virtual-networks[*].fq_name[2]");
            var vnUUIDs = jsonPath(results[1][0], "$.virtual-networks[*].uuid");
            var vnData = [];
            for(var i=0; i<vns.length; i++) {
            	vnData.push({text: vns[i], value: vnUUIDs[i]});
            }
            if(typeof $("#ddNetworks").data("kendoDropDownList") !== "undefined") {
                $("#ddNetworks").data("kendoDropDownList").dataSource.data(vnData);
                if ($(txtIPAMName)[0].disabled == false) //mode is add
                    $("#ddNetworks").data("kendoDropDownList").trigger("change");
            }
            var vdns = results[0][0].virtual_DNSs;
            var virtualDNSs = [];
            var tmpStr = "";
            for (var i = 0; i < vdns.length; i++) {
                tmpStr = String(vdns[i]["virtual-DNS"]["fq_name"][0]) + ":" +
                    String(vdns[i]["virtual-DNS"]["fq_name"][1]);

                virtualDNSs.push({text:tmpStr, value:vdns[i]["virtual-DNS"]["uuid"]});
            }
            ddDnsVirtual.data("kendoDropDownList").dataSource.data(virtualDNSs);
            if (mode == "edit") {
                windowCreateipam.find('.modal-header-title').text("Edit IP Address Management")
                populateIpamEditWindow();
            } else if (mode == "add") {
                checkVirtualNetwork();
                windowCreateipam.find('.modal-header-title').text("Add IP Address Management")
            }
        },
        function () {
            //If atleast one api fails
            //var results = arguments;
        }
    );

    windowCreateipam.modal("show");
    if(typeof $("#gridVnIpBlocks").data("kendoGrid") !== "undefined")
        $("#gridVnIpBlocks").data("kendoGrid").refresh();
}

function createIPAMSuccessCb() {
    //showSuccessMessage();
    windowCreateipam.modal("hide");
    fetchDataForGridIPAM();
}

function createIPAMFailureCb(result) {
    //closeMessageDialog(0);
    windowCreateipam.modal("hide");
    fetchDataForGridIPAM();
}

function loadGridIPBlock(args) {
    var selectedVN = $("#ddNetworks").data("kendoDropDownList");
    var selectedVnUUID = selectedVN.value();
    var getAjaxs = [];
    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/virtual-network/" + selectedVnUUID,
        type:"GET"
    });
    $.when.apply($, getAjaxs).then(
        function () {
            //success
            var results = arguments;
            var ipBlocks = jsonPath(results[0], "$.virtual-network.network_ipam_refs[*].subnet.ipam_subnet");
            var gateways = jsonPath(results[0], "$.virtual-network.network_ipam_refs[*].subnet.gateways");
            if(ipBlocks && ipBlocks.length > 0) {
                var ipBlocksData = $("#gridVnIpBlocks").data("kendoGrid").dataSource.data();
                var selectedVN = $("#ddNetworks").data("kendoDropDownList").text();
                var startIndex = 0, endIndex = 0;
                for(var i=0; i<ipBlocksData.length; i++) {
                    if(ipBlocksData[i].Network === selectedVN) {
                        startIndex = i;
                        if(i == ipBlocksData.length-1) {
                            endIndex = i;
                        } else {
                            for(var j=i+1; j<ipBlocksData.length; j++) {
                                endIndex = j;
                                if(ipBlocksData[j].Network !== "") {
                                    if(j == (i+1))
                                        endIndex = j-1;
                                    i++;
                                    break;
                                }
                                i++;
                            }
                        }
                        ipBlocksData.splice(startIndex, (endIndex-startIndex+1));
                    }
                }
                
                for(var i=ipBlocks.length-1; i>=0; i--) {
                    if(i == 0) {
                        ipBlocksData.unshift({"IPBlock":ipBlocks[i], "Network":results[0]["virtual-network"]["fq_name"][2], "Gateway":gateways[i]});
                    }
                    else {
                        ipBlocksData.unshift({"IPBlock":ipBlocks[i], "Network":"", "Gateway":gateways[i]});
                    }
                }
                $("#gridVnIpBlocks").data("kendoGrid").dataSource.data(ipBlocksData);
            }
        },
        function () {
            //failure
            var results = arguments;
            $("#gridVnIpBlocks").data("kendoGrid").data([]);
        });
}

function destroy() {
    ddDomain = $("#ddDomainSwitcher").data("kendoDropDownList");
    ddDomain.destroy();

    ddProject = $("#ddProjectSwitcher").data("kendoDropDownList");
    ddProject.destroy();

    ddNetworks = $("#ddNetworks").data("kendoDropDownList");
    ddNetworks.destroy();

    gridipam = $("#gridipam").data("kendoGrid");
    gridipam.destroy();

    ddDNS = $("#ddDNS").data("kendoDropDownList");
    ddDNS.destroy();
    
    gridVnIpBlocks = $("#gridVnIpBlocks").data("kendoGrid");
    gridVnIpBlocks.destroy();

    ddDnsVirtual = $("#ddDnsVirtual").data("kendoDropDownList");
    ddDnsVirtual.destroy();

    windowCreateipam = $("#windowCreateipam");
    windowCreateipam.remove();
    windowCreateipam = $();

    btnCreateEditipam.remove();
    btnCreateEditipam = $();

    btnDeleteIpam.remove();
    btnDeleteIpam = $();

    btnCreateEditipamCancel.remove();
    btnCreateEditipamCancel = $();

    btnCreateEditipamOK.remove();
    btnCreateEditipamOK = $();

    btnRemovePopupOK.remove();
    btnRemovePopupOK = $();

    btnRemovePopupCancel.remove();
    btnRemovePopupCancel = $();

    btnCnfRemoveMainPopupOK.remove();
    btnCnfRemoveMainPopupOK = $();

    btnCnfRemoveMainPopupCancel.remove();
    btnCnfRemoveMainPopupCancel = $();

    btnAddIPBlock.remove();
    btnAddIPBlock = $();

    btnDeleteIPBlock.remove();
    btnDeleteIPBlock = $();    

    txtIPAMName.remove();
    txtIPAMName = $();

    txtdnsTenant.remove();
    txtdnsTenant = $();

    txtDomainName.remove();
    txtDomainName = $();

    txtNTPServer.remove();
    txtNTPServer = $();

    txtIPBlock.remove();
    txtIPBlock = $();

    txtGateway.remove();
    txtGateway = $();

    confirmRemove = $("#confirmRemove");
    confirmRemove.remove();
    confirmRemove = $();

    confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.remove();
    confirmMainRemove = $();



    var gridIpamDetailTemplate = $("#gridIpamDetailTemplate");
    gridIpamDetailTemplate.remove();
    gridIpamDetailTemplate = $();
    
    var ipamConfigTemplate = $("#ipam-config-template");
    ipamConfigTemplate.remove();
    ipamConfigTemplate = $();
}
