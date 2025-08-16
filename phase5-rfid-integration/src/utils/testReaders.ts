import axios from 'axios';
import { WebSocket } from 'ws';
import { logger } from './logger';

const SERVER_URL = 'http://localhost:3004';
const WS_URL = 'ws://localhost:3005';

interface TestConfig {
  duration: number; // Test duration in seconds
  readerCount: number;
  tagCount: number;
  eventRate: number;
}

class RfidSystemTester {
  private ws: WebSocket | null = null;
  private testResults: any = {
    startTime: null,
    endTime: null,
    eventsReceived: 0,
    readersOnline: 0,
    collisionsDetected: 0,
    alertsGenerated: 0,
    errors: []
  };

  async runFullSystemTest(config: TestConfig): Promise<void> {
    console.log('\n🧪 Starting RFID System Integration Test');
    console.log('==========================================');
    
    try {
      await this.checkServerHealth();
      await this.connectWebSocket();
      await this.testSimulation(config);
      await this.testReaderManagement();
      await this.testEventProcessing();
      await this.testAlertSystem();
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      this.testResults.errors.push(error);
    } finally {
      this.cleanup();
    }
  }

  private async checkServerHealth(): Promise<void> {
    console.log('\n📊 Checking server health...');
    
    try {
      const response = await axios.get(`${SERVER_URL}/health`);
      if (response.data.status === 'healthy') {
        console.log('✅ Server is healthy');
      } else {
        throw new Error('Server health check failed');
      }
    } catch (error) {
      throw new Error(`Server not accessible: ${error}`);
    }
  }

