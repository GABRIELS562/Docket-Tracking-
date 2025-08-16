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
      database: process.env.DB_NAME || 'rfid_hardware_integration',
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
        if (error.code === '42P07' || error.code === '42P06') {
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

  async getReaderStats(): Promise<any> {
    const result = await this.query(`
      SELECT 
        COUNT(*) as total_readers,
        COUNT(CASE WHEN status = 'online' THEN 1 END) as online_readers,
        COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline_readers,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_readers
      FROM rfid_readers WHERE active = true
    `);

    return result.rows[0];
  }

  async getEventStats(timeWindow: string = '1 hour'): Promise<any> {
    const result = await this.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT tag_id) as unique_tags,
        COUNT(DISTINCT reader_id) as active_readers,
        AVG(signal_strength) as avg_signal_strength,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed_events,
        COUNT(CASE WHEN processed = false THEN 1 END) as pending_events
      FROM rfid_events 
      WHERE timestamp > NOW() - INTERVAL '${timeWindow}'
    `);

    return result.rows[0];
  }

  async getSystemHealth(): Promise<any> {
    const [readerHealth, eventHealth, alertHealth] = await Promise.all([
      this.query(`
        SELECT 
          reader_id,
          status,
          last_ping,
          (health_metrics->>'cpu_usage')::decimal as cpu_usage,
          (health_metrics->>'memory_usage')::decimal as memory_usage,
          (health_metrics->>'temperature')::decimal as temperature
        FROM rfid_readers 
        WHERE active = true
        ORDER BY last_ping DESC
      `),
      this.query(`
        SELECT 
          COUNT(*) as events_last_minute,
          AVG(processing_time) as avg_processing_time
        FROM rfid_events 
        WHERE timestamp > NOW() - INTERVAL '1 minute'
      `),
      this.query(`
        SELECT 
          COUNT(*) as unresolved_alerts,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_alerts,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_alerts
        FROM system_alerts 
        WHERE resolved = false
      `)
    ]);

    return {
      readers: readerHealth.rows,
      events: eventHealth.rows[0],
      alerts: alertHealth.rows[0]
    };
  }

  async getPerformanceMetrics(): Promise<any> {
    const result = await this.query(`
      WITH hourly_stats AS (
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as event_count,
          COUNT(DISTINCT tag_id) as unique_tags,
          AVG(signal_strength) as avg_signal_strength
        FROM rfid_events 
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour
      ),
      processing_stats AS (
        SELECT 
          AVG(processing_time_ms) as avg_processing_time,
          SUM(event_count) as total_processed,
          SUM(failed_count) as total_failed
        FROM rfid_event_batches
        WHERE started_at > NOW() - INTERVAL '24 hours'
      )
      SELECT 
        (SELECT json_agg(hourly_stats) FROM hourly_stats) as hourly_events,
        (SELECT row_to_json(processing_stats) FROM processing_stats) as processing_metrics
    `);

    return result.rows[0];
  }
}

export default new DatabaseService();