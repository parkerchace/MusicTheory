import { ScaleDatabase } from '../src/scale-database';
import { ScaleData, ValidationResult } from '../src/interfaces';
import * as fc from 'fast-check';

describe('ScaleDatabase', () => {
  let scaleDatabase: ScaleDatabase;

  beforeEach(() => {
    scaleDatabase = new ScaleDatabase();
  });

  it('should create a ScaleDatabase instance', () => {
    expect(scaleDatabase).toBeDefined();
  });

  // **Feature: wikipedia-free-scale-validation, Property 6: Authoritative source requirement**
  it('Property 6: Authoritative source requirement - scales returned should have authoritative non-Wikipedia sources', () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        id: fc.string({ minLength: 1 }),
        name: fc.string({ minLength: 1 }),
        culturalContext: fc.option(fc.string(), { nil: undefined }),
        notes: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        intervals: fc.array(fc.integer({ min: 0, max: 12 }), { minLength: 1 }),
        description: fc.option(fc.string(), { nil: undefined })
      }),
      fc.record({
        scaleId: fc.string({ minLength: 1 }),
        status: fc.constantFrom('verified', 'failed', 'pending', 'unverifiable') as fc.Arbitrary<'verified' | 'failed' | 'pending' | 'unverifiable'>,
        sources: fc.array(fc.record({
          url: fc.oneof(
            fc.constant('https://www.teoria.com/en/reference/c/c-major.php'),
            fc.constant('https://www.musictheory.net/lessons/21'),
            fc.constant('https://en.wikipedia.org/wiki/Major_scale'), // Wikipedia source
            fc.constant('https://www.britannica.com/art/major-scale')
          ),
          title: fc.string({ minLength: 1 }),
          accessible: fc.boolean(),
          contentMatch: fc.boolean(),
          httpStatus: fc.integer({ min: 200, max: 599 }),
          notes: fc.array(fc.string())
        }), { minLength: 1 }),
        internetVerification: fc.record({
          scaleExists: fc.boolean(),
          sourcesFound: fc.integer({ min: 0, max: 10 }),
          independentConfirmations: fc.integer({ min: 0, max: 5 }),
          searchQueries: fc.array(fc.string()),
          foundSources: fc.array(fc.string()),
          confidence: fc.float({ min: 0, max: 1 }),
          notes: fc.array(fc.string())
        }),
        primarySource: fc.string(),
        backupSources: fc.array(fc.string()),
        validatedAt: fc.date(),
        hallucinationRisk: fc.constantFrom('low', 'medium', 'high') as fc.Arbitrary<'low' | 'medium' | 'high'>
      }),
      async (scaleData: ScaleData, validationResult: ValidationResult) => {
        // Create a fresh database instance for each test to avoid interference
        const testDatabase = new ScaleDatabase();
        
        // Ensure scaleId matches
        validationResult.scaleId = scaleData.id;
        
        // Add the scale to database
        await testDatabase.addScale(scaleData, validationResult);
        
        // Get the scale back
        const retrievedScale = await testDatabase.getScale(scaleData.id);
        
        if (retrievedScale !== null) {
          // If scale is returned, it must have been verified with authoritative sources
          const storedValidation = await testDatabase.getValidationResult(scaleData.id);
          expect(storedValidation).not.toBeNull();
          
          if (storedValidation) {
            // Check that at least one source is non-Wikipedia, accessible, and content-matched
            const hasAuthoritativeSource = storedValidation.sources.some(source => {
              const isNotWikipedia = !source.url.toLowerCase().includes('wikipedia.org') && 
                                   !source.url.toLowerCase().includes('wikimedia.org');
              return isNotWikipedia && source.accessible && source.contentMatch;
            });
            
            // If scale is returned, it must have authoritative sources and be verified
            expect(hasAuthoritativeSource).toBe(true);
            expect(storedValidation.status).toBe('verified');
          }
        }
      }
    ), { numRuns: 10 }); // Reduced runs for faster testing
  });

  // **Feature: wikipedia-free-scale-validation, Property 9: Unverified scale marking**
  it('Property 9: Unverified scale marking - scales with only Wikipedia sources should be marked as unverified', () => {
    fc.assert(fc.asyncProperty(
      fc.record({
        id: fc.string({ minLength: 1 }),
        name: fc.string({ minLength: 1 }),
        culturalContext: fc.option(fc.string(), { nil: undefined }),
        notes: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
        intervals: fc.array(fc.integer({ min: 0, max: 12 }), { minLength: 1 }),
        description: fc.option(fc.string(), { nil: undefined })
      }),
      async (scaleData: ScaleData) => {
        // Create a fresh database instance for each test to avoid interference
        const testDatabase = new ScaleDatabase();
        
        // Create validation result with only Wikipedia sources
        const wikipediaValidationResult: ValidationResult = {
          scaleId: scaleData.id,
          status: 'failed', // Wikipedia sources should result in failed status
          sources: [
            {
              url: 'https://en.wikipedia.org/wiki/Major_scale',
              title: 'Major scale - Wikipedia',
              accessible: true,
              contentMatch: true,
              httpStatus: 200,
              notes: []
            }
          ],
          internetVerification: {
            scaleExists: true,
            sourcesFound: 1,
            independentConfirmations: 0,
            searchQueries: [scaleData.name],
            foundSources: ['wikipedia.org'],
            confidence: 0.3,
            notes: ['Only Wikipedia sources found']
          },
          primarySource: 'https://en.wikipedia.org/wiki/Major_scale',
          backupSources: [],
          validatedAt: new Date(),
          hallucinationRisk: 'medium'
        };
        
        // Add the scale with Wikipedia-only validation
        await testDatabase.addScale(scaleData, wikipediaValidationResult);
        
        // Scale should not be returned in general queries (only verified scales)
        const retrievedScale = await testDatabase.getScale(scaleData.id);
        expect(retrievedScale).toBeNull();
        
        // Should require authoritative source
        const requiresAuth = await testDatabase.requiresAuthoritativeSource(scaleData.id);
        expect(requiresAuth).toBe(true);
        
        // Should be marked as unverified (check the stored scale directly)
        const allStoredScales = await testDatabase.getAllStoredScales();
        const storedScale = allStoredScales.find(scale => scale.id === scaleData.id);
        expect(storedScale).toBeDefined();
        expect(storedScale?.isVerified).toBe(false);
      }
    ), { numRuns: 10 }); // Reduced runs for faster testing
  });

  // Unit tests for core functionality
  describe('Core functionality', () => {
    it('should store and retrieve verified scales', async () => {
      const scaleData: ScaleData = {
        id: 'test-major',
        name: 'C Major',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        intervals: [2, 2, 1, 2, 2, 2, 1],
        description: 'The C major scale'
      };

      const validationResult: ValidationResult = {
        scaleId: 'test-major',
        status: 'verified',
        sources: [{
          url: 'https://www.teoria.com/en/reference/c/c-major.php',
          title: 'C Major Scale',
          accessible: true,
          contentMatch: true,
          httpStatus: 200,
          notes: []
        }],
        internetVerification: {
          scaleExists: true,
          sourcesFound: 3,
          independentConfirmations: 2,
          searchQueries: ['C Major scale'],
          foundSources: ['teoria.com', 'musictheory.net'],
          confidence: 0.9,
          notes: []
        },
        primarySource: 'https://www.teoria.com/en/reference/c/c-major.php',
        backupSources: [],
        validatedAt: new Date(),
        hallucinationRisk: 'low'
      };

      await scaleDatabase.addScale(scaleData, validationResult);
      const retrieved = await scaleDatabase.getScale('test-major');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('C Major');
    });

    it('should mark scales as unverified when they lack authoritative sources', async () => {
      const scaleData: ScaleData = {
        id: 'test-unverified',
        name: 'Unknown Scale',
        notes: ['C', 'D', 'E'],
        intervals: [2, 2]
      };

      // First add the scale with a failed validation
      const failedValidation: ValidationResult = {
        scaleId: 'test-unverified',
        status: 'failed',
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

      await scaleDatabase.addScale(scaleData, failedValidation);
      
      // Then mark it as unverified with a specific reason
      await scaleDatabase.markScaleAsUnverified('test-unverified', 'No reliable sources found');
      
      const unverifiedScales = await scaleDatabase.getScalesByStatus('unverified');
      expect(unverifiedScales.some(scale => scale.id === 'test-unverified')).toBe(true);
    });
  });
});