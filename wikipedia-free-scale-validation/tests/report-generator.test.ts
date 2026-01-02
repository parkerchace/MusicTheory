import { ReportGenerator } from '../src/report-generator';
import { ValidationResult, CitationResult, InternetVerificationResult, ErrorDetails } from '../src/interfaces';
import * as fc from 'fast-check';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;

  beforeEach(() => {
    reportGenerator = new ReportGenerator();
  });

  // Helper function to create test validation results
  const createValidationResult = (
    scaleId: string,
    status: 'verified' | 'failed' | 'pending' | 'unverifiable',
    primarySource?: string,
    sources: CitationResult[] = [],
    internetVerification?: Partial<InternetVerificationResult>
  ): ValidationResult => ({
    scaleId,
    status,
    sources,
    internetVerification: {
      scaleExists: true,
      sourcesFound: 2,
      independentConfirmations: 1,
      searchQueries: [`${scaleId} scale`],
      foundSources: ['teoria.com', 'musictheory.net'],
      confidence: 0.8,
      notes: [],
      ...internetVerification
    },
    primarySource: primarySource || 'https://teoria.com/test',
    backupSources: ['https://musictheory.net/backup'],
    validatedAt: new Date(),
    hallucinationRisk: 'low'
  });

  const createCitationResult = (
    url: string,
    accessible: boolean = true,
    contentMatch: boolean = true,
    errorDetails?: ErrorDetails
  ): CitationResult => ({
    url,
    title: 'Test Scale',
    accessible,
    contentMatch,
    httpStatus: accessible ? 200 : 404,
    notes: [],
    errorDetails
  });

  describe('Property Tests', () => {
    /**
     * **Feature: wikipedia-free-scale-validation, Property 17: Dual report generation**
     * For any completed validation, both JSON and Markdown format reports should be generated
     * **Validates: Requirements 5.1**
     */
    test('Property 17: Dual report generation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              scaleId: fc.string({ minLength: 1, maxLength: 20 }),
              status: fc.constantFrom('verified', 'failed', 'pending', 'unverifiable'),
              primarySource: fc.webUrl({ validSchemes: ['https'] })
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (testData) => {
            const validationResults = testData.map(data => 
              createValidationResult(data.scaleId, data.status as 'verified' | 'failed' | 'pending' | 'unverifiable', data.primarySource)
            );

            // Generate both reports
            const jsonReport = reportGenerator.generateJSONReport(validationResults);
            const markdownReport = reportGenerator.generateMarkdownReport(validationResults);

            // Both reports should be non-empty strings
            expect(typeof jsonReport).toBe('string');
            expect(typeof markdownReport).toBe('string');
            expect(jsonReport.length).toBeGreaterThan(0);
            expect(markdownReport.length).toBeGreaterThan(0);

            // JSON report should be valid JSON
            expect(() => JSON.parse(jsonReport)).not.toThrow();
            const parsedJson = JSON.parse(jsonReport);

            // JSON should contain required structure
            expect(parsedJson).toHaveProperty('generatedAt');
            expect(parsedJson).toHaveProperty('summary');
            expect(parsedJson).toHaveProperty('problems');
            expect(parsedJson).toHaveProperty('results');
            expect(parsedJson).toHaveProperty('metadata');

            // Markdown should contain required sections
            expect(markdownReport).toContain('# Wikipedia-Free Scale Validation Report');
            expect(markdownReport).toContain('## Summary');
            expect(markdownReport).toContain('## Source Diversity Analysis');

            // Both reports should reflect the same data
            expect(parsedJson.results).toHaveLength(validationResults.length);
            expect(parsedJson.summary.totalScales).toBe(validationResults.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 13: Complete verification reporting**
     * For any completed validation process, the Validation_Report should show 100% verification status for all included scales
     * **Validates: Requirements 3.5**
     */
    test('Property 13: Complete verification reporting', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              scaleId: fc.string({ minLength: 1, maxLength: 20 }),
              status: fc.constantFrom('verified', 'failed', 'pending', 'unverifiable')
            }),
            { minLength: 1, maxLength: 15 }
          ),
          (testData) => {
            const validationResults = testData.map(data => 
              createValidationResult(data.scaleId, data.status as 'verified' | 'failed' | 'pending' | 'unverifiable')
            );

            const summary = reportGenerator.createSummaryStatistics(validationResults);

            // Verification completeness should be accurately calculated
            const expectedVerified = validationResults.filter(r => r.status === 'verified').length;
            const expectedFailed = validationResults.filter(r => r.status === 'failed').length;
            const expectedPending = validationResults.filter(r => r.status === 'pending').length;
            const expectedUnverifiable = validationResults.filter(r => r.status === 'unverifiable').length;

            expect(summary.totalScales).toBe(validationResults.length);
            expect(summary.verifiedScales).toBe(expectedVerified);
            expect(summary.failedScales).toBe(expectedFailed);
            expect(summary.pendingScales).toBe(expectedPending);
            expect(summary.unverifiableScales).toBe(expectedUnverifiable);

            // Verification rate should be correct
            const expectedRate = validationResults.length > 0 ? expectedVerified / validationResults.length : 0;
            expect(summary.verificationRate).toBeCloseTo(expectedRate, 5);

            // Completion status should be accurate
            const expectedComplete = expectedVerified === validationResults.length;
            expect(summary.completionStatus).toBe(expectedComplete ? 'complete' : 'incomplete');

            // All counts should add up to total
            expect(summary.verifiedScales + summary.failedScales + summary.pendingScales + summary.unverifiableScales)
              .toBe(summary.totalScales);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: wikipedia-free-scale-validation, Property 15: Source diversity enforcement**
     * For any reference database, no single source should provide more than 40% of all scale references
     * **Validates: Requirements 4.3**
     */
    test('Property 15: Source diversity enforcement', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              scaleId: fc.string({ minLength: 1, maxLength: 20 }),
              hostname: fc.constantFrom('teoria.com', 'musictheory.net', 'britannica.com', 'maqamworld.com', 'other.com')
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (testData) => {
            const validationResults = testData.map(data => 
              createValidationResult(
                data.scaleId, 
                'verified', 
                `https://${data.hostname}/scale/${data.scaleId}`
              )
            );

            const summary = reportGenerator.createSummaryStatistics(validationResults);
            const diversity = summary.sourceDiversity;

            // Source diversity analysis should be accurate
            expect(diversity.totalSources).toBeGreaterThan(0);
            expect(diversity.sourceDistribution).toBeDefined();
            expect(diversity.maxSingleSourcePercentage).toBeGreaterThanOrEqual(0);
            expect(diversity.maxSingleSourcePercentage).toBeLessThanOrEqual(1);

            // Check if diversity compliance is correctly calculated
            const expectedCompliant = diversity.maxSingleSourcePercentage <= 0.4;
            expect(diversity.isDiversityCompliant).toBe(expectedCompliant);

            // If not compliant, should identify dominant source
            if (!diversity.isDiversityCompliant) {
              expect(diversity.dominantSource).toBeDefined();
              expect(typeof diversity.dominantSource).toBe('string');
            }

            // Source distribution should add up correctly
            const totalFromDistribution = Object.values(diversity.sourceDistribution)
              .reduce((sum, count) => sum + count, 0);
            expect(totalFromDistribution).toBeLessThanOrEqual(validationResults.length);

            // Max percentage should match the highest count in distribution
            const maxCount = Math.max(...Object.values(diversity.sourceDistribution));
            const expectedMaxPercentage = validationResults.length > 0 ? maxCount / validationResults.length : 0;
            expect(diversity.maxSingleSourcePercentage).toBeCloseTo(expectedMaxPercentage, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests', () => {
    describe('JSON Report Generation', () => {
      test('should generate valid JSON with correct structure', () => {
        const results = [
          createValidationResult('major-scale', 'verified'),
          createValidationResult('minor-scale', 'failed')
        ];

        const jsonReport = reportGenerator.generateJSONReport(results);
        const parsed = JSON.parse(jsonReport);

        expect(parsed).toHaveProperty('generatedAt');
        expect(parsed).toHaveProperty('summary');
        expect(parsed).toHaveProperty('problems');
        expect(parsed).toHaveProperty('results');
        expect(parsed).toHaveProperty('metadata');
        expect(parsed.metadata.format).toBe('json');
        expect(parsed.results).toHaveLength(2);
      });

      test('should handle empty results array', () => {
        const jsonReport = reportGenerator.generateJSONReport([]);
        const parsed = JSON.parse(jsonReport);

        expect(parsed.summary.totalScales).toBe(0);
        expect(parsed.results).toHaveLength(0);
      });
    });

    describe('Markdown Report Generation', () => {
      test('should generate markdown with required sections', () => {
        const results = [
          createValidationResult('major-scale', 'verified', 'https://teoria.com/major'),
          createValidationResult('minor-scale', 'verified', 'https://musictheory.net/minor')
        ];

        const markdown = reportGenerator.generateMarkdownReport(results);

        expect(markdown).toContain('# Wikipedia-Free Scale Validation Report');
        expect(markdown).toContain('## Summary');
        expect(markdown).toContain('## Source Diversity Analysis');
        expect(markdown).toContain('### Source Distribution');
        expect(markdown).toContain('**Total Scales**: 2');
        expect(markdown).toContain('**Verified**: 2');
      });

      test('should include problems section when problems exist', () => {
        const errorDetails: ErrorDetails = {
          category: 'network',
          severity: 'high',
          code: 'HTTP_404',
          message: 'Source not accessible',
          timestamp: new Date(),
          retryable: true
        };

        const citationWithError = createCitationResult('https://test.com', false, false, errorDetails);
        const results = [
          createValidationResult('test-scale', 'failed', undefined, [citationWithError])
        ];

        const markdown = reportGenerator.generateMarkdownReport(results);

        expect(markdown).toContain('## Problems Detected');
        expect(markdown).toContain('### By Category');
        expect(markdown).toContain('### By Severity');
      });
    });

    describe('Problem Categorization', () => {
      test('should categorize problems by category and severity', () => {
        const networkError: ErrorDetails = {
          category: 'network',
          severity: 'high',
          code: 'HTTP_404',
          message: 'Not found',
          timestamp: new Date(),
          retryable: true
        };

        const contentError: ErrorDetails = {
          category: 'content',
          severity: 'medium',
          code: 'CONTENT_MISMATCH',
          message: 'Content does not match',
          timestamp: new Date(),
          retryable: false
        };

        const results = [
          createValidationResult('scale1', 'failed', undefined, [
            createCitationResult('https://test1.com', false, false, networkError)
          ]),
          createValidationResult('scale2', 'failed', undefined, [
            createCitationResult('https://test2.com', true, false, contentError)
          ])
        ];

        const problems = reportGenerator.categorizeProblems(results);

        expect(problems.totalProblems).toBe(2);
        expect(problems.byCategory.network).toHaveLength(1);
        expect(problems.byCategory.content).toHaveLength(1);
        expect(problems.bySeverity.high).toHaveLength(1);
        expect(problems.bySeverity.medium).toHaveLength(1);
      });

      test('should identify critical problems', () => {
        const criticalError: ErrorDetails = {
          category: 'source',
          severity: 'critical',
          code: 'SOURCE_COMPROMISED',
          message: 'Source appears compromised',
          timestamp: new Date(),
          retryable: false
        };

        const results = [
          createValidationResult('scale1', 'failed', undefined, [
            createCitationResult('https://test.com', false, false, criticalError)
          ])
        ];

        const problems = reportGenerator.categorizeProblems(results);

        expect(problems.criticalProblems).toHaveLength(1);
        expect(problems.criticalProblems[0]).toBe(criticalError);
      });
    });

    describe('Source Diversity Analysis', () => {
      test('should detect non-compliant source diversity', () => {
        // Create results where one source dominates (>40%)
        const results = [
          createValidationResult('scale1', 'verified', 'https://teoria.com/1'),
          createValidationResult('scale2', 'verified', 'https://teoria.com/2'),
          createValidationResult('scale3', 'verified', 'https://teoria.com/3'),
          createValidationResult('scale4', 'verified', 'https://musictheory.net/1'),
          createValidationResult('scale5', 'verified', 'https://teoria.com/4') // 4/5 = 80% from teoria.com
        ];

        const summary = reportGenerator.createSummaryStatistics(results);

        expect(summary.sourceDiversity.isDiversityCompliant).toBe(false);
        expect(summary.sourceDiversity.dominantSource).toBe('teoria.com');
        expect(summary.sourceDiversity.maxSingleSourcePercentage).toBe(0.8);
      });

      test('should detect compliant source diversity', () => {
        const results = [
          createValidationResult('scale1', 'verified', 'https://teoria.com/1'),
          createValidationResult('scale2', 'verified', 'https://musictheory.net/1'),
          createValidationResult('scale3', 'verified', 'https://britannica.com/1'),
          createValidationResult('scale4', 'verified', 'https://maqamworld.com/1'),
          createValidationResult('scale5', 'verified', 'https://teoria.com/2') // 2/5 = 40% from teoria.com
        ];

        const summary = reportGenerator.createSummaryStatistics(results);

        expect(summary.sourceDiversity.isDiversityCompliant).toBe(true);
        expect(summary.sourceDiversity.dominantSource).toBeUndefined();
        expect(summary.sourceDiversity.maxSingleSourcePercentage).toBe(0.4);
      });
    });

    describe('Unverifiable Content Flagging', () => {
      test('should flag unverifiable content correctly', () => {
        const goodCitation = createCitationResult('https://good.com', true, true);
        const results = [
          createValidationResult('verified-scale', 'verified', undefined, [goodCitation]),
          createValidationResult('unverifiable-scale', 'unverifiable'),
          createValidationResult('high-risk-scale', 'verified', undefined, [], { scaleExists: false }),
          {
            ...createValidationResult('failed-sources-scale', 'failed'),
            hallucinationRisk: 'high' as const
          }
        ];

        const flagged = reportGenerator.flagUnverifiableContent(results);

        expect(flagged).toHaveLength(3);
        expect(flagged.map(r => r.scaleId)).toContain('unverifiable-scale');
        expect(flagged.map(r => r.scaleId)).toContain('high-risk-scale');
        expect(flagged.map(r => r.scaleId)).toContain('failed-sources-scale');
        expect(flagged.map(r => r.scaleId)).not.toContain('verified-scale');
      });

      test('should flag scales with all failed sources', () => {
        const failedCitation = createCitationResult('https://test.com', false, false);
        const results = [
          createValidationResult('all-failed-scale', 'verified', undefined, [failedCitation, failedCitation])
        ];

        const flagged = reportGenerator.flagUnverifiableContent(results);

        expect(flagged).toHaveLength(1);
        expect(flagged[0].scaleId).toBe('all-failed-scale');
      });
    });
  });
});