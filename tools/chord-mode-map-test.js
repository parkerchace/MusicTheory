// CHORD MODE PLAYS THE CHORDS OF THE SCALE YOU ARE IN.
//
// White keys are the scale's degrees (bottom row triads, top row sevenths),
// built by the engine from whatever scale is current — major, a mode, a
// pentatonic, an octatonic. A black key is the secondary dominant of the
// chord on its right, spelled by letter, and a key whose target cannot be
// tonicized says so rather than playing something arbitrary.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var setTimeout=function(){return 0;};
var console={log:function(){},warn:function(){},error:function(){}};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'qwerty-keys.js','qwerty-chords.js'].forEach(load);

var mt = new MusicTheoryEngine();
var C = window.QwertyChords.core, K = window.QwertyKeys.core;

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}
function ctx(key, scale){
  return { scaleNotes: mt.getScaleNotes(key, scale), positionOf: K.positionOf,
           build: function(d, size){ return mt.buildScaleChord(key, scale, d, size).notes; } };
}
function play(code, key, scale){ return C.chordForKey(code, ctx(key, scale)); }
function desc(c){ return c ? (c.none ? 'none: '+c.reason : c.numeral+' '+c.symbol+' ['+c.notes.join(' ')+']') : 'null'; }

say('C MAJOR, BOTTOM ROW: THE TRIADS');
var row = ['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM'].map(function(k){ return play(k,'C','major'); });
want('Z X C V B N M are I ii iii IV V vi vii°', row.map(function(c){ return c.numeral; }).join(' ') === 'I ii iii IV V vi vii°', row.map(function(c){ return c.numeral; }).join(' '));
want('...named C Dm Em F G Am Bdim', row.map(function(c){ return c.symbol; }).join(' ') === 'C Dm Em F G Am Bdim', row.map(function(c){ return c.symbol; }).join(' '));
want('each is three notes from the scale', row.every(function(c){ return c.notes.length === 3; }));

say('');
say('C MAJOR, TOP ROW: THE SEVENTHS');
var top = ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU'].map(function(k){ return play(k,'C','major'); });
want('Q W E R T Y U are Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7', top.map(function(c){ return c.numeral; }).join(' ') === 'Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7', top.map(function(c){ return c.numeral; }).join(' '));
want('...and the dominant is named G7, not Gmaj7', top[4].symbol === 'G7', top[4].symbol);
want('...and the leading-tone chord is half-diminished', top[6].symbol === 'Bm7b5', top[6].symbol);

say('');
say('THE BLACK KEYS: WHAT LEADS INTO THE CHORD ON THEIR RIGHT');
want('S (before ii) is V/ii: A major', desc(play('KeyS','C','major')) === 'V/ii A [A C# E]', desc(play('KeyS','C','major')));
want('D (before iii) is V/iii: B major, spelled with D#', desc(play('KeyD','C','major')) === 'V/iii B [B D# F#]', desc(play('KeyD','C','major')));
want('G (before V) is V/V: D major', desc(play('KeyG','C','major')) === 'V/V D [D F# A]', desc(play('KeyG','C','major')));
want('H (before vi) is V/vi: E major', desc(play('KeyH','C','major')) === 'V/vi E [E G# B]', desc(play('KeyH','C','major')));
want('2 (top row, before ii) is V7/ii: A7', desc(play('Digit2','C','major')) === 'V7/ii A7 [A C# E G]', desc(play('Digit2','C','major')));
var j = play('KeyJ','C','major');
want('J (before vii°) plays nothing, and says why', !!j && j.none && /vii°/.test(j.reason), desc(j));
want('in Eb major, V/ii is C major (C E G) — spelled by letter', desc(play('KeyS','Eb','major')) === 'V/ii C [C E G]', desc(play('KeyS','Eb','major')));
want('in Ab major, V/iii is G major (G B D)', desc(play('KeyD','Ab','major')) === 'V/iii G [G B D]', desc(play('KeyD','Ab','major')));
want('in F# major, V7/ii is D#7 with an F double-sharp', desc(play('Digit2','F#','major')) === 'V7/ii D#7 [D# F## A# C#]', desc(play('Digit2','F#','major')));

say('');
say('ANY SCALE');
var dor = ['KeyZ','KeyV','KeyR'].map(function(k){ return play(k,'D','dorian'); });
want('D dorian: Z is i (Dm), V is IV (G), R is IV7 (G7)', dor.map(desc).join(' | ') === 'i Dm [D F A] | IV G [G B D] | IV7 G7 [G B D F]', dor.map(desc).join(' | '));
var pent = mt.getScaleNotes('C','major_pentatonic');
want('the major pentatonic has five degrees', pent.length === 5, pent.join(' '));
var p6 = play('KeyN','C','major_pentatonic');
want('...so the sixth white key wraps to degree 1', p6 && p6.degree === 1, desc(p6));
var eight = Object.keys(mt.scales).filter(function(id){ var n = mt.getScaleNotes('C', id); return n && n.length === 8; })[0];
var oct = play('Comma','C', eight);
want('an eight-note scale runs on to the comma: degree 8', !!eight && oct && oct.degree === 8, eight+': '+desc(oct));

say('');
say('NAMES, SPELLING, MOVEMENT');
want('a fifth above F# is C#; above Bb is F; above B is F#', C.spellAbove('F#',4,7)==='C#' && C.spellAbove('Bb',4,7)==='F' && C.spellAbove('B',4,7)==='F#');
want('a major third above E is G#, above Ab is C', C.spellAbove('E',2,4)==='G#' && C.spellAbove('Ab',2,4)==='C');
want('dominantOf(F#, seventh) is C# E# G# B', C.dominantOf('F#', true).join(' ') === 'C# E# G# B');
want('a diminished seventh is named dim7 and numbered °7', C.chordSymbol(['B','D','F','Ab'])==='Bdim7' && C.numeral(7,['B','D','F','Ab'])==='vii°7');
want('movement sums each voice\'s nearest step', C.movement([60,64,67],[59,62,67]) === 3);
want('the first chord has no movement to report', C.movement(null,[60,64,67]) === null);
want('a key that is not on the map has no chord', play('KeyA','C','major') === null);

say('');
say(failures? ('FAILURES: '+failures) : 'every key plays a chord of the scale, or the chord that leads into one');
print(out.join('\n'));
if(failures) throw new Error('chord-mode-map-test: '+failures+' failure(s)');
