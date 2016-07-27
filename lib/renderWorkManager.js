var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ConnectionManager = require('./connectionManager');
var Helpers = require('./util/helpers');

var manager = null;

function RenderWorkManager() {
    this.renderQueue = [];
    this.isWorking = false;
    this.isStarted = true;

    this.on('worker-done', function (work) {
        console.log('A worker is done now');
    });
}
RenderWorkManager.prototype.add = function (job) {
    this.renderQueue.push(job);
    if (this.isStarted && !this.isWorking) {
        work(this);
    }
};
RenderWorkManager.prototype.start = function () {
    this.isStarted = true;
    if (this.renderQueue.length > 0 && !this.isWorking) {
        this.isWorking = true;
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
    var jobChunkIterator = makeChunkIterator(job.width, job.height, ConnectionManager.getNumConnections());
    var jobChunk = jobChunkIterator.next();
    while (!jobChunk.done) {
        var freeWorker = ConnectionManager.findFreeConnection();
        if (freeWorker) {
            freeWorker.socket.emit('worker-job', Helpers.extend(jobChunk.value, job));
        }
        jobChunk = jobChunkIterator.next();
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