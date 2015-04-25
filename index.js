"use strict";

var Promise = global.Promise || require('lie');
var mod = require('mod-op');

var parser = require('robomind-parser');
var Interpreter = require('robomind-interpreter');
var view = require('./mapview');
var ui = require('./ui');

var DIRECTIONS = ['north', 'east', 'south', 'west'];

var state = {};

function defaultify(val, def) {
  return typeof val === 'undefined' ? def : val;
}

function tileType(pos) {
  var i, item;

  var x = pos.x;
  var y = pos.y;

  if (state.beacons[x + ',' + y]) {
    return 'beacon';
  }

  if (' @*'.indexOf(((state.map.map || [])[y] || [])[x] || ' ') === -1) {
    return 'obstacle';
  }

  var extra = state.map.extra || [];
  for (i = 0; i < extra.length; i++) {
    item = extra[i];
    if (item.type === 'disco' && x === item.x && item.y === y) {
      return 'obstacle';
    }
    if (['tree', 'palm'].indexOf(item.type) !== -1 && x === item.x + 1 && y === item.y + 1) {
      return 'obstacle';
    }
  }

  var paint = state.map.paint || [];
  for (i = 0; i < paint.length; i++) {
    item = paint[i];
    if (x === item.x && y === item.y) {
      return item.color;
    }
    if (item.type === 'down' && x === item.x && y === item.y + 1) {
      return item.color;
    }
    if (item.type === 'right' && x === item.x + 1 && y === item.y) {
      return item.color;
    }
  }

  return 'clear';
}

var stdlib = {};

stdlib.forward = function (n) {
  n = defaultify(n, 1);

  function step(i) {
    var direction = n > 0 ? state.direction : opposite(state.direction);
    var newPos = neighbour(direction);

    if (isBlocked(newPos)) {
      return Promise.reject("Can't go forward.");
    }

    state.x = newPos.x;
    state.y = newPos.y;

    return view.moveRobot(state.x, state.y).then(function () {
      if (i > 1) {
        return step(i - 1);
      }
    });
  }

  return step(Math.abs(n)).then(function () {
    return n;
  });
};

function opposite(direction) {
  var newIdx = mod(DIRECTIONS.indexOf(direction) - 2, DIRECTIONS.length);
  return DIRECTIONS[newIdx];
}

function neighbour(direction) {
  return {
    north: {x: state.x, y: state.y - 1},
    south: {x: state.x, y: state.y + 1},
    east: {x: state.x + 1, y: state.y},
    west: {x: state.x - 1, y: state.y}
  }[direction];
}

function isBlocked(pos) {
  var tile = tileType(pos);
  return tile === 'obstacle' || tile === 'beacon';
}

stdlib.backward = function (n) {
  return stdlib.forward(-defaultify(n, 1)).then(function (steps) {
    return -steps;
  });
};

stdlib.left = function (n) {
  n = defaultify(n, 1);

  function step(i) {
    var degrees = n > 0 ? -90 : 90;
    return view.turnRobot(degrees).then(function () {
      if (i > 1) {
        return step(i - 1);
      }
    });
  }

  state.direction = directionAfterLeftTurns(n);
  
  return step(Math.abs(n)).then(function () {
    return n;
  });
};

function directionAfterLeftTurns(n) {
  var newIdx = mod(DIRECTIONS.indexOf(state.direction) - n, DIRECTIONS.length);
  return DIRECTIONS[newIdx];
}

stdlib.right = function (n) {
  return stdlib.left(-defaultify(n, 1)).then(function (steps) {
    return -steps;
  });
};

stdlib.north = function (n) {
  return goTowards('north', n);
};

function goTowards(direction, n) {
  var start = DIRECTIONS.indexOf(state.direction);
  var end = DIRECTIONS.indexOf(direction);

  var change = mod(start - end, DIRECTIONS.length);

  var turningDone;
  if (change > DIRECTIONS.length / 2) {
    turningDone = stdlib.right(DIRECTIONS.length - change);
  } else {
    turningDone = stdlib.left(change);
  }

  return turningDone.then(function () {
    return stdlib.forward(n);
  });
}

stdlib.south = function (n) {
  return goTowards('south', n);
};

stdlib.east = function (n) {
  return goTowards('east', n);
};

stdlib.west = function (n) {
  return goTowards('west', n);
};

stdlib.paintWhite = function () {
  if (state.paintColor === 'white') {
    return Promise.reject("Already painting white");
  }
  state.paintColor = 'white';
  return Promise.resolve(0);
};

stdlib.paintBlack = function () {
  if (state.paintColor === 'black') {
    return Promise.reject("Already painting black");
  }
  state.paintColor = 'black';
  return Promise.resolve(0);
};

