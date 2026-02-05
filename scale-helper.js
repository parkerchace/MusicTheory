/**
 * ScaleHelper - Connects example progressions with different scales
 * Allows voice leading and MIDI examples to be transposed/shown in different scales
 * Uses NumberGenerator concepts for scale degrees
 */
class ScaleHelper {
    constructor() {
        this.scales = {
            'major': {
                name: 'Major (Ionian)',
                intervals: [0, 2, 4, 5, 7, 9, 11], // Semitone intervals from root
                chordTypes: {
                    'I': { intervals: [0, 4, 7], quality: 'maj' },
                    'ii': { intervals: [2, 5, 9], quality: 'min' },
                    'iii': { intervals: [4, 7, 11], quality: 'min' },
                    'IV': { intervals: [5, 9, 0], quality: 'maj' },
                    'V': { intervals: [7, 11, 2], quality: 'maj' },
                    'vi': { intervals: [9, 0, 4], quality: 'min' },
                    'vii°': { intervals: [11, 2, 5], quality: 'dim' }
                }
            },
            'minor': {
                name: 'Minor (Natural)',
                intervals: [0, 2, 3, 5, 7, 8, 10], // Natural minor
                chordTypes: {
                    'i': { intervals: [0, 3, 7], quality: 'min' },
                    'ii°': { intervals: [2, 5, 8], quality: 'dim' },
                    'III': { intervals: [3, 7, 10], quality: 'maj' },
                    'iv': { intervals: [5, 8, 0], quality: 'min' },
                    'v': { intervals: [7, 10, 2], quality: 'min' },
                    'VI': { intervals: [8, 0, 3], quality: 'maj' },
                    'VII': { intervals: [10, 2, 5], quality: 'maj' }
                }
            },
            'dorian': {
                name: 'Dorian',
                intervals: [0, 2, 3, 5, 7, 9, 10],
                chordTypes: {
                    'i': { intervals: [0, 3, 7], quality: 'min' },
                    'ii': { intervals: [2, 5, 9], quality: 'min' },
                    'III': { intervals: [3, 7, 10], quality: 'maj' },
                    'IV': { intervals: [5, 9, 0], quality: 'maj' },
                    'v': { intervals: [7, 10, 2], quality: 'min' },
                    'vi°': { intervals: [9, 0, 3], quality: 'dim' },
                    'VII': { intervals: [10, 2, 5], quality: 'maj' }
                }
            },
            'phrygian': {
                name: 'Phrygian',
                intervals: [0, 1, 3, 5, 7, 8, 10],
                chordTypes: {
                    'i': { intervals: [0, 3, 7], quality: 'min' },
                    'II': { intervals: [1, 5, 8], quality: 'maj' },
                    'III': { intervals: [3, 7, 10], quality: 'maj' },
                    'iv': { intervals: [5, 8, 0], quality: 'min' },
                    'v°': { intervals: [7, 10, 1], quality: 'dim' },
                    'VI': { intervals: [8, 0, 3], quality: 'maj' },
                    'vii': { intervals: [10, 1, 5], quality: 'min' }
                }
            },
            'lydian': {
                name: 'Lydian',
                intervals: [0, 2, 4, 6, 7, 9, 11],
                chordTypes: {
                    'I': { intervals: [0, 4, 7], quality: 'maj' },
                    'II': { intervals: [2, 6, 9], quality: 'maj' },
                    'iii': { intervals: [4, 7, 11], quality: 'min' },
                    'iv°': { intervals: [6, 9, 0], quality: 'dim' },
                    'V': { intervals: [7, 11, 2], quality: 'maj' },
                    'vi': { intervals: [9, 0, 4], quality: 'min' },
                    'vii': { intervals: [11, 2, 6], quality: 'min' }
                }
            },
            'mixolydian': {
                name: 'Mixolydian',
                intervals: [0, 2, 4, 5, 7, 9, 10],
                chordTypes: {
                    'I': { intervals: [0, 4, 7], quality: 'maj' },
                    'ii': { intervals: [2, 5, 9], quality: 'min' },
                    'iii°': { intervals: [4, 7, 10], quality: 'dim' },
                    'IV': { intervals: [5, 9, 0], quality: 'maj' },
                    'v': { intervals: [7, 10, 2], quality: 'min' },
                    'vi': { intervals: [9, 0, 4], quality: 'min' },
                    'VII': { intervals: [10, 2, 5], quality: 'maj' }
                }
            }
        };

        this.selectedScale = 'major';
        this.selectedKey = 'C';
    }

