/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

dnsServersConfigObj = new dnsServersConfig();

function dnsServersConfig() {
    //Variable definitions

    //Text Box
    var txtDNSServerName, txtDomainName, txtTimeLive;

    //Dropdowns
    var ddDomain, ddProject, ddLoadBal;

    //combo Box
    var cmbDNSForward;

    //Multi Select Drop Down
    var msIPams;

    //Grids
    var gridDNSServer;

    //Buttons
    var btnCreateDNSServer, btnDeleteDNSServer,
        btnCreateDNSServerCancel, btnCreateDNSServerOK,
        btnCnfDelPopupOK, btnCnfDelPopupCancel;

    //Datasources
    var dsGridDNSServer;

    //Windows
    var windowCreateDNSServer, confirmDelete;
    var mode="create";
    virtualDNSs = [];		

    //Method definitions
    this.load                       = load;
    this.init                       = init;
    this.initComponents             = initComponents;
    this.initActions                = initActions;
    this.fetchData                  = fetchData;
    this.fetchDataForGridDNSServer  = fetchDataForGridDNSServer;
    this.populateDomains            = populateDomains;
    this.handleDomains              = handleDomains;
    this.populateProjects           = populateProjects;
    this.handleProjects             = handleProjects;
    this.gridDNSServerSelectRow     = gridDNSServerSelectRow;
    this.gridDNSServerSelectAllRows = gridDNSServerSelectAllRows;
    this.closeCreateDNSServerWindow = closeCreateDNSServerWindow;
    this.DNSServerCreateWindow      = DNSServerCreateWindow;
    this.successHandlerForDNSServer = successHandlerForDNSServer;
    this.failureHandlerForDNSServer = failureHandlerForDNSServer;
    this.createDNSServerSuccessCb   = createDNSServerSuccessCb;
    this.createDNSServerFailureCb   = createDNSServerFailureCb;
    this.destroy                    = destroy;   
}

