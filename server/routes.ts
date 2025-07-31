import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { zscalerLogParser } from "./services/log-parser";
import { anomalyDetector } from "./services/anomaly-detector";
import multer from "multer";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt', '.log'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .log files are allowed'));
    }
  },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  setupAuth(app);

  // File upload endpoint
  app.post("/api/upload", requireAuth, upload.single("logFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { originalname, filename, size, mimetype } = req.file;
      const userId = req.user!.id;

      // Create log file record
      const logFile = await storage.createLogFile({
        userId,
        filename,
        originalName: originalname,
        fileSize: size,
        mimeType: mimetype,
        status: "pending",
      });

      // Read and validate file content
      const filePath = path.join("uploads", filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      const validation = zscalerLogParser.validateLogFormat(content);
      if (!validation.isValid) {
        await storage.updateLogFileStatus(logFile.id, "failed", undefined, validation.error);
        await fs.unlink(filePath); // Clean up file
        return res.status(400).json({ message: validation.error });
      }

      // Parse logs
      const logEntries = zscalerLogParser.parseLogFile(content);
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

      // Start async processing
      processLogFileAsync(logFile.id, logEntries, userId);

      res.json({
        logFile,
        processingJob,
        totalEntries: logEntries.length,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

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

  // Get anomalies
  app.get("/api/anomalies", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { logFileId, limit } = req.query;
      
      let anomalies;
      if (logFileId) {
        anomalies = await storage.getAnomaliesByLogFile(logFileId as string);
      } else {
        anomalies = await storage.getAnomaliesByUser(userId, limit ? parseInt(limit as string) : undefined);
      }
      
      res.json(anomalies);
    } catch (error) {
      console.error("Anomalies error:", error);
      res.status(500).json({ message: "Failed to get anomalies" });
    }
  });

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

  const httpServer = createServer(app);
  return httpServer;
}

// Async processing function
async function processLogFileAsync(logFileId: string, logEntries: any[], userId: string) {
  try {
    await storage.updateLogFileStatus(logFileId, "processing");
    
    // Process logs in batches to avoid overwhelming the AI service
    const batchSize = 10;
    const anomalies = [];
    
    for (let i = 0; i < logEntries.length; i += batchSize) {
      const batch = logEntries.slice(i, i + batchSize);
      const results = await anomalyDetector.analyzeBatch(batch);
      
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
      
      // Update progress
      const progress = Math.min(100, Math.round(((i + batchSize) / logEntries.length) * 100));
      // Note: We're not updating job progress here since we don't have the job ID
      // In a production system, you'd want to pass the job ID to this function
    }
    
    await storage.updateLogFileStatus(logFileId, "completed");
    console.log(`Processing completed for file ${logFileId}. Found ${anomalies.length} anomalies.`);
    
  } catch (error) {
    console.error("Processing error:", error);
    await storage.updateLogFileStatus(logFileId, "failed", undefined, error instanceof Error ? error.message : "Unknown error");
  }
}
