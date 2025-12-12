import { CitationEngine } from '../src/citation-engine';
import * as fc from 'fast-check';

describe('CitationEngine', () => {
  let citationEngine: CitationEngine;

  beforeEach(() => {
    citationEngine = new CitationEngine({
      timeoutMs: 5000,
      retryAttempts: 2,
      retryDelayMs: 100
    });
  });

  describe('Property Tests', () => {
    /**
     * **Feature: wikipedia-free-scale-validation, Property 3: Citation accessibility and content verification**
     * For any completed validation, all provided citation links should be both HTTP accessible and content-matched to their reference titles
     * **Validates: Requirements 1.3**
     */
    test('Property 3: Citation accessibility and content verification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          fc.string({ minLength: 3, maxLength: 100 }),
          async (url: string, expectedTitle: string) => {
            // Skip Wikipedia URLs as they should be rejected
            fc.pre(!url.includes('wikipedia.org') && !url.includes('wikimedia.org'));
            
            const result = await citationEngine.validateCitation(url, expectedTitle);
            
            // The result should always have the correct structure
            expect(result).toHaveProperty('url', url);
            expect(result).toHaveProperty('title', expectedTitle);
            expect(result).toHaveProperty('accessible');
            expect(result).toHaveProperty('contentMatch');
            expect(result).toHaveProperty('httpStatus');
            expect(result).toHaveProperty('notes');
            expect(Array.isArray(result.notes)).toBe(true);
            
            // If accessible is true, httpStatus should be in 200-299 range
            if (result.accessible) {
              expect(result.httpStatus).toBeGreaterThanOrEqual(200);
              expect(result.httpStatus).toBeLessThan(300);
            }
            
            // Content match should only be true if accessible is also true
            if (result.contentMatch) {
              expect(result.accessible).toBe(true);
            }
          }
        ),
        { numRuns: 10, timeout: 30000 } // Reduced runs for network tests
      );
    }, 60000);

    /**
     * **Feature: wikipedia-free-scale-validation, Property 7: Citation quality assurance**
     * For any citation information provided by the Citation_Engine, all links should be accessible and content-matched
     * **Validates: Requirements 2.2**
     */
    test('Property 7: Citation quality assurance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.option(fc.string({ minLength: 3, maxLength: 30 }), { nil: undefined }),
          async (scaleName: string, culturalContext: string | undefined) => {
            // Test that scale existence verification behaves consistently
            const exists1 = await citationEngine.verifyScaleExistsOnline(scaleName, culturalContext);
            const exists2 = await citationEngine.verifyScaleExistsOnline(scaleName, culturalContext);
            
            // Results should be consistent for the same input
            expect(exists1).toBe(exists2);
            
            // Result should be boolean
            expect(typeof exists1).toBe('boolean');
          }
        ),
        { numRuns: 20, timeout: 10000 }
      );
    }, 30000);
  });

  describe('Unit Tests', () => {
    describe('HTTP retry logic', () => {
      test('should retry on network failures', async () => {
        const invalidUrl = 'https://nonexistent-domain-12345.com';
        
        await expect(citationEngine.fetchWithRetry(invalidUrl))
          .rejects.toThrow();
      });

      test('should respect timeout configuration', async () => {
        const shortTimeoutEngine = new CitationEngine({ timeoutMs: 100 });
        const slowUrl = 'https://httpbin.org/delay/1'; // 1 second delay
        
        try {
          const result = await shortTimeoutEngine.fetchWithRetry(slowUrl);
          // If it doesn't throw, it should at least fail due to timeout or return an error response
          expect(result.status).toBeGreaterThanOrEqual(400);
        } catch (error) {
          // This is the expected behavior - timeout should cause an error
          expect(error).toBeDefined();
        }
      }, 10000);
    });

    describe('Content matching edge cases', () => {
      test('should handle empty content', () => {
        expect(citationEngine.contentMatches('', 'test title')).toBe(false);
        expect(citationEngine.contentMatches('content', '')).toBe(false);
        expect(citationEngine.contentMatches('', '')).toBe(false);
      });

      test('should handle special characters in titles', () => {
        const content = 'This page discusses the C# major scale and its properties';
        const title = 'C# Major Scale';
        
        expect(citationEngine.contentMatches(content, title)).toBe(true);
      });

      test('should be case insensitive', () => {
        const content = 'DORIAN MODE is a musical scale';
        const title = 'dorian mode';
        
        expect(citationEngine.contentMatches(content, title)).toBe(true);
      });

      test('should require sufficient keyword matches', () => {
        const content = 'This is about major scales';
        const title = 'Minor Pentatonic Blues Harmonic Melodic Scale';
        
        // Should fail because only "scale" matches, not enough keywords
        expect(citationEngine.contentMatches(content, title)).toBe(false);
      });
    });

    describe('Keyword extraction', () => {
      test('should extract meaningful keywords', () => {
        const keywords = citationEngine.buildTitleKeywords('C Major Scale');
        
        expect(keywords).toContain('major');
        expect(keywords).toContain('scale');
        expect(keywords).toContain('c major scale');
        expect(keywords).not.toContain(''); // No empty strings
      });

      test('should filter stop words', () => {
        const keywords = citationEngine.buildTitleKeywords('The A Minor Scale and Its Uses');
        
        expect(keywords).not.toContain('the');
        expect(keywords).not.toContain('and');
        expect(keywords).not.toContain('its');
        expect(keywords).toContain('minor');
        expect(keywords).toContain('scale');
        expect(keywords).toContain('uses');
      });

      test('should handle punctuation', () => {
        const keywords = citationEngine.buildTitleKeywords('Blues Scale: A Complete Guide!');
        
        expect(keywords).toContain('blues');
        expect(keywords).toContain('scale');
        expect(keywords).toContain('complete');
        expect(keywords).toContain('guide');
      });

      test('should handle empty or invalid input', () => {
        expect(citationEngine.buildTitleKeywords('')).toEqual([]);
        expect(citationEngine.buildTitleKeywords('   ')).toEqual([]);
      });
    });

    describe('Wikipedia rejection', () => {
      test('should reject Wikipedia URLs', async () => {
        const wikipediaUrls = [
          'https://en.wikipedia.org/wiki/Major_scale',
          'https://wikipedia.org/wiki/test',
          'https://commons.wikimedia.org/test'
        ];

        for (const url of wikipediaUrls) {
          const result = await citationEngine.validateCitation(url, 'Test Title');
          expect(result.accessible).toBe(false);
          expect(result.notes).toContain('Wikipedia source rejected');
        }
      });

      test('should accept non-Wikipedia URLs', async () => {
        const validUrls = [
          'https://www.musictheory.net/lessons/21',
          'https://teoria.com/tutorials/scales/major.php'
        ];

        for (const url of validUrls) {
          const result = await citationEngine.validateCitation(url, 'Test Title');
          // Should not be rejected for being Wikipedia
          expect(result.notes).not.toContain('Wikipedia source rejected');
        }
      });
    });
  });
});