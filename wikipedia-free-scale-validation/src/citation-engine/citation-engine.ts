import { CitationResult, ErrorDetails, ContentMatchDiagnostics } from '../interfaces';

export interface CitationEngineConfig {
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export class CitationEngine {
  private config: Required<CitationEngineConfig>;

  constructor(config: CitationEngineConfig = {}) {
    this.config = {
      timeoutMs: config.timeoutMs ?? 10000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  async validateCitation(url: string, expectedTitle: string): Promise<CitationResult> {
    const result: CitationResult = {
      url,
      title: expectedTitle,
      accessible: false,
      contentMatch: false,
      httpStatus: 0,
      notes: []
    };

    try {
      // Validate URL format
      new URL(url);
      
      // Reject Wikipedia sources
      if (this.isWikipediaSource(url)) {
        result.notes.push('Wikipedia source rejected');
        result.errorDetails = {
          category: 'source',
          severity: 'medium',
          code: 'WIKIPEDIA_REJECTED',
          message: 'Wikipedia sources are not allowed per system requirements',
          suggestedFix: 'Use approved non-Wikipedia sources like teoria.com, musictheory.net, or britannica.com',
          timestamp: new Date(),
          retryable: false
        };
        return result;
      }

      const response = await this.fetchWithRetry(url);
      result.httpStatus = response.status;
      result.accessible = response.ok;

      if (response.ok) {
        const content = await response.text();
        const contentMatchResult = this.contentMatchesWithDiagnostics(content, expectedTitle);
        result.contentMatch = contentMatchResult.matches;
        result.contentMatchDiagnostics = contentMatchResult.diagnostics;
        
        if (!result.contentMatch) {
          result.notes.push('Content does not match expected title keywords');
          result.errorDetails = {
            category: 'content',
            severity: 'medium',
            code: 'CONTENT_MISMATCH',
            message: `Content validation failed: ${contentMatchResult.diagnostics.missingKeywords.length} of ${contentMatchResult.diagnostics.expectedKeywords.length} keywords missing`,
            suggestedFix: `Verify that the source contains information about "${expectedTitle}". Missing keywords: ${contentMatchResult.diagnostics.missingKeywords.join(', ')}`,
            timestamp: new Date(),
            retryable: false
          };
        }
      } else {
        result.notes.push(`HTTP error: ${response.status} ${response.statusText}`);
        result.errorDetails = this.createAccessibilityErrorDetails(response.status, response.statusText, url);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.notes.push(`Validation error: ${errorMessage}`);
      result.errorDetails = this.createNetworkErrorDetails(error, url);
    }

    return result;
  }

  async verifyScaleExistsOnline(scaleName: string, culturalContext?: string): Promise<boolean> {
    const searchTerms = [scaleName];
    if (culturalContext) {
      searchTerms.push(`${scaleName} ${culturalContext}`);
      searchTerms.push(`${culturalContext} ${scaleName}`);
    }

    // This is a simplified implementation - in a real system this would
    // search across multiple approved sources
    for (const term of searchTerms) {
      try {
        // For now, we'll simulate a search by checking if the term
        // appears to be a valid scale name (basic validation)
        if (this.isValidScaleName(term)) {
          return true;
        }
      } catch (error) {
        // Continue to next search term
      }
    }

    return false;
  }

  async searchMultipleSources(scaleName: string, sourceList: string[]): Promise<any[]> {
    const results = [];
    
    for (const source of sourceList) {
      try {
        // This would normally perform actual searches against each source
        // For now, we'll return a placeholder structure
        const searchResult = {
          source,
          found: this.isValidScaleName(scaleName),
          url: `${source}/search?q=${encodeURIComponent(scaleName)}`,
          confidence: 0.8
        };
        results.push(searchResult);
      } catch (error) {
        results.push({
          source,
          found: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScaleValidator/1.0)',
        ...options.headers
      }
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelayMs * attempt);
        }
      }
    }

    clearTimeout(timeoutId);
    throw lastError || new Error('Fetch failed after all retry attempts');
  }

  contentMatches(pageContent: string, referenceTitle: string): boolean {
    if (!pageContent || !referenceTitle) {
      return false;
    }

    const titleKeywords = this.buildTitleKeywords(referenceTitle);
    const contentLower = pageContent.toLowerCase();
    
    // Require at least 60% of keywords to be present
    const matchThreshold = 0.6;
    let matchedKeywords = 0;

    for (const keyword of titleKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        matchedKeywords++;
      }
    }

    return (matchedKeywords / titleKeywords.length) >= matchThreshold;
  }

  buildTitleKeywords(title: string): string[] {
    if (!title || title.trim().length === 0) {
      return [];
    }

    // Clean and split the title into meaningful keywords
    const cleaned = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (cleaned.length === 0) {
      return [];
    }

    const words = cleaned.split(' ').filter(word => word.length > 0);
    
    // Filter out common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
      'its', 'it'
    ]);

    const keywords = words.filter(word => 
      word.length >= 2 && !stopWords.has(word)
    );

