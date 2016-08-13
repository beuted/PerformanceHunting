'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var PokemonGO = require('pokemon-go-node-api')
var _ = require('lodash');

var User = require('./server/user');
var UsersManager = require('./server/usersManager');
var Server = require('./server/server');

var app = express();
var port = process.env.PORT || 3000;
var config = require('./config');

// Serve static files
app.use(express.static('public'));
// To support JSON-encoded bodies
app.use(bodyParser.json());


var server = app.listen(port, function() {
    console.log('performance-hunting is running at localhost:' + port);
});

var io = require('socket.io').listen(server);

Server.init(io);


// Configuration variables
var provider = process.env.PGO_PROVIDER || config.PGO_PROVIDER;


// Routing
app.post('/api/login', (req, res) => {
    var json = req.body;
    var locationObj = config.DEFAULT_LOCATION;
    if (json.location && json.location.length)
        locationObj = { type: 'name', name: json.location };

    watchPokemonsInZone(json.username, json.password, locationObj, provider, json.socketId, function(successMsg, errorMsg) {
        if (!errorMsg) {
            res.status(200).send(successMsg);
        } else {
            res.status(401).send({ 'message': errorMsg });
        }
        res.end();
    });
});

app.post('/api/move', (req, res) => {
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
io.sockets.on('connection', socket => {
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

// Pokemon api logic
var usersManager = new UsersManager();

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

    // pokeio.init(username, password, location, provider, function(err) {
    //     if (err) {
    //         var errorMsg = `[error] Unable to connect with: (${username}, ${password}, ${provider}, sId: ${socketId}) at "${location.name}"`;
    //         console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
    //         callback(null, errorMsg);
    //         return;
    //     }

    //     console.log('[i] Current location: ' + pokeio.playerInfo.locationName);
    //     console.log('[i] lat/long/alt: : ' + pokeio.playerInfo.latitude + ' ' + pokeio.playerInfo.longitude + ' ' + pokeio.playerInfo.altitude);

    //     callback({ position: { lat: pokeio.playerInfo.latitude, lng: pokeio.playerInfo.longitude } }, null);

        

    //     usersManager.getUser(username).setHeartbeatId(heartbeatId)
    // });
}


