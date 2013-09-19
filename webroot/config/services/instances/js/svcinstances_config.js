/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

ServicesInstancesObj = new ServicesInstances();

function ServicesInstances() {
    //Variable definitions

    //Text Box
    var txtsvcInstanceName, txtMaximumInstances;

    //Dropdowns
    var ddDomain, ddProject, ddmNet, ddlNet, ddrNet, ddsvcTemplate;

    //Grids
    var gridsvcInstances;

    //check box
    //var chkAutoScaling;

    //Buttons
    var btnCreatesvcInstances, btnDeletesvcInstances,
        btnCreatesvcInstencesCancel, btnCreatesvcInstencesOK,
        btnCnfDelSInstPopupOK, btnCnfDelSInstPopupCancel;

    //Datasources
    var dsGridSTemp;

    //Windows
    var windowCreateSvcInstances, confirmDelete, consoleWindow;
    
    //Timers
    var svcInstanceTimer;
    
    var serviceTemplteType;
    
    //timer level
    var TimerLevel,TimerArray;

    //Method definitions
    this.load = load;
    this.init = init;
    this.initComponents = initComponents;
    this.initActions = initActions;
    this.fetchData = fetchData;
    this.fetchDataForGridsvcInstances = fetchDataForGridsvcInstances;
    this.populateDomains = populateDomains;
    this.handleDomains = handleDomains;
    this.populateProjects = populateProjects;
    this.handleProjects = handleProjects;
    this.closeCreatesvcInstancesWindow = closeCreatesvcInstancesWindow;
    this.svcInstancesCreateWindow = svcInstancesCreateWindow;
    this.showViewConsoleWindow = showViewConsoleWindow;
    this.successHandlerForGridsvcInstance = successHandlerForGridsvcInstance;
    this.failureHandlerForGridsTemp = failureHandlerForGridsTemp;
    this.createSInstanceSuccessCb = createSInstanceSuccessCb;
    this.createSInstanceFailureCb = createSInstanceFailureCb;
    this.destroy = destroy;
}

