// The lecture's scales have to read the way the lecture writes them.
//
// "Finding Melodies in Scales" is the basis of the Intermediate and Advanced
// lessons, and its slides spell every collection from the tonic by degree:
// C bebop major is C D E F G A♭ A B, not … G G♯ A …, and walking that scale
// in skipped notes gives a sixth chord and a diminished seventh, alternating —
// C6 · D°7 · C6/E · F°7 · C6/G · A♭°7 · C6/A · B°7. Before this, every
// collection that is not seven notes long was spelled by key signature, and C
// has none, so sharps won: C blues read C D♯ F F♯ G A♯ and its last chord
// was "A♯6". The chord on the third degree, E–G–A–C, was named from its bottom
// note as "Em(add11, ♯5)" — true of the notes, useless to a reader.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
this.addEventListener=function(){};this.dispatchEvent=function(){return true;};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js'].forEach(load);

var failures=0;
function want(name, got, expected){
  var ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  print((ok ? '  OK   ' : '  FAIL ') + name + (ok ? '' : '\n         got      ' + JSON.stringify(got) + '\n         expected ' + JSON.stringify(expected)));
}

print('=== lecture scales and their chords ===');
var mt = new MusicTheoryEngine();

want('C bebop major is spelled by degree (slide 11)', mt.getScaleNotes('C','bebop_major'), ['C','D','E','F','G','Ab','A','B']);
want('C bebop minor keeps E♭ and A♭ (slide 20)', mt.getScaleNotes('C','bebop_minor'), ['C','D','Eb','F','G','Ab','A','B']);
want('half–whole octatonic (slide 17)', mt.getScaleNotes('C','octatonic'), ['C','Db','Eb','E','F#','G','A','Bb']);
want('whole–half octatonic puts G♯ under the A (slide 17)', mt.getScaleNotes('C','diminished'), ['C','D','Eb','F','F#','G#','A','B']);
want('C minor pentatonic uses flats', mt.getScaleNotes('C','minor_pentatonic'), ['C','Eb','F','G','Bb']);
want('G bebop major: the added note is E♭', mt.getScaleNotes('G','bebop_major'), ['G','A','B','C','D','Eb','E','F#']);
want('seven-note scales are untouched', mt.getScaleNotes('C','dorian'), ['C','D','Eb','F','G','A','Bb']);

function strip(key, scale){
  var n = mt.getScaleNotes(key, scale).length, out = [];
  for (var d = 1; d <= n; d++) {
    var c = mt.getDiatonicChord(d, key, scale);
    out.push(c.inversionName || c.fullName);
  }
  return out;
}
want('bebop major alternates C6 and °7 (slide 12)', strip('C','bebop_major'),
     ['C6','Ddim7','C6/E','Fdim7','C6/G','Abdim7','C6/A','Bdim7']);
want('bebop minor alternates Cm6 and °7 (slide 20)', strip('C','bebop_minor'),
     ['Cm6','Ddim7','Cm6/Eb','Fdim7','Cm6/G','Abdim7','Cm6/A','Bdim7']);
want('an unnamed stack is read as an inversion', mt.nameAsInversion(['E','G','A','C']), 'C6/E');
want('a named stack keeps its own name', mt.getDiatonicChord(6, 'C', 'major').inversionName, null);

if (failures) { print('FAILURES: ' + failures); throw new Error('scale-spelling-chords-test: ' + failures + ' failure(s)'); }
print('the lecture\'s scales read the way the lecture writes them');
