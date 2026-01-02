/**
 * @module SolarSystemVisualizerV2
 * @description Enhanced planetary orbit visualization with path tracking and multiple expansion
 * @exports class SolarSystemVisualizer
 * @feature Enhanced version with path tracking
 * @feature Multiple simultaneous planet expansion
 * @feature Improved trajectory visualization
 * @feature Mouse hover interactions
 * @feature Active path highlighting
 */

(function(global){
  class SolarSystemVisualizer {
    constructor(musicTheoryEngine){
      if(!musicTheoryEngine) throw new Error('SolarSystemVisualizer requires MusicTheoryEngine');
      this.musicTheory = musicTheoryEngine;
      this.container = null;
      this.canvas = null;
      this.ctx = null;
      this.animId = null;
      this.state = {
        key: 'C',
        scale: 'major',
        notes: [],
        planets: [],
        time: 0,
        expandedPlanets: [],
        activePath: [],
        highlightedNotes: [],
        highlightedRoots: {},
        showTrajectories: false,
        sizeScale: 1.0,
        speedScale: 0.4,
        sizingMode: 'theory'
      };
      this.isPlaying = false;
      this.stars = [];
      this.handleResize = this.handleResize.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseLeave = this.onMouseLeave.bind(this);
      this.resizeObserver = null;
      this.tooltip = null;
    }

    mount(container){
      if(typeof container === 'string') container = document.querySelector(container);
      if(!container) return;
      this.container = container;
      this.container.innerHTML = '';
      // Detect condensed mode only when container has explicit class `solar-condensed`
      const isCondensed = (container.classList && container.classList.contains('solar-condensed'));
      this.condensedMode = !!isCondensed;

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.borderRadius = this.condensedMode ? '8px' : '12px';
      canvas.style.background = this.condensedMode ? 'radial-gradient(ellipse at center, #050612 0%, #060813 60%, #03040a 100%)' : 'radial-gradient(ellipse at center, #0b1220 0%, #0a0f1a 50%, #080c14 100%)';
      this.container.appendChild(canvas);

      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.resizeCanvas();
      // Ensure canvas CSS fills container in condensed mode (sometimes percent heights collapse)
      if (this.condensedMode) {
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
      this.makeStars();

      // If container is not yet measured (e.g. sidebar just inserted or hidden), schedule a deferred resize/draw
      const rectCheck = this.container.getBoundingClientRect();
      if ((rectCheck.width === 0 || rectCheck.height === 0) && typeof window !== 'undefined') {
        // Use ResizeObserver when available to catch when the sidebar becomes visible
        if (typeof ResizeObserver !== 'undefined') {
          try {
            if (this._ro) { try { this._ro.disconnect(); } catch(_){} }
            this._ro = new ResizeObserver(() => {
              try {
                const r = this.container.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                  this.resizeCanvas(); this.makeStars(); this.rebuildPlanets(); this.draw();
                  if (this._ro) { try { this._ro.disconnect(); } catch(_){} }
                  this._ro = null;
                }
              } catch(_){}
            });
            this._ro.observe(this.container);
          } catch(_) {
            // fallback timed retry
            setTimeout(() => { try { this.resizeCanvas(); this.makeStars(); this.rebuildPlanets(); this.draw(); } catch(_){} }, 140);
          }
        } else {
          setTimeout(() => { try { this.resizeCanvas(); this.makeStars(); this.rebuildPlanets(); this.draw(); } catch(_){} }, 140);
        }
      }

      // In condensed mode we omit the full controls and reduce animations/interaction
      if (!this.condensedMode) {
        this.injectControls();
        this.injectTooltip();
        window.addEventListener('resize', this.handleResize);
        this.canvas.addEventListener('click', this.onClick);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseleave', this.onMouseLeave);
      } else {
        // minimal tooltip only
        this.injectTooltip();
        // reduced update scales for compact rendering
        this.state.sizeScale = Math.max(0.5, Math.min(1.0, (this.state.sizeScale || 1.0) * 0.6));
        this.state.speedScale = Math.max(0.12, Math.min(0.6, (this.state.speedScale || 0.4) * 0.5));
        // Force an immediate draw (fallback static sun) and a lightweight interval animation for mini view
        try { this.rebuildPlanets(); this.draw(); } catch(_){}
        if (!this._miniInterval) {
          this._miniInterval = setInterval(() => { try { this.state.time += 1; this.draw(); } catch(_){} }, 800);
        }
      }

      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.container);
      }

      // Start paused by default for easier exploration
      this.draw();
    }

    unmount(){
      window.removeEventListener('resize', this.handleResize);
      if(this.canvas){
        this.canvas.removeEventListener('click', this.onClick);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
      }
      if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
      if (this._ro) { try { this._ro.disconnect(); } catch(_){} this._ro = null; }
      this.stop();
      if(this.container){ this.container.innerHTML = ''; }
    }

    updateSystem({ key, scale = this.state.scale, notes }){
      if(key) this.state.key = key;
      if(scale) this.state.scale = scale;
      if(Array.isArray(notes)) this.state.notes = notes.slice();
      this.rebuildPlanets();
      // Update controls so header text and sizing reflect latest state
      this.injectControls();
    }

    setGeneratedNumbers(numbers, scaleNotes){
      const highlighted = numbers.map(n => typeof n === 'number' ? scaleNotes[(n - 1) % scaleNotes.length] : n);
      this.state.highlightedNotes = highlighted;
    }

    setChordHighlights(metaList){
      // metaList: array of { chordRoot, isSubstitution, chosenGrade, functions }
      const map = {};
      if (Array.isArray(metaList)){
        metaList.forEach(m => {
          const root = m && m.chordRoot;
          if (!root) return;
          if (!map[root]) map[root] = { count: 0, isSubstitution: false, maxGrade: -1, functions: new Set() };
          map[root].count += 1;
          if (m.isSubstitution) map[root].isSubstitution = true;
          if (typeof m.chosenGrade === 'number') map[root].maxGrade = Math.max(map[root].maxGrade, m.chosenGrade);
          if (Array.isArray(m.functions)) m.functions.forEach(f => map[root].functions.add(f));
        });
      }
      // Convert sets to arrays for serialization safety
      Object.keys(map).forEach(k => { map[k].functions = Array.from(map[k].functions); });
      this.state.highlightedRoots = map;
    }

    toggleTrajectories(flag){ this.state.showTrajectories = !!flag; }
    setSizeScale(v){ this.state.sizeScale = Math.max(0.5, Math.min(2.0, v)); this.rebuildPlanets(); }
    setSpeedScale(v){ this.state.speedScale = Math.max(0.25, Math.min(2.0, v)); }
    setSizingMode(mode){ this.state.sizingMode = mode === 'equal' ? 'equal' : 'theory'; this.rebuildPlanets(); }

    rebuildPlanets(){
      const { notes } = this.state;
      const rect = this.canvas ? this.canvas.getBoundingClientRect() : { width: 800, height: 400 };
      const halfMin = Math.min(rect.width, rect.height) / 2;

      // Precompute sizes to establish safe margins
      const sizes = notes.map(n => this.computePlanetSize(this.classifyFunction(n)));
      const maxSize = sizes.length ? Math.max(...sizes) : 10;
      const labelMargin = 18; // room for text label above planet
      const edgePadding = 12; // keep a little gap from rounded corners

      const maxOrbit = Math.max(40, halfMin - (maxSize + labelMargin + edgePadding));
      const innerOrbit = Math.min(maxOrbit * 0.35, halfMin * 0.18); // keep sun clearance but never exceed max

      const n = Math.max(1, notes.length);

      this.state.planets = notes.map((note, i) => {
        const t = (i + 1) / (n + 1); // 0..1 spacing
        const orbitRadius = innerOrbit + t * (maxOrbit - innerOrbit);
        const func = this.classifyFunction(note);
        const size = sizes[i];
        const angularSpeed = this.computePlanetSpeed(func, i);
        return { note, orbitRadius, size, angle: (Math.PI * 2) * (i / Math.max(1, notes.length)), angularSpeed, satellites: this.computeSatellites(note) };
      });
    }

    computeSatellites(targetNote){
      const sat = [];
      const useInKey = typeof this.musicTheory.getNoteFromIntervalInKey === 'function';
      try {
        const vRoot = useInKey ? this.musicTheory.getNoteFromIntervalInKey(targetNote, 7, this.state.key) : this.musicTheory.getNoteFromInterval(targetNote, 7);
        if(vRoot) sat.push({ label: `V/${targetNote}`, display: `${vRoot}7`, type: 'secV', angle: 0 });
        const bII = useInKey ? this.musicTheory.getNoteFromIntervalInKey(targetNote, 1, this.state.key) : this.musicTheory.getNoteFromInterval(targetNote, 1);
        if(bII) sat.push({ label: `bII/${targetNote}`, display: `${bII}7`, type: 'tritoneSub', angle: Math.PI });
        const iiRoot = useInKey ? this.musicTheory.getNoteFromIntervalInKey(targetNote, 2, this.state.key) : this.musicTheory.getNoteFromInterval(targetNote, 2);
        if(iiRoot) sat.push({ label: `ii/${targetNote}`, display: `${iiRoot}m7`, type: 'secII', angle: Math.PI/2 });
        const viiRoot = useInKey ? this.musicTheory.getNoteFromIntervalInKey(targetNote, 11, this.state.key) : this.musicTheory.getNoteFromInterval(targetNote, 11);
        if(viiRoot) sat.push({ label: `vii°/${targetNote}`, display: `${viiRoot}m7b5`, type: 'leadingTone', angle: 3*Math.PI/2 });
        // Chromatic mediants around target
        const mediantIntervals = [3,4,8,9];
        mediantIntervals.forEach(iv => {
          try {
            const mRoot = this.musicTheory.getNoteFromInterval(targetNote, iv);
            if (mRoot) sat.push({ label: `CM(${iv})`, display: `${mRoot}`, type: 'chromMediant' });
          } catch(_){}
        });
        // Container chords for this target note (top 2-3)
        if (Array.isArray(this.state.notes) && this.state.notes.length && typeof this.musicTheory.findAllContainerChords === 'function'){
          try {
            const inScale = this.state.notes.slice();
            const results = this.musicTheory.findAllContainerChords([targetNote], inScale) || [];
            const top = results.slice(0, Math.min(3, results.length));
            top.forEach((r, idx) => sat.push({ label: `CC`, display: r.fullName || `${r.root}${r.chordType||''}` , type: 'containerChord', angle: (idx+1) * (Math.PI/3) }));
          } catch(_){}
        }
      } catch(e) {}
      return sat;
    }

    start(){ if(this.animId) return; const loop = () => { this.state.time += 1; this.draw(); this.animId = requestAnimationFrame(loop); }; this.animId = requestAnimationFrame(loop); this.isPlaying = true; this.syncPlayButton(); }
    stop(){ if(this.animId){ cancelAnimationFrame(this.animId); this.animId = null; } if (this._miniInterval) { clearInterval(this._miniInterval); this._miniInterval = null; } this.isPlaying = false; this.syncPlayButton(); }

    syncPlayButton(){
      const btn = this.container && this.container.querySelector && this.container.querySelector('#solar-play');
      if (btn){ btn.textContent = this.isPlaying ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', this.isPlaying ? 'true' : 'false'); }
    }

    handleResize(){ this.resizeCanvas(); this.makeStars(); this.rebuildPlanets(); }

    resizeCanvas(){
      if(!this.canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = this.container.getBoundingClientRect();
      // In condensed mode allow much smaller canvas sizes so it fits in tight sidebars
      const width = this.condensedMode ? Math.max(160, rect.width) : Math.max(300, rect.width);
      const height = this.condensedMode ? Math.max(120, Math.min(240, rect.height)) : Math.max(260, Math.min(820, rect.height));
      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    makeStars(){
      const rect = this.container.getBoundingClientRect();
      const count = Math.floor((rect.width * rect.height) / 8000);
      this.stars = Array.from({length: count}, () => ({ x: Math.random() * rect.width, y: Math.random() * rect.height, r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.35 + 0.15 }));
    }

    onClick(e){
      if(!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      let handled = false;
      for(let i=0;i<this.state.planets.length;i++){
        const p = this.state.planets[i];
        const px = cx + p.orbitRadius * Math.cos(p.angle - Math.PI/2);
        const py = cy + p.orbitRadius * Math.sin(p.angle - Math.PI/2);
        const dist2 = (x - px)*(x - px) + (y - py)*(y - py);
        const hitR = Math.max(10, p.size + 6);
        if(dist2 <= hitR*hitR){
          // Toggle expansion
          const note = p.note;
          const idx = this.state.expandedPlanets.indexOf(note);
          if (idx === -1) this.state.expandedPlanets.push(note); else this.state.expandedPlanets.splice(idx, 1);
          // Toggle path membership
          const pathIdx = this.state.activePath.indexOf(note);
          if (pathIdx === -1) this.state.activePath.push(note); else this.state.activePath.splice(pathIdx, 1);
          // Update palette
          this.updatePalette(note, p.satellites || []);
          handled = true;
          return;
        }
      }
      // If not clicking a planet, try satellites of expanded planets
      if (!handled && this.state.expandedPlanets.length){
        for (let n=0; n<this.state.expandedPlanets.length; n++){
          const note = this.state.expandedPlanets[n];
          const p = this.state.planets.find(pl => pl.note === note);
          if (!p) continue;
          const baseAng = p.angle - Math.PI/2;
          const px = cx + p.orbitRadius * Math.cos(baseAng);
          const py = cy + p.orbitRadius * Math.sin(baseAng);
          const satOrbit = Math.max(24, p.size + 20);
          for (let idx=0; idx<p.satellites.length; idx++){
            const s = p.satellites[idx];
            const ang = (s.angle || (idx * (Math.PI*2 / p.satellites.length))) + this.state.time*0.01;
            const sx = px + satOrbit * Math.cos(ang);
            const sy = py + satOrbit * Math.sin(ang);
            const d2 = (x - sx)*(x - sx) + (y - sy)*(y - sy);
            if (d2 <= 49){
              this.handleSatelliteSelect(note, s);
              handled = true;
              break;
            }
          }
          if (handled) break;
        }
      }
      // Click empty space: no change to expansions or path
    }

    draw(){
      const ctx = this.ctx; if(!ctx) return;
      const rect = this.canvas.getBoundingClientRect(); const w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      this.drawStars(ctx);
      const cx = w/2, cy = h/2; const sunR = Math.min(cx, cy) * 0.18; this.drawSun(ctx, cx, cy, sunR);
      this.drawPlanets(ctx, cx, cy, sunR);
      if (this.state.showTrajectories && this.state.activePath.length > 1) {
        this.drawPathTrajectories(ctx, cx, cy, this.state.activePath);
      }
      // this.drawHeader(ctx, w); // Header is now part of the HTML controls overlay
    }

    drawStars(ctx){ ctx.save(); this.stars.forEach(s => { const f = 0.6 + 0.4*Math.sin((this.state.time*0.02) + s.x*0.1 + s.y*0.1); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fillStyle = `rgba(255,255,255,${(s.a*f).toFixed(3)})`; ctx.fill(); }); ctx.restore(); }

    drawPathTrajectories(ctx, cx, cy, pathNotes){
      // Draw glowing arcs between consecutive notes in path
      for (let k=0; k<pathNotes.length-1; k++){
        const fromNote = pathNotes[k];
        const toNote = pathNotes[k+1];
        const fromP = this.state.planets.find(pl => pl.note === fromNote);
        const toP = this.state.planets.find(pl => pl.note === toNote);
        if (!fromP || !toP) continue;
        const px = cx + fromP.orbitRadius * Math.cos(fromP.angle - Math.PI/2);
        const py = cy + fromP.orbitRadius * Math.sin(fromP.angle - Math.PI/2);
        const dpx = cx + toP.orbitRadius * Math.cos(toP.angle - Math.PI/2);
        const dpy = cy + toP.orbitRadius * Math.sin(toP.angle - Math.PI/2);
        const mx = (px + dpx) / 2; const my = (py + dpy) / 2; const ctrlx = (mx + cx) / 2; const ctrly = (my + cy) / 2;
        ctx.save();
        // glow trail
        ctx.shadowColor = 'rgba(34,197,94,0.9)';
        ctx.shadowBlur = 12 + 6*Math.sin(this.state.time*0.05);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(ctrlx, ctrly, dpx, dpy);
        ctx.strokeStyle = 'rgba(34,197,94,0.8)'; ctx.lineWidth = 3; ctx.stroke();
        // arrowhead
        const ang = Math.atan2(dpy - ctrly, dpx - ctrlx); const ahx = dpx - Math.cos(ang) * 10; const ahy = dpy - Math.sin(ang) * 10;
        ctx.beginPath(); ctx.moveTo(dpx, dpy); ctx.lineTo(ahx - Math.cos(ang + Math.PI/2)*5, ahy - Math.sin(ang + Math.PI/2)*5); ctx.lineTo(ahx + Math.cos(ang + Math.PI/2)*5, ahy + Math.sin(ang + Math.PI/2)*5); ctx.closePath(); ctx.fillStyle = 'rgba(34,197,94,0.9)'; ctx.fill();
        ctx.restore();
      }
    }

    drawSun(ctx, cx, cy, r){
      const grad = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
      grad.addColorStop(0, '#ffd700'); grad.addColorStop(0.5, '#ff8c00'); grad.addColorStop(1, 'rgba(228,77,38,0.9)');
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 30; ctx.fill(); ctx.restore();
      ctx.save(); ctx.fillStyle = '#0b1220'; ctx.font = 'bold 18px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText(this.state.key, cx, cy+6); ctx.restore();
    }

    drawPlanets(ctx, cx, cy, sunR){
      const planets = this.state.planets;
      const anyExpanded = this.state.expandedPlanets && this.state.expandedPlanets.length > 0;
      planets.forEach((p, i) => {
        p.angle += p.angularSpeed * this.state.speedScale;
        const isExpanded = this.state.expandedPlanets.includes(p.note);
        const orbitAlpha = isExpanded ? 0.6 : (anyExpanded ? 0.15 : 0.25);
        const orbitWidth = isExpanded ? 2 : 1;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, p.orbitRadius, 0, Math.PI*2); ctx.strokeStyle = `rgba(100, 116, 139, ${orbitAlpha})`; ctx.lineWidth = orbitWidth; ctx.stroke(); ctx.restore();
        const px = cx + p.orbitRadius * Math.cos(p.angle - Math.PI/2); const py = cy + p.orbitRadius * Math.sin(p.angle - Math.PI/2);
        const color = this.colorForIndex(i);
        const dispSize = isExpanded ? Math.min(p.size * 1.6, p.size + 12) : p.size;
        const fillAlpha = isExpanded ? 1.0 : (anyExpanded ? 0.5 : 1.0);
        ctx.save(); ctx.beginPath(); ctx.arc(px, py, dispSize, 0, Math.PI*2); ctx.fillStyle = color; ctx.globalAlpha = fillAlpha; ctx.shadowColor = color; ctx.shadowBlur = isExpanded ? 14 : 8; ctx.fill(); ctx.restore();
        // Pulsing ring when expanded
        if (isExpanded){
          const pulse = 4 + 2 * Math.sin(this.state.time * 0.08);
          ctx.save(); ctx.beginPath(); ctx.arc(px, py, dispSize + pulse, 0, Math.PI*2); ctx.strokeStyle = 'rgba(59,130,246,0.6)'; ctx.lineWidth = 1.5; ctx.shadowColor = 'rgba(59,130,246,0.8)'; ctx.shadowBlur = 8; ctx.stroke(); ctx.restore();
        }
        // Highlight for generated input notes
        if (this.state.highlightedNotes.includes(p.note)) { ctx.save(); ctx.beginPath(); ctx.arc(px, py, p.size + 8, 0, Math.PI*2); ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)'; ctx.lineWidth = 3; ctx.shadowColor = 'rgba(250, 204, 21, 0.9)'; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore(); }
        // Unique highlight for chords chosen in progression (substitutions get magenta, perfect get green)
        const hMeta = this.state.highlightedRoots[p.note];
        if (hMeta){
          const isSub = !!hMeta.isSubstitution;
          const col = isSub ? 'rgba(236,72,153,0.8)' : 'rgba(16,185,129,0.85)';
          ctx.save(); ctx.beginPath(); ctx.arc(px, py, p.size + 12, 0, Math.PI*2); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.stroke(); ctx.restore();
        }
        ctx.save(); ctx.fillStyle = '#e5e7eb'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText(p.note, px, py - dispSize - 8); ctx.restore();
        if(isExpanded){ this.drawSatellites(ctx, px, py, { ...p, dispSize }); }
      });
    }

    drawSatellites(ctx, px, py, planet){
      const isExpanded = this.state.expandedPlanets.includes(planet.note);
      const baseOrbit = Math.max(24, (planet.dispSize || planet.size) + 20);
      const satOrbit = isExpanded ? baseOrbit + 14 : baseOrbit;
      ctx.save(); ctx.beginPath(); ctx.arc(px, py, satOrbit, 0, Math.PI*2); ctx.strokeStyle = 'rgba(16,185,129,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
      planet.satellites.forEach((s, idx) => {
        const angle = s.angle || (idx * (Math.PI*2 / planet.satellites.length));
        const sx = px + satOrbit * Math.cos(angle + this.state.time*0.01);
        const sy = py + satOrbit * Math.sin(angle + this.state.time*0.01);
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2);
        const satColors = { secV: '#10b981', tritoneSub: '#f59e0b', secII: '#22d3ee', leadingTone: '#a78bfa', chromMediant: '#f472b6', containerChord: '#60a5fa' };
        ctx.fillStyle = satColors[s.type] || '#f59e0b'; ctx.fill();
        ctx.fillStyle = '#e5e7eb'; ctx.font = '11px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText(s.display, sx, sy - 10);
      });
      ctx.restore();
    }

    drawHeader(ctx, w){ 
        // This function is deprecated. Header is now part of the HTML controls overlay.
    }

    colorForIndex(i){
      const func = this.state.planets[i] ? this.classifyFunction(this.state.planets[i].note) : 'other';
      const map = { tonic: '#93c5fd', predominant: '#6ee7b7', dominant: '#fca5a5', leading: '#ddd6fe', mediant: '#fde68a', other: '#5eead4' };
      return map[func] || '#5eead4';
    }

    classifyFunction(note){
      const key = this.state.key; const val = this.musicTheory.noteValues[note]; const keyVal = this.musicTheory.noteValues[key]; if (val === undefined || keyVal === undefined) return 'other';
      const dist = (val - keyVal + 12) % 12;
      switch(dist){ case 0: return 'tonic'; case 7: return 'dominant'; case 5: return 'predominant'; case 2: return 'predominant'; case 11: return 'leading'; case 9: return 'mediant'; case 4: return 'mediant'; default: return 'other'; }
    }

    computePlanetSize(func){ if (this.state.sizingMode === 'equal') return 9 * this.state.sizeScale; const base = { tonic: 12, dominant: 11, predominant: 10, mediant: 9, leading: 8, other: 9 }[func] || 9; return base * this.state.sizeScale; }
    computePlanetSpeed(func){ const base = { tonic: 0.003, dominant: 0.007, predominant: 0.005, mediant: 0.0045, leading: 0.008, other: 0.004 }[func] || 0.0045; return base; }

    injectControls(){
      if (!this.container) return;
      const controlsId = 'solar-controls';
  let controls = document.getElementById(controlsId);
  if (!controls){
        controls = document.createElement('div');
        controls.id = controlsId;
        // Create a dedicated host below the viewport if available
        const host = document.getElementById('sun-controls-host');
        // Use regular panel styling inside the host so it becomes a neat rectangle below the viewport
  controls.style.display = 'flex';
  controls.style.width = '100%';
        controls.style.alignItems = 'center';
        controls.style.gap = '10px';
        controls.style.flexWrap = 'wrap';
        controls.style.padding = '8px 12px';
        controls.style.background = 'transparent';
        controls.style.border = 'none';
        controls.style.borderRadius = '8px';
        
  const headerText = `Key: ${this.state.key} • Diatonic: ${this.state.notes.join(' ')}`;
        
        controls.innerHTML = `
          <div class="solar-host-header" id="solar-header-text">${headerText}</div>
          <div class="solar-controls-group" id="solar-controls">
            <button id="solar-play" class="btn">Play</button>
            <label style="font-size:12px;opacity:0.9;display:flex;align-items:center;gap:6px;" title="Show path lines between selected planets">
              <input type="checkbox" id="solar-traj"> Paths
            </label>
            <label style="font-size:12px;opacity:0.9;display:flex;align-items:center;gap:6px;">
              Size <input type="range" id="solar-size" min="0.5" max="2" step="0.1" value="1">
            </label>
            <label style="font-size:12px;opacity:0.9;display:flex;align-items:center;gap:6px;">
              Speed <input type="range" id="solar-speed" min="0.1" max="2" step="0.05" value="0.4">
            </label>
            <label style="font-size:12px;opacity:0.9;display:flex;align-items:center;gap:6px;">
              Sizing
              <select id="solar-sizing">
                <option value="theory" selected>Theory</option>
                <option value="equal">Equal</option>
              </select>
            </label>
            <div id="solar-palette" style="flex-basis:100%; padding:6px 0 0 0;"></div>
          </div>
          <div class="solar-controls-right">
            <button id="dock-solar-alt" class="btn btn-compact" title="Dock/Undock Solar">⇆</button>
            <button id="solar-collapse" class="btn btn-compact" title="Collapse controls">▾</button>
          </div>
        `;
          const preferredHost = this.container ? (this.container.closest('.sun-content') || this.container.closest('.planet-module')) : null;
          const hostToUse = preferredHost ? preferredHost.querySelector('.sun-controls-host') : document.querySelector('.sun-controls-host');
          if (hostToUse) {
            hostToUse.appendChild(controls);
          } else {
          // Fallback to previous behavior (insert before canvas)
          if (!this.container.style.position || this.container.style.position === 'static') {
            this.container.style.position = 'relative';
          }
          controls.style.position = 'absolute';
          controls.style.top = '8px';
          controls.style.left = '12px';
          controls.style.right = '12px';
          controls.style.background = 'rgba(15,23,42,0.55)';
          controls.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
          controls.style.border = '1px solid rgba(148,163,184,0.25)';
          controls.style.zIndex = '5';
          this.container.insertBefore(controls, this.canvas);
        }
      } else {
        // Update existing header text if controls are already there
        const headerEl = controls.querySelector('#solar-header-text');
        if (headerEl) {
            headerEl.textContent = `Key: ${this.state.key} • Diatonic: ${this.state.notes.join(' ')}`;
        }
        // If controls exist but are mounted elsewhere, move them into preferred host
        const preferredHost = this.container ? (this.container.closest('.sun-content') || this.container.closest('.planet-module')) : null;
        const hostToUse = preferredHost ? preferredHost.querySelector('.sun-controls-host') : document.querySelector('.sun-controls-host');
        if (hostToUse && controls.parentElement !== hostToUse) {
          hostToUse.appendChild(controls);
        }
      }
      const play = controls.querySelector('#solar-play');
      const traj = controls.querySelector('#solar-traj'); const size = controls.querySelector('#solar-size'); const speed = controls.querySelector('#solar-speed'); const sizing = controls.querySelector('#solar-sizing');
  if (play){ play.onclick = () => { this.isPlaying ? this.stop() : this.start(); }; this.syncPlayButton(); }
  if (traj){ traj.onchange = (e) => this.toggleTrajectories(e.target.checked); }
  if (size){ size.oninput = (e) => this.setSizeScale(parseFloat(e.target.value)); }
  if (speed){ speed.oninput = (e) => this.setSpeedScale(parseFloat(e.target.value)); }
  if (sizing){ sizing.onchange = (e) => this.setSizingMode(e.target.value); }

      // Collapse toggle - set attribute on host to hide controls
      const collapseBtn = controls.querySelector('#solar-collapse');
      if (collapseBtn) {
          collapseBtn.onclick = () => {
          const preferredHost = this.container ? (this.container.closest('.sun-content') || this.container.closest('.planet-module')) : null;
          const hostToUse = preferredHost ? preferredHost.querySelector('.sun-controls-host') : document.querySelector('.sun-controls-host');
          if (!hostToUse) return;
          const isCollapsed = hostToUse.getAttribute('data-collapsed') === 'true';
          hostToUse.setAttribute('data-collapsed', isCollapsed ? 'false' : 'true');
          // keep header updated accessibility
          collapseBtn.textContent = isCollapsed ? '▸' : '▾';
          try { localStorage.setItem('solar-controls-collapsed', hostToUse.getAttribute('data-collapsed')); } catch(_){}
        };
        // restore state from localStorage if present
        try {
          const saved = localStorage.getItem('solar-controls-collapsed');
          if (saved === 'true') {
            const preferredHost = this.container ? (this.container.closest('.sun-content') || this.container.closest('.planet-module')) : null;
            const hostToUse = preferredHost ? preferredHost.querySelector('.sun-controls-host') : document.querySelector('.sun-controls-host');
            if (hostToUse) hostToUse.setAttribute('data-collapsed', 'true');
          }
        } catch(_){}
      }
    }

    updatePalette(planetNote, satellites){
      const el = this.container && this.container.querySelector && this.container.querySelector('#solar-palette');
      if (!el) return;
      if (!satellites || !satellites.length){ el.innerHTML = '<span style="font-size:12px;opacity:0.75;">Click a planet to see its satellite chords.</span>'; return; }
      const buttons = satellites.map((s, i) => `<button class="btn" data-note="${planetNote}" data-idx="${i}" title="Send ${s.display} to Chord Finder">${s.display}</button>`).join(' ');
      el.innerHTML = `<div style="font-size:12px;opacity:0.9;margin-bottom:4px;">Satellites for <strong>${planetNote}</strong>:</div><div style="display:flex; flex-wrap:wrap; gap:6px;">${buttons}</div>`;
      el.querySelectorAll('button[data-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const note = btn.getAttribute('data-note');
          const p = this.state.planets.find(pl => pl.note === note);
          if (!p) return;
          const s = p.satellites[idx];
          if (s) this.handleSatelliteSelect(note, s);
        });
      });
    }

    handleSatelliteSelect(targetNote, satellite){
      // Try to route to Container Chord Tool if available
      const disp = String(satellite.display || '');
      const m = disp.match(/^([A-G](?:#|b)?)(.*)$/);
      let root = null, type = '';
      if (m){ root = m[1]; type = (m[2] || '').trim(); }
      if (window.modularApp && window.modularApp.containerChordTool && typeof window.modularApp.containerChordTool.selectChord === 'function' && root){
        let chordNotes = [];
        try { chordNotes = this.musicTheory.getChordNotes(root, type) || []; } catch(_) { chordNotes = []; }
        const chord = { fullName: root + type, root, chordType: type, chordNotes, scaleMatchPercent: 0, functions: [], resolutions: [], complexity: /7/.test(type) ? 'seventh' : 'triad' };
        try { window.modularApp.containerChordTool.selectChord(chord); } catch(_){}
      }
      // Locally highlight chosen root
      this.state.highlightedRoots = this.state.highlightedRoots || {};
      if (root){ this.state.highlightedRoots[root] = { count: 1, isSubstitution: satellite.type === 'tritoneSub', maxGrade: 0, functions: [satellite.type || 'satellite'] }; }
      this.draw();
    }

    injectTooltip(){
      if (!this.container) return;
      if (!this.tooltip){
        const tip = document.createElement('div');
        tip.style.position = 'absolute'; tip.style.pointerEvents = 'none'; tip.style.background = 'rgba(2,6,23,0.9)'; tip.style.color = '#e5e7eb';
        tip.style.padding = '6px 8px'; tip.style.borderRadius = '6px'; tip.style.fontSize = '12px'; tip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'; tip.style.opacity = '0'; tip.style.transition = 'opacity 120ms ease';
        if (!this.container.style.position) this.container.style.position = 'relative';
        this.container.appendChild(tip); this.tooltip = tip;
      }
    }

    onMouseMove(e){
      if (!this.canvas || !this.tooltip) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      const cx = rect.width / 2; const cy = rect.height / 2;
      let content = '';
      for (let i=0;i<this.state.planets.length;i++){
        const p = this.state.planets[i];
        const px = cx + p.orbitRadius * Math.cos(p.angle - Math.PI/2);
        const py = cy + p.orbitRadius * Math.sin(p.angle - Math.PI/2);
        const hitR = Math.max(10, p.size + 6);
        const dist2 = (x - px)*(x - px) + (y - py)*(y - py);
        if (dist2 <= hitR*hitR){
          const func = this.classifyFunction(p.note);
          const funcLabel = { tonic: 'Tonic', dominant: 'Dominant', predominant: 'Predominant', leading: 'Leading-tone', mediant: 'Tonic Prolongation', other: 'Functional' }[func] || 'Functional';
          content = `${p.note} — ${funcLabel}`; break;
          // Reflect current host collapsed state in button
          const preferredHost2 = this.container ? (this.container.closest('.sun-content') || this.container.closest('.planet-module')) : null;
          const host2 = preferredHost2 ? preferredHost2.querySelector('.sun-controls-host') : document.querySelector('.sun-controls-host');
          if (host2) collapseBtn.textContent = host2.getAttribute('data-collapsed') === 'true' ? '▸' : '▾';
        }
      }
      if (!content && this.state.expandedPlanets.length){
        // Check satellites for all expanded planets
        for (let n=0; n<this.state.expandedPlanets.length; n++){
          const note = this.state.expandedPlanets[n];
          const p = this.state.planets.find(pl => pl.note === note);
          if (!p) continue;
          const satOrbit = Math.max(24, p.size + 20);
          const baseAng = p.angle - Math.PI/2;
          const px = cx + p.orbitRadius * Math.cos(baseAng); const py = cy + p.orbitRadius * Math.sin(baseAng);
          for (let idx=0; idx<p.satellites.length; idx++){
            const s = p.satellites[idx];
            const ang = (s.angle || (idx * (Math.PI*2 / p.satellites.length))) + this.state.time*0.01;
            const sx = px + satOrbit * Math.cos(ang);
            const sy = py + satOrbit * Math.sin(ang);
            const d2 = (x - sx)*(x - sx) + (y - sy)*(y - sy);
            if (d2 <= 49){
              const typeLabel = { secV: 'Secondary Dominant', tritoneSub: 'Tritone Substitution', secII: 'Secondary ii', leadingTone: 'Leading-tone', chromMediant: 'Chromatic Mediant', containerChord: 'Container Chord' }[s.type] || 'Function';
              content = `${s.display} — ${typeLabel}`; break;
            }
          }
          if (content) break;
        }
      }
      if (content){ this.tooltip.textContent = content; this.tooltip.style.left = `${x + 14}px`; this.tooltip.style.top = `${y + 14}px`; this.tooltip.style.opacity = '1'; }
      else { this.tooltip.style.opacity = '0'; }
    }

    onMouseLeave(){ if (this.tooltip){ this.tooltip.style.opacity = '0'; } }
  }

  if(typeof module !== 'undefined' && module.exports){ module.exports = SolarSystemVisualizer; }
  if(typeof window !== 'undefined'){ window.SolarSystemVisualizer = SolarSystemVisualizer; }
})(this);
