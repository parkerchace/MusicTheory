/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 6: Interactive Grading Feedback**
 * **Validates: Requirements 4.1, 4.3**
 * 
 * Property 6: Interactive Grading Feedback
 * For any user interaction with graded elements, the system should provide 
 * grading-aware feedback and highlight related elements according to their 
 * grading tier relationships
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

    generateRandomMidiNote() {
        return Math.floor(Math.random() * 88) + 21; // Piano range A0 to C8
    }

    // Test interactive grading feedback
    testInteractiveGradingFeedback() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                // Generate random test data
                const clickedNote = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                const midiNote = this.generateRandomMidiNote();
                
                // Set grading mode
                engine.setGradingMode(mode);
                
                // Create a piano visualizer instance for testing
                const piano = new PianoVisualizer({
                    startMidi: 60,
                    endMidi: 72,
                    container: null
                });
                
                // Set up scale context
                const scaleNotes = engine.getScaleNotes(key, scale);
                piano.renderScale({
                    key: key,
                    scale: scale,
                    notes: scaleNotes
                });
                
                // Simulate note click interaction
                const clickContext = {
                    note: clickedNote,
                    midi: midiNote,
                    key: key,
                    scale: scale,
                    mode: mode
                };
                
                // Get grading information for clicked note
                const clickedTier = engine.calculateElementGrade(clickedNote, {
                    elementType: 'note',
                    key: key,
                    scaleType: scale
                });
                
                const clickedGradingInfo = engine.getGradingTierInfo(clickedTier);
                
                // Property: Clicked note should receive grading-aware feedback
                if (!clickedGradingInfo || typeof clickedGradingInfo.tier !== 'number') {
                    this.failures.push({
                        iteration: i,
                        clickedNote: clickedNote,
                        key: key,
                        scale: scale,
                        mode: mode,
                        reason: 'Clicked note did not receive grading information'
                    });
                }
                
                // Property: Grading feedback should include educational context
                if (!clickedGradingInfo.educationalContext || 
                    typeof clickedGradingInfo.educationalContext !== 'string') {
                    this.failures.push({
                        iteration: i,
                        clickedNote: clickedNote,
                        key: key,
                        scale: scale,
                        mode: mode,
                        reason: 'Grading feedback missing educational context'
                    });
                }
                
                // Property: Grading feedback should include accessibility information
                if (!clickedGradingInfo.accessibilityInfo ||
                    !clickedGradingInfo.accessibilityInfo.screenReaderText ||
                    !clickedGradingInfo.accessibilityInfo.pattern) {
                    this.failures.push({
                        iteration: i,
                        clickedNote: clickedNote,
                        key: key,
                        scale: scale,
                        mode: mode,
                        reason: 'Grading feedback missing accessibility information'
                    });
                }
                
                // Test related note highlighting based on grading tier relationships
                const relatedNotes = scaleNotes.filter(note => note !== clickedNote);
                const relatedGradingInfo = relatedNotes.map(note => ({
                    note: note,
                    tier: engine.calculateElementGrade(note, {
                        elementType: 'note',
                        key: key,
                        scaleType: scale
                    })
                }));
                
                // Property: Related notes with same tier should be highlighted similarly
                const sameTierNotes = relatedGradingInfo.filter(info => info.tier === clickedTier);
                sameTierNotes.forEach(noteInfo => {
                    const relatedInfo = engine.getGradingTierInfo(noteInfo.tier);
                    
                    // Should have same visual properties as clicked note
                    if (relatedInfo.color !== clickedGradingInfo.color ||
                        relatedInfo.label !== clickedGradingInfo.label) {
                        this.failures.push({
                            iteration: i,
                            clickedNote: clickedNote,
                            relatedNote: noteInfo.note,
                            key: key,
                            scale: scale,
                            mode: mode,
                            reason: 'Related notes with same tier have different visual properties'
                        });
                    }
                });
                
                // Property: Higher tier notes should be visually distinguished from lower tier notes
                const higherTierNotes = relatedGradingInfo.filter(info => info.tier > clickedTier);
                const lowerTierNotes = relatedGradingInfo.filter(info => info.tier < clickedTier);
                
                higherTierNotes.forEach(noteInfo => {
                    const higherInfo = engine.getGradingTierInfo(noteInfo.tier);
                    
                    // Should be visually distinct from clicked note
                    if (higherInfo.color === clickedGradingInfo.color &&
                        higherInfo.label === clickedGradingInfo.label) {
                        this.failures.push({
                            iteration: i,
                            clickedNote: clickedNote,
                            higherTierNote: noteInfo.note,
                            clickedTier: clickedTier,
                            higherTier: noteInfo.tier,
                            key: key,
                            scale: scale,
                            mode: mode,
                            reason: 'Higher tier note not visually distinguished from lower tier'
                        });
                    }
                });
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during interactive grading feedback test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test grading-aware highlighting patterns
    testGradingAwareHighlighting() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const note = this.generateRandomNote();
                const key = this.generateRandomKey();
                const scale = this.generateRandomScale();
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                // Get scale notes and their grading tiers
                const scaleNotes = engine.getScaleNotes(key, scale);
                const noteGradings = scaleNotes.map(scaleNote => ({
                    note: scaleNote,
                    tier: engine.calculateElementGrade(scaleNote, {
                        elementType: 'note',
                        key: key,
                        scaleType: scale
                    })
                }));
                
                // Property: Notes should be grouped by tier for highlighting
                const tierGroups = {};
                noteGradings.forEach(noteGrading => {
                    if (!tierGroups[noteGrading.tier]) {
                        tierGroups[noteGrading.tier] = [];
                    }
                    tierGroups[noteGrading.tier].push(noteGrading.note);
                });
                
                // Property: Each tier group should have consistent visual properties
                Object.entries(tierGroups).forEach(([tier, notes]) => {
                    const tierNum = parseInt(tier);
                    const tierInfo = engine.getGradingTierInfo(tierNum);
                    
                    if (!tierInfo || !tierInfo.color || !tierInfo.label) {
                        this.failures.push({
                            iteration: i,
                            tier: tierNum,
                            notes: notes,
                            key: key,
                            scale: scale,
                            mode: mode,
                            reason: 'Tier group missing visual properties'
                        });
                    }
                    
                    // Property: Accessibility info should be available for each tier
                    if (!tierInfo.accessibilityInfo ||
                        !tierInfo.accessibilityInfo.pattern ||
                        !tierInfo.accessibilityInfo.highContrastColor) {
                        this.failures.push({
                            iteration: i,
                            tier: tierNum,
                            notes: notes,
                            key: key,
                            scale: scale,
                            mode: mode,
                            reason: 'Tier group missing accessibility information'
                        });
                    }
                });
                
                // Property: Tier progression should be logically ordered
                const tiers = Object.keys(tierGroups).map(t => parseInt(t)).sort((a, b) => a - b);
                for (let j = 0; j < tiers.length - 1; j++) {
                    const currentTier = tiers[j];
                    const nextTier = tiers[j + 1];
                    
                    if (nextTier !== currentTier + 1 && nextTier - currentTier > 2) {
                        // Allow gaps of 1-2 tiers, but not larger gaps
                        this.failures.push({
                            iteration: i,
                            currentTier: currentTier,
                            nextTier: nextTier,
                            key: key,
                            scale: scale,
                            mode: mode,
                            reason: 'Tier progression has unexpected large gaps'
                        });
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during grading-aware highlighting test'
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
        const test1 = this.testInteractiveGradingFeedback();
        const test2 = this.testGradingAwareHighlighting();
        
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
    window.PropertyTest6 = PropertyTest;
    
    // Function to run the test
    window.runInteractiveGradingFeedbackTest = function() {
        const test = new PropertyTest('Interactive Grading Feedback', 100);
        return test.run();
    };
    
    console.log('Property Test 6 loaded. Run with: runInteractiveGradingFeedbackTest()');
}