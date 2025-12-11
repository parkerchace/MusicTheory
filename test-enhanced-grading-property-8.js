/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 8: Alternative Suggestion Generation**
 * **Validates: Requirements 3.4**
 * 
 * Property 8: Alternative Suggestion Generation
 * For any element with a low grading tier (0-1), the system should be able to 
 * suggest alternatives with higher grading tiers in the same context
 */

class AlternativeSuggestionTest {
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

    // Test that alternatives are suggested for low-tier elements
    testAlternativeSuggestionForLowTierElements() {
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
                
                // Only test elements with low tiers (0-1)
                if (tier <= 1) {
                    // Property: System should suggest alternatives with higher tiers
                    const alternatives = engine.suggestAlternatives(note, 2, context);
                    
                    if (!alternatives || !Array.isArray(alternatives)) {
                        this.failures.push({
                            iteration: i,
                            note: note,
                            key: key,
                            scale: scale,
                            mode: mode,
                            tier: tier,
                            reason: 'suggestAlternatives did not return an array'
                        });
                        continue;
                    }
                    
                    // Property: Should return at least one alternative for low-tier elements
                    if (alternatives.length === 0) {
                        this.failures.push({
                            iteration: i,
                            note: note,
                            key: key,
                            scale: scale,
                            mode: mode,
                            tier: tier,
                            reason: 'No alternatives suggested for low-tier element'
                        });
                        continue;
                    }
                    
                    // Property: All alternatives should have higher tiers than the original
                    for (const alt of alternatives) {
                        if (alt.tier <= tier) {
                            this.failures.push({
                                iteration: i,
                                note: note,
                                alternative: alt.element,
                                originalTier: tier,
                                alternativeTier: alt.tier,
                                reason: 'Alternative does not have higher tier than original'
                            });
                        }
                    }
                    
                    // Property: All alternatives should meet the target tier
                    for (const alt of alternatives) {
                        if (alt.tier < 2) {
                            this.failures.push({
                                iteration: i,
                                note: note,
                                alternative: alt.element,
                                alternativeTier: alt.tier,
                                targetTier: 2,
                                reason: 'Alternative does not meet target tier requirement'
                            });
                        }
                    }
                    
                    // Property: Alternatives should not include the original element
                    for (const alt of alternatives) {
                        if (alt.element === note) {
                            this.failures.push({
                                iteration: i,
                                note: note,
                                reason: 'Alternative suggestions include the original element'
                            });
                        }
                    }
                    
                    // Property: Each alternative should have an explanation
                    for (const alt of alternatives) {
                        if (!alt.explanation || typeof alt.explanation !== 'string' || alt.explanation.trim().length === 0) {
                            this.failures.push({
                                iteration: i,
                                note: note,
                                alternative: alt.element,
                                reason: 'Alternative missing explanation'
                            });
                        }
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during alternative suggestion test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that chord alternatives are suggested for low-tier chords
    testChordAlternativeSuggestion() {
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
                
                // Only test chords with low tiers (0-1)
                if (tier <= 1) {
                    // Property: System should suggest chord alternatives with higher tiers
                    const alternatives = engine.suggestAlternatives(chord, 3, context);
                    
                    if (!alternatives || !Array.isArray(alternatives)) {
                        this.failures.push({
                            iteration: i,
                            chord: chord,
                            key: key,
                            scale: scale,
                            mode: mode,
                            tier: tier,
                            reason: 'suggestAlternatives did not return an array for chord'
                        });
                        continue;
                    }
                    
                    // Property: Should return at least one alternative for low-tier chords
                    if (alternatives.length === 0) {
                        this.failures.push({
                            iteration: i,
                            chord: chord,
                            key: key,
                            scale: scale,
                            mode: mode,
                            tier: tier,
                            reason: 'No chord alternatives suggested for low-tier chord'
                        });
                        continue;
                    }
                    
                    // Property: All chord alternatives should have higher tiers
                    for (const alt of alternatives) {
                        if (alt.tier <= tier) {
                            this.failures.push({
                                iteration: i,
                                chord: chord,
                                alternative: alt.element,
                                originalTier: tier,
                                alternativeTier: alt.tier,
                                reason: 'Chord alternative does not have higher tier than original'
                            });
                        }
                    }
                    
                    // Property: All chord alternatives should meet the target tier
                    for (const alt of alternatives) {
                        if (alt.tier < 3) {
                            this.failures.push({
                                iteration: i,
                                chord: chord,
                                alternative: alt.element,
                                alternativeTier: alt.tier,
                                targetTier: 3,
                                reason: 'Chord alternative does not meet target tier requirement'
                            });
                        }
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during chord alternative suggestion test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that alternatives are sorted by tier (highest first)
    testAlternativeSorting() {
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
                
                // Only test elements with low tiers (0-1)
                if (tier <= 1) {
                    const alternatives = engine.suggestAlternatives(note, 2, context);
                    
                    if (alternatives && alternatives.length > 1) {
                        // Property: Alternatives should be sorted by tier (highest first)
                        for (let j = 0; j < alternatives.length - 1; j++) {
                            if (alternatives[j].tier < alternatives[j + 1].tier) {
                                this.failures.push({
                                    iteration: i,
                                    note: note,
                                    position: j,
                                    currentTier: alternatives[j].tier,
                                    nextTier: alternatives[j + 1].tier,
                                    reason: 'Alternatives not sorted by tier (highest first)'
                                });
                            }
                        }
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during alternative sorting test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that alternatives are limited to reasonable number
    testAlternativeLimit() {
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
                
                // Only test elements with low tiers (0-1)
                if (tier <= 1) {
                    const alternatives = engine.suggestAlternatives(note, 2, context);
                    
                    // Property: Should limit alternatives to reasonable number (e.g., 5)
                    if (alternatives && alternatives.length > 5) {
                        this.failures.push({
                            iteration: i,
                            note: note,
                            alternativeCount: alternatives.length,
                            reason: 'Too many alternatives returned (should be limited to 5)'
                        });
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during alternative limit test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that alternatives are context-appropriate
    testAlternativeContextRelevance() {
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
                
                // Only test elements with low tiers (0-1)
                if (tier <= 1) {
                    const alternatives = engine.suggestAlternatives(note, 3, context);
                    
                    if (alternatives && alternatives.length > 0) {
                        // Property: Alternatives should be valid notes
                        for (const alt of alternatives) {
                            const validNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                            if (!validNotes.includes(alt.element)) {
                                this.failures.push({
                                    iteration: i,
                                    note: note,
                                    alternative: alt.element,
                                    reason: 'Alternative is not a valid note'
                                });
                            }
                        }
                        
                        // Property: Alternative tiers should be recalculated in same context
                        for (const alt of alternatives) {
                            const recalculatedTier = engine.calculateElementGrade(alt.element, context);
                            if (Math.abs(alt.tier - recalculatedTier) > 0.1) {
                                this.failures.push({
                                    iteration: i,
                                    note: note,
                                    alternative: alt.element,
                                    reportedTier: alt.tier,
                                    recalculatedTier: recalculatedTier,
                                    reason: 'Alternative tier does not match recalculated tier'
                                });
                            }
                        }
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during alternative context relevance test'
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
        const test1 = this.testAlternativeSuggestionForLowTierElements();
        const test2 = this.testChordAlternativeSuggestion();
        const test3 = this.testAlternativeSorting();
        const test4 = this.testAlternativeLimit();
        const test5 = this.testAlternativeContextRelevance();
        
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
                if (failure.chord) {
                    console.log(`   Chord: ${failure.chord}`);
                }
                if (failure.mode) {
                    console.log(`   Mode: ${failure.mode}`);
                }
                if (failure.alternative) {
                    console.log(`   Alternative: ${failure.alternative}`);
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
    module.exports = AlternativeSuggestionTest;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    window.PropertyTest8 = AlternativeSuggestionTest;
    
    // Function to run the test
    window.runAlternativeSuggestionTest = function() {
        const test = new AlternativeSuggestionTest('Alternative Suggestion Generation', 100);
        return test.run();
    };
    
    console.log('Property Test 8 loaded. Run with: runAlternativeSuggestionTest()');
}