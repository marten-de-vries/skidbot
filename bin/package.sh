#!/bin/bash

#build
npm run build

#copy files
mkdir -p dist/package
cp dist/game.min.js dist/package
cp node_modules/codemirror/lib/codemirror.css dist/package
cp index.html dist/package
cp resources/*.png dist/package

sed -i 's/resources[/]//g' dist/package/index.html dist/package/game.min.js
sed -i 's/node_modules[/]codemirror[/]lib[/]//g' dist/package/index.html
sed -i 's/dist[/]//g' dist/package/index.html
