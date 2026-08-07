// Instrument module loader for landing menu
window.showLearnNotesModule = function(instrument) {
    // Hide landing and studio UI so the learn page becomes a full standalone view
    const landing = document.getElementById('landing-page');
    const workspace = document.querySelector('.workspace');
    const controlDeck = document.querySelector('.control-deck');
    const bottomDeck = document.querySelector('.bottom-deck');
    if (landing) landing.style.display = 'none';
    if (workspace) workspace.style.display = 'none';
    if (controlDeck) controlDeck.style.display = 'none';
    if (bottomDeck) bottomDeck.style.display = 'none';

    // Hide all learn pages
    document.getElementById('learn-piano-page').style.display = 'none';
    document.getElementById('learn-guitar-page').style.display = 'none';
    // Show the selected instrument's learn page
    if (instrument === 'guitar') {
        document.getElementById('learn-guitar-page').style.display = 'block';
        // Dynamically load the module only if the class isn't already available
        if (!window.LearnGuitarNotes) {
            const existingScript = document.querySelector('script[src="learn-guitar-notes.js"]');
            if (!existingScript && !window.learnGuitarNotesLoaded) {
                const script = document.createElement('script');
                script.src = 'learn-guitar-notes.js';
                script.onload = () => { window.learnGuitarNotesLoaded = true; window.mountLearnModuleIfReady('guitar'); };
                document.body.appendChild(script);
            } else {
                // If the script tag exists or was previously loaded, attempt to mount
                window.mountLearnModuleIfReady('guitar');
            }
        } else {
            window.mountLearnModuleIfReady('guitar');
        }
    } else {
        document.getElementById('learn-piano-page').style.display = 'block';
        // Dynamically load the module only if the class isn't already available
        if (!window.LearnPianoNotes) {
            const existingScript = document.querySelector('script[src="learn-piano-notes.js"]');
            if (!existingScript && !window.learnPianoNotesLoaded) {
                const script = document.createElement('script');
                script.src = 'learn-piano-notes.js';
                script.onload = () => { window.learnPianoNotesLoaded = true; window.mountLearnModuleIfReady('piano'); };
                document.body.appendChild(script);
            } else {
                window.mountLearnModuleIfReady('piano');
            }
        } else {
            window.mountLearnModuleIfReady('piano');
        }
    }
};

