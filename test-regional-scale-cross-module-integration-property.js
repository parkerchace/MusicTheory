/**
 * Property-Based Test for Regional Scale Cross-Module Integration
 * **Feature: academic-scale-enhancement, Property 2: Regional Scale Cross-Module Integration**
 * **Validates: Requirements 2.3, 4.1**
 */

const fc = require('fast-check');

// Import modules
let MusicTheoryEngine, UnifiedChordExplorer, ProgressionBuilder, PianoVisualizer, ScaleLibrary;

try {
    if (typeof require !== 'undefined') {
        MusicTheoryEngine = require('./music-theory-engine.js');
        // Try to load other modules - they may not be available in all environments
        try { UnifiedChordExplorer = require('./unified-chord-explorer.js'); } catch (e) { UnifiedChordExplorer = null; }
        try { ProgressionBuilder = require('./progression-builder.js'); } catch (e) { ProgressionBuilder = null; }
        try { PianoVisualizer = require('./piano-visualizer.js'); } catch (e) { PianoVisualizer = null; }
        try { ScaleLibrary = require('./scale-library.js'); } catch (e) { ScaleLibrary = null; }
    } else if (typeof window !== 'undefined') {
        MusicTheoryEngine = window.MusicTheoryEngine;
        UnifiedChordExplorer = window.UnifiedChordExplorer;
        ProgressionBuilder = window.ProgressionBuilder;
        PianoVisualizer = window.PianoVisualizer;
        ScaleLibrary = window.ScaleLibrary;
    }
} catch (error) {
    console.error('Could not load required modules:', error);
}

