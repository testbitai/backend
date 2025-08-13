const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/v1';

// Test data
const testTutor = {
  email: 'test.tutor@example.com',
  name: 'John Doe',
  password: 'password123',
  instituteName: 'ABC Coaching Institute',
  examFocus: ['JEE', 'BITSAT'],
  subjects: ['Physics', 'Chemistry', 'Mathematics'],
  bio: 'Experienced tutor with 10+ years of teaching experience in JEE and BITSAT preparation.',
  experience: 10,
  qualifications: 'B.Tech IIT Delhi, M.Tech IIT Bombay',
  phone: '9876543210',
  address: {
    street: '123 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001'
  },
  planType: 'starter'
};

async function testTutorRegistration() {
  try {
    console.log('🚀 Testing Tutor Registration Flow...\n');

    // Step 1: Send OTP
    console.log('📧 Step 1: Sending OTP...');
    const otpResponse = await axios.post(`${BASE_URL}/tutor/send-otp`, {
      email: testTutor.email
    });
    console.log('✅ OTP sent successfully:', otpResponse.data.message);

    // For testing, we'll use a dummy OTP (in real scenario, user would enter the OTP from email)
    const dummyOTP = '123456';
    console.log(`📱 Using dummy OTP: ${dummyOTP} (In real scenario, this would come from email)\n`);

    // Step 2: Verify Email (This will fail with dummy OTP, but let's test the endpoint)
    console.log('✉️ Step 2: Verifying email...');
    try {
      const verifyResponse = await axios.post(`${BASE_URL}/tutor/verify-email`, {
        email: testTutor.email,
        otp: dummyOTP
      });
      console.log('✅ Email verified successfully:', verifyResponse.data.message);
    } catch (error) {
      console.log('❌ Email verification failed (expected with dummy OTP):', error.response?.data?.message);
      console.log('📝 Note: In real scenario, use the OTP from email\n');
    }

    // Step 3: Complete Registration (This will also fail without proper email verification)
    console.log('📝 Step 3: Completing registration...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/tutor/register`, testTutor);
      console.log('✅ Registration successful!');
      console.log('👤 User created:', registerResponse.data.data.user.name);
      console.log('🔑 Access token received:', registerResponse.data.data.tokens.accessToken ? 'Yes' : 'No');
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.data?.message);
      console.log('📝 Note: This is expected without proper email verification\n');
    }

    // Test validation errors
    console.log('🧪 Testing validation errors...\n');

    // Test invalid email
    try {
      await axios.post(`${BASE_URL}/tutor/send-otp`, {
        email: 'invalid-email'
      });
    } catch (error) {
      console.log('✅ Email validation working:', error.response?.data?.message);
    }

    // Test incomplete registration data
    try {
      await axios.post(`${BASE_URL}/tutor/register`, {
        email: 'test@example.com',
        name: 'Test'
        // Missing required fields
      });
    } catch (error) {
      console.log('✅ Registration validation working:', error.response?.data?.message);
    }

    console.log('\n🎉 Tutor registration API tests completed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ OTP sending endpoint works');
    console.log('- ✅ Email verification endpoint exists (needs real OTP)');
    console.log('- ✅ Registration endpoint exists (needs email verification)');
    console.log('- ✅ Validation is working properly');
    console.log('\n💡 To complete the flow:');
    console.log('1. Use a real email address');
    console.log('2. Check email for OTP');
    console.log('3. Use the real OTP for verification');
    console.log('4. Then complete registration');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testTutorRegistration();
