// Is the second voice actually a second voice?
//
// The descant already puts a note above the tune, and it is not counterpoint:
// it has one note per melody note, so the two move together and the ear hears
// one thickened line. What makes two parts two parts is COMPLEMENTARY RHYTHM —
// one moves while the other holds.
//
// So the load-bearing measurement is not "does a note appear above the tune"
// (the descant passes that) but "does this voice move where the tune does NOT".
// Measured three ways, and the third is the one that separates this device from
// the one it is not:
//
//   1. every note is a chord tone of the chord over it, a third clear of the
//      held melody note, and never doubling its pitch class — the same
//      discipline the descant and the covering voice are held to, because above
//      the tune is the loudest place in the texture to be wrong;
//   2. no counterline note starts where a melody note starts, ever;
//   3. counterline notes land inside HELD melody notes, and the descant scored
//      on the same three measures for comparison — a control, because a number
//      with nothing to be compared against is not evidence.
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
var sheetGen=new SheetMusicGenerator({musicTheory:mt});

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light','through','the','win','dow'];
var BPB=4;

function build(key,scale,seed,energy){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:energy,
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
  return {c:c,h:h,m:m,p:p,arc:arc};
}
function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function midiOf(n){var s=String(n||'').match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!s)return null;
  var pc=pcOf(s[1]); return pc===null?null:pc+(parseInt(s[2],10)+1)*12;}
// Latest-starting event wins, exactly as the engine's own harmonyAt does.
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

var takes=0, sectionsElecting=0, takesWith=0;
var cl={n:0, foreign:0, notClear:0, doubling:0, onMelodyAttack:0, insideHold:0};
var dn={n:0, onMelodyAttack:0, insideHold:0};
var samples=[];
var delivery={expected:0, delivered:0, phraseFailed:0};
var deliverySamples=[];

for(var k=0;k<KEYS.length;k++){
  for(var s=0;s<70;s++){
    var r;
    try{ r=build(KEYS[k][0],KEYS[k][1],s*53+k*7+3, s%3===0?0.7:0.45); }catch(e){ continue; }
    if(!r.p||!r.p.rightHand) continue;
    takes++;

    var exc=r.p.exceptions||[];
    var electing=exc.filter(function(x){return x.type==='counterline';}).length;
    sectionsElecting+=electing;

    var mel=(r.m.notes||[]).map(function(n){
      return {start:n.bar*BPB+n.beat, end:n.bar*BPB+n.beat+(Number(n.duration)||1),
              midi:midiOf(n.noteName)};
    }).filter(function(e){return isFinite(e.midi);});
    var attacks={};
    mel.forEach(function(e){ attacks[e.start.toFixed(4)]=true; });
    // The melody note sounding at a beat, and whether it is being HELD there —
    // held meaning the note is at least a beat and a half long and started
    // before this moment.
    var holdAt=function(beat){
      var found=null;
      mel.forEach(function(e){
        if(beat>=e.start-1e-6 && beat<e.end-1e-6) found=e;
      });
      if(!found) return null;
      return ((found.end-found.start)>=1.5-1e-6 && beat>found.start+1e-6) ? found : null;
    };
    var melAt=function(beat){
      var v=null,best=null;
      mel.forEach(function(e){
        if(beat>=e.start-1e-6&&beat<e.end-1e-6) v=e.midi;
        else if(e.start<=beat+1e-6&&(best===null||e.start>best.start)) best=e;
      });
      return v!==null?v:(best?best.midi:null);
    };

    var mine=0;
    (r.p.rightHand||[]).forEach(function(e){
      var beat=e.bar*BPB+(Number(e.beat)||0);
      var m=e.midi, pc=((m%12)+12)%12;
      if(e.voice==='counterline'){
        cl.n++; mine++;
        var pcs=chordPcs(chordAt(r.h,beat));
        var here=melAt(beat);
        if(pcs.indexOf(pc)<0){ cl.foreign++;
          if(samples.length<6) samples.push('counterline '+e.noteName+' foreign to the chord, bar '+e.bar); }
        if(here===null||m-here<3){ cl.notClear++;
          if(samples.length<6) samples.push('counterline '+e.noteName+' not clear of the tune, bar '+e.bar); }
        if(here!==null&&pc===((here%12)+12)%12) cl.doubling++;
        if(attacks[beat.toFixed(4)]){ cl.onMelodyAttack++;
          if(samples.length<6) samples.push('counterline attacks with the melody at bar '+e.bar); }
        if(holdAt(beat)) cl.insideHold++;
      } else if(e.voice==='descant'){
        dn.n++;
        if(attacks[beat.toFixed(4)]) dn.onMelodyAttack++;
        if(holdAt(beat)) dn.insideHold++;
      }
    });
    if(mine>0) takesWith++;

    // --- DOES IT REACH THE PAGE? --------------------------------------------
    //
    // The check that would have caught this device's predecessor. The descant
    // has existed for a long time, is verified note by note by
    // covered-melody-test, and explains itself to the user — and
    // `piano.rightHand` was read by nothing in the app, so it had never been
    // drawn, played or exported. Every number about it was true of a list
    // nobody looked at.
    //
    // So this asks the question of the PHRASE the sheet is built from, not of
    // the engine's output: is the note in `bars[].beats[].melodySequence`,
    // which is what the renderer walks and what playback and MIDI export read
    // back off the page.
    if(mine>0){
      var phrase=null;
      try{
        phrase=buildPhraseFromGeneratedMusic(
          {harmony:r.h, melody:r.m, piano:r.p, context:r.c, arc:r.arc}, sheetGen);
      }catch(e){ phrase=null; }
      if(!phrase||!phrase.bars){ delivery.phraseFailed++; }
      else {
        var onPage={};
        phrase.bars.forEach(function(b){
          (b.beats||[]).forEach(function(be){
            (be.melodySequence||[]).forEach(function(mn){
              if(mn && mn.voice==='counterline') onPage[mn.noteName+'@'+Number(mn.absBeat).toFixed(4)]=true;
            });
          });
        });
        (r.p.rightHand||[]).forEach(function(e){
          if(e.voice!=='counterline') return;
          delivery.expected++;
          var abs=e.bar*BPB+(Number(e.beat)||0);
          if(onPage[e.noteName+'@'+abs.toFixed(4)]) delivery.delivered++;
          else if(deliverySamples.length<5)
            deliverySamples.push(e.noteName+' at beat '+abs+' never reached the page');
        });
      }
    }
  }
}

