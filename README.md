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

Originally a single HTML file that was way too difficult to manage, now modularized into independent components that can be used separately or together.

## ✨ Features

### 🎲 Number Generator
- **Generation Logic Modes**:
  - **Random**: Pure random selection within range
  - **Melodic**: Stepwise motion with occasional leaps
  - **Harmonic**: Common chord progression patterns (I-IV-V, ii-V-I)
  - **Chord Tones**: Arpeggios based on current scale harmony
  - **Functional**: Logic based on Tonic/Subdominant/Dominant function
- **Transformations**:
  - **Retrograde**: Reverses the sequence
  - **Invert**: Inverts numbers around an axis
  - **Rotate**: Shifts sequence Left or Right
  - **Randomize**: Shuffles current numbers
- **Scale Awareness**: Generates valid chord tones for the active scale
- **History**: Full Undo/Redo support for all changes

### 🎼 Scale Library
- **Extensive Collection**: 60+ scales organized by category:
  - **Western**: Major, Minor, Modes (Dorian, Lydian, etc.)
  - **Jazz**: Bebop, Barry Harris, Altered
  - **World**: Middle Eastern (Hijaz, Maqam), Indian Ragas, Japanese
  - **Pentatonic/Hexatonic**: Blues, Major/Minor Pentatonic
- **Deep Analysis**:
  - **Characteristics**: Intervals, Tonality, Origin, Common Usage
  - **Citations**: Academic references for scale origins
- **Visual Integration**:
  - Highlights scale degrees on the Piano Visualizer
  - Updates global key/scale state for all other modules

### 🎹 Piano Visualizer (`piano-visualizer.js`)
- **Interactive Keyboard**: 88-key virtual piano with mouse/touch support
- **Dynamic Rendering**:
  - **Scale Mode**: Highlights scale notes with role-based coloring (Root, 3rd, 5th)
  - **Chord Mode**: Visualizes chord voicings with active note highlighting
  - **Chord Stack**: Vertical visualization of chord structure (Root-3-5-7-9)
- **Annotations**:
  - **Scale Degrees**: Colored bubbles above keys (Green=Natural, Purple=Sharp, Blue=Flat)
  - **Fingering**: Standard piano fingering display with Left/Right/Both hand toggles
  - **Note Names**: Optional note name overlays
- **Playback**: Visual playback of scales and chords (silent visualization)

### 🎯 Unified Chord Explorer (`unified-chord-explorer.js`)
- **Diatonic Grid**: Interactive grid of I-VII chords for the current scale
- **Radial Substitution Menu**:
  - **Harmonic Logic**: Suggests substitutions based on function (Dominant, Subdominant, Tonic)
  - **Categories**: Secondary Dominants, Tritone Subs, Modal Interchange, Chromatic Mediants
  - **Cluster Views**: Groups large numbers of substitutions by root or family
  - **Exhaustive Mode**: Toggle to show all theoretically possible substitutions
- **Insertion Mode**: Insert passing chords *before* or *after* any progression step
- **Integration**:
  - Syncs with Number Generator for progression highlighting
  - Updates global key/scale state
  - "Smart" positioning based on harmonic distance

### 🎼 Progression Builder (`progression-builder.js`)
- **2D Control System**:
  - **X-Axis (Complexity)**: Triads → Sevenths → Extended (9th/11th/13th)
  - **Y-Axis (Adventure)**: Experimental (Chromatic) → Perfect (Diatonic)
- **Harmonization Modes**:
  - **Root Mode**: Numbers treated as chord roots
  - **Melody Mode**: Numbers treated as melody notes (harmonizes underneath)
  - **Harmony Mode**: Advanced candidate selection with voice leading
- **Explore Logic**: Intelligent insertion of passing chords
  - **Functional**: Secondary dominants, ii-V setups
  - **Jazz**: Tritone subs, turnarounds
  - **Voice Leading**: Diminished approaches, passing chords
- **Rule Flexibility**: "Anarchy" slider to introduce controlled randomness

### 🔍 Container Chord Tool
- **Reverse Chord Lookup**: Find chords containing specific notes
- **Grading System**:
  - **Perfect (★★★)**: Contains all input notes + fits scale perfectly
  - **Excellent (★★)**: Contains all input notes + fits scale with minor alterations
  - **Good (★)**: Contains most input notes or fits loosely
- **Advanced Filtering**:
  - **Chord Types**: Triads, Sevenths, Extended (9th/11th/13th)
  - **Scale Constraint**: Filter chords strictly within the current key
- **Multi-Group Mode**: Analyze multiple note groups simultaneously
- **Piano Integration**: Click results to visualize on the virtual keyboard

