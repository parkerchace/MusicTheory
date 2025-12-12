import { ValidationResult, ErrorDetails } from '../interfaces';

export interface ReportSummary {
  totalScales: number;
  verifiedScales: number;
  failedScales: number;
  pendingScales: number;
  unverifiableScales: number;
  verificationRate: number;
  sourceDiversity: SourceDiversityAnalysis;
  problemCategories: { [category: string]: number };
  completionStatus: 'complete' | 'incomplete';
}

export interface SourceDiversityAnalysis {
  totalSources: number;
  sourceDistribution: { [hostname: string]: number };
  maxSingleSourcePercentage: number;
  isDiversityCompliant: boolean;
  dominantSource?: string;
}

export interface ProblemCategorization {
  byCategory: { [category: string]: ErrorDetails[] };
  bySeverity: { [severity: string]: ErrorDetails[] };
  totalProblems: number;
  criticalProblems: ErrorDetails[];
}

export class ReportGenerator {
  generateJSONReport(validationResults: ValidationResult[]): string {
    const summary = this.createSummaryStatistics(validationResults);
    const problems = this.categorizeProblems(validationResults);
    
    const report = {
      generatedAt: new Date().toISOString(),
      summary,
      problems,
      results: validationResults,
      metadata: {
        version: '1.0.0',
        format: 'json'
      }
    };
    
    return JSON.stringify(report, null, 2);
  }

  generateMarkdownReport(validationResults: ValidationResult[]): string {
    const summary = this.createSummaryStatistics(validationResults);
    const problems = this.categorizeProblems(validationResults);
    
    let markdown = '# Wikipedia-Free Scale Validation Report\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Summary section
    markdown += '## Summary\n\n';
    markdown += `- **Total Scales**: ${summary.totalScales}\n`;
    markdown += `- **Verified**: ${summary.verifiedScales}\n`;
    markdown += `- **Failed**: ${summary.failedScales}\n`;
    markdown += `- **Pending**: ${summary.pendingScales}\n`;
    markdown += `- **Unverifiable**: ${summary.unverifiableScales}\n`;
    markdown += `- **Verification Rate**: ${(summary.verificationRate * 100).toFixed(1)}%\n`;
    markdown += `- **Completion Status**: ${summary.completionStatus}\n\n`;
    
    // Source diversity section
    markdown += '## Source Diversity Analysis\n\n';
    markdown += `- **Total Sources**: ${summary.sourceDiversity.totalSources}\n`;
    markdown += `- **Diversity Compliant**: ${summary.sourceDiversity.isDiversityCompliant ? 'Yes' : 'No'}\n`;
    markdown += `- **Max Single Source**: ${(summary.sourceDiversity.maxSingleSourcePercentage * 100).toFixed(1)}%\n`;
    
    if (summary.sourceDiversity.dominantSource) {
      markdown += `- **Dominant Source**: ${summary.sourceDiversity.dominantSource}\n`;
    }
    
    markdown += '\n### Source Distribution\n\n';
    Object.entries(summary.sourceDiversity.sourceDistribution).forEach(([source, count]) => {
      const percentage = (count / summary.totalScales * 100).toFixed(1);
      markdown += `- **${source}**: ${count} scales (${percentage}%)\n`;
    });
    
    // Problems section
    if (problems.totalProblems > 0) {
      markdown += '\n## Problems Detected\n\n';
      markdown += `Total Problems: ${problems.totalProblems}\n\n`;
      
      markdown += '### By Category\n\n';
      Object.entries(problems.byCategory).forEach(([category, errors]) => {
        markdown += `- **${category}**: ${errors.length} issues\n`;
      });
      
      markdown += '\n### By Severity\n\n';
      Object.entries(problems.bySeverity).forEach(([severity, errors]) => {
        markdown += `- **${severity}**: ${errors.length} issues\n`;
      });
      
      if (problems.criticalProblems.length > 0) {
        markdown += '\n### Critical Issues\n\n';
        problems.criticalProblems.forEach((error, index) => {
          markdown += `${index + 1}. **${error.code}**: ${error.message}\n`;
          if (error.suggestedFix) {
            markdown += `   - *Suggested Fix*: ${error.suggestedFix}\n`;
          }
        });
      }
    }
    
    return markdown;
  }

