/**
 * @module BatchProcessor
 * @description Batch processing system for URL validation with rate limiting and progress tracking
 * @exports class BatchProcessor
 * @feature Batch processing for multiple URLs
 * @feature Rate limiting to respect server resources
 * @feature Progress tracking and resumable validation
 * @feature Concurrent request management
 */

class BatchProcessor {
    constructor(validator, options = {}) {
        if (!validator) {
            throw new Error('BatchProcessor requires a validator instance');
        }
        
        this.validator = validator;
        this.batchSize = options.batchSize || 10;
        this.maxConcurrentRequests = options.maxConcurrentRequests || 5;
        this.rateLimitDelay = options.rateLimitDelay || 200; // 200ms between batches
        this.progressCallback = options.progressCallback || null;
        this.errorCallback = options.errorCallback || null;
        
        // State management
        this.isProcessing = false;
        this.isPaused = false;
        this.currentBatch = 0;
        this.totalBatches = 0;
        this.processedCount = 0;
        this.totalCount = 0;
        this.results = [];
        this.errors = [];
        this.startTime = null;
        
        // Resumable state
        this.checkpointData = null;
        this.saveCheckpoints = options.saveCheckpoints !== false;
        this.checkpointInterval = options.checkpointInterval || 50; // Save every 50 processed items
    }

    /**
     * Process multiple URLs in batches
     * @param {Array} urls - Array of URL objects to validate
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Batch processing results
     */
    async processBatch(urls, options = {}) {
        if (!Array.isArray(urls) || urls.length === 0) {
            throw new Error('URLs must be a non-empty array');
        }

        // Initialize processing state
        this.initializeProcessing(urls, options);
        
        try {
            // Check for resumable state
            if (options.resume && this.checkpointData) {
                return await this.resumeProcessing();
            }

            // Start fresh processing
            return await this.startProcessing(urls);
            
        } catch (error) {
            this.handleProcessingError(error);
            throw error;
        } finally {
            this.cleanupProcessing();
        }
    }

    /**
     * Initialize processing state
     * @param {Array} urls - URLs to process
     * @param {Object} options - Processing options
     */
    initializeProcessing(urls, options) {
        this.isProcessing = true;
        this.isPaused = false;
        this.totalCount = urls.length;
        this.totalBatches = Math.ceil(urls.length / this.batchSize);
        this.processedCount = 0;
        this.currentBatch = 0;
        this.results = [];
        this.errors = [];
        this.startTime = Date.now();
        
        // Override settings if provided in options
        if (options.batchSize) this.batchSize = options.batchSize;
        if (options.maxConcurrentRequests) this.maxConcurrentRequests = options.maxConcurrentRequests;
        if (options.rateLimitDelay) this.rateLimitDelay = options.rateLimitDelay;
    }

    /**
     * Start processing URLs from the beginning
     * @param {Array} urls - URLs to process
     * @returns {Promise<Object>} Processing results
     */
    async startProcessing(urls) {
        this.reportProgress('Starting batch processing', 0);
        
        // Process URLs in batches
        for (let i = 0; i < urls.length; i += this.batchSize) {
            if (this.isPaused) {
                await this.waitForResume();
            }

            this.currentBatch = Math.floor(i / this.batchSize) + 1;
            const batch = urls.slice(i, i + this.batchSize);
            
            this.reportProgress(`Processing batch ${this.currentBatch}/${this.totalBatches}`, this.processedCount);
            
            try {
                const batchResults = await this.processSingleBatch(batch);
                this.results.push(...batchResults);
                this.processedCount += batch.length;
                
                // Save checkpoint if enabled
                if (this.saveCheckpoints && this.processedCount % this.checkpointInterval === 0) {
                    this.saveCheckpoint(urls, i + this.batchSize);
                }
                
                this.reportProgress(`Completed batch ${this.currentBatch}/${this.totalBatches}`, this.processedCount);
                
                // Rate limiting between batches
                if (i + this.batchSize < urls.length) {
                    await this.delay(this.rateLimitDelay);
                }
                
            } catch (error) {
                this.handleBatchError(error, batch, i);
            }
        }

        return this.generateFinalResults();
    }

