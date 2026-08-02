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

gen.state.swing=0; gen.state.rubato=0; gen._clearRubatoCache();

print('');
print('=== the feel follows the form ===');
//
// The complaint this answers: swing and agogic stress were too RIGID. One
// amount from the first bar to the last is not a feel, it is a genre label —
// real playing is straight through the first statement, loosens a little, gets
// expressive where the music opens up, and squares off at the end. So the
// control sets the MOST the piece swings, and the amount steps at section
// boundaries.
//
// Measured on a four-section form of the shape almost every song has: a
// statement, a restatement of it, a bridge, and a final return.
var FORM={
  sections:[
    {label:'A1', letter:'A', stability:'stable',        startBar:0,  endBar:3},
    {label:'A2', letter:'A', stability:'stable',        startBar:4,  endBar:7},
    {label:'B',  letter:'B', stability:'transitional',  startBar:8,  endBar:11, isClimax:true},
    {label:'A3', letter:'A', stability:'stable',        startBar:12, endBar:15, isFinal:true}
  ]
};
// The off-beat delay actually applied inside each section, which is the thing a
// listener hears — not the setting, and not the multiplier.
function delayIn(bar){ var b=bar*4+0.5; return gen._swungBeat(b)-b; }

check('the feel is not one number for the whole piece', function(){
  gen.state.form=FORM;
  gen.state.musicalPhrase={beatsPerBar:4};
  gen.state.swing=1; gen._clearRubatoCache();
  var d=[delayIn(1),delayIn(5),delayIn(9),delayIn(13)];
  var distinct=d.filter(function(v,i){ return d.indexOf(v)===i; });
  assert(distinct.length>=3, 'only '+distinct.length+' distinct feels across four sections: '+d.join(', '));
});

check('the first statement is straighter than the bridge', function(){
  gen.state.swing=1; gen._clearRubatoCache();
  assert(delayIn(1) < delayIn(9),
    'the opening ('+delayIn(1).toFixed(4)+') swings at least as hard as the bridge ('+delayIn(9).toFixed(4)+')');
});

check('the restatement loosens on the statement', function(){
  gen.state.swing=1; gen._clearRubatoCache();
  assert(delayIn(5) > delayIn(1),
    'the second A ('+delayIn(5).toFixed(4)+') is no looser than the first ('+delayIn(1).toFixed(4)+')');
});

check('the last section squares off again', function(){
  gen.state.swing=1; gen._clearRubatoCache();
  assert(delayIn(13) < delayIn(9),
    'the final return ('+delayIn(13).toFixed(4)+') is as loose as the bridge ('+delayIn(9).toFixed(4)+')');
});

check('the control still means the most it swings', function(){
  // Somewhere in the piece the chosen amount is delivered in full, or the
  // control has quietly become a suggestion.
  gen.state.swing=1; gen._clearRubatoCache();
  var full=(2/3)-0.5;
  var best=Math.max(delayIn(1),delayIn(5),delayIn(9),delayIn(13));
  assert(close(best, full, 1e-9), 'the hardest the piece swings is '+best.toFixed(4)+', not '+full.toFixed(4));
});

check('...and straight is still straight everywhere', function(){
  gen.state.swing=0; gen._clearRubatoCache();
  [1,5,9,13].forEach(function(bar){
    assert(close(delayIn(bar),0), 'bar '+bar+' moved with the feel off');
  });
});

check('expressive weight goes where swing does NOT', function(){
  // The two curves are deliberately different: swing is EASE and belongs in the
  // middle, agogic stretching is WEIGHT and belongs at the close. Tying both to
  // one number made every piece do them together, which is the rigidity the
  // whole change is about.
  gen.state.swing=1; gen._clearRubatoCache();
  var f0=gen._feelAt(1*4+0.5), fEnd=gen._feelAt(13*4+0.5), fMid=gen._feelAt(9*4+0.5);
  assert(fEnd.rubato > fEnd.swing,
    'the final section is looser than it is broad — it should be the other way round');
  assert(fEnd.rubato > f0.rubato, 'the close carries no more weight than the opening');
  assert(fMid.swing > fEnd.swing, 'the bridge does not swing harder than the close');
});

check('no form plan means the control is a constant, exactly as before', function(){
  gen.state.form=null; gen._clearRubatoCache();
  gen.state.swing=1;
  assert(close(gen._swungBeat(0.5), 2/3, 1e-9), 'got '+gen._swungBeat(0.5));
  assert(close(gen._swungBeat(41.5), 41+2/3, 1e-9), 'got '+gen._swungBeat(41.5));
});

