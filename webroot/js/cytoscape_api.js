/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var mousePosition={x:0,y:0};
function topology(){
	var nodeArr=new Array();
	var nodes_d3=new Array();
	var links_d3=new Array();
	var nodes_labels=new Array();
	var links_labels=new Array();
	var loaded_d3=false;
	var id;
	var graph,node,link,node_label,link_label,force,force_label;
	this.loadGraph=function(id,layout){
	cytoscape.instances=new Array();//To avoid registering to same cytoscape instance
	    var options;
		if(layout=='breadthfirst')
			options={name:layout,directed:true,fit:true};
		else if(layout=='grid')
			options={name:layout,fit:true};
	   $("#"+id).cy({
			layout:options,
			zoom:1,
			minZoom:0.7,
			maxZoom:1.4,
			showOverlay:false,
			elements:nodeArr,
			style:cytoscape.stylesheet()
			.selector('node')
			.css({
				'shape':'data(shape)',
				'width':'mapData(weight,30,80,20,50)',
				'height':'mapData(height,0,200,10,40)',
				'content':'data(name)',
				'text-valign':'data(text_align)',
				'border-color':'#3182bd',
			    'border-width':0.5,
				'background-color':'#CCE6FF',
				'color':'#070B19'
			})
			.selector('edge')
			.css({
				'width':'data(width)',
				'line-color':'data(line_color)',
			})
			.selector('node.highlight')
			.css({
				'background-color':'#CCE6FF',
			}),
			ready:function(){
				graph=this;
				$("#"+id).bind('mousemove',function(eve){
					mousePosition.x=eve.clientX;
					mousePosition.y=eve.clientY;
					mousePosition.x+=window.pageXOffset;//To cover horizontal scroll
					mousePosition.y+=window.pageYOffset;//To cover vertical scroll
				});
				graph.filter("node[id=\""+$("#"+id).data('fqName')+"\"]").addClass('highlight');
				/*graph.filter(function(i,element){
					if(element.isNode() && element.data('active')==false){
						element.content='InActive';   
						return true;						fading the deleted node need to check and uncomment
					}else
						return false;
				}).css('opacity',0.3);*/
				graph.zoomingEnabled(false);
				graph.nodes().bind('mouseout',function(eve){
					$('.qtip').remove();
				})
				graph.edges().bind('mouseout',function(eve){
					$('.qtip').remove();
				})
				graph.nodes().bind('mouseover',function(eve){
					
					//$("#toolTip_content").html(this.data('toolTip'));
					if(this.data('type')=='virtual-network')
						toolTipPlugin(this.data('toolTip'),mousePosition.x,mousePosition.y,'Network');
					else if(this.data('type')=='service-instance')
						toolTipPlugin(this.data('toolTip'),mousePosition.x,mousePosition.y,'Service Instance');
				})
				graph.edges().bind('mouseover',function(eve){
					//$("#toolTip_content").html(this.data('toolTip'));
					    if(this.data('title_tt')!=undefined && this.data('title_tt')!="")
						   toolTipPlugin(this.data('toolTip'),mousePosition.x,mousePosition.y,this.data('title_tt'));
						else
						   toolTipPlugin(this.data('toolTip'),mousePosition.x,mousePosition.y,'Link');
				})
				graph.nodes("[type='virtual-network']").on('click',function(eve){
				var eles=graph.elements("[name=\""+this.data('name')+"\"]");
				for(var i=0;i<eles.length;i++){
					if(eles[i].data('name')==this.data('name') && eles[i].hasClass("highlight") && eles[i].data('id')!=$("#"+id).data('fqName'))
						eles[i].removeClass("highlight");
					else
						eles[i].addClass("highlight");
					layoutHandler.setURLHashParams({fqName:eles[i].data('id')},{p:'mon_net_networks'});
					}
				})
				graph.edges().on('click',function(eve){
					var ele=graph.elements("[id=\""+this.data('id')+"\"]");
					layoutHandler.setURLHashParams({fqName:ele.data('target'),srcVN:ele.data('source')},{p:'mon_net_networks'});
				})
			}
		});
		
		$('.qtip').live('click',function(){
			var nodeId=$(this).find('div.qtip-content').text();
			if($(this).find('div.qtip-title').text()=='Network')
				layoutHandler.setURLHashParams({fqName:nodeId},{p:'mon_net_networks'});
		})
	}
	this.addNode=function(configData){
		var text_align='top';
		if(configData.dst)
			text_align='bottom';
		nodeArr.push({group:"nodes", data:{id:configData.id,name:configData.name,shape:configData.shape,
		weight:configData.weight,height:configData.height,toolTip:configData.toolTip,active:configData.active,
		color:configData.color,classes:configData.classes,type:configData.type,text_align:text_align},grabbable:false});
		var node=new Object();
		node.configData=configData;
		return node;
	}
	this.addEdge=function(configData){
		nodeArr.push({group:"edges",data:{source:configData.src,target:configData.dest,name:configData.name,id:configData.src+"_"+configData.dest,
		strength:configData.strength,target_arrow_shape:configData.target_arrow_shape,source_arrow_shape:configData.source_arrow_shape,
		source_arrow_color:configData.source_arrow_color,target_arrow_color:configData.target_arrow_color,line_color:configData.line_color,
		width:configData.width,toolTip:configData.toolTip,title_tt:configData.title_tt},grabbable:false});
		var edge=new Object();
		edge.configData=configData;
		return edge;
	}
	this.unLoadTopology=function(){
		if(graph!=undefined){
		nodeArr=new Array();
		var eles=graph.elements();
		graph.remove(eles);
		graph=null;
		$("#"+id).html("");}
	}
	this.loadD3=function(id){
		var image=false;
		$("#"+id).bind('mousemove',function(eve){
			mousePosition.x=eve.clientX;
			mousePosition.y=eve.clientY;
			mousePosition.x+=window.pageXOffset;//To cover horizontal scroll
			mousePosition.y+=window.pageYOffset;//To cover vertical scroll
			//console.log(mousePosition);
		});
		width=$("#"+id).width();
		height=$("#"+id).height();
		var linkDistance=60,charge=-300;
		if(links_d3.length>nodes_d3.length)
			linkDistance=170;
		//Adding links for second force to hold labels
		for(var i=0;i<nodes_d3.length;i++){
			links_labels.push({source:nodes_labels[i*2],
							  target:nodes_labels[i*2+1],
							  weight:1});
		}
		var svg=d3.select("#"+id).append('svg')
		          .attr("width",$("#"+id).width())
		          .attr("height",$("#"+id).height());
		
		force=d3.layout.force()
                    .nodes(nodes_d3)
                    .links(links_d3)
                    .size([width,height])
                    .linkDistance(linkDistance)
                    //.linkStrength()
                    .friction(0.8)
                    .charge(charge)
                    .gravity(0.07)
                    .on("tick",function(){return tick(id);})
                    .start();
		force_label=d3.layout.force()
        			.nodes(nodes_labels)
        			.links(links_labels)
        			.size([width,height])
        			.friction(0.09)
        			.linkDistance(5)
        			.charge(-300)
        			.gravity(0)
        			.linkStrength(0.8)
        			.start();
		var drag=force.drag().on("dragstart",dragstart);
		link=svg.selectAll("line")
        		.data(force.links())
        		.enter()
        		.append("line")
        		.attr("class","link")
        		.style("stroke","transparent")
        		.style("stroke-width",6.0)
        		.on("mouseover",mouseover_link)
        		.on("mouseout", mouseout)
        		.on("click",click_link);
        link_transperant=svg.selectAll("line.trans")
        		.data(force.links())
        		.enter()
        		.append("line")
        		.attr("class","trans")
        		.style("stroke",function(d){return d.line_color;})
        		.style("stroke-width",function(d){return d.width;})
        		.on("mouseover",mouseover_link)
        		.on("mouseout", mouseout)
        		.on("click",click_link);
		if(image){
		node=svg.selectAll(".node")
				.data(force.nodes())
				.enter().append("g")
				.attr("class","node")
				.call(drag);
			node.append("image")
				.attr("xlink:href","/img/juniper-networks-icon.png")
				.attr("x",-8)
				.attr("y",-8)
				.attr("width",20)
				.attr("height",20)}
		else{
        node=svg.selectAll("path")
		          .data(force.nodes())
		          .enter()
		          .append("path")
		          .attr("fill",function(d){
		        	  if(!d.selected)
		        		  return "#CCE6FF";
		        	  else
		        		  return "#96CEF6";})
		          .attr("transform",function(d){
		        	 return "translate("+d.x+","+d.y+")";
		          })
		          /*.attr("stroke",function(d){if(d.selected)
		        	  							return "#3182bd";})		//comment 253 to 255 lines to remove border of the circle
		          .attr("stroke-width",function(d){var ret=d.selected?1.5:0;
		        	                   return ret;})*/
		          .attr("d",d3.svg.symbol()
		        	        .size(function(d){return d.size;})
		        	        .type(function(d){return d.shape;}))
		          .on("mouseover", mouseover_node)
		          .on("mouseout", mouseout)
		          .on("click",click)
		          .call(drag);}
		link_label=svg.selectAll("line.label")
		  .data(force_label.links());
		node_label=svg.selectAll("g")
		           .data(force_label.nodes())
		           .enter()
		           .append("g");
		node_label.append("circle").attr('r',0);
		node_label.append("text").text(function(d,i){
			return i%2==0?"":d.node.name;
		}).style("fill", "#555").style("font-family", "Arial").style("font-size", '12px');
	}
	this.addNode_d3=function(configData){
		var node={};
		node.id=configData.id;
		node.name=configData.name;
		node.shape=configData.shape;
		node.size=configData.size;
		node.selected=configData.selected;
		node.display_name=configData.display_name;
		node.vm_count=configData.vm_count;
		node.fip_count=configData.fip_count;
		node.in_bytes=configData.in_bytes;
		node.out_bytes=configData.out_bytes;
		node.out_tpkts=configData.out_tpkts;
		node.in_tpkts=configData.in_tpkts;
		nodes_d3.push(node);
		nodes_labels.push({node:node});
		nodes_labels.push({node:node});
	}
    this.addLink_d3=function(configData){
    	var link={};
    	for(var i=0;i<nodes_d3.length;i++){
    		if(configData.src==nodes_d3[i].id)
    			link.source=nodes_d3[i];
    		else if(configData.dst==nodes_d3[i].id)
    			link.target=nodes_d3[i];}
    	link.more_attributes=configData.more_attributes;
    	link.width=configData.width;
    	link.toolTip=configData.toolTip;
    	link.title_tt=configData.title_tt;
    	link.line_color=configData.line_color;
    	link.packets=configData.packets;
    	link.bytes=configData.bytes;
    	link.error=configData.error;
    	link.loss=configData.loss;
    	link.org_dest=configData.org_dest;
    	link.org_src=configData.org_src;
    	link.partialConnected=configData.partialConnected;
    	link.dir=configData.dir;
    	links_d3.push(link);
	}
    var updateNode = function(d) {
    	this.attr("transform", function(d) {
    		d.x=Math.max(20, Math.min(width - 20, d.x));
    		d.y=Math.max(20, Math.min(height - 20, d.y));
			return "translate("+d.x+"," +d.y+ ")";
		});
	}
	var updateLink = function() {
			this.attr("x1", function(d) {
				return d.source.x;
			}).attr("y1", function(d) {
				return d.source.y;
			}).attr("x2", function(d) {
				return d.target.x;
			}).attr("y2", function(d) {
				return d.target.y;
			});
		}
	var tick=function(id){
	      force_label.start();
	      if(!loaded_d3){
	      if(force.alpha()<0.06){
	    	  loaded_d3=true;
	    	 $("#"+id).show();}
	      else
	    	 $("#"+id).hide();}
	      if(force.alpha()<=0.001){
	    	  force.stop();
	      }
	   	  node.call(updateNode);
	   	  node_label.each(function(d, i) {
			if(i % 2 == 0) {
				d.x = d.node.x;
				d.y = d.node.y;
			} else {
                if(this.childNodes[1] != null) {
                    var b = this.childNodes[1].getBoundingClientRect();
                    var diffX = d.x-d.node.x;
                    var diffY = d.y-d.node.y;
                    var dist = Math.sqrt(diffX * diffX + diffY * diffY);
                    var shiftX = b.width * (diffX - dist) / (dist * 2);
                    shiftX = Math.max(-b.width, Math.min(0, shiftX));
                    var shiftY =10;
                    this.childNodes[1].setAttribute("transform", "translate(" + shiftX + "," + shiftY + ")");
                }
			}
	      });
	   	  node_label.call(updateNode);
	   	  link.call(updateLink);
	   	  link_transperant.call(updateLink);
	   	  link_label.call(updateLink);
	    }
	function dragstart(d){
		d.fixed=true;
		$('.qtip').remove();
	}
 }
