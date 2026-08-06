// Is a borrowed colour actually a PLACE THE MUSIC WENT?
//
// The complaint this exists to catch, in Parker's own example: in A major,
// ii(Bm7) → "Dm7, borrowed for contrast" → V(E7). One bar, no source named
// beyond "contrast", nothing around it from wherever it came from, and a
// melody that went on playing A major straight over the top. That is an
// accident with a caption.
//
// So the measurements are the three things a borrow has to do, and the last
// one is the load-bearing one because it is the one nothing checked before:
//
//   1. NAME ITS SOURCE, verifiably. Every excursion claims a root and a scale
//      id. The claim is re-derived here from the scale dataset's own intervals
//      rather than trusted — the theory engine falls back to MAJOR for any id
//      it does not know and returns it without complaint, so "G Lydian
//      Dominant" can be G major wearing a label. Every chord in the excursion
//      must then really be a stacked-thirds degree of that collection.
//
//   2. LAST LONG ENOUGH, with something in it. Whole bars, at least two, and
//      at least two DIFFERENT chords — two bars of one chord is one chord held
//      longer, which is the original fault with more sustain.
//
//   3. BE FOLLOWED THROUGH BY THE MELODY, AND RETURNED FROM. Measured against
//      a control: the same melody, scored the same way, in the bars that are
//      NOT in an excursion. If the line inside a borrow is no more in the
//      borrowed scale than the line everywhere else, then nothing is following
//      anything and the excursion is decoration on the chord symbols only.
//
// And one negative: no chord may sit outside the home scale WITHOUT a named
// reason. An orphan borrow — outside the key, belonging to no excursion, no
// cadence gesture, no secondary dominant, no approach run, no modulation — is
// exactly the thing that was reported, and it must be zero.
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
 'functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js',
 'voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js',
 'piano-texture-engine.js','arc-ui-init.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.__voicingUserChoice=false;

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light','through','the','win','dow'];
var BPB=4;

function build(key,scale,seed,tone,colour){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:0.5,
    emotionalTone:tone||'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:colour,harmony:colour},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:12,beatsPerBar:BPB,beatUnit:4,totalBeats:12*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  return {c:c,h:h,m:m,arc:arc};
}

function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function pcsOf(list){var s={};(list||[]).forEach(function(n){var p=pcOf(n);if(p!==null)s[p]=1;});return s;}
function chordTones(c){return (c&&(c.chordNotes||c.diatonicNotes))||[];}
function sameSet(a,b){
  var f=function(c){var o={},k=[];chordTones(c).forEach(function(n){var p=pcOf(n);if(p!==null&&!o[p]){o[p]=1;k.push(p);}});
    return k.sort(function(x,y){return x-y;}).join(',');};
  var x=f(a); return x.length>0 && x===f(b);
}
// The scale dataset's own intervals — the independent source of truth for a
// provenance claim. Asking the engine that produced the claim to confirm it
// would be no check at all.
var INTERVALS=(window.SCALES&&window.SCALES.intervals)||mt.scales||{};
function claimHolds(root,scaleId,notes){
  var iv=INTERVALS[scaleId];
  if(!iv||iv.length!==7) return false;
  if(!notes||notes.length!==7) return false;
  var rp=pcOf(root); if(rp===null) return false;
  var want={}; iv.forEach(function(x){want[((rp+x)%12+12)%12]=1;});
  return notes.every(function(n){var p=pcOf(n);return p!==null&&want[p];});
}

var KEYS=[['C','major'],['A','natural_minor'],['D','dorian'],
          ['G','major'],['F','lydian'],['E','phrygian'],['Bb','major'],['F#','aeolian']];
var TONES=['hopeful','dark','calm','intense','mysterious','joyful'];

var takes=0, takesWithExcursion=0, excursions=0;
var byReading={};
var bad={source:0, chordNotInSource:0, tooShort:0, oneChord:0, noReturn:0, returnNotHome:0, overlap:0};
var mel={inside:{n:0,inSource:0,outHome:0,unnamed:0}, outside:{n:0,inSource:0,outHome:0,unnamed:0}};
var unnamedSamples=[];
var orphanBorrows=0, orphanSamples=[];
var samples=[];
var lens={};

function note(msg){ if(samples.length<8) samples.push(msg); }

