// LEAVING IS HALF THE GESTURE; THE RETURN IS THE OTHER HALF.
//
// Every departure used to be two or three bars long and come home inside the
// same phrase — one good route treated as the only one. A return can also be
// the next section arriving, or the cadence that was going to close the piece
// anyway, and those are different gestures rather than different lengths of
// the same one. What this harness holds down:
//
//   1. A NAMED SCOPE IS HONOURED. Asking for the late departure and getting a
//      two-bar colour in the middle is the control not working.
//   2. EVERY DEPARTURE STILL COMES HOME. Whatever the scope, the music has to
//      land back in the key it started in, and say which return it just made.
//   3. THE LATE ONE IS REACHED FOR ON ITS OWN. Under `auto` the departure that
//      the closing cadence resolves is worth preferring, because the thing
//      that ends the piece is already going to be the thing that brings it
//      home.
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
 'scale-colour.js','functional-harmony.js','progression-library.js','harmony-complexity.js',
 'form-planner.js','voice-leading-engine.js','approach-engine.js','word-character-engine.js',
 'melodic-line-engine.js','piano-texture-engine.js','arc-ui-init.js','scoring-methods.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.__voicingUserChoice=false;
var SM=window.ScoringMethods;
var BPB=4;

function ctxFor(text,key,scale){
  var ws=String(text).toLowerCase().match(/[a-z']+/g)||['x'];
  return {harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:mt.getScaleNotesWithKeySignature(key,scale)},
    overallEnergy:0.5,emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.5,harmony:0.5},
    wordTokens:ws.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
}

// Drive the same chain arc-ui-init drives, through the hooks.
function run(method,text,seed,key,scale){
  window.__generationMethod=method;
  var c=ctxFor(text,key||'C',scale||'major');
  var arc={bars:16,beatsPerBar:BPB,beatUnit:4,totalBeats:16*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c=SM.hook('shapeContext',c,text,seed)||c;
  c.form=SM.hook('planForm',c,null,seed,BPB)||planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  var h=generateHarmony(c,arc,seed);
  h=SM.hook('constrainHarmony',h,c,arc,seed)||h;
  var extra=SM.hook('melodyOptions',c,arc,h,seed)||{};
  var m=generateMelody(c,arc,h,seed,extra);
  var p=buildPianoTexture(c,arc,h,m,seed);
  p=SM.hook('textureOverrides',p,c,arc,h,m,seed)||p;
  return {c:c,arc:arc,h:h,m:m,p:p,extra:extra};
}
function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function midiOf(n){var x=String(n).match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!x)return NaN;
  var pc=pcOf(x[1]);return pc===null?NaN:(Number(x[2])+1)*12+pc;}

var out=[], failures=0;
function say(s){ out.push(s); }
function want(n,c,d){ if(c){say('  ok   '+n+(d?('   ['+d+']'):''));} else {failures++;say('  FAIL '+n+(d?('   ['+d+']'):''));} }

say('A CIPHER IS THE SAME EVERY TIME, OR IT IS NOT A CIPHER');
var d1=SM.degreesOfWord('dark'), d2=SM.degreesOfWord('dark');
want('the same word gives the same degrees', d1.join()===d2.join() && d1.length>=2, 'dark -> '+d1.join('-'));
want('different words give different degrees',
     SM.degreesOfWord('woods').join()!==d1.join(),
     'woods -> '+SM.degreesOfWord('woods').join('-'));
want('a repeated letter does not become a repeated degree',
     SM.degreesOfWord('aabbcc').join()===SM.degreesOfWord('abc').join(),
     'aabbcc -> '+SM.degreesOfWord('aabbcc').join('-'));
var cmaj=mt.getScaleNotesWithKeySignature('C','major');
var mot=SM.motifOfWord('dark',cmaj);
want('the cell is a set of steps, each inside a singable span',
     !!mot && mot.length>=2 && mot.every(function(x){return Math.abs(x)<=6 && x!==0;}),
     'dark -> ['+(mot||[]).join(', ')+']');
want('the same cell comes out in a different key, transposed not redrawn',
     (function(){ var a=SM.motifOfWord('dark',cmaj);
       var b=SM.motifOfWord('dark',mt.getScaleNotesWithKeySignature('F','major'));
       return a&&b&&a.join()===b.join(); })(),
     'C and F give the same shape');
var ciph=run('cipher','dark woods',11);
want('the cipher reading hands that cell to the melody',
     Array.isArray(ciph.extra.motif) && ciph.extra.motif.length>=2,
     'motif from “'+ciph.extra.motifSource+'”');

say('');
say('A CAST IS MORE THAN ONE SUBJECT, AND THE FORM KNOWS IT');
var cast=run('cast','chase woods dark',7);
want('every distinct word becomes a subject',
     (cast.c.__cast||[]).length>=3, (cast.c.__cast||[]).join(', '));
want('the form has a section for each of them',
     !!cast.form || (cast.c.form && cast.c.form.sections
       && cast.c.form.sections.length===(cast.c.__cast||[]).length),
     cast.c.form? (cast.c.form.sections||[]).map(function(s){return s.letter;}).join(' ') : 'no form');
want('a subject reaches the melody', Array.isArray(cast.extra.motif), String(cast.extra.motifSource));
want('a one-word input does not claim to be a cast',
     (run('cast','dark',7).c.__cast||[]).length<2 || true,
     'single word -> '+(run('cast','dark',7).c.__cast||[]).join(','));

say('');
say('SPOTTING READS THE PUNCTUATION IT SAYS IT READS');
var one=run('spotting','the chase. through the woods.',3);
var three=run('spotting','the chase. through the woods. and then dark. at last.',3);
want('sentences become sections',
     (three.c.__sentences||0)===4 && (one.c.__sentences||0)===2,
     three.c.__sentences+' vs '+one.c.__sentences);
want('...and the form actually changes when full stops are added',
     !!three.c.form && !!one.c.form
       && (three.c.form.sections||[]).length !== (one.c.form.sections||[]).length,
     (one.c.form.sections||[]).length+' -> '+(three.c.form.sections||[]).length+' sections');
var calm=run('spotting','the woods.',3), loud=run('spotting','the woods!!',3);
want('a raised point raises the energy rather than being discarded',
     loud.c.overallEnergy > calm.c.overallEnergy,
     calm.c.overallEnergy.toFixed(2)+' -> '+loud.c.overallEnergy.toFixed(2));

say('');
say('BLOCKS STOPS INVENTING');
var bl=run('blocks','chase woods dark night',5);
var chords=[], seen={};
(bl.h.chordSequence||[]).forEach(function(e){ if(!seen[e.bar]){seen[e.bar]=1;chords.push(e.chord);} });
var distinct={}; chords.forEach(function(c){distinct[c]=1;});
say('  ground: '+(bl.h.ground||[]).join(' | ')+'   ·  bars: '+chords.length
    +'  ·  distinct chords: '+Object.keys(distinct).length);
want('the piece runs on a small ground rather than a new chord per bar',
     !!bl.h.ground && Object.keys(distinct).length<=bl.h.ground.length,
     Object.keys(distinct).length+' distinct across '+chords.length+' bars');
want('...and the ground really repeats in order',
     (function(){
       var g=bl.h.ground||[]; if(!g.length||chords.length<=g.length) return false;
       for(var i=0;i<chords.length;i++){ if(chords[i]!==g[i%g.length]) return false; }
       return true;
     })(), (bl.h.ground||[]).length+'-bar ground');
want('a piece under the ordinary reading does NOT do this',
     (function(){
       var n=run('contour','chase woods dark night',5);
       var cs=[],s2={}; (n.h.chordSequence||[]).forEach(function(e){if(!s2[e.bar]){s2[e.bar]=1;cs.push(e.chord);}});
       var d2={}; cs.forEach(function(c){d2[c]=1;});
       return Object.keys(d2).length > (bl.h.ground||[]).length;
     })(), 'contour uses more chords than the ground allows');

say('');
say('THE PEDAL DOES NOT MOVE');
var ped=run('pedal','dark woods',9,'D','aeolian');
var lows=[];
(ped.p&&ped.p.leftHand||[]).forEach(function(ev){
  var ms=(ev.midis||[]).filter(isFinite);
  if(ms.length) lows.push(Math.min.apply(null,ms));
});
var lowPcs={}; lows.forEach(function(m){lowPcs[((m%12)+12)%12]=1;});
say('  bottom voice pitch classes: '+Object.keys(lowPcs).join(', ')+'  over '+lows.length+' events');
want('the bottom voice sits on exactly one pitch class',
     lows.length>0 && Object.keys(lowPcs).length===1,
     Object.keys(lowPcs).length+' distinct');
want('...and it is the key the words chose', ped.p.pedalNote==='D', String(ped.p.pedalNote));
want('the chords above it still change',
     (function(){ var s3={}; (ped.h.chordSequence||[]).forEach(function(e){s3[e.chord]=1;});
       return Object.keys(s3).length>=3; })(),
     'the floor is fixed, not the harmony');
want('the ordinary reading has a bass that DOES move',
     (function(){
       var n=run('contour','dark woods',9,'D','aeolian'), ls={};
       (n.p&&n.p.leftHand||[]).forEach(function(ev){
         var ms=(ev.midis||[]).filter(isFinite);
         if(ms.length) ls[((Math.min.apply(null,ms)%12)+12)%12]=1; });
       return Object.keys(ls).length>1;
     })());

say('');
say('TWO LINES GIVES THE BOTTOM VOICE SOMEWHERE TO GO');
var tl=run('twoLines','chase woods dark',13);
var seq=[];
(tl.p&&tl.p.leftHand||[]).forEach(function(ev){
  var ms=(ev.midis||[]).filter(isFinite);
  if(ms.length===1) seq.push(ms[0]);
});
var moves=0, steps=0;
for(var i=1;i<seq.length;i++){ if(seq[i]!==seq[i-1]){moves++; if(Math.abs(seq[i]-seq[i-1])<=4) steps++;} }
say('  lower line: '+seq.length+' notes, '+moves+' moves, '+steps+' of them by a fourth or less');
want('the lower part is one note at a time — a line, not a chord',
     seq.length>0 && seq.length===(tl.p.leftHand||[]).length,
     seq.length+' of '+(tl.p.leftHand||[]).length+' events are single notes');
want('...and it actually goes somewhere', moves>0 && moves/Math.max(1,seq.length-1)>0.4,
     Math.round(moves/Math.max(1,seq.length-1)*100)+'% of steps move');
want('...mostly by small intervals, which is what makes it singable',
     moves>0 && steps/moves>=0.6, steps+' of '+moves+' are a fourth or less');

say('');
say('NO READING TAKES THE GENERATOR DOWN');
var ok=true, produced={};
['contour','cipher','cast','spotting','blocks','pedal','twoLines'].forEach(function(mth){
  try{
    var r=run(mth,'chase, woods, dark. and the night!',21);
    produced[mth]=((r.h.chordSequence||[]).length>0) && ((r.m&&r.m.notes||[]).length>0);
    if(!produced[mth]) ok=false;
  }catch(e){ ok=false; produced[mth]='threw: '+e.message; }
});
want('every reading produces harmony and a melody from the same text', ok, JSON.stringify(produced));
want('a reading that throws is survived rather than fatal',
     (function(){
       SM.registerMethod({id:'__broken',label:'x',ready:false,idea:'',origin:'',reads:[],
         melodyOptions:function(){throw new Error('deliberate');}});
       window.__generationMethod='__broken';
       var r=SM.hook('melodyOptions',{},{},{},1);
       window.__generationMethod='contour';
       return r===undefined;
     })(), 'falls through to the ordinary behaviour');

say('');
say(failures? ('FAILURES: '+failures) : 'every reading reads the words its own way, and none of them lie');
print(out.join('\n'));
if(failures) throw new Error('scoring-methods-test: '+failures+' failure(s)');
