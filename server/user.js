'use strict';

var PokemonGO = require('pokemon-go-node-api');
var _ = require('lodash');

var Server = require('./server');

class User {
    constructor(username, socketId, location, accountsManager) {
        this.username = username;
        this.socketId = socketId
        this.location = location;
        this.heartbeatId = null;
        this.lookingPointIndex = 0;
        this.accountsManager = accountsManager;
    }

    assignAccount(callback) {
        var account = this.accountsManager.assignAccount(this.username);
        if (!account) {
            callback('No account available right now', null)
            return;
        }
        this.account = account;
        this._initScan();
        callback(null, account.seedLocation);
    }

    move(newLocation, callback) {
        this.lookingPointIndex = 0;
        this.location = newLocation;
        console.log(`[i] User ${this.username} moved to ${JSON.stringify(newLocation)}`);
        callback(null, newLocation);
    }

    delete() {
        this.accountsManager.freeAccount(this.username);
        clearInterval(this.heartbeatId);
    }

    _initScan() {
        this.heartbeatId = setInterval(() => {
            var lookingPoints = getSurroundingPoints(this.location);

            this.account.move(lookingPoints[this.lookingPointIndex], (err, res) => {
                if (!err) {
                    this.account.scan((pokemonsSeen) => {
                        if (pokemonsSeen.length > 0) {
                            var requestBody = [];

                             _.each(pokemonsSeen, pokemon => {
                                //When expirationTime = -1 it means that it is between 15 and 30 min
                                var ttl;
                                if (pokemon.expirationTimeMs < 0)
                                    ttl = 15*60;
                                else
                                    ttl = Math.floor((pokemon.expirationTimeMs - (new Date()).getTime()) / 1000);

                                if (ttl <= 0)
                                    return;

                                requestBody.push(
                                    { create:  { _index: 'pkmn', _type: 'pokemons', _id: pokemon.encounterId, _ttl: `${ttl}s` } }
                                );
                                requestBody.push(
                                    { name: pokemon.name, typeId: pokemon.typeId, location: { lat: pokemon.lat, lon: pokemon.lng } }
                                );
                            });

                            Server.elasticClient.bulk({
                                body: requestBody
                            }, (err, resp) => {
                                if (err)
                                    console.error(`[error] Sending pokemons to elasticSearch failed\n-> err: ${JSON.stringify(err)}`);
                            });
                        }

                        this.lookingPointIndex = (this.lookingPointIndex + 1) % (lookingPoints.length);
                    });
                }
            });
        }, 7000);
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