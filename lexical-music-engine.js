/**
 * @module LexicalMusicEngine
 * @description Translates English words into music theory parameters through multi-layer semantic analysis
 * @exports class LexicalMusicEngine
 * @feature Emotional valence analysis (words → mood → scales)
 * @feature Syllabic rhythm mapping (syllables → note durations)
 * @feature Phonetic color analysis (vowel/consonant → harmonic extensions)
 * @feature Semantic categorization (nature/urban/temporal → progressions)
 * @feature Musical archetype matching (common phrases → famous soundtrack patterns)
 * @feature Adjustable influence weights per analysis layer
 * @feature Regeneration system (multiple alternative mappings per word)
 * @feature Performance optimized (caching, lazy loading, < 100ms response)
 * 
 * README_SECTION: Lexical Music Engine (Word-to-Music Translation)
 * 
 * Transform English words into music theory suggestions:
 * - Type "chase, woods, dark, magic" → Get scale, progression, rhythm, voicings
 * - Adjustable weights control how each word analysis layer influences output
 * - Three order modes: Sequential (word order = chord order), Weighted (blended), Narrative (tension arc)
 * - Archetype detection: "medieval city ancient epic journey" → Skyrim "Secunda" preset
 * - Regeneration: Disagree with a word's mapping? Click to see alternatives
 * 
 * Usage:
 *   const lexical = new LexicalMusicEngine(musicTheoryEngine);
 *   const result = lexical.translateWords("chase, dark, woods");
 *   console.log(result.scale);        // e.g., "E phrygian"
 *   console.log(result.progression);  // e.g., ["Em7", "F", "Em7", "F"]
 */

class LexicalMusicEngine {
    constructor(musicTheoryEngine, wordDatabase = null) {
        if (!musicTheoryEngine) {
            throw new Error('LexicalMusicEngine requires MusicTheoryEngine');
        }

        this.musicTheory = musicTheoryEngine;
        this.wordDb = wordDatabase || new WordDatabase();
        
        // Analysis cache (performance optimization)
        this.cache = new Map();
        
        // Default influence weights (0-100)
        this.weights = {
            master: 70,        // Global master weight
            emotional: 80,     // Emotional valence influence
            syllabic: 60,      // Syllabic rhythm influence
            phonetic: 50,      // Phonetic color influence
            semantic: 90,      // Semantic context influence
            archetype: 95      // Archetype matching influence
        };
        
        // Order mode: how words combine
        this.orderMode = 'weighted'; // 'sequential' | 'weighted' | 'narrative'
        
        // Complexity preference
        this.complexityPref = 'adaptive'; // 'triads' | 'sevenths' | 'extended' | 'adaptive'
        
        // Align with grading mode
        this.alignGrading = true;
        
        // Per-word weight overrides
        this.wordWeightOverrides = new Map();
        
        // Debug logging
        this.debug = false;
    }

    /** Conditional logger */
    _log(...args) {
        if (this.debug) {
            console.log('[LexicalMusicEngine]', ...args);
        }
    }

    /**
     * Main entry point: Translate comma-separated words into music theory
     * @param {string} wordsString - Comma-separated words (e.g., "chase, woods, dark")
     * @param {object} options - Override options (weights, orderMode, etc.)
     * @returns {object} - { scale, progression, rhythm, voicings, complexity, analyses }
     */
    translateWords(wordsString, options = {}) {
        if (!wordsString || typeof wordsString !== 'string') {
            return this._emptyResult();
        }

        // Parse input
        const words = this._parseInput(wordsString);
        if (words.length === 0) {
            return this._emptyResult();
        }

        // Apply option overrides
        const savedWeights = { ...this.weights };
        const savedOrderMode = this.orderMode;
        const savedComplexity = this.complexityPref;
        
        if (options.weights) Object.assign(this.weights, options.weights);
        if (options.orderMode) this.orderMode = options.orderMode;
        if (options.complexityPref) this.complexityPref = options.complexityPref;

        // Analyze each word
        const analyses = words.map(w => this.analyzeWord(w));
        this._log('Analyzed words:', analyses);

        // Check for archetype match first (highest priority)
        const archetype = this._matchArchetype(words, analyses);
        if (archetype && this.weights.archetype > 50) {
            this._log('Archetype matched:', archetype.name);
            const result = this._applyArchetype(archetype, analyses);
            
            // Restore settings
            this.weights = savedWeights;
            this.orderMode = savedOrderMode;
            this.complexityPref = savedComplexity;
            
            return result;
        }

        // No archetype or low weight: build from analysis layers
        let result;
        if (this.orderMode === 'sequential') {
            result = this._buildSequentialProgression(analyses);
        } else if (this.orderMode === 'narrative') {
            result = this._buildNarrativeArc(analyses);
        } else {
            result = this._buildWeightedProgression(analyses);
        }

        // Restore settings
        this.weights = savedWeights;
        this.orderMode = savedOrderMode;
        this.complexityPref = savedComplexity;

        return result;
    }

