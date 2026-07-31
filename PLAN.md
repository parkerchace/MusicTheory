# Where this is going

A running note to myself about the word-to-music generator: what it does now,
what we're actually trying to fix, and what's left. Written in the order things
matter, not the order they were built.

---

## The thing we're chasing

The app has enormous theory machinery — 1300+ scales, borrowing, approach
chords, functional harmony, form planning. That was never the problem. The
problem is that all of it can be individually correct and the result still
sounds like nothing in particular.

The reference points, and what each one is actually teaching us:

- **Minuet in G** — mostly diatonic, simple chords, and still full of
  character, because it moves in *gestures*. `5, 12345 11` is a sweep that
  commits to a direction and finishes it. Stepwise motion is the material; the
  figure is the idea.
- **Für Elise** — the chromatic notes exist for *motion*, and there are barely
  any of them. E–D♯–E–D♯ works because that exact rub keeps coming back. The
  same interval scattered in fresh places each time would just be sour notes.
- **Gymnopédie** — simple scalar movement, but the *texture* is the identity,
  and the identity returns.
- **Bach, Prelude in C** — one figure, never varied, while the harmony walks
  through it. The listener stops tracking the figure and hears only the
  harmony moving.
- **Pachelbel** — a melody on the bottom and a melody on top at once, with the
  middle arpeggiating the chord.
- **Ellington** — highlighted moments that get built on and escalated, rather
  than every climax being treated the same.

The through-line: **intention**. Not more theory. Placement, commitment,
repetition, and restraint.

---

## Done

### Melody

- **Phrase anchors decided end-first.** Each phrase picks its goal note from
  the cadence its section was assigned (authentic → tonic, half → open on the
  fifth, deceptive → the sixth) and its opening note from its relationship to
  the previous phrase's ending — restate on a theme return, answer by leaping
  the other way, or continue by step. The middle is filled as an arch peaking
  late (60–70% through). *Before this, a phrase ended on whatever chord tone
  sat nearest a curve at its last beat, which is why endings felt arbitrary.*
  → 100% of phrases now end on a cadence-appropriate degree.

- **Scale runs as a figure.** A run commits to a direction and doesn't
  re-decide per note. It also carries across the bar line when it's still
  travelling, because one span of word-rhythm is too short to hold a
  four-to-six note gesture.
  → 7.2 sweeps of 3+ notes per piece, longest 8, nine 5+ note gestures per 10
  pieces. Stepwise motion sits at ~69%, inside the 70–80% band typical of
  tonal melody.

- **Neighbour oscillation**, including the chromatic version — decided *once
  per piece* and then reused, never re-rolled per span. That's the Für Elise
  lesson.
  → chromatic notes appear in a minority of pieces, ~0.2–0.6% of all notes.

- **Every chromatic note earns its place.** Two sources of accidentals that
  served neither the key nor any chord were removed. A chromatic neighbour now
  registers an obligation the *next* note must satisfy — E–D♯–E is the figure,
  E–D♯–anything-else is a wrong note — and is restricted to the LOWER
  neighbour, which leans up into its home note like a leading tone. A
  suspension must hold a note that belongs to the key; holding the third of a
  departing secondary dominant lands a semitone against the new chord's root.
  → across six modes and ~2800 notes, unjustified chromatic notes 16 → 0.
  Everything still out-of-scale is either a chord tone of the chord over it or
  a chromatic neighbour that resolves by step — 22 of 22 do.

### Harmony

- **Harmonic rhythm is planned, not rolled.** One chord per bar is the norm;
  the bar before a section's arrival accelerates to two; a real climax section
  can run at two throughout. *Before, one global test meant an energetic piece
  had two chords in every bar for its whole length — that's a constant, not a
  rhythm.*
  → 2.0 → 1.05 attacks/bar (1.31 energetic).

- **Surprise budget.** A fixed number of approach runs per piece, spent where
  the tension curve is already asking. Below the curve's midpoint the appetite
  falls off sharply; section boundaries are exempt.
  → 77% of approach runs now land in the top half of the tension curve, vs
  ~50% for an even spread.

- **Junk passing chords rejected.** The scale-walk families could produce
  chords that aren't chords — a quality of "modal", double-sharp spellings,
  fragments missing a fifth. Plans containing one are discarded and the bar
  left plain.
  → chords with 3+ notes foreign to their own bar's key: 18 → 0 per ~1900.

- **Approaches long enough to hear.** Capped at two chords (the two nearest
  the target) and stretched to fill the space.
  → every approach chord is a full beat instead of half.

- **A mood is not a key signature.** Minor-vs-major was decided by regex on the
  emotional tone word, so a G-major piece tagged "mysterious" was told its
  tonic was minor, asked for `i`, and spent its length playing Gm7 while the
  panel called it "I". The scale decides now; mood picks *which* chords inside
  the key.

