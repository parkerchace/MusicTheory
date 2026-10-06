// DISTANCE BETWEEN TWO COLLECTIONS, MEASURED SO THAT SIZE DOES NOT LIE.
//
// The metric exists because counting shared notes misranks the moment the
// candidates stop being the same size, and the library is full of 5-, 6- and
// 8-note collections. The cases below are the ones that made the old
// count-the-shared-notes scoring wrong, plus the ordering properties the
// colour dial depends on to be usable at both of its ends.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};

load('scale-colour.js');
var SC = window.ScaleColour;

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}

// --- collections, as pitch classes ---------------------------------------
function at(root, iv){ return iv.map(function(i){ return (root+i)%12; }); }
var MAJOR=[0,2,4,5,7,9,11], AEOLIAN=[0,2,3,5,7,8,10], MIXO=[0,2,4,5,7,9,10],
    MIXO6=[0,2,4,5,7,8,10],                 // library id mixolydian_6: 1 2 3 4 5 b6 b7
    MELMIN=[0,2,3,5,7,9,11], DORIAN=[0,2,3,5,7,9,10],
    MAJPENT=[0,2,4,7,9], OCTATONIC=[0,2,3,5,6,8,9,11], WHOLETONE=[0,2,4,6,8,10];
var C=0, D=2, Eb=3, F=5, G=7, Ab=8, A=9;

say('SIZE MUST NOT LIE');
// The case the whole module exists for: a pentatonic living entirely inside
// the key shares FEWER notes than a one-note-away seven-note scale, and is
// nevertheless the smaller move — it introduces nothing.
var pentInC   = SC.measure(at(C,MAJOR), at(C,MAJPENT));
var mixoInC   = SC.measure(at(C,MAJOR), at(C,MIXO));
want('a pentatonic inside the key shares fewer notes than a one-note-away scale',
     pentInC.shared < mixoInC.shared, pentInC.shared+' vs '+mixoInC.shared);
want('...but is measured as the SMALLER move, because it adds nothing',
     pentInC.distance < mixoInC.distance,
     pentInC.distance.toFixed(3)+' vs '+mixoInC.distance.toFixed(3));
want('...and is reported as a narrowing, not a borrow',
     pentInC.subset===true && pentInC.foreign===0, 'foreign='+pentInC.foreign);
want('...and is flagged melody-only, since stacked thirds stop naming chords',
     pentInC.usableFor==='melody' && mixoInC.usableFor==='both');

say('');
say('DIRECTION IS NOT SYMMETRIC');
var addOne = SC.measure(at(C,MAJOR), at(C,[0,2,4,5,7,9,10,11])); // key + one added
want('adding a note weighs more than withdrawing one',
     addOne.distance > 0 && SC.measure(at(C,MAJOR), at(C,MAJPENT)).distance < addOne.distance,
     'add '+addOne.distance.toFixed(3)+' vs withdraw '+pentInC.distance.toFixed(3));
want('a collection identical to home is identified as such, not scored',
     SC.measure(at(C,MAJOR), at(A,AEOLIAN)).identical===true,
     'C major vs A aeolian is one collection with two names');

say('');
say('THE WORKED CASES');
// Approaching Fm7 in Ab major with a collection rooted a fifth above F.
var abMajor = at(Ab,MAJOR);
var cMixo6  = at(C,MIXO6);
var fMelMin = at(F,MELMIN);
want('the fifth-above collection is a rotation of a parent rooted on the target',
     cMixo6.slice().sort(function(a,b){return a-b;}).join()===
     fMelMin.slice().sort(function(a,b){return a-b;}).join(),
     'C mixolydian_6 === F melodic minor');
var fm7 = [F, Ab, C, Eb];
var held = fm7.filter(function(pc){ return cMixo6.indexOf(pc)>=0; });
want('...and holds three of the four tones of the chord it approaches',
     held.length===3, held.length+' of 4');
var apprColour = SC.measure(abMajor, cMixo6);
// The two notes it adds to the home key are the point: without them the
// collection would be a preview of the target rather than a way in to it.
want('...and adds exactly the two notes that make it a departure, not a preview',
     apprColour.foreign===2 && apprColour.distance>0 && apprColour.distance<0.35,
     SC.describe(apprColour)+' -> '+apprColour.distance.toFixed(3));
want('...while still sharing more with the home key than it withholds',
     apprColour.shared > apprColour.foreign && apprColour.shared > apprColour.missing,
     apprColour.shared+' shared, '+apprColour.foreign+' added, '+apprColour.missing+' withdrawn');

// The recolour-in-place case: same tonic, two notes darker.
var gMajor=at(G,MAJOR), gMixo6=at(G,MIXO6), gMixo=at(G,MIXO);
var recolour = SC.measure(gMajor, gMixo6);
want('a two-note darkening on the same tonic measures further than a one-note one',
     recolour.distance > SC.measure(gMajor,gMixo).distance,
     recolour.distance.toFixed(3)+' vs '+SC.measure(gMajor,gMixo).distance.toFixed(3));
want('...and describes itself in notes, not in numbers',
     /2 new note/.test(SC.describe(recolour)), SC.describe(recolour));

// Tonicizing a non-tonic chord: A major, D as D aeolian.
var aMajor=at(A,MAJOR), dAeolian=at(D,AEOLIAN);
var tonicise = SC.measure(aMajor, dAeolian);
want('tonicizing the fourth degree in another mode is reachable and measurable',
     tonicise.foreign>0 && tonicise.distance>0 && tonicise.distance<1,
     SC.describe(tonicise)+' -> '+tonicise.distance.toFixed(3));

