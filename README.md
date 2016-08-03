# Performance Hunting

Let's catch 'em all yo!

## Running the app

Complete the config.js app with some pokemon go credentials (not your main account one obviously...)

## If you are on windows

Unfortunatly pokemon-go-node-api do not support windows well due to some libraries needing to compile c++ and stuff... (See pull request: https://github.com/coolaj86/s2-geometry-javascript/issues/6 )

A quick fix, waiting for the pull request to be merge, is to use a fork of pokemon-go-node-api instead of the official one.

Replace in your package.json: `"pokemon-go-node-api": "git+ssh://git@github.com/Daplie/Pokemon-GO-node-api.git",`