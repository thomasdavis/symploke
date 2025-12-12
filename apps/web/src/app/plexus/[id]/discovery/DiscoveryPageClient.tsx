'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { WeaveDiscoveryRun, WeaveDiscoveryStatus, WeaveType } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { Table } from '@symploke/ui/Table/Table'
import { Button } from '@symploke/ui/Button/Button'
import { EmptyState } from '@symploke/ui/EmptyState/EmptyState'
import { VirtualLogTable, type LogEntry } from '@symploke/ui/VirtualLogTable/VirtualLogTable'
import { Tabs } from '@symploke/ui/Tabs/Tabs'
import './discovery.css'

type DiscoveredWeave = {
  id: string
  type: WeaveType
  title: string
  score: number
  sourceRepo: { fullName: string }
  targetRepo: { fullName: string }
}

type RunWithWeaves = WeaveDiscoveryRun & {
  weaves: DiscoveredWeave[]
}

type DiscoveryPageClientProps = {
  plexusId: string
  runs: RunWithWeaves[]
}

function formatDuration(start: Date, end: Date | null): string {
  if (!end) return 'running...'
  const ms = end.getTime() - start.getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function StatusBadge({ status }: { status: WeaveDiscoveryStatus }) {
  return (
    <span className={`discovery-status discovery-status--${status.toLowerCase()}`}>
      {status === 'RUNNING' && <span className="discovery-status__pulse" />}
      {status}
    </span>
  )
}

function WeaveTypeBadge({ type }: { type: WeaveType }) {
  const label = type.replace(/_/g, ' ')
  return <span className={`weave-type-badge weave-type-badge--${type}`}>{label}</span>
}

function DiscoveredWeavesTable({
  weaves,
  plexusId,
}: {
  weaves: DiscoveredWeave[]
  plexusId: string
}) {
  if (weaves.length === 0) {
    return (
      <div className="discovered-weaves-empty">
        <p>No weaves were found during this run.</p>
      </div>
    )
  }

  return (
    <div className="discovered-weaves-table">
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Target</th>
            <th>Type</th>
            <th>Title</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {weaves.map((weave) => (
            <tr key={weave.id} className="discovered-weave-row">
              <td>
                <span className="repo-name">{weave.sourceRepo.fullName}</span>
              </td>
              <td>
                <span className="repo-name">{weave.targetRepo.fullName}</span>
              </td>
              <td>
                <WeaveTypeBadge type={weave.type} />
              </td>
              <td>
                <Link
                  href={`/plexus/${plexusId}/weaves?weave=${weave.id}`}
                  className="weave-title-link"
                >
                  {weave.title}
                </Link>
              </td>
              <td>
                <span className="score-badge">{(weave.score * 100).toFixed(0)}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RunDetail({
  run,
  plexusId,
  onClose,
}: {
  run: RunWithWeaves
  plexusId: string
  onClose: () => void
}) {
  const duration = formatDuration(run.startedAt, run.completedAt)
  const [activeTab, setActiveTab] = useState<'weaves' | 'logs'>('weaves')
  const [logFilter, setLogFilter] = useState('all')

  // Parse logs from JSON
  const rawLogs =
    (run.logs as Array<{
      timestamp: string
      level: string
      message: string
      data?: Record<string, unknown>
    }>) || []

  const logs: LogEntry[] = rawLogs.map((log, i) => ({
    id: `log-${i}`,
    timestamp: log.timestamp,
    level: log.level as LogEntry['level'],
    message: log.message,
    data: log.data,
  }))

  const filteredLogs = logFilter === 'all' ? logs : logs.filter((log) => log.level === logFilter)

  const levelCounts = logs.reduce(
    (acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="discovery-detail">
      <div className="discovery-detail__header">
        <h2>Run Details</h2>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="discovery-detail__meta">
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Status</span>
            <StatusBadge status={run.status} />
          </div>
          <div className="meta-item">
            <span className="meta-label">Duration</span>
            <span className="meta-value">{duration}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Pairs Checked</span>
            <span className="meta-value">
              {run.repoPairsChecked}/{run.repoPairsTotal}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Candidates</span>
            <span className="meta-value">{run.candidatesFound}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Saved</span>
            <span className="meta-value meta-value--success">{run.weavesSaved}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Skipped</span>
            <span className="meta-value">{run.weavesSkipped}</span>
          </div>
        </div>

        <div className="meta-timestamps">
          <div className="meta-item meta-item--full">
            <span className="meta-label">Started</span>
            <span className="meta-value meta-value--mono">{run.startedAt.toISOString()}</span>
          </div>
          {run.completedAt && (
            <div className="meta-item meta-item--full">
              <span className="meta-label">Completed</span>
              <span className="meta-value meta-value--mono">{run.completedAt.toISOString()}</span>
            </div>
          )}
        </div>

        {run.error && (
          <div className="meta-error">
            <span className="meta-label">Error</span>
            <p className="error-message">{run.error}</p>
          </div>
        )}
      </div>

      {/* Tabs for Weaves and Logs */}
      <div className="discovery-detail__tabs">
        <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'weaves' | 'logs')}>
          <Tabs.List className="discovery-tabs-list">
            <Tabs.Tab value="weaves">Weaves Found ({run.weaves.length})</Tabs.Tab>
            <Tabs.Tab value="logs">Logs ({logs.length})</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      </div>

      {/* Weaves Tab Content */}
      {activeTab === 'weaves' && (
        <div className="discovery-detail__weaves">
          <DiscoveredWeavesTable weaves={run.weaves} plexusId={plexusId} />
        </div>
      )}

      {/* Logs Tab Content */}
      {activeTab === 'logs' && (
        <div className="discovery-detail__logs">
          <VirtualLogTable
            logs={filteredLogs}
            totalCount={logs.length}
            emptyMessage="No logs available for this run"
            toolbarExtra={
              <Tabs.Root value={logFilter} onValueChange={setLogFilter}>
                <Tabs.List className="discovery-log-tabs">
                  <Tabs.Tab value="all">All ({logs.length})</Tabs.Tab>
                  <Tabs.Tab value="info">Info ({levelCounts.info || 0})</Tabs.Tab>
                  <Tabs.Tab value="debug">Debug ({levelCounts.debug || 0})</Tabs.Tab>
                  <Tabs.Tab value="warn">Warn ({levelCounts.warn || 0})</Tabs.Tab>
                  <Tabs.Tab value="error">Error ({levelCounts.error || 0})</Tabs.Tab>
                </Tabs.List>
              </Tabs.Root>
            }
          />
        </div>
      )}
    </div>
  )
}

export function DiscoveryPageClient({ plexusId, runs }: DiscoveryPageClientProps) {
  const [selectedRun, setSelectedRun] = useState<RunWithWeaves | null>(null)

  const columns = [
    {
      header: 'Status',
      accessor: (run: RunWithWeaves) => <StatusBadge status={run.status} />,
    },
    {
      header: 'Started',
      accessor: (run: RunWithWeaves) => formatDate(run.startedAt),
    },
    {
      header: 'Duration',
      accessor: (run: RunWithWeaves) => formatDuration(run.startedAt, run.completedAt),
    },
    {
      header: 'Pairs',
      accessor: (run: RunWithWeaves) => `${run.repoPairsChecked}/${run.repoPairsTotal}`,
    },
    {
      header: 'Found',
      accessor: (run: RunWithWeaves) => run.candidatesFound,
    },
    {
      header: 'Saved',
      accessor: (run: RunWithWeaves) => (
        <span className={run.weavesSaved > 0 ? 'text-success' : ''}>{run.weavesSaved}</span>
      ),
    },
  ]

  return (
    <div className="discovery-page">
      <PageHeader
        title="Weave Discovery"
        subtitle="Track discovery runs and analyze integration opportunities"
      />

      <div className="discovery-content">
        <div className="discovery-main">
          {runs.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  title="No discovery runs yet"
                  description="Run weave discovery from the CLI to find integration opportunities between your repositories."
                  actionLabel="View Documentation"
                  actionHref="https://github.com/symploke/symploke"
                />
                <div className="empty-command">
                  <code>pnpm engine find-weaves --plexus-id {plexusId}</code>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="runs-table-wrapper">
              <Table
                columns={columns}
                data={runs}
                getRowKey={(run) => run.id}
                onRowClick={(run) => setSelectedRun(run)}
                emptyMessage="No discovery runs found"
              />
            </div>
          )}
        </div>

        {selectedRun && (
          <div className="discovery-sidebar">
            <RunDetail run={selectedRun} plexusId={plexusId} onClose={() => setSelectedRun(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
