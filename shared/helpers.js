(function (exports) {

    exports.extend = function (obj, src) {
        Object.keys(src).forEach(function(key) { 
            obj[key] = src[key]; 
        });
        return obj;
    };

    exports.isValidJSON = function (json) {
        try {
            JSON.parse(json);
            return true;
        } catch (e) {
            return false;
        }
    };

    exports.isWebGLSupported = function () {
        // Create canvas element. The canvas is not added to the
        // document itself, so it is never displayed in the
        // browser window.
        var canvas = document.createElement("canvas");
        // Get WebGLRenderingContext from canvas element.
        var gl = canvas.getContext("webgl") ||
                 canvas.getContext("experimental-webgl");
        // Report the result.
        return gl && gl instanceof WebGLRenderingContext;
    };

}(typeof exports === 'undefined' ? this.Helpers = {} : exports));