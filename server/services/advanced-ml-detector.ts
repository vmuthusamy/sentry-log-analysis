import { nanoid } from 'nanoid';

interface LogEntry {
  timestamp: string;
  sourceIp: string;
  destinationIp?: string;
  url: string;
  action: string;
  statusCode: string;
  userAgent?: string;
  referer?: string;
  bytesSent: number;
  bytesReceived: number;
  duration: number;
  category?: string;
  user?: string;
  department?: string;
}

interface Anomaly {
  id: string;
  anomalyType: string;
  riskScore: number;
  confidence: number;
  description: string;
  recommendation: string;
  logEntry: LogEntry;
  metadata: {
    severity: string;
    detectionMethod: string;
    modelUsed: string;
    features: string[];
    triggerRules: string[];
    statisticalMeasures?: any;
    behavioralProfile?: any;
  };
}

interface UserBehaviorProfile {
  userId: string;
  sourceIp: string;
  avgDailyRequests: number;
  avgRequestSize: number;
  avgResponseTime: number;
  commonCategories: string[];
  commonTimeRanges: number[];
  commonUserAgents: string[];
  riskPattern: 'low' | 'medium' | 'high';
  lastUpdated: Date;
}

interface NetworkProfile {
  sourceIp: string;
  totalRequests: number;
  uniqueDestinations: number;
  avgBytesTransferred: number;
  suspiciousPatterns: string[];
  geoLocation?: string;
  organization?: string;
  riskScore: number;
}

export class AdvancedMLDetector {
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private networkProfiles: Map<string, NetworkProfile> = new Map();
  private baselineMetrics: any = {};
  private timeSeriesData: Map<string, number[]> = new Map();

  constructor() {
    this.initializeBaselines();
  }

  private initializeBaselines() {
    this.baselineMetrics = {
      avgRequestsPerMinute: 50,
      avgResponseTime: 500,
      avgBytesTransferred: 2048,
      commonPorts: [80, 443, 8080, 8443],
      suspiciousCategories: [
        'Cryptocurrency', 'Proxy Avoidance', 'Anonymizers', 
        'Malware', 'Phishing', 'Command and Control'
      ]
    };
  }

  public analyzeLogEntries(logEntries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Build behavioral profiles
    this.buildBehavioralProfiles(logEntries);

    // Apply multiple detection models
    anomalies.push(...this.detectStatisticalAnomalies(logEntries));
    anomalies.push(...this.detectBehavioralAnomalies(logEntries));
    anomalies.push(...this.detectSequenceAnomalies(logEntries));
    anomalies.push(...this.detectNetworkAnomalies(logEntries));
    anomalies.push(...this.detectTimeSeriesAnomalies(logEntries));
    anomalies.push(...this.detectEnsembleAnomalies(logEntries));

    // Sort by risk score
    return anomalies.sort((a, b) => b.riskScore - a.riskScore);
  }

  private buildBehavioralProfiles(logEntries: LogEntry[]) {
    const userStats = new Map<string, any>();
    const ipStats = new Map<string, any>();

    // Aggregate user and IP statistics
    logEntries.forEach(entry => {
      const key = entry.user || entry.sourceIp;
      if (!userStats.has(key)) {
        userStats.set(key, {
          requests: 0,
          totalBytes: 0,
          totalDuration: 0,
          categories: new Set(),
          timeRanges: [],
          userAgents: new Set()
        });
      }

      const stats = userStats.get(key);
      stats.requests++;
      stats.totalBytes += entry.bytesSent + entry.bytesReceived;
      stats.totalDuration += entry.duration;
      if (entry.category) stats.categories.add(entry.category);
      if (entry.userAgent) stats.userAgents.add(entry.userAgent);
      stats.timeRanges.push(new Date(entry.timestamp).getHours());

      // Build network profiles
      if (!this.networkProfiles.has(entry.sourceIp)) {
        this.networkProfiles.set(entry.sourceIp, {
          sourceIp: entry.sourceIp,
          totalRequests: 0,
          uniqueDestinations: 0,
          avgBytesTransferred: 0,
          suspiciousPatterns: [],
          riskScore: 0
        });
      }
    });

    // Update behavioral profiles
    userStats.forEach((stats, key) => {
      const profile: UserBehaviorProfile = {
        userId: key,
        sourceIp: (typeof key === 'string' && key.includes('.')) ? key : '',
        avgDailyRequests: stats.requests,
        avgRequestSize: stats.totalBytes / stats.requests,
        avgResponseTime: stats.totalDuration / stats.requests,
        commonCategories: Array.from(stats.categories),
        commonTimeRanges: this.getMostCommonTimeRanges(stats.timeRanges),
        commonUserAgents: Array.from(stats.userAgents).slice(0, 5),
        riskPattern: this.calculateRiskPattern(stats),
        lastUpdated: new Date()
      };
      this.userProfiles.set(key, profile);
    });
  }

