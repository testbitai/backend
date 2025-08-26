const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test if dashboard endpoints are accessible (without auth for now)
const testEndpoints = async () => {
  const endpoints = [
    '/dashboard/stats',
    '/dashboard/activities',
    '/dashboard/subject-progress',
    '/dashboard/upcoming-tests',
    '/dashboard/streak',
    '/dashboard/performance'
  ];

  console.log('Testing dashboard endpoints...\n');

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`);
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`🔒 ${endpoint} - Protected (401 Unauthorized) - This is expected`);
      } else if (error.response?.status === 404) {
        console.log(`❌ ${endpoint} - Not Found (404)`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${error.response?.status || error.message}`);
      }
    }
  }
};

// Test health endpoint
const testHealth = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log(`✅ Health check - Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data)}\n`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}\n`);
  }
};

const runTests = async () => {
  console.log('🚀 Testing TestBit Backend Endpoints\n');
  
  await testHealth();
  await testEndpoints();
  
  console.log('\n📝 Notes:');
  console.log('- 401 Unauthorized responses are expected for dashboard endpoints');
  console.log('- These endpoints require JWT authentication');
  console.log('- Use a valid JWT token to test actual functionality');
};

runTests().catch(console.error);
