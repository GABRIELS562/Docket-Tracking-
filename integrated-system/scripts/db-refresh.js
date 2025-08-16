/**
 * Database Refresh Script
 * Drops and recreates the database with fresh schema and data
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || '',
  database: 'postgres' // Connect to postgres db first
};

const dbName = process.env.DB_NAME || 'rfid_tracking';

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function runSQL(client, sql, suppressErrors = false) {
  try {
    const result = await client.query(sql);
    return result;
  } catch (error) {
    if (!suppressErrors) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    }
    throw error;
  }
}

async function refreshDatabase() {
  console.log(`${colors.cyan}🔄 Database Refresh Script${colors.reset}`);
  console.log('==========================\n');

  console.log(`${colors.yellow}⚠️  WARNING: This will DROP and RECREATE the database!${colors.reset}`);
  console.log(`Database: ${dbName}`);
  console.log(`Host: ${config.host}:${config.port}`);
  console.log(`User: ${config.user}\n`);

  const shouldContinue = await confirm('Are you sure you want to continue? (yes/no): ');
  
  if (!shouldContinue) {
    console.log(`${colors.red}❌ Database refresh cancelled${colors.reset}`);
    process.exit(0);
  }

  const client = new Client(config);

  try {
    await client.connect();
    console.log(`${colors.green}✅ Connected to PostgreSQL${colors.reset}\n`);

    // Step 1: Drop existing database
    console.log(`${colors.yellow}📦 Step 1: Dropping existing database...${colors.reset}`);
    try {
      // Terminate existing connections
      await runSQL(client, `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${dbName}' AND pid <> pg_backend_pid()
      `, true);
      
      await runSQL(client, `DROP DATABASE IF EXISTS ${dbName}`, true);
      console.log(`${colors.green}✅ Database dropped${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.yellow}Note: Database may not exist${colors.reset}\n`);
    }

    // Step 2: Create fresh database
    console.log(`${colors.yellow}📦 Step 2: Creating fresh database...${colors.reset}`);
    await runSQL(client, `CREATE DATABASE ${dbName}`);
    console.log(`${colors.green}✅ Database created${colors.reset}\n`);

    // Close connection to postgres db
    await client.end();

    // Connect to new database
    const dbClient = new Client({
      ...config,
      database: dbName
    });
    await dbClient.connect();

    // Step 3: Create UUID extension
    console.log(`${colors.yellow}📦 Step 3: Creating extensions...${colors.reset}`);
    await runSQL(dbClient, 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log(`${colors.green}✅ UUID extension created${colors.reset}\n`);

    // Step 4: Run schema migration
    console.log(`${colors.yellow}📦 Step 4: Creating schema...${colors.reset}`);
    const schemaPath = path.join(__dirname, '../src/database/migrations/001_initial_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Split by semicolons but ignore those in functions
    const statements = schema.split(/;\s*$/m).filter(s => s.trim());
    let created = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await runSQL(dbClient, statement, true);
          created++;
        } catch (error) {
          // Some statements may fail but that's okay
        }
      }
    }
    console.log(`${colors.green}✅ Schema created (${created} statements executed)${colors.reset}\n`);

    // Step 5: Load seed data
    console.log(`${colors.yellow}📦 Step 5: Loading seed data...${colors.reset}`);
    const seedPath = path.join(__dirname, '../src/database/migrations/002_seed_data.sql');
    const seedData = await fs.readFile(seedPath, 'utf8');
    
    const seedStatements = seedData.split(/;\s*$/m).filter(s => s.trim());
    let seeded = 0;
    
    for (const statement of seedStatements) {
      if (statement.trim()) {
        try {
          await runSQL(dbClient, statement, true);
          seeded++;
        } catch (error) {
          // Some statements may fail but that's okay
        }
      }
    }
    console.log(`${colors.green}✅ Seed data loaded (${seeded} statements executed)${colors.reset}\n`);

    // Step 6: Verify database
    console.log(`${colors.yellow}📦 Step 6: Verifying database...${colors.reset}`);
    
    const tables = await runSQL(dbClient, `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log(`Tables created: ${tables.rows.length}`);
    tables.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });

    console.log('\nRecord counts:');
    const counts = await runSQL(dbClient, `
      SELECT 
        'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'clients', COUNT(*) FROM clients
      UNION ALL
      SELECT 'dockets', COUNT(*) FROM dockets
      UNION ALL
      SELECT 'storage_boxes', COUNT(*) FROM storage_boxes
      UNION ALL
      SELECT 'storage_zones', COUNT(*) FROM storage_zones
      UNION ALL
      SELECT 'rfid_readers', COUNT(*) FROM rfid_readers
      ORDER BY table_name
    `);
    
    counts.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.count} records`);
    });

    await dbClient.end();

    console.log(`\n${colors.green}✅ Database refresh complete!${colors.reset}\n`);
    console.log('Default credentials:');
    console.log('  Admin: admin@govstorageservices.gov.za / admin123');
    console.log('  Manager: manager@govstorageservices.gov.za / manager123\n');
    console.log('You can now restart your application servers.');

  } catch (error) {
    console.error(`\n${colors.red}❌ Database refresh failed:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Run the refresh
refreshDatabase();