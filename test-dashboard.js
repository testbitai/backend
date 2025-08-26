// Simple test script to verify dashboard endpoints are working
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test endpoints (you'll need a valid JWT token)
const testEndpoints = async () => {
  const token = 'your-jwt-token-here'; // Replace with actual token
  
  const endpoints = [
    '/dashboard/stats',
    '/dashboard/activities?limit=5',
    '/dashboard/subject-progress',
    '/dashboard/upcoming-tests?limit=3',
    '/dashboard/streak',
    '/dashboard/performance?period=30d'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      console.log(`   Data keys: ${Object.keys(response.data.data || {}).join(', ')}`);
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.response?.status || error.message}`);
    }
  }
};

// Uncomment and add a valid token to test
// testEndpoints();

console.log('Dashboard endpoints test script ready.');
console.log('Update the token variable and uncomment testEndpoints() to run tests.');
