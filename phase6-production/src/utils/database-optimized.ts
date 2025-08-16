import { Pool, PoolClient } from 'pg';
import { performance } from 'perf_hooks';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseStats {
  queries: number;
  totalDuration: number;
  slowQueries: number;
  errors: number;
  activeConnections: number;
}

class DatabaseManager {
  private masterPool: Pool;
  private replicaPool?: Pool;
  private stats: DatabaseStats = {
    queries: 0,
    totalDuration: 0,
    slowQueries: 0,
    errors: 0,
    activeConnections: 0
  };

  constructor() {
    // Master database (read/write)
    this.masterPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'docket_tracking_prod',
      user: process.env.DB_USER || 'docket_user',
      password: process.env.DB_PASSWORD,
      
      // Connection Pool Configuration
      min: parseInt(process.env.DB_POOL_MIN || '10'),
      max: parseInt(process.env.DB_POOL_MAX || '50'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
      
      // Performance Tuning
      statement_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000'),
      query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '10000'),
      
      // SSL Configuration (enable in production)
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      
      // Application Name for monitoring
      application_name: 'rfid-docket-api'
    });

    // Read replica (read-only queries)
    if (process.env.DB_REPLICA_HOST) {
      this.replicaPool = new Pool({
        host: process.env.DB_REPLICA_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'docket_tracking_prod',
        user: process.env.DB_USER || 'docket_user',
        password: process.env.DB_PASSWORD,
        
        min: parseInt(process.env.DB_POOL_MIN || '5'),
        max: parseInt(process.env.DB_POOL_MAX || '25'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
        
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        application_name: 'rfid-docket-api-replica'
      });

      this.replicaPool.on('error', (err) => {
        console.error('Replica database pool error:', err);
      });
    }

    this.setupEventHandlers();
    this.startMonitoring();
  }

  private setupEventHandlers(): void {
    this.masterPool.on('error', (err) => {
      console.error('Master database pool error:', err);
      this.stats.errors++;
    });

    this.masterPool.on('connect', (client) => {
      this.stats.activeConnections++;
      console.log(`Database connection established. Active: ${this.stats.activeConnections}`);
    });

    this.masterPool.on('remove', (client) => {
      this.stats.activeConnections--;
      console.log(`Database connection removed. Active: ${this.stats.activeConnections}`);
    });
  }

  private startMonitoring(): void {
    // Log performance stats every 5 minutes
    setInterval(() => {
      this.logPerformanceStats();
    }, 5 * 60 * 1000);
  }

  private logPerformanceStats(): void {
    const avgDuration = this.stats.queries > 0 ? (this.stats.totalDuration / this.stats.queries).toFixed(2) : '0';
    const slowQueryRate = this.stats.queries > 0 ? ((this.stats.slowQueries / this.stats.queries) * 100).toFixed(2) : '0';

    console.log('📊 Database Performance Stats:', {
      totalQueries: this.stats.queries,
      avgQueryDuration: `${avgDuration}ms`,
      slowQueries: this.stats.slowQueries,
      slowQueryRate: `${slowQueryRate}%`,
      errors: this.stats.errors,
      activeConnections: this.stats.activeConnections,
      masterPoolSize: this.masterPool.totalCount,
      replicaPoolSize: this.replicaPool?.totalCount || 0
    });
  }

  async query(text: string, params?: any[], useReplica: boolean = false): Promise<any> {
    const start = performance.now();
    const pool = (useReplica && this.replicaPool) ? this.replicaPool : this.masterPool;
    const poolName = (useReplica && this.replicaPool) ? 'replica' : 'master';
    
    let client: PoolClient | null = null;
    
    try {
      client = await pool.connect();
      const result = await client.query(text, params);
      
      const duration = performance.now() - start;
      this.stats.queries++;
      this.stats.totalDuration += duration;
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        this.stats.slowQueries++;
        console.warn(`🐌 Slow Query (${duration.toFixed(2)}ms) on ${poolName}:`, {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          params: params?.length || 0,
          rows: result.rowCount
        });
      } else if (process.env.LOG_LEVEL === 'debug') {
        console.log(`Query executed (${duration.toFixed(2)}ms) on ${poolName}:`, {
          rows: result.rowCount
        });
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      const duration = performance.now() - start;
      
      console.error(`❌ Database Query Error (${duration.toFixed(2)}ms) on ${poolName}:`, {
        error: error instanceof Error ? error.message : error,
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params?.length || 0
      });
      
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getClient(useReplica: boolean = false): Promise<PoolClient> {
    const pool = (useReplica && this.replicaPool) ? this.replicaPool : this.masterPool;
    return await pool.connect();
  }

  async transaction(callback: (client: PoolClient) => Promise<any>): Promise<any> {
    const client = await this.masterPool.connect();
    
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

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW() as current_time, version() as version', [], false);
      console.log('✅ Master database connection successful!', {
        time: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0]
      });

      if (this.replicaPool) {
        const replicaResult = await this.query('SELECT NOW() as current_time', [], true);
        console.log('✅ Replica database connection successful!', {
          time: replicaResult.rows[0].current_time
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async closeAll(): Promise<void> {
    await this.masterPool.end();
    if (this.replicaPool) {
      await this.replicaPool.end();
    }
    console.log('Database pools closed');
  }

  getStats(): DatabaseStats {
    return { ...this.stats };
  }

  // Health check for load balancer
  async healthCheck(): Promise<{ status: string; master: boolean; replica: boolean; latency: number }> {
    const start = performance.now();
    
    try {
      const masterCheck = this.query('SELECT 1', [], false);
      const replicaCheck = this.replicaPool ? this.query('SELECT 1', [], true) : Promise.resolve(true);
      
      const [masterResult, replicaResult] = await Promise.allSettled([masterCheck, replicaCheck]);
      
      const latency = performance.now() - start;
      
      return {
        status: 'healthy',
        master: masterResult.status === 'fulfilled',
        replica: replicaResult.status === 'fulfilled',
        latency: Math.round(latency)
      };
    } catch (error) {
      const latency = performance.now() - start;
      
      return {
        status: 'unhealthy',
        master: false,
        replica: false,
        latency: Math.round(latency)
      };
    }
  }

  // Optimized queries for common operations
  async findObjectsPaginated(filters: any, page: number = 1, limit: number = 20): Promise<any> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    // Build WHERE clause dynamically (same as before but with optimizations)
    if (filters.search) {
      paramCount++;
      whereClause += ` AND (
        o.name ILIKE $${paramCount} OR 
        o.description ILIKE $${paramCount} OR 
        o.object_code ILIKE $${paramCount} OR
        to_tsvector('english', o.name || ' ' || COALESCE(o.description, '')) @@ plainto_tsquery('english', $${paramCount})
      )`;
      params.push(`%${filters.search}%`);
    }

    if (filters.object_type) {
      paramCount++;
      whereClause += ` AND o.object_type = $${paramCount}`;
      params.push(filters.object_type);
    }

    if (filters.status) {
      paramCount++;
      whereClause += ` AND o.status = $${paramCount}`;
      params.push(filters.status);
    }

    // Add pagination parameters
    paramCount++;
    params.push(limit);
    paramCount++;
    params.push(offset);

    // Optimized query with prepared statement pattern
    const query = `
      SELECT 
        o.*,
        l.location_name,
        p.first_name || ' ' || p.last_name as assigned_to_name,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        COUNT(*) OVER() as total_count
      FROM objects o
      LEFT JOIN locations l ON o.current_location_id = l.id
      LEFT JOIN personnel p ON o.assigned_to_id = p.id
      LEFT JOIN personnel creator ON o.created_by_id = creator.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    // Use replica for read operations
    return this.query(query, params, true);
  }
}

export const db = new DatabaseManager();

// Convenience functions maintaining the same interface
export const query = (text: string, params?: any[], useReplica?: boolean) => 
  db.query(text, params, useReplica);

export const getClient = (useReplica?: boolean) => 
  db.getClient(useReplica);

export const transaction = (callback: (client: PoolClient) => Promise<any>) => 
  db.transaction(callback);

export const testConnection = () => 
  db.testConnection();

export const closePool = () => 
  db.closeAll();

export default db;