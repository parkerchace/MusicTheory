/**
 * @module ReferenceValidator
 * @description Core validation class for scale reference accessibility and content analysis
 * @exports class ReferenceValidator
 * @feature URL accessibility checking with timeout and retry logic
 * @feature Content relevance analysis for scale-specific information
 * @feature Batch processing for multiple references
 */

// Import HttpClient and BatchProcessor if available
let HttpClient, BatchProcessor;
if (typeof require !== 'undefined') {
    try {
        HttpClient = require('./http-client.js');
        BatchProcessor = require('./batch-processor.js');
    } catch (e) {
        // Modules not available, will use fallback methods
    }
} else if (typeof window !== 'undefined') {
    if (window.HttpClient) HttpClient = window.HttpClient;
    if (window.BatchProcessor) BatchProcessor = window.BatchProcessor;
}

class ReferenceValidator {
    constructor(options = {}) {
        this.timeout = options.timeout || 10000;
        this.retries = options.retries || 3;
        this.batchSize = options.batchSize || 10;
        this.rateLimitDelay = options.rateLimitDelay || 100;
        
        // Initialize HTTP client with robust retry logic
        if (HttpClient) {
            this.httpClient = new HttpClient({
                timeout: this.timeout,
                maxRetries: this.retries,
                rateLimitDelay: this.rateLimitDelay,
                maxConcurrentRequests: options.maxConcurrentRequests || 5
            });
        } else {
            this.httpClient = null;
            console.warn('HttpClient not available - using fallback validation methods');
        }
        
        // Initialize batch processor
        if (BatchProcessor) {
            this.batchProcessor = new BatchProcessor(this, {
                batchSize: this.batchSize,
                rateLimitDelay: this.rateLimitDelay,
                maxConcurrentRequests: options.maxConcurrentRequests || 5
            });
        } else {
            this.batchProcessor = null;
            console.warn('BatchProcessor not available - batch operations will use sequential processing');
        }
    }

    /**
     * Validate a single reference for accessibility and content relevance
     * @param {string} url - URL to validate
     * @param {Object} expectedContent - Expected content criteria
     * @returns {Promise<Object>} Validation result
     */
    async validateReference(url, expectedContent = {}) {
        const result = {
            url,
            accessible: null,
            contentRelevant: null,
            relevanceScore: 0,
            issues: [],
            checkedAt: new Date().toISOString()
        };

        try {
            // Check URL accessibility
            const accessibilityResult = await this.checkUrlAccessibility(url);
            result.accessible = accessibilityResult.accessible;
            
            if (!accessibilityResult.accessible) {
                result.issues.push(accessibilityResult.reason || 'URL not accessible');
                return result;
            }

            // If accessible, analyze content relevance
            if (expectedContent.scaleName || expectedContent.keywords) {
                const relevanceResult = await this.analyzeContentRelevance(url, expectedContent);
                result.contentRelevant = relevanceResult.relevant;
                result.relevanceScore = relevanceResult.score;
                
                if (!relevanceResult.relevant) {
                    result.issues.push(relevanceResult.reason || 'Content not relevant to expected scale');
                }
            }

        } catch (error) {
            result.accessible = false;
            result.issues.push(`Validation error: ${error.message}`);
        }

        return result;
    }

