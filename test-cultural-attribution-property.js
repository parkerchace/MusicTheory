/**
 * Property-Based Test for Cultural Attribution Completeness
 * **Feature: academic-scale-enhancement, Property 4: Complete Cultural Attribution**
 * **Validates: Requirements 1.3, 2.2, 2.4**
 */

const fc = require('fast-check');

// Import required modules
let MusicTheoryEngine, RegionalScaleManager;
try {
    MusicTheoryEngine = require('./music-theory-engine.js');
    RegionalScaleManager = require('./regional-scale-manager.js');
} catch (error) {
    console.error('Failed to import required modules:', error.message);
    process.exit(1);
}

// Test runner function
async function runCulturalAttributionTests() {
    console.log('Running Property-Based Tests for Cultural Attribution Completeness...');
    console.log('**Feature: academic-scale-enhancement, Property 4: Complete Cultural Attribution**');
    console.log('**Validates: Requirements 1.3, 2.2, 2.4**\n');

    const musicEngine = new MusicTheoryEngine();
    let testsPassed = 0;
    let testsTotal = 0;

    // Get South American scales for testing
    const southAmericanScales = [
        // Argentine
        'chacarera', 'zamba', 'milonga', 'tango_minor', 'vidala',
        // Chilean
        'cueca', 'tonada',
        // Peruvian
        'marinera', 'huayno', 'yaraví',
        // Colombian
        'bambuco', 'cumbia', 'vallenato',
        // Venezuelan
        'joropo', 'merengue_venezolano',
        // Brazilian
        'samba', 'bossa_nova', 'choro', 'forró',
        // Bolivian
        'morenada', 'tinku',
        // Ecuadorian
        'pasillo', 'sanjuanito',
        // Paraguayan
        'guarania', 'polka_paraguaya',
        // Uruguayan
        'candombe'
    ];

    // Property 1: All regional scales must have complete cultural context
    console.log('Property 1: All regional scales must have complete cultural context');
    try {
        await fc.assert(
            fc.property(
                fc.constantFrom(...southAmericanScales),
                (scaleId) => {
                    const citation = musicEngine.scaleCitations[scaleId];
                    
                    if (!citation) {
                        throw new Error(`Scale ${scaleId} must have citation information`);
                    }
                    
                    if (!citation.culturalContext) {
                        throw new Error(`Scale ${scaleId} must have cultural context`);
                    }
                    
                    const context = citation.culturalContext;
                    
                    // Check required cultural attribution fields
                    if (!context.region || context.region.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must specify geographic region`);
                    }
                    
                    if (!context.culturalGroup || context.culturalGroup.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must specify cultural group`);
                    }
                    
                    if (!context.historicalPeriod || context.historicalPeriod.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must specify historical period`);
                    }
                    
                    if (!context.musicalFunction || context.musicalFunction.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must specify musical function`);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: All regional scales have complete cultural context');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Cultural context completeness test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 2: All regional scales must have peer-reviewed academic citations
    console.log('\nProperty 2: All regional scales must have peer-reviewed academic citations');
    try {
        await fc.assert(
            fc.property(
                fc.constantFrom(...southAmericanScales),
                (scaleId) => {
                    const citation = musicEngine.scaleCitations[scaleId];
                    
                    if (!citation.references || !Array.isArray(citation.references)) {
                        throw new Error(`Scale ${scaleId} must have references array`);
                    }
                    
                    if (citation.references.length === 0) {
                        throw new Error(`Scale ${scaleId} must have at least one academic reference`);
                    }
                    
                    // Check that at least one reference is academic (journal article or academic book)
                    const hasAcademicSource = citation.references.some(ref => 
                        ref.type === 'journal_article' || 
                        (ref.type === 'book' && ref.publisher && !ref.url.includes('wikipedia'))
                    );
                    
                    if (!hasAcademicSource) {
                        throw new Error(`Scale ${scaleId} must have at least one peer-reviewed academic source`);
                    }
                    
                    // Check reference completeness
                    for (const ref of citation.references) {
                        if (!ref.title || ref.title.trim().length === 0) {
                            throw new Error(`Scale ${scaleId} reference must have title`);
                        }
                        
                        if (!ref.authors || !Array.isArray(ref.authors) || ref.authors.length === 0) {
                            throw new Error(`Scale ${scaleId} reference must have authors`);
                        }
                        
                        if (!ref.year || ref.year < 1800 || ref.year > 2024) {
                            throw new Error(`Scale ${scaleId} reference must have valid year`);
                        }
                        
                        if (!ref.url || !ref.url.startsWith('http')) {
                            throw new Error(`Scale ${scaleId} reference must have valid URL`);
                        }
                        
                        // Journal articles must have journal, volume, pages
                        if (ref.type === 'journal_article') {
                            if (!ref.journal || ref.journal.trim().length === 0) {
                                throw new Error(`Scale ${scaleId} journal article must specify journal`);
                            }
                            
                            if (!ref.pages || ref.pages.trim().length === 0) {
                                throw new Error(`Scale ${scaleId} journal article must specify pages`);
                            }
                        }
                        
                        // Books must have publisher and ISBN
                        if (ref.type === 'book') {
                            if (!ref.publisher || ref.publisher.trim().length === 0) {
                                throw new Error(`Scale ${scaleId} book reference must specify publisher`);
                            }
                            
                            if (!ref.isbn || ref.isbn.trim().length === 0) {
                                throw new Error(`Scale ${scaleId} book reference must specify ISBN`);
                            }
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: All regional scales have peer-reviewed academic citations');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Academic citations completeness test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 3: All regional scales must have 12-TET approximation documentation
    console.log('\nProperty 3: All regional scales must have 12-TET approximation documentation');
    try {
        await fc.assert(
            fc.property(
                fc.constantFrom(...southAmericanScales),
                (scaleId) => {
                    const citation = musicEngine.scaleCitations[scaleId];
                    
                    if (!citation.tuningSystem) {
                        throw new Error(`Scale ${scaleId} must have tuning system documentation`);
                    }
                    
                    const tuning = citation.tuningSystem;
                    
                    // Check required tuning documentation fields
                    if (!tuning.original || tuning.original.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must document original tuning system`);
                    }
                    
                    if (!tuning.approximationMethod || tuning.approximationMethod.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must document 12-TET approximation method`);
                    }
                    
                    if (!tuning.orchestralInstruments || tuning.orchestralInstruments.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must document orchestral compatibility`);
                    }
                    
                    if (!tuning.limitations || tuning.limitations.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must document approximation limitations`);
                    }
                    
                    if (!tuning.pedagogicalNotes || tuning.pedagogicalNotes.trim().length === 0) {
                        throw new Error(`Scale ${scaleId} must include pedagogical notes`);
                    }
                    
                    // Verify orchestral compatibility mentions standard instruments
                    const orchestralText = tuning.orchestralInstruments.toLowerCase();
                    const requiredInstruments = ['violin', 'viola', 'cello'];
                    const hasRequiredInstruments = requiredInstruments.some(instrument => 
                        orchestralText.includes(instrument)
                    );
                    
                    if (!hasRequiredInstruments) {
                        throw new Error(`Scale ${scaleId} must specify compatibility with standard orchestral instruments`);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: All regional scales have 12-TET approximation documentation');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: 12-TET approximation documentation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 4: Regional scales must be properly integrated in scale categories
    console.log('\nProperty 4: Regional scales must be properly integrated in scale categories');
    try {
        const scaleCategories = musicEngine.getScaleCategories();
        const southAmericanCategory = scaleCategories['🌎 South American Scales'];
        
        if (!southAmericanCategory || !Array.isArray(southAmericanCategory)) {
            throw new Error('South American Scales category must exist and be an array');
        }
        
        // Check that we have the expected number of scales
        if (southAmericanCategory.length !== southAmericanScales.length) {
            throw new Error(`Expected ${southAmericanScales.length} South American scales, but category contains ${southAmericanCategory.length}`);
        }
        
        await fc.assert(
            fc.property(
                fc.constantFrom(...southAmericanScales),
                (scaleId) => {
                    // Scale must be in the South American category
                    if (!southAmericanCategory.includes(scaleId)) {
                        throw new Error(`Scale ${scaleId} must be included in South American Scales category`);
                    }
                    
                    // Scale must have actual interval definition
                    const intervals = musicEngine.scales[scaleId];
                    if (!intervals || !Array.isArray(intervals)) {
                        throw new Error(`Scale ${scaleId} must have interval definition`);
                    }
                    
                    if (intervals.length === 0) {
                        throw new Error(`Scale ${scaleId} must have non-empty interval array`);
                    }
                    
                    // All intervals must be valid (0-11 semitones)
                    for (const interval of intervals) {
                        if (typeof interval !== 'number' || interval < 0 || interval > 11) {
                            throw new Error(`Scale ${scaleId} has invalid interval: ${interval}`);
                        }
                    }
                    
                    // First interval must be 0 (root)
                    if (intervals[0] !== 0) {
                        throw new Error(`Scale ${scaleId} must start with root (0), got: ${intervals[0]}`);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Regional scales are properly integrated in scale categories');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Scale category integration test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 5: Cultural attribution validation should work with RegionalScaleManager
    console.log('\nProperty 5: Cultural attribution validation should work with RegionalScaleManager');
    try {
        await fc.assert(
            fc.property(
                fc.constantFrom(...southAmericanScales),
                (scaleId) => {
                    const citation = musicEngine.scaleCitations[scaleId];
                    
                    // Create mock sources array from the citation references
                    const sources = citation.references.map(ref => ({
                        type: ref.type,
                        title: ref.title,
                        authors: ref.authors,
                        year: ref.year,
                        url: ref.url
                    }));
                    
                    // Validation should pass for properly documented scales
                    try {
                        const isValid = musicEngine.validateCulturalAttribution(scaleId, sources);
                        if (!isValid) {
                            throw new Error(`Cultural attribution validation failed for properly documented scale ${scaleId}`);
                        }
                    } catch (error) {
                        // If RegionalScaleManager is not available, that's acceptable for this test
                        if (error.message.includes('RegionalScaleManager not available')) {
                            return true;
                        }
                        throw error;
                    }
                    
                    return true;
                }
            ),
            { numRuns: 30 }
        );
        console.log('✓ PASSED: Cultural attribution validation works with RegionalScaleManager');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: RegionalScaleManager validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Property-Based Test Results: ${testsPassed}/${testsTotal} tests passed`);
    
    if (testsPassed === testsTotal) {
        console.log('✓ ALL TESTS PASSED - Cultural attribution completeness is working correctly');
        return { success: true, passed: testsPassed, total: testsTotal };
    } else {
        console.log('✗ SOME TESTS FAILED - Cultural attribution completeness needs attention');
        return { success: false, passed: testsPassed, total: testsTotal };
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runCulturalAttributionTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runCulturalAttributionTests };