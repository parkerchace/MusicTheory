/**
 * scoring-methods.js
 *
 * TWO KINDS OF CONTROL OVER WHAT "GENERATE" DOES, AND THEY ARE NOT THE SAME KIND.
 *
 *   A METHOD decides what the typed text is READ AS — a shape over time, a
 *   cast of subjects, a scene with timings. Exactly one is active, because a
 *   sentence cannot be two things at once.
 *
 *   A TOGGLE decides what the harmony is ALLOWED TO DO once something has been
 *   written. Any number can be on, under any method, and they apply just as
 *   well to a progression typed by hand in numbers mode as to one a method
 *   produced. They are devices, not styles.
 *
 * Keeping these apart is the whole design. A toggle forced into the method
 * dropdown becomes mutually exclusive with every method, which destroys the
 * only thing it is for — the approaches and the departures are supposed to
 * layer over whatever reading of the words is in force.
 *
 * The panel below is generated from the descriptors rather than written out
 * beside them, so it cannot drift: if a control stops reading punctuation, the
 * text stops claiming it does.
 */
(function () {
    'use strict';

    const METHODS = [];
    const TOGGLES = [];

    function registerMethod(d) { METHODS.push(d); return d; }
    function registerToggle(d) { TOGGLES.push(d); return d; }

    // ---- state, stored the way the generation path already reads it --------
    const store = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : v;
            } catch (_) { return fallback; }
        },
        set(key, value) { try { localStorage.setItem(key, String(value)); } catch (_) {} }
    };


    // =====================================================================
    // Shared machinery the readings draw on
    // =====================================================================

    const mt = () => (typeof window !== 'undefined' && window.modularApp && window.modularApp.musicTheory) || null;

    function pcOf(name) {
        const engine = mt();
        if (!engine || !engine.noteValues) return null;
        const v = engine.noteValues[String(name).replace(/-?\d+$/, '')];
        return Number.isFinite(v) ? ((v % 12) + 12) % 12 : null;
    }

    function scaleNotesOf(context) {
        const n = context && context.harmonicProfile && context.harmonicProfile.scaleNotes;
        return (Array.isArray(n) && n.length) ? n : null;
    }

    const words = (text) => String(text || '').toLowerCase().match(/[a-z']+/g) || [];

    function midiOf(name) {
        const m = String(name || '').match(/^([A-Ga-g][#b]?)(-?\d+)$/);
        if (!m) return NaN;
        const pc = pcOf(m[1]);
        return pc === null ? NaN : (Number(m[2]) + 1) * 12 + pc;
    }

    /** Spell a pitch class the way the piece is already spelling things. */
    function spellPc(pc, context) {
        const notes = scaleNotesOf(context) || [];
        for (const n of notes) if (pcOf(n) === pc) return String(n).replace(/-?\d+$/, '');
        const wantFlat = notes.some(n => /b/.test(String(n).slice(1)));
        const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flats  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        return (wantFlat ? flats : sharps)[((pc % 12) + 12) % 12];
    }

    /**
     * A WORD, READ AS SCALE DEGREES.
     *
     * The oldest literal text-to-music rule there is: letters map onto note
     * names, repeating every seven. Here they map onto DEGREES of whatever
     * scale is in force rather than onto absolute note names, so the result is
     * singable in the piece's own key instead of chromatic soup.
     *
     * Consecutive repeats collapse. A repeated degree is a repeated note, which
     * carries no contour — three D's in a row is one D as far as the shape of
     * the cell is concerned, and keeping them would pad every motif with
     * unisons the line engine then has to step around.
     */
    function degreesOfWord(word) {
        const out = [];
        for (const ch of String(word || '').toLowerCase()) {
            const i = ch.charCodeAt(0) - 97;
            if (i < 0 || i > 25) continue;
            const deg = (i % 7) + 1;
            if (out.length && out[out.length - 1] === deg) continue;
            out.push(deg);
        }
        return out;
    }

    /**
     * The same word always gives the same cell — which is the entire reason
     * this is worth having. A subject you can recognise on its return has to be
     * derived from the word, not rolled for it.
     *
     * @returns {number[]} semitone steps, each folded to the nearer octave so
     *                     the cell stays inside a singable span.
     */
    function motifOfWord(word, scaleNotes) {
        const degs = degreesOfWord(word);
        if (degs.length < 2 || !scaleNotes || !scaleNotes.length) return null;
        const pcs = degs.map(d => pcOf(scaleNotes[(d - 1) % scaleNotes.length]));
        if (pcs.some(p => p === null)) return null;
        const steps = [];
        for (let i = 1; i < pcs.length && steps.length < 5; i++) {
            let d = ((pcs[i] - pcs[i - 1]) % 12 + 12) % 12;
            if (d > 6) d -= 12;                    // the nearer way round
            if (d !== 0) steps.push(d);
        }
        return steps.length >= 2 ? steps : null;
    }

    /** Transformations a word's character applies to a subject. */
    function transformMotif(steps, character) {
        if (!steps || !steps.length) return steps;
        let out = steps.slice();
        const c = character || {};
        // Turning the shape upside down is what a negation does to it.
        if (c.invert) out = out.map(x => -x);
        // Narrowing every step darkens a subject without changing its outline.
        if (c.darken) out = out.map(x => (Math.abs(x) > 2 ? x - Math.sign(x) : x));
        // Widening opens it out.
        if (c.widen) out = out.map(x => (Math.abs(x) < 7 ? x + Math.sign(x || 1) : x));
        return out;
    }

    /** A form whose section count matches what the text actually has in it. */
    function formWithSections(count, context, seed, beatsPerBar, prefer) {
        const FP = typeof window !== 'undefined' && window.FormPlanner;
        if (!FP || !FP.FORMS || typeof FP.plan !== 'function') return null;
        const wanted = Math.max(2, Math.min(7, count));
        const keys = Object.keys(FP.FORMS).filter((k) => {
            const f = FP.FORMS[k];
            return f && Array.isArray(f.sections) && f.sections.length === wanted;
        });
        if (!keys.length) return null;
        const key = (prefer && keys.includes(prefer)) ? prefer : keys[Math.abs(seed | 0) % keys.length];
        try {
            return FP.plan({
                __forceForm: key,
                wordCount: wanted, syllableCount: wanted * 2,
                energy: context.overallEnergy, tension: context.globalTension,
                tone: context.emotionalTone, seed, beatsPerBar
            });
        } catch (_) { return null; }
    }

    // =====================================================================
    // METHODS — how the words are read
    // =====================================================================

    registerMethod({
        id: 'contour',
        label: 'Contour',
        ready: true,
        idea: 'Your text is read as a trajectory: where it rises and falls becomes where the '
            + 'music rises and falls.',
        origin: 'The oldest of the text-to-music readings, and the one this app was built on '
            + 'first — shape in, shape out.',
        reads: [
            ['syllable count and vowel brightness', 'phonetic energy and register'],
            ['what the words MEAN (emotion lexicon)', 'the emotional tone, and from it an energy curve'],
            ['that curve, sampled per beat', 'form size, harmonic rhythm, melodic register, texture density'],
            ['word count', 'how long the piece is']
        ],
        overrides: [],
        example: (text) => `“${text}” is scored for feeling and motion, and the resulting curve `
            + `decides the shape of the piece — where it climbs, where it thins out, where it lands.`,
        // The reading itself is the generator's existing behaviour, so there is
        // nothing to override. The text is recorded because every reading is
        // handed the context rather than the input, and the ones that derive
        // material from the words need it there.
        shapeContext(context, text) { return { ...context, __inputText: text }; }
    });


    registerMethod({
        id: 'cipher',
        label: 'Cipher',
        ready: true,
        idea: 'Your letters become a tune. Each letter names a degree of the scale, and the '
            + 'resulting cell is stated, answered and brought back like any other theme.',
        origin: 'The oldest literal text-to-music rule there is — letters mapped onto note names, '
            + 'repeating every seven. Not a gimmick: it is what makes a subject the SAME every time '
            + 'that word comes back.',
        reads: [
            ['each letter', 'a degree of the scale in force, repeating every seven'],
            ['repeated letters', 'collapsed — a repeated note carries no contour'],
            ['the first word long enough to make a cell', 'the theme handed to the melody'],
            ['the same word, later', 'the same cell, exactly — that is the point']
        ],
        overrides: ['the melody’s opening subject'],
        example: (text) => {
            const w = words(text).find(x => degreesOfWord(x).length >= 2) || 'dark';
            const d = degreesOfWord(w);
            return `“${w}” reads as degrees ${d.join('–')} of whatever scale the piece is in, and that `
                 + `cell becomes the theme. Type it again and you get it again.`;
        },
        melodyOptions(context) {
            const notes = scaleNotesOf(context);
            const text = (context && context.__inputText) || '';
            for (const w of words(text)) {
                const m = motifOfWord(w, notes);
                if (m) return { motif: m, motifSource: w };
            }
            return {};
        }
    });

    registerMethod({
        id: 'cast',
        label: 'Cast of Themes',
        ready: true,
        idea: 'Each word becomes a subject with its own cell, and the piece is the order in which '
            + 'they enter and what is done to them.',
        origin: 'A cue built from a set of identified subjects rather than one tune — the theme is a '
            + 'variable, not a constant, so the same intervals can be stated warmly or coldly.',
        reads: [
            ['each word', 'a subject, its cell derived from the word itself'],
            ['how many distinct words', 'how many sections the form has'],
            ['a word’s feeling', 'whether its subject is inverted, narrowed or opened out'],
            ['a repeated word', 'a literal return of that subject']
        ],
        overrides: ['the form’s section count', 'the melody’s subject'],
        example: (text) => {
            const ws = Array.from(new Set(words(text))).filter(w => degreesOfWord(w).length >= 2);
            return ws.length
                ? `${ws.length} subject${ws.length === 1 ? '' : 's'} — ${ws.slice(0, 4).join(', ')} — `
                  + `entering in that order, in a form with ${Math.max(2, Math.min(7, ws.length))} sections.`
                : 'Type a few words and each becomes a subject the piece argues between.';
        },
        shapeContext(context, text) {
            const cast = Array.from(new Set(words(text))).filter(w => degreesOfWord(w).length >= 2);
            return { ...context, __cast: cast, __inputText: text };
        },
        planForm(context, profile, seed, beatsPerBar) {
            const cast = (context && context.__cast) || [];
            if (cast.length < 2) return null;
            // A theme that returns needs a form that returns; a cast of two is
            // a statement and its answer, a cast of three is a departure.
            return formWithSections(cast.length, context, seed, beatsPerBar,
                cast.length === 3 ? 'ternary' : null);
        },
        melodyOptions(context) {
            const notes = scaleNotesOf(context);
            const cast = (context && context.__cast) || [];
            const wc = context && context.wordCharacter;
            for (const w of cast) {
                const m = motifOfWord(w, notes);
                if (!m) continue;
                // The subject is stated as the word's own character states it.
                const character = {
                    invert: !!(wc && wc.valence < -0.35),
                    darken: !!(wc && wc.tension > 0.6),
                    widen: !!(wc && wc.motion > 0.7)
                };
                return { motif: transformMotif(m, character), motifSource: w, cast };
            }
            return {};
        }
    });

    registerMethod({
        id: 'spotting',
        label: 'Spotting',
        ready: true,
        idea: 'Your text is read as a scene with timings. Sentences are sections, and your '
            + 'punctuation is the edit.',
        origin: 'Before a note is written, decide where the music starts and stops and what it has '
            + 'to land on. Cues are built backwards from those points.',
        reads: [
            ['each sentence', 'a section of the form'],
            ['a comma', 'a phrase break inside the section'],
            ['a full stop', 'a section boundary'],
            ['an exclamation mark or a capitalised word', 'a raised point the music has to land on'],
            ['a question mark', 'a phrase left open rather than closed']
        ],
        overrides: ['the form’s section count', 'where the energy peaks'],
        example: (text) => {
            const sentences = String(text).split(/[.!?]+/).map(x => x.trim()).filter(Boolean);
            const clauses = String(text).split(/[,;:]+/).filter(x => x.trim()).length;
            return `${sentences.length || 1} section${sentences.length === 1 ? '' : 's'} from the `
                 + `sentences, ${clauses} phrase${clauses === 1 ? '' : 's'} from the punctuation inside `
                 + `them. Add a full stop and the form changes.`;
        },
        shapeContext(context, text) {
            const t = String(text || '');
            const sentences = t.split(/[.!?]+/).map(x => x.trim()).filter(Boolean);
            const hits = (t.match(/!|\b[A-Z]{2,}\b/g) || []).length;
            const open = /\?/.test(t);
            const out = { ...context, __inputText: text, __sentences: sentences.length, __hits: hits };
            // A raised point is a raise: the marks that mean emphasis mean it
            // here too, rather than being discarded as they were before.
            if (hits > 0) {
                out.overallEnergy = Math.min(0.98, (context.overallEnergy || 0.5) + 0.08 * hits);
                out.globalTension = Math.min(0.98, (context.globalTension || 0.5) + 0.05 * hits);
            }
            // A question does not close. Left open is a real cadential choice.
            if (open) out.performanceIntent = context.performanceIntent || 'questioning';
            return out;
        },
        planForm(context, profile, seed, beatsPerBar) {
            const n = (context && context.__sentences) || 0;
            if (n < 2) return null;
            return formWithSections(n, context, seed, beatsPerBar);
        }
    });

    registerMethod({
        id: 'blocks',
        label: 'Blocks',
        ready: true,
        idea: 'A handful of bars of material, and then no more inventing — the piece is made by '
            + 'reordering and stacking what is already there.',
        origin: 'Rather than one long stretch of music, a few short cells that can be rearranged and '
            + 'layered. Intensity becomes how many are sounding, never new notes.',
        reads: [
            ['your words', 'the ground — the first few chords, and nothing after them'],
            ['how many words', 'how many bars the ground runs before it repeats'],
            ['the energy curve', 'how many layers are sounding, not what they play'],
            ['everything after the ground', 'the same chords again, in the same order']
        ],
        overrides: ['the chord progression after its first few bars'],
        example: (text) => `The first few bars of “${text}” become the ground, and the rest of the piece `
            + `is that ground again. Nothing new is written after it — what changes is how much of it `
            + `you hear at once.`,
        constrainHarmony(harmony, context, arc) {
            const seq = harmony && harmony.chordSequence;
            if (!Array.isArray(seq) || !seq.length) return harmony;
            const bars = new Map();
            seq.forEach((e) => { if (!bars.has(e.bar)) bars.set(e.bar, e.chord); });
            const order = Array.from(bars.keys()).sort((a, b) => a - b);
            // The ground is the opening bars, capped at four: past four cells a
            // listener stops hearing a repeating ground and starts hearing a
            // through-composed progression, which is the thing this forbids.
            const groundLen = Math.max(2, Math.min(4, Math.round((context.wordTokens || []).length / 2) || 2));
            if (order.length <= groundLen) return harmony;
            const ground = order.slice(0, groundLen).map(b => bars.get(b));
            // Rewrite every later bar to the ground bar it corresponds to, by
            // copying that bar's events wholesale — the chord object, its
            // voicing and its spelling all have to travel together or the
            // repeat is a different chord wearing the same name.
            const byBar = new Map();
            seq.forEach((e) => {
                if (!byBar.has(e.bar)) byBar.set(e.bar, []);
                byBar.get(e.bar).push(e);
            });
            const rebuilt = [];
            order.forEach((bar, i) => {
                const srcBar = order[i % groundLen];
                const src = byBar.get(srcBar) || [];
                const here = byBar.get(bar) || [];
                if (i < groundLen) { rebuilt.push(...here); return; }
                // Keep this bar's own timing; take the ground bar's harmony.
                here.forEach((e, k) => {
                    const from = src[Math.min(k, src.length - 1)];
                    if (!from) { rebuilt.push(e); return; }
                    rebuilt.push({
                        ...e,
                        chord: from.chord, chordObj: from.chordObj, roman: from.roman,
                        voicing: from.voicing, scaleHint: from.scaleHint,
                        scaleHintNotes: from.scaleHintNotes,
                        explain: `The ground, bar ${(srcBar % groundLen) + 1} of ${groundLen}: this `
                            + `piece stops inventing after its opening ${groundLen} bars and is built `
                            + `by repeating them. What changes from here is how much is sounding at `
                            + `once, not what is played.`
                    });
                });
            });
            return { ...harmony, chordSequence: rebuilt, ground: ground };
        }
    });

    registerMethod({
        id: 'pedal',
        label: 'Pedal & Colour',
        ready: true,
        idea: 'One bass note, held. The harmony above it stops being a journey and becomes a set of '
            + 'colours applied to one place.',
        origin: 'Whole stretches of music sitting on a single sustained bass note, with the chords '
            + 'above chosen for how they rub against it rather than for where they lead.',
        reads: [
            ['the key your words chose', 'the pedal note, held under everything'],
            ['the chords the words produced', 'kept, but re-heard as colours over that one bass note'],
            ['the energy curve', 'how thick the texture above the pedal gets'],
            ['nothing at all', 'the bass. It does not move, and that is the device']
        ],
        overrides: ['the bass line — it stops moving entirely'],
        example: (text) => `“${text}” picks a key, and its tonic then sits under the whole piece as a `
            + `held bass note. The chords above still change; the floor never does.`,
        textureOverrides(piano, context) {
            if (!piano || !Array.isArray(piano.leftHand) || !piano.leftHand.length) return piano;
            const root = context && context.harmonicProfile && context.harmonicProfile.root;
            const pedalPc = pcOf(root);
            if (pedalPc === null) return piano;
            const spelled = spellPc(pedalPc, context);
            // Move the LOWEST note of every left-hand event onto the pedal, at
            // or below where that voice already was — a pedal that drifts
            // upward is not a floor. The upper voices are left exactly as the
            // voicing decided them, so the chords keep their identity and only
            // the bottom is fixed, which is the difference between a pedal and
            // a transposition.
            //
            // `midis` and `noteNames` are two views of the same event and
            // playback, export and notation each read a different one, so they
            // have to be changed together or the page and the sound disagree.
            const leftHand = piano.leftHand.map((ev) => {
                const midis = Array.isArray(ev.midis) ? ev.midis.slice() : null;
                if (!midis || !midis.length) return ev;
                let lowIdx = 0;
                midis.forEach((m, i) => { if (m < midis[lowIdx]) lowIdx = i; });
                const low = midis[lowIdx];
                let target = Math.floor(low / 12) * 12 + pedalPc;
                if (target > low) target -= 12;
                midis[lowIdx] = target;
                const names = Array.isArray(ev.noteNames) && ev.noteNames.length === ev.midis.length
                    ? ev.noteNames.slice() : null;
                if (names) names[lowIdx] = `${spelled}${Math.floor(target / 12) - 1}`;
                return { ...ev, midis, noteNames: names || ev.noteNames, pedal: true };
            });
            return { ...piano, leftHand, pedalNote: spelled };
        }
    });

    registerMethod({
        id: 'twoLines',
        label: 'Two Lines',
        ready: true,
        idea: 'A melody on the bottom as well as the top. The bass stops accompanying and starts '
            + 'singing, and the two parts move against each other.',
        origin: 'A tune underneath and a tune above at the same time, with the middle filling in the '
            + 'chord — the bass is a voice, not a foundation.',
        reads: [
            ['your words', 'the upper line, as usual'],
            ['the chords underneath', 'a second line walking through them by step'],
            ['each bar’s chord tones', 'the notes the lower line is allowed to sing'],
            ['the upper line’s register', 'kept clear of the lower one, so both stay audible']
        ],
        overrides: ['the left hand — it becomes a line rather than a pattern'],
        example: (text) => `“${text}” writes the tune, and then the bass writes a second one underneath `
            + `it — stepwise through the chords, so you can follow either part on its own.`,
        textureOverrides(piano, context) {
            if (!piano || !Array.isArray(piano.leftHand) || !piano.leftHand.length) return piano;
            // Take the lowest voice and make it MOVE: one note per event,
            // stepping to the nearest available chord tone rather than
            // re-striking the same one. A line is defined by going somewhere,
            // so a tone that is not the one just sung wins, and only by a
            // small interval — a leap every event is a series of entrances,
            // not a melody.
            let prev = null;
            let moved = 0;
            const leftHand = piano.leftHand.map((ev) => {
                const midis = Array.isArray(ev.midis) ? ev.midis.slice().sort((a, b) => a - b) : null;
                if (!midis || !midis.length) return ev;
                let pick = midis[0];
                if (prev !== null) {
                    let best = null, bestD = Infinity;
                    midis.forEach((m) => {
                        if (m === prev) return;
                        const d = Math.abs(m - prev);
                        if (d < bestD) { bestD = d; best = m; }
                    });
                    if (best !== null && bestD <= 5) { pick = best; }
                }
                if (prev !== null && pick !== prev) moved++;
                prev = pick;
                const idx = Array.isArray(ev.midis) ? ev.midis.indexOf(pick) : -1;
                const name = (idx >= 0 && Array.isArray(ev.noteNames) && ev.noteNames[idx])
                    ? ev.noteNames[idx] : null;
                return {
                    ...ev,
                    midis: [pick],
                    noteNames: name ? [name] : ev.noteNames,
                    line: 'bass-melody'
                };
            });
            return { ...piano, leftHand, bassMelodySteps: moved };
        }
    });

    // =====================================================================
    // TOGGLES — what the harmony may do
    // =====================================================================

    // Reading and writing the approach mode in one place. The state is
    // normalised by `normalizeApproachMode` in arc-ui-init, which migrates the
    // old `advanced` boolean into `source`; going through the accessor rather
    // than touching `window.__arcApproachScales` raw is what makes a saved
    // setting from before the change arrive in the new shape.
    const apRead = () => (window.__approachScalesMode ? window.__approachScalesMode()
        : (window.__arcApproachScales || { enabled: false, source: 'fifth', palette: 'lands', density: 0.5 }));
    const apWrite = (k, v) => {
        const m = apRead();
        m[k] = v;
        if (window.__normalizeApproachMode) window.__normalizeApproachMode(m);
        window.__arcApproachScales = m;
        store.set('arcApproachScales', JSON.stringify(m));
    };

    registerToggle({
        id: 'approach',
        label: 'Approach scales',
        idea: 'Before arriving at a chord, borrow a whole collection that points at it and play '
            + 'the way in out of that collection — a run, or a couple of chords — underneath a '
            + 'melody note that holds still while it happens.',
        origin: 'Two rootings, and they are different devices rather than a plain and a fancy one. '
            + 'A collection a FIFTH ABOVE the chord — where a dominant stands — is the one for major '
            + 'targets, because those same notes rooted on the target are the target\u2019s own major '
            + 'scale. A collection on the chord\u2019s OWN ROOT is the one for minor targets, where the '
            + 'bebop collection puts a diminished seventh a half step below the chord. Either way the '
            + 'collection is chosen for holding as much of that chord as possible.',
        reads: [
            ['the chord coming next', 'where the collection is rooted, and — when its quality is minor — that the bebop collection on its own root is the one pinned to the front'],
            ['that chord’s notes', 'which of the library’s collections is picked — most of the chord already in it wins'],
            ['the same notes re-rooted on the target', 'the tiebreak between collections holding the chord equally well: the one with an ordinary name there is the one that lands'],
            ['the melody note being held above', 'how long the walk is — about half of what that note is holding, so the borrowing lasts long enough to be heard as a colour and the chord still lands as an arrival'],
            ['the walk itself', 'one chord to four, consecutive degrees of the borrowed collection, landing next to the chord'],
            ['the melody', 'it HOLDS. The tune is what the borrowing is heard against, so it stays where it is and stays in the key while the collection moves underneath it. A tune that borrows along with the harmony leaves nothing holding your place, and the colour reads as a swerve'],
            ['a melody note that does move during the walk', 'it takes the borrowed collection, briefly, and steps back into the key — a leading tone rather than something to settle on']
        ],
        overrides: ['the base scale and every other outside device, but only while the plain backdrop is on'],
        example: () => 'A fifth above, heading to Fm7 in A♭ major: a fifth above F is C, so the way in '
            + 'is built from a C collection that already holds F, A♭ and C. Those same seven notes '
            + 'rooted on F are an ordinary scale on F — which is why it lands instead of merely '
            + 'fitting. On its own root, heading to Em: E bebop minor runs E F♯ G A B C C♯ D♯, and the '
            + 'chord a step below the target in it is D♯dim7 — the diminished seventh a half step under '
            + 'the chord, and a real degree of a named collection rather than a chromatic guess. Walk '
            + 'further back through the collection and it comes out Cdim7 → C♯m7♭5 → D♯dim7 → Em6 → Em7, '
            + 'the diminished and the sixth alternating, which is what that collection is FOR.',
        controls: [
            { kind: 'check', id: 'enabled', label: 'On',
              get: () => !!apRead().enabled,
              set: (v) => apWrite('enabled', !!v) },
            { kind: 'select', id: 'source', label: 'Rooted',
              options: [
                  ['fifth', 'A fifth above the chord'],
                  ['root', 'On the chord’s own root'],
                  ['both', 'Let the piece choose']
              ],
              hint: 'A fifth above is the one for major chords — re-rooted on the target those notes '
                  + 'are its own major scale. The chord’s own root is the one for minor chords, where '
                  + 'the bebop collection sets a diminished seventh a half step below it and its own '
                  + 'sixth chord above that. Either way the way in is a walk of one to four chords '
                  + 'taken from consecutive degrees of the borrowed collection.',
              get: () => apRead().source,
              set: (v) => apWrite('source', String(v)) },
            { kind: 'check', id: 'plainBackdrop', label: 'Plain backdrop',
              hint: 'On, this is a demonstration: the backdrop is forced to a plain major or minor '
                  + 'scale and no other device is allowed to leave the key, so everything outside the '
                  + 'key is in the approach and can be heard as such. Off, the words keep the scale '
                  + 'they chose and departures run alongside the approaches — one key, its chords '
                  + 'approached from elsewhere, and the collection moving once. That is the piece; '
                  + 'this is the demonstration of it.',
              get: () => apRead().plainBackdrop !== false,
              set: (v) => apWrite('plainBackdrop', !!v) },
            { kind: 'select', id: 'palette', label: 'Collections',
              options: [
                  ['lands', 'The ones that land'],
                  ['sevens', 'Seven-note collections only'],
                  ['all', 'Everything in the library']
              ],
              hint: 'The ones that land pins mixolydian above the chord and the bebop collection on '
                  + 'its root to the front, with the rest of the library still behind them — a default, '
                  + 'not a restriction. Everything opens all of it, including the eight-note '
                  + 'collections the seven-note filter used to hide.',
              get: () => apRead().palette,
              set: (v) => apWrite('palette', String(v)) },
            { kind: 'range', id: 'density', label: 'How often', min: 0, max: 1, step: 0.05,
              hint: 'Centred: half way leaves the piece exactly as it was, and only the ends of the '
                  + 'travel change anything. A player who does this constantly still spends about half '
                  + 'the chords plainly inside the key — what is borrowed is frequent and brief, not '
                  + 'continuous.',
              format: (v) => {
                  const n = Number(v);
                  return n <= 0.15 ? 'rarely' : n <= 0.4 ? 'now and then'
                       : n <= 0.6 ? 'about half the chords' : n <= 0.85 ? 'most chords' : 'wherever it fits';
              },
              get: () => { const d = Number(apRead().density); return Number.isFinite(d) ? d : 0.5; },
              set: (v) => apWrite('density', Number(v)) }
        ]
    });

    registerToggle({
        id: 'departure',
        label: 'Departures & tonicization',
        idea: 'Leave the key — either by holding the tonic and changing the collection around it, '
            + 'or by hearing some other chord’s root as a tonic of its own — and then come back.',
        origin: 'The return is the half that makes it a device. A departure that never resolves reads '
            + 'as the music wandering off; one the closing cadence resolves keeps the piece whole. '
            + 'And the distance is a shape rather than a setting: the opening is the mild end, so a '
            + 'later departure goes further than an early one and the piece has a direction.',
        reads: [
            ['the colour dial', 'how far from the key the borrowed collection goes at its FURTHEST — one note away, two, three'],
            ['where in the piece the departure falls', 'how much of that distance it actually spends: mild at the opening, the full reach later'],
            ['the scope', 'where the music comes home: inside the line, at the next section, or on the closing cadence'],
            ['whichever chord the departure lands on', 'the momentary tonic, when the tonicizing reading is chosen'],
            ['the melody', 'it is written in the borrowed collection for exactly as long as the departure lasts']
        ],
        overrides: ['the closing-cadence colouring, when the late departure is asked for by name'],
        example: () => 'In G major, held on G but two notes darker, I–IV–V comes back as I–iv–v. Or, in '
            + 'A major, the fourth degree D is heard as a tonic in its own right and the music stays '
            + 'there until the phrase ends.',
        controls: [
            { kind: 'range', id: 'colour', label: 'Colour', min: 0, max: 1, step: 0.05,
              hint: 'How far from home. It aims rather than filters, so both ends still return '
                  + 'something — the far end is the furthest the library can actually offer.',
              format: (v) => {
                  const n = Number(v);
                  return n <= 0.15 ? 'closest' : n <= 0.4 ? 'a note or two away'
                       : n <= 0.65 ? 'three notes away' : n <= 0.85 ? 'four notes away' : 'furthest';
              },
              // Read the state itself, with the accessor only as a convenience.
              // Depending on the accessor made the control's reading contingent
              // on script order: written before the generation path loads, the
              // dial reported the default back while holding a different value.
              get: () => (Number.isFinite(window.__arcExcursionColour)
                  ? window.__arcExcursionColour
                  : (window.__excursionColour ? window.__excursionColour() : 0.5)),
              set: (v) => { window.__arcExcursionColour = Number(v); store.set('arcExcursionColour', v); } },
            { kind: 'select', id: 'shape', label: 'How it moves',
              options: [
                  ['arc', 'Mildest at the opening'],
                  ['steady', 'The same distance throughout']
              ],
              hint: 'The dial is the FURTHEST the piece goes, and the opening is milder, so a later '
                  + 'departure is audibly further out than an early one. Sampled against a player who '
                  + 'does this continuously, only the opening is genuinely mild — the distance climbs '
                  + 'steeply and then sits near its maximum. “The same distance throughout” is the '
                  + 'older behaviour, and it is a setting rather than a gesture.',
              get: () => (window.__arcExcursionShape
                  || (window.__excursionShape ? window.__excursionShape() : 'arc')),
              set: (v) => { window.__arcExcursionShape = String(v); store.set('arcExcursionShape', v); } },
            { kind: 'select', id: 'scope', label: 'Comes home',
              options: [
                  ['auto', 'Let the piece choose'],
                  ['phrase', 'Inside the line'],
                  ['section', 'At the next section'],
                  ['final', 'On the closing cadence'],
                  ['alternate', 'Twice, to the same colour'],
                  ['rest', 'Not at all']
              ],
              hint: 'On the closing cadence is the pointed one: go somewhere else late, then wrap up '
                  + 'at home, so the chord that was going to end the piece is what resolves the '
                  + 'departure. “Not at all” is the one that risks sounding disconnected.',
              get: () => (window.__arcExcursionScope
                  || (window.__excursionScope ? window.__excursionScope() : 'auto')),
              set: (v) => { window.__arcExcursionScope = String(v); store.set('arcExcursionScope', v); } }
        ]
    });

    // =====================================================================
    // The control strip and its information panel
    // =====================================================================

    const S = {
        wrap: 'display:flex; align-items:center; gap:4px;',
        sel: 'font-size:0.75rem; padding:5px 8px; min-width:130px;',
        info: 'background:transparent; border:1px solid var(--border-light); color:var(--text-muted); '
            + 'border-radius:50%; width:22px; height:22px; line-height:1; cursor:pointer; font-size:0.7rem;',
        panel: 'position:absolute; top:calc(100% + 8px); left:0; z-index:9999; width:440px; max-height:70vh; '
            + 'overflow:auto; background:var(--bg-panel,#0f2741); border:1px solid var(--border-light,#0f3460); '
            + 'border-radius:4px; padding:14px 16px; box-shadow:0 8px 28px rgba(0,0,0,.45); '
            + 'font-size:11px; line-height:1.65; color:var(--text-secondary,#94a3b8);',
        h: 'color:#22d3ee; font-weight:bold; font-size:11.5px; margin:0 0 6px;',
        sub: 'color:#64748b; font-size:10px; text-transform:uppercase; letter-spacing:.6px; margin:12px 0 4px;'
    };

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g,
            (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    /** The panel body for one descriptor. Built from its own declarations. */
    function describe(d, text) {
        const rows = (d.reads || []).map(([signal, decision]) =>
            `<tr><td style="padding:2px 10px 2px 0; color:#e2e8f0; vertical-align:top; white-space:nowrap;">`
            + `${esc(signal)}</td><td style="padding:2px 0; vertical-align:top;">${esc(decision)}</td></tr>`).join('');
        const over = (d.overrides || []).length
            ? `<div style="${S.sub}">What it takes over</div><div style="color:#fbbf24;">`
              + `${esc(d.overrides.join('; '))}</div>`
            : '';
        const ex = typeof d.example === 'function' ? d.example(text) : d.example;
        return `<div style="${S.h}">${esc(d.label)}</div>`
            + `<div style="color:#cbd5e1;">${esc(d.idea)}</div>`
            + `<div style="${S.sub}">Where it comes from</div><div>${esc(d.origin)}</div>`
            + `<div style="${S.sub}">What your words do</div>`
            + `<table style="border-collapse:collapse; width:100%;">${rows}</table>`
            + over
            + `<div style="${S.sub}">For what is in the box</div>`
            + `<div style="color:#cbd5e1; font-style:italic;">${esc(ex)}</div>`;
    }

    function buildControl(c, onChange) {
        const row = document.createElement('div');
        row.style.cssText = 'margin:8px 0;';
        const id = `sm-${c.id}-${Math.random().toString(36).slice(2, 7)}`;

        if (c.kind === 'check') {
            const lab = document.createElement('label');
            lab.style.cssText = 'display:flex; align-items:center; gap:6px; cursor:pointer; color:#e2e8f0;';
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.id = id;
            box.checked = !!c.get();
            box.addEventListener('change', () => { c.set(box.checked); onChange(); });
            lab.appendChild(box);
            lab.appendChild(document.createTextNode(c.label));
            row.appendChild(lab);
        } else if (c.kind === 'range') {
            const head = document.createElement('div');
            head.style.cssText = 'display:flex; justify-content:space-between; color:#e2e8f0;';
            const out = document.createElement('span');
            out.style.color = '#22d3ee';
            const input = document.createElement('input');
            input.type = 'range';
            input.id = id;
            input.min = c.min; input.max = c.max; input.step = c.step;
            input.value = c.get();
            input.style.cssText = 'width:100%; margin-top:4px;';
            const paint = () => { out.textContent = c.format ? c.format(input.value) : input.value; };
            paint();
            input.addEventListener('input', () => { c.set(input.value); paint(); onChange(); });
            head.appendChild(document.createTextNode(c.label));
            head.appendChild(out);
            row.appendChild(head);
            row.appendChild(input);
        } else if (c.kind === 'select') {
            const head = document.createElement('div');
            head.style.color = '#e2e8f0';
            head.textContent = c.label;
            const sel = document.createElement('select');
            sel.id = id;
            sel.className = 'form-input';
            sel.style.cssText = 'width:100%; font-size:11px; padding:4px 6px; margin-top:4px;';
            (c.options || []).forEach(([v, l]) => {
                const o = document.createElement('option');
                o.value = v; o.textContent = l;
                if (String(c.get()) === String(v)) o.selected = true;
                sel.appendChild(o);
            });
            sel.addEventListener('change', () => { c.set(sel.value); onChange(); });
            row.appendChild(head);
            row.appendChild(sel);
        }

        if (c.hint) {
            const h = document.createElement('div');
            h.style.cssText = 'color:#64748b; font-size:10px; margin-top:3px;';
            h.textContent = c.hint;
            row.appendChild(h);
        }
        return row;
    }


    /**
     * GENERATE, WHICHEVER READING IS ACTIVE.
     *
     * The only Generate button used to live INSIDE the contour timeline panel,
     * which made it that one reading's control: choose any other reading and
     * there was no visible way to produce anything, because the button was in
     * a panel that reading has no reason to open. Generation belongs to the
     * input box, not to an interpretation of it.
     *
     * It raises the same `arcConfirmed` the panel always raised, so everything
     * downstream is unchanged — the profile is computed the same way, and a
     * fresh seed each press is what makes repeated presses differ.
     */
    function generateNow() {
        const input = document.getElementById('global-word-input');
        const text = input ? String(input.value || '').trim() : '';
        if (!text) {
            if (input && typeof input.focus === 'function') input.focus();
            return false;
        }

        let profile = null;
        // The same reading of the words the panel would have produced, so the
        // button is not a second, subtly different entry point.
        try {
            const tl = window.compositionTimeline;
            if (tl && typeof tl.analyzeAndRender === 'function' && tl.autoOpensNow && tl.autoOpensNow()) {
                tl.analyzeAndRender(text);
                profile = tl.currentProfile || null;
            } else if (typeof SemanticContourEngine !== 'undefined') {
                profile = new SemanticContourEngine().parseInput(text);
            }
        } catch (_) { profile = null; }

        // THE ARC OWNS THE STAFF FOR THIS PRESS. The lexical path also writes
        // the sheet, by rebuilding chords out of display tokens, and that
        // rebuild keeps only root/type/notes — a borrowed chord arrives with no
        // record of where it came from, so nothing can colour or explain it.
        // Whichever finished last used to win. Released when the numbers box is
        // used by hand, which is that path's real purpose.
        try { window.__sheetOwnedByArc = true; } catch (_) {}

        generateNow._n = (generateNow._n || 0) + 1;
        const seed = ((Date.now() ^ (generateNow._n * 2654435761)) >>> 0);

        document.dispatchEvent(new CustomEvent('arcConfirmed', {
            detail: {
                profile,
                points: (window.compositionTimeline && window.compositionTimeline.points) || [],
                canvasMode: (window.compositionTimeline && window.compositionTimeline.canvasMode) || 'bezier',
                input: text,
                seed,
                method: (window.__generationMethod || 'contour')
            }
        }));
        return true;
    }

    function mount() {
        const input = document.getElementById('global-word-input');
        if (!input || document.getElementById('generation-method')) return;
        const host = input.parentNode;
        if (!host) return;

        const wrap = document.createElement('div');
        wrap.style.cssText = S.wrap + ' position:relative;';

        const sel = document.createElement('select');
        sel.id = 'generation-method';
        sel.className = 'form-input';
        sel.style.cssText = S.sel;
        METHODS.forEach((m) => {
            const o = document.createElement('option');
            o.value = m.id;
            // A method that is not wired yet says so in the list rather than
            // quietly producing the default reading and letting it be blamed
            // on the one that was chosen.
            o.textContent = m.ready ? m.label : `${m.label} (not yet)`;
            o.disabled = !m.ready;
            sel.appendChild(o);
        });
        const stored = store.get('arcGenerationMethod', 'contour');
        if (METHODS.some(m => m.id === stored && m.ready)) sel.value = stored;
        window.__generationMethod = sel.value;
        sel.addEventListener('change', () => {
            window.__generationMethod = sel.value;
            store.set('arcGenerationMethod', sel.value);
            // The contour timeline draws one reading's working. Leaving it up
            // after switching away shows a calculation the generator is no
            // longer doing.
            try {
                const tl = window.compositionTimeline;
                if (tl && typeof tl.closePanel === 'function'
                    && sel.value !== 'contour') tl.closePanel();
            } catch (_) {}
            render();
        });

        const btn = document.createElement('button');
        btn.id = 'generation-method-info';
        btn.type = 'button';
        btn.className = 'btn-icon';
        btn.title = 'How this reads your words';
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'i';
        btn.style.cssText = S.info;

        const panel = document.createElement('div');
        panel.id = 'generation-method-panel';
        panel.style.cssText = S.panel + ' display:none;';

        const currentText = () => (input.value || '').trim() || 'chase, woods, dark';

        function render() {
            panel.innerHTML = '';
            const method = METHODS.find(m => m.id === sel.value) || METHODS[0];

            const mBox = document.createElement('div');
            mBox.innerHTML = describe(method, currentText());
            panel.appendChild(mBox);

            const rule = document.createElement('div');
            rule.style.cssText = 'border-top:1px solid #1e3a5f; margin:14px 0 10px;';
            panel.appendChild(rule);

            const note = document.createElement('div');
            note.style.cssText = 'color:#64748b; font-size:10px; margin-bottom:8px;';
            note.textContent = 'These are devices, not readings of your words — any number can be on at '
                + 'once, under any method, and they apply to a progression you typed by hand too.';
            panel.appendChild(note);

            TOGGLES.forEach((t) => {
                const box = document.createElement('div');
                box.style.cssText = 'margin:12px 0; padding:10px; background:rgba(15,52,96,.35); border-radius:3px;';
                box.innerHTML = describe(t, currentText());
                (t.controls || []).forEach((c) => box.appendChild(buildControl(c, () => {})));
                panel.appendChild(box);
            });
        }

        const toggle = () => {
            const open = panel.style.display !== 'none';
            if (open) { panel.style.display = 'none'; btn.setAttribute('aria-expanded', 'false'); }
            else { render(); panel.style.display = 'block'; btn.setAttribute('aria-expanded', 'true'); }
        };
        btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
        document.addEventListener('click', (e) => {
            if (panel.style.display === 'none') return;
            if (!panel.contains(e.target) && e.target !== btn) toggle();
        });

        const go = document.createElement('button');
        go.id = 'generation-run';
        go.type = 'button';
        go.textContent = 'Generate';
        go.title = 'Generate music from what is in the box, using the reading selected here';
        go.style.cssText = 'background:var(--accent-primary,#00d4ff); border:none; color:#04121f; '
            + 'font-weight:700; font-size:0.72rem; letter-spacing:.4px; padding:6px 12px; '
            + 'border-radius:3px; cursor:pointer; text-transform:uppercase;';
        go.addEventListener('click', (e) => { e.preventDefault(); generateNow(); });

        // Enter in the box generates too, since that is what a text field that
        // feeds a button is expected to do.
        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' || e.shiftKey) return;
            e.preventDefault();
            generateNow();
        });

        wrap.appendChild(sel);
        wrap.appendChild(btn);
        wrap.appendChild(go);
        wrap.appendChild(panel);
        host.insertBefore(wrap, input.nextSibling);

        // The ⏱️ toolbar button was never wired to anything. It is the way to
        // look at the contour curve deliberately, which matters more now that
        // the panel no longer opens by itself under every reading.
        const tlBtn = document.getElementById('word-toggle-timeline-btn');
        if (tlBtn && !tlBtn.__smBound) {
            tlBtn.__smBound = true;
            tlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tl = window.compositionTimeline;
                if (!tl) return;
                const open = !!tl._isOpen;
                if (open) { tl.closePanel(); }
                else if (typeof tl.forceOpen === 'function') { tl.forceOpen(); }
                tlBtn.setAttribute('aria-pressed', String(!open));
            });
        }
    }

    /**
     * THE ONE ENTRY POINT THE GENERATION CHAIN CALLS.
     *
     * Returns undefined whenever the active reading has nothing to say about
     * this stage, which the caller treats as "carry on as normal". That is
     * deliberate: a reading that implements one hook out of five still
     * produces music, and a reading that throws does not take the generator
     * down with it.
     */
    function hook(name, ...args) {
        const id = (typeof window !== 'undefined' && window.__generationMethod) || 'contour';
        const m = METHODS.find(x => x.id === id);
        // Every reading is handed the CONTEXT, not the input, so the ones that
        // derive material from the words need the text carried on it. Doing
        // that here rather than in each reading means a new reading cannot
        // forget to, and silently derive its cell from nothing.
        if (name === 'shapeContext') {
            const base = (args[0] && typeof args[0] === 'object')
                ? { ...args[0], __inputText: args[1] } : args[0];
            if (!m || typeof m.shapeContext !== 'function') return base;
            try { return m.shapeContext(base, args[1], args[2]) || base; }
            catch (e) {
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn(`[ScoringMethods] ${id}.shapeContext failed; falling through`, e);
                }
                return base;
            }
        }
        if (!m || typeof m[name] !== 'function') return undefined;
        try {
            return m[name].apply(m, args);
        } catch (e) {
            // A reading is an interpretation, not a precondition. If one fails
            // the piece still has to come out, so the failure is reported and
            // the ordinary behaviour stands.
            if (typeof console !== 'undefined' && console.warn) {
                console.warn(`[ScoringMethods] ${id}.${name} failed; falling through`, e);
            }
            return undefined;
        }
    }

    const ScoringMethods = {
        methods: METHODS, toggles: TOGGLES,
        registerMethod, registerToggle, describe, mount, hook, generateNow,
        // Exposed so harnesses can exercise the derivations directly rather
        // than inferring them from generated output.
        degreesOfWord, motifOfWord, transformMotif,
        current: () => (typeof window !== 'undefined' && window.__generationMethod) || 'contour'
    };
    if (typeof window !== 'undefined') window.ScoringMethods = ScoringMethods;
    if (typeof module !== 'undefined' && module.exports) module.exports = ScoringMethods;

    if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('DOMContentLoaded', mount);
    }
})();
