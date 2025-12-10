/**
 * @module PhoneticAnalyzer
 * @description Generative phonetic analysis engine for word-to-music translation
 * 
 * ALGORITHMIC APPROACH - No manual word lists needed
 * - Analyzes consonant clusters, vowel patterns, syllable structure
 * - Maps phonetic features to harmonic tension, voicing density, rhythmic complexity
 * - Handles ANY word, including neologisms and proper nouns
 * 
 * @feature Consonant classification (plosive, fricative, nasal, liquid)
 * @feature Vowel quality analysis (open/close, front/back, rounded)
 * @feature Syllable structure parsing (onset, nucleus, coda)
 * @feature Phonetic → Musical attribute mapping
 * @feature IPA (International Phonetic Alphabet) approximation from English spelling
 */

class PhoneticAnalyzer {
    constructor() {
        // Consonant classifications
        this.consonants = {
            plosive: {
                chars: ['p', 'b', 't', 'd', 'k', 'g'],
                tension: 0.8,      // High tension (explosive release)
                articulation: 0.9, // Sharp attack
                density: 0.6
            },
            fricative: {
                chars: ['f', 'v', 's', 'z', 'sh', 'zh', 'th', 'h'],
                tension: 0.6,      // Medium-high tension (sustained friction)
                articulation: 0.5, // Softer attack
                density: 0.7
            },
            affricate: {
                chars: ['ch', 'j'],
                tension: 0.7,
                articulation: 0.8,
                density: 0.65
            },
            nasal: {
                chars: ['m', 'n', 'ng'],
                tension: 0.2,      // Low tension (resonant)
                articulation: 0.3,
                density: 0.4
            },
            liquid: {
                chars: ['l', 'r'],
                tension: 0.3,      // Flowing
                articulation: 0.4,
                density: 0.5
            },
            glide: {
                chars: ['w', 'y'],
                tension: 0.2,
                articulation: 0.3,
                density: 0.3
            }
        };

        // Vowel classifications
        this.vowels = {
            close_front: {
                chars: ['ee', 'i', 'ea'],
                brightness: 0.9,   // Bright, high frequency
                openness: 0.2,     // Closed vocal tract
                tension: 0.6
            },
            close_back: {
                chars: ['oo', 'u'],
                brightness: 0.2,   // Dark, low frequency
                openness: 0.2,
                tension: 0.3
            },
            open_front: {
                chars: ['a', 'ae'],
                brightness: 0.7,
                openness: 0.9,     // Open vocal tract
                tension: 0.5
            },
            open_back: {
                chars: ['o', 'au', 'aw'],
                brightness: 0.3,
                openness: 0.8,
                tension: 0.4
            },
            mid: {
                chars: ['e', 'uh', 'er'],
                brightness: 0.5,
                openness: 0.5,
                tension: 0.4
            }
        };

        // Consonant cluster complexity mapping
        this.clusterComplexity = {
            0: { harmonic: 0.2, voicing: 'triad' },      // No clusters
            1: { harmonic: 0.3, voicing: 'triad' },      // Simple (st, br)
            2: { harmonic: 0.5, voicing: '7th' },        // Medium (str, spl)
            3: { harmonic: 0.7, voicing: '9th' },        // Complex (scr, thr)
            4: { harmonic: 0.9, voicing: '11th/13th' }   // Very complex (strengths)
        };
    }

    /**
     * Main analysis function - returns comprehensive phonetic profile
     */
    analyze(word) {
        word = word.toLowerCase().trim();
        
        if (!word || word.length === 0) {
            return this._emptyProfile();
        }

        const syllables = this._syllabify(word);
        const consonantProfile = this._analyzeConsonants(word);
        const vowelProfile = this._analyzeVowels(word);
        const clusterProfile = this._analyzeConsonantClusters(word);
        const rhythmicProfile = this._analyzeRhythm(syllables);

        return {
            word,
            syllables,
            syllableCount: syllables.length,
            
            // Consonant analysis
            consonants: consonantProfile,
            
            // Vowel analysis
            vowels: vowelProfile,
            
            // Cluster analysis
            clusters: clusterProfile,
            
            // Rhythmic analysis
            rhythm: rhythmicProfile,
            
            // MUSICAL IMPLICATIONS (the key output)
            musicalAttributes: this._deriveMusicalAttributes(
                consonantProfile,
                vowelProfile,
                clusterProfile,
                rhythmicProfile,
                syllables
            )
        };
    }

