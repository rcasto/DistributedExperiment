var connections = {};
var numConnections = 0;

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

function getNumConnections() {
    return numConnections;
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

module.exports = {
    addConnection: addConnection,
    removeConnection: removeConnection,
    getNumConnections: getNumConnections,
    findFreeConnection: findFreeConnection
};