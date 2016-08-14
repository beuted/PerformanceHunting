'use strict';

var _ = require('lodash');

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

Server.app.post('/api/users/:username/move/:lat/:lng', (req, res) => {
    var coord = { lat: Number(req.params.lat), lng: Number(req.params.lng) };
    var locationObj = { type: 'coords', coords: { latitude: coord.lat, longitude: coord.lng } };

    var user = usersManager.getUser(req.params.username);
    if (user == undefined) {
        res.status(401).send({ 'message': 'Unknown user' });
        res.end();
        return;
    }

    user.move({ lat: coord.lat, lng: coord.lng }, (err, msg) => {
        if (err) {
            res.status(500).send({ 'message': err });
            res.end();
        } else {
            res.status(200).send(msg);
            res.end();
        }
    });
});

Server.app.get('/api/pokemons/:lat/:lng', (req, res) => {
    var coord = { lat: Number(req.params.lat), lng: Number(req.params.lng) };

    Server.elasticClient.search({
        index: 'pkmn',
        type: 'pokemons',
        body: {
            query: {
                "filtered": {
                  "query": {
                    "match_all": {}
                  },
                  "filter": {
                    "geo_distance": {
                      "distance": "3km",
                      "location": {
                        "lat": coord.lat,
                        "lon": coord.lng
                      }
                    }
                  }
                }
            }
        }
    }, (err, resp) => {
        if (err) {
            res.status(500).send({ 'message': 'Internal server error' });
            res.end();
            return;
        }

        var result = _.map(resp.hits.hits, (hit) => {
            return {id: hit._id, ttl: hit._ttl, name: hit._source.name, typeId: hit._source.typeId, location: { lat: hit._source.location.lat, lng: hit._source.location.lon } }
        });

        res.status(200).send(result);
        res.end();
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