    /**
     * Syllabify word into syllable objects with onset-nucleus-coda structure
     */
    _syllabify(word) {
        // Simple syllabification algorithm (English approximation)
        const syllables = [];
        const vowelPattern = /[aeiouy]+/gi;
        let matches = [];
        let match;
        
        while ((match = vowelPattern.exec(word)) !== null) {
            matches.push({ start: match.index, end: match.index + match[0].length, vowel: match[0] });
        }

        if (matches.length === 0) {
            // No vowels - treat as one syllable (edge case)
            return [{ onset: word, nucleus: '', coda: '', full: word }];
        }

        for (let i = 0; i < matches.length; i++) {
            const vowelMatch = matches[i];
            const nextVowel = matches[i + 1];
            
            // Determine onset (consonants before vowel)
            let onset = '';
            if (i === 0) {
                onset = word.substring(0, vowelMatch.start);
            } else {
                const prevEnd = matches[i - 1].end;
                const consonants = word.substring(prevEnd, vowelMatch.start);
                // Split consonants between syllables (rough heuristic)
                const splitPoint = Math.floor(consonants.length / 2);
                onset = consonants.substring(splitPoint);
            }

            // Nucleus (vowel)
            const nucleus = vowelMatch.vowel;

            // Coda (consonants after vowel)
            let coda = '';
            if (nextVowel) {
                const consonants = word.substring(vowelMatch.end, nextVowel.start);
                const splitPoint = Math.floor(consonants.length / 2);
                coda = consonants.substring(0, splitPoint);
            } else {
                coda = word.substring(vowelMatch.end);
            }

            syllables.push({
                onset,
                nucleus,
                coda,
                full: onset + nucleus + coda
            });
        }

        return syllables;
    }

    /**
     * Analyze consonant profile
     */
    _analyzeConsonants(word) {
        const counts = {};
        const positions = { initial: [], medial: [], final: [] };
        let totalTension = 0;
        let totalArticulation = 0;
        let count = 0;

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const type = this._getConsonantType(char);
            
            if (type) {
                counts[type] = (counts[type] || 0) + 1;
                
                // Track position
                if (i === 0) positions.initial.push(char);
                else if (i === word.length - 1) positions.final.push(char);
                else positions.medial.push(char);

                // Accumulate attributes
                totalTension += this.consonants[type].tension;
                totalArticulation += this.consonants[type].articulation;
                count++;
            }
        }