gen.state.swing=0; gen.state.rubato=0; gen.state.form=null; gen._clearRubatoCache();

print('');
print('=== displaced accent ===');
//
// Syncopation is usually built the wrong way round — put an accent off the beat
// and call it syncopated. What a listener actually hears is a placement they
// were already expecting being MISSED, so the expectation has to be built first
// and the device belongs to a phrase rather than to a note.
//
// So the load-bearing check is not "does something land off the beat" but "was
// the placement it departs from stated twice before it was departed from".
// Everything else here exists to stop the device becoming a different tempo.

// TWELVE BARS OF THE SAME FIGURE, then two of another.
//
// Dense on purpose — eighth-note attacks, so the gap between them is half a
// beat and the shift cap actually BINDS. The first attempt at this used two
// attacks per bar, and with that much space a displacement four times too large
// still did not collide with anything: three of four deliberate breakages went
// undetected, and the checks looked exactly as green as they do now. Test data
// that cannot express the failure is the same as no check.
function figure(bar, offs){
  return offs.map(function(o){
    return {absBeat:bar*4+o, noteName:'C5', durationBeats:0.5, kind:'melody', role:null};
  });
}
var EIGHTHS=[0,0.5,1,1.5,2,2.5,3,3.5];
var DRAWN=[];
for(var __b=0;__b<12;__b++) DRAWN=DRAWN.concat(figure(__b,EIGHTHS));
[12,13].forEach(function(b){ DRAWN=DRAWN.concat(figure(b,[0,2])); });

function withDisplace(amt){
  gen.state.swing=0; gen.state.rubato=0; gen.state.form=null;
  gen.state.displace=amt;
  gen.state.musicalPhrase={beatsPerBar:4};
  gen.state.renderedNoteEvents=DRAWN;
  gen._clearRubatoCache();
  return gen._displacementPoints();
}
// The attack pattern of a bar, read off the drawn notes rather than off the
// engine's own bookkeeping.
function patternOf(bar){
  return DRAWN.filter(function(e){ return Math.floor(e.absBeat/4)===bar; })
              .map(function(e){ return (e.absBeat-bar*4).toFixed(2); })
              .join(',');
}

check('on the grid is the identity — nothing moves at all', function(){
  withDisplace(0);
  DRAWN.forEach(function(e){
    assert(close(gen._performedBeat(e.absBeat), e.absBeat),
      'beat '+e.absBeat+' moved with displacement off');
  });
});

check('the placement is ESTABLISHED before it is departed from', function(){
  // The claim, checked against the notes: the two bars before a displaced one
  // must state the same figure, and must not themselves have been displaced —
  // a bar that moved cannot be what taught the ear where the beat was.
  var pts=withDisplace(1);
  assert(pts.length>0, 'nothing was displaced at all');
  var moved={}; pts.forEach(function(p){ moved[Math.round(p.from/4)]=true; });
  pts.forEach(function(p){
    var bar=Math.round(p.from/4);
    assert(bar>=2, 'bar '+bar+' has no room for two statements before it');
    [bar-1, bar-2].forEach(function(b){
      assert(patternOf(b)===patternOf(bar),
        'bar '+bar+' was displaced but bar '+b+' states a different figure');
      assert(!moved[b],
        'bar '+bar+' was displaced against bar '+b+', which was displaced too');
    });
  });
});

check('a figure heard only twice is left alone', function(){
  // Bars 12-13 state their own figure exactly twice: enough to establish a
  // placement, never enough to have departed from one.
  var pts=withDisplace(1);
  pts.forEach(function(p){
    assert(Math.round(p.from/4) < 12, 'the two-bar figure at the end was displaced');
  });
});

check('it happens twice at most — a push everywhere is a different tempo', function(){
  var pts=withDisplace(1);
  assert(pts.length<=2, pts.length+' displacements in fourteen bars');
});

check('and it does happen more than once when there is room', function(){
  // The other failure mode: a device so rare it may as well not exist. Twelve
  // statements of one figure should be departed from more than once.
  var pts=withDisplace(1);
  assert(pts.length===2, 'only '+pts.length+' displacement in twelve statements of one figure');
});

check('the displaced figure comes back — nothing after it is moved', function(){
  var pts=withDisplace(1);
  var last=pts[pts.length-1];
  DRAWN.filter(function(e){ return e.absBeat>=last.to-1e-9; }).forEach(function(e){
    assert(close(gen._performedBeat(e.absBeat), e.absBeat),
      'beat '+e.absBeat+', after the displacement, was moved too');
  });
});

