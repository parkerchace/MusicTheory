/**
 * @module ScaleLibrary
 * @description Scale selection, key selection, and piano visualization integration
 * @exports class ScaleLibrary
 * @feature 60+ scales from multiple musical traditions
 * @feature 12-key selection
 * @feature Piano visualizer showing scale degrees
 * @feature Scale categories and organization
 * @feature Event system for scale/key changes
 */

class ScaleLibrary {
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ScaleLibrary requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            currentKey: 'C',
            currentScale: 'major',
            selectedNotes: []
        };

        this.listeners = new Map();
        this.pianoRenderer = null;

        this.initialize();

        // Ensure the canonical scales dataset is available on the shared engine.
        // If another module already provided `musicTheory.scales`, prefer that.
        if (!this.musicTheory.scales || Object.keys(this.musicTheory.scales).length === 0) {
            this.musicTheory.scales = {
                major: [0, 2, 4, 5, 7, 9, 11],
                dorian: [0, 2, 3, 5, 7, 9, 10],
                phrygian: [0, 1, 3, 5, 7, 8, 10],
                lydian: [0, 2, 4, 6, 7, 9, 11],
                mixolydian: [0, 2, 4, 5, 7, 9, 10],
                aeolian: [0, 2, 3, 5, 7, 8, 10],
                locrian: [0, 1, 3, 5, 6, 8, 10],

                melodic: [0, 2, 3, 5, 7, 9, 11],
                dorian_b2: [0, 1, 3, 5, 7, 9, 10],
                lydian_augmented: [0, 2, 4, 6, 8, 9, 11],
                lydian_dominant: [0, 2, 4, 6, 7, 9, 10],
                mixolydian_b6: [0, 2, 4, 5, 7, 8, 10],
                locrian_nat2: [0, 2, 3, 5, 6, 8, 10],
                altered: [0, 1, 3, 4, 6, 8, 10],

                harmonic: [0, 2, 3, 5, 7, 8, 11],
                locrian_nat6: [0, 1, 3, 5, 6, 9, 10],
                ionian_augmented: [0, 2, 4, 5, 8, 9, 11],
                dorian_sharp4: [0, 2, 3, 6, 7, 9, 10],
                phrygian_dominant: [0, 1, 4, 5, 7, 8, 10],
                lydian_sharp2: [0, 3, 4, 6, 7, 9, 11],
                altered_diminished: [0, 1, 3, 4, 6, 8, 9],

                harmonic_major: [0, 2, 4, 5, 7, 8, 11],
                dorian_b5: [0, 2, 3, 5, 6, 9, 10],
                phrygian_b4: [0, 1, 3, 4, 7, 8, 10],
                lydian_b3: [0, 2, 3, 6, 7, 9, 11],
                mixolydian_b2: [0, 1, 4, 5, 7, 9, 10],
                aeolian_b1: [0, 1, 3, 5, 7, 8, 10],
                locrian_bb7: [0, 1, 3, 5, 6, 8, 9],

                double_harmonic_major: [0, 1, 4, 5, 7, 8, 11],
                lydian_sharp2_sharp6: [0, 3, 4, 6, 7, 10, 11],
                ultraphrygian: [0, 1, 4, 5, 6, 9, 10],
                hungarian_minor: [0, 2, 3, 6, 7, 8, 11],
                oriental: [0, 1, 4, 5, 6, 9, 10],
                ionian_augmented_sharp2: [0, 3, 4, 5, 8, 9, 11],
                locrian_bb3_bb7: [0, 1, 2, 5, 6, 8, 9],

                whole_tone: [0, 2, 4, 6, 8, 10],
                octatonic_dim: [0, 2, 3, 5, 6, 8, 9, 11],
                octatonic_dom: [0, 1, 3, 4, 6, 7, 9, 10],
                augmented: [0, 3, 4, 7, 8, 11],
                tritone: [0, 1, 4, 6, 7, 10],
                prometheus: [0, 2, 4, 6, 9, 10],

                major_pentatonic: [0, 2, 4, 7, 9],
                minor_pentatonic: [0, 3, 5, 7, 10],
                egyptian_pentatonic: [0, 2, 5, 7, 10],
                blues_minor_pentatonic: [0, 3, 5, 6, 7, 10],
                blues_major_pentatonic: [0, 2, 3, 4, 7, 9],
                hirajoshi: [0, 2, 3, 7, 8],
                iwato: [0, 1, 5, 6, 10],
                insen: [0, 1, 5, 7, 10],
                yo: [0, 2, 5, 7, 9],

                blues_hexatonic: [0, 3, 5, 6, 7, 10],
                whole_tone_hexatonic: [0, 2, 4, 6, 8, 10],
                augmented_hexatonic: [0, 3, 4, 7, 8, 11],
                prometheus_hexatonic: [0, 2, 4, 6, 9, 10],

                hijaz: [0, 1, 4, 5, 7, 8, 10],
                hijaz_kar: [0, 1, 4, 5, 7, 8, 11],
                maqam_bayati: [0, 1, 3, 5, 7, 8, 10],
                maqam_rast: [0, 2, 4, 5, 7, 9, 10],
                maqam_ajam: [0, 2, 4, 5, 7, 9, 11],
                maqam_nahawand: [0, 2, 3, 5, 7, 8, 10],
                maqam_kurd: [0, 1, 3, 5, 7, 8, 10],
                persian: [0, 1, 4, 5, 6, 8, 11],

                raga_bhairav: [0, 1, 4, 5, 7, 8, 11],
                raga_todi: [0, 1, 3, 6, 7, 8, 11],
                raga_marwa: [0, 1, 4, 6, 7, 9, 11],
                raga_purvi: [0, 1, 4, 6, 7, 8, 11],
                raga_kafi: [0, 2, 3, 5, 7, 9, 10],
                raga_bhairavi: [0, 1, 3, 5, 7, 8, 10],

                spanish_phrygian: [0, 1, 4, 5, 7, 8, 10],
                spanish_gypsy: [0, 1, 4, 5, 7, 8, 11],
                flamenco: [0, 1, 3, 4, 5, 7, 8, 10],

                bebop_major: [0, 2, 4, 5, 7, 8, 9, 11],
                bebop_dominant: [0, 2, 4, 5, 7, 9, 10, 11],
                bebop_minor: [0, 2, 3, 5, 7, 8, 9, 10],
                bebop_dorian: [0, 2, 3, 4, 5, 7, 9, 10],

                barry_major6dim: [0, 2, 3, 4, 5, 7, 9, 10],
                barry_dom7dim: [0, 2, 3, 4, 6, 7, 9, 10],
                barry_minor6dim: [0, 2, 3, 5, 6, 8, 9, 11],

                enigmatic: [0, 1, 4, 6, 8, 10, 11],
                neapolitan_major: [0, 1, 3, 5, 7, 9, 11],
                neapolitan_minor: [0, 1, 3, 5, 7, 8, 11],
                romanian_minor: [0, 2, 3, 6, 7, 9, 10],
                ukrainian_dorian: [0, 2, 3, 6, 7, 9, 10],
                leading_whole_tone: [0, 2, 4, 6, 8, 10, 11]
            };
        }
    }

    initialize() {
        // Set up piano renderer if available
        if (typeof window !== 'undefined' && window.PianoRenderer) {
            this.pianoRenderer = new window.PianoRenderer();
        }
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
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    /**
     * Get current key
     */
    getCurrentKey() {
        return this.state.currentKey;
    }

    /**
     * Get current scale
     */
    getCurrentScale() {
        return this.state.currentScale;
    }

    /**
     * Get current scale notes (with key signature respect)
     */
    getCurrentScaleNotes() {
        return this.musicTheory.getScaleNotesWithKeySignature(this.state.currentKey, this.state.currentScale);
    }

    /**
     * Set key and scale
     */
    setKeyAndScale(key, scale) {
        if (!this.musicTheory.getKeys().includes(key)) {
            throw new Error(`Invalid key: ${key}`);
        }

        if (!this.musicTheory.scales[scale]) {
            throw new Error(`Invalid scale: ${scale}`);
        }

        this.state.currentKey = key;
        this.state.currentScale = scale;
        this.state.selectedNotes = [];

        this.emit('scaleChanged', {
            key: this.state.currentKey,
            scale: this.state.currentScale,
            notes: this.getCurrentScaleNotes()
        });

        this.updatePianoVisualization();
        this.render();
    }

    /**
     * Set only the key
     */
    setKey(key) {
        this.setKeyAndScale(key, this.state.currentScale);
    }

    /**
     * Set only the scale
     */
    setScale(scale) {
        this.setKeyAndScale(this.state.currentKey, scale);
    }

    /**
     * Get all available scales organized by category
     */
    getScaleCategories() {
        return this.musicTheory.getScaleCategories();
    }

    /**
     * Get scales in a specific category
     */
    getScalesInCategory(category) {
        const categories = this.getScaleCategories();
        return categories[category] || [];
    }

    /**
     * Get all available keys
     */
    getKeys() {
        return this.musicTheory.getKeys();
    }

    /**
     * Get scale information
     */
    getScaleInfo(scaleType) {
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, scaleType);
        const intervals = this.musicTheory.scales[scaleType] || [];

        return {
            name: this.getScaleDisplayName(scaleType),
            type: scaleType,
            notes: scaleNotes,
            intervals: intervals,
            noteCount: scaleNotes.length
        };
    }

    /**
     * Get display name for scale
     */
    getScaleDisplayName(scaleType) {
        const displayNames = {
            // Major & Modes
            major: 'Major (Ionian)',
            dorian: 'Dorian',
            phrygian: 'Phrygian',
            lydian: 'Lydian',
            mixolydian: 'Mixolydian',
            aeolian: 'Minor (Aeolian)',
            locrian: 'Locrian',
            
            // Melodic Minor Modes
            melodic: 'Melodic Minor',
            dorian_b2: 'Dorian ♭2 (Phrygian ♮6)',
            lydian_augmented: 'Lydian Augmented',
            lydian_dominant: 'Lydian Dominant (Acoustic)',
            mixolydian_b6: 'Mixolydian ♭6',
            locrian_nat2: 'Locrian ♮2 (Half Diminished)',
            altered: 'Altered (Super Locrian)',
            
            // Harmonic Minor Modes
            harmonic: 'Harmonic Minor',
            locrian_nat6: 'Locrian ♮6',
            ionian_augmented: 'Ionian Augmented',
            dorian_sharp4: 'Dorian ♯4 (Romanian)',
            phrygian_dominant: 'Phrygian Dominant (Freygish)',
            lydian_sharp2: 'Lydian ♯2',
            altered_diminished: 'Altered Diminished',
            
            // Harmonic Major Modes
            harmonic_major: 'Harmonic Major',
            dorian_b5: 'Dorian ♭5',
            phrygian_b4: 'Phrygian ♭4',
            lydian_b3: 'Lydian ♭3',
            mixolydian_b2: 'Mixolydian ♭2',
            aeolian_b1: 'Aeolian ♭1',
            locrian_bb7: 'Locrian ♭♭7',
            
            // Double Harmonic Modes
            double_harmonic_major: 'Double Harmonic Major (Byzantine)',
            lydian_sharp2_sharp6: 'Lydian ♯2 ♯6',
            ultraphrygian: 'Ultraphrygian',
            hungarian_minor: 'Hungarian Minor (Gypsy)',
            oriental: 'Oriental',
            ionian_augmented_sharp2: 'Ionian Augmented ♯2',
            locrian_bb3_bb7: 'Locrian ♭♭3 ♭♭7',
            
            // Symmetric
            whole_tone: 'Whole Tone',
            octatonic_dim: 'Octatonic Diminished (W-H)',
            octatonic_dom: 'Octatonic Dominant (H-W)',
            augmented: 'Augmented',
            tritone: 'Tritone',
            prometheus: 'Prometheus',
            
            // Pentatonic
            major_pentatonic: 'Major Pentatonic',
            minor_pentatonic: 'Minor Pentatonic',
            egyptian_pentatonic: 'Egyptian Pentatonic',
            blues_minor_pentatonic: 'Blues Minor Pentatonic',
            blues_major_pentatonic: 'Blues Major Pentatonic',
            hirajoshi: 'Hirajōshi',
            iwato: 'Iwato',
            insen: 'In Sen',
            yo: 'Yō',
            
            // Hexatonic
            blues_hexatonic: 'Blues Hexatonic',
            whole_tone_hexatonic: 'Whole Tone Hexatonic',
            augmented_hexatonic: 'Augmented Hexatonic',
            prometheus_hexatonic: 'Prometheus Hexatonic',
            
            // Middle Eastern
            hijaz: 'Hijaz',
            hijaz_kar: 'Hijaz Kar',
            maqam_bayati: 'Maqam Bayati',
            maqam_rast: 'Maqam Rast',
            maqam_ajam: 'Maqam Ajam',
            maqam_nahawand: 'Maqam Nahawand',
            maqam_kurd: 'Maqam Kurd',
            persian: 'Persian',
            
            // Indian Ragas
            raga_bhairav: 'Raga Bhairav',
            raga_todi: 'Raga Todi',
            raga_marwa: 'Raga Marwa',
            raga_purvi: 'Raga Purvi',
            raga_kafi: 'Raga Kafi',
            raga_bhairavi: 'Raga Bhairavi',
            
            // Spanish/Flamenco
            spanish_phrygian: 'Spanish Phrygian',
            spanish_gypsy: 'Spanish Gypsy',
            flamenco: 'Flamenco',
            
            // Jazz
            bebop_major: 'Bebop Major',
            bebop_dominant: 'Bebop Dominant',
            bebop_minor: 'Bebop Minor',
            bebop_dorian: 'Bebop Dorian',
            
            // Barry Harris
            barry_major6dim: 'Barry Harris Major 6 Dim',
            barry_dom7dim: 'Barry Harris Dom 7 Dim',
            barry_minor6dim: 'Barry Harris Minor 6 Dim',
            
            // Exotic/Modern
            enigmatic: 'Enigmatic',
            neapolitan_major: 'Neapolitan Major',
            neapolitan_minor: 'Neapolitan Minor',
            romanian_minor: 'Romanian Minor',
            ukrainian_dorian: 'Ukrainian Dorian',
            leading_whole_tone: 'Leading Whole Tone'
        };

        return displayNames[scaleType] || scaleType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Highlight scale degree on piano
     */
    highlightScaleDegree(degree) {
        const scaleNotes = this.getCurrentScaleNotes();
        const note = scaleNotes[(degree - 1) % scaleNotes.length];

        this.state.selectedNotes = [note];
        this.updatePianoVisualization();

        this.emit('degreeHighlighted', {
            degree: degree,
            note: note,
            scaleNotes: scaleNotes
        });
    }

    /**
     * Clear highlighting
     */
    clearHighlighting() {
        this.state.selectedNotes = [];
        this.updatePianoVisualization();

        this.emit('highlightingCleared', {});
    }

    /**
     * Update piano visualization
     */
    updatePianoVisualization() {
        if (this.pianoRenderer && typeof this.pianoRenderer.renderScale === 'function') {
            const scaleNotes = this.getCurrentScaleNotes();
            const activeNotes = this.state.selectedNotes.length > 0 ? this.state.selectedNotes : scaleNotes;

            this.pianoRenderer.renderScale({
                key: this.state.currentKey,
                scale: this.state.currentScale,
                notes: scaleNotes,
                activeNotes: activeNotes,
                highlightedNotes: this.state.selectedNotes
            });
        }
    }

    /**
     * Get scale characteristics
     */
    getScaleCharacteristics(scaleType) {
        const intervals = this.musicTheory.scales[scaleType] || [];
        const characteristics = {
            intervals: intervals,
            intervalNames: intervals.map(interval => this.getIntervalName(interval)),
            tonality: this.getScaleTonality(scaleType),
            origin: this.getScaleOrigin(scaleType),
            commonUse: this.getScaleCommonUse(scaleType)
        };

        return characteristics;
    }

    /**
     * Get interval name from semitones
     */
    getIntervalName(semitones) {
        const intervalNames = {
            0: 'Unison',
            1: 'Minor 2nd',
            2: 'Major 2nd',
            3: 'Minor 3rd',
            4: 'Major 3rd',
            5: 'Perfect 4th',
            6: 'Tritone',
            7: 'Perfect 5th',
            8: 'Minor 6th',
            9: 'Major 6th',
            10: 'Minor 7th',
            11: 'Major 7th',
            12: 'Octave'
        };

        return intervalNames[semitones] || `${semitones} semitones`;
    }

    /**
     * Get scale tonality
     */
    getScaleTonality(scaleType) {
        if (scaleType.includes('minor') || scaleType === 'aeolian' || scaleType === 'dorian' || scaleType === 'phrygian') {
            return 'Minor';
        } else if (scaleType.includes('major') || ['major', 'lydian', 'mixolydian'].includes(scaleType)) {
            return 'Major';
        } else if (scaleType.includes('pentatonic')) {
            return 'Pentatonic';
        } else if (scaleType.includes('whole_tone')) {
            return 'Whole Tone';
        } else {
            return 'Modal';
        }
    }

    /**
     * Get scale origin/cultural context
     */
    getScaleOrigin(scaleType) {
        if (scaleType.includes('japanese')) return 'Japan';
        if (scaleType.includes('indian') || scaleType.includes('raga')) return 'India';
        if (scaleType.includes('barry')) return 'Barry Harris (Jazz)';
        if (scaleType.includes('pentatonic') || scaleType.includes('blues')) return 'Africa/Americas';
        if (scaleType.includes('hijaz')) return 'Middle East';
        return 'Western Classical/Jazz';
    }

    /**
     * Get common usage information
     */
    getScaleCommonUse(scaleType) {
        const uses = {
            major: 'Standard major key harmony, pop, classical',
            dorian: 'Rock, jazz, funk grooves',
            phrygian: 'Flamenco, metal, modal jazz',
            lydian: 'Film scores, impressionist classical',
            mixolydian: 'Blues, rock, folk',
            aeolian: 'Natural minor, classical, pop ballads',
            locrian: 'Diminished harmony, jazz',
            melodic: 'Jazz melodic minor harmony',
            harmonic: 'Classical minor, metal, flamenco',
            whole_tone: 'Impressionist classical, jazz',
            major_pentatonic: 'Pop, folk, world music',
            minor_pentatonic: 'Blues, rock, pop',
            blues_hexatonic: 'Blues, jazz, rock'
        };

        return uses[scaleType] || 'Various musical contexts';
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
        this.render();
    }

    /**
     * Render UI
     */
    render() {
        if (!this.container) return;
        
        const currentScale = this.getCurrentScale();
        const scaleCategories = this.musicTheory.getScaleCategories();

        // Build optgroups for organized dropdown using provided categories
        let scaleOptionsHTML = '';
        Object.entries(scaleCategories || {}).forEach(([category, scales]) => {
            scaleOptionsHTML += `<optgroup label="${category}">`;
            (scales || []).forEach(scaleId => {
                const displayName = this.getScaleDisplayName(scaleId);
                const selected = scaleId === currentScale ? 'selected' : '';
                scaleOptionsHTML += `<option value="${scaleId}" ${selected}>${displayName}</option>`;
            });
            scaleOptionsHTML += `</optgroup>`;
        });
        
        this.container.innerHTML = `
            <div class="scale-library-ui">
                <h3>Scale Library</h3>
                <div class="scale-selector">
                    <label>Key:</label>
                    <select id="key-select">
                        ${this.musicTheory.getKeys().map(key => 
                            `<option value="${key}" ${key === this.state.currentKey ? 'selected' : ''}>${key}</option>`
                        ).join('')}
                    </select>
                    
                    <label>Scale:</label>
                    <select id="scale-select">
                        ${scaleOptionsHTML}
                    </select>
                </div>
                <!-- citation UI removed: sources and academic references sanitized -->
            </div>
            <style>
                #scale-select optgroup {
                    font-weight: bold;
                    font-style: normal;
                    color: var(--accent-primary);
                    background: #000;
                }
                #scale-select option {
                    font-weight: normal;
                    padding-left: 8px;
                    background: #000;
                    color: var(--text-main);
                }
            </style>
        `;
        
        // Add change event listeners for automatic updates
        document.getElementById('key-select').addEventListener('change', (e) => {
            const key = e.target.value;
            const scale = document.getElementById('scale-select').value;
            this.setKeyAndScale(key, scale);
        });
        
        document.getElementById('scale-select').addEventListener('change', (e) => {
            const scale = e.target.value;
            const key = document.getElementById('key-select').value;
            this.setKeyAndScale(key, scale);
        });
    }

    /**
     * Export current state
     */
    exportState() {
        return {
            key: this.state.currentKey,
            scale: this.state.currentScale,
            notes: this.getCurrentScaleNotes(),
            characteristics: this.getScaleCharacteristics(this.state.currentScale),
            timestamp: Date.now()
        };
    }

    /**
     * Import state
     */
    importState(state) {
        if (state.key && state.scale) {
            this.setKeyAndScale(state.key, state.scale);
        }
    }

    getAvailableScales() {
        const scales = Object.keys(this.musicTheory.scales || {})
            .map(scale => ({ id: scale, name: this.getScaleDisplayName(scale) }));

        return scales;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScaleLibrary;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.ScaleLibrary = ScaleLibrary;
}