        return {
            counts,
            positions,
            total: count,
            avgTension: count > 0 ? totalTension / count : 0.5,
            avgArticulation: count > 0 ? totalArticulation / count : 0.5,
            density: count / word.length
        };
    }

    /**
     * Analyze vowel profile
     */
    _analyzeVowels(word) {
        const counts = {};
        let totalBrightness = 0;
        let totalOpenness = 0;
        let count = 0;

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const type = this._getVowelType(char);
            
            if (type) {
                counts[type] = (counts[type] || 0) + 1;
                totalBrightness += this.vowels[type].brightness;
                totalOpenness += this.vowels[type].openness;
                count++;
            }
        }

        return {
            counts,
            total: count,
            avgBrightness: count > 0 ? totalBrightness / count : 0.5,
            avgOpenness: count > 0 ? totalOpenness / count : 0.5,
            density: count / word.length
        };
    }

    /**
     * Analyze consonant clusters
     */
    _analyzeConsonantClusters(word) {
        const clusters = [];
        let currentCluster = '';

        for (let i = 0; i < word.length; i++) {
            const char = word[i];
            if (this._isConsonant(char)) {
                currentCluster += char;
            } else {
                if (currentCluster.length > 1) {
                    clusters.push(currentCluster);
                }
                currentCluster = '';
            }
        }
        
        // Check final cluster
        if (currentCluster.length > 1) {
            clusters.push(currentCluster);
        }

        const maxClusterSize = clusters.length > 0 ? Math.max(...clusters.map(c => c.length)) : 0;
        const complexity = Math.min(maxClusterSize, 4);

        return {
            clusters,
            count: clusters.length,
            maxSize: maxClusterSize,
            complexity,
            harmonicImplication: this.clusterComplexity[complexity].harmonic,
            voicingImplication: this.clusterComplexity[complexity].voicing
        };
    }

    /**
     * Analyze rhythmic properties
     */
    _analyzeRhythm(syllables) {
        const count = syllables.length;
        
        // Syllable stress pattern (simple heuristic - alternating stress)
        const stressPattern = syllables.map((syl, i) => {
            // First syllable typically stressed in English
            return i % 2 === 0 ? 'strong' : 'weak';
        });

        // Rhythmic complexity based on syllable count
        let rhythmicComplexity = 0.3;
        if (count === 1) rhythmicComplexity = 0.2;
        else if (count === 2) rhythmicComplexity = 0.4;
        else if (count === 3) rhythmicComplexity = 0.6;
        else if (count >= 4) rhythmicComplexity = 0.8;

        return {
            syllableCount: count,
            stressPattern,
            complexity: rhythmicComplexity,
            iambic: count > 1 && count % 2 === 0, // weak-strong pattern
            trochaic: count > 1 && count % 2 === 1 // strong-weak pattern
        };
    }

    /**
     * CORE MAPPING: Derive musical attributes from phonetic analysis
     */
    _deriveMusicalAttributes(consonants, vowels, clusters, rhythm, syllables) {
        // HARMONIC TENSION (0-1)
        // Influenced by: harsh consonants, close vowels, complex clusters
        const harmonicTension = (
            consonants.avgTension * 0.4 +
            (1 - vowels.avgOpenness) * 0.2 +
            clusters.harmonicImplication * 0.4
        );

        // BRIGHTNESS (0-1) 
        // Influenced by: vowel brightness, fricatives, high consonant articulation
        const brightness = (
            vowels.avgBrightness * 0.6 +
            consonants.avgArticulation * 0.4
        );

        // VOICING DENSITY
        // Maps to chord extensions (triad, 7th, 9th, 11th, 13th)
        const voicingDensity = clusters.voicingImplication;

        // RHYTHMIC COMPLEXITY (0-1)
        const rhythmicComplexity = rhythm.complexity;

        // ARTICULATION (0-1)
        // How sharply notes should be attacked
        const articulation = consonants.avgArticulation;

        // CHORD TYPE SUGGESTIONS based on phonetic profile
        const chordTypeSuggestions = this._suggestChordTypes(
            harmonicTension,
            brightness,
            vowels,
            consonants
        );

        // SCALE SUGGESTIONS
        const scaleSuggestions = this._suggestScales(
            brightness,
            harmonicTension,
            vowels
        );

        // VOICING SUGGESTIONS
        const voicingSuggestions = this._suggestVoicings(
            syllables.length,
            clusters.complexity,
            consonants.density
        );

        return {
            // Core attributes
            harmonicTension,      // 0-1: How much dissonance/tension
            brightness,           // 0-1: Bright (major/lydian) vs dark (minor/phrygian)
            voicingDensity,       // String: 'triad', '7th', '9th', '11th', '13th'
            rhythmicComplexity,   // 0-1: Simple vs complex rhythms
            articulation,         // 0-1: Legato vs staccato
            
            // Suggestions
            chordTypes: chordTypeSuggestions,
            scales: scaleSuggestions,
            voicings: voicingSuggestions,

            // Derived qualities
            dissonance: harmonicTension > 0.6 ? 'high' : harmonicTension > 0.4 ? 'medium' : 'low',
            register: brightness > 0.6 ? 'high' : brightness > 0.4 ? 'mid' : 'low',
            texture: consonants.density > 0.6 ? 'dense' : consonants.density > 0.4 ? 'medium' : 'sparse'
        };
    }

    /**
     * Suggest chord types based on phonetic profile
     */
    _suggestChordTypes(tension, brightness, vowels, consonants) {
        const suggestions = [];

        // Base quality (major vs minor)
        if (brightness > 0.6) {
            suggestions.push({ type: 'maj7', weight: 0.8, reason: 'bright vowels' });
            suggestions.push({ type: 'maj9', weight: 0.6, reason: 'brightness + medium tension' });
        } else if (brightness < 0.4) {
            suggestions.push({ type: 'm7', weight: 0.8, reason: 'dark vowels' });
            suggestions.push({ type: 'm9', weight: 0.6, reason: 'darkness + flow' });
        } else {
            suggestions.push({ type: '7', weight: 0.7, reason: 'neutral brightness (dominant)' });
        }

        // Tension-based additions
        if (tension > 0.7) {
            suggestions.push({ type: '7alt', weight: 0.9, reason: 'high consonant tension' });
            suggestions.push({ type: '7b9', weight: 0.8, reason: 'plosive consonants' });
            suggestions.push({ type: 'dim7', weight: 0.7, reason: 'extreme tension' });
        }

        // Cluster-based voicings
        if (consonants.density > 0.6) {
            suggestions.push({ type: 'm11', weight: 0.7, reason: 'dense consonants' });
            suggestions.push({ type: '13', weight: 0.7, reason: 'complex structure' });
        }

        // Nasal/liquid resonance
        if (consonants.counts.nasal > 2 || consonants.counts.liquid > 2) {
            suggestions.push({ type: 'sus4', weight: 0.6, reason: 'nasal/liquid resonance' });
            suggestions.push({ type: 'add9', weight: 0.5, reason: 'flowing quality' });
        }

        // Open vowels
        if (vowels.avgOpenness > 0.7) {
            suggestions.push({ type: 'maj7#5', weight: 0.5, reason: 'open vowel space' });
        }

        return suggestions.sort((a, b) => b.weight - a.weight);
    }

    /**
     * Suggest scales based on phonetic profile
     */
    _suggestScales(brightness, tension, vowels) {
        const suggestions = [];

        // Brightness → Mode selection
        if (brightness > 0.7) {
            suggestions.push({ scale: 'lydian', weight: 0.9, reason: 'very bright vowels' });
            suggestions.push({ scale: 'major', weight: 0.7, reason: 'bright quality' });
        } else if (brightness > 0.5) {
            suggestions.push({ scale: 'major', weight: 0.8, reason: 'moderate brightness' });
            suggestions.push({ scale: 'mixolydian', weight: 0.6, reason: 'neutral-bright' });
        } else if (brightness < 0.3) {
            suggestions.push({ scale: 'phrygian', weight: 0.9, reason: 'very dark vowels' });
            suggestions.push({ scale: 'locrian', weight: 0.6, reason: 'extreme darkness' });
        } else if (brightness < 0.5) {
            suggestions.push({ scale: 'minor', weight: 0.8, reason: 'dark vowels' });
            suggestions.push({ scale: 'dorian', weight: 0.7, reason: 'moderate darkness' });
        }

        // Tension → Chromatic scales
        if (tension > 0.7) {
            suggestions.push({ scale: 'altered', weight: 0.8, reason: 'high tension' });
            suggestions.push({ scale: 'whole_tone', weight: 0.6, reason: 'consonant harshness' });
            suggestions.push({ scale: 'diminished', weight: 0.7, reason: 'extreme tension' });
        }

        // Open vowels → Pentatonic
        if (vowels.avgOpenness > 0.7 && tension < 0.5) {
            suggestions.push({ scale: 'major_pentatonic', weight: 0.7, reason: 'open, spacious vowels' });
        }

        return suggestions.sort((a, b) => b.weight - a.weight);
    }

    /**
     * Suggest voicings based on syllable structure
     */
    _suggestVoicings(syllableCount, clusterComplexity, consonantDensity) {
        const suggestions = [];

        // Syllable count → Vertical density
        if (syllableCount === 1) {
            suggestions.push({ voicing: 'power_chord', weight: 0.8, reason: 'monosyllabic' });
            suggestions.push({ voicing: 'triad', weight: 0.7, reason: 'simple structure' });
        } else if (syllableCount === 2) {
            suggestions.push({ voicing: 'triad', weight: 0.8, reason: 'disyllabic' });
            suggestions.push({ voicing: '7th', weight: 0.6, reason: 'moderate complexity' });
        } else if (syllableCount === 3) {
            suggestions.push({ voicing: '7th', weight: 0.8, reason: 'three syllables' });
            suggestions.push({ voicing: '9th', weight: 0.7, reason: 'polysyllabic' });
        } else {
            suggestions.push({ voicing: '9th', weight: 0.9, reason: 'many syllables' });
            suggestions.push({ voicing: '11th', weight: 0.7, reason: 'complex word' });
            suggestions.push({ voicing: '13th', weight: 0.6, reason: 'maximum density' });
        }

        // Cluster complexity → Spread voicing
        if (clusterComplexity > 2) {
            suggestions.push({ voicing: 'spread', weight: 0.7, reason: 'consonant clusters' });
        } else if (consonantDensity < 0.3) {
            suggestions.push({ voicing: 'close', weight: 0.6, reason: 'sparse consonants' });
        }

        return suggestions.sort((a, b) => b.weight - a.weight);
    }

    /**
     * Helper: Get consonant type
     */
    _getConsonantType(char) {
        for (const [type, data] of Object.entries(this.consonants)) {
            if (data.chars.includes(char)) {
                return type;
            }
        }
        return null;
    }

    /**
     * Helper: Get vowel type
     */
    _getVowelType(char) {
        for (const [type, data] of Object.entries(this.vowels)) {
            if (data.chars.includes(char)) {
                return type;
            }
        }
        return null;
    }

    /**
     * Helper: Check if character is consonant
     */
    _isConsonant(char) {
        return this._getConsonantType(char) !== null;
    }

    /**
     * Helper: Empty profile for error cases
     */
    _emptyProfile() {
        return {
            word: '',
            syllables: [],
            syllableCount: 0,
            consonants: { counts: {}, positions: {}, total: 0, avgTension: 0.5, avgArticulation: 0.5, density: 0 },
            vowels: { counts: {}, total: 0, avgBrightness: 0.5, avgOpenness: 0.5, density: 0 },
            clusters: { clusters: [], count: 0, maxSize: 0, complexity: 0, harmonicImplication: 0.2, voicingImplication: 'triad' },
            rhythm: { syllableCount: 0, stressPattern: [], complexity: 0.3, iambic: false, trochaic: false },
            musicalAttributes: {
                harmonicTension: 0.5,
                brightness: 0.5,
                voicingDensity: 'triad',
                rhythmicComplexity: 0.3,
                articulation: 0.5,
                chordTypes: [],
                scales: [],
                voicings: [],
                dissonance: 'low',
                register: 'mid',
                texture: 'sparse'
            }
        };
    }
}

// Export for browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhoneticAnalyzer;
}
