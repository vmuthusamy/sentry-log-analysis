// Test webhook integration with actual service
import { webhookService } from './services/webhook-service';

async function demonstrateWebhookFlow() {
  console.log('🧪 WEBHOOK INTEGRATION DEMONSTRATION\n');
  
  // Create a test webhook configuration
  const testWebhook = {
    id: 'demo-webhook-123',
    userId: 'demo-user',
    name: 'Local Test Webhook',
    provider: 'custom' as const,
    webhookUrl: 'http://localhost:3001/webhook/test',
    isActive: true,
    triggerConditions: {
      minRiskScore: 7.0,
      anomalyTypes: ['suspicious_access', 'malware_detection'],
      priorities: ['high', 'critical'] as const
    },
    payloadTemplate: {
      alertType: 'security_anomaly',
      source: 'sentry_log_analyzer',
      environment: 'production'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('📋 Webhook Configuration:');
  console.log(`   Name: ${testWebhook.name}`);
  console.log(`   URL: ${testWebhook.webhookUrl}`);
  console.log(`   Trigger: Risk ≥ ${testWebhook.triggerConditions.minRiskScore}`);
  console.log(`   Types: ${testWebhook.triggerConditions.anomalyTypes?.join(', ')}`);
  
  // Test webhook connectivity first
  console.log('\n🔌 Testing webhook connectivity...');
  try {
    const connectivityTest = await webhookService.testWebhook(testWebhook);
    console.log(`   Status: ${connectivityTest.success ? '✅ CONNECTED' : '❌ FAILED'}`);
    console.log(`   Response: ${connectivityTest.responseTime}ms`);
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    return;
  }
  
  // Create test anomaly scenarios
  const scenarios = [
    {
      name: 'High Risk Suspicious Access',
      anomaly: {
        id: 'test-1',
        userId: 'demo-user',
        logFileId: 'log-1',
        anomalyType: 'suspicious_access',
        description: 'Multiple failed login attempts from suspicious IP',
        riskScore: 9.2,
        confidence: 0.95,
        detectionMethod: 'ai_powered',
        timestamp: new Date(),
        sourceData: {
          sourceIp: '185.220.101.42',
          targetUser: 'admin',
          attempts: 25,
          country: 'Unknown'
        },
        status: 'pending',
        priority: 'critical'
      },
      shouldTrigger: true
    },
    {
      name: 'Medium Risk Data Access',
      anomaly: {
        id: 'test-2',
        userId: 'demo-user',
        logFileId: 'log-2', 
        anomalyType: 'data_access',
        description: 'Unusual data access pattern detected',
        riskScore: 6.5,
        confidence: 0.78,
        detectionMethod: 'traditional_ml',
        timestamp: new Date(),
        sourceData: {
          userId: 'john.doe',
          filesAccessed: 150,
          timeOfDay: '3:00 AM'
        },
        status: 'pending',
        priority: 'medium'
      },
      shouldTrigger: false
    },
    {
      name: 'Critical Malware Detection',
      anomaly: {
        id: 'test-3',
        userId: 'demo-user',
        logFileId: 'log-3',
        anomalyType: 'malware_detection',
        description: 'Potential malware communication detected',
        riskScore: 8.7,
        confidence: 0.89,
        detectionMethod: 'ai_powered',
        timestamp: new Date(),
        sourceData: {
          command: 'powershell -enc SGVsbG8gV29ybGQ=',
          process: 'suspicious.exe',
          parentProcess: 'explorer.exe'
        },
        status: 'pending',
        priority: 'critical'
      },
      shouldTrigger: true
    }
  ];
  
  console.log('\n🎯 Testing trigger scenarios...\n');
  
  for (const scenario of scenarios) {
    console.log(`📊 Scenario: ${scenario.name}`);
    console.log(`   Risk Score: ${scenario.anomaly.riskScore}`);
    console.log(`   Type: ${scenario.anomaly.anomalyType}`);
    console.log(`   Priority: ${scenario.anomaly.priority}`);
    
    // Check if it should trigger
    const shouldTrigger = webhookService.checkTriggerConditions(
      scenario.anomaly, 
      testWebhook.triggerConditions
    );
    
    console.log(`   Expected: ${scenario.shouldTrigger ? 'TRIGGER' : 'SKIP'}`);
    console.log(`   Actual: ${shouldTrigger ? 'TRIGGER' : 'SKIP'}`);
    console.log(`   Result: ${shouldTrigger === scenario.shouldTrigger ? '✅ PASS' : '❌ FAIL'}`);
    
    if (shouldTrigger) {
      console.log(`   🚀 Triggering webhook...`);
      try {
        const result = await webhookService.triggerWebhook(testWebhook, scenario.anomaly);
        console.log(`   📡 Response: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.responseTime}ms)`);
      } catch (error) {
        console.log(`   ❌ Trigger failed: ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  console.log('✅ Webhook integration test completed!');
  console.log('\n💡 The webhook server is now running and ready to receive calls');
  console.log('   You can create webhooks in the UI using: http://localhost:3001/webhook/test');
}

// Run the demonstration
demonstrateWebhookFlow().catch(console.error);