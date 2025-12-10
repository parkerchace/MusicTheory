// Quick test of generative system fixes
console.log('=== TESTING SEMANTIC INFERENCE FIXES ===\n');

// Mock MusicTheoryEngine
class MockMusicTheory {
    constructor() {
        this.scales = {
            'major': { intervals: [0, 2, 4, 5, 7, 9, 11] },
            'minor': { intervals: [0, 2, 3, 5, 7, 8, 10] },
            'lydian': { intervals: [0, 2, 4, 6, 7, 9, 11] },
            'phrygian': { intervals: [0, 1, 3, 5, 7, 8, 10] }
        };
    }
    
    transposeNote(root, semitones) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const idx = notes.indexOf(root);
        return notes[(idx + semitones) % 12];
    }
}

// Load modules (assuming they're in same directory)
const PhoneticAnalyzer = require('./phonetic-analyzer.js');
const ChordAttributeEngine = require('./chord-attribute-engine.js');
const GenerativeWordMapper = require('./generative-word-mapper.js');

const musicTheory = new MockMusicTheory();
const phonetic = new PhoneticAnalyzer();
const chordAttrs = new ChordAttributeEngine();
const mapper = new GenerativeWordMapper(phonetic, chordAttrs, musicTheory);

// Test words
const testWords = ['twilight', 'shame', 'love', 'confusion'];

console.log('Testing individual words:\n');

(async () => {
    for (const word of testWords) {
        const result = await mapper.mapWord(word);
        console.log(`"${word}":`);
        console.log(`  Phonetic - Tension: ${(result.phonetic.musicalAttributes.harmonicTension * 100).toFixed(0)}%, Brightness: ${(result.phonetic.musicalAttributes.brightness * 100).toFixed(0)}%`);
        console.log(`  Semantic - Valence: ${result.semantic.emotional.valence.toFixed(2)}, Arousal: ${result.semantic.emotional.arousal.toFixed(2)}, Context: ${result.semantic.contextual.join(', ') || 'none'}`);
        console.log(`  Unified - Brightness: ${(result.unified.brightness * 100).toFixed(0)}%, Tension: ${(result.unified.tension * 100).toFixed(0)}%`);
        console.log(`  Scale: ${result.scale.root} ${result.scale.name}`);
        console.log(`  Progression: ${result.progression.map(c => c.symbol).join(' → ')}`);
        console.log('');
    }

    console.log('\n=== Testing multi-word: "twilight shame love confusion" ===\n');
    const multiResult = await mapper.mapWords('twilight shame love confusion');
    console.log(`Blended - Brightness: ${(multiResult.blended.brightness * 100).toFixed(0)}%, Tension: ${(multiResult.blended.tension * 100).toFixed(0)}%`);
    console.log(`Scale: ${multiResult.scale.root} ${multiResult.scale.name}`);
    console.log(`Progression: ${multiResult.progression.map(c => c.symbol || c.fullName).join(' → ')}`);
    console.log(`Reasoning: ${multiResult.reasoning.summary}`);

    console.log('\n=== TEST COMPLETE ===');
})();
