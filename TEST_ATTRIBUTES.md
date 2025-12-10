# Musical Attributes System - Test Guide

## What's New

### 1. Rich Musical Attributes (13 calculators)
Each word now generates:
- **Tension** (0-1): Arousal + conflict keywords
- **Color**: warmth, brightness, saturation
- **Texture**: density, spread, weight
- **Motion**: speed, direction, smoothness
- **Register**: preferred octave, range, emphasis
- **Intervals**: consonance, preferred intervals, avoided intervals

### 2. Evocative Reasoning
The analysis now uses emojis and composer references:
- 🔥 Fire/energy, 🌙 Dark/mysterious, ✨ Bright/sparkly
- ☀️ Warm/positive, 🌊 Fluid/flowing, 🦅 Soaring
- References: John Williams, Debussy, Gershwin, Brahms, Sibelius

### 3. Piano Voicing System
Chords are now voiced for piano with:
- **Register placement** based on arousal/tension
- **Density** (note count) from texture.density
- **Spread** (spacing) from texture.spread
- **Range** (octave span) from rangeOctaves

### 4. Enhanced UI
- Analysis panel now shows all attributes with percentages/bars
- Open by default with collapsible sections
- Color-coded emojis for quick visual scanning

## Test Cases

### Test 1: "lonely cosmic fire"
**Expected:**
- **lonely**: Low valence → flat keys, phrygian/aeolian mode
  - Tension: 40-50%
  - Warmth: 30-40%
  - Register: mid-low
  - Motion: descending
  
- **cosmic**: Neutral → ethereal, spacious
  - Tension: 20-30%
  - Spread: 70-80% (wide)
  - Register: high
  - Range: 3+ octaves
  
- **fire**: High arousal → sharp keys, bright
  - Tension: 80-90%
  - Warmth: 90-100%
  - Direction: ascending
  - Register: high

**Aggregated result:**
- Key: Should vary (not always C or E aeolian)
- Mode: Mix of phrygian/aeolian with possible lydian from "cosmic"
- Piano voicing: Wide spread (2.5-3.5 octaves), mid-high register
- Progression: Should have both minor and varied chords

### Test 2: "gentle morning sunlight"
**Expected:**
- All positive valence → sharp keys (D, A, E, B, F#)
- Mode: Lydian or major
- Low tension (20-40%)
- High warmth (70-90%)
- Smooth motion (70-90%)
- Mid register with moderate spread

### Test 3: "violent stormy chaos"
**Expected:**
- High arousal, negative valence
- Mode: Locrian or phrygian
- Very high tension (90-100%)
- Dense texture (80-100%)
- Wide spread for chaos
- High register
- Avoided intervals: tritones preferred, consonances avoided

### Test 4: "soft whisper dream"
**Expected:**
- Low arousal, neutral valence
- Mode: Dorian or aeolian
- Low tension (10-30%)
- Low density (sparse, 30-40%)
- Tight spread (close voicing)
- Low register
- Preferred intervals: 3rds, 6ths (consonant)

## How to Test

1. **Open** `modular-music-theory.html` in browser
2. **Enable** "Settings → Auto-send to Sheet Music"
3. **Enter** test phrase in "Global Word Input"
4. **Check** analysis panel (should be open by default):
   - Word-by-word analysis with attributes
   - Evocative reasoning with emojis
   - Musical attributes percentages
5. **Verify** scale changes (not always aeolian)
6. **Check** console for:
   - "Aggregated musical attributes:" log
   - Piano voicing reasoning
7. **Test** undo/redo (Ctrl+Z, Ctrl+Y)
8. **Verify** sheet music displays automatically

## Expected Console Logs

```javascript
// Should see:
Aggregated musical attributes: {
  tension: 0.65,
  warmth: 0.72,
  brightness: 0.58,
  density: 0.54,
  spread: 0.68,
  smoothness: 0.45,
  preferredRegister: 'high',
  rangeOctaves: 3.2,
  preferredIntervals: ['perfect 5th', 'major 3rd', 'major 6th'],
  avoidedIntervals: ['minor 2nd', 'tritone']
}

// Piano voicing:
Register: high, Density: 54%, Spread: 68%, Range: 3.2 oct
```

## Known Issues to Check

1. **Global references**: Verify `window.numberGenerator` and `window.scaleLibrary` are accessible
2. **Sheet music**: Should auto-update when auto-send is enabled
3. **Undo/redo**: Should restore scale, chords, and sheet music
4. **Attribute display**: All percentages should show correctly (not NaN)
5. **Emojis**: Should render properly in analysis panel

## Success Criteria

✅ Keys vary (not stuck on C/E aeolian)
✅ Modes vary based on word emotions
✅ Analysis shows rich attributes with emojis
✅ Piano voicings have MIDI notes
✅ Sheet music auto-updates
✅ Undo/redo works
✅ Console shows aggregated attributes
✅ No JavaScript errors in console
