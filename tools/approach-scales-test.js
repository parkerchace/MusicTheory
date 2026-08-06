// APPROACH SCALES — is the mode actually a mode?
//
// The idea: base scale plain (major or aeolian), progression plain diatonic,
// and every note that leaves the key arriving in the APPROACH into the next
// chord — drawn from whatever scale in the 1300+ library sits a fifth above
// that chord (F♯7 or A♯m7♭5 walking into Bm7 in A major). The advanced toggle
// swaps that source for a scale rooted on the TARGET'S OWN root whose tonic
// chord is withheld until the arrival (Ddim7 → Cmaj7, with Cdim7 never
// sounded).
//
// A mode is only a mode if it is exclusive, so the measurements come in two
// halves and the second is the one that makes it teachable:
//
//   WHAT IT DOES.  Every inserted approach comes from a scale rooted where the
//     mode says, its chords are genuinely degrees of that scale (checked
//     against the dataset's own intervals, not against the engine that made
//     the claim), and — in advanced — none of them is the withheld tonic
//     chord. The melody follows the source scale, which is what makes the
//     borrowed collection audible as a colour rather than as a wrong chord.
//
//   WHAT IT REFUSES.  With the mode on there are no borrowed chords, no
//     excursions, no secondary dominants, no modulations, and the base scale
//     is major or aeolian — because an approach borrowed from F♯ Mixolydian ♭6
//     demonstrates nothing if the chord it lands on was itself borrowed and
//     the key just changed underneath it.
//
// And the control: with the mode OFF, neither new family may appear at all,
// and the ordinary catalog must still be doing its job. A check that cannot
// tell the mode's output from the default output is measuring nothing.
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
 'piano-texture-engine.js','arc-ui-init.js','sheet-music-generator.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.sheetMusicGenerator={state:{autoVoicingAll:true,voicingLogic:'smart',voicingRegister:'mid'}};
window.__voicingUserChoice=false;
// The engine itself, not an options object wrapping it — `new
// SheetMusicGenerator(musicTheory)` is what the app does, and passing
// `{musicTheory: mt}` leaves `this.musicTheory` a bare object with none of the
// methods on it, so anything the sheet asks the theory engine silently fails.
var sheetGen=new SheetMusicGenerator(mt);

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light'];
var BPB=4;

function build(key,scale,seed,tone){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:0.5,
    emotionalTone:tone||'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.7,harmony:0.7},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:8,beatsPerBar:BPB,beatUnit:4,totalBeats:8*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  var m=generateMelody(c,arc,h,seed);
  var p=buildPianoTexture(c,arc,h,m,seed);
  return {c:c,h:h,m:m,p:p,arc:arc};
}

function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function pcsOf(list){var s={};(list||[]).forEach(function(n){var p=pcOf(n);if(p!==null)s[p]=1;});return s;}
function tonesOf(c){return (c&&(c.chordNotes||c.diatonicNotes))||[];}
function setKey(c){var o={},k=[];tonesOf(c).forEach(function(n){var p=pcOf(n);if(p!==null&&!o[p]){o[p]=1;k.push(p);}});
  return k.sort(function(x,y){return x-y;}).join(',');}
// The dataset's own intervals — an independent check on any claim about which
// scale a chord came from.
var INTERVALS=(window.SCALES&&window.SCALES.intervals)||mt.scales||{};
function claimHolds(root,scaleId,notes){
  var iv=INTERVALS[scaleId];
  if(!iv||!notes||notes.length!==iv.length) return false;
  var rp=pcOf(root); if(rp===null) return false;
  var want={}; iv.forEach(function(x){want[((rp+x)%12+12)%12]=1;});
  return notes.every(function(n){var p=pcOf(n);return p!==null&&want[p];});
}

var KEYS=[['C','major'],['A','aeolian'],['G','major'],['D','major'],['E','aeolian'],['Bb','major']];

