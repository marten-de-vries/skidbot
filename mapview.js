"use strict";

/* globals document, Image */

var TILE_SIZE = 200;
var MAX_SCALE = 1;
var MIN_SCALE = 0.05;

var Promise = global.Promise || require('lie');

var wrapper = document.getElementById('wrapper');
var clouds = document.getElementById('clouds-layer');
var container = document.getElementById('container');

var bg = document.getElementById('background-layer');
var bgCtx = bg.getContext('2d');

var paint = document.getElementById('paint-layer');
var paintCtx = paint.getContext('2d');

var fg = document.getElementById('foreground-layer');
var fgCtx = fg.getContext('2d');

var action = document.getElementById('action-layer');

var robotContainer = document.getElementById('robot-container');
var robot = document.getElementById('robot');
var robotShadow = document.getElementById('robot-shadow');
var robotHead = document.getElementById('robot-head');

var state = {
  scale: 0.2,
  pos: {},
  robotRotation: 0,
};

exports.setMap = function (data) {
  state.map = data;
  var map = state.map.map || [];

  state.width = Math.max.apply(null, map.map(function (row) {
    return row.length;
  })) * TILE_SIZE;
  state.height = map.length * TILE_SIZE;
  state.pos.x = (state.width - container.offsetWidth) / 2;
  state.pos.y = (state.height - container.offsetHeight) / 2;

  bg.width = paint.width = fg.width = state.width;
  bg.height = paint.height = fg.height = state.height;

  updateTransformation();

  // setup layers
  return drawBackgroundLayer().then(function () {
    return drawPaintLayer();
  }).then(function () {
    return drawForegroundLayer();
  });
};

function removeBeacon(beacon) {
  action.removeChild(beacon);
}

exports.reset = function () {
  paintCtx.clearRect(0, 0, paint.width, paint.height);

  robot.style.transform = 'rotate(0)';
  robotShadow.style.transform = 'rotate(0)';
  state.robotRotation = 0;

  var beacons = action.getElementsByClassName('beacon');
  Array.prototype.forEach.call(beacons, removeBeacon);

  return drawPaintLayer();
};

var speedStyle;

exports.setSpeed = function (speed) {
  if (speedStyle) {
    document.body.removeChild(speedStyle);
  }
  speedStyle = document.createElement('style');
  speedStyle.innerHTML = [
  '.duration-1 {',
  '  transition-duration: ' + speed / 4 + 's;',
  '}',
  '.duration-2 {',
  '  transition-duration: ' + speed / 2 + 's;',
  '}'
  ].join('\n');
  document.body.appendChild(speedStyle);
};

exports.addBeacon = function (x, y) {
  var div = document.createElement('div');
  div.className = 'beacon duration-2';
  div.id = 'beacon-' + x + '-' + y;
  div.style.left = x * TILE_SIZE + 'px';
  div.style.top = y * TILE_SIZE + 'px';

  action.appendChild(div);

  return div;
};

exports.putBeacon = function (robotX, robotY, beaconX, beaconY) {
  var beacon = exports.addBeacon(beaconX, beaconY);

  robotX *= TILE_SIZE;
  robotY *= TILE_SIZE;
  beaconX *= TILE_SIZE;
  beaconY *= TILE_SIZE;
  var deltaX = robotX - beaconX;
  var deltaY = robotY - beaconY;

  beacon.style.left = robotX + 'px';
  beacon.style.top = robotY + 'px';

  return withGripper(function (gripper) {
    beacon.style.left = robotX - deltaX * 0.6 + 'px';
    beacon.style.top = robotY - deltaY * 0.6 + 'px';

    return waitForTransitionEnd(beacon).then(function () {
      gripper.style.backgroundImage = 'url(resources/robotGripperClosed.png)';
      gripper.style.top = -TILE_SIZE * 0.4 + 'px';

      beacon.style.left = beaconX + 'px';
      beacon.style.top = beaconY + 'px';

      return waitForTransitionEnd(gripper);
    }).then(function () {
      gripper.style.backgroundImage = 'url(resources/robotGripperOpen.png)';
      gripper.style.top = '0';

      return waitForTransitionEnd(gripper);
    });
  });
};

