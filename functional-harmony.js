/**
 * functional-harmony.js
 *
 * Builds progressions from HARMONIC FUNCTION rather than from a table of
 * roman-numeral strings.
 *
 * Why: the generator used fixed templates per emotional tone — ['I','IV','V','IV']
 * and so on — written against the major scale. Applied to whatever scale the
 * word-analysis happened to choose, they produced nonsense: a "I" in locrian is
 * a diminished triad, a "V" in aeolian is minor and cannot cadence, and a run
 * like I–IV–ii–vi–vi–IV–♭VII–I is not a progression at all, just eight chords in
 * a row. Function is the thing that has to be right first; substitution,
 * borrowing and approach chords are departures FROM a functional core, and
 * without the core there is nothing for them to depart from.
 *
 * The three functions, and the only grammar that matters:
 *
 *      TONIC  →  PREDOMINANT  →  DOMINANT  →  TONIC
 *        ↑______________________________________|
 *
 * Every degree of any scale is classified by the interval it sits above the
 * tonic, so this works for church modes, harmonic/melodic minor and the more
 * exotic seven-note scales without a per-scale table.
 */

(function () {
    'use strict';

    // Interval above the tonic → function, with the strength of that reading.
    // A degree can serve more than one function (vi is both a tonic substitute
    // and a predominant); the weights say which reading is the usual one.
    const FUNCTION_BY_INTERVAL = {
        0:  { T: 1.0 },                     // tonic
        1:  { PD: 0.8, D: 0.3 },            // ♭II — Neapolitan, a predominant
        2:  { PD: 0.9 },                    // ii
        3:  { T: 0.7, PD: 0.3 },            // ♭III — relative major of a minor key
        4:  { T: 0.75, D: 0.2 },            // iii — tonic substitute
        5:  { PD: 1.0 },                    // IV — the subdominant proper
        6:  { D: 0.6, PD: 0.3 },            // ♯IV / ♭V — tritone, leans dominant
        7:  { D: 1.0 },                     // V — the dominant proper
        8:  { PD: 0.85, T: 0.2 },           // ♭VI — deceptive goal, predominant
        9:  { T: 0.7, PD: 0.6 },            // vi — tonic substitute and predominant
        10: { D: 0.55, PD: 0.4 },           // ♭VII — the backdoor dominant
        11: { D: 0.9 }                      // vii° — leading-tone dominant
    };

    // Roman numeral for a scale degree, by its interval above the tonic.
    // Uppercase/lowercase is decided later from the chord's actual quality.
    const ROMAN_BY_INTERVAL = {
        0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV',
        6: '#IV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII'
    };

    const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    /**
     * Chord quality from a chord-type string.
     *
     * Written out rather than pattern-matched on a leading "m" because that
     * shortcut reads "maj7" as minor — which silently turned every major chord
     * in the catalog into a lowercase roman, reported C major as a minor key,
     * and made the cadence logic fight the scale it was writing in.
     * Order matters: the more specific prefixes have to be tested first.
     */
    function qualityOf(type) {
        const t = String(type || '').trim();
        if (/^(m7b5|ø|half)/i.test(t)) return 'dim';        // half-diminished
        if (/^(dim|°|o7)/i.test(t)) return 'dim';
        if (/^(mmaj|minmaj|m\(maj)/i.test(t)) return 'minor';  // minor-major 7th
        if (/^(maj|major)/i.test(t)) return 'major';
        if (/^M(?![a-z])/.test(t)) return 'major';
        if (/^(m|min)/i.test(t)) return 'minor';
        if (/^(aug|\+)/i.test(t)) return 'aug';
        if (/^sus/i.test(t)) return 'sus';
        return 'major';                                      // 7, 9, 13, 6, bare triad
    }

    function pcOf(mt, name) {
        const pc = String(name || '').replace(/-?\d+$/, '');
        if (mt && mt.noteValues && Number.isFinite(mt.noteValues[pc])) return mt.noteValues[pc];
        return CHROMATIC.indexOf(pc);
    }

    /**
     * Can this scale carry functional harmony at all?
     *
     * DOMINANT IS A FUNCTION, NOT A QUALITY. It is the degree a fifth above the
     * tonic (a fourth below it), and what makes it dominant is where it sits,
     * not what chord happens to be built there. Gm7 → Cm7 is dominant motion
     * exactly as much as G7 → C is; aeolian, dorian, phrygian and mixolydian
     * all carry a MINOR chord on their fifth degree and are all perfectly good
     * homes. Requiring a major-quality dominant would throw out most of the
     * modes, which is precisely the music this is meant to write.
     *
     * What actually disqualifies a scale is STRUCTURAL INSTABILITY: a degree
     * whose own triad has no perfect fifth. Locrian's tonic is diminished, and
     * Gb aeolian-harmonic's fifth degree comes out as D♭maj7♯5 — an augmented
     * chord with no perfect fifth of its own, which cannot function as a
     * dominant in any tradition however it is labelled. Those are the scales
     * whose progressions read as arbitrary no matter how carefully the degrees
     * are chosen.
     *
     * So the test is: is there a stable triad on the tonic, and a stable triad
     * on the fifth degree? The fifth above scale-degree-5 is interval 2, which
     * is why that interval has to be present.
     *
     * Scales failing this stay fully available for colour, for borrowing and
     * for approach runs — they are just not places a piece can live.
     */
    function isFunctional(intervals) {
        if (!Array.isArray(intervals) || intervals.length < 5) return false;
        const has = (i) => intervals.includes(i);

        // A degree carries a stable triad when it has a perfect fifth of its
        // own and a third of either quality. Quality is never the test.
        const stableOn = (root) => has(root)
            && has((root + 7) % 12)
            && (has((root + 4) % 12) || has((root + 3) % 12));

        // Tonic: perfect fifth, plus a third of either quality.
        const tonicStable = stableOn(0);

        // WAYS HOME. The dominant is the strongest, but it is not the only one,
        // and insisting on it rejects real modes: phrygian's fifth degree is
        // diminished, because phrygian does not cadence through a dominant at
        // all — it cadences ♭II→i, which is why that cadence carries its name.
        // Aeolian and dorian reach the tonic through iv and ♭VII as readily as
        // through v. So the requirement is a stable chord standing in one of
        // the recognised cadential relations to the tonic.
        const CADENTIAL = [
            { interval: 7, name: 'authentic' },   // dominant, any quality
            { interval: 5, name: 'plagal' },      // subdominant
            { interval: 1, name: 'phrygian' },    // ♭II
            { interval: 10, name: 'backdoor' }    // ♭VII
        ];
        const routes = CADENTIAL.filter(c => stableOn(c.interval));
        const hasDominant = stableOn(7);

        // A dominant on its own is enough. Without one, the scale needs at
        // least two other working routes home — one alone is too thin a thread
        // to hang a whole piece on, and that is what let collections whose
        // fifth degree comes out augmented slip through on a plagal move.
        const canCadence = hasDominant || routes.length >= 2;

        // Enough of the scale has to form stable triads for a progression to
        // have anywhere to go at all.
        let stable = 0;
        for (const root of intervals) if (stableOn(root)) stable++;

        return tonicStable && canCadence && stable >= 4;
    }

    /**
     * How much the staff will have to fight this scale.
     *
     * A collection that is a rotation of the major scale is covered by an
     * ordinary key signature, so nothing needs an accidental in front of it.
     * Anything further out prints an accidental on every altered degree, in
     * every bar — which is why generated music in the more exotic scales came
     * back looking like a minefield regardless of how sensible the harmony was.
     * Returned as a count of altered degrees, 0 for the church modes.
     */
    function notationCost(intervals) {
        if (!Array.isArray(intervals) || intervals.length !== 7) return 4;
        const MAJOR = [0, 2, 4, 5, 7, 9, 11];
        const set = new Set(intervals);
        let best = 7;
        // Compare against every rotation (every mode of every major key).
        for (let r = 0; r < 12; r++) {
            const rotated = new Set(MAJOR.map(x => (x + r) % 12));
            let diff = 0;
            for (const i of set) if (!rotated.has(i)) diff++;
            if (diff < best) best = diff;
        }
        return best;
    }

    /**
     * Describe every degree of the working scale: its interval above the tonic,
     * its chord, its roman numeral (cased by actual quality) and its function.
     */
    function analyzeScale(mt, key, scaleName) {
        const notes = (() => {
            try {
                if (mt && typeof mt.getScaleNotesWithKeySignature === 'function') {
                    return mt.getScaleNotesWithKeySignature(key, scaleName) || [];
                }
                if (mt && typeof mt.getScaleNotes === 'function') {
                    return mt.getScaleNotes(key, scaleName) || [];
                }
            } catch (_) {}
            return [];
        })();
        if (!notes.length) return null;

        const tonicPc = pcOf(mt, key);
        const degrees = [];
        for (let d = 1; d <= notes.length; d++) {
            let chord = null;
            try { chord = mt.getDiatonicChord(d, key, scaleName); } catch (_) { chord = null; }
            if (!chord) continue;
            const interval = ((pcOf(mt, chord.root) - tonicPc) % 12 + 12) % 12;
            const type = String(chord.chordType || '');
            const quality = qualityOf(type);
            const isDiminished = quality === 'dim';
            const isMinorish = quality === 'minor' || isDiminished;
            let roman = ROMAN_BY_INTERVAL[interval] || 'I';
            if (isMinorish) roman = roman.replace(/[IV]+/, (m) => m.toLowerCase());
            if (isDiminished) roman += '°';

            degrees.push({
                degree: d,
                interval,
                roman: roman.replace('°', ''),   // the resolver reads plain romans
                displayRoman: roman,
                chordType: type,
                quality,
                root: chord.root,
                diminished: isDiminished,
                minor: quality === 'minor',
                functions: FUNCTION_BY_INTERVAL[interval] || { T: 0.2 }
            });
        }
        const intervals = degrees.map(x => x.interval);
        return {
            key, scaleName, notes, degrees,
            intervals,
            functional: isFunctional(intervals),
            tonicIsMinor: !!(degrees[0] && degrees[0].minor)
        };
    }

    /**
     * The roman numeral for a SCALE DEGREE in this scale.
     *
     * This is the bridge that lets "2 5 1" mean "second chord, fifth chord,
     * first chord" in whatever scale is in force. In D Lydian degree 2 comes
     * back as II (E7), not as ii — the numbers say which chords, the scale says
     * what they are.
     */
    function romanForDegree(analysis, degree) {
        if (!analysis || !analysis.degrees.length) return 'I';
        const n = analysis.degrees.length;
        const idx = ((Math.round(degree) - 1) % n + n) % n;
        return analysis.degrees[idx].roman;
    }

    /** Full degree record for a scale degree number. */
    function degreeInfo(analysis, degree) {
        if (!analysis || !analysis.degrees.length) return null;
        const n = analysis.degrees.length;
        const idx = ((Math.round(degree) - 1) % n + n) % n;
        return analysis.degrees[idx];
    }

    /** Which scale degree number a cadence wants to land on. */
    function cadenceTargetDegree(kind) {
        switch (kind) {
            case 'authentic':
            case 'plagal':    return 1;
            case 'deceptive': return 6;
            case 'half':
            default:          return 5;
        }
    }

    /** Degrees that can serve a function, best reading first. */
    function candidates(analysis, fn) {
        return analysis.degrees
            .filter(d => d.functions[fn] > 0)
            .sort((a, b) => b.functions[fn] - a.functions[fn]);
    }

    /**
     * Pick a degree for a function, avoiding whatever is already sounding.
     * `strength` biases toward the textbook choice (V for D, IV for PD) versus
     * its substitutes.
     */
    function pickFor(analysis, fn, { avoid, rng, strength = 0.65 } = {}) {
        let pool = candidates(analysis, fn).filter(d => d.roman !== avoid);
        if (!pool.length) return candidates(analysis, fn)[0] || analysis.degrees[0];
        // A diminished triad is unstable by construction: it belongs on a weak
        // beat, inside an approach, or as a passing sonority. Standing it up as
        // a bar's structural chord is what made progressions in lydian and
        // locrian-adjacent scales sound like they were fighting themselves.
        const stable = pool.filter(d => !d.diminished);
        if (stable.length) pool = stable;
        if (rng() < strength) return pool[0];
        const rest = pool.slice(1);
        return rest.length ? rest[Math.floor(rng() * rest.length)] : pool[0];
    }

    /**
     * A functional cadence, written backwards from the goal.
     * Returns romans for the final one or two bars.
     */
    function cadenceRomans(analysis, kind, rng) {
        const tonic = analysis.degrees[0];
        const dom = candidates(analysis, 'D')[0] || tonic;
        const pre = candidates(analysis, 'PD')[0] || tonic;
        // THE CADENTIAL DOMINANT IS ALWAYS MAJOR.
        //
        // Aeolian, dorian, phrygian and mixolydian all have a MINOR triad on
        // the fifth degree, which has no leading tone and therefore cannot
        // close anything — a "cadence" onto Dm7→G in G mixolydian just sounds
        // like two more chords. Every tradition that uses these modes raises
        // that third at the cadence; harmonic minor exists for precisely this
        // reason. An uppercase V here is a request for the functioning
        // dominant, and the chord resolver honours it.
        const fifth = analysis.degrees.find(d => d.interval === 7);
        const domRoman = (fifth && !fifth.minor && !fifth.diminished) ? fifth.roman : 'V';

        switch (kind) {
            case 'authentic':  return { pre: domRoman, last: tonic.roman, label: 'perfect authentic' };
            case 'plagal':     return { pre: pre.roman, last: tonic.roman, label: 'plagal' };
            case 'deceptive': {
                const sub = candidates(analysis, 'T').find(d => d.interval === 9 || d.interval === 8)
                    || candidates(analysis, 'T')[1] || tonic;
                return { pre: domRoman, last: sub.roman, label: 'deceptive' };
            }
            case 'half':
            default:           return { pre: pre.roman, last: domRoman, label: 'half' };
        }
    }

    /**
     * Generate `bars` of functional harmony ending in `cadence`.
     *
     * The walk is a state machine over T → PD → D → T. Interior bars can
     * prolong a function (T–iii–vi is still tonic; ii–IV is still predominant),
     * which is what gives a progression internal shape without wandering.
     */
    function progression(analysis, { bars, cadence = 'half', rng, colour = 0.4, startOnTonic = true,
                                     allowedDegrees = null }) {
        // Restrict the walk to the degrees the complexity gate permits, by
        // scale-degree NUMBER (1-based), matching how the progression catalog
        // is filtered. Without this the walk was the one path that could smuggle
        // ♭III and ♭VII into a "primary triads only" setting.
        if (Array.isArray(allowedDegrees) && allowedDegrees.length) {
            const kept = analysis.degrees.filter(d => allowedDegrees.includes(d.degree));
            if (kept.length >= 2) analysis = { ...analysis, degrees: kept };
        }
        const out = [];
        const cad = cadenceRomans(analysis, cadence, rng);
        const cadenceBars = bars >= 2 ? 2 : 1;
        const bodyBars = Math.max(0, bars - cadenceBars);

        let fn = startOnTonic ? 'T' : (rng() < 0.5 ? 'PD' : 'T');
        let prevRoman = null;

        for (let i = 0; i < bodyBars; i++) {
            // The FIRST bar has one job: establish the key. A substitute there
            // ("iii" opening a piece in C) leaves the ear with nothing to hear
            // the rest of the progression against.
            const pick = (i === 0 && startOnTonic)
                ? analysis.degrees[0]
                : pickFor(analysis, fn, { avoid: prevRoman, rng, strength: 0.7 - colour * 0.3 });
            out.push(pick.roman);
            prevRoman = pick.roman;

            // Advance the function. Prolonging is allowed but never twice in a
            // row, which is what stopped the old templates from stalling on
            // repeated chords.
            const r = rng();
            if (fn === 'T') fn = r < 0.55 ? 'PD' : (r < 0.8 ? 'T' : 'D');
            else if (fn === 'PD') fn = r < 0.6 ? 'D' : 'PD';
            else fn = r < 0.75 ? 'T' : 'PD';
        }

        if (cadenceBars === 2) out.push(cad.pre);
        out.push(cad.last);
        return { romans: out.slice(0, bars), cadence: cad.label };
    }

    /**
     * Related keys a section can move to, nearest first.
     * Modulation is only convincing between keys that share most of their
     * notes, so this is deliberately a short list.
     */
    function relatedKeys(mt, key, analysis) {
        const tonicPc = pcOf(mt, key);
        const at = (semis) => CHROMATIC[((tonicPc + semis) % 12 + 12) % 12];
        const minor = analysis && analysis.tonicIsMinor;
        return [
            { key: at(7), scale: analysis.scaleName, relation: 'dominant', distance: 1 },
            { key: at(5), scale: analysis.scaleName, relation: 'subdominant', distance: 1 },
            minor
                ? { key: at(3), scale: 'major', relation: 'relative major', distance: 1 }
                : { key: at(9), scale: 'aeolian', relation: 'relative minor', distance: 1 },
            minor
                ? { key: at(0), scale: 'major', relation: 'parallel major', distance: 2 }
                : { key: at(0), scale: 'aeolian', relation: 'parallel minor', distance: 2 }
        ];
    }

    /**
     * A pivot chord: one that is diatonic in BOTH keys. Modulating through a
     * shared chord is what makes the move sound intentional instead of like an
     * edit — the ear only learns the key changed after it already has.
     */
    function findPivot(mt, fromAnalysis, toAnalysis) {
        if (!fromAnalysis || !toAnalysis) return null;
        const toRoots = new Map();
        toAnalysis.degrees.forEach(d => toRoots.set(pcOf(mt, d.root) + '|' + d.chordType, d));
        for (const d of fromAnalysis.degrees) {
            const hit = toRoots.get(pcOf(mt, d.root) + '|' + d.chordType);
            // A predominant in the new key is the most useful pivot: it can be
            // followed straight away by that key's dominant.
            if (hit && hit.functions.PD) return { from: d, to: hit };
        }
        for (const d of fromAnalysis.degrees) {
            const hit = toRoots.get(pcOf(mt, d.root) + '|' + d.chordType);
            if (hit) return { from: d, to: hit };
        }
        return null;
    }

    const api = {
        analyzeScale, isFunctional, notationCost, progression, cadenceRomans,
        candidates, pickFor, relatedKeys, findPivot, qualityOf,
        romanForDegree, degreeInfo, cadenceTargetDegree,
        FUNCTION_BY_INTERVAL, ROMAN_BY_INTERVAL
    };
    if (typeof window !== 'undefined') window.FunctionalHarmony = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
