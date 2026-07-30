/**
 * harmony-complexity.js
 *
 * ONE dial that decides how much harmonic machinery is switched on.
 *
 * The generator accumulated a lot of independent devices — borrowed chords,
 * approach runs, secondary dominants, modulation, chromatic mediants, planing,
 * subversions — and each decided for itself whether to fire. The result was
 * that even at a low "colour" setting a piece could still modulate twice, land
 * a chromatic mediant and end on a deceptive cadence, because none of those
 * were reading the same control. There was no setting that produced a plain
 * I–IV–V–I, which is the first thing anyone wants when they are trying to LEARN
 * what these progressions are.
 *
 * So the devices are put in a ladder, in roughly the order a student meets
 * them, and the dial is a cutoff. At 0 you get primary triads and nothing else.
 * Each step up unlocks exactly one new idea, so the difference it makes is
 * audible and attributable — which is the whole point of a teaching tool. At
 * the top everything is available, which is where the generator used to sit
 * permanently.
 *
 * Levels are thresholds, not probabilities: below the threshold a device is
 * OFF, not merely rarer. "Rarely modulates" is not something a learner can
 * hear as a rule.
 */

(function () {
    'use strict';

    /**
     * The ladder. `at` is the dial position where the device switches on.
     * Order matters far more than the exact numbers.
     */
    const LADDER = [
        { key: 'primaryTriads',     at: 0.00, name: 'Primary triads (I, IV, V)',
          teaches: 'The three chords that define a key.' },
        { key: 'fullDiatonic',      at: 0.12, name: 'All seven diatonic chords',
          teaches: 'ii, iii and vi — the rest of the key, and the standard progressions built from them.' },
        { key: 'seventhChords',     at: 0.24, name: 'Seventh chords',
          teaches: 'Adding the seventh: maj7, m7, dominant 7.' },
        { key: 'inversions',        at: 0.32, name: 'Inversions and bass lines',
          teaches: 'The same chords with a different note in the bass.' },
        { key: 'secondaryDominants',at: 0.42, name: 'Secondary dominants (V/V, V/vi)',
          teaches: 'Borrowing a dominant from another key to point at one of your own chords.' },
        { key: 'borrowedChords',    at: 0.52, name: 'Borrowed chords / modal interchange',
          teaches: 'Taking a chord from the parallel mode — iv in major, ♭VI, ♭VII.' },
        { key: 'approachChords',    at: 0.62, name: 'Approach chords',
          teaches: 'Chromatic and scale-borrowed runs that walk INTO a target chord.' },
        { key: 'modulation',        at: 0.72, name: 'Modulation',
          teaches: 'Changing key through a pivot chord shared by both.' },
        { key: 'chromaticMediants', at: 0.82, name: 'Chromatic mediants',
          teaches: 'A root a third away with a quality the key does not contain.' },
        { key: 'sequences',         at: 0.88, name: 'Planing and interval sequences',
          teaches: 'One shape moved repeatedly by a fixed interval.' },
        { key: 'subversions',       at: 0.94, name: 'Subverted expectations',
          teaches: 'Deceptive and evaded cadences, interruptions, modal flips.' }
    ];

    // Which progression families are appropriate at each stage. The catalog is
    // filtered rather than reweighted, so a low setting genuinely cannot
    // produce anything but the textbook shapes.
    const FAMILY_GATES = [
        { at: 0.00, families: ['primary', 'cadential'] },
        { at: 0.12, families: ['primary', 'cadential', 'turnaround', 'axis'] },
        { at: 0.32, families: ['primary', 'cadential', 'turnaround', 'axis', 'linear', 'blues'] },
        { at: 0.52, families: ['primary', 'cadential', 'turnaround', 'axis', 'linear', 'blues', 'mediant', 'modal'] },
        { at: 0.72, families: null }   // null = everything, including cycles
    ];

    // Which scale degrees may be used as structural chords.
    const DEGREE_GATES = [
        { at: 0.00, degrees: [1, 4, 5] },
        { at: 0.12, degrees: [1, 2, 3, 4, 5, 6] },
        { at: 0.24, degrees: [1, 2, 3, 4, 5, 6, 7] }
    ];

    function pick(gates, level, field) {
        let out = gates[0][field];
        for (const g of gates) if (level >= g.at) out = g[field];
        return out;
    }

    /**
     * @param {number} level 0..1
     * @returns {Object} what is switched on, plus material for the UI to explain it
     */
    function gate(level) {
        const L = Math.max(0, Math.min(1, Number(level)));
        const allow = {};
        LADDER.forEach(step => { allow[step.key] = L >= step.at; });

        // Everything above the current setting, so the UI can say what the next
        // notch would add — the most useful thing a teaching control can show.
        const unlocked = LADDER.filter(s => L >= s.at);
        const next = LADDER.find(s => L < s.at) || null;

        return {
            level: L,
            allow,
            degrees: pick(DEGREE_GATES, L, 'degrees'),
            families: pick(FAMILY_GATES, L, 'families'),
            unlocked,
            next,
            label: (unlocked[unlocked.length - 1] || LADDER[0]).name,
            // Scalars the generators use for "how much", once a device is on at
            // all. Kept separate from the on/off gates so that switching a
            // device on does not immediately max it out.
            intensity: next
                ? Math.max(0, Math.min(1, (L - unlocked[unlocked.length - 1].at) / Math.max(0.01, next.at - unlocked[unlocked.length - 1].at)))
                : 1,
            // Melody follows harmony: plain settings get chord tones and steps,
            // not chromatic decoration.
            melodyChromaticism: L < 0.42 ? 0 : Math.min(1, (L - 0.42) / 0.5),
            seventhChords: L >= 0.24
        };
    }

    /** Human-readable summary of what a setting will and will not do. */
    function describe(level) {
        const g = gate(level);
        const on = g.unlocked.map(s => s.name);
        return {
            level: g.level,
            headline: g.label,
            enabled: on,
            next: g.next ? `Next: ${g.next.name} — ${g.next.teaches}` : 'Everything is switched on.',
            teaches: g.unlocked.map(s => `${s.name}: ${s.teaches}`)
        };
    }

    const api = { LADDER, gate, describe };
    if (typeof window !== 'undefined') window.HarmonyComplexity = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
