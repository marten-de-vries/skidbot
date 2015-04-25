#!/bin/bash

rm -rf dist/package

npm run package
cd dist/package
git init
git config user.name "Marten de Vries"
git config user.email "marten94@gmail.com"
git add .
git commit -m "Build for Github Pages"
git push --force --quiet "https://${GH_TOKEN}@github.com/marten-de-vries/skidbot.git" master:gh-pages > /dev/null 2>&1
