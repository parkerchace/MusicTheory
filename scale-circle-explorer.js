/**
 * SCALE CIRCLE EXPLORER MODULE
 *
 * Interactive circle visualization for scales and harmonies
 *
 * Features:
 * - Circle of fifths/fourths/chromatics modes
 * - Interactive key relationships
 * - Scale degree highlighting
 * - Chord progression visualization
 * - Integration with scale library
 */

class ScaleCircleExplorer {
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
     * Render circle visualization
     */
    render() {
        if (!this.containerElement) return;
        // Build inline overlay UI INSIDE the circle to reduce footprint
        const circleConfig = {
            fifths: { title: 'Circle of Fifths', direction: 'clockwise', step: 7 },
            fourths: { title: 'Circle of Fourths', direction: 'counter-clockwise', step: 5 },
            chromatic: { title: 'Chromatic Circle', direction: 'clockwise', step: 1 }
        };
        const config = circleConfig[this.state.mode];

        // Gather scale categories for inline select (fallback if external ScaleLibrary hidden)
        const scaleCategories = (this.musicTheory.getScaleCategories && this.musicTheory.getScaleCategories()) || {};
        const currentScale = (window.modularApp && window.modularApp.scaleLibrary && window.modularApp.scaleLibrary.getCurrentScale && window.modularApp.scaleLibrary.getCurrentScale()) || this.state.scaleType;
        const buildScaleOptions = () => {
            let html = '';
            Object.entries(scaleCategories).forEach(([category, scales]) => {
                html += `<optgroup label="${category}">`;
                scales.forEach(scaleId => {
                    // Try to reuse display name logic from ScaleLibrary if available
                    let displayName = scaleId;
                    if (window.modularApp && window.modularApp.scaleLibrary && typeof window.modularApp.scaleLibrary.getScaleDisplayName === 'function') {
                        displayName = window.modularApp.scaleLibrary.getScaleDisplayName(scaleId);
                    } else {
                        displayName = scaleId.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
                    }
                    const selected = scaleId === currentScale ? 'selected' : '';
                    html += `<option value="${scaleId}" ${selected}>${displayName}</option>`;
                });
                html += '</optgroup>';
            });
            return html;
        };

        this.containerElement.innerHTML = `
            <div class="scale-circle-wrapper">
                <canvas id="circle-canvas" width="420" height="420"></canvas>
                <div class="circle-tooltip" id="circle-tooltip" style="display:none;"></div>
            </div>
            <div class="circle-controls" aria-label="Scale circle controls">
                <div class="cc-row cc-header">${config.title}</div>
                <div class="cc-row cc-modes">
                    <button class="cc-btn ${this.state.mode === 'fifths' ? 'active' : ''}" data-mode="fifths" title="Circle of Fifths">5ths</button>
                    <button class="cc-btn ${this.state.mode === 'fourths' ? 'active' : ''}" data-mode="fourths" title="Circle of Fourths">4ths</button>
                    <button class="cc-btn ${this.state.mode === 'chromatic' ? 'active' : ''}" data-mode="chromatic" title="Chromatic Circle">Chrom</button>
                    <button class="cc-btn ${this.state.showScaleLines ? 'active' : ''}" id="cc-toggle-scale-lines" title="Toggle scale polygon">Scale</button>
                </div>
                <div class="cc-row cc-key-scale">
                    <label class="cc-label" for="cc-key-select">Key</label>
                    <select id="cc-key-select" class="cc-select">
                        ${this.musicTheory.getKeys().map(k=>`<option value="${k}" ${k===this.state.currentKey?'selected':''}>${k}</option>`).join('')}
                    </select>
                    <label class="cc-label" for="cc-scale-select">Scale</label>
                    <select id="cc-scale-select" class="cc-select">
                        ${buildScaleOptions()}
                    </select>
                </div>
                
            </div>
        `;

        // Inject / update styles once (avoid duplicates)
        {
            const existing = document.getElementById('scale-circle-inline-styles');
            const css = `
                .scale-circle-wrapper { position: relative; width: 100%; max-width: 520px; margin: 0 auto; }
                #circle-canvas { width: 100%; height: auto; display: block; border-radius: 50%; background: radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 70%); box-shadow: 0 0 12px rgba(0,0,0,0.4); }
                .circle-tooltip { position:absolute; pointer-events:none; background:#111827; color:#e5e7eb; padding:4px 6px; font-size:11px; border:1px solid rgba(148,163,184,0.35); border-radius:4px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); transform: translate(-50%, -120%); white-space:nowrap; }
                .circle-controls { margin: 10px auto 0; width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 8px; padding: 8px 10px; background: rgba(15,23,42,0.55); border: 1px solid rgba(148,163,184,0.25); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
                .cc-row { display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap; }
                .cc-header { font-weight:600; font-size:12px; color:#e2e8f0; letter-spacing:.5px; }
                .cc-btn { background: rgba(30,41,59,0.6); color:#cbd5e1; border:1px solid rgba(148,163,184,0.3); padding:4px 8px; border-radius:6px; cursor:pointer; font-size:11px; line-height:1; transition:.18s; display:inline-flex; align-items:center; gap:4px; }
                .cc-btn.small { padding:3px 8px; font-size:12px; }
                .cc-btn.grow { flex: 1 1 auto; justify-content:center; }
                .cc-btn.active { background:#2563eb; color:#fff; border-color:#1d4ed8; box-shadow:0 0 0 2px rgba(37,99,235,0.4); }
                .cc-btn:hover { background: rgba(59,130,246,0.4); color:#fff; }
                .cc-select { background: rgba(30,41,59,0.6); color:#f1f5f9; border:1px solid rgba(148,163,184,0.35); border-radius:6px; padding:3px 6px; font-size:11px; min-width:90px; }
                .cc-select:focus { outline:2px solid #2563eb; }
                .cc-label { font-size:10px; font-weight:600; color:#94a3b8; }
                .current-key-pill { background:#334155; color:#f1f5f9; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; min-width:40px; text-align:center; border:1px solid rgba(148,163,184,0.3); }
                @media (max-width: 480px) { .circle-controls { padding:6px 8px; gap:6px; } .cc-select{ min-width:72px; } }
            `;
            if (existing) {
                existing.textContent = css;
            } else {
                const styleEl = document.createElement('style');
                styleEl.id = 'scale-circle-inline-styles';
                styleEl.textContent = css;
                document.head.appendChild(styleEl);
            }
        }
        
        // Add event listeners
        // Mode buttons
        this.containerElement.querySelectorAll('.cc-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });
        // Scale polygon toggle
        const scaleBtn = this.containerElement.querySelector('#cc-toggle-scale-lines');
        if (scaleBtn) {
            scaleBtn.addEventListener('click', () => this.toggleScaleLines());
        }
        // Removed progression and transpose UI; handled in Piano Visualizer
        // Key select
        const keySelect = this.containerElement.querySelector('#cc-key-select');
        if (keySelect) {
            keySelect.addEventListener('change', (e) => {
                const newKey = e.target.value;
                // Update external scale library if present for full app sync
                if (window.modularApp && window.modularApp.scaleLibrary) {
                    window.modularApp.scaleLibrary.setKey(newKey);
                } else {
                    this.setKey(newKey, { emitUserEvent: true });
                }
                // Refresh pill
                const pill = this.containerElement.querySelector('.current-key-pill');
                if (pill) pill.textContent = newKey;
            });
        }
        // Scale select
        const scaleSelect = this.containerElement.querySelector('#cc-scale-select');
        if (scaleSelect) {
            scaleSelect.addEventListener('change', (e) => {
                const newScale = e.target.value;
                if (window.modularApp && window.modularApp.scaleLibrary) {
                    window.modularApp.scaleLibrary.setScale(newScale);
                    // Keep local mirror of scale type for correct select rendering next time
                    this.state.scaleType = newScale;
                } else {
                    this.state.scaleType = newScale;
                    // If no external library, emit synthetic scale change
                    this.emit('scaleTypeChanged', { scale: newScale });
                }
                this.render();
            });
        }
        
        const canvas = this.containerElement.querySelector('#circle-canvas');
        canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        canvas.addEventListener('mouseleave', () => this.handleCanvasLeave());

        // No overlay collapse; controls live under the circle now
        
        // Render circle
        this.renderCircleCanvas();
    }

    setupResizeObserver() {
        const wrapper = this.containerElement && this.containerElement.querySelector('.scale-circle-wrapper');
        const canvas = this.containerElement && this.containerElement.querySelector('#circle-canvas');
        if (!wrapper || !canvas) return;

        const updateSize = () => {
            const rect = wrapper.getBoundingClientRect();
            const size = Math.min(rect.width, 520); // cap to reduce GPU cost
            // Ensure crisp canvas by setting intrinsic pixels
            canvas.width = Math.floor(size);
            canvas.height = Math.floor(size);
            this.renderCircleCanvas();
        };

        if (typeof ResizeObserver !== 'undefined') {
            this._ro = new ResizeObserver(() => updateSize());
            this._ro.observe(wrapper);
        } else {
            window.addEventListener('resize', updateSize);
        }
        updateSize();
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
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.8;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = '#ddd';
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
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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
                
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
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
            ctx.fillStyle = this.state.highlightedKeys.includes(key) ? '#ff9900' : 
                            (this.isNoteInScale(key)) ? '#10b981' : '#6b7280';
            ctx.fill();
            
            // Draw key label
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
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
                ctx.strokeStyle = '#38bdf8';
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
            ctx.strokeStyle = '#ff7f0e';
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
        if (!info) { tooltip.style.display = 'none'; return; }
        tooltip.textContent = `${info.key}`;
        tooltip.style.left = `${info.x}px`;
        tooltip.style.top = `${info.y}px`;
        tooltip.style.display = 'block';
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
