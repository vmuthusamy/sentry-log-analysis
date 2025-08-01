import { db } from "../db";
import { processingJobs, logFiles } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";

export class ProcessingTimeoutManager {
  private static readonly MAX_PROCESSING_TIME_MINUTES = 30; // 30 minutes max
  private static readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
  private static readonly MAX_FILE_SIZE_MB = 50; // Files larger than 50MB get shorter timeout
  private static readonly LARGE_FILE_TIMEOUT_MINUTES = 15; // Shorter timeout for large files

  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Start the timeout manager to automatically clean up stuck jobs
   */
  start(): void {
    if (this.cleanupTimer) {
      return; // Already running
    }

    console.log("Starting processing timeout manager...");
    
    // Run cleanup immediately
    this.cleanupStuckJobs().catch(console.error);
    
    // Schedule regular cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupStuckJobs().catch(console.error);
    }, ProcessingTimeoutManager.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the timeout manager
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log("Processing timeout manager stopped");
    }
  }

  /**
   * Clean up jobs that have been processing too long
   */
  async cleanupStuckJobs(): Promise<void> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - ProcessingTimeoutManager.MAX_PROCESSING_TIME_MINUTES);

      const largeCutoffTime = new Date();
      largeCutoffTime.setMinutes(largeCutoffTime.getMinutes() - ProcessingTimeoutManager.LARGE_FILE_TIMEOUT_MINUTES);

      // Find stuck processing jobs
      const stuckJobs = await db
        .select({
          jobId: processingJobs.id,
          logFileId: processingJobs.logFileId,
          filename: logFiles.filename,
          fileSize: logFiles.fileSize,
          startedAt: processingJobs.startedAt,
          userId: logFiles.userId,
        })
        .from(processingJobs)
        .innerJoin(logFiles, eq(processingJobs.logFileId, logFiles.id))
        .where(
          and(
            eq(processingJobs.status, 'processing'),
            sql`
              CASE 
                WHEN ${logFiles.fileSize} > ${ProcessingTimeoutManager.MAX_FILE_SIZE_MB * 1024 * 1024} 
                THEN ${processingJobs.startedAt} < ${largeCutoffTime}
                ELSE ${processingJobs.startedAt} < ${cutoffTime}
              END
            `
          )
        );

      if (stuckJobs.length === 0) {
        console.log("No stuck processing jobs found");
        return;
      }

      console.log(`Found ${stuckJobs.length} stuck processing jobs, cleaning up...`);

      for (const job of stuckJobs) {
        const timeoutMinutes = (job.fileSize || 0) > ProcessingTimeoutManager.MAX_FILE_SIZE_MB * 1024 * 1024 
          ? ProcessingTimeoutManager.LARGE_FILE_TIMEOUT_MINUTES 
          : ProcessingTimeoutManager.MAX_PROCESSING_TIME_MINUTES;

        const timeRunning = Math.floor((Date.now() - new Date(job.startedAt!).getTime()) / (1000 * 60));

        console.log(`Timing out job ${job.jobId} for file ${job.filename} (${timeRunning} minutes, limit: ${timeoutMinutes})`);

        // Update processing job status
        await db
          .update(processingJobs)
          .set({
            status: 'failed',
            completedAt: new Date(),
            errorMessage: `Processing timed out after ${timeRunning} minutes (limit: ${timeoutMinutes} minutes)`,
          })
          .where(eq(processingJobs.id, job.jobId));

        // Update log file status
        await db
          .update(logFiles)
          .set({
            status: 'failed',
            processedAt: new Date(),
          })
          .where(eq(logFiles.id, job.logFileId));
      }

      console.log(`Successfully cleaned up ${stuckJobs.length} stuck processing jobs`);
    } catch (error) {
      console.error("Error cleaning up stuck jobs:", error);
    }
  }

  /**
   * Check if a specific file should be timed out
   */
  async checkJobTimeout(jobId: number): Promise<boolean> {
    try {
      const job = await db
        .select({
          startedAt: processingJobs.startedAt,
          fileSize: logFiles.fileSize,
          filename: logFiles.filename,
        })
        .from(processingJobs)
        .innerJoin(logFiles, eq(processingJobs.logFileId, logFiles.id))
        .where(eq(processingJobs.id, jobId))
        .limit(1);

      if (job.length === 0) {
        return false;
      }

      const { startedAt, fileSize, filename } = job[0];
      const timeoutMinutes = (fileSize || 0) > ProcessingTimeoutManager.MAX_FILE_SIZE_MB * 1024 * 1024 
        ? ProcessingTimeoutManager.LARGE_FILE_TIMEOUT_MINUTES 
        : ProcessingTimeoutManager.MAX_PROCESSING_TIME_MINUTES;

      const timeRunning = Math.floor((Date.now() - new Date(startedAt!).getTime()) / (1000 * 60));

      if (timeRunning >= timeoutMinutes) {
        console.log(`Job ${jobId} for file ${filename} has exceeded timeout (${timeRunning}/${timeoutMinutes} minutes)`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error checking timeout for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats(): Promise<any> {
    try {
      const stats = await db
        .select({
          status: processingJobs.status,
          count: sql<number>`COUNT(*)`,
          avgTimeMs: sql<number>`AVG(${processingJobs.analysisTimeMs})`,
          maxTimeMs: sql<number>`MAX(${processingJobs.analysisTimeMs})`,
        })
        .from(processingJobs)
        .where(
          sql`${processingJobs.startedAt} > NOW() - INTERVAL '24 hours'`
        )
        .groupBy(processingJobs.status);

      const longRunning = await db
        .select({
          count: sql<number>`COUNT(*)`,
        })
        .from(processingJobs)
        .where(
          and(
            eq(processingJobs.status, 'processing'),
            sql`${processingJobs.startedAt} < NOW() - INTERVAL '10 minutes'`
          )
        );

      return {
        last24Hours: stats,
        longRunningJobs: longRunning[0]?.count || 0,
        maxTimeoutMinutes: ProcessingTimeoutManager.MAX_PROCESSING_TIME_MINUTES,
        largeFileTimeoutMinutes: ProcessingTimeoutManager.LARGE_FILE_TIMEOUT_MINUTES,
        cleanupIntervalMinutes: ProcessingTimeoutManager.CLEANUP_INTERVAL_MS / (1000 * 60),
      };
    } catch (error) {
      console.error("Error getting processing stats:", error);
      return null;
    }
  }
}

export const processingTimeoutManager = new ProcessingTimeoutManager();