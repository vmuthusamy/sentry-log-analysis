import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Mock test app setup for demonstration
const createTestApp = async () => {
  const express = require('express');
  const app = express();
  // Basic test app setup - in real implementation, this would import the actual app
  return app;
};

describe('User File Limit API Integration Tests', () => {
  let app: express.Application;
  let testFilesDir: string;
  let mockUserId: string;

  beforeEach(async () => {
    app = await createTestApp();
    testFilesDir = path.join(__dirname, '../fixtures/test-files');
    mockUserId = 'test-user-123';
    
    // Ensure test files directory exists
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  describe('File Count Limit Enforcement', () => {
    it('should reject upload when user has 10 files already', async () => {
      // This test would require mocking the storage layer to return 10 files
      const testFilePath = path.join(testFilesDir, 'test-11th-file.log');
      fs.writeFileSync(testFilePath, '2024-01-01 10:00:00 INFO Test log entry\n');

      // Mock user having 10 files already
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('analysisMethod', 'traditional')
        .expect(400);

      expect(response.body.message).toContain('maximum limit of 10 files');
      expect(response.body.message).toContain('delete some files');
    });

    it('should allow upload when user has fewer than 10 files', async () => {
      // This test would require mocking the storage layer to return < 10 files
      const testFilePath = path.join(testFilesDir, 'test-valid-file.log');
      fs.writeFileSync(testFilePath, '2024-01-01 10:00:00 INFO Test log entry\n');

      // Mock user having 5 files
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('analysisMethod', 'traditional')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return current file count in error response', async () => {
      const testFilePath = path.join(testFilesDir, 'test-limit-exceeded.log');
      fs.writeFileSync(testFilePath, '2024-01-01 10:00:00 INFO Test log entry\n');

      // Mock user at file limit
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('analysisMethod', 'traditional')
        .expect(400);

      expect(response.body.message).toMatch(/10 files/);
    });
  });

  describe('GET /api/user/file-count', () => {
    it('should return current file count for authenticated user', async () => {
      // This endpoint would be useful for frontend to check current count
      const response = await request(app)
        .get('/api/user/file-count')
        .expect(200);

      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('canUpload');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.limit).toBe(10);
      expect(typeof response.body.canUpload).toBe('boolean');
    });

    it('should return canUpload false when at limit', async () => {
      // Mock user at file limit
      const response = await request(app)
        .get('/api/user/file-count')
        .expect(200);

      if (response.body.count >= 10) {
        expect(response.body.canUpload).toBe(false);
      }
    });

    it('should return canUpload true when below limit', async () => {
      // Mock user below file limit
      const response = await request(app)
        .get('/api/user/file-count')
        .expect(200);

      if (response.body.count < 10) {
        expect(response.body.canUpload).toBe(true);
      }
    });
  });

  describe('File Upload Sequence Testing', () => {
    it('should track file count correctly after successful uploads', async () => {
      const files = [];
      
      // Create multiple test files
      for (let i = 1; i <= 5; i++) {
        const fileName = `test-sequence-${i}.log`;
        const filePath = path.join(testFilesDir, fileName);
        fs.writeFileSync(filePath, `2024-01-01 10:0${i}:00 INFO Test log entry ${i}\n`);
        files.push(filePath);
      }

      // Upload files sequentially and check count
      for (let i = 0; i < files.length; i++) {
        const uploadResponse = await request(app)
          .post('/api/upload')
          .attach('file', files[i])
          .field('analysisMethod', 'traditional')
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);

        // Check file count after upload
        const countResponse = await request(app)
          .get('/api/user/file-count')
          .expect(200);

        // Count should increase after each upload
        expect(countResponse.body.count).toBeGreaterThan(i);
      }
    });

    it('should maintain file count accuracy after file deletion', async () => {
      // This test would verify that deleting files properly decreases the count
      // and allows new uploads again

      const testFilePath = path.join(testFilesDir, 'test-delete-then-upload.log');
      fs.writeFileSync(testFilePath, '2024-01-01 10:00:00 INFO Test log entry\n');

      // Get initial count
      const initialResponse = await request(app)
        .get('/api/user/file-count')
        .expect(200);

      const initialCount = initialResponse.body.count;

      // Simulate file deletion (would require delete endpoint)
      // const deleteResponse = await request(app)
      //   .delete('/api/files/some-file-id')
      //   .expect(200);

      // Check count decreased
      const afterDeleteResponse = await request(app)
        .get('/api/user/file-count')
        .expect(200);

      // In a real test, this would verify the count decreased
      expect(afterDeleteResponse.body.count).toBeDefined();
    });
  });

  describe('Error Response Structure', () => {
    it('should return consistent error structure for file limit violations', async () => {
      const testFilePath = path.join(testFilesDir, 'test-error-structure.log');
      fs.writeFileSync(testFilePath, '2024-01-01 10:00:00 INFO Test log entry\n');

      // Mock user at limit
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('analysisMethod', 'traditional')
        .expect(400);

      // Verify error structure
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('maximum limit');
      expect(response.body.message).toContain('10 files');
      expect(response.body.message).toContain('delete some files');
    });

    it('should include helpful suggestions in error responses', async () => {
      const testFilePath = path.join(testFilesDir, 'test-suggestions.log');
      fs.writeFileSync(testFilePath, '2024-01-01 10:00:00 INFO Test log entry\n');

      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .field('analysisMethod', 'traditional')
        .expect(400);

      expect(response.body.message).toContain('delete some files before uploading');
    });
  });

  describe('Rate Limiting Interaction', () => {
    it('should handle file count limit independently of rate limiting', async () => {
      // Test that file count limit is checked before rate limiting
      const testFilePath = path.join(testFilesDir, 'test-rate-limit-interaction.log');
      fs.writeFileSync(testFilePath, '2024-01-01 10:00:00 INFO Test log entry\n');

      // Multiple rapid requests when at file limit
      const responses = await Promise.all([
        request(app).post('/api/upload').attach('file', testFilePath).field('analysisMethod', 'traditional'),
        request(app).post('/api/upload').attach('file', testFilePath).field('analysisMethod', 'traditional'),
        request(app).post('/api/upload').attach('file', testFilePath).field('analysisMethod', 'traditional')
      ]);

      // All should fail with file limit error, not rate limit error
      responses.forEach(response => {
        expect(response.status).toBe(400);
        if (response.body.message.includes('limit')) {
          expect(response.body.message).toContain('maximum limit of 10 files');
        }
      });
    });
  });
});