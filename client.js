var socket = io();
var imgUrl = '/test-image.jpeg';

socket.on('connect', function () {
    console.log('We are fucking connected man');
});
socket.on('error', function (error) {
    console.error(error);
});

window.onload = function () {
    var canvas = document.querySelector('canvas');
    var context = canvas.getContext('2d');
    var invert = document.querySelector('.invert');

    canvas.width = 800;
    canvas.height = 600;
    
    ImageLoader.loadImage(imgUrl)
        .then(function (success) {
            console.log(success);
            context.drawImage(success, 0, 0, canvas.width, canvas.height);
        }, function (error) {
            console.error(error);
        });
    invert.addEventListener('click', function () {
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        socket.emit('split-data', {
            timestamp: new Date().getTime(),
            data: imageData
        });
    });
};