function load() {
    var configTemplate = kendo.template($("#svcInstances-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    currTab = 'config_sc_svcInstances';
    init();
}

function init() {
    this.initComponents();
    this.initActions();
    this.fetchData();
    initWidgetBoxes();
}

function fetchData() {
    fetchDomains("populateDomains");
}

function initComponents() {
    txtsvcInstanceName = $("#txtsvcInstanceName");
    txtMaximumInstances = $("#txtMaximumInstances");
    btnCreatesvcInstances = $("#btnCreatesvcInstances");
    btnDeletesvcInstances = $("#btnDeletesvcInstances");
    btnCreatesvcInstencesCancel = $("#btnCreatesvcInstencesCancel");
    btnCreatesvcInstencesOK = $("#btnCreatesvcInstencesOK");
    btnCnfDelSInstPopupOK = $("#btnCnfDelSInstPopupOK");
    btnCnfDelSInstPopupCancel = $("#btnCnfDelSInstPopupCancel");
    //chkAutoScaling = $("#chkAutoScaling");
    svcInstanceTimer = null;
    TimerLevel = 0;
    TimerArray = [20000,35000,45000,55000,65000];
    serviceTemplteType = [];

    ddDomain = $("#ddDomainSwitcher").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:handleDomains
    });
    ddProject = $("#ddProjectSwitcher").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:handleProjects
    });
    ddsvcTemplate = $("#ddsvcTemplate").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:svcTemplateChange
    });
    ddlNet = $("#ddlNet").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value"
    });
    ddrNet = $("#ddrNet").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value"
    });
    ddmNet = $("#ddmNet").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value"
    });
    dsGridSTemp = new kendo.data.DataSource({
        batch:true
    });

    gridsvcInstances = $("#gridsvcInstances").contrailKendoGrid({
        dataSource:dsGridSTemp,
        scrollable:false,
        pageable:false,
        sortable: false,
        selectable:true,
        searchToolbar: true,
        searchPlaceholder: 'Search Service Instances',
        widgetGridTitle: '',
        columnMenu: false,
   	    collapseable: false,
   	    showSearchbox: true,
        columns:[
            {
                field:"",
                menu: false,
                title:"<input id='cb_gridsvcInstances' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btnDeletesvcInstances'); /><span class='ace-lbl'></span>",
                width:30,
                template:"<input id='gridsvcInstances_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btnDeletesvcInstances'); /><span class='ace-lbl'></span>",
                searchable: false,
            },
            {
                field:"uuid",
                title:"UUID",
                hidden:true,
                searchable: false,
            },
            {
                field:"Service_Instance",
                title:"Service Instance",
                searchable: true,
            },
            {
                field:"Service_Template",
                title:"Service Template",
                searchable: true,
            },
            {
                field:"vmStatus",
                title:"Status",
                template: '# if(vmStatus == "Spawning"){ #' +
                          '<img src="/img/kendo/loading-image.gif">&nbsp;&nbsp;#= vmStatus#' +
                          '# } if(vmStatus == "Inactive"){ #' +
                          '<div class="status-badge-rounded status-inactive"></div>&nbsp;&nbsp;#= vmStatus#' +
                          '# } if(vmStatus == "Partially Active"){ #' +
                          '<img src="/img/kendo/loading-image.gif">&nbsp;&nbsp;#= vmStatus#' +
                          '# } if(vmStatus == "Active"){ #' +
                          '<div class="status-badge-rounded status-active"></div>&nbsp;&nbsp;#= vmStatus#' +
                          '# } #',
                searchable: true,
                          
            },
            {
                field:"Number_of_instances",
                title:"Number of instances",
                searchable: true,
            },
            {
                field:"All_Network",
                title:"Networks",
                searchable: true,
            },
            {
                field:"InstDetailArr",
                title:"InstDetail",
                hidden:true,
                searchable: false,
            }
        ],
        detailTemplate:kendo.template($("#gridsTempDetailSVCInstences").html()),
        detailInit:initGridsvcInstancesDetail
    });

    gridsvcInstances = $("#gridsvcInstances").data("kendoGrid");
    showGridLoading('#gridsvcInstances');

    $('body').append($("#confirmDelete"));
    confirmDelete = $("#confirmDelete");
    confirmDelete.modal({backdrop:'static', keyboard: false, show:false});
    
    $('body').append($("#consoleWindow"));
    consoleWindow = $("#consoleWindow");
    consoleWindow.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#windowCreateSvcInstances"));
    windowCreateSvcInstances = $("#windowCreateSvcInstances");
    windowCreateSvcInstances.on('hide', closeCreatesvcInstancesWindow);
    windowCreateSvcInstances.modal({backdrop:'static', keyboard: false, show:false});
}

function reloadSvcInstancePage(reload) {
    if($("#windowCreateSvcInstances").css('display') != 'block' && 
       $("#confirmDelete").css('display') != 'block') {
        if (svcInstanceTimer != null) {
            window.clearInterval(svcInstanceTimer);
            svcInstanceTimer = null;
            if (reload == true) {
                fetchDataForGridsvcInstances();
            }
        }
    }
}

function refreshSvcInstances(reload) {
    if(reload == true){
        if(svcInstanceTimer == null){
            if(TimerLevel < TimerArray.length){
                svcInstanceTimer = window.setInterval("reloadSvcInstancePage(true)", TimerArray[TimerLevel]);
                TimerLevel += 1;
            } else {
                window.clearInterval(svcInstanceTimer);
                svcInstanceTimer = null;
            }
        }
    } else {
        if(svcInstanceTimer != null){
            window.clearInterval(svcInstanceTimer);
            svcInstanceTimer = null;
        }
    }
}

function initGridsvcInstancesDetail(e) {
    var detailRow = e.detailRow;
}

