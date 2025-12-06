import { db, type ChunkSyncJob, ChunkJobStatus } from '@symploke/db'
import { logger } from '@symploke/logger'
import { generateEmbeddings } from '@symploke/ai/embeddings'
import {
  chunkContent,
  estimateTokenCount,
  DEFAULT_CHUNK_CONFIG,
  type ChunkConfig,
} from './chunker.js'
import type { PusherService } from '../pusher/service.js'
import { notifyEmbedCompleted } from '../discord/service.js'

export interface EmbedProgressEvent {
  jobId: string
  repoId: string
  status: ChunkJobStatus
  processedFiles: number
  totalFiles: number
  chunksCreated: number
  embeddingsGenerated: number
  currentFile?: string
  error?: string
}

/**
 * Main chunk/embed orchestration for a repository
 */
export async function embedRepo(job: ChunkSyncJob, pusher?: PusherService): Promise<void> {
  const startTime = Date.now()
  const config: ChunkConfig = {
    ...DEFAULT_CHUNK_CONFIG,
    ...(job.config as Partial<ChunkConfig>),
  }

  logger.info({ jobId: job.id, repoId: job.repoId, config }, 'Starting chunk sync')

  // Get repo
  const repo = await db.repo.findUnique({
    where: { id: job.repoId },
    include: { plexus: true },
  })

  if (!repo) {
    throw new Error(`Repo not found: ${job.repoId}`)
  }

  // Helper to emit embed progress
  const emitProgress = (event: Partial<EmbedProgressEvent>) => {
    pusher?.emitEmbedProgress(repo.plexusId, {
      jobId: job.id,
      repoId: repo.id,
      status: job.status,
      processedFiles: 0,
      totalFiles: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      ...event,
    })
  }

  // Update status to CHUNKING
  await db.chunkSyncJob.update({
    where: { id: job.id },
    data: {
      status: ChunkJobStatus.CHUNKING,
      startedAt: new Date(),
    },
  })

  emitProgress({ status: ChunkJobStatus.CHUNKING })

  // Get all files with content (skip binary/skipped files)
  const files = await db.file.findMany({
    where: {
      repoId: job.repoId,
      content: { not: null },
      skippedReason: null,
    },
    select: { id: true, path: true, content: true, sha: true, lastChunkedSha: true },
  })

  logger.info({ jobId: job.id, fileCount: files.length }, 'Found files with content')

  await db.chunkSyncJob.update({
    where: { id: job.id },
    data: { totalFiles: files.length },
  })

  emitProgress({
    status: ChunkJobStatus.CHUNKING,
    totalFiles: files.length,
  })

  let processedFiles = 0
  let chunksCreated = 0
  let failedFiles = 0
  let skippedFiles = 0

  // Phase 1: Create chunks for all files
  for (const file of files) {
    try {
      // Skip empty files
      if (!file.content) {
        processedFiles++
        continue
      }

      // Skip files that haven't changed since last chunking
      if (file.lastChunkedSha && file.lastChunkedSha === file.sha) {
        logger.debug({ path: file.path, sha: file.sha }, 'File unchanged, skipping re-chunking')
        skippedFiles++
        processedFiles++
        continue
      }

      // Delete existing chunks for this file (only if we're re-chunking)
      await db.chunk.deleteMany({ where: { fileId: file.id } })

      // Create new chunks
      const chunks = chunkContent(file.content, config)

      // Insert chunks one by one (createMany not available due to Unsupported vector type)
      for (const chunk of chunks) {
        await db.$executeRaw`
          INSERT INTO chunks (id, "fileId", content, "startChar", "endChar", "chunkIndex", "tokenCount", "createdAt")
          VALUES (
            gen_random_uuid()::text,
            ${file.id},
            ${chunk.content},
            ${chunk.startChar},
            ${chunk.endChar},
            ${chunk.chunkIndex},
            ${estimateTokenCount(chunk.content)},
            NOW()
          )
        `
        chunksCreated++
      }

      // Update lastChunkedSha to mark this file as chunked with this SHA
      await db.file.update({
        where: { id: file.id },
        data: { lastChunkedSha: file.sha },
      })

      processedFiles++

      // Update progress periodically
      if (processedFiles % 10 === 0 || processedFiles === files.length) {
        await db.chunkSyncJob.update({
          where: { id: job.id },
          data: { processedFiles, chunksCreated },
        })

        emitProgress({
          status: ChunkJobStatus.CHUNKING,
          processedFiles,
          totalFiles: files.length,
          chunksCreated,
          currentFile: file.path,
        })
      }
    } catch (error) {
      logger.error({ error, fileId: file.id, path: file.path }, 'Error chunking file')
      failedFiles++
      processedFiles++
    }
  }

  logger.info(
    { jobId: job.id, chunksCreated, processedFiles, failedFiles, skippedFiles },
    'Chunking phase complete',
  )

  // Phase 2: Generate embeddings
  await db.chunkSyncJob.update({
    where: { id: job.id },
    data: { status: ChunkJobStatus.EMBEDDING },
  })

  emitProgress({
    status: ChunkJobStatus.EMBEDDING,
    processedFiles: files.length,
    totalFiles: files.length,
    chunksCreated,
  })

  // Get all chunks without embeddings for this repo
  const chunksToEmbed = await db.chunk.findMany({
    where: {
      file: { repoId: job.repoId },
      embeddedAt: null,
    },
    select: { id: true, content: true },
  })

  logger.info({ jobId: job.id, chunksToEmbed: chunksToEmbed.length }, 'Starting embedding phase')

  let embeddingsGenerated = 0
  const BATCH_SIZE = 50
  const DELAY_MS = 100

  for (let i = 0; i < chunksToEmbed.length; i += BATCH_SIZE) {
    const batch = chunksToEmbed.slice(i, i + BATCH_SIZE)

    try {
      const embeddings = await generateEmbeddings(batch.map((c) => c.content))

      // Update chunks with embeddings using raw SQL (vector type requires it)
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]
        const embedding = embeddings[j]

        if (!chunk || !embedding) continue

        // Convert embedding array to PostgreSQL vector format
        const vectorStr = `[${embedding.join(',')}]`

        await db.$executeRaw`
          UPDATE chunks
          SET embedding = ${vectorStr}::vector,
              "embeddedAt" = NOW()
          WHERE id = ${chunk.id}
        `
        embeddingsGenerated++
      }

      // Update progress
      await db.chunkSyncJob.update({
        where: { id: job.id },
        data: { embeddingsGenerated },
      })

      emitProgress({
        status: ChunkJobStatus.EMBEDDING,
        processedFiles: files.length,
        totalFiles: files.length,
        chunksCreated,
        embeddingsGenerated,
      })

      logger.debug(
        { jobId: job.id, batch: i / BATCH_SIZE + 1, embeddingsGenerated },
        'Embedding batch complete',
      )
    } catch (error) {
      logger.error({ error, batchIndex: i }, 'Error generating embeddings batch')
      // Continue with next batch rather than failing entire job
    }

    // Rate limiting delay between batches
    if (i + BATCH_SIZE < chunksToEmbed.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }
  }

  // Mark job as completed
  await db.chunkSyncJob.update({
    where: { id: job.id },
    data: {
      status: ChunkJobStatus.COMPLETED,
      processedFiles,
      chunksCreated,
      embeddingsGenerated,
      failedFiles,
      completedAt: new Date(),
    },
  })

  const duration = Date.now() - startTime

  logger.info(
    {
      jobId: job.id,
      repoId: repo.id,
      processedFiles,
      chunksCreated,
      embeddingsGenerated,
      failedFiles,
      duration,
    },
    'Chunk sync completed',
  )

  emitProgress({
    status: ChunkJobStatus.COMPLETED,
    processedFiles,
    totalFiles: files.length,
    chunksCreated,
    embeddingsGenerated,
  })

  // Send Discord notification
  await notifyEmbedCompleted({
    repoName: repo.name,
    repoFullName: repo.fullName,
    plexusName: repo.plexus.name,
    totalFiles: files.length,
    chunksCreated,
    embeddingsGenerated,
    duration,
    jobId: job.id,
  })
}

/**
 * Mark a chunk job as failed
 */
export async function failChunkJob(
  jobId: string,
  error: string,
  pusher?: PusherService,
): Promise<void> {
  const job = await db.chunkSyncJob.update({
    where: { id: jobId },
    data: {
      status: ChunkJobStatus.FAILED,
      error,
      completedAt: new Date(),
    },
    include: { repo: true },
  })

  pusher?.emitEmbedProgress(job.repo.plexusId, {
    jobId: job.id,
    repoId: job.repoId,
    status: ChunkJobStatus.FAILED,
    processedFiles: job.processedFiles,
    totalFiles: job.totalFiles || 0,
    chunksCreated: job.chunksCreated,
    embeddingsGenerated: job.embeddingsGenerated,
    error,
  })
}
