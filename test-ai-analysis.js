const axios = require('axios');

// Test the AI Analysis API endpoint
async function testAIAnalysis() {
  const baseURL = 'http://localhost:5001/api/v1';
  
  try {
    console.log('🧠 Testing AI Analysis System...\n');
    
    // You'll need to replace these with actual values from your database
    const testAttemptId = 'your_test_attempt_id_here';
    const authToken = 'your_jwt_token_here';
    
    console.log('📊 Generating AI Analysis...');
    console.log(`Test Attempt ID: ${testAttemptId}`);
    
    const response = await axios.get(
      `${baseURL}/test/ai-analysis/${testAttemptId}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ AI Analysis Generated Successfully!\n');
      
      const analysis = response.data.data;
      
      // Display key insights
      console.log('📈 Overall Performance:');
      console.log(`   Grade: ${analysis.overallPerformance.grade}`);
      console.log(`   Percentile: ${analysis.overallPerformance.percentile}th`);
      console.log(`   Strengths: ${analysis.overallPerformance.strengths.join(', ')}`);
      console.log(`   Weaknesses: ${analysis.overallPerformance.weaknesses.join(', ')}\n`);
      
      console.log('🎯 Topic Analysis:');
      analysis.topicAnalysis.forEach(topic => {
        console.log(`   ${topic.topic} (${topic.subject}): ${topic.accuracy.toFixed(1)}% - ${topic.performance}`);
      });
      
      console.log('\n💡 AI Recommendations:');
      analysis.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority}] ${rec.title}`);
        console.log(`      ${rec.description}`);
      });
      
      console.log('\n📚 Study Plan:');
      console.log('   Immediate (1-2 days):');
      analysis.studyPlan.immediate.forEach(task => {
        console.log(`     • ${task}`);
      });
      
      console.log('   Short-term (1-2 weeks):');
      analysis.studyPlan.shortTerm.forEach(task => {
        console.log(`     • ${task}`);
      });
      
      console.log('   Long-term (1-2 months):');
      analysis.studyPlan.longTerm.forEach(task => {
        console.log(`     • ${task}`);
      });
      
      console.log('\n⏱️ Time Management:');
      console.log(`   Efficiency: ${analysis.timeManagementAnalysis.efficiency.toFixed(0)}%`);
      console.log(`   Pacing: ${analysis.timeManagementAnalysis.pacing}`);
      
    } else {
      console.log('❌ Failed to generate AI analysis');
      console.log('Response:', response.data);
    }
    
  } catch (error) {
    console.log('❌ Error testing AI analysis:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
      
      if (error.response.status === 401) {
        console.log('\n💡 Tip: Make sure you have a valid JWT token');
        console.log('   1. Login as a student');
        console.log('   2. Copy the JWT token from localStorage or API response');
        console.log('   3. Update the authToken variable in this script');
      }
      
      if (error.response.status === 404) {
        console.log('\n💡 Tip: Make sure the test attempt ID exists');
        console.log('   1. Complete a test as a student');
        console.log('   2. Get the test attempt ID from the database');
        console.log('   3. Update the testAttemptId variable in this script');
      }
      
    } else {
      console.log('Error:', error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('\n💡 Tip: Make sure the backend server is running');
        console.log('   Run: npm run dev (in backend directory)');
      }
    }
  }
}

// Instructions for setup
console.log('🚀 AI Analysis Test Script');
console.log('==========================\n');
console.log('Before running this test:');
console.log('1. Make sure backend server is running (npm run dev)');
console.log('2. Set your OpenAI API key in backend/.env');
console.log('3. Update testAttemptId and authToken variables in this script');
console.log('4. Make sure you have completed at least one test\n');

// Check if required variables are set
const testAttemptId = 'your_test_attempt_id_here';
const authToken = 'your_jwt_token_here';

if (testAttemptId === 'your_test_attempt_id_here' || authToken === 'your_jwt_token_here') {
  console.log('⚠️  Please update the testAttemptId and authToken variables first!');
  console.log('   Edit this file and replace the placeholder values.\n');
} else {
  testAIAnalysis();
}

module.exports = { testAIAnalysis };
