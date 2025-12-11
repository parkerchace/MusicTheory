/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 1: Cross-Module Visual Consistency**
 * **Validates: Requirements 1.2, 1.3**
 * 
 * Property 1: Cross-Module Visual Consistency
 * For any musical element displayed in multiple modules simultaneously, 
 * all modules should use identical grading colors and visual indicators 
 * for the same grading tier
 */

// Simple property-based testing framework for browser environment
class PropertyTest {
    constructor(name, iterations = 100) {
        this.name = name;
        this.iterations = iterations;
        this.failures = [];
    }

    // Generate random musical elements
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

    // Test cross-module visual consistency
    testCrossModuleVisualConsistency() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                // Generate random test data
                const note = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                
                // Set grading mode
                engine.setGradingMode(mode);
                
                // Calculate grading for the same element in different contexts
                const context1 = { elementType: 'note', key: key, scaleType: scale };
                const context2 = { elementType: 'note', key: key, scaleType: scale };
                
                const tier1 = engine.calculateElementGrade(note, context1);
                const tier2 = engine.calculateElementGrade(note, context2);
                
                // Get grading info for both contexts
                const info1 = engine.getGradingTierInfo(tier1, context1);
                const info2 = engine.getGradingTierInfo(tier2, context2);
                
                // Property: Same element should get same grading tier and visual info
                if (tier1 !== tier2) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        tier1: tier1,
                        tier2: tier2,
                        reason: 'Different tiers for same element in same context'
                    });
                }
                
                // Property: Same tier should have consistent visual properties
                if (info1.color !== info2.color || info1.label !== info2.label) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        info1: info1,
                        info2: info2,
                        reason: 'Inconsistent visual properties for same tier'
                    });
                }
                
                // Property: Accessibility info should be consistent
                if (info1.accessibilityInfo.pattern !== info2.accessibilityInfo.pattern ||
                    info1.accessibilityInfo.screenReaderText !== info2.accessibilityInfo.screenReaderText) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        reason: 'Inconsistent accessibility information'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during test execution'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test grading consistency across different modules
    testModuleGradingConsistency() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const note = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                // Simulate different modules requesting grading for same element
                const pianoContext = { elementType: 'note', key: key, scaleType: scale, module: 'piano' };
                const scaleContext = { elementType: 'note', key: key, scaleType: scale, module: 'scale' };
                const chordContext = { elementType: 'note', key: key, scaleType: scale, module: 'chord' };
                
                const pianoTier = engine.calculateElementGrade(note, pianoContext);
                const scaleTier = engine.calculateElementGrade(note, scaleContext);
                const chordTier = engine.calculateElementGrade(note, chordContext);
                
                // Property: All modules should get same tier for same element
                if (pianoTier !== scaleTier || scaleTier !== chordTier) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        pianoTier: pianoTier,
                        scaleTier: scaleTier,
                        chordTier: chordTier,
                        reason: 'Different modules got different tiers for same element'
                    });
                }
                
                // Property: Visual indicators should be identical across modules
                const pianoInfo = engine.getGradingTierInfo(pianoTier);
                const scaleInfo = engine.getGradingTierInfo(scaleTier);
                const chordInfo = engine.getGradingTierInfo(chordTier);
                
                if (pianoInfo.color !== scaleInfo.color || 
                    scaleInfo.color !== chordInfo.color ||
                    pianoInfo.label !== scaleInfo.label ||
                    scaleInfo.label !== chordInfo.label) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        key: key,
                        scale: scale,
                        mode: mode,
                        reason: 'Visual indicators inconsistent across modules'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during module consistency test'
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
        const test1 = this.testCrossModuleVisualConsistency();
        const test2 = this.testModuleGradingConsistency();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const passed = test1 && test2;
        
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
    module.exports = PropertyTest;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    window.PropertyTest1 = PropertyTest;
    
    // Function to run the test
    window.runGradingConsistencyTest = function() {
        const test = new PropertyTest('Cross-Module Visual Consistency', 100);
        return test.run();
    };
    
    console.log('Property Test 1 loaded. Run with: runGradingConsistencyTest()');
}