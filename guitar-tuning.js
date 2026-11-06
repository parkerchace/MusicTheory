/**
 * THE GUITAR'S TUNING: one setting, every neck.
 *
 * What a fret sounds like depends on what the string is tuned to, so the neck,
 * the chord shapes placed on it and the Learn pages all have to agree. They
 * read it from here. Change it from any dropdown and every neck, every other
 * dropdown and the course follow, and it is still there next visit.
 *
 * On 'guitar-tuning:change' (window) listeners read current() afresh.
 * String 0 is the lowest (thickest), 5 the highest, in every list here.
 */
(function (root) {
    'use strict';

    var STORE_KEY = 'music-theory-guitar-tuning';
    var CUSTOM = 'custom';
    var HELP = 'Six notes, lowest string first, like D A D G A D. Octaves are optional: D2 A2 D3 G3 A3 D4.';

    var STANDARD_MIDI = [40, 45, 50, 55, 59, 64];   // E2 A2 D3 G3 B3 E4
    var PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    var LOWEST = 24, HIGHEST = 88;                  // C1 to E6: past these it is a typo, not a tuning

    var PRESETS = [
        { id: 'standard',   label: 'Standard',    notes: 'E A D G B E' },
        { id: 'e-flat',     label: 'E♭ standard', notes: 'Eb Ab Db Gb Bb Eb' },
        { id: 'd-standard', label: 'D standard',  notes: 'D G C F A D' },
        { id: 'drop-d',     label: 'Drop D',      notes: 'D A D G B E' },
        { id: 'drop-c',     label: 'Drop C',      notes: 'C G C F A D' },
        { id: 'dadgad',     label: 'DADGAD',      notes: 'D A D G A D' },
        { id: 'open-g',     label: 'Open G',      notes: 'D G D G B D' },
        { id: 'open-d',     label: 'Open D',      notes: 'D A D F# A D' },
        { id: 'open-e',     label: 'Open E',      notes: 'E B E G# B E' },
        { id: 'open-a',     label: 'Open A',      notes: 'E A E A C# E' },
        { id: 'open-c',     label: 'Open C',      notes: 'C G C G C E' },
        { id: 'fourths',    label: 'All fourths', notes: 'E A D G C F' }
    ];

    /**
     * Split typed text into six notes. A lower-case b after a note letter may be
     * a flat or the next string ("eadgbe" has G then B; "ebab" has E♭ then A♭),
     * so the reading has to come out at exactly six notes to be the right one.
     */
    function splitNotes(text) {
        var s = String(text == null ? '' : text).trim();
        if (!s || s.length > 40) return null;
        var found = null;
        (function walk(i, notes) {
            if (found) return;
            while (i < s.length && /[\s,\/|-]/.test(s[i])) i++;
            if (i >= s.length) { if (notes.length === 6) found = notes; return; }
            if (notes.length === 6 || !/[A-Ga-g]/.test(s[i])) return;
            var letter = s[i].toUpperCase();
            var finish = function (acc, j) {
                var octave = /[0-8]/.test(s[j] || '') ? parseInt(s[j], 10) : null;
                walk(octave === null ? j : j + 1, notes.concat([{ letter: letter, acc: acc, octave: octave }]));
            };
            var ch = s[i + 1];
            if (ch === '#' || ch === '♯') { finish(1, i + 2); return; }
            if (ch === '♭' || ch === 'b') finish(-1, i + 2);
            finish(0, i + 1);
        })(0, []);
        return found;
    }

    /** Typed text to a tuning, or null. A note without an octave sits nearest that string's standard pitch. */
    function parse(text) {
        var notes = splitNotes(text);
        if (!notes) return null;
        var midi = [], prev = -Infinity;
        for (var i = 0; i < 6; i++) {
            var n = notes[i], pc = ((PC[n.letter] + n.acc) % 12 + 12) % 12, m;
            if (n.octave !== null) {
                m = (n.octave + 1) * 12 + PC[n.letter] + n.acc;
            } else {
                // within -6..+5 semitones of standard, then never below the string before it
                var up = ((pc - STANDARD_MIDI[i]) % 12 + 12) % 12;
                m = STANDARD_MIDI[i] + (up > 5 ? up - 12 : up);
                if (m < prev) m += 12;
            }
            if (m < LOWEST || m > HIGHEST) return null;
            midi.push(m);
            prev = m;
        }
        return {
            midi: midi,
            names: notes.map(function (n) { return n.letter + (n.acc > 0 ? '#' : n.acc < 0 ? 'b' : ''); })
        };
    }

    function pretty(name) { return String(name).replace(/#/g, '♯').replace(/b/g, '♭'); }

    /** The full description of a tuning, as current() hands it out. */
    function build(id, label, text) {
        var p = parse(text);
        if (!p) return null;
        return {
            id: id,
            label: label,
            text: text,
            midi: p.midi,
            names: p.names,                  // ['Eb', ...]: as note names are written in code
            display: p.names.map(pretty)     // ['E♭', ...]: as they are shown
        };
    }

    function presetById(id) {
        for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i];
        return null;
    }

    function storage() {
        try { return root.localStorage || null; } catch (_) { return null; }
    }

    var current = build(PRESETS[0].id, PRESETS[0].label, PRESETS[0].notes);
    var lastTyped = '';   // the typed tuning, kept while a preset is on so it can be picked again

    function restore() {
        var saved = null;
        try {
            var st = storage();
            saved = st && JSON.parse(st.getItem(STORE_KEY) || 'null');
        } catch (_) {}
        if (!saved) return;
        if (typeof saved.typed === 'string' && parse(saved.typed)) lastTyped = saved.typed;
        var preset = presetById(saved.id);
        if (preset) current = build(preset.id, preset.label, preset.notes);
        else if (saved.id === CUSTOM && lastTyped) current = build(CUSTOM, 'Custom', lastTyped);
    }

    function publish() {
        try {
            var st = storage();
            if (st) st.setItem(STORE_KEY, JSON.stringify({ id: current.id, typed: lastTyped }));
        } catch (_) {}
        try {
            if (root.dispatchEvent && root.CustomEvent) {
                root.dispatchEvent(new root.CustomEvent('guitar-tuning:change', { detail: current }));
            }
        } catch (_) {}
    }

    /** Pick a preset by id. */
    function select(id) {
        var preset = presetById(id);
        if (!preset) return false;
        if (current.id === id) return true;
        current = build(preset.id, preset.label, preset.notes);
        publish();
        return true;
    }

    /** Use a typed tuning. False, and nothing changes, if it cannot be read. */
    function type(text) {
        var next = build(CUSTOM, 'Custom', String(text == null ? '' : text).trim());
        if (!next) return false;
        lastTyped = next.text;
        current = next;
        publish();
        return true;
    }

    /**
     * The dropdown. Its last option opens a box to type a tuning into, which
     * starts from the tuning already on so one string can simply be changed.
     * It always shows the shared setting, so any number can be on the page.
     *
     * @param {{label?: string}} [opts] a visible caption; none in tight spots
     */
    function control(opts) {
        opts = opts || {};
        var doc = root.document;
        var wrap = doc.createElement('span');
        wrap.className = 'gt-control';

        var sel = doc.createElement('select');
        sel.className = 'gt-select';
        sel.setAttribute('aria-label', 'Guitar tuning');
        PRESETS.forEach(function (p) {
            var o = doc.createElement('option');
            o.value = p.id;
            o.textContent = p.label;
            o.title = build(p.id, p.label, p.notes).display.join(' ');
            sel.appendChild(o);
        });
        var own = doc.createElement('option');
        own.value = CUSTOM;
        own.textContent = 'Type your own…';
        sel.appendChild(own);

        if (opts.label) {
            var cap = doc.createElement('label');
            cap.className = 'gt-caption';
            cap.textContent = opts.label + ' ';
            cap.appendChild(sel);
            wrap.appendChild(cap);
        } else {
            wrap.appendChild(sel);
        }

        var box = doc.createElement('input');
        box.type = 'text';
        box.className = 'gt-custom';
        box.placeholder = 'D A D G A D';
        box.title = HELP;
        box.setAttribute('aria-label', 'Type a tuning');
        box.spellcheck = false;
        box.autocomplete = 'off';
        wrap.appendChild(box);

        var markBad = function (bad) {
            box.classList.toggle('gt-bad', bad);
            box.setCustomValidity(bad ? HELP : '');
        };
        var sync = function () {
            sel.value = current.id;
            sel.title = 'Guitar tuning: ' + current.display.join(' ');
            box.hidden = current.id !== CUSTOM;
            // never rewrite what someone is in the middle of typing
            if (doc.activeElement !== box) {
                box.value = current.id === CUSTOM ? current.text : '';
                markBad(false);
            }
        };

        sel.addEventListener('change', function () {
            if (sel.value !== CUSTOM) { select(sel.value); return; }
            type(lastTyped || current.display.join(' '));
            box.focus();
            box.select();
        });
        // Each keystroke that makes a whole tuning retunes the neck, so the
        // result shows while there is still something to correct.
        box.addEventListener('input', function () {
            var text = box.value.trim();
            markBad(!parse(text));
            if (!box.classList.contains('gt-bad') && text !== current.text) type(text);
        });
        box.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                if (box.classList.contains('gt-bad')) box.reportValidity();
                else box.blur();
            } else if (e.key === 'Escape') {
                box.value = current.text;
                markBad(false);
                box.blur();
            }
        });
        // left half-typed, the box goes back to the tuning that is actually on
        box.addEventListener('blur', function () {
            if (box.classList.contains('gt-bad')) box.value = current.text;
            markBad(false);
        });

        root.addEventListener('guitar-tuning:change', sync);
        sync();
        return wrap;
    }

    restore();

    root.GuitarTuning = {
        PRESETS: PRESETS,
        STANDARD_MIDI: STANDARD_MIDI,
        HELP: HELP,
        parse: parse,
        current: function () { return current; },
        midi: function () { return current.midi.slice(); },
        select: select,
        type: type,
        control: control
    };
})(typeof window !== 'undefined' ? window : this);
