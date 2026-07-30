/**
 * piano-texture-engine.js
 *
 * Turns harmony + melody into something two hands can actually play.
 *
 * The generator produced a melody and a stack of chord tones and drew both on
 * the treble staff. That is not piano writing — it is a lead sheet with the
 * chord spelled out. Nothing decided which hand played what, the accompaniment
 * frequently sat on top of the tune, and the bass staff of the grand staff was
 * drawn and then left empty.
 *
 * What this adds:
 *   - LEFT HAND gets a real accompaniment pattern (block, arpeggio, Alberti,
 *     waltz, octave bass, walking line, sustained pad) chosen per section, so
 *     the texture has shape across the form instead of one figure throughout.
 *   - RIGHT HAND carries the melody, and the accompaniment is voiced strictly
 *     underneath it, because the tune being the top voice is what makes it read
 *     as the tune.
 *   - HAND SEPARATION is enforced: the left hand's top note stays below the
 *     right hand's lowest, so the two parts are independently playable.
 *
 * The exceptions are deliberate, named, and placed at section level rather than
 * sprinkled per bar — the melody is not ALWAYS the top voice, and the cases
 * where it isn't are specific:
 *
 *   descant       a countermelody rises above the tune at a climax
 *   tenorLead     the melody drops to the tenor register under sustained
 *                 upper-voice pads, as in choral and orchestral writing
 *   crossover     the left hand crosses above the right for scalar octaves
 *   bassMelody    the bass line becomes the melodic focus, as in an intro
 */