    /**
     * Validate all scale references in the system
     * @param {Object} scaleCitations - Scale citations object from MusicTheoryEngine
     * @returns {Promise<Object>} Complete validation results
     */
    async validateAllScaleReferences(scaleCitations) {
        if (!scaleCitations || typeof scaleCitations !== 'object') {
            throw new Error('Scale citations must be a valid object');
        }

        const results = {
            totalScales: 0,
            totalReferences: 0,
            validationResults: [],
            summary: {
                accessibleReferences: 0,
                inaccessibleReferences: 0,
                relevantReferences: 0,
                irrelevantReferences: 0,
                unknownReferences: 0
            },
            validatedAt: new Date().toISOString()
        };

        const scaleNames = Object.keys(scaleCitations);
        results.totalScales = scaleNames.length;

        for (const scaleName of scaleNames) {
            const scaleData = scaleCitations[scaleName];
            
            if (!scaleData || !scaleData.references || !Array.isArray(scaleData.references)) {
                continue;
            }

            for (let i = 0; i < scaleData.references.length; i++) {
                const reference = scaleData.references[i];
                
                if (!reference.url) {
                    continue;
                }

                results.totalReferences++;

                const expectedContent = {
                    scaleName,
                    keywords: this.generateScaleKeywords(scaleName, scaleData)
                };

                const validationResult = await this.validateReference(reference.url, expectedContent);
                
                // Add scale context to result
                validationResult.scaleName = scaleName;
                validationResult.referenceIndex = i;
                validationResult.referenceType = reference.type;
                validationResult.referenceTitle = reference.title;

                results.validationResults.push(validationResult);

                // Update summary counts
                if (validationResult.accessible === true) {
                    results.summary.accessibleReferences++;
                } else if (validationResult.accessible === false) {
                    results.summary.inaccessibleReferences++;
                } else {
                    results.summary.unknownReferences++;
                }

                if (validationResult.contentRelevant === true) {
                    results.summary.relevantReferences++;
                } else if (validationResult.contentRelevant === false) {
                    results.summary.irrelevantReferences++;
                }

                // Rate limiting between requests
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            }
        }

        return results;
    }

