/**
 * @module MusicTheoryValidationIntegration
 * @description Integration layer between MusicTheoryEngine and validation system
 * @exports MusicTheoryValidationIntegration class
 * @feature Ensures compatibility with existing scaleCitations structure
 * @feature Adds validation hooks for new reference additions
 * @feature Maintains backward compatibility with existing APIs
 * @requirements 4.2, 4.3
 */

// Import validation components if available
let ValidationOrchestrator, ReferenceValidator, ValidationReporter;
if (typeof require !== 'undefined') {
    try {
        ValidationOrchestrator = require('./validation-orchestrator.js');
        ReferenceValidator = require('./reference-validator.js');
        ValidationReporter = require('./validation-reporter.js');
    } catch (e) {
        // Modules not available, will use fallback methods
        console.warn('Some validation modules not available:', e.message);
    }
} else if (typeof window !== 'undefined') {
    if (window.ValidationOrchestrator) ValidationOrchestrator = window.ValidationOrchestrator;
    if (window.ReferenceValidator) ReferenceValidator = window.ReferenceValidator;
    if (window.ValidationReporter) ValidationReporter = window.ValidationReporter;
}

class MusicTheoryValidationIntegration {
    constructor(musicTheoryEngine, options = {}) {
        if (!musicTheoryEngine) {
            throw new Error('MusicTheoryEngine instance is required');
        }
        
        this.musicEngine = musicTheoryEngine;
        this.options = {
            enableAutoValidation: options.enableAutoValidation !== false,
            enableValidationHooks: options.enableValidationHooks !== false,
            validationOnStartup: options.validationOnStartup || false,
            validationSchedule: options.validationSchedule || null, // e.g., 'daily', 'weekly'
            maxValidationRetries: options.maxValidationRetries || 3,
            validationTimeout: options.validationTimeout || 30000,
            ...options
        };
        
        // Initialize validation components
        this.orchestrator = ValidationOrchestrator ? 
            new ValidationOrchestrator({
                enableErrorRecovery: true,
                enablePartialValidation: true,
                maxRetries: this.options.maxValidationRetries,
                progressCallback: this.handleValidationProgress.bind(this),
                errorCallback: this.handleValidationError.bind(this)
            }) : null;
            
        this.referenceValidator = ReferenceValidator ? 
            new ReferenceValidator() : null;
            
        this.reporter = ValidationReporter ? 
            new ValidationReporter() : null;
        
        // Validation state
        this.validationState = {
            lastValidation: null,
            validationHistory: [],
            pendingValidations: new Set(),
            validationScheduler: null,
            isValidating: false
        };
        
        // Hook into existing MusicTheoryEngine methods
        this.setupValidationHooks();
        
        // Setup validation scheduling if requested
        if (this.options.validationSchedule) {
            this.setupValidationScheduling();
        }
        
        // Run startup validation if enabled
        if (this.options.validationOnStartup) {
            this.scheduleStartupValidation();
        }
    }

    /**
     * Setup validation hooks into existing MusicTheoryEngine methods
     */
    setupValidationHooks() {
        if (!this.options.enableValidationHooks) {
            return;
        }

        // Store original methods
        const originalMethods = {
            addScale: this.musicEngine.addScale?.bind(this.musicEngine),
            updateScaleCitation: this.musicEngine.updateScaleCitation?.bind(this.musicEngine),
            addScaleReference: this.musicEngine.addScaleReference?.bind(this.musicEngine)
        };

        // Hook into scale addition if method exists
        if (originalMethods.addScale) {
            this.musicEngine.addScale = async (scaleData) => {
                const result = await originalMethods.addScale(scaleData);
                
                // Validate new scale references
                if (scaleData.references && this.options.enableAutoValidation) {
                    this.scheduleReferenceValidation(scaleData.scaleId || scaleData.name, scaleData.references);
                }
                
                return result;
            };
        }

        // Hook into citation updates if method exists
        if (originalMethods.updateScaleCitation) {
            this.musicEngine.updateScaleCitation = async (scaleName, citationData) => {
                const result = await originalMethods.updateScaleCitation(scaleName, citationData);
                
                // Validate updated references
                if (citationData.references && this.options.enableAutoValidation) {
                    this.scheduleReferenceValidation(scaleName, citationData.references);
                }
                
                return result;
            };
        }

        // Add new method for adding individual references with validation
        this.musicEngine.addScaleReferenceWithValidation = async (scaleName, reference) => {
            return await this.addScaleReferenceWithValidation(scaleName, reference);
        };

        // Add validation status methods to MusicTheoryEngine
        this.musicEngine.getValidationStatus = () => {
            return this.getValidationStatus();
        };

        this.musicEngine.validateScaleReferences = async (scaleNames = null, options = {}) => {
            return await this.validateScaleReferences(scaleNames, options);
        };

        this.musicEngine.getValidationHistory = (limit = 10) => {
            return this.getValidationHistory(limit);
        };

        this.musicEngine.scheduleValidation = (scaleNames = null, delay = 0) => {
            return this.scheduleValidation(scaleNames, delay);
        };
    }

