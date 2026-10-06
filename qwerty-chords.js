/**
 * @module QwertyChords
 * @description Chord mode for the typing keyboard: play the chords of the
 * scale you are in, and let the sheet's voicing engine decide how each one
 * is voiced and how it moves from the last.
 *
 * The ⌨ chip says what the keys play: Notes, Chords or Harmonize. Holding
 * SHIFT plays chords from any of them, for as long as it is held.
 *
 * CHORDS
 *   Z X C V B N M , . /      the scale's degrees 1, 2, 3 … as triads
 *   Q W E R T Y U I O P      the same degrees as seventh chords
 *   S D G H J  2 3 5 6 7 …   a black key plays the SECONDARY DOMINANT of the
 *                            chord on the white key to its right — the black
 *                            key before a chord is the chord that leads to it
 *
 * Any scale works: a pentatonic has five degrees and the row wraps after
 * them; an octatonic has eight and the row runs on to the comma.
 *
 * Voicing is the sheet's own: SheetMusicGenerator.voiceChordLive() runs the
 * same choice a generated bar gets — an auto logic (Smart, Smooth, Open,
 * Jazz, Piano) scoring eighteen styles against the previous chord, a manual
 * style, Voice Leading, VL Combos — with this player's own memory of the
 * last chord, so playing never disturbs the sheet's continuity. The chip
 * names the result as it plays: numeral · chord · style · how far it moved.
 *
 * HARMONIZE
 *   The keys are a melody, and a chord from the scale sounds under it
 *   (harmonizeNote + placeUnder below). The chord changes when the melody
 *   settles somewhere the chord does not hold — not on every passing note —
 *   a phrase opens on the tonic, and the chord rings on briefly after the
 *   melody lets go. A MIDI keyboard is harmonized the same way.
 *
 * Chord mode is off on Learn pages: a drill that asks you to build a chord
 * must not have the keyboard build it for you.
 *
 * The core (degree chords, secondary dominants, names, numerals) is pure and
 * exported as QwertyChords.core.
 */
