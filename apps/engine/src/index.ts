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

console.log('Starting engine v3 (mates), PORT:', PORT)

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

  // Version endpoint - shows deployed commit hash for debugging deployments
  if (req.url === '/version') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        service: 'symploke-engine',
        commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'unknown',
        branch: process.env.RAILWAY_GIT_BRANCH || process.env.GIT_BRANCH || 'unknown',
        deployedAt: process.env.RAILWAY_DEPLOY_TIMESTAMP || 'unknown',
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
      }),
    )
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

  // Trigger embed for a specific repo
  if (req.method === 'POST' && req.url?.startsWith('/trigger-embed/')) {
    const repoId = req.url.replace('/trigger-embed/', '')

    if (!repoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing repoId' }))
      return
    }

    try {
      const { db } = await import('@symploke/db')

      // Verify repo exists
      const repo = await db.repo.findUnique({
        where: { id: repoId },
        select: { id: true, fullName: true },
      })

      if (!repo) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Repo not found' }))
        return
      }

      if (USE_REDIS_QUEUE) {
        const { addEmbedJob } = await import('./queue/redis.js')
        const job = await addEmbedJob(repoId, 'manual')

        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'queued',
            message: 'Embed job queued',
            repoId,
            repoFullName: repo.fullName,
            jobId: job.id,
          }),
        )
        return
      }

      res.writeHead(501, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Redis queue not available' }))
    } catch (error) {
      console.error('Error triggering embed:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      )
    }
    return
  }

  // Trigger embed for all repos in a plexus that need it
  if (req.method === 'POST' && req.url?.startsWith('/embed-plexus/')) {
    const plexusId = req.url.replace('/embed-plexus/', '')

    if (!plexusId) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing plexusId' }))
      return
    }

    try {
      const { db } = await import('@symploke/db')

      // Find repos with files that need chunking or chunks that need embedding
      const reposNeedingEmbed = await db.$queryRaw<
        Array<{
          repoId: string
          fullName: string
          filesNeedingChunking: bigint
          chunksNeedingEmbedding: bigint
        }>
      >`
        SELECT * FROM (
          SELECT
            r.id as "repoId",
            r."fullName" as "fullName",
            (
              SELECT COUNT(*) FROM files f
              WHERE f."repoId" = r.id
                AND f.content IS NOT NULL
                AND f."skippedReason" IS NULL
                AND (f."lastChunkedSha" IS NULL OR f."lastChunkedSha" != f.sha)
            ) as "filesNeedingChunking",
            (
              SELECT COUNT(*) FROM chunks c
              JOIN files f ON c."fileId" = f.id
              WHERE f."repoId" = r.id
                AND c."embeddedAt" IS NULL
            ) as "chunksNeedingEmbedding"
          FROM repos r
          WHERE r."plexusId" = ${plexusId}
        ) sub
        WHERE "filesNeedingChunking" > 0 OR "chunksNeedingEmbedding" > 0
      `

      if (reposNeedingEmbed.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'nothing_to_do',
            message: 'All repos in plexus already have embeddings',
          }),
        )
        return
      }

      if (USE_REDIS_QUEUE) {
        const { addEmbedJob } = await import('./queue/redis.js')

        const jobPromises = reposNeedingEmbed.map((repo) => addEmbedJob(repo.repoId, 'manual'))
        const jobs = await Promise.all(jobPromises)

        console.log(`Queued embed for ${jobs.length} repos in plexus ${plexusId} via Redis`)

        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(
          JSON.stringify({
            status: 'queued',
            message: `Embed jobs queued for ${jobs.length} repos`,
            reposQueued: jobs.length,
            repos: reposNeedingEmbed.map((r) => ({
              repoId: r.repoId,
              fullName: r.fullName,
              filesNeedingChunking: Number(r.filesNeedingChunking),
              chunksNeedingEmbedding: Number(r.chunksNeedingEmbedding),
            })),
            jobIds: jobs.map((j) => j.id),
          }),
        )
        return
      }

      res.writeHead(501, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Redis queue not available' }))
    } catch (error) {
      console.error('Error triggering plexus embed:', error)
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

      // Get chunk/embed job stats
      const chunkJobsByStatus = await db.chunkSyncJob.groupBy({
        by: ['status'],
        _count: true,
      })
      const recentChunkJobs = await db.chunkSyncJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          totalFiles: true,
          processedFiles: true,
          chunksCreated: true,
          embeddingsGenerated: true,
          createdAt: true,
          completedAt: true,
          error: true,
          repo: { select: { fullName: true } },
        },
      })

      // Get recent weave discovery runs
      const recentWeaveRuns = await db.weaveDiscoveryRun.findMany({
        take: 10,
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

      // Get Pusher configuration status
      const { config } = await import('./config.js')
      const { getPusherService } = await import('./pusher/service.js')
      const pusherService = getPusherService()
      const pusherStatus = {
        configured: pusherService.isConfigured(),
        hasAppId: Boolean(config.PUSHER_APP_ID),
        hasKey: Boolean(config.PUSHER_KEY),
        hasSecret: Boolean(config.PUSHER_SECRET),
        cluster: config.PUSHER_CLUSTER,
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
        embedJobs: {
          byStatus: Object.fromEntries(chunkJobsByStatus.map((s) => [s.status, s._count])),
          recent: recentChunkJobs.map((j) => {
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
              chunksCreated: j.chunksCreated,
              embeddingsGenerated: j.embeddingsGenerated,
              duration: durationStr,
              createdAt: j.createdAt.toISOString(),
              completedAt: j.completedAt?.toISOString() ?? null,
              error: j.error,
            }
          }),
        },
        weaveRuns: {
          recent: recentWeaveRuns.map((r) => {
            const durationMs =
              r.completedAt && r.startedAt ? r.completedAt.getTime() - r.startedAt.getTime() : null
            const durationStr = durationMs
              ? durationMs < 60000
                ? `${Math.round(durationMs / 1000)}s`
                : `${Math.round(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`
              : null
            return {
              id: r.id,
              plexus: r.plexus.name,
              status: r.status,
              progress:
                r.repoPairsTotal && r.repoPairsTotal > 0
                  ? {
                      checked: r.repoPairsChecked ?? 0,
                      total: r.repoPairsTotal,
                      percent: Math.round(((r.repoPairsChecked ?? 0) / r.repoPairsTotal) * 100),
                    }
                  : null,
              weavesSaved: r.weavesSaved,
              duration: durationStr,
              startedAt: r.startedAt.toISOString(),
              completedAt: r.completedAt?.toISOString() ?? null,
            }
          }),
        },
        queues: queueStats,
        pusher: pusherStatus,
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

  // === Mates endpoints ===

  // Submit a username for mates processing
  if (req.method === 'POST' && req.url?.startsWith('/mates/submit/')) {
    const username = req.url.replace('/mates/submit/', '').toLowerCase()

    if (!username || !/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid GitHub username' }))
      return
    }

    try {
      const { db, MatesProfileStatus } = await import('@symploke/db')

      // Check for existing profile
      let profile = await db.matesProfile.findUnique({
        where: { username },
        select: { id: true, status: true, lastCrawledAt: true },
      })

      // If profile exists and is READY, check TTL (14 days)
      if (profile && profile.status === MatesProfileStatus.READY && profile.lastCrawledAt) {
        const ttlMs = 14 * 24 * 60 * 60 * 1000
        const isStale = Date.now() - profile.lastCrawledAt.getTime() > ttlMs

        if (!isStale) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ profileId: profile.id, status: 'READY', cached: true }))
          return
        }

        // Stale — reset for re-crawl
        await db.matesProfile.update({
          where: { id: profile.id },
          data: { status: MatesProfileStatus.PENDING, error: null },
        })
      }

      // If profile is currently processing, return current status
      if (
        profile &&
        profile.status !== MatesProfileStatus.READY &&
        profile.status !== MatesProfileStatus.FAILED &&
        profile.status !== MatesProfileStatus.PENDING
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ profileId: profile.id, status: profile.status, cached: false }))
        return
      }

      // Create or reset profile
      if (!profile) {
        profile = await db.matesProfile.create({
          data: { username },
          select: { id: true, status: true, lastCrawledAt: true },
        })
      } else if (profile.status === MatesProfileStatus.FAILED) {
        await db.matesProfile.update({
          where: { id: profile.id },
          data: { status: MatesProfileStatus.PENDING, error: null },
        })
      }

      // Enqueue crawl job
      if (USE_REDIS_QUEUE) {
        const { addMatesCrawlJob } = await import('./queue/redis.js')
        await addMatesCrawlJob(profile.id, username)

        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ profileId: profile.id, status: 'PENDING', queued: true }))
      } else {
        // Fallback: run synchronously in background
        const { runFullPipeline } = await import('./mates/pipeline.js')
        const { getPusherService } = await import('./pusher/service.js')
        const pusher = getPusherService()

        runFullPipeline(profile.id, { pusher }).catch((error) => {
          console.error(`Mates pipeline failed for ${username}:`, error)
        })

        res.writeHead(202, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ profileId: profile.id, status: 'PENDING', queued: false }))
      }
    } catch (error) {
      console.error('Error submitting mates profile:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
    }
    return
  }

  // Get mates profile status/data
  if (req.method === 'GET' && req.url?.startsWith('/mates/profile/')) {
    const username = req.url.replace('/mates/profile/', '').toLowerCase()

    try {
      const { db } = await import('@symploke/db')

      const profile = await db.matesProfile.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          githubId: true,
          avatarUrl: true,
          bio: true,
          company: true,
          location: true,
          blog: true,
          profileText: true,
          facets: true,
          status: true,
          error: true,
          lastCrawledAt: true,
          createdAt: true,
          matchesAsSource: {
            orderBy: { similarityScore: 'desc' },
            take: 20,
            select: {
              id: true,
              similarityScore: true,
              teaser: true,
              targetProfile: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                  profileText: true,
                  facets: true,
                },
              },
            },
          },
        },
      })

      if (!profile) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Profile not found' }))
        return
      }

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(profile))
    } catch (error) {
      console.error('Error fetching mates profile:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
    }
    return
  }

  // Get mates stats (for homepage social proof)
  if (req.method === 'GET' && req.url === '/mates/stats') {
    try {
      const { db } = await import('@symploke/db')

      const totalProfiles = await db.matesProfile.count()
      const readyProfiles = await db.matesProfile.count({ where: { status: 'READY' } })
      const totalMatches = await db.matesMatch.count()

      const recentLookups = await db.matesProfile.findMany({
        where: { status: 'READY' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          username: true,
          avatarUrl: true,
          _count: { select: { matchesAsSource: true } },
        },
      })

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          totalProfiles,
          readyProfiles,
          totalMatches,
          recentLookups: recentLookups.map((l) => ({
            username: l.username,
            avatarUrl: l.avatarUrl,
            matchCount: l._count.matchesAsSource,
          })),
        }),
      )
    } catch (error) {
      console.error('Error fetching mates stats:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
    }
    return
  }

  // Generate match narrative (on-demand)
  if (req.method === 'GET' && req.url?.match(/^\/mates\/narrative\/[^/]+\/[^/]+$/)) {
    const parts = req.url.replace('/mates/narrative/', '').split('/')
    const sourceUsername = parts[0]?.toLowerCase()
    const targetUsername = parts[1]?.toLowerCase()

    try {
      const { db } = await import('@symploke/db')
      const { generateMatchNarrative } = await import('./mates/matcher.js')

      const sourceProfile = await db.matesProfile.findUnique({
        where: { username: sourceUsername },
        select: { id: true },
      })
      const targetProfile = await db.matesProfile.findUnique({
        where: { username: targetUsername },
        select: { id: true },
      })

      if (!sourceProfile || !targetProfile) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Profile not found' }))
        return
      }

      const narrative = await generateMatchNarrative(sourceProfile.id, targetProfile.id)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ narrative }))
    } catch (error) {
      console.error('Error generating narrative:', error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
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
  const { recoverStuckJobs, requeueOrphanedJobs } = await import('./queue/recovery.js')

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

  // Re-queue orphaned PENDING jobs that exist in DB but not in Redis
  if (USE_REDIS_QUEUE) {
    try {
      const requeued = await requeueOrphanedJobs()
      if (requeued.syncJobsRequeued > 0 || requeued.chunkJobsRequeued > 0) {
        logger.info(requeued, 'Re-queued orphaned jobs')
      }
    } catch (error) {
      logger.error({ error }, 'Failed to re-queue orphaned jobs, continuing startup')
    }
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

    // Periodic orphan job recovery (every 5 minutes)
    // This catches jobs that may have been orphaned after startup
    const ORPHAN_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
    setInterval(async () => {
      try {
        const requeued = await requeueOrphanedJobs()
        if (requeued.syncJobsRequeued > 0 || requeued.chunkJobsRequeued > 0) {
          logger.info(requeued, 'Periodic check: re-queued orphaned jobs')
        }
      } catch (error) {
        logger.error({ error }, 'Periodic orphan check failed')
      }
    }, ORPHAN_CHECK_INTERVAL)
    logger.info('Orphan job recovery scheduled (every 5 minutes)')

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
