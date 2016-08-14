#!/bin/bash

#Creating the index
curl -i \
    -H "Accept: application/json" \
    -H "X-HTTP-Method-Override: POST" \
    -X POST -d '{
      "mappings": {
        "pokemons": {
          "_ttl": {
            "enabled": true,
            "default": "1h"
          },
          "properties" : {
            "location" : {
              "type" : "geo_point"
            }
          }
        }
      }
    }'\
    http://localhost:9200/pkmn


