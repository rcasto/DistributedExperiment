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

    this.on('worker-done', function (socket, job) {
        var connection = ConnectionManager.getConnection(socket);
        var nextChunk = this.currentJobIterator && this.currentJobIterator.next();
        if (nextChunk && !nextChunk.done) {
            workers[workerIndex].socket.emit('worker-job', Helpers.extend(nextChunk.value, job));
        } else {
            this.isWorking = false;
            this.emit('render-complete', socket, this.currentJob);
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

    manager.currentJobIterator = makeChunkIterator(job.width, job.height, numWorkers);
    var jobChunk = manager.currentJobIterator.next();

    manager.isWorking = true;

    for (var workerIndex = 0; (workerIndex < numWorkers) && !jobChunk.done; workerIndex++) {
        workers[workerIndex].socket.emit('worker-job', Helpers.extend(jobChunk.value, job));
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
                    y: y
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

module.exports = {
    initialize: initialize
};