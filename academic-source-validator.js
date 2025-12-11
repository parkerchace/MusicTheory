/**
 * @module AcademicSourceValidator
 * @description Comprehensive validation tool for academic sources and regional scale documentation
 * @exports class AcademicSourceValidator
 * @feature Complete scale documentation validation
 * @feature Batch citation processing
 * @feature Academic source verification
 * @feature Documentation quality scoring
 */

const AcademicValidationUtilities = require('./academic-validation-utilities.js');
const CitationManager = require('./citation-manager.js');
const RegionalScaleManager = require('./regional-scale-manager.js');

class AcademicSourceValidator {
    constructor() {
        this.validationUtilities = new AcademicValidationUtilities();
        this.citationManager = new CitationManager();
        this.regionalScaleManager = new RegionalScaleManager();
        
        this.validationHistory = [];
        this.qualityThresholds = {
            excellent: 0.9,
            good: 0.75,
            acceptable: 0.6,
            needsImprovement: 0.4
        };
    }

    /**
     * Perform comprehensive validation of a regional scale documentation package
     * @param {Object} scalePackage - Complete scale documentation
     * @param {Object} options - Validation options
     * @returns {Promise<Object>} Comprehensive validation report
     */
    async validateScalePackage(scalePackage, options = {}) {
        const {
            checkAccessibility = true,
            validateCulturalSensitivity = true,
            generateReport = true
        } = options;

        const validationReport = {
            scaleId: scalePackage.scaleId || 'unknown',
            timestamp: new Date().toISOString(),
            overallScore: 0,
            qualityLevel: 'needs_improvement',
            valid: false,
            sections: {},
            recommendations: [],
            errors: [],
            warnings: [],
            summary: {}
        };

        try {
            // 1. Basic structure validation
            const structureValidation = this.validateBasicStructure(scalePackage);
            validationReport.sections.structure = structureValidation;
            
            // 2. Citation format validation
            const citationValidation = await this.validateCitations(scalePackage.references || [], checkAccessibility);
            validationReport.sections.citations = citationValidation;
            
            // 3. Cultural context validation
            const culturalValidation = this.validateCulturalContext(scalePackage.culturalContext);
            validationReport.sections.cultural = culturalValidation;
            
            // 4. Tuning system documentation validation
            const tuningValidation = this.validateTuningDocumentation(scalePackage.tuningSystem);
            validationReport.sections.tuning = tuningValidation;
            
            // 5. Academic rigor assessment
            const academicValidation = this.assessAcademicRigor(scalePackage);
            validationReport.sections.academic = academicValidation;
            
            // 6. Educational appropriateness check
            const educationalValidation = this.validateEducationalAppropriateness(scalePackage);
            validationReport.sections.educational = educationalValidation;
            
            // Calculate overall score and quality level
            this.calculateOverallScore(validationReport);
            
            // Generate recommendations
            this.generateRecommendations(validationReport);
            
            // Store validation history
            this.validationHistory.push({
                scaleId: validationReport.scaleId,
                timestamp: validationReport.timestamp,
                score: validationReport.overallScore,
                valid: validationReport.valid
            });
            
            return validationReport;
            
        } catch (error) {
            validationReport.errors.push(`Validation failed: ${error.message}`);
            validationReport.valid = false;
            return validationReport;
        }
    }

    /**
     * Validate basic structure of scale package
     * @param {Object} scalePackage - Scale documentation package
     * @returns {Object} Structure validation result
     */
    validateBasicStructure(scalePackage) {
        const errors = [];
        const warnings = [];
        let score = 0;
        const totalChecks = 6;

        // Check required top-level fields
        if (!scalePackage.scaleId || typeof scalePackage.scaleId !== 'string') {
            errors.push('Missing or invalid scaleId');
        } else {
            score++;
        }

        if (!Array.isArray(scalePackage.intervals)) {
            errors.push('Missing or invalid intervals array');
        } else {
            // Validate 12-TET compatibility
            const validIntervals = scalePackage.intervals.every(interval => 
                Number.isInteger(interval) && interval >= 0 && interval <= 11
            );
            if (!validIntervals) {
                errors.push('Intervals must be integers between 0-11 for 12-TET compatibility');
            } else {
                score++;
            }
        }

        if (!scalePackage.description || scalePackage.description.trim().length === 0) {
            errors.push('Missing scale description');
        } else {
            score++;
        }

        if (!scalePackage.culturalContext) {
            errors.push('Missing cultural context');
        } else {
            score++;
        }

        if (!scalePackage.tuningSystem) {
            errors.push('Missing tuning system documentation');
        } else {
            score++;
        }

        if (!Array.isArray(scalePackage.references) || scalePackage.references.length === 0) {
            errors.push('Missing or empty references array');
        } else {
            score++;
        }

        // Check for alternative sources (recommended)
        if (!scalePackage.alternativeSources || scalePackage.alternativeSources.length === 0) {
            warnings.push('No alternative sources provided - recommended for redundancy');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            score: score / totalChecks,
            completeness: score / totalChecks
        };
    }

