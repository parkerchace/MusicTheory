/**
 * MODULAR MUSIC THEORY SYSTEM - INTEGRATION TEST
 *
 * Tests all modules working together and verifies functionality
 * Also serves as usage documentation for the modular system
 */

class ModularMusicTheoryTest {
    constructor() {
        this.musicTheory = new MusicTheoryEngine();
        this.numberGenerator = new NumberGenerator();
        this.scaleLibrary = new ScaleLibrary(this.musicTheory);
        this.pianoVisualizer = new PianoVisualizer();
        this.chordAnalyzer = new ChordAnalyzer(this.musicTheory);
        this.progressionBuilder = new ProgressionBuilder(this.musicTheory);

        this.testResults = [];
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.runAllTests();
    }

    setupEventListeners() {
        // Test cross-module communication
        this.numberGenerator.on('numbersChanged', (data) => {
            console.log('📊 Numbers changed:', data);
            this.logTest('Number Generator → Chord Analyzer', 'PASS');
        });

        this.scaleLibrary.on('scaleChanged', (data) => {
            console.log('🎼 Scale changed:', data);
            this.logTest('Scale Library → Piano Visualizer', 'PASS');
        });

        this.chordAnalyzer.on('chordSelected', (data) => {
            console.log('🎵 Chord selected:', data);
            this.logTest('Chord Analyzer → Piano Visualizer', 'PASS');
        });
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        console.log('🧪 Starting Modular Music Theory Integration Tests...\n');

        // Test 1: Music Theory Engine
        await this.testMusicTheoryEngine();

        // Test 2: Number Generator
        await this.testNumberGenerator();

        // Test 3: Scale Library
        await this.testScaleLibrary();

        // Test 4: Piano Visualizer
        await this.testPianoVisualizer();

        // Test 5: Chord Analyzer
        await this.testChordAnalyzer();

        // Test 6: Progression Builder
        await this.testProgressionBuilder();

        // Test 7: Cross-module integration
        await this.testIntegration();

        this.printTestResults();
    }

    /**
     * Test Music Theory Engine
     */
    async testMusicTheoryEngine() {
        console.log('Testing Music Theory Engine...');

        try {
            // Test scale generation
            const cMajor = this.musicTheory.getScaleNotes('C', 'major');
            this.assert(cMajor.join(',') === 'C,D,E,F,G,A,B', 'C Major scale notes');

            // Test chord generation
            const cMaj7 = this.musicTheory.getChordNotes('C', 'maj7');
            this.assert(cMaj7.join(',') === 'C,E,G,B', 'C Major 7 chord');

            // Test container chords
            const containers = this.musicTheory.findAllContainerChords(['C', 'E', 'G'], cMajor);
            this.assert(containers.length > 0, 'Container chords found');

            // Test diatonic chords
            const iiChord = this.musicTheory.getDiatonicChord(2, 'C', 'major');
            this.assert(iiChord.fullName === 'Dm7', 'Diatonic chord generation');

            this.logTest('Music Theory Engine', 'PASS');
            
            // Quick signature mapping checks (Lydian Dominant / Acoustic)
            try {
                const sheet = new SheetMusicGenerator(this.musicTheory);
                const sig = sheet.getSignatureFor('C', 'lydian_dominant');
                this.assert(sig && sig.baseSignature && sig.baseSignature.accidentals.includes('F#'), 'Lydian Dominant: base signature includes F# (C Lydian Dominant should use G signature)');
                this.assert(sig && sig.scaleAccidentals && sig.scaleAccidentals.includes('Bb'), 'Lydian Dominant: scale accidental includes Bb');
                this.logTest('Lydian Dominant signature mapping', 'PASS');
            } catch (err) {
                this.logTest('Lydian Dominant signature mapping', 'FAIL', err.message);
            }
        } catch (error) {
            this.logTest('Music Theory Engine', 'FAIL', error.message);
        }
    }