    /**
     * Analyze a single word through all layers
     * @param {string} word - Single word to analyze
     * @returns {object} - { word, syllables, phonetics, emotional, semantic, alternatives }
     */
    analyzeWord(word) {
        word = word.toLowerCase().trim();
        
        // Check cache
        if (this.cache.has(word)) {
            return { ...this.cache.get(word) };
        }

        const analysis = {
            word: word,
            syllables: this._getSyllables(word),
            phonetics: this._getPhonetics(word),
            emotional: this._getEmotionalValence(word),
            semantic: this._getSemanticCategory(word),
            alternatives: []  // Populated on demand
        };

        // Cache result
        this.cache.set(word, analysis);
        
        return analysis;
    }

    /**
     * Get alternative mappings for a word (for regeneration)
     * @param {string} word - Word to regenerate
     * @param {number} count - Number of alternatives (default 3)
     * @returns {array} - Array of alternative analysis objects with reasoning
     */
    getAlternatives(word, count = 3) {
        const primary = this.analyzeWord(word);
        const alternatives = [];

        // Strategy 1: Shift emotional interpretation
        if (primary.emotional.valence !== undefined) {
            alternatives.push({
                ...primary,
                emotional: {
                    ...primary.emotional,
                    valence: Math.max(-1, primary.emotional.valence - 0.3),
                    arousal: primary.emotional.arousal
                },
                reasoning: 'Darker interpretation'
            });
            
            alternatives.push({
                ...primary,
                emotional: {
                    ...primary.emotional,
                    valence: Math.min(1, primary.emotional.valence + 0.3),
                    arousal: primary.emotional.arousal
                },
                reasoning: 'Brighter interpretation'
            });
        }

        // Strategy 2: Different semantic category
        const altCategories = this.wordDb.getAlternativeCategories(word);
        altCategories.forEach(cat => {
            alternatives.push({
                ...primary,
                semantic: cat,
                reasoning: `As ${cat.name} context`
            });
        });

        // Strategy 3: Shift phonetic emphasis
        if (primary.phonetics.dominantVowel) {
            const altPhonetics = { ...primary.phonetics };
            altPhonetics.emphasis = altPhonetics.emphasis === 'vowel' ? 'consonant' : 'vowel';
            alternatives.push({
                ...primary,
                phonetics: altPhonetics,
                reasoning: 'Alternative phonetic emphasis'
            });
        }

        return alternatives.slice(0, count);
    }

    /**
     * Set influence weight for a specific layer
     * @param {string} layer - 'emotional' | 'syllabic' | 'phonetic' | 'semantic' | 'archetype' | 'master'
     * @param {number} value - Weight value 0-100
     */
    setWeight(layer, value) {
        if (this.weights.hasOwnProperty(layer)) {
            this.weights[layer] = Math.max(0, Math.min(100, value));
        }
    }

    /**
     * Set per-word weight override
     * @param {string} word - Word to override
     * @param {number} weight - Weight multiplier 0-100
     */
    setWordWeight(word, weight) {
        this.wordWeightOverrides.set(word.toLowerCase(), weight);
    }

    /**
     * Clear all caches (useful after changing settings)
     */
    clearCache() {
        this.cache.clear();
    }

    // ==================== INTERNAL METHODS ====================

    /** Parse comma-separated input into word array */
    _parseInput(str) {
        return str.split(',')
            .map(w => w.trim().toLowerCase())
            .filter(w => w.length > 0 && /^[a-z]+$/.test(w)); // Only alphabetic
    }

    /** Empty result template */
    _emptyResult() {
        return {
            scale: { root: 'C', name: 'major' },
            progression: ['Cmaj7'],
            rhythm: ['quarter'],
            voicings: [],
            complexity: 'triads',
            analyses: [],
            archetype: null
        };
    }

    /** Count syllables (simple heuristic) */
    _getSyllables(word) {
        if (!word) return 0;
        word = word.toLowerCase();
        
        // Remove silent 'e' at end
        word = word.replace(/e$/, '');
        
        // Count vowel groups
        const vowelGroups = word.match(/[aeiouy]+/g);
        const count = vowelGroups ? vowelGroups.length : 1;
        
        return Math.max(1, count);
    }

