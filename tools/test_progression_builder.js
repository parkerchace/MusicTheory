// Node test for ProgressionBuilder with whole tone hexatonic
const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Simple loader for browser JS classes
function loadScript(filePath, context) {
  const code = fs.readFileSync(filePath, 'utf8');
  vm.runInContext(code, context, { filename: filePath });
}

const context = {
  console,
  window: {},
  document: {
    createElement: () => ({ style: {}, appendChild: () => {}, innerHTML: '', querySelector: () => null }),
    querySelector: () => null,
  },
  CustomEvent: function() {},
  navigator: {},
  setTimeout,
  clearTimeout,
  Math,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
};
context.global = context;

vm.createContext(context);

loadScript(path.join(__dirname, '..', 'music-theory-engine.js'), context);
loadScript(path.join(__dirname, '..', 'progression-builder.js'), context);

const MusicTheoryEngine = context.window.MusicTheoryEngine;
const ProgressionBuilder = context.window.ProgressionBuilder;

const engine = new MusicTheoryEngine();
const builder = new ProgressionBuilder(engine);

// Simulate scale change
builder.state.currentKey = 'C';
builder.state.currentScale = 'whole_tone_hexatonic';

// Provide dummy number generator/scale library? Not needed for direct call

console.log('=== Test ProgressionBuilder.generateChordForDegree ===');
for (let degree = 1; degree <= 6; degree++) {
  const chord = builder.generateChordForDegree(degree, 0);
  console.log(`Degree ${degree}:`, chord);
}
