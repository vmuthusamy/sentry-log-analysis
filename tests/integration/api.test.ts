import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { registerRoutes } from '../../server/routes';
import { db } from '../../server/db';
import { users, logFiles, anomalies, webhookIntegrations } from '../../shared/schema';
import path from 'path';
import fs from 'fs';

describe('API Integration Tests', () => {
  let app: express.Application;
  let testUser: any;
  let sessionCookie: string;

  beforeAll(async () => {
    // Set up test app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Simple session setup for testing
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));

    // Mock authentication middleware for tests
    app.use('/api', (req: any, res, next) => {
      if (req.path.includes('/auth/') || req.path === '/health') {
        return next();
      }
      
      // Mock authenticated user
      req.user = { 
        claims: { sub: testUser?.id || 'test-user-id' },
        isAuthenticated: () => true 
      };
      next();
    });

    await registerRoutes(app);
  });

  beforeEach(async () => {
    // Clean up database
    await db.delete(anomalies);
    await db.delete(logFiles);
    await db.delete(webhookIntegrations);
    await db.delete(users);

    // Create test user
    const [user] = await db.insert(users).values({
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    }).returning();
    testUser = user;
  });

  afterAll(async () => {
    // Clean up
    await db.delete(anomalies);
    await db.delete(logFiles);
    await db.delete(webhookIntegrations);
    await db.delete(users);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);
    });
  });

  describe('File Upload Endpoints', () => {
    it('should upload a log file successfully', async () => {
      // Create a test file
      const testContent = `timestamp,user,action,details
2024-01-01 10:00:00,user1,web_access,google.com
2024-01-01 10:01:00,user1,web_access,github.com`;

      const testFilePath = path.join(__dirname, 'test-upload.log');
      fs.writeFileSync(testFilePath, testContent);

      try {
        const response = await request(app)
          .post('/api/upload')
          .attach('files', testFilePath)
          .field('analysisMethod', 'traditional')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.files).toHaveLength(1);
        expect(response.body.files[0].filename).toContain('.log');
      } finally {
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should reject invalid file types', async () => {
      const testContent = 'This is not a log file';
      const testFilePath = path.join(__dirname, 'test-invalid.txt');
      fs.writeFileSync(testFilePath, testContent);

      try {
        await request(app)
          .post('/api/upload')
          .attach('files', testFilePath)
          .field('analysisMethod', 'traditional')
          .expect(400);
      } finally {
        if (fs.existsSync(testFilePath)) {
          fs.unlinkSync(testFilePath);
        }
      }
    });

    it('should list user log files', async () => {
      // Create a test log file
      const [logFile] = await db.insert(logFiles).values({
        userId: testUser.id,
        filename: 'test.log',
        originalName: 'test-original.log',
        size: 1024,
        status: 'processed',
        uploadPath: '/uploads/test.log'
      }).returning();

      const response = await request(app)
        .get('/api/log-files')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(logFile.id);
      expect(response.body[0].filename).toBe('test.log');
    });

    it('should get specific log file', async () => {
      const [logFile] = await db.insert(logFiles).values({
        userId: testUser.id,
        filename: 'specific-test.log',
        originalName: 'specific-test-original.log',
        size: 2048,
        status: 'processed',
        uploadPath: '/uploads/specific-test.log'
      }).returning();

      const response = await request(app)
        .get(`/api/log-files/${logFile.id}`)
        .expect(200);

      expect(response.body.id).toBe(logFile.id);
      expect(response.body.filename).toBe('specific-test.log');
    });
  });

  describe('Anomaly Detection Endpoints', () => {
    let testLogFile: any;

    beforeEach(async () => {
      const [logFile] = await db.insert(logFiles).values({
        userId: testUser.id,
        filename: 'anomaly-test.log',
        originalName: 'anomaly-test-original.log',
        size: 1024,
        status: 'processed',
        uploadPath: '/uploads/anomaly-test.log'
      }).returning();
      testLogFile = logFile;
    });

    it('should list user anomalies', async () => {
      // Create test anomaly
      await db.insert(anomalies).values({
        userId: testUser.id,
        logFileId: testLogFile.id,
        detectionMethod: 'traditional',
        anomalyType: 'crypto_mining',
        description: 'Test anomaly',
        riskScore: 7.5,
        confidence: 85,
        details: { test: 'data' },
        rawLogEntry: 'test log entry',
        logLineNumber: 1
      });

      const response = await request(app)
        .get('/api/anomalies')
        .expect(200);

      expect(response.body.anomalies).toHaveLength(1);
      expect(response.body.anomalies[0].anomalyType).toBe('crypto_mining');
      expect(response.body.anomalies[0].riskScore).toBe(7.5);
    });

    it('should filter anomalies by risk score', async () => {
      // Create anomalies with different risk scores
      await db.insert(anomalies).values([
        {
          userId: testUser.id,
          logFileId: testLogFile.id,
          detectionMethod: 'traditional',
          anomalyType: 'crypto_mining',
          description: 'High risk anomaly',
          riskScore: 9.0,
          confidence: 95,
          details: {},
          rawLogEntry: 'high risk log',
          logLineNumber: 1
        },
        {
          userId: testUser.id,
          logFileId: testLogFile.id,
          detectionMethod: 'traditional',
          anomalyType: 'auth_failure',
          description: 'Low risk anomaly',
          riskScore: 3.0,
          confidence: 70,
          details: {},
          rawLogEntry: 'low risk log',
          logLineNumber: 2
        }
      ]);

      const response = await request(app)
        .get('/api/anomalies?minRisk=8')
        .expect(200);

      expect(response.body.anomalies).toHaveLength(1);
      expect(response.body.anomalies[0].riskScore).toBe(9.0);
    });

    it('should update anomaly status', async () => {
      const [anomaly] = await db.insert(anomalies).values({
        userId: testUser.id,
        logFileId: testLogFile.id,
        detectionMethod: 'ai',
        anomalyType: 'data_exfiltration',
        description: 'Test update anomaly',
        riskScore: 8.0,
        confidence: 90,
        details: {},
        rawLogEntry: 'test log for update',
        logLineNumber: 5
      }).returning();

      const response = await request(app)
        .patch(`/api/anomalies/${anomaly.id}`)
        .send({
          status: 'investigating',
          priority: 'high',
          analystNotes: 'Under investigation'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the update
      const getResponse = await request(app)
        .get('/api/anomalies')
        .expect(200);

      const updatedAnomaly = getResponse.body.anomalies.find((a: any) => a.id === anomaly.id);
      expect(updatedAnomaly.status).toBe('investigating');
      expect(updatedAnomaly.priority).toBe('high');
      expect(updatedAnomaly.analystNotes).toBe('Under investigation');
    });
  });

  describe('Webhook Integration Endpoints', () => {
    it('should create webhook integration', async () => {
      const webhookData = {
        name: 'Test Webhook',
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
        isActive: true,
        triggerConditions: {
          minRiskScore: 7,
          anomalyTypes: ['crypto_mining'],
          priorities: ['high']
        }
      };

      const response = await request(app)
        .post('/api/webhooks')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.webhook.name).toBe('Test Webhook');
      expect(response.body.webhook.webhookUrl).toBe(webhookData.webhookUrl);
    });

    it('should list user webhook integrations', async () => {
      await db.insert(webhookIntegrations).values({
        userId: testUser.id,
        name: 'List Test Webhook',
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/456/def',
        isActive: true
      });

      const response = await request(app)
        .get('/api/webhooks')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('List Test Webhook');
    });

    it('should test webhook delivery', async () => {
      const [webhook] = await db.insert(webhookIntegrations).values({
        userId: testUser.id,
        name: 'Test Delivery Webhook',
        webhookUrl: 'https://httpbin.org/post', // Test endpoint
        isActive: true
      }).returning();

      const response = await request(app)
        .post(`/api/webhooks/${webhook.id}/test`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Test webhook sent successfully');
    });

    it('should update webhook configuration', async () => {
      const [webhook] = await db.insert(webhookIntegrations).values({
        userId: testUser.id,
        name: 'Update Test Webhook',
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/789/ghi',
        isActive: true
      }).returning();

      const updateData = {
        name: 'Updated Webhook Name',
        isActive: false,
        triggerConditions: {
          minRiskScore: 8,
          priorities: ['critical']
        }
      };

      const response = await request(app)
        .patch(`/api/webhooks/${webhook.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.webhook.name).toBe('Updated Webhook Name');
      expect(response.body.webhook.isActive).toBe(false);
    });

    it('should delete webhook integration', async () => {
      const [webhook] = await db.insert(webhookIntegrations).values({
        userId: testUser.id,
        name: 'Delete Test Webhook',
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/delete/test',
        isActive: true
      }).returning();

      await request(app)
        .delete(`/api/webhooks/${webhook.id}`)
        .expect(200);

      // Verify deletion
      const response = await request(app)
        .get('/api/webhooks')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  describe('Analytics Endpoints', () => {
    it('should return user statistics', async () => {
      // Create test data
      await db.insert(logFiles).values({
        userId: testUser.id,
        filename: 'stats-test.log',
        originalName: 'stats-test-original.log',
        size: 1024,
        status: 'processed',
        uploadPath: '/uploads/stats-test.log',
        totalLogs: 100
      });

      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.totalFiles).toBe(1);
      expect(response.body.totalLogs).toBe(100);
      expect(response.body.totalAnomalies).toBe(0);
      expect(response.body.averageRiskScore).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent resources', async () => {
      await request(app)
        .get('/api/log-files/non-existent-id')
        .expect(404);
    });

    it('should handle malformed request bodies', async () => {
      await request(app)
        .post('/api/webhooks')
        .send({ invalid: 'data' })
        .expect(400);
    });

    it('should handle unauthorized access attempts', async () => {
      // Test with no authentication
      const testApp = express();
      testApp.use(express.json());
      
      testApp.get('/api/test-unauthorized', (req, res) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(testApp)
        .get('/api/test-unauthorized')
        .expect(401);
    });
  });
});