var socket = io();

socket.on('connect', function () {
    console.log('We are fucking connected man');
});
socket.on('error', function (error) {
    console.error(error);
});

document.addEventListener("DOMContentLoaded", function () {
    var renderObj = null;
    var isWebGLSupported = Helpers.isWebGLSupported();

    var canvas = document.querySelector('.canvas');

    // Render control components
    var validate = document.querySelector('.validate');
    var render = document.querySelector('.render');
    var generate = document.querySelector('.generate');

    // JSON World textarea components
    var jsonText = document.querySelector('.json-world-text');
    var info = document.querySelector('#info');
    var invalid = document.querySelector('#invalid');
    var success = document.querySelector('#success');
    var unsupported = document.querySelector('#unsupported');

    // Num connection components
    var connectionTicker = document.querySelector('.connection-ticker');
    var numConnections = document.querySelector('.num-connections');

    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 600;

    // Load example JSON and set as default textarea content
    XHR.get('examples/example.json')
        .then(function (json) {
            jsonText.value = json;
        });

    if (!isWebGLSupported) {
        info.hidden = true;
        unsupported.hidden = false;
    }

    function setStatus(isValidJSON) {
        info.hidden = true;
        if (isValidJSON) {
            invalid.hidden = true;
            success.hidden = false;
        } else {
            invalid.hidden = false;
            success.hidden = true;
        }
    }

    validate.addEventListener('click', function () {
        setStatus(Helpers.isValidJSON(jsonText.value));
    });
    render.addEventListener('click', function () {
        if (isWebGLSupported) {
            var isValid = Helpers.isValidJSON(jsonText.value);
            if (isValid) {
                var dataToSend = {
                    json: jsonText.value,
                    width: canvas.width,
                    height: canvas.height
                };
                socket.emit('render-world', dataToSend);
            }
            setStatus(isValid);
        }
    });
    
    generate.addEventListener('click', function() {
        var generatedScene = new THREE.Scene();
        
        for (var i = 0; i < 10; i++) {
            var position = new THREE.Vector3(
                (Math.random() * 400) - 200,
                (Math.random() * 400) - 200,
                (Math.random() * 400) - 200);
            var scale = (Math.random() * 100) + 50;
            var geo = new THREE.DodecahedronGeometry(scale, 0);
            var material = new THREE.MeshBasicMaterial();
            material.color = new THREE.Color(
                Math.trunc(Math.random() * 255),
                Math.trunc(Math.random() * 255),
                Math.trunc(Math.random() * 255));
            var mesh = new THREE.Mesh(geo, material);
            mesh.translateX(position.x);
            mesh.translateY(position.y);
            mesh.translateZ(position.z);
            mesh.updateMatrix();
            generatedScene.add(mesh);
        }

        jsonText.value = JSON.stringify(generatedScene.toJSON());
    });

    socket.on('num-connected', function (numConnected) {
        // hide until it is populated with content (numConnected)
        if (connectionTicker.hidden) {
            connectionTicker.hidden = false;
        }
        numConnections.innerHTML = numConnected;
    });
    socket.on('worker-job', function (job) {
        console.log('I got a job to do!');

        if (!renderObj) {
            renderObj = ThreeJSRenderer.initialize(canvas);
        }

        console.log(job);

        var worker = new Worker('scripts/rayTraceWorker.js');
        worker.onmessage = function (result) {
            socket.emit('worker-done', result.data);            
        };

        worker.postMessage(job);
    });
    socket.on('render-complete', function (jobResult) {
        console.log('Received rendered result');
        
        var size = jobResult.width * jobResult.height * 4;
        var texture = new Uint8Array(size);

        // Convert back into a Uint8Array
        for (var i = 0; i < size; i++) {
            texture[i] = jobResult.frame[i];
        }

        // Display the rendered result to the user
        renderObj.setTextureFromArray(texture, jobResult.width, jobResult.height);
        renderObj.startRenderLoop();
    });
});