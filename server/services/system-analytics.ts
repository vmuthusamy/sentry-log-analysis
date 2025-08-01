import { db } from "../db";
import { users, logFiles, anomalies, userEvents, processingJobs } from "@shared/schema";
import { sql, eq, desc, and, gte, count, avg, sum } from "drizzle-orm";

export class SystemAnalytics {
  /**
   * Get comprehensive user activity for system administrators
   */
  async getAllUserActivity(days: number = 30): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        registeredAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        totalUploads: count(logFiles.id),
        totalAnomalies: count(anomalies.id),
        avgRiskScore: avg(anomalies.riskScore),
        recentActivity: sql<Date>`MAX(${logFiles.uploadedAt})`,
        fileSize: sum(logFiles.fileSize),
      })
      .from(users)
      .leftJoin(logFiles, eq(users.id, logFiles.userId))
      .leftJoin(anomalies, eq(users.id, anomalies.userId))
      .where(gte(users.createdAt, cutoffDate))
      .groupBy(users.id, users.email, users.firstName, users.lastName, users.role, users.createdAt, users.lastLoginAt)
      .orderBy(desc(sql`MAX(${logFiles.uploadedAt})`));

    return result.map(user => ({
      ...user,
      daysSinceRegistration: Math.floor((Date.now() - new Date(user.registeredAt!).getTime()) / (1000 * 60 * 60 * 24)),
      isActive: user.recentActivity && (Date.now() - new Date(user.recentActivity).getTime()) < (7 * 24 * 60 * 60 * 1000),
      totalFileSizeMB: Math.round((Number(user.fileSize) || 0) / (1024 * 1024) * 100) / 100,
      avgRiskScore: user.avgRiskScore ? Math.round(Number(user.avgRiskScore) * 10) / 10 : 0
    }));
  }

  /**
   * Get detailed file upload analytics
   */
  async getFileUploadAnalytics(days: number = 30): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const uploads = await db
      .select({
        date: sql<string>`DATE(${logFiles.uploadedAt})`,
        userEmail: users.email,
        fileName: logFiles.filename,
        fileSize: logFiles.fileSize,
        status: logFiles.status,
        anomaliesFound: count(anomalies.id),
        avgRiskScore: avg(anomalies.riskScore),
        processingTime: sql<number>`EXTRACT(EPOCH FROM (${logFiles.processedAt} - ${logFiles.uploadedAt}))`,
      })
      .from(logFiles)
      .leftJoin(users, eq(logFiles.userId, users.id))
      .leftJoin(anomalies, eq(logFiles.id, anomalies.logFileId))
      .where(gte(logFiles.uploadedAt, cutoffDate))
      .groupBy(
        sql`DATE(${logFiles.uploadedAt})`,
        users.email,
        logFiles.filename,
        logFiles.fileSize,
        logFiles.status,
        logFiles.uploadedAt,
        logFiles.processedAt
      )
      .orderBy(desc(logFiles.uploadedAt));

    const summary = await db
      .select({
        totalFiles: count(logFiles.id),
        totalSize: sum(logFiles.fileSize),
        avgProcessingTime: avg(sql<number>`EXTRACT(EPOCH FROM (${logFiles.processedAt} - ${logFiles.uploadedAt}))`),
        successRate: sql<number>`
          ROUND(
            COUNT(CASE WHEN ${logFiles.status} = 'completed' THEN 1 END) * 100.0 / COUNT(*), 
            2
          )
        `,
      })
      .from(logFiles)
      .where(gte(logFiles.uploadedAt, cutoffDate));

    return {
      uploads: uploads.map(upload => ({
        ...upload,
        fileSizeMB: Math.round((upload.fileSize || 0) / (1024 * 1024) * 100) / 100,
        processingTimeSeconds: upload.processingTime ? Math.round(upload.processingTime * 100) / 100 : null,
        avgRiskScore: upload.avgRiskScore ? Math.round(Number(upload.avgRiskScore) * 10) / 10 : 0
      })),
      summary: {
        ...summary[0],
        totalSizeMB: Math.round((Number(summary[0].totalSize) || 0) / (1024 * 1024) * 100) / 100,
        avgProcessingTimeSeconds: summary[0].avgProcessingTime ? Math.round(Number(summary[0].avgProcessingTime) * 100) / 100 : null
      }
    };
  }

  /**
   * Get security and anomaly analytics
   */
  async getSecurityAnalytics(days: number = 30): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const anomalyStats = await db
      .select({
        anomalyType: anomalies.anomalyType,
        detectionMethod: anomalies.detectionMethod,
        count: count(anomalies.id),
        avgRiskScore: avg(anomalies.riskScore),
        highRiskCount: sql<number>`COUNT(CASE WHEN ${anomalies.riskScore} >= 7.0 THEN 1 END)`,
      })
      .from(anomalies)
      .where(gte(anomalies.createdAt, cutoffDate))
      .groupBy(anomalies.anomalyType, anomalies.detectionMethod)
      .orderBy(desc(count(anomalies.id)));

    const riskDistribution = await db
      .select({
        riskRange: sql<string>`
          CASE 
            WHEN ${anomalies.riskScore} < 3.0 THEN 'Low (0-2.9)'
            WHEN ${anomalies.riskScore} < 5.0 THEN 'Medium (3.0-4.9)'
            WHEN ${anomalies.riskScore} < 7.0 THEN 'High (5.0-6.9)'
            ELSE 'Critical (7.0+)'
          END
        `,
        count: count(anomalies.id),
        percentage: sql<number>`
          ROUND(
            COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ${anomalies} WHERE ${anomalies.createdAt} >= ${cutoffDate}),
            1
          )
        `,
      })
      .from(anomalies)
      .where(gte(anomalies.createdAt, cutoffDate))
      .groupBy(sql`
        CASE 
          WHEN ${anomalies.riskScore} < 3.0 THEN 'Low (0-2.9)'
          WHEN ${anomalies.riskScore} < 5.0 THEN 'Medium (3.0-4.9)'
          WHEN ${anomalies.riskScore} < 7.0 THEN 'High (5.0-6.9)'
          ELSE 'Critical (7.0+)'
        END
      `);

    return {
      anomalyTypes: anomalyStats.map(stat => ({
        ...stat,
        avgRiskScore: stat.avgRiskScore ? Math.round(Number(stat.avgRiskScore) * 10) / 10 : 0
      })),
      riskDistribution
    };
  }

  /**
   * Get user behavior patterns
   */
  async getUserBehaviorPatterns(days: number = 30): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Daily activity patterns
    const dailyActivity = await db
      .select({
        date: sql<string>`DATE(${logFiles.uploadedAt})`,
        hour: sql<number>`EXTRACT(HOUR FROM ${logFiles.uploadedAt})`,
        uploads: count(logFiles.id),
        uniqueUsers: sql<number>`COUNT(DISTINCT ${logFiles.userId})`,
      })
      .from(logFiles)
      .where(gte(logFiles.uploadedAt, cutoffDate))
      .groupBy(sql`DATE(${logFiles.uploadedAt})`, sql`EXTRACT(HOUR FROM ${logFiles.uploadedAt})`)
      .orderBy(sql`DATE(${logFiles.uploadedAt})`, sql`EXTRACT(HOUR FROM ${logFiles.uploadedAt})`);

    // User retention analysis
    const retention = await db
      .select({
        registrationWeek: sql<string>`DATE_TRUNC('week', ${users.createdAt})`,
        cohortSize: count(users.id),
        week1Retention: sql<number>`
          COUNT(CASE WHEN EXISTS(
            SELECT 1 FROM ${logFiles} 
            WHERE ${logFiles.userId} = ${users.id} 
            AND ${logFiles.uploadedAt} BETWEEN ${users.createdAt} + INTERVAL '1 week' 
            AND ${users.createdAt} + INTERVAL '2 weeks'
          ) THEN 1 END) * 100.0 / COUNT(*)
        `,
        week2Retention: sql<number>`
          COUNT(CASE WHEN EXISTS(
            SELECT 1 FROM ${logFiles} 
            WHERE ${logFiles.userId} = ${users.id} 
            AND ${logFiles.uploadedAt} BETWEEN ${users.createdAt} + INTERVAL '2 weeks' 
            AND ${users.createdAt} + INTERVAL '3 weeks'
          ) THEN 1 END) * 100.0 / COUNT(*)
        `,
      })
      .from(users)
      .where(gte(users.createdAt, cutoffDate))
      .groupBy(sql`DATE_TRUNC('week', ${users.createdAt})`)
      .orderBy(sql`DATE_TRUNC('week', ${users.createdAt})`);

    return {
      dailyActivity,
      retention: retention.map(r => ({
        ...r,
        week1Retention: Math.round(Number(r.week1Retention) * 10) / 10,
        week2Retention: Math.round(Number(r.week2Retention) * 10) / 10,
      }))
    };
  }

  /**
   * Get comprehensive system health metrics
   */
  async getSystemHealthMetrics(): Promise<any> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const metrics = await Promise.all([
      // Processing job success rates
      db.select({
        status: processingJobs.status,
        count: count(processingJobs.id),
        avgProcessingTime: avg(processingJobs.analysisTimeMs),
      })
      .from(processingJobs)
      .where(gte(processingJobs.startedAt, last7Days))
      .groupBy(processingJobs.status),

      // Error rates
      db.select({
        errorCount: sql<number>`COUNT(CASE WHEN ${logFiles.status} = 'failed' THEN 1 END)`,
        totalCount: count(logFiles.id),
        errorRate: sql<number>`
          ROUND(
            COUNT(CASE WHEN ${logFiles.status} = 'failed' THEN 1 END) * 100.0 / COUNT(*),
            2
          )
        `,
      })
      .from(logFiles)
      .where(gte(logFiles.uploadedAt, last24Hours)),

      // Active users
      db.select({
        activeUsers24h: sql<number>`COUNT(DISTINCT ${logFiles.userId})`,
      })
      .from(logFiles)
      .where(gte(logFiles.uploadedAt, last24Hours)),

      db.select({
        activeUsers7d: sql<number>`COUNT(DISTINCT ${logFiles.userId})`,
      })
      .from(logFiles)
      .where(gte(logFiles.uploadedAt, last7Days)),
    ]);

    return {
      processingStats: metrics[0],
      errorStats: metrics[1][0],
      activeUsers: {
        last24Hours: metrics[2][0].activeUsers24h,
        last7Days: metrics[3][0].activeUsers7d,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get user activity timeline for system monitoring
   */
  async getUserActivityTimeline(limit: number = 100): Promise<any[]> {
    const activities = await db
      .select({
        timestamp: logFiles.uploadedAt,
        userEmail: users.email,
        userId: users.id,
        action: sql<string>`'file_upload'`,
        fileName: logFiles.filename,
        fileSize: logFiles.fileSize,
        status: logFiles.status,
        anomaliesFound: count(anomalies.id),
        processingTime: sql<number>`EXTRACT(EPOCH FROM (${logFiles.processedAt} - ${logFiles.uploadedAt}))`,
      })
      .from(logFiles)
      .leftJoin(users, eq(logFiles.userId, users.id))
      .leftJoin(anomalies, eq(logFiles.id, anomalies.logFileId))
      .groupBy(
        logFiles.uploadedAt,
        users.email,
        users.id,
        logFiles.filename,
        logFiles.fileSize,
        logFiles.status,
        logFiles.processedAt
      )
      .orderBy(desc(logFiles.uploadedAt))
      .limit(limit);

    return activities.map(activity => ({
      ...activity,
      fileSizeMB: Math.round((activity.fileSize || 0) / (1024 * 1024) * 100) / 100,
      processingTimeSeconds: activity.processingTime ? Math.round(activity.processingTime * 100) / 100 : null,
      timeAgo: this.getTimeAgo(new Date(activity.timestamp!))
    }));
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}

export const systemAnalytics = new SystemAnalytics();