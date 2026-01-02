import { InternetVerificationResult, ApprovedSource } from '../interfaces';

export interface SearchResult {
  source: string;
  found: boolean;
  url?: string;
  confidence: number;
  content?: string;
  error?: string;
}

export interface CrossReferenceResult {
  independentConfirmations: number;
  sourcesFound: number;
  confidence: number;
  consistentFindings: boolean;
}

export class InternetVerifier {
  private timeoutMs: number;
  private retryAttempts: number;
  private minConfidenceThreshold: number;

  constructor(timeoutMs: number = 10000, retryAttempts: number = 3, minConfidenceThreshold: number = 0.6) {
    this.timeoutMs = timeoutMs;
    this.retryAttempts = retryAttempts;
    this.minConfidenceThreshold = minConfidenceThreshold;
  }

  async verifyScaleExists(scaleName: string, culturalContext?: string): Promise<InternetVerificationResult> {
    const searchQueries = this.generateSearchQueries(scaleName, culturalContext);
    const approvedSources = this.getDefaultApprovedSources();
    
    const allSearchResults: SearchResult[] = [];
    
    // Search across all approved sources with all queries
    for (const query of searchQueries) {
      const sourceResults = await this.searchAcrossSources(query, approvedSources.map(s => s.hostname));
      allSearchResults.push(...sourceResults);
    }

    const crossRefResult = await this.crossReferenceResults(allSearchResults);
    const foundSources = allSearchResults
      .filter(result => result.found && result.confidence >= this.minConfidenceThreshold)
      .map(result => result.source);

    return {
      scaleExists: crossRefResult.independentConfirmations >= 2,
      sourcesFound: crossRefResult.sourcesFound,
      independentConfirmations: crossRefResult.independentConfirmations,
      searchQueries,
      foundSources: [...new Set(foundSources)], // Remove duplicates
      confidence: crossRefResult.confidence,
      notes: this.generateVerificationNotes(crossRefResult, allSearchResults)
    };
  }

