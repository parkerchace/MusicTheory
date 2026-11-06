/**
 * THE COURSE'S THEORY — the little bit of harmony the lesson widgets need,
 * spelled the way a lesson has to spell it.
 *
 * The studio's engine knows far more, but it names and spells for a generator
 * (sharps where a musician writes flats, "Em(add11,#5)" where the lecture
 * writes C6/E). A lesson has to be right on the page, so the widgets in
 * course-widgets.js build their chords here, by letter:
 *
 *   - a note is spelled from its root and its number (♭3 on D is F, not E♯),
 *     so every chord has one letter per number
 *   - a scale is a list of numbers on a root (harmonic minor: 1 2 ♭3 4 5 ♭6 7),
 *     and a scale's chord on any degree is every other note from there
 *   - a chord is named from its notes, by the root that gives a known quality
 *     (E G A C is C6/E, not E-something)
 *   - one chord leads to the next by moving its voices as little as possible
 *
 * Nothing here touches the page, so tools/course-test.js can check it.
 */
(function (root) {
    'use strict';

    var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    var LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
    var MAJOR = [0, 2, 4, 5, 7, 9, 11];     // what a plain number means: the root's major scale
    var ACC = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };
    var SOUNDS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

    /** '♭3' or 'b3' → { n: 3, acc: -1 }. '8' is the root an octave up. */
    function parseDegree(tok) {
        var m = /^((?:b|♭|#|♯)*)(\d+)$/.exec(String(tok).replace('𝄫', 'bb'));
        if (!m) return null;
        var acc = 0;
        m[1].split('').forEach(function (ch) { acc += /b|♭/.test(ch) ? -1 : 1; });
        return { n: parseInt(m[2], 10), acc: acc };
    }
    /** 'F♯' → { letter: 3, pc: 6 } */
    function parseNote(name) {
        var m = /^([A-G])(𝄫|bb|♭|b|♯|#|𝄪)?$/.exec(name);
        if (!m) return null;
        var li = LETTERS.indexOf(m[1]);
        var acc = !m[2] ? 0 : /𝄫|bb/.test(m[2]) ? -2 : /♭|b/.test(m[2]) ? -1 : m[2] === '𝄪' ? 2 : 1;
        return { letter: li, pc: (LETTER_PC[li] + acc + 12) % 12 };
    }
    function pcOf(name) { var p = parseNote(name); return p ? p.pc : null; }
    /** Half steps from the root up to this degree. */
    function semis(d) { return MAJOR[(d.n - 1) % 7] + 12 * Math.floor((d.n - 1) / 7) + d.acc; }
    /** The degree spelled on a root: one letter per number. */
    function spell(rootName, tok) {
        var r = parseNote(rootName), d = parseDegree(tok);
        if (!r || !d) return '?';
        var li = (r.letter + d.n - 1) % 7;
        var want = (r.pc + semis(d)) % 12;
        var acc = ((want - LETTER_PC[li]) % 12 + 18) % 12 - 6;    // -6..5, the nearest way there
        return LETTERS[li] + (ACC[String(acc)] !== undefined ? ACC[String(acc)] : '?');
    }
    /** '♭3' for display; '8' is the root again. */
    function numberLabel(tok) {
        var d = parseDegree(tok);
        if (!d) return tok;
        return (ACC[String(d.acc)] || '') + (d.n === 8 ? 1 : d.n);
    }
    /** A spelled name and the key it sounds as, when they differ in look: B𝄫 sounds A. */
    function soundsAs(name, midi) {
        var plain = SOUNDS[((midi % 12) + 12) % 12];
        return /𝄫|𝄪|^[CF]♭|^[EB]♯/.test(name) && plain !== name ? plain : '';
    }
    /** midi → 'Eb4' style, for the studio piano and the speaker. */
    function midiName(m) { return SOUNDS[m % 12].replace('♭', 'b').replace('♯', '#') + (Math.floor(m / 12) - 1); }

    /* ---------- scales: numbers on a root ---------------------------- */
    var SCALES = {
        major:            { name: 'major',             d: '1 2 3 4 5 6 7' },
        minor:            { name: 'natural minor',     d: '1 2 b3 4 5 b6 b7' },
        harmonic_minor:   { name: 'harmonic minor',    d: '1 2 b3 4 5 b6 7' },
        melodic_minor:    { name: 'melodic minor',     d: '1 2 b3 4 5 6 7' },
        dorian:           { name: 'Dorian',            d: '1 2 b3 4 5 6 b7' },
        phrygian:         { name: 'Phrygian',          d: '1 b2 b3 4 5 b6 b7' },
        lydian:           { name: 'Lydian',            d: '1 2 3 #4 5 6 7' },
        mixolydian:       { name: 'Mixolydian',        d: '1 2 3 4 5 6 b7' },
        mixolydian_b6:    { name: 'Mixolydian ♭6',     d: '1 2 3 4 5 b6 b7' },
        phrygian_dominant:{ name: 'Phrygian dominant', d: '1 b2 3 4 5 b6 b7' },
        harmonic_major:   { name: 'harmonic major',    d: '1 2 3 4 5 b6 7' },
        bebop_major:      { name: 'bebop major',       d: '1 2 3 4 5 b6 6 7' },
        bebop_minor:      { name: 'bebop minor',       d: '1 2 b3 4 5 b6 6 7' },
        diminished:       { name: 'diminished (W–H)',  d: '1 2 b3 4 b5 b6 6 7' }
    };
    function scaleTokens(id) { return (SCALES[id] || SCALES.major).d.split(' '); }
    /** Which index a progression number means in a scale. '7' is always the note under the 1, eight notes or seven. */
    function degreeIndex(num, len) {
        var n = parseInt(num, 10);
        return n === 7 ? len - 1 : (n - 1) % len;
    }

    /* ---------- chords: named from their notes ----------------------- */
    // half steps above the root → the symbol's suffix
    var QUALITIES = {
        '4 7': '', '3 7': 'm', '3 6': '°', '4 8': '+', '5 7': 'sus4', '2 7': 'sus2',
        '4 7 11': 'maj7', '4 7 10': '7', '3 7 10': 'm7', '3 6 10': 'ø7', '3 6 9': '°7',
        '3 7 11': 'm(maj7)', '4 8 11': 'maj7♯5', '4 8 10': '+7', '4 6 10': '7♭5', '4 6 11': 'maj7♭5',
        '4 7 9': '6', '3 7 9': 'm6', '5 7 10': '7sus4',
        '2 4 10': '9', '1 4 10': '7♭9'
        // a 7♭13 without its 5 has a +7's half steps: chordFrom names those by the symbol it was asked for
    };
    function qualityOf(pcs, rootPc) {
        var rel = pcs.map(function (p) { return ((p - rootPc) % 12 + 12) % 12; }).filter(function (x) { return x; });
        rel = rel.filter(function (x, i) { return rel.indexOf(x) === i; }).sort(function (a, b) { return a - b; });
        var q = QUALITIES[rel.join(' ')];
        return q === undefined ? null : q;
    }
    /**
     * Name spelled notes, bottom of the stack first: by that note when it makes
     * a known chord, otherwise by the note that does, over the bottom (C6/E).
     * A °7 keeps its bottom name: every note of one is a root of it.
     */
    function nameChord(names) {
        var pcs = names.map(pcOf);
        var q = qualityOf(pcs, pcs[0]);
        if (q !== null) return names[0] + q;
        // over another bass, a 6 chord before the minor 7 with the same notes: C6/E, as the lecture writes it, not Am7/E
        var best = null;
        for (var i = 1; i < names.length; i++) {
            q = qualityOf(pcs, pcs[i]);
            if (q === null) continue;
            var rank = q === '6' || q === 'm6' ? 0 : 1;
            if (!best || rank < best.rank) best = { name: names[i] + q + '/' + names[0], rank: rank };
        }
        return best ? best.name : names.join('·');
    }
    /**
     * The chord on one degree of a scale built on `rootName`: every other
     * note from there, `size` of them. Its label is the degree's own number
     * in that scale (♭6 in bebop major), so the lesson can say "the ♭6 chord".
     */
    function scaleChord(rootName, scaleId, num, size) {
        var toks = scaleTokens(scaleId), len = toks.length;
        var i = typeof num === 'number' ? num : degreeIndex(num, len);
        var picked = [];
        for (var k = 0; k < (size || 4); k++) picked.push(toks[(i + 2 * k) % len]);
        var names = picked.map(function (t) { return spell(rootName, t); });
        return { names: names, pcs: names.map(pcOf), symbol: nameChord(names), label: numberLabel(toks[i]), index: i };
    }
    /** A chord from a symbol's numbers on a root: '1 3 5 b7' on C is C·E·G·B♭, named `suffix` when given. */
    function chordFrom(rootName, numbers, suffix) {
        var names = numbers.split(/\s+/).map(function (t) { return spell(rootName, t); });
        return { names: names, pcs: names.map(pcOf), symbol: suffix != null ? rootName + suffix : nameChord(names) };
    }

    /* ---------- voice leading ---------------------------------------- */
    /**
     * Voice `pcs` (one voice each) between lo and hi, as close as possible to
     * `prev` (sorted midis), or in close position around middle C when there
     * is nothing to lead from. Ties go to the voicing nearer the middle.
     */
    function voiceLead(prev, pcs, opts) {
        opts = opts || {};
        var lo = opts.lo || 52, hi = opts.hi || 79, mid = opts.mid || 64;
        if (!prev || !prev.length) {
            var start = 60 + pcs[0];
            if (start > (opts.firstTop || 65)) start -= 12;
            var out = [start];
            for (var j = 1; j < pcs.length; j++) {
                var m = out[j - 1] + 1;
                while (((m % 12) + 12) % 12 !== pcs[j]) m++;
                out.push(m);
            }
            return out;
        }
        var cands = pcs.map(function (pc) {
            var list = [];
            for (var m = lo; m <= hi; m++) if (m % 12 === pc) list.push(m);
            return list;
        });
        var best = null, bestCost = Infinity;
        (function walk(k, acc) {
            if (k === cands.length) {
                var v = acc.slice().sort(function (a, b) { return a - b; });
                for (var i = 1; i < v.length; i++) if (v[i] === v[i - 1]) return;
                if (v[v.length - 1] - v[0] > 16) return;
                var cost = 0;
                if (v.length === prev.length) v.forEach(function (x, i) { cost += Math.abs(x - prev[i]); });
                else v.forEach(function (x) { cost += Math.min.apply(null, prev.map(function (p) { return Math.abs(x - p); })); });
                cost += Math.abs((v[0] + v[v.length - 1]) / 2 - mid) * 0.05;
                if (cost < bestCost) { bestCost = cost; best = v; }
                return;
            }
            cands[k].forEach(function (m) { acc.push(m); walk(k + 1, acc); acc.pop(); });
        })(0, []);
        return best || voiceLead(null, pcs, opts);
    }
    /** A bass note for a chord, E2 to E♭3. */
    function bassOf(pc) { var m = 36 + pc; return m < 40 ? m + 12 : m; }
    /**
     * Voice a run of chords ({pcs, bass?}) one after another: the upper voices
     * led, a bass under each. Returns [{ upper, bass, all }] of midis.
     */
    function voiceRun(chords, opts) {
        var prev = null;
        return chords.map(function (c) {
            var upper = voiceLead(prev, c.pcs, opts);
            prev = upper;
            var bass = bassOf(c.bass != null ? c.bass : c.pcs[0]);
            return { upper: upper, bass: bass, all: [bass].concat(upper) };
        });
    }

    root.CourseTheory = {
        LETTERS: LETTERS, SOUNDS: SOUNDS, SCALES: SCALES,
        parseDegree: parseDegree, parseNote: parseNote, pcOf: pcOf, semis: semis, spell: spell,
        numberLabel: numberLabel, soundsAs: soundsAs, midiName: midiName,
        scaleTokens: scaleTokens, degreeIndex: degreeIndex, scaleChord: scaleChord, chordFrom: chordFrom,
        qualityOf: qualityOf, nameChord: nameChord, voiceLead: voiceLead, voiceRun: voiceRun, bassOf: bassOf
    };
})(typeof window !== 'undefined' ? window : this);
