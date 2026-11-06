// THE CIRCLE: WHOLE IN ANY BOX, AND EVERY WEDGE WHAT IT SAYS.
//
// The circle stays round and inside whatever box a look gives it, and a click
// lands on the wedge under the pointer, major or relative minor. Numbers come
// from the scale by pitch, a relative minor is spelled two letters down, and a
// signature read off the scale counts the notes the scale really has.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var module={exports:{}};
load('music-theory-engine.js');
var Engine=module.exports;
load('scale-circle-explorer.js');
var Circle=module.exports;

var out=[], failures=0;
function want(name, cond, detail){
  if(cond) out.push('ok   '+name);
  else { failures++; out.push('FAIL '+name+(detail===undefined?'':' :: '+JSON.stringify(detail))); }
}

var c=new Circle(new Engine());

// Every box the looks produce, with and without the panel beside it.
var bad=[];
[[1406,434,236],[1406,434,0],[324,324,0],[309,221,0],[376,376,0],[738,560,236],[260,600,0],[1920,240,236]].forEach(function(b){
  var g=c.computeLayout(b[0],b[1],b[2]);
  var where=b.join(' ');
  if(g.cx-g.R<0 || g.cy-g.R<0 || g.cy+g.R>b[1] || g.cx+g.R>b[0]) bad.push(where+': the circle leaves the box');
  if(b[2] && g.sideLeft+b[2]>b[0]) bad.push(where+': the panel leaves the box');
  if(!(g.R>g.r1 && g.r1>g.r2 && g.r2>0)) bad.push(where+': rings out of order');
});
want('the circle, and the panel beside it, stay inside every box', bad.length===0, bad);

var open=c.computeLayout(400,400,0,0);
want('with no minor ring the middle takes its room', open.r2===open.r1);

// Every wedge is the one under its own centre, in every arrangement.
c.size={w:360,h:360};
c.anim.minor=1;
c.currentLayout=function(){ return c.computeLayout(360,360,0,c.anim.minor); };
var misses=[];
['fifths','fourths','chromatic'].forEach(function(mode){
  c.state.mode=mode;
  c.anim.minor=mode==='chromatic'?0:1;
  var g=c.currentLayout();
  c.getKeyOrder().forEach(function(key,i){
    var p=c.polar(g,i*Math.PI/6,(g.R+g.r1)/2), hit=c.wedgeAt(p.x,p.y);
    if(!hit||hit.key!==key||hit.ring!=='major') misses.push(mode+' '+key+' '+JSON.stringify(hit));
    if(mode==='chromatic') return;
    p=c.polar(g,i*Math.PI/6,(g.r1+g.r2)/2); hit=c.wedgeAt(p.x,p.y);
    if(!hit||hit.key!==key||hit.ring!=='minor') misses.push(mode+' '+key+' inner '+JSON.stringify(hit));
  });
});
c.state.mode='fifths'; c.anim.minor=1;
want('a click finds the wedge under it, on both rings', misses.length===0, misses.slice(0,4));
var g=c.currentLayout();
want('a click in the middle or outside finds nothing', c.wedgeAt(g.cx,g.cy)===null && c.wedgeAt(2,2)===null);

var rel={C:'A',G:'E',D:'B',A:'F#',E:'C#',B:'G#','F#':'D#',Gb:'Eb',Db:'Bb','C#':'A#',Ab:'F',Eb:'C',Bb:'G',F:'D'};
var wrong=Object.keys(rel).filter(function(k){ return c.relativeMinor(k)!==rel[k]; });
want('relative minors are spelled two letters down', wrong.length===0, wrong);

c.state.scaleNotes=['E','F#','G#','A','B','C#','D#'];
want('a wedge has its number in the scale', c.degreeOf('G#')===3 && c.degreeOf('D#')===7 && c.degreeOf('E')===1);
want('by pitch, however the wedge spells it', c.degreeOf('Ab')===3 && c.degreeOf('Db')===6);
want('a note outside the scale has no number', c.degreeOf('F')===null);
want('E major has four sharps', c.scaleSignatureText()==='4♯', c.scaleSignatureText());

c.state.currentKey='A'; c.state.scaleType='aeolian'; c.state.scaleNotes=['A','B','C','D','E','F','G'];
want('A aeolian has none, whatever A major has', c.scaleSignatureText()==='no ♯ or ♭' && c.signatureText('A')==='3♯', c.scaleSignatureText());
c.state.scaleNotes=['F','G','Ab','Bb','C','Db','Eb'];
want('F minor has four flats', c.scaleSignatureText()==='4♭', c.scaleSignatureText());
c.state.scaleNotes=['A','B','C','D','E','F','G#'];
want('A harmonic minor has its one sharp', c.scaleSignatureText()==='1♯', c.scaleSignatureText());

c.state.currentKey='Eb'; c.state.mode='chromatic';
want('a flat key names the chromatic circle in flats', c.getKeyOrder().join(' ')==='C Db D Eb E F Gb G Ab A Bb B', c.getKeyOrder());

out.push('');
out.push(failures?('FAILURES: '+failures):'whole in any box, and every wedge what it says');
print(out.join('\n'));
if(failures) throw new Error('circle-layout-test: '+failures+' failure(s)');
