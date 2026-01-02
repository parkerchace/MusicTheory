/**
 * @module ContentAnalyzer
 * @description Analyzes webpage content to verify scale-specific information and relevance
 * @exports class ContentAnalyzer
 * @feature HTML content extraction and cleaning
 * @feature Scale-specific keyword analysis
 * @feature Relevance scoring based on content analysis
 * @feature Generic content identification
 */

class ContentAnalyzer {
    constructor(options = {}) {
        this.minRelevanceScore = options.minRelevanceScore || 0.3;
        this.keywordWeights = {
            scaleName: 0.4,
            culturalContext: 0.3,
            musicTheory: 0.2,
            intervals: 0.1
        };
        
        // Initialize scale name variations and aliases database
        this.scaleAliases = this.initializeScaleAliases();
        this.culturalKeywords = this.initializeCulturalKeywords();
        this.musicTheoryTerms = this.initializeMusicTheoryTerms();
    }

    /**
     * Initialize comprehensive scale name aliases and variations
     * @returns {Object} Scale aliases database
     */
    initializeScaleAliases() {
        return {
            // Modal scales
            'dorian': ['dorian mode', 'doric mode', 'second mode'],
            'phrygian': ['phrygian mode', 'third mode'],
            'lydian': ['lydian mode', 'fourth mode'],
            'mixolydian': ['mixolydian mode', 'dominant mode', 'fifth mode'],
            'aeolian': ['aeolian mode', 'natural minor', 'sixth mode'],
            'locrian': ['locrian mode', 'seventh mode'],
            'ionian': ['ionian mode', 'major scale', 'first mode'],
            
            // Pentatonic scales
            'pentatonic': ['pentatonic scale', 'five-note scale', 'five tone scale'],
            'major_pentatonic': ['major pentatonic', 'pentatonic major'],
            'minor_pentatonic': ['minor pentatonic', 'pentatonic minor'],
            
            // Blues scales
            'blues': ['blues scale', 'blue notes'],
            'major_blues': ['major blues scale'],
            'minor_blues': ['minor blues scale'],
            
            // Chromatic and whole tone
            'chromatic': ['chromatic scale', 'twelve-tone scale', '12-tone scale'],
            'whole_tone': ['whole tone scale', 'whole-tone scale', 'augmented scale'],
            
            // Diminished scales
            'diminished': ['diminished scale', 'octatonic scale'],
            'half_whole_diminished': ['half-whole diminished', 'dominant diminished'],
            'whole_half_diminished': ['whole-half diminished', 'symmetric diminished'],
            
            // Harmonic and melodic scales
            'harmonic_minor': ['harmonic minor scale', 'harmonic minor'],
            'melodic_minor': ['melodic minor scale', 'jazz minor'],
            'harmonic_major': ['harmonic major scale'],
            
            // Exotic and world scales
            'hungarian_minor': ['hungarian minor', 'hungarian gypsy'],
            'neapolitan_minor': ['neapolitan minor'],
            'neapolitan_major': ['neapolitan major'],
            'persian': ['persian scale'],
            'arabic': ['arabic scale', 'maqam'],
            'japanese': ['japanese scale', 'hirajoshi', 'kumoi'],
            'chinese': ['chinese scale', 'chinese pentatonic'],
            'indian': ['indian scale', 'raga', 'raag'],
            
            // African scales
            'african': ['african scale', 'african pentatonic'],
            'ethiopian': ['ethiopian scale'],
            'west_african': ['west african scale'],
            
            // Celtic and folk scales
            'celtic': ['celtic scale', 'irish scale'],
            'scottish': ['scottish scale'],
            'gypsy': ['gypsy scale', 'romani scale'],
            
            // Modern and jazz scales
            'bebop': ['bebop scale'],
            'altered': ['altered scale', 'super locrian'],
            'lydian_dominant': ['lydian dominant', 'lydian b7'],
            'half_diminished': ['half diminished', 'locrian natural 2']
        };
    }

    /**
     * Initialize cultural and regional keywords
     * @returns {Object} Cultural keywords database
     */
    initializeCulturalKeywords() {
        return {
            regions: [
                'african', 'arabic', 'asian', 'european', 'american',
                'middle eastern', 'indian', 'chinese', 'japanese',
                'celtic', 'irish', 'scottish', 'welsh', 'english',
                'spanish', 'italian', 'french', 'german', 'russian',
                'balkan', 'gypsy', 'romani', 'turkish', 'persian',
                'ethiopian', 'west african', 'north african'
            ],
            cultural: [
                'traditional', 'folk', 'ethnic', 'indigenous', 'native',
                'classical', 'ancient', 'medieval', 'renaissance',
                'baroque', 'romantic', 'modern', 'contemporary',
                'sacred', 'religious', 'spiritual', 'ceremonial',
                'ritual', 'dance', 'vocal', 'instrumental'
            ],
            musical_contexts: [
                'maqam', 'raga', 'mode', 'scale', 'tuning',
                'temperament', 'microtonal', 'quarter-tone',
                'just intonation', 'equal temperament',
                'pentatonic', 'heptatonic', 'octatonic'
            ]
        };
    }

