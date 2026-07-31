/**
 * form-planner.js  (v2 — dramatic form)
 *
 * Decides HOW LONG a generated piece is, WHAT SHAPE it takes, WHERE it goes
 * tonally, and WHERE it breaks its own rules.
 *
 * v1 of this file named sections and let sections sharing a letter share a
 * progression. That is bookkeeping, not form. A piece is heard as having a
 * shape because of things v1 had no representation for at all:
 *
 *   A TONAL PLAN.        Sonata form is not "ABA with a middle bit" — it is a
 *                        piece that leaves the tonic for the dominant, spends
 *                        its development refusing to settle anywhere, and then
 *                        brings the SECOND theme back in the home key. That
 *                        last event is the whole point of the form, and no
 *                        amount of section labelling produces it.
 *
 *   THEMES, NOT LETTERS. Material has to be transposable. The second subject
 *                        appearing a fifth up in the exposition and at home in
 *                        the recapitulation is the same theme twice, and the
 *                        listener has to be able to hear that.
 *
 *   FORESHADOWING.       A modulation is prepared by its own accidentals
 *                        arriving early — the raised fourth creeping in a bar
 *                        or two before the music actually turns toward the
 *                        dominant. Chromaticism that arrives WITH the key
 *                        change is an edit; chromaticism that arrives before it
 *                        is a promise.
 *
 *   EXPECTATION.         A pattern stated twice creates an expectation, and the
 *                        third statement is where it can be broken. Deceptive
 *                        cadences, evaded cadences, interruptions and modal
 *                        flips are only meaningful against something the piece
 *                        has already established, so the planner records what
 *                        was established and schedules where to break it.
 *
 *   PROPORTION.          The golden section (~0.618) is where a climax reads as
 *                        placed rather than as wherever the music happened to
 *                        get loud. Sonata form arrives at its recapitulation
 *                        near there by construction, which is not a coincidence.
 */

