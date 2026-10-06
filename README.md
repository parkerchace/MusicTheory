# Music Theory Studio

[Live Demo](https://parkerchace.github.io/MusicTheory/modular-music-theory.html)

A single-page, browser-based set of music theory tools (scales, chords, progressions, and a couple visualizers). It’s mostly vanilla JS + HTML + CSS and runs without a build step.

## Quick start

- Open `modular-music-theory.html` in a modern browser.
- MIDI often works as-is, but browser security rules vary. If your browser blocks Web MIDI when opened from disk, run a local server:
    - `python -m http.server 8000` then open `http://localhost:8000/modular-music-theory.html`

### Live semantic APIs (ConceptNet / Dictionary)

If you want live word enrichment to work reliably, do not run from `file://`.
Use the built-in local server so browser CORS restrictions are bypassed through a same-origin proxy.

- Start server: `npm start`
- Open: `http://localhost:8000/modular-music-theory.html`
- The app will show a badge:
    - `SEMANTIC API: LIVE (local proxy)` on localhost
    - `SEMANTIC API: OFFLINE (file://)` when opened from disk

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

- Landing page with skill level + intent search that routes into the learn pages / studio (`module-selector.js`), and suggests three studio looks for what you chose.
- Collapsible modules in the studio layout (the `[-]` buttons on some module headers).
- Module enable/disable toggles in the settings dropdown (⚙️).
- Theme cycling with persistence (`theme-switcher.js`).
- A guided tour and Demo Mode in the “?” menu (`tutorial-system.js`).

### Studio looks

The ⊞ button rearranges the same tools around a different idea — a signal chain, the score, your instrument, a lesson order. **OG** is the original layout and is never altered.

- Each look is data (`studio-looks.js`): a grid, zones, and what each zone is for. `look-schema.js` validates every look, built-in or not, and draws its preview from its grid.
- Zone types (rail, drawer, tabs, tiles, numbered steps, …) are styled by type in `studio-looks.css`, so any look can use any of them. `module-fit.css/js` fits each module to the room its zone gives it.
- **Build your own** (`look-builder.js`): *Remix this look* or *New look* from the ⊞ popover. The studio rearranges behind the panel as you work. Looks you save stay in this browser; *Export* writes a `.look.json` someone else can *Import*.

### Typing keyboard

Play the piano and fretboard from the computer keyboard, laid out like FL Studio (`qwerty-keys.js`):

- `Z S X D C V …` play notes from C3, `Q 2 W 3 E …` an octave up; `←` `→` change octave, `↑` `↓` velocity.
- It arms when you click an instrument (or press `` ` ``), pauses while any text field has focus, and `Esc` stops it. Typing a burst of note keys without arming it asks first instead of playing.
- **What the keys play** (`qwerty-chords.js`): the ⌨ chip has a three-way switch, **Notes | Chords | Harmonize**, and holding `Shift` plays chords from any of them.
  - **Chords:** `Z…M` play the scale's chords (I to vii), the row above plays sevenths, and the keys in between play the secondary dominant of the chord to their right. Voicing and voice leading use the sheet's own engine; the ⚙ button on the chip sets them.
    - **Inversion** (`A`, or the chip's **Inv** button) cycles Auto → Root → 1st → 2nd → 3rd: which chord tone is in the bass, in the voicing style being played. A chord held while it changes is struck again in the new inversion, and the readout names it (`IV6 · F/A`, `V6/5 · G7/B`).
    - **Walk** (`F`, or **⇅**) wanders up and down through the inversions as you play: the same chord again steps to its next inversion, a new chord goes to a nearby voicing (within reach of the smoothest move from where the walk left off), and it turns back before it strays more than about an octave from the keys' register.
  - **Harmonize:** the keys are a melody (from C4, with its own octave), and a chord from the scale sounds under it. The chord changes when the melody settles on a note the chord does not hold, a phrase opens on the tonic, the highest held note is the melody, and the chord rings on briefly after you let go. A MIDI keyboard is harmonized the same way.
- Learn Piano, Chords and Scales pages hear the typing keyboard too (as if it were a MIDI keyboard).

## Notes / current limitations

- **Solar system visualizer**: it’s included by default and is still a bit experimental (it’s easy for it to feel “busy” depending on the scale/key state).
- **Semantic API engine**: `semantic-api-engine.js` is present, but the API endpoints are placeholders (`REMOVED`), so live API-based word enrichment won’t work without re-adding endpoints.
- **Tests**: the `tools/*-test.js` files run in macOS’s built-in JavaScriptCore, from this folder:
  `/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc tools/<name>-test.js`.
  Browser checks and screenshots use system Chrome and Python (no Node needed):
  `python3 tools/screens/look-screens.py checks` (add `--size 760x900` for a phone width),
  `python3 tools/screens/look-screens.py shots`, and `geometry` / `compare` to check that a layout refactor changed nothing.

---
Created by Parker Chace
