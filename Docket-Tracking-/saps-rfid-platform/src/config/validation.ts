import { z } from 'zod';

/**
 * Environment variable schema
 *
 * Validates all required environment variables at startup
 * Provides type-safe access to configuration
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),

  // Server
  PORT: z.string().regex(/^\d+$/).default('3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Database
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.string().regex(/^\d+$/).default('5432'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_POOL_MIN: z.string().regex(/^\d+$/).default('2'),
  DB_POOL_MAX: z.string().regex(/^\d+$/).default('10'),
  DB_SSL: z.enum(['true', 'false']).default('false'),

  // RFID
  RFID_READER_IPS: z.string().min(1, 'RFID_READER_IPS is required'),
  RFID_READER_PORT: z.string().regex(/^\d+$/).default('5084'),
  RFID_READ_POWER: z.string().regex(/^\d+$/).default('25'),
  RFID_RECONNECT_DELAY: z.string().regex(/^\d+$/).default('5000'),
  RFID_SESSION_TIMEOUT: z.string().regex(/^\d+$/).default('300'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),
  LOG_MAX_FILES: z.string().regex(/^\d+$/).default('14'),
  LOG_MAX_SIZE: z.string().default('20m'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('60000'),
  RATE_LIMIT_MAX: z.string().regex(/^\d+$/).default('100'),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('24h'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // Metrics
  METRICS_ENABLED: z.enum(['true', 'false']).default('true'),
  METRICS_PORT: z.string().regex(/^\d+$/).default('9090'),

  // Redis (optional)
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().regex(/^\d+$/).optional(),
  REDIS_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 *
 * @throws {Error} If validation fails
 * @returns Validated and typed environment variables
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 *
 * Call this once at startup to validate and cache environment
 */
let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}
