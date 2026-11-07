/**
 * LearnScales - Pedagogical Scale Learning Module
 * Structured lessons for understanding scales, intervals, patterns, and application
 * 
 * Features:
 * - Progressive lessons from basic to advanced
 * - Interactive piano with scale visualization
 * - Ear training exercises
 * - Pattern recognition
 * - Scale degree understanding
 * - Practical application (chords from scales)
 */
class LearnScales {
    constructor(musicTheoryEngine) {
        this.musicTheory = musicTheoryEngine;
        this.container = null;
        this._localPiano = null;
        this._localGuitar = null;
        this._audioEngine = null;
        this._midiActiveKeys = new Set();
        this.invertPlayback = false;
        this._playTimers = [];
        this._playToken = 0;
        
        // Lesson state
        this.currentLesson = 0;
        this.currentKey = 'C';
        this.currentScale = 'major';
        this.progress = {
            completedLessons: new Set(),
            quizScores: {},
            practiceTime: 0
        };
        
        // Load progress from localStorage
        this.loadProgress();
        
        // Quiz state
        this.quizMode = false;
        this.quizAnswers = [];
        this.currentQuizIndex = 0;
        
        // Practice state
        this.practiceMode = null; // 'listen', 'build', 'identify'
        this.practiceAttempts = 0;
        this.practiceCorrect = 0;

        // Note to MIDI lookup (C4 = 60)
        this.noteToMidiLookup = {
            'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
            'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
        };
    }

