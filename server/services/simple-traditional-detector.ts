import { LogEntry, AnomalyResult } from "./anomaly-detector";

export class SimpleTraditionalDetector {
  private historicalData: LogEntry[] = [];

  async analyzeLogEntry(logEntry: LogEntry): Promise<AnomalyResult> {
    // Add to historical data
    this.historicalData.push(logEntry);
    if (this.historicalData.length > 1000) {
      this.historicalData = this.historicalData.slice(-500); // Keep recent 500 entries
    }

    const url = logEntry.url?.toLowerCase() || '';
    const userAgent = logEntry.userAgent?.toLowerCase() || '';
    const category = logEntry.category?.toLowerCase() || '';
    const action = logEntry.action?.toLowerCase() || '';
    const statusCode = logEntry.statusCode || '';

    let riskScore = 0;
    const indicators = [];

    // Rule-based detection
    if (statusCode === '403' || action === 'blocked') {
      riskScore += 3;
      indicators.push('blocked_action');
    }

    // Malicious domains
    const maliciousDomains = ['.ru/', '.biz/', 'unknown-', 'suspicious-', 'tor-', 'dark-', 'proxy-', 'malware', 'phish'];
    for (const domain of maliciousDomains) {
      if (url.includes(domain)) {
        riskScore += 4;
        indicators.push('malicious_domain');
        break;
      }
    }

    // Suspicious user agents
    if (userAgent.includes('curl/') || userAgent.includes('wget') || userAgent.includes('python') || userAgent.includes('postman')) {
      riskScore += 2;
      indicators.push('suspicious_user_agent');
    }

    // Malware categories
    if (category.includes('malware') || category.includes('proxy avoidance') || category.includes('phishing')) {
      riskScore += 5;
      indicators.push('malware_category');
    }

    // Large data transfers
    if (logEntry.bytes && logEntry.bytes > 100000) {
      riskScore += 2;
      indicators.push('large_transfer');
    }

    // Statistical anomalies (simplified)
    if (this.historicalData.length > 10) {
      const sourceIPCount = this.historicalData.filter(e => e.sourceIP === logEntry.sourceIP).length;
      if (sourceIPCount === 1) { // First time seeing this IP
        riskScore += 1;
        indicators.push('new_source_ip');
      }

      // Check for rapid requests
      const recentSameIP = this.historicalData
        .filter(e => e.sourceIP === logEntry.sourceIP)
        .slice(-5);
      
      if (recentSameIP.length >= 3) {
        riskScore += 1;
        indicators.push('rapid_requests');
      }
    }

    // Combine blocked + suspicious = higher risk
    if (indicators.includes('blocked_action') && indicators.length > 1) {
      riskScore += 2;
    }

    const isAnomaly = riskScore >= 4;
    
    return {
      isAnomaly,
      riskScore: Math.min(10, riskScore),
      anomalyType: isAnomaly ? indicators.join('_') : 'normal',
      description: isAnomaly ? `Traditional ML detected: ${indicators.join(', ')}` : 'No anomalies detected',
      confidence: isAnomaly ? 0.8 : 0.7,
      explanation: isAnomaly 
        ? `Traditional ML found ${indicators.length} security indicators (score: ${riskScore})`
        : 'Traditional analysis shows normal behavior patterns',
      recommendations: this.getRecommendations(indicators)
    };
  }

  async analyzeBatch(logEntries: LogEntry[]): Promise<AnomalyResult[]> {
    const results: AnomalyResult[] = [];
    for (const entry of logEntries) {
      const result = await this.analyzeLogEntry(entry);
      results.push(result);
    }
    return results;
  }

  private getRecommendations(indicators: string[]): string[] {
    const recommendations = [];

    if (indicators.includes('blocked_action')) {
      recommendations.push('Review firewall policies');
    }
    if (indicators.includes('malicious_domain')) {
      recommendations.push('Block domain at DNS level', 'Investigate source system');
    }
    if (indicators.includes('suspicious_user_agent')) {
      recommendations.push('Monitor for automated attacks');
    }
    if (indicators.includes('malware_category')) {
      recommendations.push('Quarantine affected system', 'Run security scan');
    }
    if (indicators.includes('large_transfer')) {
      recommendations.push('Monitor data exfiltration');
    }
    if (indicators.includes('new_source_ip')) {
      recommendations.push('Verify IP reputation');
    }
    if (indicators.includes('rapid_requests')) {
      recommendations.push('Consider rate limiting');
    }

    return recommendations.length > 0 ? recommendations : ['Continue monitoring'];
  }
}

export const simpleTraditionalDetector = new SimpleTraditionalDetector();