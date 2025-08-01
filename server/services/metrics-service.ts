import { db } from "../db";
import { sql } from "drizzle-orm";
import { metricsEvents } from "@shared/schema";

export interface MetricEvent {
  userId: string;
  eventType: 'file_upload' | 'file_analysis_view' | 'anomaly_detection' | 'ai_analysis';
  status: 'success' | 'failure' | 'error';
  metadata: {
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    processingTime?: number;
    aiProvider?: string;
    errorMessage?: string;
    anomaliesFound?: number;
    riskScore?: number;
  };
  timestamp: Date;
}

export class MetricsService {
  private static instance: MetricsService;
  private metricsBuffer: MetricEvent[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor() {
    // Flush metrics every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000);
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  // Track file upload events
  trackFileUpload(userId: string, fileId: string, fileName: string, fileSize: number, status: 'success' | 'failure', errorMessage?: string) {
    const metric: MetricEvent = {
      userId,
      eventType: 'file_upload',
      status,
      metadata: {
        fileId,
        fileName,
        fileSize,
        errorMessage
      },
      timestamp: new Date()
    };
    
    this.metricsBuffer.push(metric);
    console.log(`📊 Tracked file upload: ${fileName} (${status})`);
  }

  // Track file analysis viewing
  trackAnalysisView(userId: string, fileId: string, fileName: string, anomaliesFound: number) {
    const metric: MetricEvent = {
      userId,
      eventType: 'file_analysis_view',
      status: 'success',
      metadata: {
        fileId,
        fileName,
        anomaliesFound
      },
      timestamp: new Date()
    };
    
    this.metricsBuffer.push(metric);
    console.log(`📊 Tracked analysis view: ${fileName} (${anomaliesFound} anomalies)`);
  }

  // Track anomaly detection events
  trackAnomalyDetection(userId: string, fileId: string, processingTime: number, aiProvider: string, anomaliesFound: number, status: 'success' | 'failure', errorMessage?: string) {
    const metric: MetricEvent = {
      userId,
      eventType: 'anomaly_detection',
      status,
      metadata: {
        fileId,
        processingTime,
        aiProvider,
        anomaliesFound,
        errorMessage
      },
      timestamp: new Date()
    };
    
    this.metricsBuffer.push(metric);
    console.log(`📊 Tracked anomaly detection: ${aiProvider} found ${anomaliesFound} anomalies (${status})`);
  }

  // Track AI analysis performance
  trackAIAnalysis(userId: string, aiProvider: string, processingTime: number, status: 'success' | 'failure', riskScore?: number, errorMessage?: string) {
    const metric: MetricEvent = {
      userId,
      eventType: 'ai_analysis',
      status,
      metadata: {
        aiProvider,
        processingTime,
        riskScore,
        errorMessage
      },
      timestamp: new Date()
    };
    
    this.metricsBuffer.push(metric);
    console.log(`📊 Tracked AI analysis: ${aiProvider} (${status}) - ${processingTime}ms`);
  }

  // Generic track method for analysis events
  track(userId: string, eventType: string, analysisType: string, metadata: any) {
    // Map analysis events to proper metric event types
    let mappedEventType: 'file_upload' | 'file_analysis_view' | 'anomaly_detection' | 'ai_analysis';
    let status: 'success' | 'failure' | 'error' = 'success';
    
    if (eventType.includes('failure') || eventType.includes('error')) {
      status = 'failure';
    }
    
    // Map analysis types to proper event categories
    if (analysisType === 'traditional_ml' || analysisType === 'advanced_ml') {
      mappedEventType = 'anomaly_detection';
    } else if (analysisType === 'ai_powered' || analysisType === 'openai' || analysisType === 'gemini') {
      mappedEventType = 'ai_analysis';
    } else {
      mappedEventType = 'anomaly_detection'; // Default fallback
    }
    
    const metric: MetricEvent = {
      userId,
      eventType: mappedEventType,
      status,
      metadata: {
        ...metadata,
        analysisType,
        aiProvider: analysisType === 'ai_powered' ? metadata.ai_provider || 'openai' : analysisType
      },
      timestamp: new Date()
    };
    
    this.metricsBuffer.push(metric);
    console.log(`📊 Tracked ${eventType}: ${analysisType} (${metadata.anomalies_found || 0} anomalies)`);
  }

  // Get success/failure rates
  async getMetricsSummary(userId: string, timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    fileUploads: { total: number; success: number; failure: number; successRate: number };
    analysisViews: { total: number; success: number; failure: number; successRate: number };
    aiAnalysis: { total: number; success: number; failure: number; successRate: number; byProvider: Record<string, any> };
    anomalyDetection: { total: number; success: number; failure: number; successRate: number; avgAnomalies: number };
  }> {
    const timeClause = this.getTimeClause(timeRange);
    
    // File upload metrics
    const fileUploadStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failure
      FROM metrics_events 
      WHERE user_id = ${userId} 
        AND event_type = 'file_upload' 
        AND ${timeClause}
    `);

    // Analysis view metrics
    const analysisViewStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failure
      FROM metrics_events 
      WHERE user_id = ${userId} 
        AND event_type = 'file_analysis_view' 
        AND ${timeClause}
    `);

    // AI analysis metrics
    const aiAnalysisStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failure,
        metadata->>'aiProvider' as ai_provider
      FROM metrics_events 
      WHERE user_id = ${userId} 
        AND event_type = 'ai_analysis' 
        AND ${timeClause}
      GROUP BY metadata->>'aiProvider'
    `);

    // Anomaly detection metrics
    const anomalyStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as success,
        COUNT(CASE WHEN status = 'failure' THEN 1 END) as failure,
        AVG(CAST(metadata->>'anomaliesFound' AS INTEGER)) as avg_anomalies
      FROM metrics_events 
      WHERE user_id = ${userId} 
        AND event_type = 'anomaly_detection' 
        AND ${timeClause}
    `);

    const fileUploads = fileUploadStats.rows[0] || { total: 0, success: 0, failure: 0 };
    const analysisViews = analysisViewStats.rows[0] || { total: 0, success: 0, failure: 0 };
    const anomalyDetection = anomalyStats.rows[0] || { total: 0, success: 0, failure: 0, avg_anomalies: 0 };

    // Process AI analysis by provider
    const aiByProvider: Record<string, any> = {};
    let aiTotal = 0, aiSuccess = 0, aiFailure = 0;
    
    for (const stat of aiAnalysisStats.rows) {
      const provider = (stat as any).ai_provider || 'unknown';
      aiByProvider[provider] = {
        total: Number(stat.total),
        success: Number(stat.success),
        failure: Number(stat.failure),
        successRate: Number(stat.total) > 0 ? (Number(stat.success) / Number(stat.total)) * 100 : 0
      };
      aiTotal += Number(stat.total);
      aiSuccess += Number(stat.success);
      aiFailure += Number(stat.failure);
    }

    return {
      fileUploads: {
        total: Number(fileUploads.total),
        success: Number(fileUploads.success),
        failure: Number(fileUploads.failure),
        successRate: Number(fileUploads.total) > 0 ? (Number(fileUploads.success) / Number(fileUploads.total)) * 100 : 0
      },
      analysisViews: {
        total: Number(analysisViews.total),
        success: Number(analysisViews.success),
        failure: Number(analysisViews.failure),
        successRate: Number(analysisViews.total) > 0 ? (Number(analysisViews.success) / Number(analysisViews.total)) * 100 : 0
      },
      aiAnalysis: {
        total: aiTotal,
        success: aiSuccess,
        failure: aiFailure,
        successRate: aiTotal > 0 ? (aiSuccess / aiTotal) * 100 : 0,
        byProvider: aiByProvider
      },
      anomalyDetection: {
        total: Number(anomalyDetection.total),
        success: Number(anomalyDetection.success),
        failure: Number(anomalyDetection.failure),
        successRate: Number(anomalyDetection.total) > 0 ? (Number(anomalyDetection.success) / Number(anomalyDetection.total)) * 100 : 0,
        avgAnomalies: Number(anomalyDetection.avg_anomalies) || 0
      }
    };
  }

  private getTimeClause(timeRange: string) {
    const intervals = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };
    
    return sql`timestamp >= NOW() - INTERVAL '${sql.raw(intervals[timeRange as keyof typeof intervals])}'`;
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    try {
      // Insert metrics into database
      const metrics = [...this.metricsBuffer];
      this.metricsBuffer = [];

      for (const metric of metrics) {
        await db.insert(metricsEvents).values({
          userId: metric.userId,
          eventType: metric.eventType,
          status: metric.status,
          metadata: metric.metadata,
          timestamp: metric.timestamp,
        });
      }

      console.log(`📊 Flushed ${metrics.length} metrics to database`);
    } catch (error) {
      console.error('❌ Failed to flush metrics:', error);
      // Re-add failed metrics back to buffer for retry
      this.metricsBuffer.unshift(...metrics);
    }
  }

  // Cleanup on shutdown
  destroy() {
    clearInterval(this.flushInterval);
    this.flushMetrics();
  }
}

export const metricsService = MetricsService.getInstance();

// Graceful shutdown
process.on('SIGTERM', () => {
  metricsService.destroy();
});

process.on('SIGINT', () => {
  metricsService.destroy();
});