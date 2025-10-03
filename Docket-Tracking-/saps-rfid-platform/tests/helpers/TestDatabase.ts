import { Pool, PoolClient } from 'pg';
import { getDatabaseConfig } from '../../src/config';

/**
 * Test Database Helper
 *
 * Provides utilities for testing with a real database:
 * - Transaction management (rollback after tests)
 * - Schema creation
 * - Data cleanup
 * - Seed data
 */
export class TestDatabase {
  private pool: Pool;
  private client: PoolClient | null = null;

  constructor() {
    const config = getDatabaseConfig();
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  /**
   * Connect to database and start transaction
   */
  async connect(): Promise<void> {
    this.client = await this.pool.connect();
    await this.client.query('BEGIN');
  }

  /**
   * Rollback transaction and disconnect
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.query('ROLLBACK');
      this.client.release();
      this.client = null;
    }
  }

  /**
   * Execute query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  /**
   * Clear all data from tables
   */
  async clearAllData(): Promise<void> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    await this.client.query('TRUNCATE TABLE location_history CASCADE');
    await this.client.query('TRUNCATE TABLE dockets CASCADE');
    await this.client.query('TRUNCATE TABLE readers CASCADE');
    await this.client.query('TRUNCATE TABLE zones CASCADE');
  }

  /**
   * Seed test zones
   */
  async seedZones(): Promise<void> {
    await this.query(
      `INSERT INTO zones (zone_id, zone_name, zone_type, capacity, created_at, updated_at)
       VALUES
       (1, 'Evidence Storage A', 'storage', 10000, NOW(), NOW()),
       (2, 'Evidence Storage B', 'storage', 5000, NOW(), NOW()),
       (3, 'Lab Processing', 'processing', 100, NOW(), NOW()),
       (4, 'Court Evidence', 'court', 500, NOW(), NOW())`
    );
  }

  /**
   * Seed test readers
   */
  async seedReaders(): Promise<void> {
    await this.query(
      `INSERT INTO readers (reader_id, reader_name, ip_address, zone_id, status, created_at, updated_at)
       VALUES
       ('FX7500-01', 'Storage A - North', '192.168.1.101', 1, 'online', NOW(), NOW()),
       ('FX7500-02', 'Storage A - South', '192.168.1.102', 1, 'online', NOW(), NOW()),
       ('FX7500-03', 'Storage B - East', '192.168.1.103', 2, 'online', NOW(), NOW())`
    );
  }

  /**
   * Seed test docket
   */
  async seedDocket(labNumber: string, caseRef: string, rfidEpc: string, zoneId: number = 1): Promise<void> {
    await this.query(
      `INSERT INTO dockets (lab_number, case_reference, rfid_epc, status, current_zone_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'active', $4, NOW(), NOW())`,
      [labNumber, caseRef, rfidEpc, zoneId]
    );
  }

  /**
   * Get docket by lab number
   */
  async getDocket(labNumber: string): Promise<any> {
    const results = await this.query(
      'SELECT * FROM dockets WHERE lab_number = $1',
      [labNumber]
    );
    return results[0] || null;
  }

  /**
   * Close pool (call after all tests)
   */
  async closePool(): Promise<void> {
    await this.pool.end();
  }
}
