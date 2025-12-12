/**
 * @module MusicTheoryEngineExtensions
 * @description Extensions to MusicTheoryEngine for validation integration
 * @exports extendMusicTheoryEngine function
 * @feature Backward compatible extensions to existing MusicTheoryEngine
 * @feature Validation hooks and methods integration
 * @feature Maintains existing API while adding validation capabilities
 * @requirements 4.2, 4.3
 */

// Import validation integration
let MusicTheoryValidationIntegration;
if (typeof require !== 'undefined') {
    try {
        MusicTheoryValidationIntegration = require('./music-theory-validation-integration.js');
    } catch (e) {
        console.warn('MusicTheoryValidationIntegration not available:', e.message);
    }
} else if (typeof window !== 'undefined') {
    if (window.MusicTheoryValidationIntegration) {
        MusicTheoryValidationIntegration = window.MusicTheoryValidationIntegration;
    }
}

/**
 * Extend MusicTheoryEngine with validation capabilities
 * @param {Object} musicTheoryEngine - MusicTheoryEngine instance
 * @param {Object} options - Integration options
 * @returns {Object} Extended engine with validation integration
 */
function extendMusicTheoryEngine(musicTheoryEngine, options = {}) {
    if (!musicTheoryEngine) {
        throw new Error('MusicTheoryEngine instance is required');
    }

    // Check if already extended
    if (musicTheoryEngine._validationIntegration) {
        console.warn('MusicTheoryEngine already has validation integration');
        return musicTheoryEngine;
    }

    // Create validation integration if available
    let validationIntegration = null;
    if (MusicTheoryValidationIntegration) {
        try {
            validationIntegration = new MusicTheoryValidationIntegration(musicTheoryEngine, options);
            musicTheoryEngine._validationIntegration = validationIntegration;
        } catch (error) {
            console.error('Failed to create validation integration:', error.message);
        }
    }

    // Add validation methods even if integration is not available (fallback behavior)
    addValidationMethods(musicTheoryEngine, validationIntegration);

    // Add validation event emitter capabilities if not present
    addEventEmitterCapabilities(musicTheoryEngine);

    // Add validation-specific scale citation methods
    addValidationCitationMethods(musicTheoryEngine, validationIntegration);

    // Add maintenance mode capabilities
    addMaintenanceModeCapabilities(musicTheoryEngine, validationIntegration);

    console.log('MusicTheoryEngine extended with validation capabilities');
    return musicTheoryEngine;
}

/**
 * Add validation methods to MusicTheoryEngine
 * @param {Object} engine - MusicTheoryEngine instance
 * @param {Object} integration - Validation integration instance
 */
function addValidationMethods(engine, integration) {
    // Validation status and control methods
    engine.getValidationStatus = function() {
        if (integration) {
            return integration.getValidationStatus();
        }
        return {
            isValidating: false,
            lastValidation: null,
            pendingValidations: [],
            scheduledValidation: false,
            componentsAvailable: {
                orchestrator: false,
                referenceValidator: false,
                reporter: false
            },
            message: 'Validation integration not available'
        };
    };

    engine.validateScaleReferences = async function(scaleNames = null, options = {}) {
        if (integration) {
            return await integration.validateScaleReferences(scaleNames, options);
        }
        throw new Error('Validation integration not available');
    };

    engine.getValidationHistory = function(limit = 10) {
        if (integration) {
            return integration.getValidationHistory(limit);
        }
        return [];
    };

    engine.scheduleValidation = function(scaleNames = null, delay = 0) {
        if (integration) {
            return integration.scheduleValidation(scaleNames, delay);
        }
        return Promise.reject(new Error('Validation integration not available'));
    };

    // Reference management with validation
    engine.addScaleReferenceWithValidation = async function(scaleName, reference) {
        if (integration) {
            return await integration.addScaleReferenceWithValidation(scaleName, reference);
        }
        
        // Fallback: add without validation
        if (!this.scaleCitations[scaleName]) {
            this.scaleCitations[scaleName] = {
                description: `Scale: ${scaleName}`,
                references: []
            };
        }
        
        if (!this.scaleCitations[scaleName].references) {
            this.scaleCitations[scaleName].references = [];
        }
        
        this.scaleCitations[scaleName].references.push(reference);
        
        return {
            added: true,
            validated: false,
            message: 'Added without validation (integration not available)'
        };
    };

    // Bulk validation methods
    engine.validateAllScaleReferences = async function(options = {}) {
        return await this.validateScaleReferences(null, options);
    };

    engine.validateSpecificScales = async function(scaleNames, options = {}) {
        if (!Array.isArray(scaleNames)) {
            scaleNames = [scaleNames];
        }
        return await this.validateScaleReferences(scaleNames, options);
    };

    // Quick validation methods
    engine.quickValidateScale = async function(scaleName) {
        return await this.validateScaleReferences([scaleName], {
            phases: ['accessibility_validation'],
            background: true
        });
    };

    engine.quickValidateReference = async function(scaleName, referenceIndex) {
        if (!this.scaleCitations[scaleName] || 
            !this.scaleCitations[scaleName].references ||
            !this.scaleCitations[scaleName].references[referenceIndex]) {
            throw new Error(`Reference not found: ${scaleName}[${referenceIndex}]`);
        }

        const reference = this.scaleCitations[scaleName].references[referenceIndex];
        
        if (integration && integration.referenceValidator) {
            return await integration.referenceValidator.validateReference(reference.url, scaleName);
        }
        
        // Basic fallback validation
        return {
            accessible: null,
            contentRelevant: null,
            message: 'Basic validation only - full validation not available',
            reference: reference
        };
    };
}

