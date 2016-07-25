var express = require('express');
var ss = require('socket.io-stream');

var http = require('http');
var path = require('path');

var ConnectionManager = require('./lib/connectionManager');

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

var dataStreams = [];
var connectionsWorking = false;
var missingChunk = null;

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

    ss(socket).on('stream-data', function (stream, msg) {
        console.log('Received streamed image data');
        console.log('Took ', new Date().getTime() - msg.timestamp, 'milliseconds');
        var numChunks = 0;
        var start = null;
        var offset = 0;
        stream.on('data', function (imageChunk) {
            console.log('Received chunk', ++numChunks, imageChunk.length);
            var freeConnection = findFreeConnection();
            var chunkObj = {
                chunkData: imageChunk,
                offset: offset
            };
            if (freeConnection) {
                start = new Date().getTime();
                freeConnection.socket.emit('image-chunk', chunkObj);
            } else {
                missingChunk = chunkObj;
                stream.pause();
            }
            offset += imageChunk.length;
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
    
    // socket.on('image-chunk-result', function (chunkResult) {
    //     console.log('Got chunk result');
    //     if (missingChunk) {
    //         socket.emit('image-chunk', missingChunk);
    //         missingChunk = null;
    //     } else {
    //         connections[socket.id].isBusy = false;
    //         if (dataStreams.length > 0 &&
    //             dataStreams[0].isPaused()) {
    //             dataStreams[0].resume();
    //         }
    //     }
    // });
});

server.listen(port, function () {
    console.log('Server started on port:', port);
});