  private detectStatisticalAnomalies(logEntries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const statistics = this.calculateStatistics(logEntries);

    logEntries.forEach(entry => {
      const features: string[] = [];
      let riskScore = 0;
      let confidence = 0;

      // Z-score based anomaly detection
      const bytesZScore = Math.abs((entry.bytesSent + entry.bytesReceived - statistics.avgBytes) / statistics.stdBytes);
      const durationZScore = Math.abs((entry.duration - statistics.avgDuration) / statistics.stdDuration);

      if (bytesZScore > 3) {
        features.push('extreme_bytes_transfer');
        riskScore += 2;
        confidence += 0.15;
      }

      if (durationZScore > 3) {
        features.push('extreme_response_time');
        riskScore += 1.5;
        confidence += 0.12;
      }

      // Isolation Forest simulation (simplified)
      const isolationScore = this.calculateIsolationScore(entry, logEntries);
      if (isolationScore > 0.7) {
        features.push('statistical_outlier');
        riskScore += 3;
        confidence += 0.2;
      }

      if (features.length > 0 && riskScore > 2) {
        anomalies.push({
          id: nanoid(),
          anomalyType: 'STATISTICAL_ANOMALY',
          riskScore: Math.min(riskScore, 10),
          confidence: Math.min(confidence, 0.95),
          description: `Statistical anomaly detected with ${features.join(', ')}`,
          recommendation: 'Investigate unusual statistical patterns in network behavior',
          logEntry: entry,
          metadata: {
            severity: riskScore > 7 ? 'critical' : riskScore > 4 ? 'high' : 'medium',
            detectionMethod: 'statistical-analysis',
            modelUsed: 'z-score + isolation-forest',
            features,
            triggerRules: features,
            statisticalMeasures: {
              bytesZScore: bytesZScore.toFixed(2),
              durationZScore: durationZScore.toFixed(2),
              isolationScore: isolationScore.toFixed(3)
            }
          }
        });
      }
    });

    return anomalies;
  }

  private detectBehavioralAnomalies(logEntries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    logEntries.forEach(entry => {
      const userKey = entry.user || entry.sourceIp;
      const profile = this.userProfiles.get(userKey);
      
      if (!profile) return;

      const features: string[] = [];
      let riskScore = 0;
      let confidence = 0;

      // Behavioral deviation detection
      const currentHour = new Date(entry.timestamp).getHours();
      const isOffHours = !profile.commonTimeRanges || !profile.commonTimeRanges.includes(currentHour);
      
      if (isOffHours && (currentHour < 6 || currentHour > 22)) {
        features.push('off_hours_activity');
        riskScore += 2;
        confidence += 0.15;
      }

      // User agent deviation
      if (entry.userAgent && profile.commonUserAgents && !profile.commonUserAgents.includes(entry.userAgent)) {
        features.push('unusual_user_agent');
        riskScore += 1.5;
        confidence += 0.1;
      }

      // Category deviation
      if (entry.category && profile.commonCategories && !profile.commonCategories.includes(entry.category)) {
        features.push('unusual_category_access');
        riskScore += 1;
        confidence += 0.08;
      }

      // Volume deviation
      const currentBytes = entry.bytesSent + entry.bytesReceived;
      const deviationRatio = currentBytes / profile.avgRequestSize;
      if (deviationRatio > 5 || deviationRatio < 0.1) {
        features.push('volume_deviation');
        riskScore += 2;
        confidence += 0.12;
      }

      if (features.length > 0 && riskScore > 1.5) {
        anomalies.push({
          id: nanoid(),
          anomalyType: 'BEHAVIORAL_ANOMALY',
          riskScore: Math.min(riskScore, 10),
          confidence: Math.min(confidence, 0.9),
          description: `Behavioral deviation detected: ${features.join(', ')}`,
          recommendation: 'Review user behavior patterns and validate legitimate activity',
          logEntry: entry,
          metadata: {
            severity: riskScore > 6 ? 'high' : riskScore > 3 ? 'medium' : 'low',
            detectionMethod: 'behavioral-profiling',
            modelUsed: 'user-behavior-model',
            features,
            triggerRules: features,
            behavioralProfile: {
              userId: profile.userId,
              riskPattern: profile.riskPattern,
              avgDailyRequests: profile.avgDailyRequests,
              deviation: `${(deviationRatio * 100).toFixed(1)}%`
            }
          }
        });
      }
    });

    return anomalies;
  }

