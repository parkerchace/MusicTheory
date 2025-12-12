// Core TypeScript interfaces for the Scale Data Scraper system

/**
 * Represents a musical scale record with complete metadata
 */
export interface Scale_Record {
  id: string;
  name: string;
  notes: string[]; // Array of note names (e.g., ["C", "D", "E", "F", "G", "A", "B"])
  culturalOrigin: string;
  alternativeNames: string[];
  confidenceScore: number; // 0.0 to 1.0
  sources: SourceAttribution[];
  createdAt: Date;
  updatedAt: Date;
  validationStatus: 'verified' | 'flagged' | 'pending';
}

/**
 * Tracks the source and provenance of extracted scale data
 */
export interface SourceAttribution {
  sourceUrl: string;
  websiteName: string;
  extractedAt: Date;
  extractionMethod: string; // CSS selectors used
  rawData: string; // Original extracted content
  validationNotes: string;
}

/**
 * Configuration for a web scraping source
 */
export interface SourceConfiguration {
  id: string;
  name: string;
  baseUrl: string;
  urlPatterns: string[]; // URL patterns to scrape
  extractionRules: ExtractionRules;
  requestDelay: number; // milliseconds
  respectRobotsTxt: boolean;
  active: boolean;
}

/**
 * Rules for extracting scale data from HTML
 */
export interface ExtractionRules {
  scaleNameSelector: string;
  notesSelector: string;
  culturalOriginSelector: string;
}

/**
 * Result of a scraping operation
 */
export interface ScrapingResult {
  success: boolean;
  scaleRecords: Scale_Record[];
  errors: string[];
  sourceUrl: string;
  extractedAt: Date;
}

/**
 * Configuration for rate limiting and ethical scraping
 */
export interface RateLimitConfig {
  defaultDelay: number; // milliseconds
  maxRetries: number;
  backoffMultiplier: number;
  respectRobotsTxt: boolean;
  userAgent: string;
}