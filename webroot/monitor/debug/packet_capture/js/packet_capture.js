/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

PacketCaptureObj = new PacketCapture();

function PacketCapture() {
    //Variable definitions
    var ddDomain, ddProject, ddIPOptions; //Dropdowns
    var gridAnalyzer; //Grids
    var btnCreateAnalyzer, btnDeleteAnalyzer, btnCreateAnalyzerCancel, btnCreateAnalyzerOK, btnAddRule, btnDeleteRule, btnCnfDelAnalyzerPopupOK, btnCnfDelAnalyzerPopupCancel; //Buttons
    var txtPolicyName, txtAnalyzerName; //Textboxes
    var msAssociatedNetworks; //Multiselects
    var dlVirtualNetwork; //Droplist
    var dsGridAnalyzer; //Datasources
    var windowCreateAnalyzer, confirmDelete; //Windows
    var isAnalyzerImageAvailable = false;
    var isAnalyzerImageCheckDone = false;

    //Method definitions
    this.load = load;
    this.init = init;
    this.initComponents = initComponents;
    this.initActions = initActions;
    this.fetchData = fetchData;
    this.fetchDataForGridAnalyzer = fetchDataForGridAnalyzer;
    this.populateDomains = populateDomains;
    this.handleDomains = handleDomains;
    this.populateProjects = populateProjects;
    this.handleProjects = handleProjects;
    this.gridAnalyzerRowChange = gridAnalyzerRowChange;
    this.gridAnalyzerSelectRow = gridAnalyzerSelectRow;
    this.gridAnalyzerSelectAllRows = gridAnalyzerSelectAllRows;
    this.showAnalyzerEditWindow = showAnalyzerEditWindow;
    this.closeCreateAnalyzerWindow = closeCreateAnalyzerWindow;
    this.successHandlerForGridAnalyzer = successHandlerForGridAnalyzer;
    this.failureHandlerForGridAnalyzer = failureHandlerForGridAnalyzer;
    this.createAnalyzerSuccessCB = createAnalyzerSuccessCB;
    this.createAnalyzerFailureCB = createAnalyzerFailureCB;
    this.createPolicySuccessCB = createPolicySuccessCB;
    this.createPolicyFailureCB = createPolicyFailureCB;
    this.validate = validate;
    this.destroy = destroy;
};

function load() {
    var configTemplate = kendo.template($("#analyzer-config-template").html());
    $(contentContainer).empty();
    $(contentContainer).html(configTemplate);
    currTab = 'config_net_policies';
    init();
};

function init() {
    this.initComponents();
    this.initActions();
    this.fetchData();
    initWidgetBoxes();
};

function fetchData() {
    fetchDomains("populateDomains");
};

function initComponents() {
    btnCreateAnalyzer = $("#btnCreateAnalyzer");
    btnCreateAnalyzer = $("#btnCreateAnalyzer");
    btnDeleteAnalyzer = $("#btnDeleteAnalyzer");
    btnAddRule = $("#btnAddRule");
    btnDeleteRule = $("#btnDeleteRule");
    btnCreateAnalyzerCancel = $("#btnCreateAnalyzerCancel");
    btnCreateAnalyzerOK = $("#btnCreateAnalyzerOK");
    btnCnfDelAnalyzerPopupOK = $('#btnCnfDelAnalyzerPopupOK');
    btnCnfDelAnalyzerPopupCancel = $('#btnCnfDelAnalyzerPopupCancel');
    
    txtPolicyName = $("#txtPolicyName");
    txtAnalyzerName = $("#txtAnalyzerName");

    ddDomain = $("#ddDomainSwitcher").kendoDropDownList({
        change:handleDomains,
        dataTextField:"text",
        dataValueField:"value"
    });
    ddProject = $("#ddProjectSwitcher").kendoDropDownList({
        change:handleProjects,
        dataTextField:"text",
        dataValueField:"value"
    });

    msAssociatedNetworks = $("#msAssociatedNetworks").kendoMultiSelect({placeholder:"Select Networks..."});
    dlVirtualNetwork = $("#dlVirtualNetwork").kendoDropDownList({placeholder:"Select Network..."});

    dsGridAnalyzer = new kendo.data.DataSource({
        batch:true
    });

    gridAnalyzer = $("#gridAnalyzer").contrailKendoGrid({
        dataSource:dsGridAnalyzer,
        scrollable:false,
        pageable:false,
        selectable:'multiple',
        change:this.gridAnalyzerRowChange,
        columns:[
            {
                field:"",
                menu: false,
                title:"<input id='cb_gridAnalyzer' class='form-field-checkbox ace-input' type='checkbox' onClick='gridAnalyzerSelectAllRows(this)'/><span class='ace-lbl'></span>",
                width:30,
                template:"<input id='gridAnalyzer_#: Id #' class='check_row ace-input' type='checkbox' onClick='gridAnalyzerSelectRow(this)'/> <span class='ace-lbl'></span>"
            },
            {
                field:"AnalyzerName",
                title:"Analyzer Name"
            },
            {
                field:"VirtualNetwork",
                title:"Virtual Network"
            },
            {
                field:"AssociatedNetwork",
                title:"Associated Networks",
                template:' # if(typeof AssociatedNetworks === "object") { # ' +
                    ' #     for(var i=0;i < AssociatedNetworks.length,i<2;i++) { # ' +
                    ' #        if(typeof AssociatedNetworks[i] !== "undefined") { # ' +
                    ' #:           AssociatedNetworks[i] # ' +
                    '              <br> ' +
                    ' #        } #  ' +
                    ' #     } #  ' +
                    ' #     if(AssociatedNetworks.length > 2) { # ' +
                    '           <span class="moredataText">( #: (AssociatedNetworks.length-2) # more)</span> ' +
                    '           <span class="moredata" style="display:none;" > ' +
                    '           </span> ' +
                    ' #     } # ' +
                    ' # } # '
            },
            {
                field:"PolicyRules",
                title:"Analyzer Rules",
                template:' # if(typeof PolicyRules === "object") { # ' +
                    ' #     for(var i=0;i < PolicyRules.length,i<2;i++) { # ' +
                    ' #        if(typeof PolicyRules[i] !== "undefined") { # ' +
                    ' #:           PolicyRules[i] # ' +
                    '              <br> ' +
                    ' #        } #  ' +
                    ' #     } #  ' +
                    ' #     if(PolicyRules.length > 2) { # ' +
                    '           <span class="moredataText">( #: (PolicyRules.length-2) # more)</span> ' +
                    '           <span class="moredata" style="display:none;" > ' +
                    '           </span> ' +
                    ' #     } # ' +
                    ' # } # '
            },
            {
                field:"vmStatus",
                width: "100px",
                title:"Status",
                template: '# if(vmStatus == "Spawning"){ #' +
                    '<span class="status-badge-rounded status-spawning"></span>#= vmStatus#' +
                    '# } if(vmStatus == "Inactive"){ #' +
                    '<span class="status-badge-rounded status-inactive"></span>#= vmStatus#' +
                    '# } if(vmStatus == "Partially Active"){ #' +
                    '<span class="status-badge-rounded status-partially-active"></span>#= vmStatus#' +
                    '# } if(vmStatus == "Active"){ #' +
                    '<span class="status-badge-rounded status-active"></span>#= vmStatus#' +
                    '# } #'
            },
            {
                field:"PolicyUUID",
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
                    '            <a onclick="showAnalyzerEditWindow(\'edit\');" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
                    '                <i class="icon-edit"></i> &nbsp; Edit' +
                    '            </a>' +
                    '        </li>' +
                    '        <li>' +
                    '            <a onclick="launchAnalyzer()" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Launch VNC">' +
                    '                <i class="icon-list-alt"></i> &nbsp; View Analyzer' +
                    '            </a>' +
                    '        </li>' +
                    '        <li>' +
                    '            <a onclick="btnDeleteAnalyzer.click()" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                    '            	<i class="icon-trash"></i> &nbsp; Delete' +
                    '            </a>' +
                    '        </li>' +
                    '    </ul>' +
                    '</div>'
            }
        ],
        detailTemplate:kendo.template($("#gridAnalyzerDetailTemplate").html()),
        detailInit:initgridAnalyzerDetail,
        searchToolbar: true,
        searchPlaceholder: 'Search Analyzer',
        widgetGridTitle: 'Analyzers',
        collapseable: false
    });

    gridAnalyzer = $("#gridAnalyzer").data("kendoGrid");
    showGridLoading("#gridAnalyzer");
    
    $('body').append($("#windowCreateAnalyzer"));
    windowCreateAnalyzer = $("#windowCreateAnalyzer");
    windowCreateAnalyzer.on("hide", closeCreateAnalyzerWindow);
    windowCreateAnalyzer.modal({backdrop:'static', keyboard: false, show:false});
    
    $('body').append($("#confirmDelete"));
    confirmDelete = $("#confirmDelete");
    confirmDelete.modal({backdrop:'static', keyboard: false, show:false});
};

