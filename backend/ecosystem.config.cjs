// PM2 process file for the Hostinger VPS. Secrets are read by the app from
// backend/.env (dotenv), never stored here.
//   pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'velisqa-api',
      cwd: __dirname,
      script: './src/server.js',
      // One process: SSE order alerts and rate limits are in-memory.
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      restart_delay: 5000,
      kill_timeout: 12000,
      time: true,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '5001',
      },
    },
  ],
}
