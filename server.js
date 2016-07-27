var express = require('express');
var ss = require('socket.io-stream');

var http = require('http');
var path = require('path');

var ConnectionManager = require('./lib/connectionManager');
var RenderWorkManager = require('./lib/renderWorkManager').initialize();

var port = process.env.PORT || 3000;

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);

// Setup static routes
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

io.on('connection', function (socket) {
    if (ConnectionManager.addConnection(socket)) {
        console.log('A user connected to the network', ConnectionManager.getNumConnections());
        io.emit('num-connected', ConnectionManager.getNumConnections());
    }

    socket.on('disconnect', function () {
        ConnectionManager.removeConnection(socket);
        io.emit('num-connected', ConnectionManager.getNumConnections());
        console.log('A user disconnected', ConnectionManager.getNumConnections());
    });

    socket.on('render-world', function (job) {
        console.log('Added render job');
        RenderWorkManager.add(job);
    });
    socket.on('worker-done', function (result) {
        console.log('A worker has completed its job');
        RenderWorkManager.emit('worker-done', socket, result);
    });
});

RenderWorkManager.on('render-complete', function (socket, jobResult) {
    io.to(socket.id).emit('render-complete', jobResult);
});

server.listen(port, function () {
    console.log('Server started on port:', port);
});