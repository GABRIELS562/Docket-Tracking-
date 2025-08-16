/**
 * Database Schema Alignment Test
 * Tests all fixed queries to ensure they work with the actual database schema
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

async function runSchemaTests() {
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}     DATABASE SCHEMA ALIGNMENT TESTS${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Storage Boxes Table Schema
  console.log(`${colors.blue}Test 1: Storage Boxes Table Schema${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        box_code, zone_id, client_id, shelf_code, 
        capacity, occupied, status, monthly_rate
      FROM storage_boxes 
      LIMIT 1
    `);
    console.log(`${colors.green}✅ Storage boxes table has correct columns${colors.reset}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Storage boxes schema error: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 2: Dockets Table Schema
  console.log(`${colors.blue}Test 2: Dockets Table Schema${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        docket_code, case_number, client_id, storage_box_id,
        rfid_tag, barcode, current_location, current_zone_id, status
      FROM dockets 
      LIMIT 1
    `);
    console.log(`${colors.green}✅ Dockets table has correct columns${colors.reset}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Dockets schema error: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 3: Retrieval Requests Table Schema
  console.log(`${colors.blue}Test 3: Retrieval Requests Table Schema${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        request_number, client_id, requested_by, urgency,
        status, total_items, retrieval_fee, completion_deadline
      FROM retrieval_requests 
      LIMIT 1
    `);
    console.log(`${colors.green}✅ Retrieval requests table has correct columns${colors.reset}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Retrieval requests schema error: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 4: Docket Movements Table Schema
  console.log(`${colors.blue}Test 4: Docket Movements Table Schema${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        docket_id, from_location, to_location, to_box_id,
        movement_type, performed_by, movement_reason
      FROM docket_movements 
      LIMIT 1
    `);
    console.log(`${colors.green}✅ Docket movements table has correct columns${colors.reset}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Docket movements schema error: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 5: Invoices Table Schema
  console.log(`${colors.blue}Test 5: Invoices Table Schema${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        invoice_number, client_id, billing_period_start, billing_period_end,
        storage_box_count, storage_fees, retrieval_fees, other_fees,
        subtotal, tax_amount, total_amount, due_date, status
      FROM invoices 
      LIMIT 1
    `);
    console.log(`${colors.green}✅ Invoices table has correct columns${colors.reset}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Invoices schema error: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 6: Create Storage Box Query
  console.log(`${colors.blue}Test 6: Create Storage Box Query${colors.reset}`);
  try {
    await withTransaction(async (client: any) => {
      const result = await client.query(`
        INSERT INTO storage_boxes 
        (box_code, client_id, box_type, capacity, shelf_code, zone_id, monthly_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, ['TEST-BOX-001', 1, 'standard', 100, 'SHELF-A-01', 1, 40.00]);
      
      if (result.rows[0].box_code === 'TEST-BOX-001') {
        console.log(`${colors.green}✅ Storage box creation query works${colors.reset}\n`);
        testsPassed++;
      }
      
      // Rollback to not actually create the box
      throw new Error('Rollback test');
    }).catch((error: any) => {
      if (error.message !== 'Rollback test') {
        throw error;
      }
    });
  } catch (error: any) {
    console.log(`${colors.red}❌ Storage box creation failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 7: Update Docket Location Query
  console.log(`${colors.blue}Test 7: Update Docket Location Query${colors.reset}`);
  try {
    await withTransaction(async (client: any) => {
      // First get a docket ID
      const docketResult = await client.query('SELECT id FROM dockets LIMIT 1');
      if (docketResult.rows.length > 0) {
        const docketId = docketResult.rows[0].id;
        
        await client.query(`
          UPDATE dockets 
          SET storage_box_id = $1,
              current_location = $2,
              current_zone_id = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [1, 'Test Location', 1, docketId]);
        
        console.log(`${colors.green}✅ Docket update query works${colors.reset}\n`);
        testsPassed++;
      }
      
      // Rollback changes
      throw new Error('Rollback test');
    }).catch((error: any) => {
      if (error.message !== 'Rollback test') {
        throw error;
      }
    });
  } catch (error: any) {
    console.log(`${colors.red}❌ Docket update failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 8: Storage Analytics Query
  console.log(`${colors.blue}Test 8: Storage Analytics Query${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT sb.id) as total_boxes,
        COUNT(DISTINCT d.id) as total_dockets_stored,
        SUM(sb.monthly_rate) as monthly_revenue,
        AVG(sb.occupied::float / NULLIF(sb.capacity, 0) * 100) as avg_utilization
      FROM clients c
      LEFT JOIN storage_boxes sb ON c.id = sb.client_id
      LEFT JOIN dockets d ON sb.id = d.storage_box_id
    `);
    console.log(`${colors.green}✅ Storage analytics query works${colors.reset}`);
    console.log(`   - Total clients: ${result.rows[0].total_clients}`);
    console.log(`   - Total boxes: ${result.rows[0].total_boxes}`);
    console.log(`   - Total dockets: ${result.rows[0].total_dockets_stored}\n`);
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Analytics query failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 9: Retrieval Request Creation
  console.log(`${colors.blue}Test 9: Retrieval Request Creation${colors.reset}`);
  try {
    await withTransaction(async (client: any) => {
      // Create retrieval request
      const result = await client.query(`
        INSERT INTO retrieval_requests 
        (request_number, client_id, urgency, status, requested_by, 
         total_items, retrieval_fee, completion_deadline)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6, 
         NOW() + INTERVAL '2 hours')
        RETURNING *
      `, ['TEST-REQ-001', 1, 'normal', 1, 2, 0]);
      
      const requestId = result.rows[0].id;
      
      // Add items
      await client.query(`
        INSERT INTO retrieval_request_items (request_id, docket_id, status)
        VALUES ($1, $2, 'pending')
      `, [requestId, 1]);
      
      console.log(`${colors.green}✅ Retrieval request creation works${colors.reset}\n`);
      testsPassed++;
      
      // Rollback
      throw new Error('Rollback test');
    }).catch((error: any) => {
      if (error.message !== 'Rollback test') {
        throw error;
      }
    });
  } catch (error: any) {
    console.log(`${colors.red}❌ Retrieval request creation failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }

  // Test 10: Box Utilization Query
  console.log(`${colors.blue}Test 10: Box Utilization Query${colors.reset}`);
  try {
    const result = await query(`
      SELECT 
        box_code,
        capacity,
        occupied,
        ROUND((occupied::numeric / NULLIF(capacity, 0)) * 100, 2) as utilization_percent,
        shelf_code,
        monthly_rate
      FROM storage_boxes
      LIMIT 5
    `);
    console.log(`${colors.green}✅ Box utilization query works${colors.reset}`);
    if (result.rows.length > 0) {
      console.log(`   Sample: ${result.rows[0].box_code} - ${result.rows[0].utilization_percent}% utilized\n`);
    }
    testsPassed++;
  } catch (error: any) {
    console.log(`${colors.red}❌ Box utilization query failed: ${error.message}${colors.reset}\n`);
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
    console.log(`\n${colors.green}🎉 All schema alignment tests passed! Database queries are working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Please check the database schema.${colors.reset}`);
  }

  // Exit
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
console.log(`User: ${process.env.DB_USER}\n`);

runSchemaTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});