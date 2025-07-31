import { LogEntry, AnomalyResult } from "./anomaly-detector";

export interface TraditionalAnomalyConfig {
  useIsolationForest: boolean;
  useStatisticalMethods: boolean;
  useTimeSeriesAnalysis: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
}

export class TraditionalAnomalyDetector {
  private config: TraditionalAnomalyConfig;
  private historicalData: LogEntry[] = [];
  private baselineStats: any = null;

  constructor(config: Partial<TraditionalAnomalyConfig> = {}) {
    this.config = {
      useIsolationForest: true,
      useStatisticalMethods: true,
      useTimeSeriesAnalysis: true,
      sensitivityLevel: 'medium',
      ...config
    };
  }

  async analyzeBatch(logEntries: LogEntry[]): Promise<AnomalyResult[]> {
    // Update historical data for baseline learning
    this.historicalData.push(...logEntries);
    this.updateBaseline();

    const results: AnomalyResult[] = [];

    for (const entry of logEntries) {
      const anomalyResult = await this.analyzeLogEntry(entry);
      results.push(anomalyResult);
    }

    return results;
  }

  async analyzeLogEntry(logEntry: LogEntry): Promise<AnomalyResult> {
    const detections = [];

    // 1. Rule-based detection for obvious threats
    const ruleBasedResult = this.detectRuleBasedAnomalies(logEntry);
    if (ruleBasedResult.isAnomaly) {
      detections.push(ruleBasedResult);
    }

    // 2. Statistical anomaly detection
    if (this.config.useStatisticalMethods) {
      const statisticalResult = this.detectStatisticalAnomalies(logEntry);
      if (statisticalResult.isAnomaly) {
        detections.push(statisticalResult);
      }
    }

    // 3. Time series anomaly detection
    if (this.config.useTimeSeriesAnalysis) {
      const timeSeriesResult = this.detectTimeSeriesAnomalies(logEntry);
      if (timeSeriesResult.isAnomaly) {
        detections.push(timeSeriesResult);
      }
    }

    // 4. Behavioral pattern detection
    const behavioralResult = this.detectBehavioralAnomalies(logEntry);
    if (behavioralResult.isAnomaly) {
      detections.push(behavioralResult);
    }

    // Combine results
    if (detections.length === 0) {
      return {
        isAnomaly: false,
        riskScore: 0,
        anomalyType: "normal",
        description: "No anomalies detected",
        confidence: 0.8,
        explanation: "Entry appears normal based on traditional ML analysis",
        recommendations: []
      };
    }

    // Find highest risk detection
    const highestRisk = detections.reduce((max, current) => 
      current.riskScore > max.riskScore ? current : max
    );

    return {
      ...highestRisk,
      explanation: `Traditional ML Detection: ${detections.map(d => d.anomalyType).join(', ')}`,
      recommendations: [...new Set(detections.flatMap(d => d.recommendations))]
    };
  }

  private detectRuleBasedAnomalies(logEntry: LogEntry): AnomalyResult {
    const url = logEntry.url?.toLowerCase() || '';
    const userAgent = logEntry.userAgent?.toLowerCase() || '';
    const category = logEntry.category?.toLowerCase() || '';
    const action = logEntry.action?.toLowerCase() || '';
    const statusCode = logEntry.statusCode || '';

    // High-risk indicators
    const maliciousDomains = ['.ru/', '.biz/', 'unknown-', 'suspicious-', 'tor-', 'dark-', 'proxy-', 'malware', 'phish'];
    const suspiciousUserAgents = ['curl/', 'wget/', 'python', 'postman', 'bot'];
    const malwareCategories = ['malware', 'proxy avoidance', 'phishing'];

    let riskScore = 0;
    let anomalyType = '';
    let description = '';
    const indicators = [];

    // Check for blocked malicious content
    if (statusCode === '403' || action === 'blocked') {
      riskScore += 3;
      indicators.push('blocked_action');
    }

    // Check for malicious domains
    for (const domain of maliciousDomains) {
      if (url.includes(domain)) {
        riskScore += 4;
        indicators.push('malicious_domain');
        break;
      }
    }

    // Check for suspicious user agents
    for (const agent of suspiciousUserAgents) {
      if (userAgent.includes(agent)) {
        riskScore += 2;
        indicators.push('suspicious_user_agent');
        break;
      }
    }

    // Check for malware categories
    for (const cat of malwareCategories) {
      if (category.includes(cat)) {
        riskScore += 5;
        indicators.push('malware_category');
        break;
      }
    }

    // Check for large data transfers
    if (logEntry.bytes && logEntry.bytes > 100000) {
      riskScore += 2;
      indicators.push('large_transfer');
    }

    // Combine blocked + suspicious = high risk
    if (indicators.includes('blocked_action') && indicators.length > 1) {
      riskScore += 2;
    }

    if (riskScore >= 4) {
      anomalyType = indicators.join('_');
      description = `Rule-based detection: ${indicators.join(', ')}`;
      
      return {
        isAnomaly: true,
        riskScore: Math.min(10, riskScore),
        anomalyType,
        description,
        confidence: 0.9,
        explanation: `Multiple security indicators detected: ${indicators.join(', ')}`,
        recommendations: this.getRecommendations(indicators)
      };
    }

    return { isAnomaly: false, riskScore: 0, anomalyType: '', description: '', confidence: 0, explanation: '', recommendations: [] };
  }

