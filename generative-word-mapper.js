/**
 * @module GenerativeWordMapper
 * @description Algorithmic word-to-chord mapping using phonetic + semantic analysis
 * 
 * SCALABLE, GENERATIVE APPROACH:
 * - Works with ANY word (no manual database needed)
 * - Combines phonetic analysis (sound) + semantic inference (meaning)
 * - Generates chord progressions that reflect word characteristics
 * - Uses attribute matching to find best chords
 * - Infinitely extensible - no hardcoded word lists
 * 
 * PIPELINE:
 * 1. Phonetic analysis → Musical attributes (tension, brightness, density)
 * 2. Semantic inference → Emotional/contextual qualities
 * 3. Attribute matching → Find chords with similar profiles
 * 4. Progression generation → Sequence chords based on flow
 */

class GenerativeWordMapper {
    constructor(phoneticAnalyzer, chordAttributeEngine, musicTheoryEngine, options = {}) {
        if (!phoneticAnalyzer || !chordAttributeEngine || !musicTheoryEngine) {
            throw new Error('GenerativeWordMapper requires PhoneticAnalyzer, ChordAttributeEngine, and MusicTheoryEngine');
        }

        this.phonetic = phoneticAnalyzer;
        this.chordAttrs = chordAttributeEngine;
        this.musicTheory = musicTheoryEngine;

        // NEW: Optional semantic API and voice leading
        this.semanticAPI = options.semanticAPI || null;
        this.voiceLeading = options.voiceLeading || null;
        
        // Prefer real-time semantics over patterns
        this.useRealTimeSemantics = options.useRealTimeSemantics !== false && this.semanticAPI !== null;

        // Semantic heuristics (fallback when API unavailable)
        this.semanticPatterns = this._buildSemanticPatterns();
        
        this.debug = true;
    }

    _log(...args) {
        if (this.debug) console.log('[GenMapper]', ...args);
    }

    /**
     * Main entry: Map word(s) to musical attributes and chord progression
     */
    async mapWord(word, options = {}) {
        this._log('=== MAPPING WORD ===', word);

        // Step 1: Phonetic analysis
        const phoneticProfile = this.phonetic.analyze(word);
        this._log('Phonetic profile:', phoneticProfile.musicalAttributes);

        // Step 2: Semantic inference (real-time or fallback)
        const semanticProfile = await this._inferSemantics(word);
        this._log('Semantic profile:', semanticProfile);

        // Step 3: Merge profiles into unified attributes
        const unifiedAttributes = this._mergeProfiles(
            phoneticProfile.musicalAttributes,
            semanticProfile,
            options.weights || { phonetic: 0.6, semantic: 0.4 }
        );
        this._log('Unified attributes:', unifiedAttributes);

        // Step 4: Select scale based on attributes
        const scale = this._selectScale(unifiedAttributes, phoneticProfile.musicalAttributes.scales);
        this._log('Selected scale:', scale);

        // Step 5: Generate chord progression
        const progression = this._generateProgression(unifiedAttributes, scale, word);
        this._log('Generated progression:', progression);

        // Step 6: Apply voice leading if available
        let voiceLeading = null;
        if (this.voiceLeading) {
            const chordSymbols = progression.map(c => c.symbol || c.fullName);
            voiceLeading = this.voiceLeading.generateVoiceLeading(chordSymbols, {
                voicing: unifiedAttributes.density > 0.6 ? 'spread' : 'close',
                register: unifiedAttributes.articulation > 0.6 ? 'high' : 'mid'
            });
            this._log('Voice leading:', voiceLeading);
        }

        return {
            word,
            phonetic: phoneticProfile,
            semantic: semanticProfile,
            unified: unifiedAttributes,
            scale,
            progression,
            voiceLeading,
            reasoning: this._generateReasoning(phoneticProfile, semanticProfile, unifiedAttributes, scale, progression)
        };
    }

    /**
     * Map multiple words to progression
     */
    async mapWords(words, options = {}) {
        if (typeof words === 'string') {
            words = words.split(/\s+/).filter(w => w.length > 0);
        }

        this._log('=== MAPPING WORDS ===', words);

        // Analyze each word
        const wordMappings = await Promise.all(words.map(w => this.mapWord(w, options)));

        // Blend attributes across all words
        const blendedAttributes = this._blendWordAttributes(wordMappings);
        this._log('Blended attributes:', blendedAttributes);

        // Select scale that fits blended profile
        const scale = this._selectScale(blendedAttributes, this._gatherScaleSuggestions(wordMappings));
        this._log('Selected scale:', scale);

        // Generate unified progression
        const progression = this._generateMultiWordProgression(wordMappings, blendedAttributes, scale);
        this._log('Generated progression:', progression);

        return {
            words,
            wordMappings,
            blended: blendedAttributes,
            scale,
            progression,
            reasoning: this._generateMultiWordReasoning(wordMappings, blendedAttributes, scale, progression)
        };
    }

