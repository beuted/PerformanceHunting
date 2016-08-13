'use strict';

var _ = require('lodash');

class UsersManager {
    //Note(b.jehanno): This might be worth to store the pokeio object seperatly as they can be quite big (costly to _.findKey etc)
    constructor() {
        this.userDic = {};
    }

    addUser(user) {
        this.userDic[user.username] = user;
        return user;
    }

    getUser(username) {
        return this.userDic[username];
    }

    getUserBySocketId(socketId) {
        var username = _.findKey(this.userDic, value => {
            return value.socketId == socketId;
        });

        if (username)
            return this.userDic[username];
        return null;
    }

    removeUser(username) {
        this.userDic[username].delete();
        delete this.userDic[username];
    }
}

module.exports = UsersManager;