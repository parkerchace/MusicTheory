// One degree, one chord, one name — wherever it is written.
//
// The numbers box prints a Roman-numeral name for each degree of the current
// scale; the mini chord strip prints the chord that degree actually is; the
// sheet plays it. All three are supposed to be the same chord. They were not:
// the box built its label by finding a short quality name INSIDE the real one,
// so the "Cmaj7(b5)" the strip showed came out "Imaj7" — a chord with a
// perfect fifth, which this scale does not have — and "Gbmaj7sus4" came out
// "Vmaj7", a chord with a third, which that one does not have either. Every
// "m(#5)", "sus4(#5)", "sus2(add11, #5)" collapsed to a bare "aug".
//
// Then, typing back the very text the box was showing gave the sheet a
// DIFFERENT chord again, because the token was read back apart by a parser
// that has no word for a suspension or an added sixth: "IIIsus2(add6)" came
// back a plain E major triad.
//
// This checks both directions, across the whole scale library.
var window=this;this.window=this;
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
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'number-generator.js'].forEach(load);
// modular-app.js exports nothing of its own — the app object is only built on
// DOMContentLoaded — so hand the class out from inside the same eval.
__e(readFile('modular-app.js') + ';window.ModularMusicTheoryApp=ModularMusicTheoryApp;');

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }

print('=== degree labels ===');

var mt=new MusicTheoryEngine();
window.MusicTheoryEngine=MusicTheoryEngine;
var ng=new NumberGenerator({ musicTheory: mt });
ng.musicTheory=mt;

// The full catalogue, not the handful the engine falls back to without a
// browser: the chords that broke this live in its stranger corners.
var scaleIds=[];
if(window.EMBEDDED_SCALES_DATA && window.EMBEDDED_SCALES_DATA.scales){
  var intervals={};
  window.EMBEDDED_SCALES_DATA.scales.forEach(function(s){ intervals[s.id]=s.intervals; });
  mt.scales=intervals;
  scaleIds=Object.keys(intervals);
}

check('the whole scale catalogue is loaded', function(){
  if(scaleIds.length < 500) throw new Error('only '+scaleIds.length+' scales');
});

// The strip writes root+chordType. The box writes numeral+quality. These are
// the only rewrites the box is allowed: a spelled-out name for the symbols
// that are awkward to type, and the minor third the lowercase numeral has
// already said.
function qualityMatches(suffix, chordType, numeralIsLower){
  if(suffix===chordType) return true;
  if(numeralIsLower && ('m'+suffix)===chordType) return true;   // ii7 for m7, vi6 for m6
  if(suffix==='halfdim7' && (chordType==='m7b5'||chordType==='ø7')) return true;
  if(suffix==='aug(maj7)' && (chordType==='maj7#5'||chordType==='+maj7')) return true;
  if(suffix==='aug(min7)' && chordType==='m7#5') return true;
  if(suffix==='aug(7)' && chordType==='7#5') return true;
  if(suffix==='aug' && (chordType==='aug'||chordType==='+')) return true;
  return false;
}

check('every degree of every scale is called what it is', function(){
  var examined=0, wrong=[];
  scaleIds.forEach(function(scale){
    var notes;
    try{ notes=mt.getScaleNotes('C',scale)||[]; }catch(e){ return; }
    if(!notes.length) return;
    ng.setScaleInfo('C',scale);
    ng.currentScaleNotes=notes;
    for(var d=1;d<=notes.length;d++){
      var chord;
      try{ chord=mt.getDiatonicChord(d,'C',scale)||{}; }catch(e){ continue; }
      if(!chord.root) continue;
      var token=ng.numberToRoman(d);
      var numeral=ng.degreeToRomanNumeral(d);
      examined++;
      var head=String(token).slice(0,numeral.length);
      if(head.toUpperCase()!==numeral){
        wrong.push(scale+' deg'+d+': token '+token+' is not numeral '+numeral);
        continue;
      }
      var suffix=String(token).slice(numeral.length);
      if(!qualityMatches(suffix, String(chord.chordType||''), head===head.toLowerCase())){
        wrong.push(scale+' deg'+d+': strip says '+chord.root+chord.chordType+', box says '+token);
      }
    }
  });
  if(examined < 5000) throw new Error('only '+examined+' degrees examined');
  print('       '+examined+' degrees, all named alike');
  if(wrong.length) throw new Error(wrong.length+' disagree, e.g. '+wrong.slice(0,4).join(' | '));
});

check('C major still reads as its own diatonic sevenths', function(){
  ng.setScaleInfo('C','major');
  ng.currentScaleNotes=mt.getScaleNotes('C','major');
  var tokens=[1,2,3,4,5,6,7].map(function(n){ return ng.numberToRoman(n); });
  print('       '+tokens.join('  '));
  var expected=['Imaj7','ii7','iii7','IVmaj7','V7','vi7','viihalfdim7'];
  tokens.forEach(function(t,i){
    if(t!==expected[i]) throw new Error('degree '+(i+1)+' reads '+t+', expected '+expected[i]);
  });
});

