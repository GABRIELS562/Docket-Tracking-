import { getEnv } from './validation';

/**
 * Logging configuration
 *
 * Winston logger settings
 */
export interface LoggingConfig {
  level: string;
  file: {
    enabled: boolean;
    path: string;
    maxFiles: number;
    maxSize: string;
  };
  console: {
    enabled: boolean;
    colorize: boolean;
  };
}

/**
 * Get logging configuration from environment
 *
 * @returns Logging configuration
 */
export function getLoggingConfig(): LoggingConfig {
  const env = getEnv();

  return {
    level: env.LOG_LEVEL,
    file: {
      enabled: env.NODE_ENV === 'production',
      path: env.LOG_FILE_PATH,
      maxFiles: parseInt(env.LOG_MAX_FILES, 10),
      maxSize: env.LOG_MAX_SIZE,
    },
    console: {
      enabled: true,
      colorize: env.NODE_ENV !== 'production',
    },
  };
}