    // Convert note name with octave (e.g., "C4") to MIDI number
    noteToMidi(noteName) {
        // Shared reader first: the lookup below cannot see C♭, F♭, E♯, B♯ or a
        // double accidental, and would answer middle C for every one of them.
        const shared = (typeof window !== 'undefined' && window.MusicNotes && window.MusicNotes.midi)
            ? window.MusicNotes.midi(noteName) : null;
        if (shared !== null && shared !== undefined) return shared;

        const match = noteName.match(/^([A-Ga-g][#b]?)(\d+)$/);
        if (!match) return 60; // Default to middle C
        const note = match[1].toUpperCase();
        const octave = parseInt(match[2], 10);
        const semitone = this.noteToMidiLookup[note];
        if (semitone === undefined) return 60;
        return (octave + 1) * 12 + semitone;
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('learn-scales-progress');
            if (saved) {
                const data = JSON.parse(saved);
                this.progress = {
                    completedLessons: new Set(data.completedLessons || []),
                    quizScores: data.quizScores || {},
                    practiceTime: data.practiceTime || 0
                };
            }
        } catch (e) {
            console.warn('Failed to load progress:', e);
        }
    }

    saveProgress() {
        try {
            const data = {
                completedLessons: Array.from(this.progress.completedLessons),
                quizScores: this.progress.quizScores,
                practiceTime: this.progress.practiceTime
            };
            localStorage.setItem('learn-scales-progress', JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
        // the landing page counts these lessons: keep it current
        try { window.dispatchEvent(new CustomEvent('course:progress', { detail: { id: 'b-scales' } })); } catch (e) {}
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        if (!this.container) {
            console.error('[LearnScales] Container not found:', selector);
            return;
        }
        this.initAudio();
        this.render();
    }

    initAudio() {
        if (window.modularApp && window.modularApp.audioEngine) {
            this._audioEngine = window.modularApp.audioEngine;
            try {
                if (typeof this._audioEngine.preloadSamples === 'function') {
                    // Attempt to preload samples up-front for smoother playback
                    const p = this._audioEngine.preloadSamples();
                    if (p && typeof p.then === 'function') {
                        p.then(() => { this._audioReady = true; this.warmupAudio(); }).catch(()=>{});
                    } else {
                        this._audioReady = true;
                        this.warmupAudio();
                    }
                } else if (typeof this._audioEngine.init === 'function') {
                    const maybe = this._audioEngine.init();
                    if (maybe && typeof maybe.then === 'function') {
                        maybe.then(() => { this._audioReady = true; this.warmupAudio(); }).catch(()=>{});
                    } else {
                        this._audioReady = true;
                        this.warmupAudio();
                    }
                } else {
                    this._audioReady = true;
                    this.warmupAudio();
                }
            } catch (e) {
                this._audioReady = true;
            }
        }
    }

    /**
     * Play a silent/very quiet note to prime the audio context and eliminate first-play lag
     */
    warmupAudio() {
        if (!this._audioEngine) return;
        try {
            // Resume context if suspended
            if (typeof this._audioEngine.resume === 'function') {
                this._audioEngine.resume();
            }
            // Play a very short, quiet note to warm up the audio pipeline
            // Use middle C at very low volume - most engines support a velocity/volume param
            if (typeof this._audioEngine.playNote === 'function') {
                if (this._audioEngine.constructor.name === 'PianoSampleEngine') {
                    // PianoSampleEngine: (midi, duration, time, velocity)
                    this._audioEngine.playNote(60, 0.01, 0, 0.01);
                } else if (this._audioEngine.constructor.name === 'EnhancedAudioEngine') {
                    // EnhancedAudioEngine: (midi, { duration, ... })
                    // Just init/resume is enough
                } else {
                    // SimpleAudioEngine or others - play a very short note
                    this._audioEngine.playNote(60, 0.01, 0);
                }
            }
        } catch (e) {
            // Warmup failed silently - not critical
        }
    }

    // Ensure the audio engine is ready before attempting playback. Returns a Promise.
    ensureAudioReady(timeout = 4000) {
        return new Promise((resolve) => {
            if (!this._audioEngine) return resolve();
            if (this._audioReady) return resolve();

            // If engine exposes preloadSamples which returns a promise, wait for it.
            if (typeof this._audioEngine.preloadSamples === 'function') {
                try {
                    const p = this._audioEngine.preloadSamples();
                    if (p && typeof p.then === 'function') {
                        const t = setTimeout(() => resolve(), Math.max(300, timeout));
                        p.then(() => { clearTimeout(t); this._audioReady = true; resolve(); }).catch(() => { clearTimeout(t); resolve(); });
                        return;
                    }
                } catch (e) {}
            }

            // If init returns a promise, rely on it
            if (typeof this._audioEngine.init === 'function') {
                try {
                    const p = this._audioEngine.init();
                    if (p && typeof p.then === 'function') {
                        const t = setTimeout(() => resolve(), Math.max(300, timeout));
                        p.then(() => { clearTimeout(t); this._audioReady = true; resolve(); }).catch(() => { clearTimeout(t); resolve(); });
                        return;
                    }
                } catch (e) {}
            }

            // Fallback: wait a short period for engines that warm up asynchronously
            setTimeout(() => { this._audioReady = true; resolve(); }, 250);
        });
    }

    showAudioSpinner() {
        try {
            if (!this.container) return;
            if (this._audioSpinner) return;
            const spin = document.createElement('div');
            spin.id = 'learn-scales-audio-spinner';
            spin.style.cssText = 'position:absolute; right:18px; top:18px; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.5); z-index:9999;';
            spin.innerHTML = '<div style="width:18px;height:18px;border:3px solid color-mix(in srgb, var(--text-main) 20%, transparent);border-top-color:color-mix(in srgb, var(--text-main) 90%, transparent);border-radius:50%;animation:learnscales-spin 0.9s linear infinite"></div>';
            const style = document.createElement('style');
            style.id = 'learn-scales-spinner-style';
            style.textContent = '@keyframes learnscales-spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(style);
            this.container.appendChild(spin);
            this._audioSpinner = spin;
        } catch (e) {}
    }

    hideAudioSpinner() {
        try {
            if (this._audioSpinner && this.container) {
                this.container.removeChild(this._audioSpinner);
                this._audioSpinner = null;
            }
            const s = document.getElementById('learn-scales-spinner-style');
            if (s) s.remove();
        } catch (e) {}
    }

    /** The instrument chosen for the course. Read fresh: it can change on the landing page between visits. */
    get preferredInstrument() {
        return localStorage.getItem('music-theory-instrument') || 'piano';
    }

    /** The lesson's words for this instrument. */
    w(piano, guitar) {
        return this.preferredInstrument === 'guitar' ? guitar : piano;
    }

    /**
     * Play a note with optional scheduling offset
     * @param {number} midi - MIDI note number
     * @param {number} duration - Note duration in seconds
     * @param {number} time - Delay offset in seconds (for scheduling multiple notes)
     */
    playNote(midi, duration = 0.3, time = 0) {
        const guitar = window.LearnCommon && window.LearnCommon.guitarSound();
        if (guitar) { guitar.playNote(midi, duration, time); return; }
        if (this._audioEngine && typeof this._audioEngine.playNote === 'function') {
            // PianoSampleEngine uses (midi, duration, time, velocity)
            // EnhancedAudioEngine uses (midi, { duration, time, ... })
            // SimpleAudioEngine uses (midi, duration, time)
            if (this._audioEngine.constructor.name === 'EnhancedAudioEngine') {
                this._audioEngine.playNote(midi, { duration, time });
            } else {
                this._audioEngine.playNote(midi, duration, time);
            }
        }
    }

    /**
     * Play a sequence of notes with proper audio scheduling and synced animations
     * @param {number[]} notes - Array of MIDI note numbers
     * @param {number} noteDuration - Duration of each note in seconds
     * @param {number} delay - Delay between notes in seconds
     */
    playSequenceWithAnimation(notes, noteDuration = 0.4, delay = 0.4) {
        this.cancelPlayback();
        this.revealInstrument();
        const token = this._playToken;
        
        notes.forEach((midi, i) => {
            const timeOffset = i * delay;
            // Schedule audio using audio engine's timing
            this.playNote(midi, noteDuration, timeOffset);
            // Schedule visual highlight to sync with audio
            const t = setTimeout(() => {
                if (token !== this._playToken) return;
                this.highlightNoteDuringPlayback(midi, noteDuration);
            }, timeOffset * 1000);
            this._playTimers.push(t);
        });
    }

    /**
     * A demo plays on the instrument at the bottom of the page. If it is
     * scrolled out of sight, bring it into view so the learner sees the keys
     * light up (Lesson 5's "Play & Show" played to a piano nobody could see).
     */
    revealInstrument() {
        const el = this.container && this.container.querySelector('#piano-learn-scales-container');
        if (!el) return;
        const r = el.getBoundingClientRect();
        const h = window.innerHeight || document.documentElement.clientHeight;
        if (r.height && (r.bottom > h || r.top < 0)) {
            el.scrollIntoView({ behavior: 'smooth', block: r.height < h ? 'end' : 'start' });
        }
    }

    cancelPlayback() {
        this._playToken++;
        try {
            this._playTimers.forEach(t => clearTimeout(t));
        } catch (_) {}
        this._playTimers = [];
        this.clearPlayHighlights();
    }

    playChord(midis, duration = 1.0) {
        const guitar = window.LearnCommon && window.LearnCommon.guitarSound();
        if (guitar) { guitar.playChord(midis, duration); return; }
        if (this._audioEngine && typeof this._audioEngine.playChord === 'function') {
            this._audioEngine.playChord(midis, duration);
        }
    }

    playScale(startMidi, intervals, duration = 0.3, delay = 0.4) {
        // intervals are absolute semitone offsets from root (e.g., [0, 2, 4, 5, 7, 9, 11] for major)
        // Play each note in the scale with visual highlighting
        this.cancelPlayback();
        const token = this._playToken;
        this.revealInstrument();
        const intervalsToPlay = this.invertPlayback ? intervals.slice().reverse() : intervals.slice();
        intervalsToPlay.forEach((interval, i) => {
            const midi = startMidi + interval;
            const t = setTimeout(() => {
                if (token !== this._playToken) return;
                this.playNote(midi, duration);
                this.highlightNoteDuringPlayback(midi, duration);
            }, i * delay * 1000);
            this._playTimers.push(t);
        });
        // Play final tonic (octave above)
        const tFinal = setTimeout(() => {
            if (token !== this._playToken) return;
            const octaveMidi = startMidi + 12;
            this.playNote(octaveMidi, duration * 1.5);
            this.highlightNoteDuringPlayback(octaveMidi, duration * 1.5);
            // After the scale finishes, schedule fading away of any temporary play highlights
            const totalTime = (intervals.length * delay * 1000) + (duration * 1500) + 300;
            const t = setTimeout(() => {
                if (token !== this._playToken) return;
                this.clearPlayHighlights();
            }, totalTime);
            this._playTimers.push(t);
        }, intervals.length * delay * 1000);
        this._playTimers.push(tFinal);
    }

    highlightKeyDuringPlayback(midi, duration) {
        if (!this._localPiano || !this._localPiano.pianoElement) return;
        const key = this._localPiano.pianoElement.querySelector(`[data-midi="${midi}"]`);
        if (!key) return;

        // Add a transient class so CSS handles transitions/fade
        key.classList.add('play-active');
        key.style.transform = 'translateY(2px)';

        // Remove play-active after duration + short fade buffer
        setTimeout(() => {
            key.style.transform = '';
            key.classList.remove('play-active');
            // Re-apply scale highlighting after fade
            setTimeout(() => this.updateInstrumentHighlights(), 220);
        }, duration * 1000);
    }

    /**
     * Highlight a note during playback on guitar fretboard
     */
    highlightGuitarNoteDuringPlayback(midi, duration) {
        if (!this._localGuitar || !this._localGuitar.element) return;
        // Find all fret cells with this MIDI and temporarily highlight them
        const cells = this._localGuitar.element.querySelectorAll(`[data-midi="${midi}"]`);
        cells.forEach(cell => {
            cell.classList.add('play-active');
            cell.style.background = 'radial-gradient(circle, var(--accent-primary) 0%, color-mix(in srgb, var(--accent-primary) 80%, transparent) 100%)';
            cell.style.boxShadow = '0 0 20px color-mix(in srgb, var(--accent-primary) 90%, transparent)';
            cell.style.transform = 'scale(1.2)';
        });
        setTimeout(() => {
            cells.forEach(cell => {
                cell.classList.remove('play-active');
                cell.style.transform = '';
            });
            this.updateGuitarHighlights();
        }, duration * 1000);
    }

    /**
     * Highlight a note during playback on whichever instrument is active
     */
    highlightNoteDuringPlayback(midi, duration) {
        if (this.preferredInstrument === 'guitar') {
            this.highlightGuitarNoteDuringPlayback(midi, duration);
        } else {
            this.highlightKeyDuringPlayback(midi, duration);
        }
    }

    clearPlayHighlights() {
        // Clear from piano
        if (this._localPiano && this._localPiano.pianoElement) {
            try {
                const keys = this._localPiano.pianoElement.querySelectorAll('.play-active');
                keys.forEach(k => k.classList.remove('play-active'));
            } catch (e) {}
        }
        // Clear from guitar
        if (this._localGuitar && this._localGuitar.element) {
            try {
                const cells = this._localGuitar.element.querySelectorAll('.play-active');
                cells.forEach(c => {
                    c.classList.remove('play-active');
                    c.style.transform = '';
                });
            } catch (e) {}
        }
        // Give CSS a moment to finish fades, then reapply scale highlights
        setTimeout(() => this.updateInstrumentHighlights(), 240);
    }

    /**
     * Clear any interval annotation overlays from the active instrument
     */
    clearIntervalAnnotations() {
        this._arrowEnd = null;
        // Piano annotations
        if (this._localPiano && this._localPiano.pianoElement) {
            try {
                const existing = this._localPiano.pianoElement.querySelectorAll('.interval-annotation');
                existing.forEach(el => el.remove());
            } catch (e) {}
        }
        // Guitar annotations
        if (this._localGuitar && this._localGuitar.element) {
            try {
                const existing = this._localGuitar.element.querySelectorAll('.interval-annotation');
                existing.forEach(el => el.remove());
            } catch (e) {}
        }
    }

    /** The place on the neck for this pitch, near a given cell (else mid-neck), on its string if it can be. */
    neckCell(midi, near) {
        const g = this._localGuitar;
        if (!g || !g.gridEl) return null;
        const nearFret = near ? parseInt(near.dataset.fret, 10) : 5;
        const nearString = near ? parseInt(near.dataset.stringIndex, 10) : 2;
        let best = null, bestCost = Infinity;
        g.gridEl.querySelectorAll(`.fret-cell[data-midi="${midi}"]`).forEach(cell => {
            const cost = Math.abs(parseInt(cell.dataset.fret, 10) - nearFret) + Math.abs(parseInt(cell.dataset.stringIndex, 10) - nearString) * 0.5;
            if (cost < bestCost) { best = cell; bestCost = cost; }
        });
        return best;
    }

    /**
     * A label over a place on the neck; clearIntervalAnnotations takes it away.
     * It sits beside the cell, not in it: an unlit cell is faint, and would fade the label.
     */
    tagOnNeck(cell, text) {
        const el = document.createElement('div');
        el.className = 'interval-annotation';
        el.style.cssText = `position:absolute;left:${cell.offsetLeft + cell.offsetWidth / 2}px;top:${cell.offsetTop}px;transform:translate(-50%,-100%);padding:1px 4px;white-space:nowrap;` +
            'font-weight:700;font-size:10px;color:#000;background:var(--accent-primary);border-radius:4px;pointer-events:none;z-index:50;';
        el.textContent = text;
        cell.parentElement.appendChild(el);
    }

    ringOnNeck(cell) {
        const el = document.createElement('div');
        el.className = 'interval-annotation';
        el.style.cssText = `position:absolute;left:${cell.offsetLeft - 3}px;top:${cell.offsetTop - 3}px;width:${cell.offsetWidth + 6}px;height:${cell.offsetHeight + 6}px;box-sizing:border-box;` +
            'border:2px solid var(--accent-primary);border-radius:50%;pointer-events:none;z-index:50;';
        cell.parentElement.appendChild(el);
    }

    /**
     * Show an interval arrow/label between two keys on the piano
     * @param {number} fromMidi - Starting MIDI note
     * @param {number} toMidi - Ending MIDI note
     * @param {string} label - The label to display (e.g., 'W', 'H')
     */
    showIntervalArrow(fromMidi, toMidi, label) {
        if (this.preferredInstrument === 'guitar') {
            // A run of steps walks along the neck, each from where the last one landed.
            const from = (this._arrowEnd && this._arrowEnd.midi === fromMidi && this._arrowEnd.cell) || this.neckCell(fromMidi);
            const to = this.neckCell(toMidi, from);
            if (from) this.ringOnNeck(from);
            if (to) this.tagOnNeck(to, label);
            this._arrowEnd = { midi: toMidi, cell: to };
            return;
        }
        if (!this._localPiano || !this._localPiano.pianoElement) return;
        const piano = this._localPiano.pianoElement;
        const fromKey = piano.querySelector(`[data-midi="${fromMidi}"]`);
        const toKey = piano.querySelector(`[data-midi="${toMidi}"]`);
        if (!fromKey || !toKey) return;

        // Get positions relative to the piano container
        const pianoRect = piano.getBoundingClientRect();
        const fromRect = fromKey.getBoundingClientRect();
        const toRect = toKey.getBoundingClientRect();

        // Compute center-x of each key relative to piano
        const fromCx = (fromRect.left + fromRect.width / 2) - pianoRect.left;
        const toCx = (toRect.left + toRect.width / 2) - pianoRect.left;
        const arrowTop = -24; // above the keys
        const midX = (fromCx + toCx) / 2;

        // Create a small annotation element
        const anno = document.createElement('div');
        anno.className = 'interval-annotation';
        anno.style.cssText = `
            position: absolute;
            top: ${arrowTop}px;
            left: ${midX - 16}px;
            width: 32px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 11px;
            color: ${label === 'W' ? 'var(--accent-secondary)' : 'var(--accent-primary)'};
            background: ${label === 'W' ? 'color-mix(in srgb, var(--accent-secondary) 20%, transparent)' : 'color-mix(in srgb, var(--accent-primary) 20%, transparent)'};
            border: 1px solid ${label === 'W' ? 'var(--accent-secondary)' : 'var(--accent-primary)'};
            border-radius: 4px;
            pointer-events: none;
            z-index: 50;
        `;
        anno.textContent = label;
        piano.appendChild(anno);
    }

    /** A note name as the course writes it: F# → F♯, Bb → B♭. */
    glyph(name) {
        return String(name).replace(/#/g, '♯').replace(/^([A-G])b/, '$1♭');
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div id="learn-scales-wrapper" style="position: relative; display: flex; flex-direction: column; gap: 12px; padding: 12px 16px; max-width: 1000px; margin: 0 auto;">
                
                <!-- One bar: home, title, the lessons, progress. (It was three blocks,
                     ~230px, and pushed the quiz's piano below the fold at 720px.) -->
                <style>
                    /* On a phone: Prev and Next on one row, the lesson numbers under them */
                    @media (max-width: 520px) { #lesson-dots { order: 3; flex-basis: 100%; } }
                </style>
                <div id="lesson-nav" class="lc-header">
                    <button id="scales-return-to-landing" type="button" class="lc-btn lc-home">← Home</button>
                    <h2 class="lc-title" style="white-space: nowrap;"><span aria-hidden="true">🎵</span> Scales</h2>
                    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap;">
                        <button id="prev-lesson" type="button" class="lc-btn nav-btn" title="Previous lesson" ${this.currentLesson === 0 ? 'disabled style="opacity: 0.4; cursor: default;"' : ''}>← Prev</button>
                        <div id="lesson-dots" aria-label="Lesson ${this.currentLesson + 1} of ${this.lessons.length}" style="display: flex; gap: 5px; flex-wrap: wrap;">
                            ${this.lessons.map((lesson, i) => `
                                <button class="lesson-dot ${i === this.currentLesson ? 'active' : ''} ${this.progress.completedLessons.has(i) ? 'completed' : ''}" 
                                        data-lesson="${i}" 
                                        title="${lesson.title}"
                                        ${i === this.currentLesson ? 'aria-current="step"' : ''}
                                        style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border-light); padding: 0;
                                               background: ${i === this.currentLesson ? 'var(--accent-primary)' : (this.progress.completedLessons.has(i) ? 'var(--accent-secondary)' : 'var(--bg-app)')}; 
                                               color: ${i === this.currentLesson || this.progress.completedLessons.has(i) ? '#000' : 'var(--text-muted)'}; 
                                               cursor: pointer; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                                    ${this.progress.completedLessons.has(i) ? '✓' : i + 1}
                                </button>
                            `).join('')}
                        </div>
                        <button id="next-lesson" type="button" class="lc-btn nav-btn" title="Next lesson" ${this.currentLesson === this.lessons.length - 1 ? 'disabled style="opacity: 0.4; cursor: default;"' : ''}>Next →</button>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-tech); white-space: nowrap;">
                            ${this.progress.completedLessons.size} / ${this.lessons.length} done
                        </div>
                        <button id="scales-theme-toggle" type="button" class="lc-btn lc-theme" aria-label="Change colour theme" title="Change colour theme">🌓</button>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div id="lesson-content" style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px;">
                    <!-- Content will be dynamically rendered here -->
                </div>

                <!-- Interactive Piano (Shared across lessons) -->
                <div id="scale-piano-section" style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <div id="instrument-label" style="color: var(--text-muted); font-size: 0.85rem;">
                                ${this.preferredInstrument === 'guitar' ? '🎸 Interactive guitar' : '🎹 Interactive piano'}
                            </div>
                            <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
                                <select id="piano-key-select" style="padding: 4px 8px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; font-size: 0.85rem;">
                                ${['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'].map(k => 
                                    `<option value="${k}" ${k === this.currentKey ? 'selected' : ''}>${this.glyph(k)}</option>`
                                ).join('')}
                            </select>
                            <select id="piano-scale-select" style="padding: 4px 8px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; font-size: 0.85rem;">
                                <option value="major" selected>Major</option>
                                <option value="aeolian">Natural minor</option>
                                <option value="harmonic_minor">Harmonic minor</option>
                                <option value="melodic_minor">Melodic minor</option>
                                <option value="dorian">Dorian</option>
                                <option value="phrygian">Phrygian</option>
                                <option value="lydian">Lydian</option>
                                <option value="mixolydian">Mixolydian</option>
                                <option value="locrian">Locrian</option>
                                <option value="major_pentatonic">Major pentatonic</option>
                                <option value="minor_pentatonic">Minor pentatonic</option>
                            </select>
                            <button id="play-scale-btn" class="btn" style="padding: 8px 18px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95rem; font-weight: 700;">▶ Play scale</button>
                            <button id="change-instrument-btn" class="btn" style="padding: 4px 10px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Change instrument</button>
                            <button id="invert-play-btn" class="btn" aria-pressed="false" style="padding: 4px 10px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; cursor: pointer; font-size: 0.85rem;">↑ Ascending</button>
                        </div>
                    </div>
                    <div id="piano-learn-scales-container" style="overflow-x: auto; overflow-y: visible; display: flex; justify-content: center; align-items: center; min-height: 200px; padding: 10px 0;"></div>
                </div>
            </div>
        `;

        // Setup event listeners
        this.setupNavigation();
        this.renderLesson();
        this.renderInstrument();
    }

    setupNavigation() {
        // Home button
        const homeBtn = document.getElementById('scales-return-to-landing');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => window.showAppPage('landing-page'));
        }

        // Theme toggle
        const themeBtn = document.getElementById('scales-theme-toggle');
        if (themeBtn) {
            const themeNames = ['clean-daw', 'channel-strip', 'matrix-fx', 'steam-2000'];
            themeBtn.addEventListener('click', () => {
                const currentTheme = document.body.getAttribute('data-theme') || 'clean-daw';
                const currentIndex = themeNames.indexOf(currentTheme);
                const nextIndex = (currentIndex + 1) % themeNames.length;
                const newTheme = themeNames[nextIndex];
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('music-theory-theme', newTheme);
            });
        }

        // Change instrument button (toggle and persist)
        const changeInstBtn = document.getElementById('change-instrument-btn');
        if (changeInstBtn) {
            changeInstBtn.addEventListener('click', () => {
                const next = this.preferredInstrument === 'guitar' ? 'piano' : 'guitar';
                // through the selector, so the landing page and the rest of the course follow
                if (window.moduleSelector && typeof window.moduleSelector.selectInstrument === 'function') window.moduleSelector.selectInstrument(next);
                else localStorage.setItem('music-theory-instrument', next);
                // The lesson's own text and diagrams say "key" or "fret": redraw them too,
                // unless that would throw away the learner's work (the quiz rewords itself).
                const keeps = this._lessonView && this._lessonView.keepsWork;
                try {
                    if (!keeps) this.renderLesson();
                    this.renderInstrument();
                } catch (e) { console.warn('renderInstrument failed', e); }
            });
        }

        // Lesson navigation
        const prevBtn = document.getElementById('prev-lesson');
        const nextBtn = document.getElementById('next-lesson');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentLesson > 0) {
                    this.currentLesson--;
                    this.render();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentLesson < this.lessons.length - 1) {
                    this.currentLesson++;
                    this.render();
                }
            });
        }

        // Lesson dots
        document.querySelectorAll('.lesson-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const lessonNum = parseInt(dot.dataset.lesson);
                this.currentLesson = lessonNum;
                this.render();
            });
        });

        // Piano controls
        const keySelect = document.getElementById('piano-key-select');
        const scaleSelect = document.getElementById('piano-scale-select');
        const playBtn = document.getElementById('play-scale-btn');
        const invertBtn = document.getElementById('invert-play-btn');

        if (keySelect) {
            keySelect.addEventListener('change', (e) => {
                this.currentKey = e.target.value;
                this.updateInstrumentHighlights();
                // Update instrument range so the selected tonic is the lowest visible note
                try { this.renderInstrument(); } catch(_) {}
            });
        }

        if (scaleSelect) {
            scaleSelect.addEventListener('change', (e) => {
                this.currentScale = e.target.value;
                this.updateInstrumentHighlights();
                // Re-render instrument annotations for new scale
                try { this.renderInstrument(); } catch(_) {}
            });
        }

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.playCurrentScale();
            });
        }
        if (invertBtn) {
            invertBtn.addEventListener('click', (e) => {
                this.invertPlayback = !this.invertPlayback;
                invertBtn.classList.toggle('active', this.invertPlayback);
                invertBtn.setAttribute('aria-pressed', String(this.invertPlayback));
                // Update button text to show current direction
                invertBtn.textContent = this.invertPlayback ? '↓ Descending' : '↑ Ascending';
            });
        }
    }

    /**
     * Render the appropriate instrument visualizer based on user preference
     */
    renderInstrument() {
        const label = document.getElementById('instrument-label');
        if (label) label.textContent = this.w('🎹 Interactive piano', '🎸 Interactive guitar');

        if (this.preferredInstrument === 'guitar') {
            this.renderGuitar();
        } else {
            this.renderPiano();
        }
    }

    /**
     * Get the active visualizer element (piano or guitar)
     */
    getActiveVisualizer() {
        if (this.preferredInstrument === 'guitar' && this._localGuitar) {
            return this._localGuitar;
        }
        return this._localPiano;
    }

    /**
     * Get the active visualizer DOM element
     */
    getActiveVisualizerElement() {
        if (this.preferredInstrument === 'guitar' && this._localGuitar && this._localGuitar.element) {
            return this._localGuitar.element;
        }
        if (this._localPiano && this._localPiano.pianoElement) {
            return this._localPiano.pianoElement;
        }
        return null;
    }

    /**
     * Each instrument keeps its own box, and the other's is hidden. In one box
     * they fought: each redraws itself into its box when that resizes, which
     * threw out whichever was on show.
     */
    instrumentHost(which) {
        const box = this.container.querySelector('#piano-learn-scales-container');
        if (!box) return null;
        let host = box.querySelector(`:scope > [data-instrument-host="${which}"]`);
        if (!host) {
            host = document.createElement('div');
            host.setAttribute('data-instrument-host', which);
            host.style.cssText = 'width: 100%; min-width: 0;';
            box.appendChild(host);
        }
        box.querySelectorAll(':scope > [data-instrument-host]').forEach(h => { h.style.display = h === host ? '' : 'none'; });
        return host;
    }

    renderGuitar() {
        const container = this.instrumentHost('guitar');
        if (!container) return;

        // Create or reuse guitar visualizer
        if (!this._localGuitar) {
            const GuitarClass = window.GuitarFretboardVisualizer || GuitarFretboardVisualizer;
            this._localGuitar = new GuitarClass({
                container: container,
                audioEngine: window.modularApp && window.modularApp.guitarEngine,
                frets: 15, // Show fewer frets for lesson context
                showNoteLabels: true,
                fitToContainer: true
            });
            // The board repaints (and rebuilds on resize) through applyState: a lesson's marks go back on after it.
            const neck = this._localGuitar, ownApply = neck.applyState.bind(neck);
            neck.applyState = () => {
                ownApply();
                if (this._lessonView && this._lessonView.afterRender) this._lessonView.afterRender();
            };
        }

        // Set the scale state
        this._localGuitar.state.currentKey = this.currentKey;
        this._localGuitar.state.currentScale = this.currentScale;
        this._localGuitar.state.scaleNotes = this.neckScale();

        // Mount into container
        this._localGuitar.mount(container);

        // Style the container for guitar
        container.style.paddingLeft = '10px';
        container.style.paddingRight = '10px';
        container.style.boxSizing = 'border-box';
        container.style.overflowX = 'auto';
        container.style.webkitOverflowScrolling = 'touch';
    }

    /** The notes to mark on the neck: none while a lesson keeps the answer hidden. */
    neckScale() {
        if (this._lessonView && this._lessonView.highlights === false) return [];
        return this.musicTheory.getScaleNotesWithKeySignature(this.currentKey, this.currentScale);
    }

    renderPiano() {
        const pianoContainer = this.instrumentHost('piano');
        if (!pianoContainer) return;

        // Responsive sizing: detect mobile
        const isMobile = (typeof window !== 'undefined') && window.innerWidth <= 480;

        const containerWidth = pianoContainer.clientWidth || window.innerWidth - 40;
        // Use a larger key on desktop, slightly smaller on mobile, but clamp
        const keyWidth = Math.max(30, Math.min(60, containerWidth / 16)); // baseline for 2 octaves
        const keyHeight = keyWidth * (isMobile ? 2.2 : 2.8);
        const blackKeyHeight = keyHeight * 0.65;

        if (!this._localPiano) {
            const PianoVizClass = window.PianoVisualizer || PianoVisualizer;
            // create instance; we'll control start/end on render
            this._localPiano = new PianoVizClass({
                container: pianoContainer,
                enablePointerGlissando: false
            });
            // The visualizer redraws itself when its container resizes (it does as
            // soon as the page first shows), and a redraw wipes what this page put
            // on the keys: the scale's 1-7, a lesson's marks. Put them back after
            // each redraw it makes on its own.
            const piano = this._localPiano;
            const ownRender = piano.render.bind(piano);
            piano.render = (...args) => {
                const out = ownRender(...args);
                if (!this._inRenderPiano) {
                    try {
                        this.updatePianoHighlights();
                        if (this._lessonView && this._lessonView.afterRender) this._lessonView.afterRender();
                    } catch (_) {}
                }
                return out;
            };
        }
        this._inRenderPiano = true;

        pianoContainer.innerHTML = '';

        // Determine keyboard range so the selected scale's root is the lowest note displayed.
        // Use octave 4 for better visibility and use engine's canonical noteToMidi
        const rootName = (this._lessonView && this._lessonView.root) || this.currentKey;
        let desiredRootMidi;
        try {
            desiredRootMidi = this.musicTheory.noteToMidi(rootName + '4');
        } catch (e) {
            desiredRootMidi = this.noteToMidi(rootName + '4'); // fallback to local
        }
        if (!desiredRootMidi || desiredRootMidi < 24) desiredRootMidi = 60; // fallback to C4
        const startMidi = Math.max(21, desiredRootMidi);
        const octaves = isMobile ? 1 : 2; // two visible octaves; one on a phone, where two make the keys unreadable

        // Ask piano visualizer to adopt the desired root and range. The visualizer
        // manages fit-vs-scroll behavior internally via ResizeObserver.
        if (this._localPiano && typeof this._localPiano.setRootMidi === 'function') {
            this._localPiano.setRootMidi(startMidi);
            if (typeof this._localPiano.setRange === 'function') this._localPiano.setRange(octaves);
            // On a phone: tonic to tonic, fitted to the width, so the whole scale shows
            if (isMobile) this._localPiano.options.endMidi = startMidi + 12;
            this._localPiano.render({
                container: pianoContainer,
                whiteKeyWidth: keyWidth,
                whiteKeyHeight: keyHeight,
                blackKeyHeight: blackKeyHeight,
                fitToContainer: true,
                interactive: true,
                enablePointerGlissando: false
            });
        } else {
            // Fallback to explicit start/end if visualizer doesn't expose the API yet
            const endMidi = startMidi + (octaves * 12) - 1;
            this._localPiano.render({
                container: pianoContainer,
                startMidi: startMidi,
                endMidi: endMidi,
                whiteKeyWidth: keyWidth,
                whiteKeyHeight: keyHeight,
                blackKeyHeight: blackKeyHeight,
                showFingering: false,
                showRomanNumerals: false,
                showGradingTooltips: false,
                enableGradingIntegration: false,
                fitToContainer: !isMobile,
                interactive: true,
                enablePointerGlissando: false
            });
        }

        if (this._localPiano.pianoElement && !pianoContainer.contains(this._localPiano.pianoElement)) {
            pianoContainer.appendChild(this._localPiano.pianoElement);
        }

        // Add left padding to container so degree bubbles on leftmost keys are visible,
        // and top padding for the W/H step labels drawn above the keys (the container
        // clips its overflow, so without it they showed as slivers)
        pianoContainer.style.paddingLeft = isMobile ? '0' : '20px';
        pianoContainer.style.paddingTop = '30px';
        if (isMobile) pianoContainer.style.minHeight = '0';
        pianoContainer.style.boxSizing = 'border-box';

        // Ensure piano container centers the keyboard within the lesson content
        // Use flex so the piano visual can be centered even when it has intrinsic width
        pianoContainer.style.display = 'flex';
        pianoContainer.style.justifyContent = 'center';
        pianoContainer.style.alignItems = 'center';

        // Ensure the piano element itself has predictable box-sizing and positioning
        try {
            if (this._localPiano.pianoElement) {
                this._localPiano.pianoElement.style.boxSizing = 'content-box';
                this._localPiano.pianoElement.style.position = 'relative';
                this._localPiano.pianoElement.style.width = 'max-content';
                this._localPiano.pianoElement.style.minWidth = '100%';
                // Allow inner keys to determine scroll behavior while keeping visual centered
                if (!isMobile) this._localPiano.pianoElement.style.margin = '0 auto';
            }
        } catch (e) {}

        // Mobile: allow horizontal scrolling with native momentum scrolling
        if (isMobile) {
            pianoContainer.style.overflowX = 'auto';
            pianoContainer.style.overflowY = 'hidden';   // or a swipe down the page stops here
            pianoContainer.style.webkitOverflowScrolling = 'touch';
            pianoContainer.style.paddingBottom = '8px';
        } else {
            pianoContainer.style.overflowX = 'hidden';
        }

        // NOTE: label/degree CSS is now managed by `piano-visualizer.js` via injected
        // stylesheet and CSS variables. LearnScales no longer inserts styles here.

        // Center the piano keyboard
        if (this._localPiano.pianoElement) {
            this._localPiano.pianoElement.style.margin = '0 auto';
            this._localPiano.pianoElement.style.display = 'block';
        }

        // Play on the piano element, which a redraw keeps: every redraw rebuilds the
        // keys, and it redraws by itself whenever its container resizes.
        if (this._localPiano.pianoElement && !this._keysWired) {
            this._keysWired = true;
            this._localPiano.pianoElement.addEventListener('click', (e) => {
                const key = e.target.closest('[data-midi]');
                const midi = key ? parseInt(key.getAttribute('data-midi')) : NaN;
                if (!isNaN(midi)) {
                    this.playNote(midi);
                }
            });
        }

        this._inRenderPiano = false;
        this.updatePianoHighlights();
        if (this._lessonView && this._lessonView.afterRender) this._lessonView.afterRender();
    }

    /**
     * Update highlights on whichever instrument is currently active
     */
    updateInstrumentHighlights() {
        if (this.preferredInstrument === 'guitar') {
            this.updateGuitarHighlights();
        } else {
            this.updatePianoHighlights();
        }
    }

    /**
     * Update guitar fretboard highlights for current scale
     */
    updateGuitarHighlights() {
        if (!this._localGuitar) return;
        this._localGuitar.state.currentKey = this.currentKey;
        this._localGuitar.state.currentScale = this.currentScale;
        this._localGuitar.state.scaleNotes = this.neckScale();
        this._localGuitar.applyState();
    }

    updatePianoHighlights() {
        if (!this._localPiano || !this._localPiano.pianoElement) return;
        const hide = this._lessonView && this._lessonView.highlights === false;

        const scaleNotes = this.musicTheory.getScaleNotesWithKeySignature(this.currentKey, this.currentScale) || [];
        // The keys carry sharp names (data-note="D#"), the scale its own (E♭):
        // match them by pitch, not by spelling.
        const scalePcs = scaleNotes.map(n => {
            const m = /^([A-G])([#♯b♭]*)/.exec(n);
            if (!m) return -1;
            let pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
            for (const a of m[2]) pc += (a === '#' || a === '♯') ? 1 : -1;
            return ((pc % 12) + 12) % 12;
        });
        const keys = this._localPiano.pianoElement.querySelectorAll('[data-note]');
        
        keys.forEach(key => {
            const pc = parseInt(key.getAttribute('data-midi'), 10) % 12;
            const isWhiteKey = key.classList.contains('piano-white-key');
            
            // Clear existing highlights
            key.style.boxShadow = '';
            key.style.filter = '';
            
            // Remove existing labels
            const existingLabels = key.querySelectorAll('.scale-degree-label');
            existingLabels.forEach(label => label.remove());
            
            const degreeIndex = scalePcs.indexOf(pc);
            if (!hide && degreeIndex !== -1) {
                
                // Highlight
                if (isWhiteKey) {
                    key.style.boxShadow = '0 0 15px color-mix(in srgb, var(--accent-primary) 80%, transparent) inset, 0 4px 8px color-mix(in srgb, var(--accent-primary) 30%, transparent)';
                    key.style.filter = 'brightness(1.05)';
                } else {
                    key.style.boxShadow = '0 0 12px color-mix(in srgb, var(--accent-primary) 90%, transparent) inset';
                }
                
                // Add degree label
                const degreeLabel = document.createElement('div');
                degreeLabel.className = 'scale-degree-label';
                degreeLabel.style.cssText = `
                    position: absolute;
                    top: 4px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-family: var(--font-tech);
                    font-size: ${isWhiteKey ? '11px' : '9px'};
                    font-weight: bold;
                    color: var(--accent-primary);
                    pointer-events: none;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                    z-index: 5;
                `;
                degreeLabel.textContent = (degreeIndex + 1).toString();
                key.appendChild(degreeLabel);
            }
        });
        // A hidden scale (the quiz) must not give its answer away through the names
        if (window.LearnCommon) window.LearnCommon.spellPianoKeys(this._localPiano.pianoElement, hide ? [] : scaleNotes);
    }

    playCurrentScale() {
        let rootMidi;
        try {
            rootMidi = this.musicTheory.noteToMidi(this.currentKey + '4');
        } catch (e) {
            rootMidi = this.noteToMidi(this.currentKey + '4'); // fallback to local
        }
        const intervals = this.musicTheory.scales[this.currentScale] || [0, 2, 4, 5, 7, 9, 11];
        // Ensure piano displays the tonic as the lowest visible note when playing
        try {
            if (this._localPiano && typeof this._localPiano.setRootMidi === 'function') {
                this._localPiano.setRootMidi(rootMidi);
                if (typeof this._localPiano.setRange === 'function') this._localPiano.setRange(2);
            }
        } catch (e) {}
        
        // Choose pattern based on direction
        // Ascending: 1-2-3-4-5-6-7-8 then 8-5-1-5-8
        // Descending: 8-7-6-5-4-3-2-1 then 1-5-8-5-1
        const ascendingPattern = '1234567885158';
        const descendingPattern = '8765432115851';
        const pattern = this.invertPlayback ? descendingPattern : ascendingPattern;
        
        // Wait for audio readiness and then play a warmup pattern
        this.showAudioSpinner();
        this.ensureAudioReady().then(() => {
            try {
                this.playWarmupSequence(rootMidi, intervals, pattern, 0.28, 0.36);
            } finally {
                // hide spinner after a short delay so UI doesn't flicker
                setTimeout(() => this.hideAudioSpinner(), 200);
            }
        }).catch(() => {
            // fallback to immediate play
            this.playScale(rootMidi, intervals, 0.3, 0.35);
            this.hideAudioSpinner();
        });
    }

    /**
     * Play a warmup pattern given a string of degree digits (e.g., '1234567885158').
     * Digits 1-7 map to scale degrees; '8' maps to the octave above the root.
     */
    playWarmupSequence(rootMidi, intervals, pattern = '1234567885158', duration = 0.28, delay = 0.36) {
        if (!pattern || typeof pattern !== 'string') return;
        this.cancelPlayback();
        this.revealInstrument();
        const token = this._playToken;

        const events = [];
        for (let i = 0; i < pattern.length; i++) {
            const ch = pattern[i];
            let midi = null;
            const d = parseInt(ch, 10);
            if (!isNaN(d) && d >= 1 && d <= 7) {
                const interval = intervals[d - 1];
                midi = rootMidi + (typeof interval === 'number' ? interval : 0);
            } else if (ch === '8') {
                midi = rootMidi + 12;
            }
            if (midi !== null) {
                events.push({ midi, time: i * delay * 1000 });
            }
        }

        // Pattern already contains the correct order (ascending or descending), just play in sequence
        events.forEach((ev, idx) => {
            const t = setTimeout(() => {
                if (token !== this._playToken) return;
                this.playNote(ev.midi, duration);
                this.highlightNoteDuringPlayback(ev.midi, duration);
            }, idx * delay * 1000);
            this._playTimers.push(t);
        });

        // Schedule final cleanup after last event
        const total = (events.length ? (events.length - 1) * delay * 1000 : 0) + (duration * 1000) + 320;
        const tClean = setTimeout(() => {
            if (token !== this._playToken) return;
            this.clearPlayHighlights();
        }, total + 120);
        this._playTimers.push(tClean);
    }

    /**
     * Put a key and scale on the page's instrument, as if the learner had picked
     * them in its menus, so a lesson's "play it on the piano below" is true.
     */
    showOnPiano(key, scale) {
        this.currentKey = key;
        this.currentScale = scale;
        const keySelect = document.getElementById('piano-key-select');
        const scaleSelect = document.getElementById('piano-scale-select');
        if (keySelect) keySelect.value = key;
        if (scaleSelect) scaleSelect.value = scale;
        try { this.renderInstrument(); } catch (_) {}
        this.revealInstrument();
    }

    renderLesson() {
        const contentArea = document.getElementById('lesson-content');
        if (!contentArea) return;

        const lesson = this.lessons[this.currentLesson];
        if (!lesson) return;

        // A lesson may ask the page's instrument for something while it is open
        // (_lessonView: { root, highlights, keepsWork, afterRender }) and leave
        // a cleanup for listeners it put outside its own content. Both end here.
        if (this._lessonCleanup) {
            try { this._lessonCleanup(); } catch (_) {}
        }
        this._lessonCleanup = null;
        this._lessonView = null;

        contentArea.innerHTML = lesson.render.call(this);
        
        // Setup lesson-specific event handlers
        if (lesson.setup) {
            lesson.setup.call(this);
        }
        // One question, just before the Complete button
        const bar = contentArea.querySelector('.lc-complete');
        if (lesson.check && bar && window.LearnCommon) {
            bar.parentNode.insertBefore(window.LearnCommon.quiz(null, lesson.check), bar);
        }
    }

    markLessonComplete() {
        this.progress.completedLessons.add(this.currentLesson);
        this.saveProgress();
        
        // Update UI
        const dot = document.querySelector(`.lesson-dot[data-lesson="${this.currentLesson}"]`);
        if (dot) {
            dot.classList.add('completed');
            dot.textContent = '✓';
            dot.style.background = 'var(--accent-secondary)';
            dot.style.color = '#000';
        }
        
        // Show completion message
        this.showCompletionMessage();
    }

    /**
     * Completing a lesson moves straight on to the next one, with a short
     * cheer that names what was just learned (LearnCommon: never the same
     * cheer twice running). The last lesson finishes in its own setup.
     */
    showCompletionMessage() {
        const done = this.currentLesson;
        if (done >= this.lessons.length - 1) return;

        const learned = [
            'You know what a scale is: notes that belong together, in order.',
            'You can find a half step and a whole step on any note.',
            'You can number a scale, with 1 as home, and count a 3rd, 4th or 5th.',
            'You built a major scale from W W H W W W H yourself.',
            'Minor as numbers: 1 2 ♭3 4 5 ♭6 ♭7, and why harmonic minor raises the 7.',
            'Modes, two ways: the same notes from a new home, or major with a note or two lowered.',
            'You can build triads and 7th chords from a scale by skipping notes.',
            'Five notes, no half steps: the pentatonic.'
        ];

        this.currentLesson = done + 1;
        this.render();
        const page = document.getElementById('learn-scales-page');
        if (page) page.scrollTop = 0;
        window.scrollTo(0, 0);

        if (window.LearnCommon) {
            window.LearnCommon.cheer(learned[done] || '', `Lesson ${done + 2}, ${this.lessons[done + 1].title}`);
        }
    }

    // Lesson definitions
    get lessons() {
        return [
            {
                title: "What is a scale?",
                check: {
                    q: 'What makes a set of notes a scale?',
                    options: ['One note played many times', 'Notes that belong together, played in order', 'Any chord played slowly', 'Only notes with no sharp or flat'],
                    answer: 1,
                    why: 'Low to high, like rungs of a ladder. C major is just one of them.',
                    wrong: ['That would be one note, not a ladder of them.', '', 'Chords come later, and they are built from scales.', 'C major happens to use just those, but most scales need sharps or flats too.']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 1: What is a scale?</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>A <strong>scale</strong> is a small set of notes that belong together, played in order from low to high like the rungs of a ladder. (The word comes from the Latin <em>scala</em>, "ladder".) Most melodies you know use the notes of one scale.</p>

                            <p><button id="ls1-hear" class="btn" style="padding: 6px 14px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">▶ Hear one</button> <span style="margin-left: 8px;">${this.w('C major: the white keys from C up to the next C.', 'C major: C D E F G A B and C again, with no sharps or flats.')}</span></p>

                            <details style="margin: 16px 0;">
                            <summary style="cursor: pointer; color: var(--text-heading); font-weight: 600;">Optional: scales around the world</summary>
                            <p style="margin-top: 12px;">Other musical traditions treat a scale as much more than a list of notes:</p>

                            <ul style="margin-left: 10px; list-style-type: none; padding: 0;">
                                <li style="margin-bottom: 16px; padding-left: 16px; border-left: 3px solid var(--accent-primary);">
                                    <strong style="color: var(--accent-primary);">Western tonal music</strong> typically organizes scales as <strong>ascending</strong> ladders (Do-Re-Mi...). They serve as a resource pool for building chords and melodies.
                                </li>
                                <li style="margin-bottom: 16px; padding-left: 16px; border-left: 3px solid var(--accent-secondary);">
                                    <strong style="color: var(--accent-secondary);">Ancient Greek theory</strong> (and many others) often conceptualized scales—like the <em>Dorian</em> mode—as <strong>descending</strong> from a high reference pitch, relaxing downward like gravity.
                                </li>
                                <li style="margin-bottom: 16px; padding-left: 16px; border-left: 3px solid var(--text-highlight);">
                                    <strong style="color: var(--text-highlight);">Arabic Maqam & Indian Raga</strong> are far more than just scales.
                                    <ul style="margin-top: 8px; margin-left: -5px; padding-left: 20px; list-style-type: disc; color: var(--text-muted); font-size: 0.9em;">
                                        <li style="margin-bottom: 6px;">
                                            <strong>Maqam:</strong> A system of melodic modes that includes <em>microtones</em> (notes "between" the usual twelve) and specific rules for melodic movement (<em>Sayr</em>). It's not just <em>what</em> notes you play, but <em>how</em> you travel through them.
                                        </li>
                                        <li>
                                            <strong>Raga:</strong> A melodic framework meant to "color the mind" with a specific emotion. Ragas often have different rules for ascending vs. descending and are deeply connected to seasons or times of day.
                                        </li>
                                    </ul>
                                </li>
                            </ul>

                            <!-- Scale Direction Visuals -->
                            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin: 30px 0;">
                                <!-- Ascending -->
                                <div style="text-align: center;">
                                    <svg width="150" height="100" style="background: color-mix(in srgb, var(--text-main) 3%, transparent); border-radius: 8px;">
                                        <defs>
                                            <marker id="ls-v3-arrow-up" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                <path d="M0,0 L6,3 L0,6 L0,0" fill="var(--accent-primary)" />
                                            </marker>
                                        </defs>
                                        <g stroke="color-mix(in srgb, var(--text-main) 10%, transparent)" stroke-width="1">
                                            <line x1="10" y1="25" x2="140" y2="25"/><line x1="10" y1="35" x2="140" y2="35"/>
                                            <line x1="10" y1="45" x2="140" y2="45"/><line x1="10" y1="55" x2="140" y2="55"/>
                                            <line x1="10" y1="65" x2="140" y2="65"/>
                                        </g>
                                        <!-- Stepwise Up -->
                                        <g fill="var(--accent-primary)">
                                            <circle cx="30" cy="70" r="4"/> <circle cx="50" cy="65" r="4"/>
                                            <circle cx="70" cy="60" r="4"/> <circle cx="90" cy="55" r="4"/>
                                            <circle cx="110" cy="50" r="4"/>
                                        </g>
                                        <path d="M 30 70 L 110 50" stroke="var(--accent-primary)" stroke-width="2" fill="none" marker-end="url(#ls-v3-arrow-up)" opacity="0.6"/>
                                    </svg>
                                    <p style="font-size: 0.8rem; margin-top: 8px; font-weight:600; color: var(--text-heading);">Western (Ascending)</p>
                                </div>

                                <!-- Descending -->
                                <div style="text-align: center;">
                                    <svg width="150" height="100" style="background: color-mix(in srgb, var(--text-main) 3%, transparent); border-radius: 8px;">
                                        <defs>
                                            <marker id="ls-v3-arrow-down" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                <path d="M0,0 L6,3 L0,6 L0,0" fill="var(--accent-secondary)" />
                                            </marker>
                                        </defs>
                                        <g stroke="color-mix(in srgb, var(--text-main) 10%, transparent)" stroke-width="1">
                                            <line x1="10" y1="25" x2="140" y2="25"/><line x1="10" y1="35" x2="140" y2="35"/>
                                            <line x1="10" y1="45" x2="140" y2="45"/><line x1="10" y1="55" x2="140" y2="55"/>
                                            <line x1="10" y1="65" x2="140" y2="65"/>
                                        </g>
                                        <!-- Stepwise Down -->
                                        <g fill="var(--accent-secondary)">
                                            <circle cx="30" cy="50" r="4"/> <circle cx="50" cy="55" r="4"/>
                                            <circle cx="70" cy="60" r="4"/> <circle cx="90" cy="65" r="4"/>
                                            <circle cx="110" cy="70" r="4"/>
                                        </g>
                                        <path d="M 30 50 L 110 70" stroke="var(--accent-secondary)" stroke-width="2" fill="none" marker-end="url(#ls-v3-arrow-down)" opacity="0.6"/>
                                    </svg>
                                    <p style="font-size: 0.8rem; margin-top: 8px; font-weight:600; color: var(--text-heading);">Greek (Descending)</p>
                                </div>

                                <!-- Complex/Directional -->
                                <div style="text-align: center;">
                                    <svg width="150" height="100" style="background: color-mix(in srgb, var(--text-main) 3%, transparent); border-radius: 8px;">
                                        <defs>
                                            <marker id="ls-v3-arrow-complex" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                <path d="M0,0 L6,3 L0,6 L0,0" fill="var(--text-highlight)" />
                                            </marker>
                                        </defs>
                                        <g stroke="color-mix(in srgb, var(--text-main) 10%, transparent)" stroke-width="1">
                                            <line x1="10" y1="25" x2="140" y2="25"/><line x1="10" y1="35" x2="140" y2="35"/>
                                            <line x1="10" y1="45" x2="140" y2="45"/><line x1="10" y1="55" x2="140" y2="55"/>
                                            <line x1="10" y1="65" x2="140" y2="65"/>
                                        </g>
                                        <!-- Different Notes Up vs Down visual hint -->
                                        <!-- Up: White notes -->
                                        <g fill="var(--text-highlight)" opacity="0.8">
                                            <circle cx="30" cy="70" r="3"/> <circle cx="45" cy="65" r="3"/> <circle cx="60" cy="60" r="3"/>
                                        </g>
                                        <path d="M 30 70 L 60 60" stroke="var(--text-highlight)" stroke-width="1.5" fill="none" marker-end="url(#ls-v3-arrow-complex)"/>
                                        
                                        <!-- Down: Hollow/Different Path -->
                                        <g stroke="var(--text-highlight)" stroke-width="1.5" fill="none">
                                            <circle cx="80" cy="55" r="3"/> <circle cx="95" cy="60" r="3"/> <circle cx="110" cy="70" r="3"/>
                                        </g>
                                        <path d="M 80 55 L 110 70" stroke="var(--text-highlight)" stroke-width="1.5" fill="none" marker-end="url(#ls-v3-arrow-complex)" stroke-dasharray="2,2"/>
                                    </svg>
                                    <p style="font-size: 0.8rem; margin-top: 8px; font-weight:600; color: var(--text-heading);">Complex Directionality</p>
                                </div>
                            </div>
                            </details>

                            <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>In these lessons</strong> we use the scales behind most pop, rock, jazz and classical music, and number their notes 1, 2, 3… so you can build chords from them.
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-1" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    const hearBtn = document.getElementById('ls1-hear');
                    if (hearBtn) {
                        hearBtn.addEventListener('click', () => {
                            this.playScale(60, [0, 2, 4, 5, 7, 9, 11], 0.3, 0.35);
                        });
                    }

                    const completeBtn = document.getElementById('complete-lesson-1');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Whole steps and half steps",
                check: {
                    q: 'A half step <em>down</em> from E is…',
                    options: ['F', 'E♭, also called D♯', 'D', 'E♯'],
                    answer: 1,
                    why: 'The very next key down: the black key. Reached going down from E it’s E♭; going up from D, the same key is D♯.',
                    wrong: ['F is a half step <em>up</em> from E.', '', 'D is two half steps down: a whole step.', 'E♯ would be up, and it sounds the same as F.']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 2: Whole steps and half steps</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Scales are built using two types of intervals: <strong>whole steps</strong> and <strong>half steps</strong>.</p>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 20px 0;">
                                <!-- Half Step Card -->
                                <div style="background: color-mix(in srgb, var(--accent-primary) 15%, transparent); padding: 16px; border-radius: 8px; border: 1px solid var(--accent-primary);">
                                    <div style="font-weight: 700; color: var(--accent-primary); margin-bottom: 8px; font-size: 1.1rem;">Half step (H)</div>
                                    <p style="margin: 8px 0;">The smallest distance between two notes: the very next ${this.preferredInstrument === 'guitar' ? 'fret' : 'key, black or white'}, <strong>up or down</strong>.</p>
                                    <p style="margin: 8px 0;"><strong>Example:</strong> E up to F, or E down to E♭</p>
                                    <p style="margin: 8px 0; font-size: 0.9rem;"><em>1 semitone = ${this.preferredInstrument === 'guitar' ? '1 fret' : '1 piano key'}</em></p>

                                    <!-- Visual: a half step up and a half step down from E -->
                                    <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); padding: 10px; border-radius: 6px; margin: 12px 0;">
                                        ${this.preferredInstrument === 'guitar' ? `
                                            <svg width="100%" height="80" viewBox="0 0 120 80" style="display: block;">
                                                <!-- One string, three frets: E♭ (D♯), E, F -->
                                                <line x1="15" y1="25" x2="15" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="45" y1="25" x2="45" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="75" y1="25" x2="75" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="105" y1="25" x2="105" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="5" y1="40" x2="115" y2="40" stroke="#ddd" stroke-width="2"/>
                                                <circle cx="30" cy="40" r="9" fill="var(--bg-app)" stroke="var(--accent-primary)" stroke-width="1.5"/>
                                                <text x="30" y="44" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff">E♭</text>
                                                <circle cx="60" cy="40" r="9" fill="var(--accent-primary)" stroke="#fff" stroke-width="2"/>
                                                <text x="60" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#000">E</text>
                                                <circle cx="90" cy="40" r="9" fill="var(--bg-app)" stroke="var(--accent-primary)" stroke-width="1.5"/>
                                                <text x="90" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">F</text>
                                                <text x="30" y="68" text-anchor="middle" font-size="10" fill="var(--accent-primary)" font-weight="bold">↓ down</text>
                                                <text x="90" y="68" text-anchor="middle" font-size="10" fill="var(--accent-primary)" font-weight="bold">up ↑</text>
                                                <text x="30" y="18" text-anchor="middle" font-size="8" fill="var(--text-muted)">(D♯)</text>
                                            </svg>
                                        ` : `
                                            <svg width="100%" height="96" viewBox="0 0 120 96" style="display: block;">
                                                <!-- Piano keys D, E, F and the black key between D and E -->
                                                <rect x="15" y="8" width="30" height="58" fill="#ffffff" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="45" y="8" width="30" height="58" fill="var(--accent-primary)" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="75" y="8" width="30" height="58" fill="#ffffff" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="35" y="8" width="20" height="36" fill="#1a1a1a" stroke="#000" stroke-width="1" rx="1"/>
                                                <text x="45" y="24" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">E♭</text>
                                                <text x="45" y="35" text-anchor="middle" font-size="7" fill="#bbb">D♯</text>
                                                <text x="30" y="60" text-anchor="middle" font-size="11" font-weight="bold" fill="#666">D</text>
                                                <text x="62" y="60" text-anchor="middle" font-size="11" font-weight="bold" fill="#000">E</text>
                                                <text x="90" y="60" text-anchor="middle" font-size="11" font-weight="bold" fill="#000">F</text>
                                                <defs>
                                                    <marker id="arrow-h-piano" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                        <polygon points="0,0 6,3 0,6" fill="var(--accent-primary)"/>
                                                    </marker>
                                                </defs>
                                                <!-- up: E to F -->
                                                <path d="M 66 74 L 86 74" stroke="var(--accent-primary)" stroke-width="2" fill="none" marker-end="url(#arrow-h-piano)"/>
                                                <text x="90" y="90" text-anchor="middle" font-size="10" fill="var(--accent-primary)" font-weight="bold">up</text>
                                                <!-- down: E to E♭ -->
                                                <path d="M 58 74 Q 45 74 45 48" stroke="var(--accent-primary)" stroke-width="2" fill="none" marker-end="url(#arrow-h-piano)"/>
                                                <text x="38" y="90" text-anchor="middle" font-size="10" fill="var(--accent-primary)" font-weight="bold">down</text>
                                            </svg>
                                        `}
                                    </div>

                                    <button class="demo-btn" data-notes="64,65" data-interval="H" style="padding: 6px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-top: 8px;">▶ Up: E → F</button>
                                    <button class="demo-btn" data-notes="64,63" data-interval="H" style="padding: 6px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-top: 8px;">▶ Down: E → E♭</button>
                                </div>
                                
                                <!-- Whole Step Card -->
                                <div style="background: color-mix(in srgb, var(--accent-secondary) 15%, transparent); padding: 16px; border-radius: 8px; border: 1px solid var(--accent-secondary);">
                                    <div style="font-weight: 700; color: var(--accent-secondary); margin-bottom: 8px; font-size: 1.1rem;">Whole step (W)</div>
                                    <p style="margin: 8px 0;">Two half steps combined.</p>
                                    <p style="margin: 8px 0;"><strong>Example:</strong> C → D or F → G</p>
                                    <p style="margin: 8px 0; font-size: 0.9rem;"><em>2 semitones = skip ${this.preferredInstrument === 'guitar' ? '1 fret' : '1 key'}</em></p>
                                    
                                    <!-- Visual: Piano or Guitar -->
                                    <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); padding: 10px; border-radius: 6px; margin: 12px 0;">
                                        ${this.preferredInstrument === 'guitar' ? `
                                            <svg width="100%" height="80" viewBox="0 0 120 80" style="display: block;">
                                                <!-- Guitar fretboard: 4 frets, 1 string -->
                                                <line x1="10" y1="25" x2="10" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="35" y1="25" x2="35" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="60" y1="25" x2="60" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="85" y1="25" x2="85" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="110" y1="25" x2="110" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="10" y1="40" x2="110" y2="40" stroke="#ddd" stroke-width="2"/>
                                                
                                                <!-- Starting note -->
                                                <circle cx="22.5" cy="40" r="8" fill="var(--accent-secondary)" stroke="#fff" stroke-width="2"/>
                                                <text x="22.5" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#000">C</text>
                                                
                                                <!-- Skipped fret (faded) -->
                                                <circle cx="47.5" cy="40" r="6" fill="#666" opacity="0.4"/>
                                                <text x="47.5" y="43" text-anchor="middle" font-size="8" fill="#ccc">C♯</text>
                                                
                                                <!-- Target note (2 frets away) -->
                                                <circle cx="72.5" cy="40" r="8" fill="var(--accent-secondary)" stroke="#fff" stroke-width="2"/>
                                                <text x="72.5" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#000">D</text>
                                                
                                                <!-- Distance line -->
                                                <line x1="22.5" y1="58" x2="72.5" y2="58" stroke="var(--accent-secondary)" stroke-width="2" stroke-dasharray="2,2"/>
                                                <circle cx="22.5" cy="58" r="2" fill="var(--accent-secondary)"/>
                                                <circle cx="72.5" cy="58" r="2" fill="var(--accent-secondary)"/>
                                                <text x="60" y="73" text-anchor="middle" font-size="11" fill="var(--accent-secondary)" font-weight="bold">2 frets</text>
                                            </svg>
                                        ` : `
                                            <svg width="100%" height="90" viewBox="0 0 100 90" style="display: block;">
                                                <!-- Piano keys: C, D, E -->
                                                <rect x="10" y="10" width="25" height="55" fill="#ffffff" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="35" y="10" width="25" height="55" fill="#ffffff" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="60" y="10" width="25" height="55" fill="#f5f5f5" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="28" y="10" width="16" height="35" fill="#666" stroke="#444" stroke-width="1" rx="1" opacity="0.5"/>
                                                <rect x="53" y="10" width="16" height="35" fill="#3a3a3a" stroke="#000" stroke-width="1" rx="1" opacity="0.5"/>
                                                
                                                <text x="22.5" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="#000">C</text>
                                                <text x="47.5" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="#000">D</text>
                                                <text x="36" y="35" text-anchor="middle" font-size="9" font-weight="bold" fill="#ccc">C♯</text>
                                                
                                                <!-- Distance line -->
                                                <line x1="22.5" y1="70" x2="47.5" y2="70" stroke="var(--accent-secondary)" stroke-width="2" stroke-dasharray="2,2"/>
                                                <circle cx="22.5" cy="70" r="2" fill="var(--accent-secondary)"/>
                                                <circle cx="47.5" cy="70" r="2" fill="var(--accent-secondary)"/>
                                                <text x="50" y="85" text-anchor="middle" font-size="11" fill="var(--accent-secondary)" font-weight="bold">2 semitones</text>
                                            </svg>
                                        `}
                                    </div>
                                    
                                    <button class="demo-btn" data-notes="60,62" data-interval="W" style="padding: 6px 16px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-top: 8px;">▶ Play W</button>
                                </div>
                            </div>

                            <div style="background: color-mix(in srgb, var(--text-main) 5%, transparent); padding: 16px; border-radius: 8px; margin: 20px 0;">
                                <div style="font-weight: 700; margin-bottom: 12px; text-align: center;">🎯 Major scale pattern</div>
                                <div id="wh-pattern-display" style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                                    ${['W', 'W', 'H', 'W', 'W', 'W', 'H'].map((step, i) => `
                                        <div class="wh-step-btn" data-step="${i}" style="background: ${step === 'W' ? 'color-mix(in srgb, var(--accent-secondary) 30%, transparent)' : 'color-mix(in srgb, var(--accent-primary) 30%, transparent)'}; 
                                                    border: 1px solid ${step === 'W' ? 'var(--accent-secondary)' : 'var(--accent-primary)'}; 
                                                    padding: 8px 14px; 
                                                    border-radius: 4px; 
                                                    font-weight: bold; 
                                                    cursor: pointer;
                                                    color: ${step === 'W' ? 'var(--accent-secondary)' : 'var(--accent-primary)'};
                                                    font-size: 0.95rem;
                                                    transition: all 0.2s ease;">
                                            ${step}
                                        </div>
                                    `).join('')}
                                </div>
                                <div style="text-align: center; margin-top: 12px; font-size: 0.85rem; color: var(--text-muted);">
                                    <strong>Click a step</strong> to see & hear it below!
                                </div>
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Every note has two half-step neighbours: one up, one down.</strong>
                                <button id="ls2-show-e" class="btn" style="margin-left: 8px; padding: 4px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">▶ Show me: E</button>
                                <div style="margin-top: 6px;">${this.preferredInstrument === 'guitar' ? 'On the guitar, one fret up is a half step up and one fret down is a half step down. Click any fret on the neck below to see its neighbours.' : 'Click any key on the piano below to see its neighbours.'}</div>
                                <div id="ls2-neighbours" style="margin-top: 8px; color: var(--text-main); min-height: 1.6em;"></div>
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-2" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    const self = this;
                    // Compute root MIDI for selected key at octave 4
                    const getRootMidi = () => {
                        try { return this.musicTheory.noteToMidi(this.currentKey + '4'); }
                        catch(_) { return this.noteToMidi(this.currentKey + '4'); }
                    };
                    const majorSteps = [2, 2, 1, 2, 2, 2, 1]; // W=2, H=1

                    // Demo buttons for H and W examples
                    document.querySelectorAll('.demo-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const notes = btn.dataset.notes.split(',').map(Number);
                            this.clearIntervalAnnotations();
                            // Use the new sequenced playback method for proper audio/animation sync
                            this.playSequenceWithAnimation(notes, 0.4, 0.4);
                        });
                    });

                    // Click on individual W/H step to demonstrate on keyboard
                    document.querySelectorAll('.wh-step-btn').forEach(stepEl => {
                        stepEl.addEventListener('click', () => {
                            const stepIdx = parseInt(stepEl.dataset.step, 10);
                            const rootMidi = getRootMidi();
                            // Sum intervals to get to the start of this step
                            let offset = 0;
                            for (let i = 0; i < stepIdx; i++) offset += majorSteps[i];
                            const startMidi = rootMidi + offset;
                            const endMidi = startMidi + majorSteps[stepIdx];
                            this.clearIntervalAnnotations();
                            // Use sequenced playback for proper audio/animation sync
                            this.playSequenceWithAnimation([startMidi, endMidi], 0.35, 0.35);
                            this.showIntervalArrow(startMidi, endMidi, majorSteps[stepIdx] === 2 ? 'W' : 'H');
                        });
                    });

                    // Half steps both ways: a clicked note shows the note a half step up and
                    // a half step down. A black key gets both of its names, and the
                    // text says which name belongs to which direction.
                    const LETTERS = ['C', null, 'D', null, 'E', 'F', null, 'G', null, 'A', null, 'B'];
                    const blackNames = (pc) => ({ sharp: LETTERS[pc - 1] + '♯', flat: LETTERS[(pc + 1) % 12] + '♭' });
                    // a black key is named for the way you reach it: C♯ going up, E♭ going down
                    const nameOf = (m, dir) => {
                        const pc = ((m % 12) + 12) % 12;
                        if (LETTERS[pc]) return LETTERS[pc];
                        const b = blackNames(pc);
                        return dir === 'up' ? b.sharp + ' / ' + b.flat : b.flat + ' / ' + b.sharp;
                    };
                    // a tag sits inside the key (above the keys it would be clipped)
                    const tag = (midi, text, from) => {
                        if (this.preferredInstrument === 'guitar') {
                            const spot = this.neckCell(midi, from);
                            if (spot) this.tagOnNeck(spot, text);
                            return;
                        }
                        const piano = this._localPiano && this._localPiano.pianoElement;
                        const key = piano && piano.querySelector(`[data-midi="${midi}"]`);
                        if (!key) return;
                        if (getComputedStyle(key).position === 'static') key.style.position = 'relative';
                        const el = document.createElement('div');
                        el.className = 'interval-annotation';
                        el.style.cssText = 'position:absolute;bottom:34%;left:50%;transform:translateX(-50%);' +
                            'padding:2px 4px;white-space:nowrap;font-weight:700;font-size:11px;color:#000;' +
                            'background:var(--accent-primary);border-radius:4px;pointer-events:none;z-index:50;';
                        el.textContent = text;
                        key.appendChild(el);
                    };
                    const explain = (m, cell) => {
                        const pc = ((m % 12) + 12) % 12;
                        const up = m + 1, down = m - 1;
                        const said = (n, dir) => `<strong>${nameOf(n, dir)}</strong>`;
                        let html;
                        if (!LETTERS[pc]) {
                            const b = blackNames(pc);
                            html = `${this.w('This black key', 'This note')} has two names. A half step <strong>up from ${LETTERS[pc - 1]}</strong> it is <strong>${b.sharp}</strong>; a half step <strong>down from ${LETTERS[(pc + 1) % 12]}</strong> it is <strong>${b.flat}</strong>. Same key, same sound.`;
                        } else {
                            const part = (n, dir) => LETTERS[((n % 12) + 12) % 12]
                                ? `a half step ${dir} is ${said(n, dir)} ${this.w('(no black key between them)', '(the very next fret, with no note between)')}`
                                : `a half step ${dir} is ${this.w('the black key ', '')}${said(n, dir)}`;
                            html = `From <strong>${LETTERS[pc]}</strong>: ${part(up, 'up')}, and ${part(down, 'down')}.`;
                            const upPc = (pc + 1) % 12, downPc = (pc + 11) % 12;
                            if (!LETTERS[downPc]) html += ` Going down from ${LETTERS[pc]}, we call that ${this.w('key', 'fret')} ${LETTERS[pc]}♭.`;
                            else if (!LETTERS[upPc]) html += ` Going up from ${LETTERS[pc]}, we call that ${this.w('key', 'fret')} ${LETTERS[pc]}♯.`;
                        }
                        const box = document.getElementById('ls2-neighbours');
                        if (box) box.innerHTML = html;
                        this.clearIntervalAnnotations();
                        const short = (n, dir) => LETTERS[((n % 12) + 12) % 12] || nameOf(n, dir).split(' / ')[0];
                        const at = cell || this.neckCell(m);
                        if (at && this.preferredInstrument === 'guitar') this.ringOnNeck(at);
                        tag(up, short(up, 'up') + ' ↑', at);
                        tag(down, '↓ ' + short(down, 'down'), at);
                    };
                    const showNeighbours = (m) => {
                        explain(m);
                        this.playSequenceWithAnimation([m, m + 1, m, m - 1], 0.35, 0.4);
                    };
                    const showE = document.getElementById('ls2-show-e');
                    if (showE) showE.addEventListener('click', () => showNeighbours(64));
                    // keys are re-rendered with the instrument: listen at the document, until the lesson closes
                    const onKey = (e) => {
                        const key = e.target.closest && e.target.closest('#piano-learn-scales-container [data-midi]');
                        if (!key) return;
                        const m = parseInt(key.getAttribute('data-midi'), 10);
                        if (!isNaN(m)) explain(m, key.classList.contains('fret-cell') ? key : null);
                    };
                    document.addEventListener('click', onKey);
                    this._lessonCleanup = () => { document.removeEventListener('click', onKey); this.clearIntervalAnnotations(); };

                    const completeBtn = document.getElementById('complete-lesson-2');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Scale degrees",
                check: {
                    q: 'C up a 5th lands on…',
                    options: ['F', 'G', 'A', 'E'],
                    answer: 1,
                    why: 'Count the letters, both ends included: C D E F G is five.',
                    wrong: ['C D E F is four letters: that’s a 4th.', '', 'C D E F G A is six letters: a 6th.', 'C D E is three letters: a 3rd.']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 3: Scale degrees</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Each note in a scale has a <strong>scale degree</strong> number (1-7) and a special name that describes its function.</p>
                            
                            <div style="background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px; margin: 20px 0;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid var(--border-light);">
                                            <th style="padding: 8px; text-align: left; color: var(--accent-primary);">Degree</th>
                                            <th style="padding: 8px; text-align: left; color: var(--accent-primary);">Name</th>
                                            <th style="padding: 8px; text-align: left; color: var(--accent-primary);">In C Major</th>
                                            <th style="padding: 8px; text-align: center; color: var(--accent-primary);">Play</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${[
                                            {deg: '1', name: 'Tonic (Root)', note: 'C', desc: 'Home base - most stable'},
                                            {deg: '2', name: 'Supertonic', note: 'D', desc: 'Above the tonic'},
                                            {deg: '3', name: 'Mediant', note: 'E', desc: 'Defines major/minor'},
                                            {deg: '4', name: 'Subdominant', note: 'F', desc: 'Pre-dominant function'},
                                            {deg: '5', name: 'Dominant', note: 'G', desc: 'Creates tension'},
                                            {deg: '6', name: 'Submediant', note: 'A', desc: 'Between subdominant and tonic'},
                                            {deg: '7', name: 'Leading Tone', note: 'B', desc: 'Leads back to tonic'}
                                        ].map((row, i) => `
                                            <tr style="border-bottom: 1px solid color-mix(in srgb, var(--text-main) 5%, transparent);">
                                                <td style="padding: 10px; font-weight: 700; color: var(--text-highlight); font-size: 1.1rem;">${row.deg}</td>
                                                <td style="padding: 10px;">
                                                    <div style="font-weight: 600;">${row.name}</div>
                                                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${row.desc}</div>
                                                </td>
                                                <td style="padding: 10px; font-family: var(--font-tech); font-size: 1.1rem; color: var(--accent-secondary);">${row.note}</td>
                                                <td style="padding: 10px; text-align: center;">
                                                    <button class="degree-play-btn" data-midi="${60 + [0,2,4,5,7,9,11][i]}" style="padding: 4px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">▶</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Pro Tip:</strong> The 1st, 3rd, and 5th degrees are the most important - they form the basic triad chord of the scale!
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Counting distances.</strong> The same numbers measure the gap between any two notes: count the letters, <strong>including both ends</strong>.
                                C D E F G is five letters, so C up to G is a <strong>5th</strong>. F G A B C is five letters too: F up to C is also a 5th. C D E F is a <strong>4th</strong>; C D E is a <strong>3rd</strong>.
                                <div style="margin: 8px 0;">
                                    <button class="interval-play-btn" data-notes="60,67" data-label="5th" style="padding: 4px 10px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin: 2px; text-transform: none;">▶ C → G, a 5th</button>
                                    <button class="interval-play-btn" data-notes="65,72" data-label="5th" style="padding: 4px 10px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin: 2px; text-transform: none;">▶ F → C, a 5th</button>
                                    <button class="interval-play-btn" data-notes="60,65" data-label="4th" style="padding: 4px 10px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin: 2px; text-transform: none;">▶ C → F, a 4th</button>
                                    <button class="interval-play-btn" data-notes="60,64" data-label="3rd" style="padding: 4px 10px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin: 2px; text-transform: none;">▶ C → E, a 3rd</button>
                                    <button class="interval-play-btn" data-notes="62,65" data-label="3rd" style="padding: 4px 10px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin: 2px; text-transform: none;">▶ D → F, a 3rd</button>
                                </div>
                                Two things later lessons lean on: going <strong>up a 5th</strong> lands on the same letter as going <strong>down a 4th</strong> (C up a 5th is G; C down a 4th is G too). And 3rds come in two sizes: C → E is 4 half steps (a <em>major</em> 3rd), D → F is only 3 (a <em>minor</em> 3rd). That one half step is the difference between a major and a minor chord.
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Try it:</strong> Use the <strong>▶ Play scale</strong> button below to hear all scale degrees in order!
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-3" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    document.querySelectorAll('.interval-play-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const notes = btn.dataset.notes.split(',').map(Number);
                            this.clearIntervalAnnotations();
                            this.playSequenceWithAnimation(notes, 0.5, 0.55);
                            this.showIntervalArrow(notes[0], notes[1], btn.dataset.label);
                        });
                    });

                    document.querySelectorAll('.degree-play-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const midi = parseInt(btn.dataset.midi);
                            this.playNote(midi, 0.5);
                        });
                    });

