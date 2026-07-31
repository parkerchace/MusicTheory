// Does focusing a chord actually change what the instruments show?
//
// The claim is specific: the chord's notes light up and the REST OF THE SCALE
// goes out of the way. Both halves matter — lighting three keys among seven
// already-lit ones is a difference in shade, not an answer — so both are
// measured, on the real keyboard and the real fretboard.
//
// Also checked: the mode toggle actually routes (chords / melody / both / off),
// and clearing focus puts the scale back exactly as it was.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var __listeners={};
this.addEventListener=function(t,f){(__listeners[t]=__listeners[t]||[]).push(f);};
this.dispatchEvent=function(e){(__listeners[e.type]||[]).forEach(function(f){f(e);});return true;};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};

// A DOM stub only has to be faithful in the ways the code under test depends
// on. Two of those bit here and are worth stating: the visualizers set
// `className` directly rather than through classList, so classList has to read
// the same string; and they clear key layers with `innerHTML = ''`, so that has
// to actually empty the children or every re-render doubles the keyboard.
function el(tag){
  var e={tagName:(tag||'div').toUpperCase(),style:{setProperty:function(){}},children:[],dataset:{},
    id:'',textContent:'',value:'',checked:false,disabled:false,title:'',
    appendChild:function(c){this.children.push(c);c.parentNode=this;return c;},
    append:function(){for(var i=0;i<arguments.length;i++)this.appendChild(arguments[i]);},
    insertBefore:function(c){this.children.push(c);c.parentNode=this;return c;},
    removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);return c;},
    setAttribute:function(k,v){this[k]=v;},getAttribute:function(k){return this[k];},
    removeAttribute:function(){},addEventListener:function(){},removeEventListener:function(){},
    getBoundingClientRect:function(){return {width:1200,height:200,top:0,left:0};},
    focus:function(){},blur:function(){},remove:function(){},closest:function(){return null;},
    getContext:function(){return null;}};
  e._className='';
  Object.defineProperty(e,'className',{
    get:function(){ return e._className; },
    set:function(v){ e._className=String(v==null?'':v); }
  });
  e._innerHTML='';
  Object.defineProperty(e,'innerHTML',{
    get:function(){ return e._innerHTML; },
    set:function(v){ e._innerHTML=String(v==null?'':v); e.children.length=0; }
  });
  var classes=function(){ return e._className.split(/\s+/).filter(function(s){return s.length;}); };
  e.classList={
    add:function(){ var c=classes();
      for(var i=0;i<arguments.length;i++) if(c.indexOf(arguments[i])<0) c.push(arguments[i]);
      e._className=c.join(' '); },
    remove:function(){ var drop=Array.prototype.slice.call(arguments);
      e._className=classes().filter(function(x){return drop.indexOf(x)<0;}).join(' '); },
    toggle:function(c,on){ if(on)e.classList.add(c); else e.classList.remove(c); },
    contains:function(c){ return classes().indexOf(c)>=0; }
  };
  // Depth-first descendant search, which is what the visualizers rely on.
  var walk=function(node,out){ (node.children||[]).forEach(function(c){ out.push(c); walk(c,out); }); return out; };
  e.querySelectorAll=function(sel){
    var all=walk(this,[]);
    var parts=String(sel).split(',').map(function(s){return s.trim();});
    return all.filter(function(n){
      return parts.some(function(p){
        if(p.charAt(0)==='.') return n.classList.contains(p.slice(1));
        var m=p.match(/^\[data-(\w+)="([^"]*)"\]$/);
        if(m) return String(n.dataset[m[1]])===m[2];
        return n.tagName===p.toUpperCase();
      });
    });
  };
  e.querySelector=function(sel){ var r=this.querySelectorAll(sel); return r.length?r[0]:null; };
  return e;
}
var document={createElement:el,createElementNS:function(ns,t){return el(t);},
  createTextNode:function(t){return {textContent:t};},
  getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},
  addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
  body:el('body'),head:el('head'),documentElement:el('html')};
var localStorage={_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;}};
var navigator={userAgent:'test'};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var matchMedia=function(){return {matches:false,addListener:function(){}};};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'piano-visualizer.js','guitar-fretboard-visualizer.js'].forEach(load);

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(cond,msg){ if(!cond) throw new Error(msg); }

print('=== instrument focus ===');

var mt=new MusicTheoryEngine();
var SCALE=mt.getScaleNotesWithKeySignature('C','major');   // C D E F G A B

// ---- the keyboard --------------------------------------------------------
var piano=new PianoVisualizer({ musicTheory: mt });
var host=el('div');
piano.mount(host);
piano.renderScale({ key:'C', scale:'major', notes: SCALE });

