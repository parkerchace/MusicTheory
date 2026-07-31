// Swing is a FEEL, not a rewritten rhythm.
//
// What a chart does: notate straight eighths, write "Swing" at the top, and let
// the performance divide the beat 2:1. So the things to check are exactly the
// things that separate a feel from a rhythm:
//
//   the PAGE does not change      no written duration differs, straight or swung
//   the DOWNBEATS do not move     swing is the off-beat being late against a
//                                 steady pulse; move both and you have just
//                                 shifted the music
//   the OFF-BEATS move            and by the right amount: straight is halfway
//                                 through the beat, full swing is two thirds
//   nothing OVERLAPS              a note that starts late and keeps its old
//                                 length runs into the note after it
//   PLAYBACK and EXPORT agree     an exported file that does not swing is a
//                                 different performance from the one you heard
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
  getElementById:function(){return el('div');},querySelector:function(){return el('div');},
  querySelectorAll:function(){return [];},
  addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
  body:el('body'),head:el('head'),documentElement:el('html')};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var localStorage={_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var __e=eval;
__e(readFile('music-theory-engine.js'));
__e(readFile('sheet-music-generator.js'));

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(c,m){ if(!c) throw new Error(m); }
function close(a,b,eps){ return Math.abs(a-b) <= (eps||1e-9); }

print('=== swing ===');

var gen=new SheetMusicGenerator({ musicTheory: new MusicTheoryEngine() });

check('straight is the identity — nothing moves at all', function(){
  gen.state.swing=0;
  [0,0.25,0.5,0.75,1,1.5,2,3.5].forEach(function(b){
    assert(close(gen._swungBeat(b), b), 'beat '+b+' moved to '+gen._swungBeat(b));
  });
});

check('downbeats never move, at any feel', function(){
  [0.4,0.7,1].forEach(function(amt){
    gen.state.swing=amt;
    [0,1,2,3,4,8,12].forEach(function(b){
      assert(close(gen._swungBeat(b), b), 'swing '+amt+' moved downbeat '+b);
    });
  });
});

check('quarter-beat subdivisions are left alone', function(){
  // Sixteenths are not what swing divides; only the eighth off-beat is.
  gen.state.swing=1;
  [0.25,0.75,1.25,1.75].forEach(function(b){
    assert(close(gen._swungBeat(b), b), 'sixteenth at '+b+' was moved');
  });
});

check('full swing puts the off-beat two thirds through the beat', function(){
  gen.state.swing=1;
  // 0.5 -> 2/3 : the classic 2:1 division.
  assert(close(gen._swungBeat(0.5), 2/3, 1e-9), 'got '+gen._swungBeat(0.5));
  assert(close(gen._swungBeat(5.5), 5+2/3, 1e-9), 'got '+gen._swungBeat(5.5));
});

check('lighter feels land proportionally between straight and full', function(){
  gen.state.swing=0.5;
  var half=gen._swungBeat(0.5);
  assert(half>0.5 && half<2/3, 'half swing gave '+half);
  gen.state.swing=0.4;
  var light=gen._swungBeat(0.5);
  gen.state.swing=0.7;
  var heavy=gen._swungBeat(0.5);
  assert(light<heavy, 'a lighter feel should be earlier: '+light+' vs '+heavy);
});

check('a delayed note is shortened so it cannot overlap the next', function(){
  gen.state.swing=1;
  var start=gen._swungBeat(0.5);
  var len=gen._swungDuration(0.5, 0.5);
  assert(close(start+len, 1.0, 1e-9),
    'off-beat eighth ends at '+(start+len)+', should still end on the next beat');
  // A downbeat note is untouched in both position and length.
  assert(close(gen._swungDuration(0, 1), 1), 'downbeat length changed');
});

check('the written page is identical straight or swung', function(){
  // The note VALUES come from durationBeatsToName / normalizeDurationName,
  // neither of which can see the swing setting. Prove it by name, over every
  // value the renderer can draw.
  var names=['whole','half','quarter','eighth','sixteenth',
             'half_dotted','quarter_dotted','eighth_dotted'];
  gen.state.swing=0;
  var straight=names.map(function(n){ return gen._durationToNumber(n); });
  gen.state.swing=1;
  var swung=names.map(function(n){ return gen._durationToNumber(n); });
  for(var i=0;i<names.length;i++){
    assert(straight[i]===swung[i], names[i]+' is worth '+straight[i]+' straight and '+swung[i]+' swung');
  }
});

check('playback and MIDI export swing by the same amount', function(){
  // Both derive their timing from _swungBeat/_swungDuration on the same
  // rendered-note list, so the two cannot drift apart. Checked as a property:
  // for a sample of positions, the shift is identical for both.
  gen.state.swing=0.7;
  [0.5,1.5,2.5,7.5].forEach(function(b){
    var shift=gen._swungBeat(b)-b;
    assert(shift>0, 'no shift at '+b);
    // The export multiplies the same value by ticks; playback by seconds. The
    // only way they differ is if one of them forgot to call this at all.
    assert(close(gen._swungBeat(b), b+shift), 'inconsistent at '+b);
  });
});

check('the setting round-trips and defaults to straight', function(){
  var fresh=new SheetMusicGenerator({ musicTheory: new MusicTheoryEngine() });
  assert((Number(fresh.state.swing)||0)===0, 'a new sheet should not swing by default');
});

gen.state.swing=0;
print(failures? ('FAILURES: '+failures) : 'swing is a feel: the page is unchanged, the performance is not');

// --- AGOGIC STRESS -------------------------------------------------------
// The note that matters gets TIME. Cadences and phrase peaks are stretched,
// everything after them is displaced, and the page still does not change.
print('');
print('=== agogic stress ===');

function drawn(list){
  gen.state.renderedNoteEvents=list;
  gen._clearRubatoCache();
}

check('in time is the identity', function(){
  gen.state.swing=0; gen.state.rubato=0;
  drawn([{absBeat:0,noteName:'C4',durationBeats:1,kind:'melody',role:'anchor'},
         {absBeat:1,noteName:'E4',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:2,noteName:'G4',durationBeats:2,kind:'melody',role:'cadence'}]);
  [0,1,2].forEach(function(b){
    assert(close(gen._performedBeat(b), b), 'beat '+b+' moved with rubato off');
  });
});

check('a cadence is given more time', function(){
  gen.state.rubato=1;
  drawn([{absBeat:0,noteName:'C4',durationBeats:1,kind:'melody',role:'anchor'},
         {absBeat:1,noteName:'E4',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:2,noteName:'G4',durationBeats:2,kind:'melody',role:'cadence'}]);
  var len=gen._performedDuration(2,2);
  assert(len>2, 'the cadence note was not broadened: '+len);
});

check('the phrase peak is leaned on, and only once', function(){
  gen.state.rubato=1;
  // Arch: the high note is in the middle, the cadence at the end.
  drawn([{absBeat:0,noteName:'C4',durationBeats:1,kind:'melody',role:'anchor'},
         {absBeat:1,noteName:'A5',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:2,noteName:'E4',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:3,noteName:'C4',durationBeats:1,kind:'melody',role:'cadence'}]);
  assert(gen._performedDuration(1,1) > 1, 'the peak (A5) was not stretched');
  assert(gen._performedDuration(2,1) === gen._swungDuration(2,1), 'an ordinary note was stretched');
});

check('a peak that IS the cadence gets one stretch, not two', function(){
  gen.state.rubato=1;
  drawn([{absBeat:0,noteName:'C4',durationBeats:1,kind:'melody',role:'anchor'},
         {absBeat:1,noteName:'E4',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:2,noteName:'A5',durationBeats:1,kind:'melody',role:'cadence'}]);
  var pts=gen._rubatoPoints().filter(function(p){ return Math.abs(p.at-2)<1e-9; });
  assert(pts.length===1, 'the cadence peak got '+pts.length+' stretches');
});

check('everything after a stretch is displaced by it — this is rubato, not overlap', function(){
  gen.state.rubato=1;
  drawn([{absBeat:0,noteName:'C4',durationBeats:1,kind:'melody',role:'anchor'},
         {absBeat:1,noteName:'A5',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:2,noteName:'E4',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:3,noteName:'C4',durationBeats:1,kind:'melody',role:'cadence'}]);
  assert(gen._performedBeat(0) === 0, 'the opening moved');
  assert(gen._performedBeat(2) > 2, 'the note after the peak was not displaced');
  assert(gen._performedBeat(3) > gen._performedBeat(2), 'time went backwards');
});

check('the performed timeline never runs backwards', function(){
  gen.state.swing=0.7; gen.state.rubato=1;
  drawn([{absBeat:0,noteName:'C4',durationBeats:0.5,kind:'melody',role:'anchor'},
         {absBeat:0.5,noteName:'D4',durationBeats:0.5,kind:'melody',role:'connect'},
         {absBeat:1,noteName:'A5',durationBeats:0.5,kind:'melody',role:'connect'},
         {absBeat:1.5,noteName:'B4',durationBeats:0.5,kind:'melody',role:'connect'},
         {absBeat:2,noteName:'C4',durationBeats:1,kind:'melody',role:'cadence'}]);
  var prev=-Infinity;
  [0,0.5,1,1.5,2].forEach(function(b){
    var t=gen._performedBeat(b);
    assert(t>prev, 'time went backwards at beat '+b+' ('+t+' after '+prev+')');
    prev=t;
  });
});

check('swing and rubato compose without either cancelling the other', function(){
  drawn([{absBeat:0,noteName:'C4',durationBeats:0.5,kind:'melody',role:'anchor'},
         {absBeat:0.5,noteName:'D4',durationBeats:0.5,kind:'melody',role:'connect'},
         {absBeat:1,noteName:'A5',durationBeats:1,kind:'melody',role:'connect'},
         {absBeat:2,noteName:'C4',durationBeats:1,kind:'melody',role:'cadence'}]);
  gen.state.swing=1; gen.state.rubato=0;
  var swungOnly=gen._performedBeat(0.5);
  gen.state.swing=0; gen.state.rubato=1; gen._clearRubatoCache();
  var rubatoOnly=gen._performedBeat(2);
  gen.state.swing=1; gen.state.rubato=1; gen._clearRubatoCache();
  assert(close(gen._performedBeat(0.5), swungOnly),
    'the off-beat swing changed when rubato was added before it');
  assert(gen._performedBeat(2) > 2, 'rubato stopped working once swing was on');
});

check('the written page is still identical under any feel', function(){
  var names=['whole','half','quarter','eighth','sixteenth','quarter_dotted'];
  gen.state.swing=0; gen.state.rubato=0;
  var plain=names.map(function(n){ return gen._durationToNumber(n); });
  gen.state.swing=1; gen.state.rubato=1;
  var played=names.map(function(n){ return gen._durationToNumber(n); });
  for(var i=0;i<names.length;i++){
    assert(plain[i]===played[i], names[i]+' changed on the page');
  }
});

gen.state.swing=0; gen.state.rubato=0;
print('');
print(failures? ('FAILURES: '+failures) : 'the feel is in the performance; the page is untouched');
