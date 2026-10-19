// Sample PM2 config; copy into backend/ only after backend/src/server.js exists.
// Secrets must be loaded by app from backend/.env or injected by VPS secret manager.
module.exports = {
  apps: [{
    name: 'velisqa-api',
    cwd: __dirname,
    script: './src/server.js',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '600M',
    restart_delay: 5000,
    time: true,
    env: {
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: '5000',
    },
  }],
}
