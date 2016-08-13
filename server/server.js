'use strict';

class Server {
	static init(io) {
		Server.io = io;
	}
}

module.exports = Server;