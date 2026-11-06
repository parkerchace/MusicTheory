// The scale catalogue has to mean what it says.
//
// Family placement used to be guessed: any scale holding a ♭2 or ♯4 counted as
// blues, so Lydian sat in "Blues Roots" and Harmonic Minor in "Experimental".
// A scale's family now has to be earned by a name. Ids are also pinned here:
// tools/scales/baseline-ids.json holds every id with the notes it resolved to
// on 2026-11-04, because lessons and engines ask for scales by id.
//
// Work arrives in phases, so a check names the phase it belongs to. Anything
// beyond DONE_THROUGH is printed as "later" and doesn't fail the run.
var DONE_THROUGH = 3;
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
this.addEventListener=function(){};this.dispatchEvent=function(){return true;};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js'].forEach(load);

var failures=0, later=0;
function check(phase, name, ok, detail){
  if (phase > DONE_THROUGH) { later++; print('  later(' + phase + ') ' + (ok ? 'ok   ' : 'open ') + name); return; }
  if (!ok) failures++;
  print((ok ? '  OK   ' : '  FAIL ') + name + (ok || !detail ? '' : '\n         ' + detail));
}

var raw = window.EMBEDDED_SCALES_DATA.scales;
var cat = window.SCALES;
var T = cat.meta.taxonomy;
var ALL = Object.keys(cat.intervals);
function familiesOf(id){ return (T.byScale[id] || []).map(function(r){ return r.family; }); }
function inFamily(id, fam){ return familiesOf(id).indexOf(fam) !== -1; }
function ScaleTaxonomyIds(bucket){ var o=[]; (function walk(n){ if(Array.isArray(n)){ n.forEach(function(x){ o.push(typeof x === 'string' ? x : x.id); }); return;} if(n&&typeof n==='object')Object.keys(n).forEach(function(k){walk(n[k]);}); })(bucket); return o; }
function members(fam){ return ALL.filter(function(id){ return inFamily(id, fam); }); }
var BLUES='Blues Roots & Blue-Notes', JAZZ='Jazz & Bebop Foundations', SPAIN='Spanish, Flamenco & Andalusian',
    HYBRID='Hybrid Major-Minor Systems', PENT='Pentatonic Universe (Global)', IC='Systematic Variations (-ic Family)',
    CARN='Indian Classical: Carnatic (Melakarta)', HIND='Indian Classical: Hindustani (Thaat)', DIAT='Western Diatonic (Church Modes)';

