import Redis from 'ioredis';
import { injectable, inject } from 'tsyringe';

import type { ILogger } from '../../application/interfaces/ILogger';

/**
 * Redis Configuration
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  lazyConnect?: boolean;
}

/**
 * Redis Client Factory
 *
 * Creates and manages Redis connections for:
 * - Caching (TenantScopedCache)
 * - WebSocket pub/sub (clustering)
 * - Rate limiting
 * - Session storage
 *
 * Phase 4.1: Redis infrastructure for WebSocket clustering
 */
@injectable()
export class RedisClientFactory {
  private mainClient: Redis | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private isConnected = false;

  constructor(
    @inject('ILogger') private readonly logger: ILogger,
    @inject('RedisConfig') private readonly config: RedisConfig
  ) {}

  /**
   * Get the main Redis client for general operations
   */
  getClient(): Redis {
    if (!this.mainClient) {
      this.mainClient = this.createClient('main');
    }
    return this.mainClient;
  }

  /**
   * Get the publisher client for pub/sub
   */
  getPublisher(): Redis {
    if (!this.pubClient) {
      this.pubClient = this.createClient('publisher');
    }
    return this.pubClient;
  }

  /**
   * Get the subscriber client for pub/sub
   */
  getSubscriber(): Redis {
    if (!this.subClient) {
      this.subClient = this.createClient('subscriber');
    }
    return this.subClient;
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.mainClient?.status === 'ready';
  }

  /**
   * Connect all clients
   */
  async connect(): Promise<void> {
    try {
      const client = this.getClient();
      await client.ping();
      this.isConnected = true;
      this.logger.info('Redis connected successfully', {
        host: this.config.host,
        port: this.config.port,
      });
    } catch (error) {
      this.isConnected = false;
      this.logger.error('Redis connection failed', {
        host: this.config.host,
        port: this.config.port,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Disconnect all clients
   */
  async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    if (this.mainClient) {
      disconnectPromises.push(
        this.mainClient.quit().then(() => {
          this.mainClient = null;
        })
      );
    }

    if (this.pubClient) {
      disconnectPromises.push(
        this.pubClient.quit().then(() => {
          this.pubClient = null;
        })
      );
    }

    if (this.subClient) {
      disconnectPromises.push(
        this.subClient.quit().then(() => {
          this.subClient = null;
        })
      );
    }

    await Promise.all(disconnectPromises);
    this.isConnected = false;
    this.logger.info('Redis disconnected');
  }

  /**
   * Get Redis health status
   */
  async getHealth(): Promise<{
    connected: boolean;
    latencyMs: number;
    memory: { used: string; peak: string } | null;
    clients: number;
  }> {
    if (!this.mainClient) {
      return {
        connected: false,
        latencyMs: -1,
        memory: null,
        clients: 0,
      };
    }

    try {
      const start = Date.now();
      await this.mainClient.ping();
      const latencyMs = Date.now() - start;

      const info = await this.mainClient.info('memory');
      const clientsInfo = await this.mainClient.info('clients');

      const usedMemoryMatch = info.match(/used_memory_human:(\S+)/);
      const peakMemoryMatch = info.match(/used_memory_peak_human:(\S+)/);
      const connectedClientsMatch = clientsInfo.match(/connected_clients:(\d+)/);

      return {
        connected: true,
        latencyMs,
        memory: {
          used: usedMemoryMatch?.[1] || 'unknown',
          peak: peakMemoryMatch?.[1] || 'unknown',
        },
        clients: parseInt(connectedClientsMatch?.[1] || '0', 10),
      };
    } catch (error) {
      return {
        connected: false,
        latencyMs: -1,
        memory: null,
        clients: 0,
      };
    }
  }

  /**
   * Create a new Redis client with the given role
   */
  private createClient(role: string): Redis {
    const client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db || 0,
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
      enableReadyCheck: this.config.enableReadyCheck ?? true,
      lazyConnect: this.config.lazyConnect ?? false,
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error(`Redis ${role} max retries exceeded`);
          return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 3000);
        this.logger.warn(`Redis ${role} retry attempt ${times}, delay ${delay}ms`);
        return delay;
      },
    });

    client.on('connect', () => {
      this.logger.debug(`Redis ${role} client connecting`);
    });

    client.on('ready', () => {
      this.logger.info(`Redis ${role} client ready`);
    });

    client.on('error', (error) => {
      this.logger.error(`Redis ${role} client error`, {
        error: error.message,
      });
    });

    client.on('close', () => {
      this.logger.debug(`Redis ${role} client closed`);
    });

    client.on('reconnecting', () => {
      this.logger.debug(`Redis ${role} client reconnecting`);
    });

    return client;
  }
}

/**
 * Get default Redis configuration from environment
 */
export function getRedisConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'rfid:',
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  };
}
