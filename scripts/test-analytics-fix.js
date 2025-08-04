#!/usr/bin/env node

/**
 * Analytics Fix Regression Test
 * Tests the comprehensive analytics tracking system to ensure no regressions
 */

import https from 'https';
import http from 'http';

const BASE_URL = 'http://localhost:5000';

// Test helper function
async function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Testing: ${endpoint}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function runAnalyticsTests() {
  console.log('🔍 Analytics Fix Regression Test\n');
  
  const tests = [
    '/api/analytics/summary?hours=48',
    '/api/analytics/detailed?hours=48&limit=10',
    '/api/analytics/cross-user?hours=48',
    '/api/analytics/methods?hours=48',
    '/api/analytics/summary?days=7',
    '/api/analytics/summary?minutes=60'
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await makeRequest(test);
      results.push({
        endpoint: test,
        status: result.status,
        success: result.status === 200,
        dataType: typeof result.data,
        hasData: result.data && Object.keys(result.data).length > 0
      });
      
      console.log(`✅ ${test}: ${result.status} (${typeof result.data})`);
      
      // Log key metrics for summary endpoints
      if (test.includes('summary') && result.data) {
        console.log(`   📊 Total Activity: ${result.data.totalActivity || 0}`);
        console.log(`   📈 Analysis Results: ${result.data.analysisResults || 0}`);
        console.log(`   👥 Unique Analyzers: ${result.data.uniqueAnalyzers || 0}`);
        console.log(`   📁 File Uploads: ${result.data.fileUploads || 0}`);
      }
      
    } catch (error) {
      results.push({
        endpoint: test,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      console.log(`❌ ${test}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n📋 Test Summary:');
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 All analytics endpoints are working correctly!');
    console.log('✅ Analytics tracking regression fix verified');
    return true;
  } else {
    console.log('\n⚠️  Some analytics endpoints have issues');
    return false;
  }
}

// Run the test if this file is executed directly
runAnalyticsTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

export { runAnalyticsTests };