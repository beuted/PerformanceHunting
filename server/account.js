'use strict';

var PokemonGO = require('pokemon-go-node-api');

class Account {
    constructor(login, password, provider) {
        this.login = login;
        this.password = password;
        this.provider = provider;
        this.username = null;
        this.pokeio = null;
        this.seedLocation = null;
    }

    init(location) {
        var pokeio = new PokemonGO.Pokeio();
        var locationObj = { type: 'coords', coords: { latitude: location.lat, longitude: location.lng} };
        pokeio.init(this.login, this.password, locationObj, this.provider, (err) => {
            if (err)
                throw new Error(`[error] Unable to connect with: (${this.login}, ${this.password}, ${this.provider}) at ${JSON.stringify(location)}-> err: ${JSON.stringify(err)}`);

            console.log(`[i] ${this.login} logged at: ${JSON.stringify(location)}`);
            this.pokeio = pokeio;
        });
        this.seedLocation = location;
    }

    isFree() {
        return !this.username;
    }

    free() {
        this.username = null;
    }

    assign(username) {
        if (!this.isFree())
            throw new Error('Trying to assign an already assigned account')
        this.username = username;
    }

    scan(callback) {
        this.pokeio.Heartbeat((err, hb) => {
            //console.log(`[HB] - ${this.username} Scanning ${JSON.stringify(this.pokeio.GetLocationCoords())}`);
            if (err || hb === undefined) {
                console.error(`[error] Search for pokemon failed\n-> err: ${JSON.stringify(err)}`);
                return;
            }

            //TODO(b.jehanno): Store this in a fancy DB (elastic search ?)
            var pokemonsSeen = [];
            if (!hb.cells[0] || (hb.cells[0].Fort.length == 0 && hb.cells[0].NearbyPokemon.length == 0))
                console.log(`[warning] ${this.login} seems to have reach the rate limit!`);

            for (var i = hb.cells.length - 1; i >= 0; i--) {
                for (var j = hb.cells[i].MapPokemon.length - 1; j >= 0; j--)
                {

                    var currentPokemon = hb.cells[i].MapPokemon[j];
                    var pokedexInfo = this.pokeio.pokemonlist[parseInt(currentPokemon.PokedexTypeId)-1]; //TODO(b.jehanno): let's store in client
                    var pokemon = {
                        encounterId: currentPokemon.EncounterId.toNumber(),
                        name: pokedexInfo.name,
                        lat: currentPokemon.Latitude,
                        lng: currentPokemon.Longitude,
                        expirationTimeMs: currentPokemon.ExpirationTimeMs.toNumber(),
                        image: pokedexInfo.img,
                        typeId: currentPokemon.PokedexTypeId
                    }
                    pokemonsSeen.push(pokemon);
                    //console.log('[+] ' + pokedexInfo.name + ' found: ' + JSON.stringify(pokemon));
                }
            }

            callback(pokemonsSeen);
        });
    }

    move(location, callback) {
        var locationObj = { type: 'coords', coords: { latitude: location.lat, longitude: location.lng } };

        this.pokeio.SetLocation(locationObj, (err, msg) => {
            if (err) {
                var errorMsg = `[error] Unable to move to: ${JSON.stringify(locationObj.coords)} as ${this.login}"`;
                console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
                callback(errorMsg, null);
            } else {
                callback(null, msg);
            }
        });
    }
}

module.exports = Account;