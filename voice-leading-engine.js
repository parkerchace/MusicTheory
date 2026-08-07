/**
 * @module VoiceLeadingEngine
 * @description Intelligent voice leading for chord progressions
 * 
 * PROPER VOICE LEADING:
 * - Minimizes movement in each voice
 * - Prefers stepwise motion over leaps
 * - Handles common tone retention
 * - Resolves tendency tones (leading tones, 7ths)
 * - Avoids parallel 5ths and octaves
 * - Maintains proper voice ranges
 * 
 * Each chord is a set of actual pitches (not just symbols)
 * Voice leading connects chord to chord with intention
 */

class VoiceLeadingEngine {
    constructor(musicTheoryEngine) {
        this.musicTheory = musicTheoryEngine;
        
        // Voice ranges (MIDI note numbers)
        this.ranges = {
            soprano: { min: 60, max: 81 },  // C4 to A5
            alto:    { min: 55, max: 74 },  // G3 to D5
            tenor:   { min: 48, max: 67 },  // C3 to G4
            bass:    { min: 40, max: 60 }   // E2 to C4
        };

        // Voice leading costs (lower = better)
        this.costs = {
            stepwise: 1,         // Whole or half step
            third: 2,            // Minor or major third
            fourth: 3,           // Perfect fourth
            fifth: 4,            // Perfect fifth
            sixthOrLarger: 6,    // Sixth, seventh, octave, etc.
            parallel5th: 100,    // Parallel perfect 5th (bad)
            parallel8ve: 100,    // Parallel octave (bad)
            voiceRange: 50,      // Out of range for voice
            commonTone: -2       // Bonus for keeping common tone
        };

        this.debug = true;
    }

    _log(...args) {
        if (this.debug) console.log('[VoiceLeading]', ...args);
    }

    /**
     * Generate voice leading for chord progression
     * @param {Array} chordSymbols - Array of chord symbols (e.g., ['Cmaj7', 'Fmaj7', 'G7', 'Cmaj7'])
     * @param {Object} options - { voicing: 'close'|'spread', register: 'low'|'mid'|'high' }
     * @returns {Array} Array of voicings with actual pitches
     */
    generateVoiceLeading(chordSymbols, options = {}) {
        const voicing = options.voicing || 'close';
        const register = options.register || 'mid';

        // VL COMBOS ("multi" mode): search several voicing styles and keep the
        // one that moves the voices least across the whole progression. This
        // was previously unimplemented — `mode`/`variant` were accepted and
        // then ignored, so the VL Combos control did nothing at all.
        if (options.mode === 'multi' && !options.__inCombos) {
            const styles = ['close', 'spread', 'drop2', 'shell'];
            let best = null;
            let bestCost = Infinity;
            for (const style of styles) {
                let candidate;
                try {
                    candidate = this.generateVoiceLeading(chordSymbols, {
                        voicing: style, register, __inCombos: true
                    });
                } catch (_) { continue; }
                if (!candidate || !candidate.length) continue;

                let cost = 0;
                for (let i = 1; i < candidate.length; i++) {
                    const a = candidate[i - 1].voices || {};
                    const b = candidate[i].voices || {};
                    for (const key of ['bass', 'tenor', 'alto', 'soprano']) {
                        const x = a[key], y = b[key];
                        if (Number.isFinite(x) && Number.isFinite(y)) cost += Math.abs(y - x);
                    }
                }
                if (cost < bestCost) {
                    bestCost = cost;
                    best = candidate;
                    best.forEach(v => { if (v) v.comboStyle = style; });
                }
            }
            if (best) {
                this._log(`VL Combos picked "${best[0] && best[0].comboStyle}" (movement ${bestCost})`);
                return best;
            }
        }

        this._log('Generating voice leading for:', chordSymbols);

        // MELODY AWARENESS.
        //
        // Without this the accompaniment picks its soprano freely while the
        // melody is written separately afterwards, so the piece ends up with
        // two unrelated top lines: the chord's top voice crosses above the
        // tune, doubles it in unison, or runs in parallel octaves with it.
        // Given the melody note sounding over each chord, the accompaniment
        // keeps its top voice underneath and treats the melody as a real
        // fifth voice when checking parallels.
        const melody = Array.isArray(options.melody) ? options.melody : null;
        const melodyAt = (i) => {
            const m = melody && melody[i];
            return Number.isFinite(m) ? m : null;
        };

        // Convert chord symbols to pitch collections
        const chordPitches = chordSymbols.map(symbol =>
            this._getChordPitches(symbol, register)
        );

        // Generate initial voicing for first chord
        const voicings = [];
        const firstVoicing = this._generateInitialVoicing(chordPitches[0], voicing, register, melodyAt(0));
        voicings.push(firstVoicing);

        // Voice lead to each subsequent chord
        for (let i = 1; i < chordPitches.length; i++) {
            const prevVoicing = voicings[i - 1];
            const nextChordPitches = chordPitches[i];

            const nextVoicing = this._voiceLeadToChord(prevVoicing, nextChordPitches, voicing, {
                melody: melodyAt(i),
                prevMelody: melodyAt(i - 1)
            });
            voicings.push(nextVoicing);
        }

        return voicings.map((voicing, i) => ({
            chord: chordSymbols[i],
            voices: {
                soprano: voicing.soprano,
                alto: voicing.alto,
                tenor: voicing.tenor,
                bass: voicing.bass
            },
            movement: i > 0 ? this._calculateMovement(voicings[i - 1], voicing) : null
        }));
    }

