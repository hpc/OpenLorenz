(function($, window) {
    jQuery.fn.center = function() {
        this.css("position", "fixed"); // note this is FIXED position, so we dont add scrollTop or scrollLeft to the calculations, if it was absolute we would
        this.css("top", ($(window).height() - this.height()) / 2 + "px");
        this.css("left", ($(window).width() - this.width()) / 2 + "px");
        return this;
    }

    var contentFadeCss = {
        'display': 'none',
        'position': 'absolute',
        'background': '#FFFFFF',
        'padding': '5px',
        'zIndex': '100002',
        'maxWidth': '700px',
        'color': '#000000',
        'border': '1px solid black',
        'fontFamily': 'century gothic'
    };

    var bgFadeCss = {
        'display': 'none',
        'position': 'fixed',
        'top': '0',
        'left': '0',
        'background': '#000000',
        'zIndex': '10001'
    };

    $('<div id="contentFade"></div>').css(contentFadeCss).appendTo('body');
    $('<div id="bgFade"></div>').css(bgFadeCss).appendTo('body');

    $(window).resize(function() {
        $("#contentFade").center();
    });

    //doFadeBox arguments:
    //  content - any content you want to show in the middle of the fadebox
    //  inSpeed - the fadeBox fade in speed in milliseconds,  'slow' or 'fast' also acceptable
    //  outSpeed - the fadeBox fade out speed in milliseconds
    //
    //  desc: shows fadebox and adds event listeners to fade it out on pressing of the 'esc' key or clicking
    function doFadeBox(content, inSpeed, outSpeed) {
        content = (content == undefined) ? '' : content;
        inSpeed = (inSpeed == undefined) ? 'slow' : inSpeed;;
        outSpeed = (outSpeed == undefined) ? 'slow' : outSpeed;

        showFadeBox(content, inSpeed);

        $(document).keypress(function(e) {
            if (e.keyCode == 27) {
                hideFadeBox(outSpeed);
            }
        });

        $("#bgFade").click(function() {
            hideFadeBox(outSpeed);
        });

        $("#contentFade").click(function() {
            hideFadeBox(outSpeed);
        });
    }

    //hideFadeBox arguments:
    //  outSpeed: how fast you want to the fade out to be
    //
    //  desc: forces the fadebox to be hidden... without events
    function hideFadeBox(outSpeed) {
        outSpeed = (outSpeed == undefined) ? 'slow' : outSpeed;
        $("#bgFade").fadeOut(outSpeed);
        $("#contentFade").fadeOut(outSpeed);
    }

    //showFadeBox arguments:
    //  inSpeed: how fast you want to the fade in to be
    //  content: any content you want shown
    //  desc: forces the fadebox to be shown... without events
    function showFadeBox(content, inSpeed) {
        inSpeed = (inSpeed == undefined) ? 'slow' : inSpeed;

        var bgFadeCss = {
            'height': '100%',
            'width': '100%',
            'opacity': '0.7'
        }

        $("#bgFade").css(bgFadeCss).fadeIn(inSpeed);
        $("#contentFade").html(content).center().fadeIn(inSpeed);
    }

    window.showLoadingScreen = function (inSpeed) {
        var content = '<div align="center">' + '<span class = "ajaxLoader"></span>' + '<br />' + 'Loading...' + '</div>';

        showFadeBox(content, 0);
    }

    window.hideLoadingScreen = function (outSpeed) {
        hideFadeBox(0);
    }
}(jQuery, window));