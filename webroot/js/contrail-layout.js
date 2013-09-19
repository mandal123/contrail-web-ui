/*
 * Copyright (c) 2013 Juniper Networks, Inc. All rights reserved.
 */

var globalObj = {},
    contentContainer = "#content-container";

globalObj['loadedScripts'] = [];
globalObj.NUM_FLOW_DATA_POINTS = 1000;

function handleSideMenu() {
    $('#menu-toggler').on('click', function () {
        $('#sidebar').toggleClass('display');
        $(this).toggleClass('display');
        return false;
    });
    //opening submenu
    var $minimized = false;
    $('.nav-list').on('click', function (e) {
        if ($minimized) return;

        //check to see if we have clicked on an element which is inside a .dropdown-toggle element?!
        //if so, it means we should toggle a submenu
        var link_element = $(e.target).closest('.dropdown-toggle');
        if (link_element && link_element.length > 0) {
            var sub = link_element.next().get(0);
            toggleSubMenu(sub);
            return false;
        }
    });
}

function toggleSubMenu(subMenu, linkId) {
    //if we are opening this submenu, close all other submenus except the ".active" one
    if (!$(subMenu).is(':visible')) {//ie, we are about to open it and make it visible
        $('.open > .submenu').each(function () {
            if (this != subMenu) {
                $(this).slideUp(200).parent().removeClass('open').removeClass('active');
            }
        });
        $(subMenu).slideToggle(200).parent().toggleClass('open').toggleClass('active');
    }
    if (linkId != null) {
        $('.submenu > li').each(function () {
            $(this).removeClass('active');
        });
        $(linkId).addClass('active');
    }
};

function onClickSidebarCollapse() {
    var $minimized = false;
    $('#sidebar').toggleClass('menu-min');
    $('#sidebar-collapse').find('i').toggleClass('icon-chevron-left').toggleClass('icon-chevron-right');

    $minimized = $('#sidebar').hasClass('menu-min');
    if ($minimized) {
        $('.open > .submenu').removeClass('open');
    }
}

function enableSearchAhead() {
    $('#nav-search-input').typeahead({
        source:siteMapSearchStrings,
        updater:function (item) {
            $('#nav-search-input').focus();
            return item;
        }
    });
}

function searchSiteMap() {
    var searchString = $('#nav-search-input').val(), hash, queryParams;
    for (hash in siteMap) {
        if (siteMap[hash]['searchStrings'].indexOf(searchString.trim()) != -1) {
            lastHash = $.bbq.getState();
            queryParams = siteMap[hash]['queryParams'];
            currHash = {p:hash, q:queryParams};
            onHashChange(lastHash, currHash);
            lastHash = currHash;
            return false;
        }
    }
    return false;
};

function generalInit() {
    $('.ace-nav [class*="icon-animated-"]').closest('a').on('click', function () {
        var icon = $(this).find('[class*="icon-animated-"]').eq(0);
        var $match = icon.attr('class').match(/icon\-animated\-([\d\w]+)/);
        icon.removeClass($match[0]);
        $(this).off('click');
    });

    $('#btn-scroll-up').on('click', function () {
        var duration = Math.max(100, parseInt($('html').scrollTop() / 3));
        $('html,body').animate({scrollTop:0}, duration);
        return false;
    });

}

function openWidget(id) {
    var $this = $(id).find('.widget-toolbar > a[data-action]');
    var $box = $this.closest('.widget-box');
    var $body = $box.find('.widget-body');
    var $icon = $this.find('[class*=icon-]').eq(0);
    var $match = $icon.attr('class').match(/icon\-(.*)\-(up|down)/);
    var $icon_down = 'icon-' + $match[1] + '-down';
    var $icon_up = 'icon-' + $match[1] + '-up';
    $body = $body.find(':first-child').eq(0);
    if ($box.hasClass('collapsed')) {
        if ($icon) $icon.addClass($icon_up).removeClass($icon_down);
        $box.removeClass('collapsed');
        $body.slideDown(200);
    }
    if ($box.hasClass('collapsed') && $icon) $icon.addClass($icon_down).removeClass($icon_up);
};