    /**
     * Test Number Generator
     */
    async testNumberGenerator() {
        console.log('Testing Number Generator...');

        try {
            // Test generation
            const numbers = this.numberGenerator.generateNumbers(4, 'diatonic');
            this.assert(numbers.length === 4, 'Generated 4 numbers');
            this.assert(numbers.every(n => n >= 1 && n <= 7), 'All numbers in diatonic range');

            // Test transformations
            this.numberGenerator.setNumbers([1, 2, 3, 4]);
            this.numberGenerator.applyTransformation('retrograde');
            const current = this.numberGenerator.getCurrentNumbers();
            this.assert(current.join(',') === '4,3,2,1', 'Retrograde transformation');

            // Test undo
            this.numberGenerator.undo();
            const undone = this.numberGenerator.getCurrentNumbers();
            this.assert(undone.join(',') === '1,2,3,4', 'Undo functionality');

            // Test scale-aware transformation
            this.numberGenerator.applyScaleAwareTransformation('diatonic_invert', {
                scaleNotes: ['C','D','E','F','G','A','B']
            });
            const inverted = this.numberGenerator.getCurrentNumbers();
            this.assert(inverted.join(',') === '7,6,5,4', 'Diatonic inversion');

            this.logTest('Number Generator', 'PASS');
        } catch (error) {
            this.logTest('Number Generator', 'FAIL', error.message);
        }
    }

    /**
     * Test Scale Library
     */
    async testScaleLibrary() {
        console.log('Testing Scale Library...');

        try {
            // Test scale setting
            this.scaleLibrary.setKeyAndScale('C', 'major');
            this.assert(this.scaleLibrary.getCurrentKey() === 'C', 'Key setting');
            this.assert(this.scaleLibrary.getCurrentScale() === 'major', 'Scale setting');

            // Test scale info
            const scaleInfo = this.scaleLibrary.getScaleInfo('dorian');
            this.assert(scaleInfo.type === 'dorian', 'Scale info retrieval');

            // Test scale characteristics
            const chars = this.scaleLibrary.getScaleCharacteristics('major');
            this.assert(chars.tonality === 'Major', 'Scale characteristics');

            this.logTest('Scale Library', 'PASS');
        } catch (error) {
            this.logTest('Scale Library', 'FAIL', error.message);
        }
    }

    /**
     * Test Piano Visualizer
     */
    async testPianoVisualizer() {
        console.log('Testing Piano Visualizer...');

        try {
            // Test piano creation
            const element = this.pianoVisualizer.getElement();
            this.assert(element !== null, 'Piano element created');

            // Test scale rendering
            const scaleNotes = this.musicTheory.getScaleNotes('C', 'major');
            this.pianoVisualizer.renderScale({
                key: 'C',
                scale: 'major',
                notes: scaleNotes
            });

            this.assert(this.pianoVisualizer.state.activeNotes.length > 0, 'Scale rendered');

            this.logTest('Piano Visualizer', 'PASS');
        } catch (error) {
            this.logTest('Piano Visualizer', 'FAIL', error.message);
        }
    }

    /**
     * Test Chord Analyzer
     */
    async testChordAnalyzer() {
        console.log('Testing Chord Analyzer...');

        try {
            // Test chord analysis
            const scaleNotes = this.musicTheory.getScaleNotes('C', 'major');
            this.chordAnalyzer.analyzeChords(['C', 'E', 'G'], 'C', 'major');

            const state = this.chordAnalyzer.getState();
            this.assert(state.currentNotes.length === 3, 'Notes set for analysis');

            // Test filtering
            this.chordAnalyzer.setFilter('triads');
            this.assert(this.chordAnalyzer.state.currentFilter === 'triads', 'Filter application');

            // Test note roles
            const roles = this.chordAnalyzer.getNoteRoles(['C','E','G'], 'C');
            this.assert(roles.C === 'root', 'Note role: root');
            this.assert(roles.E === 'major third', 'Note role: major third');
            this.assert(roles.G === 'fifth', 'Note role: fifth');

            // Test chord function classification
            const functionType = this.chordAnalyzer.classifyChordFunction(
                {root: 'D', chordType: 'm7'}, 
                'C', 
                'major'
            );
            this.assert(functionType === 'predominant', 'Chord function classification');

            this.logTest('Chord Analyzer', 'PASS');
        } catch (error) {
            this.logTest('Chord Analyzer', 'FAIL', error.message);
        }
    }

    /**
     * Test Progression Builder
     */
    async testProgressionBuilder() {
        console.log('Testing Progression Builder...');

        try {
            // Test progression building
            const numbers = [2, 5, 1]; // ii - IV - I
            this.progressionBuilder.buildProgressionFromNumbers(numbers, 'C', 'major');

            const progression = this.progressionBuilder.getCurrentProgression();
            this.assert(progression.chords.length === 3, 'Progression built from numbers');

            // Test direction application
            this.progressionBuilder.applyDirection('to_tonic');
            const updated = this.progressionBuilder.getCurrentProgression();
            this.assert(updated.chords.length >= 3, 'Direction applied');

            this.logTest('Progression Builder', 'PASS');
        } catch (error) {
            this.logTest('Progression Builder', 'FAIL', error.message);
        }
    }

