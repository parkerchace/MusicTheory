// Do the notated rhythms add up to the bar, in every time signature we emit?
//
// Two separate questions, kept separate because they fail independently:
//
//   ARITHMETIC  the melody engine fills each bar with exactly beatsPerBar
//               worth of note values — no overflow, no short bar
//   NOTATION    the note VALUE each duration is drawn as is worth the right
//               amount of time in that metre. A "beat" is a beat-unit, so in
//               6/8 one beat is an eighth; drawing it as a quarter makes a bar
//               of six beats notate as six quarters, which is twice the bar.
//
// A bar can pass the first and fail the second, which is exactly the case that
// looks fine in the data and wrong on the page.
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
 'functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js',
 'voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js',
 'piano-texture-engine.js','arc-ui-init.js','sheet-music-generator.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.sheetMusicGenerator={state:{autoVoicingAll:true,voicingLogic:'smart',voicingRegister:'mid'}};
var sheetGen=new SheetMusicGenerator({musicTheory:mt});

// Quarter-note worth of every value the renderer can draw.
var QUARTERS={'whole':4,'whole_dotted':6,'half':2,'half_dotted':3,'dotted-half':3,
  'quarter':1,'quarter_dotted':1.5,'dotted-quarter':1.5,
  'eighth':0.5,'eighth_dotted':0.75,'dotted-eighth':0.75,
  'sixteenth':0.25,'sixteenth_dotted':0.375};

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light'];

function build(ts,seed){
  var m=String(ts).match(/^(\d+)\/(\d+)$/);
  var bpb=parseInt(m[1],10), unit=parseInt(m[2],10);
  var notes=mt.getScaleNotesWithKeySignature('C','major');
  var c={harmonicProfile:{root:'C',recommendedScale:'major',scaleNotes:notes},overallEnergy:0.5,
    emotionalTone:'hopeful',globalTension:0.5,timeSignature:ts,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.4,harmony:0.4},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:8,beatsPerBar:bpb,beatUnit:unit,totalBeats:8*bpb,timeSignature:ts,
    sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,bpb);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*bpb;}
  var h=generateHarmony(c,arc,seed);
  var mel=generateMelody(c,arc,h,seed);
  var p=buildPianoTexture(c,arc,h,mel,seed);
  var phrase=buildPhraseFromGeneratedMusic({harmony:h,melody:mel,piano:p,context:c,arc:arc},sheetGen);
  return {bpb:bpb,unit:unit,mel:mel,phrase:phrase,h:h};
}

var SIGS=['4/4','3/4','2/4','5/4','6/8','7/8'];
var rows=[];
var totalBad=0;

SIGS.forEach(function(ts){
  var m=String(ts).match(/^(\d+)\/(\d+)$/);
  var bpb=parseInt(m[1],10), unit=parseInt(m[2],10);
  // What one bar is worth in quarter notes. 6/8 is six eighths = three quarters.
  var barQuarters=bpb*(4/unit);

  var barsChecked=0, arithBad=0, notationBad=0, glyphBad=0;
  var worstArith=0, worstNotation=0;
  var example=null;

  for(var s=0;s<12;s++){
    var r;
    try{ r=build(ts,s*41+9); }catch(e){ print(ts+' build failed: '+e); continue; }

    // --- ARITHMETIC: does any note run past the end of its own bar? -------
    // A note crossing a bar line is legal music, but only if it is written as
    // a tie. Nothing here ties, so an overflowing note is drawn inside a bar
    // it does not fit in — which is the bar not adding up.
    var barsSeen={};
    (r.mel.notes||[]).forEach(function(n){
      if(!isFinite(n.bar))return;
      barsSeen[n.bar]=true;
      var over=(Number(n.beat)||0)+(Number(n.duration)||0)-r.bpb;
      if(over>0.01){
        arithBad++;
        if(over>worstArith) worstArith=over;
      }
    });
    barsChecked+=Object.keys(barsSeen).length;

    // --- NOTATION: is each note DRAWN as the value it actually lasts? -----
    // The engine counts in beat-units. In 6/8 a beat is an eighth, so a
    // duration of 1 is worth half a quarter note. Drawing it as a quarter is
    // wrong on the page and — because playback reads the drawn value back —
    // twice as long in the ear as well.
    (r.phrase.bars||[]).forEach(function(bar,bi){
      (bar.beats||[]).forEach(function(be){
        (be.melodySequence||[]).forEach(function(ms){
          var drawn=QUARTERS[ms.duration];
          if(drawn===undefined){ glyphBad++; return; }
          // What the note is really worth, in quarters.
          var src=null;
          (r.mel.notes||[]).forEach(function(n){
            if(n.bar===bi&&Math.abs((Number(n.beat)||0)-(Number(ms.absBeat)||0)+bi*r.bpb)<1e-6) src=n;
          });
          if(!src) return;
          var trueQuarters=(Number(src.duration)||0)*(4/unit);
          var d=Math.abs(drawn-trueQuarters);
          if(d>0.01){
            notationBad++;
            if(d>worstNotation) worstNotation=d;
            if(!example) example=ts+' bar '+(bi+1)+': '+src.duration+' beat'
              +(src.duration===1?'':'s')+' = '+trueQuarters+' quarters, drawn as '
              +ms.duration+' ('+drawn+')';
          }
        });
      });
    });
  }

  totalBad+=arithBad+notationBad+glyphBad;
  rows.push({ts:ts,barQuarters:barQuarters,barsChecked:barsChecked,
    arithBad:arithBad,worstArith:worstArith,
    notationBad:notationBad,worstNotation:worstNotation,glyphBad:glyphBad,example:example});
});

