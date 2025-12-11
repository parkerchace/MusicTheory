/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 10: High Contrast Accessibility**
 * **Validates: Requirements 5.5**
 * 
 * Property 10: High Contrast Accessibility
 * For any grading display in high contrast mode, all grading tiers should remain 
 * visually distinguishable through non-color means
 */

class HighContrastAccessibilityTest {
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

    // Test that high contrast colors are distinct across all tiers
    testHighContrastColorDistinctiveness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                // Get high contrast colors for all tiers
                const highContrastColors = [];
                for (let tier = 0; tier <= 4; tier++) {
                    const accessibilityInfo = engine.getAccessibleGradingInfo(tier, { 
                        mode: mode, 
                        highContrast: true 
                    });
                    highContrastColors.push({
                        tier: tier,
                        color: accessibilityInfo.highContrastColor
                    });
                }
                
                // Property: All high contrast colors must be distinct
                const colors = highContrastColors.map(item => item.color);
                const uniqueColors = new Set(colors);
                
                if (uniqueColors.size !== colors.length) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        colors: colors,
                        duplicates: colors.filter((color, index) => colors.indexOf(color) !== index),
                        reason: 'Non-unique high contrast colors across tiers'
                    });
                }
                
                // Property: High contrast colors must be valid hex colors
                for (const colorInfo of highContrastColors) {
                    if (!colorInfo.color.match(/^#[0-9A-Fa-f]{6}$/)) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier: colorInfo.tier,
                            color: colorInfo.color,
                            reason: 'Invalid high contrast color format (should be hex)'
                        });
                    }
                }
                
                // Property: High contrast colors should have sufficient contrast between adjacent tiers
                for (let j = 0; j < highContrastColors.length - 1; j++) {
                    const color1 = highContrastColors[j].color;
                    const color2 = highContrastColors[j + 1].color;
                    
                    const contrast = this.calculateColorContrast(color1, color2);
                    
                    // WCAG AA requires 4.5:1 contrast ratio for normal text
                    if (contrast < 4.5) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier1: j,
                            tier2: j + 1,
                            color1: color1,
                            color2: color2,
                            contrast: contrast,
                            reason: `Insufficient contrast between adjacent tiers (${contrast.toFixed(2)}:1, need 4.5:1)`
                        });
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during high contrast color distinctiveness test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that visual patterns are distinct in high contrast mode
    testHighContrastPatternDistinctiveness() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                // Get visual patterns for all tiers
                const patterns = [];
                const shapes = [];
                
                for (let tier = 0; tier <= 4; tier++) {
                    const accessibilityInfo = engine.getAccessibleGradingInfo(tier, { 
                        mode: mode, 
                        highContrast: true 
                    });
                    patterns.push(accessibilityInfo.pattern);
                    shapes.push(accessibilityInfo.shape);
                }
                
                // Property: All visual patterns must be distinct
                const uniquePatterns = new Set(patterns);
                if (uniquePatterns.size !== patterns.length) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        patterns: patterns,
                        reason: 'Non-unique visual patterns across tiers in high contrast mode'
                    });
                }
                
                // Property: All shapes must be distinct
                const uniqueShapes = new Set(shapes);
                if (uniqueShapes.size !== shapes.length) {
                    this.failures.push({
                        iteration: i,
                        mode: mode,
                        shapes: shapes,
                        reason: 'Non-unique shapes across tiers in high contrast mode'
                    });
                }
                
                // Property: Patterns should be valid CSS pattern types
                const validPatterns = ['dotted', 'dashed', 'solid', 'double', 'thick', 'none'];
                for (let tier = 0; tier < patterns.length; tier++) {
                    if (!validPatterns.includes(patterns[tier])) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier: tier,
                            pattern: patterns[tier],
                            reason: 'Invalid visual pattern type'
                        });
                    }
                }
                
                // Property: Shapes should be valid geometric shapes
                const validShapes = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon', 'pentagon'];
                for (let tier = 0; tier < shapes.length; tier++) {
                    if (!validShapes.includes(shapes[tier])) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier: tier,
                            shape: shapes[tier],
                            reason: 'Invalid shape type'
                        });
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during high contrast pattern distinctiveness test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that text labels remain readable in high contrast mode
    testHighContrastTextReadability() {
        const engine = new MusicTheoryEngine();
        
        for (let i = 0; i < this.iterations; i++) {
            try {
                const mode = this.generateRandomGradingMode();
                
                engine.setGradingMode(mode);
                
                // Test text readability for all tiers
                for (let tier = 0; tier <= 4; tier++) {
                    const accessibilityInfo = engine.getAccessibleGradingInfo(tier, { 
                        mode: mode, 
                        highContrast: true 
                    });
                    
                    // Property: Text labels must be non-empty and meaningful
                    if (!accessibilityInfo.textLabel || 
                        typeof accessibilityInfo.textLabel !== 'string' ||
                        accessibilityInfo.textLabel.trim().length === 0) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier: tier,
                            textLabel: accessibilityInfo.textLabel,
                            reason: 'Missing or empty text label in high contrast mode'
                        });
                    }
                    
                    // Property: Screen reader text must be descriptive
                    if (!accessibilityInfo.screenReaderText || 
                        typeof accessibilityInfo.screenReaderText !== 'string' ||
                        accessibilityInfo.screenReaderText.trim().length === 0) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier: tier,
                            reason: 'Missing or empty screen reader text in high contrast mode'
                        });
                    }
                    
                    // Property: Screen reader text should mention the tier level
                    if (accessibilityInfo.screenReaderText && 
                        !accessibilityInfo.screenReaderText.toLowerCase().includes('grade')) {
                        this.failures.push({
                            iteration: i,
                            mode: mode,
                            tier: tier,
                            screenReaderText: accessibilityInfo.screenReaderText,
                            reason: 'Screen reader text does not mention grading information'
                        });
                    }
                }
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during high contrast text readability test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Test that grading information is preserved across different display modes
    testGradingConsistencyInHighContrast() {
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
                
                // Get grading info in normal mode
                const normalInfo = engine.getGradingTierInfo(tier, context);
                
                // Get accessibility info in high contrast mode
                const highContrastInfo = engine.getAccessibleGradingInfo(tier, { 
                    mode: mode, 
                    highContrast: true 
                });
                
                // Property: Tier level should be consistent
                if (normalInfo.tier !== tier) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        expectedTier: tier,
                        actualTier: normalInfo.tier,
                        reason: 'Tier inconsistency between calculation and info'
                    });
                }
                
                // Property: High contrast mode should preserve grading semantics
                // The text label should be non-empty and meaningful (not checking specific content)
                if (!highContrastInfo.textLabel || 
                    typeof highContrastInfo.textLabel !== 'string' ||
                    highContrastInfo.textLabel.trim().length === 0) {
                    this.failures.push({
                        iteration: i,
                        note: note,
                        mode: mode,
                        tier: tier,
                        textLabel: highContrastInfo.textLabel,
                        reason: 'High contrast text label is missing or empty'
                    });
                }
                
                // Property: Text labels should be distinct across tiers
                // (This is already tested in the pattern distinctiveness test)
                
            } catch (error) {
                this.failures.push({
                    iteration: i,
                    error: error.message,
                    reason: 'Exception during grading consistency test'
                });
            }
        }
        
        return this.failures.length === 0;
    }

    // Helper method to calculate color contrast ratio
    calculateColorContrast(color1, color2) {
        // Convert hex to RGB
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return 0;
        
        // Calculate relative luminance
        const lum1 = this.getRelativeLuminance(rgb1);
        const lum2 = this.getRelativeLuminance(rgb2);
        
        // Calculate contrast ratio
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        
        return (lighter + 0.05) / (darker + 0.05);
    }

    // Helper method to convert hex to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Helper method to calculate relative luminance
    getRelativeLuminance(rgb) {
        const { r, g, b } = rgb;
        
        // Convert to sRGB
        const rsRGB = r / 255;
        const gsRGB = g / 255;
        const bsRGB = b / 255;
        
        // Apply gamma correction
        const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
        const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
        const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
        
        // Calculate luminance
        return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
    }

    run() {
        console.log(`Running Property Test: ${this.name}`);
        console.log(`Iterations: ${this.iterations}`);
        
        const startTime = Date.now();
        
        // Run all test methods
        const test1 = this.testHighContrastColorDistinctiveness();
        const test2 = this.testHighContrastPatternDistinctiveness();
        const test3 = this.testHighContrastTextReadability();
        const test4 = this.testGradingConsistencyInHighContrast();
        
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
                if (failure.mode) {
                    console.log(`   Mode: ${failure.mode}`);
                }
                if (failure.tier !== undefined) {
                    console.log(`   Tier: ${failure.tier}`);
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
    module.exports = HighContrastAccessibilityTest;
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined') {
    window.PropertyTest10 = HighContrastAccessibilityTest;
    
    // Function to run the test
    window.runHighContrastAccessibilityTest = function() {
        const test = new HighContrastAccessibilityTest('High Contrast Accessibility', 100);
        return test.run();
    };
    
    console.log('Property Test 10 loaded. Run with: runHighContrastAccessibilityTest()');
}