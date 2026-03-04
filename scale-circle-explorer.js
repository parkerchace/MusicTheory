/**
 * @module ScaleCircleExplorer
 * @description Interactive circle visualization for scales and key relationships
 * @exports class ScaleCircleExplorer
 * @feature Circle of fifths/fourths/chromatic modes
 * @feature Interactive key relationships
 * @feature Scale degree highlighting
 * @feature Chord progression visualization
 * @feature Integration with scale library
 * @feature Real-time updates
 */

class ScaleCircleExplorer {
        // Add a no-op setupResizeObserver to prevent errors if not implemented
        setupResizeObserver() {
            // No-op: implement resize observer logic here if needed
        }
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('ScaleCircleExplorer requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            mode: 'fifths', // 'fifths', 'fourths', 'chromatic'
            currentKey: 'C',
            scaleType: 'major',
            highlightedKeys: [],
            scaleNotes: [],
            generatedNotes: [],
            showScaleLines: false,
            hoveredKey: null
        };

        this.listeners = new Map();
        this.containerElement = null;
    }

    /**
     * Set visualization mode
     */
    setMode(mode) {
        const validModes = ['fifths', 'fourths', 'chromatic'];
        if (!validModes.includes(mode)) return;
        
        this.state.mode = mode;
        this.render();
        this.emit('modeChanged', { mode });
    }

    /**
     * Set current key
     */
    setKey(key, options = {}) {
        if (!this.musicTheory.getKeys().includes(key)) return;
        
        this.state.currentKey = key;
        this.render();
        // Always emit keyChanged for programmatic listeners
        this.emit('keyChanged', { key });
        // Only emit keySelected when this change originates from a user action
        if (options.emitUserEvent) {
            this.emit('keySelected', { key });
        }
    }

    /**
     * Highlight specific keys
     */
    highlightKeys(keys) {
        this.state.highlightedKeys = [...keys];
        this.render();
    }

    /**
     * Set scale notes for highlighting
     */
    setScaleNotes(notes) {
        this.state.scaleNotes = notes;
        this.render();
    }

    /**
     * Check if a note is in the scale, accounting for enharmonic equivalents
     */
    isNoteInScale(note) {
        if (!this.state.scaleNotes || this.state.scaleNotes.length === 0) return false;

        // Enharmonic equivalents map
        const enharmonics = {
            'C': ['C', 'B#', 'Dbb'],
            'C#': ['C#', 'Db', 'B##'],
            'Db': ['Db', 'C#', 'B##'],
            'D': ['D', 'C##', 'Ebb'],
            'D#': ['D#', 'Eb', 'Fbb'],
            'Eb': ['Eb', 'D#', 'Fbb'],
            'E': ['E', 'Fb', 'D##'],
            'F': ['F', 'E#', 'Gbb'],
            'F#': ['F#', 'Gb', 'E##'],
            'Gb': ['Gb', 'F#', 'E##'],
            'G': ['G', 'F##', 'Abb'],
            'G#': ['G#', 'Ab'],
            'Ab': ['Ab', 'G#'],
            'A': ['A', 'G##', 'Bbb'],
            'A#': ['A#', 'Bb', 'Cbb'],
            'Bb': ['Bb', 'A#', 'Cbb'],
            'B': ['B', 'Cb', 'A##'],
            'Cb': ['Cb', 'B', 'A##']
        };

        const possibleNames = enharmonics[note] || [note];
        return this.state.scaleNotes.some(scaleNote => possibleNames.includes(scaleNote));
    }

    /**
     * Check if a note is in the generated notes, accounting for enharmonic equivalents
     */
    isNoteGenerated(note) {
        if (!this.state.generatedNotes || this.state.generatedNotes.length === 0) return false;

        const enharmonics = {
            'C': ['C', 'B#', 'Dbb'],
            'C#': ['C#', 'Db', 'B##'],
            'Db': ['Db', 'C#', 'B##'],
            'D': ['D', 'C##', 'Ebb'],
            'D#': ['D#', 'Eb', 'Fbb'],
            'Eb': ['Eb', 'D#', 'Fbb'],
            'E': ['E', 'Fb', 'D##'],
            'F': ['F', 'E#', 'Gbb'],
            'F#': ['F#', 'Gb', 'E##'],
            'Gb': ['Gb', 'F#', 'E##'],
            'G': ['G', 'F##', 'Abb'],
            'G#': ['G#', 'Ab'],
            'Ab': ['Ab', 'G#'],
            'A': ['A', 'G##', 'Bbb'],
            'A#': ['A#', 'Bb', 'Cbb'],
            'Bb': ['Bb', 'A#', 'Cbb'],
            'B': ['B', 'Cb', 'A##'],
            'Cb': ['Cb', 'B', 'A##']
        };

        const possibleNames = enharmonics[note] || [note];
        return this.state.generatedNotes.some(genNote => possibleNames.includes(genNote));
    }

    /**
     * Find the key position for a note, accounting for enharmonic equivalents
     */
    findKeyPosition(note, keyPositions) {
        // First try exact match
        if (keyPositions[note]) {
            return keyPositions[note];
        }

        // Try enharmonic equivalents
        const enharmonics = {
            'C': ['C', 'B#', 'Dbb'],
            'C#': ['C#', 'Db', 'B##'],
            'Db': ['Db', 'C#', 'B##'],
            'D': ['D', 'C##', 'Ebb'],
            'D#': ['D#', 'Eb', 'Fbb'],
            'Eb': ['Eb', 'D#', 'Fbb'],
            'E': ['E', 'Fb', 'D##'],
            'E#': ['E#', 'F', 'Gbb'],
            'F': ['F', 'E#', 'Gbb'],
            'F#': ['F#', 'Gb', 'E##'],
            'Gb': ['Gb', 'F#', 'E##'],
            'G': ['G', 'F##', 'Abb'],
            'G#': ['G#', 'Ab'],
            'Ab': ['Ab', 'G#'],
            'A': ['A', 'G##', 'Bbb'],
            'A#': ['A#', 'Bb', 'Cbb'],
            'Bb': ['Bb', 'A#', 'Cbb'],
            'B': ['B', 'Cb', 'A##'],
            'Cb': ['Cb', 'B', 'A##']
        };

        const possibleNames = enharmonics[note] || [note];
        
        for (const name of possibleNames) {
            if (keyPositions[name]) {
                return keyPositions[name];
            }
        }

        return null;
    }

    /**
     * Set generated numbers for highlighting
     */
    setGeneratedNumbers(numbers, scaleNotes) {
        this.state.generatedNotes = numbers.map(num => {
            if (typeof num === 'number') {
                return scaleNotes[(num - 1) % scaleNotes.length];
            }
            return num;
        });
        this.render();
    }

    /**
     * Toggle scale lines visibility
     */
    toggleScaleLines() {
        this.state.showScaleLines = !this.state.showScaleLines;
        this.render();
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
     * Mount to DOM container
     */
    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (!container) return;
        
        this.containerElement = container;
        this.render();
        this.setupResizeObserver();
    }

    /**
     * Render circle visualization with modern UI and pedagogical approach
     */
    render() {
        if (!this.containerElement) return;
        
        // Build pedagogical context
        const circleConfig = {
            fifths: { 
                title: 'Circle of Fifths', 
                direction: 'clockwise', 
                step: 7,
                explanation: 'Keys arranged by perfect fifths - the foundation of Western harmony',
                pedagogyTip: 'Moving clockwise adds sharps; counterclockwise adds flats',
                musicalContext: 'Essential for understanding key signatures and chord progressions'
            },
            fourths: { 
                title: 'Circle of Fourths', 
                direction: 'counter-clockwise', 
                step: 5,
                explanation: 'Keys arranged by perfect fourths - the inverse of the circle of fifths',
                pedagogyTip: 'Each step represents a plagal (IV-I) relationship',
                musicalContext: 'Useful for understanding subdominant relationships'
            },
            chromatic: { 
                title: 'Chromatic Circle', 
                direction: 'clockwise', 
                step: 1,
                explanation: 'All 12 chromatic pitches arranged by semitones',
                pedagogyTip: 'Shows the equal temperament system and enharmonic relationships',
                musicalContext: 'Foundation for atonal and twelve-tone composition'
            }
        };
        const config = circleConfig[this.state.mode];

        // Get scale information for context
        const currentScaleInfo = this.getCurrentScaleInfo();

        this.containerElement.innerHTML = `
            <div class="scale-circle-modern-wrapper">
                <!-- Header with pedagogical context -->
                <div class="circle-header">
                    <h2 class="circle-title">${config.title}</h2>
                    <p class="circle-explanation">${config.explanation}</p>
                    
                    <div class="pedagogy-insight">
                        <div class="insight-icon">💡</div>
                        <div>
                            <strong>Learning Tip:</strong> ${config.pedagogyTip}
                        </div>
                    </div>
                </div>

                <!-- Current context display (moved to controls for compact layout) -->

                <!-- Interactive circle visualization -->
                <div class="circle-visualization-container">
                    <canvas id="circle-canvas" width="460" height="460"></canvas>
                    <div class="circle-tooltip" id="circle-tooltip"></div>
                    
                    <!-- Scale polygon overlay info -->
                    ${this.state.showScaleLines ? this.renderScalePolygonInfo() : ''}
                </div>

                <!-- Modern control panel -->
                <div class="circle-controls-modern">
                    ${this.renderCurrentContext(currentScaleInfo)}
                    <!-- Mode selection with pedagogical context -->
                    <div class="control-section">
                        <h3 class="control-section-title">Circle Mode</h3>
                        <div class="mode-buttons">
                            <button class="mode-btn ${this.state.mode === 'fifths' ? 'active' : ''}" 
                                    data-mode="fifths" 
                                    title="Circle of Fifths - ${circleConfig.fifths.explanation}">
                                <span class="mode-icon">🎵</span>
                                <span>Fifths</span>
                            </button>
                            <button class="mode-btn ${this.state.mode === 'fourths' ? 'active' : ''}" 
                                    data-mode="fourths"
                                    title="Circle of Fourths - ${circleConfig.fourths.explanation}">
                                <span class="mode-icon">🎼</span>
                                <span>Fourths</span>
                            </button>
                            <button class="mode-btn ${this.state.mode === 'chromatic' ? 'active' : ''}" 
                                    data-mode="chromatic"
                                    title="Chromatic Circle - ${circleConfig.chromatic.explanation}">
                                <span class="mode-icon">🎹</span>
                                <span>Chromatic</span>
                            </button>
                        </div>
                    </div>

                    <!-- Visualization options -->
                    <div class="control-section">
                        <h3 class="control-section-title">Visualization</h3>
                        <div class="toggle-controls">
                            <label class="toggle-control">
                                <input type="checkbox" ${this.state.showScaleLines ? 'checked' : ''} 
                                       id="toggle-scale-polygon">
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">Scale Polygon</span>
                            </label>
                        </div>
                    </div>

                    <!-- Musical context -->
                    <div class="control-section">
                        <h3 class="control-section-title">Musical Context</h3>
                        <div class="context-info">
                            <div class="context-item">
                                <strong>Current Key:</strong> 
                                <span class="current-key-display">${this.state.currentKey}</span>
                            </div>
                            <div class="context-item">
                                <strong>Scale Notes:</strong>
                                <span class="scale-notes-display">
                                    ${this.state.scaleNotes.join(' - ') || 'None selected'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="control-section">
                        <div class="action-buttons">
                            <button class="action-btn primary" id="play-scale-btn">
                                <span>🎵</span> Play Scale
                            </button>
                            <button class="action-btn secondary" id="random-key-btn">
                                <span>🎲</span> Random Key
                            </button>
                            <button class="action-btn secondary" id="clear-highlights-btn">
                                <span>🧹</span> Clear
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Insights panel removed per user request -->
            </div>

            <style>
                /* When the circle is placed inside a ".studio-module", inherit module styling */
                .studio-module .scale-circle-modern-wrapper {
                    background: transparent !important;
                    padding: 0 !important;
                    border-radius: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                }

                /* Make the circle header match other module headers */
                .studio-module .scale-circle-modern-wrapper .circle-header {
                    background: transparent !important;
                    padding: 8px 10px !important;
                    border: none !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                }

                .studio-module .scale-circle-modern-wrapper .circle-title {
                    font-size: 0.95rem !important;
                    margin: 0 !important;
                    -webkit-text-fill-color: initial !important;
                    background: none !important;
                    color: inherit !important;
                    -webkit-background-clip: unset !important;
                }

                .studio-module .scale-circle-modern-wrapper .circle-explanation {
                    display: none !important; /* keep module headers compact; explanation shouldn't push layout */
                }

                .studio-module .scale-circle-modern-wrapper .circle-visualization-container {
                    padding: 8px !important;
                    border-radius: 0 !important;
                    border: none !important;
                    background: transparent !important;
                }

                /* Further simplify internal elements when embedded as a standard module */
                .studio-module .scale-circle-modern-wrapper,
                .studio-module .scale-circle-modern-wrapper * {
                    color: inherit !important;
                    font-family: inherit !important;
                }

                .studio-module .scale-circle-modern-wrapper .context-card {
                    background: transparent !important;
                    padding: 6px 8px !important;
                    border: none !important;
                    border-radius: 0 !important;
                }

                .studio-module .scale-circle-modern-wrapper .control-section {
                    background: transparent !important;
                    padding: 6px 8px !important;
                    border: none !important;
                    border-radius: 0 !important;
                }

                .studio-module .scale-circle-modern-wrapper .mode-btn {
                    padding: 6px !important;
                    min-height: 44px !important;
                    gap: 6px !important;
                    border-radius: 4px !important;
                    border: 1px solid rgba(255,255,255,0.06) !important;
                    background: transparent !important;
                    color: inherit !important;
                }

                .studio-module .scale-circle-modern-wrapper .mode-btn.active {
                    background: var(--accent-primary) !important;
                    color: var(--color-on-accent, #000) !important;
                    border-color: var(--accent-primary) !important;
                    box-shadow: none !important;
                }

                .studio-module .scale-circle-modern-wrapper .pedagogy-insight {
                    display: none !important; /* remove extra pedagogy row inside compact modules */
                }

                .studio-module .scale-circle-modern-wrapper #circle-canvas {
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
                }

                .scale-circle-modern-wrapper {
                    /* Prefer global theme variables; fallback to previous dark palette */
                    --color-bg-primary: var(--bg-panel, #0f172a);
                    --color-bg-secondary: var(--bg-secondary, #1e293b);
                    --color-bg-tertiary: var(--bg-tertiary, #334155);
                    --color-text-primary: var(--text-main, #f1f5f9);
                    --color-text-secondary: var(--text-muted, #cbd5e1);
                    --color-text-muted: var(--text-muted, #64748b);
                    --color-border: var(--border-light, #475569);
                    --color-accent: var(--accent-primary, #3b82f6);
                    --color-accent-secondary: var(--accent-secondary, #10b981);
                    --color-warning: var(--warning, #f59e0b);
                    --color-error: var(--error, #ef4444);
                    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
                    --radius-sm: 6px;
                    --radius-md: 12px;
                    --radius-lg: 16px;
                    --spacing-xs: 0.5rem;
                    --spacing-sm: 0.75rem;
                    --spacing-md: 1rem;
                    --spacing-lg: 1.5rem;
                    --spacing-xl: 2rem;
                    --spacing-2xl: 3rem;

                    background: var(--bg-panel, var(--bg, var(--color-bg-primary)));
                    color: var(--color-text-primary);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                    padding: var(--spacing-md); /* tightened */
                    border-radius: var(--radius-lg);
                    display: grid;
                    grid-template-columns: minmax(480px, 1fr) 300px;
                    grid-template-areas: "header header" "visual controls";
                    gap: var(--spacing-md);
                    max-width: 100%;
                    width: 100%;
                    margin: 0;
                }

                /* Header Section */
                .circle-header {
                    grid-area: header;
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    background: var(--bg-header, var(--bg-secondary, var(--bg-panel, var(--color-bg-secondary))));
                    padding: calc(var(--spacing-md) / 1.2);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--color-border);
                    justify-content: space-between;
                }

                .circle-title {
                    font-size: 1.15rem;
                    font-weight: 700;
                    margin: 0 0 var(--spacing-xs) 0;
                    background: linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .circle-explanation {
                    font-size: 0.9rem;
                    color: var(--color-text-secondary);
                    margin: 0;
                    line-height: 1.4;
                }

                .pedagogy-insight {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    background: rgba(59, 130, 246, 0.06);
                    padding: calc(var(--spacing-sm));
                    border-radius: var(--radius-sm);
                    border-left: 3px solid var(--color-accent);
                    text-align: left;
                    max-width: 420px;
                    margin: 0;
                }

                .insight-icon {
                    font-size: 1.25rem;
                    flex-shrink: 0;
                }

                /* Current Context Display */
                .current-context {
                    /* placed inside controls column now */
                    background: transparent;
                    padding: 0 0 8px 0;
                    border-radius: var(--radius-md);
                    border: none;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                    align-items: stretch;
                    justify-content: flex-start;
                }

                .context-card {
                    background: var(--bg-input, var(--bg-panel, var(--color-bg-tertiary)));
                    padding: var(--spacing-md);
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--color-border);
                }

                .context-card h4 {
                    margin: 0 0 var(--spacing-xs) 0;
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-text-muted);
                }

                .context-value {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: var(--color-accent);
                }

                /* Circle Visualization */
                .circle-visualization-container {
                    grid-area: visual;
                    position: relative;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: var(--bg-panel, var(--bg-secondary, var(--bg, var(--color-bg-secondary))));
                    padding: var(--spacing-md);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--color-border);
                    min-height: 320px; /* tightened */
                }

                #circle-canvas {
                    width: 100%;
                    max-width: 680px; /* allow larger visualization when space permits */
                    height: auto;
                    aspect-ratio: 1/1;
                    border-radius: 50%;
                    background: radial-gradient(circle at 50% 50%, var(--bg-secondary, var(--color-bg-secondary)) 0%, var(--bg-panel, var(--color-bg-primary)) 70%);
                    box-shadow: var(--shadow-xl);
                    cursor: pointer;
                    transition: transform 0.12s ease;
                    display: block;
                }

                #circle-canvas:hover {
                    transform: scale(1.02);
                }

                .circle-tooltip {
                    position: absolute;
                    pointer-events: none;
                    background: var(--bg-panel, var(--bg, var(--color-bg-primary)));
                    color: var(--text-main, var(--color-text-primary));
                    padding: 6px 8px;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border-light, var(--color-border));
                    box-shadow: 0 2px 6px rgba(0,0,0,0.18);
                    font-size: 0.85rem;
                    font-weight: 600;
                    line-height: 1.2;
                    transform: translate(-50%, -110%);
                    white-space: nowrap;
                    opacity: 0;
                    transition: opacity 0.12s ease, transform 0.12s ease;
                    z-index: 100;
                }

                .circle-tooltip.visible {
                    opacity: 1;
                }

                /* Control Panel */
                .circle-controls-modern {
                    grid-area: controls;
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                    background: var(--bg-panel, var(--bg-secondary, var(--bg, var(--color-bg-secondary))));
                    padding: var(--spacing-sm);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--color-border);
                }

                .control-section {
                    background: var(--bg-input, var(--bg-panel, var(--color-bg-tertiary)));
                    padding: var(--spacing-md);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--color-border);
                }

                .control-section-title {
                    margin: 0 0 var(--spacing-md) 0;
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-text-muted);
                }

                /* Mode Buttons */
                .mode-buttons {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                    gap: var(--spacing-xs);
                }

                .mode-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--spacing-xs);
                    padding: 8px 10px;
                    background: var(--bg-panel, var(--bg, var(--color-bg-primary)));
                    color: var(--text-muted, var(--color-text-secondary));
                    border: 2px solid var(--color-border);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: 500;
                    min-height: 56px;
                    font-size: 0.9rem;
                }

                .mode-btn:hover {
                    background: var(--bg-panel, var(--bg-secondary, var(--bg, var(--color-bg-secondary))));
                    border-color: var(--color-accent);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .mode-btn.active {
                    background: var(--color-accent);
                    color: white;
                    border-color: var(--color-accent);
                    box-shadow: var(--shadow-lg);
                }

                .mode-icon {
                    font-size: 1.15rem;
                }

                /* Toggle Controls */
                .toggle-controls {
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                }

                .toggle-control {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                    cursor: pointer;
                }

                .toggle-control input {
                    display: none;
                }

                .toggle-slider {
                    position: relative;
                    width: 40px;
                    height: 20px;
                    background: var(--color-border);
                    border-radius: 24px;
                    transition: background 0.2s ease;
                }

                .toggle-slider:before {
                    content: '';
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.2s ease;
                }

                .toggle-control input:checked + .toggle-slider {
                    background: var(--color-accent);
                }

                .toggle-control input:checked + .toggle-slider:before {
                    transform: translateX(24px);
                }

                .toggle-label {
                    font-weight: 500;
                    color: var(--color-text-secondary);
                }

                /* Context Info */
                .context-info {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .context-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 4px 0;
                    border-bottom: 1px solid var(--color-border);
                }

                .context-item:last-child {
                    border-bottom: none;
                }

                .current-key-display {
                    background: var(--accent-primary, var(--color-accent));
                    color: var(--color-on-accent, #000);
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.85rem;
                }

                .scale-notes-display {
                    font-family: var(--font-ui, 'Courier New', monospace);
                    color: var(--accent-secondary, var(--color-accent-secondary));
                    font-weight: 600;
                    font-size: 0.9rem;
                }

                /* Action Buttons */
                .action-buttons {
                    display: flex;
                    gap: var(--spacing-xs);
                    flex-wrap: wrap;
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-xs);
                    padding: 6px 10px;
                    border: 2px solid var(--color-border);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    min-height: 44px;
                    flex: 1;
                    justify-content: center;
                }

                .action-btn.primary {
                    background: var(--color-accent);
                    color: white;
                    border-color: var(--color-accent);
                }

                .action-btn.primary:hover {
                    background: var(--color-accent-hover, var(--color-accent));
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }

                .action-btn.secondary {
                    background: var(--bg-panel, var(--bg, var(--color-bg-primary)));
                    color: var(--color-text-secondary);
                }

                .action-btn.secondary:hover {
                    background: var(--bg-panel, var(--bg-secondary, var(--bg, var(--color-bg-secondary))));
                    border-color: var(--color-accent);
                    color: var(--color-text-primary);
                }

                /* Insights Panel */
                /* Insights panel removed - styles omitted */

                /* Scale Polygon Info */
                .scale-polygon-info {
                    position: absolute;
                    top: var(--spacing-md);
                    right: var(--spacing-md);
                    background: rgba(16, 185, 129, 0.1);
                    padding: var(--spacing-sm);
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--color-accent-secondary);
                    font-size: 0.75rem;
                    color: var(--color-accent-secondary);
                    max-width: 200px;
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .scale-circle-modern-wrapper {
                        padding: var(--spacing-md);
                        gap: var(--spacing-md);
                    }

                    .circle-header {
                        padding: var(--spacing-lg);
                    }

                    .circle-title {
                        font-size: 1.5rem;
                    }

                    .circle-controls-modern {
                        grid-template-columns: 1fr;
                    }

                    .mode-buttons {
                        grid-template-columns: repeat(3, 1fr);
                    }

                    .action-buttons {
                        flex-direction: column;
                    }

                    .current-context {
                        grid-template-columns: 1fr;
                    }

                    .insight-content {
                        grid-template-columns: 1fr;
                    }
                }

                /* Animation and transitions */
                .fade-in {
                    animation: fadeIn 0.4s ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .pulse {
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.6;
                    }
                }
            </style>
        `;

        // Add fade-in animation
        this.containerElement.querySelector('.scale-circle-modern-wrapper').classList.add('fade-in');

        // Setup event listeners with modern approach
        this.setupModernEventListeners();
        
        // Render circle
        this.renderCircleCanvas();
    }

    getCurrentScaleInfo() {
        if (!this.state.scaleNotes || this.state.scaleNotes.length === 0) {
            return {
                hasScale: false,
                scaleNotesCount: 0,
                scaleName: 'None selected'
            };
        }

        return {
            hasScale: true,
            scaleNotesCount: this.state.scaleNotes.length,
            scaleName: this.formatScaleName(),
            keySignature: this.getKeySignatureInfo()
        };
    }

    formatScaleName() {
        if (!this.state.scaleType) return 'Unknown';
        return this.state.scaleType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    getKeySignatureInfo() {
        if (!this.musicTheory.keySignatures || !this.musicTheory.keySignatures[this.state.currentKey]) {
            return { accidentals: [], type: 'natural' };
        }
        return this.musicTheory.keySignatures[this.state.currentKey];
    }

    renderCurrentContext(scaleInfo) {
        return `
            <div class="current-context">
                <div class="context-card">
                    <h4>Current Key</h4>
                    <div class="context-value">${this.state.currentKey} ${this.getKeySignatureInfo().type}</div>
                </div>
                
                <div class="context-card">
                    <h4>Circle Mode</h4>
                    <div class="context-value">${this.state.mode.charAt(0).toUpperCase() + this.state.mode.slice(1)}</div>
                </div>
                
                <div class="context-card">
                    <h4>Scale</h4>
                    <div class="context-value">${scaleInfo.hasScale ? scaleInfo.scaleName : 'None'}</div>
                </div>
                
                <div class="context-card">
                    <h4>Scale Notes</h4>
                    <div class="context-value">${scaleInfo.hasScale ? scaleInfo.scaleNotesCount + ' notes' : 'N/A'}</div>
                </div>
            </div>
        `;
    }

    renderScalePolygonInfo() {
        if (!this.state.scaleNotes || this.state.scaleNotes.length === 0) return '';
        
        return `
            <div class="scale-polygon-info">
                <strong>Scale Polygon Active</strong>
                <br>Showing ${this.state.scaleNotes.length} scale degrees
                <br>Connected in diatonic order
            </div>
        `;
    }

    renderMusicalInsights(config) {
        const insights = [];
        
        // Mode-specific insights
        if (this.state.mode === 'fifths') {
            insights.push({
                title: 'Key Relationships',
                content: 'Adjacent keys share 6 notes in common. Moving clockwise adds sharps, counterclockwise adds flats.'
            });
            
            if (this.state.scaleNotes.length > 0) {
                insights.push({
                    title: 'Related Keys',
                    content: `The dominant key (+1 sharp) and subdominant key (+1 flat) are your closest harmonic neighbors.`
                });
            }
        } else if (this.state.mode === 'fourths') {
            insights.push({
                title: 'Subdominant Motion',
                content: 'This circle shows plagal relationships (IV-I motion). Each step moves up a perfect fourth.'
            });
        } else if (this.state.mode === 'chromatic') {
            insights.push({
                title: 'Enharmonic Equivalents',
                content: 'Some positions represent the same pitch with different names (e.g., F# = Gb).'
            });
        }
        
        // Scale-specific insights
        if (this.state.showScaleLines && this.state.scaleNotes.length > 0) {
            insights.push({
                title: 'Scale Geometry',
                content: `Your ${this.state.scaleNotes.length}-note scale creates a ${this.state.scaleNotes.length}-sided polygon. The shape reveals the scale's intervallic structure.`
            });
        }
        
        // Musical context insights
        insights.push({
            title: 'Practice Tip',
            content: config.musicalContext || 'Explore different keys by clicking around the circle. Listen to how key signatures affect the same scale in different positions.'
        });
        
        return insights.map(insight => `
            <div class="insight-card">
                <h4>${insight.title}</h4>
                <p>${insight.content}</p>
            </div>
        `).join('');
    }

    setupModernEventListeners() {
        // Mode buttons with smooth transitions
        this.containerElement.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setMode(btn.dataset.mode);
            });
        });
        
        // Scale polygon toggle
        const polygonToggle = this.containerElement.querySelector('#toggle-scale-polygon');
        if (polygonToggle) {
            polygonToggle.addEventListener('change', () => {
                this.toggleScaleLines();
            });
        }
        
        // Action buttons
        const playScaleBtn = this.containerElement.querySelector('#play-scale-btn');
        if (playScaleBtn) {
            playScaleBtn.addEventListener('click', () => {
                const notesToPlay = (this.state.scaleNotes && this.state.scaleNotes.length) ? this.state.scaleNotes : [this.state.currentKey];
                // Local playback fallback for better UX
                try {
                    this.playNotes(notesToPlay, 110);
                } catch (e) {
                    console.warn('Local playback failed:', e);
                }

                // Still emit event for external listeners
                this.emit('playScale', {
                    key: this.state.currentKey,
                    notes: notesToPlay
                });
            });
        }
        
        const randomKeyBtn = this.containerElement.querySelector('#random-key-btn');
        if (randomKeyBtn) {
            randomKeyBtn.addEventListener('click', () => {
                const keys = this.musicTheory.getKeys();
                const randomKey = keys[Math.floor(Math.random() * keys.length)];
                this.setKey(randomKey, { emitUserEvent: true });
            });
        }
        
        const clearBtn = this.containerElement.querySelector('#clear-highlights-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.state.highlightedKeys = [];
                this.state.scaleNotes = [];
                this.state.generatedNotes = [];
                this.render();
            });
        }
        
        // Canvas events with improved handling
        const canvas = this.containerElement.querySelector('#circle-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
            canvas.addEventListener('mouseleave', () => this.handleCanvasLeave());
        }
    }

    /**
     * Get key order for current mode, respecting key signature
     */
    getKeyOrder() {
        const allKeys = this.musicTheory.getKeys();
        
        switch (this.state.mode) {
            case 'fifths':
                // Circle of fifths with key signature-aware enharmonics
                if (this.state.currentKey && this.musicTheory.keySignatures[this.state.currentKey]) {
                    const keySig = this.musicTheory.keySignatures[this.state.currentKey];
                    if (keySig.type === 'sharp') {
                        return ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'E#'];
                    } else if (keySig.type === 'flat') {
                        return ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
                    }
                }
                // Default circle of fifths
                return ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
            
            case 'fourths':
                // Circle of fourths with key signature-aware enharmonics
                if (this.state.currentKey && this.musicTheory.keySignatures[this.state.currentKey]) {
                    const keySig = this.musicTheory.keySignatures[this.state.currentKey];
                    if (keySig.type === 'sharp') {
                        return ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb', 'Bbb', 'Ebb', 'Abb'];
                    } else if (keySig.type === 'flat') {
                        return ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb', 'Bbb', 'Ebb', 'Abb'];
                    }
                }
                // Default circle of fourths
                return ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];
            
            case 'chromatic':
                // True chromatic circle
                return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            
            default:
                return allKeys;
        }
    }

            /*
             * Convert a note name (e.g., C, C#, Db, A) to frequency in Hz (default octave 4)
             */
            noteNameToFreq(name) {
                if (!name) return null;
                const normalized = String(name).replace(/♯/g, '#').replace(/♭/g, 'b').trim();
                const m = normalized.match(/^([A-Ga-g])([#b]?)(\d?)$/);
                const baseMap = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
                let octave = 4;
                let letter, accidental;

                if (m) {
                    letter = m[1].toUpperCase();
                    accidental = m[2] || '';
                    if (m[3]) octave = parseInt(m[3], 10);
                } else {
                    // fallback parsing for names like 'Bb' or 'C#'
                    letter = normalized[0].toUpperCase();
                    accidental = normalized[1] === '#' || normalized[1] === 'b' ? normalized[1] : '';
                }

                if (!baseMap.hasOwnProperty(letter)) return null;
                let semitone = baseMap[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
                const midi = (octave + 1) * 12 + semitone;
                return 440 * Math.pow(2, (midi - 69) / 12);
            }

            /*
             * Simple local note playback using WebAudio as a fallback when no external player is attached
             */
            playNotes(notes = [], tempo = 120) {
                if (!notes || notes.length === 0) return;
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const now = ctx.currentTime;
                const beat = 60 / Math.max(30, tempo);
                const noteDuration = Math.min(0.6, beat * 0.9);

                notes.forEach((n, i) => {
                    const freq = this.noteNameToFreq(n);
                    if (!freq) return;
                    const start = now + i * (noteDuration + 0.05);
                    const stop = start + noteDuration;

                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.0, start);
                    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
                    gain.gain.linearRampToValueAtTime(0.0, stop - 0.02);

                    osc.connect(gain).connect(ctx.destination);
                    osc.start(start);
                    osc.stop(stop);
                });

                const totalMs = Math.ceil((notes.length * (noteDuration + 0.05)) * 1000 + 200);
                setTimeout(() => { try { ctx.close(); } catch (e) {} }, totalMs);
            }

    /**
     * Get key positions with proper spacing
     */
    getKeyPositions() {
        const keyOrder = this.getKeyOrder();
        const positions = {};
        const count = keyOrder.length;
        
        keyOrder.forEach((key, index) => {
            positions[key] = {
                angle: (index / count) * 2 * Math.PI,
                distance: 1.0
            };
        });
        
        return positions;
    }

    /**
     * Render circle on canvas
     */
    renderCircleCanvas() {
        const canvas = this.containerElement.querySelector('#circle-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        // Resolve theme-aware colors from the wrapper or container
        const cssRoot = this.containerElement.querySelector('.scale-circle-modern-wrapper') || this.containerElement;
        const cs = window.getComputedStyle(cssRoot);
        const getColor = (prop, fallback) => {
            const v = cs.getPropertyValue(prop);
            if (v && v.trim()) return v.trim();
            return fallback;
        };
        const hexToRgba = (hex, a) => {
            if (!hex) return `rgba(255,255,255,${a})`;
            hex = hex.trim();
            if (hex.startsWith('rgb')) {
                return hex.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
            }
            if (hex[0] === '#') {
                const h = hex.substring(1);
                const bigint = parseInt(h.length === 3 ? h.split('').map(ch => ch+ch).join('') : h, 16);
                const r = (bigint >> 16) & 255;
                const g = (bigint >> 8) & 255;
                const b = bigint & 255;
                return `rgba(${r}, ${g}, ${b}, ${a})`;
            }
            return hex;
        };
        const colorBorder = getColor('--color-border', '#6b7280');
        const colorTextPrimary = getColor('--color-text-primary', '#ffffff');
        const colorTextSecondary = getColor('--color-text-secondary', '#cbd5e1');
        const colorTextMuted = getColor('--color-text-muted', '#6b7280');
        const colorAccent = getColor('--color-accent', '#3b82f6');
        const colorAccentSecondary = getColor('--color-accent-secondary', '#10b981');
        const colorWarning = getColor('--color-warning', '#f59e0b');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = colorBorder;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const keyPositions = this.getKeyPositions();
        const keys = Object.keys(keyPositions);
        
        // Draw connecting lines for circle of fifths/fourths
        if (this.state.mode !== 'chromatic') {
            ctx.beginPath();
            keys.forEach((key, i) => {
                const nextKey = keys[(i + 1) % keys.length];
                const pos1 = keyPositions[key];
                const pos2 = keyPositions[nextKey];
                
                const x1 = centerX + radius * pos1.distance * Math.cos(pos1.angle - Math.PI/2);
                const y1 = centerY + radius * pos1.distance * Math.sin(pos1.angle - Math.PI/2);
                const x2 = centerX + radius * pos2.distance * Math.cos(pos2.angle - Math.PI/2);
                const y2 = centerY + radius * pos2.distance * Math.sin(pos2.angle - Math.PI/2);
                
                if (i === 0) {
                    ctx.moveTo(x1, y1);
                }
                ctx.lineTo(x2, y2);
            });
            ctx.strokeStyle = hexToRgba(colorTextPrimary, 0.22);
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Draw scale lines
        if (this.state.showScaleLines && this.state.scaleNotes && this.state.scaleNotes.length > 0) {
            ctx.beginPath();
            
            // Get scale notes in diatonic order (1-2-3-4-5-6-7)
            const scaleNoteOrder = this.state.scaleNotes; // Already in diatonic order
            
            // Find positions of scale notes IN DIATONIC ORDER (with enharmonic matching)
            const scalePositions = [];
            scaleNoteOrder.forEach(note => {
                const pos = this.findKeyPosition(note, keyPositions);
                if (pos) {
                    const x = centerX + radius * pos.distance * Math.cos(pos.angle - Math.PI/2);
                    const y = centerY + radius * pos.distance * Math.sin(pos.angle - Math.PI/2);
                    scalePositions.push({x, y, note});
                }
            });
            
            // Draw connecting lines in scale order
            if (scalePositions.length > 1) {
                ctx.beginPath();
                ctx.moveTo(scalePositions[0].x, scalePositions[0].y);
                
                for (let i = 1; i < scalePositions.length; i++) {
                    ctx.lineTo(scalePositions[i].x, scalePositions[i].y);
                }
                
                // Close back to root
                ctx.lineTo(scalePositions[0].x, scalePositions[0].y);
                
                ctx.strokeStyle = hexToRgba(colorAccentSecondary, 0.6);
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        // Draw keys
        let hoverHit = null;
        keys.forEach(key => {
            const pos = keyPositions[key];
            const x = centerX + radius * pos.distance * Math.cos(pos.angle - Math.PI/2);
            const y = centerY + radius * pos.distance * Math.sin(pos.angle - Math.PI/2);
            
            // Determine highlight type (using enharmonic-aware checks)
            let highlightType = 'none';
            const isInScale = this.isNoteInScale(key);
            const isGenerated = this.isNoteGenerated(key);
            
            if (isInScale) {
                highlightType = 'scale';
            }
            if (isGenerated) {
                highlightType = 'numbers';
            }
            if (isInScale && isGenerated) {
                highlightType = 'both';
            }
            
            // Removed highlight rings for scale and generated notes.
            // Only the current key will have a ring drawn below.
            
            // Detect hover hit area (15px radius)
            if (this._lastMouse) {
                const dx = this._lastMouse.x - x;
                const dy = this._lastMouse.y - y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist <= 16) hoverHit = key;
            }

            // Draw key point
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, 2 * Math.PI);
            ctx.fillStyle = this.state.highlightedKeys.includes(key) ? colorWarning : 
                            (this.isNoteInScale(key)) ? colorAccentSecondary : colorTextMuted;
            ctx.fill();
            
            // Draw key label with improved contrast and size
            ctx.fillStyle = colorTextPrimary;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Add subtle dark stroke for readability over complex backgrounds
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0,0,0,0.75)';
            
            // Handle enharmonic equivalents based on current key signature
            let displayKey = key;
            
            // Only show alternative enharmonics when they make sense for the current key
            if (this.state.currentKey && this.musicTheory.keySignatures[this.state.currentKey]) {
                const currentKeySig = this.musicTheory.keySignatures[this.state.currentKey];
                
                // For fifths mode, prefer the enharmonic that matches the key signature
                if (this.state.mode === 'fifths') {
                    if (key === 'Db' && currentKeySig.type === 'sharp') displayKey = 'C#';
                    if (key === 'C#' && currentKeySig.type === 'flat') displayKey = 'Db';
                    if (key === 'Gb' && currentKeySig.type === 'sharp') displayKey = 'F#';
                    if (key === 'F#' && currentKeySig.type === 'flat') displayKey = 'Gb';
                }
                
                // For fourths mode, prefer the enharmonic that matches the key signature
                if (this.state.mode === 'fourths') {
                    if (key === 'B' && currentKeySig.type === 'sharp') displayKey = 'Cb';
                    if (key === 'Cb' && currentKeySig.type === 'flat') displayKey = 'B';
                    if (key === 'E' && currentKeySig.type === 'sharp') displayKey = 'Fb';
                    if (key === 'Fb' && currentKeySig.type === 'flat') displayKey = 'E';
                }
            } else {
                // Fallback to original logic
                if (key === 'Db' && this.state.mode === 'fifths') displayKey = 'C#';
                if (key === 'Gb' && this.state.mode === 'fourths') displayKey = 'F#';
            }
            
            ctx.strokeText(displayKey, x, y);
            ctx.fillText(displayKey, x, y);
            
            // Draw dice emoji for generated notes
            if (this.isNoteGenerated(key)) {
                ctx.font = '20px Arial';
                ctx.fillText('🎲', x + 15, y - 15);
            }
            
            // Hover ring for hovered key
            if (this.state.hoveredKey === key) {
                ctx.beginPath();
                ctx.arc(x, y, 18, 0, 2 * Math.PI);
                ctx.strokeStyle = colorAccent;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
        // Update cursor based on hover
        canvas.style.cursor = hoverHit ? 'pointer' : 'default';
        
        // Highlight current key (only one ring, red/orange)
        const currentKeyIndex = keys.indexOf(this.state.currentKey);
        if (currentKeyIndex !== -1) {
            const pos = keyPositions[this.state.currentKey];
            const x = centerX + radius * pos.distance * Math.cos(pos.angle - Math.PI/2);
            const y = centerY + radius * pos.distance * Math.sin(pos.angle - Math.PI/2);
            
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, 2 * Math.PI);
            ctx.strokeStyle = colorWarning;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }

    /**
     * Handle canvas click
     */
    handleCanvasClick(e) {
        const canvas = this.containerElement.querySelector('#circle-canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Check if click is within circle
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distance > radius) return;
        
        // Find closest key
        const keyPositions = this.getKeyPositions();
        const keys = Object.keys(keyPositions);
        const angleStep = (2 * Math.PI) / keys.length;
        const angle = Math.atan2(y - centerY, x - centerX);
        
        let normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
        const index = Math.round(normalizedAngle / angleStep) % keys.length;
        
        const clickedKey = keys[index];
        this.setKey(clickedKey, { emitUserEvent: true });
    }

    handleCanvasHover(e) {
        const canvas = this.containerElement.querySelector('#circle-canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this._lastMouse = { x, y };

        // Identify nearest key similar to click logic but with hit test threshold
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        if (distance > radius + 20) { // outside
            this.state.hoveredKey = null;
            this.showTooltip(null);
            this.renderCircleCanvas();
            return;
        }

        const keyPositions = this.getKeyPositions();
        const keys = Object.keys(keyPositions);
        let nearest = null;
        let nearestDist = Infinity;
        keys.forEach(key => {
            const pos = keyPositions[key];
            const kx = centerX + radius * pos.distance * Math.cos(pos.angle - Math.PI/2);
            const ky = centerY + radius * pos.distance * Math.sin(pos.angle - Math.PI/2);
            const d = Math.hypot(x - kx, y - ky);
            if (d < nearestDist) { nearestDist = d; nearest = { key, x: kx, y: ky, d }; }
        });

        if (nearest && nearest.d <= 18) {
            if (this.state.hoveredKey !== nearest.key) {
                this.state.hoveredKey = nearest.key;
                this.renderCircleCanvas();
            }
            this.showTooltip({ key: nearest.key, x, y });
        } else {
            if (this.state.hoveredKey) {
                this.state.hoveredKey = null;
                this.renderCircleCanvas();
            }
            this.showTooltip(null);
        }
    }

    handleCanvasLeave() {
        this.state.hoveredKey = null;
        this._lastMouse = null;
        this.showTooltip(null);
        this.renderCircleCanvas();
    }

    showTooltip(info) {
        const tooltip = this.containerElement.querySelector('#circle-tooltip');
        if (!tooltip) return;
        
        if (!info) { 
            tooltip.style.display = 'none'; 
            tooltip.classList.remove('visible');
            return; 
        }
        
        // Enhanced tooltip with musical context
        let content = `<strong>${info.key}</strong>`;
        
        // Add key signature info if available
        if (this.musicTheory.keySignatures && this.musicTheory.keySignatures[info.key]) {
            const keySig = this.musicTheory.keySignatures[info.key];
            if (keySig.accidentals.length > 0) {
                const accidentalText = keySig.type === 'sharp' ? '♯' : '♭';
                content += `<br><small>${keySig.accidentals.length} ${accidentalText}</small>`;
            } else {
                content += `<br><small>Natural</small>`;
            }
        }
        
        // Add scale relationship info if a scale is active
        if (this.state.scaleNotes.length > 0 && this.isNoteInScale(info.key)) {
            const scaleIndex = this.state.scaleNotes.indexOf(info.key);
            if (scaleIndex >= 0) {
                content += `<br><small>Scale degree ${scaleIndex + 1}</small>`;
            }
        }
        
        tooltip.innerHTML = content;
        tooltip.style.left = `${info.x}px`;
        tooltip.style.top = `${info.y}px`;
        tooltip.style.display = 'block';
        tooltip.classList.add('visible');
    }

    /**
     * Get circle configuration
     */
    getCircleConfig() {
        return {
            fifths: { 
                title: 'Circle of Fifths', 
                direction: 'clockwise', 
                step: 7,
                description: 'Shows key relationships by ascending fifths (clockwise)'
            },
            fourths: { 
                title: 'Circle of Fourths', 
                direction: 'counter-clockwise', 
                step: 5,
                description: 'Shows key relationships by ascending fourths (counter-clockwise)'
            },
            chromatic: { 
                title: 'Chromatic Circle', 
                direction: 'clockwise', 
                step: 1,
                description: 'Shows all 12 keys in chromatic order'
            }
        };
    }

    /**
     * Generate progression from circle
     */
    generateProgressionFromCircle() {
        const config = this.getCircleConfig()[this.state.mode];
        const keys = this.musicTheory.getKeys();
        const currentIndex = keys.indexOf(this.state.currentKey);
        
        let progression = [];
        for (let i = 0; i < 4; i++) {
            const step = this.state.mode === 'fourths' ? -i : i;
            const index = (currentIndex + step * config.step + keys.length) % keys.length;
            progression.push(keys[index]);
        }
        
        this.emit('progressionGenerated', {
            progression,
            mode: this.state.mode
        });
    }

    /**
     * Transpose the circle
     */
    transpose(semitones) {
        const keys = this.musicTheory.getKeys();
        const currentIndex = keys.indexOf(this.state.currentKey);
        
        if (currentIndex === -1) return;
        
        const newIndex = (currentIndex + semitones + keys.length) % keys.length;
        const newKey = keys[newIndex];
        
        this.setKey(newKey, { emitUserEvent: true }); // user-originated via buttons
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScaleCircleExplorer;
}

// Make available globally if in browser
if (typeof window !== 'undefined') {
    window.ScaleCircleExplorer = ScaleCircleExplorer;
}
