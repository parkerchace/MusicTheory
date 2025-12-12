/**
 * @module AttributionVerifier
 * @description Verifies author and publication attribution accuracy for scale references
 * @exports class AttributionVerifier
 * @feature Author information extraction from webpages
 * @feature Publication title and source verification
 * @feature Citation format handling and metadata analysis
 */

// Import ContentAnalyzer for webpage content extraction
let ContentAnalyzer;
if (typeof require !== 'undefined') {
    try {
        ContentAnalyzer = require('./content-analyzer.js');
    } catch (e) {
        // ContentAnalyzer not available, will use fallback methods
    }
} else if (typeof window !== 'undefined') {
    if (window.ContentAnalyzer) ContentAnalyzer = window.ContentAnalyzer;
}

class AttributionVerifier {
    constructor(options = {}) {
        this.timeout = options.timeout || 10000;
        this.retries = options.retries || 2;
        
        // Initialize content analyzer for webpage parsing
        if (ContentAnalyzer) {
            this.contentAnalyzer = new ContentAnalyzer({
                minRelevanceScore: 0.1 // Lower threshold for attribution verification
            });
        } else {
            this.contentAnalyzer = null;
            console.warn('ContentAnalyzer not available - using fallback attribution methods');
        }
        
        // Common author name patterns and variations
        this.authorPatterns = this.initializeAuthorPatterns();
        
        // Publication title patterns and indicators
        this.publicationPatterns = this.initializePublicationPatterns();
        
        // Academic and educational domain indicators
        this.trustedDomains = this.initializeTrustedDomains();
    }

