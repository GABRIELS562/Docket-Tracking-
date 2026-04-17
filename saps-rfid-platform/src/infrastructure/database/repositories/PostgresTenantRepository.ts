import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import {
  Tenant,
  TenantProps,
  SubscriptionTier,
  SubscriptionStatus,
  TenantFeatures,
  TenantSettings,
} from '../../../domain/entities/Tenant';
import { BaseRepository } from '../BaseRepository';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type {
  ITenantRepository,
  TenantSearchCriteria,
  TenantUsageStats,
} from '../../../domain/repositories/ITenantRepository';
import type { PostgresConnection } from '../PostgresConnection';

/**
 * Database row type for tenants table
 */
interface TenantRow {
  id: string;
  name: string;
  slug: string;
  contact_email: string;
  contact_phone: string | null;
  subscription_tier: string;
  subscription_status: string;
  max_items: number;
  max_users: number;
  max_zones: number;
  max_readers: number;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  features: TenantFeatures;
  settings: TenantSettings;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  trial_ends_at: Date | null;
  suspended_at: Date | null;
}

/**
 * PostgreSQL implementation of ITenantRepository
 */
@injectable()
export class PostgresTenantRepository extends BaseRepository implements ITenantRepository {
  constructor(
    @inject('PostgresConnection') connection: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(connection, logger);
  }

