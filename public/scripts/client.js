var socket = io();

socket.on('connect', function () {
    console.log('We are fucking connected man');
});
socket.on('error', function (error) {
    console.error(error);
});

document.addEventListener("DOMContentLoaded", function () {
    // message method buttons
    var streamButton = document.querySelector('.stream');

    var validate = document.querySelector('.validate');
    var jsonText = document.querySelector('.json-world-text');

    var connectionTicker = document.querySelector('.connection-ticker')
    var numConnections = document.querySelector('.num-connections');

    // Method 2: use streams
    // streamButton.addEventListener('click', function () {
    //     var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    //     var stream = ss.createStream();
    //     var blobStream = ss.createBlobReadStream(new Blob(imageData.data, {
    //         type: 'image/jpeg'
    //     }));
    //     blobStream.pipe(stream);
    //     ss(socket).emit('stream-data', stream, {
    //         timestamp: new Date().getTime()
    //     });
    // });
    validate.addEventListener('click', function () {
        try {
            console.log(jsonText.value, JSON.parse(jsonText.value));
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('num-connected', function (numConnected) {
        // hide until it is populated with content (numConnected)
        if (connectionTicker.hidden) {
            connectionTicker.hidden = false;
        }
        numConnections.innerHTML = numConnected;
    });
});