    /**
     * Initialize author name detection patterns
     * @returns {Object} Author detection patterns and methods
     */
    initializeAuthorPatterns() {
        return {
            // Common author metadata selectors
            metaSelectors: [
                'meta[name="author"]',
                'meta[name="dc.creator"]',
                'meta[name="citation_author"]',
                'meta[property="article:author"]',
                'meta[name="twitter:creator"]'
            ],
            
            // HTML elements that commonly contain author information
            authorElements: [
                '.author', '.byline', '.by-author', '.article-author',
                '.post-author', '.writer', '.contributor', '.creator',
                '[rel="author"]', '.author-name', '.author-info'
            ],
            
            // Text patterns that indicate author information
            textPatterns: [
                /by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/gi,
                /author[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/gi,
                /written\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/gi,
                /created\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/gi,
                /©\s*\d{4}\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)/gi
            ],
            
            // Academic citation patterns
            academicPatterns: [
                /([A-Z][a-z]+,\s*[A-Z]\.(?:\s*[A-Z]\.)*)/g, // Last, F. M.
                /([A-Z][a-z]+\s+et\s+al\.)/gi, // Author et al.
                /([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*)\s*\(\d{4}\)/g // Author (Year)
            ]
        };
    }

    /**
     * Initialize publication title detection patterns
     * @returns {Object} Publication detection patterns and methods
     */
    initializePublicationPatterns() {
        return {
            // Title meta tags
            titleSelectors: [
                'title',
                'meta[property="og:title"]',
                'meta[name="twitter:title"]',
                'meta[name="dc.title"]',
                'meta[name="citation_title"]',
                'h1', '.title', '.article-title', '.post-title'
            ],
            
            // Publication/journal indicators
            publicationSelectors: [
                'meta[name="citation_journal_title"]',
                'meta[name="citation_conference_title"]',
                'meta[name="dc.source"]',
                '.journal-title', '.publication', '.source'
            ],
            
            // Academic publication patterns
            journalPatterns: [
                /Journal\s+of\s+[A-Z][a-z\s]+/gi,
                /Proceedings\s+of\s+[A-Z][a-z\s]+/gi,
                /Annals\s+of\s+[A-Z][a-z\s]+/gi,
                /Review\s+of\s+[A-Z][a-z\s]+/gi,
                /Studies\s+in\s+[A-Z][a-z\s]+/gi
            ],
            
            // Publisher indicators
            publisherPatterns: [
                /Published\s+by\s+([A-Z][a-z\s]+)/gi,
                /©\s*\d{4}\s+([A-Z][a-z\s]+(?:Press|Publications|University))/gi,
                /(University\s+Press|Academic\s+Press|MIT\s+Press)/gi
            ]
        };
    }

    /**
     * Initialize trusted domain patterns for attribution verification
     * @returns {Object} Trusted domain categories and patterns
     */
    initializeTrustedDomains() {
        return {
            academic: [
                '.edu', '.ac.uk', '.ac.au', '.edu.au',
                'jstor.org', 'cambridge.org', 'oxford.com',
                'springer.com', 'wiley.com', 'elsevier.com',
                'mit.edu', 'harvard.edu', 'stanford.edu'
            ],
            
            musicTheory: [
                'musictheory.net', 'tenuto.com', 'teoria.com',
                'dolmetsch.com', 'good-ear.com', 'musicca.com',
                'classicfm.com', 'allmusic.com'
            ],
            
            cultural: [
                'smithsonian.edu', 'loc.gov', 'britannica.com',
                'ethnomusicology.org', 'worldmusiccentral.org'
            ],
            
            publishers: [
                'schirmer.com', 'halleonard.com', 'melbay.com',
                'alfredmusic.com', 'boosey.com', 'henle.de'
            ]
        };
    }

    /**
     * Verify attribution accuracy for a single reference
     * @param {Object} reference - Reference object with claimed attribution
     * @param {string} url - URL to verify against
     * @param {string} htmlContent - Optional pre-fetched HTML content
     * @returns {Promise<Object>} Attribution verification result
     */
    async verifyAttribution(reference, url, htmlContent = null) {
        const result = {
            url,
            reference,
            attributionAccurate: null,
            confidence: 0,
            issues: [],
            extractedMetadata: {},
            verificationDetails: {},
            verifiedAt: new Date().toISOString()
        };

        try {
            // Extract content if not provided
            let content = htmlContent;
            if (!content && this.contentAnalyzer) {
                // In a real implementation, this would fetch the URL content
                // For now, we'll work with the assumption that content is provided
                result.issues.push('Content fetching not implemented - requires server-side implementation');
                result.attributionAccurate = null;
                result.confidence = 0;
                return result;
            }

            if (!content) {
                result.issues.push('No content available for attribution verification');
                result.attributionAccurate = false;
                result.confidence = 0;
                return result;
            }

            // Extract metadata from webpage
            const extractedMetadata = await this.extractAttributionMetadata(content, url);
            result.extractedMetadata = extractedMetadata;

            // Verify author attribution if claimed
            if (reference.authors && Array.isArray(reference.authors)) {
                const authorVerification = this.verifyAuthors(reference.authors, extractedMetadata);
                result.verificationDetails.authors = authorVerification;
            }

            // Verify title attribution if claimed
            if (reference.title) {
                const titleVerification = this.verifyTitle(reference.title, extractedMetadata);
                result.verificationDetails.title = titleVerification;
            }

            // Verify publication/journal if claimed
            if (reference.journal || reference.publisher) {
                const publicationVerification = this.verifyPublication(reference, extractedMetadata);
                result.verificationDetails.publication = publicationVerification;
            }

            // Verify DOI if claimed
            if (reference.doi) {
                const doiVerification = this.verifyDOI(reference.doi, extractedMetadata, url);
                result.verificationDetails.doi = doiVerification;
            }

            // Calculate overall attribution accuracy
            const accuracyAssessment = this.calculateAttributionAccuracy(result.verificationDetails);
            result.attributionAccurate = accuracyAssessment.accurate;
            result.confidence = accuracyAssessment.confidence;
            result.issues = [...result.issues, ...accuracyAssessment.issues];

        } catch (error) {
            result.attributionAccurate = false;
            result.confidence = 0;
            result.issues.push(`Attribution verification error: ${error.message}`);
        }

        return result;
    }

    /**
     * Extract attribution metadata from webpage content
     * @param {string} htmlContent - HTML content to analyze
     * @param {string} url - Source URL for context
     * @returns {Promise<Object>} Extracted attribution metadata
     */
    async extractAttributionMetadata(htmlContent, url) {
        const metadata = {
            authors: [],
            title: '',
            publication: '',
            publisher: '',
            year: null,
            doi: '',
            domain: '',
            domainType: '',
            extractionMethod: 'html_parsing',
            extractedAt: new Date().toISOString()
        };

        try {
            // Extract domain information
            const urlObj = new URL(url);
            metadata.domain = urlObj.hostname;
            metadata.domainType = this.classifyDomain(urlObj.hostname);

            // Use content analyzer if available for better HTML parsing
            if (this.contentAnalyzer) {
                const extractedContent = this.contentAnalyzer.extractTextContent(htmlContent);
                metadata.extractionMetadata = extractedContent.metadata;
                metadata.title = extractedContent.title;
            }

            // Extract authors using multiple methods
            metadata.authors = this.extractAuthors(htmlContent);

            // Extract title if not already found
            if (!metadata.title) {
                metadata.title = this.extractTitle(htmlContent);
            }

            // Extract publication information
            metadata.publication = this.extractPublication(htmlContent);
            metadata.publisher = this.extractPublisher(htmlContent);

            // Extract year
            metadata.year = this.extractYear(htmlContent);

            // Extract DOI
            metadata.doi = this.extractDOI(htmlContent);

        } catch (error) {
            metadata.error = error.message;
        }

        return metadata;
    }

    /**
     * Extract author information from HTML content
     * @param {string} htmlContent - HTML content to parse
     * @returns {Array} Array of extracted author names
     */
    extractAuthors(htmlContent) {
        const authors = new Set();

        try {
            // Method 1: Meta tags (most reliable)
            const metaAuthors = this.extractAuthorsFromMeta(htmlContent);
            metaAuthors.forEach(author => authors.add(author));

            // Method 2: Structured data (JSON-LD, microdata)
            const structuredAuthors = this.extractAuthorsFromStructuredData(htmlContent);
            structuredAuthors.forEach(author => authors.add(author));

            // Method 3: HTML elements with author classes/IDs
            const elementAuthors = this.extractAuthorsFromElements(htmlContent);
            elementAuthors.forEach(author => authors.add(author));

            // Method 4: Text pattern matching (least reliable)
            const patternAuthors = this.extractAuthorsFromPatterns(htmlContent);
            patternAuthors.forEach(author => authors.add(author));

        } catch (error) {
            console.warn('Error extracting authors:', error.message);
        }

        return Array.from(authors).filter(author => 
            author && 
            author.length > 2 && 
            author.length < 100 &&
            /^[A-Z]/.test(author) // Must start with capital letter
        );
    }

    /**
     * Extract authors from meta tags
     * @param {string} htmlContent - HTML content
     * @returns {Array} Extracted author names
     */
    extractAuthorsFromMeta(htmlContent) {
        const authors = [];
        
        for (const selector of this.authorPatterns.metaSelectors) {
            const pattern = new RegExp(`<meta[^>]*name=["']${selector.replace('meta[name="', '').replace('"]', '')}["'][^>]*content=["']([^"']+)["']`, 'gi');
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                const authorContent = match[1];
                if (authorContent && authorContent.trim()) {
                    // Handle multiple authors separated by common delimiters
                    const splitAuthors = authorContent.split(/[,;]|and\s+|\s+&\s+/).map(a => a.trim());
                    authors.push(...splitAuthors);
                }
            }
        }

        return authors;
    }

