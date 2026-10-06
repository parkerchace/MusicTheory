// LEAVING IS HALF THE GESTURE; THE RETURN IS THE OTHER HALF.
//
// Every departure used to be two or three bars long and come home inside the
// same phrase — one good route treated as the only one. A return can also be
// the next section arriving, or the cadence that was going to close the piece
// anyway, and those are different gestures rather than different lengths of
// the same one. What this harness holds down:
//
//   1. A NAMED SCOPE IS HONOURED. Asking for the late departure and getting a
//      two-bar colour in the middle is the control not working.
//   2. EVERY DEPARTURE STILL COMES HOME. Whatever the scope, the music has to
//      land back in the key it started in, and say which return it just made.
//   3. THE LATE ONE IS REACHED FOR ON ITS OWN. Under `auto` the departure that
//      the closing cadence resolves is worth preferring, because the thing
//      that ends the piece is already going to be the thing that brings it
//      home.
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
function sweep(key,scale,colour,seeds){
  window.__arcExcursionColour=colour;
  var sources={}, dists=[], n=0;
  for(var s=0;s<seeds;s++){
    var h=build(key,scale,s*13+7);
    (h.excursions||[]).forEach(function(e){
      n++;
      sources[e.sourceRoot+' '+e.sourceScale]=(sources[e.sourceRoot+' '+e.sourceScale]||0)+1;
      if(e.colour&&isFinite(e.colour.distance)) dists.push(e.colour.distance);
    });
  }
  var avg=dists.length? dists.reduce(function(a,b){return a+b;},0)/dists.length : 0;
  return {sources:sources, avg:avg, n:n, distinct:Object.keys(sources).length};
}

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name,cond,detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}

function sweepScope(scope, seeds){
  window.__arcExcursionColour=0.5;
  window.__arcExcursionScope=scope;
  var kinds={}, n=0, unreturned=0, alt=0, takes=0;
  for(var s=0;s<seeds;s++){
    var h=build('C','major',s*13+7);
    takes++;
    (h.excursions||[]).forEach(function(e){
      n++;
      kinds[e.returnKind]=(kinds[e.returnKind]||0)+1;
      if(!isFinite(e.returnBar)||e.returnBar<=e.endBar) unreturned++;
      if(e.alternates) alt++;
    });
  }
  return {kinds:kinds, n:n, unreturned:unreturned, alt:alt, takes:takes};
}

say('A NAMED SCOPE IS HONOURED');
var fin = sweepScope('final', 40);
say('  final     : '+JSON.stringify(fin.kinds)+'  ('+fin.n+' departures)');
want('asking for the late departure mostly gets one',
     fin.n>0 && (fin.kinds['final']||0)/fin.n >= 0.6,
     Math.round((fin.kinds['final']||0)/fin.n*100)+'% land on the closing cadence');

var sect = sweepScope('section', 40);
say('  section   : '+JSON.stringify(sect.kinds)+'  ('+sect.n+' departures)');
// Held to the boundary is the most form-dependent of the three: a piece whose
// sections all end on their own cadence offers nowhere to hand over, and the
// request then falls back rather than producing no departure at all. So the
// claim is a floor plus a comparison — the control has to bite, not to win
// every time.
want('asking to hold to the section boundary gets that far more often than not asking',
     sect.n>0 && (sect.kinds['section']||0)/sect.n >= 0.4,
     Math.round((sect.kinds['section']||0)/sect.n*100)+'% hand over to the next section');

var phr = sweepScope('phrase', 40);
say('  phrase    : '+JSON.stringify(phr.kinds)+'  ('+phr.n+' departures)');
// The closing bars used to be reserved by the constructed walking cadence.
// With that gone they are free, so late-return windows are plentiful and turn
// up under every scope — which is why the floor here is a majority rather than
// a near-sweep. The claim that matters is still that asking changes the answer.
want('asking to come back inside the phrase mostly gets that',
     phr.n>0 && (phr.kinds['phrase']||0)/phr.n >= 0.5,
     Math.round((phr.kinds['phrase']||0)/phr.n*100)+'% close inside the line');

want('...far more often than when it was not asked for',
     (fin.kinds['final']||0)/Math.max(1,fin.n) > 1.5 * ((phr.kinds['final']||0)/Math.max(1,phr.n)),
     Math.round((fin.kinds['final']||0)/fin.n*100)+'% vs '+Math.round((phr.kinds['final']||0)/Math.max(1,phr.n)*100)+'% under phrase');
want('...and more than twice as often as when the phrase was asked for',
     (sect.kinds['section']||0)/Math.max(1,sect.n) > 2 * ((phr.kinds['section']||0)/Math.max(1,phr.n)),
     Math.round((sect.kinds['section']||0)/sect.n*100)+'% vs '+Math.round((phr.kinds['section']||0)/Math.max(1,phr.n)*100)+'% under phrase');
want('the three scopes do not all produce the same shape',
     !((fin.kinds['final']||0)===(phr.kinds['final']||0)
       && (sect.kinds['section']||0)===(phr.kinds['section']||0)),
     'final '+(fin.kinds['final']||0)+', section '+(sect.kinds['section']||0)+', phrase '+(phr.kinds['phrase']||0));

say('');
say('EVERY DEPARTURE STILL COMES HOME');
var allScopes=['auto','phrase','section','final','alternate'];
var totalUnreturned=0, totalN=0;
allScopes.forEach(function(sc){
  var r=sweepScope(sc, 25);
  totalUnreturned+=r.unreturned; totalN+=r.n;
});
want('no scope produces a departure without a return bar',
     totalN>0 && totalUnreturned===0, totalUnreturned+' of '+totalN);
want('every departure names which return it made',
     (function(){
       window.__arcExcursionScope='auto'; window.__arcExcursionColour=0.5;
       var named=0,tot=0;
       for(var s=0;s<30;s++){
         (build('C','major',s*13+7).excursions||[]).forEach(function(e){
           tot++;
           if(e.returnKind==='final'||e.returnKind==='section'||e.returnKind==='phrase') named++;
         });
       }
       return tot>0 && named===tot;
     })());

say('');
say('THE PAIRED DEPARTURE IS A PAIR');
var altr = sweepScope('alternate', 40);
say('  alternate : '+altr.n+' departures, '+altr.alt+' marked as a returned-to collection');
want('asking for the collection to be returned to produces pairs',
     altr.alt>0, altr.alt+' marked');
want('...and a pair is two departures, not one relabelled',
     altr.alt % 2 === 0 && altr.alt>=2, altr.alt+' is even');

say('');
say('UNDER AUTO, THE LATE DEPARTURE IS REACHED FOR');
var auto = sweepScope('auto', 60);
say('  auto      : '+JSON.stringify(auto.kinds)+'  ('+auto.n+' departures)');
want('the closing-cadence return happens on its own without being asked for',
     (auto.kinds['final']||0) > 0, (auto.kinds['final']||0)+' of '+auto.n);
want('...but auto is not just the late one every time',
     auto.n>0 && (auto.kinds['final']||0)/auto.n < 0.9,
     Math.round((auto.kinds['final']||0)/auto.n*100)+'%');

say('');
say(failures? ('FAILURES: '+failures) : 'a departure lasts as asked, and always comes home');
print(out.join('\n'));
if(failures) throw new Error('excursion-scope-test: '+failures+' failure(s)');