    /**
     * Initialize comprehensive music theory terms
     * @returns {Object} Music theory terms database
     */
    initializeMusicTheoryTerms() {
        return {
            scales: [
                'scale', 'mode', 'tonality', 'key', 'pitch collection',
                'note series', 'tonal system', 'scalar structure'
            ],
            intervals: [
                'interval', 'semitone', 'tone', 'half step', 'whole step',
                'minor second', 'major second', 'minor third', 'major third',
                'perfect fourth', 'tritone', 'perfect fifth', 'minor sixth',
                'major sixth', 'minor seventh', 'major seventh', 'octave',
                'unison', 'augmented', 'diminished', 'cents', 'frequency ratio'
            ],
            harmony: [
                'chord', 'triad', 'seventh chord', 'extended chord',
                'harmony', 'harmonic', 'consonance', 'dissonance',
                'resolution', 'tension', 'voice leading'
            ],
            theory: [
                'music theory', 'musicology', 'ethnomusicology',
                'analysis', 'theoretical', 'systematic',
                'tonal theory', 'modal theory', 'pitch theory'
            ],
            structure: [
                'degree', 'tonic', 'supertonic', 'mediant', 'subdominant',
                'dominant', 'submediant', 'leading tone', 'subtonic',
                'root', 'third', 'fifth', 'seventh', 'ninth', 'eleventh', 'thirteenth'
            ]
        };
    }