### 🌐 Scale Circle Explorer
- **Canvas-Based Visualization**: High-performance rendering of the Circle of Fifths
- **Interactive Modes**:
  - **Fifths**: Standard Circle of Fifths layout
  - **Fourths**: Circle of Fourths layout
  - **Chromatic**: Chromatic arrangement
- **Dynamic Highlighting**:
  - Visualizes active scale degrees on the circle
  - Updates in real-time with key/scale changes
- **Interactive Navigation**: Click sectors to instantly modulate key

### 🎼 Sheet Music Generator
- **SVG Rendering**: Lightweight, scalable vector graphics for notation
- **Staff Modes**:
  - **Grand Staff**: Full piano score (Treble + Bass)
  - **Treble/Bass**: Individual clef views
- **Voicing Logic**:
  - **Smart**: Context-aware voice leading
  - **Smooth**: Minimizes movement between chords
  - **Open**: Spread voicings for clarity
  - **Jazz**: Rootless/Shell voicings
- **Integration**:
  - Visualizes current chord progression
  - Exports/Syncs with external tools (Bitwig/MIDI)

### 🪐 Solar System Visualizer (`solar-system-visualizer.v2.js`)
- **Planetary Orbit System**: Visualizes scale degrees as planets orbiting a tonic sun
- **Path Tracking**: Glowing trajectories connect notes in the active progression
- **Satellite System**:
  - **Secondary Dominants (V/x)**
  - **Tritone Substitutions (bII/x)**
  - **Secondary ii (ii/x)**
  - **Leading Tone (vii°/x)**
  - **Chromatic Mediants**
- **Interactive Expansion**: Click planets to reveal/hide their satellite chords
- **Controls**:
  - **Sizing**: Theory-based (functional importance) vs Equal sizing
  - **Animation**: Play/Pause, Speed control
  - **Trajectories**: Toggle path visualization

### 🎵 Audio Visualizer
- **Real-Time Analysis**: Uses Web Audio API to visualize microphone input
- **Visualization Modes**:
  - **Bars**: Frequency spectrum analysis (FFT)
  - **Waves**: Time-domain waveform display
- **Immersive UI**:
  - Fullscreen overlay with auto-hide controls
  - Dynamic gradient coloring (Blue → Green → Yellow)
  - Responsive canvas rendering with high-DPI support

### 🎹 Bitwig/MIDI Integration (`bitwig-midi.js`)
- **Bridge to DAW**: Connects the web app to a local Python MIDI server
- **Remote Control**:
  - **Play Note/Chord**: Send real-time MIDI events to your DAW
  - **Play Progression**: Sequence full chord progressions with timing
- **Device Management**: List and select available MIDI output ports
- **Architecture**: HTTP-based JSON API for cross-application communication

## 🏗️ Module Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ModularMusicTheoryApp                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │ Number Gen  │ │Scale Library│ │Unified      │ │Progress │ │
│  │             │ │             │ │Chord Explr  │ │Builder  │ │
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
Unified Chord Explorer  → Music Theory Engine
Progression Builder     → Music Theory Engine
Container Chord Tool    → Music Theory Engine, Piano Visualizer
Scale Circle Explorer   → Music Theory Engine
Sheet Music Generator   → Music Theory Engine
Solar System Visualizer → Music Theory Engine
Audio Visualizer        → (standalone, Web Audio API)
Bitwig MIDI (optional)  → (standalone, optional)
HTML Interface          → All modules
```

## 📚 Docs Index

- Build and Run (Windows): `BUILD_AND_RUN.md`
- Testing Guide (UI + automation): `TESTING_GUIDE.md`
- Scale Verification + citation checks: `SCALE_VERIFICATION.md`
- Bitwig/DAW MIDI bridge (optional): `BITWIG_MIDI_INTEGRATION.md`
- VST3 Plugin Quickstart (optional): `vst3-plugin/QUICKSTART.md`
- VST3 Plugin Details (optional): `vst3-plugin/README.md`
- Sheet Music Quickstart: `SHEET_MUSIC_QUICKSTART.md`
- Full File Index: `FILE_INDEX.md`
- Changelog: `CHANGELOG.md`

## 📦 Installation

1. **Clone or download** the repository

2. **Open** `modular-music-theory.html` in a modern web browser

3. **Initialize** the modules you need
```html
<script src="music-theory-engine.js"></script>
<script src="sheet-music-generator.js"></script>
<script src="number-generator.js"></script>
<script src="scale-library.js"></script>
<script src="piano-visualizer.js"></script>
<script src="container-chord-tool.js"></script>
<script src="progression-builder.js"></script>
<script src="scale-circle-explorer.js"></script>
<script src="solar-system-visualizer.v2.js"></script>
<script src="audio-visualizer.js"></script>
<script src="unified-chord-explorer.js"></script>
<script src="bitwig-midi.js"></script> <!-- Optional -->
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
const chordExplorer = new UnifiedChordExplorer(musicTheory);

