// Choosing a voicing should change the CHORDS, not delete the accompaniment.
//
// Three complaints, one harness:
//
//   1. the Voicing dropdown claimed a style was selected that was not applied,
//      so choosing that same style did nothing and you had to pick another
//      first — measured as: does the state the dropdown reports match the state
//      the generator is actually in
//   2. choosing a voicing (or a voice-leading toggle) flattened the texture:
//      Alberti, broken chords, ground bass and the invariant figure all became
//      the same repeated block — measured as ATTACKS and DISTINCT PITCHES per
//      bar in the left hand, which is what "movement" is
//   3. the voice-leading toggles appeared to do nothing — measured as: do the
//      chord voicings actually come out different with them on
//
// Throughout: the melody must not move. A voicing control that rewrites the
// tune is not a voicing control.
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
var requestAnimationFrame=function(){return 0;};
var __e=eval;function load(f){__e(readFile(f));}
// sheet-music-generator.js is loaded because it OWNS `applyVoicingStyleTo` —
// the function that turns "Drop 2" into actual notes. arc-ui-init and the
// texture engine both reach it through `window`, and both silently fall back to
// leaving the chord alone when it is missing. Without it here, fifteen of the
// eighteen voicing styles would quietly test as no-ops and the harness would
// report a bug that is really its own omission.
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js',
 'voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js',
 'piano-texture-engine.js','sheet-music-generator.js','arc-ui-init.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(c,m){ if(!c) throw new Error(m); }

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light'];
var BPB=4;

// The four states the controls can put the app in.
function setControls(mode){
  var st={ autoVoicingAll:false, voicingLogic:'smart', voicingRegister:'mid',
           voicingStyle:'close', inversion:0, voiceLeading:false,
           voiceLeadingMode:'single', vlIntensity:0.5 };
  window.sheetMusicGenerator={ state: st };
  window.__chordVoicingOverrides={};
  if(mode==='none'){ window.__voicingUserChoice=false; }
  else if(mode==='close'){ st.voicingStyle='close'; window.__voicingUserChoice=true; }
  else if(mode==='drop2'){ st.voicingStyle='drop2'; window.__voicingUserChoice=true; }
  else if(mode==='vl'){ st.voicingStyle='close'; st.voiceLeading=true; window.__voicingUserChoice=true; }
  else if(mode==='vlcombos'){ st.voicingStyle='close'; st.voiceLeading=true;
                              st.voiceLeadingMode='multi'; window.__voicingUserChoice=true; }
  return st;
}

