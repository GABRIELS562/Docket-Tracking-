// Load Testing Script for RFID Docket Tracking System
// Tests system performance with 100k+ records and high concurrent load

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '50');
const TEST_DURATION = parseInt(process.env.TEST_DURATION || '300'); // 5 minutes
const RAMP_UP_TIME = parseInt(process.env.RAMP_UP_TIME || '60'); // 1 minute

let authToken = '';
let testResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  maxResponseTime: 0,
  minResponseTime: Infinity,
  responseTimes: [],
  errorCounts: {},
  throughput: 0,
  startTime: null,
  endTime: null
};

// Test scenarios
const scenarios = [
  { name: 'login', weight: 5, endpoint: '/auth/login', method: 'POST' },
  { name: 'list_objects', weight: 30, endpoint: '/objects', method: 'GET' },
  { name: 'get_object', weight: 25, endpoint: '/objects/{id}', method: 'GET' },
  { name: 'search_objects', weight: 20, endpoint: '/objects?search={query}', method: 'GET' },
  { name: 'create_object', weight: 10, endpoint: '/objects', method: 'POST' },
  { name: 'update_object', weight: 8, endpoint: '/objects/{id}', method: 'PUT' },
  { name: 'get_object_history', weight: 2, endpoint: '/objects/{id}/history', method: 'GET' }
];

