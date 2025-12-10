# Word-to-Music System: Core Issues, Fix Plan, and Next Steps

## Current State & Core Issues

### 1. Root Selection
- **Problem:** System always uses C as root, regardless of word input or musical context.
- **Impact:** Progressions lack variety and musical relevance; fails to evoke intended moods or settings.

### 2. Diatonic Chord Generation
- **Problem:** Chord selection is not truly diatonic; non-diatonic chords are added without clear musical justification.
- **Impact:** Progressions can sound random, lack harmonic coherence, and ignore scale/mode context.

### 3. Functional Harmony
- **Problem:** No real functional harmony; progressions lack direction (Tonic, Predominant, Dominant functions are not considered).
- **Impact:** Generated music feels static, unmusical, and fails to support narrative or emotional arcs.

### 4. Emotional/Philosophical Mapping
- **Problem:** System does not reason about word meaning in musical terms (no mapping of emotional valence, tension, or archetype).
- **Impact:** Words do not reliably evoke corresponding musical moods, archetypes, or soundtrack tropes.

### 5. Module Integration
- **Problem:** Existing modules for scale, chord, function, and voice leading are not leveraged in word→music mapping.
- **Impact:** Redundant logic, missed opportunities for richer output, and poor maintainability.

### 6. Per-Chord Scale/Mode Labeling
- **Problem:** No labeling of scale/mode for each chord in the progression; lacks transparency and educational value.
- **Impact:** Users cannot see or learn how words map to theory; system is a "black box".

---

## Comprehensive Fix Plan

### 1. Root Selection Logic
- Analyze word input for context (e.g., "medieval" → Dorian, "dark" → Phrygian) and select musically relevant root.
- Use emotional valence, archetype matching, and semantic categories to guide root choice.

### 2. True Diatonic Chord Generation
- Generate chords strictly within the selected scale/mode unless intentional chromaticism is justified by word meaning.
- Use scale library and progression builder modules for authentic diatonic progressions.

### 3. Functional Harmony Engine
- Assign functional roles (Tonic, Predominant, Dominant) to chords in generated progressions.
- Use functional grading and voice leading modules to ensure musical direction and resolution.

### 4. Emotional & Archetype Mapping
- Map words to emotional dimensions (valence, tension, brightness) and soundtrack archetypes (Skyrim, LOTR, Dark Souls, etc.).
- Use multi-layer analysis: emotional valence, syllabic rhythm, phonetic color, semantic context, archetype matching.

### 5. Full Module Integration
- Refactor word→music logic to leverage:
  - `music-theory-engine.js` (scales, chords, analysis)
  - `progression-builder.js` (progression logic)
  - `voice-leading-engine.js` (smooth transitions)
  - `unified-chord-explorer.js` (substitutions, grading)
  - `scale-library.js` (scale selection)
- Ensure all mappings and outputs use existing module APIs for consistency and maintainability.

### 6. Per-Chord Scale/Mode Labeling
- Label each chord in the output progression with its scale/mode context and functional role.
- Display this information in the UI for transparency and educational value.

### 7. Regeneration & User Control
- Allow users to regenerate mappings for any word, cycling through alternatives with clear reasoning.
- Provide adjustable weights for each analysis layer (emotional, syllabic, phonetic, semantic).

### 8. Educational Transparency
- Show how each word maps to theory (analysis chips, tooltips, explanations).
- Provide "Explain This" feature for generated progressions.

---

## Next Steps

1. **Refactor word→music engine to use all existing modules.**
2. **Implement root selection and functional harmony logic.**
3. **Integrate emotional/archetype mapping and multi-layer analysis.**
4. **Add per-chord scale/mode labeling and UI transparency.**
5. **Enable regeneration and user control over mappings.**
6. **Update documentation and onboarding tutorials.**
7. **Test with soundtrack composers and iterate based on feedback.**

---

**This document consolidates all word→music system issues, the comprehensive fix plan, and actionable next steps for a musically and philosophically richer system.**

---

## Merged Summaries (from remaining word/lexical docs)

To keep a single authoritative source, the following concise summaries capture key implementation details from remaining word-related documentation that have now been consolidated here.

### Generative System (from `GENERATIVE_SYSTEM.md`)
- Architecture: `PhoneticAnalyzer`, `ChordAttributeEngine`, `GenerativeWordMapper`, integrated with `LexicalMusicEngineV2`.
- Algorithm: phonetic analysis (syllables, consonant clusters, vowel brightness) + semantic inference → fused attributes → scale selection → progression generation.
- Outputs: harmonic tension, brightness, voicing density, articulation, scale choice, progression, and detailed reasoning for each decision.
- Config: toggleable `lexicalEngine.useGenerativeSystem` and `generativeWeights` (phonetic/semantic blend).

### Real-Time Semantics & Voice Leading (from `IMPLEMENTATION_COMPLETE.md`)
- Implemented real-time semantic analysis via Dictionary API, ConceptNet, and Datamuse with caching and async calls.
- Added `semantic-api-engine.js` and `voice-leading-engine.js`; voice leading produces SATB voicings with cost-based optimization (minimize movement, avoid parallel 5ths/octaves).
- `mapWord()`/`mapWords()` are async; `translateWords()` supports API calls and fallbacks (pattern-based, phonetic-only).
- Performance: ~500ms per new word (cached afterwards), voice leading ~20ms per progression.

### Lexical Music Engine V2 Integration (from `V2_COMPLETE_SUMMARY.md`)
- `lexical-music-engine-v2.js` integrates emotional mapping (valence/arousal/dominance), functional harmony tagging (Tonic/Subdominant/Dominant), and reasoning traces.
- Returns enriched chord objects with `tier`, `function`, `degree`, `chordNotes`, and `reasoning` to expose why choices were made.
- Links to `progression-builder`, `container-chord-tool`, and `scale-library` via `linkComponents()` for future deeper integration.

### Attribute & Test Guidance (from `TEST_ATTRIBUTES.md`)
- Each word now yields a set of musical attributes: tension, color (brightness/warmth), texture (density/spread), motion, register, and preferred intervals.
- Test cases and success criteria provided for phrases like "lonely cosmic fire", "gentle morning sunlight", and "violent stormy chaos".
- UI expectations: analysis panel shows word-by-word breakdown, attribute bars, piano voicing output, and automatic sheet music updates when enabled.

---

If you'd like, I will now permanently remove the original files (`GENERATIVE_SYSTEM.md`, `IMPLEMENTATION_COMPLETE.md`, `V2_COMPLETE_SUMMARY.md`, `TEST_ATTRIBUTES.md`). I can also move them to `archive/word-lexical/` instead if you prefer a safe backup. Which do you want?
