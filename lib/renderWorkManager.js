var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ConnectionManager = require('./connectionManager');
var Helpers = require('./util/helpers');

var manager = null;

function RenderWorkManager() {
    this.renderQueue = [];
    this.isWorking = false;
    this.activeWorkers = 0;

    this.currentJobIterator = null;
    this.currentJob = null;
    this.currentResult = null;

    this.on('worker-done', function (result) {
        var connection = ConnectionManager.getConnection({
            id: result.socketId
        });

        console.log("Merging chunk");
        mergeChunk(result.y, result.x, result.height, result.width, this.currentJob.width, this.currentJob.height, result.chunk, result.textureLength)

        var nextChunk = this.currentJobIterator && this.currentJobIterator.next();
        if (nextChunk) {
            if (nextChunk.done) {
                manager.activeWorkers--;

                if (manager.activeWorkers <= 0) {
                    console.log("Render complete!");
                    var workers = ConnectionManager.getConnections();
                    var numWorkers = ConnectionManager.getNumConnections();
                    var result = {
                        width: manager.currentJob.width,
                        height: manager.currentJob.height,
                        frame: manager.currentResult
                    };

                    // Send the result to all workers
                    for (var workerIndex = 0; workerIndex < numWorkers; workerIndex++) {
                        workers[workerIndex].socket.emit('render-complete', result);
                    }

                    this.isWorking = false;
                    this.currentJobIterator = null;
                    this.currentJob = null;
                    this.currentResult = null;
                    this.activeWorkers = 0;
                    
                    if (this.renderQueue.length !== 0) {
                        work(this);
                    }
                }
            } else {
                workers[workerIndex].socket.emit('worker-job', 
                    Helpers.extend(nextChunk.value, this.currentJob));
            }
        }
    }.bind(this));
}
RenderWorkManager.prototype.add = function (job) {
    this.renderQueue.push(job);
    if (!this.isWorking) {
        work(this);
    }
};
util.inherits(RenderWorkManager, EventEmitter);

// singleton - only have one manager
function initialize() {
    if (!manager) {
        manager = new RenderWorkManager();
    }
    return manager;
}

function work(manager) {
    var workers = ConnectionManager.getConnections();
    var numWorkers = ConnectionManager.getNumConnections();

    manager.currentJob = manager.renderQueue.shift();
    manager.currentJobIterator = makeChunkIterator(manager.currentJob.width, manager.currentJob.height, manager.currentJob.json, numWorkers);
    manager.isWorking = true;

    var jobChunk = manager.currentJobIterator.next();
    for (var workerIndex = 0; (workerIndex < numWorkers) && !jobChunk.done; workerIndex++) {
        workers[workerIndex].socket.emit('worker-job', jobChunk.value);
        workers[workerIndex].isBusy = true;
        jobChunk = manager.currentJobIterator.next();
        manager.activeWorkers++;
    }
}

function makeChunkIterator(width, height, scene, numChunks) {
    var x = 0, y = 0;
    var stepX = Math.trunc(width / numChunks);
    var stepY = Math.trunc(height / numChunks);
    return {
        next: function () {
            var value = null;
            if (x < width && y < height) {
                value = {
                    fullFrameWidth: width,
                    fullFrameHeight: height,
                    json: scene,
                    width: x + stepX,
                    height: height,
                    x: x,
                    y: y,
                    fullWidth: width,
                    fullHeight: height
                };
                x += stepX;
            }
            return {
                value: value,
                done: !value
            };
        }
    };
}

// Merges a chunk into the larger texture
function mergeChunk(bottom, left, top, right, fullWidth, fullHeight, array, arrayLength) {
    var length = arrayLength;
    if (array.length !== undefined) {
        length = array.length;
    }

    if (manager.currentResult === null) {
        // Create ray traced frame to merge into
        manager.currentResult = new Uint8Array(fullWidth * fullHeight * 4)
    }
    
    var width = right - left;
    var height = top - bottom;
    
    for (var j = 0; j < length; j += 4) {
        var x = ((j / 4) % width);
        var y = ((j / 4) - x) / width;
        var i = (((y + bottom) * fullWidth) + (x + left)) * 4;
        
        manager.currentResult[i] = array[j];
        manager.currentResult[i + 1] = array[j + 1];
        manager.currentResult[i + 2] = array[j + 2];
        manager.currentResult[i + 3] = array[j + 3];
    }
}

module.exports = {
    initialize: initialize
};