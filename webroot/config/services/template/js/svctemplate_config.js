/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

ServiceTemplatesObj = new ServiceTemplates();

function ServiceTemplates() {
    //Variable definitions

    //Text Box
    var txtTempName;

    //Dropdowns
    var ddDomain, ddProject, ddImageName, ddserType, ddserMode, ddInterface;

    //Multi Select Drop Down

    //Grids
    var gridsvcTemplate;

    //Buttons
    var btnCreatesvcTemplate, btnDeletesvcTemplate,
        btnCreateSTempCancel, btnCreateSTempOK,
        btnCnfDelPopupOK, btnCnfDelPopupCancel;

    //Datasources
    var dsGridSTemp;

    //Windows
    var windowCreateStemp, confirmDelete;

    //Method definitions
    this.load = load;
    this.init = init;
    this.initComponents                 = initComponents;
    this.initActions                    = initActions;
    this.fetchData                      = fetchData;
    this.fetchDataForGridsvcTemplate    = fetchDataForGridsvcTemplate;
    this.populateDomains                = populateDomains;
    this.handleDomains                  = handleDomains;
    this.populateProjects               = populateProjects;
    this.handleProjects                 = handleProjects;
    this.closeCreatesvcTemplateWindow   = closeCreatesvcTemplateWindow;
    this.sTempCreateWindow              = sTempCreateWindow;
    this.successHandlerForGridsTemp     = successHandlerForGridsTemp;
    this.failureHandlerForGridsTemp     = failureHandlerForGridsTemp;
    this.createStempSuccessCb           = createStempSuccessCb;
    this.createStempFailureCb           = createStempFailureCb;
    this.destroy = destroy;
}

function load() {
    var configTemplate = kendo.template($("#svcTemplate-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    currTab = 'config_sc_svctemplate';
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
    txtTempName             = $("#txtTempName");
    btnCreatesvcTemplate    = $("#btnCreatesvcTemplate");
    btnDeletesvcTemplate    = $("#btnDeletesvcTemplate");
    btnCreateSTempCancel    = $("#btnCreateSTempCancel");
    btnCreateSTempOK        = $("#btnCreateSTempOK");
    btnCnfDelPopupOK        = $("#btnCnfDelPopupOK");
    btnCnfDelPopupCancel    = $("#btnCnfDelPopupCancel");

    ddDomain = $("#ddDomainSwitcher").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:handleDomains
    });
    ddProject = $("#ddProjectSwitcher").kendoDropDownList({});
    ddImageName = $("#ddImageName").kendoDropDownList({
    });
    ddInterface = $("#ddInterface").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:enableSharedIP
    });
    ddserType = $("#ddserType").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
    });
    ddserMode = $("#ddserMode").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
        change:enableSharedIP
    });

    dsGridSTemp = new kendo.data.DataSource({
        batch:true
    });

    var serviceType = [
        {text:"Firewall", value:"firewall"},
        {text:"Analyzer", value:"analyzer"}
    ];
    ddserType.data("kendoDropDownList").dataSource.data(serviceType);

    var serviceMode = [
        {text:"Transparent", value:"transparent"},
        {text:"In-Network", value:"in-network"},
        {text:"In-Network NAT", value:"in-network-nat"}
        
    ];
    ddserMode.data("kendoDropDownList").dataSource.data(serviceMode);
    ddserMode.data("kendoDropDownList").list[0].style.minWidth = "110px";

    gridsvcTemplate = $("#gridsvcTemplate").contrailKendoGrid({
        dataSource:dsGridSTemp,
        scrollable:false,
        sortable: false,
        pageable:false,
        selectable:true,
        searchToolbar: true,
    	searchPlaceholder: 'Search Templates',
	    showSearchbox: true,
    	widgetGridTitle: '',
	    collapseable: false,
	    columnMenu: false,
        columns:[
            {
                field:"",
                menu: false,
                title:"<input id='cb_gridsvcTemplate' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btnDeletesvcTemplate'); /><span class='ace-lbl'></span>",
                width:37,
                template:"<input id='gridsvcTemplate_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btnDeletesvcTemplate'); /><span class='ace-lbl'></span>",
                searchable: false
            },
            {
                field:"uuid",
                title:"UUID",
                hidden:true,
                searchable: false
            },
            {
                field:"templateName",
                title:"Template",
                searchable: true,
            },
            {
                field:"Service_Mode",
                title:"Service Mode",
                searchable: true
            },
            {
                field:"service_Type",
                title:"Service Type",
                searchable: true
            },
            {
                field:"service_Scaling",
                title:"Service Scaling",
                searchable: true
            },
            {
                field:"interface_type",
                title:"Interfaces",
                searchable: true
            },
            {
                field:"image_Name",
                title:"Image Name",
                searchable: true
            }
        ],
        detailTemplate:kendo.template($("#gridsTempDetailTemplate").html()),
        detailInit:initGridsvcTemplateDetail,
    });
    
    gridsvcTemplate = $("#gridsvcTemplate").data("kendoGrid");
    showGridLoading('#gridsvcTemplate');
    
    $('body').append($("#windowCreateStemp"));
    windowCreateStemp = $("#windowCreateStemp");
    windowCreateStemp.modal({backdrop:'static', keyboard: false, show:false});


    $('body').append($("#confirmDelete"));
    confirmDelete = $("#confirmDelete");
    confirmDelete.modal({backdrop:'static', keyboard: false, show:false});
    
    
}

