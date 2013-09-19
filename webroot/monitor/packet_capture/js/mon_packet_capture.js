/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

//Load Packet Capture - Begin
function loadPacketCapture() {
	var pcapTemplate = kendo.template($("#pcap-template").html());
	$(contentContainer).html('');
	$(contentContainer).html(pcapTemplate);
	loadPCAPLayout();
	currTab = 'mon_debug_pcapture';
}

//Load Packet Capture - End
var vnViewModel = kendo.observable({
		srcDstVN:[],
		applyVN:[],
		analyzers:[]
	}),
	mirrorGrid, analyzerGrid, addMirrorWindow, addAnalyzerWindow, addMirrorTemplate, addAnalyzerTemplate;

function loadAnalyzersGrid() {
	$("#grid-analyzer").kendoGrid({
		dataSource:{
			type:"json",
			transport:{
				read:{
					url:"/api/admin/analyzers",
					timeout:10000
				}
			},
			change:onAnalyzerGridChange,
			error:function (xhr, error) {
				alert('Error in Get Analyzer: ' + xhr.errorThrown);
			},
			schema:{
				model:{
					fields:{
						name:{ type:"string" },
						vnc:{ type:"string" },
						Action:{ type:"string" }
					}
				}
			},
			pageSize:4
		},
		height:235,
		scrollable:true,
		sortable:true,
		selectable:true,
		change:function () {
			var selectedRow = this.select(),
				dataItem;
			dataItem = this.dataItem(selectedRow);
			if(dataItem) {
				mirrorGrid.data("kendoGrid").dataSource.filter({ field:"analyzer_name", operator:"eq", value:dataItem.name });
			}
		},
		dataBound:function () {
			var firstRow = this.element.find('tbody tr:first'),
				dataItem;
			firstRow.addClass('k-state-selected');
			dataItem = this.dataItem(firstRow);
			if(dataItem) {
				mirrorGrid.data("kendoGrid").dataSource.filter({ field:"analyzer_name", operator:"eq", value:dataItem.name });
			}
		},
		filterable:true,
		pageable:true,
		toolbar:kendo.template($("#toolbar-analyzer-template").html()),
		columns:[
			{
				field:"name",
				title:"Analyzer Name"
			},
			{
				command:[
					{
						text:"View", click:viewAnalyzer
					},
					{
						text:"Delete", click:deleteAnalyzer
					}
				],
				title:"Actions",
				width:200
			}
		]
	});
	analyzerGrid = $('#grid-analyzer')
	addAnalyzerTemplate = kendo.template($("#addAnalyzerTemplate").html());
};

function showSelectedDirection() {
	var direction = $("#direction").find(":selected").text();
	$("#address-direction").text(direction);
	$("#ports-direction").text(direction);
}

