import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = openai.embedding('text-embedding-3-small')
  const { embeddings } = await embedMany({
    model,
    values: texts,
  })
  return embeddings
}
