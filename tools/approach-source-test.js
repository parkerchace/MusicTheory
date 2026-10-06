// WHERE THE COLLECTION IS ROOTED IS A CHOICE, AND EACH ROOTING HAS ITS CHORD.
//
// The approach mode had one rooting and a boolean that could only ADD a second
// to it. They are two devices, and which one fits depends on the quality of the
// chord being approached:
//
//   a major target  <- mixolydian a fifth above it. Re-rooted on the target
//                      those notes ARE its major scale, and it holds every
//                      chord tone, so preferring it only ever breaks a tie.
//   a minor target  <- the bebop collection on the target's OWN root, whose
//                      degree a step below the target is a diminished seventh
//                      a HALF STEP under the chord.
//
// These assertions are about those chords, not about a flag being read: the
// dim7 has to actually come out a half step below, the collection has to
// actually be a named one, and preferring a collection must never put one that
// holds two notes of the chord ahead of one that holds four.
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
function tgt(root,q){return {root:root,chordType:q,fullName:root+q,roman:'x'};}
function events(p){try{return p.build()||[];}catch(e){return [];}}

say('A MINOR CHORD IS APPROACHED FROM THE BEBOP COLLECTION ON ITS OWN ROOT');
var minors=['E','A','C#','Bb','F'];
var withDim=0, withheldBreaches=0, named=0;
minors.forEach(function(r){
  var plans=ae.approachScaleFamilies(tgt(r,'m7'),1.5,true,null,{source:'root',palette:'lands'});
  var mine=plans.filter(function(p){return String(p.id).indexOf('par:bebop_minor@')===0;});
  if(!mine.length) return;
  named++;
  // The collection has to be the real one, verified against the scale data.
  var notes=ae.scaleNotes(r,'bebop_minor')||[];
  var half=((pc(r)+11)%12);
  var sawDim=false;
  var tones=ae.chordNotes(r,'m7')||[];
  mine.forEach(function(p){
    events(p).forEach(function(ev){
      var q=String(ev.chordType||'');
      if(/dim7/.test(q) && pc(ev.root)===half) sawDim=true;
      // WHAT IS WITHHELD IS THE TARGET, NOT THE COLLECTION'S TONIC. Degree 1
      // of E bebop minor is Em6, which is a different chord from an Em7 target
      // and is half of the alternation worth borrowing the collection for.
      if(ae.sameChordNotes(ev.chordNotes||[],tones)) withheldBreaches++;
    });
  });
  if(sawDim) withDim++;
});
want('the bebop collection is offered for every minor target tried', named===minors.length,
     named+' of '+minors.length);
want('...and it puts a diminished seventh a HALF STEP BELOW the chord', withDim===minors.length,
     withDim+' of '+minors.length+' targets');
want('...while still never sounding the TARGET chord before the arrival',
     withheldBreaches===0, withheldBreaches+' breaches');

say('');
say('THE PREFERENCE NEVER OUTRANKS THE CHORD ITSELF');
// Pinning a collection must not put a major-flavoured one in front of
// collections that hold the whole minor chord.
var bad=0, checked=0;
['E','A','C#','Bb','F','G'].forEach(function(r){
  var plans=ae.approachScaleFamilies(tgt(r,'m7'),1.5,false,null,{source:'fifth',palette:'lands'});
  var seen={},order=[];
  plans.forEach(function(p){
    var m=/^fifth:([a-z0-9_]+)@/.exec(String(p.id));
    if(m&&!seen[m[1]]){seen[m[1]]=1;order.push(m[1]);}
  });
  if(order.length<2) return;
  checked++;
  var tones=ae.chordNotes(r,'m7')||[];
  var tp={};tones.forEach(function(n){tp[pc(n)]=1;});
  var fifth=mt.noteValues?Object.keys(mt.noteValues):[];
  function overlap(id){
    var ns=ae.scaleNotes(ae.chromatic[(pc(r)+7)%12],id)||[];
    var hit=0;Object.keys(tp).forEach(function(k){
      if(ns.some(function(n){return pc(n)===Number(k);})) hit++;});
    return hit;
  }
  if(overlap(order[0])<overlap(order[1])) bad++;
});
want('on a minor target the first collection still holds the most of the chord',
     bad===0, bad+' inversions over '+checked+' targets');

