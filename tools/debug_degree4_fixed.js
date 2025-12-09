const MusicTheoryEngine = require('../music-theory-engine.js');
global.window = {};
const engine = new MusicTheoryEngine();

const key = 'C';
const scale = 'blues_hexatonic';
const degree = 4; // F#

const baseChord = engine.getDiatonicChord(degree, key, scale);
console.log('Base Chord:', baseChord);

const scaleNotes = engine.getScaleNotes(key, scale);
console.log('Scale Notes:', scaleNotes);

// Simulate ProgressionBuilder logic
const root = baseChord.root;
let candidates = engine.findAllContainerChords([root], scaleNotes) || [];
candidates = candidates.filter(c => c.root === root);

console.log(`Candidates count: ${candidates.length}`);

// 0) Small scale filter (FIXED)
if (scaleNotes.length < 7) {
    candidates = candidates.filter(c => {
        const type = (c.chordType || '').toLowerCase();
        
        // Allow if it matches the base chord type exactly
        if (type === (baseChord.chordType || '').toLowerCase()) return true;

        if (type.includes('7') || type.includes('9') || type.includes('11') || type.includes('13') || type.includes('6')) {
            return false;
        }
        return true;
    });
}
console.log(`After small scale filter: ${candidates.map(c => `${c.chordType} (${c.scaleMatchPercent}%)`).join(', ')}`);

// 3) Exact match
const exact = candidates.find(c => (c.chordType || '').toLowerCase() === (baseChord.chordType || '').toLowerCase());
console.log('Exact Match:', exact ? exact.fullName : 'None');
