import { Scale_Database, ScaleData, ValidationResult, StoredScale } from '../interfaces';

/**
 * In-memory implementation of Scale_Database interface
 * Manages scale storage, retrieval, and verification status tracking
 */
export class ScaleDatabase implements Scale_Database {
  private scales: Map<string, StoredScale> = new Map();

  async getScale(scaleId: string): Promise<ScaleData | null> {
    const storedScale = this.scales.get(scaleId);
    if (!storedScale) {
      return null;
    }

    // Only return verified scales
    if (!storedScale.isVerified) {
      return null;
    }

    return {
      id: storedScale.id,
      name: storedScale.name,
      culturalContext: storedScale.culturalContext,
      notes: storedScale.notes,
      intervals: storedScale.intervals,
      description: storedScale.description
    };
  }

  async getAllScales(): Promise<ScaleData[]> {
    const allScales: ScaleData[] = [];
    
    for (const storedScale of this.scales.values()) {
      // Only include verified scales in the general listing
      if (storedScale.isVerified) {
        allScales.push({
          id: storedScale.id,
          name: storedScale.name,
          culturalContext: storedScale.culturalContext,
          notes: storedScale.notes,
          intervals: storedScale.intervals,
          description: storedScale.description
        });
      }
    }

    return allScales;
  }

  async addScale(scale: ScaleData, validationResult: ValidationResult): Promise<void> {
    const isVerified = this.hasAuthoritativeSource(validationResult);
    
    const storedScale: StoredScale = {
      ...scale,
      validationResult,
      isVerified,
      lastValidated: new Date()
    };

    // If no authoritative source, mark as unverified
    if (!isVerified) {
      storedScale.unverifiedReason = 'No authoritative non-Wikipedia source found';
    }

    this.scales.set(scale.id, storedScale);
  }

  async updateScale(scaleId: string, scale: ScaleData, validationResult: ValidationResult): Promise<void> {
    const existingScale = this.scales.get(scaleId);
    if (!existingScale) {
      throw new Error(`Scale with ID ${scaleId} not found`);
    }

    const isVerified = this.hasAuthoritativeSource(validationResult);
    
    const updatedScale: StoredScale = {
      ...scale,
      validationResult,
      isVerified,
      lastValidated: new Date(),
      unverifiedReason: isVerified ? undefined : 'No authoritative non-Wikipedia source found'
    };

    this.scales.set(scaleId, updatedScale);
  }

  async removeScale(scaleId: string): Promise<void> {
    this.scales.delete(scaleId);
  }

  async getScalesByStatus(status: 'verified' | 'unverified' | 'pending'): Promise<ScaleData[]> {
    const filteredScales: ScaleData[] = [];

    for (const storedScale of this.scales.values()) {
      let includeScale = false;

      switch (status) {
        case 'verified':
          includeScale = storedScale.isVerified;
          break;
        case 'unverified':
          includeScale = !storedScale.isVerified && !!storedScale.unverifiedReason;
          break;
        case 'pending':
          includeScale = storedScale.validationResult.status === 'pending';
          break;
      }

      if (includeScale) {
        filteredScales.push({
          id: storedScale.id,
          name: storedScale.name,
          culturalContext: storedScale.culturalContext,
          notes: storedScale.notes,
          intervals: storedScale.intervals,
          description: storedScale.description
        });
      }
    }

    return filteredScales;
  }

  async markScaleAsUnverified(scaleId: string, reason: string): Promise<void> {
    const storedScale = this.scales.get(scaleId);
    if (!storedScale) {
      throw new Error(`Scale with ID ${scaleId} not found`);
    }

    storedScale.isVerified = false;
    storedScale.unverifiedReason = reason;
    storedScale.lastValidated = new Date();
  }

  async getValidationResult(scaleId: string): Promise<ValidationResult | null> {
    const storedScale = this.scales.get(scaleId);
    return storedScale ? storedScale.validationResult : null;
  }

  async requiresAuthoritativeSource(scaleId: string): Promise<boolean> {
    const storedScale = this.scales.get(scaleId);
    if (!storedScale) {
      return true; // New scales require authoritative sources
    }

    return !this.hasAuthoritativeSource(storedScale.validationResult);
  }

  /**
   * Checks if a validation result contains at least one authoritative non-Wikipedia source
   */
  private hasAuthoritativeSource(validationResult: ValidationResult): boolean {
    // Check if any sources are verified and accessible
    const hasValidSource = validationResult.sources.some(source => 
      source.accessible && 
      source.contentMatch && 
      !this.isWikipediaSource(source.url)
    );

    // Also check validation status
    const isValidated = validationResult.status === 'verified';

    return hasValidSource && isValidated;
  }

  /**
   * Checks if a URL is from Wikipedia
   */
  private isWikipediaSource(url: string): boolean {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.includes('wikipedia.org') || hostname.includes('wikimedia.org');
    } catch {
      return false;
    }
  }

  /**
   * Get all stored scales including unverified ones (for testing/admin purposes)
   */
  async getAllStoredScales(): Promise<StoredScale[]> {
    return Array.from(this.scales.values());
  }

  /**
   * Clear all scales (for testing purposes)
   */
  async clearAll(): Promise<void> {
    this.scales.clear();
  }
}