    /**
     * Validate citations with accessibility checking
     * @param {Array} references - Array of citation objects
     * @param {boolean} checkAccessibility - Whether to check URL accessibility
     * @returns {Promise<Object>} Citation validation result
     */
    async validateCitations(references, checkAccessibility = true) {
        const errors = [];
        const warnings = [];
        let totalScore = 0;
        const citationResults = [];

        if (!Array.isArray(references) || references.length === 0) {
            return {
                valid: false,
                errors: ['No references provided'],
                warnings: [],
                score: 0,
                citationResults: []
            };
        }

        // Validate each citation
        for (let i = 0; i < references.length; i++) {
            const citation = references[i];
            const citationValidation = this.validationUtilities.validateCitationFormat(citation);
            
            citationResults.push({
                index: i,
                citation: citation.title || `Citation ${i + 1}`,
                validation: citationValidation
            });

            if (!citationValidation.valid) {
                errors.push(`Citation ${i + 1}: ${citationValidation.errors.join(', ')}`);
            }
            
            warnings.push(...citationValidation.warnings.map(w => `Citation ${i + 1}: ${w}`));
            totalScore += citationValidation.completeness;
        }

        // Check for academic source priority
        const academicSources = references.filter(ref => 
            ['journal_article', 'book', 'conference_paper'].includes(ref.type)
        );
        
        if (academicSources.length === 0) {
            errors.push('No peer-reviewed academic sources found');
        }

        // Check accessibility if requested
        let accessibilityResults = null;
        if (checkAccessibility) {
            try {
                const urls = references.filter(ref => ref.url).map(ref => ref.url);
                if (urls.length > 0) {
                    accessibilityResults = await this.validationUtilities.bulkAccessibilityCheck(urls);
                }
            } catch (error) {
                warnings.push(`Accessibility check failed: ${error.message}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            score: references.length > 0 ? totalScore / references.length : 0,
            citationResults: citationResults,
            accessibilityResults: accessibilityResults,
            academicSourceCount: academicSources.length,
            totalSourceCount: references.length
        };
    }

    /**
     * Validate cultural context section
     * @param {Object} culturalContext - Cultural context object
     * @returns {Object} Cultural validation result
     */
    validateCulturalContext(culturalContext) {
        if (!culturalContext) {
            return {
                valid: false,
                errors: ['Cultural context is required'],
                warnings: [],
                score: 0
            };
        }

        return this.validationUtilities.validateCulturalContext(culturalContext);
    }

    /**
     * Validate tuning system documentation
     * @param {Object} tuningSystem - Tuning system documentation
     * @returns {Object} Tuning validation result
     */
    validateTuningDocumentation(tuningSystem) {
        if (!tuningSystem) {
            return {
                valid: false,
                errors: ['Tuning system documentation is required'],
                warnings: [],
                score: 0
            };
        }

        return this.validationUtilities.validate12TETApproximationDocumentation(tuningSystem);
    }

    /**
     * Assess academic rigor of the documentation
     * @param {Object} scalePackage - Complete scale package
     * @returns {Object} Academic rigor assessment
     */
    assessAcademicRigor(scalePackage) {
        const errors = [];
        const warnings = [];
        let score = 0;
        const totalChecks = 5;

        // Check for peer-reviewed sources
        const references = scalePackage.references || [];
        const peerReviewedCount = references.filter(ref => 
            ref.type === 'journal_article' || 
            (ref.type === 'book' && ref.publisher)
        ).length;

        if (peerReviewedCount === 0) {
            errors.push('No peer-reviewed sources found');
        } else if (peerReviewedCount >= 2) {
            score++;
        }

        // Check for complete bibliographic information
        const completeReferences = references.filter(ref => {
            const validation = this.validationUtilities.validateCitationFormat(ref);
            return validation.hasRequiredFields;
        }).length;

        if (completeReferences === references.length && references.length > 0) {
            score++;
        } else {
            warnings.push('Some references have incomplete bibliographic information');
        }

        // Check for cultural attribution specificity
        const culturalContext = scalePackage.culturalContext;
        if (culturalContext) {
            const hasSpecificAttribution = 
                culturalContext.culturalGroup && 
                culturalContext.region && 
                culturalContext.historicalPeriod &&
                !culturalContext.culturalGroup.toLowerCase().includes('general') &&
                !culturalContext.region.toLowerCase().includes('general');
            
            if (hasSpecificAttribution) {
                score++;
            } else {
                warnings.push('Cultural attribution could be more specific');
            }
        }

        // Check for approximation methodology documentation
        const tuningSystem = scalePackage.tuningSystem;
        if (tuningSystem && tuningSystem.limitations && tuningSystem.approximationMethod) {
            score++;
        } else {
            warnings.push('Approximation methodology could be more detailed');
        }

        // Check for alternative sources
        if (scalePackage.alternativeSources && scalePackage.alternativeSources.length > 0) {
            score++;
        } else {
            warnings.push('Alternative sources recommended for academic redundancy');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            score: score / totalChecks,
            peerReviewedCount: peerReviewedCount,
            completeReferencesCount: completeReferences
        };
    }

    /**
     * Validate educational appropriateness
     * @param {Object} scalePackage - Complete scale package
     * @returns {Object} Educational validation result
     */
    validateEducationalAppropriateness(scalePackage) {
        const errors = [];
        const warnings = [];
        let score = 0;
        const totalChecks = 4;

        // Check for pedagogical notes
        const tuningSystem = scalePackage.tuningSystem;
        if (tuningSystem && tuningSystem.pedagogicalNotes) {
            const notes = tuningSystem.pedagogicalNotes.toLowerCase();
            if (notes.includes('high school') || notes.includes('student') || notes.includes('education')) {
                score++;
            } else {
                warnings.push('Pedagogical notes should address educational context');
            }
        } else {
            errors.push('Missing pedagogical notes for educational use');
        }

        // Check for orchestral compatibility
        if (tuningSystem && tuningSystem.orchestralInstruments) {
            const instruments = tuningSystem.orchestralInstruments.toLowerCase();
            const expectedInstruments = ['violin', 'viola', 'cello', 'bass'];
            const hasOrchestralInstruments = expectedInstruments.some(inst => instruments.includes(inst));
            
            if (hasOrchestralInstruments) {
                score++;
            } else {
                warnings.push('Should specify compatibility with standard orchestral instruments');
            }
        }

        // Check for cultural sensitivity
        const culturalContext = scalePackage.culturalContext;
        if (culturalContext && culturalContext.musicalFunction) {
            score++;
        } else {
            warnings.push('Should include cultural context for respectful educational use');
        }

        // Check for appropriate complexity
        const intervals = scalePackage.intervals || [];
        if (intervals.length >= 5 && intervals.length <= 8) {
            score++; // Appropriate complexity for educational use
        } else if (intervals.length < 5) {
            warnings.push('Scale may be too simple for educational value');
        } else {
            warnings.push('Scale may be too complex for high school level');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            score: score / totalChecks
        };
    }

    /**
     * Calculate overall validation score
     * @param {Object} validationReport - Validation report to update
     */
    calculateOverallScore(validationReport) {
        const sections = validationReport.sections;
        const weights = {
            structure: 0.2,
            citations: 0.25,
            cultural: 0.15,
            tuning: 0.15,
            academic: 0.15,
            educational: 0.1
        };

        let weightedScore = 0;
        let totalWeight = 0;

        for (const [section, weight] of Object.entries(weights)) {
            if (sections[section] && typeof sections[section].score === 'number') {
                weightedScore += sections[section].score * weight;
                totalWeight += weight;
            }
        }

        validationReport.overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
        
        // Determine quality level
        if (validationReport.overallScore >= this.qualityThresholds.excellent) {
            validationReport.qualityLevel = 'excellent';
        } else if (validationReport.overallScore >= this.qualityThresholds.good) {
            validationReport.qualityLevel = 'good';
        } else if (validationReport.overallScore >= this.qualityThresholds.acceptable) {
            validationReport.qualityLevel = 'acceptable';
        } else {
            validationReport.qualityLevel = 'needs_improvement';
        }

        // Determine overall validity
        validationReport.valid = validationReport.overallScore >= this.qualityThresholds.acceptable &&
                                Object.values(sections).every(section => section.valid !== false);

        // Collect all errors and warnings
        validationReport.errors = [];
        validationReport.warnings = [];
        
        for (const section of Object.values(sections)) {
            if (section.errors) {
                validationReport.errors.push(...section.errors);
            }
            if (section.warnings) {
                validationReport.warnings.push(...section.warnings);
            }
        }
    }

    /**
     * Generate recommendations for improvement
     * @param {Object} validationReport - Validation report to update
     */
    generateRecommendations(validationReport) {
        const recommendations = [];
        const sections = validationReport.sections;

        // Structure recommendations
        if (sections.structure && sections.structure.score < 0.8) {
            recommendations.push('Complete all required structural elements (scaleId, intervals, description, cultural context, tuning system, references)');
        }

        // Citation recommendations
        if (sections.citations) {
            if (sections.citations.academicSourceCount < 2) {
                recommendations.push('Add more peer-reviewed academic sources (minimum 2 recommended)');
            }
            if (sections.citations.score < 0.7) {
                recommendations.push('Improve citation completeness with full bibliographic information');
            }
        }

        // Cultural recommendations
        if (sections.cultural && sections.cultural.score < 0.8) {
            recommendations.push('Provide more specific cultural attribution (cultural group, region, historical period, musical function)');
        }

        // Tuning recommendations
        if (sections.tuning && sections.tuning.score < 0.8) {
            recommendations.push('Complete 12-TET approximation documentation (original tuning, methodology, limitations, pedagogical notes)');
        }

        // Academic rigor recommendations
        if (sections.academic && sections.academic.score < 0.7) {
            recommendations.push('Enhance academic rigor with more peer-reviewed sources and detailed approximation methodology');
        }

        // Educational recommendations
        if (sections.educational && sections.educational.score < 0.7) {
            recommendations.push('Improve educational appropriateness with better pedagogical notes and orchestral compatibility documentation');
        }

        // Quality-specific recommendations
        if (validationReport.qualityLevel === 'needs_improvement') {
            recommendations.push('Focus on completing required fields and adding academic sources before integration');
        } else if (validationReport.qualityLevel === 'acceptable') {
            recommendations.push('Consider adding alternative sources and more detailed cultural context for higher quality');
        }

        validationReport.recommendations = recommendations;
    }

    /**
     * Generate validation summary report
     * @param {Object} validationReport - Complete validation report
     * @returns {string} Formatted summary report
     */
    generateSummaryReport(validationReport) {
        const report = [];
        
        report.push(`# Validation Report: ${validationReport.scaleId}`);
        report.push(`Generated: ${validationReport.timestamp}`);
        report.push(`Overall Score: ${(validationReport.overallScore * 100).toFixed(1)}%`);
        report.push(`Quality Level: ${validationReport.qualityLevel.toUpperCase()}`);
        report.push(`Status: ${validationReport.valid ? 'VALID' : 'INVALID'}`);
        report.push('');

        // Section scores
        report.push('## Section Scores');
        for (const [section, data] of Object.entries(validationReport.sections)) {
            const score = data.score ? (data.score * 100).toFixed(1) : 'N/A';
            const status = data.valid ? '✓' : '✗';
            report.push(`- ${section}: ${score}% ${status}`);
        }
        report.push('');

        // Errors
        if (validationReport.errors.length > 0) {
            report.push('## Errors');
            validationReport.errors.forEach(error => {
                report.push(`- ❌ ${error}`);
            });
            report.push('');
        }

        // Warnings
        if (validationReport.warnings.length > 0) {
            report.push('## Warnings');
            validationReport.warnings.forEach(warning => {
                report.push(`- ⚠️ ${warning}`);
            });
            report.push('');
        }

        // Recommendations
        if (validationReport.recommendations.length > 0) {
            report.push('## Recommendations');
            validationReport.recommendations.forEach(rec => {
                report.push(`- 💡 ${rec}`);
            });
            report.push('');
        }

        return report.join('\n');
    }

    /**
     * Get validation history
     * @returns {Array} Array of validation history entries
     */
    getValidationHistory() {
        return [...this.validationHistory];
    }

    /**
     * Clear validation history
     */
    clearValidationHistory() {
        this.validationHistory = [];
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AcademicSourceValidator;
} else if (typeof window !== 'undefined') {
    window.AcademicSourceValidator = AcademicSourceValidator;
}