// A chord voiced once must not be voiced twice.
//
// A phrase's chord notes ARE a voicing — "C3", "E3", "G3", "B3", the notes as
// played. barChords is the one-chord-per-bar summary the bar renderer reads,
// and that renderer decides the octave itself: it appends one to the name it
// is given. Given a name that already had an octave, "C3" + 4 came out "C34",
// which reads as C in the thirty-fourth octave and is drawn as a stack of
// ledger lines running a thousand pixels off the top of the page — every
// chord on the sheet turned into a picket fence.
//
// Three things had to line up for that to reach the staff, so all three are
// checked here: the summary keeps bare names, the voicer refuses an octave it
// is handed anyway, and setBarChords stops treating two chords with the same
// NAME as the same chord when their notes differ.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var localStorage={ _d:{}, getItem:function(k){return this._d[k]||null;}, setItem:function(k,v){this._d[k]=v;} };
var navigator={};
function el(tag){
  var e={ tagName:(tag||'div').toUpperCase(), style:{setProperty:function(){}}, children:[], dataset:{},
    className:'', id:'', textContent:'', innerHTML:'', value:'', checked:false, disabled:false, title:'',
    appendChild:function(c){ this.children.push(c); return c; },
    append:function(){ for(var i=0;i<arguments.length;i++) this.children.push(arguments[i]); },
    insertBefore:function(c){ this.children.push(c); return c; },
    removeChild:function(c){ var i=this.children.indexOf(c); if(i>=0)this.children.splice(i,1); return c; },
    setAttribute:function(k,v){ this[k]=v; }, getAttribute:function(k){ return this[k]; },
    removeAttribute:function(){}, addEventListener:function(){}, removeEventListener:function(){},
    querySelector:function(){ return null; }, querySelectorAll:function(){ return []; },
    getBoundingClientRect:function(){ return {width:900,height:400,top:0,left:0}; },
    classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},
    focus:function(){}, blur:function(){}, remove:function(){}, closest:function(){ return null; },
    getContext:function(){ return null; } };
  Object.defineProperty(e,'firstChild',{get:function(){return this.children[0]||null;}});
  Object.defineProperty(e,'parentNode',{get:function(){return null;},configurable:true});
  return e;
}
var document={ createElement:el, createElementNS:function(ns,t){ return el(t); },
  createTextNode:function(t){ return {textContent:t}; },
  getElementById:function(){ return el('div'); },
  querySelector:function(){ return el('div'); }, querySelectorAll:function(){ return []; },
  addEventListener:function(){}, removeEventListener:function(){}, dispatchEvent:function(){},
  body: el('body'), head: el('head'), documentElement: el('html') };
var CustomEvent=function(n,o){ this.type=n; this.detail=o&&o.detail; };
var setTimeout=function(){ return 0; }; var clearTimeout=function(){};
var requestAnimationFrame=function(){ return 0; };
var __e=eval;
__e(readFile('music-theory-engine.js'));
__e(readFile('sheet-music-generator.js'));

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }

print('=== a chord voiced once is not voiced twice ===');

var mt=new MusicTheoryEngine();
function freshSheet(){
  var g=new SheetMusicGenerator({ musicTheory: mt });
  g.mount(el('div'));
  g.setKeyAndScale('C','major', mt.getScaleNotes('C','major'));
  g.setBarMode('per-bar');
  return g;
}
function walk(node,out){
  if(!node||typeof node!=='object') return out;
  out.push(node);
  (node.children||[]).forEach(function(c){ walk(c,out); });
  return out;
}
/** What actually got drawn: ledger lines, and how far the noteheads strayed. */
function drawn(gen){
  gen.render();
  var all=walk(gen.svgContainer,[]);
  var heads=all.filter(function(n){ return n.tagName==='ELLIPSE'||n.tagName==='CIRCLE'; });
  var ys=heads.map(function(n){ return Number(n.cy); }).filter(isFinite);
  return {
    ledgers: all.filter(function(n){ return n['class']==='ledger-line'; }).length,
    heads: heads.length,
    minY: ys.length? Math.min.apply(null,ys) : null,
    maxY: ys.length? Math.max.apply(null,ys) : null
  };
}
/** The staff itself, to judge "off the page" against something real. */
function staffBand(gen){
  var lines=walk(gen.svgContainer,[]).filter(function(n){ return n.tagName==='LINE' && isFinite(Number(n.y1)); });
  var ys=lines.map(function(n){ return Number(n.y1); });
  return { top: Math.min.apply(null,ys), bottom: Math.max.apply(null,ys) };
}