function loadMirrorsGrid() {
	$("#grid-mirror").kendoGrid({
		dataSource:{
			type:"json",
			transport:{
				read:{
					url:'/api/admin/mirrors',
					timeout:10000
				}
			},
			change:onMirrorGridChange,
			error:function (xhr, error) {
				alert('Error in get list of attached packet captures: ' + xhr.errorThrown);
			},
			schema:{
				model:{
					fields:{
						analyzer_name:{ type:"string" },
						apply_vn:{ type:"string" },
						protocol:{ type:"number" },
						name:{ type:"string" },
						src_vn:{ type:"string" },
						src_ip_prefix:{ type:"string" },
						src_ip_prefix_len:{ type:"string" },
						start_src_port:{ type:"string" },
						end_src_port:{ type:"string" },
						dst_vn:{ type:"string" },
						dst_ip_prefix:{ type:"string" },
						dst_ip_prefix_len:{ type:"string" },
						start_dst_port:{ type:"string" },
						end_dst_port:{ type:"string" },
						time_period:{ type:"string" }
					}
				}
			},
			pageSize:4
		},
		height:287,
		scrollable:true,
		sortable:true,
		selectable:true,
		filterable:true,
		pageable:true,
		toolbar:kendo.template($("#toolbar-mirror-template").html()),
		columns:[
			{
				field:"name",
				title:"Name",
				width:100
			},
			{
				field:"apply_vn",
				title:"Capture for Virtual Network",
				width:190
			},
			{
				field:"src_vn",
				title:"Source Virtual Network",
				template:"#=(src_vn ? src_vn : 'any')#",
				width:150,
				filterable:false,
				sortable:true
			},
			{
				field:{src_ip_prefix:"src_ip_prefix", src_ip_prefix_len:"src_ip_prefix_len"},
				title:"Source IPs",
				width:100,
				template:"#=(src_ip_prefix ? (src_ip_prefix + (src_ip_prefix_len ? ('/' + src_ip_prefix_len) : '')) : 'any')#",
				filterable:false,
				sortable:false
			},
			{
				field:{start_src_port:"start_src_port", end_src_port:"end_src_port" },
				title:"Source Ports",
				width:100,
				template:"#=(start_src_port ? (start_src_port + (end_src_port ? (' - ' + end_src_port) : '')) : 'any')#",
				filterable:false,
				sortable:false

			},
			{
				field:"dst_vn",
				title:"Dest. Virtual Network",
				template:"#=(dst_vn ? dst_vn : 'any')#",
				width:150,
				filterable:false,
				sortable:true
			},
			{
				field:{dst_ip_prefix:"dst_ip_prefix", dst_ip_prefix_len:"dst_ip_prefix_len"},
				title:"Dest. IPs",
				width:100,
				template:"#=(dst_ip_prefix ? (dst_ip_prefix + (dst_ip_prefix_len ? ('/' + dst_ip_prefix_len) : '')) : 'any')#",
				filterable:false,
				sortable:false

			},
			{
				field:{start_dst_port:"start_dst_port", end_dst_port:"end_dst_port" },
				title:"Dest. Ports",
				width:100,
				template:"#=(start_dst_port ? (start_dst_port + (end_dst_port ? (' - ' + end_dst_port) : '')) : 'any')#",
				filterable:false,
				sortable:false

			},
            {
                field:"protocol",
                title:"IP Protocol",
                template:"#= getProtocolName(protocol)#",
                filterable:false,
                width:100
            },
			{
				command:[
					{
						text:"Delete", click:deleteMirror
					}
				],
				title:"Actions",
				width:100
			}
		]
	});
	mirrorGrid = $('#grid-mirror');

	addMirrorTemplate = kendo.template($("#addMirrorTemplate").html());
};

function getProtocolName(protocol) {
    if(protocol == 6) {
        return 'TCP';
    } else if (protocol == 17) {
        return 'UDP';
    } else if (protocol == 1) {
        return 'ICMP';
    } else {
        return 'any';
    }
};

function onMirrorGridChange(msg) {
	if (this._total > 0) {
		$(this.options.table).find('.no-record').remove();
		return;
	} else {
		if ($(this.options.table).find('.no-record').html() == null) {
			$(this.options.table).append('<td colspan="3" class="no-record">No Records Found.</td>')
		}
	}
};

function onAnalyzerGridChange(msg) {
	if (this._total > 0) {
		$(this.options.table).find('.no-record').remove();
		$("#add-mirror-button").removeAttr('disabled');
		$("#add-mirror-button").removeClass("k-state-disabled");
		return;
	} else {
		if ($(this.options.table).find('.no-record').html() == null) {
			$(this.options.table).append('<td colspan="3" class="no-record">No Records Found.</td>')
		}
		$("#add-mirror-button").attr("disabled", "disabled");
		$("#add-mirror-button").addClass("k-state-disabled");
	}
};

function viewAnalyzer(e) {
	e.preventDefault();
	var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
	window.open(dataItem.vnc);
};

function deleteAnalyzer(e) {
	e.preventDefault();
	var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
	var cPop = confirm('Are you sure you want to delete analyzer - ' + dataItem.name + '?');
	if (cPop) {
		$.ajax({
			type:"POST",
			url:"/api/admin/delete-analyzer/" + dataItem.name,
			success:function (data) {
				analyzerGrid.data("kendoGrid").dataSource.read();
			},
			error:function (message) {
				if (message.responseText) {
					alert('Error: ' + message.responseText);
				} else {
					alert('Delete Analyzer Failed.');
				}
			}
		});
	}
};