function run(mode){
  var st={takes:0, approaches:0, chords:0, families:{},
          badSource:0, noSource:0, notDegree:0, wrongRoot:0, soundedWithheld:0, noExplain:0,
          borrowed:0, excursions:0, modulations:0, secondaries:0,
          melIn:0, melTotal:0, melUnnamed:0, sources:{}, samples:[],
          written:0, played:0, crossedOut:0, drawn:0, phraseFailed:0, deliverySamples:[]};
  window.__arcApproachScales = mode
    ? {enabled:true, advanced:mode==='advanced'}
    : {enabled:false, advanced:false};

  KEYS.forEach(function(K,ki){
    for(var s=0;s<40;s++){
      var r;
      try{ r=build(K[0],K[1],s*37+ki*11+5,'hopeful'); }catch(e){ continue; }
      st.takes++;
      st.excursions += ((r.h.excursions||[]).length);
      st.modulations += ((r.h.modulations||[]).length);

      var homePcs=pcsOf(r.c.harmonicProfile.scaleNotes||[]);
      var seq=r.h.chordSequence||[];
      var lastCore=null;

      seq.forEach(function(ev){
        if(!ev||!ev.chordObj) return;
        if(!ev.approachStrategy){
          lastCore=ev;
          if(ev.chordObj.secondaryDominant) st.secondaries++;
          // A structural chord outside the home scale, with the mode on, is a
          // borrow the mode is supposed to have switched off. The cadential
          // dominant raise is the mode's own scale doing its job, not a borrow.
          if(mode && ev.inHomeKey!==false && !ev.chordObj.raisedLeadingTone && !ev.cadenceGesture){
            var foreign=tonesOf(ev.chordObj).filter(function(n){return !homePcs[pcOf(n)];});
            if(foreign.length) st.borrowed++;
          }
          return;
        }
        st.chords++;
        st.families[ev.approachFamily||'?']=(st.families[ev.approachFamily||'?']||0)+1;
        if(ev.beat===undefined) return;

        var isNew = !st._lastStrategy || st._lastStrategy!==ev.approachStrategy || st._lastBar!==ev.bar;
        st._lastStrategy=ev.approachStrategy; st._lastBar=ev.bar;
        if(isNew){
          st.approaches++;
          if(!ev.explain||!String(ev.explain).trim().length) st.noExplain++;
        }

        var hint=ev.scaleHint;
        // NOT the same thing as a false claim. The pivot and dominant families
        // deliberately ship an event with no scaleHint when they cannot verify
        // a parent scale for it — unattributed rather than wrongly attributed,
        // which is the right way round. Counted separately so a mode that is
        // supposed to always name its source can be held to that.
        if(!hint||!hint.scaleNotes||!hint.scaleNotes.length){ st.noSource++; return; }
        st.sources[hint.scaleName]=(st.sources[hint.scaleName]||0)+1;
        if(!claimHolds(hint.root,hint.scaleName,hint.scaleNotes)){
          st.badSource++;
          if(st.samples.length<6) st.samples.push(K.join(' ')+': '+hint.root+' '+hint.scaleName+' does not match the dataset');
          return;
        }
        // The chord really is a degree of the scale credited for it.
        var sp=pcsOf(hint.scaleNotes);
        if(!tonesOf(ev.chordObj).every(function(n){return sp[pcOf(n)];})){
          st.notDegree++;
          if(st.samples.length<6) st.samples.push(K.join(' ')+': '+ev.chord+' is not in '+hint.root+' '+hint.scaleName);
        }
        if(!mode) return;

        // ROOTED WHERE THE MODE SAYS.
        var tgtPc=null;
        for(var i=seq.indexOf(ev)+1;i<seq.length;i++){
          if(seq[i]&&!seq[i].approachStrategy&&seq[i].chordObj){ tgtPc=pcOf(seq[i].chordObj.root); break; }
        }
        if(tgtPc===null) return;
        var srcPc=pcOf(hint.root);
        var fifthAbove=((tgtPc-srcPc)%12+12)%12===5;   // src is a fifth ABOVE tgt = tgt is a fourth above src
        var onTarget=srcPc===tgtPc;
        if(ev.approachFamily==='fifthAbove'){
          if(!fifthAbove){
            st.wrongRoot++;
            if(st.samples.length<6) st.samples.push(K.join(' ')+': '+hint.root+' is not a fifth above the target');
          }
        } else if(ev.approachFamily==='parallelTarget'){
          if(!onTarget){
            st.wrongRoot++;
            if(st.samples.length<6) st.samples.push(K.join(' ')+': '+hint.root+' is not the target root');
          }
          // THE WITHHELD CHORD. Sounding the source scale's own tonic chord is
          // the one thing this variant is defined by not doing.
          var tonic=null;
          try{ tonic=mt.getDiatonicChord(1,hint.root,hint.scaleName); }catch(e){}
          if(tonic&&setKey(tonic)&&setKey(tonic)===setKey(ev.chordObj)){
            st.soundedWithheld++;
            if(st.samples.length<6) st.samples.push(K.join(' ')+': '+ev.chord+' IS the withheld tonic of '+hint.root+' '+hint.scaleName);
          }
        }

        // Did the melody go with it?
        var st0=ev.bar*BPB+(Number(ev.beat)||0), en=st0+(Number(ev.duration)||0.5);
        (r.m.notes||[]).forEach(function(n){
          var b=n.bar*BPB+n.beat;
          if(b<st0-1e-6||b>=en-1e-6) return;
          var p=pcOf(n.noteName); if(p===null) return;
          st.melTotal++;
          if(sp[p]) st.melIn++;
          else if(!(n.chromaticReason&&String(n.chromaticReason).trim().length)) st.melUnnamed++;
        });
      });
      if(lastCore){/* keep the reference honest */}

      // DOES ANY OF IT REACH A HAND?
      //
      // Everything above measures what the ENGINE decided. This asks the only
      // question that matters to a listener, and it is the question three
      // earlier devices in this project failed silently: is the chord actually
      // struck? The accompaniment is what turns harmony into notes, and it used
      // to open by filtering every approach chord out — so a run could be
      // built, priced, verified, explained in the panel, and never sounded.
      var wanted=seq.filter(function(e){return e&&e.approachStrategy&&e.chordObj;});
      st.written+=wanted.length;
      var lhAll=(r.p&&r.p.leftHand||[]).concat(r.p&&r.p.trebleHarmony||[]);
      var lhAp=lhAll.filter(function(e){return e&&e.approachStrategy;});
      // ONE DEVICE OVERRIDING ANOTHER IS NOT A LOST CHORD. The crossover clears
      // its bar's accompaniment outright — the hand has gone up above the tune
      // and cannot also be playing a passing chord underneath it. That is a
      // decision, and it is named here rather than quietly inflating or
      // deflating the delivery number.
      var crossedBars={};
      lhAll.forEach(function(e){ if(e&&e.pattern==='crossover') crossedBars[e.bar]=1; });
      wanted.forEach(function(e){
        var hit=lhAp.some(function(a){
          return a.bar===e.bar && Math.abs((Number(a.beat)||0)-(Number(e.beat)||0))<1e-6;
        });
        if(hit) st.played++;
        else if(crossedBars[e.bar]) st.crossedOut++;
        else if(st.deliverySamples.length<6)
          st.deliverySamples.push(K.join(' ')+' bar '+(e.bar+1)+' beat '+e.beat+': '+e.chord+' never played');
      });
      var phrase=null;
      try{ phrase=buildPhraseFromGeneratedMusic(
        {context:r.c,arc:r.arc,harmony:r.h,melody:r.m,piano:r.p},sheetGen); }catch(err){ phrase=null; }
      if(!phrase){ st.phraseFailed++; }
      else {
        (phrase.bars||[]).forEach(function(b){
          (b.leftHand||[]).concat(b.trebleHarmony||[]).forEach(function(e){
            if(e&&e.approachStrategy) st.drawn++;
          });
        });
      }
    }
  });
  window.__arcApproachScales={enabled:false,advanced:false};
  return st;
}

