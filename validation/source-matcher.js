/**
 * @module SourceMatcher
 * @description Intelligent algorithm for matching problematic references with appropriate replacements
 * @exports class SourceMatcher
 * @feature Prioritizes educational websites over generic sources
 * @feature Handles cultural and regional scale source selection
 * @feature Provides relevance scoring and replacement recommendations
 */

// Import VerifiedSourceDatabase if available
let VerifiedSourceDatabase;
if (typeof require !== 'undefined') {
    try {
        VerifiedSourceDatabase = require('./verified-source-database.js');
    } catch (e) {
        // Module not available, will use fallback methods
    }
} else if (typeof window !== 'undefined') {
    if (window.VerifiedSourceDatabase) VerifiedSourceDatabase = window.VerifiedSourceDatabase;
}

class SourceMatcher {
    constructor(options = {}) {
        this.sourceDatabase = VerifiedSourceDatabase ? 
            new VerifiedSourceDatabase() : null;
        
        this.matchingThreshold = options.matchingThreshold || 0.6;
        this.maxReplacements = options.maxReplacements || 3;
        this.prioritizeEducational = options.prioritizeEducational !== false;
        this.culturalSensitivity = options.culturalSensitivity || 'high';
        
        // Matching weights for different criteria
        this.weights = {
            scaleRelevance: 0.35,
            culturalAuthenticity: 0.25,
            academicCredibility: 0.20,
            accessibility: 0.15,
            sourceType: 0.05
        };
        
        if (!this.sourceDatabase) {
            console.warn('VerifiedSourceDatabase not available - using fallback matching methods');
        }
    }

    /**
     * Find best replacement sources for a problematic reference
     * @param {Object} problematicReference - The reference that needs replacement
     * @param {Object} scaleContext - Context about the scale being referenced
     * @returns {Promise<Array>} Array of replacement recommendations
     */
    async findReplacements(problematicReference, scaleContext) {
        try {
            // Analyze the problematic reference to understand what we're replacing
            const referenceAnalysis = this.analyzeProblematicReference(problematicReference);
            
            // Extract scale information from context
            const scaleInfo = this.extractScaleInformation(scaleContext);
            
            // Find candidate sources
            const candidates = await this.findCandidateSources(scaleInfo, referenceAnalysis);
            
            // Score and rank candidates
            const rankedCandidates = this.scoreAndRankCandidates(
                candidates, 
                scaleInfo, 
                referenceAnalysis
            );
            
            // Filter and format final recommendations
            const recommendations = this.formatRecommendations(
                rankedCandidates, 
                problematicReference,
                scaleInfo
            );
            
            return recommendations;
            
        } catch (error) {
            console.error('Error finding replacements:', error);
            return this.getFallbackReplacements(scaleContext);
        }
    }

    /**
     * Analyze a problematic reference to understand replacement needs
     * @param {Object} problematicReference - Reference to analyze
     * @returns {Object} Analysis results
     */
    analyzeProblematicReference(problematicReference) {
        const analysis = {
            issues: [],
            originalType: null,
            originalDomain: null,
            contentHints: [],
            replacementNeeds: []
        };

        if (!problematicReference) {
            analysis.issues.push('missing_reference');
            return analysis;
        }

        // Analyze URL if present
        if (problematicReference.url) {
            try {
                const url = new URL(problematicReference.url);
                analysis.originalDomain = url.hostname;
                
                // Check for problematic domains
                if (url.hostname.includes('wikipedia.org')) {
                    analysis.issues.push('wikipedia_source');
                    analysis.replacementNeeds.push('academic_alternative');
                }
                
                if (url.hostname.includes('localhost') || 
                    url.hostname.includes('127.0.0.1')) {
                    analysis.issues.push('local_url');
                    analysis.replacementNeeds.push('public_resource');
                }
                
                // Extract content hints from URL
                const urlPath = url.pathname.toLowerCase();
                if (urlPath.includes('scale')) analysis.contentHints.push('scale_theory');
                if (urlPath.includes('mode')) analysis.contentHints.push('modal_theory');
                if (urlPath.includes('jazz')) analysis.contentHints.push('jazz_theory');
                if (urlPath.includes('classical')) analysis.contentHints.push('classical_theory');
                
            } catch (error) {
                analysis.issues.push('invalid_url');
                analysis.replacementNeeds.push('valid_url');
            }
        }

        // Analyze reference type
        if (problematicReference.type) {
            analysis.originalType = problematicReference.type;
            
            if (problematicReference.type === 'wikipedia') {
                analysis.issues.push('inappropriate_source_type');
                analysis.replacementNeeds.push('educational_resource');
            }
        }

        // Analyze title and description for content hints
        const textContent = [
            problematicReference.title || '',
            problematicReference.description || ''
        ].join(' ').toLowerCase();

        const contentPatterns = {
            'scale_theory': ['scale', 'mode', 'interval'],
            'jazz_theory': ['jazz', 'bebop', 'improvisation'],
            'classical_theory': ['classical', 'baroque', 'romantic'],
            'world_music': ['traditional', 'folk', 'ethnic', 'cultural'],
            'academic': ['journal', 'research', 'study', 'analysis']
        };

        for (const [category, patterns] of Object.entries(contentPatterns)) {
            if (patterns.some(pattern => textContent.includes(pattern))) {
                analysis.contentHints.push(category);
            }
        }

        return analysis;
    }

