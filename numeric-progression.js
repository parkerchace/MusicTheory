/**
 * numeric-progression.js
 *
 * Type a progression as numbers ("251", "2 5 1", "1 4 5", "I vi IV V") and get
 * real chords on the sheet — no word/semantic generation involved — with the
 * approach catalog available per chord.
 *
 * The number input previously had no handler at all: typing into it did
 * nothing. This module owns that input and reuses the same phrase pipeline the
 * generator uses (buildPhraseFromGeneratedMusic → applyGeneratedMusicToSheet),
 * so approach chords land on off-beats and the provenance panel populates for
 * free.
 */

(function () {
    'use strict';

    const state = {
        degrees: [],
        approaches: {},   // index -> { id, events, explain }
        key: null,
        scale: null,
        lastChords: []
    };

    function mt() { return (window.modularApp && window.modularApp.musicTheory) || null; }
    function scaleLib() { return (window.modularApp && window.modularApp.scaleLibrary) || null; }

    const INTERVAL_NAMES = ['P1','m2','M2','m3','M3','P4','TT','P5','m6','M6','m7','M7'];
    const ROMAN_BY_SEMITONE = {
        0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV',
        6: '#IV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII'
    };
    const ROMAN_TO_DEGREE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

    /**
     * Parse a progression. Tokens MUST be separated (space / comma / dash /
     * slash / pipe). Bare digit runs are deliberately NOT split: "251" is
     * ambiguous, and character-splitting mangles real chord symbols such as
     * "Bmaj7#5" into nonsense.
     *
     * Accepts, per token:
     *   scale degrees   1 4 5 6
     *   roman numerals  ii V I, bVII, #ivm7b5
     *   chord symbols   Bmaj7#5, F#m7, Cmaj7, Abdim7
     */
    function parseDegrees(text) {
        const raw = String(text || '').trim();
        if (!raw) return [];
        const tokens = raw.split(/[\s,|/]+/).map(t => t.trim()).filter(Boolean);
        const out = [];

        for (const tok of tokens) {
            // 1. Plain scale degree
            if (/^[1-7]$/.test(tok)) {
                out.push({ kind: 'degree', degree: parseInt(tok, 10), accidental: '', roman: tok, raw: tok });
                continue;
            }
            // 2. Roman numeral, optional accidental and quality suffix
            const rm = tok.match(/^([b#♭♯]*)([ivxIVX]+)(.*)$/);
            if (rm && ROMAN_TO_DEGREE[rm[2].toLowerCase()]) {
                let shift = 0;
                for (const ch of rm[1]) shift += (ch === '#' || ch === '♯') ? 1 : -1;
                out.push({
                    kind: 'roman',
                    degree: ROMAN_TO_DEGREE[rm[2].toLowerCase()],
                    accidental: rm[1] || '',
                    shift,
                    quality: (rm[3] || '').trim(),
                    minor: rm[2] === rm[2].toLowerCase(),
                    roman: tok,
                    raw: tok
                });
                continue;
            }
            // 3. Absolute chord symbol
            const cm = tok.match(/^([A-G][#b♯♭]?)(.*)$/);
            if (cm) {
                out.push({
                    kind: 'chord',
                    root: cm[1].replace('♯', '#').replace('♭', 'b'),
                    chordType: (cm[2] || '').trim(),
                    roman: tok,
                    raw: tok
                });
            }
        }
        return out;
    }

    /** Roman numeral + interval of a chord root relative to the key. */
    function analyzeInKey(root, chordType, key) {
        const theory = mt();
        const nv = theory && theory.noteValues;
        if (!nv || nv[root] == null || nv[key] == null) return { roman: '?', interval: '?', semitones: null };
        const semis = (((nv[root] - nv[key]) % 12) + 12) % 12;
        let roman = ROMAN_BY_SEMITONE[semis] || '?';
        const q = String(chordType || '');
        // Case carries quality: lowercase for minor/diminished, upper for major.
        if (/^m(?!aj)|dim|°|ø/.test(q)) roman = roman.toLowerCase();
        let suffix = '';
        if (/maj7/.test(q)) suffix = 'maj7';
        else if (/m7b5|ø/.test(q)) suffix = 'ø7';
        else if (/dim7/.test(q)) suffix = '°7';
        else if (/dim/.test(q)) suffix = '°';
        else if (/^m7/.test(q)) suffix = '7';
        else if (/^7|^9|^13/.test(q)) suffix = '7';
        return { roman: roman + suffix, interval: INTERVAL_NAMES[semis], semitones: semis };
    }

    function currentKeyScale() {
        const lib = scaleLib();
        // The #key-select dropdown next to the progression field is what the
        // user actually sets, so it wins over any stale internal key.
        const sel = document.getElementById('key-select');
        const key = (sel && sel.value)
            || state.key
            || (lib && typeof lib.getCurrentKey === 'function' ? lib.getCurrentKey() : null)
            || 'C';
        const scale = state.scale
            || (lib && typeof lib.getCurrentScale === 'function' ? lib.getCurrentScale() : null)
            || 'major';
        return { key, scale };
    }

    function buildChords() {
        const theory = mt();
        if (!theory) return [];
        const { key, scale } = currentKeyScale();
        const majorDeg = [0, 2, 4, 5, 7, 9, 11];

        return state.degrees.map((d) => {
            let chord = null;

            if (d.kind === 'chord') {
                // Absolute symbol: honour exactly what was typed.
                let notes = [];
                try { notes = theory.getChordNotes(d.root, d.chordType || 'maj') || []; } catch (_) {}
                if (!notes.length) {
                    try { notes = theory.getChordNotes(d.root, 'maj') || []; } catch (_) {}
                }
                chord = {
                    root: d.root,
                    chordType: d.chordType || 'maj',
                    chordNotes: notes,
                    diatonicNotes: notes,
                    fullName: d.raw
                };
            } else if (d.kind === 'roman' && (d.shift || d.quality)) {
                // Altered/■borrowed roman (bVII, #ivm7b5): build from the major
                // degree so it doesn't inherit the current mode's quality.
                const semis = majorDeg[(d.degree - 1) % 7] + (d.shift || 0);
                let root = key;
                try { root = theory.transposeNote(key, semis) || key; } catch (_) {}
                let type = d.quality || (d.minor ? 'm7' : 'maj7');
                let notes = [];
                try { notes = theory.getChordNotes(root, type) || []; } catch (_) {}
                if (!notes.length) {
                    type = d.minor ? 'm7' : 'maj7';
                    try { notes = theory.getChordNotes(root, type) || []; } catch (_) {}
                }
                chord = { root, chordType: type, chordNotes: notes, diatonicNotes: notes, fullName: `${root}${type === 'maj' ? '' : type}` };
            } else {
                try { chord = theory.getDiatonicChord(d.degree, key, scale); } catch (_) { chord = null; }
                if (chord) {
                    const notes = (chord.chordNotes && chord.chordNotes.length) ? chord.chordNotes : (chord.diatonicNotes || []);
                    chord = { ...chord, chordNotes: notes, diatonicNotes: notes };
                }
            }
            if (!chord || !chord.root) return null;

            // Every chord carries its function relative to the key so the sheet
            // and the provenance panel can lead with roman numerals + intervals
            // rather than raw symbols.
            const an = analyzeInKey(chord.root, chord.chordType, key);
            return {
                ...chord,
                roman: an.roman,
                typedAs: d.raw,
                degree: d.degree || null,
                interval: an.interval,
                semitonesFromTonic: an.semitones
            };
        }).filter(Boolean);
    }

    /**
     * Assemble the chord sequence (one chord per bar) plus any approach runs,
     * which steal the tail of the PRECEDING bar so they lead into their target.
     */
    function buildSequence(chords, beatsPerBar) {
        const seq = [];
        chords.forEach((chord, i) => {
            const approach = state.approaches[i];

            if (approach && approach.events && approach.events.length && i > 0) {
                const steal = approach.events.reduce((s, e) => s + (e.duration || 0.5), 0);
                const prevIdx = seq.map(e => e.bar).lastIndexOf(i - 1);
                if (prevIdx >= 0 && seq[prevIdx].duration > steal) {
                    seq[prevIdx].duration -= steal;
                    let beat = beatsPerBar - steal;
                    approach.events.forEach((ev) => {
                        seq.push({
                            bar: i - 1,
                            beat,
                            duration: ev.duration || 0.5,
                            chord: ev.fullName,
                            chordObj: ev,
                            roman: ev.roman || 'appr',
                            scaleHint: ev.scaleHint || null,
                            scaleHintNotes: (ev.scaleHint && ev.scaleHint.scaleNotes) || null,
                            explain: ev.explain || approach.explain || null,
                            approachStrategy: approach.id,
                            approachFamily: approach.family || 'approach',
                            energy: 0.7,
                            texture: 'STACCATO'
                        });
                        beat += ev.duration || 0.5;
                    });
                }
            }

            seq.push({
                bar: i,
                beat: 0,
                duration: beatsPerBar,
                chord: chord.fullName,
                chordObj: chord,
                roman: chord.roman,
                interval: chord.interval,
                typedAs: chord.typedAs,
                energy: 0.5,
                texture: 'PAD'
            });
        });
        seq.sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat));
        return seq;
    }

    /**
     * Voicing is owned by the sheet's system (VoiceLeadingEngine + the Voicing /
     * Register / Voice-leading-mode controls). This module does NOT implement a
     * second voicer — a parallel one drifts out of sync and overrides the more
     * capable one. It only forwards the sheet's settings and validates the
     * result, since a wrong notehead must never reach the staff.
     */
    const STYLE_ALIASES = {
        smart: 'close', smooth: 'close', piano: 'close',
        open: 'spread', jazz: 'spread'
    };

    function applyVoiceLeading(seq) {
        const theory = mt();
        if (typeof VoiceLeadingEngine === 'undefined' || !theory) return;
        const sheet = (window.modularApp && window.modularApp.sheetMusicGenerator) || window.sheetMusicGenerator || null;
        const st = (sheet && sheet.state) || {};

        // `voiceLeading` toggles SMOOTH LEADING BETWEEN chords — it does not
        // mean "don't voice". Returning early on it (its default is false)
        // silently discarded the Voicing and Register settings entirely.
        const smoothLeading = st.voiceLeading !== false;
        const rawStyle = st.autoVoicingAll ? (st.voicingLogic || 'smart') : (st.voicingStyle || 'close');
        const style = STYLE_ALIASES[rawStyle] || rawStyle;
        const register = st.voicingRegister || 'mid';
        const overrides = window.__chordVoicingOverrides || {};

        const nameOf = (midi) => (sheet && typeof sheet._midiToNoteName === 'function')
            ? sheet._midiToNoteName(midi) : null;

        /** Reject any voicing containing pitches the chord does not have. */
        const validate = (midis, chordNotes) => {
            const pcs = new Set(chordNotes
                .map(n => theory.noteValues[String(n).replace(/-?\d+$/, '')])
                .filter(Number.isFinite));
            if (!pcs.size) return false;
            const voiced = midis.filter(Number.isFinite);
            if (!voiced.length) return false;
            if (!voiced.every(m => pcs.has(((m % 12) + 12) % 12))) return false;
            // Must express EVERY tone of the chord (up to four voices). The
            // engine's optimal-voicing search sometimes doubles a tone and
            // drops the 7th, which quietly changes the chord's quality.
            const distinct = new Set(voiced.map(m => ((m % 12) + 12) % 12)).size;
            return distinct >= Math.min(4, pcs.size);
        };

        try {
            const engine = new VoiceLeadingEngine(theory);
            const symbols = seq.map(e => e.chord);
            // With smooth leading on, voice the sequence as a whole so motion
            // between chords is minimized (and VL Combos' multi mode can search
            // wider). With it off, voice each chord independently in the chosen
            // style so the style/register still apply.
            let voicings;
            if (smoothLeading) {
                voicings = engine.generateVoiceLeading(symbols, {
                    voicing: style,
                    register,
                    mode: st.voiceLeadingMode || 'single',
                    variant: st.vlCombosVariant || 'v2'
                });
            } else {
                voicings = symbols.map((sym) => {
                    try {
                        const one = engine.generateVoiceLeading([sym], { voicing: style, register });
                        return (one && one[0]) || null;
                    } catch (_) { return null; }
                });
            }
            if (!voicings) return;

            let rejected = 0;
            seq.forEach((ev, i) => {
                const o = overrides[ev.bar];
                let v = voicings[i];
                if (o && o.voicing) {
                    try {
                        const single = engine.generateVoiceLeading([ev.chord], {
                            voicing: STYLE_ALIASES[o.voicing] || o.voicing,
                            register: o.register || register
                        });
                        if (single && single[0]) v = single[0];
                    } catch (_) {}
                }
                if (!v || !v.voices) return;

                const midis = Object.values(v.voices).filter(Number.isFinite);
                const chordNotes = (ev.chordObj && (ev.chordObj.chordNotes || ev.chordObj.diatonicNotes)) || [];
                if (!validate(midis, chordNotes)) { rejected++; return; }

                ev.voicing = v.voices;
                ev.voicingStyle = (o && o.voicing) || style;
                const named = midis.map(nameOf).filter(Boolean);
                if (named.length && ev.chordObj) {
                    ev.chordObj = { ...ev.chordObj, diatonicNotes: named };
                }
            });
            if (rejected) {
                console.warn(`[NumericProgression] ${rejected} voicing(s) rejected as out-of-chord; literal chord tones kept.`);
            }
            seq.__voicingSettings = {
                voicing: style, register,
                mode: st.voiceLeadingMode || 'single',
                combos: st.vlCombosVariant || 'v2',
                smoothLeading, overrides, rejected
            };
        } catch (e) {
            console.warn('[NumericProgression] voice leading failed', e);
        }
    }

    function apply() {
        const chords = buildChords();
        state.lastChords = chords;
        if (!chords.length) return false;

        const { key, scale } = currentKeyScale();
        const theory = mt();
        let scaleNotes = [];
        try { scaleNotes = (theory && theory.getScaleNotes(key, scale)) || []; } catch (_) {}

        const beatsPerBar = 4;
        const bars = chords.length;
        const chordSequence = buildSequence(chords, beatsPerBar);
        applyVoiceLeading(chordSequence);

        const context = {
            emotionalTone: 'balanced',
            performanceIntent: 'steady',
            overallEnergy: 0.5,
            globalTension: 0.4,
            timeSignature: `${beatsPerBar}/4`,
            harmonicProfile: { root: key, recommendedScale: scale, scaleNotes },
            wordTokens: [],
            source: 'numeric-progression'
        };
        const totalBeats = bars * beatsPerBar;
        const arc = {
            bars,
            beatsPerBar,
            totalBeats,
            energyProfile: Array.from({ length: totalBeats }, (_, i) => 0.45 + 0.1 * Math.sin((i / totalBeats) * Math.PI)),
            sample: (t) => 0.45 + 0.1 * Math.sin(Math.max(0, Math.min(1, t)) * Math.PI)
        };

        const detail = {
            harmony: { chordSequence, context, voicingSettings: chordSequence.__voicingSettings || null },
            melody: { notes: [] },       // numeric mode is harmony-only
            scaleTimeline: [],
            context,
            arc,
            seed: 0,
            input: state.degrees.map(d => d.roman).join(' '),
            traceId: `numeric-${Date.now().toString(36)}`,
            timestamp: new Date().toISOString()
        };

        window.__lastMusicGenerated = detail;
        // Reuse the tested pipeline: this renders the sheet AND populates the
        // provenance panel, which listens for musicGenerated.
        try { document.dispatchEvent(new CustomEvent('musicGenerated', { detail })); } catch (_) {}
        if (typeof window.applyGeneratedMusicToSheet === 'function') {
            window.applyGeneratedMusicToSheet(detail);
        }
        return true;
    }

    function setInput(text) {
        state.degrees = parseDegrees(text);
        // Approaches are indexed by chord position; drop any now out of range.
        Object.keys(state.approaches).forEach((k) => {
            if (parseInt(k, 10) >= state.degrees.length) delete state.approaches[k];
        });
        return apply();
    }

    function setApproach(index, plan) {
        if (!plan) delete state.approaches[index];
        else state.approaches[index] = plan;
        return apply();
    }

    function bindInput(input) {
        if (!input || input.__numericBound) return;
        input.__numericBound = true;
        if (!input.placeholder) input.placeholder = 'e.g. 2 5 1 6  ·  ii V I  ·  Bmaj7#5 Gmaj7';
        input.title = 'Scale degrees, roman numerals, or chord symbols — separate with spaces';

        let timer = null;
        const run = () => {
            const v = input.value.trim();
            if (!v) return;
            setInput(v);
        };
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(run, 400);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { clearTimeout(timer); run(); }
        });
        return input;
    }

    function attach() {
        // #manual-numbers is the real progression field (degrees, romans, or
        // chord symbols); #global-manual-numbers is the control-deck mirror.
        ['manual-numbers', 'global-manual-numbers'].forEach((id) => bindInput(document.getElementById(id)));

        const keySel = document.getElementById('key-select');
        if (keySel && !keySel.__numericBound) {
            keySel.__numericBound = true;
            keySel.addEventListener('change', () => {
                state.key = keySel.value;
                if (state.degrees.length) apply();
            });
        }

        const lib = scaleLib();
        if (lib && typeof lib.on === 'function' && !lib.__numericBound) {
            lib.__numericBound = true;
            lib.on('scaleChanged', ({ key, scale } = {}) => {
                if (key) state.key = key;
                if (scale) state.scale = scale;
                if (state.degrees.length) apply();
            });
        }
    }

    // #manual-numbers is rendered by NumberGenerator's innerHTML, so it can
    // appear after us — watch for it instead of binding once and giving up.
    function watchForInputs() {
        attach();
        try {
            const obs = new MutationObserver(() => attach());
            obs.observe(document.body, { childList: true, subtree: true });
        } catch (_) {}
    }

    /** Re-voice the current progression (called when voicing controls change). */
    function revoice() {
        if (state.degrees.length) return apply();
        return false;
    }

    const api = {
        setInput, setApproach, apply, parseDegrees, analyzeInKey, revoice,
        get state() { return state; },
        getChords: () => state.lastChords
    };
    if (typeof window !== 'undefined') window.NumericProgression = api;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchForInputs);
    else watchForInputs();
})();
