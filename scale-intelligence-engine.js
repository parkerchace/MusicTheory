/**
 * @module ScaleIntelligenceEngine
 * @description Comprehensive scale intelligence connecting 60+ scales to their musical traditions,
 * histories, emotional characteristics, and semantic associations for intelligent word-to-music mapping
 */

class ScaleIntelligenceEngine {
    constructor(musicTheoryEngine = null) {
        this.scaleDatabase = this._buildScaleDatabase();
        this.culturalContexts = this._buildCulturalContexts();
        this.emotionalProfiles = this._buildEmotionalProfiles();
        this.semanticAssociations = this._buildSemanticAssociations();
        this.intervalCharacteristics = this._buildIntervalCharacteristics();
        
        // Enhanced grading integration
        this.musicTheoryEngine = musicTheoryEngine;
        this.gradingInfluenceWeight = 0.3; // Default weight for grading influence (0-1)
        this.gradingExplanations = new Map(); // Store explanations for grading influence
    }

    /**
     * Get the most appropriate scale for given word characteristics
     */
    selectScale(wordCharacteristics, context = {}) {
        const candidates = this._scoreAllScales(wordCharacteristics, context);
        
        // Sort by score and return top candidates
        candidates.sort((a, b) => b.score - a.score);
        
        // More variety: consider top 8 candidates instead of just 3
        const topCandidates = candidates.slice(0, 8);
        
        // More balanced weighting for variety
        const weights = topCandidates.map((c, i) => Math.pow(0.8, i)); // Less aggressive decay
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        
        let random = Math.random() * totalWeight;
        for (let i = 0; i < topCandidates.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return {
                    ...topCandidates[i],
                    alternatives: topCandidates.slice(0, 10).map(c => ({
                        name: c.name,
                        score: c.score,
                        reason: c.primaryReason
                    }))
                };
            }
        }
        
