# Generative Word-to-Music System

## Overview

This is a **scalable, algorithmic solution** for translating ANY word into musical attributes and chord progressions. Unlike manual word databases, this system:

- ✅ **Works with infinite vocabulary** (no hardcoded word lists)
- ✅ **Analyzes phonetics** (consonants, vowels, syllables, clusters)
- ✅ **Infers semantics** (emotional valence, arousal, context)
- ✅ **Maps to rich harmony** (extensions, alterations, voicings)
- ✅ **Generates progressions** based on word structure
- ✅ **Provides reasoning** for every musical choice

## Architecture

### Components

1. **PhoneticAnalyzer** (`phonetic-analyzer.js`)
   - Syllabification (onset-nucleus-coda)
   - Consonant classification (plosive, fricative, nasal, liquid)
   - Vowel quality analysis (brightness, openness)
   - Consonant cluster analysis
   - Musical attribute mapping

2. **ChordAttributeEngine** (`chord-attribute-engine.js`)
   - Chord symbol parser (Cmaj7, F#m11b5, Bb7alt, etc.)
   - Attribute generation (tension, brightness, density, stability)
   - Emotional quality mapping
   - Chord similarity scoring

3. **GenerativeWordMapper** (`generative-word-mapper.js`)
   - Phonetic + semantic fusion
   - Scale selection
   - Progression generation
   - Multi-word blending

4. **LexicalMusicEngineV2 Integration**
   - Backward-compatible with existing system
   - Toggleable generative vs legacy mode
   - Automatic fallback

## How It Works

### Input: Any Word(s)
```javascript
mapper.mapWords("twilight storm");
```

### Step 1: Phonetic Analysis
- **Syllables**: `twi-light`, `storm`
- **Consonants**: t, w, l, ght, s, t, r, m
  - Plosives (t, t): High tension, sharp attack
  - Liquids (w, l, r): Flowing quality
  - Fricatives (gh, s): Medium tension
- **Vowels**: i, i, o
  - Close vowels (i): Brightness
  - Open vowels (o): Darker quality
- **Clusters**: `tw`, `ght`, `st`, `rm`
  - Complex clusters → Higher voicing density

**Musical Attributes:**
- Harmonic Tension: 0.65 (medium-high)
- Brightness: 0.55 (neutral-bright)
- Voicing Density: 7th/9th
- Articulation: 0.7 (medium-sharp)

### Step 2: Semantic Inference
- **Patterns detected**: "twilight" → time:evening, valence:+0.2, "storm" → intensity:0.9, valence:-0.3
- **Morphology**: "-ight" suffix (brightness), "storm" (intensity)
- **Context**: atmospheric, dramatic

**Semantic Attributes:**
- Valence: -0.05 (neutral-dark)
- Arousal: +0.6 (high energy)
- Intensity: 0.75
- Movement: 0.7

### Step 3: Attribute Fusion
Weighted blend (default 60% phonetic, 40% semantic):
- **Brightness**: 0.53
- **Tension**: 0.63
- **Density**: 0.68
- **Movement**: 0.7

### Step 4: Scale Selection
Based on attributes:
- Brightness (0.53) → Minor/Dorian
- Tension (0.63) → Some chromatic notes
- **Result**: D Minor

### Step 5: Progression Generation
- Length based on word count (2 words → 4 chords)
- Degrees based on movement (0.7 = larger leaps)
- Chord types based on density (0.68 = 9th chords)
- **Result**: Dm9 → F9 → Am7 → Dm9

## Usage

### Standalone Test Page
```bash
# Open in browser
test-generative-system.html
```

### Integration with Main System
```javascript
// Already integrated! Just type words in the main app.
// Toggle in lexical engine:
lexicalEngine.useGenerativeSystem = true; // or false for legacy
lexicalEngine.generativeWeights = {
    phonetic: 0.6,  // Weight of sound analysis
    semantic: 0.4   // Weight of meaning analysis
};
```

### API Examples

#### Analyze Single Word
```javascript
const musicTheory = new MusicTheoryEngine();
const phonetic = new PhoneticAnalyzer();
const chordAttrs = new ChordAttributeEngine();
const mapper = new GenerativeWordMapper(phonetic, chordAttrs, musicTheory);

const result = mapper.mapWord("serenity");
console.log(result.scale);        // { root: 'C', name: 'major' }
console.log(result.progression);  // [Cmaj7, Fmaj9, Am7, Cmaj7]
console.log(result.reasoning);    // Detailed explanation
```

#### Analyze Multiple Words
```javascript
const result = mapper.mapWords("ancient forest whisper");
console.log(result.blended);      // Blended attributes
console.log(result.progression);  // Unified progression
```

#### Analyze Chord
```javascript
const analysis = chordAttrs.analyzeChord("Cmaj7#5");
console.log(analysis.attributes); // { tension: 0.45, brightness: 0.85, ... }
console.log(analysis.emotions);   // [{ emotion: 'joy', confidence: 0.8 }]
```

#### Find Similar Chords
```javascript
const similarity = chordAttrs.calculateSimilarity("Cmaj7", "Fmaj7");
console.log(similarity.similarity);      // 0.85 (very similar)
console.log(similarity.sharedQualities); // ['same quality', 'similar brightness']
```

## Phonetic → Musical Mappings

### Consonant Types → Tension
- **Plosive** (p, b, t, d, k, g): 0.8 tension, sharp attack → altered chords, staccato
- **Fricative** (f, v, s, z, sh): 0.6 tension, sustained → 9th chords, medium articulation
- **Nasal** (m, n, ng): 0.2 tension, resonant → sus4, add9, legato
- **Liquid** (l, r): 0.3 tension, flowing → maj7, smooth voice leading

### Vowel Quality → Brightness
- **Close/Front** (ee, i): 0.9 brightness → Lydian, major, high register
- **Open/Front** (a, ae): 0.7 brightness → Major, Mixolydian
- **Mid** (e, uh): 0.5 brightness → Dorian, balanced
- **Open/Back** (o, au): 0.3 brightness → Minor, low register
- **Close/Back** (oo, u): 0.2 brightness → Phrygian, Locrian

### Consonant Clusters → Voicing Density
- **No clusters**: Triads (power chords)
- **Simple clusters** (st, br): 7th chords
- **Medium clusters** (str, spl): 9th chords
- **Complex clusters** (scr, thr): 11th/13th chords

### Syllable Count → Vertical Density
- **1 syllable**: Power chords, triads
- **2 syllables**: Triads, 7th chords
- **3 syllables**: 7th, 9th chords
- **4+ syllables**: 9th, 11th, 13th chords

## Semantic → Musical Mappings

### Emotional Valence → Quality
- **Positive (+0.5 to +1.0)**: Major, Lydian, bright extensions
- **Neutral (-0.5 to +0.5)**: Dorian, Mixolydian, dominant chords
- **Negative (-1.0 to -0.5)**: Minor, Phrygian, darker colors

### Arousal → Tension
- **High (+0.5 to +1.0)**: Altered chords, chromatic scales, b9/#9
- **Medium (-0.5 to +0.5)**: Diatonic 7ths, 9ths
- **Low (-1.0 to -0.5)**: Triads, sus chords, pentatonic

### Intensity → Harmonic Density
- **High (0.7-1.0)**: 11th, 13th, complex voicings
- **Medium (0.4-0.7)**: 7th, 9th chords
- **Low (0.0-0.4)**: Triads, simple voicings

### Movement → Progression Flow
- **High (0.7-1.0)**: Large melodic leaps, cycle of 4ths/5ths
- **Medium (0.4-0.7)**: Mixed stepwise and leaps
- **Low (0.0-0.4)**: Stepwise motion, pedal tones

## Chord Attribute System

### Base Qualities
```javascript
{
    major:      { brightness: 0.8, tension: 0.2, stability: 0.9 },
    minor:      { brightness: 0.3, tension: 0.4, stability: 0.8 },
    diminished: { brightness: 0.2, tension: 0.9, stability: 0.2 },
    augmented:  { brightness: 0.9, tension: 0.8, stability: 0.3 },
    suspended:  { brightness: 0.6, tension: 0.5, stability: 0.5 },
    dominant:   { brightness: 0.6, tension: 0.6, stability: 0.5 }
}
```

### Extensions Add:
- **6th**: +0.1 tension, +0.1 brightness (sweet)
- **7th**: +0.2 tension (bluesy)
- **maj7**: +0.1 tension, +0.2 brightness (dreamy)
- **9th**: +0.15 tension, +0.15 brightness (lush)
- **11th**: +0.2 tension (modal)
- **13th**: +0.25 tension (sophisticated)

### Alterations Add:
- **b5**: +0.3 tension, -0.2 brightness (tense)
- **#5**: +0.3 tension, +0.2 brightness (anxious)
- **b9**: +0.4 tension, -0.3 brightness (dark)
- **#9**: +0.35 tension (Hendrix sound)
- **b13**: +0.3 tension (altered)
- **#11**: +0.2 tension, +0.3 brightness (Lydian)
- **alt**: +0.6 tension (outside)

## Testing

### Test Page Features
- Single word analysis with full breakdown
- Multiple word blending
- Word comparison (see differences)
- Visual attribute bars
- Chord progression display
- Phonetic syllable breakdown
- Semantic inference display

### Example Test Words
- **twilight**: Balanced, atmospheric, medium tension
- **storm**: High intensity, high arousal, dramatic
- **peace**: Low tension, positive valence, sus chords
- **chaos**: High tension, dissonance, altered chords
- **dream**: Low arousal, open voicings, airy
- **fire**: High intensity, high tension, bright

## Performance

- ⚡ **Fast**: No database lookups, pure algorithmic
- 🔄 **Scalable**: Works with ANY word, including made-up words
- 📦 **Lightweight**: ~40KB total (3 files)
- 🔌 **Modular**: Each component works independently

## Future Enhancements

1. **Machine Learning Integration**
   - Train on corpus to improve semantic inference
   - Learn phonetic-to-musical mappings from data

2. **Cultural Context**
   - Language-specific phonetic rules
   - Cultural musical associations

3. **Advanced Voicing**
   - Specific inversions based on syllable stress
   - Register distribution based on phonetic contour

4. **Rhythmic Generation**
   - Syllable timing → Note durations
   - Stress patterns → Metric placement

5. **Melodic Contour**
   - Phonetic pitch → Melodic shape
   - Vowel brightness → Melodic register

## Comparison: Generative vs Legacy

| Feature | Legacy System | Generative System |
|---------|---------------|-------------------|
| Vocabulary | ~500 words | Infinite |
| Chord types | ~7 basic types | All jazz/classical notation |
| Scale variety | 12 common | 60+ scales |
| Phonetic analysis | Basic (brightness/harshness) | Deep (syllables, clusters, IPA) |
| Semantic inference | Manual database | Algorithmic patterns |
| Extensibility | Add words manually | Automatic |
| Reasoning | Basic | Comprehensive |

## Files Created

1. **phonetic-analyzer.js** (675 lines)
   - Syllabification engine
   - Consonant/vowel classification
   - Musical attribute mapping

2. **chord-attribute-engine.js** (520 lines)
   - Chord parser
   - Attribute generator
   - Similarity scorer

3. **generative-word-mapper.js** (645 lines)
   - Phonetic + semantic fusion
   - Progression generator
   - Multi-word blending

4. **test-generative-system.html** (380 lines)
   - Interactive test interface
   - Visual attribute display
   - Comparison tools

5. **GENERATIVE_SYSTEM.md** (this file)
   - Complete documentation
   - Usage examples
   - Mapping reference

## Integration Status

✅ Added to `modular-music-theory.html`
✅ Integrated with `lexical-music-engine-v2.js`
✅ Backward compatible
✅ Toggle-able (can use legacy or generative)
✅ Automatic fallback on error

## Quick Start

1. Open `test-generative-system.html` to experiment
2. Type any word and see the analysis
3. Compare multiple words to see differences
4. Use in main app - it's already integrated!

---

**This system transforms word-to-music translation from a manual database lookup into an intelligent, scalable, algorithmic process that works with infinite vocabulary and generates rich, musically meaningful results.**
