/**
 * Property-Based Test for Source Validation and Fallback Mechanism
 * **Feature: academic-scale-enhancement, Property 8: Source Validation and Fallback Mechanism**
 * **Validates: Requirements 3.4, 5.1, 5.3**
 */

const fc = require('fast-check');
const CitationManager = require('./citation-manager.js');

// Test runner function
async function runSourceValidationFallbackTests() {
    console.log('Running Property-Based Tests for Source Validation and Fallback Mechanism...');
    console.log('**Feature: academic-scale-enhancement, Property 8: Source Validation and Fallback Mechanism**');
    console.log('**Validates: Requirements 3.4, 5.1, 5.3**\n');

    const citationManager = new CitationManager();
    let testsPassed = 0;
    let testsTotal = 0;

    // Property 1: Inaccessible citations should trigger fallback mechanism
    console.log('Property 1: Inaccessible citations should trigger fallback mechanism');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.record({
                        title: fc.string({ minLength: 5, maxLength: 100 }),
                        url: fc.oneof(
                            fc.constant('https://broken-link-example.com/nonexistent'),
                            fc.constant('http://invalid-domain-12345.org/article'),
                            fc.constant('https://localhost:9999/unreachable'),
                            fc.constant('ftp://invalid-protocol.com/file')
                        ),
                        type: fc.constant('journal_article'),
                        authors: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 3 })
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                async (citations) => {
                    const results = await citationManager.detectBrokenLinksAndReplace(citations);
                    
                    // Should detect broken links
                    if (typeof results !== 'object' || results.error) {
                        throw new Error(`Should return valid results object, got: ${JSON.stringify(results)}`);
                    }
                    
                    // Should have checked all citations
                    if (results.totalChecked !== citations.length) {
                        throw new Error(`Should check ${citations.length} citations, checked ${results.totalChecked}`);
                    }
                    
                    // Should categorize results appropriately
                    // Note: Citations can appear in multiple categories (e.g., broken + manual review)
                    // So we check that each citation appears in at least one category
                    const allCitationUrls = citations.map(c => c.url);
                    const categorizedUrls = new Set([
                        ...results.brokenLinks.map(b => b.citation.url),
                        ...results.workingLinks.map(w => w.citation.url),
                        ...results.requiresManualReview.map(m => m.citation.url)
                    ]);
                    
                    for (const url of allCitationUrls) {
                        if (!categorizedUrls.has(url)) {
                            throw new Error(`Citation with URL ${url} was not categorized`);
                        }
                    }
                    
                    // Should provide replacement information when possible
                    if (results.brokenLinks.length > 0) {
                        // Each broken link should either have a replacement or be in manual review
                        for (const brokenLink of results.brokenLinks) {
                            const hasReplacement = results.replacements.some(repl => 
                                repl.originalCitation === brokenLink.citation
                            );
                            const inManualReview = results.requiresManualReview.some(manual => 
                                manual.citation === brokenLink.citation
                            );
                            
                            if (!hasReplacement && !inManualReview) {
                                throw new Error('Each broken link should either have a replacement or be flagged for manual review');
                            }
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Inaccessible citations trigger fallback mechanism correctly');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Inaccessible citations fallback test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 2: Alternative sources should be validated before being provided
    console.log('\nProperty 2: Alternative sources should be validated before being provided');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(
                    fc.constant('major'),
                    fc.constant('dorian'),
                    fc.constant('phrygian'),
                    fc.constant('chacarera'),
                    fc.constant('pentatonic_african')
                ),
                fc.record({
                    title: fc.string({ minLength: 5, maxLength: 50 }),
                    url: fc.constant('https://broken-source.example.com/article'),
                    type: fc.constant('journal_article'),
                    authors: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 2 })
                }),
                async (scaleId, primarySource) => {
                    const alternatives = await citationManager.findAlternativeSources(scaleId, primarySource);
                    
                    // Should return structured response
                    if (typeof alternatives !== 'object') {
                        throw new Error('Should return object with alternative sources information');
                    }
                    
                    // Should include scale ID and primary source
                    if (alternatives.scaleId !== scaleId) {
                        throw new Error(`Should preserve scale ID: expected ${scaleId}, got ${alternatives.scaleId}`);
                    }
                    
                    if (alternatives.primarySource !== primarySource) {
                        throw new Error('Should preserve primary source reference');
                    }
                    
                    // Should have alternatives array
                    if (!Array.isArray(alternatives.alternatives)) {
                        throw new Error('Should provide alternatives as an array');
                    }
                    
                    // If alternatives are provided, they should be validated
                    if (alternatives.alternatives.length > 0) {
                        for (const alt of alternatives.alternatives) {
                            if (!alt.validationStatus) {
                                throw new Error('Alternative sources should include validation status');
                            }
                            
                            if (!alt.validationStatus.valid) {
                                throw new Error('Only validated alternative sources should be included');
                            }
                            
                            if (!alt.verifiedAt) {
                                throw new Error('Alternative sources should include verification timestamp');
                            }
                        }
                        
                        // Should indicate valid alternatives are available
                        if (!alternatives.hasValidAlternatives) {
                            throw new Error('Should indicate when valid alternatives are available');
                        }
                    }
                    
                    // Should provide appropriate message
                    if (!alternatives.message || typeof alternatives.message !== 'string') {
                        throw new Error('Should provide descriptive message about alternative sources');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Alternative sources are validated before being provided');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Alternative sources validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 3: Source verification requirements should be enforced for new scale integration
    console.log('\nProperty 3: Source verification requirements should be enforced for new scale integration');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    scaleId: fc.string({ minLength: 3, maxLength: 20 }),
                    intervals: fc.array(fc.integer({ min: 0, max: 11 }), { minLength: 5, maxLength: 12 }),
                    references: fc.array(
                        fc.record({
                            type: fc.oneof(
                                fc.constant('journal_article'),
                                fc.constant('book'),
                                fc.constant('conference_paper')
                            ),
                            title: fc.string({ minLength: 5, maxLength: 100 }),
                            authors: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
                            year: fc.integer({ min: 1900, max: 2024 }),
                            url: fc.oneof(
                                fc.webUrl(),
                                fc.constant('https://jstor.org/article/valid'),
                                fc.constant('https://doi.org/10.1000/example')
                            )
                        }),
                        { minLength: 1, maxLength: 3 }
                    ),
                    culturalContext: fc.record({
                        region: fc.string({ minLength: 3, maxLength: 50 }),
                        culturalGroup: fc.string({ minLength: 3, maxLength: 50 }),
                        historicalPeriod: fc.string({ minLength: 5, maxLength: 50 }),
                        musicalFunction: fc.string({ minLength: 5, maxLength: 100 })
                    })
                }),
                async (scaleData) => {
                    const validation = await citationManager.validateSourceVerificationRequirements(scaleData);
                    
                    // Should return validation object
                    if (typeof validation !== 'object') {
                        throw new Error('Should return validation object');
                    }
                    
                    // Should have validity status
                    if (typeof validation.valid !== 'boolean') {
                        throw new Error('Should indicate whether scale data is valid');
                    }
                    
                    // Should check for minimum sources
                    if (typeof validation.hasMinimumSources !== 'boolean') {
                        throw new Error('Should check for minimum source requirements');
                    }
                    
                    // Should check for cultural context
                    if (typeof validation.hasCulturalContext !== 'boolean') {
                        throw new Error('Should check for cultural context requirements');
                    }
                    
                    // Should provide completeness score
                    if (typeof validation.completenessScore !== 'number' || 
                        validation.completenessScore < 0 || 
                        validation.completenessScore > 1) {
                        throw new Error('Should provide completeness score between 0 and 1');
                    }
                    
                    // Should provide requirements array
                    if (!Array.isArray(validation.requirements)) {
                        throw new Error('Should provide requirements array');
                    }
                    
                    // Should provide issues array
                    if (!Array.isArray(validation.issues)) {
                        throw new Error('Should provide issues array');
                    }
                    
                    // Valid scales should have high completeness scores
                    if (validation.valid && validation.completenessScore < 0.8) {
                        throw new Error('Valid scales should have high completeness scores');
                    }
                    
                    // Invalid scales should have specific issues identified
                    if (!validation.valid && validation.issues.length === 0) {
                        throw new Error('Invalid scales should have specific issues identified');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Source verification requirements are enforced for new scale integration');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Source verification requirements test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 4: Bulk accessibility checking should handle multiple URLs efficiently
    console.log('\nProperty 4: Bulk accessibility checking should handle multiple URLs efficiently');
    try {
        await fc.assert(
            fc.asyncProperty(
                fc.array(
                    fc.oneof(
                        fc.webUrl(),
                        fc.constant('https://jstor.org/article/123'),
                        fc.constant('https://doi.org/10.1000/example'),
                        fc.constant('https://broken-link.example.com/404'),
                        fc.constant('invalid-url-format')
                    ),
                    { minLength: 1, maxLength: 10 }
                ),
                async (urls) => {
                    const results = await citationManager.bulkCheckAccessibility(urls);
                    
                    // Should return structured results
                    if (typeof results !== 'object' || results.error) {
                        throw new Error('Should return valid results object for bulk check');
                    }
                    
                    // Should check all URLs
                    if (results.totalChecked !== urls.length) {
                        throw new Error(`Should check ${urls.length} URLs, checked ${results.totalChecked}`);
                    }
                    
                    // Should categorize all results
                    const totalCategorized = results.accessible.length + 
                                           results.inaccessible.length + 
                                           results.unknown.length + 
                                           results.errors.length;
                    
                    if (totalCategorized !== urls.length) {
                        throw new Error(`All URLs should be categorized. Expected ${urls.length}, got ${totalCategorized}`);
                    }
                    
                    // Should provide summary statistics
                    if (!results.summary || typeof results.summary !== 'object') {
                        throw new Error('Should provide summary statistics');
                    }
                    
                    const summaryTotal = results.summary.accessibleCount + 
                                       results.summary.inaccessibleCount + 
                                       results.summary.unknownCount + 
                                       results.summary.errorCount;
                    
                    if (summaryTotal !== urls.length) {
                        throw new Error('Summary counts should match total URLs checked');
                    }
                    
                    // Each result should have required fields
                    const allResults = [...results.accessible, ...results.inaccessible, ...results.unknown];
                    for (const result of allResults) {
                        if (!result.url || typeof result.index !== 'number' || !result.checkedAt) {
                            throw new Error('Each result should have url, index, and checkedAt fields');
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 30 }
        );
        console.log('✓ PASSED: Bulk accessibility checking handles multiple URLs efficiently');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Bulk accessibility checking test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 5: Academic domain validation should correctly identify academic sources
    console.log('\nProperty 5: Academic domain validation should correctly identify academic sources');
    try {
        await fc.assert(
            fc.property(
                fc.oneof(
                    // Academic domains
                    fc.oneof(
                        fc.constant('jstor.org'),
                        fc.constant('doi.org'),
                        fc.constant('mit.edu'),
                        fc.constant('harvard.edu'),
                        fc.constant('cambridge.org'),
                        fc.constant('oxford.com'),
                        fc.constant('springer.com')
                    ).map(domain => ({ domain, expectedAcademic: true })),
                    // Non-academic domains
                    fc.oneof(
                        fc.constant('google.com'),
                        fc.constant('facebook.com'),
                        fc.constant('twitter.com'),
                        fc.constant('reddit.com'),
                        fc.constant('youtube.com')
                    ).map(domain => ({ domain, expectedAcademic: false }))
                ),
                ({ domain, expectedAcademic }) => {
                    const validation = citationManager.validateAcademicDomain(domain);
                    
                    // Should return validation object
                    if (typeof validation !== 'object') {
                        throw new Error('Should return academic domain validation object');
                    }
                    
                    // Should have isAcademic boolean
                    if (typeof validation.isAcademic !== 'boolean') {
                        throw new Error('Should indicate whether domain is academic');
                    }
                    
                    // Should correctly identify academic domains
                    if (validation.isAcademic !== expectedAcademic) {
                        throw new Error(`Domain ${domain} should be ${expectedAcademic ? 'academic' : 'non-academic'}, got ${validation.isAcademic}`);
                    }
                    
                    // Should provide type classification
                    if (!validation.type || typeof validation.type !== 'string') {
                        throw new Error('Should provide domain type classification');
                    }
                    
                    // Should provide confidence level
                    if (!validation.confidence || !['high', 'medium', 'low'].includes(validation.confidence)) {
                        throw new Error('Should provide confidence level (high, medium, or low)');
                    }
                    
                    // Academic domains should have higher confidence
                    if (expectedAcademic && validation.confidence === 'low') {
                        throw new Error('Known academic domains should have medium or high confidence');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Academic domain validation correctly identifies academic sources');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Academic domain validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Property-Based Test Results: ${testsPassed}/${testsTotal} tests passed`);
    
    if (testsPassed === testsTotal) {
        console.log('✓ ALL TESTS PASSED - Source validation and fallback mechanism is working correctly');
        return { success: true, passed: testsPassed, total: testsTotal };
    } else {
        console.log('✗ SOME TESTS FAILED - Source validation and fallback mechanism needs attention');
        return { success: false, passed: testsPassed, total: testsTotal };
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runSourceValidationFallbackTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runSourceValidationFallbackTests };