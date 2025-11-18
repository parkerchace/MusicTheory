/**
 * NUMBER GENERATOR MODULE
 *
 * Handles scale degree number generation, transformations, and history
 * Used by chord analyzers and progression builders
 *
 * Features:
 * - Multiple number types (Diatonic, Barry Harris, Extended, Chromatic)
 * - Mathematical transformations (retrograde, invert, rotate, randomize)
 * - History management with undo/redo
 * - Event system for number changes
 */

class NumberGenerator {
    constructor(options = {}) {
        this.options = {
            maxHistorySize: options.maxHistorySize || 50,
            defaultLength: options.defaultLength || 4,
            defaultType: options.defaultType || 'diatonic',
            ...options
        };

        this.numberTypes = {
            diatonic: { min: 1, max: 7, name: 'Diatonic (1-7)' },
            barry8: { min: 1, max: 8, name: 'Barry Harris 8-Tone (1-8)' },
            extended: { min: 1, max: 14, name: 'Extended (1-14)' },
            chromatic: { min: 1, max: 12, name: 'Chromatic/Altered (1-12)' }
        };

        this.state = {
            currentNumbers: [7, 2, 4, 3], // Default jazz ii-V-I-vi
            numberType: this.options.defaultType,
            history: [],
            undoStack: [],
            redoStack: [],
            desiredLength: this.options.defaultLength,
            generationLogic: 'random', // random, melodic, harmonic, chord_tones, functional
            harmonizationMode: 'melody' // 'melody' | 'harmony'
        };

        this.listeners = new Map();
        this.currentScaleNotes = []; // Added property to store current scale notes
        this.currentKey = 'C';
        this.currentScale = 'major';
        this.musicTheory = null; // Will be set via connectMusicTheory()
        this.initialize();
    }

    initialize() {
        this.loadHistory();
    }

    /**
     * Connect music theory engine for intelligent generation
     */
    connectMusicTheory(musicTheoryEngine) {
        this.musicTheory = musicTheoryEngine;
    }

    /**
     * Event system for when numbers change
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    /**
     * Get current numbers
     */
    getCurrentNumbers() {
        return [...this.state.currentNumbers];
    }

    /**
     * Get current number type
     */
    getNumberType() {
        return this.state.numberType;
    }

    /**
     * Get available number types
     */
    getNumberTypes() {
        return Object.keys(this.numberTypes).map(key => ({
            value: key,
            ...this.numberTypes[key]
        }));
    }

    /**
     * Generate new numbers using selected logic mode
     */
    generateNumbers(length, type = this.state.numberType) {
        if (typeof length !== 'number') {
            length = this.state.desiredLength || this.options.defaultLength;
        }
        const typeInfo = this.numberTypes[type];
        if (!typeInfo) {
            throw new Error(`Unknown number type: ${type}`);
        }

        let numbers = [];
        
        // Use intelligent generation based on selected logic
        switch (this.state.generationLogic) {
            case 'melodic':
                numbers = this.generateMelodic(length, typeInfo);
                break;
            case 'harmonic':
                numbers = this.generateHarmonic(length, typeInfo);
                break;
            case 'chord_tones':
                numbers = this.generateChordTones(length, typeInfo);
                break;
            case 'functional':
                numbers = this.generateFunctional(length, typeInfo);
                break;
            case 'random':
            default:
                numbers = this.generateRandom(length, typeInfo);
                break;
        }

        this.setNumbers(numbers, type);
        return numbers;
    }

    /**
     * Generate random numbers (original behavior)
     */
    generateRandom(length, typeInfo) {
        const { min, max } = typeInfo;
        const numbers = [];
        for (let i = 0; i < length; i++) {
            numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        return numbers;
    }

    /**
     * Generate melodic sequence (stepwise motion, occasional leaps)
     */
    generateMelodic(length, typeInfo) {
        const { min, max } = typeInfo;
        const numbers = [];
        let current = Math.floor(Math.random() * (max - min + 1)) + min;
        numbers.push(current);

        for (let i = 1; i < length; i++) {
            const rand = Math.random();
            let next;
            
            if (rand < 0.6) {
                // 60% stepwise motion (±1 or ±2)
                const step = Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : -1) : (Math.random() < 0.5 ? 2 : -2);
                next = current + step;
            } else if (rand < 0.85) {
                // 25% small leap (±3 to ±4)
                const leap = Math.random() < 0.5 ? (Math.random() < 0.5 ? 3 : 4) : (Math.random() < 0.5 ? -3 : -4);
                next = current + leap;
            } else {
                // 15% larger leap
                next = Math.floor(Math.random() * (max - min + 1)) + min;
            }
            
            // Wrap around if out of bounds
            while (next < min) next += (max - min + 1);
            while (next > max) next -= (max - min + 1);
            
            numbers.push(next);
            current = next;
        }
        
        return numbers;
    }

    /**
     * Generate harmonic sequence (chord progressions, functional harmony)
     */
    generateHarmonic(length, typeInfo) {
        const { min, max } = typeInfo;
        const numbers = [];
        
        // Common harmonic patterns (scale degrees)
        const patterns = [
            [1, 4, 5, 1],      // I-IV-V-I
            [1, 6, 4, 5],      // I-vi-IV-V
            [1, 5, 6, 4],      // I-V-vi-IV (pop)
            [6, 4, 1, 5],      // vi-IV-I-V
            [2, 5, 1],         // ii-V-I (jazz)
            [1, 3, 6, 2, 5, 1], // Circle progression
            [1, 7, 6, 5],      // Descending
            [4, 5, 3, 6]       // IV-V-iii-vi
        ];
        
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        // Repeat/extend pattern to match length
        for (let i = 0; i < length; i++) {
            let degree = pattern[i % pattern.length];
            // Ensure within bounds
            while (degree > max) degree -= (max - min + 1);
            numbers.push(degree);
        }
        
        return numbers;
    }

    /**
     * Generate chord tone sequences (arpeggios, chord member emphasis)
     */
    generateChordTones(length, typeInfo) {
        const { min, max } = typeInfo;
        const numbers = [];
        
        if (!this.musicTheory || !this.currentScaleNotes || this.currentScaleNotes.length === 0) {
            // Fallback to triadic patterns
            const chordRoot = Math.floor(Math.random() * Math.min(7, max)) + 1;
            const chordTones = [chordRoot, (chordRoot + 2 - 1) % max + 1, (chordRoot + 4 - 1) % max + 1];
            
            for (let i = 0; i < length; i++) {
                numbers.push(chordTones[Math.floor(Math.random() * chordTones.length)]);
            }
            return numbers;
        }
        
        // Use music theory to find actual chord tones
        const chordRoot = Math.floor(Math.random() * this.currentScaleNotes.length) + 1;
        const baseChord = this.musicTheory.getDiatonicChord(chordRoot, this.currentKey, this.currentScale);
        
        if (baseChord && baseChord.chordNotes) {
            // Map chord notes back to scale degrees
            const chordDegrees = baseChord.chordNotes.map(note => {
                const idx = this.currentScaleNotes.indexOf(note);
                return idx >= 0 ? idx + 1 : chordRoot;
            }).filter(d => d >= min && d <= max);
            
            if (chordDegrees.length > 0) {
                for (let i = 0; i < length; i++) {
                    numbers.push(chordDegrees[Math.floor(Math.random() * chordDegrees.length)]);
                }
                return numbers;
            }
        }
        
        // Fallback
        return this.generateRandom(length, typeInfo);
    }

