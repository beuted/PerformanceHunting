# Performance Hunting

Let's catch 'em all yo!

## Running the app

Complete the config.js app with some pokemon go credentials (not your main account one obviously...)

## Tout doux

* Use `expirationTimeMs` to Show time remaining in the UI and remove the pokemon at the right time
* Allow user to change his position from the UI
* Allow user to enter his account on the front and use it to make calls to pokemon API
* Allow several users to use the app at the same time
* Enlarge the zone of search around the position of the user
* Store pokemons seen on elasticsearch with there position (and use it to display on front)
* Store all pokemon spawns per zone in elastic earch (to be able to display some spawn statistics _o/)

## If you are on windows

Unfortunatly pokemon-go-node-api do not support windows well due to some libraries needing to compile c++ and stuff... (See pull request: https://github.com/coolaj86/s2-geometry-javascript/issues/6 )

A quick fix, waiting for the pull request to be merge, is to use a fork of pokemon-go-node-api instead of the official one.

Replace in your package.json: `"pokemon-go-node-api": "git+ssh://git@github.com/Daplie/Pokemon-GO-node-api.git",`