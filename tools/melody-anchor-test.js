// Does the melody ANCHOR while the harmony borrows underneath it?
//
// The device, measured off a player who does this continuously:
//
//   - borrowed material sits BELOW the tune — 71% of chromatic notes, a median
//     of 8 semitones under it
//   - the top voice is HELD while that motion happens — median 1.40s, which at
//     a walking tempo is two to three beats
//   - when the melody itself leaves the key it is BRIEF and it RESOLVES BY STEP
//     back in — median 0.40s
//
// The borrow is something the listener hears the melody AGAINST. A tune that
// borrows along with the harmony leaves nothing holding the listener's place,
// and the colour reads as a swerve.
//
// Every assertion is about the DEVICE — where the notes are, how long they
// last — never about a hook having run.
//
// TWO SHAPE FACTS THIS HARNESS EXISTS TO RESPECT, both of which produced
// confident nonsense on the first attempt and are recorded so they are not
// rediscovered:
//
//   1. A melody note carries `bar` and `beat` SEPARATELY, and its pitch is
//      `noteName`. Reading `beat` as an absolute position puts every note in
//      bar 0 and the overlap test then matches almost nothing.
//   2. `isFinite(null)` is TRUE in JavaScript, because `Number(null)` is 0. A
//      guard written as `if (!isFinite(m)) return;` therefore passes nulls
//      straight through and every statistic downstream is computed on zero.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var console={log:function(){},warn:function(){},error:print};
var document={addEventListener:function(){},dispatchEvent:function(){},getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return{style:{},appendChild:function(){},setAttribute:function(){},addEventListener:function(){},classList:{add:function(){},remove:function(){},toggle:function(){}}};},body:{appendChild:function(){},removeChild:function(){}}};
var localStorage={getItem:function(){return null;},setItem:function(){}};var setTimeout=function(){};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js','functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js','voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js','piano-texture-engine.js','arc-ui-init.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.sheetMusicGenerator={state:{autoVoicingAll:true,voicingLogic:'smart',voicingRegister:'mid'}};
window.__arcApproachScales={enabled:true,source:'both',palette:'lands',density:0.8,plainBackdrop:true};

var W=['laur','en','lou','i','love','you','and','the','morn','ing'];
var BPB=4;

function build(key,scale,seed,energy){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:energy,
   emotionalTone:'hopeful',globalTension:0.5,
   complexityControls:{rhythm:0.5,melody:0.5,color:0.5,harmony:0.65},
   wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
   metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:12,beatsPerBar:BPB,totalBeats:48,sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,4);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  var p=buildPianoTexture(c,arc,h,m,seed);
  return {c:c,arc:arc,h:h,m:m,p:p};
}

function num(v){ return (v===null||v===undefined||v==='') ? NaN : Number(v); }
function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return (typeof v==='number'&&isFinite(v))?((v%12)+12)%12:NaN;}
function midiOf(n){var m=String(n||'').match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!m)return NaN;
  var pc=pcOf(m[1]);return isFinite(pc)?pc+(parseInt(m[2],10)+1)*12:NaN;}

function evStart(e){return num(e.bar)*BPB+(num(e.beat)||0);}
function evEnd(e){return evStart(e)+(num(e.duration)||1);}
function melStart(n){return num(n.bar)*BPB+(num(n.beat)||0);}
function melEnd(n){return melStart(n)+(num(n.duration)||1);}

function approachWindows(h,m){
  var out=[]; var mel=(m&&m.notes)||[];
  (h.chordSequence||[]).forEach(function(e){
    if(!e||!e.approachStrategy||!isFinite(num(e.bar)))return;
    var st=evStart(e), en=evEnd(e);
    var over=mel.filter(function(n){ return melStart(n) < en-1e-6 && melEnd(n) > st+1e-6; });
    out.push({ev:e,start:st,end:en,dur:en-st,notes:over});
  });
  return out;
}

