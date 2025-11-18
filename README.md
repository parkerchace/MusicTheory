# 🎵 Modular Music Theory System

A comprehensive, modular music theory application broken down into independent, reusable JavaScript modules. Extracted from a 5600+ line monolithic HTML file into clean, focused components.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Module Architecture](#module-architecture)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [File Structure](#file-structure)
- [Testing](#testing)
- [Examples](#examples)

## 🎯 Overview

This system provides professional-grade music theory tools including:

- **60+ authentic scales** from Western, Eastern, and world music traditions
- **Complete chord analysis** with functional harmony
- **Interactive piano visualization** with scale degree highlighting
- **Advanced chord progression building** with reharmonization
- **Container chord analysis** with filtering and grading
- **Scale degree transformations** (retrograde, invert, rotate, randomize)

Originally a single 5600+ line HTML file, now modularized into independent components that can be used separately or together.

## ✨ Features

### 🎲 Number Generator
- Multiple number types (Diatonic 1-7, Barry Harris 8-Tone, Extended 1-14, Chromatic 1-12)
- Mathematical transformations (retrograde, inversion, rotation, randomization)
- History management with undo/redo
- Event-driven architecture

### 🎼 Scale Library
- 60+ scales from multiple musical traditions
- 12-key selection
- Scale characteristic analysis
- Piano visualizer integration
- Scale categorization (Major, Minor, Pentatonic, etc.)

### 🎹 Piano Visualizer
- Accurate 2-octave piano keyboard rendering
- Scale degree and chord visualization
- Interactive note clicking
### 🎯 Progression Builder
- Convert scale degrees to chord progressions
- Reharmonization techniques (secondary dominants, tritone substitutions)
- Interactive progression editing
- Direction controls (to tonic, away from tonic, circle of fifths)
│                    ModularMusicTheoryApp                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
│           │              │              │              │      │
│           └──────────────┼──────────────┼──────────────┘      │
│                          │              │                    │
│           ┌──────────────┼──────────────┼─────────────┐      │
│           │              │              │             │      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │MusicTheory │ │PianoVisual- │ │TestSuite    │ │HTML     │ │
│  │Engine      │ │izer         │ │             │ │Interface│ │
│  │            │ │             │ │             │ │         │ │
│  │• Scales    │ │• Keyboard   │ │• Integration│ │• CSS    │ │
│  │• Chords    │ │• Highlight  │ │• Validation │ │• Layout │ │
│  │• Analysis  │ │• Interactive│ │• Examples   │ │• Responsive││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Module Dependencies

```
Number Generator      → (standalone)
Scale Library         → Music Theory Engine
Piano Visualizer      → (standalone)
Chord Analyzer        → Music Theory Engine
Progression Builder   → Music Theory Engine
Test Integration      → All modules
HTML Interface        → All modules
```

3. **Initialize** the modules you need
```html
<script src="music-theory-engine.js"></script>
<script src="number-generator.js"></script>
<script src="scale-library.js"></script>
<script src="piano-visualizer.js"></script>
<script src="chord-analyzer.js"></script>
<script src="progression-builder.js"></script>
```

### Node.js Usage
```bash
npm install ./music-theory-engine.js
npm install ./number-generator.js
# etc. for each module
```

## 📖 Usage

### Basic Setup
```javascript
// Initialize core engine
const musicTheory = new MusicTheoryEngine();

// Initialize modules
const numberGen = new NumberGenerator();
const scaleLib = new ScaleLibrary(musicTheory);
const chordAnalyzer = new ChordAnalyzer(musicTheory);

// Set up event listeners
numberGen.on('numbersChanged', (data) => {
    console.log('New numbers:', data.numbers);
    const notes = data.numbers.map(n => {
        const scaleNotes = musicTheory.getScaleNotes('C', 'major');
        return scaleNotes[(n - 1) % scaleNotes.length];
    });
    chordAnalyzer.analyzeChords(notes, 'C', 'major');
});
```

### Complete Application
```javascript
// Initialize all modules
const app = new ModularMusicTheoryApp();

// Or initialize individually
const theory = new MusicTheoryEngine();
const numbers = new NumberGenerator();
const scales = new ScaleLibrary(theory);
const piano = new PianoVisualizer();
const chords = new ChordAnalyzer(theory);
const progression = new ProgressionBuilder(theory);
```

## 📚 API Reference

### MusicTheoryEngine
```javascript
const theory = new MusicTheoryEngine();

// Scale operations
theory.getScaleNotes('C', 'major') // → ['C', 'D', 'E', 'F', 'G', 'A', 'B']
theory.getScaleCategories() // → Object with scale groupings
theory.getDiatonicChord(2, 'C', 'major') // → {root: 'D', chordType: 'm7', fullName: 'Dm7'}

// Chord operations
theory.getChordNotes('C', 'maj7') // → ['C', 'E', 'G', 'B']
theory.getChordComplexity('maj7') // → 'seventh'
theory.findAllContainerChords(['C', 'E'], scaleNotes) // → Array of chord objects
```

### NumberGenerator
```javascript
const generator = new NumberGenerator();

// Generation and transformation
generator.generateNumbers(4, 'diatonic') // → [3, 6, 2, 7]
generator.applyTransformation('retrograde') // Reverse current numbers
generator.applyTransformation('invert', {axis: 7}) // Invert around axis

// History management
generator.undo() // Undo last transformation
generator.getHistory() // Get history of changes
generator.on('numbersChanged', callback) // Listen for changes
```

### ScaleLibrary
```javascript
const scales = new ScaleLibrary(theory);

// Scale management
scales.setKeyAndScale('C', 'dorian')
scales.getCurrentScaleNotes() // → ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']
scales.getScaleCharacteristics('dorian') // → Scale analysis object

// Event handling
scales.on('scaleChanged', callback)
scales.on('degreeHighlighted', callback)
```

### PianoVisualizer
```javascript
const piano = new PianoVisualizer();

// Visualization
piano.renderScale({
    key: 'C',
    scale: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B']
})

piano.renderChord({
    notes: ['C', 'E', 'G', 'B'],
    roles: [
        {note: 'C', class: 'root'},
        {note: 'E', class: 'third'},
        {note: 'G', class: 'fifth'},
        {note: 'B', class: 'seventh'}
    ]
})

// Event handling
piano.on('noteClicked', callback)
```

### ChordAnalyzer
```javascript
const analyzer = new ChordAnalyzer(theory);

// Analysis
analyzer.analyzeChords(['C', 'E', 'G'], 'C', 'major')
analyzer.setFilter('triads') // or 'sevenths', 'extended', 'scale'

// Event handling
analyzer.on('chordSelected', callback)
```

### ProgressionBuilder
```javascript
const progression = new ProgressionBuilder(theory);

// Building
progression.buildProgressionFromNumbers([2, 5, 1], 'C', 'major')
progression.applyDirection('to_tonic')
progression.ensureCadence()

// Event handling
progression.on('progressionChanged', callback)
```

## 📁 File Structure

```
music-theory-system/
├── 📄 modular-music-theory.html      # Complete application
├── 📄 test-integration.js            # Integration tests
├── 🎼 music-theory-engine.js         # Core calculations (847 lines)
├── 🎲 number-generator.js            # Number transformations (234 lines)
├── 🎼 scale-library.js               # Scale management (189 lines)
├── 🎹 piano-visualizer.js            # Keyboard rendering (245 lines)
├── 🔍 chord-analyzer.js              # Chord analysis (298 lines)
├── 🎯 progression-builder.js         # Progression tools (412 lines)
└── 📖 README.md                      # This documentation
```

## 🧪 Testing

Run the complete test suite:

```html
<script src="test-integration.js"></script>
<!-- Tests run automatically on page load -->
```

Or run individual tests:

```javascript
// Test all modules
const test = new ModularMusicTheoryTest();
test.runAllTests();

// Test specific module
const theory = new MusicTheoryEngine();
console.log(theory.getScaleNotes('C', 'major')); // Should log scale notes
```

## 💡 Examples

### Example 1: Simple Scale Analysis
```javascript
const theory = new MusicTheoryEngine();
const scales = new ScaleLibrary(theory);

scales.setKeyAndScale('C', 'dorian');
const notes = scales.getCurrentScaleNotes();
console.log('Dorian scale:', notes); // C, D, Eb, F, G, A, Bb
```

### Example 2: Chord Progression Building
```javascript
const progression = new ProgressionBuilder(theory);
progression.buildProgressionFromNumbers([2, 5, 1], 'C', 'major');
const prog = progression.getCurrentProgression();
console.log('Progression:', prog.chords); // Dm7, G7, Cmaj7
```

### Example 3: Container Chord Analysis
```javascript
const analyzer = new ChordAnalyzer(theory);
const scaleNotes = theory.getScaleNotes('C', 'major');
const containers = theory.findAllContainerChords(['C', 'E'], scaleNotes);
console.log('Chords containing C and E:', containers.map(c => c.fullName));
```

### Example 4: Interactive Piano
```javascript
const piano = new PianoVisualizer();
const cMajor = theory.getScaleNotes('C', 'major');

piano.on('noteClicked', (data) => {
    console.log('Clicked note:', data.note, 'MIDI:', data.midi);
});

piano.renderScale({
    key: 'C',
    scale: 'major',
    notes: cMajor
});
```

## 🎨 CSS Framework

The system includes a complete CSS framework with:
- Responsive grid system
- Consistent button styles
- Piano keyboard styling
- Chord card layouts
- Progress visualization
- Mobile-friendly design

## 🤝 Contributing

Each module is independent and can be:
- **Modified** without affecting others
- **Extended** with additional features
- **Replaced** with alternative implementations
- **Used** separately in other projects

## 📜 License

This modular music theory system is provided as open source for educational and musical purposes.

## 🎵 Acknowledgments

- **60+ scales** from multiple musical traditions
- **Professional chord analysis** with functional harmony
- **Advanced progression techniques** from jazz theory
- **Interactive visualization** for music education

---

**Ready to explore music theory in a modular way!** 🎼✨
