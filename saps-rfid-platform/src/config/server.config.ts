import { getEnv } from './validation';

/**
 * Server configuration
 *
 * HTTP server and API settings
 */
export interface ServerConfig {
  port: number;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

/**
 * Get server configuration from environment
 *
 * @returns Server configuration
 */
export function getServerConfig(): ServerConfig {
  const env = getEnv();

  return {
    port: parseInt(env.PORT, 10),
    corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    rateLimit: {
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
      max: parseInt(env.RATE_LIMIT_MAX, 10),
    },
  };
}