(function () {
    'use strict';

    /**
     * A seeded stream whose FIRST value is usable.
     *
     * A plain LCG's first output is a near-linear function of its seed, and the
     * form is chosen on the first call — so consecutive seeds swept a narrow
     * band of that range instead of covering it. Measured over 400 seeds and
     * five text lengths, the picker reached 17 of 33 forms, and inside each
     * pool the early entries were starved while the late ones took most of the
     * draws: `period` 18 against `barForm` 142 in the same pool, `sonata` 84
     * against `mototPerpetuo` 378 in another. That is not a weighting anyone
     * chose; it is the seed showing through.
     *
     * Mixing the seed first (an xorshift-style avalanche) and then discarding a
     * few outputs costs nothing and makes the first draw as good as the tenth.
     */
    function rngFrom(seed) {
        let s = ((Number(seed) || 0) ^ 0x6d2b79f5) >>> 0;
        // Avalanche the seed so nearby seeds start far apart.
        s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) >>> 0;
        s = Math.imul(s ^ (s >>> 12), 0x297a2d39) >>> 0;
        s = (s ^ (s >>> 15)) >>> 0;
        const next = () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
        // …and let the state settle before anyone reads it.
        next(); next(); next();
        return next;
    }

    const CLIMAX_POINT = 0.618;

    // Key relations, as semitones from the home tonic plus how the relation
    // should be spelled. `mode` null means "keep the home mode".
    const KEY_RELATIONS = {
        I:        { semitones: 0,  mode: null,      label: 'tonic' },
        V:        { semitones: 7,  mode: null,      label: 'dominant' },
        IV:       { semitones: 5,  mode: null,      label: 'subdominant' },
        vi:       { semitones: 9,  mode: 'minor',   label: 'relative minor' },
        III:      { semitones: 3,  mode: 'major',   label: 'relative major' },
        i:        { semitones: 0,  mode: 'minor',   label: 'parallel minor' },
        Imaj:     { semitones: 0,  mode: 'major',   label: 'parallel major' },
        // The flat submediant — the key a minor-mode piece reaches for when it
        // wants somewhere bright that is not the relative major, and the usual
        // home of a scherzo's trio.
        VI:       { semitones: 8,  mode: 'major',   label: 'flat submediant' },
        // The flat mediant: a third below the tonic, sharing no dominant with
        // it, which is why it reads as a genuine sidestep rather than a move.
        bIII:     { semitones: 3,  mode: 'major',   label: 'flat mediant' },
        ii:       { semitones: 2,  mode: 'minor',   label: 'supertonic' },
        unstable: { semitones: null, mode: null,    label: 'unsettled' }
    };

    /**
     * Section templates.
     *
     * `weight` is a relative bar count — sections are not all the same length,
     * and a transition being shorter than the theme it connects is part of what
     * makes it read as a transition.
     *
     * `theme` names the MATERIAL. Two sections with the same theme are the same
     * music; if their `key` differs, the second is that music transposed, which
     * is the single most important structural event in most tonal forms.
     *
     * `stability`: stable | transitional | developmental. Transitional sections
     * modulate; developmental ones refuse to stay anywhere.
     */
    const FORMS = {
        period: {
            name: 'AB (period)',
            description: 'A question phrase answered by a closing one.',
            climax: 0.7,
            sections: [
                { letter: 'A', theme: 'P', role: 'antecedent', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'P', role: 'consequent', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        ternary: {
            name: "ABA' (ternary)",
            description: 'A statement, a contrasting middle in another key, then the statement transformed.',
            climax: 0.62,
            sections: [
                { letter: 'A', theme: 'P', role: 'statement', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'departure', weight: 1, key: 'vi', stability: 'transitional', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'return', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        song: {
            name: 'AABA (song form)',
            description: 'The idea twice, a bridge away to another key, then home.',
            climax: 0.63,
            sections: [
                { letter: 'A', theme: 'P', role: 'statement', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'restatement', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'B', theme: 'S', role: 'bridge', weight: 1, key: 'IV', stability: 'transitional', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'final return', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        rondo: {
            name: 'ABACA (rondo)',
            description: 'A refrain that keeps returning, each time after somewhere new.',
            climax: 0.66,
            sections: [
                { letter: 'A', theme: 'P', role: 'refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'B', theme: 'S', role: 'first episode', weight: 1, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'C', theme: 'T', role: 'second episode', weight: 1.25, key: 'vi', stability: 'developmental', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'final refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        sonata: {
            name: 'Sonata form',
            description: 'Exposition (theme, transition, second theme in the dominant), development, '
                + 'recapitulation — where the second theme returns AT HOME. That resolution is the form.',
            climax: 0.618,
            sections: [
                // --- Exposition ---
                { letter: 'P', theme: 'P', role: 'first subject', weight: 1.1, key: 'I', stability: 'stable', cadence: 'half', group: 'exposition' },
                { letter: 'T', theme: 'T', role: 'transition', weight: 0.75, key: 'I', stability: 'transitional', cadence: 'half', group: 'exposition', modulatesTo: 'V' },
                { letter: 'S', theme: 'S', role: 'second subject', weight: 1.1, key: 'V', stability: 'stable', cadence: 'authentic', group: 'exposition' },
                { letter: 'K', theme: 'K', role: 'codetta', weight: 0.6, key: 'V', stability: 'stable', cadence: 'authentic', group: 'exposition' },
                // --- Development ---
                { letter: 'D', theme: 'P', role: 'development', weight: 1.5, key: 'unstable', stability: 'developmental', cadence: 'half', group: 'development', fragments: true },
                // --- Recapitulation ---
                { letter: 'P', theme: 'P', role: 'recapitulation', weight: 1.1, key: 'I', stability: 'stable', cadence: 'half', group: 'recapitulation' },
                { letter: 'S', theme: 'S', role: 'second subject at home', weight: 1.1, key: 'I', stability: 'stable', cadence: 'authentic', group: 'recapitulation', resolvesTension: true },
                { letter: 'K', theme: 'K', role: 'coda', weight: 0.7, key: 'I', stability: 'stable', cadence: 'authentic', group: 'recapitulation' }
            ]
        },
        arch: {
            name: "ABCBA (arch)",
            description: 'Symmetrical: the piece climbs to a centre and retraces its steps.',
            climax: 0.5,
            sections: [
                { letter: 'A', theme: 'P', role: 'statement', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'growth', weight: 1, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'C', theme: 'T', role: 'centre', weight: 1.2, key: 'vi', stability: 'developmental', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'descent', weight: 1, key: 'IV', stability: 'transitional', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'return', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        variations: {
            name: 'Theme and variations',
            description: 'One idea, restated with its surface progressively transformed.',
            climax: 0.75,
            sections: [
                { letter: 'A', theme: 'P', role: 'theme', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'variation 1', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'variation 2 (minore)', weight: 1, key: 'i', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'variation 3', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        through: {
            name: 'ABCD (through-composed)',
            description: 'No section returns; each grows out of the last.',
            climax: 0.7,
            sections: [
                { letter: 'A', theme: 'P', role: 'statement', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'growth', weight: 1, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'C', theme: 'T', role: 'departure', weight: 1, key: 'vi', stability: 'developmental', cadence: 'deceptive' },
                { letter: 'D', theme: 'K', role: 'arrival', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // =====================================================================
        // THE REST OF THE VOCABULARY
        //
        // Eight forms was not a vocabulary, it was a sample. What follows is the
        // organised set: every entry carries a `family`, so the catalogue can be
        // browsed by what a form DOES rather than scrolled as a flat list, and
        // every entry is a real form with a real reason to exist rather than a
        // permutation of letters. Where two forms differ only in one decision —
        // a rounded binary is a binary whose second half brings the first back —
        // that decision is what the entry is for.
        // =====================================================================

        // --- Phrase-level: how a single idea gets from opening to cadence ----
        sentence: {
            name: 'Sentence (Satz)',
            family: 'phrase',
            description: 'Idea, idea again, then a continuation that accelerates into the cadence. '
                + 'The opposite of the period: it does not answer itself, it builds.',
            climax: 0.8,
            sections: [
                { letter: 'a', theme: 'P', role: 'basic idea', weight: 0.5, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'a', theme: 'P', role: 'repetition', weight: 0.5, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'b', theme: 'P', role: 'continuation', weight: 0.6, key: 'I', stability: 'transitional', cadence: 'half', fragments: true },
                { letter: 'c', theme: 'P', role: 'cadential', weight: 0.4, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        doublePeriod: {
            name: 'Double period',
            family: 'phrase',
            description: 'Two periods, the first left open and the second closed — so the whole '
                + 'sixteen bars behave as one long question and answer.',
            climax: 0.75,
            sections: [
                { letter: 'A', theme: 'P', role: 'antecedent', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'consequent (open)', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'antecedent restated', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'C', theme: 'S', role: 'consequent (closed)', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // --- Binary: two halves, and what the second half does with the first -
        binary: {
            name: 'AB (simple binary)',
            family: 'binary',
            description: 'Two halves. The first leaves home, the second comes back — and the '
                + 'opening idea does NOT return, which is what separates it from rounded binary.',
            climax: 0.65,
            sections: [
                { letter: 'A', theme: 'P', role: 'first half', weight: 1, key: 'I', stability: 'stable', cadence: 'half', modulatesTo: 'V' },
                { letter: 'B', theme: 'S', role: 'second half', weight: 1.2, key: 'V', stability: 'transitional', cadence: 'authentic' }
            ]
        },
        roundedBinary: {
            name: "AB A' (rounded binary)",
            family: 'binary',
            description: 'Binary whose second half brings the opening back before closing. '
                + 'The ancestor of sonata form: the return is the whole point.',
            climax: 0.6,
            sections: [
                { letter: 'A', theme: 'P', role: 'first half', weight: 1, key: 'I', stability: 'stable', cadence: 'half', modulatesTo: 'V' },
                { letter: 'B', theme: 'S', role: 'digression', weight: 0.8, key: 'V', stability: 'developmental', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'rounded return', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        barForm: {
            name: 'AAB (bar form)',
            family: 'binary',
            description: 'Two Stollen and an Abgesang: say it, say it again, then say the thing '
                + 'the repetition was preparing. Medieval, and still how most choruses work.',
            climax: 0.8,
            sections: [
                { letter: 'A', theme: 'P', role: 'first Stollen', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'second Stollen', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'Abgesang', weight: 1.4, key: 'I', stability: 'transitional', cadence: 'authentic' }
            ]
        },
        reverseBar: {
            name: 'ABB (reverse bar)',
            family: 'binary',
            description: 'The statement comes once and the answer twice, so the weight of the '
                + 'form sits at the end rather than the beginning.',
            climax: 0.85,
            sections: [
                { letter: 'A', theme: 'P', role: 'statement', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'answer', weight: 1, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'answer confirmed', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // --- Song: forms built to carry words --------------------------------
        strophic: {
            name: 'AAAA (strophic)',
            family: 'song',
            description: 'The same music for every verse. Everything that changes is in the words '
                + 'and in the performance, which is why the texture return matters most here.',
            climax: 0.7,
            sections: [
                { letter: 'A', theme: 'P', role: 'verse 1', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'verse 2', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'verse 3', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        verseChorus: {
            name: 'Verse–chorus',
            family: 'song',
            description: 'The verse carries the story and the chorus is the thing you came for. '
                + 'The chorus returning unchanged is the form working, not the form repeating.',
            climax: 0.8,
            sections: [
                { letter: 'A', theme: 'P', role: 'verse 1', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'chorus', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'verse 2', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'chorus', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        verseChorusBridge: {
            name: 'Verse–chorus–bridge',
            family: 'song',
            description: 'The bridge exists to make the last chorus land differently, by leaving '
                + 'the key and the material for long enough that coming back is an event.',
            climax: 0.72,
            sections: [
                { letter: 'A', theme: 'P', role: 'verse 1', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'chorus', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'verse 2', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'chorus', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'C', theme: 'T', role: 'bridge', weight: 0.8, key: 'vi', stability: 'developmental', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'final chorus', weight: 1.2, key: 'I', stability: 'stable', cadence: 'authentic', resolvesTension: true }
            ]
        },
        blues12: {
            name: '12-bar blues',
            family: 'song',
            description: 'I–IV–I–V–I over twelve bars, three four-bar phrases: a statement, the '
                + 'statement again over the subdominant, and the response. The most-used form there is.',
            climax: 0.7,
            unitHint: 4,
            sections: [
                { letter: 'A', theme: 'P', role: 'statement', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'statement over IV', weight: 1, key: 'IV', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'response', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        refrainSong: {
            name: 'Strophic with refrain',
            family: 'song',
            description: 'Each verse ends with the same line. The refrain is not a chorus — it is '
                + 'the tail of the verse, which is why it does not get its own music.',
            climax: 0.75,
            sections: [
                { letter: 'A', theme: 'P', role: 'verse 1', weight: 1.2, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'r', theme: 'S', role: 'refrain', weight: 0.5, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'verse 2', weight: 1.2, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'r', theme: 'S', role: 'refrain', weight: 0.5, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // --- Rondo: a refrain and the episodes between its returns ------------
        rondo7: {
            name: 'ABACABA (seven-part rondo)',
            family: 'rondo',
            description: 'The refrain returns three times and the first episode returns once, so '
                + 'the second episode is the only thing you hear exactly once. That is where the piece lives.',
            climax: 0.55,
            sections: [
                { letter: 'A', theme: 'P', role: 'refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'B', theme: 'S', role: 'first episode', weight: 1, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'C', theme: 'T', role: 'central episode', weight: 1.3, key: 'vi', stability: 'developmental', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'B', theme: 'S', role: 'first episode at home', weight: 1, key: 'I', stability: 'stable', cadence: 'half', resolvesTension: true },
                { letter: 'A', theme: 'P', role: 'final refrain', weight: 1.1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        sonataRondo: {
            name: 'Sonata-rondo',
            family: 'rondo',
            description: 'A rondo whose central episode is a real development, and whose first '
                + 'episode comes back at home. Rondo on the surface, sonata underneath.',
            climax: 0.62,
            sections: [
                { letter: 'A', theme: 'P', role: 'refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic', group: 'exposition' },
                { letter: 'B', theme: 'S', role: 'episode', weight: 1, key: 'V', stability: 'transitional', cadence: 'authentic', group: 'exposition' },
                { letter: 'A', theme: 'P', role: 'refrain', weight: 0.8, key: 'I', stability: 'stable', cadence: 'authentic', group: 'exposition' },
                { letter: 'D', theme: 'P', role: 'development', weight: 1.4, key: 'unstable', stability: 'developmental', cadence: 'half', group: 'development', fragments: true },
                { letter: 'A', theme: 'P', role: 'refrain', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic', group: 'recapitulation' },
                { letter: 'B', theme: 'S', role: 'episode at home', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic', group: 'recapitulation', resolvesTension: true },
                { letter: 'A', theme: 'P', role: 'final refrain', weight: 1.1, key: 'I', stability: 'stable', cadence: 'authentic', group: 'recapitulation' }
            ]
        },

        // --- Developmental ----------------------------------------------------
        sonatina: {
            name: 'Sonatina (sonata without development)',
            family: 'developmental',
            description: 'Exposition and recapitulation with only a retransition between them. '
                + 'The second theme still comes home — the resolution without the argument.',
            climax: 0.6,
            sections: [
                { letter: 'P', theme: 'P', role: 'first subject', weight: 1, key: 'I', stability: 'stable', cadence: 'half', group: 'exposition' },
                { letter: 'S', theme: 'S', role: 'second subject', weight: 1, key: 'V', stability: 'stable', cadence: 'authentic', group: 'exposition' },
                { letter: 'R', theme: 'T', role: 'retransition', weight: 0.5, key: 'unstable', stability: 'transitional', cadence: 'half', group: 'development' },
                { letter: 'P', theme: 'P', role: 'recapitulation', weight: 1, key: 'I', stability: 'stable', cadence: 'half', group: 'recapitulation' },
                { letter: 'S', theme: 'S', role: 'second subject at home', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic', group: 'recapitulation', resolvesTension: true }
            ]
        },
        slowIntroSonata: {
            name: 'Slow introduction + sonata',
            family: 'developmental',
            description: 'An introduction in a different tempo and often a darker mode, whose job '
                + 'is to make the first subject sound like an arrival rather than a beginning.',
            climax: 0.65,
            sections: [
                { letter: 'I', theme: 'I', role: 'slow introduction', weight: 0.7, key: 'i', stability: 'transitional', cadence: 'half', group: 'introduction' },
                { letter: 'P', theme: 'P', role: 'first subject', weight: 1, key: 'I', stability: 'stable', cadence: 'half', group: 'exposition' },
                { letter: 'T', theme: 'T', role: 'transition', weight: 0.6, key: 'I', stability: 'transitional', cadence: 'half', group: 'exposition', modulatesTo: 'V' },
                { letter: 'S', theme: 'S', role: 'second subject', weight: 1, key: 'V', stability: 'stable', cadence: 'authentic', group: 'exposition' },
                { letter: 'D', theme: 'P', role: 'development', weight: 1.3, key: 'unstable', stability: 'developmental', cadence: 'half', group: 'development', fragments: true },
                { letter: 'P', theme: 'P', role: 'recapitulation', weight: 1, key: 'I', stability: 'stable', cadence: 'half', group: 'recapitulation' },
                { letter: 'S', theme: 'S', role: 'second subject at home', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic', group: 'recapitulation', resolvesTension: true }
            ]
        },
        fugalExposition: {
            name: 'Fugal exposition',
            family: 'developmental',
            description: 'The subject enters alone, is answered a fifth up, and enters again — '
                + 'each entry over what the previous voices are now doing. Texture as form.',
            climax: 0.8,
            sections: [
                { letter: 'S', theme: 'P', role: 'subject', weight: 0.8, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'answer (dominant)', weight: 0.8, key: 'V', stability: 'stable', cadence: 'half' },
                { letter: 'S', theme: 'P', role: 'third entry', weight: 0.8, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'E', theme: 'S', role: 'episode', weight: 0.8, key: 'unstable', stability: 'developmental', cadence: 'half', fragments: true },
                { letter: 'S', theme: 'P', role: 'final entry', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // --- Variation --------------------------------------------------------
        passacaglia: {
            name: 'Passacaglia (ground bass)',
            family: 'variation',
            description: 'A bass line repeated without change while everything above it is rebuilt '
                + 'each time. The one form where the accompaniment is the subject.',
            climax: 0.85,
            sections: [
                { letter: 'G', theme: 'P', role: 'ground stated', weight: 1, key: 'i', stability: 'stable', cadence: 'authentic' },
                { letter: 'G', theme: 'P', role: 'variation 1', weight: 1, key: 'i', stability: 'stable', cadence: 'authentic' },
                { letter: 'G', theme: 'P', role: 'variation 2', weight: 1, key: 'i', stability: 'stable', cadence: 'authentic' },
                { letter: 'G', theme: 'P', role: 'variation 3', weight: 1, key: 'i', stability: 'stable', cadence: 'authentic' },
                { letter: 'G', theme: 'P', role: 'final variation', weight: 1.2, key: 'i', stability: 'stable', cadence: 'authentic' }
            ]
        },
        doubleVariations: {
            name: 'Double variations',
            family: 'variation',
            description: 'Two themes, usually one major and one minor, varied in alternation. '
                + 'Each return of a theme is heard against what the other one just did.',
            climax: 0.8,
            sections: [
                { letter: 'A', theme: 'P', role: 'theme 1', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'B', theme: 'S', role: 'theme 2', weight: 1, key: 'i', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'theme 1 varied', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'B', theme: 'S', role: 'theme 2 varied', weight: 1, key: 'i', stability: 'stable', cadence: 'authentic' },
                { letter: 'A', theme: 'P', role: 'theme 1 final', weight: 1.2, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // --- Symmetrical and continuous ---------------------------------------
        palindrome: {
            name: 'ABCDCBA (palindrome)',
            family: 'symmetrical',
            description: 'An arch with one more layer: everything after the centre is the way in, '
                + 'reversed. Longer than the arch and correspondingly harder to hear as symmetry.',
            climax: 0.5,
            sections: [
                { letter: 'A', theme: 'P', role: 'outer', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'approach', weight: 0.9, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'C', theme: 'T', role: 'inner', weight: 0.9, key: 'vi', stability: 'transitional', cadence: 'half' },
                { letter: 'D', theme: 'K', role: 'centre', weight: 1.2, key: 'unstable', stability: 'developmental', cadence: 'half' },
                { letter: 'C', theme: 'T', role: 'inner returning', weight: 0.9, key: 'vi', stability: 'transitional', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'approach returning', weight: 0.9, key: 'IV', stability: 'transitional', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'outer returning', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        ritornello: {
            name: 'Ritornello',
            family: 'symmetrical',
            description: 'A tutti idea returns in a different key each time, with solo episodes '
                + 'between. Unlike a rondo, the refrain is not always at home — the tour is the form.',
            climax: 0.7,
            sections: [
                { letter: 'R', theme: 'P', role: 'ritornello', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'e', theme: 'S', role: 'episode', weight: 0.8, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'R', theme: 'P', role: 'ritornello in the dominant', weight: 0.7, key: 'V', stability: 'stable', cadence: 'authentic' },
                { letter: 'e', theme: 'S', role: 'episode', weight: 0.8, key: 'vi', stability: 'transitional', cadence: 'half' },
                { letter: 'R', theme: 'P', role: 'ritornello in the relative', weight: 0.7, key: 'vi', stability: 'stable', cadence: 'authentic' },
                { letter: 'e', theme: 'S', role: 'final episode', weight: 0.8, key: 'unstable', stability: 'developmental', cadence: 'half' },
                { letter: 'R', theme: 'P', role: 'ritornello at home', weight: 1, key: 'I', stability: 'stable', cadence: 'authentic', resolvesTension: true }
            ]
        },
        fantasia: {
            name: 'Fantasia',
            family: 'continuous',
            description: 'Sections that refuse to settle: each begins before the last has finished '
                + 'and none of them cadences properly until the end.',
            climax: 0.78,
            sections: [
                { letter: 'A', theme: 'P', role: 'opening gesture', weight: 0.8, key: 'I', stability: 'transitional', cadence: 'half' },
                { letter: 'B', theme: 'S', role: 'first flight', weight: 1, key: 'unstable', stability: 'developmental', cadence: 'half' },
                { letter: 'C', theme: 'T', role: 'recitative', weight: 0.7, key: 'vi', stability: 'developmental', cadence: 'deceptive' },
                { letter: 'D', theme: 'S', role: 'second flight', weight: 1, key: 'unstable', stability: 'developmental', cadence: 'half' },
                { letter: 'A', theme: 'P', role: 'gesture returning', weight: 0.9, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        mototPerpetuo: {
            name: 'Moto perpetuo',
            family: 'continuous',
            description: 'One unbroken motion from start to finish. The form is entirely in the '
                + 'harmony and the register, because nothing else ever stops to mark a division.',
            climax: 0.8,
            sections: [
                { letter: 'A', theme: 'P', role: 'launch', weight: 1, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'B', theme: 'P', role: 'climb', weight: 1, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'C', theme: 'P', role: 'far point', weight: 1, key: 'vi', stability: 'developmental', cadence: 'half' },
                { letter: 'D', theme: 'P', role: 'run home', weight: 1.2, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // --- Dance pairs: a form whose sections are themselves forms -----------
        minuetTrio: {
            name: 'Minuet and trio',
            family: 'dance',
            description: 'Two dances and a da capo. The trio is lighter and in a related key, and '
                + 'the minuet comes back unchanged — the earliest large-scale use of literal return.',
            climax: 0.45,
            sections: [
                { letter: 'M', theme: 'P', role: 'minuet', weight: 1.2, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'T', theme: 'S', role: 'trio', weight: 1.2, key: 'IV', stability: 'stable', cadence: 'authentic' },
                { letter: 'M', theme: 'P', role: 'minuet da capo', weight: 1.2, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },
        scherzoTrio: {
            name: 'Scherzo and trio',
            family: 'dance',
            description: 'The minuet at speed, where the joke is usually metrical — phrases that '
                + 'are the wrong length, or accents in the wrong place.',
            climax: 0.5,
            sections: [
                { letter: 'S', theme: 'P', role: 'scherzo', weight: 1.2, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'T', theme: 'S', role: 'trio', weight: 1, key: 'VI', stability: 'stable', cadence: 'authentic' },
                { letter: 'S', theme: 'P', role: 'scherzo da capo', weight: 1.2, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        },

        // --- Antiphonal -------------------------------------------------------
        callResponse: {
            name: 'Call and response',
            family: 'antiphonal',
            description: 'Every statement is answered by a different voice. The answer is not a '
                + 'repetition — it completes something the call deliberately left open.',
            climax: 0.75,
            sections: [
                { letter: 'c', theme: 'P', role: 'call', weight: 0.6, key: 'I', stability: 'stable', cadence: 'half' },
                { letter: 'r', theme: 'S', role: 'response', weight: 0.6, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'c', theme: 'P', role: 'call', weight: 0.6, key: 'IV', stability: 'stable', cadence: 'half' },
                { letter: 'r', theme: 'S', role: 'response', weight: 0.6, key: 'I', stability: 'stable', cadence: 'authentic' },
                { letter: 'c', theme: 'P', role: 'final call', weight: 0.6, key: 'V', stability: 'transitional', cadence: 'half' },
                { letter: 'r', theme: 'S', role: 'final response', weight: 0.9, key: 'I', stability: 'stable', cadence: 'authentic' }
            ]
        }
    };

    // Every form's family, so the catalogue is browsable by what a form DOES.
    // The eight originals predate the tagging and are named here rather than
    // being edited in place.
    const FORM_FAMILY_FALLBACK = {
        period: 'phrase', ternary: 'ternary', song: 'song', rondo: 'rondo',
        sonata: 'developmental', arch: 'symmetrical', variations: 'variation',
        through: 'continuous'
    };

    const FAMILY_LABELS = {
        phrase: 'Phrase forms',
        binary: 'Binary',
        ternary: 'Ternary',
        song: 'Song forms',
        rondo: 'Rondo',
        developmental: 'Developmental',
        variation: 'Variation',
        symmetrical: 'Symmetrical',
        continuous: 'Continuous',
        dance: 'Dance pairs',
        antiphonal: 'Antiphonal'
    };

    /** Which family a form belongs to. */
    function familyOf(key) {
        const f = FORMS[key];
        return (f && f.family) || FORM_FAMILY_FALLBACK[key] || 'other';
    }

    /**
     * The whole catalogue, grouped — for a menu, a docs page, or anything else
     * that wants to show what is available rather than make the choice itself.
     */
    function listForms() {
        const byFamily = {};
        Object.keys(FORMS).forEach((key) => {
            const fam = familyOf(key);
            (byFamily[fam] = byFamily[fam] || []).push({
                key,
                name: FORMS[key].name,
                description: FORMS[key].description,
                sectionCount: FORMS[key].sections.length,
                letters: FORMS[key].sections.map(s => s.letter).join(' ')
            });
        });
        return Object.keys(byFamily).sort().map(fam => ({
            family: fam,
            label: FAMILY_LABELS[fam] || fam,
            forms: byFamily[fam]
        }));
    }

    /**
     * Ways a piece can break its own pattern, and what each one needs in order
     * to land. None of these mean anything on their own — each requires the
     * expectation it violates to have been set up first, which is why they are
     * scheduled against `establishedBy` rather than sprinkled at random.
     */
    const SUBVERSIONS = {
        deceptive: {
            name: 'deceptive cadence',
            needs: 'a cadence the piece has already made land on the tonic',
            explain: 'The dominant resolves to ♭VI/vi instead of the tonic. It only reads as deceptive '
                + 'because the same approach has already resolved honestly earlier.'
        },
        evaded: {
            name: 'evaded cadence',
            needs: 'an established cadence pattern',
            explain: 'The cadence is abandoned before it arrives and the phrase restarts — the arrival '
                + 'the listener was counting bars toward simply does not happen.'
        },
        modalFlip: {
            name: 'modal flip',
            needs: 'an established mode',
            explain: 'The same material returns in the parallel mode. Nothing about the shape changes, '
                + 'only its light, which is why it registers as the same thing seen differently.'
        },
        interruption: {
            name: 'interruption',
            needs: 'momentum to interrupt',
            explain: 'The music stops on the dominant and begins again. The silence is the event.'
        },
        elision: {
            name: 'elided phrase',
            needs: 'a regular phrase length',
            explain: 'The cadence bar IS the next phrase\'s first bar, so the expected breath never '
                + 'happens and the music arrives a bar early.'
        },
        truncation: {
            name: 'truncated restatement',
            needs: 'a phrase length stated at least twice',
            explain: 'The restatement is cut short. The ear is still counting toward the old length, '
                + 'so the next section starts before it is ready.'
        }
    };

    function primeLabel(letter, occurrence) {
        return letter + "'".repeat(Math.max(0, occurrence));
    }

    /**
     * @returns {Object} form plan
     */
    function plan(opts = {}) {
        const rng = rngFrom(opts.seed);
        const words = Math.max(1, Number(opts.wordCount) || 1);
        const syllables = Math.max(words, Number(opts.syllableCount) || words);
        const energy = Math.max(0, Math.min(1, Number(opts.energy) || 0.5));
        const tension = Math.max(0, Math.min(1, Number(opts.tension) || 0.5));
        const tone = String(opts.tone || 'balanced').toLowerCase();
        const beatsPerBar = Math.max(2, Number(opts.beatsPerBar) || 4);
        const homeIsMinor = !!opts.homeIsMinor;

        const material = syllables + words * 0.6 + energy * 6;
        const override = (typeof window !== 'undefined' && window.__formOverride) || null;

        // Which form. Longer text earns a form with more moving parts; sonata
        // needs enough room for an exposition, a development AND a
        // recapitulation, so it is only offered when there are bars to spare.
        let formKey, unit;
        // A work NAMES its movements' forms, and that has to be binding — a
        // "sonata cycle" whose first movement is whatever the picker felt like
        // is not a sonata cycle. Takes precedence over the global override too,
        // because it is the more specific instruction.
        if (opts.__forceForm && FORMS[opts.__forceForm]) {
            formKey = opts.__forceForm;
            unit = FORMS[formKey].unitHint
                || (FORMS[formKey].sections.length >= 7 ? 3 : 4);
        } else if (override && override.form && FORMS[override.form]) {
            formKey = override.form;
            unit = Math.max(2, Math.min(8, Number(override.unitBars) || 4));
        } else {
            // WHICH FORM.
            //
            // A ladder of if/else over eight forms could only ever reach eight
            // forms, and adding to the catalogue without changing this would
            // have left most of it unreachable — a menu nobody can order from.
            //
            // So: a pool sized to the material (a form with seven sections
            // needs the bars to state them), weighted by what the words are
            // actually like. The weights are tendencies, not gates — every form
            // in a pool can come up, which is what keeps the catalogue live
            // rather than decorative.
            const pick = (pool) => {
                const total = pool.reduce((sum, p) => sum + p[1], 0);
                let r = rng() * total;
                for (const [key, w] of pool) { if ((r -= w) < 0) return key; }
                return pool[pool.length - 1][0];
            };

            // Energetic words want forms that move; still ones want forms that
            // dwell. Tense ones earn the developmental family, which is the
            // group whose whole subject is instability.
            const moving = energy;
            const dwelling = 1 - energy;
            const argues = tension;

            if (material <= 8) {
                formKey = pick([
                    ['period', 1.0],
                    ['sentence', 0.8 + moving * 0.5],
                    ['binary', 0.6],
                    ['barForm', 0.5 + moving * 0.3]
                ]);
                unit = 4;
            } else if (material <= 13) {
                formKey = pick([
                    ['ternary', 1.0],
                    ['roundedBinary', 0.8],
                    ['doublePeriod', 0.6 + dwelling * 0.4],
                    ['barForm', 0.6],
                    ['reverseBar', 0.4],
                    ['blues12', 0.5 + moving * 0.4],
                    ['callResponse', 0.5 + moving * 0.3]
                ]);
                unit = 4;
            } else if (material <= 20) {
                formKey = pick([
                    ['song', 1.0],
                    ['ternary', 0.7],
                    ['verseChorus', 0.9],
                    ['roundedBinary', 0.6],
                    ['strophic', 0.5 + dwelling * 0.5],
                    ['refrainSong', 0.5],
                    ['minuetTrio', 0.5 + dwelling * 0.4],
                    ['blues12', 0.4 + moving * 0.3]
                ]);
                unit = 4;
            } else if (material <= 30) {
                formKey = pick([
                    ['song', 0.8],
                    ['rondo', 0.9],
                    ['variations', 0.8 + dwelling * 0.3],
                    ['verseChorusBridge', 0.9],
                    ['sonatina', 0.7 + argues * 0.5],
                    ['minuetTrio', 0.6],
                    ['scherzoTrio', 0.5 + moving * 0.5],
                    ['doubleVariations', 0.5],
                    ['fugalExposition', 0.4 + argues * 0.4],
                    ['passacaglia', 0.5 + dwelling * 0.4]
                ]);
                unit = 4;
            } else {
                // The big forms — the ones that actually use the space.
                formKey = pick([
                    ['sonata', 1.0 + argues * 0.6],
                    ['rondo7', 0.8],
                    ['sonataRondo', 0.7 + argues * 0.3],
                    ['arch', 0.7],
                    ['palindrome', 0.5],
                    ['ritornello', 0.6],
                    ['slowIntroSonata', 0.6 + argues * 0.4],
                    ['through', 0.6],
                    ['fantasia', 0.5 + argues * 0.5],
                    ['mototPerpetuo', 0.4 + moving * 0.6],
                    ['doubleVariations', 0.5]
                ]);
                // Forms with many sections need a smaller unit or they overrun
                // the bar ceiling and get squashed by the rescale below.
                unit = FORMS[formKey].sections.length >= 7 ? 3 : 4;
            }
            if (FORMS[formKey] && FORMS[formKey].unitHint) unit = FORMS[formKey].unitHint;
        }

        const form = FORMS[formKey];
        const specs = form.sections;

        // Bar allocation from relative weights, so a transition is genuinely
        // shorter than the theme it connects.
        let bars = 0;
        const lengths = specs.map((sp) => {
            const n = Math.max(2, Math.round(unit * (sp.weight || 1)));
            bars += n;
            return n;
        });

        // LONGER / SHORTER.
        //
        // Applied to the section weights rather than to the total, so the form
        // keeps its proportions: a transition that is shorter than the theme it
        // connects stays shorter at every length. Scaling the total afterwards
        // would flatten those relationships the moment the rescale below had to
        // round anything.
        //
        // The floor of 2 bars per section is what stops "shorter" from
        // dissolving a seven-part rondo into fourteen bars of nothing — a form
        // has a minimum size below which it is no longer that form.
        const lenScale = Number.isFinite(opts.__scaleBars) && opts.__scaleBars > 0
            ? Math.max(0.4, Math.min(3, opts.__scaleBars)) : 1;
        if (lenScale !== 1) {
            bars = 0;
            for (let i = 0; i < lengths.length; i++) {
                lengths[i] = Math.max(2, Math.round(lengths[i] * lenScale));
                bars += lengths[i];
            }
        }

        // A work asking for length gets more room than a single take: the
        // ceiling exists to stop one piece sprawling, and a movement of a
        // four-movement work is not one piece.
        const MAX_BARS = Math.round(40 * Math.max(1, lenScale));
        if (bars > MAX_BARS) {
            const scale = MAX_BARS / bars;
            bars = 0;
            for (let i = 0; i < lengths.length; i++) {
                lengths[i] = Math.max(2, Math.round(lengths[i] * scale));
                bars += lengths[i];
            }
        }
        if (override && Number.isFinite(override.bars)) {
            const want = Math.max(4, Math.min(MAX_BARS, Math.round(override.bars)));
            const scale = want / bars;
            bars = 0;
            for (let i = 0; i < lengths.length; i++) {
                lengths[i] = Math.max(1, Math.round(lengths[i] * scale));
                bars += lengths[i];
            }
        }

        const climaxPoint = form.climax || CLIMAX_POINT;
        const climaxBar = Math.floor(bars * climaxPoint);

        // Build sections.
        const seenLetter = {};
        const seenTheme = {};
        const sections = [];
        let cursor = 0;

        specs.forEach((sp, i) => {
            const occurrence = seenLetter[sp.letter] || 0;
            seenLetter[sp.letter] = occurrence + 1;
            const themeOccurrence = seenTheme[sp.theme] || 0;
            seenTheme[sp.theme] = themeOccurrence + 1;

            const len = lengths[i];
            const isLast = i === specs.length - 1;
            const midpoint = (cursor + len / 2) / bars;
            const climaxProximity = 1 - Math.min(1, Math.abs(midpoint - climaxPoint) / 0.35);

            // The key this section lives in, resolved against the home mode.
            const rel = KEY_RELATIONS[sp.key] || KEY_RELATIONS.I;

            sections.push({
                index: i,
                letter: sp.letter,
                label: primeLabel(sp.letter, occurrence),
                theme: sp.theme,
                themeOccurrence,
                // The transposition question: is this theme returning in a
                // DIFFERENT key from the one it was stated in?
                variantOf: occurrence > 0 ? sp.letter : null,
                variation: occurrence,
                role: sp.role,
                group: sp.group || null,
                startBar: cursor,
                bars: len,
                endBar: cursor + len - 1,
                cadence: isLast ? (sp.cadence === 'half' ? 'authentic' : sp.cadence) : sp.cadence,
                isFinal: isLast,
                stability: sp.stability || 'stable',
                fragments: !!sp.fragments,
                resolvesTension: !!sp.resolvesTension,
                // Tonal plan
                keyRelation: sp.key,
                keyOffset: rel.semitones,
                keyMode: rel.mode,
                keyLabel: rel.label,
                modulatesTo: sp.modulatesTo || null,
                // Dramatic weighting
                climaxProximity,
                isClimax: cursor <= climaxBar && climaxBar <= cursor + len - 1,
                energyBias: (sp.stability === 'developmental' ? 0.2 : sp.stability === 'transitional' ? 0.1 : -0.04)
                    + climaxProximity * 0.2,
                tensionBias: (sp.stability === 'developmental' ? 0.25 : sp.stability === 'transitional' ? 0.12 : 0)
                    + climaxProximity * 0.12,
                approachBias: 0.55 + themeOccurrence * 0.22 + (isLast ? 0.2 : 0) + climaxProximity * 0.15,
                activityBias: (sp.stability === 'developmental' ? 0.15 : 0) + (isLast ? -0.1 : 0)
                    + climaxProximity * 0.1
            });
            cursor += len;
        });

        // --- Foreshadowing -------------------------------------------------
        // Where a section changes key, mark the bars BEFORE it so the harmony
        // and melody can let that key's accidentals arrive early.
        const foreshadow = [];
        for (let i = 1; i < sections.length; i++) {
            const prev = sections[i - 1];
            const here = sections[i];
            if (here.keyRelation === prev.keyRelation) continue;
            if (here.keyOffset === null) continue;   // developmental: nothing fixed to foreshadow
            const lead = Math.min(2, Math.max(1, Math.floor(prev.bars / 3)));
            foreshadow.push({
                targetSection: here.label,
                targetRelation: here.keyRelation,
                targetOffset: here.keyOffset,
                targetLabel: here.keyLabel,
                fromBar: Math.max(0, here.startBar - lead),
                toBar: here.startBar - 1,
                explain: `Foreshadowing the move to the ${here.keyLabel}: that key's accidentals arrive `
                    + `${lead} bar${lead === 1 ? '' : 's'} early, so the modulation is heard as promised `
                    + `rather than as an edit.`
            });
        }

        // --- Expectation and subversion -------------------------------------
        // A pattern needs to be stated before it can be broken. The planner
        // finds the first repeat of a theme (the point at which an expectation
        // exists) and schedules the break at the LAST return, where the piece
        // has the most to lose.
        const subversions = [];
        const themeCounts = {};
        sections.forEach(s => { themeCounts[s.theme] = (themeCounts[s.theme] || 0) + 1; });
        const repeatedTheme = Object.keys(themeCounts).find(t => themeCounts[t] >= 2);

        if (repeatedTheme && sections.length >= 3) {
            const returns = sections.filter(s => s.theme === repeatedTheme);
            // Established by the second statement; broken at the last one, or
            // at the section nearest the climax if that comes first.
            const established = returns[1];
            const candidates = sections.filter(s => s.startBar > established.endBar);
            const target = candidates.find(s => s.isClimax) || candidates[candidates.length - 1] || null;

            if (target) {
                const pool = target.isFinal
                    ? ['deceptive', 'modalFlip', 'elision']
                    : ['deceptive', 'evaded', 'interruption', 'truncation', 'modalFlip'];
                const kind = pool[Math.floor(rng() * pool.length)];
                const sv = SUBVERSIONS[kind];
                subversions.push({
                    kind,
                    name: sv.name,
                    section: target.label,
                    // The break lands at the section's cadence, which is where
                    // the expectation is strongest.
                    bar: target.endBar,
                    establishedBy: established.label,
                    establishedAtBar: established.endBar,
                    explain: `${sv.name} at bar ${target.endBar + 1}. ${sv.explain} `
                        + `The expectation was set by ${established.label} (bar ${established.endBar + 1}).`
                });
            }
        }

        const sectionOfBar = new Array(bars).fill(null);
        sections.forEach((s) => {
            for (let b = s.startBar; b <= s.endBar && b < bars; b++) sectionOfBar[b] = s;
        });

        return {
            formKey,
            name: form.name,
            description: form.description,
            bars,
            unitBars: unit,
            beatsPerBar,
            climaxPoint,
            climaxBar,
            sections,
            sectionOfBar,
            foreshadow,
            subversions,
            tonalPlan: sections.map(s => `${s.label}:${s.keyRelation}`).join(' → '),
            summary: sections.map(s => s.label).join(' ') + ` · ${bars} bars`
        };
    }

    // =========================================================================
    // WORKS — several movements that belong to each other.
    //
    // A form organises bars; a WORK organises forms. The difference is not
    // length, it is that the movements have to be about each other: a set of
    // four unrelated pieces played in a row is a playlist, not a work.
    //
    // Three things make it one:
    //
    //   CONTRAST     each movement is what the last one was not — in tempo, in
    //                mode, in density. Adjacent movements that feel the same
    //                make the second one sound like more of the first.
    //   KEY PLAN     movements sit in stated relationships to a home key and
    //                the last one comes back to it, so the set closes.
    //   CROSS-REFERENCE  a later movement takes material from an earlier one.
    //                This is the part that turns a suite into a work, and it is
    //                what the Moonlight Sonata does — the finale is not a new
    //                piece, it is the first movement's material at speed.
    //
    // `character` is what the movement is FOR, in the terms the generator
    // already speaks: energy, tension, and whether it is in the parallel minor.
    // `quotes` names an earlier movement whose theme returns here, and `how`
    // says what happens to it — the transformation is the reference.
    // =========================================================================
    const WORKS = {
        sonataCycle: {
            name: 'Sonata cycle (fast–slow–dance–fast)',
            family: 'classical',
            description: 'The standard four-movement plan. Argument, song, dance, resolution — '
                + 'and the finale settles what the first movement opened.',
            movements: [
                { title: 'I. Allegro', form: 'sonata', key: 'I', energy: 0.72, tension: 0.6, minor: false,
                  role: 'the argument' },
                { title: 'II. Adagio', form: 'ternary', key: 'IV', energy: 0.22, tension: 0.3, minor: false,
                  role: 'the song' },
                { title: 'III. Minuet and trio', form: 'minuetTrio', key: 'I', energy: 0.55, tension: 0.25, minor: false,
                  role: 'the dance' },
                { title: 'IV. Finale', form: 'sonataRondo', key: 'I', energy: 0.85, tension: 0.5, minor: false,
                  role: 'the resolution', quotes: 0, how: 'transformed' }
            ]
        },

        moonlight: {
            name: 'Slow–light–storm (Moonlight plan)',
            family: 'classical',
            description: 'A sustained slow movement first rather than last, a short light one to '
                + 'clear the air, and a finale that takes the opening material and drives it. '
                + 'The order is the idea: the weight is at both ends and the middle is the breath.',
            movements: [
                { title: 'I. Sostenuto', form: 'variations', key: 'I', energy: 0.18, tension: 0.45, minor: true,
                  role: 'the held opening' },
                { title: 'II. Allegretto', form: 'minuetTrio', key: 'III', energy: 0.5, tension: 0.2, minor: false,
                  role: 'the breath between' },
                { title: 'III. Presto agitato', form: 'sonata', key: 'I', energy: 0.95, tension: 0.85, minor: true,
                  role: 'the storm', quotes: 0, how: 'accelerated' }
            ]
        },

        lifeSuite: {
            name: 'Life (four movements through its parts)',
            family: 'suite',
            description: 'A work whose movements are states rather than tempos: the good, the '
                + 'hard, the dull, and the exciting — with the opening material returning at the '
                + 'end changed by everything between. After the plan Donny Hathaway described for '
                + 'his own four-movement concerto, which he said was simply about life.',
            movements: [
                { title: 'I. The good', form: 'verseChorus', key: 'I', energy: 0.6, tension: 0.2, minor: false,
                  role: 'ease, and plenty of it' },
                { title: 'II. The hard', form: 'passacaglia', key: 'i', energy: 0.4, tension: 0.85, minor: true,
                  role: 'the ground that will not move' },
                { title: 'III. The dull', form: 'mototPerpetuo', key: 'IV', energy: 0.35, tension: 0.35, minor: false,
                  role: 'motion without event' },
                { title: 'IV. The exciting', form: 'sonataRondo', key: 'I', energy: 0.95, tension: 0.6, minor: false,
                  role: 'everything at once', quotes: 0, how: 'transformed' }
            ]
        },

        arcOfFeeling: {
            name: 'Tension and calm (three movements)',
            family: 'suite',
            description: 'The shortest work that still behaves like one: unrest, stillness, and a '
                + 'resolution that could not have arrived without either.',
            movements: [
                { title: 'I. Unrest', form: 'fantasia', key: 'i', energy: 0.7, tension: 0.9, minor: true,
                  role: 'the question' },
                { title: 'II. Still', form: 'passacaglia', key: 'VI', energy: 0.15, tension: 0.25, minor: false,
                  role: 'the stillness' },
                { title: 'III. Settled', form: 'ternary', key: 'I', energy: 0.55, tension: 0.3, minor: false,
                  role: 'the answer', quotes: 0, how: 'at rest' }
            ]
        },

        songCycle: {
            name: 'Song cycle (five songs)',
            family: 'song',
            description: 'Five songs that share a home key and a returning refrain, so the set is '
                + 'heard as one telling rather than five.',
            movements: [
                { title: '1. Setting out', form: 'verseChorus', key: 'I', energy: 0.55, tension: 0.25, minor: false, role: 'the departure' },
                { title: '2. Far from home', form: 'strophic', key: 'vi', energy: 0.4, tension: 0.5, minor: true, role: 'the distance' },
                { title: '3. The turn', form: 'barForm', key: 'IV', energy: 0.65, tension: 0.65, minor: false, role: 'the turn' },
                { title: '4. Quiet', form: 'refrainSong', key: 'III', energy: 0.2, tension: 0.3, minor: false, role: 'the quiet' },
                { title: '5. Home', form: 'verseChorusBridge', key: 'I', energy: 0.7, tension: 0.3, minor: false,
                  role: 'the return', quotes: 0, how: 'at rest' }
            ]
        },

        baroqueSuite: {
            name: 'Dance suite',
            family: 'baroque',
            description: 'Dances in one key, distinguished by metre and gait rather than by key or '
                + 'theme. The unity is the key; the variety is entirely rhythmic.',
            movements: [
                { title: 'Prelude', form: 'mototPerpetuo', key: 'I', energy: 0.6, tension: 0.35, minor: false, role: 'the opening' },
                { title: 'Allemande', form: 'roundedBinary', key: 'I', energy: 0.45, tension: 0.3, minor: false, role: 'the walking dance' },
                { title: 'Sarabande', form: 'roundedBinary', key: 'i', energy: 0.2, tension: 0.4, minor: true, role: 'the slow dance' },
                { title: 'Gigue', form: 'fugalExposition', key: 'I', energy: 0.9, tension: 0.4, minor: false,
                  role: 'the fast dance', quotes: 1, how: 'transformed' }
            ]
        },

        concerto: {
            name: 'Concerto (fast–slow–fast)',
            family: 'classical',
            description: 'Three movements built on alternation — a group and a soloist, stated as '
                + 'ritornello and episode, then sung, then played out.',
            movements: [
                { title: 'I. Allegro', form: 'ritornello', key: 'I', energy: 0.75, tension: 0.5, minor: false, role: 'the contest' },
                { title: 'II. Largo', form: 'ternary', key: 'vi', energy: 0.2, tension: 0.35, minor: true, role: 'the song' },
                { title: 'III. Rondo', form: 'rondo7', key: 'I', energy: 0.9, tension: 0.4, minor: false,
                  role: 'the send-off', quotes: 0, how: 'transformed' }
            ]
        },

        diptych: {
            name: 'Diptych (two panels)',
            family: 'suite',
            description: 'Two movements that are the same thing said twice in opposite ways — the '
                + 'second is the first in the parallel mode, at a different speed.',
            movements: [
                { title: 'I.', form: 'ternary', key: 'I', energy: 0.3, tension: 0.3, minor: false, role: 'the statement' },
                { title: 'II.', form: 'ternary', key: 'i', energy: 0.8, tension: 0.7, minor: true,
                  role: 'the same, otherwise', quotes: 0, how: 'inverted' }
            ]
        }
    };

    const WORK_FAMILY_LABELS = {
        classical: 'Classical cycles',
        suite: 'Suites and cycles of feeling',
        song: 'Song cycles',
        baroque: 'Baroque suites'
    };

    /** The work catalogue, grouped, for a menu. */
    function listWorks() {
        const byFamily = {};
        Object.keys(WORKS).forEach((key) => {
            const w = WORKS[key];
            const fam = w.family || 'other';
            (byFamily[fam] = byFamily[fam] || []).push({
                key,
                name: w.name,
                description: w.description,
                movementCount: w.movements.length,
                movements: w.movements.map(m => m.title)
            });
        });
        return Object.keys(byFamily).sort().map(fam => ({
            family: fam,
            label: WORK_FAMILY_LABELS[fam] || fam,
            works: byFamily[fam]
        }));
    }

    /**
     * Plan a multi-movement work.
     *
     * Returns one form plan per movement, each already a complete plan of the
     * kind `plan()` produces, plus the things that make them a set: what each
     * movement is for, how its key stands to the home key, and which earlier
     * movement it takes material from.
     *
     * The choice of work is by material and character when not named. A short
     * text does not become a five-song cycle just because the button was
     * pressed — it becomes a diptych, which is the smallest thing that is still
     * a work.
     */
    function planWork(opts = {}) {
        const rng = rngFrom((opts.seed || 0) + 991);
        // How much longer or shorter than its natural length the whole work
        // should run. One work-level number rather than a per-movement one, so
        // "longer" lengthens the WORK and leaves its proportions alone — a
        // finale stays weightier than the dance before it.
        const lengthScale = Number.isFinite(opts.lengthScale) && opts.lengthScale > 0
            ? Math.max(0.4, Math.min(3, opts.lengthScale)) : 1;
        const energy = Math.max(0, Math.min(1, Number(opts.energy) || 0.5));
        const tension = Math.max(0, Math.min(1, Number(opts.tension) || 0.5));
        const words = Math.max(1, Number(opts.wordCount) || 1);
        const syllables = Math.max(words, Number(opts.syllableCount) || words);
        const material = syllables + words * 0.6 + energy * 6;

        let workKey = opts.work && WORKS[opts.work] ? opts.work : null;
        if (!workKey) {
            // Enough material to be worth several movements, or the set is all
            // fragments. Character decides which: a tense text earns the works
            // whose subject is unrest, a calm one the works that dwell.
            const pool = material <= 12
                ? [['diptych', 1.0], ['arcOfFeeling', 0.6]]
                : material <= 22
                ? [['arcOfFeeling', 1.0], ['diptych', 0.6], ['concerto', 0.7],
                   ['moonlight', 0.6 + tension * 0.5]]
                : [['lifeSuite', 1.0], ['sonataCycle', 0.9], ['moonlight', 0.8 + tension * 0.4],
                   ['songCycle', 0.7], ['baroqueSuite', 0.7], ['concerto', 0.8],
                   ['arcOfFeeling', 0.5]];
            const total = pool.reduce((s, p) => s + p[1], 0);
            let r = rng() * total;
            workKey = pool[pool.length - 1][0];
            for (const [k, w] of pool) { if ((r -= w) < 0) { workKey = k; break; } }
        }

        const work = WORKS[workKey];

        // Each movement gets its share of the material. A movement is a whole
        // piece, so it is planned by the same function with its own character —
        // which is what stops "movement" meaning "section with a title".
        const movements = work.movements.map((mv, i) => {
            const p = plan({
                seed: (opts.seed || 0) + i * 7919,
                wordCount: words,
                syllableCount: Math.max(4, Math.round(syllables / Math.max(1, work.movements.length * 0.6))),
                energy: mv.energy,
                tension: mv.tension,
                tone: opts.tone,
                beatsPerBar: opts.beatsPerBar,
                homeIsMinor: !!mv.minor,
                // The movement's form is named by the work, so the work's plan
                // is what it says it is rather than a suggestion the picker can
                // ignore.
                __forceForm: mv.form,
                __scaleBars: lengthScale
            });

            const rel = KEY_RELATIONS[mv.key] || KEY_RELATIONS.I;
            return {
                index: i,
                title: mv.title,
                role: mv.role,
                form: p,
                keyRelation: mv.key,
                keyOffset: rel.semitones,
                keyLabel: rel.label,
                mode: mv.minor ? 'minor' : 'major',
                energy: mv.energy,
                tension: mv.tension,
                quotes: Number.isFinite(mv.quotes) ? mv.quotes : null,
                quoteHow: mv.how || null,
                explain: (() => {
                    let s = `${mv.title} — ${mv.role}. ${p.name}`;
                    if (mv.key !== 'I') s += `, in the ${rel.label}`;
                    if (mv.minor) s += ', in the minor';
                    if (Number.isFinite(mv.quotes)) {
                        const from = work.movements[mv.quotes];
                        s += `. Takes its material from ${from ? from.title : 'the opening'}`
                          + `, ${mv.how || 'transformed'} — which is what makes these movements one work `
                          + 'rather than several pieces in a row.';
                    } else {
                        s += '.';
                    }
                    return s;
                })()
            };
        });

        return {
            workKey,
            lengthScale,
            name: work.name,
            description: work.description,
            family: work.family,
            movements,
            totalBars: movements.reduce((n, m) => n + m.form.bars, 0),
            summary: `${work.name} · ${movements.length} movements · `
                + movements.reduce((n, m) => n + m.form.bars, 0) + ' bars',
            crossReferences: movements
                .filter(m => Number.isFinite(m.quotes))
                .map(m => ({ from: m.quotes, to: m.index, how: m.quoteHow }))
        };
    }

    const api = { plan, planWork, FORMS, WORKS, SUBVERSIONS, KEY_RELATIONS, CLIMAX_POINT,
                  listForms, listWorks, familyOf, FAMILY_LABELS };
    if (typeof window !== 'undefined') window.FormPlanner = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
