/**
 * Jest Global Setup
 * Runs once before all tests
 */

import 'reflect-metadata';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless LOG_TESTS=true
  log: process.env.LOG_TESTS === 'true' ? console.log : jest.fn(),
  debug: jest.fn(),
  info: process.env.LOG_TESTS === 'true' ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock Date.now for consistent timestamps in tests
const mockNow = new Date('2025-01-15T10:00:00.000Z').getTime();

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(mockNow);
});

afterAll(() => {
  jest.restoreAllMocks();
});
