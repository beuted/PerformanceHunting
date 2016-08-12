var express = require('express');
var bodyParser = require('body-parser');
var PokemonGO = require('pokemon-go-node-api')
var _ = require('lodash');

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


// Configuration variables
var provider = process.env.PGO_PROVIDER || config.PGO_PROVIDER;
var defaultLocationObj = { type: 'coords', coords: { latitude: 48.877330, longitude: 2.335000 } };


// Routing
app.post('/api/login', (req, res) => {
    var json = req.body;
    var locationObj = defaultLocationObj;
    if (json.location && json.location.length)
        locationObj = { type: 'name', name: json.location || '9 rue de rochechouart' };

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

    var user = loggedUsers[json.username];
    if (user == undefined) {
        res.status(401).send({ 'message': 'Unknown user' });
        res.end();
        return;
    }

    user.pokeio.SetLocation(locationObj, (err, msg) => {
        if (err) {
            var errorMsg = `[error] Unable to move to: ${JSON.stringify(json.location)} as ${json.username}"`;
            console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
            res.status(500).send({ 'message': errorMsg });
            res.end();
        } else {
            user.lookingPointIndex = 0;
            user.location = json.location;
            console.log(`[i] User ${json.username} moved to ${JSON.stringify(locationObj.coords)}`);
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

        var username = _.findKey(loggedUsers, value => {
            return value.socketId == socket.id;
        });

        if (username != undefined) {
            console.log(`[i] Log-out with user: ${username}`);
            clearInterval(loggedUsers[username].heartbeatId);
            delete loggedUsers[username];
        } else {
            console.error(`[error] User could not be disconnected, socketid: ${socket.id}`);
        }
    });
});

// Pokemon api logic
var loggedUsers = {}; //Note(b.jehanno): This might be worth to store the pokeio object seperatly as they can be quite big (costly to _.findKey etc)

var watchPokemonsInZone = function(username, password, location, provider, socketId, callback) {
    var pokeio = new PokemonGO.Pokeio();

    pokeio.init(username, password, location, provider, function(err) {
        if (err) {
            var errorMsg = `[error] Unable to connect with: (${username}, ${password}, ${provider}, sId: ${socketId}) at "${location.name}"`;
            console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
            callback(null, errorMsg);
            return;
        }

        console.log('[i] Current location: ' + pokeio.playerInfo.locationName);
        console.log('[i] lat/long/alt: : ' + pokeio.playerInfo.latitude + ' ' + pokeio.playerInfo.longitude + ' ' + pokeio.playerInfo.altitude);

        callback({ position: { lat: pokeio.playerInfo.latitude, lng: pokeio.playerInfo.longitude } }, null);

        var lookingPointsIndex = 0;

        var heartbeatId = setInterval(() => {
            var lookingPoints = getSurroundingPoints(loggedUsers[username].location);

            var locationObj = {
                type: 'coords',
                coords: {
                    latitude: lookingPoints[loggedUsers[username].lookingPointIndex].lat,
                    longitude: lookingPoints[loggedUsers[username].lookingPointIndex].lng
                }
            };

            pokeio.SetLocation(locationObj, (err, msg) => {
                if (err) {
                    var errorMsg = `[error] Unable to move to: ${JSON.stringify(locationObj.coords)} as ${username}"`;
                    console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
                } else {
                    pokeio.Heartbeat(function(err, hb) {
                        console.log(`[HB] - ${username} Scanning ${JSON.stringify(locationObj.coords)}`);
                        if (err || hb === undefined) {
                            console.error(`[error] Search for pokemon failed\n-> err: ${JSON.stringify(err)}`);
                            return;
                        }

                        //TODO(b.jehanno): Store this in a fancy DB (elastic search ?)
                        var pokemonsSeen = [];
                        for (var i = hb.cells.length - 1; i >= 0; i--) {
                            for (var j = hb.cells[i].MapPokemon.length - 1; j >= 0; j--)
                            {
                                var currentPokemon = hb.cells[i].MapPokemon[j];
                                var pokedexInfo = pokeio.pokemonlist[parseInt(currentPokemon.PokedexTypeId)-1]; //TODO(b.jehanno): let's store in client
                                var pokemon = {
                                    encounterId: currentPokemon.EncounterId.toNumber(),
                                    name: pokedexInfo.name,
                                    lat: currentPokemon.Latitude,
                                    lng: currentPokemon.Longitude,
                                    expirationTimeMs: currentPokemon.ExpirationTimeMs.toNumber() != -1
                                        ? currentPokemon.ExpirationTimeMs.toNumber() : 15*60*1000, //When expirationTime = -1 it means that it is between 15 and 30 min
                                    image: pokedexInfo.img
                                }
                                pokemonsSeen.push(pokemon);
                                console.log('[+] ' + pokedexInfo.name + ' found: ' + JSON.stringify(pokemon));
                            }
                        }
                        if (pokemonsSeen.length > 0)
                            io.sockets.emit('new_pokemons', pokemonsSeen);

                        loggedUsers[username].lookingPointIndex = (loggedUsers[username].lookingPointIndex + 1) % (lookingPoints.length);
                    });
                }
            });
        }, 2000);

        //TODO(b.jehanno): First two chars are always /# that could have to do with rooms of socket.io
        loggedUsers[username] = {
            pokeio: pokeio,
            socketId: '/#' + socketId,
            heartbeatId: heartbeatId,
            location: { lat: pokeio.playerInfo.latitude, lng: pokeio.playerInfo.longitude },
            lookingPointIndex: 0
        };
    });
}

//Geometric stuff

var pkmnRadius = 70; // radius from where you seen wild pokemons on the map

var addDistance = function(latLng, dx, dy) {
    var lat = latLng.lat + (180/Math.PI)*(dy/6378137)
    var lng = latLng.lng + (180/Math.PI)*(dx/6378137) / Math.cos(Math.PI/180.0 * latLng.lat)
    return { lat: lat, lng: lng };
}

var getSurroundingPoints = function(center) {
    var points = [];
    points.push(center);
    points.push(addDistance(center, -pkmnRadius/2,  pkmnRadius));
    points.push(addDistance(center,  pkmnRadius/2,  pkmnRadius));
    points.push(addDistance(center,  pkmnRadius,    0         ));
    points.push(addDistance(center,  pkmnRadius/2, -pkmnRadius));
    points.push(addDistance(center, -pkmnRadius/2, -pkmnRadius));
    points.push(addDistance(center, -pkmnRadius,    0         ));
    return points;
}

