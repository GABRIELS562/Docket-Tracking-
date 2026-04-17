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

  // ============================================================================
  // Item Helpers (Generic - Phase 0)
  // ============================================================================

  /**
   * Seed test item
   */
  async seedItem(
    itemNumber: string,
    description: string,
    rfidEpc: string,
    status: string = 'registered',
    category: string = 'other'
  ): Promise<void> {
    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await this.query(
      `INSERT INTO items (id, item_number, rfid_tag_epc, reference_id, description, category, status, is_active, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, 'N/A', $4, $5, $6, true, NOW(), NOW(), '{}')`,
      [id, itemNumber, rfidEpc, description, category, status]
    );
  }

  /**
   * Seed test item in a specific zone
   */
  async seedItemInZone(
    itemNumber: string,
    description: string,
    rfidEpc: string,
    zoneId: string,
    status: string = 'registered',
    category: string = 'other'
  ): Promise<void> {
    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await this.query(
      `INSERT INTO items (id, item_number, rfid_tag_epc, reference_id, description, category, status, is_active, current_zone_id, last_seen_at, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, 'N/A', $4, $5, $6, true, $7, NOW(), NOW(), NOW(), '{}')`,
      [id, itemNumber, rfidEpc, description, category, status, zoneId]
    );
  }

  /**
   * Get item by item number
   */
  async getItem(itemNumber: string): Promise<any> {
    const results = await this.query(
      'SELECT * FROM items WHERE item_number = $1',
      [itemNumber]
    );
    return results[0] || null;
  }

  /**
   * Seed item with all fields
   */
  async seedItemFull(params: {
    itemNumber: string;
    description: string;
    rfidEpc: string;
    referenceId?: string;
    serialNumber?: string;
    category?: string;
    status?: string;
    zoneId?: string;
    receivedBy?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await this.query(
      `INSERT INTO items (
        id, item_number, rfid_tag_epc, reference_id, serial_number,
        description, category, status, is_active, current_zone_id,
        received_by, received_at, created_at, updated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, NOW(), NOW(), $12)`,
      [
        id,
        params.itemNumber,
        params.rfidEpc,
        params.referenceId ?? 'N/A',
        params.serialNumber ?? null,
        params.description,
        params.category ?? 'other',
        params.status ?? 'registered',
        params.zoneId ?? null,
        params.receivedBy ?? null,
        params.receivedBy ? new Date() : null,
        JSON.stringify(params.metadata ?? {}),
      ]
    );
    return id;
  }

  /**
   * Close pool (call after all tests)
   */
  async closePool(): Promise<void> {
    await this.pool.end();
  }
}
