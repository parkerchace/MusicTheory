const MusicTheoryEngine = require('./music-theory-engine.js');
const WordDatabase = require('./word-database.js');
const LexicalMusicEngineV2 = require('./lexical-music-engine-v2.js');

const musicTheory = new MusicTheoryEngine();
const wordDB = new WordDatabase();
const lexical = new LexicalMusicEngineV2(musicTheory, wordDB);

function run(input, weights) {
    const res = lexical.translateWords(input, { weights });
    console.log('\nINPUT:', input);
    console.log('Weights:', weights);
    console.log('Scale:', res.scale);
    console.log('Reasoning summary:', res.reasoning && res.reasoning.summary);
    console.log('Scale choice detail:', res.reasoning && res.reasoning.scaleChoice);
}

// Default weights (emotional moderate)
run('chase morning blood', { emotional: 0.3, semantic: 0.25, phonetic: 0.15, syllabic: 0.2, archetype: 0.1 });

// Emphasize emotional channel
run('chase morning blood', { emotional: 0.7, semantic: 0.1, phonetic: 0.1, syllabic: 0.05, archetype: 0.05 });

// Emphasize phonetic (brightness -> favors lydian)
run('chase morning blood', { emotional: 0.15, semantic: 0.15, phonetic: 0.5, syllabic: 0.1, archetype: 0.1 });
