import { Result, ok, err } from 'neverthrow';
import { injectable, inject } from 'tsyringe';

import {
  TenantUser,
  TenantUserProps,
  UserRole,
  UserPreferences,
} from '../../../domain/entities/TenantUser';
import { BaseRepository } from '../BaseRepository';

import type { ILogger } from '../../../application/interfaces/ILogger';
import type {
  ITenantUserRepository,
  TenantUserSearchCriteria,
} from '../../../domain/repositories/ITenantUserRepository';
import type { PostgresConnection } from '../PostgresConnection';

/**
 * Database row type for tenant_users table
 */
interface TenantUserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  permissions: string[];
  last_login_at: Date | null;
  last_login_ip: string | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  password_changed_at: Date | null;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  is_active: boolean;
  email_verified: boolean;
  email_verified_at: Date | null;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

/**
 * PostgreSQL implementation of ITenantUserRepository
 */
@injectable()
export class PostgresTenantUserRepository extends BaseRepository implements ITenantUserRepository {
  constructor(
    @inject('PostgresConnection') connection: PostgresConnection,
    @inject('ILogger') logger: ILogger
  ) {
    super(connection, logger);
  }

  async save(user: TenantUser): Promise<Result<void, Error>> {
    const props = user.toProps();

    const sql = `
      INSERT INTO tenant_users (
        id, tenant_id, email, password_hash,
        first_name, last_name, display_name, avatar_url, phone,
        role, permissions,
        last_login_at, last_login_ip, failed_login_attempts, locked_until,
        password_changed_at, mfa_enabled, mfa_secret,
        is_active, email_verified, email_verified_at,
        preferences, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24
      )
    `;

    const params = [
      props.id,
      props.tenantId,
      props.email,
      props.passwordHash,
      props.firstName,
      props.lastName,
      props.displayName,
      props.avatarUrl,
      props.phone,
      props.role,
      JSON.stringify(props.permissions),
      props.lastLoginAt,
      props.lastLoginIp,
      props.failedLoginAttempts,
      props.lockedUntil,
      props.passwordChangedAt,
      props.mfaEnabled,
      props.mfaSecret,
      props.isActive,
      props.emailVerified,
      props.emailVerifiedAt,
      JSON.stringify(props.preferences),
      props.createdAt,
      props.updatedAt,
    ];

    const result = await this.executeQuery<TenantUserRow>(sql, params);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined as unknown as void);
  }

  async findById(id: string): Promise<Result<TenantUser | null, Error>> {
    const sql = 'SELECT * FROM tenant_users WHERE id = $1';
    const result = await this.executeQuery<TenantUserRow>(sql, [id]);

    if (result.isErr()) {
      return err(result.error);
    }

    const row = result.value[0];
    if (!row) {
      return ok(null);
    }

    return ok(this.mapRowToUser(row));
  }

  async findByEmail(email: string): Promise<Result<TenantUser | null, Error>> {
    const sql = 'SELECT * FROM tenant_users WHERE email = $1 LIMIT 1';
    const result = await this.executeQuery<TenantUserRow>(sql, [email.toLowerCase()]);

    if (result.isErr()) {
      return err(result.error);
    }

    const row = result.value[0];
    if (!row) {
      return ok(null);
    }

    return ok(this.mapRowToUser(row));
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string
  ): Promise<Result<TenantUser | null, Error>> {
    const sql = 'SELECT * FROM tenant_users WHERE email = $1 AND tenant_id = $2';
    const result = await this.executeQuery<TenantUserRow>(sql, [email.toLowerCase(), tenantId]);

    if (result.isErr()) {
      return err(result.error);
    }

    const row = result.value[0];
    if (!row) {
      return ok(null);
    }

    return ok(this.mapRowToUser(row));
  }

  async findByTenant(tenantId: string): Promise<Result<TenantUser[], Error>> {
    const sql = 'SELECT * FROM tenant_users WHERE tenant_id = $1 ORDER BY created_at DESC';
    const result = await this.executeQuery<TenantUserRow>(sql, [tenantId]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map((row) => this.mapRowToUser(row)));
  }

  async search(
    criteria: TenantUserSearchCriteria
  ): Promise<Result<{ users: TenantUser[]; total: number }, Error>> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [criteria.tenantId];
    let paramIndex = 2;

    if (criteria.query) {
      conditions.push(`(
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        email ILIKE $${paramIndex}
      )`);
      params.push(`%${criteria.query}%`);
      paramIndex++;
    }

    if (criteria.role != null) {
      conditions.push(`role = $${paramIndex}`);
      params.push(criteria.role);
      paramIndex++;
    }

    if (criteria.activeOnly) {
      conditions.push('is_active = true');
    }

    if (criteria.verifiedOnly) {
      conditions.push('email_verified = true');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM tenant_users ${whereClause}`;
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
      SELECT * FROM tenant_users
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await this.executeQuery<TenantUserRow>(dataSql, [...params, limit, offset]);
    if (dataResult.isErr()) {
      return err(dataResult.error);
    }

    return ok({
      users: dataResult.value.map((row) => this.mapRowToUser(row)),
      total,
    });
  }

  async findByRole(tenantId: string, role: UserRole): Promise<Result<TenantUser[], Error>> {
    const sql =
      'SELECT * FROM tenant_users WHERE tenant_id = $1 AND role = $2 ORDER BY created_at DESC';
    const result = await this.executeQuery<TenantUserRow>(sql, [tenantId, role]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map((row) => this.mapRowToUser(row)));
  }

  async findOwner(tenantId: string): Promise<Result<TenantUser | null, Error>> {
    const sql = "SELECT * FROM tenant_users WHERE tenant_id = $1 AND role = 'owner' LIMIT 1";
    const result = await this.executeQuery<TenantUserRow>(sql, [tenantId]);

    if (result.isErr()) {
      return err(result.error);
    }

    const row = result.value[0];
    if (!row) {
      return ok(null);
    }

    return ok(this.mapRowToUser(row));
  }

  async update(user: TenantUser): Promise<Result<void, Error>> {
    const props = user.toProps();

    const sql = `
      UPDATE tenant_users SET
        email = $2,
        password_hash = $3,
        first_name = $4,
        last_name = $5,
        display_name = $6,
        avatar_url = $7,
        phone = $8,
        role = $9,
        permissions = $10,
        last_login_at = $11,
        last_login_ip = $12,
        failed_login_attempts = $13,
        locked_until = $14,
        password_changed_at = $15,
        mfa_enabled = $16,
        mfa_secret = $17,
        is_active = $18,
        email_verified = $19,
        email_verified_at = $20,
        preferences = $21,
        updated_at = $22
      WHERE id = $1
    `;

    const params = [
      props.id,
      props.email,
      props.passwordHash,
      props.firstName,
      props.lastName,
      props.displayName,
      props.avatarUrl,
      props.phone,
      props.role,
      JSON.stringify(props.permissions),
      props.lastLoginAt,
      props.lastLoginIp,
      props.failedLoginAttempts,
      props.lockedUntil,
      props.passwordChangedAt,
      props.mfaEnabled,
      props.mfaSecret,
      props.isActive,
      props.emailVerified,
      props.emailVerifiedAt,
      JSON.stringify(props.preferences),
      props.updatedAt,
    ];

    const result = await this.executeQuery<TenantUserRow>(sql, params);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined as unknown as void);
  }

  async delete(id: string): Promise<Result<void, Error>> {
    const sql = 'DELETE FROM tenant_users WHERE id = $1';
    const result = await this.executeQuery<TenantUserRow>(sql, [id]);
    if (result.isErr()) {
      return err(result.error);
    }
    return ok(undefined as unknown as void);
  }

  async existsByEmailAndTenant(email: string, tenantId: string): Promise<Result<boolean, Error>> {
    const sql =
      'SELECT EXISTS(SELECT 1 FROM tenant_users WHERE email = $1 AND tenant_id = $2) as exists';
    const result = await this.executeQuery<{ exists: boolean }>(sql, [
      email.toLowerCase(),
      tenantId,
    ]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value[0]?.exists ?? false);
  }

  async countByTenant(tenantId: string): Promise<Result<number, Error>> {
    const sql = 'SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = $1';
    const result = await this.executeQuery<{ count: string }>(sql, [tenantId]);

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(parseInt(result.value[0]?.count ?? '0', 10));
  }

  async countByRole(tenantId: string): Promise<Result<Map<UserRole, number>, Error>> {
    const sql = `
      SELECT role, COUNT(*) as count
      FROM tenant_users
      WHERE tenant_id = $1
      GROUP BY role
    `;

    const result = await this.executeQuery<{ role: string; count: string }>(sql, [tenantId]);
    if (result.isErr()) {
      return err(result.error);
    }

    const counts = new Map<UserRole, number>();
    for (const row of result.value) {
      counts.set(row.role as UserRole, parseInt(row.count, 10));
    }

    return ok(counts);
  }

  async findInactiveUsers(
    tenantId: string,
    daysSinceLastLogin: number
  ): Promise<Result<TenantUser[], Error>> {
    const sql = `
      SELECT * FROM tenant_users
      WHERE tenant_id = $1
        AND is_active = true
        AND (
          last_login_at IS NULL
          OR last_login_at < NOW() - INTERVAL '${daysSinceLastLogin} days'
        )
      ORDER BY last_login_at ASC NULLS FIRST
    `;

    const result = await this.executeQuery<TenantUserRow>(sql, [tenantId]);
    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map((row) => this.mapRowToUser(row)));
  }

  async findLockedUsers(tenantId: string): Promise<Result<TenantUser[], Error>> {
    const sql = `
      SELECT * FROM tenant_users
      WHERE tenant_id = $1
        AND locked_until IS NOT NULL
        AND locked_until > NOW()
      ORDER BY locked_until DESC
    `;

    const result = await this.executeQuery<TenantUserRow>(sql, [tenantId]);
    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map((row) => this.mapRowToUser(row)));
  }

  private mapRowToUser(row: TenantUserRow): TenantUser {
    const props: TenantUserProps = {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      phone: row.phone,
      role: row.role as UserRole,
      permissions:
        typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      lastLoginIp: row.last_login_ip,
      failedLoginAttempts: row.failed_login_attempts,
      lockedUntil: row.locked_until ? new Date(row.locked_until) : null,
      passwordChangedAt: row.password_changed_at ? new Date(row.password_changed_at) : null,
      mfaEnabled: row.mfa_enabled,
      mfaSecret: row.mfa_secret,
      isActive: row.is_active,
      emailVerified: row.email_verified,
      emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
      preferences:
        typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return TenantUser.reconstitute(props);
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      email: 'email',
      firstName: 'first_name',
      lastName: 'last_name',
      createdAt: 'created_at',
      lastLoginAt: 'last_login_at',
    };
    return columnMap[sortBy] ?? 'created_at';
  }
}
