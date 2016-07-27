importScripts('raytracer.js', 'threeRenderer.js', '../three/build/three.min.js');

onmessage = function (job) {
    ThreeJSRenderer
        .parseJSON(job.data.world)
        .then(function (world) {
            var texture = RayTracer.render(job.data.x, job.data.y, job.data.height, 
                job.data.width, job.data.fullWidth, job.data.fullHeight);
        });
};