- **♭VI–♭VII–I in both modes, and placed.** In minor it's the triumphant lift;
  in major it's the aeolian cadence borrowed from the parallel minor (A♭–B♭–C
  in C major — the rock/film ending). Placed at the final cadence or at a
  bridge handing back to a return. *Briefly removed from major keys by mistake;
  the device was never the problem, firing it without deciding where was.*

- **Explanations that describe rather than rationalise.** Diatonic vs chromatic
  is judged by actual pitch content against the active scale, not by
  accidentals in the roman numeral. Real chromaticism names the note and its
  function. A composed cadence explains itself as one gesture instead of having
  its chords read individually as unrelated "chromatic approaches".

### Texture

- **Voicing-first is opt-in.** Default is the ordinary arrangement: chords in
  their own register (mostly bass clef), melody above in the treble, left hand
  playing real accompaniment patterns. Naming a voicing — the dropdown, Voice
  Leading, VL Combos, Inversion, a per-bar override — hands the texture to that
  voicing. *Left always-on it forced a block chord under nearly every melody
  note and, running last, silently overwrote Register/VL Intensity/VL Combos,
  which is why those controls looked dead.*

- **Committed accompaniment figures.** A minority of calm takes commit to one
  figure for the whole piece: no breathing, no orchestration exceptions. That
  refusal to react is the Bach-prelude point.
  → verified over 24 takes: 3 committed, all 3 invariant in every bar.

- **Ground bass** — root, then stepping toward the next chord's root, so the
  lowest voice has its own shape.

- **Inner-voice motion.** Over a held chord, one interior voice steps (usually
  down) partway through the bar. Never the bass (that would change the
  inversion), never the top (that would compete with the melody) — the voice
  nobody is listening to is the one that moves, so the motion is felt rather
  than followed. Sustained chords are also kept thick enough to *have* an
  interior.
  → ~1.1 moves per piece, all in key and all still interior.

### Playback

- **Nine voices.** Piano, piano + reverb, piano + pad, piano + strings,
  strings, guitar, electric piano, R&B synth, R&B pad. Everything was one
  triangle oscillator with one envelope, so a string pad and a Rhodes were the
  same beep at different pitches. A voice now states which partials sound, how
  the note starts and ends, how bright it is, and how much space is around it.
  Percussive voices decay to silence on their own whatever the written duration
  says — that is the main reason a synthesised piano otherwise reads as an
  organ. Reverb is a generated impulse (decaying noise); there is no file to
  load. The selector sits with the transport because it is a playback property
  and never touches a note; it previews on change and persists.
  → 9 voices, none secretly identical, zero malformed audio events.

### Housekeeping

- **Progression builder and chord explorer deleted.** ~300KB of JS/CSS plus 57
  references in modular-app.js. Two things needed care rather than deletion:
  the harmonization mode was read off the progression builder in six places
  but the builder was only mirroring a value the number generator owns, so it
  now comes from the real owner through one accessor; and the circle of
  fifths' "generate progression" fed only the builder, so it now goes to the
  sheet rather than being silently dropped. Dangling module-selector shortcuts
  repaired, including `scale-library`, which was already broken beforehand.

- **MIDI export follows the renderer.** It used to re-derive notes from the
  phrase's chord objects — the harmony BEFORE the piano texture engine — so a
  saved file could contain block chords where the sheet showed an Alberti
  figure, miss inner-voice motion entirely, and place approach chords
  differently. It reads the same rendered-note list playback does now, with
  melody on channel 1 and harmony on channel 2. Also fixed note ordering: ON
  was sorted before OFF at equal ticks, which silently killed a repeated pitch
  — and the accompaniment now strikes the same voicing more than once a bar.

### Controls

- **Voicing controls reach generated music at all**, and a voicing-only change
  re-harmonizes the existing melody instead of regenerating it. Randomize
  actually randomizes (seeded, reproducible).

---

## Next

In the order I'd do them.

1. **Melody not always the top voice.** Half done — inner-voice motion exists
   now, but the other half of the Dm7/F example is still open: voicing the
   chord so the melody note sits *inside* it (F-A-C-D), or making D the melody
   while F moves underneath.

2. **Genre rhythm vocabulary.** Baroque / romantic / impressionist / jazz /
   blues / R&B / rock / pop-punk as style profiles driving figure choice,
   tuplets, and swing. The biggest remaining item — it's what would make a take
   sound like *a kind of music* rather than generically tonal.

3. **Rubato and humanized timing** — micro-timing at phrase peaks and cadences.

4. **A texture identity that returns.** Figure commitment covers the
   "unchanging" half of Gymnopédie; the recognisable *return* is still implicit.

5. **Ellington-style escalation** — building on a highlighted moment
   progressively instead of treating every climax equally.

### UI / platform (queued, not started)

These are a different kind of work from the above and probably want their own
session.

- **Resize the circle-of-fifths module** to be more space-conscious of
  everything around it.
- **Mobile-friendly layout** across `modular-music-theory.html`, which is large
  and currently desktop-assuming.
