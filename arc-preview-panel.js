/**
 * arc-preview-panel.js
 * REDESIGNED - Phase 1c: Live Arc Preview + Analysis Panel
 * 
 * Shows actual arc from typed words (not presets)
 * Real-time parameter display
 * Regenerate button for seed variation
 * Triggers generation when user confirms
 */

class ArcPreviewPanel {
  constructor(inputSelector = '#global-word-input', panelId = 'arc-preview-panel') {
    this.inputElement = document.querySelector(inputSelector);
    this.panelId = panelId;
    this.currentSeed = Math.floor(Math.random() * 1000000);
    this.seedAnchor = this.currentSeed;
    this.currentContext = null;
    this.currentArc = null;
    this.isMouseOverPanel = false; // Track if mouse is over panel
    this.suppressBlurCloseUntil = 0;
    
    this.contextEngine = typeof ContextEngine !== 'undefined' ? new ContextEngine() : null;
    this.arcGenerator = typeof ArcGenerator !== 'undefined' ? new ArcGenerator() : null;
    
    this.initializePanel();
    this.attachListeners();
  }
  
  /**
   * Create panel container in DOM
   */
  initializePanel() {
    if (document.getElementById(this.panelId)) {
      return;
    }
    
    const panel = document.createElement('div');
    panel.id = this.panelId;
    panel.className = 'arc-preview-panel';
    panel.style.cssText = `
      position: absolute;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 4px;
      margin-top: 2px;
      max-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      transition: max-height 0.2s cubic-bezier(0, 0, 0.2, 1);
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      color: #f1f5f9;
      font-size: 10px;
      line-height: 1.3;
      box-sizing: border-box;
      scrollbar-width: thin;
      scrollbar-color: #38bdf8 #0f172a;
    `;
    
    document.body.appendChild(panel);
  }
  
