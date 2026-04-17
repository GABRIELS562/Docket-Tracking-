/**
 * Configuration Module
 *
 * Centralized configuration management with environment validation
 *
 * Usage:
 * ```typescript
 * import { config } from './config';
 *
 * const dbConfig = config.database;
 * const rfidConfig = config.rfid;
 * ```
 */

import { getDatabaseConfig } from './database.config';
import { getJwtConfig } from './jwt.config';
import { getLoggingConfig } from './logging.config';
import { getRFIDConfig } from './rfid.config';
import { getServerConfig } from './server.config';
import { validateEnv, getEnv } from './validation';

/**
 * Initialize and validate configuration
 *
 * Call this once at application startup
 */
export function initializeConfig(): void {
  validateEnv();
}

/**
 * Centralized configuration object
 *
 * All configuration is loaded from environment variables
 * and validated at startup
 */
export const config = {
  env: getEnv(),
  database: getDatabaseConfig(),
  rfid: getRFIDConfig(),
  server: getServerConfig(),
  logging: getLoggingConfig(),
  jwt: getJwtConfig(),
};

// Export individual config functions
export { getDatabaseConfig } from './database.config';
export { getRFIDConfig } from './rfid.config';
export { getServerConfig } from './server.config';
export { getLoggingConfig } from './logging.config';
export { getJwtConfig } from './jwt.config';
export { validateEnv, getEnv } from './validation';
