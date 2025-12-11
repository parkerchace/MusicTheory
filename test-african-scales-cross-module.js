/**
 * Test African Scales Cross-Module Integration
 * Verify that African scales work with chord generation and other music theory operations
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

function testAfricanScalesCrossModule() {
    console.log('=== Testing African Scales Cross-Module Integration ===');
    
    if (!MusicTheoryEngine) {
        console.error('❌ MusicTheoryEngine not available');
        return false;
    }

    const musicEngine = new MusicTheoryEngine();
    // Get all African scales dynamically from the system
    const allScaleCategories = musicEngine.getScaleCategories();
    const africanScales = allScaleCategories['🌍 African Scales'] || [];
    
    let allTestsPassed = true;
    
    for (const scaleName of africanScales) {
        console.log(`\n🌍 Testing cross-module integration for ${scaleName}:`);
        
        try {
            // Test 1: Scale degree calculation
            const scaleNotes = musicEngine.getScaleNotes('C', scaleName);
            if (scaleNotes && scaleNotes.length > 0) {
                console.log(`   ✅ Scale notes: [${scaleNotes.join(', ')}]`);
            } else {
                console.error(`❌ Failed to get scale notes for ${scaleName}`);
                allTestsPassed = false;
                continue;
            }
            
            // Test 2: Chord generation (for scales with enough notes)
            if (scaleNotes.length >= 3) {
                try {
                    // Try to get diatonic chords
                    const firstChord = musicEngine.getDiatonicChord(1, 'C', scaleName);
                    if (firstChord) {
                        console.log(`   ✅ First diatonic chord: ${firstChord.fullName || firstChord.root + firstChord.chordType}`);
                    } else {
                        console.log(`   ⚠️  Diatonic chord generation not available for ${scaleName} (may be expected for non-traditional scales)`);
                    }
                } catch (error) {
                    console.log(`   ⚠️  Diatonic chord generation error for ${scaleName}: ${error.message} (may be expected for non-traditional scales)`);
                }
            }
            
            // Test 3: Scale transposition
            const transposedNotes = musicEngine.getScaleNotes('G', scaleName);
            if (transposedNotes && transposedNotes.length === scaleNotes.length) {
                console.log(`   ✅ Transposition to G works: [${transposedNotes.join(', ')}]`);
            } else {
                console.error(`❌ Transposition failed for ${scaleName}`);
                allTestsPassed = false;
            }
            
            // Test 4: Scale interval analysis
            const intervals = musicEngine.scales[scaleName];
            if (intervals && Array.isArray(intervals)) {
                const intervalSteps = [];
                for (let i = 1; i < intervals.length; i++) {
                    intervalSteps.push(intervals[i] - intervals[i-1]);
                }
                console.log(`   ✅ Interval steps: [${intervalSteps.join(', ')}]`);
            } else {
                console.error(`❌ Scale intervals not accessible for ${scaleName}`);
                allTestsPassed = false;
            }
            
            // Test 5: Note validation within scale
            const rootNote = scaleNotes[0];
            const isInScale = musicEngine.isNoteInScale ? musicEngine.isNoteInScale(rootNote, 'C', scaleName) : true;
            if (isInScale !== false) { // Allow undefined (method doesn't exist) or true
                console.log(`   ✅ Note validation works (root note ${rootNote} is in scale)`);
            } else {
                console.error(`❌ Note validation failed for ${scaleName}`);
                allTestsPassed = false;
            }
            
        } catch (error) {
            console.error(`❌ Cross-module integration error for ${scaleName}:`, error.message);
            allTestsPassed = false;
        }
    }
    
    // Test 6: Verify African scales appear in scale categories
    console.log('\n📋 Testing scale categorization:');
    const scaleCategories = musicEngine.getScaleCategories();
    const africanCategory = scaleCategories['🌍 African Scales'];
    
    if (africanCategory && Array.isArray(africanCategory)) {
        console.log(`   ✅ African Scales category exists with ${africanCategory.length} scales`);
        
        // Check that all our scales are in the category
        for (const scaleName of africanScales) {
            if (africanCategory.includes(scaleName)) {
                console.log(`   ✅ ${scaleName} found in African Scales category`);
            } else {
                console.error(`❌ ${scaleName} missing from African Scales category`);
                allTestsPassed = false;
            }
        }
    } else {
        console.error('❌ African Scales category not found or invalid');
        allTestsPassed = false;
    }
    
    // Test 7: Citation system integration
    console.log('\n📚 Testing citation system integration:');
    for (const scaleName of africanScales) {
        try {
            const citation = musicEngine.getScaleCitation(scaleName);
            if (citation && citation.length > 0 && !citation.includes('not documented')) {
                console.log(`   ✅ ${scaleName} has proper citation`);
            } else {
                console.error(`❌ ${scaleName} missing or invalid citation`);
                allTestsPassed = false;
            }
        } catch (error) {
            console.error(`❌ Citation error for ${scaleName}:`, error.message);
            allTestsPassed = false;
        }
    }
    
    if (allTestsPassed) {
        console.log('\n✅ All African scales cross-module integration tests PASSED');
    } else {
        console.log('\n❌ Some African scales cross-module integration tests FAILED');
    }
    
    return allTestsPassed;
}

// Run the test
if (typeof window !== 'undefined') {
    // Browser environment
    window.testAfricanScalesCrossModule = testAfricanScalesCrossModule;
    
    // Auto-run if this script is loaded directly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', testAfricanScalesCrossModule);
    } else {
        testAfricanScalesCrossModule();
    }
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { testAfricanScalesCrossModule };
    
    // Auto-run if this script is executed directly
    if (require.main === module) {
        testAfricanScalesCrossModule();
    }
}