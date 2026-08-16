// The case of the numeral is part of the chord, and it survives a quality.
//
// "iv7" in C major is F minor seventh: the lowercase numeral IS the minor
// third, and the 7 after it extends that chord. It came back F7 — a major
// third, the one thing the user wrote a lowercase numeral to rule out —
// because the progression parser used the typed quality verbatim and dropped
// the case the moment there was one to drop. The numbers box read the same
// token correctly, so which chord reached the staff depended on which parser
// had run last.
//
// There were three readers of a Roman numeral and no agreement between them.
// There is one now, in the engine; this checks it, and checks that all three
// callers give the same answer for the same token.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
function el(tag){
  var e={tagName:(tag||'div').toUpperCase(),style:{setProperty:function(){}},children:[],dataset:{},
    className:'',id:'',textContent:'',innerHTML:'',value:'',checked:false,disabled:false,title:'',
    appendChild:function(c){this.children.push(c);return c;},append:function(){},
    insertBefore:function(c){return c;},removeChild:function(c){return c;},
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
  _byId:{}, getElementById:function(id){ return this._byId[id]||(this._byId[id]=el('div')); },
  querySelector:function(){return null;},querySelectorAll:function(){return [];},
  addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
  body:el('body'),head:el('head'),documentElement:el('html'),readyState:'complete'};
window.addEventListener=function(){};window.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var MutationObserver=function(){ this.observe=function(){}; };
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'number-generator.js'].forEach(load);
__e(readFile('modular-app.js') + ';window.ModularMusicTheoryApp=ModularMusicTheoryApp;');

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }

print('=== a typed quality does not eat the numeral ===');

var mt=new MusicTheoryEngine();
window.MusicTheoryEngine=MusicTheoryEngine;
var sd=window.EMBEDDED_SCALES_DATA.scales, iv={};
sd.forEach(function(s){ iv[s.id]=s.intervals; });
mt.scales=iv;

var ng=new NumberGenerator({ musicTheory: mt });
ng.musicTheory=mt;
ng.mount(el('div'));

var handlers={};
var lib={ scaleStack:[], _key:'C', _scale:'major',
  getCurrentKey:function(){ return this._key; }, getCurrentScale:function(){ return this._scale; },
  getCurrentScaleNotes:function(){ return mt.getScaleNotes(this._key,this._scale); },
  on:function(ev,fn){ (handlers[ev]=handlers[ev]||[]).push(fn); },
  fire:function(k,s){ this._key=k; this._scale=s;
    (handlers.scaleChanged||[]).forEach(function(f){ f({key:k,scale:s,notes:mt.getScaleNotes(k,s)}); }); } };
var sheetChords=null;
var sheet={ state:{barChords:[],barDegrees:[],musicalPhrase:null},
  setKeyAndScale:function(){}, setBarMode:function(){}, setHarmonizationMode:function(){},
  setBarChords:function(c){ sheetChords=c; this.state.barChords=c; },
  setBarDegrees:function(){}, render:function(){} };
function anyStub(){ var f=function(){ return anyStub(); };
  return new Proxy(f,{ get:function(){ return anyStub(); }, apply:function(){ return anyStub(); } }); }
var base=Object.create(window.ModularMusicTheoryApp.prototype);
base.musicTheory=mt; base.numberGenerator=ng; base.scaleLibrary=lib; base.sheetMusicGenerator=sheet;
var app=new Proxy(base,{ get:function(t,p){ return (p in t)? t[p] : anyStub(); },
                         set:function(t,p,v){ t[p]=v; return true; } });
window.ModularMusicTheoryApp.prototype.setupModuleIntegration.call(app);
window.modularApp=app;
lib.fire('C','major');
load('numeric-progression.js');

function pcsOf(notes){
  var out=[];
  (notes||[]).forEach(function(n){
    var pc=mt.pitchClassOf(String(n).replace(/-?\d+$/,''));
    if(pc!=null && out.indexOf(pc)<0) out.push(pc);
  });
  return out.sort(function(a,b){ return a-b; }).join(',');
}
function pcsOfNames(names){ return pcsOf(names); }