    /**
     * Check URL accessibility with retry logic
     * @param {string} url - URL to check
     * @returns {Promise<Object>} Accessibility result
     */
    async checkUrlAccessibility(url) {
        try {
            // Use robust HTTP client if available
            if (this.httpClient) {
                const httpResult = await this.httpClient.makeRequest(url);
                
                return {
                    accessible: httpResult.accessible,
                    reason: httpResult.statusText || httpResult.error,
                    validFormat: true,
                    status: httpResult.status,
                    responseTime: httpResult.responseTime,
                    attempts: httpResult.attemptNumber + 1,
                    method: httpResult.method,
                    corsLimited: httpResult.corsLimited,
                    timestamp: httpResult.timestamp
                };
            }
            
            // Fallback to basic validation if HTTP client not available
            const urlObj = new URL(url);
            
            // Basic validation
            if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
                return {
                    accessible: false,
                    reason: 'Invalid protocol. Only HTTP and HTTPS are supported.',
                    validFormat: false
                };
            }

            // Check for problematic patterns
            const problematicPatterns = [
                /localhost/i,
                /127\.0\.0\.1/,
                /192\.168\./,
                /10\./,
                /172\.(1[6-9]|2[0-9]|3[01])\./
            ];

            for (const pattern of problematicPatterns) {
                if (pattern.test(urlObj.hostname)) {
                    return {
                        accessible: false,
                        reason: 'URL appears to be a local or private network address',
                        validFormat: true
                    };
                }
            }

            // Check for Wikipedia (not allowed for academic citations)
            if (urlObj.hostname.includes('wikipedia.org')) {
                return {
                    accessible: false,
                    reason: 'Wikipedia sources are not acceptable for academic citations',
                    validFormat: true
                };
            }

            // In browser environment without HTTP client, we can't make direct HTTP requests due to CORS
            // This is a simplified check that validates URL structure and known patterns
            return {
                accessible: null, // Cannot determine due to CORS restrictions
                reason: 'URL format is valid. Server-side verification required for actual accessibility.',
                validFormat: true,
                corsLimited: true,
                hostname: urlObj.hostname,
                method: 'fallback_validation'
            };
            
        } catch (error) {
            return {
                accessible: false,
                reason: `Invalid URL format: ${error.message}`,
                validFormat: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze content relevance for scale-specific information
     * @param {string} url - URL to analyze
     * @param {Object} scaleKeywords - Expected scale keywords and context
     * @returns {Promise<Object>} Relevance analysis result
     */
    async analyzeContentRelevance(url, scaleKeywords) {
        // In a browser environment, we cannot fetch content due to CORS
        // This method provides the interface for content analysis
        // In a server environment, this would fetch and analyze the actual content
        
        const result = {
            relevant: null,
            score: 0,
            reason: 'Content analysis requires server-side implementation due to CORS restrictions',
            keywords: scaleKeywords,
            corsLimited: true
        };

        // Basic heuristics based on URL structure
        if (scaleKeywords.scaleName) {
            const urlLower = url.toLowerCase();
            const scaleNameLower = scaleKeywords.scaleName.toLowerCase();
            
            // Check if scale name appears in URL
            if (urlLower.includes(scaleNameLower)) {
                result.score += 0.3;
            }
            
            // Check for music theory related domains
            const musicTheoryDomains = [
                'musictheory.net',
                'tenuto',
                'teoria.com',
                'dolmetsch.com',
                'good-ear.com'
            ];
            
            for (const domain of musicTheoryDomains) {
                if (urlLower.includes(domain)) {
                    result.score += 0.4;
                    break;
                }
            }
            
            // Check for academic domains
            const academicDomains = [
                'jstor.org',
                'doi.org',
                'cambridge.org',
                'oxford.com',
                '.edu'
            ];
            
            for (const domain of academicDomains) {
                if (urlLower.includes(domain)) {
                    result.score += 0.3;
                    break;
                }
            }
        }

        // Determine relevance based on score
        if (result.score >= 0.5) {
            result.relevant = true;
            result.reason = 'URL structure suggests relevant content based on domain and scale name matching';
        } else if (result.score > 0) {
            result.relevant = null;
            result.reason = 'URL structure partially matches expected content - manual verification recommended';
        } else {
            result.relevant = false;
            result.reason = 'URL structure does not suggest scale-specific content';
        }

        return result;
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
        if (scaleData.culturalContext) {
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
     * Validate multiple URLs in batch with progress tracking
     * @param {Array} urls - Array of URLs or URL objects to validate
     * @param {Object} options - Batch processing options
     * @returns {Promise<Object>} Batch validation results
     */
    async validateUrlsBatch(urls, options = {}) {
        if (!Array.isArray(urls) || urls.length === 0) {
            throw new Error('URLs must be a non-empty array');
        }

        // Use batch processor if available
        if (this.batchProcessor) {
            return await this.batchProcessor.processBatch(urls, options);
        }

        // Fallback to sequential processing
        return await this.validateUrlsSequential(urls, options);
    }

    /**
     * Sequential URL validation (fallback when batch processor not available)
     * @param {Array} urls - Array of URLs to validate
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Validation results
     */
    async validateUrlsSequential(urls, options = {}) {
        const results = [];
        const errors = [];
        const startTime = Date.now();
        
        for (let i = 0; i < urls.length; i++) {
            try {
                const urlItem = urls[i];
                const url = typeof urlItem === 'string' ? urlItem : urlItem.url;
                const expectedContent = urlItem.expectedContent || {};
                
                const result = await this.validateReference(url, expectedContent);
                result.sequentialIndex = i;
                result.processedAt = new Date().toISOString();
                
                results.push(result);
                
                // Progress callback if provided
                if (options.progressCallback) {
                    options.progressCallback({
                        processed: i + 1,
                        total: urls.length,
                        percentage: Math.round(((i + 1) / urls.length) * 100),
                        message: `Processing ${i + 1}/${urls.length}`
                    });
                }
                
                // Rate limiting
                if (i < urls.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
                }
                
            } catch (error) {
                const errorResult = {
                    url: typeof urls[i] === 'string' ? urls[i] : urls[i].url,
                    accessible: false,
                    contentRelevant: false,
                    error: error.message,
                    sequentialIndex: i,
                    processedAt: new Date().toISOString()
                };
                
                errors.push(errorResult);
                results.push(errorResult);
            }
        }

        const endTime = Date.now();
        return {
            summary: {
                totalProcessed: results.length,
                totalRequested: urls.length,
                successfulValidations: results.filter(r => r.accessible === true).length,
                failedValidations: results.filter(r => r.accessible === false).length,
                unknownValidations: results.filter(r => r.accessible === null).length,
                errors: errors.length,
                processingTime: endTime - startTime,
                averageTimePerItem: results.length > 0 ? (endTime - startTime) / results.length : 0
            },
            results,
            errors,
            metadata: {
                method: 'sequential',
                rateLimitDelay: this.rateLimitDelay,
                startTime,
                endTime,
                completedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Validate all scale references with enhanced batch processing
     * @param {Object} scaleCitations - Scale citations object from MusicTheoryEngine
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Complete validation results
     */
    async validateAllScaleReferencesEnhanced(scaleCitations, options = {}) {
        if (!scaleCitations || typeof scaleCitations !== 'object') {
            throw new Error('Scale citations must be a valid object');
        }

        // Prepare URLs for batch processing
        const urlsToValidate = [];
        const scaleNames = Object.keys(scaleCitations);

        for (const scaleName of scaleNames) {
            const scaleData = scaleCitations[scaleName];
            
            if (!scaleData || !scaleData.references || !Array.isArray(scaleData.references)) {
                continue;
            }

            for (let i = 0; i < scaleData.references.length; i++) {
                const reference = scaleData.references[i];
                
                if (!reference.url) {
                    continue;
                }

                const expectedContent = {
                    scaleName,
                    keywords: this.generateScaleKeywords(scaleName, scaleData)
                };

                urlsToValidate.push({
                    url: reference.url,
                    expectedContent,
                    scaleName,
                    referenceIndex: i,
                    referenceType: reference.type,
                    referenceTitle: reference.title
                });
            }
        }

        // Process URLs in batch
        const batchOptions = {
            ...options,
            progressCallback: (progress) => {
                if (options.progressCallback) {
                    options.progressCallback({
                        ...progress,
                        phase: 'validation',
                        totalScales: scaleNames.length
                    });
                }
            }
        };

        const batchResults = await this.validateUrlsBatch(urlsToValidate, batchOptions);

        // Transform results back to the original format
        const transformedResults = {
            totalScales: scaleNames.length,
            totalReferences: urlsToValidate.length,
            validationResults: [],
            summary: {
                accessibleReferences: 0,
                inaccessibleReferences: 0,
                relevantReferences: 0,
                irrelevantReferences: 0,
                unknownReferences: 0
            },
            validatedAt: new Date().toISOString(),
            batchMetadata: batchResults.metadata
        };

        // Process batch results
        for (const result of batchResults.results) {
            // Add scale context to result
            const enhancedResult = {
                ...result,
                scaleName: result.scaleName,
                referenceIndex: result.referenceIndex,
                referenceType: result.referenceType,
                referenceTitle: result.referenceTitle
            };

            transformedResults.validationResults.push(enhancedResult);

            // Update summary counts
            if (enhancedResult.accessible === true) {
                transformedResults.summary.accessibleReferences++;
            } else if (enhancedResult.accessible === false) {
                transformedResults.summary.inaccessibleReferences++;
            } else {
                transformedResults.summary.unknownReferences++;
            }

            if (enhancedResult.contentRelevant === true) {
                transformedResults.summary.relevantReferences++;
            } else if (enhancedResult.contentRelevant === false) {
                transformedResults.summary.irrelevantReferences++;
            }
        }

        return transformedResults;
    }

    /**
     * Get batch processor status
     * @returns {Object|null} Batch processor status or null if not available
     */
    getBatchStatus() {
        return this.batchProcessor ? this.batchProcessor.getStatus() : null;
    }

    /**
     * Pause batch processing
     */
    pauseBatch() {
        if (this.batchProcessor) {
            this.batchProcessor.pause();
        }
    }

    /**
     * Resume batch processing
     */
    resumeBatch() {
        if (this.batchProcessor) {
            this.batchProcessor.resume();
        }
    }

    /**
     * Stop batch processing
     */
    stopBatch() {
        if (this.batchProcessor) {
            this.batchProcessor.stop();
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReferenceValidator;
} else if (typeof window !== 'undefined') {
    window.ReferenceValidator = ReferenceValidator;
}