function initGridsvcTemplateDetail(e) {
    var detailRow = e.detailRow;
}

function initActions() {
    btnCreatesvcTemplate.click(function (a) {
        sTempCreateWindow("add");
    });

    btnDeletesvcTemplate.click(function (a) {
        confirmDelete.find('.modal-header-title').text("Confirm");
        confirmDelete.modal('show');
    });

    btnCreateSTempCancel.click(function (a) {
        windowCreateStemp.modal('hide');
    });

    btnCnfDelPopupCancel.click(function (a) {
        confirmDelete.modal('hide')
    });

    btnCnfDelPopupOK.click(function (a) {
        //Release functions
        btnDeletesvcTemplate.attr("disabled","disabled");
        //showMessageDialog();
        var selected_rows = getCheckedRows("gridsvcTemplate");
         var deleteAjaxs = [];
         if(selected_rows && selected_rows.length > 0) {
             for(var i=0; i<selected_rows.length; i++) {
                 var selected_row_data = selected_rows[i];
                 deleteAjaxs[i] = $.ajax({
                    url: "/api/tenants/config/service-template/" + selected_row_data.uuid,
                    type: "DELETE"
                 });
             }
         }
         if(selected_rows && selected_rows.length > 0) {
             for(var i=0; i<selected_rows.length; i++) {
                gridsvcTemplate.removeRow(selected_rows[i]);
             }
         }
         $.when.apply($, deleteAjaxs).then(
         function() {
            //showSuccessMessage();
            var results = arguments;
            createStempSuccessCb();
         },
         function () {
             var results = arguments;
             //closeMessageDialog(0);
             showInfoWindow(results[0].statusText,"Error");
            createStempFailureCb();
         });
        confirmDelete.modal('hide');
    });
    btnCreateSTempOK.click(function (a) {
        //showMessageDialog();
        var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
        var selectedDomain = selectedDomaindd.text();
        if(!isValidDomain(selectedDomain))
        	return;
        var selectedImage = $(ddImageName).val();
        var selectedScaling = $("#chkServiceEnabeling")[0].checked;
        var selectedType = $(ddserType).val();
        var selectedMode = $(ddserMode).val();
        var addInterfaces = [];
        var serviceTemplate = {};
        var validatReturn = validate();
        
        if($("#chkLeftInterface")[0].checked){
            addInterfaces.push({"service_interface_type":"left",
                            "shared_ip":$("#chkLeftSharedIP")[0].checked});
        }
        if($("#chkRightInterface")[0].checked){
            addInterfaces.push({"service_interface_type":"right",
                            "shared_ip":$("#chkRightSharedIP")[0].checked});
        }
        if($("#chkMgmtInterface")[0].checked){
            addInterfaces.push({"service_interface_type":"management",
                            "shared_ip":false});
        }
        
        if (validatReturn == true) {
            serviceTemplate["service-template"] = {};
            serviceTemplate["service-template"]["parent_type"] = "domain";
            serviceTemplate["service-template"]["fq_name"] = [];
            serviceTemplate["service-template"]["fq_name"] = [selectedDomain, $(txtTempName).val()];
            serviceTemplate["service-template"]["service_template_properties"] = {};
            serviceTemplate["service-template"]["service_template_properties"]["image_name"] = selectedImage;
            serviceTemplate["service-template"]["service_template_properties"]["service_scaling"] = selectedScaling;
            serviceTemplate["service-template"]["service_template_properties"]["service_type"] = selectedType;
            serviceTemplate["service-template"]["service_template_properties"]["service_mode"] = selectedMode;
            serviceTemplate["service-template"]["service_template_properties"]["interface_type"] = addInterfaces;
            doAjaxCall("/api/tenants/config/service-templates", "POST", JSON.stringify(serviceTemplate),
                "createStempSuccessCb", "createStempFailureCb");
            windowCreateStemp.modal('hide');
        }
    });
}

