import { db } from '@symploke/db'
import { logger } from '@symploke/logger'
import type { SimilarityResult } from './types/base.js'

/**
 * Find similar chunks between two repositories using pgvector cosine distance
 */
export async function findSimilarChunks(
  sourceRepoId: string,
  targetRepoId: string,
  threshold: number = 0.85,
  maxPairs: number = 200,
): Promise<SimilarityResult[]> {
  logger.debug(
    { sourceRepoId, targetRepoId, threshold, maxPairs },
    'Finding similar chunks between repos',
  )

  // Use LATERAL join for efficient top-k nearest neighbor search per source chunk
  // This is more efficient than a full cross-join for finding similar pairs
  const results = await db.$queryRaw<SimilarityResult[]>`
    WITH source_chunks AS (
      SELECT c.id, c.embedding, c.content, f.path, f.id as file_id
      FROM chunks c
      JOIN files f ON c."fileId" = f.id
      WHERE f."repoId" = ${sourceRepoId}
        AND c.embedding IS NOT NULL
    )
    SELECT
      sc.id as source_chunk_id,
      sc.path as source_path,
      sc.content as source_content,
      tc.id as target_chunk_id,
      tf.path as target_path,
      tc.content as target_content,
      1 - (sc.embedding <=> tc.embedding) as similarity
    FROM source_chunks sc
    CROSS JOIN LATERAL (
      SELECT c.id, c.content, c.embedding, c."fileId"
      FROM chunks c
      JOIN files f ON c."fileId" = f.id
      WHERE f."repoId" = ${targetRepoId}
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> sc.embedding
      LIMIT 5
    ) tc
    JOIN files tf ON tc."fileId" = tf.id
    WHERE 1 - (sc.embedding <=> tc.embedding) > ${threshold}
    ORDER BY similarity DESC
    LIMIT ${maxPairs}
  `

  logger.info(
    { sourceRepoId, targetRepoId, matchCount: results.length },
    'Found similar chunk pairs',
  )

  return results
}

/**
 * Find top N most similar chunks between two repos (no threshold filtering)
 * Used for logging near-miss candidates
 */
export async function findTopSimilarChunks(
  sourceRepoId: string,
  targetRepoId: string,
  limit: number = 10,
): Promise<SimilarityResult[]> {
  const results = await db.$queryRaw<SimilarityResult[]>`
    WITH source_chunks AS (
      SELECT c.id, c.embedding, c.content, f.path, f.id as file_id
      FROM chunks c
      JOIN files f ON c."fileId" = f.id
      WHERE f."repoId" = ${sourceRepoId}
        AND c.embedding IS NOT NULL
    )
    SELECT
      sc.id as source_chunk_id,
      sc.path as source_path,
      sc.content as source_content,
      tc.id as target_chunk_id,
      tf.path as target_path,
      tc.content as target_content,
      1 - (sc.embedding <=> tc.embedding) as similarity
    FROM source_chunks sc
    CROSS JOIN LATERAL (
      SELECT c.id, c.content, c.embedding, c."fileId"
      FROM chunks c
      JOIN files f ON c."fileId" = f.id
      WHERE f."repoId" = ${targetRepoId}
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> sc.embedding
      LIMIT 1
    ) tc
    JOIN files tf ON tc."fileId" = tf.id
    ORDER BY similarity DESC
    LIMIT ${limit}
  `

  return results
}

/**
 * Get chunk counts per repo for a plexus
 */
export async function getRepoChunkCounts(plexusId: string): Promise<Map<string, number>> {
  const results = await db.$queryRaw<Array<{ repoId: string; count: bigint }>>`
    SELECT f."repoId" as "repoId", COUNT(c.id) as count
    FROM chunks c
    JOIN files f ON c."fileId" = f.id
    JOIN repos r ON f."repoId" = r.id
    WHERE r."plexusId" = ${plexusId}
      AND c.embedding IS NOT NULL
    GROUP BY f."repoId"
  `

  const map = new Map<string, number>()
  for (const row of results) {
    map.set(row.repoId, Number(row.count))
  }
  return map
}
