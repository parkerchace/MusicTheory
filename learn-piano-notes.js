/**
 * LearnPianoNotes - Simple C Major Scale Tutorial
 * Shows piano keys, sheet music, and connecting "tines" (like Rhodes piano)
 */
class LearnPianoNotes {
    constructor(musicTheoryEngine, pianoVisualizer, sheetMusicGenerator) {
        this.musicTheory = musicTheoryEngine;
        this.container = null;
        this.connectorOverlay = null;
        this._localPiano = null;
        this._connectorEventsBound = false;
        this._audioEngine = null; // Use shared audio engine
        this._midiActiveKeys = new Set();
        this._isDragging = false;
        this._lastPlayedKey = null;
    }

    mount(selector) {
        this.container = document.querySelector(selector);
        if (!this.container) {
            console.error('[LearnPianoNotes] Container not found:', selector);
            return;
        }
        this.initAudio();
        this.render();
    }

    initAudio() {
        // Use global audio engine if available
        if (window.modularApp && window.modularApp.audioEngine) {
            this._audioEngine = window.modularApp.audioEngine;
            if (typeof this._audioEngine.init === 'function') {
                this._audioEngine.init();
            }
        }
    }

    playNote(midi, duration = 0.3) {
        if (this._audioEngine && typeof this._audioEngine.playNote === 'function') {
            this._audioEngine.playNote(midi, duration);
        }
    }

    // MIDI-driven key lighting for this module's octave
    midiNoteOn(midi) {
        if (typeof midi !== 'number') return;
        this._midiActiveKeys.add(midi);
        this.applyMidiHighlights();
    }

    midiNoteOff(midi) {
        if (typeof midi !== 'number') return;
        this._midiActiveKeys.delete(midi);
        this.applyMidiHighlights();
    }

    applyMidiHighlights() {
        const pianoEl = this._localPiano?.pianoElement;
        if (!pianoEl) return;
        const keys = pianoEl.querySelectorAll('[data-midi]');
        keys.forEach(key => {
            const midi = parseInt(key.getAttribute('data-midi'), 10);
            if (!key.dataset.origBoxShadow) {
                key.dataset.origBoxShadow = key.style.boxShadow || '';
            }
            if (this._midiActiveKeys.has(midi)) {
                const base = key.dataset.origBoxShadow;
                key.style.boxShadow = `${base ? base + ', ' : ''}0 0 10px rgba(34, 197, 94, 0.9)`;
                key.style.transform = 'translateY(-1px)';
            } else {
                key.style.boxShadow = key.dataset.origBoxShadow;
                key.style.transform = '';
            }
        });
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div id="learn-module-wrapper" style="position: relative; display: flex; flex-direction: column; gap: 16px; padding: 16px; max-width: 800px; margin: 0 auto;">
                
                <!-- Top Navigation Bar -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <button id="learn-return-to-landing" style="display: flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--border-light); padding: 8px 14px; cursor: pointer; color: var(--text-main); font-family: var(--font-tech); transition: all 0.2s ease; border-radius: 4px; font-size: 0.9rem;">
                        <span style="font-size: 1.2rem;">←</span>
                        <span>Home</span>
                    </button>
                    <button id="learn-theme-toggle" style="background: transparent; border: 1px solid var(--border-light); padding: 8px 14px; cursor: pointer; color: var(--text-main); font-family: var(--font-tech); transition: all 0.2s ease; border-radius: 4px; font-size: 1.1rem;">
                        🌓
                    </button>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 12px;">
                    <h2 style="color: var(--text-main); margin: 0 0 12px 0; font-size: clamp(1.2rem, 3vw, 1.8rem);">
                        Learn C Major Scale
                    </h2>
                    <p style="color: var(--text-muted); margin: 0; font-size: clamp(0.85rem, 2vw, 1rem); line-height: 1.6;">
                        The note names for the white keys repeat across the keyboard: <strong>C–D–E–F–G–A–B</strong>, then back to <strong>C</strong> in the next octave.
                    </p>
                </div>

                <!-- Whole Steps vs Half Steps Explanation (Foundation) -->
                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-light); border-radius: 8px; padding: 16px;">
                    <div style="color: var(--text-main); font-weight:700; font-size: 0.95rem; margin-bottom: 16px; text-align: center;">
                        What Are Whole Steps (W) and Half Steps (H)?
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start;">
                        <!-- Half Step Example -->
                        <div style="text-align: center;">
                            <div style="color: var(--accent-primary); font-size: 0.85rem; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                                ⬇ Half Step (H) ⬇
                            </div>
                            <div style="background: rgba(96, 165, 250, 0.15); padding: 12px; border-radius: 6px;">
                                <svg width="100%" height="150" viewBox="0 0 140 150" style="display: block; margin: 0 auto;">
                                    <!-- White keys background -->
                                    <g id="white-keys">
                                        <rect x="10" y="15" width="40" height="95" fill="#ffffff" stroke="#333" stroke-width="2" rx="2"/>
                                        <rect x="50" y="15" width="40" height="95" fill="#f5f5f5" stroke="#333" stroke-width="2" rx="2"/>
                                        <rect x="90" y="15" width="40" height="95" fill="#f5f5f5" stroke="#333" stroke-width="2" rx="2"/>
                                    </g>
                                    
