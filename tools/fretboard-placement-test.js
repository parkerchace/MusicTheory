// A PLAYED PITCH LIGHTS WHERE A HAND WOULD PLAY IT.
//
// GuitarFretboardVisualizer.placeOnNeck: the exact octave, near where the
// hand already is, one note per string; a chord as one hand shape, or not at
// all (the caller then shows its pitch classes instead).
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var module=undefined;

load('guitar-fretboard-visualizer.js');
var GF = window.GuitarFretboardVisualizer;

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}

// Standard tuning, string 0 = low E (MIDI 40) ... 5 = high E (64), frets 0..22.
var OPEN = [40, 45, 50, 55, 59, 64];
var cells = [];
OPEN.forEach(function(m, s){ for (var f = 0; f <= 22; f++) cells.push({ midi: m + f, fret: f, string: s }); });
function show(p){ return p ? p.map(function(c){ return c.midi+'@s'+c.string+'f'+c.fret; }).join(' ') : 'null'; }

say('ONE NOTE');
var c4 = GF.placeOnNeck([60], cells, 5);
want('middle C near the 5th fret is played at the 5th fret of the G string', c4 && c4[0].string === 3 && c4[0].fret === 5, show(c4));
var c4high = GF.placeOnNeck([60], cells, 12);
want('...and near the 12th fret, further up a lower string', c4high && Math.abs(c4high[0].fret - 12) <= 3 && c4high[0].midi === 60, show(c4high));
want('the exact octave is lit, never another C', c4[0].midi === 60);
var low = GF.placeOnNeck([40], cells, 9);
want('the lowest note can only be the open low E', low && low[0].string === 0 && low[0].fret === 0, show(low));
want('a pitch below the guitar is not placed at all', GF.placeOnNeck([30], cells, 5) === null);
var avoid = GF.placeOnNeck([60], cells, 5, { avoidStrings: [3] });
want('a string already sounding another held note is avoided', avoid && avoid[0].string !== 3 && avoid[0].midi === 60, show(avoid));

say('');
say('A CHORD, AS ONE HAND SHAPE');
function oneShape(p){
  var strings = {}, frets = p.map(function(c){ return c.fret; }).filter(function(f){ return f > 0; });
  p.forEach(function(c){ strings[c.string] = 1; });
  var span = frets.length ? Math.max.apply(null, frets) - Math.min.apply(null, frets) : 0;
  return Object.keys(strings).length === p.length && span <= 4;
}
var cmaj = GF.placeOnNeck([48, 52, 55, 60, 64], cells, 3, { span: 4 });   // open C shape exists
want('C major (C3 E3 G3 C4 E4) fits one position', !!cmaj && oneShape(cmaj), show(cmaj));
want('...with every pitch in its exact octave', !!cmaj && cmaj.map(function(c){ return c.midi; }).sort().join() === [48,52,55,60,64].sort().join());
var g7 = GF.placeOnNeck([43, 47, 50, 55, 59, 65], cells, 3, { span: 4 });   // the open G7 shape
want('G7 as a guitarist plays it (G B D G B F) fits, open strings and all', !!g7 && oneShape(g7), show(g7));
var closeG7 = GF.placeOnNeck([43, 47, 50, 53], cells, 3, { span: 4 });
want('a close-position G7 (G2 B2 D3 F3) cannot be fingered in one place: not placed', closeG7 === null, show(closeG7));
var high = GF.placeOnNeck([67, 71, 74, 77], cells, 12, { span: 4 });
want('a chord near the hand at the 12th fret is placed up there', !!high && oneShape(high) &&
     high.filter(function(c){ return c.fret > 0; }).every(function(c){ return c.fret >= 6; }), show(high));
var cluster = GF.placeOnNeck([60, 61, 62, 63, 64, 65, 66], cells, 5, { span: 4 });
want('seven notes cannot be held on six strings: not placed', cluster === null);
var wide = GF.placeOnNeck([41, 77], cells, 5, { span: 4 });   // F2 is fret 1 only; F5 is fret 13+
want('a span no hand can stretch is not placed (the caller shows pitch classes instead)', wide === null, show(wide));
var openPlusHigh = GF.placeOnNeck([40, 76], cells, 10, { span: 4 });
want('an open string under a high fretted note is fine: the open string needs no hand', !!openPlusHigh, show(openPlusHigh));

say('');
say(failures? ('FAILURES: '+failures) : 'every pitch lands where a hand would play it, or honestly nowhere');
print(out.join('\n'));
if(failures) throw new Error('fretboard-placement-test: '+failures+' failure(s)');
