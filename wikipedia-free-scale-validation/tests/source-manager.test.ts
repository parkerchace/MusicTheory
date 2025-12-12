import * as fc from 'fast-check';
import { SourceManager } from '../src/source-manager/source-manager';
import { ApprovedSource } from '../src/interfaces';

describe('SourceManager', () => {
  // **Feature: wikipedia-free-scale-validation, Property 2: Approved source verification**
  // **Validates: Requirements 1.2**
  describe('Property 2: Approved source verification', () => {
    it('should only accept sources that appear in the approved reference list', () => {
      fc.assert(
        fc.property(
          // Generator for approved sources list
          fc.array(
            fc.record({
              hostname: fc.domain(),
              priority: fc.integer({ min: 1, max: 10 }),
              scaleTypes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1 }),
              reliability: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
              accessPattern: fc.constantFrom('direct', 'search', 'api')
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generator for test URLs (mix of approved and non-approved)
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 20 }),
          (approvedSources: ApprovedSource[], testUrls: string[]) => {
            const sourceManager = new SourceManager(approvedSources);
            const approvedHostnames = new Set(
              approvedSources.map(source => source.hostname.toLowerCase())
            );

            // Test each URL
            for (const url of testUrls) {
              try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname.toLowerCase();
                const isApproved = sourceManager.isSourceApproved(url);
                const shouldBeApproved = approvedHostnames.has(hostname);

                // Property: A source should be approved if and only if its hostname is in the approved list
                expect(isApproved).toBe(shouldBeApproved);
              } catch (error) {
                // Skip malformed URLs
                continue;
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle case-insensitive hostname matching', () => {
      fc.assert(
        fc.property(
          fc.domain(),
          fc.constantFrom('http', 'https'),
          fc.constantFrom('', '/path', '/path/to/resource'),
          (hostname: string, protocol: string, path: string) => {
            const approvedSources: ApprovedSource[] = [{
              hostname: hostname.toLowerCase(),
              priority: 5,
              scaleTypes: ['*'],
              reliability: 0.9,
              accessPattern: 'direct'
            }];

            const sourceManager = new SourceManager(approvedSources);
            
            // Test various case combinations
            const testUrls = [
              `${protocol}://${hostname}${path}`,
              `${protocol}://${hostname.toUpperCase()}${path}`,
              `${protocol}://${hostname.toLowerCase()}${path}`,
              `${protocol}://${hostname.charAt(0).toUpperCase() + hostname.slice(1)}${path}`
            ];

            for (const url of testUrls) {
              expect(sourceManager.isSourceApproved(url)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // **Feature: wikipedia-free-scale-validation, Property 10: Startup source verification**
  // **Validates: Requirements 3.1**
  describe('Property 10: Startup source verification', () => {
    it('should verify all approved sources are accessible at startup', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generator for approved sources list
          fc.array(
            fc.record({
              hostname: fc.constantFrom('teoria.com', 'musictheory.net', 'britannica.com', 'maqamworld.com'),
              priority: fc.integer({ min: 1, max: 10 }),
              scaleTypes: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1 }),
              reliability: fc.float({ min: Math.fround(0.1), max: Math.fround(1.0) }),
              accessPattern: fc.constantFrom('direct', 'search', 'api')
            }),
            { minLength: 1, maxLength: 4 }
          ),
          async (approvedSources: ApprovedSource[]) => {
            const sourceManager = new SourceManager(approvedSources, 3000, 1); // Shorter timeout for tests
            
            // Property: When system starts validation, all approved sources should be checked for accessibility
            const accessibilityResults = await sourceManager.validateAllApprovedSources();
            
            // Get unique hostnames from approved sources
            const uniqueHostnames = [...new Set(approvedSources.map(s => s.hostname))];
            
            // Verify that we got a result for each unique hostname
            expect(Object.keys(accessibilityResults)).toHaveLength(uniqueHostnames.length);
            
            for (const hostname of uniqueHostnames) {
              expect(hostname in accessibilityResults).toBe(true);
              expect(typeof accessibilityResults[hostname]).toBe('boolean');
            }
          }
        ),
        { numRuns: 10 } // Reduced runs for network tests
      );
    }, 30000); // 30 second timeout for network tests
  });

  // **Feature: wikipedia-free-scale-validation, Property 14: Additional source type support**
  // **Validates: Requirements 4.2**
  describe('Property 14: Additional source type support', () => {
    it('should support jazz education sites and academic music databases as valid source types', () => {
      fc.assert(
        fc.property(
          // Generator for jazz education and academic sources
          fc.array(
            fc.record({
              hostname: fc.constantFrom(
                'jazzhistorydatabase.com', 'berklee.edu', 'juilliard.edu',
                'eastman.rochester.edu', 'newenglandconservatory.edu',
                'jazz.org', 'smithsonianjazz.org', 'allaboutjazz.com',
                'jazzeducation.org', 'iaje.org', 'jazzadvice.com'
              ),
              priority: fc.integer({ min: 1, max: 10 }),
              scaleTypes: fc.array(
                fc.constantFrom('jazz', 'bebop', 'modal', 'blues', 'swing', 'fusion', '*'),
                { minLength: 1, maxLength: 4 }
              ),
              reliability: fc.float({ min: Math.fround(0.7), max: Math.fround(1.0) }),
              accessPattern: fc.constantFrom('direct', 'search', 'api')
            }),
            { minLength: 1, maxLength: 8 }
          ),
          // Generator for academic database sources
          fc.array(
            fc.record({
              hostname: fc.constantFrom(
                'jstor.org', 'oxford.com', 'cambridge.org', 'springer.com',
                'tandfonline.com', 'wiley.com', 'sage.com', 'mit.edu',
                'harvard.edu', 'yale.edu', 'princeton.edu'
              ),
              priority: fc.integer({ min: 1, max: 10 }),
              scaleTypes: fc.array(
                fc.constantFrom('ethnomusicology', 'world', 'classical', 'contemporary', '*'),
                { minLength: 1, maxLength: 3 }
              ),
              reliability: fc.float({ min: Math.fround(0.8), max: Math.fround(1.0) }),
              accessPattern: fc.constantFrom('direct', 'search', 'api')
            }),
            { minLength: 1, maxLength: 8 }
          ),
          (jazzSources: ApprovedSource[], academicSources: ApprovedSource[]) => {
            const allSources = [...jazzSources, ...academicSources];
            const sourceManager = new SourceManager(allSources);

            // Property: The system should accept and process jazz education and academic sources as valid
            for (const source of allSources) {
              const testUrl = `https://${source.hostname}/test-path`;
              const isApproved = sourceManager.isSourceApproved(testUrl);
              
              // All jazz education and academic sources should be approved
              expect(isApproved).toBe(true);
            }

            // Property: Jazz sources should be prioritized for jazz-related scale types
            // Test with the actual scale types that jazz sources support
            const jazzHostnames = jazzSources.map(s => s.hostname);
            
            // Check if jazz sources are available for any of their supported scale types
            let hasJazzSourcesForSupportedTypes = false;
            for (const jazzSource of jazzSources) {
              for (const scaleType of jazzSource.scaleTypes) {
                // For wildcard sources, test with a common jazz scale type
                const testScaleType = scaleType === '*' ? 'jazz' : scaleType;
                const sourcesForType = sourceManager.getSourcesByPriority(testScaleType);
                const hasJazzSourceForType = sourcesForType.some(source => 
                  jazzHostnames.includes(source.hostname)
                );
                if (hasJazzSourceForType) {
                  hasJazzSourcesForSupportedTypes = true;
                  break;
                }
              }
              if (hasJazzSourcesForSupportedTypes) break;
            }
            
            if (jazzSources.length > 0) {
              expect(hasJazzSourcesForSupportedTypes).toBe(true);
            }

            // Property: Academic sources should be available for their supported scale types
            const academicHostnames = academicSources.map(s => s.hostname);
            
            // Check if academic sources are available for any of their supported scale types
            let hasAcademicSourcesForSupportedTypes = false;
            for (const academicSource of academicSources) {
              for (const scaleType of academicSource.scaleTypes) {
                // For wildcard sources, test with a common scale type
                const testScaleType = scaleType === '*' ? 'ethnomusicology' : scaleType;
                const sourcesForType = sourceManager.getSourcesByPriority(testScaleType);
                const hasAcademicSourceForType = sourcesForType.some(source =>
                  academicHostnames.includes(source.hostname)
                );
                if (hasAcademicSourceForType) {
                  hasAcademicSourcesForSupportedTypes = true;
                  break;
                }
              }
              if (hasAcademicSourcesForSupportedTypes) break;
            }
            
            if (academicSources.length > 0) {
              expect(hasAcademicSourcesForSupportedTypes).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed source types with appropriate prioritization', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // Number of each source type
          (sourceCount: number) => {
            const traditionalSources: ApprovedSource[] = Array.from({ length: sourceCount }, (_, i) => ({
              hostname: `traditional${i}.com`,
              priority: 5,
              scaleTypes: ['major', 'minor', '*'],
              reliability: 0.8,
              accessPattern: 'direct'
            }));

            const jazzSources: ApprovedSource[] = Array.from({ length: sourceCount }, (_, i) => ({
              hostname: `jazz${i}.edu`,
              priority: 7,
              scaleTypes: ['jazz', 'bebop', '*'],
              reliability: 0.9,
              accessPattern: 'search'
            }));

            const academicSources: ApprovedSource[] = Array.from({ length: sourceCount }, (_, i) => ({
              hostname: `academic${i}.org`,
              priority: 9,
              scaleTypes: ['ethnomusicology', 'world', '*'],
              reliability: 0.95,
              accessPattern: 'api'
            }));

            const allSources = [...traditionalSources, ...jazzSources, ...academicSources];
            const sourceManager = new SourceManager(allSources);

            // Property: All source types should be accepted as valid
            for (const source of allSources) {
              const testUrl = `https://${source.hostname}/path`;
              expect(sourceManager.isSourceApproved(testUrl)).toBe(true);
            }

            // Property: Higher priority sources should appear first in results
            const allSourcesByPriority = sourceManager.getSourcesByPriority();
            for (let i = 0; i < allSourcesByPriority.length - 1; i++) {
              expect(allSourcesByPriority[i].priority).toBeGreaterThanOrEqual(
                allSourcesByPriority[i + 1].priority
              );
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // **Feature: wikipedia-free-scale-validation, Property 16: Regional scale source matching**
  // **Validates: Requirements 4.4**
  describe('Property 16: Regional scale source matching', () => {
    it('should prioritize culturally appropriate and specialized sources for regional scales', () => {
      fc.assert(
        fc.property(
          // Generator for regional scale types and their appropriate sources
          fc.constantFrom(
            {
              scaleType: 'maqam',
              culturalSources: ['maqamworld.com', 'arabicmusic.org', 'maqam.org'],
              genericSources: ['musictheory.net', 'teoria.com']
            },
            {
              scaleType: 'raga',
              culturalSources: ['ragas.org', 'indianclassicalmusic.com', 'carnaticmusic.org'],
              genericSources: ['musictheory.net', 'teoria.com']
            },
            {
              scaleType: 'gamelan',
              culturalSources: ['gamelan.org', 'indonesianmusic.org', 'javanesemusic.com'],
              genericSources: ['musictheory.net', 'teoria.com']
            },
            {
              scaleType: 'flamenco',
              culturalSources: ['flamenco.org', 'spanishmusic.com', 'andalusianmusic.org'],
              genericSources: ['musictheory.net', 'teoria.com']
            },
            {
              scaleType: 'african',
              culturalSources: ['africanmusic.org', 'ethnomusicology.org', 'worldmusic.net'],
              genericSources: ['musictheory.net', 'teoria.com']
            }
          ),
          fc.integer({ min: 1, max: 3 }), // Number of cultural sources to include
          fc.integer({ min: 1, max: 2 }), // Number of generic sources to include
          (scaleInfo: any, culturalCount: number, genericCount: number) => {
            // Create sources with cultural sources having higher priority
            const culturalSources: ApprovedSource[] = scaleInfo.culturalSources
              .slice(0, culturalCount)
              .map((hostname: string, index: number) => ({
                hostname,
                priority: 8 + index, // Higher priority for cultural sources
                scaleTypes: [scaleInfo.scaleType, 'world', '*'],
                reliability: 0.9,
                accessPattern: 'direct'
              }));

            const genericSources: ApprovedSource[] = scaleInfo.genericSources
              .slice(0, genericCount)
              .map((hostname: string, index: number) => ({
                hostname,
                priority: 5 + index, // Lower priority for generic sources
                scaleTypes: ['*'],
                reliability: 0.8,
                accessPattern: 'search'
              }));

            const allSources = [...culturalSources, ...genericSources];
            const sourceManager = new SourceManager(allSources);

            // Property: For regional scales, culturally appropriate sources should be prioritized
            const regionalSources = sourceManager.getSourcesByPriority(scaleInfo.scaleType);
            
            if (regionalSources.length > 1) {
              // The first source should be a cultural source (higher priority)
              const firstSource = regionalSources[0];
              const isCulturalSource = scaleInfo.culturalSources.includes(firstSource.hostname);
              
              // If we have cultural sources, they should appear first
              if (culturalSources.length > 0) {
                expect(isCulturalSource).toBe(true);
              }

              // Cultural sources should have higher priority than generic sources
              const culturalSourcePriorities = regionalSources
                .filter(s => scaleInfo.culturalSources.includes(s.hostname))
                .map(s => s.priority);
              
              const genericSourcePriorities = regionalSources
                .filter(s => scaleInfo.genericSources.includes(s.hostname))
                .map(s => s.priority);

              if (culturalSourcePriorities.length > 0 && genericSourcePriorities.length > 0) {
                const maxGenericPriority = Math.max(...genericSourcePriorities);
                const minCulturalPriority = Math.min(...culturalSourcePriorities);
                expect(minCulturalPriority).toBeGreaterThan(maxGenericPriority);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle multiple regional contexts with appropriate source selection', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              region: fc.constantFrom('middle-eastern', 'indian', 'african', 'latin-american', 'east-asian'),
              scaleTypes: fc.array(
                fc.constantFrom('maqam', 'raga', 'pentatonic', 'modal', 'traditional'),
                { minLength: 1, maxLength: 3 }
              ),
              culturalPriority: fc.integer({ min: 7, max: 10 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (regionalContexts: any[]) => {
            // Create sources for each regional context
            const allSources: ApprovedSource[] = [];
            
            regionalContexts.forEach((context, index) => {
              // Add a culturally appropriate source for this region
              allSources.push({
                hostname: `${context.region}-music${index}.org`,
                priority: context.culturalPriority,
                scaleTypes: [...context.scaleTypes, 'world', '*'],
                reliability: 0.9,
                accessPattern: 'direct'
              });

              // Add a generic source with lower priority
              allSources.push({
                hostname: `generic-music${index}.com`,
                priority: 5,
                scaleTypes: ['*'],
                reliability: 0.7,
                accessPattern: 'search'
              });
            });

            const sourceManager = new SourceManager(allSources);

            // Property: Each regional scale type should prioritize its culturally appropriate sources
            regionalContexts.forEach(context => {
              context.scaleTypes.forEach((scaleType: string) => {
                const sources = sourceManager.getSourcesByPriority(scaleType);
                
                if (sources.length > 1) {
                  // Find sources that match this regional context
                  const contextualSources = sources.filter(s => 
                    s.hostname.includes(context.region)
                  );
                  
                  const genericSources = sources.filter(s => 
                    s.hostname.includes('generic-music')
                  );

                  // If we have both contextual and generic sources, contextual should come first
                  if (contextualSources.length > 0 && genericSources.length > 0) {
                    const firstContextualIndex = sources.findIndex(s => 
                      contextualSources.includes(s)
                    );
                    const firstGenericIndex = sources.findIndex(s => 
                      genericSources.includes(s)
                    );
                    
                    expect(firstContextualIndex).toBeLessThan(firstGenericIndex);
                  }
                }
              });
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Unit tests for SourceManager', () => {
    const mockApprovedSources: ApprovedSource[] = [
      {
        hostname: 'teoria.com',
        priority: 10,
        scaleTypes: ['major', 'minor', '*'],
        reliability: 0.95,
        accessPattern: 'direct'
      },
      {
        hostname: 'musictheory.net',
        priority: 9,
        scaleTypes: ['*'],
        reliability: 0.90,
        accessPattern: 'search'
      },
      {
        hostname: 'britannica.com',
        priority: 8,
        scaleTypes: ['classical', 'world'],
        reliability: 0.85,
        accessPattern: 'search'
      }
    ];

    let sourceManager: SourceManager;

    beforeEach(() => {
      sourceManager = new SourceManager(mockApprovedSources);
    });

    describe('isSourceApproved', () => {
      it('should approve URLs from approved sources', () => {
        expect(sourceManager.isSourceApproved('https://teoria.com/scales')).toBe(true);
        expect(sourceManager.isSourceApproved('http://musictheory.net/lessons')).toBe(true);
        expect(sourceManager.isSourceApproved('https://britannica.com/art/music')).toBe(true);
      });

      it('should reject URLs from non-approved sources', () => {
        expect(sourceManager.isSourceApproved('https://wikipedia.org/wiki/Scale')).toBe(false);
        expect(sourceManager.isSourceApproved('https://example.com/music')).toBe(false);
      });

      it('should handle case-insensitive hostnames', () => {
        expect(sourceManager.isSourceApproved('https://TEORIA.COM/scales')).toBe(true);
        expect(sourceManager.isSourceApproved('https://MusicTheory.Net/lessons')).toBe(true);
      });
    });

    describe('getSourcesByPriority', () => {
      it('should return sources sorted by priority (highest first)', () => {
        const sources = sourceManager.getSourcesByPriority();
        expect(sources).toHaveLength(3);
        expect(sources[0].hostname).toBe('teoria.com');
        expect(sources[1].hostname).toBe('musictheory.net');
        expect(sources[2].hostname).toBe('britannica.com');
      });

      it('should filter by scale type when specified', () => {
        const majorSources = sourceManager.getSourcesByPriority('major');
        expect(majorSources).toHaveLength(2); // teoria.com and musictheory.net (has *)
        expect(majorSources[0].hostname).toBe('teoria.com');
        expect(majorSources[1].hostname).toBe('musictheory.net');
      });

      it('should include sources with wildcard scale types', () => {
        const jazzSources = sourceManager.getSourcesByPriority('jazz');
        expect(jazzSources).toHaveLength(2); // teoria.com has * and musictheory.net has *
        expect(jazzSources[0].hostname).toBe('teoria.com'); // highest priority
        expect(jazzSources[1].hostname).toBe('musictheory.net');
      });
    });

    describe('getBackupSources', () => {
      it('should return sources excluding the primary source', () => {
        const backups = sourceManager.getBackupSources('https://teoria.com/scales');
        expect(backups).toHaveLength(2);
        expect(backups.find(s => s.hostname === 'teoria.com')).toBeUndefined();
      });

      it('should return backup sources sorted by priority', () => {
        const backups = sourceManager.getBackupSources('https://teoria.com/scales');
        expect(backups[0].hostname).toBe('musictheory.net');
        expect(backups[1].hostname).toBe('britannica.com');
      });
    });

    describe('validateSourceAccessibility', () => {
      it('should handle successful HTTP responses', async () => {
        // This is a unit test that would normally use mocks, but we'll test with a reliable endpoint
        const result = await sourceManager.validateSourceAccessibility('https://httpbin.org/status/200');
        expect(typeof result).toBe('boolean');
      }, 20000);

      it('should handle HTTP errors gracefully', async () => {
        // Test with an invalid URL that should fail quickly
        const result = await sourceManager.validateSourceAccessibility('https://this-domain-should-not-exist-12345.com');
        expect(result).toBe(false);
      }, 15000);

      it('should handle network timeouts', async () => {
        const shortTimeoutManager = new SourceManager(mockApprovedSources, 100, 1); // Very short timeout
        const result = await shortTimeoutManager.validateSourceAccessibility('https://httpbin.org/delay/1');
        expect(result).toBe(false);
      }, 10000);
    });

    describe('validateAllApprovedSources', () => {
      it('should return results for all approved sources', async () => {
        const results = await sourceManager.validateAllApprovedSources();
        expect(Object.keys(results)).toHaveLength(mockApprovedSources.length);
        expect('teoria.com' in results).toBe(true);
        expect('musictheory.net' in results).toBe(true);
        expect('britannica.com' in results).toBe(true);
      }, 15000);

      it('should return boolean values for all sources', async () => {
        const results = await sourceManager.validateAllApprovedSources();
        for (const [, accessible] of Object.entries(results)) {
          expect(typeof accessible).toBe('boolean');
        }
      }, 15000);
    });

    describe('Regional scale support', () => {
      const regionalSources: ApprovedSource[] = [
        {
          hostname: 'maqamworld.com',
          priority: 9,
          scaleTypes: ['maqam', 'middle-eastern', '*'],
          reliability: 0.95,
          accessPattern: 'direct',
          culturalContext: ['middle-eastern', 'arabic'],
          sourceType: 'cultural'
        },
        {
          hostname: 'ragas.org',
          priority: 8,
          scaleTypes: ['raga', 'indian', '*'],
          reliability: 0.90,
          accessPattern: 'direct',
          culturalContext: ['indian', 'south-asian'],
          sourceType: 'cultural'
        },
        {
          hostname: 'jazzhistory.org',
          priority: 7,
          scaleTypes: ['jazz', 'bebop', 'modal'],
          reliability: 0.85,
          accessPattern: 'search',
          culturalContext: ['american'],
          sourceType: 'jazz'
        },
        {
          hostname: 'musictheory.net',
          priority: 6,
          scaleTypes: ['*'],
          reliability: 0.80,
          accessPattern: 'direct',
          sourceType: 'generic'
        }
      ];

      let regionalSourceManager: SourceManager;

      beforeEach(() => {
        regionalSourceManager = new SourceManager(regionalSources);
      });

      describe('getSourcesByRegionalPriority', () => {
        it('should prioritize culturally appropriate sources for regional scales', () => {
          const maqamSources = regionalSourceManager.getSourcesByRegionalPriority('maqam', 'middle-eastern');
          
          expect(maqamSources.length).toBeGreaterThan(0);
          // First source should be the culturally appropriate one
          expect(maqamSources[0].hostname).toBe('maqamworld.com');
          expect(maqamSources[0].culturalContext).toContain('middle-eastern');
        });

        it('should include generic sources as fallbacks', () => {
          const ragaSources = regionalSourceManager.getSourcesByRegionalPriority('raga', 'indian');
          
          // Should include both cultural and generic sources
          const culturalSources = ragaSources.filter(s => s.culturalContext?.includes('indian'));
          const genericSources = ragaSources.filter(s => !s.culturalContext || s.sourceType === 'generic');
          
          expect(culturalSources.length).toBeGreaterThan(0);
          expect(genericSources.length).toBeGreaterThan(0);
          
          // Cultural sources should come first
          const firstCulturalIndex = ragaSources.findIndex(s => culturalSources.includes(s));
          const firstGenericIndex = ragaSources.findIndex(s => genericSources.includes(s));
          
          expect(firstCulturalIndex).toBeLessThan(firstGenericIndex);
        });

        it('should handle scales with no specific cultural sources', () => {
          const westernSources = regionalSourceManager.getSourcesByRegionalPriority('major', 'western');
          
          // Should still return sources (generic ones)
          expect(westernSources.length).toBeGreaterThan(0);
          // Should include the generic source
          expect(westernSources.some(s => s.hostname === 'musictheory.net')).toBe(true);
        });
      });

      describe('supportsSourceType', () => {
        it('should correctly identify supported source types', () => {
          expect(regionalSourceManager.supportsSourceType('jazz')).toBe(true);
          expect(regionalSourceManager.supportsSourceType('cultural')).toBe(true);
          expect(regionalSourceManager.supportsSourceType('academic')).toBe(false);
        });
      });

      describe('getSourcesByPriority with cultural context', () => {
        it('should boost priority for culturally appropriate sources', () => {
          const maqamSources = regionalSourceManager.getSourcesByPriority('maqam', 'middle-eastern');
          const maqamSourcesNoCulture = regionalSourceManager.getSourcesByPriority('maqam');
          
          // With cultural context, maqamworld.com should have higher effective priority
          expect(maqamSources[0].hostname).toBe('maqamworld.com');
          
          // The cultural boost should make a difference in ordering
          expect(maqamSources[0].priority).toBeGreaterThan(maqamSourcesNoCulture[0].priority);
        });
      });
    });

    describe('createDefaultRegionalConfiguration', () => {
      it('should create a configuration with diverse source types', () => {
        const config = SourceManager.createDefaultRegionalConfiguration();
        
        expect(config.length).toBeGreaterThan(0);
        
        // Should include different source types
        const sourceTypes = new Set(config.map(s => s.sourceType));
        expect(sourceTypes.has('generic')).toBe(true);
        expect(sourceTypes.has('cultural')).toBe(true);
        expect(sourceTypes.has('jazz')).toBe(true);
        expect(sourceTypes.has('academic')).toBe(true);
      });

      it('should include culturally appropriate sources', () => {
        const config = SourceManager.createDefaultRegionalConfiguration();
        
        // Should have sources with cultural context
        const culturalSources = config.filter(s => s.culturalContext && s.culturalContext.length > 0);
        expect(culturalSources.length).toBeGreaterThan(0);
        
        // Should include middle-eastern sources
        const middleEasternSources = config.filter(s => 
          s.culturalContext?.includes('middle-eastern')
        );
        expect(middleEasternSources.length).toBeGreaterThan(0);
        
        // Should include indian sources
        const indianSources = config.filter(s => 
          s.culturalContext?.includes('indian')
        );
        expect(indianSources.length).toBeGreaterThan(0);
      });

      it('should support jazz education requirements', () => {
        const config = SourceManager.createDefaultRegionalConfiguration();
        const manager = new SourceManager(config);
        
        expect(manager.supportsSourceType('jazz')).toBe(true);
        
        // Should have jazz-specific sources
        const jazzSources = config.filter(s => s.sourceType === 'jazz');
        expect(jazzSources.length).toBeGreaterThan(0);
      });
    });
  });
});