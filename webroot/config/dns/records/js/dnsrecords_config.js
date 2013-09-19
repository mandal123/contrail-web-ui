/*
 *  Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */
dnsRecordsConfigObj=new dnsRecordsConfig();

function dnsRecordsConfig(){
        //Variable Definations

	//Grids
	var gridDNSRecords,gridAssoicatedIPAMs;

	//Datasources
	var dsGridDNSRecords,dsGridAssociatedIPAMs;

	//buttons
	var btnAddRecord,btnDeleteRecord,txtRecordName,cmbRecordType,lblRecordTypeName,cmbRecordData,cmbRecordClass,txtRecordTTL,btnAddDNSRecordOk,btnAddDNSRecordCancel,btnDeleteDNSRecordOk,btnDeleteDNSRecordCancel;
        var availabelIPAMsLst,associatedIPAMsLst,chkAssoicatedIPAMs,btnMoveRight,btnMoveLeft,btnAssociatedOk,btnAssociatedCancel,editAssociatedWindowObj,btnEditAssociatedIPAMs
        var addRecordWindowObj;
	var deleteRecordWindowObj;
	var recordTypes=[];
	var parentUUID,currentUUID;
	var defaultDomainName;
	var availabelLstView,assosicatedLstView,dsAvailableLstView=[],dsAssociatedLstView=[];
	var defaultTTL=86400;
	var mode="create";
	var dnsNames=[];
	var deleteMainRecordWindowObj,btnDeleteMainDNSRecordOk,btnDeleteMainDNSRecordCancel;
	//Method Definations

       	this.load 			= load;
	this.destroy			= destroy;		

	function load(){
		var configTemplate=kendo.template($("#DNSRecords-config-template").html());
		$(contentContainer).html('');
		$(contentContainer).html(configTemplate);
                init();
       	}
	
	function init(){
                 initComponents();
                 initActions();
		 fetchData();
	}
	function fetchData(){
		fetchDomains("populateDomainsForRecordsPage");
	}
	window.populateDomainsForRecordsPage=function(result) {
    		if (result && result.domains && result.domains.length > 0) {
        		var domains = [];
        		for (i = 0; i < result.domains.length; i++) {
           		 var domain = result.domains[i];
           		 tmpDomain = {text:domain.fq_name[0], value:domain.uuid};
            		domains.push(tmpDomain);
			    $("#ddDomain").data("kendoDropDownList").dataSource.data(domains);
                	 fetchDNSServerDataForRecordsPage();
        		}
		}
		else{
			showInfoWindow("No domain info","Message");
		}	
    }

	function fetchDNSServerDataForRecordsPage() {
   	     var selectedDomain = $("#ddDomain").data("kendoDropDownList").dataItem();
	     if(!isValidDomain(selectedDomain.text)){
	         showGridMessage("#dnsRecordsGrid", "No DNS Record found.");
   	         return;
               }
   	      doAjaxCall(
       		 "/api/tenants/config/virtual-DNSs/" + selectedDomain.value, "GET",
       		 null, "successHandlerForDNSServer", "failureHandlerForDNSServer", null, null
    	      );
	}	

	window.successHandlerForDNSServer=function(result){
		var dnsServers=jsonPath(result,"$..virtual-DNS");
		if(dnsServers !=  undefined && dnsServers.length>0){
			var ds=[];
                	for(var i=0;i<dnsServers.length;i++){
				var s= dnsServers[i];
				ds.push({text:s.name,value:s.uuid});		
			}
			$("#ddDNSServers").data("kendoDropDownList").dataSource.data(ds);	
			//reading uuid from query string
			var uuidIndex = window.location.href.search("uuid");
			if(uuidIndex != -1){
				currentUUID = window.location.href.substring(uuidIndex+5,window.location.href.length-3);
				$("#ddDNSServers").data("kendoDropDownList").select(function(d){return d.value === currentUUID;});
			}
			else{
				currentUUID=$("#ddDNSServers").data("kendoDropDownList").dataItem().value;
			}
			fetchDNSRecordsData();
		}
		else{
			showGridMessage("#dnsRecordsGrid", "No DNS Record found.");
		}
		
	}
	window.failureHandlerForDNSServer=function(error){
		//alert(error.message);
	}

	
	function initComponents(){
		btnAddRecord		=$("#addRecordBtn");
		btnDeleteRecord		=$("#deleteBtn");	
                txtRecordName		=$("#txtRecordName");
		cmbRecordType		=$("#cmbRecordType");
		lblRecordTypeName 	=$("#lblRecordTypeName");
		cmbRecordData		=$("#cmbRecordData");
		cmbRecordClass		=$("#cmbRecordClass");
		txtRecordTTL		=$("#txtRecordTTL");
		btnAddDNSRecordOk	=$("#btnAddDNSRecordOk");
		btnAddDNSRecordCancel	=$("#btnAddDNSRecordCancel");
		addRecordWindowObj	=$("#addRecordWindow");
		deleteRecordWindowObj	=$("#confirmDelete");
		deleteMainRecordWindowObj=$("#confirmMainDelete");
		btnDeleteDNSRecordOk	=$("#btnCnfDelPopupOK");
		btnDeleteDNSRecordCancel=$("#btnCnfDelPopupCancel");	
	        btnDeleteMainDNSRecordOk    =$("#btnCnfDelMainPopupOK");
                btnDeleteMainDNSRecordCancel=$("#btnCnfDelMainPopupCanceL");	
		//populate record types array	
               	recordTypes.push({value:'1',recordTypeName:'IP Address',recNamelbl:"Host Name",text:'A',name:'A (IP Address Record)',recNamePH:"Host Name to be resolved",recDataPH:"Enter an IP Address"});
		recordTypes.push({value:'2',recordTypeName:'Canonical Name',recNamelbl:"Host Name",text:'CNAME',name:'CNAME (Alias Record)',recNamePH:"Host Name",recDataPH:"Enter Canonical Name"});
		recordTypes.push({value:'3',recordTypeName:'Host Name',recNamelbl:'IP Address',text:'PTR',name:'PTR (Reverse DNS Record)',recNamePH:"Enter an IP Address",recDataPH:"Host Name"});		
		recordTypes.push({value:'4',recordTypeName:'DNS Server',recNamelbl:'Sub Domain',text:'NS',name:'NS (Delegation Record)',recNamePH:"Enter a Sub Domain",recDataPH:"Enter Host Name or IP or Select a DNS Server"});
              
               cmbRecordType.kendoDropDownList({
			dataTextField:'name',
			dataValueField:'value',
			dataSource:recordTypes,
			change:onRecTypeSelChanged
		}); 

		cmbRecordData.kendoComboBox({
			dataTextField:'text',
			dataValueField:'value'	
		});
		var selType=cmbRecordType.data("kendoDropDownList").dataItem();
		 setRecordName(selType.recNamelbl);	
		 setRecordNameHelpText(selType.recNamePH);	
                 setRecordDataHelpText(selType.recDataPH);
                //populate record class array
                var recordClass=[];
		recordClass.push({text:'IN',value:1,displayname:'IN (Internet)'});	

		cmbRecordClass.kendoDropDownList({
			dataTextField:'displayname',
			dataValueField:'value',
			dataSource:recordClass
		});
               
		txtRecordTTL.attr('placeholder','TTL(86400 secs)');
	       
		//initializing data source for dns records grid
		dsGridDNSRecords = new kendo.data.DataSource({batch:true});	

		//initializing the DNS Record Grid
		gridDNSRecords=$("#dnsRecordsGrid").contrailKendoGrid({
			dataSource:dsGridDNSRecords,
			sortable:false,
			pageable:false,
			navigatable:true,
			reorderable:true,
			resizable:true,
			selectable:true,
			scrollable:false,
			searchToolbar:true,
			searchPlaceholder:"Search DNS Records",
			showSearchbox:true,
			widgetGridTitle:'',
			collapseable:false,
			columnMenu:false,	
			columns:[{ 
          			field: "",
				menu:false, 
			        searchable:false,   	
            			title:"<input id='cb_dnsRecordsGrid' class='ace-input' type='checkbox' onClick=gridSelectAllRows(this,'deleteBtn'); /><span class='ace-lbl'>&nbsp;</span>", 
            			width: 30, 
            			template: "<input id='dnsRecordsGrid_#: Id #' class='ace-input' type='checkbox' onClick=gridSelectRow(this,'deleteBtn'); /><span class='ace-lbl'>&nbsp;</span>" 
       			},
			{
				field:'uuid',
				title:'UUID',
				hidden:true,
			        searchable:false  	
			},
			{
				field:'record_name',
				title:'DNS Record Name',
			        searchable:true  	
				
			},
			{
				field:'record_type',
				title:'DNS Record Type',
			        searchable:false  	 
			},
			{	field:'record_data',
				title:"DNS Record Data",
			        searchable:false  	
			},
			{
				field:'record_ttl_seconds',
				title:'Time To Live',
				hidden:true,
			        searchable:false  	
			},
			{	
				field:'record_class',
				title:'DNS Record Class',
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
            		'            <a onclick="dnsRecordEditWindow();" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
            		'                <i class="icon-edit"></i> &nbsp; Edit' +
            		'            </a>' +
            		'        </li>' +
		  	'        <li>' +
                        '            <a onclick="showRecDelWindow();" class="tooltip-error" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                        '                    <i class="icon-trash"></i> &nbsp; Delete' +
                        '            </a>' +
                        '        </li>' +
            		'    </ul>' +
            		'</div>'			
    		}],
		detailTemplate:kendo.template($("#gridDetails_DNSRecord").html())	
	       });
		gridDNSRecords=$("#dnsRecordsGrid").data("kendoGrid");
		showGridLoading("#dnsRecordsGrid");
		//initializing add record window	  	
		$('body').append(addRecordWindowObj);		
		addRecordWindowObj.modal({backdrop:'static',keyboard:false,show:false});     
		addRecordWindowObj.find(".modal-header-title").text('Add DNS Record');
	         
               //initializing delete record window
		$('body').append(deleteRecordWindowObj);
		deleteRecordWindowObj.modal({backdrop:'static',keyboard:false,show:false});
		deleteRecordWindowObj.find(".modal-header-title").text('Confirm');
               
                $('body').append(deleteMainRecordWindowObj);
                deleteMainRecordWindowObj.modal({backdrop:'static',keyboard:false,show:false});
                deleteMainRecordWindowObj.find(".modal-header-title").text('Confirm');	
	
		//initialize domain drop down
		$("#ddDomain").kendoDropDownList({
		 	dataTextField:'text',
			dataValueField:'value',
			change:onDomainSelChanged	     	
		});

		//innitialize DNS servers drop down
		$("#ddDNSServers").kendoDropDownList({
			dataTextField:'text',
			dataValueField:'value',
			change:onServerSelChanged
		});
		
  	}

	function setRecordNameHelpText(t){
		txtRecordName.attr('placeholder',t);
	}
	
	function setRecordName(t){
		$("#lblRecordName").text(t);
	}
	function setRecordDataHelpText(t){
		$("#cmbRecordData").data("kendoComboBox").input.attr("placeholder",t);
	}
	
	window.showRecDelWindow=function(){
		deleteRecordWindowObj.modal("show");
	}

	window.dnsRecordEditWindow=function(){
		createAddRecordWindow('edit');
	}	
	
	function onDomainSelChanged(e){
		fetchDNSServerDataForRecordsPage();
	}
	function onServerSelChanged(e){
		currentUUID=$("#ddDNSServers").data("kendoDropDownList").dataItem().value;
		fetchDNSRecordsData();
	}

	function onRecTypeSelChanged(e){
		makeRecordDataCall();	
	}
        var selRecordDataItem;
	function makeRecordDataCall(r){
		selRecordDataItem=r;
                var selectedItem=cmbRecordType.data('kendoDropDownList').dataItem();
      		lblRecordTypeName.text(selectedItem.recordTypeName);
		setRecordName(selectedItem.recNamelbl);
		setRecordNameHelpText(selectedItem.recNamePH);
		setRecordDataHelpText(selectedItem.recDataPH);

                if(selectedItem.value === '4'){
			//getting dns server info to populate combo
			doAjaxCall('/api/tenants/config/virtual-DNSs/'+parentUUID,'GET',null,'successHandlerForRecordData','failureHandlerForRecordData',null,null);
		}
		else{
			var c=$("#cmbRecordData").data("kendoComboBox");
			c.dataSource.data([]);
			if(r == undefined)
				c.text('');
			else
				c.text(r);
			
		}
                        
	}

	window.successHandlerForRecordData=function(result){
		var actRes=jsonPath(result,'$..virtual-DNS');
		populateRecordDataCombo(actRes);
	}
	
	window.failureHandlerForRecordData=function(error){
		//alert(error.message);
	}
	
	function populateRecordDataCombo (res){
		if(res.length >0){
			var selDomain=$("#ddDomain").data("kendoDropDownList").dataItem(); 
            if(!isValidDomain(selDomain.text))
                return;

			var cmbRecData=$("#cmbRecordData").data("kendoComboBox");
			if(selDomain !== undefined){
				selDomain=selDomain.text;	
			}
			else
				selDomain='';	
			for(var resCount=0;resCount < res.length;resCount++){
				dnsNames.push({text:selDomain +":"  + res[resCount].name,value:resCount});
			}
			cmbRecData.dataSource.data(dnsNames);
		
			if(selRecordDataItem != undefined)
                                cmbRecData.text(selRecordDataItem); 
		}	
	}

	function initActions(){
		btnAddRecord.click(function(e){
			e.preventDefault();
			createAddRecordWindow("create");
		});
		
		btnAddDNSRecordOk.click(function(e){
			 e.preventDefault();	
			 saveRecordDetails();	
		});
		
		btnDeleteRecord.click(function(args){	
			deleteMainRecordWindowObj.modal("show");
		});
		
		btnDeleteDNSRecordOk.click(function(args){
			var selected_row=gridDNSRecords.dataItem(gridDNSRecords.select());
			deleteRecordWindowObj.modal("hide");
			deleteDNSRecord([selected_row]);
		});
		
		btnDeleteMainDNSRecordOk.click(function(args){
                        var selected_row=getCheckedRows("dnsRecordsGrid");
                        deleteMainRecordWindowObj.modal("hide");
                        deleteDNSRecord(selected_row);
                });


		//handle key down validations
		txtRecordName.bind('keydown',function(e){
			handleSpecialCharectersWithDot(e);
		});
		
		$("#cmbRecordData").bind('keydown',function(e){
			handleSpecialCharectersWithDot(e);
		})
	}
	
	function deleteDNSRecord(selected_rows){	
			//showMessageDialog();
			btnDeleteRecord.attr("disabled","disabled");		
		if(selected_rows && selected_rows.length>0){
			var deleteAjaxs =[];
			for(var i=0;i<selected_rows.length;i++){
				var sel_row_data=selected_rows[i];
				 deleteAjaxs[i]=$.ajax({
                                                url:'/api/tenants/config/virtual-DNS/'+currentUUID+'/virtual-DNS-record/'+sel_row_data['uuid'],
                                                type:'DELETE'
                                        });
			}
		        $.when.apply($,deleteAjaxs).then(
				function(response){
					//all success
					//showSuccessMessage();
					fetchDNSRecordsData();
				},
				function(){
				//if at least one delete operation fails
				//closeMessageDialog(0);
				 var r = arguments;
                 		 showInfoWindow(r[0].responseText,r[2]);		
				 fetchDNSRecordsData();
				}
			);
		}
	}

	function handleSpecialCharecters(e){
		var k=e.keyCode;
		if((!(k>=48 && k<=57) && !(k>=65 && k<=90)&& !(k>=96 && k<=105) && !(e.shiftKey && (k>=65 && k<=90)) && !(k==38 || k==40 ||k ==37 ||k==39||k==9 ||k==8||k==35||k==36||k==45||k==46||k==189||k==144))
				|| (e.shiftKey && (k>=48 && k<=57)) ||(e.shiftKey && k ==189))
                          e.preventDefault();
		
	}	
    
	function handleSpecialCharectersWithDot(e){
                var k=e.keyCode;
                if((!(k>=48 && k<=57) && !(k>=65 && k<=90)
				      && !(k>=96 && k<=105) && !(e.shiftKey && (k>=65 && k<=90)) && !(k==38 || k==40 ||k ==37 ||k==39||k==9 ||k==8||k==35||k==36||k==45||k==46||k==189||k==144||k==190||k==110))
                                      || (e.shiftKey && (k>=48 && k<=57)) ||(e.shiftKey && k ==189)||(e.shiftKey && k==190))
                          e.preventDefault();

        }
	

	function populateEditAssociatedWindow(){
		var domain=JSON.parse(sessionStorage['sel_domain']).text; 
		var project=JSON.parse(sessionStorage['sel_proj']).text;
		doAjaxCall('/api/tenants/config/ipams?tenant_id='+domain+":"+project,'GET',null,'successHandlerForEditIPAMs','failureHandlerForEditIPAMs',null,null);
	}

	window.successHandlerForEditIPAMs=function(result){
	 dsAssociatedLstView=[], dsAvailableLstView=[];
	var ipams=jsonPath(result,"$..network-ipams");
	if(ipams != undefined && ipams.length>0){		
	  var rows=$("#associatedIPAMsGrid [role='row']");
		for(var count=0;count<ipams.length;count++){
	 		if(rows != undefined && rows.length >0){
				for(var i=0;i<rows.length;rows++){
					var rowData=$("#associatedIPAMsGrid").data("kendoGrid").dataItem(rows[i]);
					if(ipams[count][0].fq_name[2] === rowData.ipam_name){
						dsAssociatedLstView.push({name:rowData.ipam_name});
					}	
					else{
						dsAvailableLstView.push({name:rowData.ipam_name});
					}
				}
			 } 		
			else{
				dsAvailableLstView.push({name:ipams[count][0].fq_name[2]});
			}
          	}   
	}
	
      availabelIPAMsLst.data("kendoListView").dataSource.data(dsAvailableLstView);
      associatedIPAMsLst.data("kendoListView").dataSource.data(dsAssociatedLstView);	
}
	window.failureHandlerorEditIPAMs=function(error){
		//alert(error.message);	
	}	
	function validate(){
		var rn=txtRecordName.val().trim();
		if(rn  === ""){	
			var txt=$("#lblRecordName").text();
			showInfoWindow("Enter a "+txt,"Input required");
			return false;
		}
		if($("#lblRecordName").text() === "IP Address"){
		       if(!validateIPAddress(rn)){
				showInfoWindow("Enter a valid IP address in xxx.xxx.xxx.xxx format","Input required");
				return false;
			}
		}
 
		if(getRecordDataItem() === ""){
			var txt=$("#lblRecordTypeName").text();
			var art;
			if(txt === "IP Address")
				art="an ";
			else
				art="a ";
			showInfoWindow("Enter "+art+txt,"Input required");
			return false;
		}
		var c=$("#cmbRecordData").data("kendoComboBox");
		var rd=cmbRecordType.data('kendoDropDownList').dataItem().value;
		if(rd === "1"){
			if(! validateIPAddress(c.text())){
				showInfoWindow("Enter a valid IP address in xxx.xxx.xxx.xxx format","Input required");
				return false;
			}	
		}
		
		var v=$("#txtRecordTTL").val().trim();
		if(v!==""){
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
		
		return isSpclChar(c.text());	
		
	}
	
	function isSpclChar(txt){
   		var iChars = "!@#$%^&*()+=_[]|';,/{}|\":<>?~`";
		for(var i=0;i<txt.length;i++)
   		if(iChars.indexOf(txt[i]) != -1) {
    			showInfoWindow("Record data field has special characters. \nThese are not allowed.\n");
     			return false;
   		}
		else
			return true;
	}

	function getRecordDataItem(){
	        var recordData=$("#cmbRecordData").data("kendoComboBox").dataItem();
		if(recordData == undefined){
			recordData = $("#cmbRecordData").data("kendoComboBox").text();
		} 
		else{
			recordData = recordData.text;
		}
		return recordData;
	}		
	
	function resetAddRecordWindow(){
		//txtRecordName[0].disabled=false;
		txtRecordName.val('');
		var d= $("#cmbRecordType").data('kendoDropDownList');
		d.enable(1);
		d.select(0);
		var selType=d.dataItem();
	   	setRecordName(selType.recNamelbl);
		setRecordNameHelpText(selType.recNamePH);
		setRecordDataHelpText(selType.recDataPH);
		lblRecordTypeName.text(selType.recordTypeName);
		var c=$("#cmbRecordData").data('kendoComboBox');	
		c.dataSource.data([]);
		c.text('');
		var e= $("#cmbRecordClass").data('kendoDropDownList');
		e.select(0);
		e.enable(1);
		txtRecordTTL.val('');
	        defaultTTL=86400;
		dnsNames=[];
	}
		
	function saveRecordDetails(){
		if(!validate())return false;
		hideAddRecordWindow();
		//showMessageDialog();
		//get user entries
		var recordName	=	 txtRecordName.val();
		var recordType	=	 cmbRecordType.data('kendoDropDownList').dataItem().text;
		var recordData	=	getRecordDataItem();
            	var recordClass	=	 cmbRecordClass.data('kendoDropDownList').dataItem().text;
             
		if(txtRecordTTL.val() != undefined && txtRecordTTL.val() !='')
			defaultTTL=txtRecordTTL.val();
		var recordTTL	= parseInt(defaultTTL,10);
                 
		
		//prepare post object
	        var selDomain=$("#ddDomain").data("kendoDropDownList").dataItem().text;		
		var postData={};
		postData["parent-type"]		=	"domain";
		postData["fq-name"]		=	[selDomain,defaultDomainName];
		postData["virtual_DNS_records"]	=	[{"to":[selDomain,defaultDomainName],
							"virtual_DNS_record_data":{"record_name":recordName,"record_type":recordType,"record_data":recordData,"record_class":recordClass,
							"record_ttl_seconds":recordTTL}}];
		var dnsRecordCfg={};
		dnsRecordCfg["virtual-DNS"]	=	postData;
		var url,type;
                if(mode === "create"){
			url="/api/tenants/config/virtual-DNS/"+currentUUID+"/virtual-DNS-records";
			type="POST";
		}
		else if(mode === "edit"){
			var sel_row=gridDNSRecords.select();
                        var sel_row_data=gridDNSRecords.dataItem(sel_row);
			url='/api/tenants/config/virtual-DNS/'+currentUUID+'/virtual-DNS-record/'+sel_row_data['uuid'];
			type="PUT";
		}
		doAjaxCall(url,type,JSON.stringify(dnsRecordCfg),"successHandlerForDNSRecordSave",
				"failureHandlerForDNSRecordSave" ,null,null);
	}

	window.successHandlerForDNSRecordSave=function(res){
	      //showSuccessMessage();	
	      fetchDNSRecordsData();		
	}

	window.failureHandlerForDNSRecordSave=function(error){
		//closeMessageDialog(0);
	}
	
	function createAddRecordWindow (m){
	        mode=m;
                resetAddRecordWindow();	   
		if(mode === "edit"){
			 addRecordWindowObj.find(".modal-header-title").text('Edit DNS Record');
			populateAddRecordWindow();
		}
		else{
			 addRecordWindowObj.find(".modal-header-title").text('Add DNS Record');
		}
		addRecordWindowObj.modal('show');
	}
	function populateAddRecordWindow(){
		var selRow=gridDNSRecords.dataItem(gridDNSRecords.select());
		var d= $("#cmbRecordType").data('kendoDropDownList');	
		txtRecordName.val(selRow.record_name);
		//txtRecordName[0].disabled=true;
		var selRecType=selRow.record_type;
		d.select(function(d){return d.name === selRecType;});
		d.enable(0);
                var selRecData=selRow.record_data;
		makeRecordDataCall(selRecData);
		var c= $("#cmbRecordClass").data("kendoDropDownList");
		c.select(function(d){return d.text === selRow.record_class;});
		c.enable(0);
		txtRecordTTL.val(selRow.record_ttl_seconds);
	}
	
	function hideAddRecordWindow(){
		addRecordWindowObj.modal('hide');
	}
	
	function fetchDNSRecordsData(){ 	
		doAjaxCall("/api/tenants/config/virtual-DNS/"+currentUUID,"GET",null,"successHandlerForDNSRecords","failureHandlerForDNSRecords",null,null);	
	}
	
	window.successHandlerForDNSRecords = function(result){
		//trim virtual-DNSi
		$("#cb_dnsRecordsGrid").attr("checked",false);  	
		var actRes = jsonPath(result,"$..virtual-DNS");
		defaultDomainName = actRes[0].name;
		//set dns name
                var viewModel = kendo.observable({
			dnsName:actRes[0].name
		});
		 kendo.bind($("body"),viewModel);

		//prepare datasource for the DNSRecords grid
		prepareDataSourceForDNSRecordsGrid(result);

	}
       
        function getActualRecType(t){
		var n='';
		for(var i=0;i<recordTypes.length;i++){
			if(recordTypes[i].text ===t){
				n=recordTypes[i].name;
				break;
			}
		}
		return n;
	}	

	function prepareDataSourceForDNSRecordsGrid(result){
		 //trim virtual-DNS
		 var actRes = jsonPath(result,"$..virtual-DNS");
		var response =actRes[0];
                var dnsRecords=response.virtual_DNS_records;
		parentUUID=response.parent_uuid;
		if(dnsRecords != undefined && dnsRecords.length >0){
			var dataSource=[];
			for(var recordCount=0;recordCount < dnsRecords.length;recordCount++){
                                var dnsRecordsData = dnsRecords[recordCount].virtual_DNS_record_data;
				
				dataSource.push({
					"Id"			:recordCount,
					"uuid"			:dnsRecords[recordCount].uuid,
					"record_name"		:dnsRecordsData["record_name"],
					"record_type"		:getActualRecType(dnsRecordsData["record_type"]),
					"record_data"		:dnsRecordsData["record_data"],
					"record_ttl_seconds"	:dnsRecordsData["record_ttl_seconds"],
					"record_class"		:dnsRecordsData["record_class"]
				});
			}
			
			dsGridDNSRecords.data(dataSource);
		}
		else{
			 dsGridDNSRecords.data([]);
		}
		check4GridEmpty('#dnsRecordsGrid', 'No DNS Record found.');     		
	}

	window.failureHandlerForDNSRecords = function(error){
		//alert(error.message);
	}
		
	
	function destroy(){
		dsGridDNSRecords=$();
		var t= $("#cmbRecordType").data("kendoDropDownList");
		t.destroy();
		var d=$("#cmbRecordData").data("kendoComboBox");
		d.destroy();
		var c=$("#cmbRecordClass").data("kendoDropDownList");
		c.destroy();
		var dm=$("#ddDomain").data("kendoDropDownList");
		dm.destroy();
		var s=$("#ddDNSServers").data("kendoDropDownList");
		s.destroy();
		addRecordWindowObj.remove();
		deleteRecordWindowObj.remove();
	}
}
