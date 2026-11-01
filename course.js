/**
 * THE COURSE — one ordered path through the studio, kept apart from the tools.
 *
 * Beginner is the four Learn pages that already exist. Intermediate and
 * Advanced follow the lecture "Finding Melodies in Scales" (the slide numbers
 * in `slides` are its pages), one lesson per idea, and every lesson names the
 * studio modules it is about: a lesson opens the look that puts those modules
 * in front of you, sets them up, and asks you to do one thing with them.
 *
 * A lesson is data. `setup`, `hear` and `check` are declarative so the runner
 * (course-runner.js) can do them and tools/course-test.js can check them:
 *   setup  { key, scale, voicing, inversion, qwerty, tab }
 *   hear   [{ label, notes }]           one chord, notes with octaves
 *          [{ label, seq: [[…], …] }]   chords one after another
 *   steps  [{ text, at, set }]   what to do, in order. `at` names the control
 *          (one of TARGETS) the runner points at when you ask "Show me";
 *          `set` (one of SET_KINDS, e.g. { voicing: 'drop2' }) is what "Do it"
 *          does, and the step ticks itself when the studio is in that state.
 *          A step without `set` is something to play or read.
 *   check  { quiz: { q, options, answer } }   answer is an index into options
 *          { steps: true }                     done when every `set` step is
 * Progress is kept by lesson id, never by position, so lessons can be
 * reordered without crediting the wrong one.
 */
