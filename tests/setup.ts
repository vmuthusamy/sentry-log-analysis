import { beforeAll, afterAll } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sentry_test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

beforeAll(async () => {
  // Global test setup
});

afterAll(async () => {
  // Global test cleanup
});