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
    select: { id: true, fullName: true },
  })

  // Fetch all glossaries
  const glossaries = await db.repoGlossary.findMany({
    where: {
      repo: { plexusId: id },
    },
    include: {
      repo: { select: { id: true, fullName: true } },
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

  return (
    <WeaveLogs plexusId={id} runs={runs} repos={repos} glossaries={glossaries} weaves={weaves} />
  )
}