function withGripper(cb) {
  var gripper = document.createElement('div');
  gripper.id = 'gripper';
  gripper.className = 'duration-2';
  gripper.style.top = '0';
  robot.appendChild(gripper);

  // need a short wait to make transition animation work.
  return waitFor(10).then(function () {
    return cb(gripper);
  }).then(function () {
    robot.removeChild(gripper);
  });
}

exports.eatBeacon = function (robotX, robotY, beaconX, beaconY) {
  robotX *= TILE_SIZE;
  robotY *= TILE_SIZE;
  var deltaX = robotX - beaconX * TILE_SIZE;
  var deltaY = robotY - beaconY * TILE_SIZE;

  var beacon = document.getElementById('beacon-' + beaconX + '-' + beaconY);

  return withGripper(function (gripper) {
    gripper.style.backgroundImage = 'url(resources/robotGripperOpen.png)';
    gripper.style.top = -TILE_SIZE * 0.4 + 'px';

    return waitForTransitionEnd(gripper).then(function () {
      gripper.style.backgroundImage = 'url(resources/robotGripperClosed.png)';
      gripper.style.top = '0';

      beacon.style.left = robotX - deltaX * 0.6 + 'px';
      beacon.style.top = robotY - deltaY * 0.6 + 'px';

      return waitForTransitionEnd(gripper);
    }).then(function () {
      beacon.style.left = robotX + 'px';
      beacon.style.top = robotY + 'px';

      return waitForTransitionEnd(beacon);
    }).then(function () {
      removeBeacon(beacon);
    });
  });
};

function waitFor(milliseconds) {
  return new Promise(function (resolve) {
    global.setTimeout(resolve, milliseconds);
  });
}

exports.moveRobot = function (x, y, withoutAnimation) {
  if (withoutAnimation) {
    robotContainer.style.display = 'none';
  }
  robotContainer.style.left = TILE_SIZE * x + 'px';
  robotContainer.style.top = TILE_SIZE * y + 'px';

  if (withoutAnimation) {
    robotContainer.style.display = 'block';
    return Promise.resolve();
  }
  return waitForTransitionEnd(robotContainer);
};

function waitForTransitionEnd(element) {
  return new Promise(function (resolve) {
    function onTransitionEnd() {
      element.removeEventListener('transitionend', onTransitionEnd);
      resolve();
    }
    element.addEventListener('transitionend', onTransitionEnd);
  });
}

exports.turnRobot = function (degrees) {
  state.robotRotation += degrees;

  robot.style.transform = 'rotate(' + state.robotRotation + 'deg)';
  robotShadow.style.transform = 'rotate(' + state.robotRotation + 'deg)';

  return Promise.all([
    waitForTransitionEnd(robot),
    waitForTransitionEnd(robotShadow)
  ]);
};

exports.robotLookLeft = function (turns) {
  if (turns === 0) {
    return Promise.resolve();
  }
  robotHead.style.transform = 'rotate(' + turns * -90 + 'deg)';
  return waitForTransitionEnd(robotHead).then(function () {
    robotHead.style.transform = 'rotate(0)';

    return waitForTransitionEnd(robotHead);
  });
};

exports.paint = function (item) {
  var name = 'stroke' + capitalize(item.color) + capitalize(item.type);
  return loadImage(name).then(function (img) {
    drawImage(paintCtx, img, item.x, item.y, img.width, img.height);
  });
};

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function drawPaintLayer() {
  var paint = state.map.paint || [];

  return Promise.all(paint.map(exports.paint));
}