function validate() {
    if ($(txtTempName).val().trim() == "") {
        showInfoWindow("Enter a valid Template Name", "Input required");
        return false;
    }
    if(!$("#chkLeftInterface")[0].checked && !$("#chkRightInterface")[0].checked){
        showInfoWindow("Add Left or Right Interface", "Input required");
        return false;
    }
    return true;
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
    fetchDataForGridsvcTemplate();
}
function populateProjects(result) {
    if (result && result.projects && result.projects.length > 0) {
        var projects = [];
        for (i = 0; i < result.projects.length; i++) {
            var project = result.projects[i];
            tempProjectDetail = {text:project.fq_name[1], value:project.uuid};
            projects.push(tempProjectDetail);
        }
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
    fetchDataForGridsvcTemplate();
}

function handleProjects(e) {
    var pname = e.sender._current.text();
    setCookie("project", pname);
    fetchDataForGridsvcTemplate();
}

function fetchDataForGridsvcTemplate() {
    var selectedDomain = $(ddDomainSwitcher).val();
    if(!isValidDomain(selectedDomain))
     	return;
    doAjaxCall(
        "/api/tenants/config/service-templates/" + selectedDomain, "GET",
        null, "successHandlerForGridsTemp", "failureHandlerForGridsTemp", null, null
    );
}

function successHandlerForGridsTemp(result) {
    $("#cb_gridsvcTemplate").attr("checked", false);
    successHandlerForGridsTempRow(result);
}

function failureHandlerForGridsTempRow(result) {
    alert(result);
}

function successHandlerForGridsTempRow(result) {
    var svcTemplateData = [];
    var idCount = 0;
    var svcTemplates = jsonPath(result, "$..service-template");

    configObj["service-templates"] = [];
    for (var i = 0; i < svcTemplates.length; i++) {
        var svcTemplate = svcTemplates[i];
        configObj["service-templates"][i] = svcTemplates[i];

        var svc_inst_ref = null;
        var svc_instances = "";
        var svc_inst_ref_len = 0;
        if ("service_instance_back_refs" in svcTemplate) {
            svc_inst_ref = svcTemplate.service_instance_back_refs;
            svc_inst_ref_len = svcTemplate.service_instance_back_refs.length;
        }
        for (var j = 0; j < svc_inst_ref_len; j++) {
            svc_instances += svc_inst_ref[j]["to"][1] +
                ":" + svc_inst_ref[j]["to"][2];
            if (j < (svc_inst_ref_len - 1))
                svc_instances += ", ";
        }

        var svc_intf_ref = null;
        var svc_interfaces = "";
        var svc_intf_ref_len = 0;
        if ("interface_type" in svcTemplate.service_template_properties) {
            svc_intf_ref = svcTemplate.service_template_properties.interface_type;
            svc_intf_ref_len = svc_intf_ref.length;
        }
        for (var j = 0; j < svc_intf_ref_len; j++) {
            svc_interfaces += ucfirst(svc_intf_ref[j].service_interface_type);
            if (svc_intf_ref[j].shared_ip === "true" ||
                svc_intf_ref[j].shared_ip === "True" ||
                svc_intf_ref[j].shared_ip == true) {
                svc_interfaces += "(Shared IP)";
            }
            if (j < (svc_intf_ref_len - 1))
                svc_interfaces += ", ";
        }

        svcScalingStr = "Disabled";
        svcScaling = svcTemplate.service_template_properties.service_scaling;
        if (svcScaling === "true" || svcScaling === "True" ||
            svcScaling == true)
            svcScalingStr = "Enabled";

        svcTemplateData.push({"Id":idCount++, "uuid":svcTemplate.uuid,
            "templateName":svcTemplate.name,
            "Service_Mode":ucfirst(svcTemplate.service_template_properties.service_mode),
            "service_Type":ucfirst(svcTemplate.service_template_properties.service_type),
            "service_Scaling":svcScalingStr,
            "interface_type":(svc_interfaces.length) ? svc_interfaces : "-",
            "image_Name":svcTemplate.service_template_properties.image_name,
            "Instances":(svc_instances.length) ? svc_instances : "-"
        });
    }
    dsGridSTemp.data(svcTemplateData);
    check4GridEmpty('#gridsvcTemplate', 'No Service Template found.');
}

function failureHandlerForGridsTemp(result, cbParam) {
    alert(result);
}

function closeCreatesvcTemplateWindow() {
    clearPopup();
}
function clearPopup() {
    $(txtTempName).val("");
    var type = $("#ddserType").data("kendoDropDownList");
    var mode = $("#ddserMode").data("kendoDropDownList");
    var img = $("#ddImageName").data("kendoDropDownList");
    type.select(0);
    mode.select(0);
    img.select(0);

    $("#chkServiceEnabeling")[0].checked = false;
    $(".sharedip").addClass("hide");
    $("#chkLeftInterface")[0].checked = false;
    $("#chkRightInterface")[0].checked = false;
    $("#chkMgmtInterface")[0].checked = false;
    mode = "";
}

function sTempCreateWindow(mode) {
    var selectedDomain = $(ddDomainSwitcher).val();
    if(!isValidDomain(selectedDomain))
       	return;
    var getAjaxs = [];
    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/service-template-images/" + selectedDomain,
        type:"GET"
    });
    $.when.apply($, getAjaxs).then(
        function () {
            var results = arguments;
            var imageNames = jsonPath(results[0], "$..name");
            ddImageName.data("kendoDropDownList").dataSource.data(imageNames);
            clearPopup();
        },
        function () {
            //If atleast one api fails
            //var results = arguments;
        }
    );
    windowCreateStemp.find('.modal-header-title').text("Add Service Template");
    windowCreateStemp.modal('show');
}

