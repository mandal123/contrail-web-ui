/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

FloatingIPConfigObj = new FloatingIPConfig();

function FloatingIPConfig() {
    //Variable definitions
    //Dropdowns
    var ddDomain, ddProject, ddFipPool, ddAssociate;

    //Grids
    var gridfip;

    //Buttons
    var btnCreatefip, btnDeletefip,
        btnCreatefipCancel, btnCreatefipOK, btnAssociatePopupOK,
        btnAssociatePopupCancel, btnDisassociatePopupOK, btnDisassociatePopupCancel,
        btnCnfReleasePopupOK, btnCnfReleasePopupCancel;

    //Datasources
    var dsGridFIP;

    //Windows
    var windowCreatefip, windowAssociate, confirmDisassociate, confirmRelease;

    //Method definitions
    this.load = load;
    this.init = init;
    this.initComponents             = initComponents;
    this.initActions                = initActions;
    this.fetchData                  = fetchData;
    this.fetchDataForGridIPF        = fetchDataForGridIPF;
    this.populateDomains            = populateDomains;
    this.handleDomains              = handleDomains;
    this.populateProjects           = populateProjects;
    this.handleProjects             = handleProjects;
    this.showFIPEditWindow          = showFIPEditWindow;
    this.closeCreateFIPWindow       = closeCreateFIPWindow;
    this.fipAssociateWindow         = fipAssociateWindow;
    this.successHandlerForGridIPF   = successHandlerForGridIPF;
    this.failureHandlerForGridFIP   = failureHandlerForGridFIP;
    this.createFIPSuccessCb         = createFIPSuccessCb;
    this.createFIPFailureCb         = createFIPFailureCb;
    this.destroy                    = destroy;
}

function load() {
    var configTemplate = kendo.template($("#fip-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    currTab = 'config_networking_fip';
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
    btnCreatefip            = $("#btnCreatefip");
    btnDeletefip            = $("#btnDeletefip");
    btnCreatefipCancel      = $("#btnCreatefipCancel");
    btnCreatefipOK          = $("#btnCreatefipOK");
    btnAssociatePopupOK     = $("#btnAssociatePopupOK");
    btnAssociatePopupCancel = $("#btnAssociatePopupCancel");
    btnDisassociatePopupOK  = $("#btnDisassociatePopupOK");
    btnDisassociatePopupCancel  = $("#btnDisassociatePopupCancel");
    btnCnfReleasePopupOK        = $("#btnCnfReleasePopupOK");
    btnCnfReleasePopupCancel    = $("#btnCnfReleasePopupCancel");

    ddDomain = $("#ddDomainSwitcher").kendoDropDownList({
        change:handleDomains
    });
    ddProject = $("#ddProjectSwitcher").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
//		change: handleProjects
    });
    ddFipPool = $("#ddFipPool").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
    });
    ddAssociate = $("#ddAssociate").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
    });

    dsGridFIP = new kendo.data.DataSource({
        batch:true
    });

    gridfip = $("#gridfip").contrailKendoGrid({
        dataSource:dsGridFIP,
        scrollable:false,
        sortable:false,
        pageable:false,
        selectable:true,
        searchToolbar: true,
    	searchPlaceholder: 'Search Floating IPs',
	    widgetGridTitle: '',
   	    collapseable: false,
   	    showSearchbox: true,
	    columnMenu: false,
        columns:[
            {
                field:"",
                menu: false,
                title:"<input id='cb_gridfip' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btnDeletefip'); /><span class='ace-lbl'></span>",
                width:30,
                template:"<input id='gridfip_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btnDeletefip'); /><span class='ace-lbl'></span>",
                searchable: false
            },
            {
                field:"ip_addr",
                title:"IP Address",
                searchable: true
            },
            {
                field:"instance",
                title:"Instance",
                searchable: true
            },
            {
                field:"fipPool",
                title:"Floating IP and Pool",
                searchable: true
            },
            {
                field:"uuid",
                title:"UUID",
                searchable: false
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
                    '            <a onclick="fipAssociateWindow();" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
                    '                <i class="icon-edit"></i> &nbsp; Associate Instance' +
                    '            </a>' +
                    '        </li>' +
                    '        <li>' +
                    '            <a onclick="showDisassociateWindow();" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                    '                <i class="icon-trash"></i> &nbsp; Disassociate' +
                    '            </a>' +
                    '        </li>' +
                    '    </ul>' +
                    '</div>',
                searchable: false
            }
        ],
    });
    
    gridfip = $("#gridfip").data("kendoGrid");
    showGridLoading("#gridfip");
    
    $('body').append($("#windowCreatefip"));
    windowCreatefip = $("#windowCreatefip");
    windowCreatefip.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#windowAssociate"));
    windowAssociate = $("#windowAssociate");
    windowAssociate.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmRelease"));
    confirmRelease = $("#confirmRelease");
    confirmRelease.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmDisassociate"));
    confirmDisassociate = $("#confirmDisassociate");
    confirmDisassociate.modal({backdrop:'static', keyboard: false, show:false});
}

