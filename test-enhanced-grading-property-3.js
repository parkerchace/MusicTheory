/**
 * Property-Based Test for Academic Source Priority and Format Consistency
 * **Feature: academic-scale-enhancement, Property 3: Academic Source Priority and Format Consistency**
 * **Validates: Requirements 3.2, 3.3**
 */

const fc = require('fast-check');
const CitationManager = require('./citation-manager.js');

// Test runner function
async function runAcademicSourcePriorityTests() {
    console.log('Running Property-Based Tests for Academic Source Priority and Format Consistency...');
    console.log('**Feature: academic-scale-enhancement, Property 3: Academic Source Priority and Format Consistency**');
    console.log('**Validates: Requirements 3.2, 3.3**\n');

    const citationManager = new CitationManager();
    let testsPassed = 0;
    let testsTotal = 0;

    // Property 1: Peer-reviewed sources should be prioritized over general references
    console.log('Property 1: Peer-reviewed sources should be prioritized over general references');
    try {
        await fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        title: fc.string({ minLength: 5, maxLength: 100 }),
                        authors: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
                        year: fc.integer({ min: 1900, max: 2024 }),
                        type: fc.oneof(
                            fc.constant('journal_article'),
                            fc.constant('book'),
                            fc.constant('conference_paper'),
                            fc.constant('general_reference'),
                            fc.constant('website')
                        ),
                        journal: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
                        url: fc.oneof(
                            fc.constant('https://jstor.org/article/123'),
                            fc.constant('https://doi.org/10.1000/example'),
                            fc.constant('https://cambridge.org/journal/article'),
                            fc.constant('https://example.com/general-info')
                        )
                    }),
                    { minLength: 2, maxLength: 10 }
                ),
                (sources) => {
                    // Sort sources by academic priority
                    const prioritized = citationManager.prioritizeAcademicSources(sources);
                    
                    // Check that peer-reviewed sources come first
                    let foundNonAcademic = false;
                    for (const source of prioritized) {
                        if (foundNonAcademic && ['journal_article', 'book', 'conference_paper'].includes(source.type)) {
                            throw new Error('Academic sources should be prioritized before general references');
                        }
                        if (['general_reference', 'website'].includes(source.type)) {
                            foundNonAcademic = true;
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Peer-reviewed sources are correctly prioritized');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Academic source prioritization test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 2: All citations should include complete bibliographic information
    console.log('\nProperty 2: All citations should include complete bibliographic information');
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
                    pages: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length >= 3),
                    url: fc.webUrl()
                }),
                (completeSource) => {
                    const validation = citationManager.validateCitationCompleteness(completeSource);
                    
                    // Should validate as complete
                    if (!validation.isComplete) {
                        throw new Error(`Complete source should validate as complete: ${validation.missingFields.join(', ')}`);
                    }
                    
                    // Should include page numbers
                    if (!validation.hasPageNumbers) {
                        throw new Error('Academic citations should include page numbers');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Complete bibliographic information is correctly validated');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Bibliographic completeness validation test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 3: Incomplete citations should be identified with specific missing fields
    console.log('\nProperty 3: Incomplete citations should be identified with specific missing fields');
    try {
        await fc.assert(
            fc.property(
                fc.record({
                    title: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
                    authors: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 3 })),
                    year: fc.option(fc.integer({ min: 1900, max: 2024 })),
                    journal: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
                    pages: fc.option(fc.string({ minLength: 3, maxLength: 20 }))
                }),
                (incompleteSource) => {
                    // Remove some required fields to make it incomplete
                    const testSource = { ...incompleteSource };
                    
                    // Ensure at least one required field is missing
                    const requiredFields = ['title', 'authors', 'year'];
                    const hasAllRequired = requiredFields.every(field => 
                        testSource[field] && 
                        (!Array.isArray(testSource[field]) || testSource[field].length > 0)
                    );
                    
                    if (hasAllRequired) {
                        // Remove a random required field to make it incomplete
                        delete testSource[requiredFields[0]];
                    }
                    
                    const validation = citationManager.validateCitationCompleteness(testSource);
                    
                    // Should identify as incomplete
                    if (validation.isComplete) {
                        throw new Error('Incomplete source should not validate as complete');
                    }
                    
                    // Should identify specific missing fields
                    if (!validation.missingFields || validation.missingFields.length === 0) {
                        throw new Error('Validation should identify specific missing fields');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Incomplete citations are correctly identified');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Incomplete citation identification test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 4: Citation format should be consistent across different source types
    console.log('\nProperty 4: Citation format should be consistent across different source types');
    try {
        await fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        title: fc.string({ minLength: 5, maxLength: 100 }),
                        authors: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
                        year: fc.integer({ min: 1900, max: 2024 }),
                        type: fc.oneof(
                            fc.constant('journal_article'),
                            fc.constant('book'),
                            fc.constant('conference_paper')
                        ),
                        journal: fc.string({ minLength: 5, maxLength: 50 }),
                        pages: fc.string({ minLength: 3, maxLength: 20 })
                    }),
                    { minLength: 2, maxLength: 5 }
                ),
                (sources) => {
                    const formattedCitations = sources.map(source => 
                        citationManager.formatAcademicCitation(source, 'academic')
                    );
                    
                    // All citations should follow consistent format patterns
                    for (const citation of formattedCitations) {
                        // Should include author, year, title, and publication info
                        if (!citation.includes('(') || !citation.includes(')')) {
                            throw new Error('Citation should include year in parentheses');
                        }
                        
                        if (!citation.includes('"') || citation.split('"').length < 3) {
                            throw new Error('Citation should include title in quotes');
                        }
                        
                        if (citation.length < 20) {
                            throw new Error('Citation appears too short to be complete');
                        }
                    }
                    
                    return true;
                }
            ),
            { numRuns: 50 }
        );
        console.log('✓ PASSED: Citation format is consistent across source types');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Citation format consistency test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Property 5: Multiple sources for same scale should maintain priority order
    console.log('\nProperty 5: Multiple sources for same scale should maintain priority order');
    try {
        await fc.assert(
            fc.property(
                fc.record({
                    scaleId: fc.string({ minLength: 3, maxLength: 20 }),
                    sources: fc.array(
                        fc.record({
                            title: fc.string({ minLength: 5, maxLength: 100 }),
                            type: fc.oneof(
                                fc.constant('journal_article'),
                                fc.constant('book'),
                                fc.constant('general_reference')
                            ),
                            priority: fc.integer({ min: 1, max: 10 }),
                            url: fc.webUrl()
                        }),
                        { minLength: 2, maxLength: 8 }
                    )
                }),
                (scaleData) => {
                    const orderedSources = citationManager.orderSourcesByPriority(scaleData.sources);
                    
                    // Check that academic sources come before general references
                    let lastAcademicIndex = -1;
                    let firstGeneralIndex = orderedSources.length;
                    
                    for (let i = 0; i < orderedSources.length; i++) {
                        if (['journal_article', 'book'].includes(orderedSources[i].type)) {
                            lastAcademicIndex = i;
                        } else if (orderedSources[i].type === 'general_reference') {
                            firstGeneralIndex = Math.min(firstGeneralIndex, i);
                        }
                    }
                    
                    if (lastAcademicIndex > firstGeneralIndex) {
                        throw new Error('Academic sources should be ordered before general references');
                    }
                    
                    return true;
                }
            ),
            { numRuns: 100 }
        );
        console.log('✓ PASSED: Multiple sources maintain correct priority order');
        testsPassed++;
    } catch (error) {
        console.log('✗ FAILED: Source priority ordering test');
        console.log('Error:', error.message);
    }
    testsTotal++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Property-Based Test Results: ${testsPassed}/${testsTotal} tests passed`);
    
    if (testsPassed === testsTotal) {
        console.log('✓ ALL TESTS PASSED - Academic source priority and format consistency is working correctly');
        return { success: true, passed: testsPassed, total: testsTotal };
    } else {
        console.log('✗ SOME TESTS FAILED - Academic source priority and format consistency needs attention');
        return { success: false, passed: testsPassed, total: testsTotal };
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAcademicSourcePriorityTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runAcademicSourcePriorityTests };