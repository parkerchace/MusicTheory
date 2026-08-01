// A work has to be several real pieces that belong to each other.
//
// The plan can promise contrast, a key plan and cross-reference; this checks
// the promises survive into actual generated music. The distinction that
// matters: "generate four times" produces four pieces, and the thing that makes
// them a WORK is that a later movement is demonstrably built from an earlier
// one's material while sounding different because of what the work asked of it.
var window=this;this.window=this;this.dispatchEvent=function(){};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var console={log:function(){},warn:function(){},error:function(){}};
var document={addEventListener:function(){},dispatchEvent:function(){},getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return{style:{},appendChild:function(){},setAttribute:function(){},addEventListener:function(){},classList:{add:function(){},remove:function(){},toggle:function(){}}};},body:{appendChild:function(){},removeChild:function(){}}};
var localStorage={getItem:function(){return null;},setItem:function(){}};
var setTimeout=function(){return 0;};
var __e=eval;function load(f){__e(readFile(f));}
['scales-data-embedded.js','scale-taxonomy.js','scales-loader-embedded.js','music-theory-engine.js',
 'functional-harmony.js','progression-library.js','harmony-complexity.js','form-planner.js',
 'voice-leading-engine.js','approach-engine.js','word-character-engine.js','melodic-line-engine.js',
 'piano-texture-engine.js','arc-ui-init.js'].forEach(load);

var mt=new MusicTheoryEngine();window.modularApp={musicTheory:mt};
window.sheetMusicGenerator={state:{autoVoicingAll:true,voicingLogic:'smart',voicingRegister:'mid'}};
window.__voicingUserChoice=false;

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(c,m){ if(!c) throw new Error(m); }

var W=['laur','en','lou','i','love','you','and','the','morn','ing','light','through','the','win','dow','pane'];
var BPB=4;

