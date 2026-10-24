import { env } from './config/env.js'
import { closeDb, connectDb, ensureIndexes, supportsTransactions } from './config/db.js'
import { logger } from './lib/logger.js'
import { createApp } from './app.js'
import { startAbandonedCartJob } from './services/marketingService.js'

async function connectWithRetry(attempts = 10) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await connectDb()
    } catch (error) {
      logger.warn('MongoDB connection failed, retrying', { attempt, error })
      if (attempt === attempts) throw error
      await new Promise((resolve) => setTimeout(resolve, Math.min(15_000, attempt * 2000)))
    }
  }
  return null
}

async function main() {
  await connectWithRetry()
  if (!(await supportsTransactions())) {
    const message = 'MongoDB is not a replica set: checkout/payment transactions require one (see docs/vps-migration/HOSTINGER_RUNBOOK.md).'
    if (env.isProd) throw new Error(message)
    logger.warn(message)
  }
  await ensureIndexes()

  const app = createApp()
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info('Velisqa API listening', { host: env.HOST, port: env.PORT, env: env.NODE_ENV })
  })
  startAbandonedCartJob()
  server.keepAliveTimeout = 65_000
  server.headersTimeout = 66_000

  let shuttingDown = false
  const shutdown = (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info('Shutting down', { signal })
    server.close(async () => {
      await closeDb()
      process.exit(0)
    })
    server.closeAllConnections?.()
    setTimeout(() => process.exit(1), 10_000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((error) => {
  logger.error('API failed to start', { error, stack: error?.stack })
  process.exit(1)
})
