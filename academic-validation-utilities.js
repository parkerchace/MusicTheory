/**
 * @module AcademicValidationUtilities
 * @description Comprehensive utilities for academic source validation and documentation
 * @exports class AcademicValidationUtilities
 * @feature Citation format validation
 * @feature Bulk source accessibility checking
 * @feature 12-TET approximation documentation validation
 * @feature Academic source documentation guidelines
 */

class AcademicValidationUtilities {
    constructor() {
        this.citationFormats = {
            journal_article: {
                required: ['title', 'authors', 'journal', 'year', 'volume', 'pages'],
                recommended: ['issue', 'doi', 'url'],
                optional: ['abstract', 'keywords']
            },
            book: {
                required: ['title', 'authors', 'publisher', 'year'],
                recommended: ['isbn', 'pages', 'url'],
                optional: ['edition', 'city']
            },
            conference_paper: {
                required: ['title', 'authors', 'conference', 'year'],
                recommended: ['pages', 'location', 'url'],
                optional: ['doi', 'proceedings']
            },
            ethnomusicological_study: {
                required: ['title', 'authors', 'year', 'culturalGroup', 'region'],
                recommended: ['journal', 'fieldworkDates', 'methodology'],
                optional: ['recordings', 'interviews']
            }
        };

        this.academicDomains = [
            'jstor.org', 'doi.org', 'academia.edu', 'researchgate.net',
            'springer.com', 'cambridge.org', 'oxford.com', 'tandfonline.com',
            'sage.com', 'wiley.com', 'elsevier.com', 'mit.edu', 'harvard.edu',
            'yale.edu', 'stanford.edu', 'berkeley.edu', 'princeton.edu'
        ];

        this.academicTLDs = ['.edu', '.ac.'];
        
        this.approximationMethodologies = [
            'equal_temperament_12tet',
            'just_intonation_approximation',
            'pythagorean_tuning_approximation',
            'meantone_temperament_approximation'
        ];
    }