var cloudsStyle;
function updateTransformation() {
  var scale = 'scale(' + state.scale + ')';
  var translate = 'translate(' + -state.pos.x + 'px, ' + -state.pos.y + 'px)';
  container.style.transform = scale + ' ' + translate;
  wrapper.style.backgroundSize = state.scale * 100 + '%';
  clouds.style.backgroundSize = state.scale * 700 + '%';
  var bgX = Math.round(-state.pos.x * state.scale + container.offsetWidth / 2);
  var bgY = Math.round(-state.pos.y * state.scale + container.offsetHeight / 2);
  wrapper.style.backgroundPosition = bgX + 'px ' + bgY + 'px';

  if (cloudsStyle) {
    document.body.removeChild(cloudsStyle);
  }
  cloudsStyle = document.createElement('style');
  cloudsStyle.innerHTML = [
    '@keyframes animateBackground {',
    '  from {background-position: ' + -bgX + 'px ' + (1024  -bgY) + 'px; }',
    '  to {background-position: ' + (2048 - bgX) + 'px ' + -bgY + 'px; }',
    '}'
  ].join('\n');
  document.body.appendChild(cloudsStyle);
  clouds.style.animation = 'animateBackground 360s linear infinite';
}

wrapper.onwheel = function (e) {
  if (e.deltaY < 0) {
    state.scale *= 1 + 0.1;
  } else {
    state.scale *= 1 - 0.1;
  }
  state.scale = Math.max(Math.min(state.scale, MAX_SCALE), MIN_SCALE);
  updateTransformation();

  return false;
};

var mouseStartX;
var mouseStartY;
var startPos;
var pressed;

wrapper.onmousedown = function () {
  pressed = true;
};

wrapper.onmouseup = function () {
  pressed = false;
};

wrapper.onmousemove = function (e) {
  if (pressed) {
    if (!startPos) {
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      startPos = state.pos;
    }
    state.pos = {
      x: startPos.x + (mouseStartX - e.clientX) / state.scale,
      y: startPos.y + (mouseStartY - e.clientY) / state.scale
    };
    updateTransformation();
  } else {
    startPos = null;
  }
};

function drawBackgroundLayer() {
  var map = state.map.map || [];

  // draw fixed 'map' elements
  return Promise.all(map.map(function (row) {
    return Promise.all(row.split('').map(function (column) {
      if (column === ' ' || column === '*') {
        return;
      }
      return loadImage('tile-' + column);
    }));
  })).then(function (imgs) {
    imgs.forEach(function (row, y) {
      row.forEach(function (img, x) {
        if (img) {
          drawImage(bgCtx, img, x, y);
        }
      });
    });
  }).then(function () {
    // draw 'extra' elements
    return drawExtras(bgCtx, {
      tree: 'extra-tree0',
      palm: 'extra-palm0',
      disco: 'extra-disco0'
    });
  });
}

function drawImage(ctx, img, x, y, width, height) {
  // height works better as a default than width in this case.
  width = width || img.height;
  height = height || img.height;
  ctx.drawImage(img, 0, 0, width, height, x * TILE_SIZE, y * TILE_SIZE, width, height);
}

var imgCache = {};
function loadImage(name) {
  if (!imgCache[name]) {
    imgCache[name] = new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.src = 'resources/' + name + '.png';
    });
  }
  return imgCache[name];
}

function drawForegroundLayer() {
  return drawExtras(fgCtx, {
    tree: 'extra-tree2-11',
    palm: 'extra-palm2-11',
  });
}

function drawExtras(ctx, lookupTable) {
  // draw 'extra' elements
  var extra = state.map.extra || [];
  return Promise.all(extra.filter(function (item) {
    return typeof lookupTable[item.name] !== 'undefined';
  }).map(function (item) {
    var name = lookupTable[item.name];
    return loadImage(name).then(function (img) {
      return [ctx, img, item.x, item.y];
    });
  })).then(function (items) {
    items.forEach(function (args) {
      drawImage.apply(null, args);
    });
  });
}