function initActions() {
    btnCreateAnalyzer.click(function (e) {
        e.preventDefault();
        if(PacketCaptureObj.isAnalyzerImageCheckDone) {
            if(PacketCaptureObj.isAnalyzerImageAvailable) {
                showAnalyzerEditWindow("add");
            } else {
                showInfoWindow("Analyzer image is not found. Please ensure that a valid image of name analyzer is present.", "Warning");
            }
        } else {
            showInfoWindow("Waiting to get the analyzer image. Please try again after few seconds.", "Message");
        }
        return false;
    });

    btnDeleteAnalyzer.click(function (a) {
        confirmDelete.find('.modal-header-title').text("Confirm");
        confirmDelete.modal('show');
    });
    
    btnCnfDelAnalyzerPopupOK.click(function (a) {
        var selected_rows = gridAnalyzer.select();
        var deleteAjaxs = [];
        if (selected_rows && selected_rows.length > 0) {
            for (var i = 0; i < selected_rows.length; i++) {
                var selected_row_data = gridAnalyzer.dataItem(selected_rows[i]);
                deleteAjaxs[i] = $.ajax({
                    url:"/api/tenants/config/service-instance/" + selected_row_data["AnalyzerUUID"] + "?policyId=" + selected_row_data["PolicyUUID"],
                    type:"DELETE"
                });
            }
            if (selected_rows && selected_rows.length > 0) {
                for (var i = 0; i < selected_rows.length; i++) {
                    gridAnalyzer.removeRow(selected_rows[i]);
                }
            }
            $.when.apply($, deleteAjaxs).then(
                function () {
                    //all success
                    var results = arguments;
                    fetchDataForGridAnalyzer();
                },
                function () {
                    //If atleast one api fails
                    var results = arguments;
                    fetchDataForGridAnalyzer();
                });
        }
        $("#vnc-console-widget").find('.icon-remove').click();
        confirmDelete.modal('hide');
    });

    btnCnfDelAnalyzerPopupCancel.click(function(a){
    	confirmDelete.modal('hide');
    });
    
    btnCreateAnalyzerCancel.click(function (a) {
        windowCreateAnalyzer.hide();
    });

    btnCreateAnalyzerOK.click(function () {
        if (validate()) {
            var analyzerPolicy, analyzer;
            if (txtAnalyzerName[0].disabled == true) {
                mode = "edit";
                analyzerPolicy = getAnalyzerPolicy();
                var policyUUID = jsonPath(configObj, "$.network-policys[?(@.fq_name[2]=='" + txtPolicyName.val() + "')]")[0].uuid;
                doAjaxCall("/api/tenants/config/policy/" + policyUUID, "PUT", JSON.stringify(analyzerPolicy), "createPolicySuccessCB", "createPolicyFailureCB");
            } else {
                mode = "add";
                analyzer = getAnalyzer();
                doAjaxCall("/api/tenants/config/service-instances", "POST", JSON.stringify(analyzer), "createAnalyzerSuccessCB", "createAnalyzerFailureCB");
            }
        }
    });
};