function openAddAnalyzer() {
	$("#pcap-container").append("<div id='addAnalyzer'></div>");
	addAnalyzerWindow = $("#addAnalyzer")
		.kendoWindow({
			title:"Add Analyzer",
			modal:true,
			visible:false,
			resizable:false,
			width:305,
			deactivate:function () {
				this.destroy();
			}
		}).data("kendoWindow");
	addAnalyzerWindow.content(addAnalyzerTemplate);
	addAnalyzerWindow.center().open();
};

function addAnalyzer() {
	addAnalyzerWindow.close();
	$.ajax({
		type:"POST",
		url:"/api/admin/add-analyzer",
		data:$("#add-analyzer-form").serialize(),
		success:function (data) {
			analyzerGrid.data("kendoGrid").dataSource.read();
		},
		error:function (message) {
			if (message.responseText) {
				alert('Error: ' + message.responseText);
			} else {
				alert('Add Analyzer Failed.');
			}
		}
	});
	return false;
};

function deleteMirror(e) {
	e.preventDefault();
	var dataItem = this.dataItem($(e.currentTarget).closest("tr"));
	var cPop = confirm('Are you sure you want to delete an attached packet capture - ' + dataItem.name + '?');
	if (cPop) {
		$.ajax({
			type:"POST",
			url:"/api/admin/delete-mirror/" + dataItem.name,
			success:function (data) {
				mirrorGrid.data("kendoGrid").dataSource.read();
			},
			error:function (message) {
				if (message.responseText) {
					alert('Error: ' + message.responseText);
				} else {
					alert('Delete of attached packet capture failed.');
				}
			}
		});
	}
};

function openAddMirror() {
	loadVNs('/api/admin/networks');
	loadAnalyzers('/api/admin/analyzers');
	$("#pcap-container").append("<div id='addMirror'></div>");
	addMirrorWindow = $("#addMirror")
		.kendoWindow({
			title:"Attach Packet Capture",
			modal:true,
			visible:false,
			resizable:false,
			width:570,
			deactivate:function () {
				this.destroy();
			}
		}).data("kendoWindow");
	addMirrorWindow.content(addMirrorTemplate);
	$("#cap-vn").kendoDropDownList();
	$("#cap-vn").data("kendoDropDownList").list.width(350);
	$("#src-dst-vn").kendoDropDownList();
	$("#src-dst-vn").data("kendoDropDownList").list.width(350);
	addMirrorWindow.center().open();
	showSelectedDirection();
};

function addMirror() {
	addMirrorWindow.close();
	$.ajax({
		type:"GET",
		url:"/api/admin/add-mirror",
		data:$("#add-mirror-form").serialize(),
		success:function (data) {
			mirrorGrid.data("kendoGrid").dataSource.read();
		},
		error:function (message) {
			if (message.responseText) {
				alert('Error: ' + message.responseText);
			} else {
				alert('Request to attach a new packet capture failed.');
			}
		}
	});
	return false;
};

function loadAnalyzers(urlPath) {
	$.ajax({
		url:urlPath,
		dataType:"json",
		success:function (response) {
			vnViewModel.set('analyzers', response);
			kendo.bind($('#addMirror-container'), vnViewModel);
		}
	});
};

function loadVNs(urlPath) {
	$.ajax({
		url:urlPath,
		dataType:"json",
		success:function (response) {
			var res = jsonPath(response, "$.virtual-networks[*].fq_name"),
				i, fqName, results = [
					{"name":'Select Net', "value":''}
				];
			for (i = 0; i < res.length; i++) {
				results.push({"name":res[i].join(':'), "value":res[i].join(':')});
			}
			vnViewModel.set('srcDstVN', results);
			vnViewModel.set('applyVN', results);
			kendo.bind($('#addMirror-container'), vnViewModel);
		}
	});
};

function loadPCAPLayout() {
	loadAnalyzersGrid();
	loadMirrorsGrid();
};
