interface LogEntry {
  timestamp?: string;
  sourceIp: string;
  destinationIp?: string;
  url?: string;
  action?: string;
  statusCode?: string;
  userAgent?: string;
  referer?: string;
  bytesSent?: number;
  bytesReceived?: number;
  duration?: number;
  category?: string;
  [key: string]: any;
}

export interface TraditionalAnomalyResult {
  id: string;
  logEntry: LogEntry;
  anomalyType: string;
  riskScore: number;
  confidence: number;
  description: string;
  recommendation: string;
  metadata: {
    detectionMethod: 'rule-based' | 'statistical' | 'pattern-matching';
    triggerRules: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

export class TraditionalAnomalyDetector {
  private suspiciousCategories = [
    'cryptocurrency',
    'proxy avoidance',
    'tor',
    'anonymization',
    'dark web',
    'malware',
    'botnet',
    'command and control'
  ];

  private suspiciousUrls = [
    /.*\.onion.*/i,
    /.*stratum.*/i,
    /.*mining.*/i,
    /.*pool.*\.(io|com|net|org)/i,
    /.*crypto.*/i,
    /.*bitcoin.*/i,
    /.*ethereum.*/i,
    /.*monero.*/i,
    /.*zcash.*/i
  ];

  private suspiciousUserAgents = [
    /tor browser/i,
    /stratum/i,
    /mining/i,
    /bot/i,
    /crawler/i
  ];

  private blockedPorts = [8333, 18333, 30303, 8545, 9333, 3333, 4444];

  public analyzeLogEntries(logEntries: LogEntry[]): TraditionalAnomalyResult[] {
    const anomalies: TraditionalAnomalyResult[] = [];
    const ipStats = this.calculateIpStatistics(logEntries);
    
    for (const entry of logEntries) {
      const entryAnomalies = this.analyzeLogEntry(entry, ipStats);
      anomalies.push(...entryAnomalies);
    }

    return this.rankAndFilterAnomalies(anomalies);
  }

  private analyzeLogEntry(entry: LogEntry, ipStats: Map<string, any>): TraditionalAnomalyResult[] {
    const anomalies: TraditionalAnomalyResult[] = [];
    const entryId = `traditional-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 1. Blocked Traffic Analysis
    if (entry.action?.toLowerCase() === 'blocked') {
      const blockedAnomaly = this.analyzeBlockedTraffic(entry, entryId);
      if (blockedAnomaly) anomalies.push(blockedAnomaly);
    }

    // 2. Category-based Detection
    const categoryAnomaly = this.analyzeSuspiciousCategory(entry, entryId);
    if (categoryAnomaly) anomalies.push(categoryAnomaly);

    // 3. URL Pattern Analysis
    const urlAnomaly = this.analyzeSuspiciousUrl(entry, entryId);
    if (urlAnomaly) anomalies.push(urlAnomaly);

    // 4. User Agent Analysis
    const userAgentAnomaly = this.analyzeSuspiciousUserAgent(entry, entryId);
    if (userAgentAnomaly) anomalies.push(userAgentAnomaly);

    // 5. Statistical Anomalies
    const statsAnomaly = this.analyzeStatisticalAnomalies(entry, ipStats, entryId);
    if (statsAnomaly) anomalies.push(statsAnomaly);

    // 6. Time-based Anomalies
    const timeAnomaly = this.analyzeTimeAnomalies(entry, entryId);
    if (timeAnomaly) anomalies.push(timeAnomaly);

    return anomalies;
  }

  private analyzeBlockedTraffic(entry: LogEntry, entryId: string): TraditionalAnomalyResult | null {
    if (entry.action?.toLowerCase() !== 'blocked') return null;

    const triggerRules = ['blocked_traffic'];
    let riskScore = 6.0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let description = `Blocked traffic attempt to ${entry.url}`;

    // Increase risk for specific categories
    if (entry.category?.toLowerCase().includes('cryptocurrency')) {
      riskScore = 8.5;
      severity = 'high';
      description = 'Blocked cryptocurrency mining attempt detected';
      triggerRules.push('crypto_mining_blocked');
    } else if (entry.category?.toLowerCase().includes('proxy')) {
      riskScore = 9.0;
      severity = 'high';
      description = 'Blocked proxy/anonymization attempt detected';
      triggerRules.push('proxy_blocked');
    }

    return {
      id: entryId,
      logEntry: entry,
      anomalyType: 'blocked_traffic',
      riskScore,
      confidence: 0.95,
      description,
      recommendation: 'Monitor source IP for repeated attempts. Consider investigating user behavior.',
      metadata: {
        detectionMethod: 'rule-based',
        triggerRules,
        severity
      }
    };
  }

  private analyzeSuspiciousCategory(entry: LogEntry, entryId: string): TraditionalAnomalyResult | null {
    if (!entry.category) return null;

    const category = entry.category.toLowerCase();
    const suspicious = this.suspiciousCategories.find(cat => category.includes(cat));
    
    if (!suspicious) return null;

    let riskScore = 7.0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (suspicious === 'cryptocurrency') {
      riskScore = 8.5;
      severity = 'high';
    } else if (suspicious === 'proxy avoidance' || suspicious === 'tor') {
      riskScore = 9.0;
      severity = 'high';
    }

    return {
      id: entryId + '-category',
      logEntry: entry,
      anomalyType: 'suspicious_category',
      riskScore,
      confidence: 0.90,
      description: `Suspicious activity category detected: ${entry.category}`,
      recommendation: 'Review user activity and consider policy enforcement.',
      metadata: {
        detectionMethod: 'rule-based',
        triggerRules: [`suspicious_category_${suspicious}`],
        severity
      }
    };
  }

  private analyzeSuspiciousUrl(entry: LogEntry, entryId: string): TraditionalAnomalyResult | null {
    if (!entry.url) return null;

    const matchedPattern = this.suspiciousUrls.find(pattern => pattern.test(entry.url!));
    if (!matchedPattern) return null;

    let riskScore = 7.5;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let anomalyType = 'suspicious_url';

    if (entry.url.includes('.onion')) {
      riskScore = 9.5;
      severity = 'critical';
      anomalyType = 'tor_access';
    } else if (entry.url.includes('stratum')) {
      riskScore = 8.5;
      severity = 'high';
      anomalyType = 'crypto_mining';
    }

    return {
      id: entryId + '-url',
      logEntry: entry,
      anomalyType,
      riskScore,
      confidence: 0.92,
      description: `Suspicious URL pattern detected: ${entry.url}`,
      recommendation: 'Block access and investigate user intentions.',
      metadata: {
        detectionMethod: 'pattern-matching',
        triggerRules: ['suspicious_url_pattern'],
        severity
      }
    };
  }

  private analyzeSuspiciousUserAgent(entry: LogEntry, entryId: string): TraditionalAnomalyResult | null {
    if (!entry.userAgent) return null;

    const matchedPattern = this.suspiciousUserAgents.find(pattern => pattern.test(entry.userAgent!));
    if (!matchedPattern) return null;

    let riskScore = 8.0;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

    if (entry.userAgent.toLowerCase().includes('tor browser')) {
      riskScore = 9.0;
      severity = 'critical';
    }

    return {
      id: entryId + '-useragent',
      logEntry: entry,
      anomalyType: 'suspicious_user_agent',
      riskScore,
      confidence: 0.88,
      description: `Suspicious user agent detected: ${entry.userAgent}`,
      recommendation: 'Monitor user behavior and consider security policies.',
      metadata: {
        detectionMethod: 'pattern-matching',
        triggerRules: ['suspicious_user_agent'],
        severity
      }
    };
  }

  private analyzeStatisticalAnomalies(entry: LogEntry, ipStats: Map<string, any>, entryId: string): TraditionalAnomalyResult | null {
    const ipData = ipStats.get(entry.sourceIp);
    if (!ipData) return null;

    // Check for high volume from single IP
    if (ipData.requestCount > 50) {
      return {
        id: entryId + '-volume',
        logEntry: entry,
        anomalyType: 'high_volume_ip',
        riskScore: 6.5,
        confidence: 0.75,
        description: `High request volume from IP ${entry.sourceIp}: ${ipData.requestCount} requests`,
        recommendation: 'Monitor IP for potential automated behavior or abuse.',
        metadata: {
          detectionMethod: 'statistical',
          triggerRules: ['high_volume_threshold'],
          severity: 'medium'
        }
      };
    }

    return null;
  }

  private analyzeTimeAnomalies(entry: LogEntry, entryId: string): TraditionalAnomalyResult | null {
    if (!entry.timestamp) return null;

    const date = new Date(entry.timestamp);
    const hour = date.getHours();

    // Check for off-hours activity (late night/early morning)
    if (hour >= 22 || hour <= 6) {
      return {
        id: entryId + '-time',
        logEntry: entry,
        anomalyType: 'off_hours_activity',
        riskScore: 4.5,
        confidence: 0.60,
        description: `Off-hours activity detected at ${date.toISOString()}`,
        recommendation: 'Review if this activity pattern is normal for the user.',
        metadata: {
          detectionMethod: 'rule-based',
          triggerRules: ['off_hours_threshold'],
          severity: 'low'
        }
      };
    }

    return null;
  }

  private calculateIpStatistics(logEntries: LogEntry[]): Map<string, any> {
    const ipStats = new Map();

    for (const entry of logEntries) {
      const ip = entry.sourceIp;
      if (!ipStats.has(ip)) {
        ipStats.set(ip, {
          requestCount: 0,
          blockedCount: 0,
          categories: new Set(),
          totalBytes: 0
        });
      }

      const stats = ipStats.get(ip);
      stats.requestCount++;
      
      if (entry.action?.toLowerCase() === 'blocked') {
        stats.blockedCount++;
      }
      
      if (entry.category) {
        stats.categories.add(entry.category);
      }
      
      if (entry.bytesReceived) {
        stats.totalBytes += entry.bytesReceived;
      }
    }

    return ipStats;
  }

  private rankAndFilterAnomalies(anomalies: TraditionalAnomalyResult[]): TraditionalAnomalyResult[] {
    // Remove duplicates and rank by risk score
    const uniqueAnomalies = anomalies.filter((anomaly, index, self) => 
      index === self.findIndex(a => a.logEntry.sourceIp === anomaly.logEntry.sourceIp && a.anomalyType === anomaly.anomalyType)
    );

    return uniqueAnomalies
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 50); // Limit to top 50 anomalies
  }
}