/**
 * @module SimpleWordEngine
 * @description Direct, simple word-to-music translation that actually works
 * 
 * PHILOSOPHY:
 * - Words should directly affect key selection
 * - Words should affect how diatonic chords relate to the meaning
 * - Simple, predictable, musical results
 * - No complex attribute blending - direct semantic mapping
 */

class SimpleWordEngine {
    constructor(musicTheoryEngine) {
        this.musicTheory = musicTheoryEngine;
        this.debug = true;
        
        // Initialize Scale Intelligence Engine for robust scale selection
        try {
            if (typeof ScaleIntelligenceEngine === 'undefined') {
                console.error('[SimpleWordEngine] ScaleIntelligenceEngine not available - falling back to simple selection');
                this.scaleIntelligence = null;
            } else {
                this.scaleIntelligence = new ScaleIntelligenceEngine();
                console.log('[SimpleWordEngine] Scale Intelligence Engine initialized successfully');
            }
        } catch (error) {
            console.error('[SimpleWordEngine] Failed to initialize Scale Intelligence Engine:', error);
            this.scaleIntelligence = null;
        }
        
        // Simple word-to-musical-quality mappings (fallback)
        this.wordMappings = this._buildWordMappings();
        
        // Session log
        this.sessionLog = [];
        
        // Enhanced grading integration
        this.gradingEngine = musicTheoryEngine; // Use music theory engine for grading
        this.currentGradingMode = musicTheoryEngine?.gradingMode || 'functional';
        
        // Subscribe to grading mode changes
        if (musicTheoryEngine && typeof musicTheoryEngine.subscribe === 'function') {
            musicTheoryEngine.subscribe((event, data) => {
                if (event === 'gradingModeChanged') {
                    this.onGradingModeChanged(data.newMode);
                }
            });
        }
        
        console.log('[SimpleWordEngine] Initialized with Scale Intelligence Engine and Grading Integration');
        console.log('[SimpleWordEngine] Fallback word mappings:', Object.keys(this.wordMappings).length);
        console.log('[SimpleWordEngine] Current grading mode:', this.currentGradingMode);
    }

    _log(...args) {
        if (this.debug) console.log('[SimpleWord]', ...args);
    }

    /**
     * Handle grading mode changes
     */
    onGradingModeChanged(newMode) {
        const oldMode = this.currentGradingMode;
        this.currentGradingMode = newMode;
        this._log(`Grading mode changed from ${oldMode} to ${newMode}`);
        
        // Clear any cached grading-dependent data
        this._clearGradingCache();
    }

    /**
     * Clear grading-dependent cached data
     */
    _clearGradingCache() {
        // Clear any cached scale selections or character mappings that depend on grading mode
        this._log('Cleared grading-dependent cache');
    }

    /**
     * Main translation function - simple and direct
     */
    async translateWords(wordsString, options = {}) {
        this._log('=== SIMPLE WORD ENGINE TRANSLATING ===', wordsString);
        this._log('Options received:', options);
        
        const words = wordsString.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) {
            return this._emptyResult('No words provided');
        }

        // Step 1: Analyze each word for musical qualities
        const wordAnalyses = words.map(word => this._analyzeWord(word));
        this._log('Word analyses:', wordAnalyses);

        // Step 2: Determine overall musical character
        const character = this._determineCharacter(wordAnalyses, words);
        this._log('Musical character:', character);

        // Step 3: Select key and scale based on character using Scale Intelligence
        const scale = this._selectScale(character, words);
        this._log('Selected scale:', scale);

        // Step 4: Build diatonic progression that reflects the words
        const progression = this._buildProgression(character, scale, words);
        this._log('Built progression:', progression);

        // Step 5: Calculate complexity and compile reasoning
        const complexity = this._calculateComplexity(progression);
        const reasoning = this._compileReasoning(words, character, scale, progression);

        const result = {
            scale: {
                root: scale.root,
                name: scale.mode || 'major', // Ensure mode is not undefined
                key: scale.root,
                scale: scale.mode || 'major'
            },
            progression,
            complexity,
            reasoning,
            analyses: wordAnalyses,
            character,
            // Enhanced grading information
            gradingMode: this.currentGradingMode,
            gradingInfluence: reasoning.gradingInfluence,
            gradingExplanations: this._getGradingExplanations(progression, scale)
        };
        
        console.log('[SimpleWord] Final result scale object - root:', result.scale.root, 'name:', result.scale.name);
        this._log('Final result scale object:', result.scale);

        // Log entry
        const entry = this._formatLogEntry(wordsString, result, options.weights || {});
        this.sessionLog.push(entry);
        result._latestLogEntry = entry;

