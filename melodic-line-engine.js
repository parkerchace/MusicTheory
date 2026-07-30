/**
 * melodic-line-engine.js
 *
 * Composes a melody as a LINE, not a sequence of independent notes.
 *
 * Architecture (in the order the decisions are actually made):
 *   1. CONTOUR      — the phrase commits to a shape: arch, ascending,
 *                     descending, or wave.
 *   2. ANCHORS      — a few structural tones are placed at harmonically strong
 *                     points (chord changes / bar starts). These are chord
 *                     tones and they follow the contour. Everything else exists
 *                     to connect them.
 *   3. CONNECTION   — anchors are joined by stepwise motion. Leaps happen only
 *                     when the gap demands one, and every leap is answered by
 *                     contrary stepwise motion.
 *   4. DECORATION   — non-chord tones are added with a stated function
 *                     (passing, neighbor, suspension, anticipation, chromatic
 *                     approach) and each one RESOLVES. Nothing chromatic is
 *                     placed without a resolution target.
 *   5. DEVELOPMENT  — bar 1's idea returns transformed (sequenced, inverted,
 *                     fragmented, rhythmically varied) instead of new material
 *                     being invented every bar.
 *   6. BREATH       — density ebbs and flows; sustained tones and rests
 *                     separate active passages.
 */

