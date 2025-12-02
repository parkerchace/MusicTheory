# 🎵 Modular Music Theory System

A comprehensive, modular music theory application broken down into independent, reusable JavaScript modules.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Module Architecture](#module-architecture)
- [Docs Index](#docs-index)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [File Structure](#file-structure)
- [Testing](#testing)
- [Examples](#examples)

## 🎯 Overview

This system provides professional-grade music theory tools including:

- **60+ authentic scales** from around the world
- **Complete chord analysis** with functional harmony
- **Interactive piano visualization** with scale degree highlighting
- **Advanced chord progression building** with reharmonization
- **Container chord analysis** with filtering and grading
- **Scale degree transformations** (retrograde, invert, rotate, randomize)

Originally a single 5600+ line HTML file that was way too difficult to manage, now modularized into independent components that can be used separately or together.

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

| Capability | Description |
|------------|-------------|
| Scale Degree Conversion | Turn number sequences (e.g. 2–5–1) into fully spelled chords (Dm7 → G7 → Cmaj7). |
| Reharmonization | Apply secondary dominants, tritone substitutions, relative/parallel mode shifts. |
| Interactive Editing | Drag, insert, duplicate, and transform chords without losing functional context. |
| Direction Controls | Steering functions: to tonic, away from tonic, circle of fifths drift, pivot modulation. |
| Cadence Assurance | Auto‑detect missing cadential resolution and suggest / insert V–I or ii–V–I. |
| Voice Leading Hints | Highlights smooth semitone / common‑tone moves between successive chords. |
| Export Hooks | Emits progression data for Sheet Music, Piano Visualizer, and Container Chord Tool. |

Example (programmatic usage):
```javascript
const progression = new ProgressionBuilder(theory);
progression.buildProgressionFromNumbers([2,5,1], 'C', 'major');
progression.applyDirection('to_tonic');
progression.ensureCadence();
console.log(progression.getCurrentProgression().chords); // [ 'Dm7', 'G7', 'Cmaj7' ]
```

### 🔍 Container Chord Tool
- Find chords containing specific notes
- Advanced filtering (triads, sevenths, extended, scale-based)
- Chord grading system (★★★ Perfect, ★★ Excellent, ★ Good)
- Detailed chord role information
- Piano visualization integration

### 🌐 Scale Circle Explorer
- Interactive circle of fifths/fourths/chromatic visualization
- Key relationship exploration
- Scale degree highlighting
- Chord progression visualization on circle
- Real-time updates with scale library integration

### 🎼 Sheet Music Generator
- Live-rendering staff notation (treble or grand staff)
- 4-bar display with customizable layouts
- Automatic note placement and accidentals
- Integration with key/scale and chord selections
- SVG-based lightweight rendering

### 🪐 Solar System Visualizer
- Planetary orbit visualization of scale degrees
- Central sun represents current key
- Expandable satellites for secondary functions
- Interactive planet selection
- Customizable sizing and speed modes
- Trajectory visualization

### 🎵 Audio Visualizer
- Real-time microphone input visualization
- Multiple visualization modes (bars, waves)
- Fullscreen overlay with gradient effects
- Web Audio API integration

## 🏗️ Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ModularMusicTheoryApp                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │ Number Gen  │ │Scale Library│ │Chord        │ │Progress │ │
│  │             │ │             │ │Analyzer     │ │Builder  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
│           │              │              │              │      │
│           └──────────────┼──────────────┼──────────────┘      │
│                          │              │                     │
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

┌──────────── Advanced Visualizers & Tools ────────────────────┐
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │Container     │ │Scale Circle  │ │Sheet Music   │         │
│  │Chord Tool    │ │Explorer      │ │Generator     │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │Solar System  │ │Audio         │ │Aperture      │         │
│  │Visualizer    │ │Visualizer    │ │Theme (CSS)   │         │
│  └──────────────┘ └──────────────┘ └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Module Dependencies

```
Number Generator        → (standalone)
Scale Library           → Music Theory Engine
Piano Visualizer        → (standalone)
Chord Analyzer          → Music Theory Engine
Progression Builder     → Music Theory Engine
Container Chord Tool    → Music Theory Engine, Piano Visualizer
Scale Circle Explorer   → Music Theory Engine
Sheet Music Generator   → Music Theory Engine
Solar System Visualizer → Music Theory Engine
Audio Visualizer        → (standalone, Web Audio API)
Test Integration        → All modules
HTML Interface          → All modules
```

## 📚 Docs Index

- Build and Run (Windows): `BUILD_AND_RUN.md`
- Bitwig/DAW MIDI bridge: `BITWIG_MIDI_INTEGRATION.md`
- VST3 Plugin Quickstart: `vst3-plugin/QUICKSTART.md`
- VST3 Plugin Details: `vst3-plugin/README.md`
- Sheet Music Quickstart: `SHEET_MUSIC_QUICKSTART.md`
- Full File Index: `FILE_INDEX.md`

## 📦 Installation

1. **Clone or download** the repository

2. **Open** `modular-music-theory.html` in a modern web browser

3. **Initialize** the modules you need
```html
<script src="music-theory-engine.js"></script>
<script src="number-generator.js"></script>
<script src="scale-library.js"></script>
<script src="piano-visualizer.js"></script>
<script src="chord-analyzer.js"></script>
<script src="progression-builder.js"></script>
<script src="container-chord-tool.js"></script>
<script src="scale-circle-explorer.js"></script>
<script src="sheet-music-generator.js"></script>
<script src="solar-system-visualizer.js"></script>
<script src="audio-visualizer.js"></script>
```

### ES Module Usage (optional)
These modules are plain browser JavaScript. They are not published to npm. You can import them as ES modules:

```html
<script type="module">
    import { MusicTheoryEngine } from './music-theory-engine.js';
    import { NumberGenerator } from './number-generator.js';
    // ...
    const theory = new MusicTheoryEngine();
    const gen = new NumberGenerator();
    console.log(theory.getScaleNotes('C','major'));
</script>
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
progression.buildProgressionFromNumbers([2, 5, 1], 'C', 'major');
progression.applyDirection('to_tonic');
progression.ensureCadence();
progression.on('progressionChanged', callback);
```

### ContainerChordTool
```javascript
const containerTool = new ContainerChordTool(theory);

// Find chords containing specific notes
containerTool.setInputNotes(['C', 'E']);
containerTool.setKeyAndScale('C', 'major');
containerTool.findContainerChords();

// Set filter and grade
containerTool.setFilter('sevenths'); // 'all', 'triads', 'sevenths', 'extended'
containerTool.setGradeFilter('excellent'); // 'all', 'perfect', 'excellent', 'good'

// Event handling
containerTool.on('chordSelected', callback);
```

### ScaleCircleExplorer
```javascript
const circleExplorer = new ScaleCircleExplorer(theory);

// Set mode and key
circleExplorer.setMode('fifths'); // 'fifths', 'fourths', 'chromatic'
circleExplorer.setKey('C', 'major');

// Highlight relationships
circleExplorer.highlightRelatedKeys();
circleExplorer.showScaleLines(true);

// Event handling
circleExplorer.on('keySelected', callback);
```

### SheetMusicGenerator
```javascript
const sheetMusic = new SheetMusicGenerator(theory);

// Render notation
sheetMusic.setKeyAndScale('C', 'major');
sheetMusic.setChord({root: 'C', chordType: 'maj7'});
sheetMusic.setStaffType('grand'); // 'treble' or 'grand'
sheetMusic.renderStaff();

// Event handling
sheetMusic.on('staffRendered', callback);
```

### SolarSystemVisualizer
```javascript
const solarSystem = new SolarSystemVisualizer(theory);

// Configure and render
solarSystem.setKeyAndScale('C', 'major');
solarSystem.setSizingMode('theory'); // 'theory' or 'uniform'
solarSystem.showTrajectories(true);
solarSystem.start();

// Interact with planets
solarSystem.expandPlanet(1); // Expand planet at index 1
solarSystem.on('planetClicked', callback);
```

### AudioVisualizer
```javascript
const audioViz = new AudioVisualizer();

// Open and start visualization
await audioViz.open(); // Requests microphone permission
audioViz.setMode('bars'); // 'bars' or 'waves'

// Close when done
audioViz.close();
```

## 📁 File Structure

<!-- AUTO-GENERATED: MODULE TABLE START -->

### 🧩 Module Overview (auto-generated)
| Module | Description | Exports | Features | Lines |
|--------|-------------|---------|----------|-------|
| AudioVisualizer | Real-time microphone input visualization with multiple modes | class AudioVisualizer | Real-time microphone input<br>Multiple visualization modes (bars, waves)<br>Fullscreen overlay with gradient effects<br>Web Audio API integration<br>Responsive canvas rendering | 209 |
| ChordAnalyzer | Advanced chord analysis including container chords and functional harmony | class ChordAnalyzer | Container chord analysis (chords containing specific notes)<br>Functional harmony grouping (Tonic, Dominant, Predominant)<br>Scale matching with percentage scoring<br>Complexity filtering (triads, sevenths, extended)<br>Interactive chord cards with detailed information<br>Visual grading system (Perfect ★★★, Excellent ★★, Good ★) | 519 |
| ContainerChordTool | Specialized tool for finding chords that contain specific notes with advanced filtering | class ContainerChordTool | Input for multiple notes<br>Scale/key context awareness<br>Chord grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Detailed chord information display<br>Piano visualization integration<br>Filter by complexity (triads, sevenths, extended) | 1076 |
| MusicTheoryEngine | Core music theory calculations, scales, and chord analysis used by all other modules | class MusicTheoryEngine | 60+ authentic scales from multiple traditions<br>Complete chord formula system<br>Functional harmony analysis<br>Container chord analysis<br>Scale degree calculations | 1402 |
| NumberGenerator | Scale degree number generation, transformations, and history management | class NumberGenerator | Multiple number types (Diatonic, Barry Harris, Extended, Chromatic)<br>Mathematical transformations (retrograde, invert, rotate, randomize)<br>History management with undo/redo<br>Event system for number changes | 1560 |
| PianoVisualizer | Interactive piano keyboard with scale degree and chord visualization | class PianoVisualizer | Accurate piano keyboard rendering (2 octaves)<br>Scale degree highlighting with colors<br>Colored scale degree number bubbles<br>Standard piano fingering display<br>Hand diagrams with numbered fingers<br>Note role visualization (root, third, fifth, seventh)<br>Interactive note clicking<br>Multiple visualization modes | 1158 |
| ProgressionBuilder | Generative chord progression builder with 2D control system (complexity × adventure) | class ProgressionBuilder | West-East axis: Chord Complexity (triads to 13th chords)<br>North-South axis: Harmonic Adventure (diatonic to chromatic)<br>Secondary dominants and tritone substitutions<br>Modal interchange and chromatic mediants<br>Voice leading optimization<br>Interactive progression editing | 1363 |
| ScaleCircleExplorer | Interactive circle visualization for scales and key relationships | class ScaleCircleExplorer | Circle of fifths/fourths/chromatic modes<br>Interactive key relationships<br>Scale degree highlighting<br>Chord progression visualization<br>Integration with scale library<br>Real-time updates | 842 |
| ScaleLibrary | Scale selection, key selection, and piano visualization integration | class ScaleLibrary | 60+ scales from multiple musical traditions<br>12-key selection<br>Piano visualizer showing scale degrees<br>Scale categories and organization<br>Event system for scale/key changes | 582 |
| SheetMusicGenerator | Live-rendering staff notation (treble or grand staff) with 4-bar display | class SheetMusicGenerator | Live-updates when key/scale changes<br>Live-updates when highlighted chord degree changes<br>Single staff (treble) or grand staff (treble + bass)<br>4-bar display with customizable layouts<br>Automatic note placement and accidentals<br>SVG-based lightweight rendering<br>Integration with key/scale and chord selections | 1296 |
| SolarSystemVisualizer | Planetary orbit visualization of scale degrees with expandable satellites | class SolarSystemVisualizer | Starfield with central Sun (current key)<br>Planets for diatonic notes<br>Expandable satellites for secondary functions<br>Interactive planet selection<br>Customizable sizing and speed modes<br>Trajectory visualization | 551 |
| SolarSystemVisualizerV2 | Enhanced planetary orbit visualization with path tracking and multiple expansion | class SolarSystemVisualizer | Enhanced version with path tracking<br>Multiple simultaneous planet expansion<br>Improved trajectory visualization<br>Mouse hover interactions<br>Active path highlighting | 608 |
| UnifiedChordExplorer | Unified chord exploration with scale-based grid, progression highlighting, and intelligent radial substitution menu | class UnifiedChordExplorer | Scale chord grid showing all diatonic chords (I-VII)<br>Progression highlighting from NumberGenerator<br>Radial substitution menu with common subs and container chords<br>Intelligent positioning based on harmonic function and voice leading<br>Grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Secondary dominants, tritone subs, modal interchange<br>Container chord analysis for any selected chord | 946 |

<!-- AUTO-GENERATED: MODULE TABLE END -->

```
music-theory-system/
├── 📄 modular-music-theory.html         # Complete application
├── 📄 test-integration.js               # Integration tests
│
├── 🎼 Core Modules
│   ├── music-theory-engine.js           # Core calculations (847 lines)
│   ├── number-generator.js              # Number transformations (234 lines)
│   ├── scale-library.js                 # Scale management (189 lines)
│   ├── piano-visualizer.js              # Keyboard rendering (245 lines)
│   ├── chord-analyzer.js                # Chord analysis (298 lines)
│   └── progression-builder.js           # Progression tools (412 lines)
│
├── 🎨 Advanced Tools
│   ├── container-chord-tool.js          # Container chord finder (1078 lines)
│   ├── scale-circle-explorer.js         # Circle visualization (843 lines)
│   ├── sheet-music-generator.js         # Staff notation (1306 lines)
│   ├── solar-system-visualizer.js       # Orbital visualization (544 lines)
│   ├── solar-system-visualizer.v2.js    # Enhanced version
│   └── audio-visualizer.js              # Real-time audio viz (198 lines)
│
├── 🎨 Styling
│   └── aperture-theme.css               # Complete theme system
│
├── � Documentation
│   ├── README.md                        # This documentation
│   ├── TESTING_GUIDE.md                 # Testing procedures
│   ├── IMPLEMENTATION_SUMMARY.md        # Implementation notes
│   ├── PIANO_ENHANCEMENTS.md            # Piano feature docs
│   ├── SCALE_VERIFICATION.md            # Scale validation
│   ├── SHEET_MUSIC_IMPLEMENTATION.md    # Sheet music docs
│   ├── SHEET_MUSIC_QUICKSTART.md        # Quick start guide
│   ├── BEFORE_AFTER_COMPARISON.md       # Refactoring notes
│   └── UI_CLEANUP_PLAN.md               # UI planning
│
├── 🔧 Tools & Utilities
│   ├── tools/                           # Utility scripts
│   ├── validation/                      # Validation reports
│   └── windows xp visualizer/           # Additional visualizers
│
└── 🗑️ Legacy
    └── genius.html.old                  # Original monolithic file
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

### Example 5: Container Chord Analysis
```javascript
const containerTool = new ContainerChordTool(theory);
containerTool.setInputNotes(['C', 'E']);
containerTool.setKeyAndScale('C', 'major');
containerTool.findContainerChords();

// Results include graded chords (Perfect, Excellent, Good)
containerTool.on('resultsUpdated', (data) => {
    console.log('Found chords:', data.results);
});
```

### Example 6: Circle of Fifths Visualization
```javascript
const circle = new ScaleCircleExplorer(theory);
circle.setMode('fifths');
circle.setKey('C', 'major');
circle.showScaleLines(true);

circle.on('keySelected', (data) => {
    console.log('Selected key:', data.key);
});
```

### Example 7: Sheet Music Rendering
```javascript
const sheetMusic = new SheetMusicGenerator(theory);
sheetMusic.setKeyAndScale('C', 'major');
sheetMusic.setChord({root: 'C', chordType: 'maj7'});
sheetMusic.setStaffType('grand');
sheetMusic.renderStaff();
```

### Example 8: Solar System Scale Visualization
```javascript
const solarSystem = new SolarSystemVisualizer(theory);
solarSystem.setKeyAndScale('C', 'major');
solarSystem.setSizingMode('theory');
solarSystem.start();

// Click planets to expand secondary functions
solarSystem.on('planetClicked', (data) => {
    console.log('Planet:', data.note, 'Index:', data.index);
});
```

### Example 9: Audio Visualization
```javascript
const audioViz = new AudioVisualizer();
await audioViz.open(); // Request mic permission
audioViz.setMode('bars');
// Fullscreen visualization with real-time audio
```

## 🎨 CSS Framework

The system includes a complete CSS framework (`aperture-theme.css`) with:
- Responsive grid system
- Consistent button styles
- Piano keyboard styling
- Chord card layouts
- Progress visualization
- Circle and orbital visualization styles
- Sheet music SVG styling
- Audio visualizer gradient effects
- Mobile-friendly design
- Dark theme support

## 🤝 Contributing

Each module is independent and can be:
- **Modified** without affecting others
- **Extended** with additional features
- **Replaced** with alternative implementations
- **Used** separately in other projects

### 🔄 Automated README Updates

To keep this README in sync with the codebase automatically, an update script can parse module metadata and regenerate the module overview table.

Add a structured header comment at the very top of each module using the following template:

```javascript
/**
 * @module MusicTheoryEngine
 * @description Core calculation engine: scales, chords, intervals, analysis helpers.
 * @exports class MusicTheoryEngine
 * @feature Scales
 * @feature Chords
 * @feature ContainerChordSearch
 */
```

Supported tags:
- `@module` Unique module name
- `@description` One‑line purpose
- `@exports` Public classes/functions (repeatable)
- `@feature` Key features (repeatable)

The auto-generation script looks for the markers:
`<!-- AUTO-GENERATED: MODULE TABLE START -->

### 🧩 Module Overview (auto-generated)
| Module | Description | Exports | Features | Lines |
|--------|-------------|---------|----------|-------|
| AudioVisualizer | Real-time microphone input visualization with multiple modes | class AudioVisualizer | Real-time microphone input<br>Multiple visualization modes (bars, waves)<br>Fullscreen overlay with gradient effects<br>Web Audio API integration<br>Responsive canvas rendering | 209 |
| ChordAnalyzer | Advanced chord analysis including container chords and functional harmony | class ChordAnalyzer | Container chord analysis (chords containing specific notes)<br>Functional harmony grouping (Tonic, Dominant, Predominant)<br>Scale matching with percentage scoring<br>Complexity filtering (triads, sevenths, extended)<br>Interactive chord cards with detailed information<br>Visual grading system (Perfect ★★★, Excellent ★★, Good ★) | 519 |
| ContainerChordTool | Specialized tool for finding chords that contain specific notes with advanced filtering | class ContainerChordTool | Input for multiple notes<br>Scale/key context awareness<br>Chord grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Detailed chord information display<br>Piano visualization integration<br>Filter by complexity (triads, sevenths, extended) | 1076 |
| MusicTheoryEngine | Core music theory calculations, scales, and chord analysis used by all other modules | class MusicTheoryEngine | 60+ authentic scales from multiple traditions<br>Complete chord formula system<br>Functional harmony analysis<br>Container chord analysis<br>Scale degree calculations | 1402 |
| NumberGenerator | Scale degree number generation, transformations, and history management | class NumberGenerator | Multiple number types (Diatonic, Barry Harris, Extended, Chromatic)<br>Mathematical transformations (retrograde, invert, rotate, randomize)<br>History management with undo/redo<br>Event system for number changes | 1560 |
| PianoVisualizer | Interactive piano keyboard with scale degree and chord visualization | class PianoVisualizer | Accurate piano keyboard rendering (2 octaves)<br>Scale degree highlighting with colors<br>Colored scale degree number bubbles<br>Standard piano fingering display<br>Hand diagrams with numbered fingers<br>Note role visualization (root, third, fifth, seventh)<br>Interactive note clicking<br>Multiple visualization modes | 1158 |
| ProgressionBuilder | Generative chord progression builder with 2D control system (complexity × adventure) | class ProgressionBuilder | West-East axis: Chord Complexity (triads to 13th chords)<br>North-South axis: Harmonic Adventure (diatonic to chromatic)<br>Secondary dominants and tritone substitutions<br>Modal interchange and chromatic mediants<br>Voice leading optimization<br>Interactive progression editing | 1363 |
| ScaleCircleExplorer | Interactive circle visualization for scales and key relationships | class ScaleCircleExplorer | Circle of fifths/fourths/chromatic modes<br>Interactive key relationships<br>Scale degree highlighting<br>Chord progression visualization<br>Integration with scale library<br>Real-time updates | 842 |
| ScaleLibrary | Scale selection, key selection, and piano visualization integration | class ScaleLibrary | 60+ scales from multiple musical traditions<br>12-key selection<br>Piano visualizer showing scale degrees<br>Scale categories and organization<br>Event system for scale/key changes | 582 |
| SheetMusicGenerator | Live-rendering staff notation (treble or grand staff) with 4-bar display | class SheetMusicGenerator | Live-updates when key/scale changes<br>Live-updates when highlighted chord degree changes<br>Single staff (treble) or grand staff (treble + bass)<br>4-bar display with customizable layouts<br>Automatic note placement and accidentals<br>SVG-based lightweight rendering<br>Integration with key/scale and chord selections | 1296 |
| SolarSystemVisualizer | Planetary orbit visualization of scale degrees with expandable satellites | class SolarSystemVisualizer | Starfield with central Sun (current key)<br>Planets for diatonic notes<br>Expandable satellites for secondary functions<br>Interactive planet selection<br>Customizable sizing and speed modes<br>Trajectory visualization | 551 |
| SolarSystemVisualizerV2 | Enhanced planetary orbit visualization with path tracking and multiple expansion | class SolarSystemVisualizer | Enhanced version with path tracking<br>Multiple simultaneous planet expansion<br>Improved trajectory visualization<br>Mouse hover interactions<br>Active path highlighting | 608 |
| UnifiedChordExplorer | Unified chord exploration with scale-based grid, progression highlighting, and intelligent radial substitution menu | class UnifiedChordExplorer | Scale chord grid showing all diatonic chords (I-VII)<br>Progression highlighting from NumberGenerator<br>Radial substitution menu with common subs and container chords<br>Intelligent positioning based on harmonic function and voice leading<br>Grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Secondary dominants, tritone subs, modal interchange<br>Container chord analysis for any selected chord | 946 |

<!-- AUTO-GENERATED: MODULE TABLE END -->` and replaces everything between them.

Run the updater manually:
```bash
node tools/update_readme.js
```
Or integrate into a Git pre-commit hook / GitHub Action to keep documentation current.

## 📜 License

This modular music theory system is provided as open source for educational and musical purposes.

## 🎵 Acknowledgments

- **60+ scales** from multiple musical traditions
- **Professional chord analysis** with functional harmony
- **Advanced progression techniques** from jazz theory
- **Interactive visualization** for music education

---

**Ready to explore music theory in a modular way!** 🎼✨
