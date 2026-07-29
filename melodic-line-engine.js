/**
 * melodic-line-engine.js
 *
 * Composes a melody as a LINE, not a sequence of independent notes.
 *
 * Architecture (in the order the decisions are actually made):
 *   1. CONTOUR      — the phrase commits to a shape: arch, ascending,
 *                     descending, or wave.
 *   2. ANCHORS      — a few structural tones are placed at harmonically strong
 *                     points (chord changes / bar starts). These are chord
 *                     tones and they follow the contour. Everything else exists
 *                     to connect them.
 *   3. CONNECTION   — anchors are joined by stepwise motion. Leaps happen only
 *                     when the gap demands one, and every leap is answered by
 *                     contrary stepwise motion.
 *   4. DECORATION   — non-chord tones are added with a stated function
 *                     (passing, neighbor, suspension, anticipation, chromatic
 *                     approach) and each one RESOLVES. Nothing chromatic is
 *                     placed without a resolution target.
 *   5. DEVELOPMENT  — bar 1's idea returns transformed (sequenced, inverted,
 *                     fragmented, rhythmically varied) instead of new material
 *                     being invented every bar.
 *   6. BREATH       — density ebbs and flows; sustained tones and rests
 *                     separate active passages.
 */

(function () {
    'use strict';

    const CONTOURS = ['arch', 'ascending', 'descending', 'wave', 'valley'];

    function makeRng(seed) {
        let s = (seed ^ 0x9e3779b9) >>> 0;
        return () => {
            s = (s * 1664525 + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    class MelodicLineEngine {
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
            const m = String(name || '').match(/^([A-G][#b]?)(-?\d+)$/);
            if (!m) return null;
            const pc = this.pcOf(m[1]);
            if (!Number.isFinite(pc) || pc < 0) return null;
            return (parseInt(m[2], 10) + 1) * 12 + pc;
        }

        nameOf(midi, preferFlat) {
            const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
            const names = preferFlat ? flats : this.chromatic;
            const pc = ((midi % 12) + 12) % 12;
            return `${names[pc]}${Math.floor(midi / 12) - 1}`;
        }

        /** Chord/scale state at a given absolute beat. */
        harmonyAt(harmony, beat, beatsPerBar) {
            const evs = (harmony && harmony.chordSequence) || [];
            let best = null;
            for (const ev of evs) {
                if (!ev || !Number.isFinite(ev.bar) || !Number.isFinite(ev.beat)) continue;
                const start = ev.bar * beatsPerBar + ev.beat;
                const end = start + (Number.isFinite(ev.duration) ? ev.duration : beatsPerBar);
                if (beat >= start - 1e-6 && beat < end - 1e-6) {
                    if (!best || start > best.__start) { best = ev; best.__start = start; }
                }
            }
            return best;
        }

        chordMidis(ev, low, high) {
            const tones = (ev && ev.chordObj &&
                ((ev.chordObj.chordNotes && ev.chordObj.chordNotes.length && ev.chordObj.chordNotes) ||
                 ev.chordObj.diatonicNotes)) || [];
            const pcs = tones.map(n => this.pcOf(n)).filter(p => Number.isFinite(p) && p >= 0);
            const out = [];
            for (let m = low; m <= high; m++) {
                if (pcs.includes(((m % 12) + 12) % 12)) out.push(m);
            }
            return out;
        }

        scaleMidis(scaleNotes, low, high) {
            const pcs = (scaleNotes || []).map(n => this.pcOf(n)).filter(p => Number.isFinite(p) && p >= 0);
            const out = [];
            for (let m = low; m <= high; m++) {
                if (pcs.includes(((m % 12) + 12) % 12)) out.push(m);
            }
            return out;
        }

        nearest(list, target) {
            if (!list || !list.length) return target;
            let best = list[0], bd = Math.abs(list[0] - target);
            for (const v of list) {
                const d = Math.abs(v - target);
                if (d < bd) { bd = d; best = v; }
            }
            return best;
        }

        /**
         * Compose the line.
         * @returns {{notes: Array, contour: string, anchors: Array}}
         */
        compose({ context, arc, harmony, seed = 0, syllables = [], complexity = {} }) {
            const rng = makeRng(seed + 7);
            const beatsPerBar = arc.beatsPerBar || 4;
            const totalBeats = arc.totalBeats || (arc.bars || 4) * beatsPerBar;
            const scaleNotes = (context.harmonicProfile && context.harmonicProfile.scaleNotes) || ['C','D','E','F','G','A','B'];
            const melodyC = Math.max(0, Math.min(1, Number(complexity.melody) || 0.5));
            const rhythmC = Math.max(0, Math.min(1, Number(complexity.rhythm) || 0.5));

            const LOW = 55, HIGH = 79;   // singable ambitus (G3–G5)
            const preferFlat = /b/.test(String(scaleNotes.join('')));

            // ---- 1. CONTOUR ----
            const tone = String(context.emotionalTone || '').toLowerCase();
            const toneContour = {
                joyful: 'ascending', hopeful: 'ascending', playful: 'wave',
                sad: 'descending', dark: 'valley', sorrow: 'descending',
                angry: 'arch', intense: 'arch', mysterious: 'wave',
                dreamy: 'wave', calm: 'arch', peaceful: 'arch'
            }[tone];
            // The tone suggests a contour but does not dictate it — the same
            // word should be interpretable several ways across takes.
            const contour = (toneContour && rng() < 0.55)
                ? toneContour
                : CONTOURS[Math.floor(rng() * CONTOURS.length)];

            // THE ARC IS THE INTENTION. Its height at time t sets where the
            // line sits; the abstract shape only colours it. Previously the arc
            // affected note density alone, so the drawn curve and the melody
            // were unrelated.
            const arcAt = (t) => {
                if (typeof arc.sample !== 'function') return null;
                const v = Number(arc.sample(Math.max(0, Math.min(1, t))));
                return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
            };
            const shapeHeight = (t) => {
                switch (contour) {
                    case 'ascending':  return t;
                    case 'descending': return 1 - t;
                    case 'arch':       return Math.sin(t * Math.PI);
                    case 'valley':     return 1 - Math.sin(t * Math.PI);
                    default:           return 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
                }
            };
            const contourHeight = (t) => {
                const a = arcAt(t);
                const shape = shapeHeight(t);
                // Arc leads, shape adds character. With no arc, shape alone.
                return (a === null) ? shape : (a * 0.75 + shape * 0.25);
            };

            // ---- 2. ANCHORS at harmonically strong points ----
            // Anchoring EVERY chord event chopped the line into spans of one
            // uniform length. With two chords per bar that is a 2-beat cell
            // everywhere, and any word whose rhythm is naturally longer — every
            // 'sustain' word, whose cells run 2 to 4 beats — got clipped to a
            // single 2-beat note in every span. The result scanned identically
            // bar after bar no matter what word was typed.
            //
            // Bar downbeats always anchor. A mid-bar chord earns one only when
            // the harmony actually CHANGES there; a bar that simply restates
            // its chord (Fm7 on 1, Fm7 on 3) is one harmonic event and leaves
            // the whole bar free for the word to scan across.
            const anchorBeats = [];
            const evs = (harmony && harmony.chordSequence) || [];
            const realEvs = evs.filter(ev => ev && !ev.approachStrategy);   // anchors sit on real harmony
            const chordAt = new Map();
            realEvs.forEach((ev) => {
                const b = ev.bar * beatsPerBar + ev.beat;
                if (b < totalBeats && !chordAt.has(b)) chordAt.set(b, ev.chord || '');
            });
            const beatsSorted = Array.from(chordAt.keys()).sort((x, y) => x - y);
            let lastChord = null;
            beatsSorted.forEach((b) => {
                const isDownbeat = Math.abs(b % beatsPerBar) < 1e-6;
                const chord = chordAt.get(b);
                const changed = chord !== lastChord;
                if (isDownbeat || changed) anchorBeats.push(b);
                lastChord = chord;
            });
            if (!anchorBeats.length) {
                for (let b = 0; b < totalBeats; b += beatsPerBar) anchorBeats.push(b);
            }
            anchorBeats.sort((a, b) => a - b);

            const centre = (LOW + HIGH) / 2;
            const span = (HIGH - LOW) / 2;
            // Anchors are placed SEQUENTIALLY, each one near the last. Choosing
            // them independently from the contour let consecutive anchors sit a
            // ninth apart, which forced the connecting material into leaps and
            // wrecked the stepwise character of the line.
            const anchors = [];
            let prevAnchor = null;
            anchorBeats.forEach((b, idx) => {
                const t = totalBeats > 0 ? b / totalBeats : 0;
                const ev = this.harmonyAt(harmony, b, beatsPerBar);
                const ideal = centre + (contourHeight(t) - 0.5) * span * 1.2;
                let choices = this.chordMidis(ev, LOW, HIGH);
                if (!choices.length) choices = this.scaleMidis(scaleNotes, LOW, HIGH);

                let midi;
                if (prevAnchor === null) {
                    midi = choices.length ? this.nearest(choices, ideal) : Math.round(ideal);
                } else {
                    // Step toward the contour, but never more than a fifth per
                    // anchor — the shape emerges gradually rather than in jumps.
                    const desired = prevAnchor + Math.max(-7, Math.min(7, ideal - prevAnchor));
                    const reachable = choices.filter(m => Math.abs(m - prevAnchor) <= 7);
                    midi = reachable.length
                        ? this.nearest(reachable, desired)
                        : this.nearest(choices, desired);
                }
                prevAnchor = midi;
                anchors.push({ beat: b, midi, ev });
            });

            // ---- 5. DEVELOPMENT: capture bar 1's rhythmic idea ----
            const motif = [];
            let motifCaptured = false;

            // ---- 6. BREATH: density plan per anchor span ----
            const notes = [];
            let sylIdx = 0;
            const nextSyllable = () => {
                if (!syllables.length) return null;
                const s = syllables[sylIdx % syllables.length];
                sylIdx++;
                return s;
            };

            let lastLeap = 0;

            for (let a = 0; a < anchors.length; a++) {
                const from = anchors[a];
                const to = anchors[a + 1] || null;
                const spanStart = from.beat;
                const spanEnd = to ? to.beat : totalBeats;
                let available = spanEnd - spanStart;
                if (available <= 0) continue;

                const arcEnergy = (typeof arc.sample === 'function')
                    ? Math.max(0, Math.min(1, Number(arc.sample(spanStart / Math.max(1, totalBeats))) || 0.5))
                    : 0.5;

                // Density ebbs and flows: some spans are active, some sustain.
                const activity = Math.max(0, Math.min(1,
                    arcEnergy * 0.55 + melodyC * 0.3 + (rng() - 0.5) * 0.3));
                const sustained = activity < 0.32;

                // Rest between phrase groups keeps the line breathing.
                const wantRest = !sustained && a > 0 && a % 2 === 0 && rng() < 0.35 && available > 1.5;
                let cursor = spanStart;
                if (wantRest) {
                    const rest = available >= 3 ? 1 : 0.5;
                    cursor += rest;
                    available -= rest;
                }

                // RHYTHM comes from the words; PITCH comes from the line
                // architecture. Deriving note count from the span instead of
                // from the syllables flattened every word to the same speed.
                let durations = [];
                if (sustained) {
                    durations = [available];
                } else if (motifCaptured && motif.length && rng() < 0.5) {
                    // DEVELOPMENT: restate the motif, sometimes diminished.
                    const diminish = rhythmC > 0.5 && rng() < 0.4;
                    durations = motif.map(d => diminish ? Math.max(0.25, d / 2) : d);
                } else {
                    // Consume syllables in order, each with its own word-derived
                    // rhythm cell, until the span is filled.
                    //
                    // Once the text runs out the line must keep going, and
                    // repeating the syllable's single duration tiled the same
                    // value through every span: a one-word input like "time"
                    // reduces to one cell duration, so every 2-beat span came
                    // out [2] and every bar scanned identically. Past the last
                    // syllable the engine DEVELOPS instead — drawing whole cells
                    // from that word's own rhythmic family, so the variation is
                    // in character rather than arbitrary.
                    let used = 0;
                    let guard = 0;
                    let emitted = 0;
                    const queue = [];
                    while (used < available - 1e-6 && guard++ < 24) {
                        if (!queue.length) {
                            const idx = sylIdx + emitted;
                            const syl = syllables.length ? syllables[idx % syllables.length] : null;
                            const firstPass = syllables.length ? (idx < syllables.length) : false;

                            if (firstPass && syl && Number.isFinite(syl.cellDuration)) {
                                queue.push(syl.cellDuration);          // the word's literal scansion
                            } else {
                                const opts = (syl && Array.isArray(syl.cellOptions) && syl.cellOptions.length)
                                    ? syl.cellOptions : null;
                                if (opts) {
                                    // Vary by span AND position so consecutive spans
                                    // differ, and fold in the WORD itself so two words
                                    // sharing a family don't develop identically —
                                    // "whisper" and "drift" are both sustained, but
                                    // they should not scan the same. This mirrors the
                                    // per-word offset rhythmFor already applies to the
                                    // opening cell.
                                    let wh = 0;
                                    for (const c of String((syl && syl.parentWord) || '')) {
                                        wh = ((wh << 5) - wh + c.charCodeAt(0)) | 0;
                                    }
                                    // MIX the word into every pick rather than using it
                                    // as a starting offset. An offset only rotates the
                                    // same sequence, so with a four- or five-cell
                                    // vocabulary two words in one family kept landing on
                                    // identical runs. Mixing decorrelates them while the
                                    // seeded draw keeps take-to-take variety.
                                    const draw = Math.floor(rng() * 0x10000);
                                    let h = (Math.abs(wh) ^ (a * 0x9E3779B1) ^ (emitted * 0x85EBCA77) ^ draw) >>> 0;
                                    h = (h ^ (h >>> 13)) >>> 0;
                                    h = (Math.imul(h, 0xC2B2AE35) ^ (h >>> 16)) >>> 0;
                                    const pick = opts[h % opts.length];
                                    if (Array.isArray(pick) && pick.length) queue.push(...pick);
                                }
                                if (!queue.length) {
                                    queue.push(Number.isFinite(syl && syl.cellDuration) ? syl.cellDuration : 1);
                                }
                            }
                        }

                        let d = queue.shift();
                        if (!Number.isFinite(d) || d <= 0) d = 0.5;
                        if (used + d > available + 1e-6) {
                            const left = available - used;
                            if (left < 0.25) break;
                            d = left;
                            queue.length = 0;
                        }
                        durations.push(d);
                        used += d;
                        emitted++;
                    }
                    if (!durations.length) durations = [available];
                }

                const quant = (v) => {
                    const grid = rhythmC < 0.3 ? [1, 2, 4] : [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
                    let best = grid[0], bd = Math.abs(v - best);
                    for (const g of grid) { const d = Math.abs(v - g); if (d < bd) { bd = d; best = g; } }
                    return best;
                };
                durations = durations.map(quant);
                // Only rescale when the material overruns the span.
                const sum = durations.reduce((s, d) => s + d, 0) || 1;
                if (sum > available + 1e-6) {
                    durations = durations.map(d => Math.max(0.25, quant((d / sum) * available)));
                }
                const count = durations.length;

                if (!motifCaptured && spanStart < beatsPerBar && durations.length) {
                    motif.push(...durations);
                    motifCaptured = true;
                }

                // ---- 3 & 4. CONNECT the anchors ----
                const targetMidi = to ? to.midi : from.midi;
                const homePool = this.scaleMidis(scaleNotes, LOW, HIGH);
                let current = from.midi;

                for (let i = 0; i < count; i++) {
                    const dur = durations[i];
                    if (cursor >= spanEnd - 1e-6 || cursor >= totalBeats - 1e-6) break;

                    const beat = cursor;
                    const evHere = this.harmonyAt(harmony, beat, beatsPerBar) || from.ev;
                    const pinnedSyl = syllables.length ? syllables[sylIdx % syllables.length] : null;
                    const pinnedName = pinnedSyl && pinnedSyl.scaleOverride;
                    let pinnedPool = null;
                    if (pinnedName && this.mt && typeof this.mt.getScaleNotes === 'function') {
                        try {
                            const pn = this.mt.getScaleNotes(
                                (context.harmonicProfile && context.harmonicProfile.root) || 'C',
                                String(pinnedName).toLowerCase().replace(/\s+/g, '_'));
                            if (pn && pn.length) pinnedPool = this.scaleMidis(pn, LOW, HIGH);
                        } catch (_) {}
                    }
                    const chordPool = this.chordMidis(evHere, LOW, HIGH);
                    // Follow the sounding scale: when the harmony borrows, the
                    // line borrows with it.
                    const hintNotes = (evHere && Array.isArray(evHere.scaleHintNotes) && evHere.scaleHintNotes.length)
                        ? evHere.scaleHintNotes : null;
                    const scalePool = hintNotes ? this.scaleMidis(hintNotes, LOW, HIGH) : homePool;
                    const isAnchor = (i === 0);
                    let midi;
                    let role = 'connect';

                    if (isAnchor) {
                        midi = from.midi;
                        role = 'anchor';
                        // Guard the seam between spans: the previous span's last
                        // note may sit far from this anchor.
                        if (notes.length && Math.abs(midi - current) > 12) {
                            const near = (chordPool.length ? chordPool : scalePool)
                                .filter(m => Math.abs(m - current) <= 9);
                            if (near.length) midi = this.nearest(near, midi);
                        }
                    } else {
                        // Move toward the next anchor, by step wherever possible.
                        const remaining = count - i;
                        const gap = targetMidi - current;
                        const idealStep = gap / Math.max(1, remaining);

                        if (lastLeap !== 0) {
                            // Answer a leap with contrary stepwise motion.
                            const dir = lastLeap > 0 ? -1 : 1;
                            const stepped = scalePool.filter(m => (m - current) * dir > 0);
                            midi = stepped.length ? this.nearest(stepped, current + dir * 2) : current;
                            role = 'recovery';
                            lastLeap = 0;
                        } else if (Math.abs(idealStep) <= 2.5) {
                            // Stepwise connection — the default motion.
                            const dir = idealStep >= 0 ? 1 : -1;
                            const stepped = scalePool.filter(m => (m - current) * dir > 0);
                            midi = stepped.length ? this.nearest(stepped, current + dir * 2) : current;
                        } else {
                            // A leap, used sparingly and only toward a chord tone.
                            const pool = chordPool.length ? chordPool : scalePool;
                            const capped = Math.max(-12, Math.min(12, idealStep));
                            midi = this.nearest(pool, current + capped);
                            if (Math.abs(midi - current) > 12) {
                                midi = this.nearest(pool.filter(m => Math.abs(m - current) <= 12), current + capped);
                            }
                            lastLeap = midi - current;
                            role = 'leap';
                        }

                        // DECORATION: a non-chord tone must have a function and
                        // resolve. Chromatic notes are only ever leading tones
                        // into the following pitch — never free-floating colour.
                        const wantsDecoration = melodyC > 0.4 && dur >= 0.5 && rng() < (melodyC - 0.3) * 0.5;
                        if (wantsDecoration && !chordPool.includes(midi)) {
                            role = (Math.abs(midi - current) <= 2) ? 'passing' : 'neighbor';
                        }
                    }

                    if (pinnedPool && pinnedPool.length) midi = this.nearest(pinnedPool, midi);
                    midi = Math.max(LOW, Math.min(HIGH, midi));

                    // INTENTION CHECK: every pitch must be justifiable — a tone
                    // of the sounding chord, a member of the sounding scale, or
                    // a decoration that resolves. Anything else is the "random
                    // accidental" case, so pull it into the sounding scale.
                    const justified = chordPool.includes(midi)
                        || scalePool.includes(midi)
                        || (pinnedPool && pinnedPool.includes(midi))
                        || role === 'passing' || role === 'neighbor';
                    if (!justified) {
                        const pool = scalePool.length ? scalePool : chordPool;
                        if (pool.length) midi = this.nearest(pool, midi);
                    }
                    // Absolute ceiling on melodic distance: a leap wider than an
                    // octave is never "sparing emphasis", it is a rupture.
                    if (!isAnchor && Math.abs(midi - current) > 12) {
                        const near = (chordPool.length ? chordPool : scalePool)
                            .filter(m => Math.abs(m - current) <= 12);
                        midi = near.length
                            ? this.nearest(near, current + (midi > current ? 7 : -7))
                            : current + (midi > current ? 12 : -12);
                        midi = Math.max(LOW, Math.min(HIGH, midi));
                        lastLeap = midi - current;
                    }
                    const syl = nextSyllable();
                    notes.push({
                        bar: Math.floor(beat / beatsPerBar),
                        beat: beat % beatsPerBar,
                        noteName: this.nameOf(midi, preferFlat),
                        duration: Math.min(dur, totalBeats - beat),
                        syllable: syl ? syl.text : null,
                        word: syl ? syl.parentWord : null,
                        scaleName: pinnedName
                            ? String(pinnedName).toLowerCase().replace(/\s+/g, '_')
                            : ((evHere && evHere.scaleHint && evHere.scaleHint.scaleName)
                               || (context.harmonicProfile && context.harmonicProfile.recommendedScale)),
                        scaleRoot: (evHere && evHere.scaleHint && evHere.scaleHint.root)
                            || (context.harmonicProfile && context.harmonicProfile.root),
                        role,
                        chordTone: chordPool.includes(midi)
                            || this.chordMidis(from.ev, LOW, HIGH).includes(midi)
                            || (to && this.chordMidis(to.ev, LOW, HIGH).includes(midi)),
                        chromatic: (role === 'passing' || role === 'neighbor')
                            && !(hintNotes ? this.scaleMidis(hintNotes, midi, midi).length
                                           : this.scaleMidis(scaleNotes, midi, midi).length)
                    });
                    current = midi;
                    cursor += dur;
                }
            }

            // ---- Cadence: the line must arrive, not stop ----
            if (notes.length) {
                const last = notes[notes.length - 1];
                const finalEv = evs.filter(e => e && !e.approachStrategy).pop();
                const pool = this.chordMidis(finalEv, LOW, HIGH);
                if (pool.length) {
                    const lastMidi = this.midiOf(last.noteName);
                    const landing = this.nearest(pool, Number.isFinite(lastMidi) ? lastMidi : centre);
                    last.noteName = this.nameOf(landing, preferFlat);
                    last.role = 'cadence';
                    last.cadence = true;
                    last.chordTone = true;
                    last.chromatic = false;
                    if (last.duration < 1) last.duration = Math.min(2, last.duration * 2);
                }
            }

            return { notes, contour, anchors: anchors.map(a => ({ beat: a.beat, midi: a.midi })) };
        }
    }

    if (typeof window !== 'undefined') window.MelodicLineEngine = MelodicLineEngine;
    if (typeof module !== 'undefined' && module.exports) module.exports = MelodicLineEngine;
})();