(function (root) {
    'use strict';

    /* ==================================================================
       CORE — no DOM
       ================================================================== */
    var LETTERS = 'CDEFGAB';
    var NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

    function parse(note) {
        var m = String(note || '').match(/^([A-G])(#{1,2}|b{1,2}|x)?/);
        if (!m) return null;
        var acc = !m[2] ? 0 : m[2] === 'x' ? 2 : m[2].charAt(0) === '#' ? m[2].length : -m[2].length;
        return { letter: m[1], acc: acc, pc: ((NAT[m[1]] + acc) % 12 + 12) % 12 };
    }
    function pcOf(note) { var p = parse(note); return p ? p.pc : null; }

    /** The note `steps` letters and `semis` semitones above, spelled by letter. */
    function spellAbove(note, steps, semis) {
        var p = parse(note);
        if (!p) return null;
        var letter = LETTERS.charAt((LETTERS.indexOf(p.letter) + steps) % 7);
        var target = (p.pc + semis) % 12;
        var diff = ((target - NAT[letter]) % 12 + 18) % 12 - 6;     // -6..5
        return letter + (diff > 0 ? new Array(diff + 1).join('#') : new Array(-diff + 1).join('b'));
    }

    function intervalsOf(notes) {
        var r = pcOf(notes[0]);
        return notes.slice(1).map(function (n) { return ((pcOf(n) - r) % 12 + 12) % 12; });
    }

    /** What kind of chord, from its intervals above the root. */
    function quality(notes) {
        var iv = intervalsOf(notes);
        var has = function (i) { return iv.indexOf(i) !== -1; };
        var triad = null;
        if (has(4) && has(7)) triad = 'maj';
        else if (has(3) && has(7)) triad = 'min';
        else if (has(3) && has(6)) triad = 'dim';
        else if (has(4) && has(8)) triad = 'aug';
        else if (has(5) && has(7)) triad = 'sus4';
        else if (has(2) && has(7)) triad = 'sus2';
        var seventh = notes.length >= 4 ? (has(11) ? 11 : has(10) ? 10 : (triad === 'dim' && has(9)) ? 9 : null) : null;
        return { triad: triad, seventh: seventh };
    }

    var SYMBOL = {
        'maj': '', 'min': 'm', 'dim': 'dim', 'aug': 'aug', 'sus4': 'sus4', 'sus2': 'sus2',
        'maj11': 'maj7', 'maj10': '7', 'min10': 'm7', 'min11': 'm(maj7)', 'dim10': 'm7b5', 'dim9': 'dim7',
        'aug11': 'maj7#5', 'aug10': '7#5', 'sus410': '7sus4', 'sus210': '7sus2'
    };

    function chordSymbol(notes) {
        if (!notes || !notes.length) return '';
        var q = quality(notes);
        var key = (q.triad || '') + (q.seventh || '');
        if (q.triad && SYMBOL.hasOwnProperty(key)) return notes[0] + SYMBOL[key];
        if (q.triad && !q.seventh) return notes[0] + SYMBOL[q.triad];
        return notes[0] + '(' + notes.slice(1).join(' ') + ')';
    }

    function numeral(degree, notes) {
        var r = ROMAN[(degree - 1) % ROMAN.length] || String(degree);
        var q = quality(notes || []);
        var lower = q.triad === 'min' || q.triad === 'dim';
        var base = lower ? r.toLowerCase() : r;
        if (q.triad === 'aug') base += '+';
        if (q.triad === 'dim') base += (q.seventh === 10 ? 'ø' : '°');
        if (q.seventh === 11) base += 'maj7';
        else if (q.seventh === 10 || q.seventh === 9) base += '7';
        return base;
    }

    /** A dominant triad (or seventh) on the fifth above `target`. */
    function dominantOf(target, seventh) {
        var root = spellAbove(target, 4, 7);
        var notes = [root, spellAbove(root, 2, 4), spellAbove(root, 4, 7)];
        if (seventh) notes.push(spellAbove(root, 6, 10));
        return notes;
    }

    /** Stack the scale in thirds from a degree (the fallback when no engine builds it). */
    function stackFromScale(scaleNotes, degree, size) {
        var n = scaleNotes.length, out = [];
        for (var i = 0; i < size; i++) out.push(scaleNotes[(degree - 1 + i * 2) % n]);
        return out;
    }

    var WHITE_LOWER = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'];

    /**
     * What a key plays in chord mode.
     * @param {string} code KeyboardEvent.code
     * @param {{scaleNotes:string[], build?:function(number,number):string[], positionOf:function}} ctx
     * @returns {null | {none:true, reason:string} |
     *           {kind:'degree'|'secondary', degree:number, notes:string[], symbol:string, numeral:string}}
     */
    function chordForKey(code, ctx) {
        var pos = ctx.positionOf(code);
        var scale = ctx.scaleNotes || [];
        var n = scale.length;
        if (!pos || n < 3) return null;
        var size = pos.row === 'upper' ? 4 : 3;
        var build = function (degree, sz) {
            var notes = null;
            try { notes = ctx.build ? ctx.build(degree, sz) : null; } catch (e) { notes = null; }
            return (notes && notes.length >= Math.min(3, sz)) ? notes : stackFromScale(scale, degree, sz);
        };

        if (!pos.black) {
            var degree = (pos.whiteIndex % n) + 1;
            var notes = build(degree, size);
            return { kind: 'degree', degree: degree, notes: notes, symbol: chordSymbol(notes), numeral: numeral(degree, notes) };
        }

        var tDegree = (pos.rightWhiteIndex % n) + 1;
        var target = build(tDegree, 3);
        var tq = quality(target);
        var tNum = numeral(tDegree, target);
        if (tq.triad === 'dim' || tq.triad === 'aug' || !tq.triad) {
            return { none: true, reason: tNum + ' is not a key a chord can lead into: it has no dominant' };
        }
        var dom = dominantOf(target[0], size === 4);
        return {
            kind: 'secondary', degree: tDegree, target: tNum, notes: dom,
            symbol: chordSymbol(dom), numeral: (size === 4 ? 'V7/' : 'V/') + tNum
        };
    }

    /** How far a voicing moved from the last one, in semitones summed over voices. */
    function movement(prev, next) {
        if (!prev || !prev.length || !next || !next.length) return null;
        var a = prev.slice().sort(function (x, y) { return x - y; });
        var b = next.slice().sort(function (x, y) { return x - y; });
        var total = 0;
        b.forEach(function (m) {
            var best = Infinity;
            a.forEach(function (p) { best = Math.min(best, Math.abs(m - p)); });
            total += best;
        });
        return total;
    }

    /* ------------------------------------------------------------------
       INVERSIONS — which chord tone is in the bass, pinned or walked
       ------------------------------------------------------------------ */
    function mean(m) { return m.reduce(function (a, b) { return a + b; }, 0) / m.length; }
    function asc(m) { return m.slice().sort(function (a, b) { return a - b; }); }

    /** Which chord tone is lowest: 0 root, 1 third, 2 fifth, 3 seventh (-1: none of them). */
    function bassRole(midis, notes) {
        if (!midis || !midis.length) return -1;
        var pc = ((Math.min.apply(null, midis) % 12) + 12) % 12;
        for (var i = 0; i < notes.length; i++) if (pcOf(notes[i]) === pc) return i;
        return -1;
    }

    /**
     * How far one voicing is from another: the voices paired off low to high
     * (the cheapest pairing, for the same number of voices), semitones summed.
     * Different sizes fall back to each note's nearest neighbour, both ways.
     */
    function vlDistance(a, b) {
        if (!a || !a.length || !b || !b.length) return 0;
        if (a.length === b.length) {
            var x = asc(a), y = asc(b), d = 0;
            for (var i = 0; i < x.length; i++) d += Math.abs(x[i] - y[i]);
            return d;
        }
        return Math.max(movement(a, b), movement(b, a));
    }

    var INV_SHORT = ['Root', '1st', '2nd', '3rd'];
    var FIGURES = { 3: ['', '6', '6/4'], 4: ['7', '6/5', '4/3', '4/2'] };

    /** The numeral with its figured bass: I6, IV6/4, V6/5, ii4/3, V4/2/IV. */
    function figuredNumeral(num, role, size) {
        var fig = (FIGURES[size >= 4 ? 4 : 3] || [])[role];
        if (fig == null || role <= 0) return num;
        var m = String(num).match(/^([^/]+)(\/.*)?$/);
        if (!m) return num;
        var head = m[1], tail = m[2] || '';
        if (size >= 4) head = /maj7$/.test(head) ? head.replace(/maj7$/, 'M' + fig) : head.replace(/7$/, fig);
        else head += fig;
        return head + tail;
    }

    /** C/E: the chord named over its bass note, spelled as the chord spells it. */
    function slashSymbol(symbol, notes, role) {
        return role > 0 && notes[role] ? symbol + '/' + notes[role] : symbol;
    }

    /**
     * Every place each inversion can sit: each shape moved by octaves, kept
     * inside the playable range and within `span` semitones (by its average
     * pitch) of `home`, lowest first.
     */
    function inversionLadder(shapes, notes, opts) {
        opts = opts || {};
        var lo = opts.lo == null ? 33 : opts.lo, hi = opts.hi == null ? 100 : opts.hi;
        var span = opts.span == null ? 12 : opts.span;
        var home = opts.home;
        var seen = {}, out = [];
        (shapes || []).forEach(function (s) {
            if (!s || !s.length) return;
            if (home == null) home = mean(s);
            for (var o = -4; o <= 4; o++) {
                var t = asc(s.map(function (m) { return m + 12 * o; }));
                var c = mean(t);
                if (t[0] < lo || t[t.length - 1] > hi || Math.abs(c - home) > span) continue;
                var key = t.join(',');
                if (seen[key]) continue;
                seen[key] = true;
                out.push({ midi: t, role: bassRole(t, notes), centroid: c });
            }
        });
        out.sort(function (a, b) { return a.centroid - b.centroid || a.midi[0] - b.midi[0]; });
        return out;
    }

    /**
     * A pinned inversion: the shape with that chord tone in the bass (a
     * triad asked for a third inversion gets its second), placed nearest
     * the last chord when there is one to lead from, else nearest home.
     */
    function pickInversion(shapes, notes, k, prev, opts) {
        opts = opts || {};
        var home = opts.home != null ? opts.home : (shapes && shapes[0] ? mean(shapes[0]) : 60);
        var lad = inversionLadder(shapes, notes, { home: home, span: opts.span == null ? 12 : opts.span });
        if (!lad.length) return null;
        var want = Math.max(0, Math.min(k, notes.length - 1));
        var roles = lad.map(function (e) { return e.role; });
        // the asked-for tone missing (a shell has no fifth): the next one up that is there
        for (var i = 0; i < notes.length && roles.indexOf(want) === -1; i++) want = (want + 1) % notes.length;
        var cands = lad.filter(function (e) { return e.role === want; });
        if (!cands.length) cands = lad;
        var lead = opts.voiceLeading !== false && prev && prev.length;
        var best = null, bestCost = Infinity;
        cands.forEach(function (e) {
            var cost = lead ? vlDistance(prev, e.midi) + 0.1 * Math.abs(e.centroid - home) : Math.abs(e.centroid - home);
            if (cost < bestCost) { bestCost = cost; best = e; }
        });
        return best;
    }

    function chordKey(notes) {
        return notes.map(pcOf).join(',');
    }

    function weighted(items, weights, rand) {
        var total = weights.reduce(function (a, b) { return a + b; }, 0);
        var r = rand() * total;
        for (var i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
        return items[items.length - 1];
    }

    /**
     * THE INVERSION WALK.
     *
     * The walk carries a register it is heading for — a goal that travels a
     * few semitones per chord one way, then turns: at the end of a run of a
     * few chords, at the edge of its range, or sooner the further it has
     * strayed. The range is centred on home (the register the keys are set
     * to), so the walk rises and falls around it and never drifts off.
     *
     *  - the same chord again steps to its next inversion that way — now
     *    and then two at once — so repeating a chord arpeggiates it through
     *    the register;
     *  - a different chord goes to the voicing that best follows the goal
     *    among those within a reasonable distance of the smoothest move from
     *    the last chord, so voice leading always comes first;
     *  - it avoids the same bass tone too many times running, and uses a
     *    triad's six-four sparingly.
     *
     * @param {number[][]} shapes one voicing per inversion (voiceChordInversions)
     * @param {string[]} notes the chord, root first
     * @param {number[]|null} prev what sounded last
     * @param {Object|null} state the walk so far (returned updated, never mutated)
     * @param {{home?:number, span?:number}} opts
     * @param {function():number} rand
     * @returns {{pick:{midi:number[], role:number, centroid:number}, state:Object, same:boolean}|null}
     */
    function walkInversion(shapes, notes, prev, state, opts, rand) {
        opts = opts || {};
        rand = rand || Math.random;
        var home = opts.home != null ? opts.home : (shapes && shapes[0] ? mean(shapes[0]) : 60);
        var span = opts.span == null ? 12 : opts.span;
        var lad = inversionLadder(shapes, notes, { home: home, span: span });
        if (!lad.length) return null;
        var s = state || {};
        var st = { dir: s.dir === -1 ? -1 : 1, run: s.run || 0, roles: (s.roles || []).slice(-3), key: s.key,
                   goal: typeof s.goal === 'number' ? s.goal : null };
        var key = chordKey(notes);
        var same = !!(prev && prev.length && st.key === key);
        var triad = notes.length === 3;
        var reach = span * 0.6;   // how far from home the goal travels before it must turn
        var pick;

        function newRun() { return 2 + Math.floor(rand() * 3); }
        function turn() { st.dir = -st.dir; st.run = newRun(); }

        if (!prev || !prev.length) {
            // the first chord: near home, root position the likeliest
            var near = lad.filter(function (e) { return Math.abs(e.centroid - home) <= 5; });
            if (!near.length) near = lad;
            pick = weighted(near, near.map(function (e) { return e.role === 0 ? 2 : (triad && e.role === 2 ? 0.4 : 1); }), rand);
            st.dir = rand() < 0.5 ? -1 : 1;
            st.run = newRun();
            st.goal = pick.centroid;
        } else {
            if (st.goal === null) st.goal = mean(prev);
            // How far it has strayed, by where it is heading and where it is (past ±1: out of range).
            var lean = ((st.goal + mean(prev)) / 2 - home) / reach;
            if (st.run <= 0 || lean * st.dir >= 1 || rand() < Math.max(0, 0.5 * lean * st.dir)) turn();
            if (same) {
                var cur = 0, best = Infinity;
                lad.forEach(function (e, i) { var d = vlDistance(prev, e.midi); if (d < best) { best = d; cur = i; } });
                var step = rand() < 0.2 ? 2 : 1;
                var to = cur + st.dir * step;
                if (to < 0 || to >= lad.length || Math.abs(lad[to].centroid - home) > reach + 4) {
                    turn();
                    to = cur + st.dir * step;
                }
                pick = lad[Math.max(0, Math.min(lad.length - 1, to))];
                if (pick === lad[cur] && lad.length > 1) pick = lad[cur + (cur + 1 < lad.length ? 1 : -1)];
                st.goal = pick.centroid;
            } else {
                st.goal = Math.max(home - reach, Math.min(home + reach, st.goal + st.dir * (2 + 2 * rand())));
                var dists = lad.map(function (e) { return vlDistance(prev, e.midi); });
                var dmin = Math.min.apply(null, dists);
                var tol = 4 + notes.length;
                var last = st.roles[st.roles.length - 1], before = st.roles[st.roles.length - 2];
                var cands = [], costs = [];
                lad.forEach(function (e, i) {
                    if (dists[i] > dmin + tol) return;
                    var cost = 0.5 * dists[i] + Math.abs(e.centroid - st.goal);
                    if (e.role === last && e.role === before) cost += 2.5;
                    else if (e.role === last) cost += 0.6;
                    if (triad && e.role === 2) cost += 2;
                    cands.push(e);
                    costs.push(cost);
                });
                var cmin = Math.min.apply(null, costs);
                // The goal does not follow the pick: smooth voice leading leans one
                // way or the other for a given progression, and a goal that
                // followed it would drift that way too.
                pick = weighted(cands, costs.map(function (c) { return Math.exp(-(c - cmin) / 1.5); }), rand);
            }
        }
        st.run -= 1;
        st.key = key;
        st.roles.push(pick.role);
        return { pick: pick, state: st, same: same };
    }

    /* ------------------------------------------------------------------
       MELODY MODE — the key is the melody; choose a chord to go under it
       ------------------------------------------------------------------ */
    var ROLE_NAMES = ['root', 'third', 'fifth', 'seventh'];
    // How settled a melody note sounds as each member of its chord.
    var ROLE_WEIGHT = { root: 1.0, third: 0.9, fifth: 0.7, seventh: 0.55, other: 0.3 };
    // The grammar: tonic -> predominant -> dominant -> tonic. How well a chord
    // of each function follows a chord of the previous function.
    var FLOW = {
        none: { T: 1.0, PD: 0.45, D: 0.45 },
        T:  { T: 0.45, PD: 1.0, D: 0.8 },
        PD: { T: 0.45, PD: 0.6, D: 1.0 },
        D:  { T: 1.0, PD: 0.25, D: 0.5 }
    };
    // The same table functional-harmony.js uses (interval above the tonic -> function).
    var FN_BY_INTERVAL = {
        0: { T: 1.0 }, 1: { PD: 0.8, D: 0.3 }, 2: { PD: 0.9 }, 3: { T: 0.7, PD: 0.3 }, 4: { T: 0.75, D: 0.2 },
        5: { PD: 1.0 }, 6: { D: 0.6, PD: 0.3 }, 7: { D: 1.0 }, 8: { PD: 0.85, T: 0.2 }, 9: { T: 0.7, PD: 0.6 },
        10: { D: 0.55, PD: 0.4 }, 11: { D: 0.9 }
    };
    var ROMAN_BY_INTERVAL = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: '#IV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };

    function roleOf(pc, notes) {
        for (var i = 0; i < notes.length; i++) if (pcOf(notes[i]) === pc) return ROLE_NAMES[i] || 'other';
        return null;
    }

    function mainFunction(fn) {
        var best = 'T', w = -1;
        Object.keys(fn || {}).forEach(function (k) { if (fn[k] > w) { w = fn[k]; best = k; } });
        return best;
    }

    function flowScore(prevFn, fn) {
        var row = FLOW[prevFn] || FLOW.none, total = 0, sum = 0;
        Object.keys(fn).forEach(function (k) { total += fn[k] * (row[k] || 0); sum += fn[k]; });
        return sum ? total / sum : 0;
    }

    function bassMotion(fromPc, toPc) {
        if (fromPc == null) return 0;
        var i = ((toPc - fromPc) % 12 + 12) % 12;
        if (i === 0) return -0.2;
        if (i === 5 || i === 7) return 0.3;       // by fourth or fifth: the strongest root motion
        if (i === 1 || i === 2 || i === 10 || i === 11) return 0.15;
        if (i === 6) return 0;
        return 0.05;                              // by third
    }

    function sameChord(a, b) {
        return !!a && !!b && a.notes.length === b.notes.length &&
            a.notes.every(function (n, i) { return pcOf(n) === pcOf(b.notes[i]); });
    }

    function jitter(seed, k) {
        if (!seed) return 0;
        var h = (seed * 2654435761 + k * 40503) >>> 0;
        return ((h % 1000) / 1000) * 0.3;
    }

    /**
     * Which chord harmonizes this melody note.
     *
     * Candidates are the scale's chords that contain the note. A note outside
     * the scale looks further — the secondary dominant that holds it (it is
     * usually that chord's leading tone) or a chord borrowed from the parallel
     * key — and if nothing holds it, it passes over the chord already sounding.
     * Candidates are scored on how settled the melody sits in them (root or
     * third over fifth), how well they follow the previous chord's function
     * (tonic, predominant, dominant, tonic) and how strong the bass motion is.
     *
     * When the chord changes (opts.change):
     *   'smart'  (the default) as 'needed', and a note that comes within
     *            `settle` ms of the last chord change passes over it — a fast
     *            run is a line over one or two chords, not a chord per note
     *   'needed' a chord is held while the melody keeps to its notes
     *   'every'  a new chord on every note
     * opts.fresh marks the start of a phrase (after a silence): it is chosen
     * as an opening, and an opening wants the tonic.
     *
     * @param {number} melody MIDI note
     * @param {{scaleNotes:string[], build:function, tonic?:string, parallel?:{build:function}}} ctx
     * @param {{chord:Object}|null} prev what is sounding now
     * @param {{size?:number, change?:string, chromatic?:string, seed?:number,
     *          sinceChange?:number, settle?:number, fresh?:boolean}} opts
     * @returns {{chord:Object, hold:boolean, role:string, passing?:boolean}|{none:true, reason:string}}
     */
    function harmonizeNote(melody, ctx, prev, opts) {
        opts = opts || {};
        var size = opts.size === 4 ? 4 : 3;
        var scale = ctx.scaleNotes || [];
        var n = scale.length;
        var pc = ((melody % 12) + 12) % 12;
        var prevChord = prev && prev.chord;
        if (n < 3) return { none: true, reason: 'no scale to harmonize in' };
        var tonicPc = pcOf(ctx.tonic || scale[0]);
        var build = function (d, sz) {
            var notes = null;
            try { notes = ctx.build ? ctx.build(d, sz) : null; } catch (e) { notes = null; }
            return (notes && notes.length >= 3) ? notes : stackFromScale(scale, d, sz);
        };

        if (opts.fresh) prevChord = null;
        if (prevChord && opts.change !== 'every' && roleOf(pc, prevChord.notes)) {
            return { chord: prevChord, hold: true, role: roleOf(pc, prevChord.notes) };
        }
        var settle = opts.settle == null ? 350 : opts.settle;
        if (prevChord && opts.change === 'smart' && typeof opts.sinceChange === 'number' && opts.sinceChange < settle) {
            return { chord: prevChord, hold: true, passing: true, role: 'other' };
        }

        var cands = [];
        for (var d = 1; d <= n; d++) {
            var notes = build(d, size);
            var role = roleOf(pc, notes);
            if (!role) continue;
            var interval = ((pcOf(notes[0]) - tonicPc) % 12 + 12) % 12;
            cands.push({ kind: 'degree', degree: d, notes: notes, role: role, base: 1.0,
                         fn: FN_BY_INTERVAL[interval] || { T: 0.2 }, dim: quality(notes).triad === 'dim' });
        }

        if (!cands.length) {
            if (opts.chromatic === 'pass' && prevChord) return { chord: prevChord, hold: true, passing: true, role: 'other' };
            for (var t = 2; t <= n; t++) {
                var target = build(t, 3);
                var tq = quality(target).triad;
                if (tq === 'dim' || tq === 'aug' || !tq) continue;
                var dom = dominantOf(target[0], size === 4);
                var r = roleOf(pc, dom);
                if (!r) continue;
                cands.push({ kind: 'secondary', degree: t, target: numeral(t, target), notes: dom, role: r,
                             base: 0.8 + (r === 'third' ? 0.3 : 0), fn: { D: 1.0 } });
            }
            if (ctx.parallel && ctx.parallel.build) {
                for (var p = 1; p <= 7; p++) {
                    var bn = null;
                    try { bn = ctx.parallel.build(p, size); } catch (e) { bn = null; }
                    if (!bn || bn.length < 3) continue;
                    var br = roleOf(pc, bn);
                    if (!br) continue;
                    var bi = ((pcOf(bn[0]) - tonicPc) % 12 + 12) % 12;
                    cands.push({ kind: 'borrowed', degree: p, notes: bn, role: br, base: 0.7,
                                 fn: FN_BY_INTERVAL[bi] || { PD: 0.5 }, dim: quality(bn).triad === 'dim', interval: bi });
                }
            }
            if (!cands.length) {
                if (prevChord) return { chord: prevChord, hold: true, passing: true, role: 'other' };
                return { none: true, reason: 'no chord in or near this key holds that note' };
            }
        }

        var prevFn = prevChord ? (prevChord.kind === 'secondary' ? 'D' : mainFunction(prevChord.fn)) : 'none';
        var prevRoot = prevChord ? pcOf(prevChord.notes[0]) : null;
        var best = null, bestScore = -Infinity;
        cands.forEach(function (c, i) {
            var s = c.base * ROLE_WEIGHT[c.role] + flowScore(prevFn, c.fn) + bassMotion(prevRoot, pcOf(c.notes[0]))
                  - (c.dim ? 0.35 : 0) + jitter(opts.seed, i);
            if (prevChord && sameChord(c, prevChord)) s -= 0.4;   // asked for a change: make one
            if (!prevChord && c.kind === 'degree' && c.degree === 1) s += 0.35;   // a phrase opens at home
            if (s > bestScore) { bestScore = s; best = c; }
        });

        var chord = { kind: best.kind, degree: best.degree, notes: best.notes, fn: best.fn,
                      symbol: chordSymbol(best.notes) };
        if (best.kind === 'degree') chord.numeral = numeral(best.degree, best.notes);
        else if (best.kind === 'secondary') chord.numeral = (size === 4 ? 'V7/' : 'V/') + best.target;
        else {
            var q = quality(best.notes);
            var rn = ROMAN_BY_INTERVAL[best.interval] || '?';
            if (q.triad === 'min' || q.triad === 'dim') rn = rn.replace(/[IV]+/, function (m) { return m.toLowerCase(); });
            chord.numeral = rn + (q.triad === 'dim' ? '°' : '') + (q.seventh === 10 ? '7' : q.seventh === 11 ? 'maj7' : '');
            chord.borrowed = true;
        }
        return { chord: chord, hold: false, role: best.role };
    }

    /**
     * Put a chord voicing under the melody — usually.
     *
     * The voicing keeps its shape (its style chose the spacing) and moves by
     * octaves until its top voice sits just under the melody. A voice that
     * would fall below the floor moves up an octave if there is room, or is
     * dropped. If the melody is so low that the chord cannot fit beneath it
     * (less than `room` semitones above the floor), the chord goes above it
     * instead, and the melody becomes the bass.
     *
     * @returns {{notes:number[], where:'below'|'above'}}
     */
    function placeUnder(voicing, melody, opts) {
        opts = opts || {};
        var floor = opts.floor == null ? 40 : opts.floor;     // E2
        var room = opts.room == null ? 10 : opts.room;
        var v = (voicing || []).filter(function (x) { return typeof x === 'number'; }).sort(function (a, b) { return a - b; });
        if (!v.length) return { notes: [], where: 'below' };
        var mpc = ((melody % 12) + 12) % 12;
        var isM = function (x) { return ((x % 12) + 12) % 12 === mpc; };

        if (melody - floor >= room) {
            var k = Math.floor((melody - 1 - v[v.length - 1]) / 12);
            var out = [];
            v.map(function (x) { return x + 12 * k; }).forEach(function (x) {
                while (x < floor && x + 12 < melody) x += 12;
                if (x >= floor && x < melody && out.indexOf(x) === -1) out.push(x);
            });
            out.sort(function (a, b) { return a - b; });
            // The melody is the top voice: a copy of its note closer than an
            // octave below muddies it, so it goes; a farther copy stays only if
            // the harmony would otherwise be thinner than three voices.
            out = out.filter(function (x) { return !(isM(x) && melody - x < 12); });
            if (out.filter(function (x) { return !isM(x); }).length >= 3) out = out.filter(function (x) { return !isM(x); });
            // A bass under it all: the chord's root, at least a fourth below the
            // other voices — the line an accompanist's left hand plays.
            var pc = function (x) { return ((x % 12) + 12) % 12; };
            var hasBass = out.length > 1 && pc(out[0]) === opts.rootPc && out[1] - out[0] >= 7;
            if (opts.rootPc != null && out.length && !hasBass) {
                var bass = out[0] - 5;
                while (bass >= floor && pc(bass) !== opts.rootPc) bass--;
                if (bass >= floor) {
                    out.unshift(bass);
                } else {
                    // No room under the voicing: the root goes at the bottom of
                    // the range instead, and the voices crowding it move up an
                    // octave (a fifth over a low root, not G2-B2-D3 mud), or go.
                    bass = floor;
                    while (pc(bass) !== opts.rootPc) bass++;
                    var gap = bass >= 48 ? 3 : 5;   // from C3 up a third over the bass is clear; lower, a fourth at least
                    var lifted = [];
                    out.forEach(function (x) {
                        if (pc(x) === opts.rootPc && x - bass < 7) return;   // the bass already says it
                        while (x < bass + 7 && x + 12 < melody) x += 12;
                        if (x >= bass + gap && x < melody && !(isM(x) && melody - x < 12) && lifted.indexOf(x) === -1) lifted.push(x);
                    });
                    // thin: the root again, an octave up (C3 G3 C4 under E4)
                    for (var r = bass + 12; lifted.length < 2 && r < melody; r += 12) {
                        if (lifted.indexOf(r) === -1) lifted.push(r);
                    }
                    if (lifted.length >= 2) out = [bass].concat(lifted.sort(function (a, b) { return a - b; }));
                }
            }
            if (out.length >= 2 || (out.length && v.length < 2)) return { notes: out, where: 'below' };
        }
        var up = Math.ceil((melody + 1 - v[0]) / 12);
        var above = v.map(function (x) { return x + 12 * up; }).filter(function (x) { return x > melody && x <= 96; });
        return { notes: above, where: 'above' };
    }

    var core = {
        parse: parse, pcOf: pcOf, spellAbove: spellAbove, quality: quality,
        chordSymbol: chordSymbol, numeral: numeral, dominantOf: dominantOf,
        chordForKey: chordForKey, movement: movement, stackFromScale: stackFromScale,
        harmonizeNote: harmonizeNote, placeUnder: placeUnder, roleOf: roleOf,
        bassRole: bassRole, vlDistance: vlDistance, figuredNumeral: figuredNumeral, slashSymbol: slashSymbol,
        inversionLadder: inversionLadder, pickInversion: pickInversion, walkInversion: walkInversion,
        WHITE_LOWER: WHITE_LOWER
    };
    root.QwertyChords = { core: core, active: function () { return false; } };

    if (typeof document === 'undefined' || !document.addEventListener) return;

    /* ==================================================================
       RUNTIME
       ================================================================== */
    var PREFS_KEY = 'music-theory-chord-mode';

    function readPrefs() {
        try { return JSON.parse(localStorage.getItem(PREFS_KEY) || 'null'); } catch (e) { return null; }
    }
    function sheet() { return root.modularApp && root.modularApp.sheetMusicGenerator; }
    function theory() { return root.modularApp && root.modularApp.musicTheory; }
    function scaleLib() { return root.modularApp && root.modularApp.scaleLibrary; }

    /*
     * What the keys play — chosen on the ⌨ chip, in plain sight:
     *   notes      one key, one note
     *   chords     Z X C V … are the scale's chords (I ii iii IV …)
     *   harmonize  the keys are a melody, and a chord sounds under it
     * Holding Shift plays chords for as long as it is held, from any mode.
     * (Caps Lock used to latch chord mode; left on by accident it turned
     * every key into a chord, so it no longer does anything here.)
     */
    var MODES = ['notes', 'chords', 'harmonize'];
    var LINGER = { none: 0, short: 600, long: 1500, pedal: Infinity };
    var SETTINGS_VERSION = 2;

    /** First use: start from whatever the sheet's Voicing menu says. */
    function defaults() {
        var s = sheet(), voicing = 'smart';
        try {
            if (s && root.__voicingUserChoice) {
                voicing = s.state.autoVoicingAll
                    ? (s.state.voicingLogic || 'smart')
                    : root.VoicingCatalogue.optionValue('style', s.state.voicingStyle || 'close');
            }
        } catch (e) {}
        return {
            version: SETTINGS_VERSION,
            mode: 'notes',
            voicing: voicing, voiceLeading: true, combos: false, vlIntensity: 0.5,
            // chords: which tone is in the bass — 'auto' (the voicing decides) or
            // 0 root … 3 third inversion; walk wanders through them instead
            inversion: 'auto', walk: false,
            // harmonize
            melodySize: 3,          // 3 triads, 4 sevenths
            change: 'smart',        // 'smart' | 'needed' | 'every' — see harmonizeNote
            chromatic: 'colour',    // 'colour': find a chord that holds the note | 'pass'
            bass: 'root',           // 'root': the chord's root underneath | 'voiced': as the voicing has it
            linger: 'short'         // how long the chord rings after the melody lets go
        };
    }

    var settings = (function () {
        var d = defaults(), saved = readPrefs() || {};
        Object.keys(saved).forEach(function (k) { d[k] = saved[k]; });
        if (!saved.version) {
            // From before the mode switch: chord mode was a latch plus a
            // "keys play" choice; 'needed' was the only rhythm there was.
            d.mode = saved.kind === 'melody' && saved.latched ? 'harmonize' : (saved.latched ? 'chords' : 'notes');
            if (saved.change === 'needed') d.change = 'smart';
            d.version = SETTINGS_VERSION;
        }
        if (MODES.indexOf(d.mode) === -1) d.mode = 'notes';
        if (!LINGER.hasOwnProperty(d.linger)) d.linger = 'short';
        if ([0, 1, 2, 3].indexOf(d.inversion) === -1) d.inversion = 'auto';
        d.walk = !!d.walk;
        delete d.latched;
        delete d.kind;
        return d;
    })();

    var live = { previous: null, seed: 0 };
    var walk = { state: null, role: null };   // the inversion walk: where it is, and the bass tone it is on
    var shiftDown = false;
    var timings = [];
    var fallbackFocus = new Set();   // codes whose chord could not be held in one hand position

    function save() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(settings)); } catch (e) {} }

    function onLearnPage() {
        var ws = document.querySelector('.workspace');
        return !(ws && ws.style.display !== 'none');
    }

    /** Chord mode of either kind is in force (never on a Learn page: drills are not answered for you). */
    function active() {
        if (onLearnPage()) return false;
        return shiftDown || settings.mode !== 'notes';
    }

    /** 'chords' (keys are scale chords) or 'melody' (keys are a harmonized melody). */
    function kind() {
        if (shiftDown) return 'chords';
        return settings.mode === 'harmonize' ? 'melody' : 'chords';
    }

    function setMode(m) {
        if (MODES.indexOf(m) === -1 || m === settings.mode) return;
        if (root.QwertyKeys && root.QwertyKeys.releaseAll) root.QwertyKeys.releaseAll();
        settings.mode = m;
        save();
        forget();
        refresh();
        root.dispatchEvent(new CustomEvent('qwerty:mode', { detail: { mode: m } }));
    }

    function scaleNotes() {
        var lib = scaleLib(), mt = theory();
        if (!lib || !mt) return [];
        try { return mt.getScaleNotes(lib.getCurrentKey(), lib.getCurrentScale()) || []; } catch (e) { return []; }
    }

    function ctx() {
        var lib = scaleLib(), mt = theory();
        return {
            scaleNotes: scaleNotes(),
            positionOf: root.QwertyKeys.core.positionOf,
            build: function (degree, size) {
                return mt.buildScaleChord(lib.getCurrentKey(), lib.getCurrentScale(), degree, size).notes;
            }
        };
    }

    var STYLE_NAMES = {};
    function styleName(id) {
        if (!id) return '';
        if (!STYLE_NAMES[id] && root.VoicingCatalogue) {
            root.VoicingCatalogue.list.styles.forEach(function (e) { STYLE_NAMES[e[0]] = e[1]; });
        }
        return STYLE_NAMES[id] || id;
    }

    function voicingOpts(octaveOffset) {
        var opts = {};
        Object.keys(settings).forEach(function (k) { opts[k] = settings[k]; });
        opts.octaveOffset = octaveOffset || 0;
        return opts;
    }

    /** The chord source the typing keyboard asks when a key goes down. */
    function chordSource(code, e) {
        if (e) shiftDown = !!e.shiftKey;
        if (!active() || kind() !== 'chords') return null;
        var c = chordForKey(code, ctx());
        if (!c) return null;
        if (c.none) return { none: true, readout: c.reason };

        var s = sheet(), t0 = performance.now(), v, inv = null;
        var before = live.previous ? live.previous.slice() : null;
        if (s && typeof s.voiceChordLive === 'function') {
            // ← → still mean "lower / higher": the octave keys move the voicing's register.
            var st = root.QwertyKeys.state();
            var base = st.bases ? st.bases.notes : st.base;
            var octave = Math.round((base - root.QwertyKeys.core.DEFAULT_BASE) / 12);
            v = s.voiceChordLive(c.notes, voicingOpts(octave), live);
            // The style is the engine's choice; which tone goes in the bass may be ours.
            inv = v.midi.length ? invert(s, c, v.style, before, octave) : null;
            if (inv) { v.midi = inv.midi.slice(); live.previous = inv.midi.slice(); }
        } else {
            v = { midi: [], style: null };
        }
        timings.push(performance.now() - t0);
        if (timings.length > 200) timings.shift();
        if (!v.midi.length) return { none: true, readout: c.symbol + ': could not be voiced' };

        var moved = movement(before, v.midi);
        var named = inv
            ? figuredNumeral(c.numeral, inv.role, c.notes.length) + ' · ' + slashSymbol(c.symbol, c.notes, inv.role)
            : c.numeral + ' · ' + c.symbol;
        var readout = named + (v.style ? ' · ' + styleName(v.style) : '') +
            (moved === null ? '' : ' · moved ' + moved + ' st');
        syncInversion();
        return { midis: v.midi, readout: readout, chord: c, style: v.style, inversion: inv ? inv.role : null };
    }

    /**
     * The inversion button and the walk: the chord in the voicing style the
     * engine chose, with the bass tone pinned (A) or walked (F). Null when
     * the voicing decides for itself.
     */
    function invert(s, c, style, before, octave) {
        if (!settings.walk && settings.inversion === 'auto') return null;
        if (typeof s.voiceChordInversions !== 'function') return null;
        var shapes = s.voiceChordInversions(c.notes, style || 'close', octave);
        if (!shapes.length) return null;
        // home: around E4 at the keys' octave, the middle of where a chord is played
        var home = 64 + 12 * octave;
        if (settings.walk) {
            var w = walkInversion(shapes, c.notes, before, walk.state, { home: home }, Math.random);
            if (!w) return null;
            walk.state = w.state;
            walk.role = w.pick.role;
            return { midi: w.pick.midi, role: w.pick.role };
        }
        var p = pickInversion(shapes, c.notes, settings.inversion, before, { home: home, voiceLeading: settings.voiceLeading });
        return p ? { midi: p.midi, role: p.role } : null;
    }

    /* ---------- harmonize: the key is the melody, a chord goes under it ----- */
    var melodyLive = { prev: null, voicing: null, style: null, placed: null, changedAt: 0, lastAt: 0 };
    var PHRASE_GAP = 1500;   // ms of silence after which the next note starts a new phrase
    var SETTLE = 350;        // 'smart': a note this soon after a chord change passes over it...

    /** The parallel key to borrow from: C major borrows from C minor (aeolian), and back. */
    function parallelScale(scale) {
        var sc = String(scale || '').toLowerCase();
        var mt = theory();
        if (!mt || !mt.scales) return null;
        var cand = /^(major|ionian)$/.test(sc) ? ['aeolian', 'harmonic_minor']
            : /^(aeolian|minor|natural_minor|harmonic_minor|melodic_minor|dorian|phrygian)$/.test(sc) ? ['major'] : [];
        // The engine falls back to major for an id it does not know, so ask
        // whether the scale exists rather than whether notes came back.
        for (var i = 0; i < cand.length; i++) if (mt.scales[cand[i]]) return cand[i];
        return null;
    }

    function melodyContext() {
        var lib = scaleLib(), mt = theory();
        var c = ctx();
        if (!lib || !mt) return c;
        var key = lib.getCurrentKey(), sc = lib.getCurrentScale();
        c.tonic = key;
        var par = parallelScale(sc);
        if (par) c.parallel = { build: function (d, size) { return mt.buildScaleChord(key, par, d, size).notes; } };
        return c;
    }

    /**
     * Harmonize one melody note: choose the chord (harmonizeNote, which
     * knows how long the current chord has sounded and whether a phrase is
     * starting), voice it with the sheet's engine and this player's
     * voice-leading memory, and put it under the melody (placeUnder).
     * A held chord stays exactly where it is while it can.
     * @param {number} m the melody note (the top of what is held)
     * @param {{othersHeld?:number}} info
     */
    function harmonize(m, info) {
        var now = Date.now(), t0 = performance.now();
        var fresh = !melodyLive.prev || (now - melodyLive.lastAt > PHRASE_GAP && !(info && info.othersHeld));
        var since = now - melodyLive.changedAt;
        var h = harmonizeNote(m, melodyContext(), melodyLive.prev, {
            size: settings.melodySize === 4 ? 4 : 3,
            change: settings.change, chromatic: settings.chromatic, seed: live.seed,
            sinceChange: since, settle: SETTLE, fresh: fresh
        });
        melodyLive.lastAt = now;
        var name = root.QwertyKeys.core.noteName(m);
        if (h.none) return { harmony: [], readout: '♪ ' + name + ' · ' + h.reason };
        var chord = h.chord;
        var tag = h.passing ? ' · passing' : h.hold ? ' · held' : '';

        var was = melodyLive.placed;
        // ...and if it is still held once it has settled, it gets a chord of its own.
        var recheckIn = h.passing && settings.change === 'smart' && since < SETTLE ? SETTLE - since + 20 : 0;
        // A held chord stays exactly where it is while it is under the tune and
        // near it; a passing note never moves it, however far it leaps.
        if (h.hold && was && was.length && was.every(function (x) { return x < m; }) &&
            (h.passing || m - Math.max.apply(null, was) <= 12)) {
            melodyLive.prev = { chord: chord };
            return { harmony: was.slice(), chord: chord, role: h.role, where: 'below', recheckIn: recheckIn,
                     readout: '♪ ' + name + ' · ' + chord.numeral + ' · ' + chord.symbol + tag };
        }
        var voicing = [], style = melodyLive.style;
        if (h.hold && melodyLive.voicing) {
            voicing = melodyLive.voicing;
        } else {
            var s = sheet();
            if (s && typeof s.voiceChordLive === 'function') {
                var v = s.voiceChordLive(chord.notes, voicingOpts(0), live);
                voicing = v.midi;
                style = v.style;
            }
        }
        var placed = placeUnder(voicing, m, { rootPc: settings.bass === 'voiced' ? null : pcOf(chord.notes[0]) });
        if (!h.hold) melodyLive.changedAt = now;
        melodyLive.prev = { chord: chord };
        melodyLive.voicing = voicing;
        melodyLive.style = style;
        melodyLive.placed = placed.notes.slice();
        live.previous = placed.notes.slice();
        timings.push(performance.now() - t0);
        if (timings.length > 200) timings.shift();
        return {
            harmony: placed.notes, chord: chord, role: h.role, where: placed.where, recheckIn: recheckIn,
            readout: '♪ ' + name + ' · ' + chord.numeral + ' · ' + chord.symbol +
                     (tag || (style ? ' · ' + styleName(style) : '')) +
                     (placed.where === 'above' ? ' · chord above: too low for one below' : '')
        };
    }

    /* ---------- the fretboard: one hand shape, or the chord's notes across the neck */
    function fallbackOn(key, gf, chord) {
        gf.setFocusNotes(chord.notes, { kind: 'chord' });
        fallbackFocus.add(key);
    }
    function fallbackOff(key, gf) {
        if (!fallbackFocus.delete(key)) return;
        if (gf && !fallbackFocus.size) gf.clearFocusNotes();
    }

    function onPress(e) {
        var d = e.detail || {};
        var gf = root.modularApp && root.modularApp.guitarFretboard;
        if (d.inner) {
            // a second melody voice under the tune: where a hand would play it
            if (gf && gf.midiNoteOn) gf.midiNoteOn(d.melody);
            return;
        }
        if (!d.info || !d.info.chord) return;
        var melody = typeof d.melody === 'number';
        if (gf && typeof gf.midiChordOn === 'function') {
            if (melody) fallbackOff('melody', gf);
            if (!gf.midiChordOn(d.midis)) {
                if (melody && gf.midiNoteOn) {
                    // The tune where a hand would play it, and the chord's upper
                    // voices as a shape on the other strings; only if even that
                    // will not fit, the chord's notes lit across the neck.
                    gf.midiNoteOn(d.melody);
                    var placed = gf._held && gf._held.get(d.melody);
                    var upper = d.midis.filter(function (x) { return x !== d.melody; }).sort(function (x, y) { return x - y; }).slice(1);
                    var ok = upper.length > 1 && gf.midiChordOn(upper, { avoidStrings: placed ? [placed.string] : [] });
                    if (!ok) fallbackOn('melody', gf, d.info.chord);
                } else {
                    fallbackOn(d.code, gf, d.info.chord);
                }
            }
        }
        lightStrip(d.info.chord, true);
    }

    function onRelease(e) {
        var d = e.detail || {};
        var gf = root.modularApp && root.modularApp.guitarFretboard;
        if (d.melody) {
            melodyLive.lastAt = Date.now();      // a phrase's silence starts now, not at the last key down
            if (!d.harmonySounding) { fallbackOff('melody', gf); lightStrip(null, false); }
            return;
        }
        fallbackOff(d.code, gf);
        lightStrip(null, false);
    }

    function onHarmonyOff() {
        var gf = root.modularApp && root.modularApp.guitarFretboard;
        melodyLive.lastAt = Date.now();
        fallbackOff('melody', gf);
        lightStrip(null, false);
    }

    /* ---------- the chord strip: the letter that plays each degree ---- */
    function labelStrip() {
        var strip = document.getElementById('mini-chord-strip');
        if (!strip) return;
        var on = active() && kind() === 'chords' && root.QwertyKeys.isLive();
        strip.querySelectorAll('.qk-strip-key').forEach(function (n) { n.remove(); });
        strip.classList.toggle('qk-strip-chords', on);
        if (!on) return;
        var labels = root.QwertyKeys.core;
        strip.querySelectorAll('.mini-chord-item[data-degree]').forEach(function (item) {
            var d = parseInt(item.getAttribute('data-degree'), 10);
            var code = WHITE_LOWER[d - 1];
            if (!code) return;
            var tag = document.createElement('span');
            tag.className = 'qk-strip-key';
            tag.setAttribute('aria-hidden', 'true');
            tag.textContent = labels.label(code, null);
            item.appendChild(tag);
        });
    }

    function lightStrip(chord, on) {
        var strip = document.getElementById('mini-chord-strip');
        if (!strip) return;
        strip.querySelectorAll('.qk-strip-on').forEach(function (n) { n.classList.remove('qk-strip-on'); });
        if (on && chord && chord.kind === 'degree') {
            var item = strip.querySelector('.mini-chord-item[data-degree="' + chord.degree + '"]');
            if (item) item.classList.add('qk-strip-on');
        }
    }

    /* ---------- the chip: what the keys play, and the settings ---------- */
    var panel = null, settingsBtn = null, modeBtns = {}, syncPanel = function () {};
    var invGroup = null, invBtn = null, walkBtn = null;
    var INV_ORDER = ['auto', 0, 1, 2, 3];
    var INV_WORDS = { auto: 'Auto', 0: 'Root', 1: '1st', 2: '2nd', 3: '3rd' };
    var INV_LONG = { auto: 'as the voicing has it', 0: 'root position', 1: 'first inversion (the third in the bass)',
                     2: 'second inversion (the fifth in the bass)', 3: 'third inversion (the seventh in the bass; a triad gets its second)' };
    var MODE_WORDS = {
        notes: ['Notes', 'One key, one note'],
        chords: ['Chords', 'Z X C V … play the scale\'s chords (I ii iii IV …); the row above, sevenths'],
        harmonize: ['Harmonize', 'The keys are a melody, and a chord from the scale sounds under it']
    };

    function buildControls() {
        var chip = document.querySelector('.qk-chip');
        if (!chip || chip.querySelector('.qk-modes')) return;

        var modes = document.createElement('div');
        modes.className = 'qk-modes';
        modes.setAttribute('role', 'radiogroup');
        modes.setAttribute('aria-label', 'What the keys play');
        MODES.forEach(function (m) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'qk-mode-btn';
            b.setAttribute('role', 'radio');
            b.setAttribute('data-mode', m);
            b.textContent = MODE_WORDS[m][0];
            b.title = MODE_WORDS[m][1] + (m === 'chords' ? '. Or hold Shift, from any mode.' : '');
            b.addEventListener('click', function () { setMode(m); });
            modes.appendChild(b);
            modeBtns[m] = b;
        });

        settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'qk-chords-btn';
        settingsBtn.textContent = '⚙';
        settingsBtn.title = 'Chord and harmony settings';
        settingsBtn.setAttribute('aria-label', 'Chord and harmony settings');
        settingsBtn.setAttribute('aria-expanded', 'false');

        panel = document.createElement('div');
        panel.className = 'qk-chords-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Chord and harmony settings');
        panel.hidden = true;

        var head = document.createElement('div');
        head.className = 'qk-chords-head';
        var how = document.createElement('p');
        how.className = 'qk-chords-how';
        var HOW = {
            notes: 'Keys play notes. Hold Shift for chords (Z X C V … are the scale\'s chords), or pick Chords or Harmonize on the chip.',
            chords: 'Z X C V B N M are the scale\'s chords, Q W E R T Y U the same as sevenths, and the black keys between them the chord that leads into the next one. ' +
                'A picks which note is in the bass (the inversion); F walks up and down through the inversions as you play, leading smoothly into each new chord.',
            harmonize: 'Play a tune: each key is the melody, and a chord from your scale sounds under it (above it only when the melody is too low for one to fit). A MIDI keyboard is harmonized too.'
        };

        var harmonizeBox = document.createElement('div');
        harmonizeBox.className = 'qk-chords-melody';
        harmonizeBox.appendChild(choice('Chords', [['3', 'Triads'], ['4', 'Sevenths']], String(settings.melodySize || 3),
            function (v) { settings.melodySize = parseInt(v, 10); save(); forget(); }));
        harmonizeBox.appendChild(choice('Change the chord', [
            ['smart', 'When the melody settles'],
            ['needed', 'Whenever it leaves the chord'],
            ['every', 'On every note']
        ], settings.change, function (v) { settings.change = v; save(); }));
        harmonizeBox.appendChild(choice('Notes outside the key', [['colour', 'Find a chord that holds them'], ['pass', 'Let them pass over the chord']],
            settings.chromatic, function (v) { settings.chromatic = v; save(); }));
        harmonizeBox.appendChild(choice('Bass', [['root', 'The chord\'s root'], ['voiced', 'As the voicing has it']],
            settings.bass, function (v) { settings.bass = v; save(); }));
        harmonizeBox.appendChild(choice('After you let go', [
            ['none', 'The chord stops'], ['short', 'It rings briefly'], ['long', 'It rings longer'], ['pedal', 'It holds until the next note']
        ], settings.linger, function (v) { settings.linger = v; save(); }));

        var voicingBox = document.createElement('div');
        voicingBox.className = 'qk-chords-voicing';
        var vLabel = document.createElement('label');
        vLabel.className = 'qk-chords-field';
        vLabel.textContent = 'Voicing ';
        var select = document.createElement('select');
        select.innerHTML = root.VoicingCatalogue ? root.VoicingCatalogue.optionsHtml({ none: false }) : '<option value="smart">Smart</option>';
        select.value = settings.voicing;
        if (select.value !== settings.voicing) select.value = 'smart';
        select.addEventListener('change', function () { settings.voicing = select.value; save(); forget(); });
        vLabel.appendChild(select);
        var vl = row('checkbox', 'qk-vl', 'Voice leading — move as little as possible', settings.voiceLeading, function (v) {
            settings.voiceLeading = v; save();
        });
        var combos = row('checkbox', 'qk-combos', 'VL combos — try other styles and inversions too', settings.combos, function (v) {
            settings.combos = v; save();
        });
        var iLabel = document.createElement('label');
        iLabel.className = 'qk-chords-field';
        iLabel.textContent = 'VL intensity ';
        var range = document.createElement('input');
        range.type = 'range'; range.min = '0'; range.max = '100';
        range.value = String(Math.round((settings.vlIntensity == null ? 0.5 : settings.vlIntensity) * 100));
        range.addEventListener('input', function () { settings.vlIntensity = parseInt(range.value, 10) / 100; save(); });
        iLabel.appendChild(range);
        var buttons = document.createElement('div');
        buttons.className = 'qk-chords-buttons';
        var dice = document.createElement('button');
        dice.type = 'button';
        dice.textContent = '🎲 New seed';
        dice.title = 'Let the auto voicings (and the harmonizer) choose differently';
        dice.addEventListener('click', function () { live.seed = (live.seed || 0) + 1; });
        var forgetBtn = document.createElement('button');
        forgetBtn.type = 'button';
        forgetBtn.textContent = 'Forget last chord';
        forgetBtn.title = 'Start the next chord fresh instead of leading from the last';
        forgetBtn.addEventListener('click', forget);
        buttons.appendChild(dice);
        buttons.appendChild(forgetBtn);
        [vLabel, vl, combos, iLabel, buttons].forEach(function (n) { voicingBox.appendChild(n); });

        [head, how, harmonizeBox, voicingBox].forEach(function (n) { panel.appendChild(n); });

        syncPanel = function () {
            var m = settings.mode;
            head.textContent = m === 'harmonize' ? 'HARMONIZE' : m === 'chords' ? 'CHORDS' : 'TYPING KEYBOARD';
            how.textContent = HOW[m];
            harmonizeBox.hidden = m !== 'harmonize';
        };
        syncPanel();

        // The panel is taller than the dock, which clips its children, so it
        // lives on <body> and is placed above the button when opened.
        function place() {
            var r = settingsBtn.getBoundingClientRect();
            panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
            panel.style.bottom = Math.max(8, window.innerHeight - r.top + 8) + 'px';
        }
        settingsBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            panel.hidden = !panel.hidden;
            if (!panel.hidden) { syncPanel(); place(); }
            settingsBtn.setAttribute('aria-expanded', String(!panel.hidden));
        });
        window.addEventListener('resize', function () { if (!panel.hidden) place(); });
        document.addEventListener('click', function (e) {
            if (panel.hidden || panel.contains(e.target) || e.target === settingsBtn) return;
            panel.hidden = true;
            settingsBtn.setAttribute('aria-expanded', 'false');
        });
        panel.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { panel.hidden = true; settingsBtn.setAttribute('aria-expanded', 'false'); settingsBtn.focus(); }
        });

        // Inversion: pinned (A cycles it) or walked (F)
        invGroup = document.createElement('div');
        invGroup.className = 'qk-inv';
        invGroup.setAttribute('role', 'group');
        invGroup.setAttribute('aria-label', 'Inversion');
        invBtn = document.createElement('button');
        invBtn.type = 'button';
        invBtn.className = 'qk-inv-btn';
        invBtn.addEventListener('click', stepInversion);
        walkBtn = document.createElement('button');
        walkBtn.type = 'button';
        walkBtn.className = 'qk-walk-btn';
        walkBtn.innerHTML = '<span aria-hidden="true">⇅</span><span class="qk-walk-word"> Walk</span>';
        walkBtn.setAttribute('aria-label', 'Walk the inversions');
        walkBtn.title = 'Walk the inversions (F): each chord steps up or down to another inversion of the voicing — ' +
            'the same chord climbs through its inversions, a new chord moves to the nearest one — turning back before it strays far.';
        walkBtn.addEventListener('click', toggleWalk);
        invGroup.appendChild(invBtn);
        invGroup.appendChild(walkBtn);

        var toggle = chip.querySelector('.qk-toggle');
        chip.insertBefore(modes, toggle ? toggle.nextSibling : chip.firstChild);
        chip.insertBefore(invGroup, modes.nextSibling);
        chip.appendChild(settingsBtn);
        document.body.appendChild(panel);
    }

    function choice(labelText, options, value, onChange) {
        var wrap = document.createElement('label');
        wrap.className = 'qk-chords-field';
        wrap.appendChild(document.createTextNode(labelText + ' '));
        var sel = document.createElement('select');
        options.forEach(function (o) {
            var opt = document.createElement('option');
            opt.value = o[0];
            opt.textContent = o[1];
            sel.appendChild(opt);
        });
        sel.value = value;
        sel.addEventListener('change', function () { onChange(sel.value); });
        wrap.appendChild(sel);
        return wrap;
    }

    function row(type, id, text, checked, onChange) {
        var wrap = document.createElement('label');
        wrap.className = 'qk-chords-row';
        var input = document.createElement('input');
        input.type = type;
        input.id = id;
        input.checked = !!checked;
        input.addEventListener('change', function () { onChange(input.checked); });
        var span = document.createElement('span');
        span.textContent = text;
        wrap.appendChild(input);
        wrap.appendChild(span);
        return wrap;
    }

    /** What the inversion button says: the pinned inversion, or the one the walk is on. */
    function syncInversion() {
        if (!invBtn) return;
        var walking = settings.walk;
        var on = walking ? (INV_WORDS[walk.role] || '—') : INV_WORDS[settings.inversion];
        invBtn.textContent = 'Inv ' + on;
        invBtn.classList.toggle('qk-on', !walking && settings.inversion !== 'auto');
        invBtn.classList.toggle('qk-walking', walking);
        invBtn.title = walking
            ? 'Walking the inversions' + (INV_ORDER.indexOf(walk.role) > 0 ? ': on ' + INV_LONG[walk.role] : '') +
              '. Click (or A) to keep this inversion and stop walking.'
            : 'Inversion: ' + INV_LONG[settings.inversion] + '. Click (or A) for the next.';
        walkBtn.setAttribute('aria-pressed', String(walking));
        walkBtn.classList.toggle('qk-on', walking);
    }

    /**
     * A: the next inversion — Auto, Root, 1st, 2nd, 3rd, and round again.
     * While walking it stops the walk instead, keeping the inversion it was on.
     */
    function stepInversion() {
        if (settings.walk) {
            settings.walk = false;
            if (INV_ORDER.indexOf(walk.role) > 0) settings.inversion = walk.role;
        } else {
            settings.inversion = INV_ORDER[(INV_ORDER.indexOf(settings.inversion) + 1) % INV_ORDER.length];
        }
        save();
        syncInversion();
        // a chord held while it changes is struck again in the new inversion
        if (root.QwertyKeys && root.QwertyKeys.revoice) root.QwertyKeys.revoice();
    }

    /** F: walk the inversions, or stop. The walk starts from the last chord played. */
    function toggleWalk() {
        settings.walk = !settings.walk;
        walk.state = null;
        walk.role = null;
        save();
        syncInversion();
    }

    /** A and F, when the keys play chords (Chords, or Shift held). */
    function onControlKey(code, e) {
        if (code !== 'KeyA' && code !== 'KeyF') return false;
        if (e) shiftDown = !!e.shiftKey;
        if (!active() || kind() !== 'chords') return false;
        if (e && e.repeat) return true;
        var holding = root.QwertyKeys.state().held.length > 0;
        if (code === 'KeyA') stepInversion();
        else toggleWalk();
        // a held chord was struck again and named itself; otherwise say what changed
        if (!holding && root.QwertyKeys.render) root.QwertyKeys.render({ readout: settings.walk ? 'Walking the inversions'
            : 'Inversion: ' + INV_LONG[settings.inversion] });
        return true;
    }

    function forget() {
        walk.state = null; walk.role = null;
        live.previous = null; live.lastStyle = undefined; live.baseIncluded = undefined;
        melodyLive.prev = null; melodyLive.voicing = null; melodyLive.style = null; melodyLive.placed = null;
        melodyLive.changedAt = 0; melodyLive.lastAt = 0;
    }

    function refresh() {
        if (root.QwertyKeys && root.QwertyKeys.render) root.QwertyKeys.render();
        MODES.forEach(function (m) {
            var b = modeBtns[m];
            if (!b) return;
            var on = settings.mode === m;
            b.setAttribute('aria-checked', String(on));
            b.classList.toggle('qk-on', on);
            // Shift held: chords for now, whatever the mode
            b.classList.toggle('qk-momentary', m === 'chords' && shiftDown && settings.mode !== 'chords');
        });
        syncPanel();
        if (invGroup) invGroup.hidden = settings.mode === 'harmonize';   // a harmonized melody places its own chords
        syncInversion();
        labelStrip();
    }

    function onModifier(e) {
        var s = !!e.shiftKey;
        if (e.type === 'keyup' && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) s = false;
        if (s === shiftDown) return;
        shiftDown = s;
        refresh();
    }

    /** A MIDI keyboard is harmonized too, in Harmonize mode. */
    function hookMidi() {
        var mm = root.modularApp && root.modularApp.midiManager;
        if (!mm || mm._harmonizeHooked) return !!mm;
        mm._harmonizeHooked = true;
        mm.on('noteOn', function (d) {
            if (!d || d.inputId === 'qwerty' || settings.mode !== 'harmonize' || onLearnPage()) return;
            if (root.QwertyKeys && root.QwertyKeys.melodyOn) {
                root.QwertyKeys.melodyOn('midi:' + d.midi, d.midi, { external: true, velocity: Math.round((d.velocity || 0.8) * 127) });
            }
        });
        mm.on('noteOff', function (d) {
            if (!d || d.inputId === 'qwerty') return;
            if (root.QwertyKeys && root.QwertyKeys.melodyOff) root.QwertyKeys.melodyOff('midi:' + d.midi);
        });
        return true;
    }

    function init() {
        if (!root.QwertyKeys || !root.QwertyKeys.setChordSource) return;
        root.QwertyKeys.setChordSource(chordSource);
        if (root.QwertyKeys.setKeyControl) root.QwertyKeys.setKeyControl(onControlKey);
        if (root.QwertyKeys.setHarmonizer) {
            root.QwertyKeys.setHarmonizer({
                active: function (e) {
                    if (e) shiftDown = !!e.shiftKey;
                    return active() && kind() === 'melody';
                },
                harmonize: harmonize,
                linger: function () { return LINGER[settings.linger] || 0; }
            });
        }
        root.addEventListener('qwerty:press', onPress);
        root.addEventListener('qwerty:release', onRelease);
        root.addEventListener('qwerty:harmonyoff', onHarmonyOff);
        root.addEventListener('keydown', onModifier, true);
        root.addEventListener('keyup', onModifier, true);
        root.addEventListener('blur', function () { if (shiftDown) { shiftDown = false; refresh(); } });

        buildControls();
        refresh();

        var strip = document.getElementById('mini-chord-strip');
        if (strip && typeof MutationObserver !== 'undefined') {
            new MutationObserver(function (records) {
                // our own labels are childList changes too; only re-label when the strip itself was redrawn
                var redrawn = records.some(function (r) {
                    return r.target === strip && Array.prototype.some.call(r.addedNodes, function (n) {
                        return n.classList && n.classList.contains('mini-chord-item');
                    });
                });
                if (redrawn) labelStrip();
            }).observe(strip, { childList: true });
        }

        // A new scale is a new set of chords: start voice leading afresh. The
        // app (and its MIDI manager) are created after this file runs.
        var tries = 0;
        (function hook() {
            var lib = scaleLib();
            var midiOk = hookMidi();
            if (lib && typeof lib.on === 'function' && !lib._qwertyHooked) {
                lib._qwertyHooked = true;
                lib.on('scaleChanged', function () { forget(); labelStrip(); });
            }
            if ((!lib || !midiOk) && tries++ < 40) setTimeout(hook, 250);
        })();
    }

    root.QwertyChords.active = active;
    root.QwertyChords.kind = kind;
    root.QwertyChords.mode = function () { return settings.mode; };
    root.QwertyChords.setMode = setMode;
    root.QwertyChords.settings = function () { return JSON.parse(JSON.stringify(settings)); };
    root.QwertyChords.timings = function () { return timings.slice(); };
    root.QwertyChords.forget = forget;
    root.QwertyChords.stepInversion = stepInversion;
    root.QwertyChords.toggleWalk = toggleWalk;
    root.QwertyChords.parallelScale = parallelScale;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : this);