// Generate test data
function generateObjectData(index) {
  const types = ['docket', 'evidence', 'equipment', 'file', 'tool'];
  const categories = ['criminal', 'civil', 'administrative', 'forensic'];
  const priorities = ['low', 'normal', 'high', 'critical'];
  
  return {
    object_code: `LOAD-TEST-${Date.now()}-${index}`,
    name: `Load Test Object ${index}`,
    description: `Generated object for load testing - ${new Date().toISOString()}`,
    object_type: types[Math.floor(Math.random() * types.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    priority_level: priorities[Math.floor(Math.random() * priorities.length)],
    metadata: {
      test_run: true,
      created_by_load_test: true,
      timestamp: new Date().toISOString()
    }
  };
}

// Generate search queries
function generateSearchQuery() {
  const queries = [
    'docket', 'evidence', 'criminal', 'test', 'load', 'system',
    'tracking', 'RFID', 'forensic', 'investigation'
  ];
  return queries[Math.floor(Math.random() * queries.length)];
}

// Authentication setup
async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@dockettrack.gov',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Authentication successful');
      return true;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Execute a single request
async function executeRequest(scenario, objectIds = []) {
  const startTime = Date.now();
  let endpoint = scenario.endpoint;
  let data = null;
  
  // Replace placeholders in endpoint
  if (endpoint.includes('{id}') && objectIds.length > 0) {
    const randomId = objectIds[Math.floor(Math.random() * objectIds.length)];
    endpoint = endpoint.replace('{id}', randomId);
  }
  
  if (endpoint.includes('{query}')) {
    endpoint = endpoint.replace('{query}', generateSearchQuery());
  }
  
  // Prepare request data for POST/PUT
  if (scenario.method === 'POST' && scenario.name === 'create_object') {
    data = generateObjectData(Math.floor(Math.random() * 1000000));
  } else if (scenario.method === 'PUT' && scenario.name === 'update_object') {
    data = {
      name: `Updated Object ${Date.now()}`,
      description: `Updated during load test at ${new Date().toISOString()}`
    };
  } else if (scenario.method === 'POST' && scenario.name === 'login') {
    data = {
      email: 'admin@dockettrack.gov',
      password: 'admin123'
    };
  }
  
  try {
    const config = {
      method: scenario.method,
      url: `${BASE_URL}${endpoint}`,
      timeout: 30000, // 30 second timeout
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    const responseTime = Date.now() - startTime;
    
    testResults.totalRequests++;
    testResults.successfulRequests++;
    testResults.responseTimes.push(responseTime);
    testResults.maxResponseTime = Math.max(testResults.maxResponseTime, responseTime);
    testResults.minResponseTime = Math.min(testResults.minResponseTime, responseTime);
    
    // Extract object ID for future requests
    if (scenario.name === 'create_object' && response.data.success && response.data.data) {
      objectIds.push(response.data.data.id);
    }
    
    return { success: true, responseTime, status: response.status };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    testResults.totalRequests++;
    testResults.failedRequests++;
    
    const errorType = error.response?.status || error.code || 'unknown';
    testResults.errorCounts[errorType] = (testResults.errorCounts[errorType] || 0) + 1;
    
    return { success: false, responseTime, error: errorType };
  }
}

// Select scenario based on weight
function selectScenario() {
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const scenario of scenarios) {
    random -= scenario.weight;
    if (random <= 0) {
      return scenario;
    }
  }
  
  return scenarios[0]; // fallback
}

// Virtual user simulation
async function simulateUser(userId, objectIds) {
  const userStartTime = Date.now();
  console.log(`🚀 User ${userId} started`);
  
  while (Date.now() - testResults.startTime < TEST_DURATION * 1000) {
    const scenario = selectScenario();
    const result = await executeRequest(scenario, objectIds);
    
    // Add some realistic delay between requests (1-3 seconds)
    const delay = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  const userDuration = Date.now() - userStartTime;
  console.log(`✅ User ${userId} completed (${Math.round(userDuration / 1000)}s)`);
}

// Progress reporting
function startProgressReporting() {
  const interval = setInterval(() => {
    const elapsed = (Date.now() - testResults.startTime) / 1000;
    const requestsPerSecond = testResults.totalRequests / elapsed;
    const avgResponseTime = testResults.responseTimes.length > 0 
      ? testResults.responseTimes.reduce((a, b) => a + b, 0) / testResults.responseTimes.length 
      : 0;
    
    console.log(`📊 Progress: ${Math.round(elapsed)}s | Requests: ${testResults.totalRequests} | RPS: ${requestsPerSecond.toFixed(2)} | Avg RT: ${avgResponseTime.toFixed(2)}ms | Success Rate: ${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%`);
  }, 10000); // Report every 10 seconds
  
  return interval;
}

// Generate detailed report
function generateReport() {
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  testResults.throughput = testResults.totalRequests / duration;
  testResults.averageResponseTime = testResults.responseTimes.length > 0
    ? testResults.responseTimes.reduce((a, b) => a + b, 0) / testResults.responseTimes.length
    : 0;
  
  // Calculate percentiles
  const sortedTimes = testResults.responseTimes.sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)] || 0;
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  
  const report = {
    testConfiguration: {
      baseUrl: BASE_URL,
      concurrentUsers: CONCURRENT_USERS,
      testDuration: TEST_DURATION,
      rampUpTime: RAMP_UP_TIME
    },
    summary: {
      totalRequests: testResults.totalRequests,
      successfulRequests: testResults.successfulRequests,
      failedRequests: testResults.failedRequests,
      successRate: `${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%`,
      throughput: `${testResults.throughput.toFixed(2)} requests/second`,
      testDuration: `${duration.toFixed(2)} seconds`
    },
    responseTime: {
      average: `${testResults.averageResponseTime.toFixed(2)}ms`,
      minimum: `${testResults.minResponseTime}ms`,
      maximum: `${testResults.maxResponseTime}ms`,
      p50: `${p50}ms`,
      p90: `${p90}ms`,
      p95: `${p95}ms`,
      p99: `${p99}ms`
    },
    errors: testResults.errorCounts,
    timestamp: new Date().toISOString()
  };
  
  // Save report to file
  const reportPath = path.join(__dirname, `load-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📈 LOAD TEST RESULTS:');
  console.log('='.repeat(50));
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Total Requests: ${testResults.totalRequests}`);
  console.log(`Success Rate: ${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Throughput: ${testResults.throughput.toFixed(2)} req/s`);
  console.log(`Avg Response Time: ${testResults.averageResponseTime.toFixed(2)}ms`);
  console.log(`95th Percentile: ${p95}ms`);
  console.log(`Max Response Time: ${testResults.maxResponseTime}ms`);
  console.log(`Errors:`, testResults.errorCounts);
  console.log(`\nDetailed report saved to: ${reportPath}`);
  
  return report;
}

