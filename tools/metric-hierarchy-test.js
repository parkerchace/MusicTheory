// Strong and weak, and what the line does with them.
//
// From christianm77's post on the jazz guitar forum, which is a better brief
// than most textbooks because it says three separate things and is careful to
// keep them separate:
//
//   1. STRONG/WEAK IS A NESTED HIERARCHY, not a binary. Odd/even numbered bars,
//      first/second half of the bar, odd/even numbered beats, downbeats/upbeats,
//      eighths/double-time upbeats. "Like a set of Matryoshka dolls."
//
//   2. THE WEAK SIDE IS WHERE DISSONANCE LIVES. "Think of a walking bassline —
//      your chromatic approach notes would typically go on 2 and 4, while chord
//      tones would go on 1 and 3." Consonance is a function of metric position,
//      graded, not a single threshold.
//
//   3. AND IT IS THERE TO BE SUBVERTED. "Jazz subverts Western rhythmic
//      expectations almost as a rule… Charlie Parker was known for turning
//      rhythm sections around by messing with these expectations. Losing the 1,
//      in other words — but knowing exactly where it is." Which is the whole
//      point: you cannot lose a beat the listener was not already holding.
//
// A fourth thing, on leaps, from Hal Galper's Forward Motion by way of Julian
// Lage's four-syllable summary — "blah, blah, blah, ONE": a line is heard as
// travelling TOWARDS a strong beat, not as starting from one. A leap is an
// event in that travel, so it wants preparing and answering.
//
// This measures all four. Run before changing anything, so the numbers mean
// something.
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

function build(key,scale,seed,colour){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:0.55,
    emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:colour,harmony:colour},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:12,beatsPerBar:BPB,beatUnit:4,totalBeats:12*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  return {c:c,h:h,m:generateMelody(c,arc,h,seed)};
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

// THE HIERARCHY, named by level rather than scored, so the report reads as the
// post describes it. Deliberately measured off the DELIVERED note (bar, beat,
// noteName) rather than off any label the engine attached.
//   0  the downbeat of an odd-numbered bar  — the strongest thing there is
//   1  the downbeat of an even-numbered bar
//   2  beat 3 — the head of the second half of the bar
//   3  beats 2 and 4 — the weak beats
//   4  the upbeats (the '&'s)
//   5  anything finer
// Counted from the start of the PHRASE, not from bar zero — a new phrase
// restarts the hypermetric count, which is how the grouping is heard. Measured
// against absolute bar parity instead, a section beginning on an odd bar has
// its hypermeter inverted for its whole length and the two strongest levels
// average into each other.
function levelOf(barInPhrase, beatInBar){
  var eps=1e-6;
  var onBeat=Math.abs(beatInBar-Math.round(beatInBar))<eps;
  if(!onBeat){
    var frac=beatInBar-Math.floor(beatInBar);
    return Math.abs(frac-0.5)<eps ? 4 : 5;
  }
  var b=Math.round(beatInBar);
  if(b===0) return (((barInPhrase%4)+4)%4===0) ? 0 : 1;
  if(b===2) return 2;
  return 3;
}
var LEVEL_NAME=['hyperdownbeat (bar 1 of 4)','other downbeats','beat 3 (half-bar)',
                'beats 2 and 4','the upbeats (&)','finer than an upbeat'];

var KEYS=[['C','major'],['A','natural_minor'],['D','dorian'],
          ['G','major'],['F','lydian'],['Bb','major']];

// TWO NUMBERS PER LEVEL, because the first one alone measures the wrong thing.
//
// Chord-tone rate conflates "consonant" with "not dissonant", and a suspension
// is neither: it is a PREPARED dissonance, and preparing it is what makes an
// accented dissonance meaningful rather than wrong. The half-bar is where a
// mid-bar chord change puts most of the suspensions, so scoring it on chord
// tones alone showed it as the least consonant place in the bar when what was
// actually happening there was the most careful writing in the piece.
//
// So the load-bearing number is UNPREPARED dissonance: a non-chord tone that
// was neither already sounding (a suspension) nor stepped into (an approach).
// That is the thing the hierarchy is supposed to grade, and it is the thing a
// listener hears as a wrong note when it lands somewhere strong.
var atLevel=[];
for(var L=0;L<6;L++) atLevel.push({n:0, chordTone:0, unprepared:0, suspension:0, approach:0, appog:0});

