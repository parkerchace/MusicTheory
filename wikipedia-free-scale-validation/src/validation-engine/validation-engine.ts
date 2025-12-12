import { ValidationResult, ScaleData, ApprovedSource, CitationResult, InternetVerificationResult, ValidationErrorSummary, ErrorDetails } from '../interfaces';
import { SourceManager } from '../source-manager';
import { CitationEngine } from '../citation-engine';
import { InternetVerifier } from '../internet-verifier';

export interface ValidationSummary {
  totalScales: number;
  verifiedScales: number;
  failedScales: number;
  unverifiableScales: number;
  wikipediaRejections: number;
  backupSourceUsage: number;
  sourceDiversity: { [hostname: string]: number };
}

export class ValidationEngine {
  private sourceManager: SourceManager;
  private citationEngine: CitationEngine;
  private internetVerifier: InternetVerifier;
  private validationSummary: ValidationSummary;

  constructor(sourceManager: SourceManager, citationEngine: CitationEngine, internetVerifier: InternetVerifier) {
    this.sourceManager = sourceManager;
    this.citationEngine = citationEngine;
    this.internetVerifier = internetVerifier;
    this.validationSummary = {
      totalScales: 0,
      verifiedScales: 0,
      failedScales: 0,
      unverifiableScales: 0,
      wikipediaRejections: 0,
      backupSourceUsage: 0,
      sourceDiversity: {}
    };
  }

