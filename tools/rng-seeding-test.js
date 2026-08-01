// Does the seed show through anywhere else?
//
// `form-planner.js` had an LCG whose FIRST output was a near-linear function of
// its seed. Because the form is chosen on the first call, consecutive seeds
// swept a narrow band of the range and the picker reached 17 of 33 forms. That
// was fixed there and only there, because that is where the damage could be
// measured. `melodic-line-engine.js` and `piano-texture-engine.js` have their
// own `makeRng` of the same shape, and both make a WHOLE-PIECE decision from an
// early draw:
//
//   melody  — the CONTOUR, from draws 1 and 2 (`toneContour && rng() < 0.55`,
//             else `CONTOURS[floor(rng() * 5)]`)
//   texture — the COMMITTED FIGURE, from draw 1 (`< 0.22` invariant figure,
//             `< 0.34` ground bass, else none)
//
// Anything decided from an early draw is exposed the same way, so this measures
// the two decisions themselves rather than the generator's statistics. The seeds
// are CONSECUTIVE on purpose: pressing Apply advances a variation counter by
// one, so consecutive seeds are exactly what a user hears.
//
// Two things are checked, and the second is the one that matters:
//   1. every contour is reachable, and the committed figure is not a step
//      function of the seed;
//   2. the decision actually CHANGES from one seed to the next. A generator
//      whose first draw creeps by 0.0004 per seed can still cover the range
//      over thousands of seeds while giving the same answer to every user who
//      presses Apply twice.
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

var out=[];function say(s){out.push(s);}
var fails=[];function need(ok,msg){if(!ok)fails.push(msg);}

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light','through','the','win','dow'];
var BPB=4;

// 'calm' keeps overallEnergy under the 0.62 gate so the committed figure is
// actually on the table — measuring a decision that never fires measures nothing.
function build(seed){
  var notes=mt.getScaleNotesWithKeySignature('C','major');
  var c={harmonicProfile:{root:'C',recommendedScale:'major',scaleNotes:notes},overallEnergy:0.45,
    emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.4,harmony:0.4},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:12,beatsPerBar:BPB,beatUnit:4,totalBeats:12*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  var p=buildPianoTexture(c,arc,h,m,seed);
  return {m:m,p:p};
}

// The committed figure is a whole-piece property: if it fired, EVERY section
// carries the same pattern and is flagged committed.
function committedOf(p){
  if(!p||!p.sections) return 'none';
  var keys=Object.keys(p.sections);
  if(!keys.length) return 'none';
  var first=p.sections[keys[0]];
  if(!first||!first.committed) return 'none';
  return first.pattern||'committed';
}

var N=240;
var contours={}, figures={}, contourSeq=[], figureSeq=[], takes=0;
for(var s=0;s<N;s++){
  var r; try{ r=build(s); }catch(e){ continue; }
  if(!r.m) continue;
  takes++;
  var ct=String(r.m.contour||'?');
  var fg=committedOf(r.p);
  contours[ct]=(contours[ct]||0)+1;
  figures[fg]=(figures[fg]||0)+1;
  contourSeq.push(ct);
  figureSeq.push(fg);
}

// How often does the answer change between seed s and seed s+1? A decision made
// from a first draw that creeps by ~0.0004 per seed changes on well under 1% of
// consecutive pairs; an independent draw changes on 1 - sum(p^2).
function flipRate(seq){
  var n=0; for(var i=1;i<seq.length;i++) if(seq[i]!==seq[i-1]) n++;
  return seq.length>1 ? n/(seq.length-1) : 0;
}
// What an independent draw over the SAME observed distribution would give, so
// the comparison is against this piece's own weighting rather than uniformity.
function expectedFlip(counts,total){
  var p2=0; Object.keys(counts).forEach(function(k){var p=counts[k]/total;p2+=p*p;});
  return 1-p2;
}

say('takes: '+takes+' over consecutive seeds 0…'+(N-1));
say('');

function report(label,counts,seq,universe){
  var keys=Object.keys(counts).sort();
  say(label+':');
  keys.forEach(function(k){
    say('  '+k+': '+counts[k]+' ('+(100*counts[k]/takes).toFixed(1)+'%)');
  });
  var fr=flipRate(seq), ef=expectedFlip(counts,takes);
  say('  reachable: '+keys.length+' of '+universe);
  say('  changes between consecutive seeds: '+(100*fr).toFixed(1)
      +'% (independent draw over the same distribution: '+(100*ef).toFixed(1)+'%)');
  say('');
  return {keys:keys,flip:fr,expected:ef};
}

var cRep=report('melody contour',contours,contourSeq,5);
var fRep=report('committed figure',figures,figureSeq,3);

// --- Assertions ---------------------------------------------------------
//
// Reachability alone is the weaker half: a decision that creeps linearly still
// visits every outcome eventually. The load-bearing assertion is that
// neighbouring seeds disagree at roughly the rate independent draws would.

need(cRep.keys.length===5,
  'melody contour reaches only '+cRep.keys.length+' of 5 contours over '+takes+' consecutive seeds');
need(fRep.keys.length===3,
  'committed figure reaches only '+fRep.keys.length+' of 3 outcomes ('+fRep.keys.join(', ')+')');

// Half the independent rate is a generous floor — it fails a decision that is a
// near-constant function of the seed without demanding statistical perfection.
need(cRep.flip > cRep.expected*0.5,
  'melody contour changes on only '+(100*cRep.flip).toFixed(1)+'% of consecutive seed pairs, vs '
  +(100*cRep.expected).toFixed(1)+'% for an independent draw — the seed is showing through');
need(fRep.flip > fRep.expected*0.5,
  'committed figure changes on only '+(100*fRep.flip).toFixed(1)+'% of consecutive seed pairs, vs '
  +(100*fRep.expected).toFixed(1)+'% for an independent draw — the seed is showing through');

// A decision that is a monotone function of the seed shows up as long unbroken
// runs of one answer. Measured directly, because it is the actual complaint:
// press Apply five times, hear the same texture five times.
function longestRun(seq){
  var best=1,cur=1;
  for(var i=1;i<seq.length;i++){ if(seq[i]===seq[i-1]){cur++;if(cur>best)best=cur;} else cur=1; }
  return best;
}
var cRun=longestRun(contourSeq), fRun=longestRun(figureSeq);
say('longest unbroken run of one answer — contour: '+cRun+', figure: '+fRun+' (of '+takes+')');
need(cRun <= takes*0.15,
  'melody contour holds one answer for '+cRun+' consecutive seeds in a row');
need(fRun <= takes*0.30,
  'committed figure holds one answer for '+fRun+' consecutive seeds in a row');

say('');
if(fails.length){
  say('FAIL');
  fails.forEach(function(f){say('  - '+f);});
  print(out.join('\n'));
  throw new Error('rng-seeding-test failed');
}
say('PASS — neither whole-piece decision is a function of the seed.');
print(out.join('\n'));
