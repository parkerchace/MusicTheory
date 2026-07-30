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

    function rngFrom(seed) {
        let s = ((Number(seed) || 0) ^ 0x6d2b79f5) >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
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
        }
    };

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
        if (override && override.form && FORMS[override.form]) {
            formKey = override.form;
            unit = Math.max(2, Math.min(8, Number(override.unitBars) || 4));
        } else if (material <= 8) {
            formKey = 'period'; unit = 4;
        } else if (material <= 13) {
            formKey = 'ternary'; unit = 4;
        } else if (material <= 20) {
            formKey = rng() < 0.5 ? 'song' : 'ternary'; unit = 4;
        } else if (material <= 30) {
            const r = rng();
            formKey = r < 0.4 ? 'song' : r < 0.7 ? 'rondo' : 'variations';
            unit = 4;
        } else {
            // The big forms. Sonata is the default at this length because it is
            // the one that actually uses the space.
            const r = rng();
            formKey = r < 0.45 ? 'sonata'
                : r < 0.65 ? 'rondo'
                : r < 0.8 ? 'arch'
                : 'through';
            unit = formKey === 'sonata' ? 3 : 4;
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

        const MAX_BARS = 40;
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

    const api = { plan, FORMS, SUBVERSIONS, KEY_RELATIONS, CLIMAX_POINT };
    if (typeof window !== 'undefined') window.FormPlanner = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
