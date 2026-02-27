import { db } from '@symploke/db'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { logger } from '@symploke/logger'

interface ChunkSimilarity {
  source_chunk_id: string
  source_facet_title: string
  source_content: string
  target_chunk_id: string
  target_profile_id: string
  target_username: string
  target_facet_title: string
  target_content: string
  similarity: number
}

interface UserMatch {
  targetProfileId: string
  targetUsername: string
  similarityScore: number
  topChunkPairs: Array<{
    sourceChunkId: string
    targetChunkId: string
    similarity: number
    sourceFacet: string
    targetFacet: string
  }>
}

/**
 * Find matches for a given profile by querying pgvector for similar chunks
 * from other users' profiles
 */
export async function findMatesMatches(
  profileId: string,
  onProgress?: (step: string) => void,
): Promise<number> {
  const profile = await db.matesProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { id: true, username: true },
  })

  onProgress?.('Finding similar developers...')
  logger.info({ profileId, username: profile.username }, 'Finding mates matches')

  // Find similar chunks from OTHER users via pgvector cosine distance
  const similarities = await db.$queryRaw<ChunkSimilarity[]>`
    SELECT
      sc.id as source_chunk_id,
      sc."facetTitle" as source_facet_title,
      sc.content as source_content,
      tc.id as target_chunk_id,
      tc."profileId" as target_profile_id,
      tp.username as target_username,
      tc."facetTitle" as target_facet_title,
      tc.content as target_content,
      1 - (sc.embedding <=> tc.embedding) as similarity
    FROM "mates_chunks" sc
    CROSS JOIN LATERAL (
      SELECT c.id, c."profileId", c."facetTitle", c.content, c.embedding
      FROM "mates_chunks" c
      WHERE c."profileId" != ${profileId}
      ORDER BY c.embedding <=> sc.embedding
      LIMIT 10
    ) tc
    JOIN "mates_profiles" tp ON tc."profileId" = tp.id
    WHERE sc."profileId" = ${profileId}
      AND tp.status = 'READY'
    ORDER BY similarity DESC
  `

  if (similarities.length === 0) {
    logger.info({ profileId }, 'No similar chunks found — no other profiles yet')
    return 0
  }

  // Aggregate chunk-level similarities to user-level match scores
  const userScores = new Map<string, UserMatch>()

  for (const sim of similarities) {
    let match = userScores.get(sim.target_profile_id)
    if (!match) {
      match = {
        targetProfileId: sim.target_profile_id,
        targetUsername: sim.target_username,
        similarityScore: 0,
        topChunkPairs: [],
      }
      userScores.set(sim.target_profile_id, match)
    }

    match.topChunkPairs.push({
      sourceChunkId: sim.source_chunk_id,
      targetChunkId: sim.target_chunk_id,
      similarity: sim.similarity,
      sourceFacet: sim.source_facet_title,
      targetFacet: sim.target_facet_title,
    })
  }

  // Calculate aggregate score: average of top chunk pair similarities per user
  for (const match of userScores.values()) {
    match.topChunkPairs.sort((a, b) => b.similarity - a.similarity)
    match.topChunkPairs = match.topChunkPairs.slice(0, 5) // Keep top 5 pairs
    match.similarityScore =
      match.topChunkPairs.reduce((sum, p) => sum + p.similarity, 0) / match.topChunkPairs.length
  }

  // Sort by score and take top 20
  const topMatches = [...userScores.values()]
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 20)

  // Delete old matches for this profile
  await db.matesMatch.deleteMany({ where: { sourceProfileId: profileId } })

  // Store matches
  for (const match of topMatches) {
    await db.matesMatch.create({
      data: {
        sourceProfileId: profileId,
        targetProfileId: match.targetProfileId,
        similarityScore: match.similarityScore,
        topChunkPairs: match.topChunkPairs,
      },
    })
  }

  // Generate teasers for top matches
  onProgress?.(`Generating match insights for ${topMatches.length} mates...`)
  await generateTeasers(profileId, profile.username, topMatches)

  logger.info({ profileId, matchCount: topMatches.length }, 'Mates matching complete')

  return topMatches.length
}

