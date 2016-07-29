var express = require('express');
var PokemonGO = require('pokemon-go-node-api')

var app = express();
var port = process.env.PORT || 3000;
var pokeio = new PokemonGO.Pokeio();

// serve static files
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

//Pokemon api

var location = {
    type: 'name',
    name: process.env.PGO_LOCATION || '9 rue de rochechouart'
};

var username = process.env.PGO_USERNAME || '';
var password = process.env.PGO_PASSWORD || '';
var provider = process.env.PGO_PROVIDER || 'ptc';

io.sockets.on('connection', (socket) => {
    pokeio.init(username, password, location, provider, function(err) {
        if (err) throw err;

        console.log('[i] Current location: ' + pokeio.playerInfo.locationName);
        console.log('[i] lat/long/alt: : ' + pokeio.playerInfo.latitude + ' ' + pokeio.playerInfo.longitude + ' ' + pokeio.playerInfo.altitude);

        pokeio.GetProfile(function(err, profile) {
            if (err) throw err;

            console.log('[i] Username: ' + profile.username);
            console.log('[i] Poke Storage: ' + profile.poke_storage);
            console.log('[i] Item Storage: ' + profile.item_storage);

            var poke = 0;
            if (profile.currency[0].amount) {
                poke = profile.currency[0].amount;
            }

            console.log('[i] Pokecoin: ' + poke);
            console.log('[i] Stardust: ' + profile.currency[1].amount);
        });

        setInterval(() => {
            pokeio.Heartbeat(function(err, hb) {
                if(err) {
                    console.log(err);
                }

                for (var i = hb.cells.length - 1; i >= 0; i--) {
                    if(hb.cells[i].NearbyPokemon[0]) {
                        //console.log(pokeio.pokemonlist[0])
                        var pokemon = pokeio.pokemonlist[parseInt(hb.cells[i].NearbyPokemon[0].PokedexNumber)-1];
                        console.log('[+] There is a ' + pokemon.name + ' at ' + hb.cells[i].NearbyPokemon[0].DistanceMeters.toString() + ' meters');
                        socket.volatile.emit('notification', {
                            data: '[+] There is a ' + pokemon.name + ' at ' + hb.cells[i].NearbyPokemon[0].DistanceMeters.toString() + ' meters'
                        });
                    }
                }

            });
        }, 5000);
    });
});
