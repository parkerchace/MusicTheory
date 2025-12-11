/**
 * Property-Based Test for Backward Compatibility and Organizational Structure
 * **Feature: academic-scale-enhancement, Property 7: Backward Compatibility and Organizational Structure**
 * **Validates: Requirements 4.2, 4.3, 4.4**
 * 
 * This test ensures that academic enhancements preserve existing workflows
 * while adding new regional categories.
 */

// Import required modules
let MusicTheoryEngine, ScaleLibrary;

if (typeof require !== 'undefined') {
    // Node.js environment
    try { MusicTheoryEngine = require('./music-theory-engine.js'); } catch (e) { MusicTheoryEngine = null; }
    try { ScaleLibrary = require('./scale-library.js'); } catch (e) { ScaleLibrary = null; }
} else if (typeof window !== 'undefined') {
    // Browser environment
    MusicTheoryEngine = window.MusicTheoryEngine;
    ScaleLibrary = window.ScaleLibrary;
}

/**
 * Property 7: Backward Compatibility and Organizational Structure
 * For any existing scale functionality or organizational category, 
 * the academic enhancements should preserve current workflows while adding new regional categories
 */
function testBackwardCompatibilityProperty() {
    console.log('🧪 Testing Property 7: Backward Compatibility and Organizational Structure');
    console.log('**Feature: academic-scale-enhancement, Property 7: Backward Compatibility and Organizational Structure**');
    console.log('**Validates: Requirements 4.2, 4.3, 4.4**');
    
    if (!MusicTheoryEngine) {
        console.error('❌ MusicTheoryEngine not available');
        return false;
    }

    const musicEngine = new MusicTheoryEngine();
    let scaleLibrary = null;
    
    if (ScaleLibrary) {
        scaleLibrary = new ScaleLibrary(musicEngine);
    }

    try {
        // Test 1: Verify existing scale categories are preserved (Requirement 4.2)
        console.log('\n📋 Test 1: Existing scale categories preservation');
        const scaleCategories = musicEngine.getScaleCategories();
        
        // Define expected existing categories that should be preserved
        const expectedExistingCategories = [
            '🎵 Major Scale & Modes',
            '🎼 Melodic Minor & Modes', 
            '🎹 Harmonic Minor & Modes',
            '🎶 Harmonic Major & Modes',
            '🌟 Double Harmonic & Modes',
            '⚖️ Symmetric Scales',
            '🎸 Pentatonic Scales',
            '🎺 Hexatonic Scales',
            '🕌 Middle Eastern Scales',
            '🪔 Indian Ragas',
            '💃 Spanish & Flamenco',
            '🎷 Jazz & Bebop',
            '🎹 Barry Harris Method',
            '✨ Exotic & Modern'
        ];
        
        let existingCategoriesPreserved = true;
        for (const expectedCategory of expectedExistingCategories) {
            if (!scaleCategories[expectedCategory]) {
                console.error(`❌ Missing existing category: ${expectedCategory}`);
                existingCategoriesPreserved = false;
            } else {
                console.log(`✅ Preserved category: ${expectedCategory}`);
            }
        }
        
        if (!existingCategoriesPreserved) {
            console.error('❌ Property 7 failed: Existing categories not preserved');
            return false;
        }

        // Test 2: Verify new regional categories are added (Requirement 4.3)
        console.log('\n📋 Test 2: New regional categories addition');
        const expectedNewCategories = [
            '🌎 South American Scales',
            '🌍 African Scales'
        ];
        
        let newCategoriesAdded = true;
        for (const newCategory of expectedNewCategories) {
            if (!scaleCategories[newCategory]) {
                console.error(`❌ Missing new regional category: ${newCategory}`);
                newCategoriesAdded = false;
            } else {
                const scalesInCategory = scaleCategories[newCategory];
                if (!Array.isArray(scalesInCategory) || scalesInCategory.length === 0) {
                    console.error(`❌ New category ${newCategory} is empty or invalid`);
                    newCategoriesAdded = false;
                } else {
                    console.log(`✅ Added category: ${newCategory} (${scalesInCategory.length} scales)`);
                }
            }
        }
        
        if (!newCategoriesAdded) {
            console.error('❌ Property 7 failed: New regional categories not properly added');
            return false;
        }

        // Test 3: Verify existing scales still work in all modules (Requirement 4.4)
        console.log('\n📋 Test 3: Existing scale functionality preservation');
        
        // Test a sample of existing scales across different categories
        const testScales = [
            'major',           // Major Scale & Modes
            'dorian',          // Major Scale & Modes
            'melodic',         // Melodic Minor & Modes
            'harmonic',        // Harmonic Minor & Modes
            'whole_tone',      // Symmetric Scales
            'major_pentatonic', // Pentatonic Scales
            'hijaz',           // Middle Eastern Scales
            'bebop_major'      // Jazz & Bebop
        ];
        
        let existingScalesFunctional = true;
        for (const scaleType of testScales) {
            // Test scale intervals are still available
            const scaleIntervals = musicEngine.scales[scaleType];
            if (!scaleIntervals || !Array.isArray(scaleIntervals)) {
                console.error(`❌ Scale intervals missing for existing scale: ${scaleType}`);
                existingScalesFunctional = false;
                continue;
            }
            
            // Test scale notes generation still works
            try {
                const scaleNotes = musicEngine.getScaleNotes('C', scaleType);
                if (!Array.isArray(scaleNotes) || scaleNotes.length === 0) {
                    console.error(`❌ Scale notes generation failed for: ${scaleType}`);
                    existingScalesFunctional = false;
                    continue;
                }
            } catch (error) {
                console.error(`❌ Error generating scale notes for ${scaleType}: ${error.message}`);
                existingScalesFunctional = false;
                continue;
            }
            
            // Test scale appears in appropriate category
            let foundInCategory = false;
            for (const [categoryName, scales] of Object.entries(scaleCategories)) {
                if (scales.includes(scaleType)) {
                    foundInCategory = true;
                    break;
                }
            }
            
            if (!foundInCategory) {
                console.error(`❌ Existing scale ${scaleType} not found in any category`);
                existingScalesFunctional = false;
                continue;
            }
            
            console.log(`✅ Existing scale functional: ${scaleType}`);
        }
        
        if (!existingScalesFunctional) {
            console.error('❌ Property 7 failed: Existing scale functionality not preserved');
            return false;
        }

        // Test 4: Verify ScaleLibrary UI compatibility (if available)
        if (scaleLibrary) {
            console.log('\n📋 Test 4: ScaleLibrary UI compatibility');
            
            try {
                // Test that ScaleLibrary can access all categories
                const libraryCategories = scaleLibrary.getScaleCategories();
                if (Object.keys(libraryCategories).length !== Object.keys(scaleCategories).length) {
                    console.error('❌ ScaleLibrary categories count mismatch with engine');
                    return false;
                }
                
                // Test that existing scale selection still works
                scaleLibrary.setKeyAndScale('C', 'major');
                const currentScale = scaleLibrary.getCurrentScale();
                if (currentScale !== 'major') {
                    console.error('❌ ScaleLibrary scale selection not working');
                    return false;
                }
                
                // Test that scale display names are still available
                const displayName = scaleLibrary.getScaleDisplayName('major');
                if (!displayName || displayName.trim() === '') {
                    console.error('❌ ScaleLibrary display names not working');
                    return false;
                }
                
                console.log('✅ ScaleLibrary UI compatibility maintained');
            } catch (error) {
                console.error(`❌ ScaleLibrary compatibility error: ${error.message}`);
                return false;
            }
        }

        // Test 5: Verify organizational structure consistency
        console.log('\n📋 Test 5: Organizational structure consistency');
        
        // Check that all categories follow consistent naming pattern (emoji + descriptive name)
        let structureConsistent = true;
        for (const categoryName of Object.keys(scaleCategories)) {
            // Should start with an emoji and contain descriptive text
            // Using very broad emoji detection that includes all common emoji ranges
            const hasEmoji = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u.test(categoryName);
            if (!hasEmoji) {
                console.error(`❌ Category name doesn't follow emoji pattern: ${categoryName}`);
                structureConsistent = false;
            }
            
            // Should contain scales array
            const scales = scaleCategories[categoryName];
            if (!Array.isArray(scales)) {
                console.error(`❌ Category doesn't contain scales array: ${categoryName}`);
                structureConsistent = false;
            }
        }
        
        if (!structureConsistent) {
            console.error('❌ Property 7 failed: Organizational structure not consistent');
            return false;
        }
        
        console.log('✅ Organizational structure consistency maintained');

        console.log('\n✅ Property 7 PASSED: Backward Compatibility and Organizational Structure');
        console.log('   - Existing scale categories preserved');
        console.log('   - New regional categories properly added');
        console.log('   - Existing scale functionality maintained');
        console.log('   - UI compatibility preserved');
        console.log('   - Organizational structure consistent');
        
        return true;

    } catch (error) {
        console.error(`❌ Property 7 failed with error: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

// Run the test
if (typeof module !== 'undefined' && require.main === module) {
    // Running directly
    const result = testBackwardCompatibilityProperty();
    process.exit(result ? 0 : 1);
} else if (typeof window !== 'undefined') {
    // Browser environment - make function available globally
    window.testBackwardCompatibilityProperty = testBackwardCompatibilityProperty;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testBackwardCompatibilityProperty };
}