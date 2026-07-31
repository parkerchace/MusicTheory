var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var console={log:function(){},warn:function(){},error:print};
var document={addEventListener:function(){},dispatchEvent:function(){},getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return{style:{},appendChild:function(){},setAttribute:function(){},addEventListener:function(){},classList:{add:function(){},remove:function(){},toggle:function(){}}};},body:{appendChild:function(){},removeChild:function(){}}};
var localStorage={getItem:function(){return null;},setItem:function(){}};var setTimeout=function(){};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js','functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js','voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js','piano-texture-engine.js','arc-ui-init.js'].forEach(load);
console.log=print;
var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.sheetMusicGenerator={state:{autoVoicingAll:true,voicingLogic:'smart',voicingRegister:'mid'}};
var W=['laur','en','lou','i','love','you'];
function build(key,scale,seed,colour){
  var notes=mt.getScaleNotesWithKeySignature(key,scale);
  var c={harmonicProfile:{root:key,recommendedScale:scale,scaleNotes:notes},overallEnergy:0.55,emotionalTone:'hopeful',globalTension:0.5,
   complexityControls:{rhythm:0.5,melody:0.5,color:colour,harmony:colour},
   wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
   metadata:{lexical:{perWordValues:[]}},form:null};
  var arc={bars:12,beatsPerBar:4,totalBeats:48,sample:function(t){return 0.3+0.5*Math.sin(Math.PI*t);}};
  c.form=planFormFor(c,null,seed,4);
  if(c.form&&c.form.bars){arc.bars=c.form.bars;arc.totalBeats=c.form.bars*4;}
  var h=generateHarmony(c,arc,seed);
  return {c:c,arc:arc,h:h,m:generateMelody(c,arc,h,seed)};
}
function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
var total=0,out=0,justified=0,unjustified={},roleOf={};
for(var s=0;s<25;s++){
  var r=build('D','dorian',s*37+5,0.7);
  var scalePcs=r.c.harmonicProfile.scaleNotes.map(pcOf);
  var bpb=4;
  (r.m.notes||[]).forEach(function(n){
    total++;
    var pc=pcOf(n.noteName); if(pc===null) return;
    if(scalePcs.indexOf(pc)>=0) return;
    out++;
    // is it justified? chord tone of the sounding chord, or in that bar's scale hint
    var beat=n.bar*bpb+n.beat;
    var ev=null;
    (r.h.chordSequence||[]).forEach(function(e){
      if(!e||!isFinite(e.bar))return;
      var st=e.bar*bpb+e.beat, en=st+(e.duration||bpb);
      if(beat>=st-1e-6&&beat<en-1e-6) ev=e;
    });
    var okChord=false, okHint=false;
    if(ev&&ev.chordObj){
      var t=(ev.chordObj.chordNotes||ev.chordObj.diatonicNotes||[]).map(pcOf);
      okChord=t.indexOf(pc)>=0;
    }
    if(ev&&ev.scaleHintNotes) okHint=ev.scaleHintNotes.map(pcOf).indexOf(pc)>=0;
    if(okChord||okHint) justified++;
    else {
      var k=n.noteName+' over '+(ev?ev.chord:'?')+'  role='+(n.role||'?');
      unjustified[k]=(unjustified[k]||0)+1;
      roleOf[n.role||'?']=(roleOf[n.role||'?']||0)+1;
    }
  });
}
print('D dorian, colour 0.7, 25 takes');
print('  melody notes: '+total);
print('  out of scale: '+out+' ('+(out/total*100).toFixed(1)+'%)');
print('  ...of those, justified by the sounding chord or a scale hint: '+justified);
print('  ...UNJUSTIFIED: '+(out-justified));
print('  unjustified by role: '+JSON.stringify(roleOf));
print('  top offenders:');
Object.keys(unjustified).sort(function(a,b){return unjustified[b]-unjustified[a];}).slice(0,10)
  .forEach(function(k){print('    x'+unjustified[k]+'  '+k);});


print('');
print('=== across keys/modes, and is the chromatic NEIGHBOUR still alive? ===');
[['D','dorian'],['C','major'],['A','aeolian'],['G','major'],['F','lydian'],['E','phrygian']].forEach(function(cfg){
  var tot=0,o=0,unj=0,neighbors=0,resolved=0;
  for(var s=0;s<15;s++){
    var r=build(cfg[0],cfg[1],s*53+9,0.7);
    var sp=r.c.harmonicProfile.scaleNotes.map(pcOf);
    var ns=r.m.notes||[];
    ns.forEach(function(n,i){
      tot++;
      var pc=pcOf(n.noteName); if(pc===null)return;
      if(n.role==='neighbor'&&sp.indexOf(pc)<0){
        // Does it RESOLVE — by pitch, a semitone step to a scale tone — rather
        // than carrying a particular role label? A label changes for reasons
        // that have nothing to do with whether the ear hears a resolution.
        neighbors++;
        var nx=ns[i+1];
        if(nx){
          var a=mt.noteValues[String(n.noteName).replace(/-?\d+$/,'')];
          var b=mt.noteValues[String(nx.noteName).replace(/-?\d+$/,'')];
          var am=(function(x){var mm=String(x).match(/^([A-G][#b]?)(-?\d+)$/);return mm?mt.noteValues[mm[1]]+(parseInt(mm[2],10)+1)*12:NaN;})(n.noteName);
          var bm=(function(x){var mm=String(x).match(/^([A-G][#b]?)(-?\d+)$/);return mm?mt.noteValues[mm[1]]+(parseInt(mm[2],10)+1)*12:NaN;})(nx.noteName);
          var npc=((b%12)+12)%12;
          if(Math.abs(bm-am)<=2 && sp.indexOf(npc)>=0) resolved++;
        }
      }
      if(sp.indexOf(pc)>=0) return;
      o++;
      var beat=n.bar*4+n.beat, ev=null;
      (r.h.chordSequence||[]).forEach(function(e){
        if(!e||!isFinite(e.bar))return;
        var st=e.bar*4+e.beat,en=st+(e.duration||4);
        if(beat>=st-1e-6&&beat<en-1e-6) ev=e;
      });
      var ok=false;
      if(ev&&ev.chordObj) ok=(ev.chordObj.chordNotes||ev.chordObj.diatonicNotes||[]).map(pcOf).indexOf(pc)>=0;
      if(!ok&&ev&&ev.scaleHintNotes) ok=ev.scaleHintNotes.map(pcOf).indexOf(pc)>=0;
      if(!ok) unj++;
    });
  }
  print('  '+(cfg[0]+' '+cfg[1]).padEnd(12)+' notes='+tot+'  outOfScale='+(o/tot*100).toFixed(1)+'%'
    +'  UNJUSTIFIED='+unj
    +'  chromatic neighbours='+neighbors+' (resolved immediately: '+resolved+')');
});
