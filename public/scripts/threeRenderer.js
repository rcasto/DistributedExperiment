var ThreeJSRenderer = (function () {

    // Initializes the renderer and starts the renderloop
    function initialize(canvas, width, height) {
        var scene, camera, mesh, renderer;
        var geometry, material;

        // Use width and height of canvas, if no dimensions are passed in
        if (!width) {
            width = canvas.width;
        }
        if (!height) {
            height = canvas.height;
        }

        // Create the scene that will only hold the quad 
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(90, width / height, 1, 1500);
        camera.position.z = 400;

        // Create full screen quad
        geometry = new THREE.BoxGeometry(200, 200, 200);
        material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0, 255, 0), 
            reflectivity: 0.2, 
            wireframe: false
        });

        // Add the mesh to the scene
        mesh = new THREE.Mesh(geometry, material);

        mesh.rotateX(30 * (Math.PI / 180.0));
        mesh.updateMatrix();
        scene.add(mesh);

        RayTracer.setConfig(1, 1);
        RayTracer.setSkyColors(
            new THREE.Color(0xFFFFFF),
            new THREE.Color(0x000000)
        );
        RayTracer.setScene(scene);
        RayTracer.setCamera(camera);

        // Create the renderer that will display the quad        
        renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: false 
        });
        renderer.setSize(width, height);

        return (function () {
            var renderId = null;
            return {
                renderer: renderer,
                startRenderLoop: function () {
                    renderer.render(scene, camera)
                    renderId = requestAnimationFrame(this.startRenderLoop.bind(this));
                    return this;
                },
                stopRenderLoop: function () {
                    cancelAnimationFrame(renderId);
                    return this;
                },
                setTextureFromWorld: function (world) {
                    setTextureFromWorld(mesh, world, width, height);
                    return this;
                },
                setTextureFromUrl: function (url) {
                    setTextureFromUrl(mesh, url);
                    return this;
                },
                setTextureFromArray: function (array, width, height) {
                    setTextureFromArray(mesh, array, width, height);
                    return this;
                }
            };
        }());
    }

    function loadJSON(url) {
        return new Promise(function (resolve, reject) {
            var loader = new THREE.JSONLoader();
            loader.load(url, function (geometry, materials) {
                resolve({
                    geometry: geometry,
                    materials: materials
                });
            }, function () { }, function (error) {
                reject(error);
            });
        });
    }

    function parseJSON(json) {
        return new Promise(function (resolve, reject) {
            var loader = new THREE.ObjectLoader();
            resolve(loader.parse(JSON.parse(json)));
        });
    }

    function setTextureFromWorld(mesh, world, width, height) {
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
        var texture = RayTracer.render(0, 0, height, width, width, height);
        setTextureFromArray(mesh, texture, width, height);
    }

    // Set a texture on the full screen quad from a url
    function setTextureFromUrl(mesh, url) {
        mesh.material.map = new THREE.TextureLoader().load(url);;
        mesh.material.needsUpdate = true;
    }

    function setTextureFromArray(mesh, array, width, height) {
        mesh.material.map = new THREE.DataTexture(array, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
        mesh.material.map.needsUpdate = true;
        mesh.material.needsUpdate = true;
    }
    
    return {
        initialize: initialize,
        loadJSON: loadJSON,
        parseJSON: parseJSON
    };

}());