    /**
     * Infer semantic qualities from word using real-time APIs or fallback patterns
     */
    async _inferSemantics(word) {
        word = word.toLowerCase();
        
        // Try real-time semantic API first
        if (this.useRealTimeSemantics && this.semanticAPI) {
            try {
                this._log(`Fetching real-time semantics for: ${word}`);
                const apiResult = await this.semanticAPI.analyzeWord(word);
                
                // Convert API attributes to our format
                return {
                    emotional: {
                        valence: apiResult.attributes.valence,
                        arousal: apiResult.attributes.arousal
                    },
                    contextual: apiResult.attributes.context,
                    intensity: apiResult.attributes.intensity,
                    movement: apiResult.attributes.movement,
                    time: 'present',
                    dominance: apiResult.attributes.dominance,
                    definitions: apiResult.definitions,
                    source: 'api'
                };
            } catch (error) {
                this._log(`API failed for ${word}, falling back to patterns:`, error.message);
                // Fall through to pattern matching
            }
        }
        
        // Fallback: pattern-based inference
        const qualities = {
            emotional: { valence: 0, arousal: 0 },
            contextual: [],
            intensity: 0.5,
            movement: 0.5,
            time: 'present',
            source: 'pattern'
        };

        // Pattern matching (check both full word and substrings)
        for (const [pattern, attrs] of Object.entries(this.semanticPatterns)) {
            // Exact match gets full weight
            if (word === pattern) {
                if (attrs.valence !== undefined) qualities.emotional.valence += attrs.valence;
                if (attrs.arousal !== undefined) qualities.emotional.arousal += attrs.arousal;
                if (attrs.intensity !== undefined) qualities.intensity = Math.max(qualities.intensity, attrs.intensity);
                if (attrs.movement !== undefined) qualities.movement = attrs.movement;
                if (attrs.context) qualities.contextual.push(attrs.context);
                if (attrs.time) qualities.time = attrs.time;
            }
            // Substring match gets partial weight
            else if (word.includes(pattern) || pattern.includes(word)) {
                const weight = 0.6; // Partial match weight
                if (attrs.valence !== undefined) qualities.emotional.valence += attrs.valence * weight;
                if (attrs.arousal !== undefined) qualities.emotional.arousal += attrs.arousal * weight;
                if (attrs.intensity !== undefined) qualities.intensity = Math.max(qualities.intensity, attrs.intensity * weight);
                if (attrs.movement !== undefined) qualities.movement = Math.max(qualities.movement, attrs.movement * weight);
                if (attrs.context) qualities.contextual.push(attrs.context);
                if (attrs.time) qualities.time = attrs.time;
            }
        }

        // Morphological analysis (prefixes/suffixes)
        if (word.startsWith('un') || word.startsWith('dis') || word.startsWith('non')) {
            qualities.emotional.valence -= 0.3; // Negation
        }
        if (word.endsWith('ness') || word.endsWith('ment')) {
            qualities.intensity -= 0.1; // Abstraction
        }
        if (word.endsWith('ing')) {
            qualities.movement += 0.2; // Progressive action
        }
        if (word.endsWith('ed')) {
            qualities.time = 'past';
        }

        // Word length as intensity proxy (longer = more complex/intense)
        if (word.length > 8) qualities.intensity += 0.2;
        if (word.length < 4) qualities.intensity -= 0.1;

        // Clamp values
        qualities.emotional.valence = Math.max(-1, Math.min(1, qualities.emotional.valence));
        qualities.emotional.arousal = Math.max(-1, Math.min(1, qualities.emotional.arousal));
        qualities.intensity = Math.max(0, Math.min(1, qualities.intensity));
        qualities.movement = Math.max(0, Math.min(1, qualities.movement));

        return qualities;
    }

