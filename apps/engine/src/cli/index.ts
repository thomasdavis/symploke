#!/usr/bin/env node
import 'dotenv/config'
import { Command } from 'commander'
import { db, SyncJobStatus } from '@symploke/db'
import { createSyncJob, getJobStatus, listJobs, getQueueProcessor } from '../queue/processor.js'
import { syncRepo, failJob } from '../sync/repo-sync.js'
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

program.parse()