function initActions() {
    btnCreatefip.click(function (a) {
        showFIPEditWindow("add");
    });

    btnDeletefip.click(function (a) {
        confirmRelease.find('.modal-header-title').text("Confirm");
        confirmRelease.modal('show');
    });

    btnCreatefipCancel.click(function (a) {
        windowCreatefip.modal('hide');
    });

    btnAssociatePopupCancel.click(function (a) {
        windowAssociate.modal('hide');
    });

    btnDisassociatePopupCancel.click(function (a) {
        confirmDisassociate.modal('hide')
    });

    btnCnfReleasePopupCancel.click(function (a) {
        confirmRelease.modal('hide')
    });

    btnAssociatePopupOK.click(function (a) {
        //Associate functions
        //showMessageDialog();
        var selectedInstance = $(ddAssociate).val();
        var selectedRow = gridfip.dataItem(gridfip.select());

        var fip = {};
        fip["floating-ip"] = {};
        fip["floating-ip"]["virtual_machine_interface_refs"] = [];
        fip["floating-ip"]["virtual_machine_interface_refs"][0] = {};
        fip["floating-ip"]["virtual_machine_interface_refs"][0]["to"] = JSON.parse(selectedInstance);
        doAjaxCall("/api/tenants/config/floating-ip/" + selectedRow.uuid, "PUT", JSON.stringify(fip),
            "createFIPSuccessCb", "createFIPFailureCb");

        windowAssociate.modal('hide');
    });

    btnDisassociatePopupOK.click(function (a) {
        //Disassociate conformed functions
        //showMessageDialog();
        var selectedRow = gridfip.dataItem(gridfip.select());
        var fip = {};
        fip["floating-ip"] = {};
        fip["floating-ip"]["virtual_machine_interface_refs"] = [];
        doAjaxCall("/api/tenants/config/floating-ip/" + selectedRow.uuid, "PUT", JSON.stringify(fip),
            "createFIPSuccessCb", "createFIPFailureCb");
        confirmDisassociate.modal('hide');

    });

    btnCnfReleasePopupOK.click(function (a) {
        //Release functions
        //showMessageDialog();
        btnDeletefip.attr("disabled","disabled");
         var selected_rows = getCheckedRows("gridfip");
         var deleteAjaxs = [];
         if(selected_rows && selected_rows.length > 0) {
             for(var i=0; i<selected_rows.length; i++) {
                 var selected_row_data = (selected_rows[i]);
                 deleteAjaxs[i] = $.ajax({
                    url: "/api/tenants/config/floating-ip/" + selected_row_data.uuid,
                    type: "DELETE"
                 });
             }
         }
         if(selected_rows && selected_rows.length > 0) {
             for(var i=0; i<selected_rows.length; i++) {
                gridfip.removeRow(selected_rows[i]);
             }
         }
         $.when.apply($, deleteAjaxs).then(
         function() {
            //all success
            //showSuccessMessage();
            var results = arguments;
            createFIPSuccessCb();
         },
         function () {
             //If atleast one api fails
             //closeMessageDialog(0);
             var results = arguments;
            createFIPFailureCb();
         });
        confirmRelease.modal('hide');
    });

    btnCreatefipOK.click(function (a) {
        //showMessageDialog();
        var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
        var selectedDomain = selectedDomaindd.text();
        var selectedProjectdd = $("#ddProjectSwitcher").data("kendoDropDownList");
        var selectedProject = selectedProjectdd.text();
        if(!isValidDomainAndProject(selectedDomain, selectedProject))
        	return;
        var selectedPool = $(ddFipPool).val();

        var fip = {};
        fip["floating-ip"] = {};
        fip["floating-ip"]["parent_type"] = "floating-ip-pool";
        fip["floating-ip"]["fq_name"] = [];
        fip["floating-ip"]["fq_name"] = JSON.parse(selectedPool);
        fip["floating-ip"]["project_refs"] = [];
        fip["floating-ip"]["project_refs"][0] = {};
        fip["floating-ip"]["project_refs"][0]["to"] = [selectedDomain, selectedProject];
        doAjaxCall("/api/tenants/config/floating-ips", "POST", JSON.stringify(fip),
            "createFIPSuccessCb", "createFIPFailureCb");
        windowCreatefip.modal('hide');
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
    fetchDataForGridIPF();
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
    }
    fetchDataForGridIPF();
}

function handleProjects(e) {
    var pname = e.sender._current.text();
    setCookie("project", pname);
    fetchDataForGridIPF();
}

function fetchDataForGridIPF() {
    var selectedProject = $(ddProjectSwitcher).val();
    doAjaxCall(
        "/api/tenants/config/floating-ips/" + selectedProject, "GET",
        null, "successHandlerForGridIPF", "failureHandlerForGridFIP", null, null
    );
}

function successHandlerForGridIPF(result) {
    $("#cb_gridfip").attr("checked", false);
    successHandlerForGridIPFRow(result);
}

function failureHandlerForGridFIP(result) {
    alert(result);
}
function showDisassociateWindow() {
    confirmDisassociate.find('.modal-header-title').text("Disassociate");
    confirmDisassociate.modal('show');
}

function successHandlerForGridIPFRow(result) {
    var fipData = [];
    var idCount = 0;
    var fips = jsonPath(result, "$..floating-ip");
    for (var i = 0; i < fips.length; i++) {
        var fip = fips[i];
        var ip_addr = ""
        ip_addr = String(jsonPath(fip, "$.floating_ip_address"));
        var instanceId = "-";
        var instance = jsonPath(fip, "$.virtual_machine_interface_refs");
        if (typeof instance === "object" && instance.length === 1)
            instanceId = String(instance[0][0].to[0]);
        var fipPool = "-";
        var fipPoolVal = jsonPath(fip, "$.fq_name");
        if (typeof fipPoolVal === "object" && fipPoolVal.length === 1)
            fipPool = String(fipPoolVal[0][2]) + ":" + String(fipPoolVal[0][3]);
        var uuid = ""
        uuid = String(jsonPath(fip, "$.uuid"));
        fipData.push({"Id":idCount++, "ip_addr":ip_addr, "instance":instanceId, "fipPool":fipPool, "uuid":uuid});
    }
    dsGridFIP.data(fipData);
    check4GridEmpty('#gridfip', 'No Associate Floating IP found.');
}

function failureHandlerForGridFIP(result, cbParam) {
    alert(result);
}

function closeCreateFIPWindow() {
    mode = "";
    windowCreatefip.modal('hide');
}

function showFIPEditWindow(mode) {
    //Allocation code to be done in this place
    if (mode == "add") {
        windowCreatefip.modal('show');
        var selectedProject = $(ddProjectSwitcher).val();
        var getAjaxs = [];
        getAjaxs[0] = $.ajax({
            url:"/api/tenants/config/floating-ip-pools/" + selectedProject,
            type:"GET"
        });
        $.when.apply($, getAjaxs).then(
            function () {
                //all success
                var results = arguments;
                var fipPools = [];
                for (var i = 0; i < results[0].floating_ip_pool_refs.length; i++) {
                    var poolObj = results[0].floating_ip_pool_refs[i];
                    var poolName = poolObj.to[2] + ":" + poolObj.to[3];
                    fipPools.push({text:poolName, value:JSON.stringify(poolObj.to)})
                }
                ddFipPool.data("kendoDropDownList").dataSource.data(fipPools);
                windowCreatefip.find('.modal-header-title').text("Allocate Floating IP");
                windowCreatefip.modal('show');
            },
            function () {
                //If atleast one api fails
                //var results = arguments;
            });
    }

}

/*
 * Associate Floating IP to an Instance
 */
function fipAssociateWindow(uuid) {
    //Allocation code to be done in this place
    var selectedDomain = $("#ddDomainSwitcher").data("kendoDropDownList").text();
    var selectedProjectdd = $("#ddProjectSwitcher").data("kendoDropDownList");
    var selectedProject = selectedProjectdd.text();
    if(!isValidDomainAndProject(selectedDomain, selectedProject))
    	return;
    var getAjaxs = [];
    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/virtual-machine-interfaces?tenant_id=" +
            selectedDomain + ":" + selectedProject,
        type:"GET"
    });
    $.when.apply($, getAjaxs).then(
        function () {
            //all success
            var results = arguments;
            var vmi = [];
            for (var i = 0; i < results[0].virtual_machine_interface_back_refs.length; i++) {
                var vmiObj = results[0].virtual_machine_interface_back_refs[i];
                var vmiName = "";
                if ('instance_ip_address' in vmiObj) {
                    vmiName = "(" + vmiObj['instance_ip_address'] + ") ";
                }
                vmiName += vmiObj.to[0];
                vmi.push({text:vmiName, value:JSON.stringify(vmiObj.to)})
            }
            ddAssociate.data("kendoDropDownList").dataSource.data(vmi);
            windowAssociate.find('.modal-header-title').text("Associate Floating IP");
            windowAssociate.modal('show');
        },
        function () {
            //If atleast one api fails
            //var results = arguments;
        });
}

