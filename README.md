# Performance Hunting

Let's catch 'em all yo!

## Running the app

* Complete the config.js app with some pokemon go credentials (not your main account one obviously...)
* Run `node index.js`
* Visit `localhost:3000`

## Tout doux

* [ ] Add push notifications when pokemon pops
* [ ] Use `expirationTimeMs` to Show time remaining in the UI and remove the pokemon at the right time
* [✓] Allow user to change his position from the UI 
* [✓] Allow user to enter his account on the front and use it to make calls to pokemon API
* [✓] Allow several users to use the app at the same time
* [ ] Enlarge the zone of search around the position of the user
* [ ] Store pokemons seen on elasticsearch with there position (and use it to display on front)
* [ ] Store all pokemon spawns per zone in elastic earch (to be able to display some spawn statistics _o/)