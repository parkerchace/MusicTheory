// Rebuilt, simplified LearnInversions module
// Goal: one clear chord/inversion visual, no extra clutter.

(function(){
    'use strict';

    class LearnInversions {
        constructor(musicTheoryEngine) {
            this.musicTheory = musicTheoryEngine || null;
            this.containerEl = null;

            // Shared piano + audio
            this._sharedPiano = null;            this._pianoNoteClickedHandler = null;
            this._audioEngine = null;
            
            // Suppression: save original piano methods
            this._savedPianoApplyState = null;

            // Core state
            this.rootNote = 'C';      // C..B
            this.rootMidi = 60;       // C4 default
            this.quality = 'maj';     // 'maj' | 'min'
            this.inversion = 0;       // 0 | 1 | 2

            // Local UI refs for new overview sections
            this._miniKeyboards = {
                root: null,
                first: null,
                second: null
            };
            this._sheetMusicExampleEl = null;

            // Simple explanation + finger text
            this.explanations = {
                0: {
                    title: 'Root Position',
                    short: 'Root is in the bass',
                    detailed: 'Root position stacks the chord from the bottom up: root–3rd–5th. For C major that is C–E–G with C as the lowest note. This is the "default" shape and is great when you want a solid, grounded sound.'
                },
                1: {
                    title: '1st Inversion',
                    short: '3rd is in the bass',
                    detailed: '1st inversion moves the root up so the 3rd becomes the lowest note. For C major that means E–G–C with E on the bottom. This lets your hand stay in almost the same place when you move to nearby chords (for example going from C major to A minor or F major).'
                },
                2: {
                    title: '2nd Inversion',
                    short: '5th is in the bass',
                    detailed: '2nd inversion puts the 5th in the bass. For C major that is G–C–E with G on the bottom. This shape is a bit more tense and is often used right before another chord, like playing C in 2nd inversion before a G chord to make the resolution feel strong.'
                }
            };

            this.fingerGuides = {
                0: 'Right hand example (C major): thumb on C, middle finger on E, pinky on G (1–3–5). Play slowly and listen for the solid, "home" feeling.',
                1: 'Right hand example (C major 1st inversion): thumb on E, index on G, pinky on C (1–2–5). Notice how close this feels to root position—only one note moved.',
                2: 'Right hand example (C major 2nd inversion): thumb on G, middle finger on C, pinky on E (1–3–5). Feel how this wants to move to another chord (for example a G chord).'
            };
        }

        // Small helper for consistent button "active" styling
        _setButtonActive(btn, isActive, styleKind) {
            if (!btn) return;
            if (!isActive) {
                btn.style.opacity = '0.9';
                btn.style.transform = 'scale(1)';
                btn.style.backgroundImage = 'none';
                btn.style.color = 'var(--text-main)';  // Reset text color to default
                btn.style.background = 'rgba(0,0,0,0.5)';  // Reset background
                return;
            }

            btn.style.opacity = '1';
            btn.style.transform = 'scale(1.03)';

            if (styleKind === 'primary') {
                btn.style.backgroundImage = 'linear-gradient(135deg,var(--accent-primary),#22c55e)';
                btn.style.color = '#000';
            } else if (styleKind === 'secondary') {
                btn.style.backgroundImage = 'linear-gradient(135deg,var(--accent-secondary),#f97316)';
                btn.style.color = '#000';
            } else if (styleKind === 'chip') {
                btn.style.backgroundImage = 'linear-gradient(135deg,rgba(59,130,246,0.9),rgba(16,185,129,0.9))';
                btn.style.color = '#000';
            }
        }

        // ---------- Audio & piano wiring ----------

        initAudio() {
            if (this._audioEngine) return;

            if (typeof PianoSampleEngine !== 'undefined') {
                const piano = new PianoSampleEngine();
                this._audioEngine = {
                    _kind: 'piano-sample',
                    _engine: piano,
                    init: () => piano.init(),
                    playNote: (midi, options = {}) => {
                        const opts = typeof options === 'number' ? { duration: options } : (options || {});
                        const duration = typeof opts.duration === 'number' ? opts.duration : 0.6;
                        const velocity = typeof opts.velocity === 'number' ? opts.velocity : 0.95;
                        piano.playNote(midi, duration, 0, velocity);
                    },
                    playChord: (notes, options = {}) => {
                        const opts = typeof options === 'number' ? { duration: options } : (options || {});
                        const duration = typeof opts.duration === 'number' ? opts.duration : 0.9;
                        const velocity = typeof opts.velocity === 'number' ? opts.velocity : 0.95;
                        piano.playChord(notes, duration, velocity);
                    }
                };
            } else if (typeof EnhancedAudioEngine !== 'undefined') {
                this._audioEngine = new EnhancedAudioEngine({ masterVolume: 0.3 });
            } else if (window.modularApp && window.modularApp.audioEngine) {
                this._audioEngine = window.modularApp.audioEngine;
            } else if (typeof SimpleAudioEngine !== 'undefined') {
                this._audioEngine = new SimpleAudioEngine();
            }

            if (this._audioEngine && typeof this._audioEngine.init === 'function') {
                try {
                    const res = this._audioEngine.init();
                    if (res && typeof res.then === 'function') res.catch(() => {});
                } catch(_) {}
            }
        }

        installSharedPianoSoundHandler() {
            if (!this._sharedPiano || typeof this._sharedPiano.on !== 'function') return;
            if (this._pianoNoteClickedHandler) return;

            this._pianoNoteClickedHandler = (evt) => {
                console.log('[LearnInversions] noteClicked event received:', evt);
                const midi = evt && typeof evt.midi === 'number' ? evt.midi : null;
                console.log('[LearnInversions] Extracted MIDI:', midi);
                if (typeof midi !== 'number') {
                    console.warn('[LearnInversions] Invalid MIDI in event');
                    return;
                }
                this.playNote(midi, { duration: 0.45, velocity: 0.95 });
            };

            console.log('[LearnInversions] Registering noteClicked handler');
            this._sharedPiano.on('noteClicked', this._pianoNoteClickedHandler);
            console.log('[LearnInversions] Handler registered, total listeners:', this._sharedPiano.listeners?.get('noteClicked')?.size);
        }

        initSharedPiano() {
            if (window.modularApp && window.modularApp.pianoVisualizer) {
                this._sharedPiano = window.modularApp.pianoVisualizer;
                console.log('[LearnInversions] Using shared piano visualizer');
            } else {
                console.warn('[LearnInversions] Shared piano visualizer not available');
            }
        }

        playNote(midi, options = {}) {
            console.log(`[LearnInversions] playNote called: midi=${midi}, audioEngine=${!!this._audioEngine}`);
            try {
                const optionsObj = typeof options === 'number' ? { duration: options } : options;
                if (this._audioEngine && typeof this._audioEngine.playNote === 'function') {
                    console.log(`▶️ Playing note ${midi}`);
                    this._audioEngine.playNote(midi, optionsObj);
                } else {
                    console.warn('❌ No audio engine available to play note');
                }
            } catch (error) {
                console.error('❌ Audio playback failed:', error);
            }
        }

        playChord(midiNotes, duration = 0.6) {
            try {
                if (this._audioEngine && typeof this._audioEngine.playChord === 'function') {
                    this._audioEngine.playChord(midiNotes, duration);
                } else {
                    (midiNotes || []).forEach(midi => this.playNote(midi, duration));
                }
            } catch (error) {
                console.warn('Chord playback failed:', error && error.message);
            }
        }

        // ---------- UI skeleton ----------

        mount(selector) {
            const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!host) return;

            this.containerEl = host;
            this.initAudio();
            this.initSharedPiano();
            host.innerHTML = '';

            const MAX_WIDTH = '780px';

            if (!document.getElementById('learn-inversions-responsive-styles')) {
                const style = document.createElement('style');
                style.id = 'learn-inversions-responsive-styles';
                style.textContent = `
                    #learn-inversions-wrapper { max-width: ${MAX_WIDTH}; margin: 0 auto; padding: 16px; }
                    #learn-inversions-wrapper * { box-sizing: border-box; }
                    #inv-piano-wrap { overflow: hidden; }
                    #inv-piano-wrap > div { max-width: 100% !important; }
                    .inv-section { margin: 0 0 20px 0; }
                    .inv-intro-section { background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1)); border: 1px solid rgba(59,130,246,0.25); border-radius: 14px; padding: 24px; margin-bottom: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
                    .inv-intro-grid { display:grid; grid-template-columns: 1fr; gap:24px; }
                    .inv-text-block h3 { font-family:var(--font-tech); font-weight:900; font-size:1.3rem; color:var(--accent-primary); margin:0 0 14px 0; letter-spacing:0.5px; text-align:center; }
                    .inv-text-block p { font-size:0.95rem; color:var(--text-main); line-height:1.9; margin:0 0 16px 0; text-align:center; max-width: 700px; margin-left: auto; margin-right: auto; }
                    .inv-text-block ul { font-size:0.9rem; color:var(--text-main); line-height:1.9; padding:0; margin:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; max-width:700px; margin-left:auto; margin-right:auto; }
                    .inv-text-block ul li { position:relative; padding:12px 16px; margin:0; background:rgba(0,0,0,0.2); border-radius:8px; border:1px solid rgba(59,130,246,0.15); }
                    .inv-text-block ul li strong { color:var(--accent-primary); display:block; margin-bottom:4px; font-size:0.92rem; }
                    .inv-mini-examples { background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.08); }
                    .inv-mini-examples-title { font-size:0.85rem; color:var(--accent-primary); text-transform:uppercase; letter-spacing:1.2px; margin-bottom:16px; text-align:center; font-weight:800; }
                    .inv-mini-row { display:flex; gap:16px; justify-content:center; flex-wrap:wrap; }
                    .inv-mini-card { flex:0 1 180px; }
                    .inv-mini-label { font-size:0.85rem; font-weight:800; font-family:var(--font-tech); color:var(--text-highlight); margin-bottom:8px; text-align:center; }
                    .inv-mini-keyboard { position:relative; background:linear-gradient(135deg, #222, #1a1a1a); border-radius:8px; padding:10px; box-shadow:0 6px 16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05); border: 1px solid #111; }
                    .inv-mini-keys-container { position:relative; height:60px; overflow:visible; }
                    .inv-mini-white-keys { display:flex; height:100%; }
                    .inv-mini-key.white { flex:1; background:linear-gradient(180deg, #fff 0%, #e8e8e8 50%, #d0d0d0 100%); border:1px solid #ccc; border-right:1px solid #aaa; border-radius:0 0 4px 4px; box-shadow:inset 0 -2px 3px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.2); margin:0; }
                    .inv-mini-key.black { position:absolute; width:10px; height:66%; background:linear-gradient(180deg, #2a2a2a 0%, #000 100%); border:1px solid #000; border-radius:0 0 3px 3px; box-shadow:inset 0 1px 3px rgba(255,255,255,0.2), 0 3px 6px rgba(0,0,0,0.6); z-index:10; }
                    .inv-mini-key.active.white { background:linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%) !important; box-shadow:0 0 12px rgba(34,197,94,0.8), inset 0 1px 2px rgba(255,255,255,0.3) !important; border-color:#16a34a !important; }
                    .inv-mini-key.active.black { background:linear-gradient(180deg, #4ade80 0%, #22c55e 100%) !important; box-shadow:0 0 12px rgba(34,197,94,0.8), inset 0 1px 2px rgba(255,255,255,0.2) !important; }
                    .inv-mini-key.root.white { background:linear-gradient(180deg, #fca5a5 0%, #ef4444 50%, #dc2626 100%) !important; box-shadow:0 0 14px rgba(239,68,68,0.9), inset 0 1px 2px rgba(255,255,255,0.3) !important; border-color:#dc2626 !important; }
                    .inv-mini-key.root.black { background:linear-gradient(180deg, #fca5a5 0%, #ef4444 100%) !important; box-shadow:0 0 14px rgba(239,68,68,0.9), inset 0 1px 2px rgba(255,255,255,0.2) !important; }
                    .inv-mini-root-arrow { position:absolute; top:-18px; transform:translateX(-50%); color:#ef4444; font-size:1.2rem; font-weight:900; text-shadow:0 2px 4px rgba(0,0,0,0.9); font-family:var(--font-tech); text-align:center; white-space:nowrap; line-height:1; }
                    .inv-mini-caption { margin-top:10px; font-size:0.8rem; color:var(--text-muted); line-height:1.6; text-align:center; font-weight:600; }
                    .inv-sheet-section { background: linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0.2)); border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
                    .inv-sheet-title { font-family:var(--font-tech); font-weight:900; font-size:1.1rem; color:var(--text-highlight); margin-bottom:10px; text-align:center; letter-spacing:0.5px; }
                    .inv-sheet-desc { font-size:0.9rem; color:var(--text-main); line-height:1.8; margin-bottom:18px; text-align:center; max-width:600px; margin-left:auto; margin-right:auto; }
                    .inv-sheet-row { display:flex; gap:16px; justify-content:center; flex-wrap:wrap; }
                    .inv-sheet-card { flex:0 1 160px; }
                    .inv-sheet-card-label { font-size:0.85rem; font-weight:800; font-family:var(--font-tech); color:var(--text-highlight); margin-bottom:8px; text-align:center; }
                    .inv-sheet-staff { border-radius:8px; background:linear-gradient(135deg, rgba(30,30,30,0.9), rgba(25,25,25,0.85)); padding:12px; box-shadow:0 3px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05); border: 1px solid rgba(100,100,100,0.3); }
                    .inv-divider { height:2px; background:linear-gradient(90deg, transparent, rgba(139,92,246,0.3) 20%, rgba(139,92,246,0.5) 50%, rgba(139,92,246,0.3) 80%, transparent); margin:32px 0; border-radius:2px; }
                    .inv-interactive-title { font-family:var(--font-tech); font-weight:900; font-size:1.2rem; color:var(--accent-secondary); text-align:center; margin-bottom:20px; letter-spacing:0.8px; text-shadow:0 2px 8px rgba(139,92,246,0.3); }
                    @media (max-width: 600px) {
                        .inv-intro-grid { grid-template-columns:minmax(0,1fr); }
                        .inv-root-grid button { min-width: 34px; padding: 6px 8px; font-size: 0.78rem; }
                        .inv-mini-card, .inv-sheet-card { min-width: 140px; }
                        /* Make dedicated piano and mini keyboards more usable on small screens */
                        .inv-dedicated-piano { height: 110px !important; padding: 8px 6px 6px 6px !important; }
                        .inv-dedicated-piano .inv-piano-keys { height: 90px !important; }
                        .inv-piano-key.inv-piano-white-key { min-width: 22px !important; }
                        .inv-piano-key.inv-piano-black-key { height: 62% !important; }
                        .inv-mini-keys-container { height:48px; }
                        .inv-mini-key.black { height:60%; }
                    }
                `;
                document.head.appendChild(style);
            }

            const wrapper = document.createElement('div');
            wrapper.id = 'learn-inversions-wrapper';
            host.appendChild(wrapper);

            // Header
            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
            header.innerHTML = `
                <button id="back-to-landing-from-inversions" style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);border:1px solid var(--border-light);padding:6px 10px;border-radius:6px;cursor:pointer;color:var(--text-main);font-size:0.8rem;font-family:var(--font-tech);">← Back</button>
                <div style="flex:1;text-align:center;font-family:var(--font-tech);font-weight:900;font-size:1.1rem;color:var(--text-highlight);">Chord Inversions</div>
                <div style="width:64px;"></div>
            `;
            wrapper.appendChild(header);
            const backBtn = header.querySelector('#back-to-landing-from-inversions');
            if (backBtn) backBtn.addEventListener('click', () => this.goBack && this.goBack());

            // ---------------- Top pedagogy block ----------------

            const intro = document.createElement('div');
            intro.className = 'inv-section inv-intro-section';
            intro.innerHTML = `
                <div class="inv-intro-grid">
                    <div class="inv-text-block">
                        <h3>Why chord inversions matter</h3>
                        <p>
                            An <strong>inversion</strong> keeps the same notes of a chord but puts a
                            <strong>different note on the bottom</strong>. This simple change lets you keep chords
                            <strong>physically close together</strong> on the piano and creates smoother motion between chords.
                        </p>
                        <ul>
                            <li><strong>Harmony:</strong> Same notes, different "flavor" (more stable, more open, or more tense)</li>
                            <li><strong>Ergonomics:</strong> Move a few keys instead of jumping across the keyboard</li>
                            <li><strong>Voice leading:</strong> Each note slides to a nearby note in the next chord</li>
                        </ul>
                    </div>
                    <div class="inv-mini-examples">
                        <div class="inv-mini-examples-title">C major — same notes, new bass note</div>
                        <div class="inv-mini-row">
                            ${['Root position','1st inversion','2nd inversion'].map((label, idx) => `
                                <div class="inv-mini-card" data-mini-card="${idx}">
                                    <div class="inv-mini-label">${label}</div>
                                    <div class="inv-mini-keyboard" data-mini-kb="${idx}">
                                        <div class="inv-mini-keys-container"></div>
                                    </div>
                                    <div class="inv-mini-caption">
                                        ${idx === 0 ? '<strong>C</strong> on the bottom' : ''}
                                        ${idx === 1 ? '<strong>E</strong> on the bottom' : ''}
                                        ${idx === 2 ? '<strong>G</strong> on the bottom' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
            wrapper.appendChild(intro);

            // Cache mini keyboard containers for later drawing
            const miniKeyboards = intro.querySelectorAll('[data-mini-kb]');
            this._miniKeyboards.root = miniKeyboards[0] || null;
            this._miniKeyboards.first = miniKeyboards[1] || null;
            this._miniKeyboards.second = miniKeyboards[2] || null;

            this.renderMiniKeyboards();

            // ---------------- Sheet music explanation block ----------------

            const sheetSection = document.createElement('div');
            sheetSection.className = 'inv-section inv-sheet-section';
            sheetSection.innerHTML = `
                <div class="inv-sheet-title">See the same chord on sheet music</div>
                <div class="inv-sheet-desc">
                    Below is a <strong>C major triad</strong> written three ways. The notes C, E, and G never change – only
                    <strong>which note is lowest</strong>. This is exactly what you're doing on the piano.
                </div>
                <div class="inv-sheet-row">
                    ${['Root position','1st inversion','2nd inversion'].map((label, idx) => `
                        <div class="inv-sheet-card">
                            <div class="inv-sheet-card-label">${label}</div>
                            <div class="inv-sheet-staff">
                                ${this.buildStaticSheetExample(idx)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            wrapper.appendChild(sheetSection);
            this._sheetMusicExampleEl = sheetSection;

            // ---------------- Divider ----------------
            const divider = document.createElement('div');
            divider.className = 'inv-divider';
            wrapper.appendChild(divider);

            // ---------------- Interactive title ----------------
            const interactiveTitle = document.createElement('div');
            interactiveTitle.className = 'inv-interactive-title';
            interactiveTitle.textContent = '🎹 Try any chord & inversion';
            wrapper.appendChild(interactiveTitle);

            // Root selector
            const rootSection = document.createElement('div');
            rootSection.className = 'inv-section';
            rootSection.innerHTML = '<div style="text-align:center;font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Root note</div>';

            const rootGrid = document.createElement('div');
            rootGrid.className = 'inv-root-grid';
            rootGrid.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:6px;';
            const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
            notes.forEach((note, i) => {
                const btn = document.createElement('button');
                btn.textContent = note;
                btn.dataset.note = note;
                btn.style.cssText = 'padding:7px 9px;min-width:36px;border-radius:6px;border:1px solid rgba(255,255,255,0.16);background:rgba(0,0,0,0.5);color:var(--text-main);font-family:var(--font-tech);font-size:0.8rem;cursor:pointer;font-weight:700;';
                if (note === this.rootNote) {
                    this._setButtonActive(btn, true, 'primary');
                }
                btn.addEventListener('click', () => {
                    this.rootNote = note;
                    this.rootMidi = 60 + i;
                    rootGrid.querySelectorAll('button').forEach(b => this._setButtonActive(b, b === btn, 'primary'));
                    this.renderPiano();
                    this.updateVisualization();
                    this.playNote(this.rootMidi, 0.3);
                });
                rootGrid.appendChild(btn);
            });
            rootSection.appendChild(rootGrid);
            wrapper.appendChild(rootSection);

            // Quality buttons
            const qualitySection = document.createElement('div');
            qualitySection.className = 'inv-section';
            qualitySection.style.cssText = 'display:flex;justify-content:center;gap:10px;';
            ['maj','min'].forEach(q => {
                const btn = document.createElement('button');
                btn.dataset.quality = q;
                btn.textContent = q === 'maj' ? 'MAJOR' : 'MINOR';
                btn.style.cssText = 'padding:8px 20px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.5);color:var(--text-main);font-family:var(--font-tech);font-weight:800;font-size:0.86rem;cursor:pointer;';
                if (this.quality === q) this._setButtonActive(btn, true, 'secondary');
                btn.addEventListener('click', () => {
                    this.quality = q;
                    qualitySection.querySelectorAll('button').forEach(b => this._setButtonActive(b, b === btn, 'secondary'));
                    this.updateVisualization();
                    this.playChord(this.getChordNotes(), 0.6);
                });
                qualitySection.appendChild(btn);
            });
            wrapper.appendChild(qualitySection);

            // Inversion buttons
            const invSection = document.createElement('div');
            invSection.className = 'inv-section';
            invSection.style.cssText = 'display:flex;justify-content:center;gap:8px;';
            ['Root','1st Inv','2nd Inv'].forEach((label, idx) => {
                const btn = document.createElement('button');
                btn.dataset.inv = String(idx);
                btn.textContent = label;
                btn.style.cssText = 'padding:8px 14px;border-radius:999px;border:1px solid rgba(255,255,255,0.18);background:rgba(0,0,0,0.45);color:var(--text-main);font-family:var(--font-tech);font-size:0.82rem;cursor:pointer;font-weight:700;';
                if (this.inversion === idx) this._setButtonActive(btn, true, 'chip');
                btn.addEventListener('click', () => {
                    this.inversion = idx;
                    invSection.querySelectorAll('button').forEach(b => this._setButtonActive(b, b === btn, 'chip'));
                    this.updateVisualization();
                    this.playChord(this.getChordNotes(), 0.7);
                });
                invSection.appendChild(btn);
            });
            wrapper.appendChild(invSection);

            // Chord summary + piano
            const chordSection = document.createElement('div');
            chordSection.className = 'inv-section';
            chordSection.style.cssText = 'background:rgba(0,0,0,0.4);border-radius:10px;border:1px solid var(--border-light);padding:14px;';

            const chordTitle = document.createElement('div');
            chordTitle.id = 'inv-chord-title';
            chordTitle.style.cssText = 'text-align:center;font-family:var(--font-tech);font-weight:900;font-size:1.1rem;color:var(--text-highlight);margin-bottom:2px;';
            chordSection.appendChild(chordTitle);

            const chordSub = document.createElement('div');
            chordSub.id = 'inv-chord-sub';
            chordSub.style.cssText = 'text-align:center;font-size:0.78rem;color:var(--text-muted);margin-bottom:8px;';
            chordSection.appendChild(chordSub);

            const pianoWrap = document.createElement('div');
            pianoWrap.id = 'inv-piano-wrap';
            pianoWrap.style.cssText = 'margin-top:6px;width:100%;display:flex;justify-content:center;overflow:hidden;';
            chordSection.appendChild(pianoWrap);

            const playBtn = document.createElement('button');
            playBtn.textContent = 'Play chord';
            playBtn.style.cssText = 'display:block;margin:10px auto 0;padding:8px 20px;border-radius:999px;border:none;background:linear-gradient(135deg,var(--accent-primary),#059669);color:#000;font-family:var(--font-tech);font-weight:800;font-size:0.9rem;cursor:pointer;';
            playBtn.addEventListener('click', () => this.playChord(this.getChordNotes(), 0.9));
            chordSection.appendChild(playBtn);

            wrapper.appendChild(chordSection);

            // Explanation / finger guide
            const insight = document.createElement('div');
            insight.className = 'inv-section';
            insight.style.cssText = 'background:rgba(16,185,129,0.1);border-radius:8px;border-left:3px solid var(--accent-primary);padding:12px;';

            const infoDiv = document.createElement('div');
            infoDiv.id = 'inversion-info';
            insight.appendChild(infoDiv);

            const fingerDiv = document.createElement('div');
            fingerDiv.id = 'inversion-finger-guide';
            fingerDiv.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);font-size:0.85rem;color:var(--text-main);';
            insight.appendChild(fingerDiv);

            wrapper.appendChild(insight);

            // Attach existing shared piano + render once
            this.renderPiano();
            this.updateVisualization();
        }

        // ---------- Static overview visuals (top of page) ----------

        renderMiniKeyboards() {
            const containers = this._miniKeyboards || {};
            const mapping = [containers.root, containers.first, containers.second];
            const whiteIndices = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
            const blackIndices = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

            // For each inversion, calculate actual MIDI notes and display them
            const inversions = [
                { label: 'Root', midiNotes: [60, 64, 67], rootMidi: 60 },    // C4, E4, G4
                { label: '1st', midiNotes: [64, 67, 72], rootMidi: 64 },    // E4, G4, C5
                { label: '2nd', midiNotes: [67, 72, 76], rootMidi: 67 }     // G4, C5, E5
            ];

            mapping.forEach((container, idx) => {
                if (!container) return;

                const keysContainer = container.querySelector('.inv-mini-keys-container');
                if (!keysContainer) {
                    const newContainer = document.createElement('div');
                    newContainer.className = 'inv-mini-keys-container';
                    container.insertBefore(newContainer, container.querySelector('.inv-mini-caption'));
                    return this.renderMiniKeyboards(); // Retry with new container
                }

                keysContainer.innerHTML = '';

                const inversion = inversions[idx];
                const { midiNotes, rootMidi } = inversion;

                // Create white keys container showing two octaves (C4-B4-C5)
                const whiteKeysRow = document.createElement('div');
                whiteKeysRow.className = 'inv-mini-white-keys';

                // Render 14 white keys (2 octaves worth)
                for (let octave = 0; octave < 2; octave++) {
                    whiteIndices.forEach(pc => {
                        const midiNote = 60 + (octave * 12) + pc;
                        const key = document.createElement('div');
                        key.className = 'inv-mini-key white';
                        key.dataset.midi = midiNote;

                        const isActive = midiNotes.includes(midiNote);
                        const isRootOfInversion = midiNote === rootMidi;

                        if (isActive) {
                            key.classList.add('active');
                        }
                        if (isRootOfInversion) {
                            key.classList.add('root');
                        }

                        whiteKeysRow.appendChild(key);
                    });
                }

                keysContainer.appendChild(whiteKeysRow);

                // Overlay black keys
                const blackOverlay = document.createElement('div');
                blackOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';

                // Black key positions between white keys
                const blackPositions = [
                    { pc: 1, offset: 0.75 },   // C#
                    { pc: 3, offset: 1.75 },   // D#
                    { pc: 6, offset: 3.75 },   // F#
                    { pc: 8, offset: 4.75 },   // G#
                    { pc: 10, offset: 5.75 }  // A#
                ];

                // Create black keys for two octaves
                for (let octave = 0; octave < 2; octave++) {
                    blackPositions.forEach(({ pc, offset }) => {
                        const midiNote = 60 + (octave * 12) + pc;
                        const blackKey = document.createElement('div');
                        blackKey.className = 'inv-mini-key black';
                        blackKey.dataset.midi = midiNote;

                        const isActive = midiNotes.includes(midiNote);
                        const isRootOfInversion = midiNote === rootMidi;

                        if (isActive) {
                            blackKey.classList.add('active');
                        }
                        if (isRootOfInversion) {
                            blackKey.classList.add('root');
                        }

                        const totalWhiteKeys = whiteIndices.length * 2;
                        // Compute pixel-based left offset so black keys center correctly
                        const blackKeyWidth = 10; // matches CSS .inv-mini-key.black width
                        const positionIndex = offset + (octave * 7);

                        // Prefer precise placement using rendered white key positions
                        const whiteKeyElems = whiteKeysRow.querySelectorAll('.inv-mini-key.white');
                        if (whiteKeyElems && whiteKeyElems.length > 1) {
                            const leftIndex = Math.floor(positionIndex);
                            const rightIndex = leftIndex + 1;
                            const containerRect = keysContainer.getBoundingClientRect();

                            if (rightIndex < whiteKeyElems.length) {
                                const leftRect = whiteKeyElems[leftIndex].getBoundingClientRect();
                                const rightRect = whiteKeyElems[rightIndex].getBoundingClientRect();
                                const centerPx = ((leftRect.left + (leftRect.width / 2)) + (rightRect.left + (rightRect.width / 2))) / 2;
                                const leftPx = Math.round(centerPx - containerRect.left - (blackKeyWidth / 2));
                                blackKey.style.left = `${leftPx}px`;
                            } else {
                                // Fallback: proportional placement
                                const containerWidth = containerRect.width || keysContainer.offsetWidth || 280;
                                const leftPx = Math.round((positionIndex / totalWhiteKeys) * containerWidth - (blackKeyWidth / 2));
                                blackKey.style.left = `${leftPx}px`;
                            }
                        } else {
                            // No white keys measured — fallback
                            const containerRect = keysContainer.getBoundingClientRect();
                            const containerWidth = containerRect.width || keysContainer.offsetWidth || 280;
                            const leftPx = Math.round((positionIndex / totalWhiteKeys) * containerWidth - (blackKeyWidth / 2));
                            blackKey.style.left = `${leftPx}px`;
                        }

                        blackOverlay.appendChild(blackKey);
                    });
                }

                keysContainer.appendChild(blackOverlay);

                // Position root arrow precisely over the root key
                const arrowExisting = container.querySelector('.inv-mini-root-arrow');
                if (arrowExisting) arrowExisting.remove();

                setTimeout(() => {
                    const rootKeyElement = keysContainer.querySelector(`[data-midi="${rootMidi}"].white`);
                    if (rootKeyElement) {
                        const arrow = document.createElement('div');
                        arrow.className = 'inv-mini-root-arrow';
                        arrow.textContent = '⬇';

                        // Calculate exact center of the root key
                        const keyRect = rootKeyElement.getBoundingClientRect();
                        const containerRect = keysContainer.getBoundingClientRect();
                        const keyCenter = keyRect.left + (keyRect.width / 2) - containerRect.left;

                        arrow.style.left = keyCenter + 'px';
                        keysContainer.style.position = 'relative';
                        keysContainer.appendChild(arrow);
                    }
                }, 10);
            });
        }

        buildStaticSheetExample(inversionIndex) {
            // Small inline SVG showing C major triad in each inversion.
            const width = 160;
            const height = 90;
            
            // Staff starts at y=40
            const staffLines = [40, 50, 60, 70, 80];
            
            // Note positions on staff (y coordinates)
            // Treble clef notes (bottom to top): E4(line), F4(space), G4(line), A4(space), B4(line), C5(space), D5(line), E5(space), F5(line)
            // E4 = on first line (80), G4 = second line (70), B4 = third line (60)
            // C5 = second space (55), E5 = first space (45)
            // C4 = below staff (90) with ledger line
            const notePos = {
                'C4': 90,  // Below staff
                'E4': 80,  // First line
                'G4': 70,  // Second line
                'C5': 55,  // Second space
                'E5': 45   // First space (between D5 line and F5 line)
            };

            let notes = []; // bottom -> top
            if (inversionIndex === 0) {
                notes = ['C4', 'E4', 'G4'];
            } else if (inversionIndex === 1) {
                notes = ['E4', 'G4', 'C5'];
            } else {
                notes = ['G4', 'C5', 'E5'];
            }

            const xCenter = 90;

            const notesHtml = notes.map((note, i) => {
                const y = notePos[note];
                const x = xCenter + (i * 10);
                // Root is always C (the root note of C major), not the lowest note
                const isRoot = note.startsWith('C');
                const fill = isRoot ? '#ff6b6b' : '#90ee90';  // Red for root (C), green for 3rd/5th (E, G)
                
                return `
                    <ellipse cx="${x}" cy="${y}" rx="5" ry="4" fill="${fill}" stroke="${fill}" stroke-width="1" />
                `;
            }).join('');

            // Ledger line for C4
            const ledgerLine = notes.includes('C4') 
                ? `<line x1="${xCenter - 8}" y1="90" x2="${xCenter + 18}" y2="90" stroke="#aaa" stroke-width="1.5" />`
                : '';

            // Arrow points to the root note (C), not the lowest note
            const rootNote = notes.find(n => n.startsWith('C'));
            const rootX = xCenter + (notes.indexOf(rootNote) * 10);
            const arrowY = notePos[rootNote] - 12;

            return `
                <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}">
                    <!-- Staff lines -->
                    ${staffLines.map(y => `<line x1="20" y1="${y}" x2="${width - 20}" y2="${y}" stroke="#999" stroke-width="1.5" />`).join('')}
                    
                    <!-- Treble clef -->
                    <text x="25" y="75" font-family="serif" font-size="40" fill="#bbb">𝄞</text>
                    
                    <!-- Ledger line -->
                    ${ledgerLine}
                    
                    <!-- Notes -->
                    ${notesHtml}
                    
                    <!-- Root arrow -->
                    <line x1="${rootX}" y1="${arrowY}" x2="${rootX}" y2="${arrowY + 8}" stroke="#ff6b6b" stroke-width="2" />
                    <polygon points="${rootX - 3},${arrowY + 8} ${rootX + 3},${arrowY + 8} ${rootX},${arrowY + 12}" fill="#ff6b6b" />
                </svg>
            `;
        }

        renderPiano() {
            const pianoContainer = document.getElementById('inv-piano-wrap');
            if (!pianoContainer) return;

            pianoContainer.innerHTML = '';
            
            // Build a dedicated, self-contained piano for inversions
            // No shared state, no external dependencies
            this._inversionPiano = this.createDedicatedPiano(pianoContainer);
            this.updatePianoHighlights();
        }
        
        /**
         * Create a simple, dedicated piano keyboard for inversions
         * Completely self-contained - no shared state issues
         */
        createDedicatedPiano(container) {
            const piano = document.createElement('div');
            piano.className = 'inv-dedicated-piano';
            piano.style.cssText = `
                position: relative;
                display: flex;
                justify-content: center;
                height: 140px;
                background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%);
                border-radius: 8px;
                padding: 12px 8px 8px 8px;
                box-shadow: inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3);
                border: 1px solid #333;
                overflow: hidden;
            `;
            
            const keysContainer = document.createElement('div');
            keysContainer.className = 'inv-piano-keys';
            keysContainer.style.cssText = `
                position: relative;
                display: flex;
                height: 120px;
            `;
            
            // Auto-adjust range: lowest chord note at left edge + small padding
            const chordNotes = this.getChordNotes();
            const lowestNote = Math.min(...chordNotes);
            const highestNote = Math.max(...chordNotes);
            
            // Start from the lowest note with minimal padding (1 white key = 2 semitones on either side)
            // This ensures all chord notes are visible, with root/3rd/5th at or near the left edge
            let startMidi = lowestNote - 2; // Minimal padding
            startMidi = Math.max(36, startMidi); // Don't go below C2
            
            // Ensure we have enough width to show all notes (2+ octaves)
            const endMidi = Math.max(startMidi + 24, highestNote + 5);
            
            // White key positions (C, D, E, F, G, A, B pattern)
            const whiteKeyPattern = [0, 2, 4, 5, 7, 9, 11];
            const blackKeyPattern = [1, 3, -1, 6, 8, 10, -1]; // -1 = no black key after E and B
            
            let whiteKeyCount = 0;

            // Create white keys using flex so widths adapt to container size
            for (let midi = startMidi; midi < endMidi; midi++) {
                const noteInOctave = midi % 12;
                if (whiteKeyPattern.includes(noteInOctave)) {
                    const key = this.createPianoKey(midi, 'white', null, whiteKeyCount);
                    keysContainer.appendChild(key);
                    whiteKeyCount++;
                }
            }

            piano.appendChild(keysContainer);
            container.appendChild(piano);

            // After layout, measure white key positions and insert black keys sized relative to white keys
            setTimeout(() => {
                const whiteElems = keysContainer.querySelectorAll('.inv-piano-white-key');
                const containerRect = keysContainer.getBoundingClientRect();

                for (let i = 0; i < whiteElems.length - 1; i++) {
                    const cur = whiteElems[i];
                    const next = whiteElems[i + 1];
                    const curMidi = Number(cur.dataset.midi);
                    const nextMidi = Number(next.dataset.midi);

                    // If there's a semitone between the two white keys, place a black key
                    if (nextMidi - curMidi > 1) {
                        const leftRect = cur.getBoundingClientRect();
                        const rightRect = next.getBoundingClientRect();
                        const centerPx = ((leftRect.left + (leftRect.width / 2)) + (rightRect.left + (rightRect.width / 2))) / 2;

                        // Black key width proportional to white key (cap to reasonable px)
                        const whiteW = leftRect.width;
                        const blackW = Math.max(8, Math.min(24, Math.round(whiteW * 0.56)));
                        const leftPx = Math.round(centerPx - containerRect.left - (blackW / 2));

                        const blackMidi = curMidi + 1;
                        const key = this.createPianoKey(blackMidi, 'black', blackW, leftPx);
                        keysContainer.appendChild(key);
                    }
                }
            }, 0);
            
            return { element: piano, startMidi, endMidi };
        }
        
        createPianoKey(midi, type, width, position) {
            const key = document.createElement('div');
            key.className = `inv-piano-key inv-piano-${type}-key`;
            key.dataset.midi = midi;
            key.dataset.note = this.midiToNoteName(midi);
            
            const isWhite = type === 'white';
            
            if (isWhite) {
                // If width is null, let white keys flex to fill the container (responsive)
                if (width == null) {
                    key.style.cssText = `
                        flex: 1 1 0;
                        height: 100%;
                        background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 85%, #d8d8d8 100%);
                        border: 1px solid #999;
                        border-radius: 0 0 5px 5px;
                        box-shadow: inset 0 -3px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2);
                        cursor: pointer;
                        transition: background 0.1s, transform 0.05s;
                        position: relative;
                        z-index: 1;
                    `;
                } else {
                    key.style.cssText = `
                        width: ${width}px;
                        height: 100%;
                        background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 85%, #d8d8d8 100%);
                        border: 1px solid #999;
                        border-radius: 0 0 5px 5px;
                        box-shadow: inset 0 -3px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2);
                        cursor: pointer;
                        transition: background 0.1s, transform 0.05s;
                        position: relative;
                        z-index: 1;
                    `;
                }
            } else {
                key.style.cssText = `
                    position: absolute;
                    left: ${position}px;
                    width: ${width}px;
                    height: 65%;
                    background: linear-gradient(180deg, #3a3a3a 0%, #1a1a1a 60%, #000000 100%);
                    border: 1px solid #000;
                    border-radius: 0 0 4px 4px;
                    box-shadow: inset 0 -2px 4px rgba(255,255,255,0.1), 2px 3px 6px rgba(0,0,0,0.5);
                    cursor: pointer;
                    transition: background 0.1s, transform 0.05s;
                    z-index: 2;
                `;
            }
            
            // Click handler - play note
            key.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`[InversionPiano] Key clicked: ${midi} (${this.midiToNoteName(midi)})`);
                this.playNote(midi, { duration: 0.5, velocity: 0.9 });
                
                // Visual feedback
                const originalBg = key.style.background;
                key.style.transform = 'scaleY(0.98)';
                key.style.background = isWhite 
                    ? 'linear-gradient(180deg, #e0e0e0 0%, #c8c8c8 100%)'
                    : 'linear-gradient(180deg, #2a2a2a 0%, #000000 100%)';
                
                setTimeout(() => {
                    key.style.transform = '';
                    // Restore either the original or the highlighted state
                    this.updatePianoHighlights();
                }, 100);
            });
            
            // Hover effect
            key.addEventListener('mouseenter', () => {
                if (!key.classList.contains('inv-highlighted')) {
                    key.style.filter = 'brightness(0.95)';
                }
            });
            key.addEventListener('mouseleave', () => {
                key.style.filter = '';
            });
            
            return key;
        }
        
        updatePianoHighlights() {
            const container = document.getElementById('inv-piano-wrap');
            if (!container) return;
            
            // Reset all keys first
            container.querySelectorAll('.inv-piano-key').forEach(key => {
                key.classList.remove('inv-highlighted');
                const isWhite = key.classList.contains('inv-piano-white-key');
                
                // Remove any existing label
                const existingLabel = key.querySelector('.inv-degree-label');
                if (existingLabel) existingLabel.remove();
                
                // Reset to default styling
                if (isWhite) {
                    key.style.background = 'linear-gradient(180deg, #ffffff 0%, #f0f0f0 85%, #d8d8d8 100%)';
                    key.style.boxShadow = 'inset 0 -3px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)';
                    key.style.borderColor = '#999';
                } else {
                    key.style.background = 'linear-gradient(180deg, #3a3a3a 0%, #1a1a1a 60%, #000000 100%)';
                    key.style.boxShadow = 'inset 0 -2px 4px rgba(255,255,255,0.1), 2px 3px 6px rgba(0,0,0,0.5)';
                    key.style.borderColor = '#000';
                }
            });
            
            // Highlight chord notes with voice-specific colors
            const chordNotes = this.getChordNotes();
            const rootPitchClass = this.rootMidi % 12;
            const thirdOffset = this.quality === 'maj' ? 4 : 3;
            const fifthOffset = 7;
            
            chordNotes.forEach(midi => {
                const key = container.querySelector(`[data-midi="${midi}"]`);
                if (!key) return;
                
                key.classList.add('inv-highlighted');
                const isWhite = key.classList.contains('inv-piano-white-key');
                const pitchClass = midi % 12;
                
                // Determine which voice this is
                let color, label, textColor;
                if (pitchClass === rootPitchClass) {
                    // Root - Green
                    color = isWhite 
                        ? 'linear-gradient(180deg, #34d399 0%, #10b981 60%, #059669 100%)'
                        : 'linear-gradient(180deg, #10b981 0%, #059669 100%)';
                    label = '1';
                    textColor = '#000';
                } else if (pitchClass === (rootPitchClass + thirdOffset) % 12) {
                    // Third - Yellow/Orange
                    color = isWhite
                        ? 'linear-gradient(180deg, #fcd34d 0%, #fbbf24 60%, #f59e0b 100%)'
                        : 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)';
                    label = '3';
                    textColor = '#000';
                } else if (pitchClass === (rootPitchClass + fifthOffset) % 12) {
                    // Fifth - Blue
                    color = isWhite
                        ? 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 60%, #2563eb 100%)'
                        : 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)';
                    label = '5';
                    textColor = '#fff';
                } else {
                    color = isWhite ? 'linear-gradient(180deg, #a5b4fc 0%, #818cf8 100%)' : 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)';
                    label = '?';
                    textColor = '#000';
                }
                
                key.style.background = color;
                key.style.boxShadow = isWhite
                    ? '0 0 20px rgba(16,185,129,0.5), inset 0 -3px 6px rgba(0,0,0,0.2)'
                    : '0 0 16px rgba(16,185,129,0.5), inset 0 -2px 4px rgba(255,255,255,0.2)';
                key.style.borderColor = 'transparent';
                
                // Add degree label
                const labelEl = document.createElement('div');
                labelEl.className = 'inv-degree-label';
                labelEl.textContent = label;
                labelEl.style.cssText = `
                    position: absolute;
                    bottom: ${isWhite ? '8px' : '6px'};
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: ${isWhite ? '1.2rem' : '0.9rem'};
                    font-weight: 900;
                    color: ${textColor};
                    font-family: var(--font-tech);
                    pointer-events: none;
                    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                `;
                key.appendChild(labelEl);
            });
        }

        setupPianoKeyHandlers() {
            // Legacy method - now handled inline above
        }

        addVoiceLeadingSection(parentEl) {
            const vlWrapper = document.createElement('div');
            vlWrapper.style.cssText = 'margin: 32px 0; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-light); overflow: hidden;';
            parentEl.appendChild(vlWrapper);

            const vlToggle = document.createElement('button');
            vlToggle.style.cssText = 'width: 100%; padding: 20px; background: rgba(0,0,0,0.3); border: none; color: var(--text-main); cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;';
            vlToggle.innerHTML = `
                <div>
                    <div style="font-size: 1.3rem; font-weight: 800; font-family: var(--font-tech); color: var(--accent-primary); margin-bottom: 6px;">🎼 Voice Leading Examples</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">6 before/after comparisons • Click to expand</div>
                </div>
                <span style="font-size: 1.5rem; transition: transform 0.2s;">▼</span>
            `;
            vlWrapper.appendChild(vlToggle);

            const vlSection = document.createElement('div');
            vlSection.style.cssText = `
                display: none;
                padding: 32px 24px;
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.12));
            `;
            vlWrapper.appendChild(vlSection);

            let vlOpen = false;
            vlToggle.addEventListener('click', () => {
                vlOpen = !vlOpen;
                vlSection.style.display = vlOpen ? 'block' : 'none';
                const arrow = vlToggle.querySelector('span:last-child');
                arrow.style.transform = vlOpen ? 'rotate(180deg)' : '';
                vlToggle.style.background = vlOpen ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';
            });
            
            const vlTitle = document.createElement('h2');
            vlTitle.style.cssText = `
                color: var(--text-highlight);
                font-size: 1.8rem;
                font-weight: 900;
                margin-bottom: 16px;
                text-align: center;
                font-family: var(--font-tech);
                text-transform: uppercase;
            `;
            vlTitle.innerHTML = '🎼 Voice Leading: See & Hear the Difference';
            vlSection.appendChild(vlTitle);
            
            const vlSubtitle = document.createElement('p');
            vlSubtitle.style.cssText = `
                text-align: center;
                color: var(--text-main);
                margin-bottom: 32px;
                font-size: 1rem;
                max-width: 700px;
                margin-left: auto;
                margin-right: auto;
                line-height: 1.7;
            `;
            vlSubtitle.innerHTML = 'Watch how <strong style="color: var(--accent-primary);">chord tones move</strong> (or don\'t move!) between inversions. <strong style="color: var(--accent-secondary);">Good voice leading</strong> minimizes jumps and creates smooth, connected progressions.';
            vlSection.appendChild(vlSubtitle);

            // Initialize scale helper if not already done
            if (typeof ScaleHelper !== 'undefined' && !this._scaleHelper) {
                this._scaleHelper = new ScaleHelper();
            }

            // Scale/Key Selector Panel
            const scalePanel = document.createElement('div');
            scalePanel.style.cssText = `
                background: rgba(0,0,0,0.3);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 24px;
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                justify-content: center;
                align-items: center;
                border: 1px solid var(--border-light);
            `;
            vlSection.appendChild(scalePanel);

            // Key selector
            const keyLabel = document.createElement('label');
            keyLabel.style.cssText = 'font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600;';
            keyLabel.textContent = 'Key:';
            scalePanel.appendChild(keyLabel);

            const keySelect = document.createElement('select');
            keySelect.style.cssText = `
                padding: 8px 12px;
                background: rgba(0,0,0,0.4);
                border: 1px solid var(--border-light);
                border-radius: 6px;
                color: var(--text-main);
                font-family: var(--font-tech);
                cursor: pointer;
                font-size: 0.9rem;
            `;
            const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'D#', 'F#', 'G#', 'A#'];
            keys.forEach(key => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = key;
                if (key === 'C') option.selected = true;
                keySelect.appendChild(option);
            });
            scalePanel.appendChild(keySelect);

            // Scale selector
            const scaleLabel = document.createElement('label');
            scaleLabel.style.cssText = 'font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-left: 16px;';
            scaleLabel.textContent = 'Scale:';
            scalePanel.appendChild(scaleLabel);

            const scaleSelect = document.createElement('select');
            scaleSelect.style.cssText = `
                padding: 8px 12px;
                background: rgba(0,0,0,0.4);
                border: 1px solid var(--border-light);
                border-radius: 6px;
                color: var(--text-main);
                font-family: var(--font-tech);
                cursor: pointer;
                font-size: 0.9rem;
            `;
            if (this._scaleHelper) {
                this._scaleHelper.getAvailableScales().forEach(scale => {
                    const option = document.createElement('option');
                    option.value = scale.key;
                    option.textContent = scale.name;
                    if (scale.key === 'major') option.selected = true;
                    scaleSelect.appendChild(option);
                });
            }
            scalePanel.appendChild(scaleSelect);

            // Store references for scale/key selection
            this._vlKeySelect = keySelect;
            this._vlScaleSelect = scaleSelect;
            this._vlCurrentKey = 'C';
            this._vlCurrentScale = 'major';

            // Event listeners for scale/key selectors
            keySelect.addEventListener('change', (e) => {
                this._vlCurrentKey = e.target.value;
                this.updateVoiceLeadingExamples();
            });

            scaleSelect.addEventListener('change', (e) => {
                this._vlCurrentScale = e.target.value;
                this.updateVoiceLeadingExamples();
            });

            // Display current scale info
            const scaleInfo = document.createElement('div');
            scaleInfo.id = 'vl-scale-info';
            scaleInfo.style.cssText = 'padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 0.8rem; color: var(--text-muted); margin-left: auto;';
            scaleInfo.textContent = 'Examples in C Major';
            scalePanel.appendChild(scaleInfo);
            
            // Comparison Grid
            const comparisonGrid = document.createElement('div');
            comparisonGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                gap: 24px;
                margin-top: 24px;
            `;
            
            const comparisons = [
                {
                    title: '❌ BAD: Jumping Bass',
                    desc: 'All root position - bass leaps around',
                    progression: [
                        { root: 60, type: 'major', inv: 0, label: 'C' },
                        { root: 65, type: 'major', inv: 0, label: 'F' },
                        { root: 67, type: 'major', inv: 0, label: 'G' },
                        { root: 60, type: 'major', inv: 0, label: 'C' }
                    ],
                    color: '#ef4444'
                },
                {
                    title: '✅ GOOD: Smooth Bass',
                    desc: 'Mixed inversions - bass moves stepwise',
                    progression: [
                        { root: 60, type: 'major', inv: 0, label: 'C' },
                        { root: 65, type: 'major', inv: 2, label: 'F/C' },
                        { root: 67, type: 'major', inv: 1, label: 'G/B' },
                        { root: 60, type: 'major', inv: 0, label: 'C' }
                    ],
                    color: '#10b981'
                },
                {
                    title: '❌ BAD: Hand Jumps',
                    desc: 'Forces hand to relocate constantly',
                    progression: [
                        { root: 60, type: 'major', inv: 0, label: 'C' },
                        { root: 57, type: 'minor', inv: 0, label: 'Am' },
                        { root: 65, type: 'major', inv: 0, label: 'F' },
                        { root: 67, type: 'major', inv: 0, label: 'G' }
                    ],
                    color: '#ef4444'
                },
                {
                    title: '✅ GOOD: Hand Stays Put',
                    desc: 'Fingers barely move between chords',
                    progression: [
                        { root: 60, type: 'major', inv: 0, label: 'C' },
                        { root: 57, type: 'minor', inv: 1, label: 'Am/C' },
                        { root: 65, type: 'major', inv: 1, label: 'F/A' },
                        { root: 67, type: 'major', inv: 1, label: 'G/B' }
                    ],
                    color: '#10b981'
                },
                {
                    title: '❌ BAD: Choppy Motion',
                    desc: 'Disconnected, no melodic flow',
                    progression: [
                        { root: 60, type: 'major', inv: 0, label: 'C' },
                        { root: 62, type: 'minor', inv: 0, label: 'Dm' },
                        { root: 67, type: 'major', inv: 0, label: 'G' },
                        { root: 60, type: 'major', inv: 0, label: 'C' }
                    ],
                    color: '#ef4444'
                },
                {
                    title: '✅ GOOD: Melodic Flow',
                    desc: 'Creates a singing top line',
                    progression: [
                        { root: 60, type: 'major', inv: 0, label: 'C' },
                        { root: 62, type: 'minor', inv: 1, label: 'Dm/F' },
                        { root: 67, type: 'major', inv: 2, label: 'G/D' },
                        { root: 60, type: 'major', inv: 0, label: 'C' }
                    ],
                    color: '#10b981'
                }
            ];
            
            comparisons.forEach(comp => {
                const compCard = document.createElement('div');
                compCard.style.cssText = `
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.3);
                    border: 2px solid ${comp.color}60;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                `;
                
                const cardTitle = document.createElement('h3');
                cardTitle.style.cssText = `
                    font-size: 1.1rem;
                    font-weight: 800;
                    margin-bottom: 8px;
                    color: ${comp.color};
                    font-family: var(--font-tech);
                `;
                cardTitle.textContent = comp.title;
                compCard.appendChild(cardTitle);
                
                const cardDesc = document.createElement('p');
                cardDesc.style.cssText = `
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    margin-bottom: 16px;
                    line-height: 1.5;
                `;
                cardDesc.textContent = comp.desc;
                compCard.appendChild(cardDesc);
                
                // Chord sequence display
                const chordSeq = document.createElement('div');
                chordSeq.style.cssText = `
                    display: flex;
                    gap: 8px;
                    margin-bottom: 16px;
                    align-items: center;
                    justify-content: center;
                    flex-wrap: wrap;
                `;
                
                comp.progression.forEach((chord, idx) => {
                    if (idx > 0) {
                        const arrow = document.createElement('span');
                        arrow.style.cssText = 'color: var(--text-muted); font-size: 1.2rem;';
                        arrow.textContent = '→';
                        chordSeq.appendChild(arrow);
                    }
                    
                    const chordLabel = document.createElement('span');
                    chordLabel.style.cssText = `
                        padding: 6px 12px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 6px;
                        font-weight: 700;
                        font-size: 0.9rem;
                        color: var(--accent-primary);
                        font-family: var(--font-tech);
                    `;
                    chordLabel.textContent = chord.label;
                    chordSeq.appendChild(chordLabel);
                });
                
                compCard.appendChild(chordSeq);
                
                // Play button
                const playBtn = document.createElement('button');
                playBtn.innerHTML = '▶ Play';
                playBtn.style.cssText = `
                    width: 100%;
                    padding: 12px;
                    background: ${comp.color}30;
                    border: 2px solid ${comp.color};
                    border-radius: 8px;
                    color: ${comp.color};
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: var(--font-tech);
                    font-size: 0.95rem;
                `;
                
                playBtn.addEventListener('mouseenter', () => {
                    playBtn.style.background = comp.color;
                    playBtn.style.color = '#000';
                    playBtn.style.transform = 'scale(1.02)';
                });
                
                playBtn.addEventListener('mouseleave', () => {
                    playBtn.style.background = `${comp.color}30`;
                    playBtn.style.color = comp.color;
                    playBtn.style.transform = 'scale(1)';
                });
                
                playBtn.addEventListener('click', () => {
                    playBtn.innerHTML = '▶ Playing...';
                    this.playSequence(comp.progression, comp.title, () => {
                        setTimeout(() => {
                            playBtn.innerHTML = '▶ Play';
                        }, 500);
                    }, {
                        chordDuration: 1500, // 1.5 seconds per chord for voice leading
                        sustainTime: 1.5,
                        noteAttackTime: 0.05,
                        noteReleaseTime: 0.5
                    });
                });
                
                compCard.appendChild(playBtn);
                
                compCard.addEventListener('mouseenter', () => {
                    compCard.style.borderColor = comp.color;
                    compCard.style.transform = 'translateY(-4px)';
                    compCard.style.boxShadow = `0 8px 24px ${comp.color}40`;
                });
                
                compCard.addEventListener('mouseleave', () => {
                    compCard.style.borderColor = `${comp.color}60`;
                    compCard.style.transform = 'translateY(0)';
                    compCard.style.boxShadow = 'none';
                });
                
                comparisonGrid.appendChild(compCard);
            });
            
            vlSection.appendChild(comparisonGrid);
            parentEl.appendChild(vlSection);
        }

        addMIDIExamplesSection(parentEl) {
            const examplesWrapper = document.createElement('div');
            examplesWrapper.style.cssText = 'margin: 32px 0; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-light); overflow: hidden;';
            parentEl.appendChild(examplesWrapper);

            const examplesToggle = document.createElement('button');
            examplesToggle.style.cssText = 'width: 100%; padding: 20px; background: rgba(0,0,0,0.3); border: none; color: var(--text-main); cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;';
            examplesToggle.innerHTML = `
                <div>
                    <div style="font-size: 1.3rem; font-weight: 800; font-family: var(--font-tech); color: var(--accent-primary); margin-bottom: 6px;">🎵 Musical Examples</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">24 real-world examples • Click to expand</div>
                </div>
                <span style="font-size: 1.5rem; transition: transform 0.2s;">▼</span>
            `;
            examplesWrapper.appendChild(examplesToggle);

            const examplesSection = document.createElement('div');
            examplesSection.style.cssText = `
                display: none;
                padding: 32px;
                background: linear-gradient(180deg, rgba(16, 185, 129, 0.08), rgba(139, 92, 246, 0.08));
            `;
            examplesWrapper.appendChild(examplesSection);

            let examplesOpen = false;
            examplesToggle.addEventListener('click', () => {
                examplesOpen = !examplesOpen;
                examplesSection.style.display = examplesOpen ? 'block' : 'none';
                const arrow = examplesToggle.querySelector('span:last-child');
                arrow.style.transform = examplesOpen ? 'rotate(180deg)' : '';
                examplesToggle.style.background = examplesOpen ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';
            });
            
            const examplesTitle = document.createElement('h2');
            examplesTitle.style.cssText = `
                color: var(--text-highlight);
                font-size: 1.8rem;
                font-weight: 900;
                margin-bottom: 12px;
                text-align: center;
                font-family: var(--font-tech);
                text-transform: uppercase;
            `;
            examplesTitle.textContent = '🎵 Hear Why Inversions Matter';
            examplesSection.appendChild(examplesTitle);
            
            const subtitle = document.createElement('p');
            subtitle.style.cssText = `
                text-align: center;
                color: var(--text-main);
                margin-bottom: 28px;
                font-size: 1rem;
                line-height: 1.6;
            `;
            subtitle.innerHTML = 'Click any button to hear <strong style="color: var(--accent-primary);">real musical examples</strong> demonstrating how inversions improve your playing.';
            examplesSection.appendChild(subtitle);
            
            const examplesGrid = document.createElement('div');
            examplesGrid.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 16px;
                margin-top: 20px;
            `;
            
            const examples = [
                {
                    title: 'Smooth Bass Line',
                    desc: 'Compare jumping bass vs. stepwise bass using inversions',
                    category: 'basics',
                    action: () => this.playExample_SmoothBass()
                },
                {
                    title: 'I-IV-V Progression',
                    desc: 'Classic progression with voice leading (C-F-G)',
                    category: 'progressions',
                    action: () => this.playExample_IIVVProgression()
                },
                {
                    title: 'Voice Leading',
                    desc: 'Minimize hand movement between chords',
                    category: 'basics',
                    action: () => this.playExample_VoiceLeading()
                },
                {
                    title: 'I-vi-IV-V (Pop)',
                    desc: 'Ultra-common pop progression optimized',
                    category: 'progressions',
                    action: () => this.playExample_PopProgression()
                },
                {
                    title: 'Smooth Descending Bass',
                    desc: 'C-Am-F-G with descending bassline',
                    category: 'bass',
                    action: () => this.playExample_DescendingBass()
                },
                {
                    title: 'Jazz Voicings',
                    desc: 'ii-V-I with professional spacing',
                    category: 'jazz',
                    action: () => this.playExample_JazzVoicings()
                },
                {
                    title: 'Cadential 6/4',
                    desc: 'Classical 2nd inversion before V',
                    category: 'classical',
                    action: () => this.playExample_Cadential64()
                },
                {
                    title: 'Pedal Point',
                    desc: 'Sustained bass with changing chords',
                    category: 'advanced',
                    action: () => this.playExample_PedalPoint()
                },
                {
                    title: 'Passing Chords',
                    desc: 'Use inversions to connect harmonies smoothly',
                    category: 'advanced',
                    action: () => this.playExample_PassingChords()
                },
                {
                    title: 'Circle of Fifths',
                    desc: 'Navigate key changes smoothly',
                    category: 'progressions',
                    action: () => this.playExample_CircleOfFifths()
                },
                {
                    title: 'Hand Position Efficiency',
                    desc: 'Stay in one position vs. constant jumping',
                    category: 'practical',
                    action: () => this.playExample_HandEfficiency()
                },
                {
                    title: 'Before vs After',
                    desc: 'Same progression: All root vs. Mixed inversions',
                    category: 'comparison',
                    action: () => this.playExample_BeforeAfter()
                },
                {
                    title: 'Chord Stability',
                    desc: 'Hear how inversions change chord weight',
                    category: 'theory',
                    action: () => this.playExample_ChordStability()
                },
                {
                    title: 'Canon in D Pattern',
                    desc: 'Famous progression with optimal voicings',
                    category: 'classical',
                    action: () => this.playExample_CanonInD()
                },
                {
                    title: 'Blues Progression',
                    desc: '12-bar blues with walking bass',
                    category: 'jazz',
                    action: () => this.playExample_BluesProgression()
                },
                {
                    title: 'Parallel Motion',
                    desc: 'Avoid parallel fifths with inversions',
                    category: 'theory',
                    action: () => this.playExample_ParallelMotion()
                },
                {
                    title: 'Arpeggiated Inversions',
                    desc: 'Broken chords across the keyboard',
                    category: 'practical',
                    action: () => this.playExample_Arpeggios()
                },
                {
                    title: 'Ballad Voicings',
                    desc: 'Emotional chord changes (like "Let It Be")',
                    category: 'pop',
                    action: () => this.playExample_BalladVoicings()
                },
                {
                    title: 'Close vs Open Voicings',
                    desc: 'Compare tight vs spread-out chords',
                    category: 'theory',
                    action: () => this.playExample_CloseVsOpen()
                },
                {
                    title: 'Bass Line Composer',
                    desc: 'Create your own walking bass with inversions',
                    category: 'interactive',
                    action: () => this.playExample_BassComposer()
                },
                {
                    title: 'Hymn Style',
                    desc: 'Traditional 4-part harmony movement',
                    category: 'classical',
                    action: () => this.playExample_HymnStyle()
                },
                {
                    title: 'Stride Piano',
                    desc: 'Left hand jumps vs. inversions',
                    category: 'jazz',
                    action: () => this.playExample_StridePiano()
                },
                {
                    title: 'Suspended Resolution',
                    desc: 'sus4 chords resolving through inversions',
                    category: 'advanced',
                    action: () => this.playExample_SuspendedResolution()
                },
                {
                    title: 'Modal Interchange',
                    desc: 'Borrow chords from parallel keys smoothly',
                    category: 'advanced',
                    action: () => this.playExample_ModalInterchange()
                }
            ];
            
            const categoryColors = {
                'basics': '#10b981',
                'progressions': '#3b82f6',
                'bass': '#8b5cf6',
                'jazz': '#f59e0b',
                'classical': '#ec4899',
                'advanced': '#ef4444',
                'practical': '#14b8a6',
                'comparison': '#06b6d4',
                'theory': '#6366f1',
                'pop': '#f97316',
                'interactive': '#84cc16'
            };
            
            examples.forEach(ex => {
                const exampleBtn = document.createElement('button');
                const categoryColor = categoryColors[ex.category] || '#10b981';
                
                exampleBtn.style.cssText = `
                    padding: 16px;
                    background: rgba(0, 0, 0, 0.4);
                    border: 2px solid ${categoryColor}60;
                    border-radius: 12px;
                    color: var(--text-main);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: left;
                    font-family: var(--font-tech);
                `;
                
                exampleBtn.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${categoryColor};"></div>
                        <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-highlight);">${ex.title}</div>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">${ex.desc}</div>
                    <div style="margin-top: 8px; font-size: 0.7rem; color: ${categoryColor}; text-transform: uppercase; letter-spacing: 1px;">${ex.category}</div>
                `;
                
                exampleBtn.addEventListener('mouseenter', () => {
                    exampleBtn.style.borderColor = categoryColor;
                    exampleBtn.style.transform = 'translateY(-4px)';
                    exampleBtn.style.boxShadow = `0 8px 20px ${categoryColor}40`;
                });
                
                exampleBtn.addEventListener('mouseleave', () => {
                    exampleBtn.style.borderColor = `${categoryColor}60`;
                    exampleBtn.style.transform = 'translateY(0)';
                    exampleBtn.style.boxShadow = 'none';
                });
                
                exampleBtn.addEventListener('click', () => {
                    // Visual feedback
                    exampleBtn.style.background = `${categoryColor}20`;
                    setTimeout(() => {
                        exampleBtn.style.background = 'rgba(0, 0, 0, 0.4)';
                    }, 200);
                    
                    ex.action();
                });
                
                examplesGrid.appendChild(exampleBtn);
            });
            
            examplesSection.appendChild(examplesGrid);
            // examplesWrapper is already appended to parentEl at the start of this method
        }

        // MIDI Example Methods - Real musical demonstrations
        playExample_SmoothBass() {
            // C Major progression: C -> F -> G -> C
            // Compare: All root position vs. using inversions
            const progression = [
                { root: 60, type: 'major', inv: 0 }, // C root
                { root: 65, type: 'major', inv: 0 }, // F root (bass jumps up 5)
                { root: 67, type: 'major', inv: 0 }, // G root (bass up 2)
                { root: 60, type: 'major', inv: 0 }  // C root (bass down 7!)
            ];
            
            this.playSequence(progression, 'Without inversions - notice the jumping bass', () => {
                // Now with inversions
                const smoothProgression = [
                    { root: 60, type: 'major', inv: 0 }, // C root (C E G)
                    { root: 65, type: 'major', inv: 2 }, // F 2nd inv (C F A) - bass stays on C!
                    { root: 67, type: 'major', inv: 1 }, // G 1st inv (B D G) - bass moves down to B
                    { root: 60, type: 'major', inv: 0 }  // C root (C E G) - bass up to C (step of 2)
                ];
                
                setTimeout(() => {
                    this.playSequence(smoothProgression, 'With inversions - smooth bass movement');
                }, 3000);
            });
        }

        playExample_IIVVProgression() {
            // Classic I-IV-V in C with optimal voice leading
            const progression = [
                { root: 60, type: 'major', inv: 0 }, // C (C E G)
                { root: 65, type: 'major', inv: 1 }, // F/A (A C F)
                { root: 67, type: 'major', inv: 1 }, // G/B (B D G)
                { root: 60, type: 'major', inv: 0 }  // C (C E G)
            ];
            
            this.playSequence(progression, 'I-IV-V with voice leading');
        }

        playExample_VoiceLeading() {
            // Demonstrate minimal hand movement
            const progression = [
                { root: 60, type: 'major', inv: 0 }, // C (60 64 67)
                { root: 57, type: 'minor', inv: 1 }, // Am/C (60 64 69) - only one note moves!
                { root: 65, type: 'major', inv: 1 }, // F/A (65 69 72) - smooth motion
                { root: 67, type: 'major', inv: 0 }  // G (67 71 74)
            ];
            
            this.playSequence(progression, 'Minimal hand movement with voice leading');
        }

        playExample_PopProgression() {
            // I-vi-IV-V (C-Am-F-G) - mega-popular
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 57, type: 'minor', inv: 1 },
                { root: 65, type: 'major', inv: 0 },
                { root: 67, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'I-vi-IV-V Pop Progression');
        }

        playExample_DescendingBass() {
            // Bass descends: C -> A -> F -> G
            const progression = [
                { root: 60, type: 'major', inv: 0 }, // C (C E G)
                { root: 57, type: 'minor', inv: 2 }, // Am/E (E A C)
                { root: 65, type: 'major', inv: 2 }, // F/C (C F A)
                { root: 67, type: 'major', inv: 1 }  // G/B (B D G)
            ];
            
            this.playSequence(progression, 'Descending bass line: C → B → A → G');
        }

        playExample_JazzVoicings() {
            // ii-V-I in C (Dm7-G7-Cmaj7 feel)
            const progression = [
                { root: 62, type: 'minor', inv: 1 },
                { root: 67, type: 'major', inv: 2 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Jazz ii-V-I voicings');
        }

        playExample_Cadential64() {
            // Classical cadential 6/4: I - I(2nd inv) - V - I
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 2 }, // Tense 2nd inversion
                { root: 67, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Classical Cadential 6/4');
        }

        playExample_PedalPoint() {
            // C bass sustained, chords change above
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 2 }, // F with C bass
                { root: 67, type: 'major', inv: 2 }, // G with C bass (tension!)
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Pedal point on C');
        }

        playExample_PassingChords() {
            // Smooth chromatic movement
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 64, type: 'major', inv: 1 }, // E as passing
                { root: 65, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Passing chords with inversions');
        }

        playExample_CircleOfFifths() {
            // C -> F -> Bb -> Eb with voice leading
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 1 },
                { root: 58, type: 'major', inv: 2 },
                { root: 63, type: 'major', inv: 1 }
            ];
            
            this.playSequence(progression, 'Circle of fifths with voice leading');
        }

        playExample_HandEfficiency() {
            // Stay in same hand position
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 2 },
                { root: 67, type: 'major', inv: 2 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Hand stays in position');
        }

        playExample_BeforeAfter() {
            const rootOnly = [
                { root: 60, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 0 },
                { root: 67, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(rootOnly, 'All root position (choppy)', () => {
                const withInversions = [
                    { root: 60, type: 'major', inv: 0 },
                    { root: 65, type: 'major', inv: 1 },
                    { root: 67, type: 'major', inv: 1 },
                    { root: 60, type: 'major', inv: 0 }
                ];
                
                setTimeout(() => {
                    this.playSequence(withInversions, 'With inversions (smooth!)');
                }, 2500);
            });
        }

        playExample_ChordStability() {
            // Same chord, different inversions - feel the weight
            const chordMidi = 60;
            const sequence = [
                { root: chordMidi, type: 'major', inv: 0 },
                { root: chordMidi, type: 'major', inv: 1 },
                { root: chordMidi, type: 'major', inv: 2 },
                { root: chordMidi, type: 'major', inv: 0 }
            ];
            
            this.playSequence(sequence, 'Root = stable, 2nd inversion = unstable');
        }

        playExample_CanonInD() {
            // Pachelbel's Canon progression: D-A-Bm-F#m-G-D-G-A
            const progression = [
                { root: 62, type: 'major', inv: 0 }, // D
                { root: 57, type: 'major', inv: 2 }, // A/E
                { root: 59, type: 'minor', inv: 1 }, // Bm/D
                { root: 54, type: 'minor', inv: 2 }  // F#m/C#
            ];
            
            this.playSequence(progression, 'Canon in D pattern');
        }

        playExample_BluesProgression() {
            // 12-bar blues excerpt with walking bass feel
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 1 },
                { root: 65, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 2 }
            ];
            
            this.playSequence(progression, 'Blues with walking bass');
        }

        playExample_ParallelMotion() {
            // Show how inversions avoid parallel fifths
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 62, type: 'minor', inv: 1 }, // Avoid parallel fifths!
                { root: 64, type: 'minor', inv: 1 },
                { root: 65, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Avoiding parallel fifths');
        }

        playExample_Arpeggios() {
            // Broken chord across inversions
            const notes = this.getChordNotesForInversion(60, 'major', 0);
            this.playArpeggio(notes, 'Root position arpeggio');
            
            setTimeout(() => {
                const notes2 = this.getChordNotesForInversion(60, 'major', 1);
                this.playArpeggio(notes2, '1st inversion arpeggio');
            }, 1500);
        }

        playExample_BalladVoicings() {
            // Emotional progression like "Let It Be" (C-G-Am-F)
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 67, type: 'major', inv: 2 },
                { root: 57, type: 'minor', inv: 1 },
                { root: 65, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Ballad voicings (Let It Be style)');
        }

        playExample_CloseVsOpen() {
            // Compare close voicing vs open
            const close = [{ root: 60, type: 'major', inv: 0 }];
            this.playSequence(close, 'Close voicing', () => {
                // Play same chord but spread out
                setTimeout(() => {
                    const openNotes = [60, 67, 76]; // C E(+octave) G(+octave)
                    this.playChord(openNotes, 0.7);
                }, 1200);
            });
        }

        playExample_BassComposer() {
            // Interactive example - just demonstrate concept
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 2 },
                { root: 67, type: 'major', inv: 1 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Custom bass line composition');
        }

        playExample_HymnStyle() {
            // Traditional 4-part harmony
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 1 },
                { root: 60, type: 'major', inv: 2 },
                { root: 67, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Hymn-style 4-part harmony');
        }

        playExample_StridePiano() {
            // Left hand alternates bass and chord
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 1 },
                { root: 65, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 1 }
            ];
            
            this.playSequence(progression, 'Stride piano left hand');
        }

        playExample_SuspendedResolution() {
            // sus4 resolving through inversions
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 65, type: 'major', inv: 1 }, // F/A (simulating sus feel)
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Suspended resolution');
        }

        playExample_ModalInterchange() {
            // Borrow from parallel minor
            const progression = [
                { root: 60, type: 'major', inv: 0 },
                { root: 63, type: 'minor', inv: 1 }, // Eb minor (borrowed)
                { root: 65, type: 'major', inv: 0 },
                { root: 60, type: 'major', inv: 0 }
            ];
            
            this.playSequence(progression, 'Modal interchange with smooth voice leading');
        }

        // Helper methods for playing sequences
        playSequence(progression, label, callback, options = {}) {
            console.log(`Playing: ${label}`);
            
            // Configuration for voice leading examples
            const {
                chordDuration = 1200, // milliseconds per chord (default 1.2s)
                sustainTime = 1.5, // seconds to sustain notes
                noteAttackTime = 0.05, // seconds to attack
                noteReleaseTime = 0.4, // seconds to release
                useEnhancedAudio = true
            } = options;
            
            let delay = 0;
            
            progression.forEach((chord, idx) => {
                setTimeout(() => {
                    const notes = this.getChordNotesForInversion(chord.root, chord.type, chord.inv);
                    
                    // Use enhanced audio features if available
                    if (useEnhancedAudio && this._audioEngine && typeof this._audioEngine.playChord === 'function') {
                        this._audioEngine.playChord(notes, {
                            sustainTime: sustainTime,
                            attackTime: noteAttackTime,
                            releaseTime: noteReleaseTime
                        });
                    } else {
                        this.playChord(notes, sustainTime);
                    }
                }, delay);
                delay += chordDuration;
            });
            
            if (callback) {
                // Call callback when sequence finishes
                setTimeout(() => {
                    callback();
                }, delay + 500);
            }
        }

        playArpeggio(notes, label) {
            console.log(`Playing: ${label}`);
            notes.forEach((note, idx) => {
                setTimeout(() => {
                    this.playNote(note, 0.5);
                }, idx * 150);
            });
        }

        updateVoiceLeadingExamples() {
            // Update the scale info display
            const scaleInfo = document.getElementById('vl-scale-info');
            if (scaleInfo) {
                scaleInfo.textContent = `Examples in ${this._vlCurrentKey} ${this._vlCurrentScale.charAt(0).toUpperCase() + this._vlCurrentScale.slice(1)}`;
            }
        }

        updatePianoRange() {
            // Dynamically update piano MIDI range when root note changes
            const pianoContainer = document.getElementById('inversion-piano');
            if (!pianoContainer || !this._sharedPiano) return;

            // Clear container
            pianoContainer.innerHTML = '';

            if (this._sharedPiano.pianoElement && !pianoContainer.contains(this._sharedPiano.pianoElement)) {
                pianoContainer.appendChild(this._sharedPiano.pianoElement);
            }

            // Use manual range if enabled, otherwise calculate automatically
            let startMidi, endMidi;
            if (this.manualRangeEnabled && this.manualStartMidi !== null && this.manualEndMidi !== null) {
                startMidi = this.manualStartMidi;
                endMidi = this.manualEndMidi;
            } else {
                // Calculate chord MIDI notes for current inversion
                const chordNotes = this.getChordNotes();
                
                // Calculate optimal range with padding (reduced for tighter fit)
                const autoRange = this._sharedPiano.calculateOptimalRange(chordNotes, {
                    minPadding: 2,
                    maxPadding: 2,
                    minKeys: 10
                });
                startMidi = autoRange.startMidi;
                endMidi = autoRange.endMidi;
            }

            if (typeof this._sharedPiano.setHighlightMode === 'function') {
                this._sharedPiano.setHighlightMode('octave');
            }
            if (typeof this._sharedPiano.setGradingIntegration === 'function') {
                this._sharedPiano.setGradingIntegration(false);
            }
            if (typeof this._sharedPiano.setGradingTooltips === 'function') {
                this._sharedPiano.setGradingTooltips(false);
            }

            if (typeof this._sharedPiano.resize === 'function') {
                this._sharedPiano.resize({
                    container: pianoContainer,
                    startMidi,
                    endMidi,
                    fitToContainer: true,
                    showFingering: false,
                    showRomanNumerals: false,
                    enableGradingIntegration: false,
                    showGradingTooltips: false,
                    enablePointerGlissando: true
                });
            } else {
                this._sharedPiano.options = { ...(this._sharedPiano.options || {}), startMidi, endMidi, fitToContainer: true };
                if (typeof this._sharedPiano.render === 'function') this._sharedPiano.render();
            }

            // (pianoElement already appended above)

            this.installSharedPianoSoundHandler();
        }

        applyChordDegreeLabels(chordMidiNotes) {
            if (!this._sharedPiano || !this._sharedPiano.pianoElement) return;
            const el = this._sharedPiano.pianoElement;

            // Remove any existing labels
            el.querySelectorAll('.degree-label').forEach(n => n.remove());

            const rootClass = this.rootMidi % 12;
            const intervalOffset = this.quality === 'maj' ? [0, 4, 7] : [0, 3, 7];
            const degreeLabels = ['1', '3', '5'];
            const noteToDegree = {};
            intervalOffset.forEach((offset, idx) => {
                const noteClass = (rootClass + offset) % 12;
                noteToDegree[noteClass] = degreeLabels[idx];
            });

            (chordMidiNotes || []).forEach((midi) => {
                const key = el.querySelector(`[data-midi="${midi}"]`);
                if (!key) return;
                const degree = noteToDegree[midi % 12];
                if (!degree) return;

                const isBlackKey = key.classList.contains('piano-black-key');
                const label = document.createElement('div');
                label.className = 'degree-label';
                label.textContent = degree;
                label.style.cssText = `
                    position: absolute;
                    top: ${isBlackKey ? '62%' : '52%'};
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: ${isBlackKey ? '1.0rem' : '1.2rem'};
                    font-weight: 900;
                    color: #ffffff;
                    background: rgba(0,0,0,0.55);
                    border: 1px solid rgba(255,255,255,0.25);
                    padding: 2px 6px;
                    border-radius: 999px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.8);
                    font-family: var(--font-tech);
                    pointer-events: none;
                    z-index: 30;
                `;
                key.style.position = 'relative';
                key.appendChild(label);
            });
        }

        updateCircleSelection() {
            // Update all circle buttons to reflect current selection
            if (!this.circleButtons || !this.circleWrapper) return;
            
            this.circleButtons.forEach(btn => {
                const isSelected = btn.dataset.note === this.rootNote;
                btn.style.borderColor = isSelected ? 'var(--accent-primary)' : 'var(--border-light)';
                btn.style.background = isSelected ? 'var(--accent-primary)' : 'rgba(0, 0, 0, 0.4)';
                btn.style.color = isSelected ? '#000' : 'var(--text-main)';
                btn.style.zIndex = isSelected ? '10' : '1';
                btn.style.transform = 'scale(1)';
            });
            
            // Update center display
            const centerDisplay = this.circleWrapper.querySelector('#circle-center-display');
            if (centerDisplay) {
                centerDisplay.innerHTML = `
                    <div style="font-size: 1.3rem; font-weight: 900; color: var(--accent-primary); font-family: var(--font-tech);">${this.rootNote}</div>
                    <div style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">${this.quality.toUpperCase()}</div>
                `;
            }
        }

        updateAllInversionButtons() {
            // Update all inversion buttons to reflect current selection
            if (!this.containerEl) return;
            
            this.containerEl.querySelectorAll('.inv-select-btn').forEach(btn => {
                const invValue = parseInt(btn.dataset.inv);
                const isActive = this.inversion === invValue;
                
                // Update ARIA state
                btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
                
                btn.style.background = isActive ? 'linear-gradient(135deg, var(--accent-primary), rgba(16, 185, 129, 0.8))' : 'rgba(0, 0, 0, 0.3)';
                btn.style.borderColor = isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)';
                btn.style.transform = '';
                btn.style.boxShadow = isActive ? '0 0 0 3px rgba(16, 185, 129, 0.3)' : '';
                
                // Update text colors
                const emoji = btn.querySelector('div:first-child');
                const label = btn.querySelector('div:nth-child(2)');
                const desc = btn.querySelector('div:last-child');
                
                if (label) label.style.color = isActive ? '#000' : 'var(--text-highlight)';
                if (desc) desc.style.color = isActive ? 'rgba(0,0,0,0.7)' : 'var(--text-muted)';
            });
        }

        updateQualityButtons() {
            // Update quality toggle buttons in advanced panel
            if (!this.containerEl) return;
            
            this.containerEl.querySelectorAll('[data-quality]').forEach(btn => {
                const isActive = btn.dataset.quality === this.quality;
                btn.style.background = isActive ? 'var(--accent-primary)' : 'transparent';
                btn.style.color = isActive ? '#000' : 'var(--text-main)';
            });
        }

        getChordNotes() {
            // Calculate MIDI notes for the chord in current inversion
            let intervals = (this.quality === 'maj') ? [4, 7] : [3, 7]; // Semitones: 3rd and 5th from root
            
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

        updateVisualization() {
            // Re-render the dedicated piano with current chord
            this.renderPiano();

            const chordNotes = this.getChordNotes();
            
            // Update chord title + subheading
            const name = `${this.rootNote} ${this.quality === 'maj' ? 'major' : 'minor'}`;
            const invLabel = this.inversion === 0 ? 'Root position' : (this.inversion === 1 ? '1st inversion' : '2nd inversion');
            const noteStr = chordNotes.map(m => this.midiToNoteName(m).replace(/\d+$/, '')).join(' – ');

            const titleEl = document.getElementById('inv-chord-title');
            const subEl = document.getElementById('inv-chord-sub');
            if (titleEl) titleEl.textContent = `${name} (${invLabel})`;
            if (subEl) subEl.textContent = noteStr;

            const infoDiv = document.getElementById('inversion-info');
            if (infoDiv) {
                const expl = this.explanations[this.inversion];
                infoDiv.innerHTML = `
                    <div style="font-size:0.9rem;color:var(--text-main);margin-bottom:4px;font-weight:700;">${expl.title}</div>
                    <div style="font-size:0.85rem;color:var(--text-main);line-height:1.6;">${expl.detailed}</div>
                `;
            }

            const fingerDiv = document.getElementById('inversion-finger-guide');
            if (fingerDiv) {
                fingerDiv.textContent = this.fingerGuides[this.inversion];
            }
        }

        midiToNoteName(midi) {
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const octave = Math.floor(midi / 12) - 1;
            const noteIndex = midi % 12;
            return noteNames[noteIndex] + octave;
        }

        getChordNotesForInversion(rootMidi, chordType, inversion) {
            // Calculate MIDI notes for the chord in specific inversion
            let intervals = (chordType === 'major') ? [4, 7] : [3, 7]; // Semitones: 3rd and 5th from root
            
            let notes = [rootMidi];
            intervals.forEach(i => notes.push(rootMidi + i));
            
            // Apply inversion
            if (inversion === 1) {
                let first = notes.shift();
                notes.push(first + 12);
            } else if (inversion === 2) {
                let first = notes.shift();
                let second = notes.shift();
                notes.push(first + 12);
                notes.push(second + 12);
            }
            
            return notes;
        }

        addMultiScaleProgressionsSection(parentEl) {
            const msWrapper = document.createElement('div');
            msWrapper.style.cssText = 'margin: 32px 0; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid var(--border-light); overflow: hidden;';
            parentEl.appendChild(msWrapper);

            const msToggle = document.createElement('button');
            msToggle.style.cssText = 'width: 100%; padding: 20px; background: rgba(0,0,0,0.3); border: none; color: var(--text-main); cursor: pointer; text-align: left; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;';
            msToggle.innerHTML = `
                <div>
                    <div style="font-size: 1.3rem; font-weight: 800; font-family: var(--font-tech); color: var(--accent-secondary); margin-bottom: 6px;">🎵 Multi-Scale Progressions</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Same progressions in different scales • Modal interchange & borrowed chords</div>
                </div>
                <span style="font-size: 1.5rem; transition: transform 0.2s;">▼</span>
            `;
            msWrapper.appendChild(msToggle);

            const msSection = document.createElement('div');
            msSection.style.cssText = 'display: none; padding: 32px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.12));';
            msWrapper.appendChild(msSection);

            let msOpen = false;
            msToggle.addEventListener('click', () => {
                msOpen = !msOpen;
                msSection.style.display = msOpen ? 'block' : 'none';
                const arrow = msToggle.querySelector('span:last-child');
                arrow.style.transform = msOpen ? 'rotate(180deg)' : '';
                msToggle.style.background = msOpen ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';
            });

            const msTitle = document.createElement('h2');
            msTitle.style.cssText = 'color: var(--text-highlight); font-size: 1.5rem; font-weight: 900; margin-bottom: 12px; text-align: center; font-family: var(--font-tech);';
            msTitle.textContent = '🎵 Explore Progressions Across Scales';
            msSection.appendChild(msTitle);

            const msSubtitle = document.createElement('p');
            msSubtitle.style.cssText = 'text-align: center; color: var(--text-main); margin-bottom: 24px; font-size: 0.95rem; line-height: 1.6;';
            msSubtitle.innerHTML = 'Hear how the same <strong style="color: var(--accent-secondary);">progression (I-IV-V-I)</strong> sounds in different scales. Use inversions to create smooth voice leading across scales!';
            msSection.appendChild(msSubtitle);

            // Create tabs for different progressions
            const progressionTabs = document.createElement('div');
            progressionTabs.style.cssText = 'display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; justify-content: center;';
            msSection.appendChild(progressionTabs);

            const progressions = [
                { name: 'I-IV-V-I', progression: [
                    { root: 0, type: 'major', inv: 0 },
                    { root: 5, type: 'major', inv: 2 },
                    { root: 7, type: 'major', inv: 1 },
                    { root: 0, type: 'major', inv: 0 }
                ]},
                { name: 'ii-V-I', progression: [
                    { root: 2, type: 'minor', inv: 1 },
                    { root: 7, type: 'major', inv: 1 },
                    { root: 0, type: 'major', inv: 0 }
                ]},
                { name: 'vi-IV-I-V', progression: [
                    { root: 9, type: 'minor', inv: 0 },
                    { root: 5, type: 'major', inv: 1 },
                    { root: 0, type: 'major', inv: 0 },
                    { root: 7, type: 'major', inv: 2 }
                ]}
            ];

            const scaleNames = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian'];

            progressions.forEach((prog, idx) => {
                const tab = document.createElement('button');
                tab.style.cssText = `
                    padding: 12px 24px;
                    background: ${idx === 0 ? 'var(--accent-secondary)' : 'rgba(0,0,0,0.3)'};
                    color: ${idx === 0 ? '#000' : 'var(--text-main)'};
                    border: 2px solid ${idx === 0 ? 'var(--accent-secondary)' : 'var(--border-light)'};
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    font-family: var(--font-tech);
                    transition: all 0.2s;
                `;

                tab.textContent = prog.name;

                tab.addEventListener('click', () => {
                    // Update all tabs
                    progressionTabs.querySelectorAll('button').forEach(b => {
                        b.style.background = 'rgba(0,0,0,0.3)';
                        b.style.color = 'var(--text-main)';
                        b.style.borderColor = 'var(--border-light)';
                    });
                    tab.style.background = 'var(--accent-secondary)';
                    tab.style.color = '#000';
                    tab.style.borderColor = 'var(--accent-secondary)';

                    // Update grid
                    this.updateMultiScaleGrid(msSection, prog.progression, scaleNames);
                });

                progressionTabs.appendChild(tab);
            });

            // Initial grid
            this.updateMultiScaleGrid(msSection, progressions[0].progression, scaleNames);
        }

        updateMultiScaleGrid(parentSection, progression, scaleNames) {
            // Remove existing grid if any
            const existingGrid = parentSection.querySelector('[data-multi-scale-grid]');
            if (existingGrid) existingGrid.remove();

            const scaleGrid = document.createElement('div');
            scaleGrid.setAttribute('data-multi-scale-grid', 'true');
            scaleGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;';
            parentSection.appendChild(scaleGrid);

            scaleNames.forEach(scaleName => {
                const scaleCard = document.createElement('div');
                scaleCard.style.cssText = `
                    padding: 16px;
                    background: rgba(0,0,0,0.3);
                    border: 2px solid rgba(139, 92, 246, 0.3);
                    border-radius: 10px;
                    transition: all 0.2s;
                `;

                const scaleTitle = document.createElement('div');
                scaleTitle.style.cssText = 'font-size: 1.05rem; font-weight: 800; color: var(--accent-secondary); margin-bottom: 8px; font-family: var(--font-tech);';
                scaleTitle.textContent = scaleName.charAt(0).toUpperCase() + scaleName.slice(1);
                scaleCard.appendChild(scaleTitle);

                const playBtn = document.createElement('button');
                playBtn.innerHTML = '▶ Hear in ' + scaleName;
                playBtn.style.cssText = `
                    width: 100%;
                    padding: 12px;
                    background: rgba(139, 92, 246, 0.3);
                    border: 2px solid var(--accent-secondary);
                    border-radius: 8px;
                    color: var(--accent-secondary);
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: var(--font-tech);
                    margin-bottom: 12px;
                `;

                playBtn.addEventListener('mouseenter', () => {
                    playBtn.style.background = 'var(--accent-secondary)';
                    playBtn.style.color = '#000';
                    playBtn.style.transform = 'scale(1.02)';
                });

                playBtn.addEventListener('mouseleave', () => {
                    playBtn.style.background = 'rgba(139, 92, 246, 0.3)';
                    playBtn.style.color = 'var(--accent-secondary)';
                    playBtn.style.transform = 'scale(1)';
                });

                playBtn.addEventListener('click', () => {
                    playBtn.innerHTML = '▶ Playing...';
                    // Play the progression in the selected scale
                    this.playProgressionInScale(progression, 60, scaleName, () => {
                        playBtn.innerHTML = '▶ Hear in ' + scaleName;
                    });
                });

                scaleCard.appendChild(playBtn);

                const notes = document.createElement('div');
                notes.style.cssText = 'font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;';
                
                // Show scale notes
                if (typeof ScaleHelper !== 'undefined') {
                    const helper = new ScaleHelper();
                    const scaleNotes = helper.getScaleNotes(60, scaleName);
                    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                    const scaleDegrees = scaleNotes.map(m => noteNames[m % 12]).join(' - ');
                    notes.innerHTML = `<strong>Notes:</strong> ${scaleDegrees}`;
                }

                scaleCard.appendChild(notes);

                scaleCard.addEventListener('mouseenter', () => {
                    scaleCard.style.borderColor = 'var(--accent-secondary)';
                    scaleCard.style.transform = 'translateY(-4px)';
                    scaleCard.style.boxShadow = '0 8px 16px rgba(139, 92, 246, 0.4)';
                });

                scaleCard.addEventListener('mouseleave', () => {
                    scaleCard.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    scaleCard.style.transform = 'translateY(0)';
                    scaleCard.style.boxShadow = 'none';
                });

                scaleGrid.appendChild(scaleCard);
            });
        }

        playProgressionInScale(progression, keyMidi, scaleName, callback) {
            if (typeof ScaleHelper === 'undefined') {
                console.warn('ScaleHelper not available');
                if (callback) callback();
                return;
            }

            try {
                const helper = new ScaleHelper();
                const scaleNotes = helper.getScaleNotes(keyMidi, scaleName);
                const translatedProgression = [];

                // Convert scale degree offsets to actual notes in the scale
                progression.forEach(chord => {
                    // chord.root is a semitone offset (0, 2, 5, 7, 9 for I, ii, IV, V, vi)
                    // Find the closest scale degree
                    const targetMidi = keyMidi + chord.root;
                    
                    // Get the actual chord notes with inversion
                    const chordNotes = this.getChordNotesForInversion(targetMidi, chord.type, chord.inv);
                    
                    translatedProgression.push({
                        root: chordNotes[0],
                        type: chord.type,
                        inv: chord.inv,
                        _notes: chordNotes
                    });
                });

                // Play using the precomputed notes
                let delay = 0;
                const chordDuration = 1500;

                translatedProgression.forEach((chord, idx) => {
                    setTimeout(() => {
                        if (this._audioEngine && typeof this._audioEngine.playChord === 'function') {
                            this._audioEngine.playChord(chord._notes, {
                                sustainTime: 1.5,
                                attackTime: 0.05,
                                releaseTime: 0.5
                            });
                        } else {
                            this.playChord(chord._notes, 1.5);
                        }
                    }, delay);
                    delay += chordDuration;
                });

                if (callback) {
                    setTimeout(callback, delay + 500);
                }
            } catch (error) {
                console.error('Error playing progression:', error);
                if (callback) callback();
            }
        }

        adjustPianoRange(delta) {
            // Adjust piano range by expanding/contracting keys
            if (!this._sharedPiano) return;

            // Get current range or calculate from chord
            let startMidi, endMidi;
            if (this.manualRangeEnabled && this.manualStartMidi !== null && this.manualEndMidi !== null) {
                startMidi = this.manualStartMidi;
                endMidi = this.manualEndMidi;
            } else {
                const chordNotes = this.getChordNotes();
                const autoRange = this._sharedPiano.calculateOptimalRange(chordNotes, {
                    minPadding: 2,
                    maxPadding: 2,
                    minKeys: 10
                });
                startMidi = autoRange.startMidi;
                endMidi = autoRange.endMidi;
            }

            // Apply adjustment (delta = +/- number of keys to add/remove from each side)
            startMidi = Math.max(21, startMidi + delta);  // Piano starts at MIDI 21 (A0)
            endMidi = Math.min(108, endMidi - delta);     // Piano ends at MIDI 108 (C8)

            // Ensure minimum range
            if (endMidi - startMidi < 8) {
                return; // Don't allow fewer than 8 keys
            }

            // Enable manual mode and store range
            this.manualRangeEnabled = true;
            this.manualStartMidi = startMidi;
            this.manualEndMidi = endMidi;

            // Re-render piano with new range
            this.updatePianoRange();
        }

        resetPianoRange() {
            // Reset to automatic range calculation
            this.manualRangeEnabled = false;
            this.manualStartMidi = null;
            this.manualEndMidi = null;
            
            // Re-render with auto range
            this.updatePianoRange();
        }
    }

    // Expose Global
    window.LearnInversions = LearnInversions;

})();
