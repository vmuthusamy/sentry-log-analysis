import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { db } from "./db";
import { processingJobs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { zscalerLogParser } from "./services/log-parser";
import { anomalyDetector, AnomalyDetector } from "./services/anomaly-detector";
import { metricsService } from "./services/metrics-service";
import { TraditionalAnomalyDetector } from "./services/traditional-anomaly-detector";
import { AdvancedMLDetector } from "./services/advanced-ml-detector";
import { uploadRateLimit, apiRateLimit, loginRateLimit, analysisRateLimit } from "./middleware/rate-limiter";
import { handleMulterErrors, globalErrorHandler, notFoundHandler, asyncHandler, ValidationError, FileSizeError, ProcessingError } from "./middleware/error-handler";
import { 
  validateInput, 
  webhookValidationSchema, 
  anomalyValidationSchema, 
  userApiKeyValidationSchema,
  fileUploadValidationSchema,
  sanitizeString 
} from "./middleware/input-validator";
import { userAnalytics } from "./services/user-analytics";
import { systemAnalytics } from "./services/system-analytics";
import { requireSystemAccess } from "./middleware/system-auth";
import { validateAnalyticsParams, validateFileUpload } from "./middleware/security-validator";
import { processingTimeoutManager } from "./services/processing-timeout-manager";
import multer from "multer";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const traditionalDetector = new TraditionalAnomalyDetector();
const advancedMLDetector = new AdvancedMLDetector();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for security and performance
    files: 1, // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.log'];
    const allowedMimeTypes = ['text/plain', 'application/octet-stream'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Only .txt and .log files are allowed'));
    }
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type detected'));
    }
    
    // Additional filename validation
    if (file.originalname.length > 255) {
      return cb(new Error('Filename too long'));
    }
    
    // Check for valid characters in filename (allow alphanumeric, dots, hyphens, underscores)
    const nameWithoutExt = file.originalname.replace(/\.(txt|log)$/i, '');
    if (!/^[a-zA-Z0-9._-]+$/.test(nameWithoutExt)) {
      return cb(new Error('Filename contains invalid characters. Only letters, numbers, dots, hyphens, and underscores are allowed.'));
    }
    
    cb(null, true);
  },
});

