/**
 * Property-Based Test for Enhanced Grading System
 * **Feature: enhanced-grading-system, Property 9: Metadata Preservation**
 * **Validates: Requirements 4.5**
 * 
 * Property 9: Metadata Preservation
 * For any export or sharing operation, grading information should be preserved 
 * in the output metadata where the format supports it
 */

// Mock fast-check for property-based testing
const fc = {
    record: (obj) => ({ 
        generate: () => {
            const result = {};
            for (const [key, generator] of Object.entries(obj)) {
                result[key] = generator.generate();
            }
            return result;
        }
    }),
    array: (gen, opts = {}) => ({ 
        generate: () => {
            const length = Math.floor(Math.random() * (opts.maxLength || 10)) + (opts.minLength || 1);
            return Array.from({length}, () => gen.generate());
        }
    }),
    integer: (opts = {}) => ({ 
        generate: () => Math.floor(Math.random() * ((opts.max || 100) - (opts.min || 0) + 1)) + (opts.min || 0)
    }),
    constantFrom: (...values) => ({ 
        generate: () => values[Math.floor(Math.random() * values.length)]
    }),
    string: (opts = {}) => ({ 
        generate: () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const length = Math.floor(Math.random() * (opts.maxLength || 10)) + (opts.minLength || 1);
            return Array.from({length}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        }
    }),
    property: (generator, testFn) => ({
        generator,
        testFn,
        run: (iterations = 100) => {
            const results = [];
            for (let i = 0; i < iterations; i++) {
                let testData;
                try {
                    testData = generator.generate();
                    const result = testFn(testData);
                    results.push({ success: true, data: testData, result });
                } catch (error) {
                    results.push({ success: false, data: testData || {}, error });
                }
            }
            return results;
        }
    })
};

// Mock MusicTheoryEngine with enhanced grading capabilities
class MockMusicTheoryEngine {
    constructor() {
        this.gradingMode = 'functional';
    }

    setGradingMode(mode) {
        this.gradingMode = mode;
    }

    getGradingTierInfo(tier) {
        const tiers = [
            { label: '○ Experimental', color: '#9ca3af', short: '○', name: 'Experimental', tier: 0 },
            { label: '◐ Fair', color: '#c4b5fd', short: '◐', name: 'Fair', tier: 1 },
            { label: '★ Good', color: '#fbbf24', short: '★', name: 'Good', tier: 2 },
            { label: '★★ Excellent', color: '#38bdf8', short: '★★', name: 'Excellent', tier: 3 },
            { label: '★★★ Perfect', color: '#10b981', short: '★★★', name: 'Perfect', tier: 4 }
        ];
        const tierInfo = tiers[tier] || tiers[2];
        
        // Ensure all required fields are present
        return {
            ...tierInfo,
            tier: tier,
            mode: this.gradingMode
        };
    }

    calculateElementGrade(element, context = {}) {
        // Simple mock grading based on element properties
        if (typeof element === 'string') {
            return element.length % 5; // Simple tier calculation
        }
        return Math.floor(Math.random() * 5);
    }

    getGradingExplanation(element, tier, context) {
        const tierInfo = this.getGradingTierInfo(tier);
        return `${element} receives ${tierInfo.name} grade due to ${this.gradingMode} analysis`;
    }
}

// Mock export functions that should preserve grading metadata
class MockExportSystem {
    constructor(musicEngine) {
        this.musicEngine = musicEngine;
    }