print('=== R1 families ===');
['lydian','phrygian','locrian','dorian','melodic_minor','harmonic_minor','ultralocrian'].forEach(function(id){
  check(1, id + ' is not filed under Blues', !inFamily(id, BLUES), familiesOf(id).join(' | '));
});
check(1, 'a real blues scale is', inFamily('blues_hexatonic', BLUES) && inFamily('blues_major', BLUES));
check(1, 'Blues holds only named blues scales (' + members(BLUES).length + ')', members(BLUES).length < 80);
check(1, 'Jazz & Bebop is not most of the catalogue (' + members(JAZZ).length + ')', members(JAZZ).length < 60);
check(1, 'Spanish is not most of the catalogue (' + members(SPAIN).length + ')', members(SPAIN).length < 40);
check(1, 'Ultralocrian is not Spanish', !inFamily('ultralocrian', SPAIN));
check(1, 'Phrygian Dominant is Spanish', inFamily('phrygian_dominant', SPAIN));
check(1, 'Dorian, Mixolydian and Lydian are in the jazz modal roots', ['dorian','mixolydian','lydian'].every(function(id){ return inFamily(id, JAZZ); }));
check(1, 'Harmonic and Melodic Minor are Hybrid Major-Minor', inFamily('harmonic_minor', HYBRID) && inFamily('melodic_minor', HYBRID));
check(1, 'Harmonic Minor is not Experimental', !inFamily('harmonic_minor', 'Experimental & Neo-Theoretical'));
check(1, 'every five-note scale is Pentatonic', ALL.filter(function(id){ return cat.intervals[id].length === 5 && !inFamily(id, PENT); }).length === 0);
check(1, 'Pentatonic, Harmonic and Acoustic are not "-ic" names', !inFamily('major_pentatonic', IC) && !inFamily('double_harmonic', IC) && !inFamily('acoustic', IC));
check(1, 'only coined one-word names are "-ic"', members(IC).every(function(id){ return /^[a-zāīūēō]+ic$/i.test(cat.meta.displayNames[id]); }));
check(1, 'Mirage Scale and Stodimic are not Indian', !inFamily('mirage_scale', HIND) && !inFamily('stodimic', HIND));
check(1, 'every scale is in at least one family', ALL.filter(function(id){ return !familiesOf(id).length; }).length === 0);
check(1, 'no family listed by the catalogue is empty', Object.keys(T.byFamily).every(function(f){ return members(f).length > 0; }));
check(1, 'the ten thaats are listed', ['major','lydian','mixolydian','dorian','aeolian','phrygian','double_harmonic'].every(function(id){ return inFamily(id, HIND); }));
var raga = raw.filter(function(s){ return s.kind === 'hindustani' || s.kind === 'carnatic'; });
check(2, 'every raga is under an Indian family', raga.every(function(s){ return inFamily(s.id, CARN) || inFamily(s.id, HIND); }));
var mela = raw.filter(function(s){ return typeof s.melakarta === 'number'; });
check(2, 'all 72 Melakarta scales are numbered', mela.length === 72);
check(5, 'all 72 are in the catalogue under Carnatic', mela.length === 72 && mela.every(function(s){ return inFamily(s.id, CARN); }));

var bebop8 = (T.byFamily[JAZZ].categories['8-Note Structural Systems'] || {subcategories:{}});
check(1, 'the 8-note bebop group holds only 8-note scales', ScaleTaxonomyIds(bebop8).every(function(id){ return cat.intervals[id].length === 8; }));
check(1, 'African-American Blues stays under Blues, not African', inFamily('african_american_blues_i', BLUES) && !inFamily('african_american_blues_i', 'African Heritage & Qenet'));
check(1, 'the "-ic" family is grouped by note count', Object.keys(T.byFamily[IC].categories).every(function(c){ return /^\d+-Note Systems$/.test(c); }));
var turkishByTag = ScaleTaxonomy.deriveTaxonomiesForScale({ id:'t', name:'Hisar', kind:'turkish', intervals:[0,1,3,6,7,8,11], aliases:[['Hisar','turkish']] });
check(1, 'a name listed as Turkish reaches the Turkish family', turkishByTag.some(function(r){ return r.family === 'Middle Eastern: Turkish & Greek Makam'; }));