    /**
     * Process a single batch of URLs concurrently
     * @param {Array} batch - Batch of URLs to process
     * @returns {Promise<Array>} Batch results
     */
    async processSingleBatch(batch) {
        const batchPromises = batch.map(async (urlItem, index) => {
            try {
                const url = typeof urlItem === 'string' ? urlItem : urlItem.url;
                const expectedContent = urlItem.expectedContent || {};
                
                const result = await this.validator.validateReference(url, expectedContent);
                
                // Add batch context
                result.batchIndex = this.currentBatch;
                result.itemIndex = index;
                result.processedAt = new Date().toISOString();
                
                return result;
                
            } catch (error) {
                const errorResult = {
                    url: typeof urlItem === 'string' ? urlItem : urlItem.url,
                    accessible: false,
                    contentRelevant: false,
                    error: error.message,
                    batchIndex: this.currentBatch,
                    itemIndex: index,
                    processedAt: new Date().toISOString()
                };
                
                this.errors.push(errorResult);
                return errorResult;
            }
        });

        // Wait for all requests in the batch to complete
        return await Promise.all(batchPromises);
    }

    /**
     * Resume processing from a checkpoint
     * @returns {Promise<Object>} Processing results
     */
    async resumeProcessing() {
        if (!this.checkpointData) {
            throw new Error('No checkpoint data available for resuming');
        }

        this.reportProgress('Resuming from checkpoint', this.checkpointData.processedCount);
        
        const remainingUrls = this.checkpointData.remainingUrls;
        this.results = this.checkpointData.results || [];
        this.errors = this.checkpointData.errors || [];
        this.processedCount = this.checkpointData.processedCount || 0;
        
        return await this.startProcessing(remainingUrls);
    }

