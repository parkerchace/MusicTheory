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
        
        // Instrument preference (piano or guitar) - read from localStorage
        this.preferredInstrument = localStorage.getItem('music-theory-instrument') || 'piano';
        
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
                        p.then(() => { this._audioEngine.isReady = true; this.warmupAudio(); }).catch(()=>{});
                    } else {
                        this._audioEngine.isReady = true;
                        this.warmupAudio();
                    }
                } else if (typeof this._audioEngine.init === 'function') {
                    const maybe = this._audioEngine.init();
                    if (maybe && typeof maybe.then === 'function') {
                        maybe.then(() => { this._audioEngine.isReady = true; this.warmupAudio(); }).catch(()=>{});
                    } else {
                        this._audioEngine.isReady = true;
                        this.warmupAudio();
                    }
                } else {
                    this._audioEngine.isReady = true;
                    this.warmupAudio();
                }
            } catch (e) {
                this._audioEngine.isReady = true;
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
            if (this._audioEngine.isReady) return resolve();

            // If engine exposes preloadSamples which returns a promise, wait for it.
            if (typeof this._audioEngine.preloadSamples === 'function') {
                try {
                    const p = this._audioEngine.preloadSamples();
                    if (p && typeof p.then === 'function') {
                        const t = setTimeout(() => resolve(), Math.max(300, timeout));
                        p.then(() => { clearTimeout(t); this._audioEngine.isReady = true; resolve(); }).catch(() => { clearTimeout(t); resolve(); });
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
                        p.then(() => { clearTimeout(t); this._audioEngine.isReady = true; resolve(); }).catch(() => { clearTimeout(t); resolve(); });
                        return;
                    }
                } catch (e) {}
            }

            // Fallback: wait a short period for engines that warm up asynchronously
            setTimeout(() => { this._audioEngine.isReady = true; resolve(); }, 250);
        });
    }

    showAudioSpinner() {
        try {
            if (!this.container) return;
            if (this._audioSpinner) return;
            const spin = document.createElement('div');
            spin.id = 'learn-scales-audio-spinner';
            spin.style.cssText = 'position:absolute; right:18px; top:18px; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.5); z-index:9999;';
            spin.innerHTML = '<div style="width:18px;height:18px;border:3px solid rgba(255,255,255,0.2);border-top-color:rgba(255,255,255,0.9);border-radius:50%;animation:learnscales-spin 0.9s linear infinite"></div>';
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

    /**
     * Play a note with optional scheduling offset
     * @param {number} midi - MIDI note number
     * @param {number} duration - Note duration in seconds
     * @param {number} time - Delay offset in seconds (for scheduling multiple notes)
     */
    playNote(midi, duration = 0.3, time = 0) {
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

    cancelPlayback() {
        this._playToken++;
        try {
            this._playTimers.forEach(t => clearTimeout(t));
        } catch (_) {}
        this._playTimers = [];
        this.clearPlayHighlights();
    }

    playChord(midis, duration = 1.0) {
        if (this._audioEngine && typeof this._audioEngine.playChord === 'function') {
            this._audioEngine.playChord(midis, duration);
        }
    }

    playScale(startMidi, intervals, duration = 0.3, delay = 0.4) {
        // intervals are absolute semitone offsets from root (e.g., [0, 2, 4, 5, 7, 9, 11] for major)
        // Play each note in the scale with visual highlighting
        this.cancelPlayback();
        const token = this._playToken;
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
            cell.style.background = 'radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(245,158,11,0.8) 100%)';
            cell.style.boxShadow = '0 0 20px rgba(251,191,36,0.9)';
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
        // Piano annotations
        if (this._localPiano && this._localPiano.pianoElement) {
            try {
                const existing = this._localPiano.pianoElement.querySelectorAll('.interval-annotation');
                existing.forEach(el => el.remove());
            } catch (e) {}
        }
        // Guitar annotations (if we add them later)
        if (this._localGuitar && this._localGuitar.element) {
            try {
                const existing = this._localGuitar.element.querySelectorAll('.interval-annotation');
                existing.forEach(el => el.remove());
            } catch (e) {}
        }
    }

    /**
     * Show an interval arrow/label between two keys on the piano
     * @param {number} fromMidi - Starting MIDI note
     * @param {number} toMidi - Ending MIDI note
     * @param {string} label - The label to display (e.g., 'W', 'H')
     */
    showIntervalArrow(fromMidi, toMidi, label) {
        // For guitar, we could add fretboard annotations later
        // For now, only piano supports interval arrows
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
            background: ${label === 'W' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(96, 165, 250, 0.2)'};
            border: 1px solid ${label === 'W' ? 'var(--accent-secondary)' : 'var(--accent-primary)'};
            border-radius: 4px;
            pointer-events: none;
            z-index: 50;
        `;
        anno.textContent = label;
        piano.appendChild(anno);
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div id="learn-scales-wrapper" style="position: relative; display: flex; flex-direction: column; gap: 16px; padding: 16px; max-width: 1000px; margin: 0 auto;">
                
                <!-- Top Navigation Bar -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <button id="scales-return-to-landing" style="display: flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--border-light); padding: 8px 14px; cursor: pointer; color: var(--text-main); font-family: var(--font-tech); transition: all 0.2s ease; border-radius: 4px; font-size: 0.9rem;">
                        <span style="font-size: 1.2rem;">←</span>
                        <span>Home</span>
                    </button>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-tech);">
                            Progress: ${this.progress.completedLessons.size} / ${this.lessons.length}
                        </div>
                        <button id="scales-theme-toggle" style="background: transparent; border: 1px solid var(--border-light); padding: 8px 14px; cursor: pointer; color: var(--text-main); font-family: var(--font-tech); transition: all 0.2s ease; border-radius: 4px; font-size: 1.1rem;">
                            🌓
                        </button>
                    </div>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 12px;">
                    <h2 style="color: var(--text-main); margin: 0 0 12px 0; font-size: clamp(1.2rem, 3vw, 1.8rem);">
                        🎵 Learn Scales
                    </h2>
                    <p style="color: var(--text-muted); margin: 0; font-size: clamp(0.85rem, 2vw, 1rem); line-height: 1.6;">
                        Master scales through structured lessons, interactive exercises, and ear training
                    </p>
                </div>

                <!-- Lesson Selector / Progress Bar -->
                <div id="lesson-nav" style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <button id="prev-lesson" class="nav-btn" style="padding: 6px 12px; background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; color: var(--text-main); font-size: 0.85rem;">← Previous</button>
                        <div style="color: var(--text-muted); font-size: 0.85rem; font-weight: 700;">Lesson ${this.currentLesson + 1} of ${this.lessons.length}</div>
                        <button id="next-lesson" class="nav-btn" style="padding: 6px 12px; background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 4px; cursor: pointer; color: var(--text-main); font-size: 0.85rem;">Next →</button>
                    </div>
                    <div id="lesson-dots" style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
                        ${this.lessons.map((lesson, i) => `
                            <button class="lesson-dot ${i === this.currentLesson ? 'active' : ''} ${this.progress.completedLessons.has(i) ? 'completed' : ''}" 
                                    data-lesson="${i}" 
                                    title="${lesson.title}"
                                    style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border-light); 
                                           background: ${i === this.currentLesson ? 'var(--accent-primary)' : (this.progress.completedLessons.has(i) ? 'var(--accent-secondary)' : 'var(--bg-app)')}; 
                                           color: ${i === this.currentLesson || this.progress.completedLessons.has(i) ? '#000' : 'var(--text-muted)'}; 
                                           cursor: pointer; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                                ${this.progress.completedLessons.has(i) ? '✓' : i + 1}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Main Content Area -->
                <div id="lesson-content" style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 24px; min-height: 400px;">
                    <!-- Content will be dynamically rendered here -->
                </div>

                <!-- Interactive Piano (Shared across lessons) -->
                <div id="scale-piano-section" style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <div id="instrument-label" style="color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                ${this.preferredInstrument === 'guitar' ? '🎸 Interactive Guitar' : '🎹 Interactive Piano'}
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <select id="piano-key-select" style="padding: 4px 8px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; font-size: 0.85rem;">
                                ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k => 
                                    `<option value="${k}" ${k === this.currentKey ? 'selected' : ''}>${k}</option>`
                                ).join('')}
                            </select>
                            <select id="piano-scale-select" style="padding: 4px 8px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; font-size: 0.85rem;">
                                <option value="major" selected>Major</option>
                                <option value="aeolian">Natural Minor</option>
                                <option value="harmonic">Harmonic Minor</option>
                                <option value="melodic">Melodic Minor</option>
                                <option value="dorian">Dorian</option>
                                <option value="phrygian">Phrygian</option>
                                <option value="lydian">Lydian</option>
                                <option value="mixolydian">Mixolydian</option>
                                <option value="locrian">Locrian</option>
                                <option value="major_pentatonic">Major Pentatonic</option>
                                <option value="minor_pentatonic">Minor Pentatonic</option>
                            </select>
                            <button id="play-scale-btn" class="btn" style="padding: 8px 18px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95rem; font-weight: 700;">▶ Play Scale</button>
                            <button id="change-instrument-btn" class="btn" style="padding: 4px 10px; margin-left: 8px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Change Instrument</button>
                            <button id="invert-play-btn" class="btn" aria-pressed="false" style="padding: 4px 10px; margin-left: 8px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; cursor: pointer; font-size: 0.85rem;">↑ Ascending</button>
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
            homeBtn.addEventListener('click', () => {
                const landingPage = document.getElementById('landing-page');
                const learnPage = document.getElementById('learn-scales-page');
                if (landingPage && learnPage) {
                    landingPage.style.display = 'block';
                    learnPage.style.display = 'none';
                }
            });
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
                const cur = localStorage.getItem('music-theory-instrument') || this.preferredInstrument || 'piano';
                const next = cur === 'guitar' ? 'piano' : 'guitar';
                localStorage.setItem('music-theory-instrument', next);
                this.preferredInstrument = next;
                const label = document.getElementById('instrument-label');
                if (label) label.textContent = this.preferredInstrument === 'guitar' ? '🎸 Interactive Guitar' : '🎹 Interactive Piano';
                try { this.renderInstrument(); } catch (e) { console.warn('renderInstrument failed', e); }
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
        // Re-check preference from localStorage in case it changed
        this.preferredInstrument = localStorage.getItem('music-theory-instrument') || 'piano';
        
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

    renderGuitar() {
        const container = this.container.querySelector('#piano-learn-scales-container');
        if (!container) return;

        container.innerHTML = '';

        // Create or reuse guitar visualizer
        if (!this._localGuitar) {
            const GuitarClass = window.GuitarFretboardVisualizer || GuitarFretboardVisualizer;
            this._localGuitar = new GuitarClass({
                container: container,
                frets: 15, // Show fewer frets for lesson context
                showNoteLabels: true,
                fitToContainer: true
            });
        }

        // Set the scale state
        const scaleNotes = this.musicTheory.getScaleNotesWithKeySignature(this.currentKey, this.currentScale);
        this._localGuitar.state.currentKey = this.currentKey;
        this._localGuitar.state.currentScale = this.currentScale;
        this._localGuitar.state.scaleNotes = scaleNotes;

        // Mount into container
        this._localGuitar.mount(container);

        // Style the container for guitar
        container.style.paddingLeft = '10px';
        container.style.paddingRight = '10px';
        container.style.boxSizing = 'border-box';
        container.style.overflowX = 'auto';
        container.style.webkitOverflowScrolling = 'touch';
    }

    renderPiano() {
        const pianoContainer = this.container.querySelector('#piano-learn-scales-container');
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
        }

        pianoContainer.innerHTML = '';

        // Determine keyboard range so the selected scale's root is the lowest note displayed.
        // Use octave 4 for better visibility and use engine's canonical noteToMidi
        let desiredRootMidi;
        try {
            desiredRootMidi = this.musicTheory.noteToMidi(this.currentKey + '4');
        } catch (e) {
            desiredRootMidi = this.noteToMidi(this.currentKey + '4'); // fallback to local
        }
        if (!desiredRootMidi || desiredRootMidi < 24) desiredRootMidi = 60; // fallback to C4
        const startMidi = Math.max(21, desiredRootMidi);
        const octaves = 2; // two visible octaves

        // Ask piano visualizer to adopt the desired root and range. The visualizer
        // manages fit-vs-scroll behavior internally via ResizeObserver.
        if (this._localPiano && typeof this._localPiano.setRootMidi === 'function') {
            this._localPiano.setRootMidi(startMidi);
            if (typeof this._localPiano.setRange === 'function') this._localPiano.setRange(octaves);
            this._localPiano.render({
                container: pianoContainer,
                whiteKeyWidth: keyWidth,
                whiteKeyHeight: keyHeight,
                blackKeyHeight: blackKeyHeight,
                // On mobile, prefer scrolling (disable fit-to-container) so keys keep usable size
                fitToContainer: !isMobile,
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

        // Add left padding to container so degree bubbles on leftmost keys are visible
        pianoContainer.style.paddingLeft = '20px';
        pianoContainer.style.boxSizing = 'border-box';

        // Mobile: allow horizontal scrolling with native momentum scrolling
        if (isMobile) {
            pianoContainer.style.overflowX = 'auto';
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

        // Add click handlers
        if (this._localPiano.pianoElement) {
            const keys = this._localPiano.pianoElement.querySelectorAll('[data-note]');
            keys.forEach(key => {
                key.addEventListener('click', () => {
                    const midi = parseInt(key.getAttribute('data-midi'));
                    if (!isNaN(midi)) {
                        this.playNote(midi);
                    }
                });
            });
        }

        this.updatePianoHighlights();
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
        const scaleNotes = this.musicTheory.getScaleNotesWithKeySignature(this.currentKey, this.currentScale);
        this._localGuitar.state.currentKey = this.currentKey;
        this._localGuitar.state.currentScale = this.currentScale;
        this._localGuitar.state.scaleNotes = scaleNotes;
        this._localGuitar.applyState();
    }

    updatePianoHighlights() {
        if (!this._localPiano || !this._localPiano.pianoElement) return;

        const scaleNotes = this.musicTheory.getScaleNotesWithKeySignature(this.currentKey, this.currentScale);
        const keys = this._localPiano.pianoElement.querySelectorAll('[data-note]');
        
        keys.forEach(key => {
            const noteName = key.getAttribute('data-note');
            const isWhiteKey = key.classList.contains('piano-white-key');
            
            // Clear existing highlights
            key.style.boxShadow = '';
            key.style.filter = '';
            
            // Remove existing labels
            const existingLabels = key.querySelectorAll('.scale-degree-label');
            existingLabels.forEach(label => label.remove());
            
            if (scaleNotes.includes(noteName)) {
                const degreeIndex = scaleNotes.indexOf(noteName);
                
                // Highlight
                if (isWhiteKey) {
                    key.style.boxShadow = '0 0 15px rgba(96, 165, 250, 0.8) inset, 0 4px 8px rgba(96, 165, 250, 0.3)';
                    key.style.filter = 'brightness(1.05)';
                } else {
                    key.style.boxShadow = '0 0 12px rgba(96, 165, 250, 0.9) inset';
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

    renderLesson() {
        const contentArea = document.getElementById('lesson-content');
        if (!contentArea) return;

        const lesson = this.lessons[this.currentLesson];
        if (!lesson) return;

        contentArea.innerHTML = lesson.render.call(this);
        
        // Setup lesson-specific event handlers
        if (lesson.setup) {
            lesson.setup.call(this);
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

    showCompletionMessage() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-panel);
            border: 2px solid var(--accent-secondary);
            border-radius: 8px;
            padding: 24px;
            z-index: 1000;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;
        overlay.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 12px;">🎉</div>
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 8px;">Lesson Complete!</div>
            <div style="color: var(--text-muted); margin-bottom: 16px;">Great job! Keep up the momentum.</div>
            <button id="continue-btn" style="padding: 8px 24px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">Continue</button>
        `;
        document.body.appendChild(overlay);
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (this.currentLesson < this.lessons.length - 1) {
                this.currentLesson++;
                this.render();
            }
        });
    }

    // Lesson definitions
    get lessons() {
        return [
            {
                title: "What is a Scale?",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 1: What is a Scale?</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>A <strong>scale</strong> is a collection of notes arranged in order from lowest to highest (or highest to lowest). In many musical traditions the directional pattern can differ — for example some ancient Greek practices and maqam traditions emphasize starting from a central tone and moving outwards (middle-up / middle-down) rather than strictly bottom-to-top or top-to-bottom. Scales are the foundation of melody and harmony in music.</p>
                            
                            <p><strong>Why learn scales?</strong></p>
                            <ul style="margin-left: 20px;">
                                <li>They help you understand how melodies are constructed</li>
                                <li>They show you which notes sound good together</li>
                                <li>They're the basis for chords and progressions</li>
                                <li>They improve your ear training and improvisation</li>
                                <li><strong>They help you, as a musician, know which notes to avoid and which options you have before you play.</strong></li>
                            </ul>

                            <div style="background: rgba(96, 165, 250, 0.1); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Key Concept:</strong> Think of a scale as a musical "alphabet" - just like letters make words, scale notes make melodies!
                            </div>

                            <div style="background: rgba(52, 211, 153, 0.1); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Try it:</strong> Use the key and scale selectors above, then click <strong>▶ Play Scale</strong> to hear and see the scale on your instrument!
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-1" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Lesson →
                            </button>
                        </div>
                    `;
                },
                setup: function() {
                    const completeBtn = document.getElementById('complete-lesson-1');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Whole Steps and Half Steps",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 2: Whole Steps and Half Steps</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Scales are built using two types of intervals: <strong>whole steps</strong> and <strong>half steps</strong>.</p>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                                <!-- Half Step Card -->
                                <div style="background: rgba(96, 165, 250, 0.15); padding: 16px; border-radius: 8px; border: 1px solid var(--accent-primary);">
                                    <div style="font-weight: 700; color: var(--accent-primary); margin-bottom: 8px; font-size: 1.1rem;">Half Step (H)</div>
                                    <p style="margin: 8px 0;">The smallest distance between two notes.</p>
                                    <p style="margin: 8px 0;"><strong>Example:</strong> C → C# or E → F</p>
                                    <p style="margin: 8px 0; font-size: 0.9rem;"><em>1 semitone = ${this.preferredInstrument === 'guitar' ? '1 fret' : '1 piano key'}</em></p>
                                    
                                    <!-- Visual: Piano or Guitar -->
                                    <div style="background: rgba(96, 165, 250, 0.1); padding: 10px; border-radius: 6px; margin: 12px 0;">
                                        ${this.preferredInstrument === 'guitar' ? `
                                            <svg width="100%" height="80" viewBox="0 0 120 80" style="display: block;">
                                                <!-- Guitar fretboard: 3 frets, 1 string -->
                                                <line x1="20" y1="25" x2="20" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="50" y1="25" x2="50" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="80" y1="25" x2="80" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="110" y1="25" x2="110" y2="55" stroke="#999" stroke-width="1.5"/>
                                                <line x1="20" y1="40" x2="110" y2="40" stroke="#ddd" stroke-width="2"/>
                                                
                                                <!-- Starting note (open string or fret) -->
                                                <circle cx="35" cy="40" r="8" fill="#60a5fa" stroke="#fff" stroke-width="2"/>
                                                <text x="35" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">C</text>
                                                
                                                <!-- Next fret (1 semitone) -->
                                                <circle cx="65" cy="40" r="8" fill="#60a5fa" stroke="#fff" stroke-width="2"/>
                                                <text x="65" y="44" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff">C#</text>
                                                
                                                <!-- Arrow -->
                                                <path d="M 43 40 L 57 40" stroke="#60a5fa" stroke-width="2" fill="none" marker-end="url(#arrow-h-guitar)"/>
                                                <defs>
                                                    <marker id="arrow-h-guitar" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                        <polygon points="0,0 6,3 0,6" fill="#60a5fa"/>
                                                    </marker>
                                                </defs>
                                                <text x="60" y="70" text-anchor="middle" font-size="11" fill="#60a5fa" font-weight="bold">1 fret</text>
                                            </svg>
                                        ` : `
                                            <svg width="100%" height="90" viewBox="0 0 100 90" style="display: block;">
                                                <!-- Piano keys: C, C#, D -->
                                                <rect x="10" y="10" width="25" height="55" fill="#ffffff" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="35" y="10" width="25" height="55" fill="#f5f5f5" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="60" y="10" width="25" height="55" fill="#f5f5f5" stroke="#333" stroke-width="1.5" rx="2"/>
                                                <rect x="28" y="10" width="16" height="35" fill="#1a1a1a" stroke="#000" stroke-width="1" rx="1"/>
                                                
                                                <text x="22.5" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="#000">C</text>
                                                <text x="36" y="35" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff">C#</text>
                                                
                                                <!-- Arrow -->
                                                <path d="M 22.5 65 Q 28 55, 36 45" stroke="#60a5fa" stroke-width="2" fill="none" marker-end="url(#arrow-h-piano)"/>
                                                <defs>
                                                    <marker id="arrow-h-piano" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                                                        <polygon points="0,0 6,3 0,6" fill="#60a5fa"/>
                                                    </marker>
                                                </defs>
                                                <text x="50" y="82" text-anchor="middle" font-size="11" fill="#60a5fa" font-weight="bold">1 semitone</text>
                                            </svg>
                                        `}
                                    </div>
                                    
                                    <button class="demo-btn" data-notes="60,61" data-interval="H" style="padding: 6px 16px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-top: 8px;">▶ Play H</button>
                                </div>
                                
                                <!-- Whole Step Card -->
                                <div style="background: rgba(52, 211, 153, 0.15); padding: 16px; border-radius: 8px; border: 1px solid var(--accent-secondary);">
                                    <div style="font-weight: 700; color: var(--accent-secondary); margin-bottom: 8px; font-size: 1.1rem;">Whole Step (W)</div>
                                    <p style="margin: 8px 0;">Two half steps combined.</p>
                                    <p style="margin: 8px 0;"><strong>Example:</strong> C → D or F → G</p>
                                    <p style="margin: 8px 0; font-size: 0.9rem;"><em>2 semitones = skip ${this.preferredInstrument === 'guitar' ? '1 fret' : '1 key'}</em></p>
                                    
                                    <!-- Visual: Piano or Guitar -->
                                    <div style="background: rgba(52, 211, 153, 0.1); padding: 10px; border-radius: 6px; margin: 12px 0;">
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
                                                <circle cx="22.5" cy="40" r="8" fill="#34d399" stroke="#fff" stroke-width="2"/>
                                                <text x="22.5" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#000">C</text>
                                                
                                                <!-- Skipped fret (faded) -->
                                                <circle cx="47.5" cy="40" r="6" fill="#666" opacity="0.4"/>
                                                <text x="47.5" y="43" text-anchor="middle" font-size="8" fill="#ccc">C#</text>
                                                
                                                <!-- Target note (2 frets away) -->
                                                <circle cx="72.5" cy="40" r="8" fill="#34d399" stroke="#fff" stroke-width="2"/>
                                                <text x="72.5" y="44" text-anchor="middle" font-size="10" font-weight="bold" fill="#000">D</text>
                                                
                                                <!-- Distance line -->
                                                <line x1="22.5" y1="58" x2="72.5" y2="58" stroke="#34d399" stroke-width="2" stroke-dasharray="2,2"/>
                                                <circle cx="22.5" cy="58" r="2" fill="#34d399"/>
                                                <circle cx="72.5" cy="58" r="2" fill="#34d399"/>
                                                <text x="60" y="73" text-anchor="middle" font-size="11" fill="#34d399" font-weight="bold">2 frets</text>
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
                                                <text x="36" y="35" text-anchor="middle" font-size="9" font-weight="bold" fill="#ccc">C#</text>
                                                
                                                <!-- Distance line -->
                                                <line x1="22.5" y1="70" x2="47.5" y2="70" stroke="#34d399" stroke-width="2" stroke-dasharray="2,2"/>
                                                <circle cx="22.5" cy="70" r="2" fill="#34d399"/>
                                                <circle cx="47.5" cy="70" r="2" fill="#34d399"/>
                                                <text x="50" y="85" text-anchor="middle" font-size="11" fill="#34d399" font-weight="bold">2 semitones</text>
                                            </svg>
                                        `}
                                    </div>
                                    
                                    <button class="demo-btn" data-notes="60,62" data-interval="W" style="padding: 6px 16px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-top: 8px;">▶ Play W</button>
                                </div>
                            </div>

                            <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
                                <div style="font-weight: 700; margin-bottom: 12px; text-align: center;">🎯 Major Scale Pattern</div>
                                <div id="wh-pattern-display" style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
                                    ${['W', 'W', 'H', 'W', 'W', 'W', 'H'].map((step, i) => `
                                        <div class="wh-step-btn" data-step="${i}" style="background: ${step === 'W' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(96, 165, 250, 0.3)'}; 
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
                                    <strong>Click a step</strong> to see & hear it on the keyboard below!
                                </div>
                            </div>

                            <div style="background: rgba(52, 211, 153, 0.1); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Try it:</strong> Use the piano below to find whole and half steps. Notice that E→F and B→C are natural half steps (no black key between them)!
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-2" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Lesson →
                            </button>
                        </div>
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

                    const completeBtn = document.getElementById('complete-lesson-2');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                        });
                    }
                }
            },
            {
                title: "Scale Degrees",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 3: Scale Degrees</h3>
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
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
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

                            <div style="background: rgba(96, 165, 250, 0.1); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Pro Tip:</strong> The 1st, 3rd, and 5th degrees are the most important - they form the basic triad chord of the scale!
                            </div>

                            <div style="background: rgba(96, 165, 250, 0.1); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Try it:</strong> Use the <strong>▶ Play Scale</strong> button above to hear all scale degrees in order!
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-3" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Lesson →
                            </button>
                        </div>
                    `;
                },
                setup: function() {
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
                title: "Build a Scale Quiz",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 4: Build a Scale Quiz</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Test your knowledge! Build a major scale by clicking the correct notes on the piano below.</p>
                            
                            <div id="quiz-instructions" style="background: rgba(96, 165, 250, 0.1); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px; margin: 20px 0;">
                                <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1rem;">📝 Quiz: Build a G Major Scale</div>
                                <p style="margin: 8px 0;">Click on the piano keys below to build a G major scale. Remember the pattern: <strong>W-W-H-W-W-W-H</strong></p>
                                <div style="margin-top: 12px;">
                                    <strong>Starting note:</strong> G<br>
                                    <strong>Your progress:</strong> <span id="quiz-progress">0/8 notes</span>
                                </div>
                            </div>

                            <div id="quiz-feedback" style="min-height: 40px; padding: 12px; border-radius: 6px; margin: 16px 0; display: none;"></div>

                            <div style="display: flex; gap: 12px; justify-content: center; margin: 20px 0;">
                                <button id="quiz-reset" class="btn" style="padding: 8px 20px; background: var(--bg-app); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 4px; cursor: pointer;">🔄 Reset</button>
                                <button id="quiz-check" class="btn" style="padding: 8px 20px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">✓ Check Answer</button>
                            </div>
                        </div>
                    `;
                },
                setup: function() {
                    // Quiz state
                    const correctAnswer = [67, 69, 71, 72, 74, 76, 78, 79]; // G major scale (2 octaves starting at G4)
                    const userAnswer = [];
                    
                    // Make piano interactive for quiz
                    if (this._localPiano && this._localPiano.pianoElement) {
                        const keys = this._localPiano.pianoElement.querySelectorAll('[data-midi]');
                        
                        const quizClickHandler = (e) => {
                            const key = e.currentTarget;
                            const midi = parseInt(key.getAttribute('data-midi'));
                            
                            // Toggle selection
                            if (userAnswer.includes(midi)) {
                                const idx = userAnswer.indexOf(midi);
                                userAnswer.splice(idx, 1);
                                key.style.background = '';
                                key.style.border = '';
                            } else {
                                userAnswer.push(midi);
                                key.style.background = 'rgba(96, 165, 250, 0.5)';
                                key.style.border = '2px solid var(--accent-primary)';
                            }
                            
                            // Update progress
                            document.getElementById('quiz-progress').textContent = `${userAnswer.length}/8 notes`;
                            
                            // Play note
                            this.playNote(midi, 0.2);
                        };
                        
                        keys.forEach(key => {
                            key.addEventListener('click', quizClickHandler);
                            key.style.cursor = 'pointer';
                        });
                    }
                    
                    // Reset button
                    document.getElementById('quiz-reset').addEventListener('click', () => {
                        userAnswer.length = 0;
                        document.getElementById('quiz-progress').textContent = '0/8 notes';
                        document.getElementById('quiz-feedback').style.display = 'none';
                        
                        if (this._localPiano && this._localPiano.pianoElement) {
                            const keys = this._localPiano.pianoElement.querySelectorAll('[data-midi]');
                            keys.forEach(key => {
                                key.style.background = '';
                                key.style.border = '';
                            });
                        }
                    });
                    
                    // Check button
                    document.getElementById('quiz-check').addEventListener('click', () => {
                        const feedback = document.getElementById('quiz-feedback');
                        feedback.style.display = 'block';
                        
                        const sortedUser = [...userAnswer].sort((a, b) => a - b);
                        const sortedCorrect = [...correctAnswer].sort((a, b) => a - b);
                        
                        const isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
                        
                        if (isCorrect) {
                            feedback.style.background = 'rgba(52, 211, 153, 0.2)';
                            feedback.style.border = '1px solid var(--accent-secondary)';
                            feedback.innerHTML = `
                                <div style="font-size: 1.5rem; margin-bottom: 8px;">🎉 Perfect!</div>
                                <div>You correctly built a G major scale. Great job!</div>
                                <button id="quiz-complete-btn" style="margin-top: 12px; padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                    Complete Lesson →
                                </button>
                            `;
                            
                            // Play the scale
                            setTimeout(() => {
                                this.playScale(67, [0, 2, 4, 5, 7, 9, 11], 0.3, 0.35);
                            }, 500);
                            
                            document.getElementById('quiz-complete-btn').addEventListener('click', () => {
                                this.markLessonComplete();
                            });
                        } else {
                            feedback.style.background = 'rgba(239, 68, 68, 0.2)';
                            feedback.style.border = '1px solid #ef4444';
                            feedback.innerHTML = `
                                <div style="font-size: 1.2rem; margin-bottom: 8px;">Not quite right...</div>
                                <div>Remember the major scale pattern: W-W-H-W-W-W-H</div>
                                <div style="margin-top: 8px;">Try again!</div>
                            `;
                        }
                    });
                }
            },
            {
                title: "Minor Scales",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 5: Minor Scales</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Minor scales have a darker, more melancholic sound compared to major scales. There are three types of minor scales:</p>
                            
                            <div style="display: grid; grid-template-columns: 1fr; gap: 16px; margin: 20px 0;">
                                <!-- Natural Minor -->
                                <div class="minor-scale-card" data-scale="aeolian" data-steps="2,1,2,2,1,2,2" style="background: rgba(139, 92, 246, 0.1); border: 1px solid #8b5cf6; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s ease;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: #8b5cf6; font-size: 1.1rem;">Natural Minor (Aeolian)</div>
                                        <button class="minor-demo" data-scale="aeolian" data-steps="2,1,2,2,1,2,2" style="padding: 6px 16px; background: #8b5cf6; color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">▶ Play & Show</button>
                                    </div>
                                    <div class="wh-pattern-row" style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                                        ${['W', 'H', 'W', 'W', 'H', 'W', 'W'].map((step, i) => `
                                            <div class="wh-step-minor" data-idx="${i}" style="background: rgba(139, 92, 246, 0.2); border: 1px solid #8b5cf6; padding: 6px 12px; border-radius: 3px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">${step}</div>
                                        `).join('')}
                                    </div>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">The most natural minor scale - the 6th mode of the major scale.</p>
                                </div>

                                <!-- Harmonic Minor -->
                                <div class="minor-scale-card" data-scale="harmonic" data-steps="2,1,2,2,1,3,1" style="background: rgba(236, 72, 153, 0.1); border: 1px solid #ec4899; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s ease;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: #ec4899; font-size: 1.1rem;">Harmonic Minor</div>
                                        <button class="minor-demo" data-scale="harmonic" data-steps="2,1,2,2,1,3,1" style="padding: 6px 16px; background: #ec4899; color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">▶ Play & Show</button>
                                    </div>
                                    <div class="wh-pattern-row" style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                                        ${['W', 'H', 'W', 'W', 'H', 'W+H', 'H'].map((step, i) => `
                                            <div class="wh-step-minor" data-idx="${i}" style="background: rgba(236, 72, 153, 0.2); border: 1px solid #ec4899; padding: 6px 12px; border-radius: 3px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">${step}</div>
                                        `).join('')}
                                    </div>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">Raises the 7th degree - creates exotic, Middle Eastern sound. Strong leading tone.</p>
                                </div>

                                <!-- Melodic Minor -->
                                <div class="minor-scale-card" data-scale="melodic" data-steps="2,1,2,2,2,2,1" style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s ease;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: #3b82f6; font-size: 1.1rem;">Melodic Minor</div>
                                        <button class="minor-demo" data-scale="melodic" data-steps="2,1,2,2,2,2,1" style="padding: 6px 16px; background: #3b82f6; color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">▶ Play & Show</button>
                                    </div>
                                    <div class="wh-pattern-row" style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                                        ${['W', 'H', 'W', 'W', 'W', 'W', 'H'].map((step, i) => `
                                            <div class="wh-step-minor" data-idx="${i}" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; padding: 6px 12px; border-radius: 3px; font-weight: bold; font-size: 0.85rem; cursor: pointer;">${step}</div>
                                        `).join('')}
                                    </div>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">Raises both 6th and 7th degrees - smoother melodic movement. Used heavily in jazz.</p>
                                </div>
                            </div>

                            <div style="text-align: center; margin: 20px 0;">
                                <button id="compare-minor-scales-btn" style="padding: 10px 24px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 0.95rem;">
                                    🎹 Compare All Three on Piano
                                </button>
                            </div>

                            <div style="background: rgba(52, 211, 153, 0.1); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Listen carefully:</strong> Click each scale's pattern or the play button to hear AND see the W/H steps on the keyboard. Notice how the raised 6th and 7th degrees change the sound!
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-5" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Lesson →
                            </button>
                        </div>
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
                        harmonic: [2, 1, 2, 2, 1, 3, 1],
                        melodic: [2, 1, 2, 2, 2, 2, 1]
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
                            const scaleOrder = ['aeolian', 'harmonic', 'melodic'];
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
                title: "Modes Explained",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 6: Introduction to Modes</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p><strong>Modes</strong> are scales built by starting on different degrees of the major scale. Each mode has a unique sound and character.</p>
                            
                            <div style="background: rgba(96, 165, 250, 0.1); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Example:</strong> If you play C-D-E-F-G-A-B-C, that's C Major (Ionian). But if you play D-E-F-G-A-B-C-D (same notes, different starting point), that's D Dorian!
                            </div>

                            <div style="margin: 24px 0;">
                                <table style="width: 100%; border-collapse: collapse; background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
                                    <thead>
                                        <tr style="background: rgba(96, 165, 250, 0.1);">
                                            <th style="padding: 12px; text-align: left; color: var(--accent-primary);">Mode</th>
                                            <th style="padding: 12px; text-align: left; color: var(--accent-primary);">Starting Degree</th>
                                            <th style="padding: 12px; text-align: left; color: var(--accent-primary);">Character</th>
                                            <th style="padding: 12px; text-align: center; color: var(--accent-primary);">Play</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${[
                                            {name: 'Ionian', deg: '1', char: 'Bright, happy (major scale)', scale: 'major'},
                                            {name: 'Dorian', deg: '2', char: 'Minor with brightness', scale: 'dorian'},
                                            {name: 'Phrygian', deg: '3', char: 'Dark, Spanish flavor', scale: 'phrygian'},
                                            {name: 'Lydian', deg: '4', char: 'Dreamy, ethereal', scale: 'lydian'},
                                            {name: 'Mixolydian', deg: '5', char: 'Bluesy, rock-oriented', scale: 'mixolydian'},
                                            {name: 'Aeolian', deg: '6', char: 'Natural minor, melancholic', scale: 'aeolian'},
                                            {name: 'Locrian', deg: '7', char: 'Unstable, diminished', scale: 'locrian'}
                                        ].map(mode => `
                                            <tr style="border-top: 1px solid var(--border-light);">
                                                <td style="padding: 12px; font-weight: 700; color: var(--text-highlight);">${mode.name}</td>
                                                <td style="padding: 12px; font-family: var(--font-tech);">${mode.deg}</td>
                                                <td style="padding: 12px; font-size: 0.9rem;">${mode.char}</td>
                                                <td style="padding: 12px; text-align: center;">
                                                    <button class="mode-play-btn" data-scale="${mode.scale}" style="padding: 4px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">▶</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
                                <div style="font-weight: 700; margin-bottom: 12px; text-align: center;">🎼 Practice Tip</div>
                                <p style="margin: 8px 0; text-align: center;">Try improvising melodies using different modes. Notice how each one creates a different emotional atmosphere!</p>
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-6" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Lesson →
                            </button>
                        </div>
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

                    const showModeOnPiano = (steps) => {
                        const rootMidi = getRootMidi();
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

                    document.querySelectorAll('.mode-play-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const scale = btn.dataset.scale;
                            const rootMidi = getRootMidi();
                            const intervals = this.musicTheory.scales[scale];
                            const steps = modeSteps[scale] || [];
                            showModeOnPiano(steps);
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
                title: "Chords from Scales",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 7: Building Chords from Scales</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Every scale contains chords built on each of its degrees. This is how we create chord progressions!</p>
                            
                            <div style="background: rgba(96, 165, 250, 0.1); border-left: 3px solid var(--accent-primary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>The Rule:</strong> To build a chord from a scale degree, take that note, skip one, take one, skip one, take one. This creates a triad (3-note chord).
                            </div>

                            <div style="margin: 24px 0;">
                                <div style="font-weight: 700; margin-bottom: 16px; text-align: center; font-size: 1.1rem;">Chords in C Major Scale</div>
                                <table style="width: 100%; border-collapse: collapse; background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 8px; overflow: hidden;">
                                    <thead>
                                        <tr style="background: rgba(96, 165, 250, 0.1);">
                                            <th style="padding: 10px; text-align: center; color: var(--accent-primary);">Degree</th>
                                            <th style="padding: 10px; text-align: left; color: var(--accent-primary);">Chord</th>
                                            <th style="padding: 10px; text-align: left; color: var(--accent-primary);">Quality</th>
                                            <th style="padding: 10px; text-align: left; color: var(--accent-primary);">Notes</th>
                                            <th style="padding: 10px; text-align: center; color: var(--accent-primary);">Play</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${[
                                            {deg: 'I', chord: 'C', quality: 'Major', notes: 'C-E-G', midis: [60,64,67]},
                                            {deg: 'ii', chord: 'Dm', quality: 'Minor', notes: 'D-F-A', midis: [62,65,69]},
                                            {deg: 'iii', chord: 'Em', quality: 'Minor', notes: 'E-G-B', midis: [64,67,71]},
                                            {deg: 'IV', chord: 'F', quality: 'Major', notes: 'F-A-C', midis: [65,69,72]},
                                            {deg: 'V', chord: 'G', quality: 'Major', notes: 'G-B-D', midis: [67,71,74]},
                                            {deg: 'vi', chord: 'Am', quality: 'Minor', notes: 'A-C-E', midis: [69,72,76]},
                                            {deg: 'vii°', chord: 'Bdim', quality: 'Diminished', notes: 'B-D-F', midis: [71,74,77]}
                                        ].map(row => `
                                            <tr style="border-top: 1px solid var(--border-light);">
                                                <td style="padding: 10px; text-align: center; font-weight: 700; font-size: 1.1rem; color: var(--text-highlight);">${row.deg}</td>
                                                <td style="padding: 10px; font-weight: 700; color: var(--accent-secondary);">${row.chord}</td>
                                                <td style="padding: 10px;">${row.quality}</td>
                                                <td style="padding: 10px; font-family: var(--font-tech); font-size: 0.9rem;">${row.notes}</td>
                                                <td style="padding: 10px; text-align: center;">
                                                    <button class="chord-play-btn" data-midis="${row.midis.join(',')}" style="padding: 4px 12px; background: var(--accent-primary); color: #000; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8rem;">▶</button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>

                            <div style="background: rgba(52, 211, 153, 0.1); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Did you notice?</strong> The pattern is Major-minor-minor-Major-Major-minor-diminished. This pattern is the same for any major scale!
                            </div>

                            <div style="text-align: center; margin: 24px 0;">
                                <button id="play-progression" style="padding: 12px 32px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; font-weight: 700;">
                                    🎵 Play I-IV-V-I Progression
                                </button>
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-7" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Lesson →
                            </button>
                        </div>
                    `;
                },
                setup: function() {
                    const self = this;
                    
                    // Highlight chord notes on current instrument when playing
                    const highlightChordNotes = (midis) => {
                        this.clearIntervalAnnotations();
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
                title: "Pentatonic Scales",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 8: Pentatonic Scales</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p><strong>Pentatonic scales</strong> have only 5 notes instead of 7. They're easier to improvise with and sound great in almost any context!</p>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0;">
                                <div style="background: rgba(96, 165, 250, 0.1); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: var(--accent-primary); font-size: 1.1rem;">Major Pentatonic</div>
                                        <button class="pent-demo" data-scale="major_pentatonic" style="padding: 6px 14px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">▶ Play</button>
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>Formula:</strong> 1-2-3-5-6
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>In C:</strong> C-D-E-G-A
                                    </div>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">Bright, happy sound. Used in rock, pop, and country music.</p>
                                </div>

                                <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid #8b5cf6; border-radius: 8px; padding: 16px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                        <div style="font-weight: 700; color: #8b5cf6; font-size: 1.1rem;">Minor Pentatonic</div>
                                        <button class="pent-demo" data-scale="minor_pentatonic" style="padding: 6px 14px; background: #8b5cf6; color: #000; border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">▶ Play</button>
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>Formula:</strong> 1-♭3-4-5-♭7
                                    </div>
                                    <div style="margin: 12px 0;">
                                        <strong>In A:</strong> A-C-D-E-G
                                    </div>
                                    <p style="margin: 8px 0; font-size: 0.9rem;">Blues, rock, and metal favorite. Can't hit a "wrong" note!</p>
                                </div>
                            </div>

                            <div style="background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 8px; margin: 24px 0;">
                                <div style="font-weight: 700; margin-bottom: 16px; text-align: center; font-size: 1.1rem;">🎸 Why Pentatonics Are Great for Beginners</div>
                                <ul style="margin: 8px 0; padding-left: 24px; line-height: 1.8;">
                                    <li>Only 5 notes to remember (vs 7 in major/minor)</li>
                                    <li>Almost impossible to play a "bad" note</li>
                                    <li>Works over multiple chords</li>
                                    <li>Foundation of blues and rock guitar</li>
                                    <li>Great for developing improvisation skills</li>
                                </ul>
                            </div>

                            <div style="background: rgba(52, 211, 153, 0.1); border-left: 3px solid var(--accent-secondary); padding: 12px; margin: 16px 0; border-radius: 4px;">
                                <strong>Try this:</strong> Use the piano below to play the C major pentatonic scale (C-D-E-G-A). Try making up melodies using only these notes - they'll all sound good together!
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-8" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Lesson →
                            </button>
                        </div>
                    `;
                },
                setup: function() {
                    document.querySelectorAll('.pent-demo').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const scale = btn.dataset.scale;
                            const rootMidi = scale === 'minor_pentatonic' ? 69 : 60; // A for minor, C for major
                            const intervals = this.musicTheory.scales[scale];
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
                title: "Practice & Next Steps",
                render: function() {
                    return `
                        <h3 style="color: var(--text-highlight); margin-top: 0;">Lesson 9: Practice & Next Steps</h3>
                        <div style="color: var(--text-muted); line-height: 1.8; margin-bottom: 20px;">
                            <p>Congratulations on completing the scale lessons! Here's how to continue your journey:</p>
                            
                            <div style="background: linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(52, 211, 153, 0.1)); border: 1px solid var(--border-light); border-radius: 12px; padding: 24px; margin: 24px 0;">
                                <div style="font-weight: 700; font-size: 1.2rem; margin-bottom: 20px; text-align: center;">🎯 Your Learning Path</div>
                                
                                <div style="display: grid; gap: 16px;">
                                    ${[
                                        {
                                            icon: '🎹',
                                            title: 'Daily Scale Practice',
                                            desc: 'Practice each scale in all 12 keys. Start with major, then minor, then modes.',
                                            time: '10-15 min/day'
                                        },
                                        {
                                            icon: '👂',
                                            title: 'Ear Training',
                                            desc: 'Listen to songs and try to identify which scale they use. Start with simple melodies.',
                                            time: '5-10 min/day'
                                        },
                                        {
                                            icon: '🎼',
                                            title: 'Chord Construction',
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

                            <div style="background: rgba(96, 165, 250, 0.1); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 20px; margin: 24px 0;">
                                <div style="font-weight: 700; margin-bottom: 12px; font-size: 1.1rem;">📚 Recommended Next Modules</div>
                                <ul style="margin: 0; padding-left: 24px; line-height: 1.8;">
                                    <li><strong>Learn Inversions:</strong> Understand how to rearrange chord notes</li>
                                    <li><strong>Chord Explorer:</strong> Deep dive into chord types and voicings</li>
                                    <li><strong>Progression Builder:</strong> Create and analyze chord progressions</li>
                                    <li><strong>Scale Relationships:</strong> Advanced scale and mode connections</li>
                                </ul>
                            </div>

                            <div style="background: rgba(52, 211, 153, 0.1); border-left: 3px solid var(--accent-secondary); padding: 16px; margin: 20px 0; border-radius: 4px;">
                                <div style="font-weight: 700; margin-bottom: 8px; font-size: 1.1rem;">🌟 Keep Practicing!</div>
                                <p style="margin: 0;">Remember: consistency beats intensity. Even 15 minutes of focused daily practice will yield better results than occasional long sessions. Use the piano below to review any scales whenever you need a refresher!</p>
                            </div>

                            <div style="text-align: center; margin: 24px 0;">
                                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 12px;">
                                    You've completed <strong>${this.progress.completedLessons.size}</strong> out of <strong>${this.lessons.length}</strong> lessons!
                                </div>
                                <div style="background: rgba(255,255,255,0.1); border-radius: 999px; height: 12px; overflow: hidden; margin-bottom: 16px;">
                                    <div style="background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); height: 100%; width: ${(this.progress.completedLessons.size / this.lessons.length) * 100}%; transition: width 0.3s;"></div>
                                </div>
                            </div>
                        </div>

                        <div style="text-align: right; margin-top: 24px;">
                            <button id="complete-lesson-9" class="btn" style="padding: 8px 24px; background: var(--accent-secondary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700;">
                                Complete Course! 🎉
                            </button>
                        </div>
                    `;
                },
                setup: function() {
                    const completeBtn = document.getElementById('complete-lesson-9');
                    if (completeBtn) {
                        completeBtn.addEventListener('click', () => {
                            this.markLessonComplete();
                            
                            // Show final celebration
                            const overlay = document.createElement('div');
                            overlay.style.cssText = `
                                position: fixed;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                background: var(--bg-panel);
                                border: 2px solid var(--accent-secondary);
                                border-radius: 12px;
                                padding: 32px;
                                z-index: 1000;
                                text-align: center;
                                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                                max-width: 400px;
                            `;
                            overlay.innerHTML = `
                                <div style="font-size: 4rem; margin-bottom: 16px;">🎊</div>
                                <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-highlight); margin-bottom: 12px;">Course Complete!</div>
                                <div style="color: var(--text-muted); margin-bottom: 24px; line-height: 1.6;">
                                    You've mastered the fundamentals of scales! Keep practicing and exploring the other modules to continue your musical journey.
                                </div>
                                <button id="final-continue-btn" style="padding: 10px 32px; background: var(--accent-primary); color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 1rem;">
                                    Return to Home
                                </button>
                            `;
                            document.body.appendChild(overlay);
                            
                            document.getElementById('final-continue-btn').addEventListener('click', () => {
                                document.body.removeChild(overlay);
                                const landingPage = document.getElementById('landing-page');
                                const learnPage = document.getElementById('learn-scales-page');
                                if (landingPage && learnPage) {
                                    landingPage.style.display = 'block';
                                    learnPage.style.display = 'none';
                                }
                            });
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
        if (this._localPiano && typeof this._localPiano.midiNoteOn === 'function') {
            this._localPiano.midiNoteOn(midi);
        }
    }

    midiNoteOff(midi) {
        if (typeof midi !== 'number') return;
        this._midiActiveKeys.delete(midi);
        if (this._localPiano && typeof this._localPiano.midiNoteOff === 'function') {
            this._localPiano.midiNoteOff(midi);
        }
    }
}

// Export for use in modular app
if (typeof window !== 'undefined') {
    window.LearnScales = LearnScales;
}
