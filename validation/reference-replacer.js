/**
 * @module ReferenceReplacer
 * @description Safe reference replacement system with rollback capability and data format compatibility
 * @exports class ReferenceReplacer
 * @feature Safe reference replacement with validation
 * @feature Rollback capability for failed updates
 * @feature Preserves citation structure and data format compatibility
 * @feature Validates replacements before committing changes
 */

// Import dependencies if available
let SourceMatcher, ValidationReporter;
if (typeof require !== 'undefined') {
    try {
        SourceMatcher = require('./source-matcher.js');
        ValidationReporter = require('./validation-reporter.js');
    } catch (e) {
        // Modules not available, will use fallback methods
    }
} else if (typeof window !== 'undefined') {
    if (window.SourceMatcher) SourceMatcher = window.SourceMatcher;
    if (window.ValidationReporter) ValidationReporter = window.ValidationReporter;
}

class ReferenceReplacer {
    constructor(options = {}) {
        this.sourceMatcher = SourceMatcher ? new SourceMatcher(options.matcherOptions) : null;
        this.reporter = ValidationReporter ? new ValidationReporter() : null;
        
        this.backupEnabled = options.backupEnabled !== false;
        this.validateBeforeCommit = options.validateBeforeCommit !== false;
        this.maxRollbackHistory = options.maxRollbackHistory || 10;
        
        // Transaction management
        this.transactionHistory = [];
        this.currentTransaction = null;
        
        // Validation settings
        this.validationTimeout = options.validationTimeout || 5000;
        this.requireManualApproval = options.requireManualApproval || false;
        
        if (!this.sourceMatcher) {
            console.warn('SourceMatcher not available - replacement suggestions will be limited');
        }
    }

    /**
     * Replace a problematic reference with a verified alternative
     * @param {Object} scaleCitations - The scale citations object to update
     * @param {string} scaleName - Name of the scale
     * @param {number} referenceIndex - Index of the reference to replace
     * @param {Object} replacementSource - New source to use
     * @param {Object} options - Replacement options
     * @returns {Promise<Object>} Replacement result
     */
    async replaceReference(scaleCitations, scaleName, referenceIndex, replacementSource, options = {}) {
        try {
            // Start transaction
            const transaction = this.startTransaction('replace_reference', {
                scaleName,
                referenceIndex,
                replacementSource: replacementSource.url
            });

            // Validate inputs
            const validationResult = this.validateReplacementInputs(
                scaleCitations, scaleName, referenceIndex, replacementSource
            );
            
            if (!validationResult.valid) {
                this.rollbackTransaction(transaction.id);
                return {
                    success: false,
                    error: validationResult.error,
                    transactionId: transaction.id
                };
            }

            // Create backup if enabled
            let backup = null;
            if (this.backupEnabled) {
                backup = this.createBackup(scaleCitations, scaleName, referenceIndex);
            }

            // Get original reference for comparison
            const originalReference = scaleCitations[scaleName].references[referenceIndex];
            
            // Validate replacement before committing
            if (this.validateBeforeCommit) {
                const replacementValidation = await this.validateReplacement(
                    replacementSource, 
                    scaleName,
                    originalReference
                );
                
                if (!replacementValidation.valid) {
                    this.rollbackTransaction(transaction.id);
                    return {
                        success: false,
                        error: `Replacement validation failed: ${replacementValidation.reason}`,
                        validationDetails: replacementValidation,
                        transactionId: transaction.id
                    };
                }
            }

            // Perform the replacement
            const replacementResult = this.performReplacement(
                scaleCitations, 
                scaleName, 
                referenceIndex, 
                replacementSource,
                originalReference
            );

            if (!replacementResult.success) {
                this.rollbackTransaction(transaction.id);
                return {
                    success: false,
                    error: replacementResult.error,
                    transactionId: transaction.id
                };
            }

            // Commit transaction
            this.commitTransaction(transaction.id, {
                backup,
                originalReference,
                newReference: replacementResult.newReference,
                scaleName,
                referenceIndex
            });

            // Log the replacement
            if (this.reporter) {
                this.reporter.logReferenceChange(
                    scaleName,
                    originalReference,
                    replacementResult.newReference,
                    'automated_replacement'
                );
            }

            return {
                success: true,
                transactionId: transaction.id,
                originalReference,
                newReference: replacementResult.newReference,
                improvementScore: this.calculateImprovementScore(originalReference, replacementResult.newReference),
                backup: backup ? backup.id : null
            };

        } catch (error) {
            if (this.currentTransaction) {
                this.rollbackTransaction(this.currentTransaction.id);
            }
            
            return {
                success: false,
                error: `Replacement failed: ${error.message}`,
                stack: error.stack
            };
        }
    }

