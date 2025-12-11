/**
 * Node.js test for Scale Library UI functionality
 */

const MusicTheoryEngine = require('./music-theory-engine.js');
const ScaleLibrary = require('./scale-library.js');

function testScaleLibraryUI() {
    console.log('🧪 Testing Scale Library UI functionality');
    
    try {
        // Initialize components
        const musicEngine = new MusicTheoryEngine();
        const scaleLibrary = new ScaleLibrary(musicEngine);
        
        // Test 1: Verify regional categories are present
        console.log('\n📋 Test 1: Regional categories presence');
        const categories = musicEngine.getScaleCategories();
        const southAmericanScales = categories['🌎 South American Scales'];
        const africanScales = categories['🌍 African Scales'];
        
        if (!southAmericanScales || !africanScales) {
            console.error('❌ Regional categories missing');
            return false;
        }
        
        console.log(`✅ Found ${southAmericanScales.length} South American scales`);
        console.log(`✅ Found ${africanScales.length} African scales`);
        
        // Test 2: Verify existing categories are preserved
        console.log('\n📋 Test 2: Existing categories preservation');
        const expectedCategories = [
            '🎵 Major Scale & Modes',
            '🎼 Melodic Minor & Modes', 
            '🎹 Harmonic Minor & Modes',
            '🎶 Harmonic Major & Modes'
        ];
        
        for (const expectedCategory of expectedCategories) {
            if (!categories[expectedCategory]) {
                console.error(`❌ Missing existing category: ${expectedCategory}`);
                return false;
            }
            console.log(`✅ Preserved category: ${expectedCategory}`);
        }
        
        // Test 3: Test scale selection functionality
        console.log('\n📋 Test 3: Scale selection functionality');
        scaleLibrary.setKeyAndScale('C', 'major');
        const currentScale = scaleLibrary.getCurrentScale();
        const currentKey = scaleLibrary.getCurrentKey();
        
        if (currentScale !== 'major' || currentKey !== 'C') {
            console.error('❌ Scale selection not working properly');
            return false;
        }
        console.log(`✅ Successfully set to ${currentKey} ${currentScale}`);
        
        // Test 4: Test regional scale selection
        console.log('\n📋 Test 4: Regional scale selection');
        if (southAmericanScales.length > 0) {
            const testScale = southAmericanScales[0];
            scaleLibrary.setKeyAndScale('C', testScale);
            const selectedScale = scaleLibrary.getCurrentScale();
            
            if (selectedScale !== testScale) {
                console.error(`❌ Failed to select regional scale: ${testScale}`);
                return false;
            }
            console.log(`✅ Successfully selected regional scale: ${testScale}`);
        }
        
        // Test 5: Test scale categories method
        console.log('\n📋 Test 5: ScaleLibrary categories method');
        const libraryCategories = scaleLibrary.getScaleCategories();
        
        if (Object.keys(libraryCategories).length !== Object.keys(categories).length) {
            console.error('❌ ScaleLibrary categories count mismatch');
            return false;
        }
        console.log(`✅ ScaleLibrary categories method working (${Object.keys(libraryCategories).length} categories)`);
        
        // Test 6: Test display names for regional scales
        console.log('\n📋 Test 6: Regional scale display names');
        const testScales = [
            ...southAmericanScales.slice(0, 3),
            ...africanScales.slice(0, 3)
        ];
        
        for (const scaleId of testScales) {
            const displayName = scaleLibrary.getScaleDisplayName(scaleId);
            if (!displayName || displayName.trim() === '') {
                console.error(`❌ Missing display name for scale: ${scaleId}`);
                return false;
            }
            console.log(`✅ Display name for ${scaleId}: ${displayName}`);
        }
        
        // Test 7: Test citation functionality (if available)
        console.log('\n📋 Test 7: Citation functionality');
        if (typeof musicEngine.getScaleCitation === 'function') {
            try {
                const citation = musicEngine.getScaleCitation('major', 'html');
                console.log(`✅ Citation method available (returns: ${typeof citation})`);
            } catch (error) {
                console.log(`⚠️ Citation method available but returned error: ${error.message}`);
            }
        } else {
            console.log('ℹ️ Citation method not available');
        }
        
        console.log('\n✅ All Scale Library UI tests passed!');
        return true;
        
    } catch (error) {
        console.error(`❌ Test failed with error: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

// Run the test
const result = testScaleLibraryUI();
process.exit(result ? 0 : 1);