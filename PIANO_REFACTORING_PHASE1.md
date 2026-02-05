# Piano Visualizer Centralization - Phase 1

## Overview
Refactored architecture to use a single shared `PianoVisualizer` instance instead of each module creating its own local instance. This eliminates code duplication and enables intelligent auto-sizing.

## Changes Made

### 1. PianoVisualizer Enhancements
**File**: `piano-visualizer.js`

Added intelligent auto-range calculation:
```javascript
calculateOptimalRange(midiNotes, options)
```
- Calculates min/max MIDI from highlighted notes
- Adds configurable padding (default 3 keys on each side)
- Ensures minimum keyboard width (default 12 keys)
- Returns optimal `{ startMidi, endMidi }`

Added dynamic range updating:
```javascript
updateRange(startMidi, endMidi)
```
- Updates the visible piano range without recreating the instance
- Re-renders with new range in existing container

### 2. LearnInversions Refactoring
**File**: `learn-inversions.js`

#### Before (Duplicated Code):
- Created `this._localPiano = new PianoVisualizer()`
- Manually calculated MIDI range offsets
- Manually sized keys based on container
- 100+ lines of piano setup code

#### After (Shared Piano):
- Uses `this._sharedPiano = window.modularApp.pianoVisualizer`
- Calls `calculateOptimalRange()` based on chord notes
- Piano automatically sizes to show relevant keys
- ~30 lines of setup code

#### Key Methods Updated:
- `initSharedPiano()` - Gets reference to shared piano
- `updatePianoRange()` - Uses auto-range for current inversion
- `highlightKey()` - Uses shared piano element
- `clearAllHighlights()` - Uses shared piano element
- `updateVisualization()` - Uses shared piano

## Benefits

### Code Reduction
- **Before**: Each module had 100-150 lines of piano setup
- **After**: Each module has ~30 lines calling shared piano
- **Saved**: ~70-120 lines per module

### Intelligent Auto-Sizing
Piano automatically:
- Shows only keys needed for current content
- Adds appropriate padding
- Adjusts range when root note changes
- Maintains minimum readable size

### Single Source of Truth
- One piano instance manages all rendering
- Consistent behavior across modules
- Easier to add features (drag, resize) once
- No synchronization issues

## Testing
1. Open Learn Inversions module
2. Change root note (C → G → D#)
3. Switch inversions (Root → 1st → 2nd)
4. Piano should auto-adjust range to show relevant keys
5. Click keys to play notes

## Next Phases

### Phase 2: Enhanced Auto-Sizing
- Container-aware sizing (use available width)
- Key height/width calculation based on content density
- Responsive breakpoints for mobile

### Phase 3: Apply to Other Modules
- `learn-piano-notes.js` - Use shared piano
- `learn-chords.js` - Use shared piano
- Remove all local piano instances

### Phase 4: Drag/Manual Positioning
- Add drag handles to piano container
- Save user preferences for positioning
- Add "Reset to Auto" button

## Migration Guide for Other Modules

### Step 1: Get Shared Piano Reference
```javascript
initSharedPiano() {
    if (window.modularApp && window.modularApp.pianoVisualizer) {
        this._sharedPiano = window.modularApp.pianoVisualizer;
    }
}
```

### Step 2: Calculate MIDI Range from Content
```javascript
const notesToShow = [60, 64, 67]; // Your notes
const { startMidi, endMidi } = this._sharedPiano.calculateOptimalRange(notesToShow, {
    minPadding: 3,
    maxPadding: 3,
    minKeys: 12
});
```

### Step 3: Render in Your Container
```javascript
this._sharedPiano.render({
    container: myContainer,
    startMidi,
    endMidi,
    showFingering: true,
    showNoteLabels: true,
    fitToContainer: true
});
```

### Step 4: Remove Old Local Piano Code
- Delete `new PianoVisualizer()` calls
- Delete manual key sizing calculations
- Delete manual MIDI range calculations
- Update all `this._localPiano` to `this._sharedPiano`

## Architecture Diagram

```
Before:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ LearnInversions │  │ LearnPianoNotes │  │  LearnChords    │
│  _localPiano    │  │  _localPiano    │  │  _localPiano    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     ↓ create            ↓ create            ↓ create
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ PianoVisualizer │  │ PianoVisualizer │  │ PianoVisualizer │
│   (instance)    │  │   (instance)    │  │   (instance)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

After:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ LearnInversions │  │ LearnPianoNotes │  │  LearnChords    │
│  _sharedPiano ──┼──┼─ _sharedPiano ──┼──┼─ _sharedPiano   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                   │                     │
         └───────────────────┴─────────────────────┘
                             ↓
                  ┌─────────────────────┐
                  │   ModularApp        │
                  │  pianoVisualizer    │
                  │   (shared)          │
                  └─────────────────────┘
                             ↓
                  ┌─────────────────────┐
                  │  PianoVisualizer    │
                  │  (single instance)  │
                  │  + auto-range       │
                  │  + smart sizing     │
                  └─────────────────────┘
```

## Notes
- Grading fix preserved: `showGradingTooltips: false`, `enableGradingIntegration: false`
- Guitar sound fix preserved: separate `guitarEngine` for fretboard
- Piano still plays correct sampled sounds via `audioEngine`
- Auto-range adapts to inversions: wider for 2nd inversion, compact for root position
