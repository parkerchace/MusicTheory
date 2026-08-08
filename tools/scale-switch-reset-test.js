// What you typed belongs to the scale you typed it against.
//
// "iiidim7 IImaj7 I7" names three chords of one scale. Switch to another and
// those numerals get re-read against notes that were never there — the box
// went on showing them, and the sheet went on playing whatever they happened
// to resolve to in a scale they were not chosen for.
//
// A change of KEY is the opposite case: the same degrees and the same
// qualities, moved bodily to another tonic. Typing has to survive that.
//
// This drives the real scaleChanged handler from modular-app, with a real
// NumberGenerator mounted on a stub element, and reads the value the numbers
// box would actually be rendered with.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
function el(tag){
  var e={tagName:(tag||'div').toUpperCase(),style:{setProperty:function(){}},children:[],dataset:{},
    className:'',id:'',textContent:'',innerHTML:'',value:'',checked:false,disabled:false,title:'',
    appendChild:function(c){this.children.push(c);return c;},
    append:function(){for(var i=0;i<arguments.length;i++)this.children.push(arguments[i]);},
    insertBefore:function(c){this.children.push(c);return c;},
    removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);return c;},
    setAttribute:function(k,v){this[k]=v;},getAttribute:function(k){return this[k];},
    removeAttribute:function(){},addEventListener:function(){},removeEventListener:function(){},
    querySelector:function(){return null;},querySelectorAll:function(){return [];},
    getBoundingClientRect:function(){return {width:900,height:400,top:0,left:0};},
    classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},
    focus:function(){},blur:function(){},remove:function(){},closest:function(){return null;},
    getContext:function(){return null;}};
  return e;
}
var document={createElement:el,createElementNS:function(ns,t){return el(t);},
  createTextNode:function(t){return {textContent:t};},
  // The generator wires its buttons up by id without checking; hand out a
  // stub element per id so mounting it for real is possible here.
  _byId:{},
  getElementById:function(id){ return this._byId[id] || (this._byId[id]=el('div')); },
  querySelector:function(){return null;},querySelectorAll:function(){return [];},
  addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
  body:el('body'),head:el('head'),documentElement:el('html'),readyState:'complete'};
window.addEventListener=function(){};window.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'number-generator.js'].forEach(load);
__e(readFile('modular-app.js') + ';window.ModularMusicTheoryApp=ModularMusicTheoryApp;');

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }

print('=== what a scale switch keeps and what it drops ===');

var mt=new MusicTheoryEngine();
window.MusicTheoryEngine=MusicTheoryEngine;
var scaleData=window.EMBEDDED_SCALES_DATA.scales, intervals={};
scaleData.forEach(function(s){ intervals[s.id]=s.intervals; });
mt.scales=intervals;

var ng=new NumberGenerator({ musicTheory: mt });
ng.musicTheory=mt;
var box=el('div');
ng.mount(box);

// The library the app listens to, and the sheet it writes to.
var handlers={};
var lib={
  scaleStack:[], _key:'C', _scale:'major',
  getCurrentKey:function(){ return this._key; },
  getCurrentScale:function(){ return this._scale; },
  getCurrentScaleNotes:function(){ return mt.getScaleNotes(this._key,this._scale); },
  on:function(ev,fn){ (handlers[ev]=handlers[ev]||[]).push(fn); },
  fire:function(key,scale){
    this._key=key; this._scale=scale;
    (handlers.scaleChanged||[]).forEach(function(fn){
      fn({ key:key, scale:scale, notes:mt.getScaleNotes(key,scale) });
    });
  }
};
var sheetChords=null;
var sheet={
  state:{ barChords:[], barDegrees:[], musicalPhrase:null },
  setKeyAndScale:function(){}, setBarMode:function(){}, setHarmonizationMode:function(){},
  setBarChords:function(c){ sheetChords=c; this.state.barChords=c; },
  setBarDegrees:function(){}, render:function(){}
};

// Everything else the handler touches answers to anything.
function anyStub(){
  var f=function(){ return anyStub(); };
  return new Proxy(f,{ get:function(){ return anyStub(); }, apply:function(){ return anyStub(); } });
}
var base=Object.create(window.ModularMusicTheoryApp.prototype);
base.musicTheory=mt;
base.numberGenerator=ng;
base.scaleLibrary=lib;
base.sheetMusicGenerator=sheet;
var app=new Proxy(base,{
  get:function(t,p){ return (p in t) ? t[p] : anyStub(); },
  set:function(t,p,v){ t[p]=v; return true; }
});

check('the real scaleChanged handler is wired up', function(){
  window.ModularMusicTheoryApp.prototype.setupModuleIntegration.call(app);
  if(!(handlers.scaleChanged||[]).length) throw new Error('nothing listening');
});

