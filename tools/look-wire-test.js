// THE PREVIEW IS DRAWN FROM THE LAYOUT, SO IT CANNOT DRIFT FROM IT.
//
// The hand-drawn thumbnails had drifted (Command Deck drew twelve tiles for
// ten modules). LookSchema.wireFromGrid draws every look — including one a
// person builds — from its grid: zones where the grid puts them, sized by
// its tracks, rails and drawers as chrome, the orbit as an ellipse, the
// module the look is about highlighted, a mosaic as one tile per module.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var document={ readyState:'loading', addEventListener:function(){}, querySelector:function(){return null;},
  querySelectorAll:function(){return [];}, getElementById:function(){return null;}, body:{} };
var CustomEvent=function(){};
load('look-schema.js');
load('studio-looks.js');
var S = window.LookSchema, LOOKS = window.StudioLooks.looks;
function look(id){ return LOOKS.filter(function(l){ return l.id === id; })[0]; }

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}
function inside(r){ return r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 120.01 && r[1] + r[3] <= 72.01 && r[2] > 0 && r[3] > 0; }
function overlap(a, b){ return a[0] < b[0] + b[2] - 0.01 && b[0] < a[0] + a[2] - 0.01 && a[1] < b[1] + b[3] - 0.01 && b[1] < a[1] + a[3] - 0.01; }

say('EVERY BUILT-IN LOOK');
LOOKS.filter(function(l){ return l.id !== 'og'; }).forEach(function(l){
  var w = S.wireFromGrid(l);
  var clash = false;
  w.forEach(function(a, i){ w.forEach(function(b, j){ if (i < j && overlap(a, b)) clash = true; }); });
  want(l.name + ': drawn inside the frame, nothing overlapping', w.length > 0 && w.every(inside) && !clash, w.length + ' shapes');
});

say('');
say('THE DRAWING SAYS WHAT THE LOOK IS');
var sw = S.wireFromGrid(look('stage-wings'));
want('Stage & Wings: two rails as chrome either side of the highlighted stage',
     sw.length === 3 && sw.filter(function(r){ return r[4] === 2; }).length === 2 && sw.filter(function(r){ return r[4] === 1; }).length === 1);
want('...and the rails are narrow, the stage wide', sw[0][2] < 15 && sw[1][2] > 70, sw.map(function(r){ return r[2]; }).join(','));
var cd = S.wireFromGrid(look('command-deck'));
want('Command Deck: one tile per module (nine), not twelve', cd.length === look('command-deck').zones.a.modules.length, cd.length + ' tiles');
var or = S.wireFromGrid(look('orrery'));
want('Orrery: the orbit is an ellipse', or.some(function(r){ return r[4] === 3; }));
var nd = S.wireFromGrid(look('notation-desk'));
want('Notation Desk: the page highlighted, the drawer as chrome', nd.some(function(r){ return r[4] === 1; }) && nd.some(function(r){ return r[4] === 2; }));
var tu = S.wireFromGrid(look('two-up'));
want('Two-Up: the divider is drawn as a thin bar between the halves', tu.some(function(r){ return r[4] === 2 && r[2] < 3; }));
var sb = S.wireFromGrid(look('split-brain'));
want('Split Brain: the decks are drawn as rows of modules', sb.length > 4);

say('');
say('A LOOK SOMEONE BUILDS GETS A PREVIEW TOO');
var mine = { id: 'mine', name: 'Mine', grid: { areas: ['a b b', 'a c c'], cols: '200px 1fr 1fr', rows: '1fr auto' },
             zones: { a: { flow: 'rail', modules: ['circle'] }, b: { modules: ['sheet'] }, c: { flow: 'row', modules: ['solar', 'grading'] } } };
var mw = S.wireFromGrid(mine);
want('it is drawn: a rail, the highlighted score, a row of two', mw.length === 4 && mw[0][4] === 2 && mw.some(function(r){ return r[4] === 1; }), JSON.stringify(mw));
want('a look with no grid draws nothing rather than throwing', S.wireFromGrid({}).length === 0);

say('');
say(failures? ('FAILURES: '+failures) : 'every preview is drawn from the layout it previews');
print(out.join('\n'));
if(failures) throw new Error('look-wire-test: '+failures+' failure(s)');