function load() {
    var configTemplate = kendo.template($("#DNSServer-config-template").html());
    $(contentContainer).html('');
    $(contentContainer).html(configTemplate);
    currTab = 'config_dns_dnsservers';
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
    txtDNSServerName         = $("#txtDNSServerName");
    txtDomainName            = $("#txtDomainName");
    cmbDNSForward            = $("#cmbDNSForward");
    txtTimeLive              = $("#txtTimeLive");
    btnCreateDNSServer       = $("#btnCreateDNSServer");
    btnDeleteDNSServer       = $("#btnDeleteDNSServer");
    btnCreateDNSServerCancel = $("#btnCreateDNSServerCancel");
    btnCreateDNSServerOK     = $("#btnCreateDNSServerOK");
    btnCnfDelPopupOK         = $("#btnCnfDelPopupOK");
    btnCnfDelPopupCancel     = $("#btnCnfDelPopupCancel");

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
    ddLoadBal = $("#ddLoadBal").kendoDropDownList({
        dataTextField:"text",
        dataValueField:"value",
    });
    msIPams = $("#msIPams").kendoMultiSelect({
        dataTextField:"text",
        dataValueField:"value"
    });
    cmbDNSForward = $("#cmbDNSForward").kendoComboBox({
        dataTextField:"text",
        dataValueField:"value",
	placeholder:"Enter Forwarder IP or Select a DNS Server"
    });

    dsGridDNSServer = new kendo.data.DataSource({
        batch:true
    });

    gridDNSServer = $("#gridDNSServer").contrailKendoGrid({
        dataSource:dsGridDNSServer,
        sortable:false,
        pageable:false,
        navigatable:true,
        reorderable:true,
        resizable:true,
        selectable:'true',
        scrollable: false,
	searchToolbar:true,
        searchPlaceholder:"Search DNS Servers",
        showSearchbox:true,
        widgetGridTitle:'',
	collapseable:false,
	columnMenu:false,	 
        columns: [ { 
            field: "", 
	    menu:false,	
	    searchable:false,	
            title:"<input id='cb_gridDNSServer' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'btnDeleteDNSServer'); /><span class='ace-lbl'>&nbsp;</span>", 
            width: 30, 
            template: "<input id='gridDNSServer_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'btnDeleteDNSServer'); /><span class='ace-lbl'>&nbsp;</span>" 
        },
        {
            field: "uuid",
            title: "UUID",
            hidden:true,
	    searchable:false	
        },
        {
            field: "dnsserver_name",
            title: "DNS Server",
            template: "<a href='/tenants/monitor/network\\#p=config_dns_dnsrecords&uuid=#: uuid #&q='>#: dnsserver_name #</a>",
	    searchable:true 	
        },
        {
            field: "domain_name",
            title: "Domain Name",
	    searchable:false  	
        },
        {
            field : "dns_ttl",
            title : "Time to Live",
            hidden: true,
            searchable:false  
        },
        {
            field : "record_resolution_order",
            title : "Record Resolution Order",
            hidden: true,
            searchable:false  
        },
        { 
            field: "forward",  
            title: "Forwarders",
            searchable:false  
        },
        {
            field: "Associated_IPAM",
            title: "Associated_IPAM",
            hidden:true,
            searchable:false  
        },
        { 
			field: "", 
			title: "", 
			searchable:false,
			template: '<div class="inline position-relative">' +
            		'    <div class="dropdown-toggle" data-toggle="dropdown">' +
           		'        <i class="icon-cog icon-only bigger-110"></i>' +
            		'    </div>' +
            		'    <ul class="dropdown-menu dropdown-icon-only dropdown-light pull-right dropdown-caret dropdown-close">' +
            		'        <li>' +
            		'            <a onclick="dnsServerEditWindow();" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
            		'                <i class="icon-edit"></i> &nbsp; Edit' +
            		'            </a>' +
            		'        </li>' +
		  	'        <li>' +
                        '            <a onclick="showDelWindow();" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                        '                    <i class="icon-trash"></i> &nbsp; Delete' +
                        '            </a>' +
                        '        </li>' +
                        '        <li>' +
                        '            <a href="/tenants/monitor/network\\#p=config_dynamic_dnsrecords&dnsName=#: dnsserver_name #&q=" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Active DNS Database">' +
                        '                    <i></i> &nbsp; Active DNS Database' +
                        '            </a>' +
                        '        </li>' +

            		'    </ul>' +
            		'</div>'	    }
        ],
        detailTemplate:kendo.template($("#gridsDetail_DNSServer").html()),
       
    });
    gridDNSServer=$("#gridDNSServer").data("kendoGrid");	
    $("tr:last").css({border:1});
    showGridLoading("#gridDNSServer");	
    var loadBalVal = [
        {text:"Random", value:"random"},
        {text:"Fixed", value:"fixed"},
        {text:"Round-Robin", value:"round-robin"}
    ];
    ddLoadBal.data("kendoDropDownList").dataSource.data(loadBalVal);
    windowCreateDNSServer = $("#windowCreateDNSServer");
    windowCreateDNSServer.modal({backdrop:'static', keyboard: false, show:false});
    $("body").append(windowCreateDNSServer);    

    confirmDelete = $("#confirmDelete");
    confirmDelete.modal({backdrop:'static', keyboard: false, show:false});
    $("body").append(confirmDelete);		
}

function initGridDNSServerDetail(e) {
    var detailRow = e.detailRow;
}

