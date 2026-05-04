
import { config } from 'dotenv';
config();

const API_URL = process.env.BACKEND_URL || 'http://localhost:4000/api';

async function testEndpoint(name, path, method = 'GET', body = null, token = null) {
  console.log(`Testing [${name}] - ${method} ${path}...`);
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : null,
    };
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ Success: ${response.status}`);
    } else {
      console.log(`⚠️ Expected Error/Status: ${response.status} - ${data.error || data.message || 'No error msg'}`);
      // Special check for our fix: /posts/explore should NOT return 404 if route is correct
      if (path === '/posts/explore' && response.status === 404) {
        console.error('❌ BUG: /posts/explore returned 404! Route conflict still exists.');
      } else if (path === '/posts/explore' && response.status === 401) {
        console.log('✅ Fix Verified: /posts/explore hit auth middleware (returned 401), not post/:id (404).');
      }
    }
    return { status: response.status, data };
  } catch (error) {
    console.error(`❌ Connection Failed: ${error.message}`);
    return { status: 0, error };
  }
}

async function runTests() {
  console.log('🚀 Starting API Route Tests...\n');

  // 1. Health Check
  await testEndpoint('Health Check', '/health');

  // 2. Auth Endpoints
  await testEndpoint('Login (Empty)', '/auth/login', 'POST', {});
  await testEndpoint('Register (Empty)', '/auth/register', 'POST', {});

  // 3. Feed & Explore (Testing the fix)
  await testEndpoint('Home Feed', '/feed');
  await testEndpoint('Explore Feed', '/posts/explore'); // This was the broken one

  // 4. Social
  await testEndpoint('Social Requests', '/social/requests');
  await testEndpoint('Social Contacts', '/social/contacts');

  // 5. Messages
  await testEndpoint('Message Threads', '/messages/threads');

  // 6. User Standardized Route
  await testEndpoint('Users Profile', '/users/me');
  await testEndpoint('Old User Profile (Should 404)', '/user/me');

  console.log('\n🏁 Tests Finished.');
}

runTests();