  private detectStatisticalAnomalies(logEntry: LogEntry): AnomalyResult {
    if (!this.baselineStats || this.historicalData.length < 50) {
      return { isAnomaly: false, riskScore: 0, anomalyType: '', description: '', confidence: 0, explanation: '', recommendations: [] };
    }

    const anomalies = [];

    // Bytes transfer anomaly detection (Z-score)
    if (logEntry.bytes) {
      const zScore = this.calculateZScore(logEntry.bytes, this.baselineStats.bytes);
      if (Math.abs(zScore) > 2.5) {
        anomalies.push({
          type: 'byte_transfer_anomaly',
          score: Math.min(8, Math.abs(zScore)),
          description: `Unusual data transfer: ${logEntry.bytes} bytes (${zScore.toFixed(2)} std deviations)`
        });
      }
    }

    // Source IP frequency anomaly
    const sourceIPFreq = this.historicalData.filter(e => e.sourceIP === logEntry.sourceIP).length;
    const avgIPFreq = this.baselineStats.avgSourceIPFrequency;
    if (sourceIPFreq === 1 && avgIPFreq > 5) {
      anomalies.push({
        type: 'rare_source_ip',
        score: 6,
        description: `First-time source IP: ${logEntry.sourceIP}`
      });
    }

    // Status code anomaly
    const statusCode = logEntry.statusCode || '200';
    if (statusCode !== '200' && statusCode !== '301' && statusCode !== '302') {
      anomalies.push({
        type: 'unusual_status_code',
        score: 5,
        description: `Unusual status code: ${statusCode}`
      });
    }

    if (anomalies.length > 0) {
      const maxAnomaly = anomalies.reduce((max, current) => 
        current.score > max.score ? current : max
      );

      return {
        isAnomaly: true,
        riskScore: maxAnomaly.score,
        anomalyType: maxAnomaly.type,
        description: maxAnomaly.description,
        confidence: 0.7,
        explanation: `Statistical analysis detected ${anomalies.length} anomaly pattern(s)`,
        recommendations: ['Monitor this pattern', 'Review source IP reputation', 'Check for policy violations']
      };
    }

    return { isAnomaly: false, riskScore: 0, anomalyType: '', description: '', confidence: 0, explanation: '', recommendations: [] };
  }

  private detectTimeSeriesAnomalies(logEntry: LogEntry): AnomalyResult {
    if (this.historicalData.length < 20) {
      return { isAnomaly: false, riskScore: 0, anomalyType: '', description: '', confidence: 0, explanation: '', recommendations: [] };
    }

    const now = new Date(logEntry.timestamp);
    const hour = now.getHours();
    
    // Activity outside normal hours (assuming 8 AM - 6 PM is normal)
    if (hour < 8 || hour > 18) {
      const sameIPAfterHours = this.historicalData.filter(e => {
        const entryTime = new Date(e.timestamp);
        const entryHour = entryTime.getHours();
        return e.sourceIP === logEntry.sourceIP && (entryHour < 8 || entryHour > 18);
      }).length;

      if (sameIPAfterHours <= 2) {
        return {
          isAnomaly: true,
          riskScore: 6,
          anomalyType: 'after_hours_activity',
          description: `Unusual after-hours activity from ${logEntry.sourceIP} at ${hour}:00`,
          confidence: 0.6,
          explanation: 'Activity detected outside normal business hours',
          recommendations: ['Review after-hours access policies', 'Verify user authorization']
        };
      }
    }

    // Rapid successive requests from same IP
    const recentEntries = this.historicalData
      .filter(e => e.sourceIP === logEntry.sourceIP)
      .slice(-10);

    if (recentEntries.length >= 5) {
      const timeSpan = new Date(logEntry.timestamp).getTime() - new Date(recentEntries[0].timestamp).getTime();
      const requestsPerMinute = (recentEntries.length / (timeSpan / 60000));

      if (requestsPerMinute > 10) {
        return {
          isAnomaly: true,
          riskScore: 7,
          anomalyType: 'rapid_requests',
          description: `High request frequency: ${requestsPerMinute.toFixed(1)} requests/minute from ${logEntry.sourceIP}`,
          confidence: 0.8,
          explanation: 'Potential automated scanning or DOS attack pattern',
          recommendations: ['Rate limit IP address', 'Monitor for bot activity', 'Consider IP blocking']
        };
      }
    }

    return { isAnomaly: false, riskScore: 0, anomalyType: '', description: '', confidence: 0, explanation: '', recommendations: [] };
  }

