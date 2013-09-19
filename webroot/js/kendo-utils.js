/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

//Global Default Config for Kendo Grids
var kendoGlobalGridDefault = {
	/* basic configuration needed for all the grids */
	basic:{
		columnMenu: false,
		reorderable: true,
		resizable: true,
		sortable: true,
		scrollable: true,
        pageable: {
        	pageSize: 50,
            pageSizes: [5,10,50,100,500],
  			info:true,
   			messages: {
   				display: "Displaying {0} - {1} of {2} Records",
   				itemsPerPage: "Records per page",
   				empty: false
    		}
        }	
	},
	extend: function(custom, id){
        var config = {}, searchTextSelectorId,
            searchToolbar = custom.searchToolbar,
            searchPlaceholder = custom.searchPlaceholder != undefined ? custom.searchPlaceholder : "Search",
            widgetGridTitle = custom.widgetGridTitle != undefined  ? custom.widgetGridTitle : "Results",
        	widgetGridActions = custom.widgetGridActions != undefined  ? custom.widgetGridActions : [],
        	collapseable = custom.collapseable != undefined ? custom.collapseable : true,
        	showSearchbox = custom.showSearchbox != undefined ? custom.showSearchbox : false;
        
        if(searchToolbar && id != null) {
        	var gridSearchToolbarTemplate = kendo.template($('#grid-search-toolbar-template').html());
            searchTextSelectorId = id + "-search-text";
            config['toolbar'] = gridSearchToolbarTemplate({
            	searchTextSelectorId: searchTextSelectorId, 
            	searchPlaceholder: searchPlaceholder, 
            	showSearchbox: showSearchbox,
            	widgetGridTitle: widgetGridTitle, 
            	widgetGridActions: widgetGridActions,
            	collapseable: collapseable
            });
            
            setTimeout(function(){
            	initGridSearchFilter(searchTextSelectorId, id, custom.columns);
        	},100);
            
            setTimeout(function(){
            	if(collapseable == false && showSearchbox == true){
	            	$('#'+id).find('.widget-toolbar-search').addClass('no-padding');
	            }
        	},10);
        }
		return $.extend(true, config, this.basic, custom);
	}
};

function showGridMessage(gridSel, message) {
    if (gridSel.dataSource != null)
        gridSel.element.find('tbody').html('<tr class="kendo-data-row"><td colspan=10>' + message + '</td></tr>');
    else
        $(gridSel).find('tbody').html('<tr class="kendo-data-row"><td colspan=10>' + message + '</td></tr>');
};

function showGridLoading(gridId) {
    showGridMessage(gridId, ' <i class="icon-spinner icon-spin blue bigger-125"></i> &nbsp; Loading...');
};

function check4GridEmpty(gridId, message) {
    var gridDataSource = $(gridId).data('kendoGrid').dataSource;
    if (gridDataSource && gridDataSource._view.length == 0) {
        showGridMessage(gridId,message);
    }
};

function initGridSearchFilter(searchTextSelector, gridSelector, fieldsArray) {
    // Search Functionality on Grid
	$("#" + searchTextSelector).on('keyup',function () {
    	var searchValue = $.trim($(this).val()),
            filters = [];
        setTimeout(function(){
        	if(searchValue != null && searchValue != "" && searchValue == $("#" + searchTextSelector).val()) {
	        	var grid = $('#' + gridSelector).data("kendoGrid");
	        	
	        	$.each(fieldsArray, function(key,val){
	        		if(val.searchable != false) {
	                    filters.push({ field:val.field, operator:"contains", value: searchValue});
	                }
	        	});
	            grid.dataSource.filter({logic: "or", filters: filters});
	        	
	        	var gridLength = new kendo.data.Query(grid.dataSource.data()).filter({logic: "or", filters: filters}).data.length;
	        	if(gridLength == 0){
	        		showGridMessage('#' + gridSelector, 'No search result found for "'+ searchValue + '"')
	        	}
	        }
        	else if(searchValue == ''){
        		var grid = $('#' + gridSelector).data("kendoGrid");
        		grid.dataSource.filter({});
        	}
        },100);
    });
	
	// Grid Header Actions on Grid (search,collapse)
    $('#' + gridSelector + ' .grid-widget-header .widget-toolbar-icon').on('click',function(){
    	var command = $(this).attr('data-action');
    	var grid = $(this).parents(".k-grid");
    	
    	if(command == 'search'){
    		grid.find('.link-searchbox').toggle();
    		grid.find('.input-searchbox').toggle();
    		if(grid.find('.input-searchbox').is(':visible')){
    			grid.find('.input-searchbox input').focus();
    		}
    		else{
    			grid.find('.input-searchbox input').val('');
    			var grid = $('#' + gridSelector).data("kendoGrid");
        		grid.dataSource.filter({});
    		}
    	}
    	if(command == 'collapse'){
    		grid.toggleClass('collapsed');
    		grid.find('i.collapse-icon').toggleClass('icon-chevron-up').toggleClass('icon-chevron-down')
    	}
    });
};


(function ($) {
    $.extend($.fn, {
        contrailKendoGrid: function(options) {
            var id = $(this).attr('id');
            if(id == null) {
                id = randomUUID();
                $(this).attr('id', id);
            }
            var options = kendoGlobalGridDefault.extend(options, id);
            $(this).kendoGrid(options);
        }
    });
})(jQuery);