// Use consistent authentication middleware
const requireAuth = isAuthenticated;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);

  // Health check endpoints for GCP deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Track user activity
      await userAnalytics.trackUserActivity(userId, 'user_auth_check', {
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // System access check endpoint
  app.get('/api/auth/system-access', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hasSystemAccess = user.isSystemUser || 
                             user.role === 'system' || 
                             user.role === 'admin' ||
                             (user.permissions && user.permissions.includes('system_analytics'));

      res.json({
        hasAccess: hasSystemAccess,
        role: user.role,
        permissions: user.permissions || [],
        isSystemUser: user.isSystemUser || false
      });
    } catch (error) {
      console.error("Error checking system access:", error);
      res.status(500).json({ message: "Failed to check system access" });
    }
  });

  // Get user file count endpoint
  app.get('/api/user/file-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fileCount = await storage.getUserFileCount(userId);
      const maxFiles = 10;
      
      res.json({
        count: fileCount,
        limit: maxFiles,
        canUpload: fileCount < maxFiles,
        remaining: Math.max(0, maxFiles - fileCount)
      });
    } catch (error) {
      console.error("Error fetching user file count:", error);
      res.status(500).json({ message: "Failed to fetch file count" });
    }
  });

  // Trust proxy for rate limiting
  app.set('trust proxy', 1);
  
  // Global API rate limiting
  app.use('/api', apiRateLimit);
  
  // Error handling middleware
  app.use(handleMulterErrors);

  // Health check endpoint (no rate limiting)
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime()
    });
  });

  setupAuth(app);

  /**
   * @api {post} /api/upload Upload log file for analysis
   * @apiName UploadLogFile
   * @apiGroup Files
   * @apiDescription Upload a log file for security analysis. Supports Zscaler NSS feed format.
   * 
   * @apiHeader {String} Content-Type multipart/form-data
   * @apiHeader {String} Authorization Bearer token (handled by session)
   * 
   * @apiParam {File} logFile Log file to upload (required)
   * @apiParam {String} [analysisMethod=traditional] Analysis method: traditional, advanced, ai, skip-llm
   * 
   * @apiParamExample {multipart} Request-Example:
   *     Content-Type: multipart/form-data
   *     
   *     logFile: [binary file data]
   *     analysisMethod: traditional
   * 
   * @apiSuccess {Boolean} success Upload success status
   * @apiSuccess {String} message Success message
   * @apiSuccess {Object} file File information
   * @apiSuccess {String} file.id Unique file identifier
   * @apiSuccess {String} file.filename Original filename
   * @apiSuccess {Number} file.size File size in bytes
   * @apiSuccess {String} file.analysisMethod Selected analysis method
   * @apiSuccess {String} file.uploadedAt Upload timestamp
   * 
   * @apiSuccessExample {json} Success-Response:
   *     HTTP/1.1 200 OK
   *     {
   *       "success": true,
   *       "message": "File uploaded successfully and queued for analysis",
   *       "file": {
   *         "id": "abc123",
   *         "filename": "security.log",
   *         "size": 1048576,
   *         "analysisMethod": "traditional",
   *         "uploadedAt": "2024-01-01T10:00:00Z"
   *       }
   *     }
   * 
   * @apiError (400) InvalidFileType Only .txt and .log files are allowed
   * @apiError (400) FileTooLarge File size exceeds 10MB limit
   * @apiError (400) EmptyFile Empty files are not allowed
   * @apiError (400) InvalidFormat Log file format not recognized
   * @apiError (400) TooManyEntries File contains more than 100,000 log entries
   * @apiError (400) FileCountLimitReached User has reached maximum of 10 files
   * @apiError (413) PayloadTooLarge Request entity too large (>10MB)
   * @apiError (429) TooManyRequests Rate limit exceeded (10 uploads per 15 minutes)
   * 
   * @apiErrorExample {json} File-Too-Large:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "File size 15MB exceeds limit of 10MB"
   *     }
   * 
   * @apiErrorExample {json} Invalid-File-Type:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "Only .txt and .log files are allowed"
   *     }
   * 
   * @apiErrorExample {json} File-Count-Limit-Reached:
   *     HTTP/1.1 400 Bad Request
   *     {
   *       "message": "You have reached the maximum limit of 10 files. Please delete some files before uploading new ones."
   *     }
   * 
   * @apiNote File Size Limits:
   *   - Maximum file size: 10MB (10,485,760 bytes)
   *   - Maximum log entries: 100,000 entries per file
   *   - Supported formats: .txt, .log files only
   *   - Supported content: Zscaler NSS feed format
   * 
   * @apiNote User Limits:
   *   - Maximum files per user: 10 files total
   *   - Users must delete existing files before uploading new ones at limit
   * 
   * @apiNote Rate Limits:
   *   - 10 file uploads per 15 minutes per user
   *   - 3 concurrent file processing per user
   *   - General API: 100 requests per 15 minutes per user
   */
  // File upload endpoint with rate limiting
  app.post("/api/upload", requireAuth, uploadRateLimit, upload.single("logFile"), validateInput(z.object({})), asyncHandler(async (req: any, res: any) => {
    if (!req.file) {
      throw new ValidationError("No file uploaded");
    }

    const { originalname, filename, size, mimetype } = req.file;
    const userId = req.user.claims.sub;

    // Track file upload attempt
    await userAnalytics.trackUserActivity(userId, 'file_upload_attempt', {
      filename: originalname,
      fileSize: size,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Additional file size validation
    if (size === 0) {
      await fs.unlink(path.join("uploads", filename)); // Clean up empty file
      throw new ValidationError("Empty file is not allowed");
    }

    // Check file size against user limits (could be user-tier based)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (size > maxSizeBytes) {
      await fs.unlink(path.join("uploads", filename)); // Clean up oversized file
      throw new FileSizeError(
        `File size ${Math.round(size / (1024 * 1024))}MB exceeds limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`,
        size,
        maxSizeBytes
      );
    }

    // Check user file count limit (10 files per user)
    const userFileCount = await storage.getUserFileCount(userId);
    const maxFilesPerUser = 10;
    if (userFileCount >= maxFilesPerUser) {
      await fs.unlink(path.join("uploads", filename)); // Clean up file
      throw new ValidationError(
        `You have reached the maximum limit of ${maxFilesPerUser} files. Please delete some files before uploading new ones.`
      );
    }

    // Create log file record
    const logFile = await storage.createLogFile({
      userId,
      filename,
        originalName: originalname,
        fileSize: size,
        mimeType: mimetype,
        status: "pending",
      });

    // Read and validate file content with error handling
    const filePath = path.join("uploads", filename);
    let content: string;
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (readError) {
      await fs.unlink(filePath).catch(() => {}); // Clean up file, ignore errors
      throw new ProcessingError("Failed to read uploaded file", "file_read", readError as Error);
    }

    // Validate file content isn't suspiciously large when parsed
    if (content.length > 100 * 1024 * 1024) { // 100MB of text content
      await fs.unlink(filePath).catch(() => {});
      throw new ValidationError("File content too large to process safely");
    }
    
    const validation = zscalerLogParser.validateLogFormat(content);
    if (!validation.isValid) {
      await storage.updateLogFileStatus(logFile.id, "failed", undefined, validation.error);
      await fs.unlink(filePath).catch(() => {}); // Clean up file
      
      // Track failed file upload
      metricsService.trackFileUpload(userId, logFile.id, originalname, size, 'failure', validation.error);
      
      return res.status(400).json({ 
        message: validation.error || "Invalid log file format",
        details: {
          expectedFormat: "Zscaler NSS feed format (comma, semicolon, tab or pipe separated)",
          suggestion: "Please upload a valid Zscaler log file with proper field headers.",
          fileName: originalname
        }
      });
    }

    // Parse logs with timeout protection
    let logEntries: any[];
    try {
      logEntries = zscalerLogParser.parseLogFile(content);
      
      if (logEntries.length === 0) {
        await storage.updateLogFileStatus(logFile.id, "failed", 0, "No valid log entries found");
        await fs.unlink(filePath).catch(() => {});
        metricsService.trackFileUpload(userId, logFile.id, originalname, size, 'failure', "No valid log entries found");
        
        return res.status(400).json({ 
          message: "No valid log entries found in file",
          details: {
            expectedFormat: "Zscaler NSS feed format (comma, semicolon, tab or pipe separated)",
            suggestion: "Please check that your file contains valid Zscaler log entries with proper field headers.",
            fileName: originalname
          }
        });
      }
      
      if (logEntries.length > 100000) { // Limit to 100k entries for performance
        await storage.updateLogFileStatus(logFile.id, "failed", logEntries.length, "File contains too many log entries for processing");
        await fs.unlink(filePath).catch(() => {});
        metricsService.trackFileUpload(userId, logFile.id, originalname, size, 'failure', `File too large: ${logEntries.length} entries`);
        
        return res.status(413).json({ 
          message: `File contains ${logEntries.length} entries. Maximum allowed is 100,000 entries`,
          details: {
            currentEntries: logEntries.length,
            maxEntries: 100000,
            suggestion: "Please split your log file into smaller chunks or filter to fewer entries.",
            fileName: originalname
          }
        });
      }
      
    } catch (parseError) {
      await storage.updateLogFileStatus(logFile.id, "failed", 0, "Failed to parse log file");
      await fs.unlink(filePath).catch(() => {});
      metricsService.trackFileUpload(userId, logFile.id, originalname, size, 'failure', `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      
      return res.status(400).json({ 
        message: "Failed to parse log file",
        details: {
          error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          expectedFormat: "Zscaler NSS feed format (comma, semicolon, tab or pipe separated)",
          suggestion: "Please check that your file follows the correct Zscaler log format.",
          fileName: originalname
        }
      });
    }

    // File is initially ready for analysis, not automatically processing

    // Create processing job
    const processingJob = await storage.createProcessingJob({
      logFileId: logFile.id,
      userId,
      status: "queued",
      settings: {
        sensitivity: "high",
        threshold: 7.0,
      },
    });

    // Track successful file upload
    metricsService.trackFileUpload(userId, logFile.id, originalname, size, 'success');
    await userAnalytics.trackUserActivity(userId, 'file_upload_success', {
      logFileId: logFile.id,
      filename: originalname,
      fileSize: size,
      logEntriesCount: logEntries.length
    });

    // Update log file status to ready (no automatic GenAI processing)
    await storage.updateLogFileStatus(logFile.id, "ready", logEntries.length);

    res.json({
      logFile: {
        ...logFile,
        status: "ready"
      },
      processingJob,
      totalEntries: logEntries.length,
      message: "File uploaded successfully. You can now run Traditional ML, Advanced ML, or GenAI analysis.",
      availableAnalyses: {
        traditional: "Rule-based analysis (always available)",
        advanced: "Multi-model ML analysis (always available)", 
        genai: "AI-powered analysis (requires API key)"
      }
    });
  }));

  // Add alias for /api/logs/upload endpoint (matching frontend expectations)
  app.post("/api/logs/upload", isAuthenticated, uploadRateLimit, upload.single("logFile"), validateInput(z.object({})), asyncHandler(async (req: any, res: any) => {
    // This is an alias for the /api/upload endpoint to maintain compatibility
    if (!req.file) {
      throw new ValidationError("No file uploaded");
    }

    const { originalname, filename, size, mimetype } = req.file;
    const userId = req.user.claims.sub;

    // Track file upload attempt
    await userAnalytics.trackUserActivity(userId, 'file_upload_attempt', {
      filename: originalname,
      fileSize: size,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    // Additional file size validation
    if (size === 0) {
      await fs.unlink(path.join("uploads", filename)); // Clean up empty file
      throw new ValidationError("Empty file is not allowed");
    }

    // Check file size against user limits (could be user-tier based)
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    if (size > maxSizeBytes) {
      await fs.unlink(path.join("uploads", filename)); // Clean up oversized file
      throw new FileSizeError(
        `File size ${Math.round(size / (1024 * 1024))}MB exceeds limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`,
        size,
        maxSizeBytes
      );
    }

    // Check user file count limit (10 files per user)
    const userFileCount = await storage.getUserFileCount(userId);
    const maxFilesPerUser = 10;
    if (userFileCount >= maxFilesPerUser) {
      await fs.unlink(path.join("uploads", filename)); // Clean up file
      throw new ValidationError(
        `You have reached the maximum limit of ${maxFilesPerUser} files. Please delete some files before uploading new ones.`
      );
    }

    // Create log file record
    const logFile = await storage.createLogFile({
      userId,
      filename,
        originalName: originalname,
        fileSize: size,
        mimeType: mimetype,
        status: "pending",
      });

    // Read and validate file content with error handling
    const filePath = path.join("uploads", filename);
    let content: string;
    
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (readError) {
      await fs.unlink(filePath).catch(() => {}); // Clean up file, ignore errors
      throw new ProcessingError("Failed to read uploaded file", "file_read", readError as Error);
    }

    // Validate file content isn't suspiciously large when parsed
    if (content.length > 100 * 1024 * 1024) { // 100MB of text content
      await fs.unlink(filePath).catch(() => {});
      throw new ValidationError("File content too large after parsing (max 100MB text)");
    }

    // Parse and validate log content
    let logEntries: any[];
    try {
      logEntries = zscalerLogParser.parse(content);
      
      // Validate we have some log entries
      if (!logEntries || logEntries.length === 0) {
        await storage.updateLogFileStatus(logFile.id, "failed", 0, "No valid log entries found");
        await fs.unlink(filePath).catch(() => {});
        
        return res.status(400).json({ 
          message: "No valid log entries found in file",
          details: {
            entriesFound: 0,
            expectedFormat: "Zscaler NSS feed format (comma, semicolon, tab or pipe separated)",
            suggestion: "Please ensure your log file contains valid Zscaler log entries.",
            fileName: originalname
          }
        });
      }

      // Validate log entry count (prevent abuse)
      if (logEntries.length > 100000) {
        await storage.updateLogFileStatus(logFile.id, "failed", logEntries.length, "Too many log entries");
        await fs.unlink(filePath).catch(() => {});
        
        return res.status(400).json({ 
          message: "File contains too many log entries",
          details: {
            currentEntries: logEntries.length,
            maxEntries: 100000,
            suggestion: "Please split your log file into smaller chunks or filter to fewer entries.",
            fileName: originalname
          }
        });
      }
      
    } catch (parseError) {
      await storage.updateLogFileStatus(logFile.id, "failed", 0, "Failed to parse log file");
      await fs.unlink(filePath).catch(() => {});
      metricsService.trackFileUpload(userId, logFile.id, originalname, size, 'failure', `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      
      return res.status(400).json({ 
        message: "Failed to parse log file",
        details: {
          error: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
          expectedFormat: "Zscaler NSS feed format (comma, semicolon, tab or pipe separated)",
          suggestion: "Please check that your file follows the correct Zscaler log format.",
          fileName: originalname
        }
      });
    }

    // Create processing job
    const processingJob = await storage.createProcessingJob({
      logFileId: logFile.id,
      userId,
      status: "queued",
      settings: {
        sensitivity: "high",
        threshold: 7.0,
      },
    });

    // Track successful file upload
    metricsService.trackFileUpload(userId, logFile.id, originalname, size, 'success');
    await userAnalytics.trackUserActivity(userId, 'file_upload_success', {
      logFileId: logFile.id,
      filename: originalname,
      fileSize: size,
      logEntriesCount: logEntries.length
    });

    // Update log file status to ready (no automatic GenAI processing)
    await storage.updateLogFileStatus(logFile.id, "ready", logEntries.length);

    res.json({
      logFile: {
        ...logFile,
        status: "ready"
      },
      processingJob,
      totalEntries: logEntries.length,
      message: "File uploaded successfully. You can now run Traditional ML, Advanced ML, or GenAI analysis.",
      availableAnalyses: {
        traditional: "Rule-based analysis (always available)",
        advanced: "Multi-model ML analysis (always available)", 
        genai: "AI-powered analysis (requires API key)"
      }
    });
  }));

  // Get user stats
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`📊 Stats request for user: ${userId}`);
      
      const stats = await storage.getStats(userId);
      console.log(`📊 Stats for user ${userId}:`, stats);
      
      const recentAnomalies = await storage.getAnomaliesByUser(userId, 10);
      const highRiskAnomalies = await storage.getHighRiskAnomalies(userId, 7);
      
      const response = {
        ...stats,
        recentAnomalies,
        highRiskAnomalies,
        userId, // Add userId to response for debugging
      };
      
      res.json(response);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Get log files
  app.get("/api/log-files", requireAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const logFiles = await storage.getLogFilesByUser(userId);
      res.json(logFiles);
    } catch (error) {
      console.error("Log files error:", error);
      res.status(500).json({ message: "Failed to get log files" });
    }
  });

  // Get anomalies with rate limiting for AI analysis
  app.get("/api/anomalies", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const userId = req.user.claims.sub;
    const { logFileId, limit } = req.query;
    
    let anomalies;
    if (logFileId) {
      anomalies = await storage.getAnomaliesByLogFile(logFileId as string);
      
      // Track analysis view for specific file
      const logFile = await storage.getLogFile(logFileId as string);
      if (logFile) {
        metricsService.trackAnalysisView(userId, logFileId as string, logFile.originalName, anomalies.length);
      }
    } else {
      anomalies = await storage.getAnomaliesByUser(userId, limit ? parseInt(limit as string) : undefined);
      
      // Track general analysis view
      metricsService.trackAnalysisView(userId, 'all', 'dashboard', anomalies.length);
    }
    
    res.json(anomalies);
  }));

  // Get individual anomaly details
  app.get("/api/anomalies/:id", requireAuth, asyncHandler(async (req: any, res: any) => {
    const userId = req.user.claims.sub;
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string' || id.length < 10) {
      return res.status(400).json({ message: "Invalid anomaly ID format" });
    }
    
    const anomaly = await storage.getAnomalyById(id, userId);
    if (!anomaly) {
      return res.status(404).json({ message: "Anomaly not found" });
    }
    
    res.json(anomaly);
  }));

  // Update anomaly status and details
  app.patch("/api/anomalies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { status, analystNotes, priority, escalationReason, assignedTo, reviewedAt } = req.body;
      
      console.log('🔄 Updating anomaly:', id, 'by user:', userId);
      console.log('📝 Update data:', req.body);
      
      if (status && !['pending', 'under_review', 'confirmed', 'false_positive', 'dismissed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
        return res.status(400).json({ message: "Invalid priority" });
      }
      
      await storage.updateAnomalyDetails(id, userId, {
        status,
        analystNotes,
        priority,
        escalationReason,
        assignedTo,
        reviewedBy: userId,
        reviewedAt: reviewedAt ? new Date(reviewedAt) : new Date()
      });
      
      // Trigger webhooks for the updated anomaly
      try {
        const updatedAnomaly = await storage.getAnomalyById(id, userId);
        if (updatedAnomaly) {
          const { WebhookService } = await import('./services/webhook-service.js');
          const webhookService = new WebhookService();
          await webhookService.triggerWebhooksForAnomaly(updatedAnomaly, userId);
          console.log('✅ Webhooks triggered for updated anomaly:', id);
        } else {
          console.log('⚠️ Could not retrieve updated anomaly for webhook trigger');
        }
      } catch (webhookError) {
        console.error('❌ Error triggering webhooks:', webhookError);
        // Don't fail the main request if webhook fails
      }
      
      console.log('✅ Anomaly updated successfully:', id);
      res.json({ success: true });
    } catch (error) {
      console.error("Update anomaly error:", error);
      res.status(500).json({ message: "Failed to update anomaly", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Bulk update anomalies
  app.patch("/api/anomalies/bulk-update", requireAuth, validateInput(z.object({
    anomalyIds: z.array(z.string().uuid()).max(100),
    updates: anomalyValidationSchema
  })), async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { anomalyIds, updates } = req.body;
      
      if (!Array.isArray(anomalyIds) || anomalyIds.length === 0) {
        return res.status(400).json({ message: "Anomaly IDs array is required" });
      }
      
      if (updates.status && !['pending', 'under_review', 'confirmed', 'false_positive', 'dismissed'].includes(updates.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      await storage.bulkUpdateAnomalies(anomalyIds, userId, {
        ...updates,
        reviewedBy: userId,
        reviewedAt: new Date()
      });
      
      res.json({ 
        success: true, 
        message: `Updated ${anomalyIds.length} anomalies` 
      });
    } catch (error) {
      console.error("Bulk update error:", error);
      res.status(500).json({ message: "Failed to update anomalies" });
    }
  });

  // Get processing jobs
  app.get("/api/processing-jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getProcessingJobsByUser(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Processing jobs error:", error);
      res.status(500).json({ message: "Failed to get processing jobs" });
    }
  });

  // Get available AI providers and models
  app.get("/api/ai-providers", requireAuth, async (req, res) => {
    try {
      const { MultiProviderAIService } = await import("./services/ai-providers");
      const aiService = new MultiProviderAIService();
      
      const [models, availability] = await Promise.all([
        aiService.getAvailableModels(),
        aiService.checkProviderAvailability(),
      ]);

      res.json({
        models,
        availability,
        defaultConfig: {
          provider: "openai",
          tier: "standard", 
          temperature: 0.1,
        },
      });
    } catch (error) {
      console.error("Error getting AI providers:", error);
      res.status(500).json({ message: "Failed to get AI providers" });
    }
  });

  // User API Key Management Endpoints
  
  // Get user API key status
  app.get("/api/user-api-keys/status", requireAuth, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { userApiKeys } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const keys = await db.select().from(userApiKeys).where(eq(userApiKeys.userId, userId));
      
      const status = {
        openai: { configured: false, working: false },
        gemini: { configured: false, working: false },
      };
      
      keys.forEach(key => {
        if (key.provider === 'openai') {
          status.openai = {
            configured: true,
            working: key.testStatus === 'success'
          };
        } else if (key.provider === 'gemini') {
          status.gemini = {
            configured: true,
            working: key.testStatus === 'success'
          };
        }
      });
      
      res.json(status);
    } catch (error) {
      console.error("Error getting API key status:", error);
      res.status(500).json({ message: "Failed to get API key status" });
    }
  });

  // Save user API key
  app.post("/api/user-api-keys", requireAuth, validateInput(userApiKeyValidationSchema), async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { provider, apiKey } = req.body;
      
      if (!provider || !apiKey) {
        return res.status(400).json({ message: "Provider and API key are required" });
      }
      
      if (!['openai', 'gemini'].includes(provider)) {
        return res.status(400).json({ message: "Invalid provider" });
      }
      
      const { userApiKeys } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const crypto = await import("crypto");
      
      // Simple encryption for demo purposes (in production, use proper encryption)
      const encrypted = Buffer.from(apiKey).toString('base64');
      
      // Check if key already exists for this user and provider
      const existingKey = await db.select().from(userApiKeys).where(
        and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider))
      );
      
      if (existingKey.length > 0) {
        // Update existing key
        await db.update(userApiKeys)
          .set({ 
            encryptedApiKey: encrypted, 
            updatedAt: new Date(),
            testStatus: 'pending'
          })
          .where(eq(userApiKeys.id, existingKey[0].id));
      } else {
        // Create new key
        await db.insert(userApiKeys).values({
          userId,
          provider,
          encryptedApiKey: encrypted,
          testStatus: 'pending'
        });
      }
      
      res.json({ message: "API key saved successfully" });
    } catch (error) {
      console.error("Error saving API key:", error);
      res.status(500).json({ message: "Failed to save API key" });
    }
  });

  // Test user API key
  app.post("/api/user-api-keys/:provider/test", requireAuth, validateInput(z.object({})), async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { provider } = req.params;
      
      const { userApiKeys } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const keyRecord = await db.select().from(userApiKeys).where(
        and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider))
      );
      
      if (keyRecord.length === 0) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      // Decrypt API key (simple demo decryption)
      const apiKey = Buffer.from(keyRecord[0].encryptedApiKey, 'base64').toString();
      
      let testResult = { success: false, error: '' };
      
      try {
        if (provider === 'openai') {
          const OpenAI = (await import("openai")).default;
          const openai = new OpenAI({ apiKey });
          await openai.models.list();
          testResult = { success: true, error: '' };
        } else if (provider === 'gemini') {
          const { GoogleGenAI } = await import("@google/genai");
          const genai = new GoogleGenAI({ apiKey });
          await genai.models.list();
          testResult = { success: true, error: '' };
        }
      } catch (error: any) {
        testResult = { 
          success: false, 
          error: error.message || 'Connection test failed' 
        };
      }
      
      // Update test status
      await db.update(userApiKeys)
        .set({ 
          testStatus: testResult.success ? 'success' : 'failed',
          testError: testResult.error || null,
          lastTested: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userApiKeys.id, keyRecord[0].id));
      
      if (testResult.success) {
        res.json({ message: "API key test successful" });
      } else {
        res.status(400).json({ message: testResult.error });
      }
    } catch (error) {
      console.error("Error testing API key:", error);
      res.status(500).json({ message: "Failed to test API key" });
    }
  });

  // Advanced ML anomaly detection endpoint
  app.post("/api/analyze-advanced-ml/:id", requireAuth, analysisRateLimit, validateInput(z.object({})), asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user.claims.sub;
    const startTime = Date.now(); // Start timing analysis

    try {
      // Check processing limit - max 3 concurrent processing jobs per user
      const activeProcessingCount = await storage.getActiveProcessingJobsCount(userId);
      if (activeProcessingCount >= 3) {
        return res.status(429).json({ 
          message: "Processing limit reached. You can only process 3 files at the same time. Please wait for current analyses to complete.", 
          activeJobs: activeProcessingCount,
          limit: 3
        });
      }

      const logFile = await storage.getLogFile(logFileId);
      if (!logFile || logFile.userId !== userId) {
        return res.status(404).json({ message: "Log file not found" });
      }

      // Parse the log file
      const uploadsDir = path.join(process.cwd(), "uploads");
      const filePath = path.join(uploadsDir, logFile.filename);
      
      const content = await fs.readFile(filePath, "utf-8");
      const logEntries = zscalerLogParser.parseLogFile(content);

      // Run advanced ML detection
      const anomalies = advancedMLDetector.analyzeLogEntries(logEntries as any);
      const analysisTime = Date.now() - startTime; // Calculate analysis time

      // Convert to storage format with enhanced raw log data
      const anomalyInserts = anomalies.map((anomaly, index) => ({
        id: anomaly.id,
        logFileId: logFile.id,
        userId,
        timestamp: new Date(anomaly.logEntry.timestamp || Date.now()),
        anomalyType: anomaly.anomalyType,
        description: anomaly.description,
        riskScore: anomaly.riskScore.toString(),
        sourceData: anomaly.logEntry,
        aiAnalysis: {
          confidence: anomaly.confidence,
          recommendation: anomaly.recommendation,
          metadata: anomaly.metadata
        },
        detectionMethod: "advanced",
        rawLogEntry: (anomaly.logEntry as any).rawLog || JSON.stringify(anomaly.logEntry),
        logLineNumber: (anomaly as any).logLineNumber || index + 1,
      }));

      // Store anomalies
      for (const anomaly of anomalyInserts) {
        await storage.createAnomaly(anomaly);
      }

      // Create processing job record with analysis time
      const processingJob = await storage.createProcessingJob({
        logFileId: logFile.id,
        userId,
        status: "processing",
        progress: 0,
        analysisTimeMs: null,
        detectionMethod: "advanced_ml",
        anomaliesFound: null,
        logEntriesProcessed: null,
        settings: { method: "advanced_ml", models: ['statistical', 'behavioral', 'network', 'temporal', 'ensemble'] }
      });

      // Update processing job to completed with results
      await storage.updateProcessingJobStatus(processingJob.id, "completed");
      await db.update(processingJobs)
        .set({ 
          progress: 100,
          analysisTimeMs: analysisTime,
          anomaliesFound: anomalies.length,
          logEntriesProcessed: logEntries.length
        })
        .where(eq(processingJobs.id, processingJob.id));

      // Track success metrics
      await metricsService.track(userId, 'analysis_success', 'advanced_ml', {
        anomalies_found: anomalies.length,
        log_entries: logEntries.length,
        file_id: logFile.id,
        analysis_time_ms: analysisTime,
        models_used: ['statistical', 'behavioral', 'network', 'temporal', 'ensemble']
      });

      res.json({ 
        message: "Advanced ML analysis completed successfully",
        anomaliesFound: anomalies.length,
        logEntriesAnalyzed: logEntries.length,
        analysisTimeMs: analysisTime,
        analysisTimeSec: Math.round(analysisTime / 1000 * 100) / 100, // Rounded to 2 decimal places
        method: "Advanced ML (Multi-Model Ensemble)",
        modelsUsed: ['Statistical Analysis', 'Behavioral Profiling', 'Network Analysis', 'Time Series', 'Ensemble Learning'],
        anomalies: anomalies.slice(0, 15) // Return top 15 for preview
      });

    } catch (error) {
      console.error("Advanced ML analysis error:", error);
      const analysisTime = Date.now() - startTime;
      
      // Create failed processing job record
      await storage.createProcessingJob({
        logFileId,
        userId,
        status: "failed",
        progress: 0,
        analysisTimeMs: analysisTime,
        detectionMethod: "advanced_ml",
        anomaliesFound: 0,
        logEntriesProcessed: 0,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        settings: { method: "advanced_ml" }
      });
      
      // Track failure metrics
      await metricsService.track(userId, 'analysis_failure', 'advanced_ml', {
        error: error instanceof Error ? error.message : 'unknown',
        file_id: logFileId,
        analysis_time_ms: analysisTime
      });

      res.status(500).json({ 
        message: "Advanced ML analysis failed", 
        error: error instanceof Error ? error.message : "Unknown error",
        analysisTimeMs: analysisTime
      });
    }
  }));

  // Traditional anomaly detection (no LLM) endpoint
  app.post("/api/analyze-traditional/:id", requireAuth, analysisRateLimit, validateInput(z.object({})), asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user.claims.sub;
    const startTime = Date.now(); // Start timing analysis

    try {
      // Check processing limit - max 3 concurrent processing jobs per user
      const activeProcessingCount = await storage.getActiveProcessingJobsCount(userId);
      if (activeProcessingCount >= 3) {
        return res.status(429).json({ 
          message: "Processing limit reached. You can only process 3 files at the same time. Please wait for current analyses to complete.", 
          activeJobs: activeProcessingCount,
          limit: 3
        });
      }

      const logFile = await storage.getLogFile(logFileId);
      if (!logFile || logFile.userId !== userId) {
        return res.status(404).json({ message: "Log file not found" });
      }

      // Parse the log file
      const uploadsDir = path.join(process.cwd(), "uploads");
      const filePath = path.join(uploadsDir, logFile.filename);
      
      const content = await fs.readFile(filePath, "utf-8");
      const logEntries = zscalerLogParser.parseLogFile(content);

      // Run traditional anomaly detection
      const anomalies = traditionalDetector.analyzeLogEntries(logEntries as any);
      const analysisTime = Date.now() - startTime; // Calculate analysis time

      // Convert to storage format with enhanced raw log data
      const anomalyInserts = anomalies.map((anomaly, index) => ({
        id: anomaly.id,
        logFileId: logFile.id,
        userId,
        timestamp: new Date(anomaly.logEntry.timestamp || Date.now()),
        anomalyType: anomaly.anomalyType,
        description: anomaly.description,
        riskScore: anomaly.riskScore.toString(),
        sourceData: anomaly.logEntry,
        aiAnalysis: {
          confidence: anomaly.confidence,
          recommendation: anomaly.recommendation,
          metadata: anomaly.metadata
        },
        detectionMethod: "traditional",
        rawLogEntry: (anomaly.logEntry as any).rawLog || JSON.stringify(anomaly.logEntry),
        logLineNumber: (anomaly as any).logLineNumber || index + 1,
      }));

      // Store anomalies
      for (const anomaly of anomalyInserts) {
        await storage.createAnomaly(anomaly);
      }

      // Create processing job record with analysis time
      const processingJob = await storage.createProcessingJob({
        logFileId: logFile.id,
        userId,
        status: "processing",
        progress: 0,
        analysisTimeMs: null,
        detectionMethod: "traditional_ml",
        anomaliesFound: null,
        logEntriesProcessed: null,
        settings: { method: "traditional_ml", rules: "pattern_matching_statistical" }
      });

      // Update processing job to completed with results
      await storage.updateProcessingJobStatus(processingJob.id, "completed");
      await db.update(processingJobs)
        .set({ 
          progress: 100,
          analysisTimeMs: analysisTime,
          anomaliesFound: anomalies.length,
          logEntriesProcessed: logEntries.length
        })
        .where(eq(processingJobs.id, processingJob.id));

      // Track success metrics
      await metricsService.track(userId, 'analysis_success', 'traditional_ml', {
        anomalies_found: anomalies.length,
        log_entries: logEntries.length,
        file_id: logFile.id,
        analysis_time_ms: analysisTime
      });

      res.json({ 
        message: "Traditional analysis completed successfully",
        anomaliesFound: anomalies.length,
        logEntriesAnalyzed: logEntries.length,
        analysisTimeMs: analysisTime,
        analysisTimeSec: Math.round(analysisTime / 1000 * 100) / 100, // Rounded to 2 decimal places
        method: "Traditional ML (rule-based + statistical)",
        anomalies: anomalies.slice(0, 10) // Return top 10 for preview
      });

    } catch (error) {
      console.error("Traditional analysis error:", error);
      const analysisTime = Date.now() - startTime;
      
      // Create failed processing job record
      await storage.createProcessingJob({
        logFileId,
        userId,
        status: "failed",
        progress: 0,
        analysisTimeMs: analysisTime,
        detectionMethod: "traditional_ml",
        anomaliesFound: 0,
        logEntriesProcessed: 0,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        settings: { method: "traditional_ml" }
      });
      
      // Track failure metrics
      await metricsService.track(userId, 'analysis_failure', 'traditional_ml', {
        error: error instanceof Error ? error.message : 'unknown',
        file_id: logFileId,
        analysis_time_ms: analysisTime
      });

      res.status(500).json({ 
        message: "Traditional analysis failed", 
        error: error instanceof Error ? error.message : "Unknown error",
        analysisTimeMs: analysisTime
      });
    }
  }));

  // Process logs with custom AI configuration (heavy rate limiting) - REQUIRES API KEY
  app.post("/api/process-logs/:id", requireAuth, analysisRateLimit, validateInput(z.object({
    aiConfig: z.object({
      provider: z.enum(['openai', 'gemini']).optional(),
      model: z.string().max(100).optional(),
      tier: z.enum(['premium', 'standard', 'economy']).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(8000).optional()
    }).optional()
  })), asyncHandler(async (req: any, res: any) => {
    console.log('🔍 Process logs request:', {
      logFileId: req.params.id,
      userId: req.user.claims.sub,
      body: req.body,
      aiConfig: req.body.aiConfig
    });
    const logFileId = req.params.id;
    const userId = req.user.claims.sub;
    const aiConfig = req.body.aiConfig; // Optional AI configuration from frontend

    // FIRST: Check if user has configured API keys for GenAI analysis
    const { userApiKeys } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");
    
    const provider = aiConfig?.provider || 'openai';
    const keyRecord = await db.select().from(userApiKeys).where(
      and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider))
    );
    
    if (keyRecord.length === 0) {
      return res.status(400).json({ 
        message: `No ${provider.toUpperCase()} API key configured. Please add your API key in Settings before using GenAI analysis.`,
        requiresApiKey: true,
        provider,
        suggestion: "Go to Settings → API Configuration to add your API key"
      });
    }
    
    if (keyRecord[0].testStatus !== 'success') {
      return res.status(400).json({ 
        message: `${provider.toUpperCase()} API key is not working. Please check your API key in Settings.`,
        requiresValidApiKey: true,
        provider,
        keyStatus: keyRecord[0].testStatus,
        error: keyRecord[0].testError,
        suggestion: "Go to Settings → API Configuration to test and fix your API key"
      });
    }

    // Check processing limit - max 3 concurrent processing jobs per user
    const activeProcessingCount = await storage.getActiveProcessingJobsCount(userId);
    if (activeProcessingCount >= 3) {
      return res.status(429).json({ 
        message: "Processing limit reached. You can only process 3 files at the same time. Please wait for current analyses to complete.", 
        activeJobs: activeProcessingCount,
        limit: 3
      });
    }

    const logFile = await storage.getLogFile(logFileId);
    if (!logFile || logFile.userId !== userId) {
      return res.status(404).json({ message: "Log file not found" });
    }

    if (logFile.status === "processing") {
      return res.status(400).json({ message: "Log file is already being processed" });
    }

    // Update the processing job with custom AI config
    await storage.updateLogFileStatus(logFileId, "processing");

    // Parse the log file again and process with custom config
    const uploadsDir = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadsDir, logFile.filename);
    
    const content = await fs.readFile(filePath, "utf-8");
    const logEntries = zscalerLogParser.parseLogFile(content);

    // Decrypt and use user's API key for processing
    const decryptedApiKey = Buffer.from(keyRecord[0].encryptedApiKey, 'base64').toString();
    const configWithUserKey = {
      ...aiConfig,
      provider,
      apiKey: decryptedApiKey
    };

    // Process with user's API key
    processLogFileAsync(logFile.id, logEntries, userId, configWithUserKey);

    res.json({ 
      message: `GenAI analysis started with your ${provider.toUpperCase()} API key`, 
      logFileId,
      provider,
      aiConfig: { ...aiConfig, provider },
      note: "This analysis uses your personal API key and will be billed to your account"
    });
  }));

  // Enhanced analytics endpoints using the new Analytics Tracker
  app.get("/api/analytics/summary", isAuthenticated, async (req: any, res) => {
    try {
      const { hours, days, minutes } = req.query;
      const timeframe = {
        hours: hours ? parseInt(hours as string) : undefined,
        days: days ? parseInt(days as string) : undefined,
        minutes: minutes ? parseInt(minutes as string) : undefined
      };
      
      const { analyticsTracker } = await import("./services/analytics-tracker");
      const summary = await analyticsTracker.getActivitySummary(timeframe);
      
      res.json(summary);
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      res.status(500).json({ message: 'Failed to get analytics summary' });
    }
  });

  app.get("/api/analytics/cross-user", isAuthenticated, async (req: any, res) => {
    try {
      const { hours, days, minutes } = req.query;
      const timeframe = {
        hours: hours ? parseInt(hours as string) : undefined,
        days: days ? parseInt(days as string) : undefined,
        minutes: minutes ? parseInt(minutes as string) : undefined
      };
      
      const { analyticsTracker } = await import("./services/analytics-tracker");
      const crossUserAnalysis = await analyticsTracker.getCrossUserAnalysis(timeframe);
      
      res.json(crossUserAnalysis);
    } catch (error) {
      console.error('Error getting cross-user analysis:', error);
      res.status(500).json({ message: 'Failed to get cross-user analysis' });
    }
  });

  app.get("/api/analytics/detailed", isAuthenticated, async (req: any, res) => {
    try {
      const { hours, days, minutes, limit } = req.query;
      const timeframe = {
        hours: hours ? parseInt(hours as string) : undefined,
        days: days ? parseInt(days as string) : undefined,
        minutes: minutes ? parseInt(minutes as string) : undefined
      };
      const limitNum = limit ? parseInt(limit as string) : 50;
      
      const { analyticsTracker } = await import("./services/analytics-tracker");
      const detailedActivity = await analyticsTracker.getDetailedAnalysisActivity(timeframe, limitNum);
      
      res.json(detailedActivity);
    } catch (error) {
      console.error('Error getting detailed analysis activity:', error);
      res.status(500).json({ message: 'Failed to get detailed analysis activity' });
    }
  });

  app.get("/api/analytics/methods", isAuthenticated, async (req: any, res) => {
    try {
      const { hours, days, minutes } = req.query;
      const timeframe = {
        hours: hours ? parseInt(hours as string) : undefined,
        days: days ? parseInt(days as string) : undefined,
        minutes: minutes ? parseInt(minutes as string) : undefined
      };
      
      const { analyticsTracker } = await import("./services/analytics-tracker");
      const methodBreakdown = await analyticsTracker.getAnalysisByMethod(timeframe);
      
      res.json(methodBreakdown);
    } catch (error) {
      console.error('Error getting analysis by method:', error);
      res.status(500).json({ message: 'Failed to get analysis by method' });
    }
  });

  // Get metrics endpoint
  app.get("/api/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { timeRange } = req.query;
      
      const metrics = await metricsService.getMetricsSummary(
        userId, 
        timeRange as '1h' | '24h' | '7d' | '30d' || '24h'
      );
      
      res.json(metrics);
    } catch (error) {
      console.error("Metrics error:", error);
      res.status(500).json({ message: "Failed to get metrics" });
    }
  });

  // SYSTEM ANALYTICS ENDPOINTS - Complete visibility for system users
  app.get("/api/system/analytics/overview", requireAuth, requireSystemAccess, validateAnalyticsParams, asyncHandler(async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      
      const [userActivity, fileAnalytics, securityAnalytics, behaviorPatterns, systemHealth] = await Promise.all([
        systemAnalytics.getAllUserActivity(days),
        systemAnalytics.getFileUploadAnalytics(days),
        systemAnalytics.getSecurityAnalytics(days),
        systemAnalytics.getUserBehaviorPatterns(days),
        systemAnalytics.getSystemHealthMetrics()
      ]);
      
      res.json({
        userActivity,
        fileAnalytics,
        securityAnalytics,
        behaviorPatterns,
        systemHealth,
        generatedAt: new Date().toISOString(),
        periodDays: days
      });
    } catch (error) {
      console.error("System analytics error:", error);
      res.status(500).json({ message: "Failed to get system analytics" });
    }
  }));

  app.get("/api/system/analytics/users", requireAuth, requireSystemAccess, validateAnalyticsParams, asyncHandler(async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const userActivity = await systemAnalytics.getAllUserActivity(days);
      
      res.json({
        users: userActivity,
        summary: {
          totalUsers: userActivity.length,
          activeUsers: userActivity.filter(u => u.isActive).length,
          newUsers: userActivity.filter(u => u.daysSinceRegistration <= 7).length,
          heavyUsers: userActivity.filter(u => (u.totalUploads || 0) > 5).length,
          totalFilesSizeMB: userActivity.reduce((sum, u) => sum + (u.totalFileSizeMB || 0), 0)
        }
      });
    } catch (error) {
      console.error("User analytics error:", error);
      res.status(500).json({ message: "Failed to get user analytics" });
    }
  }));

  app.get("/api/system/analytics/uploads", requireAuth, requireSystemAccess, validateAnalyticsParams, asyncHandler(async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const fileAnalytics = await systemAnalytics.getFileUploadAnalytics(days);
      
      res.json(fileAnalytics);
    } catch (error) {
      console.error("File analytics error:", error);
      res.status(500).json({ message: "Failed to get file analytics" });
    }
  }));

  app.get("/api/system/analytics/security", requireAuth, requireSystemAccess, validateAnalyticsParams, asyncHandler(async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const securityAnalytics = await systemAnalytics.getSecurityAnalytics(days);
      
      res.json(securityAnalytics);
    } catch (error) {
      console.error("Security analytics error:", error);
      res.status(500).json({ message: "Failed to get security analytics" });
    }
  }));

  app.get("/api/system/analytics/activity-timeline", requireAuth, requireSystemAccess, validateAnalyticsParams, asyncHandler(async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const timeline = await systemAnalytics.getUserActivityTimeline(limit);
      
      res.json({
        activities: timeline,
        summary: {
          totalActivities: timeline.length,
          uniqueUsers: Array.from(new Set(timeline.map(a => a.userId))).length,
          totalFilesSizeMB: timeline.reduce((sum, a) => sum + (a.fileSizeMB || 0), 0),
          successfulUploads: timeline.filter(a => a.status === 'completed').length
        }
      });
    } catch (error) {
      console.error("Activity timeline error:", error);
      res.status(500).json({ message: "Failed to get activity timeline" });
    }
  }));

  app.get("/api/system/analytics/behavior", requireAuth, requireSystemAccess, validateAnalyticsParams, asyncHandler(async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const behaviorPatterns = await systemAnalytics.getUserBehaviorPatterns(days);
      
      res.json(behaviorPatterns);
    } catch (error) {
      console.error("Behavior analytics error:", error);
      res.status(500).json({ message: "Failed to get behavior analytics" });
    }
  }));

  app.get("/api/system/health", requireAuth, requireSystemAccess, asyncHandler(async (req: any, res: any) => {
    try {
      const healthMetrics = await systemAnalytics.getSystemHealthMetrics();
      const processingStats = await processingTimeoutManager.getProcessingStats();
      
      res.json({
        ...healthMetrics,
        processingTimeout: processingStats
      });
    } catch (error) {
      console.error("System health error:", error);
      res.status(500).json({ message: "Failed to get system health metrics" });
    }
  }));

  // Manual timeout cleanup endpoint for system users
  app.post("/api/system/cleanup-timeouts", requireAuth, requireSystemAccess, asyncHandler(async (req: any, res: any) => {
    try {
      await processingTimeoutManager.cleanupStuckJobs();
      res.json({ 
        message: "Timeout cleanup completed successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Manual cleanup error:", error);
      res.status(500).json({ message: "Failed to cleanup timeouts" });
    }
  }));

  // WEBHOOK INTEGRATION ENDPOINTS
  // Get user's webhook integrations
  app.get('/api/webhooks', isAuthenticated, validateInput(z.object({})), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const webhooks = await storage.getWebhookIntegrationsByUser(userId);
      res.json(webhooks);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      res.status(500).json({ message: 'Failed to fetch webhooks' });
    }
  });

  // Create new webhook integration
  app.post('/api/webhooks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Creating webhook for user:', userId);
      console.log('Request body:', req.body);
      
      const { insertWebhookIntegrationSchema } = await import('@shared/schema');
      
      // Validate request body
      const validatedData = insertWebhookIntegrationSchema.parse({
        ...req.body,
        userId
      });
      console.log('Validated webhook data:', validatedData);

      const webhook = await storage.createWebhookIntegration(validatedData);
      console.log('Created webhook:', webhook);
      res.status(201).json(webhook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Webhook validation error:', error.errors);
        return res.status(400).json({ message: 'Invalid webhook data', errors: error.errors });
      }
      console.error('Error creating webhook:', error);
      res.status(500).json({ message: 'Failed to create webhook', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Update webhook integration
  app.put('/api/webhooks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const webhookId = req.params.id;
      console.log('Updating webhook:', webhookId, 'for user:', userId);
      console.log('Update data:', req.body);
      
      // Check if webhook belongs to user
      const existingWebhook = await storage.getWebhookIntegration(webhookId);
      if (!existingWebhook || existingWebhook.userId !== userId) {
        console.log('Webhook not found or unauthorized:', existingWebhook);
        return res.status(404).json({ message: 'Webhook not found' });
      }

      const updatedWebhook = await storage.updateWebhookIntegration(webhookId, req.body);
      console.log('Updated webhook:', updatedWebhook);
      res.json(updatedWebhook);
    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({ message: 'Failed to update webhook', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Delete webhook integration
  app.delete('/api/webhooks/:id', isAuthenticated, validateInput(z.object({})), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const webhookId = req.params.id;
      
      // Check if webhook belongs to user
      const existingWebhook = await storage.getWebhookIntegration(webhookId);
      if (!existingWebhook || existingWebhook.userId !== userId) {
        return res.status(404).json({ message: 'Webhook not found' });
      }

      await storage.deleteWebhookIntegration(webhookId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      res.status(500).json({ message: 'Failed to delete webhook' });
    }
  });

  // Test webhook
  app.post('/api/webhooks/:id/test', isAuthenticated, validateInput(z.object({})), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const webhookId = req.params.id;
      const { webhookService } = await import('./services/webhook-service');
      
      const result = await webhookService.testWebhook(webhookId, userId);
      res.json(result);
    } catch (error) {
      console.error('Error testing webhook:', error);
      res.status(500).json({ message: 'Failed to test webhook' });
    }
  });

  // Health check endpoint for deployment
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      service: "sentry-log-analysis",
      version: "1.0.0"
    });
  });

  const httpServer = createServer(app);
  
  // Note: Global error handlers will be added after Vite setup in index.ts
  // to ensure they don't interfere with Vite's catch-all route
  
  return httpServer;
}

