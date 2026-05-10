/**
 * arc-ui-init.js - v3 (Enhanced Melodic & Harmonic Beauty)
 * Initialize arc preview panel + generation system
 */
console.log('🎵 [ArcInit] Script loaded - v3.0.0 (Beauty Edition)');
window.__arcInitLoaded = new Date().toISOString();

document.addEventListener('DOMContentLoaded', () => {
  const timelineUI = new CompositionTimelineUI('#global-word-input', 'composition-timeline-panel');
  window.compositionTimeline = timelineUI;

  // Listen for the generated music and apply it to the main sheet generator
  document.addEventListener('musicGenerated', (event) => {
    const detail = event && event.detail ? event.detail : {};
    const arc = detail.arc || null;
    const context = detail.context || null;
    const seed = detail.seed;

    if (typeof window.applyGeneratedMusicToSheet === 'function') {
        // If the energy profile is essentially flat (low variance), synthesize a more
        // meaningful contour from the context shape before applying to the sheet.
        try {
          if (arc) {
            const energyProfile = Array.isArray(arc.energyProfile) ? arc.energyProfile : [];
            const total = energyProfile.length || (Number.isFinite(arc.totalBeats) ? arc.totalBeats : 16);
            const variance = (arr) => {
              if (!Array.isArray(arr) || arr.length === 0) return 0;
              const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
              return arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
            };
            const varv = variance(energyProfile);
            if (varv < 1e-6) {
              const ctxShape = (context && context.arcShape) ? context.arcShape : null;
              const shapeKey = (context && context.arcShapeKey) ? context.arcShapeKey : null;
              let template = null;
              if (Array.isArray(ctxShape) && ctxShape.length) {
                template = ctxShape.map(p => ({ x: Number(p[0] || p.progress || 0), y: Number(p[1] || p.energy || 0.5) }));
              } else if (typeof window.ContextEngine === 'function') {
                try {
                  const ce = new ContextEngine();
                  template = ce.normalizeArcShape(shapeKey || 'rising', (context && context.intensity) ? context.intensity : 1);
                } catch (_) { template = null; }
              }
              if (!template) {
                const fallbacks = {
                  rising: [{x:0,y:0.2},{x:1,y:0.85}],
                  falling: [{x:0,y:0.85},{x:1,y:0.2}],
                  flat: [{x:0,y:0.5},{x:1,y:0.5}],
                  peak: [{x:0,y:0.4},{x:0.5,y:0.95},{x:1,y:0.45}],
                  valley: [{x:0,y:0.6},{x:0.5,y:0.1},{x:1,y:0.6}],
                  wave: [{x:0,y:0.3},{x:0.33,y:0.8},{x:0.66,y:0.25},{x:1,y:0.6}]
                };
                template = fallbacks[shapeKey] || fallbacks.rising;
              }
              const newProfile = [];
              for (let i = 0; i < total; i++) {
                const t = total > 1 ? (i / (total - 1)) : 0;
                let a = template[0], b = template[template.length - 1];
                for (let j = 0; j < template.length - 1; j++) {
                  if (template[j].x <= t && template[j+1].x >= t) { a = template[j]; b = template[j+1]; break; }
                }
                const span = Math.max(1e-6, (b.x - a.x));
                const frac = (t - a.x) / span;
                const valA = Number(a.y) || 0.5;
                const valB = Number(b.y) || valA;
                const interp = valA + (valB - valA) * Math.max(0, Math.min(1, frac));
                let jitter = 0;
                try { jitter = (((typeof createRNG === 'function') ? createRNG(Number(seed) ^ i)() : Math.random()) - 0.5) * 0.06; } catch (_) { jitter = (Math.random() - 0.5) * 0.06; }
                newProfile.push(Math.max(0, Math.min(1, interp + jitter)));
              }
              arc.energyProfile = newProfile;
            }
          }
        } catch (_) {}
        window.applyGeneratedMusicToSheet(detail);
    } else {
      console.warn('[ArcInit] applyGeneratedMusicToSheet not found on window');
    }
  });

  document.addEventListener('arcConfirmed', (event) => {
    const detail = event && event.detail ? event.detail : {};
    let { profile, points, input } = detail;
    // ArcPreviewPanel emits { context, arc, seed, input }
    let context = detail.context || null;
    let arc = detail.arc || null;
    // Prefer a provided seed; otherwise derive one that varies per click.
    // Date.now() ensures variation even if Math.random is overridden.
    // If the same input/context is generated repeatedly within a short window,
    // add a small jitter so repeated "Generate" clicks produce variation.
    let seed = Number.isFinite(detail.seed) ? detail.seed : ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    try {
      const sigParts = [String(input || ''), (context && context.harmonicProfile && context.harmonicProfile.root) || '', (context && context.harmonicProfile && context.harmonicProfile.recommendedScale) || ''];
      const sig = sigParts.join('|');
      const now = Date.now();
      const lastSig = window.__lastGenSignature || null;
      const lastTime = Number.isFinite(window.__lastGenTime) ? window.__lastGenTime : 0;
      // If identical signature and last generation was within 2s, mix in a small random jitter.
      if (lastSig === sig && (now - lastTime) < 2000) {
        const jitter = (Math.floor(Math.random() * 0xffff) & 0xffff) >>> 0;
        seed = (Number(seed) ^ jitter) >>> 0;
        console.debug('[ArcInit] Applied jittered seed for repeated generate', { original: detail.seed, jitter });
      }
      window.__lastGenSignature = sig;
      window.__lastGenTime = now;
    } catch (_) {}

    const _scaleLib = window.modularApp && window.modularApp.scaleLibrary;
    const _mt = window.modularApp && window.modularApp.musicTheory;
    const _studioKey = (_scaleLib && typeof _scaleLib.getCurrentKey === 'function') ? (_scaleLib.getCurrentKey() || 'C') : 'C';
    const _studioScale = (_scaleLib && typeof _scaleLib.getCurrentScale === 'function') ? (_scaleLib.getCurrentScale() || 'major') : 'major';
    
    let _resolvedNotes = [];
    try {
        if (_mt && typeof _mt.getScaleNotesWithKeySignature === 'function') {
            _resolvedNotes = _mt.getScaleNotesWithKeySignature(_studioKey, _studioScale) || [];
        } else if (_mt && typeof _mt.getScaleNotes === 'function') {
            _resolvedNotes = _mt.getScaleNotes(_studioKey, _studioScale) || [];
        }
    } catch(_) {}

    // If context/arc not provided, build them from the legacy timeline payload.
    if (!context || !arc) {
      context = {
          emotionalTone: (profile && profile.contourArchetype) || 'balanced',
          performanceIntent: (profile && profile.densityArchetype) || 'steady',
          overallEnergy: (profile && typeof profile.overallEnergy === 'number') ? profile.overallEnergy : 0.5,
          globalTension: (profile && typeof profile.globalTension === 'number') ? profile.globalTension : 0.5,
          timeSignature: '4/4',
          harmonicProfile: {
              recommendedScale: _studioScale,
              root: _studioKey,
              scaleNotes: _resolvedNotes
          },
          arcShapeKey: (profile && profile.contourArchetype) || 'balanced',
          wordTokens: (profile && profile.wordTokens) || []
      };

      arc = {
          bars: 4,
          beatsPerBar: 4,
          totalBeats: 16,
          sample: (t) => {
              if (!points || points.length === 0) return 0.5;
              const targetX = t;
              let p1 = points[0], p2 = points[points.length-1];
              for(let i=0; i<points.length-1; i++) {
                  if (points[i].xNorm <= targetX && points[i+1].xNorm >= targetX) {
                      p1 = points[i];
                      p2 = points[i+1];
                      break;
                  }
              }
              if (p1 === p2) return 1.0 - p1.yNorm;
              const segmentT = (targetX - p1.xNorm) / (p2.xNorm - p1.xNorm);
              const val = p1.yNorm + (p2.yNorm - p1.yNorm) * segmentT;
              return 1.0 - val;
          }
      };
    } else {
      // Normalize ArcPreviewPanel context to the fields the generators expect.
      const src = context || {};
      const hp = (src && src.harmonicProfile) ? src.harmonicProfile : {};
      const derivedOverallEnergy = (typeof src.overallEnergy === 'number') ? src.overallEnergy
        : (typeof src.intensity === 'number') ? src.intensity
        : 0.5;
      const derivedGlobalTension = (typeof src.globalTension === 'number') ? src.globalTension
        : (src.metadata && typeof src.metadata.complexity === 'number') ? src.metadata.complexity
        : 0.5;
      context = {
        ...src,
        emotionalTone: src.emotionalTone || src.arcShapeKey || 'balanced',
        performanceIntent: src.performanceIntent || 'steady',
        overallEnergy: derivedOverallEnergy,
        globalTension: derivedGlobalTension,
        timeSignature: src.timeSignature || '4/4',
        harmonicProfile: {
          recommendedScale: hp.recommendedScale || _studioScale,
          root: hp.root || _studioKey,
          scaleNotes: (Array.isArray(hp.scaleNotes) && hp.scaleNotes.length) ? hp.scaleNotes : _resolvedNotes
        }
      };

      // Ensure arc has sane defaults and a sample(t) function.
      if (!arc) arc = {};
      if (!Number.isFinite(arc.bars)) arc.bars = 4;
      if (!Number.isFinite(arc.beatsPerBar)) arc.beatsPerBar = 4;
      if (!Number.isFinite(arc.totalBeats)) arc.totalBeats = arc.bars * arc.beatsPerBar;
      if (typeof arc.sample !== 'function') {
        const profile = Array.isArray(arc.energyProfile) ? arc.energyProfile : null;
        if (profile && profile.length > 1) {
          arc.sample = (t) => {
            const clamped = Math.max(0, Math.min(1, Number(t)));
            const idx = clamped * (profile.length - 1);
            const i0 = Math.floor(idx);
            const i1 = Math.min(profile.length - 1, i0 + 1);
            const frac = idx - i0;
            const a = Number(profile[i0]);
            const b = Number(profile[i1]);
            const av = Number.isFinite(a) ? a : 0.5;
            const bv = Number.isFinite(b) ? b : av;
            return av + (bv - av) * frac;
          };
        } else {
            arc.sample = () => 0.5;
        }
      }

        // Wrap arc.sample with a small per-generation, seed-derived perturbation
        try {
          if (typeof arc.sample === 'function') {
            const baseSample = arc.sample;
            const noiseRng = (typeof createRNG === 'function') ? createRNG(Number(seed) ^ 0x9e3779b1) : () => Math.random();
            arc.sample = (t) => {
              try {
                let v = Number(baseSample(t));
                if (!Number.isFinite(v)) v = 0.5;
                // small +/- variation (~7%) biased by seeded RNG for reproducibility
                const perturb = ((noiseRng() || 0.5) - 0.5) * 0.07;
                v = Math.max(0, Math.min(1, v + perturb));
                return v;
              } catch (_) { return baseSample(t); }
            };
          }
        } catch (_) {}
    }

    // Ensure an energyProfile exists for downstream renderers that expect a beat-indexed array.
    try {
      const total = Number.isFinite(arc.totalBeats)
        ? arc.totalBeats
        : (Number.isFinite(arc.bars) && Number.isFinite(arc.beatsPerBar))
          ? arc.bars * arc.beatsPerBar
          : 16;
      if (!Array.isArray(arc.energyProfile) || arc.energyProfile.length < total) {
        const energyProfile = [];
        for (let i = 0; i < total; i++) {
          const t = total > 1 ? (i / (total - 1)) : 0;
          const v = (typeof arc.sample === 'function') ? Number(arc.sample(t)) : 0.5;
          const clamped = Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
          energyProfile.push(clamped);
        }
        arc.energyProfile = energyProfile;
      }
    } catch (_) {}

    const harmony = generateHarmony(context, arc, seed);
    const melody = generateMelody(context, arc, harmony, seed);
    const scaleTimeline = buildScaleTimeline(context, arc, harmony);

    const generatedMusic = {
      harmony,
      melody,
      scaleTimeline,
      context,
      arc,
      seed,
      traceId: `arc-${Date.now().toString(36)}`,
      input,
      timestamp: new Date().toISOString()
    };

    try {
      window.__lastMusicGenerated = generatedMusic;
    } catch (_) {}

    // Show quick chord-origin explanations for any borrowed/approach/modulation events.
    try {
      queueChordOriginToasts(generatedMusic);
    } catch (_) {}

    document.dispatchEvent(new CustomEvent('musicGenerated', { detail: generatedMusic }));
  });
});

