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

// Key names for the bar, labels for what a wedge shows, and the geometry of the two rings.
const CIRCLE_MODES = [
    ['fifths', '5ths', 'Circle of Fifths: keys a perfect fifth apart', 'Clockwise adds a sharp; counterclockwise adds a flat.'],
    ['fourths', '4ths', 'Circle of Fourths: keys a perfect fourth apart', 'Each step is a plagal move, IV to I.'],
    ['chromatic', 'Chrom', 'Chromatic Circle: all 12 pitches by semitone', 'All 12 pitches, a half step apart.']
];
const CIRCLE_LABELS = [
    ['notes', 'Notes', 'Show note names'],
    ['numbers', '1 2 3', 'Show the scale as numbers'],
    ['both', 'Both', 'Note names with the scale\'s numbers']
];
const CIRCLE_LABEL_KEY = 'circle-label-mode';
const CIRCLE_LETTERS = 'CDEFGAB';
const CIRCLE_NATURALS = [0, 2, 4, 5, 7, 9, 11];
const CIRCLE_WEDGE = Math.PI / 6;

const circlePretty = s => { s = String(s || ''); return s.charAt(0) + s.slice(1).replace(/b/g, '♭').replace(/#/g, '♯'); };
const circleClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
            hoveredKey: null,
            hoveredRing: null,
            labelMode: this._loadLabelMode()
        };

        this.listeners = new Map();
        this.containerElement = null;
        this.canvas = null;
        this.ctx = null;
        this.size = null;
        this.frameId = null;
        this.drawn = false;     // the first drawing snaps; later changes glide
        this.anim = { wedges: {}, minor: 1, polygon: 0, marker: 0 };
        this.theme = { text: '#ffffff', muted: '#cbd5e1', accent: '#60a5fa', lit: '#34d399', border: '#52525b', deep: '#09090b', font: 'Segoe UI, Arial, sans-serif' };
        this.frame = this.frame.bind(this);
    }

    _loadLabelMode() {
        try {
            const saved = localStorage.getItem(CIRCLE_LABEL_KEY);
            if (CIRCLE_LABELS.some(m => m[0] === saved)) return saved;
        } catch (_) {}
        return 'both';
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
        // Any spelling of a pitch: a chromatic position may be C# where the list of keys says Db.
        if (this._pitchClass(key) === null) return;
        const real = this.musicTheory.getKeys().find(k => this._pitchClass(k) === this._pitchClass(key));
        if (!real) return;
        key = options.emitUserEvent ? real : key;

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
     * Check if a note is in the scale, by pitch: the scale may spell it another way
     */
    isNoteInScale(note) {
        const pc = this._pitchClass(note);
        return pc !== null && (this.state.scaleNotes || []).some(n => this._pitchClass(n) === pc);
    }

    _pitchClass(note) {
        const m = String(note || '').match(/^([A-G])([#b]*)/);
        if (!m) return null;
        const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
        const acc = m[2].split('').reduce((a, c) => a + (c === '#' ? 1 : -1), 0);
        return ((base + acc) % 12 + 12) % 12;
    }

    /** The name a circle position is drawn with: the scale's spelling if the scale uses that pitch. */
    labelForKey(key) {
        const pc = this._pitchClass(key);
        const own = (this.state.scaleNotes || []).find(n => this._pitchClass(n) === pc);
        return own ? String(own).replace(/-?\d+$/, '') : key;
    }

    /** The scale the app is in, so the context panel names it (it used to read "Major" in any mode). */
    setScaleType(scaleType) {
        if (!scaleType || scaleType === this.state.scaleType) return;
        this.state.scaleType = scaleType;
        this.render();
    }

    /**
     * Check if a note is in the generated notes, by pitch
     */
    isNoteGenerated(note) {
        const pc = this._pitchClass(note);
        return pc !== null && (this.state.generatedNotes || []).some(n => this._pitchClass(n) === pc);
    }

    /** A note's number in the current scale, or null if the scale doesn't have it. */
    degreeOf(note) {
        const pc = this._pitchClass(note);
        const i = (this.state.scaleNotes || []).findIndex(n => this._pitchClass(n) === pc);
        return i === -1 ? null : i + 1;
    }

    /** The relative minor's root, spelled two letters below: C to A, F# to D#, Gb to Eb. */
    relativeMinor(key) {
        const letter = CIRCLE_LETTERS.indexOf(String(key).charAt(0));
        const pc = this._pitchClass(key);
        if (letter === -1 || pc === null) return key;
        const target = (letter + 5) % 7;
        const off = ((pc + 9 - CIRCLE_NATURALS[target]) % 12 + 18) % 12 - 6;
        return CIRCLE_LETTERS[target] + (off > 0 ? '#'.repeat(off) : 'b'.repeat(-off));
    }

    /** How a major key's signature reads: "2♯", "3♭", or "no ♯ or ♭". */
    signatureText(key) {
        const sig = this.musicTheory.keySignatures && this.musicTheory.keySignatures[key];
        if (!sig) return '';
        if (!sig.accidentals.length) return 'no ♯ or ♭';
        return `${sig.accidentals.length}${sig.type === 'sharp' ? '♯' : '♭'}`;
    }

    /** The accidentals the current scale actually has. A aeolian has none, whatever A major has. */
    scaleSignatureText() {
        const notes = this.state.scaleNotes || [];
        if (!notes.length) return this.signatureText(this.state.currentKey);
        const count = mark => notes.reduce((n, note) => n + (String(note).slice(1).split(mark).length - 1), 0);
        const sharps = count('#'), flats = count('b');
        if (!sharps && !flats) return 'no ♯ or ♭';
        return [sharps ? `${sharps}♯` : '', flats ? `${flats}♭` : ''].filter(Boolean).join(' ');
    }

    isMinorHome() {
        return /minor|aeolian/i.test(this.state.scaleType || '');
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
        this.build();
        this.render();
    }

    /** The bar, the canvas and the tooltip are made once; a change of key redraws, it doesn't rebuild. */
    build() {
        const root = this.containerElement;
        this.injectStyles();
        root.classList.add('circle-root');
        const seg = (items, attr) => items.map(m => `<button type="button" class="viz-btn" ${attr}="${m[0]}" title="${m[2]}">${m[1]}</button>`).join('');
        root.innerHTML = `
            <div class="viz-bar" id="circle-controls">
                <button type="button" class="viz-btn" id="play-scale-btn" title="Play the scale">▶</button>
                <span class="viz-seg" role="group" aria-label="How the keys are arranged">${seg(CIRCLE_MODES, 'data-mode')}</span>
                <span class="viz-seg" role="group" aria-label="What the wedges show">${seg(CIRCLE_LABELS, 'data-label-mode')}</span>
                <details class="viz-more">
                    <summary class="viz-btn" title="Display options" aria-label="Display options">⋯</summary>
                    <div class="viz-more-panel">
                        <label class="viz-check" title="Join the scale's notes in order across the middle"><input type="checkbox" id="toggle-scale-polygon"> Scale polygon</label>
                        <button type="button" class="viz-btn" id="random-key-btn">Random key</button>
                        <button type="button" class="viz-btn" id="clear-highlights-btn">Clear highlights</button>
                    </div>
                </details>
            </div>
            <canvas id="circle-canvas" role="img"></canvas>
            <div class="circle-side" hidden></div>
            <div class="circle-tooltip" id="circle-tooltip"></div>
        `;
        this.canvas = root.querySelector('#circle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.side = root.querySelector('.circle-side');
        this.moreMenu = root.querySelector('.viz-more');
        this.setupModernEventListeners();
        this.readTheme();
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => this.handleResize());
            this.resizeObserver.observe(this.canvas);
        }
        if (window.MutationObserver) {
            this.themeObserver = new MutationObserver(() => this.readTheme());
            this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-look'] });
        }
        this.handleResize();
    }

    injectStyles() {
        if (document.getElementById('circle-styles')) return;
        const style = document.createElement('style');
        style.id = 'circle-styles';
        style.textContent = `
            .circle-root { display: flex; flex-direction: column; position: relative; min-width: 0; }
            .circle-root > canvas { display: block; width: 100%; aspect-ratio: 1 / 1; min-height: 220px; max-height: min(680px, 70vh); }
            .circle-side {
                position: absolute; top: 36px; width: 236px; max-height: calc(100% - 42px); overflow: hidden auto; box-sizing: border-box; padding: 8px;
                display: grid; gap: 8px; font-size: 11px; color: var(--text-main, #fff);
                background: color-mix(in srgb, var(--bg-panel, #27272a) 88%, transparent); border: 1px solid var(--border-light, #52525b); border-radius: var(--radius-md, 4px);
            }
            .circle-side[hidden] { display: none; }
            .circle-side-title { font-size: 13px; font-weight: 700; }
            .circle-side-sig { color: var(--text-muted, #d4d4d8); font-weight: 400; font-size: 11px; }
            .circle-side-head { color: var(--text-muted, #d4d4d8); margin-bottom: 3px; }
            .circle-side-row { display: flex; flex-wrap: wrap; gap: 3px; }
            .circle-chip { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
            .circle-chip b { display: inline-flex; align-items: center; justify-content: center; min-width: 15px; height: 15px; padding: 0 2px; box-sizing: border-box; border-radius: 8px; background: var(--accent-secondary, #34d399); color: #071018; font-size: 10px; }
            .circle-chip.is-tonic b { background: #ffb02e; }
            .circle-side .viz-btn { justify-content: flex-start; }
            .circle-side-tip { color: var(--text-muted, #d4d4d8); font-size: 10px; line-height: 1.3; }
            .circle-tooltip { position: absolute; display: none; pointer-events: none; z-index: 8; max-width: 240px; background: rgba(2,6,23,0.92); color: #e5e7eb; padding: 5px 8px; border-radius: 5px; font-size: 11px; line-height: 1.35; box-shadow: 0 2px 8px rgba(0,0,0,0.35); }
        `;
        document.head.appendChild(style);
    }

    /**
     * Bring the controls and the drawing up to date with the state.
     */
    render() {
        if (!this.containerElement || !this.canvas) return;
        const root = this.containerElement;
        root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === this.state.mode)));
        root.querySelectorAll('[data-label-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.labelMode === this.state.labelMode)));
        const polygon = root.querySelector('#toggle-scale-polygon');
        if (polygon) polygon.checked = this.state.showScaleLines;
        const notes = this.state.scaleNotes.length ? `Scale: ${this.state.scaleNotes.map((n, i) => `${i + 1} ${circlePretty(n)}`).join(', ')}.` : 'No scale selected.';
        this.canvas.setAttribute('aria-label', `${this.getCircleConfig()[this.state.mode].title}, in ${circlePretty(this.state.currentKey)} ${this.formatScaleName()}. ${notes}`);
        this.renderSide();
        this.requestDraw();
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
        return this.state.scaleType.replace(/_/g, ' ');
    }

    getKeySignatureInfo() {
        if (!this.musicTheory.keySignatures || !this.musicTheory.keySignatures[this.state.currentKey]) {
            return { accidentals: [], type: 'natural' };
        }
        return this.musicTheory.keySignatures[this.state.currentKey];
    }

    /** With room beside the circle: the scale as numbers, and the keys closest to this one. */
    renderSide() {
        const side = this.side;
        if (!side) return;
        if (!this.containerElement.classList.contains('circle-wide')) {
            side.hidden = true;
            side.innerHTML = '';
            this.layout = null;
            return;
        }
        const key = this.state.currentKey;
        const order = this.getKeyOrder();
        const here = order.findIndex(k => this._pitchClass(k) === this._pitchClass(key));
        const at = i => order[(here + i + 12) % 12];
        // the major whose relative minor this key is: three semitones up
        const relative = order.find(k => this._pitchClass(k) === (this._pitchClass(key) + 3) % 12) || key;
        const chip = (k, text, extra = '') => `<button type="button" class="viz-btn" data-go-key="${k}" ${extra}>${text}</button>`;
        const neighbours = this.state.mode === 'chromatic' ? '' : `
            <div>
                <div class="circle-side-head">Closest keys</div>
                <div class="circle-side-row">
                    ${chip(at(-1), `◀ ${circlePretty(at(-1))}`, `title="${circlePretty(at(-1))}: one step ${this.state.mode === 'fifths' ? 'counterclockwise' : 'back'}"`)}
                    ${chip(at(1), `${circlePretty(at(1))} ▶`, `title="${circlePretty(at(1))}: one step ${this.state.mode === 'fifths' ? 'clockwise' : 'on'}"`)}
                    ${this.isMinorHome() ? `<button type="button" class="viz-btn" data-go-major="${relative}" title="The relative major: the same notes, a new home">${circlePretty(relative)}</button>`
                        : `<button type="button" class="viz-btn" data-go-minor="${this.relativeMinor(key)}" title="The relative minor: the same notes, a new home">${circlePretty(this.relativeMinor(key))}m</button>`}
                </div>
            </div>`;
        const notes = this.state.scaleNotes.map((n, i) => `<span class="circle-chip ${i === 0 ? 'is-tonic' : ''}"><b>${i + 1}</b>${circlePretty(n)}</span>`).join(' ');
        const tip = CIRCLE_MODES.find(m => m[0] === this.state.mode)[3];
        side.innerHTML = `
            <div class="circle-side-title">${circlePretty(key)} ${this.formatScaleName()} <span class="circle-side-sig">${this.scaleSignatureText()}</span></div>
            ${notes ? `<div><div class="circle-side-head">The scale</div><div class="circle-side-row">${notes}</div></div>` : ''}
            ${neighbours}
            <div class="circle-side-tip">${tip}</div>
        `;
        side.hidden = false;
        this.layout = null;
    }

    /** A change of home and of scale together: the relative minor or major. */
    goToRelative(root, scale) {
        const real = this.musicTheory.getKeys().find(k => this._pitchClass(k) === this._pitchClass(root)) || root;
        this.state.currentKey = real;
        this.render();
        this.emit('keyChanged', { key: real });
        this.emit('keySelected', { key: real, scale });
    }

    setupModernEventListeners() {
        const root = this.containerElement;
        root.querySelectorAll('[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
        });
        root.querySelectorAll('[data-label-mode]').forEach(btn => {
            btn.addEventListener('click', () => this.setLabelMode(btn.dataset.labelMode));
        });

        // Scale polygon toggle
        const polygonToggle = root.querySelector('#toggle-scale-polygon');
        if (polygonToggle) {
            polygonToggle.addEventListener('change', () => {
                this.toggleScaleLines();
            });
        }

        // Action buttons
        const playScaleBtn = root.querySelector('#play-scale-btn');
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

        const randomKeyBtn = root.querySelector('#random-key-btn');
        if (randomKeyBtn) {
            randomKeyBtn.addEventListener('click', () => {
                const keys = this.musicTheory.getKeys();
                const randomKey = keys[Math.floor(Math.random() * keys.length)];
                this.setKey(randomKey, { emitUserEvent: true });
            });
        }

        const clearBtn = root.querySelector('#clear-highlights-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.state.highlightedKeys = [];
                this.state.scaleNotes = [];
                this.state.generatedNotes = [];
                this.render();
            });
        }

        this.side.addEventListener('click', (e) => {
            const go = e.target.closest && e.target.closest('[data-go-key]');
            if (go) { this.setKey(go.dataset.goKey, { emitUserEvent: true }); return; }
            const minor = e.target.closest && e.target.closest('[data-go-minor]');
            if (minor) { this.goToRelative(minor.dataset.goMinor, 'aeolian'); return; }
            const major = e.target.closest && e.target.closest('[data-go-major]');
            if (major) this.goToRelative(major.dataset.goMajor, 'major');
        });

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.handleCanvasLeave());
    }

    setLabelMode(mode) {
        if (!CIRCLE_LABELS.some(m => m[0] === mode)) return;
        this.state.labelMode = mode;
        try { localStorage.setItem(CIRCLE_LABEL_KEY, mode); } catch (_) {}
        this.render();
    }

    /**
     * Get key order for current mode, respecting key signature
     */
    getKeyOrder() {
        const allKeys = this.musicTheory.getKeys();
        
        // The positions are KEYS, named the way keys are named: a sharp key's
        // circle goes round to F# and C#, a flat key's to Gb and Db, and the far
        // side is always Ab Eb Bb F. (It used to read G# D# A# E# in any sharp
        // key — E# where F belongs, and no such key as G# major — and, in
        // fourths, Bbb Ebb Abb for A D G.) What a position is *called* on the
        // drawing follows the current scale's own spelling; see labelForKey().
        const sig = (this.state.currentKey && this.musicTheory.keySignatures)
            ? this.musicTheory.keySignatures[this.state.currentKey] : null;
        const sharp = !!sig && sig.type === 'sharp';
        const flat = !!sig && sig.type === 'flat';

        switch (this.state.mode) {
            case 'fifths':
                if (sharp) return ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F'];
                if (flat) return ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
                return ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

            case 'fourths':
                if (sharp) return ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B', 'E', 'A', 'D', 'G'];
                return ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'];
            
            case 'chromatic':
                // True chromatic circle, in the accidentals its key uses
                if (flat) return ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
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

    /* ---------- sizing ------------------------------------------------- */

    /**
     * The rings in a W x H box. The circle stays round and as big as the box
     * allows. If the box is wide enough to spare it, the scale panel sits
     * beside the circle and the pair is centred.
     */
    computeLayout(W, H, sideW, showMinor = 1) {
        const R = Math.max(40, Math.min(W - (sideW ? sideW + 14 : 0), H) / 2 - 5);
        const group = 2 * R + (sideW ? sideW + 14 : 0);
        const cx = (W - group) / 2 + R;
        const cy = H / 2;
        const r1 = R * 0.7;
        const r2 = r1 - (r1 - R * 0.44) * showMinor;
        return { W, H, R, r1, r2, cx, cy, sideLeft: cx + R + 14 };
    }

    handleResize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        const bw = Math.round(rect.width * dpr), bh = Math.round(rect.height * dpr);
        if (this.canvas.width !== bw || this.canvas.height !== bh) {
            this.canvas.width = bw;
            this.canvas.height = bh;
        }
        this.dpr = dpr;
        this.size = { w: rect.width, h: rect.height };
        const wide = rect.width >= rect.height + 256 && rect.height >= 220;
        if (this.containerElement.classList.contains('circle-wide') !== wide) {
            this.containerElement.classList.toggle('circle-wide', wide);
            this.renderSide();
        }
        this.containerElement.classList.toggle('viz-narrow', rect.width < 400);
        this.layout = null;
        this.draw();
    }

    readTheme() {
        if (!document.body) return;
        const cs = getComputedStyle(document.body);
        const v = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback;
        this.theme = {
            text: v('--text-main', '#ffffff'),
            muted: v('--text-muted', '#cbd5e1'),
            accent: v('--accent-primary', '#60a5fa'),
            lit: v('--accent-secondary', '#34d399'),
            border: v('--border-light', '#52525b'),
            deep: v('--bg-input', '#09090b'),
            font: v('--font-ui', 'Segoe UI, Arial, sans-serif')
        };
        this.requestDraw();
    }

    currentLayout() {
        if (this.layout && this.layout.showMinor === this.anim.minor) return this.layout;
        const sideW = this.side && !this.side.hidden ? this.side.offsetWidth : 0;
        const g = this.computeLayout(this.size.w, this.size.h, sideW, this.anim.minor);
        g.showMinor = this.anim.minor;
        if (sideW) {
            this.side.style.left = `${Math.round(g.sideLeft)}px`;
            const bar = this.canvas.offsetTop;
            this.side.style.top = `${bar + Math.max(6, (this.size.h - this.side.offsetHeight) / 2)}px`;
        }
        this.layout = g;
        return g;
    }

    /* ---------- motion ------------------------------------------------- */

    /** What every wedge is heading for: its place in the current order, and how lit it should be. */
    wedgeTargets() {
        const tonic = this._pitchClass(this.state.currentKey);
        return this.getKeyOrder().map((key, i) => {
            const pc = this._pitchClass(key);
            return {
                key, pc,
                angle: i * CIRCLE_WEDGE,
                lit: this.isNoteInScale(key) ? 1 : 0,
                tonic: pc === tonic ? 1 : 0
            };
        });
    }

    requestDraw() {
        if (this.frameId || !this.ctx || typeof requestAnimationFrame === 'undefined') return;
        this.lastFrame = 0;
        this.frameId = requestAnimationFrame(this.frame);
    }

    frame(now) {
        this.frameId = null;
        if (!this.ctx || !this.size || !this.canvas.getClientRects().length) return;
        const dt = this.lastFrame ? circleClamp((now - this.lastFrame) / 16.67, 0, 3) : 1;
        this.lastFrame = now;
        const moving = this.step(dt);
        this.draw();
        if (moving) this.frameId = requestAnimationFrame(this.frame);
    }

    /** Eases everything a step toward its target; returns whether anything is still moving. */
    step(dt) {
        const ease = 1 - Math.pow(0.82, dt);
        const targets = this.wedgeTargets();
        const anim = this.anim;
        let moving = false;
        const toward = (now, goal) => {
            const d = goal - now;
            if (Math.abs(d) < 0.004) return goal;
            moving = true;
            return now + d * ease;
        };
        const shortest = (from, to) => from + ((to - from + Math.PI * 3) % (Math.PI * 2) - Math.PI);
        const snap = !this.drawn;
        targets.forEach(t => {
            const w = anim.wedges[t.pc] || (anim.wedges[t.pc] = { angle: t.angle, lit: t.lit, tonic: t.tonic });
            w.key = t.key;
            if (snap) { w.angle = t.angle; w.lit = t.lit; w.tonic = t.tonic; return; }
            w.angle = toward(w.angle, shortest(w.angle, t.angle));
            w.lit = toward(w.lit, t.lit);
            w.tonic = toward(w.tonic, t.tonic);
        });
        const minor = this.state.mode === 'chromatic' ? 0 : 1;
        const polygon = this.state.showScaleLines && this.state.scaleNotes.length ? 1 : 0;
        const tonicWedge = anim.wedges[this._pitchClass(this.state.currentKey)];
        if (snap) {
            anim.minor = minor; anim.polygon = polygon;
            if (tonicWedge) anim.marker = tonicWedge.angle;
        } else {
            anim.minor = toward(anim.minor, minor);
            anim.polygon = toward(anim.polygon, polygon);
            if (tonicWedge) anim.marker = toward(anim.marker, shortest(anim.marker, tonicWedge.angle));
        }
        this.drawn = true;
        return moving;
    }

    /* ---------- drawing ------------------------------------------------ */

    wedgePath(ctx, g, angle, outer, inner, pop = 0) {
        const a = angle - Math.PI / 2;
        const half = CIRCLE_WEDGE / 2;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, outer + pop, a - half, a + half);
        ctx.arc(g.cx, g.cy, inner, a + half, a - half, true);
        ctx.closePath();
    }

    polar(g, angle, r) {
        const a = angle - Math.PI / 2;
        return { x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
    }

    centredText(ctx, text, x, y, size, weight, color) {
        ctx.font = `${weight} ${size}px ${this.theme.font}`;
        // A note name's accidental comes from a wider font; pull it in. Not in words ("no ♯ or ♭").
        ctx.letterSpacing = /^[A-G][♭♯]/.test(text) ? `${-size * 0.14}px` : '0px';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    }

    draw() {
        const ctx = this.ctx;
        if (!ctx || !this.size) return;
        if (!this.drawn) this.step(1);
        const g = this.currentLayout();
        const dpr = this.dpr || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, g.W, g.H);

        const wedges = this.getKeyOrder().map(k => this.anim.wedges[this._pitchClass(k)]).filter(Boolean);
        this.drawOuterRing(ctx, g, wedges);
        if (this.anim.minor > 0.01) this.drawMinorRing(ctx, g, wedges);
        this.drawCore(ctx, g);
        if (this.anim.polygon > 0.01) this.drawPolygon(ctx, g);
        this.drawMarker(ctx, g);
    }

    drawOuterRing(ctx, g, wedges) {
        const t = this.theme;
        const band = g.R - g.r1;
        const mode = this.state.labelMode;
        const hover = this.state.hoveredRing === 'major' ? this._pitchClass(this.state.hoveredKey) : null;
        wedges.forEach(w => {
            const hovered = hover === this._pitchClass(w.key);
            const pop = hovered ? 3 : 0;

            this.wedgePath(ctx, g, w.angle, g.R, g.r1, pop);
            ctx.globalAlpha = 1;
            ctx.fillStyle = t.deep;
            ctx.fill();
            ctx.fillStyle = t.muted;
            ctx.globalAlpha = hovered ? 0.3 : 0.14;
            ctx.fill();
            if (w.lit > 0.01) {
                ctx.fillStyle = t.lit;
                ctx.globalAlpha = w.lit * (hovered ? 1 : 0.88);
                ctx.fill();
            }
            if (w.tonic > 0.01) {
                const mid = this.polar(g, w.angle, (g.R + g.r1) / 2);
                const warm = ctx.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, band);
                warm.addColorStop(0, '#ffd25e');
                warm.addColorStop(1, '#f2811d');
                ctx.fillStyle = warm;
                ctx.globalAlpha = w.tonic;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.strokeStyle = t.deep;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (this.state.highlightedKeys.includes(w.key)) {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            this.drawWedgeLabel(ctx, g, w, band, mode);
        });
        ctx.globalAlpha = 1;
    }

    /**
     * Inside a wedge: its number in the scale above its name. In numbers mode a
     * scale tone is its number alone, and any other wedge keeps its name, small,
     * so it can still be found.
     */
    drawWedgeLabel(ctx, g, w, band, mode) {
        const t = this.theme;
        const onLight = w.lit > 0.5 || w.tonic > 0.5;
        const ink = onLight ? '#071018' : t.text;
        const dim = onLight ? '#071018' : t.muted;
        const label = circlePretty(this.labelForKey(w.key));
        const degree = this.degreeOf(w.key);
        const main = circleClamp(band * 0.42, 11, 28);
        const small = circleClamp(band * 0.2, 8.5, 13);
        const mid = (g.R + g.r1) / 2;

        if (mode === 'numbers' && degree) {
            const p = this.polar(g, w.angle, mid);
            this.centredText(ctx, String(degree), p.x, p.y + 0.5, main * 1.1, 800, ink);
        } else if (mode === 'numbers') {
            const p = this.polar(g, w.angle, mid);
            this.centredText(ctx, label, p.x, p.y + 0.5, small, 600, dim);
        } else {
            const withNumber = mode === 'both' && degree;
            const nameR = withNumber ? mid - band * 0.1 : mid;
            const p = this.polar(g, w.angle, nameR);
            this.centredText(ctx, label, p.x, p.y + 0.5, main, 700, degree || w.tonic > 0.5 ? ink : t.muted);
            if (withNumber) {
                const n = this.polar(g, w.angle, g.R - band * 0.16);
                this.centredText(ctx, String(degree), n.x, n.y + 0.5, small, 800, ink);
            }
        }
        if (this.isNoteGenerated(w.key)) {
            const dot = this.polar(g, w.angle + CIRCLE_WEDGE * 0.32, g.R - 7);
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    drawMinorRing(ctx, g, wedges) {
        const t = this.theme;
        const band = g.r1 - g.r2;
        const tonicPc = this._pitchClass(this.state.currentKey);
        const minorHome = this.isMinorHome();
        const hover = this.state.hoveredRing === 'minor' ? this._pitchClass(this.state.hoveredKey) : null;
        wedges.forEach(w => {
            const root = this.relativeMinor(w.key);
            const isHome = minorHome && this._pitchClass(root) === tonicPc;
            const isRelative = !minorHome && this._pitchClass(w.key) === tonicPc;
            const hovered = hover === this._pitchClass(w.key);
            this.wedgePath(ctx, g, w.angle, g.r1, g.r2, 0);
            ctx.globalAlpha = this.anim.minor;
            ctx.fillStyle = t.deep;
            ctx.fill();
            ctx.fillStyle = isHome ? '#f2811d' : (isRelative ? t.accent : t.muted);
            ctx.globalAlpha = this.anim.minor * (isHome ? 0.95 : isRelative ? 0.5 : hovered ? 0.24 : 0.07);
            ctx.fill();
            ctx.globalAlpha = this.anim.minor;
            ctx.strokeStyle = t.deep;
            ctx.lineWidth = 1.25;
            ctx.stroke();
            if (band >= 16) {
                const p = this.polar(g, w.angle, (g.r1 + g.r2) / 2);
                this.centredText(ctx, `${circlePretty(root)}m`, p.x, p.y + 0.5, circleClamp(band * 0.33, 9, 16), 600, isHome ? '#071018' : (isRelative ? t.text : t.muted));
            }
        });
        ctx.globalAlpha = 1;
    }

    drawCore(ctx, g) {
        const t = this.theme;
        const r = g.r2 - 3;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, r, 0, Math.PI * 2);
        ctx.fillStyle = t.deep;
        ctx.fill();
        ctx.strokeStyle = t.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        const fade = 1 - this.anim.polygon * 0.55;
        ctx.globalAlpha = fade;
        const key = circleClamp(r * 0.56, 14, 54);
        this.centredText(ctx, circlePretty(this.state.currentKey), g.cx, g.cy - r * 0.2, key, 800, t.text);
        // the scale's name, shrunk until it fits across the middle
        const name = this.formatScaleName();
        let size = circleClamp(r * 0.2, 8.5, 15);
        ctx.font = `600 ${size}px ${t.font}`;
        const fits = r * 1.7;
        const tw = ctx.measureText(name).width;
        if (tw > fits) size = Math.max(7.5, size * fits / tw);
        this.centredText(ctx, name, g.cx, g.cy + r * 0.26, size, 600, t.muted);
        const sig = this.scaleSignatureText();
        if (sig) this.centredText(ctx, sig, g.cx, g.cy + r * 0.52, circleClamp(r * 0.18, 8.5, 14), 500, t.muted);
        ctx.globalAlpha = 1;
    }

    /** The scale in order, as a shape across the middle. */
    drawPolygon(ctx, g) {
        const r = g.r2 - 8;
        const points = this.state.scaleNotes.map(n => {
            const w = this.anim.wedges[this._pitchClass(n)];
            return w ? this.polar(g, w.angle, r) : null;
        }).filter(Boolean);
        if (points.length < 2) return;
        ctx.globalAlpha = this.anim.polygon;
        ctx.beginPath();
        points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        ctx.fillStyle = this.theme.lit;
        ctx.globalAlpha = this.anim.polygon * 0.14;
        ctx.fill();
        ctx.globalAlpha = this.anim.polygon * 0.85;
        ctx.strokeStyle = this.theme.lit;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    /** A bright arc on the rim that travels to the current key when it changes. */
    drawMarker(ctx, g) {
        const a = this.anim.marker - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(g.cx, g.cy, g.R + 2, a - CIRCLE_WEDGE * 0.46, a + CIRCLE_WEDGE * 0.46);
        ctx.strokeStyle = '#ffb02e';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';
    }

    /* ---------- pointer ------------------------------------------------ */

    /** Which wedge a point is on: the key, and whether it is the major or the relative-minor ring. */
    wedgeAt(x, y) {
        if (!this.size) return null;
        const g = this.currentLayout();
        const dist = Math.hypot(x - g.cx, y - g.cy);
        if (dist > g.R + 4 || dist < g.r2) return null;
        const ring = dist >= g.r1 || this.state.mode === 'chromatic' ? 'major' : 'minor';
        const angle = Math.atan2(y - g.cy, x - g.cx) + Math.PI / 2;
        const i = ((Math.round(angle / CIRCLE_WEDGE) % 12) + 12) % 12;
        return { key: this.getKeyOrder()[i], ring };
    }

    /** Where a key's wedge is on the page, for whatever needs to point at it. */
    keyPoint(key) {
        if (!this.size || !this.canvas) return null;
        const g = this.currentLayout();
        const i = this.getKeyOrder().findIndex(k => this._pitchClass(k) === this._pitchClass(key));
        if (i === -1) return null;
        const r = this.canvas.getBoundingClientRect();
        const p = this.polar(g, i * CIRCLE_WEDGE, (g.R + g.r1) / 2);
        return { x: r.left + p.x, y: r.top + p.y };
    }

    pointerIn(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    /**
     * Handle canvas click
     */
    handleCanvasClick(e) {
        if (this.moreMenu) this.moreMenu.open = false;
        const { x, y } = this.pointerIn(e);
        const hit = this.wedgeAt(x, y);
        if (!hit) return;
        if (hit.ring === 'minor') this.goToRelative(this.relativeMinor(hit.key), 'aeolian');
        else this.setKey(hit.key, { emitUserEvent: true });
    }

    handleCanvasHover(e) {
        const { x, y } = this.pointerIn(e);
        const hit = this.wedgeAt(x, y);
        const key = hit ? hit.key : null, ring = hit ? hit.ring : null;
        this.canvas.style.cursor = hit ? 'pointer' : '';
        if (key !== this.state.hoveredKey || ring !== this.state.hoveredRing) {
            this.state.hoveredKey = key;
            this.state.hoveredRing = ring;
            this.requestDraw();
        }
        this.showTooltip(hit ? { key, ring, event: e } : null);
    }

    handleCanvasLeave() {
        this.state.hoveredKey = null;
        this.state.hoveredRing = null;
        this.showTooltip(null);
        this.requestDraw();
    }

    describeKey(key, ring) {
        const here = circlePretty(this.state.currentKey);
        if (ring === 'minor') {
            return `${circlePretty(this.relativeMinor(key))} minor: the relative minor of ${circlePretty(key)}, the same notes with a new home`;
        }
        const degree = this.degreeOf(key);
        const sig = this.signatureText(key);
        const name = circlePretty(this.labelForKey(key));
        const major = sig ? ` (${circlePretty(key)} major has ${sig})` : '';
        if (this._pitchClass(key) === this._pitchClass(this.state.currentKey)) return `${name}: home${major}`;
        return `${name}: ${degree ? `the ${degree} in ${here} ${this.formatScaleName()}` : `not in ${here} ${this.formatScaleName()}`}${major}`;
    }

    showTooltip(info) {
        const tooltip = this.containerElement.querySelector('#circle-tooltip');
        if (!tooltip) return;

        if (!info) {
            tooltip.style.display = 'none';
            return;
        }

        tooltip.textContent = this.describeKey(info.key, info.ring);
        tooltip.style.display = 'block';
        const box = this.containerElement.getBoundingClientRect();
        const left = info.event.clientX - box.left + 14;
        const top = info.event.clientY - box.top + 14;
        tooltip.style.left = `${Math.max(4, Math.min(left, box.width - tooltip.offsetWidth - 6))}px`;
        tooltip.style.top = `${top + tooltip.offsetHeight > box.height ? top - tooltip.offsetHeight - 24 : top}px`;
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
