// THE PANEL CANNOT DRIFT FROM WHAT THE CONTROLS ACTUALLY DO.
//
// A control that silently stops working is the most corrosive thing in a tool
// like this, and the second most is a caption that describes a behaviour the
// code no longer has. So the panel is generated from each descriptor's own
// declarations, and this harness holds down the two properties that keeps:
// every control writes to the state the generation path really reads, and
// nothing is described that is not declared.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};
var __stored={};
var localStorage={getItem:function(k){return __stored[k]===undefined?null:__stored[k];},
                  setItem:function(k,v){__stored[k]=String(v);}};
var __listeners={};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var document={addEventListener:function(t,f){__listeners[t]=f;},
              dispatchEvent:function(){},
              getElementById:function(){return null;},createElement:function(){return null;}};

var __e=eval;function load(f){__e(readFile(f));}
load('scoring-methods.js');
var SM=window.ScoringMethods;

var out=[],failures=0;
function say(s){out.push(s);}
function want(n,c,d){ if(c){say('  ok   '+n+(d?('   ['+d+']'):''));} else {failures++;say('  FAIL '+n+(d?('   ['+d+']'):''));} }

say('METHODS AND TOGGLES ARE KEPT APART');
want('there is at least one method and at least one toggle',
     SM.methods.length>=1 && SM.toggles.length>=2,
     SM.methods.length+' methods, '+SM.toggles.length+' toggles');
want('no toggle is registered as a method',
     !SM.methods.some(function(m){return m.id==='approach'||m.id==='departure';}),
     SM.methods.map(function(m){return m.id;}).join(', '));
want('every toggle carries controls; a toggle with nothing to set is a label',
     SM.toggles.every(function(t){return (t.controls||[]).length>0;}));

say('');
say('EVERY DESCRIPTOR CAN DESCRIBE ITSELF');
SM.methods.concat(SM.toggles).forEach(function(d){
  var html=SM.describe(d,'chase, woods, dark');
  want('“'+d.label+'” states its idea, its origin, and what the words do',
       html.indexOf(d.idea)>=0 && html.indexOf('Where it comes from')>=0
         && (d.reads||[]).length>0 && html.indexOf('What your words do')>=0);
  want('...and works the text in the box into its example',
       /For what is in the box/.test(html) && html.length>400, d.id+': '+html.length+' chars');
});

say('');
say('CONTROLS WRITE WHERE THE GENERATOR READS');
// The generation path reads window.__arcExcursionColour / __arcExcursionScope
// and the approach mode object. A control that writes anywhere else is a
// control that does nothing.
var dep=SM.toggles.filter(function(t){return t.id==='departure';})[0];
var colour=dep.controls.filter(function(c){return c.id==='colour';})[0];
var scope=dep.controls.filter(function(c){return c.id==='scope';})[0];
colour.set(0.85);
want('the colour dial writes the value the excursion planner reads',
     window.__arcExcursionColour===0.85, String(window.__arcExcursionColour));
want('...and persists it under the key the planner loads from',
     __stored['arcExcursionColour']==='0.85', String(__stored['arcExcursionColour']));
scope.set('final');
want('the scope control writes the value the planner reads',
     window.__arcExcursionScope==='final', String(window.__arcExcursionScope));
want('...and persists it too', __stored['arcExcursionScope']==='final');

// The approach toggle writes through the accessor the generator owns.
window.__arcApproachScales={enabled:false,advanced:false};
window.__approachScalesMode=function(){return window.__arcApproachScales;};
var app=SM.toggles.filter(function(t){return t.id==='approach';})[0];
app.controls.filter(function(c){return c.id==='enabled';})[0].set(true);
want('the approach toggle flips the mode the generator owns',
     window.__arcApproachScales.enabled===true);
want('...and persists it as the object that accessor restores from',
     /"enabled":true/.test(__stored['arcApproachScales']||''), __stored['arcApproachScales']||'');

say('');
say('THE SCOPE OPTIONS MATCH WHAT THE PLANNER ACCEPTS');
var offered=scope.options.map(function(o){return o[0];}).sort().join(',');
want('every scope the panel offers is one the planner knows',
     offered==='alternate,auto,final,phrase,rest,section', offered);
