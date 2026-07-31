// The catalogue has to be reachable, correct, and organised.
//
// Adding forms to a table proves nothing on its own: the selector was a ladder
// of if/else over eight names, so a catalogue of thirty would have left
// twenty-two of them unreachable — a menu nobody can order from. And a WORK is
// only a work if its movements are about each other, which is three specific,
// checkable things: contrast, a key plan that closes, and cross-reference.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var __e=eval;function load(f){__e(readFile(f));}
load('form-planner.js');
var FP=window.FormPlanner;

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(c,m){ if(!c) throw new Error(m); }

print('=== the form catalogue ===');

var keys=Object.keys(FP.FORMS);
print('  forms: '+keys.length);

check('every form is structurally complete', function(){
  keys.forEach(function(k){
    var f=FP.FORMS[k];
    assert(f.name, k+' has no name');
    assert(f.description, k+' has no description');
    assert(Array.isArray(f.sections) && f.sections.length>=2, k+' has fewer than two sections');
    assert(typeof f.climax==='number' && f.climax>0 && f.climax<1, k+' has no usable climax point');
    f.sections.forEach(function(s,i){
      assert(s.letter, k+' section '+i+' has no letter');
      assert(s.theme, k+' section '+i+' names no material');
      assert(s.key, k+' section '+i+' has no key relation');
      assert(FP.KEY_RELATIONS[s.key], k+' section '+i+' uses unknown key relation '+s.key);
      assert(['stable','transitional','developmental'].indexOf(s.stability)>=0,
        k+' section '+i+' has odd stability '+s.stability);
      assert(s.cadence, k+' section '+i+' has no cadence');
    });
  });
});

check('every form belongs to a named family', function(){
  keys.forEach(function(k){
    var fam=FP.familyOf(k);
    assert(fam && fam!=='other', k+' has no family');
    assert(FP.FAMILY_LABELS[fam], 'family '+fam+' ('+k+') has no label');
  });
});

check('the catalogue groups without losing anything', function(){
  var listed=0;
  FP.listForms().forEach(function(g){
    assert(g.label, 'family '+g.family+' has no label');
    listed+=g.forms.length;
  });
  assert(listed===keys.length, 'listForms shows '+listed+' of '+keys.length+' forms');
});

check('a form that says a theme returns actually returns it', function(){
  keys.forEach(function(k){
    var f=FP.FORMS[k];
    var letters={};
    f.sections.forEach(function(s){ (letters[s.letter]=letters[s.letter]||[]).push(s.theme); });
    Object.keys(letters).forEach(function(L){
      var themes=letters[L];
      // The same letter twice must be the same MATERIAL, or the letter is lying.
      themes.forEach(function(t){
        assert(t===themes[0], k+': letter '+L+' names two different materials ('+themes.join(', ')+')');
      });
    });
  });
});

check('every form is reachable from the picker', function(){
  // The real test of a catalogue: drive the actual selector across the space of
  // inputs it responds to and see which forms it can produce.
  var seen={};
  for(var seed=0;seed<900;seed++){
    for(var mi=0; mi<5; mi++){
      var syll=[4,10,16,26,40][mi];
      var p=FP.plan({ seed:seed, wordCount:Math.max(1,Math.round(syll/2)), syllableCount:syll,
                      energy:(seed%10)/10, tension:((seed*7)%10)/10, beatsPerBar:4 });
      seen[p.formKey]=(seen[p.formKey]||0)+1;
    }
  }
  var unreachable=keys.filter(function(k){ return !seen[k]; });
  print('       reached '+Object.keys(seen).length+' of '+keys.length+' forms');
  assert(unreachable.length===0, 'never produced: '+unreachable.join(', '));
});

