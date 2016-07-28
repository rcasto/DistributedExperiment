var socket = io();

socket.on('connect', function () {
    console.log('We are fucking connected man');
});
socket.on('error', function (error) {
    console.error(error);
});

document.addEventListener("DOMContentLoaded", function () {
    var renderObj = null;

    var canvas = document.querySelector('.canvas');

    // Render control components
    var validate = document.querySelector('.validate');
    var render = document.querySelector('.render');
    var generate = document.querySelector('.generate');

    // JSON World textarea components
    var jsonText = document.querySelector('.json-world-text');
    var infoStatus = document.querySelector('.info-status');
    var errorStatus = document.querySelector('.error-status');
    var successStatus = document.querySelector('.success-status');

    // Num connection components
    var connectionTicker = document.querySelector('.connection-ticker');
    var numConnections = document.querySelector('.num-connections');

    function validateJSON(json) {
        infoStatus.hidden = true;
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

    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 600;

    // Load example JSON and set as default textarea content
    XHR.get('examples/example.json')
        .then(function (json) {
            jsonText.value = json;
        });

    validate.addEventListener('click', function () {
        validateJSON(jsonText.value);
    });
    render.addEventListener('click', function () {
        var isValid = validateJSON(jsonText.value);
        if (isValid) {
            var dataToSend = {
                json: jsonText.value,
                width: canvas.width,
                height: canvas.height
            };
            socket.emit('render-world', dataToSend);
        }
    });
    
    generate.addEventListener('click', function() {
        var generatedScene = new THREE.Scene();
        
        for (var i = 0; i < 3; i++) {
            var position = new THREE.Vector3(
                (Math.random() * 400) - 200,
                (Math.random() * 400) - 200,
                (Math.random() * 400) - 200);
            var scale = (Math.random() * 60) + 10;
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