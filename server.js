var express = require('express');
var http = require('http');
var path = require('path');
var ss = require('socket.io-stream');

var port = process.env.PORT || 3000;

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);

var connections = [];

// Setup static routes
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

io.on('connection', function (socket) {
    console.log('A user connected to the network');

    // Add the new connection.  TODO: need to remove on disconnect
    connections.push();

    socket.on('disconnect', function () {
        console.log('A user disconnected');
    });
    // Method 1
    socket.on('whole-data', function (msg) {
        console.log('Received whole image data');
        console.log('Took ', new Date().getTime() - msg.timestamp);
        console.log(typeof msg.data);
    });
    // Method 2
    ss(socket).on('stream-data', function (stream, msg) {
        console.log('Received streamed image data');
        console.log('Took ', new Date().getTime() - msg.timestamp);
    });
});

server.listen(port, function () {
    console.log('Server started on port:', port);
});