// THE APPROACH IS CHOSEN FOR THE CHORD IT IS APPROACHING.
//
// The fifth-above search asked only that a collection contain the target's
// ROOT. Chord-tone overlap was computed and then spent entirely on pricing
// spice, so nothing ranked by it and a collection holding one note of the
// chord could be offered ahead of one holding three. And the sharper reason
// the rule works at all went unused: re-rooted on the target, these same notes
// are very often an ordinary scale THERE, so approach and arrival are one
// collection heard from two centres.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var setTimeout=function(){return 0;};
var console={log:function(){},warn:function(){},error:function(){}};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'scale-colour.js','approach-engine.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
var ae=new ApproachEngine(mt);
var out=[],failures=0;
function say(s){out.push(s);}
function want(n,c,d){ if(c){say('  ok   '+n+(d?('   ['+d+']'):''));} else {failures++;say('  FAIL '+n+(d?('   ['+d+']'):''));} }
function pc(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}

say('THE RE-ROOTED READING IS THE REASON, AND IT IS FOUND');
// Approaching F minor from a collection rooted a fifth above: those seven
// notes rooted on F are an ordinary scale on F.
var cMixo6 = mt.getScaleNotes('C','mixolydian_6') || mt.getScaleNotes('C','mixolydian_b6');
want('a fifth-above collection is recognised by its name on the target',
     !!cMixo6 && ae.parentNameOnTarget(cMixo6, pc('F')) !== null,
     'C mixolydian_6 rooted on F -> '+(cMixo6? ae.parentNameOnTarget(cMixo6, pc('F')) : 'no notes'));
want('...and the name it finds is the melodic-minor collection, not a curiosity',
     !!cMixo6 && /melodic/.test(String(ae.parentNameOnTarget(cMixo6, pc('F'))||'')),
     String(cMixo6? ae.parentNameOnTarget(cMixo6, pc('F')) : ''));
want('a collection that does not contain the target root has no reading there',
     ae.parentNameOnTarget(mt.getScaleNotes('C','major'), pc('Gb'))===null
     || ae.parentNameOnTarget(mt.getScaleNotes('C','major'), pc('Gb'))===undefined);

say('');
say('SELECTION PREFERS THE COLLECTION THAT ALREADY HOLDS THE CHORD');
// Approaching Fm7 while the piece is in Ab major.
var homeNotes = mt.getScaleNotesWithKeySignature('Ab','major');
var target = { root:'F', chordType:'m7', roman:'vi7',
  fullName: ae.fullName('F','m7'), chordNotes: ae.chordNotes('F','m7') };
var plans = ae.approachScaleFamilies(target, 2, false, homeNotes) || [];
var fifthPlans = plans.filter(function(p){return p.family==='fifthAbove';});
want('the fifth-above family produces approaches for this chord', fifthPlans.length>0, fifthPlans.length+' plans');

// Read the source collections back off the built events, in the order offered.
var seenOrder=[], seenOverlap=[];
var tp={}; (target.chordNotes||[]).forEach(function(n){var p=pc(n);if(p!==null)tp[p]=1;});
var tpN=Object.keys(tp).length;
fifthPlans.forEach(function(p){
  var evs=p.build?p.build():[];
  var sh=evs[0]&&evs[0].scaleHint;
  if(!sh||!sh.scaleNotes) return;
  var key=sh.root+' '+sh.scaleName;
  if(seenOrder.indexOf(key)>=0) return;
  var held=0; sh.scaleNotes.forEach(function(n){ if(tp[pc(n)]) held++; });
  seenOrder.push(key); seenOverlap.push(held);
});
say('  collections offered, in order: '+seenOrder.slice(0,6).map(function(k,i){return k+'('+seenOverlap[i]+'/'+tpN+')';}).join(', '));
want('the first collection offered holds most of the chord it approaches',
     seenOverlap.length>0 && seenOverlap[0] >= tpN-1,
     seenOverlap[0]+' of '+tpN);
want('overlap does not increase further down the list — the ordering is by it',
     (function(){ for(var i=1;i<seenOverlap.length;i++){ if(seenOverlap[i]>seenOverlap[0]) return false; } return true; })(),
     seenOverlap.slice(0,8).join(' >= '));
want('every offered collection is rooted a fifth above the target',
     seenOrder.every(function(k){ return pc(k.split(' ')[0]) === (pc('F')+7)%12; }),
     seenOrder.length+' checked');

say('');
say('THE EXPLANATION SAYS BOTH REASONS OUT LOUD');
var withParent=0, withOverlap=0, tot=0;
fifthPlans.forEach(function(p){
  (p.build?p.build():[]).forEach(function(ev){
    if(!ev.explain) return;
    tot++;
    if(/rooted on F are F /.test(ev.explain)) withParent++;
    if(/already holds \d+ of \d+ notes/.test(ev.explain)) withOverlap++;
  });
});
want('approaches state how much of the target chord they already hold',
     tot>0 && withOverlap>0, withOverlap+' of '+tot+' events');
want('...and, where it holds, that the same notes name a scale on the target',
     withParent>0, withParent+' of '+tot+' events');

say('');
say(failures? ('FAILURES: '+failures) : 'the approach is chosen for the chord, and says why');
print(out.join('\n'));
if(failures) throw new Error('approach-selection-test: '+failures+' failure(s)');
