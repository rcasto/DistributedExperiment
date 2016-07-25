var ThreeJSRenderer = (function () {
    var scene, camera, renderer;
    var geometry, material;
 
    function renderLoop() {
        requestAnimationFrame(renderLoop);
        
        renderer.render(scene, camera)
    }

    // Initializes the renderer and starts the renderloop
    function initaliazeRenderer(width, height, canvas) {       
        // Create the scene that will only hold the quad 
        scene = new THREE.Scene();

        // Create a orthographic camera so the scene is not distorted by perspective
        camera = new THREE.OrthographicCamera( width / -2, width / 2, height / 2, height / -2, 1, 1000 );
        camera.position.z = 1

        // Create full screen quad
        var plane = new THREE.PlaneGeometry(width, height)
        material = new THREE.MeshBasicMaterial( { color: 0xFFFFFF, wireframe: false } );

        // Add the mesh to the scene
        mesh = new THREE.Mesh( plane, material );
        scene.add(mesh);

        // Create the renderer that will display the quad        
        renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: false});
        renderer.setSize( width, height );

        // Kick off the render loop
        renderLoop();
    }

    // Set a texture on the full screen quad from a url
    function setTextureFromurl(url) {
        var tex = new THREE.TextureLoader().load(url);
        mesh.material.map = tex;
        mesh.material.needsUpdate = true;
    }
    
    return {
        initaliazeRenderer: initaliazeRenderer,
        setTextureFromUrl: setTextureFromurl
    };
}());