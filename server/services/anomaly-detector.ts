import { MultiProviderAIService, AIConfig, AIProvider, ModelTier } from "./ai-providers";

export interface LogEntry {
  timestamp: string;
  sourceIP: string;
  destinationIP?: string;
  user?: string;
  action: string;
  url?: string;
  statusCode?: string;
  bytes?: number;
  userAgent?: string;
  protocol?: string;
  category?: string;
  subcategory?: string;
  rawLog: string;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  riskScore: number;
  anomalyType: string;
  description: string;
  confidence: number;
  explanation: string;
  recommendations: string[];
}

export class AnomalyDetector {
  private aiService: MultiProviderAIService;
  private defaultConfig: AIConfig;

  constructor(config?: Partial<AIConfig>) {
    this.aiService = new MultiProviderAIService();
    this.defaultConfig = {
      provider: (config?.provider || process.env.AI_PROVIDER || "openai") as AIProvider,
      tier: (config?.tier || process.env.AI_MODEL_TIER || "standard") as ModelTier,
      temperature: config?.temperature || 0.1,
    };
  }

  async analyzeLogEntry(logEntry: LogEntry, config?: Partial<AIConfig>): Promise<AnomalyResult> {
    try {
      const analyzeConfig = { ...this.defaultConfig, ...config };
      const prompt = this.buildAnalysisPrompt(logEntry);

      const systemPrompt = "You are an expert cybersecurity analyst specializing in log analysis and anomaly detection. Analyze the provided log entry and identify potential security threats, unusual patterns, or anomalous behavior. Respond with JSON only.";

      const response = await this.aiService.analyze({
        systemPrompt,
        userPrompt: prompt,
        config: analyzeConfig,
      });

      const result = JSON.parse(response.content || "{}");
      
      return {
        isAnomaly: result.isAnomaly || false,
        riskScore: Math.min(10, Math.max(0, result.riskScore || 0)),
        anomalyType: result.anomalyType || "unknown",
        description: result.description || "No description available",
        confidence: Math.min(1, Math.max(0, result.confidence || 0)),
        explanation: result.explanation || "",
        recommendations: result.recommendations || [],
      };
    } catch (error) {
      console.error("Error analyzing log entry:", error);
      return {
        isAnomaly: false,
        riskScore: 0,
        anomalyType: "analysis_failed",
        description: "Failed to analyze log entry",
        confidence: 0,
        explanation: "AI analysis service unavailable",
        recommendations: ["Review log manually", "Check system connectivity"],
      };
    }
  }

  async analyzeBatch(logEntries: LogEntry[]): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];
    
    for (const entry of logEntries) {
      const result = await this.analyzeLogEntry(entry);
      results.push(result);
      
      // Add small delay to avoid rate limiting
      if (logEntries.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  private buildAnalysisPrompt(logEntry: LogEntry): string {
    return `Analyze this network security log for threats and anomalies. Be highly sensitive to security indicators.

Log Entry:
- Timestamp: ${logEntry.timestamp}
- Source IP: ${logEntry.sourceIP}
- Destination IP: ${logEntry.destinationIP || "N/A"}
- User: ${logEntry.user || "N/A"}
- Action: ${logEntry.action}
- URL: ${logEntry.url || "N/A"}
- Status Code: ${logEntry.statusCode || "N/A"}
- Bytes: ${logEntry.bytes || "N/A"}
- User Agent: ${logEntry.userAgent || "N/A"}
- Category: ${logEntry.category || "N/A"}

CRITICAL THREAT PATTERNS:
1. BLOCKED ACTIONS (403 status): Indicate security policy violations - score 7+
2. MALICIOUS DOMAINS: .ru, .biz, unknown-*, suspicious-*, tor-*, dark-*, proxy-* - score 8+
3. MALWARE CATEGORIES: Any "Malware" or "Proxy Avoidance" category - score 9+
4. SUSPICIOUS USER AGENTS: curl/*, automated tools, non-browser agents on blocked content - score 8+
5. LARGE DATA TRANSFERS: >100KB (100,000+ bytes) especially from unknown sources - score 7+
6. PHISHING/MARKET TERMS: URLs with phish, malware, buy, dark-market - score 9+

Be aggressive with scoring. Any combination of blocked + suspicious should score 8+.

Respond with JSON:
{
  "isAnomaly": boolean,
  "riskScore": number (0-10, be aggressive - blocked malicious = 8+),
  "anomalyType": string,
  "description": string,
  "confidence": number (0-1),
  "explanation": string,
  "recommendations": array of strings
}`;
  }

  async getAnomalyStats(anomalies: AnomalyResult[]): Promise<{
    totalAnomalies: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    averageRiskScore: number;
    topAnomalyTypes: { type: string; count: number }[];
  }> {
    const total = anomalies.length;
    const critical = anomalies.filter(a => a.riskScore >= 9).length;
    const high = anomalies.filter(a => a.riskScore >= 7 && a.riskScore < 9).length;
    const medium = anomalies.filter(a => a.riskScore >= 4 && a.riskScore < 7).length;
    const low = anomalies.filter(a => a.riskScore < 4).length;
    
    const avgRisk = total > 0 
      ? anomalies.reduce((sum, a) => sum + a.riskScore, 0) / total 
      : 0;

    const typeCount = anomalies.reduce((acc, a) => {
      acc[a.anomalyType] = (acc[a.anomalyType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTypes = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalAnomalies: total,
      criticalCount: critical,
      highCount: high,
      mediumCount: medium,
      lowCount: low,
      averageRiskScore: Math.round(avgRisk * 10) / 10,
      topAnomalyTypes: topTypes,
    };
  }
}

export const anomalyDetector = new AnomalyDetector();
