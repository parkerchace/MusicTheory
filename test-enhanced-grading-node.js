/**
 * Node.js test runner for Enhanced Grading System Property Tests
 */

// Load the MusicTheoryEngine
const MusicTheoryEngine = require('./music-theory-engine.js');

// Simple test runner
function runPropertyTests() {
    console.log('=== Enhanced Grading System Property Tests ===\n');
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Test 1: Cross-Module Visual Consistency
    console.log('Running Property Test 1: Cross-Module Visual Consistency');
    try {
        const engine = new MusicTheoryEngine();
        let failures = 0;
        
        // Test basic grading consistency
        for (let i = 0; i < 50; i++) {
            const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            const keys = ['C', 'G', 'D', 'F'];
            const modes = ['functional', 'emotional', 'color'];
            
            const note = notes[Math.floor(Math.random() * notes.length)];
            const key = keys[Math.floor(Math.random() * keys.length)];
            const mode = modes[Math.floor(Math.random() * modes.length)];
            
            engine.setGradingMode(mode);
            
            const context = { elementType: 'note', key: key, scaleType: 'major' };
            const tier1 = engine.calculateElementGrade(note, context);
            const tier2 = engine.calculateElementGrade(note, context);
            
            if (tier1 !== tier2) {
                failures++;
            }
            
            const info1 = engine.getGradingTierInfo(tier1);
            const info2 = engine.getGradingTierInfo(tier2);
            
            if (info1.color !== info2.color || info1.label !== info2.label) {
                failures++;
            }
        }
        
        totalTests++;
        if (failures === 0) {
            console.log('✓ PASSED - Cross-Module Visual Consistency');
            passedTests++;
        } else {
            console.log(`✗ FAILED - Cross-Module Visual Consistency (${failures} failures)`);
            failedTests++;
        }
    } catch (error) {
        console.log(`✗ ERROR - Cross-Module Visual Consistency: ${error.message}`);
        totalTests++;
        failedTests++;
    }
    
    // Test 4: Educational Context Completeness
    console.log('\nRunning Property Test 4: Educational Context Completeness');
    try {
        const engine = new MusicTheoryEngine();
        let failures = 0;
        
        const modes = ['functional', 'emotional', 'color'];
        
        for (const mode of modes) {
            engine.setGradingMode(mode);
            
            for (let tier = 0; tier <= 4; tier++) {
                // Test educational context
                const educationalContext = engine.getEducationalContext(tier, mode);
                if (!educationalContext || typeof educationalContext !== 'string' || educationalContext.trim().length === 0) {
                    failures++;
                }
                
                // Test grading explanation
                const explanation = engine.getGradingExplanation('C', tier, { elementType: 'note', key: 'C', scaleType: 'major' });
                if (!explanation || typeof explanation !== 'string' || explanation.trim().length === 0) {
                    failures++;
                }
                
                // Test theoretical basis
                const basis = engine.getTheoreticalBasis(tier, mode, {});
                if (!basis || typeof basis !== 'string' || basis.trim().length === 0) {
                    failures++;
                }
            }
        }
        
        totalTests++;
        if (failures === 0) {
            console.log('✓ PASSED - Educational Context Completeness');
            passedTests++;
        } else {
            console.log(`✗ FAILED - Educational Context Completeness (${failures} failures)`);
            failedTests++;
        }
    } catch (error) {
        console.log(`✗ ERROR - Educational Context Completeness: ${error.message}`);
        totalTests++;
        failedTests++;
    }
    
    // Test 5: Accessibility Information Inclusion
    console.log('\nRunning Property Test 5: Accessibility Information Inclusion');
    try {
        const engine = new MusicTheoryEngine();
        let failures = 0;
        
        const modes = ['functional', 'emotional', 'color'];
        
        for (const mode of modes) {
            engine.setGradingMode(mode);
            
            for (let tier = 0; tier <= 4; tier++) {
                const accessibilityInfo = engine.getAccessibleGradingInfo(tier, { mode: mode });
                
                // Check required fields
                const requiredFields = ['pattern', 'shape', 'screenReaderText', 'textLabel', 'highContrastColor', 'audioCue'];
                for (const field of requiredFields) {
                    if (!accessibilityInfo[field] || 
                        typeof accessibilityInfo[field] !== 'string' ||
                        accessibilityInfo[field].trim().length === 0) {
                        failures++;
                    }
                }
                
                // Check high contrast color format
                if (!accessibilityInfo.highContrastColor.match(/^#[0-9A-Fa-f]{6}$/)) {
                    failures++;
                }
                
                // Check tier info integration
                const tierInfo = engine.getGradingTierInfo(tier);
                if (!tierInfo.accessibilityInfo) {
                    failures++;
                }
            }
        }
        
        totalTests++;
        if (failures === 0) {
            console.log('✓ PASSED - Accessibility Information Inclusion');
            passedTests++;
        } else {
            console.log(`✗ FAILED - Accessibility Information Inclusion (${failures} failures)`);
            failedTests++;
        }
    } catch (error) {
        console.log(`✗ ERROR - Accessibility Information Inclusion: ${error.message}`);
        totalTests++;
        failedTests++;
    }
    
    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    return {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        success: failedTests === 0
    };
}

// Run the tests
if (require.main === module) {
    runPropertyTests();
}

module.exports = { runPropertyTests };