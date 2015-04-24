SkidBot
=======

[![Build Status](https://travis-ci.org/marten-de-vries/skidbot.svg?branch=master)](https://travis-ci.org/marten-de-vries/skidbot)
[![Dependency Status](https://david-dm.org/marten-de-vries/skidbot.svg)](https://david-dm.org/marten-de-vries/skidbot)
[![devDependency Status](https://david-dm.org/marten-de-vries/skidbot/dev-status.svg)](https://david-dm.org/marten-de-vries/skidbot#info=devDependencies)

SkidBot is an open source robot simulator that helps you learn
programming. It's inspired by RoboMind, and uses its programming
language and map format.

Contributing
------------

After checking out SkidBot's git repo, first run the following command:

``npm install``

When done, your development environment has been set up. From this
point forward, the following commands are useful:

- ``npm test``, to run jshint on the code
- ``npm run dev``, this updates the bundle file (dist/game.min.js)
  continuously, so you can directly test your changes.
- ``npm run package``, this builds a 'production' version of SkidBot,
  and places it in dist/package.

You don't need a web server, just open index.html directly. That just
works.

TODOS
-----

- More tiles
- More maps (+ allow switching maps)
- Translation of scripts?
- Support for other programming languages? E.g. JavaScript.
- Validate function arguments
- Add painting + animations (paintbrush + flipcoin)
- Animated tiles
- Test in other browsers than firefox (at least fix the clouds in chrome)

See also robomind-parser & robomind-interpreter
