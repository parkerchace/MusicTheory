/**
 * Performance Benchmark Tests
 * Specifically tests Requirement 3.3: Complete within 30 seconds for full database
 */

import { CompleteValidationSystem } from '../src/complete-validation-system';
import { ScaleData } from '../src/interfaces';

describe('Performance Benchmark Tests', () => {
  const PERFORMANCE_TARGET = 30000; // 30 seconds in milliseconds
  
  /**
   * Generate a comprehensive scale database for performance testing
   */
  function generateLargeScaleDatabase(count: number = 50): ScaleData[] {
    const scales: ScaleData[] = [];
    const scaleTypes = [
      { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], context: 'Western' },
      { name: 'Minor', intervals: [0, 2, 3, 5, 7, 8, 10], context: 'Western' },
      { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], context: 'Modal' },
      { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], context: 'Modal' },
      { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], context: 'Modal' },
      { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], context: 'Modal' },
      { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], context: 'Modal' },
      { name: 'Pentatonic', intervals: [0, 2, 4, 7, 9], context: 'Global' },
      { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], context: 'African-American' },
      { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], context: 'Western' },
      { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11], context: 'Western' },
      { name: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10], context: 'Impressionist' },
      { name: 'Chromatic', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], context: 'Western' },
      { name: 'Diminished', intervals: [0, 2, 3, 5, 6, 8, 9, 11], context: 'Jazz' },
      { name: 'Augmented', intervals: [0, 3, 4, 7, 8, 11], context: 'Jazz' }
    ];

    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    for (let i = 0; i < count; i++) {
      const scaleType = scaleTypes[i % scaleTypes.length];
      const key = keys[i % keys.length];
      
      scales.push({
        id: `${key.toLowerCase()}-${scaleType.name.toLowerCase().replace(/\s+/g, '-')}-${i}`,
        name: `${key} ${scaleType.name}`,
        culturalContext: scaleType.context,
        notes: generateNotesFromIntervals(key, scaleType.intervals),
        intervals: scaleType.intervals,
        description: `${scaleType.name} scale in ${key} for performance testing`
      });
    }

    return scales;
  }

  /**
   * Generate note names from intervals and root key
   */
  function generateNotesFromIntervals(rootKey: string, intervals: number[]): string[] {
    const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootIndex = chromaticScale.indexOf(rootKey);
    
    return intervals.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return chromaticScale[noteIndex];
    });
  }

  describe('30-Second Performance Requirement', () => {
    test('should complete validation within 30 seconds for large database', async () => {
      // Generate a more realistic scale database for performance testing
      const largeScaleDatabase = generateLargeScaleDatabase(25);
      
      const config = CompleteValidationSystem.getDefaultConfig();
      config.enableDetailedLogging = false; // Disable logging for performance
      config.performanceTarget = PERFORMANCE_TARGET;
      
      const validationSystem = new CompleteValidationSystem(config);
      
      const startTime = Date.now();
      const result = await validationSystem.executeCompleteValidation(largeScaleDatabase);
      const endTime = Date.now();
      
      const actualTime = endTime - startTime;
      
      // Verify performance requirement is met
      expect(actualTime).toBeLessThanOrEqual(PERFORMANCE_TARGET);
      expect(result.performanceMetrics.totalTime).toBeLessThanOrEqual(PERFORMANCE_TARGET);
      expect(result.performanceMetrics.meetsPerformanceTarget).toBe(true);
      expect(result.completionStatus.meetsPerformanceRequirement).toBe(true);
      
      // Log performance results for analysis
      console.log(`Performance Test Results:`);
      console.log(`  Scales Processed: ${largeScaleDatabase.length}`);
      console.log(`  Total Time: ${actualTime}ms`);
      console.log(`  Average Time per Scale: ${(actualTime / largeScaleDatabase.length).toFixed(2)}ms`);
      console.log(`  Scales per Second: ${(largeScaleDatabase.length / (actualTime / 1000)).toFixed(2)}`);
      console.log(`  Performance Target: ${PERFORMANCE_TARGET}ms`);
      console.log(`  Target Met: ${actualTime <= PERFORMANCE_TARGET ? '✅' : '❌'}`);
    }, 35000); // Allow 35 seconds for test timeout

    test('should maintain performance with diverse scale types', async () => {
      // Generate scales with various cultural contexts and complexities
      const diverseScales: ScaleData[] = [
        ...generateLargeScaleDatabase(30),
        // Add some complex scales
        {
          id: 'complex-raga',
          name: 'Raga Yaman',
          culturalContext: 'Indian',
          notes: ['C', 'D', 'E', 'F#', 'G', 'A', 'B'],
          intervals: [0, 2, 4, 6, 7, 9, 11],
          description: 'Complex Indian raga for performance testing'
        },
        {
          id: 'complex-maqam',
          name: 'Maqam Hijaz',
          culturalContext: 'Arabic',
          notes: ['D', 'Eb', 'F#', 'G', 'A', 'Bb', 'C'],
          intervals: [0, 1, 4, 5, 7, 8, 10],
          description: 'Complex Arabic maqam for performance testing'
        }
      ];
      
      const config = CompleteValidationSystem.getDefaultConfig();
      config.enableDetailedLogging = false;
      
      const validationSystem = new CompleteValidationSystem(config);
      
      const startTime = Date.now();
      const result = await validationSystem.executeCompleteValidation(diverseScales);
      const endTime = Date.now();
      
      const actualTime = endTime - startTime;
      
      expect(actualTime).toBeLessThanOrEqual(PERFORMANCE_TARGET);
      expect(result.completionStatus.totalProcessed).toBe(diverseScales.length);
      expect(result.performanceMetrics.meetsPerformanceTarget).toBe(true);
    }, 35000);

    test('should provide accurate performance metrics', async () => {
      const testScales = generateLargeScaleDatabase(10);
      
      const config = CompleteValidationSystem.getDefaultConfig();
      config.enableDetailedLogging = false;
      
      const validationSystem = new CompleteValidationSystem(config);
      
      const result = await validationSystem.executeCompleteValidation(testScales);
      
      // Verify performance metrics accuracy
      expect(result.performanceMetrics.totalTime).toBeGreaterThan(0);
      expect(result.performanceMetrics.averageTimePerScale).toBe(
        result.performanceMetrics.totalTime / testScales.length
      );
      expect(result.performanceMetrics.scalesPerSecond).toBe(
        1000 / result.performanceMetrics.averageTimePerScale
      );
      
      // Verify component times sum to reasonable total
      const componentSum = Object.values(result.performanceMetrics.componentTimes)
        .reduce((sum, time) => sum + time, 0);
      expect(componentSum).toBeLessThanOrEqual(result.performanceMetrics.totalTime * 1.1); // Allow 10% variance
    });

    test('should handle performance under concurrent load', async () => {
      const testScales = generateLargeScaleDatabase(15);
      
      const config = CompleteValidationSystem.getDefaultConfig();
      config.enableDetailedLogging = false;
      
      // Run multiple validation systems concurrently
      const validationPromises = Array.from({ length: 3 }, () => {
        const system = new CompleteValidationSystem(config);
        return system.executeCompleteValidation(testScales);
      });
      
      const startTime = Date.now();
      const results = await Promise.all(validationPromises);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      
      // Each individual validation should meet performance target
      results.forEach(result => {
        expect(result.performanceMetrics.meetsPerformanceTarget).toBe(true);
        expect(result.completionStatus.totalProcessed).toBe(testScales.length);
      });
      
      // Concurrent execution should not significantly degrade performance
      expect(totalTime).toBeLessThanOrEqual(PERFORMANCE_TARGET * 1.5); // Allow 50% overhead for concurrency
    }, 50000);
  });

  describe('Performance Optimization Verification', () => {
    test('should demonstrate performance improvement over baseline', async () => {
      const testScales = generateLargeScaleDatabase(25);
      
      // Test with optimized configuration
      const optimizedConfig = CompleteValidationSystem.getDefaultConfig();
      optimizedConfig.enableDetailedLogging = false;
      optimizedConfig.citationTimeout = 5000; // Reduced timeout
      optimizedConfig.retryAttempts = 2; // Reduced retries
      
      const optimizedSystem = new CompleteValidationSystem(optimizedConfig);
      
      const optimizedStart = Date.now();
      const optimizedResult = await optimizedSystem.executeCompleteValidation(testScales);
      const optimizedTime = Date.now() - optimizedStart;
      
      // Test with default configuration
      const defaultConfig = CompleteValidationSystem.getDefaultConfig();
      defaultConfig.enableDetailedLogging = false;
      
      const defaultSystem = new CompleteValidationSystem(defaultConfig);
      
      const defaultStart = Date.now();
      const defaultResult = await defaultSystem.executeCompleteValidation(testScales);
      const defaultTime = Date.now() - defaultStart;
      
      // Both should meet performance target
      expect(optimizedTime).toBeLessThanOrEqual(PERFORMANCE_TARGET);
      expect(defaultTime).toBeLessThanOrEqual(PERFORMANCE_TARGET);
      
      // Optimized should be faster or comparable
      expect(optimizedTime).toBeLessThanOrEqual(defaultTime * 1.2); // Allow 20% variance
      
      console.log(`Performance Comparison:`);
      console.log(`  Optimized: ${optimizedTime}ms`);
      console.log(`  Default: ${defaultTime}ms`);
      console.log(`  Improvement: ${((defaultTime - optimizedTime) / defaultTime * 100).toFixed(1)}%`);
    }, 40000);
  });
});