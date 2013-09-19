/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var cdbTemplate = kendo.template($("#cdb-template").html());
var table = "",
	gridTitle = 'Config DB';

function loadFQNameTable() {
    $(contentContainer).html('');
    $(contentContainer).html(cdbTemplate);
    var url = "/api/query/cassandra/keys/obj_fq_name_table";
    currTab = 'setting_configdb_fqname';
    table = "obj_fq_name_table";
    gridTitle = 'FQ Name Table Keys';
//    createGrid([], getKeyColumns(false));
    showGridLoading("#cdb-results");
    doAjaxCall(url, "GET", null, "successListKeys", "failureListKeys", false, null);
};

function loadUUIDTable() {
    $(contentContainer).html('');
    $(contentContainer).html(cdbTemplate);
    var url = "/api/query/cassandra/keys/obj_uuid_table";
    currTab = 'setting_configdb_uuid';
    table = "obj_uuid_table";
    gridTitle = 'UUID Table Keys';
//    createGrid([], getKeyColumns(false));
    showGridLoading("#cdb-results");
    doAjaxCall(url, "GET", null, "successListKeys", "failureListKeys", false, null);
};

function successListKeys(results) {
    createGrid(results.keys, getKeyColumns(results["editEnabled"]));
    if(results.length == 0) {
        showGridMessage("#cdb-results", "No records found in DB.");
    }
};

function failureListKeys(error) {
    var grid = $("#cdb-results").data('kendoGrid');
    if (!grid) {
        createGrid([], getKeyValueColumns(false));
    }
    showGridMessage("#cdb-results", '<p class="message-row">Cassandra client could not fetch data from server. Please check cassandra config parameters.</p>');
};

function loadKeyValues(e) {
    var elementId = $(e).attr("id"), elements = elementId.split("~"),
        url = "/api/query/cassandra/values/" + elements[0] + "/" + elements[1];
    gridTitle = 'Key Values: ' + elements[1]
//    createGrid([], getKeyValueColumns(false));
    showGridLoading("#cdb-results");
    doAjaxCall(url, "GET", null, "successListValues", "failureListValues", false, null);
};

function createGrid(results, columns) {
    var grid = $("#cdb-results").data('kendoGrid');
    if (grid != null) {
        grid.destroy();
    }
    $("#cdb-results").html("");
    $("#cdb-results").contrailKendoGrid({
        dataSource:{
            data:results,
            pageSize:100
        },
        columns:columns,
        scrollable: false,
        searchToolbar: true,
        searchPlaceholder: 'Search Keys',
        widgetGridTitle: '<i class="icon-list blue"></i>' + gridTitle,
        widgetGridActions: ['<a data-action="collapse" onclick="reloadTable();"><i class="icon-arrow-left"></i> Back</a>']
    });
};

function successListValues(results) {
    createGrid(results["keyvalues"], getKeyValueColumns(results["editEnabled"]));
    if(results.length == 0) {
        showGridMessage("#cdb-results", "No records found in DB.");
    }
};

function failureListValues(error) {
    var grid = $("#cdb-results").data('kendoGrid');
    if (!grid) {
        createGrid([], getKeyValueColumns(false));
    }
    showGridMessage("#cdb-results", '<p class="message-row">Cassandra client could not fetch data from server. Please check cassandra config parameters.</p>');
};

function getKeyValueColumns(editEnabled) {
    var keyValueColumns = [
        {
            field:"keyvalue",
            title:"Key Value",
            searchable: true
        }
    ];
    if (editEnabled) {
        keyValueColumns.push({
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
                '            <a id="#=table#~#=key#~#=keyvalue#" onclick="onDeleteValue4Key(this);" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Delete">' +
                '                <i class="icon-trash"></i> &nbsp; Delete' +
                '            </a>' +
                '        </li>' +
                '    </ul>' +
                '</div>'
        });
    }
    return keyValueColumns;
};

function getKeyColumns(editEnabled) {
    var keyColumns = [
        {
            field:"key",
            title:"Key",
            template:'<a id="#=table#~#=key#" onclick="loadKeyValues(this)"> #= key# </a>',
            searchable: true
        }
    ];

    if (editEnabled) {
        keyColumns.push({
        	field:"",
        	menu: false,
            attributes: {
                "class": "table-cell",
                style: "text-align: right"
            },
            width: 30,
            template:'<div class="inline position-relative">' +
                '    <div class="dropdown-toggle" data-toggle="dropdown">' +
                '        <i class="icon-cog icon-only bigger-110"></i>' +
                '    </div>' +
                '    <ul class="dropdown-menu dropdown-icon-only dropdown-light pull-right dropdown-caret dropdown-close">' +
                '        <li>' +
                '            <a id="#=table#~#=key#" onclick="onDeleteKey(this);" class="tooltip-success" data-rel="tooltip" data-placement="left" data-original-title="Edit">' +
                '                <i class="icon-trash"></i> &nbsp; Delete' +
                '            </a>' +
                '        </li>' +
                '    </ul>' +
                '</div>'
        });
    }
    return keyColumns;
};

function deleteKey(e) {
    var elementId = $(e).attr("id"), elements = elementId.split("~"),
        url = "/api/query/cassandra/key/" + elements[0] + "/" + elements[1];
    doAjaxCall(url, "DELETE", null, "successDeleteKey", "failureDeleteKey", false, null);
};

function deleteValue4Key(e) {
    var elementId = $(e).attr("id"), elements = elementId.split("~"),
        url = "/api/query/cassandra/value/" + elements[0] + "/" + elements[1] + "/" + elements[2];
    doAjaxCall(url, "DELETE", null, "successDeleteKeyValue", "failureDeleteKeyValue", false, null);
};

function onDeleteKey(e) {
    var confirmWindow = createConfirmWindow(e, "delete-key");
    confirmWindow.data("kendoWindow").center().open();
}

function onDeleteValue4Key(e) {
    var confirmWindow = createConfirmWindow(e, "delete-key-value");
    confirmWindow.data("kendoWindow").center().open();
}

function createConfirmWindow(elementId, type) {
    var kendoWindow = $("<div />").kendoWindow({
        title:"Delete Confirmation",
        resizable:false,
        modal:true
    });

    kendoWindow.data("kendoWindow").content($("#confirmation-template").html());

    kendoWindow.find("#confirm").click(function () {
        kendoWindow.data("kendoWindow").close();
        if (type == "delete-key") {
            deleteKey(elementId);
        } else if (type == "delete-key-value") {
            deleteValue4Key(elementId);
        }
    }).end();

    kendoWindow.find("#cancel").click(function () {
        kendoWindow.data("kendoWindow").close();
    }).end();

    return kendoWindow;
};

function successDeleteKey(results) {
    showInfoWindow("You have successfully deleted the key.", "Delete Success");
    reloadTable();
};

function failureDeleteKey(error) {
    showInfoWindow("An error occurred while deleting the key.", "Delete Error");
};

function successDeleteKeyValue(results) {
    showInfoWindow("You have successfully deleted the key-value.", "Delete Success");
    reloadTable();
};

function failureDeleteKeyValue(error) {
    showInfoWindow("An error occurred while deleting the key-value.", "Delete Error");
};

function reloadTable() {
    if (table == "obj_fq_name_table") {
        loadFQNameTable();
    } else if (table == "obj_uuid_table") {
        loadUUIDTable();
    }
};
