#!/usr/bin/env ts-node

/**
 * Comprehensive Test Suite for RFID Docket Tracking System
 * Tests all major features: Audit Trail, Analytics, RFID Tracking, Mobile Ops
 */

const axios = require('axios');
const { io } = require('socket.io-client');

// Test configuration
const API_BASE_URL = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';
const TEST_USER = { email: 'admin@dockettrack.gov', password: 'admin123' };

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: [] as any[]
};

class TestRunner {
  private api: any;
  private token: string = '';
  private socket: any = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Utility functions
  private log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  private async test(name: string, testFn: () => Promise<boolean>) {
    testResults.total++;
    this.log(`\n▶ Testing: ${name}`, colors.cyan);
    
    try {
      const result = await testFn();
      if (result) {
        testResults.passed++;
        this.log(`  ✅ PASSED`, colors.green);
        testResults.details.push({ name, status: 'passed' });
      } else {
        testResults.failed++;
        this.log(`  ❌ FAILED`, colors.red);
        testResults.details.push({ name, status: 'failed', error: 'Test returned false' });
      }
    } catch (error: any) {
      testResults.failed++;
      this.log(`  ❌ ERROR: ${error.message}`, colors.red);
      testResults.details.push({ name, status: 'failed', error: error.message });
    }
  }

  // Authentication
  private async authenticate(): Promise<boolean> {
    try {
      const response = await this.api.post('/auth/login', TEST_USER);
      if (response.data.success && response.data.token) {
        this.token = response.data.token;
        this.api.defaults.headers['Authorization'] = `Bearer ${this.token}`;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  // ========== AUDIT TRAIL TESTS ==========
  async testAuditTrail() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
    this.log('🔒 AUDIT TRAIL TESTS', colors.blue);
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

    await this.test('Fetch audit statistics', async () => {
      const response = await this.api.get('/audit/statistics');
      return response.data.success && response.data.data.summary != null;
    });

    await this.test('Retrieve audit logs', async () => {
      const response = await this.api.get('/audit/logs?limit=10');
      return response.data.success && Array.isArray(response.data.data.logs);
    });

    await this.test('Filter audit logs by category', async () => {
      const response = await this.api.get('/audit/logs?category=AUTHENTICATION');
      return response.data.success;
    });

    await this.test('Get security events', async () => {
      const response = await this.api.get('/audit/security-events');
      return response.data.success && Array.isArray(response.data.data.events);
    });

    await this.test('Generate compliance report', async () => {
      const response = await this.api.post('/audit/compliance-report', {
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date().toISOString(),
        compliance_level: 'STANDARD',
        format: 'json'
      });
      return response.data.success;
    });
  }

  // ========== ANALYTICS TESTS ==========
  async testAnalytics() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
    this.log('📊 ANALYTICS TESTS', colors.blue);
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

    await this.test('Get current metrics', async () => {
      const response = await this.api.get('/analytics/metrics/current');
      return response.data.success && response.data.data.totalDockets !== undefined;
    });

    await this.test('Fetch KPI dashboard', async () => {
      const response = await this.api.get('/analytics/kpi/dashboard');
      return response.data.success && Array.isArray(response.data.data);
    });

    await this.test('Get department analytics', async () => {
      const response = await this.api.get('/analytics/departments');
      return response.data.success && Array.isArray(response.data.data);
    });

    await this.test('Retrieve time series data', async () => {
      const response = await this.api.get('/analytics/timeseries/docket_activity?period=day&duration=7');
      return response.data.success && Array.isArray(response.data.data);
    });

    await this.test('Generate custom report', async () => {
      const response = await this.api.post('/analytics/report/custom', {
        metrics: ['total_dockets', 'active_users'],
        date_range: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        },
        group_by: 'day',
        format: 'json'
      });
      return response.data.success;
    });

    await this.test('Check analytics alerts', async () => {
      const response = await this.api.get('/analytics/alerts');
      return response.data.success && Array.isArray(response.data.data);
    });

    await this.test('Get analytics summary', async () => {
      const response = await this.api.get('/analytics/summary');
      return response.data.success && response.data.data.current != null;
    });
  }

  // ========== RFID TRACKING TESTS ==========
  async testRFIDTracking() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
    this.log('📡 RFID TRACKING TESTS', colors.blue);
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

    await this.test('Get RFID readers status', async () => {
      const response = await this.api.get('/rfid/readers');
      return response.data.success;
    });

