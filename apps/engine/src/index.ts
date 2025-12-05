import http from 'node:http'

// Start health check server FIRST before any imports that might fail
// This ensures Railway health checks pass while we debug config issues
const PORT = process.env.PORT || 3001
let isHealthy = true
let healthError: string | null = null

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    if (isHealthy) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'symploke-engine' }))
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'error', error: healthError }))
    }
  } else {
    res.writeHead(404)
    res.end()
  }
})

// Start listening immediately
healthServer.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`)
})

async function main() {
  // Now import modules that depend on config
  const { logger } = await import('@symploke/logger')
  const { getQueueProcessor } = await import('./queue/processor.js')
  const { getPusherService } = await import('./pusher/service.js')

  logger.info('Starting Symploke File Sync Engine...')

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
  isHealthy = false
  healthError = error instanceof Error ? error.message : String(error)
  console.error('Fatal error:', healthError)
  // Don't exit - keep health server running so we can see the error
  // Railway will show unhealthy status
})