// The sequence numeric-progression hands over: chord events carrying a
// voicing, one midi per voice.
function generatedDetail(){
  var profile={ root:'C', recommendedScale:'major', scaleNotes:mt.getScaleNotes('C','major') };
  var context={ harmonicProfile:profile, timeSignature:'4/4' };
  return {
    harmony:{ chordSequence:[
      { bar:0, beat:0, duration:4, chord:'Cmaj7', roman:'I', energy:0.5, texture:'PAD',
        chordObj:{root:'C',chordType:'maj7',chordNotes:['C','E','G','B'],diatonicNotes:['C','E','G','B'],fullName:'Cmaj7'},
        voicing:{ bass:48, tenor:52, alto:55, soprano:59 } },
      { bar:1, beat:0, duration:4, chord:'Edim7', roman:'iii', energy:0.5, texture:'PAD',
        chordObj:{root:'E',chordType:'dim7',chordNotes:['E','G','A#','C#'],diatonicNotes:['E','G','A#','C#'],fullName:'Edim7'},
        voicing:{ bass:52, tenor:55, alto:58, soprano:61 } }
    ], context:context },
    melody:{ notes:[] }, scaleTimeline:[], context:context,
    arc:{ bars:2, beatsPerBar:4, totalBeats:8,
      energyProfile:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5], sample:function(){ return 0.5; } },
    seed:0, input:'I iiidim7', traceId:'voiced-notes-test'
  };
}

check('a note name gives up its octave, and keeps everything else', function(){
  var g=freshSheet();
  var cases=[['C3','C'],['C#4','C#'],['Bb-1','Bb'],['G','G'],['A#','A#'],['',''],[null,'']];
  cases.forEach(function(c){
    var got=g._bareNoteName(c[0]);
    if(got!==c[1]) throw new Error(JSON.stringify(c[0])+' -> '+JSON.stringify(got)+', want '+JSON.stringify(c[1]));
  });
});

var phrase=null;
check('the bar summary of a phrase carries names, not pitches', function(){
  var g=freshSheet();
  phrase=window.buildPhraseFromGeneratedMusic(generatedDetail(), g);
  if(!phrase||!phrase.bars||phrase.bars.length!==2) throw new Error('no phrase built');
  g.setMusicalPhrase(phrase);
  var notes=[];
  (g.state.barChords||[]).forEach(function(c){ notes=notes.concat(c.chordNotes||[]); });
  if(!notes.length) throw new Error('no chord notes at all');
  print('       '+notes.join(' '));
  var octaved=notes.filter(function(n){ return /\d/.test(String(n)); });
  if(octaved.length) throw new Error('still voiced: '+octaved.join(' '));
});

check('and the voicing itself is still in the phrase, where it belongs', function(){
  var voiced=[];
  phrase.bars.forEach(function(bar){
    (bar.beats||[]).forEach(function(b){
      if(b.chordObj && Array.isArray(b.chordObj.diatonicNotes)) voiced=voiced.concat(b.chordObj.diatonicNotes);
    });
  });
  var withOctave=voiced.filter(function(n){ return /\d/.test(String(n)); });
  if(!withOctave.length) throw new Error('the phrase lost the octaves it was voiced in');
});

