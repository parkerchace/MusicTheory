// Covered melody + descant: is any voice added ABOVE the tune a real one?
//
// Two devices put a note over the melody. Both are the loudest position in the
// texture, so both are the worst place to be wrong:
//
//   covering voice — one chord tone held for the chord's span, above the tune,
//                    so the melody is an interior voice of the sonority
//   descant        — a second right-hand voice moving with the tune
//
// What is measured, per added note:
//   1. is its pitch class a chord tone of the chord sounding over it
//   2. does it actually clear the melody for the WHOLE span it is held
//   3. is it inside the window that keeps it one texture with the tune
//   4. is it something other than the melody's own pitch class (doubling)
//   5. did the melody itself survive unchanged
//
// The old fixed-interval descant rule is scored against the same notes, so the
// change has a number and not just an intention.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var console={log:function(){},warn:function(){},error:print};
var document={addEventListener:function(){},dispatchEvent:function(){},getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return{style:{},appendChild:function(){},setAttribute:function(){},addEventListener:function(){},classList:{add:function(){},remove:function(){},toggle:function(){}}};},body:{appendChild:function(){},removeChild:function(){}}};
var localStorage={getItem:function(){return null;},setItem:function(){}};var setTimeout=function(){};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js','functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js','voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js','piano-texture-engine.js','arc-ui-init.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
// Melody-first: no named voicing, so voicing-first stays off. That is the path
// both devices live on — a chosen voicing is left alone on purpose.
window.sheetMusicGenerator={state:{autoVoicingAll:true,voicingLogic:'smart',voicingRegister:'mid'}};

var W=['laur','en','lou','i','love','you','and','the','morn','ing'];
var BPB=4;

function build(key,scale,seed,energy){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:energy,
   emotionalTone:'hopeful',globalTension:0.5,
   complexityControls:{rhythm:0.5,melody:0.5,color:0.4,harmony:0.4},
   wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
   metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:12,beatsPerBar:BPB,totalBeats:48,sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,4);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  return {c:c,arc:arc,h:h,m:m,p:buildPianoTexture(c,arc,h,m,seed)};
}

function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function midiOf(n){var m=String(n||'').match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!m)return null;
  var pc=pcOf(m[1]);return isFinite(pc)?pc+(parseInt(m[2],10)+1)*12:null;}

// The chord actually sounding at a beat, by the same rule the engine uses.
function chordAt(h,beat){
  var found=null;
  (h.chordSequence||[]).forEach(function(e){
    if(!e||!isFinite(e.bar)||e.approachStrategy||!e.chordObj)return;
    var st=e.bar*BPB+(Number(e.beat)||0), en=st+(Number(e.duration)||BPB);
    if(beat>=st-1e-6&&beat<en-1e-6) found=e;
  });
  return found;
}
function chordPcs(ev){
  if(!ev||!ev.chordObj)return [];
  return (ev.chordObj.chordNotes||ev.chordObj.diatonicNotes||[])
    .map(pcOf).filter(function(p){return p!==null;});
}

var KEYS=[['C','major'],['G','major'],['D','dorian'],['A','minor'],['F','lydian'],['E','mixolydian']];

var takes=0, coveredSections=0, descantSections=0;
var cover={n:0,foreign:0,notClear:0,tooFar:0,doubling:0};
var desc={n:0,foreign:0,doubling:0,tooFar:0};
var oldRule={n:0,foreign:0};
var melodyMoved=0, melodyChecked=0;
var samples=[];

