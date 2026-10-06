// THE DIAL REACHES THE CASES THE HAND-WRITTEN LISTS COULD NOT.
//
// Before this, the source collection for a departure came from five short
// arrays of mode names keyed by chord quality, and the winner was then chosen
// by a score that rewarded staying close to home. Two consequences, both of
// which this harness pins down as fixed:
//
//   1. REACH. Hearing a major-quality fourth degree as an aeolian tonic was
//      impossible, because the list for a major chord held only lydian, major
//      and mixolydian. So was holding the tonic still and darkening the
//      collection around it by two notes, because that path was hardcoded to
//      the parallel mode and nothing else.
//   2. THE DIAL MEANING ANYTHING. A request to go further has to actually go
//      further. If the ranking is re-sorted afterwards by a rule that rewards
//      closeness, the request is decoration.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
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
var localStorage={getItem:function(){return null;},setItem:function(){}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};var cancelAnimationFrame=function(){};

var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'scale-colour.js','functional-harmony.js','progression-library.js','harmony-complexity.js',
 'form-planner.js','voice-leading-engine.js','approach-engine.js','word-character-engine.js',
 'melodic-line-engine.js','piano-texture-engine.js','arc-ui-init.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.__voicingUserChoice=false;
var W=['laur','en','lou','i','love','you','and','the','morn','ing','light','through','the','win','dow'];
var BPB=4;

function build(key,scale,seed){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:0.5,
    emotionalTone:'hopeful',globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.85,harmony:0.85},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:16,beatsPerBar:BPB,beatUnit:4,totalBeats:16*BPB,timeSignature:'4/4',
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,BPB);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*BPB;}
  return generateHarmony(c,arc,seed);
}

// Sweep seeds at a given dial position and collect every source collection used.
function sweep(key,scale,colour,seeds,shape){
  window.__arcExcursionColour=colour;
  // REACH IS A PROPERTY OF THE DIAL, NOT OF THE SHAPE. The arc spends the
  // dial's distance across the piece, so a reach test has to flatten it or it
  // is measuring where a departure happened to land rather than how far the
  // library can go.
  window.__arcExcursionShape = shape || 'steady';
  var sources={}, dists=[], n=0, placed=[];
  for(var s=0;s<seeds;s++){
    var h=build(key,scale,s*13+7);
    var bars=(h.bars|| (h.progression&&h.progression.length) ||16);
    (h.excursions||[]).forEach(function(e){
      n++;
      sources[e.sourceRoot+' '+e.sourceScale]=(sources[e.sourceRoot+' '+e.sourceScale]||0)+1;
      if(e.colour&&isFinite(e.colour.distance)) dists.push(e.colour.distance);
      if(e.colour&&isFinite(e.colour.distance)&&isFinite(e.startBar))
        placed.push({pos:e.startBar/Math.max(1,bars-1), d:e.colour.distance});
    });
  }
  var avg=dists.length? dists.reduce(function(a,b){return a+b;},0)/dists.length : 0;
  return {sources:sources, avg:avg, n:n, distinct:Object.keys(sources).length, placed:placed};
}

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name,cond,detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}

say('REACH — the worked cases that the hand-written lists ruled out');

// Holding the tonic and darkening the collection around it. In G major the
// two-notes-darker reading rebuilds I-IV-V as I-iv-v.
var g = sweep('G','major',0.75,40);
want('a same-tonic recolour can reach a two-notes-darker collection',
     Object.keys(g.sources).some(function(k){ return /^G /.test(k) && /mixolydian_6|aeolian|dorian|phrygian/.test(k); }),
     Object.keys(g.sources).filter(function(k){return /^G /.test(k);}).slice(0,6).join(', '));

// Hearing a major-quality fourth degree as an aeolian tonic.
var a = sweep('A','major',0.6,40);
var aeolianOnFourth = Object.keys(a.sources).some(function(k){ return /^D (aeolian|natural_minor|dorian|phrygian)/.test(k); });
want('a major-quality degree can be tonicized in a minor-shaped collection',
     aeolianOnFourth,
     Object.keys(a.sources).filter(function(k){return /^D /.test(k);}).slice(0,6).join(', ') || 'none rooted on D');

say('');
say('THE LIBRARY, NOT A SHORTLIST');
var all = sweep('C','major',0.5,40);
want('many distinct collections are used, not the same parallel mode every time',
     all.distinct>=8, all.distinct+' distinct sources across '+all.n+' excursions');
