const MusicTheoryEngine = require('../music-theory-engine.js');
global.window = {};
const engine = new MusicTheoryEngine();

// Mock ProgressionBuilder logic for simplifyToTriad
const simplifyToTriad = (root, type) => {
    if (/m7b5|ø/i.test(type)) return 'm';
    if (/maj7|maj9|maj11|maj13/i.test(type)) return 'maj';
    if (/m13|m11|m9|m7/i.test(type)) return 'm';
    if (/13|11|9|7|alt|b9|#9|b13/i.test(type)) return 'maj';
    if (/dim7/i.test(type)) return 'dim';
    if (/dim|°|o/i.test(type)) return 'dim';
    if (/aug|\+/i.test(type)) return 'aug';
    if (/^m$/i.test(type)) return 'm';
    if (/^maj$/i.test(type) || type === '') return 'maj';
    if (/^dim$/i.test(type)) return 'dim';
    if (/^aug$/i.test(type)) return 'aug';
    if (/sus2|sus4/i.test(type)) return type.toLowerCase();
    // Preserve synthetic names like maj(add6, no5)
    if (type.includes('(')) return type;
    return 'maj';
};

const testCases = [
    { type: 'maj(add6, no5)', expected: 'maj(add6, no5)' },
    { type: 'm7', expected: 'm' },
    { type: 'sus4', expected: 'sus4' },
    { type: 'maj7', expected: 'maj' }
];

console.log('Testing simplifyToTriad...');
testCases.forEach(tc => {
    const result = simplifyToTriad('C', tc.type);
    console.log(`${tc.type} -> ${result} (Expected: ${tc.expected})`);
});
