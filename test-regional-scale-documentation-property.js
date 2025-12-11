/**
 * Property-Based Test for Regional Scale Documentation Format Consistency
 * **Property 9: Regional Scale Documentation Format Consistency**
 * **Validates: Requirements 4.5, 5.4**
 * 
 * Tests that all newly added regional scales follow a consistent format
 * and handle unique characteristics appropriately in harmonic analysis
 */

// Import required modules
const MusicTheoryEngine = require('./music-theory-engine.js');
const RegionalScaleManager = require('./regional-scale-manager.js');

// Simple property-based testing framework
class PropertyTest {
    constructor(name, iterations = 100) {
        this.name = name;
        this.iterations = iterations;
        this.failures = [];
    }

    run(property) {
        console.log(`Running property test: ${this.name}`);
        console.log(`Iterations: ${this.iterations}`);
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const result = property();
                if (!result.success) {
                    this.failures.push({
                        iteration: i + 1,
                        input: result.input,
                        error: result.error,
                        expected: result.expected,
                        actual: result.actual
                    });
                }
            } catch (error) {
                this.failures.push({
                    iteration: i + 1,
                    error: error.message,
                    stack: error.stack
                });
            }
        }

        return this.getResults();
    }

    getResults() {
        const passed = this.failures.length === 0;
        return {
            passed,
            totalIterations: this.iterations,
            failures: this.failures.length,
            failureDetails: this.failures.slice(0, 5) // Show first 5 failures
        };
    }
}

// Test data generators
class RegionalScaleGenerator {
    static generateValidRegionalScale() {
        const regions = ['Argentina', 'Brazil', 'Peru', 'Nigeria', 'Ghana', 'Mali'];
        const culturalGroups = ['Folk traditions', 'Traditional musicians', 'Ceremonial music', 'Court music'];
        const periods = ['Pre-colonial', 'Colonial period', '19th century', '20th century'];
        const functions = ['Dance music', 'Ceremonial music', 'Work songs', 'Storytelling'];
        
        const scaleIds = ['test_chacarera', 'test_zamba', 'test_mbira', 'test_kora', 'test_balafon'];
        const intervals = [
            [0, 2, 4, 5, 7, 9, 11], // Major-like
            [0, 2, 3, 5, 7, 8, 10], // Minor-like
            [0, 2, 4, 7, 9],        // Pentatonic
            [0, 1, 4, 5, 7, 8, 10], // Phrygian-like
            [0, 3, 5, 7, 10]        // Minor pentatonic
        ];

        const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
        
        return {
            scaleId: randomChoice(scaleIds) + '_' + Math.floor(Math.random() * 1000),
            intervals: randomChoice(intervals),
            culturalContext: {
                region: randomChoice(regions),
                culturalGroup: randomChoice(culturalGroups),
                historicalPeriod: randomChoice(periods),
                musicalFunction: randomChoice(functions)
            },
            tuningSystem: {
                original: 'Traditional tuning system with regional variations',
                approximationMethod: '12-TET intervals for orchestral compatibility',
                orchestralInstruments: 'Compatible with violin, viola, cello, bass, winds, and brass',
                limitations: 'Traditional microtonal inflections approximated to nearest semitone',
                pedagogicalNotes: 'Suitable for high school orchestra use with cultural context'
            },
            references: [
                {
                    type: 'journal_article',
                    title: 'Ethnomusicological Study of Regional Scales',
                    authors: ['Test Author'],
                    journal: 'Journal of Ethnomusicology',
                    year: 2020,
                    volume: '64',
                    issue: '2',
                    pages: '123-145',
                    doi: '10.1000/test',
                    url: 'https://doi.org/10.1000/test'
                }
            ]
        };
    }

    static generateInvalidRegionalScale() {
        const invalidCases = [
            // Missing cultural context fields
            {
                scaleId: 'invalid_scale_1',
                intervals: [0, 2, 4, 5, 7, 9, 11],
                culturalContext: {
                    region: 'Test Region'
                    // Missing required fields
                },
                references: []
            },
            // Invalid intervals (outside 12-TET range)
            {
                scaleId: 'invalid_scale_2',
                intervals: [0, 2, 4, 13, 7, 9, 11], // 13 is invalid
                culturalContext: {
                    region: 'Test Region',
                    culturalGroup: 'Test Group',
                    historicalPeriod: 'Test Period',
                    musicalFunction: 'Test Function'
                },
                references: []
            },
            // Missing references
            {
                scaleId: 'invalid_scale_3',
                intervals: [0, 2, 4, 5, 7, 9, 11],
                culturalContext: {
                    region: 'Test Region',
                    culturalGroup: 'Test Group',
                    historicalPeriod: 'Test Period',
                    musicalFunction: 'Test Function'
                }
                // Missing references
            }
        ];

        return invalidCases[Math.floor(Math.random() * invalidCases.length)];
    }
}

// Property test implementation
function testRegionalScaleDocumentationFormatConsistency() {
    const engine = new MusicTheoryEngine();
    
    return function() {
        const testScale = RegionalScaleGenerator.generateValidRegionalScale();
        
        try {
            // Test that valid regional scales can be added successfully
            const result = engine.addRegionalScale(
                {
                    scaleId: testScale.scaleId,
                    intervals: testScale.intervals
                },
                {
                    culturalContext: testScale.culturalContext,
                    tuningSystem: testScale.tuningSystem,
                    references: testScale.references
                }
            );

            // Verify the scale was added to the scales object
            if (!engine.scales[testScale.scaleId]) {
                return {
                    success: false,
                    input: testScale,
                    error: 'Scale not added to scales object',
                    expected: 'Scale to be present in engine.scales',
                    actual: 'Scale not found'
                };
            }

            // Verify the scale citation was created with proper format
            const citation = engine.scaleCitations[testScale.scaleId];
            if (!citation) {
                return {
                    success: false,
                    input: testScale,
                    error: 'Scale citation not created',
                    expected: 'Citation to be present in engine.scaleCitations',
                    actual: 'Citation not found'
                };
            }

            // Verify required documentation fields are present
            const requiredFields = ['description', 'culturalContext', 'tuningSystem', 'references'];
            for (const field of requiredFields) {
                if (!citation[field]) {
                    return {
                        success: false,
                        input: testScale,
                        error: `Missing required field: ${field}`,
                        expected: `Citation to have ${field} field`,
                        actual: `Field ${field} not found`
                    };
                }
            }

            // Verify cultural context completeness
            const requiredContextFields = ['region', 'culturalGroup', 'historicalPeriod', 'musicalFunction'];
            for (const field of requiredContextFields) {
                if (!citation.culturalContext[field]) {
                    return {
                        success: false,
                        input: testScale,
                        error: `Missing cultural context field: ${field}`,
                        expected: `Cultural context to have ${field} field`,
                        actual: `Field ${field} not found in cultural context`
                    };
                }
            }

            // Verify tuning system documentation
            const requiredTuningFields = ['original', 'approximationMethod', 'orchestralInstruments', 'limitations', 'pedagogicalNotes'];
            for (const field of requiredTuningFields) {
                if (!citation.tuningSystem[field]) {
                    return {
                        success: false,
                        input: testScale,
                        error: `Missing tuning system field: ${field}`,
                        expected: `Tuning system to have ${field} field`,
                        actual: `Field ${field} not found in tuning system`
                    };
                }
            }

            // Verify references array is present and non-empty
            if (!Array.isArray(citation.references) || citation.references.length === 0) {
                return {
                    success: false,
                    input: testScale,
                    error: 'References must be non-empty array',
                    expected: 'Non-empty array of references',
                    actual: `References: ${JSON.stringify(citation.references)}`
                };
            }

            // Verify cultural context can be retrieved
            try {
                const culturalContext = engine.getRegionalScaleCulturalContext(testScale.scaleId);
                if (!culturalContext.region || !culturalContext.culturalGroup) {
                    return {
                        success: false,
                        input: testScale,
                        error: 'Cultural context retrieval incomplete',
                        expected: 'Complete cultural context with region and culturalGroup',
                        actual: JSON.stringify(culturalContext)
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    input: testScale,
                    error: `Cultural context retrieval failed: ${error.message}`,
                    expected: 'Successful cultural context retrieval',
                    actual: 'Error thrown'
                };
            }

            return { success: true };

        } catch (error) {
            return {
                success: false,
                input: testScale,
                error: error.message,
                expected: 'Successful scale addition',
                actual: 'Error thrown'
            };
        }
    };
}

// Property test for invalid scales (should be rejected)
function testInvalidRegionalScalesRejection() {
    const engine = new MusicTheoryEngine();
    
    return function() {
        const invalidScale = RegionalScaleGenerator.generateInvalidRegionalScale();
        
        try {
            // This should throw an error for invalid scales
            engine.addRegionalScale(
                {
                    scaleId: invalidScale.scaleId,
                    intervals: invalidScale.intervals
                },
                {
                    culturalContext: invalidScale.culturalContext,
                    tuningSystem: invalidScale.tuningSystem,
                    references: invalidScale.references || []
                }
            );

            // If we reach here, the invalid scale was incorrectly accepted
            return {
                success: false,
                input: invalidScale,
                error: 'Invalid scale was accepted',
                expected: 'Error to be thrown for invalid scale',
                actual: 'Scale was accepted without error'
            };

        } catch (error) {
            // This is expected - invalid scales should be rejected
            return { success: true };
        }
    };
}

// Run the property tests
function runPropertyTests() {
    console.log('='.repeat(60));
    console.log('REGIONAL SCALE DOCUMENTATION FORMAT CONSISTENCY TESTS');
    console.log('='.repeat(60));

    // Test 1: Valid regional scales should be properly formatted
    const validScaleTest = new PropertyTest('Regional Scale Documentation Format Consistency', 50);
    const validResults = validScaleTest.run(testRegionalScaleDocumentationFormatConsistency());
    
    console.log('\n--- Test 1: Valid Regional Scale Documentation ---');
    console.log(`Status: ${validResults.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Iterations: ${validResults.totalIterations}`);
    console.log(`Failures: ${validResults.failures}`);
    
    if (!validResults.passed) {
        console.log('\nFailure Details:');
        validResults.failureDetails.forEach((failure, index) => {
            console.log(`  ${index + 1}. Iteration ${failure.iteration}: ${failure.error}`);
            if (failure.expected) console.log(`     Expected: ${failure.expected}`);
            if (failure.actual) console.log(`     Actual: ${failure.actual}`);
        });
    }

    // Test 2: Invalid regional scales should be rejected
    const invalidScaleTest = new PropertyTest('Invalid Regional Scale Rejection', 30);
    const invalidResults = invalidScaleTest.run(testInvalidRegionalScalesRejection());
    
    console.log('\n--- Test 2: Invalid Regional Scale Rejection ---');
    console.log(`Status: ${invalidResults.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Iterations: ${invalidResults.totalIterations}`);
    console.log(`Failures: ${invalidResults.failures}`);
    
    if (!invalidResults.passed) {
        console.log('\nFailure Details:');
        invalidResults.failureDetails.forEach((failure, index) => {
            console.log(`  ${index + 1}. Iteration ${failure.iteration}: ${failure.error}`);
            if (failure.expected) console.log(`     Expected: ${failure.expected}`);
            if (failure.actual) console.log(`     Actual: ${failure.actual}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('OVERALL RESULTS');
    console.log('='.repeat(60));
    
    const overallPassed = validResults.passed && invalidResults.passed;
    console.log(`Overall Status: ${overallPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`Total Tests: 2`);
    console.log(`Passed Tests: ${(validResults.passed ? 1 : 0) + (invalidResults.passed ? 1 : 0)}`);
    console.log(`Failed Tests: ${(validResults.passed ? 0 : 1) + (invalidResults.passed ? 0 : 1)}`);
    
    return overallPassed;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runPropertyTests,
        RegionalScaleGenerator,
        testRegionalScaleDocumentationFormatConsistency,
        testInvalidRegionalScalesRejection
    };
}

// Run tests if this file is executed directly
if (require.main === module) {
    const passed = runPropertyTests();
    process.exit(passed ? 0 : 1);
}