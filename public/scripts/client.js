var socket = io();

var testImage = 'images/test-image.jpeg';

socket.on('connect', function () {
    console.log('We are fucking connected man');
});
socket.on('error', function (error) {
    console.error(error);
});

document.addEventListener("DOMContentLoaded", function () {
    var canvas = document.querySelector('.canvas');

    var validate = document.querySelector('.validate');
    var render = document.querySelector('.render');
    var jsonText = document.querySelector('.json-world-text');
    var errorStatus = document.querySelector('.error-status');
    var successStatus = document.querySelector('.success-status');

    var connectionTicker = document.querySelector('.connection-ticker')
    var numConnections = document.querySelector('.num-connections');

    function validateJSON(json) {
        try {
            JSON.parse(json);
            errorStatus.hidden = true;
            successStatus.hidden = false;
            return true;
        } catch (e) {
            errorStatus.hidden = false;
            successStatus.hidden = true;
            return false;
        }
    }

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
        validateJSON(jsonText.value);
    });
    render.addEventListener('click', function () {
        var isValid = validateJSON(jsonText.value);
        if (isValid) {
            socket.emit('world-json', jsonText.value);
        }
    });

    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 600;

    // Load example JSON
    XHR.get('examples/example.json')
        .then(function (json) {
            // set as placeholder text
            jsonText.value = json;
        });

    // Start rendering
    ThreeJSRenderer
        .initialize(canvas)
        .setTextureFromUrl(testImage)
        .startRenderLoop();

    socket.on('num-connected', function (numConnected) {
        // hide until it is populated with content (numConnected)
        if (connectionTicker.hidden) {
            connectionTicker.hidden = false;
        }
        numConnections.innerHTML = numConnected;
    });
});