function collapseWidget(id) {
    var $this = $(id).find('.widget-toolbar > a[data-action]');
    var $box = $this.closest('.widget-box');
    var $body = $box.find('.widget-body');
    var $icon = $this.find('[class*=icon-]').eq(0);
    var $match = $icon.attr('class').match(/icon\-(.*)\-(up|down)/);
    var $icon_down = 'icon-' + $match[1] + '-down';
    var $icon_up = 'icon-' + $match[1] + '-up';
    $body = $body.find(':first-child').eq(0);
    if (!($box.hasClass('collapsed'))) {
        if ($icon) $icon.addClass($icon_down).removeClass($icon_up);
        //$body.slideUp(300, function () {
            $box.addClass('collapsed')
        //});
    }
};

function toggleWidget(id) {
    var $this = $(id);
    var $box = $this.closest('.widget-box');
    var $body = $box.find('.widget-body');
    var $icon = $this.find('[class*=icon-]').eq(0);
    var $match = $icon.attr('class').match(/icon\-(.*)\-(up|down)/);
    var $icon_down = 'icon-' + $match[1] + '-down';
    var $icon_up = 'icon-' + $match[1] + '-up';
    $body = $body.wrapInner('<div class="widget-body-inner"></div>').find(':first-child').eq(0);
    if ($box.hasClass('collapsed')) {
        if ($icon) $icon.addClass($icon_up).removeClass($icon_down);
        $box.removeClass('collapsed');
        $body.slideDown(200);
    } else {
        if ($icon) $icon.addClass($icon_down).removeClass($icon_up);
        $body.slideUp(300, function () {
            $box.addClass('collapsed')
        });
    }
    if ($box.hasClass('collapsed') && $icon) $icon.addClass($icon_down).removeClass($icon_up);
};

function toggleWidgetsVisibility(showWidgetIds, hideWidgetIds) {
    for(var i = 0; i < showWidgetIds.length; i++) {
        $('#' + showWidgetIds[i]).removeClass('hide');
    }
    for(var j = 0; j < hideWidgetIds.length; j++) {
        $('#' + hideWidgetIds[j]).addClass('hide');
    }
};

function initWidgetBoxes() {
    $('.widget-toolbar > a[data-action]').each(function () {
        initWidget(this);
    });
};

function initWidget4Id(id) {
    $(id).find('.widget-toolbar > a[data-action]').each(function () {
            initWidget(this);
        }
    );
};

function initWidget(widget) {
    var $this = $(widget);
    var $action = $this.data('action');
    var $box = $this.closest('.widget-box');

    if ($action == 'collapse') {
        /*var $body = $box.find('.widget-body');
        var $icon = $this.find('[class*=icon-]').eq(0);
        var $match = $icon.attr('class').match(/icon\-(.*)\-(up|down)/);
        var $icon_down = 'icon-' + $match[1] + '-down';
        var $icon_up = 'icon-' + $match[1] + '-up';

        $body = $body.wrapInner('<div class="widget-body-inner"></div>').find(':first-child').eq(0);
        $this.on('click', function (ev) {
            if ($box.hasClass('collapsed')) {
                if ($icon) $icon.addClass($icon_up).removeClass($icon_down);
                $box.removeClass('collapsed');
                $body.slideDown(200);
            } else {
                if ($icon) $icon.addClass($icon_down).removeClass($icon_up);
                $body.slideUp(300, function () {
                    $box.addClass('collapsed')
                });
            }
            ev.preventDefault();
        });
        if ($box.hasClass('collapsed') && $icon) $icon.addClass($icon_down).removeClass($icon_up);*/

    } else if ($action == 'close') {
        $this.on('click', function (ev) {
            $box.hide(300, function () {
                $box.remove();
            });
            ev.preventDefault();
        });
    } else if ($action == 'close-hide') {
        $this.on('click', function (ev) {
            $box.slideUp();
            ev.preventDefault();
        });
    } else if ($action == 'reload') {
        $this.on('click', function (ev) {
            $this.blur();
            //var $body = $box.find('.widget-body');
            var $remove = false;
            if (!$box.hasClass('position-relative')) {
                $remove = true;
                $box.addClass('position-relative');
            }
            $box.append('<div class="widget-box-layer"><i class="icon-spinner icon-spin icon-2x white"></i></div>');
            setTimeout(function () {
                $box.find('> div:last-child').remove();
                if ($remove) $box.removeClass('position-relative');
            }, parseInt(Math.random() * 1000 + 1000));
            ev.preventDefault();
        });
    } else if ($action == 'settings') {
        $this.on('click', function (ev) {
            ev.preventDefault();
        });
    }
};

