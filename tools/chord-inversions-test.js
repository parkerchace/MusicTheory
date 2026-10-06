// THE INVERSION BUTTON AND THE INVERSION WALK (chord mode on the typing keyboard).
//
// A pinned inversion puts the asked-for chord tone in the bass, near home or
// nearest the last chord. The walk wanders up and down through the inversions
// of the voicing style: the same chord again steps to another inversion, a
// new chord goes to a nearby voicing (never a leap when a smooth move was
// there), and the walk stays balanced around home instead of drifting off.
// Names follow the inversion: figured bass on the numeral, the bass under a
// slash on the symbol.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var setTimeout=function(){return 0;};
var console={log:function(){},warn:function(){},error:function(){}};
var __e=eval;function load(f){__e(readFile(f));}
['qwerty-keys.js','qwerty-chords.js'].forEach(load);
var C = window.QwertyChords.core;

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}
function seeded(seed){ var s = seed >>> 0; return function(){ s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function mean(m){ return m.reduce(function(a,b){return a+b;},0)/m.length; }

// close position from C4 upward, one shape per rotation (what voiceChordInversions gives for 'close')
function closeShapes(notes){
  var pcs = notes.map(C.pcOf);
  return pcs.map(function(_, r){
    var rot = pcs.slice(r).concat(pcs.slice(0, r)), prev = 59;
    return rot.map(function(pc){ var m = prev - ((prev - pc) % 12 + 12) % 12; while (m <= prev) m += 12; prev = m; return m; });
  });
}
// drop 2 of each close rotation (the drop-2 family)
function drop2Shapes(notes){
  return closeShapes(notes).map(function(s){ var c = s.slice(); c[c.length-2] -= 12; return c.sort(function(a,b){return a-b;}); });
}

var CMAJ = ['C','E','G'], FMAJ = ['F','A','C'], AMIN = ['A','C','E'], GMAJ = ['G','B','D'];
var G7 = ['G','B','D','F'], CMAJ7 = ['C','E','G','B'];
var HOME = 64;

say('NAMES FOLLOW THE BASS');
want('I in first inversion is I6', C.figuredNumeral('I', 1, 3) === 'I6', C.figuredNumeral('I', 1, 3));
want('IV in second inversion is IV6/4', C.figuredNumeral('IV', 2, 3) === 'IV6/4', C.figuredNumeral('IV', 2, 3));
want('V7: 6/5, 4/3, 4/2', ['V6/5','V4/3','V4/2'].join() === [1,2,3].map(function(k){ return C.figuredNumeral('V7', k, 4); }).join(),
     [1,2,3].map(function(k){ return C.figuredNumeral('V7', k, 4); }).join(' '));
want('Imaj7 in first inversion is IM6/5', C.figuredNumeral('Imaj7', 1, 4) === 'IM6/5', C.figuredNumeral('Imaj7', 1, 4));
want('viiø7 in third inversion is viiø4/2', C.figuredNumeral('viiø7', 3, 4) === 'viiø4/2', C.figuredNumeral('viiø7', 3, 4));
want('V7/ii in first inversion is V6/5/ii', C.figuredNumeral('V7/ii', 1, 4) === 'V6/5/ii', C.figuredNumeral('V7/ii', 1, 4));
want('root position keeps its name', C.figuredNumeral('ii7', 0, 4) === 'ii7' && C.figuredNumeral('ii', 0, 3) === 'ii');
want('C over E is C/E, G7 over F is G7/F', C.slashSymbol('C', CMAJ, 1) === 'C/E' && C.slashSymbol('G7', G7, 3) === 'G7/F',
     C.slashSymbol('C', CMAJ, 1) + ' ' + C.slashSymbol('G7', G7, 3));
want('the bass tone is read from the lowest note', C.bassRole([64, 67, 72], CMAJ) === 1 && C.bassRole([55, 60, 64], CMAJ) === 2);

say('');
say('A PINNED INVERSION');
var shapes = closeShapes(CMAJ);
var pins = [0, 1, 2].map(function(k){ return C.pickInversion(shapes, CMAJ, k, null, { home: HOME }); });
want('root, 1st and 2nd put C, E and G in the bass', pins.map(function(p){ return p.role; }).join() === '0,1,2',
     pins.map(function(p){ return p.midi.join(' '); }).join(' | '));
want('...each within a fifth of home, so A changes the bass without leaping registers',
     pins.every(function(p){ return Math.abs(p.centroid - HOME) <= 7; }), pins.map(function(p){ return p.centroid.toFixed(1); }).join(' '));
var t3 = C.pickInversion(shapes, CMAJ, 3, null, { home: HOME });
want('a triad asked for a third inversion gets its second', t3.role === 2, t3.midi.join(' '));
var prev = [60, 64, 67];
var f1 = C.pickInversion(closeShapes(FMAJ), FMAJ, 1, prev, { home: HOME });
want('with voice leading, F in first inversion lands nearest the C chord (A3 C4 F4)', f1.midi.join() === '57,60,65', f1.midi.join(' '));
var g7 = C.pickInversion(drop2Shapes(G7), G7, 3, null, { home: HOME });
want('G7 drop 2 pinned to third inversion has F in the bass', g7.role === 3, g7.midi.join(' '));

say('');
say('THE WALK: THE SAME CHORD AGAIN');
var rand = seeded(7), st = null, last = null, picks = [];
for (var i = 0; i < 60; i++) {
  var w = C.walkInversion(shapes, CMAJ, last, st, { home: HOME }, rand);
  picks.push(w.pick); st = w.state; last = w.pick.midi;
}
var moves = picks.slice(1).map(function(p, i){ return p.centroid - picks[i].centroid; });
want('every repeat moves to another voicing', moves.every(function(d){ return d !== 0; }));
var ups = moves.filter(function(d){ return d > 0; }).length, downs = moves.length - ups;
want('it goes up and down (both ways, neither more than 2/3 of the time)', ups > moves.length / 3 && downs > moves.length / 3, ups + ' up, ' + downs + ' down');
var turns = moves.slice(1).filter(function(d, i){ return (d > 0) !== (moves[i] > 0); }).length;
want('it runs a few steps before it turns (not a coin toss each step)', turns >= 6 && turns <= moves.length * 0.6, turns + ' turns in ' + moves.length);
want('it stays within an octave of home', picks.every(function(p){ return Math.abs(p.centroid - HOME) <= 12; }),
     Math.min.apply(null, picks.map(function(p){ return p.centroid; })).toFixed(1) + '..' + Math.max.apply(null, picks.map(function(p){ return p.centroid; })).toFixed(1));
var roleCount = [0, 0, 0];
picks.forEach(function(p){ roleCount[p.role]++; });
want('all three inversions come up', roleCount.every(function(n){ return n >= 8; }), roleCount.join('/'));
var steps = picks.slice(1).map(function(p, i){ return C.vlDistance(picks[i].midi, p.midi); });
want('a step is an inversion or two away (≤ 24 semitones of voice motion)', steps.every(function(d){ return d <= 24; }), 'max ' + Math.max.apply(null, steps));

say('');
say('THE WALK: CHANGING CHORDS');
var prog = [CMAJ, AMIN, FMAJ, GMAJ], bad = [], worst = 0, total = 0, cents = [], roles = [0, 0, 0];
rand = seeded(11); st = null; last = null;
for (var j = 0; j < 200; j++) {
  var ch = prog[j % 4];
  var sh = (j % 8 < 4) ? closeShapes(ch) : drop2Shapes(ch);   // the style may change under it (an auto logic)
  var wk = C.walkInversion(sh, ch, last, st, { home: HOME }, rand);
  if (last) {
    var lad = C.inversionLadder(sh, ch, { home: HOME, span: 12 });
    var best = Math.min.apply(null, lad.map(function(e){ return C.vlDistance(last, e.midi); }));
    var d = C.vlDistance(last, wk.pick.midi);
    if (d > best + 4 + ch.length) bad.push(j + ':' + d + '>' + best);
    worst = Math.max(worst, d - best); total += d;
  }
  cents.push(wk.pick.centroid); roles[wk.pick.role]++;
  st = wk.state; last = wk.pick.midi;
}
want('each new chord is within a reasonable distance of the smoothest move', !bad.length, bad.length ? bad.slice(0, 5).join(' ') : 'worst +' + worst + ' st over the smoothest');
want('...and the average move is small (≤ 7 semitones of voice motion)', total / 199 <= 7, (total / 199).toFixed(2));
var avg = mean(cents);
want('the walk is balanced around home (average within 4 semitones)', Math.abs(avg - HOME) <= 4, avg.toFixed(1));
var hi = cents.filter(function(c){ return c > HOME + 3; }).length, lo = cents.filter(function(c){ return c < HOME - 3; }).length;
want('...and visits both sides of it', hi >= 10 && lo >= 10, lo + ' below, ' + hi + ' above');
want('the inversions are balanced: none more than half the chords, each at least a sixth',
     roles.every(function(n){ return n <= 100 && n >= 33; }), roles.join('/'));

say('');
say('A NEW CHORD AFTER A REPEAT WALK LEADS FROM WHERE IT LEFT OFF');
rand = seeded(3); st = null; last = null;
for (var k = 0; k < 5; k++) { var r5 = C.walkInversion(shapes, CMAJ, last, st, { home: HOME }, rand); st = r5.state; last = r5.pick.midi; }
var fromHere = last.slice();
var nx = C.walkInversion(closeShapes(GMAJ), GMAJ, fromHere, st, { home: HOME }, rand);
var ladN = C.inversionLadder(closeShapes(GMAJ), GMAJ, { home: HOME });
var smooth = Math.min.apply(null, ladN.map(function(e){ return C.vlDistance(fromHere, e.midi); }));
var walked = mean(fromHere);
want('G follows the walked C within a reasonable distance of the smoothest move', !nx.same &&
     C.vlDistance(fromHere, nx.pick.midi) <= smooth + 4 + GMAJ.length,
     fromHere.join(' ') + ' -> ' + nx.pick.midi.join(' ') + ', ' + C.vlDistance(fromHere, nx.pick.midi) + ' st (smoothest ' + smooth + ')');
want('...staying where the walk left off rather than going back home',
     Math.abs(nx.pick.centroid - walked) < Math.abs(HOME - walked), 'C at ' + walked.toFixed(1) + ', G at ' + nx.pick.centroid.toFixed(1) + ', home ' + HOME);
var ladG = C.inversionLadder(closeShapes(GMAJ), GMAJ, { home: HOME });
want('the ladder spans the inversions in register order', ladG.length >= 5 &&
     ladG.every(function(e, i){ return !i || e.centroid >= ladG[i - 1].centroid; }), ladG.map(function(e){ return e.midi[0]; }).join(' '));

say('');
say(failures ? failures + ' FAILED' : 'ALL PASSED');
print(out.join('\n'));
