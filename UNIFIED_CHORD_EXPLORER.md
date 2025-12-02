# Unified Chord Explorer - Feature Consolidation

## Problem: Duplicated Functionality

Previously, chord exploration was split across **three separate tools** with overlapping features:

### 1. ChordAnalyzer (`chord-analyzer.js`)
- Showed chords containing specific notes
- Functional harmony grouping (Tonic, Dominant, Predominant)
- Filter by complexity (triads, 7ths, extended)
- Grid-based card display

### 2. ContainerChordTool (`container-chord-tool.js`)
- Find chords containing specific input notes
- Grading system (★★★ Perfect, ★★ Excellent, ★ Good)
- Scale-based filtering
- Detailed chord role information

### 3. ProgressionBuilder (`progression-builder.js`)
- Generate progressions from scale degrees
- Substitution logic (secondary dominants, tritone subs)
- ii-V setups, modal interchange
- Voice leading optimization

**Result:** Users had to switch between tools, re-enter context, and mentally track which tool did what.

---

## Solution: Unified Chord Explorer

A **single, integrated interface** that combines all three capabilities:

### Core Concept
```
┌─────────────────────────────────────────────────┐
│  Scale Chord Grid (I-VII)                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  I   │ │ ii   │ │ iii  │ │ IV   │  ← All    │
│  │ Cmaj7│ │ Dm7  │ │ Em7  │ │Fmaj7 │    scale  │
│  └──────┘ └──────┘ └──────┘ └──────┘    chords │
│                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │  V   │ │ vi   │ │viiø  │                    │
│  │  G7  │ │ Am7  │ │ Bm7♭5│                    │
│  └──────┘ └──────┘ └──────┘                    │
│                                                  │
│  HIGHLIGHTED: Chords from your progression      │
│  (e.g., 2-5-1 → Dm7, G7, Cmaj7)                │
│                                                  │
│  CLICK ANY HIGHLIGHTED CHORD → Radial Menu      │
└─────────────────────────────────────────────────┘
```

### Radial Substitution Menu
When you click a highlighted chord, an **intelligent radial menu** appears:

```
              [V/ii]
              G7 (★★)
                |
                |
   [♭II7]──────[Original]──────[relative]
  Db7 (★)      Dm7            F (★★★)
                |
                |
             [ii→V]
             Em7 (★★)
```

**Intelligent Positioning Logic:**
- **Top (-90°):** Secondary dominants
- **Top-right (-45°):** Tritone substitutions
- **Right (0-90°):** Container chords (spread)
- **Bottom (180°):** ii-V setups
- **Left/Top-left:** Modal interchange

**Grading:**
- **★★★ Perfect:** All notes in scale, minimal additions
- **★★ Excellent:** 1-2 chromatic notes, strong voice leading
- **★ Good:** More alterations, still functional

---

## Feature Improvements

### 1. Unified Context
- **One view** shows: scale chords + progression + substitutions
- No more switching tools or re-entering key/scale
- Instant visual feedback

### 2. Intelligent Substitution Categorization
Consolidates logic from ProgressionBuilder:
- **Secondary Dominants:** V/degree (e.g., V/ii, V/IV)
- **Tritone Substitutions:** ♭II7 resolution
- **ii-V Setups:** Add ii before any chord
- **Modal Interchange:** Borrowed chords (e.g., iv from minor)
- **Chromatic Mediants:** Parallel/relative mode shifts

Plus logic from ContainerChordTool:
- **Container Chords:** Finds chords that include your original notes
- **Graded by fit:** How many extra notes, are they in scale?

### 3. Harmonic Distance Positioning
The radial menu positions substitutions based on:
- **Functional relationship** (dom→tonic, predominant→dom)
- **Voice leading distance** (common tones, semitone movement)
- **Chromatic vs. diatonic** (scale chords closer, chromatics farther)

### 4. Progressive Disclosure
- **Simple view:** Just scale chords
- **Progression context:** Highlight your numbers
- **Deep exploration:** Click for substitutions
- No cognitive overload

---

## Usage Example

### Scenario: Jazz ii-V-I in C Major

1. **Set context:** C major scale
2. **Generate progression:** Numbers 2, 5, 1
3. **Explorer shows:**
   ```
   Grid of 7 chords (Cmaj7, Dm7, Em7, Fmaj7, G7, Am7, Bø)
   HIGHLIGHTED: Dm7 (ii), G7 (V), Cmaj7 (I)
   ```

