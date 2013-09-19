/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

networkpolicyConfigObj = new networkPolicyConfigObj();

function networkPolicyConfigObj() {
    //Variable definitions
    //Dropdowns
    var ddDomain, ddProject, ddIPOptions;

    //Comboboxes

    //Grids
    var gridPolicy;

    //Buttons
    var btnCreatePolicy, btnDeletePolicy, btnCreatePolicyCancel, btnCreatePolicyOK, btnAddRule, btnDeleteRule,
    btnRemovePopupOK, btnRemovePopupCancel, btnCnfRemoveMainPopupOK, btnCnfRemoveMainPopupCancel;

    //Textboxes
    var txtPolicyName;

    //Multiselects
    var msAssociatedNetworks;

    //Datasources
    var dsGridPolicy;

    //Windows
    var windowCreatePolicy, confirmRemove, confirmMainRemove;

    //Method definitions
    this.load = load;
    this.init = init;
    this.initComponents = initComponents;
    this.initActions = initActions;
    this.fetchData = fetchData;
    this.fetchDataForGridPolicy = fetchDataForGridPolicy;
    this.populateDomains = populateDomains;
    this.handleDomains = handleDomains;
    this.populateProjects = populateProjects;
    this.handleProjects = handleProjects;
    this.deletePolicy = deletePolicy;
    this.showPolicyEditWindow = showPolicyEditWindow;
    this.closeCreatePolicyWindow = closeCreatePolicyWindow;
    this.successHandlerForGridPolicy = successHandlerForGridPolicy;
    this.failureHandlerForGridPolicy = failureHandlerForGridPolicy;
    this.createPolicySuccessCb = createPolicySuccessCb;
    this.createPolicyFailureCb = createPolicyFailureCb;
    this.validate = validate;
    this.destroy = destroy;
}