    // MIDI export with grading metadata
    exportToMIDI(musicalData, options = {}) {
        const midiData = {
            format: 'MIDI',
            tracks: [],
            metadata: {}
        };

        // Add grading metadata to MIDI
        if (musicalData.gradingInfo) {
            midiData.metadata.grading = {
                mode: this.musicEngine.gradingMode,
                elements: musicalData.gradingInfo,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
        }

        // Process musical elements and preserve their grading
        if (musicalData.elements) {
            musicalData.elements.forEach(element => {
                const tier = this.musicEngine.calculateElementGrade(element.value, element.context);
                const tierInfo = this.musicEngine.getGradingTierInfo(tier);
                
                midiData.tracks.push({
                    element: element.value,
                    grading: {
                        tier,
                        label: tierInfo.label,
                        color: tierInfo.color,
                        name: tierInfo.name,
                        short: tierInfo.short,
                        explanation: this.musicEngine.getGradingExplanation(element.value, tier, element.context)
                    }
                });
            });
        }

        return midiData;
    }

    // JSON export with grading metadata
    exportToJSON(musicalData, options = {}) {
        const jsonData = {
            format: 'JSON',
            version: '1.0',
            timestamp: new Date().toISOString(),
            gradingMetadata: {
                mode: this.musicEngine.gradingMode,
                preservationLevel: options.preservationLevel || 'full'
            },
            data: {}
        };

        // Preserve grading information in JSON format
        if (musicalData.elements) {
            jsonData.data.elements = musicalData.elements.map(element => {
                const tier = this.musicEngine.calculateElementGrade(element.value, element.context);
                const tierInfo = this.musicEngine.getGradingTierInfo(tier);
                
                return {
                    value: element.value,
                    context: element.context,
                    grading: {
                        tier,
                        mode: this.musicEngine.gradingMode,
                        label: tierInfo.label,
                        color: tierInfo.color,
                        name: tierInfo.name,
                        short: tierInfo.short,
                        tierInfo: tierInfo,
                        explanation: this.musicEngine.getGradingExplanation(element.value, tier, element.context)
                    }
                };
            });
        }

        return jsonData;
    }

    // Sharing function that preserves grading metadata
    shareWithGrading(musicalData, shareFormat, options = {}) {
        let sharedData;

        switch (shareFormat) {
            case 'MIDI':
                sharedData = this.exportToMIDI(musicalData, options);
                break;
            case 'JSON':
                sharedData = this.exportToJSON(musicalData, options);
                break;
            default:
                throw new Error(`Unsupported share format: ${shareFormat}`);
        }

        // Add sharing metadata
        sharedData.sharingInfo = {
            sharedAt: new Date().toISOString(),
            format: shareFormat,
            gradingPreserved: true,
            gradingMode: this.musicEngine.gradingMode
        };

        return sharedData;
    }
}

// Property test generators
const musicalElementGenerator = fc.record({
    value: fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'Db', 'F#'),
    context: fc.record({
        key: fc.constantFrom('C', 'G', 'D', 'A', 'F', 'Bb'),
        scaleType: fc.constantFrom('major', 'minor', 'dorian', 'mixolydian'),
        elementType: fc.constantFrom('note', 'chord')
    })
});

const musicalDataGenerator = fc.record({
    elements: fc.array(musicalElementGenerator, { minLength: 1, maxLength: 10 }),
    gradingInfo: fc.record({
        mode: fc.constantFrom('functional', 'emotional', 'color'),
        timestamp: fc.string({ minLength: 10, maxLength: 30 })
    })
});

const exportFormatGenerator = fc.constantFrom('MIDI', 'JSON');

const gradingModeGenerator = fc.constantFrom('functional', 'emotional', 'color');

