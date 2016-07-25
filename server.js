var express = require('express');
var ss = require('socket.io-stream');

var http = require('http');
var path = require('path');

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

var connections = {};
var numConnections = 0;
var dataStreams = [];
var connectionsWorking = false;
var missingChunk = null;

function addConnection(socket) {
    if (!connections[socket.id]) {
        connections[socket.id] = {
            socket: socket,
            isBusy: false
        };
        numConnections++;
        return true;
    }
    return false;
}
function removeConnection(socket) {
    if (connections[socket.id]) {
        numConnections--;
        delete connections[socket.id];
        return true;
    }
    return false;
}
function findFreeConnection() {
    for (var id in connections) {
        if (!connections[id].isBusy) {
            connections[id].isBusy = true;
            return connections[id];
        }
    }
    return null;
}

io.on('connection', function (socket) {
    if (addConnection(socket)) {
        console.log('A user connected to the network', numConnections);
        io.emit('num-connected', numConnections);
    }

    socket.on('disconnect', function () {
        removeConnection(socket);
        io.emit('num-connected', numConnections);
        console.log('A user disconnected', numConnections);
    });
    // Method 1
    socket.on('whole-data', function (msg) {
        console.log('Received whole image data');
        console.log('Took ', new Date().getTime() - msg.timestamp);
        console.log('Is instanceof Uint8ClampedArray', 
            msg.data instanceof Uint8ClampedArray);
    });
    // Method 2
    ss(socket).on('stream-data', function (stream, msg) {
        console.log('Received streamed image data');
        console.log('Took ', new Date().getTime() - msg.timestamp, 'milliseconds');
        var numChunks = 0;
        var start = null;
        stream.on('data', function (imageChunk) {
            console.log('Received chunk', ++numChunks);
            var freeConnection = findFreeConnection();
            if (freeConnection) {
                start = new Date().getTime();
                freeConnection.socket.emit('image-chunk', imageChunk);
            } else {
                missingChunk = imageChunk;
                stream.pause();
            }
        });
        stream.on('end', function () {
            console.log('done reading image stream, took', 
                new Date().getTime() - start, 'milliseconds');
            numChunks = 0;
            dataStreams.shift();
            if (dataStreams.length > 0) {
                dataStreams[0].resume();
            } else {
                connectionsWorking = false;
            }
        });
        if (connectionsWorking) {
            stream.pause();
        } else {
            connectionsWorking = true;
        }
        dataStreams.push(stream);
    });
    socket.on('image-chunk-result', function (chunkResult) {
        console.log('Got chunk result');
        if (missingChunk) {
            socket.emit('image-chunk', missingChunk);
            missingChunk = null;
        } else {
            connections[socket.id].isBusy = false;
            if (dataStreams.length > 0 &&
                dataStreams[0].isPaused()) {
                dataStreams[0].resume();
            }
        }
    });
});

server.listen(port, function () {
    console.log('Server started on port:', port);
});