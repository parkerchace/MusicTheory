/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 7: Grading Explanation Availability**
 * **Validates: Requirements 2.5, 3.5**
 * 
 * Property 7: Grading Explanation Availability
 * For any graded element, the system should be able to provide an explanation 
 * of why that specific grade was assigned in the current grading mode
 */

class GradingExplanationTest {
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

    generateRandomChord() {
        const chords = ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5', 'C7', 'F#dim7'];
        return chords[Math.floor(Math.random() * chords.length)];
    }

    // Test that grading explanations are always available for any graded element
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
                
                // Property: Explanation must always be available for any graded element
                const explanation = engine.getGradingExplanation(note, tier, context);
                
                if (!explanation || typeof explanation !== 'string' || explanation.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        tier: tier,
                        explanation: explanation,
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
                
                // Property: Explanation should be mode-specific and meaningful
                const modeKeywords = {
                    functional: ['harmonic', 'function', 'tonic', 'dominant', 'scale', 'chromatic', 'dissonance'],
                    emotional: ['bright', 'sad', 'happy', 'melancholy', 'uplifting', 'tension', 'emotional'],
                    color: ['color', 'harmonic', 'brilliant', 'warm', 'mysterious', 'richness', 'complexity']
                };
                
                const keywords = modeKeywords[mode] || [];
                const hasRelevantKeyword = keywords.some(keyword => 
                    explanation.toLowerCase().includes(keyword.toLowerCase())
                );
                
                if (!hasRelevantKeyword) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        explanation: explanation,
                        reason: `Explanation lacks ${mode}-specific terminology`
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

    // Test that chord explanations are also available
    testChordGradingExplanationAvailability() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const chord = this.generateRandomChord();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                const context = { elementType: 'chord', key: key, scaleType: scale };
                const tier = engine.calculateElementGrade(chord, context);
                
                // Property: Chord explanations must always be available
                const explanation = engine.getGradingExplanation(chord, tier, context);
                
                if (!explanation || typeof explanation !== 'string' || explanation.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        chord: chord,
                        key: key,
                        scale: scale,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing or empty chord grading explanation'
                    });
                }
                
                // Property: Chord explanation should mention the grading mode
                if (!explanation.toLowerCase().includes(mode.toLowerCase())) {
                    this.failures.push({
                        iteration: i,
                        chord: chord,
                        mode: mode,
                        explanation: explanation,
                        reason: 'Chord explanation does not mention grading mode'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during chord explanation test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that grading rationale provides comprehensive explanation
    testGradingRationaleCompleteness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const note = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                const context = { elementType: 'note', key: key, scaleType: scale };
                
                // Property: Grading rationale must provide comprehensive explanation
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
                
                // Property: All rationale components should be non-empty strings
                if (rationale.explanation && 
                    (typeof rationale.explanation !== 'string' || rationale.explanation.trim().length === 0)) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        reason: 'Empty or invalid explanation in rationale'
                    });
                }
                
                if (rationale.educational && 
                    (typeof rationale.educational !== 'string' || rationale.educational.trim().length === 0)) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        reason: 'Empty or invalid educational content in rationale'
                    });
                }
                
                if (rationale.theoreticalBasis && 
                    (typeof rationale.theoreticalBasis !== 'string' || rationale.theoreticalBasis.trim().length === 0)) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        reason: 'Empty or invalid theoretical basis in rationale'
                    });
                }
                
                // Property: Tier should be a valid number (0-4)
                if (typeof rationale.tier !== 'number' || rationale.tier < 0 || rationale.tier > 4) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        tier: rationale.tier,
                        reason: 'Invalid tier value in rationale'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during rationale completeness test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that explanations are consistent for the same element in same context
    testExplanationConsistency() {
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
                
                // Get explanation multiple times for same element/context
                const explanation1 = engine.getGradingExplanation(note, tier, context);
                const explanation2 = engine.getGradingExplanation(note, tier, context);
                
                // Property: Same element should get same explanation in same context
                if (explanation1 !== explanation2) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        tier: tier,
                        explanation1: explanation1,
                        explanation2: explanation2,
                        reason: 'Inconsistent explanations for same element in same context'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during explanation consistency test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that explanations differ appropriately across grading modes
    testExplanationModeSpecificity() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const note = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                
                const context = { elementType: 'note', key: key, scaleType: scale };
                
                // Get explanations for same element in different modes
                const explanations = {};
                const modes = ['functional', 'emotional', 'color'];
                
                for (const mode of modes) {
                    engine.setGradingMode(mode);
                    const tier = engine.calculateElementGrade(note, context);
                    explanations[mode] = engine.getGradingExplanation(note, tier, context);
                }
                
                // Property: Explanations should be different across modes (mode-specific)
                const uniqueExplanations = new Set(Object.values(explanations));
                if (uniqueExplanations.size === 1) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        explanations: explanations,
                        reason: 'Identical explanations across different grading modes'
                    });
                }
                
                // Property: Each explanation should contain mode-specific content
                for (const [mode, explanation] of Object.entries(explanations)) {
                    if (!explanation.toLowerCase().includes(mode.toLowerCase())) {
                        this.failures.push({
                            iteration: i,
                            note: note,
                            mode: mode,
                            explanation: explanation,
                            reason: `${mode} explanation does not mention the grading mode`
                        });
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during mode specificity test'
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
        const test1 = this.testGradingExplanationAvailability();
        const test2 = this.testChordGradingExplanationAvailability();
        const test3 = this.testGradingRationaleCompleteness();
        const test4 = this.testExplanationConsistency();
        const test5 = this.testExplanationModeSpecificity();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const passed = test1 && test2 && test3 && test4 && test5;
        
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
                if (failure.note) {
                    console.log(`   Note: ${failure.note}`);
                }
                if (failure.mode) {
                    console.log(`   Mode: ${failure.mode}`);
                }
                if (failure.explanation && failure.explanation.length < 200) {
                    console.log(`   Explanation: "${failure.explanation}"`);
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
    module.exports = GradingExplanationTest;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    window.PropertyTest7 = GradingExplanationTest;
    
    // Function to run the test
    window.runGradingExplanationTest = function() {
        const test = new GradingExplanationTest('Grading Explanation Availability', 100);
        return test.run();
    };
    
    console.log('Property Test 7 loaded. Run with: runGradingExplanationTest()');
}