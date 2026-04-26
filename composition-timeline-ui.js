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

    generateBasePoints() {
        this.points = [];
        const numTokens = Math.max(2, this.currentProfile.wordTokens.length); // Ensure at least 2 points
        
        // Map contour archetype to base curve shape
        const shape = this.currentProfile.contourArchetype || 'balanced';
        
        for (let i = 0; i <= numTokens; i++) {
            let normalizedX = i / numTokens;
            let normalizedY = 0.5; // middle

            // Procedural shape mapping with slight organic variation
            const noise = (Math.sin(normalizedX * 10 + i) * 0.05);

            if (shape === 'rise' || shape === 'intense') {
                normalizedY = 0.9 - (normalizedX * 0.8) + noise; // Start low, end high (Y is inverted in canvas)
            } else if (shape === 'fall' || shape === 'dark') {
                normalizedY = 0.2 + (normalizedX * 0.7) + noise; 
            } else if (shape === 'wander' || shape === 'playful') {
                normalizedY = 0.5 + (Math.sin(normalizedX * Math.PI * 2) * 0.3) + noise;
            } else if (shape === 'jump' && i > 0) {
                normalizedY = (i % 2 === 0) ? 0.2 : 0.8;
            } else if (shape === 'balanced' || shape === 'calm') {
                normalizedY = 0.5 + (Math.cos(normalizedX * Math.PI) * 0.15) + noise; // Slight gentle curve
            } else {
                normalizedY = 0.5 + noise;
            }

            // Clamp Y
            normalizedY = Math.max(0.1, Math.min(0.9, normalizedY));

            this.points.push({
                xNorm: normalizedX,
                yNorm: normalizedY,
                tension: this.currentProfile.globalTension || 0.5
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

        // Dispatch arcConfirmed event with details for the generation engine
        const event = new CustomEvent('arcConfirmed', {
            detail: {
                profile: this.currentProfile,
                points: this.points,
                canvasMode: this.canvasMode,
                input: this.inputElement.value
            }
        });
        
        document.dispatchEvent(event);
        this.closePanel();
    }
}