say('');
say('A MAJOR CHORD KEEPS THE FIFTH-ABOVE READING');
var mixoFirst=0, majTried=0, parentOk=0;
['C','F','Ab','D','B'].forEach(function(r){
  var plans=ae.approachScaleFamilies(tgt(r,'maj7'),1.5,false,null,{source:'fifth',palette:'lands'});
  var order=[],seen={};
  plans.forEach(function(p){
    var m=/^fifth:([a-z0-9_]+)@/.exec(String(p.id));
    if(m&&!seen[m[1]]){seen[m[1]]=1;order.push(m[1]);}
  });
  if(!order.length) return;
  majTried++;
  if(order[0]==='mixolydian') mixoFirst++;
  // the reason it is first: those notes rooted on the target are its own major
  var fifthNote=ae.chromatic[(pc(r)+7)%12];
  var ns=ae.scaleNotes(fifthNote,'mixolydian')||[];
  if(/major/.test(String(ae.parentNameOnTarget(ns,pc(r))||''))) parentOk++;
});
want('mixolydian a fifth above leads for a major target', mixoFirst===majTried,
     mixoFirst+' of '+majTried);
want('...and the reason holds: those notes on the target are its own major scale',
     parentOk===majTried, parentOk+' of '+majTried);

say('');
say('THE PALETTE DECIDES HOW WIDE THE LIBRARY OPENS');
function sizesOffered(pal){
  var plans=ae.approachScaleFamilies(tgt('E','m7'),1.5,true,null,{source:'both',palette:pal});
  var ids={};
  plans.forEach(function(p){
    var m=/^(?:fifth|par):([a-z0-9_]+)@/.exec(String(p.id));
    if(m) ids[m[1]]=1;
  });
  var eight=0;
  Object.keys(ids).forEach(function(id){
    var iv=(window.SCALES&&window.SCALES.intervals&&window.SCALES.intervals[id])||null;
    if(iv&&iv.length===8) eight++;
  });
  return {n:Object.keys(ids).length,eight:eight};
}
var sevens=sizesOffered('sevens'), lands=sizesOffered('lands'), all=sizesOffered('all');
want('seven-note only really excludes the eight-note collections', sevens.eight===0,
     sevens.eight+' eight-note of '+sevens.n);
want('...and the other palettes let them back in', lands.eight>0||all.eight>0,
     'lands '+lands.eight+', all '+all.eight);
want('everything offers at least as many collections as the pinned default',
     all.n>=lands.n, 'all '+all.n+' vs lands '+lands.n);

say('');
say('THE WALK IS GENERAL, NOT A CASE FOR ONE COLLECTION');
// A walk is a run of consecutive degrees of the borrowed collection landing
// next to the target. Nothing about it is specific to a scale: what differs is
// what each collection's own degrees happen to be.
var badStep=0, sangTarget=0, lens={}, distinct={};
['E','Bb','C#','G','F#'].forEach(function(r){
  var plans=ae.approachScaleFamilies(tgt(r,'m7'),2,true,null,{source:'root',palette:'all'});
  var tones=ae.chordNotes(r,'m7')||[];
  var tkey=tones.map(function(n){return pc(n);}).sort(function(a,b){return a-b;}).join(',');
  var ids={};
  plans.forEach(function(p){
    var m=/^par:([a-z0-9_]+)@/.exec(String(p.id));
    if(m) ids[m[1]]=1;
  });
  Object.keys(ids).forEach(function(id){
    var mine=plans.filter(function(p){return String(p.id).indexOf('par:'+id+'@')===0;});
    if(!mine.length) return;
    distinct[id]=1;
    mine.forEach(function(p){
      var ev=events(p);
      lens[ev.length]=(lens[ev.length]||0)+1;
      var ns=ae.scaleNotes(r,id)||[];
      ev.forEach(function(e){
        // every chord of the walk is a real degree of the collection it claims
        var inScale=(e.chordNotes||[]).every(function(n){
          return ns.some(function(x){return pc(x)===pc(n);});
        });
        if(!inScale) badStep++;
        // and none of them is the target chord
        var k=(e.chordNotes||[]).map(function(n){return pc(n);}).sort(function(a,b){return a-b;}).join(',');
        if(k===tkey) sangTarget++;
      });
    });
  });
});
want('many different collections yield walks, not just the pinned one',
     Object.keys(distinct).length>=10,
     Object.keys(distinct).length+' distinct collections walked');
want('every chord of every walk is a real degree of the collection it names',
     badStep===0, badStep+' strays');
want('no walk sounds the target chord before the arrival', sangTarget===0,
     sangTarget+' early arrivals');
want('walks come in a range of lengths, not one fixed shape',
     Object.keys(lens).length>=3, 'lengths offered: '+JSON.stringify(lens));
want('...and none of them outstays its welcome',
     Object.keys(lens).every(function(k){return Number(k)<=4;}),
     'longest '+Math.max.apply(null,Object.keys(lens).map(Number))+' chords');

