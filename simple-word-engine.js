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
        
        console.log('[SimpleWordEngine] Initialized with Scale Intelligence Engine');
        console.log('[SimpleWordEngine] Fallback word mappings:', Object.keys(this.wordMappings).length);
    }

    _log(...args) {
        if (this.debug) console.log('[SimpleWord]', ...args);
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
            character
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
     * Determine overall musical character from word analyses
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
        
        return {
            darkness: totalDarkness / count,
            energy: totalEnergy / count,
            mystery: totalMystery / count,
            brightness: totalBrightness / count,
            calm: totalCalm / count,
            dominantTrait: this._findDominantTrait({
                darkness: totalDarkness / count,
                energy: totalEnergy / count,
                mystery: totalMystery / count,
                brightness: totalBrightness / count,
                calm: totalCalm / count
            })
        };
    }

    _findDominantTrait(character) {
        const traits = Object.entries(character);
        traits.sort((a, b) => b[1] - a[1]);
        return traits[0][0];
    }

    /**
     * Select scale based on character - USING SCALE INTELLIGENCE ENGINE
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
            console.log('[SimpleWord] 🧠 USING SCALE INTELLIGENCE ENGINE');
            console.log('[SimpleWord] Input characteristics:', characteristics);
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

        // Extract root and mode from the intelligent selection
        let root = 'C';
        let mode = scaleSelection.name || 'major';

        // Select appropriate root based on character and scale choice
        if (characteristics.darkness > 0.7 && characteristics.energy > 0.6) {
            // Very dangerous → use keys that sound unstable/threatening
            root = ['F#', 'Bb', 'Eb', 'Ab'][Math.floor(Math.random() * 4)]; 
        } else if (characteristics.darkness > 0.5) {
            // Generally dark → flat keys (darker sound)
            root = ['F', 'Bb', 'Eb', 'Ab'][Math.floor(Math.random() * 4)];
        } else if (characteristics.brightness > 0.6) {
            // Bright → sharp keys (brighter sound)
            root = ['D', 'A', 'E', 'B'][Math.floor(Math.random() * 4)];
        } else if (characteristics.mystery > 0.5) {
            // Mysterious → modal-friendly keys
            root = ['D', 'G', 'A', 'E'][Math.floor(Math.random() * 4)];
        } else {
            // Neutral → natural keys
            root = ['C', 'G', 'F'][Math.floor(Math.random() * 3)];
        }

        const scaleResult = { 
            root, 
            mode, 
            reasoning: `Scale Intelligence: ${scaleSelection.primaryReason} → ${mode} in ${root}`,
            intelligenceData: {
                score: scaleSelection.score,
                reasons: scaleSelection.reasons,
                alternatives: scaleSelection.alternatives,
                culturalContext: scaleSelection.data?.cultural,
                emotionalProfile: scaleSelection.data?.emotional
            }
        };
        
        console.log('[SimpleWord] 🎼 FINAL SCALE RESULT:');
        console.log('[SimpleWord] Root:', root, 'Mode:', mode);
        console.log('[SimpleWord] Intelligence Score:', Math.round(scaleSelection.score * 100) + '%');
        console.log('[SimpleWord] Full scale result:', scaleResult);
        this._log('Final scale selection result:', scaleResult);
        return scaleResult;
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
     * Build diatonic progression that reflects the words
     */
    _buildProgression(character, scale, words) {
        const progression = [];
        const length = Math.min(6, Math.max(3, words.length + 1));

        // Choose progression pattern based on character
        let pattern;
        if (character.darkness > 0.4) {
            pattern = [1, 6, 2, 1]; // Dark, descending
        } else if (character.energy > 0.6) {
            pattern = [1, 4, 5, 1]; // Energetic, classic
        } else if (character.mystery > 0.4) {
            pattern = [1, 2, 1, 7]; // Modal, mysterious
        } else {
            pattern = [1, 5, 6, 4]; // Bright, pop progression
        }

        // Extend pattern to desired length
        while (pattern.length < length) {
            pattern.push(pattern[pattern.length % 4]);
        }

        // Build chords
        for (let i = 0; i < length; i++) {
            const degree = pattern[i];
            const chord = this._getDiatonicChord(scale, degree);
            
            if (chord) {
                const chordType = chord.type || chord.chordType || '';
                progression.push({
                    root: chord.root,
                    chordType: chordType,
                    fullName: chord.root + chordType,
                    degree: degree,
                    function: this._getFunction(degree),
                    tier: 'Excellent', // Keep it simple
                    reasoning: `Diatonic ${degree} in ${scale.root} ${scale.mode}`
                });
            }
        }

        return progression;
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
        
        return {
            summary: `${words.join(' + ')} → ${traitDescription} → ${scale.root} ${scale.mode}`,
            character,
            scaleChoice: scaleExplanation,
            culturalContext,
            historicalContext,
            progressionLogic: `${progression.length} chords in ${scale.root} ${scale.mode}`,
            intelligenceScore: scale.intelligenceData?.score || 0,
            alternatives: scale.intelligenceData?.alternatives || []
        };
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