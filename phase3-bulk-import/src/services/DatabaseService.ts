import { Pool, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool | null = null;

  async initialize(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rfid_bulk_import',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: parseInt(process.env.DB_POOL_SIZE || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error:', err);
    });

    try {
      await this.pool.query('SELECT 1');
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
      }
      
      return result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    const migrationsPath = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsPath)) {
      logger.warn('No migrations directory found');
      return;
    }

    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      try {
        await this.query(sql);
        logger.info(`Migration executed: ${file}`);
      } catch (error: any) {
        if (error.code === '42P07') {
          logger.info(`Migration already applied: ${file}`);
        } else {
          logger.error(`Migration failed: ${file}`, error);
          throw error;
        }
      }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database connection closed');
    }
  }

  async getStats(): Promise<any> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }

    const poolStats = {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };

    const dbStats = await this.query('SELECT * FROM import_stats');
    
    return {
      pool: poolStats,
      imports: dbStats.rows[0] || {}
    };
  }
}

export default new DatabaseService();