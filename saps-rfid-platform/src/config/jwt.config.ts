/**
 * JWT Configuration
 *
 * Authentication and token settings for multi-tenant JWT handling
 */
export interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

/**
 * Get JWT configuration from environment
 *
 * @returns JWT configuration
 */
export function getJwtConfig(): JwtConfig {
  return {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'rfid-inventory-platform',
    audience: process.env.JWT_AUDIENCE || 'rfid-inventory-api',
  };
}
