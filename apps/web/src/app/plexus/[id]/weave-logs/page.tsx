import { db } from '@symploke/db'
import { WeaveLogs } from './WeaveLogs'

export default async function WeaveLogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch only the latest discovery run
  const runs = await db.weaveDiscoveryRun.findMany({
    where: { plexusId: id },
    orderBy: { startedAt: 'desc' },
    take: 1,
  })

  // Fetch all repos in plexus for reference
  const repos = await db.repo.findMany({
    where: { plexusId: id },
    select: { id: true, fullName: true, name: true },
  })

  // Fetch all glossaries
  const glossaries = await db.repoGlossary.findMany({
    where: {
      repo: { plexusId: id },
    },
    include: {
      repo: { select: { id: true, fullName: true, name: true } },
    },
  })

  // Fetch weaves created
  const weaves = await db.weave.findMany({
    where: { plexusId: id },
    include: {
      sourceRepo: { select: { fullName: true } },
      targetRepo: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Find blocks and carmack specifically
  const blocksGlossary = glossaries.find((g) => g.repo.name === 'blocks')
  const carmackGlossary = glossaries.find((g) => g.repo.name === 'carmack')

  // Find weave between blocks and carmack
  const blocksRepo = repos.find((r) => r.name === 'blocks')
  const carmackRepo = repos.find((r) => r.name === 'carmack')

  const blocksCarmackWeave = weaves.find(
    (w) =>
      (w.sourceRepo.fullName.includes('blocks') && w.targetRepo.fullName.includes('carmack')) ||
      (w.sourceRepo.fullName.includes('carmack') && w.targetRepo.fullName.includes('blocks')),
  )

  return (
    <WeaveLogs
      plexusId={id}
      runs={runs}
      repos={repos}
      glossaries={glossaries}
      weaves={weaves}
      focusPair={{
        blocks: blocksGlossary || null,
        carmack: carmackGlossary || null,
        weave: blocksCarmackWeave || null,
        blocksRepoId: blocksRepo?.id || null,
        carmackRepoId: carmackRepo?.id || null,
      }}
    />
  )
}
