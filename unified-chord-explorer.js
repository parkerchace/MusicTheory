/**
 * @module UnifiedChordExplorer
 * @description Unified chord exploration with scale-based grid, progression highlighting, and intelligent radial substitution menu
 * @exports class UnifiedChordExplorer
 * @feature Scale chord grid showing all diatonic chords (I-VII)
 * @feature Progression highlighting from NumberGenerator
 * @feature Radial substitution menu with common subs and container chords
 * @feature Intelligent positioning based on harmonic function and voice leading
 * @feature Grading system (★★★ Perfect, ★★ Excellent, ★ Good)
 * @feature Secondary dominants, tritone subs, modal interchange
 * @feature Container chord analysis for any selected chord
 */

class UnifiedChordExplorer {
    constructor(musicTheoryEngine) {
        if (!musicTheoryEngine) {
            throw new Error('UnifiedChordExplorer requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.state = {
            currentKey: 'C',
            // Radial layout mode: 'auto' (current force/collision) or 'quadrant'
            layoutMode: 'auto',
            currentScale: 'major',
            scaleChords: [],          // All I-VII chords in scale
            progressionDegrees: [],   // Highlighted degrees from number generator
            selectedChord: null,      // Currently selected chord for substitution
            radialMenuOpen: false,
            radialMenuPosition: { x: 0, y: 0 },
            substitutions: [],
            complexity: 50,           // 0-100: triads to 13ths
            showExtended: true,
            // NEW: Radial menu filter mode
            radialFilterMode: 'all'   // 'all' | 'diatonic' | 'color' | 'chromatic' | 'surprise' | 'containers'
        };
        // Tracks non-diatonic substitutions applied to progression slots
        this.state.progressionOverlays = [];

        this.listeners = new Map();
        this.containerElement = null;
        this.radialMenu = null;
        this.numberGenerator = null;
        // If true, radial menus will open centered in the viewport (game-like behavior)
        this.radialCenterOnOpen = true;

        // Debug logging flag (default off to reduce console noise)
        this.debug = false;
        // Fine-grained trace categories you can toggle individually later if needed
        this.traceCategories = {
            tokens: false,
            containers: false,
            radial: false,
            layout: false,
            sequence: false
        };

        // Subscribe to shared grading mode changes
        if (this.musicTheory.subscribe) {
            this.musicTheory.subscribe((event, data) => {
                if (event === 'gradingModeChanged') {
                    this.render();
                    if (this.state.radialMenuOpen) {
                        this.renderRadialMenu();
                    }
                }
            });
        }
    }

    /** Internal conditional logger */
    _log(category, ...args) {
        if (!this.debug) return;
        if (category && this.traceCategories.hasOwnProperty(category) && !this.traceCategories[category]) return;
        try { console.log('[UnifiedChordExplorer]', ...args); } catch(_) {}
    }

    /**
     * Connect to ScaleLibrary so the explorer updates when the global key/scale changes
     */
    connectScaleLibrary(scaleLibrary) {
        this.scaleLibrary = scaleLibrary;
        try {
            if (scaleLibrary && typeof scaleLibrary.getCurrentKey === 'function' && typeof scaleLibrary.getCurrentScale === 'function') {
                // Initialize state from scaleLibrary immediately
                this.state.currentKey = scaleLibrary.getCurrentKey();
                this.state.currentScale = scaleLibrary.getCurrentScale();
                this.generateScaleChords();
            }
            if (scaleLibrary && scaleLibrary.on) {
                scaleLibrary.on('scaleChanged', (data) => {
                    try {
                        const key = data && data.key ? data.key : (scaleLibrary.getCurrentKey ? scaleLibrary.getCurrentKey() : this.state.currentKey);
                        const scale = data && data.scale ? data.scale : (scaleLibrary.getCurrentScale ? scaleLibrary.getCurrentScale() : this.state.currentScale);
                        this.setKeyAndScale(key, scale);
                    } catch (e) {
                        console.warn('[UnifiedChordExplorer] scaleChanged handler failed', e);
                    }
                });
            }
        } catch (e) {
            console.warn('[UnifiedChordExplorer] connectScaleLibrary failed', e);
        }
    }

    /**
     * Connect to NumberGenerator for progression highlighting
     */
    connectNumberGenerator(numberGenerator) {
        this.numberGenerator = numberGenerator;
        if (numberGenerator && numberGenerator.on) {
            numberGenerator.on('numbersChanged', (data) => {
                const numbers = data.numbers || [];
                this.state.progressionDegrees = numbers;
                // Reconcile sequence with new numbers but preserve inserted items
                this.reconcileSequenceWithNumbers(numbers);
                this.render();
            });

            // Also listen for manual Roman/chord input (displayTokensChanged) so manual entries update the explorer
            numberGenerator.on('displayTokensChanged', (data) => {
                try {
                    let tokens = Array.isArray(data && data.tokens) ? data.tokens : null;
                    let rawTokens = Array.isArray(data && data.rawTokens) ? data.rawTokens : null;
                    // Fallback: if tokens empty, use rawTokens; or vice-versa
                    if (!tokens && rawTokens) tokens = rawTokens.slice();
                    if (!rawTokens && tokens) rawTokens = tokens.slice();
                    // Sanitize both arrays
                    const sanitize = (arr) => Array.isArray(arr) ? arr.map(t => String(t || '').trim()).filter(t => t.length > 0) : [];
                    tokens = sanitize(tokens);
                    rawTokens = sanitize(rawTokens);
                    if (!tokens || tokens.length === 0) {
                        // nothing to update; keep current state
                        return;
                    }
                    // Align lengths: rawTokens should match tokens length
                    if (rawTokens.length < tokens.length) {
                        rawTokens = tokens.map((t, idx) => rawTokens[idx] || t);
                    } else if (rawTokens.length > tokens.length) {
                        rawTokens = rawTokens.slice(0, tokens.length);
                    }
                    this._log('tokens', 'displayTokensChanged', { tokens, rawTokens, tlen: tokens.length, rlen: rawTokens.length });
                    // Update progressionSequence for display preview: map tokens to degree or inserted substitutions
                    // Store preview tokens for manual handling
                    this.state.previewManualTokens = tokens.slice();
                    this.state.previewManualRawTokens = rawTokens.slice();
                    this.state.progressionSequence = tokens.map((tok, idx) => {
                        const raw = Array.isArray(rawTokens) && rawTokens[idx] ? rawTokens[idx] : tok;
                        // Try to extract degree from roman (supports accidentals and suffixes)
                        const deg = this._extractDegreeFromRoman(raw);
                        if (deg) {
                                // If token is a plain Roman (no quality or accidental), keep as a degree.
                                const isPlainRoman = /^([#b♯♭]*)([IViv]+)$/i.test(raw);
                                // If the token includes an explicit quality (e.g. maj7, m7, sus4) or a leading accidental
                                // (e.g. bII, #IV) treat it as an inserted substitution and compute the spelled root.
                                const hasQuality = /maj|dim|aug|m7b5|m7|m13|m9|m11|m6|sus|add|alt|7|9|11|13/i.test(raw);
                                const hasLeadingAccidental = /^([b#♭♯]+)/.test(raw);
                                if (isPlainRoman && !hasQuality && !hasLeadingAccidental) {
                                    try {
                                        const triad = this.musicTheory.buildScaleChord(this.state.currentKey, this.state.currentScale, deg, 3);
                                        const triadType = this.musicTheory.classifyChordTypeFromNotes(triad.root, triad.notes) || '';
                                        return { type: 'inserted', substitution: { root: triad.root, chordType: triadType, fullName: triad.root + triadType, notes: triad.notes } };
                                    } catch (_) { /* fallback to degree */ }
                                    return { type: 'degree', degree: deg };
                                }

                                // Compute spelled root for accidental Roman numerals (e.g., bII -> Db) or when a quality is present
                                try {
                                    // Extract leading accidentals and the roman part and suffix
                                    const m = String(raw).match(/^([b#♭♯]*)([IViv]+)(.*)$/);
                                    const accidental = m && m[1] ? m[1] : '';
                                    const romanPart = m && m[2] ? m[2] : null;
                                    const suffix = m && m[3] ? m[3].trim() : '';
                                    // Map romanPart to base semitone offset from tonic
                                    const baseSemisMap = { 'I':0,'II':2,'III':4,'IV':5,'V':7,'VI':9,'VII':11 };
                                    const rp = romanPart ? romanPart.toUpperCase() : null;
                                    const baseSemis = rp && baseSemisMap[rp] !== undefined ? baseSemisMap[rp] : null;
                                    if (baseSemis == null) {
                                        return { type: 'degree', degree: deg };
                                    }
                                    // Compute accidental shift (+1 per #, -1 per b)
                                    let shift = 0;
                                    for (const ch of accidental) {
                                        if (ch === '#' || ch === '♯') shift += 1;
                                        else if (ch === 'b' || ch === '♭') shift -= 1;
                                    }
                                    const tonicVal = this.musicTheory.noteValues[this.state.currentKey];
                                    const noteVals = this.musicTheory.noteValues || {};
                                    const targetPc = ( (tonicVal + baseSemis + shift) % 12 + 12 ) % 12;
                                    // Prefer a key-aware enharmonic spelling. If user typed a flat accidental,
                                    // prefer a flat enharmonic. Otherwise ask the engine for the best spelling
                                    // given the current key; fall back to any enharmonic available.
                                    let spelledRoot = null;
                                    try {
                                        // If the token used a flat accidental, choose a flat enharmonic explicitly
                                        if (accidental && accidental.indexOf('b') >= 0) {
                                            const enh = Object.entries(this.musicTheory.noteValues).filter(([n, v]) => v === targetPc).map(([n]) => n);
                                            spelledRoot = enh.find(n => n.indexOf('b') >= 0) || enh[0] || null;
                                        } else {
                                            // Use engine helper to choose spelling respecting key signature
                                            if (typeof this.musicTheory.getNoteFromIntervalInKey === 'function') {
                                                // baseSemis + shift is the semitone offset from tonic
                                                spelledRoot = this.musicTheory.getNoteFromIntervalInKey(this.state.currentKey, baseSemis + shift, this.state.currentKey);
                                            }
                                            // Fallback: pick any enharmonic if engine didn't return one
                                            if (!spelledRoot) {
                                                const enh = Object.entries(this.musicTheory.noteValues).filter(([n, v]) => v === targetPc).map(([n]) => n);
                                                spelledRoot = enh[0] || null;
                                            }
                                        }
                                    } catch (e) {
                                        // last-resort: use chromatic array
                                        const chromatic = this.musicTheory.chromaticNotes || [];
                                        spelledRoot = chromatic[targetPc] || null;
                                    }
                                    const chordType = this._inferChordTypeFromRomanToken(raw) || (suffix || '');
                                    if (spelledRoot) {
                                        let notes = (this.musicTheory.getChordNotes && this.musicTheory.getChordNotes(spelledRoot, chordType)) || [];
                                        // Re-spell notes to match the spelled root (prefer flats if root contains 'b')
                                        try {
                                            if (this.musicTheory && typeof this.musicTheory.spellNotesForRoot === 'function') {
                                                notes = this.musicTheory.spellNotesForRoot(spelledRoot, notes);
                                            }
                                        } catch (e) { /* non-fatal */ }
                                        const subs = { root: spelledRoot, chordType: chordType, fullName: spelledRoot + (chordType || ''), notes };
                                        return { type: 'inserted', substitution: subs };
                                    }
                                } catch (e) {
                                    // fallback to degree if anything fails
                                    return { type: 'degree', degree: deg };
                                }
                                // Default fallback
                                return { type: 'degree', degree: deg };
                        }
                        // Try spelled root match (A-G) and map to diatonic degree if possible
                        const m = String(tok).match(/^([A-G][b#]?)(.*)$/i);
                        if (m) {
                            const root = m[1];
                            const chordType = (m[2] || '').trim();
                            if (chordType) {
                                // Explicit chord type: always treat as substitution
                                const subs = { root: root, chordType: chordType, fullName: root + chordType, notes: this.musicTheory.getChordNotes ? this.musicTheory.getChordNotes(root, chordType) : [] };
                                return { type: 'inserted', substitution: subs };
                            } else {
                                // No explicit chord type: try to find matching diatonic chord
                                const sc = this.state.scaleChords.find(c => c.root === root);
                                if (sc && typeof sc.degree === 'number') return { type: 'degree', degree: sc.degree };
                                // Otherwise treat as substitution with default triad
                                const triadNotes = this.musicTheory.getChordNotes ? this.musicTheory.getChordNotes(root, 'maj') : [];
                                return { type: 'inserted', substitution: { root: root, chordType: 'maj', fullName: root + 'maj', notes: triadNotes } };
                            }
                        }
                        // Not a roman numeral nor a spelled root: keep as inserted label
                        return { type: 'inserted', substitution: { root: null, chordType: tok, fullName: tok, notes: [] } };
                    });
                    // Non-invasive runtime trace: record any inserted substitutions created by this mapping
                    try {
                        if (typeof window !== 'undefined' && Array.isArray(window.__interactionLog)) {
                            this.state.progressionSequence.forEach((entry, seqIdx) => {
                                if (entry && entry.type === 'inserted' && entry.substitution) {
                                    try { window.__interactionLog.push({ type: 'substitutionCreated', rawToken: (rawTokens && rawTokens[seqIdx]) || tokens[seqIdx] || null, substitution: entry.substitution, seqIndex: seqIdx, preferFlat: String(entry.substitution.root || '').indexOf('b') >= 0, key: this.state.currentKey, ts: Date.now() }); } catch(_){}
                                }
                            });
                        }
                    } catch (_) { /* non-fatal */ }

                    // Non-invasive runtime trace: record any inserted substitutions created by this mapping
                    try {
                        if (typeof window !== 'undefined' && Array.isArray(window.__interactionLog)) {
                            this.state.progressionSequence.forEach((entry, seqIdx) => {
                                if (entry && entry.type === 'inserted' && entry.substitution) {
                                    try { window.__interactionLog.push({ type: 'substitutionCreated', rawToken: (rawTokens && rawTokens[seqIdx]) || tokens[seqIdx] || null, substitution: entry.substitution, seqIndex: seqIdx, preferFlat: String(entry.substitution.root || '').indexOf('b') >= 0, key: this.state.currentKey, ts: Date.now() }); } catch(_){}
                                }
                            });
                        }
                    } catch (_) { /* non-fatal */ }

                    this.render();
                } catch (e) {
                    console.warn('[UnifiedChordExplorer] displayTokensChanged handler failed', e, data);
                }
            });

            // On committed tokens, mark them as finalized
            numberGenerator.on('displayTokensCommitted', (data) => {
                try {
                    let tokens = Array.isArray(data && data.tokens) ? data.tokens : null;
                    let rawTokens = Array.isArray(data && data.rawTokens) ? data.rawTokens : null;
                    if (!tokens && rawTokens) tokens = rawTokens.slice();
                    if (!rawTokens && tokens) rawTokens = tokens.slice();
                    const sanitize = (arr) => Array.isArray(arr) ? arr.map(t => String(t || '').trim()).filter(t => t.length > 0) : [];
                    tokens = sanitize(tokens);
                    rawTokens = sanitize(rawTokens);
                    if (!tokens || tokens.length === 0) return;
                    // Align lengths
                    if (rawTokens.length < tokens.length) rawTokens = tokens.map((t, idx) => rawTokens[idx] || t);
                    if (rawTokens.length > tokens.length) rawTokens = rawTokens.slice(0, tokens.length);
                    this._log('tokens', 'displayTokensCommitted', { tokens, rawTokens, tlen: tokens.length, rlen: rawTokens.length });
                    // Update progressionSequence for committed tokens: map to degree or inserted substitution
                    // Persist committed tokens into preview storage too (consistent across UI)
                    this.state.previewManualTokens = tokens.slice();
                    this.state.previewManualRawTokens = rawTokens.slice();
                    this.state.progressionSequence = tokens.map((tok, idx) => {
                        const raw = Array.isArray(rawTokens) && rawTokens[idx] ? rawTokens[idx] : tok;
                        const deg = this._extractDegreeFromRoman(raw);
                        if (deg) {
                            // If plain Roman (no quality), use triad (maj/min/dim)
                            const isPlainRoman = /^([#b♯♭]*)([IViv]+)$/i.test(raw);
                            if (isPlainRoman) {
                                try {
                                    const triad = this.musicTheory.buildScaleChord(this.state.currentKey, this.state.currentScale, deg, 3);
                                    const triadType = this.musicTheory.classifyChordTypeFromNotes(triad.root, triad.notes) || '';
                                    let triadNotes = triad.notes;
                                    try { if (this.musicTheory && typeof this.musicTheory.spellNotesForRoot === 'function') triadNotes = this.musicTheory.spellNotesForRoot(triad.root, triadNotes); } catch(_){}
                                    return { type: 'inserted', substitution: { root: triad.root, chordType: triadType, fullName: triad.root + triadType, notes: triadNotes } };
                                } catch (_) { /* fallback to degree */ }
                            }
                            // Non-plain Roman with suffix/accidental: treat as substitution with inferred quality
                            try {
                                const m2 = String(raw).match(/^([b#♭♯]*)([IViv]+)(.*)$/);
                                if (m2) {
                                    const accidental = m2[1] || '';
                                    const romanPart = m2[2] || '';
                                    const chordType = this._inferChordTypeFromRomanToken(raw);
                                    if (romanPart) {
                                        const baseSemisMap = { 'I':0,'II':2,'III':4,'IV':5,'V':7,'VI':9,'VII':11 };
                                        const rp = romanPart.toUpperCase();
                                        const baseSemis = baseSemisMap[rp];
                                        if (baseSemis !== undefined) {
                                            let shift = 0;
                                            for (const ch of accidental) {
                                                if (ch === '#' || ch === '♯') shift += 1;
                                                else if (ch === 'b' || ch === '♭') shift -= 1;
                                            }
                                            const tonicVal = this.musicTheory.noteValues[this.state.currentKey];
                                            const targetPc = (((tonicVal + baseSemis + shift) % 12) + 12) % 12;
                                            let spelledRoot = null;
                                            try {
                                                if (accidental && accidental.indexOf('b') >= 0) {
                                                    const enh = Object.entries(this.musicTheory.noteValues).filter(([n, v]) => v === targetPc).map(([n]) => n);
                                                    spelledRoot = enh.find(n => n.indexOf('b') >= 0) || enh[0] || null;
                                                } else if (typeof this.musicTheory.getNoteFromIntervalInKey === 'function') {
                                                    spelledRoot = this.musicTheory.getNoteFromIntervalInKey(this.state.currentKey, baseSemis + shift, this.state.currentKey);
                                                }
                                                if (!spelledRoot) {
                                                    const enh = Object.entries(this.musicTheory.noteValues).filter(([n, v]) => v === targetPc).map(([n]) => n);
                                                    spelledRoot = enh[0] || null;
                                                }
                                            } catch(_) {
                                                const chromatic = this.musicTheory.chromaticNotes || [];
                                                spelledRoot = chromatic[targetPc] || null;
                                            }
                                            if (spelledRoot) {
                                                let notes = (this.musicTheory.getChordNotes && this.musicTheory.getChordNotes(spelledRoot, chordType)) || [];
                                                try { if (this.musicTheory && typeof this.musicTheory.spellNotesForRoot === 'function') notes = this.musicTheory.spellNotesForRoot(spelledRoot, notes); } catch(_){ }
                                                return { type: 'inserted', substitution: { root: spelledRoot, chordType: chordType, fullName: spelledRoot + (chordType || ''), notes } };
                                            }
                                        }
                                    }
                                }
                            } catch(_){ }
                            return { type: 'degree', degree: deg };
                        }
                        const m = String(tok).match(/^([A-G][b#]?)(.*)$/i);
                        if (m) {
                            const root = m[1];
                            const chordType = (m[2] || '').trim();
                            if (chordType) {
                                // Explicit chord type: always treat as substitution
                                    let notes = this.musicTheory.getChordNotes ? this.musicTheory.getChordNotes(root, chordType) : [];
                                    try { if (this.musicTheory && typeof this.musicTheory.spellNotesForRoot === 'function') notes = this.musicTheory.spellNotesForRoot(root, notes); } catch(_) {}
                                    const subs = { root: root, chordType: chordType, fullName: root + chordType, notes };
                                return { type: 'inserted', substitution: subs };
                            } else {
                                // No explicit chord type: try to find matching diatonic chord
                                const sc = this.state.scaleChords.find(c => c.root === root);
                                if (sc && typeof sc.degree === 'number') return { type: 'degree', degree: sc.degree };
                                // Otherwise treat as substitution with default triad
                                let triadNotes = this.musicTheory.getChordNotes ? this.musicTheory.getChordNotes(root, 'maj') : [];
                                try { if (this.musicTheory && typeof this.musicTheory.spellNotesForRoot === 'function') triadNotes = this.musicTheory.spellNotesForRoot(root, triadNotes); } catch(_) {}
                                return { type: 'inserted', substitution: { root: root, chordType: 'maj', fullName: root + 'maj', notes: triadNotes } };
                            }
                        }
                        // Fallback: commit as an inserted non-diatonic substitution
                        return { type: 'inserted', substitution: { root: null, chordType: tok, fullName: tok, notes: [] } };
                    });
                    this.render();
                } catch (e) {
                    console.warn('[UnifiedChordExplorer] displayTokensCommitted handler failed', e, data);
                }
            });

            // Manual preview from number generator (keeps raw case-preserving tokens while editing)
            numberGenerator.on('manualPreviewTokens', (data) => {
                try {
                    const tokens = Array.isArray(data && data.tokens) ? data.tokens.map(t => String(t).trim()).filter(t => t.length) : [];
                    const raw = Array.isArray(data && data.roman) ? data.roman.map(t => String(t).trim()).filter(t => t.length) : [];
                    if (tokens.length === 0 && raw.length === 0) return;
                    this.updateManualPreviewTokens(tokens, raw);
                } catch (e) {
                    console.warn('[UnifiedChordExplorer] manualPreviewTokens handler failed', e);
                }
            });
        }
    }

    /**
     * Reconcile existing progressionSequence with a new numbers array from NumberGenerator
     * while preserving inserted items at their relative positions.
     */
    reconcileSequenceWithNumbers(numbers) {
        const seq = this.state.progressionSequence && Array.isArray(this.state.progressionSequence)
            ? this.state.progressionSequence.slice()
            : [];
        // If there is no sequence yet, build a simple one from numbers
        if (seq.length === 0) {
            this.state.progressionSequence = (numbers || []).map(d => ({ type: 'degree', degree: d }));
            return;
        }

        const result = [];
        let i = 0; // pointer into numbers
        for (const entry of seq) {
            if (entry.type === 'degree') {
                if (i < numbers.length) {
                    result.push({ type: 'degree', degree: numbers[i++] });
                } else {
                    // numbers list got shorter than degree entries; drop extras
                }
            } else if (entry.type === 'inserted') {
                // Preserve inserted items exactly as-is
                result.push(entry);
            }
        }
        // Append any remaining numbers as degrees
        while (i < numbers.length) {
            result.push({ type: 'degree', degree: numbers[i++] });
        }
        this.state.progressionSequence = result;
    }

    /**
     * Set key and scale
     */
    setKeyAndScale(key, scale) {
        this.state.currentKey = key;
        this.state.currentScale = scale;
        this.generateScaleChords();
        this.render();
        this.emit('scaleChanged', { key, scale });
    }

    /**
     * Generate all diatonic chords for the current scale (I-VII)
     */
    generateScaleChords() {
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale);
        const chords = [];

        for (let degree = 1; degree <= 7; degree++) {
            const diatonicChord = this.musicTheory.getDiatonicChord(degree, this.state.currentKey, this.state.currentScale);
            if (diatonicChord) {
                // Manual override logic (preview OR committed tokens):
                // If user types viidim / vii° -> force dim7. If user types viihalfdim / viiø / vii m7b5 -> force m7b5.
                // Works for any degree (creative chromatic use) but especially clarifies VII in major.
                let chordTypeOverride = null;
                // Prefer raw preview tokens (case-preserving) when available; otherwise fallback to normalized tokens
                const manualTokens = (Array.isArray(this.state.previewManualRawTokens) && this.state.previewManualRawTokens.length)
                    ? this.state.previewManualRawTokens
                    : (Array.isArray(this.state.previewManualTokens) && this.state.previewManualTokens.length)
                        ? this.state.previewManualTokens
                        : (this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayRawTokens) && this.numberGenerator.state.displayRawTokens.length
                            ? this.numberGenerator.state.displayRawTokens
                            : (this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayTokens) && this.numberGenerator.state.displayTokens.length
                                ? this.numberGenerator.state.displayTokens
                                : null));
                if (manualTokens) {
                    // Find first token mapping to this degree
                    // Prefer raw tokens for degree/quality recognition (they preserve case/symbols)
                    const previewRaw = Array.isArray(this.state.previewManualRawTokens) && this.state.previewManualRawTokens.length
                        ? this.state.previewManualRawTokens
                        : (Array.isArray(this.numberGenerator && this.numberGenerator.state && this.numberGenerator.state.displayRawTokens) ? this.numberGenerator.state.displayRawTokens : null);
                    const matchTok = (previewRaw && previewRaw.find) ? previewRaw.find(tok => this._extractDegreeFromRoman(tok) === degree) : manualTokens.find(tok => this._extractDegreeFromRoman(tok) === degree);
                    if (matchTok) {
                        const rawTok = String(matchTok);
                        const low = rawTok.toLowerCase();
                        const isHalfDimSyn = /ø|m7b5|half[-]?dim(inished)?/i.test(rawTok);
                        const isFullDimSyn = (/°/.test(rawTok) || /(^|[^a-z])dim($|[^a-z0-9])/i.test(low)) && !/half[-]?dim/i.test(low);
                        // Detect plain Roman numeral token with no quality or extension (e.g., 'IV')
                        // If such a token exists, prefer a triad quality (no 7th) rather than the engine default.
                        const isPlainRoman = /^([#b♯♭]*)([IViv]+)$/i.test(rawTok);
                        if (isHalfDimSyn && !isFullDimSyn) {
                            chordTypeOverride = 'm7b5';
                        } else if (isFullDimSyn && !isHalfDimSyn) {
                            chordTypeOverride = 'dim7';
                        } else if (isPlainRoman) {
                            // Build and classify a triad for this degree so IV -> maj (triad) instead of maj7
                            try {
                                const triad = this.musicTheory.buildScaleChord(this.state.currentKey, this.state.currentScale, degree, 3);
                                const triadType = this.musicTheory.classifyChordTypeFromNotes(diatonicChord.root, triad.notes) || '';
                                // Normalize triadType: prefer 'maj' for majors (no numeric suffix), 'm' for minors, 'dim' if dim triad
                                if (triadType) {
                                    // triadType might be 'maj' or 'm' or 'dim'; use it as override
                                    chordTypeOverride = triadType;
                                }
                            } catch (_) { /* ignore triad override failure */ }
                        }
                    }
                }
                const finalChordType = chordTypeOverride || diatonicChord.chordType;
                const finalFullName = diatonicChord.root + finalChordType;
                const finalNotes = this.musicTheory.getChordNotes(diatonicChord.root, finalChordType);
                chords.push({
                    degree,
                    root: diatonicChord.root,
                    chordType: finalChordType,
                    fullName: finalFullName,
                    notes: finalNotes,
                    inProgression: this.state.progressionDegrees.includes(degree),
                    functions: this.getFunctionalHarmonyTags(degree, this.state.currentScale)
                });
            }
        }

        // If no chords were generated by the engine, fallback to simple triads based on scale notes
        if (!chords.length) {
            try { console.warn('[UnifiedChordExplorer] No diatonic chords generated, falling back to triads for UI rendering'); } catch(_) {}
            const fallbackScale = scaleNotes && scaleNotes.length ? scaleNotes : ['C','D','E','F','G','A','B'];
            for (let degree = 1; degree <= 7; degree++) {
                const root = fallbackScale[(degree - 1) % fallbackScale.length];
                // Basic major/minor mapping for fallback
                let chordType = 'maj';
                if ([2,3,6].includes(degree)) chordType = 'm';
                if (degree === 7) chordType = '°';
                let finalType = chordType;
                try { finalType = this.musicTheory && this.musicTheory.getChordNotes ? (this.musicTheory.getChordNotes(root, chordType) && chordType) : chordType; } catch(_){}
                const finalFull = root + finalType;
                let finalNotes = [];
                try { finalNotes = this.musicTheory.getChordNotes(root, finalType) || []; } catch(_){}
                chords.push({ degree, root, chordType: finalType, fullName: finalFull, notes: finalNotes, inProgression: this.state.progressionDegrees.includes(degree), functions: this.getFunctionalHarmonyTags(degree, this.state.currentScale) });
            }
        }

        this.state.scaleChords = chords;
    }

    /**
     * Generate different voicings/inversions for duplicate chords in progression
     */
    generateProgressionChords() {
        const seq = this.ensureProgressionSequence();
        const progressionChords = [];
        const degreeOccurrences = new Map(); // Track how many times each degree appears
        
        seq.forEach((entry, seqIndex) => {
            if (entry.type === 'degree') {
                const degree = entry.degree;
                const baseChord = this.state.scaleChords.find(sc => sc.degree === degree);
                
                if (baseChord) {
                    // Track occurrence count for this degree
                    const occurrenceCount = degreeOccurrences.get(degree) || 0;
                    degreeOccurrences.set(degree, occurrenceCount + 1);
                    
                    // Generate different voicing based on occurrence
                    const voicedChord = this.generateChordVoicing(baseChord, occurrenceCount, seqIndex);
                    progressionChords.push(voicedChord);
                } else {
                    // Fallback for missing chord
                    progressionChords.push(null);
                }
            } else if (entry.type === 'inserted' && entry.substitution) {
                // Handle inserted substitutions
                const sub = entry.substitution;
                const synthChord = {
                    degree: null,
                    root: sub.root,
                    chordType: sub.chordType || '',
                    fullName: sub.fullName || (sub.root + (sub.chordType || '')),
                    notes: sub.notes || (this.musicTheory.getChordNotes ? this.musicTheory.getChordNotes(sub.root, sub.chordType) : []),
                    inProgression: true,
                    functions: [],
                    seqIndex: seqIndex,
                    isInserted: true
                };
                progressionChords.push(synthChord);
            }
        });
        
        return progressionChords;
    }

    /**
     * Generate different voicing/inversion for a chord based on its occurrence in the progression
     */
    generateChordVoicing(baseChord, occurrenceIndex, seqIndex) {
        const voicings = this.getAvailableVoicings(baseChord);
        const selectedVoicing = voicings[occurrenceIndex % voicings.length];
        
        return {
            ...baseChord,
            ...selectedVoicing,
            seqIndex: seqIndex,
            occurrenceIndex: occurrenceIndex,
            voicingType: selectedVoicing.voicingType,
            voicingLabel: selectedVoicing.voicingLabel
        };
    }

    /**
     * Get available voicings/inversions for a chord
     */
    getAvailableVoicings(chord) {
        const voicings = [];
        const root = chord.root;
        const chordType = chord.chordType;
        const baseNotes = chord.notes || [];
        
        // Root position (original)
        voicings.push({
            fullName: chord.fullName,
            notes: baseNotes,
            voicingType: 'root',
            voicingLabel: 'Root Position',
            bassNote: root
        });
        
        if (baseNotes.length >= 3) {
            // First inversion (3rd in bass)
            const firstInvNotes = this.invertChord(baseNotes, 1);
            voicings.push({
                fullName: `${chord.fullName}/3`,
                notes: firstInvNotes,
                voicingType: 'first',
                voicingLabel: '1st Inversion',
                bassNote: firstInvNotes[0]
            });
            
            // Second inversion (5th in bass)
            const secondInvNotes = this.invertChord(baseNotes, 2);
            voicings.push({
                fullName: `${chord.fullName}/5`,
                notes: secondInvNotes,
                voicingType: 'second',
                voicingLabel: '2nd Inversion',
                bassNote: secondInvNotes[0]
            });
        }
        
        if (baseNotes.length >= 4) {
            // Third inversion (7th in bass) for 7th chords
            const thirdInvNotes = this.invertChord(baseNotes, 3);
            voicings.push({
                fullName: `${chord.fullName}/7`,
                notes: thirdInvNotes,
                voicingType: 'third',
                voicingLabel: '3rd Inversion',
                bassNote: thirdInvNotes[0]
            });
        }
        
        // Add extended voicings if chord supports them
        if (chordType.includes('7') || chordType.includes('9') || chordType.includes('11') || chordType.includes('13')) {
            // Drop 2 voicing (drop the 2nd highest note an octave)
            if (baseNotes.length >= 4) {
                const drop2Notes = this.createDrop2Voicing(baseNotes);
                voicings.push({
                    fullName: `${chord.fullName} (Drop 2)`,
                    notes: drop2Notes,
                    voicingType: 'drop2',
                    voicingLabel: 'Drop 2',
                    bassNote: drop2Notes[0]
                });
            }
            
            // Drop 3 voicing (drop the 3rd highest note an octave)
            if (baseNotes.length >= 4) {
                const drop3Notes = this.createDrop3Voicing(baseNotes);
                voicings.push({
                    fullName: `${chord.fullName} (Drop 3)`,
                    notes: drop3Notes,
                    voicingType: 'drop3',
                    voicingLabel: 'Drop 3',
                    bassNote: drop3Notes[0]
                });
            }
        }
        
        // Add rootless voicings for jazz chords
        if (chordType.includes('7') && !chordType.includes('maj7')) {
            const rootlessNotes = baseNotes.slice(1); // Remove root
            if (rootlessNotes.length >= 3) {
                voicings.push({
                    fullName: `${chord.fullName} (Rootless)`,
                    notes: rootlessNotes,
                    voicingType: 'rootless',
                    voicingLabel: 'Rootless',
                    bassNote: rootlessNotes[0]
                });
            }
        }
        
        return voicings;
    }

    /**
     * Invert a chord by moving notes to different octaves
     */
    invertChord(notes, inversion) {
        if (!notes || notes.length < 2 || inversion <= 0) return notes;
        
        const inverted = [...notes];
        for (let i = 0; i < inversion && i < notes.length; i++) {
            const note = inverted.shift();
            inverted.push(note); // Move to end (conceptually higher octave)
        }
        return inverted;
    }

    /**
     * Create Drop 2 voicing (drop 2nd highest note an octave)
     */
    createDrop2Voicing(notes) {
        if (notes.length < 4) return notes;
        const voicing = [...notes];
        const secondHighest = voicing.splice(-2, 1)[0]; // Remove 2nd from top
        voicing.unshift(secondHighest); // Add to bottom (lower octave)
        return voicing;
    }

    /**
     * Create Drop 3 voicing (drop 3rd highest note an octave)
     */
    createDrop3Voicing(notes) {
        if (notes.length < 4) return notes;
        const voicing = [...notes];
        const thirdHighest = voicing.splice(-3, 1)[0]; // Remove 3rd from top
        voicing.unshift(thirdHighest); // Add to bottom (lower octave)
        return voicing;
    }

    /**
     * Get functional harmony tags for a degree
     */
    getFunctionalHarmonyTags(degree, scale) {
        const tags = [];
        
        if (scale === 'major' || scale === 'ionian') {
            if (degree === 1) tags.push('tonic');
            if (degree === 2) tags.push('predominant', 'supertonic');
            if (degree === 3) tags.push('tonic');
            if (degree === 4) tags.push('predominant', 'subdominant');
            if (degree === 5) tags.push('dominant');
            if (degree === 6) tags.push('tonic', 'submediant');
            if (degree === 7) tags.push('dominant', 'leading-tone');
        } else if (scale === 'minor' || scale === 'aeolian') {
            if (degree === 1) tags.push('tonic');
            if (degree === 2) tags.push('predominant');
            if (degree === 3) tags.push('tonic');
            if (degree === 4) tags.push('predominant');
            if (degree === 5) tags.push('dominant');
            if (degree === 6) tags.push('tonic');
            if (degree === 7) tags.push('dominant');
        }

        return tags;
    }

    /**
     * Generate all possible substitutions for a chord
     * Research-based from: Levine's Jazz Theory, Nettles & Graf, Berklee harmony curriculum
     */
    generateSubstitutions(chord) {
        const subs = [];
        const degree = chord.degree;
        const key = this.state.currentKey;
        const isMajorContext = this.state.currentScale.includes('major') || this.state.currentScale === 'ionian';
        
        // DOMINANT FUNCTION SUBSTITUTIONS (most important harmonically)
        if (chord.functions.includes('dominant')) {
            // 1a. Tritone substitution (bII7) - Levine p.264
            const tritoneRoot = this.noteFromInterval(chord.root, 6);
            if (tritoneRoot) {
                subs.push({
                    type: 'tritone_sub',
                    root: tritoneRoot,
                    chordType: '7',
                    fullName: `${tritoneRoot}7`,
                    label: `♭II7 (tritone)`,
                    angle: -45,
                    grade: 'excellent',
                    family: 'dominant',
                    voiceLeading: 'descending chromatic',
                    description: `Tritone substitution - shares guide tones with ${chord.fullName}`
                });
            }

            // 1b. Backdoor progression (♭VII7 → I) - Levine p.269
            if (degree === 5) { // V chord specifically
                const backdoorRoot = this.noteFromInterval(this.state.currentKey, -2); // whole step below tonic
                if (backdoorRoot) {
                    subs.push({
                        type: 'backdoor',
                        root: backdoorRoot,
                        chordType: '7',
                        fullName: `${backdoorRoot}7`,
                        label: `♭VII7 (backdoor)`,
                        angle: -60,
                        grade: 'excellent',
                        family: 'dominant',
                        voiceLeading: 'plagal motion',
                        description: 'Backdoor dominant (subdominant function + ♭7→3 resolution)'
                    });
                }
            }

            // 1c. ii-V package (add ii before V)
            const iiRoot = this.noteFromInterval(chord.root, 2);
            if (iiRoot) {
                subs.push({
                    type: 'ii_v_setup',
                    root: iiRoot,
                    chordType: 'm7',
                    fullName: `${iiRoot}m7`,
                    label: `ii-V package`,
                    angle: 165,
                    grade: 'perfect',
                    family: 'dominant',
                    voiceLeading: 'circle of 5ths',
                    description: 'Add ii-V approach for stronger resolution'
                });
            }

            // 1d. Diminished passing chord (approach from half-step below)
            const dimRoot = this.noteFromInterval(chord.root, 1);
            if (dimRoot) {
                subs.push({
                    type: 'diminished_approach',
                    root: dimRoot,
                    chordType: 'dim7',
                    fullName: `${dimRoot}°7`,
                    label: `dim7 approach`,
                    angle: -30,
                    grade: 'good',
                    family: 'dominant',
                    voiceLeading: 'chromatic ascent',
                    description: 'Diminished approach chord (fully diminished)'
                });
            }
        }

        // SECONDARY DOMINANTS - any chord can be tonicized
        if (degree !== 5) {
            const secDomRoot = this.noteFromInterval(chord.root, 7);
            if (secDomRoot) {
                subs.push({
                    type: 'secondary_dominant',
                    root: secDomRoot,
                    chordType: '7',
                    fullName: `${secDomRoot}7`,
                    label: `V/${degree}`,
                    angle: -90,
                    grade: 'excellent',
                    family: 'secondary',
                    voiceLeading: 'authentic cadence',
                    description: `Tonicize ${chord.fullName} (secondary dominant)`
                });

                // Extended: Add ii/degree for full ii-V/degree
                const iiOfDegreeRoot = this.noteFromInterval(chord.root, 2);
                if (iiOfDegreeRoot) {
                    subs.push({
                        type: 'secondary_ii_v',
                        root: iiOfDegreeRoot,
                        chordType: 'm7',
                        fullName: `${iiOfDegreeRoot}m7`,
                        label: `ii-V/${degree}`,
                        angle: -75,
                        grade: 'excellent',
                        family: 'secondary',
                        voiceLeading: 'two-step resolution',
                        description: `Full ii-V turnaround to ${chord.fullName}`
                    });
                }
            }
        }

        // MODAL INTERCHANGE - Nettles & Graf p.157-180
        const modalSubs = this.getModalInterchangeOptions(chord, degree, isMajorContext);
        modalSubs.forEach(sub => subs.push(sub));

        // CHROMATIC MEDIANTS - Kostka & Payne "Tonal Harmony" p.495
        const mediantSubs = this.getChromaticMediantsFor(chord);
        mediantSubs.forEach(sub => subs.push(sub));

        // DECEPTIVE RESOLUTIONS - when resolving to tonic
        if (chord.functions.includes('tonic')) {
            const deceptiveRoot = this.noteFromInterval(chord.root, -3); // down a third (vi in major)
            if (deceptiveRoot) {
                subs.push({
                    type: 'deceptive',
                    root: deceptiveRoot,
                    chordType: isMajorContext ? 'm7' : 'maj7',
                    fullName: `${deceptiveRoot}${isMajorContext ? 'm7' : 'maj7'}`,
                    label: 'deceptive (vi)',
                    angle: 135,
                    grade: 'excellent',
                    family: 'tonic',
                    voiceLeading: 'deceptive cadence',
                    description: 'Deceptive resolution (vi substitutes for I)'
                });
            }
        }

        // RELATIVE CHORDS - share 2 common tones
        const relativeInterval = isMajorContext ? -3 : 3;
        const relativeRoot = this.noteFromInterval(chord.root, relativeInterval);
        if (relativeRoot) {
            const relType = isMajorContext ? 'm7' : 'maj7';
            subs.push({
                type: 'relative',
                root: relativeRoot,
                chordType: relType,
                fullName: `${relativeRoot}${relType}`,
                label: 'relative',
                angle: 90,
                grade: 'perfect',
                family: 'tonic',
                voiceLeading: 'common-tone shift',
                description: `Relative ${relType.includes('m') ? 'minor' : 'major'} (2 common tones)`
            });
        }

        // CONTAINER CHORDS - extensions and alterations
        // In exhaustive mode, include ALL container chords; otherwise just top candidates
        const containers = this.findContainerChords(chord.notes, this.state.exhaustiveMode);
        this._log('containers', `[generateSubstitutions] containers=${containers.length} exhaustive=${this.state.exhaustiveMode}`);
        containers.forEach((container, idx) => {
            subs.push({
                ...container,
                type: 'container',
                angle: 45 + (idx * 25),
                label: 'extend',
                family: 'extension'
            });
        });

        // PARALLEL CHORD - same root, different quality
        const parallelQuality = chord.chordType.includes('m') ? 'maj7' : 'm7';
        subs.push({
            type: 'parallel',
            root: chord.root,
            chordType: parallelQuality,
            fullName: `${chord.root}${parallelQuality}`,
            label: 'parallel mode',
            angle: -150,
            grade: 'good',
            family: 'modal',
            voiceLeading: 'pivot modulation',
            description: 'Parallel major/minor (same root, different quality)'
        });

        this._log('radial', `[generateSubstitutions] total=${subs.length}`);
        // Sort by family and grade for better clustering
        const sorted = this.sortSubstitutionsByHarmonicDistance(subs, chord);
        // Add tier and color properties to all substitutions
        return sorted.map(sub => this.enrichSubstitutionWithGrading(sub));
    }

    /**
     * Enrich a substitution object with tier number and color from grading system
     */
    enrichSubstitutionWithGrading(sub) {
        // Skip if already has tier and color (e.g., container chords)
        if (sub.tier !== undefined && sub.color) return sub;
        
        // Convert grade string to tier number
        let tier;
        if (sub.grade === 'perfect') tier = 4;
        else if (sub.grade === 'excellent') tier = 3;
        else if (sub.grade === 'good') tier = 2;
        else if (sub.grade === 'fair') tier = 1;
        else tier = 0; // experimental/default
        
        const tierInfo = this.musicTheory.getGradingTierInfo(tier);
        
        // Enhanced grading information for substitutions
        return {
            ...sub,
            tier,
            color: tierInfo.color,
            grade: tierInfo.label, // Replace string grade with tier label
            gradingExplanation: this.generateGradingExplanation(sub, tier),
            gradingShort: tierInfo.short,
            gradingName: tierInfo.name
        };
    }

    /**
     * Get grading information for the original chord being substituted
     */
    getOriginalChordGrading(chord) {
        if (!chord || !chord.degree) return null;
        
        try {
            // Use the music theory engine to get grading for this chord in current context
            const context = {
                key: this.state.currentKey,
                scale: this.state.currentScale,
                degree: chord.degree,
                chordType: chord.chordType
            };
            
            // Calculate grading tier based on functional context
            let tier = 2; // default
            const mode = this.musicTheory.gradingMode || 'functional';
            
            if (mode === 'functional') {
                // Grade based on functional importance
                if (chord.functions.includes('tonic')) tier = 4;
                else if (chord.functions.includes('dominant')) tier = 4;
                else if (chord.functions.includes('predominant')) tier = 3;
                else tier = 2;
            } else if (mode === 'emotional') {
                // Grade based on emotional stability
                if ([1, 3, 6].includes(chord.degree)) tier = 4; // stable
                else if ([4, 5].includes(chord.degree)) tier = 3; // moderately stable
                else tier = 2; // less stable
            } else if (mode === 'color') {
                // Grade based on harmonic color
                if (chord.chordType.includes('7') || chord.chordType.includes('9')) tier = 4;
                else if (chord.chordType.includes('m') || chord.chordType.includes('dim')) tier = 3;
                else tier = 2;
            }
            
            const tierInfo = this.musicTheory.getGradingTierInfo(tier);
            return {
                tier,
                color: tierInfo.color,
                short: tierInfo.short,
                name: tierInfo.name,
                label: tierInfo.label
            };
        } catch (e) {
            console.warn('Failed to get original chord grading:', e);
            return null;
        }
    }

    /**
     * Generate grading explanation for a substitution based on current grading mode
     */
    generateGradingExplanation(sub, tier) {
        const mode = this.musicTheory.gradingMode || 'functional';
        const tierInfo = this.musicTheory.getGradingTierInfo(tier);
        
        let explanation = `${tierInfo.name} (${tierInfo.short}) - `;
        
        if (mode === 'functional') {
            switch (sub.type) {
                case 'secondary_dominant':
                    explanation += 'Strong functional relationship - creates temporary tonicization';
                    break;
                case 'tritone_sub':
                    explanation += 'Shares guide tones with original - smooth voice leading';
                    break;
                case 'modal_interchange':
                    explanation += 'Borrowed from parallel mode - adds harmonic color';
                    break;
                case 'container':
                    explanation += 'Contains all original notes - harmonic extension';
                    break;
                case 'relative':
                    explanation += 'Shares common tones - maintains harmonic function';
                    break;
                default:
                    explanation += `${sub.family} substitution with ${sub.voiceLeading || 'smooth'} voice leading`;
            }
        } else if (mode === 'emotional') {
            switch (tier) {
                case 4:
                    explanation += 'Maintains emotional character while adding sophistication';
                    break;
                case 3:
                    explanation += 'Enhances emotional expression with harmonic color';
                    break;
                case 2:
                    explanation += 'Provides moderate emotional contrast';
                    break;
                case 1:
                    explanation += 'Creates subtle emotional variation';
                    break;
                default:
                    explanation += 'Experimental emotional effect';
            }
        } else if (mode === 'color') {
            switch (tier) {
                case 4:
                    explanation += 'Perfect harmonic color match - maintains tonal center';
                    break;
                case 3:
                    explanation += 'Excellent color enhancement - adds harmonic richness';
                    break;
                case 2:
                    explanation += 'Good color variation - moderate harmonic departure';
                    break;
                case 1:
                    explanation += 'Subtle color change - mild harmonic alteration';
                    break;
                default:
                    explanation += 'Experimental color effect - significant harmonic departure';
            }
        }
        
        return explanation;
    }

    /**
     * Modal interchange options based on parallel modes
     * Research: Nettles & Graf "Chord Scale Theory" p.157-180
     */
    getModalInterchangeOptions(chord, degree, isMajorContext) {
        const subs = [];

        if (isMajorContext) {
            // Borrow from parallel minor (most common)
            if (degree === 4) {
                subs.push({
                    type: 'modal_interchange',
                    root: chord.root,
                    chordType: 'm7',
                    fullName: `${chord.root}m7`,
                    label: 'iv (from minor)',
                    angle: -120,
                    grade: 'excellent',
                    family: 'modal',
                    voiceLeading: 'plagal motion',
                    description: 'Borrowed from parallel minor (subdominant minor)'
                });
            }

            // bII (Neapolitan) - classical substitution
            if (degree === 2) {
                const napRoot = this.noteFromInterval(this.state.currentKey, 1); // half step above tonic
                subs.push({
                    type: 'neapolitan',
                    root: napRoot,
                    chordType: 'maj7',
                    fullName: `${napRoot}maj7`,
                    label: '♭II (Neapolitan)',
                    angle: -105,
                    grade: 'good',
                    family: 'modal',
                    voiceLeading: 'chromatic descending',
                    description: 'Neapolitan sixth chord (bII from Phrygian)'
                });
            }

            // bVII (from Mixolydian) - rock/blues substitution
            if (degree === 7) {
                subs.push({
                    type: 'modal_interchange',
                    root: chord.root,
                    chordType: '7',
                    fullName: `${chord.root}7`,
                    label: '♭VII7 (Mixolydian)',
                    angle: -135,
                    grade: 'excellent',
                    family: 'modal',
                    voiceLeading: 'subtonic descent',
                    description: 'From Mixolydian mode (rock/blues flavor)'
                });
            }
        }

        return subs;
    }

    /**
     * Chromatic mediant relationships
     * Research: Kostka & Payne "Tonal Harmony", Cohn "Neo-Riemannian Operations"
     */
    getChromaticMediantsFor(chord) {
        const subs = [];
        const root = chord.root;

        // Upper chromatic mediant (up minor 3rd, different quality)
        const upperRoot = this.noteFromInterval(root, 3);
        if (upperRoot) {
            const upperType = chord.chordType.includes('m') ? 'maj7' : 'm7';
            subs.push({
                type: 'chromatic_mediant',
                root: upperRoot,
                chordType: upperType,
                fullName: `${upperRoot}${upperType}`,
                label: 'upper mediant',
                angle: 110,
                grade: 'good',
                family: 'mediant',
                voiceLeading: 'chromatic mediant',
                description: 'Upper chromatic mediant (smooth voice leading)'
            });
        }

        // Lower chromatic mediant (down minor 3rd, different quality)
        const lowerRoot = this.noteFromInterval(root, -3);
        if (lowerRoot) {
            const lowerType = chord.chordType.includes('m') ? 'maj7' : 'm7';
            subs.push({
                type: 'chromatic_mediant',
                root: lowerRoot,
                chordType: lowerType,
                fullName: `${lowerRoot}${lowerType}`,
                label: 'lower mediant',
                angle: 125,
                grade: 'good',
                family: 'mediant',
                voiceLeading: 'chromatic mediant',
                description: 'Lower chromatic mediant (neo-Riemannian)'
            });
        }

        return subs;
    }

    /**
     * Sort substitutions by harmonic distance for optimal radial positioning
     * Uses voice-leading distance + functional similarity + grading tier
     */
    sortSubstitutionsByHarmonicDistance(subs, originalChord) {
        // Family priority (closer = more related)
        const familyPriority = {
            'dominant': 1,
            'secondary': 2,
            'tonic': 3,
            'modal': 4,
            'extension': 5,
            'mediant': 6
        };

        // Calculate harmonic distance for each sub
        subs.forEach(sub => {
            let distance = 0;
            
            // Factor 1: Family similarity
            distance += (familyPriority[sub.family] || 7) * 10;
            
            // Factor 2: Grading tier (higher tier = closer, more prominent)
            const tier = sub.tier !== undefined ? sub.tier : 2; // default to middle tier
            distance -= (tier * 8); // Higher tier gets lower distance (closer)
            
            // Factor 3: Grade quality (better = closer) - legacy support
            if (sub.grade === 'perfect') distance -= 15;
            else if (sub.grade === 'excellent') distance -= 10;
            else if (sub.grade === 'good') distance -= 5;
            
            // Factor 4: Common tones with original
            const commonTones = this.countCommonTones(originalChord.notes, sub.notes || []);
            distance -= commonTones * 5;
            
            // Factor 5: Grading mode specific adjustments
            const mode = this.musicTheory.gradingMode || 'functional';
            if (mode === 'functional') {
                // Prioritize functional relationships
                if (['secondary_dominant', 'tritone_sub', 'ii_v_setup'].includes(sub.type)) {
                    distance -= 12;
                }
            } else if (mode === 'emotional') {
                // Prioritize emotional consistency
                if (['relative', 'parallel', 'modal_interchange'].includes(sub.type)) {
                    distance -= 10;
                }
            } else if (mode === 'color') {
                // Prioritize harmonic color
                if (['container', 'chromatic_mediant', 'modal_interchange'].includes(sub.type)) {
                    distance -= 8;
                }
            }
            
            sub.harmonicDistance = distance;
        });

        return subs.sort((a, b) => a.harmonicDistance - b.harmonicDistance);
    }

    /**
     * Count common tones between two chord note arrays
     */
    countCommonTones(notes1, notes2) {
        if (!notes1 || !notes2) return 0;
        return notes1.filter(n => notes2.includes(n)).length;
    }

    /**
     * Find container chords that include all notes from the target chord
     * @param {Array} targetNotes - notes to be contained
     * @param {boolean} exhaustive - if true, return ALL containers; else return top 3
     */
    findContainerChords(targetNotes, exhaustive = false) {
        const containers = [];
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale);
        
        this._log('containers', `[findContainerChords] targets=${targetNotes.length} exhaustive=${exhaustive}`);
        this._log('containers', `[findContainerChords] scale`, scaleNotes);
        
        // Use engine's container chord finder
        const allContainers = this.musicTheory.findAllContainerChords(targetNotes, scaleNotes);
        this._log('containers', `[findContainerChords] engineReturned=${allContainers.length}`);
        
        // Grade and filter
        allContainers.forEach(chord => {
            const grade = this.gradeContainerChord(chord, targetNotes);
            if (grade) {
                containers.push({
                    ...chord,
                    grade: grade.label,
                    tier: grade.tier,
                    color: grade.color
                });
            }
        });

        this._log('containers', `[findContainerChords] afterGrading=${containers.length}`);
        
        // Sort by grade
        const gradeOrder = { perfect: 3, excellent: 2, good: 1 };
        containers.sort((a, b) => (gradeOrder[b.grade] || 0) - (gradeOrder[a.grade] || 0));
        
        // NEW: Group containers by root for better organization
        const grouped = this._groupContainersByRoot(containers);
        
        // Return all if exhaustive, else return grouped representatives
        if (exhaustive) {
            return containers;
        } else {
            // Show 1 representative per root group (top 3-5 roots)
            return this._getContainerRepresentatives(grouped, 5);
        }
    }

    /**
     * Group container chords by root note
     * @returns {Map} - Map of root -> array of chords
     */
    _groupContainersByRoot(containers) {
        const grouped = new Map();
        containers.forEach(c => {
            if (!grouped.has(c.root)) {
                grouped.set(c.root, []);
            }
            grouped.get(c.root).push(c);
        });
        return grouped;
    }

    /**
     * Get representative containers (1 per root group)
     * @param {Map} grouped - Map of root -> chords
     * @param {number} maxRoots - Max number of root groups to show
     * @returns {array} - Array of representative container objects
     */
    _getContainerRepresentatives(grouped, maxRoots = 5) {
        const representatives = [];
        let count = 0;
        
        for (const [root, chords] of grouped.entries()) {
            if (count >= maxRoots) break;
            
            // Use the highest-graded chord as representative
            const best = chords[0];
            
            // Mark as expandable group if multiple variants
            if (chords.length > 1) {
                representatives.push({
                    ...best,
                    _isGroupRep: true,
                    _groupSize: chords.length,
                    _groupMembers: chords,
                    label: `${root} (${chords.length} opts)`,
                    fullName: `${root} extensions`
                });
            } else {
                representatives.push(best);
            }
            
            count++;
        }
        
        return representatives;
    }

    /**
     * Grade a container chord based on how well it fits
     */
    gradeContainerChord(chord, targetNotes) {
        const chordNotes = chord.notes || [];
        const extra = chordNotes.filter(n => !targetNotes.includes(n));
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale);
        const inScale = extra.every(n => scaleNotes.includes(n));

        if (extra.length === 0) {
            // Perfect match - tier 4
            const tierInfo = this.musicTheory.getGradingTierInfo(4);
            return { class: '', label: tierInfo.label, tier: 4, color: tierInfo.color };
        } else if (extra.length === 1 && inScale) {
            // Excellent - tier 3
            const tierInfo = this.musicTheory.getGradingTierInfo(3);
            return { class: '', label: tierInfo.label, tier: 3, color: tierInfo.color };
        } else if (extra.length <= 2 && inScale) {
            // Good - tier 2
            const tierInfo = this.musicTheory.getGradingTierInfo(2);
            return { class: '', label: tierInfo.label, tier: 2, color: tierInfo.color };
        }
        return null;
    }

    /**
     * Calculate note from interval (semitones)
     */
    noteFromInterval(root, semitones) {
        const rootValue = this.musicTheory.noteValues[root];
        if (rootValue === undefined) return null;
        const targetValue = (rootValue + semitones) % 12;
        return this.musicTheory.chromaticNotes[targetValue];
    }

    /**
     * Open radial substitution menu
     */
    openRadialMenu(chord, event, seqIndex = null) {
        this._log('radial', '[openRadialMenu]', chord.fullName, 'exhaustive=', this.state.exhaustiveMode);
        this.state.selectedChord = chord;
        this.state.selectedSeqIndex = (typeof seqIndex === 'number') ? seqIndex : null;
        this.state.radialMenuOpen = true;
        
        // Compute radial menu position: either center of viewport or click target
        if (this.radialCenterOnOpen) {
            // Center in viewport (game-like behavior)
            const x = Math.round(window.innerWidth / 2);
            const y = Math.round(window.innerHeight / 2);
            this.state.radialMenuPosition = { x, y };
        } else {
            // Get click position
            const rect = event.target.getBoundingClientRect();
            this.state.radialMenuPosition = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }

        // Generate substitutions
        const allSubs = this.generateSubstitutions(chord);
        
        // Apply filter based on current filter mode
        this.state.substitutions = this._applyRadialFilter(allSubs);
        this._log('radial', '[openRadialMenu] substitutions', this.state.substitutions.length, 'filter=', this.state.radialFilterMode);
        
        this.renderRadialMenu();
        this.emit('radialMenuOpened', { chord, substitutions: this.state.substitutions });
    }

    /**
     * Apply filter to substitutions based on current filter mode
     * @param {array} subs - All substitutions
     * @returns {array} - Filtered substitutions
     */
    _applyRadialFilter(subs) {
        const mode = this.state.radialFilterMode;
        
        if (mode === 'all') {
            return subs;
        }
        
        const scaleNotes = this.musicTheory.getScaleNotes(this.state.currentKey, this.state.currentScale);
        
        if (mode === 'diatonic') {
            // Only show in-scale substitutions
            return subs.filter(sub => {
                const notes = sub.notes || [];
                return notes.every(n => scaleNotes.includes(n));
            });
        }
        
        if (mode === 'color') {
            // Prioritize extensions and colorful voicings
            return subs.filter(sub => {
                return sub.type === 'container' || 
                       sub.chordType.includes('9') || 
                       sub.chordType.includes('11') || 
                       sub.chordType.includes('13') ||
                       sub.chordType.includes('add');
            });
        }
        
        if (mode === 'chromatic') {
            // Show altered and borrowed chords
            return subs.filter(sub => {
                return sub.type === 'tritone_sub' ||
                       sub.type === 'modal_interchange' ||
                       sub.type === 'chromatic_mediant' ||
                       sub.type === 'neapolitan' ||
                       (sub.notes && sub.notes.some(n => !scaleNotes.includes(n)));
            });
        }
        
        if (mode === 'containers') {
            // Only container chords
            return subs.filter(sub => sub.type === 'container' || sub.type === 'container_root_cluster');
        }
        
        if (mode === 'surprise') {
            // Random exotic substitutions (tier 4-5)
            const exotic = subs.filter(sub => {
                const tier = this._calculateTier(sub);
                return tier >= 4;
            });
            // Return random 5-8 from exotic pool
            const count = Math.min(8, Math.max(5, exotic.length));
            return this._shuffleArray(exotic).slice(0, count);
        }
        
        return subs;
    }

    /**
     * Set radial filter mode
     * @param {string} mode - 'all' | 'diatonic' | 'color' | 'chromatic' | 'surprise' | 'containers'
     */
    setRadialFilterMode(mode) {
        const validModes = ['all', 'diatonic', 'color', 'chromatic', 'surprise', 'containers'];
        if (validModes.includes(mode)) {
            this.state.radialFilterMode = mode;
            
            // If menu is open, regenerate filtered substitutions
            if (this.state.radialMenuOpen && this.state.selectedChord) {
                const allSubs = this.generateSubstitutions(this.state.selectedChord);
                this.state.substitutions = this._applyRadialFilter(allSubs);
                this.renderRadialMenu();
            }
        }
    }

    /** Shuffle array (Fisher-Yates) */
    _shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Close radial menu
     */
    closeRadialMenu() {
        this.state.radialMenuOpen = false;
        this.state.selectedChord = null;
        if (this.radialMenu) {
            this.radialMenu.remove();
            this.radialMenu = null;
        }
        // Remove overlay if present (fixes lingering blur when selection closes menu)
        if (this.radialOverlay) {
            try {
                this.radialOverlay.remove();
            } catch (e) {
                // ignore if already removed
            }
            this.radialOverlay = null;
        }
        this.emit('radialMenuClosed');
    }

    /**
     * Select a substitution from the radial menu
     */
    selectSubstitution(sub) {
        // Replace the selected chord in the progression with the chosen substitution
        try {
            this.replaceChordInProgression(this.state.selectedChord, sub, this.state.selectedSeqIndex);
        } catch (err) {
            console.warn('Error replacing chord in progression:', err);
        }

        // Close the menu and emit event with both original and applied substitution
        this.closeRadialMenu();
        this.emit('substitutionSelected', {
            original: this.state.selectedChord,
            substitution: sub
        });
    }

    /**
     * Replace the selected chord in the progression.
     * If the substitution maps to a diatonic chord in the current scale, replace the degree.
     * Otherwise record an overlay for that progression slot so UI shows the substitution.
     */
    replaceChordInProgression(originalChord, substitution, seqIndex = null) {
        if (!originalChord) return;
        // Ensure scale chords are up-to-date
        this.generateScaleChords();

        const seq = this.ensureProgressionSequence();
        const match = this.state.scaleChords.find(sc => sc.root === substitution.root && sc.chordType === substitution.chordType);

        if (typeof seqIndex === 'number' && seq[seqIndex]) {
            if (match) {
                // Replace sequence entry at this index with diatonic match
                seq[seqIndex] = { type: 'degree', degree: match.degree };
                this.state.progressionSequence = seq;
                // Sync progressionDegrees from sequence
                this.state.progressionDegrees = seq.filter(e => e.type === 'degree').map(e => e.degree);
                // Remove overlays tied to this seqIndex
                this.state.progressionOverlays = (this.state.progressionOverlays || []).filter(o => o.seqIndex !== seqIndex);
                // Clear any manual preview tokens so regenerated tokens reflect this change
                this.state.previewManualTokens = null;
                this.state.previewManualRawTokens = null;
                this.render();
                // Update NumberGenerator display tokens
                try {
                    if (this.numberGenerator && this.numberGenerator.setDisplayTokens) {
                        const seqTokens = this.buildSequenceRomanTokens();
                        // Ensure the NumberGenerator re-renders its manual input box and emits change
                        this.numberGenerator.setDisplayTokens(seqTokens, { rawTokens: seqTokens, render: true, emit: true, source: 'chord-explorer' });
                    }
                } catch(e){}
                // Notify listeners that progression sequence changed
                this.emit('progressionSequenceChanged', { sequence: this.ensureProgressionSequence() });
                return;
            } else {
                // Non-diatonic replacement: record overlay at this sequence index
                const romanLabel = this.computeRomanLabelForSubstitution(originalChord, substitution, seqIndex);
                const overlays = this.state.progressionOverlays || [];
                const existingIndex = overlays.findIndex(o => o.seqIndex === seqIndex);
                const overlayEntry = { seqIndex, degree: originalChord.degree, substitution, romanLabel };
                if (existingIndex !== -1) overlays[existingIndex] = overlayEntry; else overlays.push(overlayEntry);
                this.state.progressionOverlays = overlays;
                // Clear any manual preview tokens so regenerated tokens reflect overlay
                this.state.previewManualTokens = null;
                this.state.previewManualRawTokens = null;
                this.render();
                try {
                    if (this.numberGenerator && this.numberGenerator.setDisplayTokens) {
                        const seqTokens = this.buildSequenceRomanTokens();
                        this.numberGenerator.setDisplayTokens(seqTokens, { rawTokens: seqTokens, render: true, emit: true, source: 'chord-explorer' });
                    }
                } catch(e){}
                // Notify listeners that progression sequence changed
                this.emit('progressionSequenceChanged', { sequence: this.ensureProgressionSequence() });
                return;
            }
        }

        // Fallback (legacy degree-based replacement)
        const prog = this.state.progressionDegrees || [];
        const idx = prog.indexOf(originalChord.degree);
        if (idx !== -1 && match) {
            prog[idx] = match.degree;
            this.state.progressionDegrees = prog;
            this.state.progressionOverlays = (this.state.progressionOverlays || []).filter(o => o.degree !== originalChord.degree);
            this.state.previewManualTokens = null;
            this.state.previewManualRawTokens = null;
            this.render();
                try { if (this.numberGenerator && this.numberGenerator.setDisplayTokens) { const seqTokens = this.buildSequenceRomanTokens(); this.numberGenerator.setDisplayTokens(seqTokens, { rawTokens: seqTokens, render: true, emit: true, source: 'chord-explorer' }); } } catch(e){}
                // Notify listeners that progression sequence changed
                this.emit('progressionSequenceChanged', { sequence: this.ensureProgressionSequence() });
            return;
        }

        const overlays = this.state.progressionOverlays || [];
        const existingIndex = overlays.findIndex(o => o.degree === originalChord.degree);
        const romanLabel = this.computeRomanLabelForSubstitution(originalChord, substitution);
        const overlayEntry = { degree: originalChord.degree, substitution, romanLabel };
        if (existingIndex !== -1) overlays[existingIndex] = overlayEntry; else overlays.push(overlayEntry);
        this.state.progressionOverlays = overlays;
        this.state.previewManualTokens = null;
        this.state.previewManualRawTokens = null;
        this.render();
        try {
            if (this.numberGenerator && this.numberGenerator.setDisplayTokens) {
                const seqTokens = this.buildSequenceRomanTokens();
                this.numberGenerator.setDisplayTokens(seqTokens, { rawTokens: seqTokens, render: true, emit: true, source: 'chord-explorer' });
            }
        } catch(e){}
        // Notify listeners that progression sequence changed
        this.emit('progressionSequenceChanged', { sequence: this.ensureProgressionSequence() });
    }

    /**
     * Render the main chord grid
     */
    render() {
        if (!this.containerElement) {
            this.createContainerElement();
        }

        this.generateScaleChords();

        // Clear and rebuild
        this.containerElement.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'chord-explorer-header';
        header.innerHTML = `
            <h3>Chord Explorer: ${this.state.currentKey} ${this.state.currentScale}</h3>
            <p class="hint">Click highlighted chords to explore substitutions</p>
        `;
        // Exhaustive toggle control (shows all substitutions when enabled)
        const exhaustiveLabel = document.createElement('label');
        exhaustiveLabel.className = 'exhaustive-toggle';
        exhaustiveLabel.title = 'Toggle exhaustive substitution display (show all substitutions)';
        const exhaustiveCheckbox = document.createElement('input');
        exhaustiveCheckbox.type = 'checkbox';
        exhaustiveCheckbox.checked = !!this.state.exhaustiveMode;
        exhaustiveCheckbox.addEventListener('change', (e) => {
            this.setExhaustiveMode(e.target.checked);
            // Re-render to reflect change immediately
            this.render();
        });
        exhaustiveLabel.appendChild(exhaustiveCheckbox);
        exhaustiveLabel.appendChild(document.createTextNode(' Exhaustive'));
        header.appendChild(exhaustiveLabel);

        // Layout mode selector
        const layoutSelect = document.createElement('select');
        layoutSelect.className = 'layout-mode-select';
        ['auto','quadrant'].forEach(mode => {
            const opt = document.createElement('option');
            opt.value = mode; opt.textContent = `Layout: ${mode}`; if (this.state.layoutMode === mode) opt.selected = true; layoutSelect.appendChild(opt);
        });
        layoutSelect.addEventListener('change', (e) => {
            this.setLayoutMode(e.target.value);
        });
        const layoutWrapper = document.createElement('label');
        layoutWrapper.className = 'layout-mode-wrapper';
        layoutWrapper.appendChild(layoutSelect);
        header.appendChild(layoutWrapper);

        // Grading Key
        const gradingKey = document.createElement('div');
        gradingKey.style.cssText = 'margin-top:4px; font-size:0.75rem; display:flex; justify-content:center; gap:12px; flex-wrap:wrap; padding-top:4px; border-top:1px dashed var(--border-light);';
        [4, 3, 2].forEach(tier => {
             const info = this.musicTheory.getGradingTierInfo(tier);
             gradingKey.innerHTML += `<span style="color:${info.color}; font-weight:bold;">${info.short} ${info.name}</span>`;
        });
        header.appendChild(gradingKey);

        this.containerElement.appendChild(header);

        // Chord grid (ordered by sequence when available)
        const grid = document.createElement('div');
        grid.className = 'chord-explorer-grid';

        const hasSequence = Array.isArray(this.state.progressionDegrees) && this.state.progressionDegrees.length > 0;
        const seq = this.ensureProgressionSequence();

        if (!hasSequence) {
            // Fallback: show full diatonic grid in scale order
            this.state.scaleChords.forEach((ch) => {
                const card = this.createChordCard(ch, { seqIndex: null });
                grid.appendChild(card);
            });
            const hint = document.createElement('div');
            hint.className = 'pb-empty';
            hint.textContent = 'Generate a number sequence to show its chords here.';
            this.containerElement.appendChild(hint);
        } else if (seq && seq.length > 0) {
            // Generate progression chords with different voicings for duplicates
            const progressionChords = this.generateProgressionChords();
            
            progressionChords.forEach((chord, idx) => {
                if (chord) {
                    if (chord.isInserted) {
                        // Handle inserted substitutions
                        const diatMatch = this.state.scaleChords.find(sc => sc.root === chord.root) || null;
                        const displayRN = diatMatch ? this.toRomanNumeral(diatMatch.degree, chord.chordType)
                                                    : this.computeAccidentalRoman(chord.root, chord.chordType);
                        const card = this.createChordCard(chord, { seqIndex: idx, displayRN, isInserted: true });
                        grid.appendChild(card);
                    } else {
                        // Handle regular diatonic chords with voicing information
                        const card = this.createChordCard(chord, { seqIndex: idx });
                        grid.appendChild(card);
                    }
                }
            });
        } else {
            const empty = document.createElement('div');
            empty.className = 'pb-empty';
            empty.textContent = 'Sequence is empty.';
            this.containerElement.appendChild(empty);
        }

        this.containerElement.appendChild(grid);
    }

    /**
     * Create a chord card
     */
    createChordCard(chord, options = {}) {
        const seqIndex = Object.prototype.hasOwnProperty.call(options, 'seqIndex') ? options.seqIndex : null;
        const card = document.createElement('div');
        // If there's an overlay substitution for this degree, mark as substituted
        const overlay = this.findOverlayFor(seqIndex, chord ? chord.degree : null);
        const substituted = !!overlay;
        card.className = `chord-card ${chord.inProgression ? 'in-progression' : ''} ${substituted ? 'substituted' : ''}`;
        if (typeof chord.degree === 'number') card.dataset.degree = chord.degree;
        if (seqIndex !== null) card.dataset.seqIndex = String(seqIndex);

    const degreeLabel = document.createElement('div');
    degreeLabel.className = 'chord-degree';

    // Compute safe display strings with fallbacks to avoid undefined values
    let safeFullName = (overlay && overlay.substitution && (overlay.substitution.fullName || (overlay.substitution.root || overlay.substitution.chordType)))
        ? (overlay.substitution.fullName || String(overlay.substitution.root || overlay.substitution.chordType))
        : (chord && (chord.fullName || (chord.root || chord.chordType)) ? (chord.fullName || String(chord.root || chord.chordType)) : '—');
    // Guard against literal 'undefined' leaking into UI
    if (safeFullName == null || safeFullName === 'undefined') {
        if (overlay && overlay.substitution && (overlay.substitution.root || overlay.substitution.chordType)) {
            safeFullName = String(overlay.substitution.root || overlay.substitution.chordType);
        } else if (chord && (chord.root || chord.chordType)) {
            safeFullName = String(chord.root || chord.chordType);
        } else {
            safeFullName = '—';
        }
    }

    const safeDegreeText = (overlay && overlay.romanLabel)
        ? overlay.romanLabel
        : (options.displayRN || (typeof chord === 'object' && typeof chord.degree === 'number' ? this.toRomanNumeral(chord.degree, chord.chordType) : (chord && chord.root ? this.computeAccidentalRoman(chord.root, chord.chordType) : '')));

    degreeLabel.textContent = safeDegreeText || '';

    const nameLabel = document.createElement('div');
    nameLabel.className = 'chord-name';
    // Use the safe full name computed above
    nameLabel.textContent = safeFullName;
    
    // Add voicing indicator if this chord has voicing information
    if (chord.voicingLabel && chord.occurrenceIndex > 0) {
        const voicingIndicator = document.createElement('div');
        voicingIndicator.className = 'voicing-indicator';
        voicingIndicator.textContent = chord.voicingLabel;
        voicingIndicator.title = `${chord.voicingLabel} - Occurrence ${chord.occurrenceIndex + 1}`;
        nameLabel.appendChild(voicingIndicator);
    }

    // If we detected an unexpected missing name, log for debugging
    try {
        if (!safeFullName || safeFullName === 'undefined') {
            console.warn('[UnifiedChordExplorer] createChordCard: missing fullName for chord', { chord, overlay, options });
        }
    } catch (e) { /* swallow */ }

    // Runtime trace: log exactly what will be inserted into the DOM for audit
    try {
        this._log('sequence', '[render] createChordCard', { seqIndex, degreeText: degreeLabel.textContent, nameText: nameLabel.textContent, substituted: !!overlay });
    } catch (e) { /* non-fatal */ }

        const functionLabels = document.createElement('div');
        functionLabels.className = 'chord-functions';
        chord.functions.forEach(func => {
            const tag = document.createElement('span');
            tag.className = `function-tag ${func}`;
            tag.textContent = func;
            functionLabels.appendChild(tag);
        });

    // Visual priority: chord name first (more prominent), then degree
    card.appendChild(nameLabel);
    card.appendChild(degreeLabel);

        // Note indicator: show spelled root derived from manual tokens (e.g., bI -> B in key of C)
        try {
            const noteIndicator = document.createElement('div');
            noteIndicator.className = 'note-indicator';
            noteIndicator.textContent = this.computeNoteIndicatorText(seqIndex, chord, overlay);
            card.appendChild(noteIndicator);
        } catch (_) { /* non-fatal */ }

    // Then any function tags
    card.appendChild(functionLabels);

        // If substituted, add a small badge showing substitution type
        if (overlay) {
            const badge = document.createElement('div');
            badge.className = 'substitution-badge';
            badge.textContent = overlay.substitution.type.replace(/_/g, ' ');
            badge.title = overlay.substitution.fullName;
            card.appendChild(badge);
        }

        // Insert-plus controls (add passing chords before and after this chord)
        const plusLeft = document.createElement('button');
        plusLeft.className = 'insert-plus left';
        plusLeft.type = 'button';
        plusLeft.setAttribute('aria-label', `Insert a chord before ${safeFullName || this.toRomanNumeral(chord && chord.degree, chord && chord.chordType)}`);
        plusLeft.innerHTML = '+';
        plusLeft.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.add('plus-pressed');
            setTimeout(() => card.classList.remove('plus-pressed'), 400);
            // Default: open insertion radial (ask which chord to add BEFORE)
            this.emit('requestInsertPassingChord', { degree: chord.degree, position: 'before', seqIndex });
            this.openInsertionRadialMenu(chord.degree, 'before', plusLeft, seqIndex);
            // Shift-click (optional): quick-prepend this degree
            if (e.shiftKey) {
                this.appendDegreeToSequence(chord.degree, 'start');
            }
        });

        const plusRight = document.createElement('button');
        plusRight.className = 'insert-plus right';
        plusRight.type = 'button';
        plusRight.setAttribute('aria-label', `Insert a chord after ${safeFullName || this.toRomanNumeral(chord && chord.degree, chord && chord.chordType)}`);
        plusRight.innerHTML = '+';
        plusRight.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.add('plus-pressed');
            setTimeout(() => card.classList.remove('plus-pressed'), 400);
            // Default: open insertion radial (ask which chord to add AFTER)
            this.emit('requestInsertPassingChord', { degree: chord.degree, position: 'after', seqIndex });
            this.openInsertionRadialMenu(chord.degree, 'after', plusRight, seqIndex);
            // Shift-click (optional): quick-append this degree
            if (e.shiftKey) {
                this.appendDegreeToSequence(chord.degree, 'end');
            }
        });

        // Append left and right plus controls
        card.appendChild(plusLeft);
        card.appendChild(plusRight);

        // Click handler - only for progression chords
        if (chord.inProgression) {
            card.classList.add('clickable');
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openRadialMenu(chord, e, seqIndex);
            });
        }

        return card;
    }

    /**
     * Compute the display text for div.note-indicator beneath a chord card.
     * Preference rules:
     * 1) If manual tokens exist for this seqIndex, parse the token.
     *    - Roman with accidentals (e.g., bI, #IV): compute target pitch class from tonic and prefer a natural spelling when available.
     *    - Spelled root tokens (e.g., Db, F#maj7): use the explicit root.
     *    - Plain Roman (I, ii, V): use diatonic scale note for that degree.
     * 2) Fallback to chord.root when available.
     */
    computeNoteIndicatorText(seqIndex, chord, overlay) {
        try {
            const key = this.state.currentKey;
            const scale = this.state.currentScale;
            const nv = (this.musicTheory && this.musicTheory.noteValues) || {};

            // 0. If we already have an explicit root from a substitution or chord, trust that first.
            // This keeps note-indicator in sync with whatever the engine/speller decided, even if
            // NumberGenerator token indices drift relative to progressionSequence.
            if (overlay && overlay.substitution && overlay.substitution.root) {
                return String(overlay.substitution.root);
            }
            if (chord && chord.root) {
                return String(chord.root);
            }
            
            // Primary source: overlay Roman label (e.g., bI, #IV) when present.
            // This ensures chromatic degrees like bI map to the correct pitch even if
            // NumberGenerator's token arrays don't line up perfectly.
            let romanSource = null;
            if (overlay && overlay.romanLabel) {
                romanSource = String(overlay.romanLabel).trim();
            } else if (typeof seqIndex === 'number') {
                // Prefer raw preview tokens by seq index; fallback to committed display tokens
                let tokens = null;
                if (Array.isArray(this.state.previewManualRawTokens) && this.state.previewManualRawTokens.length) {
                    tokens = this.state.previewManualRawTokens;
                } else if (this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayRawTokens) && this.numberGenerator.state.displayRawTokens.length) {
                    tokens = this.numberGenerator.state.displayRawTokens;
                } else if (this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayTokens) && this.numberGenerator.state.displayTokens.length) {
                    tokens = this.numberGenerator.state.displayTokens;
                }
                if (tokens && tokens[seqIndex]) {
                    romanSource = String(tokens[seqIndex]).trim();
                }
            }

            if (romanSource) {
                // Case A: source looks like Roman (with optional accidentals/quality)
                const mRN = romanSource.match(/^([b#♭♯]*)([IViv]+)(.*)$/);
                if (mRN) {
                    const acc = mRN[1] || '';
                    const romanPart = mRN[2] || '';
                    // Determine base semitone offset for roman degree from tonic
                    const baseSemisMap = { 'I':0,'II':2,'III':4,'IV':5,'V':7,'VI':9,'VII':11 };
                    const rp = romanPart.toUpperCase();
                    if (baseSemisMap[rp] !== undefined && nv && nv[key] != null) {
                        let shift = 0;
                        for (const ch of acc) {
                            if (ch === '#' || ch === '♯') shift += 1;
                            else if (ch === 'b' || ch === '♭') shift -= 1;
                        }
                        const tonicVal = nv[key];
                        const targetPc = (((tonicVal + baseSemisMap[rp] + shift) % 12) + 12) % 12;
                        // Prefer natural spelling first; if none, let resolver choose enharmonic.
                        return this._resolvePitchClassName(targetPc, /*preferFlat*/ acc.includes('b') || acc.includes('♭')) || '';
                    }
                }

                // Case B: token starts with an explicit root letter (e.g., Db, F#maj7)
                const mRoot = romanSource.match(/^([A-G][b#]?)/i);
                if (mRoot) {
                    return mRoot[1];
                }
            }

            // Case C: Plain Roman or no token -> use diatonic scale note for this degree when available
            if (typeof chord === 'object' && typeof chord.degree === 'number') {
                try {
                    const notes = this.musicTheory.getScaleNotes(key, scale) || [];
                    const note = notes[(chord.degree - 1 + notes.length) % notes.length];
                    if (note) return note;
                } catch (_) { /* ignore */ }
            }

            // Fallback: nothing better; try substitution/chord roots one last time
            if (overlay && overlay.substitution && overlay.substitution.root) return String(overlay.substitution.root);
            if (chord && chord.root) return String(chord.root);
            return '';
        } catch (_) {
            return '';
        }
    }

    /**
     * Resolve a pitch class (0-11) to a preferred note name.
     * Preference: natural name if available; else choose between common enharmonics.
     */
    _resolvePitchClassName(pc, preferFlat = false) {
        try {
            const nv = (this.musicTheory && this.musicTheory.noteValues) || {};
            // Build reverse map: pc -> names
            const names = [];
            for (const [name, val] of Object.entries(nv)) {
                if (val % 12 === pc) names.push(name);
            }
            if (names.length === 0) {
                // Fallback to chromatic array if provided
                const chrom = this.musicTheory && Array.isArray(this.musicTheory.chromaticNotes) ? this.musicTheory.chromaticNotes : null;
                return chrom ? (chrom[pc] || null) : null;
            }
            // Prefer natural names first (no accidentals)
            const naturals = names.filter(n => !/[#b]/.test(n));
            if (naturals.length) return naturals[0];
            // Then prefer flats or sharps based on flag
            if (preferFlat) {
                const flats = names.filter(n => n.includes('b'));
                if (flats.length) return flats[0];
                const sharps = names.filter(n => n.includes('#'));
                if (sharps.length) return sharps[0];
            } else {
                const sharps = names.filter(n => n.includes('#'));
                if (sharps.length) return sharps[0];
                const flats = names.filter(n => n.includes('b'));
                if (flats.length) return flats[0];
            }
            // Last resort
            return names[0];
        } catch (_) {
            return null;
        }
    }

    /**
     * Append a degree to the NumberGenerator sequence and propagate across tools.
     * position: 'end' | 'start' (default 'end')
     */
    appendDegreeToSequence(degree, position = 'end') {
        try {
            if (!this.numberGenerator) {
                // Fallback: maintain our local highlight list so UI reflects change
                const prog = Array.isArray(this.state.progressionDegrees) ? [...this.state.progressionDegrees] : [];
                if (position === 'start') prog.unshift(degree); else prog.push(degree);
                this.state.progressionDegrees = prog;
                this.render();
                this.emit('numbersChanged', { numbers: prog, source: 'unified-chord-explorer' });
                return;
            }

            // Use NumberGenerator API to append and emit updates to all tools
            const current = (this.numberGenerator.getCurrentNumbers && this.numberGenerator.getCurrentNumbers()) || [];
            const next = [...current];
            if (position === 'start') next.unshift(degree); else next.push(degree);
            if (this.numberGenerator.setNumbers) {
                this.numberGenerator.setNumbers(next, this.numberGenerator.getNumberType ? this.numberGenerator.getNumberType() : undefined);
            }
        } catch (e) {
            console.warn('[UnifiedChordExplorer] appendDegreeToSequence failed', e);
        }
    }

    /**
     * Convert degree to Roman numeral
     */
    toRomanNumeral(degree, chordType) {
        const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
        let base = numerals[degree - 1];
        const raw = String(chordType || '');
        const t = raw.toLowerCase();
        const isHalfDim = /m7b5|ø/.test(t);
        const isDimTriad = /(^dim$|^dim7$|°)/.test(t);
        const isMinorTriadOrQuality = /^m(?!aj)/.test(t) && !isHalfDim && !isDimTriad;

        // Determine lowercase/uppercase & base symbol (ø / °)
        if (isHalfDim) base = base.toLowerCase() + 'ø';
        else if (isDimTriad) base = base.toLowerCase() + '°';
        else if (isMinorTriadOrQuality) base = base.toLowerCase();

        // Extension / quality suffix construction
        // We only append for chords beyond simple triads
        let suffix = '';
        // Half-diminished & diminished sevenths already encoded with ø / °, append '7'
        if (isHalfDim && /7/.test(t)) suffix = '7';
        else if (/dim7/.test(t)) suffix = '7';
        else if (/maj7/.test(t)) suffix = 'maj7';
        else if (/m7(?!b5)/.test(t)) suffix = '7';
        else if (/[^a-z]7($|[^0-9])/i.test(raw) || /^7$/.test(t)) suffix = '7';
        else if (/maj9/.test(t)) suffix = 'maj9';
        else if (/m9/.test(t)) suffix = '9';
        else if (/(^|[^a-z0-9])9($|[^0-9])/i.test(raw) || /^9$/.test(t)) suffix = '9';
        else if (/maj11/.test(t)) suffix = 'maj11';
        else if (/m11/.test(t)) suffix = '11';
        else if (/(^|[^a-z0-9])11($|[^0-9])/i.test(raw) || /^11$/.test(t)) suffix = '11';
        else if (/maj13/.test(t)) suffix = 'maj13';
        else if (/m13/.test(t)) suffix = '13';
        else if (/(^|[^a-z0-9])13($|[^0-9])/i.test(raw) || /^13$/.test(t)) suffix = '13';
        else if (/m6/.test(t)) suffix = '6';
        else if (/(^|[^a-z0-9])6($|[^0-9])/i.test(raw)) suffix = '6';
        else if (/alt/.test(t)) suffix = 'alt';

        // Add alterations (b9, #9, #11, b13) after main extension when present
        if (suffix) {
            const alterations = [];
            if (/b9/.test(t)) alterations.push('b9');
            if (/#9/.test(t)) alterations.push('#9');
            if (/#11/.test(t)) alterations.push('#11');
            if (/b13/.test(t)) alterations.push('b13');
            if (alterations.length) suffix += alterations.map(a => a).join('');
        }

        return suffix ? (base + suffix) : base;
    }

    /**
     * Infer a canonical chordType from a Roman token, respecting case and symbols.
     */
    _inferChordTypeFromRomanToken(rawToken) {
        if (!rawToken) return '';
        const m = String(rawToken).match(/^([b#♭♯]*)([IViv]+)(.*)$/);
        if (!m) return '';
        const romanBaseRaw = m[2] || '';
        const rest = (m[3] || '').trim();
        const hasHalfDim = /ø|half-?dim|m7b5/i.test(rest);
        const hasDim = /°|(^|[^a-z])dim(7)?($|[^a-z0-9])/i.test(rest);
        if (hasHalfDim) return 'm7b5';
        if (hasDim) return 'dim7';
        let quality = '';
        const extMatch = rest.match(/(maj13|maj11|maj9|maj7|m7|m9|m11|m13|m6|7|9|11|13|6)/i);
        if (extMatch) {
            quality = extMatch[0];
            const userTypedLower = (String(romanBaseRaw) === String(romanBaseRaw).toLowerCase());
            if (userTypedLower && /^(7|9|11|13|6)$/i.test(quality)) {
                quality = 'm' + quality;
            }
        }
        const altMatches = rest.match(/([b#][0-9]{1,2})/g);
        if (altMatches && altMatches.length) quality += altMatches.join('');
        return quality;
    }

    /**
     * Live preview hook from NumberGenerator manual input.
     * @param {string[]} tokens - normalized Roman tokens (already quality annotated)
     */
    updateManualPreviewTokens(tokens, rawTokens) {
        try {
            if (!Array.isArray(tokens)) return;
            // Store preview tokens and map progressionSequence to match their order for visual alignment.
            this.state.previewManualTokens = tokens.slice();
            this.state.previewManualRawTokens = Array.isArray(rawTokens) && rawTokens.length ? rawTokens.slice() : tokens.slice();
            this.state.progressionSequence = tokens.map((tok, idx) => {
                const rawTok = Array.isArray(rawTokens) && rawTokens[idx] ? rawTokens[idx] : tok;
                const deg = this._extractDegreeFromRoman(rawTok);
                return { type: 'degree', degree: deg || 1 };
            });
            // Non-invasive runtime trace for preview: capture any inserted substitutions (rare in preview path)
            try {
                if (typeof window !== 'undefined' && Array.isArray(window.__interactionLog)) {
                    this.state.progressionSequence.forEach((entry, seqIdx) => {
                        if (entry && entry.type === 'inserted' && entry.substitution) {
                            try { window.__interactionLog.push({ type: 'substitutionCreated', rawToken: (rawTokens && rawTokens[seqIdx]) || tokens[seqIdx] || null, substitution: entry.substitution, seqIndex: seqIdx, preferFlat: String(entry.substitution.root || '').indexOf('b') >= 0, key: this.state.currentKey, ts: Date.now() }); } catch(_){}
                        }
                    });
                }
            } catch (_) { /* non-fatal */ }
            this._log('tokens', 'updateManualPreviewTokens', { previewTokens: tokens.length, seqLength: this.state.progressionSequence.length, previewRaw: this.state.previewManualRawTokens });
            // Re-render chord explorer without touching NumberGenerator input (caret preserved).
            this.render();
        } catch (e) { console.warn('[UnifiedChordExplorer] updateManualPreviewTokens failed', e); }
    }

    /**
     * Extract numeric degree from a Roman token (handles accidentals & secondary dominants)
     */
    _extractDegreeFromRoman(token) {
        if (!token) return null;
        // Remove secondary dominant slash part (e.g. V/ii -> V)
        const base = token.split('/')[0];
        // Strip alterations and extension suffixes
        const cleaned = base.replace(/b|#|ø|°|maj13|maj11|maj9|maj7|13|11|9|7|6|alt|b9|#9|#11|b13/gi,'');
        const match = cleaned.match(/i{1,3}v?|iv|v|vi{0,2}|vii/i); // naive roman capture
        if (!match) return null;
        const roman = match[0].toUpperCase();
        const map = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7 };
        return map[roman] || null;
    }

    /**
     * Render the radial substitution menu
     */
    /**
     * Render the radial substitution menu with family grouping and collision detection
     * Research: Fitts's Law spacing, gestalt grouping principles
     */
    /**
     * Create grading controls for the radial menu overlay
     */
    createGradingControls() {
        const container = document.createElement('div');
        container.className = 'radial-grading-controls';
        
        // Header
        const header = document.createElement('div');
        header.className = 'grading-header';
        header.textContent = 'GRADING SYSTEM';
        container.appendChild(header);

        // Selector
        const selector = document.createElement('select');
        selector.className = 'radial-grading-select';
        ['functional', 'emotional', 'color'].forEach(mode => {
            const opt = document.createElement('option');
            opt.value = mode;
            opt.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
            if (mode === this.musicTheory.gradingMode) opt.selected = true;
            selector.appendChild(opt);
        });
        selector.addEventListener('change', (e) => {
            this.musicTheory.setGradingMode(e.target.value);
        });
        selector.addEventListener('click', (e) => e.stopPropagation());
        container.appendChild(selector);
        
        // Legend
        const legend = document.createElement('div');
        legend.className = 'radial-grading-legend';
        legend.innerHTML = this.getGradingLegendHTML();
        container.appendChild(legend);
        
        // NEW: Filter Badges
        const filterSection = document.createElement('div');
        filterSection.className = 'radial-filter-badges';
        filterSection.innerHTML = '<div class="filter-header">INTENT FILTER</div>';
        
        const badges = [
            { mode: 'all', icon: '🎯', label: 'All' },
            { mode: 'diatonic', icon: '📊', label: 'Stay Diatonic' },
            { mode: 'color', icon: '🌈', label: 'Add Color' },
            { mode: 'chromatic', icon: '🔥', label: 'Go Chromatic' },
            { mode: 'containers', icon: '📦', label: 'Containers' },
            { mode: 'surprise', icon: '🎲', label: 'Surprise Me' }
        ];
        
        badges.forEach(badge => {
            const btn = document.createElement('button');
            btn.className = 'filter-badge';
            if (badge.mode === this.state.radialFilterMode) {
                btn.classList.add('active');
            }
            btn.innerHTML = `<span class="badge-icon">${badge.icon}</span><span class="badge-label">${badge.label}</span>`;
            btn.title = badge.label;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setRadialFilterMode(badge.mode);
                // Update active state
                filterSection.querySelectorAll('.filter-badge').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
            filterSection.appendChild(btn);
        });
        
        container.appendChild(filterSection);
        
        // Stop propagation so clicking controls doesn't close menu
        container.addEventListener('click', (e) => e.stopPropagation());
        
        return container;
    }

    /**
     * Generate HTML for the grading legend based on current mode
     */
    getGradingLegendHTML() {
        let html = '<div class="legend-grid">';
        // Iterate tiers 4 down to 0
        for (let i = 4; i >= 0; i--) {
            const info = this.musicTheory.getGradingTierInfo(i);
            html += `
                <div class="legend-item">
                    <span class="legend-icon" style="color:${info.color}">${info.short}</span>
                    <span class="legend-label">${info.name}</span>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    renderRadialMenu() {
        // Remove existing menu
        if (this.radialMenu) {
            this.radialMenu.remove();
        }
        // Remove existing overlay to prevent stacking
        if (this.radialOverlay) {
            this.radialOverlay.remove();
        }

    // Create overlay and keep a reference so it can be removed later
    const overlay = document.createElement('div');
    overlay.className = 'radial-menu-overlay';
    overlay.addEventListener('click', () => this.closeRadialMenu());
    // store overlay reference to ensure it's removed when menu closes
    this.radialOverlay = overlay;

        // Add Grading Controls
        const gradingControls = this.createGradingControls();
        overlay.appendChild(gradingControls);

        // Create menu container
        this.radialMenu = document.createElement('div');
        this.radialMenu.className = 'radial-menu';
        this.radialMenu.style.left = `${this.state.radialMenuPosition.x}px`;
        this.radialMenu.style.top = `${this.state.radialMenuPosition.y}px`;

        // Center node (original chord) — summary populated after effectiveSubs computed
        const center = document.createElement('div');
        center.className = 'radial-center';
        this.radialMenu.appendChild(center);

        // Filter substitutions for display (may hide lower-priority items behind a "More" cluster)
        const { displaySubs, hiddenSubs } = this.filterSubstitutionsForDisplay(this.state.substitutions);

        // If exhaustive mode is enabled and we have a very large number of container chords, collapse them to root clusters
        let effectiveSubs = displaySubs;
        if (this.state.exhaustiveMode) {
            const containerSubs = displaySubs.filter(s => s.type === 'container');
            // Threshold: if container subs exceed 40 we cluster them
            if (containerSubs.length > 40) {
                const byRoot = new Map();
                containerSubs.forEach(c => {
                    if (!byRoot.has(c.root)) byRoot.set(c.root, []);
                    byRoot.get(c.root).push(c);
                });
                // Build cluster placeholder subs (one per root)
                const tierInfo = this.musicTheory.getGradingTierInfo(3);
                const clusterPlaceholders = Array.from(byRoot.entries()).map(([root, members]) => ({
                    root,
                    chordType: members[0].chordType,
                    fullName: `${root} · ${members.length} variants`,
                    label: 'root cluster',
                    family: 'extension',
                    grade: tierInfo.label,
                    tier: 3,
                    color: tierInfo.color,
                    _clusterMembers: members,
                    type: 'container_root_cluster'
                }));
                // Keep non-container substitutions + cluster placeholders
                effectiveSubs = displaySubs.filter(s => s.type !== 'container').concat(clusterPlaceholders);
            }
        }

    // Group substitutions by family for visual clustering
    const familyGroups = this.groupSubstitutionsByFamily(effectiveSubs);
    
    // Render substitution nodes with optional clustering (group same-root substitutions together)
    // IMPORTANT: This must happen BEFORE positioning so _uid is set!
    const clusters = this._createClustersFromSubs(effectiveSubs, this.clusterThreshold || 3);
    this._log('layout', '[renderRadialMenu] clusters', { count: Object.keys(clusters.clusters).length, threshold: clusters.threshold });
        
        // Assign angles via selected layout mode
        let positioned;
        if (this.state.layoutMode === 'quadrant') {
            positioned = this.layoutRadialByQuadrants(effectiveSubs);
        } else {
            positioned = this.calculateOptimalRadialPositions(familyGroups);
        }

        this._log('layout', '[renderRadialMenu] effectiveSubs', { effective: effectiveSubs.length, positioned: positioned.length });

        // Render family arcs (visual grouping)
        this.renderFamilyArcs(familyGroups, positioned);        // If clusters exist, map members to cluster placeholders
        const clusterKeys = new Set(Object.keys(clusters.clusters));

        // Build a map from member id (by index in substitutions) to position info
        const positionedMap = new Map();
        positioned.forEach(p => positionedMap.set(p._uid || `${p.root}:${p.chordType}:${p.fullName}`, p));

    // Render cluster nodes first
    Object.entries(clusters.clusters).forEach(([key, members]) => {
            if (members.length < clusters.threshold) return; // only cluster large groups

            // Compute average position from positioned members
            const memberPositions = members.map(m => positionedMap.get(m._uid || `${m.root}:${m.chordType}:${m.fullName}`)).filter(Boolean);
            if (memberPositions.length === 0) return;
            const avgX = Math.round(memberPositions.reduce((s, v) => s + v.x, 0) / memberPositions.length);
            const avgY = Math.round(memberPositions.reduce((s, v) => s + v.y, 0) / memberPositions.length);
            const avgAngle = Math.round(memberPositions.reduce((s, v) => s + v.angle, 0) / memberPositions.length);

            const clusterNode = document.createElement('div');
            clusterNode.className = `radial-node cluster family-${members[0].family}`;
            clusterNode.style.transform = `translate(${avgX}px, ${avgY}px)`;
            clusterNode.innerHTML = `
                <div class="node-chord">${members[0].root} · ${members.length} options</div>
                <div class="node-label">group</div>
            `;
            clusterNode.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openGroupedSubmenu(members, `${members[0].root} substitutions`);
            });
            clusterNode.addEventListener('mouseenter', () => {
                this.emit('substitutionGroupHover', { root: members[0].root, members });
            });

            this.radialMenu.appendChild(clusterNode);

            // Draw a connection line for cluster at avg angle/length
            const line = document.createElement('div');
            line.className = `radial-line family-${members[0].family}`;
            const length = Math.sqrt(avgX * avgX + avgY * avgY);
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${avgAngle}deg)`;
            this.radialMenu.appendChild(line);
        });

    // Render non-clustered nodes
        let renderedCount = 0;
        positioned.forEach(sub => {
            const key = sub._uid || `${sub.root}:${sub.chordType}:${sub.fullName}`;
            // if this sub belongs to a large cluster, skip individual rendering
            const groupKey = `${sub.family}::${sub.root}`;
            const cluster = clusters.clusters[groupKey];
            if (cluster && cluster.length >= clusters.threshold) {
                this._log('layout', '[renderRadialMenu] skipClusterMember', { fullName: sub.fullName, groupKey, clusterSize: cluster.length });
                return;
            }

            // If this is a root cluster placeholder, render special node
            if (sub.type === 'container_root_cluster') {
                const node = document.createElement('div');
                node.className = `radial-node root-cluster family-${sub.family}`;
                node.style.transform = `translate(${sub.x}px, ${sub.y}px)`;
                node.innerHTML = `
                    <div class="node-chord">${sub.fullName}</div>
                    <div class="node-label">cluster</div>
                `;
                node.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openClusterRadial(sub._clusterMembers || [], sub.root);
                });
                node.addEventListener('mouseenter', () => {
                    this.emit('substitutionGroupHover', { root: sub.root, members: sub._clusterMembers });
                });
                this.radialMenu.appendChild(node);
                const line = document.createElement('div');
                line.className = `radial-line family-${sub.family}`;
                const length = Math.sqrt(sub.x * sub.x + sub.y * sub.y);
                line.style.width = `${length}px`;
                line.style.transform = `rotate(${sub.angle}deg)`;
                this.radialMenu.appendChild(line);
                return;
            }

            const node = this.createRadialNode(sub);
            this.radialMenu.appendChild(node);
            renderedCount++;

            // Connection line
            const line = document.createElement('div');
            line.className = `radial-line family-${sub.family}`;
            const length = Math.sqrt(sub.x * sub.x + sub.y * sub.y);
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${sub.angle}deg)`;
            this.radialMenu.appendChild(line);
        });

        this._log('layout', '[renderRadialMenu] renderedSummary', { rendered: renderedCount, positioned: positioned.length });

        // If there are hidden substitutions (filtered out), render a "More" cluster node
        if (hiddenSubs && hiddenSubs.length > 0) {
            const moreRadius = 150;
            const angle = 100; // place 'More' in a bottom-right-ish position
            const rad = (angle * Math.PI) / 180;
            const mx = Math.cos(rad) * moreRadius;
            const my = Math.sin(rad) * moreRadius;

            const moreNode = document.createElement('div');
            moreNode.className = `radial-node more-cluster`;
            moreNode.style.transform = `translate(${mx}px, ${my}px)`;
            moreNode.innerHTML = `<div class="node-chord">More · ${hiddenSubs.length}</div><div class="node-label">show all</div>`;
            moreNode.addEventListener('click', (e) => {
                e.stopPropagation();
                // open grouped submenu for hidden items
                this.openGroupedSubmenu(hiddenSubs, 'More substitutions');
            });
            this.radialMenu.appendChild(moreNode);
            const line = document.createElement('div');
            line.className = `radial-line more-cluster`;
            const length = Math.sqrt(mx * mx + my * my);
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${angle}deg)`;
            this.radialMenu.appendChild(line);
        }

    overlay.appendChild(this.radialMenu);
    document.body.appendChild(overlay);
    // ensure open state is correctly tracked (defensive)
    this.state.radialMenuOpen = true;
    }

    /**
     * Group substitutions by family for visual clustering
     */
    groupSubstitutionsByFamily(subs) {
        const groups = {};
        subs.forEach(sub => {
            const family = sub.family || 'other';
            if (!groups[family]) groups[family] = [];
            groups[family].push(sub);
        });
        return groups;
    }

    /**
     * Calculate optimal radial positions with tiered layout and collision detection
     * Research: Bubble collision algorithms, force-directed layout, hierarchical radial trees
     * Groups items by priority: most common/perfect near center, exotic/altered farther out
     */
    calculateOptimalRadialPositions(familyGroups) {
        const positioned = [];
        const familyAngles = {
            'dominant': -90,      // Top (most important)
            'secondary': -45,     // Top-right
            'tonic': 90,          // Right
            'modal': -135,        // Top-left
            'extension': 45,      // Bottom-right
            'mediant': 135        // Bottom-left
        };

        const nodeSize = 45;
        const minAngleDelta = 18; // degrees used to spread within family
        const tierSpacing = 75; // distance between tiers

        // Flatten all subs into single array with tier assignment
        const allSubs = [];
        Object.entries(familyGroups).forEach(([family, subs]) => {
            subs.forEach(sub => {
                const tier = this._calculateTier(sub);
                allSubs.push({ ...sub, family, _tier: tier });
            });
        });

        // Group by tier
        const tierGroups = {};
        allSubs.forEach(sub => {
            const t = sub._tier;
            if (!tierGroups[t]) tierGroups[t] = [];
            tierGroups[t].push(sub);
        });

        // Map harmonic distance (lower = closer) to a radial distance range
        const distances = allSubs.map(s => (typeof s.harmonicDistance === 'number') ? s.harmonicDistance : null).filter(d => d !== null);
        const minDist = distances.length ? Math.min(...distances) : 0;
        const maxDist = distances.length ? Math.max(...distances) : (minDist + 1);
        const mapDistToRadius = (d) => {
            if (d === null || typeof d !== 'number') return 100; // fallback radius
            const norm = (d - minDist) / (maxDist - minDist || 1);
            const minR = 80; const maxR = 360;
            return Math.round(minR + norm * (maxR - minR));
        };

        // Assign positions tier by tier (tier still influences slight offset)
        Object.keys(tierGroups).sort((a, b) => a - b).forEach(tier => {
            const tierSubs = tierGroups[tier];

            // Within tier, group by family and spread angularly
            const tierFamilyGroups = {};
            tierSubs.forEach(sub => {
                const fam = sub.family || 'other';
                if (!tierFamilyGroups[fam]) tierFamilyGroups[fam] = [];
                tierFamilyGroups[fam].push(sub);
            });

            Object.entries(tierFamilyGroups).forEach(([fam, subs]) => {
                const baseAngle = familyAngles[fam] || 0;
                const count = subs.length;

                subs.forEach((sub, idx) => {
                    const spread = count > 1 ? ((idx - (count - 1) / 2) * minAngleDelta) : 0;
                    const angle = baseAngle + spread;

                    // Map harmonicDistance to radius, then nudge by tier so higher priority sits slightly closer
                    const mappedRadius = mapDistToRadius((typeof sub.harmonicDistance === 'number') ? sub.harmonicDistance : null);
                    const tierNudge = (tier - 1) * 12; // small extra separation per tier
                    const finalRadius = mappedRadius + tierNudge;

                    const rad = (angle * Math.PI) / 180;
                    const x = Math.cos(rad) * finalRadius;
                    const y = Math.sin(rad) * finalRadius;

                    positioned.push({
                        ...sub,
                        _targetAngle: angle,
                        _targetRadius: finalRadius,
                        _tier: tier,
                        x,
                        y,
                        angle,
                        radius: finalRadius
                    });
                });
            });
        });

        // Apply relaxation with tier-awareness (nodes prefer to stay near their tier radius)
        this._relaxPositions(positioned, {
            nodeSize: nodeSize,
            padding: 10,
            iterations: 250,
            attraction: 0.08,
            maxRadius: Math.min(window.innerWidth, window.innerHeight) / 2 - 60,
            tierSpacing: tierSpacing
        });

        // Finalize polar values
        positioned.forEach(p => {
            p.radius = Math.round(Math.sqrt(p.x * p.x + p.y * p.y));
            p.angle = Math.round((Math.atan2(p.y, p.x) * 180) / Math.PI);
        });

        return positioned;
    }

    /**
     * Calculate tier (priority ring) for a substitution.
     * Tier 1 = closest/most common, Tier 5 = farthest/exotic
     */
    _calculateTier(sub) {
        // Perfect grade substitutions = tier 1
        if (sub.grade === 'perfect') return 1;

        // Core functional subs (secondary dominant, relative, deceptive, ii-V) = tier 1-2
        if (['secondary_dominant', 'relative', 'deceptive', 'ii_v_setup'].includes(sub.type)) {
            return sub.grade === 'excellent' ? 1 : 2;
        }

        // Dominant family (tritone, backdoor, diminished approach) = tier 2
        if (['tritone_sub', 'backdoor', 'diminished_approach'].includes(sub.type)) {
            return 2;
        }

        // Modal interchange and parallel = tier 3
        if (['modal_interchange', 'parallel', 'neapolitan'].includes(sub.type)) {
            return 3;
        }

        // Container chords: tier by complexity (simpler = closer)
        if (sub.type === 'container' || sub.type === 'container_root_cluster') {
            const complexity = this._estimateChordComplexity(sub.chordType || '');
            if (complexity <= 2) return 3; // triads, 7ths
            if (complexity <= 4) return 4; // 9ths, sus, add
            return 5; // 11ths, 13ths, altered
        }

        // Chromatic mediants and exotic = tier 4-5
        if (sub.type === 'chromatic_mediant') return 4;
        if (sub.type === 'secondary_ii_v') return 3;

        // Default tier by grade
        if (sub.grade === 'excellent') return 2;
        if (sub.grade === 'good') return 3;
        return 4;
    }

    /**
     * Estimate chord complexity (lower = simpler)
     * 1 = triad, 2 = 7th, 3 = 9th, 4 = sus/add/11th, 5 = 13th/altered
     */
    _estimateChordComplexity(chordType) {
        if (!chordType) return 1;
        const t = chordType.toLowerCase();
        if (/13|b13|#11/.test(t)) return 5;
        if (/11|sus4|sus2/.test(t)) return 4;
        if (/add|9|b9|#9/.test(t)) return 3;
        if (/7|maj7|m7|dim7|ø/.test(t)) return 2;
        return 1; // triads
    }

    /**
     * Iterative relaxation to resolve node collisions with tier-awareness.
     * nodes: array of objects with x,y, _targetAngle, _targetRadius, and _tier
     * opts: { nodeSize, padding, iterations, attraction, maxRadius, tierSpacing }
     */
    _relaxPositions(nodes, opts = {}) {
        const nodeSize = opts.nodeSize || 40;
        const padding = opts.padding || 8;
        const iterations = opts.iterations || 300;
        const attraction = opts.attraction || 0.06;
        const repulsion = opts.repulsionStrength || 1200;
        const maxRadius = opts.maxRadius || Math.min(window.innerWidth, window.innerHeight) / 2 - 40;
        const repulsionFalloff = opts.repulsionFalloff || 2;
        const tierSpacing = opts.tierSpacing || 75; // tier separation distance

        const baseMinDist = nodeSize + padding;

        const clampRadius = (x, y) => {
            const r = Math.sqrt(x * x + y * y);
            if (r > maxRadius) {
                const scale = maxRadius / r;
                return { x: x * scale, y: y * scale };
            }
            return { x, y };
        };

        // Helper to compute local neighbor count (density)
        const localNeighborCount = (idx, threshold) => {
            const a = nodes[idx];
            let count = 0;
            for (let j = 0; j < nodes.length; j++) {
                if (j === idx) continue;
                const b = nodes[j];
                const dx = a.x - b.x; const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < threshold) count++;
            }
            return count;
        };

        for (let iter = 0; iter < iterations; iter++) {
            const forces = new Array(nodes.length).fill(0).map(() => ({ x: 0, y: 0 }));

            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    let dx = a.x - b.x;
                    let dy = a.y - b.y;
                    let dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

                    // Nodes in same tier should have stronger repulsion to avoid overlap
                    const sameTier = (a._tier === b._tier);
                    const tierDiff = Math.abs((a._tier || 1) - (b._tier || 1));
                    
                    // Dynamic desired min distance: same tier = full padding; adjacent tiers = reduced; far tiers = minimal
                    let minDist = baseMinDist;
                    if (sameTier) {
                        const densityScale = 1 + Math.min(3, Math.max(0, localNeighborCount(i, baseMinDist * 1.6) / 3));
                        minDist = baseMinDist * densityScale;
                    } else if (tierDiff === 1) {
                        minDist = baseMinDist * 0.7;
                    } else {
                        minDist = baseMinDist * 0.5;
                    }

                    if (dist < 0.0001) {
                        dx = (Math.random() - 0.5) * 0.1;
                        dy = (Math.random() - 0.5) * 0.1;
                        dist = Math.sqrt(dx * dx + dy * dy);
                    }

                    if (dist < minDist * 1.4) {
                        const k = repulsion * (minDist * minDist);
                        const forceMag = k / Math.pow(dist, repulsionFalloff);
                        const nx = dx / dist;
                        const ny = dy / dist;

                        const dispX = nx * Math.min(forceMag * 0.02, minDist * 0.5);
                        const dispY = ny * Math.min(forceMag * 0.02, minDist * 0.5);

                        forces[i].x += dispX;
                        forces[i].y += dispY;
                        forces[j].x -= dispX;
                        forces[j].y -= dispY;
                    }
                }
            }

            let maxDisp = 0;
            for (let n = 0; n < nodes.length; n++) {
                const node = nodes[n];
                node.x += forces[n].x;
                node.y += forces[n].y;

                // Attraction toward target polar position (preserves family sector + tier ring)
                const targRad = (node._targetAngle * Math.PI) / 180;
                const tx = Math.cos(targRad) * node._targetRadius;
                const ty = Math.sin(targRad) * node._targetRadius;
                node.x += (tx - node.x) * attraction;
                node.y += (ty - node.y) * attraction;

                // Tier enforcement: gently push node back toward its target radius to maintain tier separation
                const currentRadius = Math.sqrt(node.x * node.x + node.y * node.y) || 0.0001;
                const targetRadius = node._targetRadius || 100;
                const radiusError = targetRadius - currentRadius;
                if (Math.abs(radiusError) > tierSpacing * 0.3) {
                    const tierPull = radiusError * 0.15; // gentle pull toward tier ring
                    const nx = node.x / currentRadius;
                    const ny = node.y / currentRadius;
                    node.x += nx * tierPull;
                    node.y += ny * tierPull;
                }

                // Outward push if very dense locally (only within same tier)
                const neighbors = localNeighborCount(n, baseMinDist * 1.5);
                if (neighbors > 3) {
                    const cx = node.x; const cy = node.y;
                    const r = Math.sqrt(cx * cx + cy * cy) || 0.0001;
                    const push = Math.min(5, neighbors - 2);
                    node.x += (cx / r) * push;
                    node.y += (cy / r) * push;
                }

                const c = clampRadius(node.x, node.y);
                node.x = c.x; node.y = c.y;

                const disp = Math.sqrt((forces[n].x) * (forces[n].x) + (forces[n].y) * (forces[n].y));
                if (disp > maxDisp) maxDisp = disp;
            }

            if (maxDisp < 0.01) break;
        }
    }

    /**
     * Render family arc backgrounds for visual grouping
     */
    renderFamilyArcs(familyGroups, positioned) {
        const familyColors = {
            'dominant': 'rgba(239, 68, 68, 0.15)',
            'secondary': 'rgba(251, 146, 60, 0.15)',
            'tonic': 'rgba(16, 185, 129, 0.15)',
            'modal': 'rgba(139, 92, 246, 0.15)',
            'extension': 'rgba(59, 130, 246, 0.15)',
            'mediant': 'rgba(236, 72, 153, 0.15)'
        };

        Object.entries(familyGroups).forEach(([family, subs]) => {
            if (subs.length < 2) return; // Skip arcs for single items

            const familySubs = positioned.filter(p => p.family === family);
            if (familySubs.length === 0) return;

            const angles = familySubs.map(s => s.angle);
            const minAngle = Math.min(...angles);
            const maxAngle = Math.max(...angles);
            const arcSpan = maxAngle - minAngle;

            // Create arc background
            const arc = document.createElement('div');
            arc.className = `family-arc family-${family}`;
            arc.style.background = familyColors[family] || 'rgba(255, 255, 255, 0.05)';
            arc.style.setProperty('--start-angle', `${minAngle - 10}deg`);
            arc.style.setProperty('--end-angle', `${maxAngle + 10}deg`);
            
            // Position arc (simplified - could use SVG for better arcs)
            const midAngle = (minAngle + maxAngle) / 2;
            const rad = (midAngle * Math.PI) / 180;
            const arcRadius = 110;
            arc.style.transform = `translate(${Math.cos(rad) * arcRadius}px, ${Math.sin(rad) * arcRadius}px)`;
            
            this.radialMenu.appendChild(arc);
        });
    }

    /**
     * Create an enhanced radial node with tooltip and hover preview
     */
    createRadialNode(sub) {
        const node = document.createElement('div');
        node.className = `radial-node family-${sub.family} tier-${sub.tier || 0}`;
        node.style.transform = `translate(${sub.x}px, ${sub.y}px)`;
        
        // Apply grading color dynamically with enhanced visual feedback
        if (sub.color) {
            node.style.borderColor = sub.color;
            node.style.boxShadow = `0 0 8px ${sub.color}40, inset 0 0 4px ${sub.color}20`;
            // Add grading tier indicator as a subtle background gradient
            node.style.background = `linear-gradient(135deg, ${sub.color}15, rgba(0,0,0,0.9))`;
        }
        
        // Enhanced node content with grading tier indicator
        node.innerHTML = `
            <div class="node-chord">${sub.fullName}</div>
            <div class="node-label">${sub.label}</div>
            ${sub.grade ? `<div class="node-grade" style="color: ${sub.color}">${sub.gradingShort || this.formatGrade(sub.grade)}</div>` : ''}
            ${sub.tier !== undefined ? `<div class="node-tier-indicator" style="background: ${sub.color}"></div>` : ''}
            ${sub.voiceLeading ? `<div class="node-voice-leading">${sub.voiceLeading}</div>` : ''}
        `;
        
        // Enhanced tooltip with grading explanation
        const tooltip = document.createElement('div');
        tooltip.className = 'node-tooltip';
        tooltip.innerHTML = `
            <strong>${sub.fullName}</strong>
            <div class="tooltip-type">${sub.type.replace(/_/g, ' ')}</div>
            ${sub.gradingExplanation ? `<div class="tooltip-grading">${sub.gradingExplanation}</div>` : ''}
            ${sub.voiceLeading ? `<div class="tooltip-voice">Voice Leading: ${sub.voiceLeading}</div>` : ''}
            ${sub.description ? `<div class="tooltip-desc">${sub.description}</div>` : ''}
            ${sub.tier !== undefined ? `<div class="tooltip-tier">Grading Tier: ${sub.tier + 1}/5</div>` : ''}
        `;
        node.appendChild(tooltip);
        
        // Click handler
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Check if this is a container group representative
            if (sub._isGroupRep && sub._groupMembers) {
                // Open submenu showing all group members
                this.openGroupedSubmenu(sub._groupMembers, `${sub.root} extensions`);
            } else {
                // Normal substitution selection
                this.selectSubstitution(sub);
            }
        });

        // Enhanced hover preview with grading information
        node.addEventListener('mouseenter', () => {
            this.emit('substitutionHover', { 
                substitution: sub, 
                original: this.state.selectedChord,
                grading: {
                    tier: sub.tier,
                    color: sub.color,
                    explanation: sub.gradingExplanation
                }
            });
        });

        return node;
    }

    /**
     * Create clusters from a list of substitutions.
     * Groups by family::root so you can collapse many Fs (for example) into one cluster.
     * threshold: minimum group size to consider clustering
     */
    _createClustersFromSubs(subs, threshold = 3) {
        const clusters = {};
        subs.forEach((s, idx) => {
            // mark a simple unique id to help mapping later
            if (!s._uid) s._uid = `s${idx}:${s.root}:${s.chordType || ''}:${s.fullName || ''}`;
            const key = `${s.family || 'other'}::${s.root}`;
            if (!clusters[key]) clusters[key] = [];
            clusters[key].push(s);
        });
        return { clusters, threshold };
    }

    /**
     * Categorize cluster members by chord quality / function patterns
     */
    categorizeClusterMembers(members) {
        const categories = {
            dominant: [],
            major: [],
            minor: [],
            extended: [],
            altered: [],
            sus_add: [],
            dim_aug: []
        };
        members.forEach(m => {
            const t = m.chordType || '';
            if (/dim|°|ø|aug|\+/.test(t)) categories.dim_aug.push(m);
            else if (/sus|add/.test(t)) categories.sus_add.push(m);
            else if (/(b5|#5|b9|#9|#11|b13)/.test(t)) categories.altered.push(m);
            else if (/13|11|9/.test(t)) categories.extended.push(m);
            else if (/m(?!aj)/.test(t)) categories.minor.push(m);
            else if (/7/.test(t) && !/maj7/.test(t)) categories.dominant.push(m);
            else categories.major.push(m);
        });
        return categories;
    }

    /**
     * Open a detailed radial for a root cluster: multi-ring organization by category
     */
    openClusterRadial(members, root) {
        // Remove existing menu/overlay
        if (this.radialMenu) this.radialMenu.remove();
        if (this.radialOverlay) this.radialOverlay.remove();

        this.state.radialMenuPosition = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };

        const overlay = document.createElement('div');
        overlay.className = 'radial-menu-overlay cluster-mode';
        overlay.addEventListener('click', () => this.closeRadialMenu());
        this.radialOverlay = overlay;

        // Add Grading Controls
        const gradingControls = this.createGradingControls();
        overlay.appendChild(gradingControls);

        const menu = document.createElement('div');
        menu.className = 'radial-menu cluster-mode';
        menu.style.left = `${this.state.radialMenuPosition.x}px`;
        menu.style.top = `${this.state.radialMenuPosition.y}px`;

        const center = document.createElement('div');
        center.className = 'radial-center cluster';
        center.innerHTML = `<div class="center-chord">${root} root cluster</div><div class="center-hint">select variant</div>`;
        menu.appendChild(center);

        const categories = this.categorizeClusterMembers(members);
        const ringOrder = ['dominant','altered','extended','major','minor','sus_add','dim_aug'];
        const baseRadius = 110;
        const ringSpacing = 55;

        ringOrder.forEach((cat, ringIndex) => {
            const list = categories[cat];
            if (!list || list.length === 0) return;
            const radius = baseRadius + ringIndex * ringSpacing;
            const angleStep = 360 / list.length;
            list.forEach((m, i) => {
                const angle = -90 + i * angleStep;
                const rad = (angle * Math.PI) / 180;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;
                const node = document.createElement('div');
                node.className = `radial-node cluster-member cat-${cat}`;
                node.style.transform = `translate(${x}px, ${y}px)`;
                
                // Apply grading color dynamically
                if (m.color) {
                    node.style.borderColor = m.color;
                    node.style.boxShadow = `0 0 8px ${m.color}40`;
                }
                
                node.innerHTML = `<div class="node-chord">${m.fullName}</div><div class="node-label">${m.label || cat}</div>`;
                node.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // treat selection like normal substitution
                    this.selectSubstitution(m);
                });
                node.addEventListener('mouseenter', () => this.emit('substitutionHover', { substitution: m, original: this.state.selectedChord }));
                menu.appendChild(node);
            });
            // Category label
            const label = document.createElement('div');
            label.className = 'cluster-category-label';
            label.textContent = cat.replace('_','/');
            label.style.transform = `translate(${Math.cos(-90 * Math.PI/180) * radius}px, ${Math.sin(-90 * Math.PI/180) * radius - 20}px)`;
            menu.appendChild(label);
        });

        overlay.appendChild(menu);
        document.body.appendChild(overlay);
        this.radialMenu = menu;
        this.state.radialMenuOpen = true;
    }

    /**
     * Control whether the radial shows every substitution or a curated subset.
     * When exhaustive mode is off, menus show a capped number of top substitutions and hide the rest behind a "More" node.
     */
    setExhaustiveMode(enabled) {
        this.state.exhaustiveMode = !!enabled;
        // If a radial menu is currently open, re-render it in the correct mode
        // to avoid stale references or UI elements causing runtime errors when
        // the underlying substitution set expands/contracts. This particularly
        // affects insertion menus triggered by the plus-left/right buttons.
        try {
            if (this.state.radialMenuOpen) {
                if (this.insertionContext) {
                    // Re-render insertion variant
                    this.renderInsertionRadialMenu();
                } else if (this.state.selectedChord) {
                    // Standard substitution radial
                    this.renderRadialMenu();
                }
            }
        } catch (e) {
            console.warn('[UnifiedChordExplorer] setExhaustiveMode re-render failed', e);
        }
    }

    /**
     * Filter substitutions into display and hidden lists based on priority and state settings.
     * Returns: { displaySubs: [], hiddenSubs: [] }
     */
    filterSubstitutionsForDisplay(subs) {
        if (!Array.isArray(subs)) return { displaySubs: [], hiddenSubs: [] };

        // If exhaustive mode, show all
        if (this.state.exhaustiveMode) return { displaySubs: subs.slice(), hiddenSubs: [] };

        // Determine limit: tie to complexity or use sensible default
        const defaultLimit = 28; // show up to 28 items comfortably in radial
        const complexityFactor = Math.max(0.2, Math.min(1, (this.state.complexity || 50) / 100));
        const limit = Math.max(6, Math.round(defaultLimit * complexityFactor));

        // Ensure subs are sorted by harmonicDistance (lower is better)
        const sorted = subs.slice().sort((a, b) => (a.harmonicDistance || 999) - (b.harmonicDistance || 999));

        const displaySubs = sorted.slice(0, limit);
        const hiddenSubs = sorted.slice(limit);
        return { displaySubs, hiddenSubs };
    }

    /**
     * Open a grouped submenu listing all members of a cluster (centered)
     */
    openGroupedSubmenu(members, title) {
        // Use a centered overlay like other radial menus
        this.state.radialMenuPosition = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
        // Build a focused menu showing each member as a selectable node in a simple list/radial
        if (this.radialMenu) this.radialMenu.remove();
        if (this.radialOverlay) this.radialOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'radial-menu-overlay grouped-mode';
        overlay.addEventListener('click', () => this.closeRadialMenu());
        this.radialOverlay = overlay;

        // Add Grading Controls
        const gradingControls = this.createGradingControls();
        overlay.appendChild(gradingControls);

        const menu = document.createElement('div');
        menu.className = 'radial-menu grouped-mode';
        menu.style.left = `${this.state.radialMenuPosition.x}px`;
        menu.style.top = `${this.state.radialMenuPosition.y}px`;

        const center = document.createElement('div');
        center.className = 'radial-center grouped';
        center.innerHTML = `<div class="center-chord">${title}</div><div class="center-hint">choose one</div>`;
        menu.appendChild(center);

        // Lay out members evenly around a circle
        const radius = 120;
        const angleStep = 360 / Math.max(6, members.length);
        members.forEach((m, i) => {
            const angle = -90 + i * angleStep;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;

            const node = document.createElement('div');
            node.className = `radial-node family-${m.family}`;
            node.style.transform = `translate(${x}px, ${y}px)`;
            
            // Apply grading color dynamically
            if (m.color) {
                node.style.borderColor = m.color;
                node.style.boxShadow = `0 0 8px ${m.color}40`;
            }
            node.innerHTML = `<div class="node-chord">${m.fullName}</div><div class="node-label">${m.label}</div>`;
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                // in grouped submenu, selecting an item should behave like selecting substitution
                // If insertion context exists, select insertion; else fallback to normal select
                if (this.insertionContext) this.selectInsertionSubstitution(m);
                else {
                    this.state.selectedChord = this.state.selectedChord || this.state.scaleChords.find(c => c.degree === (m.degree || 1));
                    this.selectSubstitution(m);
                }
            });
            node.addEventListener('mouseenter', () => this.emit('substitutionHover', { substitution: m, original: this.state.selectedChord }));

            menu.appendChild(node);
        });

        overlay.appendChild(menu);
        document.body.appendChild(overlay);
        this.radialMenu = menu;
        this.state.radialMenuOpen = true;
    }

    /**
     * Format grade string
     */
    formatGrade(grade) {
        const map = {
            'perfect': 4,
            'excellent': 3,
            'good': 2,
            'fair': 1,
            'experimental': 0
        };
        const tier = map[grade] !== undefined ? map[grade] : 2;
        const info = this.musicTheory.getGradingTierInfo(tier);
        return `<span style="color:${info.color}">${info.short}</span>`;
    }

    /**
     * Create container element
     */
    createContainerElement() {
        if (this.containerElement) return;
        
        this.containerElement = document.createElement('div');
        this.containerElement.className = 'unified-chord-explorer';

        // Add global click handler to close menu
        document.addEventListener('click', (e) => {
            if (this.state.radialMenuOpen && !e.target.closest('.radial-menu')) {
                this.closeRadialMenu();
            }
        });
    }

    /**
     * Get container element
     */
    getElement() {
        if (!this.containerElement) {
            this.createContainerElement();
        }
        return this.containerElement;
    }

    /**
     * Mount the explorer into the DOM at the provided selector.
     * Compatible with older ChordExplorer API used by `modular-music-theory.html`.
     */
    mount(selectorOrElement) {
        try {
            let target = null;
            if (typeof selectorOrElement === 'string') target = document.querySelector(selectorOrElement);
            else target = selectorOrElement;
            if (!target) {
                console.warn('[UnifiedChordExplorer] mount: target not found', selectorOrElement);
                return;
            }
            this.createContainerElement();
            // Append our rendered container if not already inside target
            if (!target.contains(this.containerElement)) {
                target.appendChild(this.containerElement);
            }
            // perform an initial render
            this.render();
        } catch (e) {
            console.error('[UnifiedChordExplorer] mount error', e);
        }
    }

    /**
     * Unmount explorer and cleanup DOM references
     */
    unmount() {
        try {
            if (this.containerElement && this.containerElement.parentNode) {
                this.containerElement.parentNode.removeChild(this.containerElement);
            }
            this.containerElement = null;
            // Close any open radial
            try { this.closeRadialMenu(); } catch (e) {}
        } catch (e) { /* ignore */ }
    }

    /**
     * Toggle radial center-on-open behavior
     * @param {boolean} enabled
     */
    setRadialCenterMode(enabled) {
        this.radialCenterOnOpen = !!enabled;
    }

    /**
     * Set radial layout mode ('auto' | 'quadrant')
     */
    setLayoutMode(mode) {
        if (!['auto','quadrant'].includes(mode)) {
            console.warn('Unknown layout mode', mode);
            return;
        }
        this.state.layoutMode = mode;
        this._log('layout', '[LayoutMode] switched', mode);
        if (this.state.radialMenuOpen) {
            // Full re-render to recalc clustering & family arcs under new layout
            this.renderRadialMenu();
        }
    }

    /**
     * Clear the current progression and any overlays
     */
    clearProgression() {
        this.state.progressionDegrees = [];
        this.state.progressionOverlays = [];
        this.render();
        this.emit('progressionCleared');
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in UnifiedChordExplorer event listener (${event}):`, error);
                }
            });
        }
    }

    /**
     * Compute a Roman-style label for a substitution when it's displayed as an overlay.
     * Always returns the roman numeral representing the root degree, with case based on quality.
     * Never returns 'parallel' or other labels - always the degree with accidentals if needed.
     */
    computeRomanLabelForSubstitution(originalChord, substitution) {
        // Ensure scale chords and progression sequence are available
        this.generateScaleChords();
        const seq = this.state.progressionSequence || this.ensureProgressionSequence();

        // 1) Exact diatonic match (same root AND type)
        const match = this.state.scaleChords.find(sc => sc.root === substitution.root && sc.chordType === substitution.chordType);
        if (match) return this.toRomanNumeral(match.degree, match.chordType);

        // 2) Same root but different quality (e.g., iii -> III): find the diatonic degree for this root
        const rootMatch = this.state.scaleChords.find(sc => sc.root === substitution.root);
        if (rootMatch) {
            // Use the diatonic degree number but apply case/symbols based on the substitution's quality
            return this.toRomanNumeral(rootMatch.degree, substitution.chordType);
        }

        // 3) Context-aware secondary dominant detection: if substitution functions as V of the next/previous degree,
        //    label as V/<target> (prefer next chord as resolution)
        try {
            const idx = seq.findIndex(e => e && e.type === 'degree' && e.degree === (originalChord && originalChord.degree));
            const neighbors = [];
            if (idx !== -1) {
                if (seq[idx + 1]) neighbors.push(seq[idx + 1]);
                if (seq[idx - 1]) neighbors.push(seq[idx - 1]);
            }
            for (const nb of neighbors) {
                if (!nb || nb.type !== 'degree') continue;
                const targetDeg = nb.degree;
                const targetChord = this.state.scaleChords.find(sc => sc.degree === targetDeg);
                if (!targetChord) continue;
                // compute the V of the targetChord (perfect fifth above target root)
                const vRoot = this.noteFromInterval(targetChord.root, 7);
                if (vRoot && substitution.root && vRoot === substitution.root) {
                    // Use uppercase V and the roman numeral of the target degree
                    const targetRN = this.toRomanNumeral(targetDeg, targetChord.chordType);
                    return `V/${targetRN}`;
                }
            }
        } catch (e) {
            // ignore and fallback
        }

        // 4) Non-diatonic root: compute accidental roman numeral (bII, #IV, etc.) with case based on quality
        return this.computeAccidentalRoman(substitution.root, substitution.chordType);
    }

    /**
     * Compute accidental Roman numeral (bII, #IV, etc.) with case for quality.
     * Returns ASCII 'b' for flats as per user expectation (e.g., 'bii').
     */
    computeAccidentalRoman(root, chordType) {
        if (!root) return '';
        const tonic = this.state.currentKey || 'C';
        const noteVals = this.musicTheory.noteValues || {};
        const chroma = this.musicTheory.chromaticNotes || [];
        const tVal = noteVals[tonic];
        const rVal = noteVals[root];
        if (tVal == null || rVal == null) return root;
        let dist = (rVal - tVal + 12) % 12; // semitone distance up from tonic
        // Map distance to base degree + accidental preference (prefer flats typical to tonal analysis)
        const map = {
            0: { acc: '', deg: 'I' },
            1: { acc: 'b', deg: 'II' }, // could be #I but use bII
            2: { acc: '', deg: 'II' },
            3: { acc: 'b', deg: 'III' },
            4: { acc: '', deg: 'III' },
            5: { acc: '', deg: 'IV' },
            6: { acc: '#', deg: 'IV' }, // could treat as bV; choose #IV for clarity
            7: { acc: '', deg: 'V' },
            8: { acc: 'b', deg: 'VI' },
            9: { acc: '', deg: 'VI' },
            10: { acc: 'b', deg: 'VII' },
            11: { acc: '', deg: 'VII' }
        };
        const entry = map[dist];
        if (!entry) return root;
        const quality = (chordType || '').toLowerCase();
    const isMinor = /^m(?!aj)/.test(quality) && !/m7b5|ø/.test(quality) && !/dim|°/.test(quality);
    const isDim = /(^dim$|^dim7$|°)/.test(quality);
    const isHalfDim = /m7b5|ø/.test(quality);
        let numeral = entry.acc + entry.deg;
        // Lowercase for minor/diminished/half-diminished
        if (isMinor || isDim || isHalfDim) numeral = numeral.toLowerCase();
        // Append symbols ø or ° if desired for diminished flavors (retain user style with plain letters except example wants 'bii')
        if (isHalfDim) numeral = numeral + 'ø';
        if (isDim) numeral = numeral + '°';
        return numeral;
    }

    /**
     * Open insertion radial menu for adding a passing chord before/after a progression slot
     * @param {number} targetDegree - degree in the scale to insert around
     * @param {'before'|'after'} position - where to insert relative to the target degree
     * @param {HTMLElement} anchorElement - element to anchor the radial menu to (optional)
     */
    openInsertionRadialMenu(targetDegree, position = 'after', anchorElement = null, seqIndex = null) {
        // Find chord info for the target degree
        this.generateScaleChords();
        const originalChord = this.state.scaleChords.find(c => c.degree === targetDegree);
        if (!originalChord) return;

        // store insertion context so selection handler can access it
    this.insertionContext = { degree: targetDegree, position, seqIndex: (typeof seqIndex === 'number') ? seqIndex : null };

        // Generate substitutions (reuse same rich logic)
        this.state.substitutions = this.generateSubstitutions(originalChord);

        // Use the same menu rendering flow but use a slightly different click handler
        // Compute menu position: anchor element center or centered in viewport
        // Always center insertion radial menu in the viewport (consistent with substitution radial menu)
        if (this.radialCenterOnOpen) {
            this.state.radialMenuPosition = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
        } else if (anchorElement && anchorElement.getBoundingClientRect) {
            const rect = anchorElement.getBoundingClientRect();
            this.state.radialMenuPosition = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        } else {
            // fallback center
            this.state.radialMenuPosition = { x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2) };
        }

        // mark selectedChord for UI center display
        this.state.selectedChord = originalChord;
        this.state.radialMenuOpen = true;

        // Render a menu specialized for insertion (nodes will call selectInsertionSubstitution)
        this.renderInsertionRadialMenu();
        this.emit('radialMenuOpened', { mode: 'insertion', original: originalChord, substitutions: this.state.substitutions });
    }

    /**
     * Render radial menu for insertion mode. Mostly reuses renderRadialMenu but wires selection to insertion.
     */
    renderInsertionRadialMenu() {
        // Remove existing menu
        if (this.radialMenu) {
            this.radialMenu.remove();
        }

        // Create overlay and keep a reference so it can be removed later
        const overlay = document.createElement('div');
        overlay.className = 'radial-menu-overlay insertion-mode';
        overlay.addEventListener('click', () => this.closeRadialMenu());
        this.radialOverlay = overlay;

        this.radialMenu = document.createElement('div');
        this.radialMenu.className = 'radial-menu insertion-mode';
        this.radialMenu.style.left = `${this.state.radialMenuPosition.x}px`;
        this.radialMenu.style.top = `${this.state.radialMenuPosition.y}px`;

        const center = document.createElement('div');
        center.className = 'radial-center insertion';
        center.innerHTML = `
            <div class="center-chord">${this.state.selectedChord.fullName}</div>
            <div class="center-label">insert ${this.insertionContext && this.insertionContext.position}</div>
            <div class="center-hint">choose passing chord</div>
        `;
        this.radialMenu.appendChild(center);

        const familyGroups = this.groupSubstitutionsByFamily(this.state.substitutions);
        const positioned = this.calculateOptimalRadialPositions(familyGroups);
        this.renderFamilyArcs(familyGroups, positioned);

        // Cluster insertion substitutions similarly to main menu to keep UI consistent
        const { displaySubs, hiddenSubs } = this.filterSubstitutionsForDisplay(this.state.substitutions);
        const effectiveSubs = displaySubs; // align with main menu terminology for summary
        const clusters = this._createClustersFromSubs(displaySubs, this.clusterThreshold || 3);
        const positionedMap = new Map();
        positioned.forEach(p => positionedMap.set(p._uid || `${p.root}:${p.chordType}:${p.fullName}`, p));

        // Render cluster placeholders
    Object.entries(clusters.clusters).forEach(([key, members]) => {
            if (members.length < clusters.threshold) return;
            const memberPositions = members.map(m => positionedMap.get(m._uid || `${m.root}:${m.chordType}:${m.fullName}`)).filter(Boolean);
            if (memberPositions.length === 0) return;
            const avgX = Math.round(memberPositions.reduce((s, v) => s + v.x, 0) / memberPositions.length);
            const avgY = Math.round(memberPositions.reduce((s, v) => s + v.y, 0) / memberPositions.length);
            const avgAngle = Math.round(memberPositions.reduce((s, v) => s + v.angle, 0) / memberPositions.length);

            const clusterNode = document.createElement('div');
            clusterNode.className = `radial-node cluster family-${members[0].family}`;
            clusterNode.style.transform = `translate(${avgX}px, ${avgY}px)`;
            clusterNode.innerHTML = `
                <div class="node-chord">${members[0].root} · ${members.length} options</div>
                <div class="node-label">group</div>
            `;
            clusterNode.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openGroupedSubmenu(members, `${members[0].root} substitutions`);
            });
            clusterNode.addEventListener('mouseenter', () => {
                this.emit('substitutionGroupHover', { root: members[0].root, members, mode: 'insertion' });
            });

            this.radialMenu.appendChild(clusterNode);
            const line = document.createElement('div');
            line.className = `radial-line family-${members[0].family}`;
            const length = Math.sqrt(avgX * avgX + avgY * avgY);
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${avgAngle}deg)`;
            this.radialMenu.appendChild(line);
        });

        // Populate center summary now that effectiveSubs is defined
        try {
            const totalCount = this.state.substitutions.length;
            const containerCount = this.state.substitutions.filter(s => s.type === 'container').length;
            const clusteredRoots = (effectiveSubs || []).filter(s => s.type === 'container_root_cluster').map(s => s.root);
            const clusterInfo = clusteredRoots.length ? `<div class=\"center-summary-line\">Clusters: ${clusteredRoots.join(', ')} </div>` : '';
            const modeLine = this.state.exhaustiveMode ? 'Exhaustive' : 'Curated';
            
            // Get grading information for the original chord
            const originalGrading = this.getOriginalChordGrading(this.state.selectedChord);
            const gradingInfo = originalGrading ? `<div class=\"center-grading\" style=\"color: ${originalGrading.color}\">${originalGrading.short} ${originalGrading.name}</div>` : '';
            
            // Count substitutions by tier for summary
            const tierCounts = {};
            effectiveSubs.forEach(sub => {
                const tier = sub.tier !== undefined ? sub.tier : 0;
                tierCounts[tier] = (tierCounts[tier] || 0) + 1;
            });
            const tierSummary = Object.entries(tierCounts)
                .sort(([a], [b]) => b - a) // Sort by tier descending
                .map(([tier, count]) => {
                    const tierInfo = this.musicTheory.getGradingTierInfo(parseInt(tier));
                    return `<span style="color: ${tierInfo.color}">${tierInfo.short}:${count}</span>`;
                })
                .join(' ');
            
            center.innerHTML = `
                <div class=\"center-chord\">${this.state.selectedChord.fullName}</div>
                <div class=\"center-label\">original • ${modeLine}</div>
                ${gradingInfo}
                <div class=\"center-hint\">select substitution</div>
                <div class=\"center-summary\">
                    <div class=\"center-summary-line\">Total: ${totalCount}</div>
                    <div class=\"center-summary-line\">Tiers: ${tierSummary}</div>
                    ${clusterInfo}
                </div>
            `;
        } catch (e) {
            center.innerHTML = `<div class=\"center-chord\">${this.state.selectedChord.fullName}</div><div class=\"center-label\">original</div>`;
            console.warn('[renderRadialMenu] Failed to build summary', e);
        }

        // Render non-clustered nodes
        positioned.forEach(sub => {
            const groupKey = `${sub.family}::${sub.root}`;
            const cluster = clusters.clusters[groupKey];
            if (cluster && cluster.length >= clusters.threshold) return;

            const node = document.createElement('div');
            node.className = `radial-node family-${sub.family}`;
            node.style.transform = `translate(${sub.x}px, ${sub.y}px)`;
            
            // Apply grading color dynamically
            if (sub.color) {
                node.style.borderColor = sub.color;
                node.style.boxShadow = `0 0 8px ${sub.color}40`;
            }
            node.innerHTML = `
                <div class="node-chord">${sub.fullName}</div>
                <div class="node-label">${sub.label}</div>
                ${sub.grade ? `<div class="node-grade">${this.formatGrade(sub.grade)}</div>` : ''}
            `;

            // Click handler - insertion flow
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectInsertionSubstitution(sub);
            });

            // Hover event for preview
            node.addEventListener('mouseenter', () => {
                this.emit('substitutionHover', { substitution: sub, original: this.state.selectedChord, mode: 'insertion' });
            });

            this.radialMenu.appendChild(node);

            const line = document.createElement('div');
            line.className = `radial-line family-${sub.family}`;
            const length = Math.sqrt(sub.x * sub.x + sub.y * sub.y);
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${sub.angle}deg)`;
            this.radialMenu.appendChild(line);
        });

        // More cluster for insertion menu
        if (hiddenSubs && hiddenSubs.length > 0) {
            const moreRadius = 150;
            const angle = 100;
            const rad = (angle * Math.PI) / 180;
            const mx = Math.cos(rad) * moreRadius;
            const my = Math.sin(rad) * moreRadius;

            const moreNode = document.createElement('div');
            moreNode.className = `radial-node more-cluster`;
            moreNode.style.transform = `translate(${mx}px, ${my}px)`;
            moreNode.innerHTML = `<div class="node-chord">More · ${hiddenSubs.length}</div><div class="node-label">show all</div>`;
            moreNode.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openGroupedSubmenu(hiddenSubs, 'More substitutions');
            });
            this.radialMenu.appendChild(moreNode);
            const line = document.createElement('div');
            line.className = `radial-line more-cluster`;
            const length = Math.sqrt(mx * mx + my * my);
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${angle}deg)`;
            this.radialMenu.appendChild(line);
        }

        overlay.appendChild(this.radialMenu);
        document.body.appendChild(overlay);
        this.state.radialMenuOpen = true;
    }

    /**
     * Handler when a substitution is selected from an insertion radial menu
     */
    selectInsertionSubstitution(substitution) {
        if (!this.insertionContext) return;
        try {
            this.insertPassingChordAt(this.insertionContext.degree, substitution, this.insertionContext.position, true, this.insertionContext.seqIndex);
        } catch (err) {
            console.warn('Error inserting passing chord:', err);
        }

        // close menu and emit event
        this.closeRadialMenu();
        this.emit('passingChordInserted', { targetDegree: this.insertionContext.degree, position: this.insertionContext.position, substitution });
        this.insertionContext = null;
    }

    /**
     * Ensure there is a progressionSequence array representing ordered progression entries.
     * If not present, build from progressionDegrees as simple degree entries.
     */
    ensureProgressionSequence() {
        if (!this.state.progressionSequence || !Array.isArray(this.state.progressionSequence)) {
            const seq = [];
            (this.state.progressionDegrees || []).forEach(d => {
                seq.push({ type: 'degree', degree: d });
            });
            this.state.progressionSequence = seq;
        }
        return this.state.progressionSequence;
    }

    /**
     * Find an overlay for a given sequence index or fallback to degree-based lookup.
     * Prefers seqIndex for precision when there are repeated degrees.
     */
    findOverlayFor(seqIndex, degree) {
        const overlays = this.state.progressionOverlays || [];
        if (typeof seqIndex === 'number') {
            const byIndex = overlays.find(o => typeof o.seqIndex === 'number' && o.seqIndex === seqIndex);
            if (byIndex) return byIndex;
        }
        if (typeof degree === 'number') {
            const byDegree = overlays.find(o => o.degree === degree);
            if (byDegree) return byDegree;
        }
        return null;
    }

    /**
     * Insert a passing chord (substitution) into the progression sequence before/after a given degree
     * This creates or updates `state.progressionSequence` and keeps `progressionDegrees` in sync for compatibility.
     */
    insertPassingChordAt(degree, substitution, position = 'after', insertionMode = false, seqIndex = null) {
        // Build sequence if needed
        const seq = this.ensureProgressionSequence();

        // Determine precise insertion index in sequence
        let targetSeqIndex = -1;
        if (typeof seqIndex === 'number' && seq[seqIndex] && seq[seqIndex].type === 'degree' && seq[seqIndex].degree === degree) {
            targetSeqIndex = seqIndex;
        } else {
            // Fallback to first occurrence of the degree
            targetSeqIndex = seq.findIndex(e => e.type === 'degree' && e.degree === degree);
        }

        const insertIndex = (position === 'before')
            ? (targetSeqIndex !== -1 ? targetSeqIndex : seq.length)
            : (targetSeqIndex !== -1 ? targetSeqIndex + 1 : seq.length);

        const item = this._createInsertedItem(degree, substitution);
        seq.splice(insertIndex, 0, item);

        // Sync progressionDegrees (keep only the main degree entries)
        this.state.progressionDegrees = seq.filter(e => e.type === 'degree').map(e => e.degree);

        // Do NOT record overlays for insertions: inserted items are rendered as their own cards.
        // Overlays are reserved for replacements so we don't accidentally "replace" the original degree visually.

        // Try to also update the Number Generator with a diatonic degree for this substitution
        try {
            const diatonicMatch = this.state.scaleChords.find(sc => sc.root === substitution.root && sc.chordType === substitution.chordType);
            const rootApprox = this.state.scaleChords.find(sc => sc.root === substitution.root);
            if (this.numberGenerator) {
                const numbers = (this.numberGenerator.getCurrentNumbers && this.numberGenerator.getCurrentNumbers()) ? [...this.numberGenerator.getCurrentNumbers()] : [];
                // Map sequence index to numbers index by counting degree entries up to target degree occurrence
                let degIndexInNumbers;
                if (typeof seqIndex === 'number' && seq[seqIndex] && seq[seqIndex].type === 'degree') {
                    const countUpTo = seq.slice(0, seqIndex + 1).filter(e => e.type === 'degree').length;
                    degIndexInNumbers = Math.max(0, countUpTo - 1);
                } else {
                    // Fallback: find first occurrence mapping
                    const firstDegSeqIdx = seq.findIndex(e => e.type === 'degree' && e.degree === degree);
                    const countUpTo = firstDegSeqIdx === -1 ? numbers.length : Math.max(0, seq.slice(0, firstDegSeqIdx + 1).filter(e => e.type === 'degree').length - 1);
                    degIndexInNumbers = countUpTo;
                }
                const insertAt = position === 'before' ? degIndexInNumbers : degIndexInNumbers + 1;

                if (diatonicMatch) {
                    // Diatonic substitution: insert its exact degree into numbers
                    numbers.splice(insertAt, 0, diatonicMatch.degree);
                    if (this.numberGenerator.setNumbers) {
                        this.numberGenerator.setNumbers(numbers, this.numberGenerator.getNumberType ? this.numberGenerator.getNumberType() : undefined);
                    }
                } else {
                    // Non-diatonic substitution: do NOT insert a diatonic proxy into numbers.
                    // Always register chromatic insertion for downstream visualization without altering numbers.
                    if (this.numberGenerator.registerChromaticInsertion) {
                        this.numberGenerator.registerChromaticInsertion({
                            index: insertAt,
                            contextDegree: degree,
                            root: substitution.root,
                            chordType: substitution.chordType,
                            roman: this.computeAccidentalRoman(substitution.root, substitution.chordType)
                        });
                    }
                }
            }
        } catch (e) { console.warn('[UnifiedChordExplorer] Failed to sync NumberGenerator on insertion', e); }

        // Re-render UI
        this.render();
        // Reflect full sequence (including inserted chords) in NumberGenerator via Roman tokens
        try { if (this.numberGenerator && this.numberGenerator.setDisplayTokens) { const seqTokens = this.buildSequenceRomanTokens(); this.numberGenerator.setDisplayTokens(seqTokens, { rawTokens: seqTokens }); } } catch(e){}
        // Emit sequence changed event so other modules can hook into richer ordering if desired
        this.emit('progressionSequenceChanged', { sequence: this.state.progressionSequence });
    }

    /**
     * Helper to create an inserted sequence item
     */
    _createInsertedItem(originDegree, substitution) {
        return {
            type: 'inserted',
            fromDegree: originDegree,
            substitution: substitution,
            displayName: substitution.fullName || `${substitution.root}${substitution.chordType || ''}`,
            notes: substitution.notes || this.musicTheory.getChordNotes(substitution.root, substitution.chordType)
        };
    }

    /**
     * Build a token list (Roman numerals / accidental numerals / secondary dominant labels) representing the current sequence.
     */
    buildSequenceRomanTokens() {
        if (this.state && Array.isArray(this.state.previewManualTokens) && this.state.previewManualTokens.length) {
            return this.state.previewManualTokens.slice();
        }
        const seq = this.ensureProgressionSequence();
        this.generateScaleChords();
        const tokens = [];
        seq.forEach((entry, idx) => {
            if (entry.type === 'degree') {
                // If a non-diatonic overlay exists for this sequence index/degree, prefer its roman
                const overlay = this.findOverlayFor(idx, entry.degree);
                if (overlay && overlay.substitution) {
                    const rn = overlay.romanLabel || this.computeRomanLabelForSubstitution(
                        this.state.scaleChords.find(c => c.degree === entry.degree),
                        overlay.substitution
                    );
                    tokens.push(rn || (overlay.substitution.fullName || '?'));
                } else {
                    const sc = this.state.scaleChords.find(c => c.degree === entry.degree);
                    if (sc) tokens.push(this.toRomanNumeral(sc.degree, sc.chordType));
                    else tokens.push(String(entry.degree));
                }
            } else if (entry.type === 'inserted' && entry.substitution) {
                // Attempt diatonic mapping first
                const diat = this.state.scaleChords.find(c => c.root === entry.substitution.root && c.chordType === entry.substitution.chordType);
                if (diat) {
                    tokens.push(this.toRomanNumeral(diat.degree, diat.chordType));
                } else {
                    // Use contextual original degree (fromDegree) to compute a secondary dominant or accidental label
                    const ref = this.state.scaleChords.find(c => c.degree === entry.fromDegree);
                    if (ref) {
                        const rn = this.computeRomanLabelForSubstitution(ref, entry.substitution);
                        tokens.push(rn || (entry.substitution.fullName || '?'));
                    } else {
                        tokens.push(this.computeAccidentalRoman(entry.substitution.root, entry.substitution.chordType));
                    }
                }
            }
        });
        return tokens;
    }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedChordExplorer;
}
