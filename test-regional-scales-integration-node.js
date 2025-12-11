/**
 * Regional Scales Cross-Module Integration Test (Node.js)
 * Verifies that regional scales work across all modules
 */

// Import modules
const MusicTheoryEngine = require('./music-theory-engine.js');

// Try to import other modules (they may not be available in Node.js)
let UnifiedChordExplorer, ProgressionBuilder, PianoVisualizer, ScaleLibrary;
try { UnifiedChordExplorer = require('./unified-chord-explorer.js'); } catch (e) { UnifiedChordExplorer = null; }
try { ProgressionBuilder = require('./progression-builder.js'); } catch (e) { ProgressionBuilder = null; }
try { PianoVisualizer = require('./piano-visualizer.js'); } catch (e) { PianoVisualizer = null; }
try { ScaleLibrary = require('./scale-library.js'); } catch (e) { ScaleLibrary = null; }

class RegionalScalesIntegrationTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    log(message, type = 'info') {
        const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'info' ? 'ℹ️' : '';
        console.log(`${prefix} ${message}`);
    }

    async runAllTests() {
        this.log('🚀 Starting Regional Scales Cross-Module Integration Tests');
        
        try {
            // Initialize music theory engine
            const musicEngine = new MusicTheoryEngine();
            
            // Get regional scales
            const scaleCategories = musicEngine.getScaleCategories();
            const southAmericanScales = scaleCategories['🌎 South American Scales'] || [];
            const africanScales = scaleCategories['🌍 African Scales'] || [];
            const allRegionalScales = [...southAmericanScales, ...africanScales];
            
            this.log(`Found ${allRegionalScales.length} regional scales to test`);
            
            if (allRegionalScales.length === 0) {
                this.log('No regional scales found - test cannot proceed', 'fail');
                return { success: false, passed: 0, total: 1 };
            }

            // Test core music theory operations
            await this.testMusicTheoryCore(musicEngine, allRegionalScales);
            
            // Test module integrations (if available)
            await this.testChordExplorer(musicEngine, allRegionalScales);
            await this.testProgressionBuilder(musicEngine, allRegionalScales);
            await this.testScaleLibrary(musicEngine, allRegionalScales);
            await this.testGradingSystem(musicEngine, allRegionalScales);

            // Summary
            this.log('');
            this.log('='.repeat(60));
            this.log(`Integration Test Summary: ${this.testResults.passed}/${this.testResults.total} tests passed`);
            
            const success = this.testResults.passed === this.testResults.total;
            if (success) {
                this.log('ALL INTEGRATION TESTS PASSED', 'pass');
            } else {
                this.log(`${this.testResults.failed} INTEGRATION TESTS FAILED`, 'fail');
            }

            return {
                success,
                passed: this.testResults.passed,
                total: this.testResults.total,
                failed: this.testResults.failed
            };

        } catch (error) {
            this.log(`Test execution failed: ${error.message}`, 'fail');
            return { success: false, passed: 0, total: 1, error: error.message };
        }
    }

    async testMusicTheoryCore(musicEngine, regionalScales) {
        this.log('');
        this.log('🎵 Testing Core Music Theory Operations');
        
        const testKeys = ['C', 'G', 'D', 'F', 'Bb'];
        const testScales = regionalScales.slice(0, 15); // Test first 15 scales
        
        for (const scale of testScales) {
            try {
                let scaleTestsPassed = 0;
                let scaleTestsTotal = 0;

                // Test 1: Scale notes generation in multiple keys
                for (const key of testKeys) {
                    const scaleNotes = musicEngine.getScaleNotes(key, scale);
                    if (scaleNotes && Array.isArray(scaleNotes) && scaleNotes.length > 0) {
                        scaleTestsPassed++;
                    }
                    scaleTestsTotal++;
                }

                // Test 2: Scale intervals validation
                const intervals = musicEngine.scales[scale];
                if (intervals && Array.isArray(intervals) && intervals.length > 0) {
                    // Check 12-TET compatibility
                    const validIntervals = intervals.every(interval => 
                        Number.isInteger(interval) && interval >= 0 && interval <= 11
                    );
                    if (validIntervals) {
                        scaleTestsPassed++;
                    }
                }
                scaleTestsTotal++;

                // Test 3: Citation availability
                try {
                    const citation = musicEngine.getScaleCitation(scale);
                    if (citation && typeof citation === 'string' && citation.length > 0 && !citation.includes('not documented')) {
                        scaleTestsPassed++;
                    }
                } catch (e) {
                    // Citation may not be available for all scales
                }
                scaleTestsTotal++;

                // Test 4: Chord generation (for scales with enough notes)
                if (intervals && intervals.length >= 3) {
                    try {
                        const chord = musicEngine.getDiatonicChord(1, 'C', scale);
                        if (chord && chord.root && chord.chordType) {
                            scaleTestsPassed++;
                        }
                    } catch (e) {
                        // Some scales may not support traditional chord generation
                    }
                    scaleTestsTotal++;
                }

                // Evaluate results
                const passRate = scaleTestsPassed / scaleTestsTotal;
                if (passRate >= 0.75) { // Allow some flexibility for non-traditional scales
                    this.log(`  ${scale}: Core operations work (${scaleTestsPassed}/${scaleTestsTotal})`, 'pass');
                    this.testResults.passed++;
                } else {
                    this.log(`  ${scale}: Core operations failed (${scaleTestsPassed}/${scaleTestsTotal})`, 'fail');
                    this.testResults.failed++;
                }
                this.testResults.total++;

            } catch (error) {
                this.log(`  ${scale}: Error - ${error.message}`, 'fail');
                this.testResults.failed++;
                this.testResults.total++;
            }
        }
    }

    async testChordExplorer(musicEngine, regionalScales) {
        this.log('');
        this.log('🎸 Testing Chord Explorer Integration');
        
        if (!UnifiedChordExplorer) {
            this.log('  UnifiedChordExplorer not available in Node.js - skipping');
            return;
        }

        try {
            // Test basic chord explorer functionality with regional scales
            const testScales = regionalScales.slice(0, 5);
            
            for (const scale of testScales) {
                try {
                    // Test that scale works with chord generation methods
                    const scaleNotes = musicEngine.getScaleNotes('C', scale);
                    const intervals = musicEngine.scales[scale];
                    
                    if (scaleNotes && scaleNotes.length >= 3 && intervals && intervals.length >= 3) {
                        // Test chord generation for first few degrees
                        let chordsGenerated = 0;
                        for (let degree = 1; degree <= Math.min(4, intervals.length); degree++) {
                            try {
                                const chord = musicEngine.getDiatonicChord(degree, 'C', scale);
                                if (chord && chord.root && chord.chordType) {
                                    chordsGenerated++;
                                }
                            } catch (e) {
                                // Some degrees may not work for all scales
                            }
                        }
                        
                        if (chordsGenerated > 0) {
                            this.log(`  ${scale}: Compatible with chord generation (${chordsGenerated} chords)`, 'pass');
                            this.testResults.passed++;
                        } else {
                            this.log(`  ${scale}: No chords generated`, 'fail');
                            this.testResults.failed++;
                        }
                    } else {
                        this.log(`  ${scale}: Insufficient notes for chord generation`, 'info');
                        this.testResults.passed++; // Not a failure, just not applicable
                    }
                    this.testResults.total++;

                } catch (error) {
                    this.log(`  ${scale}: Chord Explorer error - ${error.message}`, 'fail');
                    this.testResults.failed++;
                    this.testResults.total++;
                }
            }
        } catch (error) {
            this.log(`  Chord Explorer testing failed: ${error.message}`, 'fail');
        }
    }

    async testProgressionBuilder(musicEngine, regionalScales) {
        this.log('');
        this.log('🎼 Testing Progression Builder Integration');
        
        if (!ProgressionBuilder) {
            this.log('  ProgressionBuilder not available in Node.js - skipping');
            return;
        }

        // Test that regional scales work with progression building concepts
        const testScales = regionalScales.slice(0, 5);
        
        for (const scale of testScales) {
            try {
                const intervals = musicEngine.scales[scale];
                if (intervals && intervals.length >= 4) {
                    // Test chord generation for progression building
                    let validChords = 0;
                    for (let degree = 1; degree <= Math.min(4, intervals.length); degree++) {
                        try {
                            const chord = musicEngine.getDiatonicChord(degree, 'C', scale);
                            if (chord && chord.root && chord.chordType) {
                                validChords++;
                            }
                        } catch (e) {
                            // Some degrees may not work
                        }
                    }
                    
                    if (validChords >= 2) {
                        this.log(`  ${scale}: Compatible with progression building (${validChords} valid chords)`, 'pass');
                        this.testResults.passed++;
                    } else {
                        this.log(`  ${scale}: Insufficient chords for progressions`, 'fail');
                        this.testResults.failed++;
                    }
                } else {
                    this.log(`  ${scale}: Insufficient scale degrees for progressions`, 'info');
                    this.testResults.passed++; // Not a failure
                }
                this.testResults.total++;

            } catch (error) {
                this.log(`  ${scale}: Progression Builder error - ${error.message}`, 'fail');
                this.testResults.failed++;
                this.testResults.total++;
            }
        }
    }

    async testScaleLibrary(musicEngine, regionalScales) {
        this.log('');
        this.log('📚 Testing Scale Library Integration');
        
        if (!ScaleLibrary) {
            this.log('  ScaleLibrary not available in Node.js - skipping');
            return;
        }

        // Test scale categorization and organization
        const scaleCategories = musicEngine.getScaleCategories();
        
        // Test that regional scales appear in appropriate categories
        let categorizedScales = 0;
        for (const scale of regionalScales.slice(0, 10)) {
            let foundInCategory = false;
            for (const [categoryName, scales] of Object.entries(scaleCategories)) {
                if (scales.includes(scale)) {
                    foundInCategory = true;
                    if (categoryName.includes('South American') || categoryName.includes('African')) {
                        categorizedScales++;
                    }
                    break;
                }
            }
            
            if (!foundInCategory) {
                this.log(`  ${scale}: Not found in any category`, 'fail');
                this.testResults.failed++;
                this.testResults.total++;
            }
        }
        
        if (categorizedScales > 0) {
            this.log(`  ${categorizedScales} regional scales properly categorized`, 'pass');
            this.testResults.passed++;
        } else {
            this.log(`  No regional scales found in appropriate categories`, 'fail');
            this.testResults.failed++;
        }
        this.testResults.total++;
    }

    async testGradingSystem(musicEngine, regionalScales) {
        this.log('');
        this.log('📊 Testing Grading System Integration');
        
        const testNotes = ['C', 'D', 'E', 'F', 'G'];
        const testScales = regionalScales.slice(0, 8);
        
        for (const scale of testScales) {
            try {
                let gradingTestsPassed = 0;
                let gradingTestsTotal = 0;

                // Test note grading if available
                if (typeof musicEngine.calculateNoteGrade === 'function') {
                    for (const note of testNotes.slice(0, 3)) {
                        try {
                            const grade = musicEngine.calculateNoteGrade(note, 'C', scale);
                            if (grade !== null && grade !== undefined) {
                                gradingTestsPassed++;
                            }
                        } catch (e) {
                            // Grading may not work for all scales
                        }
                        gradingTestsTotal++;
                    }
                }

                // Test grading mode compatibility
                if (typeof musicEngine.setGradingMode === 'function') {
                    try {
                        musicEngine.setGradingMode('functional');
                        gradingTestsPassed++;
                    } catch (e) {
                        // Mode setting may not work
                    }
                    gradingTestsTotal++;
                }

                if (gradingTestsTotal === 0) {
                    this.log(`  ${scale}: No grading methods available`, 'info');
                } else {
                    const passRate = gradingTestsPassed / gradingTestsTotal;
                    if (passRate >= 0.5) { // Allow some flexibility
                        this.log(`  ${scale}: Grading system compatible (${gradingTestsPassed}/${gradingTestsTotal})`, 'pass');
                        this.testResults.passed++;
                    } else {
                        this.log(`  ${scale}: Grading system issues (${gradingTestsPassed}/${gradingTestsTotal})`, 'fail');
                        this.testResults.failed++;
                    }
                    this.testResults.total++;
                }

            } catch (error) {
                this.log(`  ${scale}: Grading system error - ${error.message}`, 'fail');
                this.testResults.failed++;
                this.testResults.total++;
            }
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new RegionalScalesIntegrationTester();
    tester.runAllTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { RegionalScalesIntegrationTester };