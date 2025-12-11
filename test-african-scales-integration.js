/**
 * Test African Scales Integration
 * Verify that the newly added African scales work properly in the music theory system
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

function testAfricanScalesIntegration() {
    console.log('=== Testing African Scales Integration ===');
    
    if (!MusicTheoryEngine) {
        console.error('❌ MusicTheoryEngine not available');
        return false;
    }

    const musicEngine = new MusicTheoryEngine();
    const scaleCategories = musicEngine.getScaleCategories();
    const africanScales = scaleCategories['🌍 African Scales'] || [];
    
    console.log(`Found ${africanScales.length} African scales in categories:`, africanScales);
    
    let allTestsPassed = true;
    
    // Test each African scale
    for (const scaleName of africanScales) {
        console.log(`\n🌍 Testing ${scaleName}:`);
        
        // Test 1: Scale exists in scales object
        const scaleIntervals = musicEngine.scales[scaleName];
        if (!scaleIntervals) {
            console.error(`❌ Scale "${scaleName}" not found in scales object`);
            allTestsPassed = false;
            continue;
        }
        console.log(`   ✅ Scale intervals: [${scaleIntervals.join(', ')}]`);
        
        // Test 2: Scale has citation documentation
        const citation = musicEngine.scaleCitations[scaleName];
        if (!citation) {
            console.error(`❌ Scale "${scaleName}" missing citation documentation`);
            allTestsPassed = false;
            continue;
        }
        console.log(`   ✅ Has citation documentation`);
        
        // Test 3: Citation has required fields
        const requiredFields = ['description', 'culturalContext', 'tuningSystem', 'references'];
        for (const field of requiredFields) {
            if (!citation[field]) {
                console.error(`❌ Scale "${scaleName}" missing required citation field: ${field}`);
                allTestsPassed = false;
            }
        }
        
        // Test 4: Cultural context has required subfields
        if (citation.culturalContext) {
            const requiredCulturalFields = ['region', 'culturalGroup', 'historicalPeriod', 'musicalFunction'];
            for (const field of requiredCulturalFields) {
                if (!citation.culturalContext[field]) {
                    console.error(`❌ Scale "${scaleName}" missing cultural context field: ${field}`);
                    allTestsPassed = false;
                }
            }
        }
        
        // Test 5: Tuning system has required subfields
        if (citation.tuningSystem) {
            const requiredTuningFields = ['original', 'approximationMethod', 'orchestralInstruments', 'limitations', 'pedagogicalNotes'];
            for (const field of requiredTuningFields) {
                if (!citation.tuningSystem[field]) {
                    console.error(`❌ Scale "${scaleName}" missing tuning system field: ${field}`);
                    allTestsPassed = false;
                }
            }
        }
        
        // Test 6: Scale can generate notes
        try {
            const scaleNotes = musicEngine.getScaleNotes('C', scaleName);
            if (scaleNotes && scaleNotes.length > 0) {
                console.log(`   ✅ Generates notes: [${scaleNotes.join(', ')}]`);
            } else {
                console.error(`❌ Scale "${scaleName}" failed to generate notes`);
                allTestsPassed = false;
            }
        } catch (error) {
            console.error(`❌ Scale "${scaleName}" error generating notes:`, error.message);
            allTestsPassed = false;
        }
        
        // Test 7: Scale citation can be formatted
        try {
            const citationText = musicEngine.getScaleCitation(scaleName, 'text');
            const citationHtml = musicEngine.getScaleCitation(scaleName, 'html');
            
            if (citationText && citationText.length > 0) {
                console.log(`   ✅ Citation text format works`);
            } else {
                console.error(`❌ Scale "${scaleName}" citation text format failed`);
                allTestsPassed = false;
            }
            
            if (citationHtml && citationHtml.length > 0) {
                console.log(`   ✅ Citation HTML format works`);
            } else {
                console.error(`❌ Scale "${scaleName}" citation HTML format failed`);
                allTestsPassed = false;
            }
        } catch (error) {
            console.error(`❌ Scale "${scaleName}" error formatting citation:`, error.message);
            allTestsPassed = false;
        }
    }
    
    // Test 8: Verify specific African scale characteristics
    console.log('\n🔍 Verifying specific African scale characteristics:');
    
    // Test pentatonic_african is actually pentatonic
    const pentatonicAfrican = musicEngine.scales.pentatonic_african;
    if (pentatonicAfrican && pentatonicAfrican.length === 5) {
        console.log('   ✅ pentatonic_african has 5 notes as expected');
    } else {
        console.error('❌ pentatonic_african should have exactly 5 notes');
        allTestsPassed = false;
    }
    
    // Test heptatonic_akan is actually heptatonic
    const heptatonicAkan = musicEngine.scales.heptatonic_akan;
    if (heptatonicAkan && heptatonicAkan.length === 7) {
        console.log('   ✅ heptatonic_akan has 7 notes as expected');
    } else {
        console.error('❌ heptatonic_akan should have exactly 7 notes');
        allTestsPassed = false;
    }
    
    // Test mbira_tuning is hexatonic
    const mbiraTuning = musicEngine.scales.mbira_tuning;
    if (mbiraTuning && mbiraTuning.length === 6) {
        console.log('   ✅ mbira_tuning has 6 notes as expected');
    } else {
        console.error('❌ mbira_tuning should have exactly 6 notes');
        allTestsPassed = false;
    }
    
    // Test xylophone_chopi is pentatonic
    const xylophoneChopi = musicEngine.scales.xylophone_chopi;
    if (xylophoneChopi && xylophoneChopi.length === 5) {
        console.log('   ✅ xylophone_chopi has 5 notes as expected');
    } else {
        console.error('❌ xylophone_chopi should have exactly 5 notes');
        allTestsPassed = false;
    }
    
    if (allTestsPassed) {
        console.log('\n✅ All African scales integration tests PASSED');
    } else {
        console.log('\n❌ Some African scales integration tests FAILED');
    }
    
    return allTestsPassed;
}

// Run the test
if (typeof window !== 'undefined') {
    // Browser environment
    window.testAfricanScalesIntegration = testAfricanScalesIntegration;
    
    // Auto-run if this script is loaded directly
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', testAfricanScalesIntegration);
    } else {
        testAfricanScalesIntegration();
    }
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { testAfricanScalesIntegration };
    
    // Auto-run if this script is executed directly
    if (require.main === module) {
        testAfricanScalesIntegration();
    }
}