(function () {
    'use strict';

    // Playable ranges. The gap between LH_TOP and RH_LOW is what keeps the
    // hands out of each other's way.
    const LH_LOW = 28;    // E1
    const LH_TOP = 60;    // C4 — middle C, the usual ceiling for the left hand
    const RH_LOW = 55;    // G3
    const RH_HIGH = 88;   // E6

    /**
     * The sheet's Register control, as a semitone shift for the left hand.
     *
     * The left hand used to be clamped into one fixed window and octave-shifted
     * until it fitted, which normalised the register setting straight back out
     * again — low, mid and high all produced a hand spanning MIDI 38–60. The
     * control changed the voice-leading engine's answer and then the texture
     * engine undid it.
     */
    function registerShift() {
        const sheet = (typeof window !== 'undefined')
            && ((window.modularApp && window.modularApp.sheetMusicGenerator) || window.sheetMusicGenerator);
        const r = (sheet && sheet.state && sheet.state.voicingRegister) || 'mid';
        return r === 'low' ? -7 : r === 'high' ? 7 : 0;
    }

    /**
     * The Voicing Logic dropdown, as things the texture engine can actually do
     * differently. `smart/smooth/open/jazz/piano` were all mapped onto just
     * `close` or `spread` before, so three of the five options were duplicates
     * of another one and the menu was mostly decorative.
     */
    function logicProfile() {
        const sheet = (typeof window !== 'undefined')
            && ((window.modularApp && window.modularApp.sheetMusicGenerator) || window.sheetMusicGenerator);
        const st = (sheet && sheet.state) || {};
        if (!st.autoVoicingAll) return { id: st.voicingStyle || 'close', thickness: 0, patterns: null, spread: 0 };
        switch (st.voicingLogic) {
            // Shell voicings: root, third and seventh, spread wide, and a bass
            // that walks — the left hand of a jazz pianist.
            case 'jazz':   return { id: 'jazz', thickness: -1, patterns: ['walking', 'rootChord'], spread: 4 };
            // Everything wide and sustained.
            case 'open':   return { id: 'open', thickness: 0, patterns: ['pad', 'halfPad', 'arpeggio'], spread: 7 };
            // Minimum motion: block chords held, so common tones are audible.
            case 'smooth': return { id: 'smooth', thickness: 0, patterns: ['block', 'halfPad'], spread: 0 };
            // Idiomatic piano: bass note then chord, Alberti, octaves.
            case 'piano':  return { id: 'piano', thickness: 1, patterns: ['rootChord', 'alberti', 'octaveBass'], spread: 2 };
            default:       return { id: 'smart', thickness: 0, patterns: null, spread: 0 };
        }
    }

    function makeRng(seed) {
        let s = ((Number(seed) || 0) ^ 0x5bf03635) >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    /**
     * Left-hand accompaniment patterns.
     *
     * `build` returns note events for ONE chord occupying `beats` beats, given
     * its pitch classes already placed in the left-hand register. Each pattern
     * is a real idiom rather than a random arpeggiation: what makes an Alberti
     * bass an Alberti bass is the specific low–high–middle–high order.
     */
    const LH_PATTERNS = {
        pad: {
            name: 'sustained pad', density: 0.0, minBeats: 2, sustains: true,
            build: (tones, beats) => [{ notes: tones.slice(0, 4), beat: 0, duration: beats }]
        },
        halfPad: {
            name: 'half-note pad', density: 0.08, minBeats: 4, sustains: true,
            build: (tones, beats) => {
                // Two long chords rather than one: the harmony still sustains,
                // but the hand re-articulates, which is what keeps a slow
                // passage breathing instead of merely lying there.
                const half = beats / 2;
                return [
                    { notes: tones.slice(0, 4), beat: 0, duration: half },
                    { notes: tones.slice(0, 4), beat: half, duration: half }
                ];
            }
        },
        block: {
            name: 'block chords', density: 0.2, minBeats: 1,
            build: (tones, beats) => {
                // Root on the downbeat, the rest of the chord with it.
                const out = [{ notes: tones.slice(0, 4), beat: 0, duration: Math.min(beats, 2) }];
                if (beats >= 4) out.push({ notes: tones.slice(0, 4), beat: 2, duration: beats - 2 });
                return out;
            }
        },
        rootChord: {
            name: 'bass note then chord', density: 0.35, minBeats: 2,
            build: (tones, beats) => {
                // The stride staple: low root, then the chord above it, HELD.
                // Every upper chord used to be clipped to a quarter, which is
                // why nothing in the left hand ever sustained.
                const root = tones[0];
                const upper = tones.slice(1, 4);
                const out = [{ notes: [root], beat: 0, duration: 1 }];
                if (beats <= 2) {
                    out.push({ notes: upper, beat: 1, duration: beats - 1 });
                    return out;
                }
                // Bass, chord held to the halfway point, bass again, chord held out.
                const mid = Math.floor(beats / 2);
                out.push({ notes: upper, beat: 1, duration: mid - 1 });
                out.push({ notes: [root], beat: mid, duration: 1 });
                out.push({ notes: upper, beat: mid + 1, duration: beats - mid - 1 });
                return out;
            }
        },
        waltz: {
            name: 'waltz (bass–chord–chord)', density: 0.4, minBeats: 3, meter: 3,
            build: (tones, beats) => {
                const out = [{ notes: [tones[0]], beat: 0, duration: 1 }];
                for (let b = 1; b < beats; b++) out.push({ notes: tones.slice(1, 4), beat: b, duration: 1 });
                return out;
            }
        },
        alberti: {
            name: 'Alberti bass', density: 0.7, minBeats: 2,
            build: (tones, beats) => {
                // low – high – middle – high, the figure's whole identity.
                const [lo, mid, hi] = [tones[0], tones[1] ?? tones[0], tones[2] ?? tones[1] ?? tones[0]];
                const order = [lo, hi, mid, hi];
                const out = [];
                const step = 0.5;
                for (let i = 0, b = 0; b < beats - 1e-6; i++, b += step) {
                    out.push({ notes: [order[i % order.length]], beat: b, duration: step });
                }
                return out;
            }
        },
        arpeggio: {
            name: 'broken chord', density: 0.6, minBeats: 2,
            build: (tones, beats) => {
                const up = tones.slice(0, 4);
                const shape = up.concat(up.slice(0, -1).reverse());
                const out = [];
                const step = 0.5;
                // Leave the last beat for the chord to land on. A bar of
                // unbroken eighth-note figuration never arrives anywhere; a
                // running figure that gathers into a held chord does.
                const runTo = Math.max(step, beats - 1);
                for (let i = 0, b = 0; b < runTo - 1e-6; i++, b += step) {
                    out.push({ notes: [shape[i % shape.length]], beat: b, duration: step });
                }
                if (beats - runTo > 0) {
                    out.push({ notes: up.slice(0, 3), beat: runTo, duration: beats - runTo });
                }
                return out;
            }
        },
        octaveBass: {
            name: 'octave bass', density: 0.5, minBeats: 2,
            build: (tones, beats) => {
                // Octaves on the strong beats, with the chord filling between
                // and holding. A bar of undifferentiated quarter-note octaves
                // is a metronome, not an accompaniment.
                const root = tones[0];
                const upper = tones.slice(1, 4);
                const out = [];
                for (let b = 0; b < beats; b += 2) {
                    const span = Math.min(2, beats - b);
                    out.push({ notes: [root, root + 12], beat: b, duration: 1 });
                    if (span > 1 && upper.length) {
                        out.push({ notes: upper, beat: b + 1, duration: span - 1 });
                    }
                }
                return out;
            }
        },
        walking: {
            name: 'walking bass', density: 0.65, minBeats: 4,
            build: (tones, beats, ctx) => {
                // Quarter notes through the chord, approaching the next root by
                // step — the thing that makes a walking line walk somewhere.
                const out = [];
                const pool = tones.slice(0, 4);
                for (let b = 0; b < beats; b += 1) {
                    let n;
                    if (b === 0) n = pool[0];
                    else if (b === beats - 1 && Number.isFinite(ctx && ctx.nextRoot)) {
                        const target = ctx.nextRoot;
                        n = target > pool[0] ? target - 1 : target + 1;   // chromatic approach
                    } else n = pool[b % pool.length];
                    out.push({ notes: [n], beat: b, duration: 1 });
                }
                return out;
            }
        }
    };

    /**
     * THE CONDUCTOR'S HANDS.
     *
     * Texture has to breathe across a piece, not sit at one density from bar 1
     * to the end. A section chose one pattern and played it identically
     * throughout, so every bar of an A section was as busy as every other and
     * the accompaniment read as a machine rather than as playing.
     *
     * This returns a per-bar breath value: where the arc is high the hand is
     * active, where it is low the hand sustains, and the transition between
     * them is gradual. A slow sine over the section adds the smaller rise and
     * fall inside the larger one — the phrase-level swell a player puts in
     * without being asked.
     */
    function breathAt({ arc, bar, barCount, beatsPerBar, section, phase = 0 }) {
        const t = barCount > 1 ? bar / (barCount - 1) : 0;
        let arcE = 0.5;
        if (arc && typeof arc.sample === 'function') {
            const v = Number(arc.sample(t));
            if (Number.isFinite(v)) arcE = Math.max(0, Math.min(1, v));
        }
        // Position inside the section: phrases lean in and settle at the end.
        const within = section && section.bars > 1
            ? (bar - section.startBar) / (section.bars - 1) : 0.5;
        const phrase = Math.sin(within * Math.PI);           // swell then settle
        const slow = 0.5 + 0.5 * Math.sin((t * 2.2 + phase) * Math.PI);
        const bias = section ? (section.activityBias || 0) + (section.energyBias || 0) : 0;
        return Math.max(0, Math.min(1,
            arcE * 0.45 + phrase * 0.25 + slow * 0.15 + 0.15 + bias));
    }

    /** Pattern choice from how busy the passage should be and what meter it is in. */
    function pickPattern(rng, { activity, beatsPerBar, energy, tone, sectionRole }) {
        const profile = logicProfile();
        const allowed = profile.patterns;
        const candidates = Object.entries(LH_PATTERNS).filter(([id, p]) => {
            if (allowed && !allowed.includes(id)) return false;
            if (p.meter && p.meter !== beatsPerBar) return false;
            if (p.minBeats > beatsPerBar) return false;
            return true;
        });
        // Waltz is compulsory rather than optional in triple metre — that is
        // what triple metre accompaniment IS.
        if (beatsPerBar === 3 && rng() < 0.75) return 'waltz';
        const want = Math.max(0, Math.min(1, activity * 0.6 + energy * 0.4));
        const scored = candidates.map(([id, p]) => ({
            id,
            s: 1 - Math.abs(p.density - want) + rng() * 0.45
        }));
        scored.sort((a, b) => b.s - a.s);
        return scored[0].id;
    }

    class PianoTextureEngine {
        constructor(musicTheory) {
            this.mt = musicTheory || null;
            this.chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        }

        pcOf(name) {
            const pc = String(name || '').replace(/-?\d+$/, '');
            if (this.mt && this.mt.noteValues && Number.isFinite(this.mt.noteValues[pc])) {
                return this.mt.noteValues[pc];
            }
            return this.chromatic.indexOf(pc);
        }

        midiOf(name) {
            const m = String(name || '').match(/^([A-Ga-g][#b]?)(-?\d+)$/);
            if (!m) return null;
            const pc = this.pcOf(m[1]);
            if (!Number.isFinite(pc) || pc < 0) return null;
            return pc + (parseInt(m[2], 10) + 1) * 12;
        }

        nameOf(midi, preferFlat) {
            const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            const names = preferFlat ? flats : this.chromatic;
            const pc = ((midi % 12) + 12) % 12;
            return `${names[pc]}${Math.floor(midi / 12) - 1}`;
        }

        /**
         * Place a chord's tones in the left hand under a ceiling.
         *
         * USE THE VOICE-LEADING ENGINE'S ANSWER when there is one. It has
         * already solved this chord against the previous one and against the
         * melody — common tones held, no parallel fifths, smallest total motion
         * — and rebuilding the voicing from raw chord tones here threw all of
         * that away. Two passes of voice leading were being computed per take
         * and then discarded in favour of a fresh stack of thirds.
         */
        voiceFromVoiceLeading(voices, ceiling) {
            if (!voices) return null;
            const midis = Object.values(voices).filter(Number.isFinite).sort((a, b) => a - b);
            if (midis.length < 3) return null;
            const shift = registerShift();
            const top = Number.isFinite(ceiling)
                ? Math.min(LH_TOP + 6 + shift, ceiling - 2)
                : LH_TOP + shift;

            // Keep EVERY voice that fits below the melody, not all-but-the-top.
            // The accompaniment's own soprano is an inner voice relative to the
            // tune, so discarding it unconditionally left the left hand playing
            // two notes where the voice-leading engine had written four — which
            // is most of why the chords sounded so thin.
            let lower = midis.slice();
            let guard = 0;
            while (lower.length && Math.max(...lower) > top && guard++ < 3) {
                lower = lower.map(m => m - 12);
            }
            lower = lower.filter(m => m >= LH_LOW + Math.min(0, shift) && m <= top);

            // Playability: one hand spanning more than about a twelfth is not a
            // chord anyone can hold. The bass is the one that moves, since the
            // patterns already play it separately from the chord above it.
            if (lower.length >= 2) {
                const span = Math.max(...lower) - Math.min(...lower);
                if (span > 19) {
                    const lo = Math.min(...lower);
                    if (lo + 12 <= top) lower = lower.map(m => (m === lo ? m + 12 : m));
                }
                lower = Array.from(new Set(lower)).sort((a, b) => a - b);
            }
            return lower.length >= 2 ? lower : null;
        }

        voiceInLeftHand(chordObj, ceiling, prevBass) {
            const tones = (chordObj && (chordObj.chordNotes || chordObj.diatonicNotes)) || [];
            const pcs = tones.map(n => this.pcOf(n)).filter(p => Number.isFinite(p) && p >= 0);
            if (!pcs.length) return [];

            const top = Math.min(LH_TOP, Number.isFinite(ceiling) ? ceiling - 3 : LH_TOP);

            // Bass note: the chord root, placed in the octave nearest the
            // previous bass so the line does not jump around the keyboard.
            // BASS_FLOOR rather than the absolute bottom of the hand: roots down
            // at A1 sounded, but a chord built on one is a growl, and the whole
            // accompaniment ended up crouched below the staff on ledger lines.
            const BASS_FLOOR = 40;   // E2
            const rootPc = pcs[0];
            let bass = null;
            for (let m = BASS_FLOOR; m <= Math.max(BASS_FLOOR, top); m++) {
                if (((m % 12) + 12) % 12 !== rootPc) continue;
                if (bass === null) { bass = m; continue; }
                if (Number.isFinite(prevBass) && Math.abs(m - prevBass) < Math.abs(bass - prevBass)) bass = m;
            }
            if (bass === null) {
                bass = BASS_FLOOR + (((rootPc - BASS_FLOOR) % 12) + 12) % 12;
            }

            // LOW INTERVAL LIMITS.
            //
            // Thirds and sevenths stacked close together below about C3 beat
            // against each other and read as mud rather than as a chord. The
            // lower the voicing sits, the wider its intervals have to be — which
            // is why real left-hand writing thins to root-and-fifth or octaves
            // down there and only fills in the chord higher up.
            const minGap = bass < 45 ? 7          // below A2: fifths or wider
                : bass < 52 ? 4                    // below E3: thirds at the closest
                : 3;
            const upper = [];
            const wanted = pcs.slice(1);
            let cursor = bass;
            for (const pc of wanted) {
                let m = cursor + minGap;
                while ((((m % 12) + 12) % 12) !== pc) m++;
                if (m > top) break;
                upper.push(m);
                cursor = m;
            }
            // A bass alone is a bass line, not a voicing. If the gaps left no
            // room, take the fifth an octave up — always safe, always in the
            // chord, and the standard thin left-hand shape.
            if (!upper.length) {
                const fifth = pcs.find(p => ((p - rootPc + 12) % 12) === 7);
                const target = Number.isFinite(fifth) ? fifth : pcs[pcs.length - 1];
                let m = bass + 7;
                while ((((m % 12) + 12) % 12) !== target && m < bass + 19) m++;
                if (m <= top) upper.push(m);
            }
            return [bass].concat(upper);
        }

        /**
         * Build the two-hand texture.
         * @returns {{leftHand:Array, rightHand:Array, sections:Object, exceptions:Array}}
         */
        /**
         * SATB: four independent voices, one per part, no accompaniment
         * patterns at all.
         *
         * This is a genuinely different discipline from piano writing, not a
         * setting on it. Choral texture has exactly four voices; each holds its
         * own line; the soprano IS the melody; and nothing arpeggiates, because
         * there is no instrument to arpeggiate with. The voice-leading engine
         * already solves precisely this problem, so here it is used directly
         * rather than being taken apart into a bass and a chord.
         *
         * Alto and tenor go to the bass staff with the bass, which is where
         * open-score choral music on two staves puts them.
         */
        buildSATB({ harmony, melody, context, arc, seed = 0 }) {
            const rng = makeRng(seed + 91);
            const beatsPerBar = (arc && arc.beatsPerBar) || 4;
            const notes = (melody && melody.notes) || [];
            const seq = (harmony && harmony.chordSequence) || [];
            const preferFlat = /b/.test(String(((context.harmonicProfile || {}).scaleNotes || []).join('')));
            const form = (context && context.form) || null;
            const sectionAtBar = (bar) => (form && Array.isArray(form.sectionOfBar) && form.sectionOfBar[bar]) || null;

            // WHICH VOICE HAS THE TUNE.
            //
            // Soprano-on-top is one choral texture, not the only one. A cantus
            // firmus sits in the TENOR and is the older practice by centuries;
            // an alto lead puts the tune inside the texture with voices above
            // and below it; a bass lead is the chorale-with-descant sound.
            // Assuming soprano throws all of that away.
            const LEAD_VOICES = ['soprano', 'alto', 'tenor', 'bass'];
            const requested = (typeof window !== 'undefined' && window.__satbLead) || 'auto';
            const leadFor = (section) => {
                if (requested !== 'auto' && LEAD_VOICES.includes(requested)) return requested;
                // Auto: soprano most of the time, because that IS the common
                // case, with the others as real alternatives on departures.
                if (!section) return 'soprano';
                if (section.letter === 'A' || section.stability === 'stable') {
                    return rng() < 0.78 ? 'soprano' : 'alto';
                }
                const r = rng();
                return r < 0.45 ? 'soprano' : r < 0.7 ? 'tenor' : r < 0.88 ? 'alto' : 'bass';
            };
            const leadBySection = {};

            // Ranges each voice actually sings in.
            const RANGE = {
                soprano: [60, 81], alto: [55, 74], tenor: [48, 67], bass: [40, 60]
            };

            const leftHand = [];      // voices at or below middle C  → bass staff
            const rightHand = [];     // voices above middle C        → treble staff
            const structural = seq.filter(ev => ev && !ev.approachStrategy && ev.chordObj);

            // The melody, as MIDI per absolute beat, so a chord can find the
            // tune sounding over it.
            const melEvents = notes.map(n => ({
                start: n.bar * beatsPerBar + n.beat,
                end: n.bar * beatsPerBar + n.beat + (Number(n.duration) || 1),
                midi: this.midiOf(n.noteName), note: n
            })).filter(e => Number.isFinite(e.midi));
            const melAt = (beat) => {
                for (const e of melEvents) if (beat >= e.start - 1e-6 && beat < e.end - 1e-6) return e;
                return null;
            };

            structural.forEach((ev) => {
                const sec = sectionAtBar(ev.bar);
                const label = sec ? sec.label : '-';
                if (!leadBySection[label]) leadBySection[label] = leadFor(sec);
                const lead = leadBySection[label];
                const beats = Number(ev.duration) || beatsPerBar;
                const absBeat = ev.bar * beatsPerBar + (Number(ev.beat) || 0);

                const tones = (ev.chordObj.chordNotes || ev.chordObj.diatonicNotes || [])
                    .map(n => this.pcOf(n)).filter(p => Number.isFinite(p) && p >= 0);
                if (!tones.length) return;

                // The lead voice takes the melody note in its own range; the
                // other three take the remaining chord tones inside theirs,
                // arranged so nothing crosses.
                const melHere = melAt(absBeat);
                const assigned = {};
                if (melHere) {
                    const [lo, hi] = RANGE[lead];
                    let m = melHere.midi;
                    while (m > hi) m -= 12;
                    while (m < lo) m += 12;
                    assigned[lead] = m;
                }

                // Fill the rest from the low voices up, keeping order.
                const order = ['bass', 'tenor', 'alto', 'soprano'];
                let floor = 0;
                const used = new Set(Object.values(assigned).map(m => ((m % 12) + 12) % 12));
                order.forEach((v) => {
                    if (assigned[v] !== undefined) { floor = Math.max(floor, assigned[v]); return; }
                    const [lo, hi] = RANGE[v];
                    // Prefer a chord tone not already sounding, so the chord is
                    // complete before anything gets doubled.
                    const wanted = tones.filter(pc => !used.has(pc)).concat(tones);
                    let best = null;
                    for (const pc of wanted) {
                        for (let m = Math.max(lo, floor + 1); m <= hi; m++) {
                            if ((((m % 12) + 12) % 12) === pc) { best = m; break; }
                        }
                        if (best !== null) break;
                    }
                    if (best === null) best = Math.max(lo, Math.min(hi, floor + 3));
                    assigned[v] = best;
                    used.add(((best % 12) + 12) % 12);
                    floor = best;
                });

                // Split across the two staves the way choral open score does.
                order.forEach((v) => {
                    const m = assigned[v];
                    if (!Number.isFinite(m)) return;
                    const isLead = v === lead;
                    const target = m >= 60 ? rightHand : leftHand;
                    const entry = {
                        bar: ev.bar,
                        beat: Number(ev.beat) || 0,
                        duration: beats,
                        midis: [m],
                        noteNames: [this.nameOf(m, preferFlat)],
                        voicePart: v,
                        isMelody: isLead,
                        pattern: 'satb',
                        patternName: `SATB — ${lead} lead`,
                        section: label,
                        hand: m >= 60 ? 'right' : 'left',
                        voiceLed: !!ev.voicing
                    };
                    if (isLead && melHere) {
                        entry.syllable = melHere.note.syllable || null;
                        entry.articulation = melHere.note.articulation || null;
                        entry.accent = !!melHere.note.accent;
                    }
                    if (target === rightHand) {
                        target.push({ ...entry, noteName: entry.noteNames[0], midi: m,
                            voice: isLead ? 'melody' : 'harmony' });
                    } else {
                        target.push(entry);
                    }
                });
            });

            leftHand.sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat));

            return {
                mode: 'satb',
                lead: leadBySection,
                leftHand,
                rightHand,
                sections: {},
                exceptions: [],
                stats: { collisionsFixed: 0, lhEvents: leftHand.length, rhEvents: rightHand.length }
            };
        }

        build({ harmony, melody, context, arc, seed = 0 }) {
            // TEXTURE MODE. Piano writing and choral writing are different
            // crafts, not two settings of one craft, so they are separate paths
            // rather than a parameter threaded through the same code.
            const mode = (typeof window !== 'undefined' && window.__textureMode) || 'piano';
            if (mode === 'satb') {
                return this.buildSATB({ harmony, melody, context, arc, seed });
            }
            const rng = makeRng(seed + 31);
            const beatsPerBar = (arc && arc.beatsPerBar) || 4;
            const barCount = (arc && arc.bars) || 4;
            const form = (context && context.form) || null;
            const notes = (melody && melody.notes) || [];
            const seq = (harmony && harmony.chordSequence) || [];
            const preferFlat = /b/.test(String(((context.harmonicProfile || {}).scaleNotes || []).join('')));

            // Melody as MIDI, indexed by absolute beat, so the accompaniment can
            // be kept underneath whatever is actually sounding.
            const melodyEvents = notes.map(n => ({
                start: n.bar * beatsPerBar + n.beat,
                end: n.bar * beatsPerBar + n.beat + (Number(n.duration) || 1),
                midi: this.midiOf(n.noteName),
                note: n
            })).filter(e => Number.isFinite(e.midi));

            const melodyAt = (beat) => {
                let best = null;
                for (const e of melodyEvents) {
                    if (beat >= e.start - 1e-6 && beat < e.end - 1e-6) return e.midi;
                    if (e.start <= beat + 1e-6 && (!best || e.start > best.start)) best = e;
                }
                return best ? best.midi : null;
            };
            // The lowest melody note anywhere in a bar — the accompaniment has
            // to clear the whole bar, not just its downbeat.
            const melodyFloorInBar = (bar) => {
                const lo = melodyEvents
                    .filter(e => e.start < (bar + 1) * beatsPerBar && e.end > bar * beatsPerBar)
                    .map(e => e.midi);
                return lo.length ? Math.min(...lo) : null;
            };

            // --- Texture per section -----------------------------------------
            const sections = {};
            const exceptions = [];
            const sectionList = (form && form.sections) || [{ label: '-', startBar: 0, endBar: barCount - 1, role: 'statement', variation: 0 }];

            sectionList.forEach((s, i) => {
                const energy = Number(context.overallEnergy) || 0.5;
                const activity = Math.max(0, Math.min(1,
                    energy * 0.6 + (s.activityBias || 0) + (rng() - 0.5) * 0.3));
                const pattern = pickPattern(rng, {
                    activity, beatsPerBar, energy,
                    tone: context.emotionalTone, sectionRole: s.role
                });
                sections[s.label] = { pattern, activity, name: LH_PATTERNS[pattern].name };

                // --- The exceptions ------------------------------------------
                // Each is a real orchestrational choice, so each gets a whole
                // section and a stated reason rather than a per-bar dice roll.
                const isClimax = (s.energyBias || 0) > 0.2;
                const isFinal = !!s.isFinal;
                const isDeparture = s.letter && s.letter !== 'A';
                const roll = rng();

                if (isClimax && !isFinal && roll < 0.28) {
                    sections[s.label].rhExtra = 'descant';
                    exceptions.push({
                        section: s.label, type: 'descant', startBar: s.startBar, endBar: s.endBar,
                        explain: 'Descant: a countermelody rises above the tune at the climax. The melody '
                            + 'is no longer the top voice, and that is the point — the new line is heard '
                            + 'as arriving over something already established.'
                    });
                } else if (isDeparture && roll < 0.42 && roll >= 0.28) {
                    sections[s.label].lead = 'tenor';
                    exceptions.push({
                        section: s.label, type: 'tenorLead', startBar: s.startBar, endBar: s.endBar,
                        explain: 'Tenor lead: the melody drops into the left hand\'s register while the right '
                            + 'hand holds sustained chords above it — the choral and cello-section texture. '
                            + 'The tune is the lowest moving voice rather than the highest.'
                    });
                } else if (roll >= 0.42 && roll < 0.52 && activity > 0.55) {
                    sections[s.label].lhCrossover = true;
                    exceptions.push({
                        section: s.label, type: 'crossover', startBar: s.startBar, endBar: s.endBar,
                        explain: 'Left-hand crossover: scalar octaves cross above the right hand for a bar. '
                            + 'Brief by design — it is a gesture, and it stops being one if it stays.'
                    });
                } else if (i === 0 && roll >= 0.52 && roll < 0.6) {
                    sections[s.label].bassMelody = true;
                    exceptions.push({
                        section: s.label, type: 'bassMelody', startBar: s.startBar, endBar: s.endBar,
                        explain: 'Bass melody: the left-hand line carries the melodic interest, with the right '
                            + 'hand reduced to sustained harmony — an intro texture.'
                    });
                }
            });

            const sectionAtBar = (bar) => {
                if (form && Array.isArray(form.sectionOfBar) && form.sectionOfBar[bar]) return form.sectionOfBar[bar];
                return sectionList[0];
            };

            // --- Left hand ---------------------------------------------------
            const leftHand = [];
            const structural = seq.filter(ev => ev && !ev.approachStrategy && ev.chordObj);
            let prevBass = null;
            const breathPhase = rng() * 2;

            structural.forEach((ev, idx) => {
                const bar = ev.bar;
                const sec = sectionAtBar(bar) || sectionList[0];
                const cfg = sections[sec.label] || { pattern: 'block' };
                const beats = Number(ev.duration) || beatsPerBar;

                // Ceiling: stay under the melody for the whole span.
                const floor = melodyFloorInBar(bar);
                const ceiling = Number.isFinite(floor) ? Math.min(floor, LH_TOP + 4) : LH_TOP;

                // Prefer the voice-led voicing; fall back to stacking only when
                // the engine had nothing usable for this chord.
                const led = this.voiceFromVoiceLeading(ev.voicing, ceiling);
                const tones = (led && led.length >= 2)
                    ? led
                    : this.voiceInLeftHand(ev.chordObj, ceiling, prevBass);
                if (!tones.length) return;
                prevBass = tones[0];

                const next = structural[idx + 1];
                const nextRoot = next ? this.pcOf((next.chordObj.chordNotes || next.chordObj.diatonicNotes || [])[0]) : null;
                const nextRootMidi = Number.isFinite(nextRoot)
                    ? tones[0] + (((nextRoot - (tones[0] % 12)) % 12 + 12) % 12) : null;

                // EBB AND FLOW. The section names a pattern, but each bar decides
                // how much of it to play: a quiet bar sustains where a busy one
                // articulates, and the chord thins and thickens with it.
                const breath = breathAt({ arc, bar, barCount, beatsPerBar, section: sec, phase: breathPhase });
                let patternId = cfg.pattern;
                const patDensity = (LH_PATTERNS[patternId] || LH_PATTERNS.block).density;
                if (breath < patDensity - 0.18) {
                    // Well below what this pattern wants — let it sustain.
                    patternId = beats >= 4 ? 'halfPad' : 'pad';
                } else if (breath < patDensity - 0.08) {
                    patternId = 'block';
                }
                // A tenor lead or bass melody overrides the pattern: the left
                // hand is carrying the tune, not accompanying.
                if (cfg.lead === 'tenor' || cfg.bassMelody) patternId = 'pad';
                const pattern = LH_PATTERNS[patternId] || LH_PATTERNS.block;

                // Chord THICKNESS follows the breath too. Two notes in the
                // quiet stretches, the full voicing at the top of a phrase —
                // this is the difference between an accompaniment and a drone.
                const thickness = Math.max(2, (breath > 0.62 ? 4 : breath > 0.34 ? 3 : 2)
                    + logicProfile().thickness);
                const voiced = tones.slice(0, Math.max(2, Math.min(tones.length, thickness)));

                const built = pattern.build(voiced, beats, { nextRoot: nextRootMidi });
                built.forEach(cell => {
                    // A pattern asked to fill a one-beat span can compute a
                    // trailing cell of length zero (beats - 1). Those render as
                    // invisible noteheads and confuse the duration mapping.
                    if (!Number.isFinite(cell.duration) || cell.duration <= 0) return;
                    const cellNotes = cell.notes.filter(Number.isFinite)
                        .map(m => Math.max(LH_LOW, Math.min(LH_TOP + 6, m)));
                    if (!cellNotes.length) return;
                    leftHand.push({
                        bar,
                        beat: (Number(ev.beat) || 0) + cell.beat,
                        duration: cell.duration,
                        midis: cellNotes,
                        noteNames: cellNotes.map(m => this.nameOf(m, preferFlat)),
                        pattern: patternId,
                        patternName: pattern.name,
                        section: sec.label,
                        breath: Number(breath.toFixed(2)),
                        voiceLed: !!led,
                        hand: 'left'
                    });
                });
            });

            // --- Right hand ---------------------------------------------------
            // The melody, plus whatever the section's texture adds above or
            // below it. Sections marked tenorLead move the melody down and put
            // sustained chords in the right hand instead.
            const rightHand = [];
            notes.forEach((n) => {
                const sec = sectionAtBar(n.bar) || sectionList[0];
                const cfg = sections[sec.label] || {};
                const midi = this.midiOf(n.noteName);
                if (!Number.isFinite(midi)) return;

                if (cfg.lead === 'tenor') {
                    // The tune goes to the left hand's register; the right hand
                    // sustains. Marked so the renderer puts it on the bass staff.
                    const dropped = midi - 12 >= LH_LOW ? midi - 12 : midi;
                    leftHand.push({
                        bar: n.bar, beat: n.beat, duration: n.duration,
                        midis: [dropped], noteNames: [this.nameOf(dropped, preferFlat)],
                        pattern: 'tenorLead', patternName: 'tenor lead',
                        section: sec.label, hand: 'left', isMelody: true,
                        syllable: n.syllable || null, articulation: n.articulation || null,
                        accent: !!n.accent
                    });
                    return;
                }

                rightHand.push({
                    ...n,
                    midi,
                    hand: 'right',
                    voice: 'melody'
                });

                // Descant: a second right-hand voice ABOVE the melody, moving in
                // thirds or sixths — consonant with the tune, which is what
                // stops it competing with it.
                if (cfg.rhExtra === 'descant' && (n.duration >= 0.5)) {
                    const above = midi + (rng() < 0.5 ? 3 : 4) + ((rng() < 0.35) ? 5 : 0);
                    if (above <= RH_HIGH) {
                        rightHand.push({
                            ...n,
                            noteName: this.nameOf(above, preferFlat),
                            midi: above,
                            hand: 'right',
                            voice: 'descant',
                            syllable: null,
                            accent: false
                        });
                    }
                }
            });

            // --- Hand separation ----------------------------------------------
            // The left hand must not collide with the right. Crossovers are the
            // exception and are left alone, because they are the point.
            let collisions = 0;
            leftHand.forEach((lh) => {
                const sec = sections[lh.section] || {};
                if (sec.lhCrossover || lh.isMelody) return;
                const abs = lh.bar * beatsPerBar + lh.beat;
                const mel = melodyAt(abs);
                if (!Number.isFinite(mel)) return;
                const top = Math.max(...lh.midis);
                if (top >= mel) {
                    collisions++;
                    const shift = Math.ceil((top - mel + 3) / 12) * 12;
                    lh.midis = lh.midis.map(m => Math.max(LH_LOW, m - shift));
                    lh.noteNames = lh.midis.map(m => this.nameOf(m, preferFlat));
                }
            });

            leftHand.sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat));

            return {
                mode: 'piano',
                leftHand,
                rightHand,
                sections,
                exceptions,
                stats: { collisionsFixed: collisions, lhEvents: leftHand.length, rhEvents: rightHand.length }
            };
        }
    }

    if (typeof window !== 'undefined') {
        window.PianoTextureEngine = PianoTextureEngine;
        window.PIANO_LH_PATTERNS = LH_PATTERNS;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = PianoTextureEngine;
})();