    // Include the original title as a potential exact match
    if (title.trim().length > 0) {
      keywords.push(title.toLowerCase());
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  private isWikipediaSource(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('wikipedia.org') || 
             urlObj.hostname.includes('wikimedia.org');
    } catch {
      return false;
    }
  }

  private isValidScaleName(scaleName: string): boolean {
    // Basic validation for scale names
    if (!scaleName || scaleName.trim().length < 2) {
      return false;
    }

    // Check for common scale patterns
    const scalePatterns = [
      /major/i, /minor/i, /dorian/i, /phrygian/i, /lydian/i, /mixolydian/i,
      /aeolian/i, /locrian/i, /pentatonic/i, /blues/i, /chromatic/i, /whole.?tone/i,
      /diminished/i, /augmented/i, /harmonic/i, /melodic/i, /natural/i,
      /scale/i, /mode/i
    ];

    return scalePatterns.some(pattern => pattern.test(scaleName));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private contentMatchesWithDiagnostics(pageContent: string, referenceTitle: string): { matches: boolean; diagnostics: ContentMatchDiagnostics } {
    const diagnostics: ContentMatchDiagnostics = {
      expectedKeywords: [],
      foundKeywords: [],
      missingKeywords: [],
      matchPercentage: 0,
      contentLength: pageContent ? pageContent.length : 0,
      searchStrategy: 'keyword-based'
    };

    if (!pageContent || !referenceTitle) {
      diagnostics.expectedKeywords = this.buildTitleKeywords(referenceTitle || '');
      diagnostics.missingKeywords = [...diagnostics.expectedKeywords];
      return { matches: false, diagnostics };
    }

    const titleKeywords = this.buildTitleKeywords(referenceTitle);
    diagnostics.expectedKeywords = titleKeywords;
    
    const contentLower = pageContent.toLowerCase();
    
    // Check which keywords are found
    for (const keyword of titleKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        diagnostics.foundKeywords.push(keyword);
      } else {
        diagnostics.missingKeywords.push(keyword);
      }
    }

    // Calculate match percentage
    diagnostics.matchPercentage = titleKeywords.length > 0 
      ? (diagnostics.foundKeywords.length / titleKeywords.length) 
      : 0;

    // Require at least 60% of keywords to be present
    const matchThreshold = 0.6;
    const matches = diagnostics.matchPercentage >= matchThreshold;

    return { matches, diagnostics };
  }

  private createAccessibilityErrorDetails(httpStatus: number, statusText: string, url: string): ErrorDetails {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let code = 'HTTP_ERROR';
    let suggestedFix = 'Check if the URL is correct and the server is accessible';
    let retryable = true;

    // Categorize HTTP errors
    if (httpStatus >= 400 && httpStatus < 500) {
      // Client errors
      severity = 'high';
      retryable = false;
      
      switch (httpStatus) {
        case 404:
          code = 'NOT_FOUND';
          suggestedFix = 'Verify the URL path is correct or try an alternative source';
          break;
        case 403:
          code = 'FORBIDDEN';
          suggestedFix = 'The source may require authentication or have access restrictions';
          break;
        case 401:
          code = 'UNAUTHORIZED';
          suggestedFix = 'Authentication may be required to access this source';
          break;
        default:
          code = 'CLIENT_ERROR';
          suggestedFix = `Client error (${httpStatus}): Check the request format and URL`;
      }
    } else if (httpStatus >= 500) {
      // Server errors
      severity = 'medium';
      retryable = true;
      code = 'SERVER_ERROR';
      suggestedFix = 'Server error - try again later or use an alternative source';
    } else if (httpStatus === 0) {
      // Network/connection errors
      severity = 'high';
      retryable = true;
      code = 'NETWORK_ERROR';
      suggestedFix = 'Check network connectivity and DNS resolution';
    }

    return {
      category: 'network',
      severity,
      code,
      message: `HTTP ${httpStatus}: ${statusText} for URL ${url}`,
      suggestedFix,
      timestamp: new Date(),
      retryable
    };
  }

  private createNetworkErrorDetails(error: unknown, url: string): ErrorDetails {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let code = 'NETWORK_ERROR';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';
    let suggestedFix = 'Check network connectivity and try again';
    let retryable = true;

    // Categorize network errors
    if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      code = 'TIMEOUT';
      suggestedFix = 'Increase timeout duration or check if the server is responding slowly';
    } else if (errorMessage.includes('DNS') || errorMessage.includes('ENOTFOUND')) {
      code = 'DNS_ERROR';
      suggestedFix = 'Check if the domain name is correct and DNS is resolving properly';
      retryable = false;
    } else if (errorMessage.includes('SSL') || errorMessage.includes('certificate')) {
      code = 'SSL_ERROR';
      suggestedFix = 'SSL certificate issue - verify the site uses valid HTTPS certificates';
    } else if (errorMessage.includes('AbortError') || errorMessage.includes('aborted')) {
      code = 'REQUEST_ABORTED';
      severity = 'medium';
      suggestedFix = 'Request was cancelled - this may be due to timeout or system constraints';
    }

    return {
      category: 'network',
      severity,
      code,
      message: `Network error for ${url}: ${errorMessage}`,
      suggestedFix,
      timestamp: new Date(),
      retryable
    };
  }
}