    /**
     * Save checkpoint data for resumable processing
     * @param {Array} allUrls - All URLs being processed
     * @param {number} currentIndex - Current processing index
     */
    saveCheckpoint(allUrls, currentIndex) {
        this.checkpointData = {
            timestamp: new Date().toISOString(),
            processedCount: this.processedCount,
            currentIndex,
            remainingUrls: allUrls.slice(currentIndex),
            results: [...this.results],
            errors: [...this.errors],
            batchSize: this.batchSize,
            maxConcurrentRequests: this.maxConcurrentRequests,
            rateLimitDelay: this.rateLimitDelay
        };
        
        // In a real implementation, this could be saved to localStorage or a file
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('batchProcessor_checkpoint', JSON.stringify(this.checkpointData));
            } catch (error) {
                console.warn('Failed to save checkpoint to localStorage:', error.message);
            }
        }
    }

    /**
     * Load checkpoint data from storage
     * @returns {Object|null} Checkpoint data or null if not available
     */
    loadCheckpoint() {
        if (typeof localStorage !== 'undefined') {
            try {
                const checkpointStr = localStorage.getItem('batchProcessor_checkpoint');
                if (checkpointStr) {
                    this.checkpointData = JSON.parse(checkpointStr);
                    return this.checkpointData;
                }
            } catch (error) {
                console.warn('Failed to load checkpoint from localStorage:', error.message);
            }
        }
        return null;
    }

    /**
     * Clear saved checkpoint data
     */
    clearCheckpoint() {
        this.checkpointData = null;
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.removeItem('batchProcessor_checkpoint');
            } catch (error) {
                console.warn('Failed to clear checkpoint from localStorage:', error.message);
            }
        }
    }

    /**
     * Pause processing
     */
    pause() {
        this.isPaused = true;
        this.reportProgress('Processing paused', this.processedCount);
    }

    /**
     * Resume processing
     */
    resume() {
        this.isPaused = false;
        this.reportProgress('Processing resumed', this.processedCount);
    }

    /**
     * Stop processing completely
     */
    stop() {
        this.isProcessing = false;
        this.isPaused = false;
        this.reportProgress('Processing stopped', this.processedCount);
    }

    /**
     * Wait for resume signal
     * @returns {Promise<void>}
     */
    async waitForResume() {
        return new Promise((resolve) => {
            const checkResume = () => {
                if (!this.isPaused || !this.isProcessing) {
                    resolve();
                } else {
                    setTimeout(checkResume, 100);
                }
            };
            checkResume();
        });
    }

    /**
     * Report progress to callback if provided
     * @param {string} message - Progress message
     * @param {number} processed - Number of items processed
     */
    reportProgress(message, processed) {
        if (this.progressCallback && typeof this.progressCallback === 'function') {
            const progress = {
                message,
                processed,
                total: this.totalCount,
                percentage: this.totalCount > 0 ? Math.round((processed / this.totalCount) * 100) : 0,
                currentBatch: this.currentBatch,
                totalBatches: this.totalBatches,
                elapsedTime: this.startTime ? Date.now() - this.startTime : 0,
                estimatedTimeRemaining: this.calculateETA(processed)
            };
            
            this.progressCallback(progress);
        }
    }

    /**
     * Calculate estimated time of arrival
     * @param {number} processed - Number of items processed
     * @returns {number} Estimated time remaining in milliseconds
     */
    calculateETA(processed) {
        if (!this.startTime || processed === 0) {
            return null;
        }
        
        const elapsedTime = Date.now() - this.startTime;
        const rate = processed / elapsedTime; // items per millisecond
        const remaining = this.totalCount - processed;
        
        return remaining > 0 ? Math.round(remaining / rate) : 0;
    }

    /**
     * Handle batch processing error
     * @param {Error} error - Error that occurred
     * @param {Array} batch - Batch that failed
     * @param {number} batchIndex - Index of the failed batch
     */
    handleBatchError(error, batch, batchIndex) {
        const batchError = {
            type: 'batch_error',
            error: error.message,
            batchIndex,
            batchSize: batch.length,
            timestamp: new Date().toISOString()
        };
        
        this.errors.push(batchError);
        
        if (this.errorCallback && typeof this.errorCallback === 'function') {
            this.errorCallback(batchError);
        }
        
        // Continue processing other batches
        console.warn(`Batch ${batchIndex} failed:`, error.message);
    }

    /**
     * Handle overall processing error
     * @param {Error} error - Error that occurred
     */
    handleProcessingError(error) {
        const processingError = {
            type: 'processing_error',
            error: error.message,
            processedCount: this.processedCount,
            totalCount: this.totalCount,
            timestamp: new Date().toISOString()
        };
        
        this.errors.push(processingError);
        
        if (this.errorCallback && typeof this.errorCallback === 'function') {
            this.errorCallback(processingError);
        }
    }

    /**
     * Generate final processing results
     * @returns {Object} Final results summary
     */
    generateFinalResults() {
        const endTime = Date.now();
        const totalTime = this.startTime ? endTime - this.startTime : 0;
        
        return {
            summary: {
                totalProcessed: this.processedCount,
                totalRequested: this.totalCount,
                successfulValidations: this.results.filter(r => r.accessible === true).length,
                failedValidations: this.results.filter(r => r.accessible === false).length,
                unknownValidations: this.results.filter(r => r.accessible === null).length,
                errors: this.errors.length,
                processingTime: totalTime,
                averageTimePerItem: this.processedCount > 0 ? totalTime / this.processedCount : 0
            },
            results: this.results,
            errors: this.errors,
            metadata: {
                batchSize: this.batchSize,
                maxConcurrentRequests: this.maxConcurrentRequests,
                rateLimitDelay: this.rateLimitDelay,
                startTime: this.startTime,
                endTime,
                completedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Cleanup processing state
     */
    cleanupProcessing() {
        this.isProcessing = false;
        this.isPaused = false;
        
        // Clear checkpoint if processing completed successfully
        if (this.processedCount === this.totalCount) {
            this.clearCheckpoint();
        }
    }

    /**
     * Get current processing status
     * @returns {Object} Current status
     */
    getStatus() {
        return {
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            processedCount: this.processedCount,
            totalCount: this.totalCount,
            currentBatch: this.currentBatch,
            totalBatches: this.totalBatches,
            percentage: this.totalCount > 0 ? Math.round((this.processedCount / this.totalCount) * 100) : 0,
            elapsedTime: this.startTime ? Date.now() - this.startTime : 0,
            hasCheckpoint: !!this.checkpointData
        };
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BatchProcessor;
} else if (typeof window !== 'undefined') {
    window.BatchProcessor = BatchProcessor;
}