// Async processing function with AI configuration support
async function processLogFileAsync(logFileId: string, logEntries: any[], userId: string, aiConfig?: any) {
  const detector = aiConfig ? new AnomalyDetector(aiConfig) : anomalyDetector;
  const startTime = Date.now();
  
  try {
    await storage.updateLogFileStatus(logFileId, "processing");
    
    // Process logs in large batches for much faster performance
    const batchSize = 100; // Process 100 logs at once for speed
    const anomalies = [];
    
    for (let i = 0; i < logEntries.length; i += batchSize) {
      const batch = logEntries.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      try {
        const results = await detector.analyzeBatch(batch);
        const batchTime = Date.now() - batchStartTime;
        
        // Minimal delay between large batches
        if (i + batchSize < logEntries.length) {
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay only
        }
        
        // Track AI analysis success
        metricsService.trackAIAnalysis(
          userId, 
          aiConfig?.provider || 'openai', 
          batchTime, 
          'success',
          results.reduce((sum, r) => sum + r.riskScore, 0) / results.length
        );
        
        // Save anomalies to database
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const logEntry = batch[j];
          
          if (result.isAnomaly && result.riskScore >= 4) {
            const anomaly = await storage.createAnomaly({
              logFileId,
              userId,
              timestamp: new Date(logEntry.timestamp),
              anomalyType: result.anomalyType,
              description: result.description,
              riskScore: result.riskScore.toString(),
              sourceData: logEntry,
              aiAnalysis: result,
              detectionMethod: "ai",
              status: "pending",
              rawLogEntry: logEntry.rawLog || JSON.stringify(logEntry),
              logLineNumber: j + 1,
            });
            anomalies.push(anomaly);
          }
        }
      } catch (batchError) {
        // Track AI analysis failure
        // Enhanced error handling for AI provider issues
        const errorMessage = batchError instanceof Error ? batchError.message : String(batchError);
        let aiErrorType = "unknown";
        
        if (errorMessage.includes("AI_PROVIDER_ERROR:")) {
          // Extract structured error from anomaly detector
          const errorParts = errorMessage.split(":");
          if (errorParts.length >= 3) {
            aiErrorType = errorParts[1];
          }
        } else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
          aiErrorType = "rate_limited";
        } else if (errorMessage.includes("401") || errorMessage.includes("unauthorized") || errorMessage.includes("invalid api key")) {
          aiErrorType = "auth_failed";
        } else if (errorMessage.includes("403") || errorMessage.includes("billing") || errorMessage.includes("payment")) {
          aiErrorType = "billing_issue";
        } else if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
          aiErrorType = "network_issue";
        }
        
        metricsService.trackAIAnalysis(
          userId, 
          aiConfig?.provider || 'openai', 
          Date.now() - batchStartTime, 
          'failure',
          undefined,
          `${aiErrorType}:${errorMessage}`
        );
        console.error(`Batch processing error (batch ${Math.floor(i/batchSize) + 1}, type: ${aiErrorType}):`, batchError);
        
        // Continue processing even if one batch fails
        // This prevents the entire file from getting stuck due to API issues
      }
      
      // Update progress
      const progress = Math.min(100, Math.round(((i + batchSize) / logEntries.length) * 100));
    }
    
    const processingTime = Date.now() - startTime;
    
    // Track anomaly detection completion
    metricsService.trackAnomalyDetection(userId, logFileId, processingTime, aiConfig?.provider || 'openai', anomalies.length, 'success');
    
    await storage.updateLogFileStatus(logFileId, "completed");
    console.log(`Processing completed for file ${logFileId} with ${aiConfig?.provider || 'default'} AI. Found ${anomalies.length} anomalies.`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    metricsService.trackAnomalyDetection(userId, logFileId, Date.now() - startTime, aiConfig?.provider || 'openai', 0, 'failure', errorMessage);
    console.error("Processing error:", error);
    await storage.updateLogFileStatus(logFileId, "failed", undefined, errorMessage);
  }
}

