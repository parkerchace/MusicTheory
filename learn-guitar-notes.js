// learn-guitar-notes.js
// Module for learning guitar notes (fretboard visualization, note names, interactive practice)

// Simple LearnGuitarNotes class with mount API
class LearnGuitarNotes {
    constructor() {
        this.container = null;
        this._fretboard = null;
        this.steps = ['C','D','E','F','G','A','B'];
        this.stepIndex = 0;
        this.showOctave = true;
        // speech is disabled by default to avoid unsolicited audio output
        this.speechEnabled = false;
        this.lessonStepIndex = 0;
        this.ui = {};
        this.pages = ['Intro','Notes','Octaves','Intervals','Practice','Quiz'];
        this.currentPage = 0;
        this.fullPage = false;
    }

    mount(selector) {
        this.container = document.querySelector(selector) || document.getElementById('learn-guitar-notes-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'learn-guitar-notes-container';
            document.body.appendChild(this.container);
        }
        this.container.style.padding = '16px';
        this.container.style.background = 'linear-gradient(180deg,#151515,#1b1b1b)';
        this.container.style.color = '#fff';
        this.container.style.borderRadius = '0';
        this.container.style.margin = '0';
        this.container.style.maxWidth = 'none';
        this.container.style.width = '100%';
        this.container.style.boxShadow = 'none';

        this.container.innerHTML = '';

        // Layout: stacked top-to-bottom pedagogy (steps -> visualizer -> instructions)
        const layout = document.createElement('div');
        layout.style.display = 'flex';
        layout.style.flexDirection = 'column';
        layout.style.gap = '18px';
        layout.style.alignItems = 'stretch';
        layout.style.width = '100%';

        const vizWrap = document.createElement('div');
        vizWrap.style.flex = '0 0 auto';
        vizWrap.style.minWidth = '0';
        vizWrap.style.padding = '12px';
        vizWrap.style.borderRadius = '8px';
        vizWrap.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))';
        vizWrap.style.minHeight = '260px';
        // make vizWrap the named container so other code can target it
        vizWrap.id = 'guitar-learn-container';
        vizWrap.style.overflow = 'hidden';
        vizWrap.style.width = '100%';
        this.vizWrap = vizWrap;

        const teachWrap = document.createElement('div');
        teachWrap.style.width = '100%';
        teachWrap.style.flex = '0 0 auto';
        teachWrap.style.boxSizing = 'border-box';

        // top-to-bottom: visualizer first, then teaching/instructions
        layout.appendChild(vizWrap);
        layout.appendChild(teachWrap);
        // keep references for layout toggling
        this.layout = layout;
        this.teachWrap = teachWrap;
        // store original sizing so we can revert
        this._orig = { maxWidth: this.container.style.maxWidth || '', vizMinWidth: vizWrap.style.minWidth || '', teachWidth: teachWrap.style.width || '', layoutFlex: layout.style.flexDirection || '' };
        this.container.appendChild(layout);

        // Title (use the unified Learn Notes header to match piano pedagogy)
        const title = document.createElement('h2');
        title.textContent = 'Learn Notes';
        title.style.margin = '0 0 12px 0';
        title.style.fontSize = '1.25rem';
        this.container.insertBefore(title, layout);

        // Guitar-specific intro (no piano-style steps block). Top-down pedagogy: intro → fretboard → sheet/explain → practice
        const intro = document.createElement('div');
        intro.id = 'guitar-intro';
        intro.style.margin = '0 0 12px 0';
        intro.innerHTML = `
            <div style="font-weight:700;color:var(--text-main);font-size:1.05rem;margin-bottom:6px;">Guitar: Notes, Frets, and Octaves</div>
            <div style="color:var(--text-muted);">This lesson focuses on how note names map to the fretboard, how octaves repeat, and how accidentals (sharps/flats) appear on frets. Use the fretboard below to explore sounds and positions.</div>
        `;
        this.container.insertBefore(intro, layout);
        // Add link to Learn Scales and note about starting in C major
        const scalesLink = document.createElement('button');
        scalesLink.textContent = 'Want to learn more about scales?';
        scalesLink.style.cssText = 'display:inline-block;margin-top:8px;padding:6px 10px;border:2px solid var(--accent-secondary);background:transparent;color:var(--text-main);border-radius:4px;cursor:pointer;font-weight:700;';
        intro.appendChild(scalesLink);
        scalesLink.addEventListener('click', () => {
            const inst = localStorage.getItem('music-theory-instrument') || 'guitar';
            try {
                if (window.moduleSelector && typeof window.moduleSelector.selectInstrument === 'function') {
                    window.moduleSelector.selectInstrument(inst);
                }
                if (window.moduleSelector && typeof window.moduleSelector.launchLearnScales === 'function') {
                    window.moduleSelector.launchLearnScales();
                } else if (typeof window.showLearnNotesModule === 'function') {
                    window.showLearnNotesModule(inst);
                }
            } catch (e) { console.warn('Failed to open Learn Scales:', e); }
        });

        // Render unified lesson structure (header, steps, fretboard container, sheet music, etc.)
        this.renderUnified();

        // Build instruction panel (below the fretboard)
        this._buildInstructionPanel(teachWrap);

        // Mount guitar visualizer into the unified fretboard container
        const guitarContainer = this.container.querySelector('#guitar-learn-container') || vizWrap;
        const GuitarClass = (typeof window !== 'undefined' && window.GuitarFretboardVisualizer) || (typeof GuitarFretboardVisualizer !== 'undefined' && GuitarFretboardVisualizer);
        if (GuitarClass) {
            try {
                this._fretboard = new GuitarClass({ frets: 16, showNoteLabels: true, fitToContainer: true });
                if (typeof this._fretboard.mount === 'function') {
                    this._fretboard.mount(guitarContainer);
                } else if (this._fretboard.element) {
                    guitarContainer.appendChild(this._fretboard.element);
                }
                // annotate frets with octave labels when the visualizer is present
                try { this._annotateFretLabels(); } catch (e) { /* non-fatal */ }
                if (typeof this._fretboard.renderScale === 'function') {
                    this._fretboard.renderScale({ key: 'C', scale: 'major', notes: ['C','D','E','F','G','A','B'] });
                }
                if (this._fretboard && typeof this._fretboard.on === 'function') {
                    this._fretboard.on('noteClicked', (ev) => { this._onNoteClicked(ev); });
                }
            } catch (e) {
                console.warn('[LearnGuitarNotes] GuitarFretboardVisualizer failed, falling back:', e);
                this._renderFallbackVisualizer(guitarContainer);
            }
        } else {
            this._renderFallbackVisualizer(guitarContainer);
        }

        // Render sheet music and accidentals explain (reuse guitar-specific accidentals)
        this.renderSheetMusic();
        try { this._renderGuitarAccidentals(); } catch (e) {}

        // Ensure overlay and connector behavior
        this._ensureOverlay();
        this.setupConnectorRedrawEvents();

        // Setup navigation buttons (Home, Theme toggle)
        try { this.setupNavigationButtons(); } catch (e) { /* non-fatal */ }

        // Initialize lesson state
        this.gotoStep(0);
    }

    setupNavigationButtons() {
        // Home button - return to landing page
        const homeBtn = document.getElementById('learn-return-to-landing');
        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                const landingPage = document.getElementById('landing-page');
                const learnPage = document.getElementById('learn-guitar-page');
                if (landingPage && learnPage) {
                    landingPage.style.display = 'block';
                    learnPage.style.display = 'none';
                }
            });

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

            themeBtn.addEventListener('mouseenter', () => {
                themeBtn.style.background = 'var(--accent-secondary)';
                themeBtn.style.color = '#000';
            });
            themeBtn.addEventListener('mouseleave', () => {
                themeBtn.style.background = 'transparent';
                themeBtn.style.color = 'var(--text-main)';
            });
        }
        // Pitch only toggle
        const pitchBtn = document.getElementById('learn-pitch-toggle');
        if (pitchBtn) {
            pitchBtn.addEventListener('click', () => {
                this.showOctave = !this.showOctave;
                pitchBtn.textContent = this.showOctave ? 'Pitch only' : 'Show octave';
                try { this._annotateFretLabels(); } catch (e) {}
            });
        }

        // Save positions button
        const saveBtn = document.getElementById('learn-save-positions');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                try { this.savePositionsToLearnScales(); saveBtn.textContent = 'Saved'; setTimeout(()=> saveBtn.textContent='Save positions',900); } catch(e){ console.warn(e); }
            });
        }
        // Attach practice listeners to fret cells (if available)
        try { this._attachPracticeListeners(); } catch (e) { /* non-fatal */ }
    }

    _attachPracticeListeners() {
        if (!this.container) return;
        const startBtn = this.container.querySelector('#guitar-practice-start');
        if (startBtn && !this._practiceBound) {
            startBtn.addEventListener('click', () => this.startPractice());
            this._practiceBound = true;
        }
        // delegate clicks on fret cells while in practice mode
        const grid = this.container.querySelector('#guitar-learn-container');
        if (!grid) return;
        if (!this._practiceCellHandler) {
            this._practiceCellHandler = (ev) => {
                const el = ev.target.closest && ev.target.closest('.fret-cell');
                if (!el || !this._practiceActive) return;
                const note = el.dataset.note;
                if (!note) return;
                const target = this._practiceTarget;
                if (!target) return;
                // normalize enharmonic
                const isCorrect = (note === target) || (this.getEnharmonicEquivalent(note) === target) || (this.getEnharmonicEquivalent(target) === note);
                const feedbackEl = this.container.querySelector('#guitar-practice-feedback');
                if (isCorrect) {
                    if (feedbackEl) feedbackEl.textContent = 'Correct!';
                    try { if (window.modularApp && typeof window.modularApp.guitarEngine?.playNote === 'function') window.modularApp.guitarEngine.playNote(parseInt(el.dataset.midi,10)); } catch (e){}
                    // brief green highlight
                    el.classList.add('gt-pulse');
                    this._showPracticeBanner('Correct', `${note} — well done.`, 'success');
                    setTimeout(() => { el.classList.remove('gt-pulse'); }, 900);
                    // stop practice after short delay so user sees feedback
                    setTimeout(() => this.stopPractice(), 900);
                } else {
                    if (feedbackEl) feedbackEl.textContent = 'Try again';
                    // small shake to indicate incorrect
                    el.style.transition = 'transform 0.12s ease';
                    el.style.transform = 'translateX(6px)';
                    setTimeout(() => { el.style.transform = 'translateX(-6px)'; }, 120);
                    setTimeout(() => { el.style.transform = ''; }, 260);
                    this._showPracticeBanner('Not quite', 'Try listening and look for the pulsing frets.', 'warn');
                }
            };
            // use capture on container to catch events from dynamically created cells
            this.container.addEventListener('click', this._practiceCellHandler, true);
        }
        // ensure practice UI styles exist and make panel visible (pinned)
        try { this._ensurePracticeUIStyles(); } catch (e) {}
    }

    _ensurePracticeUIStyles() {
        if (this._practiceStylesInjected) return;
        const css = `
            #guitar-practice-panel { position: fixed !important; bottom: 14px !important; left: 14px !important; right: 14px !important; max-width: calc(100% - 28px); margin: 0 auto; z-index: 10050; box-shadow: 0 6px 24px rgba(0,0,0,0.4); }
            #guitar-practice-panel .gt-banner { display:flex; flex-direction:column; gap:4px; align-items:center; justify-content:center; padding:10px 14px; border-radius:8px; font-weight:700; }
            .gt-banner.hidden { display:none; }
            .gt-banner.success { background: linear-gradient(90deg,#bbf7d0,#86efac); color:#044; }
            .gt-banner.warn { background: linear-gradient(90deg,#fee2b7,#fca5a5); color:#3a0808; }
            .gt-pulse { animation: gt-pulse 0.8s ease-in-out 1; box-shadow: 0 0 18px rgba(96,165,250,0.95) !important; }
            @keyframes gt-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.18); } 100% { transform: scale(1); } }
        `;
        const style = document.createElement('style');
        style.setAttribute('data-origin','learn-guitar-practice');
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
        // create banner element if missing
        if (this.container) {
            let banner = document.getElementById('guitar-practice-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'guitar-practice-banner';
                banner.className = 'gt-banner hidden';
                banner.style.position = 'fixed';
                banner.style.left = '50%';
                banner.style.transform = 'translateX(-50%)';
                banner.style.bottom = '84px';
                banner.style.zIndex = '10060';
                banner.style.minWidth = '220px';
                banner.style.maxWidth = '900px';
                banner.style.textAlign = 'center';
                document.body.appendChild(banner);
            }
        }
        this._practiceStylesInjected = true;
    }

    _showPracticeBanner(title, subtitle, type) {
        try {
            const banner = document.getElementById('guitar-practice-banner');
            if (!banner) return;
            banner.className = `gt-banner ${type || 'success'}`;
            banner.innerHTML = `<div style="font-size:1.05rem">${title}</div><div style="font-size:0.95rem;font-weight:600;margin-top:6px;color:inherit;opacity:0.95">${subtitle}</div>`;
            banner.classList.remove('hidden');
            clearTimeout(this._practiceBannerTimeout);
            this._practiceBannerTimeout = setTimeout(() => {
                banner.classList.add('hidden');
            }, 1800);
        } catch (e) { /* ignore */ }
    }

    startPractice() {
        const choices = ['C','D','E','F','G','A','B'];
        const target = choices[Math.floor(Math.random() * choices.length)];
        this._practiceActive = true;
        this._practiceTarget = target;
        const targetEl = this.container.querySelector('#guitar-practice-target');
        const feedbackEl = this.container.querySelector('#guitar-practice-feedback');
        if (targetEl) targetEl.textContent = target;
        if (feedbackEl) feedbackEl.textContent = 'Click the note on the fretboard';
        // visually emphasize matching notes
        const cells = this.container.querySelectorAll('#guitar-learn-container .fret-cell');
        cells.forEach(c => {
            if (c.dataset.note === target || this.getEnharmonicEquivalent(c.dataset.note) === target) {
                c.style.boxShadow = '0 0 6px rgba(96,165,250,0.9)';
            } else {
                // dim non-target tones slightly
                c.style.opacity = '0.25';
            }
        });
    }

    stopPractice() {
        this._practiceActive = false;
        this._practiceTarget = null;
        const targetEl = this.container.querySelector('#guitar-practice-target');
        const feedbackEl = this.container.querySelector('#guitar-practice-feedback');
        if (targetEl) targetEl.textContent = '—';
        if (feedbackEl) feedbackEl.textContent = '';
        const cells = this.container.querySelectorAll('#guitar-learn-container .fret-cell');
        cells.forEach(c => {
            c.style.boxShadow = '';
            c.style.opacity = '';
        });
    }

    _annotateFretLabels() {
        if (!this.container) return;
        const cells = this.container.querySelectorAll('#guitar-learn-container [data-midi]');
        if (!cells || cells.length === 0) return;
        cells.forEach(cell => {
            try {
                const midi = parseInt(cell.getAttribute('data-midi') || cell.dataset.midi, 10);
                if (isNaN(midi)) return;
                const note = this._midiToNote(midi);
                const octave = Math.floor(midi / 12) - 1;
                const labelText = `${note}${octave}`;

                // If the visualizer already rendered a `.fret-label`, reuse it
                // to show the octave (avoids showing both "C" and "C4").
                const existingLabel = cell.querySelector('.fret-label');
                const displayText = this.showOctave ? labelText : note;
                if (existingLabel) {
                    existingLabel.textContent = displayText;
                    existingLabel.style.fontSize = '13px';
                    existingLabel.style.fontWeight = '800';
                    existingLabel.style.color = 'rgba(255,255,255,0.95)';
                } else {
                    // ensure parent establishes positioning for absolute label
                    const prevPos = cell.style.position;
                    if (!prevPos || prevPos === '') cell.style.position = 'relative';
                    let lbl = cell.querySelector('.note-octave-label');
                    if (!lbl) {
                        lbl = document.createElement('div');
                        lbl.className = 'note-octave-label';
                        lbl.style.cssText = 'position:absolute;left:50%;bottom:6px;transform:translateX(-50%);font-size:13px;color:var(--text-muted);pointer-events:none;font-weight:800;white-space:nowrap';
                        cell.appendChild(lbl);
                    }
                    lbl.textContent = displayText;
                }
            } catch (e) { /* ignore per-cell errors */ }
        });
    }

    _ensureOverlay() {
        if (!this.vizWrap) return;
        if (this._overlay) return;
        const wrap = this.vizWrap;
        // ensure the wrapper establishes a stacking context
        wrap.style.position = 'relative';
        // create SVG overlay sized to wrapper in device pixels
        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('class','learn-guitar-overlay');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        // ensure overlay sits above the visualizer
        svg.style.zIndex = '9999';
        svg.setAttribute('preserveAspectRatio','none');
        // set initial pixel dimensions so coordinates align with getBoundingClientRect
        const setSize = () => {
            try {
                const w = Math.max(1, Math.round(wrap.clientWidth));
                const h = Math.max(1, Math.round(wrap.clientHeight));
                svg.setAttribute('width', String(w));
                svg.setAttribute('height', String(h));
                svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            } catch (e) { /* ignore */ }
        };
        setSize();
        // update on resize
        this._learnGuitar_overlayResizeHandler = () => setSize();
        window.addEventListener('resize', this._learnGuitar_overlayResizeHandler);
        // also observe wrapper size changes (if supported)
        if (typeof ResizeObserver !== 'undefined') {
            this._learnGuitar_resizeObserver = new ResizeObserver(setSize);
            this._learnGuitar_resizeObserver.observe(wrap);
        }
        wrap.appendChild(svg);
        this._overlay = svg;
    }

    setupConnectorRedrawEvents() {
        if (this._connectorEventsBound || !this.container) return;
        this._connectorEventsBound = true;

        const guitarScroll = this.container.querySelector('#guitar-learn-container');
        const sheetScroll = this.container.querySelector('#sheet-music-learn-container');

        const schedule = () => {
            requestAnimationFrame(() => {
                // Ensure overlay viewport matches wrapper
                if (this._learnGuitar_overlayResizeHandler) this._learnGuitar_overlayResizeHandler();
                // If there are arrows drawn, we may need to redraw for current note (best-effort)
                if (this._lastPreviewNote && typeof this._drawArrowsForNote === 'function') {
                    try { this._drawArrowsForNote(this._lastPreviewNote); } catch (e) { /* ignore */ }
                }
            });
        };

        guitarScroll?.addEventListener('scroll', schedule, { passive: true });
        sheetScroll?.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
    }

    _clearOverlay() {
        if (!this._overlay) return;
        while (this._overlay.firstChild) this._overlay.removeChild(this._overlay.firstChild);
    }

    _drawArrowBetweenPoints(x1,y1,x2,y2,color) {
        if (!this._overlay) return;
        const ns = 'http://www.w3.org/2000/svg';
        const line = document.createElementNS(ns,'line');
        line.setAttribute('x1',String(x1)); line.setAttribute('y1',String(y1));
        line.setAttribute('x2',String(x2)); line.setAttribute('y2',String(y2));
        line.setAttribute('stroke',color); line.setAttribute('stroke-width','4');
        line.setAttribute('stroke-linecap','round');
        line.style.opacity = '0.95';
        this._overlay.appendChild(line);
        // arrowhead
        const dx = x2 - x1; const dy = y2 - y1;
        const ang = Math.atan2(dy,dx);
        const ah = 10; // arrowhead size
        const p1x = x2 - Math.cos(ang - 0.4) * ah;
        const p1y = y2 - Math.sin(ang - 0.4) * ah;
        const p2x = x2 - Math.cos(ang + 0.4) * ah;
        const p2y = y2 - Math.sin(ang + 0.4) * ah;
        const poly = document.createElementNS(ns,'polygon');
        poly.setAttribute('points', `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`);
        poly.setAttribute('fill',color);
        this._overlay.appendChild(poly);
        return [line, poly];
    }

    _getCellCenter(cell) {
        const rect = cell.getBoundingClientRect();
        const parentRect = this.vizWrap.getBoundingClientRect();
        const x = rect.left - parentRect.left + rect.width/2;
        const y = rect.top - parentRect.top + rect.height/2;
        return { x, y };
    }

    _drawArrowsForNote(note) {
        this._clearOverlay();
        // collect cells
        const grid = (this._fretboard && this._fretboard.gridEl) ? this._fretboard.gridEl : null;
        const cells = grid ? Array.from(grid.querySelectorAll('.fret-cell')) : (this._fallbackCells || []);
        if (!cells || cells.length === 0) return;
        // pick representative cells for up to 3 strings preferring mid frets
        const reps = [];
        for (const c of cells) {
            if (!c.dataset.note) continue;
            if (c.dataset.note === note) {
                const f = parseInt(c.dataset.fret || '0',10);
                if (f >= 3 && f <= 9) reps.push(c);
            }
            if (reps.length >= 3) break;
        }
        if (reps.length === 0) {
            // fallback: find any matching notes
            for (const c of cells) if (c.dataset.note === note) { reps.push(c); if (reps.length>=3) break; }
        }
        // for each rep, draw arrows to half and whole on same string
        for (const base of reps) {
            const baseF = parseInt(base.dataset.fret || '0',10);
            const string = base.dataset.stringIndex || base.dataset.string || null;
            // find cells with same string and fret+1, +2
            const half = cells.find(cc => (cc.dataset.stringIndex===string || cc.dataset.string===string) && parseInt(cc.dataset.fret||'0',10) === baseF+1);
            const whole = cells.find(cc => (cc.dataset.stringIndex===string || cc.dataset.string===string) && parseInt(cc.dataset.fret||'0',10) === baseF+2);
            const a = this._getCellCenter(base);
            if (half) {
                const b = this._getCellCenter(half);
                this._drawArrowBetweenPoints(a.x,a.y,b.x,b.y,'#f59e0b');
            }
            if (whole) {
                const c = this._getCellCenter(whole);
                this._drawArrowBetweenPoints(a.x,a.y,c.x,c.y,'#60a5fa');
            }
        }
        // explanatory overlay text
        if (this.ui && this.ui.stepBox) {
            this.ui.stepBox.innerHTML = `<div style="font-weight:700">Visual: Half vs Whole Step</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">Orange arrows show a half-step (one fret). Blue arrows show a whole-step (two frets). Notes repeat every 12 semitones (octave).</div>`;
        }
    }

    renderUnified() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div id="learn-module-wrapper" style="position: relative; display: flex; flex-direction: column; gap: 16px; padding: 16px; width: 100%; max-width: none; margin: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button id="learn-return-to-landing" style="display: flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--border-light); padding: 8px 14px; cursor: pointer; color: var(--text-main); font-family: var(--font-tech); transition: all 0.2s ease; border-radius: 4px; font-size: 0.9rem;">← Home</button>
                        <button id="learn-theme-toggle" style="background: transparent; border: 1px solid var(--border-light); padding: 8px 14px; cursor: pointer; color: var(--text-main); font-family: var(--font-tech); transition: all 0.2s ease; border-radius: 4px; font-size: 1.1rem;">🌓</button>
                        <button id="learn-pitch-toggle" style="background: transparent; border: 1px solid var(--border-light); padding: 8px 12px; cursor: pointer; color: var(--text-main); border-radius: 4px; font-size: 0.95rem;">Pitch only</button>
                        <button id="learn-save-positions" style="background: transparent; border: 1px solid var(--border-light); padding: 8px 12px; cursor: pointer; color: var(--text-main); border-radius: 4px; font-size: 0.95rem;">Save positions</button>
                    </div>
                </div>

                <div style="text-align: center; margin-bottom: 12px;">
                    <h2 style="color: var(--text-main); margin: 0 0 12px 0; font-size: clamp(1.2rem, 3vw, 1.8rem);">Learn Notes</h2>
                    <p style="color: var(--text-muted); margin: 0; font-size: clamp(0.85rem, 2vw, 1rem); line-height: 1.6;">Starting in C major (no sharps or flats) to make note names clear. We'll later cover accidentals and scale construction in the Learn Scales module. This interactive visualizer helps beginners map names to positions, hear the pitch while you see it highlighted, and discover how notes repeat across octaves.</p>
                    <div style="margin-top:12px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap;">
                        <div style="max-width:480px;color:var(--text-muted);font-size:0.95rem;">
                            <div style="font-weight:700;margin-bottom:6px;color:var(--text-main);">What you'll learn</div>
                            <ul style="margin:0 0 8px 20px;padding:0;color:var(--text-muted);">
                                <li>How note names (C, D, E...) map to frets and strings.</li>
                                <li>How octaves repeat the same note at higher/lower pitches.</li>
                                <li>Where accidentals (sharps/flats) live on the fretboard.</li>
                            </ul>
                        </div>
                        <div style="max-width:420px;color:var(--text-muted);font-size:0.95rem;">
                            <div style="font-weight:700;margin-bottom:6px;color:var(--text-main);">How to use this page</div>
                            <ol style="margin:0 0 8px 18px;padding:0;color:var(--text-muted);">
                                <li>Click a fret to hear the pitch and see its name + octave displayed.</li>
                                <li>Use the interval and octave demos to compare pitches and feel semitone/whole-step distances.</li>
                                <li>Try the quick practice questions to test recognition, then explore Learn Scales to build on this foundation.</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <!-- Visual Guide Legend -->
                <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin: 16px 0 12px 0; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 6px;">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem;"><div style="width: 20px; height: 20px; background: linear-gradient(180deg, rgba(96, 165, 250, 0.8), rgba(96, 165, 250, 0.4)); border-radius: 2px; box-shadow: 0 0 10px rgba(96, 165, 250, 0.6);"></div><span style="color: var(--text-muted);">C Major Notes</span></div>
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem;"><div style="width: 16px; height: 16px; background: var(--accent-primary); border-radius: 50%; display:flex;align-items:center;justify-content:center;color:#000;font-size:10px;font-weight:bold;">1</div><span style="color: var(--text-muted);">Scale Degree</span></div>
                </div>

                <!-- Fretboard Visualizer -->
                <div style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; position: relative;">
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">🎸 Guitar Fretboard (C Major)</div>
                    <div id="guitar-learn-container" style="overflow: hidden; display: flex; justify-content: center; min-height: 160px; width: 100%;"></div>
                </div>

                <!-- Sheet Music -->
                <div style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 20px; position: relative;">
                    <div style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px;">🎼 Sheet Music Notation</div>
                    <div id="sheet-music-learn-container" style="background: white; border-radius: 6px; padding: 20px; overflow-x: auto;"></div>
                </div>
                
                <!-- Quick Practice -->
                <div id="guitar-practice-panel" style="background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 8px; padding: 18px; margin-top: 12px; display:flex; gap:12px; align-items:center; justify-content:space-between;">
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <div style="font-weight:700;color:var(--text-main);">Quick Practice</div>
                        <div id="guitar-practice-instructions" style="color:var(--text-muted);font-size:0.95rem;max-width:680px;">Press <strong>Start Practice</strong> and click the correct fret that matches the target note. This helps you map names to positions.</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div id="guitar-practice-target" style="font-weight:800;color:var(--accent-primary);min-width:80px;text-align:center;">—</div>
                        <button id="guitar-practice-start" style="padding:8px 12px;border-radius:6px;border:1px solid var(--border-light);background:transparent;cursor:pointer;color:var(--text-main);">Start Practice</button>
                        <div id="guitar-practice-feedback" style="min-width:120px;color:var(--text-muted);"></div>
                    </div>
                </div>
            </div>
        `;
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
                        if (i === 0) { ledger = `<line x1="${x-14}" y1="${staffY+50}" x2="${x+14}" y2="${staffY+50}" stroke="#333" stroke-width="1.5" />`; }
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

    _buildInstructionPanel(parent) {
        parent.innerHTML = '';
        const desc = document.createElement('div');
        desc.style.marginBottom = '12px';
        desc.innerHTML = `
            <div style="font-weight:700; margin-bottom:6px">Step-by-step practice</div>
            <div style="font-size:0.95rem; color:var(--text-muted, #d1d5db)">Use the controls below to step through notes. The fretboard will highlight each note and play it if audio is available.</div>
        `;
        parent.appendChild(desc);
        // Condensed selector (single dropdown) — buttons removed to avoid duplication
        const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const selectRow = document.createElement('div');
        selectRow.style.display = 'flex';
        selectRow.style.gap = '8px';
        selectRow.style.marginBottom = '10px';

        const noteLabel = document.createElement('div');
        noteLabel.textContent = 'Note:';
        noteLabel.style.alignSelf = 'center';
        noteLabel.style.width = '40px';
        selectRow.appendChild(noteLabel);

        const noteSelect = document.createElement('select');
        noteSelect.style.padding = '6px';
        noteSelect.style.borderRadius = '6px';
        noteSelect.style.background = 'transparent';
        noteSelect.style.color = '#fff';
        NOTES.forEach(nt => { const o = document.createElement('option'); o.value = nt; o.text = nt; noteSelect.appendChild(o); });
        noteSelect.value = 'C';
        selectRow.appendChild(noteSelect);
        this.ui.noteSelect = noteSelect;

        const playOctaveBtn = document.createElement('button'); playOctaveBtn.textContent = 'Play Octaves';
        playOctaveBtn.style.padding = '8px 10px'; playOctaveBtn.style.borderRadius = '6px'; playOctaveBtn.style.border = '1px solid rgba(255,255,255,0.06)'; playOctaveBtn.style.background = 'transparent'; playOctaveBtn.style.color = '#fff'; playOctaveBtn.style.cursor = 'pointer';
        playOctaveBtn.addEventListener('click', () => this._animateOctaves());

        selectRow.appendChild(playOctaveBtn);
        this.ui.playOctaveBtn = playOctaveBtn;
        parent.appendChild(selectRow);

        // Interval demo toggle: when enabled, automatically visualize half-step (1 fret) and whole-step (2 frets)
        const intervalRow = document.createElement('div');
        intervalRow.style.display = 'flex';
        intervalRow.style.alignItems = 'center';
        intervalRow.style.gap = '8px';
        intervalRow.style.marginBottom = '10px';

        const intervalToggle = document.createElement('input');
        intervalToggle.type = 'checkbox';
        // arrows on by default
        intervalToggle.checked = true;
        intervalToggle.id = 'interval-demo-toggle';
        const intervalLabel = document.createElement('label');
        intervalLabel.htmlFor = 'interval-demo-toggle';
        intervalLabel.textContent = 'Show Half/Whole Step Demo';
        intervalLabel.style.color = 'var(--text-muted,#cbd5e1)';

        intervalRow.appendChild(intervalToggle);
        intervalRow.appendChild(intervalLabel);
        parent.appendChild(intervalRow);
        this.ui.intervalToggle = intervalToggle;

        // Speech toggle for accessibility: disabled by default
        const speechRow = document.createElement('div');
        speechRow.style.display = 'flex';
        speechRow.style.alignItems = 'center';
        speechRow.style.gap = '8px';
        speechRow.style.marginBottom = '10px';

        const speechToggle = document.createElement('input');
        speechToggle.type = 'checkbox';
        speechToggle.id = 'guitar-speech-toggle';
        speechToggle.checked = !!this.speechEnabled;
        const speechLabel = document.createElement('label');
        speechLabel.htmlFor = 'guitar-speech-toggle';
        speechLabel.textContent = 'Enable spoken note names';
        speechLabel.style.color = 'var(--text-muted,#cbd5e1)';

        speechRow.appendChild(speechToggle);
        speechRow.appendChild(speechLabel);
        parent.appendChild(speechRow);
        this.ui.speechToggle = speechToggle;

        speechToggle.addEventListener('change', (ev) => {
            this.speechEnabled = !!ev.target.checked;
            if (!this.speechEnabled && window && window.speechSynthesis) window.speechSynthesis.cancel();
        });

        intervalToggle.addEventListener('change', (ev) => {
            // only run interval demo when on the Intervals page
            if (this.pages[this.currentPage] !== 'Intervals') return;
            if (ev.target.checked) {
                const n = noteSelect.value;
                this.steps = [n];
                this.stepIndex = 0;
                this.gotoStep(0);
                this._startIntervalDemo(n);
            } else {
                this._stopIntervalDemo();
            }
        });

        // When user picks a note from the dropdown, set the lesson to that single note and show intervals
        noteSelect.addEventListener('change', () => {
            const n = noteSelect.value;
            this.steps = [n];
            this.stepIndex = 0;
            this.gotoStep(0);
            // behavior depends on current page
            const page = this.pages[this.currentPage];
            if (page === 'Intervals') {
                if (this.ui.intervalToggle && this.ui.intervalToggle.checked) this._previewIntervals(n);
                else this._showStepIntervals(n);
            } else if (page === 'Octaves') {
                // Octaves page waits for Play Octaves button
            } else {
                // default: show basic step highlight
                this._showStepIntervals(n);
            }
        });

        // Accidentals help/demo
        const accRow = document.createElement('div');
        accRow.style.marginTop = '8px';
        const accBtn = document.createElement('button'); accBtn.textContent = 'Accidentals';
        accBtn.style.padding = '6px 8px'; accBtn.style.borderRadius = '6px'; accBtn.style.border = '1px solid rgba(255,255,255,0.06)'; accBtn.style.background = 'transparent'; accBtn.style.color = '#fff'; accBtn.style.cursor = 'pointer';
        accBtn.addEventListener('click', () => this._showAccidentals());
        accRow.appendChild(accBtn);
        parent.appendChild(accRow);
        this.ui.accBtn = accBtn;

        const stepBox = document.createElement('div');
        stepBox.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.02))';
        stepBox.style.padding = '14px';
        stepBox.style.borderRadius = '8px';
        stepBox.style.marginBottom = '12px';
        stepBox.style.minHeight = '140px';
        stepBox.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.02)';
        stepBox.style.fontSize = '0.95rem';
        stepBox.style.lineHeight = '1.4';
        stepBox.id = 'learn-step-box';
        parent.appendChild(stepBox);
        this.ui.stepBox = stepBox;

        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '8px';
        controls.style.marginBottom = '8px';

        const prevBtn = document.createElement('button'); prevBtn.textContent = 'Note ◀';
        const playBtn = document.createElement('button'); playBtn.textContent = 'Play';
        const nextBtn = document.createElement('button'); nextBtn.textContent = 'Note ▶';
        [prevBtn, playBtn, nextBtn].forEach(b => { b.style.padding = '8px 10px'; b.style.borderRadius = '6px'; b.style.border = '1px solid rgba(255,255,255,0.06)'; b.style.background = 'transparent'; b.style.color = '#fff'; b.style.cursor = 'pointer'; });
        prevBtn.addEventListener('click', () => this.prev());
        playBtn.addEventListener('click', () => this.playCurrent());
        nextBtn.addEventListener('click', () => this.next());

        controls.appendChild(prevBtn);
        controls.appendChild(playBtn);
        controls.appendChild(nextBtn);
        parent.appendChild(controls);

        const progress = document.createElement('div');
        progress.style.fontSize = '0.9rem';
        progress.style.color = 'var(--text-muted, #cbd5e1)';
        this.ui.progress = progress;
        parent.appendChild(progress);

        // Page navigation header
        const pageNav = document.createElement('div');
        pageNav.style.display = 'flex';
        pageNav.style.justifyContent = 'space-between';
        pageNav.style.alignItems = 'center';
        pageNav.style.marginTop = '8px';
        const pageTitle = document.createElement('div');
        pageTitle.style.fontWeight = '700';
        pageTitle.textContent = this.pages[this.currentPage];
        this.ui.pageTitle = pageTitle;
        const navBtns = document.createElement('div');
        const prevPageBtn = document.createElement('button'); prevPageBtn.textContent = '◀ Prev';
        const nextPageBtn = document.createElement('button'); nextPageBtn.textContent = 'Next ▶';
        [prevPageBtn, nextPageBtn].forEach(b => { b.style.padding='6px 8px'; b.style.marginLeft='6px'; b.style.borderRadius='6px'; b.style.border='1px solid rgba(255,255,255,0.06)'; b.style.background='transparent'; b.style.color='#fff'; b.style.cursor='pointer'; });
        prevPageBtn.addEventListener('click', () => this.prevPage());
        nextPageBtn.addEventListener('click', () => this.nextPage());
        navBtns.appendChild(prevPageBtn); navBtns.appendChild(nextPageBtn);
        pageNav.appendChild(pageTitle); pageNav.appendChild(navBtns);
        // Full page toggle
        const fullPageBtn = document.createElement('button'); fullPageBtn.textContent = 'Full Page';
        fullPageBtn.style.padding = '6px 8px'; fullPageBtn.style.borderRadius = '6px'; fullPageBtn.style.border = '1px solid rgba(255,255,255,0.06)'; fullPageBtn.style.background = 'transparent'; fullPageBtn.style.color = '#fff'; fullPageBtn.style.cursor = 'pointer';
        fullPageBtn.addEventListener('click', () => this.toggleFullPage());
        navBtns.appendChild(fullPageBtn);
        pageNav.appendChild(pageTitle); pageNav.appendChild(navBtns);
        parent.appendChild(pageNav);
        this.ui.prevPageBtn = prevPageBtn; this.ui.nextPageBtn = nextPageBtn; this.ui.fullPageBtn = fullPageBtn;

        const help = document.createElement('div');
        help.style.marginTop = '10px';
        help.style.fontSize = '0.85rem';
        help.style.color = 'var(--text-muted, #9ca3af)';
        help.textContent = 'Tip: try to find the highlighted note on different strings and frets.';
        parent.appendChild(help);
    }

    async _animateOctaves() {
        const note = (this.ui && this.ui.stepBox) ? (this.steps && this.steps[this.stepIndex]) : null;
        // If steps is empty, read from select if present
        if (!note) {
            const sel = this.container.querySelector('select');
            if (sel) {
                this.steps = [sel.value];
                this.stepIndex = 0;
            }
        }
        const target = this.steps && this.steps[this.stepIndex] ? this.steps[this.stepIndex] : (this.container.querySelector('select') && this.container.querySelector('select').value) || 'C';
        // three-stage demonstration: lower octave, base, higher octave
        const offsets = [-12, 0, 12];
        const delay = (ms) => new Promise(r => setTimeout(r, ms));
        if (this.ui && this.ui.stepBox) this.ui.stepBox.innerHTML = `<div style="font-weight:700">Octave demo: ${target}</div><div style="margin-top:6px">Observe the same note across octaves — listen for pitch doubling.</div>`;
        for (let i = 0; i < offsets.length; i++) {
            const m = this._noteNameToMidi(target) + offsets[i];
            // highlight only the targeted octave/midi
            if (this._fretboard && typeof this._fretboard.highlightMidi === 'function') {
                this._fretboard.highlightMidi(m);
            } else if (this._fretboard && typeof this._fretboard.highlightNote === 'function') {
                // visualizer doesn't support midi targeting; highlight the note name as best-effort
                this._fretboard.highlightNote(target);
            } else {
                // fallback: highlight specific midi cell (exact octave) rather than all same-name notes
                this._highlightMidiNote(m);
            }
            // play
            const audio = (typeof window !== 'undefined' && window.modularApp) ? (window.modularApp.guitarEngine || window.modularApp.audioEngine) : null;
            if (audio && typeof audio.playNote === 'function') audio.playNote(m);
            await delay(700);
        }
        // restore focused step view
        this.gotoStep(this.stepIndex);
    }

    _showStepIntervals(note) {
        // Highlight the chosen note, the half-step (+1 semitone), and whole-step (+2 semitones)
        const baseMidi = this._noteNameToMidi(note);
        const half = baseMidi + 1;
        const whole = baseMidi + 2;

        if (this._fretboard) {
            if (typeof this._fretboard.highlightMidi === 'function') {
                // preview by highlighting all three but do not play sounds here
                this._fretboard.highlightMidi(baseMidi);
                setTimeout(() => { try { this._fretboard.highlightMidi(half); } catch(e){} }, 250);
                setTimeout(() => { try { this._fretboard.highlightMidi(whole); } catch(e){} }, 550);
            } else if (typeof this._fretboard.highlightNote === 'function') {
                this._fretboard.highlightNote(note);
            }
        } else {
            // Fallback: color matching cells, but prefer exact midi where possible
            for (const c of (this._fallbackCells || [])) {
                if (!c.dataset.note) continue;
                const cmidi = parseInt(c.dataset.midi || this._noteNameToMidi(c.dataset.note), 10);
                if (cmidi === baseMidi) c.style.background = '#10b981'; // root/selected (green)
                else if (cmidi === half) c.style.background = '#f59e0b'; // half-step (orange)
                else if (cmidi === whole) c.style.background = '#60a5fa'; // whole-step (blue)
                else c.style.background = c.dataset.fret === '0' ? '#333' : '#444';
            }
        }

        if (this.ui && this.ui.stepBox) {
            this.ui.stepBox.innerHTML = `<div style="font-weight:700">Interval demo: ${note}</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">Half-step: move to the very next fret (one semitone). Whole-step: move two frets (two semitones). Listen for how the pitch changes.</div>`;
        }
        // play sequence: base -> half -> whole
        const audio = (typeof window !== 'undefined' && window.modularApp) ? (window.modularApp.guitarEngine || window.modularApp.audioEngine) : null;
        if (audio && typeof audio.playNote === 'function') {
            audio.playNote(baseMidi);
            setTimeout(() => audio.playNote(half), 300);
            setTimeout(() => audio.playNote(whole), 700);
        }
        // draw instructional arrows over the fretboard when possible
        if (typeof this._drawArrowsForNote === 'function') {
            try { this._drawArrowsForNote(note); } catch (e) { /* ignore */ }
        }
        // note: this method previews intervals and plays audio below; callers may choose to skip audio
    }

    _startIntervalDemo(note) {
        this._stopIntervalDemo();
        this._intervalDemoRunning = true;
        // run repeating demo across strings/frets for clarity
        const run = async () => {
            if (!this._intervalDemoRunning) return;
            await this._runIntervalDemoOnce(note);
            if (!this._intervalDemoRunning) return;
            // wait then repeat
            this._intervalDemoTimer = setTimeout(run, 1200);
        };
        run();
    }

    _stopIntervalDemo() {
        this._intervalDemoRunning = false;
        if (this._intervalDemoTimer) { clearTimeout(this._intervalDemoTimer); this._intervalDemoTimer = null; }
        this._clearIntervalHighlights();
        this._lastPreviewNote = null;
    }

    async _runIntervalDemoOnce(note) {
        // Show base, half, whole sequentially across several representative frets
        const baseMidi = this._noteNameToMidi(note);
        // draw arrows for instructional clarity
        try { if (typeof this._drawArrowsForNote === 'function') this._drawArrowsForNote(note); } catch (e) { /* ignore */ }
        const seq = [0, 1, 2]; // offsets in semitones
        const delay = (ms) => new Promise(r => setTimeout(r, ms));

        // Clear previous highlights
        this._clearIntervalHighlights();

        // If visualizer grid available, use it to color matching frets across strings
        const grid = (this._fretboard && this._fretboard.gridEl) ? this._fretboard.gridEl : null;
        const cells = grid ? Array.from(grid.querySelectorAll('.fret-cell')) : (this._fallbackCells || []);

        // For each step (base->half->whole) highlight matching cells
        for (let i = 0; i < seq.length; i++) {
            const offset = seq[i];
            // color mapping
            const color = offset === 0 ? '#10b981' : (offset === 1 ? '#f59e0b' : '#60a5fa');
            for (const c of cells) {
                const midi = parseInt(c.dataset.midi || this._noteNameToMidi(c.dataset.note || 'C'), 10);
                if (isNaN(midi)) continue;
                if ((midi - baseMidi) % 12 === offset) {
                    c._oldBg = c.style.background;
                    c.style.transition = 'transform 0.15s, box-shadow 0.15s';
                    c.style.transform = 'scale(1.08)';
                    c.style.boxShadow = `0 0 12px ${color}`;
                    c.style.background = color;
                }
            }
            // play
            const audio = (typeof window !== 'undefined' && window.modularApp) ? (window.modularApp.guitarEngine || window.modularApp.audioEngine) : null;
            const midiToPlay = baseMidi + offset;
            if (audio && typeof audio.playNote === 'function') audio.playNote(midiToPlay);
            await delay(500);
            // clear this step highlights (but keep stepBox message)
            for (const c of cells) {
                if (c._oldBg !== undefined) {
                    c.style.transform = '';
                    c.style.boxShadow = '';
                    c.style.background = c._oldBg;
                    delete c._oldBg;
                }
            }
            await delay(120);
        }
    }

    _clearIntervalHighlights() {
        const grid = (this._fretboard && this._fretboard.gridEl) ? this._fretboard.gridEl : null;
        const cells = grid ? Array.from(grid.querySelectorAll('.fret-cell')) : (this._fallbackCells || []);
        for (const c of cells) {
            if (c._oldBg !== undefined) {
                c.style.background = c._oldBg;
                delete c._oldBg;
            }
            c.style.transform = '';
            c.style.boxShadow = '';
        }
    }

    _renderFallbackVisualizer(parent) {
        parent.innerHTML = '';
        const fretboard = document.createElement('div');
        fretboard.style.display = 'grid';
        fretboard.style.gridTemplateColumns = 'repeat(13, 40px)';
        fretboard.style.gridTemplateRows = 'repeat(6, 32px)';
        fretboard.style.gap = '2px';
        fretboard.style.marginBottom = '16px';
        fretboard.style.background = 'transparent';
        parent.appendChild(fretboard);

        const strings = ['E', 'B', 'G', 'D', 'A', 'E'];
        const notes = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];

        // store cells for highlighting
        this._fallbackCells = [];

        for (let s = 0; s < 6; s++) {
            for (let f = 0; f <= 12; f++) {
                const cell = document.createElement('div');
                cell.style.background = f === 0 ? '#333' : '#444';
                cell.style.border = '1px solid #555';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = '0.95rem';
                cell.style.height = '32px';
                cell.style.width = '40px';
                cell.dataset.string = String(6 - s);
                cell.dataset.fret = String(f);
                if (f === 0) {
                    cell.textContent = strings[s];
                    cell.style.fontWeight = 'bold';
                } else {
                    const openIdx = notes.indexOf(strings[s]);
                    const noteIdx = (openIdx + f) % 12;
                    const noteName = notes[noteIdx];
                    cell.textContent = noteName;
                    cell.style.cursor = 'pointer';
                    cell.dataset.note = noteName;
                    cell.addEventListener('click', () => {
                        this._highlightFallbackNote(noteName);
                        this._playNoteForName(noteName);
                    });
                }
                // attach midi mapping per cell (estimate based on standard tuning)
                if (!this._fallbackOpenStringMidis) this._fallbackOpenStringMidis = [64,59,55,50,45,40];
                const openMidi = this._fallbackOpenStringMidis[s] || 40;
                cell.dataset.midi = String(openMidi + f);
                fretboard.appendChild(cell);
                this._fallbackCells.push(cell);
            }
        }
    }

    _onNoteClicked(ev) {
        // Prefer MIDI info when available to show octave
        const midi = ev && (ev.midi || (ev.note && this._noteNameToMidi(ev.note)));
        const noteName = midi ? this._midiToNote(midi) : (ev && ev.note ? ev.note : null);
        const octave = (typeof midi === 'number') ? (Math.floor(midi / 12) - 1) : null;
        const label = (noteName && octave !== null) ? `${noteName}${octave} (MIDI ${midi})` : (noteName || 'Unknown');
        if (noteName && this.ui && this.ui.stepBox) {
            this.ui.stepBox.textContent = `You clicked: ${label}`;
        }
        if (typeof midi === 'number') this._playMidiAndFlash(midi);
        else if (noteName) this._playNoteForName(noteName);
        // Speak the note aloud to assist beginners and older users
        try {
            // Only speak if the user has explicitly enabled speech
            if (this.speechEnabled) {
                const speakText = this.showOctave && octave !== null ? `${noteName} ${octave}` : noteName;
                if (window && window.speechSynthesis && speakText) {
                    const u = new SpeechSynthesisUtterance(speakText);
                    u.rate = 0.95;
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(u);
                }
            }
        } catch (e) { /* ignore speech failures */ }
    }

    _highlightFallbackNote(note) {
        for (const c of this._fallbackCells) {
            if (c.dataset.note) {
                if (c.dataset.note === note) c.style.background = '#60a5fa';
                else c.style.background = c.dataset.fret === '0' ? '#333' : '#444';
            }
        }
    }
    
    _highlightMidiNote(midi) {
        for (const c of this._fallbackCells) {
            if (c.dataset.midi) {
                if (parseInt(c.dataset.midi) === midi) c.style.background = '#60a5fa';
                else c.style.background = c.dataset.fret === '0' ? '#333' : '#444';
            }
        }
    }

    _midiToNote(midi) {
        const SEMITONE = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        return SEMITONE[midi % 12];
    }

    _noteNameToMidi(note) {
        // prefer using the fretboard helper when possible
        if (this._fretboard && typeof this._fretboard.findNearestFretMidiForSemitone === 'function') {
            const semitone = (this._fretboard.NOTE_TO_SEMITONE && this._fretboard.NOTE_TO_SEMITONE[note]) || null;
            if (semitone !== null && semitone !== undefined) {
                const midi = this._fretboard.findNearestFretMidiForSemitone(semitone);
                if (typeof midi === 'number') return midi;
            }
        }
        // best-effort mapping around middle C (MIDI 60)
        const map = { 'C':60,'C#':61,'Db':61,'D':62,'D#':63,'Eb':63,'E':64,'F':65,'F#':66,'Gb':66,'G':67,'G#':68,'Ab':68,'A':69,'A#':70,'Bb':70,'B':71 };
        return map[note] || 60;
    }

    savePositionsToLearnScales() {
        // Save a representative MIDI position for each of the 7 natural notes
        const notes = ['C','D','E','F','G','A','B'];
        const positions = {};
        if (this._fretboard && typeof this._fretboard.findNearestFretMidiForSemitone === 'function') {
            for (const n of notes) {
                const sem = this._fretboard.NOTE_TO_SEMITONE[n];
                const midi = this._fretboard.findNearestFretMidiForSemitone(sem);
                positions[n] = midi || null;
            }
        } else {
            // fallback using this._noteNameToMidi
            for (const n of notes) positions[n] = this._noteNameToMidi(n);
        }
        try {
            localStorage.setItem('learn-scales-guitar-positions', JSON.stringify({ savedAt: Date.now(), positions }));
            return positions;
        } catch (e) {
            console.warn('Failed to save positions', e);
            return null;
        }
    }

    _playNoteForName(note) {
        const midi = this._noteNameToMidi(note);
        const audio = (typeof window !== 'undefined' && window.modularApp) ? (window.modularApp.guitarEngine || window.modularApp.audioEngine) : null;
        if (audio && typeof audio.playNote === 'function') audio.playNote(midi);
        if (this._fretboard && typeof this._fretboard.highlightNote === 'function') this._fretboard.highlightNote(note);
        else this._highlightFallbackNote(note);
    }

    gotoStep(idx) {
        if (!Array.isArray(this.steps) || this.steps.length === 0) return;
        this.stepIndex = Math.max(0, Math.min(idx, this.steps.length - 1));
        const note = this.steps[this.stepIndex];
        if (this.ui && this.ui.stepBox) {
            this.ui.stepBox.innerHTML = `<div style="font-weight:700; font-size:1.05rem">Step ${this.stepIndex+1} / ${this.steps.length}</div><div style="margin-top:8px">Focus: <strong>${note}</strong></div><div style="margin-top:10px; color:var(--text-muted,#cbd5e1)">Find this note on the fretboard and say its name aloud before revealing it.</div>`;
        }
        this._playNoteForName(note);
        if (this.ui && this.ui.progress) this.ui.progress.textContent = `${this.stepIndex+1} of ${this.steps.length}`;
    }

    playCurrent() { this.gotoStep(this.stepIndex); }

    prev() { this.gotoStep(this.stepIndex - 1); }

    next() { this.gotoStep(this.stepIndex + 1); }

    showPage(idx) {
        this.currentPage = Math.max(0, Math.min(idx, (this.pages || []).length - 1));
        const page = (this.pages && this.pages[this.currentPage]) || 'Intro';
        if (this.ui && this.ui.pageTitle) this.ui.pageTitle.textContent = page;
        // toggle common controls by page
        if (this.ui && this.ui.noteSelect) this.ui.noteSelect.style.display = (page === 'Notes' || page === 'Intervals' || page === 'Practice') ? '' : 'none';
        if (this.ui && this.ui.playOctaveBtn) this.ui.playOctaveBtn.style.display = (page === 'Octaves') ? '' : 'none';
        if (this.ui && this.ui.intervalToggle) this.ui.intervalToggle.style.display = (page === 'Intervals') ? '' : 'none';
        if (this.ui && this.ui.prevPageBtn) this.ui.prevPageBtn.disabled = this.currentPage === 0;
        if (this.ui && this.ui.nextPageBtn) this.ui.nextPageBtn.disabled = this.currentPage >= ((this.pages || []).length - 1);

        // render page-specific content
        if (this.ui && this.ui.stepBox) {
            switch (page) {
                case 'Intro':
                    this.ui.stepBox.innerHTML = `<div style="font-weight:700">Welcome to Learn Guitar Notes</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">This multi-page lesson covers note names, octaves, intervals, and practice. Use the page controls to move between sections.</div>`;
                    break;
                case 'Notes':
                    this.steps = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
                    this.stepIndex = 0;
                    this.gotoStep(0);
                    this.ui.stepBox.innerHTML = `<div style="font-weight:700">The 12 Notes</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">Use the dropdown or Prev/Next to explore all 12 semitones.</div>`;
                    break;
                case 'Octaves':
                    this.ui.stepBox.innerHTML = `<div style="font-weight:700">Octaves</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">Octaves are the same note at higher or lower pitch. Press "Play Octaves" to hear examples.</div>`;
                    break;
                case 'Intervals':
                    this.ui.stepBox.innerHTML = `<div style="font-weight:700">Half & Whole Steps</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">A half-step = 1 fret; a whole-step = 2 frets. Toggle the demo to play through examples with arrows.</div>`;
                    break;
                case 'Practice':
                    this.steps = ['C','D','E','F','G','A','B'];
                    this.stepIndex = 0;
                    this.gotoStep(0);
                    this.ui.stepBox.innerHTML = `<div style="font-weight:700">Practice</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">Find the highlighted note on different strings and frets. Use Play/Next to progress.</div>`;
                    break;
                case 'Quiz':
                    this.ui.stepBox.innerHTML = `<div style="font-weight:700">Quick Quiz</div><div style="margin-top:8px;color:var(--text-muted,#cbd5e1)">Identify the note being played. (Interactive quiz coming soon.)</div>`;
                    break;
                default:
                    this.ui.stepBox.innerHTML = '';
            }
        }
        // when entering Intervals page, show preview (arrows/highlights) if toggle enabled
        if (page === 'Intervals') {
            const sel = this.ui && this.ui.noteSelect ? this.ui.noteSelect.value : (this.steps && this.steps[this.stepIndex]);
            if (sel && this.ui && this.ui.intervalToggle && this.ui.intervalToggle.checked) {
                try { this._previewIntervals(sel); } catch (e) {}
            }
        } else {
            // stop interval demo when leaving Intervals page
            this._stopIntervalDemo();
        }
    }

    nextPage() { this.showPage(this.currentPage + 1); }

    prevPage() { this.showPage(this.currentPage - 1); }

    toggleFullPage() {
        this.fullPage = !this.fullPage;
        if (!this.container || !this.layout || !this.vizWrap || !this.teachWrap) return;
        // toggle a true fullscreen modal view
        if (this.fullPage) {
            // store previous styles to restore
            this._prevStyles = {
                position: this.container.style.position || '',
                top: this.container.style.top || '',
                left: this.container.style.left || '',
                width: this.container.style.width || '',
                height: this.container.style.height || '',
                margin: this.container.style.margin || '',
                maxWidth: this.container.style.maxWidth || '',
                zIndex: this.container.style.zIndex || '',
                layoutFlex: this.layout.style.flexDirection || '',
                vizMinWidth: this.vizWrap.style.minWidth || '',
                teachWidth: this.teachWrap.style.width || ''
            };
            this.container.style.position = 'fixed';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100vw';
            this.container.style.height = '100vh';
            this.container.style.margin = '0';
            this.container.style.maxWidth = 'none';
            this.container.style.zIndex = '2147483647';
            this.container.style.borderRadius = '0';
            this.layout.style.flexDirection = 'row';
            // make viz take more vertical space inside fullscreen
            this.vizWrap.style.minWidth = '60%';
            this.vizWrap.style.width = '60%';
            this.teachWrap.style.width = '40%';
            this.ui.fullPageBtn.textContent = 'Exit Fullscreen';
        } else {
            // restore
            const p = this._prevStyles || {};
            this.container.style.position = p.position || '';
            this.container.style.top = p.top || '';
            this.container.style.left = p.left || '';
            this.container.style.width = p.width || '';
            this.container.style.height = p.height || '';
            this.container.style.margin = p.margin || '18px auto';
            this.container.style.maxWidth = p.maxWidth || '1000px';
            this.container.style.zIndex = p.zIndex || '';
            this.container.style.borderRadius = '';
            this.layout.style.flexDirection = p.layoutFlex || '';
            this.vizWrap.style.minWidth = p.vizMinWidth || '420px';
            this.vizWrap.style.width = p.vizMinWidth ? '' : '';
            this.teachWrap.style.width = p.teachWidth || '320px';
            this.ui.fullPageBtn.textContent = 'Full Page';
        }
        // refresh overlay sizing when toggling
        if (this._learnGuitar_overlayResizeHandler) this._learnGuitar_overlayResizeHandler();
    }

    _previewIntervals(note) {
        // remember last previewed note for redraws and draw arrows and highlight the base/half/whole without auto-playing or starting the repeating demo
        this._lastPreviewNote = note;
        try { this._drawArrowsForNote(note); } catch (e) {}
        const baseMidi = this._noteNameToMidi(note);
        const half = baseMidi + 1;
        const whole = baseMidi + 2;
        if (this._fretboard && typeof this._fretboard.highlightMidi === 'function') {
            this._fretboard.highlightMidi(baseMidi);
            setTimeout(() => { try { this._fretboard.highlightMidi(half); } catch(e){} }, 250);
            setTimeout(() => { try { this._fretboard.highlightMidi(whole); } catch(e){} }, 550);
        } else if (this._fretboard && typeof this._fretboard.highlightNote === 'function') {
            this._fretboard.highlightNote(note);
        } else {
            for (const c of (this._fallbackCells || [])) {
                const cmidi = parseInt(c.dataset.midi || this._noteNameToMidi(c.dataset.note || 'C'), 10);
                if (cmidi === baseMidi) c.style.background = '#10b981';
                else if (cmidi === half) c.style.background = '#f59e0b';
                else if (cmidi === whole) c.style.background = '#60a5fa';
                else c.style.background = c.dataset.fret === '0' ? '#333' : '#444';
            }
        }
    }

    _showAccidentals() {
        // Render guitar-specific accidentals explanation and interactive controls below the fretboard
        try {
            this._renderGuitarAccidentals();
        } catch (e) {
            console.warn('Failed to render guitar accidentals:', e);
        }
    }

    _applyAccidental(note, type) {
        // compute resulting midi then play and highlight that specific pitch
        let base = this._noteNameToMidi(note);
        if (type === 'flat') base = base - 1;
        else if (type === 'sharp') base = base + 1;
        else base = base; // natural
        const outName = this._midiToNote(base);
        if (this._fretboard && typeof this._fretboard.highlightMidi === 'function') {
            this._fretboard.highlightMidi(base);
        } else if (this._fretboard && typeof this._fretboard.highlightNote === 'function') {
            this._fretboard.highlightNote(outName);
        } else {
            this._highlightMidiNote(base);
        }
        const audio = (typeof window !== 'undefined' && window.modularApp) ? (window.modularApp.guitarEngine || window.modularApp.audioEngine) : null;
        if (audio && typeof audio.playNote === 'function') audio.playNote(base);
        if (this.ui && this.ui.stepBox) {
            const lab = type === 'flat' ? 'Flat (♭)' : (type === 'sharp' ? 'Sharp (♯)' : 'Natural');
            this.ui.stepBox.innerHTML += `<div style="margin-top:10px">Result: <strong>${outName}</strong> — ${lab}</div>`;
        }
    }

    
    _renderGuitarAccidentals() {
        // Create or reuse a dedicated accidentals explain block for guitar
        let explain = this.container.querySelector('#accidentals-explain-g');
        if (!explain) {
            explain = document.createElement('div');
            explain.id = 'accidentals-explain-g';
            explain.style.margin = '12px 0 18px 0';
            explain.style.padding = '12px';
            explain.style.border = '1px solid rgba(255,255,255,0.04)';
            explain.style.borderRadius = '8px';
            explain.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.005), rgba(0,0,0,0.01))';

            explain.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <div style="font-weight:800;color:var(--text-main);font-size:1.02rem;">Accidentals on Guitar</div>
                    <div style="color:var(--text-muted);">On the guitar, accidentals are simply the notes one fret up (sharp) or one fret down (flat). We'll demonstrate with the open B string and adjacent frets.</div>
                    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
                        <div style="flex:1;min-width:220px">
                            <div style="font-weight:700;margin-bottom:6px;color:var(--text-main);">Hear & See</div>
                            <div style="display:flex;gap:8px;">
                                <button id="acc_play_B_g" class="btn" style="padding:8px 12px;border:2px solid var(--accent-primary);background:transparent;color:var(--text-main);font-weight:700;border-radius:6px;">Play B (open)</button>
                                <button id="acc_play_Bb_g" class="btn" style="padding:8px 12px;border:2px solid #f59e0b;background:transparent;color:var(--text-main);font-weight:700;border-radius:6px;">Play B♭ (1st fret)</button>
                                <button id="acc_play_Bsharp_g" class="btn" style="padding:8px 12px;border:2px solid #60a5fa;background:transparent;color:var(--text-main);font-weight:700;border-radius:6px;">Play B♯ = C (2nd fret)</button>
                            </div>
                            <div style="color:var(--text-muted);font-size:0.9rem;margin-top:8px;">Click a button to hear the pitch; the corresponding fret(s) will flash on the fretboard above.</div>
                        </div>
                        <div style="min-width:220px;">
                            <div style="font-weight:700;margin-bottom:6px;color:var(--text-main);">Quick Practice</div>
                            <div id="acc_quiz_g" style="display:flex;gap:8px;flex-direction:column">
                                <div style="color:var(--text-muted);font-size:0.95rem;">Which fret produces B♭ when starting from the open B string?</div>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
                                    <button class="acc-option-g" data-answer="0" style="padding:8px 12px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:var(--text-main);border-radius:6px;">Open (0)</button>
                                    <button class="acc-option-g" data-answer="1" style="padding:8px 12px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:var(--text-main);border-radius:6px;">1st fret</button>
                                    <button class="acc-option-g" data-answer="2" style="padding:8px 12px;border:1px solid rgba(255,255,255,0.06);background:transparent;color:var(--text-main);border-radius:6px;">2nd fret</button>
                                </div>
                                <div id="acc_feedback_g" style="margin-top:8px;color:var(--text-muted);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // insert after the fretboard vizWrap if present, otherwise append near bottom
            const viz = this.container.querySelector('#guitar-learn-container');
            if (viz && viz.parentNode) viz.parentNode.insertBefore(explain, viz.nextSibling);
            else this.container.appendChild(explain);
        }

        // Wire buttons
        const playBBtn = explain.querySelector('#acc_play_B_g');
        const playBbBtn = explain.querySelector('#acc_play_Bb_g');
        const playBshBtn = explain.querySelector('#acc_play_Bsharp_g');
        const midiB = 71, midiBb = 70, midiBsh = 72;
        playBBtn && playBBtn.addEventListener('click', () => this._playMidiAndFlash(midiB));
        playBbBtn && playBbBtn.addEventListener('click', () => this._playMidiAndFlash(midiBb));
        playBshBtn && playBshBtn.addEventListener('click', () => this._playMidiAndFlash(midiBsh));

        const options = explain.querySelectorAll('.acc-option-g');
        const feedback = explain.querySelector('#acc_feedback_g');
        options.forEach(btn => btn.addEventListener('click', (e) => {
            const ans = btn.getAttribute('data-answer');
            if (ans === '1') {
                feedback.style.color = '#34d399';
                feedback.textContent = 'Correct — the 1st fret produces B♭ on the B string.';
                this._playMidiAndFlash(midiBb);
            } else {
                feedback.style.color = '#f87171';
                feedback.textContent = 'Try again — the 1st fret (one semitone down from open B) is B♭.';
                if (ans === '0') this._playMidiAndFlash(midiB);
                if (ans === '2') this._playMidiAndFlash(midiBsh);
            }
        }));
    }

    _playMidiAndFlash(midi) {
        const audio = (typeof window !== 'undefined' && window.modularApp) ? (window.modularApp.guitarEngine || window.modularApp.audioEngine) : null;
        if (audio && typeof audio.playNote === 'function') audio.playNote(midi);
        if (this._fretboard && typeof this._fretboard.highlightMidi === 'function') this._fretboard.highlightMidi(midi);
        else this._highlightMidiNote(midi);
    }
}

if (typeof window !== 'undefined' && typeof window.LearnGuitarNotes === 'undefined') {
    window.LearnGuitarNotes = LearnGuitarNotes;
}