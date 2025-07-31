import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
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

export function registerRoutes(app: Express): Server {
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
      
      throw new ValidationError(validation.error || "Invalid log format");
    }

    // Parse logs with timeout protection
    let logEntries: any[];
    try {
      logEntries = zscalerLogParser.parseLogFile(content);
      
      if (logEntries.length === 0) {
        await storage.updateLogFileStatus(logFile.id, "failed", 0, "No valid log entries found");
        await fs.unlink(filePath).catch(() => {});
        throw new ValidationError("No valid log entries found in file");
      }
      
      if (logEntries.length > 100000) { // Limit to 100k entries for performance
        await storage.updateLogFileStatus(logFile.id, "failed", logEntries.length, "File contains too many log entries for processing");
        await fs.unlink(filePath).catch(() => {});
        throw new ValidationError(`File contains ${logEntries.length} entries. Maximum allowed is 100,000 entries`);
      }
      
    } catch (parseError) {
      await storage.updateLogFileStatus(logFile.id, "failed", 0, "Failed to parse log file");
      await fs.unlink(filePath).catch(() => {});
      throw new ProcessingError("Failed to parse log file", "log_parsing", parseError as Error);
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
      const stats = await storage.getStats(userId);
      
      const recentAnomalies = await storage.getAnomaliesByUser(userId, 10);
      const highRiskAnomalies = await storage.getHighRiskAnomalies(userId, 7);
      
      res.json({
        ...stats,
        recentAnomalies,
        highRiskAnomalies,
      });
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

  // Advanced ML anomaly detection endpoint
  app.post("/api/analyze-advanced-ml/:id", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user!.id;

    try {
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
        detectionMethod: "Advanced ML",
      }));

      // Store anomalies
      for (const anomaly of anomalyInserts) {
        await storage.createAnomaly(anomaly);
      }

      // Track success metrics
      await metricsService.track(userId, 'analysis_success', 'advanced_ml', {
        anomalies_found: anomalies.length,
        log_entries: logEntries.length,
        file_id: logFile.id,
        models_used: ['statistical', 'behavioral', 'network', 'temporal', 'ensemble']
      });

      res.json({ 
        message: "Advanced ML analysis completed successfully",
        anomaliesFound: anomalies.length,
        logEntriesAnalyzed: logEntries.length,
        method: "Advanced ML (Multi-Model Ensemble)",
        modelsUsed: ['Statistical Analysis', 'Behavioral Profiling', 'Network Analysis', 'Time Series', 'Ensemble Learning'],
        anomalies: anomalies.slice(0, 15) // Return top 15 for preview
      });

    } catch (error) {
      console.error("Advanced ML analysis error:", error);
      
      // Track failure metrics
      await metricsService.track(userId, 'analysis_failure', 'advanced_ml', {
        error: error instanceof Error ? error.message : 'unknown',
        file_id: logFileId
      });

      res.status(500).json({ 
        message: "Advanced ML analysis failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }));

  // Traditional anomaly detection (no LLM) endpoint
  app.post("/api/analyze-traditional/:id", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user!.id;

    try {
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
        detectionMethod: "Traditional ML",
      }));

      // Store anomalies
      for (const anomaly of anomalyInserts) {
        await storage.createAnomaly(anomaly);
      }

      // Track success metrics
      await metricsService.track(userId, 'analysis_success', 'traditional_ml', {
        anomalies_found: anomalies.length,
        log_entries: logEntries.length,
        file_id: logFile.id
      });

      res.json({ 
        message: "Traditional analysis completed successfully",
        anomaliesFound: anomalies.length,
        logEntriesAnalyzed: logEntries.length,
        method: "Traditional ML (rule-based + statistical)",
        anomalies: anomalies.slice(0, 10) // Return top 10 for preview
      });

    } catch (error) {
      console.error("Traditional analysis error:", error);
      
      // Track failure metrics
      await metricsService.track(userId, 'analysis_failure', 'traditional_ml', {
        error: error instanceof Error ? error.message : 'unknown',
        file_id: logFileId
      });

      res.status(500).json({ 
        message: "Traditional analysis failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }));

  // Process logs with custom AI configuration (heavy rate limiting)
  app.post("/api/process-logs/:id", requireAuth, analysisRateLimit, asyncHandler(async (req: any, res: any) => {
    const logFileId = req.params.id;
    const userId = req.user!.id;
    const aiConfig = req.body.aiConfig; // Optional AI configuration from frontend

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
    const batchSize = 10;
    const anomalies = [];
    
    for (let i = 0; i < logEntries.length; i += batchSize) {
      const batch = logEntries.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      try {
        const results = await detector.analyzeBatch(batch);
        const batchTime = Date.now() - batchStartTime;
        
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
              status: "pending",
            });
            anomalies.push(anomaly);
          }
        }
      } catch (batchError) {
        // Track AI analysis failure
        metricsService.trackAIAnalysis(
          userId, 
          aiConfig?.provider || 'openai', 
          Date.now() - batchStartTime, 
          'failure',
          undefined,
          batchError instanceof Error ? batchError.message : String(batchError)
        );
        console.error(`Batch processing error:`, batchError);
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
