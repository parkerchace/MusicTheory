/**
 * @module EnhancedMusicTheoryIntegration
 * @description Enhanced integration system for MusicTheoryEngine with comprehensive validation
 * @exports EnhancedMusicTheoryIntegration class
 * @feature Complete compatibility with existing scaleCitations structure
 * @feature Advanced validation hooks for all reference operations
 * @feature Backward compatibility with existing APIs
 * @feature Enhanced error handling and recovery
 * @requirements 4.2, 4.3
 */

// Import existing integration and validation components
let MusicTheoryValidationIntegration, ValidationOrchestrator, ReferenceValidator;
if (typeof require !== 'undefined') {
    try {
        MusicTheoryValidationIntegration = require('./music-theory-validation-integration.js');
        ValidationOrchestrator = require('./validation-orchestrator.js');
        ReferenceValidator = require('./reference-validator.js');
    } catch (e) {
        console.warn('Some validation modules not available:', e.message);
    }
} else if (typeof window !== 'undefined') {
    if (window.MusicTheoryValidationIntegration) MusicTheoryValidationIntegration = window.MusicTheoryValidationIntegration;
    if (window.ValidationOrchestrator) ValidationOrchestrator = window.ValidationOrchestrator;
    if (window.ReferenceValidator) ReferenceValidator = window.ReferenceValidator;
}

class EnhancedMusicTheoryIntegration {
    constructor(musicTheoryEngine, options = {}) {
        if (!musicTheoryEngine) {
            throw new Error('MusicTheoryEngine instance is required');
        }
        
        this.musicEngine = musicTheoryEngine;
        this.options = {
            // Compatibility options
            preserveExistingStructure: options.preserveExistingStructure !== false,
            enableBackwardCompatibility: options.enableBackwardCompatibility !== false,
            validateExistingReferences: options.validateExistingReferences !== false,
            
            // Enhanced validation options
            enableRealTimeValidation: options.enableRealTimeValidation !== false,
            enableBatchValidation: options.enableBatchValidation !== false,
            enableValidationCaching: options.enableValidationCaching !== false,
            
            // Hook configuration
            hookAllMethods: options.hookAllMethods !== false,
            enablePreValidationHooks: options.enablePreValidationHooks !== false,
            enablePostValidationHooks: options.enablePostValidationHooks !== false,
            
            ...options
        };
        
        // Initialize base integration if available
        this.baseIntegration = MusicTheoryValidationIntegration ? 
            new MusicTheoryValidationIntegration(musicTheoryEngine, options) : null;
        
        // Enhanced validation state
        this.enhancedState = {
            originalMethods: new Map(),
            validationCache: new Map(),
            hookRegistry: new Map(),
            compatibilityChecks: new Map(),
            migrationLog: []
        };
        
        // Initialize enhanced integration
        this.initializeEnhancedIntegration();
    }
    /**
     * Initialize enhanced integration with comprehensive compatibility checks
     */
    initializeEnhancedIntegration() {
        // Step 1: Verify existing scaleCitations structure compatibility
        this.verifyScaleCitationsCompatibility();
        
        // Step 2: Setup enhanced validation hooks
        this.setupEnhancedValidationHooks();
        
        // Step 3: Initialize validation caching if enabled
        if (this.options.enableValidationCaching) {
            this.initializeValidationCaching();
        }
        
        // Step 4: Setup real-time validation if enabled
        if (this.options.enableRealTimeValidation) {
            this.setupRealTimeValidation();
        }
        
        // Step 5: Validate existing references if requested
        if (this.options.validateExistingReferences) {
            this.scheduleExistingReferenceValidation();
        }
        
        console.log('Enhanced MusicTheoryEngine integration initialized');
    }

