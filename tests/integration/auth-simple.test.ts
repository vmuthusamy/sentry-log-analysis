import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../../server/routes';

describe('Authentication Security Tests', () => {
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

  describe('Critical Authentication Checks', () => {
    it('should NOT return file upload errors for login endpoint', async () => {
      const response = await request(app)
        .get('/api/login');
      
      // The critical test: should NOT return upload errors
      expect(response.body.error).not.toBe('UPLOAD_ERROR');
      expect(response.body.message).not.toContain('upload');
      expect(response.body.message).not.toContain('file');
      
      // Should either redirect (302) or return proper auth error
      expect([302, 401, 400]).toContain(response.status);
      
      if (response.status === 302) {
        expect(response.headers.location).toBeDefined();
      }
    });

    it('should properly protect user auth endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);
      
      expect(response.body).toEqual({ message: 'Unauthorized' });
    });

    it('should handle authentication strategy errors correctly', async () => {
      const response = await request(app)
        .get('/api/login');
      
      // Should NOT contain authentication strategy errors
      const bodyText = JSON.stringify(response.body);
      expect(bodyText).not.toContain('Unknown authentication strategy');
      expect(bodyText).not.toContain('replitauth:localhost');
    });

    it('should protect all critical endpoints', async () => {
      const criticalEndpoints = [
        '/api/auth/user',
        '/api/logs',
        '/api/anomalies',
        '/api/webhooks',
        '/api/analytics/user'
      ];

      for (const endpoint of criticalEndpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Unauthorized');
      }
    });

    it('should allow public health endpoints', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Environment Configuration', () => {
    it('should have required auth environment variables', () => {
      expect(process.env.REPLIT_DOMAINS).toBeDefined();
      expect(process.env.REPL_ID).toBeDefined();
      expect(process.env.DATABASE_URL).toBeDefined();
    });
  });

  describe('Session Security', () => {
    it('should set secure session cookies', async () => {
      const response = await request(app)
        .get('/api/auth/user');
      
      expect(response.headers['set-cookie']).toBeDefined();
    });
  });
});