function appendRuleEntry(who, defaultRow) {
    var ruleEntry = createRuleEntry();
    if (defaultRow) {
        $("#ruleTuples").prepend(ruleEntry);
    } else {
        var parentEl = who.parentNode.parentNode.parentNode;
        parentEl.parentNode.insertBefore(ruleEntry, parentEl.nextSibling);
    }
};

function createRuleEntry(rule) {
    var selectProtocol = document.createElement("select");
    selectProtocol.className = "span2 pull-left";
    var any = document.createElement("option");
    any.value = 0;
    any.text = "Any";
    var tcp = document.createElement("option");
    tcp.value = 1;
    tcp.text = "TCP";
    var udp = document.createElement("option");
    udp.value = 0;
    udp.text = "UDP";
    var icmp = document.createElement("option");
    icmp.value = 1;
    icmp.text = "ICMP";
    selectProtocol.appendChild(any);
    selectProtocol.appendChild(tcp);
    selectProtocol.appendChild(udp);
    selectProtocol.appendChild(icmp);

    var selectSrcNetwork = document.createElement("select");
    selectSrcNetwork.className = "span2 pull-left";
    selectSrcNetwork.setAttribute("placeholder", "Source network (any)");
    var srcNwAny = document.createElement("option");
    srcNwAny.value = 0;
    srcNwAny.text = "any";
    var srcNwLocal = document.createElement("option");
    srcNwLocal.value = 1;
    srcNwLocal.text = "local";
    selectSrcNetwork.appendChild(srcNwAny);
    selectSrcNetwork.appendChild(srcNwLocal);

    var inputTxtSrcPorts = document.createElement("input");
    inputTxtSrcPorts.type = "text";
    inputTxtSrcPorts.className = "span12";
    inputTxtSrcPorts.setAttribute("placeholder", "Source ports");
    var divRowFluidSrcPorts = document.createElement("div");
    divRowFluidSrcPorts.className = "span2";
    divRowFluidSrcPorts.appendChild(inputTxtSrcPorts);

    var selectDirection = document.createElement("select");
    selectDirection.className = "span1 pull-left";
    selectDirection.setAttribute("placeholder", "Direction (<>)");
    var bid = document.createElement("option");
    bid.value = 0;
    bid.text = "<>";
    var uni = document.createElement("option");
    uni.value = 1;
    uni.text = ">";
    selectDirection.appendChild(bid);
    selectDirection.appendChild(uni);

    var selectDestNetwork = document.createElement("select");
    selectDestNetwork.className = "span2 pull-left";
    selectDestNetwork.setAttribute("placeholder", "Destination network (any)");
    var destNwAny = document.createElement("option");
    destNwAny.value = 0;
    destNwAny.text = "any";
    var destNwLocal = document.createElement("option");
    destNwLocal.value = 1;
    destNwLocal.text = "local";
    selectDestNetwork.appendChild(destNwAny);
    selectDestNetwork.appendChild(destNwLocal);

    var inputTxtDestPorts = document.createElement("input");
    inputTxtDestPorts.type = "text";
    inputTxtDestPorts.className = "span12";
    inputTxtDestPorts.setAttribute("placeholder", "Destination ports");
    var divRowFluidDestPorts = document.createElement("div");
    divRowFluidDestPorts.className = "span2";
    divRowFluidDestPorts.appendChild(inputTxtDestPorts);
    var iBtnAddRule = document.createElement("i");
    iBtnAddRule.className = "icon-plus";
    iBtnAddRule.setAttribute("onclick", "appendRuleEntry(this);");
    iBtnAddRule.setAttribute("title", "Add rule below");

    var divPullLeftMargin5Plus = document.createElement("div");
    divPullLeftMargin5Plus.className = "pull-right margin-5";
    divPullLeftMargin5Plus.appendChild(iBtnAddRule);

    var iBtnDeleteRule = document.createElement("i");
    iBtnDeleteRule.className = "icon-minus";
    iBtnDeleteRule.setAttribute("onclick", "deleteRuleEntry(this);");
    iBtnDeleteRule.setAttribute("title", "Delete rule");

    var divPullLeftMargin5Minus = document.createElement("div");
    divPullLeftMargin5Minus.className = "pull-right margin-5";
    divPullLeftMargin5Minus.appendChild(iBtnDeleteRule);

    var divRowFluidMargin10 = document.createElement("div");
    divRowFluidMargin10.className = "row-fluid margin-0-0-5";
    divRowFluidMargin10.appendChild(selectProtocol);
    divRowFluidMargin10.appendChild(selectSrcNetwork);
    divRowFluidMargin10.appendChild(divRowFluidSrcPorts);
    divRowFluidMargin10.appendChild(selectDirection);
    divRowFluidMargin10.appendChild(selectDestNetwork);
    divRowFluidMargin10.appendChild(divRowFluidDestPorts);
    divRowFluidMargin10.appendChild(divPullLeftMargin5Plus);
    divRowFluidMargin10.appendChild(divPullLeftMargin5Minus);

    var rootDiv = document.createElement("div");
    rootDiv.className = 'rule-item';
    rootDiv.appendChild(divRowFluidMargin10);

    var vns = msAssociatedNetworks.data("kendoMultiSelect").dataSource.data();
    for (var i = 0; i < vns.length; i++) {
        var vn = vns[i];
        var srcVNOption = document.createElement("option");
        srcVNOption.value = i + 2;
        srcVNOption.text = vn;
        selectSrcNetwork.appendChild(srcVNOption);

        var destVNOption = document.createElement("option");
        destVNOption.value = i + 2;
        destVNOption.text = vn;
        selectDestNetwork.appendChild(destVNOption);
    }
    $(selectProtocol).kendoDropDownList();
    $(selectSrcNetwork).kendoDropDownList();
    $(selectSrcNetwork).data("kendoDropDownList").list[0].style.minWidth = "170px";
    $(selectDirection).kendoDropDownList();
    $(selectDestNetwork).kendoDropDownList();
    $(selectDestNetwork).data("kendoDropDownList").list[0].style.minWidth = "170px";

    var sts = jsonPath(configObj, "$.service_templates[*].service-template");
    var nonAnalyzerInsts = [];
    var serviceInsts = [];
    if (null !== sts && sts.length > 0) {
        for (var i = 0; i < sts.length; i++) {
            if (sts[i].service_template_properties.service_type !== "analyzer") {
                if (typeof sts[i].service_instance_back_refs !== "undefined" && sts[i].service_instance_back_refs.length > 0) {
                    for (var j = 0; j < sts[i].service_instance_back_refs.length; j++) {
                        nonAnalyzerInsts[nonAnalyzerInsts.length] = sts[i].service_instance_back_refs[j].to[2];
                        serviceInsts[serviceInsts.length] = sts[i].service_instance_back_refs[j].to[2];
                    }
                }
            } else {
                if (typeof sts[i].service_instance_back_refs !== "undefined" && typeof sts[i].service_instance_back_refs[j] !== "undefined"
                    && typeof sts[i].service_instance_back_refs[j].to !== "undefined" && typeof sts[i].service_instance_back_refs[j].to[2] !== "undefined") {
                    serviceInsts[serviceInsts.length] = sts[i].service_instance_back_refs[j].to[2];
                }
            }
        }
    }

    if (null !== rule && typeof rule !== "undefined") {

        var protocol = rule["protocol"];
        if (null !== protocol && typeof protocol !== "undefined") {
            protocol = protocol.toUpperCase();
            var protoList = $(selectProtocol).data("kendoDropDownList").dataSource.data();
            protoList = jsonPath(protoList, "$..text");
            $(selectProtocol).data("kendoDropDownList").select(protoList.indexOf(protocol));
        }
        var direction = rule["direction"];
        if (null !== direction && typeof direction !== "undefined") {
            direction = direction.toUpperCase();
            var dirList = $(selectDirection).data("kendoDropDownList").dataSource.data();
            dirList = jsonPath(dirList, "$..text");
            $(selectDirection).data("kendoDropDownList").select(dirList.indexOf(direction));
        }

        if (null !== rule["src_addresses"] && typeof rule["src_addresses"] !== "undefined" &&
            rule["src_addresses"].length > 0) {
            var srcNetwork = [];
            for (var i = 0; i < rule["src_addresses"].length; i++) {
                if (null !== rule["src_addresses"][i]["virtual_network"] &&
                    typeof rule["src_addresses"][i]["virtual_network"] !== "undefined") {
                    srcNetwork[i] = getVNName(rule["src_addresses"][i]["virtual_network"]);
                    if (srcNetwork[i] === "any")
                        srcNetwork[i] = srcNetwork[i].toUpperCase();
                }
            }
            var srcNw = srcNetwork.join();
            var vnList = $(selectSrcNetwork).data("kendoDropDownList").dataSource.data();
            vnList = jsonPath(vnList, "$..text");
            $(selectSrcNetwork).data("kendoDropDownList").select(vnList.indexOf(srcNw));
        }
        if (null !== rule["dst_addresses"] && typeof rule["dst_addresses"] !== "undefined" &&
            rule["dst_addresses"].length > 0) {
            var destNetwork = [];
            for (var i = 0; i < rule["dst_addresses"].length; i++) {
                if (null !== rule["dst_addresses"][i]["virtual_network"] &&
                    typeof rule["dst_addresses"][i]["virtual_network"] !== "undefined") {
                    destNetwork[i] = getVNName(rule["dst_addresses"][i]["virtual_network"]);
                    if (destNetwork[i] === "any")
                        destNetwork[i] = destNetwork[i].toUpperCase();
                }
            }
            var destNw = destNetwork.join();
            var vnList = $(selectDestNetwork).data("kendoDropDownList").dataSource.data();
            vnList = jsonPath(vnList, "$..text");
            $(selectDestNetwork).data("kendoDropDownList").select(vnList.indexOf(destNw));
        }

        if (null !== rule["src_ports"] && typeof rule["src_ports"] !== "undefined" &&
            rule["src_ports"].length > 0) {
            var portDesc = [];
            if (rule["src_ports"].length === 1 && rule["src_ports"][0]["start_port"] === -1) {
                $(inputTxtSrcPorts).val("Any");
            } else {
                for (var i = 0; i < rule["src_ports"].length; i++) {
                    if (rule["src_ports"][i]["end_port"] !== -1)
                        portDesc[i] = rule["src_ports"][i]["start_port"] + " - " + rule["src_ports"][i]["end_port"];
                    else
                        portDesc[i] = rule["src_ports"][i]["start_port"];
                }
                $(inputTxtSrcPorts).val(portDesc.join(","));
            }
        }

        if (null !== rule["dst_ports"] && typeof rule["dst_ports"] !== "undefined" &&
            rule["dst_ports"].length > 0) {
            var portDesc = [];
            if (rule["dst_ports"].length === 1 && rule["dst_ports"][0]["start_port"] === -1) {
                $(inputTxtDestPorts).val("Any");
            } else {
                for (var i = 0; i < rule["dst_ports"].length; i++) {
                    if (rule["dst_ports"][i]["end_port"] !== -1)
                        portDesc[i] = rule["dst_ports"][i]["start_port"] + " - " + rule["dst_ports"][i]["end_port"];
                    else
                        portDesc[i] = rule["dst_ports"][i]["start_port"];
                }
                $(inputTxtDestPorts).val(portDesc.join(","));
            }
        }
    }
    return rootDiv;
};