                                    <!-- Black keys on top -->
                                    <g id="black-keys">
                                        <rect x="42" y="15" width="24" height="60" fill="#1a1a1a" stroke="#000" stroke-width="1.5" rx="1.5"/>
                                        <rect x="82" y="15" width="24" height="60" fill="#3a3a3a" stroke="#000" stroke-width="1.5" rx="1.5" opacity="0.5"/>
                                    </g>
                                    
                                    <!-- Labels inside keys -->
                                    <text x="30" y="90" text-anchor="middle" font-family="var(--font-tech)" font-size="16" font-weight="bold" fill="#000">C</text>
                                    <text x="54" y="55" text-anchor="middle" font-family="var(--font-tech)" font-size="12" font-weight="bold" fill="#fff">C#</text>
                                    
                                    <!-- Highlight arrow from C to C# -->
                                    <path d="M 30 100 Q 42 85, 54 70" stroke="#60a5fa" stroke-width="2.5" fill="none" marker-end="url(#arrow-h)"/>
                                    <defs>
                                        <marker id="arrow-h" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                                            <polygon points="0,0 8,4 0,8" fill="#60a5fa"/>
                                        </marker>
                                    </defs>
                                    <text x="70" y="140" text-anchor="middle" font-family="var(--font-tech)" font-size="13" fill="#60a5fa" font-weight="bold">1 semitone</text>
                                </svg>
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 10px; line-height: 1.6; background: rgba(96, 165, 250, 0.1); padding: 10px; border-radius: 4px;">
                                <strong>Move to the next adjacent key.</strong> There are <strong>no keys between</strong> C and C#.
                            </div>
                        </div>

                        <!-- Whole Step Example -->
                        <div style="text-align: center;">
                            <div style="color: var(--accent-secondary); font-size: 0.85rem; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">
                                ⬇ Whole Step (W) ⬇
                            </div>
                            <div style="background: rgba(52, 211, 153, 0.15); padding: 12px; border-radius: 6px;">
                                <svg width="100%" height="150" viewBox="0 0 140 150" style="display: block; margin: 0 auto;">
                                    <!-- White keys: C, D, E -->
                                    <g id="white-keys">
                                        <rect x="10" y="15" width="40" height="95" fill="#ffffff" stroke="#333" stroke-width="2" rx="2"/>
                                        <rect x="50" y="15" width="40" height="95" fill="#ffffff" stroke="#333" stroke-width="2" rx="2"/>
                                        <rect x="90" y="15" width="40" height="95" fill="#f5f5f5" stroke="#333" stroke-width="2" rx="2"/>
                                    </g>
                                    
                                    <!-- Black keys: C# (faded), D# -->
                                    <g id="black-keys">
                                        <!-- C# - faded to show it's skipped -->
                                        <rect x="42" y="15" width="24" height="60" fill="#666" stroke="#444" stroke-width="1.5" rx="1.5" opacity="0.5"/>
                                        <!-- D# for context -->
                                        <rect x="82" y="15" width="24" height="60" fill="#3a3a3a" stroke="#000" stroke-width="1.5" rx="1.5" opacity="0.5"/>
                                    </g>
                                    
