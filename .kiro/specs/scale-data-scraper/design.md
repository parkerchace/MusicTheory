# Scale Data Scraper Design Document

## Overview

The Scale Data Scraper is a robust web scraping system designed to automatically collect authentic musical scale information from authoritative online sources. The system replaces manual data entry and testing with automated extraction, validation, and API serving of scale data from reputable music theory websites, ethnomusicology databases, and academic institutions.

The architecture emphasizes ethical scraping practices, data quality assurance, and extensible source management to build a comprehensive, verified database of musical scales from around the world.

## Architecture

The system follows a modular, pipeline-based architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Sources   │───▶│  Scraping Engine │───▶│  Data Pipeline  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Rate Limiter &  │    │  Configuration   │    │   Validation    │
│ Ethics Engine   │    │    Manager       │    │    Engine       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Server    │◀───│   Data Store     │◀───│  Data Processor │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Components and Interfaces

### Scraping Engine
- **Purpose**: Orchestrates web scraping operations across configured sources
- **Key Methods**: 
  - `scrapeSource(sourceConfig)`: Extracts data from a single source
  - `executeScrapeSession()`: Runs complete scraping cycle
  - `handleExtractionFailure(error, source)`: Manages extraction errors
- **Dependencies**: Configuration Manager, Rate Limiter, Data Pipeline

### Configuration Manager
- **Purpose**: Manages target websites, extraction rules, and scraping parameters
- **Key Methods**:
  - `addSource(url, selectors, rules)`: Adds new scraping target
  - `updateExtractionRules(sourceId, newRules)`: Updates selectors without code changes
  - `validateSourceAccessibility(url)`: Checks website availability
- **Storage**: JSON configuration files with versioning

### Rate Limiter & Ethics Engine
- **Purpose**: Ensures ethical scraping practices and server resource respect
- **Key Methods**:
  - `checkRobotsTxt(domain)`: Validates robots.txt compliance
  - `enforceDelay(domain, lastRequest)`: Implements request spacing
  - `handleRateLimit(response)`: Manages rate limit responses
- **Features**: Exponential backoff, domain-specific delays, User-Agent management

### Data Pipeline
- **Purpose**: Processes raw extracted data into structured scale records
- **Key Methods**:
  - `parseScaleData(rawHtml, extractionRules)`: Converts HTML to scale objects
  - `normalizeScaleFormat(scaleData)`: Standardizes scale representation
  - `mergeSourceData(existingScale, newData)`: Combines duplicate scale information
- **Output**: Structured Scale_Record objects with source attribution

### Validation Engine
- **Purpose**: Ensures data quality and assigns confidence scores
- **Key Methods**:
  - `validateNoteSequence(notes)`: Checks musical validity of scale notes
  - `crossReferenceAttribution(culturalOrigin)`: Verifies ethnomusicological accuracy
  - `assignConfidenceScore(scaleRecord)`: Calculates data reliability rating
- **Features**: Musical theory validation, cultural attribution verification, conflict detection

### Data Store
- **Purpose**: Persistent storage for scale records with full provenance tracking
- **Schema**: 
  - Scale records with notes, cultural origins, confidence scores
  - Source attribution with URLs, extraction timestamps, validation status
  - Version history for data updates and corrections
- **Technology**: Document database (MongoDB/PostgreSQL JSON) for flexible schema

### API Server
- **Purpose**: Provides structured access to verified scale data
- **Endpoints**:
  - `GET /scales`: List all scales with filtering options
  - `GET /scales/culture/{region}`: Scales by cultural origin
  - `GET /scales/search?q={query}`: Fuzzy search functionality
  - `GET /scales/{id}`: Detailed scale information with sources
- **Features**: JSON responses, versioning headers, confidence score inclusion

## Data Models

### Scale_Record
```javascript
{
  id: "uuid",
  name: "string",
  notes: ["C", "D", "E", "F", "G", "A", "B"], // Array of note names
  culturalOrigin: "string",
  alternativeNames: ["string"],
  confidenceScore: 0.95, // 0.0 to 1.0
  sources: [SourceAttribution],
  createdAt: "timestamp",
  updatedAt: "timestamp",
  validationStatus: "verified|flagged|pending"
}
```

### SourceAttribution
```javascript
{
  sourceUrl: "string",
  websiteName: "string",
  extractedAt: "timestamp",
  extractionMethod: "string", // CSS selectors used
  rawData: "string", // Original extracted content
  validationNotes: "string"
}
```

