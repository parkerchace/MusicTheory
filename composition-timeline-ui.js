/**
 * composition-timeline-ui.js
 * 
 * Replaces arc-preview-panel.js.
 * Provides an interactive UI for visualizing and manipulating the 
 * semantic contour and timeline tokens.
 */

class CompositionTimelineUI {
    constructor(inputSelector = '#global-word-input', panelId = 'composition-timeline-panel') {
        this.inputElement = document.querySelector(inputSelector);
        this.panelId = panelId;
        
        this.engine = typeof SemanticContourEngine !== 'undefined' ? new SemanticContourEngine() : null;
        this.currentProfile = null;
        
        // Canvas Interaction State
        this.points = []; // [{x, y, tension}]
        this.isDragging = false;
        this.draggedPointIndex = -1;
        this.canvasMode = 'bezier'; // 'bezier' or 'sharp'
        this.manualPointsMode = false; // If true, don't auto-generate on typing

        this.initializePanel();
        this.attachListeners();
    }

    initializePanel() {
        if (document.getElementById(this.panelId)) return;

        const panel = document.createElement('div');
        panel.id = this.panelId;
        panel.style.cssText = `
            position: absolute;
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 4px;
            margin-top: 2px;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.2s cubic-bezier(0, 0, 0.2, 1);
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            color: #f1f5f9;
            font-size: 11px;
            width: 600px;
        `;
        document.body.appendChild(panel);
    }

    attachListeners() {
        if (!this.inputElement) return;

        this.inputElement.addEventListener('focus', () => {
            if (this.inputElement.value.trim().length > 0) this.openPanel();
        });

        this.inputElement.addEventListener('input', (e) => {
            const text = e.target.value.trim();
            if (text.length === 0) {
                this.closePanel();
                return;
            }
            this.analyzeAndRender(text);
            this.openPanel();
        });

        document.addEventListener('click', (e) => {
            const panel = document.getElementById(this.panelId);
            if (!panel) return;
            const clickedInsideInput = this.inputElement && this.inputElement.contains(e.target);
            const clickedInsidePanel = panel.contains(e.target);
            if (!clickedInsideInput && !clickedInsidePanel) {
                this.closePanel();
            }
        });
    }

    openPanel() {
        const panel = document.getElementById(this.panelId);
        if (panel) panel.style.maxHeight = '80vh';
    }

    closePanel() {
        const panel = document.getElementById(this.panelId);
        if (panel) panel.style.maxHeight = '0';
    }

    analyzeAndRender(text) {
        if (!this.engine) return;
        
        this.currentProfile = this.engine.parseInput(text);
        
        // Generate baseline points for canvas based on profile ONLY if not in manual mode
        if (!this.manualPointsMode || !this.points.length) {
            this.generateBasePoints();
        }
        
        this.renderPanel();
    }

