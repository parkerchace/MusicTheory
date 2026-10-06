/**
 * scale-colour.js
 *
 * HOW FAR IS THIS COLLECTION FROM THE ONE WE ARE IN?
 *
 * Two features need to choose a scale out of the 1300+ library and both were
 * choosing it with an ad-hoc number: the approach search priced its results by
 * `overlapOf` and then ranked by familiarity anyway, and the excursion planner
 * scored `shared * 2 - foreign`. Both of those quietly answer "which candidate
 * is the MILDEST", which is a preference, not a measurement — and it is the
 * wrong preference about half the time, because a two-note darkening at the end
 * of a piece is chosen precisely for being further away, not for being close.
 *
 * So: measure the distance honestly, and let the caller aim at a distance.
 *
 * COUNTING SHARED NOTES DOES NOT WORK ACROSS DIFFERENT SIZES.
 *
 * The obvious metric — how many notes do the two collections share — misranks
 * the moment the candidates stop being the same size, and the library is full
 * of 5-, 6- and 8-note collections:
 *
 *   home = 7 notes
 *   a pentatonic living entirely INSIDE home     shares 5  (adds nothing)
 *   a 7-note collection one note away from home  shares 6  (adds one new note)
 *
 * By raw count the pentatonic looks further away, and it is not — it is not
 * away at all. It has no note you were not already playing. What it does is
 * withdraw two, which is a real change of colour but a different KIND of change
 * from introducing one.
 *
 * So distance is built from the two directions separately:
 *
 *   foreign = notes the candidate ADDS     (in candidate, not in home)
 *   missing = notes the candidate WITHDRAWS (in home, not in candidate)
 *
 * and each is normalised by the collection it is a fraction OF. `foreign` is
 * divided by the candidate size because you only ever play notes from the
 * candidate — it answers "of the notes I am about to play, how many are new".
 * `missing` is divided by the home size — "how much of what I was playing has
 * gone". Adding notes is weighted the heavier of the two because a new note is
 * heard the instant it sounds, whereas a withdrawn one is only heard by its
 * absence, over time.
 */