// Connect modules (they communicate via events)
chordExplorer.connectNumberGenerator(numberGen);
chordExplorer.connectScaleLibrary(scaleLib);

// Set key/scale
chordExplorer.setKeyAndScale('C', 'major');

// Now when numbers change, chord explorer updates automatically
numberGen.generateNumbers(4, 'diatonic'); // Chord explorer shows progression
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
const chords = new UnifiedChordExplorer(theory);
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

### UnifiedChordExplorer
```javascript
const explorer = new UnifiedChordExplorer(theory);

// Display diatonic chord grid for current key/scale
explorer.setKeyAndScale('C', 'major');

// Connect to number generator for automatic progression highlighting
const numberGen = new NumberGenerator();
explorer.connectNumberGenerator(numberGen);
numberGen.generateNumbers(3, 'diatonic'); // Explorer highlights progression

// Open radial substitution menu for a chord
const chord = {root: 'G', chordType: '7', fullName: 'G7', degree: 5};
explorer.openRadialMenu(chord, null, 0);

// Event handling
explorer.on('chordSelected', callback)
```

### ProgressionBuilder
```javascript
const progression = new ProgressionBuilder(theory);

// Connect to number generator and scale library
const numberGen = new NumberGenerator();
const scaleLib = new ScaleLibrary(theory);
progression.connectModules(numberGen, scaleLib);

// Set key/scale
progression.state.currentKey = 'C';
progression.state.currentScale = 'major';

// Set complexity and adventure parameters
progression.state.complexity = 50; // 0-100: triads to 13ths
progression.state.adventure = 50; // 0-100: diatonic to chromatic

// Generate progression from numbers (happens automatically when connected)
numberGen.generateNumbers(4, 'diatonic'); // Progression builder generates chords

// Event handling
progression.on('progressionChanged', callback);
```