var off=run(null);
var on=run('default');
var adv=run('advanced');

// The base scale the mode insists on, asked directly — this is decided in the
// arcConfirmed handler, which a harness cannot reach, so the decision itself is
// a named function and the check is on that.
var baseOk = approachScalesBaseScale('joyful',null)==='major'
  && approachScalesBaseScale('dark',null)==='aeolian'
  && approachScalesBaseScale('sad',null)==='aeolian'
  && approachScalesBaseScale(null,{avgValence:-0.4})==='aeolian'
  && approachScalesBaseScale(null,{avgValence:0.4})==='major'
  && approachScalesBaseScale(null,null)==='major';

var out=[];
function say(t){out.push(t);}
function pct(a,b){return b?(Math.round(1000*a/b)/10)+'%':'n/a';}
function topSources(m,n){
  return Object.keys(m).sort(function(a,b){return m[b]-m[a];}).slice(0,n)
    .map(function(k){return k+'×'+m[k];}).join(', ');
}

say('');
say('APPROACH SCALES — a mode where all the outside colour lives in the approach');
say('');
[['MODE OFF (the control)',off],['MODE ON — a fifth above the target',on],['MODE ON — advanced, the target\'s own root',adv]]
  .forEach(function(pair){
    var label=pair[0], x=pair[1];
    say('  '+label);
    say('    takes '+x.takes+' · approach runs '+x.approaches+' · chords '+x.chords);
    say('    families      : '+JSON.stringify(x.families));
    say('    source scales : '+(topSources(x.sources,8)||'none'));
    say('    source claims that do not check out : '+x.badSource
        +' · chords not a degree of their source : '+x.notDegree
        +' · shipped unattributed : '+x.noSource);
    if(label!=='MODE OFF (the control)'){
      say('    rooted somewhere other than the mode says : '+x.wrongRoot);
      say('    the withheld tonic chord sounded          : '+x.soundedWithheld);
      say('    approach runs with no explanation         : '+x.noExplain);
      say('    STRUCTURAL chords outside the key         : '+x.borrowed
          +' · excursions '+x.excursions+' · modulations '+x.modulations+' · secondary dominants '+x.secondaries);
      say('    melody over the approach: '+x.melTotal+' notes · in the source scale '
          +pct(x.melIn,x.melTotal)+' · in neither it nor a named reason '+x.melUnnamed);
    }
    say('    DELIVERED: '+x.written+' approach chords written · '+x.played+' struck by a hand ('
        +pct(x.played,x.written)+') · '+x.drawn+' on the page · '
        +x.crossedOut+' in bars the crossover took over · '
        +(x.written-x.played-x.crossedOut)+' unaccounted for'
        +(x.phraseFailed?' · '+x.phraseFailed+' phrases failed to build':''));
    x.deliverySamples.forEach(function(y){say('      '+y);});
    if(false){
    }
    say('');
  });