function ensureArcChordToastUI() {
  if (typeof document === 'undefined') return null;
  let toast = document.getElementById('arc-chord-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'arc-chord-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.pointerEvents = 'none';
    document.body.appendChild(toast);
  }
  return toast;
}

function formatScaleNameForDisplay(scaleName) {
  if (!scaleName) return '';
  const s = String(scaleName)
    .replace(/_/g, ' ')
    .replace(/\bb(\d+)/g, '♭$1')
    .replace(/\b#(\d+)/g, '♯$1');
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

function queueChordOriginToasts(generatedMusic, { maxToasts = 6, perToastMs = 1200 } = {}) {
  if (!generatedMusic || !generatedMusic.harmony || !Array.isArray(generatedMusic.harmony.chordSequence)) return;
  const seq = generatedMusic.harmony.chordSequence;

  const specials = seq
    .filter(ev => ev && typeof ev.explain === 'string' && ev.explain.trim().length)
    .sort((a, b) => (a.bar - b.bar) || (a.beat - b.beat));

  if (!specials.length) return;

  const unique = [];
  const seen = new Set();
  for (const ev of specials) {
    const k = `${ev.bar}|${ev.beat}|${ev.chord}|${ev.explain}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(ev);
    if (unique.length >= maxToasts) break;
  }

  if (!unique.length) return;

  const toast = ensureArcChordToastUI();
  if (!toast) {
    window.__arcChordToastQueue = [];
    window.__arcChordToastRunning = false;
    return;
  }

  // Reset any prior runner (new generation should show its own explanations first).
  try {
    const timers = Array.isArray(window.__arcChordToastTimers) ? window.__arcChordToastTimers : [];
    for (const id of timers) clearTimeout(id);
    if (Number.isFinite(window.__arcChordToastRafId)) cancelAnimationFrame(window.__arcChordToastRafId);
  } catch (_) {}
  window.__arcChordToastTimers = [];
  window.__arcChordToastRafId = null;
  window.__arcChordToastQueue = unique.map(ev => ev.explain);
  window.__arcChordToastRunning = true;
  toast.classList.remove('show');
  toast.textContent = '';

  const showNext = () => {
    const q = window.__arcChordToastQueue || [];
    const msg = q.shift();
    window.__arcChordToastQueue = q;
    if (!msg) {
      window.__arcChordToastRunning = false;
      toast.textContent = '';
      toast.classList.remove('show');
      return;
    }

    toast.textContent = msg;
    // Trigger CSS transition
    window.__arcChordToastRafId = requestAnimationFrame(() => toast.classList.add('show'));
    const hideId = setTimeout(() => {
      toast.classList.remove('show');
      const nextId = setTimeout(showNext, 180);
      window.__arcChordToastTimers.push(nextId);
    }, perToastMs);
    window.__arcChordToastTimers.push(hideId);
  };

  showNext();
}

function romanToDegree(roman) {
    if (!roman) return 1;
    const s = String(roman).toUpperCase();
    const m = s.match(/([IV]+)/);
    if (!m) return 1;
    const clean = m[1];
    const map = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7 };
    return map[clean] || 1;
}

function inferChordTypeFromRoman(roman, fallbackChordType = 'maj7') {
  const s = String(roman || '').trim();
  if (!s) return fallbackChordType;
  const low = s.toLowerCase();
  // Explicit suffixes win
  if (/maj13|maj9|maj7/i.test(s)) return 'maj7';
  if (/mmaj7/i.test(s)) return 'mMaj7';
  if (/m7b5/i.test(s)) return 'm7b5';
  if (/dim7/i.test(s)) return 'dim7';
  if (/dim/i.test(s)) return 'dim';
  // Dominant markers (V, secondary dominants, etc)
  if (/(^|[^a-z])v7([^a-z]|$)/i.test(s) || /\bV7\//.test(s) || /\b7\b/.test(low)) return '7';

  // Roman case heuristic: lowercase => minor; uppercase => major
  // Keep 7ths by default because the generator + sheet are oriented around 7th chords.
  const hasRoman = /[iv]+/i.test(s);
  if (hasRoman && s === low) return 'm7';
  if (hasRoman) return 'maj7';

  return fallbackChordType;
}

function generateHarmony(context, arc, seed = 0) {
  const rng = createRNG(seed);
  const mt = window.modularApp && window.modularApp.musicTheory;
  const beatsPerBar = arc.beatsPerBar || 4;
  const barCount = arc.bars || 4;
  const currentKey = context.harmonicProfile.root || 'C';
  const currentScale = context.harmonicProfile.recommendedScale || 'major';

  const clamp01 = (x) => Math.max(0, Math.min(1, Number(x)));
  const getScaleNotesSafe = (root, scaleName) => {
    if (!mt || !root || !scaleName) return null;
    try {
      if (typeof mt.getScaleNotesWithKeySignature === 'function') return mt.getScaleNotesWithKeySignature(root, scaleName) || null;
      if (typeof mt.getScaleNotes === 'function') return mt.getScaleNotes(root, scaleName) || null;
    } catch (_) {}
    return null;
  };
  
  // Multiple templates per tone to avoid repeating the same 4-chord loop.
  const progressionLibrary = {
    joyful: [
      ['I', 'IV', 'V', 'IV'],
      ['I', 'V', 'IV', 'I'],
      ['I', 'vi', 'IV', 'V']
    ],
    hopeful: [
      ['I', 'ii', 'V', 'I'],
      ['I', 'IV', 'V', 'I'],
      ['I', 'vi', 'ii', 'V']
    ],
    calm: [
      ['I', 'vi', 'ii', 'V'],
      ['I', 'iii', 'vi', 'IV'],
      ['I', 'IV', 'ii', 'V']
    ],
    dark: [
      ['i', 'bVI', 'iv', 'V'],
      ['i', 'iv', 'bVII', 'bVI'],
      ['i', 'bVII', 'bVI', 'V']
    ],
    sad: [
      ['i', 'iv', 'bVII', 'i'],
      ['i', 'bVI', 'iv', 'i'],
      ['i', 'bVII', 'iv', 'i']
    ],
    angry: [
      ['i', 'bII', 'V', 'i'],
      ['i', 'bII', 'bVII', 'i'],
      ['i', 'V', 'bII', 'i']
    ],
    intense: [
      ['i', 'V', 'bVI', 'V'],
      ['i', 'bVI', 'V', 'i'],
      ['i', 'bII', 'V', 'bVI']
    ],
    mysterious: [
      ['i', 'bII', 'bVII', 'i'],
      ['i', 'bVI', 'bII', 'i'],
      ['i', 'bII', 'iv', 'bVII']
    ],
    dreamy: [
      ['I', '#IV', 'ii', 'I'],
      ['I', 'IV', 'ii', 'I'],
      ['I', 'vi', 'IV', 'I']
    ],
    playful: [
      ['I', 'iii', 'IV', 'V'],
      ['I', 'V', 'iii', 'IV'],
      ['I', 'ii', 'iii', 'V']
    ],
    balanced: [
      ['I', 'V', 'vi', 'IV'],
      ['I', 'vi', 'IV', 'V'],
      ['I', 'IV', 'V', 'I'],
      ['vi', 'IV', 'I', 'V']
    ]
  };

  const toneTemplates = progressionLibrary[context.emotionalTone] || progressionLibrary.balanced;
  const baseProg = Array.isArray(toneTemplates[0])
    ? toneTemplates[Math.max(0, Math.min(toneTemplates.length - 1, Math.floor(rng() * toneTemplates.length)))]
    : toneTemplates;
  const harmony = { chordSequence: [], context };

  // Voice Leading Engine Integration
  let vlEngine = null;
  if (typeof VoiceLeadingEngine !== 'undefined' && mt) {
      vlEngine = new VoiceLeadingEngine(mt);
  }

  const resolvedBarChords = [];
  const borrowedFlags = [];

  for (let bar = 0; bar < barCount; bar++) {
    let roman = baseProg[bar % baseProg.length];
    let borrowedInfo = null;
    
    // Modal Interchange Chance (Borrowed Chords)
    // Scale with tension so low-tension phrases stay mostly diatonic.
    const borrowChance = Math.max(0, Math.min(0.55, (context.globalTension || 0) * 0.65));
    if (rng() < borrowChance) {
        if (context.emotionalTone === 'dark' || context.emotionalTone === 'sad') {
            const borrowMap = { 'IV': 'iv', 'V': 'v', 'vi': 'bVI', 'ii': 'bII' };
        const nextRoman = borrowMap[roman] || roman;
        if (nextRoman !== roman) borrowedInfo = { type: 'modal-interchange', from: roman, to: nextRoman };
        roman = nextRoman;
        } else if (context.emotionalTone === 'dreamy') {
            const borrowMap = { 'IV': '#IV', 'I': 'Imaj7' };
        const nextRoman = borrowMap[roman] || roman;
        if (nextRoman !== roman) borrowedInfo = { type: 'color-borrow', from: roman, to: nextRoman };
        roman = nextRoman;
        }
    }

    let chordObj = null;
    if (mt) {
      const degree = romanToDegree(roman);

      if (roman.includes('b') || roman.includes('#')) {
        // Robust accidental handling: start from the diatonic chord, then transpose the root.
        // This keeps chordType consistent and ensures chordNotes exist.
        try {
          const baseDiatonic = mt.getDiatonicChord(degree, currentKey, currentScale);
          const semis = roman.includes('b') ? -1 : 1;
          const alteredRoot = (typeof mt.transposeNote === 'function')
            ? mt.transposeNote(baseDiatonic.root, semis)
            : baseDiatonic.root;

          // Important: bVII / bVI / bII should not inherit the diatonic degree's quality (e.g., viiø).
          const chordType = inferChordTypeFromRoman(roman, baseDiatonic.chordType || 'maj7');
          const chordNotes = (typeof mt.getChordNotes === 'function')
            ? (mt.getChordNotes(alteredRoot, chordType) || [])
            : (baseDiatonic.chordNotes || []);

          chordObj = {
            ...baseDiatonic,
            root: alteredRoot,
            chordType,
            chordNotes,
            // For rendering we prefer diatonicNotes when present; for chromatic chords
            // we can safely reuse chordNotes.
            diatonicNotes: chordNotes,
            fullName: (() => {
              // Keep fullName parseable by sheet's chord parser.
              if (chordType === 'maj7') return `${alteredRoot}maj7`;
              if (chordType === 'm7') return `${alteredRoot}m7`;
              if (chordType === '7') return `${alteredRoot}7`;
              if (chordType === 'm7b5') return `${alteredRoot}m7b5`;
              if (chordType === 'dim7') return `${alteredRoot}dim7`;
              if (chordType === 'dim') return `${alteredRoot}dim`;
              return `${alteredRoot}${chordType}`;
            })(),
            roman
          };
        } catch (e) {
          chordObj = mt.getDiatonicChord(degree, currentKey, currentScale);
        }
      } else {
        chordObj = mt.getDiatonicChord(degree, currentKey, currentScale);
        // Preserve the requested roman numeral for downstream logic (secondary dominants, etc.)
        try { if (chordObj) chordObj.roman = roman; } catch (_) {}
      }
    }
    
    if (!chordObj) chordObj = { root: currentKey, chordType: 'major', fullName: currentKey, roman: 'I' };
    borrowedFlags.push(borrowedInfo);
    resolvedBarChords.push(chordObj);
  }

  // Apply Voice Leading if available
  let voicings = null;
  if (vlEngine) {
      const symbols = resolvedBarChords.map(c => c.fullName);
      voicings = vlEngine.generateVoiceLeading(symbols, { 
          voicing: context.overallEnergy > 0.7 ? 'spread' : 'close',
          register: context.overallEnergy > 0.8 ? 'high' : (context.overallEnergy < 0.3 ? 'low' : 'mid')
      });
  }

  for (let bar = 0; bar < barCount; bar++) {
    const chordObj = resolvedBarChords[bar];
    const voicing = voicings ? voicings[bar] : null;
    const borrowedInfo = borrowedFlags[bar] || null;
    
    // Density logic: High energy = half notes. Low = whole.
    const density = (context.overallEnergy > 0.8) ? 2 : 1;
    const duration = beatsPerBar / density;

    for (let d = 0; d < density; d++) {
      const beat = d * duration;
      // Sample arc energy and add a slight seeded perturbation so repeated
      // generates don't produce identical contour/energy.
      let energy = (typeof arc.sample === 'function') ? Number(arc.sample((bar + (beat/beatsPerBar)) / barCount)) : 0.5;
      if (!Number.isFinite(energy)) energy = 0.5;
      try {
        const noiseRngLocal = (typeof createRNG === 'function') ? createRNG(Number(seed) ^ 0x9e3779b1) : () => Math.random();
        const perturb = ((noiseRngLocal() || 0.5) - 0.5) * 0.07;
        energy = Math.max(0, Math.min(1, energy + perturb));
      } catch (_) {}
      
      const event = {
        bar,
        beat,
        duration: duration,
        chord: chordObj.fullName,
        chordObj: chordObj,
        roman: chordObj.roman || baseProg[bar % baseProg.length],
        energy,
        texture: energy > 0.7 ? 'PLUCKED' : 'PAD'
      };

      if (borrowedInfo && borrowedInfo.to) {
        const modeLabel = borrowedInfo.type === 'modal-interchange' ? 'Modal interchange' : 'Borrowed color';
        event.explain = `${modeLabel}: ${event.chord} (${formatScaleNameForDisplay(borrowedInfo.to)}) for contrast`;
      } else if (event.roman && /[b#]/.test(String(event.roman))) {
        event.explain = `Chromatic color: ${event.chord} (${event.roman}) adds outside tension`;
      }
      
      if (voicing) {
          event.voicing = voicing.voices;
      }
      
      harmony.chordSequence.push(event);
      
      // Secondary Dominant Approach (Approach scales/chords a 5th away)
      // Insert a quick V7 of next chord on the last 8th note of the bar if energy is high
        const insertionThreshold = 0.46 - 0.08 * clamp01(context.overallEnergy || 0);
        if (d === density - 1 && bar < barCount - 1 && clamp01(energy) > insertionThreshold) {
          const nextChord = resolvedBarChords[bar+1];
          if (mt && nextChord) {
              const targetRoot = nextChord.root;
              // Find the 5th of the target root
              const approachRoot = getFifthOf(targetRoot);
              // Prefer an approach scale; higher tension biases toward Mixolydian b6 (b13 color)
              const tension = clamp01(context.globalTension || 0);
              const preferDark = tension > 0.58 && rng() > 0.35;
              const approachScaleName = preferDark ? 'mixolydian_b6' : 'mixolydian';
              const approachScaleNotes = getScaleNotesSafe(approachRoot, approachScaleName);

              // Encourage approach specifically into ii/vi by raising probability.
              const nextRoman = String(nextChord.roman || '').toLowerCase();
              const nextIsPredom = /ii|vi/.test(nextRoman);
              const prob = nextIsPredom ? 0.65 : 0.25;
              if (rng() > prob) {
                // Skip insertion this bar
                continue;
              }

              const domType = (approachScaleName === 'mixolydian_b6') ? '7b13' : '7';
              const domNotes = (typeof mt.getChordNotes === 'function') ? (mt.getChordNotes(approachRoot, domType) || []) : [];
              const dom7 = {
                root: approachRoot,
                chordType: domType,
                chordNotes: domNotes,
                diatonicNotes: domNotes,
                fullName: domType === '7b13' ? `${approachRoot}7b13` : `${approachRoot}7`,
                roman: `V7/${nextChord.roman}`
              };
              
              // Shorten previous event to make room
              event.duration -= 0.5;
              
              harmony.chordSequence.push({
                  bar,
                  beat: beatsPerBar - 0.5,
                  duration: 0.5,
                  chord: dom7.fullName,
                  chordObj: dom7,
                  roman: dom7.roman,
                  scaleHint: {
                    root: approachRoot,
                    scaleName: approachScaleName,
                    scaleNotes: approachScaleNotes,
                    reason: nextIsPredom ? 'approach-of-predominant' : 'secondary-dominant-approach'
                  },
                  scaleHintNotes: approachScaleNotes,
                    explain: `${dom7.fullName} (${dom7.roman}) — approach into ${nextChord.fullName} (${formatScaleNameForDisplay(approachScaleName)})`,
                  energy: energy * 1.1,
                  texture: 'STACCATO'
              });
          }
      }
    }
  }

  // End-of-phrase "color shift": briefly borrow tonic Mixolydian b6, then resolve back to home scale.
  // Keeps the harmony stable but darkens melody/harmonic color right before the cadence.
  try {
    const tone = String(context.emotionalTone || '').toLowerCase();
    const tension = clamp01(context.globalTension || 0);
    const allowColor = ['joyful', 'hopeful', 'playful', 'balanced', 'calm', 'dreamy'].includes(tone);
    if (allowColor && tension > 0.45 && mt && barCount >= 2) {
      const tonic = currentKey;
      const borrowedScaleName = 'mixolydian_b6';
      const borrowedNotes = getScaleNotesSafe(tonic, borrowedScaleName);
      const homeNotes = Array.isArray(context.harmonicProfile.scaleNotes) ? context.harmonicProfile.scaleNotes : getScaleNotesSafe(tonic, currentScale);
      // Find last-bar chord event (beat 0), then split into (borrowed 3.5 beats) + (home 0.5 beat)
      const lastBarIdx = barCount - 1;
      const lastEvt = harmony.chordSequence.find(ev => ev && ev.bar === lastBarIdx && ev.beat === 0);
      if (lastEvt && borrowedNotes && borrowedNotes.length && homeNotes && homeNotes.length && lastEvt.duration > 1) {
        lastEvt.scaleHint = {
          root: tonic,
          scaleName: borrowedScaleName,
          scaleNotes: borrowedNotes,
          reason: 'end-color-shift'
        };
        lastEvt.scaleHintNotes = borrowedNotes;
        lastEvt.explain = `End color shift: borrow ${tonic} ${formatScaleNameForDisplay(borrowedScaleName)} before resolution`;
        const endBeat = Math.max(0, beatsPerBar - 0.5);
        // Reduce the main last event if it spans the endBeat
        if (endBeat > lastEvt.beat && (lastEvt.beat + lastEvt.duration) >= beatsPerBar) {
          lastEvt.duration = Math.max(0.5, beatsPerBar - 0.5);
          harmony.chordSequence.push({
            bar: lastBarIdx,
            beat: endBeat,
            duration: 0.5,
            chord: lastEvt.chord,
            chordObj: lastEvt.chordObj,
            roman: lastEvt.roman,
            energy: lastEvt.energy,
            texture: lastEvt.texture,
            scaleHint: { root: tonic, scaleName: currentScale, scaleNotes: homeNotes, reason: 'cadence-resolution' },
            scaleHintNotes: homeNotes,
            explain: `Resolve: return to ${tonic} ${formatScaleNameForDisplay(currentScale)} for cadence`
          });
        }
      }
    }
  } catch (_) {}

  return harmony;
}

function generateMelody(context, arc, harmony, seed = 0) {
  const rng = createRNG(seed + 1);
  const mt = window.modularApp && window.modularApp.musicTheory;
  const baseScale = context.harmonicProfile.scaleNotes || ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const totalBeats = arc.totalBeats || 16;
  const beatsPerBar = arc.beatsPerBar || 4;

  // --- Semantic setup ---
  const lexMeta = (context.metadata && context.metadata.lexical) || {};
  const perWordValues = lexMeta.perWordValues || [];
  const avgValence = lexMeta.avgValence || 0;
  const valenceTrajectory = (context.semanticTrajectory && context.semanticTrajectory.valenceTrajectory) || 0;

  // Align word-level semantics to syllable positions
  const syllableSemantics = [];
  (context.wordTokens || []).forEach((wt, wIdx) => {
    const lex = perWordValues[wIdx] || { valence: 0, arousal: 0, dominance: 0 };
    wt.syllables.forEach(syl => {
      syllableSemantics.push({
        valence: lex.valence || 0,
        arousal: lex.arousal || 0,
        role: syl.role || 'hold',
        isMelismatic: !!syl.isMelismatic,
        pitchValue: syl.pitchValue || 0.5
      });
    });
  });
  const totalSems = syllableSemantics.length || 1;

  // Find the single most emotionally charged syllable — this becomes the melodic climax
  let climaxSylIdx = 0;
  let climaxScore = -Infinity;
  syllableSemantics.forEach((s, i) => {
    const score = Math.abs(s.valence) * 1.5 + Math.abs(s.arousal) * 0.8 + (s.role === 'peak' ? 0.4 : 0);
    if (score > climaxScore) { climaxScore = score; climaxSylIdx = i; }
  });

  // Starting pitch: negative sentiment → start higher (room to descend); positive → start lower (room to rise)
  let octave = 4;
  let previousScaleIndex = avgValence < -0.2
    ? Math.floor(baseScale.length * 0.65)
    : Math.floor(baseScale.length * 0.38);
  let currentTime = 0;
  let lastJump = 0;
  let lastScaleKey = 'base';
  let previousPitchClass = baseScale[Math.max(0, Math.min(baseScale.length - 1, previousScaleIndex))] || baseScale[0];

  const clampIndex = (idx, len) => {
    if (len <= 0) return 0;
    let i = idx;
    while (i >= len) i -= len;
    while (i < 0) i += len;
    return i;
  };

  const findActiveHarmonyEvent = (barIdx, beatInBar) => {
    const events = (harmony && Array.isArray(harmony.chordSequence)) ? harmony.chordSequence : [];
    let best = null;
    for (const ev of events) {
      if (!ev || ev.bar !== barIdx || !Number.isFinite(ev.beat)) continue;
      const start = ev.beat;
      const dur = Number.isFinite(ev.duration) ? ev.duration : beatsPerBar;
      const end = start + dur;
      if (beatInBar >= start - 1e-6 && beatInBar < end - 1e-6) {
        if (!best || start > best.beat) best = ev;
      }
    }
    return best;
  };

  const scaleKeyOf = (scaleNotes, label) => {
    if (!Array.isArray(scaleNotes) || !scaleNotes.length) return label || 'unknown';
    return `${label || 'scale'}:${scaleNotes.join(',')}`;
  };

  const nearestScaleIndexForPitch = (scaleNotes, pitchClass) => {
    if (!Array.isArray(scaleNotes) || !scaleNotes.length) return 0;
    const pc = String(pitchClass || '').replace(/\d+$/, '').trim();
    if (!pc) return 0;
    const exact = scaleNotes.findIndex(n => String(n).replace(/\d+$/, '') === pc);
    if (exact >= 0) return exact;
    if (!mt || !mt.noteValues) return 0;
    const pcVal = mt.noteValues[pc];
    if (!Number.isFinite(pcVal)) return 0;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < scaleNotes.length; i++) {
      const n = String(scaleNotes[i]).replace(/\d+$/, '');
      const v = mt.noteValues[n];
      if (!Number.isFinite(v)) continue;
      const d = Math.min((pcVal - v + 12) % 12, (v - pcVal + 12) % 12);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx;
  };

  const melody = { notes: [], scaleUsed: baseScale };
  const allSyllables = [];
  (context.wordTokens || []).forEach(word => {
    word.syllables.forEach(s => allSyllables.push({ ...s, parentWord: word.originalWord }));
  });

  const rhythmHistory = [];
  let sylIndex = 0;
  let climaxUsed = false;

  while (currentTime < totalBeats) {
    const t = currentTime / totalBeats;
    const arcEnergy = arc.sample(t);
    const activeSyl = allSyllables[sylIndex % allSyllables.length];
    if (!activeSyl) break;

    const semIdx = sylIndex % totalSems;
    const sem = syllableSemantics[semIdx] || { valence: 0, arousal: 0, role: 'hold', isMelismatic: false, pitchValue: 0.5 };

    // Energy: arc shape (60%) blended with word arousal (40%) — unique per word
    const arousal01 = (sem.arousal + 1) / 2;
    const energy = arcEnergy * 0.6 + arousal01 * 0.4;

    // --- Pick active scale (approach / borrowed) for this beat, if harmony tagged one ---
    const barIdx = Math.floor(currentTime / beatsPerBar);
    const beatInBar = currentTime % beatsPerBar;
    const hEv = findActiveHarmonyEvent(barIdx, beatInBar);
    const hinted = hEv && Array.isArray(hEv.scaleHintNotes) && hEv.scaleHintNotes.length ? hEv.scaleHintNotes : null;
    const activeScale = hinted || baseScale;
    const activeScaleKey = hinted ? scaleKeyOf(activeScale, (hEv && hEv.scaleHint && hEv.scaleHint.scaleName) ? hEv.scaleHint.scaleName : 'hint') : 'base';
    if (activeScaleKey !== lastScaleKey) {
      previousScaleIndex = nearestScaleIndexForPitch(activeScale, previousPitchClass);
      lastScaleKey = activeScaleKey;
    }

    // Climax fires once at the most emotionally charged syllable
    const isClimax = (semIdx === climaxSylIdx) && !climaxUsed;
    if (isClimax) climaxUsed = true;

    // Duration: climax gets a held note; otherwise driven by arousal/energy
    let duration;
    if (isClimax) {
      duration = 2.0;
    } else if (energy < 0.28) {
      duration = 2.0;
    } else if (energy < 0.5) {
      duration = 1.0;
    } else {
      duration = 0.5;
    }

    // Break runs of 3+ identical durations (Rule of Thirds)
    if (!isClimax && rhythmHistory.length >= 2 &&
        rhythmHistory[rhythmHistory.length-1] === duration &&
        rhythmHistory[rhythmHistory.length-2] === duration) {
      duration = (duration === 1.0) ? 0.5 : 1.0;
    }
    rhythmHistory.push(duration);

    // --- Pitch: semantics-first interval selection ---
    const roll = rng();
    let targetIdx = previousScaleIndex;

    if (Math.abs(lastJump) > 3) {
      // Gap-fill: must resolve opposite direction
      targetIdx = previousScaleIndex + (lastJump > 0 ? -1 : 1);
      lastJump = 0;
    } else if (isClimax) {
      // Climax lands on the most dramatic note: high for positive, low for negative
      targetIdx = sem.valence >= 0
        ? activeScale.length - 1 - (roll > 0.5 ? 1 : 0)
        : (roll > 0.5 ? 1 : 0);
    } else {
      const v = sem.valence;
      const a = sem.arousal;
      let interval;

      // Each emotional quadrant has its own characteristic gesture palette.
      // The RNG picks within the palette — variety without randomness.
      if (v > 0.35 && a > 0.2) {
        // Joyful + excited → leaping upward
        const opts = [3, 4, 2, 5, 2];
        interval = opts[Math.floor(roll * opts.length)];
      } else if (v > 0.35 && a <= 0.2) {
        // Content + calm → gentle rise
        const opts = [1, 2, 1, 0, 2];
        interval = opts[Math.floor(roll * opts.length)];
      } else if (v < -0.35 && a > 0.2) {
        // Angry + tense → descend with jagged energy
        const opts = [-2, -3, 2, -1, -3];
        interval = opts[Math.floor(roll * opts.length)];
      } else if (v < -0.35 && a <= 0.2) {
        // Sad + tender → gentle descent
        const opts = [-1, -2, -1, 0, -2];
        interval = opts[Math.floor(roll * opts.length)];
      } else {
        // Neutral: energy-based with small valence nudge
        if (energy < 0.3) {
          interval = roll > 0.55 ? 1 : roll > 0.1 ? -1 : 0;
        } else if (energy < 0.65) {
          interval = roll > 0.7 ? 2 : roll > 0.4 ? 1 : roll > 0.1 ? -1 : -2;
        } else {
          const opts = [4, 3, 2, 5, 3];
          interval = opts[Math.floor(roll * opts.length)];
        }
        if (v > 0.1) interval += 1;
        else if (v < -0.1) interval -= 1;
      }

      // Syllable role refines direction within the palette
      if (sem.role === 'peak') interval = Math.max(interval + 1, 2);
      else if (sem.role === 'rise') interval = Math.max(interval, 1);
      else if (sem.role === 'fall') interval = Math.min(interval, -1);

      // Vowel brightness: bright vowels (i, y) nudge up; dark vowels (u, o) nudge down
      if (sem.pitchValue > 0.75) interval += 1;
      else if (sem.pitchValue < 0.25) interval -= 1;

      // Sentence trajectory drift: second half bends toward the sentence's overall direction
      if (t > 0.5 && Math.abs(valenceTrajectory) > 0.25) {
        interval += valenceTrajectory > 0 ? 1 : -1;
      }

      targetIdx = previousScaleIndex + interval;
    }

    // Wrap/clamp to scale with octave tracking
    while (targetIdx >= activeScale.length) { targetIdx -= activeScale.length; octave = Math.min(6, octave + 1); }
    while (targetIdx < 0) { targetIdx += activeScale.length; octave = Math.max(3, octave - 1); }

    // If harmony hinted an approach/borrow scale, bias toward characteristic tones near cadence.
    // This makes Mixolydian (b7) and Mixolydian b6 (b6+b7) audibly/visibly show up.
    try {
      const hintMeta = hEv && hEv.scaleHint ? hEv.scaleHint : null;
      const scaleName = hintMeta && hintMeta.scaleName ? String(hintMeta.scaleName) : '';
      const reason = hintMeta && hintMeta.reason ? String(hintMeta.reason) : '';
      const nearEnd = (t > 0.72) || reason === 'end-color-shift' || reason === 'cadence-resolution' || /approach/.test(reason);
      if (hinted && nearEnd && activeScale.length >= 7 && rng() > 0.35) {
        let candidates = null;
        if (scaleName === 'mixolydian_b6') candidates = [5, 6];
        else if (scaleName === 'mixolydian') candidates = [6];
        if (candidates && candidates.length) {
          let best = candidates[0];
          let bestDist = Math.abs(best - targetIdx);
          for (const c of candidates) {
            const dist = Math.abs(c - targetIdx);
            if (dist < bestDist) { bestDist = dist; best = c; }
          }
          targetIdx = best;
        }
      }
    } catch (_) {}

    lastJump = targetIdx - previousScaleIndex;
    previousScaleIndex = targetIdx;

    // --- Melisma: emotionally charged syllables spread across 2 notes ---
    // Triggered only when the syllable is marked complex, has meaningful emotional weight,
    // and the duration is long enough to split without creating overly fast notes.
    const emotionalWeight = Math.abs(sem.valence) * 0.6 + Math.abs(sem.arousal) * 0.4;
    const wantsMelisma = sem.isMelismatic
      && duration >= 1.0
      && (sem.role === 'peak' || emotionalWeight > 0.4)
      && rng() > 0.35;

    if (wantsMelisma) {
      const melDur = duration / 2;
      melody.notes.push({
        bar: Math.floor(currentTime / beatsPerBar),
        beat: currentTime % beatsPerBar,
        noteName: `${activeScale[clampIndex(targetIdx, activeScale.length)]}${octave}`,
        duration: melDur,
        syllable: activeSyl.text,
        word: activeSyl.parentWord,
        scaleName: (hEv && hEv.scaleHint && hEv.scaleHint.scaleName) ? hEv.scaleHint.scaleName : context.harmonicProfile.recommendedScale,
        scaleRoot: (hEv && hEv.scaleHint && hEv.scaleHint.root) ? hEv.scaleHint.root : context.harmonicProfile.root
      });
      previousPitchClass = String(activeScale[clampIndex(targetIdx, activeScale.length)] || previousPitchClass).replace(/\d+$/, '');
      // Second note steps in emotional direction: positive → up, negative → down
      const melStep = sem.valence >= 0 ? 1 : -1;
      let melIdx = targetIdx + melStep;
      let melOct = octave;
      while (melIdx >= activeScale.length) { melIdx -= activeScale.length; melOct = Math.min(6, melOct + 1); }
      while (melIdx < 0) { melIdx += activeScale.length; melOct = Math.max(3, melOct - 1); }
      const t2 = currentTime + melDur;
      melody.notes.push({
        bar: Math.floor(t2 / beatsPerBar),
        beat: t2 % beatsPerBar,
        noteName: `${activeScale[clampIndex(melIdx, activeScale.length)]}${melOct}`,
        duration: melDur,
        syllable: activeSyl.text,
        word: activeSyl.parentWord,
        scaleName: (hEv && hEv.scaleHint && hEv.scaleHint.scaleName) ? hEv.scaleHint.scaleName : context.harmonicProfile.recommendedScale,
        scaleRoot: (hEv && hEv.scaleHint && hEv.scaleHint.root) ? hEv.scaleHint.root : context.harmonicProfile.root
      });
      previousScaleIndex = melIdx;
      lastJump = melIdx - targetIdx;
      previousPitchClass = String(activeScale[clampIndex(melIdx, activeScale.length)] || previousPitchClass).replace(/\d+$/, '');
    } else {
      melody.notes.push({
        bar: Math.floor(currentTime / beatsPerBar),
        beat: currentTime % beatsPerBar,
        noteName: `${activeScale[clampIndex(targetIdx, activeScale.length)]}${octave}`,
        duration: duration,
        syllable: activeSyl.text,
        word: activeSyl.parentWord,
        scaleName: (hEv && hEv.scaleHint && hEv.scaleHint.scaleName) ? hEv.scaleHint.scaleName : context.harmonicProfile.recommendedScale,
        scaleRoot: (hEv && hEv.scaleHint && hEv.scaleHint.root) ? hEv.scaleHint.root : context.harmonicProfile.root
      });
      previousPitchClass = String(activeScale[clampIndex(targetIdx, activeScale.length)] || previousPitchClass).replace(/\d+$/, '');
    }

    currentTime += duration;
    sylIndex++;
  }
  return melody;
}

function buildScaleTimeline(context, arc, harmony) {
  const beatsPerBar = (arc && Number.isFinite(arc.beatsPerBar)) ? arc.beatsPerBar : 4;
  const totalBeats = (arc && Number.isFinite(arc.totalBeats))
    ? arc.totalBeats
    : (arc && Number.isFinite(arc.bars) && Number.isFinite(arc.beatsPerBar))
      ? arc.bars * arc.beatsPerBar
      : 16;

  const homeRoot = (context && context.harmonicProfile && context.harmonicProfile.root) ? context.harmonicProfile.root : 'C';
  const homeScaleName = (context && context.harmonicProfile && context.harmonicProfile.recommendedScale) ? context.harmonicProfile.recommendedScale : 'major';
  const homeNotes = (context && context.harmonicProfile && Array.isArray(context.harmonicProfile.scaleNotes) && context.harmonicProfile.scaleNotes.length)
    ? context.harmonicProfile.scaleNotes
    : null;

  const step = 0.5;
  const steps = Math.max(1, Math.ceil(totalBeats / step));
  const grid = Array.from({ length: steps }, () => ({
    root: homeRoot,
    scaleName: homeScaleName,
    scaleNotes: homeNotes,
    reason: 'home'
  }));

  const events = (harmony && Array.isArray(harmony.chordSequence)) ? harmony.chordSequence : [];
  for (const ev of events) {
    if (!ev || !ev.scaleHint || !Array.isArray(ev.scaleHintNotes) || !ev.scaleHintNotes.length) continue;
    const startBeat = (Number(ev.bar) * beatsPerBar) + Number(ev.beat || 0);
    const dur = Number.isFinite(ev.duration) ? Number(ev.duration) : 0;
    if (!Number.isFinite(startBeat) || !Number.isFinite(dur) || dur <= 0) continue;
    const endBeat = startBeat + dur;
    const i0 = Math.max(0, Math.floor(startBeat / step));
    const i1 = Math.min(steps, Math.ceil(endBeat / step));
    for (let i = i0; i < i1; i++) {
      grid[i] = {
        root: (ev.scaleHint && ev.scaleHint.root) ? ev.scaleHint.root : homeRoot,
        scaleName: (ev.scaleHint && ev.scaleHint.scaleName) ? ev.scaleHint.scaleName : homeScaleName,
        scaleNotes: ev.scaleHintNotes,
        reason: (ev.scaleHint && ev.scaleHint.reason) ? ev.scaleHint.reason : 'borrow'
      };
    }
  }

  const timeline = [];
  const keyOf = (x) => `${x.root}|${x.scaleName}|${Array.isArray(x.scaleNotes) ? x.scaleNotes.join(',') : ''}|${x.reason}`;
  let runStart = 0;
  for (let i = 1; i <= grid.length; i++) {
    const prev = grid[i - 1];
    const curr = grid[i];
    if (i === grid.length || keyOf(prev) !== keyOf(curr)) {
      timeline.push({
        startBeat: runStart * step,
        endBeat: i * step,
        root: prev.root,
        scaleName: prev.scaleName,
        scaleNotes: prev.scaleNotes,
        reason: prev.reason
      });
      runStart = i;
    }
  }

  // clamp final endBeat
  if (timeline.length) {
    timeline[timeline.length - 1].endBeat = totalBeats;
  }
  return timeline;
}

function createRNG(seed) {
  let state = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function getFifthOf(note) {
    if (!note) return 'C';
    const cleanNote = note.replace(/\d+$/, '').replace(/m$/, '');
    const cycle = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    const idx = cycle.indexOf(cleanNote);
    if (idx === -1) return cleanNote;
    return cycle[(idx + 1) % cycle.length];
}
