// What the drawn contour stands for — piece, phrase, melody or motif — and
// that each reading hands the generator something different and sensible.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var localStorage={_:{},getItem:function(k){return this._[k]||null;},setItem:function(k,v){this._[k]=String(v);}};
var __e=eval;function load(f){__e(readFile(f));}
load('contour-meaning.js');
var CM=window.ContourMeaning;

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(c,m){ if(!c) throw new Error(m); }
function curve(fn){ var out=[]; for(var i=0;i<160;i++) out.push(fn(i/159)); return out; }
function sampler(vals){ return function(t){ return vals[Math.round(Math.max(0,Math.min(1,t))*(vals.length-1))]; }; }

print('=== what the contour stands for ===');

check('four meanings, each explained, unknown ones fall back to the whole piece', function(){
  assert(CM.MEANINGS.length===4, 'expected 4');
  CM.MEANINGS.forEach(function(m){ assert(m.label && m.title && m.axis && m.about, m.id+' is unexplained'); });
  assert(CM.normalize('nonsense')==='piece', 'no fallback');
  assert(CM.set('motif')==='motif' && CM.current()==='motif' && localStorage.getItem('contourMeaning')==='motif', 'not saved');
});

check('a motif is the line\'s turns: up-down-up gives four notes, rising then falling then rising', function(){
  var zig=curve(function(t){ return t<1/3 ? 0.2+t*1.8 : t<2/3 ? 0.8-(t-1/3)*1.5 : 0.3+(t-2/3)*1.5; });
  var tp=CM.turningPoints(zig);
  assert(tp.indices.length===4, 'turns: '+tp.indices);
  var m=CM.motifFromCurve(zig);
  assert(m.length===3 && m[0]>0 && m[1]<0 && m[2]>0, 'motif '+m);
});

check('small wobbles are not turns', function(){
  var rise=curve(function(t){ return 0.2+0.6*t+0.02*Math.sin(t*60); });
  var m=CM.motifFromCurve(rise);
  assert(m.length>=2 && m.every(function(d){ return d>=0; }), 'a wobbly rise came out as '+m);
});

check('a scribble is thinned to six notes and stays singable', function(){
  var scr=curve(function(t){ return 0.5+0.45*Math.sin(t*Math.PI*14); });
  var m=CM.motifFromCurve(scr);
  assert(m.length<=5, 'too many notes: '+(m.length+1));
  assert(m.every(function(d){ return Math.abs(d)<=9; }), 'a step wider than a sixth: '+m);
});

check('a flat line is no motif', function(){
  assert(CM.motifFromCurve(curve(function(){ return 0.5; })).length===0, 'flat line made a motif');
});

check('phrase: every section plays the whole line across its own bars, including one added later', function(){
  var rise=curve(function(t){ return t; });
  var form={ bars:12, sections:[{startBar:0,bars:4},{startBar:4,bars:2},{startBar:6,bars:6}] };
  var arc={bars:12};
  CM.apply(arc,'phrase',sampler(rise),{ formOf:function(){ return form; } });
  [[0,4],[4,2],[6,6]].forEach(function(s){
    var lo=arc.sample((s[0]+0.01)/12), hi=arc.sample((s[0]+s[1]-0.01)/12);
    assert(lo<0.1 && hi>0.9, 'section at '+s[0]+' runs '+lo.toFixed(2)+'..'+hi.toFixed(2));
  });
  form={ bars:14, sections:[{startBar:0,bars:4},{startBar:4,bars:2},{startBar:6,bars:6},{startBar:12,bars:2}] };
  assert(arc.sample(12.05/14)<0.1, 'a section added later does not start the phrase again');
});

check('melody: the line becomes pitch, energy follows only gently', function(){
  var rise=curve(function(t){ return t; });
  var arc={bars:8};
  CM.apply(arc,'melody',sampler(rise),{});
  assert(typeof arc.pitchSample==='function' && arc.pitchSample(1)>0.95 && arc.pitchSample(0)<0.05, 'no pitch line');
  assert(arc.sample(1)-arc.sample(0)<0.5, 'energy follows the pitch line as strongly as the line itself');
});

check('motif: the arc gets its own arch and the motif rides along to the melody', function(){
  var zig=curve(function(t){ return t<0.5 ? 0.2+t : 0.7-(t-0.5); });
  var arc={bars:8};
  CM.apply(arc,'motif',sampler(zig),{ values:zig });
  assert(arc.motif.length>=2, 'no motif');
  assert(Math.abs(arc.sample(0.618)-0.8)<0.01 && arc.sample(0)<arc.sample(0.5), 'arc is not the golden arch');
  var ex=CM.melodyExtra(arc,{ motif:[1,2], other:1 });
  assert(ex.motif.join()===arc.motif.join() && ex.other===1, 'drawn motif does not win over the method\'s');
  assert(CM.melodyExtra({},{ motif:[1,2] }).motif.join()==='1,2', 'method motif dropped when none drawn');
});

check('piece: the line is the arc, nothing else attached', function(){
  var arc={bars:8, pitchSample:function(){}, motif:[1]};
  var f=sampler(curve(function(t){ return t; }));
  CM.apply(arc,'piece',f,{});
  assert(arc.sample===f && !arc.pitchSample && !arc.motif, 'leftovers from another meaning');
});

check('phrase: the tune follows the shape inside each section, not one stretched curve', function(){
  var rise=curve(function(t){ return t; });
  var form={ bars:8, sections:[{startBar:0,bars:4},{startBar:4,bars:4}] };
  var arc={bars:8};
  CM.apply(arc,'phrase',sampler(rise),{ formOf:function(){ return form; } });
  assert(typeof arc.pitchSample==='function', 'no pitch line in phrase mode');
  assert(arc.pitchSample(3.9/8)>0.9 && arc.pitchSample(4.1/8)<0.1, 'pitch does not restart at the second phrase');
});

check('a drawn motif is written into the opening of every section, in the scale', function(){
  var C=[0,2,4,5,7,9,11];
  function n(bar,beat,name){ return {bar:bar,beat:beat,noteName:name}; }
  var notes=[n(0,0,'C5'),n(0,1,'C5'),n(0,2,'C5'),n(0,3,'C5'),n(1,0,'D5'),
             n(4,0,'E5'),n(4,1,'E5'),{bar:4,beat:2,isRest:true},n(4,3,'E5'),n(5,0,'E5')];
  var secs=[{startBar:0,endBar:3},{startBar:4,endBar:7}];
  var k=CM.stampMotif(notes,[4,3,-5],secs,function(){ return C; });
  assert(k===2, 'stamped '+k+' sections');
  var a=notes.slice(0,4).map(function(x){ return x.noteName; }).join(' ');
  assert(a==='C5 E5 G5 D5', 'first section reads '+a);
  var sec=[notes[5],notes[6],notes[8],notes[9]];
  var b=sec.map(function(x){ return x.noteName; }).join(' ');
  var m=sec.map(function(x){ return CM.midiOf(x.noteName); });
  assert(m[1]>m[0] && m[2]>m[1] && m[3]<m[2], 'second section lost the shape: '+b);
  assert(m.every(function(v){ return C.indexOf(v%12)>=0; }), 'second section left the scale: '+b);
  assert(notes[7].isRest && !notes[7].noteName, 'a rest was given a pitch');
  assert(notes[4].noteName==='D5', 'a note past the motif was changed');
});

print(failures?('\n'+failures+' FAILED'):'\nall passed');
