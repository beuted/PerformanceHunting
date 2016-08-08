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

    console.log(JSON.stringify(locationObj));

    watchPokemonsInZone(json.user, json.password, locationObj, provider, function(successMsg, errorMsg) {
        if (!errorMsg) {
            res.status(200).send(successMsg);
        } else {
            res.status(401).send({ 'message': errorMsg });
        }
        res.end();
    });
});

// Web Sockets
var socket;
io.sockets.on('connection', (s) => {
    socket = s;
    console.log(`[s] client connected: ${socket.id}`);
});

// Pokemon api logic
var watchPokemonsInZone = function(username, password, location, provider, callback) {
var pokeio = new PokemonGO.Pokeio();
    pokeio.init(username, password, location, provider, function(err) {
        if (err) {
            var errorMsg = `[Error] Unable to connect with: (${username}, ${password}, ${provider}) at "${location.name}"`;
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
        setInterval(() => {
            pokeio.Heartbeat(function(err, hb) {
                console.log('toudoum: ' + username); //TODO: remove
                if(err || hb === undefined) {
                    console.error(`[Error] Search for pokemon failed\n-> err: ${JSON.stringify(err)}`);
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
                    socket.volatile.emit('new_pokemons', pokemonsSeen);
            });
        }, 10000);
    });
}