function initActions() {
    btnCreatesvcInstances.click(function (a) {
        svcInstancesCreateWindow("add");
    });

    btnDeletesvcInstances.click(function (a) {
        confirmDelete.find('.modal-header-title').text("Confirm");
        confirmDelete.modal('show');
    });

    btnCreatesvcInstencesCancel.click(function (a) {
        windowCreateSvcInstances.modal('hide');
    });

    btnCnfDelSInstPopupCancel.click(function (a) {
        confirmDelete.modal('hide')
    });

    btnCnfDelSInstPopupOK.click(function (a) {
        //Release functions
        btnDeletesvcInstances.attr("disabled","disabled");
        //showMessageDialog();
        var selected_rows = getCheckedRows("gridsvcInstances");
        var deleteAjaxs = [];
        if (selected_rows && selected_rows.length > 0) {
            for (var i = 0; i < selected_rows.length; i++) {
                var selected_row_data = selected_rows[i];
                deleteAjaxs[i] = $.ajax({
                    url:"/api/tenants/config/service-instance/" + selected_row_data.uuid,
                    type:"DELETE"
                });
            }
        }
        if (selected_rows && selected_rows.length > 0) {
            for (var i = 0; i < selected_rows.length; i++) {
                gridsvcInstances.removeRow(selected_rows[i]);
            }
        }
        $.when.apply($, deleteAjaxs).then(
            function () {
                //all success
                //showSuccessMessage();
                var results = arguments;
                createSInstanceSuccessCb();
            },
            function () {
                //If atleast one api fails
                //closeMessageDialog(0);
                var results = arguments;
                createSInstanceSuccessCb();
            });
        confirmDelete.modal('hide');
    });

    btnCreatesvcInstencesOK.click(function (a) {
        if (validate() == true) {
            //showMessageDialog();
            var serviceInstance = {};
            var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
            var selectedDomain = selectedDomaindd.text();
            var selectedProjectdd = $("#ddProjectSwitcher").data("kendoDropDownList");
            var selectedProject = selectedProjectdd.text();
            if(!isValidDomainAndProject(selectedDomain, selectedProject))
            	return;
            var templateProps = JSON.parse($(ddsvcTemplate).val());
            var instName = $(txtsvcInstanceName).val();
            var maxInstances = 1;
            var maxInstancesTxt = $(txtMaximumInstances).val();
            var autoScale = false;
            var ddlnet_temp = $("#ddlNet").data("kendoDropDownList");
            var ddrnet_temp = $("#ddrNet").data("kendoDropDownList");
            var ddmnet_temp = $("#ddmNet").data("kendoDropDownList");
            var leftNetTxt = ddlnet_temp.value();
            var rightNetTxt = ddrnet_temp.value();
            var mgmtNetTxt = ddmnet_temp.value();

            serviceInstance["service-instance"] = {};
            serviceInstance["service-instance"]["parent_type"] = "project";
            serviceInstance["service-instance"]["fq_name"] = [];
            serviceInstance["service-instance"]["fq_name"] = [selectedDomain,
                selectedProject,
                $(txtsvcInstanceName).val()];

            serviceInstance["service-instance"]["service_template_refs"] = [];
            serviceInstance["service-instance"]["service_template_refs"][0] = {};
            serviceInstance["service-instance"]["service_template_refs"][0]["to"] = [];
            serviceInstance["service-instance"]["service_template_refs"][0]["to"] =
                templateProps["fq_name"];

            serviceInstance["service-instance"]["service_instance_properties"] = {};
            var tmplSvcScaling = templateProps["service_template_properties"]["service_scaling"];
            if (maxInstancesTxt != "")
                maxInstances = parseInt(maxInstancesTxt);

            serviceInstance["service-instance"]["service_instance_properties"]["scale_out"] = {};
            serviceInstance["service-instance"]["service_instance_properties"]["scale_out"]["max_instances"] = maxInstances;

            var svcTmplIntf = [];
            if ('interface_type' in templateProps["service_template_properties"]) {
                svcTmplIntf = templateProps["service_template_properties"]["interface_type"];
            }

            for (var i = 0; i < svcTmplIntf.length; i++) {
                if (svcTmplIntf[i]["service_interface_type"] === "left") {
                    if (leftNetTxt === "Auto Configured")
                        leftNetTxt = "";
                    serviceInstance["service-instance"]["service_instance_properties"]
                        ["left_virtual_network"] = leftNetTxt;
                }
                if (svcTmplIntf[i]["service_interface_type"] === "right") {
                    if (rightNetTxt === "Auto Configured")
                        rightNetTxt = "";
                    serviceInstance["service-instance"]["service_instance_properties"]
                        ["right_virtual_network"] = rightNetTxt;
                }
                if (svcTmplIntf[i]["service_interface_type"] === "management") {
                    if (mgmtNetTxt === "Auto Configured")
                        mgmtNetTxt = "";
                    serviceInstance["service-instance"]["service_instance_properties"]
                        ["management_virtual_network"] = mgmtNetTxt;
                }
            }
            doAjaxCall("/api/tenants/config/service-instances", "POST", JSON.stringify(serviceInstance), "createSInstanceSuccessCb", "createSInstanceFailureCb");
            TimerLevel = 0;
            windowCreateSvcInstances.modal('hide');
        }
    });
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
    fetchDataForGridsvcInstances();
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
    fetchDataForGridsvcInstances();
}