    /**
     * Extract authors from structured data (JSON-LD, microdata)
     * @param {string} htmlContent - HTML content
     * @returns {Array} Extracted author names
     */
    extractAuthorsFromStructuredData(htmlContent) {
        const authors = [];

        try {
            // Extract JSON-LD structured data
            const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
            let match;
            while ((match = jsonLdPattern.exec(htmlContent)) !== null) {
                try {
                    const jsonData = JSON.parse(match[1]);
                    const extractedAuthors = this.extractAuthorsFromJsonLd(jsonData);
                    authors.push(...extractedAuthors);
                } catch (e) {
                    // Invalid JSON, skip
                }
            }

            // Extract microdata authors
            const microdataPattern = /<[^>]*itemprop=["']author["'][^>]*>([^<]+)</gi;
            while ((match = microdataPattern.exec(htmlContent)) !== null) {
                if (match[1] && match[1].trim()) {
                    authors.push(match[1].trim());
                }
            }

        } catch (error) {
            console.warn('Error extracting structured data authors:', error.message);
        }

        return authors;
    }

    /**
     * Extract authors from JSON-LD structured data
     * @param {Object} jsonData - Parsed JSON-LD data
     * @returns {Array} Extracted author names
     */
    extractAuthorsFromJsonLd(jsonData) {
        const authors = [];

        try {
            if (jsonData.author) {
                if (Array.isArray(jsonData.author)) {
                    for (const author of jsonData.author) {
                        if (typeof author === 'string') {
                            authors.push(author);
                        } else if (author.name) {
                            authors.push(author.name);
                        }
                    }
                } else if (typeof jsonData.author === 'string') {
                    authors.push(jsonData.author);
                } else if (jsonData.author.name) {
                    authors.push(jsonData.author.name);
                }
            }

            // Handle nested structures
            if (jsonData['@graph']) {
                for (const item of jsonData['@graph']) {
                    const nestedAuthors = this.extractAuthorsFromJsonLd(item);
                    authors.push(...nestedAuthors);
                }
            }

        } catch (error) {
            console.warn('Error parsing JSON-LD authors:', error.message);
        }

        return authors;
    }

    /**
     * Extract authors from HTML elements
     * @param {string} htmlContent - HTML content
     * @returns {Array} Extracted author names
     */
    extractAuthorsFromElements(htmlContent) {
        const authors = [];

        for (const selector of this.authorPatterns.authorElements) {
            // Convert CSS selector to regex pattern
            const className = selector.replace(/^\./, '').replace(/[\[\]]/g, '');
            const pattern = new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([^<]+)</`, 'gi');
            
            let match;
            while ((match = pattern.exec(htmlContent)) !== null) {
                if (match[1] && match[1].trim()) {
                    const authorText = match[1].trim();
                    // Clean up common prefixes
                    const cleanAuthor = authorText.replace(/^(by|author|written by|created by):\s*/i, '');
                    if (cleanAuthor && cleanAuthor !== authorText) {
                        authors.push(cleanAuthor);
                    } else {
                        authors.push(authorText);
                    }
                }
            }
        }

        return authors;
    }

    /**
     * Extract authors using text pattern matching
     * @param {string} htmlContent - HTML content
     * @returns {Array} Extracted author names
     */
    extractAuthorsFromPatterns(htmlContent) {
        const authors = [];

        // Remove HTML tags for text analysis
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

        for (const pattern of this.authorPatterns.textPatterns) {
            let match;
            while ((match = pattern.exec(textContent)) !== null) {
                if (match[1] && match[1].trim()) {
                    authors.push(match[1].trim());
                }
            }
        }

        // Academic citation patterns
        for (const pattern of this.authorPatterns.academicPatterns) {
            let match;
            while ((match = pattern.exec(textContent)) !== null) {
                if (match[1] && match[1].trim()) {
                    authors.push(match[1].trim());
                }
            }
        }

        return authors;
    }

    /**
     * Extract title from HTML content
     * @param {string} htmlContent - HTML content
     * @returns {string} Extracted title
     */
    extractTitle(htmlContent) {
        // Try title tag first
        const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)</i);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1].trim();
        }

        // Try meta tags
        const metaTitlePatterns = [
            /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
            /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
            /<meta[^>]*name=["']dc\.title["'][^>]*content=["']([^"']+)["']/i
        ];

        for (const pattern of metaTitlePatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        // Try h1 tags
        const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)</i);
        if (h1Match && h1Match[1]) {
            return h1Match[1].trim();
        }

        return '';
    }

    /**
     * Extract publication information
     * @param {string} htmlContent - HTML content
     * @returns {string} Extracted publication name
     */
    extractPublication(htmlContent) {
        // Try citation meta tags first
        const citationPatterns = [
            /<meta[^>]*name=["']citation_journal_title["'][^>]*content=["']([^"']+)["']/i,
            /<meta[^>]*name=["']citation_conference_title["'][^>]*content=["']([^"']+)["']/i,
            /<meta[^>]*name=["']dc\.source["'][^>]*content=["']([^"']+)["']/i
        ];

        for (const pattern of citationPatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        // Try text patterns
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        for (const pattern of this.publicationPatterns.journalPatterns) {
            const match = textContent.match(pattern);
            if (match && match[0]) {
                return match[0].trim();
            }
        }

        return '';
    }

    /**
     * Extract publisher information
     * @param {string} htmlContent - HTML content
     * @returns {string} Extracted publisher name
     */
    extractPublisher(htmlContent) {
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        
        for (const pattern of this.publicationPatterns.publisherPatterns) {
            const match = textContent.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return '';
    }

    /**
     * Extract publication year
     * @param {string} htmlContent - HTML content
     * @returns {number|null} Extracted year
     */
    extractYear(htmlContent) {
        // Try citation meta tags
        const citationYearMatch = htmlContent.match(/<meta[^>]*name=["']citation_publication_date["'][^>]*content=["']([^"']+)["']/i);
        if (citationYearMatch && citationYearMatch[1]) {
            const yearMatch = citationYearMatch[1].match(/(\d{4})/);
            if (yearMatch) {
                return parseInt(yearMatch[1]);
            }
        }

        // Try copyright patterns
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ');
        const copyrightMatch = textContent.match(/©\s*(\d{4})/);
        if (copyrightMatch) {
            return parseInt(copyrightMatch[1]);
        }

        // Try general year patterns
        const yearMatches = textContent.match(/\b(19|20)\d{2}\b/g);
        if (yearMatches && yearMatches.length > 0) {
            // Return the most recent reasonable year
            const years = yearMatches.map(y => parseInt(y)).filter(y => y >= 1900 && y <= new Date().getFullYear());
            if (years.length > 0) {
                return Math.max(...years);
            }
        }

        return null;
    }

    /**
     * Extract DOI from HTML content
     * @param {string} htmlContent - HTML content
     * @returns {string} Extracted DOI
     */
    extractDOI(htmlContent) {
        // Try citation meta tags
        const citationDoiMatch = htmlContent.match(/<meta[^>]*name=["']citation_doi["'][^>]*content=["']([^"']+)["']/i);
        if (citationDoiMatch && citationDoiMatch[1]) {
            return citationDoiMatch[1].trim();
        }

        // Try DOI patterns in text
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ');
        const doiPattern = /doi:\s*(10\.\d+\/[^\s]+)/i;
        const doiMatch = textContent.match(doiPattern);
        if (doiMatch && doiMatch[1]) {
            return doiMatch[1].trim();
        }

        // Try DOI URLs
        const doiUrlPattern = /https?:\/\/(?:dx\.)?doi\.org\/(10\.\d+\/[^\s]+)/i;
        const doiUrlMatch = htmlContent.match(doiUrlPattern);
        if (doiUrlMatch && doiUrlMatch[1]) {
            return doiUrlMatch[1].trim();
        }

        return '';
    }

    /**
     * Classify domain type for attribution context
     * @param {string} hostname - Domain hostname
     * @returns {string} Domain classification
     */
    classifyDomain(hostname) {
        const lowerHostname = hostname.toLowerCase();

        for (const [category, domains] of Object.entries(this.trustedDomains)) {
            for (const domain of domains) {
                if (lowerHostname.includes(domain.toLowerCase())) {
                    return category;
                }
            }
        }

        return 'unknown';
    }

    /**
     * Verify author attribution accuracy
     * @param {Array} claimedAuthors - Authors claimed in reference
     * @param {Object} extractedMetadata - Metadata extracted from webpage
     * @returns {Object} Author verification result
     */
    verifyAuthors(claimedAuthors, extractedMetadata) {
        const result = {
            accurate: false,
            confidence: 0,
            matches: [],
            mismatches: [],
            extractedAuthors: extractedMetadata.authors || [],
            issues: []
        };

        if (!claimedAuthors || claimedAuthors.length === 0) {
            result.issues.push('No authors claimed in reference');
            return result;
        }

        if (!extractedMetadata.authors || extractedMetadata.authors.length === 0) {
            result.issues.push('No authors found on webpage');
            result.confidence = 0.1; // Very low confidence when no authors found
            return result;
        }

        // Compare claimed authors with extracted authors
        for (const claimedAuthor of claimedAuthors) {
            const match = this.findAuthorMatch(claimedAuthor, extractedMetadata.authors);
            if (match) {
                result.matches.push({
                    claimed: claimedAuthor,
                    extracted: match.author,
                    similarity: match.similarity,
                    method: match.method
                });
            } else {
                result.mismatches.push({
                    claimed: claimedAuthor,
                    reason: 'No matching author found on webpage'
                });
            }
        }

        // Calculate accuracy
        const totalClaimed = claimedAuthors.length;
        const totalMatched = result.matches.length;
        
        if (totalMatched === totalClaimed) {
            result.accurate = true;
            result.confidence = Math.min(0.9, result.matches.reduce((sum, match) => sum + match.similarity, 0) / totalMatched);
        } else if (totalMatched > 0) {
            result.accurate = false;
            result.confidence = (totalMatched / totalClaimed) * 0.7; // Partial match
        } else {
            result.accurate = false;
            result.confidence = 0.1;
        }

        return result;
    }

    /**
     * Find matching author in extracted authors list
     * @param {string} claimedAuthor - Author name from reference
     * @param {Array} extractedAuthors - Authors found on webpage
     * @returns {Object|null} Match result or null
     */
    findAuthorMatch(claimedAuthor, extractedAuthors) {
        const normalizedClaimed = this.normalizeAuthorName(claimedAuthor);
        
        for (const extractedAuthor of extractedAuthors) {
            const normalizedExtracted = this.normalizeAuthorName(extractedAuthor);
            
            // Exact match
            if (normalizedClaimed === normalizedExtracted) {
                return {
                    author: extractedAuthor,
                    similarity: 1.0,
                    method: 'exact_match'
                };
            }
            
            // Partial match (last name + first initial)
            const similarity = this.calculateAuthorSimilarity(normalizedClaimed, normalizedExtracted);
            if (similarity >= 0.7) {
                return {
                    author: extractedAuthor,
                    similarity,
                    method: 'partial_match'
                };
            }
        }
        
        return null;
    }

    /**
     * Normalize author name for comparison
     * @param {string} authorName - Raw author name
     * @returns {string} Normalized author name
     */
    normalizeAuthorName(authorName) {
        return authorName
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Calculate similarity between two author names
     * @param {string} name1 - First author name (normalized)
     * @param {string} name2 - Second author name (normalized)
     * @returns {number} Similarity score (0-1)
     */
    calculateAuthorSimilarity(name1, name2) {
        // Simple similarity based on common words and character overlap
        const words1 = name1.split(' ');
        const words2 = name2.split(' ');
        
        let commonWords = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1 === word2 && word1.length > 1) {
                    commonWords++;
                    break;
                }
            }
        }
        
        const maxWords = Math.max(words1.length, words2.length);
        const wordSimilarity = commonWords / maxWords;
        
        // Character-level similarity (Jaccard index)
        const chars1 = new Set(name1.replace(/\s/g, ''));
        const chars2 = new Set(name2.replace(/\s/g, ''));
        const intersection = new Set([...chars1].filter(x => chars2.has(x)));
        const union = new Set([...chars1, ...chars2]);
        const charSimilarity = intersection.size / union.size;
        
        // Weighted combination
        return (wordSimilarity * 0.7) + (charSimilarity * 0.3);
    }

    /**
     * Verify title attribution accuracy
     * @param {string} claimedTitle - Title claimed in reference
     * @param {Object} extractedMetadata - Metadata extracted from webpage
     * @returns {Object} Title verification result
     */
    verifyTitle(claimedTitle, extractedMetadata) {
        const result = {
            accurate: false,
            confidence: 0,
            claimedTitle,
            extractedTitle: extractedMetadata.title || '',
            similarity: 0,
            issues: []
        };

        if (!claimedTitle || claimedTitle.trim().length === 0) {
            result.issues.push('No title claimed in reference');
            return result;
        }

        if (!extractedMetadata.title || extractedMetadata.title.trim().length === 0) {
            result.issues.push('No title found on webpage');
            result.confidence = 0.1;
            return result;
        }

        // Calculate title similarity
        const similarity = this.calculateTitleSimilarity(claimedTitle, extractedMetadata.title);
        result.similarity = similarity;

        if (similarity >= 0.8) {
            result.accurate = true;
            result.confidence = similarity;
        } else if (similarity >= 0.5) {
            result.accurate = false;
            result.confidence = similarity * 0.7; // Partial match
            result.issues.push('Title partially matches but may have differences');
        } else {
            result.accurate = false;
            result.confidence = 0.2;
            result.issues.push('Title does not match webpage title');
        }

        return result;
    }

    /**
     * Calculate similarity between two titles
     * @param {string} title1 - First title
     * @param {string} title2 - Second title
     * @returns {number} Similarity score (0-1)
     */
    calculateTitleSimilarity(title1, title2) {
        const normalize = (title) => title
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const norm1 = normalize(title1);
        const norm2 = normalize(title2);

        // Exact match
        if (norm1 === norm2) {
            return 1.0;
        }

        // Word-based similarity
        const words1 = norm1.split(' ').filter(w => w.length > 2);
        const words2 = norm2.split(' ').filter(w => w.length > 2);

        let commonWords = 0;
        for (const word1 of words1) {
            if (words2.includes(word1)) {
                commonWords++;
            }
        }

        const maxWords = Math.max(words1.length, words2.length);
        const wordSimilarity = maxWords > 0 ? commonWords / maxWords : 0;

        // Character-level similarity
        const chars1 = new Set(norm1.replace(/\s/g, ''));
        const chars2 = new Set(norm2.replace(/\s/g, ''));
        const intersection = new Set([...chars1].filter(x => chars2.has(x)));
        const union = new Set([...chars1, ...chars2]);
        const charSimilarity = union.size > 0 ? intersection.size / union.size : 0;

        // Weighted combination favoring word similarity
        return (wordSimilarity * 0.8) + (charSimilarity * 0.2);
    }

    /**
     * Verify publication attribution accuracy
     * @param {Object} reference - Reference object with publication claims
     * @param {Object} extractedMetadata - Metadata extracted from webpage
     * @returns {Object} Publication verification result
     */
    verifyPublication(reference, extractedMetadata) {
        const result = {
            accurate: false,
            confidence: 0,
            journalMatch: null,
            publisherMatch: null,
            issues: []
        };

        // Verify journal if claimed
        if (reference.journal) {
            result.journalMatch = this.verifyJournal(reference.journal, extractedMetadata);
        }

        // Verify publisher if claimed
        if (reference.publisher) {
            result.publisherMatch = this.verifyPublisher(reference.publisher, extractedMetadata);
        }

        // Calculate overall publication accuracy
        let totalChecks = 0;
        let accurateChecks = 0;
        let confidenceSum = 0;

        if (result.journalMatch) {
            totalChecks++;
            if (result.journalMatch.accurate) accurateChecks++;
            confidenceSum += result.journalMatch.confidence;
        }

        if (result.publisherMatch) {
            totalChecks++;
            if (result.publisherMatch.accurate) accurateChecks++;
            confidenceSum += result.publisherMatch.confidence;
        }

        if (totalChecks > 0) {
            result.accurate = accurateChecks === totalChecks;
            result.confidence = confidenceSum / totalChecks;
        } else {
            result.issues.push('No publication information to verify');
        }

        return result;
    }

    /**
     * Verify journal attribution
     * @param {string} claimedJournal - Journal claimed in reference
     * @param {Object} extractedMetadata - Extracted metadata
     * @returns {Object} Journal verification result
     */
    verifyJournal(claimedJournal, extractedMetadata) {
        const result = {
            accurate: false,
            confidence: 0,
            claimedJournal,
            extractedPublication: extractedMetadata.publication || '',
            similarity: 0
        };

        if (!extractedMetadata.publication) {
            result.confidence = 0.1;
            return result;
        }

        const similarity = this.calculateTitleSimilarity(claimedJournal, extractedMetadata.publication);
        result.similarity = similarity;

        if (similarity >= 0.7) {
            result.accurate = true;
            result.confidence = similarity;
        } else {
            result.accurate = false;
            result.confidence = similarity * 0.5;
        }

        return result;
    }

    /**
     * Verify publisher attribution
     * @param {string} claimedPublisher - Publisher claimed in reference
     * @param {Object} extractedMetadata - Extracted metadata
     * @returns {Object} Publisher verification result
     */
    verifyPublisher(claimedPublisher, extractedMetadata) {
        const result = {
            accurate: false,
            confidence: 0,
            claimedPublisher,
            extractedPublisher: extractedMetadata.publisher || '',
            similarity: 0
        };

        if (!extractedMetadata.publisher) {
            result.confidence = 0.1;
            return result;
        }

        const similarity = this.calculateTitleSimilarity(claimedPublisher, extractedMetadata.publisher);
        result.similarity = similarity;

        if (similarity >= 0.6) {
            result.accurate = true;
            result.confidence = similarity;
        } else {
            result.accurate = false;
            result.confidence = similarity * 0.5;
        }

        return result;
    }

    /**
     * Verify DOI attribution
     * @param {string} claimedDoi - DOI claimed in reference
     * @param {Object} extractedMetadata - Extracted metadata
     * @param {string} url - Source URL
     * @returns {Object} DOI verification result
     */
    verifyDOI(claimedDoi, extractedMetadata, url) {
        const result = {
            accurate: false,
            confidence: 0,
            claimedDoi,
            extractedDoi: extractedMetadata.doi || '',
            urlMatch: false
        };

        // Check if DOI matches extracted DOI
        if (extractedMetadata.doi) {
            const normalizedClaimed = claimedDoi.replace(/^doi:/, '').trim();
            const normalizedExtracted = extractedMetadata.doi.replace(/^doi:/, '').trim();
            
            if (normalizedClaimed === normalizedExtracted) {
                result.accurate = true;
                result.confidence = 0.95;
                return result;
            }
        }

        // Check if URL is a DOI URL that matches the claimed DOI
        if (url.includes('doi.org')) {
            const urlDoi = url.match(/doi\.org\/(10\.\d+\/[^\s?#]+)/);
            if (urlDoi && urlDoi[1]) {
                const normalizedClaimed = claimedDoi.replace(/^doi:/, '').trim();
                if (normalizedClaimed === urlDoi[1]) {
                    result.accurate = true;
                    result.confidence = 0.9;
                    result.urlMatch = true;
                    return result;
                }
            }
        }

        result.accurate = false;
        result.confidence = 0.1;
        return result;
    }

    /**
     * Calculate overall attribution accuracy
     * @param {Object} verificationDetails - Individual verification results
     * @returns {Object} Overall accuracy assessment
     */
    calculateAttributionAccuracy(verificationDetails) {
        const result = {
            accurate: false,
            confidence: 0,
            issues: []
        };

        const checks = [];
        
        // Collect all verification results
        if (verificationDetails.authors) {
            checks.push({
                type: 'authors',
                accurate: verificationDetails.authors.accurate,
                confidence: verificationDetails.authors.confidence,
                weight: 0.4 // Authors are most important for attribution
            });
        }

        if (verificationDetails.title) {
            checks.push({
                type: 'title',
                accurate: verificationDetails.title.accurate,
                confidence: verificationDetails.title.confidence,
                weight: 0.3
            });
        }

        if (verificationDetails.publication) {
            checks.push({
                type: 'publication',
                accurate: verificationDetails.publication.accurate,
                confidence: verificationDetails.publication.confidence,
                weight: 0.2
            });
        }

        if (verificationDetails.doi) {
            checks.push({
                type: 'doi',
                accurate: verificationDetails.doi.accurate,
                confidence: verificationDetails.doi.confidence,
                weight: 0.1
            });
        }

        if (checks.length === 0) {
            result.issues.push('No attribution information to verify');
            return result;
        }

        // Calculate weighted accuracy and confidence
        let totalWeight = 0;
        let weightedConfidence = 0;
        let accurateChecks = 0;

        for (const check of checks) {
            totalWeight += check.weight;
            weightedConfidence += check.confidence * check.weight;
            if (check.accurate) {
                accurateChecks++;
            } else {
                result.issues.push(`${check.type} attribution verification failed`);
            }
        }

        result.confidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;
        
        // Require majority of checks to pass for overall accuracy
        const accuracyThreshold = checks.length > 1 ? 0.6 : 1.0;
        result.accurate = (accurateChecks / checks.length) >= accuracyThreshold && result.confidence >= 0.5;

        return result;
    }

    /**
     * Verify attribution for multiple references in batch
     * @param {Array} references - Array of reference objects with URLs
     * @param {Object} options - Batch processing options
     * @returns {Promise<Object>} Batch verification results
     */
    async verifyAttributionBatch(references, options = {}) {
        const results = {
            totalReferences: references.length,
            verificationResults: [],
            summary: {
                accurateAttributions: 0,
                inaccurateAttributions: 0,
                unverifiableAttributions: 0,
                averageConfidence: 0
            },
            verifiedAt: new Date().toISOString()
        };

        let totalConfidence = 0;

        for (let i = 0; i < references.length; i++) {
            const reference = references[i];
            
            try {
                const verificationResult = await this.verifyAttribution(
                    reference.reference || reference,
                    reference.url,
                    reference.htmlContent
                );
                
                verificationResult.batchIndex = i;
                results.verificationResults.push(verificationResult);

                // Update summary
                if (verificationResult.attributionAccurate === true) {
                    results.summary.accurateAttributions++;
                } else if (verificationResult.attributionAccurate === false) {
                    results.summary.inaccurateAttributions++;
                } else {
                    results.summary.unverifiableAttributions++;
                }

                totalConfidence += verificationResult.confidence;

                // Progress callback if provided
                if (options.progressCallback) {
                    options.progressCallback({
                        processed: i + 1,
                        total: references.length,
                        percentage: Math.round(((i + 1) / references.length) * 100),
                        message: `Verifying attribution ${i + 1}/${references.length}`
                    });
                }

            } catch (error) {
                const errorResult = {
                    url: reference.url,
                    reference: reference.reference || reference,
                    attributionAccurate: false,
                    confidence: 0,
                    issues: [`Attribution verification error: ${error.message}`],
                    batchIndex: i,
                    verifiedAt: new Date().toISOString()
                };
                
                results.verificationResults.push(errorResult);
                results.summary.inaccurateAttributions++;
            }
        }

        results.summary.averageConfidence = references.length > 0 ? totalConfidence / references.length : 0;

        return results;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttributionVerifier;
} else if (typeof window !== 'undefined') {
    window.AttributionVerifier = AttributionVerifier;
}