function initActions() {
    btnCreateDNSServer.click(function (a) {
        DNSServerCreateWindow("create");
    });

    btnDeleteDNSServer.click(function (a) {	
        confirmDelete.find('.modal-header-title').text("Confirm");
        confirmDelete.modal('show');
    });

    btnCreateDNSServerCancel.click(function (a) {
        windowCreateDNSServer.modal('hide');
    });

    btnCnfDelPopupCancel.click(function (a) {
        confirmDelete.modal('hide')
    });

    btnCnfDelPopupOK.click(function (a) {
	btnDeleteDNSServer.attr("disabled","disabled");	
        //Release functions
         confirmDelete.modal('hide');
 	 //showMessageDialog();       
         var selected_rows = gridDNSServer.select();
         var deleteAjaxs = [];
         if(selected_rows && selected_rows.length > 0) {
             for(var i=0; i<selected_rows.length; i++) {
                 var selected_row_data = gridDNSServer.dataItem(selected_rows[i]);
                 deleteAjaxs[i] = $.ajax({
                    url: "/api/tenants/config/virtual-DNS/" + selected_row_data["uuid"],
                    type: "DELETE"
                 });
             }
         }
         $.when.apply($, deleteAjaxs).then(
         function() {
            //all success
            //showSuccessMessage();
            var results = arguments;
            createDNSServerSuccessCb();
         },
         function () {
             //If atleast one api fails
             var r = arguments;
             //closeMessageDialog(0);
                 showInfoWindow(r[0].responseText,r[2]);
		 createDNSServerSuccessCb();
         });
    });
    btnCreateDNSServerOK.click(function (a) {
        var selectedDomain = $("#ddDomainSwitcher").data("kendoDropDownList").dataItem();
        if(!isValidDomain(selectedDomain.text)){
                showGridMessage("#gridDNSServer", "No DNS Server found.");
        	return;
        }
        var nameTxt = $(txtDNSServerName).val();
        var domainTxt = $(txtDomainName).val();
        var ttlTxt  =$(txtTimeLive).val();
        var ttlVal = 86400;
        var forwarderTxt = $("#cmbDNSForward").val();
        var recordResTxt = $("#ddLoadBal").val();
        var assocIpamsTxt = $("#msIPams").data("kendoMultiSelect").value();
	var selIPAMs=$("#msIPams").data("kendoMultiSelect").dataItems();
        var assocIpams = null;
        var dnsServerCfg = {};

        var validatReturn = validate();
        if (validatReturn != true) {
            return false;
        }
	 windowCreateDNSServer.modal('hide');
	//showMessageDialog();

        dnsServerCfg["virtual-DNS"] = {};
        dnsServerCfg["virtual-DNS"]["parent_type"] = "domain";
        dnsServerCfg["virtual-DNS"]["fq_name"] = [];
        dnsServerCfg["virtual-DNS"]["fq_name"] = [selectedDomain.text, nameTxt];
        dnsServerCfg["virtual-DNS"]["virtual_DNS_data"] = {};
        dnsServerCfg["virtual-DNS"]["virtual_DNS_data"]["dynamic_records_from_client"] = true;
        if (ttlTxt.length && parseInt(ttlTxt)) {
            ttlVal = parseInt(ttlTxt);
        }
        dnsServerCfg["virtual-DNS"]["virtual_DNS_data"]["default_ttl_seconds"] = ttlVal;
        dnsServerCfg["virtual-DNS"]["virtual_DNS_data"]["domain_name"] = domainTxt;
        dnsServerCfg["virtual-DNS"]["virtual_DNS_data"]["record_order"] = recordResTxt;
        if (forwarderTxt.length) {
            dnsServerCfg["virtual-DNS"]["virtual_DNS_data"]["next_virtual_DNS"] = forwarderTxt;
        }

        if (selIPAMs.length) {
            dnsServerCfg["virtual-DNS"]["network_ipam_back_refs"] = [];
            for (var i = 0; i < selIPAMs.length; i++) {
		var nq=selIPAMs[i].data;
                assocIpams = JSON.parse(nq);
                dnsServerCfg["virtual-DNS"]["network_ipam_back_refs"][i] =
                {'to':assocIpams.name, 'uuid':assocIpams.uuid};
            }
        }
        var url,type;
	if(mode === "create"){
		url="/api/tenants/config/virtual-DNSs";
		type="POST";	
	}
	else if(mode ==="edit"){
		var sel_row=$("#gridDNSServer .k-state-selected")[0];
		var sel_row_data=$("#gridDNSServer").data('kendoGrid').dataItem(sel_row);
		url='/api/tenants/config/virtual-DNS/'+sel_row_data["uuid"];
		type="PUT";
	}
	
        doAjaxCall(url, type, JSON.stringify(dnsServerCfg),
            "createDNSServerSuccessCb", "createDNSServerFailureCb");
    });
}