    /**
     * Add a scale reference with automatic validation
     * @param {string} scaleName - Name of the scale
     * @param {Object} reference - Reference object to add
     * @returns {Promise<Object>} Validation result
     */
    async addScaleReferenceWithValidation(scaleName, reference) {
        if (!scaleName || !reference) {
            throw new Error('Scale name and reference are required');
        }

        // Validate the reference structure
        const structureValidation = this.validateReferenceStructure(reference);
        if (!structureValidation.valid) {
            throw new Error(`Invalid reference structure: ${structureValidation.errors.join(', ')}`);
        }

        // Add reference to scale citations
        if (!this.musicEngine.scaleCitations[scaleName]) {
            this.musicEngine.scaleCitations[scaleName] = {
                description: `Scale: ${scaleName}`,
                references: []
            };
        }

        if (!this.musicEngine.scaleCitations[scaleName].references) {
            this.musicEngine.scaleCitations[scaleName].references = [];
        }

        // Validate reference accessibility and content if validator is available
        let validationResult = {
            added: true,
            validated: false,
            accessible: null,
            relevant: null,
            issues: []
        };

        if (this.referenceValidator && this.options.enableAutoValidation) {
            try {
                const validation = await this.referenceValidator.validateReference(reference.url, scaleName);
                validationResult = {
                    ...validationResult,
                    validated: true,
                    accessible: validation.accessible,
                    relevant: validation.contentRelevant,
                    relevanceScore: validation.relevanceScore,
                    issues: validation.issues || []
                };

                // Only add if validation passes or if we allow problematic references
                if (!validation.accessible && !this.options.allowInaccessibleReferences) {
                    throw new Error(`Reference URL is not accessible: ${reference.url}`);
                }

                if (!validation.contentRelevant && !this.options.allowIrrelevantReferences) {
                    throw new Error(`Reference content is not relevant to scale: ${scaleName}`);
                }

            } catch (validationError) {
                validationResult.issues.push(validationError.message);
                
                if (!this.options.allowFailedValidation) {
                    throw validationError;
                }
            }
        }

        // Add the reference
        this.musicEngine.scaleCitations[scaleName].references.push(reference);

        // Log the addition
        this.logReferenceChange('add', scaleName, null, reference, validationResult);

        return validationResult;
    }

