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
        
        // Build optgroups for organized dropdown
        let scaleOptionsHTML = '';
        Object.entries(scaleCategories).forEach(([category, scales]) => {
            scaleOptionsHTML += `<optgroup label="${category}">`;
            scales.forEach(scaleId => {
                const displayName = this.getScaleDisplayName(scaleId);
                const selected = scaleId === currentScale ? 'selected' : '';
                scaleOptionsHTML += `<option value="${scaleId}" ${selected}>${displayName}</option>`;
            });
            scaleOptionsHTML += `</optgroup>`;
        });
        
        // Get citation for current scale
        const currentCitation = this.musicTheory.getScaleCitation ? 
            this.musicTheory.getScaleCitation(currentScale, 'html') : '';
        
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
                ${currentCitation ? `
                    <div class="scale-citation-compact">
                        <span class="citation-summary">📚 Academic Info</span>
                        <button class="citation-toggle" onclick="
                            const fullDiv = this.parentElement.nextElementSibling;
                            const isHidden = fullDiv.style.display === 'none' || fullDiv.style.display === '';
                            fullDiv.style.display = isHidden ? 'block' : 'none';
                            this.textContent = isHidden ? '−' : '+';
                        ">+</button>
                    </div>
                    <div class="scale-citation-full" style="display: none;">${currentCitation}</div>
                ` : ''}
            </div>
            <style>
                .scale-citation-compact {
                    margin-top: 8px;
                    padding: 4px 8px;
                    background: rgba(0, 243, 255, 0.05);
                    border: 1px solid rgba(0, 243, 255, 0.2);
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    font-family: var(--font-tech);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .citation-summary {
                    flex: 1;
                }
                .citation-toggle {
                    width: 16px;
                    height: 16px;
                    font-size: 0.6rem;
                    padding: 0;
                    background: rgba(0, 243, 255, 0.2);
                    border: 1px solid rgba(0, 243, 255, 0.4);
                    color: var(--accent-primary);
                    cursor: pointer;
                    border-radius: 0;
                    line-height: 1;
                }
                .scale-citation-full {
                    margin-top: 4px;
                    padding: 8px 12px;
                    background: linear-gradient(135deg, rgba(0, 243, 255, 0.1) 0%, rgba(5, 10, 15, 0.9) 100%);
                    border-left: 3px solid var(--accent-primary);
                    border-radius: 0;
                    font-size: 0.75rem;
                    color: var(--text-main);
                    line-height: 1.4;
                    font-family: var(--font-tech);
                    border: 1px solid var(--border-light);
                    border-left-width: 3px;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .scale-citation-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .citation-description {
                    font-weight: 500;
                    color: var(--accent-primary);
                }
                .citation-references {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .citation-references strong {
                    color: var(--accent-primary);
                    margin-right: 4px;
                }
                .citation-references a {
                    color: var(--accent-secondary);
                    text-decoration: none;
                    border-bottom: 1px dotted var(--accent-secondary);
                    transition: all 0.2s ease;
                }
                .citation-references a:hover {
                    color: var(--accent-primary);
                    border-bottom-style: solid;
                    background: rgba(0, 243, 255, 0.1);
                    padding: 2px 4px;
                }
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
        const scales = Object.keys(this.musicTheory.scales).map(scale => ({
            id: scale,
            name: this.getScaleDisplayName(scale)
        }));

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
