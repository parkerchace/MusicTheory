/**
 * @module ScaleRelationshipExplorer
 * @description Explorer for finding scales containing a chord and analyzing relationships
 * @exports class ScaleRelationshipExplorer
 */

class ScaleRelationshipExplorer {
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ScaleRelationshipExplorer requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            inputChord: '',
            parsedChord: null,
            containingScales: [],
            relationships: {
                parallel: [],
                fifthAbove: [],
                fifthBelow: [],
                relative: []
            },
            selectedRelationshipFilter: 'all'
        };

        this.containerElement = null;
    }

    mount(selector) {
        this.containerElement = document.querySelector(selector);
        if (!this.containerElement) {
            console.error(`ScaleRelationshipExplorer: Container ${selector} not found`);
            return;
        }
        this.render();
    }

    render() {
        if (!this.containerElement) return;

        this.containerElement.innerHTML = `
            <div class="scale-relationship-explorer" style="padding: 10px; color: var(--text-main);">
                <div class="input-section" style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; color: var(--text-muted); font-size: 0.8rem;">ENTER CHORD</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="sre-chord-input" 
                            value="${this.state.inputChord}" 
                            placeholder="e.g. Cm7, G7, F#maj9"
                            style="flex: 1; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-main); padding: 8px; font-family: var(--font-tech); text-transform: uppercase;">
                        <button id="sre-analyze-btn" style="background: var(--accent-primary); color: #000; border: none; padding: 0 15px; font-weight: bold; cursor: pointer;">ANALYZE</button>
                    </div>
                </div>

                <div id="sre-results">
                    ${this.renderResults()}
                </div>
            </div>
        `;

        // Attach event listeners
        const input = this.containerElement.querySelector('#sre-chord-input');
        const btn = this.containerElement.querySelector('#sre-analyze-btn');

        if (input) {
            input.addEventListener('change', (e) => this.handleInput(e.target.value));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.handleInput(e.target.value);
            });
        }
        if (btn) {
            btn.addEventListener('click', () => {
                if (input) this.handleInput(input.value);
            });
        }
        
        // Bind filter and preview events after DOM is ready
        this.bindFilterEvents();
        this.bindPreviewEvents();
    }

    handleInput(value) {
        this.state.inputChord = value;
        this.analyzeChord(value);
        this.render();
        // Restore focus
        const input = this.containerElement.querySelector('#sre-chord-input');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }

    analyzeChord(chordStr) {
        if (!chordStr) {
            this.state.parsedChord = null;
            this.state.containingScales = [];
            return;
        }

        let root, type, notes;
        
        try {
            // Try to parse root and type
            const match = chordStr.match(/^([A-G][#b]?)(.*)$/i);
            if (match) {
                root = this.normalizeNote(match[1]);
                type = match[2];
                
                // Get notes from engine
                if (this.musicTheory.getChordNotes) {
                    notes = this.musicTheory.getChordNotes(root, type);
                }
            }
        } catch (e) {
            console.error('Error parsing chord:', e);
        }

        if (notes && notes.length > 0) {
            this.state.parsedChord = { root, type, notes };
            this.findContainingScales(notes);
        } else {
            this.state.parsedChord = null;
            this.state.containingScales = [];
        }
    }

    normalizeNote(note) {
        return note.charAt(0).toUpperCase() + (note.slice(1) || '');
    }

    findContainingScales(chordNotes) {
        const allScales = this.getAllScales(); 
        const containing = [];

        // Use engine's note values if available, otherwise fallback
        const getVal = (n) => this.musicTheory.noteValues ? this.musicTheory.noteValues[n] : -1;
        const chordSemis = chordNotes.map(n => getVal(n));
        
        // Get root value for sorting (handle enharmonics)
        const chordRootVal = this.state.parsedChord ? getVal(this.state.parsedChord.root) : -1;

        allScales.forEach(scale => {
            // Filter: Must have a link/citation to be shown
            const citation = this.musicTheory.scaleCitations ? this.musicTheory.scaleCitations[scale.name] : null;
            const hasLink = citation && (citation.url || (citation.references && citation.references.length > 0));
            
            if (!hasLink) return;

            const scaleNotes = this.musicTheory.getScaleNotes(scale.root, scale.name);
            const scaleSemis = scaleNotes.map(n => getVal(n));
            
            // Check if all chord notes are in scale
            const allIn = chordSemis.every(cSemi => scaleSemis.includes(cSemi));
            
            if (allIn) {
                // Calculate complexity score
                let complexity = 10;
                const name = scale.name.toLowerCase();
                if (name === 'major' || name === 'minor') complexity = 1;
                else if (['dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'].includes(name)) complexity = 2;
                else if (name.includes('pentatonic') || name.includes('blues')) complexity = 3;
                else if (name.includes('harmonic') || name.includes('melodic')) complexity = 4;
                else if (name.includes('bebop') || name.includes('diminished') || name.includes('whole')) complexity = 5;
                
                // Calculate relationship tier based on interval from chord root to scale root
                const scaleRootVal = getVal(scale.root);
                const interval = (scaleRootVal - chordRootVal + 12) % 12;
                
                let relationshipTier = 5; // Default (Other)
                let relationshipLabel = 'Related';

                if (interval === 0) {
                    relationshipTier = 1; // Tonic (Same root)
                    relationshipLabel = 'Tonic';
                } else if (interval === 7) {
                    relationshipTier = 2; // Dominant (Perfect 5th above)
                    relationshipLabel = 'Dominant';
                } else if (interval === 5) {
                    relationshipTier = 3; // Subdominant (Perfect 4th above)
                    relationshipLabel = 'Subdominant';
                } else if ([3, 4, 8, 9].includes(interval)) {
                    relationshipTier = 4; // Mediant/Relative (3rds/6ths)
                    relationshipLabel = 'Mediant';
                }

                containing.push({ ...scale, complexity, citation, relationshipTier, relationshipLabel });
            }
        });

        // Sort by Relationship Tier, then Complexity, then Root
        containing.sort((a, b) => {
            if (a.relationshipTier !== b.relationshipTier) return a.relationshipTier - b.relationshipTier;
            if (a.complexity !== b.complexity) return a.complexity - b.complexity;
            return a.root.localeCompare(b.root);
        });

        this.state.containingScales = containing;
    }

    getAllScales() {
        const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        // Get scale types from engine if possible
        const types = Object.keys(this.musicTheory.scales || {});
        
        const scales = [];
        roots.forEach(root => {
            types.forEach(type => {
                scales.push({ root, name: type });
            });
        });
        return scales;
    }

    getScaleVibe(scale) {
        const name = scale.name.toLowerCase();
        
        // Comprehensive vibe mapping
        const vibes = {
            // Western Modes
            'major': 'Bright, Stable, Triumphant',
            'minor': 'Sad, Serious, Emotional',
            'aeolian': 'Melancholic, Epic, Emotional',
            'dorian': 'Soulful, Jazzy, Sophisticated',
            'phrygian': 'Dark, Exotic, Spanish',
            'lydian': 'Dreamy, Ethereal, Floating',
            'mixolydian': 'Bluesy, Rock, Unresolved',
            'locrian': 'Unstable, Tense, Dark',
            
            // Melodic Minor Modes
            'melodic': 'Smooth, Jazz-Noir, Ascending',
            'melodic_minor': 'Smooth, Jazz-Noir, Ascending',
            'dorian_b2': 'Dark Jazz, Phrygian-Dorian',
            'lydian_augmented': 'Mysterious, Spacey, Modern',
            'lydian_dominant': 'Overtone, Acoustic, Bright',
            'mixolydian_b6': 'Melancholic, Romantic, Hindu',
            'locrian_nat2': 'Half-Diminished, Complex',
            'altered': 'Tense, Jazz-Dominant, Resolving',
            
            // Harmonic Minor Modes
            'harmonic': 'Classical, Exotic, Dramatic',
            'harmonic_minor': 'Classical, Exotic, Dramatic',
            'phrygian_dominant': 'Flamenco, Jewish, Intense',
            'harmonic_major': 'Dreamy, Unsettled, Romantic',
            'double_harmonic_major': 'Byzantine, Surf Rock, Exotic',
            
            // Symmetrical & Modern
            'whole_tone': 'Dreamy, Floating, Ambiguous',
            'octatonic_dim': 'Tense, Symmetrical, Diminished',
            'octatonic_dom': 'Bluesy, Symmetrical, Jazz',
            'augmented': 'Unsettled, Floating, Strange',
            'prometheus': 'Mystic, Scriabin, Ethereal',
            'tritone': 'Dissonant, Angular, Modern',
            
            // Pentatonics
            'major_pentatonic': 'Open, Folk, Pastoral',
            'minor_pentatonic': 'Bluesy, Rock, Versatile',
            'blues_minor_pentatonic': 'Gritty, Soulful, Expressive',
            'blues_major_pentatonic': 'Country, Soul, Bright',
            'egyptian_pentatonic': 'Suspended, Ancient, Open',
            
            // World / Ethnic
            'hirajoshi': 'Japanese, Contemplative, Dark',
            'iwato': 'Japanese, Exotic, Sharp',
            'insen': 'Japanese, Melancholic, Traditional',
            'yo': 'Japanese, Bright, Folk',
            'hijaz': 'Middle Eastern, Deep, Passionate',
            'persian': 'Exotic, Chromatic, Intense',
            'spanish_phrygian': 'Flamenco, Passionate, Dark',
            'spanish_gypsy': 'Exotic, Traveling, Minor',
            'hungarian_minor': 'Gypsy, Exotic, Intense',
            
            // Jazz
            'bebop_major': 'Jazz, Chromatic, Passing',
            'bebop_dominant': 'Jazz, Bebop, Fluid',
            'bebop_minor': 'Jazz, Minor, Rhythmic',
            
            // Classical / Other
            'enigmatic': 'Verdi, Strange, Wandering',
            'neapolitan_major': 'Opera, Dramatic, Bright',
            'neapolitan_minor': 'Opera, Dramatic, Dark'
        };

        if (vibes[name]) return vibes[name];

        // Fallback heuristics
        if (name.includes('pentatonic')) return 'Open, Folk, Versatile';
        if (name.includes('blues')) return 'Gritty, Soulful';
        if (name.includes('bebop')) return 'Jazz, Chromatic, Fluid';
        if (name.includes('raga')) return 'Indian Classical, Meditative';
        if (name.includes('maqam')) return 'Arabic, Microtonal, Expressive';
        if (name.includes('diminished')) return 'Tense, Symmetrical';
        if (name.includes('augmented')) return 'Unsettled, Floating';
        if (name.includes('lydian')) return 'Dreamy, Bright';
        if (name.includes('phrygian')) return 'Dark, Exotic';
        if (name.includes('mixolydian')) return 'Dominant, Bluesy';
        
        return 'Unique, Distinctive, Colorful';
    }

    getRomanNumeral(chordRoot, scaleRoot, scaleName) {
        try {
            const scaleNotes = this.musicTheory.getScaleNotes(scaleRoot, scaleName);
            const index = scaleNotes.indexOf(chordRoot);
            if (index === -1) return '?';
            
            const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
            const num = numerals[index];
            
            // Determine if major or minor chord (simple heuristic from parsed chord)
            const isMinor = this.state.parsedChord && (this.state.parsedChord.type.includes('m') && !this.state.parsedChord.type.includes('maj'));
            const isDim = this.state.parsedChord && (this.state.parsedChord.type.includes('dim') || this.state.parsedChord.type.includes('b5'));
            
            if (isDim) return num.toLowerCase() + '°';
            if (isMinor) return num.toLowerCase();
            return num;
        } catch (e) {
            return '?';
        }
    }

    renderResults() {
        if (!this.state.parsedChord) {
            return '<div style="color: var(--text-muted); font-style: italic;">Enter a chord to see containing scales.</div>';
        }

        let html = `
            <div style="margin-bottom: 10px; font-size: 0.9rem;">
                <span style="color: var(--accent-secondary);">Parsed:</span> 
                <strong>${this.state.parsedChord.root}${this.state.parsedChord.type}</strong> 
                <span style="color: var(--text-muted);">[${this.state.parsedChord.notes.join(', ')}]</span>
            </div>
        `;

        if (this.state.containingScales.length === 0) {
            html += '<div style="color: var(--text-muted);">No matching scales found in the library.</div>';
            return html;
        }

        // Quick filters for relationship perspective
        const filters = [
            { key: 'all', label: 'All' },
            { key: 'tonic', label: 'Tonic (0)' },
            { key: 'dominant', label: '5↑ Dominant' },
            { key: 'subdominant', label: '4↑ Subdominant' },
            { key: 'mediant', label: '3/6 Mediant' }
        ];
        html += `<div class="sre-filter-bar" style="display:flex; gap:6px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
            <span style="font-size:0.75rem; color: var(--text-muted);">Quick Filters:</span>
            ${filters.map(f => `
                <button class="sre-filter" data-filter="${f.key}" style="background: ${this.state.selectedRelationshipFilter===f.key ? 'var(--accent-primary)' : 'transparent'}; color: ${this.state.selectedRelationshipFilter===f.key ? '#000' : 'var(--text-muted)'}; border: 1px solid var(--border-light); font-size: 0.75rem; padding: 3px 8px; cursor: pointer; border-radius: 999px;">${f.label}</button>
            `).join('')}
        </div>`;

        html += `<div style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;">`;
        
        // Apply relationship filter then cap results
        const filterKey = this.state.selectedRelationshipFilter;
        const labelMap = {
            tonic: 'Tonic',
            dominant: 'Dominant',
            subdominant: 'Subdominant',
            mediant: 'Mediant'
        };
        const filtered = filterKey === 'all'
            ? this.state.containingScales
            : this.state.containingScales.filter(s => s.relationshipLabel === labelMap[filterKey]);
        const displayScales = filtered.slice(0, 50);

        displayScales.forEach((scale, index) => {
            const vibe = this.getScaleVibe(scale);
            const roman = this.getRomanNumeral(this.state.parsedChord.root, scale.root, scale.name);
            const citation = scale.citation || {};
            const description = citation.description || '';
            const url = citation.url || (citation.references && citation.references[0] ? citation.references[0].url : '#');
            const uniqueId = `sre-scale-${index}`;
            
            // Relationship badge
            const relationshipBadge = scale.relationshipLabel && scale.relationshipLabel !== 'Related' 
                ? `<span style="font-size:0.7rem; color:var(--text-muted); margin-left:8px; border:1px solid var(--border-light); padding:1px 5px; border-radius:3px; text-transform:uppercase; letter-spacing:0.5px;">${scale.relationshipLabel}</span>` 
                : '';

            html += `
                <div class="scale-item" style="background: rgba(255,255,255,0.05); padding: 10px; border-left: 3px solid var(--accent-primary); border-radius: 4px; transition: background 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; cursor: pointer;" onclick="window.open('${url}', '_blank')">
                        <div style="display:flex; align-items:center;">
                            <div style="font-weight: bold; color: var(--text-highlight); font-size: 1rem;">${scale.root} ${scale.name}</div>
                            ${relationshipBadge}
                        </div>
                        <div style="background: var(--bg-panel); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; color: var(--accent-secondary);">
                            ${roman}
                        </div>
                    </div>
                    <div style="font-size: 0.85rem; color: var(--text-main); margin-bottom: 4px; font-style: italic;">"${vibe}"</div>
                    ${description ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; line-height: 1.3;">${description}</div>` : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <div style="font-size: 0.75rem; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.5px; cursor: pointer;" onclick="window.open('${url}', '_blank')">
                            Click to learn more ↗
                        </div>
                        <button class="btn-preview" data-id="${uniqueId}" data-root="${scale.root}" data-name="${scale.name}" 
                                style="background: transparent; border: 1px solid var(--border-light); color: var(--text-muted); font-size: 0.7rem; padding: 2px 6px; cursor: pointer; border-radius: 3px;">
                            Show Preview
                        </button>
                    </div>
                    <div id="${uniqueId}" class="scale-preview-container" style="margin-top: 8px; display: none; padding: 12px; background: linear-gradient(135deg, rgba(10,10,15,0.95) 0%, rgba(5,5,10,0.98) 100%); border: 1px solid rgba(0,243,255,0.2); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: visible;"></div>
                </div>
            `;
        });
        
        if (this.state.containingScales.length > 50) {
            html += `<div style="text-align: center; color: var(--text-muted); font-style: italic;">...and ${this.state.containingScales.length - 50} more</div>`;
        }

        html += `</div>`;
        
        return html;
    }

    bindFilterEvents() {
        if (!this.containerElement) return;
        const filterButtons = this.containerElement.querySelectorAll('.sre-filter');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const key = btn.getAttribute('data-filter');
                this.state.selectedRelationshipFilter = key || 'all';
                // Re-render to apply filter
                this.render();
            });
        });
    }

    bindPreviewEvents() {
        if (!this.containerElement) {
            console.error('[ScaleExplorer] No container element found');
            return;
        }
        
        const buttons = this.containerElement.querySelectorAll('.btn-preview');
        console.log('[ScaleExplorer] Found', buttons.length, 'preview buttons');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const root = btn.getAttribute('data-root');
                const name = btn.getAttribute('data-name');
                console.log('[ScaleExplorer] Preview clicked:', { id, root, name });
                
                const container = this.containerElement.querySelector(`#${id}`);
                console.log('[ScaleExplorer] Container found:', container);
                
                if (container) {
                    if (container.style.display === 'none') {
                        container.style.display = 'block';
                        btn.textContent = 'Hide Preview';
                        console.log('[ScaleExplorer] Container made visible');
                        
                        // Initialize piano if empty
                        if (container.innerHTML === '') {
                            console.log('[ScaleExplorer] Initializing piano...');
                            
                            if (window.PianoVisualizer) {
                                console.log('[ScaleExplorer] PianoVisualizer class found');
                                
                                // Create styled wrapper for piano
                                const pianoWrapper = document.createElement('div');
                                pianoWrapper.style.background = 'linear-gradient(180deg, rgba(20,20,20,0.95) 0%, rgba(10,10,10,0.98) 100%)';
                                pianoWrapper.style.padding = '15px';
                                pianoWrapper.style.borderRadius = '8px';
                                pianoWrapper.style.border = '2px solid rgba(0,243,255,0.2)';
                                pianoWrapper.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 12px rgba(0,243,255,0.1)';
                                
                                // Calculate starting MIDI note based on scale root
                                const rootMidi = this.musicTheory.noteValues[root];
                                const startMidi = rootMidi !== undefined ? 60 + ((rootMidi - 0 + 12) % 12) : 60;
                                
                                // Get audio engine from global modular app if available
                                const audioEngine = (typeof window !== 'undefined' && window.modularApp && window.modularApp.audioEngine)
                                    ? window.modularApp.audioEngine
                                    : (typeof window !== 'undefined' && window.app && window.app.audioEngine)
                                        ? window.app.audioEngine
                                        : null;
                                console.log('[ScaleExplorer] Audio engine (modularApp preferred):', !!audioEngine);
                                
                                const piano = new window.PianoVisualizer({
                                    container: pianoWrapper,
                                    octaves: 1,
                                    startMidi: startMidi, // Start from scale root
                                    whiteKeyWidth: 35,
                                    whiteKeyHeight: 100,
                                    blackKeyHeight: 65,
                                    showFingering: false,
                                    showRomanNumerals: false,
                                    showGradingTooltips: false,
                                    enableGradingIntegration: false,
                                    fitToContainer: true
                                });
                                
                                // Store piano instance ID for debugging
                                const pianoId = 'piano_' + Date.now();
                                piano._debugId = pianoId;
                                console.log('[ScaleExplorer] Piano instance created with ID:', pianoId, piano);
                                console.log('[ScaleExplorer] Piano element:', piano.pianoElement);
                                console.log('[ScaleExplorer] Piano.on is a function?', typeof piano.on === 'function');
                                
                                // Connect audio playback to piano clicks IMMEDIATELY after creation
                                if (audioEngine) {
                                    console.log('[ScaleExplorer] Setting up audio listener... audioEngine available');
                                    if (typeof piano.on === 'function') {
                                        console.log('[ScaleExplorer] Calling piano.on for piano ID:', pianoId);
                                        piano.on('noteClicked', (data) => {
                                            console.log('[ScaleExplorer] ✓✓✓ Note clicked callback fired for piano', pianoId, '! Playing MIDI:', data.midi);
                                            if (audioEngine && typeof audioEngine.playNote === 'function') {
                                                audioEngine.playNote(data.midi);
                                            } else {
                                                console.error('[ScaleExplorer] audioEngine.playNote not available');
                                            }
                                        });
                                        console.log('[ScaleExplorer] Listener registered for piano', pianoId, '! Checking:', piano.listeners.get('noteClicked'));
                                    } else {
                                        console.error('[ScaleExplorer] piano.on is not a function!');
                                    }

                                    // Hard fallback: event delegation on DOM keys to ensure audio
                                    const keyClickHandler = (evt) => {
                                        const keyEl = evt.target.closest('.piano-white-key, .piano-black-key');
                                        if (!keyEl) return;
                                        const midiStr = keyEl.getAttribute('data-midi');
                                        const midiNum = midiStr ? parseInt(midiStr, 10) : NaN;
                                        if (!Number.isNaN(midiNum) && typeof audioEngine.playNote === 'function') {
                                            console.log('[ScaleExplorer] Fallback key click -> play MIDI:', midiNum);
                                            audioEngine.playNote(midiNum);
                                        }
                                    };
                                    pianoWrapper.addEventListener('click', keyClickHandler);
                                    // Keep a reference to avoid duplicate bindings
                                    pianoWrapper._sreKeyClickHandler = keyClickHandler;
                                } else {
                                    console.warn('[ScaleExplorer] No audioEngine available');
                                }
                                
                                // Get scale notes and diatonic chords from engine
                                const scaleNotes = this.musicTheory.getScaleNotes(root, name);
                                console.log('[ScaleExplorer] Scale notes:', scaleNotes);
                                
                                // Get diatonic chords
                                const diatonicChords = this.getDiatonicChords(root, name, scaleNotes);
                                
                                // Create chords display
                                const chordsSection = document.createElement('div');
                                chordsSection.style.marginTop = '12px';
                                chordsSection.style.padding = '10px';
                                chordsSection.style.background = 'rgba(0,243,255,0.05)';
                                chordsSection.style.border = '1px solid rgba(0,243,255,0.15)';
                                chordsSection.style.borderRadius = '6px';
                                
                                const chordsTitle = document.createElement('div');
                                chordsTitle.textContent = 'Diatonic Chords';
                                chordsTitle.style.fontSize = '0.75rem';
                                chordsTitle.style.fontWeight = '700';
                                chordsTitle.style.color = 'var(--accent-primary)';
                                chordsTitle.style.marginBottom = '8px';
                                chordsTitle.style.textTransform = 'uppercase';
                                chordsTitle.style.letterSpacing = '1px';
                                
                                const chordsGrid = document.createElement('div');
                                chordsGrid.style.display = 'grid';
                                chordsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(80px, 1fr))';
                                chordsGrid.style.gap = '6px';
                                
                                diatonicChords.forEach((chord, idx) => {
                                    const chordBadge = document.createElement('div');
                                    chordBadge.textContent = chord;
                                    chordBadge.style.padding = '4px 8px';
                                    chordBadge.style.background = 'rgba(0,243,255,0.1)';
                                    chordBadge.style.border = '1px solid rgba(0,243,255,0.3)';
                                    chordBadge.style.borderRadius = '4px';
                                    chordBadge.style.fontSize = '0.85rem';
                                    chordBadge.style.fontWeight = '600';
                                    chordBadge.style.color = 'var(--text-highlight)';
                                    chordBadge.style.textAlign = 'center';
                                    chordBadge.style.cursor = 'pointer';
                                    chordBadge.style.transition = 'all 0.2s';
                                    
                                    chordBadge.addEventListener('mouseenter', () => {
                                        chordBadge.style.background = 'rgba(0,243,255,0.2)';
                                        chordBadge.style.borderColor = 'var(--accent-primary)';
                                        chordBadge.style.transform = 'translateY(-2px)';
                                    });
                                    
                                    chordBadge.addEventListener('mouseleave', () => {
                                        chordBadge.style.background = 'rgba(0,243,255,0.1)';
                                        chordBadge.style.borderColor = 'rgba(0,243,255,0.3)';
                                        chordBadge.style.transform = 'translateY(0)';
                                    });
                                    
                                    chordBadge.addEventListener('click', () => {
                                        // Copy to input and analyze
                                        const input = this.containerElement.querySelector('#sre-chord-input');
                                        if (input) {
                                            input.value = chord;
                                            this.handleInput(chord);
                                        }
                                    });
                                    
                                    chordsGrid.appendChild(chordBadge);
                                });
                                
                                chordsSection.appendChild(chordsTitle);
                                chordsSection.appendChild(chordsGrid);
                                
                                // Append to container
                                container.appendChild(pianoWrapper);
                                container.appendChild(chordsSection);
                                
                                // Force a re-render after DOM attachment to ensure proper sizing
                                setTimeout(() => {
                                    console.log('[ScaleExplorer] Rendering scale...');
                                    piano.renderScale({
                                        key: root,
                                        scale: name,
                                        notes: scaleNotes
                                    });
                                    console.log('[ScaleExplorer] Container children:', container.children.length);
                                    console.log('[ScaleExplorer] Container HTML length:', container.innerHTML.length);
                                    console.log('[ScaleExplorer] Piano element dimensions:', {
                                        width: piano.pianoElement.offsetWidth,
                                        height: piano.pianoElement.offsetHeight,
                                        display: window.getComputedStyle(piano.pianoElement).display,
                                        visibility: window.getComputedStyle(piano.pianoElement).visibility
                                    });
                                    console.log('[ScaleExplorer] Container dimensions:', {
                                        width: container.offsetWidth,
                                        height: container.offsetHeight,
                                        display: window.getComputedStyle(container).display
                                    });
                                }, 10);
                            } else {
                                console.error('[ScaleExplorer] PianoVisualizer class not found on window!');
                                container.innerHTML = '<div style="color:red; font-size:0.8rem;">Visualizer not available</div>';
                            }
                        } else {
                            console.log('[ScaleExplorer] Container already has content');
                        }
                    } else {
                        container.style.display = 'none';
                        btn.textContent = 'Show Preview';
                    }
                }
            });
        });
    }

    getDiatonicChords(root, scaleName, scaleNotes) {
        // Build diatonic triads and seventh chords for the scale
        if (!scaleNotes || scaleNotes.length < 7) return [];
        
        const chords = [];
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
        
        for (let i = 0; i < Math.min(scaleNotes.length, 7); i++) {
            const rootNote = scaleNotes[i];
            const thirdNote = scaleNotes[(i + 2) % scaleNotes.length];
            const fifthNote = scaleNotes[(i + 4) % scaleNotes.length];
            const seventhNote = scaleNotes[(i + 6) % scaleNotes.length];
            
            // Determine chord quality
            const rootValue = this.musicTheory.noteValues[rootNote];
            const thirdValue = this.musicTheory.noteValues[thirdNote];
            const fifthValue = this.musicTheory.noteValues[fifthNote];
            const seventhValue = this.musicTheory.noteValues[seventhNote];
            
            if (rootValue === undefined || thirdValue === undefined || fifthValue === undefined) continue;
            
            const thirdInterval = (thirdValue - rootValue + 12) % 12;
            const fifthInterval = (fifthValue - rootValue + 12) % 12;
            const seventhInterval = seventhValue !== undefined ? (seventhValue - rootValue + 12) % 12 : null;
            
            let quality = '';
            
            // Determine triad quality
            if (thirdInterval === 4 && fifthInterval === 7) {
                quality = 'maj7'; // Major triad
            } else if (thirdInterval === 3 && fifthInterval === 7) {
                quality = 'm7'; // Minor triad
            } else if (thirdInterval === 3 && fifthInterval === 6) {
                quality = 'm7b5'; // Diminished triad
            } else if (thirdInterval === 4 && fifthInterval === 8) {
                quality = '+'; // Augmented triad
            }
            
            // Refine with seventh
            if (seventhInterval !== null) {
                if (thirdInterval === 4 && fifthInterval === 7) {
                    if (seventhInterval === 11) quality = 'maj7';
                    else if (seventhInterval === 10) quality = '7';
                } else if (thirdInterval === 3 && fifthInterval === 7) {
                    if (seventhInterval === 10) quality = 'm7';
                    else if (seventhInterval === 11) quality = 'mM7';
                } else if (thirdInterval === 3 && fifthInterval === 6) {
                    if (seventhInterval === 10) quality = 'm7b5';
                    else if (seventhInterval === 9) quality = 'dim7';
                }
            }
            
            chords.push(`${rootNote}${quality}`);
        }
        
        return chords;
    }

    renderScaleRelationships(scale) {
        // Deprecated in favor of new card layout, but kept for compatibility if needed
        return ''; 
    }

    transposeRoot(root, semitones) {
        if (!this.musicTheory.noteValues) return root;
        const val = this.musicTheory.noteValues[root];
        if (val === undefined) return root;
        const newVal = (val + semitones) % 12;
        // Find note name for newVal
        const entry = Object.entries(this.musicTheory.noteValues).find(([k, v]) => v === newVal && !k.includes('bb') && !k.includes('##')); // Simple find
        return entry ? entry[0] : root;
    }
}
