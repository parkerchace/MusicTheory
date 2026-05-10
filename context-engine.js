/**
 * Context Engine - Sentence-Level Semantic Understanding
 * Replaces semantic-api-engine.js
 * 
 * Purpose: Parse input sentences to extract emotional context,
 * determine arc profile parameters for music generation
 * 
 * Architecture: Standalone, no external dependencies
 * Usage: const context = new ContextEngine().parseInput("tomorrow in sadness")
 */

class ContextEngine {
    constructor() {
        this.emotionalTones = {
            sad: { energy: 0.3, tension: 0.4, brightness: 0.2, arousal: 0.3 },
            joyful: { energy: 0.8, tension: 0.3, brightness: 0.9, arousal: 0.8 },
            angry: { energy: 0.9, tension: 0.9, brightness: 0.4, arousal: 0.9 },
            dreamy: { energy: 0.4, tension: 0.2, brightness: 0.5, arousal: 0.3 },
            hopeful: { energy: 0.7, tension: 0.3, brightness: 0.8, arousal: 0.6 },
            dark: { energy: 0.4, tension: 0.6, brightness: 0.1, arousal: 0.5 },
            mysterious: { energy: 0.5, tension: 0.7, brightness: 0.3, arousal: 0.5 },
            calm: { energy: 0.2, tension: 0.1, brightness: 0.6, arousal: 0.2 },
            intense: { energy: 0.9, tension: 0.8, brightness: 0.6, arousal: 0.9 },
            playful: { energy: 0.7, tension: 0.2, brightness: 0.8, arousal: 0.7 }
        };

        this.arcShapes = {
            rising: [[0, 0], [1, 1]],           // Low to high
            falling: [[0, 1], [1, 0]],          // High to low
            valley: [[0, 0.5], [0.5, 0], [1, 0.5]],    // Dip to bottom
            peak: [[0, 0.5], [0.5, 1], [1, 0.5]],      // Peak in middle
            wave: [[0, 0.3], [0.3, 0.8], [0.65, 0.2], [1, 0.6]],  // Undulating
            flat: [[0, 0.5], [1, 0.5]]          // Steady
        };

        this.contextKeywords = {
            // Emotional tone keywords
            sad: ['sad', 'sadness', 'melancholy', 'grief', 'sorrow', 'depressed', 'gloomy'],
            joyful: ['joy', 'joyful', 'happy', 'happiness', 'cheerful', 'elated', 'delighted', 'love', 'loving', 'loved', 'adore', 'adoring'],
            angry: ['angry', 'anger', 'rage', 'furious', 'outraged', 'livid', 'panic', 'anxious', 'terror'],
            dreamy: ['dream', 'dreaming', 'dreamy', 'floating', 'ethereal', 'hazy'],
            hopeful: ['hope', 'hopeful', 'bright', 'optimistic', 'liberated', 'free', 'affection', 'tenderness', 'romantic'],
            dark: ['dark', 'darkness', 'grim', 'sinister', 'ominous', 'shadowy', 'horror', 'horrific', 'horrif', 'terrifying'],
            mysterious: ['mystery', 'mysterious', 'cryptic', 'enigmatic', 'unclear'],
            calm: ['calm', 'peaceful', 'serene', 'quiet', 'tranquil', 'still'],
            intense: ['intense', 'intense', 'powerful', 'strong', 'extreme', 'harsh'],
            playful: ['playful', 'playful', 'lighthearted', 'fun', 'witty', 'cheeky']
        };

        // Offline lexical physics fallback used when external lexical sources are absent.
        this.fallbackWordPhysics = {};

        this.arcModifiers = {
            // Arc shape modifiers (look for these in text)
            rising: ['rising', 'ascending', 'climbing', 'building', 'growing'],
            falling: ['falling', 'descending', 'dropping', 'fading', 'weakening'],
            wave: ['wave', 'undulating', 'oscillating', 'back and forth'],
            peak: ['peak', 'climax', 'crescendo', 'at its peak'],
            valley: ['valley', 'bottom', 'lowest', 'depths']
        };

        this.wordDatabase = null;
        this.scaleIntelligence = null;
        this.scalePhysicsCache = null;
        this.defaultRoot = 'C';

        this.debug = false;
    }

    /**
     * Main entry point: Parse input sentence
     * @param {string} input - User input (sentence or phrase)
     * @param {Object} options - Optional parameters {timeSignature, performanceIntent, variationSeed}
     * @return {Object} Context profile with arc parameters
     */
    parseInput(input, options = {}) {
        if (!input || typeof input !== 'string') {
            return this._defaultContext();
        }

        const normalized = input.toLowerCase().trim();
        const lexicalHintBase = this._analyzeLexicalSemantics(input, normalized);
        const lexicalHint = this._applySeededLexicalVariation(lexicalHintBase, options.variationSeed);

        // Extract emotional tone
        const emotionalTone = this._detectEmotionalTone(normalized, lexicalHint);

        // Detect arc shape from keywords or default based on tone
        const arcShapeKey = this._detectArcShape(normalized, emotionalTone, lexicalHint);

        // Determine intensity from modifiers in text
        const intensity = this._calculateIntensity(normalized, emotionalTone, lexicalHint);

        // Detect or use provided time signature
        const timeSignature = options.timeSignature || this._detectTimeSignature(normalized, lexicalHint);

        // Detect or use provided performance intent
        const basePerformanceIntent = options.performanceIntent || this._detectPerformanceIntent(normalized, emotionalTone, lexicalHint);
        const performanceIntent = this._applySeededIntentVariation(basePerformanceIntent, emotionalTone, lexicalHint, options.variationSeed);

        // Detect vocalization style based on performance intent
        const baseVocalizationStyle = this._detectVocalizationStyle(normalized, performanceIntent, lexicalHint);
        const vocalizationStyle = this._applySeededVocalizationVariation(baseVocalizationStyle, performanceIntent, emotionalTone, lexicalHint, options.variationSeed);

        // Count syllables in input for timing awareness
        const syllableCount = this._estimateSyllables(input);

        // Calculate drag factor (embellishment tendency)
        const dragFactor = this._calculateDragFactor(normalized, performanceIntent, emotionalTone, lexicalHint);

        // Build harmonic profile informed by lexical + scale intelligence
        const harmonicProfile = this._buildHarmonicProfile(lexicalHint, emotionalTone, options);

        // Build context profile
        const profile = {
            originalInput: input,
            normalizedInput: normalized,
            emotionalTone: emotionalTone,
            arcShapeKey: arcShapeKey,
            arcShape: this.arcShapes[arcShapeKey],
            intensity: intensity,
            timeSignature: timeSignature,
            performanceIntent: performanceIntent,
            vocalizationStyle: vocalizationStyle,
            syllableCount: syllableCount,
            dragFactor: dragFactor,
            toneProfile: this.emotionalTones[emotionalTone],
            semanticTrajectory: {
                horizontalMotion: lexicalHint.horizontalMotion,
                verticalPressure: lexicalHint.verticalPressure,
                harmonicGravity: lexicalHint.harmonicGravity,
                valenceTrajectory: lexicalHint.valenceTrajectory
            },
            harmonicProfile: harmonicProfile,
            metadata: {
                engineSignature: 'ctx-20260413c',
                variationSeed: Number.isFinite(Number(options.variationSeed)) ? Math.floor(Number(options.variationSeed)) : null,
                wordCount: input.split(/\s+/).length,
                complexity: this._calculateComplexity(normalized, lexicalHint),
                lexical: {
                    avgValence: lexicalHint.avgValence,
                    avgArousal: lexicalHint.avgArousal,
                    avgDominance: lexicalHint.avgDominance,
                    polaritySpread: lexicalHint.polaritySpread,
                    categoryHints: lexicalHint.categoryHints,
                    semanticWeight: lexicalHint.semanticWeight,
                    perWordValues: lexicalHint.perWordValues || []
                }
            }
        };

        if (this.debug) {
            console.log('[ContextEngine] Parsed:', profile);
        }

        return profile;
    }

