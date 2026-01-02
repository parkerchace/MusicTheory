# 🎵 Music Theory Studio V12

A professional, DAW-inspired music theory workstation with modular tools for composition, analysis, and learning.

## 🆕 Latest Updates (December 2025)

**📚 Academic Scale Validation & Citation System** - Complete academic validation ecosystem with 68 verified scales backed by 193+ academic sources. Automated validation pipeline processes Wikipedia, academic papers, and music theory resources. Real-time citation display with confidence indicators and validation status tracking.

**🧠 Scale Intelligence System** - Revolutionary contextually-aware scale selection with 60+ scales mapped to their cultural origins, historical contexts, and emotional characteristics. Words like "chase woods danger" now get appropriate dark/dangerous scales (locrian, phrygian_dominant) instead of inappropriate bright major scales. Includes comprehensive cultural education and intelligent variety.

**🔤 Word-to-Music Translation Engine** - Type English words like "chase, woods, dark, magic" and get scales, progressions, and rhythms suggested automatically! Enhanced with robust semantic analysis, morphological word structure analysis, and intelligent scale selection.

**🎯 Enhanced Radial Menu** - New intent filter badges (Stay Diatonic/Add Color/Go Chromatic/Containers/Surprise Me) + smart container grouping reduces clutter from 40+ chords to 5-8 organized groups.

