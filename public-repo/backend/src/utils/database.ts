import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'rfid_evidence_db',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || '',
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // how long to wait for a connection
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Database connection function
export async function connectDatabase(): Promise<void> {
  try {
    // Test the connection
    const client = await pool.connect();
    
    // Create database if it doesn't exist
    await createDatabaseIfNotExists();
    
    logger.info('Database connection established successfully');
    client.release();
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

// Create database if it doesn't exist
async function createDatabaseIfNotExists(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Check if database exists
    const result = await client.query(
      'SELECT datname FROM pg_catalog.pg_database WHERE datname = $1',
      [dbConfig.database]
    );
    
    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      await client.query(`CREATE DATABASE ${dbConfig.database}`);
      logger.info(`Database '${dbConfig.database}' created successfully`);
    }
  } catch (error) {
    logger.info('Database already exists or creation handled by connection');
  } finally {
    client.release();
  }
}

// Query function with error handling
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}...`);
    return result;
  } catch (error) {
    logger.error('Query error:', error);
    logger.error('Query:', text);
    logger.error('Params:', params);
    throw error;
  } finally {
    client.release();
  }
}

// Transaction helper function
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back due to error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database connection pool closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}