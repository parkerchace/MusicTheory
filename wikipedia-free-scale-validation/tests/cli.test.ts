/**
 * Integration tests for CLI functionality
 * Tests full validation workflow, report generation, and error handling scenarios
 * Requirements: 5.1, 5.2
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationCLI } from '../src/cli';
import { ScaleData } from '../src/interfaces';

describe('CLI Integration Tests', () => {
  let cli: ValidationCLI;
  let testDataDir: string;
  let testOutputDir: string;

  beforeEach(async () => {
    cli = new ValidationCLI();
    testDataDir = path.join(__dirname, 'test-data');
    testOutputDir = path.join(__dirname, 'test-output');
    
    // Create test directories
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directories
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Full Validation Workflow', () => {
    test('should complete full validation workflow with sample scales', async () => {
      // Create test scale data
      const testScales: ScaleData[] = [
        {
          id: 'c-major-test',
          name: 'C Major',
          culturalContext: 'Western',
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          intervals: [0, 2, 4, 5, 7, 9, 11],
          description: 'The most basic major scale in Western music theory'
        },
        {
          id: 'pentatonic-test',
          name: 'Pentatonic Scale',
          culturalContext: 'Global',
          notes: ['C', 'D', 'E', 'G', 'A'],
          intervals: [0, 2, 4, 7, 9],
          description: 'A five-note scale found in many musical traditions worldwide'
        }
      ];

      const inputPath = path.join(testDataDir, 'test-scales.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      // Run CLI validation
      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'both' as const,
        verbose: false,
        progress: false,
        timeout: 5000,
        retries: 2
      };

      // This should complete without throwing
      await expect(cli.run(options)).resolves.not.toThrow();

      // Verify output files were created
      const outputFiles = await fs.readdir(testOutputDir);
      const jsonFiles = outputFiles.filter(f => f.endsWith('.json'));
      const mdFiles = outputFiles.filter(f => f.endsWith('.md'));

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(mdFiles.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for integration test

    test('should handle batch processing correctly', async () => {
      // Create larger test dataset
      const testScales: ScaleData[] = Array.from({ length: 5 }, (_, i) => ({
        id: `test-scale-${i}`,
        name: `Test Scale ${i}`,
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: `Test scale number ${i}`
      }));

      const inputPath = path.join(testDataDir, 'batch-scales.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'json' as const,
        batch: true,
        batchSize: 2,
        verbose: false,
        progress: false,
        timeout: 5000,
        retries: 1
      };

      await expect(cli.run(options)).resolves.not.toThrow();

      // Verify results
      const outputFiles = await fs.readdir(testOutputDir);
      expect(outputFiles.length).toBeGreaterThan(0);
    }, 20000);

    test('should process scales with different cultural contexts', async () => {
      const testScales: ScaleData[] = [
        {
          id: 'western-major',
          name: 'Major Scale',
          culturalContext: 'Western',
          notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          intervals: [0, 2, 4, 5, 7, 9, 11],
          description: 'Western major scale'
        },
        {
          id: 'arabic-maqam',
          name: 'Maqam Hijaz',
          culturalContext: 'Arabic',
          notes: ['D', 'Eb', 'F#', 'G', 'A', 'Bb', 'C'],
          intervals: [0, 1, 4, 5, 7, 8, 10],
          description: 'Arabic maqam scale'
        }
      ];

      const inputPath = path.join(testDataDir, 'cultural-scales.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      await expect(cli.run(options)).resolves.not.toThrow();
    }, 15000);
  });

  describe('Report Generation', () => {
    test('should generate JSON reports correctly', async () => {
      const testScales: ScaleData[] = [{
        id: 'json-test',
        name: 'JSON Test Scale',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Scale for JSON report testing'
      }];

      const inputPath = path.join(testDataDir, 'json-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      await cli.run(options);

      const outputFiles = await fs.readdir(testOutputDir);
      const jsonFile = outputFiles.find(f => f.endsWith('.json'));
      expect(jsonFile).toBeDefined();

      if (jsonFile) {
        const reportContent = await fs.readFile(path.join(testOutputDir, jsonFile), 'utf-8');
        const report = JSON.parse(reportContent);
        
        expect(typeof report).toBe('object');
        expect(report).not.toBeNull();
        expect('summary' in report).toBe(true);
        expect('results' in report).toBe(true);
        expect('metadata' in report).toBe(true);
        expect(Array.isArray(report.results)).toBe(true);
        expect(typeof report.summary).toBe('object');
        expect('totalScales' in report.summary).toBe(true);
        expect('verifiedScales' in report.summary).toBe(true);
      }
    }, 15000);

    test('should generate Markdown reports correctly', async () => {
      const testScales: ScaleData[] = [{
        id: 'md-test',
        name: 'Markdown Test Scale',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Scale for Markdown report testing'
      }];

      const inputPath = path.join(testDataDir, 'md-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'markdown' as const,
        verbose: false,
        progress: false
      };

      await cli.run(options);

      const outputFiles = await fs.readdir(testOutputDir);
      const mdFile = outputFiles.find(f => f.endsWith('.md'));
      expect(mdFile).toBeDefined();

      if (mdFile) {
        const reportContent = await fs.readFile(path.join(testOutputDir, mdFile), 'utf-8');
        
        expect(reportContent).toContain('# Wikipedia-Free Scale Validation Report');
        expect(reportContent).toContain('## Summary');
        expect(reportContent).toContain('Total Scales');
      }
    }, 15000);

    test('should generate both JSON and Markdown reports when format is "both"', async () => {
      const testScales: ScaleData[] = [{
        id: 'both-test',
        name: 'Both Format Test Scale',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Scale for both format testing'
      }];

      const inputPath = path.join(testDataDir, 'both-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'both' as const,
        verbose: false,
        progress: false
      };

      await cli.run(options);

      const outputFiles = await fs.readdir(testOutputDir);
      const jsonFiles = outputFiles.filter(f => f.endsWith('.json'));
      const mdFiles = outputFiles.filter(f => f.endsWith('.md'));

      expect(jsonFiles.length).toBeGreaterThan(0);
      expect(mdFiles.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Error Handling Scenarios', () => {
    test('should handle missing input file gracefully', async () => {
      const options = {
        input: path.join(testDataDir, 'nonexistent.json'),
        output: testOutputDir,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      // Should exit with error code 1
      await expect(cli.run(options)).rejects.toThrow();
    });

    test('should handle invalid JSON input gracefully', async () => {
      const invalidJsonPath = path.join(testDataDir, 'invalid.json');
      await fs.writeFile(invalidJsonPath, 'invalid json content');

      const options = {
        input: invalidJsonPath,
        output: testOutputDir,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      await expect(cli.run(options)).rejects.toThrow();
    });

    test('should handle empty scale array', async () => {
      const emptyScalesPath = path.join(testDataDir, 'empty.json');
      await fs.writeFile(emptyScalesPath, JSON.stringify([]));

      const options = {
        input: emptyScalesPath,
        output: testOutputDir,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      // Should complete successfully with empty results
      await expect(cli.run(options)).resolves.not.toThrow();

      const outputFiles = await fs.readdir(testOutputDir);
      expect(outputFiles.length).toBeGreaterThan(0);
    });

    test('should handle network timeout scenarios', async () => {
      const testScales: ScaleData[] = [{
        id: 'timeout-test',
        name: 'Timeout Test Scale',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Scale for timeout testing'
      }];

      const inputPath = path.join(testDataDir, 'timeout-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'json' as const,
        timeout: 100, // Very short timeout to trigger timeouts
        retries: 1,
        verbose: false,
        progress: false
      };

      // Should complete but may have failed validations due to timeouts
      await expect(cli.run(options)).resolves.not.toThrow();

      const outputFiles = await fs.readdir(testOutputDir);
      expect(outputFiles.length).toBeGreaterThan(0);
    }, 10000);

    test('should handle invalid output directory permissions', async () => {
      const testScales: ScaleData[] = [{
        id: 'permission-test',
        name: 'Permission Test Scale',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Scale for permission testing'
      }];

      const inputPath = path.join(testDataDir, 'permission-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      // Try to write to a path that should fail - use a file as directory path
      const existingFilePath = path.join(testDataDir, 'existing-file.txt');
      await fs.writeFile(existingFilePath, 'test');
      
      const options = {
        input: inputPath,
        output: existingFilePath, // This should fail because it's a file, not a directory
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      // Should fail gracefully
      await expect(cli.run(options)).rejects.toThrow();
    });

    test('should handle malformed scale data', async () => {
      const malformedScales = [
        {
          id: 'malformed-1',
          // Missing required fields
          notes: ['C', 'D', 'E']
        },
        {
          // Missing id
          name: 'Malformed Scale 2',
          culturalContext: 'Western',
          notes: ['C', 'D', 'E'],
          intervals: [0, 2, 4]
        }
      ];

      const inputPath = path.join(testDataDir, 'malformed.json');
      await fs.writeFile(inputPath, JSON.stringify(malformedScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      // Should handle malformed data gracefully
      await expect(cli.run(options)).resolves.not.toThrow();
    });
  });

  describe('Configuration and Sources', () => {
    test('should load custom approved sources configuration', async () => {
      const customSources = [
        {
          hostname: 'custom-source.com',
          priority: 10,
          scaleTypes: ['*'],
          reliability: 0.9,
          accessPattern: 'search'
        }
      ];

      const sourcesPath = path.join(testDataDir, 'custom-sources.json');
      await fs.writeFile(sourcesPath, JSON.stringify(customSources, null, 2));

      const testScales: ScaleData[] = [{
        id: 'custom-source-test',
        name: 'Custom Source Test',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Test with custom sources'
      }];

      const inputPath = path.join(testDataDir, 'custom-source-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        sources: sourcesPath,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      await expect(cli.run(options)).resolves.not.toThrow();
    });

    test('should handle invalid sources configuration file', async () => {
      const invalidSourcesPath = path.join(testDataDir, 'invalid-sources.json');
      await fs.writeFile(invalidSourcesPath, 'invalid json');

      const testScales: ScaleData[] = [{
        id: 'invalid-sources-test',
        name: 'Invalid Sources Test',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Test with invalid sources'
      }];

      const inputPath = path.join(testDataDir, 'invalid-sources-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        sources: invalidSourcesPath,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      await expect(cli.run(options)).rejects.toThrow();
    });
  });

  describe('Progress and Verbose Output', () => {
    test('should handle verbose mode correctly', async () => {
      const testScales: ScaleData[] = [{
        id: 'verbose-test',
        name: 'Verbose Test Scale',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Scale for verbose testing'
      }];

      const inputPath = path.join(testDataDir, 'verbose-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'json' as const,
        verbose: true,
        progress: true
      };

      // Should complete successfully with verbose output
      await expect(cli.run(options)).resolves.not.toThrow();
    });

    test('should handle progress disabled mode', async () => {
      const testScales: ScaleData[] = [{
        id: 'no-progress-test',
        name: 'No Progress Test Scale',
        culturalContext: 'Western',
        notes: ['C', 'D', 'E'],
        intervals: [0, 2, 4],
        description: 'Scale for no progress testing'
      }];

      const inputPath = path.join(testDataDir, 'no-progress-test.json');
      await fs.writeFile(inputPath, JSON.stringify(testScales, null, 2));

      const options = {
        input: inputPath,
        output: testOutputDir,
        format: 'json' as const,
        verbose: false,
        progress: false
      };

      await expect(cli.run(options)).resolves.not.toThrow();
    });
  });
});