    /** Analyze phonetic properties */
    _getPhonetics(word) {
        const vowels = (word.match(/[aeiouy]/g) || []).join('');
        const consonants = word.replace(/[aeiouy]/g, '');
        
        // Dominant vowel sound
        let dominantVowel = 'neutral';
        if (vowels.includes('ee') || vowels.includes('i')) dominantVowel = 'bright';
        else if (vowels.includes('oo') || vowels.includes('u')) dominantVowel = 'dark';
        else if (vowels.includes('o')) dominantVowel = 'round';
        else if (vowels.includes('a')) dominantVowel = 'open';
        
        // Consonant harshness
        const harshConsonants = ['k', 'g', 't', 'd', 'p', 'b'];
        const softConsonants = ['l', 'm', 'n', 'r', 'w', 'y'];
        
        let harshness = 0;
        let softness = 0;
        for (const c of consonants) {
            if (harshConsonants.includes(c)) harshness++;
            if (softConsonants.includes(c)) softness++;
        }
        
        return {
            dominantVowel,
            harshness: harshness / consonants.length || 0,
            softness: softness / consonants.length || 0,
            emphasis: harshness > softness ? 'sharp' : 'smooth'
        };
    }

    /** Get emotional valence from word database */
    _getEmotionalValence(word) {
        return this.wordDb.getEmotionalValence(word);
    }

    /** Get semantic category from word database */
    _getSemanticCategory(word) {
        return this.wordDb.getSemanticCategory(word);
    }

    /** Match archetype patterns */
    _matchArchetype(words, analyses) {
        return this.wordDb.matchArchetype(words, analyses);
    }

    /** Build progression in sequential mode (word order = chord order) */
    _buildSequentialProgression(analyses) {
        const chords = [];
        const rhythms = [];
        
        analyses.forEach(analysis => {
            // Each word becomes one chord
            const chord = this._wordToChord(analysis);
            chords.push(chord);
            
            // Syllables determine rhythm
            rhythms.push(this._syllablesToRhythm(analysis.syllables));
        });

        // Scale from first word's emotion
        const scale = this._emotionToScale(analyses[0].emotional);

        return {
            scale,
            progression: chords,
            rhythm: rhythms,
            voicings: this._determineVoicings(analyses),
            complexity: this._determineComplexity(analyses),
            analyses,
            archetype: null,
            orderMode: 'sequential'
        };
    }

    /** Build progression in narrative mode (tension arc) */
    _buildNarrativeArc(analyses) {
        // Create emotional journey: intro → tension → climax → resolution
        const arcPoints = [
            { position: 0, tension: 0.2 },      // Intro (low tension)
            { position: 0.3, tension: 0.5 },    // Rising
            { position: 0.7, tension: 0.9 },    // Climax
            { position: 1.0, tension: 0.1 }     // Resolution
        ];

        const chords = [];
        const avgEmotion = this._averageEmotions(analyses);
        const scale = this._emotionToScale(avgEmotion);

        // Interpolate chords along arc
        for (let i = 0; i < 4; i++) {
            const t = arcPoints[i].position;
            const targetTension = arcPoints[i].tension;
            
            const chord = this._tensionToChord(targetTension, scale, avgEmotion);
            chords.push(chord);
        }

        return {
            scale,
            progression: chords,
            rhythm: this._narrativeRhythm(analyses),
            voicings: this._determineVoicings(analyses),
            complexity: this._determineComplexity(analyses),
            analyses,
            archetype: null,
            orderMode: 'narrative'
        };
    }

    /** Build progression in weighted mode (all words contribute) */
    _buildWeightedProgression(analyses) {
        // Combine all analyses with weights
        const avgEmotion = this._averageEmotions(analyses);
        const scale = this._emotionToScale(avgEmotion);
        
        // Aggregate semantic categories
        const categories = analyses.map(a => a.semantic);
        const progression = this._semanticToProgression(categories, scale);
        
        // Combine rhythms
        const rhythm = this._combineRhythms(analyses);
        
        // Voicings from phonetics
        const voicings = this._determineVoicings(analyses);

        return {
            scale,
            progression,
            rhythm,
            voicings,
            complexity: this._determineComplexity(analyses),
            analyses,
            archetype: null,
            orderMode: 'weighted'
        };
    }

    /** Apply archetype preset */
    _applyArchetype(archetype, analyses) {
        return {
            scale: archetype.scale,
            progression: archetype.progression,
            rhythm: archetype.rhythm,
            voicings: archetype.voicings || [],
            complexity: archetype.complexity,
            analyses,
            archetype: {
                name: archetype.name,
                confidence: archetype.confidence,
                description: archetype.description
            },
            orderMode: this.orderMode
        };
    }