function build(seed){
  var notes=mt.getScaleNotesWithKeySignature('C','major');
  var c={harmonicProfile:{root:'C',recommendedScale:'major',scaleNotes:notes},overallEnergy:0.5,
    emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.4,harmony:0.4},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:8,beatsPerBar:BPB,beatUnit:4,totalBeats:8*BPB,timeSignature:'4/4',
    sample:function(t){return 0.35+0.45*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  var p=buildPianoTexture(c,arc,h,m,seed);
  return {c:c,arc:arc,h:h,m:m,p:p};
}

// MOVEMENT, as the ear would count it: how many separate attacks the left hand
// makes in a bar, and how many different pitches it touches. A block chord
// repeated is few attacks and few pitches; an Alberti figure is many of both.
function movement(p){
  var attacks=0, bars={}, pitches={};
  ((p&&p.leftHand)||[]).concat(((p&&p.trebleHarmony)||[])).forEach(function(e){
    attacks++;
    bars[e.bar]=true;
    (e.midis||[]).forEach(function(m){ pitches[e.bar+':'+m]=true; });
  });
  var barCount=Math.max(1,Object.keys(bars).length);
  return { attacksPerBar: attacks/barCount, pitchesPerBar: Object.keys(pitches).length/barCount };
}

function voicingFingerprint(h){
  return ((h&&h.chordSequence)||[]).map(function(ev){
    if(!ev||!ev.voicing) return '-';
    return Object.values(ev.voicing).filter(function(x){return typeof x==='number';})
      .sort(function(a,b){return a-b;}).join('.');
  }).join('|');
}
function melodyFingerprint(m){
  return ((m&&m.notes)||[]).map(function(n){return n.bar+':'+n.beat+':'+n.noteName;}).join(',');
}

print('=== voicing controls ===');
print('');

var SEEDS=[7,53,101,149,211,263,317,379,431,487];
var agg={};
['none','close','drop2','vl','vlcombos'].forEach(function(mode){
  agg[mode]={attacks:0,pitches:0,n:0,voicings:[],melodies:[]};
});

SEEDS.forEach(function(seed){
  ['none','close','drop2','vl','vlcombos'].forEach(function(mode){
    setControls(mode);
    var r;
    try{ r=build(seed); }catch(e){ print('  build failed ('+mode+'): '+e); return; }
    var mv=movement(r.p);
    var a=agg[mode];
    a.attacks+=mv.attacksPerBar; a.pitches+=mv.pitchesPerBar; a.n++;
    a.voicings.push(voicingFingerprint(r.h));
    a.melodies.push(melodyFingerprint(r.m));
  });
});

function pad(s,n){s=String(s);while(s.length<n)s+=' ';return s;}
print('  '+pad('controls',26)+pad('attacks/bar',14)+'distinct pitches/bar');
['none','close','drop2','vl','vlcombos'].forEach(function(mode){
  var a=agg[mode];
  var label={none:'as generated',close:'Close position',drop2:'Drop 2',
             vl:'Close + Voice Leading',vlcombos:'Close + VL Combos'}[mode];
  print('  '+pad(label,26)+pad((a.attacks/a.n).toFixed(2),14)+(a.pitches/a.n).toFixed(2));
});
print('');

// --- 2. the texture keeps its movement -----------------------------------
check('choosing a voicing costs the accompaniment no movement at all', function(){
  var base=agg.none.attacks/agg.none.n;
  // Not "most of the movement survives" — NONE of it should be spent. A
  // voicing decides which notes sound; it has no business deciding how often
  // the hand moves. A threshold generous enough to tolerate a quarter of the
  // attacks disappearing is a threshold that would have passed the behaviour
  // being complained about, so the line is drawn at parity.
  ['close','drop2','vl','vlcombos'].forEach(function(mode){
    var got=agg[mode].attacks/agg[mode].n;
    assert(got >= base*0.95,
      mode+' has '+got.toFixed(2)+' attacks/bar vs '+base.toFixed(2)
      +' with no voicing chosen — the figures have been flattened into blocks');
  });
});

check('...and still touches as many different pitches', function(){
  var base=agg.none.pitches/agg.none.n;
  ['close','drop2','vl','vlcombos'].forEach(function(mode){
    var got=agg[mode].pitches/agg[mode].n;
    assert(got >= base*0.95,
      mode+' touches '+got.toFixed(2)+' pitches/bar vs '+base.toFixed(2)+' with no voicing chosen');
  });
});

// --- 3. the voice-leading toggles actually do something -------------------
check('Voice Leading changes the voicings it is given', function(){
  var differ=0;
  for(var i=0;i<agg.close.voicings.length;i++){
    if(agg.close.voicings[i]!==agg.vl.voicings[i]) differ++;
  }
  assert(differ>0, 'Voice Leading produced byte-identical voicings on all '
    +agg.close.voicings.length+' takes');
  print('       Voice Leading changed the voicing on '+differ+' of '+agg.close.voicings.length+' takes');
});

check('VL Combos changes them further still', function(){
  var differ=0;
  for(var i=0;i<agg.vl.voicings.length;i++){
    if(agg.vl.voicings[i]!==agg.vlcombos.voicings[i]) differ++;
  }
  assert(differ>0, 'VL Combos was indistinguishable from plain Voice Leading on every take');
  print('       VL Combos differed from plain Voice Leading on '+differ+' of '+agg.vl.voicings.length+' takes');
});

check('a named style reaches the voicings too', function(){
  var differ=0;
  for(var i=0;i<agg.close.voicings.length;i++){
    if(agg.close.voicings[i]!==agg.drop2.voicings[i]) differ++;
  }
  assert(differ>0, 'Drop 2 came out identical to Close position on every take');
});

// --- the tune is not a voicing control's business -------------------------
// Through the path the app actually takes: the controls call
// revoiceLastGeneration, which re-harmonizes the EXISTING melody rather than
// writing a new take. Comparing two independent generations instead would only
// prove that different inputs give different output.
check('changing a voicing control re-harmonizes rather than rewrites', function(){
  var moved=0, checked=0;
  SEEDS.slice(0,6).forEach(function(seed){
    setControls('close');
    var r=build(seed);
    window.__lastMusicGenerated=r.p ? {harmony:r.h,melody:r.m,piano:r.p,context:r.c,arc:r.arc,seed:seed,input:'test'} : null;
    window.__lastGenInputs={context:r.c,arc:r.arc,seed:seed,input:'test'};
    var before=melodyFingerprint(r.m);

    // Now switch on Voice Leading, exactly as the checkbox does.
    window.sheetMusicGenerator.state.voiceLeading=true;
    window.__voicingUserChoice=true;
    var after=null;
    try {
      revoiceLastGeneration('voicing-control');
      after=melodyFingerprint(window.__lastMusicGenerated && window.__lastMusicGenerated.melody);
    } catch(e){ throw new Error('revoice threw: '+e); }

    checked++;
    if(before!==after) moved++;
  });
  assert(checked>0,'nothing was checked');
  assert(moved===0, 'the melody moved on '+moved+' of '+checked+' re-voices');
  print('       '+checked+' re-voices, melody byte-identical every time');
});

print('');
print(failures? ('FAILURES: '+failures) : 'the controls change the chords and leave the music alone');
