var socket = io();
var imgUrl = '/images/test-image.jpeg';

socket.on('connect', function () {
    console.log('We are fucking connected man');
});
socket.on('error', function (error) {
    console.error(error);
});

document.addEventListener("DOMContentLoaded", function () {
    var canvas = document.querySelector('canvas');
    var width = 800;
    var height = 600;

    var scene, camera, renderer;
    var geometry, material, mesh;
    
    init();
    animate();
    
    function init() {
    
        scene = new THREE.Scene();
    
        camera = new THREE.PerspectiveCamera( 75, width / height, 1, 10000 );
        camera.position.z = 1000;
    
        geometry = new THREE.BoxGeometry( 100, 100, 100 );
        material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false } );
    
        mesh = new THREE.Mesh( geometry, material );
        scene.add( mesh );
    
        renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: false});
        renderer.setSize( width, height );
    }
    
    function animate() {
    
        requestAnimationFrame( animate );
    
        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.02;
    
        renderer.render( scene, camera );
    }
    
    // message method buttons
    var wholeButton = document.querySelector('.whole');
    var streamButton = document.querySelector('.stream');

    var connectionTicker = document.querySelector('.connection-ticker')
    var numConnections = document.querySelector('.num-connections');

    canvas.width = 800;
    canvas.height = 600;
    
    ImageLoader.loadImage(imgUrl)
        .then(function (success) {
            // context.drawImage(success, 0, 0, canvas.width, canvas.height);
        }, function (error) {
            console.error(error);
        });
    // Method 1: send all the image data at once
    wholeButton.addEventListener('click', function () {
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        socket.emit('whole-data', {
            timestamp: new Date().getTime(),
            data: imageData.data
        });
    });
    // Method 2: use streams
    streamButton.addEventListener('click', function () {
        var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        var stream = ss.createStream();
        var blobStream = ss.createBlobReadStream(new Blob(imageData.data, {
            type: 'image/jpeg'
        }));
        blobStream.pipe(stream);
        ss(socket).emit('stream-data', stream, {
            timestamp: new Date().getTime()
        });
    });

    socket.on('num-connected', function (numConnected) {
        // hide until it is populated with content (numConnected)
        if (connectionTicker.hidden) {
            connectionTicker.hidden = false;
        }
        numConnections.innerHTML = numConnected;
    });
    socket.on('image-chunk', function (imageChunk) {
        console.log('Received chunk:', imageChunk);
        socket.emit('image-chunk-result', imageChunk);
    });
});