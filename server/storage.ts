import { 
  users, 
  logFiles, 
  anomalies, 
  processingJobs, 
  webhookIntegrations,
  type User, 
  type InsertUser, 
  type UpsertUser, 
  type LogFile, 
  type InsertLogFile, 
  type Anomaly, 
  type InsertAnomaly, 
  type ProcessingJob, 
  type InsertProcessingJob,
  type WebhookIntegration,
  type InsertWebhookIntegration
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, count, inArray } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  createLogFile(logFile: InsertLogFile): Promise<LogFile>;
  getLogFile(id: string): Promise<LogFile | undefined>;
  getLogFilesByUser(userId: string): Promise<LogFile[]>;
  updateLogFileStatus(id: string, status: string, totalLogs?: number, errorMessage?: string): Promise<void>;
  
  createAnomaly(anomaly: InsertAnomaly): Promise<Anomaly>;
  getAnomaliesByLogFile(logFileId: string): Promise<Anomaly[]>;
  getAnomaliesByUser(userId: string, limit?: number): Promise<Anomaly[]>;
  getHighRiskAnomalies(userId: string, threshold: number): Promise<Anomaly[]>;
  updateAnomalyStatus(id: string, status: string): Promise<void>;
  
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: string): Promise<ProcessingJob | undefined>;
  getProcessingJobsByUser(userId: string): Promise<ProcessingJob[]>;
  getActiveProcessingJobsCount(userId: string): Promise<number>;
  updateProcessingJobProgress(id: string, progress: number): Promise<void>;
  updateProcessingJobStatus(id: string, status: string, errorMessage?: string): Promise<void>;
  
  getStats(userId: string): Promise<{
    totalLogs: number;
    anomaliesDetected: number;
    averageRiskScore: number;
  }>;

  // Webhook integration methods
  createWebhookIntegration(webhook: InsertWebhookIntegration): Promise<WebhookIntegration>;
  getWebhookIntegration(id: string): Promise<WebhookIntegration | undefined>;
  getWebhookIntegrationsByUser(userId: string): Promise<WebhookIntegration[]>;
  updateWebhookIntegration(id: string, updates: Partial<WebhookIntegration>): Promise<WebhookIntegration | undefined>;
  updateWebhookStats(id: string): Promise<void>;
  deleteWebhookIntegration(id: string): Promise<void>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Username field removed in OAuth schema
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }



  async createLogFile(logFile: InsertLogFile): Promise<LogFile> {
    const [file] = await db
      .insert(logFiles)
      .values(logFile)
      .returning();
    return file;
  }

  async getLogFile(id: string): Promise<LogFile | undefined> {
    const [file] = await db.select().from(logFiles).where(eq(logFiles.id, id));
    return file || undefined;
  }

  async getLogFilesByUser(userId: string): Promise<LogFile[]> {
    return await db
      .select()
      .from(logFiles)
      .where(eq(logFiles.userId, userId))
      .orderBy(desc(logFiles.uploadedAt));
  }

  async updateLogFileStatus(id: string, status: string, totalLogs?: number, errorMessage?: string): Promise<void> {
    const updateData: any = { status };
    if (totalLogs !== undefined) updateData.totalLogs = totalLogs;
    if (errorMessage !== undefined) updateData.errorMessage = errorMessage;
    if (status === "completed") updateData.processedAt = new Date();

    await db
      .update(logFiles)
      .set(updateData)
      .where(eq(logFiles.id, id));
  }

  async createAnomaly(anomaly: InsertAnomaly): Promise<Anomaly> {
    const [result] = await db
      .insert(anomalies)
      .values(anomaly)
      .returning();
    return result;
  }

  async getAnomaliesByLogFile(logFileId: string): Promise<Anomaly[]> {
    return await db
      .select()
      .from(anomalies)
      .where(eq(anomalies.logFileId, logFileId))
      .orderBy(desc(anomalies.createdAt));
  }

  async getAnomaliesByUser(userId: string, limit?: number): Promise<Anomaly[]> {
    const query = db
      .select()
      .from(anomalies)
      .where(eq(anomalies.userId, userId))
      .orderBy(desc(anomalies.createdAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getHighRiskAnomalies(userId: string, threshold: number): Promise<Anomaly[]> {
    return await db
      .select()
      .from(anomalies)
      .where(and(
        eq(anomalies.userId, userId),
        gte(anomalies.riskScore, threshold.toString())
      ))
      .orderBy(desc(anomalies.riskScore))
      .limit(10);
  }

  async updateAnomalyStatus(id: string, status: string): Promise<void> {
    await db
      .update(anomalies)
      .set({ 
        status,
        reviewedAt: status === "reviewed" ? new Date() : undefined
      })
      .where(eq(anomalies.id, id));
  }

  async createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob> {
    const [result] = await db
      .insert(processingJobs)
      .values(job)
      .returning();
    return result;
  }

  async getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
    const [job] = await db.select().from(processingJobs).where(eq(processingJobs.id, id));
    return job || undefined;
  }

  async getProcessingJobsByUser(userId: string): Promise<ProcessingJob[]> {
    return await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.userId, userId))
      .orderBy(desc(processingJobs.startedAt));
  }

  async getActiveProcessingJobsCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(processingJobs)
      .where(and(
        eq(processingJobs.userId, userId),
        eq(processingJobs.status, "processing")
      ));
    return result.count;
  }

  async updateProcessingJobProgress(id: string, progress: number): Promise<void> {
    await db
      .update(processingJobs)
      .set({ progress })
      .where(eq(processingJobs.id, id));
  }

  async updateProcessingJobStatus(id: string, status: string, errorMessage?: string): Promise<void> {
    const updateData: any = { status };
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (status === "processing") updateData.startedAt = new Date();
    if (status === "completed" || status === "failed") updateData.completedAt = new Date();

    await db
      .update(processingJobs)
      .set(updateData)
      .where(eq(processingJobs.id, id));
  }

  async getStats(userId: string): Promise<{
    totalLogs: number;
    anomaliesDetected: number;
    averageRiskScore: number;
  }> {
    const [logCount] = await db
      .select({ count: count() })
      .from(logFiles)
      .where(eq(logFiles.userId, userId));

    const [anomalyCount] = await db
      .select({ count: count() })
      .from(anomalies)
      .where(eq(anomalies.userId, userId));

    const userAnomalies = await db
      .select({ riskScore: anomalies.riskScore })
      .from(anomalies)
      .where(eq(anomalies.userId, userId));

    const averageRiskScore = userAnomalies.length > 0
      ? userAnomalies.reduce((sum, a) => sum + parseFloat(a.riskScore), 0) / userAnomalies.length
      : 0;

    return {
      totalLogs: logCount.count,
      anomaliesDetected: anomalyCount.count,
      averageRiskScore: Math.round(averageRiskScore * 10) / 10,
    };
  }

  // Update log file
  async updateLogFile(id: string, updates: Partial<LogFile>): Promise<void> {
    await db
      .update(logFiles)
      .set(updates)
      .where(eq(logFiles.id, id));
  }

  // Clear anomalies for a log file (for reprocessing)
  async clearAnomaliesByLogFile(logFileId: string): Promise<void> {
    await db
      .delete(anomalies)
      .where(eq(anomalies.logFileId, logFileId));
  }

  // Get individual anomaly by ID with user verification
  async getAnomalyById(id: string, userId: string): Promise<Anomaly | undefined> {
    const [anomaly] = await db
      .select()
      .from(anomalies)
      .where(and(eq(anomalies.id, id), eq(anomalies.userId, userId)));
    return anomaly || undefined;
  }

  // Update anomaly with enhanced details
  async updateAnomalyDetails(id: string, userId: string, updates: {
    status?: string;
    analystNotes?: string;
    priority?: string;
    escalationReason?: string;
    assignedTo?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
  }): Promise<void> {
    const updateData: any = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.analystNotes) updateData.analystNotes = updates.analystNotes;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.escalationReason) updateData.escalationReason = updates.escalationReason;
    if (updates.assignedTo) updateData.assignedTo = updates.assignedTo;
    if (updates.reviewedBy) updateData.reviewedBy = updates.reviewedBy;
    if (updates.reviewedAt) updateData.reviewedAt = updates.reviewedAt;

    await db
      .update(anomalies)
      .set(updateData)
      .where(and(eq(anomalies.id, id), eq(anomalies.userId, userId)));
  }

  // Bulk update anomalies
  async bulkUpdateAnomalies(anomalyIds: string[], userId: string, updates: {
    status?: string;
    analystNotes?: string;
    priority?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
  }): Promise<void> {
    const updateData: any = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.analystNotes) updateData.analystNotes = updates.analystNotes;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.reviewedBy) updateData.reviewedBy = updates.reviewedBy;
    if (updates.reviewedAt) updateData.reviewedAt = updates.reviewedAt;

    await db
      .update(anomalies)
      .set(updateData)
      .where(and(
        inArray(anomalies.id, anomalyIds),
        eq(anomalies.userId, userId)
      ));
  }

  // Webhook integration methods
  async createWebhookIntegration(webhook: InsertWebhookIntegration): Promise<WebhookIntegration> {
    const [newWebhook] = await db
      .insert(webhookIntegrations)
      .values(webhook)
      .returning();
    return newWebhook;
  }

  async getWebhookIntegration(id: string): Promise<WebhookIntegration | undefined> {
    const [webhook] = await db
      .select()
      .from(webhookIntegrations)
      .where(eq(webhookIntegrations.id, id));
    return webhook || undefined;
  }

  async getWebhookIntegrationsByUser(userId: string): Promise<WebhookIntegration[]> {
    return await db
      .select()
      .from(webhookIntegrations)
      .where(eq(webhookIntegrations.userId, userId))
      .orderBy(desc(webhookIntegrations.createdAt));
  }

  async updateWebhookIntegration(id: string, updates: Partial<WebhookIntegration>): Promise<WebhookIntegration | undefined> {
    const [webhook] = await db
      .update(webhookIntegrations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(webhookIntegrations.id, id))
      .returning();
    return webhook;
  }

  async updateWebhookStats(id: string): Promise<void> {
    await db
      .update(webhookIntegrations)
      .set({
        lastTriggered: new Date(),
        totalTriggers: 1, // Will be properly incremented
      })
      .where(eq(webhookIntegrations.id, id));
  }

  async deleteWebhookIntegration(id: string): Promise<void> {
    await db
      .delete(webhookIntegrations)
      .where(eq(webhookIntegrations.id, id));
  }
}

export const storage = new DatabaseStorage();
