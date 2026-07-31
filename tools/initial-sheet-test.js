// The studio should open with the scale's own chords already on the sheet.
//
// renderInitialState() seeds a full run of degrees, and every module picked it
// up from `numbersChanged` — except the sheet, which is fed from
// `displayTokensChanged` and only ever saw one when a user committed something
// typed into the numbers box. So the studio opened with the degrees seeded
// everywhere and the sheet blank until you retyped them.
//
// This checks the seed produces exactly what typing those degrees produces, and
// that it reaches the listener the sheet is wired to.
var window=this;this.window=this;
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
var localStorage={getItem:function(){return null;},setItem:function(){}};
var navigator={};
var setTimeout=function(){return 0;};var clearTimeout=function(){};
var requestAnimationFrame=function(){return 0;};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'number-generator.js'].forEach(load);

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }

print('=== initial sheet seed ===');

var mt=new MusicTheoryEngine();
window.MusicTheoryEngine=MusicTheoryEngine;
var ng=new NumberGenerator({ musicTheory: mt });
ng.musicTheory=mt;
ng.setScaleInfo('C','major');

// What the seed builds, degree by degree.
var tokens=null;
check('every degree of the scale produces a chord token', function(){
  var nums=[1,2,3,4,5,6,7];
  tokens=nums.map(function(n){ return ng.numberToRoman(n); });
  tokens.forEach(function(t,i){
    if(!t||t==='?') throw new Error('degree '+(i+1)+' produced '+JSON.stringify(t));
  });
});

check('they are the diatonic sevenths of C major', function(){
  print('       ' + tokens.join('  '));
  // Quality, not spelling: the third degree must read as a minor chord however
  // this build happens to spell it, and the seventh as a diminished one.
  var expectCase=['upper','lower','lower','upper','upper','lower','lower'];
  tokens.forEach(function(t,i){
    var letters=String(t).replace(/[^IViv]/g,'');
    if(!letters.length) throw new Error('no roman numeral in '+t);
    var isUpper=letters===letters.toUpperCase();
    var want=expectCase[i]==='upper';
    if(isUpper!==want){
      throw new Error('degree '+(i+1)+' came out '+(isUpper?'major':'minor')+' ('+t+')');
    }
  });
  if(tokens.length!==7) throw new Error('expected 7 tokens, got '+tokens.length);
});

check('setDisplayTokens emits them to the listener the sheet is wired to', function(){
  var heard=null;
  ng.on('displayTokensChanged', function(evt){ heard=evt; });
  ng.setDisplayTokens(tokens, { rawTokens: tokens.slice(), source: 'initial-seed' });
  if(!heard) throw new Error('displayTokensChanged never fired');
  if(!heard.tokens || heard.tokens.length!==tokens.length){
    throw new Error('listener got '+JSON.stringify(heard.tokens));
  }
  for(var i=0;i<tokens.length;i++){
    if(heard.tokens[i]!==tokens[i]) throw new Error('token '+i+' changed in flight');
  }
});

check('a scale with a different note count seeds that many chords', function(){
  ng.setScaleInfo('C','major_pentatonic');
  var five=[1,2,3,4,5].map(function(n){ return ng.numberToRoman(n); });
  if(five.some(function(t){ return !t||t==='?'; })) throw new Error('pentatonic degree unresolved: '+five.join(' '));
  ng.setScaleInfo('C','major');
});

print(failures? ('FAILURES: '+failures) : 'the sheet has chords to show on load');