//code taken from http://code.jquery.com/jquery-1.8.3.js to provide simple browser detection for 1.9+ versions
function addBrowserDetection($) {
    if (!$.browser) {
        var matched, browser;

        // Use of jQuery.browser is frowned upon.
        // More details: http://api.jquery.com/jQuery.browser
        // jQuery.uaMatch maintained for back-compat
        $.uaMatch = function (ua) {
            ua = ua.toLowerCase();

            var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
                /(webkit)[ \/]([\w.]+)/.exec(ua) ||
                /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
                /(msie) ([\w.]+)/.exec(ua) ||
                ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
                [];

            return {
                browser:match[ 1 ] || "",
                version:match[ 2 ] || "0"
            };
        };

        matched = $.uaMatch(navigator.userAgent);
        browser = {};

        if (matched.browser) {
            browser[ matched.browser ] = true;
            browser.version = matched.version;
        }

        // Chrome is Webkit, but Webkit is also Safari.
        if (browser.chrome) {
            browser.webkit = true;
        } else if (browser.webkit) {
            browser.safari = true;
        }

        $.browser = browser;

    }
}

function onWindowResize() {
    //Trigger resize event on current view
    if ((globalObj.currMenuObj != null))
        if (globalObj.currMenuObj['class'] != null)
            globalObj.currMenuObj['class'].resize();
}

function getScript(url, callback) {
    globalObj['loadedScripts'].push(url);
    return $.ajax({
        type:"GET",
        url:url,
        success:callback,
        dataType:"script",
        cache:true
    });
};

function loadCSS(cssFilePath) {
    var links = document.getElementsByTagName('link'),
        loadcss = true;

    var loadedCSSs = $.map(links, function (idx, obj) {
        return link.getAttribute('href');
    });
    if ($.inArray(cssFilePath, loadedCSSs) == -1) {
        $("<link/>", {
            rel:"stylesheet",
            type:"text/css",
            href:cssFilePath
        }).appendTo("head");
    }
}

function LayoutHandler() {
    //Don't escape ":[]" characters while pushing state via bbq
    $.param.fragment.noEscape(":[]");
    var self = this;
    this.loadHeader = function () {
        //var headerTemplate = kendo.template($('#header-template').html());
        //Append a div as first child to body element
        //$('body').prepend('<div id="page-header" class="height-100"></div>');
        //$('#page-header').html(headerTemplate);
    }

    /** Get view height excluding header & footer **/
    this.getViewHeight = function () {
        var windowHeight = $(window).height();
        //To enforce minimum height
        if (windowHeight < 768)
            windowHeight = 768;
        //Subtract the height of pageHeader and seperator height
        return (windowHeight - $('#header').outerHeight() - 1);
    }

    /** Returns the entire hash object */
    this.getURLHashObj = function () {
        return $.bbq.getState();
    }

    /** Override the entire hash object with the given one */
    this.setURLHashObj = function (obj) {
        $.bbq.pushState(obj);
    }

    /** Returns the value of 'q' in urlHash which is used to maintain the state within a page */
    this.getURLHashParams = function () {
        var urlHash = $.bbq.getState('q');
        return ifNull(urlHash, '');
    }

    /** Sets the vaue of 'q' in urlHash */
    this.setURLHashParams = function (hashParams, obj) {
        var merge = true, triggerHashChange = true;
        if (obj != null) {
            merge = ifNull(obj['merge'], true);
            triggerHashChange = ifNull(obj['triggerHashChange'], true);
        }
        //Update Hash only if it differs from current hash
        var currHashParams = self.getURLHashParams();
        if (JSON.stringify(sort(currHashParams)) != JSON.stringify(sort(hashParams))) {
            //To avoid loading the view again
            if (triggerHashChange == false)
                globalObj.hashUpdated = 1;
            if ((merge == true) && (typeof(hashParams) == 'object'))
                hashParams = $.extend(currHashParams, hashParams);
            if ((obj != null) && (obj['p'] != null))
                $.bbq.pushState({p:obj['p'], q:hashParams});
            else
                $.bbq.pushState({q:hashParams});
        }
    }
}