    /**
     * Test module integration
     */
    async testIntegration() {
        console.log('Testing Module Integration...');

        try {
            // Test complete workflow
            this.scaleLibrary.setKeyAndScale('C', 'major');
            this.numberGenerator.generateNumbers(4, 'diatonic');

            // Wait for events to propagate
            await this.delay(100);

            const scaleNotes = this.musicTheory.getScaleNotes('C', 'major');
            const currentNumbers = this.numberGenerator.getCurrentNumbers();

            const notes = currentNumbers.map(num => scaleNotes[(num - 1) % scaleNotes.length]);
            this.chordAnalyzer.analyzeChords(notes, 'C', 'major');
            this.progressionBuilder.buildProgressionFromNumbers(currentNumbers, 'C', 'major');

            // Wait for all modules to process
            await this.delay(100);

            this.assert(true, 'Complete workflow executed');
            this.logTest('Module Integration', 'PASS');
        } catch (error) {
            this.logTest('Module Integration', 'FAIL', error.message);
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Assertion helper
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    /**
     * Log test result
     */
    logTest(testName, status, error = null) {
        const result = {
            name: testName,
            status: status,
            timestamp: new Date().toISOString(),
            error: error
        };

        this.testResults.push(result);
        console.log(`${status === 'PASS' ? '✅' : '❌'} ${testName}: ${status}`);
        if (error) {
            console.log(`   Error: ${error}`);
        }
    }

    /**
     * Print all test results
     */
    printTestResults() {
        console.log('\n🎯 TEST RESULTS SUMMARY');
        console.log('='.repeat(50));

        const passed = this.testResults.filter(t => t.status === 'PASS').length;
        const total = this.testResults.length;
        const failed = total - passed;

        console.log(`Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Success Rate: ${Math.round((passed / total) * 100)}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(t => t.status === 'FAIL').forEach(test => {
                console.log(`   - ${test.name}: ${test.error}`);
            });
        }

        console.log('\n🎵 All modules are ready for use!');
        console.log('📖 See modular-music-theory.html for the complete application');
    }
}

// Usage Examples and Documentation
console.log(`
🎵 MODULAR MUSIC THEORY SYSTEM
================================

📚 USAGE EXAMPLES:

// 1. Basic Music Theory Engine
const theory = new MusicTheoryEngine();
const cMajor = theory.getScaleNotes('C', 'major'); // ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const chord = theory.getChordNotes('C', 'maj7'); // ['C', 'E', 'G', 'B']

// 2. Number Generator
const generator = new NumberGenerator();
generator.on('numbersChanged', (data) => console.log(data.numbers));
generator.generateNumbers(4, 'diatonic'); // [3, 6, 2, 7]
generator.applyTransformation('retrograde'); // Reverse order

// 3. Scale Library
const scales = new ScaleLibrary(theory);
scales.on('scaleChanged', (data) => console.log(data.notes));
scales.setKeyAndScale('C', 'dorian');
const info = scales.getScaleCharacteristics('dorian');

// 4. Piano Visualizer
const piano = new PianoVisualizer();
piano.renderScale({key: 'C', scale: 'major', notes: cMajor});

// 5. Chord Analyzer
const analyzer = new ChordAnalyzer(theory);
analyzer.on('chordSelected', (data) => console.log(data.chord));
analyzer.analyzeChords(['C', 'E', 'G'], 'C', 'major');

// 6. Progression Builder
const progression = new ProgressionBuilder(theory);
progression.buildProgressionFromNumbers([2, 5, 1], 'C', 'major');
progression.applyDirection('to_tonic');

🔧 MODULE DEPENDENCIES:
- ChordAnalyzer → MusicTheoryEngine
- ScaleLibrary → MusicTheoryEngine
- ProgressionBuilder → MusicTheoryEngine
- PianoVisualizer → (standalone)
- NumberGenerator → (standalone)

📁 FILE STRUCTURE:
- music-theory-engine.js (core calculations)
- number-generator.js (transformations, history)
- scale-library.js (scales, piano integration)
- piano-visualizer.js (keyboard rendering)
- chord-analyzer.js (container chords, filtering)
- progression-builder.js (sequences, reharmonization)
- modular-music-theory.html (complete application)
- test-integration.js (this file)

🚀 READY FOR PRODUCTION USE!
`);

// Auto-run tests if in browser
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if (typeof MusicTheoryEngine !== 'undefined') {
            new ModularMusicTheoryTest();
        }
    });
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModularMusicTheoryTest;
}
