import { db } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@symploke/ui/Card/Card'
import './stats.css'

type StatsPageProps = {
  params: Promise<{ id: string }>
}

type RepoStats = {
  id: string
  name: string
  totalWeaves: number
  lastRunWeaves: number
  avgScore: number
  byType: Record<string, { count: number; avgScore: number }>
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

  // Calculate stats per repo
  const repoStatsMap = new Map<string, RepoStats>()

  for (const repo of repos) {
    repoStatsMap.set(repo.id, {
      id: repo.id,
      name: repo.name,
      totalWeaves: 0,
      lastRunWeaves: 0,
      avgScore: 0,
      byType: {},
    })
  }

  // Aggregate weave data
  const repoScores: Record<string, number[]> = {}

  for (const weave of allWeaves) {
    // Count for source repo
    const sourceStats = repoStatsMap.get(weave.sourceRepoId)
    if (sourceStats) {
      sourceStats.totalWeaves++
      if (lastRun && weave.discoveryRunId === lastRun.id) {
        sourceStats.lastRunWeaves++
      }
      // Track by type
      const sourceTypeStats = sourceStats.byType[weave.type] ?? { count: 0, avgScore: 0 }
      sourceTypeStats.count++
      sourceStats.byType[weave.type] = sourceTypeStats

      // Track scores for averaging
      const sourceScores = repoScores[weave.sourceRepoId] ?? []
      sourceScores.push(weave.score)
      repoScores[weave.sourceRepoId] = sourceScores
    }

    // Count for target repo
    const targetStats = repoStatsMap.get(weave.targetRepoId)
    if (targetStats) {
      targetStats.totalWeaves++
      if (lastRun && weave.discoveryRunId === lastRun.id) {
        targetStats.lastRunWeaves++
      }
      // Track by type
      const targetTypeStats = targetStats.byType[weave.type] ?? { count: 0, avgScore: 0 }
      targetTypeStats.count++
      targetStats.byType[weave.type] = targetTypeStats

      // Track scores for averaging
      const targetScores = repoScores[weave.targetRepoId] ?? []
      targetScores.push(weave.score)
      repoScores[weave.targetRepoId] = targetScores
    }
  }

  // Calculate averages
  for (const [repoId, scores] of Object.entries(repoScores)) {
    const stats = repoStatsMap.get(repoId)
    if (stats && scores.length > 0) {
      stats.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  // Convert to sorted array
  const repoStats = Array.from(repoStatsMap.values()).sort((a, b) => b.totalWeaves - a.totalWeaves)

  // Calculate overall stats
  const totalWeaves = allWeaves.length
  const overallAvgScore =
    allWeaves.length > 0 ? allWeaves.reduce((sum, w) => sum + w.score, 0) / allWeaves.length : 0

  // Count by type
  const typeStats: Record<string, { count: number; avgScore: number }> = {}
  for (const weave of allWeaves) {
    const existing = typeStats[weave.type] ?? { count: 0, avgScore: 0 }
    existing.count++
    typeStats[weave.type] = existing
  }

  // Calculate avg scores per type
  for (const type of Object.keys(typeStats)) {
    const weavesOfType = allWeaves.filter((w) => w.type === type)
    const stats = typeStats[type]
    if (stats && weavesOfType.length > 0) {
      stats.avgScore = weavesOfType.reduce((sum, w) => sum + w.score, 0) / weavesOfType.length
    }
  }

  const formatType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="stats-page">
      <PageHeader title="Stats" subtitle="Leaderboard and analytics for weave discovery" />

      {/* Overview Cards */}
      <div className="stats-overview">
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">{totalWeaves}</span>
              <span className="stats-metric__label">Total Weaves</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">{repos.length}</span>
              <span className="stats-metric__label">Repositories</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">{(overallAvgScore * 100).toFixed(0)}%</span>
              <span className="stats-metric__label">Avg Score</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">{lastRun?.weavesSaved ?? 0}</span>
              <span className="stats-metric__label">Last Run</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Weaves by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="stats-types">
            {Object.entries(typeStats)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([type, stats]) => (
                <div key={type} className="stats-type-row">
                  <div className="stats-type-info">
                    <span className="stats-type-badge">{formatType(type)}</span>
                    <span className="stats-type-count">{stats.count} weaves</span>
                  </div>
                  <div className="stats-type-bar-container">
                    <div
                      className="stats-type-bar"
                      style={{ width: `${(stats.count / totalWeaves) * 100}%` }}
                    />
                  </div>
                  <span className="stats-type-score">{(stats.avgScore * 100).toFixed(0)}% avg</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Repo Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Repository Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="stats-leaderboard">
            <div className="stats-leaderboard__header">
              <span className="stats-leaderboard__col stats-leaderboard__col--rank">#</span>
              <span className="stats-leaderboard__col stats-leaderboard__col--name">
                Repository
              </span>
              <span className="stats-leaderboard__col stats-leaderboard__col--total">Total</span>
              <span className="stats-leaderboard__col stats-leaderboard__col--last">Last Run</span>
              <span className="stats-leaderboard__col stats-leaderboard__col--score">
                Avg Score
              </span>
              <span className="stats-leaderboard__col stats-leaderboard__col--types">
                Type Breakdown
              </span>
            </div>
            {repoStats.map((repo, index) => (
              <div key={repo.id} className="stats-leaderboard__row">
                <span className="stats-leaderboard__col stats-leaderboard__col--rank">
                  {index < 3 ? (
                    <span
                      className={`stats-leaderboard__medal stats-leaderboard__medal--${index + 1}`}
                    >
                      {index === 0 ? '1st' : index === 1 ? '2nd' : '3rd'}
                    </span>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="stats-leaderboard__col stats-leaderboard__col--name">
                  {repo.name}
                </span>
                <span className="stats-leaderboard__col stats-leaderboard__col--total">
                  {repo.totalWeaves}
                </span>
                <span className="stats-leaderboard__col stats-leaderboard__col--last">
                  {repo.lastRunWeaves > 0 ? (
                    <span className="stats-leaderboard__new">+{repo.lastRunWeaves}</span>
                  ) : (
                    '-'
                  )}
                </span>
                <span className="stats-leaderboard__col stats-leaderboard__col--score">
                  {repo.avgScore > 0 ? `${(repo.avgScore * 100).toFixed(0)}%` : '-'}
                </span>
                <span className="stats-leaderboard__col stats-leaderboard__col--types">
                  <div className="stats-leaderboard__type-badges">
                    {Object.entries(repo.byType)
                      .sort((a, b) => b[1].count - a[1].count)
                      .slice(0, 3)
                      .map(([type, typeData]) => (
                        <span
                          key={type}
                          className="stats-leaderboard__type-badge"
                          title={formatType(type)}
                        >
                          {formatType(type).split(' ')[0]} ({typeData.count})
                        </span>
                      ))}
                  </div>
                </span>
              </div>
            ))}
            {repoStats.length === 0 && (
              <div className="stats-leaderboard__empty">
                No weaves discovered yet. Run weave discovery to see stats.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