function deleteRuleEntry(who) {
    var templateDiv = who.parentNode.parentNode.parentNode;
    $(templateDiv).remove();
    templateDiv = $();
};

function populateDomains(result) {
    var domainsJSON, domainsDS = [];
    if (result && result.domains && result.domains.length > 0) {
        domainsJSON = result.domains;
        for (var i = 0; i < domainsJSON.length; i++) {
            domainsDS.push({text:domainsJSON[i]['fq_name'][0], value:domainsJSON[i]['uuid']});
        }
        ddDomain.data("kendoDropDownList").dataSource.data(domainsDS);
    }
    fetchProjects("populateProjects");
};

function handleDomains() {
    fetchDataForGridAnalyzer();
};

function populateProjects(result) {
    var projectJSON, projectDS = [];
    if (result && result.projects && result.projects.length > 0) {
        projectJSON = result.projects;
        for (var i = 0; i < projectJSON.length; i++) {
            projectDS.push({"text":projectJSON[i]['fq_name'][1], "value":projectJSON[i]['uuid']});
        }
        ddProject.data("kendoDropDownList").dataSource.data(projectDS);
        var selProjectObj = getSelectedProjectObj();
        $("#ddProjectSwitcher").data("kendoDropDownList").value(selProjectObj);
    }
    check4AnalyzerImage();
    fetchDataForGridAnalyzer();
};

