/**
 * Complete Integration Tests for Wikipedia-Free Scale Validation System
 * Tests the full integration of all components working together
 */

import { CompleteValidationSystem, CompleteValidationConfig } from '../src/complete-validation-system';
import { ScaleData } from '../src/interfaces';

describe('Complete Integration Tests', () => {
  let validationSystem: CompleteValidationSystem;
  let testConfig: CompleteValidationConfig;

  beforeEach(() => {
    testConfig = {
      approvedSources: [
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
        }
      ],
      citationTimeout: 5000,
      retryAttempts: 2,
      performanceTarget: 30000,
      outputDirectory: './test-reports',
      enableDetailedLogging: false
    };

    validationSystem = new CompleteValidationSystem(testConfig);
  });

  describe('Complete System Integration', () => {
    test('should integrate all components successfully', async () => {
      const testScales: ScaleData[] = [
        {
          id: 'test-major',
          name: 'C Major',
          culturalContext: 'Western',
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          intervals: [0, 2, 4, 5, 7, 9, 11],
          description: 'Test major scale'
        }
      ];

      const result = await validationSystem.executeCompleteValidation(testScales);

      // Verify integration completeness
      expect(result.validationResults).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();
      expect(result.reportPaths).toBeDefined();
      expect(result.completionStatus).toBeDefined();

      // Verify all scales were processed
      expect(result.completionStatus.totalProcessed).toBe(testScales.length);
      expect(result.validationResults.length).toBe(testScales.length);
    });

    test('should meet performance requirements', async () => {
      const testScales: ScaleData[] = [
        {
          id: 'perf-test-1',
          name: 'C Major',
          culturalContext: 'Western',
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          intervals: [0, 2, 4, 5, 7, 9, 11],
          description: 'Performance test scale 1'
        },
        {
          id: 'perf-test-2',
          name: 'A Minor',
          culturalContext: 'Western',
          notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
          intervals: [0, 2, 3, 5, 7, 8, 10],
          description: 'Performance test scale 2'
        }
      ];

      const result = await validationSystem.executeCompleteValidation(testScales);

      // Verify performance metrics
      expect(result.performanceMetrics.totalTime).toBeLessThanOrEqual(testConfig.performanceTarget);
      expect(result.performanceMetrics.meetsPerformanceTarget).toBe(true);
      expect(result.completionStatus.meetsPerformanceRequirement).toBe(true);
    });

    test('should generate both JSON and Markdown reports', async () => {
      const testScales: ScaleData[] = [
        {
          id: 'report-test',
          name: 'Test Scale',
          culturalContext: 'Test',
          notes: ['C', 'D', 'E'],
          intervals: [0, 2, 4],
          description: 'Test scale for report generation'
        }
      ];

      const result = await validationSystem.executeCompleteValidation(testScales);

      // Verify report generation
      expect(result.reportPaths.jsonReport).toBeDefined();
      expect(result.reportPaths.markdownReport).toBeDefined();
      expect(result.reportPaths.jsonReport).toMatch(/\.json$/);
      expect(result.reportPaths.markdownReport).toMatch(/\.md$/);
    });

    test('should handle comprehensive validation workflow', async () => {
      const testScales: ScaleData[] = [
        {
          id: 'workflow-test-1',
          name: 'Major Scale',
          culturalContext: 'Western',
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          intervals: [0, 2, 4, 5, 7, 9, 11],
          description: 'Major scale for workflow test'
        },
        {
          id: 'workflow-test-2',
          name: 'Pentatonic Scale',
          culturalContext: 'Global',
          notes: ['C', 'D', 'E', 'G', 'A'],
          intervals: [0, 2, 4, 7, 9],
          description: 'Pentatonic scale for workflow test'
        }
      ];

      const result = await validationSystem.executeCompleteValidation(testScales);

      // Verify comprehensive workflow completion
      expect(result.completionStatus.allChecksCompleted).toBe(true);
      expect(result.summary.totalScales).toBe(testScales.length);
      
      // Verify all validation results have required properties
      result.validationResults.forEach(validationResult => {
        expect(validationResult.scaleId).toBeDefined();
        expect(validationResult.status).toBeDefined();
        expect(validationResult.sources).toBeDefined();
        expect(validationResult.internetVerification).toBeDefined();
        expect(validationResult.hallucinationRisk).toBeDefined();
        expect(validationResult.validatedAt).toBeDefined();
      });
    });

    test('should handle empty scale database gracefully', async () => {
      const emptyScales: ScaleData[] = [];

      const result = await validationSystem.executeCompleteValidation(emptyScales);

      expect(result.completionStatus.totalProcessed).toBe(0);
      expect(result.validationResults.length).toBe(0);
      expect(result.summary.totalScales).toBe(0);
      expect(result.completionStatus.allChecksCompleted).toBe(true);
    });

    test('should provide detailed performance metrics', async () => {
      const testScales: ScaleData[] = [
        {
          id: 'metrics-test',
          name: 'Test Scale',
          culturalContext: 'Test',
          notes: ['C', 'E', 'G'],
          intervals: [0, 4, 7],
          description: 'Scale for metrics testing'
        }
      ];

      const result = await validationSystem.executeCompleteValidation(testScales);

      // Verify performance metrics structure
      expect(result.performanceMetrics.totalTime).toBeGreaterThan(0);
      expect(result.performanceMetrics.averageTimePerScale).toBeGreaterThan(0);
      expect(result.performanceMetrics.scalesPerSecond).toBeGreaterThan(0);
      expect(result.performanceMetrics.componentTimes).toBeDefined();
      expect(result.performanceMetrics.componentTimes.sourceValidation).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.componentTimes.citationVerification).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.componentTimes.internetVerification).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics.componentTimes.reportGeneration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Default Configuration', () => {
    test('should provide valid default configuration', () => {
      const defaultConfig = CompleteValidationSystem.getDefaultConfig();

      expect(defaultConfig.approvedSources).toBeDefined();
      expect(defaultConfig.approvedSources.length).toBeGreaterThan(0);
      expect(defaultConfig.citationTimeout).toBeGreaterThan(0);
      expect(defaultConfig.retryAttempts).toBeGreaterThan(0);
      expect(defaultConfig.performanceTarget).toBe(30000); // 30 seconds requirement
      expect(defaultConfig.outputDirectory).toBeDefined();
      expect(typeof defaultConfig.enableDetailedLogging).toBe('boolean');
    });

    test('should include required approved sources', () => {
      const defaultConfig = CompleteValidationSystem.getDefaultConfig();
      const hostnames = defaultConfig.approvedSources.map(source => source.hostname);

      expect(hostnames).toContain('teoria.com');
      expect(hostnames).toContain('musictheory.net');
      expect(hostnames).toContain('britannica.com');
      expect(hostnames).toContain('maqamworld.com');
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors gracefully', async () => {
      const invalidConfig = {
        ...testConfig,
        approvedSources: [] // Empty sources should cause graceful handling
      };

      const invalidSystem = new CompleteValidationSystem(invalidConfig);
      const testScales: ScaleData[] = [
        {
          id: 'error-test',
          name: 'Test Scale',
          culturalContext: 'Test',
          notes: ['C'],
          intervals: [0],
          description: 'Scale for error testing'
        }
      ];

      // Should not throw, but handle gracefully
      const result = await invalidSystem.executeCompleteValidation(testScales);
      expect(result).toBeDefined();
      expect(result.completionStatus.totalProcessed).toBe(testScales.length);
    });
  });
});