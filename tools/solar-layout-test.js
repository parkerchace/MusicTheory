// THE SOLAR MAP: ONE RING PER NOTE, NUMBERED, IN ANY BOX.
//
// However many notes the scale has and whatever box a look gives it, every
// planet has its own ring, further out the higher its degree, and the whole
// system stays inside the box. Each moon has its own ring around its planet,
// and is named by its number from that planet and spelled to match: the ♭3 of
// C is E♭, never D♯.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var module={exports:{}};
load('music-theory-engine.js');
var Engine=module.exports;
load('solar-system-visualizer.v2.js');
var Solar=window.SolarSystemVisualizer;

var out=[], failures=0;
function want(name, cond, detail){
  if(cond) out.push('ok   '+name);
  else { failures++; out.push('FAIL '+name+(detail===undefined?'':' :: '+JSON.stringify(detail))); }
}

var engine=new Engine();
var viz=new Solar(engine);

// Every box the looks produce, and worse.
var BOXES=[[1426,453],[1070,558],[418,359],[396,341],[321,252],[280,240],[240,600],[1920,300]];
var bad=[];
BOXES.forEach(function(box){
  for(var n=1;n<=12;n++){
    var g=viz.computeLayout(box[0],box[1],n);
    var where=box.join('x')+' n='+n;
    if(g.radii.length!==n) bad.push(where+': '+g.radii.length+' rings');
    for(var i=1;i<n;i++) if(!(g.radii[i]-g.radii[i-1]>=1.5)) bad.push(where+': rings '+i+' and '+(i+1)+' touch');
    var gaps=[]; for(i=1;i<n;i++) gaps.push(g.radii[i]-g.radii[i-1]);
    if(gaps.length && Math.max.apply(null,gaps)-Math.min.apply(null,gaps)>0.01) bad.push(where+': uneven');
    var outer=g.radii[n-1];
    if(outer>box[0]/2 || outer*g.flatten>box[1]/2) bad.push(where+': outside the box');
    if(g.radii[0]*g.flatten<=g.sunR) bad.push(where+': first ring inside the sun');
    if(g.flatten<0.5||g.flatten>1) bad.push(where+': flatten '+g.flatten);
  }
});
want('every note its own ring, evenly spaced and inside the box, in every box', bad.length===0, bad.slice(0,6));

viz.state.key='C'; viz.state.scale='major';
viz.updateSystem({key:'C',scale:'major',notes:['C','D','E','F','G','A','B']});
var P=viz.state.planets;
want('planets are numbered by degree', P.map(function(p){return p.number;}).join(' ')==='1 2 3 4 5 6 7');

function moon(planet,number){ return viz.state.planets.filter(function(p){return p.note===planet;})[0].satellites.filter(function(s){return s.number===number && s.type!=='containerChord';})[0]; }
want('the 5 of D is A7', moon('D','5').display==='A7', moon('D','5'));
want('the ♭2 of C is D♭7, not C♯7', moon('C','♭2').display==='Db7', moon('C','♭2'));
want('the ♭3 of C is E♭, not D♯', moon('C','♭3').display==='Eb', moon('C','♭3'));
want('the ♭6 of C is A♭, not G♯', moon('C','♭6').display==='Ab', moon('C','♭6'));
want('the ♭6 of D is B♭, not A♯', moon('D','♭6').display==='Bb', moon('D','♭6'));
want('the 7 of D is C♯m7♭5', moon('D','7').display==='C#m7b5', moon('D','7'));

viz.updateSystem({key:'F#',scale:'major',notes:['F#','G#','A#','B','C#','D#','E#']});
want('the 7 of F♯ is E♯m7♭5', moon('F#','7').display==='E#m7b5', moon('F#','7'));
want('the ♭3 of F♯ is A', moon('F#','♭3').display==='A', moon('F#','♭3'));

viz.updateSystem({key:'C',scale:'major',notes:['C','D','E','F','G','A','B']});
viz.canvasSize={w:321,h:252};
viz.fit(true);
var D=viz.state.planets[1], orbits=D.moons.map(function(s){return s.orbit;}), rising=true;
for(var i=1;i<orbits.length;i++) if(!(orbits[i]>orbits[i-1])) rising=false;
want('each moon has its own ring around its planet', rising && orbits.length>=8, orbits);
want('the moons start clear of their planet', orbits[0]*viz.geo.flatten>D.size*1.2, orbits[0]);

viz.state.expandedPlanets=['D','E'];
viz.updateSystem({key:'C',scale:'pentatonic',notes:['C','D','E','G','A']});
want('five notes, five rings', viz.state.planets.length===5 && new Set(viz.state.planets.map(function(p){return p.orbitRadius;})).size===5);
viz.updateSystem({key:'Eb',scale:'major',notes:['Eb','F','G','Ab','Bb','C','D']});
want('a planet the new scale does not have closes', viz.state.expandedPlanets.join()==='D', viz.state.expandedPlanets);

out.push('');
out.push(failures?('FAILURES: '+failures):'one ring per note, in any box, and every moon named by its number');
print(out.join('\n'));
if(failures) throw new Error('solar-layout-test: '+failures+' failure(s)');
