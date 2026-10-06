// THE TYPING KEYBOARD IS LAID OUT LIKE FL STUDIO'S, BY PHYSICAL KEY.
//
// Two rows, each a piano: the bottom row from the base C, the top row an
// octave up. Keys are KeyboardEvent.code positions, so the shape holds on
// any layout. Chord mode reads the same positions as white keys (scale
// degrees) and black keys (the secondary dominant of the key to their right).
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

say('THE TWO ROWS');
want('Z is the base C', K.noteFor('KeyZ', 48) === 48);
want('S is C#, X is D, M is B', K.noteFor('KeyS',48)===49 && K.noteFor('KeyX',48)===50 && K.noteFor('KeyM',48)===59);
want('the bottom row runs on past the octave: , . / are C D E', K.noteFor('Comma',48)===60 && K.noteFor('Period',48)===62 && K.noteFor('Slash',48)===64);
want('Q is the C an octave above Z', K.noteFor('KeyQ',48) === 60);
want('2 3 5 6 7 are the top row\'s black keys', [ 'Digit2','Digit3','Digit5','Digit6','Digit7' ].map(function(c){ return K.noteFor(c,48)-60; }).join(',') === '1,3,6,8,10');
want('the top row reaches G above the next C at ]', K.noteFor('BracketRight',48) === 79);
want('a key that is not on the map plays nothing', K.noteFor('KeyA',48) === null && K.noteFor('Space',48) === null && K.noteFor('Digit1',48) === null);
want('every mapped key is a distinct position', Object.keys(K.KEYMAP).length === K.LOWER.length + K.UPPER.length);

say('');
say('OCTAVES AND VELOCITY');
want('the base octave is kept inside C1..C5', K.clampBase(0)===K.MIN_BASE && K.clampBase(200)===K.MAX_BASE && K.clampBase(60)===60);
want('at the highest base the top row still ends on a real piano key', K.noteFor('BracketRight', K.MAX_BASE) <= 108);
want('velocity stays audible and in range', K.clampVelocity(0)===20 && K.clampVelocity(500)===127 && K.clampVelocity(99.6)===100);
want('note names read as pitch + octave', K.noteName(48)==='C3' && K.noteName(61)==='C#4');

say('');
say('POSITIONS (what chord mode reads)');
var z = K.positionOf('KeyZ'), x = K.positionOf('KeyX'), s = K.positionOf('KeyS'), g = K.positionOf('KeyG');
want('Z is the first white key of the bottom row', z.row==='lower' && !z.black && z.whiteIndex===0);
want('X is the second white key', x.whiteIndex===1);
want('S is black, and the white key to its right is X', s.black && s.rightWhiteIndex===1);
want('G (F#) is black, with B (the fifth white key, G) to its right', g.black && g.rightWhiteIndex===4);
var white = ['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash'].map(function(c){ return K.positionOf(c).whiteIndex; }).join(',');
want('the bottom row\'s white keys count 0..9 in order', white === '0,1,2,3,4,5,6,7,8,9', white);
var top = ['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'].map(function(c){ return K.positionOf(c); });
want('the top row\'s white keys count the same way', top.map(function(p){ return p.whiteIndex; }).join(',') === '0,1,2,3,4,5,6,7,8,9' && top[0].row === 'upper');

say('');
say('LETTERS ON THE KEYS');
var hints = K.hintsFor(48, null);
want('the base C is labelled Z', hints[48] === 'Z');
want('where the rows overlap, the top row\'s letter is shown', hints[60] === 'Q' && hints[62] === 'W');
want('punctuation positions get their US characters without a layout map', hints[60+4] === 'E' && K.label('Comma', null) === ',');
var fakeLayout = { get: function(code){ return code === 'KeyZ' ? 'w' : (code === 'KeyQ' ? 'a' : undefined); } };
want('with a layout map, the user\'s own characters are drawn (AZERTY: Z position types W)', K.hintsFor(48, fakeLayout)[48] === 'W' && K.hintsFor(48, fakeLayout)[60] === 'A');

say('');
say('WHAT COUNTS AS TYPING');
function el(tag, type, extra){ var e = { nodeType: 1, tagName: tag.toUpperCase(), type: type || '', isContentEditable: false,
  getAttribute: function(k){ return (extra && extra[k]) || (k === 'type' ? type : null); } };
  if (extra && extra.isContentEditable) e.isContentEditable = true; return e; }
want('a text field is typing', K.isEditable(el('input','text')));
want('a search box and a textarea are typing', K.isEditable(el('input','search')) && K.isEditable(el('textarea')));
want('a select is typing', K.isEditable(el('select')));
want('a contenteditable region is typing', K.isEditable(el('div','',{isContentEditable:true})));
want('a checkbox, a button and a slider are not typing', !K.isEditable(el('input','checkbox')) && !K.isEditable(el('button')) && !K.isEditable(el('input','range')));
want('a slider keeps its arrow keys', K.ownsArrows(el('input','range')) && K.ownsArrows(el('div','',{role:'slider'})));
want('a plain button does not', !K.ownsArrows(el('button')));

say('');
say(failures? ('FAILURES: '+failures) : 'the keyboard is FL\'s, by position, and never mistakes typing for playing');
print(out.join('\n'));
if(failures) throw new Error('qwerty-keymap-test: '+failures+' failure(s)');
