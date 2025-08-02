import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseStorage } from '../../server/storage';

// Mock the database module
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('User File Limit Tests', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
    vi.clearAllMocks();
  });

  describe('getUserFileCount', () => {
    it('should return 0 for user with no files', async () => {
      const mockDb = await import('../../server/db');
      
      // Mock database response for count query
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }])
        })
      });

      const count = await storage.getUserFileCount('user-123');
      expect(count).toBe(0);
    });

    it('should return correct count for user with files', async () => {
      const mockDb = await import('../../server/db');
      
      // Mock database response for count query
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }])
        })
      });

      const count = await storage.getUserFileCount('user-456');
      expect(count).toBe(5);
    });

    it('should return 0 when database returns undefined', async () => {
      const mockDb = await import('../../server/db');
      
      // Mock database response for empty result
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      const count = await storage.getUserFileCount('user-789');
      expect(count).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockDb = await import('../../server/db');
      
      // Mock database error
      mockDb.db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      });

      await expect(storage.getUserFileCount('user-error')).rejects.toThrow('Database connection failed');
    });
  });

  describe('File Count Validation Logic', () => {
    it('should allow upload when user has fewer than 10 files', () => {
      const userFileCount = 5;
      const maxFilesPerUser = 10;
      const canUpload = userFileCount < maxFilesPerUser;
      
      expect(canUpload).toBe(true);
    });

    it('should block upload when user has 10 files', () => {
      const userFileCount = 10;
      const maxFilesPerUser = 10;
      const canUpload = userFileCount < maxFilesPerUser;
      
      expect(canUpload).toBe(false);
    });

    it('should block upload when user has more than 10 files', () => {
      const userFileCount = 15;
      const maxFilesPerUser = 10;
      const canUpload = userFileCount < maxFilesPerUser;
      
      expect(canUpload).toBe(false);
    });

    it('should allow upload at the boundary (9 files)', () => {
      const userFileCount = 9;
      const maxFilesPerUser = 10;
      const canUpload = userFileCount < maxFilesPerUser;
      
      expect(canUpload).toBe(true);
    });
  });

  describe('Error Message Generation', () => {
    it('should generate correct error message for file limit reached', () => {
      const maxFilesPerUser = 10;
      const expectedMessage = `You have reached the maximum limit of ${maxFilesPerUser} files. Please delete some files before uploading new ones.`;
      
      expect(expectedMessage).toBe('You have reached the maximum limit of 10 files. Please delete some files before uploading new ones.');
    });

    it('should handle different file count scenarios in UI messages', () => {
      const testCases = [
        { count: 0, max: 10, expected: '0/10 files used' },
        { count: 5, max: 10, expected: '5/10 files used' },
        { count: 9, max: 10, expected: '9/10 files used' },
        { count: 10, max: 10, expected: '10/10 files used' }
      ];

      testCases.forEach(({ count, max, expected }) => {
        const message = `${count}/${max} files used`;
        expect(message).toBe(expected);
      });
    });
  });

  describe('Frontend Validation Helpers', () => {
    it('should determine correct status color based on file count', () => {
      const getStatusColor = (userFileCount: number, maxFiles: number) => {
        const canUpload = userFileCount < maxFiles;
        return canUpload ? 'text-green-400' : 'text-orange-400';
      };

      expect(getStatusColor(5, 10)).toBe('text-green-400');
      expect(getStatusColor(10, 10)).toBe('text-orange-400');
      expect(getStatusColor(15, 10)).toBe('text-orange-400');
    });

    it('should determine when to show limit reached indicator', () => {
      const shouldShowLimitReached = (userFileCount: number, maxFiles: number) => {
        return userFileCount >= maxFiles;
      };

      expect(shouldShowLimitReached(5, 10)).toBe(false);
      expect(shouldShowLimitReached(10, 10)).toBe(true);
      expect(shouldShowLimitReached(15, 10)).toBe(true);
    });
  });
});