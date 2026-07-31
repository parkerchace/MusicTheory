// Is there a SECOND piece of music going on, or just a tune with chords under it?
//
// The complaint: everything generates as a connected melody plus chords, with
// no countermelody, no harmonization of the tune, and no moment that bridges
// the two staves. These are four separate measurable things:
//
//   ANSWERED RESTS  when the melody stops for a beat or more, does anything
//                   happen in that gap? A phrase ending into an accompaniment
//                   that just keeps chugging is the sound of one part playing.
//   INDEPENDENCE    when the melody moves, does the bass move WITH it (parallel,
//                   which is one thickened line) or AGAINST it (contrary, which
//                   is two)? Real two-part writing is mostly contrary/oblique.
//   CROSSING        does the left hand ever get above the tune? A texture where
//                   the staves never trade register is two stacked layers, not
//                   two voices.
//   SECOND LINE     bars carrying a voice that is neither the melody nor a
//                   struck chord — an actual independent moving part.
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

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light'];
var BPB=4;

function build(key,scale,seed,energy){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:energy,
    emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.4,harmony:0.4},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:8,beatsPerBar:BPB,beatUnit:4,totalBeats:8*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  var p=buildPianoTexture(c,arc,h,m,seed);
  return {c:c,arc:arc,h:h,m:m,p:p};
}
function midiOf(n){var s=String(n||'').match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!s)return null;
  var M={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
  var pc=M[s[1].charAt(0).toUpperCase()+s[1].slice(1)];
  return pc===undefined?null:pc+(parseInt(s[2],10)+1)*12;}

var KEYS=[['C','major'],['G','major'],['D','dorian'],['A','minor'],['F','lydian'],['E','mixolydian']];

var takes=0;
var gaps=0, gapsAnswered=0;
var motionPairs=0, contrary=0, parallel=0, oblique=0, parallelPerfect=0;
var crossings=0, takesWithCrossing=0;
var barsTotal=0, barsWithSecondLine=0;

for(var k=0;k<KEYS.length;k++){
  for(var s=0;s<40;s++){
    var r;
    try{ r=build(KEYS[k][0],KEYS[k][1],s*37+k*11+5, s%3===0?0.72:0.45); }catch(e){ continue; }
    if(!r.p) continue;
    takes++;

    var mel=(r.m.notes||[]).map(function(n){
      return {start:n.bar*BPB+n.beat, end:n.bar*BPB+n.beat+(Number(n.duration)||1), midi:midiOf(n.noteName)};
    }).filter(function(e){return isFinite(e.midi);}).sort(function(a,b){return a.start-b.start;});
    if(mel.length<2) continue;

    // Read the NOTE NAMES, not the midis. The renderer, playback and MIDI
    // export all work from `noteNames`; `midis` is working state. A pass that
    // updated one and not the other would show as fixed in every number here
    // while the music went out unchanged — which is exactly what happened once
    // while this was being written.
    var namesToMidis=function(e){
      return (e.noteNames||[]).map(midiOf).filter(function(m){return m!==null&&isFinite(m);});
    };
    var lh=((r.p.leftHand)||[]).map(function(e){
      return {start:e.bar*BPB+(Number(e.beat)||0), midis:namesToMidis(e),
              isMelody:!!e.isMelody, pattern:e.pattern};
    }).filter(function(e){return e.midis.length;});
    var th=((r.p.trebleHarmony)||[]).map(function(e){
      return {start:e.bar*BPB+(Number(e.beat)||0), midis:namesToMidis(e),
              covers:!!e.coversMelody};
    }).filter(function(e){return e.midis.length;});
    var rhExtra=((r.p.rightHand)||[]).filter(function(e){return e.voice==='descant';});

    // --- ANSWERED RESTS ---------------------------------------------------
    // A gap of a beat or more between one melody note ending and the next
    // starting. Answered means SOMETHING attacks inside it.
    for(var i=0;i+1<mel.length;i++){
      var gapStart=mel[i].end, gapEnd=mel[i+1].start;
      if(gapEnd-gapStart < 1-1e-6) continue;
      gaps++;
      var answered=lh.concat(th).some(function(e){
        return e.start > gapStart+1e-6 && e.start < gapEnd-1e-6;
      });
      if(answered) gapsAnswered++;
    }

    // --- INDEPENDENCE -----------------------------------------------------
    // Melody note to melody note, against the lowest sounding bass at each.
    var bassAt=function(beat){
      var best=null;
      lh.forEach(function(e){ if(e.start<=beat+1e-6 && (!best||e.start>best.start)) best=e; });
      return best?Math.min.apply(null,best.midis):null;
    };
    for(var j=0;j+1<mel.length;j++){
      var m1=mel[j].midi, m2=mel[j+1].midi;
      var b1=bassAt(mel[j].start), b2=bassAt(mel[j+1].start);
      if(b1===null||b2===null) continue;
      var dm=m2-m1, db=b2-b1;
      if(dm===0&&db===0) continue;            // nothing moved: not a motion pair
      motionPairs++;
      if(dm===0||db===0) oblique++;
      else if((dm>0)===(db>0)){
        parallel++;
        // Parallel thirds and sixths are good two-part writing. What collapses
        // two voices into one thickened line is parallel PERFECT consonances —
        // fifths and octaves — which is the one parallel motion every tradition
        // that writes two parts actually forbids.
        var i1=Math.abs(m1-b1)%12, i2=Math.abs(m2-b2)%12;
        if(i1===i2 && (i1===7 || i1===0)) parallelPerfect++;
      }
      else contrary++;
    }

    // --- CROSSING ---------------------------------------------------------
    var melAt=function(beat){
      var v=null;
      mel.forEach(function(e){ if(beat>=e.start-1e-6 && beat<e.end-1e-6) v=e.midi; });
      return v;
    };
    var crossedHere=0;
    lh.forEach(function(e){
      if(e.isMelody) return;                  // tenor lead is the tune, not a crossing
      var mv=melAt(e.start);
      if(mv===null) return;
      if(Math.max.apply(null,e.midis) > mv) crossedHere++;
    });
    crossings+=crossedHere;
    if(crossedHere) takesWithCrossing++;

    // --- SECOND LINE ------------------------------------------------------
    // A bar counts when something other than the tune is a MOVING single line:
    // a descant, a covering voice, or a left-hand attack of one note that is
    // not simply part of a struck chord.
    var barsSeen={}, barsWith={};
    mel.forEach(function(e){ barsSeen[Math.floor(e.start/BPB)]=true; });
    rhExtra.forEach(function(e){ barsWith[e.bar]=true; });
    th.forEach(function(e){ if(e.covers) barsWith[Math.floor(e.start/BPB)]=true; });
    // single-note left-hand attacks that move from the previous one
    var prev=null;
    lh.forEach(function(e){
      if(e.midis.length===1){
        if(prev!==null && e.midis[0]!==prev) barsWith[Math.floor(e.start/BPB)]=true;
        prev=e.midis[0];
      } else prev=null;
    });
    barsTotal+=Object.keys(barsSeen).length;
    barsWithSecondLine+=Object.keys(barsWith).filter(function(b){return barsSeen[b];}).length;
  }
}