    /**
     * Extract scale information from context
     * @param {Object} scaleContext - Scale context object
     * @returns {Object} Extracted scale information
     */
    extractScaleInformation(scaleContext) {
        const scaleInfo = {
            name: null,
            culturalContext: null,
            theoreticalFramework: null,
            musicalFunction: null,
            region: null,
            keywords: []
        };

        if (!scaleContext) {
            return scaleInfo;
        }

        // Extract basic scale information
        scaleInfo.name = scaleContext.scaleName || scaleContext.name;
        
        // Extract cultural context
        if (scaleContext.culturalContext) {
            scaleInfo.culturalContext = scaleContext.culturalContext.culturalGroup || 
                                      scaleContext.culturalContext.region;
            scaleInfo.region = scaleContext.culturalContext.region;
            scaleInfo.musicalFunction = scaleContext.culturalContext.musicalFunction;
        }

        // Extract keywords
        if (scaleContext.keywords && Array.isArray(scaleContext.keywords)) {
            scaleInfo.keywords = scaleContext.keywords;
        }

        // Infer theoretical framework from scale name
        if (scaleInfo.name) {
            scaleInfo.theoreticalFramework = this.inferTheoreticalFramework(scaleInfo.name);
        }

        return scaleInfo;
    }

    /**
     * Infer theoretical framework from scale name
     * @param {string} scaleName - Name of the scale
     * @returns {string} Theoretical framework
     */
    inferTheoreticalFramework(scaleName) {
        const frameworks = {
            'western_classical': ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'],
            'jazz_theory': ['bebop', 'altered', 'lydian_dominant', 'melodic'],
            'middle_eastern': ['maqam', 'hijaz', 'persian'],
            'indian_classical': ['raga'],
            'african_traditional': ['african', 'kora', 'mbira'],
            'latin_american': ['samba', 'bossa', 'tango', 'chacarera'],
            'contemporary': ['whole_tone', 'octatonic', 'augmented']
        };

        for (const [framework, patterns] of Object.entries(frameworks)) {
            if (patterns.some(pattern => scaleName.includes(pattern))) {
                return framework;
            }
        }

        return 'western_classical'; // Default
    }

    /**
     * Find candidate sources for replacement
     * @param {Object} scaleInfo - Scale information
     * @param {Object} referenceAnalysis - Analysis of problematic reference
     * @returns {Promise<Array>} Array of candidate sources
     */
    async findCandidateSources(scaleInfo, referenceAnalysis) {
        if (!this.sourceDatabase) {
            return this.getFallbackCandidates(scaleInfo);
        }

        try {
            // Use source database to find relevant sources
            const candidates = this.sourceDatabase.findSourcesForScale(
                scaleInfo.name, 
                {
                    culturalContext: scaleInfo.culturalContext,
                    theoreticalFramework: scaleInfo.theoreticalFramework,
                    region: scaleInfo.region
                }
            );

            // Add additional candidates based on reference analysis
            const additionalCandidates = this.findAdditionalCandidates(
                scaleInfo, 
                referenceAnalysis
            );

            return [...candidates, ...additionalCandidates];
            
        } catch (error) {
            console.error('Error finding candidates from database:', error);
            return this.getFallbackCandidates(scaleInfo);
        }
    }