// STEP, SKIP, LEAP — three things, not two.
//
// The first version of this counted everything wider than a step as a leap and
// reported 38.7% of all motion leaping, which is absurd on its face and was the
// metric's fault: 62% of those were thirds. A third is a SKIP — it is inside
// the chord, it needs no preparing and no answering, and treating it as an
// event to be recovered from would turn every arpeggio into a problem. A leap
// is a fifth or wider, and that is the thing that has to be arrived at and
// answered.
var leaps={n:0, toChordTone:0, answered:0, recovered:0, prepared:0, onStrong:0, atSeam:0, wideSeam:0};
var skips=0, steps=0, repeats=0, motions=0;
var bySize={};
var takes=0, notesTotal=0;
// THE SUBVERSION — the third of the post's three claims, and the one the app
// had no equivalent of at all. Every number above describes a rule being kept;
// this describes it being broken on purpose.
var sub={takes:0, n:0, inFirstSection:0, unresolved:0, tooEarly:0, notHyperdownbeat:0, most:0};

for(var k=0;k<KEYS.length;k++){
  for(var s=0;s<40;s++){
    var r;
    try{ r=build(KEYS[k][0],KEYS[k][1],s*43+k*11+5, s%2?0.6:0.35); }catch(e){ continue; }
    var ns=(r.m.notes||[]).filter(function(n){ return n && n.noteName; });
    if(ns.length<6) continue;
    takes++;

    var midis=ns.map(function(n){ return midiOf(n.noteName); });

    // --- the subversion -----------------------------------------------------
    var here=0, plainSoFar=0;
    ns.forEach(function(n,i){
      var m=midis[i]; if(!isFinite(m)) return;
      var secStart=(r.c.form&&r.c.form.sectionOfBar&&r.c.form.sectionOfBar[n.bar]
                    &&isFinite(r.c.form.sectionOfBar[n.bar].startBar))
                   ? r.c.form.sectionOfBar[n.bar].startBar : 0;
      var lvl=levelOf(n.bar-secStart, n.beat);
      var pcs=chordPcs(chordAt(r.h,n.bar*BPB+n.beat));
      if(n.role!=='appoggiatura'){
        // A hyperdownbeat that ARRIVED on the chord tone is what builds the
        // expectation; one that did not, builds nothing.
        if(lvl===0 && pcs.indexOf(((m%12)+12)%12)>=0) plainSoFar++;
        return;
      }
      here++; sub.n++;
      if(secStart===0) sub.inFirstSection++;
      if(lvl!==0) sub.notHyperdownbeat++;
      if(plainSoFar<3) sub.tooEarly++;
      // IT HAS TO RESOLVE — down by step, and onto the note that was expected.
      var nx=midis[i+1];
      var ok = isFinite(nx) && nx<m && m-nx<=2;
      if(!ok) sub.unresolved++;
    });
    if(here>0) sub.takes++;
    if(here>sub.most) sub.most=here;

    ns.forEach(function(n,i){
      var m=midis[i]; if(!isFinite(m)) return;
      notesTotal++;
      var beat=n.bar*BPB+n.beat;
      var secStart=(r.c.form&&r.c.form.sectionOfBar&&r.c.form.sectionOfBar[n.bar]
                    &&isFinite(r.c.form.sectionOfBar[n.bar].startBar))
                   ? r.c.form.sectionOfBar[n.bar].startBar : 0;
      var lvl=levelOf(n.bar-secStart, n.beat);
      var pcs=chordPcs(chordAt(r.h,beat));
      atLevel[lvl].n++;
      var isChordTone=pcs.indexOf(((m%12)+12)%12)>=0;
      if(isChordTone) atLevel[lvl].chordTone++;

      if(i===0) return;
      var prev=midis[i-1]; if(!isFinite(prev)) return;
      if(!isChordTone && pcs.length){
        var suspended = (prev===m);
        var steppedInto = Math.abs(m-prev)<=2 && m!==prev;
        // AN APPOGGIATURA IS PREPARED BY ITS RESOLUTION, not by its approach —
        // which is the whole point of the device and the one kind of accented
        // dissonance that is licensed by what comes AFTER it. Classified by
        // pitch like everything else here: a non-chord tone on a strong beat
        // that falls by step onto a chord tone. Without this the harness scored
        // the deliberate subversion as the accident it exists to be distinguished
        // from, which would have made the check fire on the device working.
        var nxt=midis[i+1];
        var resolvesDown = isFinite(nxt) && nxt<m && m-nxt<=2
          && pcs.indexOf(((nxt%12)+12)%12)>=0;
        if(suspended) atLevel[lvl].suspension++;
        else if(steppedInto) atLevel[lvl].approach++;
        else if(resolvesDown) atLevel[lvl].appog++;
        else atLevel[lvl].unprepared++;
      }
      var d=m-prev;
      motions++;
      var size=Math.abs(d);
      bySize[size]=(bySize[size]||0)+1;
      if(d===0){ repeats++; return; }
      if(size<=2){ steps++; return; }
      if(size<=4){ skips++; return; }

      // A LEAP: a fifth or wider.
      leaps.n++;
      // AT A SEAM: the leap lands on a structural anchor, meaning it is the join
      // between two phrases rather than a gesture anyone chose. This was 59% of
      // all leaps, and the cause was that `current` is reset to the anchor's own
      // pitch at the top of every span — so every guard asking "how far did the
      // line just jump" answered zero at precisely the moment it crossed a seam.
      if(n.role==='anchor'){ leaps.atSeam++; if(size>=7) leaps.wideSeam++; }
      if(pcs.indexOf(((m%12)+12)%12)>=0) leaps.toChordTone++;
      if(lvl<=2) leaps.onStrong++;
      // ANSWERED: the note after a leap steps back the other way. This is the
      // oldest rule there is about leaps and the engine already has a
      // 'recovery' role for it — measured by pitch, not by the label.
      // ANSWERED, measured two ways.
      //
      // A step back is the ideal and a third is the honest fallback — where the
      // beat demands a chord tone and none is a step away, contrary motion by a
      // third is still the leap being recovered from. What makes the pair one
      // gesture is that the answer goes the other way and is SMALLER than the
      // leap; insisting on a step alone scored a real recovery as a failure.
      var nx=midis[i+1];
      if(isFinite(nx)){
        var back=nx-m;
        var contrary = back!==0 && Math.sign(back)!==Math.sign(d) && Math.abs(back)<Math.abs(d);
        if(contrary && Math.abs(back)<=2) leaps.answered++;
        if(contrary && Math.abs(back)<=4) leaps.recovered++;
      }
      // PREPARED: the note before the leap moved the other way, so the leap is
      // arrived at rather than merely happening.
      var pp=midis[i-2];
      if(isFinite(pp)){
        var into=prev-pp;
        if(into!==0 && Math.sign(into)!==Math.sign(d)) leaps.prepared++;
      }
    });
  }
}

