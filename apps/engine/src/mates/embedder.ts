import { db } from '@symploke/db'
import { generateEmbeddings } from '@symploke/ai/embeddings'
import { logger } from '@symploke/logger'

/**
 * Embed all facets for a MatesProfile and store as MatesChunk records
 */
export async function embedProfileFacets(
  profileId: string,
  onProgress?: (step: string) => void,
): Promise<number> {
  const profile = await db.matesProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { id: true, username: true, facets: true },
  })

  const facets = profile.facets as Array<{ title: string; content: string }> | null
  if (!facets || facets.length === 0) {
    logger.warn({ profileId }, 'No facets to embed')
    return 0
  }

  // Delete existing chunks for this profile (re-embedding)
  await db.matesChunk.deleteMany({ where: { profileId } })

  onProgress?.(`Embedding ${facets.length} facets...`)
  logger.info(
    { profileId, username: profile.username, facetCount: facets.length },
    'Embedding facets',
  )

  // Prepare texts for embedding: combine title + content for richer representation
  const texts = facets.map((f) => `${f.title}: ${f.content}`)
  const embeddings = await generateEmbeddings(texts)

  // Store each facet as a MatesChunk with its embedding
  for (let i = 0; i < facets.length; i++) {
    const facet = facets[i]!
    const embedding = embeddings[i]!

    // Format embedding as pgvector string
    const vectorStr = `[${embedding.join(',')}]`

    await db.$executeRaw`
      INSERT INTO "mates_chunks" (id, "profileId", "facetTitle", content, embedding, "createdAt")
      VALUES (
        ${`mc_${profileId}_${i}`},
        ${profileId},
        ${facet.title},
        ${facet.content},
        ${vectorStr}::vector,
        NOW()
      )
    `
  }

  onProgress?.('Facets embedded')
  logger.info({ profileId, chunksCreated: facets.length }, 'Facets embedded successfully')

  return facets.length
}