(function () {
    'use strict';

    const CONTOURS = ['arch', 'ascending', 'descending', 'wave', 'valley'];

    /**
     * Whether the chords are being treated as the frame the line is written
     * above. arc-ui-init owns this decision — it is opt-in, and off by default
     * so the tune keeps its own natural register instead of being pushed above
     * whatever the accompaniment happens to be doing.
     */
    function voicingFirstActive() {
        if (typeof window === 'undefined') return false;
        if (typeof window.__voicingFirstActive === 'function') return window.__voicingFirstActive();
        return window.__voicingFirst === true;
    }

    // --- Rhythmic figures ---------------------------------------------------
    //
    // A FIGURE is one beat (or two) of notated rhythm with a name. Building the
    // line out of figures rather than out of a stream of independent durations
    // is what produces grouping: the same figure stated twice and then varied
    // is heard as a rhythmic idea, where an unrepeated sequence of arbitrary
    // lengths is heard as noise. `activity` is roughly "how busy" — figures are
    // drawn from a window around the passage's activity, so a calm passage
    // never reaches for sixteenths and a driving one never sits on whole notes.
    const FIGURES = [
        { id: 'whole',        beats: [4],                       activity: 0.00, span: 4 },
        { id: 'half',         beats: [2],                       activity: 0.06, span: 2 },
        { id: 'halfPair',     beats: [2, 2],                    activity: 0.10, span: 4 },
        { id: 'dottedHalf',   beats: [3, 1],                    activity: 0.14, span: 4 },
        { id: 'quarters',     beats: [1, 1],                    activity: 0.22, span: 2 },
        { id: 'quarter',      beats: [1],                       activity: 0.24, span: 1 },
        { id: 'dottedQuarter',beats: [1.5, 0.5],                activity: 0.34, span: 2 },
        { id: 'anacrusis',    beats: [0.5, 1.5],                activity: 0.38, span: 2 },
        { id: 'twoEighths',   beats: [0.5, 0.5],                activity: 0.46, span: 1 },
        { id: 'fourEighths',  beats: [0.5, 0.5, 0.5, 0.5],      activity: 0.52, span: 2 },
        { id: 'dottedPair',   beats: [0.75, 0.25],              activity: 0.58, span: 1 },
        { id: 'scotchSnap',   beats: [0.25, 0.75],              activity: 0.62, span: 1 },
        { id: 'syncopation',  beats: [0.25, 0.5, 0.25],         activity: 0.66, span: 1 },
        { id: 'eighthTwoSix', beats: [0.5, 0.25, 0.25],         activity: 0.72, span: 1 },
        { id: 'twoSixEighth', beats: [0.25, 0.25, 0.5],         activity: 0.74, span: 1 },
        { id: 'sixteenths',   beats: [0.25, 0.25, 0.25, 0.25],  activity: 0.88, span: 1 },
        { id: 'sixteenthRun', beats: [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25], activity: 0.95, span: 2 }
    ];

    const FIGURE_BY_ID = {};
    FIGURES.forEach(f => { FIGURE_BY_ID[f.id] = f; });

    // Figures that involve subdivision below an eighth. Suppressed entirely
    // when the rhythm slider is low, so "simple" really is simple.
    const NEEDS_SIXTEENTHS = /sixteen|dottedPair|scotchSnap|syncopation|eighthTwoSix|twoSixEighth/i;

    function makeRng(seed) {
        let s = (seed ^ 0x9e3779b9) >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    // --- Motion modes -------------------------------------------------------
    //
    // How a span gets from one structural tone to the next. These are the same
    // four kinds of motion the generation-logic selector names, applied per
    // span rather than to the whole piece, because a melody that never changes
    // its manner of moving reads as a study rather than as a tune.
    //
    //   stepwise    walk by scale steps — the default, and what most of a
    //               singable line should be
    //   arpeggio    outline the sounding chord — profile, and the thing that
    //               makes the harmony audible in the tune itself
    //   functional  follow tendency: leading tone up, seventh down, the notes
    //               that "want" to go somewhere go there
    //   sequence    restate a stored shape from a new degree
    const MOTIONS = ['stepwise', 'arpeggio', 'functional', 'sequence', 'run', 'neighbor'];

    function pickMotion({ rng, melodyC = 0.5, energy = 0.5, char, preferred, isCadenceSpan }) {
        // An explicit choice from the generation-logic selector wins most of
        // the time, but never all of it — an entire piece of nothing but
        // arpeggios is not what "chord tones" is asking for either.
        if (preferred && MOTIONS.includes(preferred) && rng() < 0.7) return preferred;

        // A cadence wants the tendency tones to do their job.
        if (isCadenceSpan && rng() < 0.6) return 'functional';

        const motion = char && Number.isFinite(char.motion) ? char.motion : 0.4;
        // Weights, not thresholds: energy and the word's own sense of movement
        // tilt the balance rather than switching it.
        //
        // `run` and `neighbor` are the two figures that carry most of the
        // character in the simple-diatonic repertoire. A RUN is the Minuet in G
        // gesture — four to six scale steps travelling in one direction, heard
        // as a single sweep rather than as four separate choices. A NEIGHBOR is
        // the Für Elise oscillation — a note and the step beside it, traded
        // back and forth until the figure itself becomes the subject. Neither
        // can emerge from picking each pitch by its distance to the next
        // anchor, which is why a stepwise-only line still reads as wandering:
        // stepwise motion is the material, but the FIGURE is the idea.
        const w = {
            stepwise: 0.85 + (1 - energy) * 0.4 + (1 - motion) * 0.35,
            run: 0.8 + motion * 0.7 + energy * 0.4,
            neighbor: 0.3 + (1 - energy) * 0.35 + (1 - motion) * 0.2,
            arpeggio: 0.35 + energy * 0.6 + motion * 0.45 + melodyC * 0.25,
            functional: 0.4 + melodyC * 0.3
        };
        const total = w.stepwise + w.run + w.neighbor + w.arpeggio + w.functional;
        let r = rng() * total;
        if ((r -= w.stepwise) < 0) return 'stepwise';
        if ((r -= w.run) < 0) return 'run';
        if ((r -= w.neighbor) < 0) return 'neighbor';
        if ((r -= w.arpeggio) < 0) return 'arpeggio';
        return 'functional';
    }

    /**
     * Where a tendency tone wants to resolve, in semitones.
     * The leading tone rises; a seventh falls; the fourth falls to the third.
     * Returning null means the note is stable and can go anywhere.
     */
    function tendencyOf(midi, tonicPc, chordPcs) {
        const pc = ((midi % 12) + 12) % 12;
        const deg = ((pc - tonicPc) % 12 + 12) % 12;
        if (deg === 11) return +1;      // leading tone → tonic
        if (deg === 10) return -2;      // subtonic → ♭7 falls
        if (deg === 5) return -1;       // 4 → 3
        if (deg === 1) return -1;       // ♭2 → 1
        if (deg === 8) return -1;       // ♭6 → 5
        if (chordPcs && chordPcs.length && !chordPcs.includes(pc)) return -1;
        return null;
    }


    /**
     * METRIC HIERARCHY. Not every beat is equally strong, and almost every rule
     * about dissonance is really a rule about WHERE a dissonance falls.
     *
     * In 4/4: beat 1 is the downbeat, beat 3 is the secondary strong beat, 2
     * and 4 are weak, and anything off the beat is weaker still. Compound
     * metres (6/8, 12/8) group in threes, so their strong points are the heads
     * of each group.
     */
    function metricStrength(beatInBar, beatsPerBar) {
        const eps = 1e-6;
        const onBeat = Math.abs(beatInBar - Math.round(beatInBar)) < eps;
        if (!onBeat) {
            // Off-beats: the halfway subdivision is stronger than a sixteenth.
            const frac = beatInBar - Math.floor(beatInBar);
            return Math.abs(frac - 0.5) < eps ? 0.2 : 0.1;
        }
        const b = Math.round(beatInBar);
        if (b === 0) return 1.0;                                  // downbeat
        if (beatsPerBar % 3 === 0 && beatsPerBar > 3) {
            return (b % 3 === 0) ? 0.7 : 0.35;                    // compound groupings
        }
        if (beatsPerBar === 4 && b === 2) return 0.7;             // the other strong beat
        if (beatsPerBar === 6 && b === 3) return 0.7;
        return 0.4;
    }

    /**
     * CONSONANCE AND DISSONANCE, treated the way counterpoint treats them.
     *
     * A note outside the sounding chord is a dissonance, and where it may sit
     * depends entirely on the beat:
     *
     *   WEAK beat   — free. This is the passing tone and the neighbour, and it
     *                 needs no preparation at all.
     *   STRONG beat — only as a SUSPENSION: the same pitch must already have
     *                 been sounding (the preparation), and it must resolve
     *                 DOWNWARD BY STEP on the next note. That resolution is
     *                 what makes the dissonance meaningful rather than wrong.
     *
     * Without this the line placed non-chord tones by dice roll, so accented
     * dissonances appeared with nothing preparing them and nothing resolving
     * them — which is the difference between a suspension and a wrong note.
     */
    function dissonanceVerdict({ midi, chordPool, strength, prevMidi, isFirstOfSpan }) {
        const consonant = chordPool.includes(midi);
        if (consonant) return { ok: true, role: null };
        if (strength < 0.5) return { ok: true, role: 'passing' };      // weak beat: free
        // Strong beat: only if this pitch was already sounding.
        if (Number.isFinite(prevMidi) && prevMidi === midi && !isFirstOfSpan) {
            return { ok: true, role: 'suspension', mustResolveDown: true };
        }
        return { ok: false, role: null };
    }

    /**
     * The figures available to a passage: those near its activity level, and
     * never wider than the space left to fill.
     */
    function figureVocabulary(activity, maxSpan, allowSixteenths) {
        const pool = FIGURES.filter(f =>
            f.span <= maxSpan + 1e-6 &&
            (allowSixteenths || !NEEDS_SIXTEENTHS.test(f.id)) &&
            Math.abs(f.activity - activity) <= 0.3);
        if (pool.length) return pool;
        // Nothing in the window fits the space — take the closest that does.
        const fits = FIGURES.filter(f => f.span <= maxSpan + 1e-6 &&
            (allowSixteenths || !NEEDS_SIXTEENTHS.test(f.id)));
        if (!fits.length) return [FIGURE_BY_ID.quarter];
        let best = fits[0], bd = Math.abs(fits[0].activity - activity);
        fits.forEach(f => { const d = Math.abs(f.activity - activity); if (d < bd) { bd = d; best = f; } });
        return [best];
    }

    /**
     * Lay out one span as a sequence of figures.
     *
     * The grouping rules are the whole point:
     *   - a figure that has just been heard is likely to be heard again, so
     *     runs of eighths and sixteenth groups actually group;
     *   - the third statement varies, which is where the ear hears intent
     *     rather than a stuck loop;
     *   - the span ends longer than it began, so phrases arrive instead of
     *     being cut off mid-flight.
     *
     * @returns {{durations:number[], figures:string[], positions:number[]}}
     *          `positions[i]` is the note's index inside its own figure
     *          INSTANCE — two statements of the same figure restart at 0, which
     *          is what lets each group be leaned on at its head.
     */
    function layOutFigures(available, activity, rng, opts = {}) {
        const allowSixteenths = opts.allowSixteenths !== false;
        const durations = [];
        const figures = [];
        const positions = [];
        let remaining = available;
        let previous = null;
        let repeats = 0;
        let guard = 0;

        while (remaining > 0.24 && guard++ < 32) {
            // Close longer than we opened: a phrase that ends on its shortest
            // value sounds cut off rather than finished.
            const isFinalRoom = remaining <= 2.01 && durations.length > 0;
            const vocab = figureVocabulary(
                isFinalRoom ? Math.max(0, activity - 0.35) : activity,
                remaining,
                allowSixteenths);

            let figure;
            if (isFinalRoom && rng() < 0.6) {
                // Take the broadest thing that still fits.
                figure = vocab.reduce((best, f) => (f.activity < best.activity ? f : best), vocab[0]);
                repeats = 0;
            } else if (previous && repeats < 2 && previous.span <= remaining + 1e-6 && rng() < 0.62) {
                // Say it again — this is what makes a grouping.
                figure = previous;
                repeats++;
            } else {
                figure = vocab[Math.floor(rng() * vocab.length)] || vocab[0];
                repeats = (previous && figure.id === previous.id) ? repeats + 1 : 0;
            }

            let beats = figure.beats.slice();
            const sum = beats.reduce((s, d) => s + d, 0);
            if (sum > remaining + 1e-6) {
                // Trim the figure to what is left rather than overflowing the bar.
                const trimmed = [];
                let acc = 0;
                for (const d of beats) {
                    if (acc + d > remaining + 1e-6) break;
                    trimmed.push(d);
                    acc += d;
                }
                const leftover = remaining - acc;
                if (leftover >= 0.25) trimmed.push(leftover);
                if (!trimmed.length) break;
                beats = trimmed;
            }

            beats.forEach((d, k) => { durations.push(d); figures.push(figure.id); positions.push(k); });
            remaining -= beats.reduce((s, d) => s + d, 0);
            previous = figure;
        }

        if (!durations.length) { durations.push(available); figures.push('sustain'); positions.push(0); }
        return { durations, figures, positions };
    }

    /**
     * Articulation and accent for one note.
     *
     * Nothing here is decorative: a plosive word wants a short, detached note;
     * a sustained word wants the bow held; the first note of a figure that
     * lands on a strong beat is where a player would naturally lean. Marking
     * these explicitly is the difference between a printout of pitches and
     * something that reads as performed.
     */
    function articulateNote({ duration, indexInFigure, onBeat, isDownbeat, char, energy, isCadence }) {
        const attack = char && Number.isFinite(char.attack) ? char.attack : 0.4;
        const sustain = char && Number.isFinite(char.sustain) ? char.sustain : 0.5;
        const weight = char && Number.isFinite(char.weight) ? char.weight : 0.4;

        // Only the marks that depend on the note ALONE are decided here.
        // Detachment is a property of a note's neighbours, not of the note, so
        // it is settled in the phrase pass below: marking every short note
        // staccato because its word was plosive dotted four notes in five and
        // read as a printing error rather than as phrasing.
        let articulation = null;
        if (isCadence) articulation = 'tenuto';
        else if (duration >= 1.5 && (sustain > 0.55 || weight > 0.6)) articulation = 'tenuto';

        // Accents fall where a player would put weight: the head of a figure on
        // a strong beat, and the syncopated entry of an off-beat group (which
        // is the only thing that makes syncopation audible as syncopation).
        const headOfFigure = indexInFigure === 0;
        const syncopatedHead = headOfFigure && !onBeat;
        const accent = !!(
            (headOfFigure && isDownbeat && energy > 0.62) ||
            (syncopatedHead && attack > 0.55 && energy > 0.5)
        );

        return { articulation, accent };
    }

    /**
     * Phrase-level articulation: decide what is slurred and what is detached.
     *
     * The rule real notation follows is that a RUN of short notes is one
     * gesture and gets a slur, while a short note standing on its own is the
     * one that gets a dot. Deciding detachment note-by-note produced the
     * opposite: a plosive word covered its whole passage in staccato dots, so
     * nothing was grouped and nothing stood out.
     */
    function phraseArticulation(notes, defaultChar) {
        const isShort = (n) => Number(n.duration) <= 0.5 + 1e-6;
        const attackOf = (n) => {
            const c = n.__char || defaultChar;
            return c && Number.isFinite(c.attack) ? c.attack : 0.4;
        };

        // 1. Slur runs of three or more short notes inside one bar.
        let start = -1;
        const close = (endIdx) => {
            if (start >= 0 && endIdx - start >= 2) {
                notes[start].slurStart = true;
                notes[endIdx].slurEnd = true;
                for (let k = start; k <= endIdx; k++) notes[k].slurred = true;
            }
            start = -1;
        };
        for (let i = 0; i < notes.length; i++) {
            const n = notes[i];
            const sameBar = start < 0 || notes[start].bar === n.bar;
            if (isShort(n) && !n.cadence && sameBar) {
                if (start < 0) start = i;
            } else {
                close(i - 1);
                if (isShort(n) && !n.cadence) start = i;
            }
        }
        close(notes.length - 1);

        // 2. Detach the short notes that stand alone — a pair or a single,
        //    never a run — and only when the word behind them has the attack
        //    for it.
        for (let i = 0; i < notes.length; i++) {
            const n = notes[i];
            if (n.slurred || n.articulation || n.cadence) continue;
            if (!isShort(n)) continue;
            if (attackOf(n) > 0.5) n.articulation = 'staccato';
        }
    }

    class MelodicLineEngine {
        constructor(musicTheory) {
            this.mt = musicTheory || null;
            this.chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        }

        pcOf(name) {
            const pc = String(name || '').replace(/-?\d+$/, '');
            if (this.mt && this.mt.noteValues && Number.isFinite(this.mt.noteValues[pc])) {
                return this.mt.noteValues[pc];
            }
            return this.chromatic.indexOf(pc);
        }

        midiOf(name) {
            const m = String(name || '').match(/^([A-G][#b]?)(-?\d+)$/);
            if (!m) return null;
            const pc = this.pcOf(m[1]);
            if (!Number.isFinite(pc) || pc < 0) return null;
            return (parseInt(m[2], 10) + 1) * 12 + pc;
        }

        nameOf(midi, preferFlat) {
            const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            const names = preferFlat ? flats : this.chromatic;
            const pc = ((midi % 12) + 12) % 12;
            return `${names[pc]}${Math.floor(midi / 12) - 1}`;
        }

        /** Chord/scale state at a given absolute beat. */
        harmonyAt(harmony, beat, beatsPerBar) {
            const evs = (harmony && harmony.chordSequence) || [];
            let best = null;
            for (const ev of evs) {
                if (!ev || !Number.isFinite(ev.bar) || !Number.isFinite(ev.beat)) continue;
                const start = ev.bar * beatsPerBar + ev.beat;
                const end = start + (Number.isFinite(ev.duration) ? ev.duration : beatsPerBar);
                if (beat >= start - 1e-6 && beat < end - 1e-6) {
                    if (!best || start > best.__start) { best = ev; best.__start = start; }
                }
            }
            return best;
        }

        /** The voiced chord under an event, as sorted MIDI. */
        voicedMidis(ev) {
            if (!ev || !ev.voicing) return [];
            return Object.values(ev.voicing)
                .filter(Number.isFinite)
                .sort((a, b) => a - b);
        }

        /**
         * The highest note any voicing in the piece reaches, or null when the
         * harmony is not voiced (the melody then keeps its own register).
         */
        voicingCeiling(harmony) {
            if (!voicingFirstActive()) return null;
            const seq = (harmony && harmony.chordSequence) || [];
            let top = null;
            seq.forEach((ev) => {
                if (!ev || ev.approachStrategy) return;
                this.voicedMidis(ev).forEach((m) => {
                    if (top === null || m > top) top = m;
                });
            });
            return top;
        }

        /**
         * Chord tones available to the melody over this event.
         *
         * When the chord is voiced, the VOICING's pitch classes are the chord —
         * a shell voicing is a 1-3-7 sound, and anchoring the tune on the fifth
         * it deliberately omitted puts a note in the air that the harmony under
         * it never states. Using the voicing here is what makes the line read as
         * belonging to the chord that is actually sounding.
         */
        chordMidis(ev, low, high) {
            const voiced = this.voicedMidis(ev);
            const tones = (ev && ev.chordObj &&
                ((ev.chordObj.chordNotes && ev.chordObj.chordNotes.length && ev.chordObj.chordNotes) ||
                 ev.chordObj.diatonicNotes)) || [];
            const pcs = voiced.length
                ? voiced.map(m => ((m % 12) + 12) % 12)
                : tones.map(n => this.pcOf(n)).filter(p => Number.isFinite(p) && p >= 0);
            const out = [];
            for (let m = low; m <= high; m++) {
                if (pcs.includes(((m % 12) + 12) % 12)) out.push(m);
            }
            return out;
        }

        scaleMidis(scaleNotes, low, high) {
            const pcs = (scaleNotes || []).map(n => this.pcOf(n)).filter(p => Number.isFinite(p) && p >= 0);
            const out = [];
            for (let m = low; m <= high; m++) {
                if (pcs.includes(((m % 12) + 12) % 12)) out.push(m);
            }
            return out;
        }

        nearest(list, target) {
            if (!list || !list.length) return target;
            let best = list[0], bd = Math.abs(list[0] - target);
            for (const v of list) {
                const d = Math.abs(v - target);
                if (d < bd) { bd = d; best = v; }
            }
            return best;
        }

        /**
         * Final pass: make every note sit WITH the chord under it.
         *
         * The contour, the rhythm and the word-setting are already decided and
         * are not touched here — this only repairs the two things that make a
         * tune fight its own accompaniment:
         *
         *   1. A note under the voicing's top voice. The line is meant to be
         *      heard over the chord; a note buried inside it becomes an inner
         *      voice, so it is lifted by whole octaves, which keeps the shape.
         *   2. A minor ninth above a voiced note. That is the one interval that
         *      reads as a mistake rather than as colour, and it is fixed by a
         *      step within the scale, not by a leap.
         */
        fitAgainstVoicings(notes, harmony, beatsPerBar, opts = {}) {
            if (!voicingFirstActive()) return 0;
            const scaleNotes = opts.scaleNotes || [];
            const preferFlat = !!opts.preferFlat;
            const high = Number.isFinite(opts.high) ? opts.high : 91;
            let fixed = 0;

            const clashes = (midi, voiced) => voiced.some(v => midi - v === 13);

            notes.forEach((n) => {
                const midi = this.midiOf(n.noteName);
                if (!Number.isFinite(midi)) return;
                const beat = (Number(n.bar) || 0) * beatsPerBar + (Number(n.beat) || 0);
                const ev = this.harmonyAt(harmony, beat, beatsPerBar);
                const voiced = this.voicedMidis(ev);
                if (!voiced.length) return;
                const top = voiced[voiced.length - 1];

                let m = midi;
                let guard = 0;
                while (m <= top && guard++ < 3 && m + 12 <= high) m += 12;

                if (clashes(m, voiced)) {
                    const pool = this.scaleMidis(scaleNotes, Math.max(top + 1, m - 3), Math.min(high, m + 3))
                        .filter(c => !clashes(c, voiced) && c > top);
                    if (pool.length) m = this.nearest(pool, m);
                }

                if (m !== midi) {
                    n.noteName = this.nameOf(m, preferFlat);
                    fixed++;
                }
            });
            return fixed;
        }

        /**
         * Compose the line.
         * @returns {{notes: Array, contour: string, anchors: Array}}
         */
        compose({ context, arc, harmony, seed = 0, syllables = [], complexity = {} }) {
            const rng = makeRng(seed + 7);
            const beatsPerBar = arc.beatsPerBar || 4;
            const totalBeats = arc.totalBeats || (arc.bars || 4) * beatsPerBar;
            const scaleNotes = (context.harmonicProfile && context.harmonicProfile.scaleNotes) || ['C','D','E','F','G','A','B'];
            const melodyC = Math.max(0, Math.min(1, Number(complexity.melody) || 0.5));
            const rhythmC = Math.max(0, Math.min(1, Number(complexity.rhythm) || 0.5));

            // RIGHT-HAND AMBITUS (C4–B5).
            //
            // This was G3–G5, a singer's range, and it put the tune around and
            // below middle C — which leaves a left-hand accompaniment nowhere
            // to go. The left hand kept having to be pushed down out of the way,
            // and the two parts fought for the same octave. Starting at middle C
            // gives the left hand the whole bass staff and keeps the melody
            // where a right hand actually plays it.
            // …and the sheet's Register control moves that window. It fed the
            // voice-leading engine but never reached the melody, so switching
            // low/mid/high changed the accompaniment's spelling and left the
            // tune sitting in exactly the same octave every time.
            const REGISTER_SHIFT = (() => {
                try {
                    const sheet = (window.modularApp && window.modularApp.sheetMusicGenerator)
                        || window.sheetMusicGenerator;
                    const r = (sheet && sheet.state && sheet.state.voicingRegister) || 'mid';
                    return r === 'low' ? -5 : r === 'high' ? 7 : 0;
                } catch (_) { return 0; }
            })();
            // …and the VOICING raises the bottom of it.
            //
            // The chords are voiced before this runs, and the point of choosing
            // a voicing — drop 2, a gospel shell, quartal — is to hear that
            // chord under the tune. So the line goes above the voicing's top
            // voice rather than through the middle of it: a melody note inside
            // the chord is heard as a chord tone, and the shape that was chosen
            // stops being audible as a shape. Clearance is a whole step, not a
            // semitone, because a tune sitting a semitone over an inner voice
            // reads as a rub against the chord rather than as a line over it.
            //
            // Only the floor moves. Lifting the ceiling with it moved the centre
            // of the window, which is where the contour actually puts the line,
            // up into the top octave of the keyboard — the tune came out shrill
            // for no reason beyond the chord having cleared out below it.
            const voicingTop = this.voicingCeiling(harmony);
            const LOW = Math.max(60 + REGISTER_SHIFT,
                Number.isFinite(voicingTop) ? voicingTop + 2 : 0);
            const HIGH = Math.max(83 + REGISTER_SHIFT, LOW + 12);
            const preferFlat = /b/.test(String(scaleNotes.join('')));

            // ---- 1. CONTOUR ----
            const tone = String(context.emotionalTone || '').toLowerCase();
            const toneContour = {
                joyful: 'ascending', hopeful: 'ascending', playful: 'wave',
                sad: 'descending', dark: 'valley', sorrow: 'descending',
                angry: 'arch', intense: 'arch', mysterious: 'wave',
                dreamy: 'wave', calm: 'arch', peaceful: 'arch'
            }[tone];
            // The tone suggests a contour but does not dictate it — the same
            // word should be interpretable several ways across takes.
            const contour = (toneContour && rng() < 0.55)
                ? toneContour
                : CONTOURS[Math.floor(rng() * CONTOURS.length)];

            // THE ARC IS A ROUGH INDICATION OF DIRECTION, NOT A SPECIFICATION.
            //
            // It used to set where the line sits at weight 0.75, which made the
            // drawn curve the ultimate decider of every anchor pitch. Two
            // consequences, both wrong: the same curve produced the same
            // skeleton on every take however the seed changed, and the line
            // could not follow the harmony, because the curve outvoted it. The
            // arc now contributes a modest tendency; the chord under the anchor
            // and the voice-leading from the previous one decide the pitch.
            const arcAt = (t) => {
                if (typeof arc.sample !== 'function') return null;
                const v = Number(arc.sample(Math.max(0, Math.min(1, t))));
                return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
            };
            const shapeHeight = (t) => {
                switch (contour) {
                    case 'ascending':  return t;
                    case 'descending': return 1 - t;
                    case 'arch':       return Math.sin(t * Math.PI);
                    case 'valley':     return 1 - Math.sin(t * Math.PI);
                    default:           return 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
                }
            };
            // A per-take phase offset on the abstract shape, so two takes that
            // read the same drawn curve still put their high point in different
            // places.
            const phase = rng();
            const contourHeight = (t) => {
                const a = arcAt(t);
                const shape = shapeHeight(t);
                const wobble = 0.5 + 0.5 * Math.sin((t + phase) * Math.PI * 2);
                if (a === null) return shape * 0.8 + wobble * 0.2;
                return a * 0.4 + shape * 0.45 + wobble * 0.15;
            };

            // ---- 2. ANCHORS at harmonically strong points ----
            // Anchoring EVERY chord event chopped the line into spans of one
            // uniform length. With two chords per bar that is a 2-beat cell
            // everywhere, and any word whose rhythm is naturally longer — every
            // 'sustain' word, whose cells run 2 to 4 beats — got clipped to a
            // single 2-beat note in every span. The result scanned identically
            // bar after bar no matter what word was typed.
            //
            // Bar downbeats always anchor. A mid-bar chord earns one only when
            // the harmony actually CHANGES there; a bar that simply restates
            // its chord (Fm7 on 1, Fm7 on 3) is one harmonic event and leaves
            // the whole bar free for the word to scan across.
            const anchorBeats = [];
            const evs = (harmony && harmony.chordSequence) || [];
            const realEvs = evs.filter(ev => ev && !ev.approachStrategy);   // anchors sit on real harmony
            const chordAt = new Map();
            realEvs.forEach((ev) => {
                const b = ev.bar * beatsPerBar + ev.beat;
                if (b < totalBeats && !chordAt.has(b)) chordAt.set(b, ev.chord || '');
            });
            const beatsSorted = Array.from(chordAt.keys()).sort((x, y) => x - y);
            let lastChord = null;
            beatsSorted.forEach((b) => {
                const isDownbeat = Math.abs(b % beatsPerBar) < 1e-6;
                const chord = chordAt.get(b);
                const changed = chord !== lastChord;
                if (isDownbeat || changed) anchorBeats.push(b);
                lastChord = chord;
            });
            if (!anchorBeats.length) {
                for (let b = 0; b < totalBeats; b += beatsPerBar) anchorBeats.push(b);
            }
            anchorBeats.sort((a, b) => a - b);

            const centre = (LOW + HIGH) / 2;
            const span = (HIGH - LOW) / 2;

            // ---- 2b. THE PHRASE PLAN: decide where each phrase ARRIVES ----
            //
            // A phrase is a trajectory between two chosen pitches, not a walk
            // that stops when it runs out of bars. Anchors used to be picked
            // one at a time from a contour curve, so a phrase ended on whatever
            // chord tone happened to sit nearest the curve at its last beat —
            // which is exactly why the endings felt arbitrary and the line felt
            // like it was wandering rather than going somewhere.
            //
            // So the two structural pitches are chosen FIRST. The goal note
            // comes from the cadence the form asked this section to make: an
            // authentic cadence wants the tonic under the melody, a half
            // cadence wants to be left open on the fifth, a deceptive one turns
            // toward the sixth. The opening note is chosen for its relationship
            // to the previous phrase's ending — restate it, continue by step,
            // or answer it by leaping the other way. Only then is the middle
            // filled in, as an arch between the two with its high point placed
            // late (60–70% through), which is where phrases actually peak.
            const phrasePlan = (() => {
                // `form` proper is resolved further down for the rhythm bank;
                // the sections are read straight off the context here because
                // the phrase plan has to exist before the first anchor is placed.
                const planForm = (context && context.form) || null;
                const secs = (planForm && Array.isArray(planForm.sections) && planForm.sections.length)
                    ? planForm.sections
                    : [{ label: '-', startBar: 0, endBar: Math.max(0, Math.ceil(totalBeats / beatsPerBar) - 1),
                         cadence: 'authentic', letter: 'A' }];
                const n = scaleNotes.length || 7;
                const degreePc = (deg) => {
                    const name = scaleNotes[(((deg - 1) % n) + n) % n];
                    const pc = this.pcOf(name);
                    return Number.isFinite(pc) ? ((pc % 12) + 12) % 12 : null;
                };
                // Which scale degrees a given cadence wants the TUNE to land on,
                // best first. The bass makes the cadence; the melody either
                // confirms it (tonic over an authentic cadence) or leaves it
                // open (fifth over a half cadence).
                const prefsFor = (cadence) => {
                    switch (String(cadence || '').toLowerCase()) {
                        case 'half':      return [5, 2, 7];
                        case 'deceptive': return [6, 3, 1];
                        case 'plagal':    return [1, 5, 3];
                        default:          return [1, 3, 5];
                    }
                };
                return secs.map((s, i) => {
                    const cadence = s.cadence || (i === secs.length - 1 ? 'authentic' : 'half');
                    return {
                        index: i,
                        startBeat: s.startBar * beatsPerBar,
                        endBeat: (s.endBar + 1) * beatsPerBar,
                        cadence,
                        goalPcs: prefsFor(cadence).map(degreePc).filter(Number.isFinite),
                        letter: s.letter || s.label || String(i),
                        isLast: i === secs.length - 1,
                        // The high point sits late in the phrase, and not at an
                        // identical fraction every time.
                        peakAt: 0.6 + ((i * 7) % 3) * 0.05
                    };
                });
            })();
            const phraseIndexAt = (beat) => {
                for (let i = 0; i < phrasePlan.length; i++) {
                    if (beat >= phrasePlan[i].startBeat - 1e-6 && beat < phrasePlan[i].endBeat - 1e-6) return i;
                }
                return Math.max(0, phrasePlan.length - 1);
            };

            // An arch that peaks exactly where the phrase wants it to, rather
            // than always at the middle.
            const archAt = (t01, peak) => {
                const p = Math.min(0.95, Math.max(0.05, peak));
                if (t01 <= p) return Math.sin((t01 / p) * Math.PI / 2);
                return Math.sin((1 - (t01 - p) / (1 - p)) * Math.PI / 2);
            };

            // Anchors are placed SEQUENTIALLY, each one near the last. Choosing
            // them independently from the contour let consecutive anchors sit a
            // ninth apart, which forced the connecting material into leaps and
            // wrecked the stepwise character of the line.
            const anchors = [];
            let prevAnchor = null;
            let sameDirRun = 0;
            let lastDir = 0;

            // Group the anchor beats by phrase so each phrase can be planned
            // end-first rather than left to land wherever it lands.
            const byPhrase = [];
            anchorBeats.forEach((b) => {
                const pi = phraseIndexAt(b);
                if (!byPhrase[pi]) byPhrase[pi] = [];
                byPhrase[pi].push(b);
            });

            let prevPhraseGoal = null;
            let prevPhraseLetter = null;
            const phraseGoals = [];

            byPhrase.forEach((beatsInPhrase, pi) => {
                if (!beatsInPhrase || !beatsInPhrase.length) return;
                const plan = phrasePlan[pi] || phrasePlan[phrasePlan.length - 1];
                const lastBeat = beatsInPhrase[beatsInPhrase.length - 1];
                const firstBeat = beatsInPhrase[0];

                // --- the GOAL: a chord tone that also satisfies the cadence ---
                const goalEv = this.harmonyAt(harmony, lastBeat, beatsPerBar);
                let goalChoices = this.chordMidis(goalEv, LOW, HIGH);
                if (!goalChoices.length) goalChoices = this.scaleMidis(scaleNotes, LOW, HIGH);
                const goalIdeal = centre + (contourHeight(totalBeats > 0 ? lastBeat / totalBeats : 0) - 0.5) * span * 1.2;
                // Preference ORDER, not preference absolutism: the first choice
                // gets a head start, but a later one wins if the phrase's shape
                // genuinely wants it. Taking the first match unconditionally
                // made every half cadence in a piece land on the identical
                // pitch, which is a different kind of arbitrary — correct by
                // rule and monotonous by ear.
                let goalMidi = null;
                let bestGoalScore = Infinity;
                (plan ? plan.goalPcs : []).forEach((pc, rank) => {
                    const matching = goalChoices.filter(m => ((m % 12) + 12) % 12 === pc);
                    if (!matching.length) return;
                    const cand = this.nearest(matching, goalIdeal);
                    const score = Math.abs(cand - goalIdeal) + rank * 3;
                    if (score < bestGoalScore) { bestGoalScore = score; goalMidi = cand; }
                });
                if (goalMidi === null) goalMidi = this.nearest(goalChoices, goalIdeal);

                // --- the OPENING: chosen against the previous phrase's ending ---
                const startEv = this.harmonyAt(harmony, firstBeat, beatsPerBar);
                let startChoices = this.chordMidis(startEv, LOW, HIGH);
                if (!startChoices.length) startChoices = this.scaleMidis(scaleNotes, LOW, HIGH);
                let startMidi;
                if (prevPhraseGoal === null) {
                    startMidi = this.nearest(startChoices,
                        centre + (contourHeight(0) - 0.5) * span * 1.2);
                } else if (plan && prevPhraseLetter && plan.letter === prevPhraseLetter) {
                    // The same theme returning: begin where it began before, so
                    // the return is heard AS a return.
                    startMidi = this.nearest(startChoices, prevPhraseGoal);
                } else if (plan && plan.index % 2 === 1) {
                    // An answering phrase: leap away from where the last one
                    // ended, in the opposite direction, so it reads as a reply.
                    const dir = prevPhraseGoal > centre ? -1 : 1;
                    startMidi = this.nearest(startChoices, prevPhraseGoal + dir * 5);
                } else {
                    // Continuation: pick up near where the last phrase left off.
                    startMidi = this.nearest(startChoices, prevPhraseGoal + 2);
                }

                phraseGoals.push({ phrase: pi, startMidi, goalMidi, cadence: plan ? plan.cadence : null });

                // --- fill the interior as an arch between them ---
                const phraseSpanBeats = Math.max(1e-6, lastBeat - firstBeat);
                const lift = span * 0.5;
                beatsInPhrase.forEach((b, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === beatsInPhrase.length - 1;
                    const ev = this.harmonyAt(harmony, b, beatsPerBar);
                    let choices = this.chordMidis(ev, LOW, HIGH);
                    if (!choices.length) choices = this.scaleMidis(scaleNotes, LOW, HIGH);

                    let midi;
                    if (isLast) {
                        // The arrival is not negotiable — this is the note the
                        // whole phrase was heading for.
                        midi = goalMidi;
                    } else if (isFirst && prevAnchor === null) {
                        midi = startMidi;
                    } else {
                        const t01 = (b - firstBeat) / phraseSpanBeats;
                        const base = startMidi + (goalMidi - startMidi) * t01;
                        const arch = archAt(t01, plan ? plan.peakAt : 0.65);
                        const t = totalBeats > 0 ? b / totalBeats : 0;
                        const drawn = centre + (contourHeight(t) - 0.5) * span * 1.7;
                        // The phrase's own trajectory leads; the drawn arc still
                        // colours it, but no longer outvotes the destination.
                        const ideal = (base + arch * lift) * 0.75 + drawn * 0.25;

                        if (prevAnchor === null) {
                            midi = this.nearest(choices, ideal);
                        } else {
                            const reach = 12;
                            const desired = prevAnchor + Math.max(-reach, Math.min(reach, ideal - prevAnchor));
                            let reachable = choices.filter(m => Math.abs(m - prevAnchor) <= reach);
                            if (sameDirRun >= 2 && lastDir !== 0) {
                                // Three anchors the same way is a gesture; a
                                // fourth is a rut. Turn the line around.
                                const against = reachable.filter(m => (m - prevAnchor) * lastDir < 0);
                                if (against.length) reachable = against;
                            }
                            if (!reachable.length) reachable = choices;
                            midi = this.nearest(reachable, desired);
                            if (midi === prevAnchor && reachable.length > 1) {
                                const moved = reachable.filter(m => m !== prevAnchor);
                                if (moved.length) midi = this.nearest(moved, desired);
                            }
                        }
                    }

                    if (prevAnchor !== null) {
                        const dir = Math.sign(midi - prevAnchor);
                        sameDirRun = (dir !== 0 && dir === lastDir) ? sameDirRun + 1 : 0;
                        if (dir !== 0) lastDir = dir;
                    }
                    prevAnchor = midi;
                    anchors.push({ beat: b, midi, ev, phrase: pi, cadence: isLast ? (plan ? plan.cadence : null) : null });
                });

                prevPhraseGoal = goalMidi;
                prevPhraseLetter = plan ? plan.letter : null;
            });

            // ---- 5. DEVELOPMENT: capture bar 1's rhythmic idea ----
            const motif = [];
            let motifCaptured = false;
            // …and its PITCH shape, as a list of intervals. Restating that shape
            // from a different degree is what a sequence is.
            let pitchMotif = [];
            // Decided once for the whole line, then reused — see the neighbour
            // figure in the connector.
            let chromaticNeighborChoice = null;
            let neighborChromatic = false;

            // ---- 6. BREATH: density plan per anchor span ----
            const notes = [];
            let sylIdx = 0;
            const nextSyllable = () => {
                if (!syllables.length) return null;
                const s = syllables[sylIdx % syllables.length];
                sylIdx++;
                return s;
            };
            const wordCellsFirstPass = () => syllables.length > 0 && sylIdx < syllables.length;

            // ---- FORM: which section a beat belongs to, and the rhythm bank ----
            const form = (context && context.form && Array.isArray(context.form.sectionOfBar))
                ? context.form : null;
            const sectionAtBeat = (beat) => {
                if (!form) return null;
                const bar = Math.floor(beat / beatsPerBar);
                return form.sectionOfBar[Math.max(0, Math.min(form.sectionOfBar.length - 1, bar))] || null;
            };
            // Rhythms stated by each LETTER, indexed by position within the
            // section. A section restating a letter replays these, which is
            // what turns a second A into a return rather than new material.
            const rhythmBank = {};
            // Keyed on THEME, matching the harmony. A theme returning in a new
            // key is the same music transposed, so it has to keep its rhythm —
            // keying on the letter meant sonata's second subject was rebuilt
            // from scratch in the recapitulation and the return went unheard.
            const rememberSpan = (section, idx, durations, figures, positions) => {
                if (!section || !durations.length) return;
                const key = section.theme || section.letter;
                const bank = rhythmBank[key] || (rhythmBank[key] = {});
                if (bank[idx] === undefined) {
                    bank[idx] = {
                        durations: durations.slice(),
                        figures: figures.slice(),
                        positions: (positions || []).slice()
                    };
                }
            };
            const reprisedSpan = (section, idx, rhythmComplexity, r) => {
                if (!section) return null;
                // A theme's later statements reprise it whether or not the
                // section letter repeats — what returns is the material.
                if (!section.variantOf && !(section.themeOccurrence > 0)) return null;
                const bank = rhythmBank[section.theme || section.letter];
                const stored = bank && bank[idx];
                if (!stored || !stored.durations.length) return null;
                const occ = Number.isFinite(section.themeOccurrence) ? section.themeOccurrence : section.variation;
                if (occ === 0) return stored;
                // A' varies: diminish a value into two, or extend the last one.
                const durations = stored.durations.slice();
                const figures = stored.figures.slice();
                const positions = stored.positions.slice();
                if (durations.length > 1 && rhythmComplexity >= 0.35 && r() < 0.6) {
                    const at = Math.floor(r() * durations.length);
                    if (durations[at] >= 0.5) {
                        const half = durations[at] / 2;
                        durations.splice(at, 1, half, half);
                        figures.splice(at, 1, figures[at] + '-div', figures[at] + '-div');
                        positions.splice(at, 1, 0, 1);
                    }
                } else {
                    const last = durations.length - 1;
                    durations[last] = Math.min(4, durations[last] * 2);
                }
                return { durations, figures, positions };
            };

            const phraseChar = (context && context.wordCharacter) || null;
            // How much chromaticism the harmony dial permits (0 = none).
            const chromaticism = (() => {
                const cc = (context && context.complexityControls) || {};
                const lvl = Number.isFinite(cc.harmony) ? cc.harmony
                    : (Number.isFinite(cc.color) ? cc.color : 0.5);
                if (typeof HarmonyComplexity !== 'undefined') return HarmonyComplexity.gate(lvl).melodyChromaticism;
                return 1;
            })();

            // The tonic, for reading which notes are tendency tones.
            const tonicPc = this.pcOf((context.harmonicProfile && context.harmonicProfile.root) || 'C');

            // The generation-logic selector, if the user set one. Its options
            // name motion modes directly, so word-generated melodies can honour
            // the same choice the number generator does instead of ignoring it.
            const LOGIC_TO_MOTION = {
                melodic: 'stepwise',
                chord_tones: 'arpeggio',
                functional: 'functional',
                harmonic: null,      // that setting is about harmony, not the line
                random: null
            };
            const motionPreference = (() => {
                try {
                    const g = (typeof window !== 'undefined' && window.__generationLogic)
                        || (typeof window !== 'undefined' && window.NumberGenerator
                            && window.NumberGenerator.state && window.NumberGenerator.state.generationLogic);
                    return LOGIC_TO_MOTION[g] || null;
                } catch (_) { return null; }
            })();

            let lastLeap = 0;
            // A dissonance sounded on a strong beat owes a downward step.
            let pendingResolution = null;
            // The chord under the previous note, for spotting a change.
            let lastChordEv = null;
            // Direction of the current stepwise walk, and how long it has run.
            let walkDir = 0;
            let walkRun = 0;
            let currentSectionLabel = null;
            let spanIndexInSection = 0;

            for (let a = 0; a < anchors.length; a++) {
                const from = anchors[a];
                const to = anchors[a + 1] || null;
                const spanStart = from.beat;
                const spanEnd = to ? to.beat : totalBeats;
                let available = spanEnd - spanStart;
                if (available <= 0) continue;

                const sectionHere = sectionAtBeat(spanStart);
                const sectionLabel = sectionHere ? sectionHere.label : null;
                if (sectionLabel !== currentSectionLabel) {
                    currentSectionLabel = sectionLabel;
                    spanIndexInSection = 0;
                } else {
                    spanIndexInSection++;
                }

                const arcEnergy = (typeof arc.sample === 'function')
                    ? Math.max(0, Math.min(1, Number(arc.sample(spanStart / Math.max(1, totalBeats))) || 0.5))
                    : 0.5;

                // Density ebbs and flows: some spans are active, some sustain.
                // The section leans it: a bridge moves, a final return settles.
                const sectionActivity = sectionHere ? (sectionHere.activityBias || 0) : 0;
                const activity = Math.max(0, Math.min(1,
                    arcEnergy * 0.55 + melodyC * 0.3 + sectionActivity + (rng() - 0.5) * 0.25));
                const spanActivity = activity;
                const sustained = activity < 0.28;

                // Rest between phrase groups keeps the line breathing, and a
                // section boundary is where a breath belongs most.
                const atSectionStart = !!(sectionHere && Math.floor(spanStart / beatsPerBar) === sectionHere.startBar);
                const wantRest = !sustained && a > 0 && available > 1.5 &&
                    (atSectionStart ? rng() < 0.2 : (a % 2 === 0 && rng() < 0.35));
                let cursor = spanStart;
                if (wantRest) {
                    const rest = available >= 3 ? 1 : 0.5;
                    cursor += rest;
                    available -= rest;
                }

                // RHYTHM comes from the words; PITCH comes from the line
                // architecture. Deriving note count from the span instead of
                // from the syllables flattened every word to the same speed.
                let durations = [];
                let figureIds = [];
                let figurePos = [];

                // FORM FIRST. A section that restates earlier material must
                // restate its RHYTHM — that is what the ear recognises. A
                // primed restatement (A') varies it; an exact repeat does not.
                const reprise = reprisedSpan(sectionHere, spanIndexInSection, rhythmC, rng);

                if (reprise) {
                    durations = reprise.durations.slice();
                    figureIds = reprise.figures.slice();
                    figurePos = (reprise.positions || []).slice();
                    const total = durations.reduce((s, d) => s + d, 0);
                    if (total > available + 1e-6) {
                        durations = []; figureIds = []; figurePos = [];   // doesn't fit; fall through
                    }
                }

                if (durations.length) {
                    // reprised — nothing more to do
                } else if (sustained) {
                    durations = [available];
                    figureIds = ['sustain'];
                    figurePos = [0];
                } else if (motifCaptured && motif.length && rng() < 0.4) {
                    // DEVELOPMENT: restate the motif, sometimes diminished.
                    const diminish = rhythmC > 0.5 && rng() < 0.4;
                    durations = motif.map(d => diminish ? Math.max(0.25, d / 2) : d);
                    figureIds = durations.map(() => 'motif');
                    figurePos = durations.map((_, k) => k);
                } else if (!wordCellsFirstPass()) {
                    // Past the text: build the span out of NAMED FIGURES rather
                    // than a stream of independent lengths. Repeating a figure
                    // and then varying it is what the ear reads as a group —
                    // runs of eighths, sixteenth cells, dotted pairs — instead
                    // of the uniform tiling this produced before.
                    const laid = layOutFigures(available, spanActivity, rng, {
                        allowSixteenths: rhythmC >= 0.3
                    });
                    durations = laid.durations;
                    figureIds = laid.figures;
                    figurePos = laid.positions;
                } else {
                    // Consume syllables in order, each with its own word-derived
                    // rhythm cell, until the span is filled.
                    //
                    // Once the text runs out the line must keep going, and
                    // repeating the syllable's single duration tiled the same
                    // value through every span: a one-word input like "time"
                    // reduces to one cell duration, so every 2-beat span came
                    // out [2] and every bar scanned identically. Past the last
                    // syllable the engine DEVELOPS instead — drawing whole cells
                    // from that word's own rhythmic family, so the variation is
                    // in character rather than arbitrary.
                    let used = 0;
                    let guard = 0;
                    let emitted = 0;
                    const queue = [];
                    while (used < available - 1e-6 && guard++ < 24) {
                        if (!queue.length) {
                            const idx = sylIdx + emitted;
                            const syl = syllables.length ? syllables[idx % syllables.length] : null;
                            const firstPass = syllables.length ? (idx < syllables.length) : false;

                            if (firstPass && syl && Number.isFinite(syl.cellDuration)) {
                                queue.push(syl.cellDuration);          // the word's literal scansion
                            } else {
                                const opts = (syl && Array.isArray(syl.cellOptions) && syl.cellOptions.length)
                                    ? syl.cellOptions : null;
                                if (opts) {
                                    // Vary by span AND position so consecutive spans
                                    // differ, and fold in the WORD itself so two words
                                    // sharing a family don't develop identically —
                                    // "whisper" and "drift" are both sustained, but
                                    // they should not scan the same. This mirrors the
                                    // per-word offset rhythmFor already applies to the
                                    // opening cell.
                                    let wh = 0;
                                    for (const c of String((syl && syl.parentWord) || '')) {
                                        wh = ((wh << 5) - wh + c.charCodeAt(0)) | 0;
                                    }
                                    // MIX the word into every pick rather than using it
                                    // as a starting offset. An offset only rotates the
                                    // same sequence, so with a four- or five-cell
                                    // vocabulary two words in one family kept landing on
                                    // identical runs. Mixing decorrelates them while the
                                    // seeded draw keeps take-to-take variety.
                                    const draw = Math.floor(rng() * 0x10000);
                                    let h = (Math.abs(wh) ^ (a * 0x9E3779B1) ^ (emitted * 0x85EBCA77) ^ draw) >>> 0;
                                    h = (h ^ (h >>> 13)) >>> 0;
                                    h = (Math.imul(h, 0xC2B2AE35) ^ (h >>> 16)) >>> 0;
                                    const pick = opts[h % opts.length];
                                    if (Array.isArray(pick) && pick.length) queue.push(...pick);
                                }
                                if (!queue.length) {
                                    queue.push(Number.isFinite(syl && syl.cellDuration) ? syl.cellDuration : 1);
                                }
                            }
                        }

                        let d = queue.shift();
                        if (!Number.isFinite(d) || d <= 0) d = 0.5;
                        if (used + d > available + 1e-6) {
                            const left = available - used;
                            if (left < 0.25) break;
                            d = left;
                            queue.length = 0;
                        }
                        durations.push(d);
                        figureIds.push('word');
                        // The word's own scansion IS the group: the cell it came
                        // from starts a new one each time the queue refills.
                        figurePos.push(queue.length ? (figurePos.length && figureIds[figureIds.length - 2] === 'word'
                            ? (figurePos[figurePos.length - 1] + 1) : 0) : 0);
                        used += d;
                        emitted++;
                    }
                    if (!durations.length) { durations = [available]; figureIds = ['sustain']; figurePos = [0]; }
                }

                const quant = (v) => {
                    const grid = rhythmC < 0.3 ? [1, 2, 4] : [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
                    let best = grid[0], bd = Math.abs(v - best);
                    for (const g of grid) { const d = Math.abs(v - g); if (d < bd) { bd = d; best = g; } }
                    return best;
                };
                durations = durations.map(quant);
                // Only rescale when the material overruns the span.
                const sum = durations.reduce((s, d) => s + d, 0) || 1;
                if (sum > available + 1e-6) {
                    durations = durations.map(d => Math.max(0.25, quant((d / sum) * available)));
                }
                while (figureIds.length < durations.length) figureIds.push(figureIds[figureIds.length - 1] || 'word');
                while (figurePos.length < durations.length) figurePos.push(figurePos.length);
                figureIds.length = durations.length;
                figurePos.length = durations.length;
                const count = durations.length;

                // Remember this span so a later section carrying the same
                // letter can restate it.
                rememberSpan(sectionHere, spanIndexInSection, durations, figureIds, figurePos);

                if (!motifCaptured && spanStart < beatsPerBar && durations.length) {
                    motif.push(...durations);
                    motifCaptured = true;
                }

                // ---- 3 & 4. CONNECT the anchors ----
                const targetMidi = to ? to.midi : from.midi;
                const homePool = this.scaleMidis(scaleNotes, LOW, HIGH);
                let current = from.midi;

                // MELODIC SEQUENCE: the same shape restated from a new degree.
                //
                // This is the single most recognisable "intentional" gesture in
                // tonal melody, and the connector alone could never produce it —
                // choosing each pitch from the gap to the next anchor makes the
                // line oscillate between two neighbours whenever that gap is
                // small, which reads as wandering. A sequence takes the shape
                // already stated and moves it, so the ear hears the same idea
                // from somewhere new.
                let sequenceSteps = null;
                if (pitchMotif.length >= 2 && count >= pitchMotif.length) {
                    const wantSequence = rng() < (0.28 + melodyC * 0.35 +
                        (sectionHere && sectionHere.variation > 0 ? 0.15 : 0));
                    if (wantSequence) {
                        sequenceSteps = pitchMotif.slice();
                        // Invert it now and then: the same shape upside down is
                        // still the same idea, and it keeps a long form from
                        // climbing out of the singable range.
                        if (rng() < 0.3) sequenceSteps = sequenceSteps.map(d => -d);
                    }
                }

                // MOTION MODE for this span. A melody that is stepwise from end
                // to end has no profile; one that only arpeggiates is a chord
                // exercise. Real lines alternate — walk, then outline the
                // harmony, then let a tendency tone resolve — and choosing the
                // mode per span is what produces that alternation instead of
                // one uniform texture over the whole piece.
                const motion = sequenceSteps ? 'sequence' : pickMotion({
                    rng, melodyC,
                    energy: arcEnergy,
                    char: phraseChar,
                    preferred: motionPreference,
                    isCadenceSpan: !to
                });
                const spanIntervals = [];
                walkDir = 0;
                walkRun = 0;

                // Per-span figure state. A run commits to one direction; a
                // neighbour figure commits to one home note and one side.
                let runDir = 0;
                let neighborHome = null;
                let neighborDir = 0;

                // A CHROMATIC neighbour is the piece's signature colour, so it
                // is decided once and then RE-USED, not re-rolled per span.
                // Für Elise's E–D♯ works because that exact rub keeps coming
                // back; the same interval sprinkled in fresh places each time
                // would just read as sour notes. The first neighbour figure the
                // piece reaches for decides whether this take has that colour
                // at all, and every later neighbour figure then matches it.
                if (motion === 'neighbor') {
                    if (chromaticNeighborChoice === null) {
                        chromaticNeighborChoice = rng() < (0.18 + melodyC * 0.3);
                    }
                    neighborChromatic = chromaticNeighborChoice;
                } else {
                    neighborChromatic = false;
                }

                // Where this phrase is headed. Taking the goal from the LAST
                // real chord of the section gives the line something to arrive
                // at, which is what separates a phrase from a list of notes.
                let goalMidi = null;
                if (sectionHere) {
                    const goalEv = evs.filter(e => e && !e.approachStrategy && e.bar === sectionHere.endBar)[0];
                    const goalPool = this.chordMidis(goalEv, LOW, HIGH);
                    if (goalPool.length) goalMidi = this.nearest(goalPool, from.midi);
                }

                for (let i = 0; i < count; i++) {
                    const dur = durations[i];
                    if (cursor >= spanEnd - 1e-6 || cursor >= totalBeats - 1e-6) break;

                    const beat = cursor;
                    const evHere = this.harmonyAt(harmony, beat, beatsPerBar) || from.ev;
                    const pinnedSyl = syllables.length ? syllables[sylIdx % syllables.length] : null;
                    const pinnedName = pinnedSyl && pinnedSyl.scaleOverride;
                    let pinnedPool = null;
                    if (pinnedName && this.mt && typeof this.mt.getScaleNotes === 'function') {
                        try {
                            const pn = this.mt.getScaleNotes(
                                (context.harmonicProfile && context.harmonicProfile.root) || 'C',
                                String(pinnedName).toLowerCase().replace(/\s+/g, '_'));
                            if (pn && pn.length) pinnedPool = this.scaleMidis(pn, LOW, HIGH);
                        } catch (_) {}
                    }
                    const chordPool = this.chordMidis(evHere, LOW, HIGH);
                    // Follow the sounding scale: when the harmony borrows, the
                    // line borrows with it.
                    const hintNotes = (evHere && Array.isArray(evHere.scaleHintNotes) && evHere.scaleHintNotes.length)
                        ? evHere.scaleHintNotes : null;
                    const scalePool = hintNotes ? this.scaleMidis(hintNotes, LOW, HIGH) : homePool;
                    const isAnchor = (i === 0);
                    let midi;
                    let role = 'connect';

                    if (isAnchor) {
                        midi = from.midi;
                        role = 'anchor';
                        // Guard the seam between spans: the previous span's last
                        // note may sit far from this anchor.
                        if (notes.length && Math.abs(midi - current) > 12) {
                            const near = (chordPool.length ? chordPool : scalePool)
                                .filter(m => Math.abs(m - current) <= 9);
                            if (near.length) midi = this.nearest(near, midi);
                        }
                    } else if (sequenceSteps && (i - 1) < sequenceSteps.length && (count - i) > 1) {
                        // Restate the stored shape from wherever the line is now.
                        // The final note of the span is left to the connector so
                        // the sequence still lands on its anchor rather than
                        // drifting off the harmony.
                        const want = current + sequenceSteps[i - 1];
                        const pool = scalePool.length ? scalePool : chordPool;
                        midi = pool.length ? this.nearest(pool, want) : want;
                        if (Math.abs(midi - current) > 12) midi = current + (want > current ? 12 : -12);
                        role = 'sequence';
                    } else if (motion === 'run'
                        && ((count - i) > 1 || Math.abs(current - targetMidi) > 2)) {
                        // A SCALE RUN, taken as one gesture: keep going in the
                        // direction the run started, one scale step at a time,
                        // and do not reconsider per note. That refusal to
                        // reconsider is the whole point — the Minuet's opening
                        // sweep is memorable because it commits to a direction
                        // and completes it, where a walk that re-decides at
                        // every step reads as indecision.
                        const pool = scalePool.length ? scalePool : homePool;
                        if (!runDir) runDir = (targetMidi >= current) ? 1 : -1;
                        const ahead = pool.filter(m => (m - current) * runDir > 0);
                        if (ahead.length) {
                            midi = runDir > 0 ? Math.min(...ahead) : Math.max(...ahead);
                        } else {
                            // Ran out of room: turn the run around rather than
                            // stalling on a repeated note at the top.
                            runDir = -runDir;
                            const back = pool.filter(m => (m - current) * runDir > 0);
                            midi = back.length
                                ? (runDir > 0 ? Math.min(...back) : Math.max(...back))
                                : current;
                        }
                        role = 'run';
                    } else if (motion === 'neighbor' && (count - i) > 1) {
                        // NEIGHBOUR OSCILLATION. The figure is note → neighbour
                        // → note; alternate so it actually oscillates instead of
                        // drifting. The neighbour is diatonic by default and
                        // chromatic only when the piece has budget for it, which
                        // is what keeps a chromatic neighbour sounding like a
                        // deliberate colour rather than an accident — and,
                        // because the SAME figure is reused once established,
                        // like a recurring idea rather than a one-off.
                        const pool = scalePool.length ? scalePool : homePool;
                        if (neighborHome === null) neighborHome = current;
                        const away = (i % 2 === 1);
                        if (!away) {
                            midi = neighborHome;
                        } else {
                            const dir = neighborDir || (rng() < 0.55 ? 1 : -1);
                            neighborDir = dir;
                            if (neighborChromatic) {
                                midi = neighborHome + dir;      // semitone: the Für Elise rub
                            } else {
                                const side = pool.filter(m => (m - neighborHome) * dir > 0);
                                midi = side.length
                                    ? (dir > 0 ? Math.min(...side) : Math.max(...side))
                                    : neighborHome + dir;
                            }
                        }
                        role = 'neighbor';
                    } else if (motion === 'arpeggio' && chordPool.length >= 3 && (count - i) > 1) {
                        // Outline the chord that is actually sounding. Moving to
                        // the NEXT chord tone in the direction of travel is what
                        // makes this an arpeggio rather than a series of random
                        // chord tones.
                        const dir = (targetMidi >= current) ? 1 : -1;
                        const ahead = chordPool.filter(m => (m - current) * dir > 0 && Math.abs(m - current) <= 12);
                        if (ahead.length) {
                            midi = dir > 0 ? Math.min(...ahead) : Math.max(...ahead);
                        } else {
                            const back = chordPool.filter(m => (m - current) * dir < 0 && Math.abs(m - current) <= 12);
                            midi = back.length
                                ? (dir > 0 ? Math.max(...back) : Math.min(...back))
                                : this.nearest(chordPool, current);
                        }
                        role = 'arpeggio';
                    } else if (motion === 'functional' && (count - i) > 1) {
                        // Let the note that wants to move, move. A leading tone
                        // that rises and a seventh that falls are the two things
                        // that make a line sound like it means the harmony.
                        const chordPcs = chordPool.map(m => ((m % 12) + 12) % 12);
                        const pull = tendencyOf(current, tonicPc, chordPcs);
                        if (pull !== null) {
                            const want = current + pull;
                            const pool = scalePool.length ? scalePool : chordPool;
                            const near = pool.filter(m => Math.abs(m - want) <= 1);
                            midi = near.length ? this.nearest(near, want) : this.nearest(pool, want);
                            role = 'resolution';
                        } else {
                            const dir = (targetMidi >= current) ? 1 : -1;
                            const stepped = scalePool.filter(m => (m - current) * dir > 0);
                            midi = stepped.length ? this.nearest(stepped, current + dir * 2) : current;
                            role = 'connect';
                        }
                    } else {
                        // Move toward the next anchor, by step wherever possible.
                        const remaining = count - i;
                        const gap = targetMidi - current;
                        const idealStep = gap / Math.max(1, remaining);

                        if (lastLeap !== 0) {
                            // Answer a leap with contrary stepwise motion.
                            const dir = lastLeap > 0 ? -1 : 1;
                            const stepped = scalePool.filter(m => (m - current) * dir > 0);
                            midi = stepped.length ? this.nearest(stepped, current + dir * 2) : current;
                            role = 'recovery';
                            lastLeap = 0;
                        } else if (Math.abs(idealStep) <= 2.5) {
                            // Stepwise connection — the default motion.
                            //
                            // The direction has to PERSIST. Taking it from the
                            // sign of the gap to the next anchor means that as
                            // soon as the line steps past that anchor the sign
                            // flips, and it steps back — which is exactly the
                            // "A4 B4 A4 B4" ping-pong. A walk keeps walking
                            // until it arrives or runs out of room.
                            let dir = idealStep >= 0 ? 1 : -1;
                            if (walkDir !== 0 && Math.abs(targetMidi - current) <= 2 && walkRun < 4) {
                                dir = walkDir;                 // keep going past the target
                            }
                            const stepped = scalePool.filter(m => (m - current) * dir > 0);
                            midi = stepped.length ? this.nearest(stepped, current + dir * 2) : current;
                            const moved = Math.sign(midi - current);
                            walkRun = (moved !== 0 && moved === walkDir) ? walkRun + 1 : 0;
                            if (moved !== 0) walkDir = moved;
                        } else {
                            // A leap, used sparingly and only toward a chord tone.
                            const pool = chordPool.length ? chordPool : scalePool;
                            const capped = Math.max(-12, Math.min(12, idealStep));
                            midi = this.nearest(pool, current + capped);
                            if (Math.abs(midi - current) > 12) {
                                midi = this.nearest(pool.filter(m => Math.abs(m - current) <= 12), current + capped);
                            }
                            lastLeap = midi - current;
                            role = 'leap';
                        }

                        // DECORATION: a non-chord tone must have a function and
                        // resolve. Chromatic notes are only ever leading tones
                        // into the following pitch — never free-floating colour.
                        // Chromatic decoration is gated by the harmony dial, not
                        // only by the melody slider: a piece set to plain triads
                        // should not have chromatic neighbours wandering over it.
                        const wantsDecoration = chromaticism > 0 && melodyC > 0.4
                            && dur >= 0.5 && rng() < (melodyC - 0.3) * 0.5 * chromaticism;
                        if (wantsDecoration && !chordPool.includes(midi)) {
                            role = (Math.abs(midi - current) <= 2) ? 'passing' : 'neighbor';
                        }
                    }

                    if (pinnedPool && pinnedPool.length) midi = this.nearest(pinnedPool, midi);
                    midi = Math.max(LOW, Math.min(HIGH, midi));

                    // INTENTION CHECK: every pitch must be justifiable — a tone
                    // of the sounding chord, a member of the sounding scale, or
                    // a decoration that resolves. Anything else is the "random
                    // accidental" case, so pull it into the sounding scale.
                    const justified = chordPool.includes(midi)
                        || scalePool.includes(midi)
                        || (pinnedPool && pinnedPool.includes(midi))
                        || role === 'passing' || role === 'neighbor'
                        || role === 'resolution' || role === 'arpeggio';
                    if (!justified) {
                        const pool = scalePool.length ? scalePool : chordPool;
                        if (pool.length) midi = this.nearest(pool, midi);
                    }

                    // ---- METRE AND DISSONANCE ----
                    const strength = metricStrength(beat % beatsPerBar, beatsPerBar);
                    const prevNote = notes.length ? notes[notes.length - 1] : null;
                    const prevMidi = prevNote ? this.midiOf(prevNote.noteName) : null;

                    // MAKE a suspension, don't just wait for one to occur.
                    //
                    // The classic figure is prepare–suspend–resolve: a note
                    // consonant in the previous chord is HELD across the change,
                    // becomes a dissonance on the strong beat, and falls by step.
                    // Merely recognising the case where the line happened to
                    // repeat a pitch produced none at all in twelve pieces,
                    // because a moving line almost never repeats by accident.
                    const chordChanged = evHere && lastChordEv && evHere.chord !== lastChordEv.chord;
                    // Only when a note actually follows it inside this span —
                    // a suspension on the last note of a phrase has nowhere to
                    // fall to.
                    const roomToResolve = i < count - 1;
                    if (pendingResolution === null && chordChanged && strength >= 0.5
                        && roomToResolve
                        && Number.isFinite(prevMidi) && melodyC > 0.35
                        && !chordPool.includes(prevMidi) && rng() < 0.35 + melodyC * 0.3) {
                        // The held note has to actually resolve somewhere.
                        const below = scalePool.filter(m => m < prevMidi && prevMidi - m <= 2);
                        if (below.length) {
                            midi = prevMidi;
                            role = 'suspension';
                            pendingResolution = prevMidi;
                        }
                    }

                    // A dissonance owed a resolution gets it, before anything
                    // else is considered: that is what makes it a suspension
                    // rather than a wrong note left hanging.
                    if (pendingResolution !== null && role !== 'suspension') {
                        const target = scalePool.filter(m => m < pendingResolution && pendingResolution - m <= 2);
                        if (target.length) {
                            midi = Math.max(...target);
                            role = 'resolution';
                        }
                        pendingResolution = null;
                    } else if (chordPool.length && role !== 'suspension') {
                        const verdict = dissonanceVerdict({
                            midi, chordPool, strength, prevMidi, isFirstOfSpan: isAnchor
                        });
                        if (!verdict.ok) {
                            // An unprepared dissonance on a strong beat. Take the
                            // nearest chord tone instead — the note wanted to be
                            // consonant here and simply was not.
                            midi = this.nearest(chordPool, midi);
                            role = role === 'connect' ? 'chordTone' : role;
                        } else if (verdict.role === 'suspension') {
                            role = 'suspension';
                            pendingResolution = midi;    // must fall by step next
                        } else if (verdict.role === 'passing' && role === 'connect') {
                            role = 'passing';
                        }
                    }

                    // ---- DESTINATION ----
                    // The last note before a section's cadence leans toward the
                    // goal tone, so the phrase arrives somewhere rather than
                    // merely stopping when it runs out of span.
                    // …but never at the cost of an unresolved dissonance. A
                    // suspension that gets overwritten by the goal approach is
                    // exactly the hanging wrong note this was meant to prevent.
                    const atSectionEnd = sectionHere
                        && Math.floor(beat / beatsPerBar) === sectionHere.endBar;
                    if (goalMidi !== null && pendingResolution === null
                        && role !== 'suspension'
                        && i === count - 1 && (atSectionEnd || !to)) {
                        const near = chordPool.filter(m => Math.abs(m - goalMidi) <= 2);
                        if (near.length) { midi = this.nearest(near, goalMidi); role = 'approach'; }
                    }
                    // Absolute ceiling on melodic distance: a leap wider than an
                    // octave is never "sparing emphasis", it is a rupture.
                    if (!isAnchor && Math.abs(midi - current) > 12) {
                        const near = (chordPool.length ? chordPool : scalePool)
                            .filter(m => Math.abs(m - current) <= 12);
                        midi = near.length
                            ? this.nearest(near, current + (midi > current ? 7 : -7))
                            : current + (midi > current ? 12 : -12);
                        midi = Math.max(LOW, Math.min(HIGH, midi));
                        lastLeap = midi - current;
                    }
                    const syl = nextSyllable();
                    // Where this note sits inside its figure decides how it is
                    // performed: the head of a group is leaned on, the tail is
                    // not, and a group entering off the beat is the only place
                    // syncopation can actually be heard.
                    const figureId = figureIds[i] || 'word';
                    const indexInFigure = Number.isFinite(figurePos[i]) ? figurePos[i] : 0;
                    const beatInBar = beat % beatsPerBar;
                    const noteChar = (syl && syl.char) || phraseChar;
                    const marks = articulateNote({
                        duration: dur,
                        indexInFigure,
                        onBeat: Math.abs(beatInBar - Math.round(beatInBar)) < 1e-6,
                        isDownbeat: Math.abs(beatInBar) < 1e-6,
                        char: noteChar,
                        energy: arcEnergy,
                        isCadence: false
                    });
                    notes.push({
                        bar: Math.floor(beat / beatsPerBar),
                        beat: beatInBar,
                        noteName: this.nameOf(midi, preferFlat),
                        duration: Math.min(dur, totalBeats - beat),
                        syllable: syl ? syl.text : null,
                        word: syl ? syl.parentWord : null,
                        figure: figureId,
                        articulation: marks.articulation,
                        accent: marks.accent,
                        __char: noteChar,
                        section: sectionLabel,
                        sectionRole: sectionHere ? sectionHere.role : null,
                        scaleName: pinnedName
                            ? String(pinnedName).toLowerCase().replace(/\s+/g, '_')
                            : ((evHere && evHere.scaleHint && evHere.scaleHint.scaleName)
                               || (context.harmonicProfile && context.harmonicProfile.recommendedScale)),
                        scaleRoot: (evHere && evHere.scaleHint && evHere.scaleHint.root)
                            || (context.harmonicProfile && context.harmonicProfile.root),
                        role,
                        chordTone: chordPool.includes(midi)
                            || this.chordMidis(from.ev, LOW, HIGH).includes(midi)
                            || (to && this.chordMidis(to.ev, LOW, HIGH).includes(midi)),
                        chromatic: (role === 'passing' || role === 'neighbor')
                            && !(hintNotes ? this.scaleMidis(hintNotes, midi, midi).length
                                           : this.scaleMidis(scaleNotes, midi, midi).length)
                    });
                    if (!isAnchor) spanIntervals.push(midi - current);
                    lastChordEv = evHere;
                    current = midi;
                    cursor += dur;
                }

                // The first span that actually MOVES becomes the line's shape.
                // Everything later can restate it from a new degree.
                if (!pitchMotif.length && spanIntervals.length >= 2 &&
                    spanIntervals.some(d => d !== 0)) {
                    pitchMotif = spanIntervals.slice(0, 6);
                }
            }

            // ---- Cadence: the line must arrive, not stop ----
            if (notes.length) {
                const last = notes[notes.length - 1];
                const finalEv = evs.filter(e => e && !e.approachStrategy).pop();
                const pool = this.chordMidis(finalEv, LOW, HIGH);
                if (pool.length) {
                    const lastMidi = this.midiOf(last.noteName);
                    const landing = this.nearest(pool, Number.isFinite(lastMidi) ? lastMidi : centre);
                    last.noteName = this.nameOf(landing, preferFlat);
                    last.role = 'cadence';
                    last.cadence = true;
                    last.chordTone = true;
                    last.chromatic = false;
                    last.articulation = 'tenuto';
                    last.accent = false;
                    if (last.duration < 1) last.duration = Math.min(2, last.duration * 2);
                }
            }

            // Phrasing is decided over the whole line, not note by note: runs of
            // short notes are slurred into one gesture, and the short notes that
            // stand alone are the ones that get detached.
            phraseArticulation(notes, phraseChar);
            notes.forEach(n => { delete n.__char; });

            // The line is written above the voicing by construction; this is the
            // check that it stayed there once the cadence and the ornaments had
            // their say.
            const refitted = this.fitAgainstVoicings(notes, harmony, beatsPerBar, {
                scaleNotes, preferFlat, high: HIGH
            });

            return {
                notes,
                contour,
                anchors: anchors.map(a => ({ beat: a.beat, midi: a.midi })),
                form: form || null,
                voicingAware: Number.isFinite(voicingTop),
                voicingFloor: Number.isFinite(voicingTop) ? voicingTop + 2 : null,
                voicingRefits: refitted
            };
        }
    }

    if (typeof window !== 'undefined') window.MelodicLineEngine = MelodicLineEngine;
    if (typeof module !== 'undefined' && module.exports) module.exports = MelodicLineEngine;
})();
