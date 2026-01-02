/**
 * @module SharedReferenceVerifier
 * @description Verifies that shared URLs actually cover all referencing scales
 * @exports class SharedReferenceVerifier
 * @feature Verify shared URLs actually cover all referencing scales
 * @feature Analyze content breadth and scale coverage
 * @feature Generate recommendations for scale-specific alternatives
 */

// Import dependencies if available
let ContentAnalyzer, DuplicateDetector;
if (typeof require !== 'undefined') {
    try {
        ContentAnalyzer = require('./content-analyzer.js');
        DuplicateDetector = require('./duplicate-detector.js');
    } catch (e) {
        // Modules not available, will use fallback methods
    }
} else if (typeof window !== 'undefined') {
    if (window.ContentAnalyzer) ContentAnalyzer = window.ContentAnalyzer;
    if (window.DuplicateDetector) DuplicateDetector = window.DuplicateDetector;
}

class SharedReferenceVerifier {
    constructor(options = {}) {
        this.options = {
            minCoverageScore: options.minCoverageScore || 0.7, // Minimum score for adequate coverage
            maxAcceptableSharing: options.maxAcceptableSharing || 5, // Max scales that can share a reference
            requireExplicitMention: options.requireExplicitMention || true, // Require explicit scale name mention
            ...options
        };

        // Initialize content analyzer if available
        if (ContentAnalyzer) {
            this.contentAnalyzer = new ContentAnalyzer(options.contentAnalyzer || {});
        } else {
            this.contentAnalyzer = null;
            console.warn('ContentAnalyzer not available - using fallback verification methods');
        }

        // Initialize duplicate detector for shared reference identification
        if (DuplicateDetector) {
            this.duplicateDetector = new DuplicateDetector(options.duplicateDetector || {});
        } else {
            this.duplicateDetector = null;
            console.warn('DuplicateDetector not available - limited shared reference detection');
        }
    }

