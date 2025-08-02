import { storage } from '../storage';
import type { Anomaly, WebhookIntegration } from '@shared/schema';

interface WebhookPayload {
  anomaly: {
    id: string;
    riskScore: string;
    anomalyType: string;
    description: string;
    timestamp: Date;
    priority: string;
    status: string;
    detectionMethod: string;
    rawLogEntry?: string;
    logLineNumber?: number;
  };
  logFile: {
    id: string;
    filename: string;
    originalName: string;
    uploadedAt: Date | null;
  };
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  metadata: {
    triggeredAt: string;
    platform: string;
    webhookId: string;
  };
}

export class WebhookService {
  async triggerWebhooksForAnomaly(anomaly: Anomaly, userId: string): Promise<void> {
    try {
      // Get active webhooks for this user
      const webhooks = await storage.getWebhookIntegrationsByUser(userId);
      
      if (webhooks.length === 0) {
        return;
      }

      // Get related data for payload
      const logFile = await storage.getLogFile(anomaly.logFileId);
      const user = await storage.getUser(userId);
      
      if (!logFile || !user) {
        console.error('Failed to get related data for webhook trigger');
        return;
      }

      // Filter webhooks that should trigger for this anomaly
      const triggeredWebhooks = webhooks.filter(webhook => 
        this.shouldTriggerWebhook(webhook, anomaly)
      );

      console.log(`🎯 Found ${triggeredWebhooks.length} webhooks to trigger for anomaly ${anomaly.id}`);

      // Trigger each webhook
      for (const webhook of triggeredWebhooks) {
        await this.sendWebhook(webhook, anomaly, logFile, user);
      }
    } catch (error) {
      console.error('Error triggering webhooks for anomaly:', error);
    }
  }

  private shouldTriggerWebhook(webhook: WebhookIntegration, anomaly: Anomaly): boolean {
    if (!webhook.isActive) {
      return false;
    }

    const conditions = webhook.triggerConditions as any;
    
    // Check risk score threshold
    if (conditions.minRiskScore && parseFloat(anomaly.riskScore) < conditions.minRiskScore) {
      return false;
    }

    // Check anomaly types
    if (conditions.anomalyTypes && conditions.anomalyTypes.length > 0) {
      if (!conditions.anomalyTypes.includes(anomaly.anomalyType)) {
        return false;
      }
    }

    // Check priority levels
    if (conditions.priorities && conditions.priorities.length > 0) {
      if (!conditions.priorities.includes(anomaly.priority)) {
        return false;
      }
    }

    // Check keywords in description
    if (conditions.keywords && conditions.keywords.length > 0) {
      const description = anomaly.description.toLowerCase();
      const hasKeyword = conditions.keywords.some((keyword: string) => 
        description.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    return true;
  }

  private async sendWebhook(
    webhook: WebhookIntegration, 
    anomaly: Anomaly, 
    logFile: any, 
    user: any
  ): Promise<void> {
    try {
      const payload: WebhookPayload = {
        anomaly: {
          id: anomaly.id,
          riskScore: anomaly.riskScore,
          anomalyType: anomaly.anomalyType,
          description: anomaly.description,
          timestamp: anomaly.timestamp,
          priority: anomaly.priority || 'medium',
          status: anomaly.status,
          detectionMethod: anomaly.detectionMethod,
          rawLogEntry: anomaly.rawLogEntry || undefined,
          logLineNumber: anomaly.logLineNumber || undefined,
        },
        logFile: {
          id: logFile.id,
          filename: logFile.filename,
          originalName: logFile.originalName,
          uploadedAt: logFile.uploadedAt,
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        metadata: {
          triggeredAt: new Date().toISOString(),
          platform: 'Sentry',
          webhookId: webhook.id,
        }
      };

      // Apply custom payload template if provided
      const finalPayload = webhook.payloadTemplate 
        ? this.applyPayloadTemplate(payload, webhook.payloadTemplate as any)
        : payload;

      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sentry-Webhook/1.0',
        },
        body: JSON.stringify(finalPayload),
      });

      if (response.ok) {
        // Update webhook statistics
        await storage.updateWebhookStats(webhook.id);
        console.log(`✅ Webhook ${webhook.name} triggered successfully for anomaly ${anomaly.id} to ${webhook.webhookUrl}`);
      } else {
        console.error(`Webhook ${webhook.name} failed with status ${response.status}`);
      }
    } catch (error) {
      console.error(`Error sending webhook ${webhook.name}:`, error);
    }
  }

  private applyPayloadTemplate(payload: WebhookPayload, template: any): any {
    // Simple template substitution - can be enhanced later
    const templateStr = JSON.stringify(template);
    const filledTemplate = templateStr.replace(/\{\{(.*?)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value = payload as any;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined ? value : match;
    });
    
    try {
      return JSON.parse(filledTemplate);
    } catch {
      return payload; // Fallback to original payload
    }
  }

  async testWebhook(webhookId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const webhook = await storage.getWebhookIntegration(webhookId);
      
      if (!webhook || webhook.userId !== userId) {
        return { success: false, message: 'Webhook not found or unauthorized' };
      }

      const testPayload = {
        test: true,
        message: 'This is a test webhook from Sentry',
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
        webhookName: webhook.name,
      };

      const response = await fetch(webhook.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Sentry-Webhook-Test/1.0',
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        return { success: true, message: 'Test webhook sent successfully' };
      } else {
        return { success: false, message: `Webhook failed with status ${response.status}` };
      }
    } catch (error) {
      return { success: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
}

export const webhookService = new WebhookService();