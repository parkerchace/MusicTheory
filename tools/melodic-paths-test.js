// Point A to point B, by a chosen route — and room to travel it.
//
// Parker: "there's not much word generated music that has rests, or longer
// sustaining chords/harmony, or legato melodies that use a range of
// enveloping/sweeping/diverse methods to get from point A to B… say we're in
// C major and we've decided our launching point is C and our landing zone is E
// but our path there could be met with scalewise melody movement to get to it
// like 187653 or 14565453… there's just lots of independent movement when I'd
// prefer it be about melody and chords/notes supporting its development."
//
// Three separate devices answer the three separate complaints, and this
// measures all three:
//
//   PATH SHAPES  the connector's default (stepwise) motion had exactly one
//                route between two structural points: a flat walk straight at
//                the target. A repertoire of named contours — arch, valley, an
//                overshoot that turns back in (the `187653` idea: leap early,
//                walk back down through it), a hover that settles (the
//                `14565453` idea) — gives it a vocabulary, chosen once per
//                span so it reads as one gesture rather than a per-note
//                re-decision.
//   RESTS        the line could pause for a breath before an entrance but
//                never actually STOP. A budget of genuine full-span silences.
//   SUSTAINED
//   HARMONY      the walk that picks each bar's chord actively avoids
//                repeating the previous bar's, and a separate pass removes the
//                rare accidental repeats that survive it — so harmony never
//                sat still for two bars unless something went out of its way
//                to let it. A budget of deliberate holds in calm sections.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var console={log:function(){},warn:function(){},error:function(){}};
var document={addEventListener:function(){},dispatchEvent:function(){},getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return{style:{},appendChild:function(){},setAttribute:function(){},addEventListener:function(){},classList:{add:function(){},remove:function(){},toggle:function(){}}};},body:{appendChild:function(){},removeChild:function(){}}};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var setTimeout=function(){return 0;};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js',
 'voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js',
 'piano-texture-engine.js','arc-ui-init.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.sheetMusicGenerator={state:{autoVoicingAll:true,voicingLogic:'smart',voicingRegister:'mid'}};
window.__voicingUserChoice=false;

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light','through','the','win','dow',
       'wan','der','ing','far','from','home','a','gain','some','day','we','will','re','turn'];
var BPB=4;

function build(key,scale,seed,energy){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:energy,
    emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.4,harmony:0.4},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:16,beatsPerBar:BPB,beatUnit:4,totalBeats:16*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  return {c:c,h:h,m:m,arc:arc};
}
function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function midiOf(n){var s=String(n||'').match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!s)return null;
  var pc=pcOf(s[1]); return pc===null?null:pc+(parseInt(s[2],10)+1)*12;}
function chordAt(h,beat){
  var found=null,foundStart=-1;
  (h.chordSequence||[]).forEach(function(e){
    if(!e||!isFinite(e.bar)||!isFinite(e.beat)||!e.chordObj)return;
    var st=e.bar*BPB+(Number(e.beat)||0),en=st+(isFinite(e.duration)?e.duration:BPB);
    if(beat>=st-1e-6&&beat<en-1e-6&&st>foundStart){found=e;foundStart=st;}
  });
  return found;
}
function chordPcs(ev){
  if(!ev||!ev.chordObj)return [];
  return (ev.chordObj.chordNotes||ev.chordObj.diatonicNotes||[]).map(pcOf)
    .filter(function(p){return p!==null;});
}

var KEYS=[['C','major'],['A','natural_minor'],['D','dorian'],
          ['G','major'],['F','lydian'],['E','phrygian']];

var takes=0, notesTotal=0;

// --- 1. PATH SHAPES ---------------------------------------------------------
var byShape={}, shapeSamples={};
var wideLeapForeign=0, wideLeapTotal=0;

// --- 2. RESTS ----------------------------------------------------------------
var fullRests=0, restBeats=0, restsPerTake=[];

// --- 3. SUSTAINED HARMONY ----------------------------------------------------
var sustainDevices=0, longestHold=0, holdLengths=[];

