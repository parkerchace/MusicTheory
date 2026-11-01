// Editing a form on the page: the plus between sections.
//
// What it offers has to follow from where it is — a transition where the key
// changes, a retransition before a return home, a coda only at the end — and
// taking an offer must leave the sections already there exactly as long as
// they were. A form that re-measured every bar whenever one was added would
// make "add a coda" rewrite the whole piece.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var __e=eval;function load(f){__e(readFile(f));}
load('form-planner.js');
var FP=window.FormPlanner;

var failures=0;
function check(name,fn){ try{ fn(); print('  OK   '+name); }catch(e){ failures++; print('  FAIL '+name+': '+e); } }
function assert(c,m){ if(!c) throw new Error(m); }

function planned(key){ window.__formOverride={form:key,unitBars:4}; var f=FP.plan({seed:7,beatsPerBar:4}); window.__formOverride=null; return f; }
function ids(list){ return list.map(function(s){ return s.id; }); }

print('=== editing a form ===');

check('every boundary of every form offers something valid', function(){
  Object.keys(FP.FORMS).forEach(function(k){
    var f=planned(k);
    for(var at=0; at<=f.sections.length; at++){
      var offers=FP.suggestAt(f, at, {homeIsMinor: k==='blues12'});
      // Only the start of a form that already opens with an introduction may
      // have nothing to offer — there the plus is simply not drawn.
      assert(offers.length>=1 || (at===0 && /intro/i.test(f.sections[0].role)), k+' boundary '+at+' offers nothing');
      offers.forEach(function(o){
        var s=o.spec;
        assert(o.title && o.detail, k+' '+o.id+' is unexplained');
        assert(FP.KEY_RELATIONS[s.key], k+' '+o.id+' uses unknown key '+s.key);
        assert(!s.modulatesTo || FP.KEY_RELATIONS[s.modulatesTo], k+' '+o.id+' modulates to unknown '+s.modulatesTo);
        assert(['stable','transitional','developmental'].indexOf(s.stability)>=0, k+' '+o.id+' odd stability');
        assert(s.bars>=1, k+' '+o.id+' has no length');
        var g=FP.insertSection(f, at, s, {seed:7});
        assert(g.sections.length===f.sections.length+1, k+' '+o.id+' did not add a section');
        assert(g.bars===f.bars+s.bars, k+' '+o.id+' changed other sections\' lengths ('+f.bars+'+'+s.bars+' -> '+g.bars+')');
      });
    }
  });
});

check('ternary: transition into B, retransition back to A, coda at the end, intro at the start', function(){
  var f=planned('ternary');
  assert(ids(FP.suggestAt(f,1)).indexOf('transition')>=0, 'no transition offered between A (I) and B (vi): '+ids(FP.suggestAt(f,1)));
  var mid=FP.suggestAt(f,2);
  assert(mid[0].id==='retransition', 'retransition is not the first offer before the return: '+ids(mid));
  assert(ids(mid).indexOf('transition')<0, 'offered a plain transition as well as a retransition');
  assert(ids(FP.suggestAt(f,3)).indexOf('coda')>=0, 'no coda at the end');
  assert(ids(FP.suggestAt(f,1)).indexOf('coda')<0, 'coda offered mid-piece');
  assert(ids(FP.suggestAt(f,0))[0]==='intro', 'intro is not first at the start');
});

check('taking an offer keeps the bars that were already there', function(){
  var f=planned('song');
  var coda=FP.suggestAt(f,f.sections.length).filter(function(o){return o.id==='coda';})[0];
  var g=FP.insertSection(f,f.sections.length,coda.spec,{seed:7});
  f.sections.forEach(function(s,i){
    assert(g.sections[i].startBar===s.startBar && g.sections[i].bars===s.bars, 'section '+s.label+' moved or resized');
  });
  assert(g.sections[g.sections.length-1].role==='coda', 'coda is not last');
  assert(!g.sections[f.sections.length-1].isFinal, 'the old last section still thinks it is final');
});

check('inserting mid-piece shifts what follows by exactly the new length', function(){
  var f=planned('ternary');
  var tr=FP.suggestAt(f,1).filter(function(o){return o.id==='transition';})[0];
  var g=FP.insertSection(f,1,tr.spec,{seed:7});
  assert(g.sections[0].startBar===0 && g.sections[0].bars===f.sections[0].bars, 'A changed');
  assert(g.sections[2].startBar===f.sections[1].startBar+tr.spec.bars, 'B did not move by the transition\'s length');
  assert(g.sections[1].modulatesTo===f.sections[1].keyRelation, 'transition does not lead to B\'s key');
  assert(g.foreshadow.length>=f.foreshadow.length, 'lost foreshadowing');
});

check('restating relabels the returns that follow', function(){
  var f=planned('ternary');
  var re=FP.suggestAt(f,1).filter(function(o){return o.id==='restate';})[0];
  var g=FP.insertSection(f,1,re.spec,{seed:7});
  var labels=g.sections.map(function(s){return s.label;}).join(' ');
  assert(labels==="A A' B A''", 'labels are '+labels);
});

check('edits stack: a form that was edited can be edited again', function(){
  var f=planned('period');
  var g=FP.insertSection(f,f.sections.length,FP.suggestAt(f,f.sections.length)[0].spec,{seed:7});
  var h=FP.insertSection(g,0,FP.suggestAt(g,0)[0].spec,{seed:7});
  assert(h.sections.length===f.sections.length+2, 'second edit lost the first');
  assert(/\(extended\)$/.test(h.name) && !/\(extended\) \(extended\)/.test(h.name), 'name is '+h.name);
});

check('a theme whose end modulates is still the theme a return brings back', function(){
  var f=planned('roundedBinary');
  var end=FP.suggestAt(f,f.sections.length);
  end.forEach(function(o){ assert(!(o.id==='return' && o.spec.letter!=='A'), 'offered to bring back '+o.spec.letter); });
  var mid=FP.suggestAt(f,1);
  assert(ids(mid).indexOf('restate')>=0, 'A is treated as a link and cannot be restated: '+ids(mid));
});

print(failures?('\n'+failures+' FAILED'):'\nall passed');
