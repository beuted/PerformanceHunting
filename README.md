# Performance Hunting

Let's catch 'em all yo!

## Running the app

* Install elastic-search and have it running on the default port : `9200` (or modify config.js)
* Run the script `./scripts/init_elasticsearch.sh` to create the index of pokemons
* Update the config.js with fresh pokemon go accounts
* Run `npm start`
* Visit `localhost:3000`
* Enter a name to identify yourself and start scanning
* Catch 'em all!

[Here is what it looks like](https://twitter.com/DeKajoo/status/764898714817290240)

## Techno used

* **Nodejs** for server
* Web sockets with **socket.io**
* **ElasticSearch** to store pokemons
* Good old **jQuery** for the client

## Todo

* [\_] Add push notifications when pokemon pops
* [\_] Allow to filter on pokemon type
* [\_] Remove socket.io and use the polling to know if a user disconnected
* [\_] Fake device info for each account (See `pokeio.SetDeviceInfo()`)
* [✓] Use `expirationTimeMs` to Show time remaining in the UI and remove the pokemon at the right time
* [✓] Allow user to change his position from the UI 
* [✓] Allow to add users in config.js that will be seamlessly used to scan for pokemons
* [✓] Allow several users to use the app at the same time
* [✓] Enlarge the zone of search around the position of the user
* [✓] Store pokemons seen on elasticsearch with there position (and use it to display on front)
* [\_] Store all pokemon spawns per zone in elastic earch (to be able to display some spawn statistics _o/)

#### Licence MIT
