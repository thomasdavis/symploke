import http from 'node:http'

// Catch any uncaught errors at the top level
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason)
})

// Start health check server FIRST before any imports that might fail
// This ensures Railway health checks pass while we debug config issues
const PORT = process.env.PORT || 3001
let isHealthy = true
let healthError: string | null = null

// Whether to use Redis/BullMQ or fallback to in-memory polling
const USE_REDIS_QUEUE = Boolean(
  process.env.REDIS_URL || process.env.REDISHOST || process.env.REDIS_PASSWORD,
)

// Track running weave discovery jobs (only used in non-Redis mode)
const runningWeaveJobs = new Map<string, { startedAt: Date; runId: string }>()

// Track running daily sync jobs (only used in non-Redis mode)
const runningSyncJobs = new Map<string, { startedAt: Date; reposQueued: number }>()

console.log('Starting engine, PORT:', PORT)

const healthServer = http.createServer(async (req, res) => {
  console.log('Request:', req.method, req.url)

  // Health check endpoints
  if (req.url === '/health' || req.url === '/') {
    if (isHealthy) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'symploke-engine' }))
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'error', error: healthError }))
    }
    return
  }

  // Trigger weave discovery endpoint
  if (req.method === 'POST' && req.url?.startsWith('/trigger-weaves/')) {
    const plexusId = req.url.replace('/trigger-weaves/', '')

    if (!plexusId) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing plexusId' }))
      return
    }

    try {
      const { db } = await import('@symploke/db')

      // Check database for any RUNNING status
      const existingRun = await db.weaveDiscoveryRun.findFirst({
        where: {
          plexusId,
          status: 'RUNNING',
        },
      })

      if (existingRun) {
        res.writeHead(409, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'Weave discovery already in progress',
            runId: existingRun.id,
            startedAt: existingRun.startedAt.toISOString(),
          }),
        )
        return
      }

      // Use Redis queue if available
      if (USE_REDIS_QUEUE) {
        const { addWeaveJob } = await import('./queue/redis.js')
        const job = await addWeaveJob(plexusId, 'manual')

        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'queued',
            message: 'Weave discovery job queued',
            plexusId,
            jobId: job.id,
          }),
        )
        return
      }

      // Fallback: Check in-memory tracking
      if (runningWeaveJobs.has(plexusId)) {
        const running = runningWeaveJobs.get(plexusId)!
        res.writeHead(409, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'Weave discovery already in progress',
            runId: running.runId,
            startedAt: running.startedAt.toISOString(),
          }),
        )
        return
      }

      // Start the job in the background (non-Redis mode)
      const { findWeaves } = await import('./weave/finder.js')
      const startedAt = new Date()

      // Create a placeholder to track the job (will be updated with actual runId)
      runningWeaveJobs.set(plexusId, { startedAt, runId: 'pending' })

      // Run weave discovery in background
      findWeaves(plexusId, { verbose: true })
        .then((result) => {
          console.log(`Weave discovery completed for plexus ${plexusId}:`, {
            runId: result.runId,
            saved: result.saved,
            duration: `${(result.duration / 1000).toFixed(1)}s`,
          })
        })
        .catch((error) => {
          console.error(`Weave discovery failed for plexus ${plexusId}:`, error)
        })
        .finally(() => {
          runningWeaveJobs.delete(plexusId)
        })

      res.writeHead(202, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'started',
          message: 'Weave discovery started',
          plexusId,
        }),
      )
    } catch (error) {
      console.error('Error triggering weave discovery:', error)
      runningWeaveJobs.delete(plexusId)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      )
    }
    return
  }

  // Trigger daily sync for all repos in a plexus
  if (req.method === 'POST' && req.url?.startsWith('/sync-plexus/')) {
    const plexusId = req.url.replace('/sync-plexus/', '')

    if (!plexusId) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing plexusId' }))
      return
    }

    try {
      const { db, SyncJobStatus } = await import('@symploke/db')

      // Get all repos in the plexus
      const repos = await db.repo.findMany({
        where: { plexusId },
        select: { id: true, fullName: true },
      })

      if (repos.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'No repos found in plexus' }))
        return
      }

      // Check for any repos that already have pending/in-progress sync jobs
      const existingJobs = await db.repoSyncJob.findMany({
        where: {
          repoId: { in: repos.map((r) => r.id) },
          status: {
            in: [
              SyncJobStatus.PENDING,
              SyncJobStatus.FETCHING_TREE,
              SyncJobStatus.PROCESSING_FILES,
            ],
          },
        },
        select: { repoId: true },
      })

      const reposWithExistingJobs = new Set(existingJobs.map((j) => j.repoId))
      const reposToSync = repos.filter((r) => !reposWithExistingJobs.has(r.id))

      if (reposToSync.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'already_queued',
            message: 'All repos already have sync jobs queued',
            reposSkipped: repos.length,
          }),
        )
        return
      }

      // Use Redis queue if available
      if (USE_REDIS_QUEUE) {
        const { addSyncJob } = await import('./queue/redis.js')

        // Add jobs to Redis queue
        const jobPromises = reposToSync.map((repo) => addSyncJob(repo.id, 'manual'))
        const jobs = await Promise.all(jobPromises)

        console.log(`Queued sync for ${jobs.length} repos in plexus ${plexusId} via Redis`)

        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'queued',
            message: `Sync jobs queued for ${jobs.length} repos`,
            reposQueued: jobs.length,
            reposSkipped: reposWithExistingJobs.size,
            jobIds: jobs.map((j) => j.id),
          }),
        )
        return
      }

      // Fallback: Check in-memory tracking
      if (runningSyncJobs.has(plexusId)) {
        const running = runningSyncJobs.get(plexusId)!
        res.writeHead(409, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            error: 'Sync already in progress for this plexus',
            startedAt: running.startedAt.toISOString(),
            reposQueued: running.reposQueued,
          }),
        )
        return
      }

      // Create sync jobs in database for polling processor
      const createdJobs = await db.repoSyncJob.createManyAndReturn({
        data: reposToSync.map((repo) => ({
          repoId: repo.id,
        })),
      })

      runningSyncJobs.set(plexusId, {
        startedAt: new Date(),
        reposQueued: createdJobs.length,
      })

      // Clean up tracking after a reasonable timeout (jobs are processed by queue)
      setTimeout(
        () => {
          runningSyncJobs.delete(plexusId)
        },
        30 * 60 * 1000,
      ) // 30 minutes

      console.log(`Queued sync for ${createdJobs.length} repos in plexus ${plexusId}`)

      res.writeHead(202, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'queued',
          message: `Sync jobs queued for ${createdJobs.length} repos`,
          reposQueued: createdJobs.length,
          reposSkipped: reposWithExistingJobs.size,
          jobIds: createdJobs.map((j) => j.id),
        }),
      )
    } catch (error) {
      console.error('Error triggering plexus sync:', error)
      runningSyncJobs.delete(plexusId)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      )
    }
    return
  }

  // Get sync status for a plexus
  if (req.method === 'GET' && req.url?.startsWith('/sync-status/')) {
    const plexusId = req.url.replace('/sync-status/', '')

    try {
      const { db, SyncJobStatus } = await import('@symploke/db')

      // Get all repos in plexus with their latest sync job
      const repos = await db.repo.findMany({
        where: { plexusId },
        select: {
          id: true,
          fullName: true,
          lastIndexed: true,
          syncJobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              processedFiles: true,
              totalFiles: true,
              createdAt: true,
              completedAt: true,
            },
          },
        },
      })

      const repoStatuses = repos.map((repo) => {
        const latestJob = repo.syncJobs[0]
        return {
          repoId: repo.id,
          fullName: repo.fullName,
          lastIndexed: repo.lastIndexed?.toISOString() ?? null,
          latestJob: latestJob
            ? {
                id: latestJob.id,
                status: latestJob.status,
                progress:
                  latestJob.totalFiles && latestJob.totalFiles > 0
                    ? Math.round(((latestJob.processedFiles ?? 0) / latestJob.totalFiles) * 100)
                    : null,
                createdAt: latestJob.createdAt.toISOString(),
                completedAt: latestJob.completedAt?.toISOString() ?? null,
              }
            : null,
        }
      })

      // Count by status
      const pendingCount = repoStatuses.filter(
        (r) => r.latestJob?.status === SyncJobStatus.PENDING,
      ).length
      const runningCount = repoStatuses.filter(
        (r) =>
          r.latestJob?.status === SyncJobStatus.FETCHING_TREE ||
          r.latestJob?.status === SyncJobStatus.PROCESSING_FILES,
      ).length

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          totalRepos: repos.length,
          pendingJobs: pendingCount,
          runningJobs: runningCount,
          repos: repoStatuses,
        }),
      )
    } catch (error) {
      console.error('Error getting sync status:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      )
    }
    return
  }

  // Comprehensive stats endpoint
  if (req.method === 'GET' && req.url === '/stats') {
    try {
      const { db } = await import('@symploke/db')

      // Get all plexuses
      const plexuses = await db.plexus.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              repos: true,
              members: true,
            },
          },
        },
      })

      // Get repo stats
      const totalRepos = await db.repo.count()
      const indexedRepos = await db.repo.count({
        where: { lastIndexed: { not: null } },
      })

      // Get file stats
      const totalFiles = await db.file.count()
      const filesWithContent = await db.file.count({
        where: { content: { not: null } },
      })
      const fileSizeStats = await db.file.aggregate({
        _sum: { size: true },
        _avg: { size: true },
      })

      // Get chunk stats
      const chunkStats = await db.chunk.aggregate({
        _count: true,
        _sum: { tokenCount: true },
        _avg: { tokenCount: true },
      })
      // Count embedded chunks by checking embeddedAt timestamp
      const embeddedChunks = await db.chunk.count({
        where: { embeddedAt: { not: null } },
      })

      // Get weave stats
      const totalWeaves = await db.weave.count()
      const weavesByType = await db.weave.groupBy({
        by: ['type'],
        _count: true,
      })

      // Get weave discovery runs
      const runningWeaveRuns = await db.weaveDiscoveryRun.count({
        where: { status: 'RUNNING' },
      })
      const completedWeaveRuns = await db.weaveDiscoveryRun.count({
        where: { status: 'COMPLETED' },
      })
      const failedWeaveRuns = await db.weaveDiscoveryRun.count({
        where: { status: 'FAILED' },
      })
      const latestWeaveRun = await db.weaveDiscoveryRun.findFirst({
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          weavesSaved: true,
          repoPairsTotal: true,
          repoPairsChecked: true,
          plexus: { select: { name: true } },
        },
      })

      // Get sync job stats
      const syncJobsByStatus = await db.repoSyncJob.groupBy({
        by: ['status'],
        _count: true,
      })
      const recentSyncJobs = await db.repoSyncJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          processedFiles: true,
          totalFiles: true,
          createdAt: true,
          completedAt: true,
          error: true,
          repo: { select: { fullName: true } },
        },
      })

      // Get Redis/BullMQ queue stats if available
      let queueStats = null
      if (USE_REDIS_QUEUE) {
        try {
          const { getSyncQueue, getEmbedQueue, getWeaveQueue } = await import('./queue/redis.js')
          const syncQueue = getSyncQueue()
          const embedQueue = getEmbedQueue()
          const weaveQueue = getWeaveQueue()

          const [syncCounts, embedCounts, weaveCounts] = await Promise.all([
            syncQueue.getJobCounts(),
            embedQueue.getJobCounts(),
            weaveQueue.getJobCounts(),
          ])

          queueStats = {
            sync: syncCounts,
            embed: embedCounts,
            weave: weaveCounts,
          }
        } catch {
          queueStats = { error: 'Failed to get queue stats' }
        }
      }

      // System info
      const uptime = process.uptime()
      const memUsage = process.memoryUsage()

      const stats = {
        system: {
          uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
          uptimeSeconds: Math.floor(uptime),
          memory: {
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          },
          nodeVersion: process.version,
          useRedisQueue: USE_REDIS_QUEUE,
        },
        plexuses: plexuses.map((p) => ({
          id: p.id,
          name: p.name,
          repos: p._count.repos,
          members: p._count.members,
        })),
        repos: {
          total: totalRepos,
          indexed: indexedRepos,
          notIndexed: totalRepos - indexedRepos,
        },
        files: {
          total: totalFiles,
          withContent: filesWithContent,
          totalSizeBytes: fileSizeStats._sum.size ?? 0,
          totalSizeMB: Math.round((fileSizeStats._sum.size ?? 0) / 1024 / 1024),
          avgSizeBytes: Math.round(fileSizeStats._avg.size ?? 0),
        },
        chunks: {
          total: chunkStats._count,
          embedded: embeddedChunks,
          notEmbedded: chunkStats._count - embeddedChunks,
          totalTokens: chunkStats._sum.tokenCount ?? 0,
          avgTokensPerChunk: Math.round(chunkStats._avg.tokenCount ?? 0),
        },
        weaves: {
          total: totalWeaves,
          byType: Object.fromEntries(weavesByType.map((w) => [w.type, w._count])),
        },
        weaveDiscovery: {
          running: runningWeaveRuns,
          completed: completedWeaveRuns,
          failed: failedWeaveRuns,
          latestRun: latestWeaveRun
            ? {
                id: latestWeaveRun.id,
                plexus: latestWeaveRun.plexus.name,
                status: latestWeaveRun.status,
                startedAt: latestWeaveRun.startedAt.toISOString(),
                completedAt: latestWeaveRun.completedAt?.toISOString() ?? null,
                weavesSaved: latestWeaveRun.weavesSaved,
                progress:
                  latestWeaveRun.repoPairsTotal && latestWeaveRun.repoPairsTotal > 0
                    ? {
                        checked: latestWeaveRun.repoPairsChecked,
                        total: latestWeaveRun.repoPairsTotal,
                        percent: Math.round(
                          ((latestWeaveRun.repoPairsChecked ?? 0) / latestWeaveRun.repoPairsTotal) *
                            100,
                        ),
                      }
                    : null,
              }
            : null,
        },
        syncJobs: {
          byStatus: Object.fromEntries(syncJobsByStatus.map((s) => [s.status, s._count])),
          recent: recentSyncJobs.map((j) => {
            const durationMs =
              j.completedAt && j.createdAt ? j.completedAt.getTime() - j.createdAt.getTime() : null
            const durationStr = durationMs
              ? durationMs < 60000
                ? `${Math.round(durationMs / 1000)}s`
                : `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`
              : null
            return {
              id: j.id,
              repo: j.repo.fullName,
              status: j.status,
              progress:
                j.totalFiles && j.totalFiles > 0
                  ? {
                      processed: j.processedFiles ?? 0,
                      total: j.totalFiles,
                      percent: Math.round(((j.processedFiles ?? 0) / j.totalFiles) * 100),
                    }
                  : null,
              duration: durationStr,
              createdAt: j.createdAt.toISOString(),
              completedAt: j.completedAt?.toISOString() ?? null,
              error: j.error,
            }
          }),
        },
        queues: queueStats,
        timestamp: new Date().toISOString(),
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(stats, null, 2))
    } catch (error) {
      console.error('Error getting stats:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      )
    }
    return
  }

  // Check weave status endpoint
  if (req.method === 'GET' && req.url?.startsWith('/weave-status/')) {
    const plexusId = req.url.replace('/weave-status/', '')

    try {
      const { db } = await import('@symploke/db')

      // Check for running job
      const runningRun = await db.weaveDiscoveryRun.findFirst({
        where: {
          plexusId,
          status: 'RUNNING',
        },
        select: {
          id: true,
          startedAt: true,
          repoPairsTotal: true,
          repoPairsChecked: true,
        },
      })

      if (runningRun) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'running',
            runId: runningRun.id,
            startedAt: runningRun.startedAt.toISOString(),
            progress: {
              total: runningRun.repoPairsTotal,
              checked: runningRun.repoPairsChecked,
            },
          }),
        )
        return
      }

      // Get latest completed run
      const latestRun = await db.weaveDiscoveryRun.findFirst({
        where: { plexusId },
        orderBy: { startedAt: 'desc' },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          weavesSaved: true,
        },
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          status: 'idle',
          latestRun: latestRun
            ? {
                id: latestRun.id,
                status: latestRun.status,
                startedAt: latestRun.startedAt.toISOString(),
                completedAt: latestRun.completedAt?.toISOString(),
                weavesSaved: latestRun.weavesSaved,
              }
            : null,
        }),
      )
    } catch (error) {
      console.error('Error checking weave status:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      )
    }
    return
  }

  res.writeHead(404)
  res.end()
})

