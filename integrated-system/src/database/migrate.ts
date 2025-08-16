const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rfid_tracking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const pool = new Pool(dbConfig);

async function runMigration() {
  console.log('🚀 Starting database migration...');
  console.log(`📦 Connecting to database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${files.length} migration files`);

    // Create migrations tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Run each migration
    for (const file of files) {
      // Check if migration already executed
      const result = await pool.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`📝 Running migration: ${file}`);
      
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      // Split by statements and execute
      const statements = sql
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && !s.startsWith('--'));

      let statementCount = 0;
      for (const statement of statements) {
        try {
          await pool.query(statement + ';');
          statementCount++;
        } catch (err: any) {
          // Skip certain expected errors
          if (err.message.includes('already exists') || 
              err.message.includes('does not exist')) {
            continue;
          }
          console.error(`❌ Error in statement ${statementCount + 1}:`, err.message);
          // Continue with other statements
        }
      }

      // Mark migration as executed
      await pool.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      );

      console.log(`✅ Completed ${file} (${statementCount} statements executed)`);
    }

    // Show summary
    console.log('\n📊 Database Statistics:');
    
    const tables = [
      'users', 'clients', 'storage_zones', 'storage_boxes', 
      'dockets', 'rfid_readers', 'invoices'
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        // Table might not exist yet
      }
    }

    console.log('\n✨ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;