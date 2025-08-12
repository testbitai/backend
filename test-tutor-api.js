// Simple test script to verify tutor API endpoints
// Run this after starting the server: node test-tutor-api.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testTutorAPI() {
  console.log('🧪 Testing Tutor Management API...\n');

  try {
    // Test 1: Get all tutors
    console.log('1️⃣ Testing GET /admin/tutors');
    const tutorsResponse = await axios.get(`${BASE_URL}/admin/tutors`);
    console.log(`✅ Status: ${tutorsResponse.status}`);
    console.log(`📊 Found ${tutorsResponse.data.data.pagination.totalCount} tutors`);
    console.log(`📈 Stats: ${JSON.stringify(tutorsResponse.data.data.stats, null, 2)}\n`);

    // Test 2: Get tutor stats
    console.log('2️⃣ Testing GET /admin/tutors/stats');
    const statsResponse = await axios.get(`${BASE_URL}/admin/tutors/stats`);
    console.log(`✅ Status: ${statsResponse.status}`);
    console.log(`📊 Stats: ${JSON.stringify(statsResponse.data.data, null, 2)}\n`);

    // Test 3: Search tutors
    console.log('3️⃣ Testing GET /admin/tutors with search');
    const searchResponse = await axios.get(`${BASE_URL}/admin/tutors?search=rajesh&status=active&limit=5`);
    console.log(`✅ Status: ${searchResponse.status}`);
    console.log(`🔍 Search results: ${searchResponse.data.data.tutors.length} tutors found\n`);

    // Test 4: Get single tutor (if any exist)
    if (tutorsResponse.data.data.tutors.length > 0) {
      const tutorId = tutorsResponse.data.data.tutors[0]._id;
      console.log('4️⃣ Testing GET /admin/tutors/:tutorId');
      const tutorResponse = await axios.get(`${BASE_URL}/admin/tutors/${tutorId}`);
      console.log(`✅ Status: ${tutorResponse.status}`);
      console.log(`👤 Tutor: ${tutorResponse.data.data.name} (${tutorResponse.data.data.email})\n`);
    }

    console.log('🎉 All tests passed! Tutor API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend server is running on port 5000');
      console.log('   Run: npm run dev (in backend directory)');
    }
  }
}

// Run tests
testTutorAPI();