    /**
     * Generate functional progression (strong tonal centers, resolutions)
     */
    generateFunctional(length, typeInfo) {
        const { min, max } = typeInfo;
        const numbers = [];
        
        // Functional harmony: Tonic (I, vi, iii), Subdominant (IV, ii), Dominant (V, vii)
        const tonic = [1, 6, 3].filter(d => d <= max);
        const subdominant = [4, 2].filter(d => d <= max);
        const dominant = [5, 7].filter(d => d <= max);
        
        // Start with tonic
        numbers.push(tonic[Math.floor(Math.random() * tonic.length)]);
        
        for (let i = 1; i < length; i++) {
            const last = numbers[numbers.length - 1];
            const rand = Math.random();
            
            if (tonic.includes(last)) {
                // From tonic: can go anywhere, prefer subdominant or dominant
                if (rand < 0.5 && subdominant.length > 0) {
                    numbers.push(subdominant[Math.floor(Math.random() * subdominant.length)]);
                } else if (rand < 0.8 && dominant.length > 0) {
                    numbers.push(dominant[Math.floor(Math.random() * dominant.length)]);
                } else {
                    numbers.push(tonic[Math.floor(Math.random() * tonic.length)]);
                }
            } else if (subdominant.includes(last)) {
                // From subdominant: prefer dominant or tonic
                if (rand < 0.6 && dominant.length > 0) {
                    numbers.push(dominant[Math.floor(Math.random() * dominant.length)]);
                } else {
                    numbers.push(tonic[Math.floor(Math.random() * tonic.length)]);
                }
            } else if (dominant.includes(last)) {
                // From dominant: strongly prefer tonic (resolution)
                if (rand < 0.8 && tonic.length > 0) {
                    numbers.push(tonic[Math.floor(Math.random() * tonic.length)]);
                } else if (subdominant.length > 0) {
                    numbers.push(subdominant[Math.floor(Math.random() * subdominant.length)]);
                } else {
                    numbers.push(dominant[Math.floor(Math.random() * dominant.length)]);
                }
            } else {
                // Fallback
                numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
            }
        }
        
        return numbers;
    }

    /**
     * Set numbers directly
     */
    setNumbers(numbers, type = this.state.numberType) {
        this.saveToHistory();

        this.state.currentNumbers = [...numbers];
        this.state.numberType = type;
        // Any new committed change should clear redo history
        this.state.redoStack = [];

        this.emit('numbersChanged', {
            numbers: this.state.currentNumbers,
            type: this.state.numberType,
            source: 'direct'
        });

        this.saveHistory();
    }

    /**
     * Clear numbers
     */
    clearNumbers() {
        this.saveToHistory();
        this.state.currentNumbers = [];
        this.state.redoStack = [];
        this.emit('numbersChanged', {
            numbers: [],
            type: this.state.numberType,
            source: 'clear'
        });
    }

    /**
     * Apply transformation
     */
    applyTransformation(transformation, options = {}) {
        this.saveToHistory();

        let numbers = [...this.state.currentNumbers];

        switch (transformation) {
            case 'retrograde':
                numbers.reverse();
                break;

            case 'invert':
                const axis = options.axis || this.getDefaultAxis();
                numbers = numbers.map(n => this.invertNumber(n, axis));
                break;

            case 'rotate_left':
                const rotateLeft = options.amount || 1;
                for (let i = 0; i < rotateLeft; i++) {
                    numbers.push(numbers.shift());
                }
                break;

            case 'rotate_right':
                const rotateRight = options.amount || 1;
                for (let i = 0; i < rotateRight; i++) {
                    numbers.unshift(numbers.pop());
                }
                break;

            case 'randomize':
                const constraints = options.constraints || {};
                numbers = this.randomizeNumbers(numbers, constraints);
                break;

            default:
                console.warn(`Unknown transformation: ${transformation}`);
                return;
        }

        this.setNumbers(numbers, this.state.numberType);
    }

    /**
     * Apply transformation with scale awareness
     */
    applyScaleAwareTransformation(transformation, options = {}) {
        this.saveToHistory();
        
        let numbers = [...this.state.currentNumbers];
        const scaleNotes = options.scaleNotes || [];
        const scaleLength = scaleNotes.length || 7; // Default diatonic

        switch (transformation) {
            case 'barry_rotate':
                // Barry Harris specific rotation (1-8 becomes 8-1-2-3...)
                numbers = [8, ...numbers.map(n => n > 1 ? n - 1 : 8)];
                break;
                
            case 'scale_constrained_random':
                const constraints = options.constraints || {};
                numbers = numbers.map(() => {
                    let newNumber;
                    do {
                        newNumber = Math.floor(Math.random() * scaleLength) + 1;
                    } while (
                        constraints.noRepeats && numbers.includes(newNumber) ||
                        constraints.avoidAdjacent && this.isAdjacent(numbers, newNumber)
                    );
                    return newNumber;
                });
                break;
                
            case 'diatonic_invert':
                numbers = numbers.map(n => scaleLength - n + 1);
                break;
                
            default:
                return this.applyTransformation(transformation, options);
        }

        this.setNumbers(numbers, this.state.numberType);
    }

    /**
     * Invert a number around an axis
     */
    invertNumber(number, axis) {
        const typeInfo = this.numberTypes[this.state.numberType];
        const range = typeInfo.max - typeInfo.min + 1;

        // Invert around the axis: new_value = axis - (number - axis) = 2*axis - number
        let inverted = 2 * axis - number;

        // Clamp to valid range
        while (inverted < typeInfo.min) inverted += range;
        while (inverted > typeInfo.max) inverted -= range;

        return inverted;
    }

    /**
     * Get default axis for inversion
     */
    getDefaultAxis() {
        const typeInfo = this.numberTypes[this.state.numberType];
        switch (this.state.numberType) {
            case 'diatonic': return 7; // Middle of 1-7
            case 'barry8': return 8;   // Middle of 1-8
            case 'extended': return 14; // Middle of 1-14
            case 'chromatic': return 12; // Middle of 1-12
            default: return Math.floor((typeInfo.min + typeInfo.max) / 2);
        }
    }