function dnsServerEditWindow() {
	//Edit Code has to be done
	DNSServerCreateWindow("edit");
}

function showDelWindow(){
    confirmDelete.find('.modal-header-title').text("Confirm");	
    confirmDelete.modal('show');
}

function validate(){
    if($(txtDNSServerName).val().trim() == ""){
        showInfoWindow("Enter a DNS Server Name", "Input required");
        return false;
    }
    if ($(txtDomainName).val().trim() == "") {
        showInfoWindow("Enter a Domain Name", "Input required");
        return false;
    }
   //time to live validations	
    var v=$("#txtTimeLive").val().trim();
   if(v !== ""){
	if(allowNumeric(v)){
		if(!validateTTLRange(parseInt(v))){
			showInfoWindow('Time To Live value should be in  "0 - 2147483647" range',"Input required");
			return false;
		}	
    	}
	else {
		showInfoWindow("Time To Live value should be  a number","Input required");
			return false;
	}
   }
		
   //dns forwarder validations
    var f=$("#cmbDNSForward").data("kendoComboBox").text();
   if(f != ""){	
    var isSel_fwd=false;
    for(var i=0;i<virtualDNSs.length;i++){
	var dns=virtualDNSs[i];
	if(dns.text === f)
		isSel_fwd=true
	   		 
    }
	if(!isSel_fwd){
		 if(!validateIPAddress(f)){
                        showInfoWindow("DNS Forwarder should be either valid IP address or chosen DNS Server ","Input required");
                        return false;
                }

	}
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
	setSessionStorageForDomain();
        fetchProjects("populateProjects");
    }
}

function handleDomains() {
    fetchDataForGridDNSServer();
    setSessionStorageForDomain();	
}

function populateProjects(result) {
    if (result && result.projects && result.projects.length > 0) {
        var projects = [];
        for (i = 0; i < result.projects.length; i++) {
            var project = result.projects[i];
            tempProjectDetail = {text:project.fq_name[1], value:project.uuid};
            projects.push(tempProjectDetail);
        }
        ddProject.data("kendoDropDownList").dataSource.data(projects);
        setSessionStorageForProject();
    }
    fetchDataForGridDNSServer();
}

function setSessionStorageForProject(){
	localStorage['sel_proj'] = JSON.stringify(ddProject.data('kendoDropDownList').dataItem());	
}

function setSessionStorageForDomain(){
	localStorage['sel_domain'] = JSON.stringify( ddDomain.data("kendoDropDownList").dataItem());
}

function handleProjects() {
    fetchDataForGridDNSServer();
    setSessionStorageForProject();	
}

function fetchDataForGridDNSServer() { 
    var selectedDomain = $("#ddDomainSwitcher").data("kendoDropDownList").dataItem(); 
    if(!isValidDomain(selectedDomain.text)){ 
	showGridMessage("#gridDNSServer", "No DNS Server found.");
   	return;
    }
    doAjaxCall(
        "/api/tenants/config/virtual-DNSs/" + selectedDomain.value, "GET",
        null, "successHandlerForDNSServer", "failureHandlerForDNSServer", null, null
    );
}

function successHandlerForDNSServer(result) {
    successHandlerForDNSServerRow(result);
}

function failureHandlerForDNSServerRow(result) {
    
}

