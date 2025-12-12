import { InternetVerifier, SearchResult } from '../src/internet-verifier';
import * as fc from 'fast-check';

describe('InternetVerifier', () => {
  let internetVerifier: InternetVerifier;

  beforeEach(() => {
    internetVerifier = new InternetVerifier(5000, 2, 0.6);
  });

  describe('Property Tests', () => {
    /**
     * **Feature: wikipedia-free-scale-validation, Property 21: Internet existence verification**
     * For any scale being validated, the system should verify that the scale name and cultural context can be found across multiple independent internet sources before accepting it as valid
     * **Validates: Requirements 1.3, 2.1**
     */
    test('Property 21: Internet existence verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.option(fc.string({ minLength: 3, maxLength: 30 }), { nil: undefined }),
          async (scaleName: string, culturalContext: string | undefined) => {
            // Skip invalid scale names (too short, only whitespace, etc.)
            fc.pre(scaleName.trim().length >= 3);
            
            const result = await internetVerifier.verifyScaleExists(scaleName, culturalContext);
            
            // Result should have the correct structure
            expect(result).toHaveProperty('scaleExists');
            expect(result).toHaveProperty('sourcesFound');
            expect(result).toHaveProperty('independentConfirmations');
            expect(result).toHaveProperty('searchQueries');
            expect(result).toHaveProperty('foundSources');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('notes');
            
            // All properties should have correct types
            expect(typeof result.scaleExists).toBe('boolean');
            expect(typeof result.sourcesFound).toBe('number');
            expect(typeof result.independentConfirmations).toBe('number');
            expect(Array.isArray(result.searchQueries)).toBe(true);
            expect(Array.isArray(result.foundSources)).toBe(true);
            expect(typeof result.confidence).toBe('number');
            expect(Array.isArray(result.notes)).toBe(true);
            
            // Confidence should be between 0 and 1
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            
            // Sources found should not exceed independent confirmations
            expect(result.sourcesFound).toBeLessThanOrEqual(result.independentConfirmations);
            
            // If scale exists, there should be at least 2 independent confirmations
            if (result.scaleExists) {
              expect(result.independentConfirmations).toBeGreaterThanOrEqual(2);
            }
            
            // Search queries should include the original scale name
            expect(result.searchQueries).toContain(scaleName);
            
            // If cultural context provided, should be included in search queries
            if (culturalContext) {
              const hasContextQuery = result.searchQueries.some(query => 
                query.includes(culturalContext)
              );
              expect(hasContextQuery).toBe(true);
            }
          }
        ),
        { numRuns: 20, timeout: 10000 }
      );
    }, 30000);

    /**
     * **Feature: wikipedia-free-scale-validation, Property 22: Multi-source cross-verification**
     * For any scale claimed to exist, at least two independent non-Wikipedia sources should contain references to that scale name and cultural context
     * **Validates: Requirements 2.1, 4.3**
     */
    test('Property 22: Multi-source cross-verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.array(fc.webUrl({ validSchemes: ['https'] }), { minLength: 2, maxLength: 5 }),
          async (scaleName: string, sourceList: string[]) => {
            // Skip invalid scale names and ensure no Wikipedia sources
            fc.pre(scaleName.trim().length >= 3);
            fc.pre(sourceList.every(url => !url.includes('wikipedia.org') && !url.includes('wikimedia.org')));
            
            // Extract hostnames from URLs
            const hostnames = sourceList.map(url => {
              try {
                return new URL(url).hostname;
              } catch {
                return url; // Fallback if URL parsing fails
              }
            });
            
            const searchResults = await internetVerifier.searchAcrossSources(scaleName, hostnames);
            
            // Should return results for all sources
            expect(searchResults).toHaveLength(hostnames.length);
            
            // Each result should have the correct structure
            searchResults.forEach(result => {
              expect(result).toHaveProperty('source');
              expect(result).toHaveProperty('found');
              expect(result).toHaveProperty('confidence');
              expect(typeof result.found).toBe('boolean');
              expect(typeof result.confidence).toBe('number');
              expect(result.confidence).toBeGreaterThanOrEqual(0);
              expect(result.confidence).toBeLessThanOrEqual(1);
              expect(hostnames).toContain(result.source);
            });
            
            // Cross-reference the results
            const crossRefResult = await internetVerifier.crossReferenceResults(searchResults);
            
            // Cross-reference result should have correct structure
            expect(crossRefResult).toHaveProperty('independentConfirmations');
            expect(crossRefResult).toHaveProperty('sourcesFound');
            expect(crossRefResult).toHaveProperty('confidence');
            expect(crossRefResult).toHaveProperty('consistentFindings');
            
            // All properties should have correct types
            expect(typeof crossRefResult.independentConfirmations).toBe('number');
            expect(typeof crossRefResult.sourcesFound).toBe('number');
            expect(typeof crossRefResult.confidence).toBe('number');
            expect(typeof crossRefResult.consistentFindings).toBe('boolean');
            
            // Confidence should be between 0 and 1
            expect(crossRefResult.confidence).toBeGreaterThanOrEqual(0);
            expect(crossRefResult.confidence).toBeLessThanOrEqual(1);
            
            // Sources found should not exceed total search results
            expect(crossRefResult.sourcesFound).toBeLessThanOrEqual(searchResults.length);
            
            // Independent confirmations should not exceed total search results
            expect(crossRefResult.independentConfirmations).toBeLessThanOrEqual(searchResults.length);
            
            // If there are multiple valid results, sources found should be at least 1
            const validResults = searchResults.filter(r => r.found && r.confidence >= 0.6);
            if (validResults.length > 0) {
              expect(crossRefResult.sourcesFound).toBeGreaterThanOrEqual(1);
            }
          }
        ),
        { numRuns: 15, timeout: 10000 }
      );
    }, 30000);
  });

  describe('Unit Tests', () => {
    describe('Search query generation', () => {
      test('should generate basic search queries', async () => {
        const result = await internetVerifier.verifyScaleExists('major scale');
        
        expect(result.searchQueries).toContain('major scale');
        expect(result.searchQueries).toContain('major scale scale');
        expect(result.searchQueries).toContain('major scale mode');
      });

      test('should include cultural context in queries', async () => {
        const result = await internetVerifier.verifyScaleExists('maqam hijaz', 'arabic');
        
        expect(result.searchQueries).toContain('maqam hijaz');
        expect(result.searchQueries).toContain('maqam hijaz arabic');
        expect(result.searchQueries).toContain('arabic maqam hijaz');
        expect(result.searchQueries).toContain('maqam hijaz scale arabic');
      });

      test('should remove duplicate queries', async () => {
        const result = await internetVerifier.verifyScaleExists('scale', 'scale');
        
        const uniqueQueries = new Set(result.searchQueries);
        expect(uniqueQueries.size).toBe(result.searchQueries.length);
      });
    });

    describe('Cross-reference logic', () => {
      test('should handle empty search results', async () => {
        const crossRefResult = await internetVerifier.crossReferenceResults([]);
        
        expect(crossRefResult.independentConfirmations).toBe(0);
        expect(crossRefResult.sourcesFound).toBe(0);
        expect(crossRefResult.confidence).toBe(0);
        expect(crossRefResult.consistentFindings).toBe(true);
      });

      test('should calculate confidence correctly', async () => {
        const mockResults: SearchResult[] = [
          { source: 'source1.com', found: true, confidence: 0.8 },
          { source: 'source2.com', found: true, confidence: 0.9 },
          { source: 'source3.com', found: false, confidence: 0.2 }
        ];
        
        const crossRefResult = await internetVerifier.crossReferenceResults(mockResults);
        
        expect(crossRefResult.independentConfirmations).toBe(2);
        expect(crossRefResult.sourcesFound).toBe(2);
        expect(crossRefResult.confidence).toBeGreaterThan(0);
        expect(crossRefResult.confidence).toBeLessThanOrEqual(1);
      });

      test('should detect inconsistent findings', async () => {
        const inconsistentResults: SearchResult[] = [
          { source: 'source1.com', found: true, confidence: 1.0 },
          { source: 'source2.com', found: true, confidence: 0.1 }
        ];
        
        const crossRefResult = await internetVerifier.crossReferenceResults(inconsistentResults);
        
        expect(crossRefResult.consistentFindings).toBe(false);
      });
    });

    describe('Hallucination detection', () => {
      test('should return high risk for no confirmations', () => {
        const noResults: SearchResult[] = [];
        const risk = internetVerifier.detectPotentialHallucination({}, noResults);
        
        expect(risk).toBe('high');
      });

      test('should return high risk for single source', () => {
        const singleResult: SearchResult[] = [
          { source: 'source1.com', found: true, confidence: 0.9 }
        ];
        const risk = internetVerifier.detectPotentialHallucination({}, singleResult);
        
        expect(risk).toBe('high');
      });

      test('should return low risk for multiple high-confidence sources', () => {
        const multipleResults: SearchResult[] = [
          { source: 'source1.com', found: true, confidence: 0.9 },
          { source: 'source2.com', found: true, confidence: 0.8 },
          { source: 'source3.com', found: true, confidence: 0.85 }
        ];
        const risk = internetVerifier.detectPotentialHallucination({}, multipleResults);
        
        expect(risk).toBe('low');
      });

      test('should return medium risk for low confidence', () => {
        const lowConfidenceResults: SearchResult[] = [
          { source: 'source1.com', found: true, confidence: 0.4 },
          { source: 'source2.com', found: true, confidence: 0.3 }
        ];
        const risk = internetVerifier.detectPotentialHallucination({}, lowConfidenceResults);
        
        expect(risk).toBe('medium');
      });
    });

    describe('Report generation', () => {
      test('should generate complete verification report', () => {
        const mockFindings = {
          scaleExists: true,
          sourcesFound: 3,
          independentConfirmations: 4,
          searchQueries: ['test scale', 'test mode'],
          foundSources: ['source1.com', 'source2.com', 'source3.com'],
          confidence: 0.85,
          notes: ['Multiple confirmations found']
        };
        
        const report = internetVerifier.generateVerificationReport('test scale', mockFindings);
        
        expect(report).toHaveProperty('scaleName', 'test scale');
        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('verification', mockFindings);
        expect(report).toHaveProperty('summary');
        expect(report).toHaveProperty('recommendations');
        
        expect(report.summary.verified).toBe(true);
        expect(report.summary.confidence).toBe(0.85);
        expect(report.summary.sourceCount).toBe(3);
        expect(report.summary.confirmations).toBe(4);
        
        expect(Array.isArray(report.recommendations)).toBe(true);
      });

      test('should provide appropriate recommendations', () => {
        const unverifiedFindings = {
          scaleExists: false,
          sourcesFound: 0,
          independentConfirmations: 0,
          searchQueries: ['unknown scale'],
          foundSources: [],
          confidence: 0,
          notes: ['No sources found']
        };
        
        const report = internetVerifier.generateVerificationReport('unknown scale', unverifiedFindings);
        
        expect(report.recommendations).toContain('Scale not verified - consider marking as unverifiable');
        expect(report.recommendations).toContain('Manual research recommended before inclusion');
      });
    });
  });
});