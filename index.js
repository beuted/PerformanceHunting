'use strict';

var User = require('./server/user');
var UsersManager = require('./server/usersManager');
var AccountsManager = require('./server/accountsManager');
var Server = require('./server/server');
var config = require('./config');

// Init Server
Server.init();

// Pokemon api logic
var usersManager = new UsersManager();
var accountsManager = new AccountsManager();

// Routing
Server.app.post('/api/login', (req, res) => {
    var json = req.body;

    if (accountsManager.getAccount(json.username)) {
        res.status(401).send({ 'message': 'User already logged' });
        res.end();
        return
    }

    //TODO(b.jehanno): First two chars are always /# that could have to do with rooms of socket.io
    var user = usersManager.addUser(new User(
        json.username,
        '/#' + json.socketId,
        config.DEFAULT_LOCATION,
        accountsManager
    ));

    user.assignAccount((errorMsg, location) => {
        if (!errorMsg) {
            res.status(200).send(location);
        } else {
            res.status(400).send({ 'message': errorMsg });
        }
        res.end();
    });
});

Server.app.post('/api/move', (req, res) => {
    var json = req.body;
    var locationObj = { type: 'coords', coords: { latitude: json.location.lat, longitude: json.location.lng } };

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
            console.log(`[i] Log-out with user: ${user.username}`);
            usersManager.removeUser(user.username);
        } else {
            console.error(`[error] User could not be disconnected, socketid: ${socket.id}`);
        }
    });
});