function load() {
    var configTemplate = kendo.template($("#policy-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    currTab = 'config_net_policies';

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
    btnCreatePolicy = $("#btnCreatePolicy");
    btnDeletePolicy = $("#btnDeletePolicy");
    btnAddRule = $("#btnAddRule");
    btnDeleteRule = $("#btnDeleteRule");
    btnCreatePolicyCancel = $("#btnCreatePolicyCancel");
    btnCreatePolicyOK = $("#btnCreatePolicyOK");
    btnRemovePopupOK = $("#btnRemovePopupOK");
    btnRemovePopupCancel = $("#btnRemovePopupCancel");
    btnCnfRemoveMainPopupOK = $("#btnCnfRemoveMainPopupOK");
    btnCnfRemoveMainPopupCancel = $("#btnCnfRemoveMainPopupCancel");

    txtPolicyName = $("#txtPolicyName");

    ddDomain = $("#ddDomain").kendoDropDownList({
        change:handleDomains
    });
    ddProject = $("#ddProject").kendoDropDownList({});

    msAssociatedNetworks = $("#msAssociatedNetworks").kendoMultiSelect();

    dsGridPolicy = new kendo.data.DataSource({
        batch:true
    });

    gridPolicy = $("#gridPolicy").contrailKendoGrid({
        dataSource:dsGridPolicy,
        sortable: false,
        columnMenu: false,
        scrollable:false,
        pageable:false,
        selectable: true,
        change:this.gridPolicyRowChange,
        columns:[
            {
                field:"",
                menu: false,
                title:"<input id='cb_gridPolicy' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btnDeletePolicy'); /><span class='ace-lbl'></span>",
                width:30,
                template:"<input id='gridPolicy_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btnDeletePolicy'); /><span class='ace-lbl'></span>"
            },
            {
                field:"NetworkPolicy",
                title:"Network Policy"
            },
            {
                field:"AssociatedNetworks",
                title:"Associated Networks",
                template: 
                    ' # if(typeof AssociatedNetworks === "object") { # ' + 
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
                title:"Rules",
                template: 
                    ' # if(typeof PolicyRules === "object") { # ' + 
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
                template: 
                    '<div class="inline position-relative">' +
                    '    <div class="dropdown-toggle" data-toggle="dropdown">' +
                    '        <i class="icon-cog icon-only bigger-110"></i>' +
                    '    </div>' +
                    '    <ul class="dropdown-menu dropdown-icon-only dropdown-light pull-right dropdown-caret dropdown-close">' +
                    '        <li>' +
                    '            <a onclick="showPolicyEditWindow(\'edit\');" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
                    '                <i class="icon-edit"></i> &nbsp; Edit' +
                    '            </a>' +
                    '        </li>' +
                    '        <li>' +
                    '            <a onclick="showRemoveWindow();" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                    '            	<i class="icon-trash"></i> &nbsp; Delete' +
                    '            </a>' +
                    '        </li>' +
                    '    </ul>' +
                    '</div>'
            }
        ],
        detailTemplate:kendo.template($("#gridPolicyDetailTemplate").html()),
        detailInit:initgridPolicyDetail,
        searchToolbar: true,
        showSearchbox: true,
        searchPlaceholder: 'Search Policies',
        widgetGridTitle: '',
        collapseable: false
    });

    gridPolicy = $("#gridPolicy").data("kendoGrid");
    showGridLoading("#gridPolicy");
    
    $('body').append($("#windowCreatePolicy"));
    windowCreatePolicy = $("#windowCreatePolicy");
    windowCreatePolicy.on("hide", closeCreatePolicyWindow);
    windowCreatePolicy.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmMainRemove"));
    confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.modal({backdrop:'static', keyboard: false, show:false});

    $('body').append($("#confirmRemove"));
    confirmRemove = $("#confirmRemove");
    confirmRemove.modal({backdrop:'static', keyboard: false, show:false});
}

function deletePolicy(selected_rows) {
	//showMessageDialog();
	btnDeletePolicy.attr("disabled","disabled");
    var deleteAjaxs = [];
    if (selected_rows && selected_rows.length > 0) {
        for (var i = 0; i < selected_rows.length; i++) {
        	var selected_row_data = selected_rows[i];
            deleteAjaxs[i] = $.ajax({
                url:"/api/tenants/config/policy/" + selected_row_data["PolicyUUID"],
                type:"DELETE"
            });
        }
        $.when.apply($, deleteAjaxs).then(
            function () {
                //all success
                var results = arguments;
                //showSuccessMessage();
                fetchDataForGridPolicy();
            },
            function () {
                //If atleast one api fails
                var results = arguments;
                //closeMessageDialog(0);
                fetchDataForGridPolicy();
            });
    }
}

function initActions() {
    btnCreatePolicy.click(function (e) {
        e.preventDefault();
        showPolicyEditWindow("add");
        return false;
    });

    btnDeletePolicy.click(function (a) {
        confirmMainRemove.find('.modal-header-title').text("Confirm");
        confirmMainRemove.modal('show');
    });

    btnRemovePopupCancel.click(function (a) {
        confirmRemove.modal('hide');
    });

    btnCnfRemoveMainPopupCancel.click(function (a) {
        confirmMainRemove.modal('hide')
    });

    btnRemovePopupOK.click(function (a) {
    	var selected_row = gridPolicy.dataItem(gridPolicy.select());
    	deletePolicy([selected_row]);
        confirmRemove.modal('hide');
    });

    btnCnfRemoveMainPopupOK.click(function (a) {
        var selected_rows = getCheckedRows("gridPolicy");
        deletePolicy(selected_rows);
        confirmMainRemove.modal('hide');
    });

    btnCreatePolicyCancel.click(function (a) {
        windowCreatePolicy.hide();
    });

    btnCreatePolicyOK.click(function (a) {
        if (validate() !== true)
            return;

        var selectedDomain = $(ddDomain).val();
        var selectedProject = $(ddProject).val();
        if(!isValidDomainAndProject(selectedDomain, selectedProject)) {
        	showGridMessage("#gridVN", "Error in getting data.");
        	return;
        }

        var policyConfig = {};
        policyConfig["network-policy"] = {};
        policyConfig["network-policy"]["parent_type"] = "project";

        policyConfig["network-policy"]["fq_name"] = [];
        policyConfig["network-policy"]["fq_name"][0] = selectedDomain;
        policyConfig["network-policy"]["fq_name"][1] = selectedProject;
        policyConfig["network-policy"]["fq_name"][2] = txtPolicyName.val();

        var networks = msAssociatedNetworks.data("kendoMultiSelect").value();
        if (networks && networks.length > 0) {
            policyConfig["network-policy"]["virtual_network_back_refs"] = [];
            for (var i = 0; i < networks.length; i++) {
                policyConfig["network-policy"]["virtual_network_back_refs"][i] = {};
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["attr"] = {};
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["attr"]["timer"] = null;
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["attr"]["sequence"] = null;
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["uuid"] = jsonPath(configObj, "$..virtual-networks[?(@.fq_name[2]=='" + networks[i] + "')]")[0]["uuid"];
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["to"] = [];
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["to"][0] = selectedDomain;
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["to"][1] = selectedProject;
                policyConfig["network-policy"]["virtual_network_back_refs"][i]["to"][2] = networks[i];
            }
        }

        var ruleTuples = $("#ruleTuples")[0].children;
        if (ruleTuples && ruleTuples.length > 0) {
            policyConfig["network-policy"]["network_policy_entries"] = {};
            policyConfig["network-policy"]["network_policy_entries"]["policy_rule"] = [];
            for (var i = 0; i < ruleTuples.length; i++) {
                policyConfig["network-policy"]["network_policy_entries"]["policy_rule"][i] = {};
                var rule = policyConfig["network-policy"]["network_policy_entries"]["policy_rule"][i];

                var ruleTuple = $($(ruleTuples[i]).find("div")[0]).children();

                var action = $($(ruleTuple[0]).find("select")).data("kendoDropDownList").text();
                action = action.toLowerCase();
                if($($(ruleTuple[0]).find("select"))[0].disabled === true) {
                	action = null;
                }

                var protocol = $($(ruleTuple[1]).find("select")).data("kendoDropDownList").text();
                protocol = getProtocol(protocol);

                var srcVN = $($(ruleTuple[2]).find("select")).data("kendoDropDownList").text();
                srcVN = checkValidSourceNetwork(srcVN);
                srcVN = getFQNofVN(srcVN);
                var srcPorts = $($(ruleTuple[3]).find("input")).val();

                var direction = $($(ruleTuple[4]).find("select")).data("kendoDropDownList").text();
                if($($(ruleTuple[4]).find("select"))[0].disabled === true) {
                	direction = "<>";
                }
                if (direction !== "<>" && direction !== ">") {
                    direction = "<>";
                }

                var destVN = $($(ruleTuple[5]).find("select")).data("kendoDropDownList").text();
                destVN = checkValidDestinationNetwork(destVN);
                destVN = getFQNofVN(destVN);
                var destPorts = $($(ruleTuple[6]).find("input")).val();
        		var applyServicesEnabled = $($(ruleTuple[7]).find("input"))[0].checked;
        		var mirrorServicesEnabled = $($(ruleTuple[8]).find("input"))[0].checked
        		
        		var applyServices = [];
        		var mirrorTo = [];
        		if(applyServicesEnabled == true) {
        			var id = $($(ruleTuple[7]).find("input"))[0].id;
        			var div_id = id + "_root";
        			applyServices = 
        				$($("#" + div_id).find("select")).data("kendoMultiSelect").value();
        		}
        		
        		if(mirrorServicesEnabled == true) {
        			var id = $($(ruleTuple[8]).find("input"))[0].id;
        			var div_id = id + "_root";
        			var div = $("#" + div_id);
        			mirrorTo = 
        				$($("#" + div_id).find("select")).data("kendoMultiSelect").value();
        		}

                rule["application"] = [];
                rule["rule_sequence"] = {};
                rule["rule_sequence"]["major"] = -1;
                rule["rule_sequence"]["minor"] = -1;

                rule["direction"] = direction;
                rule["protocol"] = protocol.toLowerCase();

                rule["action_list"] = {};
                rule["action_list"]["simple_action"] = action;
                rule["action_list"]["gateway_name"] = null;
                
                if (applyServices && applyServices.length > 0) {
                	for(var asCount=0; asCount<applyServices.length; asCount++) {
                		if(applyServices[asCount].indexOf(":") == -1) {
                			applyServices[asCount] =
                			selectedDomain + ":" + selectedProject + 
                			":" + applyServices[asCount];
                		}
                	}
                	rule["action_list"]["apply_service"] = applyServices;
                } else {
                    rule["action_list"]["apply_service"] = null;
                }

        		if(mirrorTo && mirrorTo.length > 0) {
                    rule["action_list"]["mirror_to"] = {};
                	for(var msCount=0; msCount<mirrorTo.length; msCount++) {
                		if(mirrorTo[msCount].indexOf(":") == -1) {
                			mirrorTo[msCount] =
                			selectedDomain + ":" + selectedProject + 
                			":" + mirrorTo[msCount];
                		}
                	}
                	rule["action_list"]["mirror_to"] = {"analyzer_name":mirrorTo[0]};
                }
                else {
                    rule["action_list"]["mirror_to"] = null;
                }

                rule["src_addresses"] = [];
                rule["src_addresses"][0] = {};
                rule["src_addresses"][0]["security_group"] = null;
                rule["src_addresses"][0]["subnet"] = null;
                if (srcVN && "" !== srcVN) {
                    if ("any" === srcVN.toLowerCase())
                        rule["src_addresses"][0]["virtual_network"] = "any";
                    else
                        rule["src_addresses"][0]["virtual_network"] = srcVN;
                }

                rule["dst_addresses"] = [];
                rule["dst_addresses"][0] = {};
                rule["dst_addresses"][0]["security_group"] = null;
                rule["dst_addresses"][0]["subnet"] = null;
                if (destVN && "" !== destVN) {
                    if ("any" === destVN.toLowerCase())
                        rule["dst_addresses"][0]["virtual_network"] = "any";
                    else
                        rule["dst_addresses"][0]["virtual_network"] = destVN;
                }

                var startPortsArray = getStartPort(srcPorts);
                if (startPortsArray != -1)
                    startPortsArray = startPortsArray.split(",");

                var endPortsArray = getEndPort(srcPorts);
                if (endPortsArray != -1)
                    endPortsArray = endPortsArray.split(",");

                if (startPortsArray != -1 && endPortsArray != -1 &&
                    startPortsArray.length > 0 && endPortsArray.length > 0) {
                    if(dontAllowPortsIfServiceEnabled(applyServicesEnabled, true, false) === true &&
                           dontAllowPortsIfServiceEnabled(mirrorServicesEnabled, true, true) === true) {
                        rule["src_ports"] = [];
                        if(checkValidPortRange(startPortsArray, endPortsArray, true) === true) {
                            for (var j = 0; j < startPortsArray.length; j++) {
                                rule["src_ports"][j] = {};
                                rule["src_ports"][j]["start_port"] = parseInt(startPortsArray[j]);
                                rule["src_ports"][j]["end_port"] = parseInt(endPortsArray[j]);
                            }
                        }

                    } else
                        return false;
                } else {
                    rule["src_ports"] = [{}];
                    rule["src_ports"][0]["start_port"] = -1;
                    rule["src_ports"][0]["end_port"] = -1;
                }

                startPortsArray = getStartPort(destPorts);
                if (startPortsArray != -1)
                    startPortsArray = startPortsArray.split(",");

                endPortsArray = getEndPort(destPorts);
                if (endPortsArray != -1)
                    endPortsArray = endPortsArray.split(",");

                if (startPortsArray != -1 && endPortsArray != -1 &&
                    startPortsArray.length > 0 && endPortsArray.length > 0) {
                    if(dontAllowPortsIfServiceEnabled(applyServicesEnabled, false, false) === true &&
                        dontAllowPortsIfServiceEnabled(mirrorServicesEnabled, false, true) === true) {
                        rule["dst_ports"] = [];
                        if(checkValidPortRange(startPortsArray, endPortsArray)) {
                            for (var j = 0; j < startPortsArray.length; j++) {
                                rule["dst_ports"][j] = {};
                                rule["dst_ports"][j]["start_port"] = parseInt(startPortsArray[j]);
                                rule["dst_ports"][j]["end_port"] = parseInt(endPortsArray[j]);
                            }
                        }
                    } else
                        return false;
                } else {
                    rule["dst_ports"] = [{}];
                    rule["dst_ports"][0]["start_port"] = -1;
                    rule["dst_ports"][0]["end_port"] = -1;
                }
            }
        }

        //console.log(policyConfig);
        if (txtPolicyName[0].disabled == true)
            mode = "edit";
        else
            mode = "add";
        //mode = "";
        if (mode === "add") {
            doAjaxCall("/api/tenants/config/policys", "POST", JSON.stringify(policyConfig),
                "createPolicySuccessCb", "createPolicyFailureCb");
        }
        else if (mode === "edit") {
            var policyUUID = jsonPath(configObj, "$.network-policys[?(@.fq_name[2]=='" + txtPolicyName.val() + "')]")[0].uuid;
            doAjaxCall("/api/tenants/config/policy/" + policyUUID, "PUT", JSON.stringify(policyConfig),
                "createPolicySuccessCb", "createPolicyFailureCb");
        }
        windowCreatePolicy.modal("hide");
        //showMessageDialog();
    });
}

function allowOnlyProtocolAnyIfServiceEnabled(serviceEnabled, protocol, mirrorService) {
	// Only Protocol ANY is allowed when service chaining is selected.
	var msg = "Only 'ANY' protocol allowed while " + 
		(mirrorService === true ? "mirroring" : "applying") + " services.";
	if(serviceEnabled === true && protocol !== "any") {
        showInfoWindow(msg, "Invalid Rule");
        return false;
	}
	return true;
}

function dontAllowPortsIfServiceEnabled(serviceEnabled, sourcePort, mirrorService) {
	// Only port(source and/or destination) ANY is allowed when service chaining is selected.	
    var msg = 
        "Only 'ANY' " + (sourcePort === true ? "source " : "destination ") + 
        "port allowed while " + (mirrorService === true ? "mirroring " : "applying ") + "services.";
    if(serviceEnabled === true) {
        showInfoWindow(msg, "Invalid Rule");
        return false;
    }
    return true;
}

function toggleApplyServiceDiv(e, nonAnalyzerInsts, val) {
	if(e.checked === true) {
		$(e.parentNode.parentNode.children[0]).find("select").data("kendoDropDownList").enable(false);
		$(e.parentNode.parentNode.children[4]).find("select").data("kendoDropDownList").enable(false);
		//Select always 'Pass' if applying service
		$(e.parentNode.parentNode.children[0]).find("select").data("kendoDropDownList").select(0);
		//Select always '<>' (Bidirectional) if applying service
		$(e.parentNode.parentNode.children[4]).find("select").data("kendoDropDownList").select(0);
		//Disabling 'any' on Src VN. 
		$($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0].disabled = true;
		$($($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).addClass("k-state-disabled");
		//Disabling 'local' on Src vn.
		$($($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0].disabled = true;
		$($($($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0]).addClass("k-state-disabled");
		
		//Disabling 'any' on Dest VN.
		$($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0].disabled = true;
		$($($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).addClass("k-state-disabled");
		//Disabling 'local' on Src vn.
		$($($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0].disabled = true;
		$($($($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0]).addClass("k-state-disabled");

		var tupleDiv = e.parentNode.parentNode.parentNode.children; 
		if(tupleDiv.length > 1) {
			//Either Apply service or Mirror service div is shown.
			for(var i=0; i<tupleDiv.length; i++) {
				var rootDiv = $(tupleDiv[i]);
				if(rootDiv.attr("id") && rootDiv.attr("id").indexOf("apply_service") != -1) {
					rootDiv.show();
					return;
				}
			}
		}
        var selectedDomain = $(ddDomain).val();
        var selectedProject = $(ddProject).val();
		
		var msApplyServices = document.createElement("select");
		msApplyServices.className = "span12";
		msApplyServices.setAttribute("multiple","multiple");
		msApplyServices.setAttribute("data-placeholder","Select Services in the order to apply..");
		
		var div = document.createElement("div");
		div.className = "row-fluid margin-0-0-5";
		div.appendChild(msApplyServices);
		var rootDiv = document.createElement("div");
		rootDiv.id = e.id + "_root";
		rootDiv.appendChild(div);
		
		$(msApplyServices).kendoMultiSelect();
		$(msApplyServices).data("kendoMultiSelect").list[0].style.minWidth="170px";
	    if (nonAnalyzerInsts && nonAnalyzerInsts.length > 0) {
	    	nonAnalyzerInsts = nonAnalyzerInsts.split(",");
	    	$(msApplyServices).data("kendoMultiSelect").dataSource.data(nonAnalyzerInsts);
	    	if(val && val.length > 0) {
	    		val = val.split(",");
	    		for(var i=0; i<val.length; i++) {
	    			if(val[i].split(":")[0] === selectedDomain &&
	    			    val[i].split(":")[1] === selectedProject) {
	    				val[i] = val[i].split(":")[2];	
	    			}
	    		}
	    		$(msApplyServices).data("kendoMultiSelect").value(val);
	    	}
	    	else {
	    		$(msApplyServices).data("kendoMultiSelect").value("");
	    	}
	    }
	    e.parentNode.parentNode.parentNode.appendChild(rootDiv);
	}
	else {
		/*If mirror_to checkbox is checked keep 'action' field disabled. 
		if($($(e.parentNode.parentNode.children[8]).find("input")[0])[0].checked === true)
			$(e.parentNode.parentNode.children[0]).find("select").data("kendoDropDownList").enable(false);
		else*/ 		
			$(e.parentNode.parentNode.children[0]).find("select").data("kendoDropDownList").enable(true);
			$(e.parentNode.parentNode.children[4]).find("select").data("kendoDropDownList").enable(true);
			//Enabling 'any' on Src VN.
		$($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0].disabled = false;
		$($($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).removeClass("k-state-disabled");
		//Enabling 'local' on Src VN.
		$($($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0].disabled = false;
		$($($($(e.parentNode.parentNode.children[2]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0]).removeClass("k-state-disabled");

		//Enabling 'any' on Dest VN.
		$($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0].disabled = false;
		$($($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).removeClass("k-state-disabled");
		//Enabling 'local' on Dest VN.
		$($($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0].disabled = false;
		$($($($(e.parentNode.parentNode.children[5]).find("select").data("kendoDropDownList").list[0]).children().children()[0]).next()[0]).removeClass("k-state-disabled");

		var tupleDiv = e.parentNode.parentNode.parentNode.children; 
		if(tupleDiv.length > 1) {
			//Either Apply service or Mirror service div is shown.
			for(var i=0; i<tupleDiv.length; i++) {
				var rootDiv = $(tupleDiv[i]);
				if(rootDiv.attr("id") && rootDiv.attr("id").indexOf("apply_service") != -1) {
					rootDiv.hide();
					return;
				}
			}
		}
	}
}

function toggleMirrorServiceDiv(e, serviceInsts, val) {
	if(e.checked === true) {
		//$(e.parentNode.parentNode.children[0]).find("select").data("kendoDropDownList").enable(false);
		var tupleDiv = e.parentNode.parentNode.parentNode.children; 
		if(tupleDiv.length > 1) {
			//Either Apply service or Mirror service div is shown.
			for(var i=0; i<tupleDiv.length; i++) {
				var rootDiv = $(tupleDiv[i]);
				if(rootDiv.attr("id") && rootDiv.attr("id").indexOf("mirror_service") != -1) {
					rootDiv.show();
					return;
				}
			}
		}
		var msMirrorServices = document.createElement("select");
		msMirrorServices.className = "span12";
		msMirrorServices.setAttribute("multiple","multiple");
		msMirrorServices.setAttribute("data-placeholder","Select a service to mirror.");
		
		var div = document.createElement("div");
		div.className = "row-fluid margin-0-0-5";
		div.appendChild(msMirrorServices);
		var form = document.createElement("form");
		form.appendChild(div);
		var rootDiv = document.createElement("div");
		rootDiv.appendChild(form);
		rootDiv.id = e.id + "_root";

        var selectedDomain = $(ddDomain).val();
        var selectedProject = $(ddProject).val();

		$(msMirrorServices).kendoMultiSelect();
		$(msMirrorServices).data("kendoMultiSelect").list[0].style.minWidth="170px";
	    if (serviceInsts && serviceInsts.length > 0) {
	    	serviceInsts = serviceInsts.split(",");
	    	$(msMirrorServices).data("kendoMultiSelect").dataSource.data(serviceInsts);
	    	if(val && val.length > 0) {
	    		val = val.split(",");
	    		for(var i=0; i<val.length; i++) {
	    			if(val[i].split(":")[0] === selectedDomain &&
		    		    val[i].split(":")[1] === selectedProject) {
		    			val[i] = val[i].split(":")[2];	
		    		}
	    		}
	    		$(msMirrorServices).data("kendoMultiSelect").value(val);
	    	}
	    	else {
	    		$(msMirrorServices).data("kendoMultiSelect").value("");
	    	}
	    }
	    e.parentNode.parentNode.parentNode.appendChild(rootDiv);
	}
	else {
		/*If apply_service checkbox is checked keep 'action' field disabled.
		if($($(e.parentNode.parentNode.children[7]).find("input")[0])[0].checked === true)
			$(e.parentNode.parentNode.children[0]).find("select").data("kendoDropDownList").enable(false);
		else 
			$(e.parentNode.parentNode.children[0]).find("select").data("kendoDropDownList").enable(true);
		 */

		var tupleDiv = e.parentNode.parentNode.parentNode.children; 
		if(tupleDiv.length > 1) {
			//Either Apply service or Mirror service div is shown.
			for(var i=0; i<tupleDiv.length; i++) {
				var rootDiv = $(tupleDiv[i]);
				if(rootDiv.attr("id") && rootDiv.attr("id").indexOf("mirror_service") != -1) {
					rootDiv.hide();
					return;
				}
			}
		}
	}
}

function appendRuleEntry(who, defaultRow) {
    var ruleEntry = createRuleEntry(null, $("#ruleTuples").children().length);
    if (defaultRow) {
        //$(ruleTuples).append(ruleEntry);
        $("#ruleTuples").prepend($(ruleEntry));
    } else {
        var parentEl = who.parentNode.parentNode.parentNode;
        parentEl.parentNode.insertBefore(ruleEntry, parentEl.nextSibling);
    }
}

function createRuleEntry(rule, len) {
    var selectAction = document.createElement("select");
    selectAction.className = "span1 pull-left";
    selectAction.setAttribute("placeholder", "Action (Pass)");
    var pass = document.createElement("option");
    pass.value = 0;
    pass.text = "PASS";
    var deny = document.createElement("option");
    deny.value = 1;
    deny.text = "DENY";
    selectAction.appendChild(pass);
    selectAction.appendChild(deny);

    var selectProtocol = document.createElement("select");
    selectProtocol.className = "span1 pull-left";
    selectProtocol.setAttribute("placeholder", "Protocol (any)");
    var any = document.createElement("option");
    any.value = 0;
    any.text = "ANY";
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
    selectSrcNetwork.setAttribute("placeholder", "Source network(any)");
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
    divRowFluidSrcPorts.className = "span1";
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
    selectDestNetwork.setAttribute("placeholder", "Destination network");
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
    divRowFluidDestPorts.className = "span1";
    divRowFluidDestPorts.appendChild(inputTxtDestPorts);

    var selectApplyService = document.createElement("input");
	selectApplyService.type = "checkbox";
	selectApplyService.className = "ace-input";
	selectApplyService.id = "cb_apply_service_" + len;
    var spanApplyService = document.createElement("span");
    spanApplyService.className = "ace-lbl";
    spanApplyService.innerHTML = "&nbsp;";
    var divRowFluidApplyService = document.createElement("div");
    divRowFluidApplyService.className = "span1";
    divRowFluidApplyService.appendChild(selectApplyService);
    divRowFluidApplyService.appendChild(spanApplyService);

    var selectMirrorTo = document.createElement("input");
    selectMirrorTo.type = "checkbox";
    selectMirrorTo.className = "ace-input";
    selectMirrorTo.id = "cb_mirror_service_" + len;
    var spanSelectMirrorTo = document.createElement("span");
    spanSelectMirrorTo.className = "ace-lbl";
    spanSelectMirrorTo.innerHTML = "&nbsp;";
    var divRowFluidMirrorTo = document.createElement("div");
    divRowFluidMirrorTo.className = "span1";
    divRowFluidMirrorTo.appendChild(selectMirrorTo);
    divRowFluidMirrorTo.appendChild(spanSelectMirrorTo);

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
    divRowFluidMargin10.appendChild(selectAction);
    divRowFluidMargin10.appendChild(selectProtocol);
    divRowFluidMargin10.appendChild(selectSrcNetwork);
    divRowFluidMargin10.appendChild(divRowFluidSrcPorts);
    divRowFluidMargin10.appendChild(selectDirection);
    divRowFluidMargin10.appendChild(selectDestNetwork);
    divRowFluidMargin10.appendChild(divRowFluidDestPorts);
    divRowFluidMargin10.appendChild(divRowFluidApplyService);
    divRowFluidMargin10.appendChild(divRowFluidMirrorTo);
    divRowFluidMargin10.appendChild(divPullLeftMargin5Plus);
    divRowFluidMargin10.appendChild(divPullLeftMargin5Minus);

    var rootDiv = document.createElement("div");
    rootDiv.id = "rule_" + len;
    rootDiv.className = 'rule-item';
    rootDiv.appendChild(divRowFluidMargin10);

    var vns = msAssociatedNetworks.data("kendoMultiSelect").dataSource.data();
    var selectedDomain = $(ddDomain).val();
    var selectedProject = $(ddProject).val();
    
    for (var i = 0; i < vns.length; i++) {
        var vn = vns[i];
		var virtualNetwork =
			jsonPath(configObj, "$..virtual-networks[?(@.fq_name[2]=='" + vn + "')]")[0]["fq_name"];
		var domain = virtualNetwork[0];
		var project = virtualNetwork[1];
        var srcVNOption = document.createElement("option");
        srcVNOption.value = i + 2;
        var destVNOption = document.createElement("option");
        destVNOption.value = i + 2;
        
        if(domain === selectedDomain && project === selectedProject) {
        	srcVNOption.text  = vn;
        	destVNOption.text = vn;
        }
        else {
        	srcVNOption.text  = domain + ":" + project + ":" + vn;
        	destVNOption.text = domain + ":" + project + ":" + vn;
        }

        selectSrcNetwork.appendChild(srcVNOption);
        selectDestNetwork.appendChild(destVNOption);
    }

    $(selectAction).kendoDropDownList();
    $(selectProtocol).kendoDropDownList();
    $(selectSrcNetwork).kendoDropDownList();
    $(selectSrcNetwork).data("kendoDropDownList").list[0].style.minWidth = "350px";
    $(selectDirection).kendoDropDownList();
    $(selectDestNetwork).kendoDropDownList();
    $(selectDestNetwork).data("kendoDropDownList").list[0].style.minWidth = "350px";

    var sts = jsonPath(configObj, "$.service_templates[*].service-template");
    var analyzerInsts = [];
    var serviceInsts = [];
    if (null !== sts && sts.length > 0) {
        var selectedDomain = $(ddDomain).val();
        var selectedProject = $(ddProject).val();

        for (var i = 0; i < sts.length; i++) {
            if (sts[i].service_template_properties.service_type === "analyzer") {
                if (typeof sts[i].service_instance_back_refs !== "undefined" &&
                    sts[i].service_instance_back_refs.length > 0) {
                    for (var j = 0; j < sts[i].service_instance_back_refs.length; j++) {
                        if(sts[i].service_instance_back_refs[j].to[0] === selectedDomain &&
                            sts[i].service_instance_back_refs[j].to[1] === selectedProject) {
                            analyzerInsts[analyzerInsts.length] = sts[i].service_instance_back_refs[j].to[2];
                            serviceInsts[serviceInsts.length] = sts[i].service_instance_back_refs[j].to[2];
                        } else {
                            analyzerInsts[analyzerInsts.length] = 
                                sts[i].service_instance_back_refs[j].to[0] + ":" +
                                sts[i].service_instance_back_refs[j].to[1] + ":" +
                                sts[i].service_instance_back_refs[j].to[2];
                            serviceInsts[serviceInsts.length] = 
                                sts[i].service_instance_back_refs[j].to[0] + ":" +
                                sts[i].service_instance_back_refs[j].to[1] + ":" +
                                sts[i].service_instance_back_refs[j].to[2];
                        }
                    }
                }
            } else {
                if (typeof sts[i].service_instance_back_refs !== "undefined" &&
                    sts[i].service_instance_back_refs.length > 0) {
                    for (var j = 0; j < sts[i].service_instance_back_refs.length; j++) {
                        if(sts[i].service_instance_back_refs[j].to[0] === selectedDomain &&
                            sts[i].service_instance_back_refs[j].to[1] === selectedProject) {
                            serviceInsts[serviceInsts.length] = sts[i].service_instance_back_refs[j].to[2];
                        } else {
                               serviceInsts[serviceInsts.length] = 
                                   sts[i].service_instance_back_refs[j].to[0] + ":" +
                                   sts[i].service_instance_back_refs[j].to[1] + ":" +
                                   sts[i].service_instance_back_refs[j].to[2];
                           }
                    }
                }
            }
        }
        selectApplyService.setAttribute("onclick", "toggleApplyServiceDiv(this, '" + serviceInsts.join() + "')");
        selectMirrorTo.setAttribute("onclick", "toggleMirrorServiceDiv(this, '" + analyzerInsts.join() + "')");
    }

    if (null !== rule && typeof rule !== "undefined") {
    	var actionUnderActionList = false;
        if (null !== rule["action_list"] && typeof rule["action_list"] !== "undefined") {
            if (typeof rule["action_list"]["simple_action"] !== "undefined") {
                var action = rule["action_list"]["simple_action"];
                if (null !== action && typeof action !== "undefined") {
                	actionUnderActionList = true;
                    action = action.toUpperCase();
                    var actionList = $(selectAction).data("kendoDropDownList").dataSource.data();
                    actionList = jsonPath(actionList, "$..text");
                   	$(selectAction).data("kendoDropDownList").select(actionList.indexOf(action));
                } else {
                	$(selectAction).data("kendoDropDownList").enable(false);	
                }
            }
        } else {
        	$(selectAction).data("kendoDropDownList").enable(false);
        }
        if(actionUnderActionList === false) {
        	//If simple_action is not under "action_list", look directly under "policy_rule"
        	//Dont allow to edit.
        	if(null !== rule["simple_action"] && typeof rule["simple_action"] !== "undefined") {
        		action = rule["simple_action"];
        		$(selectAction).data("kendoDropDownList").enable(false);
        		$(selectAction).data("kendoDropDownList").text(action.toUpperCase());	
        	} else {
        		$(selectAction).data("kendoDropDownList").enable(false);	
        	}
        }
        
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
                    srcNetwork[i] = rule["src_addresses"][i]["virtual_network"];
                    var domain = srcNetwork[i].split(":")[0];
                    var project = srcNetwork[i].split(":")[1];
                    if(domain === selectedDomain && project === selectedProject) {
                    	srcNetwork[i]  = srcNetwork[i].split(":")[2];
                    }
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
                    destNetwork[i] = rule["dst_addresses"][i]["virtual_network"];
                    var domain = destNetwork[i].split(":")[0];
                    var project = destNetwork[i].split(":")[1];
                    if(domain === selectedDomain && project === selectedProject) {
                    	destNetwork[i]  = destNetwork[i].split(":")[2];
                    }
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
                $(inputTxtSrcPorts).val("ANY");
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
                $(inputTxtDestPorts).val("ANY");
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

        if (null !== rule["action_list"] && typeof rule["action_list"] !== "undefined") {
            if (null !== rule["action_list"]["apply_service"] && typeof rule["action_list"]["apply_service"] !== "undefined" &&
                rule["action_list"]["apply_service"].length > 0) {
                var applyServices = [];
                for (var i = 0; i < rule["action_list"]["apply_service"].length; i++) {
                    applyServices[i] = rule["action_list"]["apply_service"][i];
                }
                if(applyServices && applyServices.length > 0) {
                	selectApplyService.setAttribute("checked", true);
                    selectApplyService.setAttribute("onclick", 
                    	"toggleApplyServiceDiv(this, '" + serviceInsts.join() + "', '" + applyServices.join() + "')");
                    toggleApplyServiceDiv(selectApplyService, serviceInsts.join(), applyServices.join());
                //	$(selectApplyService).trigger("click");
                } else {
                    selectApplyService.setAttribute("checked", false);
                }
            }
			if(null !== rule["action_list"]["mirror_to"] && typeof rule["action_list"]["mirror_to"] !== "undefined" &&
				null !== rule["action_list"]["mirror_to"]["analyzer_name"] &&
				typeof rule["action_list"]["mirror_to"]["analyzer_name"] !== "undefined") {
				var mirrorServices = [rule["action_list"]["mirror_to"]["analyzer_name"]];
                if(mirrorServices && mirrorServices.length > 0) {
                	selectMirrorTo.setAttribute("checked", true);
                    selectMirrorTo.setAttribute("onclick", 
                    	"toggleMirrorServiceDiv(this, '" + analyzerInsts.join() + "', '" + mirrorServices.join() + "')");
                    toggleMirrorServiceDiv(selectMirrorTo, analyzerInsts.join(), mirrorServices.join());
                	//$(selectMirrorTo).trigger("click");
                } else {
                    selectMirrorTo.setAttribute("checked", false);
                }
	        }
	    }
    }
    return rootDiv;
}

function deleteRuleEntry(who) {
    var templateDiv = who.parentNode.parentNode.parentNode;
    $(templateDiv).remove();
    templateDiv = $();
}

function populateDomains(result) {
    if (result && result.domains && result.domains.length > 0) {
        var domains = jsonPath(result, "$.domains[*].fq_name[0]");
        ddDomain.data("kendoDropDownList").dataSource.data(domains);
    }
    fetchProjects("populateProjects");
}

function handleDomains() {
    fetchDataForGridPolicy();
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
    }
    fetchDataForGridPolicy();
}

function handleProjects(e) {
    var pname = e.sender._current.text();
    setCookie("project", pname);
    fetchDataForGridPolicy();
}

function fetchDataForGridPolicy() {
    $("#cb_gridPolicy").attr("checked", false);
    var selectedDomain = $(ddDomain).val();
    var selectedProject = $(ddProject).val();
    if(!isValidDomainAndProject(selectedDomain, selectedProject)) {
    	showGridMessage("#gridVN", "Error in getting data.");
    	return;
    }

    showGridLoading("#gridPolicy");
    doAjaxCall(
        "/api/tenants/config/policys?tenant_id=" +
            selectedDomain + ":" + selectedProject, "GET",
        null, "successHandlerForGridPolicy", "failureHandlerForGridPolicy", null, null
    );
}

function successHandlerForGridPolicy(result) {
    var uuids = jsonPath(result, "$..uuid");
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
            var results = arguments;
            successHandlerForGridPolicyRow(results);
        },
        function () {
            //If atleast one api fails
            var results = arguments;
            failureHandlerForGridPolicyRow(results);
        });
}

function failureHandlerForGridPolicy(result) {
    showInfoWindow("Error in gettng policies.", "Error");
    showGridMessage("#gridPolicy", "Error in getting data.");
}

function successHandlerForGridPolicyRow(result) {
    var policyData = [];
    var idCount = 0;
    var policies = jsonPath(result, "$..network-policy");
    configObj["network-policys"] = [];
    for (var i = 0; i < policies.length; i++) {
        var policy = policies[i];
        if(check4DynamicPolicy(policy)) {
            continue;
        }
        var policyName = jsonPath(policy, "$.fq_name[2]");
        configObj["network-policys"][configObj["network-policys"].length] = policies[i];

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
        }
        else
            ruleDescriptions = ["-"];

        policyData.push({"Id":idCount++, "NetworkPolicy":policyName, "PolicyRules":ruleDescriptions, "AssociatedNetworks":networks, "PolicyUUID":uuid});
    }
    dsGridPolicy.data(policyData);
    check4GridEmpty('#gridPolicy', 'No Network Policy found.');
}


function check4DynamicPolicy(policy) {
    var isDynamicPolicy = false;
    try {
        var startTimes = jsonPath(policy, "$.virtual_network_back_refs[*].attr.timer.start_time");
        for(var i = 0; i < startTimes.length; i++) {
            if(startTimes[i] != null) {
                isDynamicPolicy = true;
                break;
            }
        }
    } catch (error){
        console.log(error.stack);
    }
    return isDynamicPolicy;
}

function failureHandlerForGridPolicyRow(result, cbParam) {
    showInfoWindow("Error in getting policy data.", "Error");
    showGridMessage("#gridPolicy", "Error in getting data.");
}

function showRemoveWindow() {
    confirmRemove.find('.modal-header-title').text("Remove");
    confirmRemove.modal('show');
}

function initgridPolicyDetail(e) {
    var detailRow = e.detailRow;
}

function closeCreatePolicyWindow() {
    clearValuesFromDomElements();
}

function clearValuesFromDomElements() {
    mode = "";
    txtPolicyName.val("");
    txtPolicyName[0].disabled = false;
    msAssociatedNetworks.data("kendoMultiSelect").value("");
    clearRuleEntries();
}

function clearRuleEntries() {
    var tuples = $("#ruleTuples")[0].children;
    if (tuples && tuples.length > 0) {
        var tupleLength = tuples.length;
        for (var i = 0; i < tupleLength; i++) {
            $(tuples[i]).empty();
        }
        $(tuples).empty();
        $("#ruleTuples").empty();
    }
}

function showPolicyEditWindow(mode) {
    var selectedDomain = $(ddDomain).val();
    var selectedProject = $(ddProject).val();
    if(!isValidDomainAndProject(selectedDomain, selectedProject)) {
    	showGridMessage("#gridVN", "Error in getting data.");
    	return;
    }
    var getAjaxs = [];

    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/virtual-networks?tenant_id=" + selectedDomain + ":" + selectedProject,
        type:"GET"
    });

    var selectedDomainUUID = jsonPath(configObj, "$..domains[?(@.fq_name[0]=='" + selectedDomain + "')]")[0].uuid;
    var projectUUId = jsonPath(configObj, "$.projects[?(@.fq_name[1]=='" + selectedProject + "')]")[0].uuid;    
    getAjaxs[1] = $.ajax({
        url:"/api/tenants/config/service-instance-templates/" + selectedDomainUUID,
        type:"GET"
    });

    getAjaxs[2] = $.ajax({
        url:"/api/tenants/config/service-instances/" + projectUUId,
        type:"GET"
    });
    
    $.when.apply($, getAjaxs).then(
        function () {
            //all success
            clearValuesFromDomElements();
            var results = arguments;
            var vns = jsonPath(results[0][0], "$.virtual-networks[*].fq_name[2]");
            var virtualNetworks = jsonPath(results[0][0], "$.virtual-networks[*]");
            configObj["virtual-networks"] = [];
            if (null !== virtualNetworks && typeof virtualNetworks === "object" && virtualNetworks.length > 0) {
                for (var i = 0; i < virtualNetworks.length; i++) {
                    configObj["virtual-networks"][i] = {};
                    configObj["virtual-networks"][i] = virtualNetworks[i];
                }
            }

            msAssociatedNetworks.data("kendoMultiSelect").dataSource.data(vns);

            var sts = jsonPath(results[1][0], "$.service_templates[*].service-template");
            configObj["service_templates"] = [];
            if (null !== sts && sts.length > 0) {
                for (var i = 0; i < sts.length; i++) {
                    configObj["service_templates"][i] = {};
                    configObj["service_templates"][i]["service-template"] = sts[i];
                }
            }
            var sis = jsonPath(results[2][0], "$.[*].ConfigData.service-instance");
            configObj["service_instances"] = [];
            if (null !== sis && sis.length > 0) {
                for (var i = 0; i < sis.length; i++) {
                    configObj["service_instances"][i] = {};
                    configObj["service_instances"][i]["service-instance"] = sis[i];
                }
            }

            if (mode === "add") {
                windowCreatePolicy.find('.modal-header-title').text('Create Policy');
            } else if (mode === "edit") {
                var selectedRow = gridPolicy.dataItem(gridPolicy.select());
                windowCreatePolicy.find('.modal-header-title').text('Edit Policy ' + selectedRow.NetworkPolicy);
                txtPolicyName.val(selectedRow.NetworkPolicy);
                txtPolicyName[0].disabled = true;

                var rowId = selectedRow["Id"];
                var selectedPolicy = configObj["network-policys"][rowId];

                var networks = jsonPath(selectedPolicy, "$.virtual_network_back_refs[*].to[2]");
                if (networks && networks.length > 0)
                    msAssociatedNetworks.data("kendoMultiSelect").value(networks);
                else
                    msAssociatedNetworks.data("kendoMultiSelect").value("");

                if (selectedPolicy["network_policy_entries"] && selectedPolicy["network_policy_entries"]["policy_rule"] &&
                    selectedPolicy["network_policy_entries"]["policy_rule"].length > 0) {
                    var policyEntries = selectedPolicy["network_policy_entries"]["policy_rule"];
                    for (var j = 0; j < policyEntries.length; j++) {
                        var rule = policyEntries[j];
                        var ruleEntry = createRuleEntry(rule, j);
                        $("#ruleTuples").append(ruleEntry);
                    }
                }
            }
        },
        function () {
            //If atleast one api fails
            var results = arguments;
        });
    windowCreatePolicy.modal("show");
    windowCreatePolicy.find('.modal-body').scrollTop(0);
}

function createPolicySuccessCb() {
    //showSuccessMessage();
    showGridLoading("#gridPolicy");
    fetchDataForGridPolicy();
}

function createPolicyFailureCb() {
    //closeMessageDialog(0);
    showGridLoading("#gridPolicy");
    fetchDataForGridPolicy();
}

function validate() {
    var policyName = txtPolicyName.val().trim();
    if (typeof policyName === "undefined" || policyName === "") {
        showInfoWindow("Enter a valid network policy name", "Input required");
        return false;
    }
    var selectedDomain = $(ddDomain).val();
    var selectedProject = $(ddProject).val();

    var ruleTuples = $("#ruleTuples")[0].children;
    if (ruleTuples && ruleTuples.length > 0) {
        for (var i = 0; i < ruleTuples.length; i++) {
            var ruleTuple = $($(ruleTuples[i]).find("div")[0]).children();

			var protocol = $($(ruleTuple[1]).find("select")).data("kendoDropDownList").text();
			protocol = getProtocol(protocol);

            var action_value = $($(ruleTuple[0]).find("select")).data("kendoDropDownList").text();
            action_value = action_value.toLowerCase();
    		var applyServicesEnabled = $($(ruleTuple[7]).find("input"))[0].checked;
    		var mirrorServicesEnabled = $($(ruleTuple[8]).find("input"))[0].checked
    		var applyServices = [];
    		var mirrorTo = [];

    		if(applyServicesEnabled == true) {
    			var id = $($(ruleTuple[7]).find("input"))[0].id;
    			var div_id = id + "_root";
    			applyServices = 
    				$($("#" + div_id).find("select")).data("kendoMultiSelect").value();
    			if(applyServices && applyServices.length <=0) {
		            showInfoWindow("Select atleast one service to apply.", "Invalid Rule");
		            return false;
    			}
    			if(allowOnlyProtocolAnyIfServiceEnabled(applyServicesEnabled, protocol, false) === false) {
		            return false;
    			}
                //When creating service chain with more than one service instance, 
                //only transparent mode services can be chained
                var allTypes = [];
                var asArray = [];
                if(applyServices && applyServices.length > 0) {
                    var srcVN = $($(ruleTuple[2]).find("select")).data("kendoDropDownList").text();
                    var destVN = $($(ruleTuple[5]).find("select")).data("kendoDropDownList").text();
                    if(srcVN === "local" || srcVN === "any") {
                    	showInfoWindow("Source network cannot be 'any' or 'local' while applying services.", "Invalid Rule");
                    	return false;
                    }
                    if(destVN === "local" || destVN === "any") {
                    	showInfoWindow("Destination network cannot be 'any' or 'local' while applying services.", "Invalid Rule");
                    	return false;
                    }
                    var allTemplates = 
                        jsonPath(configObj, "$.service_templates[*].service-template")
                    for(var j=0; j<applyServices.length; j++) {
                        var as = [];
                        if(applyServices[j].indexOf(":") === -1) {
                            as = [selectedDomain, selectedProject, applyServices[j]];
                        } else {
                            as = applyServices[j].split(":");
                        }
                        for(tmplCount=0; tmplCount<allTemplates.length; tmplCount++) {
                            var template = allTemplates[tmplCount];
                            var insts = template.service_instance_back_refs;
                            if(null !== insts && typeof insts !== "undefined" && insts.length > 0) {
                                for(var instCount=0; instCount<insts.length; instCount++) {
                                    if(insts[instCount]["to"][0] == as[0] &&
                                        insts[instCount]["to"][1] == as[1] &&
                                        insts[instCount]["to"][2] == as[2]) {
                                    	var smode = template.service_template_properties.service_mode;
                                    	if(typeof smode === "undefined" ||
                                    		null === smode)
                                    		smode = "transparent";
                                        allTypes[allTypes.length] = smode;
                                        asArray[asArray.length] = as.join(":");
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    //Get Unique values.
                    var uniqueTypes = $.grep(allTypes, function(v, k){
                        return $.inArray(v ,allTypes) === k;
                    });
                    //If length of unique values is 1, then all the selected
                    //instances are of same type.
                    if(uniqueTypes.length > 1) {
                    	if(uniqueTypes.indexOf("in-network") !== -1 || uniqueTypes.indexOf("in-network-nat") !== -1) {
                            var msg = "Only Transparent mode services can be applied when there are more than one instance.";                                    
                            showInfoWindow(msg, "Invalid Rule");
                            return false;
                    	}
                    } else if(uniqueTypes.length == 1) {
                    	if(allTypes.length > 1) {
                            if(uniqueTypes[0] == "in-network" || uniqueTypes[0] == "in-network-nat") {
                                showInfoWindow("Only one instance can be applied for an " + uniqueTypes[0] + " service.", "Invalid Rule");
                                return false;
                            }
                    	}
                    }
                    //in-network must have source and dest vn same as left and right vn. transparent must have both different.
                    if(uniqueTypes.length >= 0) {
                        var srcVN = $($(ruleTuple[2]).find("select")).data("kendoDropDownList").text();
                        var destVN = $($(ruleTuple[5]).find("select")).data("kendoDropDownList").text();
                        if(srcVN.indexOf(":") === -1) {
                            srcVN = [selectedDomain, selectedProject, srcVN].join(":");
                        }
                        if(destVN.indexOf(":") === -1) {
                            destVN = [selectedDomain, selectedProject, destVN].join(":");
                        }
                        var srcAndDestVNs = [];
                        var rVN = [], lVN = [], mVN = [];
                        var configData = jsonPath(configObj, "$.service_instances[*].service-instance")
                        for(var as=0; as<asArray.length; as++) {
                        	asArray[as] = asArray[as].split(":");
                        	for(var cd=0; cd<configData.length; cd++) {
                        		var cData = configData[cd];
                        		if(asArray[as][0] === cData["fq_name"][0] &&
                        			asArray[as][1] === cData["fq_name"][1] &&
                        			asArray[as][2] === cData["fq_name"][2]) {
                        			rVN[rVN.length] = cData["service_instance_properties"]["right_virtual_network"];
                        			lVN[lVN.length] = cData["service_instance_properties"]["left_virtual_network"];
                        			mVN[mVN.length] = cData["service_instance_properties"]["management_virtual_network"];
                        			if(null !== rVN[rVN.length-1] && typeof rVN[rVN.length-1] !== "undefined" && "" !== rVN[rVN.length-1].trim())
                        				srcAndDestVNs[srcAndDestVNs.length] = rVN[rVN.length-1];
                        			if(null !== lVN[lVN.length-1] && typeof lVN[lVN.length-1] !== "undefined" && "" !== lVN[lVN.length-1].trim())
                        				srcAndDestVNs[srcAndDestVNs.length] = lVN[lVN.length-1];
                        			if(null !== mVN[mVN.length-1] && typeof mVN[mVN.length-1] !== "undefined" && "" !== mVN[mVN.length-1].trim())
                        				srcAndDestVNs[srcAndDestVNs.length] = mVN[mVN.length-1];
                        			break;
                        		}
                        	}
                        }
                        var uniqueVNs = $.grep(srcAndDestVNs, function(v, k){
                            return $.inArray(v ,srcAndDestVNs) === k;
                        });
                        for(var vnCount=0; vnCount<uniqueVNs.length; vnCount++) {
                        	if(uniqueVNs[vnCount] === srcVN ||
                        		uniqueVNs[vnCount] === destVN) {
                            	if(uniqueTypes[0] === "transparent") {
                            		//Transparent services
                            		var msg = 
                            			"Source Network and/or Destination network cannot be same as Left and Right virtual networks of the instance(s)."
                            		showInfoWindow(msg, "Invalid Rule");
                            		return false;
                            	}
                        	}
                        }
                        if(uniqueTypes[0] !== "transparent") {
                        	if(lVN[0] !== srcVN || rVN[0] !== destVN) {
                        		//In-network, In-network-nat services.
                        		var msg = 
                        			"Source Network and Destination network must be same as Left and Right virtual networks of the instance respectively."
                        		showInfoWindow(msg, "Invalid Rule");
                        		return false;
                        	}                        		
                        }
                    }
                }
    		}

    		if(mirrorServicesEnabled == true) {
    			var id = $($(ruleTuple[8]).find("input"))[0].id;
    			var div_id = id + "_root";
    			var div = $("#" + div_id);
    			mirrorTo = 
    				$($("#" + div_id).find("select")).data("kendoMultiSelect").value();
    			if(mirrorTo && mirrorTo.length <=0) {
		            showInfoWindow("Select atleast one instance to mirror.", "Invalid Rule");
		            return false;
    			}
    			if(mirrorTo && mirrorTo.length > 1) {
		            showInfoWindow("Select only one instance to mirror.", "Invalid Rule");
		            return false;
    			}

    			if(allowOnlyProtocolAnyIfServiceEnabled(mirrorServicesEnabled, protocol, true) === false) {
		            return false;
    			}
    		}
        }
    }
    return true;
}

function destroy() {
    ddDomain = $("#ddDomain").data("kendoDropDownList");
    ddDomain.destroy();

    ddProject = $("#ddProject").data("kendoDropDownList");
    ddProject.destroy();

    msAssociatedNetworks = $("#msAssociatedNetworks").data("kendoMultiSelect");
    msAssociatedNetworks.destroy();

    gridPolicy = $("#gridPolicy").data("kendoGrid");
    gridPolicy.destroy();

    btnCreatePolicy.remove();
    btnCreatePolicy = $();

    btnDeletePolicy.remove();
    btnDeletePolicy = $();

    btnCreatePolicyCancel.remove();
    btnCreatePolicyCancel = $();

    btnCreatePolicyOK.remove();
    btnCreatePolicyOK = $();

    btnRemovePopupOK.remove();
    btnRemovePopupOK = $();

    btnRemovePopupCancel.remove();
    btnRemovePopupCancel = $();

    btnCnfRemoveMainPopupOK.remove();
    btnCnfRemoveMainPopupOK = $();

    btnCnfRemoveMainPopupCancel.remove();
    btnCnfRemoveMainPopupCancel = $();

    var btnCommonAddRule = $("#btnCommonAddRule");
    btnCommonAddRule.remove();
    btnCommonAddRule = $();

    txtPolicyName.remove();
    txtPolicyName = $();

    var gridPolicyDetailTemplate = $("#gridPolicyDetailTemplate");
    gridPolicyDetailTemplate.remove();
    gridPolicyDetailTemplate = $();

    var policyConfigTemplate = $("#policy-config-template");
    policyConfigTemplate.remove();
    policyConfigTemplate = $();

    var myModalLabel = $("#myModalLabel");
    myModalLabel.remove();
    myModalLabel = $();

    var ruleTuples = $("#ruleTuples");
    ruleTuples.remove();
    ruleTuples = $();

    windowCreatePolicy = $("#windowCreatePolicy");
    windowCreatePolicy.remove();
    windowCreatePolicy = $();

    confirmRemove = $("#confirmRemove");
    confirmRemove.remove();
    confirmRemove = $();

    confirmMainRemove = $("#confirmMainRemove");
    confirmMainRemove.remove();
    confirmMainRemove = $();

}