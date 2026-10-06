/**
 * @module QwertyKeys
 * @description Play the studio's instruments from the computer keyboard,
 * laid out the way FL Studio lays it out.
 *
 *   Z S X D C V G B H N J M , L . ; /      C … E   (from the base octave, C3)
 *   Q 2 W 3 E R 5 T 6 Y 7 U I 9 O 0 P [ = ]  C … G   one octave up
 *
 * Keys are read by physical position (KeyboardEvent.code), so the shape is
 * the same on AZERTY or Dvorak; the letters drawn on the piano are whatever
 * that position types on the user's own layout.
 *
 * ACTIVATION — it must never eat typing.
 *   idle   nothing plays. Touching an instrument (a piano key, a fret, the
 *          dock) arms it, and so does ` or the ⌨ chip. On a Learn page that
 *          listens for notes it is live without arming.
 *   armed  mapped keys play. Escape, ` or the chip disarm it; going back to
 *          the landing page does too.
 *   paused armed, but focus is in a text field or a dialog is open, so keys
 *          go where they always went. Leaving the field resumes it.
 *   Typing several mapped keys quickly while idle does not start playing: the
 *   chip asks once, and the answer is remembered.
 *
 * ROUTING — one path for every listener.
 *   Notes go through the MIDI manager as input 'qwerty' (silently — this file
 *   makes the sound), so whatever listens to a hardware keyboard — the dock
 *   piano and fretboard, Learn Piano Notes, Learn Chords, Learn Scales —
 *   hears the typing keyboard too. The sound follows the instrument last
 *   touched: the sampled piano, or the guitar engine.
 *
 * The core (layout, editable detection, the activation reducer) is pure and
 * exported as QwertyKeys.core so it can be tested without a browser.
 */
