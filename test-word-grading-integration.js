/**
 * Test Word Tool Grading Integration
 * Tests the enhanced grading system integration with word-to-music translation
 */

// Load required modules
const fs = require('fs');
const path = require('path');

// Load the modules (assuming they're in the same directory)
function loadModule(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    // Simple eval-based loading for testing
    eval(content);
}

try {
    loadModule('music-theory-engine.js');
    loadModule('scale-intelligence-engine.js');
    loadModule('simple-word-engine.js');
} catch (error) {
    console.error('Error loading modules:', error.message);
    process.exit(1);
}

console.log('=== WORD TOOL GRADING INTEGRATION TEST ===\n');

// Initialize engines
const musicTheory = new MusicTheoryEngine();
const wordEngine = new SimpleWordEngine(musicTheory);

// Test words
const testWords = [
    'dark mysterious forest',
    'bright sunny day',
    'energetic chase scene',
    'calm peaceful meditation'
];

// Test each grading mode
const gradingModes = ['functional', 'emotional', 'color'];

async function testGradingIntegration() {
    for (const mode of gradingModes) {
        console.log(`\n🎯 TESTING ${mode.toUpperCase()} GRADING MODE`);
        console.log('='.repeat(50));
        
        // Set grading mode
        musicTheory.setGradingMode(mode);
        
        for (const words of testWords) {
            console.log(`\n📝 Input: "${words}"`);
            
            try {
                const result = await wordEngine.translateWords(words);
                
                console.log(`🎼 Scale: ${result.scale.root} ${result.scale.name}`);
                console.log(`🎵 Grading Mode: ${result.gradingMode}`);
                
                // Display progression with grading info
                console.log('🎹 Progression:');
                result.progression.forEach((chord, i) => {
                    console.log(`  ${i + 1}. ${chord.fullName} (${chord.tier}) - ${chord.reasoning}`);
                });
                
                // Display grading influence
                if (result.gradingInfluence) {
                    console.log('📊 Grading Influence:');
                    console.log(`  Summary: ${result.gradingInfluence.summary}`);
                    console.log(`  Impact: ${result.gradingInfluence.impact}`);
                }
                
                // Display character adjustment
                if (result.character.gradingInfluence) {
                    console.log(`🎭 Character Adjustment: ${result.character.gradingInfluence}`);
                }
                
            } catch (error) {
                console.error(`❌ Error processing "${words}":`, error.message);
            }
        }
    }
}

// Test grading mode changes
async function testGradingModeChanges() {
    console.log('\n\n🔄 TESTING GRADING MODE CHANGES');
    console.log('='.repeat(50));
    
    const testWord = 'dark mysterious';
    
    for (const mode of gradingModes) {
        console.log(`\n🎯 Switching to ${mode} mode...`);
        musicTheory.setGradingMode(mode);
        
        const result = await wordEngine.translateWords(testWord);
        console.log(`Result: ${result.scale.root} ${result.scale.name} (${result.gradingMode} mode)`);
        
        if (result.gradingInfluence) {
            console.log(`Influence: ${result.gradingInfluence.impact}`);
        }
    }
}

// Run tests
async function runTests() {
    try {
        await testGradingIntegration();
        await testGradingModeChanges();
        
        console.log('\n✅ All grading integration tests completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Check if running directly
if (require.main === module) {
    runTests();
}

module.exports = { runTests };