(function (root) {
    'use strict';

    var SOURCE = 'Finding Melodies in Scales';

    var LEVELS = [
        {
            id: 'beginner',
            name: 'Beginner',
            blurb: 'Notes, scales, chords and inversions: the vocabulary everything else is written in.',
            units: [
                {
                    id: 'fundamentals',
                    title: 'Fundamentals',
                    lessons: [
                        { id: 'b-notes', title: 'Notes on your instrument', page: 'notes', modules: [],
                          summary: 'Whole and half steps, sharps and flats, on piano or guitar.' },
                        { id: 'b-scales', title: 'Scales', page: 'scales', modules: ['circle', 'chordstrip'], parts: 9,
                          summary: 'Nine short lessons: steps, degrees, minor scales, modes, chords from scales.' },
                        { id: 'b-chords', title: 'Chords from intervals', page: 'chords', modules: ['chords'],
                          summary: 'Stack a third and a fifth on any root and hear what it makes.' },
                        { id: 'b-inversions', title: 'Inversions', page: 'inversions', modules: ['sheet'],
                          summary: 'Same notes, a different one on the bottom, and why that matters.' }
                    ]
                }
            ]
        },
        {
            id: 'intermediate',
            name: 'Intermediate',
            blurb: 'Voicings and scale chords: open a chord up so a melody fits on top, and find chords in an eight-note scale.',
            units: [
                {
                    id: 'voicings',
                    title: 'Voicings: room for a melody',
                    lessons: [
                        {
                            id: 'i-close-voicing',
                            title: 'Start with the close-voiced chord',
                            slides: [3],
                            look: 'notation-desk',
                            modules: ['sheet', 'chordstrip'],
                            setup: { key: 'C', scale: 'major', voicing: 'close' },
                            body: '<p>Every four-note chord has four close positions: <b>root, 1st, 2nd and 3rd inversion</b>, all four notes packed inside one octave. Everyone knows these.</p>' +
                                  '<p>That is the trouble. The notes sit so tight together that they step all over a melody that lives inside them. Before a tune can sit on top, the chord has to open up.</p>',
                            hear: [
                                { label: 'Cmaj7 root position', notes: ['C4', 'E4', 'G4', 'B4'] },
                                { label: '1st inversion', notes: ['E4', 'G4', 'B4', 'C5'] },
                                { label: '2nd inversion', notes: ['G3', 'B3', 'C4', 'E4'] },
                                { label: '3rd inversion', notes: ['B3', 'C4', 'E4', 'G4'] }
                            ],
                            steps: [
                                { text: 'In the sheet’s toolbar, set <b>Inversion</b> to <b>1st</b>: E moves to the bass.', at: 'sheet-inversion', set: { inversion: 1 } },
                                { text: 'Now set it to <b>3rd</b>: the seventh, B, is on the bottom.', at: 'sheet-inversion', set: { inversion: 3 } },
                                { text: 'Play it yourself: on the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'Hold <b>Q</b> for Cmaj7, and press <b>A</b> (or click <b>Inv</b> on the chip) to step it through its inversions.', at: 'qk-inversion' }
                            ],
                            check: { quiz: { q: 'In Cmaj7’s 3rd inversion, which note is in the bass?', options: ['C', 'E', 'G', 'B'], answer: 3 } }
                        },
                        {
                            id: 'i-drop-2',
                            title: 'Drop 2: lower the second-highest note',
                            slides: [4, 5],
                            look: 'notation-desk',
                            modules: ['sheet'],
                            setup: { key: 'C', scale: 'major', voicing: 'close' },
                            body: '<p>Take the close chord and lower the <b>second-highest note</b> an octave. In C–E–G–B that note is G: drop it and you get <b>G3 · C4 · E4 · B4</b>. Still a full Cmaj7, just wider, with room at the top for a melody.</p>' +
                                  '<p>You can invert the drop 2 too. Take each inversion and drop its second-highest note: the dropped note ends up on the bottom.</p>',
                            hear: [
                                { label: 'Close', notes: ['C4', 'E4', 'G4', 'B4'] },
                                { label: 'Drop 2', notes: ['G3', 'C4', 'E4', 'B4'] },
                                { label: '1st inv, drop 2', notes: ['B3', 'E4', 'G4', 'C5'] },
                                { label: '2nd inv, drop 2', notes: ['C4', 'G4', 'B4', 'E5'] },
                                { label: '3rd inv, drop 2', notes: ['E4', 'B4', 'C5', 'G5'] }
                            ],
                            steps: [
                                { text: 'In the sheet’s toolbar, open <b>Voicing ▾</b> and pick <b>Drop 2</b>. The typing keyboard follows.', at: 'sheet-voicing', set: { voicing: 'drop2' } },
                                { text: 'On the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'Hold <b>Q</b> for Cmaj7 in drop 2, then press <b>A</b> (or click <b>Inv</b>) to hear its four inversions.', at: 'qk-inversion' },
                                { text: 'Click <b>⇅ Walk</b> (or press <b>F</b>) and play <b>Q W E R</b>: each chord moves to the nearest inversion.', at: 'qk-walk', set: { walk: true } }
                            ],
                            check: { steps: true }
                        },
                        {
                            id: 'i-drop-2-voice-leading',
                            title: 'Inverted drop 2s voice-lead beautifully',
                            slides: [6],
                            look: 'notation-desk',
                            modules: ['sheet'],
                            setup: { key: 'C', scale: 'major', voicing: 'drop2' },
                            body: '<p>The bass note of each drop-2 voicing points somewhere, and only one or two notes have to move to reach the next chord.</p>' +
                                  '<p>From Cmaj7 (B3 · E4 · G4 · C5) to Am7, <b>only the B falls to A</b>. From Cmaj7 (C4 · G4 · B4 · E5) to Fmaj7 over C, G steps to F and B to A. That is what the sheet’s <b>Voice Leading</b> option chases: the same voicing type, the smallest movement.</p>',
                            hear: [
                                { label: 'Cmaj7 → Am7', seq: [['B3', 'E4', 'G4', 'C5'], ['A3', 'E4', 'G4', 'C5']] },
                                { label: 'Cmaj7 → Fmaj7/C', seq: [['C4', 'G4', 'B4', 'E5'], ['C4', 'F4', 'A4', 'E5']] }
                            ],
                            steps: [
                                { text: 'In the sheet’s <b>Voicing Options</b> panel, tick <b>Voice Leading</b>.', at: 'sheet-voice-leading', set: { voiceLeading: true } },
                                { text: 'Drag <b>VL Intensity</b>, just below it, to the right until it reads <b>Ultra-smooth</b>.', at: 'sheet-vl-intensity', set: { vlIntensity: 80 } },
                                { text: 'On the keyboard chip, click <b>Chords</b>, then play <b>Q</b> then <b>Y</b> (Cmaj7 → Am7) and count the notes that move.', at: 'qk-mode-chords', set: { qwerty: 'chords' } }
                            ],
                            check: { quiz: { q: 'Cmaj7 (B3 · E4 · G4 · C5) to Am7: how many notes move?', options: ['One', 'Two', 'Three', 'All four'], answer: 0 } }
                        },
                        {
                            id: 'i-drop-2-4-drop-3',
                            title: 'Drop 2 & 4, drop 3, and not just major 7ths',
                            slides: [7, 8, 9, 16],
                            look: 'focus',
                            modules: ['sheet'],
                            setup: { key: 'C', scale: 'major', voicing: 'drop2', tab: 'sheet' },
                            body: '<p>Drop 2 opens up any four-note chord, whether major 7, major 6 or minor 6, and sounds fuller than close position.</p>' +
                                  '<p><b>Drop 2 & 4</b> lowers the second and fourth notes from the top. From C–E–G–B that is G and C, leaving two stacked fifths, C–G and E–B: a big, open, brass-section sound. <b>Drop 3</b> lowers the third-highest note instead, for a small cluster on top.</p>' +
                                  '<p>Why bother? Notes on the bottom support the melody on top. It doesn’t always have to be on top, but planning around it helps when you improvise and later when you tweak the score.</p>',
                            hear: [
                                { label: 'C6, drop 2', notes: ['G3', 'C4', 'E4', 'A4'] },
                                { label: 'Cm6, drop 2', notes: ['G3', 'C4', 'Eb4', 'A4'] },
                                { label: 'Cmaj7, drop 2 & 4', notes: ['C3', 'G3', 'E4', 'B4'] },
                                { label: 'G7: close, drop 2, drop 3', seq: [['G4', 'B4', 'D5', 'F5'], ['D4', 'G4', 'B4', 'F5'], ['B3', 'G4', 'D5', 'F5']] }
                            ],
                            steps: [
                                { text: 'In the sheet’s toolbar, open <b>Voicing ▾</b> and pick <b>Drop 3</b>.', at: 'sheet-voicing', set: { voicing: 'drop3' } },
                                { text: 'Now pick <b>Drop 2+4</b> in the same menu: the same chords, spread wider.', at: 'sheet-voicing', set: { voicing: 'drop2+4' } },
                                { text: 'On the keyboard chip, click <b>Chords</b> and play <b>T</b> (G7) in each voicing; press <b>A</b> to arpeggiate its inversions.', at: 'qk-mode-chords', set: { qwerty: 'chords' } }
                            ],
                            check: { steps: true }
                        }
                    ]
                },
                {
                    id: 'bebop-major',
                    title: 'Interesting scales: bebop major',
                    lessons: [
                        {
                            id: 'i-bebop-major',
                            title: 'Bebop major: eight notes, two chords',
                            slides: [10, 11, 12, 13],
                            look: 'luthier',
                            modules: ['chordstrip', 'fretboard'],
                            setup: { key: 'C', scale: 'bebop_major' },
                            body: '<p>“Just use different voicings” isn’t enough. The interesting stuff comes from interesting scales.</p>' +
                                  '<p><b>Bebop major</b> (also called 6-diminished) is all the white keys plus a ♭6. Don’t replace the 6th: add A♭ alongside it. That makes eight notes instead of seven, so the scale lines up with eighth-note phrasing.</p>' +
                                  '<p>Now skip every other note, and there are only <b>two chord types</b>. The odd degrees all give the same C6 (C·E·G·A) in its inversions. The even degrees all give the same diminished 7th (D·F·A♭·B). Walk up the scale and the chords alternate tension and release: the classic sound Barry Harris taught, which plain diatonic C chords can’t make.</p>',
                            hear: [
                                { label: 'The scale', seq: [['C4'], ['D4'], ['E4'], ['F4'], ['G4'], ['Ab4'], ['A4'], ['B4'], ['C5']] },
                                { label: 'C6 · D°7 · C6/E · F°7', seq: [['C4', 'E4', 'G4', 'A4'], ['D4', 'F4', 'Ab4', 'B4'], ['E4', 'G4', 'A4', 'C5'], ['F4', 'Ab4', 'B4', 'D5']] }
                            ],
                            steps: [
                                { text: 'Read the <b>chord strip</b>: C6 · Ddim7 · C6/E · Fdim7 … two chord types, taking turns.', at: 'chord-strip' },
                                { text: 'On the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'Play <b>Z X C V B N M ,</b>: degrees 1 to 8, tension and release by turns.', at: 'qk-keys' }
                            ],
                            check: { quiz: { q: 'Which note does bebop major add to C major?', options: ['F♯', 'A♭', 'B♭', 'D♭'], answer: 1 } }
                        },
                        {
                            id: 'i-harmonize-6-dim',
                            title: 'Harmonize a melody: 6 or °7?',
                            slides: [14, 15],
                            look: 'luthier',
                            modules: ['chordstrip', 'sheet'],
                            setup: { key: 'C', scale: 'bebop_major', qwerty: 'harmonize' },
                            body: '<p>In this scale each melody note has just two options underneath it. If the note is one of <b>C·E·G·A</b>, put a major 6 chord under it; if it is one of <b>D·F·A♭·B</b>, put the diminished 7th. Try it on “Mary Had a Little Lamb.”</p>' +
                                  '<p><b>Bending the rule:</b> B isn’t in the C6 chords, but one chord that features the major 7, a rootless Am9, blends right in. Its notes are C·E·G·B, the same as Cmaj7: call it whichever you like.</p>',
                            hear: [
                                { label: 'Ma-ry had a lit-tle lamb', seq: [['G3', 'A3', 'C4', 'E4'], ['F3', 'Ab3', 'B3', 'D4'], ['E3', 'G3', 'A3', 'C4'], ['F3', 'Ab3', 'B3', 'D4'], ['G3', 'A3', 'C4', 'E4'], ['G3', 'A3', 'C4', 'E4'], ['G3', 'A3', 'C4', 'E4']] },
                                { label: 'Rootless Am9 = Cmaj7', notes: ['C4', 'E4', 'G4', 'B4'] }
                            ],
                            steps: [
                                { text: 'The keyboard chip is on <b>Harmonize</b>: each key is a melody note with a chord under it.', at: 'qk-mode-harmonize', set: { qwerty: 'harmonize' } },
                                { text: 'Play the tune on the keys <b>C X Z X C C C</b> (E D C D E E E) and hear C6 or °7 under each note.', at: 'qk-keys' }
                            ],
                            check: { quiz: { q: 'Melody note F in C bebop major: which chord goes under it?', options: ['C6', 'The diminished 7th'], answer: 1 } }
                        }
                    ]
                }
            ]
        },
        {
            id: 'advanced',
            name: 'Advanced',
            blurb: 'Approach chords: borrow from the scale of wherever you are going, a half step, a fifth, a fourth or a third away.',
            units: [
                {
                    id: 'approach-chords',
                    title: 'Approach chords',
                    lessons: [
                        {
                            id: 'a-half-step-dim',
                            title: 'A °7 a half step away: the octatonic scales',
                            slides: [17],
                            look: 'lab-bench',
                            modules: ['chords', 'chordstrip'],
                            setup: { key: 'C', scale: 'octatonic' },
                            body: '<p>A common move is a diminished 7th a half step below the target: <b>G♯°7 → Am</b>. Where do half-step passing chords come from?</p>' +
                                  '<p>They come from the <b>octatonic scales</b>. Alternate half and whole steps and you get eight notes in which every stacked chord is diminished.</p>' +
                                  '<p>Half–whole: C·D♭·E♭·E·F♯·G·A·B♭. Whole–half: C·D·E♭·F·F♯·G♯·A·B.</p>',
                            hear: [
                                { label: 'Half–whole', seq: [['C4'], ['Db4'], ['Eb4'], ['E4'], ['F#4'], ['G4'], ['A4'], ['Bb4'], ['C5']] },
                                { label: 'G♯°7 → Am', seq: [['G#3', 'B3', 'D4', 'F4'], ['A3', 'C4', 'E4', 'A4']] }
                            ],
                            steps: [
                                { text: 'In <b>Container Chord</b>, type <b>G# B D F</b> in the notes box and press <b>Find Chords</b>.', at: 'cc-input', set: { notes: 'G# B D F' } },
                                { text: 'Read the <b>chord strip</b>: the C octatonic scale’s chords, diminished all the way up.', at: 'chord-strip' }
                            ],
                            check: { quiz: { q: 'G♯°7 resolves up a half step to…', options: ['G', 'Am', 'A♭maj7', 'F'], answer: 1 } }
                        },
                        {
                            id: 'a-tonicize-borrow',
                            title: 'Tonicize the target, borrow from its parallel scale',
                            slides: [18, 19],
                            look: 'notation-desk',
                            modules: ['sheet'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>Going from Cmaj7 to Fmaj7? Make F the 1 for a moment (<b>tonicize</b> it) and borrow from F bebop major. Its ii chord, <b>G°7</b> (G·B♭·D♭·E), isn’t in C major, and it points straight at F.</p>' +
                                  '<p>The key to all this: <b>use a parallel scale of whatever you’re tonicizing and take chords from it.</b> Approaching a chord is foreshadowing, and the scale you borrow from sets the light on the arrival: bright, dark or mysterious.</p>',
                            hear: [
                                { label: 'Cmaj7 → G°7 → Fmaj7', seq: [['C4', 'E4', 'G4', 'B4'], ['G4', 'Bb4', 'Db5', 'E5'], ['F4', 'A4', 'C5', 'E5']] }
                            ],
                            steps: [
                                { text: 'Click <b>🔍 Where the music comes from</b>, the panel that comes with the score, to open it.', at: 'prov', set: { open: 'prov' } },
                                { text: 'In <b>🎯 Approach a progression</b>, type <b>1 4</b>, press <b>Build</b>, then click <b>Fmaj7</b> to list the ways into it.', at: 'prov-approach', set: { approach: '1 4' } },
                                { text: 'Press <b>▶</b> on a few to hear them; <b>Add to sheet</b> keeps one.', at: 'prov-approach' }
                            ],
                            check: { quiz: { q: 'Which two notes of G°7 are outside C major?', options: ['G and E', 'B♭ and D♭', 'B and D'], answer: 1 } }
                        },
                        {
                            id: 'a-scales-as-moods',
                            title: 'Scales carry moods: bebop minor and borrowed chords',
                            slides: [20, 21],
                            look: 'lab-bench',
                            modules: ['relations', 'chordstrip'],
                            setup: { key: 'C', scale: 'bebop_minor' },
                            body: '<p><b>Bebop minor</b> is bebop major with a ♭3: C·D·E♭·F·G·A♭·A·B. Its chords alternate minor 6 and diminished: mysterious, melancholy, noir.</p>' +
                                  '<p>The same move works in any key. Approaching Dmaj7, borrow from a parallel D scale. D Mixolydian ♭6 (D·E·F♯·G·A·B♭·C) has half-diminished iii and ii chords: <b>F♯ø7 → Eø7 → Dmaj7</b>, borrowed, borrowed, original. Only one note in each borrowed chord is “wrong” for D major, and that note is the colour.</p>',
                            hear: [
                                { label: 'Cm6 ↔ D°7', seq: [['C4', 'Eb4', 'G4', 'A4'], ['D4', 'F4', 'Ab4', 'B4'], ['C4', 'Eb4', 'G4', 'A4']] },
                                { label: 'F♯ø7 → Eø7 → Dmaj7', seq: [['F#4', 'A4', 'C5', 'E5'], ['E4', 'G4', 'Bb4', 'D5'], ['D4', 'F#4', 'A4', 'C#5']] }
                            ],
                            steps: [
                                { text: 'In <b>Scale Relationships</b>, type <b>Em7b5</b> in the chord box and press <b>Analyze</b>.', at: 'sre-input', set: { analyze: 'Em7b5' } },
                                { text: 'In the tonic row, click <b>D</b>: only scales built on D, the parallel scales of D major.', at: 'sre-tonic', set: { tonic: 'D' } }
                            ],
                            check: { quiz: { q: 'In F♯ø7 (F♯·A·C·E), which note is outside D major?', options: ['F♯', 'A', 'C', 'E'], answer: 2 } }
                        }
                    ]
                },
                {
                    id: 'approach-by-interval',
                    title: 'Approach by interval',
                    lessons: [
                        {
                            id: 'a-five-of',
                            title: 'A fifth away: Mixolydian and the five-of',
                            slides: [22, 23],
                            look: 'orrery',
                            modules: ['solar', 'chordstrip'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p><b>Mixolydian</b> is major with a ♭7, the 5th mode: dominant-sounding, it pulls back to 1. Use it a fifth above whatever you’re approaching, the <b>five-of</b>.</p>' +
                                  '<p>In C, target Dm (the ii). A fifth above D is A, so play an A Mixolydian chord first: <b>A7</b>. Its C♯ is the one note from outside C major, and it leans straight into D. Full loop: <b>C → A7 → Dm → G7 → C</b> (I → V/ii → ii → V → I).</p>',
                            hear: [
                                { label: 'A7 → Dm', seq: [['G3', 'C#4', 'E4', 'A4'], ['F3', 'D4', 'F4', 'A4']] },
                                { label: 'C → A7 → Dm → G7 → C', seq: [['C4', 'E4', 'G4'], ['G3', 'C#4', 'E4', 'A4'], ['F3', 'D4', 'F4', 'A4'], ['F3', 'B3', 'D4', 'G4'], ['E3', 'C4', 'E4', 'G4']] }
                            ],
                            steps: [
                                { text: 'In the <b>Solar System</b>, click the <b>D</b> planet: its satellites appear, and <b>V/D</b> is its five-of, A7.', at: 'solar', set: { planet: 'D' } },
                                { text: 'Open <b>🔍 Where the music comes from</b>, with the score. In <b>🎯 Approach a progression</b>, type <b>1 2</b>, press <b>Build</b> and click <b>Dm7</b>.', at: 'prov-approach', set: { approach: '1 2' } },
                                { text: 'Set its menu to <b>dominant</b>: the five-of, A7, is in the list. Press <b>▶</b> to hear it lead in.', at: 'prov-approach' }
                            ],
                            check: { quiz: { q: 'What is the five-of G?', options: ['C7', 'D7', 'A7', 'E7'], answer: 1 } }
                        },
                        {
                            id: 'a-fourth-away',
                            title: 'A fourth away: Fm6 → Cmaj7, and ♭6 into minor',
                            slides: [24, 25],
                            look: 'lab-bench',
                            modules: ['relations', 'chords'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p><b>Mixolydian ♭6</b> is mostly major, plus Mixolydian’s ♭7 and a ♭6. G Mixolydian ♭6 (G·A·B·C·D·E♭·F) resolves beautifully to C minor. It changes moods too: give a happy song in G a reverent ending by borrowing Cm or F7 before the last G.</p>' +
                                  '<p>Now go a <b>fourth above</b> the target. Target C: a fourth above is F, so borrow from F bebop minor. <b>Fm6 (F·A♭·C·D) → Cmaj7</b> is the dark “amen” cadence: F→E, A♭→G, D→B, and C holds.</p>',
                            hear: [
                                { label: 'G7♭13 → Cm', seq: [['G3', 'B3', 'F4', 'Eb5'], ['C4', 'Eb4', 'G4', 'C5']] },
                                { label: 'Fm6 → Cmaj7', seq: [['F4', 'Ab4', 'C5', 'D5'], ['E4', 'G4', 'B4', 'C5']] }
                            ],
                            steps: [
                                { text: 'In <b>Scale Relationships</b>, type <b>Fm6</b> in the chord box and press <b>Analyze</b>.', at: 'sre-input', set: { analyze: 'Fm6' } },
                                { text: 'In <b>Container Chord</b>, type <b>F Ab C D</b> and press <b>Find Chords</b>: the same four notes, every name they go by.', at: 'cc-input', set: { notes: 'F Ab C D' } }
                            ],
                            check: { quiz: { q: 'Which note of Fm6 (F·A♭·C·D) is outside C major?', options: ['F', 'A♭', 'C', 'D'], answer: 1 } }
                        },
                        {
                            id: 'a-chromatic-mediants',
                            title: 'A third away: chromatic mediants',
                            slides: [26, 27],
                            look: 'orrery',
                            modules: ['solar', 'relations'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>Keys a major third up or down share two notes with home, and <b>those shared notes carry you in</b>, and back out to the tonic.</p>' +
                                  '<p>Cmaj7 (C·E·G·B) → Emaj7 (E·G♯·B·D♯) holds E and B. → A♭maj7 (A♭·C·E♭·G) holds C and G. Verse in C, chorus in E (pivot on E and B), and back to C on the same two notes.</p>' +
                                  '<p>Pivot moods with extended chords a third apart. Vamp <b>Cmaj9 ↔ E♭maj9</b>: G and D hold steady while everything else shifts, bright, then wistful, then bright again.</p>',
                            hear: [
                                { label: 'Cmaj7 → Emaj7 → Cmaj7', seq: [['C4', 'E4', 'G4', 'B4'], ['E4', 'G#4', 'B4', 'D#5'], ['C4', 'E4', 'G4', 'B4']] },
                                { label: 'Cmaj9 ↔ E♭maj9', seq: [['C3', 'E4', 'G4', 'B4', 'D5'], ['Eb3', 'G4', 'Bb4', 'D5', 'F5'], ['C3', 'E4', 'G4', 'B4', 'D5']] }
                            ],
                            steps: [
                                { text: 'In the <b>Solar System</b>, click the <b>C</b> planet: the <b>CM</b> satellites are its chromatic mediants.', at: 'solar', set: { planet: 'C' } },
                                { text: 'In <b>Scale Relationships</b>, type <b>Cmaj7</b> and press <b>Analyze</b>.', at: 'sre-input', set: { analyze: 'Cmaj7' } },
                                { text: 'Under the results, click the <b>3/6 Mediant</b> filter: the scales a third away that hold it.', at: 'sre-mediant', set: { filter: 'mediant' } }
                            ],
                            check: { quiz: { q: 'Which two notes do Cmaj7 and A♭maj7 share?', options: ['E and B', 'C and G', 'G and D'], answer: 1 } }
                        }
                    ]
                }
            ]
        }
    ];

    // The lecture's last slide, shown when the last lesson is done.
    var RECAP = [
        ['Drop voicings', 'Drop 2, 2 & 4 and 3 spread the chord and leave room for the melody on top.'],
        ['Bebop major', 'Add ♭6 to get eight notes and two chord types: major 6 and diminished 7.'],
        ['Major or diminished?', 'Label each melody note and harmonize it from one of the two chord families.'],
        ['Tonicize + borrow', 'Approach a chord with chords from its parallel scale (G°7 → Fmaj7).'],
        ['Scales are moods', 'Bebop minor for noir. Pick the scale that paints the story you want.'],
        ['Approach by interval', 'A fifth (Mixolydian, ♭6 for minor), a fourth (Fm6 → C), a third (mediants).']
    ];

    /* ---------- lookups ---------------------------------------------- */
    var BY_ID = {};
    var ORDER = [];   // studio lessons in course order
    LEVELS.forEach(function (lv) {
        lv.units.forEach(function (u) {
            u.lessons.forEach(function (l) {
                l.level = lv.id;
                l.unit = u.id;
                BY_ID[l.id] = l;
                if (!l.page) ORDER.push(l.id);
            });
        });
    });

    function lessonsForModule(mid) {
        var out = [];
        LEVELS.forEach(function (lv) {
            lv.units.forEach(function (u) {
                u.lessons.forEach(function (l) { if ((l.modules || []).indexOf(mid) !== -1) out.push(l); });
            });
        });
        return out;
    }

    /* ---------- progress, by lesson id ------------------------------- */
    var PROGRESS_KEY = 'music-theory-course-progress';
    function readProgress() {
        try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function isDone(id) {
        if (id === 'b-scales') return scalesProgress().done >= 9;
        return !!readProgress()[id];
    }
    function markDone(id) {
        var p = readProgress();
        p[id] = Date.now();
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
        try { root.dispatchEvent(new CustomEvent('course:progress', { detail: { id: id } })); } catch (e) {}
    }
    // Learn Scales keeps its own record of its nine lessons.
    function scalesProgress() {
        try {
            var s = JSON.parse(localStorage.getItem('learn-scales-progress') || '{}');
            return { done: (s.completedLessons || []).length };
        } catch (e) { return { done: 0 }; }
    }

    // The controls a step can point at, and the settings a step can make.
    // course-runner.js knows how to find, open and set each one; the browser
    // checks make sure every step's control is on screen in its lesson's look.
    var TARGETS = ['sheet-voicing', 'sheet-inversion', 'sheet-voice-leading', 'sheet-vl-intensity',
        'qk-mode-chords', 'qk-mode-harmonize', 'qk-inversion', 'qk-walk', 'qk-keys',
        'chord-strip', 'cc-input', 'sre-input', 'sre-tonic', 'sre-mediant', 'prov', 'prov-approach', 'solar'];
    var SET_KINDS = ['voicing', 'inversion', 'voiceLeading', 'vlIntensity', 'qwerty', 'walk',
        'notes', 'analyze', 'tonic', 'filter', 'open', 'approach', 'planet'];

    /* ---------- validation (also run by tools/course-test.js) -------- */
    function validate(ctx) {
        var errors = [];
        var modules = (ctx && ctx.modules) || Object.keys(MODULE_LABELS);
        var looks = (ctx && ctx.looks) || null;
        var seen = {};
        LEVELS.forEach(function (lv) {
            lv.units.forEach(function (u) {
                if (!u.lessons.length) errors.push(u.id + ': a unit with no lessons');
                u.lessons.forEach(function (l) {
                    var where = l.id || '(no id)';
                    if (!l.id) errors.push('a lesson with no id');
                    if (seen[l.id]) errors.push(where + ': id used twice');
                    seen[l.id] = true;
                    if (!l.title) errors.push(where + ': no title');
                    (l.modules || []).forEach(function (m) {
                        if (modules && modules.indexOf(m) === -1) errors.push(where + ': unknown module "' + m + '"');
                    });
                    if (l.page) return;
                    if (!l.body) errors.push(where + ': no body');
                    if (!l.steps || !l.steps.length) errors.push(where + ': no steps');
                    (l.steps || []).forEach(function (st, i) {
                        if (!st.text) errors.push(where + ': step ' + (i + 1) + ' says nothing');
                        if (TARGETS.indexOf(st.at) === -1) errors.push(where + ': step ' + (i + 1) + ' points at unknown control "' + st.at + '"');
                        var kinds = st.set ? Object.keys(st.set) : [];
                        if (kinds.length > 1 || kinds.some(function (k) { return SET_KINDS.indexOf(k) === -1; })) errors.push(where + ': step ' + (i + 1) + ' sets "' + kinds.join(',') + '"');
                    });
                    if (!l.slides || !l.slides.length) errors.push(where + ': no lecture slides cited');
                    if (!l.modules || !l.modules.length) errors.push(where + ': names no modules');
                    if (looks && looks.indexOf(l.look) === -1) errors.push(where + ': unknown look "' + l.look + '"');
                    (l.hear || []).forEach(function (h, i) {
                        var chords = h.seq || [h.notes];
                        if (!h.label || !chords.length || chords.some(function (c) { return !c || !c.length; })) errors.push(where + ': hear #' + (i + 1) + ' is empty');
                        chords.forEach(function (c) {
                            (c || []).forEach(function (n) { if (!/^[A-G](#|b)?-?\d$/.test(n)) errors.push(where + ': "' + n + '" is not a note with an octave'); });
                        });
                    });
                    var c = l.check || {};
                    if (c.quiz) {
                        if (!c.quiz.q || !c.quiz.options || !(c.quiz.answer >= 0 && c.quiz.answer < c.quiz.options.length)) errors.push(where + ': quiz answer out of range');
                    } else if (c.steps) {
                        if (!(l.steps || []).some(function (st) { return st.set; })) errors.push(where + ': checked by steps, but no step sets anything');
                    } else {
                        errors.push(where + ': no check');
                    }
                    if (l.setup && l.setup.tab && modules && modules.indexOf(l.setup.tab) === -1) errors.push(where + ': unknown tab "' + l.setup.tab + '"');
                });
            });
        });
        return { ok: !errors.length, errors: errors };
    }

    /* ---------- the course on the landing page ----------------------- */
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    // Plain names for the studio modules (studio-looks.js MODULES labels;
    // this file renders before that one loads).
    var MODULE_LABELS = {
        numgen: 'Generator', circle: 'Circle of 5ths', chords: 'Container Chord', relations: 'Scale Relations',
        sheet: 'Sheet Music', solar: 'Solar System', grading: 'Grading Key', fretboard: 'Fretboard', chordstrip: 'Chord Strip'
    };
    function moduleLabel(mid) { return MODULE_LABELS[mid] || mid; }

    function slideText(l) {
        if (!l.slides || !l.slides.length) return '';
        var s = l.slides, range = s.length > 1 && s[s.length - 1] - s[0] === s.length - 1 ? s[0] + '–' + s[s.length - 1] : s.join(', ');
        return (s.length > 1 ? 'slides ' : 'slide ') + range;
    }

    // The Learn pages keep their own launchers, bound by these ids when the
    // page loads, so the course renders every level once and the level
    // buttons only show and hide them: a re-render would unbind them.
    var PAGE_BUTTON_IDS = { notes: 'launch-learn-notes-btn', scales: 'launch-learn-scales-btn', chords: 'launch-learn-chords-btn', inversions: 'launch-learn-inversions-btn' };

    function metaFor(l) {
        var meta = l.page ? (l.parts ? l.parts + ' short lessons' : 'Interactive page') : slideText(l);
        if (l.id === 'b-scales') meta += ' · ' + scalesProgress().done + ' of 9 done';
        return meta;
    }

    function renderPath() {
        var host = document.getElementById('course-path');
        if (!host || host.hasAttribute('data-rendered')) return;
        host.setAttribute('data-rendered', '');
        if (!host.getAttribute('data-level')) host.setAttribute('data-level', 'beginner');
        var html = '';
        LEVELS.forEach(function (lv) {
            html += '<div class="course-level" data-level="' + lv.id + '">';
            html += '<div class="course-level-head"><span class="course-level-name">' + esc(lv.name) + '</span><span class="course-level-blurb">' + esc(lv.blurb) + '</span></div>';
            if (lv.id !== 'beginner') html += '<div class="course-source">From the lecture <i>' + SOURCE + '</i>. Each lesson opens the studio on the tools it uses.</div>';
            lv.units.forEach(function (u) {
                html += '<div class="course-unit" data-unit="' + u.id + '"><div class="course-unit-head"><span class="course-unit-title">' + esc(u.title) + '</span>' +
                        '<span class="course-unit-progress"></span></div><ol class="course-lessons">';
                u.lessons.forEach(function (l) {
                    var mods = (l.modules || []).map(function (m) { return '<span class="course-mod">' + esc(moduleLabel(m)) + '</span>'; }).join('');
                    var btnId = l.page && PAGE_BUTTON_IDS[l.page] ? ' id="' + PAGE_BUTTON_IDS[l.page] + '"' : '';
                    html += '<li class="course-lesson" data-lesson="' + l.id + '">' +
                            '<button type="button" class="course-lesson-btn"' + btnId + ' data-lesson="' + l.id + '">' +
                            '<span class="course-lesson-title">' + esc(l.title) + '</span>' +
                            (l.summary ? '<span class="course-lesson-sub">' + esc(l.summary) + '</span>' : '') +
                            '<span class="course-lesson-meta"><span class="course-lesson-where"></span>' + (mods ? ' · uses ' + mods : '') + '</span>' +
                            '</button></li>';
                });
                html += '</ol></div>';
            });
            html += '</div>';
        });
        host.innerHTML = html;
        host.querySelectorAll('.course-lesson-btn').forEach(function (b) {
            b.addEventListener('click', function () { start(b.getAttribute('data-lesson'), true); });
        });
        refresh();
    }

    function refresh() {
        var host = document.getElementById('course-path');
        if (!host) return;
        host.querySelectorAll('.course-lesson').forEach(function (li) {
            var l = BY_ID[li.getAttribute('data-lesson')];
            if (!l) return;
            li.classList.toggle('is-done', isDone(l.id));
            var w = li.querySelector('.course-lesson-where');
            if (w) w.textContent = metaFor(l);
        });
        host.querySelectorAll('.course-unit').forEach(function (u) {
            var total = u.querySelectorAll('.course-lesson').length;
            var done = u.querySelectorAll('.course-lesson.is-done').length;
            var p = u.querySelector('.course-unit-progress');
            if (p) p.textContent = done + ' / ' + total + ' done';
        });
    }

    function setLevel(level) {
        var host = document.getElementById('course-path');
        if (host) host.setAttribute('data-level', level || 'beginner');
        refresh();
    }

    /**
     * Open a lesson. A Learn page's own button already opens it (fromButton);
     * from anywhere else, press that button for it.
     */
    function start(id, fromButton) {
        var l = BY_ID[id];
        if (!l) return;
        if (l.page) {
            if (l.id !== 'b-scales') markDone(l.id);
            if (!fromButton) {
                var b = document.getElementById(PAGE_BUTTON_IDS[l.page]);
                if (b) b.click();
            }
            return;
        }
        if (root.CourseRunner) root.CourseRunner.start(id);
    }

    function init() {
        renderPath();
        root.addEventListener('course:progress', refresh);
        root.addEventListener('focus', refresh);
    }

    root.Course = {
        levels: LEVELS,
        recap: RECAP,
        source: SOURCE,
        order: ORDER,
        get: function (id) { return BY_ID[id] || null; },
        lessonsForModule: lessonsForModule,
        isDone: isDone,
        markDone: markDone,
        validate: validate,
        targets: TARGETS,
        setKinds: SET_KINDS,
        slideText: slideText,
        moduleLabel: moduleLabel,
        renderPath: renderPath,
        setLevel: setLevel,
        refresh: refresh,
        start: start
    };

    // Rendered as soon as this script runs (it sits right after #course-path),
    // so the Learn pages' launchers find their buttons when they bind.
    if (typeof document !== 'undefined' && document.getElementById) init();
})(typeof window !== 'undefined' ? window : this);