// Mount modules after load (or immediately if already available)
window.mountLearnModuleIfReady = function(instrument) {
    if (instrument === 'guitar') {
        if (window.LearnGuitarNotes && !window._learnGuitarInstance) {
            window._learnGuitarInstance = new window.LearnGuitarNotes();
            window._learnGuitarInstance.mount('#learn-guitar-notes-container');
        } else if (window._learnGuitarInstance) {
            // already created
        }
    } else {
        if (window.LearnPianoNotes && !window._learnPianoInstance) {
            window._learnPianoInstance = new window.LearnPianoNotes();
            window._learnPianoInstance.mount('#learn-piano-notes-container');
        }
    }
};
// ==================== MODULAR APPLICATION ====================
        class ModularMusicTheoryApp {
            constructor() {
                // Internal state for piano connector retry/backoff to avoid noisy logs
                this._pianoConnectorRetryCount = 0;
                this._pianoConnectorLastZeroLogTime = 0;
                this._pianoConnectorMaxRetries = 20;
                this._pianoConnectorRetryBaseDelay = 250; // ms

                // Use high-quality sampled piano if available, fallback to simple synth
                this.audioEngine = typeof PianoSampleEngine !== 'undefined' 
                    ? new PianoSampleEngine() 
                    : new SimpleAudioEngine();
                
                // Create a separate guitar engine (plucked/triangle tone) to avoid using sampled piano for guitar
                try {
                    this.guitarEngine = typeof EnhancedAudioEngine !== 'undefined'
                        ? new EnhancedAudioEngine({ 
                            masterVolume: 0.25, 
                            oscillatorType: 'triangle', 
                            useReverb: true, 
                            reverbAmount: 0.1,
                            attackTime: 0.01,
                            sustainTime: 0.1,
                            releaseTime: 0.8
                        })
                        : null;
                    if (this.guitarEngine && typeof this.guitarEngine.init === 'function') this.guitarEngine.init();
                } catch (e) {
                    console.warn('Failed to initialize guitarEngine:', e);
                    this.guitarEngine = null;
                }
                
                // Initialize MIDI input manager (defaulted to Piano Engine)
                this.midiManager = typeof MIDIInputManager !== 'undefined'
                    ? new MIDIInputManager(this.audioEngine)
                    : null;
                
                this.musicTheory = new MusicTheoryEngine();
                this.numberGenerator = new NumberGenerator();
                this.numberGenerator.connectMusicTheory(this.musicTheory); // Connect for intelligent generation
                this.scaleLibrary = new ScaleLibrary(this.musicTheory);
                
                // Inject Piano Engine into Piano Visualizer
                this.pianoVisualizer = new PianoVisualizer({
                    container: '#piano-container',
                    audioEngine: this.audioEngine,
                    startMidi: 21,
                    // Focused view: show 1 octave + a small buffer around it
                    // Show a wider window so the keyboard doesn't feel tiny,
                    // while keeping the scale octave centered in the displayed range.
                    octaves: 3,
                    whiteKeyWidth: 34,
                    whiteKeyHeight: 140,
                    blackKeyHeight: 95,
                    autoFitHeight: true,
                    showFingering: false,
                    showRomanNumerals: true,
                    fitToContainer: true,
                    showNoteLabels: false,
                    showTooltips: false,
                    showGradingTooltips: false
                });
                
                // Inject Guitar Engine into Guitar Fretboard
                this.guitarFretboard = new GuitarFretboardVisualizer({ 
                    container: '#guitar-container',
                    audioEngine: this.guitarEngine,
                    frets: 22, 
                    showNoteLabels: true 
                });
                
                this.containerChordTool = new ContainerChordTool(this.musicTheory);
                this.scaleRelationshipExplorer = new ScaleRelationshipExplorer(this.musicTheory);
                this.scaleCircleExplorer = new ScaleCircleExplorer(this.musicTheory);
                this.solarSystem = typeof SolarSystemVisualizer !== 'undefined' ? new SolarSystemVisualizer(this.musicTheory) : null;
                this.audioVisualizer = typeof AudioVisualizer !== 'undefined' ? new AudioVisualizer() : null;
                // Generative Engines Initialization
                this.intelligenceEngine = typeof ScaleIntelligenceEngine !== 'undefined' ? new ScaleIntelligenceEngine(this.musicTheory) : null;

                this.sheetMusicGenerator = new SheetMusicGenerator(this.musicTheory);

                // Initialize grading legend and help system (guard against missing module)
                if (typeof GradingLegendHelpSystem === 'function') {
                    try {
                        this.gradingHelpSystem = new GradingLegendHelpSystem(this.musicTheory);
                    } catch (e) {
                        console.warn('GradingLegendHelpSystem construction failed:', e);
                    }
                } else {
                    // Quietly skip if module not loaded
                    console.info && console.info('GradingLegendHelpSystem not loaded; skipping.');
                }



                this.initialize();
            }

            initialize() {
                this.setupModuleIntegration();
                this.setupEventHandlers();
                this.renderInitialState();
                // Initial mini chord strip render
                try { this.renderMiniChordStrip(this.scaleLibrary.getCurrentKey(), this.scaleLibrary.getCurrentScale()); } catch(_){}
                // Setup sticky scroll behavior for mini chord strip
                try { this.setupMiniStripScrollBehavior(); } catch(e){ console.warn('Sticky mini strip setup failed', e); }
            }

            /**
             * Render the mini chord strip across the top with Roman numerals for the current key/scale.
             */
            /**
             * Uppercase roman numeral for a scale degree, without wrapping at VII.
             * Delegates to the number generator so both views agree on numbering.
             */
            degreeNumeral(degree) {
                if (this.numberGenerator && typeof this.numberGenerator.degreeToRomanNumeral === 'function') {
                    return this.numberGenerator.degreeToRomanNumeral(degree);
                }
                return String(degree);
            }

            renderMiniChordStrip(key, scale) {
                try {
                    const host = document.getElementById('mini-chord-strip');
                    if (!host) return;
                    // One chord per note in the scale — 5 for pentatonic, 8 for
                    // octatonic — rather than always assuming a seven-note scale.
                    let scaleNotes = [];
                    try { scaleNotes = this.musicTheory.getScaleNotes(key, scale) || []; } catch(_) { scaleNotes = []; }
                    const degreeCount = scaleNotes.length || 7;
                    const scaleName = String(scale || '').toLowerCase();
                    const isMajorish = /major|ionian/.test(scaleName);
                    const isMinorish = /minor|aeolian/.test(scaleName);
                    // Default mapping arrays for diatonic 7ths (descriptive forms)
                    const major7ths = ['maj7','m7','m7','maj7','7','m7','m7b5'];
                    const minor7ths = ['m7','m7b5','maj7','m7','m7','maj7','7'];
                    const items = [];
                    for (let degree = 1; degree <= degreeCount; degree++) {
                        let chord = null;
                        try { chord = this.musicTheory.getDiatonicChord(degree, key, scale) || {}; } catch(_) { chord = {}; }
                        const type = (chord.chordType || '').toLowerCase();
                        const isHalfDim = /m7b5|ø/.test(type);
                        const isDim = /dim|°/.test(type) && !isHalfDim;
                        const isMinor = /^m(?!aj)/.test(type) && !isHalfDim; // plain minor qualities
                        let label = this.degreeNumeral(degree);
                        let cls = 'maj';
                        if (isHalfDim) { label = label.toLowerCase() + 'ø'; cls = 'dim'; }
                        else if (isDim) { label = label.toLowerCase() + '°'; cls = 'dim'; }
                        else if (isMinor) { label = label.toLowerCase(); cls = 'min'; }
                        // Build 7th chord name (prefer explicit chordType and map to descriptive labels)
                        let seventh = '';
                        if (isMajorish) {
                            seventh = major7ths[(degree - 1) % major7ths.length];
                        } else if (isMinorish) {
                            seventh = minor7ths[(degree - 1) % minor7ths.length];
                        } else {
                            // Fallback from chordType: prefer explicit chord.chordType when present,
                            // and prioritize descriptive forms for aug and half-dim.
                            const ct = chord.chordType || '';
                            if (/m7b5|ø/.test(ct) || isHalfDim) seventh = 'halfdim7';
                            else if (/dim7|°/.test(ct) || isDim) seventh = 'dim7';
                            else if (/m7#5/.test(ct)) seventh = 'aug(min7)';
                            else if (/maj7#5/.test(ct) || /\+maj7/.test(ct)) seventh = 'aug(maj7)';
                            else if (/mMaj7/i.test(ct)) seventh = 'mMaj7';
                            else if (/maj7/i.test(ct) || /maj7/i.test(type)) seventh = 'maj7';
                            else if (/m7(?!b5)/i.test(ct) || isMinor) seventh = 'm7';
                            else if (/7(?![a-zA-Z])/i.test(ct) || /7(?![a-zA-Z])/i.test(type)) seventh = '7';
                            else seventh = ct || '7';
                        }
                        // Prefer the explicit chord.chordType when available to preserve modifiers
                        const chordName = (chord.root || '') + ((chord.chordType && chord.chordType.length) ? chord.chordType : seventh);
                        items.push(`<div class=\"mini-chord-item ${cls}\" data-degree=\"${degree}\" title=\"Degree ${degree}\"><div class=\"mini-rn\">${label}</div><div class=\"mini-name\">${chordName}</div></div>`);
                    }
                    host.innerHTML = items.join('');
                } catch (e) { /* noop */ }
            }

            /**
             * Keep mini chord strip visible (fixed) until chord explorer module scrolls into view.
             * Removes sticky when chord explorer top edge is near/above viewport top to avoid overlay.
             */
            setupMiniStripScrollBehavior() {
                const strip = document.getElementById('mini-chord-strip');
                const chordModule = document.querySelector('.planet-module[data-module="chord"]');
                if (!strip || !chordModule) return;

                // Spacer to prevent layout shift when strip becomes fixed
                let spacer = document.getElementById('mini-chord-strip-spacer');
                if (!spacer) {
                    spacer = document.createElement('div');
                    spacer.id = 'mini-chord-strip-spacer';
                    spacer.style.height = strip.offsetHeight + 'px';
                    spacer.style.gridColumn = '1 / -1';
                    strip.parentNode.insertBefore(spacer, strip.nextSibling);
                }

                // Make the mini chord strip persistently visible (always sticky)
                // Keep the spacer to prevent layout shift, but avoid dynamic un-sticking.
                if (!strip.classList.contains('sticky')) strip.classList.add('sticky');
                // Ensure spacer height stays correct on resize
                window.addEventListener('resize', () => {
                    spacer.style.height = strip.offsetHeight + 'px';
                });
            }

            /**
             * The sheet says what is sounding; the instruments show it.
             *
             * Wired here rather than inside either side, because neither should
             * know about the other: the sheet broadcasts note names, and any
             * instrument that can draw notes listens. The toggle lives on the
             * sheet's toolbar and is read at delivery time, so switching it
             * takes effect on whatever is already lit.
             */
            setupInstrumentFocus() {
                const instruments = () => [this.pianoVisualizer, this.guitarFretboard]
                    .filter(v => v && typeof v.setFocusNotes === 'function');

                const release = () => instruments().forEach(v => {
                    try { v.clearFocusNotes(); } catch (_) {}
                });

                window.addEventListener('sheetInstrumentFocus', (e) => {
                    try {
                        const d = (e && e.detail) || {};
                        const mode = (this.sheetMusicGenerator
                            && this.sheetMusicGenerator.state
                            && this.sheetMusicGenerator.state.instrumentFocusMode) || 'both';

                        if (mode === 'off') { release(); return; }

                        const chord = Array.isArray(d.chordNotes) ? d.chordNotes : [];
                        const melody = Array.isArray(d.melodyNotes) ? d.melodyNotes : [];

                        // Melody first when both are wanted and both are present:
                        // the tune is the thing being followed, and it is the one
                        // note among several that would otherwise be lost in the
                        // chord under it.
                        let notes = [];
                        let kind = 'chord';
                        if (mode === 'chords') { notes = chord; }
                        else if (mode === 'melody') { notes = melody; kind = 'melody'; }
                        else {
                            notes = melody.concat(chord);
                            kind = melody.length ? 'melody' : 'chord';
                        }

                        if (!notes.length) { release(); return; }
                        instruments().forEach(v => {
                            try { v.setFocusNotes(notes, { kind }); } catch (_) {}
                        });
                    } catch (err) {
                        console.warn('[App] instrument focus failed:', err);
                    }
                });
            }

            setupModuleIntegration() {
                this.setupInstrumentFocus();

                // Connect number generator to container chord tool
                this.numberGenerator.on('numbersChanged', (data) => {
                    const scaleNotes = this.scaleLibrary.getCurrentScaleNotes();
                    const preferred = data.numbers.map(num => {
                        if (typeof num === 'number') {
                            return { note: scaleNotes[(num - 1) % scaleNotes.length], degree: num };
                        }
                        return { note: num, degree: null };
                    });
                    // Use generated notes to bias sorting (single-note mode for selection)
                    this.containerChordTool.setPreferredNotes(preferred);
                    
                    // NOTE: do NOT auto-select generated notes as input by default.
                    // We only want the generated notes to bias sorting (preferredNotes).
                    // Automatically selecting them caused every generated note to be highlighted,
                    // which is not desirable. Clear any selection so nothing is highlighted.
                    // If a developer wants automatic selection later, call setInputNotes explicitly.
                    if (this.containerChordTool && typeof this.containerChordTool.setSelectedNote === 'function') {
                        this.containerChordTool.setSelectedNote('');
                    }
                    

                });

                // Connect scale library to other modules
                this.scaleLibrary.on('scaleChanged', (data) => {
                    const currentNumbers = this.numberGenerator.getCurrentNumbers();
                    // Only auto-resize the degree run if the user hasn't customized it,
                    // so switching scales doesn't silently discard a hand-built progression.
                    const wasFullScaleRun = this.isFullScaleRun(currentNumbers);
                    if (currentNumbers.length > 0) {
                        this.numberGenerator.emit('numbersChanged', {
                            numbers: currentNumbers,
                            type: this.numberGenerator.getNumberType(),
                            source: 'scale_change'
                        });
                    }

                    // Update progression builder with new key/scale context

                    // Keep container chord tool in sync with key/scale context
                    if (this.containerChordTool && this.containerChordTool.setKeyAndScale) {
                        this.containerChordTool.setKeyAndScale(data.key, data.scale);
                    }

                    this.pianoVisualizer.renderScale(data);
                    this.scaleCircleExplorer.setKey(data.key);
                    this.scaleCircleExplorer.setScaleNotes(data.notes);
                    if (this.sheetMusicGenerator && this.sheetMusicGenerator.setKeyAndScale) {
                        this.sheetMusicGenerator.setKeyAndScale(data.key, data.scale, data.notes);
                    }
                    this.numberGenerator.setCurrentScaleNotes(data.notes);
                    this.numberGenerator.setScaleInfo(data.key, data.scale);

                    // Match the chord count to the new scale's note count so the
                    // full-scale view shows every chord the scale contains.
                    const scaleDegrees = this.fullScaleDegrees(data.notes);
                    if (wasFullScaleRun && scaleDegrees.length !== currentNumbers.length) {
                        this.numberGenerator.setNumbers(scaleDegrees, this.numberGenerator.getNumberType());
                    }

                    // The sheet's chord LABELS are resolved from the roman-numeral
                    // tokens against the key/scale current at the moment they were
                    // set — sheetMusicGenerator.setKeyAndScale() above updates the
                    // signature and scale notes, but never re-resolves the bars
                    // already on the page, so they stayed pinned to whatever key
                    // was current when the sheet was last seeded (C major, on load).
                    // Re-seeding re-emits the same tokens now that the key/scale is
                    // current; seedSheetFromNumbers() only touches bars it seeded
                    // itself, so hand-built bars and a generated piece are untouched.
                    this.seedSheetFromNumbers();

                    this.numberGenerator.render();
                    if (this.solarSystem) {
                        this.solarSystem.updateSystem({ key: data.key, scale: data.scale, notes: data.notes });
                    }
                    const miniPianoContainer = document.getElementById('mini-piano-visualize-container');
                    if (miniPianoContainer) {
                        miniPianoContainer.innerHTML = this.numberGenerator.renderMiniPiano();
                    }
                    // Update citation display
                    const compactInfoContainer = document.getElementById('piano-scale-info-compact');
                    const expandedInfoContainer = document.getElementById('piano-scale-info');
                    
                    if (compactInfoContainer && expandedInfoContainer) {
                        renderScaleCitation(data.scale, compactInfoContainer, expandedInfoContainer);
                    }
                    // Update mini chord strip to reflect new key/scale
                    try { this.renderMiniChordStrip(data.key, data.scale); } catch(_){}
                    
                    // Piano connector line redraw disabled (see setupPianoConnectors comment above).
                });

                // Connect container chord tool to piano visualizer
                this.containerChordTool.on('chordSelected', (data) => {
                    const roles = this.containerChordTool.getNoteRoles(
                        data.chord.chordNotes,
                        data.chord.root
                    );
                    this.pianoVisualizer.renderChord({
                        notes: data.chord.chordNotes,
                        roles: Object.entries(roles).map(([note, role]) => ({
                            note,
                            class: role.replace(/\s+/g, '-')
                        }))
                    });
                });

                // Connect progression builder to Solar System to highlight chosen/substituted chords

                // Connect number generator to circle explorer
                this.numberGenerator.on('numbersChanged', (data) => {
                    const scaleNotes = this.scaleLibrary.getCurrentScaleNotes();
                    this.scaleCircleExplorer.setGeneratedNumbers(data.numbers, scaleNotes);
                    if (this.solarSystem && this.solarSystem.setGeneratedNumbers) {
                        this.solarSystem.setGeneratedNumbers(data.numbers, scaleNotes);
                    }
                });

                // Single bubble click: select note across modules
                this.numberGenerator.on('singleNoteSelected', (data) => {
                    try {
                        const note = data && data.note ? data.note : '';
                        if (note) {
                            this.pianoVisualizer.setActiveNotes([note]);
                            if (this.containerChordTool && this.containerChordTool.setSelectedNote) {
                                this.containerChordTool.setSelectedNote(note);
                            }
                        }
                    } catch (e) { console.error(e); }
                });

                // Propagate manual Roman/chord display tokens into SheetMusicGenerator
                this.numberGenerator.on('displayTokensChanged', (evt) => {
                    try {
                        const rawTokens = evt && evt.rawTokens ? evt.rawTokens : (evt && evt.tokens ? evt.tokens : null);
                        const tokens = evt && evt.tokens ? evt.tokens : null;
                        const precomputed = (evt && Array.isArray(evt.chords) && evt.chords.length === (tokens && tokens.length)) ? evt.chords : null;
                        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) return;

                        // Log propagation of preview/display tokens into sheet mapping
                        try {
                            if (!window.__interactionLog) window.__interactionLog = [];
                            window.__interactionLog.push({
                                type: 'displayTokensPropagation',
                                details: { tokens: tokens.slice(), rawTokens: (rawTokens || tokens).slice(), harmonizationMode: this._harmonizationMode() },
                                timestamp: new Date().toISOString()
                            });
                        } catch(_) {}

                        // Convert tokens into chord objects consumable by SheetMusicGenerator
                        const chords = tokens.map((tok, idx) => {
                            // A precomputed entry (from seedSheetFromNumbers, which called
                            // getDiatonicChord directly) is the answer already worked out —
                            // use it verbatim rather than re-deriving it by parsing the
                            // token's own display text back apart. That round-trip is fine
                            // for "maj7" or "m7"; it has no hope with a chord whose 3rd isn't
                            // a 3rd, or one with no conventional name at all (a descriptive
                            // synthesized label like "sus2(#11, add6, b5)") — those came back
                            // as a wrong bare triad, or nothing. This is the fix for that:
                            // don't reconstruct what this app already correctly computed.
                            const pre = precomputed && precomputed[idx];
                            if (pre && pre.root) {
                                return {
                                    root: pre.root,
                                    chordType: pre.chordType,
                                    chordNotes: Array.isArray(pre.notes) ? pre.notes.slice() : [],
                                    fullName: pre.root + (pre.chordType || ''),
                                    degree: Number.isInteger(pre.degree) ? pre.degree : null
                                };
                            }
                            const rawTok = (rawTokens && rawTokens[idx]) ? rawTokens[idx] : tok;
                            try {
                                // First, allow NumberGenerator to normalize preview (may map accidentals to spelled roots)
                                const normalized = (this.numberGenerator && typeof this.numberGenerator.normalizePreviewRomanToken === 'function')
                                    ? this.numberGenerator.normalizePreviewRomanToken(tok)
                                    : tok;

                                // If normalized appears to start with a spelled root (A-G), parse root+type
                                const m = String(normalized).match(/^([A-G][b#]?)(.*)$/i);
                                if (m) {
                                    const root = m[1];
                                    const chordType = (m[2] || '').trim();
                                    let chordNotes = [];
                                    if (this.musicTheory && typeof this.musicTheory.getChordNotes === 'function') {
                                        try { chordNotes = this.musicTheory.getChordNotes(root, chordType) || []; } catch(_) { chordNotes = []; }
                                    }
                                    return { root, chordType, chordNotes, fullName: (root || '') + (chordType || '') };
                                }

                                // Otherwise, try to treat token as a Roman numeral -> diatonic degree
                                const romanMatch = String(rawTok).match(/([#b]?)([IViv]+)(.*)$/);
                                if (romanMatch) {
                                    const accidental = romanMatch[1] || '';
                                    const roman = romanMatch[2] || '';
                                    const suffix = (romanMatch[3] || '').trim();
                                    // Map roman to degree 1..7
                                    const romanToInt = (r) => {
                                        const s = String(r).toUpperCase();
                                        const map = { 'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7 };
                                        return map[s] || null;
                                    };
                                    const degree = romanToInt(roman);
                                    if (degree && this.scaleLibrary) {
                                        const key = this.scaleLibrary.getCurrentKey();
                                        const scale = this.scaleLibrary.getCurrentScale();
                                        try {
                                            const diat = (this.musicTheory && typeof this.musicTheory.getDiatonicChord === 'function')
                                                ? this.musicTheory.getDiatonicChord(degree, key, scale)
                                                : null;
                                            if (diat) {
                                                // Respect Roman case: lowercase = minor, uppercase = major
                                                const isLower = roman === roman.toLowerCase();
                                                let baseType = '';
                                                if (suffix) {
                                                    // User typed explicit quality/extension: use it directly
                                                    baseType = suffix;
                                                } else {
                                                    // No suffix: infer from case
                                                    if (isLower) {
                                                        baseType = 'm'; // lowercase -> minor
                                                    } else {
                                                        baseType = ''; // uppercase -> major (default)
                                                    }
                                                }

                                                // Try to get chord notes for the combined type
                                                let notes = [];
                                                try {
                                                    if (this.musicTheory && typeof this.musicTheory.getChordNotes === 'function') {
                                                        notes = this.musicTheory.getChordNotes(diat.root, baseType) || [];
                                                        if ((!notes || notes.length === 0) && baseType !== diat.chordType) {
                                                            notes = this.musicTheory.getChordNotes(diat.root, diat.chordType) || [];
                                                        }
                                                    }
                                                } catch (_) { notes = [] }
                                                return { root: diat.root, chordType: baseType || diat.chordType, chordNotes: notes, fullName: (diat.root || '') + (baseType || diat.chordType || '') };
                                            }
                                        } catch (_) {}
                                    }
                                }

                                // Fallback: return null so it will be filtered out
                                return null;
                            } catch (e) { return null; }
                        }).filter(c => c && c.root);

                        if (!chords.length) return;

                        const degrees = chords.map(c => {
                            // A precomputed chord already carries its own degree — no
                            // need to work backward from the root's spelling, which is
                            // exactly where "deg:?" came from: an enharmonic mismatch
                            // (root spelled "C#", scale spelled "Db") made a plain
                            // string-equality lookup fail even though the note was right.
                            if (Number.isInteger(c.degree)) return c.degree;
                            // Attempt to map root back to diatonic degree if possible
                            try {
                                if (this.scaleLibrary && Array.isArray(this.scaleLibrary.getCurrentScaleNotes())) {
                                    const scaleNotes = this.scaleLibrary.getCurrentScaleNotes();
                                    const idx = scaleNotes.indexOf(c.root);
                                    return idx >= 0 ? idx + 1 : null;
                                }
                            } catch (_) {}
                            return null;
                        });

                        if (this.sheetMusicGenerator && typeof this.sheetMusicGenerator.setBarMode === 'function') {
                            this.sheetMusicGenerator.setBarMode('per-bar');
                        }
                        if (this.sheetMusicGenerator && typeof this.sheetMusicGenerator.setHarmonizationMode === 'function') {
                            const mode = this._harmonizationMode();
                            this.sheetMusicGenerator.setHarmonizationMode(mode);
                            try {
                                if (!window.__interactionLog) window.__interactionLog = [];
                                window.__interactionLog.push({ type: 'sheetHarmonizationModeSet', details: { mode, source: 'displayTokensChanged' }, timestamp: new Date().toISOString() });
                            } catch (_) {}
                        }
                        if (this.sheetMusicGenerator && typeof this.sheetMusicGenerator.setBarChords === 'function') {
                            this.sheetMusicGenerator.setBarChords(chords);
                            if (typeof this.sheetMusicGenerator.setBarDegrees === 'function') {
                                this.sheetMusicGenerator.setBarDegrees(degrees);
                            } else {
                                this.sheetMusicGenerator.state.barDegrees = degrees;
                                try { this.sheetMusicGenerator.render(); } catch(_) {}
                            }
                        } else {
                            this.sheetMusicGenerator.state.barChords = chords;
                            this.sheetMusicGenerator.state.barDegrees = degrees;
                            try { this.sheetMusicGenerator.render(); } catch(_) {}
                        }
                    } catch (e) {
                        console.warn('Failed to propagate display tokens to sheet music:', e);
                    }
                });

                // Connect circle explorer to progression builder
                this.scaleCircleExplorer.on('progressionGenerated', (data) => {
                    const progression = data.progression.map(key => 
                        `${key}${this.scaleLibrary.getCurrentScale() === 'minor' ? 'm' : ''}maj7`
                    );
                    // The progression builder used to receive this. With that
                    // module gone the sheet is the thing that can actually show
                    // a progression, so it goes there rather than nowhere.
                    if (this.sheetMusicGenerator && typeof this.sheetMusicGenerator.setBarChords === 'function') {
                        this.sheetMusicGenerator.setBarChords(progression);
                    }
                });

                this.scaleCircleExplorer.on('keySelected', (data) => {
                    this.scaleLibrary.setKey(data.key);
                });

                // Connect chord explorer / container chord tool to sheet music
                if (this.containerChordTool && this.containerChordTool.on) {
                    this.containerChordTool.on('chordSelected', (data) => {
                        if (this.sheetMusicGenerator) {
                            this.sheetMusicGenerator.setCurrentChord(data.chord, { appendToBars: true });
                        }
                    });
                }

                // Connect progression builder to number generator and scale library
            }

            /**
             * Public entrypoint invoked by the NumberGenerator "Harmonize" button.
             * Ensures the progression builder and sheet generator honor the requested
             * harmonization mode and regenerates the progression / updates the sheet.
             * @param {string} mode 'melody'|'harmony'|'root'
             */
            /**
             * The harmonization mode, from whoever actually owns it.
             *
             * This used to be read off the progression builder, which was only
             * ever mirroring a value the number generator's own control sets.
             * With that module gone the mode comes from its real owner, with
             * the sheet as a second opinion and 'root' as the default.
             */
            _harmonizationMode() {
                const ng = this.numberGenerator && this.numberGenerator.state;
                if (ng && ng.harmonizationMode) return ng.harmonizationMode;
                const sm = this.sheetMusicGenerator && this.sheetMusicGenerator.state;
                if (sm && sm.harmonizationMode) return sm.harmonizationMode;
                return 'root';
            }

            harmonizeCurrentSequence(mode) {
                try {
                    const m = mode || this._harmonizationMode();


                    // Ensure progression builder has current numbers (it normally listens to numbersChanged).
                    // If the user has manually-entered display tokens (roman numerals/chord labels),
                    // prefer preserving those tokens and DO NOT regenerate the progression because
                    // generation can overwrite the user's explicit choices.
                    const hasManualDisplay = this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayTokens) && this.numberGenerator.state.displayTokens.length > 0;
                    if (hasManualDisplay) {
                        try {
                            if (!window.__interactionLog) window.__interactionLog = [];
                            window.__interactionLog.push({ type: 'harmonizeSkippedRegenerate', details: { reason: 'manualDisplayTokensPresent', mode: m }, timestamp: new Date().toISOString() });
                        } catch (_) {}
                        // Inform the sheet of the harmonization mode and re-emit the display tokens so
                        // the existing display -> sheet mapping runs under the new mode (no regeneration).
                        if (this.sheetMusicGenerator && typeof this.sheetMusicGenerator.setHarmonizationMode === 'function') {
                            this.sheetMusicGenerator.setHarmonizationMode(m);
                        }
                        try {
                            const disp = this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayTokens)
                                ? this.numberGenerator.state.displayTokens.slice()
                                : null;
                            const raw = this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayRawTokens)
                                ? this.numberGenerator.state.displayRawTokens.slice()
                                : null;
                            if (disp && disp.length) {
                                this.numberGenerator.emit('displayTokensChanged', { tokens: disp, rawTokens: raw || disp });
                            }
                        } catch (_) { /* non-fatal */ }
                        return;
                    }

                    const currentNumbers = (this.numberGenerator && typeof this.numberGenerator.getCurrentNumbers === 'function')
                        ? this.numberGenerator.getCurrentNumbers()
                        : [];

                    // Also inform the sheet music generator of the requested harmonization mode
                    if (this.sheetMusicGenerator && typeof this.sheetMusicGenerator.setHarmonizationMode === 'function') {
                        this.sheetMusicGenerator.setHarmonizationMode(m);
                    }

                    // If the user has manual display tokens present, re-emit the displayTokensChanged
                    // event so the existing handler maps tokens into the sheet with the new mode.
                    try {
                        const disp = this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayTokens)
                            ? this.numberGenerator.state.displayTokens.slice()
                            : null;
                        const raw = this.numberGenerator && this.numberGenerator.state && Array.isArray(this.numberGenerator.state.displayRawTokens)
                            ? this.numberGenerator.state.displayRawTokens.slice()
                            : null;
                        if (disp && disp.length) {
                            this.numberGenerator.emit('displayTokensChanged', { tokens: disp, rawTokens: raw || disp });
                        }
                    } catch (_) { /* non-fatal */ }

                } catch (e) {
                    console.error('harmonizeCurrentSequence failed', e);
                }
            }

            setupEventHandlers() {
                const safe = (label, fn) => {
                    try { fn(); }
                    catch (e) { console.warn(`[ModularApp] ${label} failed`, e); }
                };

                // Sync fretboard to ScaleLibrary changes
                safe('ScaleLibrary.events', () => {
                    if (this.scaleLibrary && typeof this.scaleLibrary.on === 'function') {
                        this.scaleLibrary.on('scaleChanged', ({ key, scale, notes }) => {
                            if (this.guitarFretboard && this.guitarFretboard.renderScale) {
                                this.guitarFretboard.renderScale({ key, scale, notes });
                            }
                            if (this.numberGenerator) {
                                if (typeof this.numberGenerator.setScaleInfo === 'function') {
                                    this.numberGenerator.setScaleInfo(key, scale);
                                }
                                if (typeof this.numberGenerator.setCurrentScaleNotes === 'function') {
                                    this.numberGenerator.setCurrentScaleNotes(notes);
                                }
                            }
                        });
                        this.scaleLibrary.on('degreeHighlighted', ({ note }) => {
                            if (this.guitarFretboard && this.guitarFretboard.highlightNote) {
                                this.guitarFretboard.highlightNote(note);
                            }
                        });
                        this.scaleLibrary.on('highlightingCleared', () => {
                            if (this.guitarFretboard && this.guitarFretboard.renderScale) {
                                const key = this.scaleLibrary.getCurrentKey();
                                const scale = this.scaleLibrary.getCurrentScale();
                                const notes = this.scaleLibrary.getCurrentScaleNotes();
                                this.guitarFretboard.renderScale({ key, scale, notes });
                            }
                        });
                    }
                });

                // Audio Engine Listeners + propagate to guitar
                safe('PianoVisualizer.events', () => {
                    if (this.pianoVisualizer && typeof this.pianoVisualizer.on === 'function') {
                        this.pianoVisualizer.on('noteClicked', (data) => {
                            if (this.audioEngine) {
                                this.audioEngine.playNote(data.midi);
                            }
                            if (this.guitarFretboard && this.guitarFretboard.highlightMidi) {
                                this.guitarFretboard.highlightMidi(data.midi);
                            }
                        });
                    }
                });

                safe('GuitarFretboard.events', () => {
                    if (this.guitarFretboard && typeof this.guitarFretboard.on === 'function') {
                        this.guitarFretboard.on('noteClicked', (data) => {
                            // Use MIDI-style overlay for instrument cross-sync to avoid clearing
                            // the theoretical state (the scale) that might be visible on the piano.
                            if (this.pianoVisualizer && this.pianoVisualizer.midiNoteOn) {
                                this.pianoVisualizer.midiNoteOn(data.midi);
                                // Auto-clear highlight after 450ms for visual feedback
                                setTimeout(() => {
                                    if (this.pianoVisualizer.midiNoteOff) {
                                        this.pianoVisualizer.midiNoteOff(data.midi);
                                    }
                                }, 450);
                            }
                        });
                    }
                });


                    // Mount number generator
                    safe('NumberGenerator.mount', () => {
                        if (this.numberGenerator && this.numberGenerator.mount) {
                            this.numberGenerator.mount('#number-generator-container');
                        }
                    });

                    // Mount scale library
                    safe('ScaleLibrary.mount', () => {
                        if (this.scaleLibrary && this.scaleLibrary.mount) {
                            this.scaleLibrary.mount('#scale-library-container');

                            // Place key/scale controls in the top control deck center slot
                            try {
                                const centerSlot = document.getElementById('control-deck-keyscale-center');
                                const el = document.getElementById('scale-library-container');
                                if (centerSlot && el && el.parentElement !== centerSlot) {
                                    // Ensure the controls stay compact in the top bar
                                    el.style.display = 'flex';
                                    el.style.alignItems = 'center';
                                    el.style.justifyContent = 'center';
                                    el.style.gap = '10px';
                                    el.style.margin = '0';
                                    centerSlot.appendChild(el);
                                }
                            } catch (_) {}
                        }
                    });

                    // Mount main piano visualizer
                    safe('PianoVisualizer.mount', () => {
                        if (this.pianoVisualizer && this.pianoVisualizer.mount) {
                            this.pianoVisualizer.mount('#piano-container');
                        }
                    });

                    // Mount guitar fretboard visualizer
                    safe('GuitarFretboard.mount', () => {
                        if (this.guitarFretboard && this.guitarFretboard.mount) {
                            this.guitarFretboard.mount('#guitar-fretboard-container');
                            try {
                                const key = this.scaleLibrary.getCurrentKey();
                                const scale = this.scaleLibrary.getCurrentScale();
                                const notes = this.scaleLibrary.getCurrentScaleNotes();
                                this.guitarFretboard.renderScale({ key, scale, notes });
                            } catch(_) {}
                        }
                    });

                    // Mount container chord tool
                    safe('ContainerChordTool.mount', () => {
                        if (this.containerChordTool && this.containerChordTool.mount) {
                            this.containerChordTool.mount('#container-chord-container');
                        }
                    });

                    // Mount scale relationship explorer
                    safe('ScaleRelationshipExplorer.mount', () => {
                        if (this.scaleRelationshipExplorer && this.scaleRelationshipExplorer.mount) {
                            this.scaleRelationshipExplorer.mount('#scale-relationship-container');
                        }
                    });

                    // Mount progression builder

                    // Mount scale circle explorer
                    safe('ScaleCircleExplorer.mount', () => {
                        if (this.scaleCircleExplorer && this.scaleCircleExplorer.mount) {
                            this.scaleCircleExplorer.mount('#scale-circle-container');
                        }
                    });

                    // Mount chord explorer

                    // Mount sheet music generator under chord explorer
                    safe('SheetMusicGenerator.mount', () => {
                        if (this.sheetMusicGenerator && this.sheetMusicGenerator.mount) {
                            this.sheetMusicGenerator.mount('#sheet-music-container');
                        }
                    });

                    // Mount solar system visualizer (docked by default)
                    safe('SolarSystem.mount', () => {
                        if (this.solarSystem && this.solarSystem.mount) {
                            const mountTarget = '#solar-dock-viewport';
                            this.solarSystem.mount(mountTarget);
                        }
                    });
                    // (condensed sidebar solar removed)
                    // Mobile autodetect: add class and slightly reduce solar size scale
                    safe('SolarSystem.ui', () => {
                        // Mobile autodetect: add class and slightly reduce solar size scale
                        const applyMobileClass = () => {
                            const isMobile = window.matchMedia('(max-width: 768px)').matches || /Mobi|Android/i.test(navigator.userAgent);
                            document.body.classList.toggle('is-mobile', !!isMobile);
                            if (this.solarSystem && typeof this.solarSystem.setSizeScale === 'function') {
                                this.solarSystem.setSizeScale(isMobile ? 0.9 : 1.0);
                            }
                        };
                        applyMobileClass();
                        window.addEventListener('resize', () => {
                            applyMobileClass();
                            if (this.solarSystem && typeof this.solarSystem.handleResize === 'function') {
                                this.solarSystem.handleResize();
                            }
                        });
                        const avBtn = document.getElementById('open-audio-visualizer');
                        if (avBtn && this.audioVisualizer) {
                            avBtn.addEventListener('click', () => this.audioVisualizer.open());
                        }
                        // Auto-play solar system if possible
                        if (this.solarSystem && typeof this.solarSystem.start === 'function') {
                            try { this.solarSystem.start(); } catch(e) { /* ignore */ }
                        }

                        // Dock/Undock control
                        const dockBtn = document.getElementById('dock-solar');
                        if (dockBtn) {
                            // Initially docked
                            dockBtn.setAttribute('data-docked', 'true');
                            dockBtn.textContent = '[UNDOCK]';

                            dockBtn.addEventListener('click', () => {
                                const dockModule = document.getElementById('solar-docked-module');
                                const isDocked = dockModule ? !dockModule.classList.contains('hidden') : false;
                                try {
                                    this.solarSystem.unmount();
                                    if (!isDocked) {
                                        // Dock into grid
                                        if (dockModule) dockModule.classList.remove('hidden');
                                        const sunEl = document.querySelector('.sun');
                                        if (sunEl) sunEl.style.display = 'none';
                                        this.solarSystem.mount('#solar-dock-viewport');
                                        dockBtn.textContent = '[UNDOCK]';
                                        // keep alternate dock button in sync
                                        const dockAlt = document.getElementById('dock-solar-alt');
                                        if (dockAlt) dockAlt.setAttribute('data-docked', 'true');
                                        dockBtn.setAttribute('data-docked', 'true');
                                    } else {
                                        // Undock back to sun
                                        if (dockModule) dockModule.classList.add('hidden');
                                        const sunEl = document.querySelector('.sun');
                                        if (sunEl) sunEl.style.display = 'flex';
                                        this.solarSystem.mount('#sun-viewport');
                                        dockBtn.textContent = '[DOCK]';
                                        const dockAlt = document.getElementById('dock-solar-alt');
                                        if (dockAlt) dockAlt.setAttribute('data-docked', 'false');
                                        dockBtn.setAttribute('data-docked', 'false');
                                    }
                                } catch (e) { console.error(e); }
                            });
                            // Also add alternate dock/undock listener if present in controls
                            const dockAlt = document.getElementById('dock-solar-alt');
                            if (dockAlt) {
                                dockAlt.addEventListener('click', () => dockBtn.click());
                                // Initially docked
                                dockAlt.setAttribute('data-docked', 'true');
                            }
                        }
                    });
            }

            renderInitialState() {
                // Set initial scale
                this.scaleLibrary.setKeyAndScale('C', 'major');

                // Immediately render the main piano with current scale on first load
                if (this.pianoVisualizer && this.pianoVisualizer.renderScale) {
                    const currentKey = this.scaleLibrary.getCurrentKey();
                    const currentScale = this.scaleLibrary.getCurrentScale();
                    const currentNotes = this.scaleLibrary.getCurrentScaleNotes();
                    
                    // First adjust the piano range to start from the selected key
                    if (this.pianoVisualizer.adjustPianoRange) {
                        this.pianoVisualizer.adjustPianoRange(currentKey);
                    }
                    
                    // Then render the scale
                    this.pianoVisualizer.renderScale({
                        key: currentKey,
                        scale: currentScale,
                        notes: currentNotes
                    });
                }

                // Set initial scale info for number generator
                this.numberGenerator.setScaleInfo('C', 'major');

                // Initialize container chord tool with key/scale context BEFORE generating numbers
                // so it's ready when bubbles are clicked
                this.containerChordTool.setKeyAndScale('C', 'major');

                // Seed a full run of the scale's own degrees so all modules
                // (Progression Builder, Sheet Music, Explorer) start by showing
                // every chord in the scale — 5 for pentatonic, 8 for octatonic, etc.
                this.numberGenerator.setNumbers(this.fullScaleDegrees(), this.numberGenerator.getNumberType());
                // Re-render the number generator UI to reflect the explicit numbers
                if (typeof this.numberGenerator.render === 'function') this.numberGenerator.render();

                // ...AND TELL THE SHEET.
                //
                // The line above seeds every module from `numbersChanged` — except
                // the sheet, which is fed from `displayTokensChanged` instead, and
                // that only ever fired when a user committed something typed into
                // the numbers box. So the studio opened with the degrees seeded,
                // the piano and the explorer showing them, and the sheet blank
                // until you cleared the box and typed the same degrees back in.
                //
                // The tokens are built with the generator's own numberToRoman, so
                // what shows on load is exactly what typing those degrees produces
                // — Imaj7 ii7 iii7 IVmaj7 V7 vi7 viiø7 in C major — rather than a
                // second, nearly-identical spelling of the same idea.
                this.seedSheetFromNumbers();
                // Initialize solar system with current key/scale
                if (this.solarSystem) {
                    this.solarSystem.updateSystem({
                        key: this.scaleLibrary.getCurrentKey(),
                        scale: this.scaleLibrary.getCurrentScale(),
                        notes: this.scaleLibrary.getCurrentScaleNotes()
                    });
                }
                
                // Initialize circle explorer
                this.scaleCircleExplorer.setKey('C');
                const miniPianoContainer = document.getElementById('mini-piano-visualize-container');
                if (miniPianoContainer) {
                    miniPianoContainer.innerHTML = this.numberGenerator.renderMiniPiano();
                }
                // Update citation display
                const compactInfoContainer = document.getElementById('piano-scale-info-compact');
                const expandedInfoContainer = document.getElementById('piano-scale-info');
                
                if (compactInfoContainer && expandedInfoContainer) {
                    const currentScale = this.scaleLibrary.getCurrentScale();
                    renderScaleCitation(currentScale, compactInfoContainer, expandedInfoContainer);
                }
                
                // Piano connector system disabled: its anchor target (#piano-sheet-music)
                // is hidden/collapsed, which made every connector line resolve to a
                // phantom off-screen point instead of a real note position.
                // this.setupPianoConnectors();
            }
            
            /**
             * Put the current degrees on the sheet, the way typing them would.
             *
             * Only when the sheet has nothing of its own: a user who has already
             * built bars must not have them replaced by the default run, and a
             * scale change re-seeds only what the seed put there.
             */
            seedSheetFromNumbers() {
                try {
                    const ng = this.numberGenerator;
                    const sheet = this.sheetMusicGenerator;
                    if (!ng || !sheet || typeof ng.numberToRoman !== 'function') return;

                    // A full generated piece (from word input) owns the sheet while
                    // it's showing — its key came from the words, not this selector.
                    // setBarChords() retires a musicalPhrase the instant it's called
                    // (by design, so the number generator etc. can override it when
                    // the user deliberately touches them) — a scale-change re-seed is
                    // not that, and must not silently erase a generated piece.
                    if (sheet.state && sheet.state.musicalPhrase) return;

                    const existing = (sheet.state && sheet.state.barChords) || [];
                    if (existing.length && !this._sheetSeeded) return;   // the user's own bars win

                    const numbers = ng.getCurrentNumbers ? ng.getCurrentNumbers() : [];
                    if (!Array.isArray(numbers) || !numbers.length) return;

                    const key = this.scaleLibrary ? this.scaleLibrary.getCurrentKey() : (ng.currentKey || 'C');
                    const scale = this.scaleLibrary ? this.scaleLibrary.getCurrentScale() : (ng.currentScale || 'major');

                    // Build the display tokens AND the exact chord each one names,
                    // together and in the same order. A listener used to have to
                    // re-derive the chord by parsing the roman-numeral token's own
                    // text back apart — fine for "maj7" or "m7", hopeless for
                    // anything getDiatonicChord couldn't give a short conventional
                    // name to. An augmented-fifth seventh round-tripped through
                    // that parser with its fifth silently dropped; a chord with no
                    // conventional name at all (a scale degree whose "third" isn't
                    // a third, carrying a descriptive name like
                    // "sus2(#11, add6, b5)") had no hope of surviving the trip and
                    // came back as a bare, wrong triad — or nothing. Carrying the
                    // already-correct root/type/notes alongside the token means a
                    // listener never has to reconstruct what this file already
                    // knows.
                    const tokens = [];
                    const chords = [];
                    numbers.forEach(n => {
                        const tok = (typeof n === 'number') ? ng.numberToRoman(n) : String(n);
                        if (!tok || tok === '?') return;
                        tokens.push(tok);
                        if (typeof n === 'number' && this.musicTheory && typeof this.musicTheory.getDiatonicChord === 'function') {
                            try {
                                const diat = this.musicTheory.getDiatonicChord(n, key, scale);
                                chords.push(diat && diat.root ? { degree: n, root: diat.root, chordType: diat.chordType, notes: diat.diatonicNotes } : null);
                            } catch (_) { chords.push(null); }
                        } else {
                            chords.push(null);
                        }
                    });
                    if (!tokens.length) return;

                    this._sheetSeeded = true;
                    const haveAllChords = chords.length === tokens.length && chords.every(c => c && c.root);
                    ng.setDisplayTokens(tokens, {
                        rawTokens: tokens.slice(),
                        source: 'initial-seed',
                        chords: haveAllChords ? chords : undefined
                    });
                } catch (e) {
                    console.warn('[App] could not seed the sheet from the current degrees:', e);
                }
            }

            /**
             * [1..N] for the loaded scale, where N is its actual note count.
             * Falls back to a seven-degree run if the scale isn't readable yet.
             */
            fullScaleDegrees(notes) {
                const scaleNotes = notes || (this.scaleLibrary ? this.scaleLibrary.getCurrentScaleNotes() : null);
                const count = Array.isArray(scaleNotes) && scaleNotes.length > 0 ? scaleNotes.length : 7;
                return Array.from({ length: count }, (_, i) => i + 1);
            }

            /** True when `numbers` is exactly the untouched run 1,2,3...N. */
            isFullScaleRun(numbers) {
                return Array.isArray(numbers)
                    && numbers.length > 0
                    && numbers.every((n, i) => n === i + 1);
            }

            // Piano connector system methods
            setupPianoConnectors() {
                if (this._pianoConnectorsSetupDone) return;
                this._pianoConnectorsSetupDone = true;

                this.connectorRetryAttempts = 0;
                const maxRetries = 24; // ~7.2s total with 300ms spacing

                // Dedup connector redraw requests (the piano can emit many 'rendered' events)
                this._connectorDrawScheduled = false;
                this._scheduleConnectorDraw = () => {
                    if (this._connectorDrawScheduled) return;
                    this._connectorDrawScheduled = true;
                    requestAnimationFrame(() => {
                        this._connectorDrawScheduled = false;
                        this._drawConnectorsOnce();
                    });
                };

                this._drawConnectorsOnce = () => {
                    this.updateScaleFormula();
                    this.renderPianoSheetMusic();
                    const ok = this.drawPianoConnectors();
                    if (!ok && this.connectorRetryAttempts < maxRetries) {
                        this.connectorRetryAttempts += 1;
                        setTimeout(() => this._scheduleConnectorDraw(), 300);
                    } else {
                        this.connectorRetryAttempts = 0;
                    }
                };

                // Public method kept for any existing call sites
                this.drawConnectors = () => this._scheduleConnectorDraw();

                // Subscribe to scale changes
                if (this.scaleLibrary && this.scaleLibrary.on) {
                    this.scaleLibrary.on('scaleChanged', () => this._scheduleConnectorDraw());
                }
                
                // Listen for piano render events
                if (this.pianoVisualizer && this.pianoVisualizer.on) {
                    this.pianoVisualizer.on('rendered', () => this._scheduleConnectorDraw());
                }

                // Initial draw shortly after load
                setTimeout(() => this._scheduleConnectorDraw(), 600);
            }
            
            updateScaleFormula() {
                const display = document.getElementById('scale-formula-display');
                if (!display || !this.scaleLibrary || !this.scaleLibrary.musicTheory) return;

                const currentScale = this.scaleLibrary.getCurrentScale();
                const intervals = this.scaleLibrary.musicTheory.scales[currentScale];
                if (!intervals) {
                    display.textContent = 'Formula not available';
                    return;
                }

                // Calculate steps W/H
                // intervals is [0, 2, 4, ...]. Add octave (12).
                const fullIntervals = [...intervals, 12];
                const steps = [];
                for (let i = 0; i < fullIntervals.length - 1; i++) {
                    const diff = fullIntervals[i+1] - fullIntervals[i];
                    if (diff === 1) steps.push('H');
                    else if (diff === 2) steps.push('W');
                    else if (diff === 3) steps.push('WH'); // min 3rd
                    else if (diff === 4) steps.push('WW'); // maj 3rd
                    else steps.push(`${diff}sem`);
                }

                display.innerHTML = steps.join(' - ');
            }

            renderPianoSheetMusic() {
                const container = document.getElementById('piano-sheet-music');
                if (!container) return;
                
                // Clear container if no scale notes
                const scaleNotes = this.scaleLibrary ? this.scaleLibrary.getCurrentScaleNotes() : [];
                if (!scaleNotes || scaleNotes.length === 0) {
                    container.innerHTML = '';
                    return;
                }

                const noteNameToMidi = (noteName) => {
                    // Shared reader first: the table below cannot see C♭, F♭,
                    // E♯, B♯ or a double accidental.
                    const shared = (typeof window !== 'undefined' && window.MusicNotes && window.MusicNotes.midi)
                        ? window.MusicNotes.midi(noteName) : null;
                    if (shared !== null && shared !== undefined) return shared;

                    const NOTE_TO_SEMITONE = {
                        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
                        'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
                        'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
                    };
                    const match = String(noteName).match(/^([A-G][#b]?)(-?\d+)$/);
                    if (!match) return null;
                    const semitone = NOTE_TO_SEMITONE[match[1]];
                    const octave = parseInt(match[2], 10);
                    return (octave + 1) * 12 + semitone;
                };

                // Use middle register for clarity
                const baseOctave = 4;
                const width = Math.max(container.clientWidth || 800, 620);
                const height = 190;
                const staffY = 75;
                const staffStroke = 'rgba(210, 225, 232, 0.7)';
                const noteFill = '#dce7f7';
                const noteStroke = 'rgba(100, 180, 255, 0.6)';
                const tonicFill = 'rgba(96, 165, 250, 0.95)';
                const tonicStroke = 'rgba(255,255,255,0.75)';
                const labelFill = 'rgba(210,220,225,0.75)';
                
                // Calculate note positions on treble staff
                // C4=below staff, D4=below, E4=on 1st line, F4=between 1&2, G4=on 2nd line, A4=between 2&3, B4=on 3rd line, C5=between 3&4
                const notePositions = {
                    'C': staffY + 50, 'D': staffY + 45, 'E': staffY + 40, 'F': staffY + 35,
                    'G': staffY + 30, 'A': staffY + 25, 'B': staffY + 20
                };
                
                // Build SVG
                let svg = `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="display: block; overflow: visible;">`;
                
                // Staff lines
                svg += `<g stroke="${staffStroke}" stroke-width="1.25">`;
                for (let i = 0; i < 5; i++) {
                    svg += `<line x1="40" y1="${staffY + i * 10}" x2="${width - 40}" y2="${staffY + i * 10}" />`;
                }
                svg += `</g>`;
                
                // Treble clef
                svg += `<text x="50" y="${staffY + 35}" font-size="60" fill="rgba(255,255,255,0.6)" font-family="serif">𝄞</text>`;
                
                // Notes
                svg += `<g id="piano-sheet-notes">`;
                const noteSpacing = (width - 200) / (scaleNotes.length + 1);
                
                scaleNotes.forEach((note, i) => {
                    const noteName = note.replace(/[0-9]/g, '');
                    // Push final tonic up an octave for 8-note scales
                    const octave = (i === scaleNotes.length - 1 && noteName === scaleNotes[0].replace(/[0-9]/g, ''))
                        ? baseOctave + 1
                        : baseOctave;
                    const fullNote = `${noteName}${octave}`;
                    const midiVal = noteNameToMidi(fullNote);
                    const x = 120 + (i * noteSpacing);
                    const y = notePositions[noteName] || staffY + 30;
                    
                    svg += `<g class="piano-sheet-note-group" data-note="${noteName}" data-full-note="${fullNote}" data-midi="${midiVal || ''}" data-index="${i}">`;
                    const isTonic = i === 0;
                    const fill = isTonic ? tonicFill : noteFill;
                    const stroke = isTonic ? tonicStroke : noteStroke;
                    svg += `<circle cx="${x}" cy="${y}" r="7" fill="${fill}" stroke="${stroke}" stroke-width="1.25" />`;
                    
                    // Add ledger line for C4
                    if (noteName === 'C' && (octave === 4)) {
                        svg += `<line x1="${x - 12}" y1="${staffY + 50}" x2="${x + 12}" y2="${staffY + 50}" stroke="${staffStroke}" stroke-width="1.25" />`;
                    }
                    
                    svg += `<text x="${x}" y="${y + 25}" font-size="11" fill="${labelFill}" text-anchor="middle">${fullNote}</text>`;
                    svg += `</g>`;
                });
                svg += `</g>`;
                svg += `</svg>`;
                
                container.innerHTML = svg;
            }
            
            drawPianoConnectors() {
                const wrapper = document.getElementById('piano-wrapper');
                const pianoContainer = document.getElementById('piano-container');
                // Backwards-compatible: prefer `piano-sheet-music`, fall back to existing `sheet-music-container`
                const sheetContainer = document.getElementById('piano-sheet-music') || document.getElementById('sheet-music-container');
                
                if (!wrapper) { console.error('[TINES] No piano-wrapper'); return false; }
                if (!pianoContainer) { console.error('[TINES] No piano-container'); return false; }
                if (!sheetContainer) { console.error('[TINES] No sheet-music'); return false; }
                
                // Remove existing overlay
                const existing = document.getElementById('piano-connector-overlay');
                if (existing) existing.remove();
                
                // Create SVG overlay
                this.connectorOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                this.connectorOverlay.id = 'piano-connector-overlay';
                this.connectorOverlay.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                this.connectorOverlay.style.cssText = `
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; z-index: 50; overflow: visible;
                `;
                
                wrapper.appendChild(this.connectorOverlay);
                
                // Size overlay to wrapper
                const wrapperRect = wrapper.getBoundingClientRect();
                if (wrapperRect.width === 0 || wrapperRect.height === 0) {
                    // Avoid noisy repeated logs and polling loops. Attach a ResizeObserver
                    // (or window resize listener) to notify when the wrapper receives layout.
                    if (!this._pianoConnectorWaiting) {
                        this._pianoConnectorWaiting = true;

                        const tryWhenReady = () => {
                            const r = wrapper.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                this._pianoConnectorWaiting = false;
                                // cleanup
                                try { if (this._pianoConnectorResizeObserver) this._pianoConnectorResizeObserver.disconnect(); } catch (_) {}
                                this._pianoConnectorResizeObserver = null;
                                try { if (this._pianoConnectorWindowListener) window.removeEventListener('resize', this._pianoConnectorWindowListener); } catch(_) {}
                                this._pianoConnectorWindowListener = null;
                                // re-run connector draw now that layout exists
                                this.drawPianoConnectors();
                            }
                        };

                        if (typeof ResizeObserver !== 'undefined') {
                            try {
                                this._pianoConnectorResizeObserver = new ResizeObserver(tryWhenReady);
                                this._pianoConnectorResizeObserver.observe(wrapper);
                            } catch (e) {
                                // Fallback to window resize when observe fails
                                this._pianoConnectorWindowListener = tryWhenReady;
                                window.addEventListener('resize', this._pianoConnectorWindowListener);
                            }
                        } else {
                            this._pianoConnectorWindowListener = tryWhenReady;
                            window.addEventListener('resize', this._pianoConnectorWindowListener);
                        }

                        // Give up after a reasonable timeout to avoid infinite waiting
                        this._pianoConnectorGiveUpTimer = setTimeout(() => {
                            if (this._pianoConnectorWaiting) {
                                this._pianoConnectorWaiting = false;
                                try { if (this._pianoConnectorResizeObserver) this._pianoConnectorResizeObserver.disconnect(); } catch(_) {}
                                this._pianoConnectorResizeObserver = null;
                                try { if (this._pianoConnectorWindowListener) window.removeEventListener('resize', this._pianoConnectorWindowListener); } catch(_) {}
                                this._pianoConnectorWindowListener = null;
                                // Suppress warning: wrapper can legitimately be zero-sized if the piano deck is hidden or not yet laid out.
                                // console.warn('[PianoConnectors] Wrapper remained zero-sized after wait — skipping connectors.');
                            }
                        }, 8000);
                    }
                    return false;
                }

                this.connectorOverlay.setAttribute('width', wrapperRect.width);
                this.connectorOverlay.setAttribute('height', wrapperRect.height);
                
                // Get sheet note groups and piano element
                const sheetGroups = sheetContainer.querySelectorAll('.piano-sheet-note-group');
                const pianoEl = pianoContainer.querySelector('.piano-visualizer');

                if (!pianoEl) { console.error('[TINES] No .piano-visualizer found'); return false; }

                // If sheet note groups haven't been rendered yet, wait for them
                if (sheetGroups.length === 0) {
                    if (!this._pianoSheetWaiting) {
                        this._pianoSheetWaiting = true;

                        const onSheetReady = () => {
                            this._pianoSheetWaiting = false;
                            try { if (this._pianoSheetObserver) this._pianoSheetObserver.disconnect(); } catch(_) {}
                            this._pianoSheetObserver = null;
                            try { if (this._pianoSheetWindowListener) window.removeEventListener('resize', this._pianoSheetWindowListener); } catch(_) {}
                            this._pianoSheetWindowListener = null;
                            if (this._pianoSheetTimer) { clearTimeout(this._pianoSheetTimer); this._pianoSheetTimer = null; }
                            // Re-run connector draw now that sheet notes exist
                            this.drawPianoConnectors();
                        };

                        if (typeof MutationObserver !== 'undefined') {
                            try {
                                this._pianoSheetObserver = new MutationObserver((mutations) => {
                                    if (sheetContainer.querySelectorAll('.piano-sheet-note-group').length > 0) onSheetReady();
                                });
                                this._pianoSheetObserver.observe(sheetContainer, { childList: true, subtree: true });
                            } catch (e) {
                                // Fallback to resize listener
                                this._pianoSheetWindowListener = () => {
                                    if (sheetContainer.querySelectorAll('.piano-sheet-note-group').length > 0) onSheetReady();
                                };
                                window.addEventListener('resize', this._pianoSheetWindowListener);
                            }
                        } else {
                            this._pianoSheetWindowListener = () => {
                                if (sheetContainer.querySelectorAll('.piano-sheet-note-group').length > 0) onSheetReady();
                            };
                            window.addEventListener('resize', this._pianoSheetWindowListener);
                        }

                        // Give up after a reasonable timeout to avoid infinite waiting
                        this._pianoSheetTimer = setTimeout(() => {
                            if (this._pianoSheetWaiting) {
                                this._pianoSheetWaiting = false;
                                try { if (this._pianoSheetObserver) this._pianoSheetObserver.disconnect(); } catch(_) {}
                                this._pianoSheetObserver = null;
                                try { if (this._pianoSheetWindowListener) window.removeEventListener('resize', this._pianoSheetWindowListener); } catch(_) {}
                                this._pianoSheetWindowListener = null;
                                this._pianoSheetTimer = null;
                                // Suppress warning - this is expected when sheet music module isn't active
                                // console.warn('[PianoConnectors] No sheet note groups appeared after wait — skipping connectors.');
                            }
                        }, 8000);
                    }
                    return false;
                }
                
                // Add SVG defs
                const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                defs.innerHTML = `
                    <linearGradient id="tine-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#D0D8E0;stop-opacity:1" />
                        <stop offset="50%" style="stop-color:#A8B4C0;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#8090A0;stop-opacity:1" />
                    </linearGradient>
                `;
                this.connectorOverlay.appendChild(defs);
                
                const wrapperBounds = wrapper.getBoundingClientRect();
                const scaleNotes = this.scaleLibrary ? this.scaleLibrary.getCurrentScaleNotes() : [];
                
                // Draw connector for each note
                let drawn = 0;
                sheetGroups.forEach((group, i) => {
                    if (i >= scaleNotes.length) return;
                    
                    const noteName = group.getAttribute('data-note');
                    const fullNote = group.getAttribute('data-full-note');
                    const groupMidi = group.getAttribute('data-midi');
                    
                    // Find piano key by MIDI
                    const scaleMidi = parseInt(groupMidi, 10);
                    let key = pianoEl.querySelector(`[data-midi="${scaleMidi}"]`);
                    if (!key) {
                        console.warn(`[TINES] No key found for MIDI ${scaleMidi}, trying note name ${noteName}`);
                        key = pianoEl.querySelector(`[data-note="${noteName}"]`);
                    }
                    if (!key) {
                        console.warn(`[PianoConnectors] No key found for ${noteName} (MIDI ${scaleMidi})`);
                        return;
                    }
                    
                    // Get positions
                    const circle = group.querySelector('circle');
                    if (!circle) {
                        console.warn(`[PianoConnectors] No circle found for note ${noteName}`);
                        return;
                    }
                    
                    const keyRect = key.getBoundingClientRect();
                    const circleRect = circle.getBoundingClientRect();
                    
                    // Avoid intersecting with fingering labels (centered at 50%)
                    const isBlack = key.classList.contains('piano-black-key');
                    const yInfoOffset = isBlack ? 0.25 : 0.3; 

                    // Calculate connector coordinates
                    const x1 = keyRect.left - wrapperBounds.left + (keyRect.width / 2);
                    const y1 = keyRect.top - wrapperBounds.top + (keyRect.height * yInfoOffset);
                    const x2 = circleRect.left - wrapperBounds.left + (circleRect.width / 2);
                    const y2 = circleRect.bottom - wrapperBounds.top;
                    
                    // Create tine line
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x1);
                    line.setAttribute('y1', y1);
                    line.setAttribute('x2', x2);
                    line.setAttribute('y2', y2);
                    line.setAttribute('stroke', 'url(#tine-gradient)');
                    line.setAttribute('stroke-width', '2');
                    line.setAttribute('opacity', '0.9');
                    line.setAttribute('stroke-linecap', 'round');
                    this.connectorOverlay.appendChild(line);
                    
                    // Add anchor circles
                    const anchor1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    anchor1.setAttribute('cx', x1);
                    anchor1.setAttribute('cy', y1);
                    anchor1.setAttribute('r', '3');
                    anchor1.setAttribute('fill', '#999');
                    this.connectorOverlay.appendChild(anchor1);
                    
                    const anchor2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    anchor2.setAttribute('cx', x2);
                    anchor2.setAttribute('cy', y2);
                    anchor2.setAttribute('r', '3');
                    anchor2.setAttribute('fill', '#A8B8CC');
                    this.connectorOverlay.appendChild(anchor2);
                    
                    drawn++;
                });

                return drawn > 0;
            }
        }

        // Debug logging
        function debugLog(message) {
            // const console = document.getElementById('debug-console');
            // console.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
            // console.scrollTop = console.scrollHeight;
        }

        // Citation display functions
        function getConfidenceIndicator(status) {
            switch(status) {
                case 'verified': return '<span class="confidence-verified">✅ Well-documented</span>';
                case 'needs-review': return '<span class="confidence-review">⚠️ Limited documentation</span>';
                case 'limited-documentation': return '<span class="confidence-limited">❓ Needs review</span>';
                default: return '';
            }
        }

        function renderScaleCitation(scaleType, compactContainer, expandedContainer) {
            // Citation display has been removed for licensing reasons.
            if (compactContainer) compactContainer.innerHTML = '';
            if (expandedContainer) expandedContainer.innerHTML = '<div class="no-sources">Source information removed</div>';
        }

        // Initialize the modular app when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            window.modularApp = new ModularMusicTheoryApp();
            // Expose key components globally for lexical integration
            window.numberGenerator = window.modularApp.numberGenerator;
            window.scaleLibrary = window.modularApp.scaleLibrary;
            window.containerChordTool = window.modularApp.containerChordTool;
            // debugLog('Application started');
            
            // Initialize audio engine and show loading notification for samples
            if (window.modularApp.audioEngine) {
                window.modularApp.audioEngine.init();
                
                // Show loading notification if using sampled piano
                if (typeof PianoSampleEngine !== 'undefined' && window.modularApp.audioEngine instanceof PianoSampleEngine) {
                    const notification = document.createElement('div');
                    notification.id = 'audio-loading-notification';
                    notification.style.cssText = `
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        background: rgba(0, 150, 255, 0.95);
                        color: white;
                        padding: 12px 20px;
                        border-radius: 8px;
                        font-family: var(--font-tech, monospace);
                        font-size: 0.9rem;
                        z-index: 10000;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        transition: opacity 0.3s ease;
                    `;
                    notification.textContent = '🎹 Loading piano samples...';
                    document.body.appendChild(notification);
                    
                    // Check loading progress
                    const checkProgress = setInterval(() => {
                        if (window.modularApp.audioEngine.isReady()) {
                            notification.style.background = 'rgba(0, 200, 100, 0.95)';
                            notification.textContent = '✓ Piano samples loaded';
                            setTimeout(() => {
                                notification.style.opacity = '0';
                                setTimeout(() => notification.remove(), 300);
                            }, 2000);
                            clearInterval(checkProgress);
                        }
                    }, 500);
                    
                    // Timeout after 10 seconds (samples might have failed to load)
                    setTimeout(() => {
                        if (!window.modularApp.audioEngine.isReady()) {
                            notification.style.background = 'rgba(255, 150, 0, 0.95)';
                            notification.textContent = '⚠ Using synthesized piano';
                            setTimeout(() => {
                                notification.style.opacity = '0';
                                setTimeout(() => notification.remove(), 300);
                            }, 3000);
                            clearInterval(checkProgress);
                        }
                    }, 10000);
                }
            }
            
            // Initialize MIDI input
            if (window.modularApp.midiManager) {
                window.modularApp.midiManager.statusCallback = (status, message) => {
                    console.log(`[MIDI] ${status}: ${message}`);
                    
                    // Create or update MIDI status indicator
                    let indicator = document.getElementById('midi-status-indicator');
                    if (!indicator) {
                        indicator = document.createElement('div');
                        indicator.id = 'midi-status-indicator';
                        indicator.style.cssText = `
                            position: fixed;
                            bottom: 20px;
                            right: 20px;
                            background: rgba(100, 100, 100, 0.95);
                            color: white;
                            padding: 12px 20px;
                            border-radius: 8px;
                            font-family: var(--font-tech, monospace);
                            font-size: 0.85rem;
                            z-index: 10000;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                            transition: all 0.3s ease;
                        `;
                        document.body.appendChild(indicator);
                    }
                    
                    // Update status indicator
                    let bgColor = 'rgba(100, 100, 100, 0.95)';
                    let icon = '⚙️';
                    
                    switch(status) {
                        case 'error':
                            bgColor = 'rgba(200, 50, 50, 0.95)';
                            icon = '✗';
                            break;
                        case 'waiting':
                            bgColor = 'rgba(200, 150, 50, 0.95)';
                            icon = '⏳';
                            break;
                        case 'connected':
                            bgColor = 'rgba(50, 200, 100, 0.95)';
                            icon = '✓';
                            break;
                        case 'ready':
                            bgColor = 'rgba(50, 200, 100, 0.95)';
                            icon = '🎹';
                            break;
                        case 'disconnected':
                            bgColor = 'rgba(200, 100, 50, 0.95)';
                            icon = '⚠';
                            break;
                    }
                    
                    indicator.style.background = bgColor;
                    indicator.textContent = `${icon} ${message}`;
                    
                    // Auto-hide after 5 seconds for non-error states
                    if (status !== 'error' && status !== 'ready') {
                        setTimeout(() => {
                            if (indicator && indicator.parentNode) {
                                indicator.style.opacity = '0';
                                setTimeout(() => indicator && indicator.remove(), 300);
                            }
                        }, 5000);
                    }
                };
                
                // Initialize MIDI (will request permissions)
                window.modularApp.midiManager.init().catch(e => {
                    console.error('MIDI initialization error:', e);
                });

                // Set up MIDI note visualization on all pianos once
                const mm = window.modularApp.midiManager;
                if (!mm._uiNoteHandlersAttached) {
                    mm._uiNoteHandlersAttached = true;

                    mm.on('noteOn', ({ midi }) => {
                        // Global full keyboard
                        if (window.modularApp.pianoVisualizer && typeof window.modularApp.pianoVisualizer.midiNoteOn === 'function') {
                            window.modularApp.pianoVisualizer.midiNoteOn(midi);
                        }
                        // Learn: Piano Notes (1-octave keyboard)
                        if (window.learnPianoNotesInstance && typeof window.learnPianoNotesInstance.midiNoteOn === 'function') {
                            window.learnPianoNotesInstance.midiNoteOn(midi);
                        }
                    });

                    mm.on('noteOff', ({ midi }) => {
                        if (window.modularApp.pianoVisualizer && typeof window.modularApp.pianoVisualizer.midiNoteOff === 'function') {
                            window.modularApp.pianoVisualizer.midiNoteOff(midi);
                        }
                        if (window.learnPianoNotesInstance && typeof window.learnPianoNotesInstance.midiNoteOff === 'function') {
                            window.learnPianoNotesInstance.midiNoteOff(midi);
                        }
                    });
                }

                // Provide MIDI hookup for chord trainer
                if (window.learnChordsInstance && typeof window.learnChordsInstance.connectMidi === 'function') {
                    window.learnChordsInstance.connectMidi(window.modularApp.midiManager);
                }
            }
            
            // Setup control deck elements
            setupControlDeck();
            
            // Setup module toggle functionality
            setupModuleControls();
        });
        
        // Setup control deck global controls
        function setupControlDeck() {
            const app = window.modularApp;
            if (!app) return;
            
            // Enhanced Grading View Selector
            const gradingSelector = document.getElementById('global-grading-type');
            if (gradingSelector && app.musicTheory) {
                // Set initial value from music theory engine
                gradingSelector.value = app.musicTheory.gradingMode || 'functional';
                
                gradingSelector.addEventListener('change', (e) => {
                    app.musicTheory.setGradingMode(e.target.value);
                    updateGradingDescription(e.target.value);
                });
                
                // Update grading key legend when grading mode changes
                app.musicTheory.subscribe((event, data) => {
                    if (event === 'gradingModeChanged') {
                        updateGradingKeyLegend();
                        updateGradingDescription(data.mode);
                    }
                });
                
                // Initial render of grading key and description
                updateGradingKeyLegend();
                updateGradingDescription(gradingSelector.value);
            }
            
            // Grading Influence Controls
            setupGradingInfluenceControls(app);
            
            // Grading Preview and Tutorial
            setupGradingPreviewAndTutorial(app);
            
            // Global Manual Input
            const globalInput = document.getElementById('global-manual-numbers');
            if (globalInput && app.numberGenerator) {
                // Mirror local manual-numbers input behavior
                globalInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const value = e.target.value.trim();
                        if (!value) return;
                        
                        const tokens = value.split(/[\s,]+/).filter(t => t.length > 0);
                        
                        // Preview first
                        try { 
                            app.numberGenerator.setDisplayTokens(tokens, { rawTokens: tokens.slice(), emit: true }); 
                        } catch(_) {}
                        
                        // Commit via local input if present, or emit directly
                        const localInput = document.querySelector('#manual-numbers');
                        if (localInput) {
                            localInput.value = value;
                            try { 
                                app.numberGenerator.commitManualNumbers(localInput, { force: true }); 
                            } catch(e) { 
                                console.warn(e); 
                            }
                        } else {
                            try { 
                                app.numberGenerator.emit('displayTokensCommitted', { tokens, rawTokens: tokens }); 
                            } catch(_) {}
                        }
                        
                        // Clear global input
                        globalInput.value = '';
                    }
                });
            }
            
            function updateGradingKeyLegend() {
                const legend = document.getElementById('grading-key-legend');
                if (legend && app.musicTheory) {
                    const tiers = [4, 3, 2, 1, 0];
                    const items = tiers.map(t => {
                        const info = app.musicTheory.getGradingTierInfo(t);
                        return `<div style="display:flex; flex-direction:column; align-items:center; gap:2px;">
                            <div style="display:flex; align-items:center; gap:4px;">
                                <div style="width:12px; height:12px; background:${info.color}; border-radius:2px;"></div>
                                <span style="color:${info.color}; font-weight:600;">${info.short}</span>
                            </div>
                            <span style="font-size:0.65rem; color:${info.color}; opacity:0.8; white-space:nowrap;">${info.name}</span>
                        </div>`;
                    });
                    legend.innerHTML = items.join('');
                }
                
                // Also update sidebar grading key
                const sidebar = document.getElementById('grading-key-sidebar');
                if (sidebar && app.musicTheory) {
                    const mode = app.musicTheory.gradingMode || 'functional';
                    const tiers = [4, 3, 2, 1, 0];
                    const items = tiers.map(t => {
                        const info = app.musicTheory.getGradingTierInfo(t);
                        return `<div style="margin-bottom:12px;">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                                <div style="width:16px; height:16px; background:${info.color}; border-radius:3px; flex-shrink:0;"></div>
                                <span style="color:${info.color}; font-weight:bold; font-size:0.9rem;">${info.short} ${info.name}</span>
                            </div>
                            <div style="font-size:0.75rem; opacity:0.7; margin-left:22px;">${info.desc}</div>
                        </div>`;
                    });
                    sidebar.innerHTML = `
                        <div style="padding:10px;">
                            <div style="margin-bottom:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; font-size:0.68rem; color:var(--text-secondary);">
                                Chord Grading (${mode})
                            </div>
                            <div style="font-size:0.72rem; opacity:0.72; line-height:1.35; margin-bottom:10px;">
                                Grades are relative to the current key/scale context. Higher tiers generally mean "more stable / more inside"; lower tiers mean "more tension / more outside".
                                Use this as a guide for color and motion—not a hard rule.
                            </div>
                            ${items.join('')}
                        </div>
                    `;
                }
            }
            
            function updateGradingDescription(mode) {
                // Update any grading description displays
                const descriptions = {
                    functional: 'Analyzes harmonic function and voice leading',
                    emotional: 'Evaluates emotional impact and mood',
                    color: 'Color-based visual organization'
                };
                
                // Update tooltip or description if elements exist
                const gradingSelector = document.getElementById('global-grading-type');
                if (gradingSelector) {
                    gradingSelector.title = descriptions[mode] || 'Grading analysis mode';
                }
                
                // Update any description display elements
                const descriptionElement = document.getElementById('grading-description');
                if (descriptionElement) {
                    descriptionElement.textContent = descriptions[mode] || '';
                }
            }
            
            function setupGradingInfluenceControls(app) {
                // Setup visual influence slider
                const visualSlider = document.getElementById('visual-influence');
                const visualValue = document.getElementById('visual-influence-value');
                
                if (visualSlider && visualValue) {
                    visualSlider.addEventListener('input', (e) => {
                        const value = e.target.value;
                        visualValue.textContent = value + '%';
                        // Update app grading influence if method exists
                        if (app.musicTheory && app.musicTheory.setVisualInfluence) {
                            app.musicTheory.setVisualInfluence(value / 100);
                        }
                    });
                }
                
                // Setup behavior influence slider
                const behaviorSlider = document.getElementById('behavior-influence');
                const behaviorValue = document.getElementById('behavior-influence-value');
                
                if (behaviorSlider && behaviorValue) {
                    behaviorSlider.addEventListener('input', (e) => {
                        const value = e.target.value;
                        behaviorValue.textContent = value + '%';
                        // Update app grading influence if method exists
                        if (app.musicTheory && app.musicTheory.setBehaviorInfluence) {
                            app.musicTheory.setBehaviorInfluence(value / 100);
                        }
                    });
                }
            }
            
            function setupGradingPreviewAndTutorial(app) {
                // Setup grading preview button
                const previewBtn = document.getElementById('grading-preview-btn');
                if (previewBtn) {
                    previewBtn.addEventListener('click', () => {
                        // Show grading preview if method exists
                        if (app.musicTheory && app.musicTheory.showGradingPreview) {
                            app.musicTheory.showGradingPreview();
                        } else {
                            console.log('Grading preview functionality not yet implemented');
                        }
                    });
                }
                
                // Setup grading tutorial button
                const tutorialBtn = document.getElementById('grading-tutorial-btn');
                if (tutorialBtn) {
                    tutorialBtn.addEventListener('click', () => {
                        // Show grading tutorial if method exists
                        if (app.tutorialSystem && app.tutorialSystem.startGradingTutorial) {
                            app.tutorialSystem.startGradingTutorial();
                        } else {
                            console.log('Grading tutorial functionality not yet implemented');
                        }
                    });
                }
            }
        }
        
        // Module toggle and dropdown controls
        function setupModuleControls() {
            // Setup Return to Landing Page button
            const returnBtn = document.getElementById('return-to-landing');
            const returnToLanding = () => {
                const landingPage = document.getElementById('landing-page');
                const learnPage = document.getElementById('learn-piano-page');
                const workspace = document.querySelector('.workspace');
                const controlDeck = document.querySelector('.control-deck');
                const bottomDeck = document.querySelector('.bottom-deck');
                
                // Show landing page, hide workspace
                if (landingPage) landingPage.style.display = 'block';
                if (learnPage) learnPage.style.display = 'none';
                if (workspace) workspace.style.display = 'none';
                if (controlDeck) controlDeck.style.display = 'none';
                if (bottomDeck) bottomDeck.style.display = 'none';
            };
            
            if (returnBtn) {
                returnBtn.addEventListener('click', returnToLanding);
            }
            
            // Keyboard shortcut: Escape key to return to landing
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !e.target.matches('input, textarea')) {
                    const landingPage = document.getElementById('landing-page');
                    if (landingPage && landingPage.style.display === 'none') {
                        returnToLanding();
                    }
                }
            });
            
            // Setup Settings Dropdown
            const settingsBtn = document.getElementById('settings-dropdown-btn');
            const settingsPanel = document.getElementById('settings-dropdown-panel');
            
            if (settingsBtn && settingsPanel) {
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close other dropdowns
                    document.getElementById('help-dropdown-panel')?.classList.remove('open');
                    // Toggle settings dropdown
                    settingsPanel.classList.toggle('open');
                });
            }
            
            // Setup Help Dropdown
            const helpBtn = document.getElementById('help-dropdown-btn');
            const helpPanel = document.getElementById('help-dropdown-panel');
            
            if (helpBtn && helpPanel) {
                helpBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Close other dropdowns
                    document.getElementById('settings-dropdown-panel')?.classList.remove('open');
                    // Toggle help dropdown
                    helpPanel.classList.toggle('open');
                });
            }
            
            // Close dropdowns when clicking outside
            document.addEventListener('click', (e) => {
                const dropdowns = [settingsPanel, helpPanel];
                dropdowns.forEach(dropdown => {
                    if (dropdown && !dropdown.contains(e.target) && 
                        !e.target.closest('#settings-dropdown-btn') && 
                        !e.target.closest('#help-dropdown-btn')) {
                        dropdown.classList.remove('open');
                    }
                });
            });
            
            // Handle checkbox toggles for module visibility
            const toggleCheckboxes = document.querySelectorAll('.module-toggle-item input[type="checkbox"]');
            toggleCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    const moduleName = checkbox.getAttribute('data-module');
                    const module = document.querySelector(`.planet-module[data-module="${moduleName}"]`);
                    const sunElement = document.querySelector('.sun');
                    
                    if (moduleName === 'solar' && sunElement) {
                        sunElement.style.display = checkbox.checked ? 'flex' : 'none';
                    } else if (module) {
                        module.classList.toggle('hidden', !checkbox.checked);
                    }
                });
            });
            
            // Handle collapse buttons within each module
            const collapseButtons = document.querySelectorAll('.module-collapse-btn');
            collapseButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const module = btn.closest('.planet-module');
                    const isCollapsed = module.classList.contains('collapsed');
                    
                    module.classList.toggle('collapsed', !isCollapsed);
                    btn.textContent = isCollapsed ? '−' : '+';
                });
            });
            
            // Sync initial checkbox state with module visibility
            toggleCheckboxes.forEach(checkbox => {
                const moduleName = checkbox.getAttribute('data-module');
                if (moduleName === 'solar') {
                    const sunElement = document.querySelector('.sun');
                    const visible = !sunElement || sunElement.style.display !== 'none';
                    checkbox.checked = visible;
                } else {
                    const module = document.querySelector(`.planet-module[data-module="${moduleName}"]`);
                    const visible = module ? !module.classList.contains('hidden') : true;
                    checkbox.checked = visible;
                }
            });
            
            // Setup Skill Level Buttons
            const skillLevelBtns = document.querySelectorAll('.skill-level-btn');
            skillLevelBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const level = btn.getAttribute('data-level');
                    
                    // Update active button styling
                    skillLevelBtns.forEach(b => {
                        b.style.background = b === btn ? 'var(--accent-primary)' : 'transparent';
                        b.style.color = b === btn ? '#000' : 'var(--text-main)';
                        b.style.borderColor = b === btn ? 'var(--accent-primary)' : 'var(--accent-primary)';
                    });
                    
                    // Show/hide beginner section
                    const beginnerSection = document.getElementById('beginner-section');
                    if (beginnerSection) {
                        beginnerSection.style.display = level === 'beginner' ? 'block' : 'none';
                    }
                });
            });
        }
        
        function setupModuleDrag() {
            const modules = document.querySelectorAll('.planet-module');
            const grid = document.querySelector('.modules-grid');
            
            modules.forEach(module => {
                const header = module.querySelector('.module-header');
                let isDragging = false;
                let startX, startY, startScrollLeft, startScrollTop;
                
                header.addEventListener('mousedown', (e) => {
                    // Only drag if not clicking on collapse button
                    if (e.target.classList.contains('module-collapse-btn')) return;
                    
                    isDragging = true;
                    startX = e.pageX;
                    startY = e.pageY;
                    module.style.opacity = '0.7';
                    module.style.cursor = 'grabbing';
                    header.style.cursor = 'grabbing';
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    e.preventDefault();
                    
                    const deltaX = e.pageX - startX;
                    const deltaY = e.pageY - startY;
                    
                    // Visual feedback during drag
                    module.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                });
                
                document.addEventListener('mouseup', (e) => {
                    if (!isDragging) return;
                    
                    isDragging = false;
                    module.style.opacity = '1';
                    module.style.cursor = 'default';
                    header.style.cursor = 'move';
                    
                    const deltaX = e.pageX - startX;
                    const deltaY = e.pageY - startY;
                    
                    // If dragged significantly, reorder in grid
                    if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
                        const allModules = Array.from(grid.querySelectorAll('.planet-module'));
                        const fromIndex = allModules.indexOf(module);
                        
                        // Find closest module to drop position
                        let closestModule = null;
                        let closestDistance = Infinity;
                        
                        allModules.forEach((otherModule, index) => {
                            if (otherModule === module) return;
                            
                            const rect = otherModule.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;
                            const distance = Math.sqrt(
                                Math.pow(e.pageX - centerX, 2) + 
                                Math.pow(e.pageY - centerY, 2)
                            );
                            
                            if (distance < closestDistance) {
                                closestDistance = distance;
                                closestModule = otherModule;
                            }
                        });
                        
                        // Reorder if we found a close module
                        if (closestModule && closestDistance < 200) {
                            const toIndex = allModules.indexOf(closestModule);
                            if (toIndex < fromIndex) {
                                grid.insertBefore(module, closestModule);
                            } else {
                                grid.insertBefore(module, closestModule.nextSibling);
                            }
                        }
                    }
                    
                    // Reset transform
                    module.style.transform = '';
                });
            });
        }