'use client'

import Link from 'next/link'
import type { WeaveType, WeaveDiscoveryStatus, GlossaryStatus } from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import './pair-drill-down.css'

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

type GlossaryData = {
  id: string
  status: GlossaryStatus
  terms: Array<{
    term: string
    definition: string
    context: string
    emotionalValence: string
  }>
  philosophy: {
    beliefs: string[]
    virtues: string[]
    epistemology: string
  }
  resentments: {
    hates: string[]
    definesAgainst: string[]
    enemies: string[]
  }
  confidence: number | null
}

type RepoData = {
  id: string
  name: string
  fullName: string
  glossary: GlossaryData | null
}

type RunData = {
  id: string
  status: WeaveDiscoveryStatus
  startedAt: string
  completedAt: string | null
}

type WeaveData = {
  id: string
  type: WeaveType
  title: string
  score: number
  createdAt: string
}

type PairDrillDownClientProps = {
  plexusId: string
  run: RunData
  sourceRepo: RepoData
  targetRepo: RepoData
  logs: LogEntry[]
  weaves: WeaveData[]
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase()
  return <span className={`pdd-status pdd-status--${statusLower}`}>{status}</span>
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateString))
}

// Extract weave type attempts from logs
function extractWeaveTypeAttempts(logs: LogEntry[]): Array<{
  type: string
  found: boolean
  score?: number
  threshold?: number
  reason?: string
}> {
  const attempts: Map<
    string,
    {
      type: string
      found: boolean
      score?: number
      threshold?: number
      reason?: string
    }
  > = new Map()

  for (const log of logs) {
    // Glossary alignment
    if (log.message === 'Glossary alignment scores calculated' && log.data) {
      attempts.set('glossary_alignment', {
        type: 'glossary_alignment',
        found: (log.data.finalScore as number) >= 0.25,
        score: log.data.finalScore as number,
        threshold: 0.25,
      })
    }

    // Glossary missing
    if (log.message.includes('missing complete glossary')) {
      attempts.set('glossary_alignment', {
        type: 'glossary_alignment',
        found: false,
        reason: 'One or both repos missing glossary',
      })
    }

    // Integration opportunity
    if (log.message.includes('integration') || log.message.includes('similarity')) {
      if (log.data?.score !== undefined) {
        attempts.set('integration_opportunity', {
          type: 'integration_opportunity',
          found: (log.data.score as number) >= 0.75,
          score: log.data.score as number,
          threshold: 0.75,
        })
      }
    }

    // Candidate found
    if (log.message.includes('Candidate found') || log.message.includes('candidate saved')) {
      const type = (log.data?.type as string) || 'unknown'
      const existing = attempts.get(type)
      if (existing) {
        existing.found = true
      } else {
        attempts.set(type, { type, found: true })
      }
    }
  }

  return Array.from(attempts.values())
}

