"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const redis_1 = require("redis");
const server_1 = require("../server");
class CacheService {
    constructor() {
        this.connected = false;
        this.client = (0, redis_1.createClient)({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379')
            }
        });
        this.client.on('error', (err) => {
            server_1.logger.error('Redis Client Error:', err);
        });
        this.client.on('connect', () => {
            this.connected = true;
            server_1.logger.info('Redis connected');
        });
        this.client.on('disconnect', () => {
            this.connected = false;
            server_1.logger.warn('Redis disconnected');
        });
    }
    static getInstance() {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }
    async connect() {
        if (!this.connected) {
            await this.client.connect();
        }
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            server_1.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            const defaultTTL = parseInt(process.env.REDIS_TTL || '3600');
            await this.client.setEx(key, ttl || defaultTTL, value);
        }
        catch (error) {
            server_1.logger.error(`Cache set error for key ${key}:`, error);
        }
    }
    async del(key) {
        try {
            await this.client.del(key);
        }
        catch (error) {
            server_1.logger.error(`Cache delete error for key ${key}:`, error);
        }
    }
    async flush() {
        try {
            await this.client.flushAll();
            server_1.logger.info('Cache flushed');
        }
        catch (error) {
            server_1.logger.error('Cache flush error:', error);
        }
    }
    async invalidatePattern(pattern) {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                server_1.logger.debug(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
            }
        }
        catch (error) {
            server_1.logger.error(`Cache invalidation error for pattern ${pattern}:`, error);
        }
    }
    async disconnect() {
        if (this.connected) {
            await this.client.disconnect();
        }
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=CacheService.js.map