                    const completeBtn = document.getElementById('complete-lesson-3');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Build a scale (quiz)",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 4: Build a scale (quiz)</h3>
                        <style>
                            #piano-learn-scales-container .quiz-picked { box-shadow: inset 0 0 0 3px var(--accent-primary), inset 0 -70px 40px -30px color-mix(in srgb, var(--accent-primary) 65%, transparent) !important; }
                            #piano-learn-scales-container .quiz-next { animation: quiz-next 0.8s ease-in-out 4; }
                            #piano-learn-scales-container .fret-cell { opacity: 0.85 !important; }
                            #piano-learn-scales-container .fret-cell .fret-label { color: #fff !important; }
                            #piano-learn-scales-container .fret-cell.quiz-picked { opacity: 1 !important; background: var(--accent-primary) !important; box-shadow: 0 0 14px var(--accent-primary) !important; }
                            #piano-learn-scales-container .fret-cell.quiz-picked .fret-label { color: #000 !important; font-weight: 900 !important; text-shadow: none !important; }
                            #piano-learn-scales-container .fret-cell.quiz-next { opacity: 1 !important; }
                            @keyframes quiz-next { 50% { box-shadow: inset 0 0 0 4px var(--accent-secondary), 0 0 18px var(--accent-secondary); } }
                            .quiz-chip { padding: 2px 9px; border-radius: 4px; background: color-mix(in srgb, var(--accent-primary) 20%, transparent); border: 1px solid var(--accent-primary); color: var(--text-main); font-weight: 700; }
                            .quiz-step { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
                            .quiz-step.ok { color: var(--accent-secondary); }
                            .quiz-step.off { color: var(--lc-bad); }
                            .quiz-hint { background: color-mix(in srgb, var(--accent-primary) 8%, transparent); border-left: 3px solid var(--accent-primary); padding: 6px 12px; margin: 8px 0 0; border-radius: 4px; }
                        </style>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <div id="quiz-instructions" style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px; margin: 0 0 12px;">
                                <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1rem;">📝 Quiz: Build a G Major Scale</div>
                                <p id="quiz-how" style="margin: 8px 0;"></p>
                                <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; min-height: 30px;">
                                    <strong>Your notes:</strong> <span id="quiz-picks" style="display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; flex: 1;"><span id="quiz-progress">none yet</span></span>
                                    <span style="display: flex; gap: 8px; flex-wrap: wrap;">
                                        <button id="quiz-reset" class="btn" style="padding: 5px 12px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; cursor: pointer;">Reset</button>
                                        <button id="quiz-hint" class="btn" style="padding: 5px 12px; background: var(--bg-app); border: 1px solid var(--accent-primary); color: var(--text-main); border-radius: 4px; cursor: pointer;" title="Optional: each press reveals a little more">💡 Reveal a hint</button>
                                        <button id="quiz-check" class="btn" style="padding: 5px 14px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">✓ Check</button>
                                    </span>
                                </div>
                                <div id="quiz-hints" class="quiz-hint" style="display: none;"></div>
                                <div id="quiz-feedback" style="padding: 8px 12px; border-radius: 6px; margin: 8px 0 0; display: none;"></div>
                            </div>
                        </div>
                    `;
                },
                setup: function() {
                    // G major from any G on the keyboard: the steps W W H W W W H, as
                    // distances from the first note. The learner's notes are graded in
                    // pitch order, so the order they were clicked in does not matter.
                    const SCALE = [0, 2, 4, 5, 7, 9, 11, 12];
                    const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
                    const name = (midi) => NAMES[((midi % 12) + 12) % 12];
                    const stepName = (n) => n === 1 ? 'H' : n === 2 ? 'W' : `${n}`;
                    const unit = () => this.w('key', 'fret');
                    const stepWords = (n) => n === 1 ? `a half step (the very next ${unit()})` : n === 2 ? `a whole step (skip one ${unit()})` : `${n} half steps`;
                    const how = () => this.w(
                        'On the piano below, click the 8 notes of G major, from <strong>G</strong> up to the next <strong>G</strong>. Black keys count too. Click a note again to take it back.',
                        'On the neck below, click the 8 notes of G major, from a <strong>G</strong> up to the next <strong>G</strong>, on any strings. Click a note again to take it back.');
                    // Each hint stands on its own and replaces the last, so asking for
                    // more help never pushes the piano further down the page.
                    const hints = () => [
                        `<strong>Hint 1 of 3:</strong> A major scale climbs in two sizes of step. A <strong>half step (H)</strong> is the very next ${this.w('key, black or white', 'fret')}. A <strong>whole step (W)</strong> skips one ${unit()}. Major goes <strong>W W H W W W H</strong>.`,
                        `<strong>Hint 2 of 3:</strong> Your notes now show the step between each pair (W skips a ${unit()}, H is the very next one). Start on G and make them read <strong>W W H W W W H</strong>.`,
                        `<strong>Hint 3 of 3:</strong> The next right note is flashing on the ${this.w('piano', 'neck')}. Press <em>Show the next note</em> again for the one after.`
                    ];

                    const picks = [];
                    const spots = new Map();   // on the neck: where each picked pitch was clicked
                    let lastCell = null;
                    let hintsShown = 0;
                    const container = this.container.querySelector('#piano-learn-scales-container');
                    const picksEl = document.getElementById('quiz-picks');
                    const feedback = document.getElementById('quiz-feedback');
                    const hintBtn = document.getElementById('quiz-hint');
                    const sorted = () => [...picks].sort((a, b) => a - b);
                    const onNeck = () => this.preferredInstrument === 'guitar';
                    const keyFor = (midi) => {
                        if (!container) return null;
                        if (!onNeck()) return container.querySelector(`[data-instrument-host="piano"] [data-midi="${midi}"]`);
                        const spot = spots.get(midi);
                        const at = spot && container.querySelector(`.fret-cell[data-string-index="${spot[0]}"][data-fret="${spot[1]}"][data-midi="${midi}"]`);
                        return at || this.neckCell(midi, lastCell);
                    };

                    const paint = () => {
                        const howEl = document.getElementById('quiz-how');
                        if (howEl) howEl.innerHTML = how();
                        const hintBox = document.getElementById('quiz-hints');
                        if (hintBox && hintsShown) hintBox.innerHTML = hints()[hintsShown - 1];
                        if (container) {
                            container.querySelectorAll('.quiz-picked').forEach(k => k.classList.remove('quiz-picked'));
                            picks.forEach(m => { const k = keyFor(m); if (k) k.classList.add('quiz-picked'); });
                        }
                        const notes = sorted();
                        if (!notes.length) { picksEl.innerHTML = '<span id="quiz-progress">none yet</span>'; return; }
                        const base = notes[0];
                        picksEl.innerHTML = notes.map((m, i) => {
                            let step = '';
                            if (i > 0 && hintsShown >= 2) {
                                const n = m - notes[i - 1];
                                const want = SCALE[i] - SCALE[i - 1];
                                const ok = base % 12 === 7 && n === want;
                                step = `<span class="quiz-step ${ok ? 'ok' : 'off'}">→${stepName(n)}→</span>`;
                            } else if (i > 0) {
                                step = '<span class="quiz-step">·</span>';
                            }
                            return `${step}<span class="quiz-chip">${name(m)}</span>`;
                        }).join('') + `<span id="quiz-progress" style="margin-left: 8px;">${notes.length}/8</span>`;
                    };

                    // The first note of the scale still to be found, or null when all 8 are right.
                    const nextNote = () => {
                        const notes = sorted();
                        if (!notes.length || notes[0] % 12 !== 7) return keyFor(67) ? 67 : 55;
                        for (let i = 1; i < SCALE.length; i++) {
                            if (notes[i] !== notes[0] + SCALE[i]) return notes[0] + SCALE[i];
                        }
                        return null;
                    };

                    const flashNext = () => {
                        const midi = nextNote();
                        const k = midi != null && keyFor(midi);
                        if (!k) return;
                        k.classList.remove('quiz-next');
                        void k.offsetWidth;
                        k.classList.add('quiz-next');
                    };

                    const onKey = (e) => {
                        const k = e.target.closest('[data-midi]');
                        if (!k || !container.contains(k)) return;
                        const midi = parseInt(k.getAttribute('data-midi'), 10);
                        if (isNaN(midi)) return;
                        const at = picks.indexOf(midi);
                        if (k.classList.contains('fret-cell')) {
                            const here = [k.dataset.stringIndex, k.dataset.fret];
                            const was = spots.get(midi);
                            lastCell = k;
                            if (at >= 0 && was && (was[0] !== here[0] || was[1] !== here[1])) {
                                spots.set(midi, here);       // the same note, in another place on the neck
                            } else if (at >= 0) {
                                picks.splice(at, 1);
                                spots.delete(midi);
                            } else {
                                picks.push(midi);
                                spots.set(midi, here);
                            }
                            // the neck lights a clicked note everywhere: here that would mark the picks wrongly
                            const neck = this._localGuitar;
                            neck.state.highlightedNote = null;
                            neck.state.focusMidi = null;
                            neck.applyState();
                        } else {
                            if (at >= 0) picks.splice(at, 1); else picks.push(midi);
                        }
                        feedback.style.display = 'none';
                        paint();
                    };

                    // The instrument is redrawn whenever the page's key or instrument changes,
                    // so the clicks are heard on its container and the picks are repainted
                    // after each redraw. No scale is marked on it, since the marks would give
                    // the answer away; the piano starts near G. A new tuning moves every
                    // pitch, so a picked note keeps its pitch and finds a new place.
                    if (container) container.addEventListener('click', onKey);
                    const onRetune = () => { spots.clear(); lastCell = null; paint(); };
                    window.addEventListener('guitar-tuning:change', onRetune);
                    this._lessonView = { root: 'G', highlights: false, keepsWork: true, afterRender: paint };
                    this._lessonCleanup = () => {
                        if (container) container.removeEventListener('click', onKey);
                        window.removeEventListener('guitar-tuning:change', onRetune);
                    };

                    hintBtn.addEventListener('click', () => {
                        const total = hints().length;
                        if (hintsShown < total) {
                            document.getElementById('quiz-hints').style.display = 'block';
                            hintsShown++;
                            if (hintsShown === total) hintBtn.textContent = '💡 Show the next note';
                            paint();
                        }
                        if (hintsShown === total) flashNext();
                    });

                    document.getElementById('quiz-reset').addEventListener('click', () => {
                        picks.length = 0;
                        feedback.style.display = 'none';
                        paint();
                    });

                    document.getElementById('quiz-check').addEventListener('click', () => {
                        const notes = sorted();
                        feedback.style.display = 'block';
                        const wrong = (html) => {
                            feedback.style.background = 'color-mix(in srgb, var(--lc-bad) 15%, transparent)';
                            feedback.style.border = '1px solid var(--lc-bad)';
                            feedback.innerHTML = `<strong>Not quite.</strong> ${html}`;
                        };

                        if (!notes.length) return wrong(`Click a G on the ${this.w('piano', 'neck')} to start.`);
                        if (notes[0] % 12 !== 7) return wrong(`A G major scale starts on G. Your lowest note is ${name(notes[0])}.`);
                        for (let i = 1; i < notes.length && i < SCALE.length; i++) {
                            const want = SCALE[i] - SCALE[i - 1];
                            const got = notes[i] - notes[i - 1];
                            if (got !== want) {
                                return wrong(`Your first ${i} note${i > 1 ? 's are' : ' is'} right. From ${name(notes[i - 1])}, the next step is ${stepWords(want)}, but ${name(notes[i])} is ${stepWords(got)} away.`);
                            }
                        }
                        if (notes.length < 8) {
                            feedback.style.background = 'color-mix(in srgb, var(--accent-primary) 12%, transparent)';
                            feedback.style.border = '1px solid var(--accent-primary)';
                            feedback.innerHTML = `<strong>So far so good:</strong> ${notes.length} of 8 notes, all right. Keep going up to the next G.`;
                            return;
                        }
                        if (notes.length > 8) return wrong(`The first 8 notes are right, but you have ${notes.length}. The scale stops at the next G.`);

                        feedback.style.background = 'color-mix(in srgb, var(--accent-secondary) 20%, transparent)';
                        feedback.style.border = '1px solid var(--accent-secondary)';
                        feedback.innerHTML = `
                            <strong>🎉 Perfect!</strong> G A B C D E F♯ G is G major${hintsShown ? '' : ', with no hints'}. Its one ${this.w('black key', 'sharp')}, F♯, is what the W W H W W W H pattern asks for.
                            <button id="quiz-complete-btn" style="margin-left: 8px; padding: 4px 14px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete lesson →
                            </button>
                        `;
                        setTimeout(() => {
                            this.playScale(notes[0], [0, 2, 4, 5, 7, 9, 11], 0.3, 0.35);
                        }, 500);
                        document.getElementById('quiz-complete-btn').addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    });

                    paint();
                }
            },
            {
                title: "Minor scales",
                check: {
                    q: 'Which number makes harmonic minor pull home harder than natural minor?',
                    options: ['♭3', '4', '♭6', '7'],
                    answer: 3,
                    why: 'Natural minor has ♭7. Harmonic minor raises it back to 7 (G♯ in A minor), a half step under home.',
                    wrong: ['All three minor scales share the ♭3: it’s what makes them minor.', 'The 4 is the same in all three.', 'Harmonic minor keeps the ♭6; melodic minor is the one that raises it.', '']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 5: Minor scales</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>There are three types of minor scales. The numbers under each compare it with the <strong>major scale on the same note</strong>: <strong>♭3</strong> means the 3rd, one half step lower.</p>
                            
                            <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin: 20px 0;">
                                <!-- Natural Minor -->
                                <div class="minor-scale-card" data-scale="aeolian" data-steps="2,1,2,2,1,2,2" style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s ease;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: var(--accent-primary); font-size: 1.1rem;">Natural minor (Aeolian)</div>
                                        <button class="minor-demo" data-scale="aeolian" data-steps="2,1,2,2,1,2,2" style="padding: 6px 16px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">▶ Play & show</button>
                                    </div>
                                    <div class="wh-pattern-row" style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                                        ${['W', 'H', 'W', 'W', 'H', 'W', 'W'].map((step, i) => `
                                            <div class="wh-step-minor" data-idx="${i}" style="background: color-mix(in srgb, var(--accent-primary) 20%, transparent); border: 1px solid var(--accent-primary); padding: 6px 12px; border-radius: 3px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">${step}</div>
                                        `).join('')}
                                    </div>
                                    <p style="margin: 8px 0; font-family: var(--font-tech); color: var(--text-main);">1 2 ♭3 4 5 ♭6 ♭7</p>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">The plain minor scale. A minor uses the same notes as C major, just starting on A. Three notes are lower than in A major: C, F and G instead of C♯, F♯ and G♯.</p>
                                </div>

                                <!-- Harmonic Minor -->
                                <div class="minor-scale-card" data-scale="harmonic_minor"data-steps="2,1,2,2,1,3,1" style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border: 1px solid var(--accent-secondary); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s ease;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: var(--accent-secondary); font-size: 1.1rem;">Harmonic minor</div>
                                        <button class="minor-demo" data-scale="harmonic_minor"data-steps="2,1,2,2,1,3,1" style="padding: 6px 16px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">▶ Play & show</button>
                                    </div>
                                    <div class="wh-pattern-row" style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                                        ${['W', 'H', 'W', 'W', 'H', 'W+H', 'H'].map((step, i) => `
                                            <div class="wh-step-minor" data-idx="${i}" style="background: color-mix(in srgb, var(--accent-secondary) 20%, transparent); border: 1px solid var(--accent-secondary); padding: 6px 12px; border-radius: 3px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">${step}</div>
                                        `).join('')}
                                    </div>
                                    <p style="margin: 8px 0; font-family: var(--font-tech); color: var(--text-main);">1 2 ♭3 4 5 ♭6 7</p>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">The 7 goes back up a half step (G♯ in A minor), so it sits right under home and pulls into it. That's why minor songs end E7 → Am: the E chord holds the G♯.</p>
                                </div>

                                <!-- Melodic Minor -->
                                <div class="minor-scale-card" data-scale="melodic_minor"data-steps="2,1,2,2,2,2,1" style="background: color-mix(in srgb, var(--text-highlight) 10%, transparent); border: 1px solid var(--text-highlight); border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s ease;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: var(--text-highlight); font-size: 1.1rem;">Melodic minor</div>
                                        <button class="minor-demo" data-scale="melodic_minor"data-steps="2,1,2,2,2,2,1" style="padding: 6px 16px; background: var(--text-highlight); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">▶ Play & show</button>
                                    </div>
                                    <div class="wh-pattern-row" style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                                        ${['W', 'H', 'W', 'W', 'W', 'W', 'H'].map((step, i) => `
                                            <div class="wh-step-minor" data-idx="${i}" style="background: color-mix(in srgb, var(--text-highlight) 20%, transparent); border: 1px solid var(--text-highlight); padding: 6px 12px; border-radius: 3px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">${step}</div>
                                        `).join('')}
                                    </div>
                                    <p style="margin: 8px 0; font-family: var(--font-tech); color: var(--text-main);">1 2 ♭3 4 5 6 7</p>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">Raises both the 6th and the 7th: a major scale with only the 3rd lowered. Smoother to sing up through; used heavily in jazz.</p>
                                </div>
                            </div>

                            <div style="text-align: center; margin: 20px 0;">
                                <button id="compare-minor-scales-btn" style="padding: 10px 24px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 0.95rem;">
                                    ${this.w('🎹', '🎸')} Compare all three
                                </button>
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Listen carefully:</strong> Click each scale's pattern or the play button to hear AND see the W/H steps ${this.w('on the keyboard', 'on the neck')}. Notice how the raised 6th and 7th degrees change the sound!
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-5" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    const self = this;
                    const getRootMidi = () => {
                        try { return this.musicTheory.noteToMidi(this.currentKey + '4'); }
                        catch(_) { return this.noteToMidi(this.currentKey + '4'); }
                    };

                    // Step patterns (semitones) for each minor scale
                    const stepPatterns = {
                        aeolian: [2, 1, 2, 2, 1, 2, 2],
                        harmonic_minor: [2, 1, 2, 2, 1, 3, 1],
                        melodic_minor: [2, 1, 2, 2, 2, 2, 1]
                    };

                    // Helper to show interval annotations for a given pattern
                    const showPatternOnPiano = (steps) => {
                        const rootMidi = getRootMidi();
                        this.clearIntervalAnnotations();
                        let offset = 0;
                        steps.forEach((step) => {
                            const from = rootMidi + offset;
                            const to = from + step;
                            offset += step;
                            const label = step === 1 ? 'H' : step === 2 ? 'W' : 'W+H';
                            this.showIntervalArrow(from, to, label);
                        });
                    };

                    // Play & Show buttons
                    document.querySelectorAll('.minor-demo').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const scale = btn.dataset.scale;
                            const rootMidi = getRootMidi();
                            const intervals = this.musicTheory.scales[scale];
                            const steps = stepPatterns[scale] || [];
                            showPatternOnPiano(steps);
                            if (intervals) {
                                this.playScale(rootMidi, intervals, 0.3, 0.35);
                            }
                        });
                    });

                    // Clicking on the whole card also triggers the demo
                    document.querySelectorAll('.minor-scale-card').forEach(card => {
                        card.addEventListener('click', () => {
                            const scale = card.dataset.scale;
                            const rootMidi = getRootMidi();
                            const intervals = this.musicTheory.scales[scale];
                            const steps = stepPatterns[scale] || [];
                            showPatternOnPiano(steps);
                            if (intervals) {
                                this.playScale(rootMidi, intervals, 0.3, 0.35);
                            }
                        });
                    });

                    // Compare button: cycle through all three quickly
                    const compareBtn = document.getElementById('compare-minor-scales-btn');
                    if (compareBtn) {
                        compareBtn.addEventListener('click', () => {
                            const rootMidi = getRootMidi();
                            const scaleOrder = ['aeolian', 'harmonic_minor', 'melodic_minor'];
                            let i = 0;
                            const playNext = () => {
                                if (i >= scaleOrder.length) return;
                                const scale = scaleOrder[i];
                                const intervals = this.musicTheory.scales[scale];
                                const steps = stepPatterns[scale];
                                showPatternOnPiano(steps);
                                if (intervals) this.playScale(rootMidi, intervals, 0.28, 0.32);
                                i++;
                                setTimeout(playNext, (intervals ? intervals.length : 7) * 320 + 800);
                            };
                            playNext();
                        });
                    }

                    const completeBtn = document.getElementById('complete-lesson-5');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Modes",
                check: {
                    q: 'D Dorian is D major with…',
                    options: ['♭7 only', '♯4', '♭3 and ♭7', '♭2, ♭3, ♭6 and ♭7'],
                    answer: 2,
                    why: 'D E F G A B C: F and C are each a half step lower than in D major.',
                    wrong: ['♭7 only is Mixolydian.', '♯4 is Lydian.', '', 'That’s Phrygian.']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 6: Modes</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p><strong>Modes</strong> are scales built by starting on different degrees of the major scale. Each mode has a unique sound and character.</p>
                            
                            <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>One way to see it:</strong> If you play C-D-E-F-G-A-B-C, that's C Major (Ionian). But if you play D-E-F-G-A-B-C-D (same notes, different starting point), that's D Dorian!
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>The other way:</strong> compare a mode with the <strong>major scale on its own starting note</strong>. D major is D E F♯ G A B C♯. D Dorian is D E <strong>F</strong> G A B <strong>C</strong>: the same, with the 3rd and the 7th a half step lower. So <strong>D Dorian = D major with ♭3 and ♭7</strong>.
                                <div style="margin: 8px 0;">
                                    <button class="mode-compare-btn" data-notes="62,64,66,67,69,71,73,74" style="padding: 4px 10px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin: 2px; text-transform: none;">▶ D major</button>
                                    <button class="mode-compare-btn" data-notes="62,64,65,67,69,71,72,74" style="padding: 4px 10px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; margin: 2px; text-transform: none;">▶ D Dorian</button>
                                </div>
                                This view is the one later lessons use: when they borrow from "a scale that starts on D", you take D major and change a note or two. The <strong>As numbers</strong> column below gives every mode this way.
                            </div>

                            <div style="margin: 24px 0; overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
                                    <thead>
                                        <tr style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent);">
                                            <th style="padding: 12px; text-align: left; color: var(--accent-primary);">Mode</th>
                                            <th style="padding: 12px; text-align: left; color: var(--accent-primary);">Starts on</th>
                                            <th style="padding: 12px; text-align: left; color: var(--accent-primary);">As numbers</th>
                                            <th style="padding: 12px; text-align: center; color: var(--accent-primary);">Play</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${[
                                            {name: 'Ionian', deg: '1', scale: 'major', nums: '1 2 3 4 5 6 7'},
                                            {name: 'Dorian', deg: '2', scale: 'dorian', nums: '1 2 ♭3 4 5 6 ♭7'},
                                            {name: 'Phrygian', deg: '3', scale: 'phrygian', nums: '1 ♭2 ♭3 4 5 ♭6 ♭7'},
                                            {name: 'Lydian', deg: '4', scale: 'lydian', nums: '1 2 3 ♯4 5 6 7'},
                                            {name: 'Mixolydian', deg: '5', scale: 'mixolydian', nums: '1 2 3 4 5 6 ♭7'},
                                            {name: 'Aeolian', deg: '6', scale: 'aeolian', nums: '1 2 ♭3 4 5 ♭6 ♭7'},
                                            {name: 'Locrian', deg: '7', scale: 'locrian', nums: '1 ♭2 ♭3 4 ♭5 ♭6 ♭7'}
                                        ].map(mode => `
                                            <tr style="border-top: 1px solid var(--border-light);">
                                                <td style="padding: 12px; font-weight: 700; color: var(--text-highlight);">${mode.name}</td>
                                                <td style="padding: 12px; font-family: var(--font-tech);">${(() => { try { return this.glyph((this.musicTheory.getScaleNotesWithKeySignature(this.currentKey, 'major') || [])[mode.deg - 1] || ''); } catch (_) { return ''; } })()} <span style="color: var(--text-muted);">(degree ${mode.deg})</span></td>
                                                <td style="padding: 12px; font-family: var(--font-tech); white-space: nowrap;">${mode.nums}</td>
                                                <td style="padding: 12px; text-align: center;">
                                                    <button class="mode-play-btn" data-scale="${mode.scale}" style="padding: 4px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">▶</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <div style="background: color-mix(in srgb, var(--text-main) 5%, transparent); padding: 16px; border-radius: 8px; margin: 20px 0;">
                                <div style="font-weight: 700; margin-bottom: 12px; text-align: center;">🎼 Practice tip</div>
                                <p style="margin: 8px 0; text-align: center;">Each ▶ above plays the same notes from a new starting point. A mode also keeps its sound on any starting note: pick <strong>Dorian</strong> in the menu below, play it from C, and compare it with C Major.</p>
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-6" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    const self = this;
                    const getRootMidi = () => {
                        try { return this.musicTheory.noteToMidi(this.currentKey + '4'); }
                        catch(_) { return this.noteToMidi(this.currentKey + '4'); }
                    };

                    // W/H step patterns for each mode (semitones)
                    const modeSteps = {
                        major: [2, 2, 1, 2, 2, 2, 1],
                        dorian: [2, 1, 2, 2, 2, 1, 2],
                        phrygian: [1, 2, 2, 2, 1, 2, 2],
                        lydian: [2, 2, 2, 1, 2, 2, 1],
                        mixolydian: [2, 2, 1, 2, 2, 1, 2],
                        aeolian: [2, 1, 2, 2, 1, 2, 2],
                        locrian: [1, 2, 2, 1, 2, 2, 2]
                    };

                    // A mode here is the major scale's own notes from another of its
                    // degrees (D Dorian is C major's white keys from D), played low
                    // enough that its top note is still on the keyboard.
                    const MAJOR = [0, 2, 4, 5, 7, 9, 11];
                    const modeStart = (scale) => {
                        const deg = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'].indexOf(scale);
                        const offset = MAJOR[Math.max(0, deg)];
                        return getRootMidi() + (offset > 8 ? offset - 12 : offset);
                    };

                    const showModeOnPiano = (steps, rootMidi) => {
                        this.clearIntervalAnnotations();
                        let offset = 0;
                        steps.forEach((step) => {
                            const from = rootMidi + offset;
                            const to = from + step;
                            offset += step;
                            const label = step === 1 ? 'H' : 'W';
                            this.showIntervalArrow(from, to, label);
                        });
                    };

                    document.querySelectorAll('.mode-compare-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            this.clearIntervalAnnotations();
                            this.playSequenceWithAnimation(btn.dataset.notes.split(',').map(Number), 0.3, 0.35);
                        });
                    });

                    document.querySelectorAll('.mode-play-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const scale = btn.dataset.scale;
                            const rootMidi = modeStart(scale);
                            const intervals = this.musicTheory.scales[scale];
                            const steps = modeSteps[scale] || [];
                            showModeOnPiano(steps, rootMidi);
                            if (intervals) {
                                this.playScale(rootMidi, intervals, 0.3, 0.35);
                            }
                        });
                    });

                    const completeBtn = document.getElementById('complete-lesson-6');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Chords from scales",
                check: {
                    q: 'In C major, what is the 5 chord with its 7th added?',
                    options: ['Gmaj7', 'G7', 'Gm7', 'Bø7'],
                    answer: 1,
                    why: 'G·B·D·F, all notes of C major. A plain 7 means the lower 7th, F here.',
                    wrong: ['Gmaj7 needs F♯, which isn’t in C major.', '', 'Gm7 needs B♭, which isn’t in C major.', 'Bø7 is built on the 7, not the 5.']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 7: Chords from scales</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Every scale contains chords built on each of its degrees. This is how we create chord progressions!</p>
                            
                            <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>The Rule:</strong> To build a chord from a scale degree, take that note, skip one, take one, skip one, take one. This creates a triad (3-note chord). Skip once more and take one more note, and you have a <strong>7th chord</strong> (4 notes): the chords the Intermediate lessons start from.
                            </div>

                            <div style="margin: 24px 0; overflow-x: auto;">
                                <div style="font-weight: 700; margin-bottom: 16px; text-align: center; font-size: 1.1rem;">Chords in the C major scale</div>
                                <table style="width: 100%; border-collapse: collapse; background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
                                    <thead>
                                        <tr style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent);">
                                            <th style="padding: 10px; text-align: center; color: var(--accent-primary);">Degree</th>
                                            <th style="padding: 10px; text-align: left; color: var(--accent-primary);">Chord</th>
                                            <th style="padding: 10px; text-align: left; color: var(--accent-primary);">Quality</th>
                                            <th style="padding: 10px; text-align: left; color: var(--accent-primary);">Notes</th>
                                            <th style="padding: 10px; text-align: center; color: var(--accent-primary);">Play</th>
                                            <th style="padding: 10px; text-align: left; color: var(--accent-primary);">Add the 7th</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${[
                                            {num: '1', deg: 'I', chord: 'C', s7: 'Cmaj7', n7: 'C-E-G-B', m7: [60,64,67,71], quality: 'Major', notes: 'C-E-G', midis: [60,64,67]},
                                            {num: '2', deg: 'ii', chord: 'Dm', s7: 'Dm7', n7: 'D-F-A-C', m7: [62,65,69,72], quality: 'Minor', notes: 'D-F-A', midis: [62,65,69]},
                                            {num: '3', deg: 'iii', chord: 'Em', s7: 'Em7', n7: 'E-G-B-D', m7: [64,67,71,74], quality: 'Minor', notes: 'E-G-B', midis: [64,67,71]},
                                            {num: '4', deg: 'IV', chord: 'F', s7: 'Fmaj7', n7: 'F-A-C-E', m7: [65,69,72,76], quality: 'Major', notes: 'F-A-C', midis: [65,69,72]},
                                            {num: '5', deg: 'V', chord: 'G', s7: 'G7', n7: 'G-B-D-F', m7: [67,71,74,77], quality: 'Major', notes: 'G-B-D', midis: [67,71,74]},
                                            {num: '6', deg: 'vi', chord: 'Am', s7: 'Am7', n7: 'A-C-E-G', m7: [69,72,76,79], quality: 'Minor', notes: 'A-C-E', midis: [69,72,76]},
                                            {num: '7', deg: 'vii°', chord: 'Bdim', s7: 'Bø7', n7: 'B-D-F-A', m7: [71,74,77,81], quality: 'Diminished', notes: 'B-D-F', midis: [71,74,77]}
                                        ].map(row => `
                                            <tr style="border-top: 1px solid var(--border-light);">
                                                <td style="padding: 10px; text-align: center; font-weight: 700; font-size: 1.1rem; color: var(--text-highlight);">${row.num} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">${row.deg}</span></td>
                                                <td style="padding: 10px; font-weight: 700; color: var(--accent-secondary);">${row.chord}</td>
                                                <td style="padding: 10px;">${row.quality}</td>
                                                <td style="padding: 10px; font-family: var(--font-tech); font-size: 0.9rem;">${row.notes}</td>
                                                <td style="padding: 10px; text-align: center;">
                                                    <button class="chord-play-btn" data-midis="${row.midis.join(',')}" style="padding: 4px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">▶</button>
                                                </td>
                                                <td style="padding: 10px; white-space: nowrap;">
                                                    <button class="chord-play-btn" data-midis="${row.m7.join(',')}" title="${row.n7}" style="padding: 4px 10px; background: var(--accent-secondary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem; text-transform: none;">▶ ${row.s7}</button>
                                                    <span style="font-family: var(--font-tech); font-size: 0.8rem; margin-left: 4px;">${row.n7}</span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Did you notice?</strong> The pattern is Major-minor-minor-Major-Major-minor-diminished, and it is the same in every major key. That is why the numerals change case: <strong>capitals</strong> (I, IV, V) are major chords, <strong>lowercase</strong> (ii, iii, vi) are minor, and <strong>°</strong> means diminished.
                                <br>The rest of the course mostly says them as plain numbers: <strong>the 1 chord, the 4 chord, the 5 chord</strong>. I, IV and V are the same chords in Roman numerals.
                                <br>With 7ths the pattern is maj7, m7, m7, maj7, <strong>7</strong>, m7, ø7. Only the 5 chord gets a plain "7" (G7, a <em>dominant 7th</em>): a major chord with the lower 7th, F, on top.
                            </div>

                            <div style="text-align: center; margin: 24px 0;">
                                <button id="play-progression" style="padding: 12px 32px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 700;">
                                    🎵 Play I-IV-V-I progression
                                </button>
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-7" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    const self = this;
                    
                    // Highlight chord notes on current instrument when playing
                    const highlightChordNotes = (midis) => {
                        this.clearIntervalAnnotations();
                        this.revealInstrument();
                        midis.forEach(midi => {
                            this.highlightNoteDuringPlayback(midi, 1.2);
                        });
                    };

                    document.querySelectorAll('.chord-play-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const midis = btn.dataset.midis.split(',').map(Number);
                            highlightChordNotes(midis);
                            this.playChord(midis, 1.5);
                        });
                    });

                    const progBtn = document.getElementById('play-progression');
                    if (progBtn) {
                        progBtn.addEventListener('click', () => {
                            const progression = [
                                [60,64,67], // I (C)
                                [65,69,72], // IV (F)
                                [67,71,74], // V (G)
                                [60,64,67]  // I (C)
                            ];
                            
                            progression.forEach((chord, i) => {
                                setTimeout(() => {
                                    highlightChordNotes(chord);
                                    this.playChord(chord, 1.0);
                                }, i * 1200);
                            });
                        });
                    }

                    const completeBtn = document.getElementById('complete-lesson-7');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Pentatonic scales",
                check: {
                    q: 'Which two notes of C major does C major pentatonic leave out?',
                    options: ['D and A', 'F and B', 'C and G', 'E and B'],
                    answer: 1,
                    why: 'C D E G A. F and B are the notes in C major’s half steps (E–F, B–C), so without them no half steps are left.',
                    wrong: ['D and A are in it: C D E G A.', '', 'C and G are in it: C D E G A.', 'E is in it: C D E G A.']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 8: Pentatonic scales</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p><strong>Pentatonic scales</strong> have only 5 notes instead of 7. They're easier to improvise with and sound great in almost any context!</p>
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 24px 0;">
                                <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: var(--accent-primary); font-size: 1.1rem;">Major pentatonic</div>
                                        <button class="pent-demo" data-scale="major_pentatonic" style="padding: 6px 14px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">▶ Play</button>
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>Formula:</strong> 1-2-3-5-6
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>In C:</strong> C-D-E-G-A
                                    </div>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">Used in rock, pop, and country music.</p>
                                </div>

                                <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border: 1px solid var(--accent-secondary); border-radius: 8px; padding: 16px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: var(--accent-secondary); font-size: 1.1rem;">Minor pentatonic</div>
                                        <button class="pent-demo" data-scale="minor_pentatonic" style="padding: 6px 14px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">▶ Play</button>
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>Formula:</strong> 1-♭3-4-5-♭7 <span style="color: var(--text-muted);">(♭3 = the 3rd, one half step lower)</span>
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>In A:</strong> A-C-D-E-G
                                    </div>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">Blues, rock, and metal favorite. With no half steps inside it, it's hard to hit a note that clashes.</p>
                                </div>
                            </div>

                            <div style="background: color-mix(in srgb, var(--text-main) 5%, transparent); padding: 20px; border-radius: 8px; margin: 24px 0;">
                                <div style="font-weight: 700; margin-bottom: 16px; text-align: center; font-size: 1.1rem;">🎸 Why pentatonics are great for beginners</div>
                                <ul style="margin: 8px 0; padding-left: 24px; line-height: 1.8;">
                                    <li>Only 5 notes to remember (vs 7 in major/minor)</li>
                                    <li>Hard to play a note that clashes</li>
                                    <li>Works over multiple chords</li>
                                    <li>Foundation of blues and rock guitar</li>
                                    <li>Great for developing improvisation skills</li>
                                </ul>
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Try this:</strong> Press <strong>▶ Play</strong> on either card and the ${this.w('piano', 'neck')} below switches to that scale. Then make up a melody using only the marked notes: they all sound good together!
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-8" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    document.querySelectorAll('.pent-demo').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const scale = btn.dataset.scale;
                            const rootMidi = scale === 'minor_pentatonic' ? 69 : 60; // A for minor, C for major
                            const intervals = this.musicTheory.scales[scale];
                            this.showOnPiano(scale === 'minor_pentatonic' ? 'A' : 'C', scale);
                            if (intervals) {
                                this.playScale(rootMidi, intervals, 0.3, 0.35);
                            }
                        });
                    });

                    const completeBtn = document.getElementById('complete-lesson-8');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Practice and next steps",
                check: {
                    q: 'To finish the scales: which step pattern builds a major scale?',
                    options: ['W H W W H W W', 'W W H W W W H', 'H W W W H W W', 'W W W H W W H'],
                    answer: 1,
                    why: 'Whole, whole, half, whole, whole, whole, half: start it on any note and you get that note’s major scale.',
                    wrong: ['That’s natural minor.', '', 'That’s Phrygian.', 'That’s Lydian.']
                },
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 9: Practice and next steps</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Here's how to keep your scales moving once these lessons are done:</p>
                            
                            <div style="background: linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), color-mix(in srgb, var(--accent-secondary) 10%, transparent)); border: 1px solid var(--border-light); border-radius: 12px; padding: 24px; margin: 24px 0;">
                                <div style="font-weight: 700; font-size: 1.2rem; margin-bottom: 20px; text-align: center;">🎯 Your learning path</div>
                                
                                <div style="display: grid; gap: 16px;">
                                    ${[
                                        {
                                            icon: this.w('🎹', '🎸'),
                                            title: 'Daily scale practice',
                                            desc: 'Practice each scale in all 12 keys. Start with major, then minor, then modes.',
                                            time: '10-15 min/day'
                                        },
                                        {
                                            icon: '👂',
                                            title: 'Ear training',
                                            desc: 'Listen to songs and try to identify which scale they use. Start with simple melodies.',
                                            time: '5-10 min/day'
                                        },
                                        {
                                            icon: '🎼',
                                            title: 'Chord construction',
                                            desc: 'Practice building triads from each scale degree. Learn the chord progressions.',
                                            time: '10 min/day'
                                        },
                                        {
                                            icon: '🎸',
                                            title: 'Improvisation',
                                            desc: 'Use backing tracks and improvise with pentatonic scales first, then expand.',
                                            time: '15-20 min/day'
                                        }
                                    ].map(item => `
                                        <div style="display: flex; gap: 16px; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; border: 1px solid var(--border-light);">
                                            <div style="font-size: 2rem; flex-shrink: 0;">${item.icon}</div>
                                            <div style="flex: 1;">
                                                <div style="font-weight: 700; color: var(--text-highlight); margin-bottom: 4px;">${item.title}</div>
                                                <div style="font-size: 0.9rem; margin-bottom: 6px;">${item.desc}</div>
                                                <div style="font-size: 0.75rem; color: var(--accent-secondary); font-family: var(--font-tech);">⏱️ ${item.time}</div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-primary) 10%, transparent); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 20px; margin: 24px 0;">
                                <div style="font-weight: 700; margin-bottom: 12px; font-size: 1.1rem;">📚 Next in the course</div>
                                <ul style="margin: 0; padding-left: 24px; line-height: 1.8;">
                                    <li><a href="#" data-course-lesson="b-chords" style="color: var(--accent-primary);"><strong>Chords from intervals</strong></a>: build a chord by stacking its intervals</li>
                                    <li><a href="#" data-course-lesson="b-inversions" style="color: var(--accent-primary);"><strong>Inversions</strong></a>: the same chord with a different note on the bottom</li>
                                    <li><a href="#" data-course-lesson="i-close-voicing" style="color: var(--accent-primary);"><strong>Intermediate: Voicings</strong></a>: open a chord up so a melody fits on top</li>
                                    <li><a href="#" data-course-lesson="i-bebop-major" style="color: var(--accent-primary);"><strong>Intermediate: Bebop major</strong></a>: an eight-note scale with just two chords in it</li>
                                </ul>
                            </div>

                            <div style="background: color-mix(in srgb, var(--accent-secondary) 10%, transparent); border-left: 3px solid var(--accent-secondary); padding: 16px; margin: 20px 0; border-radius: 4px;">
                                <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1rem;">🌟 Keep practicing!</div>
                                <p style="margin: 0;">Remember: consistency beats intensity. Even 15 minutes of focused daily practice will yield better results than occasional long sessions. Use the ${this.w('piano', 'neck')} below to review any scales whenever you need a refresher!</p>
                            </div>

                            <div style="text-align: center; margin: 24px 0;">
                                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">
                                    You've completed <strong>${this.progress.completedLessons.size}</strong> out of <strong>${this.lessons.length}</strong> lessons!
                                </div>
                                <div style="background: color-mix(in srgb, var(--text-main) 10%, transparent); border-radius: 999px; height: 12px; overflow: hidden; margin-bottom: 16px;">
                                    <div style="background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); height: 100%; width: ${(this.progress.completedLessons.size / this.lessons.length) * 100}%; transition: width 0.3s;"></div>
                                </div>
                            </div>
                        </div>

                        <div class="lc-complete"><button id="complete-lesson-9" type="button" class="lc-btn lc-complete-btn">Complete lesson →</button></div>
                    `;
                },
                setup: function() {
                    document.querySelectorAll('[data-course-lesson]').forEach(a => {
                        a.addEventListener('click', (e) => {
                            e.preventDefault();
                            const page = document.getElementById('learn-scales-page');
                            if (page) page.style.display = 'none';
                            if (window.Course) window.Course.start(a.getAttribute('data-course-lesson'));
                        });
                    });
                    const completeBtn = document.getElementById('complete-lesson-9');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                            const n = this.progress.completedLessons.size, all = this.lessons.length;
                            if (window.LearnCommon) {
                                window.LearnCommon.finish('b-scales', n >= all
                                    ? 'All nine scale lessons done: you can build a scale, number it, and pull chords out of it.'
                                    : `${n} of ${all} scale lessons done. The numbers at the top of Scales take you back to any you skipped.`);
                            }
                        });
                    }
                }
            }
        ];
    }

    // MIDI integration
    connectMidi(midiManager) {
        if (!midiManager) return;
        midiManager.on('noteOn', ({ midi }) => this.midiNoteOn(midi));
        midiManager.on('noteOff', ({ midi }) => this.midiNoteOff(midi));
    }

    midiNoteOn(midi) {
        if (typeof midi !== 'number') return;
        this._midiActiveKeys.add(midi);
        const shown = this.getActiveVisualizer();
        if (shown && typeof shown.midiNoteOn === 'function') shown.midiNoteOn(midi);
    }

    midiNoteOff(midi) {
        if (typeof midi !== 'number') return;
        this._midiActiveKeys.delete(midi);
        const shown = this.getActiveVisualizer();
        if (shown && typeof shown.midiNoteOff === 'function') shown.midiNoteOff(midi);
    }
}

// Export for use in modular app
if (typeof window !== 'undefined') {
    window.LearnScales = LearnScales;
}