    /**
     * Get available scales
     */
    getAvailableScales() {
        return Object.keys(this.scales).map(key => ({
            key: key,
            name: this.scales[key].name
        }));
    }

    /**
     * Get scale notes (MIDI) for a given root
     */
    getScaleNotes(rootMidi, scaleName = 'major') {
        const scale = this.scales[scaleName];
        if (!scale) return [];
        
        return scale.intervals.map(interval => rootMidi + interval);
    }

    /**
     * Get chord notes in a specific scale
     * e.g., getChordInScale(60, 'I', 'major') -> [60, 64, 67] (C major: C-E-G)
     */
    getChordInScale(rootMidi, degree, scaleName = 'major') {
        const scale = this.scales[scaleName];
        if (!scale || !scale.chordTypes[degree]) {
            console.warn(`Degree ${degree} not found in ${scaleName}`);
            return [];
        }

        const chordInfo = scale.chordTypes[degree];
        return chordInfo.intervals.map(interval => rootMidi + interval);
    }

    /**
     * Transpose progression from one key to another
     */
    transposeProgression(progression, fromKeyMidi, toKeyMidi) {
        const transposition = toKeyMidi - fromKeyMidi;
        
        return progression.map(chord => ({
            ...chord,
            root: chord.root + transposition
        }));
    }

    /**
     * Convert a progression by scale (e.g., I-IV-V in different scales)
     * Takes Roman numeral progression and applies it to a new scale
     */
    convertProgressionToScale(romanNumerals, keyMidi, scaleName) {
        return romanNumerals.map(roman => {
            const notes = this.getChordInScale(keyMidi, roman, scaleName);
            return {
                roman: roman,
                notes: notes,
                keyMidi: keyMidi,
                scale: scaleName
            };
        });
    }

    /**
     * Get progression across multiple scales (modal interchange)
     * Shows same progression but in different modes
     */
    getModalInterchangeProgression(romanNumerals, keyMidi, baseScale = 'major') {
        const modes = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian'];
        const result = {};

        modes.forEach(mode => {
            result[mode] = this.convertProgressionToScale(romanNumerals, keyMidi, mode);
        });

        return result;
    }

    /**
     * Get common progressions in different keys
     */
    getProgressionInKeys(progressionTemplate, keys = ['C', 'F', 'G', 'D']) {
        const noteToMidi = {
            'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
            'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
            'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
        };

        const result = {};
        keys.forEach(key => {
            const keyMidi = noteToMidi[key];
            result[key] = this.transposeProgression(progressionTemplate, 60, keyMidi);
        });

        return result;
    }

    /**
     * Get diatonic chords in a scale (for chord selection UI)
     */
    getDiatonicChords(scaleName = 'major', keyNote = 'C') {
        const scale = this.scales[scaleName];
        if (!scale) return [];

        const noteToMidi = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
            'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

        const keyOffset = noteToMidi[keyNote];

        return Object.entries(scale.chordTypes).map(([degree, info]) => ({
            degree: degree,
            quality: info.quality,
            notes: info.intervals.map(i => i + keyOffset)
        }));
    }

    /**
     * Get borrowed chords (from parallel minor/major)
     */
    getBorrowedChords(primaryScale = 'major', secondaryScale = 'minor', keyNote = 'C') {
        const primary = this.getDiatonicChords(primaryScale, keyNote);
        const secondary = this.getDiatonicChords(secondaryScale, keyNote);

        // Find chords that exist in secondary but not primary
        const borrowed = secondary.filter(sChord => 
            !primary.some(pChord => pChord.degree === sChord.degree)
        );

        return borrowed;
    }

    /**
     * Create visual label for a chord in context
     */
    formatChordLabel(degree, scaleName, keyNote = 'C') {
        return `${degree} (in ${keyNote} ${scaleName})`;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScaleHelper;
}