/**
 * Add event emitter capabilities to MusicTheoryEngine
 * @param {Object} engine - MusicTheoryEngine instance
 */
function addEventEmitterCapabilities(engine) {
    if (engine.emit && engine.on) {
        return; // Already has event capabilities
    }

    // Simple event emitter implementation
    engine._eventListeners = {};

    engine.on = function(event, listener) {
        if (!this._eventListeners[event]) {
            this._eventListeners[event] = [];
        }
        this._eventListeners[event].push(listener);
    };

    engine.off = function(event, listener) {
        if (!this._eventListeners[event]) {
            return;
        }
        const index = this._eventListeners[event].indexOf(listener);
        if (index > -1) {
            this._eventListeners[event].splice(index, 1);
        }
    };

    engine.emit = function(event, ...args) {
        if (!this._eventListeners[event]) {
            return;
        }
        for (const listener of this._eventListeners[event]) {
            try {
                listener(...args);
            } catch (error) {
                console.error(`Event listener error for ${event}:`, error);
            }
        }
    };

    // Add validation-specific events
    engine.onValidationProgress = function(listener) {
        this.on('validationProgress', listener);
    };

    engine.onValidationError = function(listener) {
        this.on('validationError', listener);
    };

    engine.onValidationComplete = function(listener) {
        this.on('validationComplete', listener);
    };

    engine.onReferenceAdded = function(listener) {
        this.on('referenceAdded', listener);
    };

    engine.onReferenceValidated = function(listener) {
        this.on('referenceValidated', listener);
    };
}

/**
 * Add validation-specific citation methods
 * @param {Object} engine - MusicTheoryEngine instance
 * @param {Object} integration - Validation integration instance
 */
function addValidationCitationMethods(engine, integration) {
    // Store original method if it exists
    const originalGetScaleCitation = engine.getScaleCitation;

    // Enhanced citation method with validation info
    engine.getScaleCitationWithValidation = function(scaleType, format = 'text') {
        const citation = originalGetScaleCitation ? 
            originalGetScaleCitation.call(this, scaleType, format) : 
            this.getScaleCitation(scaleType, format);

        if (format === 'validation') {
            return this.getScaleCitationValidationInfo(scaleType);
        }

        return citation;
    };

    // Get validation information for a scale's citations
    engine.getScaleCitationValidationInfo = function(scaleType) {
        const citation = this.scaleCitations[scaleType];
        
        if (!citation) {
            return {
                scaleType,
                exists: false,
                validationStatus: 'not_found'
            };
        }

        const info = {
            scaleType,
            exists: true,
            hasReferences: !!(citation.references && citation.references.length > 0),
            referenceCount: citation.references ? citation.references.length : 0,
            validationStatus: 'unknown',
            references: []
        };

        if (citation.references) {
            info.references = citation.references.map((ref, index) => ({
                index,
                url: ref.url,
                title: ref.title,
                type: ref.type,
                hasValidationIssue: !!ref._validationIssue,
                validationIssue: ref._validationIssue || null
            }));

            // Determine overall validation status
            const issueCount = info.references.filter(r => r.hasValidationIssue).length;
            if (issueCount === 0) {
                info.validationStatus = 'clean';
            } else if (issueCount < info.references.length) {
                info.validationStatus = 'partial_issues';
            } else {
                info.validationStatus = 'has_issues';
            }
        }

        return info;
    };

    // Get all scales with validation issues
    engine.getScalesWithValidationIssues = function() {
        const scalesWithIssues = [];
        
        for (const [scaleName, citation] of Object.entries(this.scaleCitations)) {
            if (citation.references && Array.isArray(citation.references)) {
                const hasIssues = citation.references.some(ref => ref._validationIssue);
                if (hasIssues) {
                    scalesWithIssues.push({
                        scaleName,
                        issueCount: citation.references.filter(ref => ref._validationIssue).length,
                        totalReferences: citation.references.length
                    });
                }
            }
        }
        
        return scalesWithIssues;
    };

    // Get validation statistics
    engine.getValidationStatistics = function() {
        let totalScales = 0;
        let totalReferences = 0;
        let referencesWithIssues = 0;
        let scalesWithIssues = 0;

        for (const [scaleName, citation] of Object.entries(this.scaleCitations)) {
            totalScales++;
            
            if (citation.references && Array.isArray(citation.references)) {
                totalReferences += citation.references.length;
                
                let scaleHasIssues = false;
                for (const ref of citation.references) {
                    if (ref._validationIssue) {
                        referencesWithIssues++;
                        scaleHasIssues = true;
                    }
                }
                
                if (scaleHasIssues) {
                    scalesWithIssues++;
                }
            }
        }

        return {
            totalScales,
            totalReferences,
            referencesWithIssues,
            scalesWithIssues,
            validationCoverage: totalReferences > 0 ? 
                ((totalReferences - referencesWithIssues) / totalReferences * 100).toFixed(1) + '%' : 
                'N/A',
            lastValidation: integration ? 
                integration.validationState?.lastValidation?.timestamp : 
                null
        };
    };
}

