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
                // arcShapeKey carries an emotional TONE ("angry", "calm"), not
                // a shape name. Every tone missed this table and fell through
                // to `rising`, which is why the arc always climbed to the right
                // no matter what was typed.
                const toneShapes = {
                  joyful: 'rising', hopeful: 'rising', playful: 'wave',
                  sad: 'falling', dark: 'valley', sorrow: 'falling',
                  angry: 'peak', intense: 'peak', mysterious: 'wave',
                  dreamy: 'wave', calm: 'flat', peaceful: 'flat',
                  balanced: 'peak'
                };
                const mapped = toneShapes[shapeKey] || shapeKey;
                template = fallbacks[mapped] || fallbacks.peak;
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

  // Changing the key/scale after generating should carry the music with it.
  const bindKeyFollow = () => {
    const lib = window.modularApp && window.modularApp.scaleLibrary;
    if (lib && typeof lib.on === 'function' && !lib.__arcKeyFollow) {
      lib.__arcKeyFollow = true;
      lib.on('scaleChanged', ({ key, scale } = {}) => {
        if (!window.__lastGenInputs) return;
        // Numeric progressions rebuild themselves; only re-key word-generated music.
        if (window.NumericProgression && window.NumericProgression.state.degrees.length) return;
        rekeyLastGeneration(key, scale);
      });
    }
    const sel = document.getElementById('key-select');
    if (sel && !sel.__arcKeyFollow) {
      sel.__arcKeyFollow = true;
      sel.addEventListener('change', () => {
        if (!window.__lastGenInputs) return;
        if (window.NumericProgression && window.NumericProgression.state.degrees.length) return;
        rekeyLastGeneration(sel.value, null);
      });
    }
  };
  bindKeyFollow();
  // The key control is rendered later by other modules, so keep watching.
  try {
    const obs = new MutationObserver(() => bindKeyFollow());
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}

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

    // If context/arc not provided, build them from the timeline payload.
    // Run the full ContextEngine over the raw input so word meaning (NRC/word-db
    // valence/arousal, tone, arc shape, time signature) actually reaches the
    // generators — previously only syllable heuristics survived to this point.
    if (!context || !arc) {
      // Parse WITHOUT the variation seed: the same words should always map to the
      // same key/scale/tone, while the seed varies the musical take (progression
      // choice, approach strategies, melody rolls) downstream.
      let rich = null;
      try {
        if (typeof ContextEngine === 'function' && input && String(input).trim().length) {
          rich = new ContextEngine().parseInput(String(input));
        }
      } catch (err) {
        console.warn('[ArcInit] ContextEngine parse failed, falling back to contour profile', err);
        rich = null;
      }

      const lexical = (rich && rich.metadata && rich.metadata.lexical) || null;
      const settings = (typeof window !== 'undefined' && window.__lexicalSettings) || {};
      const keyVariety = settings.keyVariety !== false;

      // Word character drives tone/energy/tension. The emotion lexicon only
      // covers a few hundred words, so on its own it reported almost every
      // real phrase as low-energy "calm" — which is why every generation
      // sounded alike regardless of what was typed.
      let phraseChar = null;
      try {
        if (typeof WordCharacterEngine !== 'undefined' && input) {
          phraseChar = WordCharacterEngine.phraseCharacter(String(input));
        }
      } catch (_) { phraseChar = null; }
      const charTone = (phraseChar && phraseChar.matchedCount > 0 && typeof WordCharacterEngine !== 'undefined')
        ? WordCharacterEngine.toneFor(phraseChar)
        : null;

      // Key: derived from the words unless the user disabled key variety.
      const derivedRoot = keyVariety ? deriveRootFromLexical(lexical, String(input || '')) : null;
      // An explicitly chosen key wins over the word-derived one — once the user
      // picks a key, later generations stay there.
      const userKey = (typeof window !== 'undefined' && window.__userKeyOverride) ? window.__userKeyOverride.key : null;
      const rootNote = userKey || derivedRoot || _studioKey;

      // Scale: prefer the curated ScaleIntelligenceEngine pick (playable 7-note
      // scales with sensible diatonic chords) over ContextEngine's all-scales
      // interval-physics choice, which favors obscure cluster scales.
      let scaleName = null;
      try {
        if (typeof ScaleIntelligenceEngine !== 'undefined' && lexical) {
          const weights = (typeof window !== 'undefined' && window.__lexicalWeights) || {};
          const emotionalWeight = Number.isFinite(weights.emotional) ? weights.emotional : 0.3;
          const sel = new ScaleIntelligenceEngine().selectScale({
            ...lexical,
            avgValence: (lexical.avgValence || 0) * (0.5 + emotionalWeight * 1.5),
            avgArousal: (lexical.avgArousal || 0) * (0.5 + emotionalWeight * 1.5),
            forceTone: charTone || (rich && rich.emotionalTone) || null,
            words: String(input || '').toLowerCase().split(/\s+/).filter(Boolean)
          });
          if (sel && sel.name) scaleName = sel.name;
        }
      } catch (_) {}
      scaleName = scaleName
        || (rich && rich.harmonicProfile && rich.harmonicProfile.recommendedScale)
        || (profile && profile.recommendedScale)
        || _studioScale;

      let scaleNotes = [];
      try {
        if (_mt && typeof _mt.getScaleNotesWithKeySignature === 'function') {
          scaleNotes = _mt.getScaleNotesWithKeySignature(rootNote, scaleName) || [];
        } else if (_mt && typeof _mt.getScaleNotes === 'function') {
          scaleNotes = _mt.getScaleNotes(rootNote, scaleName) || [];
        }
      } catch (_) {}
      if (!scaleNotes.length) scaleNotes = _resolvedNotes;

      const timeSignature = (rich && rich.timeSignature) || '4/4';
      const tsMatch = String(timeSignature).match(/^(\d+)\s*\/\s*(\d+)$/);
      const beatsPerBar = tsMatch ? Math.max(2, Math.min(7, parseInt(tsMatch[1], 10) || 4)) : 4;

      const profileEnergy = (profile && typeof profile.overallEnergy === 'number') ? profile.overallEnergy : 0.5;
      const profileTension = (profile && typeof profile.globalTension === 'number') ? profile.globalTension : 0.5;
      const richIntensity = (rich && typeof rich.intensity === 'number') ? rich.intensity : null;
      const richComplexity = (rich && rich.metadata && typeof rich.metadata.complexity === 'number') ? rich.metadata.complexity : null;

      // Character-derived energy/tension: motion and attack ARE energy, and a
      // word's tension is the real driver of harmonic spice.
      const charEnergy = phraseChar
        ? Math.max(0.05, Math.min(0.98,
            phraseChar.motion * 0.45 + phraseChar.attack * 0.25 + (phraseChar.arousal + 1) / 2 * 0.3))
        : null;
      const charTension = phraseChar
        ? Math.max(0.05, Math.min(0.98, phraseChar.tension * 0.7 + Math.max(0, -phraseChar.valence) * 0.3))
        : null;

      const blendedEnergy = richIntensity !== null ? (profileEnergy * 0.5 + richIntensity * 0.5) : profileEnergy;
      const blendedTension = richComplexity !== null ? (profileTension * 0.5 + richComplexity * 0.5) : profileTension;

      context = {
          emotionalTone: charTone || (rich && rich.emotionalTone) || (profile && profile.contourArchetype) || 'balanced',
          performanceIntent: (rich && rich.performanceIntent) || (profile && profile.densityArchetype) || 'steady',
          overallEnergy: charEnergy !== null ? (charEnergy * 0.65 + blendedEnergy * 0.35) : blendedEnergy,
          globalTension: charTension !== null ? (charTension * 0.65 + blendedTension * 0.35) : blendedTension,
          wordCharacter: phraseChar,
          timeSignature,
          harmonicProfile: {
              recommendedScale: scaleName,
              root: rootNote,
              scaleNotes
          },
          arcShapeKey: charTone || (rich && rich.arcShapeKey) || (profile && profile.contourArchetype) || 'balanced',
          wordTokens: (profile && profile.wordTokens) || [],
          semanticTrajectory: (rich && rich.semanticTrajectory) || null,
          metadata: (rich && rich.metadata) || null
      };

      // Keep the studio scale library in sync with the generated key so the rest
      // of the app (fretboard, piano, sheet) reflects what was generated.
      try {
        if (_scaleLib && typeof _scaleLib.setKeyAndScale === 'function'
            && (rootNote !== _studioKey || scaleName !== _studioScale)) {
          _scaleLib.setKeyAndScale(rootNote, scaleName);
        }
      } catch (_) {}

      arc = {
          bars: 4,
          beatsPerBar,
          totalBeats: 4 * beatsPerBar,
          sample: (t) => {
              // A single point (or none) has no segment to interpolate across —
              // reading p1/p2 blindly threw here.
              if (!points || points.length === 0) return 0.5;
              if (points.length === 1) return 1.0 - (Number(points[0].yNorm) || 0.5);
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

    // User-facing complexity controls (sliders in the timeline panel).
    context.complexityControls = (typeof window !== 'undefined' && window.__arcComplexity)
      ? { ...window.__arcComplexity }
      : (context.complexityControls || { rhythm: 0.5, melody: 0.5, color: 0.5 });

    const harmony = generateHarmony(context, arc, seed);
    const melody = generateMelody(context, arc, harmony, seed);
    revoiceHarmonyAgainstMelody(harmony, melody, context);
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
      // Keep the ingredients so voicing/voice-leading changes can re-voice the
      // same music without the user having to retype and regenerate.
      window.__lastGenInputs = { context, arc, seed, input };
    } catch (_) {}

    // Show quick chord-origin explanations for any borrowed/approach/modulation events.
    try {
      queueChordOriginToasts(generatedMusic);
    } catch (_) {}

    document.dispatchEvent(new CustomEvent('musicGenerated', { detail: generatedMusic }));
  });
});