// Start listening immediately
healthServer.listen(PORT, () => {
  console.log(`Health check server listening on port ${PORT}`)
})

// Hourly sync scheduler
async function runHourlySync() {
  try {
    const { db, SyncJobStatus } = await import('@symploke/db')
    const { logger } = await import('@symploke/logger')

    logger.info('Running hourly sync for all plexuses...')

    // Get all plexuses
    const plexuses = await db.plexus.findMany({
      select: { id: true, name: true },
    })

    for (const plexus of plexuses) {
      // Get all repos in this plexus
      const repos = await db.repo.findMany({
        where: { plexusId: plexus.id },
        select: { id: true, fullName: true },
      })

      if (repos.length === 0) continue

      // Check for repos that already have pending/in-progress sync jobs
      const existingJobs = await db.repoSyncJob.findMany({
        where: {
          repoId: { in: repos.map((r) => r.id) },
          status: {
            in: [
              SyncJobStatus.PENDING,
              SyncJobStatus.FETCHING_TREE,
              SyncJobStatus.PROCESSING_FILES,
            ],
          },
        },
        select: { repoId: true },
      })

      const reposWithExistingJobs = new Set(existingJobs.map((j) => j.repoId))
      const reposToSync = repos.filter((r) => !reposWithExistingJobs.has(r.id))

      if (reposToSync.length === 0) {
        logger.info({ plexus: plexus.name }, 'All repos already have sync jobs queued, skipping')
        continue
      }

      // Create sync jobs for repos that need syncing
      await db.repoSyncJob.createMany({
        data: reposToSync.map((repo) => ({
          repoId: repo.id,
        })),
      })

      logger.info(
        {
          plexus: plexus.name,
          reposQueued: reposToSync.length,
          reposSkipped: reposWithExistingJobs.size,
        },
        'Queued hourly sync jobs',
      )
    }

    logger.info('Hourly sync scheduling complete')
  } catch (error) {
    const { logger } = await import('@symploke/logger')
    logger.error({ error }, 'Error running hourly sync')
  }
}