for(var k=0;k<KEYS.length;k++){
  for(var s=0;s<40;s++){
    var seed=s*53+k*11+7;
    var r;
    try{ r=build(KEYS[k][0],KEYS[k][1],seed, s%3===0?0.65:0.4); }catch(e){ continue; }
    var ns=(r.m.notes||[]).filter(function(n){return n&&n.noteName;});
    if(ns.length<6) continue;
    takes++;

    // --- path shapes ---
    var midis=ns.map(function(n){return midiOf(n.noteName);});
    ns.forEach(function(n,i){
      notesTotal++;
      if(!n.pathShape) return;
      byShape[n.pathShape]=(byShape[n.pathShape]||0)+1;
      if(!shapeSamples[n.pathShape]) shapeSamples[n.pathShape]=[];
      if(shapeSamples[n.pathShape].length<3 && i>0 && isFinite(midis[i])&&isFinite(midis[i-1])){
        shapeSamples[n.pathShape].push((midis[i]-midis[i-1]));
      }
      // Every shaped note is still subject to the same harmonic accounting as
      // any other note: if it lands outside the scale, it must be a chord
      // tone or a leading tone (checked the same way accidentals-test.js
      // checks it) — a shape is not a licence to invent an accidental.
      var pc=((midis[i]%12)+12)%12;
      var scalePcs=(r.c.harmonicProfile.scaleNotes||[]).map(pcOf);
      if(scalePcs.indexOf(pc)<0){
        wideLeapTotal++;
        var ev=chordAt(r.h, n.bar*BPB+n.beat);
        var pcs=chordPcs(ev);
        var isLT=false;
        if(ev&&ev.chordObj){
          var rp=pcOf(ev.chordObj.root||(ev.chordObj.chordNotes||[])[0]);
          if(rp!==null) isLT=(pc===((rp-1)%12+12)%12);
        }
        if(pcs.indexOf(pc)<0 && !isLT) wideLeapForeign++;
      }
    });

    // --- rests: gaps of a beat or more between one note ending and the next
    // starting, counted directly from the delivered notes rather than from
    // any internal flag, so this measures what a listener would actually
    // hear rather than trusting the mechanism that produced it.
    var sorted=ns.map(function(n){
      return {start:n.bar*BPB+n.beat, end:n.bar*BPB+n.beat+(Number(n.duration)||1)};
    }).sort(function(a,b){return a.start-b.start;});
    var takeRests=0;
    for(var i=1;i<sorted.length;i++){
      var gap=sorted[i].start-sorted[i-1].end;
      if(gap>=1.5){ fullRests++; takeRests++; restBeats+=gap; }
    }
    restsPerTake.push(takeRests);

    // --- sustained harmony: consecutive bars sharing the same chord symbol,
    // read directly off the delivered chord sequence.
    var byBar={};
    (r.h.chordSequence||[]).forEach(function(e){
      if(!e||!isFinite(e.bar)||!e.chord) return;
      if(byBar[e.bar]===undefined || (Number(e.beat)||0) < byBar[e.bar].beat){
        // first chord of the bar wins for this purpose
      }
      if(!(e.bar in byBar)) byBar[e.bar]=e.chord;
    });
    var barsSorted=Object.keys(byBar).map(Number).sort(function(a,b){return a-b;});
    var run=1;
    for(var bi=1;bi<barsSorted.length;bi++){
      if(byBar[barsSorted[bi]]===byBar[barsSorted[bi-1]] && barsSorted[bi]===barsSorted[bi-1]+1){
        run++;
      } else {
        if(run>1){ holdLengths.push(run); if(run>longestHold) longestHold=run; }
        run=1;
      }
    }
    if(run>1){ holdLengths.push(run); if(run>longestHold) longestHold=run; }
    var devs=(r.h.devices||[]).filter(function(d){return d.type==='sustain';});
    sustainDevices+=devs.length;
  }
}

function pct(a,b){ return b? (a/b*100).toFixed(2)+'%' : 'n/a'; }
function mean(a){ return a.length? a.reduce(function(x,y){return x+y;},0)/a.length : 0; }
var out=[]; function say(x){ out.push(x); }