// Pre-load database with test data
async function preloadTestData(count = 10000) {
  console.log(`🔄 Pre-loading ${count} test objects...`);
  const batchSize = 100;
  const batches = Math.ceil(count / batchSize);
  
  for (let batch = 0; batch < batches; batch++) {
    const promises = [];
    const currentBatchSize = Math.min(batchSize, count - (batch * batchSize));
    
    for (let i = 0; i < currentBatchSize; i++) {
      const objectData = generateObjectData((batch * batchSize) + i);
      promises.push(executeRequest({ 
        name: 'create_object', 
        endpoint: '/objects', 
        method: 'POST' 
      }));
    }
    
    await Promise.all(promises);
    
    if (batch % 10 === 0) {
      console.log(`Loaded ${(batch + 1) * batchSize} objects...`);
    }
  }
  
  console.log(`✅ Pre-loaded ${count} test objects`);
}

// Main test execution
async function runLoadTest() {
  console.log('🚀 Starting RFID Docket Tracking Load Test');
  console.log(`Configuration: ${CONCURRENT_USERS} users, ${TEST_DURATION}s duration`);
  
  // Authenticate
  if (!await authenticate()) {
    process.exit(1);
  }
  
  // Pre-load test data
  await preloadTestData(1000);
  
  // Shared object IDs for cross-user operations
  const objectIds = [];
  
  // Initialize test
  testResults.startTime = Date.now();
  const progressInterval = startProgressReporting();
  
  // Start virtual users with ramp-up
  const users = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    // Stagger user starts during ramp-up period
    const delay = (RAMP_UP_TIME * 1000 / CONCURRENT_USERS) * i;
    
    setTimeout(() => {
      users.push(simulateUser(i + 1, objectIds));
    }, delay);
  }
  
  // Wait for all users to complete
  await Promise.all(users);
  
  // Cleanup
  clearInterval(progressInterval);
  testResults.endTime = Date.now();
  
  // Generate and display results
  const report = generateReport();
  
  // Validate performance requirements
  console.log('\n🎯 Performance Requirements Validation:');
  console.log('='.repeat(50));
  
  const validations = [
    { 
      name: 'API Response Time < 2000ms (95th percentile)', 
      required: 2000, 
      actual: parseFloat(report.responseTime.p95), 
      unit: 'ms' 
    },
    { 
      name: 'Search Response < 500ms (average)', 
      required: 500, 
      actual: testResults.averageResponseTime, 
      unit: 'ms' 
    },
    { 
      name: 'Success Rate > 99%', 
      required: 99, 
      actual: (testResults.successfulRequests / testResults.totalRequests) * 100, 
      unit: '%' 
    },
    { 
      name: 'Throughput > 100 req/s', 
      required: 100, 
      actual: testResults.throughput, 
      unit: 'req/s' 
    }
  ];
  
  let allPassed = true;
  
  validations.forEach(validation => {
    const passed = validation.actual <= validation.required || 
                  (validation.name.includes('Success Rate') && validation.actual >= validation.required) ||
                  (validation.name.includes('Throughput') && validation.actual >= validation.required);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${validation.name}: ${validation.actual.toFixed(2)}${validation.unit} (required: ${validation.required}${validation.unit})`);
    
    if (!passed) allPassed = false;
  });
  
  console.log(`\n${allPassed ? '🎉 All performance requirements met!' : '⚠️  Some performance requirements not met.'}`);
  
  return report;
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Load test interrupted');
  if (testResults.startTime) {
    testResults.endTime = Date.now();
    generateReport();
  }
  process.exit(0);
});

// Export for use as module
if (require.main === module) {
  runLoadTest().catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = { runLoadTest, generateReport };