### SourceConfiguration
```javascript
{
  id: "uuid",
  name: "string",
  baseUrl: "string",
  urlPatterns: ["string"], // URL patterns to scrape
  extractionRules: {
    scaleNameSelector: "string",
    notesSelector: "string",
    culturalOriginSelector: "string"
  },
  requestDelay: 2000, // milliseconds
  respectRobotsTxt: true,
  active: true
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*
Property 1: Extraction completeness
*For any* configured website with valid extraction rules, scraping should return scale records containing all required fields (name, notes, cultural origin)
**Validates: Requirements 1.1**

Property 2: Source attribution preservation
*For any* extracted scale data, the resulting scale record should contain complete source attribution including original URL and extraction timestamp
**Validates: Requirements 1.2**

Property 3: Structured data consistency
*For any* completed scraping session, all extracted data should conform to the defined Scale_Record schema
**Validates: Requirements 1.3**

Property 4: Duplicate merge preservation
*For any* duplicate scales detected during processing, merging should preserve all source attributions from both original and duplicate records
**Validates: Requirements 1.4**

Property 5: Error resilience
*For any* scraping session where some sources fail, the system should continue processing remaining sources and complete successfully
**Validates: Requirements 1.5**

Property 6: Configuration acceptance
*For any* valid source configuration with URL patterns and extraction rules, the system should accept and store the configuration correctly
**Validates: Requirements 2.1**

Property 7: Dynamic selector updates
*For any* source configuration update that changes extraction selectors, subsequent scraping should use the new selectors without requiring system restart
**Validates: Requirements 2.2**

Property 8: Source accessibility validation
*For any* new source being added, the system should validate website accessibility and only include sources that respond successfully
**Validates: Requirements 2.3**

Property 9: Historical attribution integrity
*For any* source removal operation, existing scale records should retain their complete source attribution information
**Validates: Requirements 2.4**

Property 10: Ethical scraping compliance
*For any* scraping operation, the system should respect robots.txt files and implement appropriate request delays
**Validates: Requirements 2.5**

Property 11: API response structure
*For any* API request for scale data, the response should be valid JSON containing all required scale information fields
**Validates: Requirements 3.1**

Property 12: Cultural origin filtering
*For any* cultural origin query, the API should return all and only scales that match the specified region or tradition
**Validates: Requirements 3.2**

Property 13: Complete metadata inclusion
*For any* detailed scale request, the response should include source attribution and confidence ratings
**Validates: Requirements 3.3**

Property 14: Version information provision
*For any* API response after data updates, version information should be included in response headers or metadata
**Validates: Requirements 3.4**

Property 15: Fuzzy search functionality
*For any* approximate search query, the system should return relevant results even when exact matches are not found
**Validates: Requirements 3.5**

Property 16: Musical validity validation
*For any* extracted note sequence, the validation engine should correctly identify whether it represents a musically valid scale
**Validates: Requirements 4.1**

Property 17: Cultural attribution verification
*For any* cultural attribution found in extracted data, the system should cross-reference against ethnomusicological sources
**Validates: Requirements 4.2**

Property 18: Inconsistency detection and flagging
*For any* data inconsistencies detected during validation, the system should flag affected records for manual review
**Validates: Requirements 4.3**

Property 19: Confidence score assignment
*For any* scale record completing validation, the system should assign a confidence score between 0.0 and 1.0
**Validates: Requirements 4.4**

Property 20: Conflict preservation with tracking
*For any* conflicting information from multiple sources, the system should preserve all variants with complete source tracking
**Validates: Requirements 4.5**

Property 21: Robots.txt compliance
*For any* scraping session initiation, the system should check and respect robots.txt files for all target domains
**Validates: Requirements 5.1**

Property 22: Request delay implementation
*For any* sequence of requests to the same domain, the system should implement appropriate delays to avoid server overload
**Validates: Requirements 5.2**

Property 23: User-Agent header identification
*For any* HTTP request made by the scraper, proper User-Agent headers should be included for identification
**Validates: Requirements 5.3**

Property 24: Rate limit backoff behavior
*For any* rate limit response encountered, the system should implement exponential backoff and retry appropriately
**Validates: Requirements 5.4**

Property 25: Terms of service compliance
*For any* source with terms of service prohibiting scraping, the system should exclude that source and log the restriction
**Validates: Requirements 5.5**

## Error Handling

The system implements comprehensive error handling across all components:

### Network Errors
- Connection timeouts with configurable retry logic
- DNS resolution failures with fallback mechanisms
- HTTP error responses (4xx, 5xx) with appropriate backoff strategies
- SSL/TLS certificate validation errors with security logging

### Data Extraction Errors
- Invalid HTML structure handling with graceful degradation
- Missing CSS selectors with alternative extraction strategies
- Malformed scale data with validation and correction attempts
- Character encoding issues with automatic detection and conversion

### Validation Errors
- Invalid note sequences with detailed error reporting
- Conflicting cultural attributions with conflict resolution workflows
- Missing required fields with data completion strategies
- Confidence score calculation failures with fallback scoring methods

### Storage Errors
- Database connection failures with connection pooling and retry logic
- Data integrity violations with transaction rollback and recovery
- Disk space limitations with cleanup and archival procedures
- Concurrent access conflicts with proper locking mechanisms

## Testing Strategy

The testing approach combines unit testing for individual components with property-based testing for system-wide correctness guarantees.

### Unit Testing
- Component isolation testing for each module (Scraping Engine, Validation Engine, etc.)
- Mock external dependencies (websites, databases) for reliable testing
- Edge case coverage for error conditions and boundary values
- Integration testing for component interactions and data flow

### Property-Based Testing
- Universal properties verified across all valid inputs using fast-check library
- Minimum 100 iterations per property test for statistical confidence
- Each property test tagged with corresponding design document property number
- Generators for realistic test data (URLs, HTML structures, scale configurations)

### Testing Framework
- **Primary Framework**: Jest for unit testing with jsdom for DOM manipulation
- **Property Testing**: fast-check library for JavaScript property-based testing
- **Test Configuration**: Minimum 100 iterations per property test
- **Coverage Requirements**: 90% code coverage for core scraping and validation logic

### Test Data Generation
- Realistic website HTML structures with various scale data formats
- Valid and invalid scale configurations for robustness testing
- Cultural attribution data from ethnomusicological sources
- Network error simulation for resilience testing