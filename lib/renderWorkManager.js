var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ConnectionManager = require('./connectionManager');
var Helpers = require('../shared/helpers');

var manager = null;

function RenderWorkManager() {
    this.renderQueue = [];
    this.isWorking = false;

    this.currentJobIterator = null;
    this.currentJob = null;
    this.currentResult = null;

    this.jobMap = new Map();
    this.unfinishedWork = [];
    this.activeWorkers = new Map();
    this.inactiveWorkers = [];

    this.on('worker-progress', function (progress) {
        var worker = this.activeWorkers.get(progress.socketId);
        if (worker) {
            worker.percentComplete = progress.percentComplete;
        }
    });

    this.on('worker-done', function (result) {
        var connection = ConnectionManager.getConnection({
            id: result.socketId
        });

        console.log("Merging worker chunk");
        mergeChunk(result.y, result.x, result.height, result.width, this.currentJob.width, this.currentJob.height, result.chunk, result.textureLength);
        console.log("Remainging work: " + this.unfinishedWork.length);

        this.jobMap.delete(result.socketId);
        var worker = this.activeWorkers.get(result.socketId);
        setWorkerToInactive(this, worker);

        // If no workers are active then rendering is complete and there is no unfinished work
        if (this.activeWorkers.size === 0 && this.unfinishedWork.length === 0) {
            var workers = ConnectionManager.getConnections();
            var numWorkers = ConnectionManager.getNumConnections();
            var result = {
                width: manager.currentJob.width,
                height: manager.currentJob.height,
                frame: manager.currentResult
            };

            // Send the result to the worker whom requested the job
            connection = ConnectionManager.getConnection({
                id: this.currentJob.socketId
            });

            if (connection !== undefined) {
                console.log("Render complete! Sending to client now...");
                connection.socket.emit('render-complete', result);
            }

            this.isWorking = false;
            this.currentJobIterator = null;
            this.currentJob = null;
            this.currentResult = null;
            
            if (this.renderQueue.length !== 0) {
                // Kick off the next job
                work(this);
            }
        } else {
            // Otherwise check if there is any work to do
            if (this.unfinishedWork.length > 0) {
                worker = this.inactiveWorkers.shift();
                var job = this.unfinishedWork.shift();
                worker.socket.emit('render-job', job.value);
                setWorkerToActive(this, worker, job);
            }
        }
    }.bind(this));
}
RenderWorkManager.prototype.addJob = function (job) {
    this.renderQueue.push(Helpers.extend(job, {
        percentComplete: 0
    }));
    if (!this.isWorking) {
        work(this);
    }
};

RenderWorkManager.prototype.removeWorker = function(socketId) {
    if (this.activeWorkers.has(socketId)) {
        // Get the chunk the worker was currently working on
        var job = this.jobMap.get(socketId);
        this.unfinishedWork.push(job);
        
        // This worker got fired
        this.jobMap.delete(socketId);
        this.activeWorkers.delete(socketId);
    } else {
        var index = this.inactiveWorkers.findIndex(function(element, index, array) {
            return element.socket.id === socketId;
        });

        if (index !== -1) {
            // Fire this lazy worker
            this.inactiveWorkers.splice(index, 1);
        }
    }
};
util.inherits(RenderWorkManager, EventEmitter);

// Adds the job to the job map and the worker to the active workers
function setWorkerToActive(manager, worker, job) {
    manager.jobMap.set(worker.socket.id, job);
    manager.activeWorkers.set(worker.socket.id, Helpers.extend(worker, {
        percentComplete: 0
    }));
}

// Remove the worker from the active list and place on the inactive workers list
function setWorkerToInactive(manager, worker) {
    manager.inactiveWorkers.push(worker);
    manager.activeWorkers.delete(worker.socket.id);
}

// singleton - only have one manager
function create() {
    if (!manager) {
        manager = new RenderWorkManager();
    }
    return manager;
}

function work(manager) {
    var workers = ConnectionManager.getConnections();
    var numWorkers = ConnectionManager.getNumConnections();

    manager.inactiveWorkers = [];

    manager.currentJob = manager.renderQueue.shift();
    manager.currentJobIterator = makeChunkIterator(manager.currentJob.width, manager.currentJob.height, manager.currentJob.json, numWorkers);
    manager.isWorking = true;

    createWorkChunks(manager, manager.currentJob.width, manager.currentJob.height, 100, 100, manager.currentJob.json);

    for (var workerIndex = 0; workerIndex < numWorkers; workerIndex++) {
        var job = manager.unfinishedWork.shift();
        workers[workerIndex].socket.emit('render-job', job.value);
        setWorkerToActive(manager, workers[workerIndex], job);
    }
}

function createWorkChunks(manager, imageWidth, imageHeight, chunkWidth, chunkHeight, scene) {
    var numRows = Math.ceil(imageHeight / chunkHeight);
    var numCols = Math.ceil(imageWidth / chunkWidth);
    var x = 0;
    var y = 0;

    for (var row = 0; row < numRows; row++) {
        x = 0;
        for (var col = 0; col < numCols; col++) {
            jobChunk = {
                fullFrameHeight: imageHeight,
                fullFrameWidth: imageWidth,
                fullWidth: imageWidth,
                fullHeight: imageHeight,
                x: x,
                y: y,
                width: x + chunkWidth,
                height: y + chunkHeight,
                json: scene
            }

            if (jobChunk.width > imageWidth) { 
                jobChunk.width = imageWidth;
            }

            if (jobChunk.height > imageHeight) {
                jobChunk.height = imageHeight;
            }

            x += chunkWidth;

            manager.unfinishedWork.push({
                value: jobChunk});
        }

        y += chunkHeight;
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
    create: create
};