function pct(a,b){ return b? (a/b*100).toFixed(1)+'%' : 'n/a'; }
print('');
print('TWO-PART WRITING — '+takes+' takes across '+KEYS.length+' modes');
print('');
print('  melody rests of a beat or more   : '+gaps);
print('    ...with something in the gap   : '+gapsAnswered+' ('+pct(gapsAnswered,gaps)+')');
print('');
print('  melody/bass motion pairs         : '+motionPairs);
print('    contrary                       : '+contrary+' ('+pct(contrary,motionPairs)+')');
print('    oblique                        : '+oblique+' ('+pct(oblique,motionPairs)+')');
print('    parallel                       : '+parallel+' ('+pct(parallel,motionPairs)+')');
print('      ...of which 5ths/8ves        : '+parallelPerfect+' ('+pct(parallelPerfect,motionPairs)+' of all motion)');
print('');
print('  left hand rising above the tune  : '+crossings+' attacks, in '+takesWithCrossing+' of '+takes+' takes');
print('');
print('  bars with a second moving line   : '+barsWithSecondLine+' of '+barsTotal+' ('+pct(barsWithSecondLine,barsTotal)+')');
print('');

// Thresholds sit below what the code currently achieves but far above what it
// did, so the test fails if any of the three devices stops working without
// tripping on ordinary take-to-take variation.
var failures=0;
function want(name, got, cmp, limit, was){
  var ok = cmp==='>=' ? got>=limit : got<=limit;
  if(!ok){ failures++; print('  FAIL '+name+': '+got.toFixed(1)+' ('+cmp+' '+limit+' expected, was '+was+' before)'); }
  else print('  OK   '+name+' — '+got.toFixed(1)+' (was '+was+')');
}
print('REGRESSION LINES');
want('melody rests get an answer', gapsAnswered/gaps*100, '>=', 60, '22.9%');
want('the left hand crosses the tune somewhere', takesWithCrossing/takes*100, '>=', 5, '0%');
// 7.0, not the 5.7 this reached when the repair first landed. The texture
// return raised it back to 6.5 and the cause is understood rather than
// mysterious: a letter that recurs now keeps its figure instead of being
// swapped down by the breath curve, so more ground-bass and walking sections
// survive — and those are EXEMPT from the parallel repair on purpose, because
// their bass line is a decision rather than an accident. Repairing them would
// be overwriting a device with a rule. So the number sits between the 7.3%
// it started at and the 5.7% that was only available while those devices were
// being quietly swapped away.
want('parallel 5ths/8ves with the tune stay rare', parallelPerfect/motionPairs*100, '<=', 7.0, '7.3%');
print('');
print(failures? ('FAILURES: '+failures) : 'the two hands answer each other');
