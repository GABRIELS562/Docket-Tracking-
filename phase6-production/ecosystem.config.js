// PM2 Ecosystem Configuration for RFID Docket Tracking System
// Production-ready process management with clustering and monitoring

module.exports = {
  apps: [
    {
      name: 'rfid-docket-api',
      script: './dist/server.js',
      instances: process.env.MAX_WORKERS || 4,
      exec_mode: 'cluster',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      
      // Resource Limits
      max_memory_restart: '2G',
      max_restarts: 10,
      min_uptime: '10s',
      
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Monitoring
      monitoring: true,
      pmx: true,
      
      // Advanced Options
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // Graceful Shutdown
      kill_timeout: 30000,
      listen_timeout: 8000,
      
      // Health Monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Performance Tuning
      node_args: [
        '--max-old-space-size=2048',
        '--optimize-for-size'
      ],
      
      // Cron Restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
      
      // Environment Variables Override
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        LOG_LEVEL: 'info',
        ENABLE_CLUSTERING: true
      }
    },
    
    // Background Worker for RFID Processing
    {
      name: 'rfid-worker',
      script: './dist/workers/rfidWorker.js',
      instances: 2,
      exec_mode: 'cluster',
      
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'rfid'
      },
      
      max_memory_restart: '1G',
      max_restarts: 5,
      min_uptime: '10s',
      
      log_file: './logs/worker.log',
      out_file: './logs/worker-out.log',
      error_file: './logs/worker-error.log',
      
      autorestart: true,
      watch: false
    },
    
    // Backup Worker
    {
      name: 'backup-worker',
      script: './dist/workers/backupWorker.js',
      instances: 1,
      exec_mode: 'fork',
      
      env: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'backup'
      },
      
      max_memory_restart: '512M',
      max_restarts: 3,
      min_uptime: '30s',
      
      log_file: './logs/backup.log',
      
      autorestart: true,
      watch: false,
      
      // Run backup worker only during off-peak hours
      cron_restart: '0 2 * * *'
    }
  ],
  
  // Deployment Configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.company.com', 'server2.company.com'],
      ref: 'origin/main',
      repo: 'git@github.com:company/rfid-docket-tracking.git',
      path: '/var/www/rfid-docket',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};