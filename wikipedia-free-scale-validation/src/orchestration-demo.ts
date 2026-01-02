#!/usr/bin/env node

/**
 * Demonstration of the complete validation orchestration workflow
 * This shows how all components work together to validate scales
 */

import { ValidationEngine } from './validation-engine';
import { SourceManager } from './source-manager';
import { CitationEngine } from './citation-engine';
import { InternetVerifier } from './internet-verifier';
import { ApprovedSource, ScaleData } from './interfaces';

// Example approved sources configuration
const approvedSources: ApprovedSource[] = [
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
  }
];

// Example scale database
const testScales: ScaleData[] = [
  {
    id: 'c-major',
    name: 'C Major',
    culturalContext: 'Western',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'The most basic major scale in Western music theory'
  },
  {
    id: 'a-minor',
    name: 'A Minor',
    culturalContext: 'Western',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'The natural minor scale, relative to C Major'
  },
  {
    id: 'pentatonic',
    name: 'Pentatonic Scale',
    culturalContext: 'Global',
    notes: ['C', 'D', 'E', 'G', 'A'],
    intervals: [0, 2, 4, 7, 9],
    description: 'A five-note scale found in many musical traditions worldwide'
  }
];

async function demonstrateOrchestration() {
  console.log('🎵 Wikipedia-Free Scale Validation System - Orchestration Demo');
  console.log('================================================================\n');

  try {
    // Initialize all components
    console.log('1. Initializing validation components...');
    const sourceManager = new SourceManager(approvedSources);
    const citationEngine = new CitationEngine({
      timeoutMs: 10000,
      retryAttempts: 3
    });
    const internetVerifier = new InternetVerifier();
    const validationEngine = new ValidationEngine(sourceManager, citationEngine, internetVerifier);
    console.log('   ✅ All components initialized\n');

    // Execute complete validation orchestration
    console.log('2. Executing complete validation orchestration...');
    console.log(`   📊 Processing ${testScales.length} scales`);
    
    const startTime = Date.now();
    const orchestrationResult = await validationEngine.orchestrateCompleteValidation(testScales);
    const endTime = Date.now();
    
    console.log(`   ⏱️  Validation completed in ${endTime - startTime}ms\n`);

    // Display results
    console.log('3. Validation Results Summary:');
    console.log('==============================');
    console.log(`   Total Scales Processed: ${orchestrationResult.completionStatus.totalProcessed}`);
    console.log(`   Successfully Verified: ${orchestrationResult.completionStatus.successfullyVerified}`);
    console.log(`   Verification Rate: ${(orchestrationResult.completionStatus.verificationRate * 100).toFixed(1)}%`);
    console.log(`   All Checks Completed: ${orchestrationResult.completionStatus.allChecksCompleted ? '✅' : '❌'}\n`);

    // Display detailed summary
    console.log('4. Detailed Validation Summary:');
    console.log('===============================');
    const summary = orchestrationResult.summary;
    console.log(`   📈 Total Scales: ${summary.totalScales}`);
    console.log(`   ✅ Verified: ${summary.verifiedScales}`);
    console.log(`   ❌ Failed: ${summary.failedScales}`);
    console.log(`   ⚠️  Unverifiable: ${summary.unverifiableScales}`);
    console.log(`   🚫 Wikipedia Rejections: ${summary.wikipediaRejections}`);
    console.log(`   🔄 Backup Source Usage: ${summary.backupSourceUsage}\n`);

    // Display source diversity
    if (Object.keys(summary.sourceDiversity).length > 0) {
      console.log('5. Source Diversity Analysis:');
      console.log('=============================');
      for (const [hostname, count] of Object.entries(summary.sourceDiversity)) {
        const percentage = ((count / summary.verifiedScales) * 100).toFixed(1);
        console.log(`   📍 ${hostname}: ${count} scales (${percentage}%)`);
      }
      console.log();
    }

    // Display individual scale results
    console.log('6. Individual Scale Results:');
    console.log('============================');
    for (const result of orchestrationResult.results) {
      const statusIcon = result.status === 'verified' ? '✅' : result.status === 'failed' ? '❌' : '⚠️';
      const riskIcon = result.hallucinationRisk === 'low' ? '🟢' : result.hallucinationRisk === 'medium' ? '🟡' : '🔴';
      
      console.log(`   ${statusIcon} ${result.scaleId} (${result.status})`);
      console.log(`      🎯 Hallucination Risk: ${riskIcon} ${result.hallucinationRisk}`);
      console.log(`      🌐 Internet Verification: ${result.internetVerification.scaleExists ? '✅' : '❌'} (confidence: ${result.internetVerification.confidence})`);
      console.log(`      📚 Sources Tested: ${result.sources.length}`);
      
      if (result.primarySource) {
        console.log(`      🏆 Primary Source: ${result.primarySource}`);
      }
      
      if (result.errorSummary && result.errorSummary.totalErrors > 0) {
        console.log(`      ⚠️  Errors: ${result.errorSummary.totalErrors} (${Object.keys(result.errorSummary.errorsByCategory).join(', ')})`);
      }
      
      console.log();
    }

    console.log('🎉 Orchestration demonstration completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('• ✅ Dual validation (HTTP + content) for all sources');
    console.log('• 🚫 Wikipedia source rejection with fallback');
    console.log('• 🔄 Backup source utilization');
    console.log('• 📊 Comprehensive error reporting');
    console.log('• 🌐 Internet existence verification');
    console.log('• 📈 Source diversity enforcement');
    console.log('• 🎯 Hallucination risk assessment');

  } catch (error) {
    console.error('❌ Orchestration failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateOrchestration().catch(console.error);
}

export { demonstrateOrchestration };