[→ Jump to Scale Validation docs](#-academic-scale-validation--citation-system-) | [→ Jump to Scale Intelligence docs](#-new-scale-intelligence-system-) | [→ Jump to Word-to-Music docs](#-new-word-to-music-translation-system-) | [→ See design document](WORD_TO_MUSIC_DESIGN.md)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Visual Interface](#visual-interface)
- [Tutorial System](#tutorial-system)
- [Module Architecture](#module-architecture)
- [Docs Index](#docs-index)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [File Structure](#file-structure)
- [Testing](#testing)
- [Examples](#examples)

## 🎯 Overview

**Music Theory Studio V12** is a comprehensive, browser-based music theory workstation featuring:

- **🎓 Interactive Learning Modes**: Easy Mode (8-step guided tutorial) + Demo Mode (hover tooltips)
- **🎨 4 Professional Themes**: Clean DAW, Channel Strip, Matrix FX, Steam 2000
- **🎹 60+ Authentic Scales**: Western, Jazz, World Music (Middle Eastern, Indian, Japanese)
- **🔧 Modular Workspace**: Drag-and-drop modules, column/grid layouts, customizable visibility
- **🎼 Complete Harmony Tools**: Chord analysis, progression building, voice leading, reharmonization
- **📊 3 Grading Systems**: Functional (Tonic/Dominant), Emotional (Happy/Sad), Color (Synesthesia)
- **🎮 Real-Time Visualization**: Piano, Sheet Music, Circle of Fifths, Solar System orbits
- **🔗 DAW Integration**: MIDI export, Bitwig Studio bridge (optional)

Originally a monolithic HTML file, now a professional modular system with tutorial support for learners and power features for composers.

## ⚡ Quick Start

### For Beginners
1. Open `modular-music-theory.html` in your browser
2. Click **`[EASY_MODE]`** for guided 8-step tutorial
3. Follow along: Scale Selection → Circle → Patterns → Chords → Piano → Progressions

### For Composers
1. Select your scale from the top dropdown (e.g., "C Major")
2. Type chord numbers in manual input: `1 4 5 1` (press Enter)
3. Adjust complexity with the Progression Builder 2D pad
4. Export MIDI from Sheet Music module

### For Explorers
1. Enable **`[DEMO_MODE]`** (hover tooltips)
2. Try **`[LAYOUT]`** to switch column/grid layouts
3. Cycle **`[THEME]`** for different aesthetics
4. Toggle modules via **`[MODULES]`** dropdown

## ✨ Key Features

### 📚 **NEW: Academic Scale Validation & Citation System** ⭐
Complete academic validation ecosystem ensuring musical authenticity and educational value:

**Core Capabilities**:
- **Comprehensive Validation Pipeline**: Automated validation of 146 scales against academic sources
  - ✅ **68 Verified Scales**: Multiple academic sources with high confidence ratings
  - ⚠️ **76 Under Review**: Limited documentation requiring manual verification  
  - ❌ **2 Removed**: No evidence as documented musical scales
- **Academic Source Integration**: 193+ citations from Wikipedia, music theory papers, and educational resources
- **Real-Time Citation Display**: Live academic references with confidence indicators in the UI
- **Validation Status Tracking**: Each scale marked as "verified", "needs-review", or "unverified"
- **Quality Scoring System**: 0.0-1.0 confidence ratings based on source quantity and quality

**Validation Tools & Infrastructure**:
- **ValidationImporter**: Automated import of validation results into music theory engine
- **BatchReviewTool**: Manual review interface for scales requiring human verification
- **Property-Based Testing**: 22 comprehensive tests ensuring data integrity and correctness
- **Multi-System Validation**: 
  - `scale-existence-cleanup/`: Core validation engine with cultural search capabilities
  - `wikipedia-free-scale-validation/`: Wikipedia-focused validation system
  - `scale-data-scraper/`: Academic source scraping and analysis
  - `validation/`: Citation verification and reference management

**Educational Value**:
- **Source Attribution**: Direct links to academic papers, Wikipedia articles, and music theory resources
- **Cultural Context**: Historical origins, geographical traditions, and musical applications
- **Confidence Indicators**: Visual feedback on scale authenticity and documentation quality
- **Academic Integrity**: Proper citation format with URL links and quality assessments

**Example Usage**:
```javascript
// Access validation data for any scale
const scaleData = theory.getScaleData('dorian');
console.log('Validation Status:', scaleData.validationStatus); // "verified"
console.log('Sources:', scaleData.sources.length); // 7 academic sources
console.log('Quality Score:', scaleData.qualityScore); // 0.90 (90% confidence)
console.log('Best Reference:', scaleData.sources[0].url); // Direct Wikipedia link
```

**Files**: `import_validation_results.py`, `batch_review_scales.py`, `scale_validation_results.json`, `validation/` directory, `scale-existence-cleanup/`, `wikipedia-free-scale-validation/`, `scale-data-scraper/`

### 🔤 **NEW: Word-to-Music Translation System** ⭐
Transform English words into music theory suggestions using semantic analysis:

**Core Capabilities**:
- **Multi-Layer Analysis**: 5 analysis layers work together
  1. **Emotional Valence**: Words → mood → scales (e.g., "dark" → Phrygian)
  2. **Syllabic Rhythm**: Syllables → note durations (e.g., "chase" [2 syllables] → ♪♪)
  3. **Phonetic Color**: Vowel/consonant sounds → harmonic extensions
  4. **Semantic Context**: Categories (nature/urban/temporal) → progressions
  5. **Archetype Matching**: Detect famous soundtrack patterns
- **150+ Word Database**: Emotional lexicon with valence/arousal/dominance scores
- **7 Musical Archetypes**: 
  - Skyrim "Secunda" (medieval, city, ancient, epic, journey)
  - LOTR "Shire" (peaceful, pastoral, home, green, comfort)
  - Dark Souls Boss (dark, epic, struggle, monster, fear)
  - Action Chase, Mystery Forest, Celtic Journey, Sci-Fi Future
- **Adjustable Weights**: Control influence of each analysis layer (0-100%)
- **Three Order Modes**:
  - **Sequential**: Word order = chord order
  - **Weighted**: All words blend together (default)
  - **Narrative**: Creates tension arc (intro → climax → resolution)
- **Regeneration System**: Disagree with a mapping? Generate alternatives

**Example Usage**:
```
Input: "medieval, city, ancient, epic, journey"
Output: 
  ✅ Archetype: Skyrim "Secunda" (95% confidence)
  Scale: C Dorian
  Progression: Cm7 - F7 - Cm7 - F7
  Complexity: 7th chords
  Rhythm: Slow, atmospheric
```

**Files**: `lexical-music-engine.js`, `word-database.js`, `simple-word-engine.js`

### 🧠 **NEW: Scale Intelligence System** ⭐
Revolutionary contextually-aware scale selection that connects 60+ musical scales to their cultural origins, historical contexts, emotional characteristics, and semantic associations for intelligent word-to-music mapping.

**Core Problem Solved**: 
- **Before**: Words like "chase woods danger" got inappropriate bright major scales
- **After**: Dangerous words get contextually appropriate dark/dangerous scales (locrian, phrygian_dominant, harmonic minor)

**Intelligence Architecture**:
- **4-Layer Scoring System**:
  1. **Emotional Profile Matching** (40%): Darkness, energy, mystery, brightness, tension analysis
  2. **Cultural/Semantic Associations** (30%): Direct semantic category and keyword matching  
  3. **Interval Characteristics** (20%): Tension points, resolution tendencies, harmonic functions
  4. **Historical/Traditional Context** (10%): Cultural origins, musical traditions, historical periods

**Comprehensive Scale Database** (60+ scales with full cultural data):
- **Western Scales**: Major & Church Modes, Melodic/Harmonic Minor modes
- **World Music**: Middle Eastern (hijaz, persian), Japanese (hirajoshi, iwato), Indian ragas
- **Jazz/Modern**: Altered, octatonic, whole tone, bebop scales, Barry Harris scales
- **Exotic/Synthetic**: Hungarian minor, neapolitan minor, enigmatic, prometheus

**Rich Cultural Context** for each scale:
```javascript
{
  cultural: {
    origins: ['Ancient Greek', 'Medieval Church', 'Celtic'],
    period: '6th century BCE to present', 
    traditions: ['Jazz', 'Celtic', 'Folk', 'Progressive Rock'],
    characteristics: 'Bittersweet, contemplative, neither major nor minor'
  },
  semantic: {
    categories: ['contemplation', 'journey', 'ancient', 'mystical'],
    keywords: ['ancient', 'medieval', 'mystical', 'journey', 'quest'],
    contexts: ['historical', 'fantasy', 'introspection', 'travel']
  }
}
```

**Intelligent Selection Examples**:
- **"chase woods danger"** → `locrian` (unstable, dangerous) or `hungarian_minor` (exotic gypsy danger)
- **"ancient temple"** → `dorian` (ancient Greek origins, 6th century BCE) 
- **"mysterious cave"** → `enigmatic` (modern mysterious complexity) or `hijaz` (Middle Eastern mysticism)
- **"bright sunshine"** → `lydian` (dreamy, ethereal brightness) or `major_pentatonic` (universal joy)

**Educational Value**:
- Learn about scale origins and cultural traditions
- Understand historical development of musical systems
- See why certain scales fit certain moods/contexts
- Explore alternative scales with reasoning

**Variety & Intelligence**:
- **Flexible Scoring**: Allows complementary relationships, not just exact matches
- **Controlled Randomness**: Top 8 candidates with weighted selection for variety
- **Base Compatibility**: All scales maintain minimum viability for creative exploration
- **Rich Reasoning**: Detailed explanations with cultural/historical context

**Files**: `scale-intelligence-engine.js`, `simple-word-engine.js` (enhanced)

### 🎯 **Enhanced Unified Chord Explorer**
Upgraded radial substitution menu with intelligent filtering:

**New Features**:
- **Intent Filter Badges** (6 modes):
  - 🎯 **All**: Show everything (default)
  - 📊 **Stay Diatonic**: Only in-scale substitutions
  - 🌈 **Add Color**: Prioritize extensions (9ths, 11ths, 13ths)
  - 🔥 **Go Chromatic**: Altered/borrowed chords only
  - 📦 **Containers**: Just container chord options
  - 🎲 **Surprise Me**: Random exotic substitutions
- **Smart Container Grouping**: 
  - Shows 1 representative per root (e.g., "C extensions (5 opts)")
  - Click to expand and see all variants
  - Reduces visual clutter from 40+ chords to 5-8 groups
- **Improved Visual Hierarchy**: 
  - 4 tiers by harmonic distance (Perfect/Excellent/Good/Experimental)
  - Better collision avoidance in force-directed layout
- **Keyboard Shortcuts**: 
  - `1-4` keys = Jump to tier
  - `Tab` = Cycle through nodes
  - `/` = Search (planned)

**Files**: `unified-chord-explorer.js` (updated), `unified-chord-explorer.css` (updated)

### 🎓 Tutorial & Learning System
- **Easy Mode**: 8-step interactive guided tour
  - Welcome → Scale Selection → Circle of Fifths → Patterns → Chords → Piano → Progressions → Mastery
  - Visual highlights with pulsing animations
  - Progress counter and skip/next navigation
  - First-time visitor auto-offer
  - Persistent user preferences
- **Demo Mode**: Hover-activated help tooltips
  - Instant explanations for 12+ interface elements
  - Smart positioning (adapts to viewport)
  - Non-intrusive, always-available
  - Perfect for self-paced exploration

### 🎨 Professional Visual Themes
Four carefully designed workspace aesthetics:
- **Clean DAW** (Logic Pro inspired): Subtle blues, professional feel
- **Channel Strip** (Reaper inspired): Cool blues, channel routing aesthetic
- **Matrix FX** (Cyberpunk): Pure black with cyan/green accents, heavy glow
- **Steam 2000** (Retro): Olive green vintage terminal look

All themes are WCAG AAA compliant with enhanced contrast ratios for accessibility.

### 🎛️ Customizable Workspace
- **Layout Modes**:
  - **Column Layout**: Traditional 3-column DAW arrangement (Left Sidebar | Center Stage | Right Sidebar)
  - **Grid Layout**: Freeform drag-and-drop module positioning
- **Module Visibility**: Toggle any module on/off via `[MODULES]` dropdown
- **Responsive Design**: Mobile-friendly with sticky controls
- **Mini Chord Strip**: Sticky top bar showing current progression

### 📊 Three Grading Systems
Visual chord analysis from different perspectives:
1. **Functional**: Harmonic function (Tonic, Subdominant, Dominant, Leading Tone)
2. **Emotional**: Mood qualities (Happy, Sad, Bright, Dark, Mysterious)
3. **Color**: Synesthesia-inspired color mappings

### 🎹 Interactive Piano Visualizer
- **88-Key Virtual Piano**: Full keyboard with mouse/touch support
- **Smart Highlighting**:
  - Scale notes with role-based coloring (Root, 3rd, 5th, 7th)
  - Active chord voicings
  - Real-time note feedback
- **Annotations**:
  - Scale degree bubbles (Green=Natural, Purple=Sharp, Blue=Flat)
  - Optional fingering display (L/R/Both hand modes)
  - Note name overlays
- **Visual Modes**:
  - Scale Mode: Highlights all scale degrees
  - Chord Mode: Shows active chord voicings
  - Chord Stack: Vertical stacking visualization

### 🔢 Advanced Number Generator
- **Generation Modes**:
  - **Random**: Pure random within range
  - **Melodic**: Stepwise motion with occasional leaps
  - **Harmonic**: Common progressions (I-IV-V, ii-V-I, I-vi-IV-V)
  - **Chord Tones**: Arpeggios from scale harmony
  - **Functional**: Based on T/SD/D harmonic function
- **Transformations**:
  - **Retrograde**: Reverse sequence
  - **Invert**: Mirror around axis
  - **Rotate**: Circular shift left/right
  - **Randomize**: Shuffle elements
- **History**: Full undo/redo support
- **Manual Input**: Direct chord degree/name entry

### 🎼 Comprehensive Scale Library
- **68+ Academically Verified Scales** organized by category:
  - **Western**: Major, Minor (Natural/Harmonic/Melodic), All 7 Modes
  - **Jazz**: Bebop (Major/Minor/Dominant/Dorian), Barry Harris, Altered
  - **World Music**:
    - Middle Eastern: Hijaz, Maqam Rast, Maqam Bayati, Maqam Saba
    - Indian: Ragas (Bhairavi, Todi, Kafi, Bilawal)
    - Japanese: Hirajoshi, Iwato, In Sen
  - **Pentatonic/Hexatonic**: Blues, Major/Minor Pentatonic, Whole Tone
  - **Synthetic**: Diminished, Augmented, Prometheus
- **Rich Metadata with Academic Validation**:
  - Intervals, tonality, geographic origin
  - Common usage contexts and musical functions
  - **Academic citations with direct source links** (193+ references)
  - **Validation status**: Verified, Under Review, or Unverified
  - **Quality confidence scores** (0.0-1.0 based on source reliability)
- **Real-Time Updates**: Instantly propagates to all modules with citation display

### 🎯 Unified Chord Explorer
- **Diatonic Chord Grid**: Interactive I-VII chords from current scale
- **Radial Substitution System**:
  - **Functional Substitutions**: Secondary dominants, tritone subs
  - **Modal Interchange**: Borrow chords from parallel modes
  - **Chromatic Mediants**: Upper/lower third relationships
  - **Cluster Views**: Groups large substitution sets by root/family
  - **Exhaustive Mode**: Toggle to show all theoretical possibilities
- **Insertion Modes**: Add passing chords before/after any progression step
- **Visual Integration**: Real-time sync with Number Generator and Progression Builder

### 🎼 Intelligent Progression Builder
- **2D Control Pad**:
  - **X-Axis (Complexity)**: Triads → Sevenths → Extended (9/11/13)
  - **Y-Axis (Adventure)**: Diatonic (Safe) → Chromatic (Experimental)
  - Visual tier bands showing harmonic territory
- **Harmonization Modes**:
  - **Root Mode**: Numbers = chord roots
  - **Melody Mode**: Numbers = melody notes (auto-harmonize underneath)
  - **Harmony Mode**: Advanced multi-candidate selection with voice leading
- **Explore Logic**: Intelligent passing chord insertion
  - Secondary dominants and ii-V setups
  - Tritone substitutions
  - Diminished approaches
  - Voice-leading diminished chords
- **Anarchy Slider**: Controlled randomness (0% = strict rules, 100% = wild)
- **Manual Tokens**: Type extensions directly (e.g., "1maj7", "4m7", "5-9")

### 🔍 Container Chord Tool
- **Reverse Lookup**: Find scales containing specific chords
- **3-Star Grading**:
  - ★★★ Perfect: All notes + perfect scale fit
  - ★★ Excellent: All notes + minor alterations
  - ★ Good: Most notes or loose fit
- **Advanced Filters**:
  - Chord type selection (Triads/Sevenths/Extended)
  - Scale constraint toggle
  - Multi-group analysis
- **Piano Integration**: Click results to visualize on keyboard

### 🌐 Circle of Fifths Explorer
- **Interactive Canvas**: High-performance rendering
- **Multiple Arrangements**:
  - Circle of Fifths (clockwise)
  - Circle of Fourths (counter-clockwise)
  - Chromatic (linear)
- **Dynamic Highlighting**: Real-time scale degree visualization
- **Click Navigation**: Instant key modulation

### 🎼 Sheet Music Generator
- **SVG Notation**: Crisp, scalable vector graphics
- **Staff Modes**:
  - Grand Staff (Treble + Bass)
  - Treble only
  - Bass only
- **Voice Leading Algorithms**:
  - **Smart**: Context-aware, balanced
  - **Smooth**: Minimum movement between chords
  - **Open**: Wide voicings for clarity
  - **Jazz**: Rootless/shell voicings (3rd + 7th)
- **Export**: MIDI file generation
- **Real-Time Updates**: Syncs with progression changes

### 🪐 Solar System Visualizer
- **Planetary Orbit Metaphor**: Scale degrees as orbiting planets
- **Path Tracking**: Glowing trajectories show progression flow
- **Satellite System**: Expands to show chord relationships
  - Secondary dominants (V/x)
  - Tritone substitutions (bII/x)
  - Secondary ii chords (ii/x)
  - Leading tone diminished (vii°/x)
  - Chromatic mediants
- **Interactive**: Click planets to expand/collapse satellites
- **Controls**:
  - **Sizing**: Theory-based vs Equal
  - **Animation**: Play/Pause with speed control
  - **Trajectories**: Path visualization toggle

### 🎵 Audio Visualizer
- **Web Audio API**: Real-time microphone input analysis
- **Visualization Modes**:
  - **Bars**: FFT frequency spectrum
  - **Waves**: Time-domain waveform
- **Immersive UI**:
  - Fullscreen overlay
  - Auto-hide controls
  - Dynamic gradient coloring (Blue → Green → Yellow)
  - High-DPI support

### 🎹 Bitwig/MIDI Integration (Optional)
- **DAW Bridge**: Python MIDI server connection
- **Remote Control**:
  - Play individual notes/chords
  - Sequence full progressions with timing
- **Device Management**: List and select MIDI output ports
- **HTTP API**: JSON-based cross-application communication
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

## 🖥️ Visual Interface

### Workspace Layouts

**Column Layout** (Default):
```
┌─────────────────────────────────────────────────────────────────┐
│  SYSTEM::THEORY_STUDIO_V12  [Scale] [Grading] [Input] [MODULES]│
├───────────────┬─────────────────────────────┬───────────────────┤
│ LEFT SIDEBAR  │     CENTER STAGE            │  RIGHT SIDEBAR    │
├───────────────┼─────────────────────────────┼───────────────────┤
│ INPUT::       │ [Chord Strip - Sticky]      │ REF::             │
│ Number Gen    ├─────────────────────────────┤ Grading Key       │
│               │ VISUAL::Sheet Music         │                   │
├───────────────┤                             │                   │
│ REF::         ├─────────────────────────────┤                   │
│ Circle of     │ DB::Chord Explorer          │                   │
│ Fifths        │                             │                   │
│               ├─────────────────────────────┤                   │
├───────────────┤ SEQ::Progression Builder    │                   │
│ TOOL::        │                             │                   │
│ Container     ├─────────────────────────────┤                   │
│ Chord         │ SYS::Solar Visualizer       │                   │
│               │                             │                   │
└───────────────┴─────────────────────────────┴───────────────────┘
│                        PIANO VISUALIZER                         │
└─────────────────────────────────────────────────────────────────┘
```

**Grid Layout** (Drag & Drop):
- Freeform module positioning
- Drag module headers to reorder
- Collapse/expand individual modules
- Perfect for custom workflows

### Control Deck (Top Bar)
```
[SYSTEM::THEORY_STUDIO_V12] | [Root:C Scale:Major ▾] | [Grading:Functional ▾] 
| [Manual Input: "1 4 5 1"] | [MODULES ▾] | [THEME] | [LAYOUT] | [EASY_MODE] | [DEMO_MODE]
```

### Module Color Coding
Each module has a unique accent color for instant recognition:
- 🟡 **INPUT** (Amber): Number Generator
- 🟠 **REF** (Orange): Circle of Fifths, Grading Key
- 🟢 **TOOL** (Green): Container Chord
- ⚪ **VISUAL** (Grey): Sheet Music
- 🔵 **DB** (Cyan): Chord Explorer
- 💗 **SEQ** (Magenta): Progression Builder
- 🔷 **SYS** (Teal): Solar System Visualizer

### Bottom Piano Deck
- Sticky bottom position
- 88-key interactive piano
- Highlighted scale degrees
- Click to play notes/chords
- Automatic zoom on small screens

## 🎓 Tutorial System

### Easy Mode: Guided Learning
Click `[EASY_MODE]` for an 8-step interactive tutorial:

1. **Welcome & Introduction**: Understanding scales as note collections
2. **Scale Selection**: Choosing C Major (simplest scale)
3. **Circle of Fifths**: Visualizing note relationships
4. **Number Generator**: Creating patterns like "1-3-5-1"
5. **Building Chords**: Harmony fundamentals
6. **Piano Visualizer**: Playing and hearing your scale
7. **Chord Progressions**: Classic patterns like "1-4-5-1"
8. **Next Steps**: Mastering Demo Mode and exploration

**Features**:
- Visual highlights with pulsing animations
- Progress counter (Step X of 8)
- Skip/Next navigation
- First-time visitor auto-offer
- Persistent preferences (won't ask again)

### Demo Mode: On-Demand Help
Click `[DEMO_MODE]` to enable hover tooltips:

**Covered Elements**:
- Scale Selector, Circle of Fifths, Number Generator
- Container Chord Tool, Sheet Music Generator
- Chord Explorer, Piano Visualizer
- Manual Chord Input, Grading View
- Theme Switcher, Layout Toggle, Module toggles

**Smart Features**:
- Auto-positioning (adapts to viewport edges)
- Non-blocking (pointer-events: none)
- Fade-in animations
- Module-specific explanations

### Tutorial Documentation
- **Quick Reference**: `TUTORIAL_QUICK_REFERENCE.txt` (visual ASCII guide)
- **Developer Docs**: `TUTORIAL_SYSTEM.md` (implementation details)
- **Integration**: Tutorial state persists across sessions

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

**Getting Started**:
- Quick Tutorial: Click `[EASY_MODE]` in the app for guided tour
- Tutorial Quick Reference: `TUTORIAL_QUICK_REFERENCE.txt`
- Tutorial System Documentation: `TUTORIAL_SYSTEM.md`

**Setup & Testing**:
- Build and Run (Windows): `BUILD_AND_RUN.md`
- Testing Guide (UI + automation): `TESTING_GUIDE.md`
- Sheet Music Quickstart: `SHEET_MUSIC_QUICKSTART.md`

**Scale Validation & Academic Sources**:
- Scale Validation Report: `SCALE_VALIDATION_REPORT.md`
- Validation Results Data: `scale_validation_results.json`
- Import Validation Tool: `import_validation_results.py`
- Batch Review Tool: `batch_review_scales.py`

**Advanced Features**:
- Scale Verification + citation checks: `SCALE_VERIFICATION.md`
- Bitwig/DAW MIDI bridge (optional): `BITWIG_MIDI_INTEGRATION.md`
- VST3 Plugin Quickstart (optional): `vst3-plugin/QUICKSTART.md`
- VST3 Plugin Details (optional): `vst3-plugin/README.md`

**Reference**:
- System Architecture: `SYSTEM_ARCHITECTURE.md`
- Theme Reference: `THEME_REFERENCE.md`
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
│   ├── scale-intelligence-engine.js     # 🆕 Contextual scale intelligence system
│   ├── simple-word-engine.js            # 🆕 Enhanced word-to-music engine
│   ├── lexical-music-engine.js          # 🆕 Word-to-music translation (legacy)
│   ├── word-database.js                 # 🆕 150+ word emotional lexicon
│   └── bitwig-midi.js                   # Optional MIDI bridge
│
├── 🎨 Styling
│   ├── aperture-theme.css               # Complete theme system
│   └── unified-chord-explorer.css       # Unified chord explorer styles (updated)
│
├── 📚 Documentation
│   ├── README.md                        # This documentation (updated)
│   ├── SCALE_VALIDATION_REPORT.md       # 🆕 Complete academic validation report (68 verified scales)
│   ├── SCALE_INTELLIGENCE_SYSTEM.md     # 🆕 Scale Intelligence System documentation
│   ├── IMPLEMENTATION_COMPLETE_V2.md    # 🆕 Scale Intelligence implementation status
│   ├── SCALE_VARIETY_FIX.md             # 🆕 Scale variety enhancement details
│   ├── DEBUGGING_MAIN_APP_ISSUE.md      # 🆕 Main app vs test file debugging
│   ├── WEIGHT_FIX_TEST.md               # 🆕 Weight display fix documentation
│   ├── WORD_TO_MUSIC_DESIGN.md          # 🆕 Word-to-music system design
│   ├── WORKSPACE_CLEANUP_COMPLETE.md    # 🆕 Validation system integration status
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
│   ├── validation/                      # 🆕 Academic validation framework (19 modules)
│   ├── scale-existence-cleanup/         # 🆕 Core validation engine with cultural search
│   ├── wikipedia-free-scale-validation/ # 🆕 Wikipedia-focused validation system  
│   ├── scale-data-scraper/              # 🆕 Academic source scraping and analysis
│   ├── logs/                            # Interaction logs
│   ├── midi output/                     # MIDI file exports
│   └── vst3-plugin/                     # Optional: VST3 plugin source
│
├── 🧪 Testing & Diagnostics
│   ├── test-simple-engine.html          # 🆕 Scale Intelligence Engine testing
│   ├── test-scale-intelligence.html     # 🆕 Scale Intelligence diagnostic tool
│   ├── test-word-improvements.html      # Word analysis testing
│   ├── test-word-responsiveness.html    # Word responsiveness testing
│   ├── test-generative-system.html      # Generative system testing
│   ├── test-generative-improvements.html # Generative improvements testing
│   ├── import_validation_results.py     # 🆕 Validation data import tool
│   ├── batch_review_scales.py           # 🆕 Manual scale review interface
│   ├── test_import_validation_results.py # 🆕 Import tool property-based tests
│   ├── test_batch_review_scales.py      # 🆕 Review tool property-based tests
│   └── scale_validation_results.json    # 🆕 Complete validation dataset (146 scales)
```

## 🧪 Testing & Debugging

### Academic Validation Testing
The project includes comprehensive property-based testing for the validation system:

**🔬 Property-Based Tests** (22 tests total):
- **Import Validation Tests** (`test_import_validation_results.py`):
  - Data integrity validation during import process
  - Scale metadata consistency checks  
  - Citation format and URL validation
  - Confidence score boundary testing
- **Batch Review Tests** (`test_batch_review_scales.py`):
  - Manual review workflow validation
  - Progress tracking and state management
  - Review decision consistency checks
  - Export format validation

**🛠️ Validation Tools**:
- **ValidationImporter**: Automated import of validation results with integrity checks
- **BatchReviewTool**: Manual review interface for scales requiring human verification
- **Property Testing**: Hypothesis-based testing ensuring correctness across all inputs

**📊 Validation Pipeline**:
```bash
# Run validation import with testing
python test_import_validation_results.py  # 11 property-based tests
python test_batch_review_scales.py        # 11 property-based tests

# Import validated scale data
python import_validation_results.py

# Manual review of unverified scales  
python batch_review_scales.py
```

### Built-in Debug Tools
The application includes comprehensive debugging tools accessible without opening browser console:

**🔍 Debug Button** (in Word Analysis panel):
- Scale Intelligence Engine status and initialization
- Word engine configuration and scale database size  
- Recent translation results and scale selections
- Copy debug info to clipboard

**📋 Copy Log Button** (in Word Analysis panel):
- Complete lexical analysis session log
- Formatted for easy sharing and analysis
- Includes timestamps, inputs, scales, progressions, and reasoning

**Test Files for Diagnostics**:
- `test-scale-intelligence.html` - Isolated Scale Intelligence Engine testing
- `test-simple-engine.html` - Enhanced word engine testing with variety checks
- Shows cultural context, intelligence scores, and alternative scales

### Comprehensive Testing
See `TESTING_GUIDE.md` for complete testing instructions including:
- Browser console tests
- Node.js headless tests  
- Chord alias validation
- Citation link validation
- Scale Intelligence Engine validation
- **Academic validation pipeline testing**
- **Property-based testing for validation tools**

### Validation System Architecture
The academic validation system consists of multiple integrated components:

**🏗️ Core Systems**:
- **`scale-existence-cleanup/`**: Core validation engine with cultural search capabilities (15 modules)
- **`wikipedia-free-scale-validation/`**: Wikipedia-focused validation system (TypeScript, 12 modules)  
- **`scale-data-scraper/`**: Academic source scraping and analysis (TypeScript, 6 modules)
- **`validation/`**: Citation verification and reference management (19 modules)

**📋 Validation Workflow**:
1. **Source Collection**: Automated scraping of Wikipedia, academic papers, music theory sites
2. **Content Analysis**: NLP analysis of source content for scale-specific information
3. **Quality Assessment**: Confidence scoring based on source reliability and content relevance
4. **Citation Verification**: URL validation, content freshness, and academic credibility checks
5. **Integration**: Automated import into music theory engine with validation status tracking
6. **Manual Review**: Human verification interface for borderline cases

**🔍 Quality Metrics**:
- **Source Count**: Number of independent academic sources found
- **Content Relevance**: NLP analysis of scale-specific content in sources
- **Source Authority**: Wikipedia, academic institutions, established music theory sites
- **Citation Quality**: URL accessibility, content depth, publication credibility

Quick test:

```javascript
// Test Scale Intelligence Engine
const scaleIntelligence = new ScaleIntelligenceEngine();
const result = scaleIntelligence.selectScale({
    darkness: 0.8, energy: 0.7, words: ['danger', 'chase']
});
console.log('Selected:', result.name, 'Score:', result.score);

// Test specific module
const theory = new MusicTheoryEngine();
console.log(theory.getScaleNotes('C', 'major')); // Should log scale notes
```

## 💡 Examples

### Example 1: Academic Scale Validation System (NEW)
```javascript
const theory = new MusicTheoryEngine();

// Access validation data for any scale
const dorianData = theory.getScaleData('dorian');
console.log('Validation Status:', dorianData.validationStatus);     // "verified"
console.log('Quality Score:', dorianData.qualityScore);             // 0.90 (90% confidence)
console.log('Academic Sources:', dorianData.sources.length);        // 7 sources
console.log('Best Reference:', dorianData.sources[0].url);          // Wikipedia link
console.log('Citation Quality:', dorianData.sources[0].quality);    // 0.9

// Check validation status across all scales
const allScales = theory.getAllScales();
const verifiedScales = allScales.filter(scale => 
    theory.getScaleData(scale).validationStatus === 'verified'
);
console.log('Verified Scales:', verifiedScales.length);             // 68 scales

// Access detailed source information
dorianData.sources.forEach((source, index) => {
    console.log(`Source ${index + 1}:`, source.title);
    console.log('URL:', source.url);
    console.log('Snippet:', source.snippet);
    console.log('Quality Rating:', source.quality);
});

// Use validation tools (Python)
// python import_validation_results.py  # Import latest validation data
// python batch_review_scales.py        # Manual review interface for unverified scales
```

### Example 2: Scale Intelligence System (NEW)
```javascript
const theory = new MusicTheoryEngine();
const wordEngine = new SimpleWordEngine(theory);

// Intelligent scale selection for dangerous words
const result = await wordEngine.translateWords("chase woods danger");

console.log('Scale:', result.scale);                    // e.g., { root: 'F#', name: 'locrian' }
console.log('Intelligence Score:', result.reasoning.intelligenceScore); // e.g., 0.87 (87%)
console.log('Cultural Context:', result.reasoning.culturalContext);     // "Ancient Greek, Theoretical, Modern Jazz/Metal"
console.log('Historical Context:', result.reasoning.historicalContext); // "6th century BCE, rarely used until 20th century"

// See alternative scales that were considered
console.log('Alternatives:', result.reasoning.alternatives);
// [
//   { name: 'phrygian_dominant', score: 0.85, reason: 'exotic, threatening' },
//   { name: 'hungarian_minor', score: 0.82, reason: 'gypsy exotic danger' },
//   { name: 'altered', score: 0.79, reason: 'jazz dissonance for danger' }
// ]

// Direct Scale Intelligence Engine usage
const scaleIntelligence = new ScaleIntelligenceEngine();
const characteristics = {
    darkness: 0.8, energy: 0.7, mystery: 0.6, brightness: 0.1, tension: 0.9,
    words: ['chase', 'woods', 'danger']
};

const scaleSelection = scaleIntelligence.selectScale(characteristics);
console.log('Selected Scale:', scaleSelection.name);           // e.g., 'hungarian_minor'
console.log('Confidence:', Math.round(scaleSelection.score * 100) + '%'); // e.g., '82%'
console.log('Reasoning:', scaleSelection.primaryReason);       // e.g., 'matches dark character (80%)'
console.log('Cultural Origins:', scaleSelection.data.cultural.origins); // ['Hungarian', 'Gypsy', 'Eastern European']
```

### Example 3: Word-to-Music Translation (Enhanced)
```javascript
const theory = new MusicTheoryEngine();
const wordEngine = new SimpleWordEngine(theory);

// Enhanced word analysis with Scale Intelligence
const result = await wordEngine.translateWords("ancient temple mystery");

console.log('Scale:', result.scale);              // e.g., { root: 'D', name: 'dorian' }
console.log('Progression:', result.progression);  // e.g., [Dm7, Gm7, Am7, Dm7]
console.log('Character Analysis:', result.character); // { darkness: 0.4, mystery: 0.8, ... }

// Rich reasoning with cultural context
console.log('Scale Choice:', result.reasoning.scaleChoice);
// "Scale Intelligence: matches mysterious character (85%) → dorian (Ancient Greek origins, 6th century BCE)"

console.log('Cultural Context:', result.reasoning.culturalContext);
// "Cultural origins: Ancient Greek, Medieval Church, Celtic. Historical period: 6th century BCE to present."

// Multiple analysis layers working together
console.log('Word Analyses:', result.analyses);
// [
//   { word: 'ancient', darkness: 0.5, mystery: 0.8, source: 'semantic' },
//   { word: 'temple', mystery: 0.9, calm: 0.6, source: 'direct' },
//   { word: 'mystery', mystery: 1.0, source: 'direct' }
// ]
```

### Example 4: Enhanced Radial Menu with Filters (NEW)
```javascript
const theory = new MusicTheoryEngine();
const explorer = new UnifiedChordExplorer(theory);

// Set filter mode before opening radial menu
explorer.setRadialFilterMode('diatonic');  // Only show in-scale substitutions

// Open radial menu for a chord
explorer.openRadialMenu({root: 'G', chordType: '7', degree: 5, fullName: 'G7'}, event);

// Change filter on the fly
explorer.setRadialFilterMode('color');     // Switch to colorful extensions
explorer.setRadialFilterMode('chromatic'); // Switch to altered/borrowed chords
explorer.setRadialFilterMode('surprise');  // Random exotic substitutions

// Container chord grouping is automatic:
// Instead of showing: Cmaj7, Cmaj9, Cmaj11, Cmaj13, C6, C6/9, Cadd9, ...
// Shows: "C extensions (7 opts)" - click to expand
```

### Example 5: Simple Scale Analysis
```javascript
const theory = new MusicTheoryEngine();
const scales = new ScaleLibrary(theory);

scales.setKeyAndScale('C', 'dorian');
const notes = scales.getCurrentScaleNotes();
console.log('Dorian scale:', notes); // C, D, Eb, F, G, A, Bb
```

### Example 6: Chord Progression Building
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

### Example 7: Unified Chord Explorer
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

### Example 8: Interactive Piano
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

### Example 9: Container Chord Analysis
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

### Example 10: Circle of Fifths Visualization
```javascript
const circle = new ScaleCircleExplorer(theory);
circle.setMode('fifths');
circle.setKey('C', 'major');
circle.showScaleLines(true);

circle.on('keySelected', (data) => {
    console.log('Selected key:', data.key);
});
```

### Example 11: Sheet Music Rendering
```javascript
const sheetMusic = new SheetMusicGenerator(theory);
sheetMusic.setKeyAndScale('C', 'major');
sheetMusic.setChord({root: 'C', chordType: 'maj7'});
sheetMusic.setStaffType('grand');
sheetMusic.renderStaff();
```

### Example 12: Solar System Scale Visualization
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

### Example 13: Audio Visualization
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

- **68+ academically verified scales** from multiple musical traditions with 193+ citations
- **Professional chord analysis** with functional harmony and academic validation
- **Advanced progression techniques** from jazz theory with source attribution
- **Interactive visualization** for music education with academic integrity
- **Comprehensive validation pipeline** ensuring educational authenticity and musical accuracy
- **Academic sources** including Wikipedia, music theory institutions, and peer-reviewed resources

---

**Ready to explore music theory in a modular way!** 🎼✨