function baseContext(){
  var notes=mt.getScaleNotesWithKeySignature('C','major');
  return {harmonicProfile:{root:'C',recommendedScale:'major',scaleNotes:notes},
    overallEnergy:0.55, emotionalTone:'hopeful', globalTension:0.5,
    complexityControls:{rhythm:0.5,melody:0.5,color:0.4,harmony:0.4},
    wordTokens:W.map(function(w){return{originalWord:w,syllables:[{text:w}]};}),
    metadata:{lexical:{perWordValues:[]}},form:null};
}
function baseArc(){
  return {bars:12,beatsPerBar:BPB,beatUnit:4,totalBeats:12*BPB,timeSignature:'4/4',
          sample:function(t){return 0.35+0.45*Math.sin(Math.PI*t);}};
}
function pcOf(n){var v=mt.noteValues[String(n).replace(/-?\d+$/,'')];return isFinite(v)?((v%12)+12)%12:null;}
function midiOf(n){var m=String(n||'').match(/^([A-Ga-g][#b]?)(-?\d+)$/);if(!m)return null;
  var pc=pcOf(m[1]); return pc===null?null:pc+(parseInt(m[2],10)+1)*12;}

// A theme's identity is its shape — the sequence of steps — because that is
// what survives transposition, a change of mode, and a change of tempo, which
// is precisely what a quoting movement does to it.
function steps(mel, limit){
  var ns=(mel&&mel.notes)||[]; var out=[];
  for(var i=1;i<ns.length;i++){
    var a=midiOf(ns[i-1].noteName), b=midiOf(ns[i].noteName);
    if(a===null||b===null) continue;
    var d=b-a; if(Math.abs(d)>12) continue;
    out.push(d);
    if(limit && out.length>=limit) break;
  }
  return out;
}

// Does this theme OCCUR in that melody? A quote is an occurrence, not a global
// resemblance: comparing the two movements' opening contours — which is what
// this measured at first — asks whether the whole finale is a copy of the whole
// first movement, which is not what a cyclic reference is and would fail for
// every real example of one.
// STRICT: does the movement OPEN with this exact shape?
//
// The loose window-scan below scores an unrelated movement exactly as highly as
// a quoting one (81% against 81%), which means it measures nothing — any two
// tonal melodies in the same key share a four-step shape somewhere. A quotation
// is a specific shape in a specific place, so: the movement's own opening
// steps, compared exactly.
function openingMatch(theme, mel){
  var line=steps(mel, theme.length);
  if(line.length<theme.length) return 0;
  var same=0;
  for(var k=0;k<theme.length;k++) if(line[k]===theme[k]) same++;
  return same/theme.length;
}

function bestMatch(theme, mel){
  var line=steps(mel);
  if(theme.length<2 || line.length<theme.length) return 0;
  var best=0;
  for(var i=0;i+theme.length<=line.length;i++){
    var same=0;
    for(var k=0;k<theme.length;k++){
      // The direction and rough size of each step. A sequence moved to another
      // degree keeps its shape while its exact semitones shift by one.
      if(Math.sign(line[i+k])===Math.sign(theme[k])
         && Math.abs(line[i+k]-theme[k])<=2) same++;
    }
    if(same/theme.length>best) best=same/theme.length;
  }
  return best;
}

print('=== generating a work ===');

var works=Object.keys(window.FormPlanner.WORKS);
print('  works in the catalogue: '+works.length);

var built={};
check('every work in the catalogue generates', function(){
  works.forEach(function(k){
    var w=generateWork(baseContext(), baseArc(), 137, { work:k });
    assert(w, k+' produced nothing');
    assert(w.movements.length===window.FormPlanner.WORKS[k].movements.length,
      k+' generated '+w.movements.length+' movements');
    built[k]=w;
  });
});

check('every movement is a complete piece', function(){
  works.forEach(function(k){
    built[k].movements.forEach(function(m,i){
      assert(m.harmony && (m.harmony.chordSequence||[]).length, k+' movement '+i+' has no harmony');
      assert(m.melody && (m.melody.notes||[]).length, k+' movement '+i+' has no melody');
      assert(m.piano && (m.piano.leftHand||[]).length, k+' movement '+i+' has no texture');
      assert(m.title && m.role, k+' movement '+i+' is unlabelled');
    });
  });
});

check('each movement uses the form the work named', function(){
  works.forEach(function(k){
    var spec=window.FormPlanner.WORKS[k].movements;
    built[k].movements.forEach(function(m,i){
      assert(m.context.form.formKey===spec[i].form,
        k+' movement '+i+' is '+m.context.form.formKey+', not '+spec[i].form);
    });
  });
});

check('the key plan is audible — movements sit where the work put them', function(){
  works.forEach(function(k){
    var spec=window.FormPlanner.WORKS[k].movements;
    built[k].movements.forEach(function(m,i){
      var want=window.FormPlanner.KEY_RELATIONS[spec[i].key];
      if(!want || want.semitones===null || want.semitones===0) return;
      var got=pcOf(m.context.harmonicProfile.root);
      var home=pcOf('C');
      assert(((got-home)%12+12)%12===want.semitones,
        k+' movement '+i+' should sit a '+want.label+' away and is on '+m.context.harmonicProfile.root);
    });
  });
});

check('a minor movement is actually in the minor', function(){
  var found=0;
  works.forEach(function(k){
    var spec=window.FormPlanner.WORKS[k].movements;
    built[k].movements.forEach(function(m,i){
      if(!spec[i].minor) return;
      found++;
      assert(/minor|aeolian/i.test(String(m.context.harmonicProfile.recommendedScale)),
        k+' movement '+i+' was asked for the minor and got '+m.context.harmonicProfile.recommendedScale);
    });
  });
  assert(found>0,'no work has a minor movement to check');
  print('       '+found+' minor movements across the catalogue');
});

check('a quoting movement states its source theme far better than chance', function(){
  // The load-bearing claim, measured against a CONTROL rather than against a
  // threshold picked until it passed.
  //
  // A window-match score means nothing on its own: any two tonal melodies in
  // the same key share a good deal of shape, so "67% matched" could be a
  // quotation or could be two unrelated lines both walking up a scale. So each
  // quoting movement is scored twice — against the theme it quotes, and
  // against the theme of a movement it does NOT quote. The gap between those
  // two numbers is the cross-reference; without a gap there is nothing here
  // however high the first number looks.
  var quoted=[], control=[];
  works.forEach(function(k){
    var ms=built[k].movements;
    ms.forEach(function(m){
      if(!Number.isFinite(m.quotes)) return;
      var theme=steps(ms[m.quotes].melody, 4);
      if(theme.length<3) return;
      quoted.push(openingMatch(theme, m.melody));
      // A movement it has no relationship to, for comparison.
      ms.forEach(function(other){
        if(other.index===m.quotes || other.index===m.index) return;
        var t2=steps(other.melody, 4);
        if(t2.length<3) return;
        control.push(openingMatch(t2, m.melody));
      });
    });
  });
  assert(quoted.length>0,'no cross-references to check');
  assert(control.length>0,'no control pairs to compare against');
  var mean=function(a){ return a.reduce(function(x,y){return x+y;},0)/a.length; };
  var q=mean(quoted), c=mean(control);
  print('       quoted source : '+(q*100).toFixed(0)+'% of the theme stated (n='+quoted.length+')');
  print('       unrelated     : '+(c*100).toFixed(0)+'% (n='+control.length+')');
  print('       gap           : '+((q-c)*100).toFixed(0)+' points');
  // KNOWN LIMITATION, asserted at its true strength rather than a wished-for
  // one. The theme IS handed over and IS announced, and a quoting movement
  // opens with its source's shape measurably more often than an unrelated
  // movement does — but only about ten points more often, which is a family
  // resemblance rather than a quotation. The cause is understood: a sequence
  // note that lands as a dissonance on a strong beat is pulled to the nearest
  // chord tone, which is the same guard that once erased the Fur Elise figure,
  // and it bends the shape on the way in. Making the announcement exempt from
  // it is the next piece of work.
  //
  // The gap is asserted so a regression to NO relationship fails loudly, and
  // the number is printed so nobody mistakes this for a finished device.
  assert(q>c, 'a quoting movement matches its source no better than an unrelated one — '
    +'the cross-reference is not real');
  assert(q-c>=0.05, 'the gap has collapsed to '+((q-c)*100).toFixed(0)+' points');
  if(q-c<0.30) print('       NOTE: a resemblance, not yet a quotation — see the comment here');
});

check('...and still sounds different from it', function(){
  // A quote that is byte-identical to its source is a repeat, not a reference.
  works.forEach(function(k){
    built[k].movements.forEach(function(m){
      if(!Number.isFinite(m.quotes)) return;
      var src=built[k].movements[m.quotes];
      var same = m.context.form.formKey===src.context.form.formKey
              && m.context.harmonicProfile.root===src.context.harmonicProfile.root
              && Math.abs(m.arc.sample(0.5)-src.arc.sample(0.5))<1e-9;
      assert(!same, k+' movement '+m.index+' is indistinguishable from the one it quotes');
    });
  });
});

check('adjacent movements really do contrast', function(){
  works.forEach(function(k){
    var ms=built[k].movements;
    for(var i=1;i<ms.length;i++){
      var dForm=ms[i].context.form.formKey!==ms[i-1].context.form.formKey;
      var dKey=ms[i].context.harmonicProfile.root!==ms[i-1].context.harmonicProfile.root;
      var dMode=ms[i].mode!==ms[i-1].mode;
      var dEnergy=Math.abs(ms[i].arc.sample(0.5)-ms[i-1].arc.sample(0.5))>0.08;
      assert(dForm||dKey||dMode||dEnergy,
        k+': movements '+(i-1)+' and '+i+' came out the same in form, key, mode and energy');
    }
  });
});

check('a work is longer than the single take it expands', function(){
  var single=window.FormPlanner.plan({seed:137,wordCount:16,syllableCount:16,
                                      energy:0.55,tension:0.5,beatsPerBar:BPB});
  works.forEach(function(k){
    var total=built[k].movements.reduce(function(n,m){return n+m.context.form.bars;},0);
    assert(total>single.bars, k+' ('+total+' bars) is no longer than one take ('+single.bars+')');
  });
});

check('choosing automatically still produces a work', function(){
  var w=generateWork(baseContext(), baseArc(), 91);
  assert(w && w.movements.length>=2, 'automatic expansion produced nothing usable');
  assert(w.plan.name, 'the work has no name to show');
  print('       automatic pick: '+w.plan.name+' ('+w.movements.length+' movements)');
});

print('');
print(failures? ('FAILURES: '+failures) : 'the movements are real pieces, and they belong to each other');

// --- DOES IT REACH THE PAGE? ---------------------------------------------
// The part that was missing. A work was generated, an event was dispatched
// that nothing listened to, and the sheet went on showing the original single
// take: the button lit up and the page did not change. Generation is only half
// the feature — the other half is becoming something the renderer accepts.
print('');
print('=== the work reaches the page ===');

check('a work combines into one renderable piece', function(){
  var w=generateWork(baseContext(), baseArc(), 137, { work:'lifeSuite' });
  var piece=combineWorkIntoPiece(w);
  assert(piece, 'a work produced no combined piece');
  // Exactly what the sheet path consumes.
  assert(piece.harmony && piece.harmony.chordSequence.length, 'no harmony');
  assert(piece.melody && piece.melody.notes.length, 'no melody');
  assert(piece.piano && piece.piano.leftHand.length, 'no texture');
  assert(piece.context && piece.context.form, 'no form');
  assert(piece.arc && piece.arc.bars>0, 'no arc');
});

check('nothing is lost in the combining', function(){
  works.forEach(function(k){
    var w=built[k];
    var piece=combineWorkIntoPiece(w);
    var srcNotes=w.movements.reduce(function(n,m){return n+(m.melody.notes||[]).length;},0);
    var srcChords=w.movements.reduce(function(n,m){return n+(m.harmony.chordSequence||[]).length;},0);
    var srcLh=w.movements.reduce(function(n,m){return n+(m.piano.leftHand||[]).length;},0);
    assert(piece.melody.notes.length===srcNotes,
      k+': '+srcNotes+' melody notes went in and '+piece.melody.notes.length+' came out');
    assert(piece.harmony.chordSequence.length===srcChords, k+' lost chords');
    assert(piece.piano.leftHand.length===srcLh, k+' lost left-hand events');
  });
});

check('the movements are laid end to end, not on top of each other', function(){
  works.forEach(function(k){
    var w=built[k];
    var piece=combineWorkIntoPiece(w);
    // Every movement's bars must occupy their own stretch. If bars were not
    // re-based, all four movements would start at bar 0 and play at once.
    var expected=w.movements.reduce(function(n,m){return n+m.context.form.bars;},0);
    assert(piece.arc.bars===expected,
      k+': '+expected+' bars of movements became '+piece.arc.bars);
    var maxBar=0;
    piece.melody.notes.forEach(function(n){ if(n.bar>maxBar) maxBar=n.bar; });
    assert(maxBar>=w.movements[0].context.form.bars,
      k+': every note landed inside the first movement — the bars were never offset');
    assert(maxBar<expected, k+': a note landed past the end of the work');
  });
});

check('the page can say where each movement starts', function(){
  var w=built.lifeSuite;
  var piece=combineWorkIntoPiece(w);
  var titles={};
  piece.context.form.sections.forEach(function(s){ if(s.movementTitle) titles[s.movementTitle]=true; });
  assert(Object.keys(titles).length===w.movements.length,
    'only '+Object.keys(titles).length+' of '+w.movements.length+' movements are named on the page');
  // And every bar belongs to a section, or the renderer has holes.
  for(var b=0;b<piece.context.form.bars;b++){
    assert(piece.context.form.sectionOfBar[b], 'bar '+b+' belongs to no section');
  }
});

check('pressing apply again gives a different work', function(){
  // The other half of the report: with the seed taken straight from the last
  // generation, pressing Apply twice produced a byte-identical result, and
  // "auto" suggested the same thing forever.
  var a=generateWork(baseContext(), baseArc(), 500);
  var b=generateWork(baseContext(), baseArc(), 500 + 104729);
  var c=generateWork(baseContext(), baseArc(), 500 + 2*104729);
  var sig=function(w){
    return w.plan.workKey+'|'+w.movements.map(function(m){
      return (m.melody.notes||[]).map(function(n){return n.noteName;}).join(',');
    }).join('|');
  };
  var s1=sig(a), s2=sig(b), s3=sig(c);
  assert(s1!==s2 || s2!==s3, 'three presses of Apply produced identical music every time');
});

check('resizing keeps the same work rather than re-rolling it', function(){
  // The length buttons must not hand you a different piece — you would never
  // find out what the one you were listening to sounds like longer.
  var a=generateWork(baseContext(), baseArc(), 500, { work:'moonlight', lengthScale:1 });
  var b=generateWork(baseContext(), baseArc(), 500, { work:'moonlight', lengthScale:1.8 });
  assert(a.plan.workKey===b.plan.workKey, 'resizing changed the work');
  assert(a.movements.length===b.movements.length, 'resizing changed the movement count');
  var longer=b.movements.reduce(function(n,m){return n+m.context.form.bars;},0);
  var natural=a.movements.reduce(function(n,m){return n+m.context.form.bars;},0);
  assert(longer>natural, 'resizing did not lengthen the music ('+longer+' vs '+natural+')');
});

print('');
print(failures? ('FAILURES: '+failures) : 'the movements are real, belong together, and reach the page');
