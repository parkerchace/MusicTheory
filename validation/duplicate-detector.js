/**
 * @module DuplicateDetector
 * @description Detects duplicate URLs and inappropriate reference sharing across scales
 * @exports class DuplicateDetector
 * @feature Scan all scale references for identical URLs
 * @feature Identify generic references shared by multiple scales
 * @feature Flag inappropriate reference sharing
 */

class DuplicateDetector {
    constructor(options = {}) {
        this.options = {
            minSharedScales: options.minSharedScales || 3, // Minimum scales sharing URL to flag as generic
            maxAllowedSharing: options.maxAllowedSharing || 5, // Maximum scales that can appropriately share a URL
            ...options
        };
    }

    /**
     * Scan all scale references for duplicate URLs
     * @param {Object} scaleCitations - Scale citations object from MusicTheoryEngine
     * @returns {Object} Duplicate detection results
     */
    detectDuplicateUrls(scaleCitations) {
        if (!scaleCitations || typeof scaleCitations !== 'object') {
            throw new Error('Scale citations must be a valid object');
        }

        const urlMap = new Map(); // URL -> array of scale references
        const results = {
            totalUrls: 0,
            uniqueUrls: 0,
            duplicateUrls: 0,
            urlAnalysis: new Map(),
            duplicateGroups: [],
            genericReferences: [],
            inappropriateSharing: [],
            scannedAt: new Date().toISOString()
        };

        // First pass: collect all URLs and their scale associations
        for (const [scaleName, scaleData] of Object.entries(scaleCitations)) {
            if (!scaleData || !scaleData.references || !Array.isArray(scaleData.references)) {
                continue;
            }

            for (let refIndex = 0; refIndex < scaleData.references.length; refIndex++) {
                const reference = scaleData.references[refIndex];
                
                if (!reference.url) {
                    continue;
                }

                results.totalUrls++;
                
                const normalizedUrl = this.normalizeUrl(reference.url);
                
                if (!urlMap.has(normalizedUrl)) {
                    urlMap.set(normalizedUrl, []);
                }

                urlMap.get(normalizedUrl).push({
                    scaleName,
                    referenceIndex: refIndex,
                    reference,
                    scaleData
                });
            }
        }

        results.uniqueUrls = urlMap.size;
        
        // Second pass: analyze URL sharing patterns
        for (const [url, scaleReferences] of urlMap.entries()) {
            const analysis = this.analyzeUrlSharing(url, scaleReferences);
            results.urlAnalysis.set(url, analysis);

            if (scaleReferences.length > 1) {
                results.duplicateUrls++;
                
                const duplicateGroup = {
                    url,
                    sharedByScales: scaleReferences.length,
                    scales: scaleReferences.map(ref => ref.scaleName),
                    analysis,
                    flagged: analysis.inappropriate || analysis.generic
                };

                results.duplicateGroups.push(duplicateGroup);

                if (analysis.generic) {
                    results.genericReferences.push(duplicateGroup);
                }

                if (analysis.inappropriate) {
                    results.inappropriateSharing.push(duplicateGroup);
                }
            }
        }

        // Sort results by number of sharing scales (most shared first)
        results.duplicateGroups.sort((a, b) => b.sharedByScales - a.sharedByScales);
        results.genericReferences.sort((a, b) => b.sharedByScales - a.sharedByScales);
        results.inappropriateSharing.sort((a, b) => b.sharedByScales - a.sharedByScales);

        return results;
    }