function pct(a,b){ return b? (a/b*100).toFixed(1)+'%' : 'n/a'; }
var out=[]; function say(x){ out.push(x); }

say('');
say('METRIC HIERARCHY AND LEAPS — '+takes+' takes, '+notesTotal+' notes across '+KEYS.length+' modes');
say('');
say('  1. IS CONSONANCE GRADED BY METRIC LEVEL?');
say('     the post: chord tones on 1 and 3, approach notes on 2 and 4');
say('');
for(var L=0;L<6;L++){
  if(!atLevel[L].n) continue;
  say('     '+LEVEL_NAME[L].padEnd(26)+' n='+String(atLevel[L].n).padStart(5)
      +'  chord tone '+pct(atLevel[L].chordTone,atLevel[L].n).padStart(6)
      +'  suspension '+pct(atLevel[L].suspension,atLevel[L].n).padStart(6)
      +'  approach '+pct(atLevel[L].approach,atLevel[L].n).padStart(6)
      +'  appogg '+pct(atLevel[L].appog,atLevel[L].n).padStart(5)
      +'  UNPREPARED '+pct(atLevel[L].unprepared,atLevel[L].n).padStart(6));
}
say('');
say('  2. HOW THE LINE MOVES — '+motions+' motions');
say('     repeated notes      '+pct(repeats,motions));
say('     steps (1-2 st)      '+pct(steps,motions));
say('     skips (a third)     '+pct(skips,motions));
say('     LEAPS (5 st or more)'+pct(leaps.n,motions));
say('     stepwise as a share of motion that actually moves: '
    +pct(steps, motions-repeats));