function handleProjects(e) {
    var pname = e.sender._current.text();
    setCookie("project", pname);
    fetchDataForGridsvcInstances();
}

function fetchDataForGridsvcInstances() {
    var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
    var selectedDomain = $(ddDomainSwitcher).val();
    doAjaxCall("/api/tenants/config/service-instance-templates/" + selectedDomain, "GET", null, "successTemplateDetail", "failureTemplateDetail", null, null);
    
}

function successTemplateDetail(result) {
    serviceTemplteType = result.service_templates;
    var selectedProject = $(ddProject).val();
    doAjaxCall("/api/tenants/config/service-instances/" + selectedProject, "GET", null, "successHandlerForGridsvcInstance", "failureHandlerForGridsTemp", null, null, 120000);
    //doAjaxCall("/services_sample_new.json", "GET", null, "successHandlerForGridsvcInstance", "failureHandlerForGridsTemp", null, null);
    
}

function failureTemplateDetail(result) {

}

function successHandlerForGridsvcInstance(result) {
    $("#cb_gridsvcInstances").attr("checked", false);
    successHandlerForGridsvcInstanceRow(result);
}

function failureHandlerForGridsTempRow(result) {
    showInfoWindow("Error in getting service instance details.", "Error");
}

function showViewConsoleWindow(vnUUID, name) {
    var selectedProject = $("#ddProjectSwitcher").children(":selected").text();
    var url = "/api/tenants/config/service-instance-vm?project_id=" + selectedProject + "&vm_id=" + vnUUID;
    doAjaxCall(url, "GET", null, "LaunchSvcInstcb", "failureLaunchSvcInstcb", false, {"sameWindow": true, "title": "VNC Console: " + name});
}
function LaunchSvcInstcb(result, cbParams){
    var href = jsonPath(result, "$.console.url")[0];
    document.getElementById("consoleText").innerHTML = "";
    document.getElementById("consoleText").innerHTML = "If console is not responding to keyboard input: click the grey status bar below.&nbsp;&nbsp;<a href='"+href+"' style='text-decoration: underline' target=_blank>Click here to show only console</a>";
    launchVNCcb(result, cbParams);
    $("body").animate({scrollTop:$("body")[0].scrollHeight-$("#vnc-console-widget").height()-60}, 1500);
    
}
function failureLaunchSvcInstcb(result, cbParams){
    
    failurelaunchVNCcb(result, cbParams);
}

function getServiceMode(templateName){
    for(var i = 0; i < serviceTemplteType.length; i++){
        if(templateName == (serviceTemplteType[i]["service-template"].name)){
            return(serviceTemplteType[i]["service-template"]["service_template_properties"]["service_mode"]);
        }
    }
    return ("No-Template");    
}