### ContainerChordTool
```javascript
const containerTool = new ContainerChordTool(theory);

// Set key/scale context
containerTool.setKeyAndScale('C', 'major');

// Set input notes to find containing chords
containerTool.setInputNotes(['C', 'E']);

// Set filter complexity
containerTool.setFilter('sevenths'); // 'all', 'triads', 'sevenths', 'extended'

// Analyze and get results
containerTool.analyze(); // Finds all chords containing C and E

// Results are available in containerTool.state.results
// Each result has: {root, chordType, fullName, notes, grade, matchPercent}

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
| bitwig-midi.js |  |  |  | 61 |
| ContainerChordTool | Specialized tool for finding chords that contain specific notes with advanced filtering | class ContainerChordTool | Input for multiple notes<br>Scale/key context awareness<br>Chord grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Detailed chord information display<br>Piano visualization integration<br>Filter by complexity (triads, sevenths, extended) | 1121 |
| MusicTheoryEngine | Core music theory calculations, scales, and chord analysis used by all other modules | class MusicTheoryEngine | 60+ authentic scales from multiple traditions<br>Complete chord formula system<br>Functional harmony analysis<br>Container chord analysis<br>Scale degree calculations | 1728 |
| NumberGenerator | Scale degree number generation, transformations, and history management | class NumberGenerator | Multiple number types (Diatonic, Barry Harris, Extended, Chromatic)<br>Mathematical transformations (retrograde, invert, rotate, randomize)<br>History management with undo/redo<br>Event system for number changes | 2248 |
| PianoVisualizer | Interactive piano keyboard with scale degree and chord visualization | class PianoVisualizer | Accurate piano keyboard rendering (2 octaves)<br>Scale degree highlighting with colors<br>Colored scale degree number bubbles<br>Standard piano fingering display<br>Hand diagrams with numbered fingers<br>Note role visualization (root, third, fifth, seventh)<br>Interactive note clicking<br>Multiple visualization modes | 1461 |
| ProgressionBuilder | Generative chord progression builder with 2D control system (complexity × adventure) | class ProgressionBuilder | West-East axis: Chord Complexity (triads to 13th chords)<br>North-South axis: Harmonic Adventure (diatonic to chromatic)<br>Secondary dominants and tritone substitutions<br>Modal interchange and chromatic mediants<br>Voice leading optimization<br>Interactive progression editing | 1663 |
| ScaleCircleExplorer | Interactive circle visualization for scales and key relationships | class ScaleCircleExplorer | Circle of fifths/fourths/chromatic modes<br>Interactive key relationships<br>Scale degree highlighting<br>Chord progression visualization<br>Integration with scale library<br>Real-time updates | 800 |
| ScaleLibrary | Scale selection, key selection, and piano visualization integration | class ScaleLibrary | 60+ scales from multiple musical traditions<br>12-key selection<br>Piano visualizer showing scale degrees<br>Scale categories and organization<br>Event system for scale/key changes | 582 |
| SheetMusicGenerator | Live-rendering staff notation (treble or grand staff) with 4-bar display | class SheetMusicGenerator | Live-updates when key/scale changes<br>Live-updates when highlighted chord degree changes<br>Single staff (treble) or grand staff (treble + bass)<br>4-bar display with customizable layouts<br>Automatic note placement and accidentals<br>SVG-based lightweight rendering<br>Integration with key/scale and chord selections | 4122 |
| SolarSystemVisualizerV2 | Enhanced planetary orbit visualization with path tracking and multiple expansion | class SolarSystemVisualizer | Enhanced version with path tracking<br>Multiple simultaneous planet expansion<br>Improved trajectory visualization<br>Mouse hover interactions<br>Active path highlighting | 608 |
| UnifiedChordExplorer | Unified chord exploration with scale-based grid, progression highlighting, and intelligent radial substitution menu | class UnifiedChordExplorer | Scale chord grid showing all diatonic chords (I-VII)<br>Progression highlighting from NumberGenerator<br>Radial substitution menu with common subs and container chords<br>Intelligent positioning based on harmonic function and voice leading<br>Grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Secondary dominants, tritone subs, modal interchange<br>Container chord analysis for any selected chord | 3117 |

<!-- AUTO-GENERATED: MODULE TABLE END -->

```
music-theory-system/
├── 📄 modular-music-theory.html         # Complete application
│
├── 🎼 Core Modules
│   ├── music-theory-engine.js           # Core calculations
│   ├── sheet-music-generator.js         # Staff notation
│   ├── number-generator.js              # Number transformations
│   ├── scale-library.js                 # Scale management
│   ├── piano-visualizer.js              # Keyboard rendering
│   ├── container-chord-tool.js          # Container chord finder
│   ├── progression-builder.js           # Progression tools
│   ├── scale-circle-explorer.js         # Circle visualization
│   ├── solar-system-visualizer.v2.js    # Orbital visualization
│   ├── audio-visualizer.js              # Real-time audio viz
│   ├── unified-chord-explorer.js        # Unified chord exploration
│   └── bitwig-midi.js                   # Optional MIDI bridge
│
├── 🎨 Styling
│   ├── aperture-theme.css               # Complete theme system
│   └── unified-chord-explorer.css       # Unified chord explorer styles
│
├── 📚 Documentation
│   ├── README.md                        # This documentation
│   ├── CHANGELOG.md                     # Version history
│   ├── BUILD_AND_RUN.md                 # Setup guide
│   ├── TESTING_GUIDE.md                 # Testing procedures
│   ├── SCALE_VERIFICATION.md            # Scale validation
│   ├── SHEET_MUSIC_QUICKSTART.md        # Quick start guide
│   ├── QUICK_REFERENCE.txt              # Command reference
│   ├── READ_ME_FIRST.txt                # Getting started
│   ├── FILE_INDEX.md                    # Complete file index
│   ├── FINAL_STATUS.md                  # Project status
│   ├── SYSTEM_ARCHITECTURE.md           # Optional: VST3 architecture
│   └── BITWIG_MIDI_INTEGRATION.md       # Optional: DAW integration
│
├── 🔧 Tools & Utilities
│   ├── tools/                           # Update and validation scripts
│   ├── validation/                      # Validation reports
│   ├── logs/                            # Interaction logs
│   ├── midi output/                     # MIDI file exports
│   └── vst3-plugin/                     # Optional: VST3 plugin source
```

## 🧪 Testing

See `TESTING_GUIDE.md` for complete testing instructions including:
- Browser console tests
- Node.js headless tests
- Chord alias validation
- Citation link validation

Quick test:

```javascript
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
const theory = new MusicTheoryEngine();
const progression = new ProgressionBuilder(theory);
const numberGen = new NumberGenerator();

// Connect modules
progression.connectModules(numberGen, null);
progression.state.currentKey = 'C';
progression.state.currentScale = 'major';

