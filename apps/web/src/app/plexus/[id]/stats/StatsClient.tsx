'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@symploke/ui/Card/Card'

export type RepoStats = {
  id: string
  name: string
  weaveCount: number
  avgScore: number
  byType: Record<string, { count: number; avgScore: number }>
}

export type TypeStats = Record<string, { count: number; avgScore: number }>

export type StatsData = {
  totalWeaves: number
  avgScore: number
  repoStats: RepoStats[]
  typeStats: TypeStats
  runDate?: string
}

type StatsClientProps = {
  lastRunStats: StatsData | null
  allTimeStats: StatsData
  repoCount: number
}

function formatType(type: string) {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
            <div className="stats-empty">No weaves discovered yet.</div>
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
                No weaves discovered yet. Run weave discovery to see stats.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export function StatsClient({ lastRunStats, allTimeStats, repoCount }: StatsClientProps) {
  const [activeTab, setActiveTab] = useState<'lastRun' | 'allTime'>(
    lastRunStats ? 'lastRun' : 'allTime',
  )

  const hasLastRun = lastRunStats !== null

  return (
    <>
      {/* Tab Buttons */}
      <div className="stats-tabs">
        <button
          type="button"
          className={`stats-tab ${activeTab === 'lastRun' ? 'stats-tab--active' : ''} ${!hasLastRun ? 'stats-tab--disabled' : ''}`}
          onClick={() => hasLastRun && setActiveTab('lastRun')}
          disabled={!hasLastRun}
        >
          Last Run
          {lastRunStats?.runDate && <span className="stats-tab__date">{lastRunStats.runDate}</span>}
        </button>
        <button
          type="button"
          className={`stats-tab ${activeTab === 'allTime' ? 'stats-tab--active' : ''}`}
          onClick={() => setActiveTab('allTime')}
        >
          All Time
        </button>
      </div>

      {/* Stats Content */}
      {activeTab === 'lastRun' && lastRunStats ? (
        <StatsContent stats={lastRunStats} repoCount={repoCount} label="Last Run" />
      ) : (
        <StatsContent stats={allTimeStats} repoCount={repoCount} label="All Time" />
      )}
    </>
  )
}