    /**
     * Build semantic pattern library (lightweight heuristics)
     */
    _buildSemanticPatterns() {
        return {
            // Emotional valence patterns
            'joy': { valence: 0.8, arousal: 0.5, context: 'positive' },
            'happy': { valence: 0.8, arousal: 0.4, context: 'positive' },
            'glad': { valence: 0.7, arousal: 0.3, context: 'positive' },
            'sad': { valence: -0.7, arousal: -0.2, context: 'negative' },
            'sorrow': { valence: -0.8, arousal: -0.3, context: 'grief' },
            'grief': { valence: -0.9, arousal: -0.2, context: 'loss' },
            'shame': { valence: -0.7, arousal: 0.3, context: 'negative', intensity: 0.7 },
            'guilt': { valence: -0.6, arousal: 0.4, context: 'negative' },
            'pride': { valence: 0.7, arousal: 0.5, context: 'positive' },
            'anger': { valence: -0.7, arousal: 0.8, context: 'rage' },
            'fury': { valence: -0.8, arousal: 0.9, context: 'rage' },
            'confuse': { valence: -0.3, arousal: 0.5, context: 'uncertain', intensity: 0.6 },
            'confusion': { valence: -0.3, arousal: 0.5, context: 'uncertain', intensity: 0.6 },
            'chaos': { valence: -0.4, arousal: 0.9, context: 'disorder', intensity: 0.9 },
            'order': { valence: 0.4, arousal: -0.3, context: 'structure' },
            'dark': { valence: -0.5, arousal: 0.2, context: 'somber' },
            'light': { valence: 0.6, arousal: 0.2, context: 'bright' },
            'bright': { valence: 0.6, arousal: 0.3, context: 'positive' },
            'glow': { valence: 0.5, arousal: 0.2, context: 'warm' },
            'shadow': { valence: -0.4, arousal: 0.3, context: 'mystery' },
            'twilight': { valence: 0.1, arousal: -0.2, context: 'liminal', time: 'evening', intensity: 0.6 },
            'spiral': { valence: -0.1, arousal: 0.3, context: 'motion', movement: 0.9, intensity: 0.7, motion: { type: 'spiral', direction: 'down', step: 1, chromatic: true, landing: { degree: 2, quality: 'm7b5' } } },
            'spiraling': { valence: -0.1, arousal: 0.3, context: 'motion', movement: 0.9, intensity: 0.7, motion: { type: 'spiral', direction: 'down', step: 1, chromatic: true, landing: { degree: 2, quality: 'm7b5' } } },
            'storm': { valence: -0.3, arousal: 0.8, context: 'intense' },
            'calm': { valence: 0.3, arousal: -0.5, context: 'peaceful' },
            'rage': { valence: -0.7, arousal: 0.9, context: 'anger' },
            'peace': { valence: 0.6, arousal: -0.4, context: 'tranquil' },
            'war': { valence: -0.6, arousal: 0.9, context: 'conflict' },
            'love': { valence: 0.8, arousal: 0.3, context: 'affection' },
            'hate': { valence: -0.9, arousal: 0.6, context: 'anger' },
            'hope': { valence: 0.7, arousal: 0.4, context: 'optimism' },
            'fear': { valence: -0.6, arousal: 0.7, context: 'anxiety' },
            'terror': { valence: -0.9, arousal: 0.9, context: 'fear' },
            'anxiety': { valence: -0.5, arousal: 0.6, context: 'worry' },
            'worry': { valence: -0.4, arousal: 0.5, context: 'concern' },
            'content': { valence: 0.6, arousal: -0.2, context: 'satisfied' },
            'bliss': { valence: 0.9, arousal: 0.2, context: 'ecstatic' },
            'ecstasy': { valence: 0.9, arousal: 0.7, context: 'peak' },
            'melancholy': { valence: -0.5, arousal: -0.3, context: 'wistful' },
            'longing': { valence: -0.2, arousal: 0.3, context: 'yearning' },
            'desire': { valence: 0.3, arousal: 0.6, context: 'wanting' },
            'dream': { valence: 0.4, arousal: -0.2, context: 'fantasy' },
            'night': { valence: -0.2, arousal: -0.3, context: 'nocturnal', time: 'night' },
            'dawn': { valence: 0.5, arousal: 0.3, context: 'beginning', time: 'morning' },
            'dusk': { valence: 0.2, arousal: -0.2, context: 'ending', time: 'evening' },
            'ancient': { valence: -0.2, arousal: -0.3, context: 'timeless', time: 'past', intensity: 0.7 },
            'medieval': { valence: -0.1, arousal: -0.2, context: 'historical', time: 'past', intensity: 0.6 },
            'city': { valence: 0.2, arousal: 0.5, context: 'urban', intensity: 0.6 },
            'town': { valence: 0.3, arousal: 0.2, context: 'settled', intensity: 0.4 },
            'village': { valence: 0.4, arousal: -0.1, context: 'pastoral', intensity: 0.3 },

            // Nature patterns
            'forest': { valence: 0.2, arousal: -0.1, context: 'nature' },
            'woods': { valence: -0.1, arousal: -0.2, context: 'mysterious', intensity: 0.6 },
            'trees': { valence: 0.3, arousal: -0.1, context: 'natural' },
            'wilderness': { valence: 0.1, arousal: 0.2, context: 'wild', intensity: 0.7 },
            'ocean': { valence: 0.3, arousal: 0.2, context: 'vast' },
            'mountain': { valence: 0.4, arousal: 0.3, context: 'epic' },
            'river': { valence: 0.3, arousal: 0.1, context: 'flowing', movement: 0.7 },
            'sky': { valence: 0.5, arousal: 0.1, context: 'open' },
            'fire': { valence: 0.2, arousal: 0.8, context: 'intense', intensity: 0.9 },
            'ice': { valence: -0.2, arousal: -0.3, context: 'cold' },
            'wind': { valence: 0.1, arousal: 0.4, context: 'movement', movement: 0.8 },

            // Movement patterns
            'run': { movement: 0.9, arousal: 0.6, intensity: 0.7 },
            'walk': { movement: 0.5, arousal: 0.2, intensity: 0.4 },
            'fly': { movement: 0.9, arousal: 0.5, valence: 0.4, context: 'freedom' },
            'fall': { movement: 0.8, arousal: 0.6, valence: -0.4, context: 'descent' },
            'rise': { movement: 0.7, arousal: 0.5, valence: 0.5, context: 'ascent' },
            'dance': { movement: 0.8, arousal: 0.6, valence: 0.6, context: 'rhythmic' },
            'still': { movement: 0.1, arousal: -0.4, context: 'static' },
            'rush': { movement: 0.9, arousal: 0.8, intensity: 0.8 },
            'chase': { movement: 0.9, arousal: 0.8, valence: -0.3, intensity: 0.8, context: 'pursuit' },
            'hunt': { movement: 0.7, arousal: 0.7, valence: -0.2, intensity: 0.7, context: 'predatory' },
            'escape': { movement: 0.9, arousal: 0.9, valence: -0.4, intensity: 0.8, context: 'fleeing' },

            // Size/intensity
            'vast': { intensity: 0.8, context: 'expansive' },
            'tiny': { intensity: 0.2, context: 'minimal' },
            'giant': { intensity: 0.9, context: 'epic' },
            'whisper': { intensity: 0.2, arousal: -0.3, context: 'subtle' },
            'thunder': { intensity: 0.9, arousal: 0.8, context: 'powerful' },
            'echo': { intensity: 0.4, arousal: -0.1, context: 'resonant' },

            // Temporal
            'eternal': { time: 'timeless', intensity: 0.7, context: 'infinite' },
            'fleeting': { time: 'brief', intensity: 0.3, movement: 0.7 },
            'forever': { time: 'timeless', intensity: 0.8, context: 'eternal' }
        };
    }

    /**
     * Merge phonetic and semantic profiles into unified attributes
     */
    _mergeProfiles(phoneticAttrs, semanticProfile, weights) {
        const { phonetic, semantic } = weights;

        // Map semantic → phonetic attribute space
        const semanticBrightness = (semanticProfile.emotional.valence + 1) / 2; // Map -1..1 to 0..1
        const semanticTension = (semanticProfile.emotional.arousal + 1) / 2;
        const semanticDensity = semanticProfile.intensity;

        // Weighted blend
        const unified = {
            brightness: phoneticAttrs.brightness * phonetic + semanticBrightness * semantic,
            tension: phoneticAttrs.harmonicTension * phonetic + semanticTension * semantic,
            density: (phoneticAttrs.voicingDensity === 'triad' ? 0.3 : 
                     phoneticAttrs.voicingDensity === '7th' ? 0.5 :
                     phoneticAttrs.voicingDensity === '9th' ? 0.7 :
                     phoneticAttrs.voicingDensity === '11th' ? 0.85 : 0.95) * phonetic + semanticDensity * semantic,
            articulation: phoneticAttrs.articulation,
            movement: semanticProfile.movement,
            intensity: semanticProfile.intensity,
            context: semanticProfile.contextual,
            // IMPORTANT: Include emotional dimensions for scale selection
            valence: semanticProfile.emotional.valence,
            arousal: semanticProfile.emotional.arousal
        };

        // Clamp
        unified.brightness = Math.max(0, Math.min(1, unified.brightness));
        unified.tension = Math.max(0, Math.min(1, unified.tension));
        unified.density = Math.max(0, Math.min(1, unified.density));

        return unified;
    }