    /**
     * Analyze URL sharing pattern to determine if it's appropriate
     * @param {string} url - The URL being analyzed
     * @param {Array} scaleReferences - Array of scale references using this URL
     * @returns {Object} Analysis result
     */
    analyzeUrlSharing(url, scaleReferences) {
        const analysis = {
            url,
            sharedByScales: scaleReferences.length,
            scales: scaleReferences.map(ref => ref.scaleName),
            inappropriate: false,
            generic: false,
            reasons: [],
            recommendations: []
        };

        // Check if URL is shared by too many scales
        if (scaleReferences.length >= this.options.minSharedScales) {
            analysis.generic = true;
            analysis.reasons.push(`Shared by ${scaleReferences.length} scales - likely generic reference`);
        }

        if (scaleReferences.length > this.options.maxAllowedSharing) {
            analysis.inappropriate = true;
            analysis.reasons.push(`Shared by ${scaleReferences.length} scales - exceeds maximum appropriate sharing`);
        }

        // Analyze cultural and regional context compatibility
        const culturalAnalysis = this.analyzeCulturalCompatibility(scaleReferences);
        if (!culturalAnalysis.compatible) {
            analysis.inappropriate = true;
            analysis.reasons.push('Scales from incompatible cultural contexts sharing same reference');
            analysis.recommendations.push('Find culture-specific references for each scale');
        }

        // Check for Wikipedia or other inappropriate academic sources
        const sourceAnalysis = this.analyzeSourceAppropriatenesss(url);
        if (!sourceAnalysis.appropriate) {
            analysis.inappropriate = true;
            analysis.reasons.push(...sourceAnalysis.reasons);
            analysis.recommendations.push(...sourceAnalysis.recommendations);
        }

        // Check if scales are related (modes of same parent scale)
        const relationshipAnalysis = this.analyzeScaleRelationships(scaleReferences);
        if (relationshipAnalysis.related && scaleReferences.length <= 7) {
            // Related scales (like modes) can appropriately share references
            analysis.inappropriate = false;
            analysis.generic = false;
            analysis.reasons.push('Scales are related (modes/variants) - sharing is appropriate');
        }

        // Generate recommendations
        if (analysis.inappropriate || analysis.generic) {
            analysis.recommendations.push('Replace with scale-specific references');
            analysis.recommendations.push('Verify content actually covers all referenced scales');
            
            if (analysis.generic) {
                analysis.recommendations.push('Find specialized resources for each scale');
            }
        }

        return analysis;
    }

    /**
     * Analyze cultural compatibility of scales sharing a reference
     * @param {Array} scaleReferences - Array of scale references
     * @returns {Object} Cultural compatibility analysis
     */
    analyzeCulturalCompatibility(scaleReferences) {
        const regions = new Set();
        const culturalGroups = new Set();
        const periods = new Set();

        for (const scaleRef of scaleReferences) {
            const context = scaleRef.scaleData.culturalContext;
            if (context) {
                if (context.region) regions.add(context.region);
                if (context.culturalGroup) culturalGroups.add(context.culturalGroup);
                if (context.historicalPeriod) periods.add(context.historicalPeriod);
            }
        }

        const analysis = {
            compatible: true,
            reasons: [],
            regions: Array.from(regions),
            culturalGroups: Array.from(culturalGroups),
            periods: Array.from(periods)
        };

        // Check for incompatible cultural contexts
        const incompatibleRegions = [
            ['Western Europe', 'Middle East'],
            ['Western Europe', 'South America'],
            ['Western Europe', 'Africa'],
            ['Middle East', 'South America'],
            ['Middle East', 'Africa'],
            ['South America', 'Africa']
        ];

        for (const [region1, region2] of incompatibleRegions) {
            if (regions.has(region1) && regions.has(region2)) {
                analysis.compatible = false;
                analysis.reasons.push(`Incompatible regions: ${region1} and ${region2}`);
            }
        }

        // Check for very different historical periods
        const modernPeriods = ['20th century', '21st century', 'contemporary'];
        const ancientPeriods = ['Ancient', 'Medieval', 'Renaissance'];
        
        const hasModern = Array.from(periods).some(p => 
            modernPeriods.some(mp => p.toLowerCase().includes(mp.toLowerCase()))
        );
        const hasAncient = Array.from(periods).some(p => 
            ancientPeriods.some(ap => p.toLowerCase().includes(ap.toLowerCase()))
        );

        if (hasModern && hasAncient && periods.size > 2) {
            analysis.compatible = false;
            analysis.reasons.push('Scales from very different historical periods');
        }

        return analysis;
    }

