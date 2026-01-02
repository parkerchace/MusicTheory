/**
 * @module ValidationReporter
 * @description Generates comprehensive reports of validation results and changes
 * @exports class ValidationReporter
 * @feature Detailed validation result tracking
 * @feature Reference change logging with justifications
 * @feature Summary report generation with statistics
 * @feature Export capabilities for various formats
 */

class ValidationReporter {
    constructor(options = {}) {
        this.includeTimestamps = options.includeTimestamps !== false;
        this.detailLevel = options.detailLevel || 'full'; // 'summary', 'detailed', 'full'
        this.reportFormat = options.reportFormat || 'json'; // 'json', 'markdown', 'text'
        
        // Enhanced tracking capabilities
        this.validationHistory = [];
        this.changeLog = [];
        this.issueTracker = new Map();
        this.replacementDecisions = [];
        this.manualReviewQueue = [];
        this.sessionId = this.generateSessionId();
        this.trackingEnabled = options.trackingEnabled !== false;
    }

    /**
     * Generate comprehensive validation report
     * @param {Object} validationResults - Results from validation process
     * @param {Object} options - Report generation options
     * @returns {Object} Formatted validation report
     */
    generateValidationReport(validationResults, options = {}) {
        if (!validationResults || typeof validationResults !== 'object') {
            throw new Error('Validation results must be a valid object');
        }

        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                reportVersion: '1.0.0',
                detailLevel: this.detailLevel,
                totalScales: validationResults.totalScales || 0,
                totalReferences: validationResults.totalReferences || 0
            },
            summary: this.generateSummarySection(validationResults),
            details: this.generateDetailsSection(validationResults),
            recommendations: this.generateRecommendations(validationResults),
            statistics: this.generateStatistics(validationResults)
        };

        // Add change log if available
        if (validationResults.changeLog) {
            report.changeLog = validationResults.changeLog;
        }

        return report;
    }

    /**
     * Log reference change with detailed information (legacy method - use logReplacementDecision for enhanced tracking)
     * @param {string} scaleName - Name of the scale
     * @param {Object} oldRef - Original reference object
     * @param {Object} newRef - New reference object
     * @param {string} reason - Reason for the change
     * @returns {Object} Change log entry
     */
    logReferenceChange(scaleName, oldRef, newRef, reason) {
        const changeEntry = {
            scaleName,
            changeType: 'reference_replacement',
            timestamp: new Date().toISOString(),
            oldReference: {
                url: oldRef?.url || 'N/A',
                title: oldRef?.title || 'N/A',
                type: oldRef?.type || 'unknown'
            },
            newReference: {
                url: newRef?.url || 'N/A',
                title: newRef?.title || 'N/A',
                type: newRef?.type || 'unknown'
            },
            reason,
            changeId: this.generateChangeId(scaleName, oldRef, newRef)
        };

        // Also use enhanced tracking if enabled
        if (this.trackingEnabled) {
            this.logReplacementDecision(scaleName, oldRef, newRef, reason, {
                replacementSource: 'legacy_method'
            });
        }

        return changeEntry;
    }

    /**
     * Create summary report with key metrics
     * @param {Object} validationResults - Validation results
     * @returns {Object} Summary report
     */
    createSummaryReport(validationResults) {
        const summary = {
            overview: {
                totalScales: validationResults.totalScales || 0,
                totalReferences: validationResults.totalReferences || 0,
                validationDate: new Date().toISOString()
            },
            accessibility: {
                accessible: validationResults.summary?.accessibleReferences || 0,
                inaccessible: validationResults.summary?.inaccessibleReferences || 0,
                unknown: validationResults.summary?.unknownReferences || 0
            },
            relevance: {
                relevant: validationResults.summary?.relevantReferences || 0,
                irrelevant: validationResults.summary?.irrelevantReferences || 0,
                needsReview: 0
            },
            issues: {
                brokenLinks: 0,
                irrelevantContent: 0,
                genericReferences: 0,
                missingReferences: 0
            }
        };

        // Calculate derived metrics
        if (validationResults.validationResults) {
            for (const result of validationResults.validationResults) {
                if (result.accessible === false) {
                    summary.issues.brokenLinks++;
                }
                if (result.contentRelevant === false) {
                    summary.issues.irrelevantContent++;
                }
                if (result.accessible === null || result.contentRelevant === null) {
                    summary.relevance.needsReview++;
                }
            }
        }

        return summary;
    }

    /**
     * Generate summary section of the report
     * @param {Object} validationResults - Validation results
     * @returns {Object} Summary section
     */
    generateSummarySection(validationResults) {
        const summary = validationResults.summary || {};
        
        return {
            totalReferences: validationResults.totalReferences || 0,
            accessibilityStatus: {
                accessible: summary.accessibleReferences || 0,
                inaccessible: summary.inaccessibleReferences || 0,
                unknown: summary.unknownReferences || 0,
                accessibilityRate: this.calculatePercentage(
                    summary.accessibleReferences || 0,
                    validationResults.totalReferences || 0
                )
            },
            relevanceStatus: {
                relevant: summary.relevantReferences || 0,
                irrelevant: summary.irrelevantReferences || 0,
                relevanceRate: this.calculatePercentage(
                    summary.relevantReferences || 0,
                    validationResults.totalReferences || 0
                )
            },
            overallHealth: this.calculateOverallHealth(summary, validationResults.totalReferences || 0)
        };
    }

    /**
     * Generate details section of the report
     * @param {Object} validationResults - Validation results
     * @returns {Object} Details section
     */
    generateDetailsSection(validationResults) {
        if (this.detailLevel === 'summary') {
            return { message: 'Details omitted in summary mode' };
        }

        const details = {
            problematicReferences: [],
            successfulReferences: [],
            needsReview: []
        };

        if (validationResults.validationResults) {
            for (const result of validationResults.validationResults) {
                if (result.accessible === false || result.contentRelevant === false) {
                    details.problematicReferences.push({
                        scaleName: result.scaleName,
                        url: result.url,
                        issues: result.issues || [],
                        accessible: result.accessible,
                        contentRelevant: result.contentRelevant,
                        relevanceScore: result.relevanceScore || 0
                    });
                } else if (result.accessible === true && result.contentRelevant === true) {
                    details.successfulReferences.push({
                        scaleName: result.scaleName,
                        url: result.url,
                        relevanceScore: result.relevanceScore || 0
                    });
                } else {
                    details.needsReview.push({
                        scaleName: result.scaleName,
                        url: result.url,
                        accessible: result.accessible,
                        contentRelevant: result.contentRelevant,
                        reason: 'Manual verification required'
                    });
                }
            }
        }

        return details;
    }

    /**
     * Generate recommendations based on validation results
     * @param {Object} validationResults - Validation results
     * @returns {Array} Array of recommendations
     */
    generateRecommendations(validationResults) {
        const recommendations = [];
        const summary = validationResults.summary || {};
        const total = validationResults.totalReferences || 0;

        // Accessibility recommendations
        if (summary.inaccessibleReferences > 0) {
            recommendations.push({
                priority: 'high',
                category: 'accessibility',
                issue: `${summary.inaccessibleReferences} references are inaccessible`,
                recommendation: 'Replace broken links with verified academic sources',
                affectedReferences: summary.inaccessibleReferences
            });
        }

        // Relevance recommendations
        if (summary.irrelevantReferences > 0) {
            recommendations.push({
                priority: 'medium',
                category: 'relevance',
                issue: `${summary.irrelevantReferences} references have irrelevant content`,
                recommendation: 'Replace generic references with scale-specific sources',
                affectedReferences: summary.irrelevantReferences
            });
        }

        // Coverage recommendations
        const accessibilityRate = this.calculatePercentage(summary.accessibleReferences || 0, total);
        if (accessibilityRate < 80) {
            recommendations.push({
                priority: 'high',
                category: 'coverage',
                issue: `Only ${accessibilityRate}% of references are accessible`,
                recommendation: 'Systematic review and replacement of problematic references needed',
                targetImprovement: '90% accessibility rate'
            });
        }

        // Quality recommendations
        const relevanceRate = this.calculatePercentage(summary.relevantReferences || 0, total);
        if (relevanceRate < 70) {
            recommendations.push({
                priority: 'medium',
                category: 'quality',
                issue: `Only ${relevanceRate}% of references are content-relevant`,
                recommendation: 'Focus on finding scale-specific academic and educational sources',
                targetImprovement: '85% relevance rate'
            });
        }

        return recommendations;
    }

    /**
     * Generate statistics section
     * @param {Object} validationResults - Validation results
     * @returns {Object} Statistics section
     */
    generateStatistics(validationResults) {
        const summary = validationResults.summary || {};
        const total = validationResults.totalReferences || 0;

        return {
            accessibility: {
                accessible: summary.accessibleReferences || 0,
                inaccessible: summary.inaccessibleReferences || 0,
                unknown: summary.unknownReferences || 0,
                accessibilityRate: this.calculatePercentage(summary.accessibleReferences || 0, total)
            },
            relevance: {
                relevant: summary.relevantReferences || 0,
                irrelevant: summary.irrelevantReferences || 0,
                relevanceRate: this.calculatePercentage(summary.relevantReferences || 0, total)
            },
            distribution: this.calculateScaleDistribution(validationResults),
            trends: this.calculateTrends(validationResults)
        };
    }

    /**
     * Calculate percentage with proper handling of edge cases
     * @param {number} numerator - Numerator value
     * @param {number} denominator - Denominator value
     * @returns {number} Percentage (0-100)
     */
    calculatePercentage(numerator, denominator) {
        if (denominator === 0) return 0;
        return Math.round((numerator / denominator) * 100);
    }

    /**
     * Calculate overall health score
     * @param {Object} summary - Summary statistics
     * @param {number} total - Total references
     * @returns {Object} Health score information
     */
    calculateOverallHealth(summary, total) {
        if (total === 0) {
            return { score: 0, grade: 'F', description: 'No references to evaluate' };
        }

        const accessibilityScore = (summary.accessibleReferences || 0) / total;
        const relevanceScore = (summary.relevantReferences || 0) / total;
        const overallScore = (accessibilityScore + relevanceScore) / 2;

        let grade, description;
        if (overallScore >= 0.9) {
            grade = 'A';
            description = 'Excellent reference quality';
        } else if (overallScore >= 0.8) {
            grade = 'B';
            description = 'Good reference quality';
        } else if (overallScore >= 0.7) {
            grade = 'C';
            description = 'Acceptable reference quality';
        } else if (overallScore >= 0.6) {
            grade = 'D';
            description = 'Poor reference quality - improvement needed';
        } else {
            grade = 'F';
            description = 'Unacceptable reference quality - major issues';
        }

        return {
            score: Math.round(overallScore * 100),
            grade,
            description,
            accessibilityComponent: Math.round(accessibilityScore * 100),
            relevanceComponent: Math.round(relevanceScore * 100)
        };
    }

    /**
     * Calculate scale distribution statistics
     * @param {Object} validationResults - Validation results
     * @returns {Object} Distribution statistics
     */
    calculateScaleDistribution(validationResults) {
        const distribution = {
            scalesWithIssues: 0,
            scalesWithoutReferences: 0,
            averageReferencesPerScale: 0,
            scaleCategories: {}
        };

        if (validationResults.validationResults) {
            const scaleStats = {};
            
            for (const result of validationResults.validationResults) {
                if (!scaleStats[result.scaleName]) {
                    scaleStats[result.scaleName] = {
                        total: 0,
                        issues: 0
                    };
                }
                
                scaleStats[result.scaleName].total++;
                
                if (result.accessible === false || result.contentRelevant === false) {
                    scaleStats[result.scaleName].issues++;
                }
            }

            const scaleNames = Object.keys(scaleStats);
            distribution.scalesWithIssues = scaleNames.filter(
                name => scaleStats[name].issues > 0
            ).length;

            if (scaleNames.length > 0) {
                const totalReferences = scaleNames.reduce(
                    (sum, name) => sum + scaleStats[name].total, 0
                );
                distribution.averageReferencesPerScale = Math.round(
                    totalReferences / scaleNames.length * 10
                ) / 10;
            }
        }

        return distribution;
    }

    /**
     * Calculate trends and patterns
     * @param {Object} validationResults - Validation results
     * @returns {Object} Trends analysis
     */
    calculateTrends(validationResults) {
        return {
            commonIssues: this.identifyCommonIssues(validationResults),
            domainAnalysis: this.analyzeDomains(validationResults),
            referenceTypes: this.analyzeReferenceTypes(validationResults)
        };
    }

    /**
     * Identify common issues across references
     * @param {Object} validationResults - Validation results
     * @returns {Array} Common issues found
     */
    identifyCommonIssues(validationResults) {
        const issues = {};
        
        if (validationResults.validationResults) {
            for (const result of validationResults.validationResults) {
                if (result.issues) {
                    for (const issue of result.issues) {
                        issues[issue] = (issues[issue] || 0) + 1;
                    }
                }
            }
        }

        return Object.entries(issues)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([issue, count]) => ({ issue, count }));
    }

    /**
     * Analyze domain distribution
     * @param {Object} validationResults - Validation results
     * @returns {Object} Domain analysis
     */
    analyzeDomains(validationResults) {
        const domains = {};
        
        if (validationResults.validationResults) {
            for (const result of validationResults.validationResults) {
                try {
                    const url = new URL(result.url);
                    const domain = url.hostname;
                    if (!domains[domain]) {
                        domains[domain] = { total: 0, accessible: 0, relevant: 0 };
                    }
                    domains[domain].total++;
                    if (result.accessible === true) domains[domain].accessible++;
                    if (result.contentRelevant === true) domains[domain].relevant++;
                } catch (error) {
                    // Invalid URL, skip domain analysis
                }
            }
        }

        return domains;
    }

    /**
     * Analyze reference types distribution
     * @param {Object} validationResults - Validation results
     * @returns {Object} Reference types analysis
     */
    analyzeReferenceTypes(validationResults) {
        const types = {};
        
        if (validationResults.validationResults) {
            for (const result of validationResults.validationResults) {
                const type = result.referenceType || 'unknown';
                if (!types[type]) {
                    types[type] = { total: 0, accessible: 0, relevant: 0 };
                }
                types[type].total++;
                if (result.accessible === true) types[type].accessible++;
                if (result.contentRelevant === true) types[type].relevant++;
            }
        }

        return types;
    }

    /**
     * Track validation result with detailed information
     * @param {Object} validationResult - Result from validation process
     * @param {Object} context - Additional context information
     * @returns {Object} Tracking entry
     */
    trackValidationResult(validationResult, context = {}) {
        if (!this.trackingEnabled) {
            return null;
        }

        const trackingEntry = {
            id: this.generateTrackingId(),
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            scaleName: validationResult.scaleName,
            url: validationResult.url,
            referenceIndex: validationResult.referenceIndex,
            accessible: validationResult.accessible,
            contentRelevant: validationResult.contentRelevant,
            relevanceScore: validationResult.relevanceScore || 0,
            issues: [...(validationResult.issues || [])],
            responseTime: validationResult.responseTime,
            httpStatus: validationResult.status,
            method: validationResult.method,
            attempts: validationResult.attempts || 1,
            context: {
                validationType: context.validationType || 'standard',
                batchId: context.batchId,
                retryAttempt: context.retryAttempt || 0,
                userAgent: context.userAgent,
                ...context
            }
        };

        this.validationHistory.push(trackingEntry);

        // Track specific issues for pattern analysis
        if (validationResult.issues && validationResult.issues.length > 0) {
            this.trackIssues(validationResult.issues, trackingEntry);
        }

        return trackingEntry;
    }

    /**
     * Track specific issues for pattern analysis
     * @param {Array} issues - Array of issue descriptions
     * @param {Object} trackingEntry - Associated tracking entry
     */
    trackIssues(issues, trackingEntry) {
        for (const issue of issues) {
            if (!this.issueTracker.has(issue)) {
                this.issueTracker.set(issue, {
                    count: 0,
                    firstSeen: trackingEntry.timestamp,
                    lastSeen: trackingEntry.timestamp,
                    affectedScales: new Set(),
                    affectedUrls: new Set(),
                    examples: []
                });
            }

            const issueData = this.issueTracker.get(issue);
            issueData.count++;
            issueData.lastSeen = trackingEntry.timestamp;
            issueData.affectedScales.add(trackingEntry.scaleName);
            issueData.affectedUrls.add(trackingEntry.url);
            
            // Keep up to 5 examples for each issue type
            if (issueData.examples.length < 5) {
                issueData.examples.push({
                    scaleName: trackingEntry.scaleName,
                    url: trackingEntry.url,
                    timestamp: trackingEntry.timestamp,
                    trackingId: trackingEntry.id
                });
            }
        }
    }

    /**
     * Log replacement decision with detailed justification
     * @param {string} scaleName - Name of the scale
     * @param {Object} oldRef - Original reference object
     * @param {Object} newRef - New reference object
     * @param {string} reason - Reason for the change
     * @param {Object} decisionContext - Additional decision context
     * @returns {Object} Replacement decision entry
     */
    logReplacementDecision(scaleName, oldRef, newRef, reason, decisionContext = {}) {
        const decisionEntry = {
            id: this.generateDecisionId(),
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            scaleName,
            changeType: 'reference_replacement',
            oldReference: {
                url: oldRef?.url || 'N/A',
                title: oldRef?.title || 'N/A',
                type: oldRef?.type || 'unknown',
                accessible: oldRef?.accessible,
                contentRelevant: oldRef?.contentRelevant,
                relevanceScore: oldRef?.relevanceScore || 0
            },
            newReference: {
                url: newRef?.url || 'N/A',
                title: newRef?.title || 'N/A',
                type: newRef?.type || 'unknown',
                accessible: newRef?.accessible,
                contentRelevant: newRef?.contentRelevant,
                relevanceScore: newRef?.relevanceScore || 0
            },
            reason,
            justification: {
                primaryReason: reason,
                qualityImprovement: this.calculateQualityImprovement(oldRef, newRef),
                alternativesConsidered: decisionContext.alternativesConsidered || [],
                confidenceLevel: decisionContext.confidenceLevel || 'medium',
                manualReviewRequired: decisionContext.manualReviewRequired || false,
                replacementSource: decisionContext.replacementSource || 'automated'
            },
            metadata: {
                processingTime: decisionContext.processingTime,
                validationAttempts: decisionContext.validationAttempts,
                errorHistory: decisionContext.errorHistory || [],
                ...decisionContext.metadata
            }
        };

        this.replacementDecisions.push(decisionEntry);
        this.changeLog.push(this.createChangeLogEntry(decisionEntry));

        // Add to manual review queue if required
        if (decisionContext.manualReviewRequired) {
            this.addToManualReviewQueue(decisionEntry, decisionContext.reviewReason);
        }

        return decisionEntry;
    }

    /**
     * Calculate quality improvement between old and new references
     * @param {Object} oldRef - Old reference
     * @param {Object} newRef - New reference
     * @returns {Object} Quality improvement metrics
     */
    calculateQualityImprovement(oldRef, newRef) {
        const oldScore = this.calculateReferenceQualityScore(oldRef);
        const newScore = this.calculateReferenceQualityScore(newRef);
        
        return {
            oldQualityScore: oldScore,
            newQualityScore: newScore,
            improvement: newScore - oldScore,
            improvementPercentage: oldScore > 0 ? Math.round(((newScore - oldScore) / oldScore) * 100) : 100,
            accessibilityImproved: (oldRef?.accessible === false && newRef?.accessible === true),
            relevanceImproved: (oldRef?.contentRelevant === false && newRef?.contentRelevant === true),
            scoreImproved: newScore > oldScore
        };
    }

    /**
     * Calculate overall quality score for a reference
     * @param {Object} ref - Reference object
     * @returns {number} Quality score (0-100)
     */
    calculateReferenceQualityScore(ref) {
        if (!ref) return 0;
        
        let score = 0;
        
        // Accessibility component (40 points)
        if (ref.accessible === true) {
            score += 40;
        } else if (ref.accessible === null) {
            score += 20; // Partial credit for unknown status
        }
        
        // Content relevance component (40 points)
        if (ref.contentRelevant === true) {
            score += 40;
        } else if (ref.contentRelevant === null) {
            score += 20; // Partial credit for unknown status
        }
        
        // Relevance score component (20 points)
        if (ref.relevanceScore) {
            score += Math.min(20, ref.relevanceScore * 20);
        }
        
        return Math.round(score);
    }

    /**
     * Create change log entry from replacement decision
     * @param {Object} decisionEntry - Replacement decision entry
     * @returns {Object} Change log entry
     */
    createChangeLogEntry(decisionEntry) {
        return {
            changeId: decisionEntry.id,
            timestamp: decisionEntry.timestamp,
            scaleName: decisionEntry.scaleName,
            changeType: decisionEntry.changeType,
            oldUrl: decisionEntry.oldReference.url,
            newUrl: decisionEntry.newReference.url,
            reason: decisionEntry.reason,
            qualityImprovement: decisionEntry.justification.qualityImprovement.improvement,
            confidenceLevel: decisionEntry.justification.confidenceLevel,
            manualReviewRequired: decisionEntry.justification.manualReviewRequired
        };
    }

    /**
     * Add entry to manual review queue
     * @param {Object} decisionEntry - Decision requiring review
     * @param {string} reviewReason - Reason for manual review
     */
    addToManualReviewQueue(decisionEntry, reviewReason) {
        const reviewEntry = {
            id: this.generateReviewId(),
            decisionId: decisionEntry.id,
            scaleName: decisionEntry.scaleName,
            priority: this.calculateReviewPriority(decisionEntry),
            reviewReason,
            addedAt: new Date().toISOString(),
            status: 'pending',
            assignedTo: null,
            reviewNotes: [],
            estimatedReviewTime: this.estimateReviewTime(decisionEntry)
        };

        this.manualReviewQueue.push(reviewEntry);
    }

    /**
     * Calculate priority for manual review
     * @param {Object} decisionEntry - Decision entry
     * @returns {string} Priority level
     */
    calculateReviewPriority(decisionEntry) {
        const qualityImprovement = decisionEntry.justification.qualityImprovement.improvement;
        const confidenceLevel = decisionEntry.justification.confidenceLevel;
        
        if (qualityImprovement < 0 || confidenceLevel === 'low') {
            return 'high';
        } else if (qualityImprovement < 20 || confidenceLevel === 'medium') {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Estimate review time for manual review entry
     * @param {Object} decisionEntry - Decision entry
     * @returns {number} Estimated review time in minutes
     */
    estimateReviewTime(decisionEntry) {
        const baseTime = 5; // 5 minutes base time
        const complexityFactors = [];
        
        if (decisionEntry.justification.alternativesConsidered.length > 3) {
            complexityFactors.push(2); // Multiple alternatives
        }
        
        if (decisionEntry.justification.qualityImprovement.improvement < 0) {
            complexityFactors.push(3); // Quality degradation
        }
        
        if (decisionEntry.metadata.errorHistory && decisionEntry.metadata.errorHistory.length > 0) {
            complexityFactors.push(1.5); // Error history
        }
        
        const complexityMultiplier = complexityFactors.reduce((acc, factor) => acc * factor, 1);
        return Math.round(baseTime * complexityMultiplier);
    }

    /**
     * Get validation history for a specific scale
     * @param {string} scaleName - Name of the scale
     * @param {Object} options - Query options
     * @returns {Array} Validation history entries
     */
    getValidationHistory(scaleName, options = {}) {
        let history = this.validationHistory.filter(entry => entry.scaleName === scaleName);
        
        if (options.startDate) {
            history = history.filter(entry => new Date(entry.timestamp) >= new Date(options.startDate));
        }
        
        if (options.endDate) {
            history = history.filter(entry => new Date(entry.timestamp) <= new Date(options.endDate));
        }
        
        if (options.issueType) {
            history = history.filter(entry => 
                entry.issues.some(issue => issue.toLowerCase().includes(options.issueType.toLowerCase()))
            );
        }
        
        if (options.limit) {
            history = history.slice(-options.limit);
        }
        
        return history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    /**
     * Get issue summary with patterns and trends
     * @returns {Object} Issue summary
     */
    getIssueSummary() {
        const summary = {
            totalIssueTypes: this.issueTracker.size,
            totalIssueOccurrences: 0,
            mostCommonIssues: [],
            issuesByCategory: {},
            trendAnalysis: {}
        };

        // Convert Map to array for processing
        const issueEntries = Array.from(this.issueTracker.entries()).map(([issue, data]) => ({
            issue,
            count: data.count,
            firstSeen: data.firstSeen,
            lastSeen: data.lastSeen,
            affectedScales: data.affectedScales.size,
            affectedUrls: data.affectedUrls.size,
            examples: data.examples
        }));

        summary.totalIssueOccurrences = issueEntries.reduce((sum, entry) => sum + entry.count, 0);
        
        // Sort by frequency
        summary.mostCommonIssues = issueEntries
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Categorize issues
        for (const entry of issueEntries) {
            const category = this.categorizeIssue(entry.issue);
            if (!summary.issuesByCategory[category]) {
                summary.issuesByCategory[category] = {
                    count: 0,
                    issues: []
                };
            }
            summary.issuesByCategory[category].count += entry.count;
            summary.issuesByCategory[category].issues.push(entry);
        }

        return summary;
    }

    /**
     * Categorize issue by type
     * @param {string} issue - Issue description
     * @returns {string} Issue category
     */
    categorizeIssue(issue) {
        const issueLower = issue.toLowerCase();
        
        if (issueLower.includes('timeout') || issueLower.includes('connection')) {
            return 'connectivity';
        } else if (issueLower.includes('404') || issueLower.includes('not found')) {
            return 'not_found';
        } else if (issueLower.includes('403') || issueLower.includes('forbidden')) {
            return 'access_denied';
        } else if (issueLower.includes('500') || issueLower.includes('server error')) {
            return 'server_error';
        } else if (issueLower.includes('content') || issueLower.includes('relevance')) {
            return 'content_quality';
        } else if (issueLower.includes('format') || issueLower.includes('invalid')) {
            return 'format_error';
        } else {
            return 'other';
        }
    }

    /**
     * Get manual review queue with filtering options
     * @param {Object} options - Filter options
     * @returns {Array} Manual review entries
     */
    getManualReviewQueue(options = {}) {
        let queue = [...this.manualReviewQueue];
        
        if (options.priority) {
            queue = queue.filter(entry => entry.priority === options.priority);
        }
        
        if (options.status) {
            queue = queue.filter(entry => entry.status === options.status);
        }
        
        if (options.scaleName) {
            queue = queue.filter(entry => entry.scaleName === options.scaleName);
        }
        
        // Sort by priority and date
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        queue.sort((a, b) => {
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return new Date(a.addedAt) - new Date(b.addedAt);
        });
        
        return queue;
    }

    /**
     * Generate unique tracking ID
     * @returns {string} Unique tracking ID
     */
    generateTrackingId() {
        return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique decision ID
     * @returns {string} Unique decision ID
     */
    generateDecisionId() {
        return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique review ID
     * @returns {string} Unique review ID
     */
    generateReviewId() {
        return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate comprehensive validation report with enhanced statistics and trends
     * @param {Object} validationResults - Results from validation process
     * @param {Object} options - Report generation options
     * @returns {Object} Enhanced validation report
     */
    generateComprehensiveReport(validationResults, options = {}) {
        if (!validationResults || typeof validationResults !== 'object') {
            throw new Error('Validation results must be a valid object');
        }

        const report = {
            metadata: {
                generatedAt: new Date().toISOString(),
                reportVersion: '2.0.0',
                sessionId: this.sessionId,
                detailLevel: this.detailLevel,
                reportFormat: this.reportFormat,
                totalScales: validationResults.totalScales || 0,
                totalReferences: validationResults.totalReferences || 0,
                validationPeriod: this.calculateValidationPeriod(validationResults)
            },
            executiveSummary: this.generateExecutiveSummary(validationResults),
            detailedAnalysis: this.generateDetailedAnalysis(validationResults),
            issueAnalysis: this.generateIssueAnalysis(),
            changeAnalysis: this.generateChangeAnalysis(),
            recommendations: this.generateEnhancedRecommendations(validationResults),
            manualReviewItems: this.getManualReviewQueue({ status: 'pending' }),
            statistics: this.generateEnhancedStatistics(validationResults),
            trends: this.generateTrendAnalysis(validationResults),
            appendices: this.generateAppendices(validationResults, options)
        };

        // Add format-specific rendering
        if (options.includeFormattedOutput) {
            report.formattedOutputs = {
                markdown: this.generateMarkdownReport(report),
                text: this.generateTextReport(report),
                csv: this.generateCSVReport(report)
            };
        }

        return report;
    }

    /**
     * Generate executive summary for stakeholders
     * @param {Object} validationResults - Validation results
     * @returns {Object} Executive summary
     */
    generateExecutiveSummary(validationResults) {
        const summary = this.createSummaryReport(validationResults);
        const overallHealth = this.calculateOverallHealth(validationResults.summary || {}, validationResults.totalReferences || 0);
        
        return {
            overallHealth,
            keyFindings: this.generateKeyFindings(validationResults, summary),
            criticalIssues: this.identifyCriticalIssues(validationResults),
            actionItems: this.generateActionItems(validationResults),
            resourceRequirements: this.estimateResourceRequirements(validationResults),
            timeline: this.generateRecommendedTimeline(validationResults)
        };
    }

    /**
     * Generate key findings from validation results
     * @param {Object} validationResults - Validation results
     * @param {Object} summary - Summary statistics
     * @returns {Array} Key findings
     */
    generateKeyFindings(validationResults, summary) {
        const findings = [];
        const total = validationResults.totalReferences || 0;
        
        if (total === 0) {
            findings.push({
                type: 'critical',
                finding: 'No references found in the system',
                impact: 'System lacks academic credibility',
                priority: 'immediate'
            });
            return findings;
        }

        const accessibilityRate = this.calculatePercentage(summary.accessibility?.accessible || 0, total);
        const relevanceRate = this.calculatePercentage(summary.relevance?.relevant || 0, total);

        if (accessibilityRate < 50) {
            findings.push({
                type: 'critical',
                finding: `Only ${accessibilityRate}% of references are accessible`,
                impact: 'Severe user experience degradation and academic credibility loss',
                priority: 'immediate'
            });
        }

        if (relevanceRate < 60) {
            findings.push({
                type: 'major',
                finding: `Only ${relevanceRate}% of references contain relevant content`,
                impact: 'Academic integrity concerns and user confusion',
                priority: 'high'
            });
        }

        if (summary.issues?.brokenLinks > total * 0.3) {
            findings.push({
                type: 'major',
                finding: `${summary.issues.brokenLinks} broken links detected (${this.calculatePercentage(summary.issues.brokenLinks, total)}%)`,
                impact: 'Poor user experience and reduced system reliability',
                priority: 'high'
            });
        }

        if (this.replacementDecisions.length > 0) {
            const successfulReplacements = this.replacementDecisions.filter(
                d => d.justification.qualityImprovement.improvement > 0
            ).length;
            
            findings.push({
                type: 'positive',
                finding: `${successfulReplacements} successful reference improvements completed`,
                impact: 'Enhanced academic credibility and user experience',
                priority: 'maintenance'
            });
        }

        return findings;
    }

    /**
     * Identify critical issues requiring immediate attention
     * @param {Object} validationResults - Validation results
     * @returns {Array} Critical issues
     */
    identifyCriticalIssues(validationResults) {
        const criticalIssues = [];
        const issueSummary = this.getIssueSummary();
        
        // High-frequency issues
        for (const issue of issueSummary.mostCommonIssues.slice(0, 3)) {
            if (issue.count > 10) {
                criticalIssues.push({
                    type: 'high_frequency',
                    issue: issue.issue,
                    occurrences: issue.count,
                    affectedScales: issue.affectedScales,
                    severity: 'high',
                    estimatedFixTime: this.estimateFixTime(issue)
                });
            }
        }

        // System-wide failures
        const totalRefs = validationResults.totalReferences || 0;
        const inaccessible = validationResults.summary?.inaccessibleReferences || 0;
        
        if (inaccessible > totalRefs * 0.5) {
            criticalIssues.push({
                type: 'system_wide_failure',
                issue: 'Majority of references are inaccessible',
                occurrences: inaccessible,
                severity: 'critical',
                estimatedFixTime: Math.ceil(inaccessible / 10) + ' hours'
            });
        }

        return criticalIssues;
    }

    /**
     * Generate actionable items for stakeholders
     * @param {Object} validationResults - Validation results
     * @returns {Array} Action items
     */
    generateActionItems(validationResults) {
        const actionItems = [];
        const manualReviewCount = this.manualReviewQueue.filter(item => item.status === 'pending').length;
        
        if (manualReviewCount > 0) {
            actionItems.push({
                action: 'Complete manual review queue',
                description: `Review ${manualReviewCount} flagged references requiring human verification`,
                assignee: 'Content Review Team',
                estimatedTime: this.manualReviewQueue.reduce((sum, item) => sum + item.estimatedReviewTime, 0) + ' minutes',
                priority: 'high'
            });
        }

        const brokenLinks = validationResults.summary?.inaccessibleReferences || 0;
        if (brokenLinks > 0) {
            actionItems.push({
                action: 'Replace broken references',
                description: `Find and replace ${brokenLinks} inaccessible references with verified sources`,
                assignee: 'Technical Team',
                estimatedTime: Math.ceil(brokenLinks / 5) + ' hours',
                priority: 'high'
            });
        }

        const irrelevantContent = validationResults.summary?.irrelevantReferences || 0;
        if (irrelevantContent > 0) {
            actionItems.push({
                action: 'Improve content relevance',
                description: `Replace ${irrelevantContent} references with scale-specific sources`,
                assignee: 'Academic Content Team',
                estimatedTime: Math.ceil(irrelevantContent / 3) + ' hours',
                priority: 'medium'
            });
        }

        return actionItems;
    }

    /**
     * Estimate resource requirements for remediation
     * @param {Object} validationResults - Validation results
     * @returns {Object} Resource requirements
     */
    estimateResourceRequirements(validationResults) {
        const brokenLinks = validationResults.summary?.inaccessibleReferences || 0;
        const irrelevantContent = validationResults.summary?.irrelevantReferences || 0;
        const manualReviewItems = this.manualReviewQueue.length;
        
        return {
            technicalHours: Math.ceil((brokenLinks * 0.2) + (irrelevantContent * 0.3)),
            contentReviewHours: Math.ceil(manualReviewItems * 0.1),
            academicResearchHours: Math.ceil(irrelevantContent * 0.5),
            totalEstimatedHours: Math.ceil((brokenLinks * 0.2) + (irrelevantContent * 0.8) + (manualReviewItems * 0.1)),
            recommendedTeamSize: Math.max(1, Math.ceil((brokenLinks + irrelevantContent) / 50)),
            estimatedCost: {
                technical: Math.ceil((brokenLinks * 0.2) + (irrelevantContent * 0.3)) * 75, // $75/hour
                academic: Math.ceil(irrelevantContent * 0.5) * 100, // $100/hour
                review: Math.ceil(manualReviewItems * 0.1) * 50 // $50/hour
            }
        };
    }

    /**
     * Generate recommended timeline for remediation
     * @param {Object} validationResults - Validation results
     * @returns {Object} Recommended timeline
     */
    generateRecommendedTimeline(validationResults) {
        const criticalIssues = this.identifyCriticalIssues(validationResults);
        const totalIssues = (validationResults.summary?.inaccessibleReferences || 0) + 
                           (validationResults.summary?.irrelevantReferences || 0);
        
        let phases = [];
        
        if (criticalIssues.length > 0) {
            phases.push({
                phase: 'Critical Issues Resolution',
                duration: '1-2 weeks',
                description: 'Address system-wide failures and high-frequency issues',
                deliverables: ['Fix broken link patterns', 'Resolve accessibility issues']
            });
        }
        
        if (totalIssues > 50) {
            phases.push({
                phase: 'Bulk Reference Replacement',
                duration: '2-4 weeks',
                description: 'Systematic replacement of problematic references',
                deliverables: ['Replace broken links', 'Improve content relevance']
            });
        }
        
        phases.push({
            phase: 'Quality Assurance',
            duration: '1 week',
            description: 'Manual review and final validation',
            deliverables: ['Complete manual reviews', 'Final validation report']
        });
        
        return {
            totalDuration: phases.length <= 2 ? '2-4 weeks' : '4-7 weeks',
            phases,
            milestones: this.generateMilestones(phases)
        };
    }

    /**
     * Generate milestones for timeline
     * @param {Array} phases - Timeline phases
     * @returns {Array} Milestones
     */
    generateMilestones(phases) {
        const milestones = [];
        let weekOffset = 0;
        
        for (const phase of phases) {
            const duration = parseInt(phase.duration.split('-')[1] || phase.duration.split(' ')[0]);
            weekOffset += duration;
            
            milestones.push({
                week: weekOffset,
                milestone: `Complete ${phase.phase}`,
                description: phase.description,
                success_criteria: phase.deliverables
            });
        }
        
        return milestones;
    }

    /**
     * Generate detailed analysis section
     * @param {Object} validationResults - Validation results
     * @returns {Object} Detailed analysis
     */
    generateDetailedAnalysis(validationResults) {
        return {
            scaleBreakdown: this.generateScaleBreakdown(validationResults),
            domainAnalysis: this.analyzeDomains(validationResults),
            temporalAnalysis: this.generateTemporalAnalysis(),
            qualityMetrics: this.generateQualityMetrics(validationResults),
            performanceMetrics: this.generatePerformanceMetrics(validationResults)
        };
    }

    /**
     * Generate scale-by-scale breakdown
     * @param {Object} validationResults - Validation results
     * @returns {Object} Scale breakdown
     */
    generateScaleBreakdown(validationResults) {
        const scaleStats = {};
        
        if (validationResults.validationResults) {
            for (const result of validationResults.validationResults) {
                if (!scaleStats[result.scaleName]) {
                    scaleStats[result.scaleName] = {
                        totalReferences: 0,
                        accessibleReferences: 0,
                        relevantReferences: 0,
                        issues: [],
                        averageRelevanceScore: 0,
                        qualityGrade: 'F'
                    };
                }
                
                const stats = scaleStats[result.scaleName];
                stats.totalReferences++;
                
                if (result.accessible === true) stats.accessibleReferences++;
                if (result.contentRelevant === true) stats.relevantReferences++;
                if (result.issues) stats.issues.push(...result.issues);
                
                stats.averageRelevanceScore += (result.relevanceScore || 0);
            }
            
            // Calculate averages and grades
            for (const scaleName of Object.keys(scaleStats)) {
                const stats = scaleStats[scaleName];
                stats.averageRelevanceScore = stats.averageRelevanceScore / stats.totalReferences;
                stats.qualityGrade = this.calculateScaleQualityGrade(stats);
                stats.accessibilityRate = this.calculatePercentage(stats.accessibleReferences, stats.totalReferences);
                stats.relevanceRate = this.calculatePercentage(stats.relevantReferences, stats.totalReferences);
            }
        }
        
        return scaleStats;
    }

    /**
     * Calculate quality grade for a scale
     * @param {Object} stats - Scale statistics
     * @returns {string} Quality grade
     */
    calculateScaleQualityGrade(stats) {
        const accessibilityScore = stats.accessibleReferences / stats.totalReferences;
        const relevanceScore = stats.relevantReferences / stats.totalReferences;
        const overallScore = (accessibilityScore + relevanceScore) / 2;
        
        if (overallScore >= 0.9) return 'A';
        if (overallScore >= 0.8) return 'B';
        if (overallScore >= 0.7) return 'C';
        if (overallScore >= 0.6) return 'D';
        return 'F';
    }

    /**
     * Generate temporal analysis of validation history
     * @returns {Object} Temporal analysis
     */
    generateTemporalAnalysis() {
        if (this.validationHistory.length === 0) {
            return { message: 'No historical data available' };
        }
        
        const timeGroups = {};
        const now = new Date();
        
        for (const entry of this.validationHistory) {
            const entryDate = new Date(entry.timestamp);
            const dayKey = entryDate.toISOString().split('T')[0];
            
            if (!timeGroups[dayKey]) {
                timeGroups[dayKey] = {
                    total: 0,
                    accessible: 0,
                    relevant: 0,
                    issues: 0
                };
            }
            
            timeGroups[dayKey].total++;
            if (entry.accessible === true) timeGroups[dayKey].accessible++;
            if (entry.contentRelevant === true) timeGroups[dayKey].relevant++;
            if (entry.issues && entry.issues.length > 0) timeGroups[dayKey].issues++;
        }
        
        return {
            dailyStats: timeGroups,
            trends: this.calculateTemporalTrends(timeGroups),
            validationFrequency: this.calculateValidationFrequency()
        };
    }

    /**
     * Calculate temporal trends
     * @param {Object} timeGroups - Time-grouped data
     * @returns {Object} Trend analysis
     */
    calculateTemporalTrends(timeGroups) {
        const dates = Object.keys(timeGroups).sort();
        if (dates.length < 2) {
            return { message: 'Insufficient data for trend analysis' };
        }
        
        const firstDay = timeGroups[dates[0]];
        const lastDay = timeGroups[dates[dates.length - 1]];
        
        return {
            accessibilityTrend: this.calculateTrendDirection(
                firstDay.accessible / firstDay.total,
                lastDay.accessible / lastDay.total
            ),
            relevanceTrend: this.calculateTrendDirection(
                firstDay.relevant / firstDay.total,
                lastDay.relevant / lastDay.total
            ),
            issueTrend: this.calculateTrendDirection(
                firstDay.issues / firstDay.total,
                lastDay.issues / lastDay.total,
                true // Reverse for issues (lower is better)
            )
        };
    }

    /**
     * Calculate trend direction
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {boolean} reverse - Whether to reverse the trend (for negative metrics)
     * @returns {Object} Trend information
     */
    calculateTrendDirection(start, end, reverse = false) {
        const change = end - start;
        const percentChange = start > 0 ? (change / start) * 100 : 0;
        
        let direction = 'stable';
        if (Math.abs(percentChange) > 5) {
            direction = change > 0 ? 'improving' : 'declining';
            if (reverse) {
                direction = change > 0 ? 'declining' : 'improving';
            }
        }
        
        return {
            direction,
            percentChange: Math.round(percentChange),
            startValue: Math.round(start * 100),
            endValue: Math.round(end * 100)
        };
    }

    /**
     * Generate issue analysis from tracked issues
     * @returns {Object} Issue analysis
     */
    generateIssueAnalysis() {
        const issueSummary = this.getIssueSummary();
        
        return {
            summary: issueSummary,
            patterns: this.identifyIssuePatterns(),
            recommendations: this.generateIssueRecommendations(issueSummary),
            preventionStrategies: this.generatePreventionStrategies(issueSummary)
        };
    }

    /**
     * Identify patterns in issues
     * @returns {Array} Issue patterns
     */
    identifyIssuePatterns() {
        const patterns = [];
        const issueSummary = this.getIssueSummary();
        
        // Domain-specific patterns
        const domainIssues = {};
        for (const entry of this.validationHistory) {
            try {
                const domain = new URL(entry.url).hostname;
                if (!domainIssues[domain]) {
                    domainIssues[domain] = { total: 0, issues: 0 };
                }
                domainIssues[domain].total++;
                if (entry.issues && entry.issues.length > 0) {
                    domainIssues[domain].issues++;
                }
            } catch (error) {
                // Invalid URL, skip
            }
        }
        
        // Find problematic domains
        for (const [domain, stats] of Object.entries(domainIssues)) {
            if (stats.total >= 5 && (stats.issues / stats.total) > 0.5) {
                patterns.push({
                    type: 'domain_pattern',
                    pattern: `High failure rate for domain: ${domain}`,
                    occurrences: stats.issues,
                    totalReferences: stats.total,
                    failureRate: Math.round((stats.issues / stats.total) * 100),
                    recommendation: `Consider avoiding or replacing references from ${domain}`
                });
            }
        }
        
        return patterns;
    }

    /**
     * Generate change analysis from replacement decisions
     * @returns {Object} Change analysis
     */
    generateChangeAnalysis() {
        if (this.replacementDecisions.length === 0) {
            return { message: 'No replacement decisions recorded' };
        }
        
        const analysis = {
            totalChanges: this.replacementDecisions.length,
            successfulChanges: 0,
            qualityImprovements: 0,
            averageQualityImprovement: 0,
            changesByReason: {},
            changesByConfidence: {},
            manualReviewRequired: 0
        };
        
        let totalQualityImprovement = 0;
        
        for (const decision of this.replacementDecisions) {
            const improvement = decision.justification.qualityImprovement.improvement;
            
            if (improvement > 0) {
                analysis.successfulChanges++;
                analysis.qualityImprovements++;
                totalQualityImprovement += improvement;
            }
            
            // Group by reason
            const reason = decision.reason;
            analysis.changesByReason[reason] = (analysis.changesByReason[reason] || 0) + 1;
            
            // Group by confidence
            const confidence = decision.justification.confidenceLevel;
            analysis.changesByConfidence[confidence] = (analysis.changesByConfidence[confidence] || 0) + 1;
            
            if (decision.justification.manualReviewRequired) {
                analysis.manualReviewRequired++;
            }
        }
        
        analysis.averageQualityImprovement = analysis.qualityImprovements > 0 
            ? Math.round(totalQualityImprovement / analysis.qualityImprovements)
            : 0;
        
        analysis.successRate = Math.round((analysis.successfulChanges / analysis.totalChanges) * 100);
        
        return analysis;
    }

    /**
     * Generate enhanced statistics
     * @param {Object} validationResults - Validation results
     * @returns {Object} Enhanced statistics
     */
    generateEnhancedStatistics(validationResults) {
        const baseStats = this.generateStatistics(validationResults);
        
        return {
            ...baseStats,
            qualityMetrics: this.generateQualityMetrics(validationResults),
            performanceMetrics: this.generatePerformanceMetrics(validationResults),
            comparisonMetrics: this.generateComparisonMetrics(validationResults)
        };
    }

    /**
     * Generate quality metrics
     * @param {Object} validationResults - Validation results
     * @returns {Object} Quality metrics
     */
    generateQualityMetrics(validationResults) {
        const results = validationResults.validationResults || [];
        
        if (results.length === 0) {
            return { message: 'No validation results available for quality analysis' };
        }
        
        const relevanceScores = results
            .filter(r => r.relevanceScore !== undefined)
            .map(r => r.relevanceScore);
        
        return {
            averageRelevanceScore: relevanceScores.length > 0 
                ? Math.round((relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length) * 100) / 100
                : 0,
            medianRelevanceScore: this.calculateMedian(relevanceScores),
            relevanceScoreDistribution: this.calculateDistribution(relevanceScores),
            qualityGradeDistribution: this.calculateQualityGradeDistribution(results)
        };
    }

    /**
     * Generate performance metrics
     * @param {Object} validationResults - Validation results
     * @returns {Object} Performance metrics
     */
    generatePerformanceMetrics(validationResults) {
        const results = validationResults.validationResults || [];
        const responseTimes = results
            .filter(r => r.responseTime !== undefined)
            .map(r => r.responseTime);
        
        if (responseTimes.length === 0) {
            return { message: 'No performance data available' };
        }
        
        return {
            averageResponseTime: Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length),
            medianResponseTime: this.calculateMedian(responseTimes),
            responseTimeDistribution: this.calculateDistribution(responseTimes),
            timeoutRate: this.calculateTimeoutRate(results),
            retryRate: this.calculateRetryRate(results)
        };
    }

    /**
     * Calculate median value
     * @param {Array} values - Array of numeric values
     * @returns {number} Median value
     */
    calculateMedian(values) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    /**
     * Calculate distribution of values
     * @param {Array} values - Array of numeric values
     * @returns {Object} Distribution statistics
     */
    calculateDistribution(values) {
        if (values.length === 0) return {};
        
        const sorted = [...values].sort((a, b) => a - b);
        
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            q1: this.calculatePercentile(sorted, 25),
            q3: this.calculatePercentile(sorted, 75),
            standardDeviation: this.calculateStandardDeviation(values)
        };
    }

    /**
     * Calculate percentile
     * @param {Array} sortedValues - Sorted array of values
     * @param {number} percentile - Percentile to calculate (0-100)
     * @returns {number} Percentile value
     */
    calculatePercentile(sortedValues, percentile) {
        const index = (percentile / 100) * (sortedValues.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            return sortedValues[lower];
        }
        
        return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
    }

    /**
     * Calculate standard deviation
     * @param {Array} values - Array of numeric values
     * @returns {number} Standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
        const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Generate markdown formatted report
     * @param {Object} report - Report object
     * @returns {string} Markdown formatted report
     */
    generateMarkdownReport(report) {
        let markdown = `# Scale Reference Validation Report\n\n`;
        markdown += `**Generated:** ${report.metadata.generatedAt}\n`;
        markdown += `**Session ID:** ${report.metadata.sessionId}\n`;
        markdown += `**Total Scales:** ${report.metadata.totalScales}\n`;
        markdown += `**Total References:** ${report.metadata.totalReferences}\n\n`;
        
        // Executive Summary
        markdown += `## Executive Summary\n\n`;
        markdown += `**Overall Health Grade:** ${report.executiveSummary.overallHealth.grade} (${report.executiveSummary.overallHealth.score}%)\n`;
        markdown += `**Description:** ${report.executiveSummary.overallHealth.description}\n\n`;
        
        // Key Findings
        if (report.executiveSummary.keyFindings.length > 0) {
            markdown += `### Key Findings\n\n`;
            for (const finding of report.executiveSummary.keyFindings) {
                markdown += `- **${finding.type.toUpperCase()}:** ${finding.finding}\n`;
                markdown += `  - Impact: ${finding.impact}\n`;
                markdown += `  - Priority: ${finding.priority}\n\n`;
            }
        }
        
        // Action Items
        if (report.executiveSummary.actionItems.length > 0) {
            markdown += `### Action Items\n\n`;
            for (const item of report.executiveSummary.actionItems) {
                markdown += `- **${item.action}** (${item.priority} priority)\n`;
                markdown += `  - ${item.description}\n`;
                markdown += `  - Assignee: ${item.assignee}\n`;
                markdown += `  - Estimated Time: ${item.estimatedTime}\n\n`;
            }
        }
        
        // Statistics
        markdown += `## Statistics\n\n`;
        markdown += `| Metric | Value | Percentage |\n`;
        markdown += `|--------|-------|------------|\n`;
        markdown += `| Accessible References | ${report.statistics.accessibility.accessible} | ${report.statistics.accessibility.accessibilityRate}% |\n`;
        markdown += `| Relevant References | ${report.statistics.relevance.relevant} | ${report.statistics.relevance.relevanceRate}% |\n`;
        markdown += `| Issues Found | ${report.issueAnalysis.summary.totalIssueOccurrences} | - |\n\n`;
        
        return markdown;
    }

    /**
     * Generate text formatted report
     * @param {Object} report - Report object
     * @returns {string} Text formatted report
     */
    generateTextReport(report) {
        let text = `SCALE REFERENCE VALIDATION REPORT\n`;
        text += `${'='.repeat(50)}\n\n`;
        text += `Generated: ${report.metadata.generatedAt}\n`;
        text += `Session ID: ${report.metadata.sessionId}\n`;
        text += `Total Scales: ${report.metadata.totalScales}\n`;
        text += `Total References: ${report.metadata.totalReferences}\n\n`;
        
        text += `OVERALL HEALTH: ${report.executiveSummary.overallHealth.grade} (${report.executiveSummary.overallHealth.score}%)\n`;
        text += `${report.executiveSummary.overallHealth.description}\n\n`;
        
        if (report.executiveSummary.keyFindings.length > 0) {
            text += `KEY FINDINGS:\n`;
            text += `${'-'.repeat(20)}\n`;
            for (const finding of report.executiveSummary.keyFindings) {
                text += `${finding.type.toUpperCase()}: ${finding.finding}\n`;
                text += `Impact: ${finding.impact}\n`;
                text += `Priority: ${finding.priority}\n\n`;
            }
        }
        
        return text;
    }

    /**
     * Generate CSV formatted report
     * @param {Object} report - Report object
     * @returns {string} CSV formatted report
     */
    generateCSVReport(report) {
        let csv = `Scale Name,Total References,Accessible,Relevant,Quality Grade,Issues\n`;
        
        if (report.detailedAnalysis && report.detailedAnalysis.scaleBreakdown) {
            for (const [scaleName, stats] of Object.entries(report.detailedAnalysis.scaleBreakdown)) {
                csv += `"${scaleName}",${stats.totalReferences},${stats.accessibleReferences},${stats.relevantReferences},"${stats.qualityGrade}","${stats.issues.join('; ')}"\n`;
            }
        }
        
        return csv;
    }

    /**
     * Generate appendices with detailed data
     * @param {Object} validationResults - Validation results
     * @param {Object} options - Generation options
     * @returns {Object} Appendices
     */
    generateAppendices(validationResults, options) {
        const appendices = {};
        
        if (options.includeRawData) {
            appendices.rawValidationResults = validationResults.validationResults;
        }
        
        if (options.includeChangeLog) {
            appendices.changeLog = this.changeLog;
        }
        
        if (options.includeIssueDetails) {
            appendices.issueDetails = Array.from(this.issueTracker.entries()).map(([issue, data]) => ({
                issue,
                count: data.count,
                firstSeen: data.firstSeen,
                lastSeen: data.lastSeen,
                affectedScales: Array.from(data.affectedScales),
                affectedUrls: Array.from(data.affectedUrls),
                examples: data.examples
            }));
        }
        
        return appendices;
    }

    /**
     * Calculate validation period from results
     * @param {Object} validationResults - Validation results
     * @returns {Object} Validation period information
     */
    calculateValidationPeriod(validationResults) {
        if (!validationResults.validationResults || validationResults.validationResults.length === 0) {
            return { message: 'No validation data available' };
        }
        
        const timestamps = validationResults.validationResults
            .map(r => r.checkedAt || r.timestamp)
            .filter(t => t)
            .sort();
        
        if (timestamps.length === 0) {
            return { message: 'No timestamp data available' };
        }
        
        return {
            startTime: timestamps[0],
            endTime: timestamps[timestamps.length - 1],
            duration: new Date(timestamps[timestamps.length - 1]) - new Date(timestamps[0]),
            totalValidations: timestamps.length
        };
    }

    /**
     * Generate unique session ID
     * @returns {string} Unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique change ID
     * @param {string} scaleName - Scale name
     * @param {Object} oldRef - Old reference
     * @param {Object} newRef - New reference
     * @returns {string} Unique change ID
     */
    generateChangeId(scaleName, oldRef, newRef) {
        const timestamp = Date.now();
        const scaleHash = scaleName.substring(0, 8);
        const oldHash = oldRef?.url ? oldRef.url.substring(0, 8) : 'none';
        const newHash = newRef?.url ? newRef.url.substring(0, 8) : 'none';
        
        return `${scaleHash}-${oldHash}-${newHash}-${timestamp}`;
    }

    /**
     * Calculate quality grade distribution
     * @param {Array} results - Validation results
     * @returns {Object} Quality grade distribution
     */
    calculateQualityGradeDistribution(results) {
        const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        
        for (const result of results) {
            const accessibilityScore = result.accessible === true ? 1 : 0;
            const relevanceScore = result.contentRelevant === true ? 1 : 0;
            const overallScore = (accessibilityScore + relevanceScore) / 2;
            
            let grade = 'F';
            if (overallScore >= 0.9) grade = 'A';
            else if (overallScore >= 0.8) grade = 'B';
            else if (overallScore >= 0.7) grade = 'C';
            else if (overallScore >= 0.6) grade = 'D';
            
            distribution[grade]++;
        }
        
        return distribution;
    }

    /**
     * Calculate timeout rate from results
     * @param {Array} results - Validation results
     * @returns {number} Timeout rate percentage
     */
    calculateTimeoutRate(results) {
        const timeoutResults = results.filter(r => 
            r.issues && r.issues.some(issue => 
                issue.toLowerCase().includes('timeout') || 
                issue.toLowerCase().includes('connection timeout')
            )
        );
        
        return results.length > 0 ? Math.round((timeoutResults.length / results.length) * 100) : 0;
    }

    /**
     * Calculate retry rate from results
     * @param {Array} results - Validation results
     * @returns {number} Retry rate percentage
     */
    calculateRetryRate(results) {
        const retryResults = results.filter(r => r.attempts && r.attempts > 1);
        return results.length > 0 ? Math.round((retryResults.length / results.length) * 100) : 0;
    }

    /**
     * Calculate validation frequency
     * @returns {Object} Validation frequency metrics
     */
    calculateValidationFrequency() {
        if (this.validationHistory.length === 0) {
            return { message: 'No validation history available' };
        }
        
        const timestamps = this.validationHistory.map(entry => new Date(entry.timestamp)).sort();
        const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
        const days = Math.max(1, Math.ceil(timeSpan / (1000 * 60 * 60 * 24)));
        
        return {
            totalValidations: this.validationHistory.length,
            timeSpanDays: days,
            averageValidationsPerDay: Math.round((this.validationHistory.length / days) * 10) / 10,
            peakValidationDay: this.findPeakValidationDay(),
            validationPattern: this.analyzeValidationPattern()
        };
    }

    /**
     * Find peak validation day
     * @returns {Object} Peak validation day information
     */
    findPeakValidationDay() {
        const dailyCounts = {};
        
        for (const entry of this.validationHistory) {
            const day = new Date(entry.timestamp).toISOString().split('T')[0];
            dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }
        
        const peakDay = Object.entries(dailyCounts).reduce((max, [day, count]) => 
            count > max.count ? { day, count } : max, { day: null, count: 0 }
        );
        
        return peakDay;
    }

    /**
     * Analyze validation pattern
     * @returns {string} Validation pattern description
     */
    analyzeValidationPattern() {
        if (this.validationHistory.length < 7) {
            return 'Insufficient data for pattern analysis';
        }
        
        const dailyCounts = {};
        for (const entry of this.validationHistory) {
            const day = new Date(entry.timestamp).toISOString().split('T')[0];
            dailyCounts[day] = (dailyCounts[day] || 0) + 1;
        }
        
        const counts = Object.values(dailyCounts);
        const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;
        
        if (variance < average * 0.1) {
            return 'Consistent validation frequency';
        } else if (variance > average * 0.5) {
            return 'Highly variable validation frequency';
        } else {
            return 'Moderately variable validation frequency';
        }
    }

    /**
     * Estimate fix time for an issue
     * @param {Object} issue - Issue object with count and affected scales
     * @returns {string} Estimated fix time
     */
    estimateFixTime(issue) {
        const baseTimeMinutes = 15; // 15 minutes base time per issue
        const complexityMultiplier = Math.min(3, Math.log10(issue.count + 1)); // Logarithmic scaling
        const scaleMultiplier = Math.min(2, issue.affectedScales / 10); // Scale complexity
        
        const totalMinutes = Math.ceil(baseTimeMinutes * complexityMultiplier * (1 + scaleMultiplier));
        
        if (totalMinutes < 60) {
            return `${totalMinutes} minutes`;
        } else {
            const hours = Math.round(totalMinutes / 60 * 10) / 10;
            return `${hours} hours`;
        }
    }

    /**
     * Generate issue recommendations
     * @param {Object} issueSummary - Issue summary object
     * @returns {Array} Issue-specific recommendations
     */
    generateIssueRecommendations(issueSummary) {
        const recommendations = [];
        
        for (const issue of issueSummary.mostCommonIssues.slice(0, 5)) {
            const category = this.categorizeIssue(issue.issue);
            let recommendation = '';
            
            switch (category) {
                case 'connectivity':
                    recommendation = 'Implement retry logic with exponential backoff and consider alternative sources for frequently failing domains';
                    break;
                case 'not_found':
                    recommendation = 'Replace broken links with archived versions or alternative sources covering the same content';
                    break;
                case 'access_denied':
                    recommendation = 'Find alternative sources or contact site administrators for access permissions';
                    break;
                case 'server_error':
                    recommendation = 'Monitor these sources and have backup references ready for temporary failures';
                    break;
                case 'content_quality':
                    recommendation = 'Replace with more specific, scale-focused educational resources';
                    break;
                default:
                    recommendation = 'Investigate root cause and implement targeted fixes based on specific error patterns';
            }
            
            recommendations.push({
                issue: issue.issue,
                category,
                occurrences: issue.count,
                affectedScales: issue.affectedScales,
                recommendation,
                priority: issue.count > 10 ? 'high' : issue.count > 5 ? 'medium' : 'low'
            });
        }
        
        return recommendations;
    }

    /**
     * Generate prevention strategies
     * @param {Object} issueSummary - Issue summary object
     * @returns {Array} Prevention strategies
     */
    generatePreventionStrategies(issueSummary) {
        const strategies = [];
        
        // Analyze issue categories for prevention strategies
        const categoryStats = {};
        for (const [category, data] of Object.entries(issueSummary.issuesByCategory)) {
            categoryStats[category] = data.count;
        }
        
        if (categoryStats.connectivity > 0) {
            strategies.push({
                category: 'connectivity',
                strategy: 'Implement robust HTTP client with timeout handling',
                description: 'Use connection pooling, retry logic, and circuit breakers to handle network issues',
                implementation: 'Configure HTTP client with 30-second timeouts and 3-retry maximum with exponential backoff'
            });
        }
        
        if (categoryStats.not_found > 0) {
            strategies.push({
                category: 'link_maintenance',
                strategy: 'Regular link validation and maintenance schedule',
                description: 'Implement automated weekly validation runs to catch broken links early',
                implementation: 'Schedule automated validation every Sunday with email alerts for new broken links'
            });
        }
        
        if (categoryStats.content_quality > 0) {
            strategies.push({
                category: 'content_curation',
                strategy: 'Establish content quality standards and review process',
                description: 'Create guidelines for acceptable reference sources and implement review workflow',
                implementation: 'Require manual review for all new references and maintain whitelist of approved domains'
            });
        }
        
        // General strategies
        strategies.push({
            category: 'monitoring',
            strategy: 'Implement continuous monitoring and alerting',
            description: 'Set up monitoring to detect reference quality degradation in real-time',
            implementation: 'Configure alerts when accessibility rate drops below 85% or when more than 5 new issues are detected'
        });
        
        return strategies;
    }

    /**
     * Generate enhanced recommendations
     * @param {Object} validationResults - Validation results
     * @returns {Array} Enhanced recommendations with priorities and timelines
     */
    generateEnhancedRecommendations(validationResults) {
        const baseRecommendations = this.generateRecommendations(validationResults);
        const issueSummary = this.getIssueSummary();
        const criticalIssues = this.identifyCriticalIssues(validationResults);
        
        const enhancedRecommendations = [...baseRecommendations];
        
        // Add critical issue recommendations
        for (const critical of criticalIssues) {
            enhancedRecommendations.push({
                priority: 'critical',
                category: 'system_stability',
                issue: critical.issue,
                recommendation: `Immediate attention required: ${critical.issue}`,
                affectedReferences: critical.occurrences,
                estimatedFixTime: critical.estimatedFixTime,
                businessImpact: 'High - affects system credibility and user experience',
                technicalComplexity: 'Medium',
                resourceRequirements: 'Technical team + Content review'
            });
        }
        
        // Add strategic recommendations
        const total = validationResults.totalReferences || 0;
        const accessibilityRate = this.calculatePercentage(
            validationResults.summary?.accessibleReferences || 0, 
            total
        );
        
        if (accessibilityRate < 95 && total > 100) {
            enhancedRecommendations.push({
                priority: 'strategic',
                category: 'infrastructure',
                issue: 'Reference infrastructure needs improvement',
                recommendation: 'Implement comprehensive reference management system with automated validation, backup sources, and quality monitoring',
                estimatedImplementationTime: '4-6 weeks',
                businessImpact: 'Medium - improves long-term system reliability',
                technicalComplexity: 'High',
                resourceRequirements: 'Development team + DevOps support'
            });
        }
        
        return enhancedRecommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, strategic: 0 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Generate trend analysis
     * @param {Object} validationResults - Validation results
     * @returns {Object} Trend analysis
     */
    generateTrendAnalysis(validationResults) {
        const temporalAnalysis = this.generateTemporalAnalysis();
        const issueAnalysis = this.generateIssueAnalysis();
        
        return {
            temporal: temporalAnalysis,
            qualityTrends: this.analyzeQualityTrends(validationResults),
            issueTrends: this.analyzeIssueTrends(issueAnalysis),
            performanceTrends: this.analyzePerformanceTrends(validationResults),
            predictions: this.generateTrendPredictions(validationResults)
        };
    }

    /**
     * Analyze quality trends
     * @param {Object} validationResults - Validation results
     * @returns {Object} Quality trend analysis
     */
    analyzeQualityTrends(validationResults) {
        if (!this.validationHistory || this.validationHistory.length < 10) {
            return { message: 'Insufficient historical data for quality trend analysis' };
        }
        
        // Group by time periods
        const weeklyStats = {};
        for (const entry of this.validationHistory) {
            const week = this.getWeekKey(new Date(entry.timestamp));
            if (!weeklyStats[week]) {
                weeklyStats[week] = { total: 0, accessible: 0, relevant: 0 };
            }
            weeklyStats[week].total++;
            if (entry.accessible === true) weeklyStats[week].accessible++;
            if (entry.contentRelevant === true) weeklyStats[week].relevant++;
        }
        
        const weeks = Object.keys(weeklyStats).sort();
        if (weeks.length < 2) {
            return { message: 'Need at least 2 weeks of data for trend analysis' };
        }
        
        const firstWeek = weeklyStats[weeks[0]];
        const lastWeek = weeklyStats[weeks[weeks.length - 1]];
        
        return {
            accessibilityTrend: this.calculateTrendDirection(
                firstWeek.accessible / firstWeek.total,
                lastWeek.accessible / lastWeek.total
            ),
            relevanceTrend: this.calculateTrendDirection(
                firstWeek.relevant / firstWeek.total,
                lastWeek.relevant / lastWeek.total
            ),
            weeklyData: weeklyStats,
            trendStrength: this.calculateTrendStrength(weeklyStats)
        };
    }

    /**
     * Get week key for grouping
     * @param {Date} date - Date object
     * @returns {string} Week key (YYYY-WW format)
     */
    getWeekKey(date) {
        const year = date.getFullYear();
        const week = Math.ceil(((date - new Date(year, 0, 1)) / 86400000 + 1) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    }

    /**
     * Calculate trend strength
     * @param {Object} weeklyStats - Weekly statistics
     * @returns {string} Trend strength description
     */
    calculateTrendStrength(weeklyStats) {
        const weeks = Object.keys(weeklyStats).sort();
        if (weeks.length < 3) return 'Insufficient data';
        
        const accessibilityRates = weeks.map(week => {
            const stats = weeklyStats[week];
            return stats.total > 0 ? stats.accessible / stats.total : 0;
        });
        
        const variance = this.calculateStandardDeviation(accessibilityRates);
        
        if (variance < 0.05) return 'Very stable';
        if (variance < 0.1) return 'Stable';
        if (variance < 0.2) return 'Moderate variation';
        return 'High variation';
    }

    /**
     * Analyze issue trends
     * @param {Object} issueAnalysis - Issue analysis object
     * @returns {Object} Issue trend analysis
     */
    analyzeIssueTrends(issueAnalysis) {
        const trends = {
            emergingIssues: [],
            decliningIssues: [],
            persistentIssues: []
        };
        
        // Analyze issue frequency over time
        for (const issue of issueAnalysis.summary.mostCommonIssues) {
            const daysSinceFirst = (new Date() - new Date(issue.firstSeen)) / (1000 * 60 * 60 * 24);
            const daysSinceLast = (new Date() - new Date(issue.lastSeen)) / (1000 * 60 * 60 * 24);
            
            if (daysSinceLast < 7) {
                if (daysSinceFirst < 30) {
                    trends.emergingIssues.push({
                        issue: issue.issue,
                        count: issue.count,
                        trend: 'emerging'
                    });
                } else {
                    trends.persistentIssues.push({
                        issue: issue.issue,
                        count: issue.count,
                        trend: 'persistent'
                    });
                }
            } else if (daysSinceLast > 30) {
                trends.decliningIssues.push({
                    issue: issue.issue,
                    count: issue.count,
                    trend: 'declining'
                });
            }
        }
        
        return trends;
    }

    /**
     * Analyze performance trends
     * @param {Object} validationResults - Validation results
     * @returns {Object} Performance trend analysis
     */
    analyzePerformanceTrends(validationResults) {
        const results = validationResults.validationResults || [];
        const responseTimes = results
            .filter(r => r.responseTime !== undefined)
            .map(r => ({ time: r.responseTime, timestamp: r.checkedAt || r.timestamp }))
            .filter(r => r.timestamp)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        if (responseTimes.length < 10) {
            return { message: 'Insufficient performance data for trend analysis' };
        }
        
        const midpoint = Math.floor(responseTimes.length / 2);
        const firstHalf = responseTimes.slice(0, midpoint);
        const secondHalf = responseTimes.slice(midpoint);
        
        const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.time, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.time, 0) / secondHalf.length;
        
        return {
            performanceTrend: this.calculateTrendDirection(firstHalfAvg, secondHalfAvg, true),
            averageResponseTimeFirst: Math.round(firstHalfAvg),
            averageResponseTimeSecond: Math.round(secondHalfAvg),
            performanceChange: Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
        };
    }

    /**
     * Generate trend predictions
     * @param {Object} validationResults - Validation results
     * @returns {Object} Trend predictions
     */
    generateTrendPredictions(validationResults) {
        const qualityTrends = this.analyzeQualityTrends(validationResults);
        const predictions = [];
        
        if (qualityTrends.accessibilityTrend) {
            const trend = qualityTrends.accessibilityTrend;
            if (trend.direction === 'declining' && Math.abs(trend.percentChange) > 10) {
                predictions.push({
                    metric: 'accessibility',
                    prediction: 'Accessibility rate may drop below 70% within 4 weeks if current trend continues',
                    confidence: 'medium',
                    recommendedAction: 'Implement immediate link replacement program'
                });
            } else if (trend.direction === 'improving' && Math.abs(trend.percentChange) > 5) {
                predictions.push({
                    metric: 'accessibility',
                    prediction: 'Accessibility rate expected to reach 90%+ within 6 weeks',
                    confidence: 'medium',
                    recommendedAction: 'Continue current improvement efforts'
                });
            }
        }
        
        // Issue volume predictions
        const issueGrowthRate = this.calculateIssueGrowthRate();
        if (issueGrowthRate > 0.1) {
            predictions.push({
                metric: 'issue_volume',
                prediction: 'Issue volume may increase by 20%+ in next month if not addressed',
                confidence: 'low',
                recommendedAction: 'Implement proactive monitoring and prevention measures'
            });
        }
        
        return predictions;
    }

    /**
     * Calculate issue growth rate
     * @returns {number} Issue growth rate
     */
    calculateIssueGrowthRate() {
        if (this.validationHistory.length < 20) return 0;
        
        const recentIssues = this.validationHistory
            .filter(entry => {
                const daysSince = (new Date() - new Date(entry.timestamp)) / (1000 * 60 * 60 * 24);
                return daysSince <= 7;
            })
            .filter(entry => entry.issues && entry.issues.length > 0).length;
        
        const olderIssues = this.validationHistory
            .filter(entry => {
                const daysSince = (new Date() - new Date(entry.timestamp)) / (1000 * 60 * 60 * 24);
                return daysSince > 7 && daysSince <= 14;
            })
            .filter(entry => entry.issues && entry.issues.length > 0).length;
        
        return olderIssues > 0 ? (recentIssues - olderIssues) / olderIssues : 0;
    }

    /**
     * Generate comparison metrics
     * @param {Object} validationResults - Validation results
     * @returns {Object} Comparison metrics
     */
    generateComparisonMetrics(validationResults) {
        const currentStats = {
            accessibility: this.calculatePercentage(
                validationResults.summary?.accessibleReferences || 0,
                validationResults.totalReferences || 0
            ),
            relevance: this.calculatePercentage(
                validationResults.summary?.relevantReferences || 0,
                validationResults.totalReferences || 0
            )
        };
        
        // Industry benchmarks (hypothetical - would be based on real data)
        const industryBenchmarks = {
            accessibility: 85,
            relevance: 75,
            overallQuality: 80
        };
        
        // Historical comparison (if available)
        const historicalComparison = this.getHistoricalComparison();
        
        return {
            current: currentStats,
            industryBenchmarks,
            historical: historicalComparison,
            gaps: {
                accessibilityGap: industryBenchmarks.accessibility - currentStats.accessibility,
                relevanceGap: industryBenchmarks.relevance - currentStats.relevance
            },
            ranking: this.calculateQualityRanking(currentStats, industryBenchmarks)
        };
    }

    /**
     * Get historical comparison data
     * @returns {Object} Historical comparison
     */
    getHistoricalComparison() {
        if (this.validationHistory.length < 50) {
            return { message: 'Insufficient historical data for comparison' };
        }
        
        // Compare with data from 30 days ago
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const historicalEntries = this.validationHistory.filter(entry => 
            new Date(entry.timestamp) <= thirtyDaysAgo
        );
        
        if (historicalEntries.length === 0) {
            return { message: 'No historical data from 30 days ago' };
        }
        
        const historicalAccessible = historicalEntries.filter(e => e.accessible === true).length;
        const historicalRelevant = historicalEntries.filter(e => e.contentRelevant === true).length;
        
        return {
            accessibility: this.calculatePercentage(historicalAccessible, historicalEntries.length),
            relevance: this.calculatePercentage(historicalRelevant, historicalEntries.length),
            totalReferences: historicalEntries.length,
            comparisonDate: thirtyDaysAgo.toISOString().split('T')[0]
        };
    }

    /**
     * Calculate quality ranking
     * @param {Object} currentStats - Current statistics
     * @param {Object} benchmarks - Industry benchmarks
     * @returns {Object} Quality ranking
     */
    calculateQualityRanking(currentStats, benchmarks) {
        const overallScore = (currentStats.accessibility + currentStats.relevance) / 2;
        const benchmarkScore = (benchmarks.accessibility + benchmarks.relevance) / 2;
        
        let ranking = 'Below Average';
        let percentile = Math.round((overallScore / benchmarkScore) * 50); // Assume benchmark is 50th percentile
        
        if (overallScore >= benchmarkScore * 1.2) {
            ranking = 'Excellent';
            percentile = Math.min(95, percentile + 30);
        } else if (overallScore >= benchmarkScore * 1.1) {
            ranking = 'Above Average';
            percentile = Math.min(85, percentile + 20);
        } else if (overallScore >= benchmarkScore * 0.9) {
            ranking = 'Average';
            percentile = Math.max(40, Math.min(60, percentile));
        } else if (overallScore >= benchmarkScore * 0.7) {
            ranking = 'Below Average';
            percentile = Math.max(20, percentile - 10);
        } else {
            ranking = 'Poor';
            percentile = Math.max(5, percentile - 20);
        }
        
        return {
            ranking,
            percentile,
            overallScore: Math.round(overallScore),
            benchmarkScore: Math.round(benchmarkScore),
            scoreGap: Math.round(benchmarkScore - overallScore)
        };
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationReporter;
} else if (typeof window !== 'undefined') {
    window.ValidationReporter = ValidationReporter;
}