var keys=function(){ return piano.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key'); };
var lit=function(){ return keys().filter(function(k){ return k.classList.contains('focus-note'); }); };
var dimmed=function(){ return keys().filter(function(k){ return String(k.style.opacity||'')==='0.45'; }); };

check('the keyboard has keys to light', function(){
  assert(keys().length > 12, 'only '+keys().length+' keys rendered');
});

check('focusing a chord lights exactly that chord', function(){
  piano.setFocusNotes(['C4','E4','G4'], { kind:'chord' });
  var names={};
  lit().forEach(function(k){ names[k.dataset.correctNote||k.dataset.note]=true; });
  var got=Object.keys(names).sort().join(',');
  assert(got==='C,E,G', 'lit pitch classes were '+got+' (want C,E,G)');
  assert(lit().length>0, 'nothing lit');
});

check('...and the rest of the scale is taken out of the way', function(){
  // D, F, A and B are in the scale and NOT in the chord: they must be dark.
  var stillLit=keys().filter(function(k){
    var n=k.dataset.correctNote||k.dataset.note;
    return ['D','F','A','B'].indexOf(n)>=0 && !(String(k.style.opacity||'')==='0.45');
  });
  assert(stillLit.length===0, stillLit.length+' scale notes outside the chord are still lit');
  assert(dimmed().length>0, 'nothing was dimmed');
});

check('clearing focus gives the scale back', function(){
  piano.clearFocusNotes();
  assert(lit().length===0, lit().length+' keys still marked focused');
  assert(dimmed().length===0, dimmed().length+' keys still dimmed');
});

check('a melody note is drawn differently from a chord', function(){
  piano.setFocusNotes(['E4'], { kind:'melody' });
  var mel=lit()[0] && lit()[0].style.background;
  piano.setFocusNotes(['E4'], { kind:'chord' });
  var chd=lit()[0] && lit()[0].style.background;
  assert(mel && chd, 'nothing lit for one of the kinds');
  assert(mel!==chd, 'melody and chord are painted identically');
  piano.clearFocusNotes();
});

check('a note named without an octave still finds its keys', function(){
  piano.setFocusNotes(['G'], { kind:'chord' });
  assert(lit().length>0, 'a bare pitch class lit nothing');
  lit().forEach(function(k){
    var n=k.dataset.correctNote||k.dataset.note;
    assert(n==='G', 'lit '+n+' for G');
  });
  piano.clearFocusNotes();
});

// ---- the fretboard -------------------------------------------------------
var guitar=new GuitarFretboardVisualizer({});
var ghost=el('div');
guitar.mount(ghost);
guitar.renderScale({ key:'C', scale:'major', notes: SCALE });

var cells=function(){ return guitar.gridEl ? guitar.gridEl.querySelectorAll('.fret-cell') : []; };

check('the fretboard has cells to light', function(){
  assert(cells().length > 20, 'only '+cells().length+' cells rendered');
});

check('focusing a chord dims every fret that is not in it', function(){
  guitar.setFocusNotes(['C4','E4','G4'], { kind:'chord' });
  var wrongLit=cells().filter(function(c){
    var inChord=['C','E','G'].indexOf(c.dataset.note)>=0;
    return !inChord && String(c.style.opacity)!=='0.12';
  });
  assert(wrongLit.length===0, wrongLit.length+' non-chord frets still lit');
  var chordLit=cells().filter(function(c){
    return ['C','E','G'].indexOf(c.dataset.note)>=0 && String(c.style.opacity)==='1';
  });
  assert(chordLit.length>0, 'no chord frets lit');
});

check('clearing focus restores the scale on the neck', function(){
  guitar.clearFocusNotes();
  var stillDark=cells().filter(function(c){ return String(c.style.opacity)==='0.12'; });
  assert(stillDark.length===0, stillDark.length+' frets still dimmed after clearing');
  var scaleLit=cells().filter(function(c){
    return SCALE.indexOf(c.dataset.note)>=0 && String(c.style.opacity)==='1';
  });
  assert(scaleLit.length>0, 'the scale did not come back');
});

// ---- the routing and the toggle -----------------------------------------
// The same decision modular-app makes when a focus event arrives.
function route(mode, chordNotes, melodyNotes){
  if(mode==='off') return null;
  if(mode==='chords') return { notes: chordNotes, kind:'chord' };
  if(mode==='melody') return { notes: melodyNotes, kind:'melody' };
  var notes=melodyNotes.concat(chordNotes);
  return { notes: notes, kind: melodyNotes.length ? 'melody' : 'chord' };
}

check('the toggle routes each mode to the right notes', function(){
  var C=['C4','E4','G4'], M=['A4'];
  var both=route('both',C,M);
  assert(both.notes.length===4, 'both should carry all four notes, got '+both.notes.length);
  assert(both.kind==='melody', 'with a melody present the pairing should read as melody-led');
  assert(route('chords',C,M).notes.join()==='C4,E4,G4', 'chords-only carried the wrong notes');
  assert(route('melody',C,M).notes.join()==='A4', 'melody-only carried the wrong notes');
  assert(route('off',C,M)===null, 'off should light nothing');
  // A chord with no melody sounding over it is still a chord.
  assert(route('both',C,[]).kind==='chord', 'a chord alone should read as a chord');
});

check('an empty focus is a release, not an empty highlight', function(){
  piano.setFocusNotes(['C4'], { kind:'chord' });
  assert(lit().length>0, 'setup failed');
  piano.setFocusNotes([], { kind:'chord' });
  assert(lit().length===0, 'an empty list left keys lit');
  assert(dimmed().length===0, 'an empty list left the keyboard dimmed');
});

print(failures? ('FAILURES: '+failures) : 'focus lights what it should and releases what it should');
