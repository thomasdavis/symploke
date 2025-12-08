'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { WeaveType, WeaveDiscoveryRun } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Select } from '@symploke/ui/Select/Select'
import { Table } from '@symploke/ui/Table/Table'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { EmptyState } from '@symploke/ui/EmptyState/EmptyState'
import './weaves.css'

type Weave = {
  id: string
  sourceRepoId: string
  targetRepoId: string
  discoveryRunId: string | null
  type: WeaveType
  title: string
  description: string
  score: number
  createdAt: Date
  sourceRepo: { name: string; fullName: string }
  targetRepo: { name: string; fullName: string }
  metadata: unknown
}

type DiscoveryRun = Pick<WeaveDiscoveryRun, 'id' | 'startedAt' | 'weavesSaved'>

type WeavesClientProps = {
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

function formatWeaveType(type: WeaveType): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function WeaveTypeBadge({ type }: { type: WeaveType }) {
  return (
    <span className={`weave-type-badge weave-type-badge--${type.toLowerCase()}`}>
      {formatWeaveType(type)}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100)
  const level = percentage >= 90 ? 'high' : percentage >= 75 ? 'medium' : 'low'
  return <span className={`weave-score weave-score--${level}`}>{percentage}%</span>
}

function WeaveDetail({
  weave,
  onClose,
  plexusId,
}: {
  weave: Weave
  onClose: () => void
  plexusId: string
}) {
  const metadata = weave.metadata as {
    filePairs?: Array<{ sourceFile: string; targetFile: string; avgSimilarity: number }>
  } | null

  return (
    <div className="weave-detail">
      <div className="weave-detail__header">
        <h2>{weave.title}</h2>
        <button type="button" className="weave-detail__close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <Link href={`/plexus/${plexusId}/weaves/${weave.id}`} className="weave-detail__view-full">
        View Full Details
      </Link>

      <div className="weave-detail__meta">
        <div className="weave-detail__badges">
          <WeaveTypeBadge type={weave.type} />
          <ScoreBadge score={weave.score} />
        </div>

        <div className="weave-detail__repos">
          <div className="weave-detail__repo">
            <span className="weave-detail__label">Source</span>
            <span className="weave-detail__value">{weave.sourceRepo.fullName}</span>
          </div>
          <div className="weave-detail__arrow" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 10H16M16 10L11 5M16 10L11 15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="weave-detail__repo">
            <span className="weave-detail__label">Target</span>
            <span className="weave-detail__value">{weave.targetRepo.fullName}</span>
          </div>
        </div>
      </div>

      <div className="weave-detail__description">
        <h3>Description</h3>
        <p>{weave.description}</p>
      </div>

      {metadata?.filePairs && metadata.filePairs.length > 0 && (
        <div className="weave-detail__files">
          <h3>Related File Pairs</h3>
          <div className="weave-detail__file-list">
            {metadata.filePairs.map((pair, i) => (
              <div key={i} className="weave-detail__file-pair">
                <div className="weave-detail__file-similarity">
                  {Math.round(pair.avgSimilarity * 100)}%
                </div>
                <div className="weave-detail__file-paths">
                  <code>{pair.sourceFile}</code>
                  <span className="weave-detail__file-arrow">&harr;</span>
                  <code>{pair.targetFile}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function WeavesClient({ weaves, discoveryRuns, plexusId }: WeavesClientProps) {
  const [selectedRunId, setSelectedRunId] = useState<string>('latest')
  const [selectedWeave, setSelectedWeave] = useState<Weave | null>(null)

  const filteredWeaves = useMemo(() => {
    if (selectedRunId === 'all') {
      return weaves
    }
    if (selectedRunId === 'latest') {
      const latestRunId = discoveryRuns[0]?.id
      if (latestRunId) {
        const runWeaves = weaves.filter((w) => w.discoveryRunId === latestRunId)
        return runWeaves.length > 0 ? runWeaves : weaves.filter((w) => !w.discoveryRunId)
      }
      return weaves
    }
    return weaves.filter((w) => w.discoveryRunId === selectedRunId)
  }, [weaves, selectedRunId, discoveryRuns])

  const selectedRun =
    selectedRunId !== 'latest' && selectedRunId !== 'all'
      ? discoveryRuns.find((r) => r.id === selectedRunId)
      : selectedRunId === 'latest'
        ? discoveryRuns[0]
        : null

  const columns = [
    {
      header: 'Type',
      accessor: (weave: Weave) => <WeaveTypeBadge type={weave.type} />,
    },
    {
      header: 'Title',
      accessor: (weave: Weave) => weave.title,
      className: 'weave-table__title',
    },
    {
      header: 'Source',
      accessor: (weave: Weave) => weave.sourceRepo.name,
    },
    {
      header: 'Target',
      accessor: (weave: Weave) => weave.targetRepo.name,
    },
    {
      header: 'Score',
      accessor: (weave: Weave) => <ScoreBadge score={weave.score} />,
    },
  ]

  return (
    <div className="weaves-page">
      <div className="weaves-header">
        <PageHeader
          title="Weaves"
          subtitle={`${filteredWeaves.length} connection${filteredWeaves.length !== 1 ? 's' : ''} discovered`}
        />
        <div className="weaves-run-selector">
          <Select.Root
            value={selectedRunId}
            onValueChange={(val) => setSelectedRunId(typeof val === 'string' ? val : 'latest')}
          >
            <Select.Trigger className="run-selector-trigger">
              <Select.Value>
                {selectedRunId === 'all'
                  ? `All runs (${weaves.length} weaves)`
                  : selectedRunId === 'latest'
                    ? selectedRun
                      ? `Latest: ${formatRunDate(selectedRun.startedAt)} (${filteredWeaves.length} weaves)`
                      : 'Latest run'
                    : selectedRun
                      ? `${formatRunDate(selectedRun.startedAt)} (${selectedRun.weavesSaved} weaves)`
                      : 'Select run'}
              </Select.Value>
              <Select.Icon aria-hidden="true">
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
                    <Select.Item value="all">
                      <Select.ItemText>All runs ({weaves.length} weaves)</Select.ItemText>
                      <Select.ItemIndicator aria-hidden="true">
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
                    <Select.Item value="latest">
                      <Select.ItemText>
                        Latest run
                        {discoveryRuns[0] ? ` (${discoveryRuns[0].weavesSaved} weaves)` : ''}
                      </Select.ItemText>
                      <Select.ItemIndicator aria-hidden="true">
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
                        <Select.ItemIndicator aria-hidden="true">
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

      <div className="weaves-content">
        <div className="weaves-main">
          {filteredWeaves.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  title="No weaves found"
                  description="Run weave discovery from the CLI to find integration opportunities between your repositories."
                  actionLabel="View Documentation"
                  actionHref="https://github.com/symploke/symploke"
                />
                <div className="weaves-empty-command">
                  <code>pnpm engine find-weaves --plexus-id {plexusId}</code>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="weaves-table-wrapper">
              <Table
                columns={columns}
                data={filteredWeaves}
                getRowKey={(weave) => weave.id}
                onRowClick={(weave) => setSelectedWeave(weave)}
                emptyMessage="No weaves found"
              />
            </div>
          )}
        </div>

        {selectedWeave && (
          <div className="weaves-sidebar">
            <WeaveDetail
              weave={selectedWeave}
              onClose={() => setSelectedWeave(null)}
              plexusId={plexusId}
            />
          </div>
        )}
      </div>
    </div>
  )
}
