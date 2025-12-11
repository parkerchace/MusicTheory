/**
 * @module RegionalScaleManager
 * @description Manages ethnomusicological context and cultural attribution for regional scales
 * @exports class RegionalScaleManager
 * @feature Cultural context validation
 * @feature 12-TET approximation documentation
 * @feature Consistent regional scale format
 */

class RegionalScaleManager {
    constructor() {
        this.requiredFields = [
            'region',
            'culturalGroup', 
            'historicalPeriod',
            'musicalFunction'
        ];
        
        this.tuningSystemFields = [
            'original',
            'approximationMethod',
            'orchestralInstruments',
            'limitations',
            'pedagogicalNotes'
        ];
    }

    /**
     * Add a regional scale with proper ethnomusicological context
     * @param {Object} scaleData - Scale definition with intervals and metadata
     * @param {Object} ethnomusicologicalContext - Cultural and historical context
     * @returns {Object} Validated scale data ready for integration
     */
    addRegionalScale(scaleData, ethnomusicologicalContext) {
        this.validateScaleData(scaleData);
        this.validateCulturalContext(ethnomusicologicalContext);
        
        return {
            ...scaleData,
            culturalContext: ethnomusicologicalContext.culturalContext,
            tuningSystem: ethnomusicologicalContext.tuningSystem,
            references: ethnomusicologicalContext.references || [],
            alternativeSources: ethnomusicologicalContext.alternativeSources || []
        };
    }

    /**
     * Validate cultural attribution meets academic standards
     * @param {string} scaleId - Scale identifier
     * @param {Array} sources - Academic sources for validation
     * @returns {boolean} True if attribution is complete and valid
     */
    validateCulturalAttribution(scaleId, sources) {
        if (!sources || !Array.isArray(sources) || sources.length === 0) {
            throw new Error(`Scale ${scaleId} requires at least one academic source`);
        }

        // Check for peer-reviewed sources
        const hasPeerReviewed = sources.some(source => 
            source.type === 'journal_article' || 
            (source.type === 'book' && source.publisher)
        );

        if (!hasPeerReviewed) {
            throw new Error(`Scale ${scaleId} requires at least one peer-reviewed academic source`);
        }

        // Validate source accessibility
        sources.forEach(source => {
            if (!source.url || typeof source.url !== 'string') {
                throw new Error(`Scale ${scaleId} source missing accessible URL: ${source.title}`);
            }
        });

        return true;
    }

    /**
     * Document 12-TET approximation methodology for traditional scales
     * @param {Object} originalTuning - Traditional tuning system description
     * @param {Object} approximation - 12-TET approximation details
     * @returns {Object} Complete tuning system documentation
     */
    documentTuningApproximation(originalTuning, approximation) {
        const tuningDoc = {
            original: originalTuning.description || 'Traditional tuning system',
            approximationMethod: approximation.method || '12-TET intervals for orchestral compatibility',
            orchestralInstruments: approximation.instruments || 'Compatible with violin, viola, cello, bass, winds, and brass',
            limitations: approximation.limitations || 'Traditional microtonal inflections approximated to nearest semitone',
            pedagogicalNotes: approximation.pedagogicalNotes || 'Suitable for high school orchestra use with cultural context'
        };

        // Validate all required fields are present
        this.tuningSystemFields.forEach(field => {
            if (!tuningDoc[field]) {
                throw new Error(`Tuning system documentation missing required field: ${field}`);
            }
        });

        return tuningDoc;
    }

    /**
     * Get cultural context for a scale
     * @param {string} scaleId - Scale identifier
     * @param {Object} scaleData - Complete scale data object
     * @returns {Object} Cultural context information
     */
    getCulturalContext(scaleId, scaleData) {
        if (!scaleData || !scaleData.culturalContext) {
            throw new Error(`No cultural context found for scale: ${scaleId}`);
        }

        return {
            region: scaleData.culturalContext.region,
            culturalGroup: scaleData.culturalContext.culturalGroup,
            historicalPeriod: scaleData.culturalContext.historicalPeriod,
            musicalFunction: scaleData.culturalContext.musicalFunction,
            tuningSystem: scaleData.tuningSystem || null,
            references: scaleData.references || []
        };
    }

    /**
     * Validate scale data structure
     * @private
     */
    validateScaleData(scaleData) {
        if (!scaleData.intervals || !Array.isArray(scaleData.intervals)) {
            throw new Error('Scale data must include intervals array');
        }

        if (!scaleData.scaleId || typeof scaleData.scaleId !== 'string') {
            throw new Error('Scale data must include valid scaleId string');
        }

        // Validate 12-TET compatibility
        const validIntervals = scaleData.intervals.every(interval => 
            Number.isInteger(interval) && interval >= 0 && interval <= 11
        );

        if (!validIntervals) {
            throw new Error('All intervals must be integers between 0-11 for 12-TET compatibility');
        }
    }

    /**
     * Validate cultural context completeness
     * @private
     */
    validateCulturalContext(context) {
        if (!context.culturalContext) {
            throw new Error('Ethnomusicological context must include culturalContext object');
        }

        this.requiredFields.forEach(field => {
            if (!context.culturalContext[field]) {
                throw new Error(`Cultural context missing required field: ${field}`);
            }
        });

        if (!context.references || !Array.isArray(context.references) || context.references.length === 0) {
            throw new Error('Cultural context must include at least one academic reference');
        }
    }

    /**
     * Generate consistent documentation format for regional scales
     * @param {Object} scaleData - Complete scale data
     * @returns {Object} Formatted documentation object
     */
    formatRegionalScaleDocumentation(scaleData) {
        return {
            description: this.generateDescription(scaleData),
            culturalContext: scaleData.culturalContext,
            tuningSystem: scaleData.tuningSystem,
            references: scaleData.references,
            alternativeSources: scaleData.alternativeSources || []
        };
    }

    /**
     * Generate standardized description for regional scales
     * @private
     */
    generateDescription(scaleData) {
        const context = scaleData.culturalContext;
        return `Traditional scale from ${context.region}, used by ${context.culturalGroup} during ${context.historicalPeriod}. Primary function: ${context.musicalFunction}.`;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegionalScaleManager;
} else if (typeof window !== 'undefined') {
    window.RegionalScaleManager = RegionalScaleManager;
}