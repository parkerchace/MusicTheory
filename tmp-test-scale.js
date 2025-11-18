const M = require('./music-theory-engine.js');
const t = new M();
console.log('C locrian ->', t.getScaleNotes('C','locrian'));
console.log('C major  ->', t.getScaleNotes('C','major'));
console.log('Db major ->', t.getScaleNotes('Db','major'));
console.log('F# major ->', t.getScaleNotes('F#','major'));
console.log('\nC locrian diatonic chords:');
for (let d=1; d<=7; d++) {
	console.log(d, t.getDiatonicChord(d, 'C', 'locrian'));
}
