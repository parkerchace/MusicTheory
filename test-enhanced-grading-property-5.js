/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 5: Accessibility Information Inclusion**
 * **Validates: Requirements 5.1, 5.2, 5.4**
 * 
 * Property 5: Accessibility Information Inclusion
 * For any grading display, the system should provide text labels, visual patterns, 
 * and screen reader compatible information in addition to color coding
 */

class AccessibilityInformationTest {
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

    // Test that accessibility information is always provided
    testAccessibilityInformationCompleteness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                const tier = this.generateRandomTier();
                
                engine.setGradingMode(mode);
                
                // Get accessibility information
                const accessibilityInfo = engine.getAccessibleGradingInfo(tier, { mode: mode });
                
                // Property: Accessibility info must always be provided
                if (!accessibilityInfo || typeof accessibilityInfo !== 'object') {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing accessibility information object'
                    });
                    continue;
                }
                
                // Property: Must include visual pattern (beyond color)
                if (!accessibilityInfo.pattern || typeof accessibilityInfo.pattern !== 'string') {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing or invalid visual pattern for accessibility'
                    });
                }
                
                // Property: Must include shape information
                if (!accessibilityInfo.shape || typeof accessibilityInfo.shape !== 'string') {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing or invalid shape information for accessibility'
                    });
                }
                
                // Property: Must include screen reader text
                if (!accessibilityInfo.screenReaderText || 
                    typeof accessibilityInfo.screenReaderText !== 'string' ||
                    accessibilityInfo.screenReaderText.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing or empty screen reader text'
                    });
                }
                
                // Property: Must include text label
                if (!accessibilityInfo.textLabel || 
                    typeof accessibilityInfo.textLabel !== 'string' ||
                    accessibilityInfo.textLabel.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing or empty text label'
                    });
                }
                
                // Property: Must include high contrast color
                if (!accessibilityInfo.highContrastColor || 
                    typeof accessibilityInfo.highContrastColor !== 'string' ||
                    !accessibilityInfo.highContrastColor.match(/^#[0-9A-Fa-f]{6}$/)) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        accessibilityInfo: accessibilityInfo,
                        reason: 'Missing or invalid high contrast color (should be hex format)'
                    });
                }
                
                // Property: Must include audio cue description
                if (!accessibilityInfo.audioCue || 
                    typeof accessibilityInfo.audioCue !== 'string' ||
                    accessibilityInfo.audioCue.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Missing or empty audio cue description'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during accessibility information test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that tier info includes accessibility information
    testTierInfoAccessibilityIntegration() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                const tier = this.generateRandomTier();
                
                engine.setGradingMode(mode);
                
                const tierInfo = engine.getGradingTierInfo(tier);
                
                // Property: Tier info must include accessibility information
                if (!tierInfo.accessibilityInfo || typeof tierInfo.accessibilityInfo !== 'object') {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        reason: 'Tier info missing accessibility information'
                    });
                    continue;
                }
                
                // Property: Accessibility info should be consistent with standalone call
                const standaloneAccessibility = engine.getAccessibleGradingInfo(tier, { mode: mode });
                
                const accessibilityFields = ['pattern', 'shape', 'screenReaderText', 'textLabel', 'highContrastColor', 'audioCue'];
                for (const field of accessibilityFields) {
                    if (tierInfo.accessibilityInfo[field] !== standaloneAccessibility[field]) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier: tier,
                            field: field,
                            tierValue: tierInfo.accessibilityInfo[field],
                            standaloneValue: standaloneAccessibility[field],
                            reason: `Inconsistent accessibility ${field} between tier info and standalone call`
                        });
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during tier info accessibility integration test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that different tiers have distinct accessibility markers
    testAccessibilityDistinctiveness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                // Get accessibility info for all tiers
                const tierAccessibility = [];
                for (let tier = 0; tier <= 4; tier++) {
                    tierAccessibility.push({
                        tier: tier,
                        info: engine.getAccessibleGradingInfo(tier, { mode: mode })
                    });
                }
                
                // Property: Each tier should have distinct visual patterns
                const patterns = tierAccessibility.map(t => t.info.pattern);
                const uniquePatterns = new Set(patterns);
                if (uniquePatterns.size !== patterns.length) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        patterns: patterns,
                        reason: 'Non-unique visual patterns across tiers'
                    });
                }
                
                // Property: Each tier should have distinct shapes
                const shapes = tierAccessibility.map(t => t.info.shape);
                const uniqueShapes = new Set(shapes);
                if (uniqueShapes.size !== shapes.length) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        shapes: shapes,
                        reason: 'Non-unique shapes across tiers'
                    });
                }
                
                // Property: Each tier should have distinct high contrast colors
                const colors = tierAccessibility.map(t => t.info.highContrastColor);
                const uniqueColors = new Set(colors);
                if (uniqueColors.size !== colors.length) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        colors: colors,
                        reason: 'Non-unique high contrast colors across tiers'
                    });
                }
                
                // Property: Screen reader text should be distinct and meaningful
                const screenReaderTexts = tierAccessibility.map(t => t.info.screenReaderText);
                const uniqueScreenReaderTexts = new Set(screenReaderTexts);
                if (uniqueScreenReaderTexts.size !== screenReaderTexts.length) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        screenReaderTexts: screenReaderTexts,
                        reason: 'Non-unique screen reader texts across tiers'
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during accessibility distinctiveness test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that accessibility information is mode-appropriate
    testAccessibilityModeAppropriateness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                const tier = this.generateRandomTier();
                
                engine.setGradingMode(mode);
                
                const accessibilityInfo = engine.getAccessibleGradingInfo(tier, { mode: mode });
                
                // Property: Screen reader text should mention the grading mode context
                const screenReaderText = accessibilityInfo.screenReaderText.toLowerCase();
                
                // Check for mode-appropriate terminology
                const modeKeywords = {
                    functional: ['grade', 'function', 'harmonic'],
                    emotional: ['grade', 'emotion', 'mood', 'feeling'],
                    color: ['grade', 'color', 'quality']
                };
                
                const keywords = modeKeywords[mode] || [];
                const hasRelevantKeyword = keywords.some(keyword => 
                    screenReaderText.includes(keyword.toLowerCase())
                );
                
                if (!hasRelevantKeyword) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        screenReaderText: accessibilityInfo.screenReaderText,
                        reason: `Screen reader text lacks ${mode}-specific terminology`
                    });
                }
                
                // Property: Audio cue should be appropriate for tier level
                const audioCue = accessibilityInfo.audioCue.toLowerCase();
                const tierLevelWords = {
                    0: ['low', 'bass', 'dark', 'muted'],
                    1: ['muted', 'soft', 'quiet'],
                    2: ['neutral', 'balanced', 'medium'],
                    3: ['bright', 'clear', 'pleasant'],
                    4: ['high', 'triumphant', 'brilliant', 'fanfare']
                };
                
                const expectedWords = tierLevelWords[tier] || [];
                const hasAppropriateAudioDescription = expectedWords.some(word => 
                    audioCue.includes(word.toLowerCase())
                );
                
                if (!hasAppropriateAudioDescription) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        tier: tier,
                        audioCue: accessibilityInfo.audioCue,
                        expectedWords: expectedWords,
                        reason: `Audio cue description not appropriate for tier ${tier}`
                    });
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during accessibility mode appropriateness test'
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
        const test1 = this.testAccessibilityInformationCompleteness();
        const test2 = this.testTierInfoAccessibilityIntegration();
        const test3 = this.testAccessibilityDistinctiveness();
        const test4 = this.testAccessibilityModeAppropriateness();
        
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
    module.exports = AccessibilityInformationTest;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    window.PropertyTest5 = AccessibilityInformationTest;
    
    // Function to run the test
    window.runAccessibilityInformationTest = function() {
        const test = new AccessibilityInformationTest('Accessibility Information Inclusion', 100);
        return test.run();
    };
    
    console.log('Property Test 5 loaded. Run with: runAccessibilityInformationTest()');
}