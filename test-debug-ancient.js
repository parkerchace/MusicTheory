const GenMapper = require('./generative-word-mapper.js');
const PhoneticAnalyzer = require('./phonetic-analyzer.js');
const ChordAttrEngine = require('./chord-attribute-engine.js');
const MusicTheoryEngine = require('./music-theory-engine.js');

const phonetic = new PhoneticAnalyzer();
const chordAttrs = new ChordAttrEngine();
const musicTheory = new MusicTheoryEngine();
const mapper = new GenMapper(phonetic, chordAttrs, musicTheory, { useRealTimeSemantics: false });

// Monkey-patch _inferSemantics to debug
const original = mapper._inferSemantics.bind(mapper);
mapper._inferSemantics = async function(word) {
    const result = await original(word);
    console.log(`\n_inferSemantics("${word}"):`);
    console.log('  valence:', result.emotional.valence);
    console.log('  arousal:', result.emotional.arousal);
    console.log('  intensity:', result.intensity);
    console.log('  context:', result.contextual);
    return result;
};

mapper.debug = false;

(async () => {
    await mapper.mapWord('ancient');
})();
