(function(){
    'use strict';

    /**
     * LearnInversions: Master chord inversions on the piano
     * - Interactive visualization of root position, 1st, and 2nd inversions
     * - Clear identification of root notes with visual markers
     * - Explanation of how the bass note changes
     */
    class LearnInversions {
        constructor(musicTheoryEngine) {
            this.musicTheory = musicTheoryEngine || null;
            this.containerEl = null;
            this.visualizer = null;
            this._audioEngine = null; // Use shared audio engine
            
            // State
            this.rootNote = 'C';
            this.rootMidi = 60;
            this.chordType = 'major'; // 'major', 'minor'
            this.inversion = 0; // 0, 1, 2
            
            // Explanation data
            this.explanations = {
                0: "Root Position: The root note is at the bottom. This is the foundation of the chord.",
                1: "1st Inversion: The 3rd of the chord is at the bottom. The root has moved up an octave!",
                2: "2nd Inversion: The 5th of the chord is at the bottom. The 3rd has also moved up."
            };
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

        playChord(midiNotes, duration = 0.6) {
            if (this._audioEngine && typeof this._audioEngine.playChord === 'function') {
                this._audioEngine.playChord(midiNotes, duration);
            } else {
                midiNotes.forEach((midi, i) => {
                    this.playNote(midi, duration);
                });
            }
        }

        mount(selector) {
            const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!host) return;
            this.containerEl = host;
            this.initAudio();
            host.innerHTML = '';

            // Wrapper
            const wrapper = document.createElement('div');
            wrapper.id = 'learn-inversions-wrapper';
            wrapper.style.cssText = 'position: relative; display: flex; flex-direction: column; gap: 16px; padding: 16px; max-width: 1100px; margin: 0 auto;';
            host.appendChild(wrapper);

            // Navigation Bar
            const navBar = document.createElement('div');
            navBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;';
            navBar.innerHTML = `
                <button id="back-to-landing-from-inversions" style="display: flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--border-light); padding: 8px 14px; cursor: pointer; color: var(--text-main); font-family: var(--font-tech); transition: all 0.2s ease; border-radius: 4px; font-size: 0.9rem;">
                    <span style="font-size: 1.2rem;">←</span>
                    <span>Home</span>
                </button>
            `;
            wrapper.appendChild(navBar);

            const backBtn = navBar.querySelector('#back-to-landing-from-inversions');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.goBack());
            }

            // Header
            const header = document.createElement('div');
            header.style.cssText = 'text-align: center; margin-bottom: 12px;';
            header.innerHTML = `
                <h2 style="color: var(--text-main); margin: 0 0 8px 0; font-size: clamp(1.3rem, 3vw, 1.8rem);">
                    🔄 How to Play Inversions
                </h2>
                <p style="color: var(--text-muted); margin: 0; font-size: clamp(0.85rem, 2vw, 1rem); line-height: 1.6;">
                    Master the same chord in three different positions. The bass note changes, but the chord is still the same.
                </p>
            `;
            wrapper.appendChild(header);

            // Controls Section
            const controlsWrapper = document.createElement('div');
            controlsWrapper.style.cssText = 'display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; margin-bottom: 24px;';
            wrapper.appendChild(controlsWrapper);

            // Root Selector
            const rootGroup = document.createElement('div');
            rootGroup.innerHTML = `<div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Root Note</div>`;
            const rootBtns = document.createElement('div');
            rootBtns.style.cssText = 'display:flex; gap:4px;';
            
            ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach((note, i) => {
                const btn = document.createElement('button');
                btn.textContent = note;
                btn.className = 'inv-root-btn';
                btn.dataset.note = note;
                btn.dataset.midi = 60 + i;
                btn.style.cssText = `
                    width: 36px; height: 36px; border-radius: 4px; border: 1px solid var(--border-light);
                    background: var(--bg-panel); color: var(--text-main); font-size: 0.8rem; font-weight: 700;
                    cursor: pointer; transition: all 0.15s; font-family: var(--font-tech);
                `;
                
                if (i === 0) { // Default C
                    btn.style.background = 'var(--accent-primary)';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-primary)';
                }
                
                btn.addEventListener('click', () => {
                    this.containerEl.querySelectorAll('.inv-root-btn').forEach(b => {
                        b.style.background = 'var(--bg-panel)';
                        b.style.color = 'var(--text-main)';
                        b.style.borderColor = 'var(--border-light)';
                    });
                    btn.style.background = 'var(--accent-primary)';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-primary)';
                    
                    this.rootNote = note;
                    this.rootMidi = parseInt(btn.dataset.midi);
                    this.inversion = 0; // Reset to root position
                    this.updateVisualization();
                });
                
                rootBtns.appendChild(btn);
            });
            rootGroup.appendChild(rootBtns);
            controlsWrapper.appendChild(rootGroup);

            // Chord Quality
            const typeGroup = document.createElement('div');
            typeGroup.innerHTML = `<div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Quality</div>`;
            const typeBtns = document.createElement('div');
            typeBtns.style.cssText = 'display:flex; gap:4px;';
            
            ['Major', 'Minor'].forEach((label, i) => {
                const btn = document.createElement('button');
                btn.textContent = label;
                btn.className = 'inv-type-btn';
                btn.dataset.type = label.toLowerCase();
                btn.style.cssText = `
                    padding: 0 16px; height: 36px; border-radius: 4px; border: 1px solid var(--border-light);
                    background: var(--bg-panel); color: var(--text-main); font-size: 0.8rem; font-weight: 700;
                    cursor: pointer; transition: all 0.15s; font-family: var(--font-tech);
                `;
                
                if (i === 0) { // Default Major
                    btn.style.background = 'var(--accent-secondary)';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-secondary)';
                }
                
                btn.addEventListener('click', () => {
                    this.containerEl.querySelectorAll('.inv-type-btn').forEach(b => {
                        b.style.background = 'var(--bg-panel)';
                        b.style.color = 'var(--text-main)';
                        b.style.borderColor = 'var(--border-light)';
                    });
                    btn.style.background = 'var(--accent-secondary)';
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-secondary)';
                    
                    this.chordType = btn.dataset.type;
                    this.inversion = 0; // Reset to root position
                    this.updateVisualization();
                });
                
                typeBtns.appendChild(btn);
            });
            typeGroup.appendChild(typeBtns);
            controlsWrapper.appendChild(typeGroup);

            // Inversion Selector
            const invGroup = document.createElement('div');
            invGroup.innerHTML = `<div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Inversion</div>`;
            const invBtns = document.createElement('div');
            invBtns.style.cssText = 'display:flex; gap:4px;';
            
            const inversions = [
                { label: 'Root', value: 0 },
                { label: '1st', value: 1 },
                { label: '2nd', value: 2 }
            ];
            
            inversions.forEach((inv, i) => {
                const btn = document.createElement('button');
                btn.textContent = inv.label;
                btn.className = 'inv-position-btn';
                btn.dataset.inv = inv.value;
                btn.style.cssText = `
                    padding: 0 16px; height: 36px; border-radius: 4px; border: 1px solid var(--accent-primary);
                    background: transparent; color: var(--text-main); font-size: 0.8rem; font-weight: 700;
                    cursor: pointer; transition: all 0.15s; font-family: var(--font-tech);
                `;
                
                if (i === 0) { // Default Root
                    btn.style.background = 'var(--accent-primary)';
                    btn.style.color = '#000';
                }
                
                btn.addEventListener('click', () => {
                    this.containerEl.querySelectorAll('.inv-position-btn').forEach(b => {
                        b.style.background = 'transparent';
                        b.style.color = 'var(--text-main)';
                    });
                    btn.style.background = 'var(--accent-primary)';
                    btn.style.color = '#000';
                    
                    this.inversion = parseInt(btn.dataset.inv);
                    this.updateVisualization();
                });
                
                invBtns.appendChild(btn);
            });
            invGroup.appendChild(invBtns);
            controlsWrapper.appendChild(invGroup);

            // Visualization Stage
            const stage = document.createElement('div');
            stage.id = 'inversion-stage';
            stage.style.cssText = `
                background: linear-gradient(180deg, rgba(20,20,20,0.5), rgba(10,10,10,0.8));
                border-radius: 12px;
                padding: 30px;
                margin-bottom: 24px;
                border: 1px solid var(--border-light);
                box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 20px;
                min-height: 280px;
            `;
            wrapper.appendChild(stage);

            // Piano Container
            const pianoDiv = document.createElement('div');
            pianoDiv.id = 'inversion-piano';
            pianoDiv.style.cssText = 'width: 100%; display: flex; justify-content: center;';
            stage.appendChild(pianoDiv);

            // Info Panel
            const infoDiv = document.createElement('div');
            infoDiv.id = 'inversion-info';
            infoDiv.style.cssText = `
                text-align: center;
                color: var(--text-main);
                font-size: 1rem;
                line-height: 1.6;
                max-width: 600px;
                padding: 16px;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
            `;
            stage.appendChild(infoDiv);

            // Play Button
            const playDiv = document.createElement('div');
            playDiv.style.cssText = 'text-align: center; margin-top: 8px;';
            playDiv.innerHTML = `
                <button id="play-inversion-btn" style="
                    padding: 10px 24px;
                    background: var(--accent-primary);
                    color: #000;
                    border: none;
                    border-radius: 4px;
                    font-weight: 700;
                    cursor: pointer;
                    font-size: 0.95rem;
                    font-family: var(--font-tech);
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">▶ Play Chord</button>
            `;
            stage.appendChild(playDiv);

            const playBtn = playDiv.querySelector('#play-inversion-btn');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    const chordNotes = this.getChordNotes();
                    this.playChord(chordNotes, 0.8);
                });
            }

            // Future Modules Teaser
            const teaserDiv = document.createElement('div');
            teaserDiv.style.cssText = `
                background: rgba(139, 92, 246, 0.08);
                border: 1px solid rgba(139, 92, 246, 0.3);
                border-radius: 8px;
                padding: 20px;
                text-align: center;
            `;
            teaserDiv.innerHTML = `
                <h4 style="color: var(--text-highlight); margin: 0 0 8px 0; font-size: 1rem;">
                    🚀 Coming Soon: Advanced Voicings
                </h4>
                <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem; line-height: 1.6;">
                    Inversions are just the beginning! Next, master <strong>Drop-2 voicings</strong>, 
                    <strong>spread triads</strong>, and <strong>rootless jazz voicings</strong> to unlock 
                    infinite creativity on your instrument.
                </p>
            `;
            wrapper.appendChild(teaserDiv);

            // Initialize visualizer
            if (typeof PianoVisualizer !== 'undefined') {
                this.visualizer = new PianoVisualizer({
                    startMidi: 48, // C3
                    octaves: 3,
                    whiteKeyWidth: 40,
                    whiteKeyHeight: 140,
                    showFingering: false,
                    showNoteLabels: true,
                    fitToContainer: true
                });
                this.visualizer.mount('#inversion-piano');
            } else {
                pianoDiv.innerHTML = '<div style="color:var(--accent-primary); font-weight:bold;">Piano visualizer not available</div>';
            }

            // Initial render
            this.updateVisualization();
        }

        highlightKeySafe(midi, color) {
            if (this.visualizer && typeof this.visualizer.highlightKey === 'function') {
                this.visualizer.highlightKey(midi, color);
            }
        }

        getChordNotes() {
            // Calculate MIDI notes for the chord in current inversion
            let intervals = (this.chordType === 'major') ? [4, 7] : [3, 7]; // Semitones: 3rd and 5th from root
            
            let notes = [this.rootMidi];
            intervals.forEach(i => notes.push(this.rootMidi + i));
            
            // Apply inversion
            if (this.inversion === 1) {
                let first = notes.shift();
                notes.push(first + 12);
            } else if (this.inversion === 2) {
                let first = notes.shift();
                let second = notes.shift();
                notes.push(first + 12);
                notes.push(second + 12);
            }
            
            return notes;
        }

        goBack() {
            const landing = document.getElementById('landing-page');
            const page = document.getElementById('learn-inversions-page');
            const workspace = document.querySelector('.workspace');
            const controlDeck = document.querySelector('.control-deck');
            const bottomDeck = document.querySelector('.bottom-deck');
            
            if (landing) landing.style.display = 'block';
            if (page) page.style.display = 'none';
            if (workspace) workspace.style.display = 'none';
            if (controlDeck) controlDeck.style.display = 'none';
            if (bottomDeck) bottomDeck.style.display = 'none';
        }

        highlightKeySafe(midi, color) {
            if (this.visualizer && typeof this.visualizer.highlightKey === 'function') {
                this.visualizer.highlightKey(midi, color);
            }
        }

        updateVisualization() {
            if (!this.visualizer) return;
            
            // Get the chord notes in current inversion
            const chordNotes = this.getChordNotes();
            
            // Clear previous highlights by rendering the piano fresh
            if (this.visualizer.state) {
                this.visualizer.state.activeNotes = [];
                this.visualizer.state.highlightedNotes = [];
            }
            
            // Highlight chord notes: root in primary color, others in secondary
            const rootClass = this.rootMidi % 12;
            
            chordNotes.forEach(midi => {
                const isRoot = (midi % 12) === rootClass;
                const color = isRoot ? 'var(--accent-primary)' : 'var(--accent-secondary)';
                this.highlightKeySafe(midi, color);
            });

            // Update explanation text
            const infoDiv = document.getElementById('inversion-info');
            if (infoDiv) {
                const lowestMidi = chordNotes[0];
                const lowestNoteName = this.midiToNoteName(lowestMidi);
                const invNames = ['Root Position', '1st Inversion', '2nd Inversion'];
                
                let html = `
                    <div style="margin-bottom: 10px;">
                        <strong style="font-size: 1.1rem; color: var(--text-highlight);">
                            ${this.rootNote} ${this.chordType.charAt(0).toUpperCase() + this.chordType.slice(1)}
                        </strong>
                        <span style="color: var(--text-muted); margin-left: 8px;">— ${invNames[this.inversion]}</span>
                    </div>
                    <div style="color: var(--text-muted); margin-bottom: 12px; line-height: 1.5;">
                        ${this.explanations[this.inversion]}
                    </div>
                    <div style="padding: 12px; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--accent-primary); border-radius: 4px;">
                        <span style="color: var(--accent-primary); font-weight: 700;">🎹 Bass Note: ${lowestNoteName}</span>
                    </div>
                `;
                
                infoDiv.innerHTML = html;
            }
        }

        midiToNoteName(midi) {
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const octave = Math.floor(midi / 12) - 1;
            const noteIndex = midi % 12;
            return noteNames[noteIndex] + octave;
        }
    }

    // Expose Global
    window.LearnInversions = LearnInversions;

})();