  private detectSequenceAnomalies(logEntries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const sortedEntries = logEntries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Sliding window for sequence detection
    const windowSize = 10;
    for (let i = 0; i < sortedEntries.length - windowSize; i++) {
      const window = sortedEntries.slice(i, i + windowSize);
      const sequenceAnomalies = this.analyzeSequenceWindow(window);
      anomalies.push(...sequenceAnomalies);
    }

    return anomalies;
  }

  private detectNetworkAnomalies(logEntries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const ipGroups = new Map<string, LogEntry[]>();

    // Group by source IP
    logEntries.forEach(entry => {
      if (!ipGroups.has(entry.sourceIp)) {
        ipGroups.set(entry.sourceIp, []);
      }
      ipGroups.get(entry.sourceIp)!.push(entry);
    });

    // Analyze each IP group
    ipGroups.forEach((entries, sourceIp) => {
      const networkAnomalies = this.analyzeNetworkPattern(sourceIp, entries);
      anomalies.push(...networkAnomalies);
    });

    return anomalies;
  }

  private detectTimeSeriesAnomalies(logEntries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const timeSlots = new Map<string, number>();

    // Build time series (5-minute intervals)
    logEntries.forEach(entry => {
      const timestamp = new Date(entry.timestamp);
      const timeSlot = Math.floor(timestamp.getTime() / (5 * 60 * 1000)) * (5 * 60 * 1000);
      const slotKey = new Date(timeSlot).toISOString();
      
      timeSlots.set(slotKey, (timeSlots.get(slotKey) || 0) + 1);
    });

    // Detect time series anomalies
    const values = Array.from(timeSlots.values());
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / values.length);

    timeSlots.forEach((count, timeSlot) => {
      const zScore = Math.abs((count - mean) / std);
      if (zScore > 2.5) {
        // Find entries in this time slot
        const slotEntries = logEntries.filter(entry => {
          const entryTime = new Date(entry.timestamp);
          const slotTime = new Date(timeSlot);
          return Math.abs(entryTime.getTime() - slotTime.getTime()) < (5 * 60 * 1000);
        });

        if (slotEntries.length > 0) {
          anomalies.push({
            id: nanoid(),
            anomalyType: 'TIME_SERIES_ANOMALY',
            riskScore: Math.min(zScore * 1.5, 10),
            confidence: Math.min(zScore / 4, 0.95),
            description: `Traffic spike detected: ${count} requests in 5-minute window (${zScore.toFixed(1)} standard deviations above normal)`,
            recommendation: 'Investigate potential DDoS attack or automated scanning behavior',
            logEntry: slotEntries[0],
            metadata: {
              severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
              detectionMethod: 'time-series-analysis',
              modelUsed: 'z-score-timeseries',
              features: ['traffic_spike', 'time_series_outlier'],
              triggerRules: ['unusual_traffic_volume'],
              statisticalMeasures: {
                zScore: zScore.toFixed(2),
                requestCount: count,
                timeWindow: '5-minute',
                normalRange: `${(mean - 2*std).toFixed(0)}-${(mean + 2*std).toFixed(0)}`
              }
            }
          });
        }
      }
    });

