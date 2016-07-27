var RayTracer = (function () {
    var config, scene, camera, skyColorTop, skyColorBottom;

    function setCamera(threeJsCamera) {
        camera = threeJsCamera;
    }

    function setScene(threeJsScene) {
        scene = threeJsScene;
    }

    function setConfig(maxBounces, maxAntialiasRays) {
        config = {
            maxBounces: maxBounces,
            maxAntialiasRays: maxAntialiasRays
        };
    }

    function setSkyColors(top, bottom) {
        skyColorTop = new THREE.Vector3(top.r, top.g, top.b);
        skyColorBottom = new THREE.Vector3(bottom.r, bottom.g, bottom.b);
    }

    // Render a rectangle of the image.  NOTE: origin is in lower left of image
    function render(bottom, left, top, right, fullWidth, fullHeight) {
        var width = right - left;
        var height = top - bottom;
        var size = width * height * 4;
        var cameraInfo = calculateCameraProperties();
 
        // Create an array based on the rectangle passed in
        var imageData = new Uint8Array(size);
        
        // Render scanlines recursivly
        for (var i = 0; i < size; i += 4) {
            var x = ((i / 4) % width) + left;
            var y = (((i / 4) - x) / width) + bottom;
            
            var red = 0.0;
            var green = 0.0;
            var blue = 0.0;

            // Average the colors for antialiasing
            for (var j = 0; j < config.maxAntialiasRays; j++) {
                var u = (x + Math.random()) / fullWidth;
                var v = (y + Math.random()) / fullHeight;
                
                var dir = cameraInfo.lowerLeft.clone();
                dir = dir.add(cameraInfo.imagePlaneHorizontal.clone().multiplyScalar(u));
                dir = dir.add(cameraInfo.imagePlaneVertical.clone().multiplyScalar(v));
                dir = dir.sub(camera.position).normalize();

                // Calculate initial ray
                var ray = new THREE.Ray(
                    camera.position, 
                    dir);

                // Get the color for this pixel
                var aliasColor = renderRecursive(ray, 0);
                red += aliasColor.r;
                green += aliasColor.g;
                blue += aliasColor.b;
            }

            red /= config.maxAntialiasRays;
            green /= config.maxAntialiasRays;
            blue /= config.maxAntialiasRays;
            
            // Array is in RGBA format
            imageData[i] = Math.trunc(red);
            imageData[i + 1] = Math.trunc(green);
            imageData[i + 2] = Math.trunc(blue);
            imageData[i + 3] = 255;
        }

        // Return the rendered array
        return imageData;
    }

    function renderRecursive(ray, bounces) {
        if (bounces < config.maxBounces) {
            // Check if the ray collides with anything
            var collision = testCollision(ray);

            // if yes get color from that object
            if (collision !== null) {
                // Compute reflection vector
                var nDotD = ray.direction.dot(collision.normal);
                var reflectionVector = ray.direction.clone().sub(collision.normal.clone().multiplyScalar(2.0 * nDotD)).normalize();

                // Shoot the reflected ray into the world
                var reflectedColor = renderRecursive(new THREE.Ray(collision.point, reflectionVector), bounces + 1);

                // Final color = reflectivity * bouncedColor + (1.0 - reflectivity) * objectColor
                return collision.object.material.color.clone().multiplyScalar(1.0 - collision.object.material.reflectivity).add(reflectedColor.multiplyScalar(collision.object.material.reflectivity));
            }
        }

        // Calculate the color based on the sky colors
        var t = 0.5 * (ray.direction.y + 1.0);
        var skyColor = new THREE.Vector3(0,0,0).lerpVectors(skyColorBottom, skyColorTop, t);
        return new THREE.Color(Math.trunc(skyColor.x * 255), Math.trunc(skyColor.y * 255), Math.trunc(skyColor.z * 255));        
    }

    function calculateCameraProperties() {
        var theta = camera.fov * (Math.PI / 180.0);
        var halfHeight = Math.tan(theta / 2.0)
        var halfWidth = camera.aspect * halfHeight;
        var upVec = new THREE.Vector3(0, 1, 0); 
        var w = camera.getWorldDirection();
        var u = upVec.clone().cross(w).normalize();
        var v = w.clone().cross(u).normalize();//u.clone().cross(w).normalize();

        return {
            imagePlaneVertical: v.clone().multiplyScalar(2.0 * halfHeight),
            imagePlaneHorizontal: u.clone().multiplyScalar(-2.0 * halfWidth),
            lowerLeft: camera.position.clone().sub(v.multiplyScalar(halfHeight)).sub(u.multiplyScalar(-halfWidth)).add(w)
        };
    }
    
    function testCollision(ray) {
        var bestT = Infinity
        var bestRecord = null;

        scene.traverseVisible(
            function(object) {
                if (object instanceof THREE.Mesh) {
                   // Get the world matrix from the object to transform the geometry
                   var worldMtx = object.matrix

                   // Get the triangles to test intersection on
                   var triangleArray = object.geometry.faces;
                   var vertArray = object.geometry.vertices;

                   // For each triangle 
                   for (var i = 0; i < triangleArray.length; i++) {
                       // Check for intersection with the triangle
                       var record = rayTriangleIntersection(
                           ray, 
                           vertArray[triangleArray[i].a].clone().applyMatrix4(worldMtx),
                           vertArray[triangleArray[i].b].clone().applyMatrix4(worldMtx),
                           vertArray[triangleArray[i].c].clone().applyMatrix4(worldMtx),
                           0.001,
                           bestT);

                       // Since record already check if the t value found was better than the previous one we don't need a check here
                       if (record !== null) {
                           bestRecord = record;
                           bestRecord.normal = triangleArray[i].normal.clone().applyMatrix4(worldMtx);
                           bestRecord.object = object;
                           bestT = bestRecord.collisionT;
                       }
                   }
                }
            }
        );

        return bestRecord;
    }

    function rayTriangleIntersection(ray, p0, p1, p2, tMin, tMax) {
        var edge1 = p1.clone().sub(p0);
        var edge2 = p2.clone().sub(p0);

        var pVec = ray.direction.clone().cross(edge2);
        var det = pVec.dot(edge1);

        if (det < 0.0001) {
            return null;
        }

        var tVec = ray.origin.clone().sub(p0);
        var u = tVec.dot(pVec);

        if (u < 0.0 || u > det) {
            return null;
        }

        var qVec = tVec.clone().cross(edge1);
        var v = ray.direction.dot(qVec);
        
        if (v < 0.0 || (u + v) > det) {
            return null;
        }
        
        var inverseDet = 1.0 / det;
        var t = edge2.dot(qVec) * inverseDet;

        if (t > tMin && t < tMax) {
            return {
                collided: true,
                collisionT: t,
                point: ray.at(t)
            };
        }

        return null;
    }

    return {
        render: render,
        setCamera: setCamera,
        setScene: setScene,
        setSkyColors: setSkyColors,
        setConfig: setConfig
    };
}());