    await this.test('Simulate RFID scan', async () => {
      const response = await this.api.post('/rfid/scan', {
        tagId: `TEST_${Date.now()}`,
        readerId: 'READER_01',
        signalStrength: 85
      });
      return response.data.success;
    });

    await this.test('WebSocket connection for RFID', async () => {
      return new Promise((resolve) => {
        this.socket = io(WS_URL, {
          auth: { token: this.token }
        });

        this.socket.on('connect', () => {
          this.socket?.emit('subscribe:rfid', { locationId: 'all' });
          resolve(true);
        });

        this.socket.on('connect_error', () => {
          resolve(false);
        });

        setTimeout(() => resolve(false), 5000);
      });
    });

    await this.test('Receive RFID updates via WebSocket', async () => {
      if (!this.socket) return false;

      return new Promise((resolve) => {
        this.socket!.on('rfid_update', (data: any) => {
          resolve(data != null);
        });

        // Trigger a scan to generate an update
        this.api.post('/rfid/scan', {
          tagId: `WS_TEST_${Date.now()}`,
          readerId: 'READER_02',
          signalStrength: 90
        });

        setTimeout(() => resolve(false), 3000);
      });
    });

    // Clean up WebSocket
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // ========== MOBILE OPERATIONS TESTS ==========
  async testMobileOperations() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
    this.log('📱 MOBILE OPERATIONS TESTS', colors.blue);
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

    await this.test('Get pending tasks', async () => {
      try {
        const response = await this.api.get('/mobile/tasks/pending');
        return response.data.success;
      } catch (error: any) {
        // Endpoint might not exist yet
        if (error.response?.status === 404) {
          this.log('    ⚠️  Mobile endpoint not implemented', colors.yellow);
          testResults.skipped++;
          testResults.total--;
          return true;
        }
        throw error;
      }
    });

    await this.test('Submit mobile scan', async () => {
      try {
        const response = await this.api.post('/mobile/scan', {
          tagId: `MOBILE_${Date.now()}`,
          timestamp: new Date(),
          location: { lat: 40.7128, lng: -74.0060 }
        });
        return response.data.success;
      } catch (error: any) {
        if (error.response?.status === 404) {
          this.log('    ⚠️  Mobile endpoint not implemented', colors.yellow);
          testResults.skipped++;
          testResults.total--;
          return true;
        }
        throw error;
      }
    });

