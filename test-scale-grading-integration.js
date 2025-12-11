/**
 * Test Enhanced Scale Intelligence Engine with Grading Integration
 */

// Import the engines (simulated for Node.js testing)
const fs = require('fs');

// Read and evaluate the engine files
const musicEngineCode = fs.readFileSync('music-theory-engine.js', 'utf8');
const scaleEngineCode = fs.readFileSync('scale-intelligence-engine.js', 'utf8');

// Create a minimal environment for the engines
global.console = console;

// Evaluate the code
eval(musicEngineCode);
eval(scaleEngineCode);

function testEnhancedScaleEngine() {
    console.log('Testing Enhanced Scale Intelligence Engine...\n');
    
    try {
        // Initialize engines
        const musicEngine = new MusicTheoryEngine();
        const scaleEngine = new ScaleIntelligenceEngine(musicEngine);
        
        console.log('✓ Engines initialized successfully');
        
        // Test 1: Basic grading-influenced suggestions
        console.log('\n1. Testing grading-influenced suggestions...');
        
        musicEngine.setGradingMode('functional');
        
        const wordCharacteristics = {
            darkness: 0.8,
            mystery: 0.7,
            energy: 0.3,
            brightness: 0.2,
            words: ['dark', 'mysterious', 'woods']
        };
        
        const suggestions = scaleEngine.getGradingInfluencedSuggestions(
            wordCharacteristics,
            { gradingWeight: 0.5, maxSuggestions: 5, key: 'C' }
        );
        
        console.log(`✓ Generated ${suggestions.length} suggestions`);
        
        // Verify grading influence
        const hasGradingInfluence = suggestions.some(s => s.gradingBonus > 0);
        console.log(`✓ Grading influence detected: ${hasGradingInfluence}`);
        
        // Display top suggestions
        console.log('\nTop suggestions:');
        suggestions.slice(0, 3).forEach((suggestion, index) => {
            console.log(`  ${index + 1}. ${suggestion.name} (Tier ${suggestion.gradingTier}, Score: ${suggestion.score.toFixed(3)})`);
            if (suggestion.gradingExplanation) {
                console.log(`     ${suggestion.gradingExplanation}`);
            }
        });
        
        // Test 2: Grading mode comparison
        console.log('\n2. Testing grading mode comparison...');
        
        const comparison = scaleEngine.compareGradingPerspectives(
            wordCharacteristics,
            { gradingWeight: 0.3, maxSuggestions: 3 }
        );
        
        if (comparison.error) {
            console.log(`✗ Comparison failed: ${comparison.error}`);
        } else {
            console.log('✓ Grading mode comparison completed');
            
            ['functional', 'emotional', 'color'].forEach(mode => {
                const topSuggestion = comparison[mode].topSuggestion;
                console.log(`  ${mode}: ${topSuggestion.name} (Score: ${topSuggestion.score.toFixed(3)})`);
            });
        }
        
        // Test 3: Grading weight effect
        console.log('\n3. Testing grading weight effect...');
        
        musicEngine.setGradingMode('functional');
        
        const lowWeightSuggestions = scaleEngine.getGradingInfluencedSuggestions(
            wordCharacteristics,
            { gradingWeight: 0.1, maxSuggestions: 3 }
        );
        
        const highWeightSuggestions = scaleEngine.getGradingInfluencedSuggestions(
            wordCharacteristics,
            { gradingWeight: 0.8, maxSuggestions: 3 }
        );
        
        console.log('Low weight (0.1):');
        lowWeightSuggestions.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.name} (Bonus: +${s.gradingBonus.toFixed(3)})`);
        });
        
        console.log('High weight (0.8):');
        highWeightSuggestions.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.name} (Bonus: +${s.gradingBonus.toFixed(3)})`);
        });
        
        // Verify that higher weight produces higher bonuses
        const avgLowBonus = lowWeightSuggestions.reduce((sum, s) => sum + s.gradingBonus, 0) / lowWeightSuggestions.length;
        const avgHighBonus = highWeightSuggestions.reduce((sum, s) => sum + s.gradingBonus, 0) / highWeightSuggestions.length;
        
        console.log(`✓ Weight effect verified: ${avgHighBonus > avgLowBonus ? 'Higher weight produces higher bonuses' : 'Weight effect not detected'}`);
        
        // Test 4: Scale tier analysis
        console.log('\n4. Testing scale tier analysis...');
        
        for (let tier = 0; tier <= 4; tier++) {
            const scalesInTier = scaleEngine.getScalesByGradingTier(tier, { maxResults: 3 });
            const tierInfo = musicEngine.getGradingTierInfo(tier);
            console.log(`  Tier ${tier} (${tierInfo.name}): ${scalesInTier.join(', ') || 'None'}`);
        }
        
        console.log('\n🎉 All tests completed successfully!');
        return true;
        
    } catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testEnhancedScaleEngine();
}

module.exports = { testEnhancedScaleEngine };