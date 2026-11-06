/**
 * Shared scale taxonomy utilities for build scripts and browser loaders.
 * Updated for 4-level pedagogical hierarchy (Family > Category > Subcategory > Sub-subcategory).
 */
(function(root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
    } else {
        root.ScaleTaxonomy = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';

    const CORE_CHURCH_MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

    const FAMILY_ORDER = [
        'Western Diatonic (Church Modes)',
        'Hybrid Major-Minor Systems',
        'Western Modal Extensions',
        'Jazz & Bebop Foundations',
        'Jazz: Altered & Fusion Tension',
        'Blues Roots & Blue-Notes',
        'Pentatonic Universe (Global)',
        'Indian Classical: Hindustani (Thaat)',
        'Indian Classical: Carnatic (Melakarta)',
        'Middle Eastern: Arabic Maqamat',
        'Middle Eastern: Turkish & Greek Makam',
        'Middle Eastern: Persian Dastgah',
        'Spanish, Flamenco & Andalusian',
        'East Asian: Japanese Traditions',
        'East Asian: Chinese Traditions',
        'African Heritage & Qenet',
        'South & Central American Traditions',
        'Balkan, Slavic & Nordic Folk',
        'Southeast Asian (Gamelan/Pelog)',
        'Theoretical: Symmetric & Messiaen',
        'Theoretical: Mathematical & Set Theory',
        'Foundations: 3-Note Trichords',
        'Foundations: 4-Note Tetrachords',
        'Systematic Variations (-ic Family)',
        'Experimental & Neo-Theoretical'
    ];

    /**
     * Calculates "Distance from Major" (Complexity Score).
     * Compares intervals to standard Major [0,2,4,5,7,9,11].
     */
    function getDistanceFromMajor(intervals) {
        if (!Array.isArray(intervals) || intervals.length === 0) return 999;
        const major = [0, 2, 4, 5, 7, 9, 11];
        let score = 0;
        intervals.slice(0, 7).forEach((note, i) => {
            if (major[i] !== undefined) score += Math.abs(note - major[i]);
            else score += 2;
        });
        score += Math.abs(intervals.length - 7) * 5;
        return score;
    }

    /**
     * Calculates "Distance from Minor" (Sadness Baseline).
     * Compares intervals to standard Natural Minor [0,2,3,5,7,8,10].
     */
    function getDistanceFromMinor(intervals) {
        if (!Array.isArray(intervals) || intervals.length === 0) return 999;
        const minor = [0, 2, 3, 5, 7, 8, 10];
        let score = 0;
        intervals.slice(0, 7).forEach((note, i) => {
            if (minor[i] !== undefined) score += Math.abs(note - minor[i]);
            else score += 2;
        });
        score += Math.abs(intervals.length - 7) * 5;
        return score;
    }

    /**
     * Maps raw intervals to their "Harmonic Physics" property.
     * This defines the 'Force' applied to the major/minor baseline.
     * The prose that used to sit beside each one ("Ethereal lift, otherworldly,
     * longing") described how a degree is supposed to feel, which is not
     * something this file can know about anyone's music.
     */
    const PHYSICS_MAP = {
        1: { attr: 'Compression' },  // b2
        3: { attr: 'Melancholy' },   // b3
        4: { attr: 'Stability' },    // M3
        6: { attr: 'Expansion' },    // #4
        8: { attr: 'Shadow' },       // b6
        10: { attr: 'Release' },     // b7
        11: { attr: 'Pull' }         // M7
    };

    /**
     * Bhatkhande's ten thaats, each of which is one exact set of notes.
     */
    const THAATS = {
        '0,2,4,5,7,9,11': 'Bilawal',
        '0,2,4,6,7,9,11': 'Kalyan',
        '0,2,4,5,7,9,10': 'Khamaj',
        '0,1,4,5,7,8,11': 'Bhairav',
        '0,1,4,6,7,8,11': 'Poorvi',
        '0,1,4,6,7,9,11': 'Marwa',
        '0,2,3,5,7,9,10': 'Kafi',
        '0,2,3,5,7,8,10': 'Asavari',
        '0,1,3,5,7,8,10': 'Bhairavi',
        '0,1,3,6,7,8,11': 'Todi'
    };

    const bitsFrom = (iv) => iv.reduce((m, i) => m | (1 << i), 0);
    const rot = (n, k) => ((n >> k) | (n << (12 - k))) & 0xFFF;
    // the smallest rotation stands for a scale and all its modes
    function canonical(n) { let best = n; for (let k = 1; k < 12; k++) best = Math.min(best, rot(n, k)); return best; }
    function modeCount(n) { const seen = new Set(); for (let k = 0; k < 12; k++) seen.add(rot(n, k)); return seen.size; }
    function brightness(iv) { return iv.reduce((a, b) => a + b, 0); }   // Lydian sums highest, Locrian lowest
    function stepsOf(iv) { return iv.map((v, i) => (i + 1 < iv.length ? iv[i + 1] : iv[0] + 12) - v); }
    const DIATONIC = canonical(bitsFrom([0, 2, 4, 5, 7, 9, 11]));
    const MAJOR_PENT = canonical(bitsFrom([0, 2, 4, 7, 9]));
    const MAJOR_BITS = bitsFrom([0, 2, 4, 5, 7, 9, 11]);
    const MINOR_BITS = bitsFrom([0, 2, 3, 5, 7, 8, 10]);
    const HYBRID_PARENTS = {
        'Harmonic Minor': canonical(bitsFrom([0, 2, 3, 5, 7, 8, 11])),
        'Melodic Minor': canonical(bitsFrom([0, 2, 3, 5, 7, 9, 11])),
        'Harmonic Major': canonical(bitsFrom([0, 2, 4, 5, 7, 8, 11])),
        'Double Harmonic': canonical(bitsFrom([0, 1, 4, 5, 7, 8, 11])),
        'Neapolitan Major': canonical(bitsFrom([0, 1, 3, 5, 7, 9, 11])),
        'Neapolitan Minor': canonical(bitsFrom([0, 1, 3, 5, 7, 8, 11])),
        'Hungarian Major': canonical(bitsFrom([0, 3, 4, 6, 7, 9, 10]))
    };
    const JAZZ_PARENTS = {
        'Major': DIATONIC,
        'Melodic Minor': HYBRID_PARENTS['Melodic Minor'],
        'Harmonic Minor': HYBRID_PARENTS['Harmonic Minor'],
        'Harmonic Major': HYBRID_PARENTS['Harmonic Major']
    };
    const SYMMETRIC = [[0, 2, 4, 6, 8, 10], [0, 2, 3, 5, 6, 8, 9, 11], [0, 3, 4, 7, 8, 11]].map(iv => canonical(bitsFrom(iv)));
    // degree names: what a note is called when it joins or leaves Major / natural minor
    const MAJOR_DEGREES = { 0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7' };
    const MAJOR_ADDED = { 1: '♭2', 3: '♭3', 6: '♯4', 8: '♭6', 10: '♭7' };
    const MINOR_DEGREES = { 0: '1', 2: '2', 3: '♭3', 5: '4', 7: '5', 8: '♭6', 10: '♭7' };
    const MINOR_ADDED = { 1: '♭2', 4: '3', 6: '♯4', 9: '6', 11: '7' };
    // how a scale differs from a reference: notes added, removed, or swapped one for one
    function relationTo(bits, ref, degrees, addedNames) {
        const added = [], removed = [];
        for (let k = 0; k < 12; k++) {
            if ((bits >> k & 1) && !(ref >> k & 1)) added.push(k);
            if ((ref >> k & 1) && !(bits >> k & 1)) removed.push(k);
        }
        if (!added.length && !removed.length) return null;
        const addedText = added.map(k => addedNames[k] || degrees[k] || String(k));
        const removedText = removed.map(k => degrees[k] || addedNames[k] || String(k));
        if (added.length === removed.length) {
            return { kind: 'changed', n: added.length, total: added.length * 2, added: addedText, removed: removedText,
                     text: removedText.map((r, i) => r + ' → ' + addedText[i]).join(', ') };
        }
        if (!added.length) return { kind: 'removed', n: removed.length, total: removed.length, added: [], removed: removedText, text: 'without ' + removedText.join(', ') };
        if (!removed.length) return { kind: 'added', n: added.length, total: added.length, added: addedText, removed: [], text: 'adds ' + addedText.join(', ') };
        return { kind: 'mixed', n: added.length + removed.length, total: added.length + removed.length, added: addedText, removed: removedText,
                 text: 'adds ' + addedText.join(', ') + ', without ' + removedText.join(', ') };
    }
    const THAAT_ORDER = ['Bilawal', 'Kalyan', 'Khamaj', 'Bhairav', 'Poorvi', 'Marwa', 'Kafi', 'Asavari', 'Bhairavi', 'Todi'];
    const CHAKRAS = ['Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu', 'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya'];
    const MELA_NAMES = {};   // filled while the catalogue builds, so janya groups can show "22 Kharaharapriya"
    function melaName(scale) {
        if (scale.melaName) return scale.melaName;
        const a = (scale.aliases || []).find(x => Array.isArray(x) && x[1] === 'carnatic' && /^mela\s/i.test(x[0]));
        return a ? a[0].replace(/^mela\s+/i, '') : String(scale.name).replace(/^(rāga|raga|raag)\s+/i, '');
    }

    // Lowercased, with marks gone: "Rāga Bhūpāḷam" compares as "raga bhupalam".
    function foldName(text) {
        return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    // What search compares: marks gone, b/♭ and #/♯ the same, spaces and punctuation gone, so
    // "mixolydian b6", "Mixolydian ♭6" and "mixolydian-b6" all meet.
    function searchKey(text) {
        return foldName(text)
            .replace(/♭/g, 'b').replace(/♯/g, '#').replace(/♮/g, 'n').replace(/𝄫/g, 'bb').replace(/𝄪/g, '##')
            .replace(/\b(raag|raga|rag)\b/g, '')           // "Raag Bhimpalasi" and "raga bhimpalasi" meet
            .replace(/ee/g, 'i').replace(/oo/g, 'u').replace(/aa/g, 'a')   // Bheempalasi / Bhimpalasi
            .replace(/[^a-z0-9#]+/g, '');
    }

    /**
     * Maps a scale to its taxonomic paths based on lineage and tradition.
     * The 100x 'Global Heritage' Engine.
     */
    function deriveTaxonomiesForScale(scale) {
        if (!scale) return [];
        const results = [];
        const id = (scale.id || "").toLowerCase();
        const display = foldName(scale.name);
        const allNames = [display].concat((scale.aliases || []).map(a => foldName(Array.isArray(a) ? a[0] : a)));
        const anyNameMatch = (test) => allNames.some(test);
        const anyName = (re) => allNames.some(n => re.test(n));
        const tags = scale.tags || [];
        
        let intervals = scale.intervals || [];
        if (typeof intervals === 'string') {
            try { intervals = JSON.parse(intervals.replace(/'/g, '"')); } catch(e) { intervals = []; }
        }
        if (!Array.isArray(intervals)) intervals = [];
        const noteCount = scale.noteCount || intervals.length || 0;

        function addPath(fam, cat, sub, ss, isPrimary = false, extra = null) {
            const row = {
                family: fam,
                category: cat || "General",
                subcategory: sub || "",
                subSubcategory: ss || "",
                isPrimary: !!isPrimary,
                tags: tags
            };
            if (extra) {
                if (extra.label) row.label = extra.label;      // the name this family knows the scale by
                if (extra.note) row.note = extra.note;         // "usually placed under Kafi"
                if (extra.mark) row.mark = extra.mark;         // ≈ approximation, ? unconfirmed
                if (typeof extra.order === 'number') row.order = extra.order;
                if (extra.raga) row.raga = extra.raga;
            }
            results.push(row);
        }

        // --- 1. FAMILIES ---
        // A family is earned by what a scale is or by a name a tradition gives it, never by an
        // interval pattern alone. Each family is broken down the way its own tradition breaks it
        // down: modes of a parent, Melakarta chakras, thaats, maqam families by first jins.
        const kinds = new Set([scale.kind].concat((scale.aliases || []).map(a => Array.isArray(a) ? a[1] : 'other')));
        const aliases = (scale.aliases || []).filter(a => Array.isArray(a));
        const ragas = Array.isArray(scale.ragas) ? scale.ragas : [];
        const bitsOf = intervals.reduce((m, i) => m | (1 << i), 0);
        const canon = canonical(bitsOf);
        const bright = brightness(intervals);
        const isSevenNote = noteCount === 7;
        // the first name of a given kind, skipping outsiders' labels and anything that says Gypsy
        const nameOf = (kind) => {
            const hit = aliases.find(a => a[1] === kind && !/gypsy|gipsy/i.test(a[0]));
            if (hit) return { text: hit[0], mark: hit[2] === 'u' ? '?' : '' };
            return scale.kind === kind ? { text: scale.name, mark: '' } : null;
        };
        // Rows sort bright to dark, with the names a learner knows first: hand-listed scales, then any
        // sourced name, then invented ones. A list of one parent's modes keeps pure brightness order.
        const fame = scale.wellKnown ? 0 : (scale.kind === 'invented' || scale.kind === 'systematic' || scale.kind === 'other') ? 2 : 1;
        const leaf = (extra) => Object.assign({ order: (extra && extra.modes ? 0 : fame * 1000) + (500 - bright) }, extra || {});

        // A. WESTERN DIATONIC: the seven modes of the major scale, bright to dark
        if (CORE_CHURCH_MODES.includes(id) || id === 'major') {
            addPath('Western Diatonic (Church Modes)', "Core 7-Note Modes", "", "", true, leaf({ modes: true }));
        }

        // B. HYBRID MAJOR-MINOR: the common seven-note parents and their modes
        Object.keys(HYBRID_PARENTS).forEach(parent => {
            if (canon === HYBRID_PARENTS[parent]) addPath('Hybrid Major-Minor Systems', parent + " and its modes", "", "", true, leaf({ modes: true }));
        });
        const inDiatonic = canon === DIATONIC;

        // C. WESTERN MODAL EXTENSIONS: everything close to Major that is not already a named family.
        // Grouped by what changed, which is how theory books name these ("Major ♭6").
        if (!inDiatonic) {
            const rel = relationTo(bitsOf, MAJOR_BITS, MAJOR_DEGREES, MAJOR_ADDED);
            if (rel && rel.kind === 'changed' && rel.n <= 3) {
                const cat = rel.n === 1 ? "Major with 1 note changed" : `Major with ${rel.n} notes changed`;
                addPath('Western Modal Extensions', cat, "adds " + rel.added.join(' and '), "", true, leaf({ note: rel.text }));
            } else if (rel && rel.kind === 'removed' && rel.n === 1) {
                addPath('Western Modal Extensions', "Major with 1 note removed (6 notes)", "", "", true, leaf({ note: rel.text }));
            } else if (rel && rel.kind === 'added' && rel.n === 1) {
                addPath('Western Modal Extensions', "Major with 1 note added (8 notes)", "", "", true, leaf({ note: rel.text }));
            }
        }

        // D. JAZZ & BEBOP: the four parent scales jazz teaching uses, bebop scales, symmetric scales
        Object.keys(JAZZ_PARENTS).forEach(parent => {
            if (canon === JAZZ_PARENTS[parent]) addPath('Jazz & Bebop Foundations', "The four parent scales", parent + " modes", "", false, leaf({ modes: true }));
        });
        const isBebop = anyName(/\bbebop\b/);
        if (isBebop) addPath('Jazz & Bebop Foundations', noteCount === 8 ? "Bebop scales" : "Other bebop scales", "", "", true, leaf());
        if (SYMMETRIC.includes(canon)) addPath('Jazz & Bebop Foundations', "Symmetric scales", "", "", false, leaf());
        if (/\b(altered|dominant)\b/.test(display) && !isBebop) {
            addPath('Jazz: Altered & Fusion Tension', "Upper Structure Dissonance", "", "", true, leaf());
        }

        // E. BLUES: only scales a name calls blues ("Second Blues Scale Mode II" is a rotation, not a blues scale)
        const hasBluesRoots = anyNameMatch(n => /\bblues\b/.test(n) && !/\bmode\b/.test(n));
        if (hasBluesRoots) {
            const cat = /major/.test(display) ? "Major blues" : noteCount <= 6 ? "Minor blues (5–6 notes)" : noteCount === 7 ? "7-note blues" : "8–9 note blues";
            addPath('Blues Roots & Blue-Notes', cat, "", "", true, leaf());
        }

        // F. PENTATONIC: every five-note scale, split by whether it has half steps
        if (noteCount === 5) {
            const steps = stepsOf(intervals);
            const hemitonic = steps.includes(1);
            const cat = hemitonic ? "With half steps" : "No half steps";
            const leap = Math.max.apply(null, steps);
            const sub = canon === MAJOR_PENT ? "Major pentatonic and its modes"
                : (hemitonic && kinds.has('japanese')) ? "Japanese named scales"
                : hemitonic ? (leap <= 3 ? "biggest leap a minor third" : leap === 4 ? "biggest leap a major third" : "biggest leap a fourth or wider")
                : "";
            const jp = hemitonic && kinds.has('japanese') ? nameOf('japanese') : null;
            addPath('Pentatonic Universe (Global)', cat, sub, "", true, leaf(jp && jp.text !== scale.name ? { label: jp.text, mark: jp.mark } : {}));
        } else if (/\bpentatonic\b/.test(display)) {
            addPath('Pentatonic Universe (Global)', "Named pentatonic, other sizes", "", "", true, leaf());
        }

        // G. HINDUSTANI: the ten thaats are defined sets; ragas attach by the thaat sources place them in
        const thaat = THAATS[intervals.join(',')];
        if (thaat) addPath('Indian Classical: Hindustani (Thaat)', "The 10 thaats", "", "", true, { label: thaat + " thaat", order: THAAT_ORDER.indexOf(thaat) });
        ragas.filter(r => r.s === 'h').forEach(r => {
            const sub = r.p ? r.p : "Thaat not given by sources";
            const note = (r.p ? "usually placed under " + r.p : "") + (r.alt && r.alt.length ? " (or " + r.alt.join(', ') + ")" : '');
            addPath('Indian Classical: Hindustani (Thaat)', "Ragas by thaat", sub, "", true, { label: r.n, note, order: 0, mark: r.u ? '?' : '', raga: r });
        });
        if (!ragas.some(r => r.s === 'h') && kinds.has('hindustani')) {
            const nm = nameOf('hindustani');
            if (nm) addPath('Indian Classical: Hindustani (Thaat)', "Other Hindustani names", "", "", true, { label: nm.text, mark: nm.mark || '?', note: 'listed by name only' });
        }

        // H. CARNATIC: the 72 Melakarta in their 12 chakras, then janya ragas by parent
        if (typeof scale.melakarta === 'number') {
            const m = scale.melakarta;
            addPath('Indian Classical: Carnatic (Melakarta)', "The 72 Melakarta", CHAKRAS[Math.floor((m - 1) / 6)] + " chakra (" + (Math.floor((m - 1) / 6) * 6 + 1) + "–" + (Math.floor((m - 1) / 6) * 6 + 6) + ")", "", true,
                { label: m + " " + melaName(scale), order: m });
        }
        ragas.filter(r => r.s === 'c').forEach(r => {
            const sub = typeof r.p === 'number' ? r.p + " " + (MELA_NAMES[r.p] || '') : "Parent not given by sources";
            const note = (typeof r.p === 'number' ? "usually placed under " + r.p : "") + (r.alt && r.alt.length ? " (or " + r.alt.join(', ') + ")" : '');
            addPath('Indian Classical: Carnatic (Melakarta)', "Janya ragas by parent", sub, "", true, { label: r.n, note, order: typeof r.p === 'number' ? r.p : 99, mark: r.u ? '?' : '', raga: r });
        });
        if (!ragas.some(r => r.s === 'c') && typeof scale.melakarta !== 'number' && kinds.has('carnatic')) {
            const nm = nameOf('carnatic');
            if (nm) addPath('Indian Classical: Carnatic (Melakarta)', "Other Carnatic names", "", "", true, { label: nm.text, mark: nm.mark || '?', note: 'listed by name only' });
        }

        // I. MIDDLE EAST: maqam families by first jins; every twelve-note reading is an approximation
        aliases.filter(a => a[1] === 'arabic').forEach(a => {
            const fam = (scale.maqam || {})[a[0]];
            addPath('Middle Eastern: Arabic Maqamat', fam ? fam.replace(/\s*family$/i, '') + " family" : "Other maqam names", "", "", true, { label: a[0], mark: '≈', order: 0 });
        });
        ['turkish', 'greek', 'azerbaijani'].forEach(k => {
            const title = { turkish: "Turkish makam", greek: "Greek dromoi", azerbaijani: "Azerbaijani mugham" }[k];
            aliases.filter(a => a[1] === k).forEach(a => addPath('Middle Eastern: Turkish & Greek Makam', title, "", "", true, { label: a[0], mark: a[2] === 'u' ? '?' : '≈', order: 0 }));
        });
        aliases.filter(a => a[1] === 'persian').forEach(a => addPath('Middle Eastern: Persian Dastgah', "Dastgah and avaz names", "", "", true, { label: a[0], mark: '?', note: 'a dastgah is more than a set of notes', order: 0 }));

        // J. SPANISH, FLAMENCO & ANDALUSIAN
        const spanishName = aliases.find(a => /spanish|flamenco|andalusian/i.test(a[0]) && a[1] !== 'outsider') || (/spanish|flamenco|andalusian/.test(display) ? [scale.name, scale.kind] : null);
        if (spanishName || id === 'phrygian_dominant' || kinds.has('spanish')) {
            addPath('Spanish, Flamenco & Andalusian', "Andalusian Cadence Systems", "", "", true, leaf(spanishName && spanishName[0] !== scale.name ? { label: spanishName[0] } : {}));
        }

        // K. EAST & SOUTHEAST ASIA
        if (kinds.has('japanese')) {
            const nm = nameOf('japanese');
            addPath('East Asian: Japanese Traditions', noteCount === 5 ? "Pentatonic (in / yō family)" : "Other named scales", "", "", true, leaf(nm && nm.text !== scale.name ? { label: nm.text, mark: nm.mark } : {}));
        }
        if (kinds.has('chinese')) {
            const nm = nameOf('chinese');
            const modes = /\b(gong|shang|jue|chih|zhi|yu|kung)\b/.test(foldName(nm ? nm.text : ''));
            addPath('East Asian: Chinese Traditions', modes && canon === MAJOR_PENT ? "The five pentatonic modes" : "Other named scales", "", "", true, leaf(nm && nm.text !== scale.name ? { label: nm.text, mark: nm.mark } : {}));
        }
        if (kinds.has('seasian') || kinds.has('korean')) {
            const nm = nameOf('seasian') || nameOf('korean');
            addPath('Southeast Asian (Gamelan/Pelog)', "Regional names (twelve-note approximations)", "", "", true, leaf(nm && nm.text !== scale.name ? { label: nm.text, mark: '≈' } : { mark: '≈' }));
        }

        // L. AFRICA: the Ethiopian qenet are a defined set of four; other African names stay by name
        const qenet = aliases.map(a => a[0]).concat([scale.name]).find(t => /tezeta|tizita|\bbati\b|ambassel|anchihoy/i.test(t));
        if (qenet) {
            const which = /tezeta|tizita/i.test(qenet) ? 'Tizita' : /bati/i.test(qenet) ? 'Bati' : /ambassel/i.test(qenet) ? 'Ambassel' : 'Anchihoye';
            addPath('African Heritage & Qenet', "Ethiopian qenet", which, "", true, leaf(qenet !== scale.name ? { label: qenet } : {}));
        } else if (kinds.has('ethiopian') || kinds.has('african')) {
            const nm = nameOf('ethiopian') || nameOf('african');
            addPath('African Heritage & Qenet', "Other African names", "", "", true, leaf(nm && nm.text !== scale.name ? { label: nm.text, mark: nm.mark } : {}));
        }

        // M. EUROPEAN FOLK (the Americas family stays hidden until a source exists for any of its names)
        const folk = aliases.find(a => /hungarian|romanian|ukrainian|bulgarian|balkan|slavic|nordic|scandinavian|celtic|irish|scottish|russian|istrian/i.test(a[0]) && a[1] !== 'outsider' && !/gypsy|gipsy/i.test(a[0]))
            || (/hungarian|romanian|ukrainian|bulgarian|balkan|slavic|nordic|scandinavian|celtic|irish|scottish|russian|istrian/.test(display) ? [scale.name] : null);
        if (folk) {
            const cat = /celtic|irish|scottish|nordic|scandinavian/i.test(folk[0]) ? "Celtic & Nordic" : /hungarian|romanian/i.test(folk[0]) ? "Hungarian & Romanian" : "Balkan, Slavic & Russian";
            addPath('Balkan, Slavic & Nordic Folk', cat, "", "", true, leaf(folk[0] !== scale.name ? { label: folk[0] } : {}));
        }

        // N. SYMMETRIC & MESSIAEN: a family with fewer modes than notes repeats at some transposition
        const messiaen = aliases.map(a => a[0]).concat([scale.name]).find(t => /messiaen/i.test(t));
        if (messiaen) {
            const mode = (messiaen.match(/mode (\d)/i) || [])[1];
            addPath('Theoretical: Symmetric & Messiaen', mode ? "Messiaen mode " + mode : "Messiaen, truncated and related", "", "", true, leaf({ label: messiaen !== scale.name ? messiaen : undefined }));
        } else if (modeCount(bitsOf) < noteCount && noteCount > 1) {
            addPath('Theoretical: Symmetric & Messiaen', "Other symmetric scales", "", "", true, leaf());
        }
        if (/symmetric|serial|set theory|\bforte\b/.test(display) || (/\bchromatic\b/.test(display) && !/ionian|dorian|phrygian|lydian|mixolydian|aeolian|locrian/.test(display))) {
            addPath('Theoretical: Mathematical & Set Theory', noteCount + "-Note Sets", "", "", true, leaf());
        }

        // O. FOUNDATIONS
        if (noteCount === 3) addPath('Foundations: 3-Note Trichords', "Fundamental Building Blocks", "", "", true, leaf());
        else if (noteCount === 4) addPath('Foundations: 4-Note Tetrachords', "Modal Units", "", "", true, leaf());

        // P. SYSTEMATIC VARIATIONS: one coined word like "Aeoloric", grouped by size
        if (/^[a-z]+ic$/.test(display) && !/(tonic|harmonic|acoustic|chromatic|diatonic|enigmatic)$/.test(display)) {
            addPath('Systematic Variations (-ic Family)', noteCount + "-Note Systems", "", "", true, leaf());
        }

        // --- 2. FINAL FALLBACK ---
        if (results.length === 0) {
            addPath('Experimental & Neo-Theoretical', "Structural Outliers", noteCount + "-Note Systems", "", true, leaf());
        }

        // --- 3. THE TWO DISTANCE VIEWS: every scale, by how it differs from Major or from natural minor
        [['From Major', MAJOR_BITS, MAJOR_DEGREES, MAJOR_ADDED], ['From Minor', MINOR_BITS, MINOR_DEGREES, MINOR_ADDED]].forEach(([view, ref, degrees, added]) => {
            const rel = relationTo(bitsOf, ref, degrees, added);
            if (!rel) { addPath(view, "The scale itself", "", "", true, leaf()); return; }
            let cat, sub = "";
            if (rel.kind === 'changed' && rel.n <= 3) { cat = rel.n === 1 ? "1 note changed" : rel.n + " notes changed"; sub = "adds " + rel.added.join(' and '); }
            else if (rel.kind === 'removed' && rel.n <= 2) { cat = rel.n === 1 ? "1 note removed" : "2 notes removed"; }
            else if (rel.kind === 'added' && rel.n <= 2) { cat = rel.n === 1 ? "1 note added" : "2 notes added"; }
            else if (rel.total <= 4) { cat = "3–4 differences"; }
            else { cat = "Further out"; sub = noteCount + " notes"; }
            addPath(view, cat, sub, "", true, leaf({ note: rel.text }));
        });

        // Complexity Sorting
        const distanceScore = getDistanceFromMajor(intervals);
        const isCore = scale.essential || id === 'major' || CORE_CHURCH_MODES.includes(id);
        const displayOrder = (isCore ? 0 : 5000) + distanceScore;

        return results.map(r => ({ ...r, isCore, displayOrder }));
    }

    function buildScaleCatalog(scales) {
        console.log("ScaleTaxonomy: Building catalog for", Array.isArray(scales) ? scales.length : "0", "scales");
        const intervals = {};
        const displayNames = {};
        const categories = {};
        const essentialScales = [];
        const wellKnownScales = [];
        const records = {}; // the full entry by id: aliases, kind, ragas, melakarta
        const baseScales = [];
        const taxonomyByScale = {};
        const byFamily = {};
        const synonyms = {}; // New: intervalKey -> [scaleIds]
        const placed = new Set();
        const placeOnce = (list, key, item) => {
            const k = key + '\u0000' + (typeof item === 'string' ? item : item.id);
            if (!placed.has(k)) { placed.add(k); list.push(item); }
        };

        const scalesList = Array.isArray(scales) ? scales : [];
        scalesList.forEach(scale => { if (scale && typeof scale.melakarta === 'number') MELA_NAMES[scale.melakarta] = melaName(scale); });

        scalesList.forEach(scale => {
            try {
                if (!scale || !scale.id) return;
                
                let ivals = scale.intervals || [];
                if (typeof ivals === 'string') {
                    try { ivals = JSON.parse(ivals.replace(/'/g, '"')); } catch(e) { ivals = []; }
                }
                const cleanIvals = Array.isArray(ivals) ? ivals : [];
                intervals[scale.id] = cleanIvals;
                
                // Track Synonyms
                const ivKey = cleanIvals.join(',');
                if (ivKey) {
                    if (!synonyms[ivKey]) synonyms[ivKey] = [];
                    synonyms[ivKey].push(scale.id);
                }

                displayNames[scale.id] = scale.name || scale.id;
                if (scale.wellKnown) wellKnownScales.push(scale.id);
                records[scale.id] = scale;
                if (scale.essential) essentialScales.push(scale.id);
                if (scale.baseScale) baseScales.push(scale.id);

                const taxes = deriveTaxonomiesForScale(scale);
                taxonomyByScale[scale.id] = taxes || [];

                taxes.forEach(t => {
                    // Backward compatibility flat map
                    if (!categories[t.family]) categories[t.family] = [];
                    placeOnce(categories[t.family], 'family:' + t.family, scale.id);
                    if (t.family === 'From Major' || t.family === 'From Minor') { /* the distance views are not families */ }

                    if (!byFamily[t.family]) byFamily[t.family] = { categories: {} };
                    const fam = byFamily[t.family];
                    if (!fam.categories[t.category]) fam.categories[t.category] = { subcategories: {} };
                    const cat = fam.categories[t.category];
                    if (!cat.subcategories[t.subcategory]) cat.subcategories[t.subcategory] = { subSubcategories: {} };
                    const sub = cat.subcategories[t.subcategory];
                    if (!sub.subSubcategories[t.subSubcategory]) sub.subSubcategories[t.subSubcategory] = [];
                    const item = (t.label || t.note || t.mark || t.raga) ? { id: scale.id, label: t.label, note: t.note, mark: t.mark, raga: t.raga } : scale.id;
                    placeOnce(sub.subSubcategories[t.subSubcategory], [t.family, t.category, t.subcategory, t.subSubcategory, t.label || ''].join('\u0001'), item);
                });
            } catch (err) {
                console.error("ScaleTaxonomy: Error processing scale", scale?.id, err);
            }
        });

        // Pedagogical Sorting: Primary first, then by Complexity
        Object.keys(byFamily).forEach(f => {
            const fam = byFamily[f];
            Object.keys(fam.categories).forEach(c => {
                const cat = fam.categories[c];
                Object.keys(cat.subcategories).forEach(s => {
                    const sub = cat.subcategories[s];
                    Object.keys(sub.subSubcategories).forEach(ss => {
                        let list = sub.subSubcategories[ss];
                        const idOf = (x) => typeof x === 'string' ? x : x.id;
                        const rowOf = (x) => (taxonomyByScale[idOf(x)] || []).find(t => t.family === f && t.category === c && t.subcategory === s && (typeof x === 'string' || t.label === x.label)) || {};
                        list.sort((a, b) => {
                            const ra = rowOf(a), rb = rowOf(b);
                            // 1. an explicit order (Melakarta number, thaat order, brightness)
                            const oa = typeof ra.order === 'number' ? ra.order : 1e9;
                            const ob = typeof rb.order === 'number' ? rb.order : 1e9;
                            if (oa !== ob) return oa - ob;
                            // 2. Primary vs Secondary
                            if (!!ra.isPrimary !== !!rb.isPrimary) return ra.isPrimary ? -1 : 1;
                            // 3. Display Order (Complexity)
                            return (ra.displayOrder || 999) - (rb.displayOrder || 999);
                        });
                    });
                });
            });
        });

        return {
            intervals,
            meta: {
                displayNames,
                categories,
                essentialScales,
                baseScales,
                wellKnownScales,
                records,
                taxonomy: {
                    byScale: taxonomyByScale,
                    byFamily,
                    familyOrder: FAMILY_ORDER,
                    views: ['From Major', 'From Minor'],
                    // defined systems first, then "close to Major", then the rest in the order they were met
                    categoryOrder: ['Core 7-Note Modes', 'The 10 thaats', 'Ragas by thaat', 'The 72 Melakarta', 'Janya ragas by parent',
                        'The four parent scales', 'Bebop scales', 'Other bebop scales', 'Symmetric scales',
                        'Harmonic Minor and its modes', 'Melodic Minor and its modes', 'Harmonic Major and its modes',
                        'Double Harmonic and its modes', 'Neapolitan Major and its modes', 'Neapolitan Minor and its modes', 'Hungarian Major and its modes',
                        'Major with 1 note changed', 'Major with 2 notes changed', 'Major with 3 notes changed',
                        'Major with 1 note removed (6 notes)', 'Major with 1 note added (8 notes)',
                        'No half steps', 'With half steps', 'Named pentatonic, other sizes',
                        'Minor blues (5–6 notes)', 'Major blues', '7-note blues', '8–9 note blues',
                        'Ethiopian qenet', 'The five pentatonic modes', 'Pentatonic (in / yō family)'],
                    synonyms // New: Map of intervalKeys to scaleIds
                }
            }
        };
    }

    return {
        buildScaleCatalog,
        deriveTaxonomiesForScale,
        getDistanceScore: getDistanceFromMajor,
        getDistanceFromMinor: getDistanceFromMinor,
        foldName: foldName,
        searchKey: searchKey,
        PHYSICS_MAP: PHYSICS_MAP
    };
});

if (typeof window !== 'undefined') {
    window.ScaleTaxonomy = window.ScaleTaxonomy || {};
}