    /**
     * Select scale based on unified attributes
     */
    _selectScale(attributes, phonticScaleSuggestions = []) {
        let bestScale = { root: 'C', name: 'major' };
        let bestScore = 0;

        // Try phonetic suggestions first
        for (const suggestion of phonticScaleSuggestions) {
            const score = suggestion.weight;
            if (score > bestScore) {
                bestScore = score;
                bestScale = { root: 'C', name: suggestion.scale };
            }
        }

        // If no strong phonetic match, use IMPROVED attribute-based selection
        if (bestScore < 0.6) {
            const b = attributes.brightness || 0.5;
            const t = attributes.tension || 0.5;
            const v = attributes.valence || 0; // Add valence consideration
            const a = attributes.arousal || 0;  // Add arousal consideration

            // CONTEXT-AWARE scale selection
            // Dark, mysterious contexts (woods, night, chase)
            if (v < -0.2 && b < 0.5) {
                if (a > 0.6) {
                    bestScale.name = 'phrygian'; // Dark + energetic
                } else {
                    bestScale.name = 'aeolian';  // Dark + calm
                }
            }
            // Bright, positive contexts
            else if (v > 0.3 && b > 0.6) {
                if (t < 0.4) {
                    bestScale.name = 'major';   // Bright + simple
                } else {
                    bestScale.name = 'lydian';  // Bright + complex
                }
            }
            // Neutral but tense
            else if (t > 0.7) {
                if (b > 0.6) {
                    bestScale.name = 'lydian_dominant';
                } else {
                    bestScale.name = 'altered';
                }
            }
            // Modal/ambiguous
            else if (Math.abs(v) < 0.2) {
                if (a > 0.5) {
                    bestScale.name = 'mixolydian'; // Neutral + energetic
                } else {
                    bestScale.name = 'dorian';     // Neutral + calm
                }
            }
            // Default fallback based on brightness
            else {
                if (b > 0.6) {
                    bestScale.name = 'major';
                } else {
                    bestScale.name = 'aeolian';
                }
            }
        }

        // Select root based on attributes and word characteristics
        bestScale.root = this._selectRoot(attributes);

        return bestScale;
    }

    /**
     * Select root note based on musical attributes
     */
    _selectRoot(attributes) {
        const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const scores = {};
        
        // Initialize all roots with base score
        roots.forEach(root => scores[root] = 0);
        
        // Brightness affects sharp/flat preference
        const brightness = attributes.brightness || 0.5;
        if (brightness > 0.6) {
            // Bright → favor sharp keys
            ['D', 'A', 'E', 'B', 'F#', 'C#'].forEach((root, i) => {
                scores[root] += (1.5 - i * 0.2);
            });
        } else if (brightness < 0.4) {
            // Dark → favor flat keys  
            ['F', 'D#', 'G#', 'C#', 'A#'].forEach((root, i) => {
                scores[root] += (1.5 - i * 0.2);
            });
        } else {
            // Neutral → favor natural keys
            ['C', 'G', 'D', 'F', 'A'].forEach((root, i) => {
                scores[root] += (1.2 - i * 0.1);
            });
        }
        
        // Tension affects register preference
        const tension = attributes.tension || 0.5;
        if (tension > 0.6) {
            // High tension → higher pitch roots
            ['A', 'B', 'C', 'D', 'E'].forEach(root => scores[root] += 0.8);
        } else if (tension < 0.3) {
            // Low tension → lower pitch roots
            ['C', 'D', 'E', 'F', 'G'].forEach(root => scores[root] += 0.8);
        }
        
        // Articulation affects key character
        const articulation = attributes.articulation || 0.5;
        if (articulation > 0.7) {
            // Sharp articulation → keys with character
            ['F#', 'C#', 'D#', 'G#', 'A#'].forEach(root => scores[root] += 0.6);
        }
        
        // Add randomness for variety (20% influence)
        roots.forEach(root => {
            scores[root] += Math.random() * 0.8;
        });
        
        // Find highest scoring root
        return roots.reduce((best, current) => 
            scores[current] > scores[best] ? current : best
        );
    }

    /**
     * Generate chord progression for single word
     */
    _generateProgression(attributes, scale, word) {
        const progression = [];
        const length = Math.max(2, Math.min(6, word.length)); // Progression length based on word length

        // Generate degrees using movement pattern
        // Check for explicit motion instructions (from semantic or word-level clues)
        const motionSpec = this._interpretMotionFromSemantic(attributes, word);
        if (motionSpec) {
            return this._generateMotionProgression(attributes, scale, motionSpec, length);
        }

        const degrees = this._generateDegrees(length, attributes.movement, attributes.intensity);

        // Build progression with non-diatonic options (secondary dominants, modal interchange)
        let previousRoot = null;
        for (const degree of degrees) {
            // Candidate chords: diatonic + borrowed/modal + secondary dominants
            const candidates = this._expandChordOptions(scale, degree, attributes);

            // Score candidates using tension preference and voice-leading (prefer small motion)
            let best = null;
            let bestScore = -Infinity;
            for (const cand of candidates) {
                // Base score from how well chord matches desired tension/density and scale consonance
                const matchScore = this._scoreChordMatch(cand, attributes, scale);

                // Voice-leading preference: small semitone moves preferred
                let leadPenalty = 0;
                if (previousRoot) {
                    const dist = this._semitoneDistance(previousRoot, cand.root);
                    // smaller distance -> higher score
                    leadPenalty = - (dist / 12); // normalized
                }

                // If attributes favor high tension, boost altered/secondary types
                const tensionBoost = (attributes.tension > 0.7 && (cand.symbol && /7alt|b9|9|11|13/.test(cand.symbol))) ? 0.2 : 0;

                // discourage repeating the exact same root repeatedly
                let repeatPenalty = 0;
                if (previousRoot && previousRoot === cand.root) repeatPenalty = -0.35;

                // tiny random jitter to avoid deterministic stuck choices
                const jitter = (Math.random() - 0.5) * 0.02;

                const score = matchScore + leadPenalty + tensionBoost + repeatPenalty + jitter;
                if (score > bestScore) {
                    bestScore = score;
                    best = cand;
                }
            }

            const modified = this._applyAttributesToChord(best, attributes, scale);
            progression.push(modified);
            previousRoot = modified.root;
        }

        return progression;
    }

