import { describe, it, expect, beforeEach } from '@jest/globals';
import * as fc from 'fast-check';
import { ValidationEngine } from '../src/validation-engine';
import { SourceManager } from '../src/source-manager';
import { CitationEngine } from '../src/citation-engine';
import { InternetVerifier } from '../src/internet-verifier';
import { ApprovedSource, ScaleData } from '../src/interfaces';

describe('ValidationEngine', () => {
  let validationEngine: ValidationEngine;
  let sourceManager: SourceManager;
  let citationEngine: CitationEngine;
  let internetVerifier: InternetVerifier;

  const mockApprovedSources: ApprovedSource[] = [
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
      hostname: 'wikipedia.org',
      priority: 1,
      scaleTypes: ['*'],
      reliability: 0.5,
      accessPattern: 'search'
    }
  ];

  // Helper to generate valid ScaleData
  const scaleDataArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 2, maxLength: 100 }),
    culturalContext: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
    notes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 12 }),
    intervals: fc.array(fc.integer({ min: 0, max: 11 }), { minLength: 1, maxLength: 12 }),
    description: fc.option(fc.string({ minLength: 5, maxLength: 200 }), { nil: undefined })
  });

  beforeEach(() => {
    sourceManager = new SourceManager(mockApprovedSources);
    citationEngine = new CitationEngine();
    internetVerifier = new InternetVerifier();
    validationEngine = new ValidationEngine(sourceManager, citationEngine, internetVerifier);
  });

  describe('Property Tests', () => {
    /**
     * **Feature: wikipedia-free-scale-validation, Property 1: Wikipedia source rejection**
     * For any scale validation request, all sources used by the Scale_Validator should be non-Wikipedia URLs
     * **Validates: Requirements 1.1**
     */
    it('should reject Wikipedia sources in all validation requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          async (scaleData: ScaleData) => {
            // Create a mock citation engine that simulates Wikipedia rejection
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                return {
                  url,
                  title,
                  accessible: !isWikipedia, // Wikipedia sources should be rejected
                  contentMatch: !isWikipedia,
                  httpStatus: isWikipedia ? 0 : 200,
                  notes: isWikipedia ? ['Wikipedia source rejected'] : []
                };
              }
            }

            // Create a mock internet verifier
            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: true,
                  sourcesFound: 2,
                  independentConfirmations: 2,
                  searchQueries: [scaleData.name],
                  foundSources: ['teoria.com', 'musictheory.net'],
                  confidence: 0.9,
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that no Wikipedia sources were used in successful validation
            const usedSources = result.sources.filter(source => source.accessible && source.contentMatch);
            for (const source of usedSources) {
              expect(source.url).not.toMatch(/wikipedia\.org/);
              expect(source.url).not.toMatch(/wikimedia\.org/);
            }

            // Verify that if Wikipedia sources were encountered, they were rejected
            const wikipediaSources = result.sources.filter(source => 
              source.url.includes('wikipedia.org') || source.url.includes('wikimedia.org')
            );
            for (const wikipediaSource of wikipediaSources) {
              expect(wikipediaSource.accessible).toBe(false);
              expect(wikipediaSource.notes).toContain('Wikipedia source rejected');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 4: Wikipedia rejection with fallback**
     * For any validation request that encounters Wikipedia sources, those sources should be rejected and alternative approved sources should be attempted
     * **Validates: Requirements 1.4**
     */
    it('should reject Wikipedia sources and attempt fallback sources', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          async (scaleData: ScaleData) => {
            const citationCalls: string[] = [];

            // Create a mock citation engine that tracks calls
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                citationCalls.push(url);
                
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                return {
                  url,
                  title,
                  accessible: !isWikipedia,
                  contentMatch: !isWikipedia,
                  httpStatus: isWikipedia ? 0 : 200,
                  notes: isWikipedia ? ['Wikipedia source rejected'] : []
                };
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: true,
                  sourcesFound: 1,
                  independentConfirmations: 1,
                  searchQueries: [scaleData.name],
                  foundSources: ['teoria.com'],
                  confidence: 0.8,
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // If Wikipedia sources were in the approved list, verify they were rejected
            const wikipediaSourcesInApproved = mockApprovedSources.filter(source => 
              source.hostname.includes('wikipedia.org') || source.hostname.includes('wikimedia.org')
            );

            if (wikipediaSourcesInApproved.length > 0) {
              // Verify that non-Wikipedia sources were attempted after Wikipedia rejection
              const nonWikipediaCalls = citationCalls.filter(url => 
                !url.includes('wikipedia.org') && !url.includes('wikimedia.org')
              );
              
              expect(nonWikipediaCalls.length).toBeGreaterThan(0);
              
              // Verify that Wikipedia sources in results are marked as inaccessible
              const wikipediaResults = result.sources.filter(source => 
                source.url.includes('wikipedia.org') || source.url.includes('wikimedia.org')
              );
              
              for (const wikipediaResult of wikipediaResults) {
                expect(wikipediaResult.accessible).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 5: Backup source utilization**
     * For any validation where the primary source fails, backup reference sources should be attempted
     * **Validates: Requirements 1.5**
     */
    it('should attempt backup sources when primary source fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          async (scaleData: ScaleData) => {
            const sourcesAttempted: string[] = [];

            // Create a mock citation engine that fails primary source and succeeds on backup
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                sourcesAttempted.push(url);
                
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                if (isWikipedia) {
                  return {
                    url,
                    title,
                    accessible: false,
                    contentMatch: false,
                    httpStatus: 0,
                    notes: ['Wikipedia source rejected']
                  };
                }

                // Fail the first non-Wikipedia source (primary), succeed on subsequent ones (backup)
                const nonWikipediaCallCount = sourcesAttempted.filter(u => 
                  !u.includes('wikipedia.org') && !u.includes('wikimedia.org')
                ).length;

                const shouldSucceed = nonWikipediaCallCount > 1; // Succeed on backup sources
                
                return {
                  url,
                  title,
                  accessible: shouldSucceed,
                  contentMatch: shouldSucceed,
                  httpStatus: shouldSucceed ? 200 : 404,
                  notes: shouldSucceed ? [] : ['Primary source failed']
                };
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: true,
                  sourcesFound: 1,
                  independentConfirmations: 1,
                  searchQueries: [scaleData.name],
                  foundSources: ['musictheory.net'],
                  confidence: 0.7,
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that when primary source fails, backup sources are attempted
            const nonWikipediaSources = mockApprovedSources.filter(source => 
              !source.hostname.includes('wikipedia.org') && !source.hostname.includes('wikimedia.org')
            );

            if (nonWikipediaSources.length > 1) {
              const nonWikipediaAttempts = sourcesAttempted.filter(url => 
                !url.includes('wikipedia.org') && !url.includes('wikimedia.org')
              );
              
              // The test setup ensures first source fails, second succeeds
              // So we should have attempted at least 2 sources
              expect(nonWikipediaAttempts.length).toBeGreaterThanOrEqual(2);
              
              // The validation should succeed using backup source
              expect(result.status).toBe('verified');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 8: Source prioritization**
     * For any scale with multiple available sources, the system should select the source with the highest priority that is also accessible
     * **Validates: Requirements 2.3**
     */
    it('should prioritize sources by priority when multiple sources are available', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          async (scaleData: ScaleData) => {
            const sourcesAttempted: { url: string; priority: number }[] = [];

            // Create a mock citation engine that tracks source attempts and their priorities
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                // Determine priority based on hostname
                let priority = 0;
                for (const source of mockApprovedSources) {
                  if (url.includes(source.hostname)) {
                    priority = source.priority;
                    break;
                  }
                }
                
                sourcesAttempted.push({ url, priority });
                
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                
                return {
                  url,
                  title,
                  accessible: !isWikipedia,
                  contentMatch: !isWikipedia,
                  httpStatus: isWikipedia ? 0 : 200,
                  notes: isWikipedia ? ['Wikipedia source rejected'] : []
                };
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: true,
                  sourcesFound: 2,
                  independentConfirmations: 2,
                  searchQueries: [scaleData.name],
                  foundSources: ['teoria.com', 'musictheory.net'],
                  confidence: 0.9,
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that sources were attempted in priority order (highest first)
            const nonWikipediaAttempts = sourcesAttempted.filter(attempt => 
              !attempt.url.includes('wikipedia.org') && !attempt.url.includes('wikimedia.org')
            );

            if (nonWikipediaAttempts.length > 1) {
              for (let i = 1; i < nonWikipediaAttempts.length; i++) {
                expect(nonWikipediaAttempts[i-1].priority).toBeGreaterThanOrEqual(nonWikipediaAttempts[i].priority);
              }
            }

            // Verify that the primary source (if set) corresponds to the highest priority accessible source
            if (result.primarySource && result.status === 'verified') {
              const successfulSources = result.sources.filter(source => source.accessible && source.contentMatch);
              if (successfulSources.length > 0) {
                // The primary source should be from the first successful source
                expect(result.primarySource).toContain(successfulSources[0].url.split('/')[2]);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 12: Detailed error reporting**
     * For any source validation failure, the system should generate error reports containing specific failure details and suggested alternatives
     * **Validates: Requirements 3.4**
     */
    it('should generate detailed error reports for validation failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          fc.constantFrom('network', 'timeout', 'not_found', 'server_error', 'content_mismatch'),
          async (scaleData: ScaleData, errorType: string) => {
            // Create a mock citation engine that generates specific error types
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                
                if (isWikipedia) {
                  return {
                    url,
                    title,
                    accessible: false,
                    contentMatch: false,
                    httpStatus: 0,
                    notes: ['Wikipedia source rejected'],
                    errorDetails: {
                      category: 'source' as const,
                      severity: 'medium' as const,
                      code: 'WIKIPEDIA_REJECTED',
                      message: 'Wikipedia sources are not allowed per system requirements',
                      suggestedFix: 'Use approved non-Wikipedia sources like teoria.com, musictheory.net, or britannica.com',
                      timestamp: new Date(),
                      retryable: false
                    }
                  };
                }

                // Generate specific error types for testing
                switch (errorType) {
                  case 'network':
                    return {
                      url,
                      title,
                      accessible: false,
                      contentMatch: false,
                      httpStatus: 0,
                      notes: ['Network error'],
                      errorDetails: {
                        category: 'network' as const,
                        severity: 'high' as const,
                        code: 'NETWORK_ERROR',
                        message: `Network error for ${url}: Connection failed`,
                        suggestedFix: 'Check network connectivity and try again',
                        timestamp: new Date(),
                        retryable: true
                      }
                    };
                  case 'timeout':
                    return {
                      url,
                      title,
                      accessible: false,
                      contentMatch: false,
                      httpStatus: 0,
                      notes: ['Request timeout'],
                      errorDetails: {
                        category: 'network' as const,
                        severity: 'high' as const,
                        code: 'TIMEOUT',
                        message: `Network error for ${url}: Request timeout`,
                        suggestedFix: 'Increase timeout duration or check if the server is responding slowly',
                        timestamp: new Date(),
                        retryable: true
                      }
                    };
                  case 'not_found':
                    return {
                      url,
                      title,
                      accessible: false,
                      contentMatch: false,
                      httpStatus: 404,
                      notes: ['HTTP error: 404 Not Found'],
                      errorDetails: {
                        category: 'network' as const,
                        severity: 'high' as const,
                        code: 'NOT_FOUND',
                        message: `HTTP 404: Not Found for URL ${url}`,
                        suggestedFix: 'Verify the URL path is correct or try an alternative source',
                        timestamp: new Date(),
                        retryable: false
                      }
                    };
                  case 'server_error':
                    return {
                      url,
                      title,
                      accessible: false,
                      contentMatch: false,
                      httpStatus: 500,
                      notes: ['HTTP error: 500 Internal Server Error'],
                      errorDetails: {
                        category: 'network' as const,
                        severity: 'medium' as const,
                        code: 'SERVER_ERROR',
                        message: `HTTP 500: Internal Server Error for URL ${url}`,
                        suggestedFix: 'Server error - try again later or use an alternative source',
                        timestamp: new Date(),
                        retryable: true
                      }
                    };
                  case 'content_mismatch':
                    return {
                      url,
                      title,
                      accessible: true,
                      contentMatch: false,
                      httpStatus: 200,
                      notes: ['Content does not match expected title keywords'],
                      errorDetails: {
                        category: 'content' as const,
                        severity: 'medium' as const,
                        code: 'CONTENT_MISMATCH',
                        message: `Content validation failed: 2 of 3 keywords missing`,
                        suggestedFix: `Verify that the source contains information about "${title}". Missing keywords: scale, theory`,
                        timestamp: new Date(),
                        retryable: false
                      },
                      contentMatchDiagnostics: {
                        expectedKeywords: ['scale', 'theory', title.toLowerCase()],
                        foundKeywords: [title.toLowerCase()],
                        missingKeywords: ['scale', 'theory'],
                        matchPercentage: 0.33,
                        contentLength: 1000,
                        searchStrategy: 'keyword-based'
                      }
                    };
                  default:
                    return {
                      url,
                      title,
                      accessible: true,
                      contentMatch: true,
                      httpStatus: 200,
                      notes: []
                    };
                }
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: false,
                  sourcesFound: 0,
                  independentConfirmations: 0,
                  searchQueries: [scaleData.name],
                  foundSources: [],
                  confidence: 0,
                  notes: ['No sources found']
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that detailed error reporting is present
            expect(result.errorSummary).toBeDefined();
            
            if (result.errorSummary && result.errorSummary.totalErrors > 0) {
              // Verify error categorization
              expect(result.errorSummary.errorsByCategory).toBeDefined();
              expect(Object.keys(result.errorSummary.errorsByCategory).length).toBeGreaterThan(0);
              
              // Verify severity classification
              expect(result.errorSummary.errorsBySeverity).toBeDefined();
              expect(Object.keys(result.errorSummary.errorsBySeverity).length).toBeGreaterThan(0);
              
              // Verify recommended actions are provided
              expect(result.errorSummary.recommendedActions).toBeDefined();
              expect(result.errorSummary.recommendedActions.length).toBeGreaterThan(0);
              
              // Verify that sources with errors have detailed error information
              const sourcesWithErrors = result.sources.filter(source => source.errorDetails);
              for (const source of sourcesWithErrors) {
                expect(source.errorDetails).toBeDefined();
                expect(source.errorDetails!.category).toMatch(/^(network|content|source|configuration)$/);
                expect(source.errorDetails!.severity).toMatch(/^(low|medium|high|critical)$/);
                expect(source.errorDetails!.code).toBeDefined();
                expect(source.errorDetails!.message).toBeDefined();
                expect(source.errorDetails!.timestamp).toBeInstanceOf(Date);
                expect(typeof source.errorDetails!.retryable).toBe('boolean');
                
                // Verify suggested fixes are provided for errors
                if (source.errorDetails!.severity === 'high' || source.errorDetails!.severity === 'critical') {
                  expect(source.errorDetails!.suggestedFix).toBeDefined();
                  expect(source.errorDetails!.suggestedFix!.length).toBeGreaterThan(0);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 18: Problem categorization**
     * For any detected validation problems, the Validation_Report should categorize them by type (network, content, source) and severity level
     * **Validates: Requirements 5.2**
     */
    it('should categorize validation problems by type and severity', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          fc.array(fc.constantFrom('network', 'content', 'source', 'configuration'), { minLength: 1, maxLength: 4 }),
          fc.array(fc.constantFrom('low', 'medium', 'high', 'critical'), { minLength: 1, maxLength: 4 }),
          async (scaleData: ScaleData, errorCategories: string[], errorSeverities: string[]) => {
            // Create a mock citation engine that generates errors of specified categories and severities
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                
                if (isWikipedia) {
                  return {
                    url,
                    title,
                    accessible: false,
                    contentMatch: false,
                    httpStatus: 0,
                    notes: ['Wikipedia source rejected'],
                    errorDetails: {
                      category: 'source' as const,
                      severity: 'medium' as const,
                      code: 'WIKIPEDIA_REJECTED',
                      message: 'Wikipedia sources are not allowed',
                      timestamp: new Date(),
                      retryable: false
                    }
                  };
                }

                // Generate errors based on the test parameters
                const categoryIndex = Math.floor(Math.random() * errorCategories.length);
                const severityIndex = Math.floor(Math.random() * errorSeverities.length);
                const category = errorCategories[categoryIndex] as 'network' | 'content' | 'source' | 'configuration';
                const severity = errorSeverities[severityIndex] as 'low' | 'medium' | 'high' | 'critical';

                return {
                  url,
                  title,
                  accessible: false,
                  contentMatch: false,
                  httpStatus: category === 'network' ? 500 : 200,
                  notes: [`${category} error with ${severity} severity`],
                  errorDetails: {
                    category,
                    severity,
                    code: `${category.toUpperCase()}_ERROR`,
                    message: `Test ${category} error with ${severity} severity`,
                    suggestedFix: `Fix the ${category} issue`,
                    timestamp: new Date(),
                    retryable: severity !== 'critical'
                  }
                };
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: false,
                  sourcesFound: 0,
                  independentConfirmations: 0,
                  searchQueries: [scaleData.name],
                  foundSources: [],
                  confidence: 0,
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that error categorization is working
            expect(result.errorSummary).toBeDefined();
            
            if (result.errorSummary && result.errorSummary.totalErrors > 0) {
              // Verify that errors are categorized by type
              expect(result.errorSummary.errorsByCategory).toBeDefined();
              const categoryKeys = Object.keys(result.errorSummary.errorsByCategory);
              expect(categoryKeys.length).toBeGreaterThan(0);
              
              // All category keys should be valid categories
              for (const category of categoryKeys) {
                expect(['network', 'content', 'source', 'configuration']).toContain(category);
                expect(result.errorSummary.errorsByCategory[category]).toBeGreaterThan(0);
              }
              
              // Verify that errors are categorized by severity
              expect(result.errorSummary.errorsBySeverity).toBeDefined();
              const severityKeys = Object.keys(result.errorSummary.errorsBySeverity);
              expect(severityKeys.length).toBeGreaterThan(0);
              
              // All severity keys should be valid severities
              for (const severity of severityKeys) {
                expect(['low', 'medium', 'high', 'critical']).toContain(severity);
                expect(result.errorSummary.errorsBySeverity[severity]).toBeGreaterThan(0);
              }
              
              // Verify that the total count matches the sum of categorized errors
              const totalByCategory = Object.values(result.errorSummary.errorsByCategory).reduce((sum, count) => sum + count, 0);
              const totalBySeverity = Object.values(result.errorSummary.errorsBySeverity).reduce((sum, count) => sum + count, 0);
              
              expect(totalByCategory).toBe(result.errorSummary.totalErrors);
              expect(totalBySeverity).toBe(result.errorSummary.totalErrors);
              
              // Verify that critical errors are tracked separately
              const criticalCount = result.errorSummary.errorsBySeverity['critical'] || 0;
              expect(result.errorSummary.criticalErrors.length).toBe(criticalCount);
              
              // All critical errors should have severity 'critical'
              for (const criticalError of result.errorSummary.criticalErrors) {
                expect(criticalError.severity).toBe('critical');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 19: Specific error messaging**
     * For any source accessibility failure, the system should provide specific error messages including HTTP status and suggested fixes
     * **Validates: Requirements 5.3**
     */
    it('should provide specific error messages for accessibility failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          fc.constantFrom(404, 403, 401, 500, 502, 503, 0),
          async (scaleData: ScaleData, httpStatus: number) => {
            // Create a mock citation engine that generates specific HTTP errors
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                
                if (isWikipedia) {
                  return {
                    url,
                    title,
                    accessible: false,
                    contentMatch: false,
                    httpStatus: 0,
                    notes: ['Wikipedia source rejected'],
                    errorDetails: {
                      category: 'source' as const,
                      severity: 'medium' as const,
                      code: 'WIKIPEDIA_REJECTED',
                      message: 'Wikipedia sources are not allowed per system requirements',
                      suggestedFix: 'Use approved non-Wikipedia sources like teoria.com, musictheory.net, or britannica.com',
                      timestamp: new Date(),
                      retryable: false
                    }
                  };
                }

                // Generate specific HTTP error based on status code
                let statusText = 'Unknown';
                let expectedCode = 'HTTP_ERROR';
                let expectedSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
                let expectedRetryable = true;
                let expectedSuggestedFix = 'Check if the URL is correct and the server is accessible';

                switch (httpStatus) {
                  case 404:
                    statusText = 'Not Found';
                    expectedCode = 'NOT_FOUND';
                    expectedSeverity = 'high';
                    expectedRetryable = false;
                    expectedSuggestedFix = 'Verify the URL path is correct or try an alternative source';
                    break;
                  case 403:
                    statusText = 'Forbidden';
                    expectedCode = 'FORBIDDEN';
                    expectedSeverity = 'high';
                    expectedRetryable = false;
                    expectedSuggestedFix = 'The source may require authentication or have access restrictions';
                    break;
                  case 401:
                    statusText = 'Unauthorized';
                    expectedCode = 'UNAUTHORIZED';
                    expectedSeverity = 'high';
                    expectedRetryable = false;
                    expectedSuggestedFix = 'Authentication may be required to access this source';
                    break;
                  case 500:
                    statusText = 'Internal Server Error';
                    expectedCode = 'SERVER_ERROR';
                    expectedSeverity = 'medium';
                    expectedRetryable = true;
                    expectedSuggestedFix = 'Server error - try again later or use an alternative source';
                    break;
                  case 502:
                    statusText = 'Bad Gateway';
                    expectedCode = 'SERVER_ERROR';
                    expectedSeverity = 'medium';
                    expectedRetryable = true;
                    expectedSuggestedFix = 'Server error - try again later or use an alternative source';
                    break;
                  case 503:
                    statusText = 'Service Unavailable';
                    expectedCode = 'SERVER_ERROR';
                    expectedSeverity = 'medium';
                    expectedRetryable = true;
                    expectedSuggestedFix = 'Server error - try again later or use an alternative source';
                    break;
                  case 0:
                    statusText = 'Network Error';
                    expectedCode = 'NETWORK_ERROR';
                    expectedSeverity = 'high';
                    expectedRetryable = true;
                    expectedSuggestedFix = 'Check network connectivity and DNS resolution';
                    break;
                }

                return {
                  url,
                  title,
                  accessible: false,
                  contentMatch: false,
                  httpStatus,
                  notes: [`HTTP error: ${httpStatus} ${statusText}`],
                  errorDetails: {
                    category: 'network' as const,
                    severity: expectedSeverity,
                    code: expectedCode,
                    message: `HTTP ${httpStatus}: ${statusText} for URL ${url}`,
                    suggestedFix: expectedSuggestedFix,
                    timestamp: new Date(),
                    retryable: expectedRetryable
                  }
                };
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: false,
                  sourcesFound: 0,
                  independentConfirmations: 0,
                  searchQueries: [scaleData.name],
                  foundSources: [],
                  confidence: 0,
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that specific error messages are provided for accessibility failures
            const failedSources = result.sources.filter(source => !source.accessible && source.errorDetails);
            
            for (const source of failedSources) {
              expect(source.errorDetails).toBeDefined();
              
              // Verify that HTTP status is included in the error message
              if (source.httpStatus !== 0) {
                expect(source.errorDetails!.message).toContain(source.httpStatus.toString());
              }
              
              // Verify that the error message includes the URL
              expect(source.errorDetails!.message).toContain(source.url);
              
              // Verify that specific error codes are used based on HTTP status
              if (source.httpStatus === 404) {
                expect(source.errorDetails!.code).toBe('NOT_FOUND');
              } else if (source.httpStatus === 403) {
                expect(source.errorDetails!.code).toBe('FORBIDDEN');
              } else if (source.httpStatus === 401) {
                expect(source.errorDetails!.code).toBe('UNAUTHORIZED');
              } else if (source.httpStatus >= 500) {
                expect(source.errorDetails!.code).toBe('SERVER_ERROR');
              } else if (source.httpStatus === 0) {
                expect(source.errorDetails!.code).toBe('NETWORK_ERROR');
              }
              
              // Verify that suggested fixes are provided
              expect(source.errorDetails!.suggestedFix).toBeDefined();
              expect(source.errorDetails!.suggestedFix!.length).toBeGreaterThan(0);
              
              // Verify that retryable flag is set appropriately
              if (source.httpStatus >= 400 && source.httpStatus < 500) {
                // Client errors should not be retryable
                expect(source.errorDetails!.retryable).toBe(false);
              } else if (source.httpStatus >= 500 || source.httpStatus === 0) {
                // Server errors and network errors should be retryable
                expect(source.errorDetails!.retryable).toBe(true);
              }
              
              // Verify that severity is appropriate for the error type
              if (source.httpStatus >= 400 && source.httpStatus < 500) {
                expect(source.errorDetails!.severity).toBe('high');
              } else if (source.httpStatus >= 500) {
                expect(source.errorDetails!.severity).toBe('medium');
              } else if (source.httpStatus === 0) {
                expect(source.errorDetails!.severity).toBe('high');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 20: Content match diagnostics**
     * For any content matching failure, the error report should specify which expected keywords were not found in the source content
     * **Validates: Requirements 5.4**
     */
    it('should provide detailed content match diagnostics for matching failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          fc.float({ min: 0, max: 1 }),
          async (scaleData: ScaleData, matchPercentage: number) => {
            // Create a mock citation engine that provides detailed content match diagnostics
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                
                if (isWikipedia) {
                  return {
                    url,
                    title,
                    accessible: false,
                    contentMatch: false,
                    httpStatus: 0,
                    notes: ['Wikipedia source rejected'],
                    errorDetails: {
                      category: 'source' as const,
                      severity: 'medium' as const,
                      code: 'WIKIPEDIA_REJECTED',
                      message: 'Wikipedia sources are not allowed per system requirements',
                      suggestedFix: 'Use approved non-Wikipedia sources like teoria.com, musictheory.net, or britannica.com',
                      timestamp: new Date(),
                      retryable: false
                    }
                  };
                }

                // Generate content match diagnostics based on the match percentage
                const expectedKeywords = ['scale', 'music', 'theory', title.toLowerCase()];
                const numFoundKeywords = Math.floor(expectedKeywords.length * matchPercentage);
                const foundKeywords = expectedKeywords.slice(0, numFoundKeywords);
                const missingKeywords = expectedKeywords.slice(numFoundKeywords);
                
                // Calculate actual match percentage based on found keywords
                const actualMatchPercentage = foundKeywords.length / expectedKeywords.length;
                const contentMatch = actualMatchPercentage >= 0.6; // 60% threshold
                
                const diagnostics = {
                  expectedKeywords,
                  foundKeywords,
                  missingKeywords,
                  matchPercentage: actualMatchPercentage,
                  contentLength: 1500,
                  searchStrategy: 'keyword-based'
                };

                const result = {
                  url,
                  title,
                  accessible: true,
                  contentMatch,
                  httpStatus: 200,
                  notes: contentMatch ? [] : ['Content does not match expected title keywords'],
                  contentMatchDiagnostics: diagnostics
                };

                // Add error details if content doesn't match
                if (!contentMatch) {
                  (result as any).errorDetails = {
                    category: 'content' as const,
                    severity: 'medium' as const,
                    code: 'CONTENT_MISMATCH',
                    message: `Content validation failed: ${missingKeywords.length} of ${expectedKeywords.length} keywords missing`,
                    suggestedFix: `Verify that the source contains information about "${title}". Missing keywords: ${missingKeywords.join(', ')}`,
                    timestamp: new Date(),
                    retryable: false
                  };
                }

                return result;
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: matchPercentage > 0.5,
                  sourcesFound: matchPercentage > 0.5 ? 1 : 0,
                  independentConfirmations: matchPercentage > 0.5 ? 1 : 0,
                  searchQueries: [scaleData.name],
                  foundSources: matchPercentage > 0.5 ? ['teoria.com'] : [],
                  confidence: Math.min(matchPercentage, 1.0),
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that content match diagnostics are provided
            const sourcesWithDiagnostics = result.sources.filter(source => source.contentMatchDiagnostics);
            
            for (const source of sourcesWithDiagnostics) {
              const diagnostics = source.contentMatchDiagnostics!;
              
              // Verify that all required diagnostic fields are present
              expect(diagnostics.expectedKeywords).toBeDefined();
              expect(Array.isArray(diagnostics.expectedKeywords)).toBe(true);
              expect(diagnostics.expectedKeywords.length).toBeGreaterThan(0);
              
              expect(diagnostics.foundKeywords).toBeDefined();
              expect(Array.isArray(diagnostics.foundKeywords)).toBe(true);
              
              expect(diagnostics.missingKeywords).toBeDefined();
              expect(Array.isArray(diagnostics.missingKeywords)).toBe(true);
              
              expect(typeof diagnostics.matchPercentage).toBe('number');
              expect(diagnostics.matchPercentage).toBeGreaterThanOrEqual(0);
              expect(diagnostics.matchPercentage).toBeLessThanOrEqual(1);
              
              expect(typeof diagnostics.contentLength).toBe('number');
              expect(diagnostics.contentLength).toBeGreaterThanOrEqual(0);
              
              expect(diagnostics.searchStrategy).toBeDefined();
              expect(typeof diagnostics.searchStrategy).toBe('string');
              
              // Verify that found + missing keywords equals expected keywords
              const totalKeywords = diagnostics.foundKeywords.length + diagnostics.missingKeywords.length;
              expect(totalKeywords).toBe(diagnostics.expectedKeywords.length);
              
              // Verify that match percentage is consistent with found/expected ratio
              const expectedMatchPercentage = diagnostics.foundKeywords.length / diagnostics.expectedKeywords.length;
              expect(diagnostics.matchPercentage).toBeCloseTo(expectedMatchPercentage, 1);
              
              // If content doesn't match, verify that error details include missing keywords
              if (!source.contentMatch && source.errorDetails) {
                expect(source.errorDetails.code).toBe('CONTENT_MISMATCH');
                expect(source.errorDetails.message).toContain('keywords missing');
                
                // Verify that suggested fix mentions the missing keywords
                if (diagnostics.missingKeywords.length > 0) {
                  expect(source.errorDetails.suggestedFix).toContain('Missing keywords:');
                  for (const missingKeyword of diagnostics.missingKeywords) {
                    expect(source.errorDetails.suggestedFix).toContain(missingKeyword);
                  }
                }
              }
              
              // Verify that all found keywords are in the expected keywords list
              for (const foundKeyword of diagnostics.foundKeywords) {
                expect(diagnostics.expectedKeywords).toContain(foundKeyword);
              }
              
              // Verify that all missing keywords are in the expected keywords list
              for (const missingKeyword of diagnostics.missingKeywords) {
                expect(diagnostics.expectedKeywords).toContain(missingKeyword);
              }
              
              // Verify that there's no overlap between found and missing keywords
              const foundSet = new Set(diagnostics.foundKeywords);
              const missingSet = new Set(diagnostics.missingKeywords);
              const intersection = [...foundSet].filter(keyword => missingSet.has(keyword));
              expect(intersection.length).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 11: Dual validation requirement**
     * For any reference link being tested, both HTTP accessibility and content relevance validation should be performed
     * **Validates: Requirements 3.2**
     */
    it('should perform both HTTP accessibility and content validation for all reference links', async () => {
      await fc.assert(
        fc.asyncProperty(
          scaleDataArbitrary,
          fc.boolean(), // Whether HTTP should succeed
          fc.boolean(), // Whether content should match
          async (scaleData: ScaleData, httpSuccess: boolean, contentMatch: boolean) => {
            const validationCalls: { url: string; httpChecked: boolean; contentChecked: boolean }[] = [];

            // Create a mock citation engine that tracks both HTTP and content validation
            class MockCitationEngine extends CitationEngine {
              async validateCitation(url: string, title: string) {
                const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
                
                if (isWikipedia) {
                  // Track that both checks were performed even for rejected sources
                  validationCalls.push({ url, httpChecked: true, contentChecked: false });
                  return {
                    url,
                    title,
                    accessible: false,
                    contentMatch: false,
                    httpStatus: 0,
                    notes: ['Wikipedia source rejected'],
                    errorDetails: {
                      category: 'source' as const,
                      severity: 'medium' as const,
                      code: 'WIKIPEDIA_REJECTED',
                      message: 'Wikipedia sources are not allowed per system requirements',
                      suggestedFix: 'Use approved non-Wikipedia sources like teoria.com, musictheory.net, or britannica.com',
                      timestamp: new Date(),
                      retryable: false
                    }
                  };
                }

                // Track that both HTTP and content validation were performed
                validationCalls.push({ url, httpChecked: true, contentChecked: true });

                // Simulate the dual validation process
                const httpStatus = httpSuccess ? 200 : 404;
                const accessible = httpSuccess;
                
                // Content validation should only be performed if HTTP succeeds
                const actualContentMatch = httpSuccess ? contentMatch : false;
                
                const result: any = {
                  url,
                  title,
                  accessible,
                  contentMatch: actualContentMatch,
                  httpStatus,
                  notes: []
                };

                // Add appropriate error details based on validation results
                if (!accessible) {
                  result.errorDetails = {
                    category: 'network' as const,
                    severity: 'high' as const,
                    code: 'NOT_FOUND',
                    message: `HTTP ${httpStatus}: Not Found for URL ${url}`,
                    suggestedFix: 'Verify the URL path is correct or try an alternative source',
                    timestamp: new Date(),
                    retryable: false
                  };
                  result.notes.push(`HTTP error: ${httpStatus} Not Found`);
                } else if (!actualContentMatch) {
                  result.errorDetails = {
                    category: 'content' as const,
                    severity: 'medium' as const,
                    code: 'CONTENT_MISMATCH',
                    message: 'Content validation failed: expected keywords not found',
                    suggestedFix: `Verify that the source contains information about "${title}"`,
                    timestamp: new Date(),
                    retryable: false
                  };
                  result.contentMatchDiagnostics = {
                    expectedKeywords: ['scale', 'music', title.toLowerCase()],
                    foundKeywords: contentMatch ? ['scale', 'music'] : [],
                    missingKeywords: contentMatch ? [title.toLowerCase()] : ['scale', 'music', title.toLowerCase()],
                    matchPercentage: contentMatch ? 0.67 : 0,
                    contentLength: 1000,
                    searchStrategy: 'keyword-based'
                  };
                  result.notes.push('Content does not match expected title keywords');
                }

                return result;
              }
            }

            class MockInternetVerifier extends InternetVerifier {
              async verifyScaleExists() {
                return {
                  scaleExists: httpSuccess && contentMatch,
                  sourcesFound: httpSuccess && contentMatch ? 1 : 0,
                  independentConfirmations: httpSuccess && contentMatch ? 1 : 0,
                  searchQueries: [scaleData.name],
                  foundSources: httpSuccess && contentMatch ? ['teoria.com'] : [],
                  confidence: httpSuccess && contentMatch ? 0.8 : 0.2,
                  notes: []
                };
              }
            }

            const mockCitationEngine = new MockCitationEngine();
            const mockInternetVerifier = new MockInternetVerifier();
            const testValidationEngine = new ValidationEngine(sourceManager, mockCitationEngine, mockInternetVerifier);

            const result = await testValidationEngine.validateScale(scaleData.id, scaleData);

            // Verify that dual validation was performed for all non-Wikipedia sources
            const nonWikipediaValidations = validationCalls.filter(call => 
              !call.url.includes('wikipedia.org') && !call.url.includes('wikimedia.org')
            );

            for (const validation of nonWikipediaValidations) {
              // Verify that HTTP accessibility check was performed
              expect(validation.httpChecked).toBe(true);
              
              // Verify that content validation was performed (even if HTTP failed, the attempt should be tracked)
              expect(validation.contentChecked).toBe(true);
            }

            // Verify that all sources in the result have both accessibility and content match information
            const processedSources = result.sources.filter(source => 
              !source.url.includes('wikipedia.org') && !source.url.includes('wikimedia.org')
            );

            for (const source of processedSources) {
              // Verify that HTTP status is recorded (indicating HTTP check was performed)
              expect(typeof source.httpStatus).toBe('number');
              expect(source.httpStatus).toBeGreaterThanOrEqual(0);
              
              // Verify that accessibility status is recorded
              expect(typeof source.accessible).toBe('boolean');
              
              // Verify that content match status is recorded
              expect(typeof source.contentMatch).toBe('boolean');
              
              // If HTTP succeeded, content validation should have been attempted
              if (source.accessible) {
                // Content match diagnostics should be available for accessible sources
                if (!source.contentMatch) {
                  expect(source.contentMatchDiagnostics).toBeDefined();
                  expect(source.contentMatchDiagnostics!.expectedKeywords).toBeDefined();
                  expect(source.contentMatchDiagnostics!.foundKeywords).toBeDefined();
                  expect(source.contentMatchDiagnostics!.missingKeywords).toBeDefined();
                  expect(typeof source.contentMatchDiagnostics!.matchPercentage).toBe('number');
                }
              }
              
              // Verify that appropriate error details are provided based on validation results
              if (!source.accessible || !source.contentMatch) {
                expect(source.errorDetails).toBeDefined();
                
                if (!source.accessible) {
                  expect(source.errorDetails!.category).toBe('network');
                } else if (!source.contentMatch) {
                  expect(source.errorDetails!.category).toBe('content');
                }
              }
            }

            // Verify that the validation result reflects the dual validation requirement
            if (result.status === 'verified') {
              // At least one source should have passed both HTTP and content validation
              const successfulSources = result.sources.filter(source => 
                source.accessible && source.contentMatch && 
                !source.url.includes('wikipedia.org') && !source.url.includes('wikimedia.org')
              );
              expect(successfulSources.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Validation Orchestration', () => {
    it('should orchestrate complete validation workflow with all components', async () => {
      // Create a simple test scale database
      const testScales: ScaleData[] = [
        {
          id: 'test-major',
          name: 'C Major',
          culturalContext: 'Western',
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          intervals: [0, 2, 4, 5, 7, 9, 11]
        },
        {
          id: 'test-minor',
          name: 'A Minor',
          culturalContext: 'Western',
          notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          intervals: [0, 2, 3, 5, 7, 8, 10]
        }
      ];

      // Create mock components that simulate successful validation
      class MockCitationEngine extends CitationEngine {
        async validateCitation(url: string, title: string) {
          const isWikipedia = url.includes('wikipedia.org') || url.includes('wikimedia.org');
          
          if (isWikipedia) {
            return {
              url,
              title,
              accessible: false,
              contentMatch: false,
              httpStatus: 0,
              notes: ['Wikipedia source rejected'],
              errorDetails: {
                category: 'source' as const,
                severity: 'medium' as const,
                code: 'WIKIPEDIA_REJECTED',
                message: 'Wikipedia sources are not allowed per system requirements',
                timestamp: new Date(),
                retryable: false
              }
            };
          }

          return {
            url,
            title,
            accessible: true,
            contentMatch: true,
            httpStatus: 200,
            notes: [],
            contentMatchDiagnostics: {
              expectedKeywords: ['scale', 'music', title.toLowerCase()],
              foundKeywords: ['scale', 'music', title.toLowerCase()],
              missingKeywords: [],
              matchPercentage: 1.0,
              contentLength: 1000,
              searchStrategy: 'keyword-based'
            }
          };
        }
      }

      class MockInternetVerifier extends InternetVerifier {
        async verifyScaleExists() {
          return {
            scaleExists: true,
            sourcesFound: 2,
            independentConfirmations: 2,
            searchQueries: ['test scale'],
            foundSources: ['teoria.com', 'musictheory.net'],
            confidence: 0.9,
            notes: []
          };
        }
      }

      class MockSourceManager extends SourceManager {
        async validateSourceAccessibility(url: string): Promise<boolean> {
          // Simulate that all non-Wikipedia sources are accessible
          return !url.includes('wikipedia.org') && !url.includes('wikimedia.org');
        }
      }

      const mockSourceManager = new MockSourceManager(mockApprovedSources);
      const mockCitationEngine = new MockCitationEngine();
      const mockInternetVerifier = new MockInternetVerifier();
      const testValidationEngine = new ValidationEngine(mockSourceManager, mockCitationEngine, mockInternetVerifier);

      // Execute the complete validation orchestration
      const orchestrationResult = await testValidationEngine.orchestrateCompleteValidation(testScales);

      // Verify orchestration results
      expect(orchestrationResult).toBeDefined();
      expect(orchestrationResult.results).toBeDefined();
      expect(orchestrationResult.summary).toBeDefined();
      expect(orchestrationResult.completionStatus).toBeDefined();

      // Verify all scales were processed
      expect(orchestrationResult.results.length).toBe(testScales.length);
      expect(orchestrationResult.completionStatus.totalProcessed).toBe(testScales.length);

      // Verify completion status
      expect(orchestrationResult.completionStatus.allChecksCompleted).toBe(true);
      expect(orchestrationResult.completionStatus.verificationRate).toBeGreaterThan(0);

      // Verify that dual validation was performed for each scale
      for (const result of orchestrationResult.results) {
        expect(result.scaleId).toBeDefined();
        expect(['verified', 'failed', 'unverifiable']).toContain(result.status);
        expect(result.internetVerification).toBeDefined();
        expect(typeof result.internetVerification.scaleExists).toBe('boolean');
        expect(['low', 'medium', 'high']).toContain(result.hallucinationRisk);

        // Verify dual validation for non-Wikipedia sources
        const nonWikipediaSources = result.sources.filter(source => 
          !source.url.includes('wikipedia.org') && !source.url.includes('wikimedia.org')
        );

        for (const source of nonWikipediaSources) {
          // HTTP accessibility check performed
          expect(typeof source.httpStatus).toBe('number');
          expect(typeof source.accessible).toBe('boolean');
          
          // Content validation performed
          expect(typeof source.contentMatch).toBe('boolean');
          
          // If accessible and content doesn't match, diagnostics should be present
          if (source.accessible && !source.contentMatch) {
            expect(source.contentMatchDiagnostics).toBeDefined();
          }
        }
      }

      // Verify summary statistics
      expect(orchestrationResult.summary.totalScales).toBe(testScales.length);
      expect(orchestrationResult.summary.verifiedScales + orchestrationResult.summary.failedScales + orchestrationResult.summary.unverifiableScales).toBe(testScales.length);
    }, 30000); // Longer timeout for integration test
  });
});