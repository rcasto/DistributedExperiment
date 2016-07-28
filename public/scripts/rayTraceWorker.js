importScripts('raytracer.js', 'threeRenderer.js', '../three/build/three.min.js');

onmessage = function (job) {
    ThreeJSRenderer
        .parseJSON(job.data.json)
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

            // Initialize RayTracer
            var rayTracerStaticCamera = new THREE.PerspectiveCamera(90, job.data.fullFrameWidth / job.data.fullFrameHeight, 1, 1500);
            // rayTracerStaticCamera.position.x = 400;
            // rayTracerStaticCamera.position.y = 400;
            rayTracerStaticCamera.position.z = 400;
            RayTracer.setCamera(rayTracerStaticCamera);
            
            RayTracer.setConfig(3, 5);
            // RayTracer.setSkyColors(
            //     new THREE.Color(0xFFFFFF),
            //     new THREE.Color(0x000000)
            // );
            // Comment above color code out and use this to see each chunk in the final image
            RayTracer.setSkyColors(
                new THREE.Color(
                    Math.random(),
                    Math.random(),
                    Math.random()),
                new THREE.Color(
                    Math.random(),
                    Math.random(),
                    Math.random())
            );

            // Set the new scene
            RayTracer.setScene(world);
            var previousPercent = 0;
            var progress = function(percentComplete) { 
                if (percentComplete != previousPercent) {
                    console.log(percentComplete); 
                    previousPercent = percentComplete
                } 
            };

            var texture = RayTracer.render(job.data.y, job.data.x, job.data.height, job.data.width, job.data.fullFrameWidth, job.data.fullFrameHeight, progress);
            
            var result = {
                x: job.data.x,
                y: job.data.y,
                width: job.data.width,
                height: job.data.height,
                chunk: texture,
                textureLength: texture.length
            };

            postMessage(result);
            close();
        });
};