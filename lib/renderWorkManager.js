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

    this.on('worker-done', function (result) {
        var connection = ConnectionManager.getConnection({
            id: result.socket.id
        });

        console.log("Merging chunk");
        mergeChunk(result.y, result.x, result.height, result.width, this.currentJob.width, this.currentJob.height, result.chunk, result.textureLength);

        this.jobMap.delete(result.socket.id);
        var worker = this.activeWorkers.get(result.socket.id);
        setWorkerToInactive(this, worker);

        // If no workers are active then rendering is complete and there is no unfinished work
        if (this.activeWorkers.size === 0 && this.unfinishedWork.length === 0) {
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
            
            if (this.renderQueue.length !== 0) {
                // Kick off the next job
                work(this);
            }
        } else {
            // Otherwise check if there is any work to do
            if (this.unfinishedWork.length > 0) {
                worker = this.inactiveWorkers.shift();
                var job = this.unfinishedWork.shift();
                worker.socket.emit('worker-job', job.value);
                setWorkerToActive(this, worker, job);
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

RenderWorkManager.prototype.removeWorker = function(socket) {
    if (this.activeWorkers.has(socket.id) === true) {
        
        // Get the chunk the worker was currently working on
        var job = this.jobMap.get(socket.id);
        this.unfinishedWork.push(job);
        
        // This worker got fired
        this.jobMap.delete(socket.id);
        this.activeWorkers.delete(socket.id);
    } else {
        var index = this.inactiveWorkers.findIndex(function(element, index, array) {
            if (element.socket.id === socket.id) {
                return true;
            }

            return false;
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
    manager.activeWorkers.set(worker.socket.id, worker);
}

// Remove the worker from the active list and place on the inactive workers list
function setWorkerToInactive(manager, worker) {
    manager.inactiveWorkers.push(worker);
    manager.activeWorkers.delete(worker.socket.id);
}

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

    manager.inactiveWorkers = [];

    manager.currentJob = manager.renderQueue.shift();
    manager.currentJobIterator = makeChunkIterator(manager.currentJob.width, manager.currentJob.height, manager.currentJob.json, numWorkers);
    manager.isWorking = true;

    var jobChunk = manager.currentJobIterator.next();
    for (var workerIndex = 0; (workerIndex < numWorkers) && !jobChunk.done; workerIndex++) {
        workers[workerIndex].socket.emit('worker-job', jobChunk.value);
        workers[workerIndex].isBusy = true;

        setWorkerToActive(manager, workers[workerIndex], jobChunk);

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