function successHandlerForDNSServerRow(result) {
   $("#cb_gridDNSServer").attr("checked",false); 	
    var DNSServerData = [];
    var dnsServers = jsonPath(result, "$..virtual-DNS");

    configObj["virtual-DNSs"] = [];

    for (var i = 0; i < dnsServers.length; i++) {
        var dnsServer = dnsServers[i];
        configObj["virtual-DNSs"][i] = dnsServers[i];

        var domainName = "-"
        var dnsData = null;
        var dns_ttl = 0;
        var rec_res_ord = "-";
        var forwarder = "-";
        var ipamTxt = "-";

        if ('virtual_DNS_data' in dnsServer) {
            dnsData = dnsServer['virtual_DNS_data'];
            if ('domain_name' in dnsData &&
                dnsData['domain_name'] != null &&
                dnsData['domain_name'].length) {
                domainName = dnsData['domain_name'];
            }
            if ('default_ttl_seconds' in dnsData &&
                dnsData['default_ttl_seconds'] != null) {
                dns_ttl = dnsData['default_ttl_seconds'];
            }
            if ('record_order' in dnsData &&
                dnsData['record_order'] != null) {
                rec_res_ord = dnsData['record_order'];
            }
            if ('next_virtual_DNS' in dnsData &&
                dnsData['next_virtual_DNS'] != null) {
                forwarder = dnsData['next_virtual_DNS'];
            }
        }

        if ('network_ipam_back_refs' in dnsServer &&
            dnsServer['network_ipam_back_refs'].length) {
            var ipam_ref = dnsServer['network_ipam_back_refs'];
            var ipam_ref_len = ipam_ref.length;
            ipamTxt = "";
            for (var j = 0; j < ipam_ref_len; j++) {
                ipamTxt += ipam_ref[j]['to'][1] + ":" +
                    ipam_ref[j]['to'][2];
                if (j < (ipam_ref_len - 1))
                    ipamTxt += ", ";
            }
        }

        DNSServerData.push({"Id":i, "uuid":dnsServer.uuid,
            "dnsserver_name":dnsServer.name,
            "domain_name":domainName,
            "dns_ttl":dns_ttl,
            "record_resolution_order":rec_res_ord,
            "forward":forwarder,
            "Associated_IPAM":ipamTxt,
        });
    }
    dsGridDNSServer.data(DNSServerData);
    check4GridEmpty('#gridDNSServer', 'No DNS Server found.');	
}

function failureHandlerForDNSServer(result, cbParam) {
   
}

function gridDNSServerSelectAllRows(args) {
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
}

function gridDNSServerSelectRow(args) {
    var tableId = args.id.split("_")[0];
    var tableRowId = parseInt(args.id.split("_")[1]);
    tableRowId += 1;
    var checked = args.checked;
    if (checked === true)
        $($("tr", "#" + tableId)[tableRowId]).addClass('k-state-selected');
    else
        $($("tr", "#" + tableId)[tableRowId]).removeClass('k-state-selected');
}

function closeCreateDNSServerWindow() {
    //clearPopup();
}
function clearPopup() {
    //New values added
     txtDNSServerName[0].disabled=false;
     txtDomainName[0].disabled=false;	
    var msIpamsTemp = $("#msIPams").data("kendoMultiSelect");
    msIpamsTemp.value("")
    var cmbDNSForwardTemp = $("#cmbDNSForward").data("kendoComboBox");
    cmbDNSForwardTemp.value("")
    $(txtDomainName).val("");
    $(txtTimeLive).val("");
    $(txtDNSServerName).val("");
    var ddLoadBalTemp  = $("#ddLoadBal").data("kendoDropDownList");
    ddLoadBalTemp.select(0);
    mode = "create";
    virtualDNSs = [];
}


function DNSServerCreateWindow(m) {
    clearPopup();	
    mode=m;	 
    var selectedDomain =  $("#ddDomainSwitcher").data("kendoDropDownList").dataItem();
    if(!isValidDomain(selectedDomain.text)){
        showGridMessage("#gridDNSServer", "No DNS Server found.");
        return;
    }	    
    var getAjaxs = [];
    getAjaxs[0] = $.ajax({
        url:"/api/tenants/config/virtual-DNSs/" + $(ddDomainSwitcher).val(),
        type:"GET"
    });
    getAjaxs[1] = $.ajax({
        url:"/api/tenants/config/ipams",
        type:"GET"
    });

    $.when.apply($, getAjaxs).then(
        function () {
            var results = arguments;
            var vdns = results[0][0].virtual_DNSs;
           // var virtualDNSs = [];
            var tmpStr = "";
            for (var i = 0; i < vdns.length; i++) {
                tmpStr = String(vdns[i]["virtual-DNS"]["fq_name"][0]) + ":" +
                    String(vdns[i]["virtual-DNS"]["fq_name"][1]);

                virtualDNSs.push({text:tmpStr, value:tmpStr});
            }
            $("#cmbDNSForward").data("kendoComboBox").dataSource.data(virtualDNSs);

            var ipams = results[1][0]["network-ipams"];
            var netIpams = [];
            var tmpStr = "";
            for (var i = 0; i < ipams.length; i++) {
		var t=ipams[i].fq_name;
		var actVal=t[1]+":"+t[2];
                netIpams.push({text:actVal,value:actVal,data:JSON.stringify({name:t,
                    uuid:ipams[i].uuid})});
            }
            $("#msIPams").data("kendoMultiSelect").dataSource.data(netIpams);
            
            if(mode =="edit"){
		 windowCreateDNSServer.find('.modal-header-title').text("Edit DNS Server");
                populateDNSServerEditWindow();
            } else {
		windowCreateDNSServer.find('.modal-header-title').text("Create DNS Server");
            }
        }, 
        function () {
            //If atleast one api fails
            //var results = arguments;
        }
    );
    windowCreateDNSServer.modal('show');
}