    /**
     * Interpret motion instructions from semantic patterns or word hints
     */
    _interpretMotionFromSemantic(attributes, word) {
        // Check explicit semanticPatterns first
        word = (word || '').toLowerCase();
        for (const [pattern, attrs] of Object.entries(this.semanticPatterns)) {
            if (attrs.motion) {
                if (word === pattern) return attrs.motion;
                if (word.includes(pattern) || pattern.includes(word)) return attrs.motion;
            }
        }

        // Also, some attributes may hint at motion but not provide a spec
        if (attributes && attributes.movement && attributes.movement > 0.85) {
            // generic forward motion (non-specific)
            return { type: 'linear', direction: 'down', step: 1, chromatic: false };
        }

        return null;
    }

    /**
     * Generate a progression that follows an explicit motion specification.
     * motionSpec: { type: 'spiral'|'linear', direction: 'down'|'up', step: 1, chromatic: true|false, landing: { degree, quality } }
     */
    _generateMotionProgression(attributes, scale, motionSpec, length) {
        const progression = [];

        // Safe access to chromatic mapping
        const chromatic = this.musicTheory.chromaticNotes || ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const noteValues = this.musicTheory.noteValues || {
            'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
        };

        const step = motionSpec.step || 1;
        const dir = motionSpec.direction === 'up' ? 'up' : 'down';

        // Determine landing degree and desired final quality
        const landing = (motionSpec.landing && motionSpec.landing.degree) ? motionSpec.landing.degree : 1;
        const landingQuality = (motionSpec.landing && motionSpec.landing.quality) ? motionSpec.landing.quality : null;

        // Compute semitone of landing chord root
        let landingChord = this._getDiatonicChord(scale, landing);
        // If landingQuality overrides, set temporarily
        if (landingQuality) landingChord.type = landingQuality;

        const landingRoot = landingChord.root;
        let landingSemitone = (noteValues[landingRoot] !== undefined) ? noteValues[landingRoot] : noteValues[landingRoot.replace(/\d+/, '')];
        if (landingSemitone === undefined) {
            // fallback to tonic
            const tonicName = (typeof scale.root === 'string') ? scale.root.replace(/\d+/, '') : 'C';
            landingSemitone = noteValues[tonicName] || 0;
        }

        // Compute starting semitone so we step toward landing across 'length' chords
        let startSemitone;
        if (dir === 'down') {
            startSemitone = (landingSemitone + (step * (length - 1))) % 12;
        } else {
            startSemitone = (landingSemitone - (step * (length - 1)) + 120) % 12;
        }

        // Build sequence from start -> landing
        for (let i = 0; i < length; i++) {
            const sem = (dir === 'down') ? (startSemitone - i * step + 120) % 12 : (startSemitone + i * step) % 12;
            const rootName = chromatic[sem];

            // choose chord quality: prefer landingQuality for final, otherwise use same quality or half-diminished for spiral
            let quality = 'm7';
            if (motionSpec.type === 'spiral') quality = 'm7b5';
            if (i === length - 1 && landingQuality) quality = landingQuality;

            const symbolBase = `${rootName}${quality}`;
            const chord = { root: rootName, type: quality, degree: `motion-${i}`, symbol: symbolBase };
            const modified = this._applyAttributesToChord(chord, attributes);
            progression.push(modified);
        }

        return progression;
    }

