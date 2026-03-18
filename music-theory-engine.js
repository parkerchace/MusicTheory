/**
 * @module MusicTheoryEngine
 * @description Core music theory calculations, scales, and chord analysis used by all other modules
 * @exports class MusicTheoryEngine
 * @feature Complete scale library across Western, Middle Eastern, Indian, and other traditions
 * @feature Complete chord formula system
 * @feature Functional harmony analysis
 * @feature Container chord analysis
 * @feature Scale degree calculations
 */


class MusicTheoryEngine {
    constructor() {
        this.chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        this.noteValues = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };

        // Shared state for grading system
        this.gradingMode = 'functional'; // 'functional' | 'emotional' | 'color'
        this.listeners = new Set();
        
        // Enhanced centralized grading event system
        this.gradingEventQueue = [];
        this.moduleStates = new Map(); // moduleId -> grading state
        this.eventRetryQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 100; // ms
        this.eventTimeout = 5000; // ms for event propagation timeout

        // Key signatures and their preferred accidentals
        this.keySignatures = {
            // Sharp keys
            'C': { accidentals: [], type: 'natural' },
            'G': { accidentals: ['F#'], type: 'sharp' },
            'D': { accidentals: ['F#', 'C#'], type: 'sharp' },
            'A': { accidentals: ['F#', 'C#', 'G#'], type: 'sharp' },
            'E': { accidentals: ['F#', 'C#', 'G#', 'D#'], type: 'sharp' },
            'B': { accidentals: ['F#', 'C#', 'G#', 'D#', 'A#'], type: 'sharp' },
            'F#': { accidentals: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'], type: 'sharp' },
            'C#': { accidentals: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'], type: 'sharp' },
            
            // Flat keys
            'F': { accidentals: ['Bb'], type: 'flat' },
            'Bb': { accidentals: ['Bb', 'Eb'], type: 'flat' },
            'Eb': { accidentals: ['Bb', 'Eb', 'Ab'], type: 'flat' },
            'Ab': { accidentals: ['Bb', 'Eb', 'Ab', 'Db'], type: 'flat' },
            'Db': { accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'], type: 'flat' },
            'Gb': { accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'], type: 'flat' },
            'Cb': { accidentals: ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'], type: 'flat' }
        };

        this.scales = {
            // Western Major & Modes (Church Modes)
            major: [0, 2, 4, 5, 7, 9, 11],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            phrygian: [0, 1, 3, 5, 7, 8, 10],
            lydian: [0, 2, 4, 6, 7, 9, 11],
            mixolydian: [0, 2, 4, 5, 7, 9, 10],
            aeolian: [0, 2, 3, 5, 7, 8, 10],
            locrian: [0, 1, 3, 5, 6, 8, 10],

            // Melodic Minor & Modes
            melodic: [0, 2, 3, 5, 7, 9, 11],
            dorian_b2: [0, 1, 3, 5, 7, 9, 10],
            lydian_augmented: [0, 2, 4, 6, 8, 9, 11],
            lydian_dominant: [0, 2, 4, 6, 7, 9, 10],
            mixolydian_b6: [0, 2, 4, 5, 7, 8, 10],
            locrian_nat2: [0, 2, 3, 5, 6, 8, 10],
            altered: [0, 1, 3, 4, 6, 8, 10],

            // Harmonic Minor & Modes
            harmonic: [0, 2, 3, 5, 7, 8, 11],
            locrian_nat6: [0, 1, 3, 5, 6, 9, 10],
            ionian_augmented: [0, 2, 4, 5, 8, 9, 11],
            dorian_sharp4: [0, 2, 3, 6, 7, 9, 10],
            phrygian_dominant: [0, 1, 4, 5, 7, 8, 10],
            lydian_sharp2: [0, 3, 4, 6, 7, 9, 11],
            altered_diminished: [0, 1, 3, 4, 6, 8, 9],

            // Harmonic Major & Modes
            harmonic_major: [0, 2, 4, 5, 7, 8, 11],
            dorian_b5: [0, 2, 3, 5, 6, 9, 10],
            phrygian_b4: [0, 1, 3, 4, 7, 8, 10],
            lydian_b3: [0, 2, 3, 6, 7, 9, 11],
            mixolydian_b2: [0, 1, 4, 5, 7, 9, 10],
            aeolian_b1: [0, 1, 3, 5, 7, 8, 10],
            locrian_bb7: [0, 1, 3, 5, 6, 8, 9],

            // Double Harmonic & Modes
            double_harmonic_major: [0, 1, 4, 5, 7, 8, 11],
            lydian_sharp2_sharp6: [0, 3, 4, 6, 7, 10, 11],
            ultraphrygian: [0, 1, 4, 5, 6, 9, 10],
            hungarian_minor: [0, 2, 3, 6, 7, 8, 11],
            oriental: [0, 1, 4, 5, 6, 9, 10],
            ionian_augmented_sharp2: [0, 3, 4, 5, 8, 9, 11],
            locrian_bb3_bb7: [0, 1, 2, 5, 6, 8, 9],

            // Symmetric Scales
            whole_tone: [0, 2, 4, 6, 8, 10],
            octatonic_dim: [0, 2, 3, 5, 6, 8, 9, 11],
            octatonic_dom: [0, 1, 3, 4, 6, 7, 9, 10],
            augmented: [0, 3, 4, 7, 8, 11],
            tritone: [0, 1, 4, 6, 7, 10],
            prometheus: [0, 2, 4, 6, 9, 10],

            // Pentatonic Scales
            major_pentatonic: [0, 2, 4, 7, 9],
            minor_pentatonic: [0, 3, 5, 7, 10],
            egyptian_pentatonic: [0, 2, 5, 7, 10],
            blues_minor_pentatonic: [0, 3, 5, 6, 7, 10],
            blues_major_pentatonic: [0, 2, 3, 4, 7, 9],
            hirajoshi: [0, 2, 3, 7, 8],
            iwato: [0, 1, 5, 6, 10],
            insen: [0, 1, 5, 7, 10],
            yo: [0, 2, 5, 7, 9],

            // Hexatonic Scales
            blues_hexatonic: [0, 3, 5, 6, 7, 10],
            whole_tone_hexatonic: [0, 2, 4, 6, 8, 10],
            augmented_hexatonic: [0, 3, 4, 7, 8, 11],
            prometheus_hexatonic: [0, 2, 4, 6, 9, 10],

            // Middle Eastern Scales
            hijaz: [0, 1, 4, 5, 7, 8, 10],
            hijaz_kar: [0, 1, 4, 5, 7, 8, 11],
            maqam_bayati: [0, 1, 3, 5, 7, 8, 10],
            maqam_rast: [0, 2, 4, 5, 7, 9, 10],
            maqam_ajam: [0, 2, 4, 5, 7, 9, 11],
            maqam_nahawand: [0, 2, 3, 5, 7, 8, 10],
            maqam_kurd: [0, 1, 3, 5, 7, 8, 10],
            persian: [0, 1, 4, 5, 6, 8, 11],

            // Indian Ragas (12-TET approximations)
            raga_bhairav: [0, 1, 4, 5, 7, 8, 11],
            raga_todi: [0, 1, 3, 6, 7, 8, 11],
            raga_marwa: [0, 1, 4, 6, 7, 9, 11],
            raga_purvi: [0, 1, 4, 6, 7, 8, 11],
            raga_kafi: [0, 2, 3, 5, 7, 9, 10],
            raga_bhairavi: [0, 1, 3, 5, 7, 8, 10],

            // Spanish/Flamenco Scales
            spanish_phrygian: [0, 1, 4, 5, 7, 8, 10],
            spanish_gypsy: [0, 1, 4, 5, 7, 8, 11],
            flamenco: [0, 1, 3, 4, 5, 7, 8, 10],

            // Jazz Scales
            bebop_major: [0, 2, 4, 5, 7, 8, 9, 11],
            bebop_dominant: [0, 2, 4, 5, 7, 9, 10, 11],
            bebop_minor: [0, 2, 3, 5, 7, 8, 9, 10],
            bebop_dorian: [0, 2, 3, 4, 5, 7, 9, 10],

            // Barry Harris Scales
            barry_major6dim: [0, 2, 3, 4, 5, 7, 9, 10],
            barry_dom7dim: [0, 2, 3, 4, 6, 7, 9, 10],
            barry_minor6dim: [0, 2, 3, 5, 6, 8, 9, 11],

            // Exotic/Modern Scales
            enigmatic: [0, 1, 4, 6, 8, 10, 11],
            neapolitan_major: [0, 1, 3, 5, 7, 9, 11],
            neapolitan_minor: [0, 1, 3, 5, 7, 8, 11],
            romanian_minor: [0, 2, 3, 6, 7, 9, 10],
            ukrainian_dorian: [0, 2, 3, 6, 7, 9, 10],
            leading_whole_tone: [0, 2, 4, 6, 8, 10, 11],

        };

        this.scaleCitations = {};

        // Utility: transpose a note by semitones (supports sharps/flats)
        // Example: transposeNote('C', 4) -> 'E'
        // Example: transposeNote('F#', 2) -> 'G#'
        // Keeps result as a single letter with # if needed (prefers sharps)
        this.transposeNote = (root, semitones) => {
            if (!root || typeof root !== 'string') return root;
            // normalize root (prefer canonical names in noteValues)
            const canonical = Object.prototype.hasOwnProperty.call(this.noteValues, root) ? root : root.replace('♯', '#').replace('♭', 'b');
            const base = this.noteValues[canonical];
            if (base === undefined) {
                // try stripping octave number if present (e.g., C4)
                const match = root.match(/^([A-G][#b]?)/);
                if (match) {
                    const r = match[1];
                    if (this.noteValues[r] !== undefined) return this.chromaticNotes[(this.noteValues[r] + semitones + 120) % 12];
                }
                return root; // unknown root, return as-is
            }
            const idx = (base + semitones + 120) % 12;
            return this.chromaticNotes[idx];
        };

        this.diatonicChordTypes = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
        this.barry8ChordTypes = ['6', 'dim7', 'm7', 'maj7', '7', 'm7', 'dim7', 'm7b5'];

        this.chordFormulas = {
            'maj': [0, 4, 7],
            'm': [0, 3, 7],
            'dim': [0, 3, 6],
            'aug': [0, 4, 8],
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            'maj7': [0, 4, 7, 11],
            'm7': [0, 3, 7, 10],
            '7': [0, 4, 7, 10],
            'm7b5': [0, 3, 6, 10],
            'dim7': [0, 3, 6, 9],
            'mMaj7': [0, 3, 7, 11],
            '7sus4': [0, 5, 7, 10],
            'maj7#5': [0, 4, 8, 11],
            '6': [0, 4, 7, 9],
            'm6': [0, 3, 7, 9],
            '9': [0, 4, 7, 10, 14],
            'maj9': [0, 4, 7, 11, 14],
            'm9': [0, 3, 7, 10, 14],
            '7b9': [0, 4, 7, 10, 13],
            '7#9': [0, 4, 7, 10, 15],
            '11': [0, 4, 7, 10, 14, 17],
            'm11': [0, 3, 7, 10, 14, 17],
            '7#11': [0, 4, 7, 10, 18],
            '13': [0, 4, 7, 10, 14, 21],
            'maj13': [0, 4, 7, 11, 14, 21],
            '7b13': [0, 4, 7, 10, 20],
            'alt': [0, 3, 6, 10, 13, 15],
            'm7#5': [0, 3, 8, 10],
            '7b5': [0, 4, 6, 10],
            '7#5': [0, 4, 8, 10],
            'maj7#11': [0, 4, 7, 11, 18]
        };

        this.initialize();
    }

    /**
     * Normalize common chord-type aliases to canonical chordFormulas keys.
     * Examples:
     *  '+' -> 'aug'
     *  '+maj7' / 'augmaj7' / 'maj7+' -> 'maj7#5'
     *  '+7' / 'aug7' / '7+' -> '7#5'
     */
    normalizeChordType(chordType) {
        if (!chordType) return chordType;
        let s = String(chordType).trim();
        if (!s) return s;
        // canonical lowercase for matching, but preserve returned casing of known keys
        const low = s.toLowerCase();

        // Normalize legacy/variant suspended dominant orderings like 'sus47' or 'sus27'
        if (/^sus\s*4\s*7$|^sus47$/i.test(low)) return '7sus4';
        if (/^7\s*sus\s*4$/i.test(low)) return '7sus4';
        // Engine does not support 7sus2 explicitly; normalize any 'sus27' to '7sus4' for now
        if (/^sus\s*2\s*7$|^sus27$/i.test(low)) return '7sus4';

        // Plain plus means augmented triad
        if (low === '+') return 'aug';

        // If contains explicit 'aug' or '+' modifier alongside 'maj7', prefer 'maj7#5'
        if (/aug/i.test(s) && /maj7/i.test(s)) return 'maj7#5';
        if (/\+/.test(s) && /maj7/i.test(s)) return 'maj7#5';

        // If contains augmented marker with dominant 7, map to '7#5'
        if (/aug/i.test(s) && /(^|[^a-zA-Z])7([^a-zA-Z]|$)/i.test(s)) return '7#5';
        if (/\+/.test(s) && /(^|[^a-zA-Z])7([^a-zA-Z]|$)/i.test(s)) return '7#5';

        // If chordType is like 'maj7#5' or '7#5' or other canonical forms, leave as-is
        // Also support patterns like 'maj7+5' -> 'maj7#5'
        if (/maj7.*#5|maj7.*\+5|#5/.test(s)) return s.replace('\u002B5', '#5');

        // Common shorthand: trailing or leading plus indicates augmented triad
        if (/^\+/.test(s) || /\+$/.test(s)) {
            // If it also includes 'maj7', map to maj7#5, if includes '7' map to 7#5, else aug
            if (/maj7/i.test(s)) return 'maj7#5';
            if (/(^|[^a-zA-Z])7([^a-zA-Z]|$)/i.test(s)) return '7#5';
            return 'aug';
        }

        return s;
    }

    initialize() {
        // Build reverse lookup for note names from semitones
        this.semitoneToNote = {};
        Object.entries(this.noteValues).forEach(([note, semi]) => {
            if (!this.semitoneToNote[semi]) {
                this.semitoneToNote[semi] = note;
            }
        });
    }

    /**
     * Get note name from semitone interval, respecting key signature
     */
    getNoteFromIntervalInKey(root, semitones, keySignature = null) {
        const rootValue = this.noteValues[root];
        if (rootValue === undefined) return null;

        const targetValue = (rootValue + semitones) % 12;
        
        // If no key signature specified, use the original logic
        if (!keySignature || !this.keySignatures[keySignature]) {
            return this.semitoneToNote[targetValue] || this.chromaticNotes[targetValue];
        }

        const keySig = this.keySignatures[keySignature];
        
        // Get all possible enharmonic equivalents for this semitone value
        const enharmonics = Object.entries(this.noteValues)
            .filter(([note, val]) => val === targetValue)
            .map(([note]) => note);

        // If only one enharmonic, return it
        if (enharmonics.length === 1) {
            return enharmonics[0];
        }

        // Choose based on key signature preferences
        if (keySig.type === 'sharp') {
            // Prefer sharps for sharp keys
            const sharpNote = enharmonics.find(note => note.includes('#'));
            if (sharpNote) return sharpNote;
        } else if (keySig.type === 'flat') {
            // Prefer flats for flat keys
            const flatNote = enharmonics.find(note => note.includes('b'));
            if (flatNote) return flatNote;
        }

        // If no preference or natural key, prefer the simpler enharmonic
        const naturalNote = enharmonics.find(note => !note.includes('#') && !note.includes('b'));
        if (naturalNote) return naturalNote;

        // Fallback to first enharmonic
        return enharmonics[0];
    }

    /**
     * Spell a semitone (0-11) honoring a preference for flats/sharps or key signature.
     * preferFlat: true => prefer flats, false => prefer sharps, null => use key signature
     */
    spellSemitoneWithPreference(semitone, preferFlat = null, keySignature = null) {
        const target = ((semitone % 12) + 12) % 12;
        // Gather enharmonic names for this semitone
        const enharmonics = Object.entries(this.noteValues).filter(([n, v]) => v === target).map(([n]) => n);
        if (!enharmonics || enharmonics.length === 0) return this.chromaticNotes[target] || null;

        // Normalize preferFlat using keySignature when preferFlat is null
        if (preferFlat === null && keySignature && this.keySignatures[keySignature]) {
            const ks = this.keySignatures[keySignature];
            if (ks.type === 'flat') preferFlat = true;
            else if (ks.type === 'sharp') preferFlat = false;
        }

        // If preference explicitly asks for flats
        if (preferFlat === true) {
            const flat = enharmonics.find(n => n.indexOf('b') >= 0);
            if (flat) return flat;
        }

        // If preference explicitly asks for sharps
        if (preferFlat === false) {
            const sharp = enharmonics.find(n => n.indexOf('#') >= 0);
            if (sharp) return sharp;
        }

        // Prefer natural (no accidental) if available
        const natural = enharmonics.find(n => !n.includes('#') && !n.includes('b'));
        if (natural) return natural;

        // Otherwise fallback to first enharmonic (deterministic)
        return enharmonics[0];
    }

    /**
     * Given a preferred root spelling (e.g., 'Db') and an array of note names, re-spell
     * each note to be enharmonically consistent with the preferred root's accidental
     * preference. Returns a new array of spelled note names.
     */
    spellNotesForRoot(preferredRoot, notes) {
        if (!preferredRoot || !Array.isArray(notes)) return notes || [];
        const preferFlat = String(preferredRoot).indexOf('b') >= 0;
        return notes.map(n => {
            try {
                const v = this.noteValues[n];
                if (v === undefined) return n;
                return this.spellSemitoneWithPreference(v, preferFlat, null);
            } catch (e) {
                return n;
            }
        });
    }

    /**
     * Get note name from semitone interval (no enharmonic logic)
     */
    getNoteFromInterval(root, semitones) {
        const rootValue = this.noteValues[root];
        if (rootValue === undefined) return null;
        const targetValue = (rootValue + semitones) % 12;
        return this.semitoneToNote[targetValue] || this.chromaticNotes[targetValue];
    }

    /**
     * Get all notes in a scale (legacy method)
     */
    getScaleNotes(key, scaleType) {
        // Normalize incoming scale identifier to canonical id (e.g., 'dorian b2' -> 'dorian_b2')
        const scaleId = this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType);
        // Legacy/compat method: prefer key-signature-aware spelling for scale notes
        try {
            return this.getScaleNotesWithKeySignature(key, scaleId);
        } catch (e) {
            const intervals = this.scales[scaleId] || this.scales.major;
            return intervals.map(interval => this.getNoteFromInterval(key, interval));
        }
    }

    /**
     * Convert note name with octave (e.g., "C4") to MIDI number.
     * Exposed here so all modules can use a single canonical conversion.
     */
    noteToMidi(noteName) {
        if (!noteName || typeof noteName !== 'string') return 60;
        const match = noteName.match(/^([A-Ga-g][#b]?)(\d+)$/);
        if (!match) return 60;
        const note = match[1].toUpperCase();
        const octave = parseInt(match[2], 10);
        const semitone = this.noteValues[note];
        if (semitone === undefined) return 60;
        // MIDI: C-1 = 0, so C4 = (4 + 1) * 12 = 60
        return (octave + 1) * 12 + semitone;
    }

    /**
     * Get all notes in a scale, respecting key signature enharmonics
     */
    getScaleNotesWithKeySignature(key, scaleType) {
        const scaleId = this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType);
        const intervals = this.scales[scaleId] || this.scales.major;

        // For church-mode modal scales (dorian, phrygian, lydian, mixolydian,
        // aeolian, locrian) prefer the parent-major key signature when choosing
        // enharmonic spellings so that, for example, C locrian returns
        // Db/Eb/Ab/Db/Gb instead of C D E F# ...
        let keyForSignature = key;
        try {
            const modalSet = new Set(['dorian','phrygian','lydian','mixolydian','aeolian','locrian']);
            if (modalSet.has(String(scaleId))) {
                const parent = this.getParentMajorForMode(key, scaleId);
                if (parent) keyForSignature = parent;
            }
            
            // For melodic minor family scales, prefer flat key signatures
            // EXCEPT lydian_dominant which needs sharps for the #4
            const melodicFamilyFlats = new Set(['melodic','dorian_b2','lydian_augmented','mixolydian_b6','locrian_nat2','altered']);
            if (melodicFamilyFlats.has(String(scaleId))) {
                // Find a flat key that shares the same tonic pitch class
                const flatKeys = ['Db', 'Eb', 'Gb', 'Ab', 'Bb', 'F'];
                const keyVal = this.noteValues[key];
                if (keyVal !== undefined) {
                    const flatEquiv = flatKeys.find(fk => this.noteValues[fk] === keyVal);
                    if (flatEquiv) {
                        keyForSignature = flatEquiv;
                    } else {
                        // If no enharmonic flat key exists, use Db as default flat key signature
                        keyForSignature = 'Db';
                    }
                }
            }
            
            // For harmonic minor family and scales with sharp alterations, prefer sharp key signatures
            const harmonicAndSharpScales = new Set([
                'harmonic','locrian_nat6','ionian_augmented','dorian_sharp4','phrygian_dominant',
                'lydian_sharp2','altered_diminished','lydian_dominant',
                'harmonic_major','lydian_b3','ionian_augmented_sharp2','lydian_sharp2_sharp6',
                'double_harmonic_major','hungarian_minor'
            ]);
            if (harmonicAndSharpScales.has(String(scaleId))) {
                // Find a sharp key that shares the same tonic pitch class
                const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
                const keyVal = this.noteValues[key];
                if (keyVal !== undefined) {
                    const sharpEquiv = sharpKeys.find(sk => this.noteValues[sk] === keyVal);
                    if (sharpEquiv) {
                        keyForSignature = sharpEquiv;
                    } else {
                        // If no enharmonic sharp key exists, use G as default sharp key signature
                        keyForSignature = 'G';
                    }
                }
            }
        } catch (e) { /* ignore and fall back to tonic */ }

        return intervals.map(interval => this.getNoteFromIntervalInKey(key, interval, keyForSignature));
    }

    /**
     * Given a tonic and a church-mode-like scaleId (ionian/dorian/...),
     * return the parent major key whose scale contains the tonic at the
     * corresponding degree. This helps select appropriate key-signature
     * enharmonics for modal scales (e.g., C locrian -> parent = Db major).
     */
    getParentMajorForMode(tonic, modeId) {
        const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
        const nv = this.noteValues || {};
        const tonicVal = nv[tonic];
        if (tonicVal == null) return null;

        // Major scale degree semitone distances from the parent tonic
        const majorDegSemis = [0, 2, 4, 5, 7, 9, 11];
        const modeIndex = {
            ionian: 0, major: 0,
            dorian: 1,
            phrygian: 2,
            lydian: 3,
            mixolydian: 4,
            aeolian: 5,
            locrian: 6
        }[modeId];
        if (modeIndex == null) return null;

        // tonic = parent + majorDegSemis[modeIndex]
        const parentPc = (tonicVal - majorDegSemis[modeIndex] + 12) % 12;

        const candidates = majorKeys.filter(k => nv[k] != null && (nv[k] % 12) === parentPc && this.keySignatures[k]);
        if (candidates.length === 0) return null;
        // Prefer a flat-key candidate when available (e.g., prefer 'Db' over 'C#')
        const flatPref = candidates.find(k => this.keySignatures[k] && this.keySignatures[k].type === 'flat');
        if (flatPref) return flatPref;
        return candidates[0];
        return null;
    }

    /**
     * Normalize a scale identifier into the canonical id used by this.scales.
     * Examples:
     *  'Dorian b2' -> 'dorian_b2'
     *  'Lydian ♯2' -> 'lydian_#2' (unused in ids but safe)
     *  'Dorian ♭2 (Phrygian ♮6)' -> 'dorian_b2'
     */
    normalizeScaleId(scaleType) {
        if (scaleType == null) return scaleType;
        let s = String(scaleType).toLowerCase();
        s = s.replace(/[]/g, ''); // strip odd chars if any
        s = s.replace(/[♭]/g, 'b').replace(/[♯]/g, '#');
        // drop any parenthetical descriptions
        s = s.replace(/\([^)]*\)/g, '');
        // collapse whitespace/hyphens to underscores
        s = s.replace(/[\s\-]+/g, '_');
        // remove non a-z0-9_ except # and b which we keep
        s = s.replace(/[^a-z0-9_#b]/g, '');
        // common display-name normalizations
        s = s.replace(/^dorian_b_?2$/, 'dorian_b2');
        s = s.replace(/^lydian_dominant$/, 'lydian_dominant');
        s = s.replace(/^lydian_augmented$/, 'lydian_augmented');
        return s;
    }

    /**
     * Get all notes in a chord
     */
    getChordNotes(root, chordType) {
        const normalized = this.normalizeChordType(chordType);
        let formula = this.chordFormulas[normalized] || this.chordFormulas[chordType];
        if (!formula) {
            // Case-insensitive fallback: find canonical key by lowercasing
            try {
                const low = String(chordType || '').toLowerCase();
                const matchKey = Object.keys(this.chordFormulas).find(k => k.toLowerCase() === low);
                if (matchKey) formula = this.chordFormulas[matchKey];
            } catch (_) {}
        }
        
        // Handle synthetic chord types like "maj(add6, no5)"
        if (!formula && chordType && chordType.includes('(')) {
            try {
                const match = chordType.match(/^([^(]+)\(([^)]+)\)$/);
                if (match) {
                    const [, baseType, modifiers] = match;
                    let baseFormula = this.chordFormulas[baseType] || this.chordFormulas[this.normalizeChordType(baseType)];
                    
                    // Handle synthetic base types
                    if (!baseFormula && baseType === 'modal') {
                        baseFormula = [0]; // Start with just the root for modal chords
                    }
                    
                    if (baseFormula) {
                        // Start with base chord intervals
                        let intervals = [...baseFormula];
                        
                        // Parse modifiers
                        const mods = modifiers.split(',').map(m => m.trim());
                        
                        for (const mod of mods) {
                            if (mod === 'add6') {
                                // Add 6th (9 semitones)
                                if (!intervals.includes(9)) intervals.push(9);
                            } else if (mod === 'add2') {
                                // Add 2nd (2 semitones)
                                if (!intervals.includes(2)) intervals.push(2);
                            } else if (mod === 'add11') {
                                // Add 11th (use 5 semitones for voicing)
                                if (!intervals.includes(5)) intervals.push(5);
                            } else if (mod === '#11') {
                                // Add #11 (6 semitones)
                                if (!intervals.includes(6)) intervals.push(6);
                            } else if (mod === 'b9') {
                                // Add b9 (1 semitone)
                                if (!intervals.includes(1)) intervals.push(1);
                            } else if (mod === 'b13') {
                                // Add b13 (8 semitones)
                                if (!intervals.includes(8)) intervals.push(8);
                            } else if (mod === 'b5') {
                                // Add b5 (6 semitones) - only if no perfect 5th
                                if (!intervals.includes(7) && !intervals.includes(6)) intervals.push(6);
                            } else if (mod === '#5') {
                                // Add #5 (8 semitones) - only if no perfect 5th
                                if (!intervals.includes(7) && !intervals.includes(8)) intervals.push(8);
                            } else if (mod === 'no5') {
                                // Remove perfect 5th (7 semitones)
                                intervals = intervals.filter(i => i !== 7);
                            } else if (mod === 'no3') {
                                // Remove 3rd (4 semitones for major, 3 for minor)
                                intervals = intervals.filter(i => i !== 3 && i !== 4);
                            }
                        }
                        
                        // Sort intervals and use as formula
                        formula = intervals.sort((a, b) => a - b);
                    }
                }
            } catch (_) {}
        }
        
        if (!formula) return [];
        return formula.map(interval => this.getNoteFromInterval(root, interval));
    }

    /**
     * Classify chord type from a set of semitone intervals relative to the root
     * Prefers seventh-chord names when available, falls back to triads and sus
     */
    classifyChordTypeFromIntervals(intervals) {
        const set = new Set(intervals);
        const has = (n) => set.has(n);

        // Ensure root present
        if (!has(0)) return null;

        // Seventh chord classification (include augmented 7th variants before generic maj7/m7)
        if ((has(4) && has(8) && has(11))) return 'maj7#5'; // augmented major seventh
        if ((has(3) && has(8) && has(10))) return 'm7#5';   // augmented minor seventh
        if ((has(4) && has(7) && has(11))) return 'maj7';
        if ((has(3) && has(7) && has(10))) return 'm7';
        if ((has(4) && has(7) && has(10))) return '7';
        if ((has(3) && has(6) && has(10))) return 'm7b5';
        if ((has(3) && has(6) && has(9))) return 'dim7';
        if ((has(3) && has(7) && has(11))) return 'mMaj7';
        if ((has(5) && has(7) && has(10))) return '7sus4';
        // Shell voicings (no 5th)
        if (has(5) && has(10) && !has(3) && !has(4)) return '7sus4';
        if (has(2) && has(10) && !has(3) && !has(4)) return '7sus2';

        // Sixths (prefer over plain triads when 6th is present)
        if ((has(4) && has(7) && has(9))) return '6';
        if ((has(3) && has(7) && has(9))) return 'm6';

        // Triads
        if ((has(4) && has(7))) return 'maj';
        if ((has(3) && has(7))) return 'm';
        if ((has(3) && has(6))) return 'dim';
        if ((has(4) && has(8))) return 'aug';
        if ((has(5) && has(7))) return 'sus4';
        if ((has(2) && has(7))) return 'sus2';

        // As a last resort, try exact match with known formulas
        const normalized = Array.from(set).sort((a,b)=>a-b);
        for (const [type, formula] of Object.entries(this.chordFormulas)) {
            const f = Array.from(new Set(formula)).sort((a,b)=>a-b);
            if (f.length === normalized.length && f.every((v,i)=>v===normalized[i])) {
                return type;
            }
        }
        return null;
    }

    /**
     * Classify chord type from notes relative to the given root
     */
    classifyChordTypeFromNotes(root, notes) {
        if (!root || !notes || notes.length === 0) return null;
        const rootVal = this.noteValues[root];
        if (rootVal === undefined) return null;
        const intervals = [];
        const seen = new Set();
        for (const n of notes) {
            const v = this.noteValues[n];
            if (v === undefined) continue;
            const semi = (v - rootVal + 12) % 12;
            if (!seen.has(semi)) { intervals.push(semi); seen.add(semi); }
        }
        return this.classifyChordTypeFromIntervals(intervals);
    }

    /**
     * Generate a consistent synthetic chord type name for non-tertian collections
     * Example output: 'sus2(#11, add6, no5)' or 'modal(add2, #11, no3, no5)'
     */
    generateSyntheticChordType(root, notes) {
        const rootVal = this.noteValues[root];
        if (rootVal === undefined) return 'modal';
        const set = new Set();
        for (const n of notes) {
            const v = this.noteValues[n];
            if (v === undefined) continue;
            set.add((v - rootVal + 12) % 12);
        }
        const has = (i) => set.has(i);

        const hasMaj3 = has(4);
        const hasMin3 = has(3);
        const hasP5 = has(7);
        const hasb5 = has(6);
        const hasSharp5 = has(8);
        const hasMin7 = has(10);
        const hasMaj7 = has(11);

        // Base quality
        let base;
        if (hasMaj3 || hasMin3) {
            base = hasMaj3 ? 'maj' : 'm';
        } else {
            if (has(5) && !has(2)) base = 'sus4';
            else if (has(2)) base = 'sus2';
            else base = 'modal';
        }

        // Seventh suffix (if present)
        if (base.includes('sus')) {
            if (hasMin7) base = '7' + base;
            else if (hasMaj7) base = 'maj7' + base;
        } else {
            if (hasMaj7) base += (base === 'maj' ? '7' : 'maj7');
            else if (hasMin7) base += '7';
        }

        // Build modifiers
        const mods = [];
        // 2/9
        if (has(2)) {
            if (!base.includes('sus2')) mods.push('add2');
        }
        // 4/11 and #11
        if (has(5)) {
            if (!base.includes('sus4')) mods.push('add11');
        }
        if (has(6)) mods.push('#11');
        // 6/13
        if (has(9)) mods.push('add6');
        if (has(8)) mods.push('b13');
        // b9/#9
        if (has(1)) mods.push('b9');
        // Altered fifths as modifiers if perfect fifth missing
        if (!hasP5) {
            if (hasb5) mods.push('b5');
            if (hasSharp5) mods.push('#5');
        }
        // Omissions
        if (!hasMaj3 && !hasMin3 && !base.includes('sus') && !base.includes('modal')) mods.push('no3');
        if (!hasP5 && !hasb5 && !hasSharp5) mods.push('no5');

        return mods.length ? `${base}(${mods.join(', ')})` : base;
    }

    /**
     * Get chord complexity level
     */
    getChordComplexity(chordType) {
        if (chordType.includes('13') || chordType.includes('11') || chordType.includes('9')) {
            return 'extended';
        } else if (chordType.includes('7') || chordType.includes('6')) {
            return 'seventh';
        } else {
            return 'triad';
        }
    }

    /**
     * Build a chord by stacking diatonic thirds within any scale
     */
    buildScaleChord(key, scaleType, degree = 1, size = 3) {
        const scaleNotes = this.getScaleNotes(key, scaleType);
        if (!scaleNotes.length) return { notes: [], degrees: [] };

        const n = scaleNotes.length;
        // For small scales (hexatonic/pentatonic), force triad size (3) unless explicitly larger
        // This prevents automatic 7th chord generation which often sounds wrong in these contexts
        let effSize = size;
        if (n < 7 && size > 3) {
            effSize = 3;
        }
        effSize = Math.max(1, Math.min(effSize, n));

        const start = ((degree - 1) % n + n) % n;
        const notes = [];
        const degrees = [];

        // Stacking logic:
        // For heptatonic (7 notes): skip 1 (thirds) -> index + 2
        // For hexatonic (6 notes): skip 1 (thirds) -> index + 2
        // For pentatonic (5 notes): skip 1 (thirds) -> index + 2
        // The "skip 1" logic is consistent for tertian harmony regardless of scale size
        const step = 2; 

        for (let k = 0; k < effSize; k++) {
            const idx = (start + k * step) % n; 
            notes.push(scaleNotes[idx]);
            const rel = ((idx - start + n) % n);
            degrees.push(rel === 0 ? 1 : (rel + 1));
        }
        
        // DEBUG (verbose): per-chord stacking (guarded)
        try {
            if (typeof window !== 'undefined' && window.__debugEngineVerbose) {
                console.log(`[DEBUG buildScaleChord] scale=${this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType)}, deg=${degree}: scaleNotes=[${scaleNotes.join(',')}], stackedNotes=[${notes.join(',')}]`);
            }
        } catch (_) {}

        return { notes, degrees };
    }

    /**
     * Find all chords containing given notes (container chords)
     */
    findAllContainerChords(notes, scaleNotes) {
        const results = [];

        const key = scaleNotes && scaleNotes.length ? scaleNotes[0] : null;
        const keyVal = key ? this.noteValues[key] : null;

        const semis = (a, b) => (this.noteValues[a] - this.noteValues[b] + 12) % 12;

        const hasMaj3 = (type) => {
            const f = this.chordFormulas[type];
            return f && f.includes(4);
        };

        const hasMin3 = (type) => {
            const f = this.chordFormulas[type];
            return f && f.includes(3);
        };

        const isDominantQuality = (type) => type.includes('7') && !type.includes('maj7');

        const self = this;
        function computeFunctions(root, chordType, keyName) {
            if (!keyName) return { functions: [], resolutions: [] };
            const rootToKey = (self.noteValues[root] - self.noteValues[keyName] + 12) % 12;
            const funcs = new Set();
            const res = new Set();

            const domQual = isDominantQuality(chordType) && hasMaj3(chordType);
            const majTriad = hasMaj3(chordType) && !chordType.includes('7');
            const minQual = hasMin3(chordType) && !hasMaj3(chordType);

            switch (rootToKey) {
                case 0: // I
                    if (chordType.includes('#5') || chordType.includes('aug')) funcs.add('Tonic (color)');
                    else funcs.add('Tonic');
                    res.add('—');
                    break;
                case 2: // II
                    if (minQual) funcs.add('Predominant');
                    if (domQual) { funcs.add('Secondary Dominant (to V)'); res.add('→ V'); }
                    else res.add('→ V');
                    break;
                case 4: // III
                    if (domQual || majTriad) { funcs.add('Secondary Dominant (to vi)'); res.add('→ vi'); }
                    else funcs.add('Tonic Prolongation');
                    break;
                case 5: // IV
                    funcs.add('Predominant'); res.add('→ V');
                    break;
                case 7: // V
                    funcs.add('Dominant'); res.add('→ I');
                    break;
                case 9: // VI
                    if (minQual) funcs.add('Tonic Prolongation'); else funcs.add('Predominant');
                    res.add('→ ii or → V');
                    break;
                case 11: // VII
                    if (chordType.includes('dim')) { funcs.add('Leading-tone'); res.add('→ I or → V'); }
                    else funcs.add('Dominant Color');
                    break;
                case 1: // bII
                    if (domQual || majTriad) { funcs.add('Tritone Sub (of V)'); res.add('→ V'); }
                    else funcs.add('Modal Interchange');
                    break;
                case 8: // bVI
                    funcs.add('Modal Interchange (bVI)'); res.add('→ V');
                    break;
                case 10: // bVII
                    funcs.add('Modal Interchange (bVII)'); res.add('→ I or → V');
                    break;
                case 3: // bIII
                    funcs.add('Modal Interchange (bIII)'); res.add('→ IV or → I');
                    break;
                default:
                    funcs.add('Chromatic/Pivot');
                    res.add('contextual');
            }

            if (domQual && !funcs.has('Secondary Dominant (to vi)') && !funcs.has('Tritone Sub (of V)') && !funcs.has('Dominant')) {
                funcs.add('Dominant-like');
            }

            return { functions: Array.from(funcs), resolutions: Array.from(res) };
        }

        this.chromaticNotes.forEach(root => {
            Object.entries(this.chordFormulas).forEach(([chordType, formula]) => {
                const chordNotes = this.getChordNotes(root, chordType);
                const anyNoteContained = notes.some(note => chordNotes.includes(note));
                if (!anyNoteContained) return;

                const scaleMatchCount = chordNotes.filter(cn => scaleNotes.includes(cn)).length;
                const scaleMatchPercent = Math.round((scaleMatchCount / chordNotes.length) * 100);

                const roles = notes.map(note => {
                    const noteValue = this.noteValues[note];
                    const rootValue = this.noteValues[root];
                    const interval = (noteValue - rootValue + 12) % 12;

                    let role = 'Extension';
                    let roleClass = 'extension';

                    if (interval === 0) { role = 'Root'; roleClass = 'root'; }
                    else if (interval === 3 || interval === 4) { role = interval === 3 ? 'Minor 3rd' : 'Major 3rd'; roleClass = 'third'; }
                    else if (interval === 6 || interval === 7) { role = interval === 6 ? 'Dim 5th' : 'Perfect 5th'; roleClass = 'fifth'; }
                    else if (interval === 10 || interval === 11) { role = interval === 10 ? 'Minor 7th' : 'Major 7th'; roleClass = 'seventh'; }
                    else if (interval === 2 || interval === 9) { role = interval === 2 ? 'Major 9th' : 'Major 2nd'; roleClass = 'ninth'; }
                    else if (interval === 5 || interval === 8) { role = interval === 5 ? 'Perfect 4th' : 'Aug 5th'; roleClass = 'eleventh'; }

                    return { note, interval, role, class: roleClass };
                });

                const functions = computeFunctions(root, chordType, key);
                const complexity = this.getChordComplexity(chordType);

                results.push({
                    fullName: root + chordType,
                    root,
                    chordType,
                    chordNotes,
                    roles,
                    scaleMatchPercent,
                    functions: functions.functions,
                    resolutions: functions.resolutions,
                    complexity,
                    likelihood: scaleMatchPercent === 100 ? 'Perfect' : scaleMatchPercent >= 75 ? 'Excellent' : scaleMatchPercent >= 50 ? 'Good' : 'Fair'
                });
            });
        });

        // Sort by scale match percentage, then by function importance
        return results.sort((a, b) => {
            const funcScore = (chord) => {
                const funcOrder = ['Tonic', 'Dominant', 'Predominant', 'Secondary Dominant', 'Leading-tone', 'Tritone Sub'];
                const aIdx = funcOrder.findIndex(f => chord.functions.includes(f));
                const bIdx = funcOrder.findIndex(f => chord.functions.includes(f));
                if (aIdx !== bIdx) return aIdx - bIdx;
                return b.scaleMatchPercent - a.scaleMatchPercent;
            };

            const cmpFunc = funcScore(a) - funcScore(b);
            if (cmpFunc !== 0) return cmpFunc;
            return a.chordNotes.length - b.chordNotes.length;
        });
    }

    /**
     * Get diatonic chord for a scale degree
     */
    getDiatonicChord(degree, key, scaleType = 'major') {
        const scaleNotes = this.getScaleNotes(key, scaleType);
        if (!scaleNotes || scaleNotes.length === 0) return { root: key, chordType: 'maj', fullName: key + 'maj', diatonicNotes: [] };
        let root = scaleNotes[(degree - 1) % scaleNotes.length];

        // Preserve Barry Harris special-case mapping
        const isBarryScale = String(scaleType).startsWith('barry_');
        if (isBarryScale) {
            const chordTypes = this.barry8ChordTypes;
            const chordType = chordTypes[(degree - 1) % chordTypes.length];
            return { root, chordType, fullName: root + chordType, diatonicNotes: this.buildScaleChord(key, scaleType, degree, 4).notes };
        }

        // Normalize scale identifier
        const scaleId = this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType);
        
        // Determine default chord size: 4 (sevenths) for heptatonic+, 3 (triads) for smaller scales
        const defaultSize = (scaleNotes.length < 7) ? 3 : 4;
        
        // Build diatonic stacked-third chord from the selected scale
        let stacked = this.buildScaleChord(key, scaleId, degree, defaultSize);

        // For melodic-minor family scales, prefer flat spellings for roots/notes
        // to avoid enharmonic mis-labeling (e.g., prefer 'Eb' over 'D#').
        // For harmonic-minor family and scales with sharp alterations, prefer sharp spellings
        // because they commonly use raised alterations (e.g., G# not Ab, F# not Gb).
        const melodicFamilyFlats = new Set(['melodic','dorian_b2','lydian_augmented','mixolydian_b6','locrian_nat2','altered']);
        const harmonicAndSharpScales = new Set([
            'harmonic','locrian_nat6','ionian_augmented','dorian_sharp4','phrygian_dominant',
            'lydian_sharp2','altered_diminished','lydian_dominant',
            'harmonic_major','lydian_b3','ionian_augmented_sharp2','lydian_sharp2_sharp6',
            'double_harmonic_major','hungarian_minor'
        ]);
        try {
            if (melodicFamilyFlats.has(String(scaleId))) {
                // If root currently spelled with a sharp, re-spell to flat-preferred enharmonic
                if (String(root).includes('#')) {
                    const rv = this.noteValues[root];
                    if (rv !== undefined) {
                        const preferred = this.spellSemitoneWithPreference(rv, true, null);
                        if (preferred) root = preferred;
                    }
                }
                // Re-spell stacked notes to match preferred root spelling
                stacked = { notes: this.spellNotesForRoot(root, stacked.notes), degrees: stacked.degrees };
            } else if (harmonicAndSharpScales.has(String(scaleId))) {
                // If root currently spelled with a flat, re-spell to sharp-preferred enharmonic
                if (String(root).includes('b')) {
                    const rv = this.noteValues[root];
                    if (rv !== undefined) {
                        const preferred = this.spellSemitoneWithPreference(rv, false, null);
                        if (preferred) root = preferred;
                    }
                }
                // Re-spell stacked notes to match preferred root spelling (sharp preference)
                stacked = { notes: this.spellNotesForRoot(root, stacked.notes), degrees: stacked.degrees };
            }
        } catch (e) { /* ignore */ }

        let chordType = this.classifyChordTypeFromNotes(root, stacked.notes);
        
        // DEBUG (verbose): per-chord classification (guarded)
        try {
            if (typeof window !== 'undefined' && window.__debugEngineVerbose) {
                const rootVal = this.noteValues[root];
                const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12).sort((a,b) => a-b);
                console.log(`[DEBUG classify] scale=${this.normalizeScaleId ? this.normalizeScaleId(scaleType) : String(scaleType)}, deg=${degree}: root=${root}, notes=[${stacked.notes.join(',')}], intervals=[${intervals.join(',')}], type=${chordType}`);
            }
        } catch (_) {}

        // Special cases for lydian_augmented degree 1: augmented major 7 (maj7#5)
        if (String(scaleId).toLowerCase() === 'lydian_augmented' && degree === 1) {
            // Verify the chord has augmented major 7 intervals: [0, 4, 8, 11]
            const rootVal = this.noteValues[root];
            if (rootVal !== undefined) {
                const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12).sort((a,b) => a-b);
                const augMaj7Formula = [0, 4, 8, 11];
                const isAugMaj7 = augMaj7Formula.every(i => intervals.includes(i));
                if (isAugMaj7) {
                    chordType = 'maj7#5';
                }
            }
        }

        // Harmonic minor family: force degree 3 to augmented major 7 if notes match
        if (harmonicAndSharpScales.has(String(scaleId)) && degree === 3) {
            // Check if the stacked notes match the augmented major 7 formula
            const augMaj7Formula = [0, 4, 8, 11];
            const rootVal = this.noteValues[root];
            const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12);
            const isAugMaj7 = augMaj7Formula.every(i => intervals.includes(i));
            if (isAugMaj7) {
                chordType = 'maj7#5';
            }
        }

        // Melodic minor explicit enforcement for canon chord qualities
        if (String(scaleId).toLowerCase() === 'melodic') {
            try {
                const rootVal = this.noteValues[root];
                const intervals = stacked.notes.map(n => (this.noteValues[n] - rootVal + 12) % 12).sort((a,b)=>a-b);
                if (degree === 1) {
                    // mMaj7: [0,3,7,11]
                    const isMMaj7 = [0,3,7,11].every(i => intervals.includes(i));
                    if (isMMaj7) chordType = 'mMaj7';
                } else if (degree === 3) {
                    // maj7#5: [0,4,8,11]
                    const isMaj7Sharp5 = [0,4,8,11].every(i => intervals.includes(i));
                    if (isMaj7Sharp5) chordType = 'maj7#5';
                } else if (degree === 4 || degree === 5) {
                    // Dominant 7th: [0,4,7,10]
                    const isDom = [0,4,7,10].every(i => intervals.includes(i));
                    if (isDom) chordType = '7';
                } else if (degree === 6 || degree === 7) {
                    // Half-diminished: [0,3,6,10]
                    const isHalfDim = [0,3,6,10].every(i => intervals.includes(i));
                    if (isHalfDim) chordType = 'm7b5';
                }
            } catch (_) {}
        }

        // If classification fails, try triad; if still fails, synthesize a consistent name
        if (!chordType) {
            const triad = this.buildScaleChord(key, scaleType, degree, 3);
            chordType = this.classifyChordTypeFromNotes(root, triad.notes);
        }
        if (!chordType) {
            chordType = this.generateSyntheticChordType(root, stacked.notes);
        }

        // Honor any explicit display-token override (° vs ø) coming from the NumberGenerator.
        // NOTE: Do not assume the displayTokens array aligns by index with scale degrees
        // (trailing spaces or extra tokens can shift lengths). Instead, scan tokens
        // and match Roman numerals to the requested degree. This avoids index-shift
        // bugs where a trailing space would change which degree receives a symbol.
        try {
            if (typeof window !== 'undefined' && window.modularApp && window.modularApp.numberGenerator && typeof window.modularApp.numberGenerator.getCurrentDisplayTokens === 'function') {
                const displayTokens = window.modularApp.numberGenerator.getCurrentDisplayTokens();
                if (Array.isArray(displayTokens) && displayTokens.length > 0) {
                    const romanToInt = (r) => {
                        if (!r) return null;
                        const s = String(r).toUpperCase();
                        const map = { 'I':1, 'II':2, 'III':3, 'IV':4, 'V':5, 'VI':6, 'VII':7 };
                        return map[s] || null;
                    };

                    for (let i = 0; i < displayTokens.length; i++) {
                        const t = displayTokens[i];
                        if (!t) continue;
                        const m = String(t).match(/^([#b♯♭]*)([IViv]+)(.*)$/);
                        if (!m) continue;
                        const roman = m[2];
                        const tokDegree = romanToInt(roman);
                        if (tokDegree === degree) {
                            const tok = String(t);
                            // Accept both symbol forms and canonical text forms for half-diminished/diminished
                            if (/(°|dim(?!.*maj))/i.test(tok)) {
                                chordType = 'dim7';
                            } else if (/(ø|m7b5|half-?dim)/i.test(tok)) {
                                chordType = 'm7b5';
                            }
                            break;
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }

        return { root, chordType, fullName: root + chordType, diatonicNotes: stacked.notes };
    }

    /**
     * Get all available scales grouped by category
     */
    getScaleCategories() {
        return {
            '🎵 Major Scale & Modes': [
                'major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'
            ],
            '🎼 Melodic Minor & Modes': [
                'melodic', 'dorian_b2', 'lydian_augmented', 'lydian_dominant', 
                'mixolydian_b6', 'locrian_nat2', 'altered'
            ],
            '🎹 Harmonic Minor & Modes': [
                'harmonic', 'locrian_nat6', 'ionian_augmented', 'dorian_sharp4',
                'phrygian_dominant', 'lydian_sharp2', 'altered_diminished'
            ],
            '🎶 Harmonic Major & Modes': [
                'harmonic_major', 'dorian_b5', 'phrygian_b4', 'lydian_b3',
                'mixolydian_b2', 'aeolian_b1', 'locrian_bb7'
            ],
            '🌟 Double Harmonic & Modes': [
                'double_harmonic_major', 'lydian_sharp2_sharp6', 'ultraphrygian',
                'hungarian_minor', 'oriental', 'ionian_augmented_sharp2', 'locrian_bb3_bb7'
            ],
            '⚖️ Symmetric Scales': [
                'whole_tone', 'octatonic_dim', 'octatonic_dom', 'augmented', 'tritone', 'prometheus'
            ],
            '🎸 Pentatonic Scales': [
                'major_pentatonic', 'minor_pentatonic', 'egyptian_pentatonic',
                'blues_minor_pentatonic', 'blues_major_pentatonic',
                'hirajoshi', 'iwato', 'insen', 'yo'
            ],
            '🎺 Hexatonic Scales': [
                'blues_hexatonic', 'whole_tone_hexatonic', 'augmented_hexatonic', 'prometheus_hexatonic'
            ],
            '🕌 Middle Eastern Scales': [
                'hijaz', 'hijaz_kar', 'maqam_bayati', 'maqam_rast', 'maqam_ajam', 'maqam_nahawand', 'maqam_kurd', 'persian'
            ],
            '🪔 Indian Ragas': [
                'raga_bhairav', 'raga_todi', 'raga_marwa', 'raga_purvi', 'raga_kafi', 'raga_bhairavi'
            ],
            '💃 Spanish & Flamenco': [
                'spanish_phrygian', 'spanish_gypsy', 'flamenco'
            ],
            '🎷 Jazz & Bebop': [
                'bebop_major', 'bebop_dominant', 'bebop_minor', 'bebop_dorian'
            ],
            '🎹 Barry Harris Method': [
                'barry_major6dim', 'barry_dom7dim', 'barry_minor6dim'
            ],
            '✨ Exotic & Modern': [
                'enigmatic', 'neapolitan_major', 'neapolitan_minor',
                'romanian_minor', 'ukrainian_dorian', 'leading_whole_tone'
            ],
        };
    }


    /**
     * Get all available chord types
     */
    getChordTypes() {
        return Object.keys(this.chordFormulas);
    }

    /**
     * Get all available keys
     */
    getKeys() {
        return ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    }

    // --- Enhanced Centralized Grading Event System ---

    /**
     * Set grading mode with enhanced event broadcasting
     */
    setGradingMode(mode, options = {}) {
        if (!['functional', 'emotional', 'color'].includes(mode)) {
            console.warn(`Invalid grading mode: ${mode}`);
            return false;
        }

        const oldMode = this.gradingMode;
        if (oldMode === mode) return true; // No change needed

        this.gradingMode = mode;
        
        // Create grading change event
        const event = {
            type: 'gradingModeChanged',
            data: {
                oldMode: oldMode,
                newMode: mode,
                timestamp: Date.now(),
                options: options
            },
            id: this.generateEventId(),
            timestamp: Date.now(),
            retryCount: 0
        };

        // Broadcast to all subscribers with enhanced error handling
        this.broadcastGradingEvent(event);
        return true;
    }

    /**
     * Enhanced module subscription system
     */
    subscribe(callback, moduleId = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        const subscription = {
            callback: callback,
            moduleId: moduleId,
            subscribed: Date.now(),
            active: true
        };

        this.listeners.add(subscription);

        // Initialize module state if provided
        if (moduleId) {
            this.initializeModuleState(moduleId);
        }

        // Return unsubscribe function
        return () => {
            subscription.active = false;
            this.listeners.delete(subscription);
            if (moduleId) {
                this.moduleStates.delete(moduleId);
            }
        };
    }

    /**
     * Initialize grading state for a module
     */
    initializeModuleState(moduleId) {
        if (!this.moduleStates.has(moduleId)) {
            this.moduleStates.set(moduleId, {
                moduleId: moduleId,
                currentMode: this.gradingMode,
                gradingInfluence: {
                    visualWeight: 1.0,
                    behavioralWeight: 1.0,
                    suggestionWeight: 1.0
                },
                lastUpdate: Date.now(),
                activeElements: new Map(),
                pendingUpdates: [],
                status: 'initialized'
            });
        }
    }

    /**
     * Broadcast grading event with retry mechanism
     */
    broadcastGradingEvent(event) {
        const startTime = Date.now();
        const failedSubscriptions = [];

        // Add to event queue for tracking
        this.gradingEventQueue.push(event);

        // Notify all active subscribers synchronously for immediate propagation
        for (const subscription of this.listeners) {
            if (!subscription.active) continue;

            try {
                // Execute callback synchronously
                const result = subscription.callback(event.type, event.data);
                
                // Update module state on successful callback
                if (subscription.moduleId) {
                    this.updateModuleState(subscription.moduleId, event);
                }

            } catch (error) {
                console.warn(`Grading event callback failed for module ${subscription.moduleId}:`, error);
                failedSubscriptions.push({
                    subscription: subscription,
                    error: error,
                    event: event
                });
            }
        }

        // Handle failed subscriptions with retry mechanism
        if (failedSubscriptions.length > 0) {
            this.handleFailedSubscriptions(failedSubscriptions);
        }

        // Log event completion
        const duration = Date.now() - startTime;
        console.log(`Grading event ${event.type} broadcasted to ${this.listeners.size} modules in ${duration}ms`);
    }

    /**
     * Handle failed subscriptions with retry mechanism
     */
    handleFailedSubscriptions(failedSubscriptions) {
        for (const failure of failedSubscriptions) {
            const { subscription, error, event } = failure;

            if (event.retryCount < this.maxRetries) {
                // Add to retry queue
                const retryEvent = {
                    ...event,
                    retryCount: event.retryCount + 1,
                    retryReason: error.message
                };

                this.eventRetryQueue.push({
                    subscription: subscription,
                    event: retryEvent,
                    scheduledTime: Date.now() + (this.retryDelay * Math.pow(2, event.retryCount))
                });

                console.log(`Scheduling retry ${event.retryCount} for module ${subscription.moduleId}`);
            } else {
                console.error(`Max retries exceeded for module ${subscription.moduleId}:`, error);
                // Mark module as failed
                if (subscription.moduleId) {
                    const moduleState = this.moduleStates.get(subscription.moduleId);
                    if (moduleState) {
                        moduleState.status = 'failed';
                        moduleState.lastError = error.message;
                    }
                }
            }
        }

        // Process retry queue
        this.processRetryQueue();
    }

    /**
     * Process retry queue with exponential backoff
     */
    processRetryQueue() {
        const now = Date.now();
        const readyRetries = this.eventRetryQueue.filter(retry => retry.scheduledTime <= now);

        for (const retry of readyRetries) {
            try {
                retry.subscription.callback(retry.event.type, retry.event.data);
                
                // Update module state on successful retry
                if (retry.subscription.moduleId) {
                    this.updateModuleState(retry.subscription.moduleId, retry.event);
                }

                console.log(`Retry successful for module ${retry.subscription.moduleId}`);
            } catch (error) {
                console.warn(`Retry failed for module ${retry.subscription.moduleId}:`, error);
                
                // Re-queue if retries remaining
                if (retry.event.retryCount < this.maxRetries) {
                    retry.event.retryCount++;
                    retry.scheduledTime = now + (this.retryDelay * Math.pow(2, retry.event.retryCount));
                } else {
                    // Mark as permanently failed
                    if (retry.subscription.moduleId) {
                        const moduleState = this.moduleStates.get(retry.subscription.moduleId);
                        if (moduleState) {
                            moduleState.status = 'failed';
                            moduleState.lastError = error.message;
                        }
                    }
                }
            }
        }

        // Remove processed retries
        this.eventRetryQueue = this.eventRetryQueue.filter(retry => retry.scheduledTime > now);

        // Schedule next retry processing if needed
        if (this.eventRetryQueue.length > 0) {
            const nextRetryTime = Math.min(...this.eventRetryQueue.map(r => r.scheduledTime));
            const delay = Math.max(0, nextRetryTime - now);
            setTimeout(() => this.processRetryQueue(), delay);
        }
    }

    /**
     * Update module state after successful event processing
     */
    updateModuleState(moduleId, event) {
        const moduleState = this.moduleStates.get(moduleId);
        if (!moduleState) return;

        moduleState.lastUpdate = Date.now();
        moduleState.status = 'synchronized';

        if (event.type === 'gradingModeChanged') {
            moduleState.currentMode = event.data.newMode;
        }

        // Clear any pending updates for this event type
        moduleState.pendingUpdates = moduleState.pendingUpdates.filter(
            update => update.type !== event.type
        );
    }

    /**
     * Get current grading state synchronization status
     */
    getGradingSyncStatus() {
        const status = {
            totalModules: this.moduleStates.size,
            synchronized: 0,
            failed: 0,
            pending: 0,
            currentMode: this.gradingMode,
            eventQueueSize: this.gradingEventQueue.length,
            retryQueueSize: this.eventRetryQueue.length
        };

        for (const [moduleId, state] of this.moduleStates) {
            switch (state.status) {
                case 'synchronized':
                    status.synchronized++;
                    break;
                case 'failed':
                    status.failed++;
                    break;
                default:
                    status.pending++;
            }
        }

        return status;
    }

    /**
     * Force synchronization of all modules
     */
    forceSynchronizeModules() {
        const event = {
            type: 'forceSynchronization',
            data: {
                currentMode: this.gradingMode,
                timestamp: Date.now(),
                reason: 'Manual synchronization requested'
            },
            id: this.generateEventId(),
            timestamp: Date.now(),
            retryCount: 0
        };

        this.broadcastGradingEvent(event);
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `grading_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Legacy method for backward compatibility
     */
    notifyListeners(event, data) {
        // Convert to new event format
        const gradingEvent = {
            type: event,
            data: data,
            id: this.generateEventId(),
            timestamp: Date.now(),
            retryCount: 0
        };

        this.broadcastGradingEvent(gradingEvent);
    }

    /**
     * Get module grading state
     */
    getModuleGradingState(moduleId) {
        return this.moduleStates.get(moduleId) || null;
    }

    /**
     * Set module grading influence weights
     */
    setModuleGradingInfluence(moduleId, influence) {
        const moduleState = this.moduleStates.get(moduleId);
        if (moduleState) {
            moduleState.gradingInfluence = {
                ...moduleState.gradingInfluence,
                ...influence
            };
            moduleState.lastUpdate = Date.now();
        }
    }

    getGradingTierInfo(tier, context = {}) {
        const type = this.gradingMode;
        let tierInfo;

        if (type === 'emotional') {
            const tiers = [
                { label: '🌑 Somber', color: '#60a5fa', short: '🌑', name: 'Somber', desc: 'Deep, sad, serious' },
                { label: '🌧️ Melancholy', color: '#93c5fd', short: '🌧️', name: 'Melancholy', desc: 'Pensive, longing' },
                { label: '😐 Neutral', color: '#d1d5db', short: '😐', name: 'Neutral', desc: 'Balanced, plain' },
                { label: '☀️ Bright', color: '#fbbf24', short: '☀️', name: 'Bright', desc: 'Happy, energetic' },
                { label: '✨ Radiant', color: '#f9a8d4', short: '✨', name: 'Radiant', desc: 'Ecstatic, magical' }
            ];
            tierInfo = tiers[tier] || tiers[2];
        } else if (type === 'color') {
             const tiers = [
                { label: 'Deep Blue', color: '#93c5fd', short: 'Blue', name: 'Deep', desc: 'Calm, depth' },
                { label: 'Purple', color: '#c4b5fd', short: 'Purp', name: 'Rich', desc: 'Royal, complex' },
                { label: 'Green', color: '#6ee7b7', short: 'Grn', name: 'Natural', desc: 'Organic, grounded' },
                { label: 'Orange', color: '#fdba74', short: 'Org', name: 'Warm', desc: 'Energetic, friendly' },
                { label: 'Yellow', color: '#fde68a', short: 'Yel', name: 'Bright', desc: 'Optimistic, light' }
            ];
            tierInfo = tiers[tier] || tiers[2];
        } else {
            // Default: Functional
            const tiers = [
                { label: '○ Experimental', color: '#9ca3af', short: '○', name: 'Experimental', desc: '(chromatic)' },
                { label: '◐ Fair', color: '#c4b5fd', short: '◐', name: 'Fair', desc: '(chromatic functional)' },
                { label: '★ Good', color: '#fbbf24', short: '★', name: 'Good', desc: '(in-scale)' },
                { label: '★★ Excellent', color: '#38bdf8', short: '★★', name: 'Excellent', desc: '(in-scale functional)' },
                { label: '★★★ Perfect', color: '#10b981', short: '★★★', name: 'Perfect', desc: '(diatonic scale chord)' }
            ];
            tierInfo = tiers[tier] || tiers[2];
        }

        // Enhanced tier info with additional properties
        return {
            ...tierInfo,
            tier: tier,
            mode: type,
            // Enhanced properties for accessibility and educational context
            accessibilityInfo: this.getAccessibleGradingInfo(tier, { mode: type }),
            educationalContext: this.getEducationalContext(tier, type),
            contextualRelevance: context.relevance || 1.0,
            theoreticalBasis: this.getTheoreticalBasis(tier, type, context),
            suggestedActions: this.getSuggestedActions(tier, type, context)
        };
    }

    /**
     * Calculate grading tier for a musical element in context
     */
    calculateElementGrade(element, context = {}) {
        const { key = 'C', scaleType = 'major', elementType = 'note' } = context;
        
        if (elementType === 'note') {
            return this.calculateNoteGrade(element, key, scaleType, context);
        } else if (elementType === 'chord') {
            return this.calculateChordGrade(element, key, scaleType, context);
        } else if (elementType === 'scale') {
            return this.calculateScaleGrade(element, context);
        }
        
        return 2; // Default neutral grade
    }

    /**
     * Calculate grading tier for a note
     */
    calculateNoteGrade(note, key, scaleType, context = {}) {
        const scaleNotes = this.getScaleNotes(key, scaleType);
        const noteValue = this.noteValues[note];
        const keyValue = this.noteValues[key];
        
        if (noteValue === undefined || keyValue === undefined) return 0;
        
        const interval = (noteValue - keyValue + 12) % 12;
        const isInScale = scaleNotes.includes(note);
        
        if (this.gradingMode === 'functional') {
            // Functional grading based on harmonic function
            if (interval === 0) return 4; // Tonic - Perfect
            if (interval === 7) return 4; // Dominant - Perfect
            if (interval === 5) return 3; // Subdominant - Excellent
            if (isInScale) return 2; // In scale - Good
            if ([1, 6, 8, 10].includes(interval)) return 1; // Chromatic functional - Fair
            return 0; // Experimental
        } else if (this.gradingMode === 'emotional') {
            // Emotional grading based on interval character
            const emotionalMap = {
                0: 2, 1: 0, 2: 3, 3: 1, 4: 3, 5: 2, 
                6: 0, 7: 4, 8: 1, 9: 3, 10: 1, 11: 4
            };
            return emotionalMap[interval] || 2;
        } else if (this.gradingMode === 'color') {
            // Color grading based on brightness/warmth
            const colorMap = {
                0: 2, 1: 1, 2: 4, 3: 0, 4: 4, 5: 2,
                6: 0, 7: 3, 8: 1, 9: 4, 10: 1, 11: 3
            };
            return colorMap[interval] || 2;
        }
        
        return 2;
    }

    /**
     * Calculate grading tier for a chord
     */
    calculateChordGrade(chordName, key, scaleType, context = {}) {
        // Parse chord name to get root and type
        const match = chordName.match(/^([A-G][#b]?)(.*)$/);
        if (!match) return 0;
        
        const [, root, chordType] = match;
        const chordNotes = this.getChordNotes(root, chordType);
        const scaleNotes = this.getScaleNotes(key, scaleType);
        
        // Calculate how many chord notes are in scale
        const inScaleCount = chordNotes.filter(note => scaleNotes.includes(note)).length;
        const scaleMatchPercent = (inScaleCount / chordNotes.length) * 100;
        
        if (this.gradingMode === 'functional') {
            // Check if it's a diatonic chord
            for (let degree = 1; degree <= 7; degree++) {
                const diatonicChord = this.getDiatonicChord(degree, key, scaleType);
                if (diatonicChord.fullName === chordName) return 4; // Perfect - diatonic
            }
            
            if (scaleMatchPercent === 100) return 3; // Excellent - all notes in scale
            if (scaleMatchPercent >= 75) return 2; // Good - most notes in scale
            if (scaleMatchPercent >= 50) return 1; // Fair - some notes in scale
            return 0; // Experimental
        } else if (this.gradingMode === 'emotional') {
            // Emotional grading based on chord quality and extensions
            if (chordType.includes('maj7') || chordType.includes('add9')) return 4;
            if (chordType.includes('maj') && !chordType.includes('7')) return 3;
            if (chordType.includes('m') && !chordType.includes('7')) return 1;
            if (chordType.includes('dim') || chordType.includes('b5')) return 0;
            return 2;
        } else if (this.gradingMode === 'color') {
            // Color grading based on harmonic richness
            const complexity = this.getChordComplexity(chordType);
            if (complexity === 'extended') return 4;
            if (complexity === 'seventh') return 3;
            if (chordType.includes('sus') || chordType.includes('add')) return 2;
            if (chordType.includes('dim')) return 0;
            return 1;
        }
        
        return 2;
    }

    /**
     * Calculate grading tier for a scale
     */
    calculateScaleGrade(scaleName, context = {}) {
        const { key = 'C', referenceScale = 'major' } = context;
        
        if (this.gradingMode === 'functional') {
            // Functional grading based on harmonic utility
            const functionalScales = ['major', 'minor', 'dorian', 'mixolydian'];
            if (functionalScales.includes(scaleName)) return 4;
            if (scaleName.includes('harmonic') || scaleName.includes('melodic')) return 3;
            if (Object.keys(this.scales).includes(scaleName)) return 2;
            return 1;
        } else if (this.gradingMode === 'emotional') {
            // Emotional grading based on scale character
            const brightScales = ['major', 'lydian', 'mixolydian'];
            const darkScales = ['minor', 'phrygian', 'locrian'];
            if (brightScales.includes(scaleName)) return 4;
            if (darkScales.includes(scaleName)) return 0;
            return 2;
        } else if (this.gradingMode === 'color') {
            // Color grading based on harmonic richness
            const colorfulScales = ['altered', 'whole_tone', 'octatonic_dim'];
            const simpleScales = ['major_pentatonic', 'minor_pentatonic'];
            if (colorfulScales.includes(scaleName)) return 4;
            if (simpleScales.includes(scaleName)) return 1;
            return 2;
        }
        
        return 2;
    }

    /**
     * Get explanation for why an element received its grading
     */
    getGradingExplanation(element, tier, context = {}) {
        const { elementType = 'note', key = 'C', scaleType = 'major' } = context;
        const mode = this.gradingMode;
        
        let explanation = `In ${mode} grading mode, `;
        
        if (elementType === 'note') {
            const scaleNotes = this.getScaleNotes(key, scaleType);
            const isInScale = scaleNotes.includes(element);
            
            if (mode === 'functional') {
                if (tier === 4) explanation += `${element} is a primary harmonic function note (tonic or dominant).`;
                else if (tier === 3) explanation += `${element} serves an important harmonic function in ${key} ${scaleType}.`;
                else if (tier === 2) explanation += `${element} is part of the ${key} ${scaleType} scale.`;
                else if (tier === 1) explanation += `${element} provides chromatic color outside the scale.`;
                else explanation += `${element} is experimental and creates strong dissonance.`;
            } else if (mode === 'emotional') {
                const noteValue = this.noteValues[element];
                const keyValue = this.noteValues[key];
                const interval = (noteValue - keyValue + 12) % 12;
                
                if (tier === 4) explanation += `${element} creates a bright, uplifting sound.`;
                else if (tier === 3) explanation += `${element} adds warmth and positivity.`;
                else if (tier === 2) explanation += `${element} provides neutral emotional balance.`;
                else if (tier === 1) explanation += `${element} creates melancholy or tension.`;
                else explanation += `${element} evokes deep sadness or darkness.`;
            } else if (mode === 'color') {
                if (tier === 4) explanation += `${element} adds brilliant harmonic color.`;
                else if (tier === 3) explanation += `${element} provides warm harmonic richness.`;
                else if (tier === 2) explanation += `${element} offers natural, grounded color.`;
                else if (tier === 1) explanation += `${element} adds subtle harmonic complexity.`;
                else explanation += `${element} creates deep, mysterious color.`;
            }
        } else if (elementType === 'chord') {
            // Similar explanations for chords...
            explanation += `this chord receives a ${this.getGradingTierInfo(tier).name} rating based on its harmonic function and scale relationship.`;
        }
        
        return explanation;
    }

    /**
     * Suggest alternatives with higher grading tiers
     */
    suggestAlternatives(element, targetTier, context = {}) {
        const { elementType = 'note', key = 'C', scaleType = 'major' } = context;
        const alternatives = [];
        
        if (elementType === 'note') {
            const scaleNotes = this.getScaleNotes(key, scaleType);
            
            // Find notes that would achieve the target tier
            for (const note of this.chromaticNotes) {
                const grade = this.calculateNoteGrade(note, key, scaleType, context);
                if (grade >= targetTier && note !== element) {
                    alternatives.push({
                        element: note,
                        tier: grade,
                        explanation: this.getGradingExplanation(note, grade, { ...context, elementType: 'note' })
                    });
                }
            }
        } else if (elementType === 'chord') {
            // Find chord alternatives
            const scaleNotes = this.getScaleNotes(key, scaleType);
            for (let degree = 1; degree <= 7; degree++) {
                const diatonicChord = this.getDiatonicChord(degree, key, scaleType);
                const grade = this.calculateChordGrade(diatonicChord.fullName, key, scaleType, context);
                if (grade >= targetTier && diatonicChord.fullName !== element) {
                    alternatives.push({
                        element: diatonicChord.fullName,
                        tier: grade,
                        explanation: this.getGradingExplanation(diatonicChord.fullName, grade, { ...context, elementType: 'chord' })
                    });
                }
            }
        }
        
        // Sort by tier (highest first) and limit results
        return alternatives
            .sort((a, b) => b.tier - a.tier)
            .slice(0, 5);
    }

    /**
     * Compare how the same element is graded across different perspectives
     */
    compareGradingPerspectives(element, context = {}) {
        const currentMode = this.gradingMode;
        const perspectives = {};
        
        ['functional', 'emotional', 'color'].forEach(mode => {
            this.gradingMode = mode;
            const tier = this.calculateElementGrade(element, context);
            perspectives[mode] = {
                tier: tier,
                info: this.getGradingTierInfo(tier),
                explanation: this.getGradingExplanation(element, tier, context)
            };
        });
        
        // Restore original mode
        this.gradingMode = currentMode;
        
        return perspectives;
    }

    /**
     * Get educational context for a grading tier
     */
    getEducationalContext(tier, mode) {
        const contexts = {
            functional: [
                'Experimental notes create strong dissonance and require careful resolution.',
                'Fair notes provide chromatic color and can enhance harmonic progressions.',
                'Good notes are scale members that support the key center.',
                'Excellent notes serve important harmonic functions like predominant or secondary dominant.',
                'Perfect notes are primary harmonic pillars (tonic, dominant, subdominant).'
            ],
            emotional: [
                'Somber notes evoke deep sadness and introspection.',
                'Melancholy notes create wistful, pensive moods.',
                'Neutral notes provide emotional balance and stability.',
                'Bright notes generate happiness and energy.',
                'Radiant notes create ecstatic, magical feelings.'
            ],
            color: [
                'Deep notes provide mysterious, contemplative colors.',
                'Rich notes add complex, sophisticated harmonies.',
                'Natural notes offer grounded, organic sounds.',
                'Warm notes create friendly, inviting atmospheres.',
                'Bright notes add brilliant, luminous qualities.'
            ]
        };
        
        return contexts[mode]?.[tier] || 'This grading provides insight into the musical character of the element.';
    }

    /**
     * Explain the theoretical reasoning behind a grading
     */
    explainGradingRationale(element, context = {}) {
        const tier = this.calculateElementGrade(element, context);
        const explanation = this.getGradingExplanation(element, tier, context);
        const educational = this.getEducationalContext(tier, this.gradingMode);
        
        return {
            tier: tier,
            explanation: explanation,
            educational: educational,
            theoreticalBasis: this.getTheoreticalBasis(tier, this.gradingMode, context)
        };
    }

    /**
     * Get accessibility information for grading display
     */
    getAccessibleGradingInfo(tier, options = {}) {
        const { mode = this.gradingMode } = options;
        
        // Get basic tier info without circular dependency
        const basicTierInfo = this.getBasicGradingTierInfo(tier, mode);
        
        // Visual patterns for accessibility (beyond color)
        const patterns = ['dotted', 'dashed', 'solid', 'double', 'thick'];
        const shapes = ['circle', 'square', 'triangle', 'diamond', 'star'];
        
        return {
            pattern: patterns[tier] || 'solid',
            shape: shapes[tier] || 'circle',
            audioCue: this.getAudioGradingCues(tier),
            screenReaderText: `${basicTierInfo.name} grade: ${basicTierInfo.desc}`,
            highContrastColor: this.getHighContrastColor(tier),
            textLabel: basicTierInfo.short
        };
    }

    /**
     * Get basic grading tier info without enhanced properties (to avoid circular dependencies)
     */
    getBasicGradingTierInfo(tier, mode) {
        if (mode === 'emotional') {
            const tiers = [
                { label: '🌑 Somber', color: '#60a5fa', short: '🌑', name: 'Somber', desc: 'Deep, sad, serious' },
                { label: '🌧️ Melancholy', color: '#93c5fd', short: '🌧️', name: 'Melancholy', desc: 'Pensive, longing' },
                { label: '😐 Neutral', color: '#d1d5db', short: '😐', name: 'Neutral', desc: 'Balanced, plain' },
                { label: '☀️ Bright', color: '#fbbf24', short: '☀️', name: 'Bright', desc: 'Happy, energetic' },
                { label: '✨ Radiant', color: '#f9a8d4', short: '✨', name: 'Radiant', desc: 'Ecstatic, magical' }
            ];
            return tiers[tier] || tiers[2];
        } else if (mode === 'color') {
             const tiers = [
                { label: 'Deep Blue', color: '#93c5fd', short: 'Blue', name: 'Deep', desc: 'Calm, depth' },
                { label: 'Purple', color: '#c4b5fd', short: 'Purp', name: 'Rich', desc: 'Royal, complex' },
                { label: 'Green', color: '#6ee7b7', short: 'Grn', name: 'Natural', desc: 'Organic, grounded' },
                { label: 'Orange', color: '#fdba74', short: 'Org', name: 'Warm', desc: 'Energetic, friendly' },
                { label: 'Yellow', color: '#fde68a', short: 'Yel', name: 'Bright', desc: 'Optimistic, light' }
            ];
            return tiers[tier] || tiers[2];
        } else {
            // Default: Functional
            const tiers = [
                { label: '○ Experimental', color: '#9ca3af', short: '○', name: 'Experimental', desc: '(chromatic)' },
                { label: '◐ Fair', color: '#c4b5fd', short: '◐', name: 'Fair', desc: '(chromatic functional)' },
                { label: '★ Good', color: '#fbbf24', short: '★', name: 'Good', desc: '(in-scale)' },
                { label: '★★ Excellent', color: '#38bdf8', short: '★★', name: 'Excellent', desc: '(in-scale functional)' },
                { label: '★★★ Perfect', color: '#10b981', short: '★★★', name: 'Perfect', desc: '(diatonic scale chord)' }
            ];
            return tiers[tier] || tiers[2];
        }
    }

    /**
     * Get audio cues for grading tiers
     */
    getAudioGradingCues(tier) {
        const cues = [
            'Low bass tone',      // Tier 0
            'Muted bell',         // Tier 1  
            'Neutral chime',      // Tier 2
            'Bright bell',        // Tier 3
            'Triumphant fanfare'  // Tier 4
        ];
        
        return cues[tier] || 'Neutral chime';
    }

    /**
     * Get high contrast colors for accessibility
     */
    getHighContrastColor(tier) {
        // High contrast colors with guaranteed 4.5:1+ contrast ratios
        // These are carefully selected to ensure adjacent tiers have sufficient contrast
        const colors = [
            '#000000', // Black - Tier 0 (L=0)
            '#FFFF00', // Yellow - Tier 1 (L=0.927, contrast with black = 19.56:1)
            '#0000FF', // Blue - Tier 2 (L=0.072, contrast with yellow = 13.85:1)
            '#FFFFFF', // White - Tier 3 (L=1, contrast with blue = 8.59:1)
            '#800000'  // Dark Red - Tier 4 (L=0.107, contrast with white = 9.74:1)
        ];
        
        return colors[tier] || '#0000FF';
    }

    /**
     * Get theoretical basis for grading
     */
    getTheoreticalBasis(tier, mode, context = {}) {
        if (mode === 'functional') {
            const bases = [
                'Chromatic theory: Creates tension requiring resolution',
                'Voice leading: Provides smooth chromatic motion',
                'Diatonic theory: Supports tonal center',
                'Functional harmony: Serves clear harmonic role',
                'Tonal hierarchy: Primary structural function'
            ];
            return bases[tier] || 'General harmonic theory';
        } else if (mode === 'emotional') {
            const bases = [
                'Psychoacoustics: Minor intervals create sadness',
                'Cultural associations: Melancholy musical traditions',
                'Neutral intervals: Balanced emotional response',
                'Major intervals: Natural harmonic brightness',
                'Consonance theory: Perfect intervals create joy'
            ];
            return bases[tier] || 'Music psychology theory';
        } else if (mode === 'color') {
            const bases = [
                'Spectral theory: Lower frequencies appear darker',
                'Harmonic complexity: Moderate overtone content',
                'Natural harmonics: Organic frequency relationships',
                'Brightness theory: Higher partials create warmth',
                'Acoustic brilliance: Rich harmonic spectrum'
            ];
            return bases[tier] || 'Acoustic color theory';
        }
        
        return 'Music theory principles';
    }

    /**
     * Get suggested actions based on grading
     */
    getSuggestedActions(tier, mode, context = {}) {
        const actions = [];
        
        if (tier <= 1) {
            actions.push('Consider resolving to a higher-tier element');
            actions.push('Use as passing tone or chromatic approach');
            actions.push('Explore alternatives with better grading');
        } else if (tier === 2) {
            actions.push('Good foundation - consider embellishment');
            actions.push('Stable choice for harmonic support');
        } else if (tier >= 3) {
            actions.push('Excellent choice - emphasize in composition');
            actions.push('Use as structural harmonic element');
            actions.push('Build progressions around this element');
        }
        
        return actions;
    }

}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicTheoryEngine;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.MusicTheoryEngine = MusicTheoryEngine;
}