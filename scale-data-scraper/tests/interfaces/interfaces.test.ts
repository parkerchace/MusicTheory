// Basic tests for TypeScript interfaces and project setup

import { Scale_Record, SourceAttribution, SourceConfiguration } from '../../src/interfaces';

describe('TypeScript Interfaces', () => {
  test('Scale_Record interface should be properly defined', () => {
    const scaleRecord: Scale_Record = {
      id: 'test-id',
      name: 'C Major',
      notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      culturalOrigin: 'Western',
      alternativeNames: ['Ionian'],
      confidenceScore: 0.95,
      sources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      validationStatus: 'verified'
    };

    expect(scaleRecord.id).toBe('test-id');
    expect(scaleRecord.notes).toHaveLength(7);
    expect(scaleRecord.confidenceScore).toBe(0.95);
  });

  test('SourceAttribution interface should be properly defined', () => {
    const sourceAttribution: SourceAttribution = {
      sourceUrl: 'https://example.com/scales',
      websiteName: 'Example Music Theory Site',
      extractedAt: new Date(),
      extractionMethod: '.scale-name, .notes',
      rawData: '<div class="scale">C Major</div>',
      validationNotes: 'Successfully extracted'
    };

    expect(sourceAttribution.sourceUrl).toBe('https://example.com/scales');
    expect(sourceAttribution.websiteName).toBe('Example Music Theory Site');
  });

  test('SourceConfiguration interface should be properly defined', () => {
    const sourceConfig: SourceConfiguration = {
      id: 'config-1',
      name: 'Example Site',
      baseUrl: 'https://example.com',
      urlPatterns: ['/scales/*'],
      extractionRules: {
        scaleNameSelector: '.scale-name',
        notesSelector: '.notes',
        culturalOriginSelector: '.origin'
      },
      requestDelay: 2000,
      respectRobotsTxt: true,
      active: true
    };

    expect(sourceConfig.requestDelay).toBe(2000);
    expect(sourceConfig.respectRobotsTxt).toBe(true);
    expect(sourceConfig.extractionRules.scaleNameSelector).toBe('.scale-name');
  });
});