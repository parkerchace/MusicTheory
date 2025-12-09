// Test whole tone hexatonic chord generation
const MusicTheoryEngine = require('../music-theory-engine.js');

const engine = new MusicTheoryEngine();

console.log('\n=== Testing C Whole Tone Hexatonic ===\n');

const key = 'C';
const scale = 'whole_tone_hexatonic';

// Get scale notes
const scaleNotes = engine.getScaleNotesWithKeySignature(key, scale);
console.log('Scale notes:', scaleNotes);
console.log('Scale length:', scaleNotes.length);

console.log('\n--- Diatonic Chords ---');
for (let degree = 1; degree <= 6; degree++) {
    const chord = engine.getDiatonicChord(degree, key, scale);
    console.log(`Degree ${degree}:`, {
        root: chord.root,
        chordType: chord.chordType,
        fullName: chord.fullName,
        notes: chord.diatonicNotes
    });
    
    // Verify classification
    const classified = engine.classifyChordTypeFromNotes(chord.root, chord.diatonicNotes);
    if (classified !== chord.chordType) {
        console.log(`  ⚠️  Mismatch! Stored: ${chord.chordType}, Classified: ${classified}`);
    }
}

console.log('\n--- Expected Result ---');
console.log('All chords should be "aug" (augmented triads)');
console.log('Notes pattern: root + M3 + aug5 (e.g., C-E-G#)');
