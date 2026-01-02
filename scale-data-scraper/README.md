# Scale Data Scraper

An automated web scraping system for collecting authentic musical scale information from authoritative online sources.

## Project Structure

```
scale-data-scraper/
├── src/
│   ├── interfaces/          # TypeScript interfaces and type definitions
│   ├── scraping/           # Web scraping engine components
│   ├── validation/         # Data validation and quality assurance
│   ├── storage/            # Data persistence and database operations
│   ├── api/                # REST API server components
│   ├── config/             # Configuration management
│   └── index.ts            # Main entry point
├── tests/                  # Test files and test utilities
├── dist/                   # Compiled JavaScript output
├── coverage/               # Test coverage reports
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest testing configuration
└── README.md               # Project documentation
```

## Core Interfaces

### Scale_Record
Represents a musical scale with complete metadata including notes, cultural origin, and source attribution.

### SourceAttribution
Tracks the provenance of extracted scale data with timestamps and validation information.

### SourceConfiguration
Defines how to scrape data from specific websites including URL patterns and CSS selectors.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Testing

The project uses Jest for unit testing and fast-check for property-based testing. All property tests run a minimum of 100 iterations as specified in the design document.

## Dependencies

- **axios**: HTTP client for web requests
- **cheerio**: Server-side HTML parsing and manipulation
- **express**: Web framework for API server
- **mongodb**: Database driver for data persistence
- **fast-check**: Property-based testing library
- **jest**: Testing framework