    /**
     * Analyze if a URL source is appropriate for academic citations
     * @param {string} url - URL to analyze
     * @returns {Object} Source appropriateness analysis
     */
    analyzeSourceAppropriatenesss(url) {
        const analysis = {
            appropriate: true,
            reasons: [],
            recommendations: []
        };

        const urlLower = url.toLowerCase();

        // Check for inappropriate sources
        const inappropriateSources = [
            { pattern: 'wikipedia.org', reason: 'Wikipedia is not appropriate for academic citations' },
            { pattern: 'wikimedia.org', reason: 'Wikimedia sources are not appropriate for academic citations' },
            { pattern: 'youtube.com', reason: 'YouTube videos are not appropriate for academic citations' },
            { pattern: 'facebook.com', reason: 'Social media is not appropriate for academic citations' },
            { pattern: 'twitter.com', reason: 'Social media is not appropriate for academic citations' },
            { pattern: 'instagram.com', reason: 'Social media is not appropriate for academic citations' },
            { pattern: 'reddit.com', reason: 'Reddit is not appropriate for academic citations' },
            { pattern: 'quora.com', reason: 'Q&A sites are not appropriate for academic citations' },
            { pattern: 'answers.com', reason: 'Q&A sites are not appropriate for academic citations' }
        ];

        for (const source of inappropriateSources) {
            if (urlLower.includes(source.pattern)) {
                analysis.appropriate = false;
                analysis.reasons.push(source.reason);
                analysis.recommendations.push('Replace with peer-reviewed or educational institution source');
            }
        }

        // Check for generic music theory sites that might be too broad
        const genericSites = [
            { pattern: 'musictheory.net', threshold: 5 }, // OK for up to 5 scales
            { pattern: 'teoria.com', threshold: 3 },
            { pattern: 'tenuto', threshold: 3 }
        ];

        // Note: This analysis would need the scale count context, 
        // which should be passed from the calling function

        return analysis;
    }

