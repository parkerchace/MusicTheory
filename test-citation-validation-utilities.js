/**
 * Unit Tests for Citation Validation Utilities
 * Tests citation format validation functions, bulk source accessibility checking,
 * and 12-TET approximation documentation validation
 * Requirements: 5.1, 5.3, 5.4
 */

const AcademicValidationUtilities = require('./academic-validation-utilities.js');

// Test runner function
async function runCitationValidationUtilityTests() {
    console.log('Running Unit Tests for Citation Validation Utilities...');
    console.log('Testing citation format validation, bulk accessibility checking, and 12-TET documentation validation\n');

    const validator = new AcademicValidationUtilities();
    let testsPassed = 0;
    let testsTotal = 0;

    // Test 1: Citation Format Validation - Valid Journal Article
    console.log('Test 1: Citation Format Validation - Valid Journal Article');
    try {
        const validJournalArticle = {
            type: 'journal_article',
            title: 'Modal Characteristics in Celtic Music',
            authors: ['Breandán Breathnach'],
            journal: 'Ethnomusicology',
            year: 1996,
            volume: '40',
            issue: '3',
            pages: '442-465',
            doi: '10.2307/852808',
            url: 'https://doi.org/10.2307/852808'
        };

        const result = validator.validateCitationFormat(validJournalArticle, 'journal_article');
        
        if (!result.valid) {
            throw new Error(`Valid journal article was rejected: ${result.errors.join(', ')}`);
        }
        
        if (result.completeness < 0.8) {
            throw new Error(`Valid journal article has low completeness score: ${result.completeness}`);
        }
        
        if (!result.hasRequiredFields) {
            throw new Error('Valid journal article should have all required fields');
        }
        
        console.log('✓ PASSED: Valid journal article correctly validated');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Valid journal article validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 2: Citation Format Validation - Missing Required Fields
    console.log('\nTest 2: Citation Format Validation - Missing Required Fields');
    try {
        const incompleteArticle = {
            type: 'journal_article',
            title: 'Some Article',
            // Missing authors, journal, year, volume, pages
            url: 'https://example.com'
        };

        const result = validator.validateCitationFormat(incompleteArticle, 'journal_article');
        
        if (result.valid) {
            throw new Error('Incomplete journal article was incorrectly validated as valid');
        }
        
        if (result.errors.length === 0) {
            throw new Error('Incomplete journal article should have validation errors');
        }
        
        // Should have errors for missing required fields
        const expectedMissingFields = ['authors', 'journal', 'year', 'volume', 'pages'];
        const hasExpectedErrors = expectedMissingFields.some(field => 
            result.errors.some(error => error.includes(field))
        );
        
        if (!hasExpectedErrors) {
            throw new Error(`Should have errors for missing required fields, got: ${result.errors.join(', ')}`);
        }
        
        console.log('✓ PASSED: Incomplete journal article correctly rejected');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Incomplete journal article validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 3: Citation Format Validation - Invalid URL (Wikipedia)
    console.log('\nTest 3: Citation Format Validation - Invalid URL (Wikipedia)');
    try {
        const wikipediaArticle = {
            type: 'journal_article',
            title: 'Some Article',
            authors: ['Author Name'],
            journal: 'Some Journal',
            year: 2020,
            volume: '10',
            pages: '1-10',
            url: 'https://en.wikipedia.org/wiki/Music_theory'
        };

        const result = validator.validateCitationFormat(wikipediaArticle, 'journal_article');
        
        // Should have error about Wikipedia source
        const hasWikipediaError = result.errors.some(error => 
            error.toLowerCase().includes('wikipedia')
        );
        
        if (!hasWikipediaError) {
            throw new Error(`Should reject Wikipedia sources, got errors: ${result.errors.join(', ')}`);
        }
        
        console.log('✓ PASSED: Wikipedia URL correctly rejected');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Wikipedia URL rejection test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 4: Citation Format Validation - Valid Book Citation
    console.log('\nTest 4: Citation Format Validation - Valid Book Citation');
    try {
        const validBook = {
            type: 'book',
            title: 'Tonal Harmony',
            authors: ['Stefan Kostka', 'Dorothy Payne', 'Byron Almén'],
            publisher: 'McGraw-Hill Education',
            year: 2017,
            isbn: '978-0078025143',
            pages: '45-67',
            url: 'https://www.mheducation.com/highered/product/tonal-harmony-kostka-payne/M9780078025143.html'
        };

        const result = validator.validateCitationFormat(validBook, 'book');
        
        if (!result.valid) {
            throw new Error(`Valid book was rejected: ${result.errors.join(', ')}`);
        }
        
        if (!result.hasRequiredFields) {
            throw new Error('Valid book should have all required fields');
        }
        
        console.log('✓ PASSED: Valid book citation correctly validated');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Valid book citation validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 5: Citation Format Validation - Invalid Year
    console.log('\nTest 5: Citation Format Validation - Invalid Year');
    try {
        const invalidYearArticle = {
            type: 'journal_article',
            title: 'Some Article',
            authors: ['Author Name'],
            journal: 'Some Journal',
            year: 1500, // Too old
            volume: '10',
            pages: '1-10',
            url: 'https://jstor.org/article/123'
        };

        const result = validator.validateCitationFormat(invalidYearArticle, 'journal_article');
        
        const hasYearError = result.errors.some(error => 
            error.toLowerCase().includes('year') || error.includes('1500')
        );
        
        if (!hasYearError) {
            throw new Error(`Should reject invalid year 1500, got errors: ${result.errors.join(', ')}`);
        }
        
        console.log('✓ PASSED: Invalid year correctly rejected');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Invalid year rejection test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 6: Bulk Accessibility Check - Valid URLs Array
    console.log('\nTest 6: Bulk Accessibility Check - Valid URLs Array');
    try {
        const testUrls = [
            'https://jstor.org/article/123',
            'https://doi.org/10.1000/example',
            'https://cambridge.org/journal/article'
        ];

        const result = await validator.bulkAccessibilityCheck(testUrls);
        
        if (result.error) {
            throw new Error(`Bulk check should not have error: ${result.error}`);
        }
        
        if (result.totalChecked !== testUrls.length) {
            throw new Error(`Should check ${testUrls.length} URLs, checked ${result.totalChecked}`);
        }
        
        if (!result.summary) {
            throw new Error('Bulk check should include summary statistics');
        }
        
        // Should have results for each URL
        const totalResults = result.accessible.length + result.inaccessible.length + 
                           result.unknown.length + result.errors.length;
        
        if (totalResults !== testUrls.length) {
            throw new Error(`Should have results for all ${testUrls.length} URLs, got ${totalResults}`);
        }
        
        console.log('✓ PASSED: Bulk accessibility check handles URL array correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Bulk accessibility check test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 7: Bulk Accessibility Check - Invalid Input
    console.log('\nTest 7: Bulk Accessibility Check - Invalid Input');
    try {
        let errorThrown = false;
        
        try {
            await validator.bulkAccessibilityCheck('not-an-array');
        } catch (error) {
            errorThrown = true;
            if (!error.message.includes('array')) {
                throw new Error(`Should mention array requirement, got: ${error.message}`);
            }
        }
        
        if (!errorThrown) {
            throw new Error('Should throw error for non-array input');
        }
        
        console.log('✓ PASSED: Bulk accessibility check correctly rejects non-array input');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Bulk accessibility check invalid input test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 8: 12-TET Approximation Documentation Validation - Valid Documentation
    console.log('\nTest 8: 12-TET Approximation Documentation Validation - Valid Documentation');
    try {
        const validApproximationDoc = {
            original: 'Traditional mbira tuning uses just intonation ratios with regional variations',
            approximationMethod: '12-TET intervals for orchestral compatibility',
            orchestralInstruments: 'Compatible with violin, viola, cello, bass, winds, and brass',
            limitations: 'Traditional microtonal inflections approximated to nearest semitone',
            pedagogicalNotes: 'Suitable for high school orchestra use with cultural context'
        };

        const result = validator.validate12TETApproximationDocumentation(validApproximationDoc);
        
        if (!result.valid) {
            throw new Error(`Valid approximation doc was rejected: ${result.errors.join(', ')}`);
        }
        
        if (!result.hasAllRequiredFields) {
            throw new Error('Valid approximation doc should have all required fields');
        }
        
        if (result.completeness !== 1.0) {
            throw new Error(`Valid approximation doc should have completeness 1.0, got ${result.completeness}`);
        }
        
        console.log('✓ PASSED: Valid 12-TET approximation documentation correctly validated');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Valid 12-TET approximation documentation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 9: 12-TET Approximation Documentation Validation - Missing Fields
    console.log('\nTest 9: 12-TET Approximation Documentation Validation - Missing Fields');
    try {
        const incompleteApproximationDoc = {
            original: 'Some traditional tuning',
            // Missing approximationMethod, orchestralInstruments, limitations, pedagogicalNotes
        };

        const result = validator.validate12TETApproximationDocumentation(incompleteApproximationDoc);
        
        if (result.valid) {
            throw new Error('Incomplete approximation doc was incorrectly validated as valid');
        }
        
        if (result.errors.length === 0) {
            throw new Error('Incomplete approximation doc should have validation errors');
        }
        
        // Should have errors for missing required fields
        const expectedMissingFields = ['approximationMethod', 'orchestralInstruments', 'limitations', 'pedagogicalNotes'];
        const hasExpectedErrors = expectedMissingFields.some(field => 
            result.errors.some(error => error.includes(field))
        );
        
        if (!hasExpectedErrors) {
            throw new Error(`Should have errors for missing required fields, got: ${result.errors.join(', ')}`);
        }
        
        console.log('✓ PASSED: Incomplete 12-TET approximation documentation correctly rejected');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Incomplete 12-TET approximation documentation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 10: Academic Domain Validation
    console.log('\nTest 10: Academic Domain Validation');
    try {
        // Test academic domains
        const academicDomains = [
            'jstor.org',
            'mit.edu',
            'cambridge.org',
            'oxford.com'
        ];

        for (const domain of academicDomains) {
            const result = validator.isAcademicDomain(domain);
            if (!result.isAcademic) {
                throw new Error(`${domain} should be recognized as academic domain`);
            }
        }

        // Test non-academic domains
        const nonAcademicDomains = [
            'wikipedia.org',
            'google.com',
            'facebook.com'
        ];

        for (const domain of nonAcademicDomains) {
            const result = validator.isAcademicDomain(domain);
            if (result.isAcademic) {
                throw new Error(`${domain} should not be recognized as academic domain`);
            }
        }
        
        console.log('✓ PASSED: Academic domain validation works correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Academic domain validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 11: Regional Scale Template Generation
    console.log('\nTest 11: Regional Scale Template Generation');
    try {
        const template = validator.generateRegionalScaleTemplate('south_american');
        
        if (!template.scaleId || !template.scaleId.includes('south_american')) {
            throw new Error('Template should include scale type in scaleId');
        }
        
        if (!Array.isArray(template.intervals)) {
            throw new Error('Template should include intervals array');
        }
        
        if (!template.culturalContext) {
            throw new Error('Template should include cultural context');
        }
        
        if (!template.tuningSystem) {
            throw new Error('Template should include tuning system');
        }
        
        if (!Array.isArray(template.references) || template.references.length === 0) {
            throw new Error('Template should include references array');
        }
        
        console.log('✓ PASSED: Regional scale template generation works correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Regional scale template generation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 12: Complete Scale Documentation Validation
    console.log('\nTest 12: Complete Scale Documentation Validation');
    try {
        const completeScaleDoc = {
            scaleId: 'test_scale',
            intervals: [0, 2, 4, 5, 7, 9, 11],
            culturalContext: {
                region: 'Test Region',
                culturalGroup: 'Test Group',
                historicalPeriod: 'Test Period',
                musicalFunction: 'Test Function'
            },
            tuningSystem: {
                original: 'Test original tuning',
                approximationMethod: '12-TET approximation',
                orchestralInstruments: 'Compatible with violin, viola, cello, bass',
                limitations: 'Test limitations',
                pedagogicalNotes: 'Test pedagogical notes'
            },
            references: [
                {
                    type: 'journal_article',
                    title: 'Test Article',
                    authors: ['Test Author'],
                    journal: 'Test Journal',
                    year: 2020,
                    volume: '1',
                    pages: '1-10',
                    url: 'https://jstor.org/test'
                }
            ]
        };

        const result = validator.validateCompleteScaleDocumentation(completeScaleDoc);
        
        if (!result.valid) {
            throw new Error(`Complete scale doc was rejected: ${result.errors.join(', ')}`);
        }
        
        if (!result.sections.culturalContext || !result.sections.culturalContext.valid) {
            throw new Error('Cultural context validation should pass');
        }
        
        if (!result.sections.tuningSystem || !result.sections.tuningSystem.valid) {
            throw new Error('Tuning system validation should pass');
        }
        
        if (!result.sections.references || !result.sections.references.valid) {
            throw new Error('References validation should pass');
        }
        
        console.log('✓ PASSED: Complete scale documentation validation works correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Complete scale documentation validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Test 13: 12-TET Approximation Guidelines Generation
    console.log('\nTest 13: 12-TET Approximation Guidelines Generation');
    try {
        const guidelines = validator.generate12TETApproximationGuidelines();
        
        if (!guidelines.title || !guidelines.overview) {
            throw new Error('Guidelines should include title and overview');
        }
        
        if (!guidelines.requiredDocumentation) {
            throw new Error('Guidelines should include required documentation section');
        }
        
        if (!guidelines.bestPractices || !Array.isArray(guidelines.bestPractices)) {
            throw new Error('Guidelines should include best practices array');
        }
        
        if (!guidelines.commonMistakes || !Array.isArray(guidelines.commonMistakes)) {
            throw new Error('Guidelines should include common mistakes array');
        }
        
        // Check that all required fields are documented
        const requiredFields = ['original', 'approximationMethod', 'orchestralInstruments', 'limitations', 'pedagogicalNotes'];
        for (const field of requiredFields) {
            if (!guidelines.requiredDocumentation[field]) {
                throw new Error(`Guidelines should document required field: ${field}`);
            }
        }
        
        console.log('✓ PASSED: 12-TET approximation guidelines generation works correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: 12-TET approximation guidelines generation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Unit Test Results: ${testsPassed}/${testsTotal} tests passed`);
    
    if (testsPassed === testsTotal) {
        console.log('✓ ALL TESTS PASSED - Citation validation utilities are working correctly');
        return { success: true, passed: testsPassed, total: testsTotal };
    } else {
        console.log('✗ SOME TESTS FAILED - Citation validation utilities need attention');
        return { success: false, passed: testsPassed, total: testsTotal };
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runCitationValidationUtilityTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runCitationValidationUtilityTests };