        return candidates[0];
    }

    /**
     * Get scale suggestions with grading-aware prioritization
     * Enhanced method that considers current grading perspective
     */
    getGradingInfluencedSuggestions(wordCharacteristics, context = {}) {
        const { 
            gradingWeight = this.gradingInfluenceWeight, 
            maxSuggestions = 5,
            key = 'C',
            includeExplanations = true 
        } = context;
        
        // Get all scale candidates with base scoring
        const candidates = this._scoreAllScales(wordCharacteristics, context);
        
        // Apply grading influence if music theory engine is available
        if (this.musicTheoryEngine && gradingWeight > 0) {
            candidates.forEach(candidate => {
                // Get grading tier for this scale
                const gradingTier = this.musicTheoryEngine.calculateScaleGrade(
                    candidate.name, 
                    { key, referenceScale: 'major' }
                );
                
                // Calculate grading bonus (0-1 based on tier)
                const gradingBonus = (gradingTier / 4) * gradingWeight;
                
                // Store original score and apply grading influence
                candidate.baseScore = candidate.score;
                candidate.gradingTier = gradingTier;
                candidate.gradingBonus = gradingBonus;
                candidate.score += gradingBonus;
                
                // Generate explanation for grading influence
                if (includeExplanations) {
                    candidate.gradingExplanation = this._generateGradingExplanation(
                        candidate.name, 
                        gradingTier, 
                        gradingBonus,
                        context
                    );
                }
            });
        }
        
        // Sort by final score (highest first)
        candidates.sort((a, b) => b.score - a.score);
        
        // Return top suggestions with enhanced information
        return candidates.slice(0, maxSuggestions).map(candidate => ({
            name: candidate.name,
            score: candidate.score,
            baseScore: candidate.baseScore || candidate.score,
            gradingTier: candidate.gradingTier || null,
            gradingBonus: candidate.gradingBonus || 0,
            gradingExplanation: candidate.gradingExplanation || null,
            data: candidate.data,
            reasons: candidate.reasons,
            primaryReason: candidate.primaryReason,
            // Enhanced metadata
            gradingInfluenced: candidate.gradingBonus > 0,
            tierInfo: candidate.gradingTier !== null ? 
                this.musicTheoryEngine?.getGradingTierInfo(candidate.gradingTier) : null
        }));
    }

    /**
     * Set the weight for grading influence on scale suggestions
     */
    setGradingInfluenceWeight(weight) {
        this.gradingInfluenceWeight = Math.max(0, Math.min(1, weight));
    }

    /**
     * Get explanation for how grading affected scale suggestions
     */
    explainGradingInfluence(scaleName, context = {}) {
        if (!this.musicTheoryEngine) {
            return 'Grading influence not available - no music theory engine connected.';
        }
        
        const { key = 'C' } = context;
        const gradingTier = this.musicTheoryEngine.calculateScaleGrade(
            scaleName, 
            { key, referenceScale: 'major' }
        );
        
        const tierInfo = this.musicTheoryEngine.getGradingTierInfo(gradingTier);
        const gradingMode = this.musicTheoryEngine.gradingMode;
        
        return this._generateGradingExplanation(scaleName, gradingTier, 0, { 
            ...context, 
            detailed: true 
        });
    }

    /**
     * Score all scales against word characteristics
     */
    _scoreAllScales(characteristics, context) {
        const scales = Object.keys(this.scaleDatabase);
        
        return scales.map(scaleName => {
            const scaleData = this.scaleDatabase[scaleName];
            let score = 0;
            let reasons = [];

            // Emotional profile matching (40% weight)
            const emotionalMatch = this._scoreEmotionalMatch(characteristics, scaleData.emotional);
            score += emotionalMatch.score * 0.4;
            if (emotionalMatch.score > 0.6) reasons.push(emotionalMatch.reason);

            // Cultural/semantic associations (30% weight)
            const semanticMatch = this._scoreSemanticMatch(characteristics, scaleData.semantic);
            score += semanticMatch.score * 0.3;
            if (semanticMatch.score > 0.6) reasons.push(semanticMatch.reason);

            // Interval characteristics (20% weight)
            const intervalMatch = this._scoreIntervalMatch(characteristics, scaleData.intervals);
            score += intervalMatch.score * 0.2;
            if (intervalMatch.score > 0.6) reasons.push(intervalMatch.reason);

            // Historical/traditional context (10% weight)
            const contextMatch = this._scoreContextMatch(characteristics, scaleData.cultural, context);
            score += contextMatch.score * 0.1;
            if (contextMatch.score > 0.6) reasons.push(contextMatch.reason);

            return {
                name: scaleName,
                score: score,
                data: scaleData,
                reasons: reasons,
                primaryReason: reasons[0] || `${Math.round(score * 100)}% match`
            };
        });
    }

    /**
     * Score emotional profile match - FLEXIBLE SCORING FOR VARIETY
     */
    _scoreEmotionalMatch(characteristics, scaleEmotional) {
        let score = 0;
        let reason = '';

        // Base compatibility score (50% weight) - allows for variety
        let baseScore = 0.5; // Start with neutral compatibility
        
        // Darkness compatibility - multiple approaches
        const wordDarkness = characteristics.darkness || 0;
        const scaleDarkness = scaleEmotional.darkness || 0;
        
        if (wordDarkness > 0.5) {
            // Dark words: prefer dark scales, but allow some contrast
            if (scaleDarkness > 0.6) {
                baseScore += 0.3; // Strong match for very dark scales
                reason = `dark word → dark scale (${Math.round(scaleDarkness * 100)}%)`;
            } else if (scaleDarkness > 0.3) {
                baseScore += 0.2; // Good match for moderately dark scales
                reason = `dark word → moderately dark scale`;
            } else {
                baseScore += 0.1; // Still allow bright scales for contrast
                reason = `dark word → contrasting bright scale`;
            }
        } else if (wordDarkness < 0.3) {
            // Bright words: prefer bright scales, but allow some variety
            if (scaleDarkness < 0.4) {
                baseScore += 0.3; // Strong match for bright scales
                reason = `bright word → bright scale (${Math.round((1 - scaleDarkness) * 100)}% bright)`;
            } else if (scaleDarkness < 0.7) {
                baseScore += 0.2; // Good match for neutral scales
                reason = `bright word → neutral scale`;
            } else {
                baseScore += 0.1; // Allow dark scales for dramatic contrast
                reason = `bright word → dramatic dark contrast`;
            }
        } else {
            // Neutral words: all scales are reasonably compatible
            baseScore += 0.25;
            reason = `neutral word → flexible scale choice`;
        }

        // Energy compatibility - additive scoring
        const wordEnergy = characteristics.energy || 0;
        const scaleEnergy = scaleEmotional.energy || 0;
        
        if (wordEnergy > 0.5 && scaleEnergy > 0.5) {
            baseScore += 0.15; // Both high energy
            if (!reason.includes('energetic')) reason += ` + energetic match`;
        } else if (wordEnergy < 0.3 && scaleEnergy < 0.3) {
            baseScore += 0.15; // Both low energy
            if (!reason.includes('calm')) reason += ` + calm match`;
        } else if (Math.abs(wordEnergy - scaleEnergy) < 0.3) {
            baseScore += 0.1; // Similar energy levels
        }

        // Mystery/complexity bonus
        const wordMystery = characteristics.mystery || 0;
        const scaleMystery = scaleEmotional.mystery || 0;
        
        if (wordMystery > 0.5 && scaleMystery > 0.5) {
            baseScore += 0.1;
            if (!reason.includes('mysterious')) reason += ` + mysterious`;
        }

        // Brightness considerations (less weight to allow variety)
        const wordBrightness = characteristics.brightness || 0;
        const scaleBrightness = scaleEmotional.brightness || 0;
        
        if (wordBrightness > 0.6 && scaleBrightness > 0.6) {
            baseScore += 0.1;
        } else if (wordBrightness < 0.3 && scaleBrightness < 0.3) {
            baseScore += 0.1;
        }

        // Ensure variety by adding small random factor
        const varietyBonus = (Math.random() - 0.5) * 0.1; // ±5% randomness
        baseScore += varietyBonus;

        score = Math.max(0.1, Math.min(1, baseScore)); // Ensure minimum 10% compatibility

        return { score, reason: reason || 'general compatibility' };
    }

    /**
     * Score semantic associations match - FLEXIBLE & BROAD
     */
    _scoreSemanticMatch(characteristics, scaleSemantic) {
        let score = 0.3; // Base semantic compatibility for all scales
        let reason = '';

        const semanticCategories = scaleSemantic.categories || [];
        const contextKeywords = scaleSemantic.keywords || [];

        // Match against word characteristics
        if (characteristics.words) {
            for (const word of characteristics.words) {
                const wordLower = word.toLowerCase();
                
                // Direct semantic category matches (strong)
                for (const category of semanticCategories) {
                    if (wordLower.includes(category.toLowerCase()) || 
                        category.toLowerCase().includes(wordLower)) {
                        score += 0.4;
                        reason = `semantic: ${category}`;
                        break;
                    }
                }
                
                // Keyword matches (moderate)
                for (const keyword of contextKeywords) {
                    if (wordLower.includes(keyword.toLowerCase()) || 
                        keyword.toLowerCase().includes(wordLower)) {
                        score += 0.3;
                        if (!reason) reason = `keyword: ${keyword}`;
                        break;
                    }
                }

                // Thematic associations (broader matching)
                if (wordLower.includes('chase') || wordLower.includes('hunt')) {
                    if (semanticCategories.includes('energy') || semanticCategories.includes('movement')) {
                        score += 0.2;
                        if (!reason) reason = 'chase → energetic scales';
                    }
                    if (semanticCategories.includes('dangerous') || semanticCategories.includes('dark')) {
                        score += 0.2;
                        if (!reason) reason = 'chase → dangerous scales';
                    }
                }
                
                if (wordLower.includes('woods') || wordLower.includes('forest')) {
                    if (semanticCategories.includes('mysterious') || semanticCategories.includes('ancient')) {
                        score += 0.2;
                        if (!reason) reason = 'woods → mysterious scales';
                    }
                    if (semanticCategories.includes('natural') || semanticCategories.includes('folk')) {
                        score += 0.2;
                        if (!reason) reason = 'woods → natural scales';
                    }
                }
                
                if (wordLower.includes('danger') || wordLower.includes('threat')) {
                    if (semanticCategories.includes('dark') || semanticCategories.includes('tension')) {
                        score += 0.3;
                        if (!reason) reason = 'danger → dark/tense scales';
                    }
                    if (semanticCategories.includes('exotic') || semanticCategories.includes('complex')) {
                        score += 0.2;
                        if (!reason) reason = 'danger → exotic/complex scales';
                    }
                }
            }
        }

        // Add variety bonus for interesting combinations
        if (score > 0.5) {
            score += Math.random() * 0.1; // Small bonus for good matches
        }

        return { score: Math.min(1, score), reason: reason || 'thematic compatibility' };
    }

    /**
     * Score interval characteristics match
     */
    _scoreIntervalMatch(characteristics, scaleIntervals) {
        let score = 0;
        let reason = '';

        // Match interval characteristics to word characteristics
        const intervalTension = scaleIntervals.tension_points?.length || 0;
        const intervalStability = scaleIntervals.resolution_tendency === 'Strong tonic resolution' ? 0.9 : 
                                 scaleIntervals.resolution_tendency === 'No stable resolution' ? 0.1 : 0.5;

        // High tension words should match high tension intervals
        if (characteristics.tension > 0.7 && intervalTension > 2) {
            score += 0.8;
            reason = 'matches high tension intervals';
        } else if (characteristics.tension < 0.3 && intervalTension === 0) {
            score += 0.7;
            reason = 'matches stable intervals';
        }

        // Darkness should match unstable intervals
        if (characteristics.darkness > 0.7 && intervalStability < 0.3) {
            score += 0.6;
            if (!reason) reason = 'matches unstable intervals';
        } else if (characteristics.darkness < 0.3 && intervalStability > 0.7) {
            score += 0.5;
            if (!reason) reason = 'matches stable intervals';
        }

        return { score: Math.min(1, score), reason };
    }

    /**
     * Score cultural/historical context match
     */
    _scoreContextMatch(characteristics, scaleCultural, context) {
        let score = 0;
        let reason = '';

        // Match cultural origins to word context
        if (characteristics.words && scaleCultural.origins) {
            for (const word of characteristics.words) {
                for (const origin of scaleCultural.origins) {
                    if (word.toLowerCase().includes(origin.toLowerCase()) || 
                        origin.toLowerCase().includes(word.toLowerCase())) {
                        score += 0.7;
                        reason = `matches cultural origin: ${origin}`;
                        break;
                    }
                }
            }
        }

        // Match musical traditions
        if (context.genre && scaleCultural.traditions) {
            for (const tradition of scaleCultural.traditions) {
                if (context.genre.toLowerCase().includes(tradition.toLowerCase())) {
                    score += 0.6;
                    if (!reason) reason = `matches musical tradition: ${tradition}`;
                    break;
                }
            }
        }

        // Historical period matching
        if (characteristics.words && scaleCultural.period) {
            for (const word of characteristics.words) {
                if (word.toLowerCase().includes('ancient') && scaleCultural.period.includes('Ancient')) {
                    score += 0.5;
                    if (!reason) reason = 'matches historical period';
                } else if (word.toLowerCase().includes('medieval') && scaleCultural.period.includes('Medieval')) {
                    score += 0.5;
                    if (!reason) reason = 'matches historical period';
                } else if (word.toLowerCase().includes('modern') && scaleCultural.period.includes('20th century')) {
                    score += 0.5;
                    if (!reason) reason = 'matches historical period';
                }
            }
        }

        return { score: Math.min(1, score), reason };
    }

    /**
     * Build comprehensive scale database with musical intelligence
     */
    _buildScaleDatabase() {
        return {
            // === WESTERN MAJOR & CHURCH MODES ===
            major: {
                intervals: [0, 2, 4, 5, 7, 9, 11],
                emotional: { brightness: 0.9, energy: 0.6, darkness: 0.1, mystery: 0.2, tension: 0.2 },
                cultural: {
                    origins: ['Western Classical', 'Folk traditions worldwide'],
                    period: 'Ancient to present',
                    traditions: ['Classical', 'Pop', 'Folk', 'Country', 'Rock'],
                    characteristics: 'Universal happiness, resolution, stability'
                },
                semantic: {
                    categories: ['joy', 'celebration', 'triumph', 'daylight', 'clarity'],
                    keywords: ['happy', 'bright', 'clear', 'pure', 'simple', 'clean', 'fresh', 'morning', 'sunshine'],
                    contexts: ['weddings', 'celebrations', 'children', 'nature', 'hope']
                },
                intervals: {
                    characteristic: 'Perfect 5th, Major 3rd',
                    tension_points: [],
                    resolution_tendency: 'Strong tonic resolution',
                    harmonic_function: 'Tonic stability'
                }
            },

            dorian: {
                intervals: [0, 2, 3, 5, 7, 9, 10],
                emotional: { brightness: 0.4, energy: 0.5, darkness: 0.6, mystery: 0.8, tension: 0.4 },
                cultural: {
                    origins: ['Ancient Greek', 'Medieval Church', 'Celtic'],
                    period: '6th century BCE to present',
                    traditions: ['Jazz', 'Celtic', 'Folk', 'Progressive Rock', 'Film Music'],
                    characteristics: 'Bittersweet, contemplative, neither major nor minor'
                },
                semantic: {
                    categories: ['contemplation', 'journey', 'ancient', 'mystical', 'bittersweet'],
                    keywords: ['ancient', 'medieval', 'mystical', 'journey', 'quest', 'wandering', 'Celtic', 'mist'],
                    contexts: ['historical', 'fantasy', 'introspection', 'travel', 'meditation']
                },
                intervals: {
                    characteristic: 'Natural 6th over minor 3rd',
                    tension_points: ['Natural 6th creates lift'],
                    resolution_tendency: 'Ambiguous tonic',
                    harmonic_function: 'Modal ambiguity'
                }
            },

            phrygian: {
                intervals: [0, 1, 3, 5, 7, 8, 10],
                emotional: { brightness: 0.1, energy: 0.7, darkness: 0.9, mystery: 0.7, tension: 0.8 },
                cultural: {
                    origins: ['Ancient Greek', 'Spanish Flamenco', 'Middle Eastern'],
                    period: '6th century BCE to present',
                    traditions: ['Flamenco', 'Metal', 'Progressive Rock', 'Middle Eastern', 'Byzantine'],
                    characteristics: 'Dark, exotic, Spanish, aggressive, ancient'
                },
                semantic: {
                    categories: ['danger', 'exotic', 'ancient', 'aggressive', 'Spanish'],
                    keywords: ['danger', 'threat', 'Spanish', 'flamenco', 'exotic', 'ancient', 'aggressive', 'dark', 'fire'],
                    contexts: ['danger', 'conflict', 'passion', 'Spain', 'ancient civilizations']
                },
                intervals: {
                    characteristic: 'Minor 2nd creates immediate tension',
                    tension_points: ['b2 interval', 'b6 interval'],
                    resolution_tendency: 'Strong downward pull',
                    harmonic_function: 'Dominant of relative major'
                }
            },

            lydian: {
                intervals: [0, 2, 4, 6, 7, 9, 11],
                emotional: { brightness: 0.95, energy: 0.4, darkness: 0.05, mystery: 0.6, tension: 0.3 },
                cultural: {
                    origins: ['Ancient Greek', 'Film Music', 'Jazz'],
                    period: '6th century BCE, popularized 20th century',
                    traditions: ['Film Music', 'Jazz', 'Progressive Rock', 'New Age'],
                    characteristics: 'Dreamy, floating, ethereal, otherworldly'
                },
                semantic: {
                    categories: ['dreams', 'fantasy', 'ethereal', 'floating', 'magical'],
                    keywords: ['dream', 'fantasy', 'ethereal', 'floating', 'magical', 'celestial', 'divine', 'wonder'],
                    contexts: ['fantasy', 'dreams', 'magic', 'space', 'transcendence']
                },
                intervals: {
                    characteristic: '#4 (tritone) creates floating quality',
                    tension_points: ['#4 tritone'],
                    resolution_tendency: 'Upward floating tendency',
                    harmonic_function: 'Subdominant with raised 4th'
                }
            },

            mixolydian: {
                intervals: [0, 2, 4, 5, 7, 9, 10],
                emotional: { brightness: 0.7, energy: 0.8, darkness: 0.3, mystery: 0.4, tension: 0.5 },
                cultural: {
                    origins: ['Ancient Greek', 'Celtic', 'Blues', 'Rock'],
                    period: '6th century BCE to present',
                    traditions: ['Rock', 'Blues', 'Celtic', 'Folk', 'Country'],
                    characteristics: 'Bluesy, rockin\', driving, slightly unresolved'
                },
                semantic: {
                    categories: ['rock', 'blues', 'driving', 'energy', 'movement'],
                    keywords: ['rock', 'blues', 'driving', 'energy', 'power', 'movement', 'groove', 'rhythm'],
                    contexts: ['rock music', 'blues', 'driving', 'energy', 'celebration']
                },
                intervals: {
                    characteristic: 'b7 prevents full resolution',
                    tension_points: ['b7 interval'],
                    resolution_tendency: 'Wants to resolve down',
                    harmonic_function: 'Dominant without leading tone'
                }
            },

            aeolian: {
                intervals: [0, 2, 3, 5, 7, 8, 10],
                emotional: { brightness: 0.2, energy: 0.3, darkness: 0.8, mystery: 0.5, tension: 0.4 },
                cultural: {
                    origins: ['Ancient Greek', 'Natural Minor', 'Folk traditions'],
                    period: '6th century BCE to present',
                    traditions: ['Classical', 'Folk', 'Rock', 'Pop', 'Metal'],
                    characteristics: 'Sad, melancholic, natural, human sorrow'
                },
                semantic: {
                    categories: ['sadness', 'melancholy', 'sorrow', 'loss', 'introspection'],
                    keywords: ['sad', 'melancholy', 'sorrow', 'loss', 'grief', 'lonely', 'dark', 'night', 'rain'],
                    contexts: ['sadness', 'loss', 'introspection', 'solitude', 'autumn']
                },
                intervals: {
                    characteristic: 'Minor 3rd and b6, b7',
                    tension_points: ['b6 interval'],
                    resolution_tendency: 'Downward tendency',
                    harmonic_function: 'Natural minor tonic'
                }
            },

            locrian: {
                intervals: [0, 1, 3, 5, 6, 8, 10],
                emotional: { brightness: 0.05, energy: 0.6, darkness: 0.95, mystery: 0.9, tension: 0.95 },
                cultural: {
                    origins: ['Ancient Greek', 'Theoretical', 'Modern Jazz/Metal'],
                    period: '6th century BCE, rarely used until 20th century',
                    traditions: ['Jazz', 'Metal', 'Experimental', 'Film Music'],
                    characteristics: 'Unstable, dangerous, unresolved, theoretical'
                },
                semantic: {
                    categories: ['danger', 'instability', 'threat', 'chaos', 'unresolved'],
                    keywords: ['danger', 'threat', 'unstable', 'chaos', 'unresolved', 'tension', 'fear', 'anxiety'],
                    contexts: ['danger', 'horror', 'instability', 'chaos', 'unresolved conflict']
                },
                intervals: {
                    characteristic: 'b5 (diminished 5th) creates instability',
                    tension_points: ['b2', 'b5 (tritone)', 'b6'],
                    resolution_tendency: 'No stable resolution',
                    harmonic_function: 'Diminished tonic (unstable)'
                }
            },

            // === HARMONIC MINOR & MODES ===
            harmonic: {
                intervals: [0, 2, 3, 5, 7, 8, 11],
                emotional: { brightness: 0.3, energy: 0.7, darkness: 0.8, mystery: 0.8, tension: 0.8 },
                cultural: {
                    origins: ['Baroque', 'Classical', 'Eastern European', 'Jewish'],
                    period: '17th century to present',
                    traditions: ['Classical', 'Klezmer', 'Metal', 'Neoclassical', 'Film Music'],
                    characteristics: 'Dramatic, exotic, classical, augmented 2nd interval'
                },
                semantic: {
                    categories: ['drama', 'classical', 'exotic', 'tension', 'resolution'],
                    keywords: ['dramatic', 'classical', 'exotic', 'tension', 'baroque', 'ornate', 'formal'],
                    contexts: ['classical music', 'drama', 'formal occasions', 'Eastern European']
                },
                intervals: {
                    characteristic: 'Augmented 2nd (b6 to 7)',
                    tension_points: ['Augmented 2nd', 'Leading tone'],
                    resolution_tendency: 'Strong leading tone resolution',
                    harmonic_function: 'Minor with major dominant'
                }
            },

            phrygian_dominant: {
                intervals: [0, 1, 4, 5, 7, 8, 10],
                emotional: { brightness: 0.2, energy: 0.9, darkness: 0.8, mystery: 0.9, tension: 0.9 },
                cultural: {
                    origins: ['Middle Eastern', 'Spanish', 'Jewish', 'Arabic'],
                    period: 'Ancient to present',
                    traditions: ['Middle Eastern', 'Flamenco', 'Metal', 'Film Music'],
                    characteristics: 'Exotic, dangerous, Middle Eastern, Spanish, augmented 2nd'
                },
                semantic: {
                    categories: ['exotic', 'dangerous', 'Middle Eastern', 'Spanish', 'mysterious'],
                    keywords: ['exotic', 'dangerous', 'Middle Eastern', 'Arabic', 'Spanish', 'mysterious', 'ancient'],
                    contexts: ['Middle East', 'danger', 'exotic locations', 'ancient civilizations']
                },
                intervals: {
                    characteristic: 'b2 and augmented 2nd (b2 to 3)',
                    tension_points: ['b2', 'Augmented 2nd'],
                    resolution_tendency: 'Exotic resolution patterns',
                    harmonic_function: 'Dominant of harmonic minor'
                }
            },

            // === PENTATONIC SCALES ===
            major_pentatonic: {
                intervals: [0, 2, 4, 7, 9],
                emotional: { brightness: 0.8, energy: 0.6, darkness: 0.2, mystery: 0.3, tension: 0.1 },
                cultural: {
                    origins: ['Ancient China', 'Celtic', 'African', 'Native American'],
                    period: 'Ancient to present',
                    traditions: ['Folk', 'Country', 'Rock', 'Pop', 'World Music'],
                    characteristics: 'Universal, simple, folk-like, no half-steps'
                },
                semantic: {
                    categories: ['folk', 'simple', 'universal', 'natural', 'pastoral'],
                    keywords: ['folk', 'simple', 'natural', 'pastoral', 'country', 'universal', 'timeless'],
                    contexts: ['folk music', 'nature', 'simplicity', 'universality']
                },
                intervals: {
                    characteristic: 'No half-steps, perfect consonance',
                    tension_points: [],
                    resolution_tendency: 'Natural resolution',
                    harmonic_function: 'Pentatonic harmony'
                }
            },

            minor_pentatonic: {
                intervals: [0, 3, 5, 7, 10],
                emotional: { brightness: 0.3, energy: 0.7, darkness: 0.6, mystery: 0.4, tension: 0.3 },
                cultural: {
                    origins: ['African', 'Blues', 'Rock', 'World Music'],
                    period: 'Ancient to present',
                    traditions: ['Blues', 'Rock', 'Jazz', 'World Music'],
                    characteristics: 'Bluesy, soulful, expressive, no half-steps'
                },
                semantic: {
                    categories: ['blues', 'soul', 'expression', 'emotion', 'raw'],
                    keywords: ['blues', 'soul', 'raw', 'emotional', 'expressive', 'gritty', 'authentic'],
                    contexts: ['blues music', 'emotional expression', 'raw emotion']
                },
                intervals: {
                    characteristic: 'Minor 3rd, no half-steps',
                    tension_points: [],
                    resolution_tendency: 'Blues resolution',
                    harmonic_function: 'Pentatonic minor harmony'
                }
            },

            // === EXOTIC/WORLD SCALES ===
            hijaz: {
                intervals: [0, 1, 4, 5, 7, 8, 10],
                emotional: { brightness: 0.2, energy: 0.6, darkness: 0.7, mystery: 0.9, tension: 0.7 },
                cultural: {
                    origins: ['Arabic', 'Middle Eastern', 'Islamic'],
                    period: 'Ancient Islamic period to present',
                    traditions: ['Arabic Classical', 'Turkish', 'Persian', 'North African'],
                    characteristics: 'Middle Eastern, exotic, augmented 2nd, spiritual'
                },
                semantic: {
                    categories: ['Middle Eastern', 'exotic', 'spiritual', 'ancient', 'desert'],
                    keywords: ['Middle Eastern', 'Arabic', 'exotic', 'desert', 'ancient', 'spiritual', 'mystical'],
                    contexts: ['Middle East', 'spirituality', 'ancient cultures', 'desert landscapes']
                },
                intervals: {
                    characteristic: 'Augmented 2nd (b2 to 3)',
                    tension_points: ['b2', 'Augmented 2nd'],
                    resolution_tendency: 'Middle Eastern cadences',
                    harmonic_function: 'Maqam harmony'
                }
            },

            // === SYMMETRIC SCALES ===
            whole_tone: {
                intervals: [0, 2, 4, 6, 8, 10],
                emotional: { brightness: 0.6, energy: 0.3, darkness: 0.2, mystery: 0.9, tension: 0.8 },
                cultural: {
                    origins: ['Impressionist', 'Debussy', 'French'],
                    period: 'Late 19th/Early 20th century',
                    traditions: ['Impressionist', 'Jazz', 'Film Music', 'Modern Classical'],
                    characteristics: 'Dreamy, floating, impressionistic, no resolution'
                },
                semantic: {
                    categories: ['impressionist', 'dreamy', 'floating', 'surreal', 'ambiguous'],
                    keywords: ['dreamy', 'floating', 'impressionist', 'surreal', 'ambiguous', 'ethereal'],
                    contexts: ['dreams', 'impressionism', 'surreal situations', 'floating']
                },
                intervals: {
                    characteristic: 'All whole steps, no half-steps',
                    tension_points: ['Tritones throughout'],
                    resolution_tendency: 'No traditional resolution',
                    harmonic_function: 'Symmetrical, no functional harmony'
                }
            },

            octatonic_dim: {
                intervals: [0, 2, 3, 5, 6, 8, 9, 11],
                emotional: { brightness: 0.3, energy: 0.7, darkness: 0.8, mystery: 0.9, tension: 0.9 },
                cultural: {
                    origins: ['Russian', 'Rimsky-Korsakov', 'Stravinsky'],
                    period: 'Late 19th/20th century',
                    traditions: ['Russian Classical', 'Modern Classical', 'Jazz', 'Film Music'],
                    characteristics: 'Symmetrical, mysterious, Russian, diminished harmony'
                },
                semantic: {
                    categories: ['mysterious', 'symmetrical', 'complex', 'modern', 'Russian'],
                    keywords: ['mysterious', 'complex', 'modern', 'symmetrical', 'Russian', 'sophisticated'],
                    contexts: ['mystery', 'complexity', 'modern classical', 'sophistication']
                },
                intervals: {
                    characteristic: 'Alternating whole and half steps',
                    tension_points: ['Multiple tritones', 'Diminished harmony'],
                    resolution_tendency: 'Symmetrical resolutions',
                    harmonic_function: 'Diminished-based harmony'
                }
            },

            octatonic_dom: {
                intervals: [0, 1, 3, 4, 6, 7, 9, 10],
                emotional: { brightness: 0.4, energy: 0.8, darkness: 0.7, mystery: 0.8, tension: 0.9 },
                cultural: {
                    origins: ['Jazz', 'Modern Classical', 'Bebop'],
                    period: '20th century',
                    traditions: ['Jazz', 'Bebop', 'Modern Classical', 'Film Music'],
                    characteristics: 'Dominant function, jazz harmony, complex'
                },
                semantic: {
                    categories: ['jazz', 'complex', 'sophisticated', 'modern', 'dominant'],
                    keywords: ['jazz', 'sophisticated', 'complex', 'modern', 'dominant', 'bebop'],
                    contexts: ['jazz music', 'sophistication', 'modern harmony']
                },
                intervals: {
                    characteristic: 'Half-whole pattern, dominant function',
                    tension_points: ['Multiple tritones', 'Chromatic tensions'],
                    resolution_tendency: 'Dominant resolution patterns',
                    harmonic_function: 'Dominant-based harmony'
                }
            },

            augmented: {
                intervals: [0, 3, 4, 7, 8, 11],
                emotional: { brightness: 0.5, energy: 0.6, darkness: 0.4, mystery: 0.8, tension: 0.7 },
                cultural: {
                    origins: ['Modern Classical', 'Jazz', 'Impressionist'],
                    period: '20th century',
                    traditions: ['Modern Classical', 'Jazz', 'Film Music'],
                    characteristics: 'Augmented triads, symmetrical, floating'
                },
                semantic: {
                    categories: ['modern', 'floating', 'augmented', 'symmetrical'],
                    keywords: ['modern', 'floating', 'augmented', 'symmetrical', 'suspended'],
                    contexts: ['modern music', 'floating harmony', 'suspension']
                },
                intervals: {
                    characteristic: 'Augmented triads, minor 3rd + semitone pattern',
                    tension_points: ['Augmented triads'],
                    resolution_tendency: 'Floating, no strong resolution',
                    harmonic_function: 'Augmented harmony'
                }
            },

            // === MELODIC MINOR MODES ===
            melodic: {
                intervals: [0, 2, 3, 5, 7, 9, 11],
                emotional: { brightness: 0.6, energy: 0.5, darkness: 0.4, mystery: 0.6, tension: 0.4 },
                cultural: {
                    origins: ['Classical', 'Jazz', 'Western'],
                    period: 'Baroque to present',
                    traditions: ['Classical', 'Jazz', 'Film Music'],
                    characteristics: 'Ascending melodic minor, jazz minor'
                },
                semantic: {
                    categories: ['classical', 'jazz', 'melodic', 'sophisticated', 'movement'],
                    keywords: ['classical', 'jazz', 'melodic', 'sophisticated', 'ascending', 'chase', 'pursuit'],
                    contexts: ['classical music', 'jazz', 'sophisticated harmony', 'chase scenes']
                },
                intervals: {
                    characteristic: 'Minor 3rd with major 6th and 7th',
                    tension_points: ['Major 7th'],
                    resolution_tendency: 'Upward melodic tendency',
                    harmonic_function: 'Minor with major upper structure'
                }
            },

            altered: {
                intervals: [0, 1, 3, 4, 6, 8, 10],
                emotional: { brightness: 0.2, energy: 0.8, darkness: 0.8, mystery: 0.9, tension: 0.95 },
                cultural: {
                    origins: ['Jazz', 'Bebop', 'Modern'],
                    period: '20th century',
                    traditions: ['Jazz', 'Bebop', 'Modern Classical', 'Film Music'],
                    characteristics: 'Super Locrian, maximum dissonance, jazz tension'
                },
                semantic: {
                    categories: ['jazz', 'complex', 'dangerous', 'tension', 'modern', 'dissonant'],
                    keywords: ['jazz', 'complex', 'dangerous', 'tension', 'altered', 'dissonant', 'chase', 'threat'],
                    contexts: ['jazz music', 'tension', 'danger', 'chase scenes', 'modern harmony']
                },
                intervals: {
                    characteristic: 'All alterations: b2, #2, #4, b6, b7',
                    tension_points: ['b2', '#2', '#4', 'b6'],
                    resolution_tendency: 'Maximum tension seeking resolution',
                    harmonic_function: '7th mode of melodic minor'
                }
            },

            dorian_b2: {
                intervals: [0, 1, 3, 5, 7, 9, 10],
                emotional: { brightness: 0.3, energy: 0.6, darkness: 0.7, mystery: 0.8, tension: 0.8 },
                cultural: {
                    origins: ['Jazz', 'Modern Classical'],
                    period: '20th century',
                    traditions: ['Jazz', 'Modern Classical', 'Film Music'],
                    characteristics: 'Phrygian natural 6, exotic jazz mode'
                },
                semantic: {
                    categories: ['jazz', 'exotic', 'dark', 'sophisticated'],
                    keywords: ['jazz', 'exotic', 'dark', 'sophisticated', 'phrygian'],
                    contexts: ['jazz music', 'exotic harmony', 'dark moods']
                },
                intervals: {
                    characteristic: 'b2 with natural 6',
                    tension_points: ['b2 interval'],
                    resolution_tendency: 'Downward pull from b2',
                    harmonic_function: '2nd mode of melodic minor'
                }
            },

            lydian_augmented: {
                intervals: [0, 2, 4, 6, 8, 9, 11],
                emotional: { brightness: 0.8, energy: 0.4, darkness: 0.2, mystery: 0.7, tension: 0.6 },
                cultural: {
                    origins: ['Jazz', 'Modern Classical'],
                    period: '20th century',
                    traditions: ['Jazz', 'Modern Classical', 'Film Music'],
                    characteristics: 'Lydian with augmented 5th, floating'
                },
                semantic: {
                    categories: ['jazz', 'floating', 'augmented', 'bright'],
                    keywords: ['jazz', 'floating', 'augmented', 'bright', 'lydian'],
                    contexts: ['jazz music', 'floating harmony', 'bright moods']
                },
                intervals: {
                    characteristic: '#4 and #5 (augmented 5th)',
                    tension_points: ['#4 tritone', '#5 augmented 5th'],
                    resolution_tendency: 'Upward floating tendency',
                    harmonic_function: '3rd mode of melodic minor'
                }
            },

            lydian_dominant: {
                intervals: [0, 2, 4, 6, 7, 9, 10],
                emotional: { brightness: 0.7, energy: 0.7, darkness: 0.3, mystery: 0.5, tension: 0.6 },
                cultural: {
                    origins: ['Jazz', 'Acoustic', 'Modern'],
                    period: '20th century',
                    traditions: ['Jazz', 'Fusion', 'Modern Classical'],
                    characteristics: 'Acoustic scale, lydian with b7'
                },
                semantic: {
                    categories: ['jazz', 'acoustic', 'bright', 'dominant'],
                    keywords: ['jazz', 'acoustic', 'bright', 'dominant', 'fusion'],
                    contexts: ['jazz music', 'fusion', 'acoustic music']
                },
                intervals: {
                    characteristic: '#4 with b7',
                    tension_points: ['#4 tritone'],
                    resolution_tendency: 'Dominant function with lydian color',
                    harmonic_function: '4th mode of melodic minor'
                }
            },

            // === HARMONIC MINOR MODES ===
            harmonic: {
                intervals: [0, 2, 3, 5, 7, 8, 11],
                emotional: { brightness: 0.3, energy: 0.7, darkness: 0.8, mystery: 0.8, tension: 0.8 },
                cultural: {
                    origins: ['Baroque', 'Classical', 'Eastern European', 'Jewish'],
                    period: '17th century to present',
                    traditions: ['Classical', 'Klezmer', 'Metal', 'Neoclassical', 'Film Music'],
                    characteristics: 'Dramatic, exotic, classical, augmented 2nd interval'
                },
                semantic: {
                    categories: ['drama', 'classical', 'exotic', 'tension', 'resolution'],
                    keywords: ['dramatic', 'classical', 'exotic', 'tension', 'baroque', 'ornate', 'formal'],
                    contexts: ['classical music', 'drama', 'formal occasions', 'Eastern European']
                },
                intervals: {
                    characteristic: 'Augmented 2nd (b6 to 7)',
                    tension_points: ['Augmented 2nd', 'Leading tone'],
                    resolution_tendency: 'Strong leading tone resolution',
                    harmonic_function: 'Minor with major dominant'
                }
            },

            phrygian_dominant: {
                intervals: [0, 1, 4, 5, 7, 8, 10],
                emotional: { brightness: 0.2, energy: 0.9, darkness: 0.8, mystery: 0.9, tension: 0.9 },
                cultural: {
                    origins: ['Middle Eastern', 'Spanish', 'Jewish', 'Arabic'],
                    period: 'Ancient to present',
                    traditions: ['Middle Eastern', 'Flamenco', 'Metal', 'Film Music'],
                    characteristics: 'Exotic, dangerous, Middle Eastern, Spanish, augmented 2nd'
                },
                semantic: {
                    categories: ['exotic', 'dangerous', 'Middle Eastern', 'Spanish', 'mysterious'],
                    keywords: ['exotic', 'dangerous', 'Middle Eastern', 'Arabic', 'Spanish', 'mysterious', 'ancient'],
                    contexts: ['Middle East', 'danger', 'exotic locations', 'ancient civilizations']
                },
                intervals: {
                    characteristic: 'b2 and augmented 2nd (b2 to 3)',
                    tension_points: ['b2', 'Augmented 2nd'],
                    resolution_tendency: 'Exotic resolution patterns',
                    harmonic_function: 'Dominant of harmonic minor'
                }
            },

            // === PENTATONIC SCALES ===
            major_pentatonic: {
                intervals: [0, 2, 4, 7, 9],
                emotional: { brightness: 0.8, energy: 0.6, darkness: 0.2, mystery: 0.3, tension: 0.1 },
                cultural: {
                    origins: ['Ancient China', 'Celtic', 'African', 'Native American'],
                    period: 'Ancient to present',
                    traditions: ['Folk', 'Country', 'Rock', 'Pop', 'World Music'],
                    characteristics: 'Universal, simple, folk-like, no half-steps'
                },
                semantic: {
                    categories: ['folk', 'simple', 'universal', 'natural', 'pastoral'],
                    keywords: ['folk', 'simple', 'natural', 'pastoral', 'country', 'universal', 'timeless'],
                    contexts: ['folk music', 'nature', 'simplicity', 'universality']
                },
                intervals: {
                    characteristic: 'No half-steps, perfect consonance',
                    tension_points: [],
                    resolution_tendency: 'Natural resolution',
                    harmonic_function: 'Pentatonic harmony'
                }
            },

            minor_pentatonic: {
                intervals: [0, 3, 5, 7, 10],
                emotional: { brightness: 0.3, energy: 0.7, darkness: 0.6, mystery: 0.4, tension: 0.3 },
                cultural: {
                    origins: ['African', 'Blues', 'Rock', 'World Music'],
                    period: 'Ancient to present',
                    traditions: ['Blues', 'Rock', 'Jazz', 'World Music'],
                    characteristics: 'Bluesy, soulful, expressive, no half-steps'
                },
                semantic: {
                    categories: ['blues', 'soul', 'expression', 'emotion', 'raw'],
                    keywords: ['blues', 'soul', 'raw', 'emotional', 'expressive', 'gritty', 'authentic'],
                    contexts: ['blues music', 'emotional expression', 'raw emotion']
                },
                intervals: {
                    characteristic: 'Minor 3rd, no half-steps',
                    tension_points: [],
                    resolution_tendency: 'Blues resolution',
                    harmonic_function: 'Pentatonic minor harmony'
                }
            },

            // === EXOTIC/WORLD SCALES ===
            hijaz: {
                intervals: [0, 1, 4, 5, 7, 8, 10],
                emotional: { brightness: 0.2, energy: 0.6, darkness: 0.7, mystery: 0.9, tension: 0.7 },
                cultural: {
                    origins: ['Arabic', 'Middle Eastern', 'Islamic'],
                    period: 'Ancient Islamic period to present',
                    traditions: ['Arabic Classical', 'Turkish', 'Persian', 'North African'],
                    characteristics: 'Middle Eastern, exotic, augmented 2nd, spiritual'
                },
                semantic: {
                    categories: ['Middle Eastern', 'exotic', 'spiritual', 'ancient', 'desert'],
                    keywords: ['Middle Eastern', 'Arabic', 'exotic', 'desert', 'ancient', 'spiritual', 'mystical'],
                    contexts: ['Middle East', 'spirituality', 'ancient cultures', 'desert landscapes']
                },
                intervals: {
                    characteristic: 'Augmented 2nd (b2 to 3)',
                    tension_points: ['b2', 'Augmented 2nd'],
                    resolution_tendency: 'Middle Eastern cadences',
                    harmonic_function: 'Maqam harmony'
                }
            },

            persian: {
                intervals: [0, 1, 4, 5, 6, 8, 11],
                emotional: { brightness: 0.2, energy: 0.5, darkness: 0.8, mystery: 0.9, tension: 0.8 },
                cultural: {
                    origins: ['Persian', 'Iranian', 'Middle Eastern'],
                    period: 'Ancient Persia to present',
                    traditions: ['Persian Classical', 'Middle Eastern', 'World Music'],
                    characteristics: 'Persian, exotic, mysterious, ancient'
                },
                semantic: {
                    categories: ['Persian', 'exotic', 'mysterious', 'ancient', 'oriental'],
                    keywords: ['Persian', 'exotic', 'mysterious', 'ancient', 'oriental', 'Iran'],
                    contexts: ['Persia', 'ancient civilizations', 'exotic locations', 'mystery']
                },
                intervals: {
                    characteristic: 'b2, b5, major 7th',
                    tension_points: ['b2', 'b5', 'Major 7th'],
                    resolution_tendency: 'Persian cadences',
                    harmonic_function: 'Persian modal harmony'
                }
            },

            // === BLUES SCALES ===
            blues_hexatonic: {
                intervals: [0, 3, 5, 6, 7, 10],
                emotional: { brightness: 0.3, energy: 0.8, darkness: 0.6, mystery: 0.4, tension: 0.5 },
                cultural: {
                    origins: ['African American', 'Blues', 'Jazz'],
                    period: '19th century to present',
                    traditions: ['Blues', 'Jazz', 'Rock', 'Soul'],
                    characteristics: 'Blues scale with blue note, expressive'
                },
                semantic: {
                    categories: ['blues', 'soul', 'expression', 'raw', 'gritty'],
                    keywords: ['blues', 'soul', 'raw', 'expressive', 'gritty', 'authentic', 'emotional', 'chase'],
                    contexts: ['blues music', 'soul music', 'emotional expression', 'raw energy']
                },
                intervals: {
                    characteristic: 'Minor pentatonic + b5 blue note',
                    tension_points: ['b5 blue note'],
                    resolution_tendency: 'Blues resolution patterns',
                    harmonic_function: 'Blues harmony'
                }
            },

            // === ADDITIONAL SCALES FOR VARIETY ===
            hungarian_minor: {
                intervals: [0, 2, 3, 6, 7, 8, 11],
                emotional: { brightness: 0.2, energy: 0.7, darkness: 0.8, mystery: 0.9, tension: 0.8 },
                cultural: {
                    origins: ['Hungarian', 'Gypsy', 'Eastern European'],
                    period: 'Traditional to present',
                    traditions: ['Folk', 'Classical', 'Film Music', 'World Music'],
                    characteristics: 'Gypsy minor, exotic, dramatic'
                },
                semantic: {
                    categories: ['exotic', 'dramatic', 'gypsy', 'Eastern European', 'dangerous', 'mysterious'],
                    keywords: ['exotic', 'dramatic', 'gypsy', 'Hungarian', 'dangerous', 'mysterious', 'woods', 'ancient'],
                    contexts: ['exotic locations', 'drama', 'mystery', 'ancient forests', 'danger']
                },
                intervals: {
                    characteristic: 'Augmented 2nd intervals, #4',
                    tension_points: ['Augmented 2nd', '#4'],
                    resolution_tendency: 'Exotic resolution patterns',
                    harmonic_function: 'Gypsy harmony'
                }
            },

            neapolitan_minor: {
                intervals: [0, 1, 3, 5, 7, 8, 11],
                emotional: { brightness: 0.2, energy: 0.6, darkness: 0.8, mystery: 0.8, tension: 0.7 },
                cultural: {
                    origins: ['Italian', 'Classical', 'Baroque'],
                    period: '18th century to present',
                    traditions: ['Classical', 'Opera', 'Film Music'],
                    characteristics: 'Neapolitan sixth, dramatic, operatic'
                },
                semantic: {
                    categories: ['classical', 'dramatic', 'operatic', 'dark', 'mysterious'],
                    keywords: ['classical', 'dramatic', 'operatic', 'dark', 'mysterious', 'danger', 'chase'],
                    contexts: ['classical music', 'opera', 'drama', 'chase scenes', 'dark themes']
                },
                intervals: {
                    characteristic: 'b2 (Neapolitan sixth)',
                    tension_points: ['b2', 'Major 7th'],
                    resolution_tendency: 'Neapolitan resolution',
                    harmonic_function: 'Classical dramatic harmony'
                }
            },

            enigmatic: {
                intervals: [0, 1, 4, 6, 8, 10, 11],
                emotional: { brightness: 0.4, energy: 0.6, darkness: 0.6, mystery: 0.95, tension: 0.8 },
                cultural: {
                    origins: ['Modern Classical', 'Experimental'],
                    period: '20th century',
                    traditions: ['Modern Classical', 'Experimental', 'Film Music'],
                    characteristics: 'Enigmatic, mysterious, modern'
                },
                semantic: {
                    categories: ['mysterious', 'enigmatic', 'modern', 'complex', 'puzzling'],
                    keywords: ['mysterious', 'enigmatic', 'modern', 'complex', 'puzzling', 'woods', 'mystery'],
                    contexts: ['mystery', 'puzzles', 'modern classical', 'enigmatic situations']
                },
                intervals: {
                    characteristic: 'Unique interval pattern, tritones',
                    tension_points: ['b2', 'Tritones', 'Major 7th'],
                    resolution_tendency: 'Enigmatic, unclear resolution',
                    harmonic_function: 'Modern experimental harmony'
                }
            }
        };
    }

    /**
     * Build cultural contexts for scales
     */
    _buildCulturalContexts() {
        return {
            western_classical: ['major', 'aeolian', 'harmonic', 'melodic'],
            jazz: ['dorian', 'mixolydian', 'altered', 'bebop_major', 'bebop_dominant'],
            blues: ['minor_pentatonic', 'blues_hexatonic', 'mixolydian'],
            rock: ['aeolian', 'dorian', 'mixolydian', 'minor_pentatonic'],
            metal: ['phrygian', 'locrian', 'harmonic', 'phrygian_dominant'],
            middle_eastern: ['hijaz', 'phrygian_dominant', 'maqam_bayati', 'persian'],
            spanish: ['phrygian', 'spanish_phrygian', 'flamenco'],
            celtic: ['dorian', 'mixolydian', 'major_pentatonic'],
            indian: ['raga_bhairav', 'raga_todi', 'raga_marwa'],
            impressionist: ['whole_tone', 'lydian', 'octatonic_dim'],
            folk: ['major_pentatonic', 'minor_pentatonic', 'major', 'aeolian']
        };
    }

    /**
     * Build emotional profiles for scale categories
     */
    _buildEmotionalProfiles() {
        return {
            dangerous: ['locrian', 'phrygian_dominant', 'altered', 'octatonic_dim'],
            dark: ['aeolian', 'phrygian', 'harmonic', 'locrian'],
            mysterious: ['dorian', 'whole_tone', 'octatonic_dim', 'hijaz'],
            bright: ['major', 'lydian', 'major_pentatonic'],
            energetic: ['mixolydian', 'phrygian', 'minor_pentatonic'],
            calm: ['major', 'aeolian', 'major_pentatonic'],
            exotic: ['hijaz', 'phrygian_dominant', 'persian', 'raga_bhairav'],
            ancient: ['dorian', 'phrygian', 'hijaz', 'maqam_rast'],
            spiritual: ['lydian', 'hijaz', 'raga_bhairav', 'whole_tone']
        };
    }

    /**
     * Build semantic associations
     */
    _buildSemanticAssociations() {
        return {
            // Danger/Threat
            danger: ['locrian', 'phrygian_dominant', 'altered', 'harmonic'],
            threat: ['phrygian', 'locrian', 'octatonic_dim'],
            fear: ['locrian', 'phrygian', 'altered'],
            
            // Nature
            forest: ['dorian', 'aeolian', 'major_pentatonic'],
            ocean: ['lydian', 'whole_tone', 'major'],
            mountain: ['dorian', 'major', 'lydian'],
            
            // Time/History
            ancient: ['dorian', 'phrygian', 'hijaz', 'maqam_rast'],
            medieval: ['dorian', 'phrygian', 'aeolian'],
            modern: ['altered', 'whole_tone', 'octatonic_dim'],
            
            // Emotions
            joy: ['major', 'lydian', 'major_pentatonic'],
            sadness: ['aeolian', 'harmonic', 'minor_pentatonic'],
            mystery: ['dorian', 'whole_tone', 'hijaz'],
            
            // Cultural
            spanish: ['phrygian', 'spanish_phrygian', 'flamenco'],
            arabic: ['hijaz', 'maqam_bayati', 'persian'],
            celtic: ['dorian', 'mixolydian', 'major_pentatonic'],
            indian: ['raga_bhairav', 'raga_todi', 'raga_kafi']
        };
    }

    /**
     * Build interval characteristics
     */
    _buildIntervalCharacteristics() {
        return {
            // Tension intervals
            minor_second: { tension: 0.9, character: 'harsh, dissonant' },
            major_second: { tension: 0.3, character: 'mild tension' },
            minor_third: { tension: 0.2, character: 'sad, minor' },
            major_third: { tension: 0.1, character: 'happy, major' },
            perfect_fourth: { tension: 0.4, character: 'stable, open' },
            tritone: { tension: 0.95, character: 'diabolical, unstable' },
            perfect_fifth: { tension: 0.05, character: 'perfect consonance' },
            minor_sixth: { tension: 0.6, character: 'melancholic' },
            major_sixth: { tension: 0.2, character: 'bright, open' },
            minor_seventh: { tension: 0.7, character: 'bluesy, unresolved' },
            major_seventh: { tension: 0.8, character: 'jazzy, sophisticated' },
            octave: { tension: 0.0, character: 'perfect unity' }
        };
    }

    /**
     * Generate explanation for how grading influenced a scale suggestion
     */
    _generateGradingExplanation(scaleName, gradingTier, gradingBonus, context = {}) {
        if (!this.musicTheoryEngine) return null;
        
        const gradingMode = this.musicTheoryEngine.gradingMode;
        const tierInfo = this.musicTheoryEngine.getGradingTierInfo(gradingTier);
        const { detailed = false } = context;
        
        let explanation = '';
        
        if (detailed) {
            explanation += `In ${gradingMode} grading mode, ${scaleName} scale receives a ${tierInfo.name} rating (tier ${gradingTier}). `;
        }
        
        // Mode-specific explanations
        if (gradingMode === 'functional') {
            const functionalExplanations = {
                4: `${scaleName} is highly functional with strong harmonic utility`,
                3: `${scaleName} provides good harmonic function with some complexity`,
                2: `${scaleName} offers moderate harmonic utility`,
                1: `${scaleName} has limited but interesting harmonic function`,
                0: `${scaleName} is experimental with unconventional harmonic function`
            };
            explanation += functionalExplanations[gradingTier] || 'Standard harmonic function';
            
        } else if (gradingMode === 'emotional') {
            const emotionalExplanations = {
                4: `${scaleName} creates bright, uplifting emotional character`,
                3: `${scaleName} provides warm, positive emotional qualities`,
                2: `${scaleName} offers balanced emotional expression`,
                1: `${scaleName} evokes melancholy or contemplative moods`,
                0: `${scaleName} creates deep, somber emotional atmosphere`
            };
            explanation += emotionalExplanations[gradingTier] || 'Neutral emotional character';
            
        } else if (gradingMode === 'color') {
            const colorExplanations = {
                4: `${scaleName} adds brilliant, complex harmonic colors`,
                3: `${scaleName} provides rich, sophisticated harmonic palette`,
                2: `${scaleName} offers natural, grounded harmonic colors`,
                1: `${scaleName} adds subtle harmonic complexity`,
                0: `${scaleName} creates deep, mysterious harmonic atmosphere`
            };
            explanation += colorExplanations[gradingTier] || 'Standard harmonic coloring';
        }
        
        if (gradingBonus > 0) {
            const bonusPercent = Math.round(gradingBonus * 100);
            explanation += ` This ${tierInfo.name} rating boosted its suggestion priority by ${bonusPercent}%.`;
        }
        
        return explanation;
    }

    /**
     * Get scales prioritized by current grading mode
     */
    getScalesByGradingTier(tier, context = {}) {
        if (!this.musicTheoryEngine) {
            return Object.keys(this.scaleDatabase);
        }
        
        const { key = 'C', maxResults = 10 } = context;
        const scaleNames = Object.keys(this.scaleDatabase);
        
        return scaleNames
            .filter(scaleName => {
                const scaleTier = this.musicTheoryEngine.calculateScaleGrade(
                    scaleName, 
                    { key, referenceScale: 'major' }
                );
                return scaleTier === tier;
            })
            .slice(0, maxResults);
    }

    /**
     * Compare scale suggestions across different grading modes
     */
    compareGradingPerspectives(wordCharacteristics, context = {}) {
        if (!this.musicTheoryEngine) {
            return { error: 'Grading comparison not available - no music theory engine connected.' };
        }
        
        const currentMode = this.musicTheoryEngine.gradingMode;
        const perspectives = {};
        
        ['functional', 'emotional', 'color'].forEach(mode => {
            this.musicTheoryEngine.setGradingMode(mode);
            
            const suggestions = this.getGradingInfluencedSuggestions(
                wordCharacteristics, 
                { ...context, maxSuggestions: 3 }
            );
            
            perspectives[mode] = {
                topSuggestion: suggestions[0],
                allSuggestions: suggestions,
                modeDescription: this._getGradingModeDescription(mode)
            };
        });
        
        // Restore original mode
        this.musicTheoryEngine.setGradingMode(currentMode);
        
        return perspectives;
    }

    /**
     * Get description of what each grading mode emphasizes
     */
    _getGradingModeDescription(mode) {
        const descriptions = {
            functional: 'Prioritizes scales based on harmonic utility and traditional function',
            emotional: 'Emphasizes scales that match emotional character and mood',
            color: 'Focuses on harmonic richness and tonal complexity'
        };
        return descriptions[mode] || 'Standard scale evaluation';
    }
}