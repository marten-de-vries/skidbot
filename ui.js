/* globals document */

"use strict";

var events = require('events');
var parser = require('robomind-parser');

var self = new events.EventEmitter();

var runButton = document.getElementById('run-button');

runButton.onclick = function () {
  self.emit('run');
};

self.enableRunButton = function (enable) {
  runButton.disabled = !enable;
};

var speedSlider = document.getElementById('speed-slider');
function onSpeedChange() {
  // the lower the speed value, the higher the speed. So invert the
  // slider value.
  var value = 11 - parseFloat(speedSlider.value, 10);
  // speed is exponential; the slider is linear. Fix the value.
  self.speed = Math.pow(1.2, value) - 1;

  self.emit('speedchange');
}
speedSlider.onchange = onSpeedChange;
onSpeedChange();

// CodeMirror editor
var CodeMirror = require('codemirror');
require('codemirror/addon/mode/simple');
require('codemirror/addon/selection/active-line');

function regexToMatchWords(words) {
  return new RegExp('(?:' + words.join('|') + ')\\b', 'i');
}

parser.languages.forEach(function (lang) {
  var keywords = parser.info('keywords', lang);
  var atoms = parser.info('atoms', lang);
  var vars = parser.info('variables', lang);

  CodeMirror.defineSimpleMode("robomind-" + lang, {
    start: [
      {regex: /#.*/, token: 'comment'},
      {regex: regexToMatchWords(keywords), token: 'keyword'},
      {regex: /\d+/, token: 'number'},
      {regex: regexToMatchWords(atoms), token: 'atom'},

      // split over multiple lines for readability
      {regex: regexToMatchWords(vars), token: 'variable'},

      {regex: /[\{\(]/, indent: true},
      {regex: /[\}\)]/, dedent: true},

      // much easier to specify what shouldn't be highlighted of the
      // remaining stuff than to specify the correct unicode ranges in
      // a JS regex...
      {regex: /[^\s+-/=~\*]+/, token: 'variable-2'}
    ],
    meta: {
      lineComment: "#",
      electricChars: '{()}'
    }
  });
});

var editor = new CodeMirror(document.getElementById('tools'), {
  indentUnit: 4,
  lineNumbers: true,
  styleActiveLine: true,
  gutters: ['CodeMirror-linenumbers', 'interpreter-position']
});

self.setScript = function (script) {
  editor.setValue(script);
};

self.getScript = function () {
  return editor.getValue();
};

var marker = document.createElement("div");
marker.style.color = '#822';
marker.innerHTML = '▶';

self.markPosition = function (line) {
  self.stopMarkingPosition();
  editor.setGutterMarker(line - 1, 'interpreter-position', marker);
};

self.stopMarkingPosition = function () {
  editor.clearGutter('interpreter-position');
};

var langChoice = document.getElementById('language-choice');
function onLangChange() {
  self.language = langChoice.value;
  editor.setOption('mode', 'robomind-' + self.language);
}
langChoice.onchange = onLangChange;
onLangChange();

module.exports = self;
