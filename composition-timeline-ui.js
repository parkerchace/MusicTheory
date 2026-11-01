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
        
        // The contour: one energy value (0..1) per canvas column. `points` is
        // the same curve in the shape the generator reads.
        this.curve = null;
        this.curveSource = null; // 'suggested' (dashed, follows the words) | 'drawn' (yours)
        this.suggestion = null;  // { id, name, about, tone } while suggested
        this.points = [];
        // Kept for anything still passing it along; the curve is drawn as-is.
        this.canvasMode = 'sharp';

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
            box-sizing: border-box;
        `;
        document.body.appendChild(panel);
    }

    /**
     * THIS PANEL IS ONE READING'S INSTRUMENT, NOT THE INPUT BOX'S.
     *
     * The contour timeline draws the energy curve that the CONTOUR reading
     * derives from your words. Under any other reading it is describing a
     * calculation the generator is not doing — typing in Pedal mode and being
     * shown a semantic contour is the tool claiming to work one way while
     * working another. So it opens on typing only when that reading is active,
     * and stays reachable by hand for anyone who wants to look at the curve
     * regardless.
     */
    autoOpensNow() {
        if (this._forcedOpen) return true;
        const m = (typeof window !== 'undefined' && window.__generationMethod) || 'contour';
        return m === 'contour';
    }

    /** Opened deliberately, from the toolbar, whatever the reading. */
    forceOpen() {
        this._forcedOpen = true;
        const text = this.inputElement ? this.inputElement.value.trim() : '';
        if (text.length) this.analyzeAndRender(text);
        this.openPanel();
    }

    attachListeners() {
        if (!this.inputElement) return;

        // Focus AND click both open it, and both analyse first. Previously
        // focus only called openPanel(), so returning to an input that already
        // had text opened an empty panel — the contour only appeared once you
        // changed what you had typed, which read as the panel being broken.
        const openWithText = () => {
            if (!this.autoOpensNow()) return;
            const text = this.inputElement.value.trim();
            if (!text.length) return;
            if (!this.currentProfile || this._renderedFor !== text) {
                this.analyzeAndRender(text);
            }
            this.openPanel();
        };
        this.inputElement.addEventListener('focus', openWithText);
        this.inputElement.addEventListener('click', openWithText);

        this.inputElement.addEventListener('input', (e) => {
            const text = e.target.value.trim();
            if (text.length === 0) {
                this.closePanel();
                return;
            }
            if (!this.autoOpensNow()) return;
            this.analyzeAndRender(text);
            this.openPanel();
        });

        // The panel is absolutely positioned against the input, so it has to
        // follow it when the page moves underneath.
        const reposition = () => { if (this._isOpen) { this.positionPanel(); this.drawCanvas(); } };
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);

        document.addEventListener('click', (e) => {
            const panel = document.getElementById(this.panelId);
            if (!panel) return;
            const clickedInsideInput = this.inputElement && this.inputElement.contains(e.target);
            const clickedInsidePanel = panel.contains(e.target);
            // A stroke that ends outside the panel is still drawing, not a
            // click away from it.
            const justDrew = this._lastStrokeEnd && (Date.now() - this._lastStrokeEnd) < 400;
            if (!clickedInsideInput && !clickedInsidePanel && !justDrew) {
                this.closePanel();
            }
        });
    }

    /**
     * Put the panel under its input and keep it on screen.
     *
     * It was created `position: absolute` with no coordinates at all, so it
     * landed wherever static flow left it — usually clipped by the bottom of
     * the page — and nothing ever measured it against the viewport.
     */
    positionPanel() {
        const panel = document.getElementById(this.panelId);
        if (!panel || !this.inputElement) return;
        const r = this.inputElement.getBoundingClientRect();
        // A hidden or not-yet-laid-out input measures 0×0 at the origin.
        // Positioning against that would fling the panel to the top-left
        // corner; better to leave it wherever it last sat.
        if (!r.width && !r.height) return;
        const margin = 8;
        // The content — a contour canvas, three labelled sliders, a legend and a
        // strip of word tokens — genuinely needs the room. At 640px the right
        // hand side of every one of those was being clipped by overflow-x,
        // which is what "cut off" actually meant: not vertically, horizontally.
        const width = Math.min(960, Math.max(360, window.innerWidth - margin * 2));
        panel.style.width = width + 'px';

        let left = r.left + window.scrollX;
        // Keep the whole panel inside the viewport horizontally.
        left = Math.max(margin, Math.min(left, window.scrollX + window.innerWidth - width - margin));
        panel.style.left = left + 'px';
        panel.style.top = (r.bottom + window.scrollY + 2) + 'px';

        // Height is whatever is actually left below the input, so the contour
        // is never cut off by a fixed 80vh that ignores where the input sits.
        const below = window.innerHeight - r.bottom - margin * 2;
        this._maxOpenHeight = Math.max(220, Math.min(520, below));
    }

    openPanel() {
        const panel = document.getElementById(this.panelId);
        if (!panel) return;
        this._isOpen = true;
        this.positionPanel();
        this.drawCanvas();
        panel.style.maxHeight = (this._maxOpenHeight || 420) + 'px';
        // Scroll rather than clip. With `overflow: hidden` anything past the
        // max height simply vanished, which is what made the timeline look
        // truncated.
        panel.style.overflowY = 'auto';
        panel.style.overflowX = 'hidden';
    }

    closePanel() {
        this._forcedOpen = false;
        const panel = document.getElementById(this.panelId);
        if (!panel) return;
        this._isOpen = false;
        panel.style.maxHeight = '0';
        panel.style.overflowY = 'hidden';
    }

    analyzeAndRender(text) {
        if (!this.engine) return;
        
        this.currentProfile = this.engine.parseInput(text);
        this._renderedFor = text;
        
        // A contour you drew is yours: typing more words does not replace it.
        // A suggestion follows the words, but only when the words change —
        // pressing Generate again must play the shape that is on screen.
        if (this.curveSource !== 'drawn' && (!this.curve || this._suggestedFor !== text)) {
            this.suggestShape();
        }
        
        this.renderPanel();
    }

    /**
     * PHRASE SHAPES WITH A NAME AND A REASON.
     *
     * The contour is energy across the whole piece — how busy, how high, how
     * loud, where the surprises land — so these are the arcs pieces actually
     * take, not curves picked because sin() made them easy: where a climax
     * sits, whether it is approached once or twice, what happens after it.
     * Each is a list of [time, energy] keys (0..1), joined with cosine easing.
     * Keys a hair apart make a cliff. `vary` nudges the keys so a shape
     * suggested twice is the same idea, not the same drawing.
     */
    static get CONTOUR_SHAPES() {
        return [
            { id: 'goldenClimax', name: 'Golden-section climax',
              about: 'Builds slowly, peaks about three-fifths of the way through, then lets go faster than it came.',
              keys: [[0, 0.22], [0.3, 0.45], [0.62, 0.95], [0.8, 0.5], [1, 0.18]] },
            { id: 'sentence', name: 'Sentence',
              about: 'An idea, the same idea again, then one longer push to the cadence.',
              keys: [[0, 0.3], [0.12, 0.58], [0.25, 0.32], [0.37, 0.62], [0.5, 0.38], [0.85, 0.92], [1, 0.25]] },
            { id: 'questionAnswer', name: 'Question and answer',
              about: 'Two matching halves. The first stops in mid-air; the second comes home.',
              keys: [[0, 0.3], [0.25, 0.75], [0.48, 0.6], [0.52, 0.32], [0.75, 0.75], [1, 0.12]] },
            { id: 'buildDrop', name: 'Build and drop',
              about: 'Tension stacks up, everything cuts out for a breath, then the biggest section lands.',
              keys: [[0, 0.18], [0.58, 0.85], [0.6, 0.08], [0.67, 0.08], [0.69, 1], [0.92, 0.9], [1, 0.4]] },
            { id: 'falseSummit', name: 'False summit',
              about: 'Climbs to what feels like the top, slips back, then climbs higher still.',
              keys: [[0, 0.2], [0.35, 0.72], [0.5, 0.42], [0.8, 1], [1, 0.22]] },
            { id: 'lament', name: 'Lament',
              about: 'Starts high and sinks in sighs. Each small lift lands lower than the one before.',
              keys: [[0, 0.9], [0.14, 0.7], [0.2, 0.78], [0.36, 0.55], [0.42, 0.63], [0.6, 0.4], [0.66, 0.47], [0.84, 0.22], [1, 0.08]] },
            { id: 'eyeOfStorm', name: 'Eye of the storm',
              about: 'Loud from the start, a sudden still middle, then the storm comes back.',
              keys: [[0, 0.78], [0.3, 0.92], [0.34, 0.15], [0.62, 0.2], [0.68, 0.95], [1, 0.82]] },
            { id: 'tide', name: 'Tide',
              about: 'Slow swells that never quite repeat. For music that breathes rather than argues.',
              keys: [[0, 0.3], [0.2, 0.6], [0.38, 0.35], [0.6, 0.7], [0.78, 0.4], [1, 0.55]] },
            { id: 'lateTwist', name: 'Late twist',
              about: 'Level and settled for most of the piece, then a sudden surge near the end before it resolves.',
              keys: [[0, 0.35], [0.66, 0.4], [0.72, 0.97], [0.86, 0.75], [1, 0.2]] },
            { id: 'echoes', name: 'Echoes',
              about: 'A strong opening statement, answered by smaller and smaller echoes.',
              keys: [[0, 0.95], [0.18, 0.25], [0.3, 0.7], [0.45, 0.2], [0.56, 0.5], [0.7, 0.15], [0.8, 0.32], [1, 0.08]] },
            { id: 'pulseCrescendo', name: 'Pulsing crescendo',
              about: 'A steady throb that grows every time it comes round. Boléro, compressed.',
              keys: [[0, 0.2], [0.1, 0.32], [0.17, 0.18], [0.3, 0.45], [0.37, 0.3], [0.5, 0.6], [0.57, 0.45], [0.7, 0.78], [0.77, 0.62], [0.92, 1], [1, 0.9]] },
            { id: 'afterglow', name: 'Afterglow',
              about: 'The climax comes late, then a long, quiet tail lets it settle.',
              keys: [[0, 0.3], [0.5, 0.65], [0.7, 0.98], [0.8, 0.35], [1, 0.15]] },
            { id: 'breathBeforePeak', name: 'Breath before the peak',
              about: 'A climb that pulls back for a moment just short of the top, like the held breath before a last chorus.',
              keys: [[0, 0.2], [0.55, 0.78], [0.62, 0.45], [0.7, 1], [0.88, 0.85], [1, 0.3]] },
            { id: 'rondo', name: 'Refrain and episodes',
              about: 'A home level that keeps coming back between excursions: one reaching up, one sinking down.',
              keys: [[0, 0.5], [0.2, 0.5], [0.3, 0.88], [0.4, 0.5], [0.6, 0.5], [0.7, 0.15], [0.8, 0.5], [1, 0.45]] },
            { id: 'falseStarts', name: 'False starts',
              about: 'Two hesitant attempts that fall back, then it commits and goes all the way.',
              keys: [[0, 0.25], [0.12, 0.55], [0.2, 0.25], [0.32, 0.62], [0.4, 0.28], [0.85, 0.98], [1, 0.4]] }
        ];
    }

    /** Which shapes suit which tone. A lean, not a rule: 30% of picks ignore it. */
    static get SHAPE_LEANINGS() {
        return {
            joyful: ['sentence', 'goldenClimax', 'pulseCrescendo', 'questionAnswer'],
            hopeful: ['breathBeforePeak', 'falseSummit', 'afterglow', 'goldenClimax'],
            playful: ['questionAnswer', 'rondo', 'falseStarts', 'sentence'],
            sad: ['lament', 'echoes', 'afterglow', 'tide'],
            sorrow: ['lament', 'echoes', 'tide'],
            dark: ['lateTwist', 'eyeOfStorm', 'lament', 'pulseCrescendo'],
            angry: ['buildDrop', 'eyeOfStorm', 'pulseCrescendo', 'falseSummit'],
            intense: ['buildDrop', 'falseSummit', 'pulseCrescendo', 'breathBeforePeak'],
            mysterious: ['tide', 'lateTwist', 'falseStarts', 'rondo'],
            dreamy: ['tide', 'afterglow', 'echoes'],
            calm: ['tide', 'echoes', 'afterglow', 'questionAnswer'],
            peaceful: ['tide', 'afterglow', 'questionAnswer'],
            balanced: ['goldenClimax', 'sentence', 'questionAnswer', 'falseSummit']
        };
    }

    /** Resolution of the drawn curve: one value per column across the canvas. */
    static get CURVE_COLUMNS() { return 160; }

    /**
     * Put a suggested shape on the canvas, chosen from the words' tone, never
     * one of the last few shown. It is drawn dashed until you draw on it.
     */
    suggestShape() {
        const shapes = CompositionTimelineUI.CONTOUR_SHAPES;
        this._suggestRoll = (this._suggestRoll || 0) + 1;
        let seed = ((Date.now() ^ (this._suggestRoll * 2654435761)) >>> 0);
        const rnd = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };

        // The tone is read the way the generator reads it.
        let tone = (this.currentProfile && this.currentProfile.contourArchetype) || 'balanced';
        try {
            const wce = (typeof WordCharacterEngine !== 'undefined') ? WordCharacterEngine : null;
            const text = ((this.currentProfile && this.currentProfile.wordTokens) || []).map(w => w.originalWord).join(' ');
            if (wce && text.trim()) {
                const agg = wce.phraseCharacter(text);
                if (agg && agg.matchedCount > 0) tone = wce.toneFor(agg) || tone;
            }
        } catch (_) {}

        const recent = this._recentShapes || [];
        const fresh = (ids) => ids.filter(id => !recent.includes(id));
        const lean = CompositionTimelineUI.SHAPE_LEANINGS[tone] || CompositionTimelineUI.SHAPE_LEANINGS.balanced;
        const all = shapes.map(s => s.id);
        let pool = rnd() < 0.7 ? fresh(lean) : fresh(all);
        if (!pool.length) pool = fresh(all).length ? fresh(all) : all;
        const pickId = pool[Math.floor(rnd() * pool.length)];
        const shape = shapes.find(s => s.id === pickId) || shapes[0];
        this._recentShapes = [shape.id, ...recent].slice(0, 4);

        // Same idea, not the same drawing: interior keys drift a little in
        // time and height, ends stay put so the start and finish keep their sense.
        const keys = shape.keys.map(([t, e], i, arr) => {
            const interior = i > 0 && i < arr.length - 1;
            const prevT = interior ? arr[i - 1][0] : 0;
            const nextT = interior ? arr[i + 1][0] : 1;
            const room = interior ? Math.min(t - prevT, nextT - t) : 0;
            // Cliffs (keys a hair apart) keep their spacing.
            const dt = room > 0.06 ? (rnd() - 0.5) * Math.min(0.06, room * 0.5) : 0;
            const de = interior ? (rnd() - 0.5) * 0.1 : 0;
            return [t + dt, Math.max(0.04, Math.min(0.97, e + de))];
        });

        this.curve = this._curveFromKeys(keys);
        this.curveSource = 'suggested';
        this.suggestion = { id: shape.id, name: shape.name, about: shape.about, tone };
        this._suggestedFor = this._renderedFor;
        this._syncPoints();
    }

    _curveFromKeys(keys) {
        const n = CompositionTimelineUI.CURVE_COLUMNS;
        const out = new Array(n);
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            let j = 0;
            while (j < keys.length - 2 && keys[j + 1][0] < t) j++;
            const [t0, e0] = keys[j], [t1, e1] = keys[j + 1];
            const f = t1 > t0 ? Math.max(0, Math.min(1, (t - t0) / (t1 - t0))) : 1;
            out[i] = e0 + (e1 - e0) * (1 - Math.cos(f * Math.PI)) / 2;
        }
        return out;
    }

    /** A flat line at the middle, to draw a contour from scratch. */
    clearCurve() {
        this.curve = new Array(CompositionTimelineUI.CURVE_COLUMNS).fill(0.5);
        this.curveSource = 'drawn';
        this.suggestion = null;
        this._syncPoints();
    }

    /**
     * The generator reads `points` and joins them with straight lines, so the
     * curve is handed over at full resolution: what is on the canvas is
     * exactly what plays.
     */
    _syncPoints() {
        const c = this.curve || [];
        const n = c.length;
        this.points = c.map((e, i) => ({ xNorm: n > 1 ? i / (n - 1) : 0, yNorm: 1 - e, tension: 0.5 }));
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
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        `;
        // WHAT THE LINE IS A DRAWING OF. The same stroke can be the energy of
        // the whole piece, the shape of each phrase, the melody itself, or a
        // short motif — and the generator reads it differently for each.
        const CM = (typeof window !== 'undefined') && window.ContourMeaning;
        const meaning = CM ? CM.describe(CM.current()) : null;
        this._headerTitle = document.createElement('div');
        this._headerTitle.style.cssText = 'color: #22d3ee; font-weight: bold; font-size: 11px;';
        header.appendChild(this._headerTitle);
        const right = document.createElement('div');
        right.style.cssText = 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;';
        if (CM) {
            const lab = document.createElement('label');
            lab.style.cssText = 'display: flex; align-items: center; gap: 5px; color: #94a3b8; font-size: 10px;';
            lab.textContent = 'The line is';
            const sel = document.createElement('select');
            sel.id = 'contour-meaning-select';
            sel.title = 'What the drawn line stands for. Each one is read differently when the music is generated.';
            sel.style.cssText = 'background: #0f3460; color: #e2e8f0; border: 1px solid #22d3ee; '
                + 'border-radius: 3px; font-size: 10px; padding: 2px 4px; cursor: pointer;';
            CM.MEANINGS.forEach((m) => {
                const o = document.createElement('option');
                o.value = m.id;
                o.textContent = m.label;
                o.title = m.about;
                sel.appendChild(o);
            });
            sel.value = meaning.id;
            sel.addEventListener('click', (e) => e.stopPropagation());
            sel.addEventListener('change', () => {
                CM.set(sel.value);
                this.updateMeaningLabels();
                this.drawCanvas();
                this.updateCaption();
            });
            lab.appendChild(sel);
            right.appendChild(lab);
        }
        this._headerAxis = document.createElement('div');
        this._headerAxis.style.cssText = 'color: #64748b; font-size: 10px;';
        right.appendChild(this._headerAxis);
        header.appendChild(right);
        panel.appendChild(header);

        // CANVAS
        const canvasContainer = document.createElement('div');
        canvasContainer.style.cssText = 'padding: 10px; background: #16213e;';
        
        this.canvas = document.createElement('canvas');
        // Sized to the panel rather than to a constant, so the curve is never
        // wider than the box that holds it.
        const panelEl = document.getElementById(this.panelId);
        const avail = panelEl ? Math.max(300, panelEl.clientWidth - 20) : 580;
        // Backing store at device resolution so the line stays crisp.
        this._dpr = Math.max(1, Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
        this.canvas.width = Math.round(avail * this._dpr);
        this.canvas.height = Math.round(150 * this._dpr);
        this.canvas.style.cssText = `
            width: 100%; height: 150px; display: block;
            background: #1a1a2e; border: 1px solid #0f3460; border-radius: 3px;
            cursor: crosshair; touch-action: none;
        `;
        this.updateMeaningLabels();
        
        this.attachCanvasListeners(this.canvas);
        canvasContainer.appendChild(this.canvas);

        // Says whose line it is: a named suggestion, or yours.
        this._caption = document.createElement('div');
        this._caption.style.cssText = 'margin-top: 6px; color: #94a3b8; font-size: 10px; line-height: 1.5; overflow-wrap: anywhere;';
        canvasContainer.appendChild(this._caption);
        panel.appendChild(canvasContainer);
        this.updateCaption();

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
                flex: 0 0 auto;
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
            flex-wrap: wrap;
            background: #0f2741;
            border-top: 1px solid #0f3460;
        `;
        
        const mkBtn = (label, colour, title, onClick) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.title = title;
            b.style.cssText = `
                background: #0f3460; border: 1px solid ${colour}; color: ${colour};
                padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 11px;
                font-weight: bold;
            `;
            b.onclick = (e) => { e.stopPropagation(); onClick(); };
            return b;
        };
        const suggestBtn = mkBtn('💡 Suggest a shape', '#10b981',
            'Replace the line with a named phrase shape that suits the words. Press again for another.',
            () => { this.suggestShape(); this.drawCanvas(); this.updateCaption(); });
        suggestBtn.style.marginRight = 'auto';
        actions.appendChild(suggestBtn);
        actions.appendChild(mkBtn('↺ Clear', '#94a3b8',
            'Start from a flat line and draw your own.',
            () => { this.clearCurve(); this.drawCanvas(); this.updateCaption(); }));

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
            const num = (v, d) => (Number.isFinite(+v) ? +v : d);
            window.__arcComplexity = (stored && typeof stored === 'object')
                ? { rhythm: num(stored.rhythm, 0.5), melody: num(stored.melody, 0.5),
                    // `harmony` is the ladder dial; `color` is kept in step for
                    // anything still reading the old name.
                    harmony: num(stored.harmony, num(stored.color, 0.35)),
                    color: num(stored.harmony, num(stored.color, 0.35)) }
                : { rhythm: 0.5, melody: 0.5, harmony: 0.35, color: 0.35 };
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
            padding: 8px 12px; display: flex; gap: 12px; align-items: center;
            flex-wrap: wrap;
            border-top: 1px solid #0f3460; background: #111c33; font-size: 10px;
        `;

        const sliderRefs = {};
        const mkSlider = (emoji, label, key, title) => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex; align-items:center; gap:6px; flex:1 1 190px; min-width:170px;';
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
                if (key === 'harmony') window.__arcComplexity.color = slider.value / 100;
                pct.textContent = slider.value + '%';
                if (key === 'harmony') this.updateHarmonyLegend();
                this.saveComplexity();
            };
            sliderRefs[key] = { slider, pct };
            wrap.appendChild(lab); wrap.appendChild(slider); wrap.appendChild(pct);
            return wrap;
        };

        row.appendChild(mkSlider('🥁', 'Rhythm', 'rhythm', 'Rhythmic complexity: subdivisions, dotted notes, syncopation'));
        row.appendChild(mkSlider('🎼', 'Melody', 'melody', 'Melodic complexity: wider leaps, chromatic passing tones, melisma'));
        row.appendChild(mkSlider('🎹', 'Harmony', 'harmony',
            'Harmonic complexity. Left = plain primary triads. Each step right switches on one more '
            + 'idea: the full diatonic set, sevenths, secondary dominants, borrowed chords, approach '
            + 'chords, modulation, chromatic mediants, sequences, subverted cadences.'));

        const dice = document.createElement('button');
        dice.textContent = '🎲';
        dice.title = 'Roll random complexity settings';
        dice.style.cssText = `
            background: #0f3460; border: 1px solid #f59e0b; color: #f59e0b;
            padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 13px;
        `;
        dice.onclick = () => {
            ['rhythm', 'melody', 'harmony'].forEach(key => {
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

        // The teaching part: name what this setting has switched on, and what
        // the next notch would add. A dial that changes the music without
        // saying what it changed teaches nothing.
        const legend = document.createElement('div');
        legend.id = 'harmony-complexity-legend';
        legend.style.cssText = 'padding:4px 12px 8px; color:#94a3b8; font-size:10px; line-height:1.5; overflow-wrap:anywhere;';
        this._harmonyLegend = legend;

        const wrapper = document.createElement('div');
        wrapper.appendChild(row);
        wrapper.appendChild(legend);
        setTimeout(() => this.updateHarmonyLegend(), 0);
        return wrapper;
    }

    /**
     * APPROACH SCALES IS NOT CONTROLLED HERE — and used to be, badly.
     *
     * This panel carried its own pair of checkboxes for the mode: an on/off,
     * and an "advanced: borrow on the target's own root". Both were replaced
     * when the mode grew a `source` select (a fifth above / on the chord's own
     * root / let the piece choose) alongside a plain-backdrop check, a
     * collections select and a density range — all of which live in the reading
     * panel behind the `i` beside Generate, next to the descriptor copy that is
     * generated from the same declarations.
     *
     * What was left here was a stale subset that actively misled:
     *
     *   - the "advanced" box WROTE NOTHING. `normalizeApproachMode` derives
     *     `advanced` from `source` on every read, so the checkbox's own write
     *     was overwritten before anything could see it. Measured: unchecking it
     *     against `source:'root'` left the state byte-identical.
     *   - it LIED about the state. Set `source:'fifth'` in the reading panel and
     *     this box carried on showing itself checked, because it is built once
     *     and never re-rendered.
     *   - it could not express `source:'root'` at all — the old boolean only
     *     ever ADDED the own-root family, so two of the three rootings were
     *     unreachable from here.
     *   - its tooltip and legend still described the tonic-withholding rule,
     *     which the walk work removed.
     *
     * Two controls in two places, one of them inert and showing the wrong
     * value, is worse than one control in one place. The dial above answers
     * "how much"; where the colour goes is the reading panel's question.
     */

    /** Describe the current harmony setting in words. */
    updateHarmonyLegend() {
        const el = this._harmonyLegend;
        if (!el || typeof HarmonyComplexity === 'undefined') return;
        const cx = this.getComplexity();
        const d = HarmonyComplexity.describe(cx.harmony != null ? cx.harmony : cx.color);
        el.innerHTML =
            `<strong style="color:#22d3ee;">${d.headline}</strong>` +
            ` <span style="color:#64748b;">· on: ${d.enabled.join(' · ')}</span>` +
            (d.next ? `<br><span style="color:#fbbf24;">${d.next}</span>` : '');
    }

    /**
     * PRESS AND DRAG TO DRAW. Mouse, finger and pen all arrive as pointer
     * events. A stroke writes every column it passes over, in either direction,
     * so drawing across part of the line redraws just that part and leaves the
     * rest alone. Drawing on a suggestion makes the whole line yours.
     */
    attachCanvasListeners(canvas) {
        const pos = (e) => {
            const r = canvas.getBoundingClientRect();
            let x = Math.max(0, Math.min(1, (e.clientX - r.left) / (r.width || 1)));
            // Near an edge counts as the edge. A stroke begun a hair inside
            // left the first columns at their old height, which read as an
            // extra turn — an extra note in a motif nobody drew.
            if (x < 0.03) x = 0;
            if (x > 0.97) x = 1;
            return {
                x,
                e: Math.max(0.03, Math.min(0.97, 1 - (e.clientY - r.top) / (r.height || 1)))
            };
        };
        let last = null;
        let frame = 0;
        const redraw = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => { frame = 0; this.drawCanvas(); });
        };

        canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
            if (!this.curve) this.clearCurve();
            if (this.curveSource !== 'drawn') {
                this.curveSource = 'drawn';
                this.updateCaption();
            }
            last = pos(e);
            this._paintSegment(last, last);
            redraw();
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!last) return;
            e.preventDefault();
            // Coalesced events keep a fast stroke from becoming a few long
            // straight segments.
            const evs = (typeof e.getCoalescedEvents === 'function' && e.getCoalescedEvents().length)
                ? e.getCoalescedEvents() : [e];
            for (const ev of evs) {
                const p = pos(ev);
                this._paintSegment(last, p);
                last = p;
            }
            redraw();
        });

        const end = () => {
            if (!last) return;
            last = null;
            this._lastStrokeEnd = Date.now();
            this._syncPoints();
            this.drawCanvas();
            // The motif's note count follows the stroke.
            this.updateCaption();
        };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('lostpointercapture', end);
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /** Write a straight segment between two pointer positions into the curve. */
    _paintSegment(a, b) {
        const c = this.curve;
        if (!c) return;
        const n = c.length - 1;
        const ia = Math.round(a.x * n), ib = Math.round(b.x * n);
        if (ia === ib) { c[ia] = b.e; return; }
        const step = ia < ib ? 1 : -1;
        for (let i = ia; i !== ib + step; i += step) {
            c[i] = a.e + (b.e - a.e) * ((i - ia) / (ib - ia));
        }
    }

    /** Title, axis hint and screen-reader label for what the line stands for. */
    updateMeaningLabels() {
        const CM = (typeof window !== 'undefined') && window.ContourMeaning;
        const m = CM ? CM.describe(CM.current()) : null;
        if (this._headerTitle) this._headerTitle.textContent = '🎼 ' + (m ? m.title : 'Contour: draw the shape of the piece');
        if (this._headerAxis) this._headerAxis.textContent = m ? m.axis : 'higher = busier, higher, louder';
        if (this.canvas) {
            this.canvas.setAttribute('aria-label', 'Contour. Press and drag to draw. '
                + (m ? m.about : 'How the energy of the piece rises and falls.'));
        }
    }

    updateCaption() {
        const el = this._caption;
        if (!el) return;
        const CM = (typeof window !== 'undefined') && window.ContourMeaning;
        const m = CM ? CM.describe(CM.current()) : null;
        // What the line will be read as, after whose line it is.
        let reading = m ? ` <span style="color:#cbd5e1;">${m.about}</span>` : '';
        if (m && m.id === 'motif' && this.curve) {
            const steps = CM.motifFromCurve(this.curve);
            reading += steps.length
                ? ` <span style="color:#fbbf24;">${steps.length + 1} notes: ${steps.map(d => (d > 0 ? '+' : '') + d).join(' ')} semitones.</span>`
                : ' <span style="color:#fbbf24;">A flat line has no shape — draw a few turns.</span>';
        }
        if (this.curveSource === 'suggested' && this.suggestion) {
            el.innerHTML = `<strong style="color:#10b981;">Suggested: ${this.suggestion.name}.</strong> ` +
                `${this.suggestion.about} <span style="color:#64748b;">Draw over it to make it yours.</span>` + reading;
        } else {
            el.innerHTML = '<strong style="color:#00d4ff;">Your contour.</strong> ' +
                '<span style="color:#64748b;">Draw across any part to redraw it. It stays when you change the words.</span>' + reading;
        }
    }

    drawCanvas() {
        const c = this.curve;
        if (!this.canvas || !c || !c.length) return;
        // The panel is narrowed to the screen after the canvas is built, so
        // match the backing store to the size actually shown, or a phone
        // gets a shrunken drawing with unreadable labels.
        const shownW = this.canvas.clientWidth, shownH = this.canvas.clientHeight;
        if (shownW && shownH) {
            const k0 = this._dpr || 1;
            const bw = Math.round(shownW * k0), bh = Math.round(shownH * k0);
            if (this.canvas.width !== bw) this.canvas.width = bw;
            if (this.canvas.height !== bh) this.canvas.height = bh;
        }
        const ctx = this.canvas.getContext('2d');
        const w = this.canvas.width;
        const h = this.canvas.height;
        const k = this._dpr || 1;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        // Quarter lines in time and energy, faint enough to draw over.
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        for (let q = 1; q < 4; q++) {
            ctx.moveTo(Math.round(w * q / 4) + 0.5, 0); ctx.lineTo(Math.round(w * q / 4) + 0.5, h);
            ctx.moveTo(0, Math.round(h * q / 4) + 0.5); ctx.lineTo(w, Math.round(h * q / 4) + 0.5);
        }
        ctx.stroke();

        const n = c.length - 1;
        const X = (i) => (i / n) * w;
        const Y = (e) => (1 - e) * h;
        const drawn = this.curveSource === 'drawn';

        // Area under the line, so the energy reads as an amount.
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i <= n; i++) ctx.lineTo(X(i), Y(c[i]));
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = drawn ? 'rgba(0, 212, 255, 0.14)' : 'rgba(16, 185, 129, 0.08)';
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            if (i === 0) ctx.moveTo(X(i), Y(c[i])); else ctx.lineTo(X(i), Y(c[i]));
        }
        ctx.strokeStyle = drawn ? '#00d4ff' : '#10b981';
        ctx.lineWidth = 2 * k;
        ctx.lineJoin = 'round';
        ctx.setLineDash(drawn ? [] : [6 * k, 5 * k]);
        ctx.stroke();
        ctx.setLineDash([]);

        // As a motif the line is heard as its turns: mark the notes it becomes.
        const CM = (typeof window !== 'undefined') && window.ContourMeaning;
        const meaningId = CM ? CM.current() : 'piece';
        if (meaningId === 'motif' && CM.motifFromCurve(c).length) {
            const tp = CM.turningPoints(c);
            ctx.fillStyle = '#fbbf24';
            tp.indices.forEach((i) => {
                ctx.beginPath();
                ctx.arc(X(i), Y(c[i]), 4.5 * k, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        const ends = {
            piece: ['start', 'end'],
            phrase: ['each phrase begins', 'its cadence'],
            melody: ['first note', 'last note'],
            motif: ['first note', 'last note']
        }[meaningId] || ['start', 'end'];
        ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.font = `${10 * k}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(ends[0], 4 * k, h - 14 * k);
        ctx.textAlign = 'right';
        ctx.fillText(ends[1], w - 4 * k, h - 14 * k);
        ctx.textAlign = 'left';
    }

    triggerGeneration() {
        if (!this.currentProfile) return;

        // Always provide a seed so repeated clicks can generate different results.
        // Use Date.now() so it varies even if Math.random() is overridden/deterministic.
        this._seedCounter = (this._seedCounter || 0) + 1;
        const seed = ((Date.now() ^ (this._seedCounter * 2654435761)) >>> 0);

        // THE ARC OWNS THE STAFF FOR THIS PRESS, exactly as the Generate button
        // beside the reading dropdown does. This is a third entry point into the
        // same generation, and it was the only one not claiming the staff — so a
        // lexical pass still in flight from typing could land afterwards and
        // rewrite the sheet from display tokens, which keep root/type/notes and
        // no record of where a borrowed chord came from. Three buttons that
        // generate must generate the same way or the difference between them is
        // a bug nobody can see.
        try { window.__sheetOwnedByArc = true; } catch (_) {}

        // Dispatch arcConfirmed event with details for the generation engine
        const event = new CustomEvent('arcConfirmed', {
            detail: {
                profile: this.currentProfile,
                points: this.points,
                canvasMode: this.canvasMode,
                contourMeaning: (window.ContourMeaning && window.ContourMeaning.current()) || 'piece',
                input: this.inputElement.value,
                seed,
                // Carried for the same reason the primary button carries it:
                // so anything re-rendering from this event knows which reading
                // produced the take.
                method: (typeof window !== 'undefined' && window.__generationMethod) || 'contour'
            }
        });
        
        document.dispatchEvent(event);
        this.closePanel();
    }
}
