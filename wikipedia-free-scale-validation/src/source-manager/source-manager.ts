import { ApprovedSource } from '../interfaces';

export class SourceManager {
  private approvedSources: ApprovedSource[];
  private timeoutMs: number;
  private retryAttempts: number;

  constructor(approvedSources: ApprovedSource[], timeoutMs: number = 5000, retryAttempts: number = 3) {
    this.approvedSources = approvedSources;
    this.timeoutMs = timeoutMs;
    this.retryAttempts = retryAttempts;
  }

  /**
   * Creates a default configuration with regional scale support
   * Includes jazz education sites, academic sources, and culturally appropriate sources
   */
  static createDefaultRegionalConfiguration(): ApprovedSource[] {
    return [
      // Traditional music theory sources
      {
        hostname: 'teoria.com',
        priority: 8,
        scaleTypes: ['major', 'minor', 'modal', '*'],
        reliability: 0.95,
        accessPattern: 'direct',
        sourceType: 'generic'
      },
      {
        hostname: 'musictheory.net',
        priority: 7,
        scaleTypes: ['*'],
        reliability: 0.90,
        accessPattern: 'direct',
        sourceType: 'generic'
      },
      
      // Cultural and regional sources
      {
        hostname: 'maqamworld.com',
        priority: 9,
        scaleTypes: ['maqam', 'middle-eastern', 'arabic', '*'],
        reliability: 0.95,
        accessPattern: 'direct',
        culturalContext: ['middle-eastern', 'arabic', 'turkish'],
        sourceType: 'cultural'
      },
      {
        hostname: 'ragas.org',
        priority: 9,
        scaleTypes: ['raga', 'indian', 'carnatic', '*'],
        reliability: 0.90,
        accessPattern: 'direct',
        culturalContext: ['indian', 'south-asian'],
        sourceType: 'cultural'
      },
      
      // Jazz education sources
      {
        hostname: 'jazzhistory.org',
        priority: 8,
        scaleTypes: ['jazz', 'bebop', 'modal', 'blues'],
        reliability: 0.85,
        accessPattern: 'search',
        culturalContext: ['american', 'jazz'],
        sourceType: 'jazz'
      },
      {
        hostname: 'berklee.edu',
        priority: 9,
        scaleTypes: ['jazz', 'contemporary', 'fusion', '*'],
        reliability: 0.95,
        accessPattern: 'search',
        culturalContext: ['american', 'jazz'],
        sourceType: 'jazz'
      },
      
      // Academic sources
      {
        hostname: 'britannica.com',
        priority: 8,
        scaleTypes: ['classical', 'world', 'ethnomusicology', '*'],
        reliability: 0.90,
        accessPattern: 'search',
        sourceType: 'academic'
      },
      {
        hostname: 'oxford.com',
        priority: 9,
        scaleTypes: ['classical', 'world', 'ethnomusicology', '*'],
        reliability: 0.95,
        accessPattern: 'search',
        sourceType: 'academic'
      }
    ];
  }

  async validateSourceAccessibility(url: string): Promise<boolean> {
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ScaleValidator/1.0)'
          }
        });

        clearTimeout(timeoutId);

        // Consider 2xx and 3xx status codes as accessible
        if (response.status >= 200 && response.status < 400) {
          return true;
        }

        // If we get a 4xx or 5xx error, don't retry immediately
        if (response.status >= 400) {
          // Wait before retry for server errors (5xx)
          if (response.status >= 500 && attempt < this.retryAttempts - 1) {
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
            continue;
          }
          return false;
        }
      } catch (error) {
        // Network errors, timeouts, etc.
        if (attempt < this.retryAttempts - 1) {
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
          continue;
        }
        return false;
      }
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validateAllApprovedSources(): Promise<{ [hostname: string]: boolean }> {
    const results: { [hostname: string]: boolean } = {};
    
    // Test each approved source with a basic URL
    for (const source of this.approvedSources) {
      const testUrl = `https://${source.hostname}`;
      try {
        results[source.hostname] = await this.validateSourceAccessibility(testUrl);
      } catch (error) {
        results[source.hostname] = false;
      }
    }
    
    return results;
  }

  getSourcesByPriority(scaleType?: string, culturalContext?: string): ApprovedSource[] {
    let sources = this.approvedSources;
    
    if (scaleType) {
      sources = sources.filter(source => 
        source.scaleTypes.includes(scaleType) || 
        source.scaleTypes.includes('*')
      );
    }
    
    // Apply cultural context prioritization for regional scales
    if (culturalContext) {
      sources = this.prioritizeByCulturalContext(sources, culturalContext);
    }
    
    return sources.sort((a, b) => b.priority - a.priority);
  }

  private prioritizeByCulturalContext(sources: ApprovedSource[], culturalContext: string): ApprovedSource[] {
    // Boost priority for culturally appropriate sources
    return sources.map(source => {
      if (source.culturalContext && source.culturalContext.includes(culturalContext)) {
        // Create a copy with boosted priority for cultural matching
        return {
          ...source,
          priority: source.priority + 2 // Boost culturally appropriate sources
        };
      }
      return source;
    });
  }

  getSourcesByRegionalPriority(scaleType: string, culturalContext: string): ApprovedSource[] {
    // Get sources that match the scale type
    let sources = this.approvedSources.filter(source => 
      source.scaleTypes.includes(scaleType) || 
      source.scaleTypes.includes('*')
    );

    // Separate culturally appropriate sources from generic ones
    const culturalSources = sources.filter(source => 
      source.culturalContext && source.culturalContext.includes(culturalContext)
    );
    
    const genericSources = sources.filter(source => 
      !source.culturalContext || !source.culturalContext.includes(culturalContext)
    );

    // Sort each group by priority, then combine with cultural sources first
    const sortedCultural = culturalSources.sort((a, b) => b.priority - a.priority);
    const sortedGeneric = genericSources.sort((a, b) => b.priority - a.priority);

    return [...sortedCultural, ...sortedGeneric];
  }

  supportsSourceType(sourceType: 'jazz' | 'academic' | 'cultural'): boolean {
    return this.approvedSources.some(source => 
      source.sourceType === sourceType
    );
  }

  isSourceApproved(url: string): boolean {
    const hostname = new URL(url).hostname.toLowerCase();
    return this.approvedSources.some(source => 
      source.hostname.toLowerCase() === hostname
    );
  }

  getBackupSources(primarySource: string): ApprovedSource[] {
    const primaryHostname = new URL(primarySource).hostname.toLowerCase();
    return this.approvedSources
      .filter(source => source.hostname.toLowerCase() !== primaryHostname)
      .sort((a, b) => b.priority - a.priority);
  }
}