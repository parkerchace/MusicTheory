/**
 * @module GuitarFretboardVisualizer
 * @description Interactive guitar fretboard that highlights notes for the selected key/scale.
 * - Standard tuning (E2 A2 D3 G3 B3 E4)
 * - Highlights all scale tones across the fretboard
 * - Emphasizes root note positions
 * - Syncs with ScaleLibrary and PianoVisualizer selections
 */

class GuitarFretboardVisualizer {
    constructor(options = {}) {
        this.options = {
            container: options.container || null,
            frets: options.frets || 22,
            tuningMidi: options.tuningMidi || [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
            showNoteLabels: options.showNoteLabels !== false,
            fitToContainer: options.fitToContainer !== false,
            ...options
        };

        this.state = {
            currentKey: 'C',
            currentScale: 'major',
            scaleNotes: [],
            highlightedNote: null, // specific note name to emphasize
            focusMidi: null // specific midi to focus/scroll
        };

        this.listeners = new Map();
        this.element = null;
        this.gridEl = null;
        this._layoutMode = 'full';
        this._gf_fit = null;
        this._gf_ro = null;
        this._dockHostSize = null;
        this._dockRerenderRaf = 0;

        // Simple note <-> semitone mapping
        this.NOTE_TO_SEMITONE = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };
        this.SEMITONE_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        this.initialize();
    }