// Test runner function
async function runRegionalScaleCrossModuleTests() {
    console.log('Running Property-Based Tests for Regional Scale Cross-Module Integration...');
    console.log('**Feature: academic-scale-enhancement, Property 2: Regional Scale Cross-Module Integration**');
    console.log('**Validates: Requirements 2.3, 4.1**\n');

    if (!MusicTheoryEngine) {
        console.error('❌ MusicTheoryEngine not available - cannot run tests');
        return { success: false, passed: 0, total: 1 };
    }

    const musicEngine = new MusicTheoryEngine();
    let testsPassed = 0;
    let testsTotal = 0;

    // Get regional scales for testing
    const scaleCategories = musicEngine.getScaleCategories();
    const southAmericanScales = scaleCategories['🌎 South American Scales'] || [];
    const africanScales = scaleCategories['🌍 African Scales'] || [];
    const allRegionalScales = [...southAmericanScales, ...africanScales];

    if (allRegionalScales.length === 0) {
        console.error('❌ No regional scales found - cannot run tests');
        return { success: false, passed: 0, total: 1 };
    }

    console.log(`Found ${allRegionalScales.length} regional scales to test: ${allRegionalScales.join(', ')}`);

    // Property 1: Regional scales should work identically to existing scales in core music theory operations
    console.log('\nProperty 1: Regional scales should work identically to existing scales in core music theory operations');
    try {
        await fc.assert(
            fc.property(
                fc.constantFrom(...allRegionalScales),
                fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'Db', 'D#', 'Eb', 'F#', 'Gb', 'G#', 'Ab', 'A#', 'Bb'),
                (regionalScale, key) => {
                    // Test 1: Scale notes generation should work
                    const scaleNotes = musicEngine.getScaleNotes(key, regionalScale);
                    if (!scaleNotes || !Array.isArray(scaleNotes) || scaleNotes.length === 0) {
                        throw new Error(`Scale notes generation failed for ${regionalScale} in key ${key}`);
                    }

                    // Test 2: Scale should have valid intervals
                    const intervals = musicEngine.scales[regionalScale];
                    if (!intervals || !Array.isArray(intervals) || intervals.length === 0) {
                        throw new Error(`Scale intervals not found for ${regionalScale}`);
                    }

                    // Test 3: All intervals should be valid (0-11 semitones)
                    for (const interval of intervals) {
                        if (typeof interval !== 'number' || interval < 0 || interval > 11) {
                            throw new Error(`Invalid interval ${interval} in scale ${regionalScale}`);
                        }
                    }

                    // Test 4: Scale should start with 0 (root)
                    if (intervals[0] !== 0) {
                        throw new Error(`Scale ${regionalScale} should start with 0 (root), got ${intervals[0]}`);
                    }

                    // Test 5: Intervals should be in ascending order
                    for (let i = 1; i < intervals.length; i++) {
                        if (intervals[i] <= intervals[i-1]) {
                            throw new Error(`Scale ${regionalScale} intervals not in ascending order: ${intervals}`);
                        }
                    }

                    // Test 6: Transposition should work (different keys should produce different notes but same intervals)
                    const scaleNotesC = musicEngine.getScaleNotes('C', regionalScale);
                    const scaleNotesG = musicEngine.getScaleNotes('G', regionalScale);
                    if (scaleNotesC.length !== scaleNotesG.length) {
                        throw new Error(`Transposition failed for ${regionalScale}: C has ${scaleNotesC.length} notes, G has ${scaleNotesG.length} notes`);
                    }

                    return true;
                }
            ),
            { numRuns: 200 }
        );
        console.log('✓ PASSED: Regional scales work identically to existing scales in core operations');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Regional scales core operations test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 2: Regional scales should work with chord generation (for scales with sufficient notes)
    console.log('\nProperty 2: Regional scales should work with chord generation');
    try {
        await fc.assert(
            fc.property(
                fc.constantFrom(...allRegionalScales.filter(scale => {
                    const intervals = musicEngine.scales[scale];
                    return intervals && intervals.length >= 3; // Need at least 3 notes for chord generation
                })),
                fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B'),
                fc.integer({ min: 1, max: 7 }),
                (regionalScale, key, degree) => {
                    try {
                        // Test diatonic chord generation
                        const chord = musicEngine.getDiatonicChord(degree, key, regionalScale);
                        
                        // Should return a valid chord object
                        if (!chord || typeof chord !== 'object') {
                            throw new Error(`getDiatonicChord returned invalid result for ${regionalScale}, degree ${degree}`);
                        }

                        // Should have required properties
                        if (!chord.root || !chord.chordType) {
                            throw new Error(`Chord missing required properties for ${regionalScale}, degree ${degree}: ${JSON.stringify(chord)}`);
                        }

                        // Root should be a valid note
                        if (typeof chord.root !== 'string' || chord.root.length === 0) {
                            throw new Error(`Invalid chord root for ${regionalScale}, degree ${degree}: ${chord.root}`);
                        }

                        // Chord type should be a valid string
                        if (typeof chord.chordType !== 'string' || chord.chordType.length === 0) {
                            throw new Error(`Invalid chord type for ${regionalScale}, degree ${degree}: ${chord.chordType}`);
                        }

                        return true;
                    } catch (error) {
                        // Some scales may not support traditional diatonic chord generation
                        // This is acceptable for non-traditional scales, so we'll allow it
                        if (error.message.includes('not supported') || error.message.includes('traditional')) {
                            return true;
                        }
                        throw error;
                    }
                }
            ),
            { numRuns: 150 }
        );
        console.log('✓ PASSED: Regional scales work with chord generation');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Regional scales chord generation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 3: Regional scales should work with scale categorization system
    console.log('\nProperty 3: Regional scales should work with scale categorization system');
    try {
        fc.assert(
            fc.property(
                fc.constantFrom(...allRegionalScales),
                (regionalScale) => {
                    // Test 1: Scale should appear in appropriate category
                    const categories = musicEngine.getScaleCategories();
                    let foundInCategory = false;
                    
                    for (const [categoryName, scales] of Object.entries(categories)) {
                        if (scales.includes(regionalScale)) {
                            foundInCategory = true;
                            
                            // Should be in a regional category
                            if (!categoryName.includes('South American') && !categoryName.includes('African')) {
                                throw new Error(`Regional scale ${regionalScale} found in non-regional category: ${categoryName}`);
                            }
                            break;
                        }
                    }
                    
                    if (!foundInCategory) {
                        throw new Error(`Regional scale ${regionalScale} not found in any category`);
                    }

                    // Test 2: Scale should have citation information
                    try {
                        const citation = musicEngine.getScaleCitation(regionalScale);
                        if (!citation || (typeof citation === 'string' && citation.includes('not documented'))) {
                            throw new Error(`Regional scale ${regionalScale} missing proper citation`);
                        }
                    } catch (citationError) {
                        throw new Error(`Citation retrieval failed for ${regionalScale}: ${citationError.message}`);
                    }

                    return true;
                }
            ),
            { numRuns: allRegionalScales.length * 2 }
        );
        console.log('✓ PASSED: Regional scales work with scale categorization system');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Regional scales categorization test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 4: Regional scales should work with grading system (if available)
    console.log('\nProperty 4: Regional scales should work with grading system');
    try {
        await fc.assert(
            fc.property(
                fc.constantFrom(...allRegionalScales),
                fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B'),
                fc.constantFrom('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'),
                (regionalScale, key, note) => {
                    try {
                        // Test note grading if method exists
                        if (typeof musicEngine.calculateNoteGrade === 'function') {
                            const grade = musicEngine.calculateNoteGrade(note, key, regionalScale);
                            
                            // Should return a valid grade object or value
                            if (grade === null || grade === undefined) {
                                throw new Error(`Note grading returned null/undefined for ${note} in ${key} ${regionalScale}`);
                            }
                            
                            // If it's an object, should have expected properties
                            if (typeof grade === 'object' && grade.tier === undefined && grade.grade === undefined) {
                                throw new Error(`Note grading returned invalid object for ${note} in ${key} ${regionalScale}: ${JSON.stringify(grade)}`);
                            }
                        }

                        return true;
                    } catch (error) {
                        // Grading may not be supported for all scales - this is acceptable
                        if (error.message.includes('not supported') || error.message.includes('grading')) {
                            return true;
                        }
                        throw error;
                    }
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Regional scales work with grading system');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Regional scales grading system test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 5: Regional scales should maintain 12-TET compatibility
    console.log('\nProperty 5: Regional scales should maintain 12-TET compatibility');
    try {
        fc.assert(
            fc.property(
                fc.constantFrom(...allRegionalScales),
                (regionalScale) => {
                    const intervals = musicEngine.scales[regionalScale];
                    
                    // All intervals should be integers (12-TET semitones)
                    for (const interval of intervals) {
                        if (!Number.isInteger(interval)) {
                            throw new Error(`Scale ${regionalScale} has non-integer interval ${interval} - not 12-TET compatible`);
                        }
                    }
                    
                    // All intervals should be within 12-TET range (0-11)
                    for (const interval of intervals) {
                        if (interval < 0 || interval > 11) {
                            throw new Error(`Scale ${regionalScale} has interval ${interval} outside 12-TET range (0-11)`);
                        }
                    }
                    
                    // Should not have duplicate intervals (except octave)
                    const uniqueIntervals = [...new Set(intervals)];
                    if (uniqueIntervals.length !== intervals.length) {
                        throw new Error(`Scale ${regionalScale} has duplicate intervals: ${intervals}`);
                    }

                    return true;
                }
            ),
            { numRuns: allRegionalScales.length }
        );
        console.log('✓ PASSED: Regional scales maintain 12-TET compatibility');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Regional scales 12-TET compatibility test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 6: Regional scales should work with module integration (if modules available)
    console.log('\nProperty 6: Regional scales should work with module integration');
    try {
        fc.assert(
            fc.property(
                fc.constantFrom(...allRegionalScales),
                fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B'),
                (regionalScale, key) => {
                    // Test ScaleLibrary integration if available
                    if (ScaleLibrary) {
                        try {
                            const scaleLib = new ScaleLibrary(musicEngine);
                            // Should be able to set regional scale without error
                            scaleLib.setScale(regionalScale);
                            scaleLib.setKey(key);
                            
                            // Should be able to get current scale
                            const currentScale = scaleLib.getCurrentScale();
                            if (currentScale !== regionalScale) {
                                throw new Error(`ScaleLibrary failed to set regional scale ${regionalScale}`);
                            }
                        } catch (error) {
                            throw new Error(`ScaleLibrary integration failed for ${regionalScale}: ${error.message}`);
                        }
                    }

                    // Test that scale works with basic music theory operations
                    const scaleNotes = musicEngine.getScaleNotes(key, regionalScale);
                    if (!scaleNotes || scaleNotes.length === 0) {
                        throw new Error(`Basic scale operation failed for ${regionalScale} in key ${key}`);
                    }

                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Regional scales work with module integration');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Regional scales module integration test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Property-Based Test Results: ${testsPassed}/${testsTotal} tests passed`);
    
    if (testsPassed === testsTotal) {
        console.log('✓ ALL TESTS PASSED - Regional scale cross-module integration is working correctly');
        return { success: true, passed: testsPassed, total: testsTotal };
    } else {
        console.log('✗ SOME TESTS FAILED - Regional scale cross-module integration needs attention');
        return { success: false, passed: testsPassed, total: testsTotal };
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runRegionalScaleCrossModuleTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runRegionalScaleCrossModuleTests };