say('');
say('  3. ARE LEAPS EVENTS? — '+leaps.n+' of them');
say('     landing on a chord tone      : '+pct(leaps.toChordTone,leaps.n));
say('     answered by a contrary step  : '+pct(leaps.answered,leaps.n));
say('     ...or by contrary motion     : '+pct(leaps.recovered,leaps.n));
say('     approached from the other way: '+pct(leaps.prepared,leaps.n));
say('     landing on a strong position : '+pct(leaps.onStrong,leaps.n));
say('     landing on a phrase SEAM     : '+pct(leaps.atSeam,leaps.n)+'  (was 59%)');
say('     ...a SIXTH or wider at a seam: '+leaps.wideSeam+' ('+pct(leaps.wideSeam,motions)+' of all motion)');
say('     interval sizes (semitones, all motion):');
Object.keys(bySize).map(Number).sort(function(a,b){return a-b;}).forEach(function(sz){
  if(!sz) return;
  say('       '+String(sz).padStart(2)+'  '+String(bySize[sz]).padStart(4)
      +'  '+pct(bySize[sz],motions));
});
say('');
say('  4. THE SUBVERSION — losing the 1, but knowing exactly where it is');
say('     takes that lose the 1  : '+sub.takes+' of '+takes+' ('+pct(sub.takes,takes)+')');
say('     appoggiaturas written  : '+sub.n+', at most '+sub.most+' in any one take');
say('     in the FIRST section   : '+sub.inFirstSection+'  (should be 0)');
say('     not on a hyperdownbeat : '+sub.notHyperdownbeat+'  (should be 0)');
say('     before the pattern was stated three times : '+sub.tooEarly+'  (should be 0)');
say('     failing to resolve down by step           : '+sub.unresolved+'  (should be 0)');
say('');

var failures=0;
function want(name, ok, detail){
  if(ok) say('  OK   '+name+(detail?' — '+detail:''));
  else { failures++; say('  FAIL '+name+(detail?' — '+detail:'')); }
}

// --- 1. THE HIERARCHY IS NESTED, NOT BINARY ------------------------------
// The engine's own `metricStrength` had four levels inside a bar and nothing
// above the bar, and `dissonanceVerdict` collapsed all of it to one test:
// `strength < 0.5` is free, anything else is not. That is a binary wearing a
// hierarchy's clothes. What the post describes is a gradient, and a gradient is
// what a listener actually tracks.
var lvl0=atLevel[0], lvl1=atLevel[1], lvl2=atLevel[2], lvl3=atLevel[3], lvl4=atLevel[4];
var free=function(x){ return x.n ? x.unprepared/x.n : 0; };

// THE LADDER, top to bottom. Each rung must admit strictly more unprepared
// dissonance than the one above it — that IS the hierarchy, and it is the thing
// a single `strength < 0.5` test could not express however many levels the
// strength itself had.
want('the hyperdownbeat admits no unprepared dissonance at all',
     free(lvl0)<=0.005, pct(lvl0.unprepared,lvl0.n));
