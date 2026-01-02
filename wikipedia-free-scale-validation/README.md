# Wikipedia-Free Scale Validation System

A fast, reliable scale validation system that maintains speed and accuracy while eliminating Wikipedia dependencies.

## Project Structure

```
src/
├── interfaces/           # TypeScript interfaces for all data models
├── source-manager/       # Manages approved reference sources
├── validation-engine/    # Core validation logic
├── citation-engine/      # Citation verification and content matching
├── internet-verifier/    # Cross-source validation and hallucination detection
├── report-generator/     # Validation report generation
└── index.ts             # Main entry point

tests/
└── source-manager.test.ts # Property-based and unit tests for SourceManager
```

## Core Components

### SourceManager
- Manages approved reference sources and accessibility checking
- Implements source prioritization and backup source selection
- Validates that only approved sources are used

### ValidationEngine
- Orchestrates the complete validation workflow
- Processes scales against multiple sources
- Generates validation summaries

### CitationEngine
- Handles citation verification and content matching
- Implements HTTP retry logic and accessibility checking
- Performs keyword-based content validation

### InternetVerifier
- Performs cross-source internet verification
- Detects potentially hallucinated content
- Validates scale existence across multiple independent sources

### ReportGenerator
- Creates comprehensive validation reports in JSON and Markdown formats
- Categorizes problems by type and severity
- Provides detailed error diagnostics

## Testing

The project uses a dual testing approach:

- **Unit Tests**: Specific examples and edge cases
- **Property-Based Tests**: Universal properties using fast-check library

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

## Development

```bash
npm install                # Install dependencies
npm run build             # Build TypeScript to JavaScript
npm run lint              # Run ESLint
npm run clean             # Clean build artifacts
```

## Requirements Validation

This system validates the following key requirements:

- **Property 2**: Approved source verification - Only sources from the approved reference list are accepted
- All validation sources must be non-Wikipedia authoritative sources
- Citation links must be both accessible and content-verified
- System provides fallback mechanisms when primary sources fail