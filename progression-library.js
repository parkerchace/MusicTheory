/**
 * progression-library.js
 *
 * The standard progressions, written as SCALE DEGREES rather than as roman
 * numerals with baked-in qualities.
 *
 * This distinction is the whole point. "2 5 1" does not mean ii–V–I; it means
 * the second chord, then the fifth, then the first, whatever those turn out to
 * be in the scale you are actually in. In D Lydian that is E7 → Amaj7 → Dmaj7 —
 * still a 2-5-1, still functional, and nothing like the ii–V–I the roman
 * numerals would have forced. Storing qualities in the library would throw away
 * exactly the thing that makes a mode sound like itself.
 *
 * Contents:
 *   - a catalog of named progressions by degree
 *   - descending/ascending fifth cycles of any length, generated rather than
 *     enumerated (7-3-6-2-5-1 is just a six-long descending cycle)
 *   - chromatic mediants: root motion by a third with a chromatic quality
 *   - interval sequences: a cell transposed repeatedly, parallel or diatonic
 *
 * Everything here produces degree numbers. Turning a degree into a chord is the
 * scale's job, and decorating it — substitution, borrowing, approach chords —
 * happens downstream, so the catalog stays a statement of harmonic intent.
 */

(function () {
    'use strict';

    // `ends` is the degree the progression naturally lands on, used to match a
    // progression to the cadence a section needs. `weight` is how ordinary it
    // is; ordinary is good, because the unusual ones only register as unusual
    // against a background of the expected.
    const PROGRESSIONS = [
        // --- cadential cells -------------------------------------------------
        { id: '2-5-1',       degrees: [2, 5, 1],          name: 'ii–V–I',            family: 'cadential', ends: 1, weight: 1.0 },
        { id: '5-1',         degrees: [5, 1],             name: 'V–I (authentic)',   family: 'cadential', ends: 1, weight: 0.9 },
        { id: '4-1',         degrees: [4, 1],             name: 'IV–I (plagal)',     family: 'cadential', ends: 1, weight: 0.6 },
        { id: '2-5',         degrees: [2, 5],             name: 'ii–V (open)',       family: 'cadential', ends: 5, weight: 0.8 },
        { id: '4-5',         degrees: [4, 5],             name: 'IV–V (half)',       family: 'cadential', ends: 5, weight: 0.7 },
        { id: '1-4-5',       degrees: [1, 4, 5],          name: 'I–IV–V',            family: 'primary',   ends: 5, weight: 1.0 },
        { id: '1-4-5-1',     degrees: [1, 4, 5, 1],       name: 'I–IV–V–I',          family: 'primary',   ends: 1, weight: 1.0 },
        { id: '1-5-4-1',     degrees: [1, 5, 4, 1],       name: 'I–V–IV–I',          family: 'primary',   ends: 1, weight: 0.7 },
        { id: '1-2-5-1',     degrees: [1, 2, 5, 1],       name: 'I–ii–V–I',          family: 'cadential', ends: 1, weight: 0.9 },
        { id: '1-4-2-5',     degrees: [1, 4, 2, 5],       name: 'I–IV–ii–V',         family: 'cadential', ends: 5, weight: 0.7 },

        // --- turnarounds -----------------------------------------------------
        { id: '1-6-2-5',     degrees: [1, 6, 2, 5],       name: 'I–vi–ii–V (rhythm changes)', family: 'turnaround', ends: 5, weight: 1.0 },
        { id: '1-6-4-5',     degrees: [1, 6, 4, 5],       name: 'I–vi–IV–V (50s)',   family: 'turnaround', ends: 5, weight: 1.0 },
        { id: '3-6-2-5',     degrees: [3, 6, 2, 5],       name: 'iii–vi–ii–V',       family: 'turnaround', ends: 5, weight: 0.85 },
        { id: '2-5-1-6',     degrees: [2, 5, 1, 6],       name: 'ii–V–I–vi',         family: 'turnaround', ends: 6, weight: 0.8 },
        { id: '1-6-2-5-1',   degrees: [1, 6, 2, 5, 1],    name: 'I–vi–ii–V–I',       family: 'turnaround', ends: 1, weight: 0.85 },

        // --- axis / pop ------------------------------------------------------
        { id: '1-5-6-4',     degrees: [1, 5, 6, 4],       name: 'I–V–vi–IV (axis)',  family: 'axis',      ends: 4, weight: 1.0 },
        { id: '6-4-1-5',     degrees: [6, 4, 1, 5],       name: 'vi–IV–I–V',         family: 'axis',      ends: 5, weight: 1.0 },
        { id: '4-1-5-6',     degrees: [4, 1, 5, 6],       name: 'IV–I–V–vi',         family: 'axis',      ends: 6, weight: 0.7 },
        { id: '1-4-6-5',     degrees: [1, 4, 6, 5],       name: 'I–IV–vi–V',         family: 'axis',      ends: 5, weight: 0.8 },
        { id: '6-5-4-5',     degrees: [6, 5, 4, 5],       name: 'vi–V–IV–V',         family: 'axis',      ends: 5, weight: 0.6 },

        // --- royal road / mediant-rich ---------------------------------------
        { id: '4-5-3-6',     degrees: [4, 5, 3, 6],       name: 'IV–V–iii–vi (royal road)', family: 'mediant', ends: 6, weight: 0.85 },
        { id: '1-3-6-4',     degrees: [1, 3, 6, 4],       name: 'I–iii–vi–IV',       family: 'mediant',   ends: 4, weight: 0.8 },
        { id: '1-3-4-5',     degrees: [1, 3, 4, 5],       name: 'I–iii–IV–V',        family: 'mediant',   ends: 5, weight: 0.7 },
        { id: '6-3-4-1',     degrees: [6, 3, 4, 1],       name: 'vi–iii–IV–I',       family: 'mediant',   ends: 1, weight: 0.6 },

        // --- stepwise / line -------------------------------------------------
        { id: '1-2-3-4',     degrees: [1, 2, 3, 4],       name: 'ascending steps',   family: 'linear',    ends: 4, weight: 0.55 },
        { id: '1-7-6-5',     degrees: [1, 7, 6, 5],       name: 'descending steps',  family: 'linear',    ends: 5, weight: 0.75 },
        { id: '4-3-2-1',     degrees: [4, 3, 2, 1],       name: 'descending to tonic', family: 'linear',  ends: 1, weight: 0.7 },
        { id: '1-2-3-5',     degrees: [1, 2, 3, 5],       name: 'I–ii–iii–V',        family: 'linear',    ends: 5, weight: 0.5 },

        // --- modal / minor-leaning ------------------------------------------
        { id: '1-7-4-1',     degrees: [1, 7, 4, 1],       name: 'i–♭VII–IV–i (mixolydian)', family: 'modal', ends: 1, weight: 0.8 },
        { id: '1-4-7-1',     degrees: [1, 4, 7, 1],       name: 'i–iv–♭VII–i',       family: 'modal',     ends: 1, weight: 0.75 },
        { id: '1-6-7-1',     degrees: [1, 6, 7, 1],       name: 'i–♭VI–♭VII–i',      family: 'modal',     ends: 1, weight: 0.85 },
        { id: '1-7-6-7',     degrees: [1, 7, 6, 7],       name: 'i–♭VII–♭VI–♭VII',   family: 'modal',     ends: 7, weight: 0.6 },
        { id: '1-4-1-5',     degrees: [1, 4, 1, 5],       name: 'I–IV–I–V (blues shape)', family: 'blues', ends: 5, weight: 0.8 },
        { id: '1-1-4-1',     degrees: [1, 1, 4, 1],       name: 'blues first four',  family: 'blues',     ends: 1, weight: 0.5 },
        { id: '4-4-1-1',     degrees: [4, 4, 1, 1],       name: 'blues middle',      family: 'blues',     ends: 1, weight: 0.45 },
        { id: '5-4-1-1',     degrees: [5, 4, 1, 1],       name: 'blues turnaround',  family: 'blues',     ends: 1, weight: 0.6 }
    ];

    /**
     * A chain of falling fifths. In degree terms a fifth down is +3 (1→4→7→3→6→2→5),
     * which is where 7-3-6-2-5-1 comes from — it is simply the last six links of
     * the cycle, arriving at the tonic. Generating these beats enumerating them:
     * any length from any starting degree is available.
     */
    function fifthsCycle(endDegree = 1, length = 4, descending = true) {
        const step = descending ? -3 : 3;         // walk backwards from the goal
        const out = [endDegree];
        let d = endDegree;
        for (let i = 1; i < length; i++) {
            d = ((d - 1 + step * 1) % 7 + 7) % 7 + 1;
            out.unshift(d);
        }
        return out;
    }

    /** Every falling-fifths chain of the given lengths, landing on `endDegree`. */
    function fifthsCycles(endDegree = 1, lengths = [3, 4, 5, 6]) {
        return lengths.map(n => ({
            id: `cycle-${n}-to-${endDegree}`,
            degrees: fifthsCycle(endDegree, n, true),
            name: `${n}-chord falling-fifths cycle`,
            family: 'cycle',
            ends: endDegree,
            weight: 0.7
        }));
    }

    /** The catalog plus the generated cycles. */
    function catalog() {
        const cycles = [];
        [1, 5, 6].forEach(end => cycles.push(...fifthsCycles(end)));
        return PROGRESSIONS.concat(cycles);
    }

    /**
     * Fit a degree sequence to a bar count without destroying its shape.
     *
     * Longer than the section: keep the TAIL, because a progression's identity
     * and its arrival both live at the end — truncating the front of 7-3-6-2-5-1
     * still leaves a cycle that cadences, truncating the back leaves nothing.
     * Shorter: either repeat it or hold its chords for two bars each, which is
     * how these are actually played over longer forms.
     */
    function fitToBars(degrees, bars, rng) {
        const d = degrees.slice();
        if (!d.length || bars <= 0) return [];
        if (d.length === bars) return d;
        if (d.length > bars) return d.slice(d.length - bars);

        // Doubling every chord is the most idiomatic expansion when it lands
        // exactly; otherwise repeat the cell and trim from the front so the
        // cadence still falls on the last bar.
        if (d.length * 2 === bars) {
            const out = [];
            d.forEach(x => { out.push(x, x); });
            return out;
        }
        const out = [];
        while (out.length < bars) out.push(...d);
        return out.slice(out.length - bars);
    }

    /**
     * Choose a progression for a section.
     *
     * `endsOn` is the degree the section's cadence needs. Progressions that
     * already land there are strongly preferred; anything else has its last bar
     * rewritten, which works but is less idiomatic than picking one that was
     * going there anyway.
     */
    function choose({ bars, endsOn = 1, rng, prefer = null, exclude = [], colour = 0.4,
                      families = null, degrees = null }) {
        const all = catalog();
        if (prefer) {
            const hit = all.find(p => p.id === prefer || p.degrees.join('-') === String(prefer));
            if (hit) return hit;
        }
        let pool = all.filter(p => !exclude.includes(p.id));
        // The complexity dial FILTERS the catalog rather than reweighting it.
        // A learner set to "primary triads" has to be unable to get a ♭VII
        // cycle, not merely unlikely to — "rarely happens" is not a rule
        // anybody can hear.
        if (Array.isArray(families)) {
            const byFamily = pool.filter(p => families.includes(p.family));
            if (byFamily.length) pool = byFamily;
        }
        if (Array.isArray(degrees)) {
            const byDegree = pool.filter(p => p.degrees.every(d => degrees.includes(d)));
            if (byDegree.length) pool = byDegree;
        }
        if (!pool.length) pool = all;
        const scored = pool.map(p => {
            let s = p.weight;
            if (p.ends === endsOn) s += 1.2;                       // already cadences right
            if (p.degrees.length === bars) s += 0.5;               // fits without surgery
            else if (bars % p.degrees.length === 0) s += 0.25;
            // A high colour setting is an appetite for the less usual choices.
            s += (1 - p.weight) * colour * 0.8;
            if (p.family === 'cycle') s += colour * 0.4;
            return { p, s: s * (0.75 + rng() * 0.5) };             // seeded jitter
        });
        scored.sort((a, b) => b.s - a.s);
        return scored[0].p;
    }

    // --- Chromatic mediants --------------------------------------------------
    //
    // Roots a third apart whose quality is NOT what the key would give. C major
    // to E major, or to A♭ major: two common tones or one, no functional
    // preparation, and an immediate sense of having stepped sideways into
    // another light. They are substitutions rather than progressions, so they
    // are returned as a semitone offset plus the quality to force.
    const CHROMATIC_MEDIANTS = [
        { semitones: 4,  quality: 'maj', name: 'upper major mediant',   relation: '♯III' },
        { semitones: 3,  quality: 'maj', name: 'upper minor mediant',   relation: '♭III' },
        { semitones: 8,  quality: 'maj', name: 'lower major mediant',   relation: '♭VI' },
        { semitones: 9,  quality: 'maj', name: 'lower minor mediant',   relation: 'VI' },
        { semitones: 4,  quality: 'min', name: 'minor upper mediant',   relation: 'iii' },
        { semitones: 8,  quality: 'min', name: 'minor lower mediant',   relation: '♭vi' }
    ];

    function chromaticMediant(rng) {
        return CHROMATIC_MEDIANTS[Math.floor(rng() * CHROMATIC_MEDIANTS.length)];
    }

    // --- Interval sequences --------------------------------------------------
    //
    // A cell transposed repeatedly by a fixed interval. `parallel` keeps the
    // chord quality identical (planing — the sound of Debussy and of most film
    // scoring); `diatonic` refits each copy to the scale, which is the older
    // and more functional version of the same gesture.
    const SEQUENCE_INTERVALS = [
        { semitones: -2, name: 'descending whole steps' },
        { semitones: 2,  name: 'ascending whole steps' },
        { semitones: -1, name: 'descending semitones' },
        { semitones: 1,  name: 'ascending semitones' },
        { semitones: 3,  name: 'ascending minor thirds' },
        { semitones: -3, name: 'descending minor thirds' },
        { semitones: 4,  name: 'ascending major thirds' },
        { semitones: -5, name: 'descending fourths' }
    ];

    function sequencePattern(rng, { allowChromatic = true } = {}) {
        const pool = allowChromatic ? SEQUENCE_INTERVALS
            : SEQUENCE_INTERVALS.filter(s => Math.abs(s.semitones) !== 1);
        const step = pool[Math.floor(rng() * pool.length)];
        return {
            ...step,
            mode: rng() < 0.5 ? 'parallel' : 'diatonic',
            length: 2 + Math.floor(rng() * 3)          // 2–4 copies
        };
    }

    const api = {
        PROGRESSIONS, CHROMATIC_MEDIANTS, SEQUENCE_INTERVALS,
        catalog, choose, fitToBars, fifthsCycle, fifthsCycles,
        chromaticMediant, sequencePattern
    };
    if (typeof window !== 'undefined') window.ProgressionLibrary = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