function populateDNSServerEditWindow(){
    var selectedRow  = gridDNSServer.dataItem(gridDNSServer.select());
    var rowId        = selectedRow["Id"];
    var SelectedDNS = configObj["virtual-DNSs"][rowId];
    var ipams=selectedRow.Associated_IPAM;
    txtDNSServerName.val(selectedRow.dnsserver_name);
    txtDNSServerName[0].disabled = true;
    txtDomainName.val(selectedRow.domain_name);
    txtDomainName[0].disabled=true;	
    txtTimeLive.val(selectedRow.dns_ttl);
    
    //dropdownlist.value($("#value").val());
    
    ddLoadBal = $("#ddLoadBal").data("kendoDropDownList");
    ddLoadBal.value(selectedRow.record_resolution_order);
    
    cmbDNSForward = $("#cmbDNSForward").data("kendoComboBox");
    if(selectedRow.forward != "-")	
    	cmbDNSForward.text(selectedRow.forward);
    
    msIPams = $("#msIPams").data("kendoMultiSelect");
    if(ipams !=''){
     var arry=ipams.split(',');	
     var ai=[];	
     for(var i=0;i<arry.length;i++){
		arry[i]=arry[i].trim();	
		ai.push(arry[i]);
	}	
     msIPams.value(ai);
   }
}

function createDNSServerSuccessCb() {
    closeCreateDNSServerWindow();
    //showSuccessMessage();	
    fetchDataForGridDNSServer();
}

function createDNSServerFailureCb() {
    //closeMessageDialog(0);	
    closeCreateDNSServerWindow();
    fetchDataForGridDNSServer();
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

    txtDNSServerName.remove();
    txtDNSServerName = $();

    txtDomainName.remove();
    txtDomainName = $();

    //cmbDNSForward.remove();
    //cmbDNSForward = $();
    var f=$("#cmbDNSForward").data("kendoComboBox");
	f.destroy();	

    txtTimeLive.remove();
    txtTimeLive = $();

    ddLoadBal = $("#ddLoadBal").data("kendoDropDownList");
    ddLoadBal.destroy();

    msIPams = $("#msIPams").data("kendoMultiSelect");
    msIPams.destroy();

    btnCreateDNSServer.remove();
    btnCreateDNSServer = $();

    btnDeleteDNSServer.remove();
    btnDeleteDNSServer = $();

    btnCreateDNSServerCancel.remove();
    btnCreateDNSServerCancel = $();

    btnCreateDNSServerOK.remove();
    btnCreateDNSServerOK = $();

    btnCnfDelPopupOK.remove();
    btnCnfDelPopupOK = $();

    btnCnfDelPopupCancel.remove();
    btnCnfDelPopupCancel = $();

    dsGridDNSServer = $();

    confirmDelete = $("#confirmDelete");
    confirmDelete.remove();
    confirmDelete = $();

    windowCreateDNSServer = $("#windowCreateDNSServer");
    windowCreateDNSServer.remove();
    windowCreateDNSServer = $();

    gridDNSServer = $("#gridDNSServer");
    gridDNSServer.remove();
    gridDNSServer = $();
}