    /**
     * Analyze relationships between scales to determine if sharing is appropriate
     * @param {Array} scaleReferences - Array of scale references
     * @returns {Object} Relationship analysis
     */
    analyzeScaleRelationships(scaleReferences) {
        const analysis = {
            related: false,
            relationshipType: null,
            reasons: []
        };

        const scaleNames = scaleReferences.map(ref => ref.scaleName);

        // Check for modal relationships (modes of major scale)
        const majorModes = ['major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
        const majorModeCount = scaleNames.filter(name => majorModes.includes(name)).length;
        
        if (majorModeCount >= 2) {
            analysis.related = true;
            analysis.relationshipType = 'major_modes';
            analysis.reasons.push('Scales are modes of the major scale');
        }

        // Check for melodic minor modes
        const melodicMinorModes = ['melodic', 'dorian_b2', 'lydian_augmented', 'lydian_dominant', 'mixolydian_b6', 'locrian_nat2', 'altered'];
        const melodicMinorCount = scaleNames.filter(name => melodicMinorModes.includes(name)).length;
        
        if (melodicMinorCount >= 2) {
            analysis.related = true;
            analysis.relationshipType = 'melodic_minor_modes';
            analysis.reasons.push('Scales are modes of the melodic minor scale');
        }

        // Check for harmonic minor modes
        const harmonicMinorModes = ['harmonic', 'locrian_nat6', 'ionian_augmented', 'dorian_sharp4', 'phrygian_dominant', 'lydian_sharp2', 'altered_diminished'];
        const harmonicMinorCount = scaleNames.filter(name => harmonicMinorModes.includes(name)).length;
        
        if (harmonicMinorCount >= 2) {
            analysis.related = true;
            analysis.relationshipType = 'harmonic_minor_modes';
            analysis.reasons.push('Scales are modes of the harmonic minor scale');
        }

        // Check for pentatonic relationships
        const pentatonicScales = ['major_pentatonic', 'minor_pentatonic', 'egyptian_pentatonic', 'hirajoshi', 'iwato', 'insen', 'yo'];
        const pentatonicCount = scaleNames.filter(name => pentatonicScales.includes(name)).length;
        
        if (pentatonicCount >= 2) {
            analysis.related = true;
            analysis.relationshipType = 'pentatonic_family';
            analysis.reasons.push('Scales are related pentatonic scales');
        }

        // Check for regional/cultural relationships
        const regionalGroups = {
            middle_eastern: ['hijaz', 'hijaz_kar', 'maqam_bayati', 'maqam_rast', 'maqam_ajam', 'maqam_nahawand', 'maqam_kurd', 'persian'],
            indian: ['raga_bhairav', 'raga_todi', 'raga_marwa', 'raga_purvi', 'raga_kafi', 'raga_bhairavi'],
            spanish: ['spanish_phrygian', 'spanish_gypsy', 'flamenco'],
            jazz: ['bebop_major', 'bebop_dominant', 'bebop_minor', 'bebop_dorian'],
            south_american: ['chacarera', 'zamba', 'milonga', 'tango_minor', 'vidala', 'cueca', 'tonada', 'marinera', 'huayno', 'yaraví'],
            african: ['pentatonic_african', 'heptatonic_akan', 'kora_scale', 'balafon_scale', 'yoruba_traditional', 'ewe_traditional']
        };

        for (const [groupName, groupScales] of Object.entries(regionalGroups)) {
            const groupCount = scaleNames.filter(name => groupScales.includes(name)).length;
            if (groupCount >= 2) {
                analysis.related = true;
                analysis.relationshipType = `regional_${groupName}`;
                analysis.reasons.push(`Scales are from the same regional tradition: ${groupName}`);
            }
        }

        return analysis;
    }

    /**
     * Normalize URL for comparison (remove protocol, www, trailing slashes, etc.)
     * @param {string} url - URL to normalize
     * @returns {string} Normalized URL
     */
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            let normalized = urlObj.hostname.toLowerCase();
            
            // Remove www prefix
            if (normalized.startsWith('www.')) {
                normalized = normalized.substring(4);
            }
            
            // Add path (but normalize it)
            let path = urlObj.pathname;
            if (path.endsWith('/')) {
                path = path.substring(0, path.length - 1);
            }
            
            normalized += path;
            
            // Add query parameters if they exist (sorted for consistency)
            if (urlObj.search) {
                const params = new URLSearchParams(urlObj.search);
                const sortedParams = Array.from(params.entries()).sort();
                if (sortedParams.length > 0) {
                    normalized += '?' + sortedParams.map(([k, v]) => `${k}=${v}`).join('&');
                }
            }
            
            return normalized;
        } catch (error) {
            // If URL parsing fails, return original URL lowercased
            return url.toLowerCase();
        }
    }

    /**
     * Generate recommendations for resolving duplicate URL issues
     * @param {Object} duplicateResults - Results from detectDuplicateUrls
     * @returns {Array} Array of recommendation objects
     */
    generateRecommendations(duplicateResults) {
        const recommendations = [];

        // High priority: inappropriate sharing
        for (const duplicate of duplicateResults.inappropriateSharing) {
            recommendations.push({
                priority: 'high',
                type: 'inappropriate_sharing',
                url: duplicate.url,
                affectedScales: duplicate.scales,
                issue: 'URL inappropriately shared across incompatible scales',
                action: 'Replace with scale-specific references',
                details: duplicate.analysis.reasons
            });
        }

        // Medium priority: generic references
        for (const duplicate of duplicateResults.genericReferences) {
            if (!duplicateResults.inappropriateSharing.some(inapp => inapp.url === duplicate.url)) {
                recommendations.push({
                    priority: 'medium',
                    type: 'generic_reference',
                    url: duplicate.url,
                    affectedScales: duplicate.scales,
                    issue: 'Generic reference shared by multiple scales',
                    action: 'Verify content covers all scales or find specific references',
                    details: duplicate.analysis.reasons
                });
            }
        }

        // Low priority: moderate sharing that might be acceptable
        for (const duplicate of duplicateResults.duplicateGroups) {
            if (!duplicate.flagged && duplicate.sharedByScales >= 2 && duplicate.sharedByScales <= 4) {
                recommendations.push({
                    priority: 'low',
                    type: 'moderate_sharing',
                    url: duplicate.url,
                    affectedScales: duplicate.scales,
                    issue: 'URL shared by multiple scales - verify appropriateness',
                    action: 'Review content to ensure it covers all referenced scales',
                    details: ['Manual review recommended']
                });
            }
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Get summary statistics from duplicate detection results
     * @param {Object} duplicateResults - Results from detectDuplicateUrls
     * @returns {Object} Summary statistics
     */
    getSummaryStatistics(duplicateResults) {
        return {
            totalUrls: duplicateResults.totalUrls,
            uniqueUrls: duplicateResults.uniqueUrls,
            duplicateUrls: duplicateResults.duplicateUrls,
            duplicatePercentage: duplicateResults.uniqueUrls > 0 ? 
                Math.round((duplicateResults.duplicateUrls / duplicateResults.uniqueUrls) * 100) : 0,
            genericReferences: duplicateResults.genericReferences.length,
            inappropriateSharing: duplicateResults.inappropriateSharing.length,
            totalProblematicUrls: duplicateResults.genericReferences.length + duplicateResults.inappropriateSharing.length,
            mostSharedUrl: duplicateResults.duplicateGroups.length > 0 ? 
                duplicateResults.duplicateGroups[0] : null,
            scannedAt: duplicateResults.scannedAt
        };
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DuplicateDetector;
} else if (typeof window !== 'undefined') {
    window.DuplicateDetector = DuplicateDetector;
}