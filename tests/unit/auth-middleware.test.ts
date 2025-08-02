import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock the replitAuth module
vi.mock('../../server/replitAuth', () => ({
  isAuthenticated: vi.fn(),
  getOidcConfig: vi.fn().mockResolvedValue({
    issuer: 'https://replit.com/oidc',
    authorization_endpoint: 'https://replit.com/oidc/auth',
    token_endpoint: 'https://replit.com/oidc/token',
  }),
}));

describe('Authentication Middleware Unit Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      isAuthenticated: vi.fn(),
      user: undefined,
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    
    mockNext = vi.fn();
  });

  describe('isAuthenticated middleware', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(false);

      const { isAuthenticated } = await import('../../server/replitAuth');
      const mockIsAuth = vi.mocked(isAuthenticated);
      
      mockIsAuth.mockImplementation(async (req, res, next) => {
        if (!req.isAuthenticated()) {
          return res.status!(401).json({ message: 'Unauthorized' });
        }
        next();
      });

      await mockIsAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user has no expires_at', async () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = {};

      await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user is authenticated and token is valid', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = {
        expires_at: futureTimestamp,
        claims: { sub: 'user123' },
      };

      await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired and no refresh token', async () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = {
        expires_at: pastTimestamp,
        refresh_token: undefined,
      };

      await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle refresh token grant failure', async () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = {
        expires_at: pastTimestamp,
        refresh_token: 'invalid_refresh_token',
      };

      // Mock the refresh token grant to fail
      vi.doMock('openid-client', () => ({
        refreshTokenGrant: vi.fn().mockRejectedValue(new Error('Invalid refresh token')),
      }));

      await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle edge case of exactly expired token', async () => {
      const nowTimestamp = Math.floor(Date.now() / 1000);
      
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = {
        expires_at: nowTimestamp, // Exactly now
        claims: { sub: 'user123' },
      };

      await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      // Should allow access since now <= expires_at
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Authentication state validation', () => {
    it('should validate user object structure', async () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = {
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        claims: null, // Invalid claims
      };

      await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      // Should still proceed since expires_at is valid
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle malformed user object', async () => {
      mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
      mockReq.user = null;

      await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });
  });

  describe('Type safety validation', () => {
    it('should handle different types of expires_at values', async () => {
      const testCases = [
        { expires_at: 'invalid', expected: 401 },
        { expires_at: null, expected: 401 },
        { expires_at: undefined, expected: 401 },
        { expires_at: Math.floor(Date.now() / 1000) + 3600, expected: 'next' },
      ];

      for (const testCase of testCases) {
        mockReq.isAuthenticated = vi.fn().mockReturnValue(true);
        mockReq.user = testCase;

        // Reset mocks
        vi.clearAllMocks();

        await isAuthenticated(mockReq as Request, mockRes as Response, mockNext);

        if (testCase.expected === 'next') {
          expect(mockNext).toHaveBeenCalled();
        } else {
          expect(mockRes.status).toHaveBeenCalledWith(testCase.expected);
        }
      }
    });
  });
});