        return result;
    }

    /**
     * Analyze a single word for musical qualities - ROBUST SEMANTIC ANALYSIS
     */
    _analyzeWord(word) {
        // Step 1: Direct mappings
        if (this.wordMappings[word]) {
            return { word, ...this.wordMappings[word], source: 'direct' };
        }

        // Step 2: Semantic category analysis (more robust than just pattern matching)
        const semanticAnalysis = this._analyzeSemanticCategory(word);
        if (semanticAnalysis.confidence > 0.5) {
            return { word, ...semanticAnalysis, source: 'semantic' };
        }

        // Step 3: Morphological analysis (prefixes, suffixes, word structure)
        const morphAnalysis = this._analyzeMorphology(word);
        if (morphAnalysis.confidence > 0.4) {
            return { word, ...morphAnalysis, source: 'morphological' };
        }

        // Step 4: Phonetic analysis (enhanced)
        const phoneticAnalysis = this._phoneticAnalysis(word);
        return { word, ...phoneticAnalysis, source: 'phonetic' };
    }

    /**
     * Analyze word by semantic category - more robust than pattern matching
     */
    _analyzeSemanticCategory(word) {
        let darkness = 0, energy = 0, mystery = 0, brightness = 0, calm = 0;
        let confidence = 0;

        // DANGER/THREAT CATEGORY
        if (/danger|threat|risk|peril|hazard|menace|deadly|lethal|fatal|kill|death|murder|attack|assault|violence|violent|brutal|savage|fierce|vicious|cruel|evil|wicked|sinister|malicious|hostile|aggressive|predator|hunter|stalker|lurk/.test(word)) {
            darkness += 0.9;
            energy += 0.8;
            confidence += 0.9;
        }

        // FEAR/HORROR CATEGORY  
        if (/fear|terror|horror|panic|dread|nightmare|scary|frightening|terrifying|horrifying|spine.chilling|bone.chilling|eerie|creepy|spooky|haunting|ghostly|phantom|specter|demon|devil|monster|beast|creature|shadow|darkness|abyss|void/.test(word)) {
            darkness += 0.8;
            mystery += 0.7;
            confidence += 0.8;
        }

        // CHASE/PURSUIT CATEGORY
        if (/chase|hunt|pursue|track|follow|stalk|trail|search|seek|find|catch|capture|trap|snare|ambush|pounce|strike|attack/.test(word)) {
            energy += 0.9;
            darkness += 0.4;
            confidence += 0.7;
        }

        // NATURE/WILDERNESS CATEGORY
        if (/wood|forest|tree|jungle|wilderness|wild|nature|natural|organic|earth|ground|soil|root|branch|leaf|bark|moss|fern|undergrowth|thicket|grove|clearing/.test(word)) {
            mystery += 0.6;
            darkness += 0.3;
            calm += 0.4;
            confidence += 0.6;
        }

        // LIGHT/BRIGHT CATEGORY
        if (/bright|light|sun|sunny|day|dawn|morning|shine|glow|radiant|brilliant|luminous|gleaming|sparkling|dazzling|golden|white|clear|pure|clean|fresh/.test(word)) {
            brightness += 0.8;
            calm += 0.3;
            confidence += 0.7;
        }

        // DARK/SHADOW CATEGORY
        if (/dark|black|shadow|shade|dim|dull|murky|gloomy|somber|bleak|dreary|dismal|gray|grey|night|midnight|dusk|twilight|evening/.test(word)) {
            darkness += 0.7;
            mystery += 0.5;
            confidence += 0.6;
        }

        // ENERGY/MOVEMENT CATEGORY
        if (/fast|quick|rapid|swift|speed|rush|hurry|race|run|sprint|dash|bolt|zoom|fly|soar|leap|jump|bounce|vibrant|dynamic|active|energetic|lively|vigorous/.test(word)) {
            energy += 0.8;
            confidence += 0.6;
        }

        // CALM/PEACEFUL CATEGORY
        if (/calm|peace|peaceful|quiet|still|serene|tranquil|gentle|soft|smooth|slow|rest|relax|meditate|zen|harmony|balance|stable|steady|patient/.test(word)) {
            calm += 0.8;
            brightness += 0.3;
            confidence += 0.6;
        }

        return {
            darkness: Math.min(1, darkness),
            energy: Math.min(1, energy), 
            mystery: Math.min(1, mystery),
            brightness: Math.min(1, brightness),
            calm: Math.min(1, calm),
            confidence: Math.min(1, confidence)
        };
    }

    /**
     * Analyze word morphology (structure, prefixes, suffixes)
     */
    _analyzeMorphology(word) {
        let darkness = 0, energy = 0, mystery = 0, brightness = 0, calm = 0;
        let confidence = 0;

        // Negative prefixes
        if (/^(un|dis|anti|de|non|in|im|ir|il)/.test(word)) {
            darkness += 0.4;
            confidence += 0.3;
        }

        // Diminutive suffixes (small, gentle)
        if (/(let|ling|ie|y|ette)$/.test(word)) {
            calm += 0.3;
            brightness += 0.2;
            confidence += 0.2;
        }

        // Action suffixes (energetic)
        if (/(ing|ed|er|or|tion|sion)$/.test(word)) {
            energy += 0.3;
            confidence += 0.2;
        }

        // Abstract suffixes (mysterious)
        if (/(ness|ment|ity|ism|ology|phy)$/.test(word)) {
            mystery += 0.4;
            confidence += 0.2;
        }

        // Word length implications
        if (word.length > 8) {
            mystery += 0.2;
            confidence += 0.1;
        }
        if (word.length < 4) {
            energy += 0.2;
            confidence += 0.1;
        }

        return {
            darkness: Math.min(1, darkness),
            energy: Math.min(1, energy),
            mystery: Math.min(1, mystery), 
            brightness: Math.min(1, brightness),
            calm: Math.min(1, calm),
            confidence: Math.min(1, confidence)
        };
    }

    /**
     * Enhanced phonetic analysis
     */
    _phoneticAnalysis(word) {
        let darkness = 0;
        let energy = 0;
        let mystery = 0;

        // Dark sounds
        if (/[ou]/.test(word)) darkness += 0.3;
        if (/ck|gh|th/.test(word)) darkness += 0.2;
        
        // Energetic sounds
        if (/[eiay]/.test(word)) energy += 0.2;
        if (/[kgpbtd]/.test(word)) energy += 0.3;
        
        // Mysterious sounds
        if (/[mnrl]/.test(word)) mystery += 0.2;
        if (word.length > 6) mystery += 0.2;

        return {
            word,
            darkness: Math.min(1, darkness),
            energy: Math.min(1, energy),
            mystery: Math.min(1, mystery),
            source: 'phonetic'
        };
    }

    /**
     * Determine overall musical character from word analyses - ENHANCED WITH GRADING PERSPECTIVE
     */
    _determineCharacter(analyses, words) {
        let totalDarkness = 0;
        let totalEnergy = 0;
        let totalMystery = 0;
        let totalBrightness = 0;
        let totalCalm = 0;

        analyses.forEach(analysis => {
            totalDarkness += analysis.darkness || 0;
            totalEnergy += analysis.energy || 0;
            totalMystery += analysis.mystery || 0;
            totalBrightness += analysis.brightness || 0;
            totalCalm += analysis.calm || 0;
        });

        const count = analyses.length;
        
        const baseCharacter = {
            darkness: totalDarkness / count,
            energy: totalEnergy / count,
            mystery: totalMystery / count,
            brightness: totalBrightness / count,
            calm: totalCalm / count
        };

        // Apply grading perspective weighting
        const gradingAdjustedCharacter = this._applyGradingPerspective(baseCharacter, words);
        
        return {
            ...gradingAdjustedCharacter,
            dominantTrait: this._findDominantTrait(gradingAdjustedCharacter),
            gradingInfluence: this._getGradingInfluenceExplanation(baseCharacter, gradingAdjustedCharacter)
        };
    }

    /**
     * Apply grading perspective to character analysis
     */
    _applyGradingPerspective(baseCharacter, words) {
        const mode = this.currentGradingMode;
        let adjustedCharacter = { ...baseCharacter };
        
        this._log(`Applying ${mode} grading perspective to character analysis`);
        
        if (mode === 'functional') {
            // Functional grading emphasizes harmonic stability and traditional relationships
            // Boost calm and reduce extreme characteristics for more stable harmonic choices
            adjustedCharacter.calm = Math.min(1, adjustedCharacter.calm * 1.2);
            adjustedCharacter.darkness = adjustedCharacter.darkness * 0.9;
            adjustedCharacter.energy = adjustedCharacter.energy * 0.9;
            
        } else if (mode === 'emotional') {
            // Emotional grading amplifies expressive characteristics
            // Enhance contrast between emotional extremes
            if (adjustedCharacter.darkness > 0.5) {
                adjustedCharacter.darkness = Math.min(1, adjustedCharacter.darkness * 1.3);
            }
            if (adjustedCharacter.brightness > 0.5) {
                adjustedCharacter.brightness = Math.min(1, adjustedCharacter.brightness * 1.3);
            }
            if (adjustedCharacter.energy > 0.5) {
                adjustedCharacter.energy = Math.min(1, adjustedCharacter.energy * 1.2);
            }
            
        } else if (mode === 'color') {
            // Color grading emphasizes harmonic richness and complexity
            // Boost mystery and reduce calm for more colorful harmonic choices
            adjustedCharacter.mystery = Math.min(1, adjustedCharacter.mystery * 1.4);
            adjustedCharacter.calm = adjustedCharacter.calm * 0.8;
            
            // Enhance characteristics that lead to more colorful scales
            if (adjustedCharacter.darkness > 0.3) {
                adjustedCharacter.darkness = Math.min(1, adjustedCharacter.darkness * 1.1);
            }
        }
        
        this._log(`Character adjustment: ${mode} mode applied`, {
            before: baseCharacter,
            after: adjustedCharacter
        });
        
        return adjustedCharacter;
    }

    /**
     * Generate explanation of how grading influenced character analysis
     */
    _getGradingInfluenceExplanation(baseCharacter, adjustedCharacter) {
        const mode = this.currentGradingMode;
        const changes = [];
        
        // Detect significant changes
        Object.keys(baseCharacter).forEach(trait => {
            const before = baseCharacter[trait];
            const after = adjustedCharacter[trait];
            const change = after - before;
            
            if (Math.abs(change) > 0.05) { // Threshold for significant change
                const direction = change > 0 ? 'increased' : 'decreased';
                const magnitude = Math.abs(change);
                changes.push(`${trait} ${direction} by ${Math.round(magnitude * 100)}%`);
            }
        });
        
        if (changes.length === 0) {
            return `${mode} grading mode applied with minimal character adjustment`;
        }
        
        return `${mode} grading mode: ${changes.join(', ')}`;
    }

    _findDominantTrait(character) {
        const traits = Object.entries(character);
        traits.sort((a, b) => b[1] - a[1]);
        return traits[0][0];
    }

    /**
     * Select scale based on character - ENHANCED WITH GRADING-AWARE SELECTION
     */
    _selectScale(character, words) {
        // Prepare characteristics for Scale Intelligence Engine
        const characteristics = {
            darkness: character.darkness || 0,
            energy: character.energy || 0,
            mystery: character.mystery || 0,
            brightness: character.brightness || 0,
            tension: character.darkness * 0.6 + character.energy * 0.4, // Derived tension
            calm: character.calm || 0,
            words: words || [] // Pass words for semantic matching
        };

        this._log('Sending characteristics to Scale Intelligence Engine:', characteristics);

        let scaleSelection;
        if (this.scaleIntelligence) {
            // Use Scale Intelligence Engine for robust scale selection
            console.log('[SimpleWord] 🧠 USING SCALE INTELLIGENCE ENGINE WITH GRADING AWARENESS');
            console.log('[SimpleWord] Input characteristics:', characteristics);
            console.log('[SimpleWord] Current grading mode:', this.currentGradingMode);
            scaleSelection = this.scaleIntelligence.selectScale(characteristics);
            console.log('[SimpleWord] 🎯 Scale Intelligence Result:', scaleSelection);
            console.log('[SimpleWord] Selected scale name:', scaleSelection.name);
            console.log('[SimpleWord] Selection score:', Math.round(scaleSelection.score * 100) + '%');
            console.log('[SimpleWord] Primary reason:', scaleSelection.primaryReason);
            this._log('Scale Intelligence Engine result:', scaleSelection);
        } else {
            // Fallback to simple scale selection
            console.warn('[SimpleWordEngine] Using fallback scale selection - Scale Intelligence Engine not available');
            scaleSelection = this._fallbackScaleSelection(characteristics);
            this._log('Fallback scale selection result:', scaleSelection);
        }

        // Apply grading-aware scale filtering and weighting
        const gradingFilteredScale = this._applyGradingScaleWeighting(scaleSelection, characteristics, words);

        // Extract root and mode from the grading-filtered selection
        let root = 'C';
        let mode = gradingFilteredScale.name || 'major';

        // Select appropriate root based on character, scale choice, and grading mode
        root = this._selectGradingAwareRoot(characteristics, mode);

        const scaleResult = { 
            root, 
            mode, 
            reasoning: `${gradingFilteredScale.gradingReasoning} → ${mode} in ${root}`,
            intelligenceData: {
                score: gradingFilteredScale.score,
                reasons: gradingFilteredScale.reasons,
                alternatives: gradingFilteredScale.alternatives,
                culturalContext: gradingFilteredScale.data?.cultural,
                emotionalProfile: gradingFilteredScale.data?.emotional,
                gradingInfluence: gradingFilteredScale.gradingInfluence
            }
        };
        
        console.log('[SimpleWord] 🎼 GRADING-AWARE SCALE RESULT:');
        console.log('[SimpleWord] Root:', root, 'Mode:', mode);
        console.log('[SimpleWord] Grading Mode:', this.currentGradingMode);
        console.log('[SimpleWord] Intelligence Score:', Math.round(gradingFilteredScale.score * 100) + '%');
        console.log('[SimpleWord] Grading Influence:', gradingFilteredScale.gradingInfluence);
        console.log('[SimpleWord] Full scale result:', scaleResult);
        this._log('Final grading-aware scale selection result:', scaleResult);
        return scaleResult;
    }

    /**
     * Apply grading perspective to scale selection weighting
     */
    _applyGradingScaleWeighting(scaleSelection, characteristics, words) {
        const mode = this.currentGradingMode;
        let adjustedSelection = { ...scaleSelection };
        let gradingInfluence = '';
        
        this._log(`Applying ${mode} grading weighting to scale selection`);
        
        if (mode === 'functional') {
            // Functional grading favors traditional, stable scales
            const functionalScales = ['major', 'minor', 'dorian', 'mixolydian', 'aeolian'];
            
            if (functionalScales.includes(scaleSelection.name)) {
                adjustedSelection.score = Math.min(1, scaleSelection.score * 1.2);
                gradingInfluence = `Functional grading boosted ${scaleSelection.name} for harmonic stability`;
            } else {
                adjustedSelection.score = scaleSelection.score * 0.8;
                gradingInfluence = `Functional grading reduced exotic scale preference`;
            }
            
        } else if (mode === 'emotional') {
            // Emotional grading favors scales that enhance expressive characteristics
            const emotionalScales = {
                dark: ['phrygian', 'locrian', 'harmonic', 'phrygian_dominant'],
                bright: ['lydian', 'major', 'mixolydian'],
                mysterious: ['dorian', 'altered', 'whole_tone']
            };
            
            let emotionalBoost = false;
            if (characteristics.darkness > 0.5 && emotionalScales.dark.includes(scaleSelection.name)) {
                adjustedSelection.score = Math.min(1, scaleSelection.score * 1.3);
                gradingInfluence = `Emotional grading enhanced dark scale for expressive darkness`;
                emotionalBoost = true;
            } else if (characteristics.brightness > 0.5 && emotionalScales.bright.includes(scaleSelection.name)) {
                adjustedSelection.score = Math.min(1, scaleSelection.score * 1.3);
                gradingInfluence = `Emotional grading enhanced bright scale for expressive brightness`;
                emotionalBoost = true;
            } else if (characteristics.mystery > 0.5 && emotionalScales.mysterious.includes(scaleSelection.name)) {
                adjustedSelection.score = Math.min(1, scaleSelection.score * 1.2);
                gradingInfluence = `Emotional grading enhanced mysterious scale for expressive depth`;
                emotionalBoost = true;
            }
            
            if (!emotionalBoost) {
                gradingInfluence = `Emotional grading applied standard weighting`;
            }
            
        } else if (mode === 'color') {
            // Color grading favors harmonically rich and complex scales
            const colorfulScales = ['altered', 'whole_tone', 'octatonic_dim', 'harmonic', 'lydian_augmented', 'phrygian_dominant'];
            
            if (colorfulScales.includes(scaleSelection.name)) {
                adjustedSelection.score = Math.min(1, scaleSelection.score * 1.4);
                gradingInfluence = `Color grading boosted ${scaleSelection.name} for harmonic richness`;
            } else {
                // Still allow simple scales but with less preference
                adjustedSelection.score = scaleSelection.score * 0.9;
                gradingInfluence = `Color grading slightly reduced simple scale preference`;
            }
        }
        
        adjustedSelection.gradingInfluence = gradingInfluence;
        adjustedSelection.gradingReasoning = `${mode.charAt(0).toUpperCase() + mode.slice(1)} grading: ${scaleSelection.primaryReason}`;
        
        this._log(`Grading weighting applied: ${gradingInfluence}`);
        return adjustedSelection;
    }

    /**
     * Select root note based on grading mode preferences
     */
    _selectGradingAwareRoot(characteristics, mode) {
        const gradingMode = this.currentGradingMode;
        
        if (gradingMode === 'functional') {
            // Functional grading prefers stable, traditional keys
            if (characteristics.darkness > 0.5) {
                return ['F', 'Bb', 'Eb', 'D', 'G'][Math.floor(Math.random() * 5)]; // Mix of flat and natural keys
            } else if (characteristics.brightness > 0.6) {
                return ['C', 'G', 'D', 'A'][Math.floor(Math.random() * 4)]; // Natural and sharp keys
            } else {
                return ['C', 'G', 'F', 'D'][Math.floor(Math.random() * 4)]; // Most stable keys
            }
            
        } else if (gradingMode === 'emotional') {
            // Emotional grading uses keys that enhance emotional expression
            if (characteristics.darkness > 0.7 && characteristics.energy > 0.6) {
                return ['F#', 'C#', 'Bb', 'Eb'][Math.floor(Math.random() * 4)]; // Emotionally intense keys
            } else if (characteristics.darkness > 0.5) {
                return ['F', 'Bb', 'Eb', 'Ab', 'D'][Math.floor(Math.random() * 5)]; // Emotionally dark keys
            } else if (characteristics.brightness > 0.6) {
                return ['D', 'A', 'E', 'B', 'G'][Math.floor(Math.random() * 5)]; // Emotionally bright keys
            } else {
                return ['C', 'G', 'F', 'A'][Math.floor(Math.random() * 4)]; // Emotionally neutral keys
            }
            
        } else if (gradingMode === 'color') {
            // Color grading uses keys that provide harmonic color and complexity
            if (characteristics.mystery > 0.5) {
                return ['F#', 'C#', 'Ab', 'Db', 'Eb'][Math.floor(Math.random() * 5)]; // Colorful, complex keys
            } else if (characteristics.darkness > 0.5) {
                return ['Bb', 'Eb', 'Ab', 'F#'][Math.floor(Math.random() * 4)]; // Rich, dark keys
            } else {
                return ['D', 'A', 'E', 'F#', 'Bb'][Math.floor(Math.random() * 5)]; // Harmonically interesting keys
            }
        }
        
        // Default fallback
        return ['C', 'G', 'F'][Math.floor(Math.random() * 3)];
    }

    /**
     * Fallback scale selection when Scale Intelligence Engine is not available
     */
    _fallbackScaleSelection(characteristics) {
        // Simple fallback logic
        let mode = 'major';
        
        if (characteristics.darkness > 0.7 && characteristics.energy > 0.6) {
            mode = Math.random() > 0.5 ? 'locrian' : 'phrygian_dominant';
        } else if (characteristics.darkness > 0.6) {
            mode = Math.random() > 0.5 ? 'phrygian' : 'harmonic';
        } else if (characteristics.darkness > 0.5) {
            mode = characteristics.mystery > 0.5 ? 'dorian' : 'aeolian';
        } else if (characteristics.mystery > 0.6) {
            mode = 'dorian';
        } else if (characteristics.brightness > 0.7) {
            mode = characteristics.energy > 0.5 ? 'lydian' : 'major';
        }

        return {
            name: mode,
            score: 0.5,
            primaryReason: 'fallback selection',
            data: { emotional: {}, cultural: {}, semantic: {} }
        };
    }

    /**
     * Build diatonic progression that reflects the words - ENHANCED WITH GRADING TIER WEIGHTING
     */
    _buildProgression(character, scale, words) {
        const progression = [];
        const length = Math.min(6, Math.max(3, words.length + 1));

        // Choose progression pattern based on character and grading mode
        let pattern = this._selectGradingAwarePattern(character, scale, length);

        // Build chords with grading tier information
        for (let i = 0; i < length; i++) {
            const degree = pattern[i];
            const chord = this._getDiatonicChord(scale, degree);
            
            if (chord) {
                const chordType = chord.type || chord.chordType || '';
                const gradingInfo = this._getChordGradingInfo(chord, degree, scale);
                
                progression.push({
                    root: chord.root,
                    chordType: chordType,
                    fullName: chord.root + chordType,
                    degree: degree,
                    function: this._getFunction(degree),
                    tier: gradingInfo.tierName,
                    tierNumber: gradingInfo.tier,
                    gradingExplanation: gradingInfo.explanation,
                    reasoning: `Diatonic ${degree} in ${scale.root} ${scale.mode} (${gradingInfo.tierName} in ${this.currentGradingMode} mode)`
                });
            }
        }

        return progression;
    }

    /**
     * Select progression pattern based on character and grading mode - ENHANCED FOR CREATIVITY
     */
    _selectGradingAwarePattern(character, scale, targetLength) {
        const mode = this.currentGradingMode;
        
        // Create varied, creative progressions that avoid repetition
        let basePattern = [];
        let extensions = [];
        
        if (mode === 'functional') {
            // Functional grading prefers traditional harmonic progressions
            if (character.darkness > 0.4) {
                basePattern = [1, 6, 4, 5]; // Traditional minor with resolution
                extensions = [2, 5, 1]; // Add subdominant movement
            } else if (character.energy > 0.6) {
                basePattern = [1, 4, 5, 6]; // Energetic with deceptive resolution
                extensions = [2, 5, 1]; // Circle of fifths movement
            } else {
                basePattern = [1, 5, 6, 4]; // Popular progression
                extensions = [1, 5, 1]; // Strong resolution
            }
            
        } else if (mode === 'emotional') {
            // Emotional grading uses progressions that enhance emotional expression
            if (character.darkness > 0.6) {
                basePattern = [1, 6, 2, 5]; // Dark emotional journey
                extensions = [1, 4, 1]; // Subdominant resolution
            } else if (character.brightness > 0.6) {
                basePattern = [1, 3, 6, 4]; // Bright emotional lift
                extensions = [5, 1]; // Classic resolution
            } else if (character.energy > 0.6) {
                basePattern = [1, 7, 4, 5]; // Driving energy with leading tone
                extensions = [6, 2, 1]; // Descending resolution
            } else {
                basePattern = [1, 2, 5, 6]; // Mysterious emotional flow
                extensions = [4, 1]; // Plagal resolution
            }
            
        } else if (mode === 'color') {
            // Color grading uses progressions that showcase harmonic color
            if (character.mystery > 0.5) {
                basePattern = [1, 2, 3, 7]; // Modal mystery
                extensions = [6, 4, 1]; // Colorful resolution
            } else if (character.darkness > 0.4) {
                basePattern = [1, 6, 2, 3]; // Rich dark colors
                extensions = [7, 1]; // Leading tone resolution
            } else {
                basePattern = [1, 3, 2, 6]; // Interesting harmonic movement
                extensions = [4, 5, 1]; // Traditional ending
            }
        } else {
            // Default fallback with variety
            basePattern = [1, 4, 5, 6];
            extensions = [2, 5, 1];
        }
        
        // Build the final pattern with creative extensions
        return this._buildCreativePattern(basePattern, extensions, targetLength, character);
    }

    /**
     * Build a creative, non-repetitive pattern
     */
    _buildCreativePattern(basePattern, extensions, targetLength, character) {
        let pattern = [...basePattern];
        
        // If we need more chords, add creative extensions
        while (pattern.length < targetLength) {
            const remaining = targetLength - pattern.length;
            
            if (remaining >= extensions.length) {
                // Add the full extension
                pattern = pattern.concat(extensions);
            } else {
                // Add partial extension with variation
                const partialExtension = extensions.slice(0, remaining);
                
                // Add some variation to avoid exact repetition
                const lastChord = pattern[pattern.length - 1];
                const variation = this._getChordVariation(lastChord, character);
                
                if (remaining > 1 && variation !== lastChord) {
                    partialExtension[0] = variation;
                }
                
                pattern = pattern.concat(partialExtension);
            }
        }
        
        // Ensure we end on a strong resolution if possible
        if (pattern.length > 2 && pattern[pattern.length - 1] !== 1) {
            // Try to end on tonic for resolution
            if (this.currentGradingMode === 'functional') {
                pattern[pattern.length - 1] = 1;
            }
        }
        
        // Trim to exact length
        return pattern.slice(0, targetLength);
    }

    /**
     * Get a harmonic variation of a chord degree
     */
    _getChordVariation(degree, character) {
        const variations = {
            1: [6, 3], // Tonic variations
            2: [4, 7], // Supertonic variations  
            3: [1, 6], // Mediant variations
            4: [2, 6], // Subdominant variations
            5: [7, 3], // Dominant variations
            6: [4, 1], // Submediant variations
            7: [5, 2]  // Leading tone variations
        };
        
        const options = variations[degree] || [1];
        
        // Choose variation based on character
        if (character.energy > 0.6) {
            // High energy prefers more active variations
            return options[0];
        } else if (character.calm > 0.6) {
            // Calm prefers stable variations
            return options[options.length - 1];
        } else {
            // Random selection for variety
            return options[Math.floor(Math.random() * options.length)];
        }
    }

    /**
     * Get grading information for a chord in the current context
     */
    _getChordGradingInfo(chord, degree, scale) {
        if (!this.gradingEngine || !this.gradingEngine.calculateElementGrade) {
            // Fallback grading
            return {
                tier: degree === 1 ? 4 : (degree === 5 ? 3 : 2),
                tierName: degree === 1 ? 'Perfect' : (degree === 5 ? 'Excellent' : 'Good'),
                explanation: `Fallback grading for degree ${degree}`
            };
        }

        try {
            const context = {
                elementType: 'chord',
                key: scale.root,
                scaleType: scale.mode,
                degree: degree
            };
            
            const tier = this.gradingEngine.calculateElementGrade(chord, context);
            const tierInfo = this.gradingEngine.getGradingTierInfo(tier);
            const explanation = this.gradingEngine.getGradingExplanation(chord, tier, context);
            
            return {
                tier: tier,
                tierName: tierInfo.name,
                explanation: explanation
            };
        } catch (error) {
            this._log('Error getting chord grading info:', error);
            return {
                tier: 2,
                tierName: 'Good',
                explanation: `Error calculating grading for degree ${degree}`
            };
        }
    }

    _getDiatonicChord(scale, degree) {
        try {
            // Use music theory engine if available
            if (this.musicTheory && this.musicTheory.getDiatonicChord) {
                return this.musicTheory.getDiatonicChord(degree, scale.root, scale.mode);
            }
            
            // Simple fallback
            const scaleNotes = this._getScaleNotes(scale);
            if (scaleNotes && scaleNotes.length >= degree) {
                const root = scaleNotes[degree - 1];
                const type = this._getChordType(scale.mode, degree);
                return { root, type };
            }
        } catch (e) {
            this._log('Error getting diatonic chord:', e);
        }
        
        return { root: scale.root, type: '' };
    }

    _getScaleNotes(scale) {
        // Simple scale note generation
        const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const rootIndex = chromatic.indexOf(scale.root);
        
        const intervals = {
            'major': [0, 2, 4, 5, 7, 9, 11],
            'aeolian': [0, 2, 3, 5, 7, 8, 10],
            'dorian': [0, 2, 3, 5, 7, 9, 10],
            'phrygian': [0, 1, 3, 5, 7, 8, 10],
            'lydian': [0, 2, 4, 6, 7, 9, 11],
            'mixolydian': [0, 2, 4, 5, 7, 9, 10]
        };

        const modeIntervals = intervals[scale.mode] || intervals['major'];
        return modeIntervals.map(interval => chromatic[(rootIndex + interval) % 12]);
    }

    _getChordType(mode, degree) {
        const chordTypes = {
            'major': ['', 'm', 'm', '', '', 'm', 'dim'],
            'aeolian': ['m', 'dim', '', 'm', 'm', '', ''],
            'dorian': ['m', 'm', '', '', 'm', 'dim', ''],
            'phrygian': ['m', '', '', 'm', 'dim', '', 'm'],
            'lydian': ['', '', 'm', 'dim', '', 'm', 'm'],
            'mixolydian': ['', 'm', 'dim', '', 'm', 'm', '']
        };

        const types = chordTypes[mode] || chordTypes['major'];
        return types[(degree - 1) % types.length];
    }

    _getFunction(degree) {
        if (degree === 1) return 'Tonic';
        if (degree === 5 || degree === 7) return 'Dominant';
        if (degree === 4 || degree === 2 || degree === 6) return 'Subdominant';
        return 'Chromatic';
    }

    _calculateComplexity(progression) {
        const hasExtensions = progression.some(c => /7|9|11|13/.test(c.chordType));
        return {
            harmonic: hasExtensions ? 0.6 : 0.4,
            rhythmic: 0.5,
            emotional: 0.5,
            overall: hasExtensions ? '7th' : 'triads'
        };
    }

    _compileReasoning(words, character, scale, progression) {
        // Create more descriptive reasoning based on actual analysis
        const traits = [];
        if (character.darkness > 0.5) traits.push(`dark (${Math.round(character.darkness * 100)}%)`);
        if (character.energy > 0.5) traits.push(`energetic (${Math.round(character.energy * 100)}%)`);
        if (character.mystery > 0.5) traits.push(`mysterious (${Math.round(character.mystery * 100)}%)`);
        if (character.brightness > 0.5) traits.push(`bright (${Math.round(character.brightness * 100)}%)`);
        if (character.calm > 0.5) traits.push(`calm (${Math.round(character.calm * 100)}%)`);
        
        const traitDescription = traits.length > 0 ? traits.join(', ') : 'neutral';
        
        // Rich scale explanation using Scale Intelligence data
        let scaleExplanation = scale.reasoning || `selected ${scale.mode}`;
        let culturalContext = '';
        let historicalContext = '';
        
        if (scale.intelligenceData) {
            const cultural = scale.intelligenceData.culturalContext;
            const emotional = scale.intelligenceData.emotionalProfile;
            
            if (cultural) {
                culturalContext = `Cultural origins: ${cultural.origins?.join(', ') || 'Various'}. `;
                if (cultural.period) {
                    historicalContext = `Historical period: ${cultural.period}. `;
                }
                if (cultural.characteristics) {
                    scaleExplanation += ` (${cultural.characteristics})`;
                }
            }
            
            if (emotional && scale.intelligenceData.score > 0.7) {
                const emotionalTraits = [];
                if (emotional.darkness > 0.6) emotionalTraits.push('dark');
                if (emotional.energy > 0.6) emotionalTraits.push('energetic');
                if (emotional.mystery > 0.6) emotionalTraits.push('mysterious');
                if (emotional.brightness > 0.6) emotionalTraits.push('bright');
                if (emotionalTraits.length > 0) {
                    scaleExplanation += ` - emotionally ${emotionalTraits.join(', ')}`;
                }
            }
        }

        // Enhanced grading influence explanations
        const gradingInfluence = this._compileGradingInfluence(character, scale, progression);
        
        return {
            summary: `${words.join(' + ')} → ${traitDescription} → ${scale.root} ${scale.mode} (${this.currentGradingMode} grading)`,
            character,
            scaleChoice: scaleExplanation,
            culturalContext,
            historicalContext,
            progressionLogic: `${progression.length} chords in ${scale.root} ${scale.mode}`,
            intelligenceScore: scale.intelligenceData?.score || 0,
            alternatives: scale.intelligenceData?.alternatives || [],
            gradingMode: this.currentGradingMode,
            gradingInfluence: gradingInfluence,
            characterAdjustment: character.gradingInfluence || 'No character adjustment applied'
        };
    }

    /**
     * Compile detailed explanation of how grading influenced the word-to-music translation
     */
    _compileGradingInfluence(character, scale, progression) {
        const mode = this.currentGradingMode;
        const influences = [];
        
        // Character influence
        if (character.gradingInfluence) {
            influences.push(`Character: ${character.gradingInfluence}`);
        }
        
        // Scale selection influence
        if (scale.intelligenceData?.gradingInfluence) {
            influences.push(`Scale: ${scale.intelligenceData.gradingInfluence}`);
        }
        
        // Progression influence
        const tierCounts = {};
        progression.forEach(chord => {
            const tier = chord.tierNumber || 2;
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });
        
        const tierSummary = Object.entries(tierCounts)
            .map(([tier, count]) => {
                const tierInfo = this._getTierName(parseInt(tier));
                return `${count} ${tierInfo}`;
            })
            .join(', ');
        
        influences.push(`Progression: ${tierSummary} chords in ${mode} grading`);
        
        // Overall grading impact
        const overallImpact = this._assessOverallGradingImpact(mode, character, scale, progression);
        influences.push(`Overall: ${overallImpact}`);
        
        return {
            mode: mode,
            details: influences,
            summary: `${mode.charAt(0).toUpperCase() + mode.slice(1)} grading influenced character analysis, scale selection, and chord progression choices`,
            impact: overallImpact
        };
    }

    /**
     * Assess the overall impact of grading on the translation
     */
    _assessOverallGradingImpact(mode, character, scale, progression) {
        if (mode === 'functional') {
            return 'Emphasized harmonic stability and traditional chord functions';
        } else if (mode === 'emotional') {
            return 'Enhanced expressive characteristics and emotional contrast';
        } else if (mode === 'color') {
            return 'Prioritized harmonic richness and complex scale colors';
        }
        return 'Applied standard grading criteria';
    }

    /**
     * Get tier name from tier number
     */
    _getTierName(tier) {
        const tierNames = {
            0: 'Experimental',
            1: 'Fair', 
            2: 'Good',
            3: 'Excellent',
            4: 'Perfect'
        };
        return tierNames[tier] || 'Unknown';
    }

    /**
     * Get detailed grading explanations for the result
     */
    _getGradingExplanations(progression, scale) {
        const explanations = {
            scaleGrading: scale.intelligenceData?.gradingInfluence || 'Standard scale selection applied',
            chordGradings: progression.map(chord => ({
                chord: chord.fullName,
                tier: chord.tierNumber,
                tierName: chord.tier,
                explanation: chord.gradingExplanation || `${chord.tier} rating in ${this.currentGradingMode} mode`
            })),
            modeImpact: this._getModeImpactExplanation()
        };
        
        return explanations;
    }

    /**
     * Get explanation of how the current grading mode impacts analysis
     */
    _getModeImpactExplanation() {
        const mode = this.currentGradingMode;
        
        const explanations = {
            functional: 'Functional grading emphasizes harmonic stability, traditional chord functions, and diatonic relationships. This mode favors conventional progressions and well-established harmonic patterns.',
            emotional: 'Emotional grading amplifies expressive characteristics and enhances contrast between emotional extremes. This mode prioritizes scales and progressions that maximize emotional impact.',
            color: 'Color grading prioritizes harmonic richness, complexity, and unique tonal colors. This mode favors exotic scales and harmonically interesting chord progressions.'
        };
        
        return explanations[mode] || 'Standard grading criteria applied';
    }

    _formatLogEntry(input, result, weights) {
        const time = new Date().toLocaleTimeString();
        
        return {
            timestamp: new Date().toISOString(),
            time,
            input,
            scale: `${result.scale.root} ${result.scale.name}`,
            progression: result.progression.map(c => `${c.fullName} (${c.degree}) [${c.function}] T${c.tier}`).join(' → '),
            complexity: `H=${Math.round(result.complexity.harmonic * 100)}% R=${Math.round(result.complexity.rhythmic * 100)}% E=${Math.round(result.complexity.emotional * 100)}% (${result.complexity.overall})`,
            reasoning: result.reasoning.summary,
            weights: weights,
            weightsStr: `Emotional=${Math.round((weights.emotional || 0) * 100)}% Semantic=${Math.round((weights.semantic || 0) * 100)}% Phonetic=${Math.round((weights.phonetic || 0) * 100)}% Arch=${Math.round((weights.archetype || 0) * 100)}%`,
            text: `#[${time}] "${input}"\nScale: ${result.scale.root} ${result.scale.name}\nProgression: ${result.progression.map(c => `${c.fullName} (${c.degree}) [${c.function}] T${c.tier}`).join(' → ')}\nComplexity: H=${Math.round(result.complexity.harmonic * 100)}% R=${Math.round(result.complexity.rhythmic * 100)}% E=${Math.round(result.complexity.emotional * 100)}% (${result.complexity.overall})\nReasoning: ${result.reasoning.summary}\nWeights: ${`Emotional=${Math.round((weights.emotional || 0) * 100)}% Semantic=${Math.round((weights.semantic || 0) * 100)}% Phonetic=${Math.round((weights.phonetic || 0) * 100)}% Arch=${Math.round((weights.archetype || 0) * 100)}%`}`
        };
    }

    _emptyResult(reason) {
        return {
            scale: { root: 'C', name: 'major', key: 'C', scale: 'major' },
            progression: [],
            complexity: { harmonic: 0, rhythmic: 0, emotional: 0, overall: 'none' },
            reasoning: { summary: reason },
            analyses: []
        };
    }

    /**
     * Build comprehensive word mappings
     */
    _buildWordMappings() {
        return {
            // Dark/mysterious words
            'dark': { darkness: 0.9, mystery: 0.3 },
            'night': { darkness: 0.8, mystery: 0.6 },
            'shadow': { darkness: 0.9, mystery: 0.7 },
            'black': { darkness: 1.0 },
            'deep': { darkness: 0.6, mystery: 0.4 },
            'ancient': { darkness: 0.5, mystery: 0.8 },
            'old': { darkness: 0.4, mystery: 0.5 },
            'temple': { mystery: 0.9, calm: 0.6 },
            'cathedral': { mystery: 0.8, calm: 0.7 },
            'woods': { darkness: 0.6, mystery: 0.7 },
            'forest': { darkness: 0.4, mystery: 0.6 },
            'cave': { darkness: 0.9, mystery: 0.8 },
            'dungeon': { darkness: 0.9, mystery: 0.5 },
            'crypt': { darkness: 1.0, mystery: 0.9 },
            'tomb': { darkness: 0.9, mystery: 0.8 },
            
            // Bright/positive words
            'bright': { brightness: 0.9 },
            'light': { brightness: 0.8 },
            'sun': { brightness: 1.0, energy: 0.6 },
            'sunny': { brightness: 0.9, energy: 0.5 },
            'day': { brightness: 0.7 },
            'white': { brightness: 0.9 },
            'gold': { brightness: 0.8, energy: 0.4 },
            'golden': { brightness: 0.8, energy: 0.4 },
            'crystal': { brightness: 0.9, mystery: 0.3 },
            'diamond': { brightness: 1.0 },
            'heaven': { brightness: 0.9, calm: 0.8 },
            'divine': { brightness: 0.8, mystery: 0.6 },
            'holy': { brightness: 0.7, calm: 0.8 },
            'sacred': { brightness: 0.6, mystery: 0.7 },
            
            // Energetic/action words
            'chase': { energy: 0.9, darkness: 0.3 },
            'run': { energy: 0.8 },
            'rush': { energy: 0.9 },
            'fast': { energy: 0.8 },
            'quick': { energy: 0.7 },
            'fire': { energy: 0.9, brightness: 0.6 },
            'flame': { energy: 0.8, brightness: 0.5 },
            'storm': { energy: 0.9, darkness: 0.4 },
            'thunder': { energy: 1.0, darkness: 0.3 },
            'lightning': { energy: 1.0, brightness: 0.8 },
            'wind': { energy: 0.6, mystery: 0.3 },
            'wild': { energy: 0.8, darkness: 0.2 },
            'fierce': { energy: 0.9, darkness: 0.4 },
            'intense': { energy: 0.8 },
            
            // Calm/peaceful words
            'calm': { calm: 0.9 },
            'peace': { calm: 0.9, brightness: 0.5 },
            'peaceful': { calm: 0.9, brightness: 0.5 },
            'hope': { brightness: 0.7, calm: 0.4, energy: 0.3 },
            'rain': { calm: 0.6, mystery: 0.3, darkness: 0.2 },
            'quiet': { calm: 0.8, mystery: 0.3 },
            'still': { calm: 0.9 },
            'gentle': { calm: 0.7, brightness: 0.4 },
            'soft': { calm: 0.8, brightness: 0.3 },
            'serene': { calm: 0.9, brightness: 0.6 },
            'tranquil': { calm: 0.9, brightness: 0.5 },
            'rest': { calm: 0.8 },
            'sleep': { calm: 0.9, darkness: 0.3 },
            'dream': { calm: 0.6, mystery: 0.7 },
            'meditation': { calm: 0.9, mystery: 0.5 },
            
            // Mysterious/modal words
            'mystery': { mystery: 1.0 },
            'mysterious': { mystery: 0.9 },
            'secret': { mystery: 0.8, darkness: 0.3 },
            'hidden': { mystery: 0.7, darkness: 0.4 },
            'unknown': { mystery: 0.8 },
            'strange': { mystery: 0.7 },
            'weird': { mystery: 0.6 },
            'magic': { mystery: 0.8, brightness: 0.4 },
            'magical': { mystery: 0.8, brightness: 0.4 },
            'spell': { mystery: 0.7, darkness: 0.3 },
            'ritual': { mystery: 0.8, darkness: 0.5 },
            'ceremony': { mystery: 0.6, calm: 0.5 },
            'oracle': { mystery: 0.9, darkness: 0.2 },
            'prophecy': { mystery: 0.8, darkness: 0.3 }
        };
    }
}