want('the never-returning option is flagged rather than offered flatly',
     /disconnected/.test(scope.hint||''), (scope.hint||'').slice(0,60)+'…');

say('');
say('READING BACK IS CONSISTENT WITH WRITING');
// Reading back must not depend on the generation path having loaded first:
// written before it does, the dial used to report the default back while
// holding a different value, so the slider showed one thing and meant another.
want('a control reports back the value it just wrote, with no accessor loaded',
     (function(){ colour.set(0.25); return Math.abs(Number(colour.get())-0.25)<1e-9; })(),
     String(colour.get()));
want('...and the approach toggle can be set before its accessor exists',
     (function(){
       delete window.__approachScalesMode; delete window.__arcApproachScales;
       var c=app.controls.filter(function(x){return x.id==='enabled';})[0];
       c.set(true); return c.get()===true;
     })());
want('the colour dial describes its position in notes, not in numbers',
     /closest|away|furthest/.test(colour.format(0.05)) && /furthest|away/.test(colour.format(0.95)),
     colour.format(0.05)+' … '+colour.format(0.95));

say('');
say('ONE READING’S PANEL DOES NOT SPEAK FOR THE OTHERS');
// The contour timeline draws the energy curve the CONTOUR reading derives.
// Under any other reading it describes a calculation the generator is not
// doing, so it must not open by itself there — but it has to stay reachable
// by hand, because looking at the curve is legitimate whatever is selected.
var fake={_isOpen:false,_forcedOpen:false,closed:0,rendered:0,
  autoOpensNow:function(){ if(this._forcedOpen) return true;
    return ((window.__generationMethod)||'contour')==='contour'; },
  closePanel:function(){this._forcedOpen=false;this._isOpen=false;this.closed++;},
  openPanel:function(){this._isOpen=true;},
  analyzeAndRender:function(){this.rendered++;},
  forceOpen:function(){this._forcedOpen=true;this.analyzeAndRender();this.openPanel();}};
window.compositionTimeline=fake;

window.__generationMethod='contour';
want('under the contour reading the panel opens on typing', fake.autoOpensNow()===true);
window.__generationMethod='pedal';
want('under any other reading it does not', fake.autoOpensNow()===false);
fake.forceOpen();
want('...but asking for it by hand still opens it, whatever is selected',
     fake.autoOpensNow()===true && fake._isOpen===true);
fake.closePanel();
want('...and closing it lets it go back to following the reading',
     fake.autoOpensNow()===false, 'not pinned open for the session');

say('');
say('GENERATE BELONGS TO THE INPUT, NOT TO ONE READING');
// The only Generate button used to sit inside the contour panel, so choosing
// any other reading left no visible way to produce anything.
var fired=[];
document.dispatchEvent=function(e){ fired.push(e); };
var __CE=CustomEvent;
window.__generationMethod='pedal';
var input={value:'chase, woods, dark',focus:function(){}};
document.getElementById=function(id){ return id==='global-word-input'? input : null; };
var ok1=SM.generateNow();
want('generating works with a reading whose panel never opens',
     ok1===true && fired.length===1 && fired[0].type==='arcConfirmed',
     fired.length+' event(s)');
want('...and the event names the reading it was generated under',
     fired.length>0 && fired[0].detail && fired[0].detail.method==='pedal',
     fired.length? String(fired[0].detail.method):'none');
want('...and carries the text that was in the box',
     fired.length>0 && fired[0].detail.input==='chase, woods, dark');
var s1=fired[0].detail.seed;
SM.generateNow();
want('pressing it again generates something different rather than the same take',
     fired.length===2 && fired[1].detail.seed!==s1, s1+' -> '+fired[1].detail.seed);
fired.length=0;
input.value='   ';
want('an empty box generates nothing instead of an empty piece',
     SM.generateNow()===false && fired.length===0);

say('');
say(failures? ('FAILURES: '+failures) : 'the panel says what the controls do, and the controls do it');
print(out.join('\n'));
if(failures) throw new Error('scoring-methods-ui-test: '+failures+' failure(s)');
