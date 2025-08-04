/**
 * Analytics Tracker Service
 * Provides comprehensive tracking of user activity, analysis results, and cross-user interactions
 * Fixes analytics gaps in multi-user analysis scenarios
 */

import { db } from "../db";
import { anomalies, logFiles, users, processingJobs, webhookIntegrations } from "@shared/schema";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface AnalyticsTimeframe {
  hours?: number;
  days?: number;
  minutes?: number;
}

export interface ActivitySummary {
  timeframe: string;
  totalActivity: number;
  fileUploads: number;
  analysisResults: number;
  uniqueAnalyzers: number;
  uniqueFileOwners: number;
  detectionMethods: string[];
  webhookTriggers: number;
  userLogins: number;
}

export interface CrossUserAnalysis {
  analyzerId: string;
  analyzerEmail: string;
  fileOwnerId: string;
  fileOwnerEmail: string;
  filename: string;
  detectionMethod: string;
  anomaliesCount: number;
  latestAnalysis: Date;
}

export interface DetailedAnalysisActivity {
  id: string;
  analyzerId: string;
  analyzerEmail: string;
  fileId: string;
  filename: string;
  fileOwnerId: string;
  fileOwnerEmail: string;
  detectionMethod: string;
  anomalyType: string;
  riskScore: string;
  createdAt: Date;
  hoursAgo: number;
  minutesAgo: number;
}

