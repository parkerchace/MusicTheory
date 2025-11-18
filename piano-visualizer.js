/**
 * PIANO VISUALIZER MODULE
 *
 * Renders interactive piano keyboard with scale degree and chord visualization
 * Used by Scale Library and Chord Analyzer modules
 *
 * Features:
 * - Accurate piano keyboard rendering (2 octaves)
 * - Scale degree highlighting with colors
 * - Colored scale degree number bubbles above keys
 * - Standard piano fingering below keys
 * - Hand diagrams with numbered fingers
 * - Note role visualization (root, third, fifth, seventh, etc.)
 * - Interactive note clicking
 * - Multiple visualization modes
 * - Responsive design
 *
 * Fingering patterns based on:
 * - Alfred's Basic Piano Library
 * - Faber Piano Adventures
 * - Royal Conservatory of Music Syllabus
 * - "The Virtuoso Pianist" by Charles-Louis Hanon
 */

class PianoVisualizer {
    constructor(options = {}) {
        this.options = {
            startMidi: options.startMidi || 21, // A0 default
            endMidi: options.endMidi || 108, // C8 default (inclusive)
            octaves: options.octaves || 2, // kept for backward compatibility if endMidi not provided
            whiteKeyWidth: options.whiteKeyWidth || 80, // Increased from 60 for better visibility
            whiteKeyHeight: options.whiteKeyHeight || 200, // Increased from 140
            blackKeyHeight: options.blackKeyHeight || 120, // Increased from 90
            fitToContainer: options.fitToContainer !== false, // scale keys to container width
            showFingering: options.showFingering !== false, // Show fingering by default
            showLeftHandFingering: options.showLeftHandFingering !== false, // Show left hand fingering by default
            showRightHandFingering: options.showRightHandFingering !== false, // Show right hand fingering by default
            showRomanNumerals: options.showRomanNumerals !== false, // Show roman numerals by default
            container: options.container || null,
            ...options
        };

        this.state = {
            activeNotes: [],
            highlightedNotes: [],
            noteRoles: new Map(), // note -> role mapping
            noteDegrees: new Map(), // note -> scale degree mapping
            mode: 'scale', // scale, chord, degrees
            currentKey: 'C',
            currentScale: 'major',
            scaleNotes: [] // Array of scale notes in order
        };

        this.listeners = new Map();
        this.pianoElement = null;
        this.keysInner = null; // inner scrollable content
    this._melodyTimers = [];
    this._melodyCancel = null;

        // Piano layout constants
        this.WHITE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        this.BLACK_ORDER = ['C#', 'D#', null, 'F#', 'G#', 'A#', null];
        this.NOTE_TO_SEMITONE = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };
        this.SEMITONE_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        // Standard piano fingering patterns (1=thumb, 2=index, 3=middle, 4=ring, 5=pinky)
        // Based on Alfred's Basic Piano Library and Royal Conservatory standards
        this.FINGERING_PATTERNS = {
            // Major scales - Right Hand (RH) and Left Hand (LH)
            'C_major_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'C_major_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'G_major_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'G_major_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'D_major_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'D_major_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'A_major_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'A_major_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'E_major_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'E_major_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'B_major_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'B_major_LH': [4, 3, 2, 1, 4, 3, 2, 1],
            'F#_major_RH': [2, 3, 4, 1, 2, 3, 1, 2],
            'F#_major_LH': [4, 3, 2, 1, 3, 2, 1, 4],
            'Gb_major_RH': [2, 3, 4, 1, 2, 3, 1, 2],
            'Gb_major_LH': [4, 3, 2, 1, 3, 2, 1, 4],
            'Db_major_RH': [2, 3, 1, 2, 3, 4, 1, 2],
            'Db_major_LH': [3, 2, 1, 4, 3, 2, 1, 3],
            'Ab_major_RH': [3, 4, 1, 2, 3, 1, 2, 3],
            'Ab_major_LH': [3, 2, 1, 4, 3, 2, 1, 3],
            'Eb_major_RH': [3, 1, 2, 3, 4, 1, 2, 3],
            'Eb_major_LH': [3, 2, 1, 4, 3, 2, 1, 3],
            'Bb_major_RH': [2, 1, 2, 3, 1, 2, 3, 4],
            'Bb_major_LH': [3, 2, 1, 4, 3, 2, 1, 3],
            'F_major_RH': [1, 2, 3, 4, 1, 2, 3, 4],
            'F_major_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            
            // Natural minor scales
            'A_minor_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'A_minor_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'E_minor_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'E_minor_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'B_minor_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'B_minor_LH': [4, 3, 2, 1, 4, 3, 2, 1],
            'F#_minor_RH': [2, 3, 4, 1, 2, 3, 1, 2],
            'F#_minor_LH': [4, 3, 2, 1, 3, 2, 1, 4],
            'C#_minor_RH': [3, 4, 1, 2, 3, 1, 2, 3],
            'C#_minor_LH': [3, 2, 1, 4, 3, 2, 1, 3],
            'G#_minor_RH': [3, 4, 1, 2, 3, 1, 2, 3],
            'G#_minor_LH': [3, 2, 1, 4, 3, 2, 1, 3],
            'D#_minor_RH': [2, 3, 1, 2, 3, 4, 1, 2],
            'D#_minor_LH': [3, 2, 1, 4, 3, 2, 1, 2],
            'Bb_minor_RH': [2, 1, 2, 3, 4, 1, 2, 3],
            'Bb_minor_LH': [3, 2, 1, 4, 3, 2, 1, 2],
            'F_minor_RH': [1, 2, 3, 4, 1, 2, 3, 4],
            'F_minor_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'C_minor_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'C_minor_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'G_minor_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'G_minor_LH': [5, 4, 3, 2, 1, 3, 2, 1],
            'D_minor_RH': [1, 2, 3, 1, 2, 3, 4, 5],
            'D_minor_LH': [5, 4, 3, 2, 1, 3, 2, 1]
        };