  async save(tenant: Tenant): Promise<Result<void, Error>> {
    const props = tenant.toProps();

    const sql = `
      INSERT INTO tenants (
        id, name, slug, contact_email, contact_phone,
        subscription_tier, subscription_status,
        max_items, max_users, max_zones, max_readers,
        logo_url, primary_color, secondary_color,
        features, settings, metadata,
        is_active, created_at, updated_at, trial_ends_at, suspended_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20, $21, $22
      )
    `;

    const params = [
      props.id,
      props.name,
      props.slug,
      props.contactEmail,
      props.contactPhone,
      props.subscriptionTier,
      props.subscriptionStatus,
      props.limits.maxItems,
      props.limits.maxUsers,
      props.limits.maxZones,
      props.limits.maxReaders,
      props.branding.logoUrl,
      props.branding.primaryColor,
      props.branding.secondaryColor,
      JSON.stringify(props.features),
      JSON.stringify(props.settings),
      JSON.stringify(props.metadata),
      props.isActive,
      props.createdAt,
      props.updatedAt,
      props.trialEndsAt,
      props.suspendedAt,
    ];

    const result = await this.executeQuery<TenantRow>(sql, params);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined as unknown as void);
  }

  async findById(id: string): Promise<Result<Tenant | null, Error>> {
    const sql = 'SELECT * FROM tenants WHERE id = $1';
    const result = await this.executeQuery<TenantRow>(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    const row = result.value[0];
    if (!row) {
      return ok(null);
    }

    return ok(this.mapRowToTenant(row));
  }

  async findBySlug(slug: string): Promise<Result<Tenant | null, Error>> {
    const sql = 'SELECT * FROM tenants WHERE slug = $1';
    const result = await this.executeQuery<TenantRow>(sql, [slug]);

    if (result.isErr()) {
      return err(result.error);
    }

    const row = result.value[0];
    if (!row) {
      return ok(null);
    }

    return ok(this.mapRowToTenant(row));
  }

  async findAll(): Promise<Result<Tenant[], Error>> {
    const sql = 'SELECT * FROM tenants ORDER BY created_at DESC';
    const result = await this.executeQuery<TenantRow>(sql, []);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map((row) => this.mapRowToTenant(row)));
  }

  async search(
    criteria: TenantSearchCriteria
  ): Promise<Result<{ tenants: Tenant[]; total: number }, Error>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (criteria.query) {
      conditions.push(`(name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`);
      params.push(`%${criteria.query}%`);
      paramIndex++;
    }

    if (criteria.subscriptionTier != null) {
      conditions.push(`subscription_tier = $${paramIndex}`);
      params.push(criteria.subscriptionTier);
      paramIndex++;
    }

    if (criteria.subscriptionStatus != null) {
      conditions.push(`subscription_status = $${paramIndex}`);
      params.push(criteria.subscriptionStatus);
      paramIndex++;
    }

    if (criteria.activeOnly) {
      conditions.push('is_active = true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM tenants ${whereClause}`;
    const countResult = await this.executeQuery<{ count: string }>(countSql, params);
    if (countResult.isErr()) {
      return err(countResult.error);
    }
    const total = parseInt(countResult.value[0]?.count ?? '0', 10);

    // Get paginated results
    const sortBy = criteria.sortBy ?? 'createdAt';
    const sortOrder = criteria.sortOrder ?? 'desc';
    const limit = criteria.limit ?? 50;
    const offset = criteria.offset ?? 0;

    const sortColumn = this.getSortColumn(sortBy);
    const dataSql = `
      SELECT * FROM tenants
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await this.executeQuery<TenantRow>(dataSql, [...params, limit, offset]);
    if (dataResult.isErr()) {
      return err(dataResult.error);
    }

    return ok({
      tenants: dataResult.value.map((row) => this.mapRowToTenant(row)),
      total,
    });
  }

  async findExpiringTrials(daysUntilExpiry: number): Promise<Result<Tenant[], Error>> {
    const sql = `
      SELECT * FROM tenants
      WHERE subscription_status = 'trial'
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= NOW() + INTERVAL '${daysUntilExpiry} days'
        AND trial_ends_at > NOW()
      ORDER BY trial_ends_at ASC
    `;

    const result = await this.executeQuery<TenantRow>(sql, []);
    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map((row) => this.mapRowToTenant(row)));
  }

  async update(tenant: Tenant): Promise<Result<void, Error>> {
    const props = tenant.toProps();

    const sql = `
      UPDATE tenants SET
        name = $2,
        contact_email = $3,
        contact_phone = $4,
        subscription_tier = $5,
        subscription_status = $6,
        max_items = $7,
        max_users = $8,
        max_zones = $9,
        max_readers = $10,
        logo_url = $11,
        primary_color = $12,
        secondary_color = $13,
        features = $14,
        settings = $15,
        metadata = $16,
        is_active = $17,
        updated_at = $18,
        trial_ends_at = $19,
        suspended_at = $20
      WHERE id = $1
    `;

    const params = [
      props.id,
      props.name,
      props.contactEmail,
      props.contactPhone,
      props.subscriptionTier,
      props.subscriptionStatus,
      props.limits.maxItems,
      props.limits.maxUsers,
      props.limits.maxZones,
      props.limits.maxReaders,
      props.branding.logoUrl,
      props.branding.primaryColor,
      props.branding.secondaryColor,
      JSON.stringify(props.features),
      JSON.stringify(props.settings),
      JSON.stringify(props.metadata),
      props.isActive,
      props.updatedAt,
      props.trialEndsAt,
      props.suspendedAt,
    ];

    const result = await this.executeQuery<TenantRow>(sql, params);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined as unknown as void);
  }

  async delete(id: string): Promise<Result<void, Error>> {
    const sql = 'DELETE FROM tenants WHERE id = $1';
    const result = await this.executeQuery<TenantRow>(sql, [id]);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined as unknown as void);
  }

  async existsBySlug(slug: string): Promise<Result<boolean, Error>> {
    const sql = 'SELECT EXISTS(SELECT 1 FROM tenants WHERE slug = $1) as exists';
    const result = await this.executeQuery<{ exists: boolean }>(sql, [slug]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value[0]?.exists ?? false);
  }

  async getUsageStats(tenantId: string): Promise<Result<TenantUsageStats, Error>> {
    const sql = `
      SELECT
        $1::uuid as tenant_id,
        COALESCE((SELECT COUNT(*) FROM items WHERE tenant_id = $1), 0) as item_count,
        COALESCE((SELECT COUNT(*) FROM tenant_users WHERE tenant_id = $1), 0) as user_count,
        COALESCE((SELECT COUNT(*) FROM zones WHERE tenant_id = $1), 0) as zone_count,
        COALESCE((SELECT COUNT(*) FROM readers WHERE tenant_id = $1), 0) as reader_count,
        0 as api_requests_today,
        0 as api_requests_this_month,
        0 as storage_used_bytes
    `;

    const result = await this.executeQuery<{
      tenant_id: string;
      item_count: string;
      user_count: string;
      zone_count: string;
      reader_count: string;
      api_requests_today: string;
      api_requests_this_month: string;
      storage_used_bytes: string;
    }>(sql, [tenantId]);

    if (result.isErr()) {
      return err(result.error);
    }

    const row = result.value[0];
    if (!row) {
      return err(new Error('Tenant not found'));
    }

    return ok({
      tenantId: row.tenant_id,
      itemCount: parseInt(row.item_count, 10),
      userCount: parseInt(row.user_count, 10),
      zoneCount: parseInt(row.zone_count, 10),
      readerCount: parseInt(row.reader_count, 10),
      apiRequestsToday: parseInt(row.api_requests_today, 10),
      apiRequestsThisMonth: parseInt(row.api_requests_this_month, 10),
      storageUsedBytes: parseInt(row.storage_used_bytes, 10),
    });
  }

  async countBySubscriptionTier(): Promise<Result<Map<SubscriptionTier, number>, Error>> {
    const sql = `
      SELECT subscription_tier, COUNT(*) as count
      FROM tenants
      GROUP BY subscription_tier
    `;

    const result = await this.executeQuery<{ subscription_tier: string; count: string }>(sql, []);
    if (result.isErr()) {
      return err(result.error);
    }

    const counts = new Map<SubscriptionTier, number>();
    for (const row of result.value) {
      counts.set(row.subscription_tier as SubscriptionTier, parseInt(row.count, 10));
    }

    return ok(counts);
  }

  private mapRowToTenant(row: TenantRow): Tenant {
    const props: TenantProps = {
      id: row.id,
      name: row.name,
      slug: row.slug,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      subscriptionTier: row.subscription_tier as SubscriptionTier,
      subscriptionStatus: row.subscription_status as SubscriptionStatus,
      limits: {
        maxItems: row.max_items,
        maxUsers: row.max_users,
        maxZones: row.max_zones,
        maxReaders: row.max_readers,
      },
      branding: {
        logoUrl: row.logo_url,
        primaryColor: row.primary_color,
        secondaryColor: row.secondary_color,
      },
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
      suspendedAt: row.suspended_at ? new Date(row.suspended_at) : null,
    };

    return Tenant.reconstitute(props);
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      subscriptionTier: 'subscription_tier',
    };
    return columnMap[sortBy] ?? 'created_at';
  }
}
