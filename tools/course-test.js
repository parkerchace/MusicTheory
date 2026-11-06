// The course is data, so it can be wrong in ways nothing on screen shows until
// someone opens the lesson: a module id that is not a module, a look that was
// renamed, a quiz whose answer points past its options, a note the player
// cannot read. This reads course.js against the studio's own lists — the
// module ids and look ids in studio-looks.js — and checks every lesson.
//
// It also checks the course says what the lecture says: Intermediate and
// Advanced are made of the lecture's slides, every one of 3–27 is taught, and
// no lesson cites a slide that does not exist.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
this.addEventListener=function(){};this.dispatchEvent=function(){return true;};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var __e=eval;
__e(readFile('course.js'));

var failures=0;
function check(name, cond, detail){
  if (!cond) failures++;
  print((cond ? '  OK   ' : '  FAIL ') + name + (detail ? '   [' + detail + ']' : ''));
}

print('=== the course ===');
var looksSrc = readFile('studio-looks.js');
var modBlock = looksSrc.slice(looksSrc.indexOf('var MODULES = {'), looksSrc.indexOf('var ALL_IDS'));
var modules = (modBlock.match(/^\s{8}([a-z]+)\s*:\s*\{/gm) || []).map(function (m) { return m.trim().split(/\s*:/)[0]; });
var looks = (looksSrc.match(/^\s{12}id: '([a-z-]+)',/gm) || []).map(function (m) { return m.split("'")[1]; });
check('studio-looks.js lists its modules', modules.indexOf('sheet') !== -1 && modules.indexOf('solar') !== -1, modules.join(' '));
check('studio-looks.js lists its looks', looks.indexOf('luthier') !== -1 && looks.indexOf('focus') !== -1, looks.length + ' looks');

var C = window.Course;
var v = C.validate({ modules: modules, looks: looks });
check('every lesson is well formed against the studio', v.ok, v.errors.join('; '));

var levels = C.levels.map(function (l) { return l.id; });
check('three levels, in order', levels.join(',') === 'beginner,intermediate,advanced', levels.join(','));

var lessonsAt = function (lv) {
  var out = [];
  C.levels.filter(function (l) { return l.id === lv; })[0].units.forEach(function (u) { out = out.concat(u.lessons); });
  return out;
};
check('Beginner is the four Learn pages, then chord symbols, endings and common progressions',
  lessonsAt('beginner').slice(0, 4).every(function (l) { return !!l.page; }) &&
  lessonsAt('beginner').slice(4).map(function (l) { return l.id; }).join(' ') === 'b-chord-symbols b-cadences b-progressions',
  lessonsAt('beginner').map(function (l) { return l.id; }).join(' '));
check('Intermediate and Advanced are lessons, not pointers, and each has something to hear',
  lessonsAt('intermediate').concat(lessonsAt('advanced')).every(function (l) { return !l.page && l.body.length > 200 && ((l.hear && l.hear.length) || l.widget); }));

var taught = {};
C.order.forEach(function (id) { (C.get(id).slides || []).forEach(function (s) { taught[s] = true; }); });
var missing = [];
for (var s = 3; s <= 27; s++) if (!taught[s]) missing.push(s);
check('every lecture slide from 3 to 27 is taught', !missing.length, missing.length ? 'missing ' + missing.join(', ') : '');
check('no lesson cites a slide the lecture does not have', Object.keys(taught).every(function (k) { return k >= 1 && k <= 28; }));
check('the recap is the lecture\'s last slide', C.recap.length === 6);

check('every module a lesson uses has a lesson listing it back',
  C.order.every(function (id) { return C.get(id).modules.every(function (m) { return C.lessonsForModule(m).some(function (l) { return l.id === id; }); }); }));
check('slide ranges read as ranges', C.slideText(C.get('i-bebop-major')) === 'slides 10–13' && C.slideText(C.get('i-drop-2-4-drop-3')) === 'slides 7, 8, 9, 16');

// Steps name controls and settings that course-runner.js has to know how to
// find and make; a name only course.js knows would leave a "Show me" pointing
// at nothing.
var runnerSrc = readFile('course-runner.js');
var tBlock = runnerSrc.slice(runnerSrc.indexOf('var TARGETS = {'), runnerSrc.indexOf('function rectOf'));
var aBlock = runnerSrc.slice(runnerSrc.indexOf('var ACTIONS = {'), runnerSrc.indexOf('function stepSet'));
var noTarget = C.targets.filter(function (t) { return tBlock.indexOf("'" + t + "':") === -1; });
var noAction = C.setKinds.filter(function (k) { return !new RegExp('\\n\\s{8}' + k + ':\\s').test(aBlock); });
check('every control a step can point at is one the runner can find', !noTarget.length, noTarget.join(', '));
check('every setting a step can make is one the runner can make', !noAction.length, noAction.join(', '));
var used = {};
C.order.forEach(function (id) { (C.get(id).steps || []).forEach(function (st) { used[st.at] = true; }); });
check('every control the runner knows is used by some step', C.targets.every(function (t) { return used[t]; }),
  C.targets.filter(function (t) { return !used[t]; }).join(', '));

// The chord-symbol table spells every row on every root, one letter per
// number, and counts the half steps between its notes.
print('=== the chord-symbol table ===');
__e(readFile('course-theory.js'));
__e(readFile('course-widgets.js'));
var Th = window.CourseTheory, W = window.CourseWidgets, table = C.get('b-chord-symbols').widget;
var S = { chord: W.symbolChord, soundsAs: Th.soundsAs };
var rowOf = function (sym) { return table.rows.filter(function (r) { return (r.slash ? '/' : r.sym) === sym; })[0]; };
var on = function (rt, sym) { var c = S.chord(rt, rowOf(sym)); return c.names.join(' ') + ' | ' + c.steps.join('+') + ' | ' + c.symbol; };
[
  ['C', '', 'C E G | 4+3 | C'],
  ['C', 'm', 'C E♭ G | 3+4 | Cm'],
  ['C', '°', 'C E♭ G♭ | 3+3 | C°'],
  ['C', '+', 'C E G♯ | 4+4 | C+'],
  ['C', '7', 'C E G B♭ | 4+3+3 | C7'],
  ['C', 'maj7', 'C E G B | 4+3+4 | Cmaj7'],
  ['C', 'm7', 'C E♭ G B♭ | 3+4+3 | Cm7'],
  ['C', 'ø7', 'C E♭ G♭ B♭ | 3+3+4 | Cø7'],
  ['C', '°7', 'C E♭ G♭ B𝄫 | 3+3+3 | C°7'],
  ['C', '6', 'C E G A | 4+3+2 | C6'],
  ['C', 'sus4', 'C F G | 5+2 | Csus4'],
  ['C', 'maj9', 'C E G B D | 4+3+4+3 | Cmaj9'],
  ['C', '/', 'E G C | 3+5 | C/E'],
  ['F♯', '°7', 'F♯ A C E♭ | 3+3+3 | F♯°7'],
  ['D♭', '7', 'D♭ F A♭ C♭ | 4+3+3 | D♭7'],
  ['D♭', '°7', 'D♭ F♭ A𝄫 C𝄫 | 3+3+3 | D♭°7'],
  ['B', 'maj9', 'B D♯ F♯ A♯ C♯ | 4+3+4+3 | Bmaj9'],
  ['A♭', '/', 'C E♭ A♭ | 3+5 | A♭/C'],
  ['E', '+', 'E G♯ B♯ | 4+4 | E+']
].forEach(function (t) { var got = on(t[0], t[1]); check(t[0] + t[1] + ' is ' + t[2], got === t[2], got); });
check('B𝄫 says it sounds A, plain notes say nothing', S.soundsAs('B𝄫', 69) === 'A' && S.soundsAs('E♭', 63) === '');
var keys = [];
table.roots.forEach(function (rt) { table.rows.forEach(function (r) { keys = keys.concat(S.chord(rt, r).midis); }); });
check('every chord on every root fits the table\'s keyboard (C4 to E6)', Math.min.apply(null, keys) >= 60 && Math.max.apply(null, keys) <= 88, Math.min.apply(null, keys) + '..' + Math.max.apply(null, keys));

// The other widgets build their chords from scales on a root, by letter,
// and name them the way the lessons do.
print('=== the widgets\' chords ===');
var sc = function (rt, scale, num) { var c = Th.scaleChord(rt, scale, num, 4); return c.symbol + ' ' + c.names.join(' '); };
[
  ['D', 'major', '2', 'Em7 E G B D'],
  ['D', 'major', '5', 'A7 A C♯ E G'],
  ['D', 'harmonic_minor', '2', 'Eø7 E G B♭ D'],
  ['D', 'harmonic_minor', '5', 'A7 A C♯ E G'],
  ['F', 'bebop_major', '2', 'G°7 G B♭ D♭ E'],
  ['A', 'diminished', '7', 'G♯°7 G♯ B D F'],
  ['A', 'diminished', '1', 'A°7 A C E♭ F♯'],
  ['C', 'bebop_major', '3', 'C6/E E G A C'],
  ['D', 'mixolydian_b6', '2', 'Eø7 E G B♭ D'],
  ['D', 'mixolydian_b6', '3', 'F♯ø7 F♯ A C E'],
  ['A', 'harmonic_minor', '6', 'Fmaj7 F A C E'],
  ['E♭', 'major', '5', 'B♭7 B♭ D F A♭']
].forEach(function (t) { var got = sc(t[0], t[1], t[2]); check(t[0] + ' ' + t[1] + ' ' + t[2] + ' chord is ' + t[3], got === t[3], got); });
var kc = function (key, tok) { return W.keyChord(key, tok).symbol; };
check('a key\'s chords by number: 5, 2^7, 6, 5d and 4d in C and G',
  [kc('C', '5'), kc('C', '2^7'), kc('C', '6'), kc('C', '5d'), kc('G', '4d'), kc('G', '7')].join(' ') === 'G Dm7 Am G7 C7 F♯°',
  [kc('C', '5'), kc('C', '2^7'), kc('C', '6'), kc('C', '5d'), kc('G', '4d'), kc('G', '7')].join(' '));
var cf = function (r, d, sfx) { var c = Th.chordFrom(r, d, sfx); return c.symbol + ' ' + c.names.join(' '); };
check('the 4-of F as a minor 6 is B♭m6, B♭ D♭ F G', cf('B♭', '1 b3 5 6', 'm6') === 'B♭m6 B♭ D♭ F G', cf('B♭', '1 b3 5 6', 'm6'));
check('the 5-of Am as a 7♭13 is E7♭13, E G♯ D C', cf('E', '1 3 b7 b13', '7♭13') === 'E7♭13 E G♯ D C', cf('E', '1 3 b7 b13', '7♭13'));
// Cmaj7 → C7 → Fmaj7: the major 7 drops to ♭7, then to F's 3, and nothing else moves far
var run = Th.voiceRun([Th.scaleChord('C', 'major', 0, 4), Th.chordFrom('C', '1 3 5 b7', '7'), Th.scaleChord('C', 'major', 3, 4)]);
var up = run.map(function (v) { return v.upper.map(Th.midiName).join(' '); });
check('Cmaj7 → C7 → Fmaj7 voice-leads B → B♭ → A', up.join(' | ') === 'C4 E4 G4 B4 | C4 E4 G4 Bb4 | C4 E4 F4 A4', up.join(' | '));
check('every chord gets a bass under it, E2 to E♭3', run.every(function (v) { return v.bass >= 40 && v.bass <= 51 && v.bass < v.upper[0]; }));
// every widget's every choice builds, in every key
var built = 0, broken = [];
C.order.forEach(function (id) {
  var w = C.get(id).widget;
  if (!w || w.kind !== 'approach') return;
  w.keys.forEach(function (k) {
    w.targets.forEach(function (t) {
      var tr = Th.scaleChord(k, 'major', t - 1, 4).names[0];
      if (w.mode === 'of') w.moves.forEach(function (m) { m.qualities.forEach(function (q) {
        var c = Th.chordFrom(Th.spell(tr, m.interval), q.d, q.s); built++;
        if (c.names.some(function (n) { return /\?/.test(n); })) broken.push(c.symbol);
      }); });
      else w.scales.forEach(function (scale) { w.patterns.forEach(function (p) { p.split(' ').forEach(function (n) {
        var c = Th.scaleChord(tr, scale, n, 4); built++;
        if (/\?|·/.test(c.symbol) || c.names.some(function (x) { return /\?/.test(x); })) broken.push(k + ':' + tr + ' ' + scale + ' ' + n + ' → ' + c.symbol);
      }); }); });
    });
  });
});
check('every way in, in every key, spells and names (' + built + ' chords)', !broken.length, broken.slice(0, 6).join('; '));

if (failures) { print('FAILURES: ' + failures); throw new Error('course-test: ' + failures + ' failure(s)'); }
print('the course reads against the studio and the lecture');