    /**
     * Randomize numbers with optional constraints
     */
    randomizeNumbers(numbers, constraints = {}) {
        const typeInfo = this.numberTypes[this.state.numberType];
        const { min, max } = typeInfo;

        return numbers.map(() => {
            let newNumber;
            do {
                newNumber = Math.floor(Math.random() * (max - min + 1)) + min;
            } while (
                constraints.noRepeats && numbers.includes(newNumber) ||
                constraints.avoidAdjacent && this.isAdjacent(numbers, newNumber)
            );
            return newNumber;
        });
    }

    /**
     * Check if number is adjacent to existing numbers
     */
    isAdjacent(numbers, target) {
        return numbers.some(n => Math.abs(n - target) === 1);
    }

    /**
     * Undo last change
     */
    undo() {
        if (this.state.undoStack.length === 0) return false;

        const previousState = this.state.undoStack.pop();
        // push current to redo stack
        this.state.redoStack.push({
            numbers: [...this.state.currentNumbers],
            type: this.state.numberType
        });
        // keep a breadcrumb in history
        this.state.history.push({
            numbers: [...this.state.currentNumbers],
            type: this.state.numberType,
            timestamp: Date.now()
        });

        this.state.currentNumbers = previousState.numbers;
        this.state.numberType = previousState.type;

        this.emit('numbersChanged', {
            numbers: this.state.currentNumbers,
            type: this.state.numberType,
            source: 'undo'
        });

        return true;
    }

    /**
     * Redo last undone change
     */
    redo() {
        if (this.state.redoStack.length === 0) return false;
        const nextState = this.state.redoStack.pop();
        // push current to undo stack for symmetry
        this.state.undoStack.push({
            numbers: [...this.state.currentNumbers],
            type: this.state.numberType
        });

        this.state.currentNumbers = nextState.numbers;
        this.state.numberType = nextState.type;

        this.emit('numbersChanged', {
            numbers: this.state.currentNumbers,
            type: this.state.numberType,
            source: 'redo'
        });
        return true;
    }

    /**
     * Get history
     */
    getHistory() {
        return [...this.state.history];
    }

    /**
     * Load specific numbers from history
     */
    loadFromHistory(index) {
        const history = this.getHistory();
        if (index < 0 || index >= history.length) return false;

        const entry = history[index];
        this.setNumbers(entry.numbers, entry.type);
        return true;
    }

    /**
     * Save current state to history
     */
    saveToHistory() {
        this.state.undoStack.push({
            numbers: [...this.state.currentNumbers],
            type: this.state.numberType
        });

        this.state.history.unshift({
            numbers: [...this.state.currentNumbers],
            type: this.state.numberType,
            timestamp: Date.now()
        });

        // Any new action invalidates redo path
        this.state.redoStack = [];

        // Limit history size
        if (this.state.history.length > this.options.maxHistorySize) {
            this.state.history = this.state.history.slice(0, this.options.maxHistorySize);
        }
        if (this.state.undoStack.length > this.options.maxHistorySize) {
            this.state.undoStack = this.state.undoStack.slice(-this.options.maxHistorySize);
        }
        if (this.state.redoStack.length > this.options.maxHistorySize) {
            this.state.redoStack = this.state.redoStack.slice(-this.options.maxHistorySize);
        }
    }

    /**
     * Load history from storage
     */
    loadHistory() {
        if (typeof localStorage !== 'undefined') {
            try {
                const stored = localStorage.getItem('music_numbers_history');
                if (stored) {
                    this.state.history = JSON.parse(stored);
                }
            } catch (error) {
                console.warn('Failed to load history:', error);
            }
        }
    }