check('the whole bar moves together, not one voice of it', function(){
  var pts=withDisplace(1);
  pts.forEach(function(p){
    var inSpan=DRAWN.filter(function(e){ return e.absBeat>=p.from-1e-9 && e.absBeat<p.to-1e-9; });
    assert(inSpan.length>1,'span had nothing in it');
    var shifts=inSpan.map(function(e){ return gen._performedBeat(e.absBeat)-e.absBeat; });
    shifts.forEach(function(sh){
      assert(close(sh, shifts[0], 1e-9), 'the bar was pulled apart: '+shifts.join(', '));
    });
  });
});

check('the shift never reaches the attack it is moving towards', function(){
  // Stated directly rather than left to the monotonicity check to notice: the
  // cap is half the gap, and half a gap of half a beat is a quarter.
  var pts=withDisplace(1);
  pts.forEach(function(p){
    assert(Math.abs(p.shift) <= 0.25 + 1e-9,
      'a shift of '+p.shift.toFixed(3)+' against attacks half a beat apart');
  });
});

check('a displaced bar never runs into the bar beside it', function(){
  withDisplace(1);
  var played=DRAWN.map(function(e){ return gen._performedBeat(e.absBeat); });
  for(var i=1;i<played.length;i++){
    assert(played[i] > played[i-1] - 1e-9,
      'the performed timeline ran backwards at '+DRAWN[i].absBeat);
  }
});

check('a note crossing the edge of a displaced bar does not overrun the next', function(){
  var pts=withDisplace(1);
  assert(pts.length>0,'nothing displaced');
  pts.forEach(function(p){
    // The last attack of the displaced bar, given a length that reaches the
    // next bar's downbeat as written.
    var last=null;
    DRAWN.forEach(function(e){ if(e.absBeat>=p.from-1e-9&&e.absBeat<p.to-1e-9) last=e.absBeat; });
    var writtenLen=p.to-last;
    var end=gen._performedBeat(last)+gen._performedDuration(last, writtenLen);
    var nextStart=gen._performedBeat(p.to);
    assert(end <= nextStart + 1e-9,
      'a note from the displaced bar ended at '+end.toFixed(3)
      +', past the next bar starting at '+nextStart.toFixed(3));
  });
});

check('a lighter setting displaces less', function(){
  var hard=withDisplace(1).map(function(p){ return Math.abs(p.shift); });
  var soft=withDisplace(0.5).map(function(p){ return Math.abs(p.shift); });
  assert(hard.length && soft.length, 'one of the settings displaced nothing');
  assert(soft[0] < hard[0], 'the lighter setting moved as far: '+soft[0]+' vs '+hard[0]);
});

check('the written page is untouched by any of the three feels', function(){
  var names=['whole','half','quarter','eighth','sixteenth','quarter_dotted'];
  gen.state.swing=0; gen.state.rubato=0; gen.state.displace=0;
  var plain=names.map(function(n){ return gen._durationToNumber(n); });
  gen.state.swing=1; gen.state.rubato=1; gen.state.displace=1;
  var played=names.map(function(n){ return gen._durationToNumber(n); });
  for(var i=0;i<names.length;i++){
    assert(plain[i]===played[i], names[i]+' changed on the page');
  }
});

check('the three feels compose without any of them cancelling another', function(){
  gen.state.swing=1; gen.state.rubato=1; gen.state.displace=1;
  gen.state.renderedNoteEvents=DRAWN; gen._clearRubatoCache();
  var pts=gen._displacementPoints();
  assert(pts.length>0,'nothing displaced with all three on');
  // The off-beat still swings inside a displaced bar: its distance from that
  // bar's downbeat is the swung distance, not the straight one.
  var p=pts[0];
  var down=gen._performedBeat(p.from);
  var off=gen._performedBeat(p.from+0.5);
  assert(close(off-down, 2/3, 1e-6),
    'the swing inside a displaced bar came out '+(off-down).toFixed(4)+', not 2/3');
  // …and the timeline is still strictly increasing under all three at once.
  var played=DRAWN.map(function(e){ return gen._performedBeat(e.absBeat); });
  for(var i=1;i<played.length;i++){
    assert(played[i] > played[i-1] - 1e-9, 'timeline ran backwards at '+DRAWN[i].absBeat);
  }
});

gen.state.swing=0; gen.state.rubato=0; gen.state.displace=0; gen.state.form=null;
gen.state.renderedNoteEvents=null; gen._clearRubatoCache();
print('');
print(failures? ('FAILURES: '+failures) : 'the feel is in the performance; the page is untouched');