// One assertion, not three. The engine admits essentially NO unprepared
// dissonance on any beat at all, so ordering the on-beat levels against each
// other was comparing zeros to zeros — and a comparison between two zeros can
// go either way on a rounding and tells nobody anything. What is actually true
// is the statement below, and the gradient the hierarchy really produces shows
// up in the kind of dissonance rather than the amount of it.
want('no beat admits unprepared dissonance',
     free(lvl1)<=0.005 && free(lvl2)<=0.005 && free(lvl3)<=0.01,
     'downbeats '+pct(lvl1.unprepared,lvl1.n)
     +', half-bar '+pct(lvl2.unprepared,lvl2.n)
     +', beats 2 and 4 '+pct(lvl3.unprepared,lvl3.n));
want('the upbeats are the freest place of all',
     lvl4.n>0 && free(lvl4)>free(lvl3),
     'upbeats '+pct(lvl4.unprepared,lvl4.n)+' vs beats 2 and 4 '+pct(lvl3.unprepared,lvl3.n));
// …and the difference has to be real, not three values a rounding apart. The
// engine turns out to admit essentially NO unprepared dissonance anywhere on a
// beat, which is the right answer and means the interesting differentiation is
// not here — it is in WHICH KIND of prepared dissonance goes where. See below.
// 0.02 dropped to 0.012 when the harmony sustain budget landed: a held chord
// means fewer bars where the melody's passing tones are answering to a chord
// that just changed, so there is less friction for "unprepared" to even be an
// option, upbeats included. Confirmed by isolating the change (sustain budget
// forced to 0 restores 2.4%) rather than assumed — a real, benign side effect
// of more harmonic stability, not a fault in either device. The floor stays
// well clear of the strong beats' near-zero rate either way.
want('the upbeats admit unprepared dissonance and the beats do not',
     free(lvl4) >= 0.012 && free(lvl0) <= 0.005 && free(lvl1) <= 0.005
       && free(lvl2) <= 0.005 && free(lvl3) <= 0.01,
     'upbeats '+pct(lvl4.unprepared,lvl4.n)+' against the beats');

// THE WALKING-BASS RULE, which is the post's own example and the sharpest
// statement of what the hierarchy is FOR: "your chromatic approach notes would
// typically go on 2 and 4, while chord tones would go on 1 and 3."
var apr=function(x){ return x.n ? x.approach/x.n : 0; };
var sus=function(x){ return x.n ? x.suspension/x.n : 0; };
want('approach notes go on the weak side',
     apr(lvl3) > apr(lvl0) && apr(lvl3) > apr(lvl1),
     'beats 2 and 4 '+pct(lvl3.approach,lvl3.n)
     +' vs the downbeats '+pct(lvl0.approach+lvl1.approach, lvl0.n+lvl1.n));
// …and the suspension is the STRONG side's dissonance, which is the complement
// of the same rule: a suspension needs a strong beat to be accented against.
want('suspensions go on the strong side',
     sus(lvl2)+sus(lvl1) > sus(lvl3)*1.5,
     'the half-bar '+pct(lvl2.suspension,lvl2.n)
     +' and the downbeats '+pct(lvl1.suspension,lvl1.n)
     +' vs beats 2 and 4 '+pct(lvl3.suspension,lvl3.n));
// The chord-tone reading still has to come out the right way round at the ends,
// or the hierarchy is being satisfied on a technicality.
want('the downbeats are still the most consonant place in the bar',
     lvl0.chordTone/lvl0.n > lvl4.chordTone/lvl4.n,
     'downbeats '+pct(lvl0.chordTone,lvl0.n)+' vs upbeats '+pct(lvl4.chordTone,lvl4.n));

// --- 2. LEAPS ARE EVENTS ---------------------------------------------------
want('a leap lands on a chord tone', leaps.n>0 && leaps.toChordTone/leaps.n>=0.85,
     pct(leaps.toChordTone,leaps.n));