    /**
     * Find additional candidates based on specific needs
     * @param {Object} scaleInfo - Scale information
     * @param {Object} referenceAnalysis - Reference analysis
     * @returns {Array} Additional candidate sources
     */
    findAdditionalCandidates(scaleInfo, referenceAnalysis) {
        const additionalCandidates = [];

        // If original was Wikipedia, prioritize educational resources
        if (referenceAnalysis.issues.includes('wikipedia_source')) {
            const educationalSources = this.sourceDatabase.getSourcesByType('educational_resources');
            additionalCandidates.push(...educationalSources.map(source => ({
                ...source,
                matchType: 'wikipedia_replacement',
                matchScore: source.relevanceScore * 0.9
            })));
        }

        // If cultural context is important, prioritize cultural resources
        if (scaleInfo.culturalContext && 
            !['western_classical', 'theoretical'].includes(scaleInfo.theoreticalFramework)) {
            
            const culturalSources = this.sourceDatabase.getSourcesByType('cultural_resources');
            additionalCandidates.push(...culturalSources.map(source => ({
                ...source,
                matchType: 'cultural_priority',
                matchScore: source.relevanceScore * 1.1
            })));
        }

        return additionalCandidates;
    }

    /**
     * Score and rank candidate sources
     * @param {Array} candidates - Candidate sources
     * @param {Object} scaleInfo - Scale information
     * @param {Object} referenceAnalysis - Reference analysis
     * @returns {Array} Ranked candidates with scores
     */
    scoreAndRankCandidates(candidates, scaleInfo, referenceAnalysis) {
        const scoredCandidates = candidates.map(candidate => {
            const score = this.calculateReplacementScore(candidate, scaleInfo, referenceAnalysis);
            return {
                ...candidate,
                replacementScore: score,
                scoreBreakdown: this.getScoreBreakdown(candidate, scaleInfo, referenceAnalysis)
            };
        });

        // Sort by replacement score (highest first)
        scoredCandidates.sort((a, b) => b.replacementScore - a.replacementScore);

        // Remove duplicates based on URL
        const uniqueCandidates = [];
        const seenUrls = new Set();

        for (const candidate of scoredCandidates) {
            if (!seenUrls.has(candidate.url)) {
                seenUrls.add(candidate.url);
                uniqueCandidates.push(candidate);
            }
        }

        return uniqueCandidates;
    }

    /**
     * Calculate replacement score for a candidate
     * @param {Object} candidate - Candidate source
     * @param {Object} scaleInfo - Scale information
     * @param {Object} referenceAnalysis - Reference analysis
     * @returns {number} Replacement score (0-1)
     */
    calculateReplacementScore(candidate, scaleInfo, referenceAnalysis) {
        let score = 0;

        // Scale relevance score
        const scaleRelevanceScore = this.calculateScaleRelevance(candidate, scaleInfo);
        score += scaleRelevanceScore * this.weights.scaleRelevance;

        // Cultural authenticity score
        const culturalScore = this.calculateCulturalScore(candidate, scaleInfo);
        score += culturalScore * this.weights.culturalAuthenticity;

        // Academic credibility score
        const credibilityScore = this.calculateCredibilityScore(candidate);
        score += credibilityScore * this.weights.academicCredibility;

        // Accessibility score
        const accessibilityScore = this.calculateAccessibilityScore(candidate);
        score += accessibilityScore * this.weights.accessibility;

        // Source type preference score
        const sourceTypeScore = this.calculateSourceTypeScore(candidate, referenceAnalysis);
        score += sourceTypeScore * this.weights.sourceType;

        // Apply bonuses and penalties
        score = this.applyScoreAdjustments(score, candidate, scaleInfo, referenceAnalysis);

        return Math.min(Math.max(score, 0), 1);
    }