export class AnalyticsTracker {
  /**
   * Get comprehensive activity summary for any timeframe
   */
  async getActivitySummary(timeframe: AnalyticsTimeframe): Promise<ActivitySummary> {
    const cutoffTime = this.calculateCutoffTime(timeframe);
    const timeframeString = this.formatTimeframe(timeframe);

    // File uploads in timeframe
    const fileUploadsResult = await db
      .select({ count: count() })
      .from(logFiles)
      .where(gte(logFiles.uploadedAt, cutoffTime));

    // Analysis results in timeframe (all anomalies created)
    const analysisResultsQuery = await db
      .select({ 
        count: count(),
        uniqueAnalyzers: sql<number>`COUNT(DISTINCT ${anomalies.userId})`,
        detectionMethods: sql<string[]>`array_agg(DISTINCT ${anomalies.detectionMethod})`
      })
      .from(anomalies)
      .where(gte(anomalies.createdAt, cutoffTime));

    // Unique file owners who had files analyzed
    const uniqueFileOwnersQuery = await db
      .select({ 
        uniqueFileOwners: sql<number>`COUNT(DISTINCT ${logFiles.userId})`
      })
      .from(anomalies)
      .innerJoin(logFiles, eq(anomalies.logFileId, logFiles.id))
      .where(gte(anomalies.createdAt, cutoffTime));

    // Webhook triggers in timeframe
    const webhookTriggersResult = await db
      .select({ count: count() })
      .from(webhookIntegrations)
      .where(
        and(
          sql`${webhookIntegrations.lastTriggered} IS NOT NULL`,
          gte(webhookIntegrations.lastTriggered, cutoffTime)
        )
      );

    // User logins in timeframe
    const userLoginsResult = await db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          sql`${users.lastLoginAt} IS NOT NULL`,
          gte(users.lastLoginAt, cutoffTime)
        )
      );

    const fileUploads = fileUploadsResult[0]?.count || 0;
    const analysisData = analysisResultsQuery[0];
    const analysisResults = analysisData?.count || 0;
    const uniqueAnalyzers = analysisData?.uniqueAnalyzers || 0;
    const detectionMethods = analysisData?.detectionMethods?.filter(m => m !== null) || [];
    const uniqueFileOwners = uniqueFileOwnersQuery[0]?.uniqueFileOwners || 0;
    const webhookTriggers = webhookTriggersResult[0]?.count || 0;
    const userLogins = userLoginsResult[0]?.count || 0;

    const totalActivity = fileUploads + analysisResults + webhookTriggers + userLogins;

    return {
      timeframe: timeframeString,
      totalActivity,
      fileUploads,
      analysisResults,
      uniqueAnalyzers,
      uniqueFileOwners,
      detectionMethods,
      webhookTriggers,
      userLogins
    };
  }

  /**
   * Get cross-user analysis scenarios
   */
  async getCrossUserAnalysis(timeframe: AnalyticsTimeframe): Promise<CrossUserAnalysis[]> {
    const cutoffTime = this.calculateCutoffTime(timeframe);
    const analyzer = alias(users, 'analyzer');
    const fileOwner = alias(users, 'file_owner');

    const crossUserData = await db
      .select({
        analyzerId: anomalies.userId,
        analyzerEmail: analyzer.email,
        fileOwnerId: logFiles.userId,
        fileOwnerEmail: fileOwner.email,
        filename: logFiles.filename,
        detectionMethod: anomalies.detectionMethod,
        anomaliesCount: count(),
        latestAnalysis: sql<Date>`MAX(${anomalies.createdAt})`
      })
      .from(anomalies)
      .innerJoin(logFiles, eq(anomalies.logFileId, logFiles.id))
      .innerJoin(analyzer, eq(anomalies.userId, analyzer.id))
      .innerJoin(fileOwner, eq(logFiles.userId, fileOwner.id))
      .where(
        and(
          gte(anomalies.createdAt, cutoffTime),
          sql`${anomalies.userId} != ${logFiles.userId}` // Cross-user only
        )
      )
      .groupBy(
        anomalies.userId,
        analyzer.email,
        logFiles.userId,
        fileOwner.email,
        logFiles.filename,
        anomalies.detectionMethod
      )
      .orderBy(desc(sql`MAX(${anomalies.createdAt})`));

    return crossUserData.map(row => ({
      analyzerId: row.analyzerId,
      analyzerEmail: row.analyzerEmail,
      fileOwnerId: row.fileOwnerId,
      fileOwnerEmail: row.fileOwnerEmail,
      filename: row.filename,
      detectionMethod: row.detectionMethod,
      anomaliesCount: row.anomaliesCount,
      latestAnalysis: row.latestAnalysis
    }));
  }

  /**
   * Get detailed analysis activity with full context
   */
  async getDetailedAnalysisActivity(timeframe: AnalyticsTimeframe, limit: number = 50): Promise<DetailedAnalysisActivity[]> {
    const cutoffTime = this.calculateCutoffTime(timeframe);
    const analyzer = alias(users, 'analyzer');
    const fileOwner = alias(users, 'file_owner');

    const analysisActivity = await db
      .select({
        id: anomalies.id,
        analyzerId: anomalies.userId,
        analyzerEmail: analyzer.email,
        fileId: anomalies.logFileId,
        filename: logFiles.filename,
        fileOwnerId: logFiles.userId,
        fileOwnerEmail: fileOwner.email,
        detectionMethod: anomalies.detectionMethod,
        anomalyType: anomalies.anomalyType,
        riskScore: anomalies.riskScore,
        createdAt: anomalies.createdAt,
        hoursAgo: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${anomalies.createdAt}))/3600`,
        minutesAgo: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${anomalies.createdAt}))/60`
      })
      .from(anomalies)
      .innerJoin(logFiles, eq(anomalies.logFileId, logFiles.id))
      .innerJoin(analyzer, eq(anomalies.userId, analyzer.id))
      .innerJoin(fileOwner, eq(logFiles.userId, fileOwner.id))
      .where(gte(anomalies.createdAt, cutoffTime))
      .orderBy(desc(anomalies.createdAt))
      .limit(limit);

    return analysisActivity.map(row => ({
      id: row.id,
      analyzerId: row.analyzerId,
      analyzerEmail: row.analyzerEmail,
      fileId: row.fileId,
      filename: row.filename,
      fileOwnerId: row.fileOwnerId,
      fileOwnerEmail: row.fileOwnerEmail,
      detectionMethod: row.detectionMethod,
      anomalyType: row.anomalyType,
      riskScore: row.riskScore,
      createdAt: row.createdAt,
      hoursAgo: row.hoursAgo,
      minutesAgo: row.minutesAgo
    }));
  }

  /**
   * Get analysis activity by detection method breakdown
   */
  async getAnalysisByMethod(timeframe: AnalyticsTimeframe): Promise<Array<{
    detectionMethod: string;
    anomaliesCount: number;
    uniqueAnalyzers: number;
    uniqueFiles: number;
    latestActivity: Date | null;
  }>> {
    const cutoffTime = this.calculateCutoffTime(timeframe);

    const methodBreakdown = await db
      .select({
        detectionMethod: anomalies.detectionMethod,
        anomaliesCount: count(),
        uniqueAnalyzers: sql<number>`COUNT(DISTINCT ${anomalies.userId})`,
        uniqueFiles: sql<number>`COUNT(DISTINCT ${anomalies.logFileId})`,
        latestActivity: sql<Date | null>`MAX(${anomalies.createdAt})`
      })
      .from(anomalies)
      .where(gte(anomalies.createdAt, cutoffTime))
      .groupBy(anomalies.detectionMethod)
      .orderBy(desc(count()));

    return methodBreakdown.map(row => ({
      detectionMethod: row.detectionMethod,
      anomaliesCount: row.anomaliesCount,
      uniqueAnalyzers: row.uniqueAnalyzers,
      uniqueFiles: row.uniqueFiles,
      latestActivity: row.latestActivity
    }));
  }

  /**
   * Helper: Calculate cutoff time for queries
   */
  private calculateCutoffTime(timeframe: AnalyticsTimeframe): Date {
    const now = new Date();
    const cutoff = new Date(now);

    if (timeframe.minutes) {
      cutoff.setMinutes(cutoff.getMinutes() - timeframe.minutes);
    } else if (timeframe.hours) {
      cutoff.setHours(cutoff.getHours() - timeframe.hours);
    } else if (timeframe.days) {
      cutoff.setDate(cutoff.getDate() - timeframe.days);
    } else {
      // Default to 24 hours
      cutoff.setHours(cutoff.getHours() - 24);
    }

    return cutoff;
  }

  /**
   * Helper: Format timeframe for display
   */
  private formatTimeframe(timeframe: AnalyticsTimeframe): string {
    if (timeframe.minutes) {
      return `last ${timeframe.minutes} minutes`;
    } else if (timeframe.hours) {
      return `last ${timeframe.hours} hours`;
    } else if (timeframe.days) {
      return `last ${timeframe.days} days`;
    } else {
      return "last 24 hours";
    }
  }
}

export const analyticsTracker = new AnalyticsTracker();