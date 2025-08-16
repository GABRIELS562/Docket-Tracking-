import { Pool, PoolClient, QueryResult } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@/utils/Logger';

export class DatabaseService {
  private pool: Pool;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DatabaseService');
    this.pool = this.createPool();
  }

  private createPool(): Pool {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rfid_evidence_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
      maxUses: parseInt(process.env.DB_MAX_USES || '7500'),
      application_name: 'bulk-loading-service'
    };

    const pool = new Pool(config);

    pool.on('connect', (client) => {
      this.logger.debug('New database client connected');
    });

    pool.on('error', (err) => {
      this.logger.error('Database pool error:', err);
    });

    return pool;
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      this.logger.debug('Query executed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration_ms: duration,
        rows_affected: result.rowCount
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Query failed', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params?.slice(0, 5),
        duration_ms: duration,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async batchInsert(
    tableName: string,
    columns: string[],
    values: any[][],
    batchSize: number = 1000
  ): Promise<number> {
    let totalInserted = 0;
    
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const placeholders: string[] = [];
      const flatValues: any[] = [];
      
      batch.forEach((row, rowIndex) => {
        const rowPlaceholders: string[] = [];
        row.forEach((value, colIndex) => {
          const paramIndex = rowIndex * columns.length + colIndex + 1;
          rowPlaceholders.push(`$${flatValues.length + 1}`);
          flatValues.push(value);
        });
        placeholders.push(`(${rowPlaceholders.join(', ')})`);
      });
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders.join(', ')}
      `;
      
      const result = await this.query(query, flatValues);
      totalInserted += result.rowCount || 0;
      
      this.logger.debug(`Batch insert: ${i + batch.length}/${values.length} records processed`);
    }
    
    return totalInserted;
  }

  async bulkCopy(
    tableName: string,
    columns: string[],
    data: any[][],
    options: {
      delimiter?: string;
      null_value?: string;
      escape?: string;
      quote?: string;
    } = {}
  ): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const copyQuery = `
        COPY ${tableName} (${columns.join(', ')})
        FROM STDIN
        WITH (
          FORMAT csv,
          DELIMITER '${options.delimiter || ','}',
          NULL '${options.null_value || '\\N'}',
          ESCAPE '${options.escape || '"'}',
          QUOTE '${options.quote || '"'}'
        )
      `;
      
      const copyStream = client.query(copyQuery);
      
      for (const row of data) {
        const csvRow = row.map(value => {
          if (value === null || value === undefined) {
            return options.null_value || '\\N';
          }
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        }).join(options.delimiter || ',');
        
        copyStream.write(csvRow + '\n');
      }
      
      copyStream.end();
      
      return data.length;
    } finally {
      client.release();
    }
  }

  async createIndex(
    indexName: string,
    tableName: string,
    columns: string[],
    options: {
      unique?: boolean;
      concurrent?: boolean;
      where?: string;
    } = {}
  ): Promise<void> {
    const uniqueClause = options.unique ? 'UNIQUE ' : '';
    const concurrentClause = options.concurrent ? 'CONCURRENTLY ' : '';
    const whereClause = options.where ? ` WHERE ${options.where}` : '';
    
    const query = `
      CREATE ${uniqueClause}INDEX ${concurrentClause}${indexName}
      ON ${tableName} (${columns.join(', ')})${whereClause}
    `;
    
    await this.query(query);
    this.logger.info(`Created index ${indexName} on ${tableName}`);
  }

  async analyze(tableName?: string): Promise<void> {
    const query = tableName ? `ANALYZE ${tableName}` : 'ANALYZE';
    await this.query(query);
    this.logger.info(`Analysis completed for ${tableName || 'all tables'}`);
  }

  async vacuum(tableName?: string, options: {
    full?: boolean;
    analyze?: boolean;
    verbose?: boolean;
  } = {}): Promise<void> {
    const fullClause = options.full ? 'FULL ' : '';
    const analyzeClause = options.analyze ? 'ANALYZE ' : '';
    const verboseClause = options.verbose ? 'VERBOSE ' : '';
    
    const query = `VACUUM ${fullClause}${analyzeClause}${verboseClause}${tableName || ''}`;
    await this.query(query);
    this.logger.info(`Vacuum completed for ${tableName || 'all tables'}`);
  }

  async getTableStats(tableName: string): Promise<{
    row_count: number;
    table_size_mb: number;
    index_size_mb: number;
    total_size_mb: number;
  }> {
    const query = `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE tablename = $1;
      
      SELECT 
        COUNT(*) as row_count,
        pg_size_pretty(pg_total_relation_size($1)) as total_size,
        pg_size_pretty(pg_relation_size($1)) as table_size,
        pg_size_pretty(pg_total_relation_size($1) - pg_relation_size($1)) as index_size
    `;
    
    const result = await this.query(`
      SELECT 
        (SELECT COUNT(*) FROM ${tableName}) as row_count,
        ROUND(pg_relation_size('${tableName}') / 1024.0 / 1024.0, 2) as table_size_mb,
        ROUND((pg_total_relation_size('${tableName}') - pg_relation_size('${tableName}')) / 1024.0 / 1024.0, 2) as index_size_mb,
        ROUND(pg_total_relation_size('${tableName}') / 1024.0 / 1024.0, 2) as total_size_mb
    `);
    
    return result.rows[0];
  }

  async getDatabaseStats(): Promise<{
    database_size_mb: number;
    active_connections: number;
    max_connections: number;
    cache_hit_ratio: number;
  }> {
    const query = `
      SELECT 
        ROUND(pg_database_size(current_database()) / 1024.0 / 1024.0, 2) as database_size_mb,
        (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections,
        ROUND(
          (SELECT sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) 
           FROM pg_stat_database 
           WHERE datname = current_database()), 2
        ) as cache_hit_ratio
    `;
    
    const result = await this.query(query);
    return result.rows[0];
  }

  async createBackup(backupName: string, options: {
    compress?: boolean;
    format?: 'custom' | 'plain' | 'directory' | 'tar';
    schema_only?: boolean;
    data_only?: boolean;
  } = {}): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${backupName}_${timestamp}`;
    const backupPath = path.join(process.cwd(), 'backups', fileName);
    
    if (!fs.existsSync(path.dirname(backupPath))) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    }
    
    const pgDumpOptions = [
      `--host=${process.env.DB_HOST || 'localhost'}`,
      `--port=${process.env.DB_PORT || '5432'}`,
      `--username=${process.env.DB_USER || 'postgres'}`,
      `--dbname=${process.env.DB_NAME || 'rfid_evidence_db'}`,
      `--file=${backupPath}`,
      `--format=${options.format || 'custom'}`,
      '--verbose'
    ];
    
    if (options.compress) {
      pgDumpOptions.push('--compress=9');
    }
    
    if (options.schema_only) {
      pgDumpOptions.push('--schema-only');
    }
    
    if (options.data_only) {
      pgDumpOptions.push('--data-only');
    }
    
    // Note: In a real implementation, you would execute pg_dump here
    // For this implementation, we'll just log the command
    this.logger.info(`Backup command: pg_dump ${pgDumpOptions.join(' ')}`);
    
    return backupPath;
  }

  async restoreBackup(backupPath: string): Promise<void> {
    const pgRestoreOptions = [
      `--host=${process.env.DB_HOST || 'localhost'}`,
      `--port=${process.env.DB_PORT || '5432'}`,
      `--username=${process.env.DB_USER || 'postgres'}`,
      `--dbname=${process.env.DB_NAME || 'rfid_evidence_db'}`,
      '--verbose',
      '--clean',
      '--if-exists',
      backupPath
    ];
    
    // Note: In a real implementation, you would execute pg_restore here
    this.logger.info(`Restore command: pg_restore ${pgRestoreOptions.join(' ')}`);
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database connection check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    this.logger.info('Database connection pool closed');
  }

  getActiveConnections(): number {
    return this.pool.totalCount;
  }

  getIdleConnections(): number {
    return this.pool.idleCount;
  }

  getWaitingClients(): number {
    return this.pool.waitingCount;
  }
}