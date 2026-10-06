// THE KEY IS THE MELODY; THE CHORD GOES UNDER IT.
//
// Melody mode harmonizes each note with a chord of the scale that holds it,
// chosen the way an accompanist would: the melody settled on the chord's root
// or third, the chords moving tonic -> predominant -> dominant -> tonic, the
// bass moving by fourths and fifths, a chord held while the melody keeps to
// its notes. A note outside the key gets the chord that leads somewhere
// through it. The voicing goes under the melody — unless the melody is too
// low for a chord to fit beneath it.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var setTimeout=function(){return 0;};
var console={log:function(){},warn:function(){},error:function(){}};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'qwerty-keys.js','qwerty-chords.js'].forEach(load);

var mt = new MusicTheoryEngine();
var C = window.QwertyChords.core;

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}
function ctx(key, scale, parallel){
  var c = { scaleNotes: mt.getScaleNotes(key, scale), tonic: key,
            build: function(d, size){ return mt.buildScaleChord(key, scale, d, size).notes; } };
  if (parallel) c.parallel = { build: function(d, size){ return mt.buildScaleChord(key, parallel, d, size).notes; } };
  return c;
}
// play a melody through the harmonizer, carrying what is sounding
function play(melody, key, scale, opts, parallel){
  var cx = ctx(key, scale, parallel), prev = null, got = [];
  melody.forEach(function(m){
    var h = C.harmonizeNote(m, cx, prev, opts || {});
    got.push(h);
    if (!h.none) prev = { chord: h.chord };
  });
  return got;
}
function names(hs){ return hs.map(function(h){ return h.none ? '-' : h.chord.numeral + (h.hold ? '(held)' : ''); }).join(' '); }

say('A PHRASE IN C MAJOR');
// E F D C  -> a melody that wants I  IV  V  I
var phrase = play([64, 65, 62, 60], 'C', 'major', { change: 'every' });
want('E opens on the tonic', phrase[0].chord.numeral === 'I', names(phrase));
want('F, after the tonic, is harmonized as a predominant', /^(IV|ii)/.test(phrase[1].chord.numeral), names(phrase));
want('D, after the predominant, is harmonized as the dominant', phrase[2].chord.numeral === 'V', names(phrase));
want('C, after the dominant, resolves to the tonic', phrase[3].chord.numeral === 'I', names(phrase));
want('every chord holds its melody note', phrase.every(function(h, i){ return C.roleOf([64,65,62,60][i] % 12, h.chord.notes) !== null; }));

say('');
say('A CHORD IS HELD WHILE THE MELODY KEEPS TO IT');
var held = play([64, 67, 72, 65], 'C', 'major', { change: 'needed' });
want('E G C over one C chord: the passing notes do not each get a chord', names(held).indexOf('I I(held) I(held)') === 0, names(held));
want('F leaves the chord, so the chord changes', !held[3].hold && held[3].chord.numeral !== 'I', names(held));
var every = play([64, 67], 'C', 'major', { change: 'every' });
want('asked to change on every note, it does', every[1].chord.numeral !== 'I', names(every));

