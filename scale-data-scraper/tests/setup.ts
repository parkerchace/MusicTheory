// Jest setup file for property-based testing with fast-check

import fc from 'fast-check';

// Configure fast-check for property-based testing
// Minimum 100 iterations per property test as specified in design document
fc.configureGlobal({
  numRuns: 100,
  verbose: true,
  seed: 42, // For reproducible tests
  endOnFailure: true
});

// Global test timeout for property-based tests
jest.setTimeout(30000);

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};