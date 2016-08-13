'use strict';

var _ = require('lodash');
var PokemonGO = require('pokemon-go-node-api');
var config = require('../config');

//TODO(b.jehanno) Introduce an Account object, replace the username field with a boolean and handle
//                the 'ownership' repsonsability in the User class
class AccountsManager {
    constructor() {
        this.accounts = config.ACCOUNT_LIST || [];
        if (this.accounts.length == 0)
            throw new Error('No accounts registered in config.js');
        for (var i = 0; i < this.accounts.length; i++) {
            this._seedAccount(this.accounts[i]);  
        }
    }

    assignAccount(username) {
        var availableAccount = _.find(this.accounts, account => {
            return !account.username;
        });

        if (!availableAccount)
            return null;

        availableAccount.username = username;
        return availableAccount;
    }

    freeAccount(username) {
        var userAccount = this.getAccount(username);

        if (!userAccount)
            return null;

        userAccount.username = null;
    }

    getAccount(username) {
        return _.find(this.accounts, account => {
            return account.username == username;
        });
    }

    _seedAccount(account) {
        var pokeio = new PokemonGO.Pokeio();
        var locationObj = { type: 'coords', coords: { latitude: account.location.lat, longitude: account.location.lng} };
        pokeio.init(account.login, account.password, locationObj, account.provider, (err) => {
            if (err) {
                var errorMsg = `[error] Unable to connect with: (${account.login}, ${account.password}, ${account.provider}) at ${JSON.stringify(locationObj)}`;
                console.error(`${errorMsg}\n-> err: ${JSON.stringify(err)}`);
                callback(errorMsg, null);
                return;
            }

            console.log(`[i] ${account.login} logged at: ${JSON.stringify(locationObj)}`);
            account.pokeio = pokeio;
            account.username = null;
        });
    }
}

module.exports = AccountsManager;