(function (root) {
    'use strict';

    // Adding a note is the louder event; withdrawing one is heard by absence.
    const W_FOREIGN = 0.75;
    const W_MISSING = 0.25;

    // THE NAMES A PLAYER ACTUALLY REACHES FOR.
    //
    // The dataset's own `essential` flag covers ~346 of its 1368 collections
    // and `base` covers nearly all of them, so as a tie-break between equally
    // distant candidates they barely discriminate: asked for a collection two
    // notes from C major, fourteen qualify at exactly that distance and the
    // winner was whichever the object-key order happened to put first, which
    // is how `chromatic_hypodorian` came to outrank `dorian`. Earlier entries
    // win. Everything not listed falls back to the dataset's own flags.
    const FAMILIAR = [
        'major', 'minor', 'aeolian', 'dorian', 'mixolydian', 'lydian', 'phrygian', 'locrian',
        'harmonic_minor', 'melodic_minor', 'harmonic_major',
        'mixolydian_6', 'mixolydian_b6', 'lydian_dominant', 'phrygian_dominant',
        'altered', 'superlocrian', 'whole_tone', 'octatonic',
        'hungarian_minor', 'double_harmonic_major',
        'blues', 'major_pentatonic', 'minor_pentatonic'
    ];
    const FAMILIAR_RANK = new Map(FAMILIAR.map((id, i) => [id, i]));

    /**
     * Lower is more familiar. The named collections come first in the order
     * above; past them the dataset's own flags decide, well behind any name a
     * player would recognise.
     */
    function familiarityOf(scaleId, opts = {}) {
        const id = String(scaleId || '');
        if (FAMILIAR_RANK.has(id)) return FAMILIAR_RANK.get(id);
        const { essential, base } = opts;
        const isIn = (set) => set && (typeof set.has === 'function' ? set.has(id) : !!set[id]);
        return 1000 + (isIn(essential) ? 0 : (isIn(base) ? 1 : 2));
    }

    /** 12-bit pitch-class mask from anything that looks like a set of pcs. */
    function maskOf(pcs) {
        let m = 0;
        if (typeof pcs === 'number') return pcs & 0xFFF;
        (pcs || []).forEach((p) => {
            const v = Number(p);
            if (Number.isFinite(v)) m |= 1 << (((v % 12) + 12) % 12);
        });
        return m;
    }

    function popcount(m) {
        let c = 0;
        while (m) { m &= m - 1; c++; }
        return c;
    }

    /**
     * The full reading of one candidate against home.
     *
     * `distance` is the headline 0..1 number the colour dial aims at. The
     * component counts are returned alongside it because they are what an
     * explanation is written from — "two notes darker" is a sentence a player
     * understands and "distance 0.29" is not.
     */
    function measure(homePcs, candPcs) {
        const home = maskOf(homePcs);
        const cand = maskOf(candPcs);
        const homeSize = popcount(home);
        const candSize = popcount(cand);
        if (!homeSize || !candSize) {
            return {
                shared: 0, foreign: candSize, missing: homeSize,
                homeSize, candSize, sizeDelta: candSize - homeSize,
                distance: 1, jaccard: 0, containment: 0,
                subset: false, superset: false, identical: false,
                usableFor: candSize >= 7 ? 'both' : 'melody'
            };
        }

        const sharedMask = home & cand;
        const shared = popcount(sharedMask);
        const foreign = candSize - shared;   // candidate adds these
        const missing = homeSize - shared;   // candidate withdraws these
        const union = popcount(home | cand);

        const distance = Math.min(1, Math.max(0,
            W_FOREIGN * (foreign / candSize) + W_MISSING * (missing / homeSize)));

        return {
            shared, foreign, missing,
            homeSize, candSize,
            sizeDelta: candSize - homeSize,
            distance,
            // Reported but not used for ranking: symmetric similarity, useful
            // when something wants to compare two candidates to each OTHER.
            jaccard: shared / union,
            // How much of the SMALLER collection is inside the larger — the
            // number that says "this pentatonic is entirely within the key".
            containment: shared / Math.min(homeSize, candSize),
            // A collection that adds nothing is not a departure. It is a
            // narrowing of the one we are already in, and it should be
            // described that way rather than announced as a borrow.
            subset: foreign === 0 && missing > 0,
            superset: missing === 0 && foreign > 0,
            identical: foreign === 0 && missing === 0,
            // STACKED THIRDS STOP DESCRIBING REAL CHORDS BELOW SEVEN NOTES.
            // Every other degree of a pentatonic names things no player would
            // read off a chart, so small collections are melodic material only.
            // They are genuinely good at that — a five-note run through an
            // approach is gapped and leapy in a way a scale run is not — so
            // they are kept and labelled rather than filtered out.
            usableFor: candSize >= 7 ? 'both' : 'melody'
        };
    }

    /**
     * A short phrase naming what the distance IS, for explanations.
     * Deliberately about notes, since that is what a player can check.
     */
    function describe(m) {
        if (!m) return '';
        if (m.identical) return 'the same seven notes, renamed';
        if (m.subset) {
            return `inside the key already — ${m.missing} note${m.missing === 1 ? '' : 's'} withheld, none added`;
        }
        const add = `${m.foreign} new note${m.foreign === 1 ? '' : 's'}`;
        if (m.superset) return `the key plus ${add}`;
        return `${add}, ${m.missing} withdrawn`;
    }

    /**
     * AIM AT A DISTANCE; DO NOT FILTER BY IT.
     *
     * A dial that filters returns nothing at its extremes, which is how a
     * control teaches the user it is broken. This one picks a target out of the
     * distances that ACTUALLY EXIST in the candidate list — the colour is a
     * quantile, not an absolute — so every position on the dial returns a full
     * ranked list, and the two ends are the mildest and wildest things really
     * available rather than two empty sets.
     *
     * @param {Array}    candidates
     * @param {Object}   opts
     * @param {number}   opts.colour   0 = closest to home, 1 = furthest
     * @param {Function} opts.pcsOf    candidate -> pitch classes (or mask)
     * @param {number[]} opts.homePcs  the collection we are in
     * @param {Function} [opts.rankOf] candidate -> familiarity rank, lower = more familiar
     * @param {string}   [opts.usableFor] 'chords' to drop collections too small to harmonise
     * @returns {Array} candidates, each with `.colour` = its measurement, best first
     */
    function rank(candidates, opts = {}) {
        const { colour = 0.5, pcsOf, homePcs, rankOf, usableFor } = opts;
        const list = (candidates || []).filter(Boolean);
        if (!list.length) return [];

        const measured = [];
        for (const c of list) {
            const m = measure(homePcs, pcsOf ? pcsOf(c) : c);
            // A collection identical to home is not a colour, it is the key.
            if (m.identical) continue;
            if (usableFor === 'chords' && m.usableFor === 'melody') continue;
            measured.push({ item: c, m });
        }
        if (!measured.length) return [];

        // THE QUANTILE IS OVER DISTINCT DISTANCES, NOT OVER CANDIDATES.
        //
        // Distances come in clumps — against a seven-note home almost every
        // seven-note collection lands on one of about five values, and the
        // clumps are wildly different sizes. Taking the colour-th candidate
        // therefore spent most of the dial's travel inside whichever clump was
        // biggest: 0.5 and 0.75 both landed on the same value and the control
        // felt broken through its whole middle. Stepping through the distinct
        // values instead makes every position a real change, and makes the
        // dial mean the thing a player would expect it to mean — one note
        // away, two notes away, three.
        const distinct = Array.from(new Set(measured.map(x => x.m.distance)))
            .sort((a, b) => a - b);
        const idx = Math.round(Math.max(0, Math.min(1, colour)) * (distinct.length - 1));
        const target = distinct[idx];

        const fam = (x) => {
            const r = rankOf ? Number(rankOf(x.item)) : 0;
            return Number.isFinite(r) ? r : 0;
        };
        measured.sort((a, b) => {
            const da = Math.abs(a.m.distance - target);
            const db = Math.abs(b.m.distance - target);
            if (Math.abs(da - db) > 1e-9) return da - db;
            // Same distance from the target: the more familiar NAME wins, so a
            // collection the player can look up beats an equally-apt obscurity.
            const fa = fam(a), fb = fam(b);
            if (fa !== fb) return fa - fb;
            // Then the smaller move, so ties do not drift outward.
            return a.m.distance - b.m.distance;
        });

        return measured.map(x => {
            const out = x.item;
            // Non-destructive when the caller handed us plain objects it owns.
            return (out && typeof out === 'object')
                ? Object.assign(Object.create(Object.getPrototypeOf(out) || Object.prototype), out, { colour: x.m })
                : { value: out, colour: x.m };
        });
    }

    const ScaleColour = { measure, describe, rank, maskOf, popcount,
        familiarityOf, FAMILIAR, W_FOREIGN, W_MISSING };

    if (typeof module !== 'undefined' && module.exports) module.exports = ScaleColour;
    if (root) root.ScaleColour = ScaleColour;
})(typeof window !== 'undefined' ? window : this);
