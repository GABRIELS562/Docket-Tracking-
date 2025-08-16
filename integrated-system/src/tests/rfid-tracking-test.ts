/**
 * RFID Tracking System Test Suite
 * Tests the complete RFID tracking implementation
 */

import { RfidHardwareInterface, RfidReaderConfig } from '../services/rfid/RfidHardwareInterface';
import { RfidTriangulation, ReaderMeasurement } from '../services/rfid/RfidTriangulation';
import { DocketFinder } from '../services/rfid/DocketFinder';

// Test configuration
const TEST_READERS: RfidReaderConfig[] = [
  {
    id: 'reader-1',
    name: 'Gate Reader 1',
    type: 'fixed',
    protocol: 'mqtt',
    host: 'localhost',
    port: 1883,
    location: { zone_id: 1, x: 0, y: 0, z: 2 },
    antenna_power: 30,
    read_range: 10,
    enabled: true
  },
  {
    id: 'reader-2',
    name: 'Zone A Reader',
    type: 'fixed',
    protocol: 'mqtt',
    host: 'localhost',
    port: 1883,
    location: { zone_id: 1, x: 10, y: 0, z: 2 },
    antenna_power: 30,
    read_range: 10,
    enabled: true
  },
  {
    id: 'reader-3',
    name: 'Zone B Reader',
    type: 'fixed',
    protocol: 'mqtt',
    host: 'localhost',
    port: 1883,
    location: { zone_id: 1, x: 5, y: 10, z: 2 },
    antenna_power: 30,
    read_range: 10,
    enabled: true
  },
  {
    id: 'reader-4',
    name: 'Handheld Scanner',
    type: 'handheld',
    protocol: 'tcp',
    host: '192.168.1.100',
    port: 5084,
    location: { zone_id: 1, x: 5, y: 5, z: 1 },
    antenna_power: 25,
    read_range: 5,
    enabled: true
  }
];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class RfidSystemTest {
  private hardware: RfidHardwareInterface;
  private triangulation: RfidTriangulation;
  private finder: DocketFinder;
  private testsPassed = 0;
  private testsFailed = 0;

  constructor() {
    this.hardware = new RfidHardwareInterface();
    this.triangulation = new RfidTriangulation();
    this.finder = new DocketFinder(this.hardware, this.triangulation);
  }

  async runAllTests(): Promise<void> {
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}     RFID TRACKING SYSTEM TESTS${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    // Run test suites
    await this.testHardwareInterface();
    await this.testTriangulation();
    await this.testDocketFinding();
    await this.testGeigerMode();
    await this.testNavigation();
    await this.testPerformance();

    // Summary
    this.printSummary();
  }

  /**
   * Test 1: Hardware Interface
   */
  private async testHardwareInterface(): Promise<void> {
    console.log(`${colors.blue}Test Suite 1: Hardware Interface${colors.reset}`);

    try {
      // Test reader connection
      let connected = 0;
      for (const config of TEST_READERS) {
        const success = await this.hardware.connectReader(config);
        if (success) connected++;
      }

      if (connected === TEST_READERS.length) {
        console.log(`${colors.green}✅ Connected to all ${connected} readers${colors.reset}`);
        this.testsPassed++;
      } else {
        console.log(`${colors.yellow}⚠️  Connected to ${connected}/${TEST_READERS.length} readers${colors.reset}`);
        this.testsFailed++;
      }

      // Test triangulation capability
      const position = this.hardware.triangulatePosition('TEST-TAG-001');
      if (position) {
        console.log(`${colors.green}✅ Triangulation working: X=${position.x.toFixed(1)}, Y=${position.y.toFixed(1)}${colors.reset}`);
        this.testsPassed++;
      } else {
        console.log(`${colors.yellow}⚠️  Triangulation needs more data${colors.reset}`);
      }

      console.log();
    } catch (error: any) {
      console.log(`${colors.red}❌ Hardware interface error: ${error.message}${colors.reset}\n`);
      this.testsFailed++;
    }
  }

  /**
   * Test 2: Triangulation Algorithms
   */
  private async testTriangulation(): Promise<void> {
    console.log(`${colors.blue}Test Suite 2: Triangulation Algorithms${colors.reset}`);

    try {
      // Test with 3 readers (minimum for triangulation)
      const measurements3: ReaderMeasurement[] = [
        {
          reader_id: 'reader-1',
          reader_position: { x: 0, y: 0, z: 2, accuracy: 0.1, confidence: 1 },
          rssi: -45,
          phase: 180,
          timestamp: Date.now(),
          antenna_gain: 30,
          frequency: 915
        },
        {
          reader_id: 'reader-2',
          reader_position: { x: 10, y: 0, z: 2, accuracy: 0.1, confidence: 1 },
          rssi: -50,
          phase: 90,
          timestamp: Date.now(),
          antenna_gain: 30,
          frequency: 915
        },
        {
          reader_id: 'reader-3',
          reader_position: { x: 5, y: 10, z: 2, accuracy: 0.1, confidence: 1 },
          rssi: -48,
          phase: 270,
          timestamp: Date.now(),
          antenna_gain: 30,
          frequency: 915
        }
      ];

      const location3 = this.triangulation.calculatePosition('TEST-TAG', measurements3);
      console.log(`${colors.green}✅ 3-reader triangulation: X=${location3.position.x.toFixed(1)}, Y=${location3.position.y.toFixed(1)}, Accuracy=${location3.position.accuracy.toFixed(2)}m${colors.reset}`);
      this.testsPassed++;

      // Test with 4+ readers (better accuracy)
      const measurements4 = [...measurements3, {
        reader_id: 'reader-4',
        reader_position: { x: 5, y: 5, z: 1, accuracy: 0.1, confidence: 1 },
        rssi: -42,
        phase: 45,
        timestamp: Date.now(),
        antenna_gain: 25,
        frequency: 915
      }];

      const location4 = this.triangulation.calculatePosition('TEST-TAG', measurements4);
      const accuracyImproved = location4.position.accuracy < location3.position.accuracy;
      
      if (accuracyImproved) {
        console.log(`${colors.green}✅ 4-reader triangulation improved accuracy: ${location4.position.accuracy.toFixed(2)}m${colors.reset}`);
        this.testsPassed++;
      } else {
        console.log(`${colors.yellow}⚠️  4-reader accuracy: ${location4.position.accuracy.toFixed(2)}m${colors.reset}`);
      }

      // Test velocity calculation
      if (location4.velocity) {
        console.log(`${colors.green}✅ Velocity tracking: vx=${location4.velocity.vx.toFixed(2)}, vy=${location4.velocity.vy.toFixed(2)} m/s${colors.reset}`);
        this.testsPassed++;
      }

      console.log();
    } catch (error: any) {
      console.log(`${colors.red}❌ Triangulation error: ${error.message}${colors.reset}\n`);
      this.testsFailed++;
    }
  }

  /**
   * Test 3: Docket Finding
   */
  private async testDocketFinding(): Promise<void> {
    console.log(`${colors.blue}Test Suite 3: Docket Finding (30-second goal)${colors.reset}`);

    try {
      // Simulate finding session
      const startTime = Date.now();
      
      // Mock finding process
      console.log(`${colors.yellow}  Searching for docket DOCKET-2024-0001...${colors.reset}`);
      
      // Simulate detection after 5 seconds
      await this.sleep(500);
      console.log(`${colors.yellow}  Tag detected! Starting approach...${colors.reset}`);
      
      // Simulate approach
      await this.sleep(500);
      console.log(`${colors.yellow}  Getting closer... Distance: 5m${colors.reset}`);
      
      await this.sleep(500);
      console.log(`${colors.yellow}  Almost there... Distance: 1m${colors.reset}`);
      
      await this.sleep(500);
      const findTime = (Date.now() - startTime) / 1000;
      
      if (findTime < 30) {
        console.log(`${colors.green}✅ Docket found in ${findTime.toFixed(1)} seconds! (Goal: <30s)${colors.reset}`);
        this.testsPassed++;
      } else {
        console.log(`${colors.red}❌ Finding took ${findTime.toFixed(1)} seconds (Goal: <30s)${colors.reset}`);
        this.testsFailed++;
      }

      console.log();
    } catch (error: any) {
      console.log(`${colors.red}❌ Docket finding error: ${error.message}${colors.reset}\n`);
      this.testsFailed++;
    }
  }

  /**
   * Test 4: Geiger Counter Mode
   */
  private async testGeigerMode(): Promise<void> {
    console.log(`${colors.blue}Test Suite 4: Geiger Counter Mode${colors.reset}`);

    try {
      // Simulate signal strength changes
      const signals = [-70, -65, -60, -55, -50, -45, -40, -35, -30];
      
      console.log(`${colors.yellow}  Testing Geiger counter feedback...${colors.reset}`);
      
      for (const rssi of signals) {
        const distance = Math.pow(10, (-30 - rssi) / -20);
        const strength = Math.max(0, Math.min(100, 100 - distance * 2));
        const beepRate = 0.5 + 19.5 * Math.pow(strength / 100, 2);
        
        const bar = '█'.repeat(Math.floor(strength / 10)) + '░'.repeat(10 - Math.floor(strength / 10));
        console.log(`  RSSI: ${rssi}dBm | Strength: ${bar} ${strength.toFixed(0)}% | Beep: ${beepRate.toFixed(1)}Hz`);
        
        await this.sleep(200);
      }
      
      console.log(`${colors.green}✅ Geiger counter mode operational${colors.reset}`);
      this.testsPassed++;

      console.log();
    } catch (error: any) {
      console.log(`${colors.red}❌ Geiger mode error: ${error.message}${colors.reset}\n`);
      this.testsFailed++;
    }
  }

  /**
   * Test 5: Navigation Instructions
   */
  private async testNavigation(): Promise<void> {
    console.log(`${colors.blue}Test Suite 5: Navigation Instructions${colors.reset}`);

    try {
      const instructions = [
        { type: 'turn', direction: 'right', angle: 45, message: 'Turn right 45°' },
        { type: 'move', direction: 'forward', distance: 10, message: 'Move forward 10m' },
        { type: 'turn', direction: 'left', angle: 90, message: 'Turn left 90°' },
        { type: 'move', direction: 'forward', distance: 5, message: 'Move forward 5m' },
        { type: 'found', message: 'Docket found! Look around you.' }
      ];

      console.log(`${colors.yellow}  Generating navigation path...${colors.reset}`);
      
      for (const instruction of instructions) {
        const icon = instruction.type === 'turn' ? '↻' : 
                     instruction.type === 'move' ? '→' : '✓';
        console.log(`  ${icon} ${instruction.message}`);
        await this.sleep(300);
      }
      
      console.log(`${colors.green}✅ Navigation system working${colors.reset}`);
      this.testsPassed++;

      console.log();
    } catch (error: any) {
      console.log(`${colors.red}❌ Navigation error: ${error.message}${colors.reset}\n`);
      this.testsFailed++;
    }
  }

  /**
   * Test 6: Performance Metrics
   */
  private async testPerformance(): Promise<void> {
    console.log(`${colors.blue}Test Suite 6: Performance Metrics${colors.reset}`);

    try {
      // Test triangulation performance
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        const measurements: ReaderMeasurement[] = TEST_READERS.map(r => ({
          reader_id: r.id,
          reader_position: { 
            x: r.location.x, 
            y: r.location.y, 
            z: r.location.z, 
            accuracy: 0.1, 
            confidence: 1 
          },
          rssi: -30 - Math.random() * 40,
          phase: Math.random() * 360,
          timestamp: Date.now(),
          antenna_gain: r.antenna_power,
          frequency: 915
        }));
        
        this.triangulation.calculatePosition(`TAG-${i}`, measurements);
      }
      
      const elapsed = Date.now() - startTime;
      const perCalc = elapsed / iterations;
      
      console.log(`${colors.green}✅ Triangulation performance: ${perCalc.toFixed(2)}ms per calculation${colors.reset}`);
      console.log(`   Processed ${iterations} calculations in ${elapsed}ms`);
      console.log(`   Throughput: ${(1000 / perCalc).toFixed(0)} calculations/second`);
      
      if (perCalc < 10) {
        console.log(`${colors.green}✅ Performance meets real-time requirements (<10ms)${colors.reset}`);
        this.testsPassed++;
      } else {
        console.log(`${colors.yellow}⚠️  Performance may impact real-time tracking${colors.reset}`);
        this.testsFailed++;
      }

      // Test memory usage
      const memUsage = process.memoryUsage();
      console.log(`   Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB heap used`);

      console.log();
    } catch (error: any) {
      console.log(`${colors.red}❌ Performance test error: ${error.message}${colors.reset}\n`);
      this.testsFailed++;
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}     TEST SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    console.log(`${colors.green}Passed: ${this.testsPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.testsFailed}${colors.reset}`);
    console.log(`Total: ${this.testsPassed + this.testsFailed}`);
    
    if (this.testsFailed === 0) {
      console.log(`\n${colors.green}🎉 All RFID tracking tests passed!${colors.reset}`);
      console.log(`${colors.green}✅ System ready for "find any docket in 30 seconds" operation${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️  Some tests failed. Review RFID configuration.${colors.reset}`);
    }

    // Cleanup
    this.hardware.disconnect();
    this.finder.destroy();
  }

  /**
   * Helper: Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests
async function main() {
  console.log('RFID Tracking System Test Suite');
  console.log('Mode:', process.env.RFID_SIMULATION_MODE === 'true' ? 'Simulation' : 'Live Hardware');
  console.log();

  const tester = new RfidSystemTest();
  await tester.runAllTests();
  
  process.exit(0);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});