stdlib.stopPainting = function () {
  if (state.paintColor === null) {
    return Promise.reject("Already not painting");
  }
  return Promise.resolve(0);
};

stdlib.pickUp = function () {
  if (state.carriesBeacon) {
    return Promise.reject("Already carrying a beacon.");
  }
  return stdlib.eatUp().then(function () {
    state.carriesBeacon = true;
    return 0;
  });
};

stdlib.putDown = function () {
  if (!state.carriesBeacon) {
    return Promise.reject("Can't put down a beacon when not carrying one.");
  }
  var beaconPos = neighbour(state.direction);
  if (isBlocked(beaconPos)) {
    return Promise.reject("Can't put down a beacon, there's something in the way.");
  }
  state.beacons[beaconPos.x + ',' + beaconPos.y] = true;

  state.carriesBeacon = false;
  return view.putBeacon(state.x, state.y, beaconPos.x, beaconPos.y).then(function () {
    return 0;
  });
};

stdlib.eatUp = function () {
  var inFront = neighbour(state.direction);
  if (tileType(inFront) !== 'beacon') {
    return Promise.reject("No beacon to pick up here.");
  }
  delete state.beacons[inFront.x + ',' + inFront.y];
  return view.eatBeacon(state.x, state.y, inFront.x, inFront.y).then(function () {
    return 0;
  });
};

stdlib.flipCoin = function () {
  return Promise.resolve(Math.round(Math.random()));
};

stdlib.leftIsObstacle = function () {
  return checkNeighbour(1, 'obstacle');
};

function checkNeighbour(leftTurns, searched) {
  var pos = neighbour(directionAfterLeftTurns(leftTurns));
  var tile = tileType(pos);
  return view.robotLookLeft(leftTurns).then(function () {
    return +(tile === searched);
  });
}

stdlib.leftIsClear = function () {
  return checkNeighbour(1, 'clear');
};

stdlib.leftIsWhite = function () {
  return checkNeighbour(1, 'white');
};

stdlib.leftIsBlack = function () {
  return checkNeighbour(1, 'black');
};

stdlib.frontIsObstacle = function () {
  return checkNeighbour(0, 'obstacle');
};
stdlib.frontIsClear = function () {
  return checkNeighbour(0, 'clear');
};
stdlib.frontIsWhite = function () {
  return checkNeighbour(0, 'white');
};
stdlib.frontIsBlack = function () {
  return checkNeighbour(0, 'black');
};

stdlib.rightIsObstacle = function () {
  return checkNeighbour(-1, 'obstacle');
};
stdlib.rightIsClear = function () {
  return checkNeighbour(-1, 'clear');
};
stdlib.rightIsWhite = function () {
  return checkNeighbour(-1, 'white');
};
stdlib.rightIsBlack = function () {
  return checkNeighbour(-1, 'black');
};

var fs = require('fs');
state.map = parser.parseMap(fs.readFileSync('./simple.utf8.map', {encoding: 'utf8'}));
var script = fs.readFileSync('./simple.utf8.irobo', {encoding: 'utf8'});
ui.setScript(script);
var initializing = view.setMap(state.map);

function setSpeed() {
  view.setSpeed(ui.speed);
}
ui.on('speedchange', setSpeed);
setSpeed();

ui.on('run', function () {
  ui.enableRunButton(false);
  initializing.then(function () {
    return view.reset();
  }).then(function () {
    state.direction = 'north';
    state.paintColor = null;
    state.carriesBeacon = false;

    state.beacons = {};
    var promises = [];
    (state.map.map || []).forEach(function (row, y) {
      // beacon searching
      var x = row.indexOf('*');
      if (x !== -1) {
        state.beacons[x + ',' + y] = true;
        promises.push(view.addBeacon(x, y));
      }
      // robot searching
      x = row.indexOf('@');
      if (x !== -1) {
        state.x = x;
        state.y = y;

        promises.push(view.moveRobot(x, y, true));
      }
    });
    return Promise.all(promises);
  }).then(function () {
    var ast = parser.parseScript(ui.getScript(), {language: ui.language});
    var interpreter = new Interpreter(stdlib);

    interpreter.on('position', function (info) {
      ui.markPosition(info.line);
    });

    return interpreter.run(ast);
  }).catch(function (err) {
    console.error(err);
    if (err instanceof parser.SyntaxError) {
      err = [
        err.message.toString(),
        ' This happened at line ',
        err.line,
        ', column ',
        err.column,
        '.'
      ].join('');
    }
    global.alert(err);
  }).then(function () {
    ui.stopMarkingPosition();
    ui.enableRunButton(true);
  });
});
