export interface ChunkConfig {
  chunkSize: number // Default: 1500 characters
  overlap: number // Default: 200 characters
}

export interface ChunkResult {
  content: string
  startChar: number
  endChar: number
  chunkIndex: number
}

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 1500,
  overlap: 200,
}

/**
 * Naive character-count based chunking
 * Splits content into overlapping chunks of specified size
 */
export function chunkContent(
  content: string,
  config: ChunkConfig = DEFAULT_CHUNK_CONFIG,
): ChunkResult[] {
  const chunks: ChunkResult[] = []
  let startChar = 0
  let chunkIndex = 0

  // Handle empty content
  if (!content || content.length === 0) {
    return []
  }

  // Handle content smaller than chunk size
  if (content.length <= config.chunkSize) {
    return [
      {
        content,
        startChar: 0,
        endChar: content.length,
        chunkIndex: 0,
      },
    ]
  }

  while (startChar < content.length) {
    const endChar = Math.min(startChar + config.chunkSize, content.length)
    const chunkContent = content.slice(startChar, endChar)

    chunks.push({
      content: chunkContent,
      startChar,
      endChar,
      chunkIndex,
    })

    // If we've reached the end, break
    if (endChar >= content.length) {
      break
    }

    // Move to next chunk position with overlap
    const nextStart = endChar - config.overlap

    // Prevent infinite loop if overlap >= chunkSize
    if (nextStart <= startChar) {
      break
    }

    startChar = nextStart
    chunkIndex++
  }

  return chunks
}

/**
 * Estimate token count for a text (rough approximation)
 * Uses ~4 characters per token as a heuristic
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}
