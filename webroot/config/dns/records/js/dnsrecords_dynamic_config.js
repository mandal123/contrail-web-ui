/*
 *  Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */
dnsRecordsDynamicConfigObj=new dnsRecordsDynamicConfig();
function dnsRecordsDynamicConfig(){
    //Variable Definations
    //Grids
    var gridDynamicDNSRec;
    //DataSources
    var dsGridDynamicDNSRec;

    //Method Definations
    this.load      = load;
    this.init      = init;	
    this.fetchData = fetchData;	
    this.destroy   = destroy;

    function load(){
        var configTemplate=kendo.template($("#DNSRecords-dynamic-config-template").html());
	$(contentContainer).html('');
	$(contentContainer).html(configTemplate);
        init();
        fetchData(); 
    }

    function init(){
        //initializing data source 
        dsGridDynamicDNSRec = new kendo.data.DataSource({batch:true});	
	//initializing grid
	gridDynamicDNSRec =$("#gridDynamicDNSRec").contrailKendoGrid({
			                                              dataSource:dsGridDynamicDNSRec,
								      sortable:true,
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
								      columns:[
									           {
										       field:'name',
				                                                       title:'Name',
				                                                       hidden:false,
			                                                               searchable:false  	
			                                                          },
										  {
							 	                       field:'rec_name',
										       title:'DNS Record Name',
			        						       searchable:true  	
				
			                                                          },
			                                                          {
				                                                       field:'rec_type',
				                                                       title:'DNS Record Type',
			                                                               searchable:false  	 
			                                                          },
			   							  { 	
										       field:'rec_data',
				                                                       title:"DNS Record Data",
			                                                               searchable:false  	
										  },
										  {
										       field:'rec_ttl',
				                                                       title:'Time To Live',
				                                                       hidden:true,
			                                                               searchable:false  	
										  },
			                                                          {	
										       field:'rec_class',
				                                                       title:'DNS Record Class',
				                                                       hidden:true,
			                                                               searchable:false  	
			                                                          },
                                                                                  {   
                                                                                       field:'source',
                                                                                       title:'Source',
                                                                                       hidden:false,
                                                                                       searchable:false
                                                                                  }
                                                                                  ,
                                                                                  {   
                                                                                       field:'installed',
                                                                                       title:'Installed',
                                                                                       hidden:false,
                                                                                       searchable:false
                                                                                  }],
                                                                      detailTemplate:kendo.template($("#gridDetails_dynamic_DNSRecord").html())   
										  			
                        	    	});
        gridDynamicDNSRec=$("#gridDynamicDNSRec").data("kendoGrid");
        showGridLoading("#gridDynamicDNSRec");
    }
		
    function fetchData(){
	var domain=JSON.parse(localStorage["sel_domain"]);
	var dnsName;
        var dnsIndex = window.location.href.search("dnsName");
        if(dnsIndex != -1){
            dnsName = window.location.href.substring(dnsIndex+8,window.location.href.length-3);
	}
	$("#lblServer").text(dnsName);
	var dnsfqn=domain.text +":" + dnsName;
        doAjaxCall("/api/tenants/config/sandesh/virtual-DNS/"+dnsfqn,"GET",null,"successDynamicRecData","failureDynamicRecData",null,null);     
    }	
    window.successDynamicRecData= function(e){
       //prepare grid data source 
        var ds=[];
        if(e && e.length>0 && e[0] && e[0].VirtualDnsRecordsResponse && e[0].VirtualDnsRecordsResponse.records && e[0].VirtualDnsRecordsResponse.records.list){
            var res=e[0].VirtualDnsRecordsResponse.records.list.VirtualDnsRecordTraceData;
            if(res){
		        if(res.length>0){   
		          	for(var i=0;i<res.length;i++){
	                    var d=res[i];
		                ds.push({"name":d.name,"rec_name":d.rec_name,"rec_type":d.rec_type,"rec_data":d.rec_data,"rec_ttl":d.rec_ttl,"rec_class":d.rec_class,"source":d.source,"installed":d.installed,"raw_json":d});        	
		            }
		        }
		        else{
		        	var d=res;
		        	ds.push({"name":d.name,"rec_name":d.rec_name,"rec_type":d.rec_type,"rec_data":d.rec_data,"rec_ttl":d.rec_ttl,"rec_class":d.rec_class,"source":d.source,"installed":d.installed,"raw_json":d}); 
		        }
            }      
        }
        if(ds.length>0){
          dsGridDynamicDNSRec.data(ds);
	    }
        else{
            check4GridEmpty('#gridDynamicDNSRec', 'No DNS Record found.');
        }  	
    }   

    window.failureDynamicRecData= function(e){
        showGridMessage("#gridDynamicDNSRec", "Error while getting DNS Records data.");
    }		
    
    function destroy(){
        dsGridDynamicDNSRec=$();	
    }						
	
}
