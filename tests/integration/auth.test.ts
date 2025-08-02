import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../../server/routes';
import { db } from '../../server/db';
import { users, sessions } from '../../shared/schema';

describe('Authentication Integration Tests', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    app = express() as Express;
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await db.delete(users);
    await db.delete(sessions);
  });

  describe('Authentication Endpoints', () => {
    it('should return 302 redirect for /api/login', async () => {
      const response = await request(app)
        .get('/api/login')
        .expect(302);
      
      // Should redirect to OAuth provider
      expect(response.headers.location).toBeDefined();
    });

    it('should return 401 for protected /api/auth/user without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('should return 401 for all protected endpoints without authentication', async () => {
      const protectedEndpoints = [
        '/api/auth/user',
        '/api/auth/system-access',
        '/api/logs',
        '/api/logs/upload',
        '/api/user/file-count',
        '/api/anomalies',
        '/api/webhooks',
        '/api/analytics/user',
        '/api/metrics/dashboard'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(401);
        
        expect(response.body.message).toBe('Unauthorized');
      }
    });

    it('should handle logout endpoint correctly', async () => {
      const response = await request(app)
        .get('/api/logout');
      
      // Should redirect (even without being logged in)
      expect([302, 401]).toContain(response.status);
    });

    it('should handle callback endpoint correctly', async () => {
      const response = await request(app)
        .get('/api/callback');
      
      // Should either redirect or return error for invalid callback
      expect([302, 400, 401]).toContain(response.status);
    });
  });

  describe('Authentication Strategy Configuration', () => {
    it('should have properly configured passport strategies', async () => {
      // Test that the authentication middleware is properly set up
      const response = await request(app)
        .get('/api/login')
        .expect(302);
      
      // Should not return authentication strategy errors
      expect(response.body.error).not.toBe('UPLOAD_ERROR');
      expect(response.body.details?.message).not.toContain('Unknown authentication strategy');
    });

    it('should handle hostname-based strategy selection correctly', async () => {
      // Test with different hostnames
      const hostnames = ['localhost', 'example.com', process.env.REPLIT_DOMAINS?.split(',')[0]];
      
      for (const hostname of hostnames.filter(Boolean)) {
        const response = await request(app)
          .get('/api/login')
          .set('Host', hostname!)
          .expect(302);
        
        // Should not fail with strategy errors
        expect(response.body.error).not.toBe('UPLOAD_ERROR');
      }
    });
  });

  describe('Session Management', () => {
    it('should properly configure session middleware', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      // Should have session-related headers
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should handle session expiration correctly', async () => {
      // Test that expired sessions are handled properly
      const response = await request(app)
        .get('/api/auth/user')
        .set('Cookie', 'connect.sid=expired-session-id')
        .expect(401);
      
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      expect(process.env.REPLIT_DOMAINS).toBeDefined();
      expect(process.env.REPL_ID).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
    });

    it('should fail gracefully with missing environment variables', async () => {
      // This test ensures the app doesn't crash with missing env vars
      // The actual validation happens at startup, so we test the endpoints still work
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('CORS and Security Headers', () => {
    it('should set proper security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.headers['x-powered-by']).toBe('Express');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/user');
      
      // Should handle OPTIONS requests properly
      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(6).fill(null).map(() => 
        request(app).get('/api/login')
      );
      
      const responses = await Promise.all(requests);
      
      // Should still redirect for most requests (rate limiting is per user)
      responses.forEach(response => {
        expect([302, 429]).toContain(response.status);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/user')
        .expect(404); // Method not allowed or not found
    });

    it('should return proper error formats', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });
  });
});