// Reprocessing function for custom AI configurations
async function reprocessLogFileAsync(logFileId: string, logEntries: any[], userId: string, aiConfig?: any) {
  const detector = aiConfig ? new AnomalyDetector(aiConfig) : anomalyDetector;
  
  try {
    await storage.updateLogFileStatus(logFileId, "processing");
    
    // Clear existing anomalies for this log file (we'll skip this for now)
    // await storage.clearAnomaliesByLogFile(logFileId);
    
    // Process logs in batches with new AI configuration
    const batchSize = 10;
    const anomalies = [];
    
    for (let i = 0; i < logEntries.length; i += batchSize) {
      const batch = logEntries.slice(i, i + batchSize);
      const results = await detector.analyzeBatch(batch);
      
      // Save anomalies to database
      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const logEntry = batch[j];
        
        if (result.isAnomaly && result.riskScore >= 4) {
          const anomaly = await storage.createAnomaly({
            logFileId,
            userId,
            timestamp: new Date(logEntry.timestamp),
            anomalyType: result.anomalyType,
            description: result.description,
            riskScore: result.riskScore.toString(),
            sourceData: logEntry,
            aiAnalysis: {
              ...result,
              aiProvider: aiConfig?.provider || 'openai',
              modelTier: aiConfig?.tier || 'standard',
            },
            detectionMethod: "ai",
            status: "pending",
            rawLogEntry: logEntry.rawLog || JSON.stringify(logEntry),
            logLineNumber: j + 1,
          });
          anomalies.push(anomaly);
        }
      }
    }
    
    await storage.updateLogFileStatus(logFileId, "completed");
    console.log(`Reprocessing completed for file ${logFileId} with ${aiConfig?.provider || 'default'} AI (${aiConfig?.tier || 'standard'} tier). Found ${anomalies.length} anomalies.`);
    
  } catch (error) {
    console.error("Reprocessing error:", error);
    await storage.updateLogFileStatus(logFileId, "failed", undefined, error instanceof Error ? error.message : "Unknown error");
  }
}
