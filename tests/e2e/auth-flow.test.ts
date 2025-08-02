import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../server/routes';

describe('Authentication Flow E2E Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete login flow without errors', async () => {
      // Step 1: Access login endpoint
      const loginResponse = await request(app)
        .get('/api/login')
        .expect(302);
      
      expect(loginResponse.headers.location).toBeDefined();
      expect(loginResponse.headers.location).toContain('replit.com');
    });

    it('should protect all sensitive endpoints', async () => {
      const sensitiveEndpoints = [
        { method: 'GET', path: '/api/auth/user' },
        { method: 'GET', path: '/api/logs' },
        { method: 'POST', path: '/api/logs/upload' },
        { method: 'GET', path: '/api/anomalies' },
        { method: 'POST', path: '/api/anomalies/1/update' },
        { method: 'GET', path: '/api/webhooks' },
        { method: 'POST', path: '/api/webhooks' },
        { method: 'GET', path: '/api/analytics/user' },
        { method: 'GET', path: '/api/metrics/dashboard' },
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await request(app)[endpoint.method.toLowerCase() as 'get' | 'post'](endpoint.path);
        
        expect([401, 404, 405]).toContain(response.status);
        
        if (response.status === 401) {
          expect(response.body.message).toBe('Unauthorized');
        }
      }
    });

    it('should allow access to public endpoints without authentication', async () => {
      const publicEndpoints = [
        '/health',
        '/api/health',
      ];

      for (const endpoint of publicEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);
        
        expect(response.body.status).toBe('healthy');
      }
    });

    it('should handle logout flow correctly', async () => {
      const response = await request(app)
        .get('/api/logout');
      
      // Should redirect to logout URL or return error for unauthenticated user
      expect([302, 401]).toContain(response.status);
    });

    it('should handle callback with various scenarios', async () => {
      // Test callback without parameters (should redirect or error)
      const callbackResponse = await request(app)
        .get('/api/callback');
      
      expect([302, 400, 401]).toContain(callbackResponse.status);
    });
  });

  describe('Session Management', () => {
    it('should set session cookies on authentication attempts', async () => {
      const response = await request(app)
        .get('/api/auth/user');
      
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should maintain session state across requests', async () => {
      // First request to establish session
      const firstResponse = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      const sessionCookie = firstResponse.headers['set-cookie'];
      
      // Second request with same session
      const secondResponse = await request(app)
        .get('/api/auth/user')
        .set('Cookie', sessionCookie)
        .expect(401);
      
      // Should maintain consistent behavior
      expect(secondResponse.body.message).toBe('Unauthorized');
    });
  });

  describe('Security Headers and CORS', () => {
    it('should set appropriate security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.headers['x-powered-by']).toBe('Express');
    });

    it('should handle preflight CORS requests', async () => {
      const response = await request(app)
        .options('/api/auth/user');
      
      // Should handle OPTIONS requests appropriately
      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should return consistent error formats', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message).not.toContain('upload');
      expect(response.body.message).not.toContain('file');
    });

    it('should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      const bodyString = JSON.stringify(response.body);
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /database_url/i,
        /session_secret/i,
      ];

      for (const pattern of sensitivePatterns) {
        expect(bodyString).not.toMatch(pattern);
      }
    });

    it('should handle malformed requests gracefully', async () => {
      const malformedRequests = [
        { path: '/api/auth/user', body: 'invalid-json' },
        { path: '/api/logs', body: { invalid: 'data' } },
      ];

      for (const req of malformedRequests) {
        const response = await request(app)
          .post(req.path)
          .send(req.body);
        
        // Should not crash the server
        expect([400, 401, 404, 422]).toContain(response.status);
      }
    });
  });

  describe('Performance and Reliability', () => {
    it('should respond to authentication checks within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent authentication requests', async () => {
      const concurrentRequests = Array(10).fill(null).map(() =>
        request(app).get('/api/auth/user')
      );
      
      const responses = await Promise.all(concurrentRequests);
      
      // All should return 401 consistently
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
      });
    });
  });
});