/**
 * Re-run generation on the LAST context/arc/seed. Used when a setting that
 * affects how the music is voiced or coloured changes (voicing style, register,
 * per-chord overrides) so the user does not have to retype and regenerate.
 */
/**
 * Re-key the last generation. The seed is kept, so every musical decision
 * (progression template, approach choices, contour, rhythm) is preserved — the
 * same piece is simply rebuilt in the new key/scale rather than transposed
 * note-by-note, which keeps chord spellings and borrowed scales correct.
 */
function rekeyLastGeneration(newKey, newScale) {
  const inputs = (typeof window !== 'undefined') ? window.__lastGenInputs : null;
  if (!inputs || !inputs.context) return false;
  const hp = inputs.context.harmonicProfile || (inputs.context.harmonicProfile = {});
  const key = newKey || hp.root;
  const scale = newScale || hp.recommendedScale;
  if (key === hp.root && scale === hp.recommendedScale) return false;

  const mt = window.modularApp && window.modularApp.musicTheory;
  let notes = [];
  try {
    if (mt && typeof mt.getScaleNotesWithKeySignature === 'function') {
      notes = mt.getScaleNotesWithKeySignature(key, scale) || [];
    } else if (mt && typeof mt.getScaleNotes === 'function') {
      notes = mt.getScaleNotes(key, scale) || [];
    }
  } catch (_) {}

  hp.root = key;
  hp.recommendedScale = scale;
  if (notes.length) hp.scaleNotes = notes;

  // A key the user picked outranks the word-derived key on later generates too.
  try { window.__userKeyOverride = { key, scale }; } catch (_) {}

  return regenerateLastGeneration('key-change');
}
if (typeof window !== 'undefined') window.rekeyLastGeneration = rekeyLastGeneration;