    /**
     * Expand chord options for a given scale degree: include diatonic chord,
     * secondary dominant (V of target), and common modal interchange chords (bIII, bVI, bVII)
     */
    _expandChordOptions(scale, degree, attributes) {
        const suggestions = [];

        // Diatonic chord (PRIORITIZED - add multiple times for higher selection probability)
        const diatonic = this._getDiatonicChord(scale, degree);
        suggestions.push(diatonic);
        suggestions.push({ ...diatonic, priority: 'diatonic' }); // Add again with priority flag
        suggestions.push({ ...diatonic, priority: 'diatonic' }); // Add third time for strong preference

        // Modal-specific characteristic options (e.g., lydian color tones)
        const scaleAliases = {
            'minor': 'aeolian',
            'natural_minor': 'aeolian',
            'harmonic_minor': 'harmonic',
            'melodic_minor': 'melodic'
        };
        const scaleName = scaleAliases[scale.name] || scale.name;

        // Determine semitone of scale root
        // Fallbacks if musicTheory mock doesn't provide full maps
        const noteValues = this.musicTheory.noteValues || {
            'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
        };
        const chromatic = this.musicTheory.chromaticNotes || ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        const rootName = (typeof scale.root === 'string') ? scale.root.replace(/\d+/,'') : 'C';
        const rootVal = noteValues[rootName];
        const intervals = (this.musicTheory.scales[scaleName] && this.musicTheory.scales[scaleName].intervals) ? this.musicTheory.scales[scaleName].intervals : this.musicTheory.scales[scaleName] || [];
        
        // Guard against invalid degree or missing intervals
        if (intervals.length === 0 || rootVal === undefined) {
            return suggestions; // return diatonic only
        }
        
        const idx = (degree - 1) % intervals.length;
        const targetSemitone = (rootVal + intervals[idx]) % 12;

        // Lydian characteristic options: #11 on I, #IVø, II7
        if (scaleName === 'lydian') {
            // #IVø (raised 4 half-diminished)
            const sharpFour = chromatic[(rootVal + 6) % 12];
            if (sharpFour) suggestions.push({ root: sharpFour, type: 'm7b5', degree: '#4ø', symbol: `${sharpFour}m7b5` });
            // II7 (bright dominant)
            const two = chromatic[(rootVal + 2) % 12];
            if (two) suggestions.push({ root: two, type: '7', degree: 'II7', symbol: `${two}7` });
        }

        // Secondary dominant (V of target)
        const secDomSemitone = (targetSemitone + 7) % 12;
        const secDomRoot = chromatic[secDomSemitone];
        if (secDomRoot) {
            suggestions.push({ root: secDomRoot, type: '7', degree: `V/${degree}`, symbol: `${secDomRoot}7` });
        }

        // Modal interchange candidates (borrow from parallel minor/major)
        // bIII (flat 3), bVI (flat 6), bVII (flat 7)
        const indices = [2, 5, 6]; // 3rd, 6th, 7th degrees (0-based indices)
        for (const di of indices) {
            if (di < intervals.length) {
                const sem = (rootVal + intervals[di] - 1 + 120) % 12; // flatten by 1 semitone
                const r = chromatic[sem];
                if (r) {
                    // choose minor or major quality based on typical borrow
                    const t = di === 2 ? 'm' : di === 5 ? '' : ''; // rough heuristic
                    suggestions.push({ root: r, type: t, degree: `b${di+1}`, symbol: `${r}${t}` });
                }
            }
        }

        // Passing chromatic neighbors (only if high tension or movement)
        if ((attributes.tension && attributes.tension > 0.65) || (attributes.movement && attributes.movement > 0.6)) {
            const up = chromatic[(targetSemitone + 1) % 12];
            const down = chromatic[(targetSemitone + 11) % 12];
            if (up) suggestions.push({ root: up, type: '', degree: 'chromatic+1', symbol: `${up}` });
            if (down) suggestions.push({ root: down, type: '', degree: 'chromatic-1', symbol: `${down}` });
        }

        // Deduplicate by root+type
        const seen = new Set();
        const uniq = [];
        for (const s of suggestions) {
            const k = `${s.root}:${s.type || ''}`;
            if (!seen.has(k)) {
                seen.add(k);
                uniq.push(s);
            }
        }

        return uniq;
    }

    /**
     * Simple scoring of how well a chord matches target attributes
     */
    _scoreChordMatch(chord, attributes, scale = null) {
        // base: prefer chords whose name contains tensions when tension high
        let score = 0;
        if (!chord || !chord.symbol) return score;

        // STRONG preference for diatonic chords
        if (chord.priority === 'diatonic') {
            score += 0.8; // Major boost for diatonic chords
        }

        // density preference
        if (attributes.density > 0.7 && /9|11|13/.test(chord.symbol)) score += 0.3;
        if (attributes.density < 0.4 && !/9|11|13/.test(chord.symbol)) score += 0.1;

        // tension preference
        if (attributes.tension > 0.6 && /7|alt|b9/.test(chord.symbol)) score += 0.3;
        if (attributes.tension < 0.4 && !/7|alt|b9/.test(chord.symbol)) score += 0.1;

        // brightness preference: simple heuristic, prefer major-ish names for bright
        if (attributes.brightness > 0.6 && !/m|dim/.test(chord.symbol)) score += 0.15;
        if (attributes.brightness < 0.4 && /m|dim/.test(chord.symbol)) score += 0.15;

        // scale consonance: reward scale tones, penalize out-of-scale unless tension/movement very high
        if (scale) {
            const consonance = this._scaleConsonance(chord.root, scale);
            score += consonance;
        }

        return score;
    }

    _scaleConsonance(root, scale) {
        if (!root || !scale || !this.musicTheory || !this.musicTheory.noteValues) return 0;
        const scaleAliases = {
            'minor': 'aeolian',
            'natural_minor': 'aeolian',
            'harmonic_minor': 'harmonic',
            'melodic_minor': 'melodic'
        };
        const scaleName = scaleAliases[scale.name] || scale.name;
        const intervals = this.musicTheory.scales[scaleName] || [];
        const noteValues = this.musicTheory.noteValues;
        const rootName = (typeof scale.root === 'string') ? scale.root.replace(/\d+/, '') : 'C';
        const rootVal = noteValues[rootName];
        const targetVal = noteValues[root] !== undefined ? noteValues[root] : noteValues[root.replace(/\d+/, '')];
        if (rootVal === undefined || targetVal === undefined || intervals.length === 0) return 0;
        const rel = (targetVal - rootVal + 120) % 12;
        const inScale = intervals.includes(rel);
        return inScale ? 0.25 : -0.35; // prefer scale tones, penalize off-scale
    }

    /**
     * Semitone distance between two chromatic note names (0..6 minimal)
     */
    _semitoneDistance(a, b) {
        if (!a || !b) return 0;
        const noteValues = this.musicTheory.noteValues || {
            'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
        };
        const va = noteValues[a] !== undefined ? noteValues[a] : noteValues[a.replace(/\d+/, '')];
        const vb = noteValues[b] !== undefined ? noteValues[b] : noteValues[b.replace(/\d+/, '')];
        if (va === undefined || vb === undefined) return 0;
        const diff = Math.abs(va - vb) % 12;
        return Math.min(diff, 12 - diff);
    }

