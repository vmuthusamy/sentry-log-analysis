// Test setup file for Vitest
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/sentry_test';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.NODE_ENV = 'test';

// Global test setup
import { beforeEach } from 'vitest';

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

// Console spy to reduce noise in test output
global.console = {
  ...console,
  // Uncomment to silence logs during testing
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Mock fetch for browser environment compatibility
global.fetch = vi.fn();

export {};