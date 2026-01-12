(function(){
    'use strict';

    /**
     * LearnChords: Excellent, interactive chord builder for beginners
     * - Visual interval markers and audio feedback
     * - Clear chord type selection with formulas
     * - Real-time theory explanations
     * - Interactive progressions with highlighting
     */
    class LearnChords {
        constructor(musicTheoryEngine) {
            this.musicTheory = musicTheoryEngine || null;
            this.rootMidi = null;
            this.rootNote = null;
            this.rootNoteFull = null; // Full note name with octave for visualizer
            this.chordType = 'major'; // major, minor, dim, aug
            this.chordIntervals = [4,3]; // Major triad by default
            this.visualizer = null;
            this.containerEl = null;
            this.audio = null; // Legacy
            this._audioCtx = null;
            this.step = 1;
            this.currentChordNotes = [];
            this.extensions = []; // for 7ths, 9ths, etc.
            this.extensionIds = []; // Track extension names: 'maj7', 'dom7', 'nat9', etc.
            this.inversion = 0; // 0=Root, 1=1st, 2=2nd, etc.
            this.playMode = 'block'; // 'block' or 'arpeggio'
            this.animating = false;
            this.audioSettings = {
                attack: 0.015,
                decay: 0.08,
                sustain: 0.25,
                release: 0.25,
                polyphony: 8,
                velocity: 0.5
            };
            this._activeVoices = [];
        }

        mount(selector) {
            const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (!host) return;
            this.containerEl = host;
            host.innerHTML = '';

            // 1. Header
            const header = document.createElement('div');
            header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; padding-bottom:16px; border-bottom:1px solid var(--border-light);';
            header.innerHTML = `
                <div>
                    <div style="font-size:1.5rem; font-weight:700; color:var(--text-highlight);">🎹 Interval Builder</div>
                    <div style="font-size:0.9rem; color:var(--text-muted); margin-top:4px;">Visualize how intervals stack to create chords</div>
                </div>
                <button id="back-to-landing-from-chords" class="btn" style="padding:8px 14px;">← Back</button>
            `;
            host.appendChild(header);

            // Back button wiring
            const backBtn = header.querySelector('#back-to-landing-from-chords');
            if (backBtn) backBtn.addEventListener('click', ()=>{
                const landing = document.getElementById('landing-page');
                const learn = document.getElementById('learn-chords-page');
                const workspace = document.querySelector('.workspace');
                const controlDeck = document.querySelector('.control-deck');
                const bottomDeck = document.querySelector('.bottom-deck');
                if (landing) landing.style.display = 'block';
                if (learn) learn.style.display = 'none';
                if (workspace) workspace.style.display = 'none';
                if (controlDeck) controlDeck.style.display = 'none';
                if (bottomDeck) bottomDeck.style.display = 'none';
            });

            // 2. Main Controls (Root & Quality)
            const controls = document.createElement('div');
            controls.style.cssText = 'display:flex; flex-wrap:wrap; gap:20px; margin-bottom:24px; justify-content:center;';
            
            // Root Selector
            const rootGroup = document.createElement('div');
            rootGroup.innerHTML = `<div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">Root Note</div>`;
            const rootKeys = document.createElement('div');
            rootKeys.style.cssText = 'display:flex; gap:4px;';
            ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach((note, i) => {
                const btn = document.createElement('button');
                btn.textContent = note;
                btn.className = 'root-btn';
                btn.dataset.midi = 60 + i; // Start at C4
                btn.style.cssText = `
                    width:32px; height:32px; border-radius:4px; border:1px solid var(--border-light); 
                    background:var(--bg-panel); color:var(--text-main); font-size:0.85rem; font-weight:600; cursor:pointer;
                    transition:all 0.1s;
                `;
                if(i===0) { // Default C
                    btn.style.background = 'var(--accent-primary)'; 
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-primary)';
                }
                btn.onclick = () => {
                   this.containerEl.querySelectorAll('.root-btn').forEach(b=>{
                       b.style.background='var(--bg-panel)';
                       b.style.color='var(--text-main)';
                       b.style.borderColor='var(--border-light)';
                   });
                   btn.style.background = 'var(--accent-primary)';
                   btn.style.color = '#000';
                   btn.style.borderColor = 'var(--accent-primary)';
                   this.updateRecipe(parseInt(btn.dataset.midi), this.chordType);
                };
                rootKeys.appendChild(btn);
            });
            rootGroup.appendChild(rootKeys);
            controls.appendChild(rootGroup);

            // Quality Selector
            const typeGroup = document.createElement('div');
            typeGroup.innerHTML = `<div style="text-align:center; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase;">Chord Quality</div>`;
            const typeBtns = document.createElement('div');
            typeBtns.style.cssText = 'display:flex; gap:4px;';
            
            const qualities = [
                {id:'major', label:'Major', ints:'4,3'},
                {id:'minor', label:'Minor', ints:'3,4'},
                {id:'dim', label:'Diminished', ints:'3,3'},
                {id:'aug', label:'Augmented', ints:'4,4'},
                {id:'sus2', label:'Sus2', ints:'2,5'},
                {id:'sus4', label:'Sus4', ints:'5,2'}
            ];
            
            qualities.forEach((q, i) => {
                const btn = document.createElement('button');
                btn.textContent = q.label;
                btn.className = 'quality-btn';
                btn.dataset.type = q.id;
                btn.dataset.ints = q.ints;
                btn.style.cssText = `
                    padding:0 16px; height:32px; border-radius:4px; border:1px solid var(--border-light); 
                    background:var(--bg-panel); color:var(--text-main); font-size:0.85rem; font-weight:600; cursor:pointer;
                    transition:all 0.1s;
                `;
                if(i===0) { // Default Major
                    btn.style.background = 'var(--accent-secondary)'; 
                    btn.style.color = '#000';
                    btn.style.borderColor = 'var(--accent-secondary)';
                }
                btn.onclick = () => {
                   this.containerEl.querySelectorAll('.quality-btn').forEach(b=>{
                       b.style.background='var(--bg-panel)';
                       b.style.color='var(--text-main)';
                       b.style.borderColor='var(--border-light)';
                   });
                   btn.style.background = 'var(--accent-secondary)';
                   btn.style.color = '#000';
                   btn.style.borderColor = 'var(--accent-secondary)';
                   this.updateRecipe(this.curRoot, q.id, q.ints);
                };
                typeBtns.appendChild(btn);
            });
            typeGroup.appendChild(typeBtns);
            controls.appendChild(typeGroup);

            host.appendChild(controls);

            // 3. The Main Interval Visualizer Stage
            const stage = document.createElement('div');
            stage.id = 'interval-vis-stage';
            stage.style.cssText = `
                background: linear-gradient(180deg, rgba(20,20,20,0.5), rgba(10,10,10,0.8));
                border-radius: 12px;
                padding: 30px; 
                margin-bottom: 24px;
                border: 1px solid var(--border-light);
                box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
                display: flex;
                justify-content: center;
                min-height: 140px;
            `;
            stage.innerHTML = `<div id="interval-vis-container" style="display:flex; justify-content:center; gap:20px; flex-wrap:wrap; width:100%;"></div>`;
            host.appendChild(stage);

            // 4. Playback Controls
            const playback = document.createElement('div');
            playback.style.textAlign = 'center';
            playback.innerHTML = `
                <button id="play-chord-btn" class="btn" style="padding:12px 32px; font-size:1.1rem; background:var(--accent-primary); color:#000; border:none; font-weight:700; box-shadow:0 4px 12px rgba(59,130,246,0.4); cursor:pointer;">
                    ▶ Play Chord
                </button>
            `;
            host.appendChild(playback);
            
            playback.querySelector('#play-chord-btn').onclick = () => {
                this.playHighQualityChord(this.getChordMidis(), 1.5);
            };

            // Audio Init - Legacy Removed
            // try { this.audio = new window.SimpleAudioEngine(); this.audio.init(); } catch(_){ }

            // Initialize State
            this.curRoot = 60;
            this.chordType = 'major';
            this.chordIntervals = [4,3];
            this.extensions = [];
            this.inversion = 0;
            
            // Sync Legacy State
            this.rootMidi = 60;
            this.rootNote = 'C';
            
            // --- Interactive Visualizer Logic (Moved here) ---
            this.activeAnimations = [];
            
            // Initial Render
            this.renderRecipe();
            this.renderExtensionsUI();
        }

        updateRecipe(root, type, ints) {
            this.curRoot = root;
            this.chordType = type;
            const intervalStr = ints || (type==='major'?'4,3': type==='minor'?'3,4': type==='dim'?'3,3':'4,4');
            
            // Sync State for Audio/Helpers
            this.chordIntervals = intervalStr.split(',').map(Number);
            this.extensions = [];
            this.extensionIds = []; 
            this.inversion = 0;
            
            // Sync Legacy State
            this.rootMidi = root;
            this.rootNote = this.midiToNote(root).replace(/\d+$/, '');

            this.renderRecipe(root, type, intervalStr);
            // Refresh extensions UI so options match the newly selected triad
            try { this.renderExtensionsUI(); } catch (e) { /* safe fallback */ }
            
            // Audio Feedback on change
            const midisVal = this.getChordMidis();
            this.playHighQualityNote(midisVal[0], 0, 0.4);
            if(midisVal[1]) this.playHighQualityNote(midisVal[1], 0.15, 0.4);
            if(midisVal[2]) this.playHighQualityNote(midisVal[2], 0.3, 0.4);
        }

        _ensureAudio() {
            if (!this._audioCtx) {
                try { 
                    this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); 
                } catch(e) { 
                    console.warn('AudioContext unavailable', e); 
                }
            }
            if (this._audioCtx && this._audioCtx.state === 'suspended') {
                this._audioCtx.resume();
            }
            return this._audioCtx;
        }

        playHighQualityChord(midis, duration=1.0) {
            const ctx = this._ensureAudio();
            if (!ctx) return;

            const t0 = ctx.currentTime;
            
            midis.forEach(midi => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = 440 * Math.pow(2, (midi - 69)/12);
                osc.connect(gain).connect(ctx.destination);
                
                // Smooth exponential envelope (studio quality)
                const attack = 0.015, decay = 0.08, sustain = 0.25, release = 0.25;
                const dur = duration;
                
                gain.gain.setValueAtTime(0.001, t0);
                gain.gain.exponentialRampToValueAtTime(0.5, t0 + attack);
                gain.gain.exponentialRampToValueAtTime(sustain, t0 + attack + decay);
                gain.gain.setValueAtTime(sustain, t0 + Math.max(0, dur - release));
                gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
                
                osc.start(t0);
                osc.stop(t0 + dur + 0.1);
            });
        }

        playHighQualityNote(midi, startTime=0, duration=0.5) {
            const ctx = this._ensureAudio();
            if (!ctx) return;
            
            const t0 = ctx.currentTime + startTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = 440 * Math.pow(2, (midi - 69)/12);
            osc.connect(gain).connect(ctx.destination);
            
            const attack = 0.015, decay = 0.1, sustain = 0.2;
            
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.exponentialRampToValueAtTime(0.4, t0 + attack);
            gain.gain.exponentialRampToValueAtTime(sustain, t0 + attack + decay);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
            
            osc.start(t0);
            osc.stop(t0 + duration + 0.1);
        }

        renderRecipe() {
            // Clear active animations
            this.activeAnimations.forEach(id => clearInterval(id));
            this.activeAnimations = [];
            
            const container = this.containerEl.querySelector('#interval-vis-container');
            if(!container) return;
            
            const curRoot = parseInt(this.curRoot);
            // Dynamic intervals
            const allIntervals = [...this.chordIntervals, ...this.extensions];
            const intervals = allIntervals; // Alias for legacy support until body update


                // Helper: X Coordinate Map for 24-key span (Two Octaves C3-C5)
                // 15 White keys total. Fixed width per white key slot (16px)
                const wKeyWidth = 16; 
                
                const getX = (idx) => {
                    // Normalize idx to 0-11 for position-in-octave, plus octave shift
                    const oct = Math.floor(idx / 12);
                    const note = idx % 12;
                    // White keys before this note in one octave mapping (0-6)
                    // Black keys centered on boundaries (x.5)
                    const wMap = {0:0, 1:0.55, 2:1, 3:1.55, 4:2, 5:3, 6:3.55, 7:4, 8:4.55, 9:5, 10:5.55, 11:6};
                    const pos = (oct * 7) + (wMap[note] || 0);
                    // +4 px padding offset on left
                    return (pos * wKeyWidth) + (wKeyWidth/2) + 4; 
                };

                const getMiniPiano = (label, activeIndices, pathStart=null, pathEnd=null, color='var(--accent-primary)', isFinal=false) => {
                    // Logic: Our display is fixed 0..27 (C to D+).
                    // We map the requested chord (root + intervals) into this space.
                    // We use (curRoot % 12) to find the local root offset.
                    const rootOffset = curRoot % 12; 

                    // Map relative intervals (0, 4, 7) to absolute display indices
                    const normalizedActive = activeIndices.map(midi => midi + rootOffset);
                    const dispStart = pathStart!==null ? pathStart + rootOffset : null;
                    const dispEnd = pathEnd!==null ? pathEnd + rootOffset : null;

                    const pianoId = `piano-${Math.random().toString(36).substr(2, 9)}`;

                    // Generate DOM
                    let dom = '';
                    
                    // White Keys loop (0 to 28) - slightly wider range for 13ths
                    let wTotal = 0;
                    const whiteKeyIndices = [0,2,4,5,7,9,11];
                    for(let i=0; i<=28; i++) {
                        if(whiteKeyIndices.includes(i%12)) {
                            const isActive = normalizedActive.includes(i);
                            const isRoot = normalizedActive.length && i === normalizedActive[0];
                            
                            // Realistic Piano Style
                            let bg = isActive 
                                ? `linear-gradient(to bottom, ${color}, ${color})` 
                                : `linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%)`; 
                            
                            if (isFinal && isActive) {
                                // Rainbow/Gold for final? Or just Bright Primary?
                                // Let's stick to the color passed, maybe brighter.
                                bg = `linear-gradient(to bottom, ${color}, ${color})`;
                            }
                                
                            const txt = isActive ? 'var(--bg-app)' : '#555';
                            const shadow = isActive ? 'none' : 'inset 0 -1px 2px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.1)';
                            const zIndex = isActive ? '2' : '1';

                            dom += `<div class="key-${pianoId}" data-midi="${i}" style="flex:1; height:100%; display:flex; align-items:flex-end; justify-content:center;
                                background:${bg};
                                color:${txt}; 
                                box-shadow:${shadow};
                                border-radius: 0 0 3px 3px;
                                margin:0 1px;
                                font-size:10px; padding-bottom:4px; font-weight:800; transition:all 0.1s ease relative; z-index:${zIndex};">
                                ${isRoot ? 'R' : ''}
                            </div>`;
                            wTotal++;
                        }
                    }

                    // Black Keys Overlay
                    let blackKeys = '';
                    // 0, 1(bk), 2, 3(bk), 4, 5, 6(bk), 7, 8(bk), 9, 10(bk), 11...
                    const blacks = [1,3,6,8,10, 13,15,18,20,22, 25,27];
                    blacks.forEach(k => {
                        const x = getX(k); 
                        if (x > (wTotal * wKeyWidth)) return; // Don't overflow
                        
                        const isActive = normalizedActive.includes(k);
                        const bg = isActive 
                            ? `linear-gradient(to bottom, ${color}, ${color})` 
                            : `linear-gradient(to bottom, #333333, #000000)`; // Real Black
                        
                        blackKeys += `<div class="key-${pianoId}" data-midi="${k}" style="position:absolute; left:${x-7}px; top:0; width:12px; height:60%; border-radius:0 0 3px 3px;
                            background:${bg}; 
                            box-shadow:inset 0 0 2px rgba(255,255,255,0.2), 2px 2px 4px rgba(0,0,0,0.5);
                            z-index:10;
                            pointer-events:none; transition:all 0.1s ease;"></div>`;
                    });

                    // Arrow Animation (SVG)
                    let svg = '';
                    if (dispStart !== null && dispEnd !== null) {
                        const x1 = getX(dispStart);
                        const x2 = getX(dispEnd);
                        const midX = (x1+x2)/2;
                        const dist = Math.abs(x2-x1);
                        const animId = `flow-${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Use CSS variable for color to match theme
                        svg = `<div style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; overflow:visible; z-index:20;">
                            <svg width="100%" height="100%" style="overflow:visible;">
                                <defs>
                                    <style>
                                        @keyframes ${animId} { to { stroke-dashoffset: 0; } from { stroke-dashoffset: 12; } }
                                        .anim-${animId} { animation: ${animId} 2s linear infinite; }
                                        .pulse-${animId} { animation: pulse-${animId} 2s infinite; }
                                        @keyframes pulse-${animId} { 0%,100% {r:4; opacity:0.8;} 50% {r:6; opacity:1;} }
                                    </style>
                                </defs>
                                <path class="anim-${animId}" d="M${x1},50 Q${midX},${45-(dist*0.25)} ${x2},50" 
                                    fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 6" 
                                    filter="drop-shadow(0 2px 3px rgba(0,0,0,0.5))"/>
                                <circle class="pulse-${animId}" cx="${x2}" cy="50" r="4" fill="${color}" stroke="#fff" stroke-width="1.5"/>
                            </svg>
                        </div>`;
                    }

                    // Setup Animation JS
                    if(dispStart !== null && dispEnd !== null) {
                        setTimeout(() => {
                            const tick = () => {
                                const now = Date.now();
                                const duration = 2000;
                                const progress = (now % duration) / duration;
                                const totalSteps = dispEnd - dispStart;
                                const currentStep = Math.floor(progress * totalSteps); // 0 to totalSteps-1
                                const currentMidi = dispStart + 1 + currentStep; // Start at +1

                                // Clear non-active keys in range
                                const piano = document.getElementById(pianoId);
                                if(!piano) return;
                                const allKeys = piano.querySelectorAll(`.key-${pianoId}`);
                                
                                allKeys.forEach(k => {
                                    const m = parseInt(k.dataset.midi);
                                    // Target keys in the "path" range (exclusive of start, inclusive of end)
                                    // We allow modifying active keys if they are currently being "counted" on
                                    if(m > dispStart && m <= dispEnd) {
                                        const isBlack = k.style.position === 'absolute';
                                        
                                        if (m === currentMidi) {
                                            // Highlight Step - Pulse Bright White to show the "count"
                                            // This overrides the active color so you can see the step happening
                                            k.style.background = '#ffffff'; 
                                            // Subtle glow: 5px white halo, 12px color diffusion
                                            k.style.boxShadow = `0 0 5px #ffffff, 0 0 12px ${color}`; 
                                            k.style.transform = 'scale(1.15) translateY(-2px)';
                                            k.style.zIndex = '100';
                                            k.style.border = '1px solid #fff';
                                        } else {
                                            // Reset State
                                            k.style.transform = 'none';
                                            k.style.zIndex = isBlack ? '10' : '1';
                                            k.style.border = 'none'; // reset border
                                            
                                            if (normalizedActive.includes(m)) {
                                                // Reset to Active State (Chord Tone)
                                                // Replicate the DOM generation styles exactly
                                                if(isBlack) {
                                                    k.style.background = `linear-gradient(to bottom, ${color}, ${color})`;
                                                    k.style.boxShadow = `inset 0 0 2px rgba(255,255,255,0.2), 1px 1px 3px rgba(0,0,0,0.4)`;
                                                } else {
                                                    k.style.background = `linear-gradient(to bottom, ${color}, ${color})`;
                                                    k.style.boxShadow = 'none';
                                                }
                                            } else {
                                                // Reset to Inactive State (Path Note)
                                                // Replicate Realistic Piano styles
                                                if(isBlack) {
                                                    k.style.background = 'linear-gradient(to bottom, #333333, #000000)';
                                                    k.style.boxShadow = 'inset 0 0 2px rgba(255,255,255,0.2)';
                                                } else {
                                                    k.style.background = 'linear-gradient(to bottom, #ffffff, #e0e0e0)';
                                                    k.style.boxShadow = 'inset 0 -1px 2px rgba(0,0,0,0.1)';
                                                }
                                            }
                                        }
                                    }
                                });
                            };
                            this.activeAnimations.push(setInterval(tick, 50));
                        }, 100);
                    }

                    return `
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">${label}</div>
                            <div id="${pianoId}" style="position:relative; width:${wTotal*16}px; height:80px; 
                                background:#111; border-radius:4px; margin:0 4px; padding:4px 4px 6px 4px; 
                                box-shadow:0 10px 20px rgba(0,0,0,0.3); border-top:2px solid #333;">
                                <div style="display:flex; height:100%; gap:2px;">${dom}</div>
                                ${blackKeys}
                                ${svg}
                            </div>
                        </div>
                    `;
                };

                let html = '';
                
                // Separator Generator
                const getSeparator = () => `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100px; width:40px; margin-top:14px; opacity:0.8;">
                        <div style="width:2px; height:20px; background:linear-gradient(to bottom, transparent, var(--border-light));"></div>
                        <div style="width:24px; height:24px; border-radius:50%; background:var(--bg-header); border:1px solid var(--border-light); 
                            display:flex; align-items:center; justify-content:center; color:var(--text-muted); box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:2;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                        <div style="width:2px; height:20px; background:linear-gradient(to top, transparent, var(--border-light));"></div>
                    </div>
                `;
                

                // --- Dynamic Generation Loop ---
                html += getMiniPiano('1. Start (Root)', [0]);

                let currentTotal = 0;
                const currentActive = [0];
                const colors = ['var(--accent-primary)', 'var(--accent-secondary)', '#ec4899', '#8b5cf6', '#f59e0b']; 

                allIntervals.forEach((int, i) => {
                    const prevTotal = currentTotal;
                    currentTotal += int;
                    currentActive.push(currentTotal);
                    
                    const color = colors[i % colors.length];
                    
                    // Logic for label
                    // "2. Go up a 'minor third' (+3)"
                    // "3. Count up (+4) to reach the 'fifth'"
                    
                    const getIntName = (n) => {
                        if(n===3) return 'Minor 3rd';
                        if(n===4) return 'Major 3rd';
                        if(n===2) return 'Major 2nd';
                        if(n===1) return 'minor 2nd';
                        if(n===7) return 'Perfect 5th';
                        if(n===5) return 'Perfect 4th';
                        if(n===2 && i===0) return 'Major 2nd'; // Root -> 2 (Sus2)
                        return `${n} semitones`;
                    };

                    const intName = getIntName(int);
                    let label = '';
                    
                    if (i === 0) {
                        // First interval: From Root to 3rd (or 2/4 for sus)
                        let targetName = intName;
                        if(this.chordType === 'sus2') targetName = 'Major 2nd (Sus2)';
                        if(this.chordType === 'sus4') targetName = 'Perfect 4th (Sus4)';
                        label = `2. Go up a "${targetName}" (+${int} semitones)`; 
                    } else if (i === 1) {
                        // Second interval: From 3rd to 5th
                        let target = 'Fifth';
                        if(this.chordType === 'dim') target = 'Dim 5th';
                        if(this.chordType === 'aug') target = 'Aug 5th';
                        if(this.chordType.includes('sus')) target = 'Perfect 5th';
                        
                        label = `3. Count up (+${int} semitones) to reach the "${target}"`;
                    } else {
                        // Extensions (i=2 is 7th, i=3 is 9th, etc)
                        const stepNum = i + 2;
                        
                        // Map 9th/11th/13th target names
                        let target = 'Extension';
                        if(i===2) target = '7th';
                        if(i===3) target = '9th';
                        if(i===4) target = '11th';
                        if(i===5) target = '13th';
                        
                        // "4. Add Minor 3rd to reach the 7th"
                        label = `${stepNum}. Add ${intName} to reach "${target}"`;
                    }

                    html += getSeparator();
                    html += getMiniPiano(label, [...currentActive], prevTotal, currentTotal, color);
                });

                // Final Combined Result (Step 4 requested)
                html += getSeparator();
                const chordName = this.getChordName();
                html += getMiniPiano(`Result: ${chordName}`, [...currentActive], null, null, 'var(--accent-primary)', true);

                container.innerHTML = html;
            }

            renderExtensionsUI() {
                // Ensure container exists
                let extContainer = this.containerEl.querySelector('#extensions-container');
                if(!extContainer) {
                    extContainer = document.createElement('div');
                    extContainer.id = 'extensions-container';
                    extContainer.style.cssText = 'margin-bottom:24px; background:var(--bg-panel); border:1px solid var(--border-light); border-radius:8px; overflow:hidden;';
                    
                    // Insert after stage, before playback
                    const stage = this.containerEl.querySelector('#interval-vis-stage');
                    if(stage && stage.nextSibling) {
                        this.containerEl.insertBefore(extContainer, stage.nextSibling);
                    } else {
                        // Just append if stage is last
                        this.containerEl.appendChild(extContainer);
                    }
                }
                
                let html = '';

                // --- 1. Active Stack Display (Evolution) ---
                if (this.extensions.length > 0) {
                    html += `<div style="padding:16px; border-bottom:1px solid var(--border-light); background:rgba(0,0,0,0.2);">`;
                    html += `<div style="font-size:0.8rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; margin-bottom:12px;">Your Chord Stack</div>`;
                    html += `<div style="display:flex; flex-wrap:wrap; gap:8px;">`;
                    
                    const tierLabels = ['7th/6th', '9th', '11th', '13th'];

                    // Friendly mapping from id -> label for stack display
                    const idToLabel = {
                        'maj7': 'Maj7', 'dom7': '7', 'min7': 'm7', 'minmaj7': 'm(maj7)', 'maj6': '6', 'min6': 'm6',
                        'dim7': 'dim7', 'm7b5': 'm7b5', 'aug7': 'aug7', 'maj7aug': 'maj7(#5)',
                        'b9': 'b9', 'nat9': '9', 'shp9': '#9', 'nat11': '11', 'shp11': '#11', 'nat13': '13', 'b13': 'b13'
                    };
                    
                    this.extensions.forEach((extInt, idx) => {
                         // Use semantic label if available via extensionIds
                         let friendly = `+${extInt}`;
                         if (Array.isArray(this.extensionIds) && this.extensionIds[idx]) {
                             friendly = idToLabel[this.extensionIds[idx]] || this.extensionIds[idx];
                         }
                         
                         html += `
                            <div class="stack-item" data-index="${idx}" style="
                                display:flex; align-items:center; gap:6px; padding:6px 12px; background:var(--accent-secondary); color:#000; 
                                border-radius:16px; font-size:0.85rem; font-weight:700; cursor:pointer; transition:all 0.2s; box-shadow:0 2px 4px rgba(0,0,0,0.2);
                            ">
                                <span>${tierLabels[idx] || 'Ext'}: ${friendly}</span>
                                <span style="font-size:1.1rem; line-height:0.5; margin-left:4px; opacity:0.6;">×</span>
                            </div>
                         `;
                    });
                    
                    html += `</div></div>`;
                }
                
                // Stack Definitions (Grouped by Tier)
                // We define what is available based on current count
                const currentExtCount = this.extensions.length;
                let availableOptions = [];
                let tierName = '';
                let theoryTip = '';
                
                // Calculate current height from root
                let triadSum = 7;
                if(this.chordType==='dim') triadSum = 6;
                if(this.chordType==='aug') triadSum = 8;
                let currentHeight = triadSum + this.extensions.reduce((a,b)=>a+b, 0);

                if (currentExtCount === 0) {
                    // TIER 1: The 7th (and 6th)
                    tierName = 'Level 1: Add 7th or 6th';
                    theoryTip = 'The 7th often defines the function (Stable vs Active/Bluesy).';
                    
                    if (this.chordType === 'major') {
                        availableOptions = [
                            { id: 'maj7', label: 'Major 7th', int: 4, desc: 'Jazzy, stable, dreamy' },
                            { id: 'dom7', label: 'Dominant 7th', int: 3, desc: 'Bluesy, tension craving release' },
                            { id: 'maj6', label: 'Major 6th', int: 2, desc: 'Warm, consonant, pentatonic' }
                        ];
                    } 
                    else if (this.chordType === 'minor') {
                        availableOptions = [
                            { id: 'min7', label: 'Minor 7th', int: 3, desc: 'The standard smooth minor sound' },
                            { id: 'minmaj7', label: 'Min-Maj 7th', int: 4, desc: 'Mysterious, Noir, Hitchcock' },
                            { id: 'min6', label: 'Minor 6th', int: 2, desc: 'Bright Dorian flavor' }
                        ];
                    }
                    else if (this.chordType === 'dim') {
                        availableOptions = [
                            { id: 'dim7', label: 'Diminished 7th', int: 3, desc: 'Symmetrical, very tense (Full Dim)' }, // 6+3=9
                            { id: 'm7b5', label: 'Minor 7th (Half-Dim)', int: 4, desc: 'Tristan chord, softer tension' } // 6+4=10
                        ];
                    }
                    else if (this.chordType === 'aug') {
                        availableOptions = [
                            { id: 'maj7aug', label: 'Major 7th', int: 3, desc: 'Modern jazz, highly dissonant, staple voicing' },
                            { id: 'aug7', label: 'Augmented Dominant 7th', int: 2, desc: 'Whole Tone scale flavor, rare alteration' }
                        ];
                    }
                    else if (this.chordType.includes('sus')) {
                        availableOptions = [
                            { id: 'dom7', label: 'Dominant 7th', int: 3, desc: 'Mixolydian flavor' },
                            { id: 'maj7', label: 'Major 7th', int: 4, desc: 'Modern, stable voicing' },
                            { id: '6', label: '6th', int: 2, desc: 'Open, quartal sound' }
                        ]; 
                    }
                } else if (currentExtCount === 1) {
                    // TIER 2: The 9th (context-aware based on 7th choice)
                    tierName = 'Level 2: Add the 9th';
                    theoryTip = 'Adds color without changing function. A 9th is an octave + 2nd.';
                    
                    // Targets relative to root: 13 (b9), 14 (9), 15 (#9)
                    const distToFlat9 = 13 - currentHeight;
                    const distToNat9 = 14 - currentHeight;
                    const distToSharp9 = 15 - currentHeight;
                    
                    // Get the 7th type that was selected
                    const seventhId = this.extensionIds[0];
                    
                    // Filter options based on chord type and 7th choice
                    let ninthOptions = [
                        { id: 'b9', label: 'Flat 9 (b9)', int: distToFlat9, desc: 'Dark, Spanish Phrygian' },
                        { id: 'nat9', label: 'Natural 9th', int: distToNat9, desc: 'Rich, standard beauty' },
                        { id: 'shp9', label: 'Sharp 9 (#9)', int: distToSharp9, desc: 'Hendrix chord tension' }
                    ];
                    
                    // Context-aware filtering
                    if (seventhId === 'maj7' || seventhId === 'minmaj7') {
                        // Maj7 and MinMaj7 chords prefer natural 9
                        ninthOptions = ninthOptions.filter(o => o.id === 'nat9' || o.id === 'shp9');
                    } else if (seventhId === 'min7' || seventhId === 'min6') {
                        // Minor 7 / Minor 6 prefer natural 9, rarely b9 or #9
                        ninthOptions = ninthOptions.filter(o => o.id === 'nat9');
                    } else if (seventhId === 'dom7' || seventhId === 'maj6') {
                        // Dominant 7 / Major 6 allow all options (most flexible)
                        // Keep all options
                    } else if (seventhId === 'dim7' || seventhId === 'm7b5') {
                        // Diminished contexts prefer b9 for darker color
                        ninthOptions = ninthOptions.filter(o => o.id === 'b9' || o.id === 'nat9');
                    } else if (seventhId === 'aug7' || seventhId === 'maj7aug') {
                        // Augmented contexts allow #9 and nat9
                        ninthOptions = ninthOptions.filter(o => o.id !== 'b9');
                    }
                    
                    availableOptions = ninthOptions.filter(o => o.int > 0);
                } else if (currentExtCount === 2) {
                    // TIER 3: The 11th (context-aware)
                    tierName = 'Level 3: Add the 11th';
                    theoryTip = 'Often clashes with the 3rd. #11 is safer on Major chords.';
                    
                    const distToNat11 = 17 - currentHeight;
                    const distToSharp11 = 18 - currentHeight;
                    
                    // Get context: chord type and 7th choice
                    const seventhId = this.extensionIds[0];
                    
                    // Filter based on context
                    let eleventhOptions = [
                        { id: 'nat11', label: 'Natural 11th', int: distToNat11, desc: 'Smooth, suspended feel' },
                        { id: 'shp11', label: 'Sharp 11 (#11)', int: distToSharp11, desc: 'Lydian brightness' }
                    ];
                    
                    // Natural 11 clashes with the major 3rd, so less common in major/dominant chords
                    // #11 is preferred in major and dom7 chords
                    if (this.chordType === 'major' && (seventhId === 'maj7' || seventhId === 'dom7' || seventhId === 'maj6')) {
                        // Major chords prefer #11
                        eleventhOptions = eleventhOptions.filter(o => o.id === 'shp11');
                    } else if (this.chordType === 'minor') {
                        // Minor chords are more forgiving with natural 11
                        // Keep both options
                    } else if (this.chordType === 'aug') {
                        // Augmented chords can use #11
                        eleventhOptions = eleventhOptions.filter(o => o.id === 'shp11');
                    }
                    
                    availableOptions = eleventhOptions.filter(o => o.int > 0);
                } else if (currentExtCount >= 3) {
                     // TIER 4: The 13th (context-aware)
                    tierName = 'Level 4: Add the 13th';
                    theoryTip = 'The logical conclusion of 3rds. Same as the 6th relative to root.';
                    
                    const distToNat13 = 21 - currentHeight;
                    const distToFlat13 = 20 - currentHeight;
                    
                    // Get context: chord type and 7th choice
                    const seventhId = this.extensionIds[0];
                    
                    let thirteenthOptions = [
                        { id: 'nat13', label: 'Natural 13th', int: distToNat13, desc: 'Full, complex jazz sound' },
                        { id: 'b13', label: 'Flat 13 (b13)', int: distToFlat13, desc: 'Altered/Minor flavor' }
                    ];
                    
                    // Natural 13 works better on major/dominant contexts
                    // Flat 13 is more common in minor/altered contexts
                    if (this.chordType === 'minor' && (seventhId === 'min7' || seventhId === 'min6')) {
                        // Minor chords often prefer flat 13
                        thirteenthOptions = thirteenthOptions.filter(o => o.id === 'b13' || o.id === 'nat13');
                    } else if (this.chordType === 'major' && seventhId === 'dom7') {
                        // Dominant 7 can use b13 for alteration
                        // Keep both
                    } else if (seventhId === 'm7b5' || seventhId === 'dim7') {
                        // Half-diminished prefers flat 13
                        thirteenthOptions = thirteenthOptions.filter(o => o.id === 'b13');
                    }
                    
                    availableOptions = thirteenthOptions.filter(o => o.int > 0);
                }


                
                html += `
                    <div style="padding:16px; background:rgba(255,255,255,0.03); border-bottom:1px solid var(--border-light);">
                         <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                            <div style="font-weight:700; font-size:1rem; color:var(--text-highlight);">${tierName}</div>
                            ${this.extensions.length > 0 ? `<button id="reset-ext-btn" style="font-size:0.8rem; padding:4px 8px; background:transparent; border:1px solid var(--border-light); border-radius:4px; color:var(--text-muted); cursor:pointer;">Reset All</button>` : ''}
                         </div>
                         <div style="font-size:0.9rem; color:var(--accent-secondary); font-style:italic;">
                            💡 ${theoryTip}
                         </div>
                    </div>
                    <div style="padding:16px; display:grid; gap:12px;">
                `;
                
                // Dominant 7 should only appear in appropriate contexts (Major, Sus, Aug)
                if (currentExtCount === 0) {
                    const allowDom7 = (this.chordType === 'major' || this.chordType === 'aug' || (typeof this.chordType === 'string' && this.chordType.includes('sus')));
                    if (!allowDom7) {
                        availableOptions = availableOptions.filter(o => o.id !== 'dom7');
                    }
                }

                if(availableOptions.length === 0 && currentExtCount < 4) {
                     html += `<div style="text-align:center; padding:10px; color:var(--text-muted);">
                        No standard extensions fit above this stack.<br>
                        <span style="font-size:0.8rem;">(Height: ${currentHeight} semitones)</span>
                     </div>`;
                } else if (currentExtCount >= 4) {
                     html += `<div style="text-align:center; padding:10px; color:var(--text-muted);">Max extensions reached!</div>`;
                }

                availableOptions.forEach((opt, idx) => {
                    html += `
                        <div class="ext-option" data-int="${opt.int}" data-id="${opt.id}" style="
                            display:flex; align-items:center; padding:12px; border:1px solid var(--border-light); border-radius:6px; background:transparent; cursor:pointer; transition:all 0.1s;
                        ">
                            <div style="width:24px; height:24px; border-radius:50%; border:2px solid var(--text-muted); margin-right:12px; display:flex; align-items:center; justify-content:center;">
                                <div style="width:12px; height:12px; border-radius:50%; background:var(--accent-primary); opacity:0;"></div>
                            </div>
                            <div style="flex:1;">
                                <div style="font-weight:700; color:var(--text-main);">${opt.label}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted);">${opt.desc}</div>
                            </div>
                            <div style="font-size:0.9rem; font-weight:600; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px;">+${opt.int} semi</div>
                        </div>
                    `;
                });
                
                html += `</div>`;
                extContainer.innerHTML = html;
                
                // Wire Reset
                const resetBtn = extContainer.querySelector('#reset-ext-btn');
                if(resetBtn) resetBtn.onclick = () => {
                    this.extensions = [];
                    this.extensionIds = [];
                    this.renderRecipe();
                    this.renderExtensionsUI();
                    this.updateChordDisplay(true);
                }
                
                // Wire Stack Removal
                extContainer.querySelectorAll('.stack-item').forEach(item => {
                    item.onclick = (e) => {
                        e.stopPropagation();
                        // Get idx
                        const idx = parseInt(item.dataset.index);
                        // Cut everything from this point onwards
                        // If they click 0 (7th), we want to remove 0 and everything after, so slice(0,0) -> empty.
                        // If they click 1 (9th), we want to keep 0, so slice(0,1).
                        this.extensions = this.extensions.slice(0, idx);
                        this.extensionIds = this.extensionIds.slice(0, idx);
                        this.renderRecipe();
                        this.renderExtensionsUI();
                        this.playHighQualityChord(this.getChordMidis(), 0.8);
                    }
                });

                // Wire Options
                extContainer.querySelectorAll('.ext-option').forEach(row => {
                    row.onclick = () => {
                       const val = parseInt(row.dataset.int);
                       const id = row.dataset.id;
                       this.extensions.push(val);
                       this.extensionIds.push(id);
                       
                       this.renderRecipe();
                       this.renderExtensionsUI();
                       
                       this.playHighQualityChord(this.getChordMidis(), 0.8);
                    };
                });
            }



        setChordIntervals(type) {
            const intervals = {
                'major': [4, 3],
                'minor': [3, 4],
                'dim': [3, 3],
                'aug': [4, 4]
            };
            this.chordIntervals = intervals[type] || [4, 3];
            this.extensions = [];
            this.extensionIds = [];
            try { this.renderExtensionsUI(); } catch(e) {}
        }

        updateUI() {
            // Update stepper
            this.updateStepper();
            
            // Update chord display
            if (this.rootMidi) {
                const chordName = this.getChordName();
                const display = this.containerEl.querySelector('#current-chord-display');
                if (display) {
                    display.innerHTML = `
                        <div style="font-size:2rem; font-weight:700; color:var(--accent-primary); margin-bottom:6px;">${chordName}</div>
                        <div style="font-size:0.9rem; color:var(--text-muted);">Formula: ${this.chordIntervals.join('+')} ${this.extensions.length ? '+ extensions' : ''}</div>
                    `;
                }
            }
            
            // Show/hide panels
            if (this.step2Panel) this.step2Panel.style.display = this.step >= 2 && this.rootMidi ? '' : 'none';
            if (this.step3Panel) this.step3Panel.style.display = this.step >= 3 ? '' : 'none';
            if (this.step4Panel) this.step4Panel.style.display = this.step >= 4 ? '' : 'none';
            if (this.step5Panel) this.step5Panel.style.display = this.step >= 5 ? '' : 'none';
            
            // Update theory explanation
            if (this.step >= 2 && this.step2Panel) {
                const explanation = this.step2Panel.querySelector('#theory-explanation');
                if (explanation) {
                    explanation.innerHTML = this.getTheoryExplanation();
                }
            }
        }

        getTheoryExplanation() {
            const explanations = {
                'major': '<strong>Major triads</strong> use a major third (4 half-steps) then a minor third (3 half-steps). This creates a stable, happy sound used in most pop, rock, and classical music.',
                'minor': '<strong>Minor triads</strong> flip it: minor third (3 half-steps) then major third (4 half-steps). This creates a darker, sadder sound often used for emotional depth.',
                'dim': '<strong>Diminished triads</strong> stack two minor thirds (3+3). This creates tension and instability, often used as a transition chord.',
                'aug': '<strong>Augmented triads</strong> stack two major thirds (4+4). This creates a dreamy, floating quality used in jazz and film scores.'
            };
            return explanations[this.chordType] || '';
        }

        getChordName() {
            if (!this.rootNote) return '';
            const type = this.chordType;
            const ids = Array.isArray(this.extensionIds) ? this.extensionIds : [];

            // Basic check if it's Sus
            if (type && type.includes('sus')) {
                let base = this.rootNote + (type === 'sus2' ? 'sus2' : 'sus4');
                if (ids.length > 0) base += ' (ext)';
                return base;
            }

            // Helpers
            const hasId = (id) => ids.indexOf(id) !== -1;
            const hasAny = (list) => list.some(i => hasId(i));

            // Minor chords
            if (type === 'minor') {
                // m6/9
                if (hasAny(['min6', 'maj6', '6']) && hasAny(['nat9', 'shp9', '9'])) {
                    return this.rootNote + 'm6/9';
                }
                // m6
                if (hasAny(['min6', 'maj6', '6'])) return this.rootNote + 'm6';
                // m(maj7)
                if (hasId('minmaj7')) return this.rootNote + 'm(maj7)';
                // m9
                if (hasAny(['min7', 'minmaj7']) && hasAny(['nat9', 'shp9', 'b9'])) return this.rootNote + 'm9';
                // m7
                if (hasAny(['min7'])) return this.rootNote + 'm7';
                // add9
                if (hasAny(['nat9', 'shp9', 'b9'])) return this.rootNote + 'm(add9)';
                return this.rootNote + 'm';
            }

            // Major chords
            if (type === 'major') {
                // 6/9
                if (hasAny(['maj6', '6']) && hasAny(['nat9', '9'])) return this.rootNote + '6/9';
                if (hasAny(['maj6', '6'])) return this.rootNote + '6';
                if (hasId('maj7')) return this.rootNote + 'maj7';
                if (hasId('dom7')) {
                    if (hasAny(['nat9', 'shp9', 'b9'])) return this.rootNote + '7(9)';
                    return this.rootNote + '7';
                }
                if (hasAny(['nat9', 'shp9', 'b9'])) return this.rootNote + 'add9';
                return this.rootNote;
            }

            // Diminished
            if (type === 'dim') {
                if (hasAny(['dim7', 'm7b5'])) return this.rootNote + 'dim7';
                return this.rootNote + 'dim';
            }

            // Augmented
            if (type === 'aug') {
                if (hasAny(['maj7aug', 'aug7'])) return this.rootNote + 'aug7';
                return this.rootNote + 'aug';
            }

            return this.rootNote;
        }

        getChordMidis() {
            if (!this.rootMidi) return [];
            // 1. Base intervals
            const intervals = [...this.chordIntervals, ...this.extensions];
            const baseMidis = [this.rootMidi];
            let cur = this.rootMidi;
            intervals.forEach(i => { cur += i; baseMidis.push(cur); });
            
            // 2. Apply Inversions
            // Inversion 0: [0, 1, 2]
            // Inversion 1: [1, 2, 0+12]
            let midis = [...baseMidis];
            const count = midis.length;
            const shifts = this.inversion % count; 
            
            for (let i = 0; i < shifts; i++) {
                const note = midis.shift();
                midis.push(note + 12);
            }
            // Keep pitch order
            return midis;
        }

        updateChordDisplay(play = false) {
            const midis = this.getChordMidis();
            const notes = midis.map(m => this.midiToNote(m));
            const formattedNotes = notes.map(n => n.replace(/\d+$/, ''));
            
            // Visualizer (needs octaves)
            if (this.visualizer && this.visualizer.setHighlightedNotes) {
                this.visualizer.setHighlightedNotes(notes);
            }
            
            // Audio
            if (play) {
                if (this.playMode === 'arpeggio') {
                    // Stagger playback
                    midis.forEach((m, i) => {
                        this.playHighQualityNote(m, i * 0.15, 0.4);
                    });
                } else {
                    this.playHighQualityChord(midis, 1.2);
                }
            }
            
            // Update Text Panel
            const info = this.step4Panel ? this.step4Panel.querySelector('#extended-chord-info') : null;
            if (info) {
                let typeText = 'Basic Triad';
                let desc = 'The foundation of harmony.';
                
                if (this.extensionMeta) {
                    typeText = this.extensionMeta.name;
                    desc = this.extensionMeta.description;
                }
                
                if (this.inversion > 0) {
                    const names = ['Root', '1st', '2nd', '3rd'];
                    const invName = names[this.inversion] || (this.inversion + 'th');
                    typeText += ` <span style="color:var(--text-muted); font-size:0.8em;">(${invName} Inv)</span>`;
                }

                const intervals = [...this.chordIntervals, ...this.extensions];

                info.innerHTML = `
                    <div style="font-size:1.2rem; font-weight:700; margin-bottom:8px; color:var(--accent-primary);">${this.getChordName()}</div>
                    <div style="margin-bottom:8px;"><strong>Type:</strong> ${typeText}</div>
                    <div style="margin-bottom:8px;"><strong>Notes:</strong> ${formattedNotes.join(' – ')}</div>
                    <div style="margin-bottom:8px;"><strong>Formula:</strong> ${intervals.join('+')}</div>
                    <div style="color:var(--text-muted); font-size:0.9rem; padding-top:8px; border-top:1px solid var(--border-light);">${desc}</div>
                `;
            }
            
            this.updateUI(); 
        }

        animateCounting() {
            if (this.animating) return;
            this.animating = true;
            
            const intervals = [...this.chordIntervals, ...this.extensions];
            const chordToneNames = ['Root', '3rd', '5th', '7th', '9th', '11th', '13th'];
            const chordToneMidis = [this.rootMidi];
            let cur = this.rootMidi;
            for (let interval of intervals) {
                cur += interval;
                chordToneMidis.push(cur);
            }
            
            const visual = this.step3Panel.querySelector('#counting-visual');
            const explanation = this.step3Panel.querySelector('#counting-explanation');
            let intervalIndex = 0;
            let currentMidi = this.rootMidi;
            
            // Show the root first
            const rootNote = this.midiToNote(this.rootMidi);
            const rootDisplay = rootNote.replace(/\d+$/, '');
            this.visualizer.setHighlightedNotes([rootNote]);
            this.playHighQualityNote(this.rootMidi, 0, 0.3);
            visual.innerHTML = '<div style="font-size:1.3rem; color:#10b981;">✓ Root: ' + rootDisplay + '</div>';
            explanation.innerHTML = '<strong>Starting note (Root):</strong> ' + rootDisplay + '. Now we will count up to find the other chord tones.';
            
            const countToNextChordTone = () => {
                if (intervalIndex >= intervals.length) {
                    // Done - show all chord tones
                    const allNotes = chordToneMidis.map(m => this.midiToNote(m));
                    const allDisplay = allNotes.map(n => n.replace(/\d+$/, ''));
                    this.visualizer.setHighlightedNotes(allNotes);
                    visual.innerHTML = '<div style="font-size:1.3rem; color:#10b981;">✓ Complete!</div>';
                    explanation.innerHTML = '<strong>Your ' + this.getChordName() + ' chord:</strong> ' + allDisplay.join(' – ') + '<br><strong>Formula:</strong> ' + intervals.join('+') + ' half-steps';
                    this.animating = false;
                    this.step = Math.max(this.step, 4);
                    this.updateUI();
                    return;
                }
                
                const targetMidi = chordToneMidis[intervalIndex + 1];
                const interval = intervals[intervalIndex];
                const intervalName = chordToneNames[intervalIndex + 1];
                const startMidi = chordToneMidis[intervalIndex];
                let stepsTaken = 0;
                
                // Count each half-step to the next chord tone
                const countStep = () => {
                    stepsTaken++;
                    currentMidi = startMidi + stepsTaken;
                    
                    // Highlight all previous chord tones plus current counting position
                    const highlightNotes = [];
                    for (let i = 0; i <= intervalIndex; i++) {
                        highlightNotes.push(this.midiToNote(chordToneMidis[i]));
                    }
                    for (let m = startMidi + 1; m <= currentMidi; m++) {
                        highlightNotes.push(this.midiToNote(m));
                    }
                    
                    if (this.visualizer && this.visualizer.setHighlightedNotes) {
                        this.visualizer.setHighlightedNotes(highlightNotes);
                    }
                    
                    // Play note
                    this.playHighQualityNote(currentMidi, 0, 0.15);
                    
                    const currentNote = this.midiToNote(currentMidi);
                    const currentDisplay = currentNote.replace(/\d+$/, '');
                    
                    if (stepsTaken < interval) {
                        // Still counting
                        visual.innerHTML = '<div style="font-size:1.2rem;">Counting to ' + intervalName + '... <span style="color:#f59e0b;">' + stepsTaken + '/' + interval + '</span> half-steps</div>';
                        explanation.innerHTML = '<strong>Current note:</strong> ' + currentDisplay + ' (' + stepsTaken + ' half-step' + (stepsTaken > 1 ? 's' : '') + ' from previous chord tone)';
                        setTimeout(countStep, 350);
                    } else {
                        // Reached the chord tone!
                        visual.innerHTML = '<div style="font-size:1.3rem; color:#10b981;">✓ Found ' + intervalName + ': ' + currentDisplay + '</div>';
                        explanation.innerHTML = '<strong>Chord tone found!</strong> ' + currentDisplay + ' is the <strong>' + intervalName + '</strong> (' + interval + ' half-steps from the ' + chordToneNames[intervalIndex] + ')';
                        
                        // Pause longer at chord tones to emphasize
                        setTimeout(() => {
                            intervalIndex++;
                            countToNextChordTone();
                        }, 800);
                    }
                };
                
                // Start counting after a brief pause
                setTimeout(countStep, 600);
            };
            
            // Start counting after showing root
            setTimeout(countToNextChordTone, 1000);
        }

        extendChord(extensionType) {
            const extensionInfo = {
                'dom7': { 
                    intervals: [3], 
                    name: 'Dominant 7th',
                    description: 'Adds tension and wants to resolve. Common in blues, jazz, and rock.'
                },
                'maj7': { 
                    intervals: [4], 
                    name: 'Major 7th',
                    description: 'Creates a dreamy, sophisticated sound. Popular in jazz and R&B.'
                },
                '9th': { 
                    intervals: [3, 4],
                    name: '9th chord',
                    description: 'Adds complexity and richness. Widely used in jazz and funk.'
                }
            };
            
            this.extensionMeta = extensionInfo[extensionType];
            this.extensions = this.extensionMeta.intervals;
            this.updateChordDisplay(true);
            this.step = Math.max(this.step, 5);
        }

        resetToTriad() {
            this.extensions = [];
            this.extensionMeta = null;
            this.inversion = 0;
            
            // Reset UI states
            if (this.step4Panel) {
                this.step4Panel.querySelectorAll('.inv-btn').forEach(b => {
                    b.style.borderColor = 'transparent';
                    b.style.background = 'transparent';
                });
                const rootBtn = this.step4Panel.querySelector('.inv-btn[data-inv="0"]');
                if (rootBtn) {
                     rootBtn.style.borderColor = 'var(--accent-primary)';
                     rootBtn.style.background = 'rgba(59,130,246,0.1)';
                }
            }
            
            this.updateChordDisplay(true);
        }

        playCurrentChord() {
            this.updateChordDisplay(true);
        }

        playProgression(type) {
            const progressions = {
                'Cmaj': {
                    chords: [[60,64,67],[65,69,72],[67,71,74],[60,64,67]],
                    names: ['C', 'F', 'G', 'C']
                },
                'Cmin': {
                    chords: [[60,63,67],[65,68,72],[67,71,74],[60,63,67]],
                    names: ['Cm', 'Fm', 'G', 'Cm']
                },
                'Cm7': {
                    chords: [[60,64,67,71],[69,72,76,79],[65,69,72,76],[67,71,74,77]],
                    names: ['Cmaj7', 'Am7', 'Fmaj7', 'G7']
                },
                'Pop': {
                    chords: [[60,64,67],[67,71,74],[69,72,76],[65,69,72]],
                    names: ['C', 'G', 'Am', 'F']
                }
            };
            
            const prog = progressions[type];
            if (!prog) return;
            
            const display = this.step5Panel.querySelector('#progression-display');
            let idx = 0;
            
            const playNext = () => {
                if (idx >= prog.chords.length) {
                    display.innerHTML = '<div style="color:var(--text-muted);">Progression complete</div>';
                    return;
                }
                
                // Highlight chord
                display.innerHTML = '<div style="color:var(--accent-primary);">' + prog.names[idx] + '</div>';
                
                // Highlight on piano
                const notes = prog.chords[idx].map(m => this.midiToNote(m));
                this.visualizer.setHighlightedNotes(notes);
                
                // Play chord
                this.playHighQualityChord(prog.chords[idx], 0.7);
                
                idx++;
                setTimeout(playNext, 1000);
            };
            
            playNext();
        }

        updateStepper() {
            const stepper = this.containerEl?.querySelector('#learn-chords-stepper');
            if (!stepper) return;
            const steps = stepper.children;
            for (let i=0; i<steps.length; i++) {
                const isActive = (i+1 === this.step);
                steps[i].style.background = isActive ? '#bae6fd' : '#f1f5f9';
                steps[i].style.color = isActive ? '#0369a1' : '#64748b';
                steps[i].style.borderColor = isActive ? '#38bdf8' : '#e5e7eb';
            }
        }

        midiToNote(midi) {
            const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
            const octave = Math.floor(midi/12)-1;
            return notes[midi%12] + octave;
        }
    }

    window.LearnChords = LearnChords;
})();
