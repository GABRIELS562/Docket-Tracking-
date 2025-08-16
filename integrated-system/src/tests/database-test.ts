/**
 * Database Connection and Query Tests
 * Run this file to verify database connectivity and basic operations
 */

const { query, testConnection, withTransaction } = require('../database/connection');
const dotenv = require('dotenv');

dotenv.config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function runTests() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}     DATABASE CONNECTION AND QUERY TESTS${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Database Connection
  console.log(`${colors.blue}Test 1: Database Connection${colors.reset}`);
  try {
    const connected = await testConnection();
    if (connected) {
      console.log(`${colors.green}✅ Database connection successful${colors.reset}\n`);
      testsPassed++;
    } else {
      console.log(`${colors.red}❌ Database connection failed${colors.reset}\n`);
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Database connection error: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 2: Query Users Table
  console.log(`${colors.blue}Test 2: Query Users Table${colors.reset}`);
  try {
    const result = await query('SELECT COUNT(*) as count FROM users');
    console.log(`${colors.green}✅ Users table has ${result.rows[0].count} records${colors.reset}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Failed to query users: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 3: Query Dockets with Joins
  console.log(`${colors.blue}Test 3: Query Dockets with Joins${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        d.docket_code,
        d.case_number,
        c.name as client_name,
        sz.zone_name
      FROM dockets d
      LEFT JOIN clients c ON d.client_id = c.id
      LEFT JOIN storage_zones sz ON d.current_zone_id = sz.id
      LIMIT 5
    `);
    console.log(`${colors.green}✅ Found ${result.rows.length} dockets with client and zone info${colors.reset}`);
    if (result.rows.length > 0) {
      console.log(`   Sample: ${result.rows[0].docket_code} - ${result.rows[0].client_name} - ${result.rows[0].zone_name}`);
    }
    console.log();
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Failed to query dockets: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 4: Search Functionality
  console.log(`${colors.blue}Test 4: Search Functionality${colors.reset}`);
  try {
    const searchTerm = 'DOCKET-2024';
    const result = await query(
      'SELECT * FROM dockets WHERE docket_code ILIKE $1 LIMIT 3',
      [`%${searchTerm}%`]
    );
    console.log(`${colors.green}✅ Search for '${searchTerm}' returned ${result.rows.length} results${colors.reset}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Search test failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 5: Authentication Query
  console.log(`${colors.blue}Test 5: Authentication Query${colors.reset}`);
  try {
    const result = await query(
      'SELECT id, email, username FROM users WHERE email = $1',
      ['admin@govstorageservices.gov.za']
    );
    if (result.rows.length > 0) {
      console.log(`${colors.green}✅ Admin user found: ${result.rows[0].username}${colors.reset}\n`);
      testsPassed++;
    } else {
      console.log(`${colors.yellow}⚠️  Admin user not found${colors.reset}\n`);
      testsFailed++;
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Auth query failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 6: Storage Statistics
  console.log(`${colors.blue}Test 6: Storage Statistics${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        COUNT(DISTINCT sz.id) as zone_count,
        COUNT(DISTINCT sb.id) as box_count,
        COUNT(DISTINCT d.id) as docket_count,
        COUNT(DISTINCT c.id) as client_count
      FROM storage_zones sz
      LEFT JOIN storage_boxes sb ON sz.id = sb.zone_id
      LEFT JOIN dockets d ON sb.id = d.storage_box_id
      LEFT JOIN clients c ON sb.client_id = c.id
    `);
    const stats = result.rows[0];
    console.log(`${colors.green}✅ Storage Statistics:${colors.reset}`);
    console.log(`   - Zones: ${stats.zone_count}`);
    console.log(`   - Boxes: ${stats.box_count}`);
    console.log(`   - Dockets: ${stats.docket_count}`);
    console.log(`   - Clients: ${stats.client_count}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Statistics query failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 7: Transaction Test
  console.log(`${colors.blue}Test 7: Transaction Test${colors.reset}`);
  try {
    await withTransaction(async (client: any) => {
      // Try to insert and then rollback
      await client.query(
        "INSERT INTO audit_logs (table_name, action, record_id) VALUES ('test', 'TEST', 0)"
      );
      
      // Check if inserted
      const result = await client.query(
        "SELECT COUNT(*) as count FROM audit_logs WHERE table_name = 'test'"
      );
      
      if (result.rows[0].count > 0) {
        console.log(`${colors.green}✅ Transaction working - test record inserted (will rollback)${colors.reset}\n`);
        testsPassed++;
      }
      
      // Throw error to rollback
      throw new Error('Intentional rollback');
    }).catch((error: any) => {
      if (error.message === 'Intentional rollback') {
        console.log(`   Transaction rolled back successfully\n`);
      }
    });
  } catch (error: any) {
    console.log(`${colors.red}❌ Transaction test failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 8: Check RFID Readers
  console.log(`${colors.blue}Test 8: RFID Readers Status${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM rfid_readers
      GROUP BY status
    `);
    console.log(`${colors.green}✅ RFID Reader Status:${colors.reset}`);
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.status}: ${row.count} readers`);
    });
    console.log();
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ RFID readers query failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Summary
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}     TEST SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  console.log(`Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Database is working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Please check the database configuration.${colors.reset}`);
  }

  // Exit
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
console.log(`User: ${process.env.DB_USER}\n`);

runTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});