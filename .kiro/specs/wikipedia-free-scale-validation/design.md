# Wikipedia-Free Scale Validation System Design

## Overview

This system creates a fast, reliable scale validation framework that maintains the speed and accuracy of the original verification approach while completely eliminating Wikipedia dependencies. The design leverages the proven architecture of the old system but expands the approved source list and adds intelligent source selection and fallback mechanisms.

## Architecture

The system follows a modular validation architecture with three core layers:

1. **Source Management Layer** - Manages approved reference sources and their accessibility
2. **Validation Engine Layer** - Performs scale verification against multiple sources
3. **Reporting Layer** - Generates comprehensive validation reports and monitoring data

```
┌─────────────────────────────────────────────────────────────┐
│                    Validation Engine                        │
├─────────────────────────────────────────────────────────────┤
│  Source Manager  │  Citation Engine  │  Content Matcher    │
├─────────────────────────────────────────────────────────────┤
│           Approved Sources Database                         │
│  teoria.com │ musictheory.net │ britannica.com │ others     │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### SourceManager
Manages the approved reference source database and accessibility checking.

```javascript
class SourceManager {
  constructor(approvedSources)
  async validateSourceAccessibility(url)
  getSourcesByPriority(scaleType)
  isSourceApproved(url)
  getBackupSources(primarySource)
}
```

### ValidationEngine
Core validation logic that processes scales against multiple sources.

```javascript
class ValidationEngine {
  constructor(sourceManager, citationEngine)
  async validateScale(scaleId, scaleData)
  async validateAllScales(scaleDatabase)
  generateValidationSummary()
}
```

### CitationEngine
Handles citation verification, content matching, link validation, and internet existence verification.

```javascript
class CitationEngine {
  async validateCitation(url, expectedTitle)
  async verifyScaleExistsOnline(scaleName, culturalContext)
  async searchMultipleSources(scaleName, sourceList)
  async fetchWithRetry(url, options)
  contentMatches(pageContent, referenceTitle)
  buildTitleKeywords(title)
}
```

### InternetVerifier
Performs cross-source internet verification to prevent hallucinated content.

```javascript
class InternetVerifier {
  async verifyScaleExists(scaleName, culturalContext)
  async searchAcrossSources(query, sourceList)
  async crossReferenceResults(searchResults)
  detectPotentialHallucination(scaleInfo, searchResults)
  generateVerificationReport(scaleName, findings)
}
```

### ReportGenerator
Creates comprehensive validation reports in multiple formats.

```javascript
class ReportGenerator {
  generateJSONReport(validationResults)
  generateMarkdownReport(validationResults)
  categorizeProblems(results)
  createSummaryStatistics(results)
  flagUnverifiableContent(results)
}
```

## Data Models

### ApprovedSource
```javascript
{
  hostname: string,
  priority: number,
  scaleTypes: string[],
  reliability: number,
  accessPattern: string
}
```

### ValidationResult
```javascript
{
  scaleId: string,
  status: 'verified' | 'failed' | 'pending' | 'unverifiable',
  sources: CitationResult[],
  internetVerification: InternetVerificationResult,
  primarySource: string,
  backupSources: string[],
  validatedAt: Date,
  hallucinationRisk: 'low' | 'medium' | 'high'
}
```

### InternetVerificationResult
```javascript
{
  scaleExists: boolean,
  sourcesFound: number,
  independentConfirmations: number,
  searchQueries: string[],
  foundSources: string[],
  confidence: number,
  notes: string[]
}
```

### CitationResult
```javascript
{
  url: string,
  title: string,
  accessible: boolean,
  contentMatch: boolean,
  httpStatus: number,
  notes: string[]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Wikipedia source rejection
*For any* scale validation request, all sources used by the Scale_Validator should be non-Wikipedia URLs
**Validates: Requirements 1.1**

Property 2: Approved source verification
*For any* source selected during validation, that source should appear in the approved reference list
**Validates: Requirements 1.2**

Property 3: Citation accessibility and content verification
*For any* completed validation, all provided citation links should be both HTTP accessible and content-matched to their reference titles
**Validates: Requirements 1.3**

Property 4: Wikipedia rejection with fallback
*For any* validation request that encounters Wikipedia sources, those sources should be rejected and alternative approved sources should be attempted
**Validates: Requirements 1.4**

Property 5: Backup source utilization
*For any* validation where the primary source fails, backup reference sources should be attempted
**Validates: Requirements 1.5**

Property 6: Authoritative source requirement
*For any* scale returned from the Scale_Database, that scale should have verification against at least one authoritative non-Wikipedia source
**Validates: Requirements 2.1**

Property 7: Citation quality assurance
*For any* citation information provided by the Citation_Engine, all links should be accessible and content-matched
**Validates: Requirements 2.2**

Property 8: Source prioritization
*For any* scale with multiple available sources, the system should select the source with the highest priority that is also accessible
**Validates: Requirements 2.3**

Property 9: Unverified scale marking
*For any* scale that has only Wikipedia sources available, that scale should be marked as requiring additional validation
**Validates: Requirements 2.4**

Property 10: Startup source verification
*For any* system startup, all approved sources in the reference list should be checked for accessibility
**Validates: Requirements 3.1**

Property 11: Dual validation requirement
*For any* reference link being tested, both HTTP accessibility and content relevance validation should be performed
**Validates: Requirements 3.2**

Property 12: Detailed error reporting
*For any* source validation failure, the system should generate error reports containing specific failure details and suggested alternatives
**Validates: Requirements 3.4**

Property 13: Complete verification reporting
*For any* completed validation process, the Validation_Report should show 100% verification status for all included scales
**Validates: Requirements 3.5**

Property 14: Additional source type support
*For any* jazz education sites or academic music databases provided as sources, the system should accept and process them as valid source types
**Validates: Requirements 4.2**

Property 15: Source diversity enforcement
*For any* reference database, no single source should provide more than 40% of all scale references
**Validates: Requirements 4.3**

Property 16: Regional scale source matching
*For any* regional or cultural scale validation, the system should prioritize culturally appropriate and specialized sources over generic music theory sources
**Validates: Requirements 4.4**

Property 17: Dual report generation
*For any* completed validation, both JSON and Markdown format reports should be generated
**Validates: Requirements 5.1**

Property 18: Problem categorization
*For any* detected validation problems, the Validation_Report should categorize them by type (network, content, source) and severity level
**Validates: Requirements 5.2**

Property 19: Specific error messaging
*For any* source accessibility failure, the system should provide specific error messages including HTTP status and suggested fixes
**Validates: Requirements 5.3**

Property 20: Content match diagnostics
*For any* content matching failure, the error report should specify which expected keywords were not found in the source content
**Validates: Requirements 5.4**

Property 21: Internet existence verification
*For any* scale being validated, the system should verify that the scale name and cultural context can be found across multiple independent internet sources before accepting it as valid
**Validates: Requirements 1.3, 2.1**

Property 22: Multi-source cross-verification
*For any* scale claimed to exist, at least two independent non-Wikipedia sources should contain references to that scale name and cultural context
**Validates: Requirements 2.1, 4.3**

## Error Handling

The system implements comprehensive error handling across all validation layers:

### Source Accessibility Errors
- HTTP timeout handling with configurable retry attempts
- Graceful degradation when primary sources are unavailable
- Automatic fallback to backup sources with priority ordering
- Clear error messages indicating specific accessibility issues

### Content Validation Errors
- Keyword matching failures with diagnostic information
- Internet existence verification failures with search result details
- Multi-source cross-verification failures when scales cannot be confirmed
- Content format detection and handling for different source types
- Encoding and character set handling for international sources
- Detailed reporting of which validation criteria failed
- Flagging of potentially hallucinated or unverifiable scale information

### System-Level Errors
- Configuration validation on startup
- Approved source list integrity checking
- Report generation failure handling
- Concurrent validation error isolation

## Testing Strategy

The system uses a dual testing approach combining unit tests and property-based testing:

### Unit Testing
- Specific examples of scale validation workflows
- Edge cases like empty source lists or malformed URLs
- Integration testing between validation components
- Mock source responses for consistent testing

### Property-Based Testing
- Uses **fast-check** library for JavaScript property-based testing
- Each property-based test runs a minimum of 100 iterations
- Properties test universal behaviors across all possible inputs
- Generators create realistic scale data, URLs, and validation scenarios

**Property-based test requirements:**
- Each correctness property must be implemented by a single property-based test
- Tests must be tagged with comments referencing the design document property
- Tag format: `**Feature: wikipedia-free-scale-validation, Property {number}: {property_text}**`
- Tests should use smart generators that constrain inputs to realistic validation scenarios

### Test Coverage Requirements
- All validation paths must have corresponding unit tests
- All error conditions must be tested with specific examples
- Property-based tests must cover the core validation logic
- Integration tests must verify end-to-end validation workflows