// token -> what it means in C major: root, chord type, and the notes those
// two amount to. A third that is not there is the whole point of most of
// these, so the notes are checked too.
var TABLE = [
  ['iv7',    'F',  'm7',    ['F','Ab','C','Eb']],
  ['IV7',    'F',  '7',     ['F','A','C','Eb']],
  ['iv',     'F',  'm',     ['F','Ab','C']],
  ['iv6',    'F',  'm6',    ['F','Ab','C','D']],
  ['iv9',    'F',  'm9',    ['F','Ab','C','Eb','G']],
  ['ivm7',   'F',  'm7',    ['F','Ab','C','Eb']],
  ['ivmaj7', 'F',  'maj7',  ['F','A','C','E']],
  ['IV',     'F',  'maj7',  ['F','A','C','E']],
  ['ii',     'D',  'm7',    ['D','F','A','C']],
  ['ii7',    'D',  'm7',    ['D','F','A','C']],
  ['II7',    'D',  '7',     ['D','F#','A','C']],
  ['v7',     'G',  'm7',    ['G','Bb','D','F']],
  ['V7',     'G',  '7',     ['G','B','D','F']],
  ['vi',     'A',  'm7',    ['A','C','E','G']],
  ['VI',     'A',  'maj',   ['A','C#','E']],
  ['iii7',   'E',  'm7',    ['E','G','B','D']],
  ['bVII7',  'Bb', '7',     ['Bb','D','F','Ab']],
  ['bIImaj7','Db', 'maj7',  ['Db','F','Ab','C']],
  ['#ivm7b5','F#', 'm7b5',  ['F#','A','C','E']],
  ['iiø7',   'D',  'm7b5',  ['D','F','Ab','C']],
  ['vii°7',  'B',  'dim7',  ['B','D','F','Ab']],
  ['viihalfdim7','B','m7b5',['B','D','F','A']]
];

check('the engine reads every one of them the way it is written', function(){
  var wrong=[];
  TABLE.forEach(function(row){
    var c=mt.chordFromRomanToken(row[0],'C','major');
    if(!c){ wrong.push(row[0]+': read as nothing'); return; }
    if(c.root!==row[1] || c.chordType!==row[2]){
      wrong.push(row[0]+' -> '+c.root+c.chordType+', want '+row[1]+row[2]);
    } else if(pcsOf(c.chordNotes)!==pcsOfNames(row[3])){
      wrong.push(row[0]+' -> notes ['+c.chordNotes.join(' ')+'], want ['+row[3].join(' ')+']');
    }
  });
  if(wrong.length) throw new Error(wrong.length+' wrong: '+wrong.join(' | '));
  print('       '+TABLE.length+' tokens, all as written');
});

check('the third the user typed a lowercase numeral for is minor', function(){
  // The report, exactly: iv7 in C major.
  var c=mt.chordFromRomanToken('iv7','C','major');
  var third=(mt.pitchClassOf(c.chordNotes[1]) - mt.pitchClassOf(c.root) + 12) % 12;
  if(third!==3) throw new Error('iv7 came back '+c.root+c.chordType+' ['+c.chordNotes.join(' ')+']');
});

/** The three readers, on one token. */
function readings(tok){
  var out={};
  // Compared against the table, not against the engine, so this check still
  // means something when the engine has no reader of its own to ask.
  out.engine=(function(){
    if(typeof mt.chordFromRomanToken!=='function') return 'no shared reader';
    var c=mt.chordFromRomanToken(tok,'C','major');
    return c? c.root+c.chordType : null;
  })();
  out.box=ng.normalizePreviewRomanToken(tok);
  sheetChords=null;
  ng.state.isManualEditing=true;
  ng.state.manualRawInput=tok;
  ng.state.manualRomanMode=true;
  ng.state.pendingManualNumbers=[];
  ng.commitManualNumbers(el('input'),{force:true});
  var viaSheet=sheetChords && sheetChords[0];
  out.sheet=viaSheet? (viaSheet.root + (viaSheet.chordType||'')) : null;
  window.NumericProgression.setInput(tok);
  var np=window.NumericProgression.getChords()[0];
  out.progression=np? (np.root + (np.chordType==='maj'?'maj':np.chordType||'')) : null;
  return out;
}

check('all three readers agree, token for token', function(){
  var wrong=[];
  TABLE.forEach(function(row){
    var r=readings(row[0]);
    var want=row[1]+row[2];
    ['engine','box','sheet','progression'].forEach(function(who){
      if(r[who]!==want) wrong.push(row[0]+' via '+who+' -> '+r[who]+', want '+want);
    });
  });
  if(wrong.length) throw new Error(wrong.length+' disagree: '+wrong.slice(0,6).join(' | '));
  print('       '+(TABLE.length*4)+' readings, one answer each');
});

check('a quality with no formula behind it still makes a chord', function(){
  // 'm13' is not in the table of formulas. A bar with no notes in it is not
  // an acceptable answer; one extension shorter is.
  var c=mt.chordFromRomanToken('iv13','C','major');
  if(!c || !c.chordNotes.length) throw new Error('iv13 came back empty');
  if(!/^m/.test(c.chordType)) throw new Error('iv13 came back '+c.chordType);
  var third=(mt.pitchClassOf(c.chordNotes[1]) - mt.pitchClassOf(c.root) + 12) % 12;
  if(third!==3) throw new Error('iv13 lost its minor third: '+c.chordNotes.join(' '));
  print('       iv13 -> '+c.root+c.chordType+'  ['+c.chordNotes.join(' ')+']');
  // Nonsense after the numeral falls back to the plain chord of that case.
  var junk=mt.chordFromRomanToken('iv4','C','major');
  if(!junk || !junk.chordNotes.length) throw new Error('iv4 came back empty');
  if(pcsOf(junk.chordNotes)!==pcsOfNames(['F','Ab','C'])) throw new Error('iv4 -> '+junk.chordNotes.join(' '));
});