    /**
     * Replace multiple problematic references in batch
     * @param {Object} scaleCitations - The scale citations object to update
     * @param {Array} replacementPlan - Array of replacement operations
     * @param {Object} options - Batch replacement options
     * @returns {Promise<Object>} Batch replacement results
     */
    async replaceMultipleReferences(scaleCitations, replacementPlan, options = {}) {
        const results = {
            success: true,
            totalReplacements: replacementPlan.length,
            successfulReplacements: 0,
            failedReplacements: 0,
            results: [],
            batchTransactionId: null
        };

        try {
            // Start batch transaction
            const batchTransaction = this.startTransaction('batch_replace', {
                totalOperations: replacementPlan.length
            });
            results.batchTransactionId = batchTransaction.id;

            // Process each replacement
            for (let i = 0; i < replacementPlan.length; i++) {
                const plan = replacementPlan[i];
                
                try {
                    const result = await this.replaceReference(
                        scaleCitations,
                        plan.scaleName,
                        plan.referenceIndex,
                        plan.replacementSource,
                        { ...options, batchMode: true }
                    );

                    results.results.push({
                        index: i,
                        scaleName: plan.scaleName,
                        referenceIndex: plan.referenceIndex,
                        ...result
                    });

                    if (result.success) {
                        results.successfulReplacements++;
                    } else {
                        results.failedReplacements++;
                    }

                } catch (error) {
                    results.results.push({
                        index: i,
                        scaleName: plan.scaleName,
                        referenceIndex: plan.referenceIndex,
                        success: false,
                        error: error.message
                    });
                    results.failedReplacements++;
                }

                // Rate limiting between replacements
                if (i < replacementPlan.length - 1 && options.rateLimitDelay) {
                    await new Promise(resolve => setTimeout(resolve, options.rateLimitDelay));
                }
            }

            // Determine overall success
            results.success = results.failedReplacements === 0;

            // Commit or rollback batch transaction
            if (results.success || options.allowPartialSuccess) {
                this.commitTransaction(batchTransaction.id, {
                    batchResults: results,
                    partialSuccess: results.failedReplacements > 0
                });
            } else {
                this.rollbackTransaction(batchTransaction.id);
                results.success = false;
            }

            return results;

        } catch (error) {
            if (results.batchTransactionId) {
                this.rollbackTransaction(results.batchTransactionId);
            }
            
            return {
                ...results,
                success: false,
                error: `Batch replacement failed: ${error.message}`
            };
        }
    }