say('');
say('ORDERING, AND A DIAL THAT WORKS AT BOTH ENDS');
var pool = [
  {id:'mixolydian', pcs:at(C,MIXO)},
  {id:'aeolian',    pcs:at(C,AEOLIAN)},
  {id:'dorian',     pcs:at(C,DORIAN)},
  {id:'mixolydian_6',pcs:at(C,MIXO6)},
  {id:'octatonic',  pcs:at(C,OCTATONIC)},
  {id:'whole_tone', pcs:at(C,WHOLETONE)},
  {id:'major_pentatonic', pcs:at(C,MAJPENT)}
];
var opt = { homePcs: at(C,MAJOR), pcsOf:function(x){return x.pcs;} };
var mild = SC.rank(pool, Object.assign({colour:0}, opt));
var wild = SC.rank(pool, Object.assign({colour:1}, opt));
var mid  = SC.rank(pool, Object.assign({colour:0.5}, opt));
want('the dial returns a full list at 0, 0.5 and 1 rather than filtering to empty',
     mild.length===pool.length && wild.length===pool.length && mid.length===pool.length,
     mild.length+'/'+mid.length+'/'+wild.length+' of '+pool.length);
want('at 0 the closest collection to the key leads',
     mild[0].colour.distance <= mid[0].colour.distance, mild[0].id);
want('at 1 the furthest leads, and it is a genuinely strange one',
     wild[0].colour.distance >= mid[0].colour.distance
       && (wild[0].id==='whole_tone'||wild[0].id==='octatonic'), wild[0].id);
want('the two ends do not return the same collection',
     mild[0].id !== wild[0].id, mild[0].id+' vs '+wild[0].id);
want('at 0.5 neither extreme leads — the middle is reachable, which is the point',
     mid[0].id!==mild[0].id && mid[0].id!==wild[0].id, mid[0].id);

// Familiarity may only break ties, never override the distance target.
var famPool = [ {id:'obscure', pcs:at(C,MIXO), r:2}, {id:'familiar', pcs:at(C,MIXO), r:0} ];
var famRanked = SC.rank(famPool, {colour:0, homePcs:at(C,MAJOR),
  pcsOf:function(x){return x.pcs;}, rankOf:function(x){return x.r;}});
want('at equal distance the more familiar name wins', famRanked[0].id==='familiar');

var chordsOnly = SC.rank(pool, Object.assign({colour:0, usableFor:'chords'}, opt));
want('asking for chordable collections drops the ones too small to harmonise',
     chordsOnly.every(function(x){ return x.colour.candSize>=7; })
       && chordsOnly.length===pool.length-2,
     chordsOnly.length+' of '+pool.length+' (pentatonic + whole tone dropped)');

say('');
say('THE DIAL STEPS THROUGH REAL DISTANCES');
// Distances clump. Against a seven-note home almost every seven-note
// collection lands on one of about five values, and the clumps are very
// different sizes — so a quantile taken over CANDIDATES spends most of the
// dial's travel inside the biggest clump and the control goes dead through
// its middle. The quantile is over the distinct values for that reason.
var clumped = [];
[MIXO, MIXO, MIXO, MIXO, MIXO, MIXO, DORIAN, AEOLIAN].forEach(function(iv, i){
  clumped.push({id:'c'+i, pcs:at(C,iv)});
});
var seenD = {};
[0, 0.5, 1].forEach(function(col){
  var r = SC.rank(clumped, {colour:col, homePcs:at(C,MAJOR), pcsOf:function(x){return x.pcs;}});
  seenD[col] = r[0].colour.distance.toFixed(3);
});
want('each dial position lands on a different distance despite a lopsided field',
     seenD[0]!==seenD[0.5] && seenD[0.5]!==seenD[1],
     '0 -> '+seenD[0]+', 0.5 -> '+seenD[0.5]+', 1 -> '+seenD[1]);

say('');
say('FAMILIARITY BREAKS TIES, AND HAS TO DISCRIMINATE');
// The dataset's own `essential` flag covers roughly a quarter of the library
// and `base` covers nearly all of it, so as a tie-break between equally
// distant candidates the two flags barely separate anything — which is how an
// obscure collection came to be offered ahead of dorian at the same distance.
var essentialBoth = {dorian:1, chromatic_hypodorian:1};
want('a name a player reaches for outranks an obscure one flagged the same way',
     SC.familiarityOf('dorian',{essential:essentialBoth}) <
     SC.familiarityOf('chromatic_hypodorian',{essential:essentialBoth}),
     'dorian '+SC.familiarityOf('dorian',{essential:essentialBoth})+
     ' vs chromatic_hypodorian '+SC.familiarityOf('chromatic_hypodorian',{essential:essentialBoth}));
want('an unlisted collection still beats one with no flags at all',
     SC.familiarityOf('x',{essential:{x:1}}) < SC.familiarityOf('y',{essential:{}, base:{}}));
want('the two-notes-darker collection is a name the ranker knows',
     SC.familiarityOf('mixolydian_6',{}) < 1000 && SC.familiarityOf('mixolydian_b6',{}) < 1000,
     'both spellings of the id are listed');

say('');
say('EDGE CASES');
want('an empty candidate list returns an empty ranking, not a throw',
     SC.rank([], opt).length===0);
want('an empty home collection does not produce NaN',
     Number.isFinite(SC.measure([], at(C,MAJOR)).distance));
want('distance stays inside 0..1 for disjoint collections',
     (function(){ var m=SC.measure([0,2,4],[1,3,5]); return m.distance>0 && m.distance<=1; })());

say('');
say(failures? ('FAILURES: '+failures) : 'size does not lie, and the dial reaches both ends');
print(out.join('\n'));
if(failures) throw new Error('scale-colour-test: '+failures+' failure(s)');