function pct(a,b){ return b? (a/b*100).toFixed(1)+'%' : 'n/a'; }
var out=[];function say(x){out.push(x);}

say('');
say('COUNTERLINE — '+takes+' takes across '+KEYS.length+' modes');
say('');
say('  sections electing one      : '+sectionsElecting+', in '+takesWith+' takes ('+pct(takesWith,takes)+')');
say('  notes written              : '+cl.n);
say('');
say('  INSIDE THE HARMONY');
say('    foreign to the chord     : '+cl.foreign);
say('    not a third clear of the tune : '+cl.notClear);
say('    doubling the tune\'s pitch class : '+cl.doubling);
say('');
say('  RHYTHMICALLY INDEPENDENT — the claim this device exists to make');
say('    starting on a melody attack : '+cl.onMelodyAttack+' ('+pct(cl.onMelodyAttack,cl.n)+')');
say('    landing inside a HELD melody note : '+cl.insideHold+' ('+pct(cl.insideHold,cl.n)+')');
say('');
say('  THE DESCANT, on the same two measures — the control');
say('    notes                       : '+dn.n);
say('    starting on a melody attack : '+dn.onMelodyAttack+' ('+pct(dn.onMelodyAttack,dn.n)+')');
say('    landing inside a HELD melody note : '+dn.insideHold+' ('+pct(dn.insideHold,dn.n)+')');
if(samples.length){ say(''); say('  first failures:'); samples.forEach(function(x){say('    '+x);}); }
say('');
say('  DELIVERED TO THE PAGE');
say('    notes the engine wrote : '+delivery.expected);
say('    notes on the sheet     : '+delivery.delivered
    +' ('+pct(delivery.delivered,delivery.expected)+')');
if(delivery.phraseFailed) say('    phrases that failed to build: '+delivery.phraseFailed);
deliverySamples.forEach(function(x){ say('    '+x); });
say('');

var failures=0;
function want(name, ok, detail){
  if(ok) say('  OK   '+name+(detail?' — '+detail:''));
  else { failures++; say('  FAIL '+name+(detail?' — '+detail:'')); }
}

// A device that never fires is not a device, however correct it is where it
// would have fired. This is the lesson the crossover taught twice.
want('the counterline actually happens', cl.n>0 && takesWith/takes>=0.08,
     cl.n+' notes in '+pct(takesWith,takes)+' of takes');
want('every note belongs to the chord over it', cl.foreign===0, cl.foreign+' foreign');
want('every note clears the tune by a third', cl.notClear===0, cl.notClear+' too close');
want('no note doubles the tune', cl.doubling===0, cl.doubling+' doubling');
// THE ONE THAT MATTERS. Zero, not "rare": a note that attacks with the melody
// is the descant, and this device is defined by being the other thing.
want('it NEVER attacks with the melody', cl.onMelodyAttack===0,
     cl.onMelodyAttack+' of '+cl.n);
want('it sounds inside held melody notes', cl.n>0 && cl.insideHold/cl.n>=0.95,
     pct(cl.insideHold,cl.n));
// The control, stated as a gap rather than as a bare number: the descant is a
// real second voice by pitch and not by rhythm, and if this test cannot tell
// the two apart it is measuring the wrong thing.
want('...and the descant, measured the same way, does the opposite',
     dn.n===0 || (dn.onMelodyAttack/dn.n) > 0.9,
     dn.n? pct(dn.onMelodyAttack,dn.n)+' of descant notes attack with the tune' : 'no descant in sample');

want('the phrase still builds with a counterline in it', delivery.phraseFailed===0,
     delivery.phraseFailed+' failed');
want('every note reaches the page', delivery.expected>0 && delivery.delivered===delivery.expected,
     delivery.delivered+'/'+delivery.expected);

say('');
say(failures? ('FAILURES: '+failures) : 'the second voice moves where the tune does not — and it is on the page');
print(out.join('\n'));
if(failures) throw new Error('counterline-test: '+failures+' failure(s)');
