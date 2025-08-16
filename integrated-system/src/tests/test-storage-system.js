/**
 * Storage Management System Test
 * Tests all storage-related functionality
 */

const dotenv = require('dotenv');
dotenv.config();

const API_BASE = `http://localhost:${process.env.PORT || 3001}/api`;
let authToken = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

async function login() {
  console.log(`${colors.blue}Logging in...${colors.reset}`);
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@dockettrack.gov',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    if (data.success && data.token) {
      authToken = data.token;
      console.log(`${colors.green}✓ Login successful${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ Login failed: ${data.error}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ Login error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testEndpoint(name, method, endpoint, body) {
  console.log(`\n${colors.yellow}Testing: ${name}${colors.reset}`);
  try {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    
    if (response.ok && data.success !== false) {
      console.log(`${colors.green}✓ ${name} - Status: ${response.status}${colors.reset}`);
      if (data.data) {
        console.log(`  Data: ${JSON.stringify(data.data).substring(0, 100)}...`);
      }
      return { success: true, data: data.data || data };
    } else {
      console.log(`${colors.red}✗ ${name} - Status: ${response.status}, Error: ${data.error || 'Unknown'}${colors.reset}`);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.log(`${colors.red}✗ ${name} - Error: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

async function runStorageTests() {
  console.log(`\n${colors.magenta}=== Storage Management System Tests ===${colors.reset}\n`);
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log(`${colors.red}Cannot proceed without authentication${colors.reset}`);
    return;
  }
  
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  // Test Storage Statistics
  const stats = await testEndpoint(
    'Get Storage Statistics',
    'GET',
    '/storage-db/statistics'
  );
  testResults.total++;
  if (stats.success) testResults.passed++; else testResults.failed++;
  
  // Test Storage Zones
  const zones = await testEndpoint(
    'Get Storage Zones',
    'GET',
    '/storage-db/zones'
  );
  testResults.total++;
  if (zones.success) testResults.passed++; else testResults.failed++;
  
  // Test Storage Boxes
  const boxes = await testEndpoint(
    'Get Storage Boxes',
    'GET',
    '/storage-db/boxes'
  );
  testResults.total++;
  if (boxes.success) testResults.passed++; else testResults.failed++;
  
  // Test Create Storage Box
  const newBox = await testEndpoint(
    'Create Storage Box',
    'POST',
    '/storage-db/boxes',
    {
      client_id: 1,
      zone_id: 1,
      capacity: 100,
      box_type: 'standard'
    }
  );
  testResults.total++;
  if (newBox.success) testResults.passed++; else testResults.failed++;
  
  let boxId = newBox.data?.id;
  
  // Test Update Storage Box
  if (boxId) {
    const updateBox = await testEndpoint(
      'Update Storage Box',
      'PUT',
      `/storage-db/boxes/${boxId}`,
      {
        capacity: 150,
        status: 'active'
      }
    );
    testResults.total++;
    if (updateBox.success) testResults.passed++; else testResults.failed++;
  }
  
  // Test Retrieval Requests
  const requests = await testEndpoint(
    'Get Retrieval Requests',
    'GET',
    '/storage-db/requests/retrieval'
  );
  testResults.total++;
  if (requests.success) testResults.passed++; else testResults.failed++;
  
  // Test Create Retrieval Request
  const newRequest = await testEndpoint(
    'Create Retrieval Request',
    'POST',
    '/storage-db/requests/retrieval',
    {
      client_id: 1,
      docket_ids: [1, 2, 3],
      urgency: 'normal',
      notes: 'Test retrieval request'
    }
  );
  testResults.total++;
  if (newRequest.success) testResults.passed++; else testResults.failed++;
  
  // Test Extended Routes
  
  // Test Clients
  const clients = await testEndpoint(
    'Get Clients',
    'GET',
    '/storage-db/clients'
  );
  testResults.total++;
  if (clients.success) testResults.passed++; else testResults.failed++;
  
  // Test Invoices
  const invoices = await testEndpoint(
    'Get Invoices',
    'GET',
    '/storage-db/invoices'
  );
  testResults.total++;
  if (invoices.success) testResults.passed++; else testResults.failed++;
  
  // Test Billing Calculation
  const billing = await testEndpoint(
    'Calculate Billing',
    'GET',
    '/storage-db/billing/calculate/1?month=1&year=2024'
  );
  testResults.total++;
  if (billing.success) testResults.passed++; else testResults.failed++;
  
  // Test Box Search
  const searchBoxes = await testEndpoint(
    'Search Boxes',
    'GET',
    '/storage-db/boxes/search?q=BOX'
  );
  testResults.total++;
  if (searchBoxes.success) testResults.passed++; else testResults.failed++;
  
  // Test Utilization Report
  const utilization = await testEndpoint(
    'Get Utilization Report',
    'GET',
    '/storage-db/reports/utilization'
  );
  testResults.total++;
  if (utilization.success) testResults.passed++; else testResults.failed++;
  
  // Test Billing Report
  const billingReport = await testEndpoint(
    'Get Billing Report',
    'GET',
    '/storage-db/reports/billing'
  );
  testResults.total++;
  if (billingReport.success) testResults.passed++; else testResults.failed++;
  
  // Test Legacy Storage Routes
  const dashboard = await testEndpoint(
    'Get Storage Dashboard',
    'GET',
    '/storage/dashboard'
  );
  testResults.total++;
  if (dashboard.success) testResults.passed++; else testResults.failed++;
  
  const analytics = await testEndpoint(
    'Get Storage Analytics',
    'GET',
    '/storage/analytics'
  );
  testResults.total++;
  if (analytics.success) testResults.passed++; else testResults.failed++;
  
  // Summary
  console.log(`\n${colors.magenta}=== Test Summary ===${colors.reset}`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    console.log(`\n${colors.green}🎉 All storage system tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️ Some tests failed. Please review the errors above.${colors.reset}`);
  }
}

// Run the tests
runStorageTests().catch(error => {
  console.error(`${colors.red}Test execution failed: ${error}${colors.reset}`);
  process.exit(1);
});