                                    <!-- Labels inside keys -->
                                    <text x="30" y="90" text-anchor="middle" font-family="var(--font-tech)" font-size="16" font-weight="bold" fill="#000">C</text>
                                    <text x="70" y="90" text-anchor="middle" font-family="var(--font-tech)" font-size="16" font-weight="bold" fill="#000">D</text>
                                    <text x="110" y="90" text-anchor="middle" font-family="var(--font-tech)" font-size="14" font-weight="bold" fill="#666">E</text>
                                    <text x="54" y="50" text-anchor="middle" font-family="var(--font-tech)" font-size="11" font-weight="bold" fill="#ccc">C#</text>
                                    
                                    <!-- Distance line from C to D -->
                                    <line x1="30" y1="120" x2="70" y2="120" stroke="#34d399" stroke-width="3" stroke-dasharray="2,2"/>
                                    <circle cx="30" cy="120" r="3" fill="#34d399"/>
                                    <circle cx="70" cy="120" r="3" fill="#34d399"/>
                                    <text x="70" y="140" text-anchor="middle" font-family="var(--font-tech)" font-size="13" fill="#34d399" font-weight="bold">2 semitones</text>
                                </svg>
                            </div>
                            <div style="color: var(--text-muted); font-size: 0.8rem; margin-top: 10px; line-height: 1.6; background: rgba(52, 211, 153, 0.1); padding: 10px; border-radius: 4px;">
                                <strong>Skip one key and land on the next.</strong> C# is between them but we skip it.
                            </div>
                        </div>
                    </div>

                    <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="color: var(--text-muted); font-size: 0.8rem; text-align: center; margin-bottom: 10px;">
                            <strong>📊 C Major Scale Pattern:</strong>
                        </div>
                        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap;">
                            ${['W', 'W', 'H', 'W', 'W', 'W', 'H'].map((step, i) => `
                                <div style="background: ${step === 'W' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(96, 165, 250, 0.3)'}; border: 1px solid ${step === 'W' ? 'var(--accent-secondary)' : 'var(--accent-primary)'}; padding: 6px 12px; border-radius: 3px; font-family: var(--font-tech); font-weight: bold; color: ${step === 'W' ? 'var(--accent-secondary)' : 'var(--accent-primary)'}; font-size: 0.85rem;">
                                    ${step}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Visual Guide Legend -->
                <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin: 16px 0 12px 0; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
                        <div style="width: 20px; height: 20px; background: linear-gradient(180deg, rgba(96, 165, 250, 0.8), rgba(96, 165, 250, 0.4)); border-radius: 2px; box-shadow: 0 0 10px rgba(96, 165, 250, 0.6);"></div>
                        <span style="color: var(--text-muted);">C Major Notes</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
                        <div style="width: 16px; height: 16px; background: var(--accent-primary); border-radius: 50%; font-weight: bold; display: flex; align-items: center; justify-content: center; color: #000; font-size: 10px;">1</div>
                        <span style="color: var(--text-muted);">Scale Degree</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; cursor: help;">
                        <span style="color: var(--accent-primary); font-weight: bold;">Hover</span>
                        <span style="color: var(--text-muted);">for note info</span>
                    </div>
                </div>

                <!-- Piano Keyboard -->
                <div style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; position: relative;">
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🎹 Piano Keyboard (C Major Scale)
                    </div>
                    <div id="piano-learn-container" style="
                        overflow-x: auto; 
                        overflow-y: visible;
                        display: flex; 
                        justify-content: center;
                        min-height: 160px;
                    "></div>
                </div>

                <!-- Sheet Music -->
                <div style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; position: relative;">
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🎼 Sheet Music Notation
                    </div>
                    <div id="sheet-music-learn-container" style="
                        background: white; 
                        border-radius: 6px; 
                        padding: 20px;
                        overflow-x: auto;
                    "></div>
                </div>
            </div>
        `;

        // Render components
        if (typeof this.renderInstrument === 'function') { this.renderInstrument(); } else { this.renderPiano(); }
        this.renderSheetMusic();
        
        // Setup connector overlay
        this.setupConnectorOverlay();
        this.setupConnectorRedrawEvents();
        
        // Setup navigation buttons
        this.setupNavigationButtons();
        
        // Draw connectors with delays to ensure elements are ready
        setTimeout(() => this.drawConnectorLines(), 800);
        setTimeout(() => this.drawConnectorLines(), 2000);
    }

    setupNavigationButtons() {
        // Home button - return to landing page
        const homeBtn = document.getElementById('learn-return-to-landing');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                const landingPage = document.getElementById('landing-page');
                const learnPage = document.getElementById('learn-piano-page');
                if (landingPage && learnPage) {
                    landingPage.style.display = 'block';
                    learnPage.style.display = 'none';
                }
            });
            