function onHashChange(lastHash, currHash) {
    if ($('.modal-backdrop').is(':visible')) {
        $('.modal-backdrop').remove();
        $('.modal').remove();
    }
    var currPageHash = ifNull(currHash['p'], ''),
        lastPageHash = ifNull(lastHash['p'], ''),
        currPageQueryStr = ifNull(currHash['q'], {}),
        lastPageQueryStr = ifNull(lastHash['q'], {}),
        reloadMenu = true, currPageHashArray, subMenuId;
    var lastMenuObj = menuHandler.getMenuObjByHash(lastPageHash);
    try {
        if (currPageHash == '') {
            currPageHash = "mon_infra_dashboard";
        }
        var currMenuObj = menuHandler.getMenuObjByHash(currPageHash);
        //Toggle menu button only if there is a change in hash of main menu[Monitor/Configure/Settings/Queries]
        menuHandler.toggleMenuButton(null, currPageHash, lastPageHash);
        //If curr URL is same as default URL, remove non-menu breadcrumbs
        if ((lastPageHash == currPageHash) || ((currMenuObj['class'] != null) && (currMenuObj['class'] == lastMenuObj['class']))) {
            var deferredObj = $.Deferred();
            //Load JS files
            if(currMenuObj['js'].length > 0) {
                menuHandler.loadResourcesFromMenuObj(currMenuObj,deferredObj);
            } else
                deferredObj.resolve();
            deferredObj.done(function() {
                //If hashchange is within the same page
                var currMenuObj = menuHandler.getMenuObjByHash(currPageHash);
                if (window[currMenuObj['class']] != null) {
                    window[currMenuObj['class']].updateViewByHash(currPageQueryStr, lastPageQueryStr);
                }
            });
        } else {
            //Clean-up the oldView if present
            if ((lastHash != null) && (lastHash['p'] != null)) {
                var menuObj = menuHandler.getMenuObjByHash(lastHash['p']);
                menuHandler.destroyView(menuObj);
            }
            var currMenuObj = menuHandler.getMenuObjByHash(currPageHash);
            menuHandler.loadViewFromMenuObj(currMenuObj);
        }
    } catch (error) {
        console.log(error.stack);
    }
}

function getMenuButtonName(buttonHash) {
    if (buttonHash == "mon") {
        return "monitor"
    } else if (buttonHash == "config") {
        return "configure";
    } else if (buttonHash == "query") {
        return "query";
    } else if (buttonHash == "setting") {
        return "setting";
    } else {
        return "monitor";
    }
}

function check2ReloadMenu(lastPageHash, currentMenu) {
    var lastPageHashArray, reloadMenu = true;
    if (lastPageHash != null && lastPageHash != "") {
        lastPageHashArray = lastPageHash.split("_");
        reloadMenu = (lastPageHashArray[0] == currentMenu) ? false : true;
    }
    return reloadMenu;
}

