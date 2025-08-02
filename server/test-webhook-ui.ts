// Test webhook through the actual UI/API
import fetch from 'node-fetch';

async function testWebhookThroughAPI() {
  console.log('🌐 Testing webhook through actual API endpoints...\n');
  
  const baseUrl = 'http://localhost:5000';
  
  // Step 1: Create a test webhook through the API
  console.log('1️⃣ Creating webhook through API...');
  
  const webhookData = {
    name: 'Test Local Webhook',
    provider: 'custom',
    webhookUrl: 'http://localhost:3001/webhook/test',
    isActive: true,
    triggerConditions: {
      minRiskScore: 7.0,
      anomalyTypes: ['suspicious_access'],
      priorities: ['high', 'critical']
    }
  };
  
  try {
    const createResponse = await fetch(`${baseUrl}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie' // You'll need to get this from browser
      },
      body: JSON.stringify(webhookData)
    });
    
    if (createResponse.ok) {
      const webhook = await createResponse.json();
      console.log(`   ✅ Webhook created with ID: ${webhook.id}`);
      
      // Step 2: Test the webhook
      console.log('\n2️⃣ Testing webhook...');
      const testResponse = await fetch(`${baseUrl}/api/webhooks/${webhook.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=your-session-cookie'
        }
      });
      
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log(`   ✅ Webhook test successful: ${JSON.stringify(testResult)}`);
      } else {
        console.log(`   ❌ Webhook test failed: ${testResponse.status}`);
      }
      
    } else {
      console.log(`   ❌ Webhook creation failed: ${createResponse.status}`);
      const error = await createResponse.text();
      console.log(`   Error: ${error}`);
    }
    
  } catch (error) {
    console.log(`   ❌ API test failed: ${error.message}`);
    console.log('\n💡 Note: You need to be logged in to test webhooks through the API');
    console.log('   Open the browser, log in, and copy the session cookie to test this way');
  }
}

// Wait a moment for the webhook server to start, then test
setTimeout(() => {
  testWebhookThroughAPI();
}, 2000);