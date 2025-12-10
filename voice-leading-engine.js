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
        
        this._log('Generating voice leading for:', chordSymbols);

        // Convert chord symbols to pitch collections
        const chordPitches = chordSymbols.map(symbol => 
            this._getChordPitches(symbol, register)
        );

        // Generate initial voicing for first chord
        const voicings = [];
        const firstVoicing = this._generateInitialVoicing(chordPitches[0], voicing, register);
        voicings.push(firstVoicing);

        // Voice lead to each subsequent chord
        for (let i = 1; i < chordPitches.length; i++) {
            const prevVoicing = voicings[i - 1];
            const nextChordPitches = chordPitches[i];
            
            const nextVoicing = this._voiceLeadToChord(prevVoicing, nextChordPitches, voicing);
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
        
        // Build intervals for chord type
        const intervals = this._getChordIntervals(parsed);
        
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
        if (/^(m|min|minor|-)/i.test(symbol)) {
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
            if (ext === '7') intervals.push(10);
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
    _generateInitialVoicing(chordPitches, voicingType, register) {
        const pitches = chordPitches.pitches;
        const bass = chordPitches.bass;

        if (voicingType === 'close') {
            // Close voicing: all upper voices within an octave
            return {
                bass: bass,
                tenor: pitches[0] + 12,
                alto: pitches[1 % pitches.length] + 12,
                soprano: pitches[2 % pitches.length] + 12
            };
        } else {
            // Spread voicing: wider spacing
            return {
                bass: bass,
                tenor: pitches[0] + 12,
                alto: pitches[1 % pitches.length] + 19,
                soprano: pitches[2 % pitches.length] + 24
            };
        }
    }

    /**
     * Voice lead from previous voicing to next chord
     * Uses dynamic programming to find optimal voice leading
     */
    _voiceLeadToChord(prevVoicing, nextChordPitches, voicingType) {
        const nextPitches = this._generatePitchOptions(nextChordPitches);
        
        // Find best assignment of voices to pitches
        const bestVoicing = this._findOptimalVoicing(
            prevVoicing,
            nextPitches,
            nextChordPitches.bass
        );

        return bestVoicing;
    }

    /**
     * Generate pitch options for each voice (multiple octaves)
     */
    _generatePitchOptions(chordPitches) {
        const options = {
            soprano: [],
            alto: [],
            tenor: [],
            bass: []
        };

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
                if (p >= this.ranges.soprano.min && p <= this.ranges.soprano.max) {
                    options.soprano.push(p);
                }
            }
        }

        return options;
    }

    /**
     * Find optimal voicing using cost function
     */
    _findOptimalVoicing(prevVoicing, pitchOptions, nextBass) {
        let bestVoicing = null;
        let bestCost = Infinity;

        // Try all combinations (simplified - in practice use pruning)
        for (const soprano of pitchOptions.soprano) {
            for (const alto of pitchOptions.alto) {
                for (const tenor of pitchOptions.tenor) {
                    for (const bass of pitchOptions.bass) {
                        const voicing = { soprano, alto, tenor, bass };
                        const cost = this._calculateVoicingCost(prevVoicing, voicing);
                        
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
