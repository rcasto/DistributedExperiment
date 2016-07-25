var XHR = (function () {

    function get(url) {
        return new Promise(function (resolve, reject) {
            var xhr = window.XMLHttpRequest ? 
                new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
            xhr.open('GET', url);
            xhr.onreadystatechange = function() {
                if (xhr.readyState > 3 && xhr.status === 200) {
                    resolve(xhr.responseText);
                }
            };
            xhr.addEventListener('error', function (e) {
                reject(e);
            });
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.send();
            return xhr;
        });
    }

    return {
        get: get
    };

}());