// LEAVING IS HALF THE GESTURE; THE RETURN IS THE OTHER HALF.
//
// Every departure used to be two or three bars long and come home inside the
// same phrase — one good route treated as the only one. A return can also be
// the next section arriving, or the cadence that was going to close the piece
// anyway, and those are different gestures rather than different lengths of
// the same one. What this harness holds down:
//
//   1. A NAMED SCOPE IS HONOURED. Asking for the late departure and getting a
//      two-bar colour in the middle is the control not working.
//   2. EVERY DEPARTURE STILL COMES HOME. Whatever the scope, the music has to
//      land back in the key it started in, and say which return it just made.
//   3. THE LATE ONE IS REACHED FOR ON ITS OWN. Under `auto` the departure that
//      the closing cadence resolves is worth preferring, because the thing
//      that ends the piece is already going to be the thing that brings it
//      home.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
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
  getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},
  addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
  body:el('body'),head:el('head'),documentElement:el('html')};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};var cancelAnimationFrame=function(){};

var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'scale-colour.js','functional-harmony.js','progression-library.js','harmony-complexity.js',
 'form-planner.js','voice-leading-engine.js','approach-engine.js','word-character-engine.js',
 'melodic-line-engine.js','piano-texture-engine.js','arc-ui-init.js','scoring-methods.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.__voicingUserChoice=false;
var SM=window.ScoringMethods;
var BPB=4;

