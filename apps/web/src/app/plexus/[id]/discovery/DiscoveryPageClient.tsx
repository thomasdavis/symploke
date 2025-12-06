'use client'

import { useState } from 'react'
import type { WeaveDiscoveryRun, WeaveDiscoveryStatus } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Card, CardContent } from '@symploke/ui/Card/Card'
import { Table } from '@symploke/ui/Table/Table'
import { Tabs } from '@symploke/ui/Tabs/Tabs'
import { Collapsible } from '@base-ui-components/react/collapsible'
import '@symploke/design/components/collapsible.css'
import { Button } from '@symploke/ui/Button/Button'
import { EmptyState } from '@symploke/ui/EmptyState/EmptyState'
import './discovery.css'

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

type NearMissCandidate = {
  repos: string
  files: string
  similarity: string
}

type DiscoveryPageClientProps = {
  plexusId: string
  runs: WeaveDiscoveryRun[]
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

function extractNearMissCandidates(
  logs: LogEntry[],
): { threshold: number; candidates: NearMissCandidate[] } | null {
  const nearMissLog = logs.find(
    (log) => log.message === 'Top 10 near-miss candidates (below threshold)',
  )
  if (!nearMissLog?.data) return null

  const data = nearMissLog.data as { threshold?: number; nearMisses?: NearMissCandidate[] }
  if (!data.nearMisses || data.nearMisses.length === 0) return null

  return {
    threshold: data.threshold ?? 0.85,
    candidates: data.nearMisses,
  }
}

function NearMissCandidates({ logs }: { logs: LogEntry[] }) {
  const nearMissData = extractNearMissCandidates(logs)

  if (!nearMissData) return null

  return (
    <div className="near-miss-section">
      <div className="near-miss-header">
        <h3>Near-Miss Candidates</h3>
        <span className="near-miss-threshold">
          Below {(nearMissData.threshold * 100).toFixed(0)}% threshold
        </span>
      </div>
      <p className="near-miss-description">
        These file pairs had similar content but didn&apos;t meet the similarity threshold to become
        weaves.
      </p>
      <div className="near-miss-list">
        {nearMissData.candidates.map((candidate, i) => (
          <div key={i} className="near-miss-item">
            <div className="near-miss-item__similarity">{candidate.similarity}</div>
            <div className="near-miss-item__content">
              <div className="near-miss-item__repos">{candidate.repos}</div>
              <div className="near-miss-item__files">{candidate.files}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogViewer({ logs }: { logs: LogEntry[] }) {
  const [filter, setFilter] = useState<string>('all')

  const filteredLogs = filter === 'all' ? logs : logs.filter((log) => log.level === filter)

  const levelCounts = logs.reduce(
    (acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="log-viewer">
      <Tabs.Root defaultValue="all" onValueChange={setFilter}>
        <Tabs.List>
          <Tabs.Tab value="all">All ({logs.length})</Tabs.Tab>
          <Tabs.Tab value="info">Info ({levelCounts.info || 0})</Tabs.Tab>
          <Tabs.Tab value="debug">Debug ({levelCounts.debug || 0})</Tabs.Tab>
          <Tabs.Tab value="warn">Warn ({levelCounts.warn || 0})</Tabs.Tab>
          <Tabs.Tab value="error">Error ({levelCounts.error || 0})</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Panel value={filter} keepMounted>
          <div className="log-entries">
            {filteredLogs.length === 0 ? (
              <p className="log-empty">No log entries for this filter</p>
            ) : (
              filteredLogs.map((log, i) => <LogEntryRow key={i} log={log} />)
            )}
          </div>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}

function isImportantLog(log: LogEntry): boolean {
  // These log messages should be shown expanded by default
  const importantMessages = [
    'Running',
    'weave type',
    'Starting weave discovery',
    'Weave finder complete',
    'Weave discovery complete',
  ]
  return importantMessages.some((msg) => log.message.includes(msg))
}

function LogEntryRow({ log }: { log: LogEntry }) {
  const hasData = log.data && Object.keys(log.data).length > 0
  const [isOpen, setIsOpen] = useState(() => isImportantLog(log))

  // Special handling for weave type announcements - show prominently
  if (log.message.includes('weave type') && log.data?.types) {
    const types = log.data.types as string[]
    return (
      <div className="log-entry log-entry--weave-type">
        <span className="log-entry__time">
          {new Date(log.timestamp).toISOString().slice(11, 23)}
        </span>
        <span className={`log-entry__level log-entry__level--${log.level}`}>{log.level}</span>
        <span className="log-entry__message">Running weave type{types.length > 1 ? 's' : ''}:</span>
        <span className="log-entry__types">
          {types.map((type) => (
            <span key={type} className="log-entry__type-badge">
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </span>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="log-entry">
        <span className="log-entry__time">
          {new Date(log.timestamp).toISOString().slice(11, 23)}
        </span>
        <span className={`log-entry__level log-entry__level--${log.level}`}>{log.level}</span>
        <span className="log-entry__message">{log.message}</span>
      </div>
    )
  }

  return (
    <Collapsible.Root
      className="log-entry log-entry--expandable"
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <Collapsible.Trigger className="log-entry__row">
        <span className="log-entry__time">
          {new Date(log.timestamp).toISOString().slice(11, 23)}
        </span>
        <span className={`log-entry__level log-entry__level--${log.level}`}>{log.level}</span>
        <span className="log-entry__message">{log.message}</span>
        <span className="log-entry__expand">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="log-entry__data">
        <pre>{JSON.stringify(log.data, null, 2)}</pre>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

function RunDetail({ run, onClose }: { run: WeaveDiscoveryRun; onClose: () => void }) {
  const duration = formatDuration(run.startedAt, run.completedAt)
  const logs = (run.logs as LogEntry[]) || []

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

        {run.config && (
          <div className="meta-config">
            <span className="meta-label">Configuration</span>
            <pre className="config-json">{JSON.stringify(run.config, null, 2)}</pre>
          </div>
        )}

        {run.error && (
          <div className="meta-error">
            <span className="meta-label">Error</span>
            <p className="error-message">{run.error}</p>
          </div>
        )}
      </div>

      <div className="discovery-detail__logs">
        <h3>Execution Logs</h3>
        <LogViewer logs={logs} />
      </div>

      <NearMissCandidates logs={logs} />
    </div>
  )
}

export function DiscoveryPageClient({ plexusId, runs }: DiscoveryPageClientProps) {
  const [selectedRun, setSelectedRun] = useState<WeaveDiscoveryRun | null>(null)

  const columns = [
    {
      header: 'Status',
      accessor: (run: WeaveDiscoveryRun) => <StatusBadge status={run.status} />,
    },
    {
      header: 'Started',
      accessor: (run: WeaveDiscoveryRun) => formatDate(run.startedAt),
    },
    {
      header: 'Duration',
      accessor: (run: WeaveDiscoveryRun) => formatDuration(run.startedAt, run.completedAt),
    },
    {
      header: 'Pairs',
      accessor: (run: WeaveDiscoveryRun) => `${run.repoPairsChecked}/${run.repoPairsTotal}`,
    },
    {
      header: 'Found',
      accessor: (run: WeaveDiscoveryRun) => run.candidatesFound,
    },
    {
      header: 'Saved',
      accessor: (run: WeaveDiscoveryRun) => (
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
            <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