    /**
     * A library of genuinely different phrase shapes. Each roll picks a shape,
     * so a word is INTERPRETED rather than assigned one fixed curve — "tomorrow"
     * can arch, climb, sigh, or swell across takes.
     * Values are energy 0..1 (converted to canvas Y, which is inverted).
     */
    static get ARC_SHAPES() {
        return {
            arch:        (t) => Math.sin(t * Math.PI),
            rise:        (t) => t,
            fall:        (t) => 1 - t,
            valley:      (t) => 1 - Math.sin(t * Math.PI),
            wave:        (t) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2),
            surge:       (t) => Math.pow(t, 0.55),
            sigh:        (t) => Math.pow(1 - t, 0.6),
            lateBloom:   (t) => Math.pow(t, 2.2),
            earlyPeak:   (t) => Math.sin(Math.pow(t, 0.55) * Math.PI),
            plateau:     (t) => Math.min(1, Math.sin(Math.min(t, 0.5) * Math.PI) * 1.15),
            terraced:    (t) => Math.floor(t * 3) / 3 + 0.12,
            swell:       (t) => 0.5 + 0.5 * Math.sin(t * Math.PI * 1.5 - Math.PI / 2),
            pulse:       (t) => 0.5 + 0.45 * Math.sin(t * Math.PI * 3),
            hang:        (t) => 0.72 - 0.25 * Math.cos(t * Math.PI * 2)
        };
    }

    generateBasePoints() {
        this.points = [];
        const wordCount = Math.max(1, this.currentProfile.wordTokens.length);
        const syllableCount = (this.currentProfile.wordTokens || [])
            .reduce((n, w) => n + ((w.syllables && w.syllables.length) || 1), 0);

        // Re-rolling used to reproduce an identical curve because nothing here
        // varied. A per-roll seed gives a different (but still tone-appropriate)
        // shape each time Auto-Generate is pressed.
        this._arcRoll = (this._arcRoll || 0) + 1;
        let seed = (this._arcRoll * 2654435761) >>> 0;
        const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        const vary = (amount) => (rnd() - 0.5) * 2 * amount;

        // Map contour archetype to base curve shape. Every tone the engines can
        // emit must land on a real shape — unmapped tones used to fall through
        // to a flat line, which made the whole arc (canvas + sheet) flat.
        // The arc must read the words the same way the GENERATOR does.
        let tone = this.currentProfile.contourArchetype || 'balanced';
        let energy = this.currentProfile.overallEnergy || 0.5;
        let tension = this.currentProfile.globalTension || 0.5;
        try {
            const wce = (typeof WordCharacterEngine !== 'undefined') ? WordCharacterEngine : null;
            const text = (this.currentProfile.wordTokens || []).map(w => w.originalWord).join(' ');
            if (wce && text.trim()) {
                const agg = wce.phraseCharacter(text);
                if (agg && agg.matchedCount > 0) {
                    tone = wce.toneFor(agg) || tone;
                    energy = Math.max(0.05, Math.min(0.98,
                        agg.motion * 0.45 + agg.attack * 0.25 + (agg.arousal + 1) / 2 * 0.3));
                    tension = Math.max(0.05, Math.min(0.98,
                        agg.tension * 0.7 + Math.max(0, -agg.valence) * 0.3));
                }
            }
        } catch (_) {}

        // Each tone LEANS toward some shapes but never owns one — that's what
        // makes a word interpretable instead of always drawing the same bell.
        const leanings = {
            joyful: ['rise', 'surge', 'arch', 'lateBloom'],
            hopeful: ['rise', 'lateBloom', 'swell', 'plateau'],
            playful: ['wave', 'pulse', 'terraced', 'arch'],
            sad: ['fall', 'sigh', 'valley', 'hang'],
            sorrow: ['sigh', 'fall', 'hang'],
            dark: ['valley', 'hang', 'fall', 'terraced'],
            angry: ['earlyPeak', 'pulse', 'arch', 'surge'],
            intense: ['surge', 'earlyPeak', 'arch', 'lateBloom'],
            mysterious: ['wave', 'hang', 'valley', 'plateau'],
            dreamy: ['swell', 'wave', 'plateau', 'hang'],
            calm: ['plateau', 'hang', 'swell', 'sigh'],
            peaceful: ['plateau', 'swell', 'hang'],
            balanced: ['arch', 'wave', 'swell', 'rise']
        };
        const shapeNames = Object.keys(CompositionTimelineUI.ARC_SHAPES);
        const pool = leanings[tone] || leanings.balanced;
        // 70% from the tone's leanings, 30% from the whole library — occasional
        // surprises, as asked.
        const shapeName = (rnd() < 0.7)
            ? pool[Math.floor(rnd() * pool.length)]
            : shapeNames[Math.floor(rnd() * shapeNames.length)];
        const shapeFn = CompositionTimelineUI.ARC_SHAPES[shapeName] || CompositionTimelineUI.ARC_SHAPES.arch;
        this.lastArcShape = shapeName;

        // POINT COUNT is not syllable count. Syllables bias it — often matching,
        // sometimes melismatic ("to-morr-oh-ohh-ohhh"), sometimes fewer and
        // sustained.
        let numTokens;
        const roll = rnd();
        if (roll < 0.5) numTokens = Math.max(2, syllableCount);              // one point per syllable
        else if (roll < 0.75) numTokens = Math.max(2, syllableCount + 1 + Math.floor(rnd() * 3)); // melisma
        else if (roll < 0.9) numTokens = Math.max(2, Math.ceil(syllableCount / 2)); // sustained
        else numTokens = Math.max(2, wordCount);                              // one per word
        numTokens = Math.min(12, numTokens);

        const amp = 0.55 + energy * 0.4;

        for (let i = 0; i <= numTokens; i++) {
            const normalizedX = i / numTokens;
            // Canvas Y is inverted: high energy = low Y.
            let normalizedY = 0.5 - (shapeFn(normalizedX) - 0.5) * amp;

            // Word-level intention: the token at this point bends its segment.
            try {
                const toks = this.currentProfile.wordTokens || [];
                const tok = toks.length ? toks[Math.min(Math.floor(normalizedX * toks.length), toks.length - 1)] : null;
                const wce = (typeof WordCharacterEngine !== 'undefined') ? WordCharacterEngine : null;
                if (tok && wce) {
                    const ch = wce.analyzeWord(String(tok.originalWord || ''));
                    if (ch && ch.matched) {
                        normalizedY -= (ch.arousal * 0.12 + ch.motion * 0.10 - ch.sustain * 0.08);
                    }
                }
            } catch (_) {}

            normalizedY += (rnd() - 0.5) * 2 * (0.05 + tension * 0.06);
            normalizedY = Math.max(0.08, Math.min(0.92, normalizedY));

            this.points.push({
                xNorm: normalizedX,
                yNorm: normalizedY,
                tension: tension
            });
        }
    }

    renderPanel() {
        const panel = document.getElementById(this.panelId);
        if (!panel) return;
        
        panel.innerHTML = '';

        // HEADER
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px 14px;
            background: #0f2741;
            border-bottom: 1px solid #0f3460;
            display: flex;
            justify-content: space-between;
        `;
        header.innerHTML = `
            <div style="color: #22d3ee; font-weight: bold; font-size: 11px;">🎼 Semantic Contour Timeline</div>
        `;
        
        const controls = document.createElement('div');
        const modeBtn = document.createElement('button');
        modeBtn.textContent = this.canvasMode === 'bezier' ? 'Mode: Smooth' : 'Mode: Sharp';
        modeBtn.style.cssText = `
            background: #0f3460; border: 1px solid #00d4ff; color: #00d4ff;
            padding: 2px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;
        `;
        modeBtn.onclick = () => {
            this.canvasMode = this.canvasMode === 'bezier' ? 'sharp' : 'bezier';
            modeBtn.textContent = this.canvasMode === 'bezier' ? 'Mode: Smooth' : 'Mode: Sharp';
            this.drawCanvas();
        };
        controls.appendChild(modeBtn);
        header.appendChild(controls);
        panel.appendChild(header);

        // CANVAS
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = 'padding: 10px; background: #16213e;';
        
        this.canvas = document.createElement('canvas');
        this.canvas.width = 580;
        this.canvas.height = 120;
        this.canvas.style.cssText = `
            width: 100%; height: 120px;
            background: #1a1a2e; border: 1px solid #0f3460; border-radius: 3px;
            cursor: crosshair;
        `;
        
        this.attachCanvasListeners(this.canvas);
        canvasContainer.appendChild(this.canvas);
        panel.appendChild(canvasContainer);

        this.drawCanvas();

        // COMPLEXITY CONTROLS — how busy the rhythm is, how adventurous the
        // melody is, and how much outside harmonic color gets pulled in.
        panel.appendChild(this.buildComplexityRow());

        // TOKEN TIMELINE
        const timeline = document.createElement('div');
        timeline.style.cssText = `
            padding: 10px;
            display: flex;
            gap: 6px;
            overflow-x: auto;
            border-top: 1px solid #0f3460;
        `;
        
        this.currentProfile.wordTokens.forEach((token, i) => {
            const tokenEl = document.createElement('div');
            const isOpposite = token.isOpposite;
            const subLabel = token.subdivision === 16 ? 'FRANTIC' : (token.subdivision === 8 ? 'STEADY' : 'SLOW');

            tokenEl.style.cssText = `
                position: relative;
                background: ${isOpposite ? 'rgba(255, 50, 50, 0.2)' : 'rgba(100, 200, 255, 0.1)'};
                border: 1px solid ${isOpposite ? '#ff4444' : '#44aaff'};
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                box-shadow: ${isOpposite ? '0 0 10px rgba(255,0,0,0.3)' : 'none'};
            `;

            tokenEl.innerHTML = `
                <div style="font-weight: bold; color: ${isOpposite ? '#ff8888' : '#fff'};">${token.originalWord}${isOpposite ? ' ⚡' : ''}</div>
                <div style="font-size: 8px; opacity: 0.6; margin-top: 2px;">
                    ${token.syllables ? `${token.syllables.length} syl` : subLabel}
                </div>
                ${token.scaleOverride ? `<div style="font-size: 7px; color: #fbbf24; margin-top: 2px;">★ ${token.scaleOverride}</div>` : ''}
            `;
            
            tokenEl.onmouseenter = () => {
                tokenEl.style.transform = 'translateY(-2px) scale(1.05)';
                tokenEl.style.zIndex = '100';
            };
            tokenEl.onmouseleave = () => {
                tokenEl.style.transform = 'translateY(0) scale(1)';
                tokenEl.style.zIndex = '1';
            };
            
            tokenEl.onclick = (e) => {
                e.stopPropagation();
                if (window.modularApp && window.modularApp.scaleLibrary) {
                    window.modularApp.scaleLibrary.open((selectedScale) => {
                        console.log(`[Timeline] Pinning scale ${selectedScale.name} to ${token.originalWord}`);
                        token.scaleOverride = selectedScale.name;
                        if (token.syllables) {
                            token.syllables.forEach(s => s.scaleOverride = selectedScale.name);
                        }
                        this.renderTokens(); // Refresh UI
                        this.triggerGeneration(); // Regenerate music
                    });
                } else {
                    alert('Scale Library not loaded yet.');
                }
            };
            
            timeline.appendChild(tokenEl);
        });
        
        panel.appendChild(timeline);

        // ACTIONS
        const actions = document.createElement('div');
        actions.style.cssText = `
            padding: 10px;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            background: #0f2741;
            border-top: 1px solid #0f3460;
        `;
        
        const autoBtn = document.createElement('button');
        autoBtn.innerHTML = '🔄 Auto-Generate Arc';
        autoBtn.style.cssText = `
            background: #0f3460; border: 1px solid #10b981; color: #10b981;
            padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 11px;
            font-weight: bold; margin-right: auto;
        `;
        autoBtn.onclick = () => {
            this.manualPointsMode = false;
            this.generateBasePoints();
            this.drawCanvas();
        };
        actions.appendChild(autoBtn);

        const genBtn = document.createElement('button');
        genBtn.innerHTML = '✨ Generate Music';
        genBtn.style.cssText = `
            background: #0f3460; border: 1px solid #00d4ff; color: #00d4ff;
            padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 11px;
            font-weight: bold;
        `;
        genBtn.onclick = () => this.triggerGeneration();
        actions.appendChild(genBtn);
        panel.appendChild(actions);
    }

    getComplexity() {
        if (!window.__arcComplexity) {
            let stored = null;
            try { stored = JSON.parse(localStorage.getItem('arcComplexity') || 'null'); } catch (_) {}
            window.__arcComplexity = (stored && typeof stored === 'object')
                ? { rhythm: +stored.rhythm || 0.5, melody: +stored.melody || 0.5, color: +stored.color || 0.5 }
                : { rhythm: 0.5, melody: 0.5, color: 0.5 };
        }
        return window.__arcComplexity;
    }

    saveComplexity() {
        try { localStorage.setItem('arcComplexity', JSON.stringify(window.__arcComplexity)); } catch (_) {}
    }

    buildComplexityRow() {
        const cx = this.getComplexity();
        const row = document.createElement('div');
        row.style.cssText = `
            padding: 8px 12px; display: flex; gap: 16px; align-items: center;
            border-top: 1px solid #0f3460; background: #111c33; font-size: 10px;
        `;

        const sliderRefs = {};
        const mkSlider = (emoji, label, key, title) => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex; align-items:center; gap:6px; flex:1;';
            wrap.title = title;
            const lab = document.createElement('span');
            lab.textContent = `${emoji} ${label}`;
            lab.style.cssText = 'color:#94a3b8; white-space:nowrap;';
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0'; slider.max = '100';
            slider.value = String(Math.round((cx[key] || 0.5) * 100));
            slider.style.cssText = 'flex:1; min-width:60px; accent-color:#00d4ff;';
            const pct = document.createElement('span');
            pct.textContent = slider.value + '%';
            pct.style.cssText = 'color:#22d3ee; width:30px; text-align:right;';
            slider.oninput = () => {
                window.__arcComplexity[key] = slider.value / 100;
                pct.textContent = slider.value + '%';
                this.saveComplexity();
            };
            sliderRefs[key] = { slider, pct };
            wrap.appendChild(lab); wrap.appendChild(slider); wrap.appendChild(pct);
            return wrap;
        };

        row.appendChild(mkSlider('🥁', 'Rhythm', 'rhythm', 'Rhythmic complexity: subdivisions, dotted notes, syncopation'));
        row.appendChild(mkSlider('🎼', 'Melody', 'melody', 'Melodic complexity: wider leaps, chromatic passing tones, melisma'));
        row.appendChild(mkSlider('🎨', 'Color', 'color', 'Harmonic color: how spicy and frequent the approach chords/borrowed scales get'));

        const dice = document.createElement('button');
        dice.textContent = '🎲';
        dice.title = 'Roll random complexity settings';
        dice.style.cssText = `
            background: #0f3460; border: 1px solid #f59e0b; color: #f59e0b;
            padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 13px;
        `;
        dice.onclick = () => {
            ['rhythm', 'melody', 'color'].forEach(key => {
                const v = Math.round(Math.random() * 100);
                window.__arcComplexity[key] = v / 100;
                if (sliderRefs[key]) {
                    sliderRefs[key].slider.value = String(v);
                    sliderRefs[key].pct.textContent = v + '%';
                }
            });
            this.saveComplexity();
        };
        row.appendChild(dice);
        return row;
    }

    attachCanvasListeners(canvas) {
        let rect = null;

        const getMousePos = (e) => {
            if (!rect) rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const getPointRadius = () => 6;

        canvas.addEventListener('mousedown', (e) => {
            const pos = getMousePos(e);
            const xNorm = pos.x / canvas.width;
            const yNorm = pos.y / canvas.height;
            
            // Check if clicking a point
            let hitIndex = -1;
            for (let i = 0; i < this.points.length; i++) {
                const px = this.points[i].xNorm * canvas.width;
                const py = this.points[i].yNorm * canvas.height;
                const dist = Math.hypot(pos.x - px, pos.y - py);
                if (dist <= getPointRadius() + 5) {
                    hitIndex = i;
                    break;
                }
            }

            if (hitIndex !== -1) {
                if (e.button === 2) { // Right click
                    if (this.points.length > 2) {
                        this.points.splice(hitIndex, 1);
                        this.drawCanvas();
                    }
                } else {
                    this.isDragging = true;
                    this.draggedPointIndex = hitIndex;
                    this.manualPointsMode = true; // User is interacting
                }
            } else if (e.button === 0) {
                // Add new point
                this.manualPointsMode = true; // User is interacting
                this.points.push({ xNorm, yNorm, tension: 0.5 });
                this.points.sort((a, b) => a.xNorm - b.xNorm);
                this.drawCanvas();
            }
        });

        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging || this.draggedPointIndex === -1) return;
            
            const pos = getMousePos(e);
            
            // Constrain Y
            let newYNorm = pos.y / canvas.height;
            newYNorm = Math.max(0, Math.min(1, newYNorm));
            
            // Constrain X (don't let it cross neighbors)
            let newXNorm = pos.x / canvas.width;
            const minX = this.draggedPointIndex > 0 ? this.points[this.draggedPointIndex - 1].xNorm + 0.02 : 0;
            const maxX = this.draggedPointIndex < this.points.length - 1 ? this.points[this.draggedPointIndex + 1].xNorm - 0.02 : 1;
            newXNorm = Math.max(minX, Math.min(maxX, newXNorm));

            this.points[this.draggedPointIndex].xNorm = newXNorm;
            this.points[this.draggedPointIndex].yNorm = newYNorm;
            
            this.drawCanvas();
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.draggedPointIndex = -1;
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.draggedPointIndex = -1;
            rect = null; // reset rect
        });
    }

    drawCanvas() {
        if (!this.canvas || !this.points.length) return;
        const ctx = this.canvas.getContext('2d');
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Clear
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // Draw Line
        ctx.beginPath();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;

        const screenPoints = this.points.map(p => ({
            x: p.xNorm * w,
            y: p.yNorm * h
        }));

        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);

        if (this.canvasMode === 'sharp') {
            for (let i = 1; i < screenPoints.length; i++) {
                ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
            }
        } else {
            // Bezier curve
            for (let i = 0; i < screenPoints.length - 1; i++) {
                const p0 = screenPoints[i];
                const p1 = screenPoints[i + 1];
                const midX = (p0.x + p1.x) / 2;
                ctx.bezierCurveTo(midX, p0.y, midX, p1.y, p1.x, p1.y);
            }
        }
        ctx.stroke();

        // Draw Anchor Points
        screenPoints.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = i === this.draggedPointIndex ? '#ffffff' : '#00ff88';
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    triggerGeneration() {
        if (!this.currentProfile) return;

        // Always provide a seed so repeated clicks can generate different results.
        // Use Date.now() so it varies even if Math.random() is overridden/deterministic.
        this._seedCounter = (this._seedCounter || 0) + 1;
        const seed = ((Date.now() ^ (this._seedCounter * 2654435761)) >>> 0);

        // Dispatch arcConfirmed event with details for the generation engine
        const event = new CustomEvent('arcConfirmed', {
            detail: {
                profile: this.currentProfile,
                points: this.points,
                canvasMode: this.canvasMode,
                input: this.inputElement.value,
                seed
            }
        });
        
        document.dispatchEvent(event);
        this.closePanel();
    }
}
