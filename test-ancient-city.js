const GenMapper = require('./generative-word-mapper.js');
const PhoneticAnalyzer = require('./phonetic-analyzer.js');
const ChordAttrEngine = require('./chord-attribute-engine.js');
const MusicTheoryEngine = require('./music-theory-engine.js');

const phonetic = new PhoneticAnalyzer();
const chordAttrs = new ChordAttrEngine();
const musicTheory = new MusicTheoryEngine();
const mapper = new GenMapper(phonetic, chordAttrs, musicTheory, { useRealTimeSemantics: false });
mapper.debug = false;

(async () => {
    const r = await mapper.mapWords('ancient city medieval');
    
    console.log('=== Multi-Word Analysis: "ancient city medieval" ===\n');
    console.log('Individual word semantics:');
    for (const wm of r.wordMappings) {
        console.log(`  ${wm.word}:`);
        console.log(`    Valence: ${wm.semantic.emotional.valence.toFixed(2)}`);
        console.log(`    Arousal: ${wm.semantic.emotional.arousal.toFixed(2)}`);
        console.log(`    Intensity: ${wm.semantic.intensity.toFixed(2)}`);
        console.log(`    Context: ${wm.semantic.contextual.join(', ')}`);
    }
    
    console.log('\nBlended attributes:');
    console.log(`  Brightness: ${(r.blended.brightness * 100).toFixed(0)}%`);
    console.log(`  Tension: ${(r.blended.tension * 100).toFixed(0)}%`);
    console.log(`  Density: ${(r.blended.density * 100).toFixed(0)}%`);
    console.log(`  Intensity: ${(r.blended.intensity * 100).toFixed(0)}%`);
    
    console.log(`\nScale: ${r.scale.root} ${r.scale.name}`);
    console.log('Progression:', r.progression.map(c => c.symbol || c.fullName).join(' → '));
})();
