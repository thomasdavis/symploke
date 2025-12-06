#!/usr/bin/env node
import 'dotenv/config'
import { Command } from 'commander'
import { db, SyncJobStatus, ChunkJobStatus } from '@symploke/db'
import {
  createSyncJob,
  getJobStatus,
  listJobs,
  getQueueProcessor,
  createChunkJob,
  getChunkJobStatus,
  listChunkJobs,
} from '../queue/processor.js'
import { findWeaves, listWeaves, listDiscoveryRuns, getDiscoveryRun } from '../weave/finder.js'
import { syncRepo, failJob } from '../sync/repo-sync.js'
import { embedRepo, failChunkJob } from '../embed/embed-sync.js'
import { getPusherService } from '../pusher/service.js'

const program = new Command()

program.name('engine').description('Symploke file sync engine CLI').version('0.0.0')

// Sync command - trigger a sync for a repo
program
  .command('sync')
  .description('Trigger a file sync for a repository')
  .requiredOption('--repo-id <id>', 'Repository ID to sync')
  .option('--max-files <n>', 'Maximum number of files to process', parseInt)
  .option('--max-content <n>', 'Maximum number of files to fetch content for', parseInt)
  .option('--skip-content', 'Skip fetching file content (metadata only)')
  .option('--wait', 'Wait for sync to complete')
  .option('--immediate', 'Process immediately instead of queuing')
  .action(async (options) => {
    try {
      const config = {
        ...(options.maxFiles && { maxFiles: options.maxFiles }),
        ...(options.maxContent && { maxContentFiles: options.maxContent }),
        ...(options.skipContent && { skipContent: true }),
      }

      // Verify repo exists
      const repo = await db.repo.findUnique({
        where: { id: options.repoId },
        select: { id: true, name: true, fullName: true },
      })

      if (!repo) {
        console.error(`Repository not found: ${options.repoId}`)
        process.exit(1)
      }

      console.log(`Syncing repository: ${repo.fullName}`)

      if (options.immediate) {
        // Process immediately
        console.log('Processing sync immediately...')
        const job = await db.repoSyncJob.create({
          data: {
            repoId: options.repoId,
            config: Object.keys(config).length > 0 ? config : null,
          },
        })

        const pusher = getPusherService()
        try {
          await syncRepo(job, pusher)
          console.log('Sync completed successfully!')
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          await failJob(job.id, message, pusher)
          console.error(`Sync failed: ${message}`)
          process.exit(1)
        }
      } else {
        // Queue the job
        const jobId = await createSyncJob(options.repoId, config)
        console.log(`Created sync job: ${jobId}`)

        if (options.wait) {
          console.log('Waiting for sync to complete...')
          // Poll for completion
          while (true) {
            const status = await getJobStatus(jobId)
            if (!status) {
              console.error('Job not found')
              process.exit(1)
            }

            if (status.status === SyncJobStatus.COMPLETED) {
              console.log(
                `Sync completed: ${status.processedFiles} files processed, ${status.skippedFiles} skipped, ${status.failedFiles} failed`,
              )
              break
            } else if (status.status === SyncJobStatus.FAILED) {
              console.error(`Sync failed: ${status.error}`)
              process.exit(1)
            }

            await new Promise((resolve) => setTimeout(resolve, 2000))
            console.log(`Progress: ${status.processedFiles}/${status.totalFiles || '?'} files...`)
          }
        } else {
          console.log('Job queued. Use "pnpm engine status --job-id <id>" to check progress.')
        }
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Status command - check job status
program
  .command('status')
  .description('Check the status of a sync job')
  .requiredOption('--job-id <id>', 'Job ID to check')
  .action(async (options) => {
    try {
      const status = await getJobStatus(options.jobId)

      if (!status) {
        console.error(`Job not found: ${options.jobId}`)
        process.exit(1)
      }

      console.log('\nJob Status:')
      console.log('===========')
      console.log(`ID:         ${status.id}`)
      console.log(`Repository: ${status.repo.fullName}`)
      console.log(`Status:     ${status.status}`)
      console.log(`Progress:   ${status.processedFiles}/${status.totalFiles || '?'} files`)
      console.log(`Skipped:    ${status.skippedFiles}`)
      console.log(`Failed:     ${status.failedFiles}`)
      console.log(`Created:    ${status.createdAt.toISOString()}`)
      if (status.startedAt) {
        console.log(`Started:    ${status.startedAt.toISOString()}`)
      }
      if (status.completedAt) {
        console.log(`Completed:  ${status.completedAt.toISOString()}`)
      }
      if (status.error) {
        console.log(`Error:      ${status.error}`)
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Jobs command - list jobs
program
  .command('jobs')
  .description('List sync jobs')
  .option('--status <status>', 'Filter by status (PENDING, PROCESSING_FILES, COMPLETED, FAILED)')
  .option('--repo-id <id>', 'Filter by repository ID')
  .option('--limit <n>', 'Number of jobs to show', parseInt, 20)
  .action(async (options) => {
    try {
      const jobs = await listJobs({
        status: options.status as SyncJobStatus | undefined,
        repoId: options.repoId,
        limit: options.limit,
      })

      if (jobs.length === 0) {
        console.log('No jobs found')
        return
      }

      console.log('\nSync Jobs:')
      console.log('==========')
      for (const job of jobs) {
        const progress = job.totalFiles
          ? `${job.processedFiles}/${job.totalFiles}`
          : `${job.processedFiles}/?`
        console.log(
          `[${job.status.padEnd(16)}] ${job.id} - ${job.repo.fullName} (${progress} files)`,
        )
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Worker command - start the queue processor
program
  .command('worker')
  .description('Start the queue worker to process sync jobs')
  .action(async () => {
    console.log('Starting queue worker...')

    const processor = getQueueProcessor()

    // Handle shutdown signals
    const shutdown = async () => {
      console.log('\nShutting down...')
      await processor.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    await processor.start()
    console.log('Queue worker running. Press Ctrl+C to stop.')

    // Keep the process alive
    await new Promise(() => {})
  })

// List repos command - list available repositories
program
  .command('repos')
  .description('List available repositories')
  .option('--plexus-id <id>', 'Filter by plexus ID')
  .action(async (options) => {
    try {
      const repos = await db.repo.findMany({
        where: options.plexusId ? { plexusId: options.plexusId } : undefined,
        include: {
          plexus: { select: { name: true } },
          _count: { select: { files: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (repos.length === 0) {
        console.log('No repositories found')
        return
      }

      console.log('\nRepositories:')
      console.log('=============')
      for (const repo of repos) {
        const indexed = repo.lastIndexed
          ? `indexed ${repo.lastIndexed.toISOString()}`
          : 'not indexed'
        console.log(
          `${repo.id} - ${repo.fullName} (${repo.plexus.name}) - ${repo._count.files} files, ${indexed}`,
        )
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Reset command - reset stuck sync jobs
program
  .command('reset')
  .description('Reset stuck sync jobs (PENDING, FETCHING_TREE, PROCESSING_FILES)')
  .option('--job-id <id>', 'Reset a specific job')
  .option('--repo-id <id>', 'Reset all jobs for a repository')
  .option('--all', 'Reset all stuck jobs (required if no --job-id or --repo-id)')
  .action(async (options) => {
    try {
      // Build filter
      const where: {
        status: { in: SyncJobStatus[] }
        id?: string
        repoId?: string
      } = {
        status: {
          in: [SyncJobStatus.PENDING, SyncJobStatus.FETCHING_TREE, SyncJobStatus.PROCESSING_FILES],
        },
      }

      if (options.jobId) {
        where.id = options.jobId
      } else if (options.repoId) {
        where.repoId = options.repoId
      } else if (!options.all) {
        console.error('Please specify --job-id, --repo-id, or --all')
        process.exit(1)
      }

      // Find stuck jobs
      const stuckJobs = await db.repoSyncJob.findMany({
        where,
        include: { repo: { select: { fullName: true } } },
      })

      if (stuckJobs.length === 0) {
        console.log('No stuck jobs found')
        return
      }

      console.log(`Found ${stuckJobs.length} stuck job(s):`)
      for (const job of stuckJobs) {
        console.log(`  - ${job.id} (${job.repo.fullName}) - ${job.status}`)
      }

      const jobIds = stuckJobs.map((j: { id: string }) => j.id)

      // Delete associated file jobs
      const deletedFileJobs = await db.fileSyncJob.deleteMany({
        where: { syncJobId: { in: jobIds } },
      })
      console.log(`Deleted ${deletedFileJobs.count} file sync jobs`)

      // Mark sync jobs as cancelled
      await db.repoSyncJob.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: SyncJobStatus.CANCELLED,
          completedAt: new Date(),
          error: 'Manually reset via CLI',
        },
      })
      console.log(`Marked ${stuckJobs.length} sync job(s) as CANCELLED`)

      console.log('\nDone! You can now re-trigger syncs for these repositories.')
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Embed command - trigger embedding for a repo
program
  .command('embed')
  .description('Generate chunks and embeddings for a repository')
  .requiredOption('--repo-id <id>', 'Repository ID to embed')
  .option('--chunk-size <n>', 'Chunk size in characters', parseInt, 1500)
  .option('--overlap <n>', 'Overlap in characters', parseInt, 200)
  .option('--wait', 'Wait for embedding to complete')
  .option('--immediate', 'Process immediately instead of queuing')
  .action(async (options) => {
    try {
      const config = {
        chunkSize: options.chunkSize,
        overlap: options.overlap,
      }

      // Verify repo exists
      const repo = await db.repo.findUnique({
        where: { id: options.repoId },
        select: { id: true, name: true, fullName: true },
      })

      if (!repo) {
        console.error(`Repository not found: ${options.repoId}`)
        process.exit(1)
      }

      console.log(`Embedding repository: ${repo.fullName}`)
      console.log(`  Chunk size: ${config.chunkSize} chars`)
      console.log(`  Overlap: ${config.overlap} chars`)

      if (options.immediate) {
        // Process immediately
        console.log('Processing embed immediately...')
        const job = await db.chunkSyncJob.create({
          data: {
            repoId: options.repoId,
            config,
          },
        })

        const pusher = getPusherService()
        try {
          await embedRepo(job, pusher)
          console.log('Embedding completed successfully!')
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          await failChunkJob(job.id, message, pusher)
          console.error(`Embedding failed: ${message}`)
          process.exit(1)
        }
      } else {
        // Queue the job
        const jobId = await createChunkJob(options.repoId, config)
        console.log(`Created embed job: ${jobId}`)

        if (options.wait) {
          console.log('Waiting for embedding to complete...')
          // Poll for completion
          while (true) {
            const status = await getChunkJobStatus(jobId)
            if (!status) {
              console.error('Job not found')
              process.exit(1)
            }

            if (status.status === ChunkJobStatus.COMPLETED) {
              console.log(
                `Embedding completed: ${status.chunksCreated} chunks, ${status.embeddingsGenerated} embeddings`,
              )
              break
            } else if (status.status === ChunkJobStatus.FAILED) {
              console.error(`Embedding failed: ${status.error}`)
              process.exit(1)
            }

            await new Promise((resolve) => setTimeout(resolve, 2000))
            console.log(
              `Progress: ${status.processedFiles}/${status.totalFiles || '?'} files, ${status.chunksCreated} chunks...`,
            )
          }
        } else {
          console.log('Job queued. Use "pnpm engine embed-status --job-id <id>" to check progress.')
        }
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Embed status command - check embedding job status
program
  .command('embed-status')
  .description('Check the status of an embedding job')
  .requiredOption('--job-id <id>', 'Job ID to check')
  .action(async (options) => {
    try {
      const status = await getChunkJobStatus(options.jobId)

      if (!status) {
        console.error(`Job not found: ${options.jobId}`)
        process.exit(1)
      }

      console.log('\nEmbed Job Status:')
      console.log('=================')
      console.log(`ID:          ${status.id}`)
      console.log(`Repository:  ${status.repo.fullName}`)
      console.log(`Status:      ${status.status}`)
      console.log(`Files:       ${status.processedFiles}/${status.totalFiles || '?'}`)
      console.log(`Chunks:      ${status.chunksCreated}`)
      console.log(`Embeddings:  ${status.embeddingsGenerated}`)
      console.log(`Created:     ${status.createdAt.toISOString()}`)
      if (status.startedAt) {
        console.log(`Started:     ${status.startedAt.toISOString()}`)
      }
      if (status.completedAt) {
        console.log(`Completed:   ${status.completedAt.toISOString()}`)
      }
      if (status.error) {
        console.log(`Error:       ${status.error}`)
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Embed jobs command - list embedding jobs
program
  .command('embed-jobs')
  .description('List embedding jobs')
  .option('--status <status>', 'Filter by status (PENDING, CHUNKING, EMBEDDING, COMPLETED, FAILED)')
  .option('--repo-id <id>', 'Filter by repository ID')
  .option('--limit <n>', 'Number of jobs to show', parseInt, 20)
  .action(async (options) => {
    try {
      const jobs = await listChunkJobs({
        status: options.status as ChunkJobStatus | undefined,
        repoId: options.repoId,
        limit: options.limit,
      })

      if (jobs.length === 0) {
        console.log('No embed jobs found')
        return
      }

      console.log('\nEmbed Jobs:')
      console.log('===========')
      for (const job of jobs) {
        const progress = `${job.chunksCreated} chunks, ${job.embeddingsGenerated} embeddings`
        console.log(`[${job.status.padEnd(12)}] ${job.id} - ${job.repo.fullName} (${progress})`)
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Embed reset command - reset stuck embedding jobs
program
  .command('embed-reset')
  .description('Reset stuck embed jobs (PENDING, CHUNKING, EMBEDDING)')
  .option('--job-id <id>', 'Reset a specific job')
  .option('--repo-id <id>', 'Reset all jobs for a repository')
  .option('--all', 'Reset all stuck jobs (required if no --job-id or --repo-id)')
  .action(async (options) => {
    try {
      // Build filter
      const where: {
        status: { in: ChunkJobStatus[] }
        id?: string
        repoId?: string
      } = {
        status: {
          in: [ChunkJobStatus.PENDING, ChunkJobStatus.CHUNKING, ChunkJobStatus.EMBEDDING],
        },
      }

      if (options.jobId) {
        where.id = options.jobId
      } else if (options.repoId) {
        where.repoId = options.repoId
      } else if (!options.all) {
        console.error('Please specify --job-id, --repo-id, or --all')
        process.exit(1)
      }

      // Find stuck jobs
      const stuckJobs = await db.chunkSyncJob.findMany({
        where,
        include: { repo: { select: { fullName: true } } },
      })

      if (stuckJobs.length === 0) {
        console.log('No stuck jobs found')
        return
      }

      console.log(`Found ${stuckJobs.length} stuck job(s):`)
      for (const job of stuckJobs) {
        console.log(`  - ${job.id} (${job.repo.fullName}) - ${job.status}`)
      }

      const jobIds = stuckJobs.map((j: { id: string }) => j.id)

      // Mark chunk jobs as cancelled
      await db.chunkSyncJob.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: ChunkJobStatus.CANCELLED,
          completedAt: new Date(),
          error: 'Manually reset via CLI',
        },
      })
      console.log(`Marked ${stuckJobs.length} embed job(s) as CANCELLED`)

      console.log('\nDone! You can now re-trigger embeddings for these repositories.')
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Find weaves command - discover weaves in a plexus
program
  .command('find-weaves')
  .description('Discover integration opportunities between repositories')
  .requiredOption('--plexus-id <id>', 'Plexus ID to analyze')
  .option('--threshold <n>', 'Similarity threshold (0.0-1.0)', parseFloat, 0.85)
  .option('--min-chunks <n>', 'Min matching chunks per file pair', parseInt, 3)
  .option('--min-file-sim <n>', 'Min avg file pair similarity', parseFloat, 0.83)
  .option('--dry-run', 'Find weaves but do not save to database')
  .option('--verbose', 'Enable verbose debug logging')
  .action(async (options) => {
    try {
      // Verify plexus exists
      const plexus = await db.plexus.findUnique({
        where: { id: options.plexusId },
        select: { id: true, name: true, slug: true },
      })

      if (!plexus) {
        console.error(`Plexus not found: ${options.plexusId}`)
        process.exit(1)
      }

      console.log(`\nFinding weaves in plexus: ${plexus.name} (${plexus.slug})`)
      console.log(`  Similarity threshold: ${options.threshold}`)
      console.log(`  Min matching chunks: ${options.minChunks}`)
      console.log(`  Min file pair similarity: ${options.minFileSim}`)
      console.log(`  Dry run: ${options.dryRun ? 'yes' : 'no'}`)
      console.log(`  Verbose: ${options.verbose ? 'yes' : 'no'}`)
      console.log('')

      const result = await findWeaves(options.plexusId, {
        similarityThreshold: options.threshold,
        minMatchingChunks: options.minChunks,
        minFilePairSimilarity: options.minFileSim,
        dryRun: options.dryRun,
        verbose: options.verbose,
      })

      console.log('\nWeave Discovery Results:')
      console.log('========================')
      console.log(`Run ID:              ${result.runId}`)
      console.log(`Repo pairs analyzed: ${result.repoPairs}`)
      console.log(`Candidates found:    ${result.candidates.length}`)
      console.log(`Weaves saved:        ${result.saved}`)
      console.log(`Weaves skipped:      ${result.skipped}`)
      console.log(`Duration:            ${(result.duration / 1000).toFixed(1)}s`)
      console.log(`Log entries:         ${result.logs.length}`)

      if (result.candidates.length > 0) {
        console.log('\nDiscovered Weaves:')
        for (const candidate of result.candidates) {
          console.log(`  - [${(candidate.score * 100).toFixed(0)}%] ${candidate.title}`)
          console.log(
            `    ${candidate.description.slice(0, 100)}${candidate.description.length > 100 ? '...' : ''}`,
          )
        }
      }

      if (options.verbose && result.logs.length > 0) {
        console.log('\n--- Discovery Logs ---')
        for (const log of result.logs) {
          const ts = new Date(log.timestamp).toISOString().slice(11, 23)
          const level = log.level.toUpperCase().padEnd(5)
          console.log(`[${ts}] ${level} ${log.message}`)
          if (log.data && Object.keys(log.data).length > 0) {
            console.log(
              `         ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n         ')}`,
            )
          }
        }
      }

      console.log(`\nView detailed logs: pnpm engine discovery-run --run-id ${result.runId}`)
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Weaves command - list discovered weaves
program
  .command('weaves')
  .description('List discovered weaves for a plexus')
  .requiredOption('--plexus-id <id>', 'Plexus ID')
  .action(async (options) => {
    try {
      const weaves = await listWeaves(options.plexusId)

      if (weaves.length === 0) {
        console.log('No weaves found. Run "find-weaves" to discover connections.')
        return
      }

      console.log(`\nWeaves (${weaves.length}):`)
      console.log('==========')
      for (const weave of weaves) {
        const score = (weave.score * 100).toFixed(0)
        console.log(`\n[${weave.type}] ${weave.title} (${score}% confidence)`)
        console.log(`  ${weave.sourceRepo.fullName} <-> ${weave.targetRepo.fullName}`)
        console.log(
          `  ${weave.description.slice(0, 120)}${weave.description.length > 120 ? '...' : ''}`,
        )
        console.log(`  ID: ${weave.id}`)
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Plexuses command - list plexuses
program
  .command('plexuses')
  .description('List available plexuses')
  .action(async () => {
    try {
      const plexuses = await db.plexus.findMany({
        include: {
          _count: { select: { repos: true, weaves: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (plexuses.length === 0) {
        console.log('No plexuses found')
        return
      }

      console.log('\nPlexuses:')
      console.log('=========')
      for (const plexus of plexuses) {
        console.log(
          `${plexus.id} - ${plexus.name} (${plexus.slug}) - ${plexus._count.repos} repos, ${plexus._count.weaves} weaves`,
        )
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Discovery runs command - list discovery runs
program
  .command('discovery-runs')
  .description('List weave discovery runs for a plexus')
  .requiredOption('--plexus-id <id>', 'Plexus ID')
  .option('--limit <n>', 'Number of runs to show', parseInt, 20)
  .action(async (options) => {
    try {
      const runs = await listDiscoveryRuns(options.plexusId, options.limit)

      if (runs.length === 0) {
        console.log('No discovery runs found')
        return
      }

      console.log(`\nDiscovery Runs (${runs.length}):`)
      console.log('================')
      for (const run of runs) {
        const duration = run.completedAt
          ? `${((run.completedAt.getTime() - run.startedAt.getTime()) / 1000).toFixed(1)}s`
          : 'running'
        console.log(`\n[${run.status.padEnd(9)}] ${run.id}`)
        console.log(`  Started: ${run.startedAt.toISOString()}`)
        console.log(`  Duration: ${duration}`)
        console.log(`  Pairs: ${run.repoPairsChecked}/${run.repoPairsTotal}`)
        console.log(
          `  Candidates: ${run.candidatesFound}, Saved: ${run.weavesSaved}, Skipped: ${run.weavesSkipped}`,
        )
        if (run.error) {
          console.log(`  Error: ${run.error}`)
        }
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

// Discovery run command - view a specific run with logs
program
  .command('discovery-run')
  .description('View a specific discovery run with detailed logs')
  .requiredOption('--run-id <id>', 'Discovery run ID')
  .action(async (options) => {
    try {
      const run = await getDiscoveryRun(options.runId)

      if (!run) {
        console.error(`Discovery run not found: ${options.runId}`)
        process.exit(1)
      }

      const duration = run.completedAt
        ? `${((run.completedAt.getTime() - run.startedAt.getTime()) / 1000).toFixed(1)}s`
        : 'running'

      console.log('\nDiscovery Run Details:')
      console.log('======================')
      console.log(`ID:         ${run.id}`)
      console.log(`Plexus:     ${run.plexus.name} (${run.plexus.slug})`)
      console.log(`Status:     ${run.status}`)
      console.log(`Started:    ${run.startedAt.toISOString()}`)
      if (run.completedAt) {
        console.log(`Completed:  ${run.completedAt.toISOString()}`)
      }
      console.log(`Duration:   ${duration}`)
      console.log(`Pairs:      ${run.repoPairsChecked}/${run.repoPairsTotal}`)
      console.log(`Candidates: ${run.candidatesFound}`)
      console.log(`Saved:      ${run.weavesSaved}`)
      console.log(`Skipped:    ${run.weavesSkipped}`)

      if (run.config) {
        console.log('\nConfiguration:')
        console.log(JSON.stringify(run.config, null, 2))
      }

      if (run.error) {
        console.log(`\nError: ${run.error}`)
      }

      if (run.logs && Array.isArray(run.logs)) {
        console.log('\n--- Logs ---')
        interface LogEntry {
          timestamp: string
          level: string
          message: string
          data?: Record<string, unknown>
        }
        for (const log of run.logs as unknown as LogEntry[]) {
          const ts = new Date(log.timestamp).toISOString().slice(11, 23)
          const level = log.level.toUpperCase().padEnd(5)
          console.log(`[${ts}] ${level} ${log.message}`)
          if (log.data && Object.keys(log.data).length > 0) {
            console.log(
              `         ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n         ')}`,
            )
          }
        }
      }
    } catch (error: unknown) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
      process.exit(1)
    }
  })

program.parse()