say('');
say('THE COLLECTION\u2019S OWN TONIC CHORD IS ALLOWED WHEN IT IS NOT THE TARGET');
// The old rule refused degree 1 outright. It is a different chord from the
// target in a sixth-diminished collection \u2014 a sixth against a seventh \u2014 and
// it is half of what makes that collection worth borrowing.
var sawSixth=0, sawDimThenSixth=0;
['E','A','G','Bb'].forEach(function(r){
  var plans=ae.approachScaleFamilies(tgt(r,'m7'),2,true,null,{source:'root',palette:'lands'});
  plans.filter(function(p){return String(p.id).indexOf('par:bebop_minor@')===0;}).forEach(function(p){
    var ev=events(p);
    var last=ev[ev.length-1];
    if(last&&/m6|min6/.test(String(last.chordType||''))&&pc(last.root)===pc(r)) sawSixth++;
    for(var i=1;i<ev.length;i++){
      if(/dim7/.test(String(ev[i-1].chordType||'')) && pc(ev[i-1].root)===((pc(r)+11)%12)
         && pc(ev[i].root)===pc(r) && /m6|min6/.test(String(ev[i].chordType||''))) sawDimThenSixth++;
    }
  });
});
want('a walk may land on the collection\u2019s own sixth chord into the target',
     sawSixth>0, sawSixth+' walks end on it');
want('...giving the half-step dim7 resolving through it \u2014 the alternation',
     sawDimThenSixth>0, sawDimThenSixth+' dim7 -> m6 pairs');

say('');
say('...BUT NEVER WHEN THE COLLECTION IS ROOTED SOMEWHERE ELSE');
// The two rootings are not the same case and the rule cannot be the same rule.
//
// Rooted ON the target, the collection's tonic chord shares the target's own
// centre — Em6 into Em7 — so sounding it approaches rather than departs, and
// that alternation is the whole reason to borrow the collection. Rooted A
// FIFTH ABOVE, its tonic chord is a RIVAL centre: state it first and the chord
// after it is heard as belonging to the borrowed key rather than as pointing at
// the target. Approaching A7 in D major out of E major, the pair came out
// `Emaj7 -> B7` — I and V of E — so the approach tonicized E and then reached
// A7 from inside the key it had just invented.
//
// So the fifth-above family may PASS THROUGH degree 1 mid-walk, where it is a
// passing chord like any other, and may never OPEN on it, which is the position
// that states where the music is.
var fifthRuns=0, openedOnTonic=0, passedThrough=0, notConsecutive=0, unreadableDeg=0, offenders=[];
['A','D','G','C','F','Bb','E'].forEach(function(r){
  ['7','maj7','m7'].forEach(function(q){
    var plans=ae.approachScaleFamilies(tgt(r,q),2,false,null,{source:'fifth',palette:'lands'});
    plans.filter(function(p){return String(p.id).indexOf('fifth:')===0;}).forEach(function(p){
      var ev=events(p);
      if(!ev.length) return;
      fifthRuns++;
      var sh=ev[0].scaleHint||{};
      var colRootPc=pc(sh.root);
      if(colRootPc!==null && pc(ev[0].root)===colRootPc){
        openedOnTonic++;
        if(offenders.length<4) offenders.push(ev.map(function(x){return x.fullName;}).join(' -> ')
          +' -> '+r+q+'  ['+sh.root+' '+sh.scaleName+']');
      }
      for(var i=1;i<ev.length;i++) if(colRootPc!==null && pc(ev[i].root)===colRootPc) passedThrough++;
      // and the walk really is consecutive degrees of that collection.
      // The degree is carried in `roman`, as "3/E mixolydian" — there is no
      // scaleDegree field, and reading one gives NaN at every position, which
      // makes the check pass or fail for reasons that have nothing to do with
      // the music.
      var degs=ev.map(function(x){
        var m=String(x.roman||'').match(/^(\d+)\//); return m? Number(m[1]) : NaN; });
      var size=(sh.scaleNotes||[]).length||7;
      if(degs.some(function(d){return !isFinite(d);})) { unreadableDeg++; }
      else for(var j=1;j<degs.length;j++){
        var step=((degs[j]-degs[j-1])%size+size)%size;
        if(step!==1 && step!==size-1) { notConsecutive++; break; }
      }
    });
  });
});
want('a fifth-above approach NEVER opens on the borrowed collection’s tonic chord',
     fifthRuns>0 && openedOnTonic===0,
     openedOnTonic+' of '+fifthRuns+' opened on it'+(offenders.length? ' — e.g. '+offenders[0]:''));
want('...though a walk may still pass through it on the way in',
     passedThrough>0, passedThrough+' walks pass through degree 1 mid-run');
want('every fifth-above walk is consecutive degrees of its collection',
     notConsecutive===0 && unreadableDeg===0,
     notConsecutive+' of '+fifthRuns+' skip a degree, '+unreadableDeg+' unreadable');

say('');
if(failures) say('FAILURES: '+failures);
else say('each rooting brings its own chord, and preferring one never overrules the chord');
print(out.join('\n'));
if(failures) throw new Error('approach-source-test: '+failures+' failure(s)');
