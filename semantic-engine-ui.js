/* global WordDatabase, SemanticAPIEngine */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const inputEl = $('#semantic-input');
  const analyzeBtn = $('#semantic-analyze');
  const clearBtn = $('#semantic-clear');
  const exampleBtn = $('#semantic-fill-example');
  const statusEl = $('#semantic-status');
  const summaryEl = $('#semantic-summary');
  const explainPreEl = $('#semantic-explain-pre');
  const wordsTbody = $('#semantic-words-tbody');
  const useLiveDictionaryEl = $('#semantic-use-live-dictionary');

  // Music mode controls
  const musicModeEl = $('#semantic-music-mode');
  const useVoiceLeadingEl = $('#semantic-use-voiceleading');
  const voicesPanelEl = $('#semantic-voices-panel');
  const voicesBodyEl = $('#semantic-voices-body');
  const phrasePresetEl = $('#semantic-phrase-preset');

  // Musical output UI
  const musicContextEl = $('#semantic-music-context');
  const progressionEl = $('#semantic-progression');

  // Musical output instances (lazy init)
  let _musicTheory = null;
  let _sheet = null;
  let _piano = null;
  let _guitar = null;
  let _lastProgression = null;
  let _lastReport = null;
  let _lastVoiceLeading = null; // array aligned to progression chords
  let _lastMelody = null; // { degrees: number[], notes: string[] }
  let _progressionBound = false;
  let _progressionFocus = null;

  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setMusicContext(text) {
    if (musicContextEl) musicContextEl.textContent = text;
  }

  function setVoicesPanel(visible, html) {
    if (!voicesPanelEl || !voicesBodyEl) return;
    voicesPanelEl.style.display = visible ? '' : 'none';
    voicesBodyEl.innerHTML = html || '';
  }

  function getMusicMode() {
    const v = musicModeEl && musicModeEl.value ? String(musicModeEl.value) : 'chords';
    return v === 'melody' ? 'melody' : 'chords';
  }

  function getUseVoiceLeading() {
    return !!(useVoiceLeadingEl && useVoiceLeadingEl.checked);
  }

  function getPhrasePreset() {
    const v = phrasePresetEl && phrasePresetEl.value ? String(phrasePresetEl.value) : 'auto';
    // allow numeric values as strings: "4", "8", ...
    return v;
  }

  function tokenize(text) {
    const raw = String(text || '');
    const words = raw.match(/[A-Za-z][A-Za-z'\-]*/g) || [];
    const sentences = raw
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { raw, words, sentences };
  }

  function parseDegreeFormula(rawText) {
    const raw = String(rawText || '');

    // Numeric degrees: "1 5 6 4" or "1,5,6,4"
    const numeric = raw.match(/\b[1-7]\b/g);
    if (numeric && numeric.length >= 2) {
      return numeric.map((d) => parseInt(d, 10)).filter((n) => n >= 1 && n <= 7);
    }

    // Roman numerals (basic diatonic): I ii iii IV V vi vii
    // Keep this deliberately simple and explainable.
    const roman = raw.match(/\b(i{1,3}|iv|v|vi|vii)\b/gi);
    if (roman && roman.length >= 2) {
      const map = {
        i: 1,
        ii: 2,
        iii: 3,
        iv: 4,
        v: 5,
        vi: 6,
        vii: 7
      };
      const out = roman
        .map((r) => map[String(r).toLowerCase()])
        .filter((n) => typeof n === 'number');
      // Avoid treating normal English "I ... I ..." as a chord formula.
      if (out.length >= 2 && out.some((n) => n !== 1)) return out;
      return null;
    }

    return null;
  }

  function computeTargetBars(tokens, preset, degreesOverride) {
    const overrideLen = degreesOverride && degreesOverride.length ? degreesOverride.length : 0;
    if (overrideLen >= 2) return clamp(overrideLen, 2, 32);

    const p = String(preset || 'auto');
    const asInt = parseInt(p, 10);
    if (Number.isFinite(asInt) && String(asInt) === p) {
      return clamp(asInt, 2, 32);
    }

    const wordCount = tokens && Array.isArray(tokens.words) ? tokens.words.length : 0;
    const sentenceCount = tokens && Array.isArray(tokens.sentences) ? tokens.sentences.length : 0;

    // Auto: prioritize sentence structure, fallback to word density.
    if (sentenceCount >= 2) return clamp(sentenceCount * 4, 4, 16);
    if (wordCount > 0) return clamp(Math.ceil(wordCount / 3) * 4, 4, 16);
    return 4;
  }

  function normalizeWord(w) {
    return String(w || '')
      .toLowerCase()
      .replace(/^'+|'+$/g, '')
      .replace(/^-+|-+$/g, '');
  }

  function hashToUnit(word) {
    const s = String(word || '');
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // convert to [0,1)
    return ((h >>> 0) % 10000) / 10000;
  }

  function hashToIndex(text, n) {
    if (!n) return 0;
    const u = hashToUnit(text);
    return Math.floor(u * n) % n;
  }

  function ensureMusicMounted() {
    // Containers (semantic page)
    const sheetHost = document.querySelector('#sheet-music-container');
    const pianoHost = document.querySelector('#semantic-piano-container');
    const guitarHost = document.querySelector('#semantic-guitar-container');
    if (!sheetHost || !pianoHost || !guitarHost) return false;

    if (!_musicTheory && typeof window.MusicTheoryEngine !== 'undefined') {
      _musicTheory = new window.MusicTheoryEngine();
    }
    if (_musicTheory && !_sheet && typeof window.SheetMusicGenerator !== 'undefined') {
      _sheet = new window.SheetMusicGenerator(_musicTheory);
      _sheet.mount(sheetHost);
      _sheet.setStaffType('grand');
      _sheet.setBarMode('per-bar');
    }
    if (!_piano && typeof window.PianoVisualizer !== 'undefined') {
      _piano = new window.PianoVisualizer({
        fitToContainer: true,
        enableGradingIntegration: false
      });
      _piano.mount(pianoHost);
    }
    if (!_guitar && typeof window.GuitarFretboardVisualizer !== 'undefined') {
      _guitar = new window.GuitarFretboardVisualizer({
        fitToContainer: true
      });
      _guitar.mount(guitarHost);
    }

    return !!(_musicTheory && _sheet && _piano && _guitar);
  }

  function midiToSpelledNoteWithOctave(midi, scaleNotes) {
    if (!_musicTheory || typeof midi !== 'number' || !Number.isFinite(midi)) return null;
    const octave = Math.floor(midi / 12) - 1;
    const pc = ((midi % 12) + 12) % 12;
    const nv = _musicTheory.noteValues || {};
    let name = null;
    if (Array.isArray(scaleNotes) && scaleNotes.length) {
      name = scaleNotes.find((n) => nv[n] != null && (nv[n] % 12) === pc) || null;
    }
    if (!name && Array.isArray(_musicTheory.chromaticNotes)) {
      name = _musicTheory.chromaticNotes[pc] || null;
    }
    if (!name) name = 'C';
    return `${name}${octave}`;
  }

  function buildChordSymbols(prog) {
    if (!prog || !Array.isArray(prog.chords)) return [];
    return prog.chords.map((c) => `${c.root || ''}${c.chordType || ''}`);
  }

  function computeVoiceLeadingSATB(prog, scaleNotes) {
    if (!prog) return null;
    if (typeof window.VoiceLeadingEngine === 'undefined') return null;
    const chordSymbols = buildChordSymbols(prog);
    if (!chordSymbols.length) return null;

    try {
      const vle = new window.VoiceLeadingEngine(_musicTheory);
      vle.debug = false;
      const result = vle.generateVoiceLeading(chordSymbols, { voicing: 'close', register: 'mid' }) || [];
      return result.map((step) => {
        const voices = step && step.voices ? step.voices : null;
        const movement = step && step.movement ? step.movement : null;
        const spelled = {};
        if (voices) {
          Object.keys(voices).forEach((k) => {
            spelled[k] = midiToSpelledNoteWithOctave(voices[k], scaleNotes);
          });
        }
        return { chord: step.chord, voices, spelled, movement };
      });
    } catch (e) {
      console.warn('VoiceLeadingEngine failed:', e);
      return null;
    }
  }

  function movementArrow(delta) {
    if (typeof delta !== 'number' || !Number.isFinite(delta)) return '';
    if (delta > 0) return ` ↑${delta}`;
    if (delta < 0) return ` ↓${Math.abs(delta)}`;
    return ' →0';
  }

  function renderVoiceLeadingTable(vl, prog) {
    if (!vl || !Array.isArray(vl) || !vl.length) return '';
    const labels = (prog && Array.isArray(prog.chords))
      ? prog.chords.map((c) => escapeHtml(c.fullName || `${c.root}${c.chordType}`))
      : vl.map((s) => escapeHtml(s.chord || 'Chord'));

    const voices = ['soprano', 'alto', 'tenor', 'bass'];
    const voiceShort = { soprano: 'S', alto: 'A', tenor: 'T', bass: 'B' };

    const head = `<thead><tr><th style="min-width:70px;">Voice</th>${labels
      .map((l, i) => `<th title="Bar ${i + 1}">${l}</th>`)
      .join('')}</tr></thead>`;

    const body = voices
      .map((v) => {
        const tds = vl
          .map((step) => {
            const note = step && step.spelled ? step.spelled[v] : null;
            const delta = (step && step.movement && step.movement.byVoice && step.movement.byVoice[v])
              ? step.movement.byVoice[v].interval
              : null;
            const text = note ? `${escapeHtml(note)}${movementArrow(delta)}` : '—';
            return `<td class="muted">${text}</td>`;
          })
          .join('');
        return `<tr><td><code class="inline">${voiceShort[v]}</code></td>${tds}</tr>`;
      })
      .join('');

    return `<div style="overflow:auto;"><table>${head}<tbody>${body}</tbody></table></div>`;
  }

  function chooseMelodyDegrees(prog, scaleNotes, seedText) {
    const chords = prog && Array.isArray(prog.chords) ? prog.chords : [];
    if (!chords.length || !Array.isArray(scaleNotes) || !scaleNotes.length) return [];
    const nv = (_musicTheory && _musicTheory.noteValues) || {};

    const pcOf = (note) => {
      const v = nv[note];
      return v == null ? null : (v % 12);
    };
    const scalePcs = scaleNotes.map(pcOf).filter((v) => v != null);
    const degreeForPc = (pc) => {
      const idx = scalePcs.findIndex((p) => p === pc);
      return idx >= 0 ? idx + 1 : null;
    };

    const randUnit = (t) => {
      // deterministic: reuse hashToUnit
      return hashToUnit(t);
    };

    let prev = 1 + (hashToIndex(seedText || '', scaleNotes.length) % scaleNotes.length);
    const out = [];

    for (let i = 0; i < chords.length; i++) {
      const chord = chords[i];
      const chordPcs = (chord && Array.isArray(chord.chordNotes) ? chord.chordNotes : [])
        .map(pcOf)
        .filter((v) => v != null);
      const chordDegrees = chordPcs
        .map(degreeForPc)
        .filter((d) => typeof d === 'number');

      const candidates = chordDegrees.length ? chordDegrees : scaleNotes.map((_, idx) => idx + 1);
      // Prefer stepwise motion: choose candidate nearest to previous with a small deterministic wobble
      const scored = candidates
        .map((d) => {
          const dist = Math.min(Math.abs(d - prev), scaleNotes.length - Math.abs(d - prev));
          const wobble = (randUnit(`${seedText}|${i}|${d}`) - 0.5) * 0.25;
          return { d, score: dist + wobble };
        })
        .sort((a, b) => a.score - b.score);

      const pick = scored[0] ? scored[0].d : prev;
      out.push(pick);
      prev = pick;
    }
    return out;
  }

  function degreesToMelodyNotes(degrees, scaleNotes) {
    if (!_musicTheory || !Array.isArray(degrees) || !Array.isArray(scaleNotes) || !scaleNotes.length) return [];
    const targetMin = 60; // C4
    const targetMax = 76; // E5-ish
    const out = [];
    for (let i = 0; i < degrees.length; i++) {
      const deg = degrees[i];
      const idx = ((deg || 1) - 1) % scaleNotes.length;
      const name = scaleNotes[idx] || scaleNotes[0];
      let octave = 4;
      let midi = _musicTheory.noteToMidi(`${name}${octave}`);
      while (midi < targetMin) { octave++; midi = _musicTheory.noteToMidi(`${name}${octave}`); }
      while (midi > targetMax) { octave--; midi = _musicTheory.noteToMidi(`${name}${octave}`); }
      out.push(`${name}${octave}`);
    }
    return out;
  }

  function pickKeyAndScale(report) {
    const raw = (report && report.tokens && report.tokens.raw) || '';
    const overall = (report && report.overall) || { valence: 0, arousal: 0, dominance: 0 };

    // Keep to common keys (readable for beginners)
    const keys = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'];
    const key = keys[hashToIndex(raw, keys.length)] || 'C';

    // Simple, explainable mapping:
    // - positive valence => major
    // - negative valence => minor
    // - near neutral => dorian (if available) else major
    let scale = 'major';
    if (overall.valence <= -0.12) scale = 'minor';
    else if (overall.valence < 0.12) scale = 'dorian';

    // If the scale isn't available in the loaded dataset, fall back safely.
    try {
      const id = _musicTheory && _musicTheory.normalizeScaleId ? _musicTheory.normalizeScaleId(scale) : scale;
      const has = _musicTheory && _musicTheory.scales && _musicTheory.scales[id];
      if (!has) {
        scale = (scale === 'minor' && _musicTheory && _musicTheory.scales && _musicTheory.scales.minor) ? 'minor' : 'major';
      }
    } catch (_) {
      scale = 'major';
    }

    // Use arousal as a lightweight "complexity" knob
    const complexity = clamp((overall.arousal + 1) / 2, 0, 1); // [0,1]
    return { key, scale, complexity };
  }

  function buildProgression({ key, scale, complexity, tokens, phrasePreset }) {
    if (!_musicTheory) return null;
    const scaleId = _musicTheory.normalizeScaleId ? _musicTheory.normalizeScaleId(scale) : scale;

    const degreesOverride = parseDegreeFormula(tokens && tokens.raw ? tokens.raw : '');
    const targetBars = computeTargetBars(tokens, phrasePreset, degreesOverride);

    // Starter progressions, repeated/truncated to match target length
    const base = (scaleId === 'minor' || scaleId === 'aeolian')
      ? [1, 7, 6, 5]
      : [1, 5, 6, 4];

    const degrees = degreesOverride && degreesOverride.length
      ? degreesOverride.slice(0, targetBars)
      : Array.from({ length: targetBars }, (_, i) => base[i % base.length]);

    const chords = degrees.map((deg) => {
      const base = _musicTheory.getDiatonicChord(deg, key, scaleId);
      let chordType = base && base.chordType ? base.chordType : 'maj';

      // Slightly simplify at low arousal, slightly enrich at high arousal.
      if (complexity < 0.25) {
        // Prefer triads when possible
        chordType = chordType
          .replace(/maj7/g, 'maj')
          .replace(/m7b5/g, 'dim')
          .replace(/m7/g, 'm')
          .replace(/^7$/g, 'maj');
      } else if (complexity > 0.75) {
        // Prefer 7ths when possible
        if (chordType === 'maj') chordType = 'maj7';
        if (chordType === 'm') chordType = 'm7';
      }

      const root = base && base.root ? base.root : key;
      let chordNotes = [];
      try {
        if (typeof _musicTheory.getChordNotes === 'function') {
          chordNotes = _musicTheory.getChordNotes(root, chordType) || [];
        }
      } catch (_) {
        chordNotes = [];
      }
      if ((!chordNotes || !chordNotes.length) && base && Array.isArray(base.diatonicNotes)) {
        chordNotes = base.diatonicNotes.slice();
      }

      return {
        degree: deg,
        root,
        chordType,
        fullName: `${root}${chordType}`,
        chordNotes
      };
    });

    return { key, scale: scaleId, degrees, chords };
  }

  function renderProgressionUI(prog) {
    if (!progressionEl) return;
    if (!prog || !Array.isArray(prog.chords) || !prog.chords.length) {
      progressionEl.innerHTML = '';
      _progressionFocus = null;
      return;
    }

    progressionEl.innerHTML = prog.chords
      .map((c, idx) => {
        const label = c.fullName || `${c.root}${c.chordType}`;
        return `<div class="semantic-chord-pill" data-idx="${idx}" title="Degree ${c.degree}">${escapeHtml(label)}</div>`;
      })
      .join('');

    const setActive = (idx) => {
      const pills = progressionEl.querySelectorAll('.semantic-chord-pill');
      pills.forEach((p) => p.classList.toggle('active', String(p.getAttribute('data-idx')) === String(idx)));
    };

    const focusChord = (idx) => {
      const chord = prog.chords[idx];
      if (!chord) return;

      setActive(idx);

      const mode = getMusicMode();
      const useVL = getUseVoiceLeading();

      try {
        if (_sheet && typeof _sheet.setCurrentChord === 'function') {
          _sheet.setCurrentChord(
            { root: chord.root, chordType: chord.chordType, chordNotes: chord.chordNotes, fullName: chord.fullName },
            { degree: chord.degree }
          );
        }
      } catch (_) {}

      try {
        if (_piano) {
          if (mode === 'melody' && _lastMelody && Array.isArray(_lastMelody.notes)) {
            const n = _lastMelody.notes[idx];
            if (n) {
              if (typeof _piano.setActiveNotes === 'function') _piano.setActiveNotes([n]);
              else if (typeof _piano.renderChord === 'function') _piano.renderChord({ notes: [n] });
            }
          } else if (useVL && _lastVoiceLeading && _lastVoiceLeading[idx] && _lastVoiceLeading[idx].spelled) {
            const spelled = _lastVoiceLeading[idx].spelled;
            const notes = ['bass', 'tenor', 'alto', 'soprano'].map((k) => spelled[k]).filter(Boolean);
            if (notes.length && typeof _piano.setActiveNotes === 'function') {
              _piano.setActiveNotes(notes);
            } else if (typeof _piano.renderChord === 'function') {
              _piano.renderChord({ notes: chord.chordNotes });
            }
          } else if (typeof _piano.renderChord === 'function') {
            _piano.renderChord({ notes: chord.chordNotes });
          }
        }
      } catch (_) {}

      try {
        if (_guitar && typeof _guitar.highlightNote === 'function') {
          if (mode === 'melody' && _lastMelody && Array.isArray(_lastMelody.notes)) {
            const n = _lastMelody.notes[idx];
            if (n) {
              // guitar visualizer expects pitch-class note names typically
              _guitar.highlightNote(String(n).replace(/\d+$/, ''));
            } else {
              _guitar.highlightNote(chord.root);
            }
          } else {
            _guitar.highlightNote(chord.root);
          }
        }
      } catch (_) {}
    };

    _progressionFocus = focusChord;

    // Default focus first chord
    focusChord(0);
  }

  function renderMusicFromReport(report) {
    if (!ensureMusicMounted()) {
      setMusicContext('Music modules not available.');
      return;
    }

    _lastReport = report;

    const { key, scale, complexity } = pickKeyAndScale(report);
    const prog = buildProgression({
      key,
      scale,
      complexity,
      tokens: report ? report.tokens : null,
      phrasePreset: getPhrasePreset()
    });
    _lastProgression = prog;

    const notes = (_musicTheory && typeof _musicTheory.getScaleNotes === 'function')
      ? (_musicTheory.getScaleNotes(key, scale) || [])
      : [];

    setMusicContext(`${key} ${scale}`);

    try {
      if (_sheet && typeof _sheet.setKeyAndScale === 'function') {
        _sheet.setKeyAndScale(key, scale, notes);
      }
      if (_sheet && typeof _sheet.setBarMode === 'function') {
        _sheet.setBarMode('per-bar');
      }
      if (_sheet && typeof _sheet.setBarChords === 'function' && prog) {
        _sheet.setBarChords(prog.chords.map((c) => ({ root: c.root, chordType: c.chordType, chordNotes: c.chordNotes, fullName: c.fullName })));
      }
    } catch (_) {}

    // Mode-specific behavior
    const mode = getMusicMode();
    if (mode === 'melody') {
      const degrees = chooseMelodyDegrees(prog, notes, report && report.tokens ? report.tokens.raw : '');
      const melodyNotes = degreesToMelodyNotes(degrees, notes);
      _lastMelody = { degrees, notes: melodyNotes };
      _lastVoiceLeading = null;

      try {
        if (_sheet && typeof _sheet.setHarmonizationMode === 'function') _sheet.setHarmonizationMode('melody');
        if (_sheet && typeof _sheet.setMelodyOnly === 'function') _sheet.setMelodyOnly(true);
        if (_sheet && typeof _sheet.setBarDegrees === 'function') _sheet.setBarDegrees(degrees);
      } catch (_) {}

      const pills = melodyNotes
        .map((n, i) => `<span class="pill" title="Bar ${i + 1}">${escapeHtml(n)}</span>`)
        .join(' ');
      setVoicesPanel(true, `<div class="muted" style="margin-bottom:6px;">Melody notes (one per bar)</div><div class="row" style="gap:6px; flex-wrap:wrap;">${pills}</div>`);
    } else {
      _lastMelody = null;

      try {
        if (_sheet && typeof _sheet.setHarmonizationMode === 'function') _sheet.setHarmonizationMode('root');
        if (_sheet && typeof _sheet.setMelodyOnly === 'function') _sheet.setMelodyOnly(false);
        if (_sheet && typeof _sheet.setBarDegrees === 'function') _sheet.setBarDegrees([]);
      } catch (_) {}

      if (getUseVoiceLeading()) {
        _lastVoiceLeading = computeVoiceLeadingSATB(prog, notes);
        const tableHtml = renderVoiceLeadingTable(_lastVoiceLeading, prog);
        setVoicesPanel(true, tableHtml || '<div class="muted">Voice leading unavailable.</div>');
      } else {
        _lastVoiceLeading = null;
        setVoicesPanel(false, '');
      }
    }

    try {
      if (_piano && typeof _piano.renderScale === 'function') {
        _piano.renderScale({ key, scale, notes });
      }
    } catch (_) {}

    try {
      if (_guitar && typeof _guitar.renderScale === 'function') {
        _guitar.renderScale({ key, scale, notes });
      }
    } catch (_) {}

    renderProgressionUI(prog);
  }

  function analyzePhoneticsExplain(word) {
    const w = String(word || '').toLowerCase();
    const signals = [];
    let valence = 0;
    let arousal = 0;
    let dominance = 0;

    const add = (name, dv, da, dd) => {
      signals.push({ name, dv, da, dd });
      valence += dv;
      arousal += da;
      dominance += dd;
    };

    // Similar-ish to WordDatabase._analyzePhoneticEmotion, but explainable.
    if (/[kgxzj]|ck|gh|sh/i.test(w)) add('harsh consonants', -0.3, +0.4, +0.05);
    if (/[lmnr]|ll|mm|nn/i.test(w)) add('soft consonants', +0.2, -0.2, -0.02);
    if (/[eiay]|ee|ea|ie/i.test(w)) add('bright vowels', +0.05, +0.3, 0);
    if (/[ou]|oo|ow|au/i.test(w)) add('dark vowels', -0.2, +0.05, +0.02);
    if (w.length > 8) add('long word', 0, 0, +0.2);
    if (w.length < 4) add('short word', 0, 0, -0.1);

    const confidence = clamp(signals.length * 0.12, 0, 0.8);

    return {
      signals,
      confidence,
      emotion: {
        valence: clamp(valence, -1, 1),
        arousal: clamp(arousal, -1, 1),
        dominance: clamp(dominance, -1, 1)
      }
    };
  }

  function deterministicUnknownEmotion(word) {
    // Avoid random outputs so the explanation is stable.
    const u = hashToUnit(word);
    const v = (u - 0.5) * 0.25;
    const a = ((u * 1.7) % 1 - 0.5) * 0.25;
    const d = ((u * 2.3) % 1 - 0.5) * 0.25;
    return { valence: v, arousal: a, dominance: d };
  }

  function localDbExplain(wordDb, normalized) {
    const direct = !!(wordDb && wordDb.emotions && wordDb.emotions[normalized]);
    const synonyms = (wordDb && wordDb.synonyms && wordDb.synonyms[normalized]) || [];
    const synonymHit = !direct && Array.isArray(synonyms)
      ? synonyms.find((s) => wordDb.emotions && wordDb.emotions[s])
      : null;

    const category = wordDb ? wordDb.getSemanticCategory(normalized) : null;

    // Use the DB method if we can, but override the *final fallback* so it isn't random.
    let emotion;
    let source = 'unknown';

    if (direct) {
      emotion = { ...wordDb.emotions[normalized] };
      source = 'direct';
    } else if (synonymHit) {
      emotion = { ...wordDb.emotions[synonymHit] };
      source = `synonym:${synonymHit}`;
    } else {
      const ph = analyzePhoneticsExplain(normalized);
      if (ph.confidence >= 0.25) {
        emotion = { ...ph.emotion };
        source = 'phonetic';
      } else {
        emotion = deterministicUnknownEmotion(normalized);
        source = 'hash-fallback';
      }
    }

    return { direct, synonyms, synonymHit, category, emotion, source };
  }

  function applyNegation(words, i, baseEmotion) {
    // very small, explainable rule: if previous token is a negator, soften + invert valence
    const prev = i > 0 ? normalizeWord(words[i - 1]) : '';
    if (!prev) return { emotion: baseEmotion, rule: null };

    if (prev === 'not' || prev === "n't" || prev === 'no' || prev === 'never') {
      const emotion = {
        valence: clamp(-baseEmotion.valence * 0.8, -1, 1),
        arousal: clamp(baseEmotion.arousal * 0.9, -1, 1),
        dominance: clamp(baseEmotion.dominance * 0.95, -1, 1)
      };
      return { emotion, rule: `negation(${prev})` };
    }

    return { emotion: baseEmotion, rule: null };
  }

  async function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, rej) => {
      t = setTimeout(() => rej(new Error('timeout')), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(t);
    }
  }

  async function analyzeDictionary(semanticApi, normalized) {
    if (!semanticApi) return { ok: false, reason: 'SemanticAPIEngine not available' };

    try {
      const result = await withTimeout(semanticApi.analyzeWord(normalized), 2500);
      const defs = Array.isArray(result && result.definitions) ? result.definitions : [];
      const pos = result && result.partOfSpeech ? result.partOfSpeech : null;
      const ety = result && result.etymology ? result.etymology : null;
      return {
        ok: defs.length > 0,
        definitions: defs,
        partOfSpeech: pos,
        etymology: ety,
        raw: result
      };
    } catch (e) {
      return { ok: false, reason: e && e.message ? e.message : String(e) };
    }
  }

  function formatEmotion(e) {
    if (!e) return '—';
    const v = (Math.round((e.valence || 0) * 100) / 100).toFixed(2);
    const a = (Math.round((e.arousal || 0) * 100) / 100).toFixed(2);
    const d = (Math.round((e.dominance || 0) * 100) / 100).toFixed(2);
    return `v=${v} a=${a} d=${d}`;
  }

  function renderSummary(report) {
    if (!summaryEl) return;

    const overall = report.overall || { valence: 0, arousal: 0, dominance: 0 };

    const mkMetric = (label, value) => {
      // Map [-1,1] => [0,100]
      const pct = Math.round((clamp(value, -1, 1) + 1) * 50);
      return `
        <div class="metric">
          <div class="muted">${label}</div>
          <div class="bar"><div style="width:${pct}%"></div></div>
        </div>
      `;
    };

    const unknown = report.words.filter((w) => w.local && w.local.source === 'hash-fallback');

    summaryEl.innerHTML = `
      <div class="row" style="gap:10px; flex-wrap:wrap;">
        <div class="pill">Tokens: ${report.tokens.words.length}</div>
        <div class="pill">Sentences: ${report.tokens.sentences.length}</div>
        <div class="pill">Unknown-ish: ${unknown.length}</div>
      </div>
      <div style="margin-top:10px;">
        ${mkMetric('Valence', overall.valence)}
        ${mkMetric('Arousal', overall.arousal)}
        ${mkMetric('Dominance', overall.dominance)}
      </div>
      <div class="muted" style="margin-top:8px; font-size:0.85rem;">
        Overall emotion is a simple average with a small negation rule; it’s intentionally easy to audit.
      </div>
    `;
  }

  function renderWords(report) {
    if (!wordsTbody) return;
    const rows = report.words;
    if (!rows || rows.length === 0) {
      wordsTbody.innerHTML = '<tr><td colspan="5" class="muted">No words found.</td></tr>';
      return;
    }

    wordsTbody.innerHTML = rows
      .map((w) => {
        const ph = w.phonetics;
        const phText = ph.signals.length
          ? ph.signals.map((s) => `${s.name} (${s.dv},${s.da},${s.dd})`).join(', ')
          : '—';

        const local = w.local;
        const cat = local.category && local.category.name ? local.category.name : '—';
        const localText = `${local.source}; ${formatEmotion(local.emotion)}; cat=${cat}`;

        const dict = w.dictionary;
        const dictText = dict
          ? (dict.ok
              ? `${(dict.partOfSpeech || 'pos?')}: ${(dict.definitions || []).slice(0, 2).join(' · ')}`
              : `— (${dict.reason || 'no hit'})`)
          : '—';

        return `
          <tr>
            <td><code class="inline">${escapeHtml(w.raw)}</code></td>
            <td class="muted">${escapeHtml(w.normalized)}</td>
            <td class="muted">${escapeHtml(phText)}</td>
            <td class="muted">${escapeHtml(localText)}</td>
            <td class="muted">${escapeHtml(dictText)}</td>
          </tr>
        `;
      })
      .join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function computeOverall(words) {
    if (!words.length) return { valence: 0, arousal: 0, dominance: 0 };
    const sum = words.reduce(
      (acc, w) => {
        acc.valence += w.finalEmotion.valence;
        acc.arousal += w.finalEmotion.arousal;
        acc.dominance += w.finalEmotion.dominance;
        return acc;
      },
      { valence: 0, arousal: 0, dominance: 0 }
    );
    return {
      valence: clamp(sum.valence / words.length, -1, 1),
      arousal: clamp(sum.arousal / words.length, -1, 1),
      dominance: clamp(sum.dominance / words.length, -1, 1)
    };
  }

  async function runAnalysis() {
    const text = inputEl ? inputEl.value : '';
    const tokens = tokenize(text);

    const wordDb = typeof WordDatabase !== 'undefined' ? new WordDatabase() : null;

    let semanticApi = null;
    if (typeof SemanticAPIEngine !== 'undefined') {
      semanticApi = new SemanticAPIEngine();
      // Patch in real public endpoints for this standalone page.
      // (Keeps the main app behavior unchanged.)
      semanticApi.apis = {
        dictionary: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
        conceptnet: 'https://api.conceptnet.io/c/en/',
        datamuse: 'https://api.datamuse.com/words'
      };
      semanticApi.debug = false;
    }

    const useLive = !!(useLiveDictionaryEl && useLiveDictionaryEl.checked);

    const words = [];

    // Small concurrency limiter for dictionary lookups
    const maxConcurrent = 3;
    let inflight = 0;
    const queue = [];

    const runLimited = (fn) =>
      new Promise((resolve) => {
        queue.push({ fn, resolve });
        pump();
      });

    const pump = () => {
      while (inflight < maxConcurrent && queue.length) {
        const job = queue.shift();
        inflight++;
        Promise.resolve()
          .then(job.fn)
          .then((v) => job.resolve(v))
          .catch(() => job.resolve(null))
          .finally(() => {
            inflight--;
            pump();
          });
      }
    };

    for (let i = 0; i < tokens.words.length; i++) {
      const rawWord = tokens.words[i];
      const normalized = normalizeWord(rawWord);
      if (!normalized) continue;

      const phonetics = analyzePhoneticsExplain(normalized);
      const local = localDbExplain(wordDb, normalized);

      let dictionary = null;
      if (useLive && semanticApi) {
        dictionary = await runLimited(() => analyzeDictionary(semanticApi, normalized));
      }

      const neg = applyNegation(tokens.words, i, local.emotion);

      words.push({
        raw: rawWord,
        normalized,
        phonetics,
        local,
        dictionary,
        finalEmotion: neg.emotion,
        appliedRule: neg.rule
      });
    }

    const overall = computeOverall(words);

    const report = {
      tokens,
      overall,
      words,
      algorithm: {
        version: '0.1',
        steps: [
          'tokenize input into words + sentence splits',
          'per word: local WordDatabase emotion/category + explainable phonetic signals',
          'optional: live dictionary lookup (dictionaryapi.dev) via SemanticAPIEngine wrapper',
          'apply a small negation rule (not/no/never) to the following word',
          'average per-word emotions to overall valence/arousal/dominance'
        ]
      }
    };

    renderSummary(report);
    renderWords(report);

    // Musical output
    try {
      renderMusicFromReport(report);
    } catch (e) {
      console.warn('Semantic music output error:', e);
    }

    if (explainPreEl) {
      explainPreEl.textContent = JSON.stringify(report, null, 2);
    }

    return report;
  }

  async function onAnalyze() {
    try {
      setStatus('Analyzing…');
      await runAnalysis();
      setStatus('Done.');
    } catch (e) {
      console.error(e);
      setStatus(`Error: ${e && e.message ? e.message : String(e)}`);
    }
  }

  function onClear() {
    if (inputEl) inputEl.value = '';
    if (summaryEl) summaryEl.innerHTML = '';
    if (explainPreEl) explainPreEl.textContent = '(run an analysis)';
    if (wordsTbody) wordsTbody.innerHTML = '<tr><td colspan="5" class="muted">No analysis yet.</td></tr>';
    if (progressionEl) progressionEl.innerHTML = '';
    setMusicContext('(run an analysis)');
    _lastProgression = null;
    _lastReport = null;
    _lastVoiceLeading = null;
    _lastMelody = null;
    setVoicesPanel(false, '');
    setStatus('Cleared.');
  }

  function onExample() {
    if (!inputEl) return;
    inputEl.value = "Not dark, but still tense — chasing shadows in the woods.";
    setStatus('Example loaded.');
  }

  function init() {
    if (!inputEl || !analyzeBtn) {
      setStatus('UI elements missing.');
      return;
    }

    if (progressionEl && !_progressionBound) {
      _progressionBound = true;
      progressionEl.addEventListener(
        'click',
        (e) => {
          if (!_progressionFocus) return;
          const pill = e.target && e.target.closest ? e.target.closest('.semantic-chord-pill') : null;
          if (!pill) return;
          const idx = parseInt(pill.getAttribute('data-idx'), 10);
          if (!Number.isFinite(idx)) return;
          _progressionFocus(idx);
        },
        { passive: true }
      );
    }

    analyzeBtn.addEventListener('click', onAnalyze);
    if (clearBtn) clearBtn.addEventListener('click', onClear);
    if (exampleBtn) exampleBtn.addEventListener('click', onExample);

    // Re-render music when mode toggles change
    if (musicModeEl) {
      musicModeEl.addEventListener('change', () => {
        if (_lastReport) {
          try { renderMusicFromReport(_lastReport); } catch (_) {}
        }
      });
    }
    if (useVoiceLeadingEl) {
      useVoiceLeadingEl.addEventListener('change', () => {
        if (_lastReport) {
          try { renderMusicFromReport(_lastReport); } catch (_) {}
        }
      });
    }

    if (phrasePresetEl) {
      phrasePresetEl.addEventListener('change', () => {
        if (_lastReport) {
          try { renderMusicFromReport(_lastReport); } catch (_) {}
        }
      });
    }

    inputEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        onAnalyze();
      }
    });

    setStatus('Ready. Ctrl+Enter to analyze.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
