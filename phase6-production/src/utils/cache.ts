import Redis from 'ioredis';
import { performance } from 'perf_hooks';

interface CacheConfig {
  host: string;
  port: number;
  db: number;
  ttl: number;
  password?: string;
}

class CacheManager {
  private redis: Redis;
  private replicaRedis?: Redis;
  private defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };

  constructor(config: CacheConfig, replicaConfig?: CacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      db: config.db,
      password: config.password,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 5000,
      commandTimeout: 5000
    });

    if (replicaConfig) {
      this.replicaRedis = new Redis({
        host: replicaConfig.host,
        port: replicaConfig.port,
        db: replicaConfig.db,
        password: replicaConfig.password,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
    }

    this.defaultTTL = config.ttl;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
    });

    this.redis.on('connect', () => {
      console.log('✅ Redis cache connected');
    });

    this.redis.on('ready', () => {
      console.log('✅ Redis cache ready');
    });

    if (this.replicaRedis) {
      this.replicaRedis.on('error', (error) => {
        console.error('Redis replica error:', error);
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const start = performance.now();
    
    try {
      // Try replica first for read operations
      const client = this.replicaRedis || this.redis;
      const value = await client.get(key);
      
      const duration = performance.now() - start;
      
      if (value) {
        this.stats.hits++;
        console.log(`Cache HIT: ${key} (${duration.toFixed(2)}ms)`);
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        console.log(`Cache MISS: ${key} (${duration.toFixed(2)}ms)`);
        return null;
      }
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const start = performance.now();
    
    try {
      const serialized = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      
      await this.redis.setex(key, expiration, serialized);
      
      const duration = performance.now() - start;
      this.stats.sets++;
      
      console.log(`Cache SET: ${key} (${duration.toFixed(2)}ms, TTL: ${expiration}s)`);
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      const result = await this.redis.del(...(Array.isArray(key) ? key : [key]));
      this.stats.deletes += result;
      console.log(`Cache DEL: ${Array.isArray(key) ? key.join(', ') : key} (${result} keys deleted)`);
      return result;
    } catch (error) {
      console.error(`Cache delete error:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await (this.replicaRedis || this.redis).exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async flushPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      console.log(`Cache FLUSH PATTERN: ${pattern} (${result} keys deleted)`);
      return result;
    } catch (error) {
      console.error(`Cache flush pattern error:`, error);
      return 0;
    }
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  async setHash(key: string, field: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.hset(key, field, serialized);
      
      if (ttl) {
        await this.redis.expire(key, ttl);
      }
      
      return true;
    } catch (error) {
      console.error(`Cache hash set error:`, error);
      return false;
    }
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const client = this.replicaRedis || this.redis;
      const value = await client.hget(key, field);
      
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      console.error(`Cache hash get error:`, error);
      this.stats.misses++;
      return null;
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      total
    };
  }

  async disconnect(): Promise<void> {
    await this.redis.disconnect();
    if (this.replicaRedis) {
      await this.replicaRedis.disconnect();
    }
  }
}

// Cache Keys Factory
export class CacheKeys {
  static object(id: number): string {
    return `object:${id}`;
  }

  static objects(filters: string): string {
    return `objects:${filters}`;
  }

  static user(id: number): string {
    return `user:${id}`;
  }

  static userSession(sessionId: string): string {
    return `session:${sessionId}`;
  }

  static search(query: string, filters: string): string {
    return `search:${Buffer.from(query + filters).toString('base64')}`;
  }

  static locations(): string {
    return 'locations:all';
  }

  static personnel(): string {
    return 'personnel:all';
  }

  static stats(type: string): string {
    return `stats:${type}`;
  }

  static audit(objectId: number): string {
    return `audit:${objectId}`;
  }
}

// Initialize cache instances
const cacheConfig: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_CACHE_DB || '2'),
  ttl: parseInt(process.env.CACHE_TTL || '300'),
  password: process.env.REDIS_PASSWORD
};

const replicaConfig: CacheConfig | undefined = process.env.REDIS_REPLICA_HOST ? {
  host: process.env.REDIS_REPLICA_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_CACHE_DB || '2'),
  ttl: parseInt(process.env.CACHE_TTL || '300'),
  password: process.env.REDIS_PASSWORD
} : undefined;

export const cache = new CacheManager(cacheConfig, replicaConfig);

// Cache Middleware
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query parameters
    const cacheKey = `api:${req.originalUrl}`;
    
    try {
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        res.set('X-Cache', 'HIT');
        return res.json(cachedData);
      }

      // Store original res.json
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = function(data: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300 && data.success) {
          cache.set(cacheKey, data, ttl).catch(console.error);
        }
        
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

export default cache;