    /**
     * Get available pitches for a chord (pitch class set in one octave)
     */
    _getChordPitches(chordSymbol, register) {
        // Parse chord symbol
        const parsed = this._parseChord(chordSymbol);

        // Get root pitch in middle octave
        const baseOctave = register === 'low' ? 2 : register === 'high' ? 4 : 3;
        const rootPitch = this._noteToMidi(parsed.root, baseOctave);

        // Prefer the app's authoritative chord formulas. The local symbol
        // parser mis-read several common qualities (its /M7/i test matched the
        // lowercase "m7" of a minor-7 chord, so Dm7 came out as D F# A C#), and
        // a second, divergent chord model is exactly the kind of drift that
        // makes one tool contradict another.
        const theory = this.musicTheory
            || (typeof window !== 'undefined' && window.modularApp && window.modularApp.musicTheory)
            || null;
        let intervals = null;
        if (theory && typeof theory.getChordNotes === 'function' && theory.noteValues) {
            try {
                const m = String(chordSymbol || '').match(/^([A-G][#b]?)(.*)$/);
                if (m) {
                    const type = (m[2] || '').split('/')[0].trim() || 'maj';
                    const notes = theory.getChordNotes(m[1], type) || [];
                    const rootVal = theory.noteValues[m[1]];
                    if (notes.length && Number.isFinite(rootVal)) {
                        const seen = new Set();
                        intervals = [];
                        notes.forEach((n) => {
                            const v = theory.noteValues[String(n).replace(/-?\d+$/, '')];
                            if (!Number.isFinite(v)) return;
                            const iv = (((v - rootVal) % 12) + 12) % 12;
                            if (!seen.has(iv)) { seen.add(iv); intervals.push(iv); }
                        });
                        intervals.sort((a, b) => a - b);
                        if (!intervals.length) intervals = null;
                    }
                }
            } catch (_) { intervals = null; }
        }
        if (!intervals) intervals = this._getChordIntervals(parsed);

        // Generate pitch class set
        const pitches = intervals.map(interval => rootPitch + interval);

        return {
            root: parsed.root,
            pitches: pitches,
            bass: parsed.bass ? this._noteToMidi(parsed.bass, baseOctave - 1) : pitches[0]
        };
    }

    /**
     * Parse chord symbol (reuse from ChordAttributeEngine if available)
     */
    _parseChord(symbol) {
        const result = {
            root: '',
            quality: 'major',
            extensions: [],
            alterations: [],
            bass: null
        };

        // Extract root
        const rootMatch = symbol.match(/^[A-G][#b]?/);
        if (rootMatch) {
            result.root = rootMatch[0];
            symbol = symbol.substring(result.root.length);
        }

        // Extract slash bass
        const bassMatch = symbol.match(/\/([A-G][#b]?)/);
        if (bassMatch) {
            result.bass = bassMatch[1];
            symbol = symbol.replace(bassMatch[0], '');
        }

        // Detect quality
        // NOTE: the major-7 test must be case-SENSITIVE for "M7" — with /i it
        // also matched the "m7" of a minor-7 chord.
        if (/maj7|Δ/i.test(symbol) || /M7/.test(symbol)) {
            result.quality = 'major';
            result.extensions.push('maj7');
            symbol = symbol.replace(/maj7|Δ/i, '').replace(/M7/, '');
        } else if (/^(m|min|minor|-)/i.test(symbol)) {
            result.quality = 'minor';
            symbol = symbol.replace(/^(m|min|minor|-)/i, '');
        } else if (/^dim/i.test(symbol)) {
            result.quality = 'diminished';
            symbol = symbol.replace(/^dim/i, '');
        } else if (/^aug/i.test(symbol)) {
            result.quality = 'augmented';
            symbol = symbol.replace(/^aug/i, '');
        }

        // Detect extensions
        if (/13/.test(symbol)) result.extensions.push('13');
        else if (/11/.test(symbol)) result.extensions.push('11');
        else if (/9/.test(symbol)) result.extensions.push('9');
        else if (/7/.test(symbol)) result.extensions.push('7');
        else if (/6/.test(symbol)) result.extensions.push('6');

        // Detect maj7
        if (/(maj|M|Δ)7/.test(symbol)) {
            result.extensions = result.extensions.filter(e => e !== '7');
            result.extensions.push('maj7');
        }

        return result;
    }

    /**
     * Get chord intervals from root
     */
    _getChordIntervals(parsed) {
        const intervals = [0]; // Root

        // Third
        if (parsed.quality === 'major') intervals.push(4);
        else if (parsed.quality === 'minor') intervals.push(3);
        else if (parsed.quality === 'diminished') intervals.push(3);
        else if (parsed.quality === 'augmented') intervals.push(4);

        // Fifth
        if (parsed.quality === 'diminished') intervals.push(6);
        else if (parsed.quality === 'augmented') intervals.push(8);
        else intervals.push(7);

        // Extensions
        for (const ext of parsed.extensions) {
            if (ext === '6') intervals.push(9);
            if (ext === '7') intervals.push(parsed.quality === 'diminished' ? 9 : 10);
            if (ext === 'maj7') intervals.push(11);
            if (ext === '9') intervals.push(10, 14); // 7th + 9th
            if (ext === '11') intervals.push(10, 14, 17); // 7th + 9th + 11th
            if (ext === '13') intervals.push(10, 14, 17, 21); // Full extended chord
        }

        return [...new Set(intervals)].sort((a, b) => a - b);
    }

    /**
     * Generate initial voicing for first chord
     */
    _generateInitialVoicing(chordPitches, voicingType, register, melodyMidi) {
        const pitches = chordPitches.pitches;
        const bass = chordPitches.bass;

        // Voice the chord's ACTUAL tones. The previous version always took
        // pitches[0..2], which on any seventh chord dropped the 7th and
        // doubled the root — the chord's defining colour never sounded.
        const upper = pitches.length > 1 ? pitches.slice(1) : pitches.slice();
        const pick = (i) => upper[i % upper.length];

        // Three upper voices, always ascending above the bass.
        const spacing = (voicingType === 'close') ? 0 : 7;
        const voices = [];
        let cursor = bass;
        for (let i = 0; i < 3; i++) {
            let m = pick(i);
            while (m <= cursor) m += 12;
            if (i > 0) m += spacing > 0 ? 0 : 0;
            voices.push(m);
            cursor = m;
        }

        if (voicingType !== 'close') {
            // Spread: open the inner voices without compounding octaves.
            voices[1] += 12;
            voices[2] += 12;
            voices.sort((a, b) => a - b);
        }

        const out = { bass: bass, tenor: voices[0], alto: voices[1], soprano: voices[2] };

        // Drop the accompaniment by octaves until its top voice clears the
        // melody. Opening the piece with the pad sitting on top of the tune
        // buries the first phrase before the line has established itself.
        if (Number.isFinite(melodyMidi)) {
            let guard = 0;
            while (out.soprano >= melodyMidi && guard++ < 3) {
                out.soprano -= 12; out.alto -= 12; out.tenor -= 12;
                if (out.bass > this.ranges.bass.min + 12) out.bass -= 12;
            }
        }
        return out;
    }

    /**
     * Voice lead from previous voicing to next chord
     * Uses dynamic programming to find optimal voice leading
     */
    _voiceLeadToChord(prevVoicing, nextChordPitches, voicingType, melodyCtx = {}) {
        const nextPitches = this._generatePitchOptions(nextChordPitches, melodyCtx.melody);

        // Find best assignment of voices to pitches
        const bestVoicing = this._findOptimalVoicing(
            prevVoicing,
            nextPitches,
            nextChordPitches.bass,
            melodyCtx,
            nextChordPitches
        );

        return bestVoicing;
    }

    /**
     * Generate pitch options for each voice (multiple octaves)
     */
    _generatePitchOptions(chordPitches, melodyMidi) {
        const options = {
            soprano: [],
            alto: [],
            tenor: [],
            bass: []
        };
        // The accompaniment's top voice stays strictly below the melody. Equal
        // is excluded too: a unison doubling makes the melody note vanish into
        // the pad instead of singing over it.
        const ceiling = Number.isFinite(melodyMidi) ? melodyMidi - 1 : null;

        // Bass gets root or specified bass note
        const bassPitch = chordPitches.bass;
        for (let octave = -1; octave <= 1; octave++) {
            const pitch = bassPitch + (octave * 12);
            if (pitch >= this.ranges.bass.min && pitch <= this.ranges.bass.max) {
                options.bass.push(pitch);
            }
        }

        // Upper voices get all chord tones in their ranges
        for (const pitch of chordPitches.pitches) {
            for (let octave = 0; octave <= 3; octave++) {
                const p = pitch + (octave * 12);
                
                if (p >= this.ranges.tenor.min && p <= this.ranges.tenor.max) {
                    options.tenor.push(p);
                }
                if (p >= this.ranges.alto.min && p <= this.ranges.alto.max) {
                    options.alto.push(p);
                }
                if (p >= this.ranges.soprano.min && p <= this.ranges.soprano.max
                    && (ceiling === null || p <= ceiling)) {
                    options.soprano.push(p);
                }
            }
        }

        // A melody down in the accompaniment's own register empties the soprano
        // list. Staying under the tune matters more than which register name a
        // voice carries, so widen downward — first into the alto range, then by
        // dropping chord tones whole octaves — rather than giving up and
        // letting the pad sit on top of the melody.
        if (!options.soprano.length && ceiling !== null) {
            const under = options.alto.filter(p => p <= ceiling);
            if (under.length) {
                options.soprano = under;
            } else {
                const dropped = [];
                for (const pitch of chordPitches.pitches) {
                    for (let octave = -2; octave <= 3; octave++) {
                        const p = pitch + (octave * 12);
                        if (p <= ceiling && p >= this.ranges.bass.min) dropped.push(p);
                    }
                }
                options.soprano = dropped.length ? dropped : options.alto.slice();
            }
        } else if (!options.soprano.length) {
            options.soprano = options.alto.slice();
        }

        // The inner voices must not poke above the top voice either.
        if (ceiling !== null) {
            const trim = (list) => {
                const f = list.filter(p => p <= ceiling);
                return f.length ? f : list;
            };
            options.alto = trim(options.alto);
            options.tenor = trim(options.tenor);
        }

        return options;
    }

    /**
     * Find optimal voicing using cost function
     */
    _findOptimalVoicing(prevVoicing, pitchOptions, nextBass, melodyCtx = {}, chordPitches = null) {
        let bestVoicing = null;
        let bestCost = Infinity;

        // Try all combinations (simplified - in practice use pruning)
        for (const soprano of pitchOptions.soprano) {
            for (const alto of pitchOptions.alto) {
                for (const tenor of pitchOptions.tenor) {
                    for (const bass of pitchOptions.bass) {
                        const voicing = { soprano, alto, tenor, bass };
                        const cost = this._calculateVoicingCost(prevVoicing, voicing)
                            + this._melodyCost(prevVoicing, voicing, melodyCtx)
                            + this._structureCost(voicing, chordPitches);

                        if (cost < bestCost) {
                            bestCost = cost;
                            bestVoicing = voicing;
                        }
                    }
                }
            }
        }

        return bestVoicing || prevVoicing; // Fallback
    }

    /**
     * Is this even a VOICING?
     *
     * The optimiser scored only how far each voice moved and whether any pair
     * moved in parallel fifths. Nothing said the voices had to stay in order,
     * or that they had to be different notes, or that the chord had to be
     * complete — and because holding a voice still is the cheapest thing it can
     * do, the search converged on collapsed stacks: A♭m7♭5 came back as
     * soprano 60 / alto 60 / tenor 57 / bass 57, which is two notes wearing
     * four voice names, with the fifth and seventh missing entirely. Roughly
     * two thirds of all voicings failed validation downstream and were thrown
     * away, so the accompaniment fell back to raw chord tones nearly every bar.
     *
     * These are hard structural facts about four-part writing, so they carry
     * costs large enough to outrank any amount of smooth motion.
     */
    _structureCost(v, chordPitches) {
        let cost = 0;
        const { soprano: s, alto: a, tenor: t, bass: b } = v;
        if (![s, a, t, b].every(Number.isFinite)) return 1e6;

        // 1. Voices must not cross, and must not double each other in unison.
        //    (An octave apart is fine; the same pitch is not.)
        if (s < a) cost += 400; else if (s === a) cost += 300;
        if (a < t) cost += 400; else if (a === t) cost += 300;
        if (t < b) cost += 400; else if (t === b) cost += 300;

        // 2. Spacing. Upper voices sit within an octave of each other; the gap
        //    from tenor down to bass is allowed to be wider, as it is in real
        //    four-part writing.
        if (s - a > 12) cost += 120;
        if (a - t > 12) cost += 120;
        if (t - b > 19) cost += 80;

        // 3. Completeness: the chord's defining tones have to be present. The
        //    fifth is droppable; the third and the seventh are not.
        if (chordPitches && Array.isArray(chordPitches.pitches) && chordPitches.pitches.length) {
            const pcs = new Set([s, a, t, b].map(m => ((m % 12) + 12) % 12));
            const root = ((chordPitches.pitches[0] % 12) + 12) % 12;
            const want = [];
            chordPitches.pitches.forEach((p) => {
                const iv = ((p - chordPitches.pitches[0]) % 12 + 12) % 12;
                if (iv === 3 || iv === 4 || iv === 10 || iv === 11) {
                    want.push(((p % 12) + 12) % 12);
                }
            });
            if (!pcs.has(root)) cost += 150;
            want.forEach(pc => { if (!pcs.has(pc)) cost += 180; });
            // Three different notes minimum — anything less is not a chord.
            if (pcs.size < 3) cost += 250;
        }
        return cost;
    }

    /**
     * Cost of this voicing measured against the melody sitting above it.
     *
     * The melody is treated as a real voice: the same parallel-fifth and
     * parallel-octave rules that apply between alto and tenor apply between
     * every accompaniment voice and the tune. Without this the pad can march
     * in octaves with the melody and the texture collapses from four parts
     * into one thick line.
     */
    _melodyCost(prevVoicing, nextVoicing, melodyCtx = {}) {
        const mel = melodyCtx.melody;
        const prevMel = melodyCtx.prevMelody;
        if (!Number.isFinite(mel)) return 0;

        let cost = 0;
        const voices = ['soprano', 'alto', 'tenor', 'bass'];

        for (const v of voices) {
            const next = nextVoicing[v];
            if (!Number.isFinite(next)) continue;

            // Crossing above or colliding with the melody.
            if (next > mel) cost += 60;
            else if (next === mel) cost += 25;

            // Parallel perfects against the melody.
            if (Number.isFinite(prevMel) && Number.isFinite(prevVoicing[v])) {
                const before = Math.abs(prevMel - prevVoicing[v]) % 12;
                const after = Math.abs(mel - next) % 12;
                const sameDir = (mel - prevMel) * (next - prevVoicing[v]) > 0;
                if (sameDir && before === after && (after === 7 || after === 0)) {
                    cost += after === 0 ? this.costs.parallel8ve : this.costs.parallel5th;
                }
            }
        }

        // Keep the top of the accompaniment close under the melody so the two
        // read as one texture — a pad two octaves below leaves a hole.
        const gap = mel - nextVoicing.soprano;
        if (Number.isFinite(gap) && gap > 0) {
            if (gap > 16) cost += (gap - 16) * 1.5;
            else if (gap < 3) cost += (3 - gap) * 2;
        }

        return cost;
    }

    /**
     * Calculate cost of voice leading
     */
    _calculateVoicingCost(prevVoicing, nextVoicing) {
        let cost = 0;

        const voices = ['soprano', 'alto', 'tenor', 'bass'];
        
        // Calculate movement cost for each voice
        for (const voice of voices) {
            const interval = Math.abs(nextVoicing[voice] - prevVoicing[voice]);
            
            if (interval === 0) {
                cost += this.costs.commonTone; // Bonus for common tone
            } else if (interval <= 2) {
                cost += this.costs.stepwise;
            } else if (interval <= 4) {
                cost += this.costs.third;
            } else if (interval <= 5) {
                cost += this.costs.fourth;
            } else if (interval === 7) {
                cost += this.costs.fifth;
            } else {
                cost += this.costs.sixthOrLarger;
            }
        }

        // Penalize parallel 5ths and octaves
        for (let i = 0; i < voices.length; i++) {
            for (let j = i + 1; j < voices.length; j++) {
                const v1 = voices[i];
                const v2 = voices[j];
                
                const prevInterval = Math.abs(prevVoicing[v1] - prevVoicing[v2]) % 12;
                const nextInterval = Math.abs(nextVoicing[v1] - nextVoicing[v2]) % 12;
                
                // Check for parallel 5ths
                if (prevInterval === 7 && nextInterval === 7) {
                    const prevDirection = prevVoicing[v1] > prevVoicing[v2];
                    const nextDirection = nextVoicing[v1] > nextVoicing[v2];
                    if (prevDirection === nextDirection) {
                        cost += this.costs.parallel5th;
                    }
                }
                
                // Check for parallel octaves
                if (prevInterval === 0 && nextInterval === 0) {
                    cost += this.costs.parallel8ve;
                }
            }
        }

        return cost;
    }

    /**
     * Calculate movement statistics
     */
    _calculateMovement(prevVoicing, nextVoicing) {
        const voices = ['soprano', 'alto', 'tenor', 'bass'];
        const movements = {};
        let totalMovement = 0;

        for (const voice of voices) {
            const interval = nextVoicing[voice] - prevVoicing[voice];
            movements[voice] = {
                interval: interval,
                semitones: Math.abs(interval),
                direction: interval > 0 ? 'up' : interval < 0 ? 'down' : 'static'
            };
            totalMovement += Math.abs(interval);
        }

        return {
            byVoice: movements,
            totalSemitones: totalMovement,
            efficient: totalMovement < 8 // Less than octave total movement
        };
    }

    /**
     * Convert note name to MIDI number
     */
    _noteToMidi(note, octave) {
        // Shared reader first, so a degree spelled C♭ or E♯ produces a pitch
        // rather than NaN — which propagates through every interval this engine
        // measures and quietly discards the voicing.
        const shared = (typeof window !== 'undefined' && window.MusicNotes && window.MusicNotes.midi)
            ? window.MusicNotes.midi(`${note}${octave}`) : null;
        if (shared !== null && shared !== undefined) return shared;

        const noteMap = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11
        };

        return noteMap[note] + (octave + 1) * 12;
    }

    /**
     * Convert MIDI number to note name
     */
    _midiToNote(midi) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const note = notes[midi % 12];
        return `${note}${octave}`;
    }
}

// Export for browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceLeadingEngine;
}
if (typeof window !== 'undefined') {
    window.VoiceLeadingEngine = VoiceLeadingEngine;
}