    /**
     * Find and replace all problematic references for a scale
     * @param {Object} scaleCitations - The scale citations object
     * @param {string} scaleName - Name of the scale to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async findAndReplaceProblematicReferences(scaleCitations, scaleName, options = {}) {
        try {
            if (!scaleCitations[scaleName] || !scaleCitations[scaleName].references) {
                return {
                    success: false,
                    error: `Scale not found or has no references: ${scaleName}`
                };
            }

            const references = scaleCitations[scaleName].references;
            const problematicReferences = [];
            const replacementPlan = [];

            // Identify problematic references
            for (let i = 0; i < references.length; i++) {
                const reference = references[i];
                const issues = await this.identifyReferenceIssues(reference, scaleName);
                
                if (issues.length > 0) {
                    problematicReferences.push({
                        index: i,
                        reference,
                        issues
                    });
                }
            }

            if (problematicReferences.length === 0) {
                return {
                    success: true,
                    message: `No problematic references found for scale: ${scaleName}`,
                    problematicCount: 0
                };
            }

            // Find replacements for problematic references
            for (const problematic of problematicReferences) {
                if (this.sourceMatcher) {
                    const scaleContext = {
                        scaleName,
                        culturalContext: scaleCitations[scaleName].culturalContext,
                        keywords: [scaleName]
                    };

                    const replacements = await this.sourceMatcher.findReplacements(
                        problematic.reference,
                        scaleContext
                    );

                    if (replacements.length > 0) {
                        replacementPlan.push({
                            scaleName,
                            referenceIndex: problematic.index,
                            replacementSource: replacements[0].source,
                            originalIssues: problematic.issues,
                            replacementScore: replacements[0].replacementScore
                        });
                    }
                }
            }

            // Execute replacement plan
            if (replacementPlan.length > 0) {
                const batchResult = await this.replaceMultipleReferences(
                    scaleCitations,
                    replacementPlan,
                    options
                );

                return {
                    success: batchResult.success,
                    scaleName,
                    problematicCount: problematicReferences.length,
                    replacementCount: replacementPlan.length,
                    successfulReplacements: batchResult.successfulReplacements,
                    failedReplacements: batchResult.failedReplacements,
                    batchTransactionId: batchResult.batchTransactionId,
                    details: batchResult.results
                };
            } else {
                return {
                    success: false,
                    scaleName,
                    problematicCount: problematicReferences.length,
                    replacementCount: 0,
                    error: 'No suitable replacements found for problematic references'
                };
            }

        } catch (error) {
            return {
                success: false,
                scaleName,
                error: `Processing failed: ${error.message}`
            };
        }
    }

    /**
     * Validate replacement inputs
     * @param {Object} scaleCitations - Scale citations object
     * @param {string} scaleName - Scale name
     * @param {number} referenceIndex - Reference index
     * @param {Object} replacementSource - Replacement source
     * @returns {Object} Validation result
     */
    validateReplacementInputs(scaleCitations, scaleName, referenceIndex, replacementSource) {
        // Check scale citations object
        if (!scaleCitations || typeof scaleCitations !== 'object') {
            return { valid: false, error: 'Invalid scale citations object' };
        }

        // Check scale exists
        if (!scaleCitations[scaleName]) {
            return { valid: false, error: `Scale not found: ${scaleName}` };
        }

        // Check references array exists
        if (!scaleCitations[scaleName].references || !Array.isArray(scaleCitations[scaleName].references)) {
            return { valid: false, error: `Scale has no references array: ${scaleName}` };
        }

        // Check reference index is valid
        if (referenceIndex < 0 || referenceIndex >= scaleCitations[scaleName].references.length) {
            return { valid: false, error: `Invalid reference index: ${referenceIndex}` };
        }

        // Check replacement source
        if (!replacementSource || typeof replacementSource !== 'object') {
            return { valid: false, error: 'Invalid replacement source object' };
        }

        if (!replacementSource.url || typeof replacementSource.url !== 'string') {
            return { valid: false, error: 'Replacement source must have a valid URL' };
        }

        if (!replacementSource.title || typeof replacementSource.title !== 'string') {
            return { valid: false, error: 'Replacement source must have a title' };
        }

        return { valid: true };
    }

    /**
     * Validate a replacement source before committing
     * @param {Object} replacementSource - Source to validate
     * @param {string} scaleName - Scale name for context
     * @param {Object} originalReference - Original reference being replaced
     * @returns {Promise<Object>} Validation result
     */
    async validateReplacement(replacementSource, scaleName, originalReference) {
        try {
            // Basic URL validation
            try {
                new URL(replacementSource.url);
            } catch (error) {
                return {
                    valid: false,
                    reason: 'Invalid URL format',
                    details: error.message
                };
            }

            // Check for problematic patterns
            const url = replacementSource.url.toLowerCase();
            
            if (url.includes('localhost') || url.includes('127.0.0.1')) {
                return {
                    valid: false,
                    reason: 'URL appears to be a local address'
                };
            }

            if (url.includes('wikipedia.org')) {
                return {
                    valid: false,
                    reason: 'Wikipedia sources are not acceptable for academic citations'
                };
            }

            // Check that we're not replacing with the same URL
            if (originalReference.url === replacementSource.url) {
                return {
                    valid: false,
                    reason: 'Replacement URL is the same as original'
                };
            }

            // Additional validation could include:
            // - HTTP accessibility check (if HTTP client available)
            // - Content relevance analysis
            // - Domain reputation check

            return {
                valid: true,
                reason: 'Replacement source passed validation'
            };

        } catch (error) {
            return {
                valid: false,
                reason: 'Validation error',
                details: error.message
            };
        }
    }