say('');
say('THE HARMONIC RHYTHM: CHANGE WHEN THE MELODY SETTLES');
var cx = ctx('C', 'major'), I = C.harmonizeNote(64, cx, null, { change: 'smart' });
var quick = C.harmonizeNote(62, cx, { chord: I.chord }, { change: 'smart', sinceChange: 120, settle: 350 });
want('D 120 ms after the C chord came in passes over it', quick.hold && quick.passing && quick.chord.numeral === 'I', quick.chord.numeral);
var settled = C.harmonizeNote(62, cx, { chord: I.chord }, { change: 'smart', sinceChange: 500, settle: 350 });
want('...the same D after the chord has had its time gets a chord of its own', !settled.hold && C.roleOf(2, settled.chord.notes) !== null, settled.chord.numeral);
var inChord = C.harmonizeNote(67, cx, { chord: I.chord }, { change: 'smart', sinceChange: 50 });
want('a chord tone is held however soon it comes', inChord.hold && !inChord.passing);
// a fast C major scale, each note 100 ms after the last: count the chords
var t = 0, changedAt = 0, prev = null, chords = [];
[60, 62, 64, 65, 67, 69, 71, 72].forEach(function (m, i) {
  var h = C.harmonizeNote(m, cx, prev, { change: 'smart', sinceChange: t - changedAt, fresh: i === 0 });
  if (!h.hold) changedAt = t;
  prev = { chord: h.chord };
  chords.push(h.chord.numeral + (h.hold ? '' : '*'));
  t += 100;
});
var changes = chords.filter(function (c) { return /\*$/.test(c); }).length;
want('a fast scale is not a chord per note (at most 4 changes in 8 notes)', changes <= 4, chords.join(' '));
var needed = []; prev = null;
[60, 62, 64, 65, 67, 69, 71, 72].forEach(function (m) { var h = C.harmonizeNote(m, cx, prev, { change: 'needed' }); prev = { chord: h.chord }; needed.push(h.hold ? 'h' : 'c'); });
want('...where \'whenever it leaves the chord\' changes far more often', needed.filter(function (x) { return x === 'c'; }).length > changes, needed.join(''));

say('');
say('A PHRASE OPENS AT HOME');
var opening = C.harmonizeNote(67, cx, null, { change: 'smart' });
want('G to start: the tonic (C), not V, though G is V\'s root', opening.chord.numeral === 'I', opening.chord.numeral);
var V = C.harmonizeNote(62, cx, null, { change: 'every' });
var again = C.harmonizeNote(67, cx, { chord: V.chord }, { change: 'smart', fresh: true });
want('after a silence the last chord is forgotten: G opens on I again, not held on V', again.chord.numeral === 'I' && !again.hold,
     V.chord.numeral + ' ... ' + again.chord.numeral);

say('');
say('A NOTE OUTSIDE THE KEY');
var fs = play([60, 66], 'C', 'major', { change: 'every' });
want('F# after C: the dominant of G (D), with F# as its leading tone', fs[1].chord.kind === 'secondary' && fs[1].chord.numeral === 'V/V' && fs[1].role === 'third', names(fs));
// The engine has no 'minor' scale: asked for one it quietly answers in major,
// so "borrowing from C minor" by that name borrowed C major's own chords.
want('the parallel minor is \'aeolian\' (there is no scale called \'minor\')', !!mt.scales.aeolian && !mt.scales.minor);
var ab = play([60, 68], 'C', 'major', { change: 'every' }, 'aeolian');
want('Ab finds a chord that holds it (a secondary dominant or one borrowed from C minor)',
     !ab[1].none && C.roleOf(8, ab[1].chord.notes) !== null, names(ab) + ' ' + (ab[1].chord && ab[1].chord.symbol));
var borrowedSeen = {};
for (var seed = 0; seed < 12; seed++) {
  [[60, 68], [67, 70], [65, 68]].forEach(function (mel) {
    var h = play(mel, 'C', 'major', { change: 'every', seed: seed }, 'aeolian')[1];
    if (h.chord && h.chord.borrowed) borrowedSeen[h.chord.numeral + ' ' + h.chord.symbol] = 1;
  });
}
want('chords borrowed from C minor are among the choices (iv, bVI, bVII ...)', Object.keys(borrowedSeen).length > 0,
     Object.keys(borrowedSeen).join(', '));
var pass = play([60, 66], 'C', 'major', { change: 'every', chromatic: 'pass' });
want('set to let them pass, a chromatic note sounds over the chord already there', pass[1].hold && pass[1].passing && pass[1].chord.numeral === 'I', names(pass));

say('');
say('ANY SCALE');
var dor = play([62, 65, 69], 'D', 'dorian', { change: 'every' });
want('D dorian: the melody is harmonized by D dorian\'s own chords', dor.every(function(h){ return h.chord && h.chord.kind === 'degree'; }), names(dor));
var sev = play([64], 'C', 'major', { size: 4 });
want('sevenths when asked: E over Cmaj7', sev[0].chord.symbol === 'Cmaj7', sev[0].chord.symbol);

