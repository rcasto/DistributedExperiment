var express = require('express');
var http = require('http');
var path = require('path');

var port = process.env.PORT || 3000;

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);

var connections = [];

// Setup static routes
app.use(express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(__dirname));

app.get('/', function (req, res) {
    res.sendFile('index.html');
});

io.on('connection', function (socket) {
    console.log('A user connected to the network');

    connections.push();

    socket.on('disconnect', function () {
        console.log('A user disconnected');
    });
    socket.on('split-data', function (msg) {
        console.log('Received image data');
        console.log('Took ', new Date().getTime() - msg.timestamp);
    });
});

server.listen(port, function () {
    console.log('Server started on port:', port);
});