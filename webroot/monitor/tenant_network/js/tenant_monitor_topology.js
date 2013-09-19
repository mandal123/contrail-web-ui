var topologyView = new topologyRenderer();
/**
 * Connectivity Details for Project/Network
 */
function topologyRenderer() {
    var self = this;
    this.drawTopology  = function(fqName) {
        var url,type,name,cyto_layout='grid';
        //var framework="cytoscape",cyto_layout='grid';//[cytoscape,d3],//[breadthfirst,grid]
        var framework="d3";//[cytoscape,d3]
        url='/api/tenant/monitoring/network-topology?fqName='+fqName;
        if(fqName.split(':').length==2){
            type='project';
            name=fqName.split(':').pop();
        }if(fqName.split(':').length==3){
            type='network';
        }
        var divId=fqName.replace(/:/g,'_');
        divId=divId.replace(/-/g,'_');
        $.getJSON(url,function(response){
            if(response!=null){
                var result=filterResponse(response.nodes,response.links);
                response.nodes=result.nodes;
                response.links=result.links;
                response.framework=framework;
                response.cyto_layout=cyto_layout;
                response.fqName=fqName;
                response.divId=divId;
                /*Hide the connectivity details if there are no links
                    if(type=='network' && response.links.length==0){
                    $("#networkSummaryTab").hide();
                    return;}
                $("#networkSummaryTab").show();*/
                if($("#topology").find('#'+divId).length==0)
                    $("#topology").append("<div id=\""+divId+"\"></div>");
                $("#"+divId).data('topology',response);
                $("#"+divId).data('fqName',fqName);
                self.renderTopology(response);
            }else{
                $("#topology").addClass('text-center');
                $("#topology").html("An unexpected error occured.<br/>Please try reloading the page");
            }
        })
    }

    this.renderTopology =  function(response){
        var divId=response.divId;
        var fqName=response.fqName,domain,project;
        domain=fqName.split(':')[0];
        project=fqName.split(':')[1];
        if(response.nodes==undefined || response.nodes.length==0){
            $("#topology").addClass('topo_center');
            $("#topology").html("No Networks found !!!!!");
            return;
        }
        if(response.framework=='d3'){
            var network_topology=new topology();
            //var width=600;
            var height_div=650;
            var nodes=response.nodes;
            var bw_rng={};
            var data={};
            var size=350;
            var height_div;
            var links=response.links;
            if(nodes.length>0 && nodes.length<5){
                size=500;height_div=160;}
            else if(nodes.length>=5 && nodes.length<10){
                size=450;height_div=230;}
            else if(nodes.length>=10 && nodes.length<20){
                size=400;height_div=330;}
            else if(nodes.length>=20 && nodes.length<30){
                height_div=400}
            else if(nodes.length>=30 && nodes.length<40){
                height_div=470;}
            else if(nodes.length>=40 && nodes.length<50){
                height_div=580;}
                for(var i=0;i<nodes.length;i++){
                    var configData={};
                    var dmn=nodes[i].name.split(':')[0],prj=nodes[i].name.split(':')[1];
                    configData.id=nodes[i].name;
                    configData.name=nodes[i].name.split(':').pop();
                    configData.type=nodes[i].node_type;
                    configData.selected=false;
                    configData.shape='circle';
                    configData.vm_count=0;
                    configData.fip_count=0;
                    configData.in_bytes=0;
                    configData.in_tpkts=0;
                    configData.out_tpkts=0;
                    configData.out_bytes=0;
                    if(nodes[i].node_type=='virtual-network' && nodes[i].more_attr!=undefined){
                        configData.vm_count=nodes[i].more_attr.vm_cnt;
                        configData.fip_count=nodes[i].more_attr.fip_cnt;
                        configData.in_bytes=formatBytes(nodes[i].more_attr.in_bytes);
                        configData.out_bytes=formatBytes(nodes[i].more_attr.out_bytes);
                        configData.out_tpkts=nodes[i].more_attr.out_tpkts;
                        configData.in_tpkts=nodes[i].more_attr.in_tpkts;}
                    if(nodes[i].node_type=='service-instance'){
                        var siData=ifNull(jsonPath(response,'$..service-instances')[0],[]);
                        for(var j=0;j<siData.length;j++){
                            if(siData[j]['service-instance']['fq_name'].join(':')==nodes[i]['name'])
                                configData.vm_count=ifNull(siData[j]['service-instance']['virtual_machine_back_refs'].length,0);
                        }
                        //var ser_insts=configData.
                        configData.shape='square';}
                    if( nodes[i].name==fqName)
                        configData.selected=true;
                    configData.size=size;
                    if(domain==dmn && project==prj)
                        configData.display_name=nodes[i].name.split(':')[2];
                    else if(domain==dmn && project!=prj)
                        configData.display_name=nodes[i].name.split(':')[1]+":"+nodes[i].name.split(':')[2];
                    else if(domain!=dmn && project!=prj)
                        configData.display_name=nodes[i].name.split(':')[0]+":"+nodes[i].name.split(':')[1]+":"+nodes[i].name.split(':')[2];
                    network_topology.addNode_d3(configData);
                }
                for(var j=0;j<links.length;j++){
                    bw_rng=getBandwidthRange(response);
                    if(links[j].service_inst!=undefined){   //Creating links for connecting service instances
                        var sv_links=[];
                        var sv_inst=links[j].service_inst;
                        var firstLink={},secondLink={};
                        firstLink.src=links[j].src;
                        firstLink.dst=sv_inst[0];
                        firstLink.dir=links[j].dir;
                        firstLink.org_dest=links[j].dst;
                        firstLink.org_src=links[j].src;
                        firstLink.more_attributes=links[j].more_attributes;
                        var result=constructLinkData(links[j],links.length,bw_rng);
                        firstLink.loss=result.loss;			    	
                        firstLink.packets=result.packets;
                        firstLink.bytes=result.bytes;
                        firstLink.toolTip=result.toolTip;
                        firstLink.line_color=result.line_color;
                        firstLink.width=result.width;
                        if(result.error!=undefined){
                            firstLink.error=result.error;
                            firstLink.partialConnected=true;}
                        if(result.toolTip_title!=undefined)
                            firstLink.toolTip_title=result.toolTip_title;
                        network_topology.addLink_d3(firstLink);
                        if(sv_inst.length==1){
                            secondLink.src=sv_inst[0];
                            secondLink.dst=links[j].dst;
                            secondLink.dir=links[j].dir;
                            secondLink.org_dest=links[j].dst;
                            secondLink.org_src=links[j].src;
                            secondLink.more_attributes=links[j].more_attributes;
                            secondLink.loss=result.loss;				   
                            secondLink.packets=result.packets;
                            secondLink.bytes=result.bytes;
                            secondLink.toolTip=result.toolTip;
                            secondLink.line_color=result.line_color;
                            secondLink.width=result.width;
                            if(result.error!=undefined){
                                secondLink.error=result.error;
                                secondLink.partialConnected=true;}
                            if(result.toolTip_title!=undefined)
                                secondLink.toolTip_title=result.toolTip_title;
                            network_topology.addLink_d3(secondLink);
                        }else {
                        for(var i=0;i<sv_inst.length;i++){      
                            var link={};
                            link.src=sv_inst[i];
                            if(sv_inst[i+1]==undefined)
                                link.dst=links[j].dst;
                            else
                                link.dst=sv_inst[i+1];
                            link.dir=links[j].dir;
                            link.more_attributes=links[j].more_attributes;
                            var result=constructLinkData(links[j],links.length,bw_rng);
                            link.loss=result.loss;
                            link.packets=result.packets;
                            link.org_dest=links[j].dst;
                            link.org_src=links[j].src;
                            link.bytes=result.bytes;
                            link.toolTip=result.toolTip;
                            link.line_color=result.line_color;
                            link.width=result.width;
                            if(result.error!=undefined){
                                link.error=result.error;
                                configData.partialConnected=true;}
                            if(result.toolTip_title!=undefined)
                                link.toolTip_title=result.toolTip_title;
                            network_topology.addLink_d3(link);}
                        }
                    }else{
                        var configData={};
                        configData.src=links[j].src;
                        configData.dst=links[j].dst;
                        configData.dir=links[j].dir;
                        configData.org_dest=links[j].dst;
                        configData.org_src=links[j].src;
                        configData.more_attributes=links[j].more_attributes;
                        var result=constructLinkData(links[j],links.length,bw_rng);
                        configData.loss=result.loss;
                        configData.packets=result.packets;
                        configData.bytes=result.bytes;
                        configData.toolTip=result.toolTip;
                        configData.line_color=result.line_color;
                        configData.width=result.width;
                        if(result.error!=undefined){
                           configData.error=result.error;
                           configData.partialConnected=true;}
                        if(result.toolTip_title!=undefined)
                           configData.toolTip_title=result.toolTip_title;
                    network_topology.addLink_d3(configData);}
                }	
                $("#"+divId).data('topology',response);
                $("#"+divId).data('fqName',fqName);
                $("#topology").css('width','100%');
                $("#topology").css('height',height_div);
                $("#"+divId).css('width','100%');
                $("#"+divId).css('height',height_div);
                network_topology.loadD3(divId);
        }
        else if(response.framework=="cytoscape" && response.cyto_layout=="breadthfirst"){
            var layout='breadthfirst';
            var width=600;
            var weight=30;
            var height=75;
            var height_div=300;
            var dstNodes=new Array();
            //If number of nodes is <2 we are using the grid layout because of issues with breadthfirst
            if(response.nodes.length<=2){
                layout='grid';height_div=90;width=400;weight=40;height=135
            }else if(response.nodes.length>2 && response.nodes.length<5){
                height_div=200;width:600;
            }else if(response.nodes.length>=5 && response.nodes.length<=10){
                width=700;
            }else if(response.nodes.length>10 && response.nodes.length<=20){
                width=800;
            }else if(response.nodes.length>20 && response.nodes.length<=30){
                width=900;
            }else if(response.nodes.length>30){
                width=1100;
            }
            //If there are no links breadth first layout is occupying more space so switching to grid layout
            if(response.links.length==0){
                layout='grid';weight=40;height=135;}
            response.weight=weight;
            response.height=height;
            response.divId=divId;
            response.layout=layout;
            if(response.links!=undefined && response.links.length>0){
                for(var i=0;i<response.links.length;i++){
                    dstNodes.push(response.links[i].dst);
                }	
            }
            $("#topology").css('width',width);
            $("#topology").css('height',height_div);
            $("#"+divId).addClass('topology_'+layout);
            response.dstNodes=dstNodes;
            renderTopology_cytoscape(response);
        }
        else if(response.framework=="cytoscape" && response.cyto_layout=="grid"){
            var layout='grid';
            var width=600;
            var weight=50;
            var height=135;
            var height_div=300;
            var left=300;
            var dstNodes=new Array();
            if(response.nodes.length>0 && response.nodes.length<5){
                height_div=90;
                width=400;
            }else if(response.nodes.length>=5 && response.nodes.length<=15){
                height_div=200;	
            }else if(response.nodes.length>15 && response.nodes.length<=40){
                width=700;left=200;
                //node prop
                weight=40;height=115;
            }else if(response.nodes.length>40 && response.nodes.length<=60){
                width=800;left=150;
                //node prop
                weight=35;height=100;
            }else if(response.nodes.length>60){
                weight=30;height=85;
            }
            response.weight=weight;
            response.height=height;
            response.divId=divId;
            $("#topology").css('width',width);
            $("#topology").css('height',height_div);
            $("#"+divId).addClass('topology_'+layout);
            renderTopology_cytoscape(response);
        }
    }

    function renderTopology_cytoscape(response){
        if(response.nodes.length>0){
            var network_topology=new topology();
            var weight=response.weight;
            var height=response.height;
            var nodes=response.nodes;
            var edges=response.links;
            var dstNodes=response.dstNodes;
            var bw_rng={};
            var data={};
            for(i=0;i<nodes.length;i++){
                if(nodes[i].name!=undefined ){
                var configData={};
                var active=true;
                configData.id=nodes[i].name;
                configData.type=nodes[i].node_type;
                configData.name=nodes[i].name.split(':').pop();
                configData.dst=false;
                if(response.layout!='grid' && dstNodes!=undefined && dstNodes.indexOf(configData.id)!=-1)//In grid no need to handle the label alignment
                    configData.dst=true;
                if(nodes[i].node_type=='virtual-network')
                    configData.shape='circle';
                if(nodes[i].node_type=='service-instance')
                    configData.shape='rectangle';
                configData.toolTip=nodes[i].name;
                configData.weight=weight;
                configData.height=height;
                if(nodes[i].status=='Deleted')
                    active=false;
                configData.active=active;
                network_topology.addNode(configData);}
            }
            for(i=0;i<edges.length;i++){
                bw_rng=getBandwidthRange(response);
                if(edges[i].src!=undefined && edges[i].dst!=undefined && edges[i].more_attributes!=undefined){
                var configData={};
                configData.id=edges[i].src+"_"+edges[i].dst;
                configData.src=edges[i].src;
                configData.dest=edges[i].dst;
                configData.source_arrow_color='#3182bd';
                configData.target_arrow_color='#3182bd';
                configData.line_color='#3182bd';//3182bd
                configData.name=edges[i].src+"_"+edges[i].dst;
                configData.strength=65;
                configData.width=1;
                if(edges[i].dir=='uni'){
                    configData.target_arrow_shape='triangle';
                    //configData.blink=true;
                    configData.target_arrow_color='#E4564F';
                    configData.line_color='#E4564F';
                }if(edges[i].dir=='bi'){
                    configData.target_arrow_shape='triangle';
                    configData.source_arrow_shape='triangle';
                }}
                if(edges[i].more_attributes!=undefined && edges[i].more_attributes.in_stats!=undefined && edges[i].more_attributes.out_stats!=undefined
                        && edges[i].more_attributes.in_stats.length>0 && edges[i].more_attributes.out_stats.length>0 ){
                    data.src=edges[i].src;
                    data.dst=edges[i].dst;
                    data.more_attributes=edges[i].more_attributes;
                    data.dir=edges[i].dir;
                    var result=getLinkInfo(data);
                    var toolTip;
                    var toolTip_title="";
                    if(edges[i].error!=undefined)
                        toolTip_title="Error:"+edges[i].error;
                    if(!result.status)
                        toolTip_title="Error:Mismatch between in-stats and out-stats, difference is ";
                    toolTip="Packets:"+result.pkts+" Bytes:"+formatBytes(result.bytes);
                    configData.toolTip=toolTip;
                    configData.title_tt=toolTip_title;
                    if(!result.status || edges[i].error!=undefined){
                        //configData.blink=true;
                        if(edges[i].dir=='bi')
                            configData.target_arrow_color='#E4564F';
                        configData.line_color='#E4564F';
                        configData.source_arrow_color='#E4564F';
                    }
                    if(edges.length>1)
                        configData.width=getLinkWidth(bw_rng.bytes[bw_rng.bytes.length-1],bw_rng.bytes[0],result.bytes);
                    
                }else{
                    var toolTip;
                    var toolTip_title="";
                    if(edges[i].error!=undefined){
                        toolTip_title="Error:"+edges[i].error;
                        configData.blink=true;
                        if(edges[i].dir=='bi')
                           configData.target_arrow_color='#E4564F';
                        configData.line_color='#E4564F';
                        configData.source_arrow_color='#E4564F';}
                    toolTip="Packets:0 Bytes:0";
                    configData.width=1.25;
                    configData.toolTip=toolTip;
                    configData.title_tt=toolTip_title
                }network_topology.addEdge(configData);
            }
            network_topology.loadGraph(response.divId,response.layout);
            }
    }

    function filterResponse(nodes,links){
        var result={};
        var nodes_act=[];
        var links_act=[];
        var ipFabricName =  'default-domain:default-project:ip-fabric';
        if(nodes!=undefined && links!=undefined){
        for(var i=0;i<nodes.length;i++){
            if(nodes[i].status=='Active' && (nodes[i]['name'] != ipFabricName))
                nodes_act.push(nodes[i]);
        }
        for(var i=0;i<links.length;i++){
            var src_act=false;
            var dst_act=false;
            var svc_exists=false;
            var svc_act=true;
            //Filter link if any of src/destination of the link is ip-fabric
            if(links[i]['src'] == ipFabricName || links[i]['dst'] == ipFabricName)
                continue;
            for(var j=0;j<nodes.length;j++){
                if(links[i].src==nodes[j].name && nodes[j].status=='Active')
                    src_act=true;
                else if(links[i].dst==nodes[j].name && nodes[j].status=='Active')
                    dst_act=true;
                else if(links[i]['service_inst']!=undefined && links[i]['service_inst'].length>0){
                    svc_exists=true;
                    for(var k=0;k<links[i]['service_inst'].length;k++){
                        if(links[i]['service_inst'][k]==nodes[j].name && nodes[j].status=='Deleted')
                            svc_act=false;
                    }
                }
            }
            if(svc_exists){
                if(src_act && dst_act && svc_act)
                   links_act.push(links[i]);}
            else if(src_act && dst_act)
                links_act.push(links[i]);
        }
       }
        result.nodes=nodes_act;
        result.links=links_act;
        return result;
    }

    function checkPacketLoss(data){
        var in_stats=data['more_attributes']['in_stats'];
        var out_stats=data['more_attributes']['out_stats'],loss_percent=0,in_pkt_diff=0,out_pkt_diff=0;
        var in_byte_diff=0,out_byte_diff=0,in_pkts=0,in_bytes=0,out_pkts=0,out_bytes=0,result={},diff=false;
        //To handle back end bug (getting one set of data in case bidirecitonal)  
        if(in_stats.length==1 && out_stats.length==1 && data.dir=='bi'){
               if(data.src==in_stats[0].src){
                   var obj={};
                   obj['src']=data.dst,obj['dst']=data.src,obj['pkts']=0,obj['bytes']=0;
                   in_stats[1]=obj,out_stats[1]=obj;
               }else if(data.dst==in_stats[0].src){
                   var obj={};
                   obj['src']=data.src,obj['dst']=data.dst,obj['pkts']=0,obj['bytes']=0;
                   in_stats[1]=obj,out_stats[1]=obj;
               } 
               //result.diff=true;
               //result.loss_percent=100;
               //return result;
           }
           for(var i=0;i<in_stats.length;i++){
                if(data.src==in_stats[i].src){
                    for(var j=0;j<out_stats.length;j++){
                        if(data.src==out_stats[j].dst && out_stats[j].pkts!=in_stats[i].pkts){
                            diff=true;
                            in_pkts=Math.max(out_stats[j].pkts,in_stats[i].pkts);
                            in_bytes=Math.max(out_stats[j].bytes,in_stats[i].bytes);
                            in_pkt_diff=Math.abs(in_stats[i].pkts-out_stats[j].pkts);
                            in_byte_diff=Math.abs(in_stats[i].bytes-out_stats[j].bytes);}
                    }
                }else if(data.dst==in_stats[i].src){
                    for(var k=0;k<out_stats.length;k++){
                        if(data.dst==out_stats[k].dst && out_stats[k].pkts!=in_stats[i].pkts){
                            diff=true;
                            out_pkts=Math.max(out_stats[k].pkts,in_stats[i].pkts);
                            out_bytes=Math.max(out_stats[k].bytes,in_stats[i].bytes);
                            out_pkt_diff=Math.abs(in_stats[i].pkts-out_stats[k].pkts);
                            out_byte_diff=Math.abs(in_stats[i].bytes-out_stats[k].bytes);}
                    }
                }
            }
        if(diff)
        loss_percent=((in_byte_diff+out_byte_diff))*(100/(in_bytes+out_bytes));
        result.diff=diff;
        result.loss_percent=loss_percent.toFixed(2);
        return result;
    }

    function constructLinkData(link,links_count,bw_rng) {
        var configData={};
        configData.line_color="#3182bd";
        configData.partialConnected=false;
        if(link.more_attributes!=undefined && link.more_attributes.in_stats!=undefined && link.more_attributes.out_stats!=undefined
                && link.more_attributes.in_stats.length>0 && link.more_attributes.out_stats.length>0 ){
        var loss=checkPacketLoss(link);
        var result=getLinkInfo(link);
        var toolTip;
        var toolTip_title="";
        if(link.error!=undefined){
            toolTip_title="Error:"+link.error;
            configData.partialConnected=true;
            configData.error=link.error;}
        if(!result.status){
            toolTip_title="Error:Mismatch between in-stats and out-stats and difference is ";
        configData.error="Mismatch between in-stats and out-stats and difference is ";}
        toolTip="Packets:"+result.pkts+" Bytes:"+formatBytes(result.bytes);
        configData.width=1.25;//default width value
        configData.packets=result.pkts;
        configData.bytes=formatBytes(result.bytes);
        configData.toolTip=toolTip;
        configData.title_tt=toolTip_title;
        configData.more_attributes=link.more_attributes;
        configData.dir=link.dir;
        configData.loss=loss;
        if( link.error!=undefined || loss.loss_percent>10 ){
            configData.line_color='#E4564F';}
        if(links_count>1 && (loss.loss_percent<10 || !loss.diff) && !configData.partialConnected)
            configData.width=getLinkWidth(bw_rng.bytes[0],bw_rng.bytes[bw_rng.bytes.length-1],result.bytes_new);
       }else{
        var toolTip;
        var toolTip_title="";
        if(link.error!=undefined){
            toolTip_title="Error:"+link.error;
            configData.partialConnected=true;
            configData.error=link.error;
            configData.line_color='#E4564F';}
        toolTip="Packets:0 Bytes:0";
        configData.width=1.25;
        configData.packets=0;
        configData.bytes=0;
        configData.toolTip=toolTip;
        configData.title_tt=toolTip_title;}
        return configData;
    }

    function getLinkInfo(data){
        if(data.more_attributes!=undefined && data.more_attributes.in_stats!=undefined && data.more_attributes.out_stats!=undefined){
        var in_stats=data.more_attributes.in_stats;
        var out_stats=data.more_attributes.out_stats;
        var result={};
        var pkts=0,bytes=0,status,msg,pkts_arr=[],bytes_arr=[];
        for(var i=0;i<in_stats.length;i++){
            if(in_stats[i].src==data.src)
                for(var j=0;j<out_stats.length;j++){
                    var cdn;
                    if(data.dir=='bi'){
                        cdn="out_stats[j].dst==data.src";
                    }else if(data.dir=='uni'){
                        cdn="out_stats[j].src==data.src";
                    }
                    if(cdn){
                        if((out_stats[j].pkts==in_stats[i].pkts && out_stats[j].bytes==in_stats[i].bytes) || getPacketLossPercentage(data))
                            status=true;
                        else
                            status=false;
                    }
                }
        }
        for(var i=0;i<in_stats.length;i++){
            if(in_stats[i].src==data.src)
                for(var j=0;j<out_stats.length;j++){
                    if(status){
                        if(out_stats[j].src==data.src){
                            pkts=out_stats[j].pkts+in_stats[i].pkts;
                            bytes=out_stats[j].bytes+in_stats[i].bytes;
                        }
                    }
                    else{
                        if(data.dir=='bi' && out_stats[j].src==data.src){
                            //msg="<b>Source:</b>"+data.src.split(':').pop()+" <b>Target:</b>"+data.dst.split(':').pop()+"<br>";
                            //msg="<b>In </b> Packets:"+in_stats[i].pkts+" Bytes:"+formatBytes(in_stats[i].bytes)+"<br>";
                            //msg+="<b>Out </b> Packets:"+out_stats[j].pkts+" Bytes:"+formatBytes(out_stats[j].bytes)+"<br>";
                            pkts=Math.abs(out_stats[j].pkts-in_stats[i].pkts);
                            bytes=Math.abs(out_stats[j].bytes-in_stats[i].bytes);
                        }else if(data.dir=='uni' && out_stats[j].src==data.src){
                            pkts=out_stats[j].pkts+in_stats[i].pkts;
                            bytes=out_stats[j].bytes+in_stats[i].bytes;}
                    }
                }
        }
        for(var i=0;i<in_stats.length;i++){
            pkts_arr.push(in_stats[i].pkts);
            bytes_arr.push(in_stats[i].bytes);
        }
        for(var i=0;i<out_stats.length;i++){
            pkts_arr.push(out_stats[i].pkts);
            bytes_arr.push(out_stats[i].bytes);
        }
        pkts_arr.sort(function(a,b){return b-a;});
        bytes_arr.sort(function(a,b){return b-a});
        //console.log(msg);
        result.pkts=pkts;
        result.bytes=bytes;
        result.bytes_new=bytes_arr[0];
        result.pkts_new=pkts_arr[0];
        result.status=status;
        result.msg=msg;
        return result;
        }
    }

    function getPacketLossPercentage(data){
        var in_stats=data.more_attributes.in_stats;
        var out_stats=data.more_attributes.out_stats;
        var pkts_bw=0,bytes_bw=0,pkts_diff=0,bytes_diff=0,status=true;
        for(var i=0;i<in_stats.length;i++){
            if(in_stats[i].src==data.src)
                for(var j=0;j<out_stats.length;j++){
                        if(out_stats[j].src==data.dst){
                            //console.log(out_stats[j].pkts+" and "+in_stats[i].pkts);
                            pkts_bw=out_stats[j].pkts+in_stats[i].pkts;
                            bytes_bw=out_stats[j].bytes+in_stats[i].bytes;
                            pkts_diff=Math.abs(out_stats[j].pkts-in_stats[i].pkts);
                            bytes_diff=Math.abs(out_stats[j].bytes-in_stats[i].bytes);
                        }
                    }
        }
        if((pkts_diff/pkts_bw)*100>10)
            status=false;
        return status;
    }

    function getBandwidthRange(response){
        var result={};
        var pktslst=new Array();
        var byteslst=new Array();
        for(var i=0;i<response.links.length;i++){
            var src=response.links[i].src;
            var dst=response.links[i].dst;
            var pkts=[];
            var bytes=[];
            if(response.links[i].more_attributes!=undefined){
            var in_stats=response.links[i].more_attributes.in_stats;
            var out_stats=response.links[i].more_attributes.out_stats;
            if((in_stats!=undefined && out_stats !=undefined)){
            for(var j=0;j<in_stats.length;j++){
                pkts.push(in_stats[j].pkts);
                bytes.push(in_stats[j].bytes);
            }for(var j=0;j<out_stats.length;j++){
                pkts.push(out_stats[j].pkts);
                bytes.push(out_stats[j].bytes);}
            pkts.sort(function(a,b){return b-a});
            bytes.sort(function(a,b){return b-a});
            pktslst.push(pkts[0]);
            byteslst.push(bytes[0]);
            }
           }		
        }
        pktslst.sort(function(a,b){return b-a});
        byteslst.sort(function(a,b){return b-a});
        result['bytes']=byteslst;
        result['pkts']=pktslst;
        return result;
    }
    function getLinkWidth(bw_max,bw_min,bw){
        //function for scale ((b-a)(x - min)/(max-min))+a;
        var result=1.25;
        if(bw_max==bw){
            result=4.5;
            return result;
        }else if(bw_min==bw || bw_min==undefined || bw_max==undefined){
            result=2.5;
            return result;
        }else if(bw_max!=bw_min){
        var lWidth_min=2.5,lWidth_max=4.5; 
        result=((lWidth_max-lWidth_min)*(bw-bw_min)/(bw_max-bw_min))+lWidth_min;
        if(result<1)
            result=1.25;//Setting min. link width to 1.25, to avoid very thin links
        }
        return result;
    }
}