function createStempSuccessCb() {
    //showSuccessMessage();
    closeCreatesvcTemplateWindow();
    fetchDataForGridsvcTemplate();
}

function createStempFailureCb() {
    //closeMessageDialog(0);
    closeCreatesvcTemplateWindow();
    fetchDataForGridsvcTemplate();
}

function ucfirst(str) {
    if (str == null)
        return "-";
    var firstLetter = str.slice(0, 1);
    return firstLetter.toUpperCase() + str.substring(1);
}

function enableSharedIP() {
    if ($("#chkServiceEnabeling")[0].checked == true) {
        if ($(ddserMode).val() == "transparent"){
            if($(chkLeftInterface)[0].checked == true ){
                if($(".leftsharedip").css('display') != "block"){
                    $(".leftsharedip").removeClass("hide");
                }
                $(chkLeftSharedIP)[0].checked = true;
            } else {
                $(".leftsharedip").addClass("hide");
            }
            if($(chkRightInterface)[0].checked == true){
                if($(".rightsharedip").css('display') != "block"){
                    $(".rightsharedip").removeClass("hide");
                }
                $(chkRightSharedIP)[0].checked = true;
            } else {
                $(".rightsharedip").addClass("hide");
            }
        }
        if ($(ddserMode).val() == "in-network" || $(ddserMode).val() == "in-network-nat"){
            if($(chkLeftInterface)[0].checked == true ){
                if($(".leftsharedip").css('display') != "block"){
                    $(".leftsharedip").removeClass("hide");
                }
                $(chkLeftSharedIP)[0].checked = true;
            } else {
                $(".leftsharedip").addClass("hide");
            }
            if($(chkRightInterface)[0].checked == true){
                if($(".rightsharedip").css('display') != "block"){
                    $(".rightsharedip").removeClass("hide");
                }
                $(chkRightSharedIP)[0].checked = false;
            } else {
                $(".rightsharedip").addClass("hide");
            }
        }
    } else {
        $(".sharedip").addClass("hide");
        $(chkLeftSharedIP)[0].checked = false;
        $(chkRightSharedIP)[0].checked = false;
    }
}

function destroy() {
    ddDomain = $("#ddDomainSwitcher").data("kendoDropDownList");
    ddDomain.destroy();

    ddProject = $("#ddProjectSwitcher").data("kendoDropDownList");
    ddProject.destroy();

    txtTempName.remove();
    txtTempName = $();

    ddImageName = $("#ddImageName").data("kendoDropDownList");
    ddImageName.destroy();

    ddserType = $("#ddserType").data("kendoDropDownList");
    ddserType.destroy();

    ddserMode = $("#ddserMode").data("kendoDropDownList");
    ddserMode.destroy();

    btnCreatesvcTemplate.remove();
    btnCreatesvcTemplate = $();

    btnDeletesvcTemplate.remove();
    btnDeletesvcTemplate = $();

    btnCreateSTempCancel.remove();
    btnCreateSTempCancel = $();

    btnCreateSTempOK.remove();
    btnCreateSTempOK = $();

    btnCnfDelPopupOK.remove();
    btnCnfDelPopupOK = $();

    btnCnfDelPopupCancel.remove();
    btnCnfDelPopupCancel = $();

    dsGridSTemp = $();

    confirmDelete = $("#confirmDelete");
    confirmDelete.remove();
    confirmDelete = $();

    windowCreateStemp = $("#windowCreateStemp");
    windowCreateStemp.remove();
    windowCreateStemp = $();

    gridsvcTemplate = $("#gridsvcTemplate");
    gridsvcTemplate.remove();
    gridsvcTemplate = $();
}
