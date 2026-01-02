import { SourceConfiguration, ExtractionRules } from '../interfaces';

/**
 * Builder class for creating source configurations
 * Provides a fluent interface for constructing SourceConfiguration objects
 */
export class SourceConfigBuilder {
  private config: Partial<SourceConfiguration> = {
    requestDelay: 2000,
    respectRobotsTxt: true,
    active: true
  };

  /**
   * Set the source name
   */
  name(name: string): SourceConfigBuilder {
    this.config.name = name;
    return this;
  }

  /**
   * Set the base URL
   */
  baseUrl(url: string): SourceConfigBuilder {
    this.config.baseUrl = url;
    return this;
  }

  /**
   * Set URL patterns to scrape
   */
  urlPatterns(patterns: string[]): SourceConfigBuilder {
    this.config.urlPatterns = patterns;
    return this;
  }

  /**
   * Set extraction rules
   */
  extractionRules(rules: ExtractionRules): SourceConfigBuilder {
    this.config.extractionRules = rules;
    return this;
  }

  /**
   * Set request delay in milliseconds
   */
  requestDelay(delay: number): SourceConfigBuilder {
    this.config.requestDelay = delay;
    return this;
  }

  /**
   * Set whether to respect robots.txt
   */
  respectRobotsTxt(respect: boolean): SourceConfigBuilder {
    this.config.respectRobotsTxt = respect;
    return this;
  }

  /**
   * Set whether the source is active
   */
  active(isActive: boolean): SourceConfigBuilder {
    this.config.active = isActive;
    return this;
  }

  /**
   * Build the configuration object
   * Note: ID will be assigned by ConfigurationManager
   */
  build(): Omit<SourceConfiguration, 'id'> {
    if (!this.config.name) {
      throw new Error('Source name is required');
    }
    if (!this.config.baseUrl) {
      throw new Error('Base URL is required');
    }
    if (!this.config.urlPatterns || this.config.urlPatterns.length === 0) {
      throw new Error('URL patterns are required');
    }
    if (!this.config.extractionRules) {
      throw new Error('Extraction rules are required');
    }

    return this.config as Omit<SourceConfiguration, 'id'>;
  }
}

/**
 * Utility functions for working with source configurations
 */
export class SourceConfigUtils {
  /**
   * Create extraction rules for common website patterns
   */
  static createExtractionRules(
    scaleNameSelector: string,
    notesSelector: string,
    culturalOriginSelector: string
  ): ExtractionRules {
    return {
      scaleNameSelector,
      notesSelector,
      culturalOriginSelector
    };
  }

  /**
   * Create a basic source configuration for testing
   */
  static createTestConfig(name: string, baseUrl: string): Omit<SourceConfiguration, 'id'> {
    return new SourceConfigBuilder()
      .name(name)
      .baseUrl(baseUrl)
      .urlPatterns([`${baseUrl}/scales/*`])
      .extractionRules({
        scaleNameSelector: '.scale-name',
        notesSelector: '.scale-notes',
        culturalOriginSelector: '.cultural-origin'
      })
      .build();
  }

  /**
   * Validate that a configuration has all required fields
   */
  static validateConfiguration(config: SourceConfiguration): string[] {
    const errors: string[] = [];

    if (!config.id) errors.push('ID is required');
    if (!config.name) errors.push('Name is required');
    if (!config.baseUrl) errors.push('Base URL is required');
    if (!config.urlPatterns || config.urlPatterns.length === 0) {
      errors.push('URL patterns are required');
    }
    if (!config.extractionRules) {
      errors.push('Extraction rules are required');
    } else {
      if (!config.extractionRules.scaleNameSelector) {
        errors.push('Scale name selector is required');
      }
      if (!config.extractionRules.notesSelector) {
        errors.push('Notes selector is required');
      }
      if (!config.extractionRules.culturalOriginSelector) {
        errors.push('Cultural origin selector is required');
      }
    }
    if (typeof config.requestDelay !== 'number' || config.requestDelay < 0) {
      errors.push('Request delay must be a non-negative number');
    }
    if (typeof config.respectRobotsTxt !== 'boolean') {
      errors.push('Respect robots.txt must be a boolean');
    }
    if (typeof config.active !== 'boolean') {
      errors.push('Active must be a boolean');
    }

    return errors;
  }
}