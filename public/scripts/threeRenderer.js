var ThreeJSRenderer = (function () {

    // Initializes the renderer and starts the renderloop
    function initialize(canvas, width, height) {
        var scene, camera, renderer;
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

        // Create a orthographic camera so the scene is not distorted by perspective
        camera = new THREE.OrthographicCamera( width / -2, width / 2, height / 2, height / -2, 1, 1000 );
        camera.position.z = 1

        // Create full screen quad
        var plane = new THREE.PlaneGeometry(width, height)
        material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, wireframe: false });

        // Add the mesh to the scene
        mesh = new THREE.Mesh( plane, material );
        scene.add(mesh);

        // Create the renderer that will display the quad        
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
        renderer.setSize( width, height );

        return {
            renderer: renderer,
            startRenderLoop: function () {
                var renderId = null;
                (function renderLoop() {
                    renderer.render(scene, camera)
                    renderId = requestAnimationFrame(renderLoop);
                }());
            },
            stopRenderLoop: function () {
                cancelAnimationFrame(renderId);
            },
            setTextureFromUrl: function (url) {
                setTextureFromUrl(mesh, url);
                return this;
            },
            setTextureFromArray: function (array, width, height) {
                setTextureFromArray(mesh, array, width, height);
                return this;
            }
        }
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
        initialize: initialize
    };
}());