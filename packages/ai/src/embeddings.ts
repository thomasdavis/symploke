import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

// text-embedding-3-large has 3072 dimensions
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = openai.embedding('text-embedding-3-large')
  const { embeddings } = await embedMany({
    model,
    values: texts,
  })
  return embeddings
}
