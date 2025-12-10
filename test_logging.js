const MusicTheoryEngine = require('./music-theory-engine.js');
const WordDatabase = require('./word-database.js');
const LexicalMusicEngineV2 = require('./lexical-music-engine-v2.js');

const musicTheory = new MusicTheoryEngine();
const wordDB = new WordDatabase();
const lexical = new LexicalMusicEngineV2(musicTheory, wordDB);

const weights = { emotional: 0.3, semantic: 0.25, phonetic: 0.15, archetype: 0.10 };
const result1 = lexical.translateWords('chase night', { weights });
console.log('\n--- LOG ENTRY 1 TEXT ---\n');
console.log(result1._latestLogEntry.text);

const result2 = lexical.translateWords('chase night', { weights });
console.log('\n--- LOG ENTRY 2 TEXT ---\n');
console.log(result2._latestLogEntry.text);

console.log('\nTotal translations:', lexical.getSessionLog().length);
