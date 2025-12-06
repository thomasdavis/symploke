import { assessIntegrationOpportunity, type FilePairSummary } from '@symploke/ai/completion'
import { db, WeaveType as PrismaWeaveType } from '@symploke/db'
import { logger } from '@symploke/logger'
import { findSimilarChunks } from '../similarity.js'
import type {
  FilePairMatch,
  SimilarityResult,
  WeaveCandidate,
  WeaveOptions,
  WeaveTypeHandler,
} from './base.js'

/**
 * Integration Opportunity Weave Type
 *
 * Discovers meaningful connections between repositories where one repo's
 * capabilities could integrate with another's needs.
 *
 * Three-stage pipeline:
 * 1. Vector Search - Find similar chunks using pgvector
 * 2. File Aggregation - Group by file pairs, filter noise
 * 3. LLM Assessment - Validate real integration opportunities
 */
export const IntegrationOpportunityWeave: WeaveTypeHandler = {
  id: PrismaWeaveType.integration_opportunity,
  name: 'Integration Opportunity',
  description: 'Discovers where one repository has capabilities that could integrate with another',

  async findWeaves(
    plexusId: string,
    sourceRepoId: string,
    targetRepoId: string,
    options: WeaveOptions = {},
  ): Promise<WeaveCandidate[]> {
    const opts = {
      similarityThreshold: options.similarityThreshold ?? 0.85,
      maxChunkPairs: options.maxChunkPairs ?? 200,
      minMatchingChunks: options.minMatchingChunks ?? 3,
      minFilePairSimilarity: options.minFilePairSimilarity ?? 0.83,
      maxFilePairsToLLM: options.maxFilePairsToLLM ?? 7,
      llmScoreThreshold: options.llmScoreThreshold ?? 0.75,
    }

    logger.info({ plexusId, sourceRepoId, targetRepoId, opts }, 'Finding integration opportunities')

    // Get repo info for LLM context
    const [sourceRepo, targetRepo] = await Promise.all([
      db.repo.findUnique({ where: { id: sourceRepoId } }),
      db.repo.findUnique({ where: { id: targetRepoId } }),
    ])

    if (!sourceRepo || !targetRepo) {
      logger.warn({ sourceRepoId, targetRepoId }, 'One or both repos not found')
      return []
    }

    // Stage 1: Vector Search
    const similarChunks = await findSimilarChunks(
      sourceRepoId,
      targetRepoId,
      opts.similarityThreshold,
      opts.maxChunkPairs,
    )

    if (similarChunks.length === 0) {
      logger.debug({ sourceRepoId, targetRepoId }, 'No similar chunks found above threshold')
      return []
    }

    // Stage 2: File Aggregation
    const filePairs = aggregateByFilePairs(similarChunks)

    // Filter by minimum matching chunks
    const filteredPairs = filePairs.filter(
      (pair) =>
        pair.chunkCount >= opts.minMatchingChunks &&
        pair.avgSimilarity >= opts.minFilePairSimilarity,
    )

    if (filteredPairs.length === 0) {
      logger.debug({ sourceRepoId, targetRepoId }, 'No file pairs met minimum criteria')
      return []
    }

    // Sort by average similarity and take top N
    const topPairs = filteredPairs
      .sort((a, b) => b.avgSimilarity - a.avgSimilarity)
      .slice(0, opts.maxFilePairsToLLM)

    logger.info(
      {
        sourceRepoId,
        targetRepoId,
        totalChunks: similarChunks.length,
        totalFilePairs: filePairs.length,
        filteredPairs: filteredPairs.length,
        topPairs: topPairs.length,
      },
      'File pair aggregation complete',
    )

    // Stage 3: LLM Assessment
    const filePairSummaries: FilePairSummary[] = topPairs.map((pair) => ({
      sourceFile: pair.sourceFile,
      targetFile: pair.targetFile,
      avgSimilarity: pair.avgSimilarity,
      sampleMatches: pair.matches.slice(0, 3).map((m) => ({
        sourceSnippet: m.sourceContent,
        targetSnippet: m.targetContent,
        similarity: m.similarity,
      })),
    }))

    try {
      const assessment = await assessIntegrationOpportunity(
        { name: sourceRepo.name, fullName: sourceRepo.fullName },
        { name: targetRepo.name, fullName: targetRepo.fullName },
        filePairSummaries,
      )

      logger.info(
        {
          sourceRepoId,
          targetRepoId,
          shouldWeave: assessment.shouldWeave,
          score: assessment.score,
          reasoning: assessment.reasoning,
        },
        'LLM assessment complete',
      )

      // Check if we should create a weave
      if (!assessment.shouldWeave || assessment.score < opts.llmScoreThreshold) {
        logger.debug(
          { sourceRepoId, targetRepoId, assessment },
          'LLM rejected integration opportunity',
        )
        return []
      }

      // Create the weave candidate
      const candidate: WeaveCandidate = {
        sourceRepoId,
        targetRepoId,
        type: PrismaWeaveType.integration_opportunity,
        score: assessment.score,
        title: assessment.title || 'Integration Opportunity',
        description:
          assessment.description ||
          `Potential integration between ${sourceRepo.name} and ${targetRepo.name}`,
        filePairs: topPairs,
      }

      return [candidate]
    } catch (error) {
      logger.error({ error, sourceRepoId, targetRepoId }, 'Error during LLM assessment')
      return []
    }
  },
}

/**
 * Group similarity results by (sourceFile, targetFile) pairs
 */
function aggregateByFilePairs(results: SimilarityResult[]): FilePairMatch[] {
  const pairMap = new Map<string, FilePairMatch>()

  for (const result of results) {
    const key = `${result.source_path}:${result.target_path}`

    if (!pairMap.has(key)) {
      pairMap.set(key, {
        sourceFile: result.source_path,
        targetFile: result.target_path,
        avgSimilarity: 0,
        maxSimilarity: 0,
        chunkCount: 0,
        matches: [],
      })
    }

    const pair = pairMap.get(key)!
    pair.matches.push({
      sourceChunkId: result.source_chunk_id,
      targetChunkId: result.target_chunk_id,
      sourceContent: result.source_content,
      targetContent: result.target_content,
      similarity: result.similarity,
    })

    pair.maxSimilarity = Math.max(pair.maxSimilarity, result.similarity)
    pair.chunkCount = pair.matches.length
  }

  // Calculate average similarity for each pair
  for (const pair of pairMap.values()) {
    const totalSimilarity = pair.matches.reduce((sum, m) => sum + m.similarity, 0)
    pair.avgSimilarity = totalSimilarity / pair.matches.length
  }

  return Array.from(pairMap.values())
}
