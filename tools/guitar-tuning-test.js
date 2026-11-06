// A TUNING IS ONE SETTING, AND A TYPED ONE IS READ THE WAY A GUITARIST WRITES IT.
//
// guitar-tuning.js: the presets land on the pitches those tunings really are,
// typed text reads with or without spaces, octaves or capitals, and text that
// is not six notes changes nothing.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};

load('guitar-tuning.js');
var GT = window.GuitarTuning;

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}
function midiOf(t){ var p = GT.parse(t); return p ? p.midi.join(' ') : 'null'; }

say('PRESETS, AS THEY ARE REALLY STRUNG');
var REAL = {
  'standard':   '40 45 50 55 59 64',   // E2 A2 D3 G3 B3 E4
  'e-flat':     '39 44 49 54 58 63',   // Eb2 Ab2 Db3 Gb3 Bb3 Eb4
  'd-standard': '38 43 48 53 57 62',   // D2 G2 C3 F3 A3 D4
  'drop-d':     '38 45 50 55 59 64',   // D2 A2 D3 G3 B3 E4
  'drop-c':     '36 43 48 53 57 62',   // C2 G2 C3 F3 A3 D4
  'dadgad':     '38 45 50 55 57 62',   // D2 A2 D3 G3 A3 D4
  'open-g':     '38 43 50 55 59 62',   // D2 G2 D3 G3 B3 D4
  'open-d':     '38 45 50 54 57 62',   // D2 A2 D3 F#3 A3 D4
  'open-e':     '40 47 52 56 59 64',   // E2 B2 E3 G#3 B3 E4
  'open-a':     '40 45 52 57 61 64',   // E2 A2 E3 A3 C#4 E4
  'open-c':     '36 43 48 55 60 64',   // C2 G2 C3 G3 C4 E4
  'fourths':    '40 45 50 55 60 65'    // E2 A2 D3 G3 C4 F4
};
GT.PRESETS.forEach(function(p){ want(p.label, midiOf(p.notes) === REAL[p.id], midiOf(p.notes)); });
want('every preset is checked here', GT.PRESETS.length === Object.keys(REAL).length);

say('');
say('TYPED');
var DADGAD = '38 45 50 55 57 62';
want('spaces', midiOf('D A D G A D') === DADGAD);
want('no spaces', midiOf('DADGAD') === DADGAD);
want('lower case', midiOf('dadgad') === DADGAD);
want('commas and dashes', midiOf('D, A, D-G/A|D') === DADGAD);
want('octaves are honoured', midiOf('D2 A2 D3 G3 A3 D4') === DADGAD);
want('lower-case b is the note B where a flat would leave five notes', midiOf('eadgbe') === REAL['standard'], midiOf('eadgbe'));
want('...and a flat where six notes need it', midiOf('ebabdbgbbbeb') === REAL['e-flat'], midiOf('ebabdbgbbbeb'));
want('capital B is never a flat', midiOf('EADGBE') === REAL['standard']);
want('unicode accidentals', midiOf('E♭ A♭ D♭ G♭ B♭ E♭') === REAL['e-flat']);
want('sharps and flats spell the names as typed', GT.parse('C# F# B E G# C#').names.join(' ') === 'C# F# B E G# C#');
want('an octave written re-entrantly stays re-entrant (Nashville high strings)', midiOf('E3 A3 D4 G4 B3 E4') === '52 57 62 67 59 64');
want('without octaves, a string is never below the one before it', midiOf('C G D A E B') === '36 43 50 57 64 71', midiOf('C G D A E B'));

say('');
say('NOT A TUNING');
['', 'hello', 'E A D G B', 'E A D G B E A', 'H A D G B E', 'E9 A D G B E'].forEach(function(t){
  want(JSON.stringify(t), GT.parse(t) === null);
});

say('');
say('THE SHARED SETTING');
want('starts on standard', GT.current().id === 'standard' && GT.midi().join(' ') === REAL['standard']);
want('a preset by id', GT.select('drop-d') && GT.midi().join(' ') === REAL['drop-d']);
want('an unknown id changes nothing', !GT.select('nope') && GT.current().id === 'drop-d');
want('typed text', GT.type('C G D G B D') && GT.current().id === 'custom' && GT.midi()[0] === 36);
want('typed nonsense changes nothing', !GT.type('nonsense') && GT.midi()[0] === 36);
want('names come spelled for code and for reading', GT.select('e-flat') && GT.current().names[0] === 'Eb' && GT.current().display[0] === 'E♭');
var m = GT.midi(); m[0] = 0;
want('midi() hands out a copy', GT.midi()[0] === 39);

print(out.join('\n'));
print('');
print(failures ? (failures+' FAILED') : 'all passed');