check('a named form is honoured exactly', function(){
  keys.forEach(function(k){
    window.__formOverride={ form:k };
    var p=FP.plan({ seed:5, wordCount:8, syllableCount:20, energy:0.5, tension:0.5, beatsPerBar:4 });
    assert(p.formKey===k, 'asked for '+k+' and got '+p.formKey);
    assert(p.sections.length===FP.FORMS[k].sections.length,
      k+' planned '+p.sections.length+' sections for a form with '+FP.FORMS[k].sections.length);
  });
  window.__formOverride=null;
});

check('every plan covers all of its bars, with no gaps', function(){
  keys.forEach(function(k){
    window.__formOverride={ form:k };
    var p=FP.plan({ seed:11, wordCount:9, syllableCount:24, energy:0.6, tension:0.5, beatsPerBar:4 });
    assert(p.bars>0, k+' planned zero bars');
    for(var b=0;b<p.bars;b++){
      assert(p.sectionOfBar[b], k+' bar '+b+' belongs to no section');
    }
    var last=p.sections[p.sections.length-1];
    assert(last.endBar===p.bars-1, k+' last section ends at '+last.endBar+' of '+p.bars+' bars');
  });
  window.__formOverride=null;
});

// =========================================================================
print('');
print('=== works ===');

var wkeys=Object.keys(FP.WORKS);
print('  works: '+wkeys.length);

check('every work names forms that exist', function(){
  wkeys.forEach(function(k){
    var w=FP.WORKS[k];
    assert(w.movements.length>=2, k+' has fewer than two movements');
    w.movements.forEach(function(m,i){
      assert(FP.FORMS[m.form], k+' movement '+i+' names unknown form '+m.form);
      assert(FP.KEY_RELATIONS[m.key], k+' movement '+i+' names unknown key '+m.key);
      assert(m.title && m.role, k+' movement '+i+' has no title or role');
    });
  });
});

check('adjacent movements contrast', function(){
  // A movement that feels like the one before it makes that one sound longer,
  // not richer. Contrast in ENERGY is the minimum: two adjacent movements must
  // differ by something audible.
  wkeys.forEach(function(k){
    var ms=FP.WORKS[k].movements;
    for(var i=1;i<ms.length;i++){
      var dE=Math.abs(ms[i].energy-ms[i-1].energy);
      var dMode=(!!ms[i].minor)!==(!!ms[i-1].minor);
      var dForm=ms[i].form!==ms[i-1].form;
      assert(dE>=0.15 || dMode || dForm,
        k+': movements '+(i-1)+' and '+i+' are too alike (dEnergy '+dE.toFixed(2)+')');
    }
  });
});

check('every work comes home', function(){
  wkeys.forEach(function(k){
    var ms=FP.WORKS[k].movements;
    assert(ms[0].key==='I' || ms[0].key==='i', k+' does not start at home ('+ms[0].key+')');
    var last=ms[ms.length-1];
    assert(last.key==='I' || last.key==='i', k+' ends in the '+last.key+' rather than at home');
  });
});

check('every work cross-references itself', function(){
  // This is the line between a work and a playlist.
  wkeys.forEach(function(k){
    var ms=FP.WORKS[k].movements;
    var refs=ms.filter(function(m){ return Number.isFinite(m.quotes); });
    assert(refs.length>=1, k+' has no movement that takes material from another — it is a playlist');
    refs.forEach(function(m,i){
      var idx=ms.indexOf(m);
      assert(m.quotes<idx, k+': movement '+idx+' quotes movement '+m.quotes+', which comes later');
      assert(m.how, k+': movement '+idx+' quotes without saying what happens to the material');
    });
  });
});

