'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@symploke/ui/Card/Card'
import { ScoreFilter } from '@/components/ScoreFilter'

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

type RepoStats = {
  id: string
  name: string
  weaveCount: number
  avgScore: number
  byType: Record<string, { count: number; avgScore: number }>
}

type TypeStats = Record<string, { count: number; avgScore: number }>

type StatsData = {
  totalWeaves: number
  avgScore: number
  repoStats: RepoStats[]
  typeStats: TypeStats
}

type StatsAPIResponse = {
  weaves: Weave[]
  repos: Repo[]
  lastRunId: string | null
  lastRunDate: string | null
}

type StatsClientProps = {
  plexusId: string
  initialData: StatsAPIResponse
}

function formatType(type: string) {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function computeStats(weaves: Weave[], repos: Repo[]): StatsData {
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

  const repoScores: Record<string, number[]> = {}

  for (const weave of weaves) {
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

  for (const [repoId, scores] of Object.entries(repoScores)) {
    const stats = repoStatsMap.get(repoId)
    if (stats && scores.length > 0) {
      stats.avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }

  const typeStats: TypeStats = {}
  for (const weave of weaves) {
    const existing = typeStats[weave.type] ?? { count: 0, avgScore: 0 }
    existing.count++
    typeStats[weave.type] = existing
  }

  for (const type of Object.keys(typeStats)) {
    const weavesOfType = weaves.filter((w) => w.type === type)
    const stats = typeStats[type]
    if (stats && weavesOfType.length > 0) {
      stats.avgScore = weavesOfType.reduce((sum, w) => sum + w.score, 0) / weavesOfType.length
    }
  }

  const repoStats = Array.from(repoStatsMap.values()).sort((a, b) => b.weaveCount - a.weaveCount)
  const totalWeaves = weaves.length
  const avgScore =
    weaves.length > 0 ? weaves.reduce((sum, w) => sum + w.score, 0) / weaves.length : 0

  return { totalWeaves, avgScore, repoStats, typeStats }
}

function StatsContent({
  stats,
  repoCount,
  label,
}: {
  stats: StatsData
  repoCount: number
  label: string
}) {
  return (
    <>
      {/* Overview Cards */}
      <div className="stats-overview">
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">{stats.totalWeaves}</span>
              <span className="stats-metric__label">
                Weaves {label === 'Last Run' ? 'Found' : 'Total'}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">{repoCount}</span>
              <span className="stats-metric__label">Repositories</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">
                {stats.avgScore > 0 ? `${(stats.avgScore * 100).toFixed(0)}%` : '-'}
              </span>
              <span className="stats-metric__label">Avg Score</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="stats-metric">
              <span className="stats-metric__value">{Object.keys(stats.typeStats).length}</span>
              <span className="stats-metric__label">Weave Types</span>
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
          {Object.keys(stats.typeStats).length === 0 ? (
            <div className="stats-empty">No weaves match the current filter.</div>
          ) : (
            <div className="stats-types">
              {Object.entries(stats.typeStats)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([type, typeData]) => (
                  <div key={type} className="stats-type-row">
                    <div className="stats-type-info">
                      <span className="stats-type-badge">{formatType(type)}</span>
                      <span className="stats-type-count">{typeData.count} weaves</span>
                    </div>
                    <div className="stats-type-bar-container">
                      <div
                        className="stats-type-bar"
                        style={{ width: `${(typeData.count / stats.totalWeaves) * 100}%` }}
                      />
                    </div>
                    <span className="stats-type-score">
                      {(typeData.avgScore * 100).toFixed(0)}% avg
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

export function StatsClient({ plexusId, initialData }: StatsClientProps) {
  // React Query with SWR-style background revalidation
  const { data } = useQuery({
    queryKey: ['plexus-stats', plexusId],
    queryFn: async () => {
      const response = await fetch(`/api/plexus/${plexusId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json() as Promise<StatsAPIResponse>
    },
    initialData,
  })

  const { weaves, repos, lastRunId, lastRunDate } = data

  const [activeTab, setActiveTab] = useState<'lastRun' | 'allTime'>(
    lastRunId ? 'lastRun' : 'allTime',
  )
  const [minScore, setMinScore] = useState(0.3)

  const hasLastRun = lastRunId !== null

  // Filter and compute stats
  const { filteredWeaves, stats } = useMemo(() => {
    // Filter by tab
    let tabFiltered = weaves
    if (activeTab === 'lastRun' && lastRunId) {
      tabFiltered = weaves.filter((w) => w.discoveryRunId === lastRunId)
    }

    // Filter by score
    const filtered = tabFiltered.filter((w) => w.score >= minScore)

    return {
      filteredWeaves: filtered,
      stats: computeStats(filtered, repos),
    }
  }, [weaves, repos, activeTab, lastRunId, minScore])

  return (
    <>
      {/* Toolbar: Tabs + Score Filter */}
      <div className="stats-toolbar">
        <div className="stats-tabs">
          <button
            type="button"
            className={`stats-tab ${activeTab === 'lastRun' ? 'stats-tab--active' : ''} ${!hasLastRun ? 'stats-tab--disabled' : ''}`}
            onClick={() => hasLastRun && setActiveTab('lastRun')}
            disabled={!hasLastRun}
          >
            Last Run
            {lastRunDate && <span className="stats-tab__date">{lastRunDate}</span>}
          </button>
          <button
            type="button"
            className={`stats-tab ${activeTab === 'allTime' ? 'stats-tab--active' : ''}`}
            onClick={() => setActiveTab('allTime')}
          >
            All Time
          </button>
        </div>
        <ScoreFilter
          value={minScore}
          onChange={setMinScore}
          resultCount={filteredWeaves.length}
          resultLabel={`weave${filteredWeaves.length !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Stats Content */}
      <StatsContent
        stats={stats}
        repoCount={repos.length}
        label={activeTab === 'lastRun' ? 'Last Run' : 'All Time'}
      />

      {/* Leaderboard */}
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
              <span className="stats-leaderboard__col stats-leaderboard__col--total">Weaves</span>
              <span className="stats-leaderboard__col stats-leaderboard__col--score">
                Avg Score
              </span>
              <span className="stats-leaderboard__col stats-leaderboard__col--types">
                Type Breakdown
              </span>
            </div>
            {stats.repoStats
              .filter((repo) => repo.weaveCount > 0)
              .map((repo, index) => (
                <div key={repo.id} className="stats-leaderboard__row">
                  <span className="stats-leaderboard__col stats-leaderboard__col--rank">
                    {index < 3 ? (
                      <span
                        className={`stats-leaderboard__medal stats-leaderboard__medal--${index + 1}`}
                      >
                        {index + 1}
                      </span>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="stats-leaderboard__col stats-leaderboard__col--name">
                    {repo.name}
                  </span>
                  <span className="stats-leaderboard__col stats-leaderboard__col--total">
                    {repo.weaveCount}
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
            {stats.repoStats.filter((r) => r.weaveCount > 0).length === 0 && (
              <div className="stats-leaderboard__empty">
                No weaves match the current filter. Try lowering the minimum score.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
