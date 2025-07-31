const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rfid_evidence_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT COUNT(*) as count FROM evidence');
    console.log(`📊 Evidence count: ${result.rows[0].count}`);
    
    // Test personnel table
    const personnel = await client.query('SELECT COUNT(*) as count FROM personnel');
    console.log(`👥 Personnel count: ${personnel.rows[0].count}`);
    
    client.release();
    console.log('🎉 Database test completed successfully!');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();