    /**
     * Calculate scale relevance score
     * @param {Object} candidate - Candidate source
     * @param {Object} scaleInfo - Scale information
     * @returns {number} Relevance score (0-1)
     */
    calculateScaleRelevance(candidate, scaleInfo) {
        let relevance = 0;

        if (!candidate.scaleTopics || !scaleInfo.name) {
            return 0.3; // Default low relevance
        }

        // Exact scale match
        if (candidate.scaleTopics.includes(scaleInfo.name)) {
            relevance += 0.8;
        }

        // Category match
        const scaleCategory = this.inferTheoreticalFramework(scaleInfo.name);
        const categoryKeywords = {
            'western_classical': ['major', 'minor', 'modes', 'classical'],
            'jazz_theory': ['jazz', 'bebop', 'improvisation'],
            'middle_eastern': ['maqam', 'arabic', 'middle_eastern'],
            'indian_classical': ['raga', 'indian', 'classical'],
            'african_traditional': ['african', 'traditional'],
            'latin_american': ['latin', 'south_american']
        };

        const categoryWords = categoryKeywords[scaleCategory] || [];
        const matchingKeywords = categoryWords.filter(keyword => 
            candidate.scaleTopics.some(topic => topic.includes(keyword))
        );

        relevance += (matchingKeywords.length / categoryWords.length) * 0.4;

        // General music theory coverage
        if (candidate.scaleTopics.includes('all_scales') || 
            candidate.scaleTopics.includes('music_theory')) {
            relevance += 0.2;
        }

        return Math.min(relevance, 1);
    }

    /**
     * Calculate cultural authenticity score
     * @param {Object} candidate - Candidate source
     * @param {Object} scaleInfo - Scale information
     * @returns {number} Cultural score (0-1)
     */
    calculateCulturalScore(candidate, scaleInfo) {
        let score = 0.5; // Default neutral score

        if (!scaleInfo.culturalContext) {
            return score;
        }

        // Check if source has cultural authenticity marker
        if (candidate.culturalAuthenticity === 'authentic') {
            score += 0.3;
        }

        // Check cultural context alignment
        if (candidate.culturalContexts) {
            const contextMatch = candidate.culturalContexts.some(context => 
                context.includes(scaleInfo.culturalContext.toLowerCase()) ||
                scaleInfo.culturalContext.toLowerCase().includes(context)
            );
            
            if (contextMatch) {
                score += 0.4;
            }
        }

        // Penalty for cultural mismatch in sensitive contexts
        if (this.culturalSensitivity === 'high' && 
            scaleInfo.theoreticalFramework !== 'western_classical') {
            
            const isWesternOnlySource = candidate.culturalContexts && 
                candidate.culturalContexts.every(context => 
                    context.includes('western') || context.includes('european')
                );
            
            if (isWesternOnlySource) {
                score -= 0.3;
            }
        }

        return Math.min(Math.max(score, 0), 1);
    }

    /**
     * Calculate academic credibility score
     * @param {Object} candidate - Candidate source
     * @returns {number} Credibility score (0-1)
     */
    calculateCredibilityScore(candidate) {
        const credibilityMap = {
            'highest': 1.0,
            'high': 0.8,
            'medium-high': 0.7,
            'medium': 0.5,
            'low': 0.2
        };

        const baseScore = credibilityMap[candidate.academicCredibility] || 0.5;
        
        // Bonus for peer review
        if (candidate.peerReviewed) {
            return Math.min(baseScore + 0.1, 1.0);
        }

        return baseScore;
    }

    /**
     * Calculate accessibility score
     * @param {Object} candidate - Candidate source
     * @returns {number} Accessibility score (0-1)
     */
    calculateAccessibilityScore(candidate) {
        const accessibilityMap = {
            'verified': 1.0,
            'subscription_required': 0.6,
            'limited_access': 0.4,
            'unknown': 0.3,
            'inaccessible': 0.0
        };

        return accessibilityMap[candidate.accessibilityStatus] || 0.5;
    }

