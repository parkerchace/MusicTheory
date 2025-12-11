/**
 * Property-Based Test for Citation Accessibility Validation
 * **Feature: academic-scale-enhancement, Property 1: Citation Accessibility and Non-Wikipedia Sources**
 * **Validates: Requirements 1.1, 1.2, 3.1**
 */

const fc = require('fast-check');
const CitationManager = require('./citation-manager.js');

// Test runner function
async function runCitationAccessibilityTests() {
    console.log('Running Property-Based Tests for Citation Accessibility Validation...');
    console.log('**Feature: academic-scale-enhancement, Property 1: Citation Accessibility and Non-Wikipedia Sources**');
    console.log('**Validates: Requirements 1.1, 1.2, 3.1**\n');

    const citationManager = new CitationManager();
    let testsPassed = 0;
    let testsTotal = 0;

    // Property 1: Wikipedia sources should always be rejected
    console.log('Property 1: Wikipedia sources should always be rejected');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(
                    fc.constant('https://en.wikipedia.org/wiki/'),
                    fc.constant('https://wikipedia.org/wiki/'),
                    fc.constant('http://en.wikipedia.org/wiki/'),
                    fc.constant('https://fr.wikipedia.org/wiki/'),
                    fc.constant('https://de.wikipedia.org/wiki/')
                ).chain(baseUrl => 
                    fc.string({ minLength: 1, maxLength: 50 }).map(path => baseUrl + path)
                ),
                async (wikipediaUrl) => {
                    const result = await citationManager.validateSource(wikipediaUrl, {});
                    
                    // Wikipedia sources should always be invalid
                    if (result.valid === true) {
                        throw new Error(`Wikipedia URL ${wikipediaUrl} was incorrectly validated as acceptable`);
                    }
                    
                    // Should have specific error type for Wikipedia
                    if (result.type !== 'source_type_error') {
                        throw new Error(`Wikipedia URL ${wikipediaUrl} should have 'source_type_error' type, got: ${result.type}`);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Wikipedia sources are correctly rejected');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Wikipedia sources rejection test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 2: Academic domains should be validated as acceptable
    console.log('\nProperty 2: Academic domains should be validated as acceptable');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(
                    fc.constant('https://jstor.org/'),
                    fc.constant('https://doi.org/'),
                    fc.constant('https://cambridge.org/'),
                    fc.constant('https://oxford.com/'),
                    fc.constant('https://mit.edu/'),
                    fc.constant('https://harvard.edu/'),
                    fc.constant('https://springer.com/')
                ).chain(baseUrl => 
                    fc.string({ minLength: 1, maxLength: 50 }).map(path => baseUrl + path)
                ),
                fc.record({
                    title: fc.string({ minLength: 5, maxLength: 100 }),
                    authors: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
                    year: fc.integer({ min: 1900, max: 2024 }),
                    journal: fc.string({ minLength: 5, maxLength: 50 })
                }),
                async (academicUrl, metadata) => {
                    const result = await citationManager.validateSource(academicUrl, metadata);
                    
                    // Academic sources should be valid
                    if (result.valid !== true) {
                        throw new Error(`Academic URL ${academicUrl} was incorrectly rejected: ${result.reason}`);
                    }
                    
                    // Should have academic source type
                    if (!['academic_source', 'probable_academic'].includes(result.type)) {
                        throw new Error(`Academic URL ${academicUrl} should have academic type, got: ${result.type}`);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Academic domains are correctly validated');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Academic domains validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 3: Invalid URLs should be rejected with appropriate error
    console.log('\nProperty 3: Invalid URLs should be rejected with appropriate error');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(
                    fc.constant('not-a-url'),
                    fc.constant(''),
                    fc.constant('ftp://invalid-protocol.com'),
                    fc.constant('javascript:alert("xss")'),
                    fc.constant('data:text/html,<script>alert("xss")</script>')
                ),
                async (invalidUrl) => {
                    const result = await citationManager.validateSource(invalidUrl, {});
                    
                    // Invalid URLs should be rejected
                    if (result.valid === true) {
                        throw new Error(`Invalid URL ${invalidUrl} was incorrectly accepted`);
                    }
                    
                    // Should have appropriate error type
                    if (!['format_error', 'url_format_error'].includes(result.type)) {
                        throw new Error(`Invalid URL ${invalidUrl} should have format error type, got: ${result.type}`);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Invalid URLs are correctly rejected');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Invalid URLs rejection test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 4: Citation accessibility checking should handle arrays properly
    console.log('\nProperty 4: Citation accessibility checking should handle arrays properly');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        title: fc.string({ minLength: 5, maxLength: 50 }),
                        url: fc.oneof(
                            fc.webUrl(),
                            fc.constant('https://jstor.org/article/123'),
                            fc.constant('https://doi.org/10.1000/example')
                        )
                    }),
                    { minLength: 1, maxLength: 10 }
                ),
                async (citations) => {
                    const results = await citationManager.checkAccessibility(citations);
                    
                    // Should return results for each citation
                    if (typeof results !== 'object' || results.error) {
                        throw new Error(`Accessibility check should return valid results object, got: ${JSON.stringify(results)}`);
                    }
                    
                    // Should have result for each citation
                    const resultKeys = Object.keys(results);
                    if (resultKeys.length !== citations.length) {
                        throw new Error(`Should have ${citations.length} results, got ${resultKeys.length}`);
                    }
                    
                    // Each result should have accessibility information
                    for (const [title, result] of Object.entries(results)) {
                        if (typeof result.accessible === 'undefined' && !result.corsLimited) {
                            throw new Error(`Result for ${title} should have accessibility information`);
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Citation accessibility checking handles arrays correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Citation accessibility array handling test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 5: Citation format validation should enforce academic standards
    console.log('\nProperty 5: Citation format validation should enforce academic standards');
    try {
        await fc.assert(
            fc.property(
                fc.record({
                    title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
                    authors: fc.array(
                        fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3), 
                        { minLength: 1, maxLength: 5 }
                    ),
                    year: fc.integer({ min: 1900, max: 2024 }),
                    journal: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
                    volume: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length >= 1),
                    pages: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3)
                }),
                (completeMetadata) => {
                    const formatted = citationManager.formatAcademicCitation(completeMetadata, 'academic');
                    
                    // Should include key elements (check trimmed versions to handle whitespace)
                    const trimmedTitle = completeMetadata.title.trim();
                    const trimmedAuthor = completeMetadata.authors[0].trim();
                    const trimmedJournal = completeMetadata.journal.trim();
                    
                    if (!formatted.includes(trimmedTitle)) {
                        throw new Error(`Formatted citation should include title: "${trimmedTitle}"`);
                    }
                    
                    if (!formatted.includes(trimmedAuthor)) {
                        throw new Error(`Formatted citation should include first author: "${trimmedAuthor}"`);
                    }
                    
                    if (!formatted.includes(completeMetadata.year.toString())) {
                        throw new Error(`Formatted citation should include year: ${completeMetadata.year}`);
                    }
                    
                    if (!formatted.includes(trimmedJournal)) {
                        throw new Error(`Formatted citation should include journal: "${trimmedJournal}"`);
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Citation formatting enforces academic standards');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Citation formatting standards test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Property-Based Test Results: ${testsPassed}/${testsTotal} tests passed`);
    
    if (testsPassed === testsTotal) {
        console.log('✓ ALL TESTS PASSED - Citation accessibility validation is working correctly');
        return { success: true, passed: testsPassed, total: testsTotal };
    } else {
        console.log('✗ SOME TESTS FAILED - Citation accessibility validation needs attention');
        return { success: false, passed: testsPassed, total: testsTotal };
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runCitationAccessibilityTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runCitationAccessibilityTests };