const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test function to verify student API endpoints
async function testStudentAPI() {
  try {
    console.log('🧪 Testing Student Management API Endpoints...\n');

    // Test 1: Get student statistics
    console.log('1. Testing GET /admin/students/stats');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/admin/students/stats`);
      console.log('✅ Stats endpoint working');
      console.log('📊 Sample stats:', JSON.stringify(statsResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ Stats endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Get all students with default parameters
    console.log('2. Testing GET /admin/students');
    try {
      const studentsResponse = await axios.get(`${BASE_URL}/admin/students`);
      console.log('✅ Students list endpoint working');
      console.log('👥 Total students found:', studentsResponse.data.data.pagination.totalCount);
      console.log('📄 Students per page:', studentsResponse.data.data.students.length);
    } catch (error) {
      console.log('❌ Students list endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Get students with filters
    console.log('3. Testing GET /admin/students with filters');
    try {
      const filteredResponse = await axios.get(`${BASE_URL}/admin/students`, {
        params: {
          page: 1,
          limit: 5,
          status: 'active',
          sortBy: 'name',
          sortOrder: 'asc'
        }
      });
      console.log('✅ Filtered students endpoint working');
      console.log('🔍 Filtered results:', filteredResponse.data.data.students.length, 'students');
    } catch (error) {
      console.log('❌ Filtered students endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Export students data
    console.log('4. Testing GET /admin/students/export');
    try {
      const exportResponse = await axios.get(`${BASE_URL}/admin/students/export`);
      console.log('✅ Export endpoint working');
      console.log('📤 Export data length:', exportResponse.data.data.length);
    } catch (error) {
      console.log('❌ Export endpoint failed:', error.response?.data?.message || error.message);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Test invalid student ID
    console.log('5. Testing GET /admin/students/invalid-id');
    try {
      await axios.get(`${BASE_URL}/admin/students/invalid-id`);
      console.log('❌ Should have failed with invalid ID');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid ID properly rejected');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n🎉 Student API testing completed!\n');

  } catch (error) {
    console.error('💥 Test setup failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 5000');
  }
}

// Run the tests
testStudentAPI();
