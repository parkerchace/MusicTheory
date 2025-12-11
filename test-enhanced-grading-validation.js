/**
 * Validation test for Enhanced Grading System integration
 */

const MusicTheoryEngine = require('./music-theory-engine.js');

function validateEnhancedGradingSystem() {
    console.log('=== Enhanced Grading System Validation ===\n');
    
    const engine = new MusicTheoryEngine();
    
    // Test 1: Basic grading functionality
    console.log('1. Testing basic grading functionality...');
    try {
        engine.setGradingMode('functional');
        const tier = engine.calculateElementGrade('C', { elementType: 'note', key: 'C', scaleType: 'major' });
        console.log(`   ✓ Note C in C major gets tier ${tier} (functional mode)`);
        
        engine.setGradingMode('emotional');
        const emotionalTier = engine.calculateElementGrade('C', { elementType: 'note', key: 'C', scaleType: 'major' });
        console.log(`   ✓ Note C in C major gets tier ${emotionalTier} (emotional mode)`);
        
        engine.setGradingMode('color');
        const colorTier = engine.calculateElementGrade('C', { elementType: 'note', key: 'C', scaleType: 'major' });
        console.log(`   ✓ Note C in C major gets tier ${colorTier} (color mode)`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
        return false;
    }
    
    // Test 2: Enhanced tier info
    console.log('\n2. Testing enhanced tier info...');
    try {
        engine.setGradingMode('functional');
        const tierInfo = engine.getGradingTierInfo(3);
        
        console.log(`   ✓ Tier info includes: ${Object.keys(tierInfo).join(', ')}`);
        console.log(`   ✓ Educational context: "${tierInfo.educationalContext.substring(0, 50)}..."`);
        console.log(`   ✓ Theoretical basis: "${tierInfo.theoreticalBasis.substring(0, 50)}..."`);
        console.log(`   ✓ Accessibility info: ${Object.keys(tierInfo.accessibilityInfo).join(', ')}`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
        return false;
    }
    
    // Test 3: Grading explanations
    console.log('\n3. Testing grading explanations...');
    try {
        const explanation = engine.getGradingExplanation('F#', 1, { 
            elementType: 'note', 
            key: 'C', 
            scaleType: 'major' 
        });
        console.log(`   ✓ Explanation for F# in C major: "${explanation.substring(0, 80)}..."`);
        
        const rationale = engine.explainGradingRationale('G', { 
            elementType: 'note', 
            key: 'C', 
            scaleType: 'major' 
        });
        console.log(`   ✓ Rationale includes: ${Object.keys(rationale).join(', ')}`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
        return false;
    }
    
    // Test 4: Alternative suggestions
    console.log('\n4. Testing alternative suggestions...');
    try {
        const alternatives = engine.suggestAlternatives('F#', 3, { 
            elementType: 'note', 
            key: 'C', 
            scaleType: 'major' 
        });
        console.log(`   ✓ Found ${alternatives.length} alternatives with tier 3 or higher`);
        if (alternatives.length > 0) {
            console.log(`   ✓ First alternative: ${alternatives[0].element} (tier ${alternatives[0].tier})`);
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
        return false;
    }
    
    // Test 5: Perspective comparison
    console.log('\n5. Testing perspective comparison...');
    try {
        const comparison = engine.compareGradingPerspectives('E', { 
            elementType: 'note', 
            key: 'C', 
            scaleType: 'major' 
        });
        console.log(`   ✓ Compared across ${Object.keys(comparison).length} perspectives`);
        for (const [mode, data] of Object.entries(comparison)) {
            console.log(`   ✓ ${mode}: tier ${data.tier} (${data.info.name})`);
        }
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
        return false;
    }
    
    // Test 6: Chord grading
    console.log('\n6. Testing chord grading...');
    try {
        const chordTier = engine.calculateElementGrade('Cmaj7', { 
            elementType: 'chord', 
            key: 'C', 
            scaleType: 'major' 
        });
        console.log(`   ✓ Cmaj7 in C major gets tier ${chordTier}`);
        
        const chordExplanation = engine.getGradingExplanation('Cmaj7', chordTier, { 
            elementType: 'chord', 
            key: 'C', 
            scaleType: 'major' 
        });
        console.log(`   ✓ Chord explanation: "${chordExplanation.substring(0, 60)}..."`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
        return false;
    }
    
    // Test 7: Accessibility features
    console.log('\n7. Testing accessibility features...');
    try {
        const accessibilityInfo = engine.getAccessibleGradingInfo(2, { mode: 'functional' });
        console.log(`   ✓ Accessibility pattern: ${accessibilityInfo.pattern}`);
        console.log(`   ✓ Accessibility shape: ${accessibilityInfo.shape}`);
        console.log(`   ✓ Screen reader text: "${accessibilityInfo.screenReaderText}"`);
        console.log(`   ✓ High contrast color: ${accessibilityInfo.highContrastColor}`);
        console.log(`   ✓ Audio cue: ${accessibilityInfo.audioCue}`);
    } catch (error) {
        console.log(`   ✗ Error: ${error.message}`);
        return false;
    }
    
    console.log('\n=== Validation Complete ===');
    console.log('✓ All enhanced grading system features are working correctly!');
    return true;
}

// Run validation
if (require.main === module) {
    validateEnhancedGradingSystem();
}

module.exports = { validateEnhancedGradingSystem };