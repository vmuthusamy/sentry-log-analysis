import { TraditionalAnomalyDetector } from './services/traditional-anomaly-detector';
import fs from 'fs';

// Test the traditional anomaly detector with the crypto/Tor log file
const detector = new TraditionalAnomalyDetector();

// Parse a few sample entries from the crypto/Tor log
const sampleLogEntries = [
  {
    timestamp: '2025-07-31T09:44:00',
    sourceIp: '192.168.1.90',
    destinationIp: '112.21.174.39',
    url: 'https://zcash-pool-16.io/stratum',
    action: 'blocked',
    statusCode: '403',
    userAgent: 'Stratum/1.6.0',
    referer: '-',
    bytesSent: 429,
    bytesReceived: 349,
    duration: 4786,
    category: 'Cryptocurrency'
  },
  {
    timestamp: '2025-07-31T18:48:00',
    sourceIp: '192.168.1.131',
    destinationIp: '109.70.100.1',
    url: 'https://dark-3625.onion/connect',
    action: 'blocked',
    statusCode: '403',
    userAgent: 'Tor Browser/11.0',
    referer: '-',
    bytesSent: 1352,
    bytesReceived: 227,
    duration: 749,
    category: 'Proxy Avoidance'
  },
  {
    timestamp: '2025-07-31T12:17:00',
    sourceIp: '192.168.1.89',
    destinationIp: '229.65.203.116',
    url: 'https://ethereum-pool-1.net/stratum',
    action: 'blocked',
    statusCode: '403',
    userAgent: 'Stratum/1.6.0',
    referer: '-',
    bytesSent: 534,
    bytesReceived: 394,
    duration: 1074,
    category: 'Cryptocurrency'
  },
  {
    timestamp: '2025-07-31T10:57:00',
    sourceIp: '192.168.1.48',
    destinationIp: '54.239.28.85',
    url: 'https://amazon.com/products',
    action: 'allowed',
    statusCode: '200',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    referer: 'https://amazon.com',
    bytesSent: 732,
    bytesReceived: 7538,
    duration: 550,
    category: 'E-commerce'
  }
];

console.log('=== TRADITIONAL ANOMALY DETECTION TEST ===\n');
console.log('Testing with sample crypto/Tor log entries...\n');

const anomalies = detector.analyzeLogEntries(sampleLogEntries);

console.log(`Found ${anomalies.length} anomalies:\n`);

anomalies.forEach((anomaly, index) => {
  console.log(`${index + 1}. ${anomaly.anomalyType.toUpperCase()}`);
  console.log(`   Risk Score: ${anomaly.riskScore}/10`);
  console.log(`   Confidence: ${(anomaly.confidence * 100).toFixed(1)}%`);
  console.log(`   Severity: ${anomaly.metadata.severity.toUpperCase()}`);
  console.log(`   Description: ${anomaly.description}`);
  console.log(`   Source IP: ${anomaly.logEntry.sourceIp}`);
  console.log(`   URL: ${anomaly.logEntry.url}`);
  console.log(`   Detection Method: ${anomaly.metadata.detectionMethod}`);
  console.log(`   Triggers: ${anomaly.metadata.triggerRules.join(', ')}`);
  console.log(`   Recommendation: ${anomaly.recommendation}`);
  console.log('   ---');
});

console.log('\n=== DETECTION CAPABILITIES ===');
console.log('✓ Cryptocurrency mining detection (Stratum protocol, mining pools)');
console.log('✓ Tor/Dark web access detection (.onion domains, Tor Browser)'); 
console.log('✓ Blocked traffic analysis with risk scoring');
console.log('✓ Suspicious category filtering');
console.log('✓ URL pattern matching (mining pools, crypto domains)');
console.log('✓ User agent analysis (mining software, Tor browser)');
console.log('✓ Statistical anomaly detection (high volume IPs)');
console.log('✓ Time-based anomaly detection (off-hours activity)');
console.log('✓ Rule-based risk scoring with confidence levels');
console.log('✓ Comprehensive metadata and recommendations');