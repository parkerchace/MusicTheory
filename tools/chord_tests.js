// Browser console helper: chord alias ⇄ canonical equivalence tests
// Usage: open the app page, then in the Console run:
//   var s=document.createElement('script'); s.src='tools/chord_tests.js'; document.head.appendChild(s);

(function(){
  try{
    var mt = window && window.modularApp && window.modularApp.musicTheory;
    if(!mt){
      console.error('musicTheory not found on window.modularApp. Run this after the app has loaded.');
      return;
    }

    function showNotes(root, type){
      try{ return mt.getChordNotes(root, type) }catch(e){ return {error:String(e)} }
    }

    function eq(a,b){
      return JSON.stringify(a)===JSON.stringify(b);
    }

    function testAlias(root, alias, canonical){
      var na = showNotes(root, alias);
      var nc = showNotes(root, canonical);
      var pass = false;
      if(na && nc && Array.isArray(na) && Array.isArray(nc)){
        pass = eq(na, nc);
      }
      console.groupCollapsed('Test: '+root+'  '+alias+'  ⇔  '+canonical+'   → '+(pass? 'PASS':'FAIL'));
      console.log('alias ('+alias+') notes:', na);
      console.log('canonical ('+canonical+') notes:', nc);
      console.groupEnd();
      return pass;
    }

    var tests = [
      ['G', '+maj7', 'maj7#5'],
      ['G', '+7', '7#5'],
      ['C', '+maj7', 'maj7#5'],
      ['D', 'aug', 'aug']
    ];

    var failed = [];
    tests.forEach(function(t){
      if(!testAlias(t[0], t[1], t[2])) failed.push(t);
    });

    if(failed.length) console.error('CHORD ALIAS TESTS FAILED:', failed);
    else console.log('All chord alias tests passed');

    // expose helpers for interactive use
    window.__chordTests = {
      testAlias: testAlias,
      showNotes: showNotes,
      tests: tests,
      runAll: function(){ failed=[]; tests.forEach(function(t){ if(!testAlias(t[0],t[1],t[2])) failed.push(t)}); return failed; }
    };
  }catch(e){ console.error(e) }
})();
