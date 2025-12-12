#!/usr/bin/env node

/**
 * Test the complete validation system against the full scale database
 * This tests Requirement 3.3: Complete within 30 seconds for full database
 */

import { CompleteValidationSystem } from './src/complete-validation-system';
import { ScaleData } from './src/interfaces';

// Generate a comprehensive scale database similar to the main project
function generateFullScaleDatabase(): ScaleData[] {
  const scales: ScaleData[] = [];
  
  // Major scales in all keys
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const scaleTypes = [
    { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], context: 'Western' },
    { name: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10], context: 'Western' },
    { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], context: 'Western' },
    { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11], context: 'Western' },
    { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], context: 'Modal' },
    { name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10], context: 'Modal' },
    { name: 'Lydian', intervals: [0, 2, 4, 6, 7, 9, 11], context: 'Modal' },
    { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], context: 'Modal' },
    { name: 'Aeolian', intervals: [0, 2, 3, 5, 7, 8, 10], context: 'Modal' },
    { name: 'Locrian', intervals: [0, 1, 3, 5, 6, 8, 10], context: 'Modal' },
    { name: 'Pentatonic Major', intervals: [0, 2, 4, 7, 9], context: 'Global' },
    { name: 'Pentatonic Minor', intervals: [0, 3, 5, 7, 10], context: 'Global' },
    { name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], context: 'African-American' },
    { name: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10], context: 'Impressionist' },
    { name: 'Diminished', intervals: [0, 2, 3, 5, 6, 8, 9, 11], context: 'Jazz' },
    { name: 'Augmented', intervals: [0, 3, 4, 7, 8, 11], context: 'Jazz' },
    { name: 'Hungarian Minor', intervals: [0, 2, 3, 6, 7, 8, 11], context: 'Eastern European' },
    { name: 'Neapolitan Minor', intervals: [0, 1, 3, 5, 7, 8, 11], context: 'Classical' },
    { name: 'Persian', intervals: [0, 1, 4, 5, 6, 8, 11], context: 'Middle Eastern' },
    { name: 'Arabic', intervals: [0, 1, 4, 5, 7, 8, 10], context: 'Middle Eastern' }
  ];

  // Generate scales for each key and type combination
  for (const key of keys) {
    for (const scaleType of scaleTypes) {
      scales.push({
        id: `${key.toLowerCase()}-${scaleType.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: `${key} ${scaleType.name}`,
        culturalContext: scaleType.context,
        notes: generateNotesFromIntervals(key, scaleType.intervals),
        intervals: scaleType.intervals,
        description: `${scaleType.name} scale in ${key}`
      });
    }
  }

  // Add some special scales
  const specialScales: ScaleData[] = [
    {
      id: 'chromatic',
      name: 'Chromatic Scale',
      culturalContext: 'Western',
      notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
      intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      description: 'A scale containing all twelve pitches'
    },
    {
      id: 'octatonic',
      name: 'Octatonic Scale',
      culturalContext: 'Modern Classical',
      notes: ['C', 'D', 'Eb', 'F', 'Gb', 'Ab', 'A', 'B'],
      intervals: [0, 2, 3, 5, 6, 8, 9, 11],
      description: 'An eight-note scale alternating whole and half steps'
    },
    {
      id: 'hirajoshi',
      name: 'Hirajoshi Scale',
      culturalContext: 'Japanese',
      notes: ['C', 'D', 'Eb', 'G', 'Ab'],
      intervals: [0, 2, 3, 7, 8],
      description: 'A traditional Japanese pentatonic scale'
    },
    {
      id: 'in-sen',
      name: 'In Sen Scale',
      culturalContext: 'Japanese',
      notes: ['C', 'Db', 'F', 'G', 'Bb'],
      intervals: [0, 1, 5, 7, 10],
      description: 'Another traditional Japanese pentatonic scale'
    }
  ];

  scales.push(...specialScales);

  console.log(`Generated ${scales.length} scales for full database test`);
  return scales;
}

function generateNotesFromIntervals(rootKey: string, intervals: number[]): string[] {
  const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rootIndex = chromaticScale.indexOf(rootKey);
  
  return intervals.map(interval => {
    const noteIndex = (rootIndex + interval) % 12;
    return chromaticScale[noteIndex];
  });
}

async function testFullDatabase() {
  console.log('🎵 Wikipedia-Free Scale Validation - Full Database Performance Test');
  console.log('===================================================================\n');

  try {
    // Generate full scale database
    const fullDatabase = generateFullScaleDatabase();
    console.log(`📊 Testing with ${fullDatabase.length} scales\n`);

    // Configure system for performance
    const config = CompleteValidationSystem.getDefaultConfig();
    config.enableDetailedLogging = true;
    config.performanceTarget = 30000; // 30 seconds
    
    const validationSystem = new CompleteValidationSystem(config);
    
    // Execute validation
    console.log('⏱️  Starting validation...');
    const startTime = Date.now();
    
    const result = await validationSystem.executeCompleteValidation(fullDatabase);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Report results
    console.log('\n🎉 Full Database Validation Results');
    console.log('===================================');
    console.log(`📊 Total Scales: ${result.completionStatus.totalProcessed}`);
    console.log(`✅ Successfully Verified: ${result.completionStatus.successfullyVerified}`);
    console.log(`📈 Verification Rate: ${(result.completionStatus.verificationRate * 100).toFixed(1)}%`);
    console.log(`⏱️  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`🎯 Performance Target: ${totalTime <= 30000 ? '✅ MET' : '❌ MISSED'} (30s)`);
    console.log(`🚀 Scales/Second: ${(fullDatabase.length / (totalTime / 1000)).toFixed(2)}`);
    console.log(`🔧 All Checks Completed: ${result.completionStatus.allChecksCompleted ? '✅' : '❌'}`);
    console.log(`📄 Reports Generated: ${result.reportPaths.jsonReport ? '✅' : '❌'}`);
    
    // Performance breakdown
    console.log('\n⚡ Performance Breakdown:');
    console.log(`   Average per Scale: ${(totalTime / fullDatabase.length).toFixed(2)}ms`);
    console.log(`   Source Validation: ${result.performanceMetrics.componentTimes.sourceValidation}ms`);
    console.log(`   Citation Verification: ${result.performanceMetrics.componentTimes.citationVerification.toFixed(2)}ms`);
    console.log(`   Internet Verification: ${result.performanceMetrics.componentTimes.internetVerification.toFixed(2)}ms`);
    console.log(`   Report Generation: ${result.performanceMetrics.componentTimes.reportGeneration}ms`);
    
    // Source diversity
    if (Object.keys(result.summary.sourceDiversity).length > 0) {
      console.log('\n🌐 Source Diversity:');
      for (const [hostname, count] of Object.entries(result.summary.sourceDiversity)) {
        const percentage = ((count / result.summary.verifiedScales) * 100).toFixed(1);
        console.log(`   ${hostname}: ${count} scales (${percentage}%)`);
      }
    }
    
    // Final assessment
    console.log('\n🏆 Final Assessment:');
    const meetsRequirements = totalTime <= 30000 && result.completionStatus.allChecksCompleted;
    console.log(`   Requirement 3.3 (30s performance): ${totalTime <= 30000 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Complete validation process: ${result.completionStatus.allChecksCompleted ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Overall: ${meetsRequirements ? '✅ ALL REQUIREMENTS MET' : '❌ REQUIREMENTS NOT MET'}`);
    
    process.exit(meetsRequirements ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Full database test failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

if (require.main === module) {
  testFullDatabase().catch(console.error);
}