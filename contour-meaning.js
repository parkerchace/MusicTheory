/**
 * contour-meaning.js
 *
 * WHAT THE DRAWN LINE IS A DRAWING OF.
 *
 * One line on the contour canvas can stand for different things, and each one
 * asks something different of the generator:
 *
 *   piece    the energy and motion of the whole piece, start to finish — how
 *            busy, how high and how loud it is at each point. The line is
 *            stretched over every bar.
 *   phrase   the shape of ONE phrase. Each section of the form plays the line
 *            across its own bars, so every phrase rises and falls as drawn.
 *   melody   the tune itself: height on the canvas is pitch. The melody's
 *            anchor notes follow the line closely instead of taking it as a
 *            hint, and energy follows it only gently.
 *   motif    a short idea — a handful of notes. The line's turning points
 *            become a pitch shape the melody states at the opening and then
 *            develops; the piece's energy takes a plain arch of its own.
 */
(function () {
    'use strict';

    const MEANINGS = [
        { id: 'piece', label: 'The whole piece',
          title: 'Contour: draw the shape of the piece',
          axis: 'higher = busier, higher, louder',
          about: 'The energy and motion of the whole piece, stretched across every bar.' },
        { id: 'phrase', label: 'Each phrase',
          title: 'Contour: draw the shape of one phrase',
          axis: 'higher = busier, higher, louder',
          about: 'Every section of the form plays this shape across its own bars.' },
        { id: 'melody', label: 'The melody',
          title: 'Contour: draw the melody',
          axis: 'higher = higher pitch',
          about: 'Height is pitch: the tune follows the line, landing on chord tones and cadences.' },
        { id: 'motif', label: 'A motif',
          title: 'Contour: draw a motif',
          axis: 'higher = higher pitch',
          about: 'The dots are the notes: a short idea stated at the opening and developed through the piece.' }
    ];
    const IDS = MEANINGS.map(m => m.id);

    function normalize(id) { return IDS.indexOf(id) >= 0 ? id : 'piece'; }
    function describe(id) { return MEANINGS.find(m => m.id === normalize(id)); }

    /** The setting, as saved. */
    function current() {
        if (typeof window === 'undefined') return 'piece';
        if (!window.__contourMeaning) {
            let stored = null;
            try { stored = localStorage.getItem('contourMeaning'); } catch (_) {}
            window.__contourMeaning = normalize(stored);
        }
        return window.__contourMeaning;
    }
    function set(id) {
        const v = normalize(id);
        if (typeof window !== 'undefined') window.__contourMeaning = v;
        try { localStorage.setItem('contourMeaning', v); } catch (_) {}
        return v;
    }

    /**
     * A drawn line's NOTES: the points where it turns, at most six.
     *
     * A motif is heard as its turns — up, up, down — not as a smooth curve, so
     * the line is reduced to its corners: the start, the end, and every place it
     * changes direction by enough to mean it. Too many corners are thinned by
     * dropping whichever one bends the line least. A line that never turns
     * (a plain rise) is read as even steps, or it would be a two-note motif.
     *
     * @param {number[]} values heights 0..1, left to right
     * @returns {{indices:number[], heights:number[]}}
     */
    function turningPoints(values, maxNotes = 6) {
        const v = (values || []).map(Number).filter(Number.isFinite);
        const n = v.length;
        if (n < 2) return { indices: [], heights: [] };
        const HYST = 0.06;
        const idx = [0];
        let dir = 0;       // the current run: 1 rising, -1 falling, 0 not yet moving
        let extreme = 0;   // how far the current run has got
        for (let i = 1; i < n; i++) {
            if (dir === 0) {
                if (Math.abs(v[i] - v[0]) > HYST) { dir = v[i] > v[0] ? 1 : -1; extreme = i; }
            } else if ((v[i] - v[extreme]) * dir >= 0) {
                extreme = i;
            } else if (Math.abs(v[i] - v[extreme]) > HYST) {
                // Gone back far enough to be a turn, not a wobble.
                idx.push(extreme);
                dir = -dir;
                extreme = i;
            }
        }
        if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);

        // Thin to the most telling corners.
        while (idx.length > maxNotes) {
            let worst = 1, worstDev = Infinity;
            for (let k = 1; k < idx.length - 1; k++) {
                const a = idx[k - 1], b = idx[k], c = idx[k + 1];
                const lineAt = v[a] + (v[c] - v[a]) * ((b - a) / Math.max(1, c - a));
                const dev = Math.abs(v[b] - lineAt);
                if (dev < worstDev) { worstDev = dev; worst = k; }
            }
            idx.splice(worst, 1);
        }

        // No turns: even steps along the line.
        if (idx.length < 3) {
            const k = 4;
            const even = [];
            for (let j = 0; j < k; j++) even.push(Math.round(j * (n - 1) / (k - 1)));
            return { indices: even, heights: even.map(i => v[i]) };
        }
        return { indices: idx, heights: idx.map(i => v[i]) };
    }

    /**
     * The motif as the melody engine takes it: semitone steps between notes.
     * The full height of the canvas is a little over an octave, and no single
     * step is wider than a sixth, so a scribble still comes out singable.
     * A flat line has no shape and gives no motif.
     */
    function motifFromCurve(values) {
        const tp = turningPoints(values);
        const h = tp.heights;
        if (h.length < 2) return [];
        if (Math.max.apply(null, h) - Math.min.apply(null, h) < 0.04) return [];
        const pitch = h.map(x => Math.round((x - h[0]) * 14));
        const steps = [];
        for (let i = 1; i < pitch.length; i++) {
            steps.push(Math.max(-9, Math.min(9, pitch[i] - pitch[i - 1])));
        }
        return steps;
    }

    /** An arch peaking at the golden section: energy for a piece built on a motif. */
    function goldenArch(t) {
        const p = 0.618;
        const x = Math.max(0, Math.min(1, Number(t) || 0));
        const a = x <= p ? Math.sin((x / p) * Math.PI / 2) : Math.sin((1 - (x - p) / (1 - p)) * Math.PI / 2);
        return 0.3 + 0.5 * a;
    }

    /**
     * Read the drawn line as `meaning`, rewriting `arc` in place.
     *
     * `drawn(t)` is the line as the canvas has it (0..1 over its width).
     * `formOf()` returns the CURRENT form, read at sample time, so a section
     * added later still plays the phrase shape across its own bars.
     *
     * Sets `arc.contourMeaning`, and for melody `arc.pitchSample`, for motif
     * `arc.motif` (semitone steps).
     */
    function apply(arc, meaning, drawn, opts = {}) {
        const m = normalize(meaning);
        arc.contourMeaning = m;
        delete arc.pitchSample;
        delete arc.motif;
        if (typeof drawn !== 'function' || m === 'piece') {
            if (typeof drawn === 'function') arc.sample = drawn;
            return arc;
        }
        const clamp = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0.5));

        if (m === 'phrase') {
            const formOf = typeof opts.formOf === 'function' ? opts.formOf : () => null;
            // Energy AND pitch: a phrase's shape is heard in its tune first,
            // so the melody follows the drawing inside every section rather
            // than following one curve stretched over the whole piece.
            arc.pitchSample = (t) => arc.sample(t);
            arc.sample = (t) => {
                const form = formOf();
                const bars = Math.max(1, (form && form.bars) || arc.bars || 4);
                const x = clamp(t) * bars;
                const secs = (form && Array.isArray(form.sections) && form.sections.length) ? form.sections : null;
                let start = 0, len = Math.min(4, bars);
                if (secs) {
                    const s = secs.find(sec => x >= sec.startBar && x < sec.startBar + sec.bars) || secs[secs.length - 1];
                    start = s.startBar; len = Math.max(1, s.bars);
                } else {
                    start = Math.floor(x / len) * len;
                }
                return clamp(drawn(clamp((x - start) / len)));
            };
        } else if (m === 'melody') {
            arc.pitchSample = (t) => clamp(drawn(clamp(t)));
            // Energy leans the same way, gently: a high tune is a little more
            // intense, but the drawing is about pitch, not about loudness.
            arc.sample = (t) => 0.5 + (clamp(drawn(clamp(t))) - 0.5) * 0.45;
        } else if (m === 'motif') {
            const values = Array.isArray(opts.values) ? opts.values : null;
            arc.motif = motifFromCurve(values || sampleN(drawn, 160));
            arc.sample = goldenArch;
        }
        return arc;
    }

    function sampleN(fn, n) {
        const out = [];
        for (let i = 0; i < n; i++) out.push(Number(fn(n > 1 ? i / (n - 1) : 0)));
        return out;
    }

    const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function midiOf(name) {
        const q = String(name || '').match(/^([A-G])([#b]*)(-?\d+)$/);
        if (!q) return NaN;
        return 12 * (Number(q[3]) + 1) + PC[q[1]] + q[2].split('').reduce((a, c) => a + (c === '#' ? 1 : -1), 0);
    }
    function nameOf(midi, flats) {
        const names = flats ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
                            : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
    }

    /**
     * WRITE THE DRAWN MOTIF INTO THE TUNE, at the opening of every section.
     *
     * Handing the shape to the line engine as a hint was not enough: the
     * engine fits a motif into whatever span the word rhythm gives it, and
     * with a few words most spans hold one to three notes — so a four-note
     * shape arrived truncated or not at all, and what was heard was the
     * overall line instead. A motif is only a motif if it is recognisably the
     * same shape each time, so it is written in directly: the section's own
     * first note stays (the engine chose it as a chord tone over the opening
     * harmony), and each following note moves by the drawn step, snapped to
     * the scale sounding there and never allowed to reverse the step's
     * direction. Rhythm and syllables are untouched.
     *
     * @param {Array} notes melody notes ({bar, beat, noteName, isRest?})
     * @param {number[]} motif semitone steps
     * @param {Array} sections form sections ({startBar, endBar})
     * @param {(note)=>number[]|null} scalePcsAt pitch classes in force at a note
     * @returns {number} how many sections now open with the motif
     */
    function stampMotif(notes, motif, sections, scalePcsAt) {
        if (!Array.isArray(notes) || !Array.isArray(motif) || motif.length < 2) return 0;
        const secs = (Array.isArray(sections) && sections.length) ? sections : [{ startBar: 0, endBar: Infinity }];
        const flats = notes.some(n => /^[A-G]b/.test(String(n && n.noteName || '')));
        const sounding = notes.filter(n => n && !n.isRest && Number.isFinite(midiOf(n.noteName)));
        let stamped = 0;
        secs.forEach((s) => {
            const inSec = sounding.filter(n => n.bar >= s.startBar && n.bar <= s.endBar);
            if (inSec.length < 2) return;
            let prev = midiOf(inSec[0].noteName);
            const k = Math.min(inSec.length - 1, motif.length);
            for (let i = 1; i <= k; i++) {
                const step = motif[i - 1];
                const want = prev + step;
                const pcs = (typeof scalePcsAt === 'function' && scalePcsAt(inSec[i])) || null;
                let midi = want;
                if (pcs && pcs.length) {
                    let best = null;
                    for (let d = 0; d <= 2 && best === null; d++) {
                        // Between two equally close notes, the narrower interval:
                        // more singable, and it cannot overshoot the drawing.
                        const order = step >= 0 ? [-d, d] : [d, -d];
                        for (const o of order) {
                            const c = want + o;
                            const keepsDir = step === 0 ? c === prev : (c - prev) * step > 0;
                            if (pcs.indexOf(((c % 12) + 12) % 12) >= 0 && keepsDir) { best = c; break; }
                        }
                    }
                    if (best !== null) midi = best;
                }
                inSec[i].noteName = nameOf(midi, flats);
                inSec[i].role = 'motif';
                inSec[i].motif = true;
                prev = midi;
            }
            inSec[0].motif = true;
            stamped++;
        });
        return stamped;
    }

    /** Melody-engine extras for a take: a drawn motif outranks a method's. */
    function melodyExtra(arc, extra) {
        const base = extra || {};
        if (arc && Array.isArray(arc.motif) && arc.motif.length >= 2) return { ...base, motif: arc.motif.slice() };
        return base;
    }

    const api = { MEANINGS, normalize, describe, current, set, turningPoints, motifFromCurve,
                  goldenArch, apply, melodyExtra, stampMotif, midiOf, nameOf };
    if (typeof window !== 'undefined') window.ContourMeaning = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