var KEYS=[['C','major'],['G','major'],['A','minor'],['Eb','major'],['D','dorian'],['F','major']];
var stats={windows:0, silent:0, approachBeats:[], realBeats:[], melNotesOver:[], runBeats:[], runLen:[],
           restruck:0, held:0, melOutside:0, melInside:0,
           outsideDur:[], outsideStepsBack:0, outsideLeapsBack:0, heldDur:[],
           // THE RUN HALF. Where the tune stops over a walk, the reply plays
           // the borrowed collection as a line instead of accompanying.
           runs:0, runNotes:0, runNotesInCollection:0, runNamed:0,
           runBelowReentry:0, runLandsAtReentry:0, runGapSemis:[], piecesWithRun:0};

KEYS.forEach(function(k,ki){
  for(var s=0;s<6;s++){
    var seed=(ki*977+s*131+7)>>>0; var b;
    try{ b=build(k[0],k[1],seed,0.55); }catch(err){ print('build failed '+k[0]+' '+k[1]+': '+err); continue; }
    var homePcs={};
    (b.c.harmonicProfile.scaleNotes||[]).forEach(function(n){var p=pcOf(n);if(isFinite(p))homePcs[p]=1;});
    (b.h.chordSequence||[]).forEach(function(e){ if(e&&!e.approachStrategy&&isFinite(num(e.duration))) stats.realBeats.push(num(e.duration)); });
    // A RUN, not an event. One walk into one target is the musical unit: the
    // per-chord duration is meaningless on its own when a walk is 1 to 4
    // chords long. Consecutive approach events sharing a strategy are one run.
    (function(){
      var cur=null;
      (b.h.chordSequence||[]).forEach(function(e){
        if(!e||!e.approachStrategy){ if(cur){stats.runBeats.push(cur.beats);stats.runLen.push(cur.n);cur=null;} return; }
        if(cur&&cur.strategy===e.approachStrategy){ cur.beats+=num(e.duration)||1; cur.n++; return; }
        if(cur){stats.runBeats.push(cur.beats);stats.runLen.push(cur.n);}
        cur={strategy:e.approachStrategy,beats:num(e.duration)||1,n:1};
      });
      if(cur){stats.runBeats.push(cur.beats);stats.runLen.push(cur.n);}
    })();
    var mel=(b.m&&b.m.notes)||[];
    approachWindows(b.h,b.m).forEach(function(w){
      stats.windows++;
      stats.approachBeats.push(w.dur);
      stats.melNotesOver.push(w.notes.length);
      // A window with NO melody over it is neither held nor restruck. Counting
      // it as "held" scores silence as restraint.
      if(!w.notes.length){ stats.silent++; }
      else if(w.notes.filter(function(n){return melStart(n) > w.start+1e-6;}).length){ stats.restruck++; }
      else { stats.held++; stats.heldDur.push(num(w.notes[0].duration)||1); }

      w.notes.forEach(function(n){
        var mm=midiOf(n.noteName); if(!isFinite(mm))return;
        var pc=((mm%12)+12)%12;
        if(!homePcs[pc]){
          stats.melOutside++;
          stats.outsideDur.push(num(n.duration)||1);
          var idx=mel.indexOf(n); var nxt=idx>=0?mel[idx+1]:null;
          var nm=nxt?midiOf(nxt.noteName):NaN;
          // The video separates these and so should this: 38% of chromatic
          // melody notes resolve BY STEP into the key, 28% LEAP back into it,
          // 33% stay chromatic. Asking only about the step and demanding more
          // of it than the player manages is a threshold with nothing behind
          // it — and a floor of 50% was exactly that, set here as a round
          // number rather than derived from anything.
          if(isFinite(nm)&&homePcs[((nm%12)+12)%12]){
            if(Math.abs(nm-mm)<=2) stats.outsideStepsBack++; else stats.outsideLeapsBack++;
          }
        } else stats.melInside++;
      });
    });

    // ---- THE RUN: a reply that plays the borrowed collection ----
    var lh=(b.p&&b.p.leftHand)||[];
    var replies=lh.filter(function(c){return c&&c.answersRest;});
    var borrowedReplies=replies.filter(function(c){return c&&c.runsCollection;});
    if(borrowedReplies.length) stats.piecesWithRun++;
    // group consecutive reply cells into runs
    var byStart=borrowedReplies.slice().sort(function(x,y){
      return (x.bar*BPB+num(x.beat))-(y.bar*BPB+num(y.beat));});
    var grp=null, groups=[];
    byStart.forEach(function(c){
      var st=c.bar*BPB+num(c.beat);
      if(grp && Math.abs(st-(grp.end))<0.26 && grp.name===c.runsCollection){ grp.cells.push(c); grp.end=st+(num(c.duration)||0.5); return; }
      if(grp) groups.push(grp);
      grp={name:c.runsCollection, cells:[c], start:st, end:st+(num(c.duration)||0.5)};
    });
    if(grp) groups.push(grp);

    groups.forEach(function(g){
      stats.runs++;
      if(g.name) stats.runNamed++;
      // The collection it claims to be running, resolved back to pitch classes.
      var mm=String(g.name||'').match(/^([A-Ga-g][#b]?)\s+(.+)$/);
      var colPcs=null;
      if(mm){ try{ var nn=mt.getScaleNotes(mm[1], String(mm[2]).replace(/\s+/g,'_'));
        if(nn&&nn.length){ colPcs={}; nn.forEach(function(x){var q=pcOf(x); if(isFinite(q))colPcs[q]=1;}); } }catch(e){} }
      // Where the tune comes back in after the run.
      var reentry=null;
      mel.forEach(function(n){ var st=melStart(n);
        if(st >= g.end-0.26 && (reentry===null || st<reentry.st)) reentry={st:st, midi:midiOf(n.noteName)}; });
      g.cells.forEach(function(c){
        var v=(c.midis&&c.midis[0]);
        if(!(typeof v==='number'&&isFinite(v))) return;
        stats.runNotes++;
        if(colPcs && colPcs[((v%12)+12)%12]) stats.runNotesInCollection++;
        if(reentry && typeof reentry.midi==='number' && isFinite(reentry.midi)){
          if(v < reentry.midi) stats.runBelowReentry++;
          stats.runGapSemis.push(reentry.midi - v);
        }
      });
      if(reentry && Math.abs(reentry.st-g.end)<0.51) stats.runLandsAtReentry++;
    });
  }
});

function med(a){if(!a.length)return NaN;var b=a.slice().sort(function(x,y){return x-y;});return b[Math.floor(b.length/2)];}
function mean(a){if(!a.length)return NaN;var s=0;a.forEach(function(v){s+=v;});return s/a.length;}
function pct(n,d){return d? (100*n/d).toFixed(1)+'%':'n/a';}

var voiced=stats.held+stats.restruck;
var overTotal=stats.melOutside+stats.melInside;
print('=== MELODY OVER BORROWED HARMONY ===');
print('approach windows                 : '+stats.windows);
print('approach length (beats)          : median '+med(stats.approachBeats)+'  mean '+mean(stats.approachBeats).toFixed(2));
print('a REAL chord, for comparison     : median '+med(stats.realBeats)+'  mean '+mean(stats.realBeats).toFixed(2));
print('one WALK into one target         : '+stats.runBeats.length+' runs, median '+med(stats.runBeats)
      +' beats  mean '+mean(stats.runBeats).toFixed(2)+'   (median '+med(stats.runLen)+' chords)');
print('melody notes sounding over one   : median '+med(stats.melNotesOver)+'  mean '+mean(stats.melNotesOver).toFixed(2));
print('windows with NO melody over them : '+stats.silent+'/'+stats.windows+'  '+pct(stats.silent,stats.windows));
print('of the '+voiced+' that DO carry melody:');
print('  the melody HOLDS through       : '+stats.held+'  '+pct(stats.held,voiced)
      +'   (held note median '+med(stats.heldDur)+' beats)');
print('  the melody RESTRIKES inside    : '+stats.restruck+'  '+pct(stats.restruck,voiced));
print('');
print('melody notes over an approach, OUTSIDE the home key: '+stats.melOutside+'/'+overTotal+'  '+pct(stats.melOutside,overTotal));
print('  resolving BY STEP into the key next : '+pct(stats.outsideStepsBack, stats.melOutside)+'   (the player: 38%)');
print('  leaping back into the key next      : '+pct(stats.outsideLeapsBack, stats.melOutside)+'   (the player: 28%)');
print('  coming back into the key at all     : '+pct(stats.outsideStepsBack+stats.outsideLeapsBack, stats.melOutside)+'   (the player: 66%)');
print('  their length (beats)                : median '+med(stats.outsideDur));
print('');
print('=== THE RUN: the tune stops and the collection is played ===');
print('runs that draw a borrowed collection : '+stats.runs+'  (in '+stats.piecesWithRun+' of 36 pieces)');
print('  notes in them                      : '+stats.runNotes);
print('  actually IN the collection claimed : '+pct(stats.runNotesInCollection,stats.runNotes));
print('  naming their collection            : '+pct(stats.runNamed,stats.runs));
print('  sitting BELOW the tune\'s re-entry  : '+pct(stats.runBelowReentry,stats.runNotes)
      +'   median '+med(stats.runGapSemis)+' semitones under');
print('  handing over AT the re-entry       : '+pct(stats.runLandsAtReentry,stats.runs));

var fails=0;
function ok(cond,msg){ print((cond?'OK   ':'FAIL ')+msg); if(!cond)fails++; }
print('');
print('=== ASSERTIONS ===');
ok(stats.windows>0, 'the piece actually borrows ('+stats.windows+' approach windows)');
ok(med(stats.runBeats)>=2,
   'a walk into a target lasts a melody note\'s worth of time — median >= 2 beats (got '+med(stats.runBeats)+')');
ok(stats.silent/Math.max(1,stats.windows)<=0.25,
   'most approaches have a tune over them to be heard against — <= 25% silent (got '+pct(stats.silent,stats.windows)+')');
ok(stats.held/Math.max(1,voiced)>=0.6,
   'the melody holds through the approaches it is present for — >= 60% (got '+pct(stats.held,voiced)+')');
ok(stats.melOutside/Math.max(1,overTotal)<=0.30,
   'the melody mostly stays in the key while the harmony borrows — <= 30% outside (got '+pct(stats.melOutside,overTotal)+')');
ok(!stats.melOutside || stats.outsideStepsBack/stats.melOutside>=0.35,
   'a melody note that leaves the key mostly resolves BY STEP — >= 35%, the player\'s 38% (got '
   +pct(stats.outsideStepsBack,stats.melOutside)+')');
ok(!stats.melOutside || (stats.outsideStepsBack+stats.outsideLeapsBack)/stats.melOutside>=0.6,
   '...and comes back into the key one way or another — >= 60%, the player\'s 66% (got '
   +pct(stats.outsideStepsBack+stats.outsideLeapsBack,stats.melOutside)+')');
ok(!stats.outsideDur.length || med(stats.outsideDur)<=1,
   'and it is brief — median <= 1 beat (got '+med(stats.outsideDur)+')');

// ---- THE RUN, as a device ----
ok(stats.runs>0, 'the tune does stop and let the collection be played ('+stats.runs+' runs)');
ok(stats.runNotes>0 && stats.runNotesInCollection===stats.runNotes,
   'every note of a run is a real member of the collection it names — '
   +stats.runNotesInCollection+'/'+stats.runNotes);
ok(stats.runNamed===stats.runs,
   'every run says which collection it is playing — '+stats.runNamed+'/'+stats.runs);
ok(stats.runNotes>0 && stats.runBelowReentry/stats.runNotes>=0.9,
   'a run sits BELOW the note the tune comes back on — >= 90% (got '+pct(stats.runBelowReentry,stats.runNotes)+')');
ok(!stats.runGapSemis.length || med(stats.runGapSemis)>=3,
   'and a register under it, not doubling it — median >= 3 semitones (got '+med(stats.runGapSemis)+')');
ok(stats.runs>0 && stats.runLandsAtReentry/stats.runs>=0.8,
   'a run hands over AT the re-entry rather than stopping anywhere — >= 80% (got '+pct(stats.runLandsAtReentry,stats.runs)+')');
ok(stats.held>0 && stats.runs < stats.held,
   'holding is still the main case — '+stats.held+' holds against '+stats.runs+' runs');

print('');
print(fails? (fails+' FAILED'):'all OK');