4. **Click G7 (the V)** → Radial menu opens:
   ```
   Top: D7 (★★) - V/V (secondary dominant)
   Top-right: D♭7 (★) - Tritone sub for G7
   Right: G13 (★★★) - Container chord (extends G7)
   Bottom: Am7 (★★★) - Add ii-V from vi
   Left: G7sus4 (★★) - Suspension variant
   ```

5. **Select D♭7** → Progression becomes: Dm7 - D♭7 - Cmaj7
   - Event emitted: `substitutionSelected`
   - Can update sheet music, piano viz, etc.

---

## Technical Architecture

### Class Structure
```javascript
class UnifiedChordExplorer {
  // State
  state: {
    scaleChords: [],          // I-VII diatonic
    progressionDegrees: [],   // From NumberGenerator
    selectedChord: null,
    substitutions: [],
    radialMenuOpen: bool
  }

  // Core Methods
  generateScaleChords()       // Get I-VII from engine
  generateSubstitutions()     // Logic from all 3 tools
  openRadialMenu()            // Show intelligent layout
  gradeContainerChord()       // ★★★/★★/★ system
  
  // Integration
  connectNumberGenerator()    // Listen to number changes
  emit('substitutionSelected') // Notify other modules
}
```

### Event Flow
```
NumberGenerator → numbersChanged
    ↓
UnifiedExplorer → highlight progression chords
    ↓
User clicks highlighted chord
    ↓
UnifiedExplorer → generate substitutions
    ↓
Radial menu renders with intelligent layout
    ↓
User selects substitution
    ↓
Event: substitutionSelected → {original, substitution}
    ↓
Other modules update (piano, sheet music, etc.)
```

---

## Improvements Over Original Tools

### vs. ChordAnalyzer
- ✅ **Better:** Shows scale context first, then substitutions
- ✅ **Better:** Progression highlighting built-in
- ✅ **Better:** Radial layout vs. long scrolling list

### vs. ContainerChordTool
- ✅ **Better:** Integrated with progression workflow
- ✅ **Better:** Shows containers + substitutions together
- ✅ **Better:** Grading logic enhanced with substitution rules

### vs. ProgressionBuilder
- ✅ **Better:** Visual exploration vs. automatic generation
- ✅ **Better:** User control over substitutions
- ✅ **Better:** See all options at once with grades

---

## Migration Path

### For Users
1. **Keep existing tools** for now (backward compatibility)
2. **Try UnifiedChordExplorer** via demo: `unified-chord-explorer-demo.html`
3. **Feedback cycle:** Refine radial positioning, add more sub types
4. **Eventually deprecate** old tools once feature parity confirmed

### For Developers
```javascript
// Old way (3 separate modules):
const analyzer = new ChordAnalyzer(engine);
const container = new ContainerChordTool(engine);
const builder = new ProgressionBuilder(engine);
analyzer.analyzeChords(notes, 'C', 'major');
// ...switch tools, re-enter context...

// New way (unified):
const explorer = new UnifiedChordExplorer(engine);
explorer.connectNumberGenerator(numberGen);
explorer.setKeyAndScale('C', 'major');
// Progression auto-highlights, click for subs
```

---

## Suggested Future Enhancements

1. **Drag-to-reorder:** Rearrange progression by dragging cards
2. **Multi-select:** Compare substitutions for multiple chords
3. **Substitution chains:** Show full ii-V-I package in radial menu
4. **Custom substitution rules:** User-defined sub libraries
5. **Voice leading preview:** Hear/see notes move when subbing
6. **Export progression:** Save as MIDI, MusicXML, or JSON
7. **History/Undo:** Track substitution choices
8. **Substitution hints:** AI suggestions based on style (bebop, modal, fusion)

---

## Files Created

1. **`unified-chord-explorer.js`** (546 lines)
   - Core logic and radial menu system
   
2. **`unified-chord-explorer.css`**
   - Beautiful dark theme with animations
   - Radial menu styling with grade colors
   
3. **`unified-chord-explorer-demo.html`**
   - Standalone demo with controls
   - Shows progression generation workflow

---

## Demo Instructions

1. Open `unified-chord-explorer-demo.html` in a browser
2. Select key (e.g., C) and scale (e.g., major)
3. Click "Generate Random Progression"
4. See highlighted chords in the grid
5. **Click any highlighted chord** → Radial menu appears
6. Hover over substitutions to see grades and descriptions
7. Click a substitution → Alert shows what changed
8. Experiment with different keys/scales!

---

## Summary

**Before:** 3 tools, duplicated code, fragmented UX  
**After:** 1 unified tool, intelligent radial menu, seamless workflow

**Result:** Faster exploration, clearer options, better decisions. 🎵✨