    /**
     * Generate scale degrees based on movement and intensity
     */
    _generateDegrees(length, movement, intensity) {
        const degrees = [1]; // Start on tonic

        // EXPANDED progression patterns with more variety
        const patterns = {
            // Classic patterns
            tonic: [1, 4, 5, 1],
            subdominant: [1, 6, 4, 5],
            circle: [1, 4, 7, 3, 6, 2, 5, 1],
            
            // Modal patterns
            modal_up: [1, 2, 3, 1],
            modal_down: [1, 7, 6, 1],
            dorian: [1, 2, 4, 1],
            phrygian: [1, 2, 1, 7],
            
            // Movement patterns
            ascending: [1, 2, 3, 4, 5],
            descending: [1, 7, 6, 5, 4],
            wave: [1, 3, 2, 4, 3, 5],
            spiral: [1, 5, 2, 6, 3, 7],
            
            // Tension patterns
            building: [1, 6, 2, 5],
            release: [1, 4, 1, 5],
            suspension: [1, 4, 4, 1],
            chromatic: [1, 2, 3, 4],
            
            // Rhythmic patterns
            ostinato: [1, 5, 1, 5],
            alternating: [1, 3, 1, 6],
            pedal: [1, 2, 1, 3, 1]
        };

        // SMART pattern selection based on multiple attributes
        let patternChoices = [];
        
        if (movement > 0.8) {
            patternChoices.push('circle', 'spiral', 'ascending', 'wave');
        } else if (movement > 0.6) {
            patternChoices.push('building', 'subdominant', 'wave');
        } else if (movement < 0.3) {
            patternChoices.push('modal_up', 'modal_down', 'ostinato', 'pedal');
        } else {
            patternChoices.push('tonic', 'dorian', 'alternating');
        }
        
        if (intensity > 0.7) {
            patternChoices.push('chromatic', 'building', 'phrygian');
        } else if (intensity < 0.3) {
            patternChoices.push('release', 'modal_up', 'pedal');
        }
        
        // Add randomness - sometimes pick unexpected patterns
        if (Math.random() > 0.7) {
            const allPatterns = Object.keys(patterns);
            patternChoices.push(allPatterns[Math.floor(Math.random() * allPatterns.length)]);
        }
        
        // Select pattern (with fallback)
        const patternName = patternChoices.length > 0 ? 
            patternChoices[Math.floor(Math.random() * patternChoices.length)] : 'tonic';
        const pattern = patterns[patternName] || patterns.tonic;

        // Extract degrees to fit length
        for (let i = 1; i < length && i < pattern.length; i++) {
            degrees.push(pattern[i]);
        }

        // If need more, cycle through pattern with slight variations
        while (degrees.length < length) {
            const idx = degrees.length % pattern.length;
            let degree = pattern[idx];
            
            // Add occasional variations (10% chance)
            if (Math.random() > 0.9) {
                degree = Math.max(1, Math.min(7, degree + (Math.random() > 0.5 ? 1 : -1)));
            }
            
            degrees.push(degree);
        }

        return degrees.slice(0, length);
    }

    /**
     * Get diatonic chord for degree in scale
     */
    _getDiatonicChord(scale, degree) {
        // Alias common scale names
        const scaleAliases = {
            'minor': 'aeolian',
            'natural_minor': 'aeolian',
            'harmonic_minor': 'harmonic',
            'melodic_minor': 'melodic'
        };
        const scaleName = scaleAliases[scale.name] || scale.name;

        // Build chord based on scale and degree
        const scaleData = this.musicTheory.scales[scaleName];
        if (!scaleData) {
            // Fallback for unknown scale
            const chordTypes = ['', 'm', 'm', '', '', 'm', 'dim'];
            const chordType = chordTypes[(degree - 1) % 7];
            return {
                root: scale.root,
                type: chordType,
                degree: degree,
                symbol: `${scale.root}${chordType}`
            };
        }

        // Get scale intervals
        const intervals = scaleData.intervals || scaleData;
        const rootIdx = (degree - 1) % intervals.length;
        const semitoneOffset = intervals[rootIdx];
        const rootNote = this.musicTheory.transposeNote(scale.root, semitoneOffset);

        // Determine chord quality by building triad
        const third = intervals[(rootIdx + 2) % intervals.length] - intervals[rootIdx];
        const fifth = intervals[(rootIdx + 4) % intervals.length] - intervals[rootIdx];

        let chordType = '';
        if (third === 4 && fifth === 7) chordType = ''; // Major
        else if (third === 3 && fifth === 7) chordType = 'm'; // Minor
        else if (third === 3 && fifth === 6) chordType = 'dim'; // Diminished
        else if (third === 4 && fifth === 8) chordType = 'aug'; // Augmented
        else chordType = ''; // Default to major

        return {
            root: rootNote,
            type: chordType,
            degree: degree,
            symbol: `${rootNote}${chordType}`
        };
    }

    /**
     * Modify chord based on attributes
     */
    _applyAttributesToChord(chord, attributes, scale = null) {
        let symbol = chord.symbol || `${chord.root}${chord.type}`;
        
        // If chord already carries specific color (maj7, maj7#11, m7b5, any 7/9/11/13), avoid auto-append that breaks spelling
        const hasExplicitExtension = /maj7|m7b5|#11|b5|7|9|11|13/.test(symbol);

        // Add density (extensions) only if not already extended
        if (!hasExplicitExtension) {
            if (attributes.density > 0.8) {
                symbol += '11';
            } else if (attributes.density > 0.6) {
                // choose quality-aware 9th
                if (chord.type === 'm') symbol += 'm9';
                else symbol += 'maj9';
            } else if (attributes.density > 0.4) {
                // choose 7th quality based on chord type and brightness
                if (chord.type === 'm') {
                    symbol += 'm7';
                } else {
                    const preferMaj7 = attributes.brightness > 0.55 && attributes.tension < 0.7;
                    symbol += preferMaj7 ? 'maj7' : '7';
                }
            }
        }

        // Add tension (alterations) but avoid clobbering maj7#11 or m7b5 colors
        if (!/maj7#11|m7b5/.test(symbol)) {
            if (attributes.tension > 0.7) {
                if (symbol.includes('7')) {
                    symbol = symbol.replace('7', '7alt');
                }
            } else if (attributes.tension > 0.6) {
                if (symbol.includes('7')) {
                    symbol += 'b9';
                }
            }
        }

        // Modal coloration: Lydian tonic gets #11 to emphasize the raised 4th
        if (scale && (scale.name === 'lydian' || scale.name === 'Lydian')) {
            const tonicRoot = (typeof scale.root === 'string') ? scale.root.replace(/\d+/, '') : scale.root;
            if (tonicRoot && chord.root === tonicRoot && !/\#11/.test(symbol)) {
                symbol += '#11';
            }
        }

        return {
            ...chord,
            symbol,
            fullName: symbol,
            attributes: this.chordAttrs.analyzeChord(symbol).attributes,
            scaleContext: scale ? `${scale.root} ${scale.name}` : undefined
        };
    }

