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

    // Render control components
    var validate = document.querySelector('.validate');
    var render = document.querySelector('.render');

    // JSON World textarea components
    var jsonText = document.querySelector('.json-world-text');
    var errorStatus = document.querySelector('.error-status');
    var successStatus = document.querySelector('.success-status');

    // Num connection components
    var connectionTicker = document.querySelector('.connection-ticker');
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

    // Set canvas dimensions
    canvas.width = 400;
    canvas.height = 300;

    var camera = new THREE.PerspectiveCamera(90, canvas.width / canvas.height, 1, 1500);
    camera.position.z = 400;

    RayTracer.setCamera(camera);
    RayTracer.setConfig(1, 1);
    RayTracer.setSkyColors(
        new THREE.Color(0xFFFFFF),
        new THREE.Color(0x000000)
    );
    
    var scene = new THREE.Scene();
    var geo = new THREE.BoxGeometry( 200, 200, 200 );
    var material = new THREE.MeshBasicMaterial();
    material.color = new THREE.Color(0, 255, 0);
    material.reflectivity = 0.2;
    material.wireframe = false;
    var mesh = new THREE.Mesh( geo, material );
    mesh.rotateX(30 * (Math.PI / 180.0));
    mesh.updateMatrix();
    scene.add( mesh );

    RayTracer.setScene(scene);
    var texture = RayTracer.render(0, 0, canvas.height, canvas.width, canvas.width, canvas.height); 

    // Load example JSON and set as default textarea content
    XHR.get('examples/example.json')
        .then(function (json) {
            jsonText.value = json;
        });

    // Start rendering
    var renderObj = ThreeJSRenderer
        .initialize(canvas)
        .setTextureFromArray(texture, canvas.width, canvas.height)
        .startRenderLoop();

    validate.addEventListener('click', function () {
        validateJSON(jsonText.value);
    });
    render.addEventListener('click', function () {
        var isValid = validateJSON(jsonText.value);
        if (isValid) {
            socket.emit('render-world', {
                json: jsonText.value,
                width: canvas.width,
                height: canvas.height
            });
            ThreeJSRenderer
                .parseJSON(jsonText.value)
                .then(function (worldObj) {
                    // After deserialization all objects need to update their world matrix
                    for (var i = 0; i < worldObj.children.length; i++) {
                        worldObj.children[i].updateMatrix();
                        worldObj.children[i].material.reflectivity = 0.5;
                        worldObj.children[i].material.color = new THREE.Color(Math.trunc(worldObj.children[i].material.color.r * 255), Math.trunc(worldObj.children[i].material.color.g * 255), Math.trunc(worldObj.children[i].material.color.b * 255) ); 
                    }
                    
                    // Set the new scene
                    RayTracer.setScene(worldObj);

                    // Render the new scene
                    texture = RayTracer.render(0, 0, canvas.height, canvas.width, canvas.width, canvas.height);

                    // Set the texture on the quad
                    renderObj.setTextureFromArray(texture, canvas.width, canvas.height);
                },
                function(error) {
                    console.log(error)
                });
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