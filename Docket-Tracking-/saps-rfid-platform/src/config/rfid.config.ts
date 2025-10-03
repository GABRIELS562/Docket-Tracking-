import { getEnv } from './validation';

/**
 * RFID Reader configuration
 *
 * LLRP protocol settings for Zebra FX7500 readers
 */
export interface RFIDConfig {
  readers: Array<{
    ipAddress: string;
    port: number;
  }>;
  settings: {
    transmitPower: number;
    sessionTimeout: number;
    reconnectDelay: number;
  };
}

/**
 * Get RFID configuration from environment
 *
 * @returns RFID configuration
 */
export function getRFIDConfig(): RFIDConfig {
  const env = getEnv();

  // Parse comma-separated list of reader IPs
  const readerIPs = env.RFID_READER_IPS.split(',').map((ip) => ip.trim());
  const readerPort = parseInt(env.RFID_READER_PORT, 10);

  return {
    readers: readerIPs.map((ipAddress) => ({
      ipAddress,
      port: readerPort,
    })),
    settings: {
      transmitPower: parseInt(env.RFID_READ_POWER, 10),
      sessionTimeout: parseInt(env.RFID_SESSION_TIMEOUT, 10),
      reconnectDelay: parseInt(env.RFID_RECONNECT_DELAY, 10),
    },
  };
}
