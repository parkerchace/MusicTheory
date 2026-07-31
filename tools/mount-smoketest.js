// Actually MOUNT the sheet generator against a stubbed DOM.
// A parse check cannot catch a scope error like SHEET_VOICES being declared
// inside a block the class body cannot see — only running the code can.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){ print('  console.error: '+Array.prototype.join.call(arguments,' ')); }};
var localStorage={ _d:{}, getItem:function(k){return this._d[k]||null;}, setItem:function(k,v){this._d[k]=v;} };
var navigator={};
function el(tag){
  var e={ tagName:(tag||'div').toUpperCase(), style:{setProperty:function(){}}, children:[], dataset:{},
    className:'', id:'', textContent:'', innerHTML:'', value:'', checked:false, disabled:false, title:'',
    appendChild:function(c){ this.children.push(c); return c; },
    append:function(){ for(var i=0;i<arguments.length;i++) this.children.push(arguments[i]); },
    insertBefore:function(c){ this.children.push(c); return c; },
    removeChild:function(c){ var i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); return c; },
    setAttribute:function(k,v){ this[k]=v; }, getAttribute:function(k){ return this[k]; },
    removeAttribute:function(){}, addEventListener:function(){}, removeEventListener:function(){},
    querySelector:function(){ return null; }, querySelectorAll:function(){ return []; },
    getBoundingClientRect:function(){ return {width:900,height:400,top:0,left:0}; },
    classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},
    focus:function(){}, blur:function(){}, remove:function(){}, closest:function(){ return null; },
    getContext:function(){ return null; } };
  Object.defineProperty(e,'firstChild',{get:function(){return this.children[0]||null;}});
  Object.defineProperty(e,'parentNode',{get:function(){return null;},configurable:true});
  return e;
}
var document={
  createElement:el, createElementNS:function(ns,t){ return el(t); },
  createTextNode:function(t){ return {textContent:t}; },
  getElementById:function(){ return el('div'); },
  querySelector:function(){ return el('div'); }, querySelectorAll:function(){ return []; },
  addEventListener:function(){}, removeEventListener:function(){}, dispatchEvent:function(){},
  body: el('body'), head: el('head'), documentElement: el('html')
};
var CustomEvent=function(n,o){ this.type=n; this.detail=o&&o.detail; };
var setTimeout=function(f){ return 0; }; var clearTimeout=function(){};
var requestAnimationFrame=function(){ return 0; };

var __e=eval;
__e(readFile('music-theory-engine.js'));
__e(readFile('sheet-music-generator.js'));

var failures=0;
function check(name, fn){
  try { fn(); print('  OK   '+name); }
  catch(e){ failures++; print('  FAIL '+name+': '+e); }
}

print('=== mount smoke test ===');
var gen=null;
check('construct', function(){ gen = new SheetMusicGenerator({ musicTheory: new MusicTheoryEngine() }); });
check('mount (builds the whole toolbar + voicing panel)', function(){
  gen.mount(el('div'));
});
// The eval'd module's top-level `const` is not visible to this test scope in
// this engine, so probe the voices through the object's own API instead —
// which is what the app does anyway.
check('_voice() resolves for every instrument the toolbar offers', function(){
  var keys=['piano','piano-reverb','piano-pad','piano-strings','strings','guitar','ep','rnb-synth','rnb-pad'];
  var seen={};
  keys.forEach(function(k){
    gen.state.instrument=k;
    var v=gen._voice();
    if(!v||!Array.isArray(v.osc)||!v.env) throw new Error('bad voice: '+k);
    var sig=JSON.stringify([v.osc,v.env,v.filter,v.reverb]);
    if(seen[sig]) throw new Error(k+' is identical to '+seen[sig]);
    seen[sig]=k;
  });
  gen.state.instrument='piano';
});
check('_voice() falls back on an unknown instrument', function(){
  gen.state.instrument='does-not-exist';
  var v=gen._voice();
  if(!v||!v.osc) throw new Error('no fallback');
  gen.state.instrument='piano';
});
check('scheduling a note builds a valid graph for every voice', function(){
  var ctx={ currentTime:0, sampleRate:44100, state:'running', destination:{connect:function(n){return n;}},
    createOscillator:function(){ return mk('osc'); }, createGain:function(){ return mk('gain'); },
    createBiquadFilter:function(){ return mk('filter'); }, createConvolver:function(){ return mk('conv'); },
    createBuffer:function(c,l){ return { getChannelData:function(){ return new Float32Array(l); } }; },
    resume:function(){} };
  function mk(kind){ return { __k:kind, type:'', buffer:null,
    frequency:{value:0}, Q:{value:0}, detune:{value:0},
    gain:{ value:1, setValueAtTime:function(v){ if(!(v>0)) throw new Error('non-positive setValue'); },
           exponentialRampToValueAtTime:function(v){ if(!(v>0)) throw new Error('non-positive ramp'); } },
    connect:function(n){ return n; },
    start:function(t){ if(!(t>=0)) throw new Error('bad start'); },
    stop:function(t){ if(!(t>=0)) throw new Error('bad stop'); } }; }
  ['piano','piano-reverb','piano-pad','piano-strings','strings','guitar','ep','rnb-synth','rnb-pad']
    .forEach(function(k){
      gen.state.instrument=k; gen._audioCtx=ctx; gen._midiSources=[]; gen._reverbSend=null; gen._reverbCtx=null;
      gen._playSingleNote('C4', 0.5, 2.0, 0.3);
      if(!gen._midiSources.length) throw new Error('no oscillators for '+k);
    });
  gen.state.instrument='piano';
});
print(failures? ('FAILURES: '+failures) : 'all mount checks passed');