    /**
     * Analyze scale content from HTML
     * @param {string} htmlContent - HTML content to analyze
     * @param {string} scaleName - Name of the scale to look for
     * @param {Array} scaleKeywords - Keywords related to the scale
     * @returns {Object} Content analysis result
     */
    analyzeScaleContent(htmlContent, scaleName, scaleKeywords = []) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            return {
                relevant: false,
                score: 0,
                reason: 'No content provided for analysis',
                keywordMatches: [],
                contentLength: 0,
                extractionMetadata: null
            };
        }

        // Extract text content from HTML with enhanced parsing
        const extractedContent = this.extractTextContent(htmlContent);
        const textContent = extractedContent.text;
        const contentLower = textContent.toLowerCase();
        
        const result = {
            relevant: false,
            score: 0,
            reason: '',
            keywordMatches: [],
            contentLength: textContent.length,
            analyzedAt: new Date().toISOString(),
            extractionMetadata: extractedContent.metadata,
            title: extractedContent.title,
            headings: extractedContent.headings,
            links: extractedContent.links
        };

        // Perform comprehensive relevance analysis
        const relevanceAnalysis = this.calculateRelevanceScore(textContent, scaleKeywords, scaleName);
        
        // Collect all keyword matches
        const scaleNameMatches = this.findScaleNameMatches(contentLower, scaleName);
        const culturalMatches = this.findCulturalContextMatches(contentLower, scaleKeywords);
        const theoryMatches = this.findMusicTheoryMatches(contentLower);
        const intervalMatches = this.findIntervalMatches(contentLower);

        result.keywordMatches = [
            ...scaleNameMatches,
            ...culturalMatches,
            ...theoryMatches,
            ...intervalMatches
        ];

        // Use enhanced scoring
        result.score = relevanceAnalysis.score;
        result.confidence = relevanceAnalysis.confidence;
        result.scoreBreakdown = relevanceAnalysis.breakdown;
        result.matchDiversity = relevanceAnalysis.matchDiversity;

        // Determine relevance with stricter criteria for scale-specific content
        // Require scale name matches for content to be considered relevant to a specific scale
        const hasScaleNameMatches = scaleNameMatches.length > 0;
        const hasExceptionalScore = result.score >= 0.8 && result.confidence > 0.8;
        
        // Only consider content relevant if it specifically mentions the scale or has exceptional scores
        result.relevant = hasScaleNameMatches || hasExceptionalScore;
        result.reason = this.generateEnhancedRelevanceReason(result, relevanceAnalysis.reasons);

        return result;
    }

    /**
     * Extract relevant keywords from content
     * @param {string} content - Text content to analyze
     * @returns {Array} Array of relevant keywords found
     */
    extractRelevantKeywords(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }

        const contentLower = content.toLowerCase();
        const keywords = [];

        // Music theory terms
        const musicTheoryTerms = [
            'scale', 'mode', 'interval', 'semitone', 'tone', 'octave',
            'major', 'minor', 'chromatic', 'diatonic', 'pentatonic',
            'modal', 'tonic', 'dominant', 'subdominant', 'degree'
        ];

        // Cultural/regional terms
        const culturalTerms = [
            'traditional', 'folk', 'ethnic', 'cultural', 'regional',
            'ancient', 'classical', 'medieval', 'renaissance', 'baroque'
        ];

        // Check for music theory terms
        for (const term of musicTheoryTerms) {
            if (contentLower.includes(term)) {
                keywords.push({ term, category: 'music_theory' });
            }
        }

        // Check for cultural terms
        for (const term of culturalTerms) {
            if (contentLower.includes(term)) {
                keywords.push({ term, category: 'cultural' });
            }
        }

        return keywords;
    }

    /**
     * Calculate comprehensive relevance score based on enhanced content analysis
     * @param {string} content - Text content to score
     * @param {Array} expectedTopics - Expected topics/keywords
     * @param {string} scaleName - Name of the scale being analyzed
     * @returns {Object} Detailed relevance scoring result
     */
    calculateRelevanceScore(content, expectedTopics = [], scaleName = '') {
        if (!content || typeof content !== 'string') {
            return {
                score: 0,
                breakdown: {},
                confidence: 0,
                reasons: ['No content provided for analysis']
            };
        }

        const contentLower = content.toLowerCase();
        const breakdown = {
            scaleNameMatches: 0,
            culturalMatches: 0,
            theoryMatches: 0,
            intervalMatches: 0,
            expectedTopicMatches: 0,
            contentQuality: 0
        };

        let totalWeight = 0;
        let weightedScore = 0;
        const reasons = [];

        // Score scale name matches
        if (scaleName) {
            const scaleMatches = this.findScaleNameMatches(contentLower, scaleName);
            if (scaleMatches.length > 0) {
                const scaleScore = Math.min(scaleMatches.reduce((sum, match) => sum + match.weight, 0), 1.0);
                breakdown.scaleNameMatches = scaleScore;
                weightedScore += scaleScore * this.keywordWeights.scaleName;
                reasons.push(`Found ${scaleMatches.length} scale name matches`);
            }
            totalWeight += this.keywordWeights.scaleName;
        }

        // Score cultural context matches
        const culturalMatches = this.findCulturalContextMatches(contentLower, expectedTopics);
        if (culturalMatches.length > 0) {
            const culturalScore = Math.min(culturalMatches.reduce((sum, match) => sum + match.weight, 0) / 3, 1.0);
            breakdown.culturalMatches = culturalScore;
            weightedScore += culturalScore * this.keywordWeights.culturalContext;
            reasons.push(`Found ${culturalMatches.length} cultural context matches`);
        }
        totalWeight += this.keywordWeights.culturalContext;

        // Score music theory matches
        const theoryMatches = this.findMusicTheoryMatches(contentLower);
        if (theoryMatches.length > 0) {
            const theoryScore = Math.min(theoryMatches.reduce((sum, match) => sum + match.weight, 0) / 5, 1.0);
            breakdown.theoryMatches = theoryScore;
            weightedScore += theoryScore * this.keywordWeights.musicTheory;
            reasons.push(`Found ${theoryMatches.length} music theory matches`);
        }
        totalWeight += this.keywordWeights.musicTheory;

        // Score interval matches
        const intervalMatches = this.findIntervalMatches(contentLower);
        if (intervalMatches.length > 0) {
            const intervalScore = Math.min(intervalMatches.reduce((sum, match) => sum + match.weight, 0) / 3, 1.0);
            breakdown.intervalMatches = intervalScore;
            weightedScore += intervalScore * this.keywordWeights.intervals;
            reasons.push(`Found ${intervalMatches.length} interval-related matches`);
        }
        totalWeight += this.keywordWeights.intervals;

        // Score expected topics
        let expectedTopicScore = 0;
        for (const topic of expectedTopics) {
            if (typeof topic === 'string' && contentLower.includes(topic.toLowerCase())) {
                expectedTopicScore += 0.2;
            }
        }
        breakdown.expectedTopicMatches = Math.min(expectedTopicScore, 1.0);

        // Content quality assessment
        const qualityScore = this.assessContentQuality(content, contentLower);
        breakdown.contentQuality = qualityScore;
        weightedScore += qualityScore * 0.1; // Small weight for content quality
        totalWeight += 0.1;

        // Calculate final score
        const finalScore = totalWeight > 0 ? Math.min(weightedScore / totalWeight, 1.0) : 0;
        
        // Calculate confidence based on content length and match diversity
        const confidence = this.calculateConfidence(content, breakdown, reasons.length);

        return {
            score: finalScore,
            breakdown,
            confidence,
            reasons: reasons.length > 0 ? reasons : ['No relevant matches found'],
            contentLength: content.length,
            matchDiversity: reasons.length
        };
    }

    /**
     * Assess content quality indicators
     * @param {string} content - Original content
     * @param {string} contentLower - Lowercase content
     * @returns {number} Quality score between 0 and 1
     */
    assessContentQuality(content, contentLower) {
        let qualityScore = 0;

        // Length indicators
        if (content.length > 500) qualityScore += 0.2;
        if (content.length > 1500) qualityScore += 0.2;

        // Structure indicators
        if (content.includes('\n')) qualityScore += 0.1; // Has paragraphs
        if (contentLower.includes('definition') || contentLower.includes('explanation')) qualityScore += 0.1;
        if (contentLower.includes('example') || contentLower.includes('examples')) qualityScore += 0.1;

        // Educational indicators
        const educationalTerms = ['learn', 'understand', 'theory', 'analysis', 'study', 'research'];
        for (const term of educationalTerms) {
            if (contentLower.includes(term)) {
                qualityScore += 0.05;
            }
        }

        // Academic indicators
        const academicTerms = ['according to', 'research shows', 'studies indicate', 'analysis reveals'];
        for (const term of academicTerms) {
            if (contentLower.includes(term)) {
                qualityScore += 0.1;
            }
        }

        return Math.min(qualityScore, 1.0);
    }

    /**
     * Calculate confidence in the relevance assessment
     * @param {string} content - Content being analyzed
     * @param {Object} breakdown - Score breakdown
     * @param {number} matchCount - Number of different match types
     * @returns {number} Confidence score between 0 and 1
     */
    calculateConfidence(content, breakdown, matchCount) {
        let confidence = 0;

        // Base confidence from content length
        if (content.length > 200) confidence += 0.2;
        if (content.length > 800) confidence += 0.2;

        // Confidence from match diversity
        confidence += Math.min(matchCount * 0.15, 0.6);

        // Confidence from strong matches
        if (breakdown.scaleNameMatches > 0.7) confidence += 0.2;
        if (breakdown.theoryMatches > 0.5) confidence += 0.1;
        if (breakdown.culturalMatches > 0.5) confidence += 0.1;

        // Penalty for very short content
        if (content.length < 100) confidence *= 0.5;

        return Math.min(confidence, 1.0);
    }

    /**
     * Identify generic content that lacks specificity
     * @param {string} content - Text content to analyze
     * @returns {Object} Generic content analysis result
     */
    identifyGenericContent(content) {
        if (!content || typeof content !== 'string') {
            return {
                isGeneric: true,
                reason: 'No content provided',
                genericIndicators: []
            };
        }

        const contentLower = content.toLowerCase();
        const genericIndicators = [];

        // Check for overly generic terms
        const genericTerms = [
            'music', 'sound', 'audio', 'general', 'overview', 'introduction',
            'basic', 'simple', 'easy', 'beginner', 'guide', 'tutorial'
        ];

        const specificTerms = [
            'interval', 'semitone', 'chromatic', 'diatonic', 'modal',
            'ethnomusicology', 'traditional', 'cultural', 'regional'
        ];

        let genericCount = 0;
        let specificCount = 0;

        // Count generic terms
        for (const term of genericTerms) {
            if (contentLower.includes(term)) {
                genericCount++;
                genericIndicators.push(term);
            }
        }

        // Count specific terms
        for (const term of specificTerms) {
            if (contentLower.includes(term)) {
                specificCount++;
            }
        }

        // Determine if content is generic
        const isGeneric = genericCount > specificCount || 
                         (genericCount > 0 && specificCount === 0) ||
                         content.length < 100;

        return {
            isGeneric,
            reason: isGeneric ? 
                'Content appears to be generic or lacks specific scale information' : 
                'Content appears to contain specific scale-related information',
            genericIndicators,
            genericCount,
            specificCount,
            contentLength: content.length
        };
    }

    /**
     * Extract text content from HTML with enhanced parsing and encoding handling
     * @param {string} htmlContent - HTML content
     * @param {Object} options - Extraction options
     * @returns {Object} Extracted content with metadata
     */
    extractTextContent(htmlContent, options = {}) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            return {
                text: '',
                title: '',
                headings: [],
                links: [],
                metadata: {
                    encoding: 'unknown',
                    malformed: false,
                    extractedAt: new Date().toISOString()
                }
            };
        }

        const result = {
            text: '',
            title: '',
            headings: [],
            links: [],
            metadata: {
                encoding: 'utf-8',
                malformed: false,
                extractedAt: new Date().toISOString(),
                originalLength: htmlContent.length
            }
        };

        try {
            // Detect malformed HTML on original content first
            const malformedCheck = this.detectMalformedHtml(htmlContent);
            result.metadata.malformed = malformedCheck.isMalformed;
            result.metadata.malformedIssues = malformedCheck.issues;
            result.metadata.malformedSeverity = malformedCheck.severity;
            
            // Handle character encoding issues
            let processedContent = this.handleCharacterEncoding(htmlContent);
            
            // Repair malformed HTML if needed
            if (malformedCheck.isMalformed) {
                processedContent = this.repairMalformedHtml(processedContent);
            }

            // Extract title
            result.title = this.extractTitle(processedContent);

            // Extract headings with hierarchy preservation
            result.headings = this.extractHeadings(processedContent);

            // Extract links for reference analysis
            result.links = this.extractLinks(processedContent);

            // Extract main text content
            result.text = this.extractMainTextContent(processedContent);
            
            result.metadata.processedLength = result.text.length;
            result.metadata.compressionRatio = result.text.length / htmlContent.length;

        } catch (error) {
            result.metadata.error = error.message;
            result.metadata.malformed = true;
            
            // Fallback to basic extraction
            result.text = this.basicTextExtraction(htmlContent);
        }

        return result;
    }

    /**
     * Handle various character encodings and decode issues
     * @param {string} htmlContent - Raw HTML content
     * @returns {string} Processed content with encoding issues resolved
     */
    handleCharacterEncoding(htmlContent) {
        // Detect common encoding issues and fix them
        let processed = htmlContent;

        // Fix common UTF-8 encoding issues
        const encodingFixes = [
            // Fix UTF-8 BOM
            [/^\uFEFF/, ''],
            // Fix common Windows-1252 characters that appear in UTF-8
            [/â€™/g, "'"], // Right single quotation mark
            [/â€œ/g, '"'], // Left double quotation mark  
            [/â€/g, '"'], // Right double quotation mark
            [/â€"/g, '–'], // En dash
            [/â€"/g, '—'], // Em dash
            [/Â/g, ''], // Non-breaking space artifacts
            // Fix HTML entities that weren't properly decoded
            [/&amp;/g, '&'],
            [/&lt;/g, '<'],
            [/&gt;/g, '>'],
            [/&quot;/g, '"'],
            [/&#39;/g, "'"],
            [/&nbsp;/g, ' ']
        ];

        for (const [pattern, replacement] of encodingFixes) {
            processed = processed.replace(pattern, replacement);
        }

        return processed;
    }

    /**
     * Detect malformed HTML structure
     * @param {string} htmlContent - HTML content to check
     * @returns {Object} Malformed HTML detection result
     */
    detectMalformedHtml(htmlContent) {
        const issues = [];
        let isMalformed = false;

        // Check for unclosed tags (more sophisticated approach)
        const openTags = htmlContent.match(/<(?!\/)[^>]*>/g) || [];
        const closeTags = htmlContent.match(/<\/[^>]*>/g) || [];
        
        // Filter out self-closing tags and void elements
        const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
        const nonVoidOpenTags = openTags.filter(tag => {
            const tagName = tag.match(/<([a-zA-Z][^\s>]*)/);
            if (!tagName) return false;
            const name = tagName[1].toLowerCase();
            return !voidElements.includes(name) && !tag.endsWith('/>');
        });
        
        // Allow for reasonable tag mismatch (DOCTYPE, comments, etc.)
        if (Math.abs(nonVoidOpenTags.length - closeTags.length) > 8) {
            issues.push('Significant tag mismatch detected');
            isMalformed = true;
        }

        // Check for clearly malformed patterns
        const malformedPatterns = [
            /<[^>]*<[^>]*>/g, // Nested angle brackets
            /<\s*>/g // Empty tags
        ];

        for (const pattern of malformedPatterns) {
            const matches = htmlContent.match(pattern);
            if (matches && matches.length > 2) { // Allow some tolerance
                issues.push(`Malformed tag pattern detected: ${pattern.source}`);
                isMalformed = true;
            }
        }

        // Check for unclosed tags more carefully
        const unClosedTagPattern = /<[a-zA-Z][^>]*[^/>]$/gm;
        const unclosedMatches = htmlContent.match(unClosedTagPattern);
        if (unclosedMatches && unclosedMatches.length > 0) {
            issues.push('Unclosed HTML tags detected');
            isMalformed = true;
        }

        // Check for missing closing tags by looking for obvious patterns
        const missingClosingTags = [
            /<title[^>]*>[^<]*(?=\s*<(?!\/title))/i, // Title tag without proper closing
            /<h[1-6][^>]*>[^<]*(?=\s*<(?!\/h[1-6]))/i, // Heading tag without proper closing
            /<p[^>]*>[^<]*(?=\s*<(?!\/p))/i // Paragraph tag without proper closing
        ];

        for (const pattern of missingClosingTags) {
            if (pattern.test(htmlContent)) {
                issues.push('Missing closing tags detected');
                isMalformed = true;
                break;
            }
        }

        // Check for improperly nested tags
        const improperNesting = [
            /<(\w+)[^>]*>.*?<(\w+)[^>]*>.*?<\/\1>/g, // Tag closed before inner tag
            /<span[^>]*>[^<]*<strong[^>]*>[^<]*<\/h[1-6]>/i, // Span with strong closed by heading
            /<em[^>]*>[^<]*<strong[^>]*>[^<]*<\/p>/i // Em with strong closed by paragraph
        ];

        for (const pattern of improperNesting) {
            const matches = htmlContent.match(pattern);
            if (matches && matches.length > 0) {
                issues.push('Improperly nested tags detected');
                isMalformed = true;
                break;
            }
        }

        // Check for broken encoding in tag attributes (more precise)
        const brokenQuotePattern = /=["'][^"']*(?=\s|>)/g;
        const brokenQuotes = htmlContent.match(brokenQuotePattern);
        if (brokenQuotes && brokenQuotes.length > 3) {
            issues.push('Broken attribute quotes detected');
            isMalformed = true;
        }

        // Check for obvious encoding issues
        const encodingIssues = [
            /â€™/g, // Common UTF-8 encoding issues
            /â€œ/g,
            /â€/g,
            /Â/g
        ];

        for (const pattern of encodingIssues) {
            if (pattern.test(htmlContent)) {
                issues.push('Character encoding issues detected');
                isMalformed = true;
                break;
            }
        }

        return {
            isMalformed,
            issues,
            severity: issues.length > 3 ? 'high' : issues.length > 1 ? 'medium' : 'low'
        };
    }

    /**
     * Repair common malformed HTML issues
     * @param {string} htmlContent - Malformed HTML content
     * @returns {string} Repaired HTML content
     */
    repairMalformedHtml(htmlContent) {
        let repaired = htmlContent;

        // Fix common malformed patterns
        const repairs = [
            // Fix unclosed angle brackets
            [/(<[^>]*[^>])(?=\s|$)/g, '$1>'],
            // Fix nested angle brackets
            [/<([^>]*)<([^>]*)>/g, '<$1&lt;$2>'],
            // Fix empty tags
            [/<\s*>/g, ''],
            // Fix broken quotes in attributes
            [/=([^"\s>]+)(?=\s|>)/g, '="$1"'],
            // Remove orphaned closing tags
            [/<\/[^>]*>/g, (match) => {
                const tagName = match.match(/<\/([^>]*)/);
                return tagName && tagName[1] ? match : '';
            }]
        ];

        for (const [pattern, replacement] of repairs) {
            repaired = repaired.replace(pattern, replacement);
        }

        return repaired;
    }

    /**
     * Extract title from HTML content
     * @param {string} htmlContent - HTML content
     * @returns {string} Extracted title
     */
    extractTitle(htmlContent) {
        // Try multiple title extraction methods
        const titlePatterns = [
            /<title[^>]*>(.*?)<\/title>/i,
            /<h1[^>]*>(.*?)<\/h1>/i,
            /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)/i,
            /<meta[^>]*name=["']title["'][^>]*content=["']([^"']*)/i
        ];

        for (const pattern of titlePatterns) {
            const match = htmlContent.match(pattern);
            if (match && match[1]) {
                return this.cleanTextContent(match[1]);
            }
        }

        return '';
    }

    /**
     * Extract headings with hierarchy preservation
     * @param {string} htmlContent - HTML content
     * @returns {Array} Array of heading objects with level and text
     */
    extractHeadings(htmlContent) {
        const headings = [];
        const headingPattern = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
        let match;

        while ((match = headingPattern.exec(htmlContent)) !== null) {
            const level = parseInt(match[1]);
            const text = this.cleanTextContent(match[2]);
            
            if (text.trim()) {
                headings.push({
                    level,
                    text,
                    position: match.index
                });
            }
        }

        return headings;
    }

    /**
     * Extract links for reference analysis
     * @param {string} htmlContent - HTML content
     * @returns {Array} Array of link objects with href and text
     */
    extractLinks(htmlContent) {
        const links = [];
        const linkPattern = /<a[^>]*href=["']([^"']*?)["'][^>]*>(.*?)<\/a>/gi;
        let match;

        while ((match = linkPattern.exec(htmlContent)) !== null) {
            const href = match[1];
            const text = this.cleanTextContent(match[2]);
            
            if (href && href.trim()) {
                links.push({
                    href: href.trim(),
                    text: text.trim(),
                    position: match.index
                });
            }
        }

        return links;
    }

    /**
     * Extract main text content with structure preservation
     * @param {string} htmlContent - HTML content
     * @returns {string} Extracted and cleaned text content
     */
    extractMainTextContent(htmlContent) {
        // Remove unwanted elements
        let processed = htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '') // Remove navigation
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '') // Remove headers
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '') // Remove footers
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '') // Remove sidebars
            .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments

        // Convert block elements to preserve structure
        processed = processed
            .replace(/<\/?(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n') // Block elements to newlines
            .replace(/<\/?(span|a|strong|em|b|i)[^>]*>/gi, ' ') // Inline elements to spaces
            .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\n\s*\n/g, '\n') // Remove empty lines
            .trim();

        return processed;
    }

    /**
     * Basic text extraction fallback method
     * @param {string} htmlContent - HTML content
     * @returns {string} Basic extracted text
     */
    basicTextExtraction(htmlContent) {
        return htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Clean and normalize text content
     * @param {string} text - Raw text content
     * @returns {string} Cleaned text content
     */
    cleanTextContent(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Find scale name matches in content with comprehensive alias checking
     * @param {string} contentLower - Lowercase content
     * @param {string} scaleName - Scale name to search for
     * @returns {Array} Array of matches found
     */
    findScaleNameMatches(contentLower, scaleName) {
        const matches = [];
        const scaleNameLower = scaleName.toLowerCase();
        
        // Direct scale name match (with word boundaries for short names)
        const isShortName = scaleNameLower.length <= 4;
        if (isShortName) {
            // Use word boundaries for short scale names to avoid false matches
            const wordBoundaryPattern = new RegExp(`\\b${scaleNameLower}\\b`, 'i');
            if (wordBoundaryPattern.test(contentLower)) {
                matches.push({ 
                    keyword: scaleName, 
                    category: 'scale_name', 
                    weight: 1.0,
                    matchType: 'direct_word_boundary'
                });
            }
        } else {
            // Use simple inclusion for longer scale names
            if (contentLower.includes(scaleNameLower)) {
                matches.push({ 
                    keyword: scaleName, 
                    category: 'scale_name', 
                    weight: 1.0,
                    matchType: 'direct'
                });
            }
        }

        // Scale name variations (underscores, hyphens, spaces)
        const variations = [
            scaleNameLower.replace(/_/g, ' '),
            scaleNameLower.replace(/_/g, '-'),
            scaleNameLower.replace(/-/g, ' '),
            scaleNameLower.replace(/-/g, '_'),
            scaleNameLower.replace(/\s+/g, '_'),
            scaleNameLower.replace(/\s+/g, '-')
        ];

        for (const variation of variations) {
            if (variation !== scaleNameLower && contentLower.includes(variation)) {
                matches.push({ 
                    keyword: variation, 
                    category: 'scale_name', 
                    weight: 0.9,
                    matchType: 'variation'
                });
            }
        }

        // Check for known aliases and alternative names
        const aliases = this.getScaleAliases(scaleNameLower);
        for (const alias of aliases) {
            if (contentLower.includes(alias.toLowerCase())) {
                matches.push({ 
                    keyword: alias, 
                    category: 'scale_name', 
                    weight: 0.8,
                    matchType: 'alias'
                });
            }
        }

        // Fuzzy matching for partial scale names
        const fuzzyMatches = this.findFuzzyScaleMatches(contentLower, scaleNameLower);
        matches.push(...fuzzyMatches);

        return matches;
    }

    /**
     * Get aliases for a given scale name
     * @param {string} scaleName - Scale name to find aliases for
     * @returns {Array} Array of aliases
     */
    getScaleAliases(scaleName) {
        const aliases = [];
        
        // Check direct aliases
        if (this.scaleAliases.hasOwnProperty(scaleName) && Array.isArray(this.scaleAliases[scaleName])) {
            aliases.push(...this.scaleAliases[scaleName]);
        }

        // Check for partial matches in alias keys
        for (const [key, values] of Object.entries(this.scaleAliases)) {
            if (scaleName.includes(key) || key.includes(scaleName)) {
                aliases.push(...values);
            }
        }

        return [...new Set(aliases)]; // Remove duplicates
    }

    /**
     * Find fuzzy matches for scale names
     * @param {string} contentLower - Lowercase content
     * @param {string} scaleNameLower - Lowercase scale name
     * @returns {Array} Array of fuzzy matches
     */
    findFuzzyScaleMatches(contentLower, scaleNameLower) {
        const matches = [];
        const words = scaleNameLower.split(/[_\s-]+/);
        
        // Check if all words from scale name appear in content
        const allWordsPresent = words.every(word => 
            word.length > 2 && contentLower.includes(word)
        );
        
        if (allWordsPresent && words.length > 1) {
            matches.push({
                keyword: words.join(' '),
                category: 'scale_name',
                weight: 0.6,
                matchType: 'fuzzy_all_words'
            });
        }

        // Check for partial word matches (at least 2 words for multi-word scales)
        if (words.length > 2) {
            const presentWords = words.filter(word => 
                word.length > 2 && contentLower.includes(word)
            );
            
            if (presentWords.length >= 2) {
                matches.push({
                    keyword: presentWords.join(' '),
                    category: 'scale_name',
                    weight: 0.4,
                    matchType: 'fuzzy_partial_words'
                });
            }
        }

        return matches;
    }

    /**
     * Find cultural context matches in content with enhanced analysis
     * @param {string} contentLower - Lowercase content
     * @param {Array} scaleKeywords - Scale-related keywords
     * @returns {Array} Array of cultural matches found
     */
    findCulturalContextMatches(contentLower, scaleKeywords) {
        const matches = [];
        
        // Check provided scale keywords
        for (const keyword of scaleKeywords) {
            if (typeof keyword === 'string' && contentLower.includes(keyword.toLowerCase())) {
                matches.push({ 
                    keyword, 
                    category: 'cultural_context', 
                    weight: 0.8,
                    source: 'provided_keywords'
                });
            }
        }

        // Check regional keywords
        for (const region of this.culturalKeywords.regions) {
            if (contentLower.includes(region.toLowerCase())) {
                matches.push({
                    keyword: region,
                    category: 'cultural_context',
                    weight: 0.7,
                    source: 'regional'
                });
            }
        }

        // Check cultural context keywords
        for (const cultural of this.culturalKeywords.cultural) {
            if (contentLower.includes(cultural.toLowerCase())) {
                matches.push({
                    keyword: cultural,
                    category: 'cultural_context',
                    weight: 0.6,
                    source: 'cultural'
                });
            }
        }

        // Check musical context keywords
        for (const musical of this.culturalKeywords.musical_contexts) {
            if (contentLower.includes(musical.toLowerCase())) {
                matches.push({
                    keyword: musical,
                    category: 'cultural_context',
                    weight: 0.8,
                    source: 'musical_context'
                });
            }
        }

        // Check for compound cultural terms (e.g., "traditional irish", "ancient greek")
        const compoundMatches = this.findCompoundCulturalMatches(contentLower);
        matches.push(...compoundMatches);

        return matches;
    }

    /**
     * Find compound cultural term matches
     * @param {string} contentLower - Lowercase content
     * @returns {Array} Array of compound cultural matches
     */
    findCompoundCulturalMatches(contentLower) {
        const matches = [];
        const culturalTerms = this.culturalKeywords.cultural;
        const regionalTerms = this.culturalKeywords.regions;
        
        // Look for combinations like "traditional irish", "ancient chinese", etc.
        for (const cultural of culturalTerms) {
            for (const regional of regionalTerms) {
                const compound1 = `${cultural} ${regional}`;
                const compound2 = `${regional} ${cultural}`;
                
                if (contentLower.includes(compound1.toLowerCase())) {
                    matches.push({
                        keyword: compound1,
                        category: 'cultural_context',
                        weight: 0.9,
                        source: 'compound_cultural_regional'
                    });
                }
                
                if (contentLower.includes(compound2.toLowerCase())) {
                    matches.push({
                        keyword: compound2,
                        category: 'cultural_context',
                        weight: 0.9,
                        source: 'compound_regional_cultural'
                    });
                }
            }
        }

        return matches;
    }

    /**
     * Find music theory term matches in content with comprehensive analysis
     * @param {string} contentLower - Lowercase content
     * @returns {Array} Array of music theory matches found
     */
    findMusicTheoryMatches(contentLower) {
        const matches = [];

        // Check scale-related terms
        for (const term of this.musicTheoryTerms.scales) {
            if (contentLower.includes(term.toLowerCase())) {
                matches.push({ 
                    keyword: term, 
                    category: 'music_theory', 
                    weight: 0.8,
                    subcategory: 'scales'
                });
            }
        }

        // Check interval-related terms
        for (const term of this.musicTheoryTerms.intervals) {
            if (contentLower.includes(term.toLowerCase())) {
                matches.push({ 
                    keyword: term, 
                    category: 'music_theory', 
                    weight: 0.7,
                    subcategory: 'intervals'
                });
            }
        }

        // Check harmony-related terms
        for (const term of this.musicTheoryTerms.harmony) {
            if (contentLower.includes(term.toLowerCase())) {
                matches.push({ 
                    keyword: term, 
                    category: 'music_theory', 
                    weight: 0.6,
                    subcategory: 'harmony'
                });
            }
        }

        // Check general theory terms
        for (const term of this.musicTheoryTerms.theory) {
            if (contentLower.includes(term.toLowerCase())) {
                matches.push({ 
                    keyword: term, 
                    category: 'music_theory', 
                    weight: 0.9,
                    subcategory: 'theory'
                });
            }
        }

        // Check structural terms
        for (const term of this.musicTheoryTerms.structure) {
            if (contentLower.includes(term.toLowerCase())) {
                matches.push({ 
                    keyword: term, 
                    category: 'music_theory', 
                    weight: 0.5,
                    subcategory: 'structure'
                });
            }
        }

        // Check for compound theory terms
        const compoundMatches = this.findCompoundTheoryMatches(contentLower);
        matches.push(...compoundMatches);

        return matches;
    }

    /**
     * Find compound music theory term matches
     * @param {string} contentLower - Lowercase content
     * @returns {Array} Array of compound theory matches
     */
    findCompoundTheoryMatches(contentLower) {
        const matches = [];
        
        // Common compound terms in music theory
        const compoundTerms = [
            'music theory', 'scale theory', 'modal theory', 'harmonic theory',
            'interval theory', 'pitch theory', 'tonal theory', 'atonal theory',
            'scale degree', 'chord tone', 'non-chord tone', 'passing tone',
            'neighbor tone', 'suspension', 'resolution', 'voice leading',
            'harmonic progression', 'melodic progression', 'chord progression',
            'scale construction', 'mode construction', 'interval construction',
            'pitch collection', 'note collection', 'tone collection'
        ];

        for (const term of compoundTerms) {
            if (contentLower.includes(term.toLowerCase())) {
                matches.push({
                    keyword: term,
                    category: 'music_theory',
                    weight: 0.8,
                    subcategory: 'compound_terms'
                });
            }
        }

        return matches;
    }

    /**
     * Find interval-related matches in content
     * @param {string} contentLower - Lowercase content
     * @returns {Array} Array of interval matches found
     */
    findIntervalMatches(contentLower) {
        const matches = [];
        const intervalTerms = [
            'interval', 'semitone', 'whole tone', 'half step', 'whole step',
            'cents', 'frequency', 'ratio', 'tuning', 'temperament'
        ];

        for (const term of intervalTerms) {
            if (contentLower.includes(term)) {
                matches.push({ keyword: term, category: 'intervals', weight: 0.4 });
            }
        }

        return matches;
    }

    /**
     * Generate enhanced relevance reason based on comprehensive analysis
     * @param {Object} result - Analysis result object
     * @param {Array} reasons - Detailed analysis reasons
     * @returns {string} Human-readable relevance reason
     */
    generateEnhancedRelevanceReason(result, reasons) {
        const score = result.score;
        const confidence = result.confidence;
        const matchCount = result.keywordMatches.length;

        if (score >= 0.8 && confidence >= 0.7) {
            return `High relevance (${Math.round(score * 100)}% score, ${Math.round(confidence * 100)}% confidence): ${reasons.join(', ')}`;
        } else if (score >= 0.6 && confidence >= 0.5) {
            return `Good relevance (${Math.round(score * 100)}% score, ${Math.round(confidence * 100)}% confidence): ${reasons.join(', ')}`;
        } else if (score >= this.minRelevanceScore && confidence >= 0.3) {
            return `Moderate relevance (${Math.round(score * 100)}% score, ${Math.round(confidence * 100)}% confidence): ${reasons.join(', ')}`;
        } else if (score >= this.minRelevanceScore) {
            return `Low confidence relevance (${Math.round(score * 100)}% score, ${Math.round(confidence * 100)}% confidence): Content may be relevant but analysis is uncertain`;
        } else if (matchCount > 0) {
            return `Insufficient relevance (${Math.round(score * 100)}% score): Found ${matchCount} matches but content lacks scale-specific focus`;
        } else {
            return `No relevance detected: No scale-specific keywords or content found in analyzed text`;
        }
    }

    /**
     * Generate relevance reason based on analysis result (legacy method for compatibility)
     * @param {Object} result - Analysis result object
     * @returns {string} Human-readable relevance reason
     */
    generateRelevanceReason(result) {
        if (result.score >= 0.7) {
            return `High relevance: Found ${result.keywordMatches.length} relevant keywords with strong scale-specific content`;
        } else if (result.score >= this.minRelevanceScore) {
            return `Moderate relevance: Found ${result.keywordMatches.length} relevant keywords with some scale-related content`;
        } else if (result.keywordMatches.length > 0) {
            return `Low relevance: Found ${result.keywordMatches.length} keywords but insufficient scale-specific content`;
        } else {
            return 'No relevance: No scale-specific keywords or content found';
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentAnalyzer;
} else if (typeof window !== 'undefined') {
    window.ContentAnalyzer = ContentAnalyzer;
}