import { db } from "../db";
import { users, logFiles, anomalies, processingJobs } from "@shared/schema";
import { eq, gte, sql, desc, asc, and } from "drizzle-orm";

export interface UserActivityMetrics {
  userId: string;
  email: string;
  registrationDate: Date;
  daysSinceRegistration: number;
  totalUploads: number;
  totalAnomaliesFound: number;
  avgRiskScore: number;
  lastActivity: Date | null;
  isActive: boolean;
  activityLevel: 'new' | 'light' | 'moderate' | 'heavy';
  retentionStatus: 'new' | 'active' | 'at_risk' | 'churned';
}

export interface DailyMetrics {
  date: string;
  newUsers: number;
  activeUsers: number;
  uploads: number;
  anomaliesDetected: number;
  avgProcessingTime: number;
}

export class UserAnalyticsService {
  
  // Track new user registration
  async trackUserRegistration(userId: string, email: string, source?: string) {
    console.log(`📊 New user registration: ${email} (${userId})`);
    
    // Log registration event
    await this.logUserEvent(userId, 'user_registration', {
      email,
      source: source || 'direct',
      timestamp: new Date().toISOString()
    });
  }

  // Track user activity
  async trackUserActivity(userId: string, action: string, metadata?: any) {
    await this.logUserEvent(userId, action, {
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  // Log user events for analytics
  private async logUserEvent(userId: string, eventType: string, metadata: any) {
    try {
      // Create a simple events table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_events (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(sql`
        INSERT INTO user_events (user_id, event_type, metadata)
        VALUES (${userId}, ${eventType}, ${JSON.stringify(metadata)})
      `);
    } catch (error) {
      console.error('Failed to log user event:', error);
    }
  }

  // Get comprehensive user metrics
  async getUserMetrics(days: number = 30): Promise<UserActivityMetrics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all users with their activity
    const userStats = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.created_at as registration_date,
        EXTRACT(DAY FROM NOW() - u.created_at) as days_since_registration,
        COALESCE(lf.upload_count, 0) as total_uploads,
        COALESCE(a.anomaly_count, 0) as total_anomalies,
        COALESCE(a.avg_risk_score, 0) as avg_risk_score,
        GREATEST(lf.last_upload, a.last_anomaly) as last_activity
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as upload_count,
          MAX(uploaded_at) as last_upload
        FROM log_files 
        GROUP BY user_id
      ) lf ON u.id = lf.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as anomaly_count,
          AVG(risk_score) as avg_risk_score,
          MAX(created_at) as last_anomaly
        FROM anomalies 
        GROUP BY user_id
      ) a ON u.id = a.user_id
      ORDER BY u.created_at DESC
    `);

    return userStats.rows.map((row: any) => {
      const daysSinceRegistration = parseInt(row.days_since_registration) || 0;
      const totalUploads = parseInt(row.total_uploads) || 0;
      const lastActivity = row.last_activity ? new Date(row.last_activity) : null;
      const daysSinceActivity = lastActivity ? 
        Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      return {
        userId: row.id,
        email: row.email,
        registrationDate: new Date(row.registration_date),
        daysSinceRegistration,
        totalUploads,
        totalAnomaliesFound: parseInt(row.total_anomalies) || 0,
        avgRiskScore: parseFloat(row.avg_risk_score) || 0,
        lastActivity,
        isActive: daysSinceActivity <= 7,
        activityLevel: this.getActivityLevel(totalUploads, daysSinceRegistration),
        retentionStatus: this.getRetentionStatus(daysSinceRegistration, daysSinceActivity)
      };
    });
  }

  // Get daily metrics for dashboard
  async getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
    const metrics = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${days} days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date as date
      ),
      daily_users AS (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ),
      daily_uploads AS (
        SELECT 
          DATE(uploaded_at) as date,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as uploads
        FROM log_files
        WHERE uploaded_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(uploaded_at)
      ),
      daily_anomalies AS (
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as anomalies_detected
        FROM anomalies
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
      ),
      daily_processing AS (
        SELECT 
          DATE(started_at) as date,
          AVG(analysis_time_ms) as avg_processing_time
        FROM processing_jobs
        WHERE started_at >= CURRENT_DATE - INTERVAL '${days} days'
        AND analysis_time_ms IS NOT NULL
        GROUP BY DATE(started_at)
      )
      SELECT 
        d.date,
        COALESCE(du.new_users, 0) as new_users,
        COALESCE(dul.active_users, 0) as active_users,
        COALESCE(dul.uploads, 0) as uploads,
        COALESCE(da.anomalies_detected, 0) as anomalies_detected,
        COALESCE(dp.avg_processing_time, 0) as avg_processing_time
      FROM date_series d
      LEFT JOIN daily_users du ON d.date = du.date
      LEFT JOIN daily_uploads dul ON d.date = dul.date
      LEFT JOIN daily_anomalies da ON d.date = da.date
      LEFT JOIN daily_processing dp ON d.date = dp.date
      ORDER BY d.date
    `);

    return metrics.rows.map((row: any) => ({
      date: row.date,
      newUsers: parseInt(row.new_users) || 0,
      activeUsers: parseInt(row.active_users) || 0,
      uploads: parseInt(row.uploads) || 0,
      anomaliesDetected: parseInt(row.anomalies_detected) || 0,
      avgProcessingTime: parseFloat(row.avg_processing_time) || 0
    }));
  }

  // Get user cohort analysis
  async getCohortAnalysis() {
    const cohorts = await db.execute(sql`
      WITH user_cohorts AS (
        SELECT 
          u.id,
          u.email,
          DATE_TRUNC('week', u.created_at) as cohort_week,
          u.created_at as registration_date
        FROM users u
      ),
      cohort_activity AS (
        SELECT 
          uc.cohort_week,
          COUNT(DISTINCT uc.id) as cohort_size,
          COUNT(DISTINCT CASE 
            WHEN lf.uploaded_at >= uc.registration_date 
            AND lf.uploaded_at <= uc.registration_date + INTERVAL '7 days'
            THEN uc.id 
          END) as week_0_active,
          COUNT(DISTINCT CASE 
            WHEN lf.uploaded_at >= uc.registration_date + INTERVAL '7 days'
            AND lf.uploaded_at <= uc.registration_date + INTERVAL '14 days'
            THEN uc.id 
          END) as week_1_active,
          COUNT(DISTINCT CASE 
            WHEN lf.uploaded_at >= uc.registration_date + INTERVAL '14 days'
            AND lf.uploaded_at <= uc.registration_date + INTERVAL '21 days'
            THEN uc.id 
          END) as week_2_active,
          COUNT(DISTINCT CASE 
            WHEN lf.uploaded_at >= uc.registration_date + INTERVAL '21 days'
            AND lf.uploaded_at <= uc.registration_date + INTERVAL '28 days'
            THEN uc.id 
          END) as week_3_active
        FROM user_cohorts uc
        LEFT JOIN log_files lf ON uc.id = lf.user_id
        WHERE uc.cohort_week >= CURRENT_DATE - INTERVAL '8 weeks'
        GROUP BY uc.cohort_week
      )
      SELECT 
        cohort_week,
        cohort_size,
        week_0_active,
        week_1_active,
        week_2_active,
        week_3_active,
        CASE WHEN cohort_size > 0 THEN ROUND(100.0 * week_1_active / cohort_size, 2) ELSE 0 END as week_1_retention,
        CASE WHEN cohort_size > 0 THEN ROUND(100.0 * week_2_active / cohort_size, 2) ELSE 0 END as week_2_retention,
        CASE WHEN cohort_size > 0 THEN ROUND(100.0 * week_3_active / cohort_size, 2) ELSE 0 END as week_3_retention
      FROM cohort_activity
      ORDER BY cohort_week DESC
    `);

    return cohorts.rows;
  }

  // Get real-time access logs
  async getAccessLogs(limit: number = 100) {
    try {
      const logs = await db.execute(sql`
        SELECT 
          user_id,
          event_type,
          metadata,
          created_at
        FROM user_events
        ORDER BY created_at DESC
        LIMIT ${limit}
      `);

      return logs.rows.map((row: any) => ({
        userId: row.user_id,
        eventType: row.event_type,
        metadata: row.metadata,
        timestamp: row.created_at
      }));
    } catch (error) {
      console.error('Failed to get access logs:', error);
      return [];
    }
  }

  private getActivityLevel(uploads: number, daysSinceReg: number): 'new' | 'light' | 'moderate' | 'heavy' {
    if (daysSinceReg <= 7) return 'new';
    if (uploads === 0) return 'light';
    if (uploads <= 5) return 'light';
    if (uploads <= 20) return 'moderate';
    return 'heavy';
  }

  private getRetentionStatus(daysSinceReg: number, daysSinceActivity: number): 'new' | 'active' | 'at_risk' | 'churned' {
    if (daysSinceReg <= 7) return 'new';
    if (daysSinceActivity <= 7) return 'active';
    if (daysSinceActivity <= 30) return 'at_risk';
    return 'churned';
  }
}

export const userAnalytics = new UserAnalyticsService();