    /**
     * Calculate source type preference score
     * @param {Object} candidate - Candidate source
     * @param {Object} referenceAnalysis - Reference analysis
     * @returns {number} Source type score (0-1)
     */
    calculateSourceTypeScore(candidate, referenceAnalysis) {
        let score = 0.5;

        // Prioritize educational resources if configured
        if (this.prioritizeEducational && candidate.type === 'educational_resource') {
            score += 0.3;
        }

        // Bonus for replacing inappropriate source types
        if (referenceAnalysis.issues.includes('wikipedia_source') && 
            candidate.type !== 'wikipedia') {
            score += 0.2;
        }

        // Bonus for academic sources when replacing non-academic
        if (candidate.type === 'academic_database' && 
            !referenceAnalysis.originalType?.includes('academic')) {
            score += 0.2;
        }

        return Math.min(score, 1);
    }

    /**
     * Apply score adjustments based on specific criteria
     * @param {number} baseScore - Base calculated score
     * @param {Object} candidate - Candidate source
     * @param {Object} scaleInfo - Scale information
     * @param {Object} referenceAnalysis - Reference analysis
     * @returns {number} Adjusted score
     */
    applyScoreAdjustments(baseScore, candidate, scaleInfo, referenceAnalysis) {
        let adjustedScore = baseScore;

        // Bonus for interactive features
        if (candidate.interactiveFeatures) {
            adjustedScore += 0.05;
        }

        // Bonus for recent verification
        if (candidate.lastVerified) {
            const verificationAge = Date.now() - new Date(candidate.lastVerified).getTime();
            const daysSinceVerification = verificationAge / (1000 * 60 * 60 * 24);
            
            if (daysSinceVerification < 30) {
                adjustedScore += 0.05;
            }
        }

        // Penalty for subscription required in educational contexts
        if (candidate.accessibilityStatus === 'subscription_required' && 
            scaleInfo.theoreticalFramework === 'western_classical') {
            adjustedScore -= 0.1;
        }

        // Bonus for original/authoritative sources
        if (candidate.originalSource || candidate.authoritative) {
            adjustedScore += 0.1;
        }

        return adjustedScore;
    }

    /**
     * Get detailed score breakdown for transparency
     * @param {Object} candidate - Candidate source
     * @param {Object} scaleInfo - Scale information
     * @param {Object} referenceAnalysis - Reference analysis
     * @returns {Object} Score breakdown
     */
    getScoreBreakdown(candidate, scaleInfo, referenceAnalysis) {
        return {
            scaleRelevance: this.calculateScaleRelevance(candidate, scaleInfo),
            culturalAuthenticity: this.calculateCulturalScore(candidate, scaleInfo),
            academicCredibility: this.calculateCredibilityScore(candidate),
            accessibility: this.calculateAccessibilityScore(candidate),
            sourceType: this.calculateSourceTypeScore(candidate, referenceAnalysis),
            weights: this.weights
        };
    }

    /**
     * Format final recommendations
     * @param {Array} rankedCandidates - Ranked candidate sources
     * @param {Object} originalReference - Original problematic reference
     * @param {Object} scaleInfo - Scale information
     * @returns {Array} Formatted recommendations
     */
    formatRecommendations(rankedCandidates, originalReference, scaleInfo) {
        const recommendations = rankedCandidates
            .filter(candidate => candidate.replacementScore >= this.matchingThreshold)
            .slice(0, this.maxReplacements)
            .map((candidate, index) => ({
                rank: index + 1,
                source: {
                    url: candidate.url,
                    title: candidate.title,
                    description: candidate.description,
                    type: candidate.type,
                    authors: candidate.authors || [],
                    publisher: candidate.publisher,
                    year: candidate.year
                },
                replacementScore: candidate.replacementScore,
                scoreBreakdown: candidate.scoreBreakdown,
                matchType: candidate.matchType || 'standard',
                improvementReasons: this.generateImprovementReasons(candidate, originalReference),
                culturalSuitability: this.assessCulturalSuitability(candidate, scaleInfo),
                accessibilityInfo: {
                    status: candidate.accessibilityStatus,
                    requiresSubscription: candidate.accessibilityStatus === 'subscription_required',
                    lastVerified: candidate.lastVerified
                }
            }));

        return recommendations;
    }