function handleProjects(e) {
    var pname = e.sender._current.text();
    setCookie("project", pname);
    fetchDataForGridAnalyzer();
};

function fetchDataForGridAnalyzer() {
    var selectedProjectUUID = $(ddProjectSwitcher).val();
    var url = "/api/tenants/config/service-instances/" + selectedProjectUUID + "?template=analyzer-template";
    showGridLoading("#gridAnalyzer");
    doAjaxCall(url, "GET", null, "successHandlerForGridAnalyzer", "failureHandlerForGridAnalyzer", null, null);
};

function successHandlerForGridAnalyzer(result) {
    var uuids = jsonPath(result, "$..policyuuid");
    var getAjaxs = [];
    for (var i = 0; i < uuids.length; i++) {
        getAjaxs[i] = $.ajax({
            url:"/api/tenants/config/policy/" + uuids[i],
            type:"GET"
        });
    }
    $.when.apply($, getAjaxs).then(
        function () {
            //all success
            var analyzerPolicy = arguments;
            successHandlerForGridAnalyzerRow(analyzerPolicy, result.service_instances);
        },
        function () {
            //If atleast one api fails
            var results = arguments;
            failureHandlerForGridAnalyzerRow(results);
        });
};

function failureHandlerForGridAnalyzer(result) {
    showGridMessage("#gridAnalyzer", "Error in getting data.");
};

function successHandlerForGridAnalyzerRow(analyzerPolicy, analyzers) {
    var analyzerData = [];
    var policies = jsonPath(analyzerPolicy, "$..network-policy");
    configObj["network-policys"] = [];
    var reload = false;
    var virtualNetwork = "Automatic";
    for (var i = 0; i < policies.length; i++) {
        configObj["network-policys"][i] = policies[i];
        var policy = policies[i], vmUUId;
        var policyName = jsonPath(policy, "$.fq_name[2]");

        if (typeof policyName === "object" && policyName.length === 1)
            policyName = policyName[0];
        else
            policyName = "-";

        var uuid = jsonPath(policy, "$.uuid");
        if (typeof uuid === "object" && uuid.length === 1)
            uuid = uuid[0];

        var networks = jsonPath(policy, "$.virtual_network_back_refs[*].to[2]");
        if (networks === false) {
            networks = ["-"];
        }

        if (policy["network_policy_entries"] && policy["network_policy_entries"]["policy_rule"] &&
            policy["network_policy_entries"]["policy_rule"].length > 0) {
            var ruleDescriptions = [];
            var policyEntries = policy["network_policy_entries"]["policy_rule"];
            for (var j = 0; j < policyEntries.length; j++) {
                var rule = policyEntries[j];
                ruleDescriptions[j] = formatPolicyRule(rule);
            }
        } else {
            ruleDescriptions = ["-"];
        }
        var vmBackRefs = analyzers[i]['ConfigData']['service-instance']['virtual_machine_back_refs'];
        if(vmBackRefs == null || vmBackRefs.length == 0) {
            vmUUId = null;
            reload = true;
        } else {
            vmUUId = vmBackRefs[0]["uuid"]
        }
        if(analyzers[i]['ConfigData']['service-instance']['service_instance_properties']['left_virtual_network'] != "") {
            virtualNetwork = getVNName(analyzers[i]['ConfigData']['service-instance']['service_instance_properties']['left_virtual_network']);
        } else {
            virtualNetwork = "Automatic";
        }

        analyzerData.push({
            "Id":i, "NetworkPolicy":policyName, "PolicyRules":ruleDescriptions, "PolicyUUID":uuid, "AnalyzerName":analyzers[i]['ConfigData']['service-instance']['fq_name'][2],
            "VirtualNetwork": virtualNetwork, "AnalyzerUUID":analyzers[i]['ConfigData']['service-instance']['uuid'],
            "AssociatedNetworks":networks, "VMUUID": vmUUId, vmStatus: analyzers[i].vmStatus
        });
    }
    dsGridAnalyzer.data(analyzerData);
    check4GridEmpty("#gridAnalyzer", "No Analyzer found.");
    if(reload) {
        setTimeout("fetchDataForGridAnalyzer()", 30000);
    }
};

function failureHandlerForGridAnalyzerRow(result, cbParam) {
    showGridMessage("#gridAnalyzer", "Error in getting data.");
};

function initgridAnalyzerDetail(e) {
};

function gridAnalyzerRowChange(arg) {
};