if(off.samples.length||on.samples.length||adv.samples.length){
  say('  first failures:');
  off.samples.concat(on.samples, adv.samples).slice(0,10).forEach(function(x){say('    '+x);});
  say('');
}

var failures=0;
function want(name, ok, detail){
  if(ok) say('  OK   '+name+(detail?' — '+detail:''));
  else { failures++; say('  FAIL '+name+(detail?' — '+detail:'')); }
}

want('the mode picks a plain base scale from the words', baseOk, 'major/aeolian only');

want('the mode produces approaches at all', on.approaches>0 && adv.approaches>0,
     on.approaches+' default, '+adv.approaches+' advanced');
want('...drawn from more than a handful of the library\'s scales',
     Object.keys(on.sources).length>=5, Object.keys(on.sources).length+' distinct source scales');
want('every source claim checks out against the scale data',
     off.badSource===0 && on.badSource===0 && adv.badSource===0,
     off.badSource+'/'+on.badSource+'/'+adv.badSource+' (off/on/advanced)');
// The mode's entire subject is WHERE the material came from, so unlike the
// default families it is never allowed to ship an approach it cannot name.
want('the mode never ships an approach it cannot name',
     on.noSource===0 && adv.noSource===0,
     on.noSource+'/'+adv.noSource+' unattributed, against '+off.noSource+' with the mode off');
