/**
 * K6 Load Testing Script for RFID Docket Tracking System
 * 
 * This script tests various endpoints under different load conditions:
 * - Authentication
 * - Docket retrieval and search
 * - Real-time RFID tracking
 * - Analytics dashboard
 * - Audit trail access
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const searchDuration = new Trend('search_duration');
const rfidDuration = new Trend('rfid_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TEST_USER = {
  email: 'admin@example.com',
  password: 'password123'
};

// Test stages for different load patterns
export const options = {
  stages: [
    // Warm-up
    { duration: '2m', target: 10 },
    // Ramp up to normal load
    { duration: '5m', target: 50 },
    // Stay at normal load
    { duration: '10m', target: 50 },
    // Peak load
    { duration: '5m', target: 100 },
    // Stay at peak
    { duration: '10m', target: 100 },
    // Spike test
    { duration: '2m', target: 200 },
    // Scale down
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'], // Error rate should be below 5%
    errors: ['rate<0.05'],
    auth_duration: ['p(95)<1000'],
    search_duration: ['p(95)<1500'],
    rfid_duration: ['p(95)<500'],
  },
};

// Test data
const testDockets = [
  'DOC-2025-0001',
  'DOC-2025-0002',
  'DOC-2025-0003',
  'DOC-2025-0004',
  'DOC-2025-0005'
];

const searchTerms = [
  'contract',
  'legal',
  'financial',
  'report',
  'agreement',
  'policy',
  'document'
];

let authToken = '';

export function setup() {
  // Login once to get auth token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.token };
  }
  
  console.error('Setup failed: Unable to authenticate');
  return { token: null };
}

export default function(data) {
  if (!data.token) {
    console.error('No auth token available');
    return;
  }
  
  authToken = data.token;
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // Test scenario selection (weighted)
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - Dashboard and analytics
    testDashboardLoad(headers);
  } else if (scenario < 0.6) {
    // 30% - Document search and retrieval
    testDocumentOperations(headers);
  } else if (scenario < 0.8) {
    // 20% - RFID tracking
    testRFIDOperations(headers);
  } else if (scenario < 0.95) {
    // 15% - Audit and compliance
    testAuditOperations(headers);
  } else {
    // 5% - Administrative operations
    testAdminOperations(headers);
  }
  
  sleep(1);
}

function testDashboardLoad(headers) {
  const startTime = new Date();
  
  // Dashboard metrics
  let res = http.get(`${BASE_URL}/api/analytics/dashboard`, { headers });
  check(res, {
    'dashboard load status 200': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  // KPI endpoints
  res = http.get(`${BASE_URL}/api/analytics/kpis`, { headers });
  check(res, {
    'KPIs load status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Recent activity
  res = http.get(`${BASE_URL}/api/analytics/recent-activity`, { headers });
  check(res, {
    'recent activity status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Trends
  res = http.get(`${BASE_URL}/api/analytics/trends?period=7d`, { headers });
  check(res, {
    'trends status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
}

function testDocumentOperations(headers) {
  const startTime = new Date();
  
  // Search documents
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  let res = http.get(`${BASE_URL}/api/dockets?search=${searchTerm}&page=1&limit=20`, { headers });
  
  check(res, {
    'search status 200': (r) => r.status === 200,
    'search has results': (r) => {
      const body = JSON.parse(r.body);
      return body.dockets && Array.isArray(body.dockets);
    },
  }) || errorRate.add(1);
  
  searchDuration.add(new Date() - startTime);
  
  // Get specific document
  const docketId = testDockets[Math.floor(Math.random() * testDockets.length)];
  res = http.get(`${BASE_URL}/api/dockets/${docketId}`, { headers });
  
  check(res, {
    'docket detail status 200 or 404': (r) => r.status === 200 || r.status === 404,
  }) || errorRate.add(1);
  
  // Browse by category
  res = http.get(`${BASE_URL}/api/dockets?category=Legal&page=1&limit=10`, { headers });
  check(res, {
    'category filter status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
}

function testRFIDOperations(headers) {
  const startTime = new Date();
  
  // Live tracking data
  let res = http.get(`${BASE_URL}/api/rfid/live-tracking`, { headers });
  check(res, {
    'live tracking status 200': (r) => r.status === 200,
    'live tracking response time': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  rfidDuration.add(new Date() - startTime);
  
  // RFID events
  res = http.get(`${BASE_URL}/api/rfid/events?limit=50`, { headers });
  check(res, {
    'RFID events status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Track specific tag
  const tagId = `RFID-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  res = http.get(`${BASE_URL}/api/rfid/track/${tagId}`, { headers });
  check(res, {
    'track tag status 200 or 404': (r) => r.status === 200 || r.status === 404,
  }) || errorRate.add(1);
  
  // Simulate RFID scan (write operation)
  if (Math.random() < 0.3) { // 30% chance
    const scanData = {
      tagId: tagId,
      readerId: `R00${Math.floor(Math.random() * 10)}`,
      signalStrength: Math.random(),
      location: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01,
        lng: -74.0060 + (Math.random() - 0.5) * 0.01
      }
    };
    
    res = http.post(`${BASE_URL}/api/rfid/scan`, JSON.stringify(scanData), { headers });
    check(res, {
      'RFID scan status 201': (r) => r.status === 201,
    }) || errorRate.add(1);
  }
}

function testAuditOperations(headers) {
  // Audit logs
  let res = http.get(`${BASE_URL}/api/audit/logs?page=1&limit=20`, { headers });
  check(res, {
    'audit logs status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Compliance report
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  res = http.get(
    `${BASE_URL}/api/audit/compliance-report?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
    { headers }
  );
  check(res, {
    'compliance report status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Real-time stats
  res = http.get(`${BASE_URL}/api/audit/stats`, { headers });
  check(res, {
    'audit stats status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
}

function testAdminOperations(headers) {
  // User management
  let res = http.get(`${BASE_URL}/api/users?page=1&limit=10`, { headers });
  check(res, {
    'users list status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Storage zones
  res = http.get(`${BASE_URL}/api/storage/zones`, { headers });
  check(res, {
    'storage zones status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // System health
  res = http.get(`${BASE_URL}/api/system/health`, { headers });
  check(res, {
    'system health status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // Predictive analytics
  res = http.get(`${BASE_URL}/api/analytics/predictions`, { headers });
  check(res, {
    'predictions status 200': (r) => r.status === 200,
  }) || errorRate.add(1);
}

// Stress test specific endpoints
export function stressTest() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
  
  // Concurrent search requests
  const searchPromises = [];
  for (let i = 0; i < 10; i++) {
    const term = searchTerms[i % searchTerms.length];
    searchPromises.push(
      http.asyncRequest('GET', `${BASE_URL}/api/dockets?search=${term}`, null, { headers })
    );
  }
  
  // Wait for all searches to complete
  const responses = http.batch(searchPromises);
  responses.forEach((res, index) => {
    check(res, {
      [`concurrent search ${index} status OK`]: (r) => r.status === 200,
    }) || errorRate.add(1);
  });
}

export function teardown(data) {
  console.log('Load test completed');
  
  if (data && data.token) {
    // Logout
    http.post(`${BASE_URL}/api/auth/logout`, null, {
      headers: { 'Authorization': `Bearer ${data.token}` },
    });
  }
}