// The way back. diatonicChordForDisplayToken is called with whatever is in the
// numbers box; a stub receiver gives it the two things it asks the app for.
var app=Object.create(window.ModularMusicTheoryApp.prototype);
app.musicTheory=mt;
app.numberGenerator=ng;
function useScale(key,scale){
  ng.setScaleInfo(key,scale);
  ng.currentScaleNotes=mt.getScaleNotes(key,scale);
  app.scaleLibrary={ getCurrentKey:function(){ return key; }, getCurrentScale:function(){ return scale; } };
}

check('typing back what the box shows gives the sheet the same chord', function(){
  var checked=0, wrong=[];
  // Every scale is a lot of chord building; a wide spread of the catalogue is
  // enough, and it includes the one this was found on.
  var sample=['chromatic_lydian','major','harmonic','melodic','whole_tone','octatonic_dim','locrian'];
  for(var i=0;i<scaleIds.length;i+=37) sample.push(scaleIds[i]);
  sample.forEach(function(scale){
    var notes;
    try{ notes=mt.getScaleNotes('C',scale)||[]; }catch(e){ return; }
    if(!notes.length) return;
    useScale('C',scale);
    for(var d=1;d<=notes.length;d++){
      var chord;
      try{ chord=mt.getDiatonicChord(d,'C',scale)||{}; }catch(e){ continue; }
      if(!chord.root) continue;
      var token=ng.numberToRoman(d);
      var back=app.diatonicChordForDisplayToken(token);
      checked++;
      if(!back){ wrong.push(scale+' deg'+d+': '+token+' resolved to nothing'); continue; }
      if(back.root!==chord.root || back.chordType!==chord.chordType){
        wrong.push(scale+' deg'+d+': '+token+' -> '+back.root+back.chordType+', strip says '+chord.root+chord.chordType);
      } else if(!back.chordNotes || back.chordNotes.join(',')!==(chord.diatonicNotes||[]).join(',')){
        wrong.push(scale+' deg'+d+': '+token+' came back with the wrong notes');
      }
    }
  });
  if(checked < 200) throw new Error('only '+checked+' tokens checked');
  print('       '+checked+' tokens round-tripped');
  if(wrong.length) throw new Error(wrong.length+' broke, e.g. '+wrong.slice(0,4).join(' | '));
});

check('the chord that broke this survives the trip whole', function(){
  useScale('C','chromatic_lydian');
  // C Db E F Gb A B: a first degree with no fifth, a fifth degree with no third.
  var one=app.diatonicChordForDisplayToken('Imaj7(b5)');
  if(!one || one.fullName!=='Cmaj7(b5)') throw new Error('Imaj7(b5) -> '+(one&&one.fullName));
  if(one.chordNotes.indexOf('G')>=0) throw new Error('a perfect fifth this scale does not have');
  var five=app.diatonicChordForDisplayToken('Vmaj7sus4');
  if(!five || five.fullName!=='Gbmaj7sus4') throw new Error('Vmaj7sus4 -> '+(five&&five.fullName));
  var three=app.diatonicChordForDisplayToken('IIIsus2(add6)');
  if(!three || three.fullName!=='Esus2(add6)') throw new Error('IIIsus2(add6) -> '+(three&&three.fullName));
  if(three.chordNotes.length<4) throw new Error('came back a triad: '+three.chordNotes.join(' '));
});

check('the numbers box splits its own line the same way', function(){
  var tokens=ng.splitManualTokens('Imaj7(b5), IIImodal(add6, no5) V7');
  if(tokens.length!==3) throw new Error('got '+tokens.length+' tokens: '+tokens.join(' | '));
  if(tokens[1]!=='IIImodal(add6, no5)') throw new Error('torn: '+tokens[1]);
  if(ng.splitManualTokens('  ').length!==0) throw new Error('made a token out of nothing');
});

// numeric-progression owns the same input field and reaches the sheet by its
// own route, so it has to tokenize these names the same way.
document.readyState='complete';
var MutationObserver=function(){ this.observe=function(){}; };
__e(readFile('numeric-progression.js'));

check('a chord name with a comma inside it stays one chord', function(){
  var parsed=window.NumericProgression.parseDegrees('Imodal(b5, #5) V7 vi6');
  var raws=parsed.map(function(p){ return p.raw; });
  print('       '+raws.join('  |  '));
  if(parsed.length!==3) throw new Error('parsed '+parsed.length+' chords from 3: '+raws.join(' | '));
  if(parsed[0].quality!=='modal(b5, #5)') throw new Error('first chord came out as '+parsed[0].quality);
  if(parsed[1].raw!=='V7'||parsed[2].raw!=='vi6') throw new Error('later chords disturbed: '+raws.join(' | '));
});

check('a token that is not this scale\'s own name is left to the parser', function(){
  useScale('C','major');
  if(app.diatonicChordForDisplayToken('bIImaj7')) throw new Error('claimed a borrowed chord as diatonic');
  if(app.diatonicChordForDisplayToken('F#m7')) throw new Error('claimed a spelled chord as diatonic');
  if(app.diatonicChordForDisplayToken('')) throw new Error('claimed the empty token');
  if(!app.diatonicChordForDisplayToken('V7')) throw new Error('did not recognise its own dominant');
});

print(failures ? ('FAILURES: '+failures) : 'one degree, one chord, one name');
if (failures) { throw new Error(failures+' degree-label check(s) failed'); }
