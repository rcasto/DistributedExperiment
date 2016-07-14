var ImageLoader = {};

ImageLoader.loadImage = function (url) {
    return new Promise(function (resolve, reject) {
        var img = new Image();
        img.src = url;
        img.addEventListener('load', function () {
            resolve(img);
        });
        img.addEventListener('error', function (error) {
            reject(error);
        });
    });
};