import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnomalyDetector } from '../../server/services/anomaly-detector';

// Mock OpenAI
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  anomalies: [{
                    type: 'crypto_mining',
                    description: 'Cryptocurrency mining activity detected',
                    risk_score: 8.5,
                    confidence: 92,
                    details: { pattern: 'mining' }
                  }]
                })
              }
            }]
          })
        }
      }
    }))
  };
});

describe('AnomalyDetector', () => {
  let detector: AnomalyDetector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('Traditional Detection', () => {
    it('should detect cryptocurrency mining patterns', () => {
      const logs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user1,web_access,mining-pool.com',
        '2024-01-01 10:01:00,user1,web_access,stratum+tcp://pool.com',
        '2024-01-01 10:02:00,user1,dns_query,cryptonight.org'
      ];

      const result = detector.detectTraditional(logs);
      
      expect(result.anomalies).toHaveLength(3);
      expect(result.anomalies[0].type).toBe('crypto_mining');
      expect(result.anomalies[0].riskScore).toBeGreaterThan(6);
    });

    it('should detect Tor access patterns', () => {
      const logs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user2,web_access,3g2upl4pq6kufc4m.onion',
        '2024-01-01 10:01:00,user2,dns_query,tor-relay.example.com'
      ];

      const result = detector.detectTraditional(logs);
      
      expect(result.anomalies).toHaveLength(2);
      expect(result.anomalies[0].type).toBe('tor_access');
      expect(result.anomalies[0].riskScore).toBeGreaterThan(7);
    });

    it('should detect authentication failures', () => {
      const logs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user3,auth_failure,invalid_password',
        '2024-01-01 10:00:30,user3,auth_failure,invalid_password',
        '2024-01-01 10:01:00,user3,auth_failure,invalid_password',
        '2024-01-01 10:01:30,user3,auth_failure,invalid_password',
        '2024-01-01 10:02:00,user3,auth_failure,invalid_password'
      ];

      const result = detector.detectTraditional(logs);
      
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].type).toBe('auth_failure');
      expect(result.anomalies[0].riskScore).toBeGreaterThan(6);
    });

    it('should detect geographic anomalies', () => {
      const logs = [
        'timestamp,user,action,source_ip,location',
        '2024-01-01 10:00:00,user4,login,192.168.1.1,US',
        '2024-01-01 10:05:00,user4,login,203.0.113.1,CN'
      ];

      const result = detector.detectTraditional(logs);
      
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].type).toBe('geographic_anomaly');
      expect(result.anomalies[0].riskScore).toBeGreaterThan(7);
    });

    it('should return empty results for normal logs', () => {
      const logs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user5,web_access,google.com',
        '2024-01-01 10:01:00,user5,web_access,github.com',
        '2024-01-01 10:02:00,user5,email_send,colleague@company.com'
      ];

      const result = detector.detectTraditional(logs);
      
      expect(result.anomalies).toHaveLength(0);
      expect(result.summary.total_logs_analyzed).toBe(3);
      expect(result.summary.anomalies_detected).toBe(0);
    });
  });

  describe('Advanced ML Detection', () => {
    it('should analyze behavioral patterns', () => {
      const logs = [
        'timestamp,user,action,bytes_transferred',
        '2024-01-01 10:00:00,user6,file_upload,1024',
        '2024-01-01 10:01:00,user6,file_upload,2048',
        '2024-01-01 10:02:00,user6,file_upload,104857600', // 100MB - anomalous
        '2024-01-01 10:03:00,user6,file_upload,1536'
      ];

      const result = detector.detectAdvancedML(logs);
      
      expect(result.anomalies.length).toBeGreaterThan(0);
      const dataExfiltrationAnomaly = result.anomalies.find(a => a.type === 'data_exfiltration');
      expect(dataExfiltrationAnomaly).toBeDefined();
      expect(dataExfiltrationAnomaly?.riskScore).toBeGreaterThan(7);
    });

    it('should detect time-based anomalies', () => {
      const logs = [
        'timestamp,user,action,details',
        '2024-01-01 02:30:00,user7,file_access,sensitive_document.pdf', // Off hours
        '2024-01-01 03:15:00,user7,database_query,SELECT * FROM users'
      ];

      const result = detector.detectAdvancedML(logs);
      
      expect(result.anomalies.length).toBeGreaterThan(0);
      const timeAnomaly = result.anomalies.find(a => a.type === 'time_anomaly');
      expect(timeAnomaly).toBeDefined();
      expect(timeAnomaly?.riskScore).toBeGreaterThan(5);
    });

    it('should analyze network traffic patterns', () => {
      const logs = [
        'timestamp,user,action,destination,bytes',
        '2024-01-01 10:00:00,user8,network_traffic,suspicious-domain.com,1048576',
        '2024-01-01 10:01:00,user8,network_traffic,suspicious-domain.com,2097152',
        '2024-01-01 10:02:00,user8,network_traffic,suspicious-domain.com,4194304'
      ];

      const result = detector.detectAdvancedML(logs);
      
      expect(result.anomalies.length).toBeGreaterThan(0);
      const networkAnomaly = result.anomalies.find(a => a.type === 'network_anomaly');
      expect(networkAnomaly).toBeDefined();
    });
  });

  describe('AI-Powered Detection', () => {
    it('should analyze logs using OpenAI', async () => {
      const logs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user9,web_access,mining-pool.example.com',
        '2024-01-01 10:01:00,user9,process_start,minergate.exe'
      ];

      const result = await detector.detectWithAI(logs, 'openai');
      
      expect(result.anomalies).toHaveLength(1);
      expect(result.anomalies[0].type).toBe('crypto_mining');
      expect(result.anomalies[0].riskScore).toBe(8.5);
      expect(result.anomalies[0].confidence).toBe(92);
    });

    it('should handle AI service errors gracefully', async () => {
      // Mock a failure
      const mockOpenAI = vi.mocked(await import('openai'));
      mockOpenAI.default = vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }));

      const logs = ['timestamp,user,action,details'];
      
      const result = await detector.detectWithAI(logs, 'openai');
      
      expect(result.anomalies).toHaveLength(0);
      expect(result.summary.total_logs_analyzed).toBe(0);
      expect(result.metadata?.error).toBeDefined();
    });

    it('should validate AI response format', async () => {
      // Mock invalid response
      const mockOpenAI = vi.mocked(await import('openai'));
      mockOpenAI.default = vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'Invalid JSON response'
                }
              }]
            })
          }
        }
      }));

      const logs = ['timestamp,user,action,details'];
      
      const result = await detector.detectWithAI(logs, 'openai');
      
      expect(result.anomalies).toHaveLength(0);
      expect(result.metadata?.error).toContain('Invalid AI response format');
    });
  });

  describe('Comprehensive Analysis', () => {
    it('should combine multiple detection methods', async () => {
      const logs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user10,web_access,mining-pool.com',
        '2024-01-01 02:30:00,user10,file_access,sensitive.pdf',
        '2024-01-01 10:02:00,user10,auth_failure,invalid_password'
      ];

      const traditionalResult = detector.detectTraditional(logs);
      const advancedResult = detector.detectAdvancedML(logs);
      const aiResult = await detector.detectWithAI(logs, 'openai');

      expect(traditionalResult.anomalies.length).toBeGreaterThan(0);
      expect(advancedResult.anomalies.length).toBeGreaterThan(0);
      expect(aiResult.anomalies.length).toBeGreaterThan(0);

      // Should detect different types across methods
      const allTypes = [
        ...traditionalResult.anomalies.map(a => a.type),
        ...advancedResult.anomalies.map(a => a.type),
        ...aiResult.anomalies.map(a => a.type)
      ];
      
      expect(new Set(allTypes).size).toBeGreaterThan(1);
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate appropriate risk scores', () => {
      const cryptoLogs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user11,web_access,mining-pool.com'
      ];

      const authLogs = [
        'timestamp,user,action,details',
        '2024-01-01 10:00:00,user12,auth_failure,invalid_password'
      ];

      const cryptoResult = detector.detectTraditional(cryptoLogs);
      const authResult = detector.detectTraditional(authLogs);

      expect(cryptoResult.anomalies[0].riskScore).toBeGreaterThan(authResult.anomalies[0].riskScore);
      expect(cryptoResult.anomalies[0].riskScore).toBeGreaterThanOrEqual(1);
      expect(cryptoResult.anomalies[0].riskScore).toBeLessThanOrEqual(10);
    });
  });
});