check('a flat fifth is a fifth, not an extra note beside one', function(){
  // generateSyntheticChordType writes "(b5)" only for a chord with NO perfect
  // fifth, so reading it back as maj7 plus a tritone returned a different
  // chord than the name describes — and that name is what the numbers box
  // prints for such a degree.
  var notes=mt.getChordNotes('C','maj7(b5)');
  if(pcsOf(notes)!==pcsOfNames(['C','E','Gb','B'])) throw new Error('Cmaj7(b5) -> '+notes.join(' '));
  var sharp=mt.getChordNotes('C','maj7(#5)');
  if(pcsOf(sharp)!==pcsOfNames(['C','E','G#','B'])) throw new Error('Cmaj7(#5) -> '+sharp.join(' '));
  // A tritone that DOES sit above a perfect fifth is written #11, and that
  // one is an addition.
  var eleven=mt.getChordNotes('C','maj7(#11)');
  if(pcsOf(eleven)!==pcsOfNames(['C','E','G','B','F#'])) throw new Error('Cmaj7(#11) -> '+eleven.join(' '));
});

check('the reading follows the scale it is read in', function(){
  // Same token, different scale: the numeral counts degrees of whatever is
  // loaded, and an accidental is measured against the major scale of the
  // tonic — "bVII" in C minor is Bb, not the Bbb that flattening the scale's
  // own seventh would give.
  var iv=mt.chordFromRomanToken('iv','C','aeolian');
  if(iv.root!=='F' || !/^m/.test(iv.chordType)) throw new Error('iv in C minor -> '+iv.root+iv.chordType);
  var flat7=mt.chordFromRomanToken('bVII','C','aeolian');
  if(mt.pitchClassOf(flat7.root)!==10) throw new Error('bVII in C minor -> '+flat7.root);
  var five=mt.chordFromRomanToken('V7','C','aeolian');
  if(five.root!=='G' || five.chordType!=='7') throw new Error('V7 in C minor -> '+five.root+five.chordType);
});

check('a numeral past the seventh degree still counts', function(){
  // Scales in this library run to twelve notes.
  var d=mt.romanNumeralToDegree('IX');
  if(d!==9) throw new Error('IX -> '+d);
  if(mt.romanNumeralToDegree('H')!==null) throw new Error('read a letter that is not a numeral');
  var c=mt.chordFromRomanToken('ix7','C','octatonic_dim');
  if(!c || !c.chordNotes.length) throw new Error('ix7 in an octatonic scale came back empty');
});

check('the reported line, bar for bar', function(){
  // Imaj7 ii7 iii7 IVmaj7 iv7 V7 vi7 viihalfdim7 in C major — the scale's own
  // run with one chord altered, which is the whole point of typing in the box.
  var line='Imaj7 ii7 iii7 IVmaj7 iv7 V7 vi7 viihalfdim7';
  var want=['Cmaj7','Dm7','Em7','Fmaj7','Fm7','G7','Am7','Bm7b5'];

  sheetChords=null;
  ng.state.isManualEditing=true;
  ng.state.manualRawInput=line;
  ng.state.manualRomanMode=true;
  ng.state.pendingManualNumbers=[];
  ng.commitManualNumbers(el('input'),{force:true});
  var viaSheet=(sheetChords||[]).map(function(c){ return c.root+(c.chordType||''); });
  print('       box:         '+viaSheet.join('  '));
  if(viaSheet.join(' ')!==want.join(' ')) throw new Error('via the numbers box: '+viaSheet.join(' '));

  window.NumericProgression.setInput(line);
  var viaProg=window.NumericProgression.getChords().map(function(c){ return c.root+(c.chordType==='maj'?'':c.chordType||''); });
  print('       progression: '+viaProg.join('  '));
  if(viaProg.join(' ')!==want.join(' ')) throw new Error('via the progression parser: '+viaProg.join(' '));

  // And the altered bar is the one that differs from the scale, in the one
  // way it was asked to.
  var scaleOwn=mt.getDiatonicChord(4,'C','major');
  if(scaleOwn.chordType!=='maj7') throw new Error('the scale itself changed under the test');
});

print(failures? ('FAILURES: '+failures) : 'one numeral, one chord, whatever is typed after it');
if (failures) { throw new Error(failures+' typed-quality check(s) failed'); }