    /**
     * Validate reference structure
     * @param {Object} reference - Reference to validate
     * @returns {Object} Validation result
     */
    validateReferenceStructure(reference) {
        const errors = [];
        
        if (!reference.url) errors.push('URL is required');
        if (!reference.title) errors.push('Title is required');
        if (!reference.type) errors.push('Type is required');
        
        // Validate URL format
        if (reference.url) {
            try {
                new URL(reference.url);
            } catch (e) {
                errors.push('Invalid URL format');
            }
        }

        // Validate type
        const validTypes = ['journal_article', 'book', 'educational_resource', 'ethnomusicological_study', 'website', 'custom'];
        if (reference.type && !validTypes.includes(reference.type)) {
            errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Schedule reference validation for specific scales
     * @param {string} scaleName - Scale name
     * @param {Array} references - References to validate
     */
    scheduleReferenceValidation(scaleName, references) {
        if (!this.orchestrator || this.validationState.isValidating) {
            return;
        }

        // Add to pending validations
        this.validationState.pendingValidations.add(scaleName);

        // Debounce validation to avoid excessive calls
        if (this.validationDebounceTimer) {
            clearTimeout(this.validationDebounceTimer);
        }

        this.validationDebounceTimer = setTimeout(() => {
            this.runPendingValidations();
        }, 2000); // 2 second debounce
    }

    /**
     * Run pending validations
     */
    async runPendingValidations() {
        if (this.validationState.isValidating || this.validationState.pendingValidations.size === 0) {
            return;
        }

        const scaleNames = Array.from(this.validationState.pendingValidations);
        this.validationState.pendingValidations.clear();

        try {
            await this.validateScaleReferences(scaleNames, { 
                background: true,
                phases: ['accessibility_validation', 'content_analysis']
            });
        } catch (error) {
            console.warn('Background validation failed:', error.message);
        }
    }

    /**
     * Validate scale references
     * @param {Array|null} scaleNames - Specific scales to validate, or null for all
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Validation results
     */
    async validateScaleReferences(scaleNames = null, options = {}) {
        if (!this.orchestrator) {
            throw new Error('Validation orchestrator not available');
        }

        if (this.validationState.isValidating && !options.force) {
            throw new Error('Validation already in progress. Use force: true to override.');
        }

        this.validationState.isValidating = true;

        try {
            // Prepare scale citations for validation
            let targetCitations = this.musicEngine.scaleCitations;
            
            if (scaleNames && Array.isArray(scaleNames)) {
                targetCitations = {};
                for (const scaleName of scaleNames) {
                    if (this.musicEngine.scaleCitations[scaleName]) {
                        targetCitations[scaleName] = this.musicEngine.scaleCitations[scaleName];
                    }
                }
            }

            // Configure validation options
            const validationOptions = {
                phases: options.phases || undefined,
                includeFormattedOutput: !options.background,
                includeRawData: options.includeRawData || false,
                includeChangeLog: !options.background,
                background: options.background || false,
                ...options
            };

            // Run validation
            const results = scaleNames ? 
                await this.orchestrator.runPartialValidation(this.musicEngine.scaleCitations, {
                    scaleNames,
                    ...validationOptions
                }) :
                await this.orchestrator.runCompleteValidation(targetCitations, validationOptions);

            // Update validation state
            this.validationState.lastValidation = {
                timestamp: new Date().toISOString(),
                type: scaleNames ? 'partial' : 'complete',
                scaleNames: scaleNames || Object.keys(targetCitations),
                results: results,
                success: results.summary.errors === 0
            };

            // Add to history
            this.validationState.validationHistory.unshift(this.validationState.lastValidation);
            
            // Limit history size
            if (this.validationState.validationHistory.length > 50) {
                this.validationState.validationHistory = this.validationState.validationHistory.slice(0, 50);
            }

            // Apply automatic fixes if enabled and validation found issues
            if (options.autoFix && results.phases.replacement_planning?.replacementPlan?.length > 0) {
                await this.applyAutomaticFixes(results.phases.replacement_planning.replacementPlan, options);
            }

            return results;

        } finally {
            this.validationState.isValidating = false;
        }
    }

    /**
     * Apply automatic fixes for validation issues
     * @param {Array} replacementPlan - Replacement plan from validation
     * @param {Object} options - Fix options
     */
    async applyAutomaticFixes(replacementPlan, options = {}) {
        const autoFixableTypes = options.autoFixTypes || ['inaccessible_url'];
        const maxAutoFixes = options.maxAutoFixes || 10;
        
        let fixesApplied = 0;
        const fixResults = [];

        for (const plan of replacementPlan) {
            if (fixesApplied >= maxAutoFixes) {
                break;
            }

            if (!autoFixableTypes.includes(plan.reason)) {
                continue;
            }

            try {
                // In a real implementation, this would use the replacement system
                // For now, we'll mark the reference for manual review
                const scaleCitation = this.musicEngine.scaleCitations[plan.scaleName];
                if (scaleCitation && scaleCitation.references && scaleCitation.references[plan.referenceIndex]) {
                    const reference = scaleCitation.references[plan.referenceIndex];
                    reference._validationIssue = {
                        reason: plan.reason,
                        timestamp: new Date().toISOString(),
                        autoFixAttempted: true
                    };

                    fixResults.push({
                        scaleName: plan.scaleName,
                        referenceIndex: plan.referenceIndex,
                        action: 'marked_for_review',
                        reason: plan.reason
                    });

                    fixesApplied++;
                }
            } catch (error) {
                fixResults.push({
                    scaleName: plan.scaleName,
                    referenceIndex: plan.referenceIndex,
                    action: 'failed',
                    error: error.message
                });
            }
        }

        this.logValidationFixes(fixResults);
        return fixResults;
    }

    /**
     * Setup validation scheduling
     */
    setupValidationScheduling() {
        const schedule = this.options.validationSchedule;
        let interval;

        switch (schedule) {
            case 'hourly':
                interval = 60 * 60 * 1000; // 1 hour
                break;
            case 'daily':
                interval = 24 * 60 * 60 * 1000; // 24 hours
                break;
            case 'weekly':
                interval = 7 * 24 * 60 * 60 * 1000; // 7 days
                break;
            default:
                if (typeof schedule === 'number') {
                    interval = schedule;
                } else {
                    console.warn('Invalid validation schedule:', schedule);
                    return;
                }
        }

        this.validationState.validationScheduler = setInterval(() => {
            this.runScheduledValidation();
        }, interval);

        console.log(`Validation scheduled to run every ${interval}ms`);
    }

    /**
     * Run scheduled validation
     */
    async runScheduledValidation() {
        try {
            console.log('Running scheduled validation...');
            
            const results = await this.validateScaleReferences(null, {
                background: true,
                phases: ['accessibility_validation', 'content_analysis'],
                autoFix: true,
                autoFixTypes: ['inaccessible_url']
            });

            console.log(`Scheduled validation completed. Errors: ${results.summary.errors}, Warnings: ${results.summary.warnings}`);
            
        } catch (error) {
            console.error('Scheduled validation failed:', error.message);
        }
    }

    /**
     * Schedule startup validation
     */
    scheduleStartupValidation() {
        // Run validation after a short delay to allow system initialization
        setTimeout(() => {
            this.runStartupValidation();
        }, 5000); // 5 second delay
    }

    /**
     * Run startup validation
     */
    async runStartupValidation() {
        try {
            console.log('Running startup validation...');
            
            const results = await this.validateScaleReferences(null, {
                background: true,
                phases: ['accessibility_validation'],
                autoFix: false
            });

            const summary = results.summary;
            console.log(`Startup validation completed. Total references: ${summary.totalReferences}, Errors: ${summary.errors}`);
            
            if (summary.errors > 0) {
                console.warn(`Found ${summary.errors} validation issues. Run full validation to see details.`);
            }
            
        } catch (error) {
            console.error('Startup validation failed:', error.message);
        }
    }

    /**
     * Schedule validation with delay
     * @param {Array|null} scaleNames - Scales to validate
     * @param {number} delay - Delay in milliseconds
     */
    scheduleValidation(scaleNames = null, delay = 0) {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const results = await this.validateScaleReferences(scaleNames);
                    resolve(results);
                } catch (error) {
                    reject(error);
                }
            }, delay);
        });
    }

    /**
     * Get current validation status
     * @returns {Object} Validation status
     */
    getValidationStatus() {
        return {
            isValidating: this.validationState.isValidating,
            lastValidation: this.validationState.lastValidation,
            pendingValidations: Array.from(this.validationState.pendingValidations),
            scheduledValidation: !!this.validationState.validationScheduler,
            validationSchedule: this.options.validationSchedule,
            componentsAvailable: {
                orchestrator: !!this.orchestrator,
                referenceValidator: !!this.referenceValidator,
                reporter: !!this.reporter
            },
            options: this.options
        };
    }

    /**
     * Get validation history
     * @param {number} limit - Maximum number of entries to return
     * @returns {Array} Validation history
     */
    getValidationHistory(limit = 10) {
        return this.validationState.validationHistory.slice(0, limit);
    }

    /**
     * Handle validation progress updates
     * @param {Object} progress - Progress information
     */
    handleValidationProgress(progress) {
        // Emit progress event if the engine supports events
        if (this.musicEngine.emit && typeof this.musicEngine.emit === 'function') {
            this.musicEngine.emit('validationProgress', progress);
        }

        // Log progress for background validations
        if (progress.phase && progress.percentage !== undefined) {
            console.log(`Validation progress: ${progress.phase} - ${progress.percentage}%`);
        }
    }

    /**
     * Handle validation errors
     * @param {Object} error - Error information
     */
    handleValidationError(error) {
        // Emit error event if the engine supports events
        if (this.musicEngine.emit && typeof this.musicEngine.emit === 'function') {
            this.musicEngine.emit('validationError', error);
        }

        console.error('Validation error:', error.error || error.message);
    }

    /**
     * Log reference changes
     * @param {string} action - Action performed (add, update, remove)
     * @param {string} scaleName - Scale name
     * @param {Object} oldReference - Old reference (for updates)
     * @param {Object} newReference - New reference
     * @param {Object} validationResult - Validation result
     */
    logReferenceChange(action, scaleName, oldReference, newReference, validationResult) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            scaleName,
            oldReference,
            newReference,
            validationResult
        };

        // Store in validation history
        if (!this.validationState.referenceChangeLog) {
            this.validationState.referenceChangeLog = [];
        }

        this.validationState.referenceChangeLog.unshift(logEntry);
        
        // Limit log size
        if (this.validationState.referenceChangeLog.length > 100) {
            this.validationState.referenceChangeLog = this.validationState.referenceChangeLog.slice(0, 100);
        }

        console.log(`Reference ${action}: ${scaleName} - ${newReference?.title || 'Unknown'}`);
    }

    /**
     * Log validation fixes
     * @param {Array} fixResults - Results of automatic fixes
     */
    logValidationFixes(fixResults) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'automatic_fixes',
            fixes: fixResults,
            totalFixes: fixResults.length,
            successfulFixes: fixResults.filter(f => f.action !== 'failed').length
        };

        if (!this.validationState.fixLog) {
            this.validationState.fixLog = [];
        }

        this.validationState.fixLog.unshift(logEntry);
        
        // Limit log size
        if (this.validationState.fixLog.length > 50) {
            this.validationState.fixLog = this.validationState.fixLog.slice(0, 50);
        }

        console.log(`Applied ${logEntry.successfulFixes}/${logEntry.totalFixes} automatic fixes`);
    }

    /**
     * Cleanup validation integration
     */
    cleanup() {
        // Clear validation scheduler
        if (this.validationState.validationScheduler) {
            clearInterval(this.validationState.validationScheduler);
            this.validationState.validationScheduler = null;
        }

        // Clear debounce timer
        if (this.validationDebounceTimer) {
            clearTimeout(this.validationDebounceTimer);
            this.validationDebounceTimer = null;
        }

        // Stop any running validations
        if (this.orchestrator && this.validationState.isValidating) {
            this.orchestrator.stopValidation();
        }

        console.log('Validation integration cleaned up');
    }

    /**
     * Get integration statistics
     * @returns {Object} Integration statistics
     */
    getIntegrationStats() {
        const totalScales = Object.keys(this.musicEngine.scaleCitations).length;
        let totalReferences = 0;
        let referencesWithIssues = 0;

        for (const citation of Object.values(this.musicEngine.scaleCitations)) {
            if (citation.references && Array.isArray(citation.references)) {
                totalReferences += citation.references.length;
                
                for (const ref of citation.references) {
                    if (ref._validationIssue) {
                        referencesWithIssues++;
                    }
                }
            }
        }

        return {
            totalScales,
            totalReferences,
            referencesWithIssues,
            validationHistory: this.validationState.validationHistory.length,
            lastValidation: this.validationState.lastValidation?.timestamp || null,
            isIntegrated: true,
            componentsAvailable: {
                orchestrator: !!this.orchestrator,
                referenceValidator: !!this.referenceValidator,
                reporter: !!this.reporter
            }
        };
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MusicTheoryValidationIntegration;
} else if (typeof window !== 'undefined') {
    window.MusicTheoryValidationIntegration = MusicTheoryValidationIntegration;
}