want('a leap is recovered from by contrary motion', leaps.n>0 && leaps.recovered/leaps.n>=0.75,
     pct(leaps.recovered,leaps.n));
want('...and usually by a step', leaps.n>0 && leaps.answered/leaps.n>=0.50,
     pct(leaps.answered,leaps.n));
want('a leap lands on a strong position', leaps.n>0 && leaps.onStrong/leaps.n>=0.55,
     pct(leaps.onStrong,leaps.n));
// THE SEAM. A leap that happens because two independently-decided things were
// placed next to each other is an accident, and it was the single largest source
// of leaps in the line. The anchor's DEGREE is a structural decision and stays;
// its OCTAVE was never a decision at all, and is now taken nearest the note just
// sounded.
//
// The share of leaps landing on an anchor is reported but NOT asserted: it only
// moved 55% -> 50%, because the nearest register of a fixed degree can still be
// half an octave away and a phrase starting a fourth from where the last one
// ended is perfectly ordinary. An assertion in a five-point gap would be a
// threshold picked to pass. What the repair actually removed is the WIDE seam —
// the sixth, seventh and octave jumps between phrases, which are the ones that
// read as the line being cut and pasted rather than continued.
// 0.8% with the repair and 2.8% without it — three and a half times, which is a
// gap wide enough to put a threshold in the middle of rather than on top of one
// of the two states.
want('a phrase does not begin by jumping a sixth from where the last one ended',
     leaps.wideSeam/motions <= 0.012,
     leaps.wideSeam+' wide seams, '+pct(leaps.wideSeam,motions)+' of all motion');
// A GUARD AGAINST A RUNAWAY, not a target. Vocal and instrumental tonal melody
// runs somewhere around 10-15% of intervals at a fourth or wider, so this is set
// where a real regression shows and no higher — tightening it until the current
// number looks impressive would be picking a threshold to pass, which this file
// exists to avoid. What actually matters about the leaps is the three checks
// below it: that each one is an event rather than an accident.
want('leaps do not run away with the line', leaps.n/motions<=0.16, pct(leaps.n,motions));
// A FLOOR SET FROM WHERE THIS STARTED, not from where it landed.
//
// 55.0% before any of this work and 59.9% after, so 58% catches a regression
// toward the state that prompted it while leaving room for ordinary variation —
// and it is stated here rather than tuned quietly, because a threshold picked
// until the current number clears it measures nothing. The more meaningful
// figure is printed beside it: steps and thirds together are around 81% of
// motion, which is the conjunct-or-nearly band tonal melody actually occupies.
// Chasing the stepwise number alone would mean suppressing the arpeggiation
// that makes the harmony audible in the tune.
want('the line is mostly stepwise', steps/(motions-repeats)>=0.58,
     pct(steps,motions-repeats)+' stepwise, '
     +pct(steps+skips,motions-repeats)+' stepwise or by a third');

// --- 4. THE EXPECTATION IS SUBVERTED, AND ONLY ONCE IT EXISTS -------------
want('the rule is broken on purpose sometimes', sub.n>0 && sub.takes/takes>=0.10,
     sub.n+' appoggiaturas in '+pct(sub.takes,takes)+' of takes');
want('...but rarely — one per piece is an event, three is a habit', sub.most<=2,
     'most in one take: '+sub.most);
want('never before the pattern has been stated', sub.tooEarly===0 && sub.inFirstSection===0,
     sub.tooEarly+' too early, '+sub.inFirstSection+' in the first section');
want('always on the beat that was most expected', sub.notHyperdownbeat===0,
     sub.notHyperdownbeat+' off the hyperdownbeat');
want('the expected note still arrives, one note late', sub.unresolved===0,
     sub.unresolved+' unresolved');

say('');
say(failures? ('FAILURES: '+failures)
            : 'the hierarchy is nested, the leaps are events, and the rule is broken on purpose');
print(out.join('\n'));
if(failures) throw new Error('metric-hierarchy-test: '+failures+' failure(s)');
