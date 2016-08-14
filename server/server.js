'use strict';

var express = require('express');
var bodyParser = require('body-parser');

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

		Server.app = app;
		Server.io = io;
	}
}

module.exports = Server;