/** What the numbers box would be showing: the value of #manual-numbers. */
function boxValue(){
  ng.render();
  var m=String(box.innerHTML).match(/id="manual-numbers"[\s\S]*?value="([^"]*)"/);
  if(!m) throw new Error('no manual-numbers input rendered');
  return m[1];
}
/** The scale's own run, as the box writes it. */
function ownRun(key,scale){
  var notes=mt.getScaleNotes(key,scale);
  var was=[ng.currentKey,ng.currentScale,ng.currentScaleNotes];
  ng.currentKey=key; ng.currentScale=scale; ng.currentScaleNotes=notes;
  var run=[];
  for(var d=1;d<=notes.length;d++) run.push(ng.numberToRoman(d));
  ng.currentKey=was[0]; ng.currentScale=was[1]; ng.currentScaleNotes=was[2];
  return run.join(' ');
}
/** Type a line into the box and commit it, the way blur does. */
function type(text){
  ng.state.isManualEditing=true;
  ng.state.manualRawInput=text;
  ng.state.manualRomanMode=/[IViv]/.test(text);
  ng.state.pendingManualNumbers=text.split(/[\s,]+/)
    .filter(function(t){ return /^[0-9]+$/.test(t); })
    .map(function(t){ return parseInt(t,10); });
  ng.commitManualNumbers(el('input'), { force:true });
}

lib.fire('C','major');   // settle everything on the opening scale

check('what is typed stays put while nothing changes', function(){
  type('iiidim7 IImaj7 I7');
  if(boxValue()!=='iiidim7 IImaj7 I7') throw new Error('the box reads '+boxValue());
});

check('a change of key keeps it', function(){
  lib.fire('Eb','major');
  if(boxValue()!=='iiidim7 IImaj7 I7') throw new Error('a key change ate it: '+boxValue());
});

check('and the sheet reads those same numerals in the new key', function(){
  if(!sheetChords||sheetChords.length!==3) throw new Error('the sheet has '+(sheetChords&&sheetChords.length)+' bars');
  var roots=sheetChords.map(function(c){ return c.root; });
  print('       '+sheetChords.map(function(c){ return c.fullName; }).join('  '));
  // iii, II, I of Eb major — the same three degrees, moved bodily.
  if(roots.join(' ')!=='G F Eb') throw new Error('roots are '+roots.join(' ')+', want G F Eb');
});

check('a change of scale drops it for the new scale\'s own degrees', function(){
  type('iiidim7 IImaj7 I7');
  lib.fire('Eb','dorian');
  var want=ownRun('Eb','dorian');
  if(boxValue()!==want) throw new Error('the box reads '+boxValue()+', want '+want);
});

check('and the sheet is playing that scale, not the old numerals', function(){
  if(!sheetChords || !sheetChords.length) throw new Error('the sheet was never told');
  var names=sheetChords.map(function(c){ return c.fullName; });
  print('       '+names.join('  '));
  if(sheetChords.length!==7) throw new Error('got '+sheetChords.length+' chords');
  var notes=mt.getScaleNotes('Eb','dorian');
  sheetChords.forEach(function(c,i){
    var want=mt.getDiatonicChord(i+1,'Eb','dorian');
    if(c.root!==want.root||c.chordType!==want.chordType){
      throw new Error('bar '+(i+1)+' is '+c.fullName+', the scale says '+want.fullName);
    }
    if(notes.indexOf(c.root)<0) throw new Error(c.root+' is not in this scale');
  });
});

check('a typed run of numbers goes the same way', function(){
  type('2 5 1');
  if(ng.getCurrentNumbers().join(' ')!=='2 5 1') throw new Error('the run never took: '+ng.getCurrentNumbers().join(' '));
  lib.fire('Eb','lydian');
  if(ng.getCurrentNumbers().length!==7) throw new Error('kept '+ng.getCurrentNumbers().join(' '));
  if(boxValue()!==ownRun('Eb','lydian')) throw new Error('the box reads '+boxValue());
});

check('a typed run of numbers survives a key change', function(){
  type('2 5 1');
  lib.fire('A','lydian');
  if(ng.getCurrentNumbers().join(' ')!=='2 5 1') throw new Error('a key change ate it: '+ng.getCurrentNumbers().join(' '));
});

// The box used to be cleared only as a side effect of the sheet being
// re-seeded — so whenever the seed declined to run, the typing stayed on
// screen through any number of scale changes. A generated piece owns the
// sheet and the seed will not touch it: that is the state this was reported
// in, and the box has to reset on its own account.
check('the box resets even when the sheet is holding a generated piece', function(){
  type('iiidim7 IImaj7 I7');
  sheet.state.musicalPhrase={ generated:true };
  try {
    lib.fire('Eb','mixolydian');
    var want=ownRun('Eb','mixolydian');
    if(boxValue()!==want) throw new Error('the box reads '+boxValue()+', want '+want);
  } finally { sheet.state.musicalPhrase=null; }
});

check('a temporary scale context leaves the typing alone', function(){
  type('iiidim7 IImaj7 I7');
  lib.scaleStack.push({ currentKey:'A', currentScale:'lydian' });
  lib.fire('F','phrygian');            // an excursion nobody asked for
  var during=boxValue();
  lib.scaleStack.pop();
  if(during!=='iiidim7 IImaj7 I7') throw new Error('an excursion ate it: '+during);
});

print(failures? ('FAILURES: '+failures) : 'a scale switch drops what was typed; a key change does not');
if (failures) { throw new Error(failures+' scale-switch check(s) failed'); }