  /**
   * Attach listeners to input and panel
   */
  attachListeners() {
    if (!this.inputElement) return;
    
    this.inputElement.addEventListener('focus', () => this.onInputFocus());
    this.inputElement.addEventListener('input', (e) => this.onInputChange(e));
    
    // Blur: Close panel only if focus moved completely outside (not to panel elements)
    this.inputElement.addEventListener('blur', (event) => {
      setTimeout(() => {
        const panel = document.getElementById(this.panelId);
        if (!panel) return;

        // Keep panel open briefly while interacting with panel controls.
        if (Date.now() < this.suppressBlurCloseUntil) {
          return;
        }
        
        const focusedElement = document.activeElement;
        
        // Don't close if focus is inside the panel (user clicked a panel button)
        if (focusedElement && panel.contains(focusedElement)) {
          return;
        }
        
        // Don't close if mouse is over the panel (they might click something)
        if (this.isMouseOverPanel) {
          return;
        }
        
        // Only close if focus truly left the input/panel system
        this.closePanel();
      }, 100);
    });
    
    // Track mouse over panel to prevent premature closing
    const panel = document.getElementById(this.panelId);
    if (panel) {
      panel.addEventListener('mouseenter', () => { this.isMouseOverPanel = true; });
      panel.addEventListener('mouseleave', () => { this.isMouseOverPanel = false; });
      panel.addEventListener('pointerdown', () => {
        this.suppressBlurCloseUntil = Date.now() + 500;
      });
      panel.addEventListener('focusin', () => {
        this.suppressBlurCloseUntil = Date.now() + 500;
      });
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', (event) => {
      const panel = document.getElementById(this.panelId);
      if (!panel) return;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const clickedInsideInput = this.inputElement && (this.inputElement.contains(event.target) || path.includes(this.inputElement));
      const clickedInsidePanel = panel.contains(event.target) || path.includes(panel);
      
      // If click was outside both input and panel, close the panel
      if (!clickedInsideInput && !clickedInsidePanel) {
        this.closePanel();
      }
    });
  }
  
  /**
   * Handle input focus
   */
  onInputFocus() {
    const text = this.inputElement.value.trim();
    if (text.length > 0) {
      this.analyzeAndPreview(text);
      this.openPanel();
    }
  }
  
  /**
   * Handle input change (live update)
   */
  onInputChange(event) {
    const text = event.target.value.trim();
    
    if (text.length === 0) {
      this.closePanel();
      return;
    }
    
    this.analyzeAndPreview(text);
    
    if (!this.isOpen) {
      this.openPanel();
    }
  }
  
  /**
   * Analyze input and generate preview
   */
  analyzeAndPreview(text) {
    if (!this.contextEngine || !this.arcGenerator) {
      console.warn('Context or Arc engine not available');
      return;
    }
    
    // Parse input with source-seed variation so regenerate can shift context-level parameters.
    this.currentContext = this.contextEngine.parseInput(text, {
      variationSeed: this.seedAnchor
    });

    // Generate arc using seed derived from base seed + current parameters.
    this.currentSeed = this._deriveActiveSeed();
    this.currentArc = this.arcGenerator.generateArc(this.currentContext, this.currentSeed, 4);
    
    // Render preview and ensure panel is open
    this.renderPanel();
    this.openPanel(); // Ensure panel opens after rendering
  }
  
  /**
   * Render the preview panel
   */
  renderPanel() {
    const panel = document.getElementById(this.panelId);
    if (!panel) return;
    
    // Ensure panel stays visibly open while rebuilding
    panel.style.maxHeight = '85vh';
    
    panel.innerHTML = '';
    
    // ===== HEADER =====
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px 14px;
      background: #0f2741;
      border-bottom: 1px solid #0f3460;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const headerText = document.createElement('div');
    headerText.innerHTML = `
      <div style="color: #22d3ee; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">🎼 Arc Preview</div>
      <div style="color: #94a3b8; font-size: 9px; margin-top: 2px;">⚡ Seed: <code id="arc-active-seed-header" style="background: #0f3460; padding: 1px 4px; border-radius: 2px; color: #00ff88; font-family: monospace; font-size: 9px;">${this.currentSeed}</code></div>
    `;
    
    const headerControls = document.createElement('div');
    headerControls.style.cssText = `
      display: flex;
      gap: 6px;
      align-items: center;
    `;


    const regenerateBtn = document.createElement('button');
    regenerateBtn.innerHTML = '🎲 Regenerate';
    regenerateBtn.style.cssText = `
      background: #0f3460;
      border: 1px solid #00d4ff;
      color: #00d4ff;
      padding: 4px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 10px;
      transition: all 0.2s;
    `;
    const seedInput = document.createElement('input');
    seedInput.id = 'arc-source-seed-input';
    seedInput.type = 'number';
    seedInput.min = '0';
    seedInput.max = '999999';
    seedInput.step = '1';
    seedInput.value = String(this.seedAnchor);
    seedInput.style.cssText = `
      width: 60px;
      background: #0f3460;
      border: 1px solid #0f3460;
      color: #00ff88;
      padding: 4px;
      border-radius: 3px;
      font-size: 10px;
      font-family: monospace;
    `;
    seedInput.title = 'Type a seed and press Enter or Load';

    const seedLabel = document.createElement('span');
    seedLabel.textContent = 'Seed';
    seedLabel.style.cssText = `
      color: #cbd5e1;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    seedInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.applySeedFromInput(seedInput.value);
      }
    });

    const loadSeedBtn = document.createElement('button');
    loadSeedBtn.textContent = 'Load';
    loadSeedBtn.style.cssText = `
      background: #0f3460;
      border: 1px solid #00ff88;
      color: #00ff88;
      padding: 4px 6px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 10px;
      transition: all 0.2s;
    `;
    loadSeedBtn.addEventListener('click', (event) => {
      event.preventDefault();
      this.applySeedFromInput(seedInput.value);
    });

    regenerateBtn.addEventListener('click', (event) => {
      event.preventDefault();
      this.regenerateArc();
    });
    regenerateBtn.addEventListener('mouseenter', () => regenerateBtn.style.background = '#1a5080');
    regenerateBtn.addEventListener('mouseleave', () => regenerateBtn.style.background = '#0f3460');
    
    headerControls.appendChild(seedLabel);
    headerControls.appendChild(seedInput);
    headerControls.appendChild(loadSeedBtn);
    headerControls.appendChild(regenerateBtn);
    header.appendChild(headerText);
    header.appendChild(headerControls);
    panel.appendChild(header);
    
    // ===== ANALYSIS SECTION =====
    const analysisSection = document.createElement('div');
    analysisSection.style.cssText = `
      padding: 8px;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;
    
    // Left: Detected Parameters
    const paramList = document.createElement('div');
    const selectedScale = (this.currentContext && this.currentContext.harmonicProfile && this.currentContext.harmonicProfile.recommendedScale)
      ? this.currentContext.harmonicProfile.recommendedScale
      : 'n/a';
    const approachScale = (this.currentContext && this.currentContext.harmonicProfile && this.currentContext.harmonicProfile.approachScale)
      ? this.currentContext.harmonicProfile.approachScale
      : 'n/a';

    const parserSignature = (this.currentContext && this.currentContext.metadata && this.currentContext.metadata.engineSignature)
      ? this.currentContext.metadata.engineSignature
      : 'unknown';

    paramList.innerHTML = `
      <div style="font-size: 10px; color: #22d3ee; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">Detected</div>
      <div style="display: flex; flex-direction: column; gap: 2px; font-size: 10px;">
        <div><span style="color: #cbd5e1;">Tone:</span> <span style="color: #86efac;">${this.currentContext.emotionalTone}</span></div>
        <div><span style="color: #cbd5e1;">Arc:</span> <span style="color: #86efac;">${this.currentContext.arcShapeKey}</span></div>
        <div><span style="color: #cbd5e1;">Perf:</span> <span style="color: #86efac;">${this.currentContext.performanceIntent}</span></div>
        <div><span style="color: #cbd5e1;">Voc:</span> <span style="color: #86efac;">${this.currentContext.vocalizationStyle}</span></div>
        <div><span style="color: #cbd5e1;">Time:</span> <span style="color: #86efac;">${this.currentContext.timeSignature}</span></div>
        <div><span style="color: #cbd5e1;">Scale:</span> <span style="color: #86efac;">${selectedScale}</span></div>
        <div><span style="color: #cbd5e1;">Appr:</span> <span style="color: #fbbf24;">${approachScale}</span></div>
        <div><span style="color: #cbd5e1;">Eng:</span> <span style="color: #7dd3fc;">${parserSignature}</span></div>
      </div>
    `;
    
    // Right: Intensity & Variation
    const intensityList = document.createElement('div');
    intensityList.innerHTML = `
      <div style="font-size: 10px; color: #22d3ee; font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">Parameters</div>
      <div style="display: flex; flex-direction: column; gap: 2px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">Intensity:</span>
          <span style="color: #fbbf24;">${(this.currentContext.intensity * 100).toFixed(0)}%</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">Drag:</span>
          <span style="color: #fbbf24;">${(this.currentContext.dragFactor * 100).toFixed(0)}%</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">Comp:</span>
          <span style="color: #fbbf24;">${(this.currentContext.metadata.complexity * 100).toFixed(0)}%</span>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">Active:</span>
          <code id="arc-active-seed-details" style="background: #0f3460; padding: 1px 4px; border-radius: 2px; color: #00ff88; font-family: monospace; font-size: 9px;">${this.currentSeed}</code>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #cbd5e1;">Source:</span>
          <code id="arc-source-seed-details" style="background: #0f3460; padding: 1px 4px; border-radius: 2px; color: #64c8ff; font-family: monospace; font-size: 9px;">${this.seedAnchor}</code>
        </div>
      </div>
    `;
    
    analysisSection.appendChild(paramList);
    analysisSection.appendChild(intensityList);
    panel.appendChild(analysisSection);
    
    // ===== ARC CANVAS PREVIEW =====
    const canvasSection = document.createElement('div');
    canvasSection.style.cssText = `
      padding: 8px;
      background: #0f2741;
      border-bottom: 1px solid #0f3460;
    `;
    
    const canvasLabel = document.createElement('div');
    canvasLabel.style.cssText = `
      font-size: 10px;
      color: #cbd5e1;
      margin-bottom: 4px;
      text-transform: uppercase;
    `;
    canvasLabel.textContent = '📊 Energy Arc:';
    
    const canvas = document.createElement('canvas');
    canvas.width = 580;
    canvas.height = 60;
    canvas.style.cssText = `
      width: 100%;
      height: auto;
      background: #1a1a2e;
      border: 1px solid #0f3460;
      border-radius: 3px;
    `;
    
    this.drawArcPreview(canvas);
    
    canvasSection.appendChild(canvasLabel);
    canvasSection.appendChild(canvas);
    panel.appendChild(canvasSection);
    
    // ===== CONTROL PARAMETERS =====
    const controlsSection = document.createElement('div');
    controlsSection.style.cssText = `
      padding: 8px;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;
    
    // Intensity slider
    const intensityControl = document.createElement('div');
    intensityControl.innerHTML = `
      <label style="font-size: 10px; color: #22d3ee; text-transform: uppercase; display: block; margin-bottom: 2px;">Intensity</label>
      <input type="range" id="arc-intensity" min="0" max="100" value="${this.currentContext.intensity * 100}" style="width: 100%; height: 4px;">
      <div style="font-size: 9px; color: #cbd5e1; margin-top: 2px;">Current: <span id="arc-intensity-value">${(this.currentContext.intensity * 100).toFixed(0)}%</span></div>
    `;
    
    const intensitySlider = intensityControl.querySelector('#arc-intensity');
    const intensityValue = intensityControl.querySelector('#arc-intensity-value');
    intensitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      intensityValue.textContent = `${val}%`;
      this.currentContext.intensity = val / 100;
      this._refreshArcFromCurrentState();
      this.drawArcPreview(canvas);
    });
    
    // Time signature selector
    const timeSigControl = document.createElement('div');
    timeSigControl.innerHTML = `
      <label style="font-size: 10px; color: #22d3ee; text-transform: uppercase; display: block; margin-bottom: 2px;">Time Sig</label>
      <select id="arc-timesig" style="width: 100%; padding: 2px; background: #0f3460; color: #e2e8f0; border: 1px solid #0f3460; border-radius: 2px; font-size: 10px;">
        <option value="2/4" ${this.currentContext.timeSignature === '2/4' ? 'selected' : ''}>2/4</option>
        <option value="3/4" ${this.currentContext.timeSignature === '3/4' ? 'selected' : ''}>3/4</option>
        <option value="4/4" ${this.currentContext.timeSignature === '4/4' ? 'selected' : ''}>4/4</option>
        <option value="5/4" ${this.currentContext.timeSignature === '5/4' ? 'selected' : ''}>5/4</option>
        <option value="6/8" ${this.currentContext.timeSignature === '6/8' ? 'selected' : ''}>6/8</option>
      </select>
    `;
    
    const timeSigSelect = timeSigControl.querySelector('#arc-timesig');
    timeSigSelect.addEventListener('change', (e) => {
      this.currentContext.timeSignature = e.target.value;
      this._refreshArcFromCurrentState();
      this.drawArcPreview(canvas);
    });
    
    controlsSection.appendChild(intensityControl);
    controlsSection.appendChild(timeSigControl);
    panel.appendChild(controlsSection);
    
    // ===== ACTION BUTTONS =====
    const actionsSection = document.createElement('div');
    actionsSection.style.cssText = `
      padding: 8px;
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      background: #0f2741;
      border-top: 1px solid #0f3460;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      background: transparent;
      border: 1px solid #666;
      color: #888;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `;
    cancelBtn.addEventListener('click', () => this.closePanel());
    
    const generateBtn = document.createElement('button');
    generateBtn.innerHTML = '✨ Generate Music';
    generateBtn.style.cssText = `
      background: #0f3460;
      border: 1px solid #00d4ff;
      color: #00d4ff;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-weight: bold;
    `;
    generateBtn.addEventListener('click', () => this.triggerGeneration());
    generateBtn.addEventListener('mouseenter', () => generateBtn.style.background = '#1a5080');
    generateBtn.addEventListener('mouseleave', () => generateBtn.style.background = '#0f3460');
    
    actionsSection.appendChild(cancelBtn);
    actionsSection.appendChild(generateBtn);
    panel.appendChild(actionsSection);
    
    // ===== MUSIC PREVIEW SECTION (Hidden until music generated) =====
    const musicPreviewSection = document.createElement('div');
    musicPreviewSection.id = 'arc-music-preview';
    musicPreviewSection.style.cssText = `
      padding: 10px;
      background: #0f2741;
      border-top: 1px solid #0f3460;
      display: none;
      transition: max-height 0.3s ease-out;
    `;
    
    // Preview header
    const previewHeader = document.createElement('div');
    previewHeader.style.cssText = `
      font-size: 11px;
      color: #00d4ff;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 1px;
    `;
    previewHeader.textContent = '🎼 Music Preview';
    musicPreviewSection.appendChild(previewHeader);
    
    // Clef selector
    const clefSelector = document.createElement('div');
    clefSelector.style.cssText = `
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 10px;
    `;
    clefSelector.innerHTML = `
      <label style="color: #888;">Clef:</label>
      <button data-clef="treble" style="padding: 2px 8px; background: #0f3460; border: 1px solid #00d4ff; color: #00d4ff; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: bold;">Treble</button>
      <button data-clef="bass" style="padding: 2px 8px; background: #0f3460; border: 1px solid #666; color: #888; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: bold;">Bass</button>
    `;
    musicPreviewSection.appendChild(clefSelector);
    
    // Clef container (for SVG rendering)
    const clefContainer = document.createElement('div');
    clefContainer.id = 'arc-clef-container';
    clefContainer.style.cssText = `
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 6px;
      min-height: 150px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 11px;
    `;
    clefContainer.textContent = 'Music will appear here';
    musicPreviewSection.appendChild(clefContainer);
    
    // Chord symbols display
    const chordDisplay = document.createElement('div');
    chordDisplay.id = 'arc-chord-display';
    chordDisplay.style.cssText = `
      font-size: 9px;
      color: #94a3b8;
      margin-bottom: 6px;
      padding: 4px 8px;
      background: #0f172a;
      border-radius: 2px;
      border-left: 2px solid #00d4ff;
      font-family: monospace;
    `;
    chordDisplay.textContent = 'Chords: (none)';
    musicPreviewSection.appendChild(chordDisplay);
    
    // Play controls
    const playControls = document.createElement('div');
    playControls.style.cssText = `
      display: flex;
      gap: 6px;
      justify-content: center;
    `;
    
    const playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = `
      padding: 4px 10px;
      background: #0f172a;
      border: 1px solid #00ff88;
      color: #00ff88;
      border-radius: 2px;
      cursor: pointer;
      font-size: 9px;
      font-weight: bold;
    `;
    playBtn.addEventListener('click', () => this._playPreview());
    
    const stopBtn = document.createElement('button');
    stopBtn.textContent = '⏹ Stop';
    stopBtn.style.cssText = `
      padding: 4px 10px;
      background: #0f172a;
      border: 1px solid #ff6b6b;
      color: #ff6b6b;
      border-radius: 2px;
      cursor: pointer;
      font-size: 9px;
      font-weight: bold;
    `;
    stopBtn.addEventListener('click', () => this._stopPreview());
    
    playControls.appendChild(playBtn);
    playControls.appendChild(stopBtn);
    musicPreviewSection.appendChild(playControls);
    
    panel.appendChild(musicPreviewSection);
    
    // Store reference to preview section for later updates
    this.musicPreviewSection = musicPreviewSection;
    this.clefContainer = clefContainer;
    this.chordDisplay = chordDisplay;
  }

  _normalizeSeed(rawSeed) {
    const parsed = Number(rawSeed);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    return Math.abs(Math.floor(parsed)) % 1000000;
  }

  _buildSeedSignature() {
    const context = this.currentContext || {};
    const metadata = context.metadata || {};
    const text = this.inputElement ? this.inputElement.value.trim().toLowerCase() : '';

    const intensity = typeof context.intensity === 'number' ? context.intensity.toFixed(4) : '0.0000';
    const dragFactor = typeof context.dragFactor === 'number' ? context.dragFactor.toFixed(4) : '0.0000';
    const complexity = typeof metadata.complexity === 'number' ? metadata.complexity.toFixed(4) : '0.0000';

    return [
      text,
      intensity,
      context.timeSignature || '',
      context.performanceIntent || '',
      context.emotionalTone || '',
      context.vocalizationStyle || '',
      dragFactor,
      complexity
    ].join('|');
  }

  _deriveActiveSeed() {
    const signature = this._buildSeedSignature();
    let hash = (this.seedAnchor || 1) >>> 0;

    for (let i = 0; i < signature.length; i++) {
      hash ^= signature.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }

    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d) >>> 0;
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b) >>> 0;
    hash ^= hash >>> 16;

    return hash % 1000000;
  }

  _refreshArcFromCurrentState() {
    if (!this.currentContext || !this.arcGenerator) {
      return;
    }

    this.currentSeed = this._deriveActiveSeed();
    this.currentArc = this.arcGenerator.generateArc(this.currentContext, this.currentSeed, 4);
    this._updateSeedDisplays();
  }

  _updateSeedDisplays() {
    const headerSeed = document.getElementById('arc-active-seed-header');
    if (headerSeed) {
      headerSeed.textContent = String(this.currentSeed);
    }

    const detailSeed = document.getElementById('arc-active-seed-details');
    if (detailSeed) {
      detailSeed.textContent = String(this.currentSeed);
    }

    const sourceSeedDetail = document.getElementById('arc-source-seed-details');
    if (sourceSeedDetail) {
      sourceSeedDetail.textContent = String(this.seedAnchor);
    }

    const seedInput = document.getElementById('arc-source-seed-input');
    if (seedInput && document.activeElement !== seedInput) {
      seedInput.value = String(this.seedAnchor);
    }
  }

  applySeedFromInput(rawSeed) {
    const normalizedSeed = this._normalizeSeed(rawSeed);
    if (normalizedSeed === null) {
      console.warn('⚠️ Invalid seed. Please enter a number.');
      return;
    }

    this.seedAnchor = normalizedSeed;
    this.suppressBlurCloseUntil = Date.now() + 500;

    if (this.inputElement) {
      const text = this.inputElement.value.trim();
      if (text.length > 0) {
        this.analyzeAndPreview(text);
        return;
      }
    }

    this._refreshArcFromCurrentState();
    this.renderPanel();
    this.openPanel();
  }
  
  /**
   * Draw arc on canvas
   */
  drawArcPreview(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Grid
    ctx.strokeStyle = 'rgba(15, 52, 96, 0.5)';
    ctx.lineWidth = 0.5;
    
    // Vertical grid (bars)
    if (this.currentArc) {
      const beatsPerBar = this.currentArc.beatsPerBar || 4;
      const bars = this.currentArc.bars;
      for (let bar = 0; bar <= bars; bar++) {
        const x = padding + (bar / bars) * graphWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }
    }
    
    // Horizontal grid (energy levels)
    for (let level = 0; level <= 5; level++) {
      const y = height - padding - (level / 5) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding - 4, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw arc
    if (this.currentArc && this.currentArc.energyProfile) {
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const points = this.currentArc.energyProfile;
      for (let i = 0; i < points.length; i++) {
        const energy = Math.max(0, Math.min(1, points[i]));
        const x = padding + (i / (points.length - 1)) * graphWidth;
        const y = height - padding - energy * graphHeight;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      
      // Draw points
      ctx.fillStyle = '#00ff88';
      for (let i = 0; i < Math.min(points.length, 50); i += Math.max(1, Math.floor(points.length / 20))) {
        const energy = Math.max(0, Math.min(1, points[i]));
        const x = padding + (i / (points.length - 1)) * graphWidth;
        const y = height - padding - energy * graphHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Energy Arc Energy Profile', width / 2, height - 4);
  }
  
  /**
   * Regenerate with new seed
   */
  regenerateArc() {
    this.seedAnchor = Math.floor(Math.random() * 1000000);
    this.suppressBlurCloseUntil = Date.now() + 500;

    if (this.inputElement) {
      const text = this.inputElement.value.trim();
      if (text.length > 0) {
        console.log(`🎲 Regenerating arc with NEW BASE SEED: ${this.seedAnchor}`);
        this.analyzeAndPreview(text); // This now handles openPanel() internally
      }
    }
  }
  
  /**
   * Trigger music generation
   */
  triggerGeneration() {
    // Dispatch event for parent system
    const event = new CustomEvent('arcConfirmed', {
      detail: {
        context: this.currentContext,
        arc: this.currentArc,
        seed: this.currentSeed,
        input: this.inputElement.value
      }
    });
    document.dispatchEvent(event);
    
    this.closePanel();
    console.log('🎵 Music generation triggered:', {
      words: this.inputElement.value,
      seed: this.currentSeed,
      tone: this.currentContext.emotionalTone,
      timeSignature: this.currentContext.timeSignature
    });
  }
  
  /**
   * Play preview of generated music
   */
  _playPreview() {
    console.log('▶ Play button clicked (audio engine integration pending)');
    // TODO: Wire to enhanced-audio-engine.js
    // For now, just log - audio playback will be Phase 2
  }
  
  /**
   * Stop preview of generated music
   */
  _stopPreview() {
    console.log('⏹ Stop button clicked (audio engine integration pending)');
    // TODO: Wire to enhanced-audio-engine.js
    // For now, just log - audio playback will be Phase 2
  }
  
  /**
   * Display generated music in preview section
   * Called from arc-ui-init.js when musicGenerated event fires
   */
  displayGeneratedMusic(musicData) {
    if (!this.musicPreviewSection) return;
    
    const { harmony, melody, context, seed, input } = musicData;
    
    // Show the preview section
    this.musicPreviewSection.style.display = 'block';
    
    // Update chord display
    if (harmony && harmony.chordSequence) {
      const chordNames = harmony.chordSequence.map(c => c.chord).join(' → ');
      this.chordDisplay.textContent = `🎸 Chords: ${chordNames}`;
    }
    
    // TODO: Render clef with melody (Step 2)
    // For now, show placeholder
    this.clefContainer.textContent = `🎼 Treble Clef - ${melody.notes.length} notes (clef rendering coming in Step 2)`;
    
    console.log('✅ Music preview section updated');
    
    // Store for play button later
    this.currentMusic = musicData;
  }
  
  /**
   * Open panel
   */
  openPanel() {
    const panel = document.getElementById(this.panelId);
    if (panel && this.inputElement) {
      const rect = this.inputElement.getBoundingClientRect();
      panel.style.top = `${rect.bottom + window.scrollY}px`;
      panel.style.left = `${rect.left + window.scrollX}px`;
      panel.style.width = `${Math.max(rect.width, 580)}px`; // Reduced min-width for economy
      panel.style.maxHeight = '85vh'; // Use vh for dynamic screen safety
      this.isOpen = true;
    }
  }
  
  /**
   * Close panel
   */
  closePanel() {
    const panel = document.getElementById(this.panelId);
    if (panel) {
      panel.style.maxHeight = '0';
      this.isOpen = false;
    }
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ArcPreviewPanel;
}
