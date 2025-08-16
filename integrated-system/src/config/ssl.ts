/**
 * SSL/HTTPS Configuration
 * Production SSL setup and certificate management
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { Express } from 'express';
import { logger } from '../utils/logger';

interface SSLConfig {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  port: number;
  redirectHTTP: boolean;
}

export class SSLManager {
  private config: SSLConfig;
  private httpsServer?: https.Server;
  private httpServer?: http.Server;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load SSL configuration from environment
   */
  private loadConfig(): SSLConfig {
    return {
      enabled: process.env.SSL_ENABLED === 'true',
      certPath: process.env.SSL_CERT_PATH,
      keyPath: process.env.SSL_KEY_PATH,
      caPath: process.env.SSL_CA_PATH,
      port: parseInt(process.env.HTTPS_PORT || '443'),
      redirectHTTP: process.env.SSL_REDIRECT_HTTP === 'true',
    };
  }

  /**
   * Create HTTPS server
   */
  public createHTTPSServer(app: Express): https.Server | http.Server {
    if (!this.config.enabled) {
      logger.info('SSL is disabled, creating HTTP server');
      this.httpServer = http.createServer(app);
      return this.httpServer;
    }

    try {
      const options = this.getSSLOptions();
      this.httpsServer = https.createServer(options, app);
      logger.info('HTTPS server created successfully');
      
      // Create HTTP redirect server if enabled
      if (this.config.redirectHTTP) {
        this.createRedirectServer();
      }
      
      return this.httpsServer;
    } catch (error) {
      logger.error('Failed to create HTTPS server, falling back to HTTP', error);
      this.httpServer = http.createServer(app);
      return this.httpServer;
    }
  }

  /**
   * Get SSL certificate options
   */
  private getSSLOptions(): https.ServerOptions {
    if (!this.config.certPath || !this.config.keyPath) {
      throw new Error('SSL certificate paths not configured');
    }

    const options: https.ServerOptions = {
      cert: fs.readFileSync(this.config.certPath),
      key: fs.readFileSync(this.config.keyPath),
    };

    // Add CA certificate if provided
    if (this.config.caPath) {
      options.ca = fs.readFileSync(this.config.caPath);
    }

    // Security options
    options.secureOptions = 
      require('constants').SSL_OP_NO_SSLv2 |
      require('constants').SSL_OP_NO_SSLv3 |
      require('constants').SSL_OP_NO_TLSv1 |
      require('constants').SSL_OP_NO_TLSv1_1;

    // Cipher configuration
    options.ciphers = [
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'DHE-RSA-AES128-GCM-SHA256',
      'DHE-DSS-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-SHA256',
      'ECDHE-ECDSA-AES128-SHA256',
      'ECDHE-RSA-AES128-SHA',
      'ECDHE-ECDSA-AES128-SHA',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-ECDSA-AES256-SHA384',
      'ECDHE-RSA-AES256-SHA',
      'ECDHE-ECDSA-AES256-SHA',
      'DHE-RSA-AES128-SHA256',
      'DHE-RSA-AES128-SHA',
      'DHE-DSS-AES128-SHA256',
      'DHE-RSA-AES256-SHA256',
      'DHE-DSS-AES256-SHA',
      'DHE-RSA-AES256-SHA',
      '!aNULL',
      '!eNULL',
      '!EXPORT',
      '!DES',
      '!RC4',
      '!3DES',
      '!MD5',
      '!PSK',
    ].join(':');

    options.honorCipherOrder = true;

    return options;
  }

  /**
   * Create HTTP to HTTPS redirect server
   */
  private createRedirectServer(): void {
    const redirectApp = require('express')();
    
    redirectApp.use((req: any, res: any) => {
      const httpsUrl = `https://${req.headers.host}${req.url}`;
      res.redirect(301, httpsUrl);
    });

    const httpServer = http.createServer(redirectApp);
    const httpPort = parseInt(process.env.PORT || '80');
    
    httpServer.listen(httpPort, () => {
      logger.info(`HTTP redirect server listening on port ${httpPort}`);
    });
  }

  /**
   * Generate self-signed certificate for development
   */
  public static async generateSelfSignedCert(): Promise<void> {
    const { exec } = require('child_process');
    const certDir = path.join(process.cwd(), 'certs');
    
    // Create certs directory
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    const certPath = path.join(certDir, 'server.crt');
    const keyPath = path.join(certDir, 'server.key');

    // Check if certificates already exist
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      logger.info('Self-signed certificates already exist');
      return;
    }

    // Generate self-signed certificate
    const command = `openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;

    return new Promise((resolve, reject) => {
      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          logger.error('Failed to generate self-signed certificate', error);
          reject(error);
        } else {
          logger.info('Self-signed certificate generated successfully');
          logger.info(`Certificate: ${certPath}`);
          logger.info(`Private Key: ${keyPath}`);
          resolve();
        }
      });
    });
  }

  /**
   * Validate SSL certificate
   */
  public validateCertificate(): boolean {
    if (!this.config.enabled) {
      return true; // SSL not enabled, validation passes
    }

    try {
      if (!this.config.certPath || !this.config.keyPath) {
        logger.error('SSL certificate paths not configured');
        return false;
      }

      // Check if files exist
      if (!fs.existsSync(this.config.certPath)) {
        logger.error(`SSL certificate file not found: ${this.config.certPath}`);
        return false;
      }

      if (!fs.existsSync(this.config.keyPath)) {
        logger.error(`SSL key file not found: ${this.config.keyPath}`);
        return false;
      }

      // Try to read the files
      const cert = fs.readFileSync(this.config.certPath, 'utf8');
      const key = fs.readFileSync(this.config.keyPath, 'utf8');

      // Basic validation
      if (!cert.includes('BEGIN CERTIFICATE')) {
        logger.error('Invalid certificate format');
        return false;
      }

      if (!key.includes('BEGIN') || !key.includes('KEY')) {
        logger.error('Invalid key format');
        return false;
      }

      logger.info('SSL certificate validation passed');
      return true;
    } catch (error) {
      logger.error('SSL certificate validation failed', error);
      return false;
    }
  }

  /**
   * Get certificate expiry information
   */
  public getCertificateInfo(): any {
    if (!this.config.enabled || !this.config.certPath) {
      return null;
    }

    try {
      const { X509Certificate } = require('crypto');
      const certPEM = fs.readFileSync(this.config.certPath, 'utf8');
      const cert = new X509Certificate(certPEM);

      return {
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        fingerprint: cert.fingerprint,
        serialNumber: cert.serialNumber,
      };
    } catch (error) {
      logger.error('Failed to get certificate info', error);
      return null;
    }
  }

  /**
   * Monitor certificate expiry
   */
  public startExpiryMonitoring(): void {
    if (!this.config.enabled) {
      return;
    }

    // Check certificate expiry every day
    setInterval(() => {
      const info = this.getCertificateInfo();
      if (info) {
        const expiryDate = new Date(info.validTo);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 30) {
          logger.warn(`SSL certificate expires in ${daysUntilExpiry} days`);
          
          // Send notification if less than 7 days
          if (daysUntilExpiry < 7) {
            this.sendExpiryNotification(daysUntilExpiry);
          }
        }
      }
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  /**
   * Send certificate expiry notification
   */
  private async sendExpiryNotification(daysUntilExpiry: number): Promise<void> {
    try {
      const NotificationService = require('../services/NotificationService').default;
      const notificationService = NotificationService.getInstance();

      await notificationService.send({
        type: 'email',
        recipient: process.env.EMAIL_ADMIN || 'admin@dockettrack.gov',
        subject: `SSL Certificate Expiry Warning`,
        message: `The SSL certificate for the RFID Tracking System will expire in ${daysUntilExpiry} days. Please renew it immediately.`,
        priority: 'urgent',
      });
    } catch (error) {
      logger.error('Failed to send certificate expiry notification', error);
    }
  }
}

/**
 * SSL/TLS best practices configuration
 */
export const sslBestPractices = {
  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // Certificate pinning
  pinning: {
    enabled: false, // Enable with caution
    pins: [], // Add certificate fingerprints
    maxAge: 5184000, // 60 days
    includeSubDomains: true,
  },

  // OCSP Stapling
  ocspStapling: {
    enabled: true,
  },
};

/**
 * Nginx configuration template for SSL
 */
export const nginxSSLConfig = `
server {
    listen 80;
    server_name dockettrack.gov;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dockettrack.gov;

    ssl_certificate /etc/ssl/certs/dockettrack.crt;
    ssl_certificate_key /etc/ssl/private/dockettrack.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/ca-bundle.crt;

    # Session configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;

// Export singleton instance
export const sslManager = new SSLManager();

export default SSLManager;