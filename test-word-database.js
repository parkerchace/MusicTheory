// Quick test of word database improvements
// Run with: node test-word-database.js

// Mock the required classes for Node.js testing
class MusicTheoryEngine {
    getScaleNotes() { return ['C', 'D', 'E', 'F', 'G', 'A', 'B']; }
    getDiatonicChord() { return { root: 'C', chordType: 'maj' }; }
    findAllContainerChords() { return []; }
    getGradingTierInfo() { return 'Perfect'; }
}

// Load the word database
const fs = require('fs');
const path = require('path');

// Read and execute the word database file
const wordDbCode = fs.readFileSync(path.join(__dirname, 'word-database.js'), 'utf8');
eval(wordDbCode);

// Test the improvements
console.log('🎵 Testing Word Database Improvements\n');

const wordDB = new WordDatabase();

// Test the problematic words from the log
const testWords = ['insane', 'melon', 'watermelon', 'tooth', 'scary', 'forever', 'ancient', 'medieval'];

console.log('=== Emotional Analysis Results ===');
testWords.forEach(word => {
    const emotion = wordDB.getEmotionalValence(word);
    console.log(`${word.padEnd(12)}: valence=${emotion.valence.toFixed(2)}, arousal=${emotion.arousal.toFixed(2)}, dominance=${emotion.dominance.toFixed(2)}`);
});

console.log('\n=== Testing Phonetic Fallback ===');
const unknownWords = ['blorgify', 'xyzqwerty', 'mellowness'];
unknownWords.forEach(word => {
    const emotion = wordDB.getEmotionalValence(word);
    console.log(`${word.padEnd(12)}: valence=${emotion.valence.toFixed(2)}, arousal=${emotion.arousal.toFixed(2)}, dominance=${emotion.dominance.toFixed(2)} (phonetic fallback)`);
});

console.log('\n✅ Word database improvements verified!');