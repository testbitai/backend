const http = require('http');

const testEndpoint = (path, expectedStatus = 401) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: `/api/v1${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ ${path} - Status: ${res.statusCode} - ${response.message || 'OK'}`);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          console.log(`✅ ${path} - Status: ${res.statusCode} - Raw response`);
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${path} - Error: ${err.message}`);
      resolve({ error: err.message });
    });

    req.setTimeout(5000, () => {
      console.log(`⏰ ${path} - Timeout`);
      req.destroy();
      resolve({ error: 'Timeout' });
    });

    req.end();
  });
};

const runTests = async () => {
  console.log('🧪 Testing API Routes...\n');
  
  // Wait for server to start
  console.log('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const endpoints = [
    '/health/health',
    '/admin/students/stats',
    '/admin/students',
    '/admin/tutors/stats',
    '/admin/tutors',
  ];
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }
  
  console.log('\n🎉 Route testing completed!');
};

runTests().catch(console.error);
