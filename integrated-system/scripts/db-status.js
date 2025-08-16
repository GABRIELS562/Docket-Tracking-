/**
 * Database Status Check
 * Quick health check of the database
 */

const { Client } = require('pg');

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
  database: process.env.DB_NAME || 'rfid_tracking'
};

async function checkDatabaseStatus() {
  console.log(`${colors.cyan}📊 Database Status Check${colors.reset}`);
  console.log('========================\n');

  const client = new Client(config);

  try {
    await client.connect();
    console.log(`${colors.green}✅ Database Connection: OK${colors.reset}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}\n`);

    // Check tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log(`${colors.cyan}📋 Tables: ${tables.rows.length}${colors.reset}`);

    // Check record counts
    const counts = await client.query(`
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
      UNION ALL
      SELECT 'rfid_events', COUNT(*) FROM rfid_events
      UNION ALL
      SELECT 'docket_movements', COUNT(*) FROM docket_movements
      ORDER BY table_name
    `);
    
    console.log(`\n${colors.cyan}📈 Record Counts:${colors.reset}`);
    counts.rows.forEach(row => {
      const indicator = row.count > 0 ? '✅' : '⚠️';
      console.log(`   ${indicator} ${row.table_name}: ${row.count}`);
    });

    // Check recent activity
    const recentActivity = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM dockets WHERE updated_at > NOW() - INTERVAL '1 day') as recent_dockets,
        (SELECT COUNT(*) FROM rfid_events) as total_events,
        (SELECT MAX(movement_timestamp) FROM docket_movements) as last_movement,
        (SELECT MAX(last_login) FROM users) as last_login
    `);

    console.log(`\n${colors.cyan}⏰ Recent Activity:${colors.reset}`);
    const activity = recentActivity.rows[0];
    console.log(`   Recent Dockets (24h): ${activity.recent_dockets || 0}`);
    console.log(`   Total RFID Events: ${activity.total_events || 0}`);
    console.log(`   Last Movement: ${activity.last_movement || 'Never'}`);
    console.log(`   Last Login: ${activity.last_login || 'Never'}`);

    // Check database size
    const size = await client.query(`
      SELECT pg_database_size('${config.database}') as size
    `);
    
    const dbSize = (size.rows[0].size / 1024 / 1024).toFixed(2);
    console.log(`\n${colors.cyan}💾 Database Size: ${dbSize} MB${colors.reset}`);

    // Check active connections
    const connections = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_stat_activity 
      WHERE datname = '${config.database}'
    `);
    
    console.log(`${colors.cyan}🔌 Active Connections: ${connections.rows[0].count}${colors.reset}`);

    await client.end();
    
    console.log(`\n${colors.green}✅ Database is healthy!${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Database check failed:${colors.reset}`);
    console.error(error.message);
    console.error(`\n${colors.yellow}💡 Try running: npm run db:refresh${colors.reset}`);
    process.exit(1);
  }
}

// Run the check
checkDatabaseStatus();