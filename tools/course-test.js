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
check('studio-looks.js lists its looks', looks.indexOf('luthier') !== -1 && looks.indexOf('orrery') !== -1, looks.length + ' looks');

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
check('Beginner is the four Learn pages', lessonsAt('beginner').every(function (l) { return !!l.page; }) && lessonsAt('beginner').length === 4);
check('Intermediate and Advanced are lessons, not pointers', lessonsAt('intermediate').concat(lessonsAt('advanced')).every(function (l) { return !l.page && l.body.length > 200 && l.hear && l.hear.length; }));

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

if (failures) { print('FAILURES: ' + failures); throw new Error('course-test: ' + failures + ' failure(s)'); }
print('the course reads against the studio and the lecture');
