// A scale's own spelling has to survive the whole app.
//
// A seven-note scale has one note per letter name. B♭ phrygian is
// B♭ C♭ D♭ E♭ F G♭ A♭ — the second degree is C♭, and writing it B would put
// two notes on the letter B and none on C. The engine that spells scales knew
// this. Nothing downstream did: every module carried its own twelve-name table,
// got `undefined` for C♭, and silently dropped the note. The visible damage:
//
//   the ii chord      C♭ E♭ G♭ B♭   named "C♭modal"    (its root was unreadable)
//   the v chord       F A♭ C♭ E♭    named "Fm7(no5)"   (its fifth was dropped)
//   the vii chord     A♭ C♭ E♭ G♭   named "A♭modal7"
//   the keyboard      lit six of the scale's seven degrees, and called the
//                     seventh B while the chord strip called it C♭
//
// So this checks the three things that have to hold together: every name the
// scale writer produces can be READ, the chords come out NAMED by all of their
// notes, and the instruments SHOW the degree wearing the scale's own spelling.
//
// It also checks the other direction, which is the easy thing to break while
// fixing this: the engine must still never VOLUNTEER C♭ or E♯ or a double
// accidental when it is choosing a name for itself.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var __listeners={};
this.addEventListener=function(t,f){(__listeners[t]=__listeners[t]||[]).push(f);};
this.dispatchEvent=function(e){(__listeners[e.type]||[]).forEach(function(f){f(e);});return true;};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};

function el(tag){
  var e={tagName:(tag||'div').toUpperCase(),style:{setProperty:function(){}},children:[],dataset:{},
    id:'',textContent:'',value:'',checked:false,disabled:false,title:'',
    appendChild:function(c){this.children.push(c);c.parentNode=this;return c;},
    append:function(){for(var i=0;i<arguments.length;i++)this.appendChild(arguments[i]);},
    insertBefore:function(c){this.children.push(c);c.parentNode=this;return c;},
    removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);return c;},
    setAttribute:function(k,v){this[k]=v;},getAttribute:function(k){return this[k];},
    removeAttribute:function(){},addEventListener:function(){},removeEventListener:function(){},
    getBoundingClientRect:function(){return {width:1200,height:200,top:0,left:0};},
    focus:function(){},blur:function(){},remove:function(){},closest:function(){return null;},
    getContext:function(){return null;}};
  e._className='';
  Object.defineProperty(e,'className',{get:function(){return e._className;},
    set:function(v){e._className=String(v==null?'':v);}});
  e._innerHTML='';
  Object.defineProperty(e,'innerHTML',{get:function(){return e._innerHTML;},
    set:function(v){e._innerHTML=String(v==null?'':v);e.children.length=0;}});
  var classes=function(){ return e._className.split(/\s+/).filter(function(s){return s.length;}); };
  e.classList={
    add:function(){ var c=classes();
      for(var i=0;i<arguments.length;i++) if(c.indexOf(arguments[i])<0) c.push(arguments[i]);
      e._className=c.join(' '); },
    remove:function(){ var drop=Array.prototype.slice.call(arguments);
      e._className=classes().filter(function(x){return drop.indexOf(x)<0;}).join(' '); },
    toggle:function(c,on){ if(on)e.classList.add(c); else e.classList.remove(c); },
    contains:function(c){ return classes().indexOf(c)>=0; }
  };
  var walk=function(node,out){ (node.children||[]).forEach(function(c){ out.push(c); walk(c,out); }); return out; };
  e.querySelectorAll=function(sel){
    var all=walk(this,[]);
    var parts=String(sel).split(',').map(function(s){return s.trim();});
    return all.filter(function(n){
      return parts.some(function(p){
        if(p.charAt(0)==='.') return n.classList.contains(p.slice(1));
        var m=p.match(/^\[data-(\w+)="([^"]*)"\]$/);
        if(m) return String(n.dataset[m[1]])===m[2];
        return n.tagName===p.toUpperCase();
      });
    });
  };
  e.querySelector=function(sel){ var r=this.querySelectorAll(sel); return r.length?r[0]:null; };
  return e;
}
var document={createElement:el,createElementNS:function(ns,t){return el(t);},
  createTextNode:function(t){return {textContent:t};},
  getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},
  addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
  body:el('body'),head:el('head'),documentElement:el('html')};
var localStorage={_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;}};
var navigator={userAgent:'test'};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var matchMedia=function(){return {matches:false,addListener:function(){}};};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'piano-visualizer.js','guitar-fretboard-visualizer.js'].forEach(load);

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(cond,msg){ if(!cond) throw new Error(msg); }

