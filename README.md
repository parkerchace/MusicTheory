# Music Theory Studio

[Live Demo](https://parkerchace.github.io/MusicTheory/modular-music-theory.html)

A single-page, browser-based set of music theory tools (scales, chords, progressions, and a couple visualizers). It’s mostly vanilla JS + HTML + CSS and runs without a build step.

## Quick start

- Open `modular-music-theory.html` in a modern browser.
- MIDI often works as-is, but browser security rules vary. If your browser blocks Web MIDI when opened from disk, run a local server:
    - `python -m http.server 8000` then open `http://localhost:8000/modular-music-theory.html`

## What’s actually in the app

### Learning pages

- **Learn Notes (Piano / Guitar)**: note-name drills with an instrument view.
- **Learn Scales**: lesson-style exploration of scale degrees and patterns.
- **Learn Chords**: chord building / recognition exercises.
- **Learn Inversions**: basic inversion + voicing practice.

These live behind the landing page in `modular-music-theory.html` and are loaded on demand by `modular-app.js`.

### Studio tools (the main workspace)

- **Scale library**: browse a large embedded scale catalog (categories + taxonomy) and push the selection to other modules.
- **Circle of fifths / scale circle explorer**: a reference view tied to the current key/scale.
- **Chord explorer**: a diatonic chord grid (I–VII) with a substitution menu (includes diatonic options and some chromatic substitutions).
- **Container chord tool**: find scales and/or chords that contain a chosen note set.
- **Scale relationship explorer**: compare related scales and chord/scale overlap.
- **Progression builder**: build a chord sequence and feed it into other views.
- **Number generator**: generate/transform scale-degree sequences (with undo/redo + a few generation modes).

### Visual + audio

- **Piano visualizer**: clickable keyboard with scale-degree highlighting, optional fingering overlays, and MIDI note “key lighting”.
- **Guitar fretboard visualizer**: show scale/chord positions on a fretboard and optionally audition notes.
- **Sheet music generator**: lightweight SVG notation view that tracks key/scale + selected chords (and can follow generated progressions).
- **Audio engines**:
    - `simple-audio-engine.js` (basic synth)
    - `enhanced-audio-engine.js` (envelope + optional reverb)
    - `piano-sample-engine.js` (sampled piano when available)

### Input modes

- **Numbers mode**: type scale degrees / Roman-ish tokens and see the chord/progression views update.
- **Words mode**: a “word → music” pipeline that logs analysis and exposes weight sliders (see the Word Analysis panel).

## UI / workflow

- Landing page with skill level + intent search that routes into the learn pages / studio (`module-selector.js`).
- Collapsible modules in the studio layout (the `[-]` buttons on some module headers).
- Module enable/disable toggles in the settings dropdown (⚙️).
- Theme cycling with persistence (`theme-switcher.js`).
- A small tutorial/overlay system wired to the “?” menu (`tutorial-system.js`).

## Notes / current limitations

- **Solar system visualizer**: it’s included by default and is still a bit experimental (it’s easy for it to feel “busy” depending on the scale/key state).
- **Semantic API engine**: `semantic-api-engine.js` is present, but the API endpoints are placeholders (`REMOVED`), so live API-based word enrichment won’t work without re-adding endpoints.
- **Tests**: `package.json` includes Jest, but this repo doesn’t currently ship any `*.test.js` files.

---
Created by Parker Chace
