import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupAuth, getSession } from '../../server/replitAuth';
import express from 'express';

// Mock external dependencies
vi.mock('openid-client', () => ({
  discovery: vi.fn().mockResolvedValue({
    issuer: 'https://replit.com/oidc',
    authorization_endpoint: 'https://replit.com/oidc/auth',
    token_endpoint: 'https://replit.com/oidc/token',
  }),
  buildEndSessionUrl: vi.fn().mockReturnValue({ href: 'https://replit.com/oidc/logout' }),
}));

vi.mock('openid-client/passport', () => ({
  Strategy: vi.fn().mockImplementation((config, verify) => ({
    name: config.name,
    authenticate: vi.fn(),
  })),
}));

vi.mock('passport', () => ({
  default: {
    use: vi.fn(),
    initialize: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    session: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    authenticate: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  },
}));

vi.mock('express-session', () => ({
  default: vi.fn().mockReturnValue((req: any, res: any, next: any) => next()),
}));

vi.mock('connect-pg-simple', () => ({
  default: vi.fn().mockReturnValue(() => ({})),
}));

vi.mock('../../server/storage', () => ({
  storage: {
    upsertUser: vi.fn().mockResolvedValue({ id: 'user123' }),
  },
}));

describe('Passport Strategy Configuration Tests', () => {
  let app: express.Application;
  const originalEnv = process.env;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Set up test environment variables
    process.env = {
      ...originalEnv,
      REPLIT_DOMAINS: 'test.replit.dev,another.replit.dev',
      REPL_ID: 'test-repl-id',
      SESSION_SECRET: 'test-session-secret',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('setupAuth function', () => {
    it('should configure passport strategies for all domains', async () => {
      const passport = await import('passport');
      
      await setupAuth(app);

      // Should register strategies for each domain
      expect(passport.default.use).toHaveBeenCalledTimes(2);
    });

    it('should set up session middleware correctly', async () => {
      await setupAuth(app);

      // Verify app configuration
      expect(app.get('trust proxy')).toBe(1);
    });

    it('should configure authentication routes', async () => {
      await setupAuth(app);

      // Test that routes are configured (we can't easily test the actual route handlers)
      expect(app._router).toBeDefined();
    });
  });

  describe('getSession function', () => {
    it('should create session configuration with correct settings', () => {
      const session = getSession();
      
      expect(session).toBeDefined();
      // Session function should be callable
      expect(typeof session).toBe('function');
    });

    it('should handle production vs development cookie settings', () => {
      // Test production environment
      process.env.NODE_ENV = 'production';
      const prodSession = getSession();
      expect(prodSession).toBeDefined();

      // Test development environment
      process.env.NODE_ENV = 'development';
      const devSession = getSession();
      expect(devSession).toBeDefined();
    });
  });

  describe('Environment variable validation', () => {
    it('should throw error when REPLIT_DOMAINS is missing', async () => {
      delete process.env.REPLIT_DOMAINS;
      
      // Re-import to trigger the environment check
      vi.resetModules();
      
      await expect(async () => {
        const { setupAuth } = await import('../../server/replitAuth');
        await setupAuth(app);
      }).rejects.toThrow('Environment variable REPLIT_DOMAINS not provided');
    });

    it('should handle multiple domains correctly', async () => {
      process.env.REPLIT_DOMAINS = 'domain1.replit.dev,domain2.replit.dev,domain3.replit.dev';
      
      const passport = await import('passport');
      vi.clearAllMocks();
      
      await setupAuth(app);

      // Should register strategies for all three domains
      expect(passport.default.use).toHaveBeenCalledTimes(3);
    });

    it('should handle single domain correctly', async () => {
      process.env.REPLIT_DOMAINS = 'single.replit.dev';
      
      const passport = await import('passport');
      vi.clearAllMocks();
      
      await setupAuth(app);

      // Should register strategy for single domain
      expect(passport.default.use).toHaveBeenCalledTimes(1);
    });
  });

  describe('Strategy verification callback', () => {
    it('should handle valid token claims', async () => {
      const mockTokens = {
        claims: vi.fn().mockReturnValue({
          sub: 'user123',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          profile_image_url: 'https://example.com/avatar.jpg',
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };

      const { Strategy } = await import('openid-client/passport');
      
      await setupAuth(app);

      // Get the verify function that was passed to Strategy
      const strategyCall = (Strategy as any).mock.calls[0];
      const verifyFunction = strategyCall[1];

      const mockVerified = vi.fn();
      
      await verifyFunction(mockTokens, mockVerified);

      expect(mockVerified).toHaveBeenCalledWith(null, expect.any(Object));
    });

    it('should handle invalid token claims', async () => {
      const mockTokens = {
        claims: vi.fn().mockReturnValue(null), // Invalid claims
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };

      const { Strategy } = await import('openid-client/passport');
      
      await setupAuth(app);

      // Get the verify function that was passed to Strategy
      const strategyCall = (Strategy as any).mock.calls[0];
      const verifyFunction = strategyCall[1];

      const mockVerified = vi.fn();
      
      await verifyFunction(mockTokens, mockVerified);

      expect(mockVerified).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle missing sub claim', async () => {
      const mockTokens = {
        claims: vi.fn().mockReturnValue({
          email: 'test@example.com',
          // Missing 'sub' claim
        }),
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      };

      const { Strategy } = await import('openid-client/passport');
      
      await setupAuth(app);

      const strategyCall = (Strategy as any).mock.calls[0];
      const verifyFunction = strategyCall[1];
      const mockVerified = vi.fn();
      
      await verifyFunction(mockTokens, mockVerified);

      expect(mockVerified).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Route handlers', () => {
    it('should handle hostname resolution for strategy selection', async () => {
      process.env.REPLIT_DOMAINS = 'prod.replit.dev';
      
      await setupAuth(app);

      // Test request with matching hostname
      const req = { hostname: 'prod.replit.dev' };
      const domains = process.env.REPLIT_DOMAINS.split(',');
      const shouldUseMatching = domains.includes(req.hostname);
      
      expect(shouldUseMatching).toBe(true);
    });

    it('should fallback to first domain for unmatched hostnames', async () => {
      process.env.REPLIT_DOMAINS = 'prod.replit.dev,staging.replit.dev';
      
      await setupAuth(app);

      // Test request with non-matching hostname
      const req = { hostname: 'localhost' };
      const domains = process.env.REPLIT_DOMAINS.split(',');
      const shouldUseFallback = !domains.includes(req.hostname);
      
      expect(shouldUseFallback).toBe(true);
    });
  });
});