(function (root) {
    'use strict';

    /* ==================================================================
       CORE — no DOM
       ================================================================== */
    var LOWER = ['KeyZ', 'KeyS', 'KeyX', 'KeyD', 'KeyC', 'KeyV', 'KeyG', 'KeyB', 'KeyH', 'KeyN', 'KeyJ', 'KeyM',
                 'Comma', 'KeyL', 'Period', 'Semicolon', 'Slash'];
    var UPPER = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7', 'KeyU',
                 'KeyI', 'Digit9', 'KeyO', 'Digit0', 'KeyP', 'BracketLeft', 'Equal', 'BracketRight'];

    // What each position prints on a US layout, for when the browser cannot
    // tell us the user's own layout.
    var QWERTY_LABEL = {
        Comma: ',', Period: '.', Semicolon: ';', Slash: '/', BracketLeft: '[', BracketRight: ']', Equal: '='
    };

    var BLACK = { 1: true, 3: true, 6: true, 8: true, 10: true };

    var KEYMAP = {};   // code -> semitone offset from the base
    LOWER.forEach(function (c, i) { KEYMAP[c] = i; });
    UPPER.forEach(function (c, i) { KEYMAP[c] = 12 + i; });

    var MIN_BASE = 24;    // C1
    var MAX_BASE = 72;    // C5: the top row then reaches G6
    var DEFAULT_BASE = 48;   // C3

    function noteFor(code, base) {
        var off = KEYMAP[code];
        return off == null ? null : base + off;
    }

    /**
     * Where a key sits: its row, its semitone within that row, and for the
     * white keys their index (0 = the C the row starts on). A black key also
     * says which white key is to its right — chord mode plays that degree's
     * secondary dominant there.
     */
    function positionOf(code) {
        var row = LOWER.indexOf(code) !== -1 ? 'lower' : (UPPER.indexOf(code) !== -1 ? 'upper' : null);
        if (!row) return null;
        var semi = (row === 'lower' ? LOWER : UPPER).indexOf(code);
        var whiteBefore = 0;
        for (var i = 0; i < semi; i++) if (!BLACK[i % 12]) whiteBefore++;
        var black = !!BLACK[semi % 12];
        return {
            row: row,
            semitone: semi,
            black: black,
            whiteIndex: black ? null : whiteBefore,
            rightWhiteIndex: black ? whiteBefore : null
        };
    }

    function label(code, layoutMap) {
        var k = layoutMap && typeof layoutMap.get === 'function' ? layoutMap.get(code) : null;
        if (k) return String(k).toUpperCase();
        if (QWERTY_LABEL[code]) return QWERTY_LABEL[code];
        if (/^Key[A-Z]$/.test(code)) return code.slice(3);
        if (/^Digit\d$/.test(code)) return code.slice(5);
        return '';
    }

    /**
     * midi -> letter, for drawing on the piano. Where the rows overlap (the
     * top of the bottom row and the bottom of the top row sound the same
     * notes) the top row's letter is shown, since that is where the hand
     * naturally continues.
     */
    function hintsFor(base, layoutMap) {
        var out = {};
        LOWER.forEach(function (c, i) { out[base + i] = label(c, layoutMap); });
        UPPER.forEach(function (c, i) { out[base + 12 + i] = label(c, layoutMap); });
        return out;
    }

    function clampBase(b) { return Math.max(MIN_BASE, Math.min(MAX_BASE, b)); }
    function clampVelocity(v) { return Math.max(20, Math.min(127, Math.round(v))); }

    function noteName(midi) {
        var names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
    }

    /** Fields that take typed text. A key pressed there is typing, never a note. */
    var TEXT_TYPES = { text: 1, search: 1, email: 1, password: 1, url: 1, tel: 1, number: 1,
                       date: 1, 'datetime-local': 1, month: 1, time: 1, week: 1 };
    function isEditable(el) {
        if (!el || el.nodeType !== 1) return false;
        var tag = String(el.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'select') return true;
        if (tag === 'input') {
            var t = String(el.type || el.getAttribute && el.getAttribute('type') || 'text').toLowerCase();
            return !!TEXT_TYPES[t];
        }
        if (el.isContentEditable) return true;
        var role = el.getAttribute && el.getAttribute('role');
        return role === 'textbox' || role === 'combobox' || role === 'searchbox' || role === 'spinbutton';
    }

    /** Controls that use the arrow keys themselves (sliders, selects, tabs). */
    function ownsArrows(el) {
        if (!el || el.nodeType !== 1) return false;
        if (isEditable(el)) return true;
        var tag = String(el.tagName || '').toLowerCase();
        if (tag === 'input' && String(el.type).toLowerCase() === 'range') return true;
        var role = el.getAttribute && el.getAttribute('role');
        return role === 'slider' || role === 'separator' || role === 'tab' || role === 'listbox' || role === 'menu';
    }

    /**
     * The activation reducer. State:
     *   mode      'idle' | 'armed'
     *   auto      arm by itself when an instrument is touched (setting)
     *   optIn     the user said yes to the keyboard once: a mapped key arms it
     *   declined  the user said no: never ask again (` still works)
     *   prompting the chip is asking
     *   cold      timestamps of recent mapped keys pressed while idle
     */
    var COLD_WINDOW = 1500;
    var COLD_COUNT = 3;

    function initialState(saved) {
        saved = saved || {};
        return {
            mode: 'idle',
            auto: saved.auto !== false,
            optIn: !!saved.optIn,
            declined: !!saved.declined,
            prompting: false,
            cold: []
        };
    }

    function reduce(s, ev) {
        var n = {
            mode: s.mode, auto: s.auto, optIn: s.optIn, declined: s.declined,
            prompting: s.prompting, cold: (s.cold || []).slice()
        };
        switch (ev.type) {
            case 'toggle':
                n.mode = s.mode === 'armed' ? 'idle' : 'armed';
                n.prompting = false;
                n.cold = [];
                break;
            case 'engage':
                if (s.mode === 'idle' && s.auto) n.mode = 'armed';
                break;
            case 'escape':
            case 'leave':
                n.mode = 'idle';
                n.prompting = false;
                n.cold = [];
                break;
            case 'coldkey':
                if (s.mode !== 'idle' || !s.auto || s.prompting) break;
                if (s.optIn) { n.mode = 'armed'; n.cold = []; break; }
                if (s.declined) break;
                n.cold = n.cold.filter(function (t) { return ev.t - t <= COLD_WINDOW; }).concat([ev.t]);
                if (n.cold.length >= COLD_COUNT) { n.prompting = true; n.cold = []; }
                break;
            case 'accept':
                n.prompting = false; n.optIn = true; n.declined = false; n.mode = 'armed';
                break;
            case 'decline':
                n.prompting = false; n.declined = true; n.cold = [];
                break;
            case 'auto':
                n.auto = !!ev.value;
                if (!n.auto) n.prompting = false;
                break;
        }
        return n;
    }

    /** Is a key press live, given the state and where the user is? */
    function isLive(s, surface) {
        if (s.mode === 'armed') return !!surface;
        return s.auto && surface === 'learn';
    }

    var core = {
        LOWER: LOWER, UPPER: UPPER, KEYMAP: KEYMAP,
        MIN_BASE: MIN_BASE, MAX_BASE: MAX_BASE, DEFAULT_BASE: DEFAULT_BASE,
        noteFor: noteFor, positionOf: positionOf, label: label, hintsFor: hintsFor,
        clampBase: clampBase, clampVelocity: clampVelocity, noteName: noteName,
        isEditable: isEditable, ownsArrows: ownsArrows,
        initialState: initialState, reduce: reduce, isLive: isLive,
        COLD_WINDOW: COLD_WINDOW, COLD_COUNT: COLD_COUNT
    };

    root.QwertyKeys = { core: core };

    if (typeof document === 'undefined' || !document.addEventListener) return;

    /* ==================================================================
       RUNTIME
       ================================================================== */
    var PREFS_KEY = 'music-theory-qwerty';
    var HINTED_KEY = 'music-theory-qwerty-hinted';

    function readPrefs() {
        try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function writePrefs() {
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify({
                auto: S.auto, optIn: S.optIn, declined: S.declined, bases: bases, velocity: velocity
            }));
        } catch (e) { /* private mode */ }
    }

    var prefs = readPrefs();
    var S = initialState(prefs);
    // Each way of playing keeps its own octave: notes and chords start at C3,
    // a harmonized melody at C4, where there is room for a chord under it.
    var BASE_DEFAULTS = { notes: DEFAULT_BASE, harmonize: DEFAULT_BASE + 12 };
    var bases = (function () {
        var saved = prefs.bases || {};
        if (typeof prefs.base === 'number' && typeof saved.notes !== 'number') saved.notes = prefs.base;
        return {
            notes: clampBase(typeof saved.notes === 'number' ? saved.notes : BASE_DEFAULTS.notes),
            harmonize: clampBase(typeof saved.harmonize === 'number' ? saved.harmonize : BASE_DEFAULTS.harmonize)
        };
    })();
    var velocity = clampVelocity(typeof prefs.velocity === 'number' ? prefs.velocity : 100);
    var held = new Map();        // code -> [midi]  (a MIDI keyboard's notes as 'midi:<n>')
    var sounding = new Map();    // midi -> engine
    var instrument = null;       // 'piano' | 'guitar', the one last touched
    var layoutMap = null;
    var chordSource = null;      // set by chord mode: (code, event) -> {midis, ...} | null
    var harmonizer = null;       // set by chord mode: { active(e), harmonize(midi, info), linger() }
    var keyControl = null;       // set by chord mode: (code, event) -> true when a key that plays no note was its control
    var melodyCodes = new Set(); // keys held as melody while harmonizing
    var externalCodes = new Set(); // ...of which a MIDI keyboard plays (and lights) the note itself
    var harmonyNotes = [];       // the chord sounding under them
    var lingerTimer = null;      // the chord ringing on after the melody let go
    var settleTimer = null;      // a passing note still held once it has settled gets its own chord

    /** Which octave the keys use: the harmonized melody's, or the notes' (which chords share). */
    function baseMode() {
        var qc = root.QwertyChords;
        return qc && qc.mode && qc.mode() === 'harmonize' ? 'harmonize' : 'notes';
    }
    function getBase() { return bases[baseMode()]; }

    if (navigator.keyboard && typeof navigator.keyboard.getLayoutMap === 'function') {
        navigator.keyboard.getLayoutMap().then(function (m) { layoutMap = m; refreshHints(); }).catch(function () {});
    }

    function dispatch(ev) {
        var before = S;
        S = reduce(S, ev);
        if (before.mode === 'armed' && S.mode !== 'armed') releaseAll();
        if (S.auto !== before.auto || S.optIn !== before.optIn || S.declined !== before.declined) writePrefs();
        if (S.mode === 'armed' && before.mode !== 'armed') firstUseHint();
        render();
    }

    /* ---------- where is the user? ------------------------------------ */
    function shown(el) { return !!el && el.getClientRects().length > 0; }

    function surface() {
        var ws = document.querySelector('.workspace');
        var dock = document.getElementById('instrument-dock-root');
        if (ws && ws.style.display !== 'none' && shown(dock)) return 'studio';
        var learn = ['learn-piano-page', 'learn-chords-page', 'learn-scales-page'];
        for (var i = 0; i < learn.length; i++) {
            if (shown(document.getElementById(learn[i]))) return 'learn';
        }
        return null;
    }

    function dialogOpen() {
        var ov = document.getElementById('tutorial-overlay');
        if (ov && ov.classList.contains('active')) return true;
        var sp = document.getElementById('scale-picker-modal');
        if (sp && sp.style.display && sp.style.display !== 'none') return true;
        if (document.querySelector('.look-popover.open')) return true;
        var wsp = document.getElementById('word-settings-panel');
        if (wsp && wsp.style.display && wsp.style.display !== 'none') return true;
        return false;
    }

    function typingFocused() {
        return isEditable(document.activeElement);
    }

    /** The instrument the sound follows: the one last touched, or the one on screen. */
    function currentInstrument() {
        if (instrument) return instrument;
        var dock = document.getElementById('instrument-dock-root');
        if (dock && dock.classList.contains('dock-mode-guitar')) return 'guitar';
        return 'piano';
    }

    /* ---------- sound + light ----------------------------------------- */
    function engineFor(inst) {
        var app = root.modularApp;
        if (!app) return null;
        if (inst === 'guitar' && app.guitarEngine) return app.guitarEngine;
        return app.audioEngine || null;
    }

    function soundOn(midi, vel) {
        var eng = engineFor(currentInstrument());
        if (!eng || typeof eng.playNote !== 'function') return;
        try { if (typeof eng.resume === 'function') eng.resume(); } catch (e) {}
        var v = vel / 127;
        try {
            if (typeof root.EnhancedAudioEngine !== 'undefined' && eng instanceof root.EnhancedAudioEngine) {
                eng.playNote(midi, { duration: 10, velocity: v });      // >= 5s: held until stopNote
            } else if (typeof eng.stopNote === 'function') {
                eng.playNote(midi, 10.0, 0, v);                        // held until stopNote
            } else {
                eng.playNote(midi, 0.8, 0, v);                         // an engine that cannot stop a note
            }
            sounding.set(midi, eng);
        } catch (e) { /* the instrument's own problem */ }
    }

    function soundOff(midi) {
        var eng = sounding.get(midi);
        sounding.delete(midi);
        if (eng && typeof eng.stopNote === 'function') {
            try { eng.stopNote(midi); } catch (e) {}
        }
    }

    function lightOn(midi, vel) {
        var app = root.modularApp;
        var mm = app && app.midiManager;
        if (mm && typeof mm.noteOn === 'function') {
            mm.noteOn(midi, vel, 'qwerty', { silent: true });
            return;
        }
        // No MIDI manager: light the instruments directly.
        if (app && app.pianoVisualizer && app.pianoVisualizer.midiNoteOn) app.pianoVisualizer.midiNoteOn(midi);
        if (app && app.guitarFretboard && app.guitarFretboard.midiNoteOn) app.guitarFretboard.midiNoteOn(midi);
    }

    function lightOff(midi) {
        var app = root.modularApp;
        var mm = app && app.midiManager;
        if (mm && typeof mm.noteOff === 'function') {
            mm.noteOff(midi, 'qwerty', { silent: true });
            return;
        }
        if (app && app.pianoVisualizer && app.pianoVisualizer.midiNoteOff) app.pianoVisualizer.midiNoteOff(midi);
        if (app && app.guitarFretboard && app.guitarFretboard.midiNoteOff) app.guitarFretboard.midiNoteOff(midi);
    }

    function stillHeld(midi, exceptCode) {
        var found = false;
        held.forEach(function (midis, code) {
            if (code !== exceptCode && midis.indexOf(midi) !== -1) found = true;
        });
        return found;
    }

    function keepOnScreen(lo, hi) {
        var pv = root.modularApp && root.modularApp.pianoVisualizer;
        if (pv && typeof pv.ensureMidiVisible === 'function') {
            try { pv.ensureMidiVisible(lo, hi); } catch (e) {}
        }
    }

    function melodyPitchHeld(p, exceptCode) {
        var found = false;
        melodyCodes.forEach(function (c) {
            if (c !== exceptCode && held.has(c) && held.get(c)[0] === p) found = true;
        });
        return found;
    }

    /** The highest melody note held: the one the harmony serves. */
    function melodyTop() {
        var top = null;
        melodyCodes.forEach(function (c) {
            var p = held.get(c)[0];
            if (!top || p > top.midi) top = { code: c, midi: p };
        });
        return top;
    }

    /** The piano marks the melody, so the tune stands out from its chord. */
    function markMelody() {
        var pv = root.modularApp && root.modularApp.pianoVisualizer;
        if (!pv || typeof pv.setMarkedNotes !== 'function') return;
        var ms = [];
        melodyCodes.forEach(function (c) { if (held.has(c)) ms.push(held.get(c)[0]); });
        try { pv.setMarkedNotes(ms); } catch (e) {}
    }

    /** Move the chord under the melody to `next`, leaving common tones sounding. */
    function voiceHarmony(next, melody, vel) {
        var soft = clampVelocity((vel || velocity) * 0.72);   // the tune sings over its chord
        harmonyNotes.forEach(function (h) {
            if (next.indexOf(h) === -1 && h !== melody && !melodyPitchHeld(h)) { soundOff(h); lightOff(h); }
        });
        next.forEach(function (h) {
            if (harmonyNotes.indexOf(h) !== -1 && sounding.has(h)) return;   // already sounding: leave it
            if (melodyPitchHeld(h)) return;
            soundOn(h, soft);
            lightOn(h, soft);
        });
        harmonyNotes = next;
    }

    function cancelLinger() {
        if (lingerTimer) { clearTimeout(lingerTimer); lingerTimer = null; }
    }

    function cancelSettle() {
        if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    }

    /** The harmonizer let a note pass over the chord: ask again once it has settled, if it is still the tune. */
    function settleLater(code, info) {
        cancelSettle();
        if (!info || !(info.recheckIn > 0)) return;
        settleTimer = setTimeout(function () {
            settleTimer = null;
            var top = melodyTop();
            if (top && top.code === code && harmonizer) retarget();
        }, info.recheckIn);
    }

    /**
     * Harmonize mode: the keys are the melody and a chord goes under it.
     * The harmony belongs to the tune, not to one key:
     *  - it serves the highest melody note held, so a note added underneath
     *    is a second voice and the chord stays where it is;
     *  - a note that keeps the chord does not strike it again (legato stays
     *    legato);
     *  - when the last melody key lets go, the chord rings on for the
     *    harmonizer's linger time, and the next note takes over from it.
     * opts.midi/external/velocity: a MIDI keyboard's note, which sounds and
     * lights itself — only its chord is played here.
     */
    function pressMelody(code, e, opts) {
        opts = opts || {};
        var m = typeof opts.midi === 'number' ? opts.midi : noteFor(code, getBase());
        if (m == null || m < 21 || m > 108) return;
        var external = !!opts.external;
        var vel = typeof opts.velocity === 'number' ? clampVelocity(opts.velocity) : velocity;
        cancelLinger();
        var top = melodyTop();
        if (!top || m >= top.midi) cancelSettle();
        held.set(code, [m]);
        melodyCodes.add(code);
        if (external) externalCodes.add(code);

        if (top && m < top.midi) {
            // Under the tune: a second voice. The chord stays with the top note.
            if (!external) {
                if (sounding.has(m)) soundOff(m);
                soundOn(m, vel);
                lightOn(m, vel);
            }
            markMelody();
            root.dispatchEvent(new CustomEvent('qwerty:press', { detail: { code: code, midis: [m], melody: m, inner: true } }));
            return;
        }

        var info = harmonizer.harmonize(m, { othersHeld: melodyCodes.size - 1 }) || {};
        var next = (info.harmony || []).filter(function (h) { return h !== m; });
        voiceHarmony(next, m, vel);   // a MIDI keyboard's touch carries into its chord
        if (!external) {
            if (sounding.has(m)) soundOff(m);            // the melody is always struck
            soundOn(m, vel);
            lightOn(m, vel);
        }
        markMelody();
        var all = [m].concat(next);
        keepOnScreen(Math.min.apply(null, all), Math.max.apply(null, all));
        root.dispatchEvent(new CustomEvent('qwerty:press', { detail: { code: code, midis: all, info: info, melody: m } }));
        render(info);
        settleLater(code, info);
    }

    /** The top melody note let go while others are held: the chord moves under the new top. */
    function retarget() {
        var top = melodyTop();
        if (!top) return;
        var info = harmonizer.harmonize(top.midi, { othersHeld: melodyCodes.size - 1 }) || {};
        var next = (info.harmony || []).filter(function (h) { return h !== top.midi; });
        voiceHarmony(next, top.midi);
        markMelody();
        root.dispatchEvent(new CustomEvent('qwerty:press', {
            detail: { code: top.code, midis: [top.midi].concat(next), info: info, melody: top.midi, retarget: true }
        }));
        render(info);
        settleLater(top.code, info);
    }

    function releaseHarmony() {
        cancelLinger();
        cancelSettle();
        var had = harmonyNotes.length > 0;
        harmonyNotes.forEach(function (h) {
            if (melodyPitchHeld(h)) return;
            soundOff(h);
            lightOff(h);
        });
        harmonyNotes = [];
        if (had) root.dispatchEvent(new CustomEvent('qwerty:harmonyoff'));
    }

    function press(code, e) {
        if (harmonizer && harmonizer.active(e)) { pressMelody(code, e); return; }
        var midis = null, info = null;
        if (chordSource) {
            info = chordSource(code, e);
            // Chord mode says this key has nothing to play here (the black key
            // before a diminished chord): say why, and play nothing.
            if (info && info.none) { render(info); return; }
            if (info && info.midis && info.midis.length) midis = info.midis.slice();
        }
        if (!midis) {
            var m = noteFor(code, getBase());
            if (m == null || m < 21 || m > 108) return;
            midis = [m];
        }
        held.set(code, midis);
        midis.forEach(function (m) {
            if (sounding.has(m)) soundOff(m);   // retrigger
            soundOn(m, velocity);
            lightOn(m, velocity);
        });
        keepOnScreen(Math.min.apply(null, midis), Math.max.apply(null, midis));
        root.dispatchEvent(new CustomEvent('qwerty:press', { detail: { code: code, midis: midis, info: info } }));
        render(info);
    }

    function release(code) {
        var midis = held.get(code);
        if (!midis) return;
        if (melodyCodes.has(code)) {
            var m = midis[0];
            var external = externalCodes.has(code);
            var wasTop = melodyTop();
            if (wasTop && wasTop.code === code) cancelSettle();
            held.delete(code);
            melodyCodes.delete(code);
            externalCodes.delete(code);
            // A MIDI keyboard's note stops itself; a copy of it sounding here
            // (it was in the chord when it was played) stops with it.
            if (harmonyNotes.indexOf(m) === -1 && !stillHeld(m, code) && (!external || sounding.has(m))) {
                soundOff(m);
                lightOff(m);
            }
            var lingering = false;
            if (!melodyCodes.size) {
                var ms = harmonizer && harmonizer.linger ? harmonizer.linger() : 0;
                if (ms > 0 && harmonyNotes.length) {
                    lingering = true;
                    if (isFinite(ms)) lingerTimer = setTimeout(function () { lingerTimer = null; releaseHarmony(); }, ms);
                } else {
                    releaseHarmony();
                }
            }
            markMelody();
            root.dispatchEvent(new CustomEvent('qwerty:release', {
                detail: { code: code, midis: midis, melody: true, harmonySounding: lingering || melodyCodes.size > 0 }
            }));
            if (melodyCodes.size && wasTop && wasTop.code === code && harmonizer) retarget();
            return;
        }
        held.delete(code);
        midis.forEach(function (m) {
            if (stillHeld(m, code)) return;
            soundOff(m);
            lightOff(m);
        });
        root.dispatchEvent(new CustomEvent('qwerty:release', { detail: { code: code, midis: midis } }));
    }

    function releaseAll() {
        Array.from(held.keys()).forEach(release);
        releaseHarmony();
        Array.from(sounding.keys()).forEach(soundOff);
    }

    function setBase(b) {
        var nb = clampBase(b), mode = baseMode();
        if (nb === bases[mode]) return;
        releaseAll();
        bases[mode] = nb;
        writePrefs();
        keepOnScreen(nb, nb + 16);
        refreshHints();
        render();
    }

    function setVelocity(v) {
        velocity = clampVelocity(v);
        writePrefs();
        render();
    }

    /* ---------- keys --------------------------------------------------- */
    function consume(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }

    function onKeyDown(e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var code = e.code;
        if (isEditable(e.target) || typingFocused()) { if (S.mode === 'armed') render(); return; }
        var where = surface();
        if (!where || dialogOpen()) return;

        if (code === 'Backquote') {
            if (e.repeat) { consume(e); return; }
            dispatch({ type: 'toggle' });
            consume(e);
            return;
        }

        if (!isLive(S, where)) {
            if (KEYMAP[code] == null || e.repeat || where !== 'studio') return;
            dispatch({ type: 'coldkey', t: Date.now() });
            if (!isLive(S, where)) return;          // still idle: the chip may be asking
        }

        if (code === 'Escape') {
            if (S.mode === 'armed') dispatch({ type: 'escape' });
            return;                                  // let looks and panels close too
        }

        if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown') {
            if (ownsArrows(e.target)) return;
            consume(e);
            if (e.repeat && (code === 'ArrowLeft' || code === 'ArrowRight')) return;
            if (code === 'ArrowLeft') setBase(getBase() - 12);
            else if (code === 'ArrowRight') setBase(getBase() + 12);
            else if (code === 'ArrowUp') setVelocity(velocity + 10);
            else setVelocity(velocity - 10);
            return;
        }

        if (KEYMAP[code] == null) {
            // A key that plays no note may be one of chord mode's controls (A inversion, F walk).
            if (keyControl && keyControl(code, e)) consume(e);
            return;
        }
        consume(e);
        if (e.repeat || held.has(code)) return;
        press(code, e);
    }

    function onKeyUp(e) {
        if (held.has(e.code)) {
            release(e.code);
            consume(e);
        }
    }

    /* ---------- engagement -------------------------------------------- */
    function onPointerDown(e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('.qk-chip')) return;
        var guitar = t.closest('#guitar-fretboard-container, #guitar-dock-container, #instrument-pane-guitar');
        var piano = t.closest('#instrument-dock-root, #piano-container');
        if (!guitar && !piano) return;
        if (t.closest('.instrument-dock-settings')) return;   // the settings cog is not the instrument
        instrument = guitar ? 'guitar' : 'piano';
        dispatch({ type: 'engage' });
    }

    /* ---------- HUD ---------------------------------------------------- */
    var chip = null, chipState = null, chipOct = null, chipVel = null, chipPrompt = null, chipMode = null, chipReadout = null;

    function buildChip() {
        if (chip) return chip;
        chip = document.createElement('div');
        chip.className = 'qk-chip';
        chip.setAttribute('data-state', 'idle');

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'qk-toggle';
        toggle.title = 'Typing keyboard — Z…M and Q…P play notes · Shift: chords · A inversion · F walk inversions · ' +
            '← → octave · ↑ ↓ velocity · ` on/off · Esc stops';
        var glyph = document.createElement('span');
        glyph.setAttribute('aria-hidden', 'true');
        glyph.textContent = '⌨';
        chipState = document.createElement('span');
        chipState.className = 'qk-state';
        toggle.appendChild(glyph);
        toggle.appendChild(chipState);
        toggle.addEventListener('click', function () { dispatch({ type: 'toggle' }); });

        chipMode = document.createElement('span');
        chipMode.className = 'qk-mode';

        chipOct = document.createElement('button');
        chipOct.type = 'button';
        chipOct.className = 'qk-oct';
        chipOct.title = 'Octave of the bottom row (← → to change)';
        chipOct.addEventListener('click', function (e) {
            var b = getBase();
            setBase(e.shiftKey ? b - 12 : b + 12 > MAX_BASE ? MIN_BASE : b + 12);
        });

        chipVel = document.createElement('span');
        chipVel.className = 'qk-vel';
        chipVel.title = 'Velocity (↑ ↓ to change)';

        chipReadout = document.createElement('span');
        chipReadout.className = 'qk-readout';
        chipReadout.setAttribute('aria-live', 'polite');

        chipPrompt = document.createElement('div');
        chipPrompt.className = 'qk-prompt';
        chipPrompt.setAttribute('role', 'dialog');
        chipPrompt.setAttribute('aria-label', 'Play with your keyboard?');
        var q = document.createElement('span');
        q.textContent = 'Play the instruments with your keyboard?';
        var yes = document.createElement('button');
        yes.type = 'button';
        yes.textContent = 'Yes';
        yes.addEventListener('click', function () { dispatch({ type: 'accept' }); });
        var no = document.createElement('button');
        no.type = 'button';
        no.textContent = 'No';
        no.addEventListener('click', function () { dispatch({ type: 'decline' }); });
        chipPrompt.appendChild(q);
        chipPrompt.appendChild(yes);
        chipPrompt.appendChild(no);

        chip.appendChild(toggle);
        chip.appendChild(chipMode);
        chip.appendChild(chipOct);
        chip.appendChild(chipVel);
        chip.appendChild(chipReadout);
        chip.appendChild(chipPrompt);
        return chip;
    }

    /** In the studio the chip sits in the dock beside its cog; on a Learn page it floats. */
    function placeChip(where) {
        buildChip();
        var dockSettings = document.querySelector('#instrument-dock-root .instrument-dock-settings');
        if (where === 'studio' && dockSettings) {
            chip.classList.remove('qk-floating');
            if (chip.parentNode !== dockSettings) dockSettings.insertBefore(chip, dockSettings.firstChild);
        } else {
            chip.classList.add('qk-floating');
            if (chip.parentNode !== document.body) document.body.appendChild(chip);
        }
        chip.hidden = !where;
    }

    function displayState(where) {
        if (S.prompting) return 'prompt';
        if (!isLive(S, where)) return 'idle';
        if (typingFocused() || dialogOpen()) return 'paused';
        return 'live';
    }

    var STATE_WORDS = { idle: 'Keys', live: 'Live', paused: 'Paused', prompt: 'Keys?' };
    var shownBase = null;

    function render(info) {
        var where = surface();
        placeChip(where);
        var st = displayState(where);
        chip.setAttribute('data-state', st);
        chipState.textContent = STATE_WORDS[st];
        chip.querySelector('.qk-toggle').setAttribute('aria-pressed', String(S.mode === 'armed'));
        var b = getBase();
        if (b !== shownBase) {
            // a mode with its own octave: bring that octave into view
            if (shownBase !== null && isLive(S, where)) keepOnScreen(b, b + 16);
            shownBase = b;
        }
        chipOct.textContent = noteName(b);
        chipVel.textContent = 'v' + velocity;
        chipPrompt.hidden = !S.prompting;
        var chordOn = !!(root.QwertyChords && root.QwertyChords.active && root.QwertyChords.active());
        var melodyKind = !!(root.QwertyChords && root.QwertyChords.kind && root.QwertyChords.kind() === 'melody');
        chipMode.textContent = chordOn ? (melodyKind ? 'Harmonize' : 'Chords') : '';
        // With chord mode's own switch on the chip, that switch is the indicator.
        chipMode.hidden = !chordOn || !!chip.querySelector('.qk-modes');
        if (info && info.readout) chipReadout.textContent = info.readout;
        else if (!chordOn) chipReadout.textContent = '';
        refreshHints();
    }

    var hintsShown = false;
    function refreshHints() {
        var pv = root.modularApp && root.modularApp.pianoVisualizer;
        if (!pv || typeof pv.setKeyHints !== 'function') return;
        // Letters on the keys, except while the keys play chords by degree (the
        // chord strip shows those); a harmonized melody is still played by note.
        var chordKeys = root.QwertyChords && root.QwertyChords.active && root.QwertyChords.active() &&
            !(root.QwertyChords.kind && root.QwertyChords.kind() === 'melody');
        var want = isLive(S, surface()) && !chordKeys;
        if (want) { pv.setKeyHints(hintsFor(getBase(), layoutMap)); hintsShown = true; }
        else if (hintsShown) { pv.setKeyHints(null); hintsShown = false; }
    }

    function firstUseHint() {
        var seen = null;
        try { seen = localStorage.getItem(HINTED_KEY); } catch (e) {}
        if (seen || !chip) return;
        try { localStorage.setItem(HINTED_KEY, '1'); } catch (e) {}
        var tip = document.createElement('div');
        tip.className = 'qk-hint';
        tip.setAttribute('role', 'status');
        tip.textContent = 'Typing keyboard on: Z S X D C… play notes, Q 2 W 3 E… an octave up. ' +
            '← → octave · ↑ ↓ velocity · Shift for chords · Esc stops.';
        chip.appendChild(tip);
        setTimeout(function () { tip.remove(); }, 7000);
    }

    /* ---------- wiring ------------------------------------------------- */
    function init() {
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('blur', releaseAll);
        document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });
        document.addEventListener('focusin', function (e) {
            if (isEditable(e.target)) releaseAll();
            render();
        });
        document.addEventListener('focusout', function () { setTimeout(function () { render(); }, 0); });

        var home = document.getElementById('return-to-landing');
        if (home) home.addEventListener('click', function () { dispatch({ type: 'leave' }); });
        ['launch-workspace-btn', 'launch-selected-btn', 'launch-learn-notes-btn', 'launch-learn-chords-btn',
         'launch-learn-scales-btn'].forEach(function (id) {
            var b = document.getElementById(id);
            if (b) b.addEventListener('click', function () { setTimeout(function () { render(); }, 50); });
        });
        window.addEventListener('studio:lookchange', function () { render(); });

        // The dock's settings panel carries the one switch this has.
        var panel = document.getElementById('instrument-dock-settings-panel');
        if (panel && !document.getElementById('qwerty-auto-arm')) {
            var row = document.createElement('div');
            row.className = 'module-toggle-item';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.id = 'qwerty-auto-arm';
            cb.checked = S.auto;
            var lab = document.createElement('label');
            lab.htmlFor = 'qwerty-auto-arm';
            lab.textContent = 'Typing keyboard arms when I touch an instrument';
            cb.addEventListener('change', function () { dispatch({ type: 'auto', value: cb.checked }); });
            row.appendChild(cb);
            row.appendChild(lab);
            panel.appendChild(row);
        }

        render();
    }

    root.QwertyKeys.isLive = function () { return isLive(S, surface()); };
    root.QwertyKeys.state = function () {
        return { mode: S.mode, auto: S.auto, prompting: S.prompting, base: getBase(),
                 bases: { notes: bases.notes, harmonize: bases.harmonize }, velocity: velocity,
                 held: Array.from(held.keys()), display: displayState(surface()),
                 sounding: Array.from(sounding.keys()), harmony: harmonyNotes.slice(),
                 melody: Array.from(melodyCodes).map(function (c) { return held.get(c)[0]; }),
                 lingering: !!lingerTimer || (!melodyCodes.size && harmonyNotes.length > 0) };
    };
    root.QwertyKeys.arm = function () { if (S.mode !== 'armed') dispatch({ type: 'toggle' }); };
    root.QwertyKeys.disarm = function () { dispatch({ type: 'escape' }); };
    root.QwertyKeys.releaseAll = releaseAll;
    root.QwertyKeys.setChordSource = function (fn) { chordSource = fn; render(); };
    root.QwertyKeys.setHarmonizer = function (h) { harmonizer = h; render(); };
    root.QwertyKeys.setKeyControl = function (fn) { keyControl = fn; };
    /** Strike the held chords again as chord mode now voices them (its inversion changed). */
    root.QwertyKeys.revoice = function () {
        if (!chordSource) return;
        Array.from(held.keys()).forEach(function (code) {
            if (melodyCodes.has(code) || held.get(code).length < 2) return;
            release(code);
            press(code, null);
        });
    };
    root.QwertyKeys.harmony = function () { return harmonyNotes.slice(); };
    root.QwertyKeys.render = render;
    root.QwertyKeys.release = release;
    root.QwertyKeys.isHeld = function (code) { return held.has(code); };
    /**
     * A melody note from somewhere else (a MIDI keyboard), to be harmonized.
     * It sounds and lights itself; only its chord is played here.
     */
    root.QwertyKeys.melodyOn = function (id, midi, opts) {
        if (!harmonizer || typeof midi !== 'number') return;
        if (held.has(id)) release(id);
        opts = opts || {};
        pressMelody(id, null, { midi: midi, external: opts.external !== false, velocity: opts.velocity });
    };
    root.QwertyKeys.melodyOff = function (id) { if (held.has(id)) release(id); };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : this);