  async searchAcrossSources(query: string, sourceList: string[]): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const source of sourceList) {
      try {
        const searchResult = await this.searchSingleSource(query, source);
        results.push(searchResult);
      } catch (error) {
        results.push({
          source,
          found: false,
          confidence: 0,
          error: error instanceof Error ? error.message : 'Unknown search error'
        });
      }
    }

    return results;
  }

  async crossReferenceResults(searchResults: SearchResult[]): Promise<CrossReferenceResult> {
    const validResults = searchResults.filter(result => 
      result.found && result.confidence >= this.minConfidenceThreshold && !result.error
    );

    const uniqueSources = new Set(validResults.map(result => result.source));
    const sourcesFound = uniqueSources.size;
    const independentConfirmations = validResults.length;

    // Calculate overall confidence based on number of confirmations and their individual confidence scores
    let totalConfidence = 0;
    if (validResults.length > 0) {
      const avgConfidence = validResults.reduce((sum, result) => sum + result.confidence, 0) / validResults.length;
      const sourceBonus = Math.min(sourcesFound / 3, 1); // Bonus for source diversity, capped at 1
      totalConfidence = Math.min(avgConfidence * (1 + sourceBonus * 0.3), 1);
    }

    // Check for consistency in findings - use all found results, not just valid ones
    const foundResults = searchResults.filter(result => result.found && !result.error);
    const consistentFindings = this.checkConsistency(foundResults);

    return {
      independentConfirmations,
      sourcesFound,
      confidence: totalConfidence,
      consistentFindings
    };
  }

  detectPotentialHallucination(scaleInfo: any, searchResults: SearchResult[]): 'low' | 'medium' | 'high' {
    const validResults = searchResults.filter(result => result.found && !result.error);
    const uniqueSources = new Set(validResults.map(result => result.source));

    // High risk if no independent confirmations
    if (uniqueSources.size === 0) {
      return 'high';
    }

    // High risk if only one source confirms
    if (uniqueSources.size === 1) {
      return 'high';
    }

    // Medium risk if low confidence or inconsistent results
    const avgConfidence = validResults.reduce((sum, result) => sum + result.confidence, 0) / validResults.length;
    if (avgConfidence < 0.5 || !this.checkConsistency(validResults)) {
      return 'medium';
    }

    // Low risk if multiple sources with high confidence
    if (uniqueSources.size >= 2 && avgConfidence >= 0.7) {
      return 'low';
    }

    return 'medium';
  }

  generateVerificationReport(scaleName: string, findings: InternetVerificationResult): any {
    return {
      scaleName,
      timestamp: new Date().toISOString(),
      verification: findings,
      summary: {
        verified: findings.scaleExists,
        confidence: findings.confidence,
        sourceCount: findings.sourcesFound,
        confirmations: findings.independentConfirmations
      },
      recommendations: this.generateRecommendations(findings)
    };
  }

  private generateSearchQueries(scaleName: string, culturalContext?: string): string[] {
    const queries = [scaleName];
    
    if (culturalContext) {
      queries.push(`${scaleName} ${culturalContext}`);
      queries.push(`${culturalContext} ${scaleName}`);
      queries.push(`${scaleName} scale ${culturalContext}`);
    }
    
    // Add common scale-related terms
    queries.push(`${scaleName} scale`);
    queries.push(`${scaleName} mode`);
    
    return [...new Set(queries)]; // Remove duplicates
  }

  private async searchSingleSource(query: string, source: string): Promise<SearchResult> {
    try {
      // Simulate search by checking if the source would likely contain the scale
      // In a real implementation, this would make actual HTTP requests to search endpoints
      const searchUrl = `https://${source}/search?q=${encodeURIComponent(query)}`;
      
      // For now, we'll simulate based on source reliability and query characteristics
      const confidence = this.calculateSearchConfidence(query, source);
      const found = confidence >= this.minConfidenceThreshold;

      return {
        source,
        found,
        url: searchUrl,
        confidence,
        content: found ? `Mock content for ${query} from ${source}` : undefined
      };
    } catch (error) {
      return {
        source,
        found: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  private calculateSearchConfidence(query: string, source: string): number {
    // Base confidence based on source reliability
    const sourceReliability = this.getSourceReliability(source);
    
    // Boost confidence for well-formed scale queries
    let queryBonus = 0;
    if (query.toLowerCase().includes('scale') || query.toLowerCase().includes('mode')) {
      queryBonus += 0.2;
    }
    
    // Check for common scale names
    const commonScales = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'pentatonic', 'blues'];
    if (commonScales.some(scale => query.toLowerCase().includes(scale))) {
      queryBonus += 0.3;
    }

    return Math.min(sourceReliability + queryBonus, 1.0);
  }

  private getSourceReliability(source: string): number {
    // Map sources to their reliability scores
    const reliabilityMap: { [key: string]: number } = {
      'teoria.com': 0.9,
      'musictheory.net': 0.85,
      'britannica.com': 0.8,
      'maqamworld.com': 0.75,
      'tenney-zen.com': 0.7,
      'jazz-library.com': 0.7
    };

    return reliabilityMap[source] || 0.5; // Default reliability for unknown sources
  }

  private checkConsistency(results: SearchResult[]): boolean {
    if (results.length < 2) {
      return true; // Can't check consistency with less than 2 results
    }

    // Check if confidence scores are reasonably similar
    const confidences = results.map(r => r.confidence);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const maxDeviation = Math.max(...confidences.map(conf => Math.abs(conf - avgConfidence)));

    // Consider consistent if no result deviates more than 0.3 from average
    return maxDeviation <= 0.3;
  }

  private generateVerificationNotes(crossRefResult: CrossReferenceResult, searchResults: SearchResult[]): string[] {
    const notes: string[] = [];
    
    if (crossRefResult.independentConfirmations === 0) {
      notes.push('No sources found containing this scale');
    } else if (crossRefResult.independentConfirmations === 1) {
      notes.push('Only one source confirmation - high hallucination risk');
    } else if (crossRefResult.independentConfirmations >= 2) {
      notes.push(`${crossRefResult.independentConfirmations} independent confirmations found`);
    }

    if (!crossRefResult.consistentFindings) {
      notes.push('Inconsistent findings across sources - requires manual review');
    }

    const errorCount = searchResults.filter(r => r.error).length;
    if (errorCount > 0) {
      notes.push(`${errorCount} sources had search errors`);
    }

    return notes;
  }

  private generateRecommendations(findings: InternetVerificationResult): string[] {
    const recommendations: string[] = [];

    if (!findings.scaleExists) {
      recommendations.push('Scale not verified - consider marking as unverifiable');
      recommendations.push('Manual research recommended before inclusion');
    } else if (findings.confidence < 0.7) {
      recommendations.push('Low confidence verification - additional sources recommended');
    } else if (findings.independentConfirmations < 3) {
      recommendations.push('Consider finding additional source confirmations');
    }

    if (findings.sourcesFound < 2) {
      recommendations.push('Increase source diversity for better verification');
    }

    return recommendations;
  }

  private getDefaultApprovedSources(): ApprovedSource[] {
    return [
      {
        hostname: 'teoria.com',
        priority: 10,
        scaleTypes: ['*'],
        reliability: 0.9,
        accessPattern: 'search'
      },
      {
        hostname: 'musictheory.net',
        priority: 9,
        scaleTypes: ['*'],
        reliability: 0.85,
        accessPattern: 'search'
      },
      {
        hostname: 'britannica.com',
        priority: 8,
        scaleTypes: ['*'],
        reliability: 0.8,
        accessPattern: 'search'
      },
      {
        hostname: 'maqamworld.com',
        priority: 7,
        scaleTypes: ['middle-eastern', 'arabic', 'turkish'],
        reliability: 0.75,
        accessPattern: 'search'
      }
    ];
  }
}