for(var k=0;k<KEYS.length;k++){
  for(var s=0;s<45;s++){
    var tone=TONES[(s+k)%TONES.length];
    var r;
    try{ r=build(KEYS[k][0],KEYS[k][1],s*53+k*7+3,tone,0.6); }catch(e){ continue; }
    takes++;

    var homeNotes=r.c.harmonicProfile.scaleNotes||[];
    var homePcs=pcsOf(homeNotes);
    var ex=r.h.excursions||[];
    if(ex.length) takesWithExcursion++;
    excursions+=ex.length;

    var excBars={};
    ex.forEach(function(e){
      byReading[e.reading]=(byReading[e.reading]||0)+1;
      lens[e.bars]=(lens[e.bars]||0)+1;

      // 1 — the source is real, and the chords really come from it.
      if(!claimHolds(e.sourceRoot,e.sourceScale,e.sourceNotes)){
        bad.source++; note(KEYS[k].join(' ')+' seed'+s+': source claim fails — '+e.label);
      }
      var srcPcs=pcsOf(e.sourceNotes);
      e.chords.forEach(function(c){
        var tones=chordTones(c);
        if(!tones.length||!tones.every(function(n){return srcPcs[pcOf(n)];})){
          bad.chordNotInSource++;
          note(KEYS[k].join(' ')+' seed'+s+': '+(c.fullName||'?')+' is not a degree of '+e.label);
        }
      });

      // 2 — long enough, and more than one thing.
      if(!(e.bars>=2)||!(e.endBar-e.startBar+1===e.bars)){
        bad.tooShort++; note(KEYS[k].join(' ')+' seed'+s+': span '+e.bars+' bars');
      }
      var distinct=true;
      for(var i=1;i<e.chords.length;i++){ if(sameSet(e.chords[i],e.chords[i-1])) distinct=false; }
      if(!distinct||e.chords.length<2){
        bad.oneChord++; note(KEYS[k].join(' ')+' seed'+s+': '+e.label+' repeats its chord');
      }

      // 3a — it comes back, into the home key.
      var rb=e.returnBar;
      if(!(rb>e.endBar)||rb>=r.arc.bars){ bad.noReturn++; note(KEYS[k].join(' ')+' seed'+s+': no return bar'); }
      else {
        var kp=(r.h.keyPlan||[])[rb];
        if(kp&&kp.home===false){ bad.returnNotHome++; note(KEYS[k].join(' ')+' seed'+s+': returns into a modulated bar'); }
      }
      for(var b=e.startBar;b<=e.endBar;b++){
        if(excBars[b]) bad.overlap++;
        excBars[b]=e;
      }
    });

    // 3b — DID THE MELODY GO THERE TOO? Scored inside the excursion and, as
    // the control, everywhere else in the same piece.
    if(ex.length){
      (r.m.notes||[]).forEach(function(n){
        var p=pcOf(n.noteName); if(p===null) return;
        var e=excBars[n.bar];
        var t=e?mel.inside:mel.outside;
        t.n++;
        if(!homePcs[p]) t.outHome++;
        // Against THE excursion covering this bar; for the control bars, against
        // the piece's first excursion, so the comparison is like for like.
        var ref=e||ex[0];
        var sp=pcsOf(ref.sourceNotes);
        if(sp[p]) t.inSource++;
        // A note inside the excursion that is NOT in the borrowed scale is
        // only allowed if it is licensed the way every other accidental in
        // this generator is — by the chord it sounds over. Anything else is
        // the line ignoring where the harmony went.
        else if(e){
          if(!(n.chromaticReason&&String(n.chromaticReason).trim().length)){
            t.unnamed++;
            if(unnamedSamples.length<6)
              unnamedSamples.push(KEYS[k].join(' ')+' seed'+s+' bar '+(n.bar+1)+': '+n.noteName
                +' is in neither '+ref.label+' nor any reason');
          }
        }
      });
    }

    // The negative. Every chord outside the home scale must have a name.
    (r.h.chordSequence||[]).forEach(function(evt){
      if(!evt||!evt.chordObj) return;
      if(evt.approachStrategy) return;                 // approach runs name themselves
      if(evt.inHomeKey===false) return;                // a modulated bar is in another key
      if(evt.cadenceGesture) return;                   // the ♭VI–♭VII–I gesture
      if(evt.excursion) return;                        // this device
      if(evt.chordObj.secondaryDominant) return;
      if(evt.chordObj.raisedLeadingTone) return;       // the cadential dominant
      var tones=chordTones(evt.chordObj);
      var foreign=tones.filter(function(n){return !homePcs[pcOf(n)];});
      if(foreign.length){
        orphanBorrows++;
        if(orphanSamples.length<6){
          orphanSamples.push(KEYS[k].join(' ')+' seed'+s+' bar '+(evt.bar+1)+': '+evt.chord
            +' ('+evt.roman+') foreign '+foreign.join(',')+(evt.explain?' — "'+String(evt.explain).slice(0,60)+'…"':' — UNEXPLAINED'));
        }
      }
    });
  }
}

// A dial that is OFF must produce none of this — a device that fires anyway is
// not a device, it is a bug with a good story.
var offTakes=0, offExcursions=0;
for(var k2=0;k2<KEYS.length;k2++){
  for(var s2=0;s2<12;s2++){
    var r2;
    try{ r2=build(KEYS[k2][0],KEYS[k2][1],s2*31+k2*5+11,'hopeful',0.30); }catch(e){ continue; }
    offTakes++;
    offExcursions+=((r2.h.excursions||[]).length);
  }
}

var out=[];
function say(t){out.push(t);}
function pct(a,b){return b?(Math.round(1000*a/b)/10)+'%':'n/a';}

