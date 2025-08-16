"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const pg_1 = require("pg");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
class DatabaseService {
    constructor() {
        this.pool = new pg_1.Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'docket_tracking_phase2',
            user: process.env.DB_USER || 'docket_user',
            password: process.env.DB_PASSWORD || 'secure_password',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.pool.on('error', (err) => {
            logger_1.logger.error('Unexpected database error:', err);
        });
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    async initialize() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger_1.logger.info('Database connection established');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }
    async runMigrations() {
        const migrationsPath = path_1.default.join(__dirname, '../../migrations');
        try {
            const files = await promises_1.default.readdir(migrationsPath);
            const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
            for (const file of sqlFiles) {
                const filePath = path_1.default.join(migrationsPath, file);
                const sql = await promises_1.default.readFile(filePath, 'utf-8');
                await this.execute(sql);
                logger_1.logger.info(`Migration executed: ${file}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Migration failed:', error);
            throw error;
        }
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger_1.logger.debug(`Query executed in ${duration}ms`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Query error:', { text, error });
            throw error;
        }
    }
    async execute(text, params) {
        const client = await this.pool.connect();
        try {
            return await client.query(text, params);
        }
        finally {
            client.release();
        }
    }
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getClient() {
        return await this.pool.connect();
    }
    async end() {
        await this.pool.end();
    }
    async checkHealth() {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return false;
        }
    }
    async close() {
        await this.pool.end();
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=DatabaseService.js.map