  private detectBehavioralAnomalies(logEntry: LogEntry): AnomalyResult {
    if (this.historicalData.length < 30) {
      return { isAnomaly: false, riskScore: 0, anomalyType: '', description: '', confidence: 0, explanation: '', recommendations: [] };
    }

    const userAgent = logEntry.userAgent || '';
    const sourceIP = logEntry.sourceIP;

    // Check for user agent switching from same IP
    const ipHistory = this.historicalData.filter(e => e.sourceIP === sourceIP);
    const uniqueUserAgents = new Set(ipHistory.map(e => e.userAgent).filter(ua => ua));

    if (uniqueUserAgents.size > 3 && !userAgent.includes('Mozilla')) {
      return {
        isAnomaly: true,
        riskScore: 6,
        anomalyType: 'user_agent_switching',
        description: `Multiple user agents from ${sourceIP}: ${uniqueUserAgents.size} different agents`,
        confidence: 0.7,
        explanation: 'Potential tool switching or evasion behavior',
        recommendations: ['Monitor IP for suspicious activity', 'Review user agent patterns']
      };
    }

    // Check for geographic anomalies (simplified - based on IP patterns)
    const ipOctets = sourceIP.split('.');
    if (ipOctets[0] && (ipOctets[0] === '10' || ipOctets[0] === '172' || ipOctets[0] === '192')) {
      // Internal IP accessing external suspicious content
      if (logEntry.url && (logEntry.url.includes('.ru') || logEntry.url.includes('tor-') || logEntry.url.includes('dark-'))) {
        return {
          isAnomaly: true,
          riskScore: 8,
          anomalyType: 'internal_to_suspicious',
          description: `Internal IP ${sourceIP} accessing suspicious external content`,
          confidence: 0.8,
          explanation: 'Internal network accessing potentially malicious external resources',
          recommendations: ['Block suspicious domains', 'Review network security policies', 'Investigate user activity']
        };
      }
    }

    return { isAnomaly: false, riskScore: 0, anomalyType: '', description: '', confidence: 0, explanation: '', recommendations: [] };
  }

  private updateBaseline(): void {
    if (this.historicalData.length < 10) return;

    const bytes = this.historicalData
      .map(e => e.bytes)
      .filter(b => b !== undefined) as number[];

    const sourceIPs = this.historicalData.map(e => e.sourceIP);
    const ipCounts = sourceIPs.reduce((acc, ip) => {
      acc[ip] = (acc[ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    this.baselineStats = {
      bytes: {
        mean: this.calculateMean(bytes),
        std: this.calculateStandardDeviation(bytes)
      },
      avgSourceIPFrequency: Object.values(ipCounts).reduce((sum, count) => sum + count, 0) / Object.keys(ipCounts).length
    };
  }

  private calculateZScore(value: number, stats: { mean: number; std: number }): number {
    if (stats.std === 0) return 0;
    return (value - stats.mean) / stats.std;
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(this.calculateMean(squaredDiffs));
  }

  private getRecommendations(indicators: string[]): string[] {
    const recommendations = [];

    if (indicators.includes('blocked_action')) {
      recommendations.push('Review firewall logs for patterns');
    }
    if (indicators.includes('malicious_domain')) {
      recommendations.push('Block domain at DNS level', 'Investigate source IP');
    }
    if (indicators.includes('suspicious_user_agent')) {
      recommendations.push('Monitor for automated tools', 'Consider user agent filtering');
    }
    if (indicators.includes('malware_category')) {
      recommendations.push('Quarantine source system', 'Run full security scan');
    }
    if (indicators.includes('large_transfer')) {
      recommendations.push('Monitor data exfiltration', 'Review transfer policies');
    }

    return recommendations.length > 0 ? recommendations : ['Monitor activity', 'Review security policies'];
  }
}

export const traditionalAnomalyDetector = new TraditionalAnomalyDetector();