function gridAnalyzerSelectAllRows(args) {
    var tableId = args.id.split("_")[1];
    var checked = $("#cb_" + tableId)[0].checked;
    if (checked === true)
        $("tr", "#" + tableId).addClass('k-state-selected');
    else
        $("tr", "#" + tableId).removeClass('k-state-selected');

    var tableRows = $("#" + tableId).data("kendoGrid").dataSource.data();
    if (tableRows && tableRows.length > 0) {
        for (var i = 0; i < tableRows.length; i++) {
            $("#" + tableId + "_" + i)[0].checked = checked;
        }
    }
};

function gridAnalyzerSelectRow(args) {
    var tableId = args.id.split("_")[0];
    var tableRowId = parseInt(args.id.split("_")[1]);
    tableRowId += 1;
    var checked = args.checked;
    if (checked === true)
        $($("tr", "#" + tableId)[tableRowId]).addClass('k-state-selected');
    else
        $($("tr", "#" + tableId)[tableRowId]).removeClass('k-state-selected');

};

function closeCreateAnalyzerWindow() {
    clearValuesFromDomElements();
};

function clearValuesFromDomElements() {
    mode = "";
    txtPolicyName.val("");
    txtAnalyzerName.val("")
    txtAnalyzerName[0].disabled = false;
    msAssociatedNetworks.data("kendoMultiSelect").value("");
    dlVirtualNetwork.data("kendoDropDownList").value("Automatic");
    dlVirtualNetwork.data("kendoDropDownList").enable(true);
    clearRuleEntries();
};

function clearRuleEntries() {
    var tuples = $("#ruleTuples")[0].children;
    if (tuples && tuples.length > 0) {
        var tupleLength = tuples.length;
        for (var i = 0; i < tupleLength; i++) {
            $(tuples[0]).remove();
        }
    }
};

function launchAnalyzer() {
    var selectedProject = $("#ddProjectSwitcher").children(":selected").text();
    var selectedRow = gridAnalyzer.dataItem(gridAnalyzer.select());
    var vmUUID = selectedRow['VMUUID'];
    var analyzerName = selectedRow['AnalyzerName'];
    if(vmUUID == null) {
        showInfoWindow("Analyzer is not ready. Please try after few minutes.", "Launch Analyzer")
    } else {
        var url = "/api/tenants/config/service-instance-vm?project_id=" + selectedProject + "&vm_id=" + vmUUID;
        doAjaxCall(url, "GET", null, "launchAnayzerInstanceCB", "failureLaunchVNCcb", false, {"sameWindow": true, "title": "VNC Console: " + analyzerName});
    }
};

function launchAnayzerInstanceCB(result, cbParams){
    var href = jsonPath(result, "$.console.url")[0];
    document.getElementById("consoleText").innerHTML = "";
    document.getElementById("consoleText").innerHTML = "If console is not responding to keyboard input: click the grey status bar below.&nbsp;&nbsp;<a href='"+href+"' style='text-decoration: underline' target=_blank>Click here to show only console</a>";
    launchVNCcb(result, cbParams);
    $("body").animate({scrollTop:$("body")[0].scrollHeight-$("#vnc-console-widget").height()-60}, 1500);

}

function showAnalyzerEditWindow(mode) {
    var selectedDomain = $("#ddDomainSwitcher").children(":selected").text();
    var selectedProject = $("#ddProjectSwitcher").children(":selected").text();
    var getAjaxs = [];
    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/virtual-networks?tenant_id=" + selectedDomain + ":" + selectedProject,
        type:"GET"
    });

    var selectedDomainUUID = $(ddDomainSwitcher).val();
    getAjaxs[1] = $.ajax({
        url:"/api/tenants/config/service-instance-templates/" + selectedDomainUUID,
        type:"GET"
    });

    $.when.apply($, getAjaxs).then(
        function () {
            //all success
            clearValuesFromDomElements();
            var results = arguments;
            var vns = jsonPath(results[0][0], "$.virtual-networks[*].fq_name[2]");
            var vnsWithAutomatic = ["Automatic"].concat(vns);
            var virtualNetworks = jsonPath(results[0][0], "$.virtual-networks[*]");
            configObj["virtual-networks"] = [];
            if (null !== virtualNetworks && typeof virtualNetworks === "object" && virtualNetworks.length > 0) {
                for (var i = 0; i < virtualNetworks.length; i++) {
                    configObj["virtual-networks"][i] = {};
                    configObj["virtual-networks"][i] = virtualNetworks[i];
                }
            }

            msAssociatedNetworks.data("kendoMultiSelect").dataSource.data(vns);
            dlVirtualNetwork.data("kendoDropDownList").dataSource.data(vnsWithAutomatic);

            var sts = jsonPath(results[1][0], "$.service_templates[*].service-template");
            configObj["service_templates"] = [];
            if (null !== sts && sts.length > 0) {
                for (var i = 0; i < sts.length; i++) {
                    configObj["service_templates"][i] = {};
                    configObj["service_templates"][i]["service-template"] = sts[i];
                }
            }

            if (mode === "add") {
                windowCreateAnalyzer.find('.modal-header-title').text('Create Analyzer');
            } else if (mode === "edit") {
                var selectedRow = gridAnalyzer.dataItem(gridAnalyzer.select());
                windowCreateAnalyzer.find('.modal-header-title').text('Edit Analyzer: ' + selectedRow.AnalyzerName);
                txtPolicyName.val(selectedRow.NetworkPolicy);
                txtAnalyzerName.val(selectedRow.AnalyzerName)
                txtAnalyzerName[0].disabled = true;

                dlVirtualNetwork.data("kendoDropDownList").value(selectedRow.VirtualNetwork);
                dlVirtualNetwork.data("kendoDropDownList").enable(false);

                var rowId = selectedRow["Id"];
                var selectedAnalyzer = configObj["network-policys"][rowId];

                var networks = jsonPath(selectedAnalyzer, "$.virtual_network_back_refs[*].to[2]");
                if (networks && networks.length > 0) {
                    msAssociatedNetworks.data("kendoMultiSelect").value(networks);
                } else {
                    msAssociatedNetworks.data("kendoMultiSelect").value("");
                }
                if (selectedAnalyzer["network_policy_entries"] && selectedAnalyzer["network_policy_entries"]["policy_rule"] &&
                    selectedAnalyzer["network_policy_entries"]["policy_rule"].length > 0) {
                    var policyEntries = selectedAnalyzer["network_policy_entries"]["policy_rule"];
                    for (var j = 0; j < policyEntries.length; j++) {
                        var rule = policyEntries[j];
                        var ruleEntry = createRuleEntry(rule);
                        $(ruleTuples).append(ruleEntry);
                    }
                }
            }
            windowCreateAnalyzer.modal("show");
        },
        function () {
            //If atleast one api fails
            var results = arguments;

        });
};

