'use strict';

var User = require('./server/user');
var UsersManager = require('./server/usersManager');
var Server = require('./server/server');
var config = require('./config');

// Init Server
Server.init();

// Pokemon api logic
var usersManager = new UsersManager();

// Routing
Server.app.post('/api/login', (req, res) => {
    var json = req.body;
    var locationObj = config.DEFAULT_LOCATION;
    if (json.location && json.location.length)
        locationObj = { type: 'name', name: json.location };

    watchPokemonsInZone(json.username, json.password, locationObj, config.PGO_PROVIDER, json.socketId, function(successMsg, errorMsg) {
        if (!errorMsg) {
            res.status(200).send(successMsg);
        } else {
            res.status(401).send({ 'message': errorMsg });
        }
        res.end();
    });
});

Server.app.post('/api/move', (req, res) => {
    var json = req.body;
    var locationObj = { type: 'coords', coords: { latitude: json.location.lat, longitude: json.location.lng} };

    var user = usersManager.getUser(json.username);
    if (user == undefined) {
        res.status(401).send({ 'message': 'Unknown user' });
        res.end();
        return;
    }

    user.move(json.location, (err, msg) => {
        if (err) {
            res.status(500).send({ 'message': err });
            res.end();
        } else {
            res.status(200).send(msg);
            res.end();
        }
    });
});

// Web Sockets
Server.io.sockets.on('connection', socket => {
    console.log(`[s] Client connected: ${socket.id}`);

    socket.on('disconnect', function() {
        console.log(`[s] Client disconnected: ${socket.id}`);

        var user = usersManager.getUserBySocketId(socket.id);
        if (user) {
            console.log(`[i] Log-out with user: ${username}`);
            usersManager.removeUser(user.username);
        } else {
            console.error(`[error] User could not be disconnected, socketid: ${socket.id}`);
        }
    });
});

var watchPokemonsInZone = function(username, password, location, provider, socketId, callback) {
    //TODO(b.jehanno): First two chars are always /# that could have to do with rooms of socket.io
    var user = usersManager.addUser(new User(
        username,
        password,
        '/#' + socketId,
        { lat: location.coords.latitude, lng: location.coords.longitude }
    ));

    user.login((err, msg) => {
        if (err) {
            callback(null, err);
            return;
        }

        callback(msg, null);

        user.initScan();
    });
}


