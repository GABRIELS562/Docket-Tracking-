import { injectable, inject } from 'tsyringe';

import { TenantContext } from '../../application/context/TenantContext';

import type { ILogger } from '../../application/interfaces/ILogger';
import type { Redis } from 'ioredis';

/**
 * Cache options
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds
   */
  ttl?: number;

  /**
   * Whether to use tenant scoping (default: true)
   */
  tenantScoped?: boolean;
}

/**
 * Tenant-Scoped Cache Service
 *
 * Provides Redis caching with automatic tenant namespace isolation.
 * All keys are prefixed with tenant ID to ensure data isolation.
 *
 * Key format: tenant:{tenantId}:{category}:{key}
 */
@injectable()
export class TenantScopedCache {
  private readonly DEFAULT_TTL = 300; // 5 minutes

  constructor(
    @inject('RedisClient') private readonly redis: Redis,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  /**
   * Gets a value from cache
   */
  async get<T>(category: string, key: string, options: CacheOptions = {}): Promise<T | null> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      const value = await this.redis.get(fullKey);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn('Cache get error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Sets a value in cache
   */
  async set<T>(category: string, key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);
    const ttl = options.ttl ?? this.DEFAULT_TTL;

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(fullKey, ttl, serialized);
    } catch (error) {
      this.logger.warn('Cache set error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Gets a value or computes it if not cached
   */
  async getOrSet<T>(
    category: string,
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(category, key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(category, key, value, options);
    return value;
  }

  /**
   * Deletes a value from cache
   */
  async delete(category: string, key: string, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.warn('Cache delete error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Deletes all keys matching a pattern within tenant scope
   */
  async deletePattern(category: string, pattern: string): Promise<number> {
    const tenantId = TenantContext.getTenantId();
    const fullPattern = tenantId
      ? `tenant:${tenantId}:${category}:${pattern}`
      : `${category}:${pattern}`;

    try {
      const keys = await this.redis.keys(fullPattern);
      if (keys.length === 0) {
        return 0;
      }
      return await this.redis.del(...keys);
    } catch (error) {
      this.logger.warn('Cache deletePattern error', {
        pattern: fullPattern,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Invalidates all cache for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<number> {
    const pattern = `tenant:${tenantId}:*`;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      this.logger.info('Invalidated tenant cache', {
        tenantId,
        keysDeleted: deleted,
      });
      return deleted;
    } catch (error) {
      this.logger.error('Failed to invalidate tenant cache', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Checks if a key exists in cache
   */
  async exists(category: string, key: string, options: CacheOptions = {}): Promise<boolean> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      return (await this.redis.exists(fullKey)) === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets TTL for a key
   */
  async getTtl(category: string, key: string, options: CacheOptions = {}): Promise<number> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      return await this.redis.ttl(fullKey);
    } catch (error) {
      return -2; // Key does not exist
    }
  }

  /**
   * Increments a counter
   */
  async increment(
    category: string,
    key: string,
    amount: number = 1,
    options: CacheOptions = {}
  ): Promise<number> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      const result = await this.redis.incrby(fullKey, amount);

      // Set TTL if specified and key is new
      if (options.ttl && result === amount) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return result;
    } catch (error) {
      this.logger.warn('Cache increment error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Adds to a set
   */
  async addToSet(
    category: string,
    key: string,
    members: string[],
    options: CacheOptions = {}
  ): Promise<number> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      const added = await this.redis.sadd(fullKey, ...members);

      if (options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }

      return added;
    } catch (error) {
      this.logger.warn('Cache addToSet error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Gets all members of a set
   */
  async getSetMembers(
    category: string,
    key: string,
    options: CacheOptions = {}
  ): Promise<string[]> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      return await this.redis.smembers(fullKey);
    } catch (error) {
      return [];
    }
  }

  /**
   * Sets a hash field
   */
  async setHashField(
    category: string,
    key: string,
    field: string,
    value: unknown,
    options: CacheOptions = {}
  ): Promise<void> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      await this.redis.hset(fullKey, field, JSON.stringify(value));

      if (options.ttl) {
        await this.redis.expire(fullKey, options.ttl);
      }
    } catch (error) {
      this.logger.warn('Cache setHashField error', {
        key: fullKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Gets a hash field
   */
  async getHashField<T>(
    category: string,
    key: string,
    field: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      const value = await this.redis.hget(fullKey, field);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Gets all hash fields
   */
  async getHash<T extends Record<string, unknown>>(
    category: string,
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const fullKey = this.buildKey(category, key, options.tenantScoped ?? true);

    try {
      const hash = await this.redis.hgetall(fullKey);
      if (Object.keys(hash).length === 0) {
        return null;
      }

      const result: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Builds the full cache key with tenant prefix
   */
  private buildKey(category: string, key: string, tenantScoped: boolean): string {
    if (!tenantScoped) {
      return `${category}:${key}`;
    }

    const tenantId = TenantContext.getTenantId();
    if (!tenantId) {
      // Fall back to non-tenant-scoped key if no tenant context
      return `${category}:${key}`;
    }

    return `tenant:${tenantId}:${category}:${key}`;
  }
}

/**
 * Cache categories for type safety
 */
export const CacheCategories = {
  ITEM: 'item',
  ITEM_LOCATION: 'item:location',
  ZONE: 'zone',
  ZONE_STATS: 'zone:stats',
  ZONE_OCCUPANCY: 'zone:occupancy',
  READER: 'reader',
  READER_HEALTH: 'reader:health',
  SEARCH: 'search',
  USER_SESSION: 'user:session',
  TENANT_CONFIG: 'tenant:config',
  RATE_LIMIT: 'rate:limit',
} as const;
