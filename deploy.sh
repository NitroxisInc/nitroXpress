#!/bin/bash

# Change dir to the working directory
cd "/home/hammad/public/b2b/"

# fetch latest code from the git repo
git checkout -b dist origin/dist
git fetch
git pull

# hard reset the base to reset all of the changes
git reset --hard origin/dist
git clean -f -d

# remove the node_moduels and reinstall all prod modules
rm ./node_modules/ -r

# see if global typescript is required to update
npm i -g typescript

# install libraries if missing
npm i

# compile all files in tsconfig
tsc -p .

# restart all pm2 instances after this
pm2 delete --silent b2b-tinder-api
pm2 start dist/index.js -i 2 --name=b2b-tinder-api
