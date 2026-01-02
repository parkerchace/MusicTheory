#!/usr/bin/env node

/**
 * Command-line interface for Wikipedia-Free Scale Validation System
 * Similar to the old validate-citations.js but with enhanced capabilities
 */

import { program } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ValidationEngine } from './validation-engine';
import { SourceManager } from './source-manager';
import { CitationEngine } from './citation-engine';
import { InternetVerifier } from './internet-verifier';
import { ReportGenerator } from './report-generator';
import { ApprovedSource, ScaleData, ValidationResult } from './interfaces';

interface CLIOptions {
  input?: string;
  output?: string;
  format?: 'json' | 'markdown' | 'both';
  sources?: string;
  timeout?: number;
  retries?: number;
  verbose?: boolean;
  progress?: boolean;
  batch?: boolean;
  batchSize?: number;
}

class ValidationCLI {
  private validationEngine?: ValidationEngine;
  private reportGenerator: ReportGenerator;
  private verbose: boolean = false;
  private showProgress: boolean = true;

  constructor() {
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Initialize the validation system with configuration
   */
  async initialize(options: CLIOptions): Promise<void> {
    this.verbose = options.verbose || false;
    this.showProgress = options.progress !== false;

    // Load approved sources
    const approvedSources = await this.loadApprovedSources(options.sources);
    
    // Initialize components
    const sourceManager = new SourceManager(approvedSources);
    const citationEngine = new CitationEngine({
      timeoutMs: options.timeout || 10000,
      retryAttempts: options.retries || 3
    });
    const internetVerifier = new InternetVerifier();
    
    this.validationEngine = new ValidationEngine(sourceManager, citationEngine, internetVerifier);
    
    if (this.verbose) {
      console.log(`✅ Initialized with ${approvedSources.length} approved sources`);
      console.log(`⚙️  Timeout: ${options.timeout || 10000}ms, Retries: ${options.retries || 3}`);
    }
  }

  /**
   * Load approved sources from file or use defaults
   */
  private async loadApprovedSources(sourcesPath?: string): Promise<ApprovedSource[]> {
    if (sourcesPath) {
      try {
        const sourcesContent = await fs.readFile(sourcesPath, 'utf-8');
        return JSON.parse(sourcesContent);
      } catch (error) {
        throw new Error(`Failed to load sources from ${sourcesPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Default approved sources
    return [
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
        hostname: 'maqamworld.com',
        priority: 7,
        scaleTypes: ['middle-eastern', 'arabic'],
        reliability: 0.85,
        accessPattern: 'search'
      }
    ];
  }

  /**
   * Load scale data from input file
   */
  private async loadScaleData(inputPath: string): Promise<ScaleData[]> {
    try {
      const inputContent = await fs.readFile(inputPath, 'utf-8');
      const data = JSON.parse(inputContent);
      
      // Handle different input formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.scales && Array.isArray(data.scales)) {
        return data.scales;
      } else {
        throw new Error('Input file must contain an array of scales or an object with a "scales" property');
      }
    } catch (error) {
      throw new Error(`Failed to load scale data from ${inputPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Display progress information
   */
  private displayProgress(current: number, total: number, scaleName: string): void {
    if (!this.showProgress) return;
    
    const percentage = ((current / total) * 100).toFixed(1);
    const progressBar = this.createProgressBar(current, total, 30);
    
    process.stdout.write(`\r🔍 [${progressBar}] ${percentage}% (${current}/${total}) - ${scaleName.substring(0, 30)}...`);
    
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  /**
   * Create a visual progress bar
   */
  private createProgressBar(current: number, total: number, width: number): string {
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Validate scales with batch processing support
   */
  async validateScales(scales: ScaleData[], options: CLIOptions): Promise<ValidationResult[]> {
    if (!this.validationEngine) {
      throw new Error('Validation engine not initialized');
    }

    const results: ValidationResult[] = [];
    const startTime = Date.now();

    if (options.batch && options.batchSize && options.batchSize > 1) {
      // Batch processing
      if (this.verbose) {
        console.log(`📦 Processing ${scales.length} scales in batches of ${options.batchSize}`);
      }

      for (let i = 0; i < scales.length; i += options.batchSize) {
        const batch = scales.slice(i, i + options.batchSize);
        const batchNumber = Math.floor(i / options.batchSize) + 1;
        const totalBatches = Math.ceil(scales.length / options.batchSize);

        if (this.verbose) {
          console.log(`\n📋 Processing batch ${batchNumber}/${totalBatches} (${batch.length} scales)`);
        }

        const batchResults = await Promise.all(
          batch.map(async (scale, index) => {
            const globalIndex = i + index;
            this.displayProgress(globalIndex + 1, scales.length, scale.name);
            return await this.validationEngine!.validateScale(scale.id, scale);
          })
        );

        results.push(...batchResults);

        if (this.verbose && batchNumber < totalBatches) {
          console.log(`✅ Batch ${batchNumber} completed`);
        }
      }
    } else {
      // Sequential processing
      if (this.verbose) {
        console.log(`🔄 Processing ${scales.length} scales sequentially`);
      }

      for (let i = 0; i < scales.length; i++) {
        const scale = scales[i];
        this.displayProgress(i + 1, scales.length, scale.name);
        
        const result = await this.validationEngine.validateScale(scale.id, scale);
        results.push(result);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (this.showProgress || this.verbose) {
      console.log(`\n⏱️  Validation completed in ${duration}ms (${(duration / scales.length).toFixed(1)}ms per scale)`);
    }

    return results;
  }

  /**
   * Generate and save reports
   */
  async generateReports(results: ValidationResult[], options: CLIOptions): Promise<void> {
    const outputDir = options.output || './validation-reports';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const format = options.format || 'both';

    // Ensure output directory exists
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create output directory ${outputDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const summary = this.validationEngine!.generateValidationSummary();

    if (format === 'json' || format === 'both') {
      const jsonPath = path.join(outputDir, `validation-report-${timestamp}.json`);
      const jsonReport = this.reportGenerator.generateJSONReport(results);
      await fs.writeFile(jsonPath, jsonReport);
      console.log(`📄 JSON report saved: ${jsonPath}`);
    }

    if (format === 'markdown' || format === 'both') {
      const mdPath = path.join(outputDir, `validation-report-${timestamp}.md`);
      const mdReport = this.reportGenerator.generateMarkdownReport(results);
      await fs.writeFile(mdPath, mdReport);
      console.log(`📝 Markdown report saved: ${mdPath}`);
    }

    // Display summary
    console.log('\n📊 Validation Summary:');
    console.log('======================');
    console.log(`Total Scales: ${summary.totalScales}`);
    console.log(`✅ Verified: ${summary.verifiedScales}`);
    console.log(`❌ Failed: ${summary.failedScales}`);
    console.log(`⚠️  Unverifiable: ${summary.unverifiableScales}`);
    console.log(`🚫 Wikipedia Rejections: ${summary.wikipediaRejections}`);
    console.log(`🔄 Backup Source Usage: ${summary.backupSourceUsage}`);
    
    if (Object.keys(summary.sourceDiversity).length > 0) {
      console.log('\n🌐 Source Diversity:');
      for (const [hostname, count] of Object.entries(summary.sourceDiversity)) {
        const percentage = ((count / summary.verifiedScales) * 100).toFixed(1);
        console.log(`  ${hostname}: ${count} (${percentage}%)`);
      }
    }
  }

  /**
   * Main CLI execution
   */
  async run(options: CLIOptions): Promise<void> {
    try {
      // Initialize system
      await this.initialize(options);

      // Load input data
      if (!options.input) {
        throw new Error('Input file is required. Use --input <path> to specify scale data file.');
      }

      const scales = await this.loadScaleData(options.input);
      
      if (this.verbose) {
        console.log(`📚 Loaded ${scales.length} scales from ${options.input}`);
      }

      // Validate scales
      const results = await this.validateScales(scales, options);

      // Generate reports
      await this.generateReports(results, options);

      console.log('\n🎉 Validation completed successfully!');

    } catch (error) {
      console.error('❌ Validation failed:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

// CLI Program Definition
program
  .name('scale-validator')
  .description('Wikipedia-Free Scale Validation System CLI')
  .version('1.0.0');

program
  .command('validate')
  .description('Validate musical scales against approved sources')
  .requiredOption('-i, --input <path>', 'Input JSON file containing scale data')
  .option('-o, --output <path>', 'Output directory for reports', './validation-reports')
  .option('-f, --format <format>', 'Report format: json, markdown, or both', 'both')
  .option('-s, --sources <path>', 'JSON file containing approved sources configuration')
  .option('-t, --timeout <ms>', 'HTTP request timeout in milliseconds', '10000')
  .option('-r, --retries <count>', 'Number of retry attempts for failed requests', '3')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--no-progress', 'Disable progress reporting')
  .option('-b, --batch', 'Enable batch processing')
  .option('--batch-size <size>', 'Number of scales to process in each batch', '10')
  .action(async (options: CLIOptions) => {
    const cli = new ValidationCLI();
    await cli.run(options);
  });

program
  .command('demo')
  .description('Run validation demonstration with sample data')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options: { verbose?: boolean }) => {
    const { demonstrateOrchestration } = await import('./orchestration-demo');
    await demonstrateOrchestration();
  });

// Parse command line arguments
if (require.main === module) {
  program.parse();
}

export { ValidationCLI };