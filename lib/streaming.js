// This file contains remnant code, that may be useful later to reference

    var dataStreams = [];
var connectionsWorking = false;
var missingChunk = null;
    
    ss(socket).on('stream-data', function (stream, msg) {
        console.log('Received streamed image data');
        console.log('Took ', new Date().getTime() - msg.timestamp, 'milliseconds');
        var numChunks = 0;
        var start = null;
        var offset = 0;
        stream.on('data', function (imageChunk) {
            console.log('Received chunk', ++numChunks, imageChunk.length);
            var freeConnection = ConnectionManager.findFreeConnection();
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