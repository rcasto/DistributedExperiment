var EventEmitter = require('events').EventEmitter;
var util = require('util');

function RenderJobManager() {
    this.inactiveWorkers = [];
}
RenderJobManager.prototype.addWorker = function (socketId) {
    this.inactiveWorkers.push(socketId);
    console.log('Worker added:', this.inactiveWorkers.length);
};
RenderJobManager.prototype.removeWorker = function (socketId) {
    var index = this.inactiveWorkers.indexOf(socketId);
    if (index > -1) {
        this.inactiveWorkers.splice(index, 1);
    }
    console.log('Worker removed:', this.inactiveWorkers.length);
};
util.inherits(RenderWorkManager, EventEmitter);

function create() {
    return new RenderJobManager();
}

module.exports = {
    create: create
};