    return anomalies;
  }

  private detectEnsembleAnomalies(logEntries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Ensemble method combining multiple weak learners
    logEntries.forEach(entry => {
      const scores = {
        statistical: this.getStatisticalScore(entry, logEntries),
        behavioral: this.getBehavioralScore(entry),
        network: this.getNetworkScore(entry),
        temporal: this.getTemporalScore(entry, logEntries)
      };

      // Weighted ensemble
      const weights = { statistical: 0.3, behavioral: 0.25, network: 0.25, temporal: 0.2 };
      const ensembleScore = Object.entries(scores)
        .reduce((sum, [method, score]) => sum + score * weights[method as keyof typeof weights], 0);

      if (ensembleScore > 0.7) {
        const features = Object.entries(scores)
          .filter(([_, score]) => score > 0.5)
          .map(([method, _]) => `${method}_anomaly`);

        anomalies.push({
          id: nanoid(),
          anomalyType: 'ENSEMBLE_ANOMALY',
          riskScore: Math.min(ensembleScore * 10, 10),
          confidence: Math.min(ensembleScore, 0.95),
          description: `Multi-model ensemble detected anomaly across ${features.length} detection methods`,
          recommendation: 'High-confidence anomaly requiring immediate investigation',
          logEntry: entry,
          metadata: {
            severity: ensembleScore > 0.9 ? 'critical' : ensembleScore > 0.8 ? 'high' : 'medium',
            detectionMethod: 'ensemble-learning',
            modelUsed: 'weighted-ensemble',
            features,
            triggerRules: ['multi_model_consensus'],
            statisticalMeasures: scores
          }
        });
      }
    });

    return anomalies;
  }

  // Helper methods
  private calculateStatistics(logEntries: LogEntry[]) {
    const bytes = logEntries.map(e => e.bytesSent + e.bytesReceived);
    const durations = logEntries.map(e => e.duration);

    return {
      avgBytes: bytes.reduce((a, b) => a + b, 0) / bytes.length,
      stdBytes: Math.sqrt(bytes.map(x => Math.pow(x - bytes.reduce((a, b) => a + b, 0) / bytes.length, 2)).reduce((a, b) => a + b) / bytes.length),
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      stdDuration: Math.sqrt(durations.map(x => Math.pow(x - durations.reduce((a, b) => a + b, 0) / durations.length, 2)).reduce((a, b) => a + b) / durations.length)
    };
  }

  private calculateIsolationScore(entry: LogEntry, allEntries: LogEntry[]): number {
    // Simplified isolation forest score
    const features = [
      entry.bytesSent + entry.bytesReceived,
      entry.duration,
      entry.sourceIp && typeof entry.sourceIp === 'string' ? 
        entry.sourceIp.split('.').reduce((a, b) => a + parseInt(b), 0) : 0
    ];

    let isolationDepth = 0;
    let subset = allEntries.slice();

    while (subset.length > 1 && isolationDepth < 10) {
      const feature = isolationDepth % features.length;
      const threshold = features[feature];
      subset = subset.filter(e => {
        const eFeature = feature === 0 ? e.bytesSent + e.bytesReceived :
                        feature === 1 ? e.duration :
                        e.sourceIp && typeof e.sourceIp === 'string' ? 
                          e.sourceIp.split('.').reduce((a, b) => a + parseInt(b), 0) : 0;
        return eFeature < threshold;
      });
      isolationDepth++;
    }

    return isolationDepth / 10; // Normalize to 0-1
  }

  private getMostCommonTimeRanges(timeRanges: number[]): number[] {
    const counts = new Map<number, number>();
    timeRanges.forEach(hour => counts.set(hour, (counts.get(hour) || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([hour, _]) => hour);
  }

  private calculateRiskPattern(stats: any): 'low' | 'medium' | 'high' {
    const suspiciousCategories = ['Cryptocurrency', 'Proxy Avoidance', 'Malware'];
    const hasSuspiciousCategories = Array.from(stats.categories).some(cat => 
      suspiciousCategories.includes(cat as string)
    );

    if (hasSuspiciousCategories || stats.requests > 1000) return 'high';
    if (stats.requests > 500 || stats.userAgents.size > 5) return 'medium';
    return 'low';
  }

  private analyzeSequenceWindow(window: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Look for rapid sequential requests from same IP
    const ipCounts = new Map<string, number>();
    window.forEach(entry => {
      ipCounts.set(entry.sourceIp, (ipCounts.get(entry.sourceIp) || 0) + 1);
    });

    ipCounts.forEach((count, ip) => {
      if (count > 7) { // More than 70% of window from single IP
        const entry = window.find(e => e.sourceIp === ip)!;
        anomalies.push({
          id: nanoid(),
          anomalyType: 'SEQUENCE_ANOMALY',
          riskScore: Math.min(count * 0.8, 10),
          confidence: 0.85,
          description: `Rapid sequential requests detected: ${count} requests in short time window`,
          recommendation: 'Investigate potential automated scanning or attack behavior',
          logEntry: entry,
          metadata: {
            severity: count > 8 ? 'high' : 'medium',
            detectionMethod: 'sequence-analysis',
            modelUsed: 'sliding-window',
            features: ['rapid_requests', 'sequence_pattern'],
            triggerRules: ['high_frequency_requests'],
            statisticalMeasures: {
              requestCount: count,
              windowSize: window.length,
              frequency: `${((count / window.length) * 100).toFixed(1)}%`
            }
          }
        });
      }
    });

    return anomalies;
  }

  private analyzeNetworkPattern(sourceIp: string, entries: LogEntry[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const uniqueDestinations = new Set(entries.map(e => e.destinationIp || e.url)).size;
    const avgBytes = entries.reduce((sum, e) => sum + e.bytesSent + e.bytesReceived, 0) / entries.length;
    
    // Network scanning detection
    if (uniqueDestinations > 20 && entries.length > 50) {
      anomalies.push({
        id: nanoid(),
        anomalyType: 'NETWORK_SCANNING',
        riskScore: Math.min(uniqueDestinations * 0.2, 10),
        confidence: 0.9,
        description: `Network scanning detected: ${uniqueDestinations} unique destinations from single source`,
        recommendation: 'Block source IP and investigate scanning behavior',
        logEntry: entries[0],
        metadata: {
          severity: uniqueDestinations > 50 ? 'critical' : 'high',
          detectionMethod: 'network-analysis',
          modelUsed: 'destination-diversity',
          features: ['network_scanning', 'multiple_destinations'],
          triggerRules: ['high_destination_count'],
          statisticalMeasures: {
            uniqueDestinations,
            totalRequests: entries.length,
            avgBytes: avgBytes.toFixed(0)
          }
        }
      });
    }

    return anomalies;
  }

  private getStatisticalScore(entry: LogEntry, allEntries: LogEntry[]): number {
    const stats = this.calculateStatistics(allEntries);
    const bytesZScore = Math.abs((entry.bytesSent + entry.bytesReceived - stats.avgBytes) / stats.stdBytes);
    const durationZScore = Math.abs((entry.duration - stats.avgDuration) / stats.stdDuration);
    return Math.min((bytesZScore + durationZScore) / 6, 1);
  }

  private getBehavioralScore(entry: LogEntry): number {
    const userKey = entry.user || entry.sourceIp;
    const profile = this.userProfiles.get(userKey);
    if (!profile) return 0;

    let score = 0;
    const currentHour = new Date(entry.timestamp).getHours();
    if (!profile.commonTimeRanges || !profile.commonTimeRanges.includes(currentHour)) score += 0.3;
    if (entry.userAgent && profile.commonUserAgents && !profile.commonUserAgents.includes(entry.userAgent)) score += 0.2;
    if (profile.riskPattern === 'high') score += 0.5;

    return Math.min(score, 1);
  }

  private getNetworkScore(entry: LogEntry): number {
    const profile = this.networkProfiles.get(entry.sourceIp);
    return profile ? Math.min(profile.riskScore / 10, 1) : 0;
  }

  private getTemporalScore(entry: LogEntry, allEntries: LogEntry[]): number {
    const hour = new Date(entry.timestamp).getHours();
    const hourlyCount = allEntries.filter(e => 
      new Date(e.timestamp).getHours() === hour
    ).length;
    
    const avgHourlyCount = allEntries.length / 24;
    const deviation = Math.abs(hourlyCount - avgHourlyCount) / avgHourlyCount;
    
    return Math.min(deviation, 1);
  }
}