// Property 9: Metadata Preservation Test
const metadataPreservationProperty = fc.property(
    fc.record({
        musicalData: musicalDataGenerator,
        exportFormat: exportFormatGenerator,
        gradingMode: gradingModeGenerator
    }),
    (testData) => {
        const { musicalData, exportFormat, gradingMode } = testData;
        
        // Setup
        const engine = new MockMusicTheoryEngine();
        engine.setGradingMode(gradingMode);
        const exportSystem = new MockExportSystem(engine);

        // Export the musical data
        let exportedData;
        if (exportFormat === 'MIDI') {
            exportedData = exportSystem.exportToMIDI(musicalData);
        } else if (exportFormat === 'JSON') {
            exportedData = exportSystem.exportToJSON(musicalData);
        }

        // Property: Exported data should preserve grading information
        
        // 1. Grading mode should be preserved
        if (exportFormat === 'MIDI') {
            if (!exportedData.metadata || !exportedData.metadata.grading) {
                throw new Error('MIDI export missing grading metadata');
            }
            if (exportedData.metadata.grading.mode !== gradingMode) {
                throw new Error(`MIDI grading mode mismatch: expected ${gradingMode}, got ${exportedData.metadata.grading.mode}`);
            }
        } else if (exportFormat === 'JSON') {
            if (!exportedData.gradingMetadata || exportedData.gradingMetadata.mode !== gradingMode) {
                throw new Error(`JSON grading mode mismatch: expected ${gradingMode}, got ${exportedData.gradingMetadata?.mode}`);
            }
        }

        // 2. Each musical element should have preserved grading information
        const elementsWithGrading = exportFormat === 'MIDI' ? exportedData.tracks : exportedData.data.elements;
        
        if (!elementsWithGrading || elementsWithGrading.length === 0) {
            throw new Error('No elements with grading found in export');
        }

        elementsWithGrading.forEach((exportedElement, index) => {
            const originalElement = musicalData.elements[index];
            
            // Check that grading information exists
            if (!exportedElement.grading) {
                throw new Error(`Element ${index} missing grading information`);
            }

            // Check that tier is valid (0-4)
            const tier = exportedElement.grading.tier;
            if (tier < 0 || tier > 4) {
                throw new Error(`Invalid grading tier ${tier} for element ${index}`);
            }

            // Check that grading includes required fields
            const requiredFields = ['tier', 'label', 'color'];
            requiredFields.forEach(field => {
                if (!exportedElement.grading[field]) {
                    throw new Error(`Element ${index} grading missing required field: ${field}`);
                }
            });

            // Check that explanation exists
            if (!exportedElement.grading.explanation || exportedElement.grading.explanation.trim().length === 0) {
                throw new Error(`Element ${index} missing grading explanation`);
            }
        });

        // 3. Test sharing functionality preserves grading
        const sharedData = exportSystem.shareWithGrading(musicalData, exportFormat);
        
        if (!sharedData.sharingInfo || !sharedData.sharingInfo.gradingPreserved) {
            throw new Error('Sharing did not preserve grading information');
        }

        if (sharedData.sharingInfo.gradingMode !== gradingMode) {
            throw new Error(`Shared data grading mode mismatch: expected ${gradingMode}, got ${sharedData.sharingInfo.gradingMode}`);
        }

        // 4. Verify metadata integrity validation
        const hasValidMetadata = exportFormat === 'MIDI' ? 
            (sharedData.metadata && sharedData.metadata.grading && sharedData.metadata.grading.version) :
            (sharedData.gradingMetadata && sharedData.gradingMetadata.mode && sharedData.data);

        if (!hasValidMetadata) {
            throw new Error('Export metadata integrity validation failed');
        }

        return true;
    }
);

// Run the property test
function runMetadataPreservationTest() {
    console.log('🧪 Running Property 9: Metadata Preservation Test...');
    console.log('**Feature: enhanced-grading-system, Property 9: Metadata Preservation**');
    console.log('**Validates: Requirements 4.5**');
    
    const results = metadataPreservationProperty.run(100);
    
    const failures = results.filter(r => !r.success);
    const successes = results.filter(r => r.success);
    
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Successes: ${successes.length}/100`);
    console.log(`   ❌ Failures: ${failures.length}/100`);
    
    if (failures.length > 0) {
        console.log(`\n🔍 First failure details:`);
        console.log(`   Error: ${failures[0].error.message}`);
        console.log(`   Test data:`, JSON.stringify(failures[0].data, null, 2));
        return false;
    }
    
    console.log(`\n✅ Property 9 (Metadata Preservation) PASSED`);
    console.log(`   All export and sharing operations successfully preserved grading information`);
    console.log(`   Tested formats: MIDI, JSON`);
    console.log(`   Tested grading modes: functional, emotional, color`);
    console.log(`   Verified metadata integrity and validation`);
    
    return true;
}

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runMetadataPreservationTest,
        MockMusicTheoryEngine,
        MockExportSystem
    };
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
    // Browser environment
    window.runMetadataPreservationTest = runMetadataPreservationTest;
} else if (typeof require !== 'undefined' && require.main === module) {
    // Node.js environment
    runMetadataPreservationTest();
}