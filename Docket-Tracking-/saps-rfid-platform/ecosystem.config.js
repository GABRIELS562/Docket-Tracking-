module.exports = {
  apps: [
    {
      name: 'saps-rfid-platform',
      script: './dist/index.js',
      instances: process.env.PM2_INSTANCES || 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: process.env.PM2_MAX_MEMORY_RESTART || '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: process.env.PM2_LOG_DATE_FORMAT || 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      shutdown_with_message: true,
    },
  ],
};
