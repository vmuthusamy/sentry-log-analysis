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
import multer from "multer";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const traditionalDetector = new TraditionalAnomalyDetector();
const advancedMLDetector = new AdvancedMLDetector();

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for security
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
    
    if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname.replace(/\.(txt|log)$/, ''))) {
      return cb(new Error('Filename contains invalid characters'));
    }
    
    cb(null, true);
  },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication first
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  // File upload endpoint with rate limiting
  app.post("/api/upload", requireAuth, uploadRateLimit, upload.single("logFile"), asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ValidationError("No file uploaded");
    }

    const { originalname, filename, size, mimetype } = req.file;
    const userId = req.user!.id;

    // Additional file size validation
    if (size === 0) {
      await fs.unlink(path.join("uploads", filename)); // Clean up empty file
      throw new ValidationError("Empty file is not allowed");
    }

    // Check file size against user limits (could be user-tier based)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (size > maxSizeBytes) {
      await fs.unlink(path.join("uploads", filename)); // Clean up oversized file
      throw new FileSizeError(
        `File size ${Math.round(size / (1024 * 1024))}MB exceeds limit of ${Math.round(maxSizeBytes / (1024 * 1024))}MB`,
        size,
        maxSizeBytes
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

    await storage.updateLogFileStatus(logFile.id, "processing", logEntries.length);

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

    // Start async processing
    processLogFileAsync(logFile.id, logEntries, userId);

    res.json({
      logFile,
      processingJob,
      totalEntries: logEntries.length,
      estimatedProcessingTime: Math.ceil(logEntries.length / 10) * 2, // rough estimate in seconds
    });
  }));

  // Get user stats
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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
      const userId = req.user!.id;
      const logFiles = await storage.getLogFilesByUser(userId);
      res.json(logFiles);
    } catch (error) {
      console.error("Log files error:", error);
      res.status(500).json({ message: "Failed to get log files" });
    }
  });

  // Get anomalies with rate limiting for AI analysis
  app.get("/api/anomalies", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const userId = req.user!.id;
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

  // Update anomaly status
  app.patch("/api/anomalies/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'reviewed', 'false_positive'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      await storage.updateAnomalyStatus(id, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Update anomaly error:", error);
      res.status(500).json({ message: "Failed to update anomaly" });
    }
  });

  // Get processing jobs
  app.get("/api/processing-jobs", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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
      const userId = req.user!.id;
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
            working: key.testStatus === 'success',
            error: key.testError || undefined
          };
        } else if (key.provider === 'gemini') {
          status.gemini = {
            configured: true,
            working: key.testStatus === 'success',
            error: key.testError || undefined
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
  app.post("/api/user-api-keys", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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
  app.post("/api/user-api-keys/:provider/test", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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
  app.post("/api/analyze-advanced-ml/:id", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user!.id;
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
      const anomalies = advancedMLDetector.analyzeLogEntries(logEntries);
      const analysisTime = Date.now() - startTime; // Calculate analysis time

      // Convert to storage format
      const anomalyInserts = anomalies.map(anomaly => ({
        id: anomaly.id,
        logFileId: logFile.id,
        userId,
        timestamp: new Date(anomaly.logEntry.timestamp),
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
  app.post("/api/analyze-traditional/:id", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user!.id;
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
      const anomalies = traditionalDetector.analyzeLogEntries(logEntries);
      const analysisTime = Date.now() - startTime; // Calculate analysis time

      // Convert to storage format
      const anomalyInserts = anomalies.map(anomaly => ({
        id: anomaly.id,
        logFileId: logFile.id,
        userId,
        timestamp: new Date(anomaly.logEntry.timestamp),
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

  // Process logs with custom AI configuration (heavy rate limiting)
  app.post("/api/process-logs/:id", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user!.id;
    const aiConfig = req.body.aiConfig; // Optional AI configuration from frontend

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

    // Process with custom AI configuration
    processLogFileAsync(logFile.id, logEntries, userId, aiConfig);

    res.json({ 
      message: "Reprocessing started with custom AI configuration", 
      logFileId,
      aiConfig: aiConfig || "default" 
    });
  }));

  // Get metrics endpoint
  app.get("/api/metrics", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
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
    
    // Process logs in batches to avoid overwhelming the AI service
    const batchSize = 5; // Reduced from 10 to 5 for better performance
    const anomalies = [];
    
    for (let i = 0; i < logEntries.length; i += batchSize) {
      const batch = logEntries.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      try {
        const results = await detector.analyzeBatch(batch);
        const batchTime = Date.now() - batchStartTime;
        
        // Add delay between batches to prevent overwhelming services
        if (i + batchSize < logEntries.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
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
