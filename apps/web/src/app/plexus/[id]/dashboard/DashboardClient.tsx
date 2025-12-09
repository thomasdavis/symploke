'use client'

import { useState, useMemo } from 'react'
import type { WeaveType, WeaveDiscoveryRun } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Select } from '@symploke/ui/Select/Select'
import { RepoFlowGraph } from './RepoFlowGraph'
import { WeaveDiscoveryOverlay } from './WeaveDiscoveryOverlay'
import { RunWeavesButton } from '@/components/RunWeavesButton'
import { useWeaveProgress } from '@/hooks/useWeaveProgress'
import './dashboard.css'

type Repo = {
  id: string
  name: string
  fullName: string
  url: string
  lastIndexed: Date | null
  createdAt: Date
  _count?: {
    files: number
  }
}

type Weave = {
  id: string
  sourceRepoId: string
  targetRepoId: string
  discoveryRunId: string | null
  type: WeaveType
  title: string
  description: string
  score: number
  sourceRepo: { name: string }
  targetRepo: { name: string }
}

type DiscoveryRun = Pick<WeaveDiscoveryRun, 'id' | 'startedAt' | 'weavesSaved'>

type DashboardClientProps = {
  repos: Repo[]
  weaves: Weave[]
  discoveryRuns: DiscoveryRun[]
  plexusId: string
}

function formatRunDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function DashboardClient({ repos, weaves, discoveryRuns, plexusId }: DashboardClientProps) {
  // Default to 'latest' which shows the most recent run's weaves (or all if none have runIds)
  const [selectedRunId, setSelectedRunId] = useState<string>('latest')
  const [minScore, setMinScore] = useState<number>(0.3)

  // Weave discovery real-time progress
  const weaveProgress = useWeaveProgress(plexusId)

  // Debug logging
  console.log('[DashboardClient] weaveProgress:', {
    isRunning: weaveProgress.isRunning,
    status: weaveProgress.status,
    newWeaves: weaveProgress.newWeaves.length,
    weavesFound: weaveProgress.weavesFound,
    isConnected: weaveProgress.isConnected,
    progress: weaveProgress.progress,
  })

  // Filter weaves by selected run and score
  const filteredWeaves = useMemo(() => {
    let result = weaves

    // Filter by run
    if (selectedRunId === 'latest') {
      const latestRunId = discoveryRuns[0]?.id
      if (latestRunId) {
        const runWeaves = weaves.filter((w) => w.discoveryRunId === latestRunId)
        result = runWeaves.length > 0 ? runWeaves : weaves.filter((w) => !w.discoveryRunId)
      }
    } else {
      result = weaves.filter((w) => w.discoveryRunId === selectedRunId)
    }

    // Filter by minimum score
    return result.filter((w) => w.score >= minScore)
  }, [weaves, selectedRunId, discoveryRuns, minScore])

  const selectedRun =
    selectedRunId !== 'latest'
      ? discoveryRuns.find((r) => r.id === selectedRunId)
      : discoveryRuns[0]

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <PageHeader
          title="Dashboard"
          subtitle={`${repos.length} repositories · ${filteredWeaves.length} weaves`}
        />
        <div className="dashboard-header__actions">
          <RunWeavesButton plexusId={plexusId} variant="secondary" size="sm" />
          <div className="dashboard-run-selector">
            <Select.Root
              value={selectedRunId}
              onValueChange={(val) => setSelectedRunId(typeof val === 'string' ? val : 'latest')}
            >
              <Select.Trigger className="run-selector-trigger">
                <Select.Value>
                  {selectedRunId === 'latest'
                    ? `Latest${selectedRun ? ` (${formatRunDate(selectedRun.startedAt)})` : ''}`
                    : selectedRun
                      ? `${formatRunDate(selectedRun.startedAt)} (${selectedRun.weavesSaved} weaves)`
                      : 'Select run'}
                </Select.Value>
                <Select.Icon>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup>
                    <Select.List>
                      <Select.Item value="latest">
                        <Select.ItemText>Latest run</Select.ItemText>
                        <Select.ItemIndicator>
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Select.ItemIndicator>
                      </Select.Item>
                      {discoveryRuns.length > 0 && <Select.Separator />}
                      {discoveryRuns.map((run) => (
                        <Select.Item key={run.id} value={run.id}>
                          <Select.ItemText>
                            {formatRunDate(run.startedAt)} ({run.weavesSaved} weaves)
                          </Select.ItemText>
                          <Select.ItemIndicator>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.List>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
      </div>

      <div className="dashboard-score-filter">
        <div className="dashboard-score-filter__control">
          <label htmlFor="dashboard-min-score">
            Min Score: <strong>{Math.round(minScore * 100)}%</strong>
          </label>
          <input
            id="dashboard-min-score"
            type="range"
            min="0"
            max="100"
            value={minScore * 100}
            onChange={(e) => setMinScore(Number(e.target.value) / 100)}
            className="dashboard-score-slider"
          />
        </div>
        <span className="dashboard-score-filter__count">
          {filteredWeaves.length} weave{filteredWeaves.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      <div className="dashboard-graph-container">
        <RepoFlowGraph
          repos={repos}
          weaves={filteredWeaves}
          plexusId={plexusId}
          isDiscoveryRunning={weaveProgress.isRunning}
          newWeaves={weaveProgress.newWeaves}
        />
        {weaveProgress.isRunning && (
          <WeaveDiscoveryOverlay
            repoPairsChecked={weaveProgress.repoPairsChecked}
            repoPairsTotal={weaveProgress.repoPairsTotal}
            weavesFound={weaveProgress.weavesFound}
            progress={weaveProgress.progress}
          />
        )}
      </div>
    </div>
  )
}