function mouseover_node() {
	//if(d3.select(this)[0][0].__data__.shape=='circle')//To avoid the curosr change on service instance as because not clickable
      d3.select(this).style("cursor","pointer");
    var obj={};
	obj['x_pos']=mousePosition.x;
	obj['y_pos']=mousePosition.y;
	obj['name']=d3.select(this)[0][0].__data__.id;
	if(d3.select(this)[0][0].__data__.shape=='circle')
	obj['type']='Network';
	else if (d3.select(this)[0][0].__data__.shape=='square')
	obj['type']='Service Instance';
	obj['vm_count']=d3.select(this)[0][0].__data__.vm_count;
	obj['fip_count']=d3.select(this)[0][0].__data__.fip_count;
	obj['display_name']=d3.select(this)[0][0].__data__.display_name;
	obj['in_bytes']=d3.select(this)[0][0].__data__.in_bytes;
	obj['out_bytes']=d3.select(this)[0][0].__data__.out_bytes;
	obj['out_tpkts']=d3.select(this)[0][0].__data__.out_tpkts;
	obj['in_tpkts']=d3.select(this)[0][0].__data__.in_tpkts;
	toolTipPlugin(obj);
	}
function mouseover_link() {
	//if(d3.select(this)[0][0].__data__.source.shape=='circle' && d3.select(this)[0][0].__data__.target.shape=='circle'){
	d3.select(this).style("cursor","pointer");
	var obj={};
	var data=[],partial_msg="";
	obj['packets']=d3.select(this)[0][0].__data__.packets;
	obj['bytes']=d3.select(this)[0][0].__data__.bytes;
	obj['x_pos']=mousePosition.x;
	obj['y_pos']=mousePosition.y;
	if(d3.select(this)[0][0].__data__.error=='Other link marked as unidirectional, attach policy'
		|| d3.select(this)[0][0].__data__.error=="Other link marked as bidirectional, attach policy")
		partial_msg="Link partially connected";
	if(d3.select(this)[0][0].__data__.more_attributes!=undefined && d3.select(this)[0][0].__data__.more_attributes.in_stats!=undefined
			&& d3.select(this)[0][0].__data__.more_attributes.out_stats!=undefined && d3.select(this)[0][0].__data__.more_attributes.out_stats.length>0
			&& d3.select(this)[0][0].__data__.more_attributes.in_stats.length>0){
	var in_stats=d3.select(this)[0][0].__data__.more_attributes.in_stats;
	var out_stats=d3.select(this)[0][0].__data__.more_attributes.out_stats;
	var src=d3.select(this)[0][0].__data__.org_src;
	var dst=d3.select(this)[0][0].__data__.org_dest;
	var loss=d3.select(this)[0][0].__data__.loss;
	if(loss.diff && loss.loss_percent>0)
	    data.push({lbl:"Link",value:"Packet Loss % "+loss.loss_percent});
	else
	    data.push({lbl:"Link",value:"Traffic Details"});
	if(partial_msg!="")
		data.push({lbl:"",value:partial_msg})
	for(var i=0;i<in_stats.length;i++){
		if(src==in_stats[i].src && dst==in_stats[i].dst){
	       data.push({lbl:"Link",value:in_stats[i].src.split(':').pop()+" --- "+in_stats[i].dst.split(':').pop()});
	       data.push({lbl:"In",value:in_stats[i].pkts+" pkts/"+formatBytes(in_stats[i].bytes)});
	       //data.push({lbl:"",value:formatBytes(in_stats[i].bytes)});
	          for(var j=0;j<out_stats.length;j++){
	        	  if(src==out_stats[j].src && dst==out_stats[j].dst){
	        		  data.push({lbl:"Out",value:out_stats[j].pkts+" pkts/"+formatBytes(out_stats[i].bytes)});
	        		  //data.push({lbl:"",value:formatBytes(out_stats[i].bytes)});
	        	  }
	          }
		}else if(src==in_stats[i].dst && dst==in_stats[i].src){
			data.push({lbl:"Link",value:in_stats[i].src.split(':').pop()+" --- "+in_stats[i].dst.split(':').pop()});
		    data.push({lbl:"In",value:in_stats[i].pkts+" pkts/"+formatBytes(in_stats[i].bytes)});
		    //data.push({lbl:"",value:formatBytes(in_stats[i].bytes)});
		          for(var j=0;j<out_stats.length;j++){
		        	  if(src==out_stats[j].dst && dst==out_stats[j].src){
		        		  data.push({lbl:"Out",value:out_stats[j].pkts+" pkts/"+formatBytes(out_stats[i].bytes)});
		        		  //data.push({lbl:"",value:formatBytes(out_stats[i].bytes)});
		          	  }
		          }
		}
	  }
	}else if(d3.select(this)[0][0].__data__.more_attributes==undefined ||d3.select(this)[0][0].__data__.more_attributes.in_stats==undefined 
			|| d3.select(this)[0][0].__data__.more_attributes.out_stats==undefined ){
		var src=d3.select(this)[0][0].__data__.org_src.split(':').pop();
		var dst=d3.select(this)[0][0].__data__.org_dest.split(':').pop();
		data.push({lbl:"Link",value:"Traffic Details"});
		if(partial_msg!="")
		data.push({lbl:"",value:partial_msg})
		if(d3.select(this)[0][0].__data__.dir=='bi'){
		data.push({lbl:"Link",value:src+" --- "+dst});
		data.push({lbl:"In",value:"0 pkts/0 B"});
		//data.push({lbl:"",value:"0 B"});
		data.push({lbl:"Out",value:"0 pkts/0 B"});
		//data.push({lbl:"",value:"0 B"});
		data.push({lbl:"Link",value:dst+" --- "+src});
		data.push({lbl:"In",value:"0 pkts/0 B"});
		//data.push({lbl:"",value:"0 B"});
		data.push({lbl:"Out",value:"0 pkts/0 B"});}
		else if(d3.select(this)[0][0].__data__.dir=='uni'){
			data.push({lbl:"Link",value:src+" --- "+dst});
			data.push({lbl:"In",value:"0 pkts/0 B"});
			//data.push({lbl:"",value:"0 B"});
			data.push({lbl:"Out",value:"0 pkts/0 B"});
		}
		//data.push({lbl:"",value:"0 B"});
	}else if(d3.select(this)[0][0].__data__.more_attributes!=undefined && d3.select(this)[0][0].__data__.more_attributes.in_stats!=undefined 
			&& d3.select(this)[0][0].__data__.more_attributes.out_stats!=undefined && d3.select(this)[0][0].__data__.more_attributes.in_stats.length==0
			&& d3.select(this)[0][0].__data__.more_attributes.out_stats.length==0){
		var src=d3.select(this)[0][0].__data__.org_src.split(':').pop();
		var dst=d3.select(this)[0][0].__data__.org_dest.split(':').pop();
		data.push({lbl:"Link",value:"Traffic Details"});
		if(partial_msg!="")
			data.push({lbl:"",value:partial_msg})
		if(d3.select(this)[0][0].__data__.dir=='bi'){
		data.push({lbl:"Link",value:src+" --- "+dst});
		data.push({lbl:"In",value:"0 pkts/0 B"});
		//data.push({lbl:"",value:"0 B"});
		data.push({lbl:"Out",value:"0 pkts/0 B"});
		//data.push({lbl:"",value:"0 B"});
		data.push({lbl:"Link",value:dst+" --- "+src});
		data.push({lbl:"In",value:"0 pkts/0 B"});
		//data.push({lbl:"",value:"0 B"});
		data.push({lbl:"Out",value:"0 pkts/0 B"});}
		//data.push({lbl:"",value:"0 B"});
        else if(d3.select(this)[0][0].__data__.dir=='uni'){
        	data.push({lbl:"Link",value:src+" --- "+dst});
    		data.push({lbl:"In",value:"0 pkts/0 B"});
    		//data.push({lbl:"",value:"0 B"});
    		data.push({lbl:"Out",value:"0 pkts/0 B"});
		}
	}
	obj['data']=data;
	if(d3.select(this)[0][0].__data__.title_tt!="" && d3.select(this)[0][0].__data__.title_tt!=undefined){
		obj['type']='error';
	    obj['error']=d3.select(this)[0][0].__data__.error;}
	else
		obj['type']='link';
		toolTipPlugin(obj);//}
}
 function mouseout() {
	      $('.qtip').remove();
	      $("#toolTip").html('');
	}
 function click(){
	 if(d3.select(this)[0][0].__data__.shape=='circle')
		 layoutHandler.setURLHashParams({fqName:d3.select(this)[0][0].__data__.id},{p:'mon_net_networks'});
	}
 function click_link(){
	 //if(d3.select(this)[0][0].__data__.source.shape=='circle' && d3.select(this)[0][0].__data__.target.shape=='circle')
	 layoutHandler.setURLHashParams({fqName:d3.select(this)[0][0].__data__.org_dest,srcVN:d3.select(this)[0][0].__data__.org_src},{p:'mon_net_networks'});
 }
 function toolTipPlugin(obj){
 var data=[];
 if(obj['type']=='link'){
	 $("#toolTip").html(kendo.template($('#title-lblval-tooltip-template_new').html())(obj['data']));	
	 //data.push({lbl:'Packets',value:obj['packets']});
		//data.push({lbl:'Bytes',value:obj['bytes']});
 }else if(obj['type']=='error'){
	 data.push({lbl:'Error',value:obj['error']});
	 data.push({lbl:'Packets',value:obj['packets']});
	 data.push({lbl:'Bytes',value:obj['bytes']});}
 else if(obj['type']=='Network'){
	 data.push({lbl:'',value:obj['display_name']});
	 data.push({lbl:'In',value:obj['in_tpkts']+" pkts/"+obj['in_bytes']});
	 //data.push({lbl:'',value:obj['in_bytes']});
	 data.push({lbl:'Out',value:obj['out_tpkts']+" pkts/"+obj['out_bytes']});
	 //data.push({lbl:'',value:obj['out_bytes']});
	 data.push({lbl:'Instances',value:obj['vm_count']});
	 if(obj['fip_count']!=0)
	 data.push({lbl:'Floating IP\'s',value:obj['fip_count']});
	 $("#toolTip").html(kendo.template($('#title-lblval-tooltip-template_new').html())(data));}
 else if(obj['type']=='Service Instance'){
	 data.push({lbl:'',value:obj['display_name']});
	 data.push({lbl:'Instances',value:obj['vm_count']});
	 $("#toolTip").html(kendo.template($('#title-lblval-tooltip-template_new').html())(data));
 }
 //$("#toolTip").html(kendo.template($('#lblval-tooltip-template').html())(data));
 $("#toolTip").css({position:'absolute'});
 $("#toolTip").offset({left:obj['x_pos'],top:obj['y_pos']});
}
 /*function toolTipPlugin(displayText,x_pos,y_pos,type){
	$('.qtip').remove();
	$("#toolTip").show();
	$("#toolTip").qtip({
		content:{
			text:displayText,
			title:{
				text:type
			}
		},
		show: {
                delay: 0,
                event: false,
                ready: true,
                effect: false,
                solo:true
            },
        position:{
            target:[x_pos,y_pos]},
        style:{
        	classes:'qtip-white',
        	tip:false}
	});
}*/



