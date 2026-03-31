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

        // Rely on `musicTheory.scales` being provided by the centralized `scales.js` module
        // The engine should attach `scales` and `scalesMeta` during initialization.
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

        // If the engine doesn't yet have the requested scale (e.g., central
        // `scales.js` hasn't been loaded in the browser), try to pick it up
        // from global `SCALES` or require it, then re-check before falling
        // back to a safe default. This handles script load-order differences.
        if (!this.musicTheory.scales || !this.musicTheory.scales[scale]) {
            // Try global SCALES
            try {
                const globalS = (typeof globalThis !== 'undefined' && globalThis.SCALES) || (typeof window !== 'undefined' && window.SCALES) || null;
                if (globalS && globalS.intervals) {
                    this.musicTheory.scales = globalS.intervals;
                    this.musicTheory.scalesMeta = globalS.meta || {};
                } else {
                    // Try CommonJS require as a last resort (node environment)
                    try {
                        const S = require('./scales.js');
                        if (S && S.intervals) {
                            this.musicTheory.scales = S.intervals;
                            this.musicTheory.scalesMeta = S.meta || {};
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            } catch (e) { /* ignore */ }

            if (!this.musicTheory.scales || !this.musicTheory.scales[scale]) {
                console.warn(`ScaleLibrary: requested scale '${scale}' not found; falling back to 'major'`);
                scale = 'major';
                if (!this.musicTheory.scales || !this.musicTheory.scales[scale]) {
                    // Ensure we have at least a minimal major scale to proceed
                    this.musicTheory.scales = this.musicTheory.scales || {};
                    this.musicTheory.scales.major = this.musicTheory.scales.major || [0,2,4,5,7,9,11];
                }
            }
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

    getTaxonomyMeta() {
        const taxonomy = this.musicTheory?.scalesMeta?.taxonomy;
        if (taxonomy && taxonomy.byFamily && taxonomy.byScale) {
            return taxonomy;
        }
        return this.buildFallbackTaxonomy();
    }

    buildFallbackTaxonomy() {
        const categories = this.getScaleCategories() || {};
        const byFamily = {};
        const byScale = {};
        Object.entries(categories).forEach(([family, scaleIds]) => {
            byFamily[family] = { subcategories: { 'Main Scales': scaleIds.slice() } };
            scaleIds.forEach((id, index) => {
                byScale[id] = {
                    family,
                    subcategory: 'Main Scales',
                    isCore: index < 8,
                    variationOf: null,
                    displayOrder: index,
                    isCommonCore: index < 6
                };
            });
        });
        return {
            topLevel: ['Common & Core', 'All Families'],
            familyOrder: Object.keys(byFamily),
            byFamily,
            byScale,
            commonCore: ['major', 'aeolian', 'dorian', 'mixolydian', 'lydian', 'phrygian', 'locrian'],
            unclassified: []
        };
    }

    // Recursive helper to flatten nested taxonomy structures (from elastic splitting)
    flattenIds(input) {
        if (Array.isArray(input)) return input;
        if (typeof input === 'object' && input !== null) {
            let flat = [];
            Object.values(input).forEach(v => flat = flat.concat(this.flattenIds(v)));
            return flat;
        }
        return [];
    }

    getVariationGroups(scaleIdsInput, taxonomyByScale) {
        const groups = new Map();
        const roots = [];
        
        const scaleIds = this.flattenIds(scaleIdsInput);

        (scaleIds || []).forEach(scaleId => {
            const info = (taxonomyByScale && taxonomyByScale[scaleId]) ? (Array.isArray(taxonomyByScale[scaleId]) ? taxonomyByScale[scaleId][0] : taxonomyByScale[scaleId]) : {};
            if (info.subcategory === 'Variations' && info.variationOf) {
                if (!groups.has(info.variationOf)) {
                    groups.set(info.variationOf, []);
                }
                groups.get(info.variationOf).push(scaleId);
                return;
            }
            roots.push(scaleId);
        });
        roots.sort((a, b) => this.getScaleDisplayName(a).localeCompare(this.getScaleDisplayName(b)));
        roots.forEach(rootId => {
            const variants = groups.get(rootId);
            if (variants) {
                variants.sort((a, b) => this.getScaleDisplayName(a).localeCompare(this.getScaleDisplayName(b)));
            }
        });
        return { roots, groups };
    }

    renderRecursiveTaxonomy(node, byScale, currentScale) {
        if (Array.isArray(node)) {
            const grouped = this.getVariationGroups(node, byScale);
            return grouped.roots.map(scaleId => {
                const displayName = this.getScaleDisplayName(scaleId);
                const isActive = scaleId === currentScale ? 'active' : '';
                const variants = grouped.groups.get(scaleId) || [];
                if (!variants.length) {
                    return `<div class="scale-item ${isActive}" data-scale="${scaleId}">${displayName}</div>`;
                }

                return `
                    <div class="variation-group" data-root="${scaleId}">
                        <button class="variation-toggle scale-item ${isActive}" data-scale="${scaleId}">
                            <span>${displayName}</span>
                            <span class="variation-count">${variants.length} variations</span>
                        </button>
                        <div class="variation-items">
                            ${variants.map(variantId => {
                                const variantName = this.getScaleDisplayName(variantId);
                                const variantActive = variantId === currentScale ? 'active' : '';
                                return `<div class="scale-item ${variantActive}" data-scale="${variantId}" data-variation="true">${variantName}</div>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');
        }

        return Object.entries(node).map(([label, nextNode]) => {
            const subId = `nested-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Math.floor(Math.random() * 1000)}`;
            return `
                <div class="nested-category-box">
                    <div class="nested-category-header" data-category-header="${subId}">
                        <span>${label}</span>
                        <span class="picker-icon">▼</span>
                    </div>
                    <div class="nested-category-content" id="${subId}" style="display:none;">
                        ${this.renderRecursiveTaxonomy(nextNode, byScale, currentScale)}
                    </div>
                </div>
            `;
        }).join('');
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
        // First check if we have display names from scalesMeta (scraped data)
        if (this.musicTheory.scalesMeta && 
            this.musicTheory.scalesMeta.displayNames && 
            this.musicTheory.scalesMeta.displayNames[scaleType]) {
            return this.musicTheory.scalesMeta.displayNames[scaleType];
        }
        
        // Fallback to hardcoded display names
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
        const currentScaleName = this.getScaleDisplayName(currentScale);
        const scaleCategories = this.musicTheory.getScaleCategories();
        const taxonomy = this.getTaxonomyMeta();
        if (document.getElementById('scale-picker-modal') && this.container.innerHTML.includes('scale-picker-modal')) {
            const nameSpan = document.querySelector('#scale-picker-btn .current-scale-name');
            if (nameSpan) nameSpan.textContent = currentScaleName;
            const keySelect = document.getElementById('key-select');
            if (keySelect) keySelect.value = this.state.currentKey;
            return;
        }
        
        this.container.innerHTML = `
            <div class="scale-library-ui">
                <div class="scale-library-header">
                    <div class="key-selector">
                        <label>Key:</label>
                        <select id="key-select">
                            ${this.musicTheory.getKeys().map(key => 
                                `<option value="${key}" ${key === this.state.currentKey ? 'selected' : ''}>${key}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <button id="scale-picker-btn" class="scale-picker-button">
                        <span class="current-scale-name">${currentScaleName}</span>
                        <span class="picker-icon">▼</span>
                    </button>
                </div>
            </div>
            
            <!-- Modal Overlay -->
            <div id="scale-picker-modal" class="scale-picker-modal" style="display: none;">
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="scale-view-tabs">
                            <button class="scale-view-tab active" data-view="tree">Family Tree</button>
                            <button class="scale-view-tab" data-view="special">Special View</button>
                        </div>
                        <div class="scale-search-container">
                            <input 
                                type="text" 
                                id="scale-search-input" 
                                class="scale-search-input" 
                                placeholder="Search scales, traditions, intervals..."
                                autocomplete="off"
                            />
                        </div>
                        <button id="close-modal-btn" class="close-btn">×</button>
                    </div>
                    <div class="categories-grid">
                        ${this.buildCategoriesHTML(scaleCategories, currentScale, taxonomy)}
                    </div>
                </div>
            </div>
            
            <style>
                .scale-library-ui {
                    font-family: var(--font-tech);
                    color: var(--text-main);
                }
                
                .scale-library-header {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                
                .key-selector {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .key-selector label {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                
                .key-selector select {
                    padding: 6px 10px;
                    background: var(--bg-app);
                    border: 1px solid var(--border-light);
                    color: var(--text-main);
                    border-radius: 4px;
                    font-size: 0.85rem;
                    cursor: pointer;
                }
                
                .scale-picker-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 12px;
                    background: var(--bg-panel);
                    border: 1px solid var(--border-light);
                    border-radius: 4px;
                    color: var(--text-main);
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.2s ease;
                    min-width: 180px;
                    justify-content: space-between;
                }
                
                .scale-picker-button:hover {
                    background: var(--bg-hover);
                    border-color: var(--accent-primary);
                }
                
                .current-scale-name {
                    font-weight: 600;
                }
                
                .picker-icon {
                    font-size: 0.7rem;
                    opacity: 0.6;
                }
                
                /* Modal Styles */
                .scale-picker-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                }
                
                .modal-content {
                    position: relative;
                    background: var(--bg-app);
                    border: 2px solid var(--border-light);
                    border-radius: 12px;
                    max-width: 900px;
                    max-height: 80vh;
                    width: 90%;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                    animation: modalSlideIn 0.3s ease-out;
                }
                
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-light);
                    gap: 16px;
                }
                
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.2rem;
                    white-space: nowrap;
                }
                
                .scale-search-input {
                    flex: 1;
                    padding: 8px 12px;
                    background: var(--bg-panel);
                    border: 1px solid var(--border-light);
                    border-radius: 6px;
                    color: var(--text-main);
                    font-size: 0.9rem;
                    font-family: var(--font-tech);
                    transition: all 0.2s ease;
                }
                
                .scale-search-input:focus {
                    outline: none;
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
                }
                
                .scale-search-input::placeholder {
                    color: var(--text-muted);
                }
                
                .close-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 28px;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                
                .close-btn:hover {
                    background: var(--bg-hover);
                    color: var(--text-main);
                }
                
                .categories-grid {
                    padding: 18px;
                    overflow-y: auto;
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    grid-auto-rows: min-content;
                    gap: 14px;
                    align-items: start;
                }
                
                .category-box {
                    background: var(--bg-panel);
                    border: 1px solid var(--border-light);
                    border-radius: 8px;
                    overflow: hidden;
                    transition: box-shadow 0.18s ease, border-color 0.18s ease;
                    display: flex;
                    flex-direction: column;
                    min-height: 56px;
                }

                .category-scales {
                    max-height: 38vh;
                    overflow-y: auto;
                    padding: 8px 10px;
                }
                
                .category-box:hover {
                    border-color: var(--accent-primary);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }
                
                .category-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 14px;
                    cursor: pointer;
                    user-select: none;
                    background: var(--bg-app);
                    transition: background 0.12s ease;
                }
                
                .category-header:hover {
                    background: var(--bg-hover);
                }
                
                .category-box.expanded .category-header {
                    background: var(--accent-primary);
                    color: #000;
                }
                
                .category-name {
                    font-weight: 600;
                    font-size: 0.85rem;
                }
                
                .category-count {
                    font-size: 0.75rem;
                    padding: 2px 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    font-weight: 600;
                }
                
                .category-box.expanded .category-count {
                    background: rgba(0, 0, 0, 0.2);
                }
                
                .category-scales {
                    max-height: 250px;
                    overflow-y: auto;
                    background: var(--bg-panel);
                }

                .scale-view-tabs {
                    display: flex;
                    gap: 8px;
                }

                .scale-view-tab {
                    border: 1px solid var(--border-light);
                    background: var(--bg-panel);
                    color: var(--text-main);
                    border-radius: 6px;
                    font-size: 0.78rem;
                    padding: 6px 10px;
                    cursor: pointer;
                }

                .scale-view-tab.active {
                    border-color: var(--accent-primary);
                    background: var(--accent-primary);
                    color: #000;
                    font-weight: 600;
                }

                .subcategory-block {
                    border-top: 1px dashed var(--border-light);
                    padding: 8px 10px;
                }

                .subcategory-title {
                    font-size: 0.74rem;
                    font-weight: 600;
                    opacity: 0.75;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                }

                .variation-group {
                    border: 1px solid var(--border-light);
                    border-radius: 4px;
                    margin-bottom: 6px;
                    overflow: hidden;
                }

                .variation-toggle {
                    width: 100%;
                    border: none;
                    background: var(--bg-app);
                    color: var(--text-main);
                    text-align: left;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .variation-count {
                    font-size: 0.72rem;
                    opacity: 0.7;
                }

                .variation-items {
                    display: none;
                    max-height: 26vh;
                    overflow-y: auto;
                }

                .variation-group.expanded .variation-items {
                    display: block;
                }

                .nested-category-box {
                    border: 1px solid var(--border-light);
                    border-radius: 6px;
                    margin: 8px;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.01);
                }

                .nested-category-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 12px;
                    cursor: pointer;
                    font-size: 0.82rem;
                    font-weight: 600;
                    background: var(--bg-app);
                }

                .nested-category-header:hover {
                    background: var(--bg-hover);
                }

                .nested-category-content {
                    border-top: 1px solid var(--border-light);
                    max-height: 32vh;
                    overflow-y: auto;
                }
                
                .scale-item {
                    padding: 8px 12px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    border-bottom: 1px solid var(--border-light);
                    transition: padding-left 0.12s ease, background 0.12s ease;
                }
                
                .scale-item:last-child {
                    border-bottom: none;
                }
                
                .scale-item:hover {
                    background: var(--bg-hover);
                    padding-left: 16px;
                }
                
                .scale-item.active {
                    background: var(--accent-primary);
                    color: #000;
                    font-weight: 600;
                }
                
                .scale-item.active:hover {
                    background: var(--accent-secondary);
                }

                .scale-item.similar-highlight {
                    box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.12) inset, 0 6px 18px rgba(250, 204, 21, 0.06);
                    border-left: 3px solid rgba(250, 204, 21, 0.9);
                    background: rgba(250, 204, 21, 0.03);
                }
            </style>
        `;
        
        this.attachEventListeners(scaleCategories, currentScale);
    }
    
    buildCategoriesHTML(scaleCategories, currentScale, taxonomy) {
        if (taxonomy.bySuperGroup && Object.keys(taxonomy.bySuperGroup).length > 0) {
            return this.buildSuperGroupCategoriesHTML(currentScale, taxonomy);
        }

        let html = '';
        const byFamily = taxonomy.byFamily || {};
        const byScale = taxonomy.byScale || {};
        const familyOrder = taxonomy.familyOrder || Object.keys(byFamily);
        const commonCore = taxonomy.commonCore || [];

        const commonByFamily = {};
        commonCore.forEach(scaleId => {
            const family = byScale[scaleId]?.family || 'Other/Unclassified';
            if (!commonByFamily[family]) commonByFamily[family] = [];
            commonByFamily[family].push(scaleId);
        });

        Object.entries(commonByFamily).forEach(([family, scales]) => {
            const categoryId = (`common-${family}`).replace(/[^a-z0-9]/gi, '-').toLowerCase();
            html += `
                <div class="category-box expanded" data-view="common" data-category="${categoryId}">
                    <div class="category-header">
                        <span class="category-name">${family}</span>
                        <span class="category-count">${scales.length}</span>
                    </div>
                    <div class="category-scales" id="scales-${categoryId}" style="display: block;">
                        ${scales.map(scaleId => {
                            const displayName = this.getScaleDisplayName(scaleId);
                            const isActive = scaleId === currentScale ? 'active' : '';
                            return `<div class="scale-item ${isActive}" data-scale="${scaleId}">${displayName}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        familyOrder.forEach(category => {
            const familyData = byFamily[category];
            if (!familyData || !familyData.subcategories) return;
            const categoryId = category.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const subcategoryHTML = Object.entries(familyData.subcategories).map(([subcategory, subBucket]) => {
                const subSubHTML = Object.entries(subBucket.subSubcategories || {}).map(([ssName, node]) => {
                    const ssLabel = ssName !== 'Standard' ? `<div class="sub-sub-label">${ssName}</div>` : '';
                    return `
                        <div class="sub-sub-block">
                            ${ssLabel}
                            ${this.renderRecursiveTaxonomy(node, byScale, currentScale)}
                        </div>
                    `;
                }).join('');

                return `
                    <div class="subcategory-block">
                        <div class="subcategory-title">${subcategory}</div>
                        ${subSubHTML}
                    </div>
                `;
            }).join('');

            const allScaleCount = Object.values(familyData.subcategories).reduce((sum, subBucket) => {
                return sum + Object.values(subBucket.subSubcategories || {}).reduce((inner, node) => inner + this.flattenIds(node).length, 0);
            }, 0);

            html += `
                <div class="category-box" data-view="tree" data-category="${categoryId}" style="display: none;">
                    <div class="category-header">
                        <span class="category-name">${category}</span>
                        <span class="category-count">${allScaleCount}</span>
                    </div>
                    <div class="category-scales" id="scales-${categoryId}" style="display: none;">
                        ${subcategoryHTML}
                    </div>
                </div>
            `;
        });

        return html;
    }

    buildSuperGroupCategoriesHTML(currentScale, taxonomy) {
        let html = '';
        const bySuperGroup = taxonomy.bySuperGroup || {};
        const byScale = taxonomy.byScale || {};
        const commonCore = taxonomy.commonCore || [];
        const superGroupOrder = taxonomy.superGroupOrder || Object.keys(bySuperGroup);

        const commonByGroup = {};
        commonCore.forEach(scaleId => {
            const group = byScale[scaleId]?.superGroup || 'Synthetic / Experimental';
            if (!commonByGroup[group]) commonByGroup[group] = [];
            commonByGroup[group].push(scaleId);
        });

        Object.entries(commonByGroup).forEach(([group, scales]) => {
            const groupId = (`common-${group}`).replace(/[^a-z0-9]/gi, '-').toLowerCase();
            html += `
                <div class="category-box expanded" data-view="common" data-category="${groupId}">
                    <div class="category-header">
                        <span class="category-name">${group}</span>
                        <span class="category-count">${scales.length}</span>
                    </div>
                    <div class="category-scales" id="scales-${groupId}" style="display:block;">
                        ${scales.map(scaleId => {
                            const displayName = this.getScaleDisplayName(scaleId);
                            const isActive = scaleId === currentScale ? 'active' : '';
                            return `<div class="scale-item ${isActive}" data-scale="${scaleId}">${displayName}</div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        });

        superGroupOrder.forEach(superGroup => {
            const groupBucket = bySuperGroup[superGroup];
            if (!groupBucket || !groupBucket.categories) return;
            const superGroupId = superGroup.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            
            const categoryRows = Object.entries(groupBucket.categories).map(([categoryName, categoryBucket]) => {
                const categoryId = `${superGroupId}-${categoryName}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                
                const subRows = Object.entries(categoryBucket.subcategories || {}).map(([subName, subBucket]) => {
                    const subSubRows = Object.entries(subBucket.subSubcategories || {}).map(([ssName, node]) => {
                        return `
                            <div class="sub-sub-block">
                                <div class="sub-sub-label">${ssName}</div>
                                ${this.renderRecursiveTaxonomy(node, byScale, currentScale)}
                            </div>
                        `;
                    }).join('');

                    return `
                        <div class="subcategory-block">
                            <div class="subcategory-title">${subName}</div>
                            ${subSubRows}
                        </div>
                    `;
                }).join('');

                const categoryCount = Object.values(categoryBucket.subcategories || {}).reduce((sum, subBucket) => {
                    return sum + Object.values(subBucket.subSubcategories || {}).reduce((inner, node) => inner + this.flattenIds(node).length, 0);
                }, 0);

                return `
                    <div class="nested-category-box" data-category-box="${categoryId}">
                        <div class="nested-category-header" data-category-header="${categoryId}">
                            <span>${categoryName}</span>
                            <span class="category-count">${categoryCount}</span>
                        </div>
                        <div class="nested-category-content" id="nested-${categoryId}" style="display:none;">
                            ${subRows}
                        </div>
                    </div>
                `;
            }).join('');

            const groupCount = Object.values(groupBucket.categories).reduce((sum, categoryBucket) => {
                return sum + Object.values(categoryBucket.subcategories || {}).reduce((inner, subBucket) => {
                    return inner + Object.values(subBucket.subSubcategories || {}).reduce((ssSum, ids) => ssSum + ids.length, 0);
                }, 0);
            }, 0);

            html += `
                <div class="category-box" data-view="special" data-category="${superGroupId}" style="display:none;">
                    <div class="category-header">
                        <span class="category-name">${superGroup}</span>
                        <span class="category-count">${groupCount}</span>
                    </div>
                    <div class="category-scales" id="scales-${superGroupId}" style="display:none;">
                        ${categoryRows}
                    </div>
                </div>
            `;
        });

        return html;
    }
    
    attachEventListeners(scaleCategories, currentScale) {
        // Key selector
        const keySelect = document.getElementById('key-select');
        if (keySelect) {
            keySelect.addEventListener('change', (e) => {
                this.setKey(e.target.value);
            });
        }
        
        // Open modal button
        const pickerBtn = document.getElementById('scale-picker-btn');
        const modal = document.getElementById('scale-picker-modal');
        
        if (pickerBtn && modal) {
            pickerBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
                // Focus search input when modal opens
                setTimeout(() => {
                    const searchInput = document.getElementById('scale-search-input');
                    if (searchInput) searchInput.focus();
                }, 100);
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('scale-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                this.filterScales(query);
            });
        }

        document.querySelectorAll('.scale-view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.scale-view-tab').forEach(other => other.classList.remove('active'));
                tab.classList.add('active');
                const view = tab.dataset.view;
                document.querySelectorAll('.category-box').forEach(box => {
                    const visible = box.dataset.view === view;
                    box.style.display = visible ? 'block' : 'none';
                    if (!visible) return;
                    const categoryId = box.dataset.category;
                    const scalesDiv = document.getElementById(`scales-${categoryId}`);
                    if (scalesDiv) {
                        scalesDiv.style.display = view === 'common' ? 'block' : 'none';
                    }
                    if (view === 'families') {
                        box.classList.remove('expanded');
                    } else {
                        box.classList.add('expanded');
                    }
                });
            });
        });
        
        // Close modal button
        const closeBtn = document.getElementById('close-modal-btn');
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                // Clear search when closing
                if (searchInput) {
                    searchInput.value = '';
                    this.filterScales('');
                }
            });
        }
        
        // Close on backdrop click
        const backdrop = modal?.querySelector('.modal-backdrop');
        if (backdrop && modal) {
            backdrop.addEventListener('click', () => {
                modal.style.display = 'none';
                if (searchInput) {
                    searchInput.value = '';
                    this.filterScales('');
                }
            });
        }
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
                if (searchInput) {
                    searchInput.value = '';
                    this.filterScales('');
                }
            }
        });
        
        // Category expansion toggle
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const box = e.target.closest('.category-box');
                if (box.dataset.view === 'common') return;
                const categoryId = box.dataset.category;
                const scalesDiv = document.getElementById(`scales-${categoryId}`);
                
                if (box.classList.contains('expanded')) {
                    box.classList.remove('expanded');
                    scalesDiv.style.display = 'none';
                } else {
                    box.classList.add('expanded');
                    scalesDiv.style.display = 'block';
                }
            });
        });

        document.querySelectorAll('.variation-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const group = e.currentTarget.closest('.variation-group');
                if (group) {
                    group.classList.toggle('expanded');
                }
                const scaleId = e.currentTarget.dataset.scale;
                if (scaleId) {
                    const key = document.getElementById('key-select').value;
                    this.setKeyAndScale(key, scaleId);
                }
            });
        });

        document.querySelectorAll('.nested-category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const content = header.nextElementSibling;
                if (content && content.classList.contains('nested-category-content')) {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? 'block' : 'none';
                    header.querySelector('.picker-icon').textContent = isHidden ? '▲' : '▼';
                }
            });
        });
        
        // Scale selection
        document.querySelectorAll('.scale-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.variation-toggle')) return;
                const scaleId = e.target.dataset.scale;
                if (!scaleId) return;
                const key = document.getElementById('key-select').value;
                this.setKeyAndScale(key, scaleId);
                
                // Close modal after selection
                if (modal) {
                    modal.style.display = 'none';
                    if (searchInput) {
                        searchInput.value = '';
                        this.filterScales('');
                    }
                }
            });
        });

        this.attachModalInteractions();
    }
    
    filterScales(query) {
        const categoryBoxes = document.querySelectorAll('.category-box');
        
        if (!query) {
            const activeView = document.querySelector('.scale-view-tab.active')?.dataset.view || 'common';
            categoryBoxes.forEach(box => {
                const visible = box.dataset.view === activeView;
                box.style.display = visible ? 'block' : 'none';
                const categoryId = box.dataset.category;
                const scalesDiv = document.getElementById(`scales-${categoryId}`);
                if (scalesDiv) {
                    scalesDiv.style.display = box.dataset.view === 'common' ? 'block' : 'none';
                }
                box.classList.toggle('expanded', box.dataset.view === 'common');
                box.querySelectorAll('.variation-group').forEach(group => group.classList.remove('expanded'));
            });
            return;
        }
        
        // Filter scales
        categoryBoxes.forEach(box => {
            const categoryId = box.dataset.category;
            const scalesDiv = document.getElementById(`scales-${categoryId}`);
            const scaleItems = scalesDiv?.querySelectorAll('.scale-item');
            
            let hasVisibleScales = false;
            
            scaleItems?.forEach(item => {
                const scaleName = item.textContent.toLowerCase();
                if (scaleName.includes(query)) {
                    item.style.display = 'block';
                    hasVisibleScales = true;
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Show/hide category based on whether it has matching scales
            if (hasVisibleScales) {
                box.style.display = 'block';
                box.classList.add('expanded');
                if (scalesDiv) scalesDiv.style.display = 'block';
                box.querySelectorAll('.variation-group').forEach(group => {
                    if (group.querySelector('.scale-item[style="display: block;"]')) {
                        group.classList.add('expanded');
                    }
                });
            } else {
                box.style.display = 'none';
            }
        });

        // Hover similarity highlighting (scales sharing exact interval sets)
        const allScaleItems = Array.from(document.querySelectorAll('.scale-item'));
        function getIntervalsFor(id) {
            try {
                return (window.SCALES && window.SCALES.intervals && window.SCALES.intervals[id]) || null;
            } catch (err) {
                return null;
            }
        }

        function arrayEquals(a, b) {
            if (!a || !b) return false;
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
            return true;
        }

        function highlightSimilar(scaleId) {
            const target = getIntervalsFor(scaleId);
            if (!target) return;
            allScaleItems.forEach(el => {
                const id = el.dataset.scale;
                if (!id) return;
                const ints = getIntervalsFor(id);
                if (!ints) return;
                if (arrayEquals(target, ints)) {
                    el.classList.add('similar-highlight');
                }
            });
        }

        function clearSimilar() {
            allScaleItems.forEach(el => el.classList.remove('similar-highlight'));
        }

        allScaleItems.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const id = e.currentTarget.dataset.scale;
                if (!id) return;
                highlightSimilar(id);
            });
            item.addEventListener('mouseleave', () => {
                clearSimilar();
            });
        });
    }

    attachModalInteractions() {
        const modal = document.getElementById('scale-picker-modal');
        const content = modal?.querySelector('.modal-content');
        const header = modal?.querySelector('.modal-header');
        if (!modal || !content || !header) return;
        if (content.dataset.interactionsAttached === 'true') return;
        content.dataset.interactionsAttached = 'true';

        content.style.resize = 'both';
        content.style.overflow = 'hidden';
        content.style.minWidth = '640px';
        content.style.minHeight = '420px';
        content.style.maxWidth = '95vw';
        content.style.maxHeight = '90vh';

        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        header.style.cursor = 'move';
        header.addEventListener('mousedown', (event) => {
            if (event.target && (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON')) return;
            const rect = content.getBoundingClientRect();
            isDragging = true;
            dragOffsetX = event.clientX - rect.left;
            dragOffsetY = event.clientY - rect.top;
            content.style.position = 'fixed';
            content.style.margin = '0';
        });

        document.addEventListener('mousemove', (event) => {
            if (!isDragging) return;
            const nextLeft = Math.max(8, Math.min(window.innerWidth - content.offsetWidth - 8, event.clientX - dragOffsetX));
            const nextTop = Math.max(8, Math.min(window.innerHeight - content.offsetHeight - 8, event.clientY - dragOffsetY));
            content.style.left = `${nextLeft}px`;
            content.style.top = `${nextTop}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
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