    /**
     * Verify compatibility with existing scaleCitations structure
     */
    verifyScaleCitationsCompatibility() {
        const citations = this.musicEngine.scaleCitations;
        const compatibilityReport = {
            totalScales: 0,
            validStructures: 0,
            invalidStructures: 0,
            missingFields: [],
            structureIssues: [],
            migrationNeeded: false
        };

        if (!citations || typeof citations !== 'object') {
            throw new Error('scaleCitations is not a valid object');
        }

        for (const [scaleName, citation] of Object.entries(citations)) {
            compatibilityReport.totalScales++;
            
            const structureCheck = this.validateCitationStructure(scaleName, citation);
            
            if (structureCheck.valid) {
                compatibilityReport.validStructures++;
            } else {
                compatibilityReport.invalidStructures++;
                compatibilityReport.structureIssues.push({
                    scaleName,
                    issues: structureCheck.issues
                });
                
                // Auto-migrate if enabled and safe
                if (this.options.enableAutoMigration && structureCheck.canAutoMigrate) {
                    this.migrateCitationStructure(scaleName, citation, structureCheck.migrationPlan);
                    compatibilityReport.migrationNeeded = true;
                }
            }
        }

        this.enhancedState.compatibilityChecks.set('initial', compatibilityReport);
        
        if (compatibilityReport.invalidStructures > 0 && !this.options.enableAutoMigration) {
            console.warn(`Found ${compatibilityReport.invalidStructures} scales with structure issues. Consider enabling auto-migration.`);
        }

        return compatibilityReport;
    }

