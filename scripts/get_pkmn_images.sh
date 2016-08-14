#!/bin/bash


for i in $(seq -f "%03g" 1 151)
do
  wget http://www.serebii.net/pokemongo/pokemon/$i.png -O ../public/images/pokemons/$i.png
done