- **Sound on mobile.** iOS will not start a `AudioContext` without a user
  gesture. The context is already created lazily on play, which may be enough,
  but it has never been tried on a real device — that needs checking rather
  than assuming.

### Known pre-existing loose ends

Not caused by any of the above; noticed while verifying.

- `modular-music-theory.html` references `grading-legend-help-system.js` and
  `word-grading-visualization.js`. Neither file has ever existed in the repo.
  This is the "GradingLegendHelpSystem not loaded; skipping" line in the
  console. Either restore them or drop the script tags.

---

## How this gets checked

There's no browser or Node in the dev environment, so verification runs the
real engines under JavaScriptCore with the DOM stubbed. The harnesses measure
musical properties, not just "did it throw":

- chord attacks per bar, approach concentration against the tension curve
- phrase endings vs. the cadence each section was assigned
- unbroken stepwise motion in one direction (the sweep metric — role labels
  change at the bar line, the gesture doesn't)
- chords with notes foreign to *their own bar's key* (not the home key — a
  modulated bar is in a different key, not a wrong one)
- voicing-only changes leaving the melody byte-identical
- inner-voice moves staying in key and staying interior

A number that measures the wrong thing is worse than no number. Four caught so
far, and every one of them briefly said the code was fine when it wasn't, or
broken when it wasn't:

- counting run *role labels* — they break at the bar line while the gesture
  continues, so long sweeps read as short ones
- judging modulated bars against the *home* key — manufactures failures that
  are not there, because a modulated bar is in a different key, not a wrong one
- checking a chromatic neighbour resolved by looking at the next note's role
  label rather than its pitch — reported 0 resolutions while all were resolving
- testing `chOf['F4']` for truthiness when the value was channel `0` — a
  correct MIDI export reported as broken

The habit that catches these: when a number is suspiciously perfect or
suspiciously zero, go and look at the actual notes before believing it.

---

## Guarding against the last mistake

A parse check proves a file is syntactically valid. It does not prove the code
runs. `SHEET_VOICES` was declared `const` inside the
`if (typeof SheetMusicGenerator !== 'undefined') { ... }` block that holds the
playback helpers, which made it block-scoped and invisible to the class body
that renders the toolbar. The file parsed perfectly and the sheet music panel
was blank in the browser.

`tools/mount-smoketest.js` exists so that cannot happen again quietly. It stubs
a DOM and actually constructs and `mount()`s the generator, then exercises the
voice layer through its public API. Run it with:

    /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tools/mount-smoketest.js

It was checked against the broken code first and reproduces exactly the browser
error, which is the only way to know a regression test is load-bearing.

---

## Picking this up cold

Read this file first, then `tools/`. Everything below is the short version.

**What the app is.** A word-to-music generator. You type words; it derives a
key, scale, form and emotional arc, then writes harmony, a melody and a
two-hand piano texture, renders them as notation, and plays or exports them.
The theory machinery underneath is large and was never the weak part.

**What we are actually working on.** Making the output sound *intentional*
rather than merely correct. See "The thing we're chasing" at the top — the six
reference pieces and what each one teaches are the whole brief.

**The files that matter most**

| file | what it owns |
|---|---|
| `arc-ui-init.js` | the pipeline: harmony → melody → texture; chord resolution, cadences, approach chords, explanations |
| `melodic-line-engine.js` | the melody: phrase anchors, contour, figures (runs, neighbours), decoration |
| `piano-texture-engine.js` | two hands: accompaniment figures, voicings as played, inner-voice motion |
| `sheet-music-generator.js` | notation, the toolbar, playback voices, MIDI export |
| `functional-harmony.js` | scale → degrees → roman numerals → function |
| `form-planner.js` | sections, cadences, key plan, foreshadowing |

**Running the checks.** There is no browser or Node here. Everything runs the
real engines under JavaScriptCore with the DOM stubbed:

    JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
    $JSC tools/mount-smoketest.js          # constructs and mounts the sheet generator
    $JSC tools/midi-export-test.js         # builds a MIDI file and decodes it back
    $JSC tools/melody-chromaticism-test.js # every accidental must be justified

`tools/mount-smoketest.js` in particular: a parse check proves a file is
syntactically valid, not that it runs. It was written after a `const` in the
wrong block scope shipped a blank sheet-music panel, and it was checked against
that broken code first — a regression test nobody has seen fail is not known to
be load-bearing.

**Working agreements that have earned their place**

- Measure the music, not just "did it throw". Read "How this gets checked".
- Distrust a number that is suspiciously perfect or suspiciously zero.
- When a device sounds wrong, ask whether the device is wrong or whether it was
  *placed* wrong. Usually the second. ♭VI–♭VII–I was briefly deleted from major
  keys when the real fault was that nothing decided where it went.
- An explanation that rationalises rather than describes is worse than none.
  The generator explains its own choices to the user; those explanations have
  twice been caught defending genuinely bad output.