// Generate numbers - progression builder responds automatically
numberGen.state.numbers = [2, 5, 1];
numberGen.emit('numbersChanged', {numbers: [2, 5, 1]});

// Access generated progression
console.log('Progression:', progression.state.currentProgression); // Array of chord objects
```

### Example 3: Unified Chord Explorer
```javascript
const theory = new MusicTheoryEngine();
const explorer = new UnifiedChordExplorer(theory);
const numberGen = new NumberGenerator();

// Connect number generator
explorer.connectNumberGenerator(numberGen);

// Display diatonic chord grid for C major
explorer.setKeyAndScale('C', 'major');

// Generate progression - explorer highlights automatically
numberGen.state.numbers = [2, 5, 1];
numberGen.emit('numbersChanged', {numbers: [2, 5, 1]});

// Progression is now highlighted in the chord grid
```
explorer.openRadialMenu({root: 'G', chordType: '7', degree: 5});
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
| bitwig-midi.js |  |  |  | 61 |
| ContainerChordTool | Specialized tool for finding chords that contain specific notes with advanced filtering | class ContainerChordTool | Input for multiple notes<br>Scale/key context awareness<br>Chord grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Detailed chord information display<br>Piano visualization integration<br>Filter by complexity (triads, sevenths, extended) | 1121 |
| MusicTheoryEngine | Core music theory calculations, scales, and chord analysis used by all other modules | class MusicTheoryEngine | 60+ authentic scales from multiple traditions<br>Complete chord formula system<br>Functional harmony analysis<br>Container chord analysis<br>Scale degree calculations | 1728 |
| NumberGenerator | Scale degree number generation, transformations, and history management | class NumberGenerator | Multiple number types (Diatonic, Barry Harris, Extended, Chromatic)<br>Mathematical transformations (retrograde, invert, rotate, randomize)<br>History management with undo/redo<br>Event system for number changes | 2248 |
| PianoVisualizer | Interactive piano keyboard with scale degree and chord visualization | class PianoVisualizer | Accurate piano keyboard rendering (2 octaves)<br>Scale degree highlighting with colors<br>Colored scale degree number bubbles<br>Standard piano fingering display<br>Hand diagrams with numbered fingers<br>Note role visualization (root, third, fifth, seventh)<br>Interactive note clicking<br>Multiple visualization modes | 1461 |
| ProgressionBuilder | Generative chord progression builder with 2D control system (complexity × adventure) | class ProgressionBuilder | West-East axis: Chord Complexity (triads to 13th chords)<br>North-South axis: Harmonic Adventure (diatonic to chromatic)<br>Secondary dominants and tritone substitutions<br>Modal interchange and chromatic mediants<br>Voice leading optimization<br>Interactive progression editing | 1663 |
| ScaleCircleExplorer | Interactive circle visualization for scales and key relationships | class ScaleCircleExplorer | Circle of fifths/fourths/chromatic modes<br>Interactive key relationships<br>Scale degree highlighting<br>Chord progression visualization<br>Integration with scale library<br>Real-time updates | 800 |
| ScaleLibrary | Scale selection, key selection, and piano visualization integration | class ScaleLibrary | 60+ scales from multiple musical traditions<br>12-key selection<br>Piano visualizer showing scale degrees<br>Scale categories and organization<br>Event system for scale/key changes | 582 |
| SheetMusicGenerator | Live-rendering staff notation (treble or grand staff) with 4-bar display | class SheetMusicGenerator | Live-updates when key/scale changes<br>Live-updates when highlighted chord degree changes<br>Single staff (treble) or grand staff (treble + bass)<br>4-bar display with customizable layouts<br>Automatic note placement and accidentals<br>SVG-based lightweight rendering<br>Integration with key/scale and chord selections | 4122 |
| SolarSystemVisualizerV2 | Enhanced planetary orbit visualization with path tracking and multiple expansion | class SolarSystemVisualizer | Enhanced version with path tracking<br>Multiple simultaneous planet expansion<br>Improved trajectory visualization<br>Mouse hover interactions<br>Active path highlighting | 608 |
| UnifiedChordExplorer | Unified chord exploration with scale-based grid, progression highlighting, and intelligent radial substitution menu | class UnifiedChordExplorer | Scale chord grid showing all diatonic chords (I-VII)<br>Progression highlighting from NumberGenerator<br>Radial substitution menu with common subs and container chords<br>Intelligent positioning based on harmonic function and voice leading<br>Grading system (★★★ Perfect, ★★ Excellent, ★ Good)<br>Secondary dominants, tritone subs, modal interchange<br>Container chord analysis for any selected chord | 3117 |

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