/**
 * Add maintenance mode capabilities
 * @param {Object} engine - MusicTheoryEngine instance
 * @param {Object} integration - Validation integration instance
 */
function addMaintenanceModeCapabilities(engine, integration) {
    engine._maintenanceMode = false;

    // Enter maintenance mode for large-scale operations
    engine.enterMaintenanceMode = function() {
        this._maintenanceMode = true;
        
        // Disable automatic validation during maintenance
        if (integration) {
            integration.options.enableAutoValidation = false;
        }
        
        this.emit('maintenanceModeEntered');
        console.log('Entered maintenance mode - automatic validation disabled');
    };

    // Exit maintenance mode
    engine.exitMaintenanceMode = async function(runValidation = true) {
        this._maintenanceMode = false;
        
        // Re-enable automatic validation
        if (integration) {
            integration.options.enableAutoValidation = true;
        }
        
        this.emit('maintenanceModeExited');
        console.log('Exited maintenance mode - automatic validation re-enabled');
        
        // Optionally run validation after maintenance
        if (runValidation && integration) {
            try {
                console.log('Running post-maintenance validation...');
                const results = await integration.validateScaleReferences(null, {
                    background: true,
                    phases: ['accessibility_validation', 'content_analysis']
                });
                console.log(`Post-maintenance validation completed. Errors: ${results.summary.errors}`);
            } catch (error) {
                console.error('Post-maintenance validation failed:', error.message);
            }
        }
    };

    // Check if in maintenance mode
    engine.isInMaintenanceMode = function() {
        return this._maintenanceMode;
    };

    // Maintenance operations
    engine.runMaintenanceValidation = async function(options = {}) {
        if (!this._maintenanceMode) {
            throw new Error('Must be in maintenance mode to run maintenance validation');
        }
        
        if (!integration) {
            throw new Error('Validation integration not available');
        }
        
        console.log('Running comprehensive maintenance validation...');
        
        const maintenanceOptions = {
            includeFormattedOutput: true,
            includeRawData: true,
            includeChangeLog: true,
            autoFix: options.autoFix || false,
            autoFixTypes: options.autoFixTypes || ['inaccessible_url'],
            ...options
        };
        
        return await integration.validateScaleReferences(null, maintenanceOptions);
    };

    // Cleanup validation issues
    engine.cleanupValidationIssues = function() {
        let cleanedCount = 0;
        
        for (const citation of Object.values(this.scaleCitations)) {
            if (citation.references && Array.isArray(citation.references)) {
                for (const ref of citation.references) {
                    if (ref._validationIssue) {
                        delete ref._validationIssue;
                        cleanedCount++;
                    }
                }
            }
        }
        
        console.log(`Cleaned up ${cleanedCount} validation issue markers`);
        return cleanedCount;
    };
}

/**
 * Create a validation-enabled MusicTheoryEngine instance
 * @param {Object} options - Engine and validation options
 * @returns {Object} MusicTheoryEngine with validation capabilities
 */
function createValidationEnabledEngine(options = {}) {
    // This would typically import and create a MusicTheoryEngine instance
    // For now, we'll assume it's available globally or passed in
    if (typeof MusicTheoryEngine === 'undefined') {
        throw new Error('MusicTheoryEngine not available. Import it first.');
    }
    
    const engine = new MusicTheoryEngine();
    return extendMusicTheoryEngine(engine, options.validation || {});
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        extendMusicTheoryEngine,
        createValidationEnabledEngine
    };
} else if (typeof window !== 'undefined') {
    window.MusicTheoryEngineExtensions = {
        extendMusicTheoryEngine,
        createValidationEnabledEngine
    };
}