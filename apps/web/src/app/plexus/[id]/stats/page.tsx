import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { StatsClient, type RepoStats, type TypeStats, type StatsData } from './StatsClient'
import './stats.css'

type StatsPageProps = {
  params: Promise<{ id: string }>
}

type Weave = {
  id: string
  sourceRepoId: string
  targetRepoId: string
  type: string
  score: number
  discoveryRunId: string | null
}

type Repo = {
  id: string
  name: string
}

function computeStats(weaves: Weave[], repos: Repo[]): StatsData {
  // Initialize repo stats
  const repoStatsMap = new Map<string, RepoStats>()
  for (const repo of repos) {
    repoStatsMap.set(repo.id, {
      id: repo.id,
      name: repo.name,
      weaveCount: 0,
      avgScore: 0,
      byType: {},
    })
  }

  // Track scores per repo for averaging
  const repoScores: Record<string, number[]> = {}

  // Aggregate weave data
  for (const weave of weaves) {
    // Count for source repo
    const sourceStats = repoStatsMap.get(weave.sourceRepoId)
    if (sourceStats) {
      sourceStats.weaveCount++
      const sourceTypeStats = sourceStats.byType[weave.type] ?? { count: 0, avgScore: 0 }
      sourceTypeStats.count++
      sourceStats.byType[weave.type] = sourceTypeStats

      const sourceScores = repoScores[weave.sourceRepoId] ?? []
      sourceScores.push(weave.score)
      repoScores[weave.sourceRepoId] = sourceScores
    }

    // Count for target repo
    const targetStats = repoStatsMap.get(weave.targetRepoId)
    if (targetStats) {
      targetStats.weaveCount++
      const targetTypeStats = targetStats.byType[weave.type] ?? { count: 0, avgScore: 0 }
      targetTypeStats.count++
      targetStats.byType[weave.type] = targetTypeStats

      const targetScores = repoScores[weave.targetRepoId] ?? []
      targetScores.push(weave.score)
      repoScores[weave.targetRepoId] = targetScores
    }
  }

  // Calculate repo averages
  for (const [repoId, scores] of Object.entries(repoScores)) {
    const stats = repoStatsMap.get(repoId)
    if (stats && scores.length > 0) {
      stats.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  // Calculate type stats
  const typeStats: TypeStats = {}
  for (const weave of weaves) {
    const existing = typeStats[weave.type] ?? { count: 0, avgScore: 0 }
    existing.count++
    typeStats[weave.type] = existing
  }

  // Calculate avg scores per type
  for (const type of Object.keys(typeStats)) {
    const weavesOfType = weaves.filter((w) => w.type === type)
    const stats = typeStats[type]
    if (stats && weavesOfType.length > 0) {
      stats.avgScore = weavesOfType.reduce((sum, w) => sum + w.score, 0) / weavesOfType.length
    }
  }

  // Sort repos by weave count
  const repoStats = Array.from(repoStatsMap.values()).sort((a, b) => b.weaveCount - a.weaveCount)

  // Calculate overall stats
  const totalWeaves = weaves.length
  const avgScore =
    weaves.length > 0 ? weaves.reduce((sum, w) => sum + w.score, 0) / weaves.length : 0

  return {
    totalWeaves,
    avgScore,
    repoStats,
    typeStats,
  }
}

export default async function StatsPage({ params }: StatsPageProps) {
  const { id } = await params

  // Get the most recent completed run
  const lastRun = await db.weaveDiscoveryRun.findFirst({
    where: { plexusId: id, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' },
  })

  // Get all repos in the plexus
  const repos = await db.repo.findMany({
    where: { plexusId: id },
    select: { id: true, name: true },
  })

  // Get all weaves for this plexus
  const allWeaves = await db.weave.findMany({
    where: { plexusId: id },
    select: {
      id: true,
      sourceRepoId: true,
      targetRepoId: true,
      type: true,
      score: true,
      discoveryRunId: true,
    },
  })

  // Compute all-time stats
  const allTimeStats = computeStats(allWeaves, repos)

  // Compute last run stats (if there was a last run)
  let lastRunStats: StatsData | null = null
  if (lastRun) {
    const lastRunWeaves = allWeaves.filter((w) => w.discoveryRunId === lastRun.id)
    lastRunStats = computeStats(lastRunWeaves, repos)
    lastRunStats.runDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(lastRun.startedAt)
  }

  return (
    <div className="stats-page">
      <PageHeader title="Stats" subtitle="Leaderboard and analytics for weave discovery" />
      <StatsClient
        lastRunStats={lastRunStats}
        allTimeStats={allTimeStats}
        repoCount={repos.length}
      />
    </div>
  )
}