    initialize() {
        this.createElement();
        this.render();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event).add(callback);
    }
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(cb => { try { cb(data); } catch(e){ console.error(e);} });
    }

    mount(selectorOrElement) {
        const host = typeof selectorOrElement === 'string' ? document.querySelector(selectorOrElement) : selectorOrElement;
        if (!host) return;

        // Switch to a compact layout when docked in the bottom deck
        try {
            const nextMode = (host.id === 'guitar-dock-container') ? 'dock' : 'full';
            if (nextMode !== this._layoutMode) {
                this._layoutMode = nextMode;
                if (nextMode === 'dock') {
                    this._dockHostSize = { w: host.clientWidth || 0, h: host.clientHeight || 0 };
                } else {
                    this._dockHostSize = null;
                }
                this.element = null;
                this.gridEl = null;
                this.createElement();
                this.render();
            }
        } catch (_) {}

        // Cache current dock size (used to build a fill-to-container dock layout)
        if (this._layoutMode === 'dock') {
            this._dockHostSize = { w: host.clientWidth || 0, h: host.clientHeight || 0 };
        }

        host.innerHTML = '';
        host.appendChild(this.element);
        // Initial apply state
        this.applyState();

        // Dock-fit: re-render geometry to fill the dock (no transform scaling / no creeping)
        try {
            this._installFitObserver(host);
            this._applyFitToHost(host);
        } catch (_) {}
    }

    _installFitObserver(host) {
        if (!host || typeof ResizeObserver === 'undefined') return;
        try {
            if (this._gf_ro) {
                try { this._gf_ro.disconnect(); } catch (_) {}
                this._gf_ro = null;
            }
            let t = null;
            this._gf_ro = new ResizeObserver(() => {
                clearTimeout(t);
                t = setTimeout(() => {
                    try { this._applyFitToHost(host); } catch (_) {}
                }, 80);
            });
            this._gf_ro.observe(host);
        } catch (_) {}
    }

    _applyFitToHost(host) {
        if (!this.options.fitToContainer) return;
        if (this._layoutMode !== 'dock') return;
        const hostW = host.clientWidth || 0;
        const hostH = host.clientHeight || 0;
        if (!hostW || !hostH) return;

        const prev = this._dockHostSize || { w: 0, h: 0 };
        const next = { w: hostW, h: hostH };
        // Ignore tiny jitter that can cause reflow loops
        if (Math.abs(prev.w - next.w) < 2 && Math.abs(prev.h - next.h) < 2) return;
        this._dockHostSize = next;

        if (this._dockRerenderRaf) return;
        this._dockRerenderRaf = requestAnimationFrame(() => {
            this._dockRerenderRaf = 0;
            try {
                // Rebuild element with new geometry sized to the dock
                this.element = null;
                this.gridEl = null;
                this._gf_fit = null;
                this.createElement();
                host.innerHTML = '';
                host.appendChild(this.element);
                this.applyState();
            } catch (_) {}
        });
    }

    createElement() {
        if (this.element) return;
        const compact = this._layoutMode === 'dock';

        const wrap = document.createElement('div');
        wrap.className = 'guitar-fretboard';
        wrap.style.position = 'relative';
        wrap.style.width = '100%';
        wrap.style.overflowX = (compact && this.options.fitToContainer) ? 'hidden' : 'auto';
        wrap.style.overflowY = 'hidden';
        wrap.style.scrollBehavior = 'smooth';
        wrap.style.background = 'linear-gradient(180deg, #1a1410 0%, #0f0a08 100%)';
        wrap.style.border = '2px solid #3d2817';
        wrap.style.borderRadius = '8px';
        wrap.style.boxShadow = 'inset 0 4px 12px rgba(0,0,0,0.6), 0 6px 20px rgba(0,0,0,0.4)';
        wrap.style.padding = compact ? '6px 6px' : '20px 10px';
        if (compact) {
            wrap.style.height = '100%';
            wrap.style.boxSizing = 'border-box';
        }

        // Geometry (single source of truth so frets/notes/labels align)
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        const frets = this.options.frets;

        let fretWidth;
        let openZoneWidth;
        let nutWidth;
        let topPad;
        let stringGap;
        let dotSize;
        let totalWidth;
        let totalHeight;

        if (compact && this.options.fitToContainer && this._dockHostSize && this._dockHostSize.w && this._dockHostSize.h) {
            // Fill the dock: compute geometry from the host size (no transform scaling)
            const hostW = this._dockHostSize.w;
            const hostH = this._dockHostSize.h;
            // Account for wrap padding (6+6) and border (2+2)
            const chromeX = 16;
            const chromeY = 16;
            const targetW = Math.max(240, hostW - chromeX);
            const targetH = Math.max(120, hostH - chromeY);

            topPad = clamp(Math.round(targetH * 0.06), 8, 14);
            stringGap = Math.max(16, (targetH - (topPad * 2) - 18) / 5);
            dotSize = clamp(Math.round(stringGap * 0.78), 14, 26);

            openZoneWidth = clamp(dotSize + 18, 34, 58);
            nutWidth = clamp(Math.round(targetW * 0.014), 8, 12);

            fretWidth = (targetW - openZoneWidth - nutWidth - 20) / frets;
            // Let the dock board grow to fill wide containers.
            // The previous max cap caused a big empty strip on the right.
            fretWidth = clamp(fretWidth, 18, 160);

            totalWidth = Math.floor(openZoneWidth + nutWidth + (frets * fretWidth) + 20);
            totalHeight = Math.floor(topPad * 2 + (stringGap * 5) + 18);
        } else {
            // Default geometry
            fretWidth = compact ? 50 : 58;
            openZoneWidth = 44; // space for open-string markers to the left of the nut
            nutWidth = 10;
            topPad = compact ? 12 : 20;
            stringGap = compact ? 28 : 40;
            dotSize = compact ? 22 : 28;
            totalWidth = openZoneWidth + nutWidth + (frets * fretWidth) + 20;
            totalHeight = topPad * 2 + (stringGap * 5) + 18;
        }

        // Fretboard container with realistic wood texture
        const fretboard = document.createElement('div');
        fretboard.className = 'fretboard-surface';
        fretboard.style.position = 'relative';
        fretboard.style.background = 'linear-gradient(90deg, #4a3728 0%, #6b4f3d 50%, #4a3728 100%)';
        fretboard.style.backgroundSize = '100% 100%';
        fretboard.style.width = `${totalWidth}px`;
        fretboard.style.height = `${totalHeight}px`;
        fretboard.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.4)';
        fretboard.style.borderRadius = '4px';
        fretboard.style.position = 'relative';

        // String lines (visual layer under cells)
        const stringThicknesses = [1.5, 1.8, 2.2, 2.6, 3.0, 3.5]; // high E to low E
        for (let s = 0; s < 6; s++) {
            const stringLine = document.createElement('div');
            stringLine.style.position = 'absolute';
            // Strings begin at the nut (open markers live to the left)
            stringLine.style.left = `${openZoneWidth + nutWidth}px`;
            stringLine.style.right = '10px';
            stringLine.style.top = `${topPad + s * stringGap + (dotSize / 2)}px`;
            stringLine.style.height = `${stringThicknesses[s]}px`;
            stringLine.style.background = 'linear-gradient(180deg, #d4af37 0%, #8b7355 100%)';
            stringLine.style.boxShadow = '0 1px 2px rgba(0,0,0,0.5)';
            stringLine.style.pointerEvents = 'none';
            stringLine.style.zIndex = '1';
            fretboard.appendChild(stringLine);
        }

        // Nut
        const nut = document.createElement('div');
        nut.style.position = 'absolute';
        nut.style.left = `${openZoneWidth}px`;
        nut.style.top = '10px';
        nut.style.bottom = '10px';
        nut.style.width = `${nutWidth}px`;
        nut.style.background = 'linear-gradient(180deg, #f3f4f6 0%, #d1d5db 100%)';
        nut.style.boxShadow = '2px 0 6px rgba(0,0,0,0.65)';
        nut.style.pointerEvents = 'none';
        nut.style.zIndex = '2';
        fretboard.appendChild(nut);

        // Fret wires (end of each fret 1..N)
        for (let f = 1; f <= this.options.frets; f++) {
            const fretWire = document.createElement('div');
            fretWire.style.position = 'absolute';
            fretWire.style.left = `${openZoneWidth + nutWidth + (f * fretWidth)}px`;
            fretWire.style.top = '10px';
            fretWire.style.bottom = '10px';
            fretWire.style.width = '2px';
            fretWire.style.background = '#a0a0a0';
            fretWire.style.boxShadow = '1px 0 3px rgba(0,0,0,0.6)';
            fretWire.style.pointerEvents = 'none';
            fretWire.style.zIndex = '2';
            fretboard.appendChild(fretWire);
        }

        // Inlay markers (dots on the fretboard surface)
        const inlayFrets = [3, 5, 7, 9, 15, 17, 19, 21];
        const doubleInlayFrets = [12];
        
        inlayFrets.forEach(f => {
            const dot = document.createElement('div');
            dot.style.position = 'absolute';
            // Center of fret "f" space (between nut and fret wire f)
            dot.style.left = `${openZoneWidth + nutWidth + ((f - 0.5) * fretWidth)}px`;
            dot.style.top = '50%';
            dot.style.transform = 'translate(-50%, -50%)';
            dot.style.width = '10px';
            dot.style.height = '10px';
            dot.style.borderRadius = '50%';
            dot.style.background = 'radial-gradient(circle, #e8e8e8 0%, #a0a0a0 100%)';
            dot.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(255,255,255,0.2)';
            dot.style.pointerEvents = 'none';
            dot.style.zIndex = '1';
            fretboard.appendChild(dot);
        });

        doubleInlayFrets.forEach(f => {
            [-20, 20].forEach(offset => {
                const dot = document.createElement('div');
                dot.style.position = 'absolute';
                dot.style.left = `${openZoneWidth + nutWidth + ((f - 0.5) * fretWidth)}px`;
                dot.style.top = `calc(50% + ${offset}px)`;
                dot.style.transform = 'translate(-50%, -50%)';
                dot.style.width = '10px';
                dot.style.height = '10px';
                dot.style.borderRadius = '50%';
                dot.style.background = 'radial-gradient(circle, #e8e8e8 0%, #a0a0a0 100%)';
                dot.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(255,255,255,0.2)';
                dot.style.pointerEvents = 'none';
                dot.style.zIndex = '1';
                fretboard.appendChild(dot);
            });
        });

        // Interactive note cells layer (on top of strings and frets)
        const cellLayer = document.createElement('div');
        cellLayer.className = 'guitar-cell-layer';
        cellLayer.style.position = 'absolute';
        cellLayer.style.top = '0';
        cellLayer.style.left = '0';
        cellLayer.style.right = '0';
        cellLayer.style.bottom = '0';
        cellLayer.style.zIndex = '3';

        // Build cells: open markers live to the left of the nut; fretted notes sit between fret wires.
        // Visual order: top row = high E, bottom row = low E
        const tuning = this.options.tuningMidi.slice().reverse(); // [64,59,55,50,45,40]
        for (let s = 0; s < 6; s++) {
            const openMidi = tuning[s];
            // Open string marker (fret 0)
            {
                const midi = openMidi;
                const semitone = midi % 12;
                const noteName = this.SEMITONE_TO_NOTE[semitone];

                const cell = document.createElement('div');
                cell.className = 'fret-cell';
                cell.style.position = 'absolute';
                cell.style.left = `${Math.max(6, (openZoneWidth - dotSize) / 2)}px`;
                cell.style.top = `${topPad + (s * stringGap)}px`;
                cell.style.width = `${dotSize}px`;
                cell.style.height = `${dotSize}px`;
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.15s ease';
                cell.style.borderRadius = '50%';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.opacity = '0.3';
                cell.style.border = '1px solid rgba(255,255,255,0.15)';

                // Metadata
                cell.dataset.midi = String(midi);
                cell.dataset.note = noteName;
                cell.dataset.fret = '0';
                cell.dataset.stringIndex = String(5 - s); // 0=low E ... 5=high E

                // Label (always visible for clarity)
                const label = document.createElement('div');
                label.className = 'fret-label';
                label.textContent = noteName;
                label.style.fontSize = '11px';
                label.style.fontWeight = '700';
                label.style.color = 'rgba(255,255,255,0.7)';
                label.style.pointerEvents = 'none';
                label.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
                cell.appendChild(label);

                // Click -> highlight + audio
                let lastPickAt = 0;
                const onPick = (e) => {
                    const now = Date.now();
                    if (now - lastPickAt < 180) return;
                    lastPickAt = now;

                    try { e.preventDefault(); } catch (_) {}
                    const midiNum = parseInt(cell.dataset.midi, 10);
                    this.state.highlightedNote = cell.dataset.note;
                    this.state.focusMidi = midiNum;
                    this.applyState();
                    
                    const audio = this.options.audioEngine;
                    if (audio && typeof audio.playNote === 'function') {
                        audio.playNote(midiNum, { duration: 1.2 });
                    }
                    this.emit('noteClicked', { note: cell.dataset.note, midi: midiNum });
                };
                cell.addEventListener('pointerdown', onPick, { passive: false });
                cell.addEventListener('click', onPick);

                // Hover styling
                cell.addEventListener('mouseenter', () => {
                    if (cell.style.opacity !== '1') {
                        cell.style.opacity = '0.5';
                    }
                    cell.style.transform = 'scale(1.15)';
                });
                cell.addEventListener('mouseleave', () => {
                    cell.style.transform = 'scale(1)';
                    // Re-apply state styling
                    this.applyState();
                });

                cellLayer.appendChild(cell);
            }

            // Fretted notes (1..N)
            for (let f = 1; f <= this.options.frets; f++) {
                const midi = openMidi + f;
                const semitone = midi % 12;
                const noteName = this.SEMITONE_TO_NOTE[semitone];

                const cell = document.createElement('div');
                cell.className = 'fret-cell';
                cell.style.position = 'absolute';
                // Center of fret space f
                const cx = openZoneWidth + nutWidth + ((f - 0.5) * fretWidth);
                cell.style.left = `${cx - (dotSize / 2)}px`;
                cell.style.top = `${topPad + (s * stringGap)}px`;
                cell.style.width = `${dotSize}px`;
                cell.style.height = `${dotSize}px`;
                cell.style.cursor = 'pointer';
                cell.style.transition = 'all 0.15s ease';
                cell.style.borderRadius = '50%';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.opacity = '0.3';

                // Metadata
                cell.dataset.midi = String(midi);
                cell.dataset.note = noteName;
                cell.dataset.fret = String(f);
                cell.dataset.stringIndex = String(5 - s); // 0=low E ... 5=high E

                const label = document.createElement('div');
                label.className = 'fret-label';
                label.textContent = noteName;
                label.style.fontSize = '11px';
                label.style.fontWeight = '700';
                label.style.color = 'rgba(255,255,255,0.7)';
                label.style.pointerEvents = 'none';
                label.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
                cell.appendChild(label);

                cell.addEventListener('click', (e) => {
                    e.preventDefault();
                    const midiNum = parseInt(cell.dataset.midi, 10);
                    this.state.highlightedNote = cell.dataset.note;
                    this.state.focusMidi = midiNum;
                    this.applyState();
                    
                    const audio = this.options.audioEngine;
                    if (audio && typeof audio.playNote === 'function') {
                        audio.playNote(midiNum, { duration: 1.2 }); // Reset to shorter duration for UI clicks
                    }
                    this.emit('noteClicked', { note: cell.dataset.note, midi: midiNum });
                });

                cell.addEventListener('mouseenter', () => {
                    if (cell.style.opacity !== '1') {
                        cell.style.opacity = '0.5';
                    }
                    cell.style.transform = 'scale(1.15)';
                });
                cell.addEventListener('mouseleave', () => {
                    cell.style.transform = 'scale(1)';
                    this.applyState();
                });

                cellLayer.appendChild(cell);
            }
        }

        fretboard.appendChild(cellLayer);

        const fitWrap = document.createElement('div');
        fitWrap.className = 'fretboard-fitwrap';
        fitWrap.style.position = 'relative';
        fitWrap.style.flex = compact ? '1 1 auto' : '0 0 auto';
        fitWrap.style.width = `${totalWidth}px`;
        fitWrap.style.height = `${totalHeight}px`;
        fitWrap.appendChild(fretboard);
        wrap.appendChild(fitWrap);

        if (!compact) {
            // Fret number labels below fretboard (scrolls with the board)
            const fretNumbers = document.createElement('div');
            fretNumbers.style.display = 'flex';
            fretNumbers.style.marginTop = '8px';
            fretNumbers.style.marginLeft = '10px';
            fretNumbers.style.fontSize = '10px';
            fretNumbers.style.color = 'var(--text-muted)';
            fretNumbers.style.fontFamily = 'monospace';
            fretNumbers.style.width = `${totalWidth}px`;
            // Open label zone
            const openLabel = document.createElement('div');
            openLabel.textContent = 'OPEN';
            openLabel.style.width = `${openZoneWidth + nutWidth}px`;
            openLabel.style.textAlign = 'center';
            openLabel.style.opacity = '0.75';
            fretNumbers.appendChild(openLabel);
            for (let f = 1; f <= this.options.frets; f++) {
                const num = document.createElement('div');
                num.textContent = String(f);
                num.style.width = `${fretWidth}px`;
                num.style.textAlign = 'center';
                fretNumbers.appendChild(num);
            }
            wrap.appendChild(fretNumbers);

            // Legend
            const legend = document.createElement('div');
            legend.style.display = 'flex';
            legend.style.gap = '12px';
            legend.style.marginTop = '12px';
            legend.style.fontSize = '0.75rem';
            legend.style.color = 'var(--text-main)';
            legend.innerHTML = `
                <div style="display:flex; align-items:center; gap:6px"><span style="width:12px; height:12px; background:#10b981; display:inline-block; border-radius:50%;"></span><span>Scale Tone</span></div>
                <div style="display:flex; align-items:center; gap:6px"><span style="width:12px; height:12px; background:#f59e0b; display:inline-block; border-radius:50%;"></span><span>Root</span></div>
                <div style="display:flex; align-items:center; gap:6px"><span style="width:12px; height:12px; background:#60a5fa; display:inline-block; border-radius:50%;"></span><span>Focused</span></div>
            `;
            wrap.appendChild(legend);
        }

        this.element = wrap;
        this.gridEl = cellLayer;

        this._gf_fit = {
            wrap,
            fitWrap,
            surface: fretboard,
            surfaceWidth: totalWidth,
            surfaceHeight: totalHeight
        };
    }

    render() {
        // No-op for now; element created in createElement
        this.applyState();
    }

    renderScale({ key, scale, notes }) {
        this.state.currentKey = key || this.state.currentKey;
        this.state.currentScale = scale || this.state.currentScale;
        this.state.scaleNotes = Array.isArray(notes) ? notes.slice() : this.state.scaleNotes;
        // Reset highlighted on new scale
        this.state.highlightedNote = null;
        this.applyState();
    }

    highlightNote(note) {
        this.state.highlightedNote = note;
        // Update focus to nearest fret of this note near midboard (~5th–7th fret)
        const targetSemitone = this.NOTE_TO_SEMITONE[note] ?? this.NOTE_TO_SEMITONE[this.getEnharmonicEquivalent(note)];
        if (typeof targetSemitone === 'number') {
            this.state.focusMidi = this.findNearestFretMidiForSemitone(targetSemitone);
        }
        this.applyState();
    }

    highlightMidi(midi) {
        this.state.focusMidi = midi;
        const noteName = this.SEMITONE_TO_NOTE[midi % 12];
        this.state.highlightedNote = noteName;
        this.applyState();
    }

    getEnharmonicEquivalent(note) {
        const pairs = { 'C#':'Db','Db':'C#','D#':'Eb','Eb':'D#','F#':'Gb','Gb':'F#','G#':'Ab','Ab':'G#','A#':'Bb','Bb':'A#' };
        return pairs[note] || note;
    }

    findNearestFretMidiForSemitone(semitoneClass) {
        // Choose the fret position closest to the mid-neck (around fret 5–7) on any string
        const preferredFret = 6;
        let best = { midi: null, dist: Infinity };
        const cells = this.gridEl ? Array.from(this.gridEl.querySelectorAll('.fret-cell')) : [];
        for (const cell of cells) {
            const midi = parseInt(cell.dataset.midi, 10);
            const f = parseInt(cell.dataset.fret, 10);
            if (midi % 12 === semitoneClass) {
                const d = Math.abs(f - preferredFret);
                if (d < best.dist) best = { midi, dist: d };
            }
        }
        return best.midi;
    }

    applyState() {
        if (!this.gridEl) return;
        const root = this.state.currentKey;
        const scaleNotes = this.state.scaleNotes || [];
        const rootEquiv = this.getEnharmonicEquivalent(root);

        const focusMidi = this.state.focusMidi;
        const highlightedNote = this.state.highlightedNote;

        const cells = Array.from(this.gridEl.querySelectorAll('.fret-cell'));
        for (const cell of cells) {
            const note = cell.dataset.note;
            const midi = parseInt(cell.dataset.midi, 10);
            const f = parseInt(cell.dataset.fret, 10);
            const label = cell.querySelector('.fret-label');

            const isScaleTone = scaleNotes.some(n => n === note || this.getEnharmonicEquivalent(n) === note);
            const isRoot = (note === root || note === rootEquiv);
            const isFocused = (typeof focusMidi === 'number' && midi === focusMidi) || (highlightedNote && (note === highlightedNote || this.getEnharmonicEquivalent(note) === highlightedNote));

            // Base styling: show scale tones as glowing dots
            if (isScaleTone) {
                cell.style.opacity = '1';
                cell.style.background = 'radial-gradient(circle, rgba(16,185,129,0.9) 0%, rgba(16,185,129,0.6) 100%)';
                cell.style.boxShadow = '0 0 8px rgba(16,185,129,0.6), inset 0 1px 2px rgba(255,255,255,0.3)';
                if (label) {
                    label.style.color = '#fff';
                    label.style.textShadow = '0 1px 3px rgba(0,0,0,0.9)';
                }
            } else {
                cell.style.opacity = '0.3';
                cell.style.background = 'transparent';
                cell.style.boxShadow = 'none';
                if (label) {
                    label.style.color = 'rgba(255,255,255,0.4)';
                    label.style.textShadow = '0 1px 2px rgba(0,0,0,0.6)';
                }
            }

            // Root emphasis: bright orange/gold (only meaningful for scale tones)
            if (isRoot && isScaleTone) {
                cell.style.background = 'radial-gradient(circle, rgba(245,158,11,1) 0%, rgba(245,158,11,0.7) 100%)';
                cell.style.boxShadow = '0 0 12px rgba(245,158,11,0.8), inset 0 1px 2px rgba(255,255,255,0.4)';
                if (label) {
                    label.style.color = '#000';
                    label.style.fontWeight = '900';
                    label.style.textShadow = '0 1px 2px rgba(255,255,255,0.5)';
                }
            }

            // Focused note: bright blue ring — always highlight the focused/focused-midi note
            if (isFocused) {
                cell.style.background = 'radial-gradient(circle, rgba(96,165,250,1) 0%, rgba(96,165,250,0.85) 100%)';
                cell.style.boxShadow = '0 0 20px rgba(96,165,250,1), inset 0 1px 4px rgba(255,255,255,0.6)';
                if (label) {
                    label.style.color = '#000';
                    label.style.fontWeight = '900';
                }
            }
        }
    }
}

// Export/Global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GuitarFretboardVisualizer;
}
if (typeof window !== 'undefined') {
    window.GuitarFretboardVisualizer = GuitarFretboardVisualizer;
}
