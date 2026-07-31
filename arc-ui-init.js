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
        // Generation SYNCS the studio key to whatever it just derived from the
        // words. That sync fires scaleChanged, which used to be indistinguishable
        // from the user turning the key knob — so every generation pinned its own
        // key as a user override, and from the third generate onward every set of
        // words came out in the key the second one happened to land in.
        if (window.__arcSyncingStudioKey) return;
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
        if (window.__arcSyncingStudioKey) return;
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
      // Parsing is seed-free: a word's MEANING — its tone, valence, arousal,
      // arc shape — is a property of the word and must not drift between takes.
      // What the seed varies downstream is the interpretation: which key and
      // scale inside the region that meaning implies, which progression
      // template, which approach strategies, how the line scans. Pinning the
      // key and scale to the words as well left every regeneration of a phrase
      // identical, which read as the generator ignoring the request.
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
      const derivedRoot = keyVariety ? deriveRootFromLexical(lexical, String(input || ''), seed) : null;
      // A key the user chose by hand outranks the word-derived one, but only
      // for the TEXT they chose it against. Pinning it forever meant that once
      // anyone touched the key control, every later phrase — however different
      // its words — came out in that same key.
      const ov = (typeof window !== 'undefined' && window.__userKeyOverride) || null;
      const userKey = (ov && ov.forInput === String(input || '')) ? ov.key : null;
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
            words: String(input || '').toLowerCase().split(/\s+/).filter(Boolean),
            // The TONE stays word-derived, but which of the equally-fitting
            // scales in that tone gets used is a per-take decision. Without the
            // seed the ranked field was indexed by a pure hash of the words, so
            // regenerating the same phrase returned the identical scale forever.
            seed,
            avoid: recentScalePicks()
          });
          if (sel && sel.name) scaleName = sel.name;
        }
      } catch (_) {}
      scaleName = scaleName
        || (rich && rich.harmonicProfile && rich.harmonicProfile.recommendedScale)
        || (profile && profile.recommendedScale)
        || _studioScale;
      rememberScalePick(scaleName);

      let scaleNotes = [];
      try {
        if (_mt && typeof _mt.getScaleNotesWithKeySignature === 'function') {
          scaleNotes = _mt.getScaleNotesWithKeySignature(rootNote, scaleName) || [];
        } else if (_mt && typeof _mt.getScaleNotes === 'function') {
          scaleNotes = _mt.getScaleNotes(rootNote, scaleName) || [];
        }
      } catch (_) {}
      if (!scaleNotes.length) scaleNotes = _resolvedNotes;

      const timeSignature = chooseTimeSignature(rich, phraseChar, String(input || ''), seed);
      const tsMatch = String(timeSignature).match(/^(\d+)\s*\/\s*(\d+)$/);
      const beatsPerBar = tsMatch ? Math.max(2, Math.min(7, parseInt(tsMatch[1], 10) || 4)) : 4;
      // The DENOMINATOR, which used to be parsed and thrown away. Everything
      // downstream counts in beats, and a beat is a beat-UNIT — in 6/8 it is an
      // eighth, not a quarter. Without this the melody engine subdivides an
      // eighth into thirty-second notes because it believes it is dividing a
      // quarter, and the notation draws every value at twice its length.
      const beatUnit = tsMatch ? (parseInt(tsMatch[2], 10) || 4) : 4;

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

      // FORM. Four bars is one phrase — nothing in it can be a return, an
      // answer, or a contrast, so no amount of harmonic detail made the output
      // read as composed. The planner sizes the piece from the text and names
      // its sections; harmony and melody then build A / B / A' rather than four
      // independent bars.
      context.form = planFormFor(context, profile, seed, beatsPerBar);

      // Keep the studio scale library in sync with the generated key so the rest
      // of the app (fretboard, piano, sheet) reflects what was generated.
      try {
        if (_scaleLib && typeof _scaleLib.setKeyAndScale === 'function'
            && (rootNote !== _studioKey || scaleName !== _studioScale)) {
          // Flagged so the scaleChanged follower can tell this sync apart from
          // the user turning the key knob; otherwise it re-enters generation
          // and pins this key for every future phrase.
          window.__arcSyncingStudioKey = true;
          try { _scaleLib.setKeyAndScale(rootNote, scaleName); }
          finally { window.__arcSyncingStudioKey = false; }
        }
      } catch (_) { window.__arcSyncingStudioKey = false; }

      const formBars = (context.form && context.form.bars) || 4;
      arc = {
          bars: formBars,
          beatsPerBar,
          beatUnit,
          timeSignature,
          totalBeats: formBars * beatsPerBar,
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
      if (!Number.isFinite(arc.beatsPerBar)) arc.beatsPerBar = 4;
      if (!context.form) {
        context.form = planFormFor(context, profile, seed, arc.beatsPerBar);
      }
      // A caller-supplied bar count is a real instruction; only fill in from the
      // form when nothing was specified.
      if (!Number.isFinite(arc.bars)) arc.bars = (context.form && context.form.bars) || 4;
      else if (context.form) context.form = rescaleFormToBars(context.form, arc.bars);
      arc.totalBeats = arc.bars * arc.beatsPerBar;
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
    // The line engine writes above the voicing; the legacy fallback does not,
    // so that path still needs the chords bent under the tune instead.
    if (!voicingFirst() || !melody.voicingAware) {
      revoiceHarmonyAgainstMelody(harmony, melody, context);
    } else {
      const vs = harmony.voicingSettings || {};
      const mtRef2 = window.modularApp && window.modularApp.musicTheory;
      const alignedCount = alignVoicingToMelody(harmony, melody, arc.beatsPerBar || 4, mtRef2, vs.style, vs.overrides, vs.ceiling);
      if (alignedCount) harmony.voicingSettings = { ...vs, melodyAlignedChords: alignedCount };
    }
    // Split into two hands. Until this ran, "the accompaniment" was a stack of
    // chord tones drawn on the treble staff with the tune, which is a lead
    // sheet rather than piano writing.
    const piano = buildPianoTexture(context, arc, harmony, melody, seed);
    const scaleTimeline = buildScaleTimeline(context, arc, harmony);

    const generatedMusic = {
      harmony,
      melody,
      piano,
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

  // A key the user picked outranks the word-derived key — but only while the
  // words are the same. New text gets its own key.
  try { window.__userKeyOverride = { key, scale, forInput: String(inputs.input || '') }; } catch (_) {}

  return regenerateLastGeneration('key-change');
}
if (typeof window !== 'undefined') window.rekeyLastGeneration = rekeyLastGeneration;

/**
 * Rebuild the last take with a NEW form, keeping its words, key and seed.
 *
 * Changing the form changes the bar count, so the arc has to be resized with
 * it — which `regenerateLastGeneration` deliberately does not do, because for
 * every other setting the bar count must stay put.
 */
function recomposeLastGeneration(formKey, unitBars) {
  const inputs = (typeof window !== 'undefined') ? window.__lastGenInputs : null;
  if (!inputs || !inputs.context || !inputs.arc) return false;
  try {
    window.__formOverride = formKey && formKey !== 'auto'
      ? { form: formKey, unitBars: unitBars || undefined }
      : null;
    const ctx = inputs.context;
    const beatsPerBar = inputs.arc.beatsPerBar || 4;
    const form = planFormFor(ctx, null, inputs.seed, beatsPerBar);
    if (form) {
      ctx.form = form;
      inputs.arc.bars = form.bars;
      inputs.arc.totalBeats = form.bars * beatsPerBar;
      // The energy profile is indexed by beat, so it has to be re-sampled at
      // the new length or the arc stops lining up with the music.
      try {
        const total = inputs.arc.totalBeats;
        const prof = [];
        for (let i = 0; i < total; i++) {
          const t = total > 1 ? i / (total - 1) : 0;
          const v = typeof inputs.arc.sample === 'function' ? Number(inputs.arc.sample(t)) : 0.5;
          prof.push(Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5);
        }
        inputs.arc.energyProfile = prof;
      } catch (_) {}
    }
    return regenerateLastGeneration('form-change');
  } catch (err) {
    console.warn('[ArcInit] recompose failed', err);
    return false;
  }
}
if (typeof window !== 'undefined') window.recomposeLastGeneration = recomposeLastGeneration;

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
    // The line engine writes above the voicing; the legacy fallback does not,
    // so that path still needs the chords bent under the tune instead.
    if (!voicingFirst() || !melody.voicingAware) {
      revoiceHarmonyAgainstMelody(harmony, melody, context);
    } else {
      const vs = harmony.voicingSettings || {};
      const mtRef2 = window.modularApp && window.modularApp.musicTheory;
      const alignedCount = alignVoicingToMelody(harmony, melody, arc.beatsPerBar || 4, mtRef2, vs.style, vs.overrides, vs.ceiling);
      if (alignedCount) harmony.voicingSettings = { ...vs, melodyAlignedChords: alignedCount };
    }
    const piano = buildPianoTexture(context, arc, harmony, melody, seed);
    const scaleTimeline = buildScaleTimeline(context, arc, harmony);
    const generatedMusic = {
      harmony, melody, piano, scaleTimeline, context, arc, seed,
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

/**
 * VOICING-ONLY. Re-resolve every bar's chord voicing against the melody that
 * is ALREADY WRITTEN, without regenerating a single note of it.
 *
 * `regenerateLastGeneration` reruns the whole pipeline with the same seed,
 * which sounds like it should reproduce an identical melody — and it did,
 * before the melody became voicing-aware. Now the melody's own register
 * follows wherever the chords happen to sit, so re-running generation with a
 * different voicing setting genuinely produces a different melody even
 * though nothing about the words or the seed changed. The Voicing dropdown,
 * Register, Inversion, Voice Leading, VL Combos, VL Intensity and Randomize
 * have nothing to do with the tune; this reharmonizes the one that is
 * already on the page instead of building a new take around it.
 *
 * The chord IDENTITIES — which roman numeral, which root, which quality —
 * are read back from the harmony already on screen and held fixed. Only
 * their VOICING (style, spacing, inversion, register) is free to change.
 */
function revoiceLastGeneration(reason = 'voicing-only', randomSeed) {
  const prior = (typeof window !== 'undefined') ? window.__lastMusicGenerated : null;
  const inputs = (typeof window !== 'undefined') ? window.__lastGenInputs : null;
  // Nothing to reharmonize yet — fall back to a full generation so the
  // control still does something on a first-ever change.
  if (!prior || !prior.harmony || !prior.melody || !inputs || !inputs.arc) {
    return regenerateLastGeneration(reason);
  }
  try {
    const { harmony, melody, context, arc, seed, input } = prior;
    const mt = window.modularApp && window.modularApp.musicTheory;
    if (!mt) return regenerateLastGeneration(reason);

    // The one-chord-per-bar list the resolver expects, read back from the
    // harmony that already exists rather than rebuilt from the progression —
    // the SAME chord objects, not new ones drawn from the same romans.
    const seq = harmony.chordSequence || [];
    const barChordObjs = [];
    const seenBars = new Set();
    seq.forEach((ev) => {
      if (!ev || ev.approachStrategy || !ev.chordObj || !Number.isFinite(ev.bar)) return;
      if (seenBars.has(ev.bar)) return;
      seenBars.add(ev.bar);
      barChordObjs[ev.bar] = ev.chordObj;
    });
    const barCount = barChordObjs.length;
    for (let b = 0; b < barCount; b++) {
      if (!barChordObjs[b]) {
        const root = (context.harmonicProfile && context.harmonicProfile.root) || 'C';
        barChordObjs[b] = { root, chordType: 'major', fullName: root, chordNotes: [], diatonicNotes: [] };
      }
    }

    let vlEngine = null;
    if (typeof VoiceLeadingEngine !== 'undefined') {
      try { vlEngine = new VoiceLeadingEngine(mt); } catch (_) { vlEngine = null; }
    }

    const { voicings, voicingSettings } = resolveHarmonyVoicings(mt, barChordObjs, context, vlEngine, randomSeed);

    // Write the new voicing onto every structural event in that bar — a bar
    // struck twice (density 2) shares one voicing between both attacks, the
    // same as first generation. A bar whose voicing came out unusable falls
    // back to literal chord tones exactly as it would on a first pass.
    seq.forEach((ev) => {
      if (!ev || ev.approachStrategy || !Number.isFinite(ev.bar)) return;
      const v = voicings[ev.bar];
      if (v && v.voices) ev.voicing = v.voices; else delete ev.voicing;
    });
    harmony.voicingSettings = voicingSettings;

    // Rotate each bar's voicing to put the EXISTING melody's own chord tone
    // on top wherever it lands — the tune itself is read-only here.
    if (voicingFirst()) {
      const alignedCount = alignVoicingToMelody(
        harmony, melody, arc.beatsPerBar || 4, mt, voicingSettings.style, voicingSettings.overrides, voicingSettings.ceiling);
      if (alignedCount) harmony.voicingSettings = { ...harmony.voicingSettings, melodyAlignedChords: alignedCount };
    }

    // The accompaniment plays whatever the voicing now is; the melody feeding
    // it is the identical object, untouched.
    const piano = buildPianoTexture(context, arc, harmony, melody, seed);

    const generatedMusic = {
      harmony, melody, piano,
      scaleTimeline: prior.scaleTimeline,   // chord progression and keys did not change
      context, arc, seed,
      traceId: `arc-${Date.now().toString(36)}`,
      input,
      regeneratedFor: reason,
      melodyPreserved: true,
      timestamp: new Date().toISOString()
    };
    window.__lastMusicGenerated = generatedMusic;
    document.dispatchEvent(new CustomEvent('musicGenerated', { detail: generatedMusic }));
    return true;
  } catch (err) {
    console.warn('[ArcInit] revoice failed, falling back to full regenerate', err);
    return regenerateLastGeneration(reason);
  }
}
if (typeof window !== 'undefined') window.revoiceLastGeneration = revoiceLastGeneration;

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

  // The texture's own choices explain themselves too.
  //
  // The piano engine has always written an explanation for each of its
  // orchestrational exceptions — descant, tenor lead, crossover, bass melody,
  // covering voice — and every one of them was dropped on the floor: nothing
  // in the app read `piano.exceptions`. A user could hear the tune disappear
  // under a held chord tone and be told only which chord was sounding.
  //
  // They are keyed to the bar the exception STARTS on, and sorted in with the
  // harmonic explanations, because from the listener's side they are the same
  // kind of event: a reason why this bar sounds unlike the last one.
  const textureEvents = (((generatedMusic.piano || {}).exceptions) || [])
    .filter(x => x && typeof x.explain === 'string' && x.explain.trim().length)
    .map(x => ({ bar: Number(x.startBar) || 0, beat: 0, chord: `texture:${x.type}`, explain: x.explain }));

  const specials = seq
    .filter(ev => ev && typeof ev.explain === 'string' && ev.explain.trim().length)
    .concat(textureEvents)
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

/**
 * The functional reading of a scale, memoised.
 *
 * Deterministic for a given key and scale, and each call costs one
 * getDiatonicChord per degree, so it is worth not recomputing it per bar.
 */
const __scaleAnalysisCache = new Map();
function scaleAnalysis(mt, key, scaleName) {
  if (!mt || typeof FunctionalHarmony === 'undefined') return null;
  const cacheKey = `${key}|${scaleName}`;
  if (__scaleAnalysisCache.has(cacheKey)) return __scaleAnalysisCache.get(cacheKey);
  let an = null;
  try { an = FunctionalHarmony.analyzeScale(mt, key, scaleName); } catch (_) { an = null; }
  __scaleAnalysisCache.set(cacheKey, an);
  return an;
}

/**
 * Is every note of this chord in the scale?
 *
 * The question the "chromatic colour" label was really asking, and never
 * actually asked: it string-matched accidentals in the roman numeral instead,
 * which says nothing about pitch content. Returns the notes that are outside,
 * so the caller can name them rather than gesturing at "outside tension".
 */
function notesOutsideScale(mt, chordObj, scaleNotes) {
  const tones = (chordObj && (chordObj.chordNotes || chordObj.diatonicNotes)) || [];
  if (!tones.length || !Array.isArray(scaleNotes) || !scaleNotes.length || !mt || !mt.noteValues) return [];
  const pcOf = (n) => {
    const v = mt.noteValues[String(n).replace(/-?\d+$/, '')];
    return Number.isFinite(v) ? ((v % 12) + 12) % 12 : null;
  };
  const inScale = new Set(scaleNotes.map(pcOf).filter(Number.isFinite));
  const out = [];
  tones.forEach((t) => {
    const pc = pcOf(t);
    if (Number.isFinite(pc) && !inScale.has(pc) && !out.includes(t)) out.push(t);
  });
  return out;
}

/**
 * WHAT AN OUTSIDE NOTE IS ACTUALLY DOING.
 *
 * "Adds outside tension" is the sentence you write when you have not looked. It
 * is true of every chromatic chord ever played and therefore says nothing about
 * this one. Each branch below is a real harmonic reading and is only offered
 * when it is actually the case; the last one still names the note and what it
 * displaced, because that much is always knowable.
 */
function chromaticExplanation(mt, info) {
  const { chord, outside, chordObj, scaleNotes, nextChord, key, scaleName } = info;
  const pcOf = (n) => {
    const v = mt && mt.noteValues ? mt.noteValues[String(n).replace(/-?\d+$/, '')] : null;
    return Number.isFinite(v) ? ((v % 12) + 12) % 12 : null;
  };
  const noteList = outside.join(' and ');
  const isAre = outside.length > 1 ? 'are' : 'is';
  const keyLabel = `${key} ${formatScaleNameForDisplay(scaleName)}`;

  const rootPc = pcOf(chordObj && chordObj.root);
  const tones = (chordObj && (chordObj.chordNotes || chordObj.diatonicNotes)) || [];
  const ivs = tones.map(pcOf).filter(Number.isFinite)
    .map(p => ((p - rootPc) % 12 + 12) % 12);
  const isDominantQuality = ivs.includes(4) && ivs.includes(10);

  const nextRootPc = pcOf(nextChord && nextChord.root);
  const nextTones = (nextChord && (nextChord.chordNotes || nextChord.diatonicNotes)) || [];

  // 1. A dominant a fifth above what follows it. This is the single most
  //    common reason a chord leaves the key, and it has a name.
  if (isDominantQuality && Number.isFinite(rootPc) && Number.isFinite(nextRootPc)
      && ((rootPc - nextRootPc) % 12 + 12) % 12 === 7) {
    return `Secondary dominant: ${chord} is the dominant of ${nextChord.fullName}, `
      + `so it is heard as pointing at the next bar rather than as a colour on this one. `
      + `Its ${noteList} ${isAre} outside ${keyLabel} — that ${outside.length > 1 ? 'are' : 'is'} the leading tone `
      + `borrowed from ${nextChord.root}'s own key to make the arrival land.`;
  }

  // 2. A semitone under (or over) something in the next chord: a leading tone,
  //    whatever the chord's quality.
  const leadings = [];
  outside.forEach((n) => {
    const p = pcOf(n);
    if (!Number.isFinite(p)) return;
    nextTones.forEach((t) => {
      const tp = pcOf(t);
      if (!Number.isFinite(tp)) return;
      if (((tp - p) % 12 + 12) % 12 === 1) leadings.push(`${n} rises a semitone into ${t}`);
      else if (((p - tp) % 12 + 12) % 12 === 1) leadings.push(`${n} falls a semitone into ${t}`);
    });
  });
  if (leadings.length && nextChord) {
    return `Chromatic approach: ${leadings[0]}, which is in ${nextChord.fullName} — `
      + `the note is outside ${keyLabel} but it resolves by step, so it is heard as a lean toward the next chord.`;
  }

  // 3. An alteration of the chord the scale itself has on this root. Naming
  //    what was displaced is what makes the alteration audible as a choice.
  let displaced = null;
  outside.forEach((n) => {
    const p = pcOf(n);
    if (!Number.isFinite(p) || displaced) return;
    (scaleNotes || []).forEach((s) => {
      const sp = pcOf(s);
      if (!Number.isFinite(sp) || displaced) return;
      const up = ((sp - p) % 12 + 12) % 12;
      if (up === 1 || up === 11) displaced = { from: s, to: n, raised: up === 1 };
    });
  });
  if (displaced) {
    return `Altered chord tone: ${chord} ${displaced.raised ? 'lowers' : 'raises'} the scale's `
      + `${displaced.from} to ${displaced.to}. Everything else in the chord is diatonic, so what you hear `
      + `is that one note bending out of ${keyLabel} and the chord's quality changing with it.`;
  }

  // 4. Nothing structural to claim — so say only what is true.
  return `Outside the key: ${noteList} ${isAre} not in ${keyLabel}, `
    + `so ${chord} sits apart from the chords around it.`;
}

/** The scale actually in force for an event (a modulating bar has its own). */
function activeScaleNotesFor(mt, event, fallbackNotes) {
  if (event && event.scaleHint && Array.isArray(event.scaleHint.scaleNotes) && event.scaleHint.scaleNotes.length) {
    return event.scaleHint.scaleNotes;
  }
  if (event && mt && event.barKey && event.barScale) {
    try {
      const notes = (typeof mt.getScaleNotesWithKeySignature === 'function')
        ? mt.getScaleNotesWithKeySignature(event.barKey, event.barScale)
        : mt.getScaleNotes(event.barKey, event.barScale);
      if (notes && notes.length) return notes;
    } catch (_) {}
  }
  return fallbackNotes || [];
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

/**
 * Lay a chord progression out over the planned form, built from HARMONIC
 * FUNCTION rather than from a table of roman-numeral strings.
 *
 * The core is deliberately plain: each section is a walk through
 * tonic → predominant → dominant → tonic, using the degrees of whatever scale
 * the piece is actually in, closing with the cadence its role calls for.
 * Everything that makes a take distinctive — substitutions, borrowed colour,
 * approach runs, a modulation in the bridge — is a departure applied ON TOP of
 * that core, so there is always something recognisable to depart from.
 *
 * Rules that make the shape audible:
 *   - sections sharing a LETTER share their harmonic plan, so a return is
 *     heard as a return;
 *   - a primed restatement (A', A'') substitutes one interior chord for a
 *     functional equivalent, which is development rather than repetition;
 *   - a departure section may MODULATE to a related key through a pivot chord
 *     that is diatonic in both, and comes home for the return.
 *
 * @returns {{romans: string[], keyPlan: Array, modulations: Array}}
 */
function buildFormProgression({ form, barCount, toneTemplates, minorTone, rng, mt, key, scaleName, colour = 0.4, gate = null }) {
  const allow = (k) => !gate || gate.allow[k];
  const FH = (typeof FunctionalHarmony !== 'undefined') ? FunctionalHarmony : null;
  const PL = (typeof ProgressionLibrary !== 'undefined') ? ProgressionLibrary : null;
  const homeAnalysis = (FH && mt) ? FH.analyzeScale(mt, key, scaleName) : null;

  // Without the functional module (or on a scale it cannot read) fall back to
  // the tone templates, which is the previous behaviour.
  if (!FH || !homeAnalysis || !homeAnalysis.degrees.length) {
    return {
      romans: legacyTemplateProgression({ form, barCount, toneTemplates, minorTone, rng }),
      keyPlan: new Array(barCount).fill({ key, scaleName, home: true }),
      modulations: [], sectionProgressions: {}, devices: []
    };
  }

  const romans = new Array(barCount).fill(homeAnalysis.degrees[0].roman);
  const keyPlan = new Array(barCount).fill(null);
  const modulations = [];
  // Cached by THEME, not by letter. The second subject appearing in the
  // dominant in the exposition and in the tonic in the recapitulation is the
  // SAME MUSIC TRANSPOSED — that resolution is what sonata form is for.
  // Keying the cache on the letter plus the key meant those two sections
  // missed each other and generated unrelated progressions, so the defining
  // event of the form simply never happened. Roman numerals are already
  // relative to whatever tonic is in force, so reusing the same romans in a
  // different key IS the transposition.
  const planByTheme = {};

  // Substitutions have to respect the same degree gate the catalog does.
  // Both the "vary a restatement" pass and the adjacent-repeat pass picked
  // replacements straight out of the full degree list, which is how ♭III and
  // ♭VII kept appearing in a take whose setting promised primary triads only —
  // a theme-and-variations form fires that substitution on every restatement.
  const gateDegrees = gate && Array.isArray(gate.degrees) ? gate.degrees : null;
  const allowedRomans = (an) => {
    if (!gateDegrees) return null;
    return new Set(an.degrees.filter(d => gateDegrees.includes(d.degree)).map(d => d.roman));
  };
  const substituteFor = (an, roman, avoidA, avoidB) => {
    const here = an.degrees.find(d => d.roman === roman);
    if (!here) return null;
    const fn = Object.keys(here.functions).sort((x, y) => here.functions[y] - here.functions[x])[0];
    const ok = allowedRomans(an);
    return FH.candidates(an, fn).find(d =>
      d.roman !== roman && d.roman !== avoidA && d.roman !== avoidB &&
      (!ok || ok.has(d.roman))) || null;
  };
  const sectionProgressions = {};
  const devices = [];
  let developmentSection = null;

  if (!form) {
    const p = FH.progression(homeAnalysis, { bars: barCount, cadence: 'authentic', rng, colour });
    for (let b = 0; b < barCount; b++) {
      romans[b] = p.romans[b] || homeAnalysis.degrees[0].roman;
      keyPlan[b] = { key, scaleName, home: true };
    }
    return { romans, keyPlan, modulations, sectionProgressions, devices };
  }

  let prevRelation = null;
  form.sections.forEach((section) => {
    let analysis = homeAnalysis;
    let sectionKey = key;
    let sectionScale = scaleName;
    let modulation = null;

    // THE TONAL PLAN DECIDES THE KEY, NOT A DICE ROLL.
    //
    // v1 rolled for a modulation per section and picked a related key at
    // random. That produces key changes, but not a tonal ARGUMENT: sonata form
    // means nothing unless the second subject is in the dominant the first time
    // and at home the second, and no amount of randomness will reliably do
    // that. The form now states the key relation for every section, and this
    // just realises it — including the case where the relation is 'unstable',
    // which is what a development section is.
    const rel = section.keyRelation || 'I';
    // Only a CHANGE of key is a modulation. Consecutive sections sharing a
    // relation (a second subject and its codetta are both in the dominant)
    // must not each register a move and each drop a pivot chord — the second
    // pivot landed in the previous section's final bar and dragged it back to
    // the home key, cutting the second subject's cadence off from its own key.
    const changesKey = rel !== prevRelation;
    const wantsMove = rel !== 'I' && Number.isFinite(section.keyOffset) && allow('modulation');

    if (wantsMove && mt && typeof mt.transposeNote === 'function') {
      let targetKey = mt.transposeNote(key, section.keyOffset);
      // Spell the new tonic to match the direction the home key leans. B major
      // modulating to its dominant is F♯ major, not G♭ major — the pitch is the
      // same and only one of them is readable next to five sharps.
      try {
        const homeIsFlat = /b/.test(String(key));
        if (targetKey && mt.noteValues && typeof mt.spellSemitoneWithPreference === 'function') {
          const v = mt.noteValues[targetKey];
          if (Number.isFinite(v)) {
            const respelled = mt.spellSemitoneWithPreference(v, homeIsFlat, null);
            if (respelled) targetKey = respelled;
          }
        }
      } catch (_) {}
      // Keep the home mode unless the plan explicitly asks for major/minor —
      // a bridge in the subdominant should still sound like the same piece.
      const targetScale = section.keyMode === 'minor' ? 'aeolian'
        : section.keyMode === 'major' ? 'major'
        : scaleName;
      const target = targetKey ? FH.analyzeScale(mt, targetKey, targetScale) : null;
      if (target && target.degrees.length && target.functional) {
        const pivot = FH.findPivot(mt, homeAnalysis, target);
        analysis = target;
        sectionKey = targetKey;
        sectionScale = targetScale;
        modulation = {
          startBar: section.startBar,
          endBar: section.endBar,
          toKey: targetKey,
          toScale: targetScale,
          relation: section.keyLabel || rel,
          planned: true,
          pivotChord: pivot ? pivot.from.root : null,
          pivotRomanHome: pivot ? pivot.from.roman : null,
          pivotRomanNew: pivot ? pivot.to.roman : null,
          section: section.label,
          // Flagged so the provenance panel can say WHY: this is the moment
          // the form was built around.
          isStructural: !!section.resolvesTension
        };
        modulations.push(modulation);
      }
    } else if (rel === 'unstable') {
      // A DEVELOPMENT does not modulate to somewhere; it refuses to settle.
      // Sequencing the theme through a chain of related keys, none held long
      // enough to become home, is what makes the eventual return feel like an
      // arrival rather than just the next section.
      developmentSection = section;
    }

    // Sections sharing a letter share their plan — that is the return.
    let bars;
    let progressionUsed = null;
    const cached = planByTheme[section.theme];
    // Deliberately NOT comparing keys: a different key is the whole point.
    if (cached && cached.romans.length === section.bars) {
      bars = cached.romans.slice();
      progressionUsed = cached.progression || null;
    } else {
      // A NAMED PROGRESSION FIRST.
      //
      // "2 5 1" is the second, fifth and first chords of whatever scale is in
      // force — in D Lydian that is E7–Amaj7–Dmaj7, which is a real 2-5-1 and
      // nothing like the ii–V–I roman numerals would have forced. The standard
      // progressions are what most music actually is, so they are the default
      // material; the free functional walk is the fallback for the cases none
      // of them fit.
      const wantNamed = PL && rng() < 0.82;
      if (wantNamed) {
        const endsOn = FH.cadenceTargetDegree(section.cadence);
        const chosen = PL.choose({
          bars: section.bars,
          endsOn,
          rng,
          colour,
          // The dial filters which progressions exist at all.
          // Overrides widen the pool too: forcing "all seven diatonic chords"
          // on has to actually make ii/iii/vi available, not just leave the
          // ladder's three-chord filter in place.
          families: gate ? (allow('sequences') || allow('modulation') ? null : gate.families) : null,
          degrees: gate ? (allow('fullDiatonic')
            ? (allow('seventhChords') ? [1,2,3,4,5,6,7] : [1,2,3,4,5,6])
            : [1,4,5]) : null,
          // Different letters get different progressions so B is genuinely
          // other material rather than the A progression rotated.
          exclude: Object.values(planByTheme).map(p => p.progression && p.progression.id).filter(Boolean)
        });
        if (chosen) {
          const degrees = PL.fitToBars(chosen.degrees, section.bars, rng);
          bars = degrees.map(d => FH.romanForDegree(analysis, d));
          progressionUsed = {
            id: chosen.id, name: chosen.name, family: chosen.family,
            degrees: chosen.degrees.slice(), fitted: degrees.slice()
          };
        }
      }

      if (!bars || !bars.length) {
        const built = FH.progression(analysis, {
          bars: section.bars,
          cadence: section.cadence,
          rng,
          colour,
          // The walk has to respect the same degree gate the catalog does, or
          // a setting that promises primary triads still produces ♭III and ♭VII
          // whenever no catalog entry happened to fit the section length.
          allowedDegrees: gate ? gate.degrees : null,
          // Only a first statement has to establish the tonic; a departure is
          // free to open away from it.
          // The opening of the piece, and the opening of any stable section
          // that lives in the home key, has to state that key. Testing for
          // letter 'A' worked only for the lettered forms — sonata's first
          // section is 'P', so the piece opened on whatever degree the
          // progression happened to start with.
          startOnTonic: section.index === 0
            || (section.stability === 'stable' && section.keyRelation === 'I')
            || !!modulation
        });
        bars = built.romans.slice();
        progressionUsed = { id: 'functional-walk', name: 'functional walk', family: 'generated' };
      }
      planByTheme[section.theme] = {
        romans: bars.slice(), key: sectionKey, scaleName: sectionScale, progression: progressionUsed
      };
    }
    // A DEVELOPMENT SEQUENCES rather than settles. Every couple of bars the
    // same shape is restated a step or a third away, and because none of those
    // keys is held long enough to become home, the return to the tonic reads as
    // an arrival instead of merely the next thing.
    if (section.stability === 'developmental' && bars.length >= 4 && mt && allow('modulation')) {
      const legs = [0, 2, -3, 5];          // tonic, up a step, down a third, up a fourth
      const legLen = Math.max(1, Math.floor(bars.length / legs.length));
      for (let li = 1; li < legs.length; li++) {
        const at = li * legLen;
        if (at >= bars.length - 1) break;
        const legKey = mt.transposeNote(sectionKey, legs[li]);
        const legAnalysis = legKey ? FH.analyzeScale(mt, legKey, sectionScale) : null;
        if (!legAnalysis || !legAnalysis.degrees.length) continue;
        for (let b = at; b < Math.min(bars.length - 1, at + legLen); b++) {
          const homeDeg = analysis.degrees.find(d => d.roman === bars[b]);
          const idx = homeDeg ? analysis.degrees.indexOf(homeDeg) : 0;
          bars[b] = legAnalysis.degrees[idx % legAnalysis.degrees.length].roman;
          keyPlan[section.startBar + b] = {
            key: legKey, scaleName: sectionScale, home: false, developmental: true
          };
        }
        devices.push({
          type: 'development-sequence', bar: section.startBar + at,
          section: section.label, toKey: legKey,
          explain: `Development: the theme restated in ${legKey}. None of these keys is held long `
            + `enough to become home, which is what makes the recapitulation an arrival.`
        });
      }
    }

    sectionProgressions[section.label] = progressionUsed;

    // ENFORCE THE SECTION'S OWN CADENCE — always, including when the material
    // came from the shared-letter cache.
    //
    // Sections sharing a letter share their PROGRESSION, but they must not
    // share their ending: in AABA the first A hangs open on the dominant and
    // the last A is the one that closes the piece. Applying the cadence only
    // when the progression was freshly built meant every restatement inherited
    // the first statement's half cadence, so more than a third of pieces simply
    // stopped on V and never resolved.
    if (bars.length) {
      const endsOnDeg = FH.cadenceTargetDegree(section.cadence);
      const wantRoman = section.cadence === 'half'
        ? FH.cadenceRomans(analysis, 'half', rng).last
        : FH.romanForDegree(analysis, endsOnDeg);
      if (bars[bars.length - 1] !== wantRoman) bars[bars.length - 1] = wantRoman;
      // …and approach it from the right place: a cadence needs its dominant.
      if (bars.length >= 2 && (section.cadence === 'authentic' || section.cadence === 'deceptive')) {
        const dom = FH.cadenceRomans(analysis, 'authentic', rng).pre;
        if (bars[bars.length - 2] === bars[bars.length - 1]) bars[bars.length - 2] = dom;
      }
    }

    // Development: a restatement swaps one interior chord for another degree
    // serving the SAME function, so the progression still means the same thing
    // while sounding different.
    // A restatement in a NEW KEY is already transformed — the transposition is
    // the transformation, and it is the event the form was built around. Also
    // altering a chord inside it destroys the recognition the recapitulation
    // depends on. Only same-key restatements get the substitution.
    const sameKeyRestatement = section.variation > 0
      && cached && cached.key === sectionKey;
    if (sameKeyRestatement && bars.length > 2) {
      const start = 1 + Math.floor(rng() * (bars.length - 2));
      for (let k = 0; k < bars.length - 2; k++) {
        const at = 1 + ((start - 1 + k) % (bars.length - 2));
        const alt = substituteFor(analysis, bars[at], bars[at - 1], bars[at + 1]);
        if (alt) { bars[at] = alt.roman; break; }
      }
    }

    // CHROMATIC MEDIANT. A root a third away with a quality the key does not
    // supply — C major stepping to E major or A♭ major. There is no functional
    // preparation and none is wanted: the effect is of the same music seen
    // under a different light, and it works precisely because the surrounding
    // progression is ordinary. Placed on an interior bar so it colours the
    // section rather than derailing its cadence.
    // Interior bars only: the opening establishes the key and the last two are
    // the cadence, and a mediant landing on either undoes the thing it is
    // supposed to be colouring.
    if (PL && allow('chromaticMediants') && bars.length >= 4 && rng() < colour * 0.4) {
      const at = 1 + Math.floor(rng() * Math.max(1, bars.length - 3));
      const med = PL.chromaticMediant(rng);
      // Expressed as an accidental roman so the existing resolver builds it.
      const MEDIANT_ROMAN = { 4: 'III', 3: 'bIII', 8: 'bVI', 9: 'VI' };
      const rom = MEDIANT_ROMAN[med.semitones];
      if (rom && bars[at] !== rom) {
        bars[at] = med.quality === 'min' ? rom.toLowerCase() : rom;
        devices.push({
          type: 'chromatic-mediant', bar: section.startBar + at,
          name: med.name, relation: med.relation, section: section.label,
          explain: `Chromatic mediant: ${med.name} — a root a third away with a quality the key `
            + `does not contain, so it arrives with no preparation and two common tones`
        });
      }
    }

    // INTERVAL SEQUENCE. One cell transposed repeatedly by a fixed interval —
    // planing when the quality is held constant, a diatonic sequence when each
    // copy is refitted to the scale. Both are real compositional devices and
    // both need room, so this only fires in a section long enough to state the
    // cell and at least two copies of it.
    // A sequence DECORATES a section; it must not become the section. An
    // earlier version was allowed to start at bar 0 and run as long as it
    // liked, which overwrote the named progression outright — the label said
    // "iii–vi–ii–V" while the bars said something else entirely. It now leaves
    // the opening tonic and the cadence alone and covers at most half the
    // section, so the progression stays recognisable underneath it.
    if (PL && allow('sequences') && bars.length >= 4 && rng() < 0.35 + colour * 0.4) {
      const pat = PL.sequencePattern(rng, { allowChromatic: colour > 0.5 });
      pat.length = Math.max(2, Math.min(pat.length, Math.floor((bars.length - 2) / 2)));
      const start = Math.max(1, bars.length - 2 - pat.length);
      const baseDeg = FH.degreeInfo(analysis, 1 + Math.floor(rng() * 7));
      if (baseDeg && start >= 1 && start + pat.length <= bars.length - 1) {
        const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];
        const baseSemi = baseDeg.interval;
        for (let i = 0; i < pat.length && start + i < bars.length - 1; i++) {
          const semi = ((baseSemi + pat.semitones * i) % 12 + 12) % 12;
          if (pat.mode === 'diatonic') {
            // Refit to the scale: the nearest degree the key actually has.
            let best = analysis.degrees[0], bd = 12;
            analysis.degrees.forEach(d => {
              const dist = Math.min((d.interval - semi + 12) % 12, (semi - d.interval + 12) % 12);
              if (dist < bd) { bd = dist; best = d; }
            });
            bars[start + i] = best.roman;
          } else {
            const natural = MAJOR_SEMIS.indexOf(semi);
            const rom = natural >= 0
              ? FunctionalHarmony.ROMAN_BY_INTERVAL[semi]
              : FunctionalHarmony.ROMAN_BY_INTERVAL[semi];
            if (rom) bars[start + i] = rom;
          }
        }
        devices.push({
          type: 'interval-sequence', bar: section.startBar + start,
          length: pat.length, mode: pat.mode, name: pat.name, section: section.label,
          explain: `${pat.mode === 'parallel' ? 'Planing' : 'Diatonic sequence'}: the same shape moved by `
            + `${pat.name}, ${pat.length} times — the repetition is what makes it read as intent`
        });
      }
    }

    // The pivot is placed in the bar BEFORE the modulating section so the move
    // is prepared rather than announced.
    if (modulation && modulation.pivotRomanHome && section.startBar > 0 && changesKey) {
      romans[section.startBar - 1] = modulation.pivotRomanHome;
      keyPlan[section.startBar - 1] = { key, scaleName, home: true, pivot: true };
    }

    prevRelation = rel;
    for (let i = 0; i < bars.length; i++) {
      const b = section.startBar + i;
      if (b >= barCount) break;
      romans[b] = bars[i];
      // A development leg already wrote the key it sequenced through; blanket
      // assignment here erased it and the whole development reported as being
      // at home, which is the one thing a development is not.
      if (!(keyPlan[b] && keyPlan[b].developmental)) {
        keyPlan[b] = { key: sectionKey, scaleName: sectionScale, home: !modulation };
      }
    }
  });

  for (let b = 0; b < barCount; b++) {
    if (!keyPlan[b]) keyPlan[b] = { key, scaleName, home: true };
  }

  // --- FORESHADOWING ---------------------------------------------------
  //
  // A modulation announced by its own accidentals arriving early is a promise;
  // the same modulation arriving unannounced is an edit. Before each planned
  // key change the bars leading in take the SECONDARY DOMINANT of the target —
  // V/V before a move to the dominant — which drags that key's leading tone
  // into the music while the old key is still sounding. That single accidental
  // is the whole mechanism: the ear registers something pulling before it can
  // say toward what.
  (allow('secondaryDominants') ? (form.foreshadow || []) : []).forEach((fs) => {
    if (!Number.isFinite(fs.targetOffset) || !mt) return;
    const bar = fs.toBar;
    if (bar < 0 || bar >= barCount) return;
    // Do not overwrite a cadence — the approach has to sit before it, not on it.
    const sec = form.sectionOfBar && form.sectionOfBar[bar];
    if (sec && bar === sec.endBar && bar !== fs.toBar) return;

    // A PROMISE ONLY COUNTS IF IT IS KEPT.
    //
    // The form plans a key for every section; whether that key is ever reached
    // depends on the complexity gate, which switches modulation on well above
    // the level that switches secondary dominants on. In the band between the
    // two, this pass announced "foreshadowing the move to the relative minor"
    // and then no move happened — the piece explained a modulation it never
    // made, twice in twelve bars. So the promise is only made when the
    // modulation it points at is actually in the plan.
    const realised = (modulations || []).find(m =>
      m.section === fs.targetSection || m.startBar === bar + 1);
    if (!realised || !realised.toKey) return;

    try {
      const targetRoot = realised.toKey;
      // …and never foreshadow the key already sounding. "Foreshadowing the move
      // to the tonic" in a bar that is in the tonic is not a subtle point, it is
      // a contradiction.
      const hereKey = (keyPlan[bar] && keyPlan[bar].key) || key;
      if (FH_pcOf(mt, targetRoot) === FH_pcOf(mt, hereKey)) return;

      // The dominant OF the target key: a fifth above it.
      const secondaryRoot = mt.transposeNote(targetRoot, 7);
      if (!secondaryRoot) return;
      const semis = ((FH_pcOf(mt, secondaryRoot) - FH_pcOf(mt, key)) % 12 + 12) % 12;
      const roman = FunctionalHarmony.ROMAN_BY_INTERVAL[semis];
      if (!roman) return;
      // Already prepared by the bar before it — a second identical chord adds
      // nothing and just reads as the harmony stalling.
      if (bar > 0 && romans[bar - 1] === roman) return;
      romans[bar] = roman;
      // The chord has to BE a dominant seventh, not whatever quality the home
      // scale happens to put on that degree. The mechanism is the leading tone;
      // a chord without it foreshadows nothing, and that is what produced a bar
      // labelled "the dominant of the key about to arrive" while a DmMaj7 — no
      // leading tone anywhere in it — was sounding.
      keyPlan[bar] = {
        ...(keyPlan[bar] || { key, scaleName, home: true }),
        foreshadows: realised.relation || fs.targetRelation,
        dominantOn: secondaryRoot
      };
      const leadingTone = mt.transposeNote(secondaryRoot, 4);
      devices.push({
        type: 'foreshadow', bar,
        targetKey: targetRoot, targetRelation: realised.relation || fs.targetRelation,
        secondary: `V/${realised.relation || fs.targetRelation}`,
        explain: `Foreshadowing the move to ${targetRoot} (${realised.relation || fs.targetRelation}): `
          + `${secondaryRoot}7 is that key's dominant, sounding a bar before the key itself arrives. `
          + (leadingTone
              ? `Its ${leadingTone} is the leading tone of ${targetRoot} and is outside the current key — `
                + `that one note is the whole mechanism, and it is why the modulation is heard as promised `
                + `rather than as an edit.`
              : `The modulation is heard as promised rather than as an edit.`)
      });
    } catch (_) {}
  });

  // --- SUBVERSION ------------------------------------------------------
  //
  // Breaking a pattern requires having built one. The planner has already
  // decided WHICH expectation is available and WHERE it is strongest; this
  // realises the break in the chords.
  (allow('subversions') ? (form.subversions || []) : []).forEach((sv) => {
    const bar = sv.bar;
    if (!Number.isFinite(bar) || bar < 0 || bar >= barCount) return;
    const an = FH.analyzeScale(mt, keyPlan[bar].key, keyPlan[bar].scaleName) || homeAnalysis;
    if (!an || !an.degrees.length) return;

    switch (sv.kind) {
      case 'deceptive': {
        // The dominant is left in place; only its resolution changes.
        const sub = FH.candidates(an, 'T').find(d => d.interval === 9 || d.interval === 8);
        if (sub) romans[bar] = sub.roman;
        break;
      }
      case 'modalFlip': {
        // Same degree, opposite mode. Handled downstream by re-spelling the
        // chord, so the roman is flipped in case rather than replaced.
        const cur = String(romans[bar]);
        romans[bar] = /[a-z]/.test(cur) ? cur.toUpperCase() : cur.toLowerCase();
        break;
      }
      case 'evaded':
      case 'interruption': {
        // Stop ON the dominant: the expected resolution never comes.
        const dom = FH.cadenceRomans(an, 'authentic', rng).pre;
        romans[bar] = dom;
        break;
      }
      case 'truncation':
      case 'elision':
      default:
        // Rhythmic/phrase-level; the melody engine realises these.
        break;
    }
    devices.push({ type: 'subversion', bar, kind: sv.kind, name: sv.name, explain: sv.explain });
  });

  // A chord repeated across two adjacent bars is one chord held for two bars,
  // not a progression. These turn up most often at a section seam, where one
  // section's cadence happens to land on the degree the next one opens with —
  // so the pass runs over the whole piece rather than inside each section.
  const FH2 = FH;
  for (let b = 1; b < barCount - 1; b++) {
    if (romans[b] !== romans[b - 1]) continue;
    if (keyPlan[b].key !== keyPlan[b - 1].key) continue;   // a real key change, leave it
    // A foreshadowing chord is placed deliberately and may legitimately repeat
    // the bar before it; rewriting it here silently removed the preparation and
    // the modulation went back to arriving unannounced.
    if (keyPlan[b] && keyPlan[b].foreshadows) continue;
    const an = FH2.analyzeScale(mt, keyPlan[b].key, keyPlan[b].scaleName) || homeAnalysis;
    const alt = substituteFor(an, romans[b], romans[b - 1], romans[b + 1]);
    if (alt) romans[b] = alt.roman;
  }

  return { romans, keyPlan, modulations, sectionProgressions, devices };
}

/** Pitch class of a note name, via the theory engine when it knows it. */
function FH_pcOf(mt, name) {
  const pc = String(name || '').replace(/-?\d+$/, '');
  if (mt && mt.noteValues && Number.isFinite(mt.noteValues[pc])) return mt.noteValues[pc];
  return ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].indexOf(pc);
}

/** The pre-functional behaviour, kept as a fallback. */
function legacyTemplateProgression({ form, barCount, toneTemplates, minorTone, rng }) {
  const templates = Array.isArray(toneTemplates[0]) ? toneTemplates : [toneTemplates];
  const pick = () => templates[Math.floor(rng() * templates.length)].slice();
  const t = pick();
  const out = [];
  for (let b = 0; b < barCount; b++) out.push(t[b % t.length]);
  if (!form) return out;
  const tonic = minorTone ? 'i' : 'I';
  form.sections.forEach((s) => {
    const last = Math.min(barCount - 1, s.endBar);
    out[last] = s.cadence === 'half' ? 'V' : tonic;
  });
  return out;
}

/**
 * Is this voicing a faithful rendering of the chord?
 *
 * The old test demanded four DISTINCT pitch classes for a four-note chord,
 * which rejects the single most common thing in four-part writing: doubling the
 * root. Fourteen of every twenty-one voicings were being thrown away on that
 * basis, so nearly all the voice-leading work was discarded and the
 * accompaniment fell back to literal chord tones every time.
 *
 * What actually matters is that nothing OUTSIDE the chord sounds, and that the
 * tones which define its quality are present. The fifth is the omissible one;
 * the third and the seventh are what make a chord the chord it is.
 *
 * `opts.rootless` and `opts.minVoices` exist because some of the named styles
 * ARE deliberate omissions. A jazz rootless voicing has no root and a shell has
 * three notes; failing them for that is failing them for being what the user
 * asked for, and the fallback silently replaced the chosen voicing with literal
 * chord tones.
 */
function voicingIsFaithful(mt, chordObj, voices, opts = {}) {
  const tones = (chordObj && (chordObj.chordNotes || chordObj.diatonicNotes)) || [];
  if (!tones.length || !voices) return false;
  const pcOf = (n) => {
    const nm = String(n).replace(/-?\d+$/, '');
    return mt && mt.noteValues && Number.isFinite(mt.noteValues[nm]) ? mt.noteValues[nm] : null;
  };
  const chordPcs = tones.map(pcOf).filter(Number.isFinite).map(v => ((v % 12) + 12) % 12);
  if (!chordPcs.length) return false;

  const midis = Object.values(voices).filter(Number.isFinite);
  if (midis.length < (Number(opts.minVoices) || 3)) return false;
  const voicedPcs = midis.map(m => ((m % 12) + 12) % 12);

  // 1. No note outside the chord.
  if (!voicedPcs.every(pc => chordPcs.includes(pc))) return false;

  // 2. The tones that define the quality must be there. Root and third always;
  //    the seventh too when the chord has one. The fifth may be dropped.
  const root = chordPcs[0];
  const need = opts.rootless ? [] : [root];
  const third = chordPcs.find(pc => {
    const iv = ((pc - root) % 12 + 12) % 12;
    return iv === 3 || iv === 4;
  });
  if (Number.isFinite(third)) need.push(third);
  const seventh = chordPcs.find(pc => {
    const iv = ((pc - root) % 12 + 12) % 12;
    return iv === 10 || iv === 11;
  });
  if (Number.isFinite(seventh)) need.push(seventh);

  const have = new Set(voicedPcs);
  return need.every(pc => have.has(pc));
}

/**
 * THE VOICING IS THE FRAME THE REST OF THE MUSIC IS WRITTEN INTO.
 *
 * Where the top of the chord sits, per Register setting. The melody goes above
 * this, so the ceiling is really the seam between the two: at E4 the chord
 * occupies roughly the octave below middle C and the tune sings from F4 up,
 * which is the ordinary hand position for chord-under-melody playing. Raising
 * it raises the whole texture rather than only the accompaniment.
 */
const VOICING_TOP_CEIL = { low: 59, mid: 64, high: 69 };
const VOICING_BASS_FLOOR = 33;   // A1 — below this a chord is a growl

/**
 * Resolve every bar's voicing ONCE, before the melody exists.
 *
 * Two things used to happen to a chosen voicing after it was chosen. The
 * voice-leading engine knows only `close` and `spread`, so fifteen of the
 * eighteen manual styles reached it as one of those two; and the piano texture
 * then re-applied the named style to whatever it had been handed, squashed it
 * under the melody and thinned it to two or three notes. Nothing downstream
 * ever played the voicing the user picked.
 *
 * Here a manual style is built from the chord's own tones in close position —
 * which is the shape drop-2, shell and quartal are all defined against — and
 * only then placed in a register. The intelligent modes keep the voice-leading
 * engine's answer, because solving each chord against the last IS what they
 * are for. Either way the result is the chord as it will actually sound, so the
 * melody can be written above it and the texture can play it as written.
 *
 * @returns {Array<Object|null>} per-bar `voices` objects, null where unusable
 */
function resolveVoicings({ mt, chordObjs, led, style, register, overrides, inversion, voiceLeading, vlCombos, vlIntensity, randomSeed }) {
  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ceiling = VOICING_TOP_CEIL[register] || VOICING_TOP_CEIL.mid;
  const styleFn = (typeof window !== 'undefined' && typeof window.applyVoicingStyleTo === 'function')
    ? window.applyVoicingStyleTo : null;
  // 0 = place every chord at its canonical register and ignore what came
  // before; 1 = favour minimal motion from the previous chord strongly. This
  // is the "VL Intensity" slider's only previous effect anywhere in the code
  // was to sit in state and be read by nothing — it now scales the same
  // movement term `place()` already computed against a fixed weight.
  const intensity = Number.isFinite(vlIntensity) ? Math.max(0, Math.min(1, vlIntensity)) : 0.5;
  const movementWeight = 0.15 + intensity * 1.35;

  // RANDOMIZE: every choice this function makes is otherwise a deterministic
  // minimum, so re-running it with identical settings always lands on the
  // identical voicing — the Randomize button had nothing to randomize. A
  // seed nudges near-tied candidates apart by an amount small next to the
  // register and bass-floor penalties, so it can only ever decide between
  // options that were already close, never promote a genuinely worse one.
  const jitterRng = Number.isFinite(randomSeed) ? createRNG(randomSeed) : null;
  const jitter = () => jitterRng ? (jitterRng() - 0.5) * 1.4 : 0;

  const pcOf = (n) => {
    const nm = String(n).replace(/-?\d+$/, '');
    const v = mt && mt.noteValues ? mt.noteValues[nm] : null;
    return Number.isFinite(v) ? ((v % 12) + 12) % 12 : null;
  };
  const nameOf = (midi) => `${CHROMATIC[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
  const midiOf = (name) => {
    const m = String(name || '').match(/^([A-Ga-g][#b]?)(-?\d+)$/);
    if (!m) return null;
    const pc = pcOf(m[1]);
    return Number.isFinite(pc) ? pc + (parseInt(m[2], 10) + 1) * 12 : null;
  };

  // The chord's pitch classes in the order its tones were given — root,
  // third, fifth, seventh — before any inversion or style touches them.
  const chordPcs = (chordObj) => {
    const tones = (chordObj && (chordObj.chordNotes || chordObj.diatonicNotes)) || [];
    const pcs = [];
    tones.forEach((t) => {
      const pc = pcOf(t);
      if (Number.isFinite(pc) && !pcs.includes(pc)) pcs.push(pc);
    });
    return pcs;
  };
  // Stack a pitch-class list ascending from just under C3 — the input every
  // named style assumes, and the shape "Root position" means before an
  // inversion or a style is applied.
  const stackFromPcs = (pcs) => {
    if (!pcs.length) return null;
    const out = [];
    let cursor = 47;
    pcs.forEach((pc) => {
      let m = cursor + 1;
      while ((((m % 12) + 12) % 12) !== pc) m++;
      out.push(m);
      cursor = m;
    });
    return out;
  };
  // INVERSION: which chord tone starts the stack. Rotating the pitch-class
  // list before stacking and styling is what "1st inversion drop-2" means —
  // the style is still built from this new bottom tone, not bolted on after.
  const rotate = (arr, n) => {
    if (!arr.length) return arr;
    const k = ((n % arr.length) + arr.length) % arr.length;
    return arr.slice(k).concat(arr.slice(0, k));
  };

  // Octave-place a stack without touching its internal spacing — the spacing
  // IS the voicing — and report the cost so callers can compare candidates
  // (different inversions, different sources) against each other, not just
  // pick blindly.
  //
  // Placement is judged by the TOP of the chord, not the bottom: the top
  // voice is the one the melody sits over, so a chord that hangs well below
  // the ceiling leaves a hole in the middle of the texture. Judging by the
  // bottom instead — trying to keep the bass near a comfortable A2 — dropped
  // every thin voicing an octave, because a three-note rootless shape has its
  // bass where a four-note one has its tenor.
  const place = (midis, prevBottom) => {
    const base = midis.slice().sort((a, b) => a - b);
    let best = null;
    [0, -12, 12, -24, 24].forEach((shift) => {
      const cand = base.map(m => m + shift);
      const top = cand[cand.length - 1];
      const bottom = cand[0];
      const cost = (top > ceiling ? (top - ceiling) * 4 : (ceiling - top) * 0.6)
        + (bottom < VOICING_BASS_FLOOR ? (VOICING_BASS_FLOOR - bottom) * 4 : 0)
        + (Number.isFinite(prevBottom) ? Math.abs(bottom - prevBottom) * movementWeight : 0)
        + jitter();
      if (!best || cost < best.cost) best = { cand, cost };
    });
    return best;
  };

  const VOICE_NAMES = ['bass', 'tenor', 'alto', 'soprano'];
  const toVoices = (midis) => {
    const voices = {};
    midis.forEach((m, i) => {
      voices[i < VOICE_NAMES.length ? VOICE_NAMES[i] : `upper${i}`] = m;
    });
    return voices;
  };

  // Build the styled, placed candidate for one inversion of one chord.
  const buildCandidate = (chordObj, barStyle, invIdx, prevBottom) => {
    const pcs = chordPcs(chordObj);
    if (!pcs.length) return null;
    const stack = stackFromPcs(rotate(pcs, invIdx));
    if (!stack) return null;
    let midis = null;
    if (barStyle && styleFn) {
      try {
        const styled = styleFn(stack.map(nameOf), barStyle);
        const asMidi = (Array.isArray(styled) ? styled : []).map(midiOf).filter(Number.isFinite);
        if (asMidi.length >= 2) midis = asMidi;
      } catch (_) { midis = null; }
    }
    if (!midis) midis = stack;
    return place(Array.from(new Set(midis)), prevBottom);
  };

  const out = [];
  let prevBottom = null;
  let rejected = 0;
  chordObjs.forEach((chordObj, i) => {
    const barStyle = (overrides && overrides[i] && overrides[i].voicing) || style;
    const maxInv = Math.max(0, chordPcs(chordObj).length - 1);
    const pinned = Number.isFinite(inversion) ? Math.max(0, Math.min(Math.round(inversion), maxInv)) : 0;

    // A pinned inversion (anything but "Root") is an explicit instruction and
    // wins outright. Left at Root, Voice Leading and VL Combos are free to
    // pick whichever inversion moves least from the previous chord — that is
    // what "smooth inversions only" means when nothing has been pinned.
    const searchInversions = pinned === 0 && (voiceLeading || vlCombos) && maxInv > 0;
    const invCandidates = searchInversions
      ? Array.from({ length: maxInv + 1 }, (_, k) => k)
      : [pinned];

    let best = null;
    invCandidates.forEach((invIdx) => {
      const cand = buildCandidate(chordObj, barStyle, invIdx, prevBottom);
      if (cand && (!best || cand.cost < best.cost)) best = cand;
    });

    // VL COMBOS also weighs the intelligent voice-leading engine's own answer
    // for this chord — a genuinely different voicing algorithm, which is the
    // "multiple voicing types" the control promises, not just this chord's
    // own inversions. It only enters the competition, never overrides a
    // closer-fitting inversion of the requested style outright.
    if (vlCombos) {
      const v = led && led[i] && led[i].voices;
      const vm = v ? Object.values(v).filter(Number.isFinite) : [];
      if (vm.length >= 2) {
        const ledCand = place(Array.from(new Set(vm)), prevBottom);
        if (ledCand && (!best || ledCand.cost < best.cost)) best = ledCand;
      }
    }

    // Nothing built from the style or its inversions: the voice-leading
    // engine's own answer, same as when no style was requested at all.
    if (!best) {
      const v = led && led[i] && led[i].voices;
      const vm = v ? Object.values(v).filter(Number.isFinite) : [];
      if (vm.length >= 2) best = place(Array.from(new Set(vm)), prevBottom);
    }
    if (!best) { out.push(null); return; }

    const voices = toVoices(best.cand);
    const ok = voicingIsFaithful(mt, chordObj, voices, {
      rootless: barStyle === 'jazz-rootless',
      minVoices: barStyle ? 2 : 3
    });
    if (!ok) { out.push(null); rejected++; return; }
    prevBottom = best.cand[0];
    out.push(voices);
  });

  out.__rejected = rejected;
  out.__ceiling = ceiling;
  return out;
}

/** The top note any voicing reaches — the floor the melody has to clear. */
function voicingTopOf(harmony) {
  const seq = (harmony && harmony.chordSequence) || [];
  let top = null;
  seq.forEach((ev) => {
    if (!ev || !ev.voicing) return;
    Object.values(ev.voicing).forEach((m) => {
      if (Number.isFinite(m) && (top === null || m > top)) top = m;
    });
  });
  return top;
}

/**
 * Everything the sheet's Voicing dropdown, Register, and Voicing Options
 * panel currently say, read once. Shared by first generation and by a
 * voicing-only re-voice so both read the panel exactly the same way — before
 * this was inlined twice, and the two readings could quietly drift apart.
 */
function readVoicingPanelSettings(context) {
  const sheet = (window.modularApp && window.modularApp.sheetMusicGenerator) || window.sheetMusicGenerator || null;
  const sheetState = (sheet && sheet.state) || {};
  const overrides = (typeof window !== 'undefined' && window.__chordVoicingOverrides) || {};

  const autoVoicing = context.overallEnergy > 0.7 ? 'spread' : 'close';
  const autoRegister = context.overallEnergy > 0.8 ? 'high' : (context.overallEnergy < 0.3 ? 'low' : 'mid');
  const logicToVoicing = { smart: 'close', smooth: 'close', open: 'spread', jazz: 'spread', piano: 'close' };
  const manualStyle = sheetState.autoVoicingAll ? null : (sheetState.voicingStyle || null);
  const globalVoicing = sheetState.autoVoicingAll
      ? (logicToVoicing[sheetState.voicingLogic] || autoVoicing)
      : (manualStyle || autoVoicing);
  const globalRegister = sheetState.voicingRegister || autoRegister;
  const inversion = Number.isFinite(parseInt(sheetState.inversion, 10)) ? parseInt(sheetState.inversion, 10) : 0;
  const voiceLeading = !!sheetState.voiceLeading;
  const vlCombos = sheetState.voiceLeadingMode === 'multi';
  const vlIntensity = Number.isFinite(sheetState.vlIntensity) ? sheetState.vlIntensity : 0.5;

  return { manualStyle, globalVoicing, globalRegister, overrides, inversion, voiceLeading, vlCombos, vlIntensity };
}

/**
 * Resolve every bar's voicing against a FIXED list of chords, reading the
 * panel exactly as `generateHarmony`'s first pass does. Pulled out so a
 * voicing-only re-voice (Voicing/Register/Inversion/Voice Leading/VL Combos/
 * VL Intensity/Randomize) can call the identical logic against chords that
 * already exist, instead of duplicating it or — as those controls did before
 * this existed — going through the full generator and silently regenerating
 * the melody along with the voicing.
 *
 * @param randomSeed optional — present only for a Randomize reroll, so a
 *   voicing-only change stays perfectly deterministic otherwise.
 */
function resolveHarmonyVoicings(mt, chordObjs, context, vlEngine, randomSeed) {
  const { manualStyle, globalVoicing, globalRegister, overrides, inversion, voiceLeading, vlCombos, vlIntensity }
    = readVoicingPanelSettings(context);

  let led = null;
  if (vlEngine) {
    try {
      led = vlEngine.generateVoiceLeading(chordObjs.map(c => c.fullName), {
        voicing: globalVoicing,
        register: globalRegister
      });
    } catch (_) { led = null; }
  }

  try {
    Object.keys(overrides).forEach((barKey) => {
      const bi = parseInt(barKey, 10);
      if (!Number.isFinite(bi) || !chordObjs[bi] || !vlEngine || !led) return;
      const o = overrides[barKey] || {};
      const single = vlEngine.generateVoiceLeading([chordObjs[bi].fullName], {
        voicing: o.voicing || globalVoicing,
        register: o.register || globalRegister
      });
      if (single && single[0]) led[bi] = single[0];
    });
  } catch (_) {}

  const resolved = resolveVoicings({
    mt,
    chordObjs,
    led,
    style: manualStyle,
    register: globalRegister,
    overrides: Object.keys(overrides).reduce((acc, k) => {
      const i = parseInt(k, 10);
      if (Number.isFinite(i)) acc[i] = overrides[k];
      return acc;
    }, {}),
    inversion, voiceLeading, vlCombos, vlIntensity, randomSeed
  });

  const voicings = resolved.map(v => (v ? { voices: v } : null));
  const voicingSettings = {
    voicing: globalVoicing,
    style: manualStyle,
    register: globalRegister,
    inversion, voiceLeading, vlCombos, vlIntensity,
    ceiling: resolved.__ceiling,
    overrides,
    rejected: resolved.__rejected || 0,
    melodyFollowsVoicing: true
  };
  if (resolved.__rejected) {
    console.warn(`[ArcInit] ${resolved.__rejected} voicing(s) rejected as out-of-chord; literal tones kept.`);
  }
  return { voicings, voicingSettings };
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
  const harmony = { chordSequence: [], context };
  // IS THE PIECE ACTUALLY IN A MINOR KEY?
  //
  // This used to be a test on the MOOD WORD alone, which is a category error:
  // "mysterious" is a feeling, not a key signature. A piece in G major tagged
  // mysterious was told its tonic was minor, so the progression asked for `i`,
  // the resolver honoured the lowercase numeral and turned Gmaj7 into Gm7, and
  // the piece spent its whole length contradicting its own key — with the
  // panel still labelling that chord "I". It also triggered the ♭VI–♭VII–I
  // picardy set-piece, a minor-key gesture, in a major key.
  //
  // The scale decides. The mood still chooses WHICH chords get used inside the
  // key, which is what a mood should influence.
  const minorTone = (() => {
    const an = scaleAnalysis(mt, currentKey, currentScale);
    if (an && typeof an.tonicIsMinor === 'boolean') return an.tonicIsMinor;
    // No analysis (an exotic collection): fall back to the mood, as before.
    return /dark|sad|angry|intense|mysterious/.test(String(context.emotionalTone || ''));
  })();

  // THE FORM DECIDES THE PROGRESSION.
  //
  // Sections that share a letter share their chord template, which is what
  // makes a return audible as a return; a primed restatement (A') varies an
  // interior bar so it develops rather than loops. Every section closes with
  // the cadence its role asks for — inner sections stay open on V, only the
  // last one is allowed to resolve. Without this the piece was one four-chord
  // loop repeated, and nothing in it could be heard as an arrival.
  const form = (context.form && Array.isArray(context.form.sections) && context.form.sections.length)
    ? context.form : null;
  const ccProg = context.complexityControls || { color: 0.5 };
  // ONE DIAL. Every harmonic device reads this instead of deciding for itself,
  // so "primary triads only" genuinely means only primary triads rather than
  // "primary triads plus whatever else happened to roll true this take".
  const HC = (typeof HarmonyComplexity !== 'undefined') ? HarmonyComplexity : null;
  const harmonyLevel = Number.isFinite(ccProg.harmony) ? ccProg.harmony
    : (Number.isFinite(ccProg.color) ? ccProg.color : 0.5);
  const gate = HC ? HC.gate(harmonyLevel) : null;

  // PER-DEVICE OVERRIDES sit on top of the ladder. The dial sets a sensible
  // baseline; an override pins one device on or off regardless of where the
  // dial is, so you can take a plain I–IV–V–I and add ONLY approach chords, or
  // run everything except modulation. Absent = follow the ladder.
  const overrides = (typeof window !== 'undefined' && window.__harmonyOverrides) || {};
  const allow = (k) => (Object.prototype.hasOwnProperty.call(overrides, k) && overrides[k] !== null)
    ? !!overrides[k]
    : (!gate || gate.allow[k]);

  // Report the effective state so the UI can show which devices are on and
  // which of those are ladder defaults versus deliberate overrides.
  const effective = {};
  if (gate) Object.keys(gate.allow).forEach(k => { effective[k] = allow(k); });
  harmony.complexity = gate ? {
    level: gate.level, label: gate.label,
    ladder: gate.allow, effective, overrides: { ...overrides }
  } : null;

  const plan = buildFormProgression({
    form, barCount, toneTemplates, minorTone, rng,
    mt, key: currentKey, scaleName: currentScale,
    colour: harmonyLevel,
    // The EFFECTIVE gate, not the raw ladder one: passing the raw gate meant
    // per-device overrides were ignored in here, so forcing modulation off
    // switched it off everywhere except the one place that creates it.
    gate: gate ? { ...gate, allow: effective } : null
  });
  let baseProg = plan.romans;
  // Which key each bar is IN. A modulating bridge builds its chords in the new
  // key, and the melody follows through the same plan.
  const keyPlan = plan.keyPlan || [];
  const keyAt = (bar) => keyPlan[bar] || { key: currentKey, scaleName: currentScale, home: true };
  const sectionAt = (bar) => (form && form.sectionOfBar && form.sectionOfBar[bar]) || null;
  harmony.form = form;
  harmony.keyPlan = keyPlan;
  harmony.modulations = plan.modulations || [];
  harmony.sectionProgressions = plan.sectionProgressions || {};
  harmony.devices = plan.devices || [];

  // THE ♭VI–♭VII–I CADENCE.
  //
  // Two major triads a step apart walking up into the tonic. It belongs in
  // BOTH modes and means something different in each:
  //
  //   In MINOR it is the triumphant lift. ♭VI and ♭VII are already in the
  //   parent scale — in C minor, A♭ and B♭ — so the only borrowed note in the
  //   whole gesture is the major third of the final chord, and that one note
  //   turns a resigned ending into a triumphant one.
  //
  //   In MAJOR it is the aeolian cadence: both approach triads are borrowed
  //   from the parallel minor while the tonic stays where it already was. This
  //   is the rock/film ending — ♭VI–♭VII–I in C major is A♭–B♭–C — and it is
  //   completely idiomatic. An earlier version fired it in major only because
  //   the tonic had been mislabelled minor, and the fix for THAT wrongly took
  //   the device away from major keys altogether. The device was never the
  //   problem; firing it without deciding where it goes was.
  //
  // WHERE is what makes it work. It is a payoff, so it is placed at a moment
  // that can carry one: the piece's final cadence, or the end of a departure
  // section handing back to a return — the bridge-into-last-chorus position.
  const ccCad = context.complexityControls || { color: 0.5 };
  let picardyBar = -1;
  let aeolianCadenceBar = -1;
  if (barCount >= 3) {
    // Lifts are a payoff, so they want either an emotional arc that has been
    // building or an explicit appetite for colour.
    const lift = clamp01((context.globalTension || 0) * 0.5 + (ccCad.color || 0.5) * 0.5);
    if (rng() < lift * 0.75) {
      // Candidate landing bars: the real ending, plus the last bar of any
      // departure section that hands back to a returning one.
      const landings = [barCount - 1];
      try {
        const secs = (form && Array.isArray(form.sections)) ? form.sections : [];
        secs.forEach((s, i) => {
          const next = secs[i + 1];
          const isDeparture = s.letter && s.letter !== 'A';
          const returnsAfter = next && next.letter === 'A';
          if (isDeparture && returnsAfter && s.endBar >= 2 && s.endBar < barCount - 1) {
            landings.push(s.endBar);
          }
        });
      } catch (_) {}
      // The ending is the strongest place for it; a bridge hand-off is the
      // alternative when the form offers one.
      const landing = (landings.length > 1 && rng() < 0.45)
        ? landings[1 + Math.floor(rng() * (landings.length - 1))]
        : landings[0];

      baseProg[landing - 2] = 'bVI';
      baseProg[landing - 1] = 'bVII';
      baseProg[landing] = 'I';
      aeolianCadenceBar = landing;
      // Only a MINOR key needs its tonic forced major — in major it already is,
      // and forcing it there would be a no-op pretending to be a decision.
      if (minorTone) picardyBar = landing;
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
    const barSection = sectionAt(bar);
    const sectionTension = barSection ? (barSection.tensionBias || 0) : 0;
    // Once the dial switches borrowing ON it has to be AUDIBLE. This used to be
    // driven mostly by the text's tension, so a calm phrase produced roughly
    // one borrowed chord per four takes — indistinguishable from the step below
    // it, which defeats the point of a control that claims to have turned
    // something on.
    let borrowChance = allow('borrowedChords')
      ? Math.max(0, Math.min(0.75,
          0.25 + harmonyLevel * 0.4
          + (context.globalTension || 0) * 0.2 + sectionTension * 0.3))
      : 0;

    // THE HEAD OF A RETURNING THEME IS WHAT IDENTIFIES IT. A theme is
    // recognised from its first bar or two; vary those and the return stops
    // being a return. Later bars are fair game — varying the approach to the
    // cadence is how a restatement stays interesting — so the protection
    // tapers rather than switching off.
    if (barSection && barSection.themeOccurrence > 0) {
      const intoSection = bar - barSection.startBar;
      // Just the opening bar. Protecting half the section left a 4-bar
      // restatement with almost nowhere a borrow could land, so the device was
      // effectively off even when the dial said it was on.
      if (intoSection === 0) borrowChance *= 0.25;
    }
    // The modal-blend cadence is a composed gesture; a random substitution
    // landing on one of its three bars would break the ♭VI–♭VII–I shape that
    // makes the lift work. A section's own cadence bar is protected for the
    // same reason: a borrowed chord there undoes the arrival the form asked for.
    // The cadence is the LAST TWO bars: the dominant and its resolution. An
    // earlier version protected only the final bar, so a "V → I" close kept
    // having its V borrowed away to ♭VII — which turns a perfect cadence into
    // a backdoor one and quietly undoes the arrival the whole section was
    // built toward.
    // Protect the cadence goal always, and the bar before it only when that bar
    // is actually the dominant setting it up. Blanket-protecting both removed
    // half of every four-bar section from consideration.
    const isCadenceGoal = barSection && bar === barSection.endBar;
    const isCadentialDominant = barSection && bar === barSection.endBar - 1
      && /^V$/i.test(String(baseProg[bar] || '').replace(/[^ivxIVX]/g, ''));
    // Guard the gesture in BOTH modes: aeolianCadenceBar marks it whether or
    // not the tonic needed forcing, so a major-key aeolian cadence is as
    // protected from random substitution as a minor-key picardy lift.
    const cadenceAnchor = aeolianCadenceBar >= 0 ? aeolianCadenceBar : picardyBar;
    const inCadence = (cadenceAnchor >= 0 && bar >= cadenceAnchor - 2 && bar <= cadenceAnchor)
      || isCadenceGoal || isCadentialDominant;
    if (!inCadence && rng() < borrowChance) {
        const tone = context.emotionalTone;
        let borrowMap = null;
        let borrowType = 'modal-interchange';
        if (tone === 'dark' || tone === 'sad' || tone === 'angry' || tone === 'intense') {
            borrowMap = { 'IV': 'iv', 'V': 'v', 'vi': 'bVI', 'ii': 'bII' };
        } else if (tone === 'dreamy') {
            // The dreamy raised fourth is a LYDIAN colour, and the way to get
            // it is the chromatic passing diminished on ♯4 — the chord that
            // actually walks IV up to V. Asking for a major seventh on the
            // raised fourth instead produced C♯maj7 in G major: three foreign
            // notes, no preparation, no resolution, and nothing lydian about it.
            borrowMap = { 'IV': '#IVdim7', 'I': 'Imaj7' };
            borrowType = 'color-borrow';
        } else if (tone === 'mysterious') {
            borrowMap = { 'IV': 'iv', 'V': 'bVII', 'ii': 'bII' };
        } else {
            // Bright/neutral tones get gentle minor-plagal / backdoor color.
            borrowMap = { 'IV': 'iv', 'V': 'bVII' };
            borrowType = 'color-borrow';
        }
        let nextRoman = (borrowMap && borrowMap[roman]) || roman;
        // A borrow that lands on the chord already sounding in the previous bar
        // is not colour, it is the same chord held for two bars — and because
        // this step runs AFTER the progression's own adjacent-repeat pass, it
        // was reintroducing exactly the repeats that pass had removed.
        if (bar > 0 && nextRoman === baseProg[bar - 1]) nextRoman = roman;
        if (nextRoman !== roman) borrowedInfo = { type: borrowType, from: roman, to: nextRoman };
        roman = nextRoman;
        baseProg[bar] = roman;
    }

    let chordObj = null;
    // The bar's OWN key. A modulating section builds its chords in the key it
    // moved to; using the home key throughout would print the right roman
    // numerals over the wrong chords.
    const barKeyPlan = keyAt(bar);
    const barKey = barKeyPlan.key || currentKey;
    const barScale = barKeyPlan.scaleName || currentScale;
    if (mt) {
      const degree = romanToDegree(roman);

      // IS THIS ROMAN ACTUALLY CHROMATIC, OR IS IT JUST WHAT THIS SCALE'S
      // DEGREES ARE CALLED?
      //
      // Roman numerals are named against the major scale, so most modes name
      // their own diatonic degrees with accidentals: the third degree of
      // aeolian is ♭III, the fourth of the acoustic scale is ♯iv. Treating any
      // accidental as an alteration sent those degrees down the chromatic path
      // below, which rebuilds the chord from major-scale semitones and infers
      // its quality from the numeral's CASE. In G acoustic that turned the
      // scale's own C♯m7♭5 into C♯m7 — a G♯ that is in no scale in play — and
      // then labelled the result "chromatic colour", which is how a diatonic
      // chord ended up reported as outside tension in three bars out of twelve.
      //
      // So: if the active scale has a degree by this name, that degree IS the
      // chord. Only a numeral the scale cannot account for is an alteration.
      let scaleDegree = null;
      {
        const an = scaleAnalysis(mt, barKey, barScale);
        if (an && Array.isArray(an.degrees)) {
          scaleDegree = an.degrees.find(d =>
            String(d.roman) === String(roman) || String(d.displayRoman) === String(roman)) || null;
        }
      }

      // A foreshadowing bar was planned as a specific secondary dominant. That
      // is a request for a chord, not for a degree, and it outranks the scale:
      // the leading tone it drags in is the entire device.
      const forcedDominant = barKeyPlan.dominantOn;

      if (forcedDominant && typeof mt.getChordNotes === 'function') {
        const dn = mt.getChordNotes(forcedDominant, '7') || [];
        if (dn.length) {
          chordObj = {
            root: forcedDominant,
            chordType: '7',
            chordNotes: dn,
            diatonicNotes: dn,
            fullName: `${forcedDominant}7`,
            roman,
            secondaryDominant: true
          };
        }
      }

      if (chordObj) {
        // already resolved by the foreshadowing request
      } else if (scaleDegree) {
        chordObj = mt.getDiatonicChord(scaleDegree.degree, barKey, barScale);
        try {
          if (chordObj) {
            chordObj.roman = scaleDegree.displayRoman || roman;
            chordObj.scaleDegree = scaleDegree.degree;
          }
        } catch (_) {}
      } else if (roman.includes('b') || roman.includes('#')) {
        // Accidental romans (bVI, bVII, bII, #IV) are defined relative to the
        // MAJOR scale degrees, regardless of the current scale — flattening the
        // current scale's diatonic degree would double-flatten in minor modes
        // (bVI of C aeolian must be Ab, not G).
        try {
          const baseDiatonic = mt.getDiatonicChord(degree, barKey, barScale);
          const majorDegSemis = [0, 2, 4, 5, 7, 9, 11];
          const semis = majorDegSemis[(degree - 1) % 7] + (roman.includes('b') ? -1 : 1);
          let alteredRoot = (typeof mt.transposeNote === 'function')
            ? mt.transposeNote(barKey, semis)
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
          chordObj = mt.getDiatonicChord(degree, barKey, barScale);
        }
      } else {
        chordObj = mt.getDiatonicChord(degree, barKey, barScale);
        // Preserve the requested roman numeral for downstream logic (secondary dominants, etc.)
        try { if (chordObj) chordObj.roman = roman; } catch (_) {}

        // SPELL THE CHORD THE WAY ITS KEY IS SPELLED. The theory engine hands
        // back a pitch, not a spelling preference, so the fifth degree of B
        // major came out as G♭maj7 — right note, wrong name, and unreadable
        // next to five sharps. A sharp key gets sharp roots and a flat key
        // flat ones.
        try {
          const keyIsFlat = /b/.test(String(barKey).slice(1));
          const rootHasWrongAccidental = chordObj &&
            (keyIsFlat ? /#/.test(String(chordObj.root)) : /b/.test(String(chordObj.root).slice(1)));
          if (rootHasWrongAccidental && mt.noteValues
              && typeof mt.spellSemitoneWithPreference === 'function') {
            const v = mt.noteValues[chordObj.root];
            const respelled = Number.isFinite(v) ? mt.spellSemitoneWithPreference(v, keyIsFlat, null) : null;
            if (respelled && respelled !== chordObj.root) {
              let notes = chordObj.chordNotes || chordObj.diatonicNotes || [];
              if (typeof mt.spellNotesForRoot === 'function') {
                const rn = mt.spellNotesForRoot(respelled, notes);
                if (Array.isArray(rn) && rn.length === notes.length) notes = rn;
              }
              chordObj = {
                ...chordObj,
                root: respelled,
                chordNotes: notes,
                diatonicNotes: notes,
                fullName: String(chordObj.fullName || '').replace(chordObj.root, respelled) || respelled
              };
            }
          }
        } catch (_) {}
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

        // THE MINOR-KEY DOMINANT. In aeolian, dorian and phrygian the fifth
        // degree is a minor triad, which has no leading tone and therefore
        // cannot cadence — asking for "V" and printing Gm7 in C minor is why
        // minor-key endings never arrived. Real minor-key writing raises that
        // third, and that raised note is the whole reason harmonic minor
        // exists. An uppercase V is a request for the functioning dominant.
        try {
          const wantsMajorDominant = /^V7?$/.test(String(roman))
            && chordObj && /^(m7|m|min|minor|m9|m6)$/.test(String(chordObj.chordType));
          if (wantsMajorDominant && typeof mt.getChordNotes === 'function') {
            const dNotes = mt.getChordNotes(chordObj.root, '7') || [];
            if (dNotes.length) {
              chordObj = {
                ...chordObj,
                chordType: '7',
                chordNotes: dNotes,
                diatonicNotes: dNotes,
                fullName: `${chordObj.root}7`,
                roman,
                raisedLeadingTone: true
              };
            }
          }
        } catch (_) {}
      }
    }

    if (!chordObj) chordObj = { root: currentKey, chordType: 'major', fullName: currentKey, roman: 'I' };

    // COLOUR, OR A DIFFERENT KEY?
    //
    // Borrowed and altered chords are the point of half the machinery in this
    // file, but there is a line past which a chord stops being a colour on the
    // current key and simply belongs to another one. ♭VI in G major is two
    // notes out and reads as a borrow; C♯maj7 is three notes out — C♯, F, G♯ —
    // and reads as a mistake, because nothing around it prepares or resolves
    // that much foreign material in a single bar.
    //
    // Two outside notes is the limit. Everything genuinely idiomatic clears
    // it: secondary dominants, tritone subs, ♭VI/♭VII/♭II, the borrowed iv,
    // diminished passing chords. What it rejects is the accidental output of
    // building a chord quality on an altered root that no cadence asked for.
    // A chord that fails falls back to the scale's own chord on that degree,
    // which is always defensible.
    try {
      const barScaleNotes = (() => {
        try {
          const nm = (typeof mt.getScaleNotesWithKeySignature === 'function')
            ? mt.getScaleNotesWithKeySignature(barKey, barScale)
            : mt.getScaleNotes(barKey, barScale);
          return (nm && nm.length) ? nm : [];
        } catch (_) { return []; }
      })();
      const strays = notesOutsideScale(mt, chordObj, barScaleNotes);
      if (strays.length > 2 && !chordObj.secondaryDominant) {
        const degree = romanToDegree(roman);
        const fallback = mt.getDiatonicChord(degree, barKey, barScale);
        if (fallback && fallback.root) {
          console.warn(`[ArcInit] bar ${bar}: ${chordObj.fullName} has ${strays.length} notes outside `
            + `${barKey} ${barScale} (${strays.join(', ')}) — using ${fallback.fullName} instead.`);
          fallback.roman = roman;
          chordObj = fallback;
          borrowedInfo = null;
        }
      }
    } catch (_) {}

    // PLAIN TRIADS BELOW THE SEVENTH-CHORD STEP. The generator is built around
    // 7th chords throughout, which is right for most of its range and wrong at
    // the bottom of it: someone learning what I–IV–V sounds like should hear
    // I–IV–V, not Imaj7–IVmaj7–V7.
    if (gate && !allow('seventhChords') && mt && typeof mt.getChordNotes === 'function') {
      try {
        const t = String(chordObj.chordType || '');
        const triad = /^(m|min)/i.test(t) && !/maj/i.test(t) ? 'm'
          : /dim|m7b5|°|ø/i.test(t) ? 'dim'
          : /aug|\+/i.test(t) ? 'aug'
          : 'maj';
        const notes = mt.getChordNotes(chordObj.root, triad) || [];
        if (notes.length) {
          chordObj = {
            ...chordObj,
            chordType: triad,
            chordNotes: notes,
            diatonicNotes: notes,
            fullName: triad === 'maj' ? String(chordObj.root)
              : triad === 'm' ? `${chordObj.root}m`
              : `${chordObj.root}${triad}`
          };
        }
      } catch (_) {}
    }

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
          borrowedInfo = { type: 'modal-blend', from: 'i', to: 'I', cadence: 'bVI-bVII-I', mode: 'minor' };
        }
      } catch (_) {}
    }

    // The same cadence in a MAJOR key needs no forcing — the tonic is already
    // major — but it is still the gesture, and still worth saying so.
    if (bar === aeolianCadenceBar && picardyBar !== bar) {
      borrowedInfo = { type: 'modal-blend', from: 'I', to: 'I', cadence: 'bVI-bVII-I', mode: 'major' };
    }


    borrowedFlags.push(borrowedInfo);
    resolvedBarChords.push(chordObj);
  }

  // VOICE THE HARMONY FIRST, AND KEEP THAT ANSWER.
  //
  // The sheet's Voicing control is authoritative: a manual style is built from
  // the chord's own tones so the style is exact, and the intelligent modes go
  // through the voice-leading engine, which is what solves each chord against
  // the last. Whatever comes out is the chord as it will sound — the melody is
  // written above it and the piano texture plays it as written.
  const { voicings: resolvedVoicings, voicingSettings } = resolveHarmonyVoicings(mt, resolvedBarChords, context, vlEngine);
  let voicings = resolvedVoicings;
  harmony.voicingSettings = voicingSettings;

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

  // The last bar that got an approach run, so the next one can be left plain.
  let lastApproachBar = -2;

  // THE SURPRISE BUDGET.
  //
  // Approach runs were rationed only by a per-bar probability, so on a piece
  // of any length they arrived at a steady rate — and material that arrives at
  // a steady rate stops being heard as an event at all. Spread evenly, the
  // clever harmony becomes wallpaper.
  //
  // A fixed number of them per piece, spent where the tension curve is already
  // asking for something, is what turns them back into rhetoric: most of the
  // music is plainly diatonic, and the handful of decorated arrivals land at
  // the moments the shape was building toward.
  const surpriseBudget = Math.max(1, Math.round(barCount * (0.10 + (cc.color || 0.5) * 0.25)));
  let surprisesSpent = 0;
  const tensionAt = (bar) => {
    if (!arc || typeof arc.sample !== 'function' || barCount <= 0) return 0.5;
    const v = Number(arc.sample(bar / barCount));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
  };

  // Chromatic chords already explained, by chord name → the bar that explained
  // them. A recurring colour chord is a recurrence, not a fresh departure, and
  // repeating its explanation verbatim in three bars is what made the whole
  // reading read as boilerplate.
  const chromaticSeen = new Map();
  const homeScaleNotes = (context.harmonicProfile && context.harmonicProfile.scaleNotes) || [];
  const activeScaleNotes = (ev) => activeScaleNotesFor(mt, ev, homeScaleNotes);

  for (let bar = 0; bar < barCount; bar++) {
    const chordObj = resolvedBarChords[bar];
    const voicing = voicings ? voicings[bar] : null;
    const borrowedInfo = borrowedFlags[bar] || null;
    const section = sectionAt(bar);
    const eventKeyPlan = keyAt(bar);

    // HARMONIC RHYTHM IS PLANNED, NOT ROLLED PER BAR.
    //
    // This used to be a single global test — energetic piece, or busy rhythm
    // slider, therefore two chords in EVERY bar for the whole piece. That is
    // not a harmonic rhythm, it is a constant, and it is most of why the music
    // felt like it was changing chords a million times: nothing was ever
    // allowed to sit still, so nothing that moved meant anything.
    //
    // Real harmonic rhythm is mostly slow with a deliberate acceleration into
    // the cadence. One chord per bar is the norm; the bar before a section's
    // arrival gets two, because pushing the harmony there is what makes the
    // arrival sound prepared. A genuine climax section can run at two
    // throughout, and that contrast is now audible precisely because the rest
    // of the piece is not doing it.
    // The two chords WALKING UP are part of the cadence gesture too. Left
    // unmarked they were explained one at a time by the generic chromatic
    // reader — "A♭ rises a semitone into A" — which is true, useless, and
    // actively misleading about what is happening: they are not two unrelated
    // chromatic leans, they are the first two thirds of a named cadence.
    const inAeolianWalk = aeolianCadenceBar >= 2
      && (bar === aeolianCadenceBar - 2 || bar === aeolianCadenceBar - 1);

    const sectionActivity = section ? (section.activityBias || 0) + (section.energyBias || 0) : 0;
    const isCadenceApproach = !!(section && bar === section.endBar - 1 && section.endBar > section.startBar);
    const isClimaxSection = !!(section && (section.energyBias || 0) > 0.15);
    const density = (isCadenceApproach && (isClimaxSection || context.overallEnergy > 0.55))
        || (isClimaxSection && cc.rhythm > 0.8)
        ? 2 : 1;
    const duration = beatsPerBar / density;

    // A bar whose chord is the one already sounding is not a new harmonic
    // event — it is the same chord still going. Marked so the accompaniment
    // can hold it rather than re-striking it, which is the other half of
    // letting the harmony sit still.
    const prevBarChord = bar > 0 ? resolvedBarChords[bar - 1] : null;
    const sustainedFromPrevBar = !!(prevBarChord && chordObj
        && prevBarChord.fullName === chordObj.fullName);

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
        texture: energy > 0.7 ? 'PLUCKED' : 'PAD',
        section: section ? section.label : null,
        sectionRole: section ? section.role : null,
        sectionStart: !!(section && bar === section.startBar && d === 0),
        // Same chord as the previous bar, still sounding — hold it rather than
        // striking it again.
        sustainedFromPrevBar: sustainedFromPrevBar && d === 0,
        cadenceGesture: (bar === aeolianCadenceBar || inAeolianWalk) ? 'bVI-bVII-I' : null,
        cadenceApproach: isCadenceApproach && d === 0,
        barKey: eventKeyPlan.key || currentKey,
        barScale: eventKeyPlan.scaleName || currentScale,
        inHomeKey: eventKeyPlan.home !== false,
        // Which named progression this bar belongs to ("2-5-1", "vi–IV–I–V"),
        // so the sheet and the provenance panel can say what is being played
        // rather than only which chord.
        progression: (section && harmony.sectionProgressions[section.label]) || null
      };

      // Compositional devices land on specific bars and explain themselves.
      const deviceHere = (harmony.devices || []).find(x => x.bar === bar);
      if (deviceHere && d === 0) {
        event.device = deviceHere.type;
        event.explain = deviceHere.explain;
      }

      // When a bar is in a borrowed key, the melody and the scale timeline have
      // to follow it there — otherwise the tune keeps playing the home scale
      // over chords that left it.
      if (eventKeyPlan.home === false && mt) {
        try {
          const evKey = eventKeyPlan.key || currentKey;
          const evScale = eventKeyPlan.scaleName || currentScale;
          const modNotes = (typeof mt.getScaleNotesWithKeySignature === 'function')
            ? mt.getScaleNotesWithKeySignature(evKey, evScale)
            : mt.getScaleNotes(evKey, evScale);
          if (modNotes && modNotes.length) {
            event.scaleHint = { root: evKey, scaleName: evScale, scaleNotes: modNotes, reason: 'modulation' };
            event.scaleHintNotes = modNotes;
          }
        } catch (_) {}
      }
      const modHere = (harmony.modulations || []).find(m => m.startBar === bar);
      if (modHere && d === 0) {
        event.explain = `Modulation to ${modHere.toKey} ${formatScaleNameForDisplay(modHere.toScale)} `
          + `(the ${modHere.relation})`
          + (modHere.pivotChord
              ? ` — pivoted through ${modHere.pivotChord}, which is ${modHere.pivotRomanHome} at home and `
                + `${modHere.pivotRomanNew} there`
              : '');
      } else if (eventKeyPlan.pivot && d === 0) {
        event.explain = `Pivot chord: diatonic in both keys, so the modulation is prepared rather than announced`;
      }

      // A modulation is the larger event and keeps its explanation.
      if (event.explain) {
        // already explained above
      } else if (inAeolianWalk) {
        const step = bar === aeolianCadenceBar - 2 ? '♭VI' : '♭VII';
        event.explain = `${step} of the ♭VI–♭VII–I cadence: ${event.chord} is borrowed from the parallel minor `
          + `and is walking up into the tonic. It is one third of a single gesture, not a chord on its own.`;
      } else if (borrowedInfo && borrowedInfo.type === 'modal-blend') {
        event.explain = borrowedInfo.mode === 'major'
          // Same three chords, a different borrowing, and worth saying which.
          ? `Aeolian cadence: ♭VI–♭VII–${event.chord} — both approach triads are borrowed from the parallel `
            + `minor while the tonic stays major. The two chords step up into the key from outside it, `
            + `which is why this ending sounds like an arrival rather than a resolution`
          : `Modal blend cadence: ♭VI–♭VII–${event.chord} — both approach triads are already in the minor scale; `
            + `only the final major third is borrowed, turning the ending triumphant`;
      } else if (borrowedInfo && borrowedInfo.to) {
        const modeLabel = borrowedInfo.type === 'modal-interchange' ? 'Modal interchange' : 'Borrowed color';
        event.explain = `${modeLabel}: ${event.chord} (${formatScaleNameForDisplay(borrowedInfo.to)}) for contrast`;
      } else {
        // CHROMATIC MEANS A NOTE OUTSIDE THE SCALE, and it is worth saying only
        // when we can say which note and what it does.
        //
        // This used to fire on any accidental in the roman numeral, so the
        // diatonic degrees of every non-major mode — ♭III in aeolian, ♯iv in
        // the acoustic scale — were announced as "outside tension" in bar after
        // bar with the same canned sentence, while the note supposedly causing
        // the tension went unnamed. If nothing is outside the scale there is
        // nothing to report, and the panel falls back to the degree reading,
        // which is the true and more useful statement.
        const outside = notesOutsideScale(mt, chordObj, activeScaleNotes(event));
        if (outside.length) {
          const already = chromaticSeen.get(event.chord);
          if (already !== undefined) {
            // Saying the same thing a third time teaches nothing. A returning
            // chromatic chord is a RECURRENCE, and that is the fact about it.
            event.explain = `${event.chord} returns — the same outside ${outside.length > 1 ? 'notes' : 'note'} `
              + `(${outside.join(', ')}) as bar ${already + 1}, now heard as part of the piece's colour rather than as a departure`;
          } else {
            chromaticSeen.set(event.chord, bar);
            event.explain = chromaticExplanation(mt, {
              chord: event.chord,
              roman: event.roman,
              outside,
              chordObj,
              scaleNotes: activeScaleNotes(event),
              nextChord: resolvedBarChords[bar + 1] || null,
              key: event.barKey,
              scaleName: event.barScale
            });
          }
          event.chromaticNotes = outside;
        }
      }
      
      if (voicing) {
          event.voicing = voicing.voices;
      }
      
      harmony.chordSequence.push(event);

      // Approach run into the next bar's chord: dominants, tritone subs,
      // backdoor, octatonic dim7 planing, chromatic planing, or a walk borrowed
      // from another scale that shares the target chord. Each inserted chord
      // carries a scaleHint so melody + timeline follow the borrowed scale.
      if (approachEngine && allow('approachChords') && d === density - 1 && bar < barCount - 1) {
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

              // A section boundary is the strongest arrival in the piece:
              // walking INTO the top of the next section is the moment the ear
              // is already listening for, so it earns the approach outright.
              const nextSection = sectionAt(bar + 1);
              const crossesSection = !!(nextSection && section && nextSection !== section);
              if (crossesSection) functionalWeight = Math.max(functionalWeight, 0.8);

              // The colour slider scales the whole appetite; emphasis and
              // tension nudge it. Function decides WHERE, the sliders decide
              // HOW MUCH — and the form decides which passes get the lavish
              // treatment, so a restatement is heard as a development of the
              // plainer first statement rather than more of the same.
              const sectionAppetite = Math.min(1.35, nextSection ? (nextSection.approachBias || 1) : 1);
              let prob = Math.min(0.95, functionalWeight
                * (0.45 + (cc.color || 0.5) * 0.85)
                * sectionAppetite
                + targetEmphasis * 0.2
                + tension * 0.06);

              // BREATHING ROOM. An approach into every bar is not a series of
              // moments, it is the texture — and once it is the texture nothing
              // in it can stand out. A decorated bar therefore suppresses the
              // next one unless the next arrival is a section boundary, which
              // outranks the spacing rule because it is the bigger event.
              if (lastApproachBar === bar - 1 && !crossesSection) prob *= 0.28;

              // SPEND THE BUDGET WHERE THE SHAPE IS ASKING. Below the halfway
              // mark of the tension curve the appetite falls away sharply;
              // above it, it is allowed. A section boundary is exempt because
              // arriving somewhere new is itself the moment.
              const localTension = tensionAt(bar + 1);
              prob *= crossesSection ? 1 : (0.25 + localTension * 1.15);
              if (surprisesSpent >= surpriseBudget && !crossesSection) prob = 0;

              if (rng() < prob) {
                  // Leave at least half the bar to the main chord; high color
                  // settings may steal up to half the bar for longer runs.
                  const lavish = (cc.color || 0.5) > 0.7 || targetEmphasis > 0.6 || crossesSection;
                  const maxBeats = event.duration >= 4
                    ? (lavish ? 2 : 1.5)
                    : (event.duration >= 2 ? 1 : 0.5);
                  let plan = approachEngine.plan({
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
                      // Emphasised targets get spicier approaches, and so does
                      // the run into a new section.
                      colorLevel: Math.min(1, (cc.color != null ? cc.color : 0.5)
                        + targetEmphasis * 0.25
                        + (crossesSection ? 0.15 : 0))
                  });

                  // IS THIS ACTUALLY A PASSING CHORD?
                  //
                  // The scale-walk families build their chords by stacking
                  // thirds on a degree of some borrowed collection, and on the
                  // remoter collections that produces things that are not
                  // chords in any useful sense: a quality of "modal", a chord
                  // spelled with double sharps, a fragment missing its fifth.
                  // Dropped into one beat of a G major piece they are not
                  // chromatic colour, they are noise — and no amount of
                  // explaining that some note "resolves by step" makes an
                  // E♯modal a defensible passing chord.
                  //
                  // A real chromatic approach is a recognisable chord a beat
                  // away from its target. Anything that fails that is discarded
                  // and the bar is simply left plain, which is always better
                  // than a stumble.
                  if (plan && plan.events.length) {
                      const usable = plan.events.every((e) => {
                          const type = String(e.chordType || '');
                          if (/modal|no5|unknown/i.test(type)) return false;
                          const tones = e.chordNotes || e.diatonicNotes || [];
                          if (tones.length < 3) return false;
                          // Double accidentals are a sign the chord was derived
                          // from a collection this key has no business visiting.
                          if (tones.some(n => /##|bb/.test(String(n)))) return false;
                          return true;
                      });
                      if (!usable) plan = null;
                  }

                  // FEWER, LONGER. The scale-walk builders emit a chord every
                  // half beat, so a three-chord approach arrived as three
                  // sixteenth-note chords — too brief for any of them to be
                  // heard as harmony at all, which reads as a stumble on the
                  // way to the next bar rather than as an approach to it. Two
                  // chords is the most that can be spent and still be heard;
                  // the ones kept are those nearest the target, because those
                  // are the ones actually doing the approaching.
                  if (plan && plan.events.length) {
                      if (plan.events.length > 2) plan.events = plan.events.slice(-2);
                      const per = Math.max(0.5, Math.min(1, maxBeats / plan.events.length));
                      plan.events.forEach((e) => { e.duration = per; });
                      plan.steal = per * plan.events.length;
                  }

                  if (plan && plan.events.length && event.duration > plan.steal) {
                      lastApproachBar = bar;
                      surprisesSpent++;
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
                              approachTarget: nextChord.fullName,
                              approachTargetRoman: nextChord.roman || null,
                              intoSection: crossesSection && nextSection ? nextSection.label : null,
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
    // This borrows a whole scale for the last bar, so it belongs behind the
    // borrowed-chord step like everything else. It was firing at every setting,
    // including the one meant to produce nothing but primary triads.
    if (allowColor && allow('borrowedChords') && tension > 0.45 && mt && barCount >= 2) {
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
 * Has the user actually ASKED for a particular voicing?
 *
 * Set by the sheet's Voicing dropdown, the Voice Leading and VL Combos
 * checkboxes, the Inversion selector and the per-bar override — the controls
 * that name a voicing. NOT set by Register, which is a placement control that
 * should keep working in either mode.
 */
function voicingChosenExplicitly() {
  return typeof window !== 'undefined' && !!window.__voicingUserChoice;
}
if (typeof window !== 'undefined') window.__voicingChosenExplicitly = voicingChosenExplicitly;

/**
 * VOICING-FIRST: the chord is decided, then the melody is written above it,
 * and the chord is played exactly as voiced.
 *
 * This is OPT-IN, and that is the whole point. Left on by default it forces
 * the accompaniment to restate a full block chord under essentially every
 * melody note — every bar's top voice dragged onto whatever the tune is
 * doing — which chops the music into chord-per-note chunks and, because that
 * forcing happens last, silently overwrites whatever Register, VL Intensity
 * and VL Combos had decided. Both complaints are the same behaviour.
 *
 * So the default is the ordinary arrangement: chords voiced in their own
 * register (mostly bass clef), melody written above them in the treble, the
 * left hand playing real accompaniment patterns. Picking a voicing from the
 * dropdown, or switching on Voice Leading / VL Combos / an Inversion, is what
 * hands control to the voicing and makes it take over the texture.
 *
 * `window.__voicingFirst = true`/`false` forces it on or off regardless.
 */
function voicingFirst() {
  if (typeof window === 'undefined') return false;
  if (window.__voicingFirst === false) return false;
  if (window.__voicingFirst === true) return true;
  return voicingChosenExplicitly();
}
if (typeof window !== 'undefined') window.__voicingFirstActive = voicingFirst;

/**
 * SECOND PASS, VOICING-FIRST ONLY: rotate each bar's voicing so its own top
 * note is the melody's pitch class, wherever the melody actually landed on a
 * chord tone.
 *
 * The chord is voiced before the melody is written, so on the first pass
 * there is no way to know which chord tone the tune will land on — the
 * resolver picks a default rotation (root position, unless Inversion/Voice
 * Leading said otherwise) and the melody is then written a clear step above
 * whatever that rotation's top note happens to be. For a "close" Dm7 under an
 * F melody, that is D F A C with the F sitting a step above the C — a doubled
 * note floating over an unrelated top voice, not what "close voicing under
 * this melody" means. The idiomatic answer is the SAME style's inversion
 * whose own top note already is F — A C D F — so the melody reads as the
 * chord's own soprano rather than as a separate line drawn over it.
 *
 * Only an actual chord tone qualifies. A passing or neighbour tone is not the
 * chord, and forcing an inversion to chase it would fight the harmony instead
 * of following it — those keep the whole-step clearance from the first pass.
 *
 * WHERE that rotation sits is a separate question from WHICH rotation it is,
 * and it is chosen rather than fixed. Pinning the top an octave below the
 * melody — the first version of this — puts a hole in the middle of every
 * texture: under an E melody it writes G2 C3 E3 when the thing a pianist
 * actually plays is G3 C4 E4, the melody note itself being the top of the
 * chord. So the top voice may land ON the melody note, an octave below it, or
 * two, and the placement is scored: closeness to the tune pulls the chord up,
 * and a bass that would strand the left hand above middle C pulls it back
 * down. A mid-register melody gets the close block chord; a high one gets the
 * octave, because up there the close voicing would leave nothing underneath.
 *
 * When the top voice does land on the melody note they sound in unison — which
 * is what a block chord IS, and is why the melody is doubled at the top of the
 * chord rather than hovering above it.
 */
function alignVoicingToMelody(harmony, melody, beatsPerBar, mt, voicingStyle, overrides, ceiling) {
  let aligned = 0;
  const ceilingVal = Number.isFinite(ceiling) ? ceiling : VOICING_TOP_CEIL.mid;
  try {
    if (!mt || !harmony || !Array.isArray(harmony.chordSequence)) return 0;
    const notes = (melody && melody.notes) || [];
    if (!notes.length) return 0;

    const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const pcOf = (n) => {
      const nm = String(n).replace(/-?\d+$/, '');
      const v = mt.noteValues ? mt.noteValues[nm] : null;
      return Number.isFinite(v) ? ((v % 12) + 12) % 12 : null;
    };
    const midiOfNote = (name) => {
      const m = String(name || '').match(/^([A-Ga-g][#b]?)(-?\d+)$/);
      if (!m) return null;
      const pc = pcOf(m[1]);
      return Number.isFinite(pc) ? pc + (parseInt(m[2], 10) + 1) * 12 : null;
    };
    const nameOfMidi = (midi) => `${CHROMATIC[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
    const styleFn = (typeof window !== 'undefined' && typeof window.applyVoicingStyleTo === 'function')
      ? window.applyVoicingStyleTo : null;

    // The melody note actually sounding when a chord strikes — the note
    // still ringing, not merely the next attack.
    const soundingAt = (absBeat) => {
      let best = null;
      for (const n of notes) {
        const start = n.bar * beatsPerBar + n.beat;
        const end = start + (Number(n.duration) || 0);
        if (start <= absBeat + 1e-6 && absBeat < end - 1e-6) return n;
        if (start <= absBeat + 1e-6 && (!best || start > best.bar * beatsPerBar + best.beat)) best = n;
      }
      return best;
    };

    const chordPcs = (chordObj) => {
      const tones = (chordObj && (chordObj.chordNotes || chordObj.diatonicNotes)) || [];
      const pcs = [];
      tones.forEach((t) => {
        const pc = pcOf(t);
        if (Number.isFinite(pc) && !pcs.includes(pc)) pcs.push(pc);
      });
      return pcs;
    };
    const stackFromPcs = (pcs) => {
      if (!pcs.length) return null;
      const out = [];
      let cursor = 47;
      pcs.forEach((pc) => {
        let m = cursor + 1;
        while ((((m % 12) + 12) % 12) !== pc) m++;
        out.push(m);
        cursor = m;
      });
      return out;
    };
    const rotate = (arr, n) => {
      if (!arr.length) return arr;
      const k = ((n % arr.length) + arr.length) % arr.length;
      return arr.slice(k).concat(arr.slice(0, k));
    };

    harmony.chordSequence.forEach((ev) => {
      if (!ev || ev.approachStrategy || !ev.voicing || !ev.chordObj) return;
      const absBeat = (Number(ev.bar) || 0) * beatsPerBar + (Number(ev.beat) || 0);
      const mNote = soundingAt(absBeat);
      if (!mNote) return;
      const melodyMidi = midiOfNote(mNote.noteName);
      if (!Number.isFinite(melodyMidi)) return;
      const melodyPc = ((melodyMidi % 12) + 12) % 12;

      const pcs = chordPcs(ev.chordObj);
      if (pcs.length < 2 || !pcs.includes(melodyPc)) return;   // not a chord tone — leave the clearance rule as is

      const currentMidis = Object.values(ev.voicing).filter(Number.isFinite).sort((a, b) => a - b);
      if (!currentMidis.length) return;

      const barStyle = (overrides && overrides[ev.bar] && overrides[ev.bar].voicing) || voicingStyle || null;

      // Every rotation of the SAME style, keeping only the ones whose own top
      // voice comes out as the melody's pitch class.
      //
      // WHERE that rotation sits: unison with the melody, always, for now —
      // the top voice IS the melody note. Dropping it an octave (or two) when
      // the tune sat high in the treble was a deliberate register-vs-left-hand
      // tradeoff, but Parker does not want that: the chord should stay tight
      // under wherever the melody actually is rather than falling away from
      // it. OCTAVE_OFFSETS is kept as a list (not inlined as a single number)
      // so that tradeoff can come back later without restructuring this —
      // add -12/-24 back in to revive it.
      const OCTAVE_OFFSETS = [0];
      let best = null;
      for (let k = 0; k < pcs.length; k++) {
        const stack = stackFromPcs(rotate(pcs, k));
        if (!stack) continue;
        let midis = stack;
        if (barStyle && styleFn) {
          try {
            const styled = styleFn(stack.map(nameOfMidi), barStyle);
            const asMidi = (Array.isArray(styled) ? styled : []).map(midiOfNote).filter(Number.isFinite);
            if (asMidi.length >= 2) midis = asMidi;
          } catch (_) {}
        }
        const sorted = Array.from(new Set(midis)).sort((a, b) => a - b);
        if (sorted.length < 2) continue;
        const naturalTop = sorted[sorted.length - 1];
        const topPc = ((naturalTop % 12) + 12) % 12;
        if (topPc !== melodyPc) continue;

        OCTAVE_OFFSETS.forEach((offset) => {
          const shift = (melodyMidi + offset) - naturalTop;
          if (shift % 12 !== 0) return;
          const placed = sorted.map(m => m + shift);
          const bass = placed[0];
          const top = placed[placed.length - 1];
          const ceilingCost = top > ceilingVal ? (top - ceilingVal) * 4 : (ceilingVal - top) * 0.6;
          const bassCost = bass < VOICING_BASS_FLOOR ? (VOICING_BASS_FLOOR - bass) * 4 : 0;
          const continuity = Math.abs(bass - currentMidis[0]) * 0.3;
          const cost = ceilingCost + bassCost + continuity;
          if (!best || cost < best.cost) best = { placed, cost };
        });
      }
      if (!best) return;   // this style has no rotation that puts that tone on top

      const unchanged = best.placed.length === currentMidis.length
        && best.placed.every((m, i) => m === currentMidis[i]);
      if (unchanged) return;

      const VOICE_NAMES = ['bass', 'tenor', 'alto', 'soprano'];
      const voices = {};
      best.placed.forEach((m, i) => { voices[i < VOICE_NAMES.length ? VOICE_NAMES[i] : `upper${i}`] = m; });

      if (!voicingIsFaithful(mt, ev.chordObj, voices, { minVoices: 2 })) return;
      ev.voicing = voices;
      aligned++;
    });
  } catch (err) {
    console.warn('[ArcInit] voicing/melody alignment skipped', err);
  }
  return aligned;
}

/**
 * Re-voice the accompaniment now that the melody exists. Melody-first path
 * only — under voicing-first the melody has already been written to fit the
 * voicing, and re-solving the chords here would throw that away.
 *
 * The voice-leading engine has no idea what the tune is doing on its first
 * pass: it picks a soprano freely, and the result is two independent top lines
 * that cross, double in unison, and run in parallel octaves. Running the voicer
 * again with the melody supplied lets it keep the accompaniment under the tune
 * and treat the melody as a real voice when checking parallels.
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
      const ok = voicingIsFaithful(mt, ev.chordObj, v.voices);
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

function generateMelody(context, arc, harmony, seed = 0, extra = {}) {
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
        complexity: context.complexityControls || {},
        // A movement of a work can be handed the theme it is built from.
        motif: Array.isArray(extra.motif) ? extra.motif : null
      });
      if (line && line.notes && line.notes.length) {
        return {
          notes: line.notes,
          scaleUsed: (context.harmonicProfile && context.harmonicProfile.scaleNotes) || [],
          contour: line.contour,
          anchors: line.anchors,
          // Whether this line was written above the voicings. The legacy
          // fallback below is not, and the caller has to know which it got.
          voicingAware: !!line.voicingAware,
          voicingFloor: line.voicingFloor || null,
          voicingRefits: line.voicingRefits || 0
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
 * hash + arousal pick the depth.
 *
 * The words choose the REGION of the circle; the take's seed chooses where in
 * that region this particular generation lands, and the last few keys used are
 * skipped. Keying purely off a hash of the input meant a phrase had exactly one
 * key for all time, and — because the sharp/flat lists were six entries long —
 * everything unrecognised by the lexicon (valence 0, arousal 0) collapsed onto
 * the same six sharp keys.
 */
function deriveRootFromLexical(lexical, input, seed) {
  // Six accidentals is the practical limit in both directions; C♭ major's seven
  // flats is legal and nothing anyone wants to read.
  // Ordered by how many accidentals the key signature carries. Six-flat and
  // six-sharp keys are legal and nobody wants to read them, so the lists stop
  // at four and the far end of the circle is simply not reached — a generated
  // piece in G♭ aeolian-harmonic prints an accidental on almost every note
  // before a single borrowed chord has been added.
  const sharps = ['C', 'G', 'D', 'A', 'E'];
  const flats = ['C', 'F', 'Bb', 'Eb', 'Ab'];
  const valence = (lexical && Number.isFinite(lexical.avgValence)) ? lexical.avgValence : 0;
  const arousal = (lexical && Number.isFinite(lexical.avgArousal)) ? lexical.avgArousal : 0;

  const s = String(input || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s) return null;
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;

  const side = valence >= 0 ? sharps : flats;
  // Higher arousal pushes toward "hotter" keys (more accidentals).
  // Arousal pushes toward keys with more accidentals, but only a little: it
  // used to reach a factor of 2.5, which parked high-energy words permanently
  // at the sharp/flat extremes.
  const bias = Math.floor(Math.abs(arousal) * 1.5);
  const centre = Math.min(side.length - 1,
    (Math.abs(hash) % Math.max(1, side.length - bias)) + bias);

  // A window around the word-derived centre: the phrase still has a home
  // region, but successive takes move within it.
  const jitter = Number.isFinite(seed)
    ? (Math.abs((Number(seed) ^ hash) >>> 0) % 3) - 1
    : 0;
  const recent = recentKeyPicks();
  const order = [centre + jitter, centre, centre + 1, centre - 1, centre + 2, centre - 2]
    .map(i => side[Math.max(0, Math.min(side.length - 1, i))]);

  const pick = order.find(k => k && !recent.includes(k)) || order[0] || side[centre];
  rememberKeyPick(pick);
  return pick;
}

/**
 * Split the finished harmony and melody into a left-hand accompaniment and a
 * right-hand melody. Degrades to no piano part if the engine is unavailable,
 * in which case the sheet falls back to its previous single-staff behaviour.
 */
function buildPianoTexture(context, arc, harmony, melody, seed) {
  try {
    if (typeof PianoTextureEngine === 'undefined') return null;
    const mt = window.modularApp && window.modularApp.musicTheory;
    const engine = new PianoTextureEngine(mt);
    return engine.build({ harmony, melody, context, arc, seed });
  } catch (err) {
    console.warn('[ArcInit] piano texture failed', err);
    return null;
  }
}

/**
 * Pick a metre for THIS take.
 *
 * ContextEngine derives one from the words with hard thresholds — anything
 * whose horizontal motion clears 0.55 returns 5/4 — and because that function
 * has no notion of a take, a phrase that tripped the threshold was locked in
 * 5/4 permanently. Regenerating never released it, which is the same failure
 * the key and scale had: word-derived meaning is right, but a single derived
 * ANSWER is not, because metre is an interpretation of the words rather than a
 * property of them.
 *
 * Explicit requests are still absolute. "waltz", "3/4", "in seven" are
 * instructions, and instructions are obeyed every time.
 */
function chooseTimeSignature(rich, phraseChar, input, seed) {
  const text = String(input || '').toLowerCase();

  // 1. An explicit metre, or a word that names one, is binding.
  const explicit = text.match(/\b([2-9]|1[0-2])\s*\/\s*([248])\b/);
  if (explicit) return `${explicit[1]}/${explicit[2]}`;
  if (/\bwaltz\b|\bthree[- ]?four\b/.test(text)) return '3/4';
  if (/\bmarch\b|\bcut ?time\b/.test(text)) return '2/4';
  if (/\bjig\b|\bsix[- ]?eight\b/.test(text)) return '6/8';

  // 2. Otherwise the words set a TENDENCY and the take chooses inside it.
  //    Common metres always keep some weight, so nothing is ever trapped in an
  //    odd one; the unusual metres have to be actively earned.
  const motion = phraseChar && Number.isFinite(phraseChar.motion) ? phraseChar.motion : 0.35;
  const arousal = phraseChar && Number.isFinite(phraseChar.arousal) ? phraseChar.arousal : 0;
  const sustain = phraseChar && Number.isFinite(phraseChar.sustain) ? phraseChar.sustain : 0.5;

  const weights = {
    '4/4': 1.0 + (1 - motion) * 0.4,
    '3/4': 0.45 + sustain * 0.5 + Math.max(0, -arousal) * 0.4,
    '6/8': 0.3 + Math.max(0, arousal) * 0.5 + motion * 0.25,
    '2/4': 0.22 + Math.max(0, arousal) * 0.3,
    '5/4': 0.10 + Math.max(0, motion - 0.55) * 0.9,
    '7/8': 0.06 + Math.max(0, motion - 0.7) * 0.8
  };

  // The metre ContextEngine inferred keeps a thumb on the scale — the words
  // did point that way — without being the only possible answer.
  const inferred = rich && rich.timeSignature;
  if (inferred && weights[inferred] !== undefined) weights[inferred] *= 1.8;

  // Don't repeat the previous take's metre when something else is available.
  const recent = (typeof window !== 'undefined' && window.__lastTimeSignature) || null;
  if (recent && weights[recent] !== undefined) weights[recent] *= 0.35;

  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  if (Number.isFinite(seed)) {
    hash = Math.imul(hash ^ Math.floor(seed), 0x27d4eb2d) | 0;
    hash = (hash ^ (hash >>> 15)) | 0;
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = (Math.abs(hash) % 10000) / 10000 * total;
  let pick = '4/4';
  for (const [sig, w] of Object.entries(weights)) {
    if ((r -= w) < 0) { pick = sig; break; }
  }
  try { window.__lastTimeSignature = pick; } catch (_) {}
  return pick;
}

/**
 * Ask the form planner for a shape, sized from how much text there is to set.
 * Falls back to the old single 4-bar phrase if the planner is unavailable, so
 * a missing script degrades to the previous behaviour rather than throwing.
 */
/**
 * EXPAND — turn one take into a multi-movement work.
 *
 * The same words, several movements, each a complete piece with its own form,
 * key, mode and character, and each planned so the set behaves as ONE thing.
 * What makes it a work rather than a playlist is stated in the plan and honoured
 * here: contrast between neighbours, a key plan that comes home, and at least
 * one movement that takes its material from an earlier one.
 *
 * The cross-reference is the load-bearing part and the reason this is not just
 * "generate four times". A quoting movement is generated from the SAME SEED as
 * the movement it quotes, so the two share their thematic material outright,
 * and the transformation is then applied by the character the work assigns —
 * the finale of a Moonlight-shaped work is the opening movement's material at
 * speed and in a different form, which is what makes the last movement sound
 * like a consequence of the first rather than a fourth idea.
 *
 * @returns {{plan:Object, movements:Array}|null}
 */
function generateWork(context, arc, seed, opts = {}) {
  try {
    if (typeof FormPlanner === 'undefined' || typeof FormPlanner.planWork !== 'function') return null;

    const tokens = Array.isArray(context.wordTokens) ? context.wordTokens : [];
    const wordCount = tokens.length || 1;
    const syllableCount = tokens.reduce((s, w) => s + ((w.syllables || []).length || 1), 0) || wordCount;

    const workPlan = FormPlanner.planWork({
      seed,
      work: opts.work || null,
      wordCount,
      syllableCount,
      energy: context.overallEnergy,
      tension: context.globalTension,
      tone: context.emotionalTone,
      beatsPerBar: arc.beatsPerBar || 4
    });
    if (!workPlan || !workPlan.movements.length) return null;

    // The theme of each movement, once it exists, so a later movement can be
    // built from it. Intervals rather than pitches: the SHAPE is what survives
    // a change of key, mode, tempo and form, and surviving all four is exactly
    // what a cyclic reference has to do.
    const themeOf = {};
    const motifFrom = (melody) => {
      const ns = (melody && melody.notes) || [];
      const out = [];
      // FOUR steps, not six. A theme has to be stateable inside one span of
      // word-rhythm to be heard as one shape, and six rarely is. Four notes is
      // not a small theme — most of the famous ones are four notes.
      for (let i = 1; i < ns.length && out.length < 4; i++) {
        const a = midiOfName(ns[i - 1].noteName);
        const b = midiOfName(ns[i].noteName);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        const step = b - a;
        if (Math.abs(step) > 12) continue;
        out.push(step);
      }
      return out.length >= 2 ? out : null;
    };

    const movements = workPlan.movements.map((mv) => {
      // Sharing a SEED does not share a theme: the form decides where the
      // anchors are and the key decides what pitches are available, so the same
      // seed under a different form produced a different tune and the
      // cross-reference was a claim rather than a fact — measured at 26–48%
      // shared contour, which is barely above chance. The material is handed
      // over explicitly instead.
      const movementSeed = seed + mv.index * 7919;
      const quotedTheme = Number.isFinite(mv.quotes) ? (themeOf[mv.quotes] || null) : null;

      // Its own context: the character IS the movement.
      const mCtx = {
        ...context,
        overallEnergy: mv.energy,
        globalTension: mv.tension,
        form: mv.form
      };

      // Its own key, from the work's plan. Transposing the home tonic by the
      // stated relation is what makes the key plan audible as a plan.
      if (mv.keyOffset !== null && Number.isFinite(mv.keyOffset) && mv.keyOffset !== 0) {
        const mt = window.modularApp && window.modularApp.musicTheory;
        const homeRoot = (context.harmonicProfile && context.harmonicProfile.root) || 'C';
        const moved = transposeRootBy(mt, homeRoot, mv.keyOffset);
        if (moved) {
          const scaleName = mv.mode === 'minor'
            ? 'natural_minor'
            : ((context.harmonicProfile && context.harmonicProfile.recommendedScale) || 'major');
          let notes = null;
          try { notes = mt && mt.getScaleNotesWithKeySignature(moved, scaleName); } catch (_) {}
          if (!notes || !notes.length) {
            try { notes = mt && mt.getScaleNotes(moved, scaleName); } catch (_) {}
          }
          if (notes && notes.length) {
            mCtx.harmonicProfile = {
              ...context.harmonicProfile,
              root: moved,
              recommendedScale: scaleName,
              scaleNotes: notes
            };
          }
        }
      } else if (mv.mode === 'minor') {
        // Same tonic, parallel minor — the other way a movement changes colour.
        const mt = window.modularApp && window.modularApp.musicTheory;
        const homeRoot = (context.harmonicProfile && context.harmonicProfile.root) || 'C';
        let notes = null;
        try { notes = mt && mt.getScaleNotesWithKeySignature(homeRoot, 'natural_minor'); } catch (_) {}
        if (notes && notes.length) {
          mCtx.harmonicProfile = {
            ...context.harmonicProfile, recommendedScale: 'natural_minor', scaleNotes: notes
          };
        }
      }

      const mArc = {
        ...arc,
        bars: mv.form.bars,
        totalBeats: mv.form.bars * (arc.beatsPerBar || 4),
        sample: (t) => {
          // Each movement has its own arc, shaped by what it is FOR: a still
          // movement stays low however energetic the piece as a whole was.
          const base = mv.energy;
          return Math.max(0.05, Math.min(1, base * 0.7 + 0.3 * Math.sin(Math.PI * t) * (0.4 + mv.tension * 0.6)));
        }
      };

      const harmony = generateHarmony(mCtx, mArc, movementSeed);
      const melody = generateMelody(mCtx, mArc, harmony, movementSeed,
        quotedTheme ? { motif: quotedTheme } : {});
      const piano = buildPianoTexture(mCtx, mArc, harmony, melody, movementSeed);

      // Remember this movement's own theme for anything that quotes it later.
      themeOf[mv.index] = quotedTheme || motifFrom(melody);

      return {
        index: mv.index,
        title: mv.title,
        role: mv.role,
        explain: mv.explain,
        quotes: mv.quotes,
        quoteHow: mv.quoteHow,
        keyRelation: mv.keyRelation,
        keyLabel: mv.keyLabel,
        mode: mv.mode,
        context: mCtx,
        arc: mArc,
        harmony,
        melody,
        piano,
        seed: movementSeed
      };
    });

    return { plan: workPlan, movements };
  } catch (err) {
    console.warn('[ArcInit] work generation failed', err);
    return null;
  }
}

/** A note name to MIDI, for reading a theme's shape back off a melody. */
function midiOfName(name) {
  const m = String(name || '').match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!m) return null;
  const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
    'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const pc = SEMI[m[1].charAt(0).toUpperCase() + m[1].slice(1)];
  return pc === undefined ? null : pc + (parseInt(m[2], 10) + 1) * 12;
}

/** Move a root name by a number of semitones, keeping a usable spelling. */
function transposeRootBy(mt, root, semitones) {
  try {
    if (!mt || !mt.noteValues) return null;
    const pc = mt.noteValues[String(root).replace(/-?\d+$/, '')];
    if (!Number.isFinite(pc)) return null;
    const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const to = (((pc + semitones) % 12) + 12) % 12;
    // Follow the spelling the home key already uses, so a work in a flat key
    // does not acquire sharps halfway through for no reason.
    const preferFlat = /b/.test(String(root)) || ['F'].includes(String(root));
    return (preferFlat ? FLAT : SHARP)[to];
  } catch (_) { return null; }
}
if (typeof window !== 'undefined') window.generateWork = generateWork;

function planFormFor(context, profile, seed, beatsPerBar) {
  try {
    if (typeof FormPlanner === 'undefined' || !FormPlanner || typeof FormPlanner.plan !== 'function') return null;
    const tokens = Array.isArray(context.wordTokens) ? context.wordTokens : [];
    const wordCount = tokens.length
      || String((profile && profile.rawInput) || '').split(/\s+/).filter(Boolean).length
      || 1;
    const syllableCount = tokens.reduce((s, w) => s + ((w.syllables || []).length || 1), 0) || wordCount;
    return FormPlanner.plan({
      wordCount,
      syllableCount,
      energy: context.overallEnergy,
      tension: context.globalTension,
      tone: context.emotionalTone,
      seed,
      beatsPerBar
    });
  } catch (err) {
    console.warn('[ArcInit] form planning failed', err);
    return null;
  }
}

/** Stretch/shrink a planned form onto a bar count someone else decided. */
function rescaleFormToBars(form, bars) {
  if (!form || !Array.isArray(form.sections) || !form.sections.length) return form;
  if (form.bars === bars) return form;
  const n = form.sections.length;
  const unit = Math.max(1, Math.floor(bars / n));
  let cursor = 0;
  const sections = form.sections.map((s, i) => {
    const len = (i === n - 1) ? Math.max(1, bars - cursor) : unit;
    const out = { ...s, startBar: cursor, bars: len, endBar: cursor + len - 1 };
    cursor += len;
    return out;
  });
  const sectionOfBar = new Array(bars).fill(null);
  sections.forEach((s) => {
    for (let b = s.startBar; b <= s.endBar && b < bars; b++) sectionOfBar[b] = s;
  });
  return { ...form, bars, unitBars: unit, sections, sectionOfBar,
    summary: sections.map(s => s.label).join(' ') + ` · ${bars} bars` };
}

// --- Recent-pick memory -----------------------------------------------------
// Two consecutive generations landing on the same key/scale reads as "it isn't
// listening", even when both picks are individually defensible. Keeping a short
// history and stepping past it costs nothing musically and makes successive
// takes audibly distinct.
function recentKeyPicks() {
  if (typeof window === 'undefined') return [];
  return Array.isArray(window.__recentGenKeys) ? window.__recentGenKeys : [];
}
function rememberKeyPick(key) {
  if (typeof window === 'undefined' || !key) return;
  const list = recentKeyPicks().slice();
  list.push(key);
  while (list.length > 3) list.shift();
  window.__recentGenKeys = list;
}
function recentScalePicks() {
  if (typeof window === 'undefined') return [];
  return Array.isArray(window.__recentGenScales) ? window.__recentGenScales : [];
}
function rememberScalePick(scale) {
  if (typeof window === 'undefined' || !scale) return;
  const list = recentScalePicks().slice();
  list.push(scale);
  while (list.length > 3) list.shift();
  window.__recentGenScales = list;
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
