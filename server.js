var express = require('express');

var http = require('http');
var path = require('path');

var ConnectionManager = require('./lib/connectionManager');
var RenderWorkManager = require('./lib/renderWorkManager').create();
// var RenderJobManager = require('./lib/renderJobManager').create();
var Helpers = require('./shared/helpers');

var port = process.env.PORT || 3000;

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);

// Setup static routes
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'shared')));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

io.on('connection', function (socket) {
    if (ConnectionManager.addConnection(socket)) {
        console.log('A user connected to the network', ConnectionManager.getNumConnections());
        io.emit('num-connected', ConnectionManager.getNumConnections());
    }
    
    // RenderJobManager.addWorker(socket.id);

    socket.on('disconnect', function () {
        ConnectionManager.removeConnection(socket);
        // RenderJobManager.removeWorker(socket.id);
        RenderWorkManager.removeWorker(socket.id);
        io.emit('num-connected', ConnectionManager.getNumConnections());
        console.log('A user disconnected', ConnectionManager.getNumConnections());
    });

    socket.on('render-request', function (job) {
        console.log('Added render job');
        RenderWorkManager.addJob(Helpers.extend(job, {
            socketId: socket.id
        }));
    });
    socket.on('worker-progress', function (percentComplete) {
        RenderWorkManager.emit('worker-progress', {
            socketId: socket.id,
            percentComplete: percentComplete
        });
    });
    socket.on('worker-done', function (result) {
        console.log('A worker has completed its job');
        RenderWorkManager.emit('worker-done', Helpers.extend(result, {
            socketId: socket.id
        }));
    });
});

RenderWorkManager.on('render-progress', function (socketId, progress) {
});
RenderWorkManager.on('render-complete', function (socketId, jobResult) {
    io.to(socketId).emit('render-complete', jobResult);
});

server.listen(port, function () {
    console.log('Server started on port:', port);
});