function successHandlerForGridsvcInstanceRow(result) {
    var svcInstancesData = [];
    var svcInstancesConfig = result;
    configObj["service_instances"] = [];
    var idCount = 0;
    var reload = false;
    for(var j=0;j < svcInstancesConfig.length;j++) {
        var svcInstances = svcInstancesConfig[j]['ConfigData']['service-instance'];
        var VMDetails    = svcInstancesConfig[j]["VMDetails"];
        var vmStatus     = svcInstancesConfig[j]["vmStatus"];
        var svcInstance = svcInstances, vmUUIds = [];
        configObj["service_instances"][j] = svcInstances[i];

        var svc_tmpl_name = "";
        var left_intf = "";
        var right_intf = "";
        var mgmt_intf = "";
        var left = "";
        var right = "";
        var mgmt = "";
        var network = "";
        

        var svc_tmpl_name_text = svcInstance.service_template_refs[0].to[1];
        svc_tmpl_name =  svc_tmpl_name_text + " ( " + ucfirst(getServiceMode(svc_tmpl_name_text)) + " )";

        if ('service_instance_properties' in svcInstance &&
            'scale_out' in svcInstance['service_instance_properties']) {
            var svcScaling = svcInstance['service_instance_properties']['scale_out'];
            svcScalingStr = svcScaling.max_instances + " Instances";
        }

        if ('service_instance_properties' in svcInstance &&
            'left_virtual_network' in svcInstance['service_instance_properties'] &&
            svcInstance['service_instance_properties']['left_virtual_network'] != null) {
            left = svcInstance['service_instance_properties']['left_virtual_network'];
            if(left || left.length){
                left_intf = left;
                var li = left_intf.split(":");
                if(li.length > 1)
                    network = "Left Network : "+li[2];
                else
                    network = "Left Network : "+li[0];
            } else {
                left_intf = "Automatic";
                network = "Left Network : Automatic";
            }
        }
        if ('service_instance_properties' in svcInstance &&
            'right_virtual_network' in svcInstance['service_instance_properties'] &&
            svcInstance['service_instance_properties']['right_virtual_network'] != null) {
            right = svcInstance['service_instance_properties']['right_virtual_network'];
            if(network != "") network += ", ";
            if(right || right.length){
                right_intf = right;
                var ri = right_intf.split(":");
                if(ri.length > 1)
                    network += "Right Network : "+ri[2];
                else
                    network += "Right Network : "+ri[0];
            } else {
                right_intf = "Automatic";
                network += "Right Network : Automatic";
            }
        }
        if ('service_instance_properties' in svcInstance &&
            'management_virtual_network' in svcInstance['service_instance_properties'] &&
            svcInstance['service_instance_properties']['management_virtual_network'] != null) {
            mgmt = svcInstance['service_instance_properties']['management_virtual_network'];
            mgmt_intf = (mgmt || mgmt.length) ? mgmt : "Automatic";
            if(network != "")network += ",";
            if(mgmt || mgmt.length){
                mgmt_intf = mgmt;
                var mi = mgmt_intf.split(":");
                if(mi.length > 1)
                    network += "Management Network : "+mi[2];
                else
                    network += "Management Network : "+mi[0];
                    
            } else {
                mgmt_intf = "Automatic";
                network += "Management Network : Automatic";
            }
        }
        
        var vmBackRefs = svcInstances['virtual_machine_back_refs'];
        if (vmBackRefs != null && vmBackRefs.length != 0) {
            for (var k = 0; k < vmBackRefs.length; k++) {
                vmUUIds.push(vmBackRefs[k]["uuid"]);
            }
        }
        var InstDetailArr = [];
        var vmDetailsLength = 0;
        if (VMDetails != null)
            vmDetailsLength = VMDetails.length;
        for(var l=0 ; l < vmDetailsLength; l++){
            if(VMDetails[l]['server']['id'] != undefined && VMDetails[l]['server']['id'] != null){
                var InstDetail = [];
                var address = "";
                InstDetail[0] = VMDetails[l]['server']['id'];
                InstDetail[1] = VMDetails[l]['server']['name'];
                InstDetail[2] = VMDetails[l]['server']['status'];
                InstDetail[3] = getPowerState(VMDetails[l]['server']['OS-EXT-STS:power_state']);
                    

                for (var vmVNs in VMDetails[l]['server']['addresses']) {
                    address += vmVNs.toString();
                    if (VMDetails[l]['server']['addresses'][vmVNs].length) {
                        address += ':';
                        address += ('addr' in VMDetails[l]['server']['addresses'][vmVNs][0])?
                                   VMDetails[l]['server']['addresses'][vmVNs][0]['addr']: '-';
                    } else {
                        address += "~~"
                    }
                    address += ' ';
                }
                InstDetail[4] = address;
                InstDetailArr.push(InstDetail);
            }
        }

        if(vmStatus == "Active") {
        } else {
            if(vmStatus != "Inactive")
            reload = true;
        }
        svcInstancesData.push({"Id":idCount++, "uuid":svcInstance.uuid,
            "Service_Instance":svcInstance.name,
            "Service_Template":svc_tmpl_name,
            "Number_of_instances":svcScalingStr,
            "All_Network":network,
            "Left_Network":left_intf,
            "Right_Network":right_intf,
            "Management_Network":mgmt_intf,
            "vmStatus":vmStatus,
            "InstDetailArr":InstDetailArr,
            "VMUUIDS":vmUUIds
        });
    }
    dsGridSTemp.data(svcInstancesData);
    check4GridEmpty('#gridsvcInstances', 'No Service Instance found.');
    refreshSvcInstances(reload);

}

