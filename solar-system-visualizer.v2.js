/**
 * @module SolarSystemVisualizerV2
 * @description The scale as a solar system: the tonic is the sun, each note a planet on its own ring,
 *              numbered by scale degree, further out the higher the degree. Each planet's moons are the
 *              chords that lead to it, each on its own ring and numbered from that planet (its "5 of").
 * @exports class SolarSystemVisualizer
 * @feature The rings are spaced to fill whatever box the look gives them, however many notes the scale has
 * @feature Click a planet and the camera moves in to its moons, so they stay readable in the smallest slot
 * @feature Notes, numbers or both on every planet and moon
 * @feature Path lines between selected planets
 */

(function(global){
  const LABEL_MODES = [['notes', 'Notes', 'Show note names'], ['numbers', '1 2 3', 'Show numbers'], ['both', 'Both', 'Numbers on the planets, notes beside them']];
  const FUNC_COLORS = { tonic: '#93c5fd', predominant: '#6ee7b7', dominant: '#fca5a5', leading: '#ddd6fe', mediant: '#fde68a', other: '#5eead4' };
  const FUNC_SIZES = { tonic: 1.18, dominant: 1.08, predominant: 1, mediant: 0.95, leading: 0.9, other: 0.95 };
  const FUNC_LABELS = { tonic: 'Tonic', dominant: 'Dominant', predominant: 'Predominant', leading: 'Leading-tone', mediant: 'Tonic prolongation', other: 'Colour' };
  const MOON_COLORS = { secV: '#34d399', tritoneSub: '#fbbf24', secII: '#22d3ee', leadingTone: '#a78bfa', chromMediant: '#f472b6', containerChord: '#60a5fa' };
  const MOON_TAGS = { secV: 'five-of', tritoneSub: 'tritone sub', secII: 'two-of', leadingTone: 'seven-of', chromMediant: 'chromatic mediant', containerChord: 'holds this note' };
  const MOON_ROLES = {
    secV: 'the five-of, leads straight in', tritoneSub: 'the tritone sub, slides in from a half step above', secII: 'the two-of, sets up the five-of',
    leadingTone: 'the seven-of, a half step under', chromMediant: 'a chromatic mediant, a third away', containerChord: 'a chord in this scale holding this note'
  };
  // Inner ring to outer, by distance above the planet, each moon named by its number from that planet.
  const MOONS = [
    { semis: 1, degree: 2, number: '♭2', label: 'bII', suffix: '7', type: 'tritoneSub' },
    { semis: 2, degree: 2, number: '2', label: 'ii', suffix: 'm7', type: 'secII' },
    { semis: 3, degree: 3, number: '♭3', label: 'CM', suffix: '', type: 'chromMediant' },
    { semis: 4, degree: 3, number: '3', label: 'CM', suffix: '', type: 'chromMediant' },
    { semis: 7, degree: 5, number: '5', label: 'V', suffix: '7', type: 'secV' },
    { semis: 8, degree: 6, number: '♭6', label: 'CM', suffix: '', type: 'chromMediant' },
    { semis: 9, degree: 6, number: '6', label: 'CM', suffix: '', type: 'chromMediant' },
    { semis: 11, degree: 7, number: '7', label: 'vii°', suffix: 'm7b5', type: 'leadingTone' }
  ];
  const INTERVAL_NUMBERS = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
  const LETTERS = 'CDEFGAB';
  const NATURALS = [0, 2, 4, 5, 7, 9, 11];
  const MIN_FLATTEN = 0.52;      // how far a wide box may tilt the rings into ellipses
  const MIN_MOON_LANE = 9;       // screen px per ring a moon needs, zoomed in, to keep its number legible
  const CORE_MOONS = MOONS.length;
  const CAMERA_MS = 700;
  const WIDE_PANEL_W = 600;      // a box this wide puts the moon list beside the map instead of under it
  const LABEL_KEY = 'solar-label-mode';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  // C#m7b5 -> C♯m7♭5. The first letter is a note name, and any later b or # an accidental.
  const pretty = s => { s = String(s || ''); return s.charAt(0) + s.slice(1).replace(/b/g, '♭').replace(/#/g, '♯'); };
  const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

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
        focusPlanet: null,
        activePath: [],
        highlightedNotes: [],
        highlightedRoots: {},
        showTrajectories: false,
        sizeScale: 1.0,
        speedScale: 0.4,
        sizingMode: 'theory',
        labelMode: this.loadLabelMode()
      };
      this.isPlaying = false;
      this.resumeOnMount = false;
      this.stars = [];
      this.geo = null;
      this.cam = { x: 0, y: 0, z: 1, vx: 0, vy: 0 };
      this.camAnim = null;
      this.insets = { right: 0, bottom: 0 };
      this.theme = { text: '#e5e7eb', muted: '#94a3b8', accent: '#60a5fa', font: 'Segoe UI, Arial, sans-serif' };
      this.holdMotion = false;
      this.hotMoon = null;
      this.selectedMoon = null;
      this.lastFrame = 0;
      this.frame = this.frame.bind(this);
      this.handleResize = this.handleResize.bind(this);
      this.readTheme = this.readTheme.bind(this);
      this.onClick = this.onClick.bind(this);
      this.onMouseMove = this.onMouseMove.bind(this);
      this.onMouseLeave = this.onMouseLeave.bind(this);
      this.resizeObserver = null;
      this.themeObserver = null;
      this.tooltip = null;
      this.moonPanel = null;
      this.controls = null;
    }

    loadLabelMode(){
      try {
        const saved = localStorage.getItem(LABEL_KEY);
        if (LABEL_MODES.some(m => m[0] === saved)) return saved;
      } catch(_){}
      return 'both';
    }

    mount(container){
      if(typeof container === 'string') container = document.querySelector(container);
      if(!container) return;
      this.container = container;
      this.container.innerHTML = '';
      this.container.classList.add('solar-root');
      this.injectStyles();
      this.injectControls();

      const canvas = document.createElement('canvas');
      canvas.setAttribute('role', 'img');
      this.container.appendChild(canvas);
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      this.injectMoonPanel();
      this.injectTooltip();
      this.syncControls();
      this.readTheme();

      window.addEventListener('resize', this.handleResize);
      this.canvas.addEventListener('click', this.onClick);
      this.canvas.addEventListener('mousemove', this.onMouseMove);
      this.canvas.addEventListener('mouseleave', this.onMouseLeave);
      // The canvas, not the slot: the module's bar and a look's zone decide what the drawing actually gets.
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(this.canvas);
      }
      if (window.MutationObserver) {
        this.themeObserver = new MutationObserver(this.readTheme);
        this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-look'] });
      }

      this.handleResize();
      if (this.resumeOnMount) { this.resumeOnMount = false; this.start(); }
    }

    unmount(){
      window.removeEventListener('resize', this.handleResize);
      if(this.canvas){
        this.canvas.removeEventListener('click', this.onClick);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
      }
      if (this.resizeObserver) { this.resizeObserver.disconnect(); this.resizeObserver = null; }
      if (this.themeObserver) { this.themeObserver.disconnect(); this.themeObserver = null; }
      this.resumeOnMount = this.isPlaying;
      this.stop();
      if(this.container){ this.container.innerHTML = ''; this.container.classList.remove('solar-root', 'solar-wide', 'solar-narrow', 'viz-narrow'); }
      this.canvas = null; this.ctx = null; this.tooltip = null; this.moonPanel = null; this.controls = null; this.geo = null; this.canvasSize = null;
    }

    updateSystem({ key, scale = this.state.scale, notes }){
      if(key) this.state.key = key;
      if(scale) this.state.scale = scale;
      if(Array.isArray(notes)) this.state.notes = notes.slice();
      this.rebuildPlanets();
      this.syncControls();
    }

    setGeneratedNumbers(numbers, scaleNotes){
      const highlighted = numbers.map(n => typeof n === 'number' ? scaleNotes[(n - 1) % scaleNotes.length] : n);
      this.state.highlightedNotes = highlighted;
      this.requestDraw();
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
      this.requestDraw();
    }

    toggleTrajectories(flag){ this.state.showTrajectories = !!flag; this.requestDraw(); }
    setSizeScale(v){ this.state.sizeScale = clamp(v, 0.5, 2.0); this.fit(true); this.requestDraw(); }
    setSpeedScale(v){ this.state.speedScale = clamp(v, 0.1, 2.0); }
    setSizingMode(mode){ this.state.sizingMode = mode === 'equal' ? 'equal' : 'theory'; this.fit(true); this.requestDraw(); }
    setLabelMode(mode){
      if (!LABEL_MODES.some(m => m[0] === mode)) return;
      this.state.labelMode = mode;
      try { localStorage.setItem(LABEL_KEY, mode); } catch(_){}
      this.syncControls();
      this.requestDraw();
    }

    /**
     * Where every ring goes in a W x H box: one ring per note, from just clear
     * of the sun out to the box's edge, evenly spaced however many notes there
     * are. A wide box flattens the rings into ellipses rather than leave its
     * sides empty; a tall one keeps them round and centres them.
     */
    computeLayout(W, H, n){
      const count = Math.max(1, n);
      const minSide = Math.min(W, H);
      const disc = clamp(minSide * 0.21 / (count + 1.2), 7, 20);
      const pad = disc * 1.25 + 6;
      let rx = Math.max(10, W / 2 - pad);
      let ry = Math.max(10, H / 2 - pad);
      if (ry > rx) ry = rx;
      let flatten = ry / rx;
      if (flatten < MIN_FLATTEN) { flatten = MIN_FLATTEN; rx = ry / flatten; }
      const sunR = clamp(ry * (0.2 - 0.006 * count), 10, 46);
      const inner = (sunR + disc * 1.25 + 3) / flatten;
      const step = Math.max(1.5, count > 1 ? (rx - inner) / (count - 1) : 0);
      const radii = [];
      for (let i = 0; i < count; i++) radii.push(count > 1 ? inner + step * i : (inner + rx) / 2);
      return { W, H, flatten, sunR, inner, step, disc, radii, outer: radii[count - 1], moonR: rx * 0.34 };
    }

    rebuildPlanets(){
      const { notes } = this.state;
      const previous = this.state.planets;
      this.state.planets = notes.map((note, i) => {
        const was = previous[i];
        const func = this.classifyFunction(note);
        const expanded = this.state.expandedPlanets.indexOf(note) !== -1;
        return {
          note, func,
          number: i + 1,
          angle: was ? was.angle : (Math.PI * 2) * (i / Math.max(1, notes.length)),
          orbitRadius: was ? was.orbitRadius : 0,
          // a new note rises out of the sun; a kept one eases to its new ring
          radius: was ? was.radius : 0,
          size: was ? was.size : 8,
          angularSpeed: 0,
          open: expanded ? 1 : 0,
          satellites: this.computeSatellites(note),
          moons: []
        };
      });
      const present = note => notes.indexOf(note) !== -1;
      this.state.expandedPlanets = this.state.expandedPlanets.filter(present);
      this.state.activePath = this.state.activePath.filter(present);
      if (this.state.focusPlanet && !present(this.state.focusPlanet)) this.setFocus(null);
      else this.renderMoonPanel();
      this.fit(!previous.length);
      this.requestDraw();
    }

    /** Puts the planets on the rings of the current box. `snap` skips the easing (a resize is not a change of scale). */
    fit(snap){
      if (!this.canvasSize) return;
      const { w, h } = this.canvasSize;
      const planets = this.state.planets;
      const geo = this.computeLayout(w, h, planets.length);
      this.geo = geo;
      planets.forEach((p, i) => {
        p.orbitRadius = geo.radii[i];
        if (snap) p.radius = p.orbitRadius;
        const shape = this.state.sizingMode === 'equal' ? 1 : (FUNC_SIZES[p.func] || 1);
        p.size = geo.disc * shape * this.state.sizeScale;
        // Further out, slower, as real orbits are.
        p.angularSpeed = 0.014 * Math.pow(geo.inner / p.orbitRadius, 1.2);
        this.fitMoons(p);
      });
    }

    /**
     * Each moon gets its own ring around its planet. The eight numbered moons
     * always show; the chords holding the note take outer rings only if the
     * box leaves room for them when zoomed in. The list beside the map has them all.
     */
    fitMoons(p){
      const geo = this.geo;
      // clear of the planet's disc and its selection ring, top and bottom too
      const first = p.size * 1.9 / geo.flatten;
      const zoom = this.focusZoom();
      const room = Math.max(0, (geo.moonR - first) * zoom * geo.flatten);
      const fits = Math.floor(room / MIN_MOON_LANE) + 1;
      p.moons = p.satellites.slice(0, Math.max(CORE_MOONS, fits));
      const lane = p.moons.length > 1 ? (geo.moonR - first) / (p.moons.length - 1) : 0;
      p.moonLane = lane;
      p.moons.forEach((s, i) => {
        s.orbit = first + lane * i;
        s.speed = 0.02 * Math.pow(first / s.orbit, 1.1);
      });
    }

    /** How far the camera moves in on a planet so its outermost moon ring just fits the view. */
    focusZoom(){
      const geo = this.geo;
      const viewW = geo.W - this.insets.right, viewH = geo.H - this.insets.bottom;
      const pad = 18;
      const fit = Math.min(viewW / 2 - pad, (viewH / 2 - pad) / geo.flatten);
      return Math.max(1.3, fit / geo.moonR);
    }

    spellMoonRoot(note, degree, semis){
      const value = this.musicTheory.noteValues[note];
      const letter = LETTERS.indexOf(note.charAt(0));
      if (value !== undefined && letter !== -1){
        const target = (letter + degree - 1) % 7;
        const off = ((value + semis - NATURALS[target]) % 12 + 18) % 12 - 6;
        if (Math.abs(off) <= 1){
          const spelled = LETTERS[target] + (off > 0 ? '#' : off < 0 ? 'b' : '');
          if (this.musicTheory.noteValues[spelled] !== undefined) return spelled;
        }
      }
      // E.g. the ♭2 of Gb would be a double flat: leave that to the engine.
      return this.musicTheory.getNoteFromInterval(note, semis);
    }

    computeSatellites(targetNote){
      const sat = [];
      try {
        MOONS.forEach((m, i) => {
          const root = this.spellMoonRoot(targetNote, m.degree, m.semis);
          if (root) sat.push({
            label: m.label === 'CM' ? 'CM' : `${m.label}/${targetNote}`,
            number: m.number, root, display: `${root}${m.suffix}`, type: m.type,
            angle: i * 2.399963  // the golden angle: no two neighbouring rings start lined up
          });
        });
        // Chords in this scale that hold the note, on the outer rings
        if (this.state.notes.length && typeof this.musicTheory.findAllContainerChords === 'function'){
          const results = this.musicTheory.findAllContainerChords([targetNote], this.state.notes.slice()) || [];
          const inScale = results.filter(r => r.scaleMatchPercent === 100);
          const values = this.musicTheory.noteValues;
          (inScale.length ? inScale : results).slice(0, 3).forEach((r, idx) => {
            const semis = (values[r.root] - values[targetNote] + 12) % 12;
            sat.push({
              label: 'CC', number: INTERVAL_NUMBERS[semis] || '', root: r.root,
              display: r.fullName || `${r.root}${r.chordType || ''}`, type: 'containerChord',
              angle: (CORE_MOONS + idx) * 2.399963
            });
          });
        }
      } catch(e) {}
      return sat;
    }

    start(){ this.isPlaying = true; this.syncPlayButton(); this.requestDraw(); }
    stop(){ this.isPlaying = false; if(this.animId){ cancelAnimationFrame(this.animId); this.animId = null; } this.syncPlayButton(); this.requestDraw(); }

    syncPlayButton(){
      const btn = this.controls && this.controls.querySelector('#solar-play');
      if (btn){
        btn.textContent = this.isPlaying ? '❚❚' : '▶';
        btn.title = this.isPlaying ? 'Pause the orbits' : 'Play the orbits';
        btn.setAttribute('aria-pressed', this.isPlaying ? 'true' : 'false');
      }
    }

    /** One frame soon, whether or not the system is playing. Repeats while playing or while something is still moving. */
    requestDraw(){
      if (this.animId || !this.ctx || typeof requestAnimationFrame === 'undefined') return;
      this.lastFrame = 0;
      this.animId = requestAnimationFrame(this.frame);
    }

    frame(now){
      this.animId = null;
      if (!this.ctx) return;
      // A tab or fly-out that is shut has no box to draw in.
      if (this.geo && this.canvas.getClientRects().length){
        const dt = this.lastFrame ? clamp((now - this.lastFrame) / 16.67, 0, 3) : 1;
        this.lastFrame = now;
        this.step(dt);
        this.updateCamera(now);
        this.draw();
      }
      if (this.isPlaying || this.isSettling()) this.animId = requestAnimationFrame(this.frame);
    }

    isSettling(){
      if (this.camAnim) return true;
      return this.state.planets.some(p => {
        const wants = this.state.expandedPlanets.indexOf(p.note) !== -1 ? 1 : 0;
        return Math.abs(p.radius - p.orbitRadius) > 0.1 || Math.abs(p.open - wants) > 0.01;
      });
    }

    step(dt){
      const ease = 1 - Math.pow(0.88, dt);
      const moving = this.isPlaying && !this.holdMotion;
      if (moving) this.state.time += dt;
      this.state.planets.forEach(p => {
        p.radius = Math.abs(p.radius - p.orbitRadius) > 0.1 ? lerp(p.radius, p.orbitRadius, ease) : p.orbitRadius;
        const wants = this.state.expandedPlanets.indexOf(p.note) !== -1 ? 1 : 0;
        p.open = Math.abs(p.open - wants) > 0.01 ? lerp(p.open, wants, ease) : wants;
        if (!moving) return;
        p.angle += p.angularSpeed * this.state.speedScale * dt;
        if (p.open > 0) p.moons.forEach(s => { s.angle += s.speed * this.state.speedScale * dt; });
      });
    }

    /* ---------- camera ------------------------------------------------- */
    cameraTarget(){
      const geo = this.geo;
      const p = this.state.focusPlanet && this.state.planets.find(pl => pl.note === this.state.focusPlanet);
      if (!p) return { x: 0, y: 0, z: 1, vx: geo.W / 2, vy: geo.H / 2 };
      const w = this.planetWorld(p);
      return { x: w.x, y: w.y, z: this.focusZoom(), vx: (geo.W - this.insets.right) / 2, vy: (geo.H - this.insets.bottom) / 2 };
    }

    updateCamera(now){
      const target = this.cameraTarget();
      if (!this.camAnim){ this.cam = target; return; }
      const start = this.camAnim.start != null ? this.camAnim.start : (this.camAnim.start = now);
      const t = clamp((now - start) / CAMERA_MS, 0, 1);
      const e = easeInOut(t);
      const from = this.camAnim.from;
      this.cam = {
        x: lerp(from.x, target.x, e), y: lerp(from.y, target.y, e),
        // scale evenly, as a move in or out looks steady only on a ratio
        z: from.z * Math.pow(target.z / from.z, e),
        vx: lerp(from.vx, target.vx, e), vy: lerp(from.vy, target.vy, e)
      };
      if (t >= 1) this.camAnim = null;
    }

    setFocus(note){
      this.state.focusPlanet = note;
      this.hotMoon = null;
      this.renderMoonPanel();
      if (this.geo){
        this.camAnim = { from: Object.assign({}, this.cam), start: null };
        this.requestDraw();
      }
      this.syncControls();
    }

    planetWorld(p){
      const a = p.angle - Math.PI / 2;
      return { x: p.radius * Math.cos(a), y: p.radius * this.geo.flatten * Math.sin(a) };
    }

    toScreen(wx, wy){
      const c = this.cam;
      return { x: c.vx + (wx - c.x) * c.z, y: c.vy + (wy - c.y) * c.z };
    }

    moonScreen(p, s, world){
      const a = s.angle;
      const orbit = s.orbit * (0.35 + 0.65 * p.open);
      return this.toScreen(world.x + orbit * Math.cos(a), world.y + orbit * this.geo.flatten * Math.sin(a));
    }

    moonDisc(p){
      const laneOnScreen = p.moonLane * this.cam.z * this.geo.flatten;
      const close = clamp((this.cam.z - 1) / 0.8, 0, 1);
      return clamp(laneOnScreen * 0.46, p.note === this.state.focusPlanet ? lerp(2.4, 6.5, close) : 2.4, 16) * p.open;
    }

    /** On screen, only the focused planet grows with the camera; its neighbours stay small so they don't crowd its moons. */
    planetDisc(p){
      const z = this.cam.z;
      return p.size * (!this.state.focusPlanet || p.note === this.state.focusPlanet ? z : Math.min(z, 1.25));
    }

    sunDisc(){ return this.geo.sunR * Math.pow(this.cam.z, 0.55); }

    /** Where a planet is on the page right now, for whatever needs to point at it. */
    planetPoint(note){
      const p = this.state.planets.find(pl => pl.note === note);
      if (!p || !this.geo || !this.canvas) return null;
      const r = this.canvas.getBoundingClientRect();
      const w = this.planetWorld(p);
      const s = this.toScreen(w.x, w.y);
      return { x: r.left + s.x, y: r.top + s.y, size: this.planetDisc(p) };
    }

    /* ---------- sizing ------------------------------------------------- */
    handleResize(){
      if (!this.canvas) return;
      if (!this.resizeCanvas()) return;
      this.syncWide();
      this.fit(true);
      if (!this.camAnim) this.cam = this.cameraTarget();
      this.draw();
      this.requestDraw();
    }

    resizeCanvas(){
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const dpr = window.devicePixelRatio || 1;
      const bw = Math.round(rect.width * dpr), bh = Math.round(rect.height * dpr);
      if (this.canvas.width !== bw || this.canvas.height !== bh){
        this.canvas.width = bw;
        this.canvas.height = bh;
      }
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const was = this.canvasSize;
      this.canvasSize = { w: rect.width, h: rect.height };
      if (!was || Math.abs(was.w - rect.width) > 40 || Math.abs(was.h - rect.height) > 40) this.makeStars();
      return true;
    }

    makeStars(){
      const { w, h } = this.canvasSize;
      const count = Math.floor((w * h) / 6000);
      this.stars = Array.from({length: count}, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.1 + 0.3, a: Math.random() * 0.4 + 0.12, depth: Math.random() * 0.05 + 0.01 }));
    }

    readTheme(){
      if (typeof getComputedStyle === 'undefined' || !document.body) return;
      const cs = getComputedStyle(document.body);
      const v = (name, fallback) => (cs.getPropertyValue(name) || '').trim() || fallback;
      this.theme = {
        text: v('--text-main', '#e5e7eb'),
        muted: v('--text-muted', '#94a3b8'),
        accent: v('--accent-primary', '#60a5fa'),
        font: v('--font-ui', 'Segoe UI, Arial, sans-serif')
      };
      this.requestDraw();
    }

    /* ---------- hit testing -------------------------------------------- */
    /** The body whose centre is nearest the point, among those the point is on: moons and planets overlap as they orbit. */
    hitTest(x, y){
      if (!this.geo) return null;
      let best = null, bestDist = Infinity;
      const consider = (pt, reach, hit) => {
        const dist = Math.hypot(x - pt.x, y - pt.y);
        if (dist <= reach && dist < bestDist){ best = hit; bestDist = dist; }
      };
      this.state.planets.forEach(p => {
        const world = this.planetWorld(p);
        consider(this.toScreen(world.x, world.y), Math.max(11, this.planetDisc(p) + 3), { planet: p });
        if (p.open < 0.5) return;
        const reach = Math.max(this.moonDisc(p) + 2, 7);
        p.moons.forEach(s => consider(this.moonScreen(p, s, world), reach, { planet: p, moon: s }));
      });
      if (best) return best;
      const sun = this.toScreen(0, 0);
      return Math.hypot(x - sun.x, y - sun.y) <= this.sunDisc() ? { sun: true } : null;
    }

    /** Back to front: the focused planet and its moons sit on top of everything. */
    orderedPlanets(){
      const focus = this.state.focusPlanet;
      return this.state.planets.slice().sort((a, b) => (a.note === focus) - (b.note === focus) || a.open - b.open);
    }

    onClick(e){
      if (!this.canvas || !this.geo) return;
      if (this.moreMenu) this.moreMenu.open = false;
      const rect = this.canvas.getBoundingClientRect();
      const hit = this.hitTest(e.clientX - rect.left, e.clientY - rect.top);
      if (hit && hit.moon){ this.handleSatelliteSelect(hit.planet.note, hit.moon); return; }
      if (hit && hit.planet){
        const note = hit.planet.note;
        const expanded = this.state.expandedPlanets.indexOf(note) !== -1;
        if (!expanded){
          this.state.expandedPlanets.push(note);
          this.state.activePath.push(note);
          this.setFocus(note);
        } else if (this.state.focusPlanet !== note){
          this.setFocus(note);
        } else {
          this.state.expandedPlanets = this.state.expandedPlanets.filter(n => n !== note);
          this.state.activePath = this.state.activePath.filter(n => n !== note);
          this.setFocus(null);
        }
        return;
      }
      // The sun or empty space: back out to the whole system; what is open stays open.
      if (this.state.focusPlanet) this.setFocus(null);
    }

    onMouseMove(e){
      if (!this.canvas || !this.tooltip) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left; const y = e.clientY - rect.top;
      const hit = this.hitTest(x, y);
      const content = hit ? this.describe(hit) : '';
      this.canvas.style.cursor = hit ? 'pointer' : '';
      // Hold still under the pointer, so a moon can be read and clicked.
      this.holdMotion = !!(hit && (hit.planet || hit.moon));
      if (content){
        const slot = this.container.getBoundingClientRect();
        this.tooltip.textContent = content;
        this.tooltip.style.opacity = '1';
        const left = Math.min(e.clientX - slot.left + 14, slot.width - this.tooltip.offsetWidth - 6);
        const top = e.clientY - slot.top + 14;
        this.tooltip.style.left = `${Math.max(4, left)}px`;
        this.tooltip.style.top = `${top + this.tooltip.offsetHeight > slot.height ? e.clientY - slot.top - this.tooltip.offsetHeight - 10 : top}px`;
      } else {
        this.tooltip.style.opacity = '0';
      }
    }

    onMouseLeave(){ this.holdMotion = false; if (this.tooltip){ this.tooltip.style.opacity = '0'; } }

    describe(hit){
      if (hit.sun) return `${pretty(this.state.key)} ${String(this.state.scale).replace(/_/g, ' ')}: the home every ring circles`;
      const p = hit.planet;
      if (!hit.moon) return `${p.number} · ${pretty(p.note)}: ${FUNC_LABELS[p.func] || 'Colour'}${this.state.expandedPlanets.indexOf(p.note) === -1 ? ' (click for its moons)' : ''}`;
      return this.describeMoon(p, hit.moon);
    }

    describeMoon(p, s){
      const home = this.homeNumber(s.root);
      return `${s.number} of ${p.number} · ${pretty(s.display)}: ${MOON_ROLES[s.type] || ''}${home ? ` (${pretty(s.root)} is ${home} in ${pretty(this.state.key)})` : ''}`;
    }

    /** The moon's root as a number in the home scale, when it is one of the scale's notes. */
    homeNumber(root){
      const values = this.musicTheory.noteValues;
      const i = this.state.notes.findIndex(n => values[n] === values[root]);
      return i === -1 ? null : i + 1;
    }

    /* ---------- drawing ------------------------------------------------ */
    draw(){
      const ctx = this.ctx; if(!ctx || !this.geo) return;
      const { W, H } = this.geo;
      ctx.clearRect(0, 0, W, H);
      this.drawStars(ctx);
      this.drawRings(ctx);
      this.drawSun(ctx);
      const ordered = this.orderedPlanets();
      ordered.forEach(p => { if (p.note !== this.state.focusPlanet) this.drawPlanetSystem(ctx, p); });
      if (this.state.showTrajectories && this.state.activePath.length > 1) this.drawPathTrajectories(ctx);
      const focus = ordered.find(p => p.note === this.state.focusPlanet);
      if (focus) this.drawPlanetSystem(ctx, focus);
    }

    drawStars(ctx){
      const { W, H } = this.geo;
      const c = this.cam;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      this.stars.forEach(s => {
        const f = 0.6 + 0.4 * Math.sin((this.state.time * 0.02) + s.x * 0.1 + s.y * 0.1);
        const x = ((s.x - c.x * c.z * s.depth) % W + W) % W;
        const y = ((s.y - c.y * c.z * s.depth) % H + H) % H;
        ctx.globalAlpha = s.a * f;
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    drawRings(ctx){
      const sun = this.toScreen(0, 0);
      const z = this.cam.z, f = this.geo.flatten;
      const focus = this.state.focusPlanet;
      ctx.save();
      this.state.planets.forEach(p => {
        const isFocus = p.note === focus;
        const rx = Math.max(0.1, p.radius * z);
        ctx.beginPath();
        ctx.ellipse(sun.x, sun.y, rx, rx * f, 0, 0, Math.PI * 2);
        ctx.strokeStyle = isFocus ? this.theme.accent : this.theme.muted;
        ctx.globalAlpha = isFocus ? 0.55 : (focus ? 0.12 : 0.3);
        ctx.lineWidth = isFocus ? 1.4 : 1;
        ctx.stroke();
        // A fading wake behind each planet, so the direction of travel is visible.
        const a = p.angle - Math.PI / 2, span = 0.5, parts = 7;
        ctx.strokeStyle = FUNC_COLORS[p.func] || FUNC_COLORS.other;
        ctx.lineWidth = 1.6;
        for (let k = 0; k < parts; k++){
          ctx.globalAlpha = (focus && !isFocus ? 0.18 : 0.55) * (1 - k / parts);
          ctx.beginPath();
          ctx.ellipse(sun.x, sun.y, rx, rx * f, 0, a - span * (k + 1) / parts, a - span * k / parts);
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    drawSun(ctx){
      const c = this.toScreen(0, 0);
      const r = this.sunDisc();
      const glow = r * (2.1 + 0.1 * Math.sin(this.state.time * 0.03));
      ctx.save();
      const corona = ctx.createRadialGradient(c.x, c.y, r * 0.6, c.x, c.y, glow);
      corona.addColorStop(0, 'rgba(255,170,60,0.55)');
      corona.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = corona;
      ctx.beginPath(); ctx.arc(c.x, c.y, glow, 0, Math.PI * 2); ctx.fill();
      const core = ctx.createRadialGradient(c.x - r * 0.25, c.y - r * 0.25, r * 0.1, c.x, c.y, r);
      core.addColorStop(0, '#fff3b0'); core.addColorStop(0.45, '#ffc53d'); core.addColorStop(1, '#f2701d');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b1403';
      ctx.font = `800 ${clamp(r * 0.82, 10, 34)}px ${this.theme.font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pretty(this.state.key), c.x, c.y + 1);
      ctx.restore();
    }

    /** A round body lit from the side facing the sun. */
    drawBody(ctx, x, y, r, color, light){
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (r < 4) return;
      const lit = ctx.createRadialGradient(x + light.x * r * 0.5, y + light.y * r * 0.5, 0, x, y, r);
      lit.addColorStop(0, 'rgba(255,255,255,0.55)');
      lit.addColorStop(0.55, 'rgba(255,255,255,0)');
      lit.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = lit;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    drawCaption(ctx, text, x, y, offset, size, color){
      const { W } = this.geo;
      ctx.font = `600 ${size}px ${this.theme.font}`;
      ctx.letterSpacing = /[♭♯]/.test(text) ? `${-size * 0.14}px` : '0px';  // the accidental's glyph comes from a wider font
      const tw = ctx.measureText(text).width;
      // Outward on its own side, unless that runs off the box.
      let right = x >= W / 2;
      if (right && x + offset + tw > W - 2) right = false;
      if (!right && x - offset - tw < 2) right = true;
      ctx.textAlign = right ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      const tx = right ? x + offset : x - offset;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(text, tx, y);
      ctx.fillStyle = color;
      ctx.fillText(text, tx, y);
      ctx.letterSpacing = '0px';
    }

    drawPlanetSystem(ctx, p){
      const focus = this.state.focusPlanet;
      const isFocus = p.note === focus;
      const expanded = this.state.expandedPlanets.indexOf(p.note) !== -1;
      const world = this.planetWorld(p);
      const pos = this.toScreen(world.x, world.y);
      const sun = this.toScreen(0, 0);
      const dist = Math.hypot(sun.x - pos.x, sun.y - pos.y) || 1;
      const light = { x: (sun.x - pos.x) / dist, y: (sun.y - pos.y) / dist };
      const size = this.planetDisc(p) * (expanded ? 1.08 : 1);
      const dim = focus && !isFocus ? 0.32 : 1;
      const color = FUNC_COLORS[p.func] || FUNC_COLORS.other;
      const mode = this.state.labelMode;

      ctx.save();
      ctx.globalAlpha = dim;
      if (p.open > 0.02) this.drawMoons(ctx, p, world, pos, isFocus);

      // Marks around the planet: selected, in the generated numbers, a chord's root
      if (expanded){
        const pulse = 3 + 1.5 * Math.sin(this.state.time * 0.08);
        ctx.beginPath(); ctx.arc(pos.x, pos.y, size + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = this.theme.accent; ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (this.state.highlightedNotes.indexOf(p.note) !== -1){
        ctx.beginPath(); ctx.arc(pos.x, pos.y, size + 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(250,204,21,0.8)'; ctx.lineWidth = 1.25; ctx.stroke();
      }
      const hMeta = this.state.highlightedRoots[p.note];
      if (hMeta){
        ctx.beginPath(); ctx.arc(pos.x, pos.y, size + 5, 0, Math.PI * 2);
        ctx.strokeStyle = hMeta.isSubstitution ? 'rgba(236,72,153,0.85)' : 'rgba(16,185,129,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      }

      this.drawBody(ctx, pos.x, pos.y, size, color, light);

      const name = pretty(p.note);
      const onDisc = mode === 'notes' ? name : String(p.number);
      ctx.font = `800 ${clamp(size * (onDisc.length > 1 ? 0.92 : 1.12), 8, 26)}px ${this.theme.font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0b1220';
      ctx.fillText(onDisc, pos.x, pos.y + 0.5);
      if (mode === 'both' && dim === 1) this.drawCaption(ctx, name, pos.x, pos.y, size + 4, clamp(size * 0.9, 10, 16), this.theme.text);
      ctx.restore();
    }

    drawMoons(ctx, p, world, pos, isFocus){
      const f = this.geo.flatten, z = this.cam.z;
      const mode = this.state.labelMode;
      const disc = this.moonDisc(p);
      const baseAlpha = ctx.globalAlpha;
      // One ring per moon
      ctx.lineWidth = 1;
      p.moons.forEach(s => {
        const orbit = s.orbit * (0.35 + 0.65 * p.open) * z;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, orbit, orbit * f, 0, 0, Math.PI * 2);
        ctx.strokeStyle = MOON_COLORS[s.type] || this.theme.muted;
        ctx.globalAlpha = baseAlpha * p.open * (s === this.hotMoon ? 0.95 : (isFocus ? 0.34 : 0.18));
        ctx.stroke();
      });
      ctx.globalAlpha = baseAlpha * p.open;
      p.moons.forEach(s => {
        const m = this.moonScreen(p, s, world);
        const dist = Math.hypot(pos.x - m.x, pos.y - m.y) || 1;
        const light = { x: (pos.x - m.x) / dist, y: (pos.y - m.y) / dist };
        const r = disc * (s === this.hotMoon ? 1.25 : 1);
        if (s === this.selectedMoon || s === this.hotMoon){
          ctx.beginPath(); ctx.arc(m.x, m.y, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = this.theme.text; ctx.lineWidth = 1.25; ctx.stroke();
        }
        this.drawBody(ctx, m.x, m.y, r, MOON_COLORS[s.type] || '#f59e0b', light);
        if (r < 5.5) return;
        const onDisc = mode === 'notes' ? pretty(s.root) : s.number;
        ctx.font = `800 ${clamp(r * (onDisc.length > 1 ? 1 : 1.25), 8, 16)}px ${this.theme.font}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#071018';
        ctx.fillText(onDisc, m.x, m.y + 0.5);
        if (isFocus && mode !== 'numbers' && (mode === 'both' || s.display !== s.root) && p.moonLane * z * f >= 8) this.drawCaption(ctx, pretty(s.display), m.x, m.y, r + 3, clamp(r * 0.95, 9.5, 13), this.theme.text);
      });
      ctx.globalAlpha = baseAlpha;
    }

    drawPathTrajectories(ctx){
      const sun = this.toScreen(0, 0);
      const path = this.state.activePath;
      for (let k = 0; k < path.length - 1; k++){
        const fromP = this.state.planets.find(pl => pl.note === path[k]);
        const toP = this.state.planets.find(pl => pl.note === path[k + 1]);
        if (!fromP || !toP) continue;
        const w0 = this.planetWorld(fromP), w1 = this.planetWorld(toP);
        const a = this.toScreen(w0.x, w0.y), b = this.toScreen(w1.x, w1.y);
        const ctrlx = ((a.x + b.x) / 2 + sun.x) / 2, ctrly = ((a.y + b.y) / 2 + sun.y) / 2;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(ctrlx, ctrly, b.x, b.y);
        ctx.strokeStyle = 'rgba(34,197,94,0.8)'; ctx.lineWidth = 2; ctx.stroke();
        const ang = Math.atan2(b.y - ctrly, b.x - ctrlx);
        const hx = b.x - Math.cos(ang) * 10, hy = b.y - Math.sin(ang) * 10;
        ctx.beginPath(); ctx.moveTo(b.x, b.y);
        ctx.lineTo(hx - Math.cos(ang + Math.PI / 2) * 5, hy - Math.sin(ang + Math.PI / 2) * 5);
        ctx.lineTo(hx + Math.cos(ang + Math.PI / 2) * 5, hy + Math.sin(ang + Math.PI / 2) * 5);
        ctx.closePath(); ctx.fillStyle = 'rgba(34,197,94,0.9)'; ctx.fill();
        ctx.restore();
      }
    }

    classifyFunction(note){
      const key = this.state.key; const val = this.musicTheory.noteValues[note]; const keyVal = this.musicTheory.noteValues[key]; if (val === undefined || keyVal === undefined) return 'other';
      const dist = (val - keyVal + 12) % 12;
      switch(dist){ case 0: return 'tonic'; case 7: return 'dominant'; case 5: return 'predominant'; case 2: return 'predominant'; case 11: return 'leading'; case 9: return 'mediant'; case 4: return 'mediant'; default: return 'other'; }
    }

    /* ---------- the bar, the moon list, the tooltip ------------------- */
    injectStyles(){
      if (document.getElementById('solar-styles')) return;
      const style = document.createElement('style');
      style.id = 'solar-styles';
      style.textContent = `
        .solar-root { display: flex; flex-direction: column; position: relative; min-width: 0; }
        .solar-root > canvas {
          display: block; width: 100%; aspect-ratio: 16 / 10; min-height: 260px; max-height: min(640px, 62vh);
          border-radius: var(--radius-md, 4px);
          background: radial-gradient(ellipse at center, color-mix(in srgb, var(--bg-panel, #1e293b) 42%, var(--bg-input, #05070d)) 0%, var(--bg-input, #05070d) 78%);
        }
        .solar-readout { margin-left: auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text-muted, #cbd5e1); padding-left: 6px; }
        .solar-narrow .solar-readout { display: none; }
        .solar-moons {
          position: absolute; left: 6px; right: 6px; bottom: 6px; z-index: 5; display: flex; align-items: center; gap: 4px; padding: 3px 5px;
          overflow-x: auto; scrollbar-width: thin; font-family: var(--font-ui, sans-serif); font-size: 11px; color: var(--text-main, #fff);
          background: color-mix(in srgb, var(--bg-panel, #1e293b) 88%, transparent); border: 1px solid var(--border-light, #475569); border-radius: var(--radius-md, 4px);
        }
        .solar-moons[hidden] { display: none; }
        .solar-moons-title { flex: 0 0 auto; color: var(--text-muted, #cbd5e1); padding-right: 2px; white-space: nowrap; }
        .solar-moon { all: unset; box-sizing: border-box; flex: 0 0 auto; display: inline-flex; align-items: center; gap: 4px; padding: 2px 5px 2px 2px; border-radius: 10px; cursor: pointer; white-space: nowrap; }
        .solar-moon:hover, .solar-moon:focus-visible, .solar-moon[aria-pressed="true"] { background: color-mix(in srgb, var(--text-main, #fff) 14%, transparent); }
        .solar-moon-num { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; padding: 0 2px; box-sizing: border-box; border-radius: 9px; color: #071018; font-weight: 800; font-size: 10px; }
        .solar-moon-role { display: none; color: var(--text-muted, #cbd5e1); font-size: 10px; }
        .solar-narrow .solar-moons-word { display: none; }
        .solar-wide .solar-moons { left: auto; top: 36px; right: 6px; bottom: auto; width: 232px; max-height: calc(100% - 42px); flex-direction: column; align-items: stretch; overflow: hidden auto; gap: 1px; padding: 6px; }
        .solar-wide .solar-moon { display: grid; grid-template-columns: 21px 56px 1fr; column-gap: 4px; padding: 2px 4px 2px 2px; border-radius: 4px; }
        .solar-wide .solar-moon-role { display: block; overflow: hidden; text-overflow: ellipsis; }
        .solar-wide .solar-moons-title { padding: 0 0 4px; }
        .solar-tip { position: absolute; pointer-events: none; z-index: 8; max-width: 260px; background: rgba(2,6,23,0.92); color: #e5e7eb; padding: 5px 8px; border-radius: 5px; font: 11px/1.35 var(--font-ui, sans-serif); box-shadow: 0 2px 8px rgba(0,0,0,0.35); opacity: 0; transition: opacity 120ms ease; }
      `;
      document.head.appendChild(style);
    }

    injectControls(){
      const controls = document.createElement('div');
      controls.id = 'solar-controls';
      controls.className = 'viz-bar';
      const seg = LABEL_MODES.map(m => `<button type="button" class="viz-btn" data-label-mode="${m[0]}" title="${m[2]}">${m[1]}</button>`).join('');
      controls.innerHTML = `
        <button type="button" id="solar-back" class="viz-btn" title="Back to the whole system" hidden>◀ All</button>
        <button type="button" id="solar-play" class="viz-btn">▶</button>
        <span class="viz-seg" role="group" aria-label="What the planets and moons show">${seg}</span>
        <details class="viz-more">
          <summary class="viz-btn" title="Display options" aria-label="Display options">⋯</summary>
          <div class="viz-more-panel">
            <label class="viz-check" title="Show path lines between selected planets"><input type="checkbox" id="solar-traj"> Path lines</label>
            <label>Size <input type="range" id="solar-size" min="0.5" max="2" step="0.1"></label>
            <label>Speed <input type="range" id="solar-speed" min="0.1" max="2" step="0.05"></label>
            <label>Sizing <select id="solar-sizing"><option value="theory">Theory</option><option value="equal">Equal</option></select></label>
          </div>
        </details>
        <span class="solar-readout" id="solar-header-text"></span>
      `;
      this.container.appendChild(controls);
      this.controls = controls;
      this.moreMenu = controls.querySelector('.viz-more');

      controls.querySelector('#solar-play').onclick = () => { this.isPlaying ? this.stop() : this.start(); };
      controls.querySelector('#solar-back').onclick = () => this.setFocus(null);
      controls.querySelectorAll('[data-label-mode]').forEach(b => { b.onclick = () => this.setLabelMode(b.getAttribute('data-label-mode')); });
      const traj = controls.querySelector('#solar-traj'), size = controls.querySelector('#solar-size');
      const speed = controls.querySelector('#solar-speed'), sizing = controls.querySelector('#solar-sizing');
      traj.checked = this.state.showTrajectories;
      size.value = this.state.sizeScale;
      speed.value = this.state.speedScale;
      sizing.value = this.state.sizingMode;
      traj.onchange = (e) => this.toggleTrajectories(e.target.checked);
      size.oninput = (e) => this.setSizeScale(parseFloat(e.target.value));
      speed.oninput = (e) => this.setSpeedScale(parseFloat(e.target.value));
      sizing.onchange = (e) => this.setSizingMode(e.target.value);
      this.syncPlayButton();
    }

    /** The bar and the canvas's description follow the current key, scale and label mode. */
    syncControls(){
      if (!this.controls) return;
      const notes = this.state.notes;
      const header = this.controls.querySelector('#solar-header-text');
      if (header) header.textContent = `${pretty(this.state.key)} ${String(this.state.scale).replace(/_/g, ' ')} · ${notes.length} rings`;
      this.controls.querySelectorAll('[data-label-mode]').forEach(b => {
        b.setAttribute('aria-pressed', b.getAttribute('data-label-mode') === this.state.labelMode ? 'true' : 'false');
      });
      const back = this.controls.querySelector('#solar-back');
      if (back) back.hidden = !this.state.focusPlanet;
      if (this.canvas) this.canvas.setAttribute('aria-label', `The scale as orbits around ${pretty(this.state.key)}: ` + notes.map((n, i) => `${i + 1} ${pretty(n)}`).join(', '));
    }

    /** A wide box lists the moons beside the map; anything else, in one strip under it. */
    syncWide(){
      const size = this.canvasSize;
      if (!size || !this.container) return;
      const wide = size.w >= WIDE_PANEL_W && size.h >= 260;
      const had = this.container.classList.contains('solar-wide');
      this.container.classList.toggle('solar-wide', wide);
      this.container.classList.toggle('solar-narrow', size.w < 400);
      this.container.classList.toggle('viz-narrow', size.w < 400);
      if (had !== wide || this.state.focusPlanet) this.measureMoonPanel();
    }

    injectMoonPanel(){
      const panel = document.createElement('div');
      panel.className = 'solar-moons';
      panel.hidden = true;
      this.container.appendChild(panel);
      this.moonPanel = panel;
      panel.addEventListener('click', e => {
        const btn = e.target.closest && e.target.closest('[data-idx]');
        const p = btn && this.state.planets.find(pl => pl.note === this.state.focusPlanet);
        const s = p && p.satellites[parseInt(btn.getAttribute('data-idx'), 10)];
        if (s) this.handleSatelliteSelect(p.note, s);
      });
      const hover = e => {
        const btn = e.target.closest && e.target.closest('[data-idx]');
        const p = this.state.planets.find(pl => pl.note === this.state.focusPlanet);
        this.hotMoon = btn && p ? p.satellites[parseInt(btn.getAttribute('data-idx'), 10)] : null;
        this.requestDraw();
      };
      panel.addEventListener('mouseover', hover);
      panel.addEventListener('mouseleave', () => { this.hotMoon = null; this.requestDraw(); });
    }

    renderMoonPanel(){
      const panel = this.moonPanel;
      if (!panel) return;
      const p = this.state.focusPlanet && this.state.planets.find(pl => pl.note === this.state.focusPlanet);
      if (!p){
        panel.hidden = true;
        panel.innerHTML = '';
        this.measureMoonPanel();
        return;
      }
      panel.hidden = false;
      const rows = p.satellites.map((s, i) => `
        <button type="button" class="solar-moon" data-idx="${i}" aria-pressed="${s === this.selectedMoon}" title="${escapeHtml(this.describeMoon(p, s))}. Send to Chord Finder">
          <span class="solar-moon-num" style="background:${MOON_COLORS[s.type] || '#f59e0b'}">${escapeHtml(s.number)}</span>
          <span>${escapeHtml(pretty(s.display))}</span>
          <span class="solar-moon-role">${escapeHtml(MOON_TAGS[s.type] || '')}</span>
        </button>`).join('');
      panel.innerHTML = `<div class="solar-moons-title"><span class="solar-moons-word">Moons of </span><b>${p.number} · ${escapeHtml(pretty(p.note))}</b></div>${rows}`;
      this.measureMoonPanel();
    }

    /** The camera centres a focused planet in what the list leaves of the canvas. */
    measureMoonPanel(){
      const panel = this.moonPanel;
      const open = panel && !panel.hidden;
      const wide = this.container && this.container.classList.contains('solar-wide');
      this.insets = {
        right: open && wide ? panel.offsetWidth + 10 : 0,
        bottom: open && !wide ? panel.offsetHeight + 10 : 0
      };
      if (this.geo) this.state.planets.forEach(p => this.fitMoons(p));
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
      this.selectedMoon = satellite;
      if (this.moonPanel) this.moonPanel.querySelectorAll('[data-idx]').forEach(b => {
        const p = this.state.planets.find(pl => pl.note === targetNote);
        b.setAttribute('aria-pressed', String(!!p && p.satellites[parseInt(b.getAttribute('data-idx'), 10)] === satellite));
      });
      this.requestDraw();
    }

    injectTooltip(){
      const tip = document.createElement('div');
      tip.className = 'solar-tip';
      this.container.appendChild(tip);
      this.tooltip = tip;
    }
  }

  if(typeof module !== 'undefined' && module.exports){ module.exports = SolarSystemVisualizer; }
  if(typeof window !== 'undefined'){ window.SolarSystemVisualizer = SolarSystemVisualizer; }
})(this);