    // Roman numeral representations (kept for backwards compatibility)
    this.ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

        this.initialize();
    }

    initialize() {
        this.createPianoElement();
    }

    /**
     * Event system
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
                    console.error('Error in piano event listener:', error);
                }
            });
        }
    }

    /**
     * Create piano DOM structure
     */
    createPianoElement() {
        if (this.pianoElement) return;

        this.pianoElement = document.createElement('div');
        this.pianoElement.className = 'piano-visualizer';
        this.pianoElement.style.overflowX = this.options.fitToContainer ? 'hidden' : 'auto';
        this.pianoElement.style.width = '100%';

        // Inner container that actually has the full keyboard width
        this.keysInner = document.createElement('div');
        this.keysInner.className = 'piano-keys-inner';
        this.keysInner.style.position = 'relative';
        this.keysInner.style.height = '140px';

        // Create layers for white and black keys inside inner container
        this.whitesLayer = document.createElement('div');
        this.whitesLayer.className = 'piano-whites-layer';
        this.whitesLayer.style.position = 'absolute';
        this.whitesLayer.style.left = '0';
        this.whitesLayer.style.top = '0';
        this.whitesLayer.style.height = '100%';

        this.blacksLayer = document.createElement('div');
        this.blacksLayer.className = 'piano-blacks-layer';
        this.blacksLayer.style.position = 'absolute';
        this.blacksLayer.style.left = '0';
        this.blacksLayer.style.top = '0';
        this.blacksLayer.style.height = '100%';

        this.keysInner.appendChild(this.whitesLayer);
        this.keysInner.appendChild(this.blacksLayer);
        this.pianoElement.appendChild(this.keysInner);

        this.render();
    }

    /**
     * Render piano keyboard
     */
    render() {
        if (!this.pianoElement) this.createPianoElement();

        this.whitesLayer.innerHTML = '';
        this.blacksLayer.innerHTML = '';

        // Compute range
        const startMidi = this.options.startMidi;
        const endMidi = (typeof this.options.endMidi === 'number')
            ? this.options.endMidi
            : (this.options.startMidi + (this.options.octaves * 12) - 1);

        // Count white keys to determine total width
        let whiteCount = 0;
        for (let m = startMidi; m <= endMidi; m++) {
            const name = this.SEMITONE_TO_NOTE[m % 12];
            if (!name.includes('#')) whiteCount++;
        }
        const totalWidth = whiteCount * this.options.whiteKeyWidth;

        // Set container sizes with increased height for annotations
        const totalHeight = this.options.whiteKeyHeight + 80; // Extra space for roman numerals and fingering
        this.keysInner.style.width = `${totalWidth}px`;
        this.keysInner.style.height = `${totalHeight}px`;

        // Fit-to-container scaling
        let scale = 1;
        if (this.options.fitToContainer && this.pianoElement) {
            // Ensure the element is in DOM to measure
            const containerWidth = this.pianoElement.clientWidth || (this.pianoElement.parentElement ? this.pianoElement.parentElement.clientWidth : totalWidth);
            if (containerWidth && totalWidth) {
                scale = Math.min(1, containerWidth / totalWidth);
            }
            this.keysInner.style.transformOrigin = 'left top';
            this.keysInner.style.transform = `scale(${scale})`;
            this.pianoElement.style.height = `${totalHeight * scale}px`;
        } else {
            this.keysInner.style.transform = '';
            this.pianoElement.style.height = `${totalHeight}px`;
        }

        // Render white keys
        this.renderWhiteKeys(startMidi, endMidi);

        // Render black keys
        this.renderBlackKeys(startMidi, endMidi);

        // Apply current state
        this.applyState();
    }

    /**
     * Render white keys
     */
    renderWhiteKeys(startMidi, endMidi) {
        let whiteIndex = 0;
        for (let midi = startMidi; midi <= endMidi; midi++) {
            const baseName = this.SEMITONE_TO_NOTE[midi % 12];
            if (baseName.includes('#')) continue; // only whites here

            const key = document.createElement('div');
            key.className = 'piano-white-key';
            key.style.left = `${whiteIndex * this.options.whiteKeyWidth}px`;
            key.style.width = `${this.options.whiteKeyWidth}px`;
            key.style.height = `${this.options.whiteKeyHeight}px`;
            key.style.top = '20px'; // Space for roman numerals above
            key.style.position = 'absolute';
            key.style.background = 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)';
            key.style.border = '2px solid #cbd5e1';
            key.style.borderRadius = '0 0 6px 6px';
            key.style.cursor = 'pointer';
            key.style.transition = 'all 0.2s ease';
            key.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            
            // Create a label container at the bottom
            const labelContainer = document.createElement('div');
            labelContainer.style.position = 'absolute';
            labelContainer.style.bottom = '8px';
            labelContainer.style.left = '0';
            labelContainer.style.right = '0';
            labelContainer.style.textAlign = 'center';
            labelContainer.style.fontSize = '10px';
            labelContainer.style.color = '#64748b';
            labelContainer.style.fontWeight = '500';
            labelContainer.style.pointerEvents = 'none';

            // MIDI/note metadata
            const octave = Math.floor(midi / 12) - 1;
            key.dataset.midi = String(midi);
            key.dataset.note = baseName;
            key.dataset.octave = String(octave);

            // Label
            const noteWithOctave = `${baseName}${octave}`;
            labelContainer.textContent = noteWithOctave;
            key.appendChild(labelContainer);

            // Clicks
            key.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNoteClick(baseName, midi);
            });

            // Hovers
            key.addEventListener('mouseenter', () => {
                key.style.background = 'linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%)';
                key.style.transform = 'translateY(-2px)';
                key.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            });
            key.addEventListener('mouseleave', () => {
                if (this.state.activeNotes.includes(baseName)) {
                    key.style.background = 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)';
                    key.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.2), 0 4px 8px rgba(0, 0, 0, 0.15)';
                } else {
                    key.style.background = 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)';
                    key.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }
                key.style.transform = 'translateY(0)';
            });

            this.whitesLayer.appendChild(key);
            whiteIndex++;
        }
    }

    /**
     * Render black keys
     */
    renderBlackKeys(startMidi, endMidi) {
        let whiteIndex = 0;
        let lastWhiteX = 0;
        for (let midi = startMidi; midi <= endMidi; midi++) {
            const baseName = this.SEMITONE_TO_NOTE[midi % 12];
            const isBlack = baseName.includes('#');
            if (!isBlack) {
                lastWhiteX = whiteIndex * this.options.whiteKeyWidth;
                whiteIndex++;
                continue;
            }

            const key = document.createElement('div');
            key.className = 'piano-black-key';
            key.style.left = `${lastWhiteX + (this.options.whiteKeyWidth * 0.7)}px`;
            key.style.width = `${this.options.whiteKeyWidth * 0.6}px`;
            key.style.height = `${this.options.blackKeyHeight}px`;
            key.style.top = '20px'; // Space for roman numerals above
            key.style.position = 'absolute';
            key.style.background = 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)';
            key.style.border = '2px solid #0f172a';
            key.style.borderRadius = '0 0 4px 4px';
            key.style.cursor = 'pointer';
            key.style.transition = 'all 0.2s ease';
            key.style.zIndex = '10';
            key.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
            
            // Create a label container at the bottom
            const labelContainer = document.createElement('div');
            labelContainer.style.position = 'absolute';
            labelContainer.style.bottom = '6px';
            labelContainer.style.left = '0';
            labelContainer.style.right = '0';
            labelContainer.style.textAlign = 'center';
            labelContainer.style.fontSize = '8px';
            labelContainer.style.color = '#94a3b8';
            labelContainer.style.fontWeight = '500';
            labelContainer.style.pointerEvents = 'none';

            const octave = Math.floor(midi / 12) - 1;
            key.dataset.midi = String(midi);
            key.dataset.note = baseName;
            key.dataset.octave = String(octave);

            const noteWithOctave = `${baseName}${octave}`;
            labelContainer.textContent = noteWithOctave;
            key.appendChild(labelContainer);

            key.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNoteClick(baseName, midi);
            });

            key.addEventListener('mouseenter', () => {
                key.style.background = 'linear-gradient(180deg, #334155 0%, #1e293b 100%)';
                key.style.transform = 'translateY(-1px)';
            });
            key.addEventListener('mouseleave', () => {
                if (this.state.activeNotes.includes(baseName)) {
                    key.style.background = 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)';
                    key.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.3), 0 4px 8px rgba(0, 0, 0, 0.3)';
                } else {
                    key.style.background = 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)';
                    key.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
                }
                key.style.transform = 'translateY(0)';
            });

            this.blacksLayer.appendChild(key);
        }
    }

    /**
     * Handle note click
     */
    handleNoteClick(noteName, midiNote) {
        this.emit('noteClicked', {
            note: noteName,
            midi: midiNote,
            enharmonic: this.getEnharmonicEquivalent(noteName)
        });
    }

    /**
     * Get enharmonic equivalent
     */
    getEnharmonicEquivalent(noteName) {
        const equivalents = {
            'C#': 'Db', 'Db': 'C#',
            'D#': 'Eb', 'Eb': 'D#',
            'F#': 'Gb', 'Gb': 'F#',
            'G#': 'Ab', 'Ab': 'G#',
            'A#': 'Bb', 'Bb': 'A#'
        };
        return equivalents[noteName] || noteName;
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
     * Update piano key labels based on current scale and key
     */
    updateKeyLabels(keySignature = null) {
        if (!this.pianoElement) return;

        // Update all key labels
        this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
            const originalNote = key.dataset.note;
            const octave = parseInt(key.dataset.octave);
            const correctNote = this.getCorrectEnharmonic(originalNote, keySignature);
            
            // Update the note label (preserve existing child elements)
            const noteWithOctave = `${correctNote}${octave}`;
            const labelEl = key.querySelector(':scope > div');
            if (labelEl) {
                labelEl.textContent = noteWithOctave;
            }
            
            // Store the correct note for highlighting
            key.dataset.correctNote = correctNote;
        });
    }

    /**
     * Get fingering pattern for current key and scale
     */
    getFingeringPattern(hand = 'RH') {
        const key = this.state.currentKey;
        const scale = this.state.currentScale;
        
        // Normalize scale name (e.g., 'minor' or 'natural_minor' both work)
        const scaleType = scale.includes('minor') ? 'minor' : 'major';
        const patternKey = `${key}_${scaleType}_${hand}`;
        
        return this.FINGERING_PATTERNS[patternKey] || null;
    }

    /**
     * Get fingering for a specific note in the scale
     */
    getFingeringForNote(note, hand = 'RH') {
        const pattern = this.getFingeringPattern(hand);
        if (!pattern) return null;
        
        const scaleNotes = this.state.scaleNotes;
        const index = scaleNotes.findIndex(n => {
            // Check for enharmonic equivalents
            if (n === note) return true;
            const equiv = this.getEnharmonicEquivalent(n);
            return equiv === note;
        });
        
        if (index === -1) return null;
        return pattern[index];
    }

    /**
     * Get roman numeral for a note in the scale
     */
    getRomanNumeralForNote(note) {
        const scaleNotes = this.state.scaleNotes;
        const index = scaleNotes.findIndex(n => {
            // Check for enharmonic equivalents
            if (n === note) return true;
            const equiv = this.getEnharmonicEquivalent(n);
            return equiv === note;
        });
        
        if (index === -1) return null;
        return this.ROMAN_NUMERALS[index] || null;
    }

    /**
     * Get 1-based scale degree number for a note in the current scale
     */
    getScaleDegreeForNote(note) {
        const scaleNotes = this.state.scaleNotes;
        const index = scaleNotes.findIndex(n => {
            if (n === note) return true;
            const equiv = this.getEnharmonicEquivalent(n);
            return equiv === note;
        });
        if (index === -1) return null;
        return index + 1;
    }

    /**
     * Render annotations (roman numerals and fingering) for all keys
     */
    renderAnnotations() {
        if (!this.pianoElement) return;
        
    // Remove existing annotations
    this.pianoElement.querySelectorAll('.key-roman-numeral, .key-degree-bubble, .key-fingering').forEach(el => el.remove());
        
        // Only show annotations when in scale mode and we have scale notes
        if (this.state.mode !== 'scale' || this.state.scaleNotes.length === 0) return;
        
        // Center-octave bounds
        const lowMidi = typeof this.state.centerLowMidi === 'number' ? this.state.centerLowMidi : this.options.startMidi;
        const highMidi = typeof this.state.centerHighMidi === 'number' ? this.state.centerHighMidi : (lowMidi + 12);
        
        // Add annotations to each key
        this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
            const m = parseInt(key.dataset.midi, 10);
            if (!(m >= lowMidi && m < highMidi)) return; // annotate only center octave
            const note = key.dataset.correctNote || key.dataset.note;
            
            // Add colored number bubble above key (replacing roman numerals)
            if (this.options.showRomanNumerals) {
                const degreeNumber = this.getScaleDegreeForNote(note);
                const isScaleNote = this.state.scaleNotes.some(n => n === note || this.getEnharmonicEquivalent(n) === note);
                if (degreeNumber && isScaleNote) {
                    const bubble = document.createElement('div');
                    bubble.className = 'key-degree-bubble';
                    bubble.textContent = String(degreeNumber);
                    bubble.style.position = 'absolute';
                    bubble.style.top = '-26px';
                    bubble.style.left = '50%';
                    bubble.style.transform = 'translateX(-50%)';
                    bubble.style.fontSize = '10px';
                    bubble.style.fontWeight = '800';
                    bubble.style.color = '#ffffff';
                    bubble.style.padding = '2px 6px';
                    bubble.style.borderRadius = '999px';
                    bubble.style.lineHeight = '1.1';
                    bubble.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
                    bubble.style.border = '1px solid rgba(255,255,255,0.25)';
                    bubble.style.pointerEvents = 'none';

                    // Match Number Generator color logic based on enharmonic spelling
                    const correctNote = this.getCorrectEnharmonic(note, this.state.currentKey);
                    let color = '#10b981'; // natural (green)
                    if (correctNote && correctNote.includes('#')) color = '#8b5cf6'; // sharps (purple)
                    else if (correctNote && correctNote.includes('b')) color = '#3b82f6'; // flats (blue)
                    bubble.style.background = color;

                    key.appendChild(bubble);
                }
            }
            
            // Add fingering on the key itself
            if (this.options.showFingering) {
                const fingeringRH = this.getFingeringForNote(note, 'RH');
                const fingeringLH = this.getFingeringForNote(note, 'LH');
                const isScaleNote = this.state.scaleNotes.some(n => n === note || this.getEnharmonicEquivalent(n) === note);
                
                if ((fingeringRH || fingeringLH) && isScaleNote) {
                    // Check if this is a black key for styling adjustments
                    const isBlackKey = note.includes('#') || note.includes('b');
                    
                    const fingeringLabel = document.createElement('div');
                    fingeringLabel.className = 'key-fingering';
                    fingeringLabel.style.position = 'absolute';
                    fingeringLabel.style.top = isBlackKey ? '45%' : '50%';
                    fingeringLabel.style.left = '50%';
                    fingeringLabel.style.transform = 'translate(-50%, -50%)';
                    fingeringLabel.style.fontSize = isBlackKey ? '9px' : '10px';
                    fingeringLabel.style.fontWeight = '700';
                    fingeringLabel.style.pointerEvents = 'none';
                    fingeringLabel.style.textAlign = 'center';
                    fingeringLabel.style.whiteSpace = 'nowrap';
                    fingeringLabel.style.background = 'rgba(255, 255, 255, 0.97)';
                    fingeringLabel.style.padding = isBlackKey ? '2px 4px' : '2px 4px';
                    fingeringLabel.style.borderRadius = '4px';
                    fingeringLabel.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
                    fingeringLabel.style.border = '1px solid rgba(0,0,0,0.1)';
                    fingeringLabel.style.lineHeight = '1.2';
                    fingeringLabel.style.zIndex = '100';
                    
                    // Show hands based on toggle settings
                    const parts = [];
                    const fontSize = isBlackKey ? '8px' : '9px';
                    if (fingeringRH && this.options.showRightHandFingering) parts.push(`<div style="color: #dc2626; font-size: ${fontSize};">R:${fingeringRH}</div>`);
                    if (fingeringLH && this.options.showLeftHandFingering) parts.push(`<div style="color: #2563eb; font-size: ${fontSize}; margin-top: 1px;">L:${fingeringLH}</div>`);
                    fingeringLabel.innerHTML = parts.join('');
                    
                    key.appendChild(fingeringLabel);
                }
            }
        });
    }

    /**
     * Calculate MIDI note number for a given note name
     * @param {string} noteName - Note name (e.g., 'C', 'F#')
     * @param {number} octave - Octave number (default: 4)
     * @returns {number} MIDI note number
     */
    getMidiNoteNumber(noteName, octave = 4) {
        // Prefer direct mapping (handles sharps and flats)
        let semitone = this.NOTE_TO_SEMITONE[noteName];
        // Fallback to enharmonic equivalent if needed
        if (typeof semitone !== 'number') {
            const enh = this.getEnharmonicEquivalent(noteName);
            semitone = this.NOTE_TO_SEMITONE[enh];
        }
        if (typeof semitone !== 'number') semitone = 0; // default to C if still unknown
        return (octave + 1) * 12 + semitone; // C4 = 60
    }
    
    /**
     * Adjust the piano range to start from the selected key
     * @param {string} key - The selected key (e.g., 'C', 'F#')
     */
    adjustPianoRange(key) {
        // Get the MIDI note for the selected key at octave 4
        const keyMidiNote = this.getMidiNoteNumber(key, 4);
        
        // Update the startMidi to match the selected key
        this.options.startMidi = keyMidiNote;
        
        // Set endMidi to show one octave (or the configured number of octaves)
        this.options.endMidi = keyMidiNote + (this.options.octaves * 12);
        
        // Re-render the piano with the new range
        this.render();
    }
        adjustPianoRange(key) {
            // Base the display around the selected key's octave, centered within a 1.5-octave window
            const keyMidiNote = this.getMidiNoteNumber(key, 4);
            const windowSemis = Math.round((this.options.octaves || 1.5) * 12); // typically 18
            const leftPad = Math.round((windowSemis - 12) / 2); // center the 12-semi highlighted octave
            // Start a few semitones below the key so the highlighted octave sits in the middle
            this.options.startMidi = keyMidiNote - leftPad; // usually key-3
            this.options.endMidi = this.options.startMidi + windowSemis; // usually start+18
            // Track the central highlighted octave bounds [low, high)
            this.state.centerLowMidi = keyMidiNote;           // inclusive
            this.state.centerHighMidi = keyMidiNote + 12;     // exclusive
            // Re-render the piano with the new range
            this.render();
        }

    /**
     * Render scale visualization
     */
    renderScale(config) {
        this.state.mode = 'scale';
        this.state.currentKey = config.key || 'C';
        this.state.currentScale = config.scale || 'major';
        this.state.scaleNotes = config.notes || [];

        // Adjust the piano range to start from the selected key
        this.adjustPianoRange(this.state.currentKey);

        // Update key labels based on key signature
        this.updateKeyLabels(this.state.currentKey);

        // Set active notes to scale notes
        this.state.activeNotes = config.notes || [];
        this.state.highlightedNotes = config.highlightedNotes || [];

        // Set note roles if provided
        if (config.roles) {
            this.state.noteRoles.clear();
            Object.entries(config.roles).forEach(([note, role]) => {
                this.state.noteRoles.set(note, role);
            });
        }

        this.applyState();
        // Update key pill if present
        try {
            const pill = this.pianoElement && this.pianoElement.parentElement && this.pianoElement.parentElement.querySelector('#piano-key-pill');
            if (pill) pill.textContent = this.state.currentKey;
        } catch(_){}
        this.renderAnnotations();
    }

    /**
     * Render chord visualization
     */
    renderChord(config) {
        this.state.mode = 'chord';
        this.state.activeNotes = config.notes || [];

        // Set note roles based on chord function
        this.state.noteRoles.clear();
        if (config.roles) {
            config.roles.forEach(role => {
                if (role.note && role.class) {
                    this.state.noteRoles.set(role.note, role.class);
                }
            });
        }

        this.applyState();
    }

    /**
     * Set active notes
     */
    setActiveNotes(notes) {
        this.state.activeNotes = notes || [];
        this.applyState();
    }

    /**
     * Set highlighted notes
     */
    setHighlightedNotes(notes) {
        this.state.highlightedNotes = notes || [];
        this.applyState();
    }

    /**
     * Play a sequence of note names by visually stepping through them.
     * No audio output; purely visual highlight in the center octave.
     * opts: { bpm?: number, rhythm?: 'even', stepMs?: number, gapMs?: number, onStep?: (note, idx)=>void }
     */
    playNoteSequence(notes = [], opts = {}) {
        // Cancel any in-flight sequence
        this.stopNoteSequence();
        const seq = Array.isArray(notes) ? notes.filter(Boolean) : [];
        if (seq.length === 0) return;

        // Timing
        const bpm = typeof opts.bpm === 'number' && opts.bpm > 0 ? opts.bpm : 96;
        const beatMs = 60000 / bpm;
        const stepMs = typeof opts.stepMs === 'number' ? opts.stepMs : beatMs; // 1 beat per note by default
        const gapMs = typeof opts.gapMs === 'number' ? opts.gapMs : Math.max(40, Math.floor(stepMs * 0.15));

        // Step executor
        let idx = 0;
        const doStep = () => {
            if (idx >= seq.length) { this._melodyCancel = null; return; }
            const n = seq[idx];
            try { this.setActiveNotes([n]); } catch (_) {}
            if (opts.onStep) { try { opts.onStep(n, idx); } catch(_){} }
            const clearT = setTimeout(() => {
                try { this.setActiveNotes([]); } catch(_){}
            }, Math.max(0, stepMs - gapMs));
            this._melodyTimers.push(clearT);
            idx++;
            const nextT = setTimeout(doStep, stepMs);
            this._melodyTimers.push(nextT);
        };
        // Start and provide cancel handle
        doStep();
        this._melodyCancel = () => this.stopNoteSequence();
    }

    /** Stop any ongoing note sequence playback */
    stopNoteSequence() {
        try { this.setActiveNotes([]); } catch(_){}
        if (Array.isArray(this._melodyTimers)) {
            this._melodyTimers.forEach(t => { try { clearTimeout(t); } catch(_){} });
        }
        this._melodyTimers = [];
        this._melodyCancel = null;
    }

    /**
     * Apply current state to visual elements
     */
    applyState() {
        // Reset all keys
        this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
            key.classList.remove('active', 'highlighted', 'root', 'third', 'fifth', 'seventh', 'ninth', 'eleventh', 'extension');
            // Reset styling
            if (key.classList.contains('piano-white-key')) {
                key.style.background = 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)';
                key.style.borderColor = '#cbd5e1';
                key.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            } else if (key.classList.contains('piano-black-key')) {
                key.style.background = 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)';
                key.style.borderColor = '#0f172a';
                key.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
            }
        });
        
        // Remove existing annotations
        this.renderAnnotations();

        // Helper function to check if a key matches a note (enharmonic aware)
        const keyMatchesNote = (key, note) => {
            const keyNote = key.dataset.correctNote || key.dataset.note;
            const keyOriginalNote = key.dataset.note;
            
            // Direct match
            if (keyNote === note || keyOriginalNote === note) return true;
            
            // Check enharmonic equivalents
            const equivalents = {
                'C#': 'Db', 'Db': 'C#',
                'D#': 'Eb', 'Eb': 'D#',
                'F#': 'Gb', 'Gb': 'F#',
                'G#': 'Ab', 'Ab': 'G#',
                'A#': 'Bb', 'Bb': 'A#'
            };
            
            return equivalents[keyNote] === note || equivalents[keyOriginalNote] === note ||
                   equivalents[note] === keyNote || equivalents[note] === keyOriginalNote;
        };

        // Check if a note is in the current scale
        const isNoteInScale = (note) => {
            return this.state.scaleNotes.some(scaleNote => {
                if (scaleNote === note) return true;
                const equiv = this.getEnharmonicEquivalent(scaleNote);
                return equiv === note;
            });
        };

        // Center octave bounds check
        const lowMidi = typeof this.state.centerLowMidi === 'number' ? this.state.centerLowMidi : this.options.startMidi;
        const highMidi = typeof this.state.centerHighMidi === 'number' ? this.state.centerHighMidi : (lowMidi + 12);
        const isInCenter = (key) => {
            const m = parseInt(key.dataset.midi, 10);
            return m >= lowMidi && m < highMidi;
        };

        // Apply active state (with higher-contrast styling) but only for scale notes within center octave
        this.state.activeNotes.forEach(note => {
            if (!isNoteInScale(note)) return;
            this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
                if (isInCenter(key) && keyMatchesNote(key, note)) {
                    key.classList.add('active');
                    if (key.classList.contains('piano-white-key')) {
                        key.style.background = 'linear-gradient(180deg, #fde047 0%, #f59e0b 100%)';
                        key.style.borderColor = '#b45309';
                        key.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.5), 0 6px 10px rgba(0, 0, 0, 0.35)';
                    } else if (key.classList.contains('piano-black-key')) {
                        key.style.background = 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)';
                        key.style.borderColor = '#15803d';
                        key.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.5), 0 6px 10px rgba(0, 0, 0, 0.35)';
                    }
                }
            });
        });

        // Apply highlighted state (subtle but clear) only for scale notes within center octave
        this.state.highlightedNotes.forEach(note => {
            if (!isNoteInScale(note)) return;
            this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
                if (isInCenter(key) && keyMatchesNote(key, note)) {
                    key.classList.add('highlighted');
                    if (key.classList.contains('piano-white-key')) {
                        key.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
                    } else if (key.classList.contains('piano-black-key')) {
                        key.style.boxShadow = '0 0 0 2px rgba(147, 197, 253, 0.5)';
                    }
                }
            });
        });

        // Apply role-based styling only for scale notes within center octave
        this.state.noteRoles.forEach((role, note) => {
            if (!isNoteInScale(note)) return;
            this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
                if (isInCenter(key) && keyMatchesNote(key, note)) {
                    key.classList.add(role);
                }
            });
        });
    }

    /**
     * Get piano DOM element
     */
    getElement() {
        return this.pianoElement;
    }

    // Hand diagram functionality removed as requested

    /**
     * Mount to container
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (container && this.pianoElement) {
            container.appendChild(this.pianoElement);
            // Render again now that we can measure container
            this.render();
            // Re-render on resize to maintain fit
            this._resizeHandler = () => this.render();
            window.addEventListener('resize', this._resizeHandler);
        }
        
        // Create a compact toolbar container below the piano
        const toolbar = document.createElement('div');
        toolbar.style.marginTop = '10px';
        toolbar.style.marginBottom = '10px';
        toolbar.style.display = 'flex';
        toolbar.style.flexDirection = 'column';
        toolbar.style.gap = '8px';
        toolbar.style.alignItems = 'center';
        container.appendChild(toolbar);

        // Row: key transpose and progression
        const keyRow = document.createElement('div');
        keyRow.style.display = 'flex';
        keyRow.style.alignItems = 'center';
        keyRow.style.justifyContent = 'center';
        keyRow.style.gap = '8px';
        keyRow.style.flexWrap = 'wrap';

        const mkBtn = (id, label, title) => {
            const b = document.createElement('button');
            b.id = id; b.className = 'btn'; b.textContent = label; b.title = title || '';
            b.style.padding = '4px 8px'; b.style.fontSize = '12px';
            return b;
        };
    const minus = mkBtn('piano-transpose-down', '−', 'Transpose key down');
        const pill = document.createElement('span');
        pill.id = 'piano-key-pill'; pill.textContent = this.state.currentKey;
        pill.style.background = '#334155'; pill.style.color = '#f1f5f9'; pill.style.padding = '3px 10px'; pill.style.borderRadius = '999px'; pill.style.fontSize = '12px'; pill.style.fontWeight = '600'; pill.style.border = '1px solid rgba(148,163,184,0.3)';
        const plus = mkBtn('piano-transpose-up', '+', 'Transpose key up');

    keyRow.appendChild(minus); keyRow.appendChild(pill); keyRow.appendChild(plus);
        toolbar.appendChild(keyRow);

        // Wire handlers
        const doTranspose = (semitones) => {
            try {
                if (window.modularApp && window.modularApp.scaleCircleExplorer && typeof window.modularApp.scaleCircleExplorer.transpose === 'function') {
                    window.modularApp.scaleCircleExplorer.transpose(semitones);
                    return;
                }
                if (window.modularApp && window.modularApp.scaleLibrary && window.modularApp.musicTheory) {
                    const keys = window.modularApp.musicTheory.getKeys();
                    const cur = window.modularApp.scaleLibrary.getCurrentKey();
                    const idx = keys.indexOf(cur);
                    if (idx !== -1) {
                        const next = keys[(idx + semitones + keys.length) % keys.length];
                        window.modularApp.scaleLibrary.setKey(next);
                    }
                }
            } catch(e) { console.error(e); }
        };
        minus.addEventListener('click', () => doTranspose(-1));
        plus.addEventListener('click', () => doTranspose(1));

        // Progression button intentionally removed per request

        // Fingering controls row
        const controlsDiv = document.createElement('div');
        controlsDiv.style.marginTop = '10px';
        controlsDiv.style.marginBottom = '10px';
        controlsDiv.style.display = 'flex';
        controlsDiv.style.justifyContent = 'center';
        controlsDiv.style.gap = '8px';
        controlsDiv.style.flexWrap = 'wrap';
        
        // Create fingering toggle controls
        const createToggleButton = (label, isActive, clickHandler) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn ${isActive ? 'btn-primary' : ''}`;
            btn.style.padding = '4px 8px';
            btn.style.fontSize = '12px';
            btn.textContent = label;
            btn.addEventListener('click', clickHandler);
            return btn;
        };
        
        // Add toggle buttons
        const bothBtn = createToggleButton('Both Hands', 
            this.options.showLeftHandFingering && this.options.showRightHandFingering,
            () => {
                this.toggleLeftHandFingering(true);
                this.toggleRightHandFingering(true);
                updateButtonStyles();
            }
        );
        
        const rightBtn = createToggleButton('Right Hand Only', 
            this.options.showRightHandFingering && !this.options.showLeftHandFingering,
            () => {
                this.toggleRightHandFingering(true);
                this.toggleLeftHandFingering(false);
                updateButtonStyles();
            }
        );
        
        const leftBtn = createToggleButton('Left Hand Only', 
            this.options.showLeftHandFingering && !this.options.showRightHandFingering,
            () => {
                this.toggleLeftHandFingering(true);
                this.toggleRightHandFingering(false);
                updateButtonStyles();
            }
        );
        
        const noneBtn = createToggleButton('No Fingerings', 
            !this.options.showLeftHandFingering && !this.options.showRightHandFingering,
            () => {
                this.toggleLeftHandFingering(false);
                this.toggleRightHandFingering(false);
                updateButtonStyles();
            }
        );
        
        // Function to update button styles based on current state
        const updateButtonStyles = () => {
            bothBtn.className = `btn ${this.options.showLeftHandFingering && this.options.showRightHandFingering ? 'btn-primary' : ''}`;
            rightBtn.className = `btn ${this.options.showRightHandFingering && !this.options.showLeftHandFingering ? 'btn-primary' : ''}`;
            leftBtn.className = `btn ${this.options.showLeftHandFingering && !this.options.showRightHandFingering ? 'btn-primary' : ''}`;
            noneBtn.className = `btn ${!this.options.showLeftHandFingering && !this.options.showRightHandFingering ? 'btn-primary' : ''}`;
        };
        
        // Add buttons to controls
        controlsDiv.appendChild(bothBtn);
        controlsDiv.appendChild(rightBtn);
        controlsDiv.appendChild(leftBtn);
        controlsDiv.appendChild(noneBtn);
    toolbar.appendChild(controlsDiv);
        
        // Hand diagrams removed as requested
    }

    /**
     * Unmount from container
     */
    unmount() {
        if (this.pianoElement && this.pianoElement.parentNode) {
            this.pianoElement.parentNode.removeChild(this.pianoElement);
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }
    }

    /**
     * Resize piano
     */
    resize(options) {
        this.options = { ...this.options, ...options };
        this.render();
    }

    /**
     * Toggle fingering display
     */
    toggleFingering(show) {
        this.options.showFingering = show;
        this.options.showLeftHandFingering = show;
        this.options.showRightHandFingering = show;
        this.renderAnnotations();
    }
    
    /**
     * Toggle left hand fingering display
     */
    toggleLeftHandFingering(show) {
        this.options.showLeftHandFingering = show;
        this.options.showFingering = this.options.showLeftHandFingering || this.options.showRightHandFingering;
        this.renderAnnotations();
    }
    
    /**
     * Toggle right hand fingering display
     */
    toggleRightHandFingering(show) {
        this.options.showRightHandFingering = show;
        this.options.showFingering = this.options.showLeftHandFingering || this.options.showRightHandFingering;
        this.renderAnnotations();
    }

    /**
     * Toggle roman numerals display
     */
    toggleRomanNumerals(show) {
        this.options.showRomanNumerals = show;
        this.renderAnnotations();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PianoVisualizer;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.PianoVisualizer = PianoVisualizer;
}
