// Build a MIDI file from a known set of rendered notes, then decode the bytes
// back and check the file actually contains those notes.
var window=this;this.window=this;
var console={log:function(){},warn:function(){},error:print};
var localStorage={_d:{},getItem:function(k){return this._d[k]||null;},setItem:function(k,v){this._d[k]=v;}};
var navigator={};
function el(tag){var e={tagName:(tag||'div').toUpperCase(),style:{setProperty:function(){}},children:[],dataset:{},
 className:'',id:'',textContent:'',innerHTML:'',value:'',checked:false,disabled:false,title:'',
 appendChild:function(c){this.children.push(c);return c;},append:function(){},insertBefore:function(c){return c;},
 removeChild:function(c){return c;},setAttribute:function(k,v){this[k]=v;},getAttribute:function(k){return this[k];},
 removeAttribute:function(){},addEventListener:function(){},removeEventListener:function(){},
 querySelector:function(){return null;},querySelectorAll:function(){return [];},
 getBoundingClientRect:function(){return{width:900,height:400,top:0,left:0};},
 classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},
 focus:function(){},blur:function(){},remove:function(){},closest:function(){return null;},getContext:function(){return null;}};
 return e;}
var document={createElement:el,createElementNS:function(n,t){return el(t);},createTextNode:function(t){return{textContent:t};},
 getElementById:function(){return el('div');},querySelector:function(){return el('div');},querySelectorAll:function(){return [];},
 addEventListener:function(){},removeEventListener:function(){},dispatchEvent:function(){},
 body:el('body'),head:el('head'),documentElement:el('html')};
var CustomEvent=function(n,o){this.type=n;this.detail=o&&o.detail;};
var setTimeout=function(){return 0;};var clearTimeout=function(){};var requestAnimationFrame=function(){return 0;};
var __e=eval;
__e(readFile('music-theory-engine.js'));
__e(readFile('sheet-music-generator.js'));

var gen=new SheetMusicGenerator({musicTheory:new MusicTheoryEngine()});
gen.state.barMode='per-bar';
// A phrase must exist for the beat-aware branch; its CONTENT should be ignored
// now that export follows the renderer.
gen.state.musicalPhrase={ timeSignature:'4/4', beatsPerBar:4, beatUnit:4,
  bars:[{barNumber:1,beats:[{beat:1,duration:'quarter',chordObj:{root:'C',chordType:'maj',chordNotes:['C','E','G']},melody:'C5'}]}] };

// What the renderer "drew": an Alberti-ish LH plus a melody — deliberately
// different from the phrase above, so we can tell which source won.
gen.state.renderedNoteEvents=[
  {absBeat:0, noteName:'D3', durationBeats:1, kind:'chord'},
  {absBeat:1, noteName:'A3', durationBeats:1, kind:'chord'},
  {absBeat:2, noteName:'F3', durationBeats:1, kind:'chord'},
  {absBeat:2, noteName:'A3', durationBeats:1, kind:'chord'},   // repeated pitch, later attack
  {absBeat:0, noteName:'F4', durationBeats:2, kind:'melody'},
  {absBeat:2, noteName:'E4', durationBeats:2, kind:'melody'}
];

var bytes=gen.buildMidiFile({tempo:100});
print('file bytes: '+bytes.length+'  header ok: '+
  (bytes[0]===0x4D&&bytes[1]===0x54&&bytes[2]===0x68&&bytes[3]===0x64));

// --- decode the track ---
var i=14; // after 14-byte header
var trkLen=(bytes[i+4]<<24)|(bytes[i+5]<<16)|(bytes[i+6]<<8)|bytes[i+7];
i+=8;
var end=i+trkLen, tick=0, notes=[], running=null;
function vlq(){ var v=0,b; do { b=bytes[i++]; v=(v<<7)|(b&0x7F);} while(b&0x80); return v; }
var NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
while(i<end){
  tick+=vlq();
  var st=bytes[i];
  if(st===0xFF){ i++; var meta=bytes[i++]; var len=vlq(); i+=len; continue; }
  if(st&0x80){ running=st; i++; } 
  var d1=bytes[i++], d2=bytes[i++];
  var kind=(running&0xF0), ch=(running&0x0F);
  if(kind===0x90&&d2>0) notes.push({tick:tick,note:d1,ch:ch,name:NAMES[d1%12]+(Math.floor(d1/12)-1),vel:d2});
}
print('note-ons decoded: '+notes.length);
notes.sort(function(a,b){return a.tick-b.tick||a.note-b.note;});
notes.forEach(function(n){ print('  tick '+String(n.tick).padStart(4)+'  ch'+n.ch+'  '+n.name+'  vel '+n.vel); });

var chOf={}; notes.forEach(function(n){ chOf[n.name]=n.ch; });
print('');
print('melody F4/E4 on channel 0: '+(chOf['F4']===0&&chOf['E4']===0));
print('harmony D3/A3/F3 on channel 1: '+(chOf['D3']===1&&chOf['A3']===1&&chOf['F3']===1));
// channel 0 is falsy — test membership, not truthiness
var has=function(n){ return Object.prototype.hasOwnProperty.call(chOf,n); };
print('contains the RENDERED notes: '+(has('D3')&&has('F4')&&has('A3')&&has('F3')&&has('E4')));
print('does NOT contain the phrase stub (C5 melody / C-E-G chord): '+
  (!has('C5')&&!has('C4')&&!has('G3')));
print('repeated A3 kept both attacks: '+(notes.filter(function(n){return n.name==='A3';}).length===2));

print('');
print('=== fallback when nothing has been rendered yet ===');
var g2=new SheetMusicGenerator({musicTheory:new MusicTheoryEngine()});
g2.state.barMode='per-bar';
g2.state.renderedNoteEvents=null;
g2.state.musicalPhrase={ timeSignature:'4/4', beatsPerBar:4, beatUnit:4,
  bars:[{barNumber:1,beats:[{beat:1,duration:'quarter',
    chordObj:{root:'C',chordType:'maj',chordNotes:['C','E','G'],diatonicNotes:['C3','E3','G3']},melody:'C5'}]}] };
try {
  var b2=g2.buildMidiFile({tempo:100});
  print('  still exports: '+(b2.length>20)+'  ('+b2.length+' bytes)');
} catch(e){ print('  FAILED: '+e); }
