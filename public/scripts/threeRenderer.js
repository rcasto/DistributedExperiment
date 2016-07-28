var ThreeJSRenderer = (function () {

    // Initializes the renderer and starts the renderloop
    function initialize(canvas, width, height) {
        var scene, camera, renderer, mesh;

        // Use width and height of canvas, if no dimensions are passed in
        if (!width) {
            width = canvas.width;
        }
        if (!height) {
            height = canvas.height;
        }

        // Create the scene that will only hold the quad 
        scene = new THREE.Scene();

        // Create a orthographic camera so the scene is not distorted by perspective
        camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 1000);
        camera.position.z = 1

        // Create full screen quad
        var plane = new THREE.PlaneGeometry(width, height);
        var material = new THREE.MeshBasicMaterial({
             color: 0xFFFFFF, 
             wireframe: false 
        });
        mesh = new THREE.Mesh(plane, material);
        scene.add(mesh);

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
            try {
                resolve(loader.parse(JSON.parse(json)));
            } catch (error) {
                reject(error);
            }
        });
    }

    function generateScene() {
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
        return generatedScene;
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
        parseJSON: parseJSON,
        generateScene: generateScene
    };

}());