want('every approach chord is a degree of the scale credited for it',
     on.notDegree===0 && adv.notDegree===0, on.notDegree+'/'+adv.notDegree);
want('every approach names where it came from', on.noExplain===0 && adv.noExplain===0,
     on.noExplain+'/'+adv.noExplain);

want('the default draws from a fifth above the target', on.wrongRoot===0,
     on.wrongRoot+' wrongly rooted');
want('the advanced toggle draws from the target\'s own root', adv.wrongRoot===0,
     adv.wrongRoot+' wrongly rooted');
// The defining refusal of the advanced variant.
want('...and NEVER sounds that scale\'s tonic chord before the arrival',
     adv.soundedWithheld===0, adv.soundedWithheld+' sounded');
want('the advanced toggle actually changes which family fires',
     (adv.families.parallelTarget||0)>0 && (off.families.parallelTarget||0)===0,
     (adv.families.parallelTarget||0)+' parallelTarget runs with it on, '
     +(off.families.parallelTarget||0)+' with the mode off');

// EXCLUSIVITY. The mode is only teachable if it is the only thing happening.
want('with the mode on nothing else leaves the key',
     on.borrowed===0 && adv.borrowed===0 && on.excursions===0 && adv.excursions===0
     && on.modulations===0 && adv.modulations===0 && on.secondaries===0 && adv.secondaries===0,
     'borrows '+on.borrowed+'/'+adv.borrowed+', excursions '+on.excursions+'/'+adv.excursions
     +', modulations '+on.modulations+'/'+adv.modulations+', secondaries '+on.secondaries+'/'+adv.secondaries);

// THE CONTROL. Without it, every check above could be satisfied by the ordinary
// catalog and the mode would be a label on unchanged behaviour.
want('with the mode OFF neither new family appears',
     !(off.families.fifthAbove||off.families.parallelTarget),
     JSON.stringify(off.families));
want('...and the ordinary catalog is still doing its job', off.chords>0,
     off.chords+' approach chords from '+Object.keys(off.families).length+' families');

// The melody has to go where the harmony went, or the borrowed collection is
// decoration on the chord symbols only.
// THE ONE PARKER REPORTED. "It'll say all this stuff is happening like B7 C7
// Bmaj7 but it doesn't happen on the sheet music." Measured on the page, for
// the ordinary catalog as well as the mode — the accompaniment filtered every
// family's approach chords out, not just the new ones.
want('every approach chord is actually struck by a hand',
     off.written>0 && off.played+off.crossedOut===off.written
     && on.written>0 && on.played+on.crossedOut===on.written
     && adv.written>0 && adv.played+adv.crossedOut===adv.written,
     off.played+'/'+off.written+' off, '+on.played+'/'+on.written+' on, '
     +adv.played+'/'+adv.written+' advanced (the remainder are bars the crossover took over: '
     +off.crossedOut+'/'+on.crossedOut+'/'+adv.crossedOut+')');
want('...and reaches the page', off.drawn>0 && on.drawn>0 && adv.drawn>0
     && off.phraseFailed===0 && on.phraseFailed===0 && adv.phraseFailed===0,
     off.drawn+'/'+on.drawn+'/'+adv.drawn+' drawn');

want('the melody plays in the borrowed scale over the approach',
     on.melTotal>0 && on.melIn/on.melTotal>=0.95 && on.melUnnamed===0,
     pct(on.melIn,on.melTotal)+', '+on.melUnnamed+' unnamed');

say('');
say(failures? ('FAILURES: '+failures) : 'the approach carries all the colour, and it says where it got it');
print(out.join('\n'));
if(failures) throw new Error('approach-scales-test: '+failures+' failure(s)');
