import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { DatabaseStorage } from '../../server/storage';
import { db } from '../../server/db';
import { users, logFiles, anomalies, webhookIntegrations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeAll(async () => {
    storage = new DatabaseStorage();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await db.delete(anomalies);
    await db.delete(logFiles);
    await db.delete(webhookIntegrations);
    await db.delete(users);
  });

  afterAll(async () => {
    // Clean up after all tests
    await db.delete(anomalies);
    await db.delete(logFiles);
    await db.delete(webhookIntegrations);
    await db.delete(users);
  });

  describe('User Management', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: 'https://example.com/avatar.jpg'
      };

      const user = await storage.upsertUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
    });

    it('should retrieve a user by ID', async () => {
      const userData = {
        email: 'test2@example.com',
        firstName: 'Test2',
        lastName: 'User2'
      };

      const createdUser = await storage.upsertUser(userData);
      const retrievedUser = await storage.getUser(createdUser.id);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.id).toBe(createdUser.id);
      expect(retrievedUser?.email).toBe(userData.email);
    });

    it('should retrieve a user by email', async () => {
      const userData = {
        email: 'test3@example.com',
        firstName: 'Test3',
        lastName: 'User3'
      };

      await storage.upsertUser(userData);
      const retrievedUser = await storage.getUserByEmail(userData.email);

      expect(retrievedUser).toBeDefined();
      expect(retrievedUser?.email).toBe(userData.email);
    });

    it('should update existing user on upsert', async () => {
      const userData = {
        id: 'test-user-id',
        email: 'test4@example.com',
        firstName: 'Test4',
        lastName: 'User4'
      };

      // First upsert
      const user1 = await storage.upsertUser(userData);
      
      // Second upsert with updated data
      const updatedData = {
        ...userData,
        firstName: 'Updated',
        lastName: 'Name'
      };
      const user2 = await storage.upsertUser(updatedData);

      expect(user1.id).toBe(user2.id);
      expect(user2.firstName).toBe('Updated');
      expect(user2.lastName).toBe('Name');
    });
  });

  describe('Log File Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await storage.upsertUser({
        email: 'logtest@example.com',
        firstName: 'Log',
        lastName: 'Tester'
      });
    });

    it('should create a log file', async () => {
      const logFileData = {
        userId: testUser.id,
        filename: 'test.log',
        originalName: 'test-original.log',
        size: 1024,
        status: 'uploaded' as const,
        uploadPath: '/uploads/test.log'
      };

      const logFile = await storage.createLogFile(logFileData);

      expect(logFile).toBeDefined();
      expect(logFile.userId).toBe(testUser.id);
      expect(logFile.filename).toBe(logFileData.filename);
      expect(logFile.status).toBe('uploaded');
    });

    it('should retrieve log files by user', async () => {
      const logFileData = {
        userId: testUser.id,
        filename: 'test2.log',
        originalName: 'test2-original.log',
        size: 2048,
        status: 'uploaded' as const,
        uploadPath: '/uploads/test2.log'
      };

      await storage.createLogFile(logFileData);
      const logFiles = await storage.getLogFilesByUser(testUser.id);

      expect(logFiles).toHaveLength(1);
      expect(logFiles[0].userId).toBe(testUser.id);
    });

    it('should update log file status', async () => {
      const logFileData = {
        userId: testUser.id,
        filename: 'test3.log',
        originalName: 'test3-original.log',
        size: 512,
        status: 'uploaded' as const,
        uploadPath: '/uploads/test3.log'
      };

      const logFile = await storage.createLogFile(logFileData);
      await storage.updateLogFileStatus(logFile.id, 'processing', 100);

      const updatedLogFile = await storage.getLogFile(logFile.id);
      expect(updatedLogFile?.status).toBe('processing');
      expect(updatedLogFile?.totalLogs).toBe(100);
    });
  });

  describe('Anomaly Management', () => {
    let testUser: any;
    let testLogFile: any;

    beforeEach(async () => {
      testUser = await storage.upsertUser({
        email: 'anomalytest@example.com',
        firstName: 'Anomaly',
        lastName: 'Tester'
      });

      testLogFile = await storage.createLogFile({
        userId: testUser.id,
        filename: 'anomaly-test.log',
        originalName: 'anomaly-test-original.log',
        size: 1024,
        status: 'processed',
        uploadPath: '/uploads/anomaly-test.log'
      });
    });

    it('should create an anomaly', async () => {
      const anomalyData = {
        userId: testUser.id,
        logFileId: testLogFile.id,
        detectionMethod: 'ai',
        anomalyType: 'crypto_mining',
        description: 'Suspicious cryptocurrency mining activity detected',
        riskScore: 8.5,
        confidence: 92,
        details: { source: 'test', pattern: 'mining' },
        rawLogEntry: 'test log entry',
        logLineNumber: 42
      };

      const anomaly = await storage.createAnomaly(anomalyData);

      expect(anomaly).toBeDefined();
      expect(anomaly.userId).toBe(testUser.id);
      expect(anomaly.logFileId).toBe(testLogFile.id);
      expect(anomaly.riskScore).toBe(8.5);
      expect(anomaly.anomalyType).toBe('crypto_mining');
    });

    it('should retrieve anomalies by user', async () => {
      const anomalyData = {
        userId: testUser.id,
        logFileId: testLogFile.id,
        detectionMethod: 'traditional',
        anomalyType: 'auth_failure',
        description: 'Multiple failed login attempts',
        riskScore: 6.0,
        confidence: 85,
        details: { attempts: 5 },
        rawLogEntry: 'failed login attempt',
        logLineNumber: 10
      };

      await storage.createAnomaly(anomalyData);
      const anomalies = await storage.getAnomaliesByUser(testUser.id);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0].userId).toBe(testUser.id);
      expect(anomalies[0].anomalyType).toBe('auth_failure');
    });

    it('should update anomaly details', async () => {
      const anomalyData = {
        userId: testUser.id,
        logFileId: testLogFile.id,
        detectionMethod: 'advanced_ml',
        anomalyType: 'data_exfiltration',
        description: 'Unusual data transfer detected',
        riskScore: 9.0,
        confidence: 95,
        details: { volume: '10GB' },
        rawLogEntry: 'large data transfer',
        logLineNumber: 20
      };

      const anomaly = await storage.createAnomaly(anomalyData);
      
      await storage.updateAnomalyDetails(anomaly.id, testUser.id, {
        status: 'investigating',
        priority: 'high',
        analystNotes: 'Under investigation by security team'
      });

      const anomalies = await storage.getAnomaliesByUser(testUser.id);
      expect(anomalies[0].status).toBe('investigating');
      expect(anomalies[0].priority).toBe('high');
      expect(anomalies[0].analystNotes).toBe('Under investigation by security team');
    });
  });

  describe('Webhook Integration Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await storage.upsertUser({
        email: 'webhooktest@example.com',
        firstName: 'Webhook',
        lastName: 'Tester'
      });
    });

    it('should create a webhook integration', async () => {
      const webhookData = {
        userId: testUser.id,
        name: 'Test Webhook',
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/123/abc',
        isActive: true,
        triggerConditions: {
          minRiskScore: 7,
          anomalyTypes: ['crypto_mining', 'data_exfiltration'],
          priorities: ['high', 'critical']
        }
      };

      const webhook = await storage.createWebhookIntegration(webhookData);

      expect(webhook).toBeDefined();
      expect(webhook.userId).toBe(testUser.id);
      expect(webhook.name).toBe('Test Webhook');
      expect(webhook.webhookUrl).toBe(webhookData.webhookUrl);
      expect(webhook.isActive).toBe(true);
    });

    it('should retrieve webhook integrations by user', async () => {
      const webhookData = {
        userId: testUser.id,
        name: 'Test Webhook 2',
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/456/def',
        isActive: true
      };

      await storage.createWebhookIntegration(webhookData);
      const webhooks = await storage.getWebhookIntegrationsByUser(testUser.id);

      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].userId).toBe(testUser.id);
      expect(webhooks[0].name).toBe('Test Webhook 2');
    });

    it('should update webhook statistics', async () => {
      const webhookData = {
        userId: testUser.id,
        name: 'Stats Test Webhook',
        webhookUrl: 'https://hooks.zapier.com/hooks/catch/789/ghi',
        isActive: true
      };

      const webhook = await storage.createWebhookIntegration(webhookData);
      
      // Test successful trigger
      await storage.updateWebhookStats(webhook.id, true);
      
      let updatedWebhook = await storage.getWebhookIntegrationsByUser(testUser.id);
      expect(updatedWebhook[0].totalTriggers).toBe(1);
      expect(updatedWebhook[0].successfulTriggers).toBe(1);
      expect(updatedWebhook[0].failedTriggers).toBe(0);

      // Test failed trigger
      await storage.updateWebhookStats(webhook.id, false);
      
      updatedWebhook = await storage.getWebhookIntegrationsByUser(testUser.id);
      expect(updatedWebhook[0].totalTriggers).toBe(2);
      expect(updatedWebhook[0].successfulTriggers).toBe(1);
      expect(updatedWebhook[0].failedTriggers).toBe(1);
    });
  });

  describe('System Metrics', () => {
    it('should record system metrics', async () => {
      await storage.recordMetric('test_metric', 'test_action', 5, { 
        testData: 'value' 
      });

      // Since we don't have a direct getter for metrics, this test verifies
      // that the method doesn't throw an error
      expect(true).toBe(true);
    });
  });
});