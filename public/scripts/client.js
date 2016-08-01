var socket = io();

socket.on('connect', function () {
    console.log('We are fucking connected man');
});
socket.on('error', function (error) {
    console.error(error);
});

document.addEventListener("DOMContentLoaded", function () {
    var canvasHolder = document.querySelector('.canvas-holder');
    var canvas = document.querySelector('.canvas');
    var isWebGLSupported = Helpers.isWebGLSupported();
    var renderObj = null;

    // Render control components
    var validate = document.querySelector('.validate');
    var render = document.querySelector('.render');
    var generate = document.querySelector('.generate');

    // JSON World textarea components
    var jsonText = document.querySelector('.json-world-text');
    var progress = document.querySelector('#progress');
    var progressStatus = document.querySelector('.progress-status');
    var rendered = document.querySelector('#rendered');
    var info = document.querySelector('#info');
    var invalid = document.querySelector('#invalid');
    var success = document.querySelector('#success');
    var unsupported = document.querySelector('#unsupported');

    // Num connection components
    var connectionTicker = document.querySelector('.connection-ticker');
    var numConnections = document.querySelector('.num-connections');

    // Load example JSON and set as default textarea content
    XHR.get('examples/example.json')
        .then(function (json) {
            jsonText.value = json;
        });

    // Check for browser compat
    if (!isWebGLSupported) {
        info.hidden = true;
        unsupported.hidden = false;
    }

    resizeCanvas();

    /*
        Private utility functions
    */
    function setStatus(type) {
        info.hidden = true;
        rendered.hidden = true;
        invalid.hidden = true;
        progress.hidden = true;
        success.hidden = true;
        switch (type) {
            case 'rendered':
                rendered.hidden = false;
                break;
            case 'invalid':
                invalid.hidden = false;
                break;
            case 'progress':
                progress.hidden = false;
                break;
            case 'success':
                success.hidden = false;
                break;
        }
    }
    function resizeCanvas() {
        if (canvasHolder.offsetWidth !== canvas.width) {
            canvas.width = canvasHolder.offsetWidth;
        }
        canvas.height = 600;
        renderObj = ThreeJSRenderer.initialize(canvas);
    }

    // Resize the canvas on window resize
    window.addEventListener('resize', function () {
        console.log('The canvas has been resized');
        // resizeCanvas();
    })

    /*
        Register control click events
    */
    validate.addEventListener('click', function () {
        if (Helpers.isValidJSON(jsonText.value)) {
            setStatus('success');
        } else {
            setStatus('invalid');
        }
    });
    // Can't render if WebGL is not supported, don't register render click event
    if (isWebGLSupported) {
        render.addEventListener('click', function () {
            var isValid = Helpers.isValidJSON(jsonText.value);
            if (isValid) {
                socket.emit('render-request', {
                    json: jsonText.value,
                    width: canvas.width,
                    height: canvas.height
                });
            }
            setStatus('progress');
        });
    }
    generate.addEventListener('click', function() {
        var generatedScene = ThreeJSRenderer.generateScene();
        jsonText.value = JSON.stringify(generatedScene.toJSON());
    });

    /*
        Register socket event listeners
    */
    socket.on('num-connected', function (numConnected) {
        // hide until it is populated with content (numConnected)
        if (connectionTicker.hidden) {
            connectionTicker.hidden = false;
        }
        numConnections.innerHTML = numConnected;
    });
    socket.on('render-job', function (job) {
        console.log('I got a job to do!');
        
        var worker = new Worker('scripts/rayTraceWorker.js');
        
        worker.onmessage = function (result) {
            switch (result.data.type) {
                case 'progress':
                    socket.emit('worker-progress', result.data.percentage);
                    progressStatus.style.width = result.data.percentage + '%';
                    break;
                case 'result':
                    console.log('Worker is done!');
                    socket.emit('worker-done', result.data); 
                    break;
                default:
                    console.error('invalid worker message type', result.data.type);
            }          
        };
        worker.onerror = function (error) {
            console.log('Worker Error:', error);
        };

        // Start the worker
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

        setStatus('rendered');
    });
});