check('planWork returns a real plan per movement', function(){
  wkeys.forEach(function(k){
    var w=FP.planWork({ seed:3, work:k, wordCount:12, syllableCount:30,
                        energy:0.5, tension:0.5, beatsPerBar:4 });
    assert(w.workKey===k, 'asked for '+k+' and got '+w.workKey);
    assert(w.movements.length===FP.WORKS[k].movements.length, k+' lost a movement');
    w.movements.forEach(function(m,i){
      assert(m.form && m.form.sections && m.form.sections.length, k+' movement '+i+' has no form plan');
      assert(m.form.formKey===FP.WORKS[k].movements[i].form,
        k+' movement '+i+' planned '+m.form.formKey+' instead of '+FP.WORKS[k].movements[i].form);
      assert(m.form.bars>0, k+' movement '+i+' has no bars');
      assert(m.explain && m.explain.length>20, k+' movement '+i+' does not explain itself');
    });
    assert(w.totalBars===w.movements.reduce(function(n,m){return n+m.form.bars;},0), k+' miscounts its bars');
    assert(w.crossReferences.length>=1, k+' reports no cross-references');
  });
});

check('the work chosen without being named suits the material', function(){
  // A short text does not become a five-song cycle because a button was pressed.
  var shortW=FP.planWork({ seed:2, wordCount:2, syllableCount:4, energy:0.5, tension:0.5, beatsPerBar:4 });
  assert(shortW.movements.length<=3,
    'a four-syllable text produced '+shortW.movements.length+' movements ('+shortW.workKey+')');
  var longW=FP.planWork({ seed:2, wordCount:20, syllableCount:48, energy:0.6, tension:0.6, beatsPerBar:4 });
  assert(longW.movements.length>=2, 'a long text produced only '+longW.movements.length+' movement');
});

check('every work is reachable when not named', function(){
  var seen={};
  for(var seed=0;seed<600;seed++){
    [6,18,40].forEach(function(syll){
      var w=FP.planWork({ seed:seed, wordCount:Math.max(1,Math.round(syll/2)), syllableCount:syll,
                          energy:(seed%10)/10, tension:((seed*3)%10)/10, beatsPerBar:4 });
      seen[w.workKey]=true;
    });
  }
  var missing=wkeys.filter(function(k){ return !seen[k]; });
  print('       reached '+Object.keys(seen).length+' of '+wkeys.length+' works');
  assert(missing.length===0, 'never produced: '+missing.join(', '));
});

print('');
print(failures? ('FAILURES: '+failures) : 'the catalogue is complete, organised and reachable');

// --- LONGER / SHORTER ----------------------------------------------------
// A length control that quietly does nothing is the worst kind: the button
// moves, the readout changes, and the music is identical. So: does it change
// the bars, does it keep the form's proportions, and does shorter undo longer?
print('');
print('=== length ===');

check('longer is longer and shorter is shorter, for every work', function(){
  wkeys.forEach(function(k){
    var natural=FP.planWork({seed:7,work:k,wordCount:12,syllableCount:30,
                             energy:0.5,tension:0.5,beatsPerBar:4});
    var longer=FP.planWork({seed:7,work:k,wordCount:12,syllableCount:30,
                            energy:0.5,tension:0.5,beatsPerBar:4,lengthScale:1.8});
    var shorter=FP.planWork({seed:7,work:k,wordCount:12,syllableCount:30,
                             energy:0.5,tension:0.5,beatsPerBar:4,lengthScale:0.6});
    assert(longer.totalBars>natural.totalBars,
      k+': longer gave '+longer.totalBars+' bars against a natural '+natural.totalBars);
    assert(shorter.totalBars<natural.totalBars,
      k+': shorter gave '+shorter.totalBars+' bars against a natural '+natural.totalBars);
  });
});

check('the work keeps its shape at any length', function(){
  // Lengthening must not turn a four-movement work into a three-movement one,
  // nor change which forms its movements use.
  wkeys.forEach(function(k){
    var a=FP.planWork({seed:7,work:k,wordCount:12,syllableCount:30,
                       energy:0.5,tension:0.5,beatsPerBar:4});
    [0.5,0.7,1.4,2.2].forEach(function(scale){
      var b=FP.planWork({seed:7,work:k,wordCount:12,syllableCount:30,
                         energy:0.5,tension:0.5,beatsPerBar:4,lengthScale:scale});
      assert(b.movements.length===a.movements.length,
        k+' at '+scale+'x lost a movement');
      b.movements.forEach(function(m,i){
        assert(m.form.formKey===a.movements[i].form.formKey,
          k+' at '+scale+'x changed movement '+i+' from '+a.movements[i].form.formKey
          +' to '+m.form.formKey);
        assert(m.form.sections.length===a.movements[i].form.sections.length,
          k+' at '+scale+'x changed movement '+i+"'s section count");
      });
    });
  });
});

