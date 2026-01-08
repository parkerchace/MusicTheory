/**
 * @module PianoVisualizer
 * @description Interactive piano keyboard with scale degree and chord visualization
 * @exports class PianoVisualizer
 * @feature Accurate piano keyboard rendering (2 octaves)
 * @feature Scale degree highlighting with colors
 * @feature Colored scale degree number bubbles
 * @feature Standard piano fingering display
 * @feature Hand diagrams with numbered fingers
 * @feature Note role visualization (root, third, fifth, seventh)
 * @feature Interactive note clicking
 * @feature Multiple visualization modes
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
            // Enhanced grading options
            enableGradingIntegration: options.enableGradingIntegration !== false, // Enable grading integration by default
            showGradingTooltips: options.showGradingTooltips !== false, // Show grading tooltips by default
            gradingEngine: options.gradingEngine || null, // Music theory engine for grading
            ...options
        };

        this.state = {
            activeNotes: [],
            activeMidiNotes: null, // parallel array of midi numbers for voicing (optional)
            highlightedNotes: [],
            noteRoles: new Map(), // note -> role mapping
            noteDegrees: new Map(), // note -> scale degree mapping
            mode: 'scale', // scale, chord, degrees
            currentKey: 'C',
            currentScale: 'major',
            scaleNotes: [], // Array of scale notes in order
            // Enhanced grading state
            noteGradings: new Map(), // note -> grading tier mapping
            gradingMode: 'functional', // current grading mode
            lastClickedNote: null, // track last clicked note for related highlighting
            gradingTooltips: new Map() // note -> tooltip element mapping
        };

        this.listeners = new Map();
        this.pianoElement = null;
        this.keysInner = null; // inner scrollable content
    this._melodyTimers = [];
    this._melodyCancel = null;
        // Container for vertically stacked chord note display (traditional chord stack)
        this.chordStackElement = null;

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
        this.initializeGradingIntegration();
    }

    /**
     * Initialize grading integration
     */
    initializeGradingIntegration() {
        if (!this.options.enableGradingIntegration) return;
        
        // Use provided grading engine or try to get global one
        if (this.options.gradingEngine) {
            this.gradingEngine = this.options.gradingEngine;
        } else if (typeof window !== 'undefined' && window.MusicTheoryEngine) {
            this.gradingEngine = new window.MusicTheoryEngine();
        } else if (typeof MusicTheoryEngine !== 'undefined') {
            this.gradingEngine = new MusicTheoryEngine();
        }
        
        if (this.gradingEngine) {
            // Subscribe to grading mode changes
            if (typeof this.gradingEngine.subscribe === 'function') {
                this.gradingEngine.subscribe((event, data) => {
                    if (event === 'gradingModeChanged') {
                        this.onGradingModeChanged(data);
                    }
                });
            }
            
            // Set initial grading mode
            this.state.gradingMode = this.gradingEngine.gradingMode || 'functional';
        }
    }

    /**
     * Event system
     */
    on(event, callback) {
        console.log('[PianoVisualizer.on] Called with event:', event, 'callback:', typeof callback);
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
            console.log('[PianoVisualizer.on] Created new Set for event:', event);
        }
        this.listeners.get(event).add(callback);
        console.log('[PianoVisualizer.on] Listener added. Total listeners for', event, ':', this.listeners.get(event).size);
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
        this.pianoElement.style.overflowX = 'visible';
        this.pianoElement.style.overflowY = 'visible';
        this.pianoElement.style.width = '100%';
        this.pianoElement.style.minWidth = 'max-content';
        this.pianoElement.style.display = 'block';
        this.pianoElement.style.flexDirection = 'column';
        this.pianoElement.style.alignItems = 'flex-start';
        this.pianoElement.style.margin = '0';
        this.pianoElement.style.padding = '0';

        // Inner container that actually has the full keyboard width
        this.keysInner = document.createElement('div');
        this.keysInner.className = 'piano-keys-inner';
        this.keysInner.style.position = 'relative';
        this.keysInner.style.height = 'auto';
        this.keysInner.style.display = 'flex';
        this.keysInner.style.minWidth = 'max-content';
        this.keysInner.style.margin = '0';
        this.keysInner.style.padding = '0';
        // Reserve space above the keys for degree bubbles so they are fully visible
        this.keysInner.style.paddingTop = '28px';

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

        // Auto-mount if container provided
        if (this.options.container) {
            console.log('[PianoVisualizer] Container option provided:', this.options.container);
            const container = typeof this.options.container === 'string' 
                ? document.querySelector(this.options.container) 
                : this.options.container;
            
            console.log('[PianoVisualizer] Resolved container:', container);
            
            if (container) {
                console.log('[PianoVisualizer] Appending piano element to container');
                container.appendChild(this.pianoElement);
                console.log('[PianoVisualizer] Piano element appended, children count:', container.children.length);
                // Trigger a render after DOM attachment to ensure proper measurement
                requestAnimationFrame(() => {
                    console.log('[PianoVisualizer] Triggering render after DOM attachment');
                    this.render();
                });
            } else {
                console.error('[PianoVisualizer] Container element not found!');
            }
        } else {
            console.log('[PianoVisualizer] No container option provided, will need manual mount');
        }

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

        // Set container sizes with reserved top padding for degree bubbles
        const topPadding = 28; // should match keysInner.paddingTop
        const totalHeight = this.options.whiteKeyHeight + topPadding; // reserve space for annotations
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
        
        // Emit rendered event for connectors
        requestAnimationFrame(() => {
            this.emit('rendered', { startMidi, endMidi });
        });
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
            key.style.top = '0px';
            key.style.position = 'absolute';
            key.style.background = 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)';
            key.style.border = '1px solid var(--border-light)';
            key.style.borderRadius = '0';
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
            labelContainer.style.color = 'var(--text-muted)';
            labelContainer.style.fontWeight = '500';
            labelContainer.style.pointerEvents = 'none';

            // High contrast: bold black text with white shadow
            labelContainer.style.color = '#000000';
            labelContainer.style.textShadow = '0 1px 3px rgba(255, 255, 255, 0.8)';
            labelContainer.style.fontSize = '11px';
            labelContainer.style.fontWeight = '700';
            labelContainer.style.pointerEvents = 'none';

            // MIDI/note metadata
                        // High contrast: bold bright text with dark shadow for black keys
                        labelContainer.style.color = '#ffffff';
                        labelContainer.style.textShadow = '0 1px 3px rgba(0, 0, 0, 0.9)';
                        labelContainer.style.fontSize = '10px';
                        labelContainer.style.fontWeight = '700';

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
                if (key.classList.contains('active')) {
                    // Brighter version of active yellow/orange
                    key.style.background = 'linear-gradient(180deg, #fef08a 0%, #fbbf24 100%)';
                    key.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.7), 0 8px 12px rgba(0, 0, 0, 0.4)';
                } else if (key.classList.contains('highlighted')) {
                    // Brighter version of highlighted golden
                    key.style.background = 'linear-gradient(180deg, #fef9c3 0%, #fef08a 100%)';
                    key.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.7), 0 6px 10px rgba(245, 158, 11, 0.35)';
                } else {
                    // Subtle cyan hover for non-highlighted keys
                    key.style.background = 'linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 100%)';
                    key.style.boxShadow = '0 0 0 2px rgba(0, 243, 255, 0.3), 0 4px 8px rgba(0, 0, 0, 0.15)';
                }
                key.style.transform = 'translateY(-2px)';
            });
            key.addEventListener('mouseleave', () => {
                key.style.transform = 'translateY(0)';
                // Trigger re-apply of current state
                this.applyState();
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
            key.style.top = '0px';
            key.style.position = 'absolute';
            key.style.background = 'linear-gradient(180deg, #1a1a1a 0%, #000000 100%)';
            key.style.border = '1px solid var(--border-light)';
            key.style.borderRadius = '0';
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
            labelContainer.style.color = 'var(--text-muted)';
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
                if (key.classList.contains('active')) {
                    // Brighter version of active (keep green for active black keys)
                    key.style.background = 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)';
                    key.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.7), 0 8px 12px rgba(0, 0, 0, 0.4)';
                } else if (key.classList.contains('highlighted')) {
                    // Brighter version of highlighted golden for black keys
                    key.style.background = 'linear-gradient(180deg, #fcd34d 0%, #fbbf24 100%)';
                    key.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.7), 0 6px 10px rgba(245, 158, 11, 0.35)';
                } else {
                    // Subtle lighter hover for non-highlighted black keys
                    key.style.background = 'linear-gradient(180deg, #334155 0%, #1e293b 100%)';
                    key.style.boxShadow = '0 0 0 2px rgba(0, 243, 255, 0.3), 0 6px 8px rgba(0, 0, 0, 0.4)';
                }
                key.style.transform = 'translateY(-1px)';
            });
            key.addEventListener('mouseleave', () => {
                key.style.transform = 'translateY(0)';
                // Trigger re-apply of current state
                this.applyState();
            });

            this.blacksLayer.appendChild(key);
        }
    }

    /**
     * Handle note click
     */
    handleNoteClick(noteName, midiNote) {
        console.log('[PianoVisualizer] handleNoteClick called for piano ID:', this._debugId, { noteName, midiNote });
        
        // Enhanced grading integration: update last clicked note and apply grading feedback
        if (this.options.enableGradingIntegration && this.gradingEngine) {
            this.state.lastClickedNote = noteName;
            this.applyInteractiveGradingFeedback(noteName);
        }
        
        console.log('[PianoVisualizer] Emitting noteClicked event for piano', this._debugId, ', listeners:', this.listeners.get('noteClicked'), ', has key?', this.listeners.has('noteClicked'));
        this.emit('noteClicked', {
            note: noteName,
            midi: midiNote,
            enharmonic: this.getEnharmonicEquivalent(noteName),
            gradingInfo: this.getGradingInfoForNote(noteName)
        });
    }

    /**
     * Handle grading mode changes
     */
    onGradingModeChanged(newMode) {
        const oldMode = this.state.gradingMode;
        this.state.gradingMode = newMode;
        
        // Recalculate all note gradings
        this.updateNoteGradings();
        
        // Re-apply visual state
        this.applyState();
        
        // Emit grading mode change event
        this.emit('gradingModeChanged', {
            oldMode: oldMode,
            newMode: newMode
        });
    }

    /**
     * Apply interactive grading feedback for a clicked note
     */
    applyInteractiveGradingFeedback(clickedNote) {
        if (!this.gradingEngine) return;
        
        // Set the last clicked note
        this.state.lastClickedNote = clickedNote;
        
        // Get grading information for clicked note
        const clickedGrading = this.getGradingInfoForNote(clickedNote);
        
        // Clear previous highlighting
        this.state.highlightedNotes = [];
        
        // Find related notes with same or similar grading tiers
        const relatedNotes = [];
        this.state.scaleNotes.forEach(note => {
            const noteGrading = this.getGradingInfoForNote(note);
            
            // Highlight notes with same tier
            if (noteGrading && noteGrading.tier === clickedGrading.tier) {
                relatedNotes.push(note);
            }
            // Also highlight notes with adjacent tiers (±1)
            else if (noteGrading && Math.abs(noteGrading.tier - clickedGrading.tier) === 1) {
                relatedNotes.push(note);
            }
        });
        
        this.state.highlightedNotes = relatedNotes;
        
        // Update visual state
        this.applyState();
        
        // Show grading tooltip if enabled
        if (this.options.showGradingTooltips) {
            this.showGradingTooltip(clickedNote, clickedGrading);
        }
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
                    if (fingeringRH && this.options.showRightHandFingering) parts.push(`<div style="color: #fca5a5; font-size: ${fontSize};">R:${fingeringRH}</div>`);
                    if (fingeringLH && this.options.showLeftHandFingering) parts.push(`<div style="color: #93c5fd; font-size: ${fontSize}; margin-top: 1px;">L:${fingeringLH}</div>`);
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
     * Update note gradings based on current context
     */
    updateNoteGradings() {
        if (!this.gradingEngine || !this.state.scaleNotes.length) return;
        
        this.state.noteGradings.clear();
        
        // Calculate grading for each note in the current scale
        this.state.scaleNotes.forEach(note => {
            const tier = this.gradingEngine.calculateElementGrade(note, {
                elementType: 'note',
                key: this.state.currentKey,
                scaleType: this.state.currentScale
            });
            
            const gradingInfo = this.gradingEngine.getGradingTierInfo(tier);
            this.state.noteGradings.set(note, {
                tier: tier,
                info: gradingInfo,
                explanation: this.gradingEngine.getGradingExplanation(note, tier, {
                    elementType: 'note',
                    key: this.state.currentKey,
                    scaleType: this.state.currentScale
                })
            });
        });
    }

    /**
     * Get grading information for a specific note
     */
    getGradingInfoForNote(note) {
        if (!this.gradingEngine) return null;
        
        // Check if we have cached grading info
        if (this.state.noteGradings.has(note)) {
            return this.state.noteGradings.get(note);
        }
        
        // Calculate grading on demand
        const tier = this.gradingEngine.calculateElementGrade(note, {
            elementType: 'note',
            key: this.state.currentKey,
            scaleType: this.state.currentScale
        });
        
        const gradingInfo = this.gradingEngine.getGradingTierInfo(tier);
        const explanation = this.gradingEngine.getGradingExplanation(note, tier, {
            elementType: 'note',
            key: this.state.currentKey,
            scaleType: this.state.currentScale
        });
        
        const result = {
            tier: tier,
            info: gradingInfo,
            explanation: explanation
        };
        
        this.state.noteGradings.set(note, result);
        return result;
    }

    /**
     * Show grading tooltip for a note
     */
    showGradingTooltip(note, gradingInfo) {
        if (!gradingInfo || !this.pianoElement) return;
        
        // Remove existing tooltips
        this.hideAllGradingTooltips();
        
        // Find the key element for this note
        const keyElement = this.findKeyElementForNote(note);
        if (!keyElement) return;
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'piano-grading-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '12px';
        tooltip.style.lineHeight = '1.4';
        tooltip.style.maxWidth = '250px';
        tooltip.style.zIndex = '1000';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        tooltip.style.border = `2px solid ${gradingInfo.info.color}`;
        
        // Position tooltip above the key
        const keyRect = keyElement.getBoundingClientRect();
        const containerRect = this.pianoElement.getBoundingClientRect();
        tooltip.style.left = `${keyRect.left - containerRect.left + (keyRect.width / 2)}px`;
        tooltip.style.top = `${keyRect.top - containerRect.top - 10}px`;
        tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
        
        // Create tooltip content
        const content = `
            <div style="font-weight: bold; margin-bottom: 4px; color: ${gradingInfo.info.color};">
                ${gradingInfo.info.label} (Tier ${gradingInfo.tier})
            </div>
            <div style="margin-bottom: 4px;">
                ${gradingInfo.info.educationalContext || 'No educational context available'}
            </div>
            <div style="font-size: 11px; opacity: 0.8;">
                ${gradingInfo.explanation || 'No explanation available'}
            </div>
        `;
        
        tooltip.innerHTML = content;
        
        // Add tooltip to piano element
        this.pianoElement.appendChild(tooltip);
        this.state.gradingTooltips.set(note, tooltip);
        
        // Auto-hide tooltip after 5 seconds
        setTimeout(() => {
            this.hideGradingTooltip(note);
        }, 5000);
    }

    /**
     * Hide grading tooltip for a specific note
     */
    hideGradingTooltip(note) {
        const tooltip = this.state.gradingTooltips.get(note);
        if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
        this.state.gradingTooltips.delete(note);
    }

    /**
     * Hide all grading tooltips
     */
    hideAllGradingTooltips() {
        this.state.gradingTooltips.forEach((tooltip, note) => {
            if (tooltip && tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
        this.state.gradingTooltips.clear();
    }

    /**
     * Find the DOM element for a specific note
     */
    findKeyElementForNote(note) {
        if (!this.pianoElement) return null;
        
        const keys = this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key');
        for (let key of keys) {
            const keyNote = key.dataset.correctNote || key.dataset.note;
            if (keyNote === note || this.getEnharmonicEquivalent(keyNote) === note) {
                return key;
            }
        }
        return null;
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

        // Enhanced grading integration: update note gradings
        if (this.options.enableGradingIntegration) {
            this.updateNoteGradings();
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
        // Accept optional midiNotes for spread voicing visualization
        if (Array.isArray(config.midiNotes) && config.midiNotes.length === this.state.activeNotes.length) {
            this.state.activeMidiNotes = config.midiNotes.slice();
        } else {
            this.state.activeMidiNotes = null;
        }

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
        this.renderChordStack();
    }

    /**
     * Render a vertical stack of the current chord's notes (lowest at bottom) centered above the keyboard.
     * Traditional simultaneous chord visualization separated from per-key highlighting.
     */
    renderChordStack() {
        // Remove previous stack
        if (this.chordStackElement && this.chordStackElement.parentNode) {
            this.chordStackElement.parentNode.removeChild(this.chordStackElement);
        }
        this.chordStackElement = null;
        if (this.state.mode !== 'chord') return;
        const notes = Array.isArray(this.state.activeNotes) ? this.state.activeNotes.filter(Boolean) : [];
        if (!notes.length || !this.pianoElement) return;

        // If explicit midi notes provided (spread voicing aware) use them; else attempt to map within range
        let expanded = [];
        if (Array.isArray(this.state.activeMidiNotes)) {
            expanded = notes.map((n,i) => ({ note: n, midi: this.state.activeMidiNotes[i] }));
        } else {
            const startMidi = this.options.startMidi;
            const endMidi = typeof this.options.endMidi === 'number' ? this.options.endMidi : (startMidi + (this.options.octaves * 12));
            notes.forEach(n => {
                for (let octave = 0; octave < 10; octave++) {
                    const midi = this.getMidiNoteNumber(n, octave);
                    if (midi >= startMidi && midi <= endMidi) { expanded.push({ note:n, midi }); break; }
                }
            });
            if (!expanded.length) expanded = notes.map((n,i)=>({ note:n, midi:i }));
        }
        // Deduplicate by note string
        const seen = new Set();
        const uniq = expanded.filter(o => { if (seen.has(o.note)) return false; seen.add(o.note); return true; });
        uniq.sort((a,b)=>a.midi - b.midi);

        // Create stack container
        const stack = document.createElement('div');
        stack.className = 'piano-chord-stack';
        stack.style.position = 'absolute';
        stack.style.left = '50%';
        stack.style.top = '0';
        stack.style.transform = 'translateX(-50%)';
        stack.style.display = 'flex';
        stack.style.flexDirection = 'column-reverse'; // lowest at bottom
        stack.style.alignItems = 'center';
        stack.style.padding = '6px 8px 8px';
        stack.style.gap = '4px';
        stack.style.borderRadius = '8px';
        stack.style.background = 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)';
        stack.style.border = '2px solid rgba(255,255,255,0.07)';
        stack.style.boxShadow = '0 6px 14px -4px rgba(0,0,0,0.4),0 2px 4px rgba(0,0,0,0.3)';
        stack.style.pointerEvents = 'none';
        stack.style.zIndex = '500';

        // Title
        const title = document.createElement('div');
        title.textContent = 'Chord';
        title.style.fontSize = '10px';
        title.style.fontWeight = '700';
        title.style.letterSpacing = '0.5px';
        title.style.color = '#94a3b8';
        title.style.marginBottom = '2px';
        title.style.textTransform = 'uppercase';
        stack.appendChild(title);

        // Helper for role color
        const roleColor = (role) => {
            switch(role) {
                case 'root': return '#f59e0b';
                case 'third': return '#10b981';
                case 'fifth': return '#3b82f6';
                case 'seventh': return '#ec4899';
                case 'ninth': return '#6366f1';
                case 'eleventh': return '#0ea5e9';
                case 'extension': return '#8b5cf6';
                default: return '#64748b';
            }
        };

        const lowMidi = typeof this.state.centerLowMidi === 'number' ? this.state.centerLowMidi : this.options.startMidi;
        const highMidi = typeof this.state.centerHighMidi === 'number' ? this.state.centerHighMidi : (lowMidi + 12);
        uniq.forEach(obj => {
            const role = this.state.noteRoles.get(obj.note) || '';
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '2px';
            // Ledger lines (simple heuristic): for notes below lowMidi or above highMidi
            const makeLedgerLine = () => {
                const line = document.createElement('div');
                line.style.width = '38px';
                line.style.height = '2px';
                line.style.background = 'rgba(255,255,255,0.4)';
                line.style.borderRadius = '2px';
                return line;
            };
            const midi = obj.midi;
            const ledgerCount = (delta) => {
                // 1 line for <= 5 semis outside, 2 for <=12, 3 for <=19, 4 max
                const d = Math.abs(delta);
                if (d <= 5) return 1;
                if (d <= 12) return 2;
                if (d <= 19) return 3;
                return 4;
            };
            if (midi < lowMidi) {
                const delta = midi - lowMidi;
                const count = ledgerCount(delta);
                for (let i=0;i<count;i++) wrapper.appendChild(makeLedgerLine());
            }
            const pill = document.createElement('div');
            pill.className = 'chord-stack-note';
            pill.textContent = obj.note + (role ? ` (${role[0].toUpperCase()})` : '');
            pill.style.fontSize = '12px';
            pill.style.fontWeight = '600';
            pill.style.padding = '4px 10px';
            pill.style.borderRadius = '16px';
            pill.style.background = roleColor(role);
            pill.style.color = '#fff';
            pill.style.boxShadow = '0 2px 4px rgba(0,0,0,0.35)';
            pill.style.minWidth = '64px';
            pill.style.textAlign = 'center';
            wrapper.appendChild(pill);
            if (midi >= highMidi) {
                const delta = midi - highMidi;
                const count = ledgerCount(delta);
                for (let i=0;i<count;i++) wrapper.appendChild(makeLedgerLine());
            }
            stack.appendChild(wrapper);
        });

        this.pianoElement.appendChild(stack);
        this.chordStackElement = stack;
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

        // Apply active state (with grading-aware styling) but only for scale notes within center octave
        this.state.activeNotes.forEach(note => {
            if (this.state.mode !== 'chord' && !isNoteInScale(note)) return;
            this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
                if (isInCenter(key) && keyMatchesNote(key, note)) {
                    key.classList.add('active');
                    
                    // Enhanced grading integration: use grading colors if available
                    let backgroundColor, borderColor, boxShadow;
                    if (this.options.enableGradingIntegration) {
                        const gradingInfo = this.getGradingInfoForNote(note);
                        if (gradingInfo && gradingInfo.info) {
                            const gradingColor = gradingInfo.info.color;
                            const isBlackKey = key.classList.contains('piano-black-key');
                            
                            if (isBlackKey) {
                                backgroundColor = `linear-gradient(180deg, ${gradingColor} 0%, ${this.darkenColor(gradingColor, 0.2)} 100%)`;
                                borderColor = this.darkenColor(gradingColor, 0.4);
                                boxShadow = `0 0 0 3px ${gradingColor}80, 0 6px 10px rgba(0, 0, 0, 0.35)`;
                            } else {
                                backgroundColor = `linear-gradient(180deg, ${this.lightenColor(gradingColor, 0.3)} 0%, ${gradingColor} 100%)`;
                                borderColor = this.darkenColor(gradingColor, 0.2);
                                boxShadow = `0 0 0 3px ${gradingColor}80, 0 6px 10px rgba(0, 0, 0, 0.35)`;
                            }
                        }
                    }
                    
                    // Fallback to default colors if grading not available
                    if (!backgroundColor) {
                        if (key.classList.contains('piano-white-key')) {
                            backgroundColor = 'linear-gradient(180deg, #fde047 0%, #f59e0b 100%)';
                            borderColor = '#b45309';
                            boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.5), 0 6px 10px rgba(0, 0, 0, 0.35)';
                        } else if (key.classList.contains('piano-black-key')) {
                            backgroundColor = 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)';
                            borderColor = '#15803d';
                            boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.5), 0 6px 10px rgba(0, 0, 0, 0.35)';
                        }
                    }
                    
                    key.style.background = backgroundColor;
                    key.style.borderColor = borderColor;
                    key.style.boxShadow = boxShadow;
                }
            });
        });

        // Apply highlighted state (grading-aware styling) only for scale notes within center octave
        this.state.highlightedNotes.forEach(note => {
            const inScale = isNoteInScale(note);
            if (this.state.mode !== 'chord' && !inScale) return;
            
            this.pianoElement.querySelectorAll('.piano-white-key, .piano-black-key').forEach(key => {
                if (isInCenter(key) && keyMatchesNote(key, note)) {
                    key.classList.add('highlighted');
                    
                    // Enhanced grading integration: use grading colors for highlighting
                    let backgroundColor, borderColor, boxShadow;
                    if (this.options.enableGradingIntegration && inScale) {
                        const gradingInfo = this.getGradingInfoForNote(note);
                        if (gradingInfo && gradingInfo.info) {
                            const gradingColor = gradingInfo.info.color;
                            const isBlackKey = key.classList.contains('piano-black-key');
                            
                            if (isBlackKey) {
                                backgroundColor = `linear-gradient(180deg, ${this.lightenColor(gradingColor, 0.2)} 0%, ${gradingColor} 100%)`;
                                borderColor = this.darkenColor(gradingColor, 0.2);
                                boxShadow = `0 0 0 2px ${gradingColor}99, 0 4px 8px ${gradingColor}4D`;
                            } else {
                                backgroundColor = `linear-gradient(180deg, ${this.lightenColor(gradingColor, 0.4)} 0%, ${this.lightenColor(gradingColor, 0.1)} 100%)`;
                                borderColor = gradingColor;
                                boxShadow = `0 0 0 2px ${gradingColor}99, 0 4px 8px ${gradingColor}4D`;
                            }
                        }
                    }
                    
                    // Fallback to default highlighting colors
                    if (!backgroundColor) {
                        if (inScale) {
                            // Scale notes: enhance the golden color with a brighter glow
                            if (key.classList.contains('piano-white-key')) {
                                backgroundColor = 'linear-gradient(180deg, #fef3c7 0%, #fde047 100%)';
                                borderColor = '#f59e0b';
                                boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.6), 0 4px 8px rgba(245, 158, 11, 0.3)';
                            } else if (key.classList.contains('piano-black-key')) {
                                backgroundColor = 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)';
                                borderColor = '#d97706';
                                boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.6), 0 4px 8px rgba(245, 158, 11, 0.3)';
                            }
                        } else {
                            // Non-scale notes: use a subtle purple/magenta accent (complementary to golden)
                            if (key.classList.contains('piano-white-key')) {
                                backgroundColor = 'linear-gradient(180deg, #e9d5ff 0%, #d8b4fe 100%)';
                                borderColor = '#a855f7';
                                boxShadow = '0 0 0 2px rgba(168, 85, 247, 0.5), 0 4px 8px rgba(168, 85, 247, 0.25)';
                            } else if (key.classList.contains('piano-black-key')) {
                                backgroundColor = 'linear-gradient(180deg, #c084fc 0%, #a855f7 100%)';
                                borderColor = '#7e22ce';
                                boxShadow = '0 0 0 2px rgba(168, 85, 247, 0.5), 0 4px 8px rgba(168, 85, 247, 0.25)';
                            }
                        }
                    }
                    
                    key.style.background = backgroundColor;
                    key.style.borderColor = borderColor;
                    key.style.boxShadow = boxShadow;
                }
            });
        });

        // Apply role-based styling only for scale notes within center octave
        this.state.noteRoles.forEach((role, note) => {
            if (this.state.mode !== 'chord' && !isNoteInScale(note)) return;
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
        
        // Fingering controls moved above piano to sit left of keyboard
        const fingeringRow = document.createElement('div');
        fingeringRow.style.display = 'flex';
        fingeringRow.style.flexDirection = 'row';
        fingeringRow.style.alignItems = 'center';
        fingeringRow.style.justifyContent = 'flex-start';
        fingeringRow.style.gap = '12px';
        fingeringRow.style.flexWrap = 'wrap';
        fingeringRow.style.marginBottom = '2px';
        fingeringRow.style.padding = '3px 8px';
        fingeringRow.style.fontSize = '11px';
        fingeringRow.style.background = 'rgba(0, 0, 0, 0.4)';
        fingeringRow.style.border = '1px solid var(--border-light)';
        fingeringRow.style.borderRadius = '0';
        fingeringRow.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05)';
        
        // Create section for buttons (centered)
        const buttonSection = document.createElement('div');
        buttonSection.style.display = 'flex';
        buttonSection.style.alignItems = 'center';
        buttonSection.style.justifyContent = 'center';
        buttonSection.style.gap = '4px';
        buttonSection.style.flexWrap = 'wrap';
        buttonSection.style.marginLeft = 'auto'; // Push to right
        
        // Create fingering toggle controls
        const createToggleButton = (label, isActive, clickHandler) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn ${isActive ? 'btn-primary' : ''}`;
            btn.style.padding = '3px 8px';
            btn.style.fontSize = '10px';
            btn.style.fontWeight = '600';
            btn.style.letterSpacing = '0.3px';
            btn.style.transition = 'all 0.15s ease';
            btn.style.textTransform = 'uppercase';
            btn.textContent = label;
            btn.addEventListener('click', clickHandler);
            
            // Add hover effect
            btn.addEventListener('mouseenter', () => {
                if (!btn.classList.contains('btn-primary')) {
                    btn.style.transform = 'translateY(-1px)';
                    btn.style.boxShadow = '0 2px 8px rgba(0, 243, 255, 0.2)';
                }
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = 'none';
            });
            
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
        
        // Add buttons to button section
        buttonSection.appendChild(bothBtn);
        buttonSection.appendChild(rightBtn);
        buttonSection.appendChild(leftBtn);
        buttonSection.appendChild(noneBtn);
        
        // Ultra-compact scale info display - minimal footprint
        const scaleInfoContainer = document.createElement('div');
        scaleInfoContainer.style.display = 'flex';
        scaleInfoContainer.style.alignItems = 'center';
        scaleInfoContainer.style.gap = '2px';
        scaleInfoContainer.style.fontSize = '0.55rem';
        scaleInfoContainer.style.padding = '1px 3px';
        scaleInfoContainer.style.background = 'rgba(0, 243, 255, 0.03)';
        scaleInfoContainer.style.border = '1px solid rgba(0, 243, 255, 0.1)';
        scaleInfoContainer.style.fontFamily = 'var(--font-tech)';
        scaleInfoContainer.style.color = 'var(--text-muted)';
        scaleInfoContainer.style.height = '18px';
        
        // Compact info display (always visible) - just icon and short text
        const compactInfo = document.createElement('span');
        compactInfo.id = 'piano-scale-info-compact';
        compactInfo.style.fontSize = '0.55rem';
        compactInfo.style.whiteSpace = 'nowrap';
        compactInfo.style.maxWidth = '60px';
        compactInfo.style.overflow = 'hidden';
        compactInfo.style.textOverflow = 'ellipsis';
        
        // Tiny expand button
        const expandBtn = document.createElement('button');
        expandBtn.innerHTML = '+';
        expandBtn.style.width = '14px';
        expandBtn.style.height = '14px';
        expandBtn.style.fontSize = '0.45rem';
        expandBtn.style.padding = '0';
        expandBtn.style.background = 'rgba(0, 243, 255, 0.15)';
        expandBtn.style.border = '1px solid rgba(0, 243, 255, 0.3)';
        expandBtn.style.color = 'var(--accent-primary)';
        expandBtn.style.cursor = 'pointer';
        expandBtn.style.borderRadius = '0';
        expandBtn.style.flexShrink = '0';
        expandBtn.style.lineHeight = '1';
        
        // Expanded info (hidden by default)
        const expandedInfo = document.createElement('div');
        expandedInfo.id = 'piano-scale-info';
        expandedInfo.style.position = 'absolute';
        expandedInfo.style.top = '100%';
        expandedInfo.style.left = '0';
        expandedInfo.style.right = '0';
        expandedInfo.style.background = 'rgba(0, 0, 0, 0.95)';
        expandedInfo.style.border = '1px solid rgba(0, 243, 255, 0.3)';
        expandedInfo.style.padding = '6px';
        expandedInfo.style.fontSize = '0.65rem';
        expandedInfo.style.lineHeight = '1.3';
        expandedInfo.style.maxHeight = '120px';
        expandedInfo.style.overflowY = 'auto';
        expandedInfo.style.display = 'none';
        expandedInfo.style.zIndex = '1000';
        expandedInfo.style.fontFamily = 'var(--font-tech)';
        
        // Toggle functionality
        let isExpanded = false;
        expandBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;
            if (isExpanded) {
                expandedInfo.style.display = 'block';
                expandBtn.innerHTML = '−';
                expandBtn.style.background = 'rgba(0, 243, 255, 0.3)';
            } else {
                expandedInfo.style.display = 'none';
                expandBtn.innerHTML = '+';
                expandBtn.style.background = 'rgba(0, 243, 255, 0.2)';
            }
        });
        
        scaleInfoContainer.style.position = 'relative';
        scaleInfoContainer.appendChild(compactInfo);
        scaleInfoContainer.appendChild(expandBtn);
        scaleInfoContainer.appendChild(expandedInfo);
        
        // Add sections to fingering row (scale info on top, buttons below)
        fingeringRow.appendChild(scaleInfoContainer);

        // Move scale library container here if it exists
        const scaleLibraryContainer = document.getElementById('scale-library-container');
        if (scaleLibraryContainer) {
            // Ensure it displays as flex row
            scaleLibraryContainer.style.display = 'flex';
            scaleLibraryContainer.style.alignItems = 'center';
            scaleLibraryContainer.style.gap = '8px';
            fingeringRow.appendChild(scaleLibraryContainer);
            
            // Hide the original header container if it's now empty
            const headerContainer = document.getElementById('header-scale-controls');
            if (headerContainer) {
                headerContainer.style.display = 'none';
            }
        }

        fingeringRow.appendChild(buttonSection);
        
        // Insert fingering row before piano
        container.insertBefore(fingeringRow, this.pianoElement);
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
     * Lighten a hex color by a percentage
     */
    lightenColor(color, percent) {
        if (!color || !color.startsWith('#')) return color;
        
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent * 100);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Darken a hex color by a percentage
     */
    darkenColor(color, percent) {
        if (!color || !color.startsWith('#')) return color;
        
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent * 100);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }

    /**
     * Set the grading engine for enhanced grading integration
     */
    setGradingEngine(engine) {
        this.gradingEngine = engine;
        
        if (engine) {
            // Subscribe to grading mode changes
            if (typeof engine.subscribe === 'function') {
                engine.subscribe((event, data) => {
                    if (event === 'gradingModeChanged') {
                        this.onGradingModeChanged(data);
                    }
                });
            }
            
            // Update current grading mode
            this.state.gradingMode = engine.gradingMode || 'functional';
            
            // Update note gradings if we have scale context
            if (this.state.scaleNotes.length > 0) {
                this.updateNoteGradings();
                this.applyState();
            }
        }
    }

    /**
     * Enable or disable grading integration
     */
    setGradingIntegration(enabled) {
        this.options.enableGradingIntegration = enabled;
        
        if (enabled && this.gradingEngine && this.state.scaleNotes.length > 0) {
            this.updateNoteGradings();
        } else if (!enabled) {
            // Clear grading state
            this.state.noteGradings.clear();
            this.hideAllGradingTooltips();
        }
        
        this.applyState();
    }

    /**
     * Enable or disable grading tooltips
     */
    setGradingTooltips(enabled) {
        this.options.showGradingTooltips = enabled;
        
        if (!enabled) {
            this.hideAllGradingTooltips();
        }
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