  categorizeProblems(results: ValidationResult[]): ProblemCategorization {
    const byCategory: { [category: string]: ErrorDetails[] } = {};
    const bySeverity: { [severity: string]: ErrorDetails[] } = {};
    const criticalProblems: ErrorDetails[] = [];
    
    results.forEach(result => {
      // Process errors from citation results
      result.sources.forEach(citation => {
        if (citation.errorDetails) {
          const error = citation.errorDetails;
          
          // Categorize by category
          if (!byCategory[error.category]) {
            byCategory[error.category] = [];
          }
          byCategory[error.category].push(error);
          
          // Categorize by severity
          if (!bySeverity[error.severity]) {
            bySeverity[error.severity] = [];
          }
          bySeverity[error.severity].push(error);
          
          // Track critical problems
          if (error.severity === 'critical') {
            criticalProblems.push(error);
          }
        }
      });
      
      // Process errors from validation error summary
      if (result.errorSummary) {
        result.errorSummary.criticalErrors.forEach(error => {
          // Categorize by category
          if (!byCategory[error.category]) {
            byCategory[error.category] = [];
          }
          byCategory[error.category].push(error);
          
          // Categorize by severity
          if (!bySeverity[error.severity]) {
            bySeverity[error.severity] = [];
          }
          bySeverity[error.severity].push(error);
          
          // Track critical problems
          if (error.severity === 'critical') {
            criticalProblems.push(error);
          }
        });
      }
    });
    
    const totalProblems = Object.values(byCategory).reduce((sum, errors) => sum + errors.length, 0);
    
    return {
      byCategory,
      bySeverity,
      totalProblems,
      criticalProblems
    };
  }

  createSummaryStatistics(results: ValidationResult[]): ReportSummary {
    const totalScales = results.length;
    const verifiedScales = results.filter(r => r.status === 'verified').length;
    const failedScales = results.filter(r => r.status === 'failed').length;
    const pendingScales = results.filter(r => r.status === 'pending').length;
    const unverifiableScales = results.filter(r => r.status === 'unverifiable').length;
    
    const verificationRate = totalScales > 0 ? verifiedScales / totalScales : 0;
    const completionStatus = verifiedScales === totalScales ? 'complete' : 'incomplete';
    
    // Analyze source diversity
    const sourceDiversity = this.analyzeSourceDiversity(results);
    
    // Categorize problems
    const problems = this.categorizeProblems(results);
    const problemCategories: { [category: string]: number } = {};
    Object.entries(problems.byCategory).forEach(([category, errors]) => {
      problemCategories[category] = errors.length;
    });
    
    return {
      totalScales,
      verifiedScales,
      failedScales,
      pendingScales,
      unverifiableScales,
      verificationRate,
      sourceDiversity,
      problemCategories,
      completionStatus
    };
  }

  private analyzeSourceDiversity(results: ValidationResult[]): SourceDiversityAnalysis {
    const sourceDistribution: { [hostname: string]: number } = {};
    const allSources = new Set<string>();
    
    results.forEach(result => {
      // Count primary sources
      if (result.primarySource) {
        try {
          const hostname = new URL(result.primarySource).hostname;
          sourceDistribution[hostname] = (sourceDistribution[hostname] || 0) + 1;
          allSources.add(hostname);
        } catch (e) {
          // Invalid URL, skip
        }
      }
      
      // Track all sources used
      result.sources.forEach(citation => {
        try {
          const hostname = new URL(citation.url).hostname;
          allSources.add(hostname);
        } catch (e) {
          // Invalid URL, skip
        }
      });
    });
    
    const totalSources = allSources.size;
    const totalScales = results.length;
    
    // Find the source with the highest usage
    let maxCount = 0;
    let dominantSource: string | undefined;
    Object.entries(sourceDistribution).forEach(([source, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantSource = source;
      }
    });
    
    const maxSingleSourcePercentage = totalScales > 0 ? maxCount / totalScales : 0;
    const isDiversityCompliant = maxSingleSourcePercentage <= 0.4; // 40% threshold from requirements
    
    return {
      totalSources,
      sourceDistribution,
      maxSingleSourcePercentage,
      isDiversityCompliant,
      dominantSource: maxSingleSourcePercentage > 0.4 ? dominantSource : undefined
    };
  }

  flagUnverifiableContent(results: ValidationResult[]): ValidationResult[] {
    return results.filter(result => {
      // Flag as unverifiable if:
      // 1. Status is unverifiable
      // 2. High hallucination risk
      // 3. No successful internet verification
      // 4. All sources failed
      
      return result.status === 'unverifiable' ||
             result.hallucinationRisk === 'high' ||
             !result.internetVerification.scaleExists ||
             result.sources.every(source => !source.accessible || !source.contentMatch);
    });
  }
}