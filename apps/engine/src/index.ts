import http from 'node:http'
import { logger } from '@symploke/logger'
import { getQueueProcessor } from './queue/processor.js'
import { getPusherService } from './pusher/service.js'

// Simple health check server for Railway
const PORT = process.env.PORT || 3001
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'symploke-engine' }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

async function main() {
  logger.info('Starting Symploke File Sync Engine...')

  // Start health check server
  healthServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Health check server running')
  })

  // Initialize Pusher service
  const pusher = getPusherService()
  if (pusher.isConfigured()) {
    logger.info('Pusher service configured for real-time updates')
  }

  // Start the queue processor
  const processor = getQueueProcessor()

  // Handle shutdown signals
  const shutdown = async () => {
    logger.info('Received shutdown signal, stopping...')
    await processor.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception')
    process.exit(1)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection')
    process.exit(1)
  })

  await processor.start()
  logger.info('Engine running, processing sync jobs...')

  // Keep the process alive
  await new Promise(() => {})
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error')
  process.exit(1)
})
