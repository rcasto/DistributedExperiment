var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ConnectionManager = require('./connectionManager');
var Helpers = require('./util/helpers');

var manager = null;
var fullImageTextureArray = null;
var fullWidth = 0;
var fullHeight = 0;

function RenderWorkManager() {
    this.renderQueue = [];
    this.isWorking = false;
    this.currentJobIterator = null;
    this.currentJob = null;

    this.on('worker-done', function (socket, job) {
        console.log("Merging chunk");
        mergeChunk(job.y, job.x, job.height, job.width, fullWidth, fullHeight, job.chunk, job.textureLength)

        var connection = ConnectionManager.getConnection(socket);
        var nextChunk = this.currentJobIterator && this.currentJobIterator.next();
        if (nextChunk && !nextChunk.done) {
            workers[workerIndex].socket.emit('worker-job', nextChunk.value);
        } else {
            this.isWorking = false;
            this.emit('render-complete', socket, {
                width: fullWidth,
                height: fullHeight,
                frame: fullImageTextureArray
            });
        }
    }.bind(this));
}
RenderWorkManager.prototype.add = function (job) {
    this.renderQueue.push(job);
    if (!this.isWorking) {
        work(this);
    }
};
RenderWorkManager.prototype.start = function () {
    if (this.renderQueue.length > 0 && !this.isWorking) {
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
    var job = manager.renderQueue[0];
    var workers = ConnectionManager.getConnections();
    var numWorkers = ConnectionManager.getNumConnections();
    
    // Create ray traced frame to merge into
    fullImageTextureArray = new Uint8Array(job.width * job.height * 4)
    fullWidth = job.width;
    fullHeight = job.height;

    manager.currentJobIterator = makeChunkIterator(job.width, job.height, job.json, numWorkers);
    var jobChunk = manager.currentJobIterator.next();

    manager.isWorking = true;

    for (var workerIndex = 0; (workerIndex < numWorkers) && !jobChunk.done; workerIndex++) {
        workers[workerIndex].socket.emit('worker-job', jobChunk.value);
        workers[workerIndex].isBusy = true;
        jobChunk = manager.currentJobIterator.next();
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
                    y: y
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
    
    var width = right - left;
    var height = top - bottom;
    
    for (var j = 0; j < length; j += 4) {
        var x = ((j / 4) % width);
        var y = ((j / 4) - x) / width;
        var i = (((y + bottom) * fullWidth) + (x + left)) * 4;
        
        fullImageTextureArray[i] = array[j];
        fullImageTextureArray[i + 1] = array[j + 1];
        fullImageTextureArray[i + 2] = array[j + 2];
        fullImageTextureArray[i + 3] = array[j + 3];
    }
}

module.exports = {
    initialize: initialize
};