var lastHash = {};
var previous_scroll = $(window).scrollTop();
var scrollHeight = $(document).height() - $(window).height();
$(document).ready(function () {
	if(getCookie('username') != null){
		$('#user_info').text(getCookie('username'));
	}
	$('#user-profile').show();
    //Listener to expand/collapse widget based on toggleButton in widget header
    $("#content-container").find('div.widget-box div.widget-header div.widget-toolbar a[data-action="collapse"]').live('click',function(){
        $(this).find('i').toggleClass('icon-chevron-up').toggleClass('icon-chevron-down');
        var widgetBodyElem = $(this).parents('div.widget-box').find('div.widget-body');
        var widgetBoxElem = $(this).parents('div.widget-box');
        $(widgetBoxElem).toggleClass('collapsed'); 
    });
    $(window).on('scroll', function () {
        scrollHeight = $(document).height() - $(window).height();
        var current_scroll = $(this).scrollTop()

        if (current_scroll < 50 || previous_scroll - current_scroll > 40) {
            $("#header").removeClass("hide");
            $('#sidebar').removeClass('scrolled');
            $('#breadcrumbs').removeClass('scrolled');

        }
        else {
            $("#header").addClass("hide");
            $('#sidebar').addClass('scrolled');
            $('#breadcrumbs').addClass('scrolled');
        }
        if (current_scroll < scrollHeight) {
            previous_scroll = $(window).scrollTop();
        }
    });

    $(document).ajaxComplete(function (event, xhr, settings) {
        var redirectHeader = xhr.getResponseHeader('X-Redirect-Url');
        if (redirectHeader != null) {
            window.location.href = redirectHeader;
        }
    });
    initMasterTooltip();
    layoutHandler = new LayoutHandler();
    menuHandler = new MenuHandler();
    layoutHandler.loadHeader();
    menuHandler.loadMenu();
    //Load view once menu is loaded
    menuHandler.deferredObj.done(function () {
        onHashChange({}, $.bbq.getState());
    });
    jQuery.support.cors = true;
    $.ajaxSetup({
        //cache: true,
        crossDomain:true,
        //set the default timeout as 30 seconds
        timeout:30000,
        beforeSend:function (xhr, settings) {
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        },
        error:function (xhr, e) {
            //ajaxDefErrorHandler(xhr);
        }
    });
    //$(window).resize(onWindowResize);
    lastHash = $.bbq.getState();
    $(window).hashchange(function () {
        currHash = $.bbq.getState();
        //Don't trigger hashChange if URL hash is updated from code
        //As the corresponding view has already been loaded from the place where hash is updated
        //Ideally,whenever to load a view,just update the hash let it trigger the handler,instead calling it manually
        if (globalObj.hashUpdated == 1) {
            globalObj.hashUpdated = 0;
            lastHash = currHash;
            return;
        }
        logMessage('hashChange', JSON.stringify(lastHash), ' -> ', currHash);
        logMessage('hashChange', JSON.stringify(currHash));
        onHashChange(lastHash, currHash);
        lastHash = currHash;
    });
    handleSideMenu();
    enableSearchAhead();
    addBrowserDetection(jQuery);
    generalInit();

    //bootstrap v 2.3.1 prevents this event which firefox's middle mouse button "new tab link" action, so we off it!
    $(document).off('click.dropdown-menu');
    $(document).on('TEMPLATE_LOADED', function (e) {
        //console.info(e);
    })
});

Object.identical = function (a, b, sortArrays) {

    function sort(object) {
        if (sortArrays === true && Array.isArray(object)) {
            return object.sort();
        }
        else if (typeof object !== "object" || object === null) {
            return object;
        }

        return Object.keys(object).sort().map(function (key) {
            return {
                key:key,
                value:sort(object[key])
            };
        });
    }

    return JSON.stringify(sort(a)) === JSON.stringify(sort(b));
};

$.fn.modal.Constructor.prototype.enforceFocus = function () {
};