function createAnalyzerSuccessCB() {
    var analyzerPolicyName = getDefaultAnalyzerPolicyName(txtAnalyzerName.val());
    var analyzerPolicy = getAnalyzerPolicy(analyzerPolicyName);
    doAjaxCall("/api/tenants/config/policys", "POST", JSON.stringify(analyzerPolicy), "createPolicySuccessCB", "createPolicyFailureCB");
};

function createAnalyzerFailureCB(error) {
    windowCreateAnalyzer.modal("hide");
    showInfoWindow("Error in Analyzer creation: " + error.responseText, "Error");
};

function createPolicySuccessCB() {
    windowCreateAnalyzer.modal("hide");
    fetchDataForGridAnalyzer();
};

function createPolicyFailureCB() {
    windowCreateAnalyzer.modal("hide");
    fetchDataForGridAnalyzer();
};

function validate() {
    if (validateAnalyzer() && validatePolicy()) {
        return true;
    } else {
        return false;
    }
};

function validatePolicy() {
    return true;
};

function validateAnalyzer() {
    if ($(txtAnalyzerName).val().trim() == "") {
        showInfoWindow("Enter a valid instance name.", "Input Required.");
        return false;
    }
    return true;
};

function destroy() {
    windowCreateAnalyzer = $("#windowCreateAnalyzer");
    windowCreateAnalyzer.remove();
    windowCreateAnalyzer = $();
    
    confirmDelete = $("#confirmDelete");
    confirmDelete.remove();
    confirmDelete = $();
};

function getAnalyzerPolicy(analyzerPolicyName) {
    var selectedDomain = $("#ddDomainSwitcher").children(":selected").text();
    var selectedProject = $("#ddProjectSwitcher").children(":selected").text();

    var analyzerPolicy = {};
    analyzerPolicy["network-policy"] = {};
    analyzerPolicy["network-policy"]["parent_type"] = "project";

    analyzerPolicy["network-policy"]["fq_name"] = [];
    analyzerPolicy["network-policy"]["fq_name"][0] = selectedDomain;
    analyzerPolicy["network-policy"]["fq_name"][1] = selectedProject;
    analyzerPolicy["network-policy"]["fq_name"][2] = analyzerPolicyName ? analyzerPolicyName : txtPolicyName.val();

    var networks = msAssociatedNetworks.data("kendoMultiSelect").value();
    if (networks && networks.length > 0) {
        analyzerPolicy["network-policy"]["virtual_network_back_refs"] = [];
        for (var i = 0; i < networks.length; i++) {
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i] = {};
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["attr"] = {};
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["attr"]["timer"] = {"start_time":""};
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["attr"]["sequence"] = null;
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["uuid"] = jsonPath(configObj, "$..virtual-networks[?(@.fq_name[2]=='" + networks[i] + "')]")[0]["uuid"];
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["to"] = [];
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["to"][0] = selectedDomain;
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["to"][1] = selectedProject;
            analyzerPolicy["network-policy"]["virtual_network_back_refs"][i]["to"][2] = networks[i];
        }
    }

    var ruleTuples = $("#ruleTuples")[0].children;
    if (ruleTuples && ruleTuples.length > 0) {
        analyzerPolicy["network-policy"]["network_policy_entries"] = {};
        analyzerPolicy["network-policy"]["network_policy_entries"]["policy_rule"] = [];
        for (var i = 0; i < ruleTuples.length; i++) {
            analyzerPolicy["network-policy"]["network_policy_entries"]["policy_rule"][i] = {};
            var rule = analyzerPolicy["network-policy"]["network_policy_entries"]["policy_rule"][i];

            var ruleTuple = $($(ruleTuples[i]).find("div")[0]).children();
            var action = null;

            var protocol = $($(ruleTuple[0]).find("select")).data("kendoDropDownList").text();
            protocol = getProtocol(protocol);
            var srcVN = $($(ruleTuple[1]).find("select")).data("kendoDropDownList").text();
            srcVN = checkValidSourceNetwork(srcVN);
            srcVN = getFQNofVN(srcVN);

            var srcPorts = $($(ruleTuple[2]).find("input")).val();

            var direction = $($(ruleTuple[3]).find("select")).data("kendoDropDownList").text();
            if (direction !== "<>" && direction !== ">") {
                direction = "<>";
            }

            var destVN = $($(ruleTuple[4]).find("select")).data("kendoDropDownList").text();
            destVN = checkValidDestinationNetwork(destVN);
            destVN = getFQNofVN(destVN);

            var destPorts = $($(ruleTuple[5]).find("input")).val();

            var applyServices = null;
            var mirrorTo = selectedDomain + ":" + selectedProject + ":" + txtAnalyzerName.val();

            rule["application"] = [];
            rule["rule_sequence"] = {};
            rule["rule_sequence"]["major"] = -1;
            rule["rule_sequence"]["minor"] = -1;

            rule["ui_rule_id"] = {};
            if (i == 0) {
                rule["ui_rule_id"]["first"] = null;
            } else if (i == ruleTuples.length - 1) {
                rule["ui_rule_id"]["last"] = null;
            } else {
                rule["ui_rule_id"]["after"] = i - 1 + ".0"
            }
            rule["direction"] = direction;
            rule["protocol"] = protocol.toLowerCase();

            rule["action_list"] = {};
            rule["action_list"]["simple_action"] = action;
            rule["action_list"]["gateway_name"] = null;

            if (applyServices && applyServices.length > 0) {
                rule["action_list"]["apply_service"] = getApplyServices(applyServices);
            } else {
                rule["action_list"]["apply_service"] = null;
            }

            if (mirrorTo && "" !== mirrorTo.trim()) {
                rule["action_list"]["mirror_to"] = {};
                rule["action_list"]["mirror_to"]["analyzer_name"] = mirrorTo;
            } else {
                rule["action_list"]["mirror_to"] = null;
            }
            populateAddressesInRule("src", rule, srcVN);
            populateAddressesInRule("dst", rule, destVN);
            populatePortsInRule("src", rule, srcPorts);
            populatePortsInRule("dst", rule, destPorts);
        }
    }
    return analyzerPolicy;
};