    /**
     * Generate reasons why this replacement is an improvement
     * @param {Object} candidate - Candidate source
     * @param {Object} originalReference - Original reference
     * @returns {Array} Array of improvement reasons
     */
    generateImprovementReasons(candidate, originalReference) {
        const reasons = [];

        if (candidate.academicCredibility === 'highest' || candidate.academicCredibility === 'high') {
            reasons.push('Higher academic credibility');
        }

        if (candidate.accessibilityStatus === 'verified') {
            reasons.push('Verified accessibility');
        }

        if (candidate.culturalAuthenticity === 'authentic') {
            reasons.push('Culturally authentic source');
        }

        if (candidate.type === 'educational_resource') {
            reasons.push('Dedicated educational resource');
        }

        if (candidate.interactiveFeatures) {
            reasons.push('Interactive learning features');
        }

        if (candidate.peerReviewed) {
            reasons.push('Peer-reviewed content');
        }

        return reasons;
    }

    /**
     * Assess cultural suitability of a source for the scale
     * @param {Object} candidate - Candidate source
     * @param {Object} scaleInfo - Scale information
     * @returns {Object} Cultural suitability assessment
     */
    assessCulturalSuitability(candidate, scaleInfo) {
        const assessment = {
            suitable: true,
            level: 'appropriate',
            notes: []
        };

        if (!scaleInfo.culturalContext) {
            assessment.level = 'neutral';
            assessment.notes.push('No specific cultural context required');
            return assessment;
        }

        // Check for cultural alignment
        const hasCulturalAlignment = candidate.culturalContexts && 
            candidate.culturalContexts.some(context => 
                context.includes(scaleInfo.culturalContext.toLowerCase())
            );

        if (hasCulturalAlignment) {
            assessment.level = 'highly_appropriate';
            assessment.notes.push('Strong cultural alignment');
        } else if (candidate.culturalContexts && 
                   candidate.culturalContexts.includes('all_cultures')) {
            assessment.level = 'appropriate';
            assessment.notes.push('Covers multiple cultural contexts');
        } else {
            assessment.level = 'limited';
            assessment.notes.push('May not cover specific cultural context');
        }

        return assessment;
    }

    /**
     * Get fallback candidates when database is not available
     * @param {Object} scaleInfo - Scale information
     * @returns {Array} Fallback candidate sources
     */
    getFallbackCandidates(scaleInfo) {
        const fallbackSources = [
            {
                url: "https://www.musictheory.net/lessons/25",
                title: "Music Theory.net - Scales and Modes",
                description: "Comprehensive music theory resource",
                type: "educational_resource",
                relevanceScore: 0.8,
                academicCredibility: "high",
                accessibilityStatus: "verified"
            },
            {
                url: "https://www.teoria.com/tutorials/scales/",
                title: "Teoria - Scale Theory",
                description: "Interactive scale theory tutorials",
                type: "educational_resource",
                relevanceScore: 0.75,
                academicCredibility: "high",
                accessibilityStatus: "verified"
            }
        ];

        return fallbackSources.map(source => ({
            ...source,
            matchType: 'fallback',
            replacementScore: source.relevanceScore * 0.7
        }));
    }

    /**
     * Get fallback replacements when matching fails
     * @param {Object} scaleContext - Scale context
     * @returns {Array} Fallback recommendations
     */
    getFallbackReplacements(scaleContext) {
        const fallbackCandidates = this.getFallbackCandidates(
            this.extractScaleInformation(scaleContext)
        );

        return fallbackCandidates.map((candidate, index) => ({
            rank: index + 1,
            source: {
                url: candidate.url,
                title: candidate.title,
                description: candidate.description,
                type: candidate.type
            },
            replacementScore: candidate.replacementScore,
            matchType: 'fallback',
            improvementReasons: ['Reliable educational resource'],
            culturalSuitability: {
                suitable: true,
                level: 'neutral',
                notes: ['General music theory resource']
            },
            accessibilityInfo: {
                status: candidate.accessibilityStatus,
                requiresSubscription: false
            }
        }));
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SourceMatcher;
} else if (typeof window !== 'undefined') {
    window.SourceMatcher = SourceMatcher;
}