    /**
     * Validate individual citation structure
     * @param {string} scaleName - Scale name
     * @param {Object} citation - Citation object
     * @returns {Object} Validation result
     */
    validateCitationStructure(scaleName, citation) {
        const issues = [];
        let canAutoMigrate = true;
        const migrationPlan = [];

        // Check basic structure
        if (!citation || typeof citation !== 'object') {
            issues.push('Citation is not an object');
            canAutoMigrate = false;
            return { valid: false, issues, canAutoMigrate, migrationPlan };
        }

        // Check required fields
        if (!citation.description) {
            issues.push('Missing description field');
            migrationPlan.push({ action: 'add_description', value: `Scale: ${scaleName}` });
        }

        // Check references structure
        if (!citation.references) {
            issues.push('Missing references field');
            migrationPlan.push({ action: 'add_references', value: [] });
        } else if (!Array.isArray(citation.references)) {
            issues.push('References field is not an array');
            migrationPlan.push({ action: 'convert_references_to_array', oldValue: citation.references });
        } else {
            // Validate individual references
            for (let i = 0; i < citation.references.length; i++) {
                const ref = citation.references[i];
                const refIssues = this.validateReferenceStructure(ref, i);
                
                if (refIssues.length > 0) {
                    issues.push(`Reference ${i}: ${refIssues.join(', ')}`);
                    migrationPlan.push({ 
                        action: 'fix_reference', 
                        index: i, 
                        issues: refIssues,
                        reference: ref 
                    });
                }
            }
        }

        // Check optional but recommended fields
        const recommendedFields = ['culturalContext', 'scholarlyDebate', 'tuningSystem'];
        for (const field of recommendedFields) {
            if (!citation[field]) {
                // This is not an error, just a note
                migrationPlan.push({ 
                    action: 'note_missing_optional', 
                    field, 
                    recommendation: `Consider adding ${field} for enhanced documentation` 
                });
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            canAutoMigrate,
            migrationPlan
        };
    }

    /**
     * Validate reference structure
     * @param {Object} reference - Reference object
     * @param {number} index - Reference index
     * @returns {Array} List of issues
     */
    validateReferenceStructure(reference, index) {
        const issues = [];

        if (!reference || typeof reference !== 'object') {
            issues.push('Reference is not an object');
            return issues;
        }

        // Required fields
        if (!reference.url) issues.push('Missing URL');
        if (!reference.title) issues.push('Missing title');
        if (!reference.type) issues.push('Missing type');

        // Validate URL format
        if (reference.url) {
            try {
                new URL(reference.url);
            } catch (e) {
                issues.push('Invalid URL format');
            }
        }

        // Validate type
        const validTypes = [
            'journal_article', 'book', 'educational_resource', 
            'ethnomusicological_study', 'website', 'custom'
        ];
        if (reference.type && !validTypes.includes(reference.type)) {
            issues.push(`Invalid type: ${reference.type}`);
        }

        // Check for validation issue markers (from previous validations)
        if (reference._validationIssue) {
            // This is not an error, but note it for tracking
            issues.push(`Has validation issue: ${reference._validationIssue.reason}`);
        }

        return issues;
    }
    /**
     * Migrate citation structure to ensure compatibility
     * @param {string} scaleName - Scale name
     * @param {Object} citation - Citation object
     * @param {Array} migrationPlan - Migration actions to perform
     */
    migrateCitationStructure(scaleName, citation, migrationPlan) {
        const migrationLog = {
            scaleName,
            timestamp: new Date().toISOString(),
            actions: [],
            success: true,
            errors: []
        };

        for (const action of migrationPlan) {
            try {
                switch (action.action) {
                    case 'add_description':
                        citation.description = action.value;
                        migrationLog.actions.push(`Added description: "${action.value}"`);
                        break;
                        
                    case 'add_references':
                        citation.references = action.value;
                        migrationLog.actions.push('Added empty references array');
                        break;
                        
                    case 'convert_references_to_array':
                        const oldRefs = citation.references;
                        citation.references = Array.isArray(oldRefs) ? oldRefs : [oldRefs];
                        migrationLog.actions.push('Converted references to array format');
                        break;
                        
                    case 'fix_reference':
                        const ref = citation.references[action.index];
                        if (ref) {
                            // Apply basic fixes
                            if (!ref.title && ref.url) {
                                ref.title = `Reference for ${scaleName}`;
                            }
                            if (!ref.type) {
                                ref.type = 'website';
                            }
                            migrationLog.actions.push(`Fixed reference ${action.index}`);
                        }
                        break;
                        
                    case 'note_missing_optional':
                        migrationLog.actions.push(`Note: ${action.recommendation}`);
                        break;
                        
                    default:
                        migrationLog.actions.push(`Unknown action: ${action.action}`);
                }
            } catch (error) {
                migrationLog.success = false;
                migrationLog.errors.push(`Action ${action.action}: ${error.message}`);
            }
        }

        this.enhancedState.migrationLog.push(migrationLog);
        
        if (migrationLog.success) {
            console.log(`Migrated citation structure for ${scaleName}: ${migrationLog.actions.length} actions`);
        } else {
            console.error(`Migration failed for ${scaleName}:`, migrationLog.errors);
        }

        return migrationLog;
    }

    /**
     * Setup enhanced validation hooks for all MusicTheoryEngine methods
     */
    setupEnhancedValidationHooks() {
        if (!this.options.hookAllMethods) {
            return;
        }

        // Methods that modify scale citations
        const methodsToHook = [
            'addScale',
            'updateScale', 
            'removeScale',
            'addScaleReference',
            'updateScaleReference',
            'removeScaleReference',
            'updateScaleCitation',
            'setScaleCitation'
        ];

        for (const methodName of methodsToHook) {
            this.hookMethod(methodName);
        }

        // Hook property setters if they exist
        this.hookPropertySetters();

        console.log(`Hooked ${methodsToHook.length} methods for validation`);
    }

    /**
     * Hook a specific method with validation
     * @param {string} methodName - Method name to hook
     */
    hookMethod(methodName) {
        const originalMethod = this.musicEngine[methodName];
        
        if (!originalMethod || typeof originalMethod !== 'function') {
            // Method doesn't exist, create a placeholder that validates
            this.musicEngine[methodName] = (...args) => {
                throw new Error(`Method ${methodName} is not implemented in this MusicTheoryEngine version`);
            };
            return;
        }

        // Store original method
        this.enhancedState.originalMethods.set(methodName, originalMethod.bind(this.musicEngine));

        // Create enhanced wrapper
        this.musicEngine[methodName] = async (...args) => {
            const hookContext = {
                methodName,
                args,
                timestamp: new Date().toISOString(),
                preValidationResult: null,
                postValidationResult: null,
                executionResult: null,
                errors: []
            };

            try {
                // Pre-validation hook
                if (this.options.enablePreValidationHooks) {
                    hookContext.preValidationResult = await this.executePreValidationHook(methodName, args);
                    
                    if (hookContext.preValidationResult && !hookContext.preValidationResult.allowed) {
                        throw new Error(`Pre-validation failed: ${hookContext.preValidationResult.reason}`);
                    }
                }

                // Execute original method
                const originalMethodBound = this.enhancedState.originalMethods.get(methodName);
                hookContext.executionResult = await originalMethodBound(...args);

                // Post-validation hook
                if (this.options.enablePostValidationHooks) {
                    hookContext.postValidationResult = await this.executePostValidationHook(
                        methodName, 
                        args, 
                        hookContext.executionResult
                    );
                }

                // Log successful hook execution
                this.logHookExecution(hookContext);

                return hookContext.executionResult;

            } catch (error) {
                hookContext.errors.push(error.message);
                this.logHookExecution(hookContext);
                throw error;
            }
        };

        this.enhancedState.hookRegistry.set(methodName, {
            hooked: true,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Hook property setters for scaleCitations
     */
    hookPropertySetters() {
        const originalScaleCitations = this.musicEngine.scaleCitations;
        
        // Create a proxy to intercept property changes
        this.musicEngine.scaleCitations = new Proxy(originalScaleCitations, {
            set: (target, property, value) => {
                // Validate the new citation structure
                if (typeof property === 'string' && value && typeof value === 'object') {
                    const validationResult = this.validateCitationStructure(property, value);
                    
                    if (!validationResult.valid && !this.options.allowInvalidStructures) {
                        console.warn(`Invalid citation structure for ${property}:`, validationResult.issues);
                        
                        if (this.options.enableAutoMigration && validationResult.canAutoMigrate) {
                            this.migrateCitationStructure(property, value, validationResult.migrationPlan);
                        }
                    }
                }

                // Set the property
                target[property] = value;

                // Trigger validation if enabled
                if (this.options.enableRealTimeValidation && typeof property === 'string') {
                    this.scheduleRealTimeValidation(property);
                }

                return true;
            },
            
            deleteProperty: (target, property) => {
                console.log(`Scale citation deleted: ${property}`);
                delete target[property];
                return true;
            }
        });
    }
    /**
     * Execute pre-validation hook
     * @param {string} methodName - Method being called
     * @param {Array} args - Method arguments
     * @returns {Promise<Object>} Validation result
     */
    async executePreValidationHook(methodName, args) {
        const result = {
            allowed: true,
            reason: null,
            validationPerformed: false,
            issues: []
        };

        try {
            switch (methodName) {
                case 'addScale':
                case 'updateScale':
                    if (args[0] && args[0].references) {
                        result.validationPerformed = true;
                        const refValidation = await this.validateReferencesBeforeAdd(args[0].references);
                        if (!refValidation.allValid) {
                            result.allowed = false;
                            result.reason = `Invalid references: ${refValidation.issues.join(', ')}`;
                            result.issues = refValidation.issues;
                        }
                    }
                    break;
                    
                case 'addScaleReference':
                    if (args[1]) { // args[1] should be the reference object
                        result.validationPerformed = true;
                        const refStructure = this.validateReferenceStructure(args[1], 0);
                        if (refStructure.length > 0) {
                            result.allowed = this.options.allowInvalidReferences || false;
                            result.reason = `Invalid reference structure: ${refStructure.join(', ')}`;
                            result.issues = refStructure;
                        }
                    }
                    break;
                    
                case 'updateScaleCitation':
                    if (args[1]) { // args[1] should be the citation object
                        result.validationPerformed = true;
                        const citationValidation = this.validateCitationStructure(args[0], args[1]);
                        if (!citationValidation.valid) {
                            result.allowed = this.options.allowInvalidStructures || false;
                            result.reason = `Invalid citation structure: ${citationValidation.issues.join(', ')}`;
                            result.issues = citationValidation.issues;
                        }
                    }
                    break;
            }
        } catch (error) {
            result.allowed = false;
            result.reason = `Pre-validation error: ${error.message}`;
            result.issues.push(error.message);
        }

        return result;
    }

    /**
     * Execute post-validation hook
     * @param {string} methodName - Method that was called
     * @param {Array} args - Method arguments
     * @param {*} result - Method execution result
     * @returns {Promise<Object>} Validation result
     */
    async executePostValidationHook(methodName, args, result) {
        const validationResult = {
            validationPerformed: false,
            issues: [],
            recommendations: []
        };

        try {
            switch (methodName) {
                case 'addScale':
                case 'updateScale':
                    if (args[0] && args[0].scaleId) {
                        validationResult.validationPerformed = true;
                        
                        // Schedule validation of the new/updated scale
                        if (this.baseIntegration) {
                            this.baseIntegration.scheduleReferenceValidation(
                                args[0].scaleId, 
                                args[0].references || []
                            );
                        }
                        
                        validationResult.recommendations.push('Scheduled reference validation for new scale');
                    }
                    break;
                    
                case 'addScaleReference':
                    if (args[0] && args[1]) { // scaleName and reference
                        validationResult.validationPerformed = true;
                        
                        // Validate the newly added reference
                        if (this.options.enableRealTimeValidation) {
                            this.scheduleRealTimeValidation(args[0], [args[1]]);
                        }
                        
                        validationResult.recommendations.push('Scheduled real-time validation for new reference');
                    }
                    break;
            }
        } catch (error) {
            validationResult.issues.push(`Post-validation error: ${error.message}`);
        }

        return validationResult;
    }

    /**
     * Validate references before adding them
     * @param {Array} references - References to validate
     * @returns {Promise<Object>} Validation result
     */
    async validateReferencesBeforeAdd(references) {
        const result = {
            allValid: true,
            validCount: 0,
            invalidCount: 0,
            issues: []
        };

        if (!Array.isArray(references)) {
            result.allValid = false;
            result.issues.push('References must be an array');
            return result;
        }

        for (let i = 0; i < references.length; i++) {
            const ref = references[i];
            const refIssues = this.validateReferenceStructure(ref, i);
            
            if (refIssues.length === 0) {
                result.validCount++;
            } else {
                result.invalidCount++;
                result.allValid = false;
                result.issues.push(`Reference ${i}: ${refIssues.join(', ')}`);
            }
        }

        return result;
    }

    /**
     * Initialize validation caching system
     */
    initializeValidationCaching() {
        this.enhancedState.validationCache = new Map();
        
        // Cache configuration
        this.cacheConfig = {
            maxSize: this.options.cacheMaxSize || 1000,
            ttl: this.options.cacheTTL || 3600000, // 1 hour default
            cleanupInterval: this.options.cacheCleanupInterval || 600000 // 10 minutes
        };

        // Setup cache cleanup
        this.cacheCleanupTimer = setInterval(() => {
            this.cleanupValidationCache();
        }, this.cacheConfig.cleanupInterval);

        console.log('Validation caching initialized');
    }

    /**
     * Get cached validation result
     * @param {string} key - Cache key
     * @returns {Object|null} Cached result or null
     */
    getCachedValidation(key) {
        if (!this.options.enableValidationCaching) {
            return null;
        }

        const cached = this.enhancedState.validationCache.get(key);
        
        if (!cached) {
            return null;
        }

        // Check TTL
        if (Date.now() - cached.timestamp > this.cacheConfig.ttl) {
            this.enhancedState.validationCache.delete(key);
            return null;
        }

        return cached.result;
    }

    /**
     * Cache validation result
     * @param {string} key - Cache key
     * @param {Object} result - Validation result
     */
    cacheValidationResult(key, result) {
        if (!this.options.enableValidationCaching) {
            return;
        }

        // Check cache size limit
        if (this.enhancedState.validationCache.size >= this.cacheConfig.maxSize) {
            // Remove oldest entries
            const entries = Array.from(this.enhancedState.validationCache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = Math.floor(this.cacheConfig.maxSize * 0.1); // Remove 10%
            for (let i = 0; i < toRemove; i++) {
                this.enhancedState.validationCache.delete(entries[i][0]);
            }
        }

        this.enhancedState.validationCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }

    /**
     * Cleanup expired cache entries
     */
    cleanupValidationCache() {
        const now = Date.now();
        const toDelete = [];

        for (const [key, cached] of this.enhancedState.validationCache.entries()) {
            if (now - cached.timestamp > this.cacheConfig.ttl) {
                toDelete.push(key);
            }
        }

        for (const key of toDelete) {
            this.enhancedState.validationCache.delete(key);
        }

        if (toDelete.length > 0) {
            console.log(`Cleaned up ${toDelete.length} expired cache entries`);
        }
    }
    /**
     * Setup real-time validation system
     */
    setupRealTimeValidation() {
        this.realTimeConfig = {
            debounceDelay: this.options.realTimeDebounceDelay || 1000,
            maxConcurrentValidations: this.options.maxConcurrentValidations || 3,
            validationQueue: [],
            activeValidations: new Set()
        };

        console.log('Real-time validation system initialized');
    }

    /**
     * Schedule real-time validation for a scale
     * @param {string} scaleName - Scale to validate
     * @param {Array} specificReferences - Specific references to validate (optional)
     */
    scheduleRealTimeValidation(scaleName, specificReferences = null) {
        if (!this.options.enableRealTimeValidation) {
            return;
        }

        const validationKey = `${scaleName}_${Date.now()}`;
        
        // Add to queue
        this.realTimeConfig.validationQueue.push({
            key: validationKey,
            scaleName,
            specificReferences,
            timestamp: Date.now()
        });

        // Debounce validation execution
        if (this.realTimeValidationTimer) {
            clearTimeout(this.realTimeValidationTimer);
        }

        this.realTimeValidationTimer = setTimeout(() => {
            this.processRealTimeValidationQueue();
        }, this.realTimeConfig.debounceDelay);
    }

    /**
     * Process real-time validation queue
     */
    async processRealTimeValidationQueue() {
        if (this.realTimeConfig.activeValidations.size >= this.realTimeConfig.maxConcurrentValidations) {
            // Reschedule if too many active validations
            setTimeout(() => this.processRealTimeValidationQueue(), 1000);
            return;
        }

        const validationsToProcess = this.realTimeConfig.validationQueue.splice(0, 
            this.realTimeConfig.maxConcurrentValidations - this.realTimeConfig.activeValidations.size
        );

        for (const validation of validationsToProcess) {
            this.executeRealTimeValidation(validation);
        }
    }

    /**
     * Execute real-time validation
     * @param {Object} validation - Validation task
     */
    async executeRealTimeValidation(validation) {
        this.realTimeConfig.activeValidations.add(validation.key);

        try {
            if (this.baseIntegration) {
                await this.baseIntegration.validateScaleReferences([validation.scaleName], {
                    background: true,
                    phases: ['accessibility_validation'],
                    realTime: true
                });
            }
        } catch (error) {
            console.warn(`Real-time validation failed for ${validation.scaleName}:`, error.message);
        } finally {
            this.realTimeConfig.activeValidations.delete(validation.key);
        }
    }

    /**
     * Schedule validation of existing references
     */
    scheduleExistingReferenceValidation() {
        setTimeout(() => {
            this.validateExistingReferences();
        }, 2000); // 2 second delay to allow initialization
    }

    /**
     * Validate all existing references
     */
    async validateExistingReferences() {
        try {
            console.log('Starting validation of existing references...');
            
            if (this.baseIntegration) {
                const results = await this.baseIntegration.validateScaleReferences(null, {
                    background: true,
                    phases: ['accessibility_validation', 'content_analysis'],
                    includeFormattedOutput: false
                });

                console.log(`Existing reference validation completed. Total: ${results.summary.totalReferences}, Errors: ${results.summary.errors}`);
            } else {
                console.warn('Base integration not available for existing reference validation');
            }
        } catch (error) {
            console.error('Existing reference validation failed:', error.message);
        }
    }

    /**
     * Log hook execution for debugging and monitoring
     * @param {Object} hookContext - Hook execution context
     */
    logHookExecution(hookContext) {
        const logEntry = {
            timestamp: hookContext.timestamp,
            method: hookContext.methodName,
            success: hookContext.errors.length === 0,
            preValidation: hookContext.preValidationResult?.validationPerformed || false,
            postValidation: hookContext.postValidationResult?.validationPerformed || false,
            errors: hookContext.errors,
            executionTime: Date.now() - new Date(hookContext.timestamp).getTime()
        };

        // Store in a limited log
        if (!this.enhancedState.hookExecutionLog) {
            this.enhancedState.hookExecutionLog = [];
        }

        this.enhancedState.hookExecutionLog.unshift(logEntry);
        
        // Limit log size
        if (this.enhancedState.hookExecutionLog.length > 100) {
            this.enhancedState.hookExecutionLog = this.enhancedState.hookExecutionLog.slice(0, 100);
        }
    }

    /**
     * Get integration status and statistics
     * @returns {Object} Integration status
     */
    getIntegrationStatus() {
        const baseStatus = this.baseIntegration ? 
            this.baseIntegration.getValidationStatus() : 
            { isValidating: false, componentsAvailable: {} };

        return {
            ...baseStatus,
            enhanced: true,
            compatibility: {
                structureVerified: this.enhancedState.compatibilityChecks.has('initial'),
                migrationPerformed: this.enhancedState.migrationLog.length > 0,
                hooksActive: this.enhancedState.hookRegistry.size > 0
            },
            caching: {
                enabled: this.options.enableValidationCaching,
                cacheSize: this.enhancedState.validationCache?.size || 0,
                cacheHitRate: this.calculateCacheHitRate()
            },
            realTime: {
                enabled: this.options.enableRealTimeValidation,
                queueSize: this.realTimeConfig?.validationQueue?.length || 0,
                activeValidations: this.realTimeConfig?.activeValidations?.size || 0
            },
            hooks: {
                totalHooked: this.enhancedState.hookRegistry.size,
                recentExecutions: this.enhancedState.hookExecutionLog?.length || 0
            }
        };
    }

    /**
     * Calculate cache hit rate for monitoring
     * @returns {number} Cache hit rate percentage
     */
    calculateCacheHitRate() {
        // This would be implemented with actual cache statistics
        // For now, return a placeholder
        return 0;
    }

    /**
     * Get compatibility report
     * @returns {Object} Compatibility report
     */
    getCompatibilityReport() {
        return {
            initialCheck: this.enhancedState.compatibilityChecks.get('initial'),
            migrations: this.enhancedState.migrationLog,
            currentStatus: this.verifyScaleCitationsCompatibility()
        };
    }

    /**
     * Cleanup enhanced integration
     */
    cleanup() {
        // Cleanup base integration
        if (this.baseIntegration && typeof this.baseIntegration.cleanup === 'function') {
            this.baseIntegration.cleanup();
        }

        // Cleanup timers
        if (this.cacheCleanupTimer) {
            clearInterval(this.cacheCleanupTimer);
        }
        
        if (this.realTimeValidationTimer) {
            clearTimeout(this.realTimeValidationTimer);
        }

        // Restore original methods
        for (const [methodName, originalMethod] of this.enhancedState.originalMethods.entries()) {
            this.musicEngine[methodName] = originalMethod;
        }

        // Clear state
        this.enhancedState.validationCache?.clear();
        this.enhancedState.hookRegistry.clear();
        this.enhancedState.originalMethods.clear();

        console.log('Enhanced MusicTheoryEngine integration cleaned up');
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedMusicTheoryIntegration;
} else if (typeof window !== 'undefined') {
    window.EnhancedMusicTheoryIntegration = EnhancedMusicTheoryIntegration;
}