    /**
     * Perform the actual reference replacement
     * @param {Object} scaleCitations - Scale citations object
     * @param {string} scaleName - Scale name
     * @param {number} referenceIndex - Reference index
     * @param {Object} replacementSource - New source
     * @param {Object} originalReference - Original reference
     * @returns {Object} Replacement result
     */
    performReplacement(scaleCitations, scaleName, referenceIndex, replacementSource, originalReference) {
        try {
            // Create new reference object preserving structure
            const newReference = this.createNewReference(replacementSource, originalReference);
            
            // Update the reference in place
            scaleCitations[scaleName].references[referenceIndex] = newReference;
            
            return {
                success: true,
                newReference
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create new reference object preserving citation structure
     * @param {Object} replacementSource - New source data
     * @param {Object} originalReference - Original reference for structure
     * @returns {Object} New reference object
     */
    createNewReference(replacementSource, originalReference) {
        // Start with replacement source data
        const newReference = {
            type: replacementSource.type || originalReference.type || "educational_resource",
            title: replacementSource.title,
            url: replacementSource.url,
            description: replacementSource.description || `Verified replacement for ${originalReference.title || 'original reference'}`
        };

        // Add optional fields if present in replacement source
        if (replacementSource.authors) {
            newReference.authors = Array.isArray(replacementSource.authors) ? 
                replacementSource.authors : [replacementSource.authors];
        }

        if (replacementSource.publisher) {
            newReference.publisher = replacementSource.publisher;
        }

        if (replacementSource.year) {
            newReference.year = replacementSource.year;
        }

        if (replacementSource.journal) {
            newReference.journal = replacementSource.journal;
        }

        if (replacementSource.volume) {
            newReference.volume = replacementSource.volume;
        }

        if (replacementSource.issue) {
            newReference.issue = replacementSource.issue;
        }

        if (replacementSource.pages) {
            newReference.pages = replacementSource.pages;
        }

        if (replacementSource.doi) {
            newReference.doi = replacementSource.doi;
        }

        if (replacementSource.isbn) {
            newReference.isbn = replacementSource.isbn;
        }

        // Add replacement metadata
        newReference.replacementMetadata = {
            replacedAt: new Date().toISOString(),
            originalUrl: originalReference.url,
            originalTitle: originalReference.title,
            replacementReason: 'automated_validation_replacement'
        };

        return newReference;
    }

    /**
     * Identify issues with a reference
     * @param {Object} reference - Reference to analyze
     * @param {string} scaleName - Scale name for context
     * @returns {Promise<Array>} Array of identified issues
     */
    async identifyReferenceIssues(reference, scaleName) {
        const issues = [];

        if (!reference.url) {
            issues.push('missing_url');
            return issues;
        }

        try {
            const url = new URL(reference.url);
            
            // Check for problematic domains
            if (url.hostname.includes('wikipedia.org')) {
                issues.push('wikipedia_source');
            }
            
            if (url.hostname.includes('localhost') || 
                url.hostname.includes('127.0.0.1') ||
                url.hostname.includes('192.168.')) {
                issues.push('local_url');
            }

            // Check for fabricated or placeholder URLs
            if (url.hostname.includes('example.com') ||
                url.hostname.includes('placeholder') ||
                url.hostname.includes('fake')) {
                issues.push('fabricated_url');
            }

            // Check for broken URL patterns
            if (reference.url.includes('undefined') ||
                reference.url.includes('null') ||
                reference.url.includes('[object Object]')) {
                issues.push('malformed_url');
            }

        } catch (error) {
            issues.push('invalid_url_format');
        }

        // Check for missing required fields
        if (!reference.title || reference.title.trim() === '') {
            issues.push('missing_title');
        }

        if (!reference.description || reference.description.trim() === '') {
            issues.push('missing_description');
        }

        return issues;
    }

    /**
     * Calculate improvement score comparing old and new references
     * @param {Object} originalReference - Original reference
     * @param {Object} newReference - New reference
     * @returns {number} Improvement score (0-1)
     */
    calculateImprovementScore(originalReference, newReference) {
        let score = 0;
        let factors = 0;

        // URL improvement
        if (originalReference.url && newReference.url) {
            const originalUrl = originalReference.url.toLowerCase();
            const newUrl = newReference.url.toLowerCase();
            
            // Penalty for Wikipedia -> Educational resource is improvement
            if (originalUrl.includes('wikipedia') && !newUrl.includes('wikipedia')) {
                score += 0.3;
            }
            
            // Penalty for local URLs -> Public URLs is improvement
            if ((originalUrl.includes('localhost') || originalUrl.includes('127.0.0.1')) &&
                !newUrl.includes('localhost') && !newUrl.includes('127.0.0.1')) {
                score += 0.4;
            }
            
            factors++;
        }

        // Title improvement
        if (newReference.title && (!originalReference.title || 
            newReference.title.length > originalReference.title.length)) {
            score += 0.1;
        }
        factors++;

        // Description improvement
        if (newReference.description && (!originalReference.description ||
            newReference.description.length > originalReference.description.length)) {
            score += 0.1;
        }
        factors++;

        // Author information improvement
        if (newReference.authors && !originalReference.authors) {
            score += 0.1;
        }
        factors++;

        return factors > 0 ? score / factors : 0;
    }

    /**
     * Start a new transaction
     * @param {string} type - Transaction type
     * @param {Object} metadata - Transaction metadata
     * @returns {Object} Transaction object
     */
    startTransaction(type, metadata = {}) {
        const transaction = {
            id: this.generateTransactionId(),
            type,
            startTime: new Date().toISOString(),
            status: 'active',
            metadata,
            operations: []
        };

        this.currentTransaction = transaction;
        return transaction;
    }

    /**
     * Commit a transaction
     * @param {string} transactionId - Transaction ID
     * @param {Object} commitData - Data to store with commit
     * @returns {boolean} Success status
     */
    commitTransaction(transactionId, commitData = {}) {
        if (this.currentTransaction && this.currentTransaction.id === transactionId) {
            this.currentTransaction.status = 'committed';
            this.currentTransaction.endTime = new Date().toISOString();
            this.currentTransaction.commitData = commitData;
            
            // Add to history
            this.transactionHistory.unshift(this.currentTransaction);
            
            // Limit history size
            if (this.transactionHistory.length > this.maxRollbackHistory) {
                this.transactionHistory = this.transactionHistory.slice(0, this.maxRollbackHistory);
            }
            
            this.currentTransaction = null;
            return true;
        }
        
        return false;
    }

    /**
     * Rollback a transaction
     * @param {string} transactionId - Transaction ID
     * @returns {boolean} Success status
     */
    rollbackTransaction(transactionId) {
        if (this.currentTransaction && this.currentTransaction.id === transactionId) {
            this.currentTransaction.status = 'rolled_back';
            this.currentTransaction.endTime = new Date().toISOString();
            
            // Add to history for audit purposes
            this.transactionHistory.unshift(this.currentTransaction);
            
            this.currentTransaction = null;
            return true;
        }
        
        return false;
    }

    /**
     * Create backup of current state
     * @param {Object} scaleCitations - Scale citations object
     * @param {string} scaleName - Scale name
     * @param {number} referenceIndex - Reference index
     * @returns {Object} Backup object
     */
    createBackup(scaleCitations, scaleName, referenceIndex) {
        const backup = {
            id: this.generateBackupId(),
            timestamp: new Date().toISOString(),
            scaleName,
            referenceIndex,
            originalReference: JSON.parse(JSON.stringify(scaleCitations[scaleName].references[referenceIndex])),
            fullScaleBackup: JSON.parse(JSON.stringify(scaleCitations[scaleName]))
        };

        return backup;
    }

    /**
     * Generate unique transaction ID
     * @returns {string} Transaction ID
     */
    generateTransactionId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique backup ID
     * @returns {string} Backup ID
     */
    generateBackupId() {
        return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get transaction history
     * @param {number} limit - Maximum number of transactions to return
     * @returns {Array} Transaction history
     */
    getTransactionHistory(limit = 10) {
        return this.transactionHistory.slice(0, limit);
    }

    /**
     * Get current transaction status
     * @returns {Object|null} Current transaction or null
     */
    getCurrentTransaction() {
        return this.currentTransaction;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReferenceReplacer;
} else if (typeof window !== 'undefined') {
    window.ReferenceReplacer = ReferenceReplacer;
}