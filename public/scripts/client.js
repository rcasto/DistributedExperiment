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
    canvas.width = 400;
    canvas.height = 300;

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
<<<<<<< HEAD
            socket.emit('render-world', {
                json: jsonText.value,
                width: canvas.width,
                height: canvas.height
            });
=======
            if (!renderObj) {
                renderObj = ThreeJSRenderer.initialize(canvas);
            }
            renderObj.stopRenderLoop();
            ThreeJSRenderer
                .parseJSON(jsonText.value)
                .then(function (world) {
                    socket.emit('render-world', {
                        world: world.toJSON(),
                        width: canvas.width,
                        height: canvas.height
                    });
                    renderObj.setTextureFromWorld(world);
                    renderObj.startRenderLoop();
                },function(error) {
                    console.log(error)
                });
>>>>>>> ce6bdd2ca5d55130a2e29efd5c95ec614f6b15eb
        }
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

        // renderObj.stopRenderLoop();
        ThreeJSRenderer
            .parseJSON(job.json)
            .then(function (world) {
                // After deserialization all objects need to update their world matrix
                for (var i = 0; i < world.children.length; i++) {
                    world.children[i].updateMatrix();
                    world.children[i].material.reflectivity = 0.5;
                    world.children[i].material.color = new THREE.Color(
                        Math.trunc(world.children[i].material.color.r * 255), 
                        Math.trunc(world.children[i].material.color.g * 255), 
                        Math.trunc(world.children[i].material.color.b * 255) 
                    );
                }
                
                // Set the new scene
                RayTracer.setScene(world);
                var textureWidth = job.width - job.x;
                var textureHeight = job.height - job.y;
                
                var texture = RayTracer.render(job.y, job.x, job.height, job.width, job.fullFrameWidth, job.fullFrameHeight);
                
                renderObj.setTextureFromArray(texture, textureWidth, textureHeight);
                renderObj.startRenderLoop();
            },function(error) {
                console.log(error)
            });

        console.log(job);
        socket.emit('worker-done', job);
    });
    socket.on('render-complete', function (jobResult) {
        console.log('Received rendered result');
    });
});