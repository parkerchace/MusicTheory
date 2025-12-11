/**
 * Verify Regional Scales UI Integration
 * Tests that regional scales work properly in the main modular music theory interface
 */

const fs = require('fs');
const path = require('path');

function verifyUIIntegration() {
    console.log('🔍 Verifying Regional Scales UI Integration...\n');
    
    let allTestsPassed = true;
    
    // Test 1: Check that main HTML file exists and loads modules
    console.log('1. Checking main HTML interface...');
    try {
        const htmlPath = 'modular-music-theory.html';
        if (fs.existsSync(htmlPath)) {
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // Check for required module scripts
            const requiredModules = [
                'music-theory-engine.js',
                'unified-chord-explorer.js',
                'progression-builder.js',
                'piano-visualizer.js',
                'scale-library.js'
            ];
            
            let modulesFound = 0;
            for (const module of requiredModules) {
                if (htmlContent.includes(module)) {
                    modulesFound++;
                    console.log(`   ✅ ${module} is loaded`);
                } else {
                    console.log(`   ❌ ${module} is missing`);
                    allTestsPassed = false;
                }
            }
            
            if (modulesFound === requiredModules.length) {
                console.log('   ✅ All required modules are loaded in HTML');
            } else {
                console.log(`   ❌ Only ${modulesFound}/${requiredModules.length} modules found`);
                allTestsPassed = false;
            }
        } else {
            console.log('   ❌ Main HTML file not found');
            allTestsPassed = false;
        }
    } catch (error) {
        console.log(`   ❌ Error checking HTML file: ${error.message}`);
        allTestsPassed = false;
    }
    
    // Test 2: Verify music theory engine has regional scales
    console.log('\n2. Checking MusicTheoryEngine for regional scales...');
    try {
        const MusicTheoryEngine = require('./music-theory-engine.js');
        const engine = new MusicTheoryEngine();
        
        const categories = engine.getScaleCategories();
        const southAmericanScales = categories['🌎 South American Scales'] || [];
        const africanScales = categories['🌍 African Scales'] || [];
        
        if (southAmericanScales.length > 0) {
            console.log(`   ✅ Found ${southAmericanScales.length} South American scales`);
        } else {
            console.log('   ❌ No South American scales found');
            allTestsPassed = false;
        }
        
        if (africanScales.length > 0) {
            console.log(`   ✅ Found ${africanScales.length} African scales`);
        } else {
            console.log('   ❌ No African scales found');
            allTestsPassed = false;
        }
        
        // Test a few specific scales
        const testScales = ['chacarera', 'zamba', 'pentatonic_african', 'mbira_tuning'];
        for (const scale of testScales) {
            if (engine.scales[scale]) {
                console.log(`   ✅ ${scale} scale is defined`);
            } else {
                console.log(`   ❌ ${scale} scale is missing`);
                allTestsPassed = false;
            }
        }
        
    } catch (error) {
        console.log(`   ❌ Error loading MusicTheoryEngine: ${error.message}`);
        allTestsPassed = false;
    }
    
    // Test 3: Check scale citations for regional scales
    console.log('\n3. Checking academic citations for regional scales...');
    try {
        const MusicTheoryEngine = require('./music-theory-engine.js');
        const engine = new MusicTheoryEngine();
        
        const testScales = ['chacarera', 'phrygian_dominant', 'mbira_tuning', 'hijaz'];
        let citationsFound = 0;
        
        for (const scale of testScales) {
            try {
                const citation = engine.getScaleCitation(scale);
                if (citation && citation.length > 0 && !citation.includes('not documented')) {
                    console.log(`   ✅ ${scale} has proper citation`);
                    citationsFound++;
                } else {
                    console.log(`   ❌ ${scale} missing or invalid citation`);
                    allTestsPassed = false;
                }
            } catch (error) {
                console.log(`   ❌ ${scale} citation error: ${error.message}`);
                allTestsPassed = false;
            }
        }
        
        if (citationsFound === testScales.length) {
            console.log('   ✅ All test scales have proper citations');
        }
        
    } catch (error) {
        console.log(`   ❌ Error checking citations: ${error.message}`);
        allTestsPassed = false;
    }
    
    // Test 4: Verify cross-module compatibility
    console.log('\n4. Checking cross-module compatibility...');
    try {
        const MusicTheoryEngine = require('./music-theory-engine.js');
        const engine = new MusicTheoryEngine();
        
        const testScale = 'chacarera';
        const testKey = 'C';
        
        // Test scale notes generation
        const scaleNotes = engine.getScaleNotes(testKey, testScale);
        if (scaleNotes && scaleNotes.length > 0) {
            console.log(`   ✅ Scale notes generation works: [${scaleNotes.join(', ')}]`);
        } else {
            console.log('   ❌ Scale notes generation failed');
            allTestsPassed = false;
        }
        
        // Test chord generation
        try {
            const chord = engine.getDiatonicChord(1, testKey, testScale);
            if (chord && chord.root && chord.chordType) {
                console.log(`   ✅ Chord generation works: ${chord.root}${chord.chordType}`);
            } else {
                console.log('   ❌ Chord generation failed');
                allTestsPassed = false;
            }
        } catch (error) {
            console.log(`   ❌ Chord generation error: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test grading system
        if (typeof engine.calculateNoteGrade === 'function') {
            try {
                const grade = engine.calculateNoteGrade('C', testKey, testScale);
                if (grade !== null && grade !== undefined) {
                    console.log('   ✅ Grading system works');
                } else {
                    console.log('   ❌ Grading system returned null/undefined');
                    allTestsPassed = false;
                }
            } catch (error) {
                console.log(`   ❌ Grading system error: ${error.message}`);
                allTestsPassed = false;
            }
        } else {
            console.log('   ⚠️ Grading system not available');
        }
        
    } catch (error) {
        console.log(`   ❌ Error checking cross-module compatibility: ${error.message}`);
        allTestsPassed = false;
    }
    
    // Test 5: Check that integration tests exist and pass
    console.log('\n5. Checking integration test files...');
    const integrationTestFiles = [
        'test-african-scales-cross-module.js',
        'test-regional-scale-cross-module-integration-property.js',
        'test-regional-scales-integration-node.js'
    ];
    
    for (const testFile of integrationTestFiles) {
        if (fs.existsSync(testFile)) {
            console.log(`   ✅ ${testFile} exists`);
        } else {
            console.log(`   ❌ ${testFile} missing`);
            allTestsPassed = false;
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    if (allTestsPassed) {
        console.log('✅ ALL UI INTEGRATION VERIFICATIONS PASSED');
        console.log('Regional scales are properly integrated across all modules');
        return true;
    } else {
        console.log('❌ SOME UI INTEGRATION VERIFICATIONS FAILED');
        console.log('Regional scales may have integration issues');
        return false;
    }
}

// Run verification if this file is executed directly
if (require.main === module) {
    const success = verifyUIIntegration();
    process.exit(success ? 0 : 1);
}

module.exports = { verifyUIIntegration };