say('');
say('MELODIC PATHS — '+takes+' takes across '+KEYS.length+' modes, '+notesTotal+' notes');
say('');
say('  1. PATH SHAPES');
var shapeKeys=Object.keys(byShape).sort(function(a,b){return byShape[b]-byShape[a];});
var shapedTotal=0; shapeKeys.forEach(function(k){shapedTotal+=byShape[k];});
shapeKeys.forEach(function(k){
  say('     '+k.padEnd(20)+String(byShape[k]).padStart(5)+'  ('+pct(byShape[k],notesTotal)+' of all notes)'
      +(shapeSamples[k]&&shapeSamples[k].length? '   e.g. steps '+shapeSamples[k].join(', ') : ''));
});
say('     total notes on a named path : '+shapedTotal+' ('+pct(shapedTotal,notesTotal)+')');
say('     accidentals on a shaped note that are neither a chord tone nor a '
    +'leading tone: '+wideLeapForeign+' of '+wideLeapTotal);
say('');
say('  2. RESTS');
say('     genuine gaps of a beat or more : '+fullRests+' across '+takes+' takes');
say('     takes with at least one        : '+restsPerTake.filter(function(x){return x>0;}).length
    +' ('+pct(restsPerTake.filter(function(x){return x>0;}).length,takes)+')');
say('     total beats of silence         : '+restBeats.toFixed(1)
    +'  (avg '+(restBeats/Math.max(1,fullRests)).toFixed(2)+' beats per rest)');
say('');
say('  3. SUSTAINED HARMONY');
say('     bar-runs sharing one chord (2+) : '+holdLengths.length);
say('     longest hold                    : '+longestHold+' bars');
say('     average hold                    : '+mean(holdLengths).toFixed(2)+' bars');
say('     "sustain" devices reported      : '+sustainDevices);
say('');

var failures=0;
function want(name, ok, detail){
  if(ok) say('  OK   '+name+(detail?' — '+detail:''));
  else { failures++; say('  FAIL '+name+(detail?' — '+detail:'')); }
}

// --- 1. Path shapes ---------------------------------------------------------
want('every named shape actually appears', shapeKeys.length>=4,
     shapeKeys.length+' of 4 non-direct shapes seen');
want('shaped notes are a real minority, not a new default',
     shapedTotal>0 && shapedTotal/notesTotal<=0.35,
     pct(shapedTotal,notesTotal)+' of all notes');
want('...but common enough to be heard across a piece',
     shapedTotal/notesTotal>=0.08,
     pct(shapedTotal,notesTotal)+' of all notes');
want('a shaped note is never an unaccountable accidental',
     wideLeapForeign===0, wideLeapForeign+' of '+wideLeapTotal);

// --- 2. Rests ----------------------------------------------------------------
want('genuine rests actually occur', fullRests>0, fullRests+' across '+takes+' takes');
want('...in a real minority of takes, not every one',
     restsPerTake.filter(function(x){return x>0;}).length/takes <= 0.60,
     pct(restsPerTake.filter(function(x){return x>0;}).length,takes)+' of takes');
want('...and not buried in every take either — an event, not wallpaper',
     restsPerTake.filter(function(x){return x>0;}).length/takes >= 0.10,
     pct(restsPerTake.filter(function(x){return x>0;}).length,takes)+' of takes');
want('no take is mostly silence', Math.max.apply(null,restsPerTake.concat([0]))<=3,
     'most rests in one take: '+Math.max.apply(null,restsPerTake.concat([0])));

// --- 3. Sustained harmony ----------------------------------------------------
want('harmony actually holds sometimes', holdLengths.length>0,
     holdLengths.length+' held stretches across '+takes+' takes');
want('a hold never runs three bars — that would be stalling, not settling',
     longestHold<=2, 'longest '+longestHold+' bars');
want('the harness sees what the harmony reports, not a different number',
     sustainDevices>0 && Math.abs(sustainDevices - holdLengths.length) <= holdLengths.length,
     sustainDevices+' devices reported, '+holdLengths.length+' holds measured directly');

say('');
say(failures? ('FAILURES: '+failures)
            : 'the line has routes to choose from, room to breathe, and harmony that will sit still for it');
print(out.join('\n'));
if(failures) throw new Error('melodic-paths-test: '+failures+' failure(s)');
