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

        // A lightweight stack so generation systems can temporarily borrow/modulate
        // without permanently mutating the global UI selection.
        this.scaleStack = [];

        this.listeners = new Map();
        this.pianoRenderer = null;

        this.initialize();

        // Rely on `musicTheory.scales` being provided by the centralized `scales.js` module
        // The engine should attach `scales` and `scalesMeta` during initialization.
    }

    /**
     * Ensure the requested scale exists in the underlying engine without changing UI state.
     */
    ensureScaleAvailable(scale) {
        try {
            if (this.musicTheory && typeof this.musicTheory.ensureScale === 'function') {
                return !!this.musicTheory.ensureScale(scale);
            }
        } catch (_) {}
        return !!(this.musicTheory && this.musicTheory.scales && this.musicTheory.scales[scale]);
    }

    /**
     * Non-mutating scale note lookup (key-signature aware).
     */
    getScaleNotesFor(key, scale) {
        if (!key || !scale) return [];
        this.ensureScaleAvailable(scale);
        try {
            return this.musicTheory.getScaleNotesWithKeySignature(key, scale) || [];
        } catch (_) {
            try { return this.musicTheory.getScaleNotes(key, scale) || []; } catch (_) {}
        }
        return [];
    }

    /**
     * Push a temporary key/scale onto a stack, set it active, and optionally suppress re-render.
     */
    pushKeyAndScale(key, scale, { silent = true } = {}) {
        this.scaleStack.push({
            currentKey: this.state.currentKey,
            currentScale: this.state.currentScale,
            selectedNotes: Array.isArray(this.state.selectedNotes) ? this.state.selectedNotes.slice() : []
        });

        if (silent) {
            // Do the minimal validation/scale ensuring without UI churn
            this.ensureScaleAvailable(scale);
            this.state.currentKey = key;
            this.state.currentScale = scale;
            this.state.selectedNotes = [];
            this.emit('scaleChanged', { key, scale, notes: this.getCurrentScaleNotes() });
            return;
        }

        this.setKeyAndScale(key, scale);
    }

    /**
     * Pop a temporary key/scale from the stack.
     */
    popKeyAndScale({ silent = true } = {}) {
        const prev = this.scaleStack.pop();
        if (!prev) return;

        if (silent) {
            this.state.currentKey = prev.currentKey;
            this.state.currentScale = prev.currentScale;
            this.state.selectedNotes = prev.selectedNotes || [];
            this.emit('scaleChanged', { key: this.state.currentKey, scale: this.state.currentScale, notes: this.getCurrentScaleNotes() });
            return;
        }

        this.setKeyAndScale(prev.currentKey, prev.currentScale);
    }

    /**
     * Run a function inside a temporary key/scale context.
     */
    withTempKeyAndScale(key, scale, fn, { silent = true } = {}) {
        this.pushKeyAndScale(key, scale, { silent });
        try {
            return fn();
        } finally {
            this.popKeyAndScale({ silent });
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
        const pedagogicalCore = ['major', 'ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'minor', 'locrian'];
        const getScaleRank = (scaleId) => {
            const id = String(scaleId || '').toLowerCase();
            const coreIdx = pedagogicalCore.indexOf(id);
            if (coreIdx !== -1) return coreIdx;

            const info = taxonomyByScale && taxonomyByScale[id];
            const rows = Array.isArray(info) ? info : (info ? [info] : []);
            if (rows.length) {
                const primary = rows.find(row => row && row.isPrimary) || rows[0];
                if (primary && typeof primary.displayOrder === 'number') {
                    return 100 + primary.displayOrder;
                }
            }
            return 9999;
        };
        
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
        roots.sort((a, b) => {
            const rankDiff = getScaleRank(a) - getScaleRank(b);
            if (rankDiff !== 0) return rankDiff;
            return this.getScaleDisplayName(a).localeCompare(this.getScaleDisplayName(b));
        });
        roots.forEach(rootId => {
            const variants = groups.get(rootId);
            if (variants) {
                variants.sort((a, b) => {
                    const rankDiff = getScaleRank(a) - getScaleRank(b);
                    if (rankDiff !== 0) return rankDiff;
                    return this.getScaleDisplayName(a).localeCompare(this.getScaleDisplayName(b));
                });
            }
        });
        return { roots, groups };
    }

    renderRecursiveTaxonomy(node, byScale, currentScale) {
        const unwrapContainerNode = (n) => {
            if (!n || typeof n !== 'object' || Array.isArray(n)) return n;
            // If a node is just a container wrapper (common in taxonomy buckets), unwrap it.
            // This prevents UI headers like "subSubcategories" and empty hubs.
            const keys = Object.keys(n);
            if (keys.length === 1) {
                if (n.subSubcategories) return n.subSubcategories;
                if (n.subcategories) return n.subcategories;
                if (n.categories) return n.categories;
            }
            return n;
        };

        const isWrapperLabel = (label) => {
            const s = (label == null) ? '' : String(label).trim();
            if (!s) return true;
            const lower = s.toLowerCase();
            // Labels that usually indicate a structural wrapper rather than a meaningful category
            if (lower === 'subsubcategories' || lower === 'subcategories' || lower === 'categories') return true;
            // Treat "Other" as a wrapper when it's the only child (avoids Other->Other click chains)
            if (lower === 'other') return true;
            return false;
        };

        const collapseSingleWrapper = (n) => {
            // Repeatedly collapse single-entry wrapper objects.
            let cur = n;
            for (let i = 0; i < 6; i++) {
                cur = unwrapContainerNode(cur);
                if (!cur || typeof cur !== 'object' || Array.isArray(cur)) break;
                const entries = Object.entries(cur);
                if (entries.length !== 1) break;
                const [label, next] = entries[0];
                if (!isWrapperLabel(label)) break;
                cur = next;
            }
            return unwrapContainerNode(cur);
        };

        node = collapseSingleWrapper(node);

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

        return Object.entries(node || {}).map(([label, nextNode]) => {
            nextNode = collapseSingleWrapper(nextNode);

            // If this entry is a wrapper key, inline it (no extra click layer)
            if (isWrapperLabel(label)) {
                return this.renderRecursiveTaxonomy(nextNode, byScale, currentScale);
            }

            const safeLabel = String(label).trim();
            const subId = `nested-${safeLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Math.floor(Math.random() * 1000)}`;
            return `
                <div class="nested-category-box">
                    <div class="nested-category-header" data-category-header="${subId}">
                        <span>${safeLabel}</span>
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
     * Label shown in the top picker button.
     * Includes key + scale so users can see both at a glance.
     */
    getCurrentScaleLabel() {
        const scaleName = this.getScaleDisplayName(this.getCurrentScale());
        const keyName = this.getCurrentKey() || 'C';
        return `${keyName} ${scaleName}`;
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
        const currentScaleLabel = this.getCurrentScaleLabel();
        const scaleCategories = this.musicTheory.getScaleCategories();
        const taxonomy = this.getTaxonomyMeta();
        if (document.getElementById('scale-picker-modal') && this.container.innerHTML.includes('scale-picker-modal')) {
            const nameSpan = document.querySelector('#scale-picker-btn > span.current-scale-name') || document.querySelector('#scale-picker-btn .current-scale-name');
            if (nameSpan) nameSpan.textContent = currentScaleLabel;
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
                        <span class="current-scale-name">${currentScaleLabel}</span>
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
                    font-size: 0.92rem;
                    color: #f8fafc;
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

                /* Pyramid (Upside Down Tree) Styles — used by the Family Tree tab */
                .categories-grid.pyramid-view {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 22px;
                    padding: 22px 18px;
                }

                /* Fallout-style Special View (horizontal columns) */
                .categories-grid.special-view {
                    padding: 18px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: row;
                    gap: 14px;
                    align-items: stretch;
                }

                #scale-special-view {
                    display: none;
                    flex-direction: row;
                    gap: 14px;
                    width: 100%;
                    height: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding-bottom: 6px;
                }

                .special-column {
                    flex: 0 0 260px;
                    min-width: 240px;
                    max-width: 320px;
                    background: var(--bg-panel);
                    border: 1px solid var(--border-light);
                    border-radius: 10px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .special-header {
                    padding: 10px 12px;
                    background: var(--bg-app);
                    border-bottom: 1px solid var(--border-light);
                    font-weight: 700;
                    font-size: 0.85rem;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }

                .special-header-icon {
                    opacity: 0.9;
                }

                .special-content {
                    padding: 10px 10px 12px 10px;
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .special-cat {
                    border: 1px solid var(--border-light);
                    border-radius: 8px;
                    margin-bottom: 10px;
                    overflow: hidden;
                    background: rgba(255,255,255,0.01);
                }

                .special-cat-title {
                    padding: 8px 10px;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.76rem;
                    opacity: 0.9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: var(--bg-app);
                    border-bottom: 1px solid var(--border-light);
                }

                .special-cat-title:hover {
                    background: var(--bg-hover);
                }

                .special-cat-items {
                    display: none;
                }

                .special-item.scale-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }

                .pyramid-container {
                    width: 100%;
                }

                .pyramid-row {
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 12px;
                    width: 100%;
                }

                .pyramid-node {
                    background: var(--bg-panel);
                    border: 1px solid var(--border-light);
                    padding: 10px 14px;
                    border-radius: 8px;
                    text-align: center;
                    min-width: 140px;
                    cursor: pointer;
                    transition: background 0.15s ease, border-color 0.15s ease;
                    position: relative;
                    user-select: none;
                }

                .pyramid-node:hover {
                    background: var(--bg-hover);
                    border-color: var(--accent-primary);
                }

                .pyramid-node.root {
                    border-width: 2px;
                    border-color: var(--accent-primary);
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }

                .pyramid-submenu {
                    margin-top: 10px;
                    text-align: left;
                    background: var(--bg-app);
                    border: 1px solid var(--border-light);
                    border-radius: 8px;
                    overflow: hidden;
                    max-height: 32vh;
                    overflow-y: auto;
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
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

        const applyScalePickerView = (view) => {
            const grid = document.querySelector('#scale-picker-modal .categories-grid');
            const pyramid = document.getElementById('scale-pyramid-tree');
            const special = document.getElementById('scale-special-view');

            // Default: list view (category boxes)
            if (grid) grid.classList.remove('pyramid-view');
            if (grid) grid.classList.remove('special-view');
            if (pyramid) pyramid.style.display = 'none';
            if (special) special.style.display = 'none';

            // Toggle category boxes for the requested view
            document.querySelectorAll('.category-box').forEach(box => {
                const visible = box.dataset.view === view;
                box.style.display = visible ? 'block' : 'none';
                if (!visible) return;
                const categoryId = box.dataset.category;
                const scalesDiv = document.getElementById(`scales-${categoryId}`);
                if (scalesDiv) {
                    scalesDiv.style.display = (view === 'common') ? 'block' : 'none';
                }
                box.classList.toggle('expanded', view === 'common');

                // Special View should never auto-expand by default
                if (view === 'special') {
                    box.classList.remove('expanded');
                    if (scalesDiv) scalesDiv.style.display = 'none';
                    box.querySelectorAll('.nested-category-content').forEach(el => { el.style.display = 'none'; });
                    box.querySelectorAll('.variation-group').forEach(group => group.classList.remove('expanded'));
                }
            });

            // Family Tree: render pyramid view instead of category boxes
            if (view === 'tree') {
                this._ensurePyramidFamilyTreeRendered(currentScale);
                if (grid) grid.classList.add('pyramid-view');
                // Hide boxes so the pyramid owns the view
                document.querySelectorAll('.category-box').forEach(box => { box.style.display = 'none'; });
                const pyramidNow = document.getElementById('scale-pyramid-tree');
                if (pyramidNow) pyramidNow.style.display = 'block';
            }

            // Special View: Fallout-style columns (owned by a dedicated container)
            if (view === 'special') {
                this._ensureFalloutSpecialViewRendered(currentScale);
                if (grid) grid.classList.add('special-view');
                document.querySelectorAll('.category-box').forEach(box => { box.style.display = 'none'; });
                const specialNow = document.getElementById('scale-special-view');
                if (specialNow) specialNow.style.display = 'flex';
            }
        };

        document.querySelectorAll('.scale-view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.scale-view-tab').forEach(other => other.classList.remove('active'));
                tab.classList.add('active');
                const view = tab.dataset.view;
                applyScalePickerView(view);
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

        // Sync initial tab state (Family Tree should start in pyramid mode)
        try {
            const initialView = document.querySelector('.scale-view-tab.active')?.dataset.view || 'tree';
            applyScalePickerView(initialView);
        } catch (_) {}
    }

    _ensurePyramidFamilyTreeRendered(currentScale) {
        const grid = document.querySelector('#scale-picker-modal .categories-grid');
        if (!grid) return;

        // Create-once; re-render contents each time to reflect current scale selection
        let root = document.getElementById('scale-pyramid-tree');
        if (!root) {
            root = document.createElement('div');
            root.id = 'scale-pyramid-tree';
            root.className = 'pyramid-container';
            root.style.width = '100%';
            root.style.display = 'none';
            grid.appendChild(root);

            // Event delegation for dynamically rendered pyramid content
            root.addEventListener('click', (e) => {
                const modal = document.getElementById('scale-picker-modal');
                const searchInput = document.getElementById('scale-search-input');

                const nestedHeader = e.target.closest('.nested-category-header');
                if (nestedHeader && root.contains(nestedHeader)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const content = nestedHeader.nextElementSibling;
                    if (content && content.classList.contains('nested-category-content')) {
                        const isHidden = content.style.display === 'none';
                        content.style.display = isHidden ? 'block' : 'none';
                        const icon = nestedHeader.querySelector('.picker-icon');
                        if (icon) icon.textContent = isHidden ? '▲' : '▼';
                    }
                    return;
                }

                const variationToggle = e.target.closest('.variation-toggle');
                if (variationToggle && root.contains(variationToggle)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const group = variationToggle.closest('.variation-group');
                    if (group) group.classList.toggle('expanded');
                    const scaleId = variationToggle.dataset.scale;
                    if (scaleId) {
                        const key = document.getElementById('key-select').value;
                        this.setKeyAndScale(key, scaleId);
                    }
                    return;
                }

                const scaleItem = e.target.closest('.scale-item');
                if (scaleItem && root.contains(scaleItem) && !scaleItem.closest('.variation-toggle')) {
                    const scaleId = scaleItem.dataset.scale;
                    if (!scaleId) return;
                    const key = document.getElementById('key-select').value;
                    this.setKeyAndScale(key, scaleId);
                    if (modal) {
                        modal.style.display = 'none';
                        if (searchInput) {
                            searchInput.value = '';
                            this.filterScales('');
                        }
                    }
                    return;
                }
            });
        }

        const taxonomy = this.getTaxonomyMeta();
        const byFamily = taxonomy.byFamily || {};
        const byScale = taxonomy.byScale || {};
        const familyOrder = Array.isArray(taxonomy.familyOrder) ? taxonomy.familyOrder : Object.keys(byFamily);

        // Prefer the explicitly named tree family; fall back to the first family.
        const treeFamily = byFamily['1. The Family Tree'] || byFamily['The Family Tree'] || byFamily[Object.keys(byFamily)[0]];
        const branches = treeFamily && treeFamily.categories ? treeFamily.categories : {};

        const familyKeys = Object.keys(byFamily || {});
        const otherFamilies = familyOrder
            .filter(name => familyKeys.includes(name))
            .filter(name => name !== '1. The Family Tree' && name !== 'The Family Tree')
            .filter(name => !/special/i.test(name));

        const toTreeObj = (familyBucket) => {
            const result = {};
            const cats = familyBucket?.categories || {};
            Object.entries(cats).forEach(([catName, catBucket]) => {
                const subcats = catBucket?.subcategories || {};
                Object.entries(subcats).forEach(([subName, subBucket]) => {
                    // Keep structure similar to buildCategoriesHTML: subName -> subSubcategories
                    result[`${catName} :: ${subName}`] = (subBucket && subBucket.subSubcategories) ? subBucket.subSubcategories : {};
                });
            });
            if (Object.keys(result).length) return result;

            // Fallback: some taxonomies don't use "categories" at the family level
            const subcats = familyBucket?.subcategories || {};
            Object.entries(subcats).forEach(([subName, subBucket]) => {
                result[subName] = (subBucket && subBucket.subSubcategories) ? subBucket.subSubcategories : {};
            });
            return result;
        };

        // Build pyramid DOM
        root.innerHTML = '';

        const createEl = (tag, className, text) => {
            const el = document.createElement(tag);
            if (className) el.className = className;
            if (typeof text === 'string') el.textContent = text;
            return el;
        };

        const normalizeTaxonomyNode = (bucket) => {
            if (!bucket) return {};
            if (Array.isArray(bucket)) return bucket;
            // Prefer the most meaningful container first
            if (bucket.subSubcategories) return bucket.subSubcategories;
            if (bucket.subcategories) return bucket.subcategories;
            if (bucket.categories) return bucket.categories;
            return bucket;
        };

        const rootRow = createEl('div', 'pyramid-row');
        const rootNode = createEl('div', 'pyramid-node root', this.getScaleDisplayName('major').toUpperCase());
        rootNode.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const key = document.getElementById('key-select').value;
            this.setKeyAndScale(key, 'major');
            const modal = document.getElementById('scale-picker-modal');
            const searchInput = document.getElementById('scale-search-input');
            if (modal) {
                modal.style.display = 'none';
                if (searchInput) {
                    searchInput.value = '';
                    this.filterScales('');
                }
            }
        });
        rootRow.appendChild(rootNode);
        root.appendChild(rootRow);

        const branchPedagogyRank = (label) => {
            const lower = String(label || '').toLowerCase();
            if (lower.includes('major')) return -40;
            if (lower.includes('church') || lower.includes('mode')) return -30;
            if (lower.includes('minor')) return -20;
            if (lower.includes('hybrid')) return -10;

            const bucket = branches[label] || {};
            const ids = this.flattenIds(normalizeTaxonomyNode(bucket));
            if (!ids.length) return 9999;

            let minDisplayOrder = Number.POSITIVE_INFINITY;
            ids.forEach((scaleId) => {
                const info = byScale && byScale[scaleId];
                const rows = Array.isArray(info) ? info : (info ? [info] : []);
                rows.forEach((row) => {
                    if (row && typeof row.displayOrder === 'number') {
                        minDisplayOrder = Math.min(minDisplayOrder, row.displayOrder);
                    }
                });
            });

            return Number.isFinite(minDisplayOrder) ? minDisplayOrder : 9999;
        };

        const keys = Object.keys(branches || {}).sort((a, b) => {
            const rankDiff = branchPedagogyRank(a) - branchPedagogyRank(b);
            if (rankDiff !== 0) return rankDiff;
            return a.localeCompare(b);
        });

        const branchRow = createEl('div', 'pyramid-row');
        keys.forEach(label => {
            const node = createEl('div', 'pyramid-node', label);
            const submenu = createEl('div', 'pyramid-submenu');
            submenu.style.display = 'none';

            // Render whatever taxonomy shape exists for this hub.
            // (Earlier versions assumed subcategories->subSubcategories and often produced an empty menu.)
            const bucket = branches[label] || {};
            const normalized = normalizeTaxonomyNode(bucket);
            submenu.innerHTML = this.renderRecursiveTaxonomy(normalized, byScale, currentScale);

            node.addEventListener('click', (e) => {
                e.preventDefault();
                // If the click happened inside the open submenu, do not toggle the hub.
                // This allows nested dropdown headers + scale clicks to work.
                if (submenu.contains(e.target)) return;

                e.stopPropagation();
                submenu.style.display = (submenu.style.display === 'none') ? 'block' : 'none';
            });

            node.appendChild(submenu);
            branchRow.appendChild(node);
        });
        root.appendChild(branchRow);

        // Extra pyramid row: other families for broader navigation (kept collapsed)
        if (otherFamilies.length) {
            const otherRow = createEl('div', 'pyramid-row');
            otherFamilies.forEach(famName => {
                const famNode = createEl('div', 'pyramid-node', famName);
                const famMenu = createEl('div', 'pyramid-submenu');
                famMenu.style.display = 'none';

                try {
                    const treeObj = toTreeObj(byFamily[famName]);
                    famMenu.innerHTML = this.renderRecursiveTaxonomy(treeObj, byScale, currentScale);
                } catch (_) {
                    famMenu.innerHTML = '';
                }

                famNode.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (famMenu.contains(e.target)) return;

                    e.stopPropagation();
                    famMenu.style.display = (famMenu.style.display === 'none') ? 'block' : 'none';
                });

                famNode.appendChild(famMenu);
                otherRow.appendChild(famNode);
            });
            root.appendChild(otherRow);
        }
    }

    _ensureFalloutSpecialViewRendered(currentScale) {
        const grid = document.querySelector('#scale-picker-modal .categories-grid');
        if (!grid) return;

        let root = document.getElementById('scale-special-view');
        if (!root) {
            root = document.createElement('div');
            root.id = 'scale-special-view';
            root.style.display = 'none';
            grid.appendChild(root);

            // Event delegation for special view
            root.addEventListener('click', (e) => {
                const modal = document.getElementById('scale-picker-modal');
                const searchInput = document.getElementById('scale-search-input');

                const catTitle = e.target.closest('.special-cat-title');
                if (catTitle && root.contains(catTitle)) {
                    e.preventDefault();
                    e.stopPropagation();
                    const cat = catTitle.closest('.special-cat');
                    const items = cat ? cat.querySelector('.special-cat-items') : null;
                    if (items) {
                        const isHidden = items.style.display === 'none' || !items.style.display;
                        items.style.display = isHidden ? 'block' : 'none';
                        const icon = catTitle.querySelector('.picker-icon');
                        if (icon) icon.textContent = isHidden ? '▲' : '▼';
                    }
                    return;
                }

                const scaleItem = e.target.closest('.scale-item');
                if (scaleItem && root.contains(scaleItem) && !scaleItem.closest('.variation-toggle')) {
                    const scaleId = scaleItem.dataset.scale;
                    if (!scaleId) return;
                    const key = document.getElementById('key-select').value;
                    this.setKeyAndScale(key, scaleId);
                    if (modal) {
                        modal.style.display = 'none';
                        if (searchInput) {
                            searchInput.value = '';
                            this.filterScales('');
                        }
                    }
                }
            });
        }

        const taxonomy = this.getTaxonomyMeta();
        const byFamily = taxonomy.byFamily || {};
        const byScale = taxonomy.byScale || {};
        const familyOrder = taxonomy.familyOrder || Object.keys(byFamily);

        // No emoji icons
        const falloutIcons = ['', '', '', '', '', '', '', '', '', ''];

        const createId = (prefix, label) => {
            const safe = String(label).replace(/[^a-z0-9]/gi, '-').toLowerCase();
            return `${prefix}-${safe}-${Math.floor(Math.random() * 100000)}`;
        };

        const renderScaleItems = (ids) => {
            return ids.map(id => {
                const displayName = this.getScaleDisplayName(id);
                const isActive = id === currentScale ? 'active' : '';
                return `<div class="scale-item special-item ${isActive}" data-scale="${id}">${String(displayName).toUpperCase()}</div>`;
            }).join('');
        };

        const renderDeep = (obj) => {
            if (!obj) return '';
            const items = obj.categories || obj.subcategories || obj.subSubcategories || obj;
            const keys = Object.keys(items).sort((a, b) => a.localeCompare(b));
            let html = '';
            keys.forEach((k) => {
                const v = items[k];
                if (Array.isArray(v)) {
                    html += renderScaleItems(v);
                } else {
                    html += `<div class="subcategory-title">${k}</div>`;
                    html += `<div class="sub-sub-block">${renderDeep(v)}</div>`;
                }
            });
            return html;
        };

        const renderSectionsCollapsed = (obj) => {
            if (!obj) return '';
            const items = obj.categories || obj.subcategories || obj.subSubcategories || obj;
            const keys = Object.keys(items).sort((a, b) => a.localeCompare(b));
            return keys.map((k) => {
                const v = items[k];
                const sectionId = createId('specialcat', k);
                const body = Array.isArray(v) ? renderScaleItems(v) : renderDeep(v);
                return `
                    <div class="special-cat" data-special-cat="${sectionId}">
                        <div class="special-cat-title" data-special-cat-title="${sectionId}">
                            <span>[ ${k} ]</span>
                            <span class="picker-icon">▼</span>
                        </div>
                        <div class="special-cat-items" id="special-items-${sectionId}" style="display:none;">
                            ${body}
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Render columns
        root.innerHTML = '';
        familyOrder.forEach((familyName, idx) => {
            const bucket = byFamily[familyName];
            if (!bucket) return;

            const icon = falloutIcons[idx % falloutIcons.length];
            const column = document.createElement('div');
            column.className = 'special-column';

            const header = document.createElement('div');
            header.className = 'special-header';
            header.innerHTML = `${icon ? `<span class="special-header-icon">${icon}</span> ` : ''}${String(familyName)}`;
            column.appendChild(header);

            const content = document.createElement('div');
            content.className = 'special-content';

            // Prefer richer category layout if present, otherwise fall back to whatever the bucket provides
            try {
                const catObj = bucket.categories ? bucket.categories : bucket;
                content.innerHTML = renderSectionsCollapsed(catObj);
            } catch (_) {
                content.innerHTML = '';
            }

            column.appendChild(content);
            root.appendChild(column);
        });
    }
    
    filterScales(query) {
        const activeView = document.querySelector('.scale-view-tab.active')?.dataset.view || 'common';
        const categoryBoxes = document.querySelectorAll('.category-box');

        const setMatches = (rootEl, q) => {
            if (!rootEl) return [];
            const items = Array.from(rootEl.querySelectorAll('.scale-item'));
            if (!q) {
                items.forEach(el => { el.style.display = 'block'; });
                return items;
            }
            items.forEach(el => {
                const name = String(el.textContent || '').toLowerCase();
                el.style.display = name.includes(q) ? 'block' : 'none';
            });
            return items;
        };

        const expandVariationGroups = (rootEl) => {
            if (!rootEl) return;
            rootEl.querySelectorAll('.variation-group').forEach(group => {
                const hasVisible = !!group.querySelector('.scale-item[style*="display: block"]');
                group.classList.toggle('expanded', hasVisible);
            });
        };

        const expandNestedCategories = (rootEl) => {
            if (!rootEl) return;
            rootEl.querySelectorAll('.nested-category-box').forEach(box => {
                const content = box.querySelector('.nested-category-content');
                const header = box.querySelector('.nested-category-header');
                const hasVisible = !!box.querySelector('.scale-item[style*="display: block"]');
                if (content) content.style.display = hasVisible ? 'block' : 'none';
                if (header) {
                    const icon = header.querySelector('.picker-icon');
                    if (icon) icon.textContent = hasVisible ? '▲' : '▼';
                }
                box.style.display = hasVisible ? 'block' : 'none';
            });
        };

        const applyTreeFilter = (q) => {
            const pyramid = document.getElementById('scale-pyramid-tree');
            if (!pyramid) return;

            // Reset visibility first
            pyramid.querySelectorAll('.pyramid-node').forEach(node => { node.style.display = ''; });
            pyramid.querySelectorAll('.pyramid-submenu').forEach(menu => { menu.style.display = 'none'; });

            setMatches(pyramid, q);
            expandVariationGroups(pyramid);
            expandNestedCategories(pyramid);

            // Show only hubs that contain matches; auto-open their menus
            pyramid.querySelectorAll('.pyramid-node').forEach(node => {
                const menu = node.querySelector(':scope > .pyramid-submenu');
                if (!menu) return;
                const hasVisible = !!menu.querySelector('.scale-item[style*="display: block"]');
                menu.style.display = hasVisible ? 'block' : 'none';
                node.style.display = hasVisible ? '' : 'none';
            });

            // Keep root visible regardless
            const rootNode = pyramid.querySelector('.pyramid-node.root');
            if (rootNode) rootNode.style.display = '';
        };

        const applySpecialFilter = (q) => {
            const special = document.getElementById('scale-special-view');
            if (!special) return;

            // Reset visibility first
            special.querySelectorAll('.special-column').forEach(col => { col.style.display = ''; });
            special.querySelectorAll('.special-cat').forEach(cat => { cat.style.display = ''; });
            special.querySelectorAll('.special-cat-items').forEach(items => { items.style.display = 'none'; });

            setMatches(special, q);

            // Expand/keep only categories with visible matches
            special.querySelectorAll('.special-cat').forEach(cat => {
                const hasVisible = !!cat.querySelector('.scale-item[style*="display: block"]');
                const items = cat.querySelector('.special-cat-items');
                const title = cat.querySelector('.special-cat-title');
                if (items) items.style.display = hasVisible ? 'block' : 'none';
                if (title) {
                    const icon = title.querySelector('.picker-icon');
                    if (icon) icon.textContent = hasVisible ? '▲' : '▼';
                }
                cat.style.display = hasVisible ? '' : 'none';
            });

            // Hide entire columns that end up empty
            special.querySelectorAll('.special-column').forEach(col => {
                const hasVisible = !!col.querySelector('.scale-item[style*="display: block"]');
                col.style.display = hasVisible ? '' : 'none';
            });
        };

        if (!query) {
            // Clear filters and restore view defaults
            if (activeView === 'tree') {
                applyTreeFilter('');
                return;
            }
            if (activeView === 'special') {
                applySpecialFilter('');
                return;
            }

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

        // Active view-aware filtering
        if (activeView === 'tree') {
            applyTreeFilter(query);
            return;
        }
        if (activeView === 'special') {
            applySpecialFilter(query);
            return;
        }

        // Default: filter category boxes (common list view)
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
                    if (group.querySelector('.scale-item[style*="display: block"]')) {
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

        // Attach hover listeners once per element (avoid stacking on every keystroke)
        allScaleItems.forEach(item => {
            if (item.dataset.similarityHoverAttached === 'true') return;
            item.dataset.similarityHoverAttached = 'true';
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
