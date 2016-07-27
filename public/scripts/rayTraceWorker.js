importScripts('raytracer.js', 'threeRenderer.js');

onmessage = function (job) {
    ThreeJSRenderer
        .parseJSON(job.world)
        .then(function (world) {
            var texture = RayTracer.render(0, 0, height, width, width, height);
        });
};