    /**
     * Save history to storage
     */
    saveHistory() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('music_numbers_history', JSON.stringify(this.state.history));
            } catch (error) {
                console.warn('Failed to save history:', error);
            }
        }
    }

    /**
     * Export current state
     */
    exportState() {
        return {
            numbers: this.getCurrentNumbers(),
            type: this.getNumberType(),
            history: this.getHistory(),
            timestamp: Date.now()
        };
    }

    /**
     * Import state
     */
    importState(state) {
        if (state.numbers && Array.isArray(state.numbers)) {
            this.setNumbers(state.numbers, state.type || this.state.numberType);
        }
        if (state.history && Array.isArray(state.history)) {
            this.state.history = state.history;
            this.saveHistory();
        }
    }

    /**
     * Common progressions per scale type (based on music theory research)
     */
    getCommonProgressions() {
        return {
            major: [
                { name: 'I-IV-V-I (Classic)', degrees: [1, 4, 5, 1] },
                { name: 'I-vi-IV-V (50s Progression)', degrees: [1, 6, 4, 5] },
                { name: 'I-V-vi-IV (Pop Progression)', degrees: [1, 5, 6, 4] },
                { name: 'ii-V-I (Jazz Cadence)', degrees: [2, 5, 1] },
                { name: 'I-vi-ii-V (Turnaround)', degrees: [1, 6, 2, 5] },
                { name: 'IV-V-iii-vi (Royal Road)', degrees: [4, 5, 3, 6] },
                { name: 'I-iii-IV-iv (Chromatic Descent)', degrees: [1, 3, 4] },
                { name: 'vi-IV-I-V (Sensitive)', degrees: [6, 4, 1, 5] },
                { name: 'I-IV-vi-V (Canon)', degrees: [1, 4, 6, 5] }
            ],
            minor: [
                { name: 'i-iv-V (Minor Cadence)', degrees: [1, 4, 5] },
                { name: 'i-VI-III-VII (Andalusian)', degrees: [1, 6, 3, 7] },
                { name: 'i-iv-i-V (Minor Blues)', degrees: [1, 4, 1, 5] },
                { name: 'i-VII-VI-V (Descending)', degrees: [1, 7, 6, 5] },
                { name: 'i-VI-VII-i (Aeolian Vamp)', degrees: [1, 6, 7, 1] },
                { name: 'iv-i-V-i (Plagal Minor)', degrees: [4, 1, 5, 1] },
                { name: 'i-III-VII-VI (Flamenco)', degrees: [1, 3, 7, 6] },
                { name: 'i-v-i-iv (Doomy)', degrees: [1, 5, 1, 4] }
            ],
            dorian: [
                { name: 'i-IV-i (Dorian Vamp)', degrees: [1, 4, 1] },
                { name: 'i-ii-IV-i (Modal Jazz)', degrees: [1, 2, 4, 1] },
                { name: 'i-IV-VII-i (So What)', degrees: [1, 4, 7, 1] },
                { name: 'ii-i-ii-IV (Dorian Funk)', degrees: [2, 1, 2, 4] },
                { name: 'i-VII-IV-i (Dorian Rock)', degrees: [1, 7, 4, 1] },
                { name: 'i-ii-i-VII (Dorian Groove)', degrees: [1, 2, 1, 7] }
            ],
            phrygian: [
                { name: 'i-bII-i (Phrygian Cadence)', degrees: [1, 2, 1] },
                { name: 'i-bII-bVII-i (Spanish)', degrees: [1, 2, 7, 1] },
                { name: 'i-bII-bIII-bII (Exotic)', degrees: [1, 2, 3, 2] },
                { name: 'bII-i (Half Cadence)', degrees: [2, 1] },
                { name: 'i-bVII-bVI-bII (Flamenco)', degrees: [1, 7, 6, 2] },
                { name: 'i-bII-i-bVII (Dark Vamp)', degrees: [1, 2, 1, 7] }
            ],
            lydian: [
                { name: 'I-II-I (Lydian Vamp)', degrees: [1, 2, 1] },
                { name: 'I-II-vii-I (Bright)', degrees: [1, 2, 7, 1] },
                { name: 'I-II-IV-I (Lydian Cadence)', degrees: [1, 2, 4, 1] },
                { name: 'II-I-II-vii (Dreamy)', degrees: [2, 1, 2, 7] },
                { name: 'I-vii-II-I (Floating)', degrees: [1, 7, 2, 1] },
                { name: 'I-II-iii-II (Lydian Jazz)', degrees: [1, 2, 3, 2] }
            ],
            mixolydian: [
                { name: 'I-bVII-I (Mixolydian Vamp)', degrees: [1, 7, 1] },
                { name: 'I-bVII-IV-I (Rock Progression)', degrees: [1, 7, 4, 1] },
                { name: 'I-IV-bVII-I (Classic Rock)', degrees: [1, 4, 7, 1] },
                { name: 'I-bVII-IV-bVII (Jam)', degrees: [1, 7, 4, 7] },
                { name: 'bVII-IV-I (Backdoor)', degrees: [7, 4, 1] },
                { name: 'I-v-bVII-IV (Mixo Blues)', degrees: [1, 5, 7, 4] }
            ],
            locrian: [
                { name: 'i-bII-bIII (Locrian Descent)', degrees: [1, 2, 3] },
                { name: 'i-bV-bII (Diminished)', degrees: [1, 5, 2] },
                { name: 'bII-i (Locrian Cadence)', degrees: [2, 1] },
                { name: 'i-bVII-bVI-bV (Dark)', degrees: [1, 7, 6, 5] },
                { name: 'i-bII-i-bV (Unstable)', degrees: [1, 2, 1, 5] }
            ],
            'barry_harris_major': [
                { name: 'I-vi-ii-V (8-tone Turnaround)', degrees: [1, 6, 2, 5] },
                { name: 'I-#Idim-ii-#iidim (Chromatic)', degrees: [1, 8, 2, 3] },
                { name: 'I-IV-#IVdim-V (Passing Dim)', degrees: [1, 4, 8, 5] },
                { name: 'vi-#vidim-V-I (Dim Approach)', degrees: [6, 7, 5, 1] },
                { name: 'I-8-7-6-5-4-3-2 (Descending)', degrees: [1, 8, 7, 6, 5, 4, 3, 2] }
            ],
            'barry_harris_minor': [
                { name: 'i-iv-V (Minor 6dim)', degrees: [1, 4, 5] },
                { name: 'i-#idim-ii-V (Chromatic Minor)', degrees: [1, 8, 2, 5] },
                { name: 'i-VI-iidim-V (Dim Passing)', degrees: [1, 6, 8, 5] },
                { name: 'iv-#ivdim-i (Plagal Dim)', degrees: [4, 8, 1] }
            ],
            harmonic_minor: [
                { name: 'i-iv-V7-i (Harmonic Cadence)', degrees: [1, 4, 5, 1] },
                { name: 'i-VI-III-VII (Harmonic Andalusian)', degrees: [1, 6, 3, 7] },
                { name: 'i-VII-i (Leading Tone)', degrees: [1, 7, 1] },
                { name: 'iv-V7-i (Minor Perfect)', degrees: [4, 5, 1] },
                { name: 'i-bII-V-i (Phrygian Dominant)', degrees: [1, 2, 5, 1] },
                { name: 'i-III+-VI-V (Augmented)', degrees: [1, 3, 6, 5] }
            ],
            melodic_minor: [
                { name: 'i-ii-V-i (Melodic Jazz)', degrees: [1, 2, 5, 1] },
                { name: 'i-IV-V-i (Melodic Cadence)', degrees: [1, 4, 5, 1] },
                { name: 'ii-V-i (Jazz Minor)', degrees: [2, 5, 1] },
                { name: 'i-bIII-IV-i (Melodic Vamp)', degrees: [1, 3, 4, 1] },
                { name: 'IV-V-i (Lydian Dominant)', degrees: [4, 5, 1] }
            ]
        };
    }

    /**
     * Get common progressions for current scale
     */
    getCommonProgressionsForScale(scale) {
        const allProgressions = this.getCommonProgressions();
        const scaleKey = scale.toLowerCase().replace(/\s+/g, '_');
        return allProgressions[scaleKey] || allProgressions['major'];
    }

    /**
     * Load a random common progression for current scale
     */
    loadRandomCommonProgression() {
        const progressions = this.getCommonProgressionsForScale(this.currentScale);
        if (!progressions || progressions.length === 0) {
            console.warn('No common progressions found for scale:', this.currentScale);
            return;
        }
        
        const randomProgression = progressions[Math.floor(Math.random() * progressions.length)];
        this.setNumbers(randomProgression.degrees, this.state.numberType);
        
        // Show a brief notification of which progression was loaded
        this.showToast(`Loaded: ${randomProgression.name}`, 3000);
        
        this.emit('progressionLoaded', {
            name: randomProgression.name,
            degrees: randomProgression.degrees,
            scale: this.currentScale
        });
    }

    /**
     * Show a toast notification
     */
    showToast(message, duration = 2000) {
        // Remove any existing toast
        const existingToast = document.getElementById('number-gen-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.id = 'number-gen-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideUp 0.3s ease-out;
        `;
        
        // Add animation keyframes if not already present
        if (!document.getElementById('toast-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-animation-styles';
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(100px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(0); opacity: 1; }
                    to { transform: translateX(-50%) translateY(100px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Get suggestions for common jazz patterns (legacy method)
     */
    getSuggestedPatterns() {
        return {
            ii_V_I: [2, 7, 1],
            I_vi_ii_V: [1, 6, 2, 7],
            circle_of_fifths: [1, 4, 7, 3, 6, 2, 5],
            blues: [1, 4, 1, 5, 4, 1],
            rhythm_changes: [1, 6, 2, 5, 3, 6, 2, 5],
            barry_harris: [8, 6, 7, 5, 3, 1, 2, 4]
        };
    }

    /**
     * Apply a suggested pattern
     */
    applyPattern(patternName) {
        const patterns = this.getSuggestedPatterns();
        const pattern = patterns[patternName];

        if (pattern) {
            this.setNumbers(pattern, this.state.numberType);
            return true;
        }

        return false;
    }

    /**
     * Mount to DOM container
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (!container) return;
        
        this.container = container;
        this.currentKey = 'C'; // Default
        this.currentScale = 'major'; // Default
        this.render();
    }

    /**
     * Set current scale information for display
     */
    setScaleInfo(key, scale) {
        this.currentKey = key;
        this.currentScale = scale;
        this.render();
    }

    /**
     * Set current scale notes and update display
     */
    setCurrentScaleNotes(notes) {
        this.currentScaleNotes = notes;
        this.render();
    }

    /**
     * Get description for generation logic mode
     */
    getLogicDescription(logic) {
        const descriptions = {
            random: 'Completely random scale degrees with no pattern or relationship.',
            melodic: 'Smooth melodic lines with mostly stepwise motion (60%), occasional small leaps (25%), and rare large jumps (15%).',
            harmonic: 'Common chord progressions like I-IV-V-I, I-V-vi-IV, ii-V-I. Great for harmonic thinking.',
            chord_tones: 'Notes from a single chord (arpeggios). Uses actual chord tones from the current scale.',
            functional: 'Follows functional harmony rules: Tonic→Subdominant/Dominant→Tonic. Strong resolutions and tonal centers.'
        };
        return descriptions[logic] || '';
    }

    /**
     * Render UI
     */
    render() {
        if (!this.container) return;
        
        const currentNumbers = this.getCurrentNumbers();
        const scaleDisplayName = this.getScaleDisplayName(this.currentScale);
        const miniPianoSVG = this.renderMiniPiano();
        const scaleTip = this.getScaleTip(this.currentScale);
        
        this.container.innerHTML = `
            <div class="number-generator-ui">
                <h3>Number Generator</h3>
                <div class="length-controls">
                    <button class="btn length-btn" id="len-minus">−</button>
                    <div class="length-display"><span id="len-value">${this.state.desiredLength}</span></div>
                    <button class="btn length-btn" id="len-plus">+</button>
                </div>
                
                <!-- Generation Logic Selector -->
                <div style="margin: 12px 0; padding: 10px; background: var(--surface-color); border-radius: 8px;">
                    <label style="display: block; font-size: 0.75rem; margin-bottom: 6px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Generation Logic:</label>
                    <select id="generation-logic" class="form-input" style="width: 100%; padding: 6px; font-size: 0.85rem;">
                        <option value="random" ${this.state.generationLogic === 'random' ? 'selected' : ''}>🎲 Random (Pure Chance)</option>
                        <option value="melodic" ${this.state.generationLogic === 'melodic' ? 'selected' : ''}>🎵 Melodic (Stepwise Motion)</option>
                        <option value="harmonic" ${this.state.generationLogic === 'harmonic' ? 'selected' : ''}>🎹 Harmonic (Chord Progressions)</option>
                        <option value="chord_tones" ${this.state.generationLogic === 'chord_tones' ? 'selected' : ''}>🎸 Chord Tones (Arpeggios)</option>
                        <option value="functional" ${this.state.generationLogic === 'functional' ? 'selected' : ''}>🎼 Functional (Tonic→Dominant→Tonic)</option>
                    </select>
                    <div id="logic-description" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px; line-height: 1.3;">
                        ${this.getLogicDescription(this.state.generationLogic)}
                    </div>
                </div>
                
                <div class="manual-input-container" style="margin: 12px 0;">
                    <label for="manual-numbers" style="display: block; font-size: 0.85rem; margin-bottom: 4px; color: var(--text-secondary);">Manual Input:</label>
                    <div style="display:flex; gap:6px; align-items:center; justify-content:center; margin-bottom:6px; flex-wrap:wrap;">
                        <button class="btn btn-secondary" id="ng-undo" title="Undo (Ctrl+Z)">↶ Undo</button>
                        <button class="btn btn-secondary" id="ng-redo" title="Redo (Ctrl+Y / Ctrl+Shift+Z)">↷ Redo</button>
                        <span style="width:1px; height:18px; background: var(--border-color);"></span>
                        <button class="btn" id="ng-rotate-left" title="Rotate left (Alt+←)">◀</button>
                        <button class="btn" id="ng-rotate-right" title="Rotate right (Alt+→)">▶</button>
                    </div>
                    <input type="text" id="manual-numbers" 
                           class="form-input" 
                           placeholder="e.g., 2 5 1 6 or 2,5,1,6"
                           value="${currentNumbers.join(' ')}"
                           style="width: 100%; padding: 8px; font-size: 0.95rem; text-align: center; font-weight: 600;">
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; text-align: center;">Type numbers separated by spaces or commas</div>
                </div>
                <div class="numbers-display">
                    ${currentNumbers.map(num => {
                        let color = '#10b981'; // Default green for naturals
                        
                        // Use scale notes if available
                        let noteLabel = '';
                        if (this.currentScaleNotes && this.currentScaleNotes.length > 0) {
                            const note = this.currentScaleNotes[(num - 1) % this.currentScaleNotes.length];
                            // Get the correct enharmonic based on current key
                            const correctNote = this.getCorrectEnharmonic(note, this.currentKey);
                            noteLabel = correctNote || '';
                            if (noteLabel) {
                                if (noteLabel.includes('#')) color = '#8b5cf6'; // Purple for sharps
                                else if (noteLabel.includes('b')) color = '#3b82f6'; // Blue for flats
                                else color = '#10b981'; // Green for naturals
                            }
                        }
                        
                        return `
                            <div class="number-container" data-degree="${num}">
                                <span class="number-bubble" data-degree="${num}" style="background: ${color}; color: white; cursor: pointer;">${num}</span>
                                <div class="dice-indicator">🎲</div>
                                <div class="note-indicator" style="color: ${color};">${noteLabel}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <button class="btn" id="generate-btn">Generate New</button>
                <button class="btn btn-secondary" id="common-progression-btn" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); margin-top: 8px;">🎼 Common Progression</button>
                <button class="btn" id="retrograde-btn">Retrograde</button>
                
                <!-- Harmonization Mode Toggle -->
                <div style="margin: 12px 0; padding: 10px; background: var(--surface-color); border-radius: 8px; border: 1px solid var(--border-color);">
                    <label style="display: block; font-size: 0.75rem; margin-bottom: 6px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;">Harmonization Mode:</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.85rem;">
                            <input type="radio" name="harm-mode" value="melody" checked id="harm-mode-melody">
                            <span>🎵 Numbers as Melody</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.85rem;">
                            <input type="radio" name="harm-mode" value="harmony" id="harm-mode-harmony">
                            <span>🎹 Numbers as Chord Tones</span>
                        </label>
                    </div>
                    <div id="harm-mode-description" style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px; line-height: 1.3;">
                        Melody: Each number = melody note, generate one chord per note. Harmony: Each number = chord tone, pick chords that contain the number.
                    </div>
                </div>
                
                <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:8px;">
                    <button class="btn btn-primary" id="ng-map-melody" title="Play these numbers on the piano as a melody">🎵 Play Sequence</button>
                    <button class="btn btn-primary" id="ng-harmonize" title="Generate chords based on harmonization mode" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">🎼 Harmonize</button>
                </div>
                <style>
                    .length-controls {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        margin: 8px 0 12px 0;
                    }
                    .length-btn {
                        width: 32px;
                        height: 32px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                    }
                    .length-display {
                        min-width: 36px;
                        text-align: center;
                        font-weight: 700;
                    }
                    .number-container {
                        display: inline-flex;
                        flex-direction: column;
                        align-items: center;
                        margin: 0 5px;
                    }
                    .dice-indicator {
                        font-size: 0.8em;
                        margin-top: 3px;
                        opacity: 0.8;
                    }
                    .note-indicator {
                        font-size: 0.9em;
                        font-weight: 600;
                        margin-top: 2px;
                    }
                    .scale-info {
                        margin-bottom: 10px;
                        color: var(--text-secondary);
                        text-align: center;
                    }
                    .scale-tip {
                        margin-top: 8px;
                        padding: 8px 12px;
                        background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
                        border-left: 3px solid #4f46e5;
                        border-radius: 4px;
                        font-size: 0.85rem;
                        color: #1e293b;
                        text-align: left;
                        line-height: 1.4;
                    }
                </style>
            </div>
        `;
        
        // Manual input handler
        const manualInput = document.getElementById('manual-numbers');
        if (manualInput) {
            // Keyboard shortcuts: Undo/Redo and Rotate
            manualInput.addEventListener('keydown', (e) => {
                // Undo: Ctrl+Z
                if (e.ctrlKey && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
                    e.preventDefault();
                    if (this.undo()) this.render();
                    return;
                }
                // Redo: Ctrl+Y or Ctrl+Shift+Z
                if ((e.ctrlKey && (e.key === 'y' || e.key === 'Y')) || (e.ctrlKey && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
                    e.preventDefault();
                    if (this.redo()) this.render();
                    return;
                }
                // Rotate with Alt+ArrowLeft/ArrowRight to avoid caret movement conflicts
                if (e.altKey && e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.applyTransformation('rotate_left', { amount: 1 });
                    this.render();
                    return;
                }
                if (e.altKey && e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.applyTransformation('rotate_right', { amount: 1 });
                    this.render();
                    return;
                }
            });
            manualInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                if (!value) {
                    this.setNumbers([], this.state.numberType);
                    return;
                }
                
                // Parse numbers from input (supports spaces, commas, or both)
                const numbers = value
                    .split(/[\s,]+/)
                    .map(s => parseInt(s.trim(), 10))
                    .filter(n => !isNaN(n) && n >= 1);
                
                if (numbers.length > 0) {
                    this.setNumbers(numbers, this.state.numberType);
                }
            });
            
            manualInput.addEventListener('blur', () => {
                // Re-render to sync display with actual state
                this.render();
            });
        }
        // Toolbar buttons
        const undoBtn = document.getElementById('ng-undo');
        const redoBtn = document.getElementById('ng-redo');
        const rotLBtn = document.getElementById('ng-rotate-left');
        const rotRBtn = document.getElementById('ng-rotate-right');

        if (undoBtn) {
            undoBtn.disabled = this.state.undoStack.length === 0;
            undoBtn.addEventListener('click', () => {
                if (this.undo()) this.render();
            });
        }
        if (redoBtn) {
            redoBtn.disabled = this.state.redoStack.length === 0;
            redoBtn.addEventListener('click', () => {
                if (this.redo()) this.render();
            });
        }
        if (rotLBtn) {
            rotLBtn.addEventListener('click', () => {
                this.applyTransformation('rotate_left', { amount: 1 });
                this.render();
            });
        }
        if (rotRBtn) {
            rotRBtn.addEventListener('click', () => {
                this.applyTransformation('rotate_right', { amount: 1 });
                this.render();
            });
        }
        
        // Generation logic selector
        const logicSelector = document.getElementById('generation-logic');
        if (logicSelector) {
            logicSelector.addEventListener('change', (e) => {
                this.state.generationLogic = e.target.value;
                // Update description
                const descEl = document.getElementById('logic-description');
                if (descEl) {
                    descEl.textContent = this.getLogicDescription(this.state.generationLogic);
                }
            });
        }
        
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateNumbers(undefined, this.getNumberType());
            this.render();
        });
        
        document.getElementById('common-progression-btn').addEventListener('click', () => {
            this.loadRandomCommonProgression();
            this.render();
        });
        
        document.getElementById('retrograde-btn').addEventListener('click', () => {
            this.applyTransformation('retrograde');
            this.render();
        });

        // Melody workflow buttons
        const mapBtn = document.getElementById('ng-map-melody');
        if (mapBtn) {
            mapBtn.addEventListener('click', () => {
                try {
                    const numbers = this.getCurrentNumbers();
                    if (window.modularApp && typeof window.modularApp.playMelodyFromNumbers === 'function') {
                        window.modularApp.playMelodyFromNumbers(numbers, { bpm: 96, rhythm: 'even' });
                    }
                } catch (e) { console.error(e); }
            });
        }

        const harmBtn = document.getElementById('ng-harmonize');
        if (harmBtn) {
            harmBtn.addEventListener('click', () => {
                try {
                    if (window.modularApp && typeof window.modularApp.harmonizeCurrentSequence === 'function') {
                        window.modularApp.harmonizeCurrentSequence(this.state.harmonizationMode);
                    }
                } catch (e) { console.error(e); }
            });
        }

        // Harmonization mode toggle
        const modeRadios = this.container.querySelectorAll('input[name="harm-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.harmonizationMode = e.target.value;
                const desc = this.container.querySelector('#harm-mode-description');
                if (desc) {
                    desc.textContent = e.target.value === 'melody' 
                        ? 'Melody: Each number = melody note, generate one chord per note. Harmony: Each number = chord tone, pick chords that contain the number.'
                        : 'Harmony: Each number is a chord tone. Progression Builder will pick chords that contain each number, using current pad settings for complexity/quality.';
                }
            });
        });

        const minusBtn = document.getElementById('len-minus');
        const plusBtn = document.getElementById('len-plus');
        const lenValueEl = document.getElementById('len-value');
        const minLen = 1;
        const maxLen = 16;

        minusBtn.addEventListener('click', () => {
            const next = Math.max(minLen, (this.state.desiredLength || this.options.defaultLength) - 1);
            this.state.desiredLength = next;
            if (lenValueEl) lenValueEl.textContent = String(next);
        });

        plusBtn.addEventListener('click', () => {
            const next = Math.min(maxLen, (this.state.desiredLength || this.options.defaultLength) + 1);
            this.state.desiredLength = next;
            if (lenValueEl) lenValueEl.textContent = String(next);
        });

        // Emit single note selection when clicking a number bubble
        const bubbles = this.container.querySelectorAll('.number-container .number-bubble');
        bubbles.forEach(el => {
            el.addEventListener('click', () => {
                const degAttr = el.getAttribute('data-degree');
                const degree = parseInt(degAttr, 10);
                if (!isNaN(degree) && this.currentScaleNotes && this.currentScaleNotes.length) {
                    const idx = (degree - 1) % this.currentScaleNotes.length;
                    const note = this.currentScaleNotes[idx];
                    this.emit('singleNoteSelected', {
                        degree,
                        note,
                        key: this.currentKey,
                        scale: this.currentScale,
                        source: 'number_bubble'
                    });
                }
            });
        });
    }

    /**
     * Get correct enharmonic note name based on key signature
     */
    getCorrectEnharmonic(noteName, keySignature = null) {
        // If no key signature, return the note as-is
        if (!keySignature) return noteName;

        // For notes with enharmonic equivalents, choose based on key signature
        const enharmonicPairs = {
            'C#': 'Db', 'Db': 'C#',
            'D#': 'Eb', 'Eb': 'D#',
            'F#': 'Gb', 'Gb': 'F#',
            'G#': 'Ab', 'Ab': 'G#',
            'A#': 'Bb', 'Bb': 'A#'
        };

        // If note doesn't have enharmonic equivalents, return as-is
        if (!enharmonicPairs[noteName]) return noteName;

        // Check if we have access to music theory engine for key signature info
        if (typeof window !== 'undefined' && window.MusicTheoryEngine) {
            const engine = new window.MusicTheoryEngine();
            
            // Get the key signature information
            const keySig = engine.keySignatures[keySignature];
            if (keySig) {
                // Choose based on key signature type
                if (keySig.type === 'sharp') {
                    // Prefer sharps for sharp keys
                    return noteName.includes('#') ? noteName : enharmonicPairs[noteName];
                } else if (keySig.type === 'flat') {
                    // Prefer flats for flat keys
                    return noteName.includes('b') ? noteName : enharmonicPairs[noteName];
                }
            }
        }

        // Simple fallback: prefer sharps for sharp keys, flats for flat keys
        const sharpKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
        const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

        if (sharpKeys.includes(keySignature)) {
            // Prefer sharps
            return noteName.includes('#') ? noteName : enharmonicPairs[noteName];
        } else if (flatKeys.includes(keySignature)) {
            // Prefer flats
            return noteName.includes('b') ? noteName : enharmonicPairs[noteName];
        }

        return noteName;
    }

    /**
     * Render mini piano visualization showing scale notes
     */
    renderMiniPiano() {
        if (!this.currentScaleNotes || this.currentScaleNotes.length === 0) {
            return '';
        }

        const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackKeys = {
            'C#': 0.7, 'Db': 0.7,
            'D#': 1.7, 'Eb': 1.7,
            'F#': 3.7, 'Gb': 3.7,
            'G#': 4.7, 'Ab': 4.7,
            'A#': 5.7, 'Bb': 5.7
        };

        const enharmonicEquivalents = {
            'C#': ['Db'], 'Db': ['C#'],
            'D#': ['Eb'], 'Eb': ['D#'],
            'F#': ['Gb'], 'Gb': ['F#'],
            'G#': ['Ab'], 'Ab': ['G#'],
            'A#': ['Bb'], 'Bb': ['A#'],
            'E#': ['F'], 'F': ['E#'],
            'B#': ['C'], 'C': ['B#'],
            'Cb': ['B'], 'B': ['Cb'],
            'Fb': ['E'], 'E': ['Fb']
        };

        const keyWidth = 16;
        const whiteHeight = 60;
        const blackHeight = 36;
        const octaves = 2;
        const totalWidth = whiteKeys.length * keyWidth * octaves;
        const octaveWidth = whiteKeys.length * keyWidth;

        // Normalize scale notes to remove octave info
        const normalizedNotes = new Set();

        this.currentScaleNotes.forEach(rawNote => {
            if (!rawNote) return;

            let note = rawNote
                .replace(/[♯]/g, '#')
                .replace(/[♭]/g, 'b')
                .replace(/[𝄪]/g, '##')
                .replace(/[𝄫]/g, 'bb')
                .replace(/[0-9]/g, '')
                .trim();

            if (!note) return;

            // Get the correct enharmonic based on current key
            const correctNote = this.getCorrectEnharmonic(note, this.currentKey);
            normalizedNotes.add(correctNote);

            const equivalents = enharmonicEquivalents[note] || [];
            equivalents.forEach(eq => {
                const correctEq = this.getCorrectEnharmonic(eq, this.currentKey);
                normalizedNotes.add(correctEq);
            });
        });

        // Determine highlight window: one octave starting at current key
        const exceptionalMap = { 'Cb': 'B', 'B#': 'C', 'Fb': 'E', 'E#': 'F' };
        const resolveKeyboardName = (n) => exceptionalMap[n] || n;
        const getStartXForTonic = () => {
            let tonic = resolveKeyboardName(this.currentKey || 'C');
            // Try direct match
            if (whiteKeys.includes(tonic)) return whiteKeys.indexOf(tonic) * keyWidth;
            if (Object.prototype.hasOwnProperty.call(blackKeys, tonic)) return blackKeys[tonic] * keyWidth;
            // Try enharmonic equivalents
            const candidates = [tonic, this.getCorrectEnharmonic(tonic, this.currentKey), ...((enharmonicEquivalents[tonic] || []))];
            for (const c of candidates) {
                const k = resolveKeyboardName(c);
                if (whiteKeys.includes(k)) return whiteKeys.indexOf(k) * keyWidth;
                if (Object.prototype.hasOwnProperty.call(blackKeys, k)) return blackKeys[k] * keyWidth;
            }
            return 0; // fallback to leftmost
        };
        const highlightStartX = getStartXForTonic();
        const highlightEndX = highlightStartX + octaveWidth;

        let svg = `
            <svg width="${totalWidth}" height="${whiteHeight}" style="margin-top: 8px; border: 1px solid #ccc; border-radius: 4px; background: white;">
        `;

        // Draw white keys across two octaves
        for (let octaveIndex = 0; octaveIndex < octaves; octaveIndex++) {
            whiteKeys.forEach((key, i) => {
                const x = (octaveIndex * whiteKeys.length + i) * keyWidth;
                const correctKey = this.getCorrectEnharmonic(key, this.currentKey);
                const isWithinRange = x >= highlightStartX && x < highlightEndX;
                const isActive = isWithinRange && normalizedNotes.has(correctKey);
                const fill = isActive ? '#10b981' : 'white';
                const stroke = isActive ? '#065f46' : '#cbd5f5';
                const strokeWidth = isActive ? 1.5 : 1;
                svg += `
                    <rect x="${x}" y="0" width="${keyWidth - 1}" height="${whiteHeight}" 
                          fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="2"/>
                `;
                if (isActive) {
                    svg += `
                        <text x="${x + keyWidth / 2}" y="${whiteHeight - 6}" 
                              text-anchor="middle" font-size="9" fill="#0f172a" font-weight="700">${correctKey}</text>
                    `;
                }
            });
        }

        // Draw black keys across two octaves
        for (let octaveIndex = 0; octaveIndex < octaves; octaveIndex++) {
            Object.entries(blackKeys).forEach(([key, position]) => {
                const x = (position + octaveIndex * whiteKeys.length) * keyWidth;
                const correctKey = this.getCorrectEnharmonic(key, this.currentKey);
                const isWithinRange = x >= highlightStartX && x < highlightEndX;
                const isActive = isWithinRange && normalizedNotes.has(correctKey);
                const fill = isActive ? '#4f46e5' : '#1f2937';
                const stroke = isActive ? '#c7d2fe' : '#000';
                const strokeWidth = isActive ? 1.5 : 1;
                svg += `
                    <rect x="${x}" y="0" width="${keyWidth * 0.6}" height="${blackHeight}" 
                          fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="2"/>
                `;
                if (isActive) {
                    svg += `
                        <text x="${x + keyWidth * 0.3}" y="${blackHeight - 4}" 
                              text-anchor="middle" font-size="7" fill="#eef2ff" font-weight="700">${correctKey}</text>
                    `;
                }
            });
        }

        svg += `</svg>`;
        return svg;
    }

    /**
     * Get display name for scale
     */
    getScaleDisplayName(scaleType) {
        const displayNames = {
            major: 'Major',
            dorian: 'Dorian',
            phrygian: 'Phrygian',
            lydian: 'Lydian',
            mixolydian: 'Mixolydian',
            aeolian: 'Natural Minor',
            locrian: 'Locrian',
            melodic: 'Melodic Minor (Ascending)',
            harmonic: 'Harmonic Minor',
            harmonic_major: 'Harmonic Major',
            double_harmonic_major: 'Double Harmonic Major',
            phrygian_dominant: 'Phrygian Dominant',
            whole_tone: 'Whole Tone',
            octatonic_dim: 'Octatonic (Diminished)',
            major_pentatonic: 'Major Pentatonic',
            minor_pentatonic: 'Minor Pentatonic',
            blues_hexatonic: 'Blues Hexatonic',
            barry_major6dim: 'Barry Harris Major 6 Dim',
            barry_dom7dim: 'Barry Harris Dominant 7 Dim',
            barry_minor6dim: 'Barry Harris Minor 6 Dim'
        };

        return displayNames[scaleType] || scaleType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get helpful tips for each scale
     * Full citations with references are shown in Scale Library
     */
    getScaleTip(scaleType) {
        const tips = {
            major: 'The foundation scale - happy and bright sound',
            dorian: 'Minor scale with raised 6th - jazzy, sophisticated',
            phrygian: 'Minor scale with lowered 2nd - Spanish, exotic',
            lydian: 'Major scale with raised 4th - dreamy, floating',
            mixolydian: 'Major scale with lowered 7th - blues, rock',
            aeolian: 'Natural minor - sad, melancholic sound',
            locrian: 'Minor scale with lowered 2nd & 5th - dark, unstable',
            melodic: 'Minor scale with raised 6th & 7th - smooth ascending',
            altered: '7th mode of melodic minor - ultra-dissonant for V7 chords',
            harmonic: 'Minor scale with raised 7th - classical, Middle Eastern',
            harmonic_major: 'Major scale with lowered 6th - exotic major sound',
            double_harmonic_major: 'Major with ♭2 & ♭6 - Byzantine, Arabic vibe',
            phrygian_dominant: '5th mode of harmonic minor - Spanish flamenco sound',
            whole_tone: 'All whole steps - symmetrical, impressionistic',
            octatonic_dim: 'Half-whole pattern - symmetrical, diminished harmony',
            octatonic_dom: 'Half-whole dominant pattern - jazz harmony',
            major_pentatonic: '5-note major scale - universal, folk music',
            minor_pentatonic: '5-note minor scale - blues, rock foundation',
            egyptian_pentatonic: 'Suspended pentatonic - ancient, mystical',
            blues_hexatonic: 'Minor pentatonic + ♭5 "blue note" - classic blues',
            hijaz: 'Middle Eastern scale with augmented 2nd - exotic tension',
            hirajoshi: 'Japanese scale - meditative, traditional',
            iwato: 'Japanese scale - dark, mysterious',
            insen: 'Japanese scale - contemplative, sparse',
            yo: 'Japanese scale - bright, uplifting',
            raga_bhairav: 'Indian raga (12-TET approx) - morning devotional',
            raga_todi: 'Indian raga - morning raga with unique character',
            raga_marwa: 'Indian raga - evening raga',
            barry_major6dim: 'Barry Harris: Major 6th + diminished passing tones',
            barry_dom7dim: 'Barry Harris: Dominant 7th + diminished passing tones',
            barry_minor6dim: 'Barry Harris: Minor 6th + diminished passing tones',
            lydian_dominant: '4th mode of melodic minor - lydian with ♭7',
            lydian_augmented: '3rd mode of melodic minor - lydian with ♯5',
            mixolydian_b6: '5th mode of melodic minor - mixolydian with ♭6',
            locrian_nat2: '6th mode of melodic minor - half-diminished scale',
            dorian_b2: '2nd mode of melodic minor - Phrygian ♮6',
            bebop_major: 'Major scale with chromatic passing tone',
            bebop_dominant: 'Mixolydian with major 7th passing tone',
            bebop_minor: 'Dorian with major 3rd passing tone',
            bebop_dorian: 'Dorian with chromatic passing tone',
            hungarian_minor: 'Gypsy minor - exotic Eastern European sound',
            persian: 'Persian scale - Middle Eastern flavor',
            spanish_phrygian: 'Spanish Phrygian - flamenco foundation',
            spanish_gypsy: 'Spanish Gypsy - Phrygian with major 3rd',
            flamenco: 'Flamenco mode - Spanish traditional',
            neapolitan_major: 'Neapolitan major - dramatic ♭2',
            neapolitan_minor: 'Neapolitan minor - dark ♭2',
            enigmatic: 'Verdi\'s enigmatic scale - mysterious',
            prometheus: 'Scriabin\'s mystic chord as scale',
            augmented: 'Hexatonic augmented pattern',
            tritone: 'Petrushka chord as scale'
        };

        const tip = tips[scaleType] || 'Explore this unique scale';
        
        return `💡 ${tip}`;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NumberGenerator;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.NumberGenerator = NumberGenerator;
}
