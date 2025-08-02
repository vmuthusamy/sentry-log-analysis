const { db } = require('./server/db.ts');
const { anomalies } = require('./shared/schema.ts');
const { eq, and } = require('drizzle-orm');

async function testAnomalyUpdate() {
  console.log('🧪 Testing anomaly update functionality...\n');
  
  try {
    // 1. Get an existing anomaly
    console.log('1. Fetching existing anomaly...');
    const existingAnomalies = await db
      .select()
      .from(anomalies)
      .limit(1);
    
    if (existingAnomalies.length === 0) {
      console.log('❌ No anomalies found in database');
      return;
    }
    
    const anomaly = existingAnomalies[0];
    console.log(`✅ Found anomaly: ${anomaly.id}`);
    console.log(`   Current status: ${anomaly.status}`);
    console.log(`   Current priority: ${anomaly.priority || 'null'}`);
    console.log(`   User ID: ${anomaly.userId}`);
    
    // 2. Test direct database update
    console.log('\n2. Testing direct database update...');
    const originalStatus = anomaly.status;
    const originalPriority = anomaly.priority;
    const newStatus = 'confirmed';
    const newPriority = 'high';
    
    await db
      .update(anomalies)
      .set({
        status: newStatus,
        priority: newPriority,
        analystNotes: 'Test update from script',
        reviewedBy: anomaly.userId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(anomalies.id, anomaly.id));
    
    console.log('✅ Database update completed');
    
    // 3. Verify the update
    console.log('\n3. Verifying update...');
    const [updatedAnomaly] = await db
      .select()
      .from(anomalies)
      .where(eq(anomalies.id, anomaly.id));
    
    if (updatedAnomaly.status === newStatus && updatedAnomaly.priority === newPriority) {
      console.log('✅ Update verified successfully');
      console.log(`   New status: ${updatedAnomaly.status}`);
      console.log(`   New priority: ${updatedAnomaly.priority}`);
      console.log(`   Analyst notes: ${updatedAnomaly.analystNotes}`);
    } else {
      console.log('❌ Update verification failed');
      console.log(`   Expected status: ${newStatus}, got: ${updatedAnomaly.status}`);
      console.log(`   Expected priority: ${newPriority}, got: ${updatedAnomaly.priority}`);
    }
    
    // 4. Test API endpoint (without authentication for now)
    console.log('\n4. Testing API endpoint structure...');
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:5000/api/anomalies/' + anomaly.id, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'under_review',
        priority: 'medium',
        analystNotes: 'API test update'
      })
    });
    
    console.log(`   API Response status: ${response.status}`);
    const responseBody = await response.text();
    console.log(`   API Response body: ${responseBody}`);
    
    // 5. Restore original values
    console.log('\n5. Restoring original values...');
    await db
      .update(anomalies)
      .set({
        status: originalStatus,
        priority: originalPriority,
        analystNotes: null,
        reviewedBy: null,
        reviewedAt: null
      })
      .where(eq(anomalies.id, anomaly.id));
    
    console.log('✅ Original values restored');
    console.log('\n🎉 Anomaly update test completed!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testAnomalyUpdate();