    /**
     * Verify content coverage for all shared references
     * @param {Object} scaleCitations - Scale citations object from MusicTheoryEngine
     * @param {Object} duplicateResults - Results from duplicate detection (optional)
     * @returns {Promise<Object>} Content verification results
     */
    async verifySharedReferences(scaleCitations, duplicateResults = null) {
        if (!scaleCitations || typeof scaleCitations !== 'object') {
            throw new Error('Scale citations must be a valid object');
        }

        // Get duplicate detection results if not provided
        if (!duplicateResults && this.duplicateDetector) {
            duplicateResults = this.duplicateDetector.detectDuplicateUrls(scaleCitations);
        }

        const results = {
            totalSharedReferences: 0,
            verifiedReferences: 0,
            inadequateReferences: 0,
            verificationResults: [],
            recommendations: [],
            summary: {
                adequateCoverage: 0,
                inadequateCoverage: 0,
                unverifiable: 0,
                needsReplacement: 0
            },
            verifiedAt: new Date().toISOString()
        };

        // Process each shared reference
        if (duplicateResults && duplicateResults.duplicateGroups) {
            for (const duplicateGroup of duplicateResults.duplicateGroups) {
                results.totalSharedReferences++;
                
                const verificationResult = await this.verifySharedReference(
                    duplicateGroup.url,
                    duplicateGroup.scales,
                    scaleCitations
                );

                verificationResult.sharedByScales = duplicateGroup.sharedByScales;
                verificationResult.duplicateAnalysis = duplicateGroup.analysis;

                results.verificationResults.push(verificationResult);

                // Update summary counts
                if (verificationResult.adequateCoverage) {
                    results.verifiedReferences++;
                    results.summary.adequateCoverage++;
                } else if (verificationResult.verifiable) {
                    results.inadequateReferences++;
                    results.summary.inadequateCoverage++;
                    if (verificationResult.recommendReplacement) {
                        results.summary.needsReplacement++;
                    }
                } else {
                    results.summary.unverifiable++;
                }

                // Generate recommendations
                const recommendations = this.generateVerificationRecommendations(verificationResult);
                results.recommendations.push(...recommendations);
            }
        }

        // Sort recommendations by priority
        results.recommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });

        return results;
    }

    /**
     * Verify content coverage for a single shared reference
     * @param {string} url - URL to verify
     * @param {Array} scaleNames - Names of scales sharing this reference
     * @param {Object} scaleCitations - Scale citations object
     * @returns {Promise<Object>} Verification result for this reference
     */
    async verifySharedReference(url, scaleNames, scaleCitations) {
        const result = {
            url,
            scaleNames,
            verifiable: false,
            adequateCoverage: false,
            coverageScore: 0,
            scaleCoverage: {},
            contentAnalysis: null,
            issues: [],
            recommendations: [],
            recommendReplacement: false,
            verifiedAt: new Date().toISOString()
        };

        try {
            // Analyze content if content analyzer is available
            if (this.contentAnalyzer) {
                result.contentAnalysis = await this.analyzeSharedContent(url, scaleNames, scaleCitations);
                result.verifiable = true;
                
                // Calculate overall coverage score
                result.coverageScore = this.calculateCoverageScore(result.contentAnalysis, scaleNames);
                result.adequateCoverage = result.coverageScore >= this.options.minCoverageScore;
                
                // Analyze coverage for each scale
                for (const scaleName of scaleNames) {
                    result.scaleCoverage[scaleName] = this.analyzeScaleCoverage(
                        result.contentAnalysis,
                        scaleName,
                        scaleCitations[scaleName]
                    );
                }
            } else {
                // Fallback analysis based on URL structure and scale context
                result.contentAnalysis = this.performFallbackAnalysis(url, scaleNames, scaleCitations);
                result.verifiable = false; // Cannot fully verify without content analysis
                result.coverageScore = result.contentAnalysis.estimatedScore || 0;
            }

            // Identify issues with shared reference
            result.issues = this.identifyContentIssues(result, scaleNames, scaleCitations);
            
            // Determine if replacement is recommended
            result.recommendReplacement = this.shouldRecommendReplacement(result, scaleNames);

            // Generate specific recommendations
            result.recommendations = this.generateSpecificRecommendations(result, scaleNames, scaleCitations);

        } catch (error) {
            result.issues.push(`Verification error: ${error.message}`);
            result.verifiable = false;
        }

        return result;
    }

    /**
     * Analyze content of a shared reference for scale coverage
     * @param {string} url - URL to analyze
     * @param {Array} scaleNames - Names of scales sharing this reference
     * @param {Object} scaleCitations - Scale citations object
     * @returns {Promise<Object>} Content analysis result
     */
    async analyzeSharedContent(url, scaleNames, scaleCitations) {
        if (!this.contentAnalyzer) {
            throw new Error('Content analyzer not available');
        }

        // Prepare keywords for all scales
        const allKeywords = new Set();
        const scaleKeywords = {};

        for (const scaleName of scaleNames) {
            const scaleData = scaleCitations[scaleName];
            const keywords = this.generateScaleKeywords(scaleName, scaleData);
            scaleKeywords[scaleName] = keywords;
            keywords.forEach(keyword => allKeywords.add(keyword));
        }

        // Analyze content for all relevant keywords
        const contentAnalysis = await this.contentAnalyzer.analyzeScaleContent(
            null, // URL will be fetched by content analyzer
            scaleNames.join(', '),
            Array.from(allKeywords),
            { url, multipleScales: true }
        );

        // Enhance analysis with scale-specific results
        contentAnalysis.scaleSpecificAnalysis = {};
        for (const scaleName of scaleNames) {
            contentAnalysis.scaleSpecificAnalysis[scaleName] = 
                await this.analyzeContentForSpecificScale(contentAnalysis, scaleName, scaleKeywords[scaleName]);
        }

        return contentAnalysis;
    }

    /**
     * Analyze content coverage for a specific scale
     * @param {Object} contentAnalysis - Overall content analysis
     * @param {string} scaleName - Name of the scale
     * @param {Array} scaleKeywords - Keywords for this scale
     * @returns {Object} Scale-specific coverage analysis
     */
    async analyzeContentForSpecificScale(contentAnalysis, scaleName, scaleKeywords) {
        const analysis = {
            scaleName,
            explicitMention: false,
            keywordMatches: 0,
            totalKeywords: scaleKeywords.length,
            coverageScore: 0,
            relevantSections: [],
            issues: []
        };

        if (!contentAnalysis.content) {
            analysis.issues.push('No content available for analysis');
            return analysis;
        }

        const content = contentAnalysis.content.toLowerCase();
        const scaleNameLower = scaleName.toLowerCase().replace(/_/g, ' ');

        // Check for explicit mention of scale name
        analysis.explicitMention = content.includes(scaleNameLower) || 
                                  content.includes(scaleName.toLowerCase());

        // Count keyword matches
        for (const keyword of scaleKeywords) {
            if (content.includes(keyword.toLowerCase())) {
                analysis.keywordMatches++;
            }
        }

        // Calculate coverage score
        analysis.coverageScore = analysis.keywordMatches / analysis.totalKeywords;
        
        // Boost score for explicit mention
        if (analysis.explicitMention) {
            analysis.coverageScore = Math.min(1.0, analysis.coverageScore + 0.3);
        }

        // Identify issues
        if (!analysis.explicitMention && this.options.requireExplicitMention) {
            analysis.issues.push('Scale name not explicitly mentioned in content');
        }

        if (analysis.coverageScore < 0.3) {
            analysis.issues.push('Very low keyword coverage suggests minimal relevance');
        }

        return analysis;
    }

    /**
     * Perform fallback analysis when content analyzer is not available
     * @param {string} url - URL to analyze
     * @param {Array} scaleNames - Names of scales sharing this reference
     * @param {Object} scaleCitations - Scale citations object
     * @returns {Object} Fallback analysis result
     */
    performFallbackAnalysis(url, scaleNames, scaleCitations) {
        const analysis = {
            method: 'fallback',
            url,
            scaleNames,
            estimatedScore: 0,
            urlAnalysis: {},
            culturalCompatibility: {},
            recommendations: []
        };

        const urlLower = url.toLowerCase();

        // Analyze URL structure for clues
        analysis.urlAnalysis = {
            domain: this.extractDomain(url),
            isEducational: this.isEducationalDomain(url),
            isAcademic: this.isAcademicDomain(url),
            containsScaleNames: scaleNames.some(name => 
                urlLower.includes(name.toLowerCase().replace(/_/g, '-')) ||
                urlLower.includes(name.toLowerCase().replace(/_/g, ' '))
            )
        };

        // Estimate score based on URL analysis
        let score = 0;
        if (analysis.urlAnalysis.isEducational) score += 0.3;
        if (analysis.urlAnalysis.isAcademic) score += 0.4;
        if (analysis.urlAnalysis.containsScaleNames) score += 0.2;

        // Analyze cultural compatibility
        analysis.culturalCompatibility = this.analyzeCulturalCompatibilityForSharing(scaleNames, scaleCitations);
        
        if (!analysis.culturalCompatibility.compatible) {
            score -= 0.3; // Reduce score for incompatible cultural contexts
            analysis.recommendations.push('Scales from different cultural contexts should have separate references');
        }

        analysis.estimatedScore = Math.max(0, Math.min(1, score));

        return analysis;
    }

    /**
     * Calculate overall coverage score for shared reference
     * @param {Object} contentAnalysis - Content analysis result
     * @param {Array} scaleNames - Names of scales sharing the reference
     * @returns {number} Coverage score (0-1)
     */
    calculateCoverageScore(contentAnalysis, scaleNames) {
        if (!contentAnalysis.scaleSpecificAnalysis) {
            return contentAnalysis.estimatedScore || 0;
        }

        let totalScore = 0;
        let validScales = 0;

        for (const scaleName of scaleNames) {
            const scaleAnalysis = contentAnalysis.scaleSpecificAnalysis[scaleName];
            if (scaleAnalysis && typeof scaleAnalysis.coverageScore === 'number') {
                totalScore += scaleAnalysis.coverageScore;
                validScales++;
            }
        }

        return validScales > 0 ? totalScore / validScales : 0;
    }

    /**
     * Analyze coverage for a specific scale
     * @param {Object} contentAnalysis - Content analysis result
     * @param {string} scaleName - Name of the scale
     * @param {Object} scaleData - Scale data from citations
     * @returns {Object} Scale coverage analysis
     */
    analyzeScaleCoverage(contentAnalysis, scaleName, scaleData) {
        const coverage = {
            scaleName,
            adequate: false,
            score: 0,
            issues: [],
            strengths: []
        };

        if (contentAnalysis.scaleSpecificAnalysis && contentAnalysis.scaleSpecificAnalysis[scaleName]) {
            const scaleAnalysis = contentAnalysis.scaleSpecificAnalysis[scaleName];
            coverage.score = scaleAnalysis.coverageScore;
            coverage.adequate = coverage.score >= this.options.minCoverageScore;
            coverage.issues = [...scaleAnalysis.issues];

            if (scaleAnalysis.explicitMention) {
                coverage.strengths.push('Scale explicitly mentioned in content');
            }

            if (scaleAnalysis.keywordMatches > scaleAnalysis.totalKeywords * 0.5) {
                coverage.strengths.push('Good keyword coverage');
            }
        } else {
            coverage.issues.push('Unable to analyze scale-specific coverage');
        }

        return coverage;
    }

    /**
     * Identify issues with shared reference content
     * @param {Object} verificationResult - Verification result
     * @param {Array} scaleNames - Names of scales sharing the reference
     * @param {Object} scaleCitations - Scale citations object
     * @returns {Array} Array of identified issues
     */
    identifyContentIssues(verificationResult, scaleNames, scaleCitations) {
        const issues = [];

        // Check if too many scales are sharing the reference
        if (scaleNames.length > this.options.maxAcceptableSharing) {
            issues.push(`Reference shared by ${scaleNames.length} scales - likely too generic`);
        }

        // Check coverage adequacy
        if (verificationResult.verifiable && !verificationResult.adequateCoverage) {
            issues.push(`Coverage score ${verificationResult.coverageScore.toFixed(2)} below minimum ${this.options.minCoverageScore}`);
        }

        // Check for cultural incompatibility
        const culturalAnalysis = this.analyzeCulturalCompatibilityForSharing(scaleNames, scaleCitations);
        if (!culturalAnalysis.compatible) {
            issues.push('Scales from incompatible cultural contexts sharing reference');
            issues.push(...culturalAnalysis.reasons);
        }

        // Check individual scale coverage
        if (verificationResult.scaleCoverage) {
            for (const [scaleName, coverage] of Object.entries(verificationResult.scaleCoverage)) {
                if (!coverage.adequate) {
                    issues.push(`Inadequate coverage for scale: ${scaleName}`);
                }
            }
        }

        return issues;
    }

    /**
     * Determine if replacement should be recommended
     * @param {Object} verificationResult - Verification result
     * @param {Array} scaleNames - Names of scales sharing the reference
     * @returns {boolean} Whether replacement is recommended
     */
    shouldRecommendReplacement(verificationResult, scaleNames) {
        // Recommend replacement if coverage is inadequate
        if (verificationResult.verifiable && !verificationResult.adequateCoverage) {
            return true;
        }

        // Recommend replacement if too many scales are sharing
        if (scaleNames.length > this.options.maxAcceptableSharing) {
            return true;
        }

        // Recommend replacement if more than half the scales have inadequate coverage
        if (verificationResult.scaleCoverage) {
            const inadequateCount = Object.values(verificationResult.scaleCoverage)
                .filter(coverage => !coverage.adequate).length;
            
            if (inadequateCount > scaleNames.length / 2) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate specific recommendations for a verification result
     * @param {Object} verificationResult - Verification result
     * @param {Array} scaleNames - Names of scales sharing the reference
     * @param {Object} scaleCitations - Scale citations object
     * @returns {Array} Array of specific recommendations
     */
    generateSpecificRecommendations(verificationResult, scaleNames, scaleCitations) {
        const recommendations = [];

        if (verificationResult.recommendReplacement) {
            recommendations.push({
                type: 'replacement',
                action: 'Replace with scale-specific references',
                reason: 'Shared reference does not adequately cover all scales'
            });

            // Suggest specific replacement strategies
            const culturalGroups = this.groupScalesByCulture(scaleNames, scaleCitations);
            for (const [culture, scales] of Object.entries(culturalGroups)) {
                recommendations.push({
                    type: 'cultural_grouping',
                    action: `Find ${culture}-specific reference for scales: ${scales.join(', ')}`,
                    reason: 'Group scales by cultural context for appropriate references'
                });
            }
        } else if (verificationResult.verifiable && verificationResult.adequateCoverage) {
            recommendations.push({
                type: 'verification',
                action: 'Verify content actually discusses all referenced scales',
                reason: 'Shared reference appears adequate but needs manual verification'
            });
        }

        // Recommendations for specific scale coverage issues
        if (verificationResult.scaleCoverage) {
            for (const [scaleName, coverage] of Object.entries(verificationResult.scaleCoverage)) {
                if (!coverage.adequate) {
                    recommendations.push({
                        type: 'scale_specific',
                        action: `Find dedicated reference for ${scaleName}`,
                        reason: `Current shared reference inadequately covers ${scaleName}`
                    });
                }
            }
        }

        return recommendations;
    }

    /**
     * Generate verification recommendations from results
     * @param {Object} verificationResult - Single verification result
     * @returns {Array} Array of recommendation objects
     */
    generateVerificationRecommendations(verificationResult) {
        const recommendations = [];

        if (verificationResult.recommendReplacement) {
            recommendations.push({
                priority: 'high',
                type: 'shared_reference_replacement',
                url: verificationResult.url,
                affectedScales: verificationResult.scaleNames,
                issue: 'Shared reference inadequately covers referenced scales',
                action: 'Replace with scale-specific references',
                details: verificationResult.issues,
                coverageScore: verificationResult.coverageScore
            });
        } else if (!verificationResult.verifiable) {
            recommendations.push({
                priority: 'medium',
                type: 'manual_verification_needed',
                url: verificationResult.url,
                affectedScales: verificationResult.scaleNames,
                issue: 'Cannot automatically verify content coverage',
                action: 'Manually verify content covers all referenced scales',
                details: ['Content analysis not available - manual review required']
            });
        } else if (verificationResult.adequateCoverage) {
            recommendations.push({
                priority: 'low',
                type: 'verification_passed',
                url: verificationResult.url,
                affectedScales: verificationResult.scaleNames,
                issue: 'Shared reference appears to adequately cover scales',
                action: 'Monitor for future changes',
                details: ['Reference passed automated verification']
            });
        }

        return recommendations;
    }

    /**
     * Analyze cultural compatibility for scale sharing
     * @param {Array} scaleNames - Names of scales
     * @param {Object} scaleCitations - Scale citations object
     * @returns {Object} Cultural compatibility analysis
     */
    analyzeCulturalCompatibilityForSharing(scaleNames, scaleCitations) {
        const regions = new Set();
        const culturalGroups = new Set();

        for (const scaleName of scaleNames) {
            const scaleData = scaleCitations[scaleName];
            if (scaleData && scaleData.culturalContext) {
                if (scaleData.culturalContext.region) {
                    regions.add(scaleData.culturalContext.region);
                }
                if (scaleData.culturalContext.culturalGroup) {
                    culturalGroups.add(scaleData.culturalContext.culturalGroup);
                }
            }
        }

        const analysis = {
            compatible: true,
            reasons: [],
            regions: Array.from(regions),
            culturalGroups: Array.from(culturalGroups)
        };

        // Check for incompatible regions
        const incompatiblePairs = [
            ['Western Europe', 'Middle East'],
            ['Western Europe', 'Africa'],
            ['Western Europe', 'South America'],
            ['Middle East', 'Africa'],
            ['Africa', 'South America']
        ];

        for (const [region1, region2] of incompatiblePairs) {
            if (regions.has(region1) && regions.has(region2)) {
                analysis.compatible = false;
                analysis.reasons.push(`Incompatible cultural regions: ${region1} and ${region2}`);
            }
        }

        return analysis;
    }

    /**
     * Group scales by cultural context
     * @param {Array} scaleNames - Names of scales
     * @param {Object} scaleCitations - Scale citations object
     * @returns {Object} Scales grouped by cultural context
     */
    groupScalesByCulture(scaleNames, scaleCitations) {
        const groups = {};

        for (const scaleName of scaleNames) {
            const scaleData = scaleCitations[scaleName];
            let groupKey = 'unknown';

            if (scaleData && scaleData.culturalContext) {
                if (scaleData.culturalContext.region) {
                    groupKey = scaleData.culturalContext.region;
                } else if (scaleData.culturalContext.culturalGroup) {
                    groupKey = scaleData.culturalContext.culturalGroup;
                }
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(scaleName);
        }

        return groups;
    }

    /**
     * Generate keywords for scale content analysis
     * @param {string} scaleName - Name of the scale
     * @param {Object} scaleData - Scale data object
     * @returns {Array} Array of keywords for content matching
     */
    generateScaleKeywords(scaleName, scaleData) {
        const keywords = [scaleName];
        
        // Add scale name variations
        keywords.push(scaleName.replace(/_/g, ' '));
        keywords.push(scaleName.replace(/_/g, '-'));
        
        // Add cultural context keywords if available
        if (scaleData && scaleData.culturalContext) {
            if (scaleData.culturalContext.region) {
                keywords.push(scaleData.culturalContext.region);
            }
            if (scaleData.culturalContext.culturalGroup) {
                keywords.push(scaleData.culturalContext.culturalGroup);
            }
        }
        
        // Add common music theory terms
        keywords.push('scale', 'mode', 'music theory', 'intervals');
        
        return keywords.filter(keyword => keyword && keyword.length > 0);
    }

    /**
     * Extract domain from URL
     * @param {string} url - URL to extract domain from
     * @returns {string} Domain name
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    }

    /**
     * Check if URL is from an educational domain
     * @param {string} url - URL to check
     * @returns {boolean} Whether URL is educational
     */
    isEducationalDomain(url) {
        const educationalDomains = [
            'musictheory.net',
            'teoria.com',
            'tenuto',
            'good-ear.com',
            'dolmetsch.com'
        ];
        
        const urlLower = url.toLowerCase();
        return educationalDomains.some(domain => urlLower.includes(domain));
    }

    /**
     * Check if URL is from an academic domain
     * @param {string} url - URL to check
     * @returns {boolean} Whether URL is academic
     */
    isAcademicDomain(url) {
        const academicPatterns = [
            '.edu',
            'jstor.org',
            'doi.org',
            'cambridge.org',
            'oxford.com',
            'springer.com',
            'wiley.com'
        ];
        
        const urlLower = url.toLowerCase();
        return academicPatterns.some(pattern => urlLower.includes(pattern));
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharedReferenceVerifier;
} else if (typeof window !== 'undefined') {
    window.SharedReferenceVerifier = SharedReferenceVerifier;
}