say('');
say('MODAL EXCURSIONS — a borrow that names where it went, stays long enough to be heard, and comes back');
say('');
say('  takes                        : '+takes);
say('  takes with an excursion      : '+takesWithExcursion+' ('+pct(takesWithExcursion,takes)+')');
say('  excursions                   : '+excursions);
say('  readings chosen              : '+JSON.stringify(byReading));
say('  lengths (bars)               : '+JSON.stringify(lens));
say('');
say('  NAMING THE SOURCE');
say('    source claims that do not check out : '+bad.source);
say('    chords not a degree of their source : '+bad.chordNotInSource);
say('');
say('  ROOM TO BE HEARD');
say('    spans shorter than two whole bars   : '+bad.tooShort);
say('    spans that are really one chord     : '+bad.oneChord);
say('    overlapping excursions              : '+bad.overlap);
say('');
say('  COMING BACK');
say('    no return bar                       : '+bad.noReturn);
say('    returning into a modulated bar      : '+bad.returnNotHome);
say('');
say('  THE MELODY FOLLOWED IT — and the control beside it');
say('    inside  : '+mel.inside.n+' notes · in the source scale '+pct(mel.inside.inSource,mel.inside.n)
    +' · outside the HOME scale '+pct(mel.inside.outHome,mel.inside.n));
say('    control : '+mel.outside.n+' notes · in the source scale '+pct(mel.outside.inSource,mel.outside.n)
    +' · outside the HOME scale '+pct(mel.outside.outHome,mel.outside.n));
say('    notes inside that are in neither the source scale nor a named relationship : '+mel.inside.unnamed);
unnamedSamples.forEach(function(x){say('      '+x);});
say('');
say('  ORPHAN BORROWS — outside the key with nothing claiming them : '+orphanBorrows);
orphanSamples.forEach(function(x){say('    '+x);});
say('');
say('  DIAL BELOW THE BORROWING THRESHOLD');
say('    takes '+offTakes+' · excursions '+offExcursions);
if(samples.length){ say(''); say('  first failures:'); samples.forEach(function(x){say('    '+x);}); }
say('');

var failures=0;
function want(name, ok, detail){
  if(ok) say('  OK   '+name+(detail?' — '+detail:''));
  else { failures++; say('  FAIL '+name+(detail?' — '+detail:'')); }
}

want('excursions actually happen', excursions>0 && takesWithExcursion/takes>=0.4,
     pct(takesWithExcursion,takes)+' of takes');
want('both readings get used', Object.keys(byReading).length>=2, JSON.stringify(byReading));
want('every source claim checks out against the scale data', bad.source===0, bad.source+' bad');
want('every chord is a degree of the scale credited for it', bad.chordNotInSource===0, bad.chordNotInSource+' bad');
want('every excursion is at least two whole bars', bad.tooShort===0, bad.tooShort+' short');
want('no excursion is one chord wearing two bars', bad.oneChord===0, bad.oneChord+' repeats');
want('excursions never overlap', bad.overlap===0, bad.overlap+' overlaps');
want('every excursion has a bar it returns on', bad.noReturn===0, bad.noReturn+' missing');
want('every return lands back in the home key', bad.returnNotHome===0, bad.returnNotHome+' bad');

// THE ONE THAT MATTERS. Inside a borrow the tune is written in the borrowed
// scale, and it leaves the home scale to do it; everywhere else it does not.
// Either half alone proves nothing: "all notes are in the source scale" is
// trivially true whenever the two scales overlap heavily.
// Not "100% in the source scale": the line is allowed the same two doors out
// of any scale it has everywhere else — a tone of the chord it is sounding
// over, or that chord's leading tone — and refusing them inside an excursion
// would make the borrow the one place in the piece where the harmony stops
// licensing the melody. What may not happen is a note that is in neither.
want('the melody plays IN the borrowed scale inside an excursion',
     mel.inside.n>0 && mel.inside.inSource/mel.inside.n>=0.98 && mel.inside.unnamed===0,
     pct(mel.inside.inSource,mel.inside.n)+', '+mel.inside.unnamed+' unnamed');
want('...and it genuinely leaves the home scale to do it',
     mel.inside.n>0 && mel.inside.outHome/mel.inside.n>=0.10,
     pct(mel.inside.outHome,mel.inside.n)+' of notes inside');
want('...and the rest of the piece does not, which is what makes it a departure',
     mel.outside.n>0 && (mel.inside.outHome/mel.inside.n) > (mel.outside.outHome/mel.outside.n)*3,
     pct(mel.inside.outHome,mel.inside.n)+' inside vs '+pct(mel.outside.outHome,mel.outside.n)+' outside');

want('no chord leaves the key without something claiming it', orphanBorrows===0,
     orphanBorrows+' orphans');
want('below the borrowing threshold nothing borrows', offExcursions===0,
     offExcursions+' in '+offTakes+' takes');

say('');
say(failures? ('FAILURES: '+failures) : 'a borrowed colour names its source, lasts, is followed, and comes home');
print(out.join('\n'));
if(failures) throw new Error('modal-excursion-test: '+failures+' failure(s)');