function getAnalyzer() {
    var analyzerInstance = {};
    var selectedDomaindd = $("#ddDomainSwitcher").data("kendoDropDownList");
    var selectedDomain = selectedDomaindd.text();
    var selectedProjectdd = $("#ddProjectSwitcher").data("kendoDropDownList");
    var selectedProject = selectedProjectdd.text();
    var leftVN = $(dlVirtualNetwork).val();

    leftVN = getFormatVNName(leftVN);
    leftVN = leftVN != "" ? getFQNofVN(leftVN) : leftVN;

    analyzerInstance["service-instance"] = {};
    analyzerInstance["service-instance"]["parent_type"] = "project";
    analyzerInstance["service-instance"]["fq_name"] = [];
    analyzerInstance["service-instance"]["fq_name"] = [selectedDomain, selectedProject, $(txtAnalyzerName).val()];

    analyzerInstance["service-instance"]["service_template_refs"] = [];
    analyzerInstance["service-instance"]["service_template_refs"][0] = {};
    analyzerInstance["service-instance"]["service_template_refs"][0]["to"] = [];
    analyzerInstance["service-instance"]["service_template_refs"][0]["to"] = [selectedDomain, "analyzer-template"];

    analyzerInstance["service-instance"]["service_instance_properties"] = {};

    analyzerInstance["service-instance"]["service_instance_properties"]["scale_out"] = {};
    analyzerInstance["service-instance"]["service_instance_properties"]["scale_out"]["max_instances"] = 1;
    analyzerInstance["service-instance"]["service_instance_properties"]["scale_out"]["auto_scale"] = false;

    analyzerInstance["service-instance"]["service_instance_properties"]["right_virtual_network"] = "";
    analyzerInstance["service-instance"]["service_instance_properties"]["management_virtual_network"] = "";
    analyzerInstance["service-instance"]["service_instance_properties"]["left_virtual_network"] = leftVN;
    return analyzerInstance;
};

function getDefaultAnalyzerPolicyName(analyzerName) {
    var policyName = null;
    if (analyzerName) {
        analyzerName = analyzerName.trim().replace(' ', '-');
        policyName = 'default-analyzer-' + analyzerName + '-policy';
    }
    return policyName;
};

function populatePortsInRule(type, rule, ports) {
    var portType = type + "_ports",
        startPortsArray = [], endPortsArray = [];
    var startPorts = getStartPort(ports);
    if (startPorts != -1) {
        startPortsArray = startPorts.split(",");
    }

    var endPorts = getEndPort(ports);
    if (endPorts != -1) {
        endPortsArray = endPorts.split(",");
    }

    if (startPortsArray != -1 && endPortsArray != -1 && startPortsArray.length > 0 && endPortsArray.length > 0) {
        rule[portType] = [];
        if(checkValidPortRange(startPortsArray, endPortsArray, type == 'src' ? true : false) === true) {
            for (var j = 0; j < startPortsArray.length; j++) {
                rule[portType][j] = {};
                rule[portType][j]["start_port"] = parseInt(startPortsArray[j]);
                rule[portType][j]["end_port"] = parseInt(endPortsArray[j]);
            }
        }
    } else {
        rule[portType] = [{}];
        rule[portType][0]["start_port"] = -1;
        rule[portType][0]["end_port"] = -1;
    }
};

function populateAddressesInRule(type, rule, vn) {
    var addressType = type + "_addresses";
    rule[addressType] = [];
    rule[addressType][0] = {};
    rule[addressType][0]["security_group"] = null;
    rule[addressType][0]["subnet"] = null;
    if (vn && vn !== "") {
        if ("any" === vn.toLowerCase()) {
            rule[addressType][0]["virtual_network"] = "any";
        } else {
            rule[addressType][0]["virtual_network"] = vn;
        }
    }
};

function getVNName(vnFullName) {
    var vnArray;
    if(vnFullName == "any" || vnFullName == "local") {
        return vnFullName
    } else {
        vnArray = vnFullName.split(":");
        if (vnArray.length == 3) {
            return vnArray[2];
        } else {
            return null;
        }
    }
};

function check4AnalyzerImage() {
    var selectedDomain = $("#ddDomainSwitcher").children(":selected").text();
    var url = '/api/tenants/config/service-template-images/' + selectedDomain;
    doAjaxCall(url, "GET", null, "successHandler4AnalyzerImage", "failureHandler4AnalyzerImage");
};

function successHandler4AnalyzerImage(result) {
    var images = result.images;
    PacketCaptureObj.isAnalyzerImageCheckDone = true;
    if(images != null) {
        for(var i = 0; i < images.length; i++) {
            if(images[i].name == 'analyzer') {
                PacketCaptureObj.isAnalyzerImageAvailable = true;
                break;
            }
        }
    }
};

function failureHandler4AnalyzerImage(error) {
    showInfoWindow("Error in getting analyzer image.", "Error");
    PacketCaptureObj.isAnalyzerImageAvailable = false;
    PacketCaptureObj.isAnalyzerImageCheckDone = true;
};