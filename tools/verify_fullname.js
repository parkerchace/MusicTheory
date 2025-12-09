// Quick test to verify F#maj(add6, no5) is being generated correctly
const MusicTheoryEngine = require('../music-theory-engine.js');

const engine = new MusicTheoryEngine();

console.log('\n=== Testing C Blues Hexatonic Degree 4 ===\n');

const key = 'C';
const scale = 'blues_hexatonic';

// Get scale notes
const scaleNotes = engine.getScaleNotesWithKeySignature(key, scale);
console.log('Scale notes:', scaleNotes);

// Get degree 4 chord
const deg4 = engine.getDiatonicChord(4, key, scale);

console.log('\n--- Degree 4 Chord Object ---');
console.log('root:', deg4.root);
console.log('chordType:', deg4.chordType);
console.log('fullName:', deg4.fullName);
console.log('notes:', deg4.notes);
console.log('diatonicNotes:', deg4.diatonicNotes);
console.log('chordNotes:', deg4.chordNotes);

console.log('\n--- Expected vs Actual ---');
console.log('Expected fullName: F#maj(add6, no5)');
console.log('Actual fullName:', deg4.fullName);
console.log('Match:', deg4.fullName === 'F#maj(add6, no5)' ? '✅ PASS' : '❌ FAIL');

if (deg4.fullName !== 'F#maj(add6, no5)') {
    console.log('\n⚠️  ISSUE DETECTED: fullName does not match expected value');
    console.log('This will cause the sheet music to display the wrong chord name.');
}