  async validateScale(scaleId: string, scaleData: ScaleData): Promise<ValidationResult> {
    this.validationSummary.totalScales++;

    const result: ValidationResult = {
      scaleId,
      status: 'pending',
      sources: [],
      internetVerification: {
        scaleExists: false,
        sourcesFound: 0,
        independentConfirmations: 0,
        searchQueries: [],
        foundSources: [],
        confidence: 0,
        notes: []
      },
      primarySource: '',
      backupSources: [],
      validatedAt: new Date(),
      hallucinationRisk: 'high'
    };

    try {
      // Step 1: Get prioritized sources for this scale type
      const prioritizedSources = this.sourceManager.getSourcesByPriority(scaleData.culturalContext);
      
      if (prioritizedSources.length === 0) {
        result.status = 'unverifiable';
        result.internetVerification.notes.push('No approved sources available');
        this.validationSummary.unverifiableScales++;
        return result;
      }

      // Step 2: Attempt validation with primary source
      let validationSuccess = false;
      let primarySourceUsed = false;

      for (const source of prioritizedSources) {
        // Reject Wikipedia sources (Requirements 1.1)
        if (this.isWikipediaSource(source.hostname)) {
          this.validationSummary.wikipediaRejections++;
          continue;
        }

        // Try to validate with this source
        const citationResult = await this.validateWithSource(scaleData, source);
        result.sources.push(citationResult);

        if (citationResult.accessible && citationResult.contentMatch) {
          if (!primarySourceUsed) {
            result.primarySource = `https://${source.hostname}`;
            primarySourceUsed = true;
            validationSuccess = true;
          }
          
          // Track source diversity
          this.validationSummary.sourceDiversity[source.hostname] = 
            (this.validationSummary.sourceDiversity[source.hostname] || 0) + 1;
          
          break;
        }
      }

      // Step 3: If primary validation failed, try backup sources (Requirements 1.4, 1.5)
      if (!validationSuccess) {
        // Get backup sources from all available sources since primary failed
        const backupSources = prioritizedSources.slice(1); // Skip the first source that already failed
        result.backupSources = backupSources.map(s => `https://${s.hostname}`);

        for (const backupSource of backupSources) {
          // Reject Wikipedia backup sources
          if (this.isWikipediaSource(backupSource.hostname)) {
            this.validationSummary.wikipediaRejections++;
            continue;
          }

          const backupResult = await this.validateWithSource(scaleData, backupSource);
          result.sources.push(backupResult);

          if (backupResult.accessible && backupResult.contentMatch) {
            validationSuccess = true;
            result.primarySource = `https://${backupSource.hostname}`; // Set primary source to successful backup
            this.validationSummary.backupSourceUsage++;
            
            // Track source diversity
            this.validationSummary.sourceDiversity[backupSource.hostname] = 
              (this.validationSummary.sourceDiversity[backupSource.hostname] || 0) + 1;
            
            break;
          }
        }
      }

      // Step 4: Perform internet verification
      result.internetVerification = await this.internetVerifier.verifyScaleExists(
        scaleData.name, 
        scaleData.culturalContext
      );

      // Step 5: Determine final validation status
      // Requirement 3.2: Both HTTP accessibility and content relevance validation must be performed
      if (validationSuccess && result.internetVerification.scaleExists) {
        result.status = 'verified';
        result.hallucinationRisk = result.internetVerification.confidence > 0.8 ? 'low' : 'medium';
        this.validationSummary.verifiedScales++;
      } else if (result.internetVerification.scaleExists && !validationSuccess) {
        // Scale exists on internet but no accessible sources found
        result.status = 'unverifiable';
        result.hallucinationRisk = 'high';
        this.validationSummary.unverifiableScales++;
      } else {
        result.status = 'failed';
        result.hallucinationRisk = 'high';
        this.validationSummary.failedScales++;
      }

      // Step 6: Generate error summary
      result.errorSummary = this.generateErrorSummary(result);

    } catch (error) {
      result.status = 'failed';
      result.internetVerification.notes.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.validationSummary.failedScales++;
      
      // Add system error to result
      const systemError: ErrorDetails = {
        category: 'configuration',
        severity: 'critical',
        code: 'SYSTEM_ERROR',
        message: `System validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestedFix: 'Check system configuration and dependencies',
        timestamp: new Date(),
        retryable: true
      };
      
      result.errorSummary = {
        totalErrors: 1,
        errorsByCategory: { 'configuration': 1 },
        errorsBySeverity: { 'critical': 1 },
        criticalErrors: [systemError],
        recommendedActions: ['Check system configuration and dependencies', 'Verify all required services are running']
      };
    }

    return result;
  }

  async validateAllScales(scaleDatabase: ScaleData[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Reset summary for new validation run
    this.validationSummary = {
      totalScales: 0,
      verifiedScales: 0,
      failedScales: 0,
      unverifiableScales: 0,
      wikipediaRejections: 0,
      backupSourceUsage: 0,
      sourceDiversity: {}
    };

    // Validate each scale
    for (const scaleData of scaleDatabase) {
      const result = await this.validateScale(scaleData.id, scaleData);
      results.push(result);
    }

    return results;
  }

  /**
   * Complete validation orchestration workflow that combines all components
   * Implements Requirements 3.2 (dual validation) and 3.5 (complete validation process)
   */
  async orchestrateCompleteValidation(scaleDatabase: ScaleData[]): Promise<{
    results: ValidationResult[];
    summary: ValidationSummary;
    completionStatus: {
      totalProcessed: number;
      successfullyVerified: number;
      verificationRate: number;
      allChecksCompleted: boolean;
    };
  }> {
    // Step 1: Verify all approved sources are accessible at startup (Requirements 3.1)
    const sourceAccessibilityCheck = await this.verifyApprovedSourcesAccessibility();
    
    if (!sourceAccessibilityCheck.allAccessible) {
      throw new Error(`Source accessibility check failed: ${sourceAccessibilityCheck.inaccessibleSources.join(', ')} are not accessible`);
    }

    // Step 2: Validate all scales using the complete validation process
    const results = await this.validateAllScales(scaleDatabase);

    // Step 3: Verify dual validation requirement was met for all processed scales
    this.verifyDualValidationCompliance(results);

    // Step 4: Generate completion status
    const summary = this.generateValidationSummary();
    const completionStatus = {
      totalProcessed: results.length,
      successfullyVerified: summary.verifiedScales,
      verificationRate: results.length > 0 ? summary.verifiedScales / results.length : 0,
      allChecksCompleted: this.verifyAllChecksCompleted(results)
    };

    // Step 5: Verify 100% verification status requirement (Requirements 3.5)
    if (completionStatus.verificationRate < 1.0) {
      const unverifiedScales = results.filter(r => r.status !== 'verified');
      console.warn(`Warning: ${unverifiedScales.length} scales could not be verified. This may indicate missing approved sources or network issues.`);
    }

    return {
      results,
      summary,
      completionStatus
    };
  }

  /**
   * Verify that all approved sources are accessible before starting validation
   * Implements Requirements 3.1
   * Note: Wikipedia sources are excluded from accessibility requirements as they are intentionally rejected
   */
  private async verifyApprovedSourcesAccessibility(): Promise<{
    allAccessible: boolean;
    accessibleSources: string[];
    inaccessibleSources: string[];
    details: { [hostname: string]: { accessible: boolean; error?: string } };
  }> {
    const accessibilityResults: { [hostname: string]: { accessible: boolean; error?: string } } = {};
    const accessibleSources: string[] = [];
    const inaccessibleSources: string[] = [];

    // Get all approved sources from source manager
    const approvedSources = this.sourceManager.getSourcesByPriority('*'); // Get all sources

    for (const source of approvedSources) {
      // Skip Wikipedia sources as they are intentionally rejected
      if (this.isWikipediaSource(source.hostname)) {
        accessibilityResults[source.hostname] = { accessible: false, error: 'Wikipedia sources are intentionally rejected' };
        continue;
      }

      try {
        const isAccessible = await this.sourceManager.validateSourceAccessibility(`https://${source.hostname}`);
        accessibilityResults[source.hostname] = { accessible: isAccessible };
        
        if (isAccessible) {
          accessibleSources.push(source.hostname);
        } else {
          inaccessibleSources.push(source.hostname);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        accessibilityResults[source.hostname] = { accessible: false, error: errorMessage };
        inaccessibleSources.push(source.hostname);
      }
    }

    return {
      allAccessible: inaccessibleSources.length === 0,
      accessibleSources,
      inaccessibleSources,
      details: accessibilityResults
    };
  }

  /**
   * Verify that dual validation (HTTP + content) was performed for all sources
   * Implements Requirements 3.2
   */
  private verifyDualValidationCompliance(results: ValidationResult[]): void {
    for (const result of results) {
      for (const source of result.sources) {
        // Skip Wikipedia sources as they are intentionally rejected
        if (this.isWikipediaSource(source.url)) {
          continue;
        }

        // Verify HTTP accessibility check was performed
        if (typeof source.httpStatus !== 'number' || source.httpStatus < 0) {
          throw new Error(`Dual validation compliance failed: HTTP check not performed for ${source.url} in scale ${result.scaleId}`);
        }

        // Verify content validation was attempted (even if HTTP failed)
        if (typeof source.contentMatch !== 'boolean') {
          throw new Error(`Dual validation compliance failed: Content validation not performed for ${source.url} in scale ${result.scaleId}`);
        }

        // If HTTP succeeded, content validation should have detailed diagnostics
        if (source.accessible && !source.contentMatch && !source.contentMatchDiagnostics) {
          throw new Error(`Dual validation compliance failed: Content match diagnostics missing for accessible source ${source.url} in scale ${result.scaleId}`);
        }
      }
    }
  }

  /**
   * Verify that all required validation checks were completed
   * Implements Requirements 3.5
   */
  private verifyAllChecksCompleted(results: ValidationResult[]): boolean {
    for (const result of results) {
      // Check 1: Validation status must be determined
      if (!['verified', 'failed', 'unverifiable'].includes(result.status)) {
        return false;
      }

      // Check 2: Internet verification must have been performed
      if (!result.internetVerification || typeof result.internetVerification.scaleExists !== 'boolean') {
        return false;
      }

      // Check 3: At least one source must have been attempted (unless unverifiable)
      if (result.status !== 'unverifiable' && result.sources.length === 0) {
        return false;
      }

      // Check 4: Error summary must be present for failed validations
      if (result.status === 'failed' && !result.errorSummary) {
        return false;
      }

      // Check 5: Primary source must be set for verified scales
      if (result.status === 'verified' && !result.primarySource) {
        return false;
      }

      // Check 6: Hallucination risk assessment must be performed
      if (!['low', 'medium', 'high'].includes(result.hallucinationRisk)) {
        return false;
      }
    }

    return true;
  }

  generateValidationSummary(): ValidationSummary {
    return { ...this.validationSummary };
  }

  private async validateWithSource(scaleData: ScaleData, source: ApprovedSource): Promise<CitationResult> {
    // Construct a search URL for the source
    const searchUrl = this.constructSearchUrl(source, scaleData.name);
    
    // Use citation engine to validate the source
    return await this.citationEngine.validateCitation(searchUrl, scaleData.name);
  }

  private constructSearchUrl(source: ApprovedSource, scaleName: string): string {
    // This is a simplified URL construction - in a real implementation,
    // each source would have its own search pattern
    const encodedScale = encodeURIComponent(scaleName);
    
    switch (source.hostname) {
      case 'teoria.com':
        return `https://teoria.com/en/reference/s/${encodedScale.toLowerCase()}.php`;
      case 'musictheory.net':
        return `https://musictheory.net/lessons/${encodedScale.toLowerCase()}`;
      case 'britannica.com':
        return `https://britannica.com/search?query=${encodedScale}`;
      case 'maqamworld.com':
        return `https://maqamworld.com/en/maqam/${encodedScale.toLowerCase()}.html`;
      default:
        return `https://${source.hostname}/search?q=${encodedScale}`;
    }
  }

  private isWikipediaSource(hostname: string): boolean {
    return hostname.includes('wikipedia.org') || hostname.includes('wikimedia.org');
  }

  private generateErrorSummary(result: ValidationResult): ValidationErrorSummary {
    const errors: ErrorDetails[] = [];
    const errorsByCategory: { [category: string]: number } = {};
    const errorsBySeverity: { [severity: string]: number } = {};
    const recommendedActions: string[] = [];

    // Collect errors from all sources
    for (const source of result.sources) {
      if (source.errorDetails) {
        errors.push(source.errorDetails);
        
        // Count by category
        errorsByCategory[source.errorDetails.category] = 
          (errorsByCategory[source.errorDetails.category] || 0) + 1;
        
        // Count by severity
        errorsBySeverity[source.errorDetails.severity] = 
          (errorsBySeverity[source.errorDetails.severity] || 0) + 1;
        
        // Add suggested fix to recommended actions
        if (source.errorDetails.suggestedFix && !recommendedActions.includes(source.errorDetails.suggestedFix)) {
          recommendedActions.push(source.errorDetails.suggestedFix);
        }
      }
    }

    // Add general recommendations based on validation status
    if (result.status === 'failed') {
      recommendedActions.push('Try alternative approved sources');
      recommendedActions.push('Verify the scale name and cultural context are correct');
    }

    if (result.status === 'unverifiable') {
      recommendedActions.push('Add more approved sources to the configuration');
      recommendedActions.push('Check if the scale exists in academic literature');
    }

    // Filter critical errors
    const criticalErrors = errors.filter(error => error.severity === 'critical');

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      criticalErrors,
      recommendedActions: [...new Set(recommendedActions)] // Remove duplicates
    };
  }
}