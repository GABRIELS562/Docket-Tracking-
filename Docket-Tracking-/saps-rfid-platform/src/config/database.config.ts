import { getEnv } from './validation';

/**
 * Database configuration
 *
 * PostgreSQL/TimescaleDB connection settings
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

/**
 * Get database configuration from environment
 *
 * @returns Database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  const env = getEnv();

  return {
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT, 10),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL === 'true',
    pool: {
      min: parseInt(env.DB_POOL_MIN, 10),
      max: parseInt(env.DB_POOL_MAX, 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    },
  };
}
