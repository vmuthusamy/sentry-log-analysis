import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';

/**
 * Critical Authentication Regression Tests
 * 
 * These tests are designed to catch the specific authentication issues
 * that caused production login failures, preventing future regressions.
 */
describe('Authentication Regression Prevention', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    try {
      server = await registerRoutes(app);
    } catch (error) {
      console.error('Failed to setup routes:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (server && typeof server.close === 'function') {
      server.close();
    }
  });

  describe('🚨 CRITICAL: Prevent Upload Error Regression', () => {
    it('login endpoint must NOT return upload errors', async () => {
      const response = await request(app)
        .get('/api/login');
      
      // The critical regression test - these errors broke production
      expect(response.body.error).not.toBe('UPLOAD_ERROR');
      expect(response.body.message).not.toContain('upload');
      expect(response.body.message).not.toContain('file');
      expect(response.body.message).not.toContain('Unknown authentication strategy');
      
      // Should either redirect (302) or return proper auth response
      expect([302, 401, 400]).toContain(response.status);
    });

    it('auth endpoints must return proper error formats', async () => {
      const response = await request(app)
        .get('/api/auth/user');
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
      
      // Should NOT contain upload-related errors
      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('upload');
      expect(responseText).not.toContain('file');
      expect(responseText).not.toContain('multer');
    });
  });

  describe('🔐 Authentication Strategy Configuration', () => {
    it('should handle hostname-based strategy selection', async () => {
      const testHostnames = ['localhost', 'test.replit.dev'];
      
      for (const hostname of testHostnames) {
        const response = await request(app)
          .get('/api/login')
          .set('Host', hostname);
        
        // Should not fail with strategy errors
        expect(response.body.error).not.toBe('UPLOAD_ERROR');
        expect(response.body.details?.message).not.toContain('Unknown authentication strategy');
      }
    });

    it('should properly configure passport middleware', async () => {
      // Test that passport middleware is working
      const response = await request(app)
        .get('/api/auth/user');
      
      // Should have session cookies
      expect(response.headers['set-cookie']).toBeDefined();
      
      // Should return proper unauthorized response
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('🛡️ Protected Endpoints Security', () => {
    it('should protect all sensitive endpoints consistently', async () => {
      const protectedPaths = [
        '/api/auth/user',
        '/api/logs',
        '/api/anomalies',
        '/api/webhooks',
        '/api/analytics/user'
      ];

      for (const path of protectedPaths) {
        const response = await request(app).get(path);
        
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
        
        // Ensure no upload errors leak into auth responses
        expect(response.body.error).not.toBe('UPLOAD_ERROR');
      }
    });

    it('should allow public endpoints without authentication', async () => {
      const publicPaths = ['/health', '/api/health'];

      for (const path of publicPaths) {
        const response = await request(app)
          .get(path)
          .expect(200);
        
        expect(response.body.status).toBe('healthy');
      }
    });
  });

  describe('🔧 Environment Configuration Validation', () => {
    it('should have required authentication environment variables', () => {
      const requiredEnvVars = [
        'REPLIT_DOMAINS',
        'REPL_ID', 
        'DATABASE_URL'
      ];

      for (const envVar of requiredEnvVars) {
        expect(process.env[envVar]).toBeDefined();
        expect(process.env[envVar]).not.toBe('');
      }
    });

    it('should not expose sensitive data in error responses', async () => {
      const response = await request(app)
        .get('/api/auth/user');
      
      const responseText = JSON.stringify(response.body);
      const sensitivePatterns = [
        /database_url/i,
        /session_secret/i,
        /password/i,
        /repl_id/i
      ];

      for (const pattern of sensitivePatterns) {
        expect(responseText).not.toMatch(pattern);
      }
    });
  });

  describe('⚡ Performance and Reliability', () => {
    it('should respond to auth requests quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests without errors', async () => {
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app).get('/api/auth/user')
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
        expect(response.body.error).not.toBe('UPLOAD_ERROR');
      });
    });
  });
});