want('...and no single collection accounts for most of them',
     (function(){
       var counts=Object.keys(all.sources).map(function(k){return all.sources[k];});
       var top=Math.max.apply(null,counts);
       return top/all.n < 0.5;
     })(),
     'top source is '+(function(){
        var best='',bv=0; Object.keys(all.sources).forEach(function(k){if(all.sources[k]>bv){bv=all.sources[k];best=k;}});
        return best+' at '+Math.round(bv/all.n*100)+'%';
     })());

say('');
say('THE DIAL HAS TO MEAN SOMETHING');
var mild = sweep('C','major',0.0,40);
var wild = sweep('C','major',1.0,40);
say('  mild avg distance '+mild.avg.toFixed(3)+'  ·  wild avg distance '+wild.avg.toFixed(3));
want('asking to go further actually goes further',
     wild.avg > mild.avg, mild.avg.toFixed(3)+' -> '+wild.avg.toFixed(3));
want('...by a margin big enough to hear, not a rounding difference',
     (wild.avg - mild.avg) > 0.05, '+'+(wild.avg-mild.avg).toFixed(3));
want('both ends still produce excursions rather than filtering to none',
     mild.n>0 && wild.n>0, mild.n+' mild, '+wild.n+' wild');
want('the two ends do not favour the same collection',
     (function(){
       var t=function(o){var b='',v=0;Object.keys(o.sources).forEach(function(k){if(o.sources[k]>v){v=o.sources[k];b=k;}});return b;};
       return t(mild)!==t(wild);
     })(),
     (function(){
       var t=function(o){var b='',v=0;Object.keys(o.sources).forEach(function(k){if(o.sources[k]>v){v=o.sources[k];b=k;}});return b;};
       return t(mild)+'  vs  '+t(wild);
     })());

say('');
say('EVERY DEPARTURE STILL SAYS WHAT CHANGED');
window.__arcExcursionColour=0.5;
var noted=0, total=0;
for(var s=0;s<30;s++){
  (build('C','major',s*13+7).excursions||[]).forEach(function(e){
    total++;
    if(e.colourNote && /note/.test(e.colourNote)) noted++;
  });
}
want('every excursion carries a plain-language note of what changed',
     total>0 && noted===total, noted+'/'+total);

say('');
say('');
say('THE DIAL IS A SHAPE, NOT A SETTING');
// Under `arc` the dial is the furthest the piece goes and the opening is
// milder, so where a departure lands changes how far out it is. Under `steady`
// it does not. Measured against a player doing this continuously, distance
// from home rises steeply out of the opening and then sits near its maximum —
// so the test is that early departures are milder, not that distance climbs
// all the way through.
function half(sw,lo,hi){
  var xs=sw.placed.filter(function(x){return x.pos>=lo&&x.pos<hi;}).map(function(x){return x.d;});
  return xs.length? xs.reduce(function(a,b){return a+b;},0)/xs.length : null;
}
var arcS=sweep('G','major',0.8,60,'arc');
var steadyS=sweep('G','major',0.8,60,'steady');
var arcEarly=half(arcS,0,0.34), arcLate=half(arcS,0.34,1.01);
var stEarly=half(steadyS,0,0.34), stLate=half(steadyS,0.34,1.01);
want('the arc puts real departures at both ends of the piece',
     arcEarly!==null&&arcLate!==null, 'early '+arcEarly+', late '+arcLate);
want('...and the opening is the milder one',
     arcEarly!==null&&arcLate!==null&&arcEarly<arcLate,
     'early '+(arcEarly||0).toFixed(2)+' vs late '+(arcLate||0).toFixed(2)+' notes out');
want('steady does not do that — the distance is the same wherever it lands',
     stEarly===null||stLate===null||Math.abs(stEarly-stLate)<=Math.abs(arcEarly-arcLate),
     'steady spread '+(stEarly!==null&&stLate!==null?Math.abs(stEarly-stLate).toFixed(2):'n/a')
     +' vs arc spread '+Math.abs((arcLate||0)-(arcEarly||0)).toFixed(2));
window.__arcExcursionShape='steady';

say(failures? ('FAILURES: '+failures) : 'the dial reaches, spans the library, and says what it did');


print(out.join('\n'));
if(failures) throw new Error('excursion-colour-test: '+failures+' failure(s)');
