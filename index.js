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

var provider = process.env.PGO_PROVIDER || config.PGO_PROVIDER;


// Routing
app.post('/api/login', (req, res) => {
    var json = req.body;
    var locationObj = { type: 'name', name: json.location };

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
            console.log(`[i] User ${json.username} moved to ${JSON.stringify(json.location)}`);
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

    var socketIdWithRoom = '/#' + socketId;

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
    // Note(b.jehanno) Code commented cause of throttling issue (connection + first call to profile are too close to eachother)
    //    pokeio.GetProfile(function(err, profile) {
    //        if (err) throw err;
    //
    //        console.log('[i] Username: ' + profile.username);
    //        console.log('[i] Poke Storage: ' + profile.poke_storage);
    //        console.log('[i] Item Storage: ' + profile.item_storage);
    //
    //        var poke = 0;
    //        if (profile.currency[0].amount) {
    //            poke = profile.currency[0].amount;
    //        }
    //
    //        console.log('[i] Pokecoin: ' + poke);
    //        console.log('[i] Stardust: ' + profile.currency[1].amount);
    //    });

        var allPokemonsSeen = []; //TODO(b.jehanno): Store this in a fancy DB (elastic search ?)
        var heartbeatId = setInterval(() => {
            pokeio.Heartbeat(function(err, hb) {
                console.log('[HB] - ' + username); //TODO: remove
                if(err || hb === undefined) {
                    console.error(`[error] Search for pokemon failed\n-> err: ${JSON.stringify(err)}`);
                    return;
                }

                var pokemonsSeen = [];
                for (var i = hb.cells.length - 1; i >= 0; i--) {
                    for (var j = hb.cells[i].MapPokemon.length - 1; j >= 0; j--)
                    {
                        var currentPokemon = hb.cells[i].MapPokemon[j];

                        if (_.includes(allPokemonsSeen, currentPokemon.EncounterId.toNumber()))
                            continue;

                        allPokemonsSeen.push(currentPokemon.EncounterId.toNumber());

                        var pokedexInfo = pokeio.pokemonlist[parseInt(currentPokemon.PokedexTypeId)-1]; //TODO(b.jehanno): let's store in client
                        var pokemon = {
                            encounterId: currentPokemon.EncounterId.toNumber(),
                            name: pokedexInfo.name,
                            lat: currentPokemon.Latitude,
                            lng: currentPokemon.Longitude,
                            expirationTimeMs: currentPokemon.ExpirationTimeMs.toNumber(),
                            image: pokedexInfo.img
                        }
                        pokemonsSeen.push(pokemon);
                        console.log('[+] ' + pokedexInfo.name + ' found: ' + JSON.stringify(pokemon));
                    }
                }
                if (pokemonsSeen.length > 0)
                    io.sockets.emit('new_pokemons', pokemonsSeen);
            });
        }, 10000);

        //TODO(b.jehanno): First two chars are always /# that could have to do with rooms of socket.io
        loggedUsers[username] = { pokeio: pokeio, socketId: '/#' + socketId, heartbeatId: heartbeatId };
    });
}