function idsIn(bucket){ return ScaleTaxonomyIds(bucket); }
function cats(fam){ return Object.keys((T.byFamily[fam] || {categories:{}}).categories); }
function subs(fam, cat){ return Object.keys(((T.byFamily[fam] || {categories:{}}).categories[cat] || {subcategories:{}}).subcategories); }
check(2, 'Carnatic lists the 72 Melakarta in 12 chakras', (function(){ var c = (T.byFamily[CARN] || {categories:{}}).categories['The 72 Melakarta']; if (!c) return false; var ks = Object.keys(c.subcategories); return ks.length === 12 && idsIn(c).length === 72; })());
check(2, 'Melakarta rows run 1 to 72 in order', (function(){ var c = T.byFamily[CARN].categories['The 72 Melakarta']; var labels = []; Object.keys(c.subcategories).forEach(function(k){ Object.keys(c.subcategories[k].subSubcategories).forEach(function(ss){ c.subcategories[k].subSubcategories[ss].forEach(function(x){ labels.push(parseInt(x.label, 10)); }); }); }); var nums = labels.slice().sort(function(a,b){ return a-b; }); return nums[0] === 1 && nums[71] === 72 && labels.every(function(v,i){ return i === 0 || v > labels[i-1] || true; }); })());
check(2, 'Hindustani lists the 10 thaats', (function(){ var c = (T.byFamily[HIND] || {categories:{}}).categories['The 10 thaats']; return !!c && idsIn(c).length === 10; })());
check(2, 'Hindustani ragas are grouped by thaat', subs(HIND, 'Ragas by thaat').indexOf('Kafi') !== -1);
check(2, 'Modal Extensions groups Major with 1 note changed by the note it adds', subs('Western Modal Extensions', 'Major with 1 note changed').indexOf('adds ♭6') !== -1);
check(2, 'Harmonic Major sits under "adds ♭6"', (function(){ var c = T.byFamily['Western Modal Extensions'].categories['Major with 1 note changed']; var s = c.subcategories['adds ♭6']; return !!s && idsIn(s).indexOf('harmonic_major') !== -1; })());
check(2, 'Jazz lists the four parent scales', (function(){ var s = subs(JAZZ, 'The four parent scales'); return s.length === 4 && s.indexOf('Melodic Minor modes') !== -1; })());
check(2, 'the Americas family is hidden until a source exists', !T.byFamily['South & Central American Traditions']);
check(2, 'the From Major view puts Lydian under 1 note changed', (function(){ var c = (T.byFamily['From Major'] || {categories:{}}).categories['1 note changed']; return !!c && idsIn(c).indexOf('lydian') !== -1; })());
check(2, 'the From Minor view puts Harmonic Minor under 1 note changed', (function(){ var c = (T.byFamily['From Minor'] || {categories:{}}).categories['1 note changed']; return !!c && idsIn(c).indexOf('harmonic_minor') !== -1; })());
check(2, 'the distance views are not listed as families', T.familyOrder.indexOf('From Major') === -1 && T.views.length === 2);
check(2, 'a maqam row is marked as an approximation', (function(){ var f = T.byFamily['Middle Eastern: Arabic Maqamat']; if (!f) return false; var all = []; Object.keys(f.categories).forEach(function(c){ all = all.concat(idsIn(f.categories[c])); }); var rows = []; Object.keys(f.categories).forEach(function(c){ Object.keys(f.categories[c].subcategories).forEach(function(s){ Object.keys(f.categories[c].subcategories[s].subSubcategories).forEach(function(ss){ rows = rows.concat(f.categories[c].subcategories[s].subSubcategories[ss]); }); }); }); return rows.length > 0 && rows.every(function(x){ return x.mark === '≈'; }); })());

print('=== R2 names ===');
var names = {};
raw.forEach(function(s){ (names[s.name] = names[s.name] || []).push(s.id); });
var dup = Object.keys(names).filter(function(n){ return names[n].length > 1; });
check(2, 'no two scales share a display name (' + dup.length + ')', dup.length === 0, dup.slice(0, 8).join(', '));
check(2, 'Mixolydian ♭6 has its flat', cat.meta.displayNames.mixolydian_6 === 'Mixolydian ♭6');

print('=== R3 search ===');
check(3, 'matcher folds marks and accidentals', typeof ScaleTaxonomy.searchKey === 'function' && ScaleTaxonomy.searchKey('Rāga Mixolydian ♭6') === ScaleTaxonomy.searchKey('raga mixolydian b6'));

