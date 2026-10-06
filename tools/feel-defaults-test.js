// A PIECE THAT NEVER BREATHES IS NOT NEUTRAL, IT IS METRONOMIC.
//
// The expressive layer was fully built — a feel plan that steps at section
// boundaries, broadens the close, leans on the climax, and refuses to play a
// repeated section identically to its first hearing — and then every one of
// those decisions was multiplied by a master amount that defaulted to ZERO.
// So the plan was computed in full and scaled to nothing, and every generated
// piece came out rigid from end to end however carefully its form had been
// planned. Defaults are a musical decision, not a neutral one, and these are
// the assertions that keep them from silently going back to nothing.
var window=this;this.window=this;this.dispatchEvent=function(){};
var console={log:function(){},warn:function(){},error:function(){}};
function el(tag){
  var e={tagName:(tag||'div').toUpperCase(),style:{setProperty:function(){}},children:[],dataset:{},
    className:'',id:'',textContent:'',innerHTML:'',value:'',checked:false,disabled:false,title:'',
    appendChild:function(c){this.children.push(c);return c;},
    append:function(){for(var i=0;i<arguments.length;i++)this.children.push(arguments[i]);},
    insertBefore:function(c){this.children.push(c);return c;},
    removeChild:function(c){var i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);return c;},
    setAttribute:function(k,v){this[k]=v;},getAttribute:function(k){return this[k];},
    removeAttribute:function(){},addEventListener:function(){},removeEventListener:function(){},
    querySelector:function(){return null;},querySelectorAll:function(){return [];},
    getBoundingClientRect:function(){return {width:900,height:400,top:0,left:0};},
    classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},
    focus:function(){},blur:function(){},remove:function(){},closest:function(){return null;},
    getContext:function(){return null;}};
  return e;
}
var document={createElement:el,createElementNS:function(ns,t){return el(t);},
  createTextNode:function(t){return {textContent:t};},
  getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},
  addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
  body:el('body'),head:el('head'),documentElement:el('html')};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var localStorage={_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var __e=eval;
__e(readFile('music-theory-engine.js'));
__e(readFile('sheet-music-generator.js'));

var out=[],failures=0;
function say(s){out.push(s);}
function want(n,c,d){ if(c){say('  ok   '+n+(d?('   ['+d+']'):''));} else {failures++;say('  FAIL '+n+(d?('   ['+d+']'):''));} }

var gen=new SheetMusicGenerator({ musicTheory: new MusicTheoryEngine() });

say('THE EXPRESSIVE LAYER IS ON WITHOUT BEING ASKED FOR');
want('a fresh sheet breathes rather than running metronomically',
     Number(gen.state.rubato) > 0, 'rubato = '+gen.state.rubato);
want('...and does not place every attack exactly on the grid',
     Number(gen.state.displace) > 0, 'displace = '+gen.state.displace);
want('...but is well short of sounding unsteady',
     Number(gen.state.rubato) <= 0.5 && Number(gen.state.displace) <= 0.2,
     'rubato '+gen.state.rubato+', displace '+gen.state.displace);
want('swing stays off, because it is a style rather than a way of breathing',
     Number(gen.state.swing) === 0, 'swing = '+gen.state.swing);

say('');
say('A SAVED PREFERENCE STILL WINS');
localStorage.setItem('sheet.rubato','0');
localStorage.setItem('sheet.displace','0');
var metronomic=new SheetMusicGenerator({ musicTheory: new MusicTheoryEngine() });
want('choosing a metronomic performance is honoured, not overridden by the default',
     Number(metronomic.state.rubato)===0 && Number(metronomic.state.displace)===0,
     'rubato '+metronomic.state.rubato+', displace '+metronomic.state.displace);
localStorage._d={};

say('');
say('THE FEEL VARIES ACROSS THE PIECE, WHICH IS THE POINT');
var FORM={ bars:16, beatsPerBar:4, sections:[
  {label:'A1', letter:'A', stability:'stable',       startBar:0,  endBar:3},
  {label:'A2', letter:'A', stability:'stable',       startBar:4,  endBar:7},
  {label:'B',  letter:'B', stability:'transitional', startBar:8,  endBar:11, isClimax:true},
  {label:'A3', letter:'A', stability:'stable',       startBar:12, endBar:15, isFinal:true}
]};
gen.state.form=FORM;
gen.state.musicalPhrase={beatsPerBar:4};
gen._clearRubatoCache();
var plan=gen._feelPlan();
want('the piece has a feel plan at all, rather than one setting throughout',
     !!plan && plan.length===4, plan? plan.length+' sections':'none');
var rub=plan.map(function(p){return p.rubato;});
say('  rubato by section: '+plan.map(function(p){return p.label+' '+p.rubato;}).join('  ·  '));
want('the opening is held back — a piece does not arrive already stretching',
     rub[0] < rub[1], rub[0]+' then '+rub[1]);
want('the climax takes the weight, which is what makes it the climax',
     rub[2] >= Math.max(rub[0], rub[1]), 'B at '+rub[2]);
want('the close broadens', rub[3] >= Math.max(rub[0], rub[1]), 'A3 at '+rub[3]);
want('not every section is played the same way',
     new Set(rub).size >= 3, new Set(rub).size+' distinct values across 4 sections');

say('');
say('AND WITH NO FORM THERE IS NOTHING TO FOLLOW');
gen.state.form=null; gen._clearRubatoCache();
want('a piece with no plan is left alone rather than given an invented shape',
     gen._feelPlan()===false);
want('...and its feel reads as flat, not as broken',
     (function(){ var f=gen._feelAt(0); return f && f.swing===1 && f.rubato===1; })());

say('');
say(failures? ('FAILURES: '+failures) : 'the piece breathes by default, and it breathes differently in different places');
print(out.join('\n'));
if(failures) throw new Error('feel-defaults-test: '+failures+' failure(s)');