for(var k=0;k<KEYS.length;k++){
  for(var s=0;s<70;s++){
    var seed=s*53+k*7+3;
    var r;
    try{ r=build(KEYS[k][0],KEYS[k][1],seed, s%3===0?0.7:0.45); }catch(e){ print('build failed: '+e); continue; }
    if(!r.p||!r.p.leftHand) continue;
    takes++;

    var exc=r.p.exceptions||[];
    var hasCover=exc.some(function(x){return x.type==='coveredMelody';});
    var hasDesc=exc.some(function(x){return x.type==='descant';});
    if(hasCover) coveredSections++;
    if(hasDesc) descantSections++;

    var mel=(r.m.notes||[]).map(function(n){
      return {start:n.bar*BPB+n.beat,end:n.bar*BPB+n.beat+(Number(n.duration)||1),midi:midiOf(n.noteName)};
    }).filter(function(e){return isFinite(e.midi);});
    var melCeil=function(a,b){
      var hi=null;
      mel.forEach(function(e){ if(e.start<b-1e-6&&e.end>a+1e-6&&(hi===null||e.midi>hi)) hi=e.midi; });
      return hi;
    };
    var melAt=function(beat){
      var v=null,best=null;
      mel.forEach(function(e){
        if(beat>=e.start-1e-6&&beat<e.end-1e-6){v=e.midi;}
        else if(e.start<=beat+1e-6&&(best===null||e.start>best.start)) best=e;
      });
      return v!==null?v:(best?best.midi:null);
    };

    // --- 5. the tune is untouched -------------------------------------------
    // Every melody note must come out at the same place and the same pitch. A
    // device that "changes how the tune is heard" has to leave the tune alone
    // for that to be a true statement.
    //
    // Tenor lead is the one texture that legitimately moves it: the whole
    // device is dropping the line an octave into the left hand. So the left
    // hand's melody entries count too, at pitch or an octave down — and only
    // an octave, because anything else is the line being rewritten.
    var placed={};
    (r.p.rightHand||[]).forEach(function(e){
      if(e.voice!=='melody')return;
      (placed[e.bar+':'+e.beat]=placed[e.bar+':'+e.beat]||[]).push(midiOf(e.noteName));
    });
    (r.p.leftHand||[]).forEach(function(e){
      if(!e.isMelody)return;
      (placed[e.bar+':'+e.beat]=placed[e.bar+':'+e.beat]||[]).push(e.midis[0]);
    });
    (r.m.notes||[]).forEach(function(n){
      melodyChecked++;
      var want=midiOf(n.noteName);
      var got=placed[n.bar+':'+n.beat]||[];
      if(got.indexOf(want)<0&&got.indexOf(want-12)<0) melodyMoved++;
    });

    // --- the covering voice --------------------------------------------------
    (r.p.trebleHarmony||[]).forEach(function(e){
      if(!e.coversMelody)return;
      cover.n++;
      var start=e.bar*BPB+(Number(e.beat)||0), end=start+(Number(e.duration)||BPB);
      var m=e.midis[0];
      var pc=((m%12)+12)%12;
      var ev=chordAt(r.h,start), pcs=chordPcs(ev);
      var ceil=melCeil(start,end), here=melAt(start);
      if(pcs.indexOf(pc)<0){ cover.foreign++;
        if(samples.length<6) samples.push('cover '+e.noteNames[0]+' foreign to '+(ev?ev.chord:'?')+' bar '+e.bar); }
      if(ceil===null||m<ceil+3){ cover.notClear++;
        if(samples.length<6) samples.push('cover '+e.noteNames[0]+' does not clear melody top '+ceil+' bar '+e.bar); }
      if(ceil!==null&&m>ceil+12) cover.tooFar++;
      if(here!==null&&pc===((here%12)+12)%12) cover.doubling++;
    });

    // --- the descant ---------------------------------------------------------
    (r.p.rightHand||[]).forEach(function(e){
      if(e.voice!=='descant')return;
      desc.n++;
      var beat=e.bar*BPB+(Number(e.beat)||0);
      var m=e.midi, pc=((m%12)+12)%12;
      var ev=chordAt(r.h,beat), pcs=chordPcs(ev);
      var here=melAt(beat);
      if(pcs.indexOf(pc)<0){ desc.foreign++;
        if(samples.length<6) samples.push('descant '+e.noteName+' foreign to '+(ev?ev.chord:'?')+' bar '+e.bar); }
      if(here!==null&&pc===((here%12)+12)%12) desc.doubling++;
      if(here!==null&&(m-here<3||m-here>9)) desc.tooFar++;
    });

    // --- what the old fixed-interval rule would have done ---------------------
    // The old rule, exactly: +3 or +4 semitones at even odds, plus another +5
    // about a third of the time — so four possible intervals with known
    // weights, none of them looking at the chord. Scored as the EXPECTED number
    // of foreign notes over the same melody notes rather than by re-rolling it,
    // which keeps the comparison free of its own dice.
    if(hasDesc){
      var OLD=[[3,0.5*0.65],[4,0.5*0.65],[8,0.5*0.35],[9,0.5*0.35]];
      exc.filter(function(x){return x.type==='descant';}).forEach(function(x){
        (r.m.notes||[]).forEach(function(n){
          if(n.bar<x.startBar||n.bar>x.endBar)return;
          if((Number(n.duration)||1)<0.5)return;
          var beat=n.bar*BPB+n.beat, base=midiOf(n.noteName);
          if(!isFinite(base))return;
          var pcs=chordPcs(chordAt(r.h,beat));
          oldRule.n++;
          OLD.forEach(function(o){
            if(pcs.indexOf((((base+o[0])%12)+12)%12)<0) oldRule.foreign+=o[1];
          });
        });
      });
    }
  }
}

function pct(a,b){return b?((a/b*100).toFixed(1)+'%'):'n/a';}
print('');
print('COVERED MELODY / DESCANT — '+takes+' takes across '+KEYS.length+' modes');
print('');
print('  sections electing a covering voice : '+coveredSections+' ('+pct(coveredSections,takes)+' of takes)');
print('  sections electing a descant        : '+descantSections+' ('+pct(descantSections,takes)+' of takes)');
print('');
print('  COVERING VOICE — '+cover.n+' notes');
print('    foreign to the chord over them   : '+cover.foreign);
print('    failing to clear the tune        : '+cover.notClear);
print('    more than an octave above it     : '+cover.tooFar);
print('    doubling the melody pitch class  : '+cover.doubling);
print('');
print('  DESCANT — '+desc.n+' notes');
print('    foreign to the chord over them   : '+desc.foreign);
print('    outside the third-to-sixth window: '+desc.tooFar);
print('    doubling the melody pitch class  : '+desc.doubling);
print('    old chord-blind rule, same notes : '+oldRule.foreign.toFixed(0)+' foreign of '+oldRule.n+' expected ('+pct(oldRule.foreign,oldRule.n)+')');
print('');
print('  MELODY UNCHANGED — '+melodyChecked+' notes checked, '+melodyMoved+' moved or missing');
if(samples.length){ print(''); print('  first failures:'); samples.forEach(function(x){print('    '+x);}); }
print('');
var bad=cover.foreign+cover.notClear+cover.tooFar+cover.doubling+desc.foreign+desc.doubling+desc.tooFar+melodyMoved;
print(bad===0?'PASS — every added voice is a chord tone, clear of the tune, and the tune is untouched.'
             :'FAIL — '+bad+' violations.');
// A HARNESS THAT CANNOT GO RED IS NOT A HARNESS.
// This printed its verdict and exited 0, so every runner that checks exit
// status reported it as passing whatever it had just found. Discovered when
// `accidentals-test.js` sat at 'FAILURES: 1' for a whole run without anyone
// noticing, and true of six of the fifteen harnesses at the time.
if (bad) throw new Error('covered-melody-test: '+bad+' violation(s)');
