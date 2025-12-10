const MusicTheoryEngine = require('./music-theory-engine.js');
const WordDatabase = require('./word-database.js');
const LexicalMusicEngineV2 = require('./lexical-music-engine-v2.js');

const musicTheory = new MusicTheoryEngine();
const wordDB = new WordDatabase();
const lexical = new LexicalMusicEngineV2(musicTheory, wordDB);

function run(input, opts = {}) {
    const res = lexical.translateWords(input, opts);
    console.log('\nINPUT:', input);
    console.log('Options:', opts);
    console.log('Scale:', res.scale);
    console.log('Reasoning summary:', res.reasoning && res.reasoning.summary);
    console.log('Scale choice detail:', res.reasoning && res.reasoning.scaleChoice);
    if (res._latestLogEntry) console.log('\nLog text:\n', res._latestLogEntry.text);
}

// Default
run('evil lonely', { weights: { emotional: 0.3, semantic: 0.25, phonetic: 0.15, syllabic: 0.2, archetype: 0.1 } });

// Strong emotional
run('evil lonely', { weights: { emotional: 0.8, semantic: 0.05, phonetic: 0.05, syllabic: 0.05, archetype: 0.05 } });

// Aggressive flag
run('evil lonely', { weights: { emotional: 0.4, semantic: 0.2, phonetic: 0.2, syllabic: 0.1, archetype: 0.1 }, aggressive: true });
