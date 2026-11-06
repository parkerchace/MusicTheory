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
 *   check  { quiz: { q, options, answer } }   answer is an index into options; may go with steps: true
 *          { steps: true }                     done when every `set` step is
 *   widget { kind, … }   a hands-on part in the card (course-widgets.js), put
 *          where the body has <div data-course-widget>
 *   own    a lesson of the course's own, built on the lecture but not from a slide
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
            blurb: 'Notes, scales, chords and their symbols, endings and the common progressions: the words and the sounds everything else is built from.',
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
                          summary: 'Same notes, a different one on the bottom, and why that matters.' },
                        {
                            id: 'b-chord-symbols',
                            title: 'Reading chord symbols',
                            summary: 'What the letters and marks in Cmaj7, Dm7, G7, Bø7 and G♯°7 tell you to play.',
                            look: 'focus',
                            modules: ['chordstrip', 'chords'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>A chord symbol is a <b>letter</b>, the root, then marks that say how to build on it. The <b>numbers</b> are steps of the root’s major scale: 1·3·5 is a major chord, and a ♭ lowers one of them a half step, so 1·♭3·5 is minor. Pick any root below; the marks mean the same on every letter.</p>' +
                                  '<div data-course-widget></div>' +
                                  '<p>The circle is the one to learn first: <b>°</b> means diminished, minor thirds stacked (3+3+3); a slash through it, <b>ø</b>, means half-diminished (3+3+4). A ♭ or ♯ before a number (G7♭13, Cm7♭5) lowers or raises just that note.</p>' +
                                  '<p>Watch the <b>7</b>. A plain 7 means the <b>lower</b> one: <b>C7</b> is C·E·G·<b>B♭</b>. For the 7 that is in C major, B, the symbol says <b>maj7</b> (or Δ): <b>Cmaj7</b> is C·E·G·<b>B</b>. Play the two rows above and hear the one note change.</p>' +
                                  '<p>Numbers past 7 keep counting up into the next octave: <b>9 is the 2, 11 is the 4, 13 is the 6</b>, just higher. So Cmaj9 is Cmaj7 with D on top, and G7♭13 is G7 with E♭ (its ♭6) added.</p>',
                            // the table: `d` is the chord's numbers on its root, bottom note first
                            widget: {
                                kind: 'symbols',
                                roots: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
                                rows: [
                                    { sym: '', say: 'major', d: '1 3 5' },
                                    { sym: 'm', say: 'minor', d: '1 b3 5' },
                                    { sym: '°', alt: 'dim', say: 'diminished', d: '1 b3 b5' },
                                    { sym: '+', alt: 'aug', say: 'augmented', d: '1 3 #5' },
                                    { sym: '7', say: 'seven (dominant)', d: '1 3 5 b7' },
                                    { sym: 'maj7', alt: 'Δ7', say: 'major seven', d: '1 3 5 7' },
                                    { sym: 'm7', say: 'minor seven', d: '1 b3 5 b7' },
                                    { sym: 'ø7', alt: 'm7♭5', say: 'half-diminished', d: '1 b3 b5 b7' },
                                    { sym: '°7', alt: 'dim7', say: 'diminished seven', d: '1 b3 b5 bb7' },
                                    { sym: '6', say: 'six', d: '1 3 5 6' },
                                    { sym: 'm6', say: 'minor six', d: '1 b3 5 6' },
                                    { sym: 'sus4', say: 'suspended 4th', d: '1 4 5' },
                                    { sym: 'sus2', say: 'suspended 2nd', d: '1 2 5' },
                                    { sym: 'maj9', say: 'major nine', d: '1 3 5 7 9' },
                                    { slash: '3', say: 'its 3rd in the bass', d: '3 5 8' }
                                ]
                            },
                            steps: [
                                { text: 'Read the <b>chord strip</b>: the chords of C major, written as symbols. Its last one is Bø7.', at: 'chord-strip' },
                                { text: 'In <b>Container Chord</b>, type <b>B D F A</b> and press <b>Find Chords</b>. Among its names are Bm7b5 (another way to write Bø7) and Dm6: the same four notes, read from another root.', at: 'cc-input', set: { notes: 'B D F A' } }
                            ],
                            check: { quiz: { q: 'What does the small circle in G♯°7 mean?', options: ['Diminished', 'Major', 'Half-diminished', 'Augmented'], answer: 0 } }
                        },
                        {
                            id: 'b-cadences',
                            title: 'Endings: how a phrase comes home',
                            summary: 'Full stop, amen, comma, surprise: the four ways a phrase ends, learned by ear.',
                            look: 'focus',
                            modules: ['chordstrip'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>Some chords lean and some rest. The one that rests is <b>home</b>, the 1, and the way a phrase gets back there, or doesn’t, is its <b>ending</b> (a <i>cadence</i>). There are four you will hear everywhere. You don’t need their names to feel them: play each one, then see if you can tell them apart by ear.</p>' +
                                  '<div data-course-widget></div>' +
                                  '<p>Why the full stop feels so final: the 5 chord holds the note just under home (B, in C), and it climbs a half step up to it. Later lessons borrow that pull to lead into any chord, not just home.</p>' +
                                  '<p>Minor songs end the same way. In A minor the full stop is <b>E7 → Am</b>: E7 holds <b>G♯</b>, the note just under A, so A gets the same half-step pull home that C gets from B. G♯ isn’t in C major or plain A minor; E7 borrows it (harmonic minor, in Learn Scales).</p>',
                            // `phrase` is chords of the key by number; 5^7 is the 5 chord with its 7th (G7 in C)
                            widget: {
                                kind: 'cadences',
                                keys: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
                                endings: [
                                    { nick: 'Full stop', name: 'authentic cadence · 5 → 1', phrase: '1 4 5^7 1', says: 'Finished: the strongest way home.' },
                                    { nick: 'Amen', name: 'plagal cadence · 4 → 1', phrase: '1 6 4 1', says: 'Finished, but softer: the “amen” at the end of a hymn.' },
                                    { nick: 'Comma', name: 'half cadence · stops on 5', phrase: '1 6 2 5', says: 'Stops on 5, like a question waiting for its answer.' },
                                    { nick: 'Surprise', name: 'deceptive cadence · 5 → 6', phrase: '1 4 5^7 6', says: 'You expect the full stop, and land on the sadder 6 chord instead.' },
                                    { nick: 'Minor full stop', name: 'authentic cadence in minor · the 6’s own 5 → 6', phrase: '6 4 3d 6', says: 'Finished, but sad: the 6 chord as home, reached from its own 5 chord.' }
                                ]
                            },
                            steps: [
                                { text: 'Play them yourself: on the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'The bottom row is the key’s chords: <b>Z</b> is 1, <b>V</b> is 4, <b>B</b> is 5, <b>N</b> is 6. Play <b>B Z</b> (full stop), <b>V Z</b> (amen), <b>Z B</b> (comma) and <b>B N</b> (surprise). For the minor full stop, <b>6</b> plays E7: try <b>6 N</b>.', at: 'qk-keys' }
                            ],
                            check: { quiz: { q: 'Which ending sounds unfinished, like a question?', options: ['Full stop (5 → 1)', 'Amen (4 → 1)', 'Comma (stops on 5)', 'Surprise (5 → 6)'], answer: 2 } }
                        },
                        {
                            id: 'b-progressions',
                            title: 'Common chord progressions',
                            summary: 'The few chord orders behind thousands of songs, by number, in any key.',
                            look: 'focus',
                            modules: ['numgen', 'chordstrip'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>A <b>progression</b> is the order the chords come in, and songs reuse the same few so often that you already know them by ear. They are written as <b>numbers</b>: each number is the key’s chord on that note, so in C, 1 is C, 4 is F, 5 is G and 6 is Am. Change the key and the numbers stay the same, which is why they are written that way.</p>' +
                                  '<div data-course-widget></div>' +
                                  '<p>Listen to how they end: most stop on 5 or come home to 1, the comma and the full stop from the last lesson.</p>',
                            // `d` is chords of the key by number: 2^7 a seventh chord, 1d a dominant 7th (the blues' C7)
                            widget: {
                                kind: 'progressions',
                                keys: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
                                list: [
                                    { name: 'Pop', d: '1 5 6 4', known: '“Let It Be”, “Don’t Stop Believin’”' },
                                    { name: 'Fifties', d: '1 6 4 5', known: '“Stand by Me”' },
                                    { name: 'Minor-first pop', d: '6 4 1 5', known: '“Zombie” (The Cranberries)' },
                                    { name: 'Three chords', d: '1 4 5 1', known: 'folk, rock and country' },
                                    { name: 'Jazz 2-5-1', d: '2^7 5^7 1^7', known: 'the move jazz standards are built from' },
                                    { name: 'Turnaround', d: '1 6 2 5', known: '“I Got Rhythm”: it loops back to the top' },
                                    { name: 'Royal road', d: '4 5 3 6', known: 'a J-pop favourite' },
                                    { name: 'Canon', d: '1 5 6 3 4 1 4 5', known: 'Pachelbel’s Canon' },
                                    { name: '12-bar blues', d: '1d 1d 1d 1d 4d 4d 1d 1d 5d 4d 1d 5d', known: '“Johnny B. Goode”, “Hound Dog”', beat: 0.6 }
                                ]
                            },
                            steps: [
                                { text: 'In the <b>Generator</b>, press <b>🎼 Common Progression</b>: it loads one of these (and more) into the studio, and the sheet and chord strip follow. Press it again for another.', at: 'ng-common' },
                                { text: 'Or type the numbers yourself in the Generator’s box: load <b>1 5 6 4</b>.', at: 'ng-numbers', set: { degrees: '1 5 6 4' } }
                            ],
                            check: { quiz: { q: 'In the key of G (G A B C D E F♯), which chord is the 5?', options: ['C', 'D', 'Em', 'B'], answer: 1 } }
                        }
                    ]
                }
            ]
        },
        {
            id: 'intermediate',
            name: 'Intermediate',
            blurb: 'Voicings, scale chords and two ways into any chord: open a chord up so a melody fits on top, find chords in an eight-note scale, and lead in from a fifth or a fourth above.',
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
                                  '<p>You can invert the drop 2 too. Take each close inversion and drop its second-highest note: the dropped note ends up on the bottom. Name the result by its <b>bass note</b>, as the sheet does: G3 · C4 · E4 · B4 has the 5th, G, on the bottom, so it is drop 2 in <b>2nd inversion</b>.</p>',
                            hear: [
                                { label: 'Close, root position', notes: ['C4', 'E4', 'G4', 'B4'] },
                                { label: 'Drop 2, G in the bass (2nd inv)', notes: ['G3', 'C4', 'E4', 'B4'] },
                                { label: 'Drop 2, B in the bass (3rd inv)', notes: ['B3', 'E4', 'G4', 'C5'] },
                                { label: 'Drop 2, C in the bass (root)', notes: ['C4', 'G4', 'B4', 'E5'] },
                                { label: 'Drop 2, E in the bass (1st inv)', notes: ['E4', 'B4', 'C5', 'G5'] }
                            ],
                            steps: [
                                { text: 'In the sheet’s toolbar, open <b>Voicing ▾</b> and pick <b>Drop 2</b>. The typing keyboard follows.', at: 'sheet-voicing', set: { voicing: 'drop2' } },
                                { text: 'On the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'Hold <b>Q</b> for Cmaj7 in drop 2, then press <b>A</b> (or click <b>Inv</b>) to hear its four inversions.', at: 'qk-inversion' },
                                { text: 'Click <b>⇅ Walk</b> (or press <b>F</b>) and play <b>Q W E R</b>: each chord moves to the nearest inversion.', at: 'qk-walk', set: { walk: true } }
                            ],
                            check: { steps: true, quiz: { q: 'Close Cmaj7 is C4 · E4 · G4 · B4. Which note drops an octave to make drop 2?', options: ['C', 'E', 'G', 'B'], answer: 2 } }
                        },
                        {
                            id: 'i-drop-2-voice-leading',
                            title: 'Inverted drop 2s voice-lead beautifully',
                            slides: [6],
                            look: 'notation-desk',
                            modules: ['sheet'],
                            setup: { key: 'C', scale: 'major', voicing: 'drop2' },
                            body: '<p>The bass note of each drop-2 voicing points somewhere, and only one or two notes have to move to reach the next chord.</p>' +
                                  '<p>From Cmaj7 (B3 · E4 · G4 · C5) to Am7 (A3 · E4 · G4 · C5), <b>only the B falls to A</b>. From Cmaj7 (C4 · G4 · B4 · E5) to Fmaj7 over C (C4 · F4 · A4 · E5), G steps to F and B to A, and C and E hold. That is what the sheet’s <b>Voice Leading</b> option chases: the same voicing type, the smallest movement.</p>',
                            hear: [
                                { label: 'Cmaj7 → Am7', seq: [['B3', 'E4', 'G4', 'C5'], ['A3', 'E4', 'G4', 'C5']] },
                                { label: 'Cmaj7 → Fmaj7/C', seq: [['C4', 'G4', 'B4', 'E5'], ['C4', 'F4', 'A4', 'E5']] }
                            ],
                            steps: [
                                { text: 'In the sheet’s <b>Voicing Options</b> panel, tick <b>Voice Leading</b>.', at: 'sheet-voice-leading', set: { voiceLeading: true } },
                                { text: 'Drag <b>VL Intensity</b>, just below it, to the right until it reads <b>Ultra-smooth</b>.', at: 'sheet-vl-intensity', set: { vlIntensity: 80 } },
                                { text: 'On the keyboard chip, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'Click <b>⇅ Walk</b> (or press <b>F</b>), so each chord moves to its nearest inversion instead of jumping back to root position.', at: 'qk-walk', set: { walk: true } },
                                { text: 'Play <b>Q</b> then <b>Y</b> (Cmaj7 → Am7) and count the notes that move.', at: 'qk-keys' }
                            ],
                            check: { quiz: { q: 'Cmaj7 (B3 · E4 · G4 · C5) to Am7 (A3 · E4 · G4 · C5): how many notes move?', options: ['One', 'Two', 'Three', 'All four'], answer: 0 } }
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
                                { text: 'On the keyboard chip, click <b>Chords</b> and play <b>T</b> (G7) in each voicing; press <b>A</b> to step it through its inversions.', at: 'qk-mode-chords', set: { qwerty: 'chords' } }
                            ],
                            check: { steps: true, quiz: { q: 'Drop 3 lowers which note an octave?', options: ['The second-highest', 'The third-highest', 'The second and fourth from the top', 'The top note'], answer: 1 } }
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
                                  '<p><b>Bebop major</b> (also called 6-diminished) is the major scale plus a ♭6. Don’t replace the 6th: add A♭ alongside it. That makes eight notes instead of seven, so the scale lines up with eighth-note phrasing.</p>' +
                                  '<p>Now skip every other note, and there are only <b>two chord types</b>. The odd degrees all give the same C6 (C·E·G·A) in its inversions. The even degrees all give the same diminished 7th (D·F·A♭·B). Walk up the scale and the chords alternate tension and release: the classic sound Barry Harris taught, which plain diatonic C chords can’t make.</p>',
                            hear: [
                                { label: 'The scale', seq: [['C4'], ['D4'], ['E4'], ['F4'], ['G4'], ['Ab4'], ['A4'], ['B4'], ['C5']] },
                                { label: 'C6 · D°7 · C6/E · F°7', seq: [['C4', 'E4', 'G4', 'A4'], ['D4', 'F4', 'Ab4', 'B4'], ['E4', 'G4', 'A4', 'C5'], ['F4', 'Ab4', 'B4', 'D5']] }
                            ],
                            steps: [
                                { text: 'Read the <b>chord strip</b>: C6 · D°7 · C6/E · F°7 … two chord types, taking turns.', at: 'chord-strip' },
                                { text: 'On the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'Play the sevenths row, <b>Q W E R T Y U I</b>: degrees 1 to 8 as four-note chords, the 6 and the °7 by turns. (The bottom row plays three-note chords.)', at: 'qk-keys' }
                            ],
                            check: { quiz: { q: 'Which note does bebop major add to C major?', options: ['F♯', 'A♭', 'B♭', 'D♭'], answer: 1 } }
                        },
                        {
                            id: 'i-harmonize-6-dim',
                            title: 'Harmonize a melody: 6 or °7?',
                            slides: [14, 15],
                            look: 'luthier',
                            modules: ['chordstrip', 'sheet'],
                            setup: { key: 'C', scale: 'bebop_major', qwerty: 'harmonize', chordSize: 4 },
                            body: '<p>In this scale each melody note has just two options underneath it. If the note is one of <b>C·E·G·A</b>, put C6 under it; if it is one of <b>D·F·A♭·B</b>, put the diminished 7th. Either way <b>the melody note stays on top</b>, and that picks the inversion: melody E gets C6 with G in the bass (G·A·C·E), melody D gets the °7 with F in the bass (F·A♭·B·D). Try it on “Mary Had a Little Lamb.”</p>' +
                                  '<p><b>Bending the rule:</b> B is in this scale only inside the diminished chord (D·F·A♭·B), so the rule always makes a melody B tense. To let it rest instead, sneak in a chord that features the major 7, <b>Cmaj7</b> (C·E·G·B) with B on top: it blends right in among the bebop chords.</p>',
                            hear: [
                                { label: 'Ma-ry had a lit-tle lamb', seq: [['G3', 'A3', 'C4', 'E4'], ['F3', 'Ab3', 'B3', 'D4'], ['E3', 'G3', 'A3', 'C4'], ['F3', 'Ab3', 'B3', 'D4'], ['G3', 'A3', 'C4', 'E4'], ['G3', 'A3', 'C4', 'E4'], ['G3', 'A3', 'C4', 'E4']] },
                                { label: 'Cmaj7, B on top', notes: ['C4', 'E4', 'G4', 'B4'] }
                            ],
                            steps: [
                                { text: 'The keyboard chip is on <b>Harmonize</b>, with four-note chords: each key is a melody note with a chord under it.', at: 'qk-mode-harmonize', set: { qwerty: 'harmonize' } },
                                { text: 'Play the tune on the keys <b>C X Z X C C C</b> (E D C D E E E) and hear C6 or °7 under each note.', at: 'qk-keys' }
                            ],
                            check: { quiz: { q: 'Melody note F in C bebop major: which chord goes under it?', options: ['C6', 'The diminished 7th'], answer: 1 } }
                        }
                    ]
                },
                {
                    id: 'five-four-of',
                    title: 'Two ways into any chord',
                    lessons: [
                        {
                            id: 'i-five-four-of',
                            title: 'The 5-of and the 4-of',
                            slides: [25],
                            look: 'focus',
                            modules: ['chordstrip'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>To land on a chord, first play the chord whose root is <b>a fifth above</b> it, or <b>a fourth above</b> it. Going from Cmaj7 to Fmaj7: a fifth above F is C, and a fourth above F is B♭. (Count letters, both ends included: F G A B C is five, a 5th; F G A B♭ is four, a 4th.)</p>' +
                                  '<p><b>The 5-of</b> pulls hardest as a dominant 7th: <b>Cmaj7 → C7 → Fmaj7</b>. Only one note changes on the way in: the major 7, B, drops to B♭. Then B♭ falls to A and G to F, and you’re there.</p>' +
                                  '<p><b>The 4-of</b> is gentler, and you choose its colour: <b>Cmaj7 → B♭maj7 → Fmaj7</b> is bright, while B♭m7 or B♭m6 darkens it. The lecture’s Fm6 → Cmaj7, the dark “amen”, is the 4-of C as a minor 6.</p>' +
                                  '<p>The colours below use the numbers past 7: <b>9 = 2, 11 = 4, 13 = 6</b>, an octave up. C9 is C7 plus D; C7♭13 is C7 plus A♭, the note that leads into a minor chord.</p>' +
                                  '<div data-course-widget></div>',
                            widget: {
                                kind: 'approach',
                                mode: 'of',
                                keys: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
                                targets: [4, 2, 6, 5, 3, 1],
                                // `d` is the way-in chord's numbers on its own root
                                moves: [
                                    { interval: '5', name: '5-of (a fifth above)', say: 'a fifth above', qualities: [
                                        { s: '7', d: '1 3 5 b7', name: 'dominant 7' },
                                        { s: '9', d: '1 3 b7 9', name: 'dominant 9' },
                                        { s: '7♭9', d: '1 3 b7 b9', name: '7♭9 (darker)' },
                                        { s: '7♭13', d: '1 3 b7 b13', name: '7♭13 (into minor)' },
                                        { s: '7sus4', d: '1 4 5 b7', name: '7sus4 (floating)' },
                                        { s: 'maj7', d: '1 3 5 7', name: 'major 7 (no pull)' }
                                    ] },
                                    { interval: '4', name: '4-of (a fourth above)', say: 'a fourth above', qualities: [
                                        { s: 'maj7', d: '1 3 5 7', name: 'major 7' },
                                        { s: 'm7', d: '1 b3 5 b7', name: 'minor 7' },
                                        { s: 'm6', d: '1 b3 5 6', name: 'minor 6' },
                                        { s: '7', d: '1 3 5 b7', name: 'dominant 7' },
                                        { s: '6', d: '1 3 5 6', name: 'major 6' }
                                    ] }
                                ],
                                presets: [
                                    { label: 'C7 → Fmaj7', key: 'C', target: 4, move: '5', quality: '7' },
                                    { label: 'B♭maj7 → Fmaj7', key: 'C', target: 4, move: '4', quality: 'maj7' },
                                    { label: 'B♭m6 → Fmaj7', key: 'C', target: 4, move: '4', quality: 'm6' },
                                    { label: 'A7 → Dm7', key: 'C', target: 2, move: '5', quality: '7' },
                                    { label: 'E7♭13 → Am7', key: 'C', target: 6, move: '5', quality: '7♭13' },
                                    { label: 'Fm6 → Cmaj7', key: 'C', target: 1, move: '4', quality: 'm6' }
                                ]
                            },
                            steps: [
                                { text: 'On the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'The number keys between the sevenths are 5-ofs: <b>2</b> is A7, the 5-of Dm7 on <b>W</b>. Play <b>Q 2 W</b> (Cmaj7 → A7 → Dm7), then <b>Q 6 Y</b> (Cmaj7 → E7 → Am7).', at: 'qk-keys' }
                            ],
                            check: { quiz: { q: 'What is the 5-of Fmaj7, as a dominant 7th?', options: ['B♭7', 'C7', 'G7', 'F7'], answer: 1 } }
                        }
                    ]
                }
            ]
        },
        {
            id: 'advanced',
            name: 'Advanced',
            blurb: 'Approach chords: make the target the 1 and borrow from a scale built on it, one chord or a whole progression, a half step, a fifth or a third away.',
            units: [
                {
                    id: 'approach-chords',
                    title: 'Approach chords',
                    lessons: [
                        {
                            id: 'a-half-step-dim',
                            title: 'A °7 a half step below: borrow from the diminished scale',
                            slides: [17],
                            look: 'focus',
                            modules: ['chordstrip', 'chords'],
                            setup: { key: 'A', scale: 'diminished' },
                            body: '<p>Heading for <b>Am</b>? A classic way in is <b>G♯°7 → Am</b>: a diminished 7th a half step below. Here is where that chord comes from.</p>' +
                                  '<p><b>Make A the 1</b> for a moment (tonicize it) and borrow from another scale that starts on A: the <b>A diminished scale</b>, whole–half: A·B·C·D·E♭·F·F♯·G♯. Stack every other note and every chord in it is a diminished 7th. Its 1 chord is A°7 (A·C·E♭·F♯); the chord on G♯, the note just under A, is <b>G♯°7 (G♯·B·D·F)</b>.</p>' +
                                  '<p>Play G♯°7, then land on the A chord you were really heading for (Am, Amaj7, Asus, whichever) <b>in place of the scale’s own A°7</b>. That is a <b>7 → 1</b>: the 7 borrowed from A diminished, the 1 from your song. It works in an A key or in any key with an A chord in it: in C major, Am is the vi.</p>' +
                                  '<p>The chord strip numbers G♯°7 viii°, because this scale has eight notes. It still does a 7’s job: a half step under home.</p>' +
                                  '<p>Why is every chord in this scale a °7, and why do they repeat? A °7’s notes are all <b>3 half steps apart</b> (3+3+3, and 3 more brings you back), so it cuts the octave into four equal parts and any of its notes can be called the root: <b>G♯°7, B°7, D°7 and F°7 are the same four keys</b>. That leaves only <b>three different °7 chords</b> in all of music (on C, C♯ and D; D♯°7 is C°7 again). In A diminished, A°7 and G♯°7 simply take turns.</p>',
                            hear: [
                                { label: 'A diminished scale', seq: [['A3'], ['B3'], ['C4'], ['D4'], ['Eb4'], ['F4'], ['F#4'], ['G#4'], ['A4']] },
                                { label: 'G♯°7 → A°7, the scale’s own 1', seq: [['G#3', 'D4', 'F4', 'B4'], ['A3', 'Eb4', 'F#4', 'C5']] },
                                { label: 'G♯°7 = B°7 = D°7: the same four keys', seq: [['G#3', 'B3', 'D4', 'F4'], ['B3', 'D4', 'F4', 'G#4'], ['D4', 'F4', 'G#4', 'B4']] },
                                { label: 'G♯°7 → Am, your target', seq: [['G#3', 'D4', 'F4', 'B4'], ['A3', 'C4', 'E4', 'A4']] },
                                { label: 'In C major: C → G♯°7 → Am', seq: [['C4', 'E4', 'G4', 'C5'], ['G#3', 'D4', 'F4', 'B4'], ['A3', 'C4', 'E4', 'A4']] }
                            ],
                            steps: [
                                { text: 'Read the <b>chord strip</b>: A diminished’s chords, a diminished 7th on every note. The last one, on G♯, is G♯°7 (written G#dim7). The strip spells E♭ as D♯.', at: 'chord-strip' },
                                { text: 'In <b>Container Chord</b>, type <b>G# B D F</b> in the notes box and press <b>Find Chords</b>: every name those four notes go by.', at: 'cc-input', set: { notes: 'G# B D F' } }
                            ],
                            check: { quiz: { q: 'G♯°7 → Am is a 7 → 1 with A as the 1. Which scale is G♯°7 borrowed from?', options: ['A diminished (whole–half)', 'C major', 'G♯ major'], answer: 0 } }
                        },
                        {
                            id: 'a-tonicize-borrow',
                            title: 'Tonicize the target, borrow from a scale on it',
                            slides: [18, 19],
                            look: 'notation-desk',
                            modules: ['sheet'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>Going from Cmaj7 to Fmaj7? <b>Make F the 1</b> for a moment (tonicize it) and borrow a chord from another scale that starts on F: <b>F bebop major</b>, F·G·A·B♭·C·D♭·D·E. Its 2 chord is <b>G°7 (G·B♭·D♭·E)</b>. B♭ and D♭ aren’t in C major, and the chord points straight at F.</p>' +
                                  '<p>Why it points: G°7 has the same four notes as E°7, and E is the note just under F. So Cmaj7 → G°7 → Fmaj7 is the same 7 → 1 as G♯°7 → Am, borrowed from an F scale this time.</p>' +
                                  '<p>The rule behind all of it: <b>to approach a chord, make it the 1 and take a chord from a scale that starts on it.</b> Approaching a chord is foreshadowing, and the scale you borrow from sets the light on the arrival: bright, dark or mysterious.</p>',
                            hear: [
                                { label: 'Cmaj7 → G°7 → Fmaj7', seq: [['C4', 'E4', 'G4', 'B4'], ['Db4', 'E4', 'G4', 'Bb4'], ['C4', 'E4', 'F4', 'A4']] }
                            ],
                            steps: [
                                { text: 'Click <b>🔍 Where the music comes from</b>, the panel that comes with the score, to open it.', at: 'prov', set: { open: 'prov' } },
                                { text: 'In <b>🎯 Approach a progression</b>, type <b>1 4</b>, press <b>Build</b>, then click <b>Fmaj7</b> to list the ways into it.', at: 'prov-approach', set: { approach: '1 4' } },
                                { text: 'Set its menu to <b>borrow</b>: chords from scales that start on F. <b>Gdim7</b>, from F Bebop Major, is the one above. Press <b>▶</b> to hear it; <b>Add to sheet</b> keeps it.', at: 'prov-approach' }
                            ],
                            check: { quiz: { q: 'Which two notes of G°7 are outside C major?', options: ['G and E', 'B♭ and D♭', 'B and D'], answer: 1 } }
                        },
                        {
                            id: 'a-scales-as-moods',
                            title: 'Scales carry moods: bebop minor and borrowed chords',
                            slides: [20, 21],
                            look: 'focus',
                            modules: ['relations', 'chordstrip'],
                            setup: { key: 'D', scale: 'mixolydian_6' },
                            body: '<p><b>Bebop minor</b> is bebop major with a ♭3: C·D·E♭·F·G·A♭·A·B. Its chords alternate minor 6 and diminished: mysterious, melancholy, noir.</p>' +
                                  '<p>Pick the scale for the mood you want. Approaching Dmaj7, <b>make D the 1</b> and borrow from another scale that starts on D: <b>D Mixolydian ♭6</b> (D·E·F♯·G·A·B♭·C). Its 3 and 2 chords are half-diminished: <b>F♯ø7 → Eø7 → Dmaj7</b>, borrowed, borrowed, home. Only one note in each borrowed chord is “wrong” for D major (C in F♯ø7, B♭ in Eø7), and that note is the colour.</p>',
                            hear: [
                                { label: 'Cm6 ↔ D°7', seq: [['C4', 'Eb4', 'G4', 'A4'], ['D4', 'F4', 'Ab4', 'B4'], ['C4', 'Eb4', 'G4', 'A4']] },
                                { label: 'F♯ø7 → Eø7 → Dmaj7', seq: [['F#4', 'A4', 'C5', 'E5'], ['E4', 'G4', 'Bb4', 'D5'], ['D4', 'F#4', 'A4', 'C#5']] }
                            ],
                            steps: [
                                { text: 'Read the <b>chord strip</b>: D Mixolydian ♭6’s chords. Its 2 and 3 are Em7♭5 and F♯m7♭5, the same as Eø7 and F♯ø7.', at: 'chord-strip' },
                                { text: 'In <b>Scale Relationships</b>, type <b>Em7b5</b> in the chord box and press <b>Analyze</b>.', at: 'sre-input', set: { analyze: 'Em7b5' } },
                                { text: 'In the tonic row, click <b>D</b>: only scales that start on D, the ones you can borrow from when D is the 1.', at: 'sre-tonic', set: { tonic: 'D' } }
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
                            title: 'A fifth away: Mixolydian, and ♭6 for minor',
                            slides: [22, 23, 24],
                            look: 'focus',
                            modules: ['solar', 'chordstrip'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>The 5-of again, now asking which scale it comes from. <b>Make the target the 1</b>: its 5 chord, a dominant 7th, pulls straight back to it. In C, heading for Dm (the 2): D’s 5 is A, and <b>A7 (A·C♯·E·G)</b> leads in. Its C♯ is the one note from outside C major, a half step under D. Full loop: <b>C → A7 → Dm → G7 → C</b> (1 → 5-of 2 → 2 → 5 → 1).</p>' +
                                  '<p>The scale on A that makes A7 is <b>A Mixolydian</b>, major with a ♭7, the dominant-sounding 5th mode. It has F♯, though, and Dm has F. For a <b>minor</b> target, give the 5-of a ♭6 as well: <b>A Mixolydian ♭6</b> (A·B·C♯·D·E·F·G), whose A7♭13 already holds Dm’s F. In the same way, G7♭13 from G Mixolydian ♭6 resolves beautifully into C minor.</p>' +
                                  '<p>Mixolydian ♭6 changes moods, too: in a happy song in G, borrow its 4 chord, <b>Cm</b>, or its ♭7 chord, <b>F7</b>, before the last G, for a reverent ending.</p>',
                            hear: [
                                { label: 'A7 → Dm', seq: [['G3', 'C#4', 'E4', 'A4'], ['F3', 'D4', 'F4', 'A4']] },
                                { label: 'A7♭13 → Dm', seq: [['G3', 'C#4', 'F4', 'A4'], ['F3', 'D4', 'F4', 'A4']] },
                                { label: 'C → A7 → Dm → G7 → C', seq: [['C4', 'E4', 'G4'], ['G3', 'C#4', 'E4', 'A4'], ['F3', 'D4', 'F4', 'A4'], ['F3', 'B3', 'D4', 'G4'], ['E3', 'C4', 'E4', 'G4']] },
                                { label: 'G7♭13 → Cm', seq: [['G2', 'B3', 'F4', 'Eb5'], ['C3', 'C4', 'Eb4', 'Eb5']] },
                                { label: 'G → Cm → G, the reverent ending', seq: [['G3', 'B3', 'D4'], ['G3', 'C4', 'Eb4'], ['G3', 'B3', 'D4']] }
                            ],
                            steps: [
                                { text: 'In the <b>Solar System</b>, click the <b>D</b> planet: its moons appear, numbered from D. The moon numbered <b>5</b> is its five-of, A7.', at: 'solar', set: { planet: 'D' } },
                                { text: 'Open <b>🔍 Where the music comes from</b>, with the score. In <b>🎯 Approach a progression</b>, type <b>1 2</b>, press <b>Build</b> and click <b>Dm7</b>.', at: 'prov-approach', set: { approach: '1 2' } },
                                { text: 'Set its menu to <b>dominant</b>: the five-of, A7, is in the list. Press <b>▶</b> to hear it lead in.', at: 'prov-approach' }
                            ],
                            check: { quiz: { q: 'Heading for Dm, which five-of already holds Dm’s own F?', options: ['A7, from A Mixolydian', 'A7♭13, from A Mixolydian ♭6', 'E7, from E Mixolydian'], answer: 1 } }
                        },
                        {
                            id: 'a-chromatic-mediants',
                            title: 'A third away: chromatic mediants',
                            slides: [26, 27],
                            look: 'focus',
                            modules: ['solar', 'relations'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>Major 7th chords whose roots are a major third apart share two notes (plain triads share only one), and <b>those shared notes carry you in</b>, and back out to the tonic.</p>' +
                                  '<p>Cmaj7 (C·E·G·B) → Emaj7 (E·G♯·B·D♯) shares E and B: voiced C4·E4·G4·B4 → E4·G♯4·B4·D♯5, E4 and B4 stay put while the other two move. Cmaj7 → A♭maj7 (A♭·C·E♭·G) shares C and G. Verse in C, chorus in E (pivot on E and B), and back to C on the same two notes.</p>' +
                                  '<p>Pivot moods with extended chords a third apart. Vamp <b>Cmaj9 ↔ E♭maj9</b>, a minor third up: voiced C3·E4·G4·B4·D5 ↔ E♭3·G4·B♭4·D5·F5, G4 and D5 hold while everything else shifts, bright, then wistful, then bright again.</p>',
                            hear: [
                                { label: 'Cmaj7 → Emaj7 → Cmaj7', seq: [['C4', 'E4', 'G4', 'B4'], ['E4', 'G#4', 'B4', 'D#5'], ['C4', 'E4', 'G4', 'B4']] },
                                { label: 'Cmaj7 → A♭maj7/C → Cmaj7', seq: [['C4', 'E4', 'G4', 'B4'], ['C4', 'Eb4', 'G4', 'Ab4'], ['C4', 'E4', 'G4', 'B4']] },
                                { label: 'Cmaj9 ↔ E♭maj9', seq: [['C3', 'E4', 'G4', 'B4', 'D5'], ['Eb3', 'G4', 'Bb4', 'D5', 'F5'], ['C3', 'E4', 'G4', 'B4', 'D5']] }
                            ],
                            steps: [
                                { text: 'In the <b>Solar System</b>, click the <b>C</b> planet: its pink moons, numbered <b>♭3, 3, ♭6, 6</b>, are its chromatic mediants.', at: 'solar', set: { planet: 'C' } },
                                { text: 'In <b>Scale Relationships</b>, type <b>Cmaj7</b> and press <b>Analyze</b>.', at: 'sre-input', set: { analyze: 'Cmaj7' } },
                                { text: 'Under the results, click the <b>3/6 Mediant</b> filter: the scales a third away that hold it.', at: 'sre-mediant', set: { filter: 'mediant' } }
                            ],
                            check: { quiz: { q: 'Which two notes do Cmaj7 and A♭maj7 share?', options: ['E and B', 'C and G', 'G and D'], answer: 1 } }
                        }
                    ]
                },
                {
                    id: 'progressions-into',
                    title: 'Progressions into a target',
                    lessons: [
                        {
                            id: 'a-progression-into-target',
                            title: 'Tonicize with a whole progression',
                            own: true,
                            look: 'focus',
                            modules: ['chordstrip', 'sheet'],
                            setup: { key: 'C', scale: 'major' },
                            body: '<p>Every approach so far borrowed one chord. Now borrow a whole <b>progression</b>: pick the target, <b>make it the 1</b>, play a common progression from a scale built on it, and land on the target with all that colour behind it.</p>' +
                                  '<p>In C, heading for <b>Dm7</b>, its 2-5-1 can come from <b>D major</b> (Em7 → A7 → Dm7) or from <b>D harmonic minor</b> (Eø7 → A7 → Dm7). Either way the last chord is your Dm7, in place of that scale’s own 1. Longer progressions start further out (6-2-5, 3-6-2-5), and stranger scales give stranger colours. Try them: amber notes are the ones from outside C, underlined ones have just moved.</p>' +
                                  '<div data-course-widget></div>',
                            // `patterns` are progression numbers in the scale on the target; '7' is the note under its 1, in any scale
                            widget: {
                                kind: 'approach',
                                mode: 'scale',
                                keys: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
                                targets: [2, 6, 4, 3, 5, 1],
                                patterns: ['2 5', '6 2 5', '3 6 2 5', '4 5', '5', '4', '2', '7'],
                                scales: ['major', 'harmonic_minor', 'minor', 'melodic_minor', 'dorian', 'mixolydian', 'mixolydian_b6', 'phrygian_dominant',
                                         'harmonic_major', 'lydian', 'bebop_major', 'bebop_minor', 'diminished'],
                                presets: [
                                    { label: 'Dm7 · D major 2-5', key: 'C', target: 2, pattern: '2 5', scale: 'major' },
                                    { label: 'Dm7 · D harmonic minor 2-5', key: 'C', target: 2, pattern: '2 5', scale: 'harmonic_minor' },
                                    { label: 'Am7 · 6-2-5', key: 'C', target: 6, pattern: '6 2 5', scale: 'harmonic_minor' },
                                    { label: 'Fmaj7 · 3-6-2-5', key: 'C', target: 4, pattern: '3 6 2 5', scale: 'major' },
                                    { label: 'Fmaj7 · bebop major’s 2', key: 'C', target: 4, pattern: '2', scale: 'bebop_major' },
                                    { label: 'Am7 · diminished’s 7', key: 'C', target: 6, pattern: '7', scale: 'diminished' }
                                ]
                            },
                            steps: [
                                { text: 'On the typing-keyboard chip at the bottom, click <b>Chords</b>.', at: 'qk-mode-chords', set: { qwerty: 'chords' } },
                                { text: 'Play D major’s 2-5 into Dm7 on it: <b>Q E 2 W</b> (Cmaj7 → Em7 → A7 → Dm7). The <b>2</b> key is A7.', at: 'qk-keys' },
                                { text: 'Open <b>🔍 Where the music comes from</b>, with the score. In <b>🎯 Approach a progression</b>, type <b>1 2</b>, press <b>Build</b> and click <b>Dm7</b>: the list has two-chord ways in as well as one.', at: 'prov-approach', set: { approach: '1 2' } }
                            ],
                            check: { quiz: { q: 'Heading for Dm7, which 2-5 comes from D harmonic minor?', options: ['Em7 → A7', 'Eø7 → A7', 'E7 → A7'], answer: 1 } }
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
        ['Tonicize + borrow', 'Make the target the 1 and borrow a chord from a scale that starts on it (G♯°7 → Am, G°7 → Fmaj7).'],
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

    /** The lesson after this one in the whole course, Learn pages included. */
    function nextLesson(id) {
        var all = [];
        LEVELS.forEach(function (lv) { lv.units.forEach(function (u) { all = all.concat(u.lessons); }); });
        for (var i = 0; i < all.length - 1; i++) if (all[i].id === id) return all[i + 1];
        return null;
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
        'chord-strip', 'cc-input', 'sre-input', 'sre-tonic', 'sre-mediant', 'prov', 'prov-approach', 'solar', 'ng-common', 'ng-numbers'];
    var SET_KINDS = ['voicing', 'inversion', 'voiceLeading', 'vlIntensity', 'qwerty', 'walk',
        'notes', 'analyze', 'tonic', 'filter', 'open', 'approach', 'planet', 'degrees'];

    /* ---------- validation (also run by tools/course-test.js) -------- */
    var WIDGETS = ['symbols', 'cadences', 'progressions', 'approach'];
    var NUMBERS = /^(?:b{1,2}|#{1,2})?\d+(?:\s+(?:b{1,2}|#{1,2})?\d+)*$/;     // '1 b3 5 bb7'
    var KEY_CHORDS = /^[1-7](?:\^7|d)?(?:\s+[1-7](?:\^7|d)?)*$/;            // '1 4 5^7 1', '1d 4d'

    /** A widget's data, which the lesson can only show wrong once it is open. */
    function validateWidget(l, where, errors) {
        var w = l.widget;
        if (WIDGETS.indexOf(w.kind) === -1) { errors.push(where + ': unknown widget "' + w.kind + '"'); return; }
        if (!/data-course-widget/.test(l.body)) errors.push(where + ': a widget with no place in the body');
        var keys = w.roots || w.keys;
        if (!keys || !keys.length || keys.some(function (k) { return !/^[A-G][♭♯]?$/.test(k); })) errors.push(where + ': a widget with no keys, or a key that is not a note');
        var bad = function (what) { errors.push(where + ': ' + what); };
        if (w.kind === 'symbols') (w.rows || []).forEach(function (r, i) { if (!r.say || !NUMBERS.test(r.d || '')) bad('symbol row ' + (i + 1) + ' has no numbers or no name'); });
        if (w.kind === 'cadences') (w.endings || []).forEach(function (e, i) { if (!e.nick || !KEY_CHORDS.test(e.phrase || '')) bad('ending ' + (i + 1) + ' has no name or no chords'); });
        if (w.kind === 'progressions') (w.list || []).forEach(function (p, i) { if (!p.name || !KEY_CHORDS.test(p.d || '')) bad('progression ' + (i + 1) + ' has no name or no chords'); });
        if (w.kind === 'approach') {
            if (!(w.targets || []).length || w.targets.some(function (t) { return !(t >= 1 && t <= 7); })) bad('approach targets must be degrees 1–7');
            if (w.mode === 'of') (w.moves || []).forEach(function (m) {
                if (!/^[45]$/.test(m.interval) || !(m.qualities || []).length) bad('a way in that is not a 5-of or 4-of');
                (m.qualities || []).forEach(function (q) { if (!q.name || !NUMBERS.test(q.d || '')) bad('way-in colour "' + q.name + '" has no numbers'); });
            });
            else if (w.mode === 'scale') {
                if (!(w.patterns || []).length || w.patterns.some(function (p) { return !/^[1-7](?: [1-7])*$/.test(p); })) bad('approach patterns must be degree numbers');
                if (!(w.scales || []).length) bad('an approach with no scales to borrow from');
            } else bad('an approach widget is mode "of" or "scale"');
        }
        if (!(w.list || w.endings || w.rows || w.targets || []).length) bad('an empty widget');
    }

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
                    if (l.level !== 'beginner' && !l.own && (!l.slides || !l.slides.length)) errors.push(where + ': no lecture slides cited');
                    if (!l.modules || !l.modules.length) errors.push(where + ': names no modules');
                    if (looks && looks.indexOf(l.look) === -1) errors.push(where + ': unknown look "' + l.look + '"');
                    (l.hear || []).forEach(function (h, i) {
                        var chords = h.seq || [h.notes];
                        if (!h.label || !chords.length || chords.some(function (c) { return !c || !c.length; })) errors.push(where + ': hear #' + (i + 1) + ' is empty');
                        chords.forEach(function (c) {
                            (c || []).forEach(function (n) { if (!/^[A-G](#|b)?-?\d$/.test(n)) errors.push(where + ': "' + n + '" is not a note with an octave'); });
                        });
                    });
                    if (l.widget) validateWidget(l, where, errors);
                    else if (/data-course-widget/.test(l.body)) errors.push(where + ': a place for a widget, but no widget');
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
        sheet: 'Sheet Music', solar: 'Solar System', fretboard: 'Fretboard', chordstrip: 'Chord Strip'
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
        var meta = l.page ? (l.parts ? l.parts + ' short lessons' : 'Interactive page') : (slideText(l) || 'In the studio');
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
            if (lv.id !== 'beginner') html += '<div class="course-source">Built on the lecture <i>' + SOURCE + '</i>. Each lesson opens the studio on the tools it uses.</div>';
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
            // done when it is completed (learn-common.js), not when it is opened
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
        next: nextLesson,
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
