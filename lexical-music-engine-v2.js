/**
 * @module LexicalMusicEngineV2
 * @description INTELLIGENT Word-to-Music Translation with Full Integration
 * 
 * THIS IS NOT A TOY. This system:
 * - Deeply integrates with your grading system (Perfect/Excellent/Good/Fair tiers)
 * - Uses your functional harmony analysis (Tonic/Subdominant/Dominant/LeadingTone)
 * - Respects chromatic vs diatonic distinctions
 * - Generates chord variations using your existing intelligent systems
 * - Provides REASONING for every musical choice
 * - Connects to all your existing tools (ContainerChordTool, ProgressionBuilder, etc.)
 * 
 * "chase woods" should give you:
 * - E Phrygian (dark, urgent scale)
 * - Em → F → Em → F (driving ostinato)
 * - Power chords in low register
 * - Reasoning: "chase" = high arousal + negative valence → phrygian mode
 *             "woods" = nature + darkness → minor tonic emphasis
 */

class LexicalMusicEngineV2 {
    constructor(musicTheoryEngine, wordDatabase = null) {
        if (!musicTheoryEngine) {
            throw new Error('LexicalMusicEngineV2 requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.wordDb = wordDatabase || new WordDatabase();
        
        // NEW: Generative system components
        this.phoneticAnalyzer = typeof PhoneticAnalyzer !== 'undefined' ? new PhoneticAnalyzer() : null;
        this.chordAttributeEngine = typeof ChordAttributeEngine !== 'undefined' ? new ChordAttributeEngine() : null;
        this.semanticAPI = typeof SemanticAPIEngine !== 'undefined' ? new SemanticAPIEngine() : null;
        this.voiceLeadingEngine = typeof VoiceLeadingEngine !== 'undefined' ? new VoiceLeadingEngine(this.musicTheory) : null;
        this.generativeMapper = null;
        
        // Initialize generative mapper if components available
        if (this.phoneticAnalyzer && this.chordAttributeEngine) {
            this.generativeMapper = new GenerativeWordMapper(
                this.phoneticAnalyzer,
                this.chordAttributeEngine,
                this.musicTheory,
                {
                    semanticAPI: this.semanticAPI,
                    voiceLeading: this.voiceLeadingEngine,
                    useRealTimeSemantics: true
                }
            );
            console.log('[LexicalV2] Generative system initialized with real-time semantics + voice leading ✓');
        } else {
            console.log('[LexicalV2] Running in legacy mode (generative system not available)');
        }
        
        // Access to other system components (passed in after init)
        this.containerChordTool = null;
        this.progressionBuilder = null;
        this.scaleLibrary = null;
        
        // Analysis cache
        this.cache = new Map();
        
        // Debug mode
        this.debug = true;
        // Session log for translation history
        this.sessionLog = [];
        // Use full chord palette (ignore single-key rigidity) when building progressions
        // DISABLED: This was causing all progressions to be the same
        this.useFullPalette = false;
        // Use dynamic key selection (varies by analysis) vs traditional fixed keys
        this.useDynamicKeys = true;
        
        // NEW: Generative system settings
        this.useGenerativeSystem = true; // Use the intelligent generative system
        this.generativeWeights = {
            phonetic: 0.6,  // Weight of sound-based analysis
            semantic: 0.4   // Weight of meaning-based analysis
        };
    }

    /** Link to other system components */
    linkComponents(components = {}) {
        if (components.containerChordTool) this.containerChordTool = components.containerChordTool;
        if (components.progressionBuilder) this.progressionBuilder = components.progressionBuilder;
        if (components.scaleLibrary) this.scaleLibrary = components.scaleLibrary;
        this._log('Linked components:', Object.keys(components));
    }

    _log(...args) {
        if (this.debug) console.log('[LexicalV2]', ...args);
    }

    /**
     * MAIN ENTRY: Translate words to music with FULL REASONING
     * Now supports async for real-time semantic analysis
     */
    async translateWords(wordsString, options = {}) {
        this._log('=== TRANSLATE WORDS ===', wordsString);
        
        if (!wordsString || typeof wordsString !== 'string') {
            return this._emptyResult('No input provided');
        }

        // NEW: Try generative system first if enabled
        if (this.useGenerativeSystem && this.generativeMapper) {
            try {
                this._log('Using GENERATIVE system with real-time semantics');
                const generativeResult = await this.generativeMapper.mapWords(wordsString, {
                    weights: this.generativeWeights
                });
                
                // Convert generative result to legacy format for compatibility
                const converted = this._convertGenerativeToLegacy(generativeResult);
                this._log('Generative result:', converted);
                
                // Record log entry with proper weight mapping
                try {
                    const mappedWeights = {
                        emotional: 0.30,
                        semantic: this.generativeWeights.semantic || 0.40,
                        phonetic: this.generativeWeights.phonetic || 0.60,
                        archetype: 0.10
                    };
                    const entry = this._formatLogEntry(wordsString, converted, mappedWeights);
                    this.sessionLog.push(entry);
                    converted._latestLogEntry = entry;
                } catch (e) {
                    this._log('Failed to record log entry:', e);
                }
                
                return converted;
            } catch (error) {
                this._log('Generative system failed, falling back to legacy:', error);
                // Fall through to legacy system
            }
        }

        // LEGACY SYSTEM (original implementation)
        // Parse words
        const words = this._parseInput(wordsString);
        if (words.length === 0) {
            return this._emptyResult('No valid words detected');
        }

        this._log('Parsed words:', words);

        // STEP 1: Analyze each word thoroughly
        const analyses = words.map(w => this.analyzeWord(w));
        // weights influence how different analysis channels are aggregated
        const weights = options.weights || { emotional: 0.30, syllabic: 0.20, phonetic: 0.15, semantic: 0.25, archetype: 0.10 };
        this._log('Word analyses:', analyses);

        // STEP 2: Check for archetype match
        const archetypeMatch = this.wordDb.matchArchetype(words, analyses);
        if (archetypeMatch && archetypeMatch.confidence > 0.7) {
            this._log('ARCHETYPE MATCHED:', archetypeMatch.name, archetypeMatch.confidence);
            return this._applyArchetype(archetypeMatch, analyses, words);
        }

        // STEP 3: Build from sophisticated analysis
        // Allow aggressive override flag to be set on the engine instance during this run
        const prevAggressive = this._aggressiveOverride;
        this._aggressiveOverride = !!options.aggressive;
        // Temporarily set dynamic keys preference if specified
        const prevDynamicKeys = this.useDynamicKeys;
        if (options.dynamicKeys !== undefined) {
            this.useDynamicKeys = !!options.dynamicKeys;
        }
        const result = this._buildIntelligentProgression(analyses, words, weights);
        // restore
        this._aggressiveOverride = prevAggressive;
        this.useDynamicKeys = prevDynamicKeys;

        // Record a user-friendly log entry for this translation
        try {
            const usedWeights = options.weights || { emotional: 0.30, syllabic: 0.20, phonetic: 0.15, semantic: 0.25, archetype: 0.10 };
            const entry = this._formatLogEntry(wordsString, result, usedWeights);
            this.sessionLog.push(entry);
            this._log('Logged translation entry');
            // Attach latest log entry to result for UI convenience
            result._latestLogEntry = entry;
        } catch (e) {
            this._log('Failed to record log entry:', e);
        }

        return result;
    }

    /**
     * Format a concise, human-readable log entry for a translation
     */
    _formatLogEntry(inputString, result, weights) {
        const time = new Date();
        const ts = time.toLocaleTimeString();

        // Format progression into compact string
        const progressionStr = (result.progression || []).map(ch => `${ch.fullName} (${ch.degree}) [${ch.function}] T${ch.tier}`).join(' → ');

        // Complexity formatting
        const comp = result.complexity || {};
        const h = Math.round((comp.harmonic || 0) * 100);
        const r = Math.round((comp.rhythmic || 0) * 100);
        const e = Math.round((comp.emotional || 0) * 100);
        const complexityStr = `H=${h}% R=${r}% E=${e}% (${comp.overall || 'triads'})`;

        // Short reasoning line
        const reasoning = (result.reasoning && result.reasoning.summary) ? result.reasoning.summary : '';

        // Weights formatting with percentages
        const w = weights || {};
        const weightsStr = `Emotional=${Math.round((w.emotional||0)*100)}% Semantic=${Math.round((w.semantic||0)*100)}% Phonetic=${Math.round((w.phonetic||0)*100)}% Arch=${Math.round((w.archetype||w.arch||0)*100)}%`;

        const entry = {
            timestamp: time.toISOString(),
            time: ts,
            input: inputString,
            scale: result.scale ? `${result.scale.root} ${result.scale.name}` : '',
            progression: progressionStr,
            complexity: complexityStr,
            reasoning: reasoning,
            weights: w,
            weightsStr: weightsStr,
            raw: result
        };

        // Also create a compact multi-line text blob for quick display
        entry.text = `# [${entry.time}] "${entry.input}"\n  Scale: ${entry.scale}\n  Progression: ${entry.progression}\n  Complexity: ${entry.complexity}\n  Reasoning: ${entry.reasoning}\n  Weights: ${entry.weightsStr}\n`;

        return entry;
    }

    /**
     * Retrieve session log entries (most recent last)
     */
    getSessionLog() {
        return this.sessionLog.slice();
    }

    /**
     * Analyze single word with DEPTH and RICH MUSICAL ATTRIBUTES
     */
    analyzeWord(word) {
        word = word.toLowerCase().trim();
        
        if (this.cache.has(word)) {
            return { ...this.cache.get(word) };
        }

        // Get emotional valence from database
        const emotional = this.wordDb.getEmotionalValence(word);
        
        // Get semantic category
        const semantic = this.wordDb.getSemanticCategory(word);
        
        // Phonetic analysis
        const phonetics = this._analyzePhonetics(word);
        
        // Syllable count for rhythm
        const syllables = this._countSyllables(word);
        
        // NEW: Rich musical attributes
        const musicalAttributes = {
            tension: this._calculateTension(word, emotional),
            color: {
                warmth: this._calculateWarmth(word, emotional, phonetics),
                brightness: phonetics.brightness || 0.5,
                saturation: emotional.dominance || 0.5
            },
            texture: {
                density: this._calculateDensity(word, emotional),
                spread: this._calculateSpread(word, emotional),
                weight: emotional.dominance || 0.5
            },
            motion: {
                speed: emotional.arousal || 0.5,
                direction: this._calculateDirection(word),
                smoothness: this._calculateSmoothness(word)
            },
            register: {
                preferred: this._calculateRegister(word, emotional),
                range: this._calculateRange(word, emotional),
                emphasis: this._calculateEmphasis(word)
            },
            intervals: {
                consonance: 1.0 - this._calculateTension(word, emotional),
                preferred: this._getPreferredIntervals(word, emotional),
                avoided: this._getAvoidedIntervals(word, emotional)
            }
        };
        
        const analysis = {
            word,
            emotional,          // {valence, arousal, dominance}
            semantic,           // {name, scales, progressions}
            phonetics,          // {brightness, harshness}
            syllables,
            musicalAttributes,  // NEW: rich attributes for voicing/intervals
            implications: this._deriveMusicalImplications(emotional, semantic, phonetics, musicalAttributes)
        };

        this.cache.set(word, analysis);
        return analysis;
    }

    /**
     * Derive musical implications from analysis with EVOCATIVE REASONING
     */
    _deriveMusicalImplications(emotional, semantic, phonetics, musicalAttributes) {
        const implications = {
            scaleMode: null,
            voicing: null,
            register: null,
            chordQuality: null,
            extensions: [],
            avoidNotes: [],
            functionalRole: null,
            reasoning: []
        };

        const {valence, arousal, dominance} = emotional;
        const attrs = musicalAttributes || {};

        // SCALE/MODE SELECTION with EVOCATIVE reasoning
        if (valence < -0.4) {
            if (arousal > 0.6) {
                implications.scaleMode = 'phrygian';
                implications.reasoning.push(`🔥 Phrygian mode: dark fire, the tension between ${Math.round(arousal*100)}% arousal and ${Math.round(Math.abs(valence)*100)}% negativity creates an urgent, Spanish-tinged darkness`);
            } else if (dominance < -0.3) {
                implications.scaleMode = 'locrian';
                implications.reasoning.push(`💀 Locrian mode: unstable abyss, low dominance (${Math.round(Math.abs(dominance)*100)}%) suggests a diminished, questioning quality—the most dissonant of modes`);
            } else {
                implications.scaleMode = 'aeolian';
                implications.reasoning.push(`🌙 Aeolian/Natural Minor: melancholic moon, pure sadness at ${Math.round(Math.abs(valence)*100)}% negative valence with ${Math.round((1-arousal)*100)}% calmness`);
            }
        } else if (valence > 0.4) {
            if (arousal > 0.6) {
                implications.scaleMode = 'lydian';
                implications.reasoning.push(`✨ Lydian mode: ethereal ascension, #4 creates floating dreaminess at ${Math.round(valence*100)}% positivity and ${Math.round(arousal*100)}% energy—think John Williams`);
            } else {
                implications.scaleMode = 'major';
                implications.reasoning.push(`☀️ Major scale: pure joy, ${Math.round(valence*100)}% positive with ${Math.round((1-arousal)*100)}% serenity creates stable, classical brightness`);
            }
        } else {
            if (arousal > 0.5) {
                implications.scaleMode = 'dorian';
                implications.reasoning.push(`🌊 Dorian mode: mysterious flow, neutral valence with ${Math.round(arousal*100)}% movement—jazz's favorite minor with raised 6th`);
            } else {
                implications.scaleMode = 'major';
                implications.reasoning.push(`🎯 Major (default): balanced center, neutral emotional space provides stable harmonic foundation`);
            }
        }

        // VOICING/REGISTER with RICH ATTRIBUTES
        if (attrs.register && attrs.texture) {
            const reg = attrs.register.preferred;
            const spread = attrs.texture.spread;
            const density = attrs.texture.density;
            
            if (reg === 'high') {
                implications.register = 'mid-high';
                implications.voicing = spread > 0.6 ? 'open' : 'standard';
                implications.reasoning.push(`🦅 High register voicing: treble emphasis at ${Math.round(spread*100)}% spread—bright, soaring quality like birds ascending`);
            } else if (reg === 'low') {
                implications.register = 'mid-low';
                implications.voicing = density > 0.6 ? 'close' : 'standard';
                implications.reasoning.push(`🌊 Low register voicing: bass foundation at ${Math.round(density*100)}% density—grounded, oceanic depths`);
            } else if (reg === 'extreme') {
                implications.register = 'full-range';
                implications.voicing = 'wide';
                implications.reasoning.push(`🌌 Extreme range: cosmic span from depths to heights, ${Math.round(attrs.register.range)} octave range—think Messiaen's piano writing`);
            } else {
                implications.register = 'mid';
                implications.voicing = spread > 0.5 ? 'open' : 'standard';
                implications.reasoning.push(`🎹 Mid-range voicing: comfortable piano tessiturain ${implications.voicing} spacing`);
            }
        } else {
            // Fallback based on arousal
            if (arousal > 0.6) {
                implications.register = 'mid-high';
                implications.voicing = 'open';
                implications.reasoning.push(`⚡ High energy → mid-high register, open voicings for intensity`);
            } else if (arousal < -0.3) {
                implications.register = 'mid-low';
                implications.voicing = 'close';
                implications.reasoning.push(`🕊️ Low arousal → mid-low register, intimate close voicings`);
            } else {
                implications.register = 'mid';
                implications.voicing = 'standard';
            }
        }

        // CHORD QUALITY with EMOTIONAL DEPTH
        if (valence < 0) {
            implications.chordQuality = 'minor';
            implications.reasoning.push(`🖤 Minor chord preference: negative valence ${Math.round(Math.abs(valence)*100)}% drives minor thirds—the sound of longing`);
        } else {
            implications.chordQuality = 'major';
            implications.reasoning.push(`💛 Major chord preference: positive valence ${Math.round(valence*100)}% favors major thirds—consonant resolution`);
        }

        // EXTENSIONS with TENSION/COLOR attributes
        if (attrs.tension && attrs.tension > 0.6) {
            implications.extensions.push('7', '#9', 'sus4');
            implications.reasoning.push(`⚠️ High tension (${Math.round(attrs.tension*100)}%) → add dissonant extensions: dominant 7ths, sharp 9s, suspensions that yearn to resolve`);
        } else if (phonetics.brightness > 0.6) {
            implications.extensions.push('maj7', '9', 'add9');
            implications.reasoning.push(`💎 Bright phonetics (${Math.round(phonetics.brightness*100)}%) → crystalline extensions: major 7ths, 9ths adding shimmer and air`);
        } else if (phonetics.brightness < 0.3) {
            implications.extensions.push('m7b5', 'dim7');
            implications.reasoning.push(`🌑 Dark phonetics (${Math.round((1-phonetics.brightness)*100)}% darkness) → half-diminished, diminished 7ths—Rachmaninoff's shadowy palette`);
        }

        // MOTION attributes influence voice leading
        if (attrs.motion) {
            const {direction, smoothness} = attrs.motion;
            if (Math.abs(direction) > 0.5) {
                const dir = direction > 0 ? 'ascending' : 'descending';
                implications.reasoning.push(`${direction > 0 ? '↗️' : '↘️'} Melodic ${dir} motion: voice leading will emphasize ${dir} lines, creating directional momentum`);
            }
            if (smoothness > 0.7) {
                implications.reasoning.push(`🎭 Stepwise motion: smooth voice leading (${Math.round(smoothness*100)}% legato) prefers seconds and thirds—Bach-like counterpoint`);
            } else if (smoothness < 0.3) {
                implications.reasoning.push(`⚡ Leaping motion: angular intervals (${Math.round((1-smoothness)*100)}% disjunct) create dramatic, Webern-esque gestures`);
            }
        }

        // SEMANTIC INFLUENCES with CONTEXT
        if (semantic) {
            if (semantic.name === 'nature') {
                implications.reasoning.push(`🌲 Nature imagery → organic modes like ${semantic.scales.join(', ')}, Debussy's impressionistic palette`);
            } else if (semantic.name === 'urban') {
                implications.extensions.push('7#9', 'alt');
                implications.reasoning.push(`🏙️ Urban context → jazz alterations (#9, b9, #11), Gershwin's city sophistication`);
            } else if (semantic.name === 'mystical') {
                implications.extensions.push('sus', 'add9');
                implications.reasoning.push(`🔮 Mystical atmosphere → suspended and added notes create ambiguous, otherworldly harmonies—Arvo Pärt's tintinnabuli`);
            }
        }

        // WARMTH/COLOR influences chord voicing
        if (attrs.color) {
            if (attrs.color.warmth > 0.7) {
                implications.reasoning.push(`🔥 Warm color (${Math.round(attrs.color.warmth*100)}%) → favor lower partials, round voicings, Brahmsian richness`);
            } else if (attrs.color.warmth < 0.3) {
                implications.reasoning.push(`❄️ Cold color (${Math.round((1-attrs.color.warmth)*100)}% chill) → upper partials, sparse textures, Sibelius's Nordic clarity`);
            }
        }

        return implications;
    }

    /**
     * Build intelligent progression using YOUR existing systems
     */
    _buildIntelligentProgression(analyses, words, weights = { emotional: 0.30, syllabic: 0.20, phonetic: 0.15, semantic: 0.25, archetype: 0.10 }) {
        this._log('Building intelligent progression...');

        // Aggregate implications
        const aggregated = this._aggregateImplications(analyses, weights);
        this._log('Aggregated implications:', aggregated);
        
        // Choose scale/key with dynamic selection
        let scale = this._chooseScale(aggregated);
        this._log('Chosen scale:', scale);

        let progression = [];
        
        // Always build progression based on the chosen scale for consistency
        // The key variety comes from _chooseScale, not from loose building
        progression = this._buildProgressionWithFunctionalHarmony(aggregated, scale, analyses, weights);
        
        // If functional harmony builder failed, try loose as fallback
        if (!progression || progression.length === 0) {
            this._log('Functional harmony failed, trying loose builder...');
            progression = this._buildProgressionLoose(analyses, weights, aggregated, scale);
            // Derive scale from progression if loose builder succeeded
            if (progression && progression.length > 0) {
                try {
                    const tonic = progression[0] && progression[0].root ? progression[0].root : (scale.root || 'C');
                    scale = { root: tonic, mode: aggregated.dominantMode || 'major', _selectionReasoning: scale._selectionReasoning };
                } catch (_) {}
            }
        }
        
        this._log('Built progression:', progression);

        // Generate voicings
        const voicings = this._generateVoicings(aggregated, progression);

        // Calculate complexity
        const complexity = this._calculateComplexity(aggregated, progression);

        // Compile all reasoning
        const reasoning = this._compileReasoning(analyses, aggregated, scale, progression);

        return {
            scale: {
                root: scale.root,
                name: scale.mode,
                key: scale.root,        // For compatibility
                scale: scale.mode       // For compatibility
            },
            progression,
            voicings,
            complexity,
            analyses,
            reasoning,
            archetypeMatch: null
        };
    }

    /**
     * Aggregate implications from all words INCLUDING musical attributes
     */
    _aggregateImplications(analyses, weights = { emotional: 0.30, syllabic: 0.20, phonetic: 0.15, semantic: 0.25, archetype: 0.10 }) {
        const agg = {
            averageValence: 0,
            averageArousal: 0,
            averageDominance: 0,
            dominantMode: null,
            extensions: new Set(),
            avoidNotes: new Set(),
            voicing: 'standard',
            register: 'mid',
            allReasons: [],
            channelScores: {
                emotional: 0,
                semantic: 0,
                phonetic: 0,
                archetype: 0
            }
            ,
            signals: {
                darkTokens: [],
                highArousalTokens: []
            },
            // NEW: Aggregate musical attributes
            musicalAttributes: {
                tension: 0,
                warmth: 0,
                brightness: 0,
                density: 0,
                spread: 0,
                smoothness: 0,
                preferredRegister: 'mid',
                rangeOctaves: 2.0,
                preferredIntervals: [],
                avoidedIntervals: []
            }
        };

        // Raw averages (for tonal texture / voicing decisions)
        analyses.forEach(a => {
            agg.averageValence += (a.emotional && typeof a.emotional.valence === 'number') ? a.emotional.valence : 0;
            agg.averageArousal += (a.emotional && typeof a.emotional.arousal === 'number') ? a.emotional.arousal : 0;
            agg.averageDominance += (a.emotional && typeof a.emotional.dominance === 'number') ? a.emotional.dominance : 0;

            // Collect extensions
            if (a.implications && Array.isArray(a.implications.extensions)) {
                a.implications.extensions.forEach(ext => agg.extensions.add(ext));
            }

            // Collect reasoning
            if (a.implications && Array.isArray(a.implications.reasoning)) {
                agg.allReasons.push(...a.implications.reasoning);
            }

            // NEW: Aggregate musical attributes from each word
            if (a.musicalAttributes) {
                const ma = a.musicalAttributes;
                if (typeof ma.tension === 'number') agg.musicalAttributes.tension += ma.tension;
                if (ma.color) {
                    if (typeof ma.color.warmth === 'number') agg.musicalAttributes.warmth += ma.color.warmth;
                    if (typeof ma.color.brightness === 'number') agg.musicalAttributes.brightness += ma.color.brightness;
                }
                if (ma.texture) {
                    if (typeof ma.texture.density === 'number') agg.musicalAttributes.density += ma.texture.density;
                    if (typeof ma.texture.spread === 'number') agg.musicalAttributes.spread += ma.texture.spread;
                }
                if (ma.motion && typeof ma.motion.smoothness === 'number') {
                    agg.musicalAttributes.smoothness += ma.motion.smoothness;
                }
                // Collect interval preferences
                if (ma.intervals) {
                    if (Array.isArray(ma.intervals.preferred)) {
                        ma.intervals.preferred.forEach(iv => {
                            if (!agg.musicalAttributes.preferredIntervals.includes(iv)) {
                                agg.musicalAttributes.preferredIntervals.push(iv);
                            }
                        });
                    }
                    if (Array.isArray(ma.intervals.avoided)) {
                        ma.intervals.avoided.forEach(iv => {
                            if (!agg.musicalAttributes.avoidedIntervals.includes(iv)) {
                                agg.musicalAttributes.avoidedIntervals.push(iv);
                            }
                        });
                    }
                }
            }
        });

        const count = Math.max(1, analyses.length);
        agg.averageValence /= count;
        agg.averageArousal /= count;
        agg.averageDominance /= count;
        
        // Average musical attributes
        agg.musicalAttributes.tension /= count;
        agg.musicalAttributes.warmth /= count;
        agg.musicalAttributes.brightness /= count;
        agg.musicalAttributes.density /= count;
        agg.musicalAttributes.spread /= count;
        agg.musicalAttributes.smoothness /= count;
        
        // Choose register based on aggregated tension/arousal
        if (agg.averageArousal > 0.7 || agg.musicalAttributes.tension > 0.7) {
            agg.musicalAttributes.preferredRegister = 'high';
            agg.musicalAttributes.rangeOctaves = 3.0 + agg.musicalAttributes.spread;
        } else if (agg.averageArousal < 0.3) {
            agg.musicalAttributes.preferredRegister = 'low';
            agg.musicalAttributes.rangeOctaves = 1.5 + agg.musicalAttributes.spread * 0.5;
        } else {
            agg.musicalAttributes.preferredRegister = 'mid';
            agg.musicalAttributes.rangeOctaves = 2.0 + agg.musicalAttributes.spread * 0.8;
        }

        this._log('Aggregated musical attributes:', agg.musicalAttributes);

        // Mode voting using weighted channels so UI weights matter
        const modeScores = {};
        analyses.forEach(a => {
            const modeFromImp = a.implications && a.implications.scaleMode;
            if (modeFromImp) {
                modeScores[modeFromImp] = (modeScores[modeFromImp] || 0) + (weights.emotional || 0);
                agg.channelScores.emotional += (weights.emotional || 0);
            }

            // Semantic suggestions (if semantic.scales exists, those are preferred modes)
            if (a.semantic && Array.isArray(a.semantic.scales)) {
                a.semantic.scales.forEach(s => {
                    // semantic scale strings may be like 'major' or 'dorian'
                    modeScores[s] = (modeScores[s] || 0) + (weights.semantic || 0) * 0.8;
                    agg.channelScores.semantic += (weights.semantic || 0) * 0.8;
                });
            }

            // Phonetic brightness can bias toward bright modes
            if (a.phonetics && typeof a.phonetics.brightness === 'number') {
                if (a.phonetics.brightness > 0.7) {
                    modeScores['lydian'] = (modeScores['lydian'] || 0) + (weights.phonetic || 0) * 0.6;
                    agg.channelScores.phonetic += (weights.phonetic || 0) * 0.6;
                } else if (a.phonetics.brightness < 0.3) {
                    modeScores['aeolian'] = (modeScores['aeolian'] || 0) + (weights.phonetic || 0) * 0.6;
                    agg.channelScores.phonetic += (weights.phonetic || 0) * 0.6;
                }
            }

            // Strong keyword heuristic: prioritize darker/minor modes for explicitly dark/violent or melancholic tokens
            if (a.word) {
                const w = String(a.word || '').toLowerCase();
                // Violent / explicitly dark tokens
                const violent = /blood|kill|murder|bleed|slaughter|death|attack|chase|slay|evil|sinister|grave|panic/.test(w);
                // Melancholic / lonely tokens
                const melancholic = /lonely|sad|alone|bereft|sorrow|gloom|melancholy|despair/.test(w);

                if (violent) {
                    // Strongly bias toward phrygian for violent/dread tokens
                    modeScores['phrygian'] = (modeScores['phrygian'] || 0) + (weights.emotional || 0) * 2.0;
                    modeScores['aeolian'] = (modeScores['aeolian'] || 0) + (weights.emotional || 0) * 0.8;
                    agg.allReasons.push(`Token '${a.word}' suggests darker/violent mode (heuristic)`);
                    agg.signals.darkTokens.push(a.word);
                    // Boost emotional channel influence when explicit dark tokens found
                    agg.channelScores.emotional += (weights.emotional || 0) * 1.5;
                }

                if (melancholic) {
                    // Suggest minor modes (aeolian, dorian, phrygian) but allow variety
                    // Don't force aeolian exclusively - spread votes across minor modes
                    modeScores['aeolian'] = (modeScores['aeolian'] || 0) + (weights.emotional || 0) * 0.8;
                    modeScores['dorian'] = (modeScores['dorian'] || 0) + (weights.emotional || 0) * 0.7;
                    modeScores['phrygian'] = (modeScores['phrygian'] || 0) + (weights.emotional || 0) * 0.6;
                    agg.allReasons.push(`Token '${a.word}' suggests minor mode family`);
                    agg.signals.darkTokens.push(a.word);
                    agg.channelScores.emotional += (weights.emotional || 0) * 0.8;
                }
            }

            // high arousal tokens collect
            if (a.emotional && typeof a.emotional.arousal === 'number' && a.emotional.arousal > 0.6) {
                agg.signals.highArousalTokens.push(a.word);
            }

            // Archetype - if archetype present push its preferred mode
            if (a.archetypeMatch && a.archetypeMatch.preferredMode) {
                const m = a.archetypeMatch.preferredMode;
                modeScores[m] = (modeScores[m] || 0) + (weights.archetype || 0) * 1.0;
                agg.channelScores.archetype += (weights.archetype || 0);
            }
        });

        // If explicit dark tokens exist AND aggressive mapping enabled, force darker modes
        // Otherwise let the weighted voting system work naturally for variety
        if (this._aggressiveOverride && agg.signals.darkTokens && agg.signals.darkTokens.length > 0) {
            // Only force when aggressive mode is ON
            let pick = null;
            if (agg.averageArousal > 0.45 || agg.signals.highArousalTokens.length > 0) {
                pick = 'phrygian';
            } else {
                pick = 'aeolian';
            }
            agg._forcedMode = pick;
            agg.dominantMode = pick;
            agg.allReasons.push(`AGGRESSIVE: ${agg.signals.darkTokens.join(', ')} → forced ${agg.dominantMode}`);
        }

        // Fallback: if no modeScores found, fall back to mode suggested most often in implications
        if (Object.keys(modeScores).length === 0) {
            const modeCounts = {};
            analyses.forEach(a => {
                const mode = a.implications && a.implications.scaleMode;
                if (mode) modeCounts[mode] = (modeCounts[mode] || 0) + 1;
            });
            if (Object.keys(modeCounts).length > 0) {
                agg.dominantMode = Object.keys(modeCounts).reduce((x, y) => modeCounts[x] > modeCounts[y] ? x : y);
            } else {
                agg.dominantMode = 'major';
            }
        } else {
            agg.dominantMode = Object.keys(modeScores).reduce((x, y) => modeScores[x] > modeScores[y] ? x : y);
        }

        // If we set a forced mode earlier (from explicit dark tokens / aggressive mapping), respect it
        if (agg._forcedMode) {
            agg.dominantMode = agg._forcedMode;
        }

        // Choose voicing/register from most intense word (still useful)
        const mostIntense = analyses.reduce((max, a) => {
            if (!max) return a;
            return Math.abs(a.emotional.arousal) > Math.abs(max.emotional.arousal) ? a : max;
        }, analyses[0]);
        if (mostIntense && mostIntense.implications) {
            agg.voicing = mostIntense.implications.voicing || agg.voicing;
            agg.register = mostIntense.implications.register || agg.register;
        }

        return agg;
    }

    /**
     * Choose scale with reasoning - DYNAMIC KEY SELECTION
     * No longer hardcoded to same roots; varies by analysis
     */
    _chooseScale(aggregated) {
        // Start with dominant mode
        let mode = aggregated.dominantMode || 'major';
        
        // If dynamic keys disabled, use traditional fixed mapping
        if (!this.useDynamicKeys) {
            const rootMap = {
                'major': 'C',
                'lydian': 'F',
                'mixolydian': 'G',
                'dorian': 'D',
                'aeolian': 'A',
                'phrygian': 'E',
                'locrian': 'B'
            };
            return {
                root: rootMap[mode] || 'C',
                mode: mode,
                _selectionReasoning: `Traditional fixed key for ${mode}`
            };
        }
        
        // Build candidate roots with scoring
        const allRoots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const rootScores = {};
        
        allRoots.forEach(root => rootScores[root] = 0);
        
        // Factor 1: Emotional valence influences brightness of root
        // Positive valence -> brighter keys (more sharps: D, A, E, B, F#, C#)
        // Negative valence -> darker keys (more flats: F, Bb, Eb, Ab, Db, Gb)
        const valence = aggregated.averageValence || 0;
        if (valence > 0.2) {
            // Positive: favor sharp keys
            rootScores['D'] += 1.5; rootScores['A'] += 1.5; rootScores['E'] += 1.5;
            rootScores['B'] += 1.2; rootScores['F#'] += 1.0; rootScores['C#'] += 0.8;
        } else if (valence < -0.2) {
            // Negative: favor flat keys
            rootScores['F'] += 1.5; rootScores['D#'] += 1.5; rootScores['G#'] += 1.5;
            rootScores['C#'] += 1.2; rootScores['G#'] += 1.0; rootScores['A#'] += 0.8;
        } else {
            // Neutral: favor natural keys
            rootScores['C'] += 1.5; rootScores['G'] += 1.5; rootScores['D'] += 1.0;
            rootScores['F'] += 1.0; rootScores['A'] += 1.0;
        }
        
        // Factor 2: Arousal influences register suggestion (higher arousal -> higher pitch roots)
        const arousal = aggregated.averageArousal || 0;
        if (arousal > 0.6) {
            // High energy: favor higher-register roots (E, F#, G#, A, B)
            rootScores['E'] += 1.0; rootScores['F#'] += 1.0; rootScores['G#'] += 1.0;
            rootScores['A'] += 1.2; rootScores['B'] += 1.2;
        } else if (arousal < 0.3) {
            // Low energy: favor lower-register roots (C, D, E, F, G)
            rootScores['C'] += 1.0; rootScores['D'] += 1.0; rootScores['E'] += 1.0;
            rootScores['F'] += 1.2; rootScores['G'] += 1.2;
        }
        
        // Factor 3: Mode-specific preferences (some modes work better in certain keys)
        const modePreferences = {
            'phrygian': ['E', 'F', 'B', 'C'],      // Traditionally dark keys
            'locrian': ['B', 'F#', 'C'],           // Unstable, diminished feel
            'aeolian': ['A', 'E', 'D', 'B'],       // Natural minor favorites
            'dorian': ['D', 'G', 'C', 'A'],        // Jazz-friendly keys
            'mixolydian': ['G', 'D', 'A', 'C'],    // Rock/blues keys
            'lydian': ['F', 'C', 'G', 'D'],        // Bright, dreamy
            'major': ['C', 'G', 'D', 'F', 'A']     // Standard practice keys
        };
        
        if (modePreferences[mode]) {
            modePreferences[mode].forEach((root, idx) => {
                rootScores[root] += (2.0 - idx * 0.3); // Weight preferences
            });
        }
        
        // Factor 4: Add some randomness for variety (10-20% influence)
        allRoots.forEach(root => {
            rootScores[root] += Math.random() * 0.8;
        });
        
        // Pick highest-scoring root
        let chosenRoot = allRoots.reduce((best, current) => 
            rootScores[current] > rootScores[best] ? current : best
        );
        
        this._log(`Key selection scores for ${mode}:`, rootScores, `-> chose ${chosenRoot}`);

        return {
            root: chosenRoot,
            mode: mode,
            _selectionReasoning: `Chose ${chosenRoot} based on valence=${valence.toFixed(2)}, arousal=${arousal.toFixed(2)}, mode=${mode}`
        };
    }

    /**
     * Build progression with functional harmony and YOUR grading system
     */
    _buildProgressionWithFunctionalHarmony(aggregated, scale, analyses, weights = { emotional: 0.30, syllabic: 0.20, phonetic: 0.15, semantic: 0.25, archetype: 0.10 }) {
        const progression = [];

        // DETERMINE FUNCTIONAL PATTERN based on emotional journey with MORE VARIETY
        let pattern;
        const arousal = aggregated.averageArousal || 0;
        const valence = aggregated.averageValence || 0;
        const dominance = aggregated.averageDominance || 0;
        
        // Create multiple pattern options and select based on analysis
        const patterns = {
            // High energy patterns
            energetic: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 4, function: 'Subdominant', tier: 4},
                {degree: 5, function: 'Dominant', tier: 4},
                {degree: 1, function: 'Tonic', tier: 4}
            ],
            driving: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 7, function: 'LeadingTone', tier: 3},
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 7, function: 'LeadingTone', tier: 3}
            ],
            ascending: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 2, function: 'Subdominant', tier: 3},
                {degree: 4, function: 'Subdominant', tier: 4},
                {degree: 5, function: 'Dominant', tier: 4}
            ],
            
            // Dark/negative patterns
            melancholic: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 6, function: 'Subdominant', tier: 3},
                {degree: 2, function: 'Subdominant', tier: 2},
                {degree: 1, function: 'Tonic', tier: 4}
            ],
            haunting: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 2, function: 'Subdominant', tier: 2},
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 2, function: 'Subdominant', tier: 2}
            ],
            descending: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 7, function: 'LeadingTone', tier: 3},
                {degree: 6, function: 'Subdominant', tier: 3},
                {degree: 5, function: 'Dominant', tier: 4}
            ],
            
            // Neutral/varied patterns
            circular: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 5, function: 'Dominant', tier: 4},
                {degree: 6, function: 'Subdominant', tier: 3},
                {degree: 4, function: 'Subdominant', tier: 4}
            ],
            modal: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 3, function: 'Subdominant', tier: 3},
                {degree: 7, function: 'LeadingTone', tier: 3},
                {degree: 1, function: 'Tonic', tier: 4}
            ],
            wandering: [
                {degree: 1, function: 'Tonic', tier: 4},
                {degree: 4, function: 'Subdominant', tier: 4},
                {degree: 2, function: 'Subdominant', tier: 2},
                {degree: 5, function: 'Dominant', tier: 4}
            ]
        };
        
        // Select pattern based on emotional analysis
        if (arousal > 0.6) {
            if (valence > 0.3) {
                pattern = Math.random() > 0.5 ? patterns.energetic : patterns.ascending;
            } else {
                pattern = Math.random() > 0.5 ? patterns.driving : patterns.haunting;
            }
        } else if (valence < -0.3) {
            if (dominance < -0.2) {
                pattern = Math.random() > 0.5 ? patterns.melancholic : patterns.descending;
            } else {
                pattern = Math.random() > 0.5 ? patterns.haunting : patterns.modal;
            }
        } else {
            // Neutral - pick from varied patterns
            const neutralOptions = [patterns.circular, patterns.modal, patterns.wandering];
            pattern = neutralOptions[Math.floor(Math.random() * neutralOptions.length)];
        }

        // BUILD CHORDS using MusicTheoryEngine
        pattern.forEach((step, idx) => {
            try {
                // Get diatonic chord for this degree
                // Choose chord using weighted selection so UI weights can influence chord quality/extension
                const chosen = this._chooseChordForDegree(step.degree, scale, analyses, weights, aggregated);
                if (!chosen) return;

                // Calculate voice leading from previous chord
                let voiceLeadingInfo = '';
                if (progression.length > 0) {
                    const prev = progression[progression.length - 1];
                    const interval = this._calculateInterval(prev.root, chosen.root);
                    const smoothness = this._analyzeVoiceLeading(prev, chosen);
                    voiceLeadingInfo = ` | Voice: ${interval} motion, ${smoothness}`;
                }

                // Get actual grading from the grading system
                let actualTier = step.tier; // fallback to pattern tier
                let actualTierInfo = null;
                
                try {
                    // Use the actual grading system to evaluate this chord
                    const chordName = chosen.root + chosen.chordType;
                    const context = {
                        key: scale.root,
                        scaleType: scale.mode,
                        degree: step.degree,
                        function: step.function
                    };
                    
                    // Get actual grading from the enhanced grading system
                    actualTier = this.musicTheory.calculateChordGrade(chordName, scale.root, scale.mode, context);
                    actualTierInfo = this.musicTheory.getGradingTierInfo(actualTier);
                    
                    this._log(`Enhanced grading: ${chordName} in ${scale.root} ${scale.mode} = Tier ${actualTier}`);
                } catch (err) {
                    this._log('Grading system error, using pattern tier:', err);
                    actualTierInfo = this.musicTheory.getGradingTierInfo(step.tier);
                }

                progression.push({
                    root: chosen.root,
                    chordType: chosen.chordType,
                    fullName: chosen.root + chosen.chordType,
                    chordNotes: chosen.chordNotes || [],
                    degree: step.degree,
                    function: step.function,
                    tier: actualTier,
                    tierInfo: actualTierInfo || this.musicTheory.getGradingTierInfo(actualTier),
                    reasoning: `${step.function} (${step.degree}) in ${scale.root} ${scale.mode}${voiceLeadingInfo}`
                });

            } catch (err) {
                this._log('Error building chord:', err);
            }
        });

        return progression;
    }

    /**
     * Choose a chord for a given degree using weighted scoring influenced by UI weights.
     * This expands candidate pool beyond the single diatonic suggestion so weights affect chord quality.
     */
    _chooseChordForDegree(degree, scale, analyses, weights = {}, aggregated = {}) {
        try {
            const key = scale.root;
            const mode = scale.mode;
            const scaleNotes = this.musicTheory.getScaleNotes(key, mode) || [];
            if (!scaleNotes.length) return null;

            // Get proper diatonic chord - use 'm' for minor modes if getDiatonicChord fails
            let base = this.musicTheory.getDiatonicChord(degree, key, mode);
            if (!base) {
                const rootNote = scaleNotes[(degree-1) % scaleNotes.length];
                // Default chord type based on mode
                const isMinorMode = /aeolian|dorian|phrygian|locrian/i.test(mode);
                const chordType = (isMinorMode && degree === 1) ? 'm' : 'maj';
                base = { root: rootNote, chordType: chordType };
            }

            // Candidate pool: all container chords that include the diatonic root, plus the base diatonic chord
            const rootNote = base.root;
            let candidates = [];
            try { candidates = (this.musicTheory.findAllContainerChords([rootNote], scaleNotes) || []).map(c => ({ ...c })); } catch(_) { candidates = []; }

            // Ensure base chord is present
            if (!candidates.some(c => (c.root === base.root && String(c.chordType||'').toLowerCase() === String(base.chordType||'').toLowerCase()))) {
                candidates.push({ root: base.root, chordType: base.chordType, fullName: base.root + base.chordType, chordNotes: base.diatonicNotes || [], scaleMatchPercent: 100 });
            }

            // IMPROVED Scoring heuristics with more variety
            const scores = candidates.map(c => {
                let score = 0;
                const ct = String(c.chordType || '').toLowerCase();

                // Base score from scale match
                score += (c.scaleMatchPercent || 50) / 100;

                // Emotional weight: prefer minor/darker types when aggregated valence negative
                const av = aggregated.averageValence || 0;
                const ar = aggregated.averageArousal || 0;
                const ad = aggregated.averageDominance || 0;
                
                if (av < -0.3) {
                    // Very negative: prefer darker, more complex chords
                    if (/(m7b5|dim|m7|m$|sus2|sus4)/i.test(ct)) score += (weights.emotional||0) * 2.5;
                    if (/(maj7|maj|aug)/i.test(ct)) score -= (weights.emotional||0) * 0.5;
                } else if (av > 0.3) {
                    // Very positive: prefer brighter chords
                    if (/(maj7|maj|add9|6)/i.test(ct)) score += (weights.emotional||0) * 2.0;
                    if (/(dim|m7b5)/i.test(ct)) score -= (weights.emotional||0) * 0.3;
                } else {
                    // Neutral: slight preference for variety
                    score += (weights.emotional||0) * 0.8;
                }

                // Arousal affects extension preference
                if (ar > 0.6) {
                    // High arousal: prefer extensions and tensions
                    if (/(7|9|11|13|sus|add)/i.test(ct)) score += (weights.emotional||0) * 1.5;
                } else if (ar < -0.3) {
                    // Low arousal: prefer simple triads
                    if (/^(maj|m|dim|aug)$/i.test(ct)) score += (weights.emotional||0) * 1.2;
                }

                // Dominance affects chord complexity
                if (ad > 0.4) {
                    // High dominance: prefer complex, assertive chords
                    if (/(maj7|7|9|11|13)/i.test(ct)) score += (weights.emotional||0) * 1.3;
                } else if (ad < -0.4) {
                    // Low dominance: prefer simpler, more subdued chords
                    if (/^(m|dim|sus)/.test(ct)) score += (weights.emotional||0) * 1.4;
                }

                // Phonetic weight: brightness => favor major/maj7; harshness => favor diminished/half-dim
                const phoneticAvg = (analyses.reduce((s,a)=>s+((a.phonetics&&a.phonetics.brightness)||0),0)/Math.max(1,analyses.length)) || 0.5;
                if (phoneticAvg > 0.6 && /(maj7|maj|add9|6)/i.test(ct)) score += (weights.phonetic||0) * 1.8;
                if (phoneticAvg < 0.35 && /(dim|m7b5|sus2)/i.test(ct)) score += (weights.phonetic||0) * 1.8;

                // Semantic weight: if any analysis suggested this mode/scale, boost
                const semanticBoost = analyses.some(a => Array.isArray(a.semantic && a.semantic.scales) && a.semantic.scales.includes(mode)) ? (weights.semantic||0) * 1.5 : 0;
                score += semanticBoost;

                // Syllabic weight: favor sparser voicings for many syllables (simpler chords)
                const avgSyll = analyses.reduce((s,a)=>s+(a.syllables||1),0)/Math.max(1,analyses.length);
                if (avgSyll >= 3 && /(maj7|9|13|11)/i.test(ct)) score -= (weights.syllabic||0) * 0.8;
                if (avgSyll <= 2 && /(7|9|add)/i.test(ct)) score += (weights.syllabic||0) * 0.5;

                // Add randomness for variety (10-20% influence)
                score += Math.random() * 0.4;

                return { cand: c, score };
            });

            // Pick top-scored candidate (with slight randomness proportional to score)
            scores.sort((a,b)=>b.score - a.score);
            if (scores.length === 0) return null;
            if (scores.length === 1) {
                const top = scores[0].cand;
                return { root: top.root, chordType: top.chordType || base.chordType, chordNotes: top.chordNotes || [] };
            }

            // Weighted random among top 3
            const pool = scores.slice(0, Math.min(3, scores.length));
            const wts = pool.map(p => Math.max(0.01, p.score));
            const sum = wts.reduce((s,x)=>s+x,0);
            let r = Math.random()*sum;
            for (let i=0;i<pool.length;i++) {
                r -= wts[i];
                if (r <= 0) return { root: pool[i].cand.root, chordType: pool[i].cand.chordType || base.chordType, chordNotes: pool[i].cand.chordNotes || [] };
            }
            // fallback
            const top = pool[0].cand;
            return { root: top.root, chordType: top.chordType || base.chordType, chordNotes: top.chordNotes || [] };
        } catch (e) {
            this._log('Error in _chooseChordForDegree:', e);
            return null;
        }
    }

    /**
     * Calculate interval between two roots
     */
    _calculateInterval(root1, root2) {
        const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const idx1 = notes.indexOf(root1);
        const idx2 = notes.indexOf(root2);
        if (idx1 === -1 || idx2 === -1) return 'unknown';
        
        const semitones = (idx2 - idx1 + 12) % 12;
        const intervalNames = {
            0: 'unison', 1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd',
            4: 'major 3rd', 5: 'perfect 4th', 6: 'tritone', 7: 'perfect 5th',
            8: 'minor 6th', 9: 'major 6th', 10: 'minor 7th', 11: 'major 7th'
        };
        return intervalNames[semitones] || 'unknown';
    }

    /**
     * Analyze voice leading smoothness
     */
    _analyzeVoiceLeading(chord1, chord2) {
        const notes1 = chord1.chordNotes || [];
        const notes2 = chord2.chordNotes || [];
        
        if (notes1.length === 0 || notes2.length === 0) return 'standard';
        
        // Check for common tones
        const common = notes1.filter(n => notes2.includes(n));
        if (common.length >= 2) return 'smooth (common tones)';
        if (common.length === 1) return 'moderate (1 common tone)';
        
        // Check for stepwise motion
        const allNotes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        let hasStepwise = false;
        notes1.forEach(n1 => {
            notes2.forEach(n2 => {
                const idx1 = allNotes.indexOf(n1);
                const idx2 = allNotes.indexOf(n2);
                if (idx1 !== -1 && idx2 !== -1) {
                    const dist = Math.abs(idx2 - idx1);
                    if (dist <= 2 || dist >= 10) hasStepwise = true;
                }
            });
        });
        
        return hasStepwise ? 'stepwise motion' : 'leaping';
    }

    /**
     * Generate voicings using piano-specific attributes
     */
    _generateVoicings(aggregated, progression) {
        let previousVoicing = null;
        
        return progression.map((chord, idx) => {
            const pianoVoicing = this._generatePianoVoicing(chord, aggregated, previousVoicing);
            previousVoicing = pianoVoicing;
            
            return {
                root: chord.root,
                chordType: chord.chordType,
                fullName: chord.fullName,
                voicing: aggregated.voicing || 'standard',
                register: aggregated.musicalAttributes?.preferredRegister || 'mid',
                spread: aggregated.voicing === 'open' ? 'wide' : 'standard',
                // NEW: Piano-specific voicing data
                pianoVoicing: {
                    notes: pianoVoicing.notes,
                    midiNotes: pianoVoicing.midiNotes,
                    octaves: pianoVoicing.octaves,
                    reasoning: pianoVoicing.reasoning
                }
            };
        });
    }

    /**
     * Build a progression by selecting top-scored chords from a global candidate pool
     * This ignores a single diatonic key and draws from many keys/scales to increase variety.
     * If a scale is provided, it will be heavily weighted in the scoring.
     */
    _buildProgressionLoose(analyses, weights = {}, aggregated = {}, preferredScale = null) {
        try {
            // Build a large candidate pool by scanning all chromatic roots and common modes
            const modes = ['major','dorian','phrygian','lydian','mixolydian','aeolian','locrian'];
            const pool = [];
            const seen = new Set();

            const chroma = Array.isArray(this.musicTheory.chromaticNotes) ? this.musicTheory.chromaticNotes : ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

            chroma.forEach(root => {
                modes.forEach(mode => {
                    let scaleNotes = [];
                    try { scaleNotes = this.musicTheory.getScaleNotes(root, mode) || []; } catch(_) { scaleNotes = []; }
                    // Gather chords containing any note in the scale (broad net)
                    const candidates = this.musicTheory.findAllContainerChords(scaleNotes.slice(0, Math.max(1, Math.min(scaleNotes.length, 3))), scaleNotes) || [];
                    candidates.forEach(c => {
                        const id = (c.fullName || (c.root + c.chordType)) + '|' + mode;
                        if (seen.has(id)) return;
                        seen.add(id);
                        pool.push({ ...c, suggestedMode: mode, suggestedRoot: root });
                    });
                });
            });

            if (!pool.length) return [];

            // Score pool entries using similar scoring to _chooseChordForDegree
            const scored = pool.map(c => {
                let score = 0;
                const ct = String(c.chordType || '').toLowerCase();
                const av = aggregated.averageValence || 0;
                
                // MAJOR BOOST: If this chord matches the preferred scale, heavily boost it
                if (preferredScale && c.suggestedRoot === preferredScale.root && c.suggestedMode === preferredScale.mode) {
                    score += 5.0; // Massive boost for matching the dynamically chosen key
                }
                
                if (av < -0.2) {
                    if (/(m7b5|dim|m7|^m)/i.test(ct)) score += (weights.emotional||0) * 2.0;
                    else score += (weights.emotional||0) * 0.2;
                } else if (av > 0.2) {
                    if (/(maj7|maj|aug|7)/i.test(ct)) score += (weights.emotional||0) * 1.5;
                } else {
                    score += (weights.emotional||0) * 0.5;
                }

                const phoneticAvg = (analyses.reduce((s,a)=>s+((a.phonetics&&a.phonetics.brightness)||0),0)/Math.max(1,analyses.length)) || 0.5;
                if (phoneticAvg > 0.6 && /(maj7|maj|add9)/i.test(ct)) score += (weights.phonetic||0) * 1.2;
                if (phoneticAvg < 0.35 && /(dim|m7b5)/i.test(ct)) score += (weights.phonetic||0) * 1.2;

                // semantic: if any analysis suggests this mode, boost
                const semanticBoost = analyses.some(a => Array.isArray(a.semantic && a.semantic.scales) && a.semantic.scales.includes(c.suggestedMode)) ? (weights.semantic||0) * 1.0 : 0;
                score += semanticBoost;

                // presence of dark tokens strongly biases
                if (aggregated.signals && Array.isArray(aggregated.signals.darkTokens) && aggregated.signals.darkTokens.length > 0) {
                    if (c.suggestedMode === 'phrygian' || /(m|dim)/i.test(ct)) score += 1.5;
                }

                // scale match percent contributes
                score += (c.scaleMatchPercent || 50) / 100;

                return { c, score };
            }).sort((a,b)=>b.score - a.score);

            // Pick top N distinct-root chords for an interesting progression
            const chosen = [];
            const rootsUsed = new Set();
            for (let i = 0; i < scored.length && chosen.length < 4; i++) {
                const item = scored[i];
                if (!item || !item.c) continue;
                // prefer variety in root; allow repeats if needed
                if (rootsUsed.size < 3 && rootsUsed.has(item.c.root)) continue;
                chosen.push({ root: item.c.root, chordType: item.c.chordType, fullName: item.c.fullName || (item.c.root + item.c.chordType), chordNotes: item.c.chordNotes || [], degree: null, function: 'Contextual', tier: 4 });
                rootsUsed.add(item.c.root);
            }

            return chosen;
        } catch (e) {
            this._log('Loose progression builder failed:', e);
            return [];
        }
    }

    /**
     * Calculate complexity
     */
    _calculateComplexity(aggregated, progression) {
        const hasExtensions = progression.some(c => /9|11|13/.test(c.chordType));
        const hasAlterations = progression.some(c => /#|b/.test(c.chordType));
        
        return {
            harmonic: hasExtensions ? 0.7 : 0.4,
            rhythmic: aggregated.averageArousal > 0.5 ? 0.8 : 0.3,
            emotional: Math.abs(aggregated.averageValence) * 0.5 + Math.abs(aggregated.averageArousal) * 0.5,
            overall: hasExtensions || hasAlterations ? 'extended' : 'triads'
        };
    }

    /**
     * Compile all reasoning into readable format
     */
    _compileReasoning(analyses, aggregated, scale, progression) {
        const reasoning = {
            summary: '',
            wordAnalyses: [],
            scaleChoice: '',
            progressionLogic: '',
            fullDetails: aggregated.allReasons
        };

        // IMPROVED Summary with more descriptive language
        const valence = aggregated.averageValence || 0;
        const arousal = aggregated.averageArousal || 0;
        const dominance = aggregated.averageDominance || 0;
        
        let valenceDesc = 'neutral';
        if (valence > 0.3) valenceDesc = 'positive';
        else if (valence > 0.1) valenceDesc = 'slightly positive';
        else if (valence < -0.3) valenceDesc = 'negative';
        else if (valence < -0.1) valenceDesc = 'slightly negative';
        
        let arousalDesc = 'moderate energy';
        if (arousal > 0.6) arousalDesc = 'high energy';
        else if (arousal > 0.3) arousalDesc = 'energetic';
        else if (arousal < -0.3) arousalDesc = 'calm';
        else if (arousal < -0.6) arousalDesc = 'very calm';
        
        let dominanceDesc = '';
        if (dominance > 0.4) dominanceDesc = ', assertive';
        else if (dominance < -0.4) dominanceDesc = ', subdued';
        
        // Find most influential words
        const strongWords = analyses.filter(a => 
            Math.abs(a.emotional?.valence || 0) > 0.3 || 
            Math.abs(a.emotional?.arousal || 0) > 0.5
        ).map(a => a.word);
        
        const keyWords = strongWords.length > 0 ? strongWords.join(' + ') : analyses.map(a => a.word).join(' + ');
        
        // Get current grading mode, ensuring it's not undefined
        const currentGradingMode = this.musicTheory.gradingMode || 'functional';
        
        // Debug: Log grading mode for troubleshooting
        if (this.debug) {
            this._log(`Grading mode check: engine.gradingMode = ${this.musicTheory.gradingMode}, using: ${currentGradingMode}`);
        }
        
        reasoning.summary = `${keyWords} → ${valenceDesc} → ${scale.root} ${scale.mode} (${currentGradingMode} grading)`;

        // Word analyses - return structured objects so UI can read numeric fields
        reasoning.wordAnalyses = analyses.map(a => ({
            word: a.word,
            emotional: {
                valence: (a.emotional && typeof a.emotional.valence === 'number') ? a.emotional.valence : 0,
                arousal: (a.emotional && typeof a.emotional.arousal === 'number') ? a.emotional.arousal : 0,
                dominance: (a.emotional && typeof a.emotional.dominance === 'number') ? a.emotional.dominance : 0
            },
            implications: a.implications || { reasoning: [] }
        }));

        // Scale choice including channel strengths
        const channelSummary = Object.keys(aggregated.channelScores || {}).map(k => `${k}:${Math.round((aggregated.channelScores[k]||0)*100)}%`).join(', ');
        reasoning.scaleChoice = `Chose ${scale.root} ${scale.mode}: ${aggregated.allReasons.find(r => r.includes(scale.mode)) || 'dominant mode from analysis'} (${channelSummary})`;

        // Progression logic
        reasoning.progressionLogic = progression.map(c => 
            `${c.fullName} (${c.function}, Tier ${c.tier})`
        ).join(' → ');

        return reasoning;
    }

    /**
     * Apply archetype preset
     */
    _applyArchetype(archetype, analyses, words) {
        this._log('Applying archetype:', archetype.name);

        // Convert archetype progression strings to full chord objects
        const progression = archetype.progression.map((chordStr, idx) => {
            // Parse chord string (e.g., "Cm7")
            const match = chordStr.match(/^([A-G][b#]?)(.*)$/);
            if (!match) return null;

            const root = match[1];
            const chordType = match[2] || '';
            const fullName = chordStr;

            // Get notes
            let notes = [];
            try {
                notes = this.musicTheory.getChordNotes(root, chordType) || [];
            } catch (e) {
                this._log('Error getting notes for', fullName);
            }

            // Determine tier based on archetype
            const tier = 4; // Archetypes are "perfect" by definition

            return {
                root,
                chordType,
                fullName,
                chordNotes: notes,
                degree: null, // Archetype chords may not have strict degrees
                function: idx === 0 ? 'Tonic' : (idx === progression.length - 1 ? 'Tonic' : 'Transitional'),
                tier,
                tierInfo: this.musicTheory.getGradingTierInfo(tier),
                reasoning: `From ${archetype.name} archetype (${archetype.confidence * 100}% match)`
            };
        }).filter(c => c !== null);

        return {
            scale: {
                root: archetype.scale.root,
                name: archetype.scale.name,
                key: archetype.scale.root,
                scale: archetype.scale.name
            },
            progression,
            voicings: archetype.voicings || [],
            complexity: {
                harmonic: archetype.complexity === 'extended' ? 0.8 : 0.5,
                rhythmic: 0.7,
                emotional: 0.8,
                overall: archetype.complexity
            },
            analyses,
            reasoning: {
                summary: `Matched "${archetype.name}" archetype (${Math.round(archetype.confidence * 100)}% confidence)`,
                wordAnalyses: analyses.map(a => ({
                    word: a.word,
                    matched: archetype.keywords.includes(a.word)
                })),
                scaleChoice: `${archetype.scale.root} ${archetype.scale.name} from ${archetype.name}`,
                progressionLogic: `${archetype.description}`,
                fullDetails: [
                    `Archetype match: ${archetype.name}`,
                    `Confidence: ${Math.round(archetype.confidence * 100)}%`,
                    `Description: ${archetype.description}`
                ]
            },
            archetypeMatch: {
                name: archetype.name,
                confidence: archetype.confidence,
                description: archetype.description
            }
        };
    }

    // ========== RICH MUSICAL ATTRIBUTE CALCULATORS ==========
    
    /**
     * Generate piano voicings using musical attributes
     */
    _generatePianoVoicing(chord, aggregatedAttributes, previousVoicing = null) {
        const ma = aggregatedAttributes.musicalAttributes || {};
        const notes = chord.chordNotes || [];
        if (notes.length === 0) return { notes: [], midiNotes: [], octaves: [] };

        // Piano range: A0 (21) to C8 (108)
        const noteToMidi = (note, octave) => {
            const noteMap = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11};
            return (octave + 1) * 12 + (noteMap[note] || 0);
        };

        // Determine base octave from preferred register
        let baseOctave = 4; // Middle C
        if (ma.preferredRegister === 'high') baseOctave = 5;
        else if (ma.preferredRegister === 'low') baseOctave = 3;

        // Density affects number of notes: high density = more doublings
        const density = ma.density || 0.5;
        let numNotes = notes.length;
        if (density > 0.7 && notes.length >= 3) {
            numNotes = notes.length + 1; // Double root or fifth
        } else if (density < 0.3 && notes.length > 3) {
            numNotes = 3; // Sparse: just root, third, seventh
        }

        // Spread affects spacing: high spread = wider intervals between notes
        const spread = ma.spread || 0.5;
        const octaveSpan = ma.rangeOctaves || 2.0;

        // Build voicing array
        const voicing = [];
        const midiNotes = [];
        
        // Start with root at base octave
        const rootNote = notes[0];
        const rootMidi = noteToMidi(rootNote, baseOctave);
        voicing.push({ note: rootNote, octave: baseOctave });
        midiNotes.push(rootMidi);

        // Add remaining notes with spacing based on spread
        let currentOctave = baseOctave;
        for (let i = 1; i < Math.min(numNotes, notes.length); i++) {
            const note = notes[i];
            
            if (spread > 0.6) {
                // Wide spread: jump octaves more frequently
                if (i === 2) currentOctave += 1;
                if (i === 3 && octaveSpan > 2.5) currentOctave += 1;
            } else if (spread < 0.4) {
                // Tight spread: keep in close position
                const noteMap = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11};
                const thisNotePitch = noteMap[note] || 0;
                const prevNotePitch = noteMap[notes[i-1]] || 0;
                if (thisNotePitch < prevNotePitch) currentOctave += 1;
            } else {
                // Medium spread: standard voice leading
                if (i >= 3) currentOctave += 1;
            }

            const midi = noteToMidi(note, currentOctave);
            voicing.push({ note, octave: currentOctave });
            midiNotes.push(midi);
        }

        // If high tension or arousal, optionally double the root an octave higher
        if (density > 0.7 && ma.tension > 0.6 && octaveSpan > 2.5) {
            const highRootMidi = noteToMidi(rootNote, baseOctave + 2);
            if (highRootMidi <= 108) { // Don't exceed C8
                voicing.push({ note: rootNote, octave: baseOctave + 2 });
                midiNotes.push(highRootMidi);
            }
        }

        return {
            notes: voicing.map(v => `${v.note}${v.octave}`),
            midiNotes: midiNotes.sort((a,b) => a-b),
            octaves: voicing.map(v => v.octave),
            reasoning: `Register: ${ma.preferredRegister}, Density: ${(density*100).toFixed(0)}%, Spread: ${(spread*100).toFixed(0)}%, Range: ${octaveSpan.toFixed(1)} oct`
        };
    }
    
    _calculateTension(word, emotional) {
        let tension = 0.3;
        if (emotional && emotional.arousal) tension += Math.abs(emotional.arousal) * 0.4;
        if (/anxiety|stress|panic|chaos|conflict|urgent|crisis|danger|violent|explosive|friction/.test(word)) tension += 0.3;
        if (/calm|peace|rest|gentle|soft|quiet|still|serene|tranquil|ease/.test(word)) tension -= 0.4;
        return Math.max(0, Math.min(1, tension));
    }
    
    _calculateWarmth(word, emotional, phonetics) {
        let warmth = 0.5;
        if (emotional && emotional.valence) warmth += emotional.valence * 0.3;
        if (/warm|hot|fire|summer|sun|glow|ember|cozy|golden|amber/.test(word)) warmth += 0.4;
        if (/cold|ice|frost|winter|chill|freeze|arctic|pale|steel|silver/.test(word)) warmth -= 0.5;
        return Math.max(0, Math.min(1, warmth));
    }
    
    _calculateDensity(word, emotional) {
        let density = 0.5;
        if (emotional && emotional.dominance) density += emotional.dominance * 0.3;
        if (/thick|dense|heavy|massive|crowd|swarm|full|rich|lush|cluster/.test(word)) density += 0.4;
        if (/sparse|thin|light|airy|minimal|bare|empty|simple|clear|lone/.test(word)) density -= 0.4;
        return Math.max(0, Math.min(1, density));
    }
    
    _calculateSpread(word, emotional) {
        let spread = 0.5;
        if (emotional && emotional.arousal) spread += emotional.arousal * 0.3;
        if (/wide|vast|expansive|open|stretch|reach|span|spread|cosmic|infinite/.test(word)) spread += 0.4;
        if (/close|tight|narrow|compact|confined|intimate|near|pressed/.test(word)) spread -= 0.4;
        return Math.max(0, Math.min(1, spread));
    }
    
    _calculateDirection(word) {
        if (/rise|ascend|climb|soar|lift|up|high|peak|summit|elevate|float/.test(word)) return 0.7;
        if (/fall|descend|drop|sink|down|low|depth|plunge|dive|collapse/.test(word)) return -0.7;
        return 0;
    }
    
    _calculateSmoothness(word) {
        let smoothness = 0.5;
        if (/smooth|flow|glide|gentle|ease|stream|slide|continuous|legato/.test(word)) smoothness += 0.4;
        if (/jagged|sharp|jump|leap|sudden|jolt|staccato|punctuate|abrupt/.test(word)) smoothness -= 0.4;
        return Math.max(0, Math.min(1, smoothness));
    }
    
    _calculateRegister(word, emotional) {
        if (emotional && emotional.arousal) {
            if (emotional.arousal > 0.6) return 'high';
            if (emotional.arousal < -0.3) return 'low';
        }
        if (/extreme|vast|cosmic|infinite|abyss|pinnacle/.test(word)) return 'extreme';
        if (/high|sky|bird|soar|bright|treble|peak|soprano/.test(word)) return 'high';
        if (/low|deep|bass|earth|ground|rumble|foundation|grave/.test(word)) return 'low';
        return 'mid';
    }
    
    _calculateRange(word, emotional) {
        let range = 2.0;
        if (emotional && emotional.arousal) range += Math.abs(emotional.arousal) * 1.5;
        if (/vast|wide|expansive|cosmic|infinite/.test(word)) range += 1.5;
        if (/narrow|confined|limited|small|tiny/.test(word)) range -= 0.8;
        return Math.max(0.5, Math.min(4.0, range));
    }
    
    _calculateEmphasis(word) {
        if (/bass|low|deep|foundation|ground|earth|root/.test(word)) return 'bass';
        if (/treble|high|bright|melody|soprano|peak/.test(word)) return 'treble';
        return 'balanced';
    }
    
    _getPreferredIntervals(word, emotional) {
        const intervals = [];
        if (emotional && emotional.valence > 0.3) intervals.push('P5', 'M3', 'M6', 'P8');
        if (emotional && emotional.valence < -0.3) intervals.push('m3', 'm6', 'm7', 'P4');
        if (/tension|conflict|chaos|dissonant/.test(word)) intervals.push('TT', 'm2', 'M7');
        return intervals;
    }
    
    _getAvoidedIntervals(word, emotional) {
        const avoid = [];
        if (/calm|peace|serene|gentle/.test(word)) avoid.push('TT', 'm2', 'M7');
        if (emotional && emotional.valence > 0.5) avoid.push('dim', 'm2');
        return avoid;
    }

    // ========== UTILITY METHODS ==========

    _parseInput(str) {
        return str.split(/[,\s]+/)
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 0 && /^[a-z]+$/.test(w));
    }

    _emptyResult(reason = 'No analysis available') {
        return {
            scale: { root: 'C', name: 'major', key: 'C', scale: 'major' },
            progression: [],
            voicings: [],
            complexity: { harmonic: 0, rhythmic: 0, emotional: 0, overall: 'none' },
            analyses: [],
            reasoning: {
                summary: reason,
                wordAnalyses: [],
                scaleChoice: '',
                progressionLogic: '',
                fullDetails: []
            },
            archetypeMatch: null
        };
    }

    /**
     * Convert generative system result to legacy format for compatibility
     */
    _convertGenerativeToLegacy(generativeResult) {
        const { words, blended, scale, progression, reasoning } = generativeResult;
        
        // Map progression to legacy format
        const legacyProgression = progression.map((chord, i) => {
            const analyzed = this.chordAttributeEngine ? 
                this.chordAttributeEngine.analyzeChord(chord.symbol || chord.fullName) : null;
            
            return {
                degree: chord.degree || (i + 1),
                fullName: chord.symbol || chord.fullName || chord.type,
                root: chord.root || scale.root,
                type: chord.type || '',
                function: this._inferFunction(chord.degree || (i + 1)),
                tier: this._inferTier(analyzed ? analyzed.attributes.tension : 0.5),
                attributes: analyzed ? analyzed.attributes : null
            };
        });

        // Calculate complexity from blended attributes
        const complexity = {
            overall: this._mapDensityToComplexity(blended.density),
            harmonic: blended.tension,
            rhythmic: blended.movement,
            emotional: blended.intensity
        };

        return {
            success: true,
            words: Array.isArray(words) ? words : [words],
            scale: scale,
            progression: legacyProgression,
            complexity: complexity,
            reasoning: {
                summary: reasoning.summary,
                generative: true,
                phonetic: generativeResult.wordMappings ? 
                    generativeResult.wordMappings.map(m => m.phonetic.musicalAttributes) : null,
                semantic: generativeResult.wordMappings ?
                    generativeResult.wordMappings.map(m => m.semantic) : null,
                blended: blended
            }
        };
    }

    _inferFunction(degree) {
        if (degree === 1) return 'Tonic';
        if (degree === 5 || degree === 7) return 'Dominant';
        if (degree === 4 || degree === 2) return 'Subdominant';
        return 'Chromatic';
    }

    _inferTier(tension) {
        if (tension > 0.8) return 'Perfect';
        if (tension > 0.6) return 'Excellent';
        if (tension > 0.4) return 'Good';
        return 'Fair';
    }

    _mapDensityToComplexity(density) {
        if (density > 0.8) return '11th/13th';
        if (density > 0.6) return '9th';
        if (density > 0.4) return '7th';
        return 'triads';
    }

    _analyzePhonetics(word) {
        const vowels = (word.match(/[aeiouy]/g) || []).join('');
        const brightVowels = (vowels.match(/[eiay]/g) || []).length;
        const darkVowels = (vowels.match(/[ou]/g) || []).length;
        const brightness = vowels.length > 0 ? brightVowels / vowels.length : 0.5;

        const consonants = word.replace(/[aeiouy]/g, '');
        const hardConsonants = (consonants.match(/[kgtdpb]/g) || []).length;
        const harshness = consonants.length > 0 ? hardConsonants / consonants.length : 0;

        return { brightness, harshness };
    }

    _countSyllables(word) {
        word = word.toLowerCase().replace(/e$/, '');
        const vowelGroups = word.match(/[aeiouy]+/g);
        return Math.max(1, vowelGroups ? vowelGroups.length : 1);
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LexicalMusicEngineV2;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.LexicalMusicEngineV2 = LexicalMusicEngineV2;
}
