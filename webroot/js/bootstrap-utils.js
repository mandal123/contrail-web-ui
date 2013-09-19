/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

(function ($) {
    $.extend({
        contrailBootstrapModal: function(options) {
        	options.id = options.id != undefined ? options.id : '';
        	
        	var modalHTML = '<div id="' + options.id + '" class="modal hide"> \
        		<div class="modal-header"> \
        	    	<button type="button" class="close" data-dismiss="modal" aria-hidden="true"><i class="icon-remove"></i></button> \
        			<h6 class="modal-header-title"></h6> \
        		</div> \
	        	<div class="modal-body"></div> \
	        	<div class="modal-footer"></div> \
        	</div>';
        	
        	$('#' + options.id).remove();
        	$('body').prepend(modalHTML);
        	
        	var modalId = $('#' + options.id);
        	
        	modalId.find('.modal-header-title').empty().append(options.title != undefined ? options.title : '&nbsp;');
        	modalId.find('.modal-body').empty().append(options.body);
        	
        	$.each(options.footer, function(key,val){
        		var btnId = (val.id != undefined && val.id != '') ? val.id : options.id + 'btn' + key,
        			btn = '<button id="' + btnId + '" \
    				class="btn btn-mini '+ ((val.className != undefined && val.className != '') ? val.className : '') + '" \
            		' + ((val.onclick === 'close') ? 'data-dismiss="modal" aria-hidden="true"' : '') + '> \
            			'+ ((val.title != undefined) ? val.title : '') + '\
            	</button>';
        		
        		modalId.find('.modal-footer').append(btn);
        		if(typeof(val.onclick) == 'function'){
        			$('#' + btnId).on('click', val.onclick);
        		}
        	});
        	
        	modalId.modal('show');
        }
    });
})(jQuery);


/* Test Code 
$(document).ready(function(){
	$.contrailBootstrapModal({
		id: 'test-modal',
		title: 'Test',
		body: '<p>One test</p>',
		footer: [
		         {
		        	 id: 'svBtn',
		        	 className: 'btn-primary',
		        	 title: 'Save',
		        	 onclick: function(){
		        		 console.log('saved');
		        	 }
		         },
		         {
		        	 id: 'cancelBtn',
		        	 title: 'Cancel',
		        	 onclick: 'close'
		         }
		]
	});
});
*/