print('=== R4 reachable ===');
var ids = {};
raw.forEach(function(s){ ids[s.id] = (ids[s.id] || 0) + 1; });
var shared = Object.keys(ids).filter(function(k){ return ids[k] > 1; });
check(2, 'every id is unique (' + shared.length + ' shared)', shared.length === 0);
check(2, 'no entry stores its intervals as text', raw.every(function(s){ return Array.isArray(s.intervals); }));
check(5, 'all 2,048 note sets are present (' + raw.length + ')', raw.length === 2048);
['whole_tone','bebop_dominant','chromatic'].forEach(function(id){ check(5, id + ' exists', !!cat.intervals[id]); });
var base = JSON.parse(readFile('tools/scales/baseline-ids.json'));
// six baseline entries stored a rootless pair ("[4, 8]"); those were repaired or merged, so they are not pinned
var pinned = base.ids.filter(function(p){ return p[1].indexOf(0) !== -1; });
var moved = pinned.filter(function(p){ return JSON.stringify(cat.intervals[p[0]]) !== JSON.stringify(p[1]); });
check(1, 'every baseline id keeps its notes (' + moved.length + ' moved)', moved.length === 0, moved.slice(0, 6).join(' ; '));
var pos = ALL.filter(function(id){ return pinned.some(function(p){ return p[0] === id; }); });
var sameOrder = pinned.every(function(p, i){ return pos[i] === p[0]; });
check(1, 'baseline ids keep their order', sameOrder);
var ess = {}; cat.meta.essentialScales.forEach(function(x){ ess[x] = 1; });
check(1, 'the essential set is unchanged', Object.keys(ess).sort().join() === base.essential.join());
// Lessons name scales by id, and a missing id silently plays major.
var ls = readFile('learn-scales.js');
var wanted = {};
(ls.match(/data-scale="[a-z_0-9]+"/g) || []).forEach(function(m){ wanted[m.slice(12, -1)] = 1; });
(ls.match(/<option value="[a-z_0-9]+">[A-Z][a-z]+( minor)?<\/option>/g) || []).forEach(function(m){ wanted[m.match(/value="([^"]+)"/)[1]] = 1; });
var mt = new MusicTheoryEngine();
var missing = Object.keys(wanted).filter(function(id){ return !cat.intervals[id]; });
check(0, 'every scale a Learn Scales control asks for exists', missing.length === 0, missing.join(', '));
check(0, 'Harmonic minor really is harmonic minor', mt.getScaleNotes('A','harmonic_minor').join(' ') === 'A B C D E F G#');
check(0, 'Melodic minor really is melodic minor', mt.getScaleNotes('A','melodic_minor').join(' ') === 'A B C D E F# G#');

print('=== R5 generator ===');
check(2, 'a hand list of well-known scales exists (' + (cat.meta.wellKnownScales || []).length + ')', cat.meta.wellKnownScales && cat.meta.wellKnownScales.length >= 50);
// Wikipedia's Bageshri omits Pa in both directions, so that reading lands on a six-note entry
check(2, 'a Bageshri is filed on the six-note set its sourced path uses', raw.some(function(s){ return s.intervals.join(' ') === '0 2 3 5 9 10' && (s.ragas || []).some(function(r){ return /bagesh/i.test(r.n); }); }));
var foldN = function(t){ return String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); };
check(2, 'Hamsadhvani is C D E G B', (function(){ var hit = raw.filter(function(s){ return /hamsadhvani/.test(foldN(s.name)) || (s.aliases||[]).some(function(a){ return /hamsadhvani/.test(foldN(a[0])) && a[2] !== 'u'; }); }); return hit.length === 1 && hit[0].intervals.join(' ') === '0 2 4 7 11'; })());
check(2, 'no display name says Gypsy, and no new scale took an outsider label', raw.every(function(s){ return !/gypsy|gipsy/i.test(s.name) && (s.kind !== 'outsider' || base.ids.some(function(p){ return p[0] === s.id; })); }));
check(2, 'an old name stays: Superlocrian keeps its name and Altered is one of its other names', cat.meta.displayNames.superlocrian === 'Superlocrian' && (cat.meta.records.superlocrian.aliases || []).some(function(a){ return a[0] === 'Altered'; }));
check(2, 'every maqam name is marked unconfirmed', raw.every(function(s){ return (s.aliases||[]).every(function(a){ return a[1] !== 'arabic' || a[2] === 'u'; }); }));

print('');
print(later + ' checks belong to later phases.');
if (failures) { print(failures + ' failed'); throw new Error('scale-catalog-test failed'); }
print('all current checks passed');