    /**
     * Validate citation format according to academic standards
     * @param {Object} citation - Citation object to validate
     * @param {string} expectedType - Expected citation type
     * @returns {Object} Validation result with detailed feedback
     */
    validateCitationFormat(citation, expectedType = null) {
        if (!citation || typeof citation !== 'object') {
            return {
                valid: false,
                errors: ['Citation must be a valid object'],
                warnings: [],
                completeness: 0
            };
        }

        const type = expectedType || citation.type || 'journal_article';
        const format = this.citationFormats[type];
        
        if (!format) {
            return {
                valid: false,
                errors: [`Unknown citation type: ${type}`],
                warnings: [],
                completeness: 0
            };
        }

        const errors = [];
        const warnings = [];
        let score = 0;
        const totalPossible = format.required.length + format.recommended.length;

        // Check required fields
        for (const field of format.required) {
            if (!citation[field] || 
                (Array.isArray(citation[field]) && citation[field].length === 0) ||
                (typeof citation[field] === 'string' && citation[field].trim().length === 0)) {
                errors.push(`Missing required field: ${field}`);
            } else {
                score++;
            }
        }

        // Check recommended fields
        for (const field of format.recommended) {
            if (!citation[field] || 
                (typeof citation[field] === 'string' && citation[field].trim().length === 0)) {
                warnings.push(`Missing recommended field: ${field}`);
            } else {
                score++;
            }
        }

        // Validate specific field formats
        const fieldValidation = this.validateSpecificFields(citation, type);
        errors.push(...fieldValidation.errors);
        warnings.push(...fieldValidation.warnings);

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            completeness: totalPossible > 0 ? score / totalPossible : 0,
            type: type,
            hasRequiredFields: format.required.every(field => 
                citation[field] && 
                !(Array.isArray(citation[field]) && citation[field].length === 0) &&
                !(typeof citation[field] === 'string' && citation[field].trim().length === 0)
            )
        };
    }

    /**
     * Validate specific field formats (URLs, years, etc.)
     * @param {Object} citation - Citation object
     * @param {string} type - Citation type
     * @returns {Object} Field-specific validation results
     */
    validateSpecificFields(citation, type) {
        const errors = [];
        const warnings = [];

        // Validate year
        if (citation.year) {
            const year = parseInt(citation.year);
            const currentYear = new Date().getFullYear();
            if (isNaN(year) || year < 1800 || year > currentYear + 1) {
                errors.push(`Invalid year: ${citation.year}. Must be between 1800 and ${currentYear + 1}`);
            }
        }

        // Validate URL format
        if (citation.url) {
            try {
                const url = new URL(citation.url);
                if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                    errors.push(`Invalid URL protocol: ${url.protocol}. Only HTTP and HTTPS allowed`);
                }
                
                // Check if it's a Wikipedia source (not allowed)
                if (url.hostname.includes('wikipedia.org')) {
                    errors.push('Wikipedia sources are not acceptable for academic citations');
                }
                
                // Check for academic domain
                const isAcademic = this.isAcademicDomain(url.hostname);
                if (!isAcademic.isAcademic) {
                    warnings.push(`URL domain may not be from a recognized academic source: ${url.hostname}`);
                }
            } catch (error) {
                errors.push(`Invalid URL format: ${citation.url}`);
            }
        }

        // Validate DOI format
        if (citation.doi) {
            const doiPattern = /^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/;
            if (!doiPattern.test(citation.doi)) {
                errors.push(`Invalid DOI format: ${citation.doi}`);
            }
        }

        // Validate ISBN format (for books)
        if (type === 'book' && citation.isbn) {
            const isbnPattern = /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/;
            if (!isbnPattern.test(citation.isbn.replace(/[- ]/g, ''))) {
                errors.push(`Invalid ISBN format: ${citation.isbn}`);
            }
        }

        // Validate authors array
        if (citation.authors) {
            if (!Array.isArray(citation.authors)) {
                errors.push('Authors field must be an array');
            } else if (citation.authors.length === 0) {
                errors.push('Authors array cannot be empty');
            } else {
                citation.authors.forEach((author, index) => {
                    if (typeof author !== 'string' || author.trim().length === 0) {
                        errors.push(`Author ${index + 1} must be a non-empty string`);
                    }
                });
            }
        }

        return { errors, warnings };
    }

    /**
     * Check if domain is from a recognized academic institution
     * @param {string} hostname - Domain hostname
     * @returns {Object} Academic domain validation result
     */
    isAcademicDomain(hostname) {
        const isAcademicTLD = this.academicTLDs.some(tld => hostname.includes(tld));
        const isKnownAcademicDomain = this.academicDomains.some(domain => 
            hostname.includes(domain) || hostname.endsWith(domain)
        );

        return {
            isAcademic: isAcademicTLD || isKnownAcademicDomain,
            type: isAcademicTLD ? 'academic_institution' : 
                  isKnownAcademicDomain ? 'academic_publisher' : 'unknown',
            confidence: isAcademicTLD ? 'high' : isKnownAcademicDomain ? 'medium' : 'low'
        };
    }

    /**
     * Perform bulk accessibility checking for multiple URLs
     * @param {Array} urls - Array of URLs to check
     * @param {Object} options - Checking options
     * @returns {Promise<Object>} Bulk accessibility results
     */
    async bulkAccessibilityCheck(urls, options = {}) {
        const {
            timeout = 5000,
            retries = 2,
            batchSize = 10
        } = options;

        if (!Array.isArray(urls)) {
            throw new Error('URLs must be provided as an array');
        }

        const results = {
            totalChecked: urls.length,
            accessible: [],
            inaccessible: [],
            unknown: [],
            errors: [],
            summary: {
                accessibleCount: 0,
                inaccessibleCount: 0,
                unknownCount: 0,
                errorCount: 0,
                averageResponseTime: 0
            },
            checkedAt: new Date().toISOString()
        };

        // Process URLs in batches to avoid overwhelming servers
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchPromises = batch.map(async (url, batchIndex) => {
                const globalIndex = i + batchIndex;
                const startTime = Date.now();
                
                try {
                    const result = await this.checkSingleUrlAccessibility(url, { timeout, retries });
                    const responseTime = Date.now() - startTime;
                    
                    const urlResult = {
                        url,
                        index: globalIndex,
                        result,
                        responseTime,
                        checkedAt: new Date().toISOString()
                    };

                    if (result.accessible === true) {
                        results.accessible.push(urlResult);
                        results.summary.accessibleCount++;
                    } else if (result.accessible === false) {
                        results.inaccessible.push(urlResult);
                        results.summary.inaccessibleCount++;
                    } else {
                        results.unknown.push(urlResult);
                        results.summary.unknownCount++;
                    }
                    
                    return responseTime;
                } catch (error) {
                    const errorResult = {
                        url,
                        index: globalIndex,
                        error: error.message,
                        checkedAt: new Date().toISOString()
                    };
                    results.errors.push(errorResult);
                    results.summary.errorCount++;
                    return 0;
                }
            });

            const batchResponseTimes = await Promise.all(batchPromises);
            
            // Add small delay between batches to be respectful to servers
            if (i + batchSize < urls.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Calculate average response time
        const totalResponseTime = [
            ...results.accessible,
            ...results.inaccessible,
            ...results.unknown
        ].reduce((sum, result) => sum + (result.responseTime || 0), 0);
        
        const successfulChecks = results.summary.accessibleCount + 
                               results.summary.inaccessibleCount + 
                               results.summary.unknownCount;
        
        results.summary.averageResponseTime = successfulChecks > 0 ? 
            Math.round(totalResponseTime / successfulChecks) : 0;

        return results;
    }

    /**
     * Check accessibility of a single URL
     * @param {string} url - URL to check
     * @param {Object} options - Checking options
     * @returns {Promise<Object>} Accessibility result
     */
    async checkSingleUrlAccessibility(url, options = {}) {
        const { timeout = 5000, retries = 2 } = options;
        
        try {
            const urlObj = new URL(url);
            
            // Basic validation
            if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
                return {
                    accessible: false,
                    reason: 'Invalid protocol. Only HTTP and HTTPS are supported.',
                    validFormat: false
                };
            }

            // Check for local/private addresses
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

            // In browser environment, we can't make direct HTTP requests due to CORS
            // This is a simplified check that validates URL structure
            return {
                accessible: null, // Cannot determine due to CORS restrictions
                reason: 'URL format is valid. Server-side verification required for actual accessibility.',
                validFormat: true,
                corsLimited: true,
                academicDomain: this.isAcademicDomain(urlObj.hostname)
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
     * Validate 12-TET approximation documentation
     * @param {Object} approximationDoc - Approximation documentation object
     * @returns {Object} Validation result
     */
    validate12TETApproximationDocumentation(approximationDoc) {
        if (!approximationDoc || typeof approximationDoc !== 'object') {
            return {
                valid: false,
                errors: ['Approximation documentation must be a valid object'],
                warnings: [],
                completeness: 0
            };
        }

        const requiredFields = [
            'original',
            'approximationMethod', 
            'orchestralInstruments',
            'limitations',
            'pedagogicalNotes'
        ];

        const errors = [];
        const warnings = [];
        let score = 0;

        // Check required fields
        for (const field of requiredFields) {
            if (!approximationDoc[field] || 
                (typeof approximationDoc[field] === 'string' && approximationDoc[field].trim().length === 0)) {
                errors.push(`Missing required field: ${field}`);
            } else {
                score++;
            }
        }

        // Validate approximation method
        if (approximationDoc.approximationMethod) {
            const method = approximationDoc.approximationMethod.toLowerCase();
            const validMethods = this.approximationMethodologies.map(m => m.toLowerCase());
            
            if (!validMethods.some(validMethod => method.includes(validMethod.replace(/_/g, ' ')))) {
                warnings.push(`Approximation method may not be a recognized standard: ${approximationDoc.approximationMethod}`);
            }
        }

        // Validate orchestral instruments field
        if (approximationDoc.orchestralInstruments) {
            const instruments = approximationDoc.orchestralInstruments.toLowerCase();
            const expectedInstruments = ['violin', 'viola', 'cello', 'bass', 'wind', 'brass'];
            const missingInstruments = expectedInstruments.filter(inst => !instruments.includes(inst));
            
            if (missingInstruments.length > 0) {
                warnings.push(`Consider mentioning compatibility with: ${missingInstruments.join(', ')}`);
            }
        }

        // Validate limitations field
        if (approximationDoc.limitations) {
            const limitations = approximationDoc.limitations.toLowerCase();
            if (!limitations.includes('microtonal') && !limitations.includes('interval') && !limitations.includes('tuning')) {
                warnings.push('Limitations should address microtonal or tuning approximation issues');
            }
        }

        // Validate pedagogical notes
        if (approximationDoc.pedagogicalNotes) {
            const notes = approximationDoc.pedagogicalNotes.toLowerCase();
            if (!notes.includes('school') && !notes.includes('student') && !notes.includes('education')) {
                warnings.push('Pedagogical notes should address educational context');
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            completeness: score / requiredFields.length,
            hasAllRequiredFields: errors.length === 0
        };
    }

    /**
     * Generate documentation template for adding new regional scales
     * @param {string} scaleType - Type of scale (e.g., 'south_american', 'african')
     * @returns {Object} Documentation template
     */
    generateRegionalScaleTemplate(scaleType = 'regional') {
        return {
            scaleId: `${scaleType}_scale_name`,
            intervals: [0, 2, 4, 5, 7, 9, 11], // Example intervals - replace with actual
            description: `Traditional scale from [REGION], used by [CULTURAL_GROUP] during [HISTORICAL_PERIOD]. Primary function: [MUSICAL_FUNCTION].`,
            culturalContext: {
                region: "[Specific geographic region]",
                culturalGroup: "[Specific cultural or ethnic group]",
                historicalPeriod: "[Time period of documented use]",
                musicalFunction: "[Traditional musical context and purpose]"
            },
            tuningSystem: {
                original: "[Description of traditional tuning system]",
                approximationMethod: "12-TET intervals for orchestral compatibility",
                orchestralInstruments: "Compatible with violin, viola, cello, bass, winds, and brass",
                limitations: "[Specific limitations of 12-TET approximation]",
                pedagogicalNotes: "Suitable for high school orchestra use with cultural context"
            },
            references: [
                {
                    type: "journal_article",
                    title: "[Article title]",
                    authors: ["[Author 1]", "[Author 2]"],
                    journal: "[Journal name]",
                    year: 2020,
                    volume: "[Volume]",
                    issue: "[Issue]",
                    pages: "[Page range]",
                    doi: "[DOI if available]",
                    url: "[Accessible URL]"
                },
                {
                    type: "book",
                    title: "[Book title]",
                    authors: ["[Author]"],
                    publisher: "[Publisher]",
                    year: 2019,
                    isbn: "[ISBN]",
                    pages: "[Relevant page range]",
                    url: "[Publisher or library URL]"
                }
            ],
            alternativeSources: [
                // Backup sources in case primary sources become inaccessible
            ]
        };
    }

    /**
     * Generate guidelines for 12-TET approximation methodology
     * @returns {Object} Comprehensive guidelines
     */
    generate12TETApproximationGuidelines() {
        return {
            title: "Guidelines for 12-TET Approximation Methodology Documentation",
            overview: "When documenting traditional scales that use non-12-TET tuning systems, proper methodology documentation ensures academic rigor while maintaining orchestral compatibility for high school music programs.",
            
            requiredDocumentation: {
                original: {
                    description: "Document the traditional tuning system",
                    requirements: [
                        "Describe the original tuning intervals in cents or ratios",
                        "Reference the cultural context of the tuning system",
                        "Cite ethnomusicological sources for the traditional tuning"
                    ],
                    example: "Traditional mbira tuning uses just intonation ratios with intervals varying by region and instrument maker"
                },
                
                approximationMethod: {
                    description: "Explain the methodology used for 12-TET conversion",
                    requirements: [
                        "Specify which 12-TET intervals were chosen",
                        "Justify the approximation choices made",
                        "Reference academic sources for the approximation methodology"
                    ],
                    example: "12-TET intervals selected based on closest semitone approximations to traditional just intonation ratios, following methodology established by Kubik (1985)"
                },
                
                orchestralInstruments: {
                    description: "Specify compatibility with standard orchestral instruments",
                    requirements: [
                        "List compatible instrument families",
                        "Address any instrument-specific considerations",
                        "Confirm suitability for high school orchestra programs"
                    ],
                    example: "Compatible with violin, viola, cello, bass, winds, and brass instruments used in standard high school orchestra programs"
                },
                
                limitations: {
                    description: "Acknowledge limitations of the approximation",
                    requirements: [
                        "Identify specific microtonal elements lost in approximation",
                        "Quantify the degree of approximation where possible",
                        "Reference scholarly discussion of approximation trade-offs"
                    ],
                    example: "Traditional microtonal inflections approximated to nearest semitone, losing subtle pitch variations that are culturally significant in traditional performance practice"
                },
                
                pedagogicalNotes: {
                    description: "Provide educational context for instructors",
                    requirements: [
                        "Address appropriate educational level",
                        "Suggest cultural context to include in instruction",
                        "Recommend additional resources for cultural understanding"
                    ],
                    example: "Suitable for high school orchestra use when accompanied by cultural context about traditional performance practices and the significance of the original tuning system"
                }
            },
            
            bestPractices: [
                "Always cite primary ethnomusicological sources",
                "Acknowledge the cultural significance of traditional tuning systems",
                "Be transparent about approximation limitations",
                "Provide alternative sources for redundancy",
                "Include page numbers and specific sections in citations",
                "Validate all URLs for accessibility before publication"
            ],
            
            commonMistakes: [
                "Failing to cite the original tuning system",
                "Not acknowledging approximation limitations",
                "Using Wikipedia as a primary source",
                "Omitting cultural context and significance",
                "Not providing accessible alternative sources",
                "Incomplete bibliographic information"
            ]
        };
    }

    /**
     * Validate complete scale documentation package
     * @param {Object} scalePackage - Complete scale documentation
     * @returns {Object} Comprehensive validation result
     */
    validateCompleteScaleDocumentation(scalePackage) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            sections: {},
            overallScore: 0
        };

        // Validate basic structure
        if (!scalePackage.scaleId) {
            results.errors.push('Missing scale identifier');
            results.valid = false;
        }

        if (!scalePackage.intervals || !Array.isArray(scalePackage.intervals)) {
            results.errors.push('Missing or invalid intervals array');
            results.valid = false;
        }

        // Validate cultural context
        if (scalePackage.culturalContext) {
            const contextValidation = this.validateCulturalContext(scalePackage.culturalContext);
            results.sections.culturalContext = contextValidation;
            if (!contextValidation.valid) {
                results.valid = false;
            }
        } else {
            results.errors.push('Missing cultural context');
            results.valid = false;
        }

        // Validate tuning system documentation
        if (scalePackage.tuningSystem) {
            const tuningValidation = this.validate12TETApproximationDocumentation(scalePackage.tuningSystem);
            results.sections.tuningSystem = tuningValidation;
            if (!tuningValidation.valid) {
                results.valid = false;
            }
        } else {
            results.errors.push('Missing tuning system documentation');
            results.valid = false;
        }

        // Validate references
        if (scalePackage.references && Array.isArray(scalePackage.references)) {
            const referencesValidation = this.validateReferencesArray(scalePackage.references);
            results.sections.references = referencesValidation;
            if (!referencesValidation.valid) {
                results.valid = false;
            }
        } else {
            results.errors.push('Missing or invalid references array');
            results.valid = false;
        }

        // Calculate overall score
        const sectionScores = Object.values(results.sections)
            .map(section => section.completeness || 0);
        results.overallScore = sectionScores.length > 0 ? 
            sectionScores.reduce((sum, score) => sum + score, 0) / sectionScores.length : 0;

        return results;
    }

    /**
     * Validate cultural context section
     * @param {Object} culturalContext - Cultural context object
     * @returns {Object} Validation result
     */
    validateCulturalContext(culturalContext) {
        const requiredFields = ['region', 'culturalGroup', 'historicalPeriod', 'musicalFunction'];
        const errors = [];
        let score = 0;

        for (const field of requiredFields) {
            if (!culturalContext[field] || culturalContext[field].trim().length === 0) {
                errors.push(`Missing required cultural context field: ${field}`);
            } else {
                score++;
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            completeness: score / requiredFields.length
        };
    }

    /**
     * Validate array of references
     * @param {Array} references - Array of reference objects
     * @returns {Object} Validation result
     */
    validateReferencesArray(references) {
        if (!Array.isArray(references) || references.length === 0) {
            return {
                valid: false,
                errors: ['References must be a non-empty array'],
                completeness: 0
            };
        }

        const errors = [];
        const warnings = [];
        let totalScore = 0;

        references.forEach((ref, index) => {
            const refValidation = this.validateCitationFormat(ref);
            if (!refValidation.valid) {
                errors.push(`Reference ${index + 1}: ${refValidation.errors.join(', ')}`);
            }
            warnings.push(...refValidation.warnings.map(w => `Reference ${index + 1}: ${w}`));
            totalScore += refValidation.completeness;
        });

        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            completeness: references.length > 0 ? totalScore / references.length : 0
        };
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AcademicValidationUtilities;
} else if (typeof window !== 'undefined') {
    window.AcademicValidationUtilities = AcademicValidationUtilities;
}