check('a chord handed in already voiced still lands on the staff', function(){
  var g=freshSheet();
  // Exactly what a phrase leaves behind, handed straight to the bar renderer.
  g.setBarChords([
    {root:'C',chordType:'maj7',chordNotes:['C4','E4','G4','B4'],fullName:'Cmaj7'},
    {root:'F',chordType:'maj7',chordNotes:['F4','A4','C5','E5'],fullName:'Fmaj7'}
  ]);
  var d=drawn(g);
  var staff=staffBand(g);
  print('       '+d.heads+' noteheads, '+d.ledgers+' ledger lines, y '+d.minY+'..'+d.maxY+
        '  (staff '+staff.top+'..'+staff.bottom+')');
  if(!d.heads) throw new Error('nothing drawn at all');
  // A note may sit a few ledger lines off the staff. It may not sit a page off.
  var slack=200;
  if(d.minY < staff.top - slack || d.maxY > staff.bottom + slack){
    throw new Error('noteheads at y '+d.minY+'..'+d.maxY+' against a staff at '+staff.top+'..'+staff.bottom);
  }
  if(d.ledgers > 4 * d.heads) throw new Error(d.ledgers+' ledger lines for '+d.heads+' noteheads');
});

check('the same chords by name, written differently, are not the same chords', function(){
  var g=freshSheet();
  g.setBarChords([{root:'C',chordType:'maj7',chordNotes:['C4','E4','G4','B4'],fullName:'Cmaj7'}]);
  g.setBarChords([{root:'C',chordType:'maj7',chordNotes:['C','E','G','B'],fullName:'Cmaj7'}]);
  var notes=(g.state.barChords[0]||{}).chordNotes||[];
  if(notes.join(' ')!=='C E G B') throw new Error('kept the stale spelling: '+notes.join(' '));
});

check('an identical update is still skipped', function(){
  var g=freshSheet();
  var one=[{root:'C',chordType:'maj7',chordNotes:['C','E','G','B'],fullName:'Cmaj7'}];
  g.setBarChords(one);
  var first=g.state.barChords[0];
  g.setBarChords([{root:'C',chordType:'maj7',chordNotes:['C','E','G','B'],fullName:'Cmaj7'}]);
  if(g.state.barChords[0]!==first) throw new Error('rebuilt state for an unchanged sequence');
});

check('the whole trip: a phrase, then the same chords committed by name', function(){
  var g=freshSheet();
  g.setMusicalPhrase(window.buildPhraseFromGeneratedMusic(generatedDetail(), g));
  var inPhrase=drawn(g);
  // The numbers box commits the same two chords on blur. That retires the
  // phrase — and the sheet then has only barChords to draw from.
  g.setBarChords([
    {root:'C',chordType:'maj7',chordNotes:['C','E','G','B'],fullName:'Cmaj7'},
    {root:'E',chordType:'dim7',chordNotes:['E','G','A#','C#'],fullName:'Edim7'}
  ]);
  if(g.state.musicalPhrase) throw new Error('the phrase was not retired');
  var after=drawn(g);
  var staff=staffBand(g);
  print('       in phrase: '+inPhrase.ledgers+' ledger lines; after the commit: '+after.ledgers);
  if(!after.heads) throw new Error('nothing drawn after the commit');
  if(after.ledgers > inPhrase.ledgers + 4 * after.heads){
    throw new Error(after.ledgers+' ledger lines after the commit, against '+inPhrase.ledgers+' before it');
  }
  var slack=200;
  if(after.minY < staff.top - slack || after.maxY > staff.bottom + slack){
    throw new Error('noteheads at y '+after.minY+'..'+after.maxY+' against a staff at '+staff.top+'..'+staff.bottom);
  }
});

print(failures? ('FAILURES: '+failures) : 'chords are drawn where they were voiced, once');
if (failures) { throw new Error(failures+' voiced-note check(s) failed'); }