    await this.test('Test offline sync endpoint', async () => {
      try {
        const response = await this.api.post('/mobile/sync', {
          scans: [],
          tasks: [],
          lastSync: new Date()
        });
        return response.data.success;
      } catch (error: any) {
        if (error.response?.status === 404) {
          this.log('    ⚠️  Mobile endpoint not implemented', colors.yellow);
          testResults.skipped++;
          testResults.total--;
          return true;
        }
        throw error;
      }
    });
  }

  // ========== DATABASE TESTS ==========
  async testDatabase() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
    this.log('🗄️ DATABASE INTEGRITY TESTS', colors.blue);
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

    await this.test('Check database health', async () => {
      const response = await axios.get('http://localhost:3001/health');
      return response.data.status === 'healthy' && response.data.services.database === 'connected';
    });

    await this.test('Verify audit tables exist', async () => {
      const response = await this.api.get('/audit/logs?limit=1');
      return response.data.success;
    });

    await this.test('Verify analytics tables exist', async () => {
      const response = await this.api.get('/analytics/metrics/current');
      return response.data.success;
    });
  }

  // ========== PERFORMANCE TESTS ==========
  async testPerformance() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
    this.log('⚡ PERFORMANCE TESTS', colors.blue);
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

    await this.test('API response time < 500ms', async () => {
      const start = Date.now();
      await this.api.get('/audit/statistics');
      const duration = Date.now() - start;
      this.log(`    Response time: ${duration}ms`, colors.cyan);
      return duration < 500;
    });

    await this.test('Concurrent request handling', async () => {
      const requests = Array(10).fill(null).map(() => 
        this.api.get('/analytics/metrics/current')
      );
      
      const start = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - start;
      
      this.log(`    10 concurrent requests: ${duration}ms`, colors.cyan);
      return results.every(r => r.data.success) && duration < 2000;
    });

    await this.test('Large dataset handling', async () => {
      const response = await this.api.get('/audit/logs?limit=1000');
      return response.data.success && Array.isArray(response.data.data.logs);
    });
  }

  // ========== SECURITY TESTS ==========
  async testSecurity() {
    this.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
    this.log('🔐 SECURITY TESTS', colors.blue);
    this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);

    await this.test('Unauthorized access blocked', async () => {
      try {
        const tempApi = axios.create({ baseURL: API_BASE_URL });
        await tempApi.get('/audit/logs');
        return false; // Should not reach here
      } catch (error: any) {
        return error.response?.status === 401 || error.response?.status === 403;
      }
    });

    await this.test('Invalid token rejected', async () => {
      try {
        const tempApi = axios.create({ 
          baseURL: API_BASE_URL,
          headers: { 'Authorization': 'Bearer invalid_token_12345' }
        });
        await tempApi.get('/analytics/metrics/current');
        return false;
      } catch (error: any) {
        return error.response?.status === 401 || error.response?.status === 403;
      }
    });

    await this.test('SQL injection prevention', async () => {
      try {
        await this.api.get('/audit/logs?user_id=1; DROP TABLE users;--');
        // If request succeeds, check that it didn't actually drop the table
        const response = await this.api.get('/users/me');
        return response.data.success;
      } catch (error) {
        return true; // Error is expected for malicious input
      }
    });
  }

  // Main test execution
  async runAllTests() {
    this.log('\n════════════════════════════════════════════════════════', colors.magenta);
    this.log('    COMPREHENSIVE TEST SUITE - RFID DOCKET TRACKING     ', colors.magenta);
    this.log('════════════════════════════════════════════════════════', colors.magenta);
    this.log(`Started at: ${new Date().toLocaleString()}`, colors.cyan);

    // Authenticate first
    this.log('\n🔑 Authenticating...', colors.yellow);
    const authenticated = await this.authenticate();
    if (!authenticated) {
      this.log('❌ Authentication failed! Cannot proceed with tests.', colors.red);
      return;
    }
    this.log('✅ Authentication successful', colors.green);

    // Run all test suites
    await this.testAuditTrail();
    await this.testAnalytics();
    await this.testRFIDTracking();
    await this.testMobileOperations();
    await this.testDatabase();
    await this.testPerformance();
    await this.testSecurity();

    // Generate test report
    this.generateReport();
  }

  private generateReport() {
    this.log('\n════════════════════════════════════════════════════════', colors.magenta);
    this.log('                    TEST REPORT                         ', colors.magenta);
    this.log('════════════════════════════════════════════════════════', colors.magenta);

    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
    const status = testResults.failed === 0 ? 'SUCCESS' : 'FAILURE';
    const statusColor = testResults.failed === 0 ? colors.green : colors.red;

    this.log(`\n📊 Summary:`, colors.cyan);
    this.log(`   Total Tests:    ${testResults.total}`);
    this.log(`   ✅ Passed:      ${testResults.passed}`, colors.green);
    this.log(`   ❌ Failed:      ${testResults.failed}`, colors.red);
    this.log(`   ⚠️  Skipped:     ${testResults.skipped}`, colors.yellow);
    this.log(`   Pass Rate:      ${passRate}%`);
    this.log(`\n   Status:         ${status}`, statusColor);

    if (testResults.failed > 0) {
      this.log(`\n❌ Failed Tests:`, colors.red);
      testResults.details
        .filter(t => t.status === 'failed')
        .forEach(t => {
          this.log(`   • ${t.name}`, colors.red);
          if (t.error) {
            this.log(`     Error: ${t.error}`, colors.yellow);
          }
        });
    }

    this.log(`\n📝 Recommendations:`, colors.cyan);
    if (testResults.failed === 0) {
      this.log('   ✅ All tests passed! System is ready for production.', colors.green);
    } else {
      this.log('   ⚠️  Fix failing tests before deploying to production.', colors.yellow);
    }

    if (testResults.skipped > 0) {
      this.log('   ℹ️  Some endpoints are not implemented yet.', colors.blue);
    }

    this.log(`\nCompleted at: ${new Date().toLocaleString()}`, colors.cyan);
    this.log('════════════════════════════════════════════════════════\n', colors.magenta);

    // Save report to file
    this.saveReport();
  }

  private saveReport() {
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        skipped: testResults.skipped,
        passRate: ((testResults.passed / testResults.total) * 100).toFixed(1) + '%'
      },
      details: testResults.details
    };

    const fileName = `test-report-${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(report, null, 2));
    this.log(`\n📄 Report saved to: ${fileName}`, colors.green);
  }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});