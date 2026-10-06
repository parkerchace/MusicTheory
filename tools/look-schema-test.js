// A LOOK IS DATA, AND THE GATE IN FRONT OF IT IS STRICT.
//
// Every look — the built-in twelve, and any a person builds or imports —
// passes LookSchema.validate. It must accept the real ones untouched and
// refuse anything that could break the page or carry something into it:
// unknown modules, a module in two places, non-rectangular areas, CSS that
// is not a plain length, script in a name.
var window=this;this.window=this;
var console={log:function(){},warn:function(m){ warnings.push(String(m)); },error:function(){}};
var warnings=[];
var localStorage={getItem:function(){return null;},setItem:function(){}};
// Just enough document for studio-looks.js to define its looks without running.
var document={ readyState:'loading', addEventListener:function(){}, querySelector:function(){return null;},
  querySelectorAll:function(){return [];}, getElementById:function(){return null;}, body:{} };
var CustomEvent=function(){};

load('look-schema.js');
load('studio-looks.js');
var S = window.LookSchema, LOOKS = window.StudioLooks.looks;
var CTX = { modules: ['numgen','keyscale','circle','chords','relations','sheet','solar','grading','fretboard','chordstrip'], relocated: ['keyscale'] };

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function errs(look){ var r = S.validate(look, CTX); return r.ok ? 'ok' : r.errors.join(' | '); }

say('THE BUILT-IN LOOKS PASS THEIR OWN GATE');
LOOKS.filter(function(l){ return l.id !== 'og'; }).forEach(function(l){
  var r = S.validate(l, CTX);
  want(l.name + ' is valid', r.ok, r.ok ? '' : r.errors.join(' | '));
});
want('...and loading them warned about nothing', warnings.length === 0, warnings.join(' / '));
var sc = S.validate(LOOKS.filter(function(l){ return l.id === 'signal-chain'; })[0], CTX).look;
want('a valid look comes back as a clean copy with its narrower layouts kept', sc && sc.grid.below && sc.grid.below[0].width === 1340);

say('');
say('WHAT A LOOK MAY NOT BE');
var base = { id: 'mine', name: 'Mine', grid: { areas: ['a b'], cols: '1fr 2fr', rows: 'minmax(0, 1fr)' },
             zones: { a: { modules: ['circle'] }, b: { modules: ['sheet'] } } };
want('a small honest look is fine', errs(base) === 'ok', errs(base));
var x;
x = clone(base); x.zones.a.modules = ['circle', 'nonsense'];
want('an unknown module is refused', /no module called "nonsense"/.test(errs(x)));
x = clone(base); x.zones.b.modules = ['sheet', 'circle'];
want('a module in two zones is refused', /in two zones/.test(errs(x)));
x = clone(base); x.zones.a.modules = ['keyscale'];
want('the key/scale shell (it lives in the header) is refused', /lives in the header/.test(errs(x)));
x = clone(base); x.zones.a.flow = 'carousel';
want('an unknown zone type is refused', /unknown zone type/.test(errs(x)));
x = clone(base); x.grid = { areas: ['a b', 'b a'], cols: '1fr 1fr', rows: '1fr 1fr' };
want('a zone that is not a rectangle is refused', /not a rectangle/.test(errs(x)));
x = clone(base); x.grid = { areas: ['a b', 'a'], cols: '1fr 1fr', rows: '1fr 1fr' };
want('ragged rows of areas are refused', /same number of columns/.test(errs(x)));
x = clone(base); x.grid.cols = '1fr';
want('a track list that does not match the columns is refused', /cols must be 2/.test(errs(x)));
x = clone(base); x.grid.cols = 'url(http://evil.example/x) 1fr';
want('url() in CSS is refused', /cols must be/.test(errs(x)));
x = clone(base); x.grid.cols = '1fr; background: red 1fr';
want('a semicolon in CSS is refused', /cols must be/.test(errs(x)));
x = clone(base); x.grid.cols = 'var(--anything) 1fr';
want('any variable but --look-split is refused', /cols must be/.test(errs(x)));
x = clone(base); x.grid.cols = 'minmax(300px, var(--look-split, 1fr)) 1fr';
want('...--look-split (the divider) is allowed', errs(x) === 'ok', errs(x));
x = clone(base); x.zones.a.height = 'expression(alert(1))';
want('a zone height that is not a length is refused', /height is not a CSS length/.test(errs(x)));
x = clone(base); x.grid = { areas: ['a b c'], cols: '1fr 1fr 1fr', rows: '1fr' };
want('the grid may not place a zone the look does not define', /does not define/.test(errs(x)));
x = clone(base); x.zones.c = { modules: ['solar'] };
want('a zone the grid never places is refused (it would be unreachable)', /not placed/.test(errs(x)));
x = clone(base); x.id = '../../etc';
want('an id is lowercase letters, digits and dashes', /id must be/.test(errs(x)));
x = clone(base); x.divider = { zone: 'a', axis: 'x' };
want('a divider cannot sit in a zone that holds modules', /cannot also hold modules/.test(errs(x)));
x = clone(base); x.stage = 'solar';
want('the stage must be a module the look places', /stage must be/.test(errs(x)));
want('not an object is not a look', S.validate('look', CTX).ok === false && S.validate(null, CTX).ok === false);

say('');
say('WORDS ARE KEPT AS WORDS');
x = clone(base); x.name = '<img src=x onerror=alert(1)>'; x.principle = new Array(1000).join('a'); x.zones.a.label = 'A\u0000B';
var clean = S.validate(x, CTX).look;
want('a name with markup is kept as text, not removed or run (pages render it with textContent)', clean && clean.name === '<img src=x onerror=alert(1)>'.slice(0, 40));
want('long text is cut to its limit', clean && clean.principle.length === S.MAX.principle);
want('control characters are removed', clean && clean.zones.a.label.indexOf('\u0000') === -1);
x = clone(base); x.onload = 'steal()'; x.zones.a.style = 'x'; x.grid.below = [{ width: 900, areas: ['a', 'b'], cols: '1fr', rows: 'auto auto', extra: 1 }];
clean = S.validate(x, CTX).look;
want('fields the format does not know are dropped', clean && clean.onload === undefined && clean.zones.a.style === undefined && clean.grid.below[0].extra === undefined);

say('');
say('THE LAYOUT IN FORCE');
var g = { areas: ['a b'], cols: '1fr 1fr', rows: '1fr', below: [{ width: 1200, areas: ['a', 'b'] }, { width: 800, areas: ['b', 'a'] }] };
want('wide: the base grid', S.gridAt(g, 1440) === g);
want('at 1100: the 1200 layout', S.gridAt(g, 1100) === g.below[0]);
want('at 700: the narrowest that applies', S.gridAt(g, 700) === g.below[1]);

say('');
say(failures? ('FAILURES: '+failures) : 'the real looks pass, and nothing else gets through');
print(out.join('\n'));
if(failures) throw new Error('look-schema-test: '+failures+' failure(s)');