print('=== note spelling ===');

var mt=new MusicTheoryEngine();
var KEYS=['C','G','D','A','E','B','F#','C#','F','Bb','Eb','Ab','Db','Gb','Cb'];

// The harness measures with its own reader, not with the engine's. A check
// that asks the thing under test what a note is agrees with it about every
// note it cannot read, and then reports nothing wrong.
var LETTER={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function pc(name){
  var m=String(name==null?'':name).trim().replace(/♯/g,'#').replace(/♭/g,'b')
        .match(/^([A-Ga-g])((?:#|b)*)(?:-?\d+)?$/);
  if(!m) return null;
  var v=LETTER[m[1].toUpperCase()];
  for(var i=0;i<m[2].length;i++) v += (m[2].charAt(i)==='#') ? 1 : -1;
  return ((v%12)+12)%12;
}

// ---- reading -------------------------------------------------------------

check('the odd spellings read as the pitches they are', function(){
  assert(mt.pitchClassOf('Cb')===11, 'Cb is not pitch class 11');
  assert(mt.pitchClassOf('Fb')===4,  'Fb is not pitch class 4');
  assert(mt.pitchClassOf('E#')===5,  'E# is not pitch class 5');
  assert(mt.pitchClassOf('B#')===0,  'B# is not pitch class 0');
  assert(mt.pitchClassOf('Bbb')===9, 'Bbb is not pitch class 9');
  assert(mt.pitchClassOf('F##')===7, 'F## is not pitch class 7');
  assert(mt.pitchClassOf('G♭')===6,  'a unicode flat did not read');
  assert(mt.pitchClassOf('banana')===null, 'a non-note read as a note');
});

check('the octave belongs to the letter, not to the sounding pitch', function(){
  // C♭4 is a fourth-octave C written flat. It sounds B3, a semitone under C4.
  assert(mt.noteToMidi('Cb4')===59, 'Cb4 came out '+mt.noteToMidi('Cb4')+', want 59');
  assert(mt.noteToMidi('B#3')===60, 'B#3 came out '+mt.noteToMidi('B#3')+', want 60');
  assert(mt.noteToMidi('B4')===71,  'B4 came out '+mt.noteToMidi('B4'));
  assert(mt.noteToMidi('Cb4')!==mt.noteToMidi('B4'), 'Cb4 and B4 are the same pitch');
  assert(mt.noteToMidi('Bbb4')===69, 'Bbb4 came out '+mt.noteToMidi('Bbb4')+', want 69');
});

check('every name the scale writer produces can be read back', function(){
  var bad=[], n=0;
  Object.keys(mt.scales).forEach(function(id){
    var iv=mt.scales[id]; if(!Array.isArray(iv)||!iv.length) return;
    KEYS.forEach(function(k){
      var notes=mt.getScaleNotesWithKeySignature(k,id);
      notes.forEach(function(x){
        n++;
        if(pc(x)===null && bad.length<5) bad.push(id+' in '+k+': '+x);
      });
    });
  });
  assert(n>100000, 'only '+n+' notes surveyed — the catalogue did not load');
  assert(bad.length===0, 'unreadable degrees: '+bad.join(' | '));
});

// ---- naming --------------------------------------------------------------

check('B flat phrygian is spelled one note per letter', function(){
  var got=mt.getScaleNotesWithKeySignature('Bb','phrygian').join(' ');
  assert(got==='Bb Cb Db Eb F Gb Ab', 'got "'+got+'"');
});

check('B flat phrygian names every chord by all of its notes', function(){
  var want=['Bbm7','Cbmaj7','Db7','Ebm7','Fm7b5','Gbmaj7','Abm7'];
  var got=[];
  for(var d=1; d<=7; d++) got.push(mt.getDiatonicChord(d,'Bb','phrygian').fullName);
  assert(got.join(',')===want.join(','), 'got '+got.join(',')+'\n         want '+want.join(','));
});

check('no chord anywhere is named "modal" while it has a third', function(){
  // "modal" is the word for a collection with no third in it. Reaching it with
  // a third present means notes were dropped before the chord was named.
  var bad=[], named=0;
  Object.keys(mt.scales).forEach(function(id){
    var iv=mt.scales[id]; if(!Array.isArray(iv)||!iv.length) return;
    KEYS.forEach(function(k){
      var notes=mt.getScaleNotesWithKeySignature(k,id);
      notes.forEach(function(_,i){
        var c=mt.getDiatonicChord(i+1,k,id);
        named++;
        if(!/modal/.test(String(c.chordType||''))) return;
        var rv=pc(c.root);
        var third=(c.diatonicNotes||[]).some(function(x){
          var v=pc(x);
          if(v===null||rv===null) return false;
          var semi=(v-rv+12)%12;
          return semi===3||semi===4;
        });
        if(third && bad.length<5) bad.push(id+' '+k+' deg'+(i+1)+' '+c.fullName+' ['+(c.diatonicNotes||[]).join(' ')+']');
      });
    });
  });
  assert(named>100000, 'only '+named+' chords named — the catalogue did not load');
  assert(bad.length===0, bad.join(' | '));
});

check('a named chord accounts for exactly as many notes as it has', function(){
  // The other half of the same failure: "Fm7(no5)" is a four-note chord wearing
  // a three-note name. Where the classifier returns a catalogue chord type, its
  // formula must have one interval per distinct pitch in the chord.
  var bad=[], checked=0;
  Object.keys(mt.scales).forEach(function(id){
    var iv=mt.scales[id]; if(!Array.isArray(iv)||!iv.length) return;
    KEYS.forEach(function(k){
      var notes=mt.getScaleNotesWithKeySignature(k,id);
      notes.forEach(function(_,i){
        var c=mt.getDiatonicChord(i+1,k,id);
        var formula=mt.chordFormulas[c.chordType];
        if(!formula) return;  // synthetic descriptive name; nothing to compare
        var rv=pc(c.root);
        var pcs={};
        (c.diatonicNotes||[]).forEach(function(x){
          var v=pc(x); if(v!==null&&rv!==null) pcs[(v-rv+12)%12]=1;
        });
        checked++;
        var distinct=Object.keys(pcs).length;
        var fdistinct=Object.keys(formula.reduce(function(a,x){a[x%12]=1;return a;},{})).length;
        if(distinct!==fdistinct && bad.length<5){
          bad.push(id+' '+k+' deg'+(i+1)+' '+c.fullName+' names '+fdistinct+' of '+distinct+' notes ['+(c.diatonicNotes||[]).join(' ')+']');
        }
      });
    });
  });
  assert(checked>30000, 'only '+checked+' chords compared');
  assert(bad.length===0, bad.join(' | '));
});

check('every chord is spelled on the degree it is built on', function(){
  // The chord strip and the instrument have to be looking at the same note.
  // C lydian augmented is C D E F♯ G♯ A B, and a flat-preference pass used to
  // relabel the chord on its fourth degree "G♭m7♭5" while the keyboard under
  // it showed F♯ — the same disagreement as the C♭ one, arriving from the
  // other side.
  var bad=[], tot=0;
  Object.keys(mt.scales).forEach(function(id){
    var iv=mt.scales[id]; if(!Array.isArray(iv)||!iv.length) return;
    KEYS.forEach(function(k){
      mt.getScaleNotesWithKeySignature(k,id).forEach(function(n,i){
        var c=mt.getDiatonicChord(i+1,k,id);
        tot++;
        if(String(c.root)!==String(n) && bad.length<5){
          bad.push(id+' in '+k+' deg'+(i+1)+': the scale says '+n+', the chord says '+c.root+' ('+c.fullName+')');
        }
      });
    });
  });
  assert(tot>100000, 'only '+tot+' degrees surveyed');
  assert(bad.length===0, bad.join(' | '));
  var la=mt.getDiatonicChord(4,'C','lydian_augmented');
  assert(la.root==='F#', 'C lydian augmented degree 4 is rooted on '+la.root+', want F#');
});

check('the engine still never volunteers a spelling of its own accord', function(){
  // Reading C♭ must not turn into offering it. Semitone 11 asked for as a flat
  // is still B; the enharmonics offered for it are B and nothing else.
  assert(mt.spellSemitoneWithPreference(11,true)==='B', 'flat-preferred 11 came out '+mt.spellSemitoneWithPreference(11,true));
  assert(mt.spellSemitoneWithPreference(4,true)==='E',  'flat-preferred 4 came out '+mt.spellSemitoneWithPreference(4,true));
  assert(mt.spellSemitoneWithPreference(5,false)==='F', 'sharp-preferred 5 came out '+mt.spellSemitoneWithPreference(5,false));
  assert(mt.spellSemitoneWithPreference(0,false)==='C', 'sharp-preferred 0 came out '+mt.spellSemitoneWithPreference(0,false));
  assert(mt.getSpellingCandidates(11).join(',')==='B', 'candidates for 11: '+mt.getSpellingCandidates(11).join(','));
  assert(mt.getSpellingCandidates(1).join(',')==='C#,Db', 'candidates for 1: '+mt.getSpellingCandidates(1).join(','));
  assert(mt.semitoneToNote[11]==='B', 'the reverse table names 11 as '+mt.semitoneToNote[11]);
  assert(mt.semitoneToNote[10]==='A#'||mt.semitoneToNote[10]==='Bb', 'the reverse table names 10 as '+mt.semitoneToNote[10]);
  // And a plain key is still spelled the plain way.
  assert(mt.getScaleNotesWithKeySignature('C','major').join(' ')==='C D E F G A B', 'C major moved');
  assert(mt.getScaleNotesWithKeySignature('Eb','major').join(' ')==='Eb F G Ab Bb C D', 'Eb major moved');
});

// ---- showing -------------------------------------------------------------

var SCALE=mt.getScaleNotesWithKeySignature('Bb','phrygian');   // Bb Cb Db Eb F Gb Ab

var piano=new PianoVisualizer({ musicTheory: mt });
piano.mount(el('div'));
piano.renderScale({ key:'Bb', scale:'phrygian', notes: SCALE });
var keys=function(){ return piano.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key'); };

check('the keyboard lights all seven degrees, C flat included', function(){
  var lit={};
  keys().forEach(function(k){
    var n=k.dataset.correctNote||k.dataset.note;
    if(piano.scaleIndexOfNote(n)!==-1) lit[pc(n)]=true;
  });
  assert(Object.keys(lit).length===7, 'only '+Object.keys(lit).length+' of 7 degrees are recognised on the keyboard');
});

check('the key that sounds B wears the scale\'s spelling of it', function(){
  var b=keys().filter(function(k){ return pc(k.dataset.note)===11; });
  assert(b.length>0, 'the keyboard has no B key');
  b.forEach(function(k){
    assert(k.dataset.correctNote==='Cb', 'a B key is labelled '+k.dataset.correctNote+', want Cb');
  });
  assert(piano.getScaleDegreeForNote('Cb')===2, 'C flat is degree '+piano.getScaleDegreeForNote('Cb')+', want 2');
  assert(piano.getScaleDegreeForNote('B')===2,  'the same pitch spelled B is degree '+piano.getScaleDegreeForNote('B'));
});

check('focusing a chord spelled with C flat lights the right keys', function(){
  piano.setFocusNotes(['F4','Ab4','Cb5','Eb5'], { kind:'chord' });
  var lit=keys().filter(function(k){ return k.classList.contains('focus-note'); });
  assert(lit.length>0, 'the v chord of Bb phrygian lit nothing');
  var pcs={};
  lit.forEach(function(k){ pcs[pc(k.dataset.note)]=true; });
  var got=Object.keys(pcs).map(Number).sort(function(a,b){return a-b;}).join(',');
  assert(got==='3,5,8,11', 'lit pitch classes '+got+', want 3,5,8,11 (F Ab Cb Eb)');
  piano.clearFocusNotes();
});

var guitar=new GuitarFretboardVisualizer({});
guitar.mount(el('div'));
guitar.renderScale({ key:'Bb', scale:'phrygian', notes: SCALE });
var cells=function(){ return guitar.gridEl ? guitar.gridEl.querySelectorAll('.fret-cell') : []; };

check('the fretboard lights all seven degrees, C flat included', function(){
  assert(cells().length>20, 'only '+cells().length+' cells on the neck');
  var lit={};
  cells().forEach(function(c){
    if(String(c.style.opacity)==='1') lit[pc(c.dataset.note)]=true;
  });
  assert(Object.keys(lit).length===7, 'only '+Object.keys(lit).length+' of 7 degrees glow on the neck');
  assert(lit[11], 'the C flat degree is dark on the neck');
});

check('a lit fret reads the way the scale spells it', function(){
  var b=cells().filter(function(c){ return pc(c.dataset.note)===11; });
  assert(b.length>0, 'no B on the neck');
  var label=b[0].querySelector('.fret-label');
  assert(label && label.textContent==='Cb', 'the fret reads "'+(label&&label.textContent)+'", want Cb');
});

print(failures? ('FAILURES: '+failures) : 'every scale is read, named and shown in its own spelling');
if (failures) { throw new Error(failures+' spelling check(s) failed'); }