function createFIPSuccessCb() {
    //showSuccessMessage();
    closeCreateFIPWindow();
    fetchDataForGridIPF();
}

function createFIPFailureCb() {
    //closeMessageDialog(0);
    closeCreateFIPWindow();
    fetchDataForGridIPF();
}

function destroy() {
    ddDomain = $("#ddDomainSwitcher").data("kendoDropDownList");
    ddDomain.destroy();

    ddProject = $("#ddProjectSwitcher").data("kendoDropDownList");
    ddProject.destroy();

    ddFipPool = $("#ddFipPool").data("kendoDropDownList");
    ddFipPool.destroy();

    ddAssociate = $("#ddAssociate").data("kendoDropDownList");
    ddAssociate.destroy();

    btnCreatefip.remove();
    btnCreatefip = $();

    btnDeletefip.remove();
    btnDeletefip = $();

    btnCreatefipCancel.remove();
    btnCreatefipCancel = $();

    btnCreatefipOK.remove();
    btnCreatefipOK = $();

    btnAssociatePopupOK.remove();
    btnAssociatePopupOK = $();

    btnAssociatePopupCancel.remove();
    btnAssociatePopupCancel = $();

    btnDisassociatePopupOK.remove();
    btnDisassociatePopupOK = $();

    btnDisassociatePopupCancel.remove();
    btnDisassociatePopupCancel = $();

    btnCnfReleasePopupOK.remove();
    btnCnfReleasePopupOK = $();

    btnCnfReleasePopupCancel.remove();
    btnCnfReleasePopupCancel = $();

    windowCreatefip = $("#windowCreatefip");
    windowCreatefip.remove();
    windowCreatefip = $();

    windowAssociate = $("#windowAssociate");
    windowAssociate.remove();
    windowAssociate = $();

    confirmDisassociate = $("#confirmDisassociate");
    confirmDisassociate.remove();
    confirmDisassociate = $();

    confirmRelease = $("#confirmRelease");
    confirmRelease.remove();
    confirmRelease = $();

    gridfip = $("#gridfip");
    gridfip.remove();
    gridfip = $();
}