    /**
     * Blend attributes across multiple words
     */
    _blendWordAttributes(wordMappings) {
        const count = wordMappings.length;
        const blended = {
            brightness: 0,
            tension: 0,
            density: 0,
            articulation: 0,
            movement: 0,
            intensity: 0,
            context: []
        };

        for (const mapping of wordMappings) {
            const attrs = mapping.unified;
            blended.brightness += attrs.brightness;
            blended.tension += attrs.tension;
            blended.density += attrs.density;
            blended.articulation += attrs.articulation;
            blended.movement += attrs.movement;
            blended.intensity += attrs.intensity;
            blended.context.push(...attrs.context);
        }

        // Average
        blended.brightness /= count;
        blended.tension /= count;
        blended.density /= count;
        blended.articulation /= count;
        blended.movement /= count;
        blended.intensity /= count;
        blended.context = [...new Set(blended.context)]; // Unique

        return blended;
    }

    /**
     * Gather scale suggestions from all word mappings
     */
    _gatherScaleSuggestions(wordMappings) {
        const suggestions = [];
        for (const mapping of wordMappings) {
            suggestions.push(...mapping.phonetic.musicalAttributes.scales);
        }
        return suggestions;
    }

    /**
     * Generate progression for multiple words
     */
    _generateMultiWordProgression(wordMappings, blendedAttributes, scale) {
        // Generate unified progression based on blended attributes
        // Use total word count to determine length
        const length = Math.min(8, wordMappings.length + 2);
        
        // Generate degrees using blended attributes
        const degrees = this._generateDegrees(length, blendedAttributes.movement, blendedAttributes.intensity);
        
        // Anchor first chord on tonic
        const progression = [];
        let previousRoot = null;
        if (degrees.length > 0) {
            const tonicChord = this._applyAttributesToChord(this._getDiatonicChord(scale, 1), blendedAttributes, scale);
            progression.push(tonicChord);
            previousRoot = tonicChord.root;
        }

        // Use same non-diatonic expansion and scoring as single-word progression for the rest
        for (let i = 1; i < degrees.length; i++) {
            const degree = degrees[i];
            const candidates = this._expandChordOptions(scale, degree, blendedAttributes);
            
            let best = null;
            let bestScore = -Infinity;
            for (const cand of candidates) {
                const matchScore = this._scoreChordMatch(cand, blendedAttributes, scale);
                let leadPenalty = 0;
                if (previousRoot) {
                    const dist = this._semitoneDistance(previousRoot, cand.root);
                    leadPenalty = - (dist / 12);
                }
                const tensionBoost = (blendedAttributes.tension > 0.7 && (cand.symbol && /7alt|b9|9|11|13/.test(cand.symbol))) ? 0.2 : 0;
                let repeatPenalty = 0;
                if (previousRoot && previousRoot === cand.root) repeatPenalty = -0.35;
                const jitter = (Math.random() - 0.5) * 0.02;
                const score = matchScore + leadPenalty + tensionBoost + repeatPenalty + jitter;
                if (score > bestScore) {
                    bestScore = score;
                    best = cand;
                }
            }
            
            const modifiedChord = this._applyAttributesToChord(best, blendedAttributes, scale);
            progression.push(modifiedChord);
            previousRoot = modifiedChord.root;
        }

        return progression;
    }

    /**
     * Generate reasoning explanation
     */
    _generateReasoning(phoneticProfile, semanticProfile, unified, scale, progression) {
        const reasons = [];

        // Phonetic reasoning
        if (phoneticProfile.musicalAttributes.harmonicTension > 0.6) {
            reasons.push(`High consonant tension (${(phoneticProfile.musicalAttributes.harmonicTension * 100).toFixed(0)}%) suggests dissonant harmony`);
        }
        if (phoneticProfile.musicalAttributes.brightness > 0.6) {
            reasons.push(`Bright vowels (${(phoneticProfile.musicalAttributes.brightness * 100).toFixed(0)}%) indicate major/lydian tonality`);
        }

        // Semantic reasoning
        if (semanticProfile.emotional.valence > 0.5) {
            reasons.push(`Positive semantic valence suggests major quality`);
        } else if (semanticProfile.emotional.valence < -0.5) {
            reasons.push(`Negative semantic valence suggests minor quality`);
        }

        // Scale reasoning
        reasons.push(`Selected ${scale.root} ${scale.name} based on combined attributes`);

        return {
            summary: reasons.join('. '),
            phonetic: phoneticProfile.musicalAttributes,
            semantic: semanticProfile,
            unified: unified
        };
    }

    /**
     * Generate reasoning for multiple words
     */
    _generateMultiWordReasoning(wordMappings, blended, scale, progression) {
        const reasons = [];

        reasons.push(`Analyzed ${wordMappings.length} words`);
        reasons.push(`Blended brightness: ${(blended.brightness * 100).toFixed(0)}%`);
        reasons.push(`Blended tension: ${(blended.tension * 100).toFixed(0)}%`);
        reasons.push(`Selected ${scale.root} ${scale.name}`);

        return {
            summary: reasons.join('. '),
            blended: blended,
            words: wordMappings.map(m => m.word)
        };
    }
}

// Export for browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenerativeWordMapper;
}