    _createSeededRng(seed) {
        let t = (Number(seed) >>> 0) + 0x6D2B79F5;
        return () => {
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    _buildToneScalePalette(tone) {
        const palettes = {
            sad: ['aeolian', 'dorian', 'harmonic_minor'],
            joyful: ['major', 'lydian', 'major_pentatonic', 'mixolydian'],
            angry: ['phrygian', 'phrygian_dominant', 'harmonic_minor'],
            dreamy: ['lydian', 'major', 'dorian'],
            hopeful: ['major_pentatonic', 'major', 'lydian', 'mixolydian'],
            dark: ['harmonic_minor', 'phrygian', 'aeolian', 'phrygian_dominant'],
            mysterious: ['dorian', 'phrygian', 'aeolian'],
            calm: ['major', 'lydian', 'major_pentatonic', 'dorian'],
            intense: ['phrygian_dominant', 'harmonic_minor', 'mixolydian'],
            playful: ['mixolydian', 'major', 'lydian', 'dorian']
        };
        return palettes[tone] || ['major', 'dorian', 'aeolian'];
    }

    _applySeededIntentVariation(baseIntent, emotionalTone, lexicalHint, variationSeed) {
        const seed = Number(variationSeed);
        if (!Number.isFinite(seed) || !lexicalHint) return baseIntent;

        const rng = this._createSeededRng((seed ^ 0x9e3779b1) >>> 0);
        const exploration = this._clamp(
            0.12 +
            (lexicalHint.semanticWeight || 0) * 0.22 +
            (lexicalHint.polaritySpread || 0) * 0.28 +
            Math.abs(lexicalHint.avgArousal || 0) * 0.14,
            0.1,
            0.52
        );

        if (rng() > exploration) return baseIntent;

        const pool = new Set([baseIntent || 'neutral']);
        const arousal = lexicalHint.avgArousal || 0;
        const valence = lexicalHint.avgValence || 0;

        if (arousal > 0.35) pool.add('energetic');
        if (arousal > 0.5 && valence < 0.15) pool.add('aggressive');
        if (arousal < 0.08) pool.add('tender');
        if (Math.abs(valence) > 0.35 || (lexicalHint.polaritySpread || 0) > 0.32) pool.add('dramatic');

        if (['joyful', 'hopeful', 'playful'].includes(emotionalTone)) {
            pool.add('whimsical');
            pool.add('energetic');
        }
        if (['dark', 'mysterious'].includes(emotionalTone)) {
            pool.add('dramatic');
            pool.add('tender');
        }
        if (['angry', 'intense'].includes(emotionalTone)) {
            pool.add('aggressive');
            pool.add('dramatic');
        }

        const choices = Array.from(pool);
        if (choices.length <= 1) return choices[0] || baseIntent;

        const idx = Math.floor(rng() * choices.length);
        return choices[idx] || baseIntent;
    }

    _applySeededVocalizationVariation(baseStyle, performanceIntent, emotionalTone, lexicalHint, variationSeed) {
        const seed = Number(variationSeed);
        if (!Number.isFinite(seed) || !lexicalHint) return baseStyle;

        const rng = this._createSeededRng((seed ^ 0x85ebca6b) >>> 0);
        const exploration = this._clamp(
            0.12 +
            (lexicalHint.semanticWeight || 0) * 0.2 +
            (lexicalHint.horizontalMotion || 0) * 0.18 +
            Math.abs(lexicalHint.avgArousal || 0) * 0.16,
            0.1,
            0.5
        );

        if (rng() > exploration) return baseStyle;

        const pool = new Set([baseStyle || 'legato']);

        if (performanceIntent === 'aggressive') {
            pool.add('dense');
            pool.add('staccato');
            pool.add('runs');
        }
        if (performanceIntent === 'energetic') {
            pool.add('dense');
            pool.add('runs');
            pool.add('staccato');
        }
        if (performanceIntent === 'tender') {
            pool.add('legato');
            pool.add('breathy');
            pool.add('sparse');
        }
        if (performanceIntent === 'whimsical') {
            pool.add('staccato');
            pool.add('runs');
        }
        if (performanceIntent === 'dramatic') {
            pool.add('runs');
            pool.add('dense');
            pool.add('legato');
        }

        if ((lexicalHint.horizontalMotion || 0) > 0.56) pool.add('runs');
        if ((lexicalHint.verticalPressure || 0) > 0.62) pool.add('dense');
        if ((lexicalHint.avgArousal || 0) < -0.12) pool.add('legato');
        if (['calm', 'dreamy', 'mysterious'].includes(emotionalTone)) pool.add('legato');

        const choices = Array.from(pool);
        if (choices.length <= 1) return choices[0] || baseStyle;

        const idx = Math.floor(rng() * choices.length);
        return choices[idx] || baseStyle;
    }

    _applySeededLexicalVariation(lexicalHint, variationSeed) {
        const seed = Number(variationSeed);
        if (!lexicalHint || !Number.isFinite(seed)) {
            return lexicalHint;
        }

        const rng = this._createSeededRng(seed);
        const nextSigned = () => (rng() - 0.5) * 2;

        const hint = {
            ...lexicalHint,
            categoryHints: Array.isArray(lexicalHint.categoryHints) ? [...lexicalHint.categoryHints] : []
        };

        const semanticWeight = this._clamp(hint.semanticWeight || 0, 0, 1);
        const spread = this._clamp(hint.polaritySpread || 0, 0, 1);
        const strength = this._clamp(0.2 + semanticWeight * 0.28 + spread * 0.24, 0.18, 0.62);

        const valenceShift = nextSigned() * strength * 0.82;
        const arousalShift = nextSigned() * strength * 1.0;
        const dominanceShift = nextSigned() * strength * 0.68;

        hint.avgValence = this._clamp((hint.avgValence || 0) + valenceShift, -1, 1);
        hint.avgArousal = this._clamp((hint.avgArousal || 0) + arousalShift, -1, 1);
        hint.avgDominance = this._clamp((hint.avgDominance || 0) + dominanceShift, -1, 1);

        hint.valenceTrajectory = this._clamp((hint.valenceTrajectory || 0) + (nextSigned() * strength * 0.95), -1, 1);
        hint.polaritySpread = this._clamp((hint.polaritySpread || 0) + Math.abs(nextSigned() * strength * 0.62), 0, 1);
        hint.semanticWeight = this._clamp((hint.semanticWeight || 0) + (nextSigned() * strength * 0.45), 0, 1);
        hint.horizontalMotion = this._clamp((hint.horizontalMotion || 0) + (nextSigned() * strength * 0.95), 0, 1);
        hint.verticalPressure = this._clamp((hint.verticalPressure || 0) + (nextSigned() * strength * 0.95), 0, 1);
        hint.harmonicGravity = this._clamp((hint.harmonicGravity || 0) + (nextSigned() * strength * 0.95), 0, 1);

        const tone = this._mapLexicalTone(hint) || this._mapLexicalTone(lexicalHint) || 'calm';
        const palette = this._buildToneScalePalette(tone);
        const scaleCandidates = [];
        if (hint.suggestedScale) scaleCandidates.push(String(hint.suggestedScale).toLowerCase().replace(/\s+/g, '_'));
        for (const candidate of palette) {
            if (!scaleCandidates.includes(candidate)) {
                scaleCandidates.push(candidate);
            }
        }

        if (scaleCandidates.length) {
            const selectedIndex = Math.floor(rng() * Math.min(scaleCandidates.length, 4));
            hint.suggestedScale = scaleCandidates[selectedIndex];
        }

        return hint;
    }

    /**
     * Detect emotional tone from keywords
     * @private
     */
    _detectEmotionalTone(normalized, lexicalHint = null) {
        const scores = {};
        Object.keys(this.contextKeywords).forEach((tone) => {
            scores[tone] = 0;
        });

        // Search for tone keywords and score instead of first-hit return.
        for (const [tone, keywords] of Object.entries(this.contextKeywords)) {
            for (const keyword of keywords) {
                if (normalized.includes(keyword)) {
                    scores[tone] += 2;
                }
            }
        }

        // Lexical VAD can push tone when explicit keywords are missing.
        const lexicalTone = this._mapLexicalTone(lexicalHint);
        if (lexicalTone && scores[lexicalTone] !== undefined) {
            scores[lexicalTone] += 1.5;
        }

        let bestTone = 'calm';
        let bestScore = -1;
        for (const [tone, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestTone = tone;
                bestScore = score;
            }
        }

        if (bestScore > 0) {
            return bestTone;
        }

        // Default based on common patterns
        if (normalized.includes('tomorrow') || normalized.includes('future')) {
            return 'hopeful';
        }
        if (normalized.includes('yesterday') || normalized.includes('past')) {
            return 'sad';
        }

        // Fallback
        return 'calm';
    }

    /**
     * Detect arc shape from keywords or default
     * @private
     */
    _detectArcShape(normalized, emotionalTone, lexicalHint = null) {
        // Look for explicit arc modifiers first
        for (const [shape, keywords] of Object.entries(this.arcModifiers)) {
            for (const keyword of keywords) {
                if (normalized.includes(keyword)) {
                    return shape;
                }
            }
        }

        if (lexicalHint) {
            if (lexicalHint.valenceTrajectory > 0.18) return 'rising';
            if (lexicalHint.valenceTrajectory < -0.18) return 'falling';
            if (lexicalHint.polaritySpread > 0.35) return 'wave';
            if (lexicalHint.verticalPressure > 0.72) return 'peak';
            if (lexicalHint.harmonicGravity > 0.7) return 'valley';
        }

        // Default arc based on emotional tone
        const toneArcDefaults = {
            sad: 'falling',
            joyful: 'rising',
            angry: 'peak',
            dreamy: 'wave',
            hopeful: 'rising',
            dark: 'valley',
            mysterious: 'wave',
            calm: 'flat',
            intense: 'peak',
            playful: 'wave'
        };

        return toneArcDefaults[emotionalTone] || 'rising';
    }

    /**
     * Calculate intensity based on modifiers and punctuation
     * @private
     */
    _calculateIntensity(normalized, emotionalTone, lexicalHint = null) {
        let intensity = 0.5; // Default baseline

        // Adjust based on tone
        intensity = this.emotionalTones[emotionalTone].energy;

        if (lexicalHint) {
            const lexicalEnergy = this._toUnitRange(lexicalHint.avgArousal);
            intensity = (intensity * 0.55) + (lexicalEnergy * 0.45);
            intensity += lexicalHint.polaritySpread * 0.08;
        }

        // Modifier boosts
        if (normalized.includes('really') || normalized.includes('so')) intensity += 0.15;
        if (normalized.includes('very')) intensity += 0.1;
        if (normalized.includes('extremely')) intensity += 0.2;
        if (normalized.includes('!')) intensity += 0.1;  // Exclamation marks

        // Modifier reductions
        if (normalized.includes('slightly') || normalized.includes('a bit')) intensity -= 0.1;
        if (normalized.includes('barely')) intensity -= 0.15;
        if (normalized.includes('faintly')) intensity -= 0.2;

        // Clamp between 0 and 1
        return Math.max(0, Math.min(1, intensity));
    }

    /**
     * Calculate text complexity (simple: word count ratio)
     * @private
     */
    _calculateComplexity(normalized, lexicalHint = null) {
        const words = normalized.split(/\s+/).length;
        let complexity = 0.2;

        // Single words are low complexity
        if (words === 1) complexity = 0.2;

        // 2-4 words: medium
        if (words > 1 && words <= 4) complexity = 0.5;

        // 5+ words: higher complexity
        if (words > 4) complexity = Math.min(1, 0.5 + (words - 4) * 0.1);

        const uniqueWords = new Set(normalized.split(/\s+/).filter(Boolean)).size;
        complexity += Math.min(0.15, (uniqueWords / Math.max(words, 1)) * 0.15);

        if (lexicalHint) {
            complexity += lexicalHint.polaritySpread * 0.15;
            complexity += lexicalHint.semanticWeight * 0.1;
        }

        return this._clamp(complexity, 0, 1);
    }

    /**
     * Default context when no input
     * @private
     */
    _defaultContext() {
        return {
            originalInput: '',
            emotionalTone: 'calm',
            arcShapeKey: 'rising',
            arcShape: this.arcShapes.rising,
            intensity: 0.5,
            timeSignature: '4/4',
            performanceIntent: 'neutral',
            vocalizationStyle: 'legato',
            syllableCount: 1,
            dragFactor: 0.3,
            toneProfile: this.emotionalTones.calm,
            semanticTrajectory: {
                horizontalMotion: 0.2,
                verticalPressure: 0.2,
                harmonicGravity: 0.5,
                valenceTrajectory: 0
            },
            harmonicProfile: {
                recommendedScale: 'major',
                approachScale: 'dorian',
                scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
                scaleSource: 'default',
                horizontalMotion: 0.2,
                verticalPressure: 0.2,
                harmonicComplexity: 0.2
            },
            metadata: {
                engineSignature: 'ctx-20260413c',
                wordCount: 0,
                complexity: 0,
                lexical: {
                    avgValence: 0,
                    avgArousal: 0,
                    avgDominance: 0,
                    polaritySpread: 0,
                    categoryHints: [],
                    semanticWeight: 0
                }
            }
        };
    }

    /**
     * Convert arc shape (normalized 0-1) to arc profile
     * Used by arc-generator.js
     * @param {string} shapeKey - Key from this.arcShapes
     * @param {number} normalizedShape - Normalized 0-1
     * @return {Array} Arc points ready for generation
     */
    normalizeArcShape(shapeKey, normalizedShape) {
        const shape = this.arcShapes[shapeKey];
        if (!shape) return this.arcShapes.rising;

        // Convert normalized curve points to arc profile
        // Shape is array of [x, y] where x is progress 0-1, y is energy 0-1
        return shape.map(([x, y]) => ({
            progress: x,
            energy: y * normalizedShape
        }));
    }

    /**
     * Validate that a context is well-formed
     * @param {Object} context - Context to validate
     * @return {boolean} True if valid
     */
    validateContext(context) {
        const required = ['emotionalTone', 'arcShapeKey', 'intensity', 'toneProfile'];
        for (const field of required) {
            if (!(field in context)) return false;
        }

        if (typeof context.intensity !== 'number' || context.intensity < 0 || context.intensity > 1) {
            return false;
        }

        if (!this.emotionalTones[context.emotionalTone]) {
            return false;
        }

        return true;
    }

    /**
     * Detect or infer time signature from input
     * Common signatures: 2/4, 3/4, 4/4, 6/8, 5/4, 7/8
     * @private
     */
    _detectTimeSignature(normalized, lexicalHint = null) {
        // Check for explicit time signature mentions
        const timeSigPatterns = ['2/4', '3/4', '4/4', '6/8', '5/4', '7/8', '12/8'];
        for (const sig of timeSigPatterns) {
            if (normalized.includes(sig)) return sig;
        }

        // Infer from word patterns
        const tripleKeywords = ['waltz', 'three', 'trio', 'trinity'];
        if (tripleKeywords.some(kw => normalized.includes(kw))) {
            return '3/4';
        }

        const complexKeywords = ['complex', 'intricate', 'odd', 'unusual'];
        if (complexKeywords.some(kw => normalized.includes(kw))) {
            return '5/4';
        }

        if (lexicalHint) {
            if (lexicalHint.horizontalMotion > 0.65 && lexicalHint.verticalPressure > 0.6) return '7/8';
            if (lexicalHint.horizontalMotion > 0.55) return '5/4';
            if (lexicalHint.avgArousal < -0.2) return '3/4';
            if (lexicalHint.avgArousal > 0.45) return '6/8';
        }

        // Default: 4/4 (most common)
        return '4/4';
    }

    /**
     * Detect or infer performance intent
     * Options: neutral, dramatic, whimsical, aggressive, tender, energetic
     * @private
     */
    _detectPerformanceIntent(normalized, emotionalTone, lexicalHint = null) {
        const intentKeywords = {
            dramatic: ['dramatic', 'drama', 'theatrical', 'expressive', 'grand', 'bold'],
            whimsical: ['whimsical', 'playful', 'quirky', 'eccentric', 'unpredictable', 'random'],
            aggressive: ['aggressive', 'attack', 'harsh', 'brutal', 'violence', 'fight'],
            tender: ['tender', 'delicate', 'fragile', 'soft', 'gentle', 'subtle'],
            energetic: ['energetic', 'driven', 'propulsive', 'momentum', 'forward']
        };

        // Check for explicit intent keywords
        for (const [intent, keywords] of Object.entries(intentKeywords)) {
            if (keywords.some(kw => normalized.includes(kw))) {
                return intent;
            }
        }

        if (lexicalHint) {
            if (lexicalHint.avgArousal > 0.35 && lexicalHint.avgValence < -0.12) return 'aggressive';
            if (lexicalHint.avgArousal > 0.35) return 'energetic';
            if (lexicalHint.avgArousal < -0.1 && lexicalHint.avgValence < 0.1) return 'tender';
            if (lexicalHint.polaritySpread > 0.22) return 'dramatic';
        }

        // Default based on emotional tone
        if (['angry', 'intense'].includes(emotionalTone)) return 'aggressive';
        if (['dreamy', 'mysterious', 'playful'].includes(emotionalTone)) return 'whimsical';
        if (['sad', 'calm', 'dark'].includes(emotionalTone)) return 'tender';
        if (['joyful', 'hopeful'].includes(emotionalTone)) return 'energetic';

        return 'neutral';
    }

    /**
     * Detect vocalization style
     * Options: staccato, legato, runs, sparse, dense, breathy
     * @private
     */
    _detectVocalizationStyle(normalized, performanceIntent, lexicalHint = null) {
        const styleKeywords = {
            staccato: ['staccato', 'short', 'sharp', 'crisp', 'punchy', 'articulated'],
            legato: ['legato', 'smooth', 'flowing', 'connected', 'sustained', 'held'],
            runs: ['runs', 'riffs', 'flourish', 'embellish', 'ornament', 'melisma'],
            sparse: ['sparse', 'minimal', 'simple', 'bare', 'quiet', 'restrained'],
            dense: ['dense', 'thick', 'complex', 'layered', 'full', 'rich'],
            breathy: ['breathy', 'whispered', 'soft', 'intimate', 'vulnerable']
        };

        // Check for explicit style keywords
        for (const [style, keywords] of Object.entries(styleKeywords)) {
            if (keywords.some(kw => normalized.includes(kw))) {
                return style;
            }
        }

        if (lexicalHint) {
            if (lexicalHint.horizontalMotion > 0.6) return 'runs';
            if (lexicalHint.verticalPressure > 0.68) return 'dense';
            if (lexicalHint.avgArousal < -0.2) return 'legato';
            if (lexicalHint.avgArousal > 0.45 && lexicalHint.avgDominance < 0) return 'staccato';
        }

        // Default based on performance intent
        if (performanceIntent === 'dramatic') return 'runs';
        if (performanceIntent === 'whimsical') return 'staccato';
        if (performanceIntent === 'aggressive') return 'dense';
        if (performanceIntent === 'tender') return 'legato';
        if (performanceIntent === 'energetic') return 'dense';

        return 'legato';
    }

    /**
     * Estimate syllable count from input
     * Uses simple vowel-based estimation
     * @private
     */
    _estimateSyllables(input) {
        // Simple vowel counting: each vowel cluster = 1 syllable
        const vowels = input.match(/[aeiouy]/gi) || [];

        // Rough estimate: vowel count ≈ syllable count
        // Account for diphthongs (ea, ou, etc.) by reducing slightly
        let estimate = Math.max(1, vowels.length);

        // Words ending in 'e' don't add syllable (usually)
        if (input.toLowerCase().endsWith('e') && estimate > 1) {
            estimate -= 0.5;
        }

        return Math.round(Math.max(1, estimate));
    }

    /**
     * Calculate drag factor (how much notes are extended/embellished)
     * Range: 0-1 where 0 = no extension, 1 = maximum extension
     * @private
     */
    _calculateDragFactor(normalized, performanceIntent, emotionalTone, lexicalHint = null) {
        let dragFactor = 0.3; // Default baseline

        // Performance intent affects drag
        if (performanceIntent === 'dramatic') dragFactor = 0.7;
        if (performanceIntent === 'whimsical') dragFactor = 0.5;
        if (performanceIntent === 'energetic') dragFactor = 0.2;
        if (performanceIntent === 'tender') dragFactor = 0.6;
        if (performanceIntent === 'aggressive') dragFactor = 0.1;

        // Emotional tone adjusts drag
        if (['sad', 'dreamy', 'mysterious'].includes(emotionalTone)) dragFactor += 0.1;
        if (['joyful', 'playful'].includes(emotionalTone)) dragFactor += 0.15;
        if (['calm'].includes(emotionalTone)) dragFactor += 0.2;

        // Keywords override
        if (normalized.includes('rush') || normalized.includes('quick')) dragFactor -= 0.15;
        if (normalized.includes('hold') || normalized.includes('sustain')) dragFactor += 0.25;
        if (normalized.includes('drag') || normalized.includes('extended')) dragFactor += 0.3;

        if (lexicalHint) {
            dragFactor += (0.5 - this._toUnitRange(lexicalHint.avgArousal)) * 0.2;
            dragFactor += lexicalHint.harmonicGravity * 0.12;
            dragFactor -= lexicalHint.horizontalMotion * 0.1;
        }

        return Math.max(0, Math.min(1, dragFactor));
    }

    _clamp(value, min = 0, max = 1) {
        return Math.max(min, Math.min(max, value));
    }

    _toUnitRange(value) {
        return this._clamp((value + 1) / 2, 0, 1);
    }

    _getWordDatabase() {
        if (this.wordDatabase) return this.wordDatabase;
        if (typeof WordDatabase !== 'undefined') {
            try {
                this.wordDatabase = new WordDatabase();
            } catch (err) {
                this.wordDatabase = null;
            }
        }
        return this.wordDatabase;
    }

    _getScaleIntelligence() {
        if (this.scaleIntelligence) return this.scaleIntelligence;
        if (typeof ScaleIntelligenceEngine !== 'undefined') {
            try {
                const theory = (typeof MusicTheoryEngine !== 'undefined') ? new MusicTheoryEngine() : null;
                this.scaleIntelligence = new ScaleIntelligenceEngine(theory);
            } catch (err) {
                this.scaleIntelligence = null;
            }
        }
        return this.scaleIntelligence;
    }

    _getScaleIntervalsMap() {
        if (typeof window === 'undefined') return null;

        if (window.SCALES && window.SCALES.intervals) {
            return window.SCALES.intervals;
        }

        if (window.EMBEDDED_SCALES_DATA && Array.isArray(window.EMBEDDED_SCALES_DATA.scales)) {
            const map = {};
            window.EMBEDDED_SCALES_DATA.scales.forEach((scale) => {
                if (!scale || !scale.id || !Array.isArray(scale.intervals)) return;
                map[String(scale.id).toLowerCase()] = scale.intervals.slice();
            });
            return map;
        }

        return null;
    }

    _normalizeIntervals(intervals) {
        if (!Array.isArray(intervals) || !intervals.length) return [0, 2, 4, 5, 7, 9, 11];
        const set = new Set();
        for (const value of intervals) {
            const n = ((Number(value) % 12) + 12) % 12;
            if (Number.isFinite(n)) set.add(n);
        }
        if (!set.has(0)) set.add(0);
        return Array.from(set).sort((a, b) => a - b);
    }

    _extractScalePhysics(intervals) {
        const ints = this._normalizeIntervals(intervals);
        const set = new Set(ints);
        const has = (semi) => set.has(semi) ? 1 : 0;

        const steps = [];
        for (let i = 0; i < ints.length; i++) {
            const current = ints[i];
            const next = i === ints.length - 1 ? ints[0] + 12 : ints[i + 1];
            steps.push(next - current);
        }

        const semitoneDensity = steps.filter((n) => n === 1).length / Math.max(1, steps.length);
        const leapDensity = steps.filter((n) => n >= 3).length / Math.max(1, steps.length);

        const hasb2 = has(1);
        const hasb3 = has(3);
        const has3 = has(4);
        const hasSharp4 = has(6);
        const hasb6 = has(8);
        const has6 = has(9);
        const hasb7 = has(10);
        const has7 = has(11);
        const alteredCount = hasb2 + hasb3 + hasSharp4 + hasb6 + hasb7 + has7;

        const darkness = this._clamp(
            hasb2 * 0.18 + hasb3 * 0.26 + hasb6 * 0.26 + hasb7 * 0.12 + (1 - has3) * 0.12 + semitoneDensity * 0.2,
            0,
            1
        );
        const brightness = this._clamp(
            has3 * 0.28 + has6 * 0.2 + has7 * 0.22 + hasSharp4 * 0.18 + (1 - hasb6) * 0.06 + (1 - hasb3) * 0.06,
            0,
            1
        );
        const pull = this._clamp(has7 * 0.55 + hasb2 * 0.3 + semitoneDensity * 0.25, 0, 1);
        const release = this._clamp(hasb7 * 0.62 + has6 * 0.2 + leapDensity * 0.16, 0, 1);
        const expansion = this._clamp(hasSharp4 * 0.62 + has6 * 0.22 + leapDensity * 0.12, 0, 1);
        const shadow = this._clamp(hasb6 * 0.62 + hasb3 * 0.22 + hasb2 * 0.12 + semitoneDensity * 0.1, 0, 1);
        const stability = this._clamp(has3 * 0.25 + has6 * 0.16 + (1 - semitoneDensity) * 0.3 + (1 - leapDensity) * 0.14 + (1 - (alteredCount / 7)) * 0.2, 0, 1);
        const complexity = this._clamp((ints.length / 12) * 0.35 + semitoneDensity * 0.35 + leapDensity * 0.15 + (alteredCount / 7) * 0.15, 0, 1);

        return {
            noteCount: ints.length,
            intervals: ints,
            hasb2,
            hasb3,
            has3,
            hasSharp4,
            hasb6,
            has6,
            hasb7,
            has7,
            semitoneDensity,
            leapDensity,
            darkness,
            brightness,
            pull,
            release,
            expansion,
            shadow,
            stability,
            complexity
        };
    }

    _buildScalePhysicsCache() {
        const intervalsMap = this._getScaleIntervalsMap();
        if (!intervalsMap) {
            this.scalePhysicsCache = null;
            return null;
        }

        if (this.scalePhysicsCache && this.scalePhysicsCache.sourceRef === intervalsMap) {
            return this.scalePhysicsCache;
        }

        const entries = [];
        for (const [name, intervals] of Object.entries(intervalsMap)) {
            if (!Array.isArray(intervals) || !intervals.length) continue;
            entries.push({
                name: String(name).toLowerCase(),
                physics: this._extractScalePhysics(intervals)
            });
        }

        this.scalePhysicsCache = {
            sourceRef: intervalsMap,
            entries
        };

        return this.scalePhysicsCache;
    }

    _buildScalePhysicsTarget(lexicalHint, emotionalTone) {
        const valence = lexicalHint.avgValence || 0;
        const arousal = lexicalHint.avgArousal || 0;
        const valenceUnit = this._toUnitRange(valence);
        const arousalMag = Math.abs(arousal);

        let darkness = this._clamp((1 - valenceUnit) * 0.64 + lexicalHint.harmonicGravity * 0.24 + lexicalHint.verticalPressure * 0.14, 0, 1);
        let brightness = this._clamp(valenceUnit * 0.62 + (1 - lexicalHint.harmonicGravity) * 0.2 + Math.max(0, arousal) * 0.2, 0, 1);
        let pull = this._clamp(lexicalHint.verticalPressure * 0.46 + lexicalHint.harmonicGravity * 0.24 + arousalMag * 0.22, 0, 1);
        let release = this._clamp(lexicalHint.horizontalMotion * 0.44 + Math.max(0, valence) * 0.32 + (1 - lexicalHint.verticalPressure) * 0.2, 0, 1);
        let expansion = this._clamp(lexicalHint.horizontalMotion * 0.34 + lexicalHint.semanticWeight * 0.32 + Math.max(0, valence) * 0.2 + lexicalHint.polaritySpread * 0.14, 0, 1);
        let shadow = this._clamp((1 - valenceUnit) * 0.48 + lexicalHint.harmonicGravity * 0.36 + lexicalHint.polaritySpread * 0.18, 0, 1);
        let stability = this._clamp((1 - lexicalHint.verticalPressure) * 0.42 + (1 - lexicalHint.polaritySpread) * 0.3 + (1 - arousalMag) * 0.22, 0, 1);
        let complexity = this._clamp(lexicalHint.semanticWeight * 0.56 + lexicalHint.polaritySpread * 0.24 + lexicalHint.horizontalMotion * 0.2, 0, 1);

        if (emotionalTone === 'dark' || emotionalTone === 'sad') {
            darkness = this._clamp(darkness + 0.08, 0, 1);
            shadow = this._clamp(shadow + 0.1, 0, 1);
        }
        if (emotionalTone === 'joyful' || emotionalTone === 'hopeful' || emotionalTone === 'playful') {
            brightness = this._clamp(brightness + 0.08, 0, 1);
            release = this._clamp(release + 0.06, 0, 1);
        }
        if (emotionalTone === 'mysterious') {
            pull = this._clamp(pull + 0.08, 0, 1);
            expansion = this._clamp(expansion + 0.08, 0, 1);
            complexity = this._clamp(complexity + 0.08, 0, 1);
        }

        return {
            darkness,
            brightness,
            pull,
            release,
            expansion,
            shadow,
            stability,
            complexity
        };
    }

    _scoreScalePhysics(target, scalePhysics, lexicalHint, scaleName = '') {
        const w = {
            darkness: 0.2,
            brightness: 0.17,
            pull: 0.14,
            release: 0.14,
            expansion: 0.11,
            shadow: 0.11,
            stability: 0.08,
            complexity: 0.05
        };

        let diff = 0;
        let weightSum = 0;
        for (const [axis, weight] of Object.entries(w)) {
            weightSum += weight;
            diff += Math.abs((target[axis] || 0) - (scalePhysics[axis] || 0)) * weight;
        }

        let score = this._clamp(1 - (diff / Math.max(0.0001, weightSum)), 0, 1);

        // Explicit interval-physics coupling for alterations (b7, b6, #4, etc).
        if (target.release > 0.55) score += scalePhysics.hasb7 ? 0.07 : -0.03;
        if (target.shadow > 0.55) score += scalePhysics.hasb6 ? 0.07 : -0.03;
        if (target.expansion > 0.55) score += scalePhysics.hasSharp4 ? 0.06 : -0.02;
        if (target.pull > 0.55) score += (scalePhysics.has7 || scalePhysics.hasb2) ? 0.06 : -0.02;
        if (target.darkness > 0.55) score += (scalePhysics.hasb3 || scalePhysics.hasb2) ? 0.06 : -0.02;
        if (target.brightness > 0.55) score += (scalePhysics.has3 || scalePhysics.has6) ? 0.06 : -0.03;

        const desiredNotes = 5 + Math.round(target.complexity * 4);
        const noteCountPenalty = Math.abs(scalePhysics.noteCount - desiredNotes) * 0.012;
        score -= noteCountPenalty;

        if (lexicalHint && lexicalHint.suggestedScale) {
            const suggested = String(lexicalHint.suggestedScale).toLowerCase().replace(/\s+/g, '_');
            if (suggested && suggested === String(scaleName).toLowerCase()) {
                score += 0.03;
            }
        }

        return this._clamp(score, 0, 1);
    }

    _selectScaleByIntervalPhysics(lexicalHint, emotionalTone) {
        const cache = this._buildScalePhysicsCache();
        if (!cache || !Array.isArray(cache.entries) || !cache.entries.length) {
            return null;
        }

        const target = this._buildScalePhysicsTarget(lexicalHint, emotionalTone);
        const scored = cache.entries.map((entry) => {
            const score = this._scoreScalePhysics(target, entry.physics, lexicalHint, entry.name);
            return {
                name: entry.name,
                score,
                physics: entry.physics
            };
        }).sort((a, b) => b.score - a.score);

        const recommendedScale = scored[0] ? scored[0].name : null;
        const selectedPhysics = scored[0] ? scored[0].physics : null;
        const alternatives = scored
            .slice(1, 6)
            .map((item) => item.name)
            .filter(Boolean);

        return {
            recommendedScale,
            alternatives,
            score: scored[0] ? scored[0].score : 0,
            selectedPhysics,
            target
        };
    }

    _tokenizeWords(normalized) {
        return normalized
            .split(/[^a-z0-9#b]+/)
            .map((w) => w.trim())
            .filter(Boolean);
    }

    _isNeutralEmotion(emotion) {
        if (!emotion) return true;
        const val = Math.abs(emotion.valence || 0);
        const aro = Math.abs(emotion.arousal || 0);
        const dom = Math.abs(emotion.dominance || 0);
        return (val < 0.2 && aro < 0.2 && dom < 0.2) || ((val + aro + dom) < 0.38);
    }

    _fallbackLexicalEmotion(word) {
        const token = String(word || '').toLowerCase();
        if (!token) return null;

        if (this.fallbackWordPhysics[token]) {
            return this.fallbackWordPhysics[token];
        }

        // Stem and morphology fallback for unseen words.
        for (const [stem, profile] of Object.entries(this.fallbackWordPhysics)) {
            if (token.startsWith(stem) && stem.length >= 4) {
                return profile;
            }
        }

        let valence = 0;
        let arousal = 0;
        let dominance = 0;
        let matched = false;

        if (/^(un|dis|mis|anti|de)/.test(token)) {
            valence -= 0.2;
            dominance -= 0.1;
            matched = true;
        }

        if (/(ing|rush|dash|burst|strike|crash)$/.test(token)) {
            arousal += 0.45;
            dominance += 0.15;
            matched = true;
        }

        if (/(horr|terror|panic|dread|grim|void|abyss)/.test(token)) {
            valence -= 0.35;
            arousal += 0.35;
            dominance -= 0.1;
            matched = true;
        }

        if (/(less|void|empty|alone|silent)$/.test(token)) {
            valence -= 0.25;
            arousal -= 0.15;
            matched = true;
        }

        if (/(bright|light|sun|gold|hope|glow)$/.test(token)) {
            valence += 0.25;
            arousal += 0.15;
            matched = true;
        }

        if (!matched) return this._deriveWordFormEmotion(token);

        return {
            valence: this._clamp(valence, -1, 1),
            arousal: this._clamp(arousal, -1, 1),
            dominance: this._clamp(dominance, -1, 1),
            category: 'fallback',
            scale: null
        };
    }

    _deriveWordFormEmotion(token) {
        if (!token) return null;

        // Deterministic word-form profile so unseen words still move context meaningfully.
        let hash = 2166136261;
        for (let i = 0; i < token.length; i++) {
            hash ^= token.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        hash >>>= 0;

        const len = token.length;
        const vowels = (token.match(/[aeiouy]/g) || []).length;
        const hardConsonants = (token.match(/[kgtdpbxqcz]/g) || []).length;
        const softConsonants = (token.match(/[lmnrsvfhwy]/g) || []).length;
        const vowelRatio = vowels / Math.max(1, len);
        const hardRatio = hardConsonants / Math.max(1, len);
        const softRatio = softConsonants / Math.max(1, len);

        const h1 = (hash % 1000) / 1000;
        const h2 = ((hash >>> 10) % 1000) / 1000;
        const h3 = ((hash >>> 20) % 1000) / 1000;

        let valence = (vowelRatio - 0.36) * 1.15 + (softRatio - hardRatio) * 0.65 + ((h1 - 0.5) * 0.28);
        let arousal = (hardRatio * 0.95) + (len > 7 ? 0.05 : 0) + ((h2 - 0.5) * 0.45) - 0.35;
        let dominance = ((len - 6) / 10) + (hardRatio * 0.4) + ((h3 - 0.5) * 0.35);

        valence = this._clamp(valence, -1, 1);
        arousal = this._clamp(arousal, -1, 1);
        dominance = this._clamp(dominance, -1, 1);

        // Prevent collapse to flat-neutral for arbitrary words.
        if (Math.abs(valence) < 0.14 && Math.abs(arousal) < 0.14 && Math.abs(dominance) < 0.14) {
            valence = h1 > 0.5 ? 0.24 : -0.24;
            arousal = (h2 - 0.5) * 0.36;
            dominance = (h3 - 0.5) * 0.3;
        }

        let scale = 'major';
        if (arousal > 0.55 && valence < -0.15) scale = 'phrygian_dominant';
        else if (valence < -0.3) scale = 'harmonic_minor';
        else if (valence > 0.4 && arousal < 0.2) scale = 'major_pentatonic';
        else if (valence > 0.2) scale = 'major';
        else if (arousal > 0.45) scale = 'mixolydian';
        else if (valence < 0) scale = 'dorian';
        else scale = 'lydian';

        return {
            valence,
            arousal,
            dominance,
            category: 'form-derived',
            scale
        };
    }

    /**
     * Uses compromise.js (loaded as window.nlp) to detect:
     *   - POS tags (adjectives weighted 1.5×, verbs 1.2×, nouns 1.0×, other 0.7×)
     *   - Negation ("not happy" → flip valence direction)
     *   - Intensification ("very sad" → amplify)
     * Returns a map of { word → { weight, negated, intensified } }
     */
    _analyzeWithCompromise(text) {
        if (typeof nlp === 'undefined') return {};
        try {
            const doc = nlp(text);
            const result = {};

            // Build POS weight map
            const adjSet  = new Set(doc.adjectives().out('array').map(w => w.toLowerCase()));
            const verbSet  = new Set(doc.verbs().out('array').map(w => w.toLowerCase()));
            const nounSet  = new Set(doc.nouns().out('array').map(w => w.toLowerCase()));
            const allTerms = doc.terms().out('array').map(w => w.toLowerCase());

            for (const w of allTerms) {
                if (!result[w]) result[w] = { weight: 0.8, negated: false, intensified: false };
                if (adjSet.has(w))       result[w].weight = 1.5;
                else if (verbSet.has(w)) result[w].weight = 1.2;
                else if (nounSet.has(w)) result[w].weight = 1.0;
            }

            // Negation: words immediately following a negation marker get negated flag
            const negMarkers = new Set(['not', 'never', 'no', "n't", 'without', 'barely', 'hardly', 'nothing', 'nor']);
            for (let i = 0; i < allTerms.length - 1; i++) {
                if (negMarkers.has(allTerms[i])) {
                    const next = allTerms[i + 1];
                    if (result[next]) result[next].negated = true;
                    // Also negate two positions out for "not very X"
                    if (i + 2 < allTerms.length) {
                        const skip = allTerms[i + 2];
                        if (result[skip] && (adjSet.has(skip) || verbSet.has(skip))) {
                            result[skip].negated = true;
                        }
                    }
                }
            }

            // Intensification: words immediately following an intensifier get amplified
            const intensifiers = new Set(['very', 'extremely', 'so', 'deeply', 'truly', 'absolutely',
                                          'really', 'incredibly', 'profoundly', 'utterly', 'terribly',
                                          'awfully', 'immensely', 'overwhelmingly', 'intensely']);
            for (let i = 0; i < allTerms.length - 1; i++) {
                if (intensifiers.has(allTerms[i])) {
                    const next = allTerms[i + 1];
                    if (result[next]) result[next].intensified = true;
                }
            }

            return result;
        } catch (e) {
            return {};
        }
    }

    _analyzeLexicalSemantics(input, normalized) {
        const words = this._tokenizeWords(normalized);
        if (!words.length) {
            return {
                words: [],
                avgValence: 0,
                avgArousal: 0,
                avgDominance: 0,
                valenceTrajectory: 0,
                polaritySpread: 0,
                semanticWeight: 0,
                horizontalMotion: 0.2,
                verticalPressure: 0.2,
                harmonicGravity: 0.5,
                categoryHints: [],
                suggestedScale: null
            };
        }

        // Compromise pass: POS weights, negation, intensification
        const compMeta = this._analyzeWithCompromise(input);

        const db = this._getWordDatabase();
        const values = [];
        const categories = {};
        let suggestedScale = null;

        for (const word of words) {
            let emotion = { valence: 0, arousal: 0, dominance: 0 };
            const hasDirectLexiconEntry = !!(db && db.emotions && db.emotions[word]);

            if (db && typeof db.getEmotionalValence === 'function') {
                emotion = db.getEmotionalValence(word) || emotion;
            }

            const fallback = this._fallbackLexicalEmotion(word);
            if (((this._isNeutralEmotion(emotion) || !hasDirectLexiconEntry) || !db) && fallback) {
                emotion = {
                    valence:   fallback.valence   || 0,
                    arousal:   fallback.arousal   || 0,
                    dominance: fallback.dominance || 0
                };
            }

            // Apply compromise modifiers
            const meta = compMeta[word] || {};
            if (meta.negated) {
                // "not happy" → reverse valence, dampen arousal
                emotion = { ...emotion, valence: emotion.valence * -0.8, arousal: emotion.arousal * 0.75 };
            }
            if (meta.intensified) {
                // "very sad" → amplify magnitude (clamped to ±1)
                const clamp = x => Math.max(-1, Math.min(1, x));
                emotion = { ...emotion, valence: clamp(emotion.valence * 1.45), arousal: clamp(emotion.arousal * 1.35) };
            }
            emotion._weight = meta.weight !== undefined ? meta.weight : 1.0;

            values.push(emotion);

            let category = null;
            if (db && typeof db.getSemanticCategory === 'function') {
                category = db.getSemanticCategory(word);
                if (category && category.name) {
                    categories[category.name] = (categories[category.name] || 0) + 1;
                    if (!suggestedScale && category.name !== 'other' && Array.isArray(category.scales) && category.scales.length) {
                        suggestedScale = category.scales[0];
                    }
                }
            }

            if (fallback && fallback.category) {
                categories[fallback.category] = (categories[fallback.category] || 0) + 1;
            }

            if ((!suggestedScale || (category && category.name === 'other' && suggestedScale === 'major')) && fallback && fallback.scale) {
                suggestedScale = fallback.scale;
            }
        }

        const count = values.length;
        // POS-weighted averages: adjectives and verbs carry more emotional weight
        const totalWeight  = values.reduce((s, v) => s + (v._weight || 1), 0) || count;
        const avgValence   = values.reduce((s, v) => s + (v.valence   || 0) * (v._weight || 1), 0) / totalWeight;
        const avgArousal   = values.reduce((s, v) => s + (v.arousal   || 0) * (v._weight || 1), 0) / totalWeight;
        const avgDominance = values.reduce((s, v) => s + (v.dominance || 0) * (v._weight || 1), 0) / totalWeight;

        const firstValence = values[0].valence || 0;
        const lastValence = values[count - 1].valence || 0;
        const valenceTrajectory = this._clamp(lastValence - firstValence, -1, 1);

        const polaritySpread = values.reduce((sum, v) => {
            return sum + Math.abs((v.valence || 0) - avgValence);
        }, 0) / count;

        const categoryHints = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);

        if (!suggestedScale && db && typeof db.getSemanticCategory === 'function') {
            const firstCategory = db.getSemanticCategory(words[0]);
            if (firstCategory && firstCategory.name !== 'other' && Array.isArray(firstCategory.scales) && firstCategory.scales.length) {
                suggestedScale = firstCategory.scales[0];
            }
        }

        if (!suggestedScale) {
            const lexicalTone = this._mapLexicalTone({ avgValence, avgArousal });
            if (lexicalTone) {
                suggestedScale = this._toneToScale(lexicalTone);
            }
        }

        const categoryDiversity = Object.keys(categories).length / 6;
        const semanticWeight = this._clamp(
            0.2 +
            (Math.min(words.length, 8) * 0.06) +
            (Math.abs(avgValence) * 0.15) +
            (Math.abs(avgArousal) * 0.2) +
            (polaritySpread * 0.35) +
            (categoryDiversity * 0.15),
            0,
            1
        );

        const horizontalMotion = this._clamp(
            (Math.abs(valenceTrajectory) * 0.7) +
            (polaritySpread * 0.5) +
            (Math.abs(avgArousal) * 0.2),
            0,
            1
        );

        const verticalPressure = this._clamp(
            (Math.abs(avgArousal) * 0.6) +
            (Math.abs(avgDominance) * 0.3) +
            (categoryDiversity * 0.2),
            0,
            1
        );

        const harmonicGravity = this._clamp(
            (1 - this._toUnitRange(avgValence)) * 0.7 +
            (verticalPressure * 0.3),
            0,
            1
        );

        // Build per-word array so WordSheetGenerator can access individual word VAD
        const perWordValues = words.map((word, i) => ({
            word,
            valence:   (values[i] && Number.isFinite(values[i].valence))   ? values[i].valence   : 0,
            arousal:   (values[i] && Number.isFinite(values[i].arousal))   ? values[i].arousal   : 0,
            dominance: (values[i] && Number.isFinite(values[i].dominance)) ? values[i].dominance : 0
        }));

        return {
            words,
            perWordValues,
            avgValence,
            avgArousal,
            avgDominance,
            valenceTrajectory,
            polaritySpread,
            semanticWeight,
            horizontalMotion,
            verticalPressure,
            harmonicGravity,
            categoryHints,
            suggestedScale
        };
    }

    _mapLexicalTone(lexicalHint) {
        if (!lexicalHint) return null;

        const valence = lexicalHint.avgValence;
        const arousal = lexicalHint.avgArousal;

        if (arousal > 0.45 && valence < -0.2) return 'angry';
        if (arousal > 0.35 && valence > 0.35) return 'joyful';
        if (valence < -0.35 && arousal >= -0.1) return 'dark';
        if (valence < -0.2 && arousal < 0.05) return 'sad';
        if (Math.abs(valence) < 0.2 && arousal > 0.2) return 'mysterious';
        if (valence > 0.3 && arousal < 0.35) return 'hopeful';
        if (arousal < -0.15) return 'calm';
        if (arousal > 0.35) return 'intense';
        if (valence > 0.15) return 'playful';
        if (valence < -0.15) return 'dark';

        return null;
    }

    _toneToScale(emotionalTone) {
        const defaults = {
            sad: 'aeolian',
            joyful: 'major',
            angry: 'phrygian',
            dreamy: 'lydian',
            hopeful: 'major_pentatonic',
            dark: 'harmonic_minor',
            mysterious: 'dorian',
            calm: 'major',
            intense: 'phrygian_dominant',
            playful: 'mixolydian'
        };
        return defaults[emotionalTone] || 'major';
    }

    _deriveApproachScale(recommendedScale, emotionalTone, lexicalHint) {
        const normalized = String(recommendedScale || '').toLowerCase();
        const lateralMotion = lexicalHint && lexicalHint.horizontalMotion ? lexicalHint.horizontalMotion : 0;
        const pressure = lexicalHint && lexicalHint.verticalPressure ? lexicalHint.verticalPressure : 0;

        const map = {
            major: lateralMotion > 0.45 ? 'mixolydian' : 'lydian',
            ionian: lateralMotion > 0.45 ? 'mixolydian' : 'lydian',
            aeolian: pressure > 0.55 ? 'harmonic_minor' : 'dorian',
            minor: pressure > 0.55 ? 'harmonic_minor' : 'dorian',
            dorian: pressure > 0.6 ? 'phrygian' : 'aeolian',
            phrygian: pressure > 0.65 ? 'phrygian_dominant' : 'aeolian',
            lydian: lateralMotion > 0.45 ? 'mixolydian' : 'major',
            mixolydian: pressure > 0.45 ? 'dorian' : 'major',
            harmonic_minor: pressure > 0.55 ? 'phrygian_dominant' : 'aeolian',
            phrygian_dominant: pressure > 0.55 ? 'harmonic_minor' : 'phrygian',
            major_pentatonic: 'major'
        };

        let approach = map[normalized] || this._toneToScale(emotionalTone);
        if (approach === normalized) {
            approach = emotionalTone === 'joyful' ? 'mixolydian' : (emotionalTone === 'dark' ? 'phrygian' : 'dorian');
        }
        return approach;
    }

    _resolveScaleNotes(scaleName, root = 'C') {
        const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const rootIndex = Math.max(0, chromatic.indexOf(root));
        const normalizedName = String(scaleName || '').toLowerCase().replace(/\s+/g, '_');
        let intervals = null;

        if (typeof window !== 'undefined' && window.EMBEDDED_SCALES_DATA && Array.isArray(window.EMBEDDED_SCALES_DATA.scales)) {
            const match = window.EMBEDDED_SCALES_DATA.scales.find((scale) => {
                if (!scale) return false;
                const byId = String(scale.id || '').toLowerCase() === normalizedName;
                const byName = String(scale.name || '').toLowerCase().replace(/\s+/g, '_') === normalizedName;
                return byId || byName;
            });
            if (match && Array.isArray(match.intervals) && match.intervals.length) {
                intervals = match.intervals;
            }
        }

        // Try the main SCALES database (centralized logic) if EMBEDDED_SCALES_DATA lookup failed
        if (!intervals && typeof window !== 'undefined' && window.SCALES && window.SCALES.intervals) {
            if (window.SCALES.intervals[normalizedName]) {
                intervals = window.SCALES.intervals[normalizedName];
            } else {
                // Try fuzzy match for aliases
                const aliasMatch = Object.keys(window.SCALES.intervals).find(k => k.replace(/_/g, '') === normalizedName.replace(/_/g, ''));
                if (aliasMatch) intervals = window.SCALES.intervals[aliasMatch];
            }
        }

        if (!intervals) {
            const fallbackIntervals = {
                major: [0, 2, 4, 5, 7, 9, 11],
                ionian: [0, 2, 4, 5, 7, 9, 11],
                aeolian: [0, 2, 3, 5, 7, 8, 10],
                minor: [0, 2, 3, 5, 7, 8, 10],
                dorian: [0, 2, 3, 5, 7, 9, 10],
                phrygian: [0, 1, 3, 5, 7, 8, 10],
                lydian: [0, 2, 4, 6, 7, 9, 11],
                mixolydian: [0, 2, 4, 5, 7, 9, 10],
                locrian: [0, 1, 3, 5, 6, 8, 10],
                harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
                major_pentatonic: [0, 2, 4, 7, 9],
                phrygian_dominant: [0, 1, 4, 5, 7, 8, 10]
            };
            intervals = fallbackIntervals[normalizedName] || fallbackIntervals.major;
        }

        return intervals.map((interval) => chromatic[(rootIndex + interval) % 12]);
    }

    _buildHarmonicProfile(lexicalHint, emotionalTone, options = {}) {
        const root = (options && options.root) ? String(options.root) : this.defaultRoot;

        let recommendedScale = lexicalHint.suggestedScale || this._toneToScale(emotionalTone);
        let scaleSource = lexicalHint.suggestedScale ? 'word-database' : 'tone-default';
        let alternatives = [];
        let physicsScore = 0;
        let intervalPhysics = null;

        const physicsSelection = this._selectScaleByIntervalPhysics(lexicalHint, emotionalTone);
        if (physicsSelection && physicsSelection.recommendedScale) {
            recommendedScale = physicsSelection.recommendedScale;
            alternatives = physicsSelection.alternatives || [];
            scaleSource = 'interval-physics-all-scales';
            physicsScore = physicsSelection.score || 0;
            intervalPhysics = physicsSelection.selectedPhysics || null;
        }

        if (scaleSource !== 'interval-physics-all-scales') {
            const intelligence = this._getScaleIntelligence();
            if (intelligence && typeof intelligence.selectScale === 'function') {
                const perspective = lexicalHint.avgValence < -0.15
                    ? 'MINOR_PHYSICS'
                    : (lexicalHint.semanticWeight > 0.68 ? 'CHROMATIC_ABSTRACTION' : 'MAJOR_PHYSICS');

                const discovery = intelligence.selectScale(
                    {
                        weight: lexicalHint.semanticWeight,
                        stability: lexicalHint.verticalPressure > 0.62 ? 'UNSTABLE' : 'STABLE'
                    },
                    {
                        valence: lexicalHint.avgValence,
                        arousal: lexicalHint.avgArousal,
                        perspective
                    }
                );

                if (discovery && discovery.name) {
                    recommendedScale = String(discovery.name).toLowerCase().replace(/\s+/g, '_');
                    scaleSource = 'scale-intelligence';
                }

                if (discovery && Array.isArray(discovery.alternatives)) {
                    alternatives = discovery.alternatives
                        .slice(0, 4)
                        .map((item) => String(item.name || '').toLowerCase().replace(/\s+/g, '_'))
                        .filter(Boolean);
                }
            }
        }

        const approachScale = alternatives.find((name) => name !== recommendedScale)
            || this._deriveApproachScale(recommendedScale, emotionalTone, lexicalHint);
        const scaleNotes = this._resolveScaleNotes(recommendedScale, root);

        return {
            root,
            recommendedScale,
            approachScale,
            alternatives,
            scaleNotes,
            scaleSource,
            physicsScore,
            intervalPhysics,
            horizontalMotion: lexicalHint.horizontalMotion,
            verticalPressure: lexicalHint.verticalPressure,
            harmonicComplexity: this._clamp(0.3 + (lexicalHint.semanticWeight * 0.45) + (lexicalHint.polaritySpread * 0.2), 0, 1)
        };
    }

}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContextEngine;
}