check('proportions survive: a transition stays shorter than its theme', function(){
  // Scaling the TOTAL would flatten this the moment rounding got involved,
  // which is why the scale is applied to the section weights instead.
  window.__formOverride={form:'sonata'};
  var natural=FP.plan({seed:4,wordCount:14,syllableCount:36,energy:0.6,tension:0.6,beatsPerBar:4});
  var idxT=natural.sections.findIndex(function(s){return /transition/.test(s.role||'');});
  var idxP=natural.sections.findIndex(function(s){return /first subject/.test(s.role||'');});
  assert(idxT>=0&&idxP>=0,'could not find the sections to compare');
  // Ordering alone is too weak a claim — adding a constant to every section
  // keeps the transition shorter than the theme while flattening the
  // difference between them, which is exactly what scaling the total does. The
  // RATIO is the thing being preserved, so the ratio is what gets checked.
  // Measured at the LONG end. Multiplicative and additive scaling look alike
  // near 1x — the difference only opens up once there is real length to
  // distribute — and at the SHORT end the two-bar floor legitimately compresses
  // every ratio toward 1, so testing there would fail correct code.
  var ratios=[];
  [1,1.35,1.8,2.4,3].forEach(function(scale){
    var p=FP.plan({seed:4,wordCount:14,syllableCount:36,energy:0.6,tension:0.6,
                   beatsPerBar:4,__scaleBars:scale});
    var t=p.sections[idxT], f=p.sections[idxP];
    var tBars=t.endBar-t.startBar+1, fBars=f.endBar-f.startBar+1;
    assert(tBars<=fBars, 'at '+scale+'x the transition ('+tBars+') is longer than the theme ('+fBars+')');
    ratios.push({scale:scale, r:fBars/tBars});
  });
  var base=ratios[0].r;
  ratios.forEach(function(x){
    // Rounding to whole bars moves this a few percent; flattening moves it
    // steadily further the longer the piece gets.
    assert(Math.abs(x.r-base)/base <= 0.12,
      'at '+x.scale+'x the theme:transition ratio is '+x.r.toFixed(2)
      +' against '+base.toFixed(2)+' at natural length — the proportions were flattened');
  });
  window.__formOverride=null;
});

check('shorter cannot dissolve a form below its minimum', function(){
  wkeys.forEach(function(k){
    var w=FP.planWork({seed:7,work:k,wordCount:12,syllableCount:30,
                       energy:0.5,tension:0.5,beatsPerBar:4,lengthScale:0.4});
    w.movements.forEach(function(m,i){
      m.form.sections.forEach(function(s,j){
        assert(s.endBar-s.startBar+1>=2,
          k+' movement '+i+' section '+j+' shrank below two bars');
      });
    });
  });
});

check('the scale is clamped, so no input can produce nonsense', function(){
  [0, -5, 99, NaN, null, undefined, 'x'].forEach(function(bad){
    var w=FP.planWork({seed:7,work:'diptych',wordCount:12,syllableCount:30,
                       energy:0.5,tension:0.5,beatsPerBar:4,lengthScale:bad});
    assert(w && w.totalBars>0, 'lengthScale '+String(bad)+' produced '+(w?w.totalBars:'nothing')+' bars');
    assert(w.lengthScale>=0.4 && w.lengthScale<=3,
      'lengthScale '+String(bad)+' escaped the clamp as '+w.lengthScale);
  });
});

print('');
print(failures? ('FAILURES: '+failures) : 'the catalogue is complete, organised, reachable and resizable');
