// Does the texture come back when the material does?
//
// Committing to one figure for a whole piece is the UNCHANGING half of the
// Gymnopédie lesson. The other half is the RETURN: a texture stated, departed
// from, and brought back, so that coming back is heard as coming back. That
// only works if the texture is attached to the MATERIAL rather than to the
// section — when the A material returns, the sound it arrived in returns too.
//
// Measured as: in a form where a letter appears more than once, do those
// sections share a pattern, a density, and their orchestrational treatment?
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

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light','through','the','win','dow'];
var BPB=4;

function build(seed,energy){
  var notes=mt.getScaleNotesWithKeySignature('C','major');
  var c={harmonicProfile:{root:'C',recommendedScale:'major',scaleNotes:notes},overallEnergy:energy,
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
  return {c:c,p:p};
}

var takes=0, formsWithRepeat=0;
var letterGroups=0, groupsMatchingPattern=0, groupsMatchingActivity=0, groupsMatchingExtras=0;
var examples=[];

for(var s=0;s<160;s++){
  var r;
  try{ r=build(s*29+13, s%3===0?0.7:0.45); }catch(e){ continue; }
  if(!r.p||!r.c.form||!Array.isArray(r.c.form.sections)) continue;
  takes++;

  // Group the form's sections by letter.
  var byLetter={};
  r.c.form.sections.forEach(function(sec){
    if(!sec||!sec.letter) return;
    (byLetter[sec.letter]=byLetter[sec.letter]||[]).push(sec);
  });

  var repeated=Object.keys(byLetter).filter(function(L){ return byLetter[L].length>1; });
  if(!repeated.length) continue;
  formsWithRepeat++;

  repeated.forEach(function(L){
    var cfgs=byLetter[L].map(function(sec){ return r.p.sections[sec.label]; })
                        .filter(function(c){ return !!c; });
    if(cfgs.length<2) return;
    letterGroups++;

    var pat=cfgs.every(function(c){ return c.pattern===cfgs[0].pattern; });
    var act=cfgs.every(function(c){ return Math.abs((c.activity||0)-(cfgs[0].activity||0))<1e-9; });
    var ext=cfgs.every(function(c){
      return c.lead===cfgs[0].lead && c.rhExtra===cfgs[0].rhExtra
          && !!c.lhCrossover===!!cfgs[0].lhCrossover
          && !!c.bassMelody===!!cfgs[0].bassMelody
          && !!c.coveredMelody===!!cfgs[0].coveredMelody;
    });
    if(pat) groupsMatchingPattern++;
    if(act) groupsMatchingActivity++;
    if(ext) groupsMatchingExtras++;

    if(!pat && examples.length<6){
      examples.push('seed '+(s*29+13)+' letter '+L+': '
        +cfgs.map(function(c){return c.pattern;}).join(' vs '));
    }
  });
}

function pct(a,b){ return b? (a/b*100).toFixed(1)+'%' : 'n/a'; }
print('');
print('TEXTURE RETURN — '+takes+' takes, '+formsWithRepeat+' with a repeated letter');
print('');
print('  letters appearing more than once   : '+letterGroups);
print('    same accompaniment figure        : '+groupsMatchingPattern+' ('+pct(groupsMatchingPattern,letterGroups)+')');
print('    same density                     : '+groupsMatchingActivity+' ('+pct(groupsMatchingActivity,letterGroups)+')');
print('    same orchestrational treatment   : '+groupsMatchingExtras+' ('+pct(groupsMatchingExtras,letterGroups)+')');
if(examples.length){
  print('');
  print('  letters whose texture did NOT return:');
  examples.forEach(function(e){ print('    '+e); });
}
print('');

var failures=0;
function want(name, got, limit, was){
  if(got>=limit) print('  OK   '+name+' — '+got.toFixed(1)+'% (was '+was+')');
  else { failures++; print('  FAIL '+name+' — '+got.toFixed(1)+'%, expected at least '+limit+'%'); }
}
if(letterGroups===0){
  print('  (no repeated letters in any form — nothing to measure)');
} else {
  want('a returning letter brings its figure back', groupsMatchingPattern/letterGroups*100, 99, 'random per section');
  want('...at the same density', groupsMatchingActivity/letterGroups*100, 99, 'random per section');
  want('...wearing the same treatment', groupsMatchingExtras/letterGroups*100, 99, 'random per section');
}
print('');
print(failures? ('FAILURES: '+failures) : 'the texture returns with the material');

// --- ESCALATION ----------------------------------------------------------
// The Ellington device: the same idea BUILT ON. The return supplies
// recognition (same figure, same density, same treatment); the escalation
// supplies development (more weight each time). Either alone is half a device
// — recognition without growth is a loop, growth without recognition is three
// different sections.
print('');
print('ESCALATION');
var groups=0, growing=0, sameFigureThroughout=0, shrank=0, shrinkExamples=[];

for(var t=0;t<160;t++){
  var rr;
  try{ rr=build(t*29+13, t%3===0?0.7:0.45); }catch(e){ continue; }
  if(!rr.p||!rr.c.form||!Array.isArray(rr.c.form.sections)) continue;

  var byL={};
  rr.c.form.sections.forEach(function(sec){
    if(!sec||!sec.letter) return; (byL[sec.letter]=byL[sec.letter]||[]).push(sec);
  });

  Object.keys(byL).forEach(function(L){
    var secs=byL[L];
    if(secs.length<2) return;
    groups++;

    // WEIGHT per statement: notes per ATTACK, read from the note names the
    // renderer draws.
    //
    // Not notes per BAR, which was the first thing measured here and is
    // confounded: two statements of the same letter can differ in length and in
    // how many chords the harmony puts under them, so a statement could come
    // out "lighter" per bar purely because it had fewer chord changes. That is
    // not the texture ebbing, and a number that cannot tell the difference
    // cannot judge escalation. Weight is how much is under the hand when it
    // plays — which is exactly what escalation adds.
    var weights=secs.map(function(sec){
      var lo=sec.startBar, hi=sec.endBar, n=0, attacks=0;
      ((rr.p.leftHand)||[]).forEach(function(e){
        if(e.bar<lo || e.bar>hi) return;
        if(e.pattern==='answeringFill' || e.pattern==='crossover') return;  // gestures, not the texture
        n += (e.noteNames||[]).length; attacks++;
      });
      return attacks ? n/attacks : 0;
    });
    var figures=secs.map(function(sec){
      var c=rr.p.sections[sec.label]; return c?c.pattern:null;
    });

    if(figures.every(function(f){ return f===figures[0]; })) sameFigureThroughout++;

    var monotone=true;
    for(var i=1;i<weights.length;i++){
      // Later statements must not be LIGHTER than earlier ones. A small
      // tolerance, because a statement can legitimately sit over a chord with
      // fewer tones available to thicken.
      if(weights[i] < weights[i-1]-0.35) monotone=false;
    }
    if(monotone) growing++;
    else {
      shrank++;
      if(shrinkExamples.length<5){
        shrinkExamples.push('seed '+(t*29+13)+' letter '+L+': '
          +weights.map(function(w){return w.toFixed(1);}).join(' → '));
      }
    }
  });
}

// The octave doubling underneath is a separate promise from the thickening,
// and the per-attack average absorbs it (it touches one attack per bar), so it
// gets its own count. Without this the doubling could be removed entirely and
// every number above would stay green.
var escBars=0, escBarsDoubled=0;
for(var t2=0;t2<160;t2++){
  var r2;
  try{ r2=build(t2*29+13, t2%3===0?0.7:0.45); }catch(e){ continue; }
  if(!r2.p||!r2.c.form||!Array.isArray(r2.c.form.sections)) continue;
  r2.c.form.sections.forEach(function(sec){
    var cfg=r2.p.sections[sec.label];
    if(!cfg||!(cfg.escalation>0)) return;
    for(var b=sec.startBar;b<=sec.endBar;b++){
      var inBar=((r2.p.leftHand)||[]).filter(function(e){
        return e.bar===b && e.pattern!=='answeringFill' && e.pattern!=='crossover';
      }).sort(function(a,c){ return (a.beat||0)-(c.beat||0); });
      if(!inBar.length) continue;
      escBars++;
      var first=inBar[0];
      var ms=(first.noteNames||[]).map(function(n){
        var m=String(n).match(/^([A-Ga-g][#b]?)(-?\d+)$/); if(!m) return null;
        var S={C:0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11};
        var pc=S[m[1].charAt(0).toUpperCase()+m[1].slice(1)];
        return pc===undefined?null:pc+(parseInt(m[2],10)+1)*12;
      }).filter(function(x){return x!==null;});
      // A doubled bass shows as two notes an octave apart at the bottom.
      ms.sort(function(a,c){return a-c;});
      if(ms.length>=2 && ms[1]-ms[0]===12) escBarsDoubled++;
    }
  });
}
print('  escalating bars                    : '+escBars);
print('    with the bass doubled underneath : '+escBarsDoubled+' ('+pct(escBarsDoubled,escBars)+')');
print('');
print('  letters stated more than once      : '+groups);
print('    same figure across all statements: '+sameFigureThroughout+' ('+pct(sameFigureThroughout,groups)+')');
print('    never lighter than the last       : '+growing+' ('+pct(growing,groups)+')');
if(shrinkExamples.length){
  print('    statements that got lighter:');
  shrinkExamples.forEach(function(e){ print('      '+e); });
}
print('');
want('a restated letter never comes back lighter', growing/groups*100, 95, 'unordered');
want('...while staying the same figure', sameFigureThroughout/groups*100, 99, '20.6%');
want('escalating statements gain weight underneath', escBars? escBarsDoubled/escBars*100 : 100, 40, 'never');
print('');
print(failures? ('FAILURES: '+failures) : 'the texture returns, and it grows');
// A HARNESS THAT CANNOT GO RED IS NOT A HARNESS.
// This printed its verdict and exited 0, so every runner that checks exit
// status reported it as passing whatever it had just found. Discovered when
// `accidentals-test.js` sat at 'FAILURES: 1' for a whole run without anyone
// noticing, and true of six of the fifteen harnesses at the time.
if (failures) throw new Error('texture-return-test: '+failures+' failure(s)');