function regenerateLastGeneration(reason = 'settings-change') {
  const inputs = (typeof window !== 'undefined') ? window.__lastGenInputs : null;
  if (!inputs || !inputs.context || !inputs.arc) return false;
  try {
    const { context, arc, seed, input } = inputs;
    context.complexityControls = (typeof window !== 'undefined' && window.__arcComplexity)
      ? { ...window.__arcComplexity }
      : context.complexityControls;

    const harmony = generateHarmony(context, arc, seed);
    const melody = generateMelody(context, arc, harmony, seed);
    revoiceHarmonyAgainstMelody(harmony, melody, context);
    const scaleTimeline = buildScaleTimeline(context, arc, harmony);
    const generatedMusic = {
      harmony, melody, scaleTimeline, context, arc, seed,
      traceId: `arc-${Date.now().toString(36)}`,
      input,
      regeneratedFor: reason,
      timestamp: new Date().toISOString()
    };
    window.__lastMusicGenerated = generatedMusic;
    document.dispatchEvent(new CustomEvent('musicGenerated', { detail: generatedMusic }));
    return true;
  } catch (err) {
    console.warn('[ArcInit] regenerate failed', err);
    return false;
  }
}
if (typeof window !== 'undefined') window.regenerateLastGeneration = regenerateLastGeneration;

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
    peaceful: [
      ['I', 'IV', 'I', 'V'],
      ['I', 'iii', 'IV', 'I'],
      ['I', 'vi', 'IV', 'I']
    ],
    balanced: [
      ['I', 'V', 'vi', 'IV'],
      ['I', 'vi', 'IV', 'V'],
      ['I', 'IV', 'V', 'I'],
      ['vi', 'IV', 'I', 'V']
    ]
  };

  const toneTemplates = progressionLibrary[context.emotionalTone] || progressionLibrary.balanced;
  let baseProg = Array.isArray(toneTemplates[0])
    ? toneTemplates[Math.max(0, Math.min(toneTemplates.length - 1, Math.floor(rng() * toneTemplates.length)))]
    : toneTemplates;
  const harmony = { chordSequence: [], context };

  // MODAL-BLEND CADENCE ("the triumphant lift").
  //
  // A minor key already contains two major triads sitting a step apart on its
  // ♭6 and ♭7 — in C minor those are A♭ and B♭. Walking them up into a MAJOR
  // tonic turns the ending from resigned to triumphant without leaving the
  // parent scale until the very last chord, which is the only borrowed note in
  // the gesture. This is a deliberate set-piece placed at the cadence, not a
  // per-bar dice roll, so the arrival is intentional and lands in the same
  // place every take at a given seed.
  const ccCad = context.complexityControls || { color: 0.5 };
  const minorTone = /dark|sad|angry|intense|mysterious/.test(String(context.emotionalTone || ''));
  let picardyBar = -1;
  if (minorTone && barCount >= 3) {
    // Lifts are a payoff, so they want either an emotional arc that has been
    // building or an explicit appetite for colour.
    const lift = clamp01((context.globalTension || 0) * 0.5 + (ccCad.color || 0.5) * 0.5);
    if (rng() < lift * 0.75) {
      const prog = baseProg.slice(0, Math.max(1, barCount));
      while (prog.length < barCount) prog.push(baseProg[prog.length % baseProg.length]);
      prog[barCount - 3] = 'bVI';
      prog[barCount - 2] = 'bVII';
      prog[barCount - 1] = 'I';
      baseProg = prog;
      picardyBar = barCount - 1;
    }
  }

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
    // Scales with tension and with the user's harmonic-color setting.
    const ccBorrow = context.complexityControls || { color: 0.5 };
    const borrowChance = Math.max(0, Math.min(0.7, (context.globalTension || 0) * 0.45 + (ccBorrow.color || 0.5) * 0.35));
    // The modal-blend cadence is a composed gesture; a random substitution
    // landing on one of its three bars would break the ♭VI–♭VII–I shape that
    // makes the lift work.
    const inCadence = picardyBar >= 0 && bar >= picardyBar - 2;
    if (!inCadence && rng() < borrowChance) {
        const tone = context.emotionalTone;
        let borrowMap = null;
        let borrowType = 'modal-interchange';
        if (tone === 'dark' || tone === 'sad' || tone === 'angry' || tone === 'intense') {
            borrowMap = { 'IV': 'iv', 'V': 'v', 'vi': 'bVI', 'ii': 'bII' };
        } else if (tone === 'dreamy') {
            borrowMap = { 'IV': '#IV', 'I': 'Imaj7' };
            borrowType = 'color-borrow';
        } else if (tone === 'mysterious') {
            borrowMap = { 'IV': 'iv', 'V': 'bVII', 'ii': 'bII' };
        } else {
            // Bright/neutral tones get gentle minor-plagal / backdoor color.
            borrowMap = { 'IV': 'iv', 'V': 'bVII' };
            borrowType = 'color-borrow';
        }
        const nextRoman = (borrowMap && borrowMap[roman]) || roman;
        if (nextRoman !== roman) borrowedInfo = { type: borrowType, from: roman, to: nextRoman };
        roman = nextRoman;
    }

    let chordObj = null;
    if (mt) {
      const degree = romanToDegree(roman);

      if (roman.includes('b') || roman.includes('#')) {
        // Accidental romans (bVI, bVII, bII, #IV) are defined relative to the
        // MAJOR scale degrees, regardless of the current scale — flattening the
        // current scale's diatonic degree would double-flatten in minor modes
        // (bVI of C aeolian must be Ab, not G).
        try {
          const baseDiatonic = mt.getDiatonicChord(degree, currentKey, currentScale);
          const majorDegSemis = [0, 2, 4, 5, 7, 9, 11];
          const semis = majorDegSemis[(degree - 1) % 7] + (roman.includes('b') ? -1 : 1);
          let alteredRoot = (typeof mt.transposeNote === 'function')
            ? mt.transposeNote(currentKey, semis)
            : baseDiatonic.root;
          // Flatted romans read better with flat spellings (Abmaj7, not G#maj7).
          if (roman.includes('b') && String(alteredRoot).includes('#')
              && typeof mt.spellSemitoneWithPreference === 'function' && mt.noteValues) {
            const v = mt.noteValues[alteredRoot];
            if (Number.isFinite(v)) {
              const flat = mt.spellSemitoneWithPreference(v, true, null);
              if (flat) alteredRoot = flat;
            }
          }

          // Important: bVII / bVI / bII should not inherit the diatonic degree's quality (e.g., viiø).
          const chordType = inferChordTypeFromRoman(roman, baseDiatonic.chordType || 'maj7');
          let chordNotes = (typeof mt.getChordNotes === 'function')
            ? (mt.getChordNotes(alteredRoot, chordType) || [])
            : (baseDiatonic.chordNotes || []);
          // The root was just flat-spelled, but the chord tones come back
          // sharp-spelled regardless — a chord labelled A♭ printing G# C D#.
          // Re-spell the tones to agree with the root they belong to.
          if (chordNotes.length && String(alteredRoot).includes('b')
              && typeof mt.spellNotesForRoot === 'function') {
            try {
              const respelled = mt.spellNotesForRoot(alteredRoot, chordNotes);
              if (Array.isArray(respelled) && respelled.length === chordNotes.length) chordNotes = respelled;
            } catch (_) {}
          }

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
        // Borrowed lowercase romans (iv, v) request minor quality even when the
        // diatonic chord at that degree is major — apply the interchange.
        try {
          const romanCore = String(roman).match(/[iv]+/i);
          const wantsMinor = romanCore && romanCore[0] === romanCore[0].toLowerCase() && !/dim|ø|°/.test(roman);
          const isMajorType = chordObj && /^(maj7|maj|major|6|maj9)$/.test(String(chordObj.chordType));
          if (wantsMinor && isMajorType && typeof mt.getChordNotes === 'function') {
            const mNotes = mt.getChordNotes(chordObj.root, 'm7') || [];
            if (mNotes.length) {
              chordObj = {
                ...chordObj,
                chordType: 'm7',
                chordNotes: mNotes,
                diatonicNotes: mNotes,
                fullName: `${chordObj.root}m7`,
                roman
              };
            }
          }
        } catch (_) {}
      }
    }
    
    if (!chordObj) chordObj = { root: currentKey, chordType: 'major', fullName: currentKey, roman: 'I' };

    // The picardy tonic: force major even though the parent scale says minor.
    // This one borrowed third is the whole point of the gesture — resolving to
    // the diatonic i would land the lift back in the sadness it climbed out of.
    if (bar === picardyBar && mt && typeof mt.getChordNotes === 'function') {
      try {
        const majNotes = mt.getChordNotes(chordObj.root, 'maj') || [];
        if (majNotes.length) {
          chordObj = {
            ...chordObj,
            chordType: 'maj',
            chordNotes: majNotes,
            diatonicNotes: majNotes,
            fullName: String(chordObj.root),
            roman: 'I'
          };
          borrowedInfo = { type: 'modal-blend', from: 'i', to: 'I', cadence: 'bVI-bVII-I' };
        }
      } catch (_) {}
    }

    borrowedFlags.push(borrowedInfo);
    resolvedBarChords.push(chordObj);
  }

  // Apply Voice Leading. The sheet's Voicing control is authoritative when the
  // user has set one — previously these options were hardcoded from energy, so
  // changing the dropdown had no effect on generated music at all.
  let voicings = null;
  if (vlEngine) {
      const sheet = (window.modularApp && window.modularApp.sheetMusicGenerator) || window.sheetMusicGenerator || null;
      const sheetState = (sheet && sheet.state) || {};
      const overrides = (typeof window !== 'undefined' && window.__chordVoicingOverrides) || {};

      const autoVoicing = context.overallEnergy > 0.7 ? 'spread' : 'close';
      const autoRegister = context.overallEnergy > 0.8 ? 'high' : (context.overallEnergy < 0.3 ? 'low' : 'mid');

      // 'smart/smooth/open/jazz/piano' are the intelligent modes; the manual
      // styles map straight onto the engine's voicing argument.
      const logicToVoicing = { smart: 'close', smooth: 'close', open: 'spread', jazz: 'spread', piano: 'close' };
      const globalVoicing = sheetState.autoVoicingAll
          ? (logicToVoicing[sheetState.voicingLogic] || autoVoicing)
          : (sheetState.voicingStyle || autoVoicing);
      const globalRegister = sheetState.voicingRegister || autoRegister;

      const symbols = resolvedBarChords.map(c => c.fullName);
      voicings = vlEngine.generateVoiceLeading(symbols, {
          voicing: globalVoicing,
          register: globalRegister
      });

      // Per-chord overrides: re-voice just the bars the user pinned.
      try {
        const overrideBars = Object.keys(overrides);
        if (voicings && overrideBars.length) {
          overrideBars.forEach((barKey) => {
            const bi = parseInt(barKey, 10);
            if (!Number.isFinite(bi) || !resolvedBarChords[bi]) return;
            const o = overrides[barKey] || {};
            const single = vlEngine.generateVoiceLeading([resolvedBarChords[bi].fullName], {
              voicing: o.voicing || globalVoicing,
              register: o.register || globalRegister
            });
            if (single && single[0]) voicings[bi] = single[0];
          });
        }
      } catch (_) {}

      // Validate before trusting: the engine can double a tone and drop the
      // 7th, which silently changes the chord's quality on the staff. Anything
      // that fails validation falls back to the literal chord tones.
      try {
        let rejected = 0;
        (voicings || []).forEach((v, i) => {
          if (!v || !v.voices) return;
          const chordObj = resolvedBarChords[i];
          const tones = (chordObj && (chordObj.chordNotes || chordObj.diatonicNotes)) || [];
          const pcs = new Set(tones
            .map(n => mt && mt.noteValues && mt.noteValues[String(n).replace(/-?\d+$/, '')])
            .filter(Number.isFinite));
          const midis = Object.values(v.voices).filter(Number.isFinite);
          const voicedPcs = midis.map(m => ((m % 12) + 12) % 12);
          const ok = pcs.size > 0 && midis.length > 0
            && voicedPcs.every(pc => pcs.has(pc))
            && new Set(voicedPcs).size >= Math.min(4, pcs.size);
          if (!ok) { voicings[i] = null; rejected++; }
        });
        harmony.voicingSettings = { voicing: globalVoicing, register: globalRegister, overrides, rejected };
        if (rejected) {
          console.warn(`[ArcInit] ${rejected} voicing(s) rejected as incomplete/out-of-chord; literal tones kept.`);
        }
      } catch (_) {}
  }

  // One RNG stream for energy perturbation across all events — creating it per
  // event re-seeded identically and produced a constant offset instead of noise.
  const energyNoise = (typeof createRNG === 'function') ? createRNG((Number(seed) ^ 0x9e3779b1) >>> 0) : () => Math.random();
  const approachEngine = (typeof ApproachEngine !== 'undefined' && mt) ? new ApproachEngine(mt) : null;
  const cc = context.complexityControls || { rhythm: 0.5, melody: 0.5, color: 0.5 };

  // --- Semantic emphasis per bar ---
  // Spread the words across the bars and score each bar by how much its words
  // MEAN (valence/arousal/dominance magnitude), not how many syllables they
  // have. A short but loaded word like "hope" makes its bar a focal point,
  // which then attracts a richer approach into it.
  const barEmphasis = new Array(barCount).fill(0);
  try {
    const lexVals = (context.metadata && context.metadata.lexical && context.metadata.lexical.perWordValues) || [];
    const byText = {};
    lexVals.forEach(v => { if (v && v.word) byText[String(v.word).toLowerCase()] = v; });
    const tokens = Array.isArray(context.wordTokens) ? context.wordTokens : [];
    const n = tokens.length;
    if (n) {
      tokens.forEach((wt, i) => {
        const key = String(wt.originalWord || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
        const lx = byText[key] || lexVals[i] || {};
        const w = Math.min(1,
          Math.abs(lx.valence || 0) * 0.6 +
          Math.abs(lx.arousal || 0) * 0.5 +
          Math.abs(lx.dominance || 0) * 0.25);
        const bar = Math.min(barCount - 1, Math.floor((i / n) * barCount));
        barEmphasis[bar] = Math.max(barEmphasis[bar], w);
      });
    }
  } catch (_) {}

  for (let bar = 0; bar < barCount; bar++) {
    const chordObj = resolvedBarChords[bar];
    const voicing = voicings ? voicings[bar] : null;
    const borrowedInfo = borrowedFlags[bar] || null;
    
    // Density logic: high energy or busy rhythm setting = two chords per bar.
    const density = (context.overallEnergy > 0.8 || cc.rhythm > 0.72) ? 2 : 1;
    const duration = beatsPerBar / density;

    for (let d = 0; d < density; d++) {
      const beat = d * duration;
      // Sample arc energy and add a slight seeded perturbation so repeated
      // generates don't produce identical contour/energy.
      let energy = (typeof arc.sample === 'function') ? Number(arc.sample((bar + (beat/beatsPerBar)) / barCount)) : 0.5;
      if (!Number.isFinite(energy)) energy = 0.5;
      try {
        const perturb = ((energyNoise() || 0.5) - 0.5) * 0.07;
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

      if (borrowedInfo && borrowedInfo.type === 'modal-blend') {
        event.explain = `Modal blend cadence: ♭VI–♭VII–${event.chord} — both approach triads are already in the minor scale; `
          + `only the final major third is borrowed, turning the ending triumphant`;
      } else if (borrowedInfo && borrowedInfo.to) {
        const modeLabel = borrowedInfo.type === 'modal-interchange' ? 'Modal interchange' : 'Borrowed color';
        event.explain = `${modeLabel}: ${event.chord} (${formatScaleNameForDisplay(borrowedInfo.to)}) for contrast`;
      } else if (event.roman && /[b#]/.test(String(event.roman))) {
        event.explain = `Chromatic color: ${event.chord} (${event.roman}) adds outside tension`;
      }
      
      if (voicing) {
          event.voicing = voicing.voices;
      }
      
      harmony.chordSequence.push(event);

      // Approach run into the next bar's chord: dominants, tritone subs,
      // backdoor, octatonic dim7 planing, chromatic planing, or a walk borrowed
      // from another scale that shares the target chord. Each inserted chord
      // carries a scaleHint so melody + timeline follow the borrowed scale.
      if (approachEngine && d === density - 1 && bar < barCount - 1) {
          const nextChord = resolvedBarChords[bar + 1];
          if (nextChord) {
              const tension = clamp01(context.globalTension || 0);
              // The bar we're heading INTO decides how much it deserves a
              // dressed-up approach — semantically loaded words pull richer
              // harmony toward themselves.
              const targetEmphasis = barEmphasis[bar + 1] || 0;

              // FUNCTIONAL PLACEMENT.
              //
              // Approaches used to fire on a flat probability at every bar, so
              // they landed wherever the dice fell and the result read as
              // scattered rather than composed. What earns an approach is the
              // target's FUNCTION: the V of a ii–V–I and the IV of a I–IV–V are
              // the moments a progression is already leaning toward, so
              // decorating the arrival is heard as intent. Interior chords with
              // no such pull are mostly left plain, which is also what makes
              // the decorated arrivals stand out.
              // Function is read for BOTH modes. A first version of this table
              // only knew major-key cadences (ii–V–I, I–IV–V), which left the
              // minor templates — i–♭VII–iv–i, i–♭II–♭VII–i — scoring the
              // bottom weight on nearly every move, so the minor tones lost
              // their approach chords entirely. Minor cadences arrive by other
              // routes: iv–i is plagal, ♭VII–i is the backdoor, ♭II–i is
              // Phrygian. Those are arrivals too and are weighted as such.
              const romanOf = (c) => String((c && c.roman) || '').replace(/[^ivxIVX#b]/g, '');
              const prevRoman = romanOf(resolvedBarChords[bar]);
              const tgtRoman = romanOf(nextChord);

              const isDominant = /^V$/i.test(tgtRoman);
              const isSubdom = /^IV$/i.test(tgtRoman);          // matches IV and iv
              const isTonic = /^I$/i.test(tgtRoman);            // matches I and i
              const isModalPillar = /^(bII|bVI|bVII)$/i.test(tgtRoman);
              const prevIsPredom = /^(ii|IV|vi|bVI|bII)$/i.test(prevRoman);
              const prevIsDominant = /^V$/i.test(prevRoman);
              const prevIsModalCadence = /^(bVII|IV|bII)$/i.test(prevRoman);

              let functionalWeight;
              if (isDominant && prevIsPredom) functionalWeight = 0.92;      // ii–V: the classic setup
              else if (isDominant) functionalWeight = 0.7;                  // any approach to the dominant
              else if (isSubdom) functionalWeight = 0.68;                   // the IV of I–IV–V, the iv of a minor plagal
              else if (isTonic && prevIsDominant) functionalWeight = 0.6;   // authentic cadence
              else if (isTonic && prevIsModalCadence) functionalWeight = 0.58; // plagal / backdoor / Phrygian arrival
              else if (isTonic) functionalWeight = 0.3;                     // tonic reached some other way
              else if (isModalPillar) functionalWeight = 0.45;              // ♭VI/♭VII/♭II as colour pillars
              else if (/^(ii|vi)$/i.test(tgtRoman)) functionalWeight = 0.34;
              else functionalWeight = 0.15;

              // The colour slider scales the whole appetite; emphasis and
              // tension nudge it. Function decides WHERE, the sliders decide
              // HOW MUCH.
              const prob = Math.min(0.95, functionalWeight
                * (0.45 + (cc.color || 0.5) * 0.85)
                + targetEmphasis * 0.2
                + tension * 0.06);

              if (rng() < prob) {
                  // Leave at least half the bar to the main chord; high color
                  // settings may steal up to half the bar for longer runs.
                  const maxBeats = event.duration >= 4
                    ? (((cc.color || 0.5) > 0.7 || targetEmphasis > 0.6) ? 2 : 1.5)
                    : (event.duration >= 2 ? 1 : 0.5);
                  const plan = approachEngine.plan({
                      // Word-generated music takes only chords that are real
                      // stacked-thirds degrees of the scale they claim. Chords
                      // that are merely spellable from the collection — a 7♭9
                      // over an octatonic whose own chords are all dim7 — read
                      // as arbitrary here. The manual chooser still offers the
                      // full catalog for deliberate exploration.
                      diatonicOnly: window.__approachDiatonicOnly !== false,
                      target: nextChord,
                      tone: context.emotionalTone,
                      tension,
                      energy: clamp01(context.overallEnergy || 0),
                      rng,
                      maxBeats,
                      // Emphasised targets get spicier approaches.
                      colorLevel: Math.min(1, (cc.color != null ? cc.color : 0.5) + targetEmphasis * 0.25)
                  });

                  if (plan && plan.events.length && event.duration > plan.steal) {
                      event.duration -= plan.steal;
                      let apBeat = beatsPerBar - plan.steal;
                      for (const ap of plan.events) {
                          harmony.chordSequence.push({
                              bar,
                              beat: apBeat,
                              duration: ap.duration,
                              chord: ap.fullName,
                              chordObj: ap,
                              roman: ap.roman,
                              scaleHint: ap.scaleHint || null,
                              scaleHintNotes: (ap.scaleHint && ap.scaleHint.scaleNotes) || null,
                              explain: ap.explain || null,
                              approachStrategy: plan.strategy,
                              approachFamily: plan.family,
                              energy: Math.min(1, energy * 1.1),
                              texture: 'STACCATO'
                          });
                          apBeat += ap.duration;
                      }
                  }
              }
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

/**
 * Re-voice the accompaniment now that the melody exists.
 *
 * Harmony is voiced before the melody is written, so on the first pass the
 * voice-leading engine has no idea what the tune is doing — it picks a soprano
 * freely, and the result is two independent top lines that cross, double in
 * unison, and run in parallel octaves. Nothing in the texture connects.
 *
 * Running the voicer a second time with the melody supplied lets it keep the
 * accompaniment under the tune and treat the melody as a real voice when
 * checking parallels. Chords whose voicing fails validation keep their literal
 * tones, exactly as on the first pass.
 */
function revoiceHarmonyAgainstMelody(harmony, melody, context) {
  try {
    if (typeof VoiceLeadingEngine === 'undefined') return;
    const mt = window.modularApp && window.modularApp.musicTheory;
    if (!mt) return;
    const seq = (harmony && harmony.chordSequence) || [];
    const notes = (melody && melody.notes) || [];
    if (!seq.length || !notes.length) return;

    const beatsPerBar = 4;
    const midiOf = (noteName) => {
      const m = String(noteName || '').match(/^([A-Ga-g][#b]?)(-?\d+)$/);
      if (!m || !mt.noteValues) return null;
      const pc = mt.noteValues[m[1]];
      if (!Number.isFinite(pc)) return null;
      return pc + (parseInt(m[2], 10) + 1) * 12;
    };

    // Melody note sounding when a chord strikes. A chord that lands mid-note
    // must answer to the note still ringing, not to the next attack.
    const sounding = (absBeat) => {
      let best = null;
      for (const n of notes) {
        const start = n.bar * beatsPerBar + n.beat;
        const end = start + (Number(n.duration) || 0);
        if (start <= absBeat + 1e-6 && absBeat < end - 1e-6) { best = n; break; }
        if (start <= absBeat + 1e-6 && (!best || start > best.bar * beatsPerBar + best.beat)) best = n;
      }
      return best ? midiOf(best.noteName) : null;
    };

    // Approach chords are ornaments inside another chord's bar; they are not
    // part of the sustained pad and are left as they are.
    const targets = seq.filter(ev => ev && !ev.approachStrategy && ev.chord);
    if (!targets.length) return;

    const settings = (harmony.voicingSettings) || {};
    const vl = new VoiceLeadingEngine(mt);
    vl.debug = false;
    const revoiced = vl.generateVoiceLeading(targets.map(ev => ev.chord), {
      voicing: settings.voicing || 'close',
      register: settings.register || 'mid',
      melody: targets.map(ev => sounding(ev.bar * beatsPerBar + ev.beat))
    });
    if (!revoiced || revoiced.length !== targets.length) return;

    // Same validation the first pass applies: a voicing that drops the 7th or
    // doubles a tone out of the chord silently changes its quality.
    let kept = 0;
    targets.forEach((ev, i) => {
      const v = revoiced[i];
      if (!v || !v.voices) return;
      const tones = (ev.chordObj && (ev.chordObj.chordNotes || ev.chordObj.diatonicNotes)) || [];
      const pcs = new Set(tones
        .map(n => mt.noteValues && mt.noteValues[String(n).replace(/-?\d+$/, '')])
        .filter(Number.isFinite));
      const midis = Object.values(v.voices).filter(Number.isFinite);
      const voicedPcs = midis.map(m => ((m % 12) + 12) % 12);
      const ok = pcs.size > 0 && midis.length > 0
        && voicedPcs.every(pc => pcs.has(pc))
        && new Set(voicedPcs).size >= Math.min(4, pcs.size);
      if (ok) { ev.voicing = v.voices; kept++; }
    });

    harmony.voicingSettings = {
      ...settings,
      melodyAware: true,
      melodyAwareChords: kept
    };
  } catch (err) {
    console.warn('[ArcInit] melody-aware revoice skipped', err);
  }
}

function generateMelody(context, arc, harmony, seed = 0) {
  // Prefer the line-based composer: it builds the phrase from structural
  // anchors joined by stepwise motion, balances leaps, develops a motif, and
  // gives every non-chord tone a function that resolves. The older loop below
  // chose each note independently, which is why accidentals appeared without
  // intention and the line wandered.
  // Opt-in while it reaches parity with the legacy guarantees (word-rhythm
  // differentiation, monosyllable holds, scale membership). Enable with:
  //   window.__useMelodicLineEngine = true
  try {
    if (typeof MelodicLineEngine !== 'undefined' && window.__useMelodicLineEngine !== false) {
      const mtRef = window.modularApp && window.modularApp.musicTheory;
      // Carry the word-derived rhythm cell and character into the line engine
      // so a driving word still scans faster than a still one.
      const wceRef = (typeof WordCharacterEngine !== 'undefined') ? WordCharacterEngine : null;
      const cellRng = createRNG(seed + 11);
      const syls = [];
      (context.wordTokens || []).forEach(w => {
        const key = String(w.originalWord || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
        let ch = null, cells = null, cellOptions = null;
        try {
          if (wceRef) {
            ch = wceRef.analyzeWord(key);
            const r = wceRef.rhythmFor(ch, (w.syllables || []).length, cellRng, {
              allowSixteenths: ((context.complexityControls || {}).rhythm || 0.5) >= 0.3
            });
            cells = r.durations;
            // The word's whole rhythmic vocabulary, not just the one value its
            // syllable count reduced to. A short input has to fill more bars
            // than it has syllables, and this is the in-character material the
            // line engine develops with instead of repeating a single duration.
            cellOptions = Array.isArray(r.variants) ? r.variants : null;
          }
        } catch (_) {}
        (w.syllables || []).forEach((sy, si) => syls.push({
          text: sy.text,
          parentWord: w.originalWord,
          cellDuration: (cells && Number.isFinite(cells[si])) ? cells[si] : null,
          cellOptions,
          scaleOverride: sy.scaleOverride || w.scaleOverride || null,
          char: ch
        }));
      });
      const engine = new MelodicLineEngine(mtRef);
      const line = engine.compose({
        context, arc, harmony, seed,
        syllables: syls,
        complexity: context.complexityControls || {}
      });
      if (line && line.notes && line.notes.length) {
        return {
          notes: line.notes,
          scaleUsed: (context.harmonicProfile && context.harmonicProfile.scaleNotes) || [],
          contour: line.contour,
          anchors: line.anchors
        };
      }
    }
  } catch (err) {
    console.warn('[ArcInit] MelodicLineEngine failed, using legacy melody', err);
  }

  return generateMelodyLegacy(context, arc, harmony, seed);
}

function generateMelodyLegacy(context, arc, harmony, seed = 0) {
  const rng = createRNG(seed + 1);
  const mt = window.modularApp && window.modularApp.musicTheory;
  const baseScale = context.harmonicProfile.scaleNotes || ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const totalBeats = arc.totalBeats || 16;
  const beatsPerBar = arc.beatsPerBar || 4;
  const cc = context.complexityControls || { rhythm: 0.5, melody: 0.5, color: 0.5 };
  const rhythmC = Math.max(0, Math.min(1, Number(cc.rhythm) || 0.5));
  const melodyC = Math.max(0, Math.min(1, Number(cc.melody) || 0.5));

  // Shift a pitch class by semitones with octave tracking (for chromatic passing tones).
  const chromaticUp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const shiftSemitone = (pc, oct, delta) => {
    const v = (mt && mt.noteValues && Number.isFinite(mt.noteValues[pc])) ? mt.noteValues[pc] : chromaticUp.indexOf(pc);
    if (!Number.isFinite(v) || v < 0) return null;
    let nv = v + delta;
    let no = oct;
    if (nv < 0) { nv += 12; no -= 1; } else if (nv > 11) { nv -= 12; no += 1; }
    return { name: chromaticUp[nv], octave: Math.max(2, Math.min(7, no)) };
  };

  // --- Semantic setup ---
  const lexMeta = (context.metadata && context.metadata.lexical) || {};
  const perWordValues = lexMeta.perWordValues || [];
  const avgValence = lexMeta.avgValence || 0;
  const valenceTrajectory = (context.semanticTrajectory && context.semanticTrajectory.valenceTrajectory) || 0;

  // Align word-level semantics to syllable positions. Match by word text first
  // (ContextEngine tokenization can differ from the timeline's whitespace split),
  // falling back to positional alignment.
  const perWordByText = {};
  perWordValues.forEach(v => {
    if (v && v.word) perWordByText[String(v.word).toLowerCase()] = v;
  });

  // --- Word character: what each word MEANS and SOUNDS like ---
  // The emotion lexicon covers only a few hundred words; everything else used
  // to fall back to a heuristic uncorrelated with meaning, which is why every
  // input produced the same narrow energy band and the same three durations.
  const wce = (typeof WordCharacterEngine !== 'undefined') ? WordCharacterEngine : null;
  const charByWord = {};
  if (wce) {
    try {
      const phraseText = (context.wordTokens || []).map(w => w.originalWord).join(' ');
      wce.analyzePhrase(phraseText).forEach(ch => { charByWord[ch.word] = ch; });
    } catch (_) {}
  }
  const neutralChar = { motion: 0.35, attack: 0.4, sustain: 0.5, weight: 0.4, brightness: 0.5, tension: 0.3, valence: 0, arousal: 0, contour: 0, fields: [], matched: false, word: '' };
  const syllableSemantics = [];
  (context.wordTokens || []).forEach((wt, wIdx) => {
    const wordKey = String(wt.originalWord || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
    const lex = perWordByText[wordKey] || perWordValues[wIdx] || { valence: 0, arousal: 0, dominance: 0 };
    const ch = charByWord[wordKey] || neutralChar;

    // Prefer the character engine's valence/arousal when it actually
    // recognised the word; the lexicon fallback is noise for unknown words.
    const valence = ch.matched ? ch.valence : (lex.valence || ch.valence || 0);
    const arousal = ch.matched ? ch.arousal : (lex.arousal || ch.arousal || 0);

    // Semantic weight: how much this word MEANS, independent of syllable count.
    // "hope" is one syllable but carries the phrase — weight lets it hold, get
    // ornamented, and pull the harmony toward it.
    const weight = Math.min(1,
      Math.abs(valence) * 0.6 +
      Math.abs(arousal) * 0.5 +
      Math.abs(lex.dominance || 0) * 0.25 +
      (ch.matched ? 0.2 : 0));

    wt.syllables.forEach(syl => {
      syllableSemantics.push({
        valence,
        arousal,
        role: syl.role || 'hold',
        isMelismatic: !!syl.isMelismatic,
        pitchValue: syl.pitchValue || 0.5,
        weight,
        isMonosyllable: wt.syllables.length === 1,
        char: ch
      });
    });
  });
  const totalSems = syllableSemantics.length || 1;

  // Find the single most emotionally charged syllable — this becomes the melodic climax
  let climaxSylIdx = 0;
  let climaxScore = -Infinity;
  syllableSemantics.forEach((s, i) => {
    const score = Math.abs(s.valence) * 1.5 + Math.abs(s.arousal) * 0.8 + (s.weight || 0) * 0.9 + (s.role === 'peak' ? 0.4 : 0);
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

  // Absolute beat positions where the harmony CHANGES (including approach
  // chords). The melody previously ran on its own timeline and knew nothing
  // about these, so notes landed just after a chord hit — the "chord plays,
  // then a note squeaks in right after" problem.
  const chordOnsets = (() => {
    const evs = (harmony && Array.isArray(harmony.chordSequence)) ? harmony.chordSequence : [];
    const set = new Set();
    evs.forEach((ev) => {
      if (!ev || !Number.isFinite(ev.bar) || !Number.isFinite(ev.beat)) return;
      set.add(ev.bar * beatsPerBar + ev.beat);
    });
    return Array.from(set).sort((a, b) => a - b);
  })();
  const nextOnsetAfter = (t) => {
    for (const o of chordOnsets) if (o > t + 1e-6) return o;
    return null;
  };
  const isOnset = (t) => chordOnsets.some(o => Math.abs(o - t) < 1e-6);

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

  // --- Register control ---
  // Scale-degree wrapping alone can produce absurd jumps (C4 → D5 = 14
  // semitones) because a degree wrap bumps the octave regardless of the real
  // pitch distance. Every emitted note is octave-corrected so no interval
  // exceeds an octave, which is the difference between a singable line and a
  // scattered one.
  const midiOf = (pc, oct) => {
    const v = (mt && mt.noteValues && Number.isFinite(mt.noteValues[pc])) ? mt.noteValues[pc] : chromaticUp.indexOf(pc);
    if (!Number.isFinite(v) || v < 0) return null;
    return (oct + 1) * 12 + v;
  };
  let prevMidi = null;
  const fitOctave = (pc, oct) => {
    let o = Math.max(2, Math.min(7, oct));
    let m = midiOf(pc, o);
    if (m === null || prevMidi === null) return o;
    let guard = 0;
    while (Math.abs(m - prevMidi) > 12 && guard++ < 6) {
      const next = Math.max(2, Math.min(7, o + (m > prevMidi ? -1 : 1)));
      if (next === o) break;
      o = next;
      const nm = midiOf(pc, o);
      if (nm === null) break;
      m = nm;
    }
    return o;
  };

  const melody = { notes: [], scaleUsed: baseScale };
  const allSyllables = [];
  (context.wordTokens || []).forEach(word => {
    const wKey = String(word.originalWord || '').toLowerCase().replace(/[^a-z0-9'-]/g, '');
    const ch = charByWord[wKey] || neutralChar;

    // Each word gets a rhythmic CELL derived from its character (a driving
    // word like "chase" gets short forward values; "drift" gets sustained
    // ones), then stretched across its syllables with stress shaping.
    let cellDurations = null;
    if (wce) {
      try {
        cellDurations = wce.rhythmFor(ch, word.syllables.length, rng, {
          allowSixteenths: rhythmC >= 0.3
        }).durations;
      } catch (_) { cellDurations = null; }
    }

    word.syllables.forEach((s, si) => allSyllables.push({
      ...s,
      parentWord: word.originalWord,
      // A scale pinned to the word (★ in the timeline UI) applies to its syllables.
      scaleOverride: s.scaleOverride || word.scaleOverride || null,
      cellDuration: (cellDurations && cellDurations[si] !== undefined) ? cellDurations[si] : null,
      char: ch
    }));
  });

  // Resolve pinned scales once; a user pin outranks harmony scale hints.
  const homeRoot = context.harmonicProfile.root || 'C';
  const overrideCache = {};
  const resolveOverrideScale = (name) => {
    if (!name || !mt) return null;
    const id = String(name).toLowerCase().replace(/\s+/g, '_');
    if (id in overrideCache) return overrideCache[id];
    let notes = null;
    try { notes = mt.getScaleNotes(homeRoot, id) || null; } catch (_) { notes = null; }
    overrideCache[id] = (Array.isArray(notes) && notes.length) ? notes : null;
    return overrideCache[id];
  };

  // Sparse text should breathe, not machine-gun. A single word like "hope"
  // used to repeat ~22 times to fill four bars; scaling note length by how
  // much text there actually is lets short, meaningful input ring out.
  const sylDensity = allSyllables.length / Math.max(1, totalBeats);
  const sparseFactor = sylDensity < 0.2 ? 2 : (sylDensity < 0.4 ? 1.5 : 1);

  const rhythmHistory = [];
  let sylIndex = 0;
  let climaxUsed = false;
  // Musicality state: rhythmic motif from bar 1, and a leap budget so the
  // line can't ricochet between big jumps.
  const motifRhythm = [];
  let lastBarSeen = -1;
  let barUsesMotif = false;
  let motifPtr = 0;
  let leapRun = 0;

  while (currentTime < totalBeats) {
    const t = currentTime / totalBeats;
    const arcEnergy = arc.sample(t);
    const activeSyl = allSyllables[sylIndex % allSyllables.length];
    if (!activeSyl) break;

    const semIdx = sylIndex % totalSems;
    const sem = syllableSemantics[semIdx] || { valence: 0, arousal: 0, role: 'hold', isMelismatic: false, pitchValue: 0.5, weight: 0, isMonosyllable: false };

    // Energy: arc shape (60%) blended with word arousal (40%) — unique per word
    const arousal01 = (sem.arousal + 1) / 2;
    const energy = arcEnergy * 0.6 + arousal01 * 0.4;

    // Climax fires once at the most emotionally charged syllable
    const isClimax = (semIdx === climaxSylIdx) && !climaxUsed;
    if (isClimax) climaxUsed = true;

    // --- Duration: motif echo > semantic weight > energy, then complexity ---
    let barNow = Math.floor(currentTime / beatsPerBar);
    if (barNow !== lastBarSeen) {
      const firstBarOfGroup = barNow > 0 && barNow % 2 === 0;
      lastBarSeen = barNow;
      // Later bars echo bar 1's rhythm about half the time — repetition is
      // what makes a melody feel intentional instead of random.
      barUsesMotif = barNow > 0 && motifRhythm.length >= 2 && rng() < 0.55;
      motifPtr = 0;

      // Breathe between two-bar phrases: leaving a beat empty here is what
      // separates a melody into phrases instead of an unbroken stream. The
      // renderer turns un-filled beats into rests automatically.
      if (firstBarOfGroup && rng() < 0.75 - arcEnergy * 0.35) {
        const breath = arcEnergy < 0.45 ? 1 : 0.5;
        if (currentTime + breath < totalBeats - 1) {
          currentTime += breath;
          barNow = Math.floor(currentTime / beatsPerBar);
        }
      }
    }

    // Rhythm priority: the word's own character cell first — that is what
    // makes "chase" and "drift" scan differently. Motif echo and the energy
    // ladder are fallbacks, not the primary source.
    const wordChar = activeSyl.char || (sem.char || neutralChar);
    let duration;
    if (isClimax) {
      duration = wordChar.motion > 0.6 ? 1.5 : 2.0;
    } else if (barUsesMotif) {
      duration = motifRhythm[motifPtr++ % motifRhythm.length];
    } else if (Number.isFinite(activeSyl.cellDuration)) {
      duration = activeSyl.cellDuration;
      // Arc energy stretches or compresses the cell without erasing its shape.
      const stretch = 1 + (0.5 - arcEnergy) * 0.5;
      duration = Math.max(0.25, Math.min(4, duration * stretch));
    } else if (energy < 0.28) {
      duration = 2.0;
    } else if (energy < 0.5) {
      duration = 1.0;
    } else {
      duration = 0.5;
    }

    // A semantically heavy one-syllable word earns a held note even though it
    // contributes only one syllable — but only when its character can bear it.
    // "hope" rings out; "chase" must stay short and driving.
    if (!isClimax && !barUsesMotif && sem.isMonosyllable && sem.weight > 0.5 && wordChar.motion < 0.55) {
      duration = Math.max(duration, 1.5);
    }
    // Sparse text breathes — but never at the cost of a driving word's urgency.
    if (!isClimax && !barUsesMotif && sparseFactor > 1) {
      const factor = wordChar.motion > 0.6 ? 1 + (sparseFactor - 1) * 0.35 : sparseFactor;
      duration = Math.min(4, duration * factor);
    }

    const usingCell = Number.isFinite(activeSyl.cellDuration) && !isClimax && !barUsesMotif;

    if (!isClimax && !barUsesMotif) {
      if (rhythmC < 0.25) {
        // Simple mode: snap to plain quarters/halves/wholes — no dotted or
        // sixteenth values, even after sparse-text lengthening.
        duration = duration <= 1.25 ? 1 : (duration <= 3 ? 2 : 4);
      } else if (!usingCell) {
        // Dotted values appear from mid complexity
        if (rhythmC > 0.5 && duration === 1.0 && rng() < (rhythmC - 0.45) * 0.8) {
          duration = rng() < 0.5 ? 1.5 : 0.75;
        }
        // Sixteenth pairs at high complexity
        if (rhythmC > 0.65 && duration === 0.5 && rng() < (rhythmC - 0.6) * 1.1) {
          duration = 0.25;
        }
      }

      // Syncopation is a property of the WORD as much as the slider: sharp,
      // driving words push against the beat; still words sit on it.
      const syncDrive = (wordChar.attack * 0.5 + wordChar.motion * 0.5);
      const syncChance = Math.max(0, (rhythmC - 0.35) * 0.5 + (syncDrive - 0.5) * 0.55);
      if (rhythmC >= 0.25 && rng() < syncChance) {
        const shift = (syncDrive > 0.7 || rhythmC > 0.8) ? 0.25 : 0.5;
        if (currentTime + shift + duration <= totalBeats) currentTime += shift;
      }
    }

    // Break runs of 3+ identical durations (Rule of Thirds) — unless we're
    // echoing the motif or the word's own cell put them there on purpose.
    if (!isClimax && !barUsesMotif && !usingCell && rhythmHistory.length >= 2 &&
        rhythmHistory[rhythmHistory.length-1] === duration &&
        rhythmHistory[rhythmHistory.length-2] === duration) {
      duration = (duration === 1.0) ? 0.5 : 1.0;
    }
    // Snap to a clean notatable grid. Cell stretching, sparse-text scaling and
    // energy shaping are all continuous multipliers, so without this the sheet
    // fills with unnotatable values like 0.61 or 1.379 beats.
    duration = quantizeDuration(duration, rhythmC);

    rhythmHistory.push(duration);
    if (barNow === 0 && !isClimax) motifRhythm.push(duration);

    // --- Pick active scale for this beat: user pin > harmony hint > home scale ---
    // (After the syncopation shift so bar/beat reflect where the note actually lands.)
    const barIdx = Math.floor(currentTime / beatsPerBar);
    const beatInBar = currentTime % beatsPerBar;
    const hEv = findActiveHarmonyEvent(barIdx, beatInBar);
    const hinted = hEv && Array.isArray(hEv.scaleHintNotes) && hEv.scaleHintNotes.length ? hEv.scaleHintNotes : null;
    const pinnedName = activeSyl.scaleOverride || null;
    const pinnedNotes = pinnedName ? resolveOverrideScale(pinnedName) : null;
    const activeScale = pinnedNotes || hinted || baseScale;
    const activeScaleKey = pinnedNotes
      ? `pin:${pinnedName}`
      : (hinted ? scaleKeyOf(activeScale, (hEv && hEv.scaleHint && hEv.scaleHint.scaleName) ? hEv.scaleHint.scaleName : 'hint') : 'base');
    if (activeScaleKey !== lastScaleKey) {
      previousScaleIndex = nearestScaleIndexForPitch(activeScale, previousPitchClass);
      lastScaleKey = activeScaleKey;
    }
    const noteScaleName = pinnedNotes
      ? String(pinnedName).toLowerCase().replace(/\s+/g, '_')
      : ((hEv && hEv.scaleHint && hEv.scaleHint.scaleName) || context.harmonicProfile.recommendedScale);
    const noteScaleRoot = pinnedNotes
      ? homeRoot
      : ((hEv && hEv.scaleHint && hEv.scaleHint.root) || context.harmonicProfile.root);

    // --- Pitch: semantics-first interval selection ---
    const roll = rng();
    let targetIdx = previousScaleIndex;

    if (Math.abs(lastJump) > 3 || leapRun >= 2) {
      // Gap-fill: after a big jump (or two leaps in a row) the line must
      // resolve stepwise in the opposite direction — that's what ears expect.
      targetIdx = previousScaleIndex + (lastJump > 0 ? -1 : 1);
      lastJump = 0;
      leapRun = 0;
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

      // --- Word character shapes the line itself ---
      // Directional words push the contour; still words stay put; sharp,
      // driving words move in bigger, more urgent steps.
      const wc = wordChar;
      if (wc.contour > 0.3) interval = Math.max(interval, 1) + (wc.contour > 0.7 ? 1 : 0);
      else if (wc.contour < -0.3) interval = Math.min(interval, -1) - (wc.contour < -0.7 ? 1 : 0);

      if (wc.motion < 0.2) {
        // Stillness: hover — steps of a second at most.
        interval = Math.max(-1, Math.min(1, interval));
      } else if (wc.motion > 0.6) {
        interval += interval >= 0 ? 1 : -1;
      }
      if (wc.attack > 0.7 && Math.abs(interval) < 2) {
        // Percussive words punch away from the current pitch.
        interval = interval >= 0 ? 2 : -2;
      }
      if (wc.tension > 0.6 && rng() < 0.35) {
        // Tense words prefer unsettled, narrow chromatic-ish motion.
        interval = interval >= 0 ? 1 : -1;
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

      // Melody-complexity shaping: constrain to steps when simple, stretch
      // leaps and allow octave displacement when adventurous.
      if (melodyC < 0.3) {
        interval = Math.max(-2, Math.min(2, interval));
      } else if (melodyC > 0.6 && rng() < (melodyC - 0.55) * 0.9) {
        interval += interval >= 0 ? 2 : -2;
      }
      if (melodyC > 0.75 && rng() < (melodyC - 0.7) * 0.7) {
        interval += interval >= 0 ? activeScale.length : -activeScale.length;
      }

      targetIdx = previousScaleIndex + interval;
    }

    // Wrap/clamp to scale with octave tracking
    while (targetIdx >= activeScale.length) { targetIdx -= activeScale.length; octave = Math.min(6, octave + 1); }
    while (targetIdx < 0) { targetIdx += activeScale.length; octave = Math.max(3, octave - 1); }

    let forcedPitchClass = null;
    // Chord-tone gravity: on strong beats, pull the melody onto a tone of the
    // sounding chord — this is the single biggest "sounds intentional" rule.
    try {
      const beatNow = currentTime % beatsPerBar;
      // A chord onset is the most important place to be consonant — more so
      // than an arbitrary metric strong beat.
      const strongBeat = isOnset(currentTime) || beatNow === 0 || beatNow === Math.floor(beatsPerBar / 2);
      const chordTones = hEv && hEv.chordObj
        ? (hEv.chordObj.chordNotes && hEv.chordObj.chordNotes.length ? hEv.chordObj.chordNotes : hEv.chordObj.diatonicNotes)
        : null;
      if (!isClimax && strongBeat && chordTones && chordTones.length && mt && mt.noteValues && rng() < 0.75) {
        const tonePcs = chordTones
          .map(n => mt.noteValues[String(n).replace(/\d+$/, '')])
          .filter(Number.isFinite);
        if (tonePcs.length) {
          for (let off = 0; off <= 3; off++) {
            const tryIdxs = off === 0 ? [targetIdx] : [targetIdx + off, targetIdx - off];
            let snapped = false;
            for (const ti of tryIdxs) {
              const idx = clampIndex(ti, activeScale.length);
              const pcVal = mt.noteValues[String(activeScale[idx]).replace(/\d+$/, '')];
              if (Number.isFinite(pcVal) && tonePcs.includes(pcVal)) {
                targetIdx = clampIndex(ti, activeScale.length);
                snapped = true;
                break;
              }
            }
            if (snapped) break;
          }
        }
      }
    } catch (_) {}

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
    leapRun = Math.abs(lastJump) >= 3 ? leapRun + 1 : 0;
    previousScaleIndex = targetIdx;

    // --- Melisma: emotionally charged syllables spread across 2 notes ---
    // Triggered only when the syllable is marked complex, has meaningful emotional weight,
    // and the duration is long enough to split without creating overly fast notes.
    const emotionalWeight = Math.abs(sem.valence) * 0.6 + Math.abs(sem.arousal) * 0.4;
    // Semantically heavy monosyllables ("hope") may melismatize even though
    // their text is short — the meaning carries the ornament.
    const wantsMelisma = (sem.isMelismatic || (sem.isMonosyllable && sem.weight > 0.5))
      && duration >= 1.0
      && (sem.role === 'peak' || emotionalWeight > 0.4 || sem.weight > 0.5)
      && rng() > (0.55 - melodyC * 0.35);

    // Emit a note with register correction, skipping anything that would fall
    // outside the phrase (such notes were silently lost by the renderer).
    const emit = (pc, oct, startTime, dur, extra) => {
      if (!pc || startTime >= totalBeats - 1e-6) return null;
      // Never emit a sliver: clipping at the phrase end used to leave notes of
      // a few thousandths of a beat, which the renderer could not draw.
      const room = totalBeats - startTime;
      const finalDur = quantizeDuration(Math.min(dur, room), rhythmC);
      if (finalDur < 0.25 || room < 0.25) return null;
      const useOct = fitOctave(pc, oct);
      const note = {
        bar: Math.floor(startTime / beatsPerBar),
        beat: startTime % beatsPerBar,
        noteName: `${pc}${useOct}`,
        duration: finalDur,
        syllable: activeSyl.text,
        word: activeSyl.parentWord,
        scaleName: noteScaleName,
        scaleRoot: noteScaleRoot
      };
      if (extra) Object.assign(note, extra);
      melody.notes.push(note);
      const m = midiOf(pc, useOct);
      if (m !== null) prevMidi = m;
      octave = useOct;
      previousPitchClass = pc;
      return note;
    };

    if (wantsMelisma) {
      // Halving an odd value (0.75) lands off-grid, which pushed every later
      // note off the beat grid and cost notes at the phrase edge.
      const melDur = quantizeDuration(duration / 2, rhythmC);
      // Honour a forced chord tone here too — melisma notes land on chord
      // changes just as often as plain ones.
      const firstPc = forcedPitchClass || String(activeScale[clampIndex(targetIdx, activeScale.length)] || '').replace(/\d+$/, '');
      emit(firstPc, octave, currentTime, melDur);

      // Second note steps in emotional direction: positive → up, negative → down
      const melStep = sem.valence >= 0 ? 1 : -1;
      let melIdx = targetIdx + melStep;
      let melOct = octave;
      while (melIdx >= activeScale.length) { melIdx -= activeScale.length; melOct = Math.min(6, melOct + 1); }
      while (melIdx < 0) { melIdx += activeScale.length; melOct = Math.max(3, melOct - 1); }
      const melPc = String(activeScale[clampIndex(melIdx, activeScale.length)] || '').replace(/\d+$/, '');
      emit(melPc, melOct, currentTime + melDur, melDur);

      previousScaleIndex = melIdx;
      lastJump = melIdx - targetIdx;
    } else {
      const landIdx = clampIndex(targetIdx, activeScale.length);
      // A forced chord tone (set by chord-onset gravity) overrides the scale
      // degree — landing consonant matters more than staying in-scale.
      const landPc = forcedPitchClass || String(activeScale[landIdx] || '').replace(/\d+$/, '');

      // Chromatic passing tone: at higher melody complexity, approach the
      // landing note by half-step (from below when rising, above when falling).
      const wantsChroma = !isClimax
        && melodyC > 0.45
        && duration >= 0.5
        && rng() < (melodyC - 0.4) * 0.6;
      if (wantsChroma) {
        const approachDir = lastJump >= 0 ? -1 : 1;
        const pass = shiftSemitone(landPc, octave, approachDir);
        if (pass) {
          const passDur = quantizeDuration(duration / 2, rhythmC);
          if (emit(pass.name, pass.octave, currentTime, passDur, { chromatic: true })) {
            currentTime += passDur;
            duration = passDur;
          }
        }
      }

      emit(landPc, octave, currentTime, duration);
    }

    // Keep the cursor on the sixteenth grid; accumulated fractions otherwise
    // drift notes off the beat and the renderer loses them at the phrase edge.
    currentTime = Math.round((currentTime + duration) * 4) / 4;
    sylIndex++;
  }

  // --- Cadence: land the phrase on a stable tone of the final chord ---
  // Without this the line just stops wherever the last interval left it, which
  // is the main reason generated melodies feel unfinished.
  try {
    const last = melody.notes[melody.notes.length - 1];
    if (last && mt && mt.noteValues) {
      const finalEvent = (harmony && Array.isArray(harmony.chordSequence))
        ? harmony.chordSequence.filter(ev => ev && !ev.approachStrategy).pop()
        : null;
      const finalChord = finalEvent && finalEvent.chordObj;
      const finalTones = finalChord
        ? ((finalChord.chordNotes && finalChord.chordNotes.length) ? finalChord.chordNotes : finalChord.diatonicNotes)
        : null;
      const restPc = (Array.isArray(finalTones) && finalTones.length)
        ? String(finalTones[0]).replace(/\d+$/, '')
        : String(context.harmonicProfile.root || '').replace(/\d+$/, '');
      const lastPc = String(last.noteName).replace(/\d+$/, '');
      const lastOct = parseInt(String(last.noteName).match(/(\d+)$/) ? String(last.noteName).match(/(\d+)$/)[1] : '4', 10);

      if (restPc && lastPc !== restPc) {
        // Move to the octave of the resting tone nearest the note that precedes
        // it, so the final step stays singable.
        const prev = melody.notes[melody.notes.length - 2];
        let anchorMidi = null;
        if (prev) {
          const pPc = String(prev.noteName).replace(/\d+$/, '');
          const pOctM = String(prev.noteName).match(/(\d+)$/);
          const pOct = pOctM ? parseInt(pOctM[1], 10) : 4;
          const pv = mt.noteValues[pPc];
          if (Number.isFinite(pv)) anchorMidi = (pOct + 1) * 12 + pv;
        }
        const restVal = mt.noteValues[restPc];
        let oct = lastOct;
        if (Number.isFinite(restVal) && anchorMidi !== null) {
          let best = oct;
          let bestDist = Infinity;
          for (let o = 3; o <= 6; o++) {
            const d = Math.abs(((o + 1) * 12 + restVal) - anchorMidi);
            if (d < bestDist) { bestDist = d; best = o; }
          }
          oct = best;
        }
        last.noteName = `${restPc}${oct}`;
        last.chromatic = false;
        last.cadence = true;
      }
      // Give the final note weight so the phrase breathes at the end.
      if (last.duration < 1) last.duration = Math.min(2, last.duration * 2);
    }
  } catch (_) {}

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

/**
 * Derive a home key from the words themselves: positive valence lands on the
 * sharp side of the circle of fifths, negative on the flat side, and the word
 * hash + arousal pick the depth. Deterministic per input so the same words
 * always come back in the same key.
 */
function deriveRootFromLexical(lexical, input) {
  const sharps = ['C', 'G', 'D', 'A', 'E', 'B'];
  const flats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];
  const valence = (lexical && Number.isFinite(lexical.avgValence)) ? lexical.avgValence : 0;
  const arousal = (lexical && Number.isFinite(lexical.avgArousal)) ? lexical.avgArousal : 0;

  const s = String(input || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return null;
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;

  const side = valence >= 0 ? sharps : flats;
  // Higher arousal pushes toward "hotter" keys (more accidentals).
  const bias = Math.floor(Math.abs(arousal) * 2.5);
  const idx = Math.min(side.length - 1, (Math.abs(hash) % (side.length - bias > 0 ? side.length - bias : side.length)) + bias);
  return side[idx];
}

/**
 * Snap a duration to a value the notation engine can actually draw.
 * Allowed: sixteenth, dotted-eighth, eighth, dotted-quarter, quarter, half,
 * dotted-half, whole. Below ~0.3 rhythm complexity, dotted and sixteenth
 * values are removed entirely.
 */
function quantizeDuration(value, rhythmComplexity = 0.5) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0.5;
  const simple = rhythmComplexity < 0.3;
  const grid = simple ? [1, 2, 4] : [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
  let best = grid[0];
  let bestDist = Math.abs(v - best);
  for (const g of grid) {
    const d = Math.abs(v - g);
    if (d < bestDist) { bestDist = d; best = g; }
  }
  return best;
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