function pad(s,n){s=String(s);while(s.length<n)s+=' ';return s;}
print('');
print('RHYTHM vs METRE');
print('');
print('  '+pad('metre',7)+pad('bar =',10)+pad('bars',7)+pad("overflow",10)+pad('worst',8)+pad("wrong value",15)+'worst');
rows.forEach(function(r){
  print('  '+pad(r.ts,7)+pad(r.barQuarters+' quarters',10)+pad(r.barsChecked,7)
    +pad(r.arithBad,10)+pad(r.worstArith?r.worstArith.toFixed(2):'-',8)
    +pad(r.notationBad,15)+(r.worstNotation?r.worstNotation.toFixed(2)+' quarters':'-'));
});
print('');
rows.forEach(function(r){ if(r.example) print('  e.g. '+r.example); });
rows.forEach(function(r){ if(r.glyphBad) print('  '+r.ts+': '+r.glyphBad+' durations the renderer has no glyph for'); });
// --- The name a value is written under must not change how long it lasts ----
// _durationToNumber feeds recordRendered, and recordRendered is what playback
// and MIDI export replay. Two naming conventions for the same values meant
// every dotted note resolved to the `|| 1` default there: drawn with its dot,
// sounded and exported as a plain quarter.
print('');
print('DURATION NAMES — both spellings, same length');
var nameBad=0;
[['whole',4],['half',2],['quarter',1],['eighth',0.5],['sixteenth',0.25],
 ['half_dotted',3],['dotted-half',3],
 ['quarter_dotted',1.5],['dotted-quarter',1.5],
 ['eighth_dotted',0.75],['dotted-eighth',0.75],
 ['whole_dotted',6],['dotted-whole',6],
 ['sixteenth_dotted',0.375],['dotted-sixteenth',0.375]].forEach(function(p){
  var got=sheetGen._durationToNumber(p[0]);
  if(Math.abs(got-p[1])>1e-9){
    nameBad++;
    print('    '+p[0]+': want '+p[1]+' quarters, got '+got);
  }
});
print('  '+(nameBad?nameBad+' names resolve to the wrong length':'all 15 spellings resolve correctly'));
totalBad+=nameBad;

print('');
print(totalBad===0?'PASS — every bar adds up, in every metre, and every value lasts what it says.'
                  :'FAIL — '+totalBad+' problems.');
// A HARNESS THAT CANNOT GO RED IS NOT A HARNESS.
// This printed its verdict and exited 0, so every runner that checks exit
// status reported it as passing whatever it had just found. Discovered when
// `accidentals-test.js` sat at 'FAILURES: 1' for a whole run without anyone
// noticing, and true of six of the fifteen harnesses at the time.
if (totalBad) throw new Error('rhythm-meter-test: '+totalBad+' problem(s)');