function getPowerState(val){
    var powerString="";
    switch(val){
        case 0 :
        case 0x00 :
        {
            powerString = "NOSTATE";
            break;
        }
        case 1:
        case 0x01:
        {
            powerString = "RUNNING";
            break;
        }
        case 3:
        case 0x03:
        {
            powerString = "PAUSED";
            break;
        }
        case 4:
        case 0x04:
        {
            powerString = "SHUTDOWN";
            break;
        }
        case 6:
        case 0x06:
        {
            powerString = "CRASHED";
            break;
        }
        case 7:
        case 0x07:
        {
            powerString = "SUSPENDED";
            break;
        }
    }
    return(powerString);
}


function failureHandlerForGridsTemp(result, cbParam) {
    showInfoWindow("Error in getting Service Instance details.", "Error");
}
function validate() {
    if ($(txtsvcInstanceName).val().trim() == "") {
        showInfoWindow("Enter a valid Service Instance name.", "Input required");
        return false;
    }
    var s= String($(txtsvcInstanceName).val().trim());
    for (i = 0; i < s.length; i++){
        if (s.charAt(i) == "_") {
            showInfoWindow("Underscore not allowed in Service Instance Name.", "Input required");
            return false;        
        }
    }
    if (isNaN($(txtMaximumInstances).val())) {
        showInfoWindow("Maximum Instances should be between 1 - 64.", "Input required");
        return false;
    } else {
        var maxInst = parseInt($(txtMaximumInstances).val());
        if (maxInst < 1 || maxInst > 64) {
            showInfoWindow("Maximum Instances should be between 1 - 64.", "Input required");
            return false;
        }
    }
    var ddlnet_temp = $("#ddlNet").data("kendoDropDownList");
    var ddrnet_temp = $("#ddrNet").data("kendoDropDownList");
    var ddmnet_temp = $("#ddmNet").data("kendoDropDownList");
    
    if(ddlnet_temp.text() != "Auto Configured" && $("#lNetDiv").css('display') == "block"){
        if(((ddlnet_temp.text() == ddrnet_temp.text()) && ($("#rNetDiv").css('display') == "block") ) 
            || (ddlnet_temp.text() == ddmnet_temp.text() && $("#mNetDiv").css('display') == "block")){
            showInfoWindow("Select a different network.", "Input valid data.");
            return false;
        }
    }
    if(ddrnet_temp.text() != "Auto Configured" && $("#rNetDiv").css('display') == "block"){
        if(ddrnet_temp.text() == ddmnet_temp.text() && $("#mNetDiv").css('display') == "block"){
            showInfoWindow("Select a different network.", "Input valid data.");
            return false;
        }
    }
    return true;
}
function svcTemplateChange() {

    var templateProps = JSON.parse($(ddsvcTemplate).val());
    var tmplSvcScaling = templateProps["service_template_properties"]["service_scaling"];

    $("#lNetDiv").addClass("hide");
    $("#rNetDiv").addClass("hide");
    $("#mNetDiv").addClass("hide");
    $("#maxInstances").addClass("hide");
    $(txtMaximumInstances).val("1");

    if (tmplSvcScaling == true ||
        tmplSvcScaling === "True" || tmplSvcScaling === "true") {
        $("#maxInstances").removeClass("hide");
    }

    var svcTmplIntf = [];
    if ('interface_type' in templateProps["service_template_properties"]) {
        svcTmplIntf = templateProps["service_template_properties"]["interface_type"];
    }

    if(templateProps.service_template_properties.service_mode == "in-network" || templateProps.service_template_properties.service_mode == "in-network-nat"){
        var itemToRemove = $("#ddlNet").data("kendoDropDownList").dataSource.at(0);
        if(itemToRemove.text == "Auto Configured"){
            $("#ddlNet").data("kendoDropDownList").dataSource.remove(itemToRemove);
            $("#ddlNet").data("kendoDropDownList").select(0);
        }
        itemToRemove = $("#ddrNet").data("kendoDropDownList").dataSource.at(0);
        if(itemToRemove.text == "Auto Configured"){
            $("#ddrNet").data("kendoDropDownList").dataSource.remove(itemToRemove);
            $("#ddrNet").data("kendoDropDownList").select(0);
        }
    } else {
        var addItem = $("#ddlNet").data("kendoDropDownList").dataSource.at(0);
        if(addItem.text != "Auto Configured"){
            var datas = $("#ddlNet").data("kendoDropDownList").dataSource.data();
            datas.unshift({'text':"Auto Configured",'value':"Auto Configured"});
            $("#ddlNet").data("kendoDropDownList").dataSource.data(datas);
            $("#ddlNet").data("kendoDropDownList").select(0);
        }
        addItem = $("#ddrNet").data("kendoDropDownList").dataSource.at(0);
        if(addItem.text != "Auto Configured"){
            var datas = $("#ddrNet").data("kendoDropDownList").dataSource.data();
            datas.unshift({'text':"Auto Configured",'value':"Auto Configured"});
            $("#ddrNet").data("kendoDropDownList").dataSource.data(datas);
            $("#ddrNet").data("kendoDropDownList").select(0);
        }
    }
    for (var i = 0; i < svcTmplIntf.length; i++) {
        if (svcTmplIntf[i]["service_interface_type"] === "left")
            $("#lNetDiv").removeClass("hide");
        if (svcTmplIntf[i]["service_interface_type"] === "right")
            $("#rNetDiv").removeClass("hide");
        if (svcTmplIntf[i]["service_interface_type"] === "management")
            $("#mNetDiv").removeClass("hide");
    }
}