async function main() {
  // Now import modules that depend on config
  const { logger } = await import('@symploke/logger')
  const { getPusherService } = await import('./pusher/service.js')
  const { recoverStuckJobs } = await import('./queue/recovery.js')

  logger.info('Starting Symploke File Sync Engine...')
  logger.info({ useRedisQueue: USE_REDIS_QUEUE }, 'Queue mode')

  // Recover any jobs that were interrupted by the last restart
  try {
    const recovered = await recoverStuckJobs()
    if (recovered.syncJobsRecovered > 0 || recovered.chunkJobsRecovered > 0) {
      logger.info(recovered, 'Recovered stuck jobs from previous run')
    }
  } catch (error) {
    logger.error({ error }, 'Failed to recover stuck jobs, continuing startup')
  }

  // Initialize Pusher service
  const pusher = getPusherService()
  if (pusher.isConfigured()) {
    logger.info('Pusher service configured for real-time updates')
  }

  if (USE_REDIS_QUEUE) {
    // Use BullMQ with Redis
    const { startWorkers, stopWorkers } = await import('./queue/workers.js')
    const { scheduleHourlySync, closeQueues } = await import('./queue/redis.js')

    // Start BullMQ workers
    await startWorkers()

    // Schedule hourly sync as a repeatable BullMQ job
    await scheduleHourlySync()

    // Handle shutdown signals
    const shutdown = async () => {
      logger.info('Received shutdown signal, stopping BullMQ workers...')
      await stopWorkers()
      await closeQueues()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    logger.info('Engine running with Redis/BullMQ queue...')
  } else {
    // Fallback to polling-based processor
    const { getQueueProcessor } = await import('./queue/processor.js')

    // Start the polling queue processor
    const processor = getQueueProcessor()

    // Start hourly sync scheduler with setInterval
    const HOUR_MS = 60 * 60 * 1000
    setInterval(runHourlySync, HOUR_MS)
    logger.info('Hourly sync scheduler started (runs every hour)')

    // Run initial sync after a short delay to let the system stabilize
    setTimeout(runHourlySync, 30 * 1000) // 30 seconds after startup

    // Handle shutdown signals
    const shutdown = async () => {
      logger.info('Received shutdown signal, stopping...')
      await processor.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    await processor.start()
    logger.info('Engine running with polling-based queue...')
  }

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