say('');
say('THE CHORD GOES UNDER THE MELODY');
var p = C.placeUnder([60, 64, 67], 76);
want('a C triad under E5 sits just beneath it', p.where === 'below' && p.notes.every(function(x){ return x < 76; }) && 76 - Math.max.apply(null, p.notes) <= 12, p.notes.join(','));
var hi = C.placeUnder([48, 52, 55], 84);
want('a voicing far below a high melody moves up to meet it', 84 - Math.max.apply(null, hi.notes) <= 12, hi.notes.join(','));
var dbl = C.placeUnder([60, 64, 67], 74);
want('the melody\'s own note is never doubled closer than an octave below it', dbl.notes.every(function(x){ return x % 12 !== 74 % 12 || 74 - x >= 12; }), dbl.notes.join(','));
var dbl2 = C.placeUnder([62, 65, 69], 74);
want('...and with other voices enough, not doubled at all', dbl2.notes.every(function(x){ return x % 12 !== 2; }) || dbl2.notes.filter(function(x){ return x % 12 !== 2; }).length < 3, dbl2.notes.join(','));
var spread = C.placeUnder([48, 55, 64, 71], 76);
want('a spread voicing keeps its shape (its intervals) when it moves', spread.notes.length >= 3 &&
     spread.notes[1] - spread.notes[0] === 7, spread.notes.join(','));
var low = C.placeUnder([60, 64, 67], 52);
want('a melody low in the bass register still gets a chord below if one fits', low.where === 'below' && low.notes.every(function(x){ return x >= 40 && x < 52; }), low.notes.join(','));
var withBass = C.placeUnder([60, 64, 67], 76, { rootPc: 0 });
want('with a root bass: C in the bass, at least a fourth under the other voices', withBass.notes[0] % 12 === 0 && withBass.notes[1] - withBass.notes[0] >= 5, withBass.notes.join(','));
want('...and the harmony under the melody is at least three voices when there is room', withBass.notes.length >= 3, withBass.notes.join(','));
var firstInv = C.placeUnder([64, 67, 72], 79, { rootPc: 0 });
want('a voicing that is not in root position still gets the root underneath', firstInv.notes[0] % 12 === 0 && firstInv.notes[0] < firstInv.notes[1], firstInv.notes.join(','));
var lowRoot = C.placeUnder([43, 47, 50], 62, { rootPc: 7 });
want('a low close chord (G2 B2 D3) under D4 opens up over its root, not mud in the bass',
     lowRoot.notes[0] === 43 && lowRoot.notes[1] - lowRoot.notes[0] >= 7, lowRoot.notes.join(','));
var fifthBass = C.placeUnder([43, 48, 52], 64, { rootPc: 0 });
want('C as G2 C3 E3 under E4 (no room for C under the G): C goes in the bass, not its fifth',
     fifthBass.notes[0] % 12 === 0 && fifthBass.notes.length >= 3 && fifthBass.notes.every(function (x) { return x < 64; }), fifthBass.notes.join(','));
var underC4 = C.placeUnder([40, 43, 48], 60, { rootPc: 0 });
want('C as E2 G2 C3 under C4: C3 E3 G3, the root in the bass and nothing muddy under it',
     underC4.notes[0] === 48 && underC4.notes.length >= 3 && underC4.notes.every(function (x) { return x < 60; }), underC4.notes.join(','));
var tooLow = C.placeUnder([60, 64, 67], 45);
want('...but under A2 there is no room: the chord goes above (usually below, not always)', tooLow.where === 'above' && tooLow.notes.every(function(x){ return x > 45; }), tooLow.notes.join(','));

say('');
say(failures? ('FAILURES: '+failures) : 'the melody leads, and the chord under it follows the way an accompanist would');
print(out.join('\n'));
if(failures) throw new Error('melody-harmony-test: '+failures+' failure(s)');