function closeCreatesvcInstancesWindow() {
    clearPopupValues();
}

function clearPopupValues() {
    mode = "";
    $(txtsvcInstanceName).val("");
    $(txtMaximumInstances).val("");
    $("#ddmNet").data("kendoDropDownList").select(0);
    $("#ddlNet").data("kendoDropDownList").select(0);
    $("#ddrNet").data("kendoDropDownList").select(0);
    $("#ddsvcTemplate").data("kendoDropDownList").select(0);

}

/*
 * Create Window
 */
function svcInstancesCreateWindow(mode) {
    var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
    var selectedDomain = $(ddDomainSwitcher).val();
    var selectedDomainName = selectedDomaindd.text();
    var selectedProjectdd = $("#ddProjectSwitcher").data("kendoDropDownList");
    var selectedProject = $(ddProjectSwitcher).val();
    var selectedProjectName = selectedProjectdd.text();
    if(!isValidDomainAndProject(selectedDomain, selectedProject))
        return;

    var getAjaxs = [];

    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/service-instance-templates/" + selectedDomain,
        type:"GET"
    });
    getAjaxs[1] = $.ajax({
        url:"/api/tenants/config/virtual-networks?tenant_id=" +
            selectedDomainName + ":" + selectedProjectName,
        type:"GET"
    });

    $.when.apply($, getAjaxs).then(
        function () {
            var results = arguments;

            var svcTemplates = [];
            var svcTemplateObjs = jsonPath(results[0][0], "$..service-template");
            var svcTemplatesLen = svcTemplateObjs.length;

            for (var i = 0; i < svcTemplatesLen; i++) {
                var mode = (svcTemplateObjs[i].service_template_properties.service_mode == null) ? 
                           "Service Mode is Inactive" : svcTemplateObjs[i].service_template_properties.service_mode;
                var addedData = "["+mode+" (";
                for(var j=0;j<svcTemplateObjs[i].service_template_properties.interface_type.length;j++){
                    if(j > 0) addedData += " , ";
                    addedData += svcTemplateObjs[i].service_template_properties.interface_type[j].service_interface_type;
                }
                addedData += ")]";
                svcTemplates.push({'text':(svcTemplateObjs[i].fq_name[1]+" - "+addedData),
                    'value':JSON.stringify(svcTemplateObjs[i])});
            }

            ddsvcTemplate.data("kendoDropDownList").dataSource.data(svcTemplates);
            var networks = [];
            networks.push({'text':"Auto Configured",'value':"Auto Configured"});
            for(var j=0;j < results[1][0]['virtual-networks'].length;j++){
                var val="";
                var networklen = results[1][0]['virtual-networks'][j].fq_name.length; 
                for(var k=0;k<networklen;k++){
                    val += results[1][0]['virtual-networks'][j].fq_name[k]
                    if(k < networklen-1) val+=":";
                }
                networks.push({'text':results[1][0]['virtual-networks'][j].fq_name[2],'value':val})
            }
            ddlNet.data("kendoDropDownList").dataSource.data(networks);
            ddrNet.data("kendoDropDownList").dataSource.data(networks);
            ddmNet.data("kendoDropDownList").dataSource.data(networks);
            svcTemplateChange();
        },
        function () {
            //If atleast one api fails
            //var results = arguments;
        }
    );
    windowCreateSvcInstances.find('.modal-header-title').text("Create Service Instances");
    windowCreateSvcInstances.modal('show');
}

