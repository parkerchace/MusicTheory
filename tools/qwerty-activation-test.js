// THE TYPING KEYBOARD SWITCHES ITSELF ON WHEN IT IS WANTED, AND NEVER EATS TYPING.
//
// The reducer behind it: idle until an instrument is touched (or ` is
// pressed), armed until Escape; a burst of note keys while idle asks once
// rather than starting to play; the answer is remembered.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:function(){}};

load('qwerty-keys.js');
var K = window.QwertyKeys.core;

var out=[], failures=0;
function say(s){ out.push(s); }
function want(name, cond, detail){
  if(cond){ say('  ok   '+name+(detail?('   ['+detail+']'):'')); }
  else { failures++; say('  FAIL '+name+(detail?('   ['+detail+']'):'')); }
}
function run(s, evs){ evs.forEach(function(e){ s = K.reduce(s, e); }); return s; }

var fresh = K.initialState({});

say('ARMING');
want('it starts idle, with auto-arm on', fresh.mode === 'idle' && fresh.auto === true);
want('touching an instrument arms it', run(fresh, [{type:'engage'}]).mode === 'armed');
want('` arms it and ` again puts it back', run(fresh, [{type:'toggle'}]).mode === 'armed' && run(fresh, [{type:'toggle'},{type:'toggle'}]).mode === 'idle');
want('Escape disarms', run(fresh, [{type:'engage'},{type:'escape'}]).mode === 'idle');
want('going back to the landing page disarms', run(fresh, [{type:'engage'},{type:'leave'}]).mode === 'idle');
var manual = K.initialState({auto:false});
want('with auto-arm off, touching an instrument does nothing', run(manual, [{type:'engage'}]).mode === 'idle');
want('...but ` still arms it: an explicit choice always works', run(manual, [{type:'toggle'}]).mode === 'armed');

say('');
say('WHERE IT IS LIVE');
var armed = run(fresh, [{type:'engage'}]);
want('armed in the studio: live', K.isLive(armed, 'studio'));
want('armed on the landing page: not live', !K.isLive(armed, null));
want('idle on a Learn page that listens for notes: live without arming', K.isLive(fresh, 'learn'));
want('idle in the studio: not live', !K.isLive(fresh, 'studio'));
want('auto-arm off and idle on a Learn page: not live', !K.isLive(manual, 'learn'));

say('');
say('A COLD START ASKS, ONCE');
var t = 100000;
var two = run(fresh, [{type:'coldkey',t:t},{type:'coldkey',t:t+200}]);
want('two quick note keys while idle: nothing yet', !two.prompting && two.mode === 'idle');
var three = run(two, [{type:'coldkey',t:t+400}]);
want('three within the window: the chip asks — and nothing plays', three.prompting && three.mode === 'idle');
var slow = run(fresh, [{type:'coldkey',t:t},{type:'coldkey',t:t+900},{type:'coldkey',t:t+2600}]);
want('three spread out (ordinary typing elsewhere) do not ask', !slow.prompting, 'window '+K.COLD_WINDOW+'ms');
var yes = run(three, [{type:'accept'}]);
want('saying yes arms it and remembers', yes.mode === 'armed' && yes.optIn === true && !yes.prompting);
var later = run(K.initialState({optIn:true}), [{type:'coldkey',t:t}]);
want('once opted in, a single note key arms it', later.mode === 'armed');
var no = run(three, [{type:'decline'}]);
want('saying no is remembered', no.declined && !no.prompting && no.mode === 'idle');
var noAgain = run(K.initialState({declined:true}), [{type:'coldkey',t:t},{type:'coldkey',t:t+1},{type:'coldkey',t:t+2}]);
want('...and it never asks again', !noAgain.prompting);
want('...though ` still arms it', run(noAgain, [{type:'toggle'}]).mode === 'armed');
want('with auto-arm off it never asks', !run(manual, [{type:'coldkey',t:t},{type:'coldkey',t:t+1},{type:'coldkey',t:t+2}]).prompting);
want('arming clears a pending question', !run(three, [{type:'toggle'}]).prompting);

say('');
say('STATE IS NOT SHARED');
var before = JSON.stringify(fresh);
run(fresh, [{type:'engage'},{type:'coldkey',t:1}]);
want('the reducer never mutates the state it is given', JSON.stringify(fresh) === before);

say('');
say(failures? ('FAILURES: '+failures) : 'it arms when wanted, asks before taking over, and remembers the answer');
print(out.join('\n'));
if(failures) throw new Error('qwerty-activation-test: '+failures+' failure(s)');
