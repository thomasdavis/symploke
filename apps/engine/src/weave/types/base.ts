import type { WeaveType as PrismaWeaveType } from '@symploke/db'

/**
 * WeaveType interface - each weave type implements this
 */
export interface WeaveTypeHandler {
  id: PrismaWeaveType
  name: string
  description: string

  findWeaves(
    plexusId: string,
    sourceRepoId: string,
    targetRepoId: string,
    options?: WeaveOptions,
  ): Promise<WeaveCandidate[]>
}

/**
 * Options for weave discovery
 */
export interface WeaveOptions {
  similarityThreshold?: number // Default: 0.85
  maxChunkPairs?: number // Default: 200
  minMatchingChunks?: number // Default: 3
  minFilePairSimilarity?: number // Default: 0.83
  maxFilePairsToLLM?: number // Default: 7
  llmScoreThreshold?: number // Default: 0.75
}

export const DEFAULT_WEAVE_OPTIONS: Required<WeaveOptions> = {
  similarityThreshold: 0.85,
  maxChunkPairs: 200,
  minMatchingChunks: 3,
  minFilePairSimilarity: 0.83,
  maxFilePairsToLLM: 7,
  llmScoreThreshold: 0.75,
}

/**
 * A candidate weave discovered by a weave type handler
 */
export interface WeaveCandidate {
  sourceRepoId: string
  targetRepoId: string
  type: PrismaWeaveType
  score: number // 0.0 - 1.0
  title: string
  description: string
  filePairs: FilePairMatch[]
  metadata?: Record<string, unknown> // Additional type-specific metadata
}

/**
 * Metadata specific to glossary_alignment weaves
 */
export interface GlossaryAlignmentMetadata {
  // AI-generated narrative comparison
  narrative: string // 2-3 sentences explaining actionable relationship
  overallScore: number // 0-1 integration potential

  // Relationship classification
  relationshipType:
    | 'supply_demand'
    | 'pipeline'
    | 'shared_domain'
    | 'complementary_tools'
    | 'philosophical_alignment'
    | 'competing'
    | 'unrelated'

  // Actionable insights
  integrationOpportunities: string[] // Specific integration ideas
  supplyDemandMatches: string[] // "A provides X, B needs X"
  pipelineConnections: string[] // "A outputs Y, B consumes Y"
  sharedChallenges: string[] // Problems both face
  tensions: string[] // Technical/philosophical conflicts

  // Source info
  sourceGlossaryId: string
  targetGlossaryId: string

  // Comparison inputs (for debugging)
  sourceSummary: string
  targetSummary: string
}

/**
 * A pair of files that have similar code
 */
export interface FilePairMatch {
  sourceFile: string
  targetFile: string
  avgSimilarity: number
  maxSimilarity: number
  chunkCount: number
  matches: ChunkMatch[]
}

/**
 * A pair of similar chunks
 */
export interface ChunkMatch {
  sourceChunkId: string
  targetChunkId: string
  sourceContent: string
  targetContent: string
  similarity: number
}

/**
 * Raw result from similarity query
 */
export interface SimilarityResult {
  source_chunk_id: string
  source_path: string
  source_content: string
  target_chunk_id: string
  target_path: string
  target_content: string
  similarity: number
}

/**
 * LLM assessment result
 */
export interface LLMAssessment {
  shouldWeave: boolean
  score: number // 0.0 - 1.0
  title: string | null
  description: string | null
  reasoning: string
}

/**
 * Summary of a file pair for LLM context
 */
export interface FilePairSummary {
  sourceFile: string
  targetFile: string
  avgSimilarity: number
  sampleMatches: Array<{
    sourceSnippet: string
    targetSnippet: string
    similarity: number
  }>
}
