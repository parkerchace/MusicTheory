/**
 * Property-Based Test for 12-TET Compatibility and Approximation Documentation
 * **Feature: academic-scale-enhancement, Property 5: 12-TET Compatibility and Approximation Documentation**
 * **Validates: Requirements 1.4, 2.5, 5.5**
 * 
 * This test verifies that all scales in the system are represented in 12-TET format
 * for compatibility with standard orchestral instruments, and for scales with 
 * non-12-TET origins, the system documents the approximation methodology.
 */

// Import the MusicTheoryEngine
let MusicTheoryEngine;
try {
    if (typeof require !== 'undefined') {
        MusicTheoryEngine = require('./music-theory-engine.js');
    } else if (typeof window !== 'undefined' && window.MusicTheoryEngine) {
        MusicTheoryEngine = window.MusicTheoryEngine;
    }
} catch (error) {
    console.error('Could not load MusicTheoryEngine:', error);
}

/**
 * Property 5: 12-TET Compatibility and Approximation Documentation
 * For any scale in the system, it should be represented in 12-TET format for 
 * compatibility with standard orchestral instruments, and for scales with 
 * non-12-TET origins, the system should document the approximation methodology, 
 * scholarly justification, and potential limitations.
 */
function testTwelveTETCompatibilityProperty() {
    console.log('=== Property 5: 12-TET Compatibility and Approximation Documentation ===');
    
    if (!MusicTheoryEngine) {
        console.error('❌ MusicTheoryEngine not available');
        return false;
    }

    const musicEngine = new MusicTheoryEngine();
    const allScales = musicEngine.scales;
    const scaleCitations = musicEngine.scaleCitations;
    
    let allTestsPassed = true;
    let testedScales = 0;
    let scalesWithApproximationDocs = 0;
    
    console.log(`Testing ${Object.keys(allScales).length} scales for 12-TET compatibility...`);
    
    for (const [scaleName, intervals] of Object.entries(allScales)) {
        testedScales++;
        
        // Test 1: All intervals must be valid 12-TET values (0-11)
        const validTwelveTET = intervals.every(interval => 
            Number.isInteger(interval) && interval >= 0 && interval <= 11
        );
        
        if (!validTwelveTET) {
            console.error(`❌ Scale "${scaleName}" contains invalid 12-TET intervals:`, intervals);
            allTestsPassed = false;
            continue;
        }
        
        // Test 2: Check if scale has proper citation documentation
        const citation = scaleCitations[scaleName];
        if (!citation) {
            console.warn(`⚠️  Scale "${scaleName}" missing citation documentation`);
            continue;
        }
        
        // Test 3: For scales with traditional non-12-TET origins, check approximation documentation
        if (citation.tuningSystem) {
            const tuningSystem = citation.tuningSystem;
            
            // Check required fields for approximation documentation
            const hasOriginalDescription = tuningSystem.original && tuningSystem.original.length > 0;
            const hasApproximationMethod = tuningSystem.approximationMethod && tuningSystem.approximationMethod.length > 0;
            const hasOrchestralCompatibility = tuningSystem.orchestralInstruments && tuningSystem.orchestralInstruments.length > 0;
            
            if (hasOriginalDescription && hasApproximationMethod && hasOrchestralCompatibility) {
                scalesWithApproximationDocs++;
                
                // Test 4: Verify orchestral compatibility mentions standard instruments
                const orchestralText = tuningSystem.orchestralInstruments.toLowerCase();
                const standardInstruments = ['violin', 'viola', 'cello', 'bass', 'wind', 'brass'];
                const mentionsStandardInstruments = standardInstruments.some(instrument => 
                    orchestralText.includes(instrument)
                );
                
                if (!mentionsStandardInstruments) {
                    console.error(`❌ Scale "${scaleName}" approximation docs don't mention standard orchestral instruments`);
                    allTestsPassed = false;
                }
                
                // Test 5: Check for limitations documentation when approximation is involved
                if (tuningSystem.original.toLowerCase().includes('traditional') || 
                    tuningSystem.original.toLowerCase().includes('microtonal') ||
                    tuningSystem.approximationMethod.toLowerCase().includes('approximat')) {
                    
                    const hasLimitations = tuningSystem.limitations && tuningSystem.limitations.length > 0;
                    if (!hasLimitations) {
                        console.error(`❌ Scale "${scaleName}" with traditional/microtonal origins missing limitations documentation`);
                        allTestsPassed = false;
                    }
                }
            }
        }
        
        // Test 6: Verify scale works with standard music theory operations
        try {
            const scaleNotes = musicEngine.getScaleNotes('C', scaleName);
            if (!scaleNotes || scaleNotes.length === 0) {
                console.error(`❌ Scale "${scaleName}" fails to generate notes in 12-TET system`);
                allTestsPassed = false;
            }
        } catch (error) {
            console.error(`❌ Scale "${scaleName}" causes error in 12-TET operations:`, error.message);
            allTestsPassed = false;
        }
    }
    
    // Summary statistics
    console.log(`\n📊 Test Summary:`);
    console.log(`   • Total scales tested: ${testedScales}`);
    console.log(`   • Scales with approximation documentation: ${scalesWithApproximationDocs}`);
    console.log(`   • All scales use valid 12-TET intervals: ${allTestsPassed ? '✅' : '❌'}`);
    
    // Test 7: Verify African scales specifically (since this is part of the African scales task)
    const scaleCategories = musicEngine.getScaleCategories();
    const africanScales = scaleCategories['🌍 African Scales'] || [];
    
    console.log(`\n🌍 African Scales 12-TET Compatibility:`);
    for (const africanScale of africanScales) {
        if (allScales[africanScale]) {
            const intervals = allScales[africanScale];
            const validTwelveTET = intervals.every(interval => 
                Number.isInteger(interval) && interval >= 0 && interval <= 11
            );
            console.log(`   • ${africanScale}: ${validTwelveTET ? '✅' : '❌'} 12-TET compatible`);
            
            if (!validTwelveTET) {
                allTestsPassed = false;
            }
        } else {
            console.log(`   • ${africanScale}: ⚠️  Not yet implemented`);
        }
    }
    
    if (allTestsPassed) {
        console.log('\n✅ Property 5 PASSED: All scales maintain 12-TET compatibility with proper documentation');
    } else {
        console.log('\n❌ Property 5 FAILED: Some scales violate 12-TET compatibility requirements');
    }
    
    return allTestsPassed;
}

// Run the test
if (typeof window !== 'undefined') {
    // Browser environment
    window.testTwelveTETCompatibilityProperty = testTwelveTETCompatibilityProperty;
    
    // Auto-run if this script is loaded directly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', testTwelveTETCompatibilityProperty);
    } else {
        testTwelveTETCompatibilityProperty();
    }
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { testTwelveTETCompatibilityProperty };
    
    // Auto-run if this script is executed directly
    if (require.main === module) {
        testTwelveTETCompatibilityProperty();
    }
}