function ctxFor(text,key,scale){
  var ws=String(text).toLowerCase().match(/[a-z']+/g)||['x'];
  return {harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:mt.getScaleNotesWithKeySignature(key,scale)},
    overallEnergy:0.5,emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.5,harmony:0.5},
    wordTokens:ws.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
}

// Drive the same chain arc-ui-init drives, through the hooks.
function run(method,text,seed,key,scale){
  window.__generationMethod=method;
  var c=ctxFor(text,key||'C',scale||'major');
  var arc={bars:16,beatsPerBar:BPB,beatUnit:4,totalBeats:16*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c=SM.hook('shapeContext',c,text,seed)||c;
  c.form=SM.hook('planForm',c,null,seed,BPB)||planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  h=SM.hook('constrainHarmony',h,c,arc,seed)||h;
  var extra=SM.hook('melodyOptions',c,arc,h,seed)||{};
  var m=generateMelody(c,arc,h,seed,extra);
  var p=buildPianoTexture(c,arc,h,m,seed);
  p=SM.hook('textureOverrides',p,c,arc,h,m,seed)||p;
  return {c:c,arc:arc,h:h,m:m,p:p,extra:extra};
}
function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function midiOf(n){var x=String(n).match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!x)return NaN;
  var pc=pcOf(x[1]);return pc===null?NaN:(Number(x[2])+1)*12+pc;}

var out=[], failures=0;
function say(s){say_(s);} function say_(s){out.push(s);}
function want(n,c,d){ if(c){out.push('  ok   '+n+(d?('   ['+d+']'):''));} else {failures++;out.push('  FAIL '+n+(d?('   ['+d+']'):''));} }

function survey(scale,takes){
  window.__generationMethod='contour';
  var fired=0, bars=0, foreign=0, chords={}, unexplained=0;
  for(var s=0;s<(takes||25);s++){
    var r=run('contour','the chase through the dark woods',s*17+5,'A',scale);
    if(r.h.cadenceFit) fired++;
    var sp={}; (r.c.harmonicProfile.scaleNotes||[]).forEach(function(n){sp[pcOf(n)]=1;});
    var seen={};
    (r.h.chordSequence||[]).forEach(function(e){
      if(seen[e.bar])return; seen[e.bar]=1; bars++;
      var t=(e.chordObj&&(e.chordObj.chordNotes||e.chordObj.diatonicNotes))||[];
      if(t.some(function(x){return !sp[pcOf(x)];})){
        foreign++;
        chords[e.chord]=(chords[e.chord]||0)+1;
        if(!e.explain) unexplained++;
      }
    });
  }
  return {fired:fired, bars:bars, foreign:foreign, pct:foreign/Math.max(1,bars),
          chords:chords, unexplained:unexplained};
}

out.push('A DEVICE THAT ERASES THE MODE IS NOT A COLOUR');
// Two major triads a step apart need a b6 and a b7 to be built on. Nothing
// checked whether the piece's own collection had them, so the gesture fired in
// all 1300 of them -- and in A Dorian it flattened the ^6 that IS the mode,
// then described the diatonic bVII as "borrowed from the parallel minor".
var maj=survey('major'), aeo=survey('aeolian'), dor=survey('dorian'),
    mix=survey('mixolydian'), lyd=survey('lydian'), phr=survey('phrygian');
// WITHDRAWN, and this is the assertion that keeps it withdrawn. Gating it by
// collection fixed WHERE it fired without fixing WHAT it was: three chords
// constructed by forcing major triads onto ♭6 and ♭7 and raising the tonic's
// third, belonging to no collection, so nothing could name their source, no
// scale existed for the melody to follow through them, and no rule decided
// when the gesture was warranted. It was also the only chromatic pre-dominant
// here — no Neapolitan, no augmented sixths — so reaching for it was arbitrary
// rather than idiomatic. The standing rule it leaves behind: borrow chords
// that are genuinely diatonic to some named collection; do not chromaticize.
want('the constructed walking cadence does not fire in any collection',
     maj.fired===0 && aeo.fired===0 && phr.fired===0
       && dor.fired===0 && mix.fired===0 && lyd.fired===0,
     'major '+maj.fired+', aeolian '+aeo.fired+', dorian '+dor.fired+', phrygian '+phr.fired);

out.push('');
out.push('THE MODAL FIFTH DEGREE IS NOT AUTOMATICALLY A DOMINANT');
// An uppercase V used to force the minor v into a real dominant in EVERY
// collection with a minor fifth degree. In A Dorian that made E7's G# the only
// foreign note in the piece -- measured at 64 bars out of 64.
out.push('  A dorian     : '+Math.round(dor.pct*100)+'% of bars carry a foreign chord  ('
     +Object.keys(dor.chords).slice(0,4).join(', ')+')');
out.push('  A mixolydian : '+Math.round(mix.pct*100)+'%');
out.push('  A aeolian    : '+Math.round(aeo.pct*100)+'%');
want('a modal collection is left entirely diatonic',
     dor.pct === 0 && mix.pct === 0 && lyd.pct === 0 && phr.pct === 0,
     'dorian '+Math.round(dor.pct*100)+'%, mixolydian '+Math.round(mix.pct*100)+'%');
// The concentration is a VIRTUE, not a leftover of the bug. What was wrong was
// saturation — the same borrow on every single V, 64 bars out of 64, so the
// mode never sounded. Once it is occasional, one borrowed chord that keeps
// coming back is worth far more than five different ones scattered about: the
// ear learns it and hears its return, where variety would just read as a
// series of sour notes. So the assertion is that the borrowing is FEW KINDS
// used SPARINGLY, which is the opposite of what the earlier version asked.
want('...and where borrowing does happen it is few kinds, not scattered variety',
     Object.keys(aeo.chords).length <= 2,
     Object.keys(aeo.chords).length+' distinct borrowed chord(s) in aeolian across '+aeo.foreign+' bars');
// The minor-key dominant survives, but not as an alteration: it is taken as
// the diatonic fifth degree of the tonic's own harmonic minor, verified
// against the scale data, and carries a scaleHint so the line plays through
// the bar in the collection the chord actually came from. Same notes as the
// old raise; the difference is that there is now a source to check.
want('the minor key keeps its dominant, sourced from a collection rather than altered',
     aeo.pct > dor.pct && dor.pct === 0,
     'aeolian '+Math.round(aeo.pct*100)+'% vs dorian '+Math.round(dor.pct*100)+'%');

out.push('');
out.push('AND NOTHING LEAVES THE KEY WITHOUT SAYING WHY');
var tot=0, un=0;
[maj,aeo,dor,mix,lyd,phr].forEach(function(x){ tot+=x.foreign; un+=x.unexplained; });
want('every foreign chord in every mode states its reason', un===0, un+' of '+tot+' unexplained');

out.push('');
out.push('A COLLECTION WITH NOTHING TO BORROW STAYS CLEAN');
want('lydian and the melodic-minor family are left alone entirely',
     lyd.pct===0 && survey('melodic_minor',15).pct===0,
     'lydian '+Math.round(lyd.pct*100)+'%');

out.push('');
out.push(failures? ('FAILURES: '+failures) : 'a device asks the collection before it fires, and the mode survives it');
print(out.join('\n'));
if(failures) throw new Error('modal-integrity-test: '+failures+' failure(s)');
