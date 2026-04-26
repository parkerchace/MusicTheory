/**
 * arc-ui-init.js
 * Initialize arc preview panel + generation system
 * 
 * Flow:
 * 1. User types words → Preview panel shows live analysis
 * 2. User adjusts parameters (intensity, time sig)
 * 3. User clicks "Generate Music" → arcConfirmed event fired
 * 4. Generation system creates harmony + melody
 * 5. Sheet music rendered
 */

// Wait for DOM and all scripts to load
document.addEventListener('DOMContentLoaded', () => {
  const logJson = (label, value) => {
    try {
      console.log(`${label} ${JSON.stringify(value, null, 2)}`);
    } catch (_) {
      console.log(label, value);
    }
  };

  // Initialize Semantic Composition Timeline (Replaces old Arc Preview)
  const timelineUI = new CompositionTimelineUI('#global-word-input', 'composition-timeline-panel');

  // Store globally for access from other modules
  window.compositionTimeline = timelineUI;

  console.log('✅ Arc Preview Panel initialized');

  // Initialize word-mode sheet music generator
  if (typeof WordSheetGenerator !== 'undefined') {
    const wordSheet = new WordSheetGenerator();
    wordSheet.mount('#sheet-music-container');
    window.wordSheetGenerator = wordSheet;
    console.log('✅ WordSheetGenerator initialized');
  }

  // ==========================================
  // GENERATION SYSTEM
  // ==========================================

  /**
   * When user confirms arc selection, trigger full generation
   */
  document.addEventListener('arcConfirmed', (event) => {
    let { profile, points, canvasMode, input } = event.detail;
    let seed = Math.floor(Math.random() * 1000000);

    // Resolve real scale notes from the studio's music theory engine before building context.
    // This is critical: without this, melody defaults to C major regardless of selected scale.
    const _scaleLib = window.modularApp && window.modularApp.scaleLibrary;
    const _mt = window.modularApp && window.modularApp.musicTheory;
    // Scale picker is authoritative — use whatever key and scale the user has selected
    const _studioKey = (_scaleLib && typeof _scaleLib.getCurrentKey === 'function')
        ? (_scaleLib.getCurrentKey() || 'C') : 'C';
    const _studioScale = (_scaleLib && typeof _scaleLib.getCurrentScale === 'function')
        ? (_scaleLib.getCurrentScale() || 'major') : 'major';
    let _resolvedNotes = [];
    try {
        if (_mt && typeof _mt.getScaleNotesWithKeySignature === 'function') {
            _resolvedNotes = _mt.getScaleNotesWithKeySignature(_studioKey, _studioScale) || [];
        }
        if (!_resolvedNotes.length && _mt && typeof _mt.getScaleNotes === 'function') {
            _resolvedNotes = _mt.getScaleNotes(_studioKey, _studioScale) || [];
        }
    } catch(_) {}

    // ADAPTER: Convert Profile to "Context" and Points to "Arc" for legacy compatibility
    const context = {
        emotionalTone: profile.contourArchetype || 'balanced',
        performanceIntent: profile.densityArchetype || 'steady',
        timeSignature: '4/4',
        harmonicProfile: {
            recommendedScale: _studioScale,
            root: _studioKey,
            scaleNotes: _resolvedNotes
        },
        arcShapeKey: profile.contourArchetype || 'balanced',
        wordTokens: profile.wordTokens || []
    };

    // Construct a sampler for the manual points
    const arc = {
        bars: 4,
        beatsPerBar: 4,
        totalBeats: 16,
        sample: (t) => {
            // Simple linear interpolation of manual points
            if (!points || points.length === 0) return 0.5;
            const targetX = t;
            // Find surrounding points
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
            return 1.0 - val; // Invert for energy (top of canvas is high energy)
        },
        energyProfile: Array.from({ length: 16 }, (_, i) => {
            // Sample energy at each beat (0-15)
            // Note: sample() expects normalized time 0-1
            return (this && this.sample) ? this.sample(i / 16) : 0.5;
        })
    };
    
    // Bind the sampler function to the energyProfile generation
    arc.energyProfile = Array.from({ length: 16 }, (_, i) => arc.sample(i / 15.99));


    logJson('🎵 Semantic Generation started with:', {
      input,
      seed,
      profile
    });

    // STEP 1: Generate Harmony (chords responding to arc)
    const harmony = generateHarmony(context, arc, seed);
    logJson('✅ Harmony generated:', harmony);

    // STEP 2: Generate Melody (notes responding to chords + arc)
    const melody = generateMelody(context, arc, harmony, seed);
    logJson('✅ Melody generated:', melody);

    // Create complete music object
    const generatedMusic = {
      harmony,
      melody,
      context,
      arc,
      seed,
      traceId: `arc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      input,
      timestamp: new Date().toISOString()
    };
    try {
      if (typeof window !== 'undefined' && window.semanticNotationContractEngine && typeof window.semanticNotationContractEngine.build === 'function') {
        generatedMusic.semanticContract = window.semanticNotationContractEngine.build(generatedMusic);
      }
    } catch (_) {}

    // STEP 3: Render sheet music
    console.log('🎼 Music generation complete. Ready for playback or export.');

    // Dispatch event for sheet music rendering
    const musicEvent = new CustomEvent('musicGenerated', { detail: generatedMusic });
    document.dispatchEvent(musicEvent);
  });

  /**
   * Listen for musicGenerated event and display in arc panel
   */
  document.addEventListener('musicGenerated', (event) => {
    try {
      // Always feed the base sheet renderer as a safety net.
      if (typeof window.applyGeneratedMusicToSheet === 'function') {
        window.applyGeneratedMusicToSheet(event.detail);
      }
    } catch (_) {}

    if (window.compositionTimeline) {
      // Timeline UI handles its own state; the sheet generator handles visual rendering
    }
  });
});

function parseRootFromChordSymbol(chordSymbol) {
  if (!chordSymbol) return null;
  const match = String(chordSymbol).trim().match(/^([A-G](?:#|b)?)/);
  return match ? match[1] : null;
}

function normalizeScaleForStudio(rawScale, context, scaleLibrary) {
  const aliasMap = {
    ionian: 'major',
    natural_minor: 'aeolian',
    minor: 'aeolian',
    harmonic_minor: 'harmonic',
    melodic_minor: 'melodic',
    major_scale: 'major'
  };

  const toneToScale = {
    joyful: 'major',
    hopeful: 'major',
    calm: 'major',
    dreamy: 'lydian',
    playful: 'mixolydian',
    dark: 'harmonic',
    sad: 'aeolian',
    mysterious: 'dorian',
    angry: 'phrygian',
    intense: 'phrygian_dominant'
  };

  const desired = String(rawScale || '').toLowerCase().trim();
  const mapped = aliasMap[desired] || desired;
  const available = scaleLibrary && scaleLibrary.musicTheory && scaleLibrary.musicTheory.scales
    ? scaleLibrary.musicTheory.scales
    : null;

  if (available && available[mapped]) return mapped;

  // Try family token fallback (e.g., dorian_b2 -> dorian)
  const family = mapped.split(/[_\s]+/)[0];
  if (available && available[family]) return family;

  const toneScale = toneToScale[(context && context.emotionalTone) || ''] || 'major';
  if (!available || available[toneScale]) return toneScale;
  return 'major';
}

function syncStudioKeyScaleFromGenerated(generatedMusic) {
  try {
    const scaleLibrary = window.modularApp && window.modularApp.scaleLibrary
      ? window.modularApp.scaleLibrary
      : null;

    if (!scaleLibrary || typeof scaleLibrary.setKeyAndScale !== 'function') {
      return { applied: false, reason: 'scaleLibrary-unavailable' };
    }

    const context = generatedMusic && generatedMusic.context ? generatedMusic.context : {};
    const harmony = generatedMusic && generatedMusic.harmony ? generatedMusic.harmony : {};
    const firstChord = Array.isArray(harmony.chordSequence) && harmony.chordSequence.length
      ? harmony.chordSequence[0].chord
      : null;

    const key = (context.harmonicProfile && context.harmonicProfile.root)
      || (typeof scaleLibrary.getCurrentKey === 'function' ? scaleLibrary.getCurrentKey() : 'C')
      || 'C';

    const requestedScale = (context.harmonicProfile && context.harmonicProfile.recommendedScale)
      || context.scale
      || context.emotionalTone
      || 'major';
    const studioScale = normalizeScaleForStudio(requestedScale, context, scaleLibrary);

    scaleLibrary.setKeyAndScale(key, studioScale);
    return { applied: true, key, scale: studioScale, requestedScale };
  } catch (err) {
    console.warn('[Arc] Failed to sync studio key/scale:', err);
    return { applied: false, reason: 'exception', message: err && err.message ? err.message : String(err) };
  }
}

/**
 * Generate harmony (chord progression) from arc
 * Maps arc energy peaks to chord changes
 */
function generateHarmony(context, arc, seed = 0) {
  // Ensure seed is a number to prevent NaN calculation errors
  seed = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 1000000);

  // Seeded RNG for reproducibility
  let rngState = (seed ^ 0x9e3779b9) >>> 0;
  const rng = () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };

  const progressionLibrary = {
    joyful: [
      { roman: 'I', chord: 'C' },
      { roman: 'V', chord: 'G' },
      { roman: 'vi', chord: 'Am' },
      { roman: 'IV', chord: 'F' }
    ],
    hopeful: [
      { roman: 'I', chord: 'C' },
      { roman: 'ii', chord: 'Dm' },
      { roman: 'V', chord: 'G' },
      { roman: 'I', chord: 'C' }
    ],
    calm: [
      { roman: 'I', chord: 'C' },
      { roman: 'vi', chord: 'Am' },
      { roman: 'ii', chord: 'Dm' },
      { roman: 'V', chord: 'G' }
    ],
    dark: [
      { roman: 'i', chord: 'Am' },
      { roman: 'bVI', chord: 'F' },
      { roman: 'iv', chord: 'Dm' },
      { roman: 'V', chord: 'E7' }
    ],
    sad: [
      { roman: 'i', chord: 'Am' },
      { roman: 'iv', chord: 'Dm' },
      { roman: 'bVII', chord: 'G' },
      { roman: 'i', chord: 'Am' }
    ],
    angry: [
      { roman: 'i', chord: 'Em' },
      { roman: 'bII', chord: 'F' },
      { roman: 'V', chord: 'B7' },
      { roman: 'i', chord: 'Em' }
    ],
    intense: [
      { roman: 'i', chord: 'Em' },
      { roman: 'V', chord: 'B7' },
      { roman: 'bVI', chord: 'C' },
      { roman: 'V', chord: 'B7' }
    ],
    mysterious: [
      { roman: 'i', chord: 'Dm' },
      { roman: 'bII', chord: 'Eb' },
      { roman: 'bVII', chord: 'C' },
      { roman: 'i', chord: 'Dm' }
    ],
    dreamy: [
      { roman: 'I', chord: 'Cmaj7' },
      { roman: '#IV', chord: 'D' },
      { roman: 'ii', chord: 'Dm' },
      { roman: 'I', chord: 'Cmaj7' }
    ],
    playful: [
      { roman: 'I', chord: 'C' },
      { roman: 'iii', chord: 'Em' },
      { roman: 'IV', chord: 'F' },
      { roman: 'V', chord: 'G' }
    ]
  };

  const scaleAwareProgressions = {
    major: progressionLibrary.joyful,
    ionian: progressionLibrary.joyful,
    dorian: [
      { roman: 'i', chord: 'Dm' },
      { roman: 'IV', chord: 'G' },
      { roman: 'bVII', chord: 'C' },
      { roman: 'i', chord: 'Dm' }
    ],
    phrygian: progressionLibrary.mysterious,
    lydian: progressionLibrary.dreamy,
    mixolydian: [
      { roman: 'I', chord: 'G' },
      { roman: 'bVII', chord: 'F' },
      { roman: 'IV', chord: 'C' },
      { roman: 'I', chord: 'G' }
    ],
    aeolian: progressionLibrary.sad,
    minor: progressionLibrary.sad,
    harmonic_minor: [
      { roman: 'i', chord: 'Am' },
      { roman: 'iv', chord: 'Dm' },
      { roman: 'V', chord: 'E7' },
      { roman: 'i', chord: 'Am' }
    ],
    phrygian_dominant: progressionLibrary.angry
  };

  // Select chord progression based on emotional tone
  const progressionKey = context.emotionalTone;
  const recommendedScale = (context.harmonicProfile && context.harmonicProfile.recommendedScale)
    ? String(context.harmonicProfile.recommendedScale).toLowerCase()
    : '';
  const NOTE_TO_PC = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  const _NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  // Read the currently selected studio key so every progression is in the right key.
  const _harmScaleLib = window.modularApp && window.modularApp.scaleLibrary;
  const _currentKey = (_harmScaleLib && typeof _harmScaleLib.getCurrentKey === 'function')
    ? _harmScaleLib.getCurrentKey()
    : null;
  const _targetKeyPc = (_currentKey && Number.isFinite(NOTE_TO_PC[_currentKey]))
    ? NOTE_TO_PC[_currentKey]
    : 0;

  const intervalPhysics = context.harmonicProfile && context.harmonicProfile.intervalPhysics
    ? context.harmonicProfile.intervalPhysics
    : null;

  // Helper to get degree number (1-based) from Roman numeral, aware of scale length
  const _romanToDegree = (roman, scaleLength = 7) => {
    const m = String(roman || '').match(/^(b|#)?([IViv]+)/);
    if (!m) return 1;
    const r = m[2].toUpperCase();
    const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
    let degree = map[r] || 1;
    
    // Safety: ensure degree doesn't exceed scale length unless intended as an octave wrap
    // But if we want it to work 'within octaves', we use modulo later.
    return degree;
  };

  // Helper to resolve chord from Roman numeral using MusicTheoryEngine
  const _resolveChord = (entry, key, scale) => {
    const mt = window.modularApp && window.modularApp.musicTheory;
    if (!mt || typeof mt.getDiatonicChord !== 'function') {
        return entry.chord || 'C';
    }
    
    // Get current scale length to bound our degree parsing
    const scaleNotes = mt.getScaleNotes(key, scale);
    const scaleLength = (scaleNotes && scaleNotes.length > 0) ? scaleNotes.length : 7;
    
    const degree = _romanToDegree(entry.roman, scaleLength);
    try {
        const result = mt.getDiatonicChord(degree, key, scale);
        return result.fullName || result.root || 'C';
    } catch (e) {
        console.warn('[Arc] Chord resolution failed for degree', degree, e);
        return entry.chord || 'C';
    }
  };

  const _transposeSet = (set, key, scale) => {
    return set.map((e) => {
      const resolvedChord = _resolveChord(e, key, scale);
      return { ...e, chord: resolvedChord };
    });
  };

  const intervalPhysicsProgression = (() => {
    if (!intervalPhysics) return null;

    const hasb2 = !!intervalPhysics.hasb2;
    const hasb3 = !!intervalPhysics.hasb3;
    const has3 = !!intervalPhysics.has3;
    const hasSharp4 = !!intervalPhysics.hasSharp4;
    const hasb6 = !!intervalPhysics.hasb6;
    const has6 = !!intervalPhysics.has6;
    const hasb7 = !!intervalPhysics.hasb7;
    const has7 = !!intervalPhysics.has7;

    // Direct alteration physics mapping so b7/b6/#4/b2 drive harmonic behavior.
    if (hasb2 && has3) return progressionLibrary.angry; // phrygian dominant pressure
    if (hasb2 && hasb3) return progressionLibrary.mysterious; // phrygian/minor compression
    if (hasb3 && hasb6 && has7) return scaleAwareProgressions.harmonic_minor;
    if (has3 && hasb7 && hasb6) {
      return [
        { roman: 'I' },
        { roman: 'bVII' },
        { roman: 'bVI' },
        { roman: 'I' }
      ];
    }
    if (has3 && hasb7) return scaleAwareProgressions.mixolydian;
    if (hasSharp4 && has3) return progressionLibrary.dreamy;
    if (hasb3 && has6 && hasb7) return scaleAwareProgressions.dorian;
    if (hasb3) return progressionLibrary.sad;
    if (has3 && has7) return progressionLibrary.hopeful;

    return null;
  })();

  // Use the studio key and scale for resolution
  const _studioKeyForHarmony = _currentKey || 'C';
  const _studioScaleForHarmony = (recommendedScale && recommendedScale !== 'balanced') 
    ? recommendedScale 
    : (_harmScaleLib && typeof _harmScaleLib.getCurrentScale === 'function' ? _harmScaleLib.getCurrentScale() : 'major');

  // Get current scale length
  const _mt = window.modularApp && window.modularApp.musicTheory;
  const _resolvedNotesForLen = _mt ? _mt.getScaleNotes(_studioKeyForHarmony, _studioScaleForHarmony) : [];
  const _scaleLen = _resolvedNotesForLen.length || 7;

  // Filter or adjust scaleSet based on actual scale length
  // e.g. if scale is Pentatonic (5 notes), remove or wrap degrees > 5
  const scaleSet = (scaleAwareProgressions[recommendedScale]
    || intervalPhysicsProgression
    || progressionLibrary[progressionKey]
    || progressionLibrary.calm).map(e => {
        const deg = _romanToDegree(e.roman, _scaleLen);
        if (deg > _scaleLen) {
            // "Working within octaves": wrap to the corresponding degree in the smaller scale
            const wrapped = ((deg - 1) % _scaleLen) + 1;
            const romanMap = [null, 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
            return { ...e, roman: romanMap[wrapped] || 'I' };
        }
        return { ...e };
    });

  // ALWAYS resolve and transpose the set to the target key and scale immediately
  const transposedScaleSet = _transposeSet(scaleSet, _studioKeyForHarmony, _studioScaleForHarmony);

  const beatsPerBar = arc.beatsPerBar || 4;
  const bars = arc.bars;
  const energyProfile = arc.energyProfile;
  const semanticTrajectory = context.semanticTrajectory || {};
  const harmonicProfile = context.harmonicProfile || {};
  const horizontalMotion = semanticTrajectory.horizontalMotion || 0;
  const harmonicComplexity = context.metadata && context.metadata.complexity ? context.metadata.complexity : 0;

  const chordRoot = (symbol) => {
    const m = String(symbol || '').match(/^([A-G](?:#|b)?)/);
    return m ? m[1] : null;
  };
  const shortestDistance = (a, b) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 6;
    const forward = (b - a + 12) % 12;
    const backward = (a - b + 12) % 12;
    return Math.min(forward, backward);
  };

  // Chord transposition helpers

  // Detect if the chosen progression is major-flavoured (for pathway 2 borrowing logic)
  const _isMajorProgression = intervalPhysics
    ? !!(intervalPhysics.has3 && !intervalPhysics.hasb3)
    : (progressionKey === 'joyful' || progressionKey === 'hopeful' ||
       progressionKey === 'calm'   || progressionKey === 'playful' || progressionKey === 'dreamy');

  // Assess the overall complexity pathway based on semantic input and seeded entropy
  let complexityPathway = 1; // 1: Diatonic, 2: Fluid Swaps, 3: Deep Modal Mixture
  const seededEntropy = (rng() + (seed % 10) / 10) / 2;
  if (harmonicComplexity > 0.4 || seededEntropy > 0.7) complexityPathway = 2;
  if (harmonicComplexity > 0.8 || (harmonicComplexity > 0.6 && seededEntropy > 0.85)) complexityPathway = 3;

  // Generate harmony timeline
  const harmony = {
    progressionName: progressionKey,
    baseProgression: transposedScaleSet.map((entry) => entry.chord),
    chordSequence: [],
    modulations: [],
    context
  };

  let previousChordSpec = null;
  let activeScaleSet = transposedScaleSet;

  const arcShape = context.arcShapeKey || 'flat';
  for (let bar = 0; bar < bars; bar++) {
    const barStartBeat = bar * beatsPerBar;
    
    // Find peaks within the bar to trigger chord changes
    const barEvents = [];
    let lastEnergy = -1;
    
    // Check every 16th note subdivision for significant peaks
    for (let sub = 0; sub < beatsPerBar; sub += 0.25) {
      const globalBeat = barStartBeat + sub;
      const energy = energyProfile[Math.floor(globalBeat)] || 0;
      
      // Trigger chord change on significant energy delta or start of bar
      const isStart = sub === 0;
      const isSignificantJump = Math.abs(energy - lastEnergy) > 0.45; // Increased threshold for longer holds
      const isPeak = energy > 0.85 && energy > lastEnergy; // Higher peak threshold
      
      if (isStart || isSignificantJump || isPeak) {
        barEvents.push({ sub, energy });
        lastEnergy = energy;
        // Limit to max 2 chords per bar for most modes to ensure chords 'hold out'
        if (barEvents.length >= (complexityPathway === 3 ? 3 : 2)) break;
      }
    }

    barEvents.forEach((evt, evtIndex) => {
      const barAvgEnergy = evt.energy;
      
      // Check for dynamic path deviations depending on bar level semantics and pathway
      const isSadMoment = barAvgEnergy < 0.35 && (context.emotionalTone === 'happy' || context.emotionalTone === 'joyful');
      const isPeakMoment = barAvgEnergy > 0.8;
      
      let currentBarScaleSet = activeScaleSet;

      // PATHWAY 2 & 3: Fluid Modal Swaps & Borrowing (resolved to current key)
      if (complexityPathway >= 2) {
          if (isSadMoment && _isMajorProgression) {
              currentBarScaleSet = _transposeSet([
                  { roman: 'I' },
                  { roman: 'v' },
                  { roman: 'bVI' },
                  { roman: 'iv' }
              ], _studioKeyForHarmony, _studioScaleForHarmony);
              harmony.modulations.push({ bar, sub: evt.sub, type: 'Fluid Swap', desc: 'Mixolydian b6 / Minor Borrowing' });
          }
          else if (isPeakMoment && complexityPathway === 3) {
              currentBarScaleSet = _transposeSet([
                  { roman: 'bVI' },
                  { roman: 'bVII' },
                  { roman: 'iv' },
                  { roman: 'V' }
              ], _studioKeyForHarmony, _studioScaleForHarmony);
              harmony.modulations.push({ bar, sub: evt.sub, type: 'Deep Borrow', desc: 'Parallel Minor Peak Mixture' });
          }
      }

      // Blend indices with chaos factors
      const motionOffset = Math.floor(horizontalMotion * (bar + evt.sub/beatsPerBar));
      const energyBucket = Math.floor(barAvgEnergy * 4);
      const arcShift = arcShape === 'rising' ? bar : (arcShape === 'falling' ? (bars - 1 - bar) : 0);
      const seedShift = Math.floor((rng() - 0.5) * (complexityPathway * 2)); 
      
      let chordIndex = Math.abs((bar + evtIndex + energyBucket + arcShift + motionOffset + seedShift) % currentBarScaleSet.length);
      let chordSpec = currentBarScaleSet[chordIndex] || currentBarScaleSet[0];
      
      let bestScore = -Infinity;
      const offsets = complexityPathway === 1 ? [0, 1, -1] : [0, 1, -1, 2, -2, 3, -3];

      offsets.forEach((off) => {
        const idx = (chordIndex + off + currentBarScaleSet.length) % currentBarScaleSet.length;
        const candidate = currentBarScaleSet[idx];
        if (!candidate || !candidate.chord) return;

        let score = (rng() - 0.5) * 0.2;
        score -= Math.abs(off) * 0.18;

        if (previousChordSpec && previousChordSpec.chord) {
          const prevPc = NOTE_TO_PC[chordRoot(previousChordSpec.chord)];
          const nextPc = NOTE_TO_PC[chordRoot(candidate.chord)];
          const motion = shortestDistance(prevPc, nextPc);
          
          score += (1 - motion/6) * 0.3; // Reward smoothness
          if (motion === 0) score -= 0.5; // Avoid repeating same chord twice in a row
        }

        if (score > bestScore) {
          bestScore = score;
          chordSpec = candidate;
        }
      });

      const nextEvt = barEvents[evtIndex + 1];
      const duration = nextEvt ? (nextEvt.sub - evt.sub) : (beatsPerBar - evt.sub);
      
      // Determine texture based on energy and complexity
      let texture = 'PAD';
      if (complexityPathway >= 2) {
          if (evt.energy > 0.75) texture = 'ARPEGGIO';
          else if (evt.energy > 0.5) texture = 'STAB';
      }

      previousChordSpec = chordSpec;
      harmony.chordSequence.push({
        bar,
        beat: evt.sub,
        duration,
        chord: chordSpec.chord,
        roman: chordSpec.roman,
        energy: evt.energy,
        texture
      });
    });
  }

  return harmony;
};

/**
 * Generate melody from harmony + arc
 * Maps arc shape to melodic contour
 */
function generateMelody(context, arc, harmony, seed = 0) {
  // Ensure seed is a number to prevent NaN calculation errors
  seed = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 1000000);

  // Seeded RNG so regenerate meaningfully changes melodic contour and rhythm.
  let rngState = (seed ^ 0x9e3779b9) >>> 0;
  const rng = () => {
    rngState = (rngState * 1664525 + 1013904223) >>> 0;
    return rngState / 4294967296;
  };

  // Use the studio's currently selected key+scale as the authoritative note source.
  // Fall back to context.harmonicProfile.scaleNotes, then to a hardcoded table.
  const _melScaleLib = window.modularApp && window.modularApp.scaleLibrary;
  const studioScaleNotes = (_melScaleLib && typeof _melScaleLib.getCurrentScaleNotes === 'function')
    ? _melScaleLib.getCurrentScaleNotes()
    : null;
  const contextScale = (context.harmonicProfile && Array.isArray(context.harmonicProfile.scaleNotes))
    ? context.harmonicProfile.scaleNotes
    : null;
  // Helper: Shift a scale to a target key
  const shiftScale = (notes, targetKey) => {
    const targetPc = NOTE_TO_PC[targetKey] || 0;
    const basePc = NOTE_TO_PC[notes[0]] || 0;
    const diff = (targetPc - basePc + 12) % 12;
    const _NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    return notes.map(n => {
        const pc = (NOTE_TO_PC[n] + diff) % 12;
        return _NAMES[pc];
    });
  };

  const currentKey = (context.harmonicProfile && context.harmonicProfile.root) || 'C';

  const _scalesFallback = {
    sad: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
    joyful: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    hopeful: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    dreamy: ['C', 'D', 'E', 'F#', 'G', 'A', 'B'],
    dark: ['D', 'E', 'F', 'G', 'A', 'B', 'C'],
    calm: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    intense: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
    angry: ['E', 'G', 'A', 'B', 'C#', 'D', 'F#'],
    mysterious: ['C', 'D', 'Eb', 'F#', 'G', 'A', 'Bb'],
    playful: ['G', 'A', 'B', 'C', 'D', 'E', 'F#']
  };

  const scale = (contextScale && contextScale.length >= 5)
    ? contextScale
    : (studioScaleNotes && studioScaleNotes.length >= 5)
        ? studioScaleNotes
        : shiftScale((_scalesFallback[context.emotionalTone] || _scalesFallback.calm), currentKey);

  const semanticTrajectory = context.semanticTrajectory || {};
  const verticalPressure = semanticTrajectory.verticalPressure || 0;

  const melody = {
    scaleUsed: scale,
    scale: scale,
    notes: [],
    context
  };

  const NOTE_TO_PC = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  const chordRootByBar = (Array.isArray(harmony && harmony.chordSequence) ? harmony.chordSequence : [])
    .map((entry) => {
      const m = String(entry && entry.chord ? entry.chord : '').match(/^([A-G](?:#|b)?)/);
      return m ? m[1] : null;
    });

  const chordToneCandidateIndices = (barIndex, fallbackIndex) => {
    const root = chordRootByBar[barIndex] || chordRootByBar[chordRootByBar.length - 1] || null;
    const rootPc = root ? NOTE_TO_PC[root] : null;
    if (!Number.isFinite(rootPc)) return [];
    const chordIntervals = [0, 3, 4, 7, 10];
    const candidates = [];
    for (let idx = 0; idx < scale.length; idx++) {
      const pc = NOTE_TO_PC[String(scale[idx] || '')];
      if (!Number.isFinite(pc)) continue;
      const interval = (pc - rootPc + 12) % 12;
      if (chordIntervals.includes(interval)) candidates.push(idx);
    }

    return candidates.sort((a, b) => Math.abs(a - fallbackIndex) - Math.abs(b - fallbackIndex));
  };

  // Generate melody notes following arc shape continuously
  let octave = 4;
  let previousScaleIndex = Math.floor(scale.length / 2);
  let currentTime = 0;
  const totalBeats = arc.totalBeats || 16;
  const beatsPerBar = arc.beatsPerBar || 4;
  


  // Pre-sample the arc to normalise energy for pitch mapping.
  // This ensures the arc's SHAPE (not just its absolute amplitude) drives
  // the melodic contour — even a low-energy "dark" arc will span the full scale.
  const _arcRes = 32;
  const _arcSamples = Array.from({ length: _arcRes }, (_, i) => arc.sample(i / (_arcRes - 1)));
  const _arcMin = Math.min(..._arcSamples);
  const _arcMax = Math.max(..._arcSamples);
  const _arcSpan = Math.max(0.05, _arcMax - _arcMin);

  // Flatten words into syllables
  const allSyllables = [];
  (context.wordTokens || []).forEach(word => {
    word.syllables.forEach(s => allSyllables.push({ ...s, parentWord: word.originalWord }));
  });

  let sylIndex = 0;
  while (currentTime < totalBeats) {
    const progress = currentTime / totalBeats;
    const energy = arc.sample(progress);
    
    // 🧠 GET ACTIVE SYLLABLE
    const activeSyl = allSyllables[sylIndex % allSyllables.length];
    if (!activeSyl) break;

    // Use syllable role and emphasis to determine duration
    let durationMultiplier = activeSyl.emphasis || 1.0;
    if (activeSyl.role === 'peak') durationMultiplier *= 1.5;
    if (activeSyl.role === 'rise') durationMultiplier *= 0.75;
    
    // 🥁 DYNAMIC RHYTHM (Responds to Energy & Syllabic Importance)
    let baseDuration = 1.0; // Default to Quarter note for more stability
    
    // Check for rest chance to prevent 'busy' melodies
    const restChance = (energy < 0.4) ? 0.35 : 0.15;
    const isRest = rng() < restChance;

    if (energy < 0.3) {
        baseDuration = 2.0;       // Half notes in low energy valleys
    } else if (energy > 0.8) {
        baseDuration = 0.5;       // 8th notes in peaks (rarely 16ths)
        if (rng() > 0.8) baseDuration = 0.25; 
    } else {
        // Moderate energy: mix of quarter and 8th notes
        baseDuration = rng() > 0.6 ? 1.0 : 0.5;
    }
    
    const duration = isRest ? (baseDuration * 0.5) : (baseDuration * durationMultiplier);
    
    if (isRest) {
        currentTime += duration;
        sylIndex++; // Skip syllable on rest
        continue;
    }
    
    const barIndex = Math.floor(currentTime / beatsPerBar);
    const eventTimeInBar = currentTime % beatsPerBar;
    const absoluteBeat = currentTime;

    // Map Syllable Pitch to Scale Index
    let targetEnergy = (energy + activeSyl.pitchValue) / 2;
    
    // Determine the scale to use (Primary vs Override/Approach)
    let activeScale = scale;
    if (activeSyl.scaleOverride) {
        // Attempt to fetch override scale from the global library
        const lib = window.SCALES || {};
        const override = lib[activeSyl.scaleOverride];
        if (override && Array.isArray(override.notes)) {
            activeScale = override.notes; // Switch to the exotic/color scale
        }
    }

    // APPLY GESTURE (Contour Variations)
    if (activeSyl.role === 'rise') targetEnergy *= 0.8;
    if (activeSyl.role === 'peak') targetEnergy *= 1.2;
    if (activeSyl.role === 'fall') targetEnergy *= 0.7;

    const getNoteForEnergy = (e) => {
        const target = Math.max(0, Math.min(activeScale.length - 1, e * (activeScale.length - 1)));
        const sorted = activeScale.map((_, i) => i).sort((a, b) => Math.abs(a - target) - Math.abs(b - target));
        const idx = sorted[0];
        // Stable octave: only nudge up/down when leaping more than a 4th from previous note
        const diff = idx - previousScaleIndex;
        let noteOct = octave;
        if (diff > 4) noteOct = Math.min(5, octave + 1);
        else if (diff < -4) noteOct = Math.max(3, octave - 1);
        return { name: activeScale[idx], index: idx, octave: noteOct };
    };

    // 🌊 MELISMATIC GENERATION (The Flourish)
    const noteCount = activeSyl.isMelismatic ? (activeSyl.gesture === 'turn' ? 3 : 2) : 1;
    const noteDuration = duration / noteCount;

    for (let n = 0; n < noteCount; n++) {
        let noteEnergy = targetEnergy;
        
        // Internal Gesture Contours
        if (activeSyl.gesture === 'slide-up') noteEnergy += (n * 0.1);
        if (activeSyl.gesture === 'slide-down') noteEnergy -= (n * 0.1);
        if (activeSyl.gesture === 'dip' && n === 1) noteEnergy -= 0.2;
        if (activeSyl.gesture === 'turn') {
            if (n === 1) noteEnergy += 0.1;
            if (n === 2) noteEnergy -= 0.1;
        }

        const noteInfo = getNoteForEnergy(noteEnergy);

        melody.notes.push({
          bar: barIndex,
          beat: currentTime % beatsPerBar,
          absoluteBeat: currentTime,
          noteName: noteInfo.name + noteInfo.octave,
          scaleIndex: noteInfo.index,
          intensity: energy,
          duration: noteDuration,
          syllable: activeSyl.text,
          word: activeSyl.parentWord,
          gesture: activeSyl.gesture,
          isOverride: !!activeSyl.scaleOverride
        });

        // Update running state so next getNoteForEnergy sees correct context
        previousScaleIndex = noteInfo.index;
        if (noteInfo.octave !== octave) octave = noteInfo.octave;

        // Move time forward for next note in melisma
        currentTime += noteDuration;
    }

    sylIndex++;
  }

  return melody;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateHarmony,
    generateMelody
  };
}