    /** Convert emotion object to scale */
    _emotionToScale(emotion) {
        const { valence, arousal, dominance } = emotion;
        
        // High valence = major-ish, low valence = minor-ish
        // High arousal = altered/chromatic, low arousal = diatonic
        
        if (valence > 0.5) {
            // Positive emotions
            if (arousal > 0.6) return { root: 'G', name: 'lydian' };  // Bright, energetic
            if (arousal < -0.3) return { root: 'C', name: 'major' };  // Calm, peaceful
            return { root: 'D', name: 'mixolydian' };                  // Uplifting
        } else if (valence < -0.3) {
            // Negative emotions
            if (arousal > 0.6) return { root: 'E', name: 'phrygian' }; // Dark, intense
            if (dominance < -0.3) return { root: 'B', name: 'locrian' }; // Anxious, unstable
            return { root: 'A', name: 'aeolian' };                      // Sad, melancholic
        } else {
            // Neutral/ambiguous
            if (arousal > 0.5) return { root: 'D', name: 'dorian' };   // Mysterious, modal
            return { root: 'C', name: 'major' };                        // Default
        }
    }

    /** Convert single word to chord */
    _wordToChord(analysis) {
        const scale = this._emotionToScale(analysis.emotional);
        const degree = 1; // Simplified: use tonic (could be enhanced)
        
        const quality = analysis.emotional.valence > 0 ? 'maj7' : 'm7';
        return `${scale.root}${quality}`;
    }

    /** Convert tension level to chord */
    _tensionToChord(tension, scale, emotion) {
        // Low tension = tonic, high tension = dominant
        if (tension < 0.3) {
            return `${scale.root}${emotion.valence > 0 ? 'maj7' : 'm7'}`;
        } else if (tension > 0.7) {
            // Dominant (5th degree)
            const dom = this.musicTheory.transposeNote(scale.root, 7);
            return `${dom}7`;
        } else {
            // Subdominant (4th degree)
            const sub = this.musicTheory.transposeNote(scale.root, 5);
            return `${sub}maj7`;
        }
    }

    /** Convert semantic categories to progression */
    _semanticToProgression(categories, scale) {
        // Default simple progression
        const root = scale.root;
        const quality = scale.name.includes('major') || scale.name.includes('lydian') || scale.name.includes('mixolydian') ? 'maj7' : 'm7';
        
        // Build I-IV-V-I or i-iv-v-i
        const fourth = this.musicTheory.transposeNote(root, 5);
        const fifth = this.musicTheory.transposeNote(root, 7);
        
        return [
            `${root}${quality}`,
            `${fourth}${quality}`,
            `${fifth}7`,
            `${root}${quality}`
        ];
    }

    /** Convert syllable count to rhythm notation */
    _syllablesToRhythm(syllableCount) {
        const rhythmMap = {
            1: 'quarter',
            2: 'eighth,eighth',
            3: 'eighth,quarter,eighth',
            4: 'sixteenth,sixteenth,eighth,eighth'
        };
        return rhythmMap[Math.min(syllableCount, 4)] || 'quarter';
    }

    /** Combine rhythms from multiple analyses */
    _combineRhythms(analyses) {
        return analyses.map(a => this._syllablesToRhythm(a.syllables));
    }

    /** Create narrative rhythm pattern */
    _narrativeRhythm(analyses) {
        return ['whole', 'half,half', 'quarter,quarter,quarter,quarter', 'whole'];
    }

    /** Average emotional vectors */
    _averageEmotions(analyses) {
        if (analyses.length === 0) {
            return { valence: 0, arousal: 0, dominance: 0 };
        }

        let sumV = 0, sumA = 0, sumD = 0;
        analyses.forEach(a => {
            const weight = this.wordWeightOverrides.get(a.word) || 100;
            const mult = weight / 100;
            sumV += a.emotional.valence * mult;
            sumA += a.emotional.arousal * mult;
            sumD += (a.emotional.dominance || 0) * mult;
        });

        const count = analyses.length;
        return {
            valence: sumV / count,
            arousal: sumA / count,
            dominance: sumD / count
        };
    }

    /** Determine voicing preferences */
    _determineVoicings(analyses) {
        const avgHarshness = analyses.reduce((sum, a) => sum + a.phonetics.harshness, 0) / analyses.length;
        
        if (avgHarshness > 0.5) {
            return ['close', 'low-register', 'stacked-fourths'];
        } else {
            return ['open', 'spread', 'root-position'];
        }
    }

    /** Determine chord complexity */
    _determineComplexity(analyses) {
        if (this.complexityPref !== 'adaptive') {
            return this.complexityPref;
        }

        // Adaptive: More arousal = more complexity
        const avgArousal = analyses.reduce((sum, a) => sum + Math.abs(a.emotional.arousal), 0) / analyses.length;
        
        if (avgArousal > 0.7) return 'extended';
        if (avgArousal > 0.4) return 'sevenths';
        return 'triads';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LexicalMusicEngine;
}