            // Hover effects
            homeBtn.addEventListener('mouseenter', () => {
                homeBtn.style.background = 'var(--accent-primary)';
                homeBtn.style.color = '#000';
            });
            homeBtn.addEventListener('mouseleave', () => {
                homeBtn.style.background = 'transparent';
                homeBtn.style.color = 'var(--text-main)';
            });
        }

        // Theme toggle button
        const themeBtn = document.getElementById('learn-theme-toggle');
        if (themeBtn) {
            const themeNames = ['clean-daw', 'channel-strip', 'matrix-fx', 'steam-2000'];
            
            themeBtn.addEventListener('click', () => {
                const currentTheme = document.body.getAttribute('data-theme') || 'clean-daw';
                const currentIndex = themeNames.indexOf(currentTheme);
                const nextIndex = (currentIndex + 1) % themeNames.length;
                const newTheme = themeNames[nextIndex];
                
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('music-theory-theme', newTheme);
                console.log('Theme switched to:', newTheme);
            });
            
            // Hover effects
            themeBtn.addEventListener('mouseenter', () => {
                themeBtn.style.background = 'var(--accent-secondary)';
                themeBtn.style.color = '#000';
            });
            themeBtn.addEventListener('mouseleave', () => {
                themeBtn.style.background = 'transparent';
                themeBtn.style.color = 'var(--text-main)';
            });
        }
    }

    renderPiano() {
        const pianoContainer = this.container.querySelector('#piano-learn-container');
        if (!pianoContainer) return;

        // Responsive sizing: fit to container width, clamp between mobile and desktop
        pianoContainer.style.position = 'relative';
        pianoContainer.style.width = '100%';
        pianoContainer.style.minHeight = 'auto';
        pianoContainer.style.display = 'flex';
        pianoContainer.style.justifyContent = 'center';
        pianoContainer.style.alignItems = 'center';

        // Calculate responsive key size based on container width
        // For 1 octave (7 white keys), use ~14% per key, leaving margins
        const containerWidth = pianoContainer.clientWidth || window.innerWidth - 40;
        const keyWidth = Math.max(30, Math.min(80, containerWidth / 8));
        const keyHeight = keyWidth * 2.8; // Aspect ratio for keys
        const blackKeyHeight = keyHeight * 0.65;

        // Create dedicated piano visualizer for 1 octave: C4 to B4
        if (!this._localPiano) {
            const PianoVizClass = window.PianoVisualizer || PianoVisualizer;
            this._localPiano = new PianoVizClass({
                startMidi: 60, // C4
                endMidi: 71,   // B4 (one octave)
                container: pianoContainer,
                // Disable built-in pointer glissando; use tutorial module's own audio drag logic
                enablePointerGlissando: false
            });
        }

        pianoContainer.innerHTML = '';
        
        this._localPiano.render({
            container: pianoContainer,
            startMidi: 60,  // C4
            endMidi: 71,    // B4 (12 notes: C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
            whiteKeyWidth: keyWidth,
            whiteKeyHeight: keyHeight,
            blackKeyHeight: blackKeyHeight,
            showFingering: false,
            showRomanNumerals: false,
            showGradingTooltips: false,
            enableGradingIntegration: false,
            fitToContainer: true,
            interactive: true,
            enablePointerGlissando: false
        });
        
        // Ensure piano element is in container
        if (this._localPiano.pianoElement && !pianoContainer.contains(this._localPiano.pianoElement)) {
            pianoContainer.appendChild(this._localPiano.pianoElement);
        }

        // Highlight C Major scale notes with distinct visual treatment
        if (this._localPiano.pianoElement) {
            const cMajorNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            const keys = this._localPiano.pianoElement.querySelectorAll('[data-note]');
            keys.forEach((key, idx) => {
                const noteName = key.getAttribute('data-note');
                const isWhiteKey = key.classList.contains('piano-white-key');
                
                if (cMajorNotes.includes(noteName)) {
                    // C Major scale notes get a strong accent
                    if (isWhiteKey) {
                        key.style.boxShadow = '0 0 15px rgba(96, 165, 250, 0.8) inset, 0 4px 8px rgba(96, 165, 250, 0.3)';
                        key.style.filter = 'brightness(1.05)';
                    } else {
                        key.style.boxShadow = '0 0 12px rgba(96, 165, 250, 0.9) inset';
                    }
                    
                    // Add label showing the degree (1-7)
                    const degreeIndex = cMajorNotes.indexOf(noteName);
                    const degreeLabel = document.createElement('div');
                    degreeLabel.style.cssText = `
                        position: absolute;
                        top: 4px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-family: var(--font-tech);
                        font-size: ${isWhiteKey ? '12px' : '10px'};
                        font-weight: bold;
                        color: var(--accent-primary);
                        pointer-events: none;
                        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                        z-index: 5;
                    `;
                    degreeLabel.textContent = (degreeIndex + 1).toString();
                    key.appendChild(degreeLabel);
                }
                
                // Add click handler for sound (when not dragging)
                key.addEventListener('click', (e) => {
                    if (!this._isDragging) {
                        const midi = parseInt(key.getAttribute('data-midi'));
                        if (!isNaN(midi)) {
                            this.playNote(midi);
                        }
                    }
                });

                // Add hover effects and drag support for glissando
                key.addEventListener('mouseenter', (e) => {
                    const note = key.getAttribute('data-note');
                    const midi = parseInt(key.getAttribute('data-midi'));
                    const octave = key.getAttribute('data-octave');
                    const isScale = cMajorNotes.includes(note);
                    
                    // Play sound when dragging over keys (glissando effect)
                    if (this._isDragging && !isNaN(midi) && this._lastPlayedKey !== midi) {
                        this.playNote(midi, 0.15); // Short duration for smooth glissando
                        this._lastPlayedKey = midi;
                        
                        // Visual feedback during drag
                        key.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            key.style.transform = '';
                        }, 100);
                    }
                    
                    // Show tooltip
                    const tooltip = document.createElement('div');
                    tooltip.style.cssText = `
                        position: absolute;
                        bottom: -28px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: var(--accent-primary);
                        color: #000;
                        padding: 4px 8px;
                        border-radius: 3px;
                        font-family: var(--font-tech);
                        font-size: 10px;
                        font-weight: bold;
                        white-space: nowrap;
                        pointer-events: none;
                        z-index: 100;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    `;
                    tooltip.textContent = `${note}${octave} (MIDI ${midi})`;
                    key.appendChild(tooltip);
                    
                    // Brighten the key on hover
                    const currentBoxShadow = key.style.boxShadow;
                    key.style.filter = (key.style.filter || '') + ' brightness(1.15)';
                    
                    const cleanup = () => {
                        tooltip.remove();
                        key.style.filter = key.style.filter.replace('brightness(1.15)', '').trim();
                        key.removeEventListener('mouseleave', cleanup);
                    };
                    key.addEventListener('mouseleave', cleanup);
                });
            });

            // Setup mouse drag support for glissando effect
            this._localPiano.pianoElement.addEventListener('mousedown', (e) => {
                this._isDragging = true;
                this._lastPlayedKey = null;
                
                // Prevent text selection when dragging
                e.preventDefault();
                
                // Play note on initial mousedown
                const key = e.target.closest('[data-midi]');
                if (key) {
                    const midi = parseInt(key.getAttribute('data-midi'));
                    if (!isNaN(midi)) {
                        this.playNote(midi, 0.15);
                        this._lastPlayedKey = midi;
                        
                        // Visual feedback
                        key.style.transform = 'scale(0.98)';
                        setTimeout(() => {
                            key.style.transform = '';
                        }, 100);
                    }
                }
            });

            // Also handle mousemove to ensure smooth glissando even with fast movements
            this._localPiano.pianoElement.addEventListener('mousemove', (e) => {
                if (this._isDragging) {
                    const key = e.target.closest('[data-midi]');
                    if (key) {
                        const midi = parseInt(key.getAttribute('data-midi'));
                        if (!isNaN(midi) && this._lastPlayedKey !== midi) {
                            this.playNote(midi, 0.15);
                            this._lastPlayedKey = midi;
                            
                            // Visual feedback
                            key.style.transform = 'scale(0.98)';
                            setTimeout(() => {
                                key.style.transform = '';
                            }, 100);
                        }
                    }
                }
            });

            // Stop dragging on mouse up anywhere
            document.addEventListener('mouseup', () => {
                this._isDragging = false;
                this._lastPlayedKey = null;
            });

            // Prevent text selection on the piano element
            this._localPiano.pianoElement.style.userSelect = 'none';
            this._localPiano.pianoElement.style.webkitUserSelect = 'none';
            this._localPiano.pianoElement.style.mozUserSelect = 'none';
            this._localPiano.pianoElement.style.msUserSelect = 'none';
        }
    }

    renderSheetMusic() {
        const container = this.container.querySelector('#sheet-music-learn-container');
        if (!container) return;
        
        const width = Math.max(container.clientWidth || 800, 600);
        const height = 180;
        const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const staffY = 70; // Base y position for staff
        
        container.innerHTML = `
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
                <!-- Staff Lines -->
                <g stroke="#999" stroke-width="1.5">
                    <line x1="60" y1="${staffY}" x2="${width-60}" y2="${staffY}" />
                    <line x1="60" y1="${staffY+10}" x2="${width-60}" y2="${staffY+10}" />
                    <line x1="60" y1="${staffY+20}" x2="${width-60}" y2="${staffY+20}" />
                    <line x1="60" y1="${staffY+30}" x2="${width-60}" y2="${staffY+30}" />
                    <line x1="60" y1="${staffY+40}" x2="${width-60}" y2="${staffY+40}" />
                </g>
                
                <!-- Treble Clef -->
                <text x="70" y="${staffY+35}" font-family="serif" font-size="50" fill="#333">𝄞</text>
                
                <!-- Notes: C4=below staff, D4=below, E4=bottom line, F4=space, G4=line, A4=space, B4=line -->
                <g id="manual-sheet-notes">
                    ${notes.map((n, i) => {
                        // C4 through B4 positioning (C4=below staff with ledger line)
                        const positions = [
                            staffY+50, // C4 - below staff
                            staffY+45, // D4 - space below
                            staffY+40, // E4 - bottom line
                            staffY+35, // F4 - first space
                            staffY+30, // G4 - second line
                            staffY+25, // A4 - second space
                            staffY+20  // B4 - third line
                        ];
                        const y = positions[i];
                        const x = 140 + (i * ((width - 220) / 6));
                        
                        let ledger = '';
                        if (i === 0) { // C4 needs ledger line
                            ledger = `<line x1="${x-14}" y1="${staffY+50}" x2="${x+14}" y2="${staffY+50}" stroke="#333" stroke-width="1.5" />`;
                        }
                        
                        return `
                            <g class="sheet-note-group" data-note="${n}" data-index="${i}">
                                ${ledger}
                                <circle cx="${x}" cy="${y}" r="7" fill="#333" stroke="#333" stroke-width="1" />
                                <text x="${x}" y="${y+30}" text-anchor="middle" font-size="14" font-weight="600" fill="#555">${n}4</text>
                            </g>
                        `;
                    }).join('')}
                </g>
            </svg>
        `;
    }

    setupConnectorOverlay() {
        if (!this.container) return;
        
        // Position overlay relative to the entire module wrapper
        const wrapper = this.container.querySelector('#learn-module-wrapper');
        if (!wrapper) return;
        
        wrapper.style.position = 'relative';

        // Remove existing overlay
        const existing = document.querySelector('#learn-connector-overlay');
        if (existing) existing.remove();

        // Create new SVG overlay at the wrapper level (not inside bordered boxes)
        this.connectorOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.connectorOverlay.id = 'learn-connector-overlay';
        this.connectorOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100;
            overflow: visible;
        `;

        wrapper.appendChild(this.connectorOverlay);
    }

    drawConnectorLines() {
        if (!this.connectorOverlay) return;
        
        // Get wrapper for coordinate reference
        const wrapper = this.container.querySelector('#learn-module-wrapper');
        if (!wrapper) return;
        
        // Size overlay to wrapper
        const rect = wrapper.getBoundingClientRect();
        this.connectorOverlay.setAttribute('width', rect.width);
        this.connectorOverlay.setAttribute('height', rect.height);
        this.connectorOverlay.innerHTML = '';

        // Add metallic glow filter
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <filter id="metal-glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        `;
        this.connectorOverlay.appendChild(defs);

        // Get piano and sheet elements
        const pianoEl = this._localPiano?.pianoElement;
        if (!pianoEl) return;

        const sheetGroups = this.container.querySelectorAll('.sheet-note-group');
        if (!sheetGroups.length) return;

        const wrapperBounds = wrapper.getBoundingClientRect();
        const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        
        sheetGroups.forEach((group, i) => {
            const circle = group.querySelector('circle');
            if (!circle) return;
            
            const noteName = notes[i];
            
            // Find corresponding piano key (C4-B4 range, MIDI 60-71)
            const targetMidi = 60 + [0, 2, 4, 5, 7, 9, 11][i];
            let key = pianoEl.querySelector(`[data-midi="${targetMidi}"]`);
            
            // Fallback: find by note name (C4-B4 only)
            if (!key) {
                const matchingKeys = Array.from(pianoEl.querySelectorAll(`[data-note="${noteName}"]`));
                key = matchingKeys[0]; // Only one octave, so first match is correct
            }
            
            if (!key) return;

            // Calculate positions
            const keyRect = key.getBoundingClientRect();
            const circleRect = circle.getBoundingClientRect();
            
            const x1 = keyRect.left - wrapperBounds.left + (keyRect.width / 2);
            const y1 = keyRect.bottom - wrapperBounds.top;
            const x2 = circleRect.left - wrapperBounds.left + (circleRect.width / 2);
            const y2 = circleRect.top - wrapperBounds.top + (circleRect.height / 2);

            // Draw "tine" connector line (Rhodes piano style)
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', '#A8B8CC'); // Steel blue-gray
            line.setAttribute('stroke-width', '2');
            line.setAttribute('opacity', '0.6');
            line.setAttribute('filter', 'url(#metal-glow)');

            // Piano key anchor (mounting point)
            const anchorKey = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            anchorKey.setAttribute('x', x1 - 3);
            anchorKey.setAttribute('y', y1);
            anchorKey.setAttribute('width', '6');
            anchorKey.setAttribute('height', '10');
            anchorKey.setAttribute('fill', '#708090');
            anchorKey.setAttribute('rx', '1');

            // Note anchor (tine tip)
            const anchorNote = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            anchorNote.setAttribute('cx', x2);
            anchorNote.setAttribute('cy', y2);
            anchorNote.setAttribute('r', '3.5');
            anchorNote.setAttribute('fill', '#A8B8CC');
            anchorNote.setAttribute('opacity', '0.8');

            this.connectorOverlay.appendChild(line);
            this.connectorOverlay.appendChild(anchorKey);
            this.connectorOverlay.appendChild(anchorNote);
        });
    }

    setupConnectorRedrawEvents() {
        if (this._connectorEventsBound || !this.container) return;
        this._connectorEventsBound = true;

        const pianoScroll = this.container.querySelector('#piano-learn-container');
        const sheetScroll = this.container.querySelector('#sheet-music-learn-container');

        const schedule = () => {
            requestAnimationFrame(() => this.drawConnectorLines());
        };

        // Keep connectors aligned if the user scrolls either area
        pianoScroll?.addEventListener('scroll', schedule, { passive: true });
        sheetScroll?.addEventListener('scroll', schedule, { passive: true });

        // Also reflow on resize
        window.addEventListener('resize', schedule, { passive: true });
    }

}

if (typeof window !== 'undefined') {
    window.LearnPianoNotes = LearnPianoNotes;
}
