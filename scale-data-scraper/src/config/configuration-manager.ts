import { SourceConfiguration, ExtractionRules } from '../interfaces';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

/**
 * Configuration storage with versioning support
 */
interface ConfigurationStorage {
  version: string;
  lastUpdated: Date;
  sources: SourceConfiguration[];
}

/**
 * Manages source configurations for web scraping operations
 * Provides methods to add, update, and validate scraping sources
 */
export class ConfigurationManager {
  private configPath: string;
  private storage: ConfigurationStorage;

  constructor(configPath: string = './config/sources.json') {
    this.configPath = configPath;
    this.storage = {
      version: '1.0.0',
      lastUpdated: new Date(),
      sources: []
    };
  }

  /**
   * Initialize the configuration manager by loading existing config or creating new one
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();
    } catch (error) {
      // If config doesn't exist, create a new one
      await this.saveConfiguration();
    }
  }

  /**
   * Add a new source configuration with validation
   * @param name Human-readable name for the source
   * @param baseUrl Base URL of the website
   * @param urlPatterns Array of URL patterns to scrape
   * @param extractionRules CSS selectors for data extraction
   * @param requestDelay Delay between requests in milliseconds
   * @param respectRobotsTxt Whether to respect robots.txt
   * @returns The created source configuration
   */
  async addSource(
    name: string,
    baseUrl: string,
    urlPatterns: string[],
    extractionRules: ExtractionRules,
    requestDelay: number = 2000,
    respectRobotsTxt: boolean = true
  ): Promise<SourceConfiguration> {
    // Validate input parameters
    this.validateSourceParameters(name, baseUrl, urlPatterns, extractionRules, requestDelay);

    // Validate source accessibility
    await this.validateSourceAccessibility(baseUrl);

    const sourceConfig: SourceConfiguration = {
      id: uuidv4(),
      name,
      baseUrl,
      urlPatterns,
      extractionRules,
      requestDelay,
      respectRobotsTxt,
      active: true
    };

    this.storage.sources.push(sourceConfig);
    this.storage.lastUpdated = new Date();
    await this.saveConfiguration();

    return sourceConfig;
  }

  /**
   * Update extraction rules for an existing source
   * @param sourceId ID of the source to update
   * @param newRules New extraction rules
   */
  async updateExtractionRules(sourceId: string, newRules: ExtractionRules): Promise<void> {
    const sourceIndex = this.storage.sources.findIndex(source => source.id === sourceId);
    
    if (sourceIndex === -1) {
      throw new Error(`Source with ID ${sourceId} not found`);
    }

    // Validate extraction rules
    this.validateExtractionRules(newRules);

    this.storage.sources[sourceIndex].extractionRules = newRules;
    this.storage.lastUpdated = new Date();
    await this.saveConfiguration();
  }

  /**
   * Validate that a source website is accessible
   * @param url URL to validate
   */
  async validateSourceAccessibility(url: string): Promise<void> {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Scale-Data-Scraper/1.0.0 (Educational Research Tool)'
        }
      });

      if (response.status >= 400) {
        throw new Error(`Website returned status ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Cannot access website: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all active source configurations
   */
  getActiveSources(): SourceConfiguration[] {
    return this.storage.sources.filter(source => source.active);
  }

  /**
   * Get a specific source configuration by ID
   */
  getSource(sourceId: string): SourceConfiguration | undefined {
    return this.storage.sources.find(source => source.id === sourceId);
  }

  /**
   * Deactivate a source (soft delete to maintain historical attribution)
   */
  async deactivateSource(sourceId: string): Promise<void> {
    const sourceIndex = this.storage.sources.findIndex(source => source.id === sourceId);
    
    if (sourceIndex === -1) {
      throw new Error(`Source with ID ${sourceId} not found`);
    }

    this.storage.sources[sourceIndex].active = false;
    this.storage.lastUpdated = new Date();
    await this.saveConfiguration();
  }

  /**
   * Get configuration version and metadata
   */
  getConfigurationInfo(): { version: string; lastUpdated: Date; sourceCount: number } {
    return {
      version: this.storage.version,
      lastUpdated: this.storage.lastUpdated,
      sourceCount: this.storage.sources.length
    };
  }

  /**
   * Load configuration from file
   */
  private async loadConfiguration(): Promise<void> {
    const configData = await fs.readFile(this.configPath, 'utf-8');
    const parsed = JSON.parse(configData);
    
    // Convert date strings back to Date objects
    parsed.lastUpdated = new Date(parsed.lastUpdated);
    
    this.storage = parsed;
  }

  /**
   * Save configuration to file
   */
  private async saveConfiguration(): Promise<void> {
    // Ensure directory exists
    const configDir = this.configPath.substring(0, this.configPath.lastIndexOf('/'));
    await fs.mkdir(configDir, { recursive: true });

    await fs.writeFile(this.configPath, JSON.stringify(this.storage, null, 2));
  }

  /**
   * Validate source parameters
   */
  private validateSourceParameters(
    name: string,
    baseUrl: string,
    urlPatterns: string[],
    extractionRules: ExtractionRules,
    requestDelay: number
  ): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Source name cannot be empty');
    }

    if (!this.isValidUrl(baseUrl)) {
      throw new Error('Invalid base URL format');
    }

    if (!urlPatterns || urlPatterns.length === 0) {
      throw new Error('At least one URL pattern is required');
    }

    for (const pattern of urlPatterns) {
      if (!pattern || pattern.trim().length === 0) {
        throw new Error('URL patterns cannot be empty');
      }
    }

    this.validateExtractionRules(extractionRules);

    if (requestDelay < 0) {
      throw new Error('Request delay cannot be negative');
    }
  }

  /**
   * Validate extraction rules
   */
  private validateExtractionRules(rules: ExtractionRules): void {
    if (!rules.scaleNameSelector || rules.scaleNameSelector.trim().length === 0) {
      throw new Error('Scale name selector is required');
    }

    if (!rules.notesSelector || rules.notesSelector.trim().length === 0) {
      throw new Error('Notes selector is required');
    }

    if (!rules.culturalOriginSelector || rules.culturalOriginSelector.trim().length === 0) {
      throw new Error('Cultural origin selector is required');
    }

    // Basic CSS selector validation
    const selectors = [rules.scaleNameSelector, rules.notesSelector, rules.culturalOriginSelector];
    for (const selector of selectors) {
      if (!this.isValidCssSelector(selector)) {
        throw new Error(`Invalid CSS selector: ${selector}`);
      }
    }
  }

  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Basic CSS selector validation
   */
  private isValidCssSelector(selector: string): boolean {
    // Basic validation - check for common CSS selector patterns
    const cssPattern = /^[a-zA-Z0-9\-_#.\[\]="':,\s>+~*()]+$/;
    return cssPattern.test(selector) && selector.length > 0;
  }
}