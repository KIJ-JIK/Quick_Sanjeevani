/**
 * Quick Sanjeevani - PM2 Process Supervision Configuration
 * wHACKiest 2026 Ideathon - Track 3: Know Thyself
 */

module.exports = {
  apps: [
    {
      name: 'quick-sanjeevani-server',
      script: './src/server.js',
      cwd: './server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: '../logs/server-error.log',
      out_file: '../logs/server-out.log',
      merge_logs: true,
      time: true,
      min_uptime: '5s',
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'quick-sanjeevani-bot',
      script: './whatsapp-bot/src/index.js',
      cwd: './whatsapp-bot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      error_file: '../logs/bot-error.log',
      out_file: '../logs/bot-out.log',
      merge_logs: true,
      time: true,
      min_uptime: '5s',
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