function createSInstanceSuccessCb() {
    //showSuccessMessage();
    fetchDataForGridsvcInstances();
}

function createSInstanceFailureCb() {
    //closeMessageDialog(0);
    showInfoWindow("Error while creating Service Instance", "Create Error");
    fetchDataForGridsvcInstances();
}

function ucfirst(str) {
    if (str == null)
        return "-";
    var firstLetter = str.slice(0, 1);
    return firstLetter.toUpperCase() + str.substring(1);
}

function destroy() {
    ddDomain = $("#ddDomainSwitcher").data("kendoDropDownList");
    ddDomain.destroy();

    ddProject = $("#ddProjectSwitcher").data("kendoDropDownList");
    ddProject.destroy();

    txtsvcInstanceName.remove();
    txtsvcInstanceName = $();

    txtMaximumInstances.remove();
    txtMaximumInstances = $();

    btnCreatesvcInstances.remove();
    btnCreatesvcInstances = $();

    btnDeletesvcInstances.remove();
    btnDeletesvcInstances = $();

    btnCreatesvcInstencesCancel.remove();
    btnCreatesvcInstencesCancel = $();

    btnCreatesvcInstencesOK.remove();
    btnCreatesvcInstencesOK = $();

    btnCnfDelSInstPopupOK.remove();
    btnCnfDelSInstPopupOK = $();

    btnCnfDelSInstPopupCancel.remove();
    btnCnfDelSInstPopupCancel = $();

    ddsvcTemplate = $("#ddsvcTemplate").data("kendoDropDownList");
    ddsvcTemplate.destroy();

    ddlNet = $("#ddlNet").data("kendoDropDownList");
    ddlNet.destroy();

    ddrNet = $("#ddrNet").data("kendoDropDownList");
    ddrNet.destroy();

    ddmNet = $("#ddmNet").data("kendoDropDownList");
    ddmNet.destroy();

    gridsvcInstances = $("#gridsvcInstances");
    gridsvcInstances.remove();
    gridsvcInstances = $();

    dsGridSTemp = $();

    consoleWindow = $("#consoleWindow");
    consoleWindow.remove();
    consoleWindow = $();

    confirmDelete = $("#confirmDelete");
    confirmDelete.remove();
    confirmDelete = $();

    windowCreateSvcInstances = $("#windowCreateSvcInstances");
    windowCreateSvcInstances.remove();
    windowCreateSvcInstances = $();
    
    reloadSvcInstancePage(false);

}
