'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var elasticsearch = require('elasticsearch');
var config = require('../config');

class Server {
    static init() {
        var app = express();
        var port = process.env.PORT || 3100;

        // Serve static files
        app.use(express.static('public'));
        // To support JSON-encoded bodies
        app.use(bodyParser.json());

        var server = app.listen(port, function() {
            console.log('performance-hunting is running at localhost:' + port);
        });
        var io = require('socket.io').listen(server);

        var elasticClient = new elasticsearch.Client({
          host: config.ELASTIC_SEARCH_HOST,
          //log: 'trace'
        });

        Server.app = app;
        Server.io = io;
        Server.elasticClient = elasticClient;
    }
}

module.exports = Server;