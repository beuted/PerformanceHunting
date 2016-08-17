'use strict';

var _ = require('lodash');
var PokemonGO = require('pokemon-go-node-api');
var Account = require('./account');
var config = require('../config');

class AccountsManager {
    constructor() {
        this.accounts = [];

        var accountSeeds = config.ACCOUNT_LIST || [];
        if (accountSeeds.length == 0)
            throw new Error('No accountSeeds registered in config.js');

        for (var i = 0; i < accountSeeds.length; i++) {
            var account = new Account(accountSeeds[i].login, accountSeeds[i].password, accountSeeds[i].provider);
            account.init(accountSeeds[i].location);
            this.accounts.push(account);
        }
    }

    assignAccount(username) {
        var shuffledAccounts =  _.shuffle(this.accounts);
        var availableAccount = _.find(shuffledAccounts, account => {
            return account.isFree();
        });

        if (!availableAccount)
            return null;

        availableAccount.assign(username);
        return availableAccount;
    }

    freeAccount(username) {
        var userAccount = this.getAccount(username);

        if (!userAccount)
            return null;

        userAccount.free();
    }

    getAccount(username) {
        return _.find(this.accounts, account => {
            return account.username == username;
        });
    }
}

module.exports = AccountsManager;