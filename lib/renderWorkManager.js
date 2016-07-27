var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ConnectionManager = require('./connectionManager');
var Helpers = require('./util/helpers');

var manager = null;

function RenderWorkManager() {
    this.renderQueue = [];
    this.isWorking = false;

    this.currentJobIterator = null;
    this.currentJob = null;
    this.currentResult = null;

    this.on('worker-done', function (result) {
        var connection = ConnectionManager.getConnection({
            id: result.socketId
        });
        var nextChunk = this.currentJobIterator && this.currentJobIterator.next();
        if (nextChunk) {
            if (nextChunk.done) {
                this.emit('render-complete', result.socketId, this.currentResult);
                if (this.renderQueue.length === 0) {
                    this.isWorking = false;
                    this.currentJobIterator = null;
                    this.currentJob = null;
                    this.currentResult = false;
                    connection.isBusy = false;
                } else {
                    work(this);
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
    manager.currentJobIterator = makeChunkIterator(manager.currentJob.width, manager.currentJob.height, numWorkers);
    manager.isWorking = true;

    var jobChunk = manager.currentJobIterator.next();
    for (var workerIndex = 0; (workerIndex < numWorkers) && !jobChunk.done; workerIndex++) {
        workers[workerIndex].socket.emit('worker-job', Helpers.extend(jobChunk.value, manager.currentJob));
        workers[workerIndex].isBusy = true;
        jobChunk = manager.currentJobIterator.next();
    }
}

function makeChunkIterator(width, height, numChunks) {
    var x = 0, y = 0;
    var stepX = width / numChunks;
    var stepY = height / numChunks;
    return {
        next: function () {
            var value = null;
            if (x < width && y < height) {
                value = {
                    width: stepX,
                    height: stepY,
                    x: x,
                    y: y,
                    fullWidth: width,
                    fullHeight: height
                };
                x += stepX;
                y += stepY;
            }
            return {
                value: value,
                done: !value
            };
        }
    };
}

// Merges a chunk into the larger texture
function mergeChunk(manager, bottom, left, top, right, fullWidth, fullHeight, array) {
    var width = right - left;
    var height = top - bottom;

    for (var j = 0; j < array.length; j += 4) {
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