function GlossaryPreview({
  repo,
  glossary,
  plexusId,
}: {
  repo: RepoData
  glossary: GlossaryData | null
  plexusId: string
}) {
  return (
    <div className="pdd-glossary-preview">
      <div className="pdd-glossary-header">
        <h4>{repo.fullName}</h4>
        {glossary && <StatusBadge status={glossary.status} />}
      </div>

      {!glossary || glossary.status !== 'COMPLETE' ? (
        <div className="pdd-glossary-empty">
          {glossary ? `Status: ${glossary.status}` : 'No glossary'}
        </div>
      ) : (
        <div className="pdd-glossary-content">
          <div className="pdd-glossary-section">
            <strong>Virtues</strong>
            <div className="pdd-tags">
              {glossary.philosophy?.virtues?.slice(0, 4).map((v, i) => (
                <span key={i} className="pdd-tag pdd-tag--positive">
                  {v}
                </span>
              ))}
            </div>
          </div>
          <div className="pdd-glossary-section">
            <strong>Enemies</strong>
            <div className="pdd-tags">
              {glossary.resentments?.enemies?.slice(0, 4).map((e, i) => (
                <span key={i} className="pdd-tag pdd-tag--negative">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <Link href={`/plexus/${plexusId}/repos/${repo.id}/glossary`} className="pdd-glossary-link">
        View Full Glossary
      </Link>
    </div>
  )
}

export function PairDrillDownClient({
  plexusId,
  run,
  sourceRepo,
  targetRepo,
  logs,
  weaves,
}: PairDrillDownClientProps) {
  const attempts = extractWeaveTypeAttempts(logs)

  return (
    <div className="pdd-page">
      <div className="pdd-nav">
        <Link href={`/plexus/${plexusId}/discovery`} className="pdd-back-link">
          Back to Discovery
        </Link>
      </div>

      <PageHeader
        title={`${sourceRepo.name} ↔ ${targetRepo.name}`}
        subtitle={`Pair analysis from discovery run ${run.id.slice(0, 8)}...`}
      />

      {/* Run Info */}
      <div className="pdd-run-info">
        <StatusBadge status={run.status} />
        <span>Started: {formatDate(run.startedAt)}</span>
        {run.completedAt && <span>Completed: {formatDate(run.completedAt)}</span>}
      </div>

      {/* Weave Type Attempts */}
      <div className="pdd-section">
        <h3>Weave Type Analysis</h3>
        <p className="pdd-description">
          Results for each weave type attempted between these repositories
        </p>

        {attempts.length === 0 ? (
          <div className="pdd-empty">No weave type attempts found in logs</div>
        ) : (
          <div className="pdd-attempts">
            {attempts.map((attempt) => (
              <div
                key={attempt.type}
                className={`pdd-attempt ${attempt.found ? 'pdd-attempt--found' : 'pdd-attempt--not-found'}`}
              >
                <div className="pdd-attempt-header">
                  <span className="pdd-attempt-type">{attempt.type.replace(/_/g, ' ')}</span>
                  <span
                    className={`pdd-attempt-badge ${attempt.found ? 'pdd-attempt-badge--found' : ''}`}
                  >
                    {attempt.found ? 'Found' : 'Not Found'}
                  </span>
                </div>
                <div className="pdd-attempt-details">
                  {attempt.score !== undefined && (
                    <span>
                      Score: {(attempt.score * 100).toFixed(0)}%
                      {attempt.threshold &&
                        ` (threshold: ${(attempt.threshold * 100).toFixed(0)}%)`}
                    </span>
                  )}
                  {attempt.reason && <span>{attempt.reason}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Created Weaves */}
      {weaves.length > 0 && (
        <div className="pdd-section">
          <h3>Created Weaves ({weaves.length})</h3>
          <div className="pdd-weaves">
            {weaves.map((weave) => (
              <Link
                key={weave.id}
                href={`/plexus/${plexusId}/weaves/${weave.id}`}
                className="pdd-weave-card"
              >
                <div className="pdd-weave-header">
                  <span className="pdd-weave-type">{weave.type.replace(/_/g, ' ')}</span>
                  <span className="pdd-weave-score">{(weave.score * 100).toFixed(0)}%</span>
                </div>
                <div className="pdd-weave-title">{weave.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Glossary Comparison */}
      <div className="pdd-section">
        <h3>Glossary Comparison</h3>
        <div className="pdd-glossary-compare">
          <GlossaryPreview repo={sourceRepo} glossary={sourceRepo.glossary} plexusId={plexusId} />
          <GlossaryPreview repo={targetRepo} glossary={targetRepo.glossary} plexusId={plexusId} />
        </div>
      </div>

      {/* Raw Logs */}
      <div className="pdd-section">
        <h3>Pair Logs ({logs.length} entries)</h3>
        {logs.length === 0 ? (
          <div className="pdd-empty">No logs found for this pair</div>
        ) : (
          <div className="pdd-logs">
            {logs.map((log, i) => (
              <div key={i} className={`pdd-log pdd-log--${log.level}`}>
                <span className="pdd-log-time">
                  {new Date(log.timestamp).toISOString().slice(11, 23)}
                </span>
                <span className="pdd-log-level">{log.level}</span>
                <span className="pdd-log-message">{log.message}</span>
                {log.data && Object.keys(log.data).length > 0 && (
                  <pre className="pdd-log-data">{JSON.stringify(log.data, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
