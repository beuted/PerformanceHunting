var express = require('express');
var PokemonGO = require('pokemon-go-node-api')
var _ = require('lodash');

var app = express();
var port = process.env.PORT || 3000;
var pokeio = new PokemonGO.Pokeio();
var config = require('./config');

// Serve static files
app.use(express.static('public'));


var server = app.listen(port, function() {
    console.log('csgo-mates-server is running at localhost:' + port);
});

var io = require('socket.io').listen(server);

// Routing
app.get('/api/pokemons', (req, res) => {
    res.status(200).send('tones of them');
    res.end();
});

// Pokemon api logic
var location = {
    type: 'name',
    name: process.env.PGO_LOCATION || '48.87929, 2.33203'
};

var username = process.env.PGO_USERNAME || config.PGO_USERNAME;
var password = process.env.PGO_PASSWORD || config.PGO_PASSWORD;
var provider = process.env.PGO_PROVIDER || config.PGO_PROVIDER;

pokeio.init(username, password, location, provider, function(err) {
    if (err) throw err;

    console.log('[i] Current location: ' + pokeio.playerInfo.locationName);
    console.log('[i] lat/long/alt: : ' + pokeio.playerInfo.latitude + ' ' + pokeio.playerInfo.longitude + ' ' + pokeio.playerInfo.altitude);

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
    io.sockets.on('connection', (socket) => {
        console.log('[s] client connected');
        setInterval(() => {
            pokeio.Heartbeat(function(err, hb) {
                if(err)
                    console.error(err);

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
});
