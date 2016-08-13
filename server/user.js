'use strict';

var PokemonGO = require('pokemon-go-node-api');
var Server = require('./server');

class User {
    constructor(username, password, socketId, location) {
        this.username = username;
        this.password = password;
        this.provider = 'ptc';
        this.pokeio = new PokemonGO.Pokeio();
        this.socketId = socketId
        this.location = location;
        this.heartbeatId = null;
        this.lookingPointIndex = 0;
    }

    move(newLocation, callback) {
        this.lookingPointIndex = 0;
        this.location = newLocation;
        console.log(`[i] User ${this.username} moved to ${JSON.stringify(newLocation)}`);
        callback(null, newLocation);
    }

    delete() {
        clearInterval(this.heartbeatId);
    }

    login(callback) {
        var locationObj = { type: 'coords', coords: { latitude: this.location.lat, longitude: this.location.lng} };

        this.pokeio.init(this.username, this.password, locationObj, this.provider, (err) => {
            if (err) {
                var errorMsg = `[error] Unable to connect with: (${this.username}, ${this.password}, ${this.provider}, sId: ${this.socketId}) at ${JSON.stringify(this.location)}`;
                console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
                callback(errorMsg, null);
                return;
            }

            console.log('[i] ' + this.username + ' logged at: (' + this.pokeio.playerInfo.latitude + ', ' + this.pokeio.playerInfo.longitude + ', ' + this.pokeio.playerInfo.altitude + ')');

            callback(null, { position: { lat: this.pokeio.playerInfo.latitude, lng: this.pokeio.playerInfo.longitude } });
        });
    }

    initScan() {
        this.heartbeatId = setInterval(() => {
            var lookingPoints = getSurroundingPoints(this.location);

            var locationObj = {
                type: 'coords',
                coords: {
                    latitude: lookingPoints[this.lookingPointIndex].lat,
                    longitude: lookingPoints[this.lookingPointIndex].lng
                }
            };

            this.pokeio.SetLocation(locationObj, (err, msg) => {
                if (err) {
                    var errorMsg = `[error] Unable to move to: ${JSON.stringify(locationObj.coords)} as ${this.username}"`;
                    console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
                } else {
                    this.pokeio.Heartbeat((err, hb) => {
                        console.log(`[HB] - ${this.username} Scanning ${JSON.stringify(locationObj.coords)}`);
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
                                var pokedexInfo = this.pokeio.pokemonlist[parseInt(currentPokemon.PokedexTypeId)-1]; //TODO(b.jehanno): let's store in client
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
                            Server.io.sockets.emit('new_pokemons', pokemonsSeen);

                        this.lookingPointIndex = (this.lookingPointIndex + 1) % (lookingPoints.length);
                    });
                }
            });
        }, 2000);
    }
}

//Geometric stuff
//TODO(b.jehanno): move to another class

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

module.exports = User;