  private async connectWebSocket(): Promise<void> {
    console.log('\n🔌 Connecting to WebSocket...');
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        this.setupWebSocketHandlers();
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket connection failed:', error);
        reject(error);
      });
    });
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.send(JSON.stringify({ type: 'subscribe-events' }));
    this.ws.send(JSON.stringify({ type: 'subscribe-alerts' }));
    this.ws.send(JSON.stringify({ type: 'subscribe-simulation' }));

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'tag_read':
          case 'simulated_tag_read':
            this.testResults.eventsReceived++;
            break;
          case 'collision_detected':
          case 'simulated_collision':
            this.testResults.collisionsDetected++;
            break;
          case 'alert_created':
            this.testResults.alertsGenerated++;
            break;
          case 'reader_status_changed':
            if (message.data.status === 'connected') {
              this.testResults.readersOnline++;
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    });
  }

  private async testSimulation(config: TestConfig): Promise<void> {
    console.log('\n🎮 Testing RFID Simulation...');
    
    try {
      // Configure simulation
      const configResponse = await axios.post(`${SERVER_URL}/api/rfid/simulation/config`, {
        enabled: true,
        tagCount: config.tagCount,
        readerCount: config.readerCount,
        eventRate: config.eventRate,
        movementProbability: 0.1,
        collisionProbability: 0.05,
        errorRate: 0.01
      });
      
      if (configResponse.data.success) {
        console.log('✅ Simulation configured');
      }

      // Start simulation
      const startResponse = await axios.post(`${SERVER_URL}/api/rfid/simulation/start`);
      if (startResponse.data.success) {
        console.log('✅ Simulation started');
        this.testResults.startTime = new Date();
      }

      // Wait for test duration
      await this.wait(config.duration * 1000);

      // Get simulation stats
      const statsResponse = await axios.get(`${SERVER_URL}/api/rfid/simulation/status`);
      if (statsResponse.data.success) {
        const stats = statsResponse.data.data;
        console.log(`📊 Simulation stats: ${stats.totalEvents} events, ${stats.totalReaders} readers`);
        this.testResults.simulationStats = stats;
      }

    } catch (error) {
      console.error('❌ Simulation test failed:', error);
      this.testResults.errors.push(`Simulation test: ${error}`);
    }
  }

  private async testReaderManagement(): Promise<void> {
    console.log('\n📡 Testing Reader Management...');
    
    try {
      // Get readers
      const readersResponse = await axios.get(`${SERVER_URL}/api/rfid/readers`);
      if (readersResponse.data.success) {
        const readers = readersResponse.data.data.readers;
        console.log(`✅ Found ${readers.length} readers`);
        
        // Test individual reader status
        if (readers.length > 0) {
          const readerId = readers[0].readerId;
          const readerResponse = await axios.get(`${SERVER_URL}/api/rfid/readers/${readerId}`);
          
          if (readerResponse.data.success) {
            console.log(`✅ Reader ${readerId} details retrieved`);
          }
        }
      }

      // Test reader commands (for simulated readers)
      const simulationStatus = await axios.get(`${SERVER_URL}/api/rfid/simulation/status`);
      if (simulationStatus.data.success && simulationStatus.data.data.isRunning) {
        console.log('✅ Reader management test completed (simulation mode)');
      }

    } catch (error) {
      console.error('❌ Reader management test failed:', error);
      this.testResults.errors.push(`Reader management: ${error}`);
    }
  }

  private async testEventProcessing(): Promise<void> {
    console.log('\n⚡ Testing Event Processing...');
    
    try {
      // Get recent events
      const eventsResponse = await axios.get(`${SERVER_URL}/api/rfid/events?limit=100&hours=1`);
      if (eventsResponse.data.success) {
        const events = eventsResponse.data.data.events;
        console.log(`✅ Retrieved ${events.length} recent events`);
        this.testResults.recentEvents = events.length;
      }

      // Get event statistics
      const statsResponse = await axios.get(`${SERVER_URL}/api/rfid/events/stats?window=1 hour`);
      if (statsResponse.data.success) {
        const stats = statsResponse.data.data;
        console.log(`✅ Event stats: ${stats.total_events} total, ${stats.unique_tags} unique tags`);
        this.testResults.eventStats = stats;
      }

      // Force event processing
      const processResponse = await axios.post(`${SERVER_URL}/api/rfid/events/process`);
      if (processResponse.data.success) {
        console.log('✅ Event processing triggered');
      }

    } catch (error) {
      console.error('❌ Event processing test failed:', error);
      this.testResults.errors.push(`Event processing: ${error}`);
    }
  }

  private async testAlertSystem(): Promise<void> {
    console.log('\n🚨 Testing Alert System...');
    
    try {
      // Get alerts
      const alertsResponse = await axios.get(`${SERVER_URL}/api/rfid/alerts?limit=50`);
      if (alertsResponse.data.success) {
        const alerts = alertsResponse.data.data.alerts;
        console.log(`✅ Retrieved ${alerts.length} alerts`);
        this.testResults.totalAlerts = alerts.length;

        // Test alert acknowledgment
        if (alerts.length > 0 && !alerts[0].acknowledged) {
          const alertId = alerts[0].id;
          const ackResponse = await axios.post(
            `${SERVER_URL}/api/rfid/alerts/${alertId}/acknowledge`,
            { acknowledgedBy: 'test-user' }
          );
          
          if (ackResponse.data.success) {
            console.log('✅ Alert acknowledgment tested');
          }
        }
      }

    } catch (error) {
      console.error('❌ Alert system test failed:', error);
      this.testResults.errors.push(`Alert system: ${error}`);
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📋 Generating Test Report...');
    
    this.testResults.endTime = new Date();
    const duration = this.testResults.endTime.getTime() - this.testResults.startTime.getTime();

    console.log('\n✅ RFID SYSTEM TEST RESULTS');
    console.log('=============================');
    console.log(`🕒 Duration: ${Math.round(duration / 1000)}s`);
    console.log(`📊 Events Received: ${this.testResults.eventsReceived}`);
    console.log(`📡 Readers Online: ${this.testResults.readersOnline}`);
    console.log(`💥 Collisions Detected: ${this.testResults.collisionsDetected}`);
    console.log(`🚨 Alerts Generated: ${this.testResults.alertsGenerated}`);
    console.log(`❌ Errors: ${this.testResults.errors.length}`);
    
    if (this.testResults.eventStats) {
      console.log(`\n📈 EVENT STATISTICS:`);
      console.log(`   Total Events: ${this.testResults.eventStats.total_events}`);
      console.log(`   Unique Tags: ${this.testResults.eventStats.unique_tags}`);
      console.log(`   Active Readers: ${this.testResults.eventStats.active_readers}`);
      console.log(`   Avg Signal Strength: ${Math.round(this.testResults.eventStats.avg_signal_strength)}dBm`);
    }

    if (this.testResults.simulationStats) {
      console.log(`\n🎮 SIMULATION STATISTICS:`);
      console.log(`   Total Events: ${this.testResults.simulationStats.totalEvents}`);
      console.log(`   Total Readers: ${this.testResults.simulationStats.totalReaders}`);
      console.log(`   Total Tags: ${this.testResults.simulationStats.totalTags}`);
      console.log(`   Running: ${this.testResults.simulationStats.isRunning}`);
    }

    if (this.testResults.errors.length > 0) {
      console.log(`\n❌ ERRORS:`);
      this.testResults.errors.forEach((error: any, index: number) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Calculate test score
    const errorRate = this.testResults.errors.length / 10; // Assuming 10 test categories
    const testScore = Math.max(0, 100 - (errorRate * 100));
    
    console.log(`\n🏆 OVERALL TEST SCORE: ${Math.round(testScore)}%`);
    
    if (testScore >= 90) {
      console.log('🎉 EXCELLENT: System is performing optimally!');
    } else if (testScore >= 70) {
      console.log('👍 GOOD: System is performing well with minor issues');
    } else if (testScore >= 50) {
      console.log('⚠️  FAIR: System has some issues that need attention');
    } else {
      console.log('🚨 POOR: System has significant issues requiring immediate attention');
    }
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
      
      // Show progress
      const steps = 10;
      const stepTime = ms / steps;
      let currentStep = 0;
      
      const progressInterval = setInterval(() => {
        currentStep++;
        const progress = Math.round((currentStep / steps) * 100);
        process.stdout.write(`\r⏳ Progress: ${'█'.repeat(currentStep)}${'░'.repeat(steps - currentStep)} ${progress}%`);
        
        if (currentStep >= steps) {
          clearInterval(progressInterval);
          console.log(''); // New line
        }
      }, stepTime);
    });
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.close();
      console.log('\n🔌 WebSocket connection closed');
    }
  }
}

// Performance stress test
async function performanceStressTest(): Promise<void> {
  console.log('\n💪 Starting Performance Stress Test...');
  
  const testConfig = {
    duration: 30, // 30 seconds
    readerCount: 6,
    tagCount: 1000,
    eventRate: 100 // 100 events per second
  };

  try {
    // Configure high-performance simulation
    await axios.post(`${SERVER_URL}/api/rfid/simulation/config`, {
      enabled: true,
      tagCount: testConfig.tagCount,
      readerCount: testConfig.readerCount,
      eventRate: testConfig.eventRate,
      movementProbability: 0.2,
      collisionProbability: 0.1,
      errorRate: 0.02
    });

    // Start simulation
    await axios.post(`${SERVER_URL}/api/rfid/simulation/start`);
    console.log('✅ High-load simulation started');

    // Monitor performance for test duration
    const startTime = Date.now();
    const monitorInterval = setInterval(async () => {
      try {
        const healthResponse = await axios.get(`${SERVER_URL}/api/rfid/health`);
        if (healthResponse.data.success) {
          const health = healthResponse.data.data;
          console.log(`📊 Queue: ${health.eventProcessor.queueSize}, Processing: ${health.eventProcessor.isProcessing}`);
        }
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 5000);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testConfig.duration * 1000));
    clearInterval(monitorInterval);

    // Get final stats
    const statsResponse = await axios.get(`${SERVER_URL}/api/rfid/performance`);
    if (statsResponse.data.success) {
      console.log('📈 Performance test completed');
      console.log(`⚡ Events processed: ${statsResponse.data.data.processing_metrics.total_processed}`);
    }

  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Main test runner
async function runTests(): Promise<void> {
  const tester = new RfidSystemTester();
  
  const config: TestConfig = {
    duration: 15, // 15 seconds for quick test
    readerCount: 3,
    tagCount: 100,
    eventRate: 20
  };

  try {
    await tester.runFullSystemTest(config);
    
    const runStressTest = process.argv.includes('--stress');
    if (runStressTest) {
      await performanceStressTest();
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

export { RfidSystemTester, performanceStressTest };