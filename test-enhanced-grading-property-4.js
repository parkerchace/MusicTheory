/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 4: Educational Context Completeness**
 * **Validates: Requirements 3.1, 3.3**
 * 
 * Property 4: Educational Context Completeness
 * For any grading tier display, the system should provide educational descriptions 
 * and explanatory content appropriate to the current grading mode
 */

class EducationalContextTest {
    constructor(name, iterations = 100) {
        this.name = name;
        this.iterations = iterations;
        this.failures = [];
    }

    // Generate random test data
    generateRandomNote() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes[Math.floor(Math.random() * notes.length)];
    }

    generateRandomKey() {
        const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
        return keys[Math.floor(Math.random() * keys.length)];
    }

    generateRandomScale() {
        const scales = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
        return scales[Math.floor(Math.random() * scales.length)];
    }

    generateRandomGradingMode() {
        const modes = ['functional', 'emotional', 'color'];
        return modes[Math.floor(Math.random() * modes.length)];
    }

    generateRandomTier() {
        return Math.floor(Math.random() * 5); // 0-4
    }

    // Test that educational context is always provided
    testEducationalContextCompleteness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                const tier = this.generateRandomTier();
                
                engine.setGradingMode(mode);
                
                // Get educational context
                const educationalContext = engine.getEducationalContext(tier, mode);
                
                // Property: Educational context must always be provided
                if (!educationalContext || typeof educationalContext !== 'string' || educationalContext.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        educationalContext: educationalContext,
                        reason: 'Missing or empty educational context'
                    });
                }
                
                // Property: Educational context should be meaningful (not just default)
                if (educationalContext === 'This grading provides insight into the musical character of the element.' && tier !== 2) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Using default educational context instead of specific content'
                    });
                }
                
                // Property: Educational context should be appropriate for the mode
                const modeKeywords = {
                    functional: ['harmonic', 'function', 'tonic', 'dominant', 'resolution', 'dissonance'],
                    emotional: ['emotion', 'mood', 'feeling', 'sad', 'happy', 'bright', 'dark'],
                    color: ['color', 'harmonic', 'sound', 'quality', 'character', 'atmosphere']
                };
                
                const keywords = modeKeywords[mode] || [];
                const hasRelevantKeyword = keywords.some(keyword => 
                    educationalContext.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (!hasRelevantKeyword) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        educationalContext: educationalContext,
                        reason: `Educational context lacks ${mode}-specific terminology`
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during educational context test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that grading explanations are provided for all elements
    testGradingExplanationAvailability() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const note = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                const context = { elementType: 'note', key: key, scaleType: scale };
                const tier = engine.calculateElementGrade(note, context);
                
                // Get grading explanation
                const explanation = engine.getGradingExplanation(note, tier, context);
                
                // Property: Explanation must always be provided
                if (!explanation || typeof explanation !== 'string' || explanation.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing or empty grading explanation'
                    });
                }
                
                // Property: Explanation should mention the grading mode
                if (!explanation.toLowerCase().includes(mode.toLowerCase())) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        explanation: explanation,
                        reason: 'Explanation does not mention grading mode'
                    });
                }
                
                // Property: Explanation should mention the element being graded
                if (!explanation.includes(note)) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        explanation: explanation,
                        reason: 'Explanation does not mention the graded element'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during explanation availability test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that grading rationale includes theoretical basis
    testTheoreticalBasisCompleteness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const note = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                const context = { elementType: 'note', key: key, scaleType: scale };
                
                // Get grading rationale
                const rationale = engine.explainGradingRationale(note, context);
                
                // Property: Rationale must include all required components
                const requiredFields = ['tier', 'explanation', 'educational', 'theoreticalBasis'];
                for (const field of requiredFields) {
                    if (!rationale.hasOwnProperty(field)) {
                        this.failures.push({
                            iteration: i,
                            note: note,
                            mode: mode,
                            missingField: field,
                            reason: `Missing required field in grading rationale: ${field}`
                        });
                    }
                }
                
                // Property: Theoretical basis should be meaningful
                if (rationale.theoreticalBasis && 
                    (typeof rationale.theoreticalBasis !== 'string' || 
                     rationale.theoreticalBasis.trim().length === 0)) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        reason: 'Empty or invalid theoretical basis'
                    });
                }
                
                // Property: Educational content should be different from explanation
                if (rationale.educational === rationale.explanation) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        reason: 'Educational content identical to explanation (should be distinct)'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during theoretical basis test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that tier info includes educational context
    testTierInfoEducationalContent() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                const tier = this.generateRandomTier();
                
                engine.setGradingMode(mode);
                
                const tierInfo = engine.getGradingTierInfo(tier);
                
                // Property: Tier info must include educational context
                if (!tierInfo.educationalContext || 
                    typeof tierInfo.educationalContext !== 'string' ||
                    tierInfo.educationalContext.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Tier info missing educational context'
                    });
                }
                
                // Property: Tier info must include theoretical basis
                if (!tierInfo.theoreticalBasis || 
                    typeof tierInfo.theoreticalBasis !== 'string' ||
                    tierInfo.theoreticalBasis.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Tier info missing theoretical basis'
                    });
                }
                
                // Property: Tier info must include suggested actions
                if (!Array.isArray(tierInfo.suggestedActions) || 
                    tierInfo.suggestedActions.length === 0) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Tier info missing or empty suggested actions'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during tier info educational content test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    run() {
        console.log(`Running Property Test: ${this.name}`);
        console.log(`Iterations: ${this.iterations}`);
        
        const startTime = Date.now();
        
        // Run all test methods
        const test1 = this.testEducationalContextCompleteness();
        const test2 = this.testGradingExplanationAvailability();
        const test3 = this.testTheoreticalBasisCompleteness();
        const test4 = this.testTierInfoEducationalContent();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const passed = test1 && test2 && test3 && test4;
        
        console.log(`\nTest Results:`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Status: ${passed ? 'PASSED' : 'FAILED'}`);
        console.log(`Failures: ${this.failures.length}`);
        
        if (!passed) {
            console.log('\nFailure Details:');
            this.failures.forEach((failure, index) => {
                console.log(`${index + 1}. ${failure.reason}`);
                if (failure.iteration !== undefined) {
                    console.log(`   Iteration: ${failure.iteration}`);
                }
                if (failure.error) {
                    console.log(`   Error: ${failure.error}`);
                }
            });
        }
        
        return {
            passed: passed,
            failures: this.failures,
            duration: duration,
            iterations: this.iterations
        };
    }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EducationalContextTest;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    window.PropertyTest4 = EducationalContextTest;
    
    // Function to run the test
    window.runEducationalContextTest = function() {
        const test = new EducationalContextTest('Educational Context Completeness', 100);
        return test.run();
    };
    
    console.log('Property Test 4 loaded. Run with: runEducationalContextTest()');
}