/**
 * Generate 2-sentence teasers for match cards
 */
async function generateTeasers(
  sourceProfileId: string,
  sourceUsername: string,
  matches: UserMatch[],
): Promise<void> {
  // Process in small batches to avoid rate limits
  for (const match of matches) {
    try {
      const facetOverlap = match.topChunkPairs
        .map(
          (p) =>
            `${sourceUsername}'s "${p.sourceFacet}" matches ${match.targetUsername}'s "${p.targetFacet}" (${(p.similarity * 100).toFixed(0)}% similar)`,
        )
        .join('\n')

      const { text: teaser } = await generateText({
        model: openai('gpt-4o-mini'),
        system: `Write exactly 2 sentences explaining the technical overlap between ${sourceUsername} and ${match.targetUsername}. Reference specific languages, tools, or problem domains from their profiles. Be direct — no buzzwords or filler.`,
        prompt: `Facet similarities:\n${facetOverlap}`,
      })

      await db.matesMatch.update({
        where: {
          sourceProfileId_targetProfileId: {
            sourceProfileId,
            targetProfileId: match.targetProfileId,
          },
        },
        data: { teaser },
      })
    } catch (error) {
      logger.warn(
        { error, sourceProfileId, targetProfileId: match.targetProfileId },
        'Failed to generate teaser',
      )
    }
  }
}

/**
 * Generate a full narrative comparison between two users (on-demand, cached)
 */
export async function generateMatchNarrative(
  sourceProfileId: string,
  targetProfileId: string,
): Promise<string> {
  // Check cache first
  const existing = await db.matesMatch.findUnique({
    where: {
      sourceProfileId_targetProfileId: { sourceProfileId, targetProfileId },
    },
    select: { narrative: true },
  })

  if (existing?.narrative) {
    return existing.narrative
  }

  // Fetch both profiles
  const [source, target] = await Promise.all([
    db.matesProfile.findUniqueOrThrow({
      where: { id: sourceProfileId },
      select: { username: true, profileText: true, facets: true },
    }),
    db.matesProfile.findUniqueOrThrow({
      where: { id: targetProfileId },
      select: { username: true, profileText: true, facets: true },
    }),
  ])

  const sourceFacets = (source.facets as Array<{ title: string; content: string }>) ?? []
  const targetFacets = (target.facets as Array<{ title: string; content: string }>) ?? []

  const { text: narrative } = await generateText({
    model: openai('gpt-4o-mini'),
    system: `You are a senior engineer writing a technical comparison of two developers based on their GitHub activity. Be direct and specific — reference actual repos, languages, tools, and architectural patterns. No fluff, no "visionary" language, no startup buzzwords. Write 3-4 short paragraphs:

1. What technical overlap exists — shared languages, frameworks, problem domains, or engineering approaches.
2. Where they diverge — different stacks, focus areas, or levels of the stack they operate at.
3. Concrete ways they could collaborate or learn from each other's codebases.

Write like you're explaining to another engineer why these two would have good technical conversations. Stay grounded in what their code actually shows.`,
    prompt: `Developer 1: ${source.username}
Profile: ${source.profileText}
Facets:
${sourceFacets.map((f) => `- ${f.title}: ${f.content}`).join('\n')}

Developer 2: ${target.username}
Profile: ${target.profileText}
Facets:
${targetFacets.map((f) => `- ${f.title}: ${f.content}`).join('\n')}`,
  })

  // Cache the narrative permanently
  await db.matesMatch.update({
    where: {
      sourceProfileId_targetProfileId: { sourceProfileId, targetProfileId },
    },
    data: { narrative },
  })

  return narrative
}
