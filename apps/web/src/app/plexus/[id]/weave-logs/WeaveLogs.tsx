'use client'

import { useState } from 'react'
import type {
  WeaveDiscoveryRun,
  WeaveDiscoveryStatus,
  RepoGlossary,
  GlossaryStatus,
  Weave,
} from '@symploke/db'
import { PageHeader } from '@symploke/ui/PageHeader/PageHeader'
import { Tabs } from '@symploke/ui/Tabs/Tabs'
import './weave-logs.css'

type LogEntry = {
  timestamp: string
  level: 'info' | 'debug' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

type Repo = {
  id: string
  fullName: string
}

type GlossaryWithRepo = RepoGlossary & {
  repo: { id: string; fullName: string }
}

type WeaveWithRepos = Weave & {
  sourceRepo: { fullName: string }
  targetRepo: { fullName: string }
}

type WeaveLogsProps = {
  plexusId: string
  runs: WeaveDiscoveryRun[]
  repos: Repo[]
  glossaries: GlossaryWithRepo[]
  weaves: WeaveWithRepos[]
}

function StatusBadge({ status }: { status: WeaveDiscoveryStatus | GlossaryStatus | string }) {
  const statusLower = status.toLowerCase()
  return <span className={`wl-status wl-status--${statusLower}`}>{status}</span>
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

// Extract glossary alignment attempts from logs
function extractGlossaryAttempts(logs: LogEntry[]): Array<{
  sourceRepo: string
  targetRepo: string
  scores?: {
    vocabulary: number
    resentment: number
    philosophy: number
    poetics: number
    psychology: number
    final: number
  }
  status: 'calculated' | 'no_glossary' | 'pending'
}> {
  const attempts: Map<
    string,
    {
      sourceRepo: string
      targetRepo: string
      scores?: {
        vocabulary: number
        resentment: number
        philosophy: number
        poetics: number
        psychology: number
        final: number
      }
      status: 'calculated' | 'no_glossary' | 'pending'
    }
  > = new Map()

  for (const log of logs) {
    // Look for "Finding glossary alignments" logs
    if (log.message === 'Finding glossary alignments' && log.data) {
      const sourceId = log.data.sourceRepoId as string
      const targetId = log.data.targetRepoId as string
      const key = `${sourceId}:${targetId}`

      if (!attempts.has(key)) {
        attempts.set(key, {
          sourceRepo: sourceId,
          targetRepo: targetId,
          status: 'pending',
        })
      }
    }

    // Look for "Glossary alignment scores calculated" logs
    if (log.message === 'Glossary alignment scores calculated' && log.data) {
      const sourceId = log.data.sourceRepoId as string
      const targetId = log.data.targetRepoId as string
      const key = `${sourceId}:${targetId}`

      attempts.set(key, {
        sourceRepo: sourceId,
        targetRepo: targetId,
        scores: {
          vocabulary: log.data.vocabularyScore as number,
          resentment: log.data.resentmentScore as number,
          philosophy: log.data.philosophyScore as number,
          poetics: log.data.poeticsScore as number,
          psychology: log.data.psychologyScore as number,
          final: log.data.finalScore as number,
        },
        status: 'calculated',
      })
    }

    // Look for "One or both repos missing complete glossary" logs
    if (log.message.includes('missing complete glossary') && log.data) {
      const sourceId = log.data.sourceRepoId as string
      const targetId = log.data.targetRepoId as string
      const key = `${sourceId}:${targetId}`

      attempts.set(key, {
        sourceRepo: sourceId,
        targetRepo: targetId,
        status: 'no_glossary',
      })
    }
  }

  return Array.from(attempts.values())
}

function GlossariesTab({ glossaries }: { glossaries: GlossaryWithRepo[]; repos: Repo[] }) {
  return (
    <div className="wl-section">
      <h3>Repository Glossaries</h3>
      <p className="wl-description">
        Glossaries extracted from each repository - their vocabulary, psychology, philosophy, and
        resentments.
      </p>

      {glossaries.length === 0 ? (
        <div className="wl-empty">
          No glossaries extracted yet. Run:{' '}
          <code>pnpm engine extract-glossary --plexus-id {'<id>'}</code>
        </div>
      ) : (
        <div className="wl-glossaries">
          {glossaries.map((g) => (
            <div key={g.id} className="wl-glossary-card">
              <div className="wl-glossary-header">
                <span className="wl-glossary-repo">{g.repo.fullName}</span>
                <StatusBadge status={g.status} />
              </div>

              {g.status === 'COMPLETE' && (
                <div className="wl-glossary-content">
                  <div className="wl-glossary-section">
                    <strong>Terms:</strong>
                    <div className="wl-terms">
                      {(g.terms as Array<{ term: string; emotionalValence: string }>)
                        ?.slice(0, 5)
                        .map((t, i) => (
                          <span key={i} className={`wl-term wl-term--${t.emotionalValence}`}>
                            {t.term}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="wl-glossary-section">
                    <strong>Philosophy:</strong>
                    <div className="wl-philosophy">
                      {(g.philosophy as { beliefs?: string[] })?.beliefs
                        ?.slice(0, 2)
                        .map((b, i) => (
                          <div key={i} className="wl-belief">
                            {b}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="wl-glossary-section">
                    <strong>Resentments:</strong>
                    <div className="wl-resentments">
                      {(g.resentments as { hates?: string[]; enemies?: string[] })?.hates
                        ?.slice(0, 3)
                        .map((h, i) => (
                          <span key={i} className="wl-hate">
                            {h}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="wl-glossary-section">
                    <strong>Future Vision:</strong>
                    <div className="wl-future">{g.futureVision?.slice(0, 200)}...</div>
                  </div>

                  <div className="wl-glossary-meta">
                    <span>Confidence: {((g.confidence || 0) * 100).toFixed(0)}%</span>
                    <span>Extracted: {g.extractedAt ? formatDate(g.extractedAt) : 'N/A'}</span>
                  </div>
                </div>
              )}

              {g.status === 'UNGLOSSABLE' && (
                <div className="wl-unglossable">{g.unglossableReason}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RunDetailTab({ run, repos }: { run: WeaveDiscoveryRun; repos: Repo[] }) {
  const logs = (run.logs as LogEntry[]) || []
  const glossaryAttempts = extractGlossaryAttempts(logs)
  const repoMap = new Map(repos.map((r) => [r.id, r.fullName]))

  return (
    <div className="wl-run-detail">
      <div className="wl-run-header">
        <div className="wl-run-meta">
          <div>
            <strong>Run ID:</strong> {run.id}
          </div>
          <div>
            <strong>Status:</strong> <StatusBadge status={run.status} />
          </div>
          <div>
            <strong>Started:</strong> {formatDate(run.startedAt)}
          </div>
          <div>
            <strong>Pairs:</strong> {run.repoPairsChecked}/{run.repoPairsTotal}
          </div>
          <div>
            <strong>Candidates:</strong> {run.candidatesFound}
          </div>
          <div>
            <strong>Saved:</strong> {run.weavesSaved}
          </div>
        </div>
      </div>

      {glossaryAttempts.length > 0 && (
        <div className="wl-section">
          <h4>Glossary Alignment Attempts</h4>
          <table className="wl-attempts-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Target</th>
                <th>Vocab</th>
                <th>Resent</th>
                <th>Philos</th>
                <th>Poetics</th>
                <th>Psych</th>
                <th>Final</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {glossaryAttempts.map((attempt, i) => (
                <tr
                  key={i}
                  className={attempt.scores && attempt.scores.final >= 0.5 ? 'wl-row--success' : ''}
                >
                  <td>{repoMap.get(attempt.sourceRepo) || attempt.sourceRepo.slice(0, 8)}</td>
                  <td>{repoMap.get(attempt.targetRepo) || attempt.targetRepo.slice(0, 8)}</td>
                  {attempt.scores ? (
                    <>
                      <td className="wl-score">{(attempt.scores.vocabulary * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.resentment * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.philosophy * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.poetics * 100).toFixed(0)}%</td>
                      <td className="wl-score">{(attempt.scores.psychology * 100).toFixed(0)}%</td>
                      <td
                        className={`wl-score wl-score--final ${attempt.scores.final >= 0.5 ? 'wl-score--pass' : 'wl-score--fail'}`}
                      >
                        {(attempt.scores.final * 100).toFixed(0)}%
                      </td>
                    </>
                  ) : (
                    <td colSpan={6} className="wl-no-scores">
                      —
                    </td>
                  )}
                  <td>
                    <span className={`wl-attempt-status wl-attempt-status--${attempt.status}`}>
                      {attempt.status === 'no_glossary' ? 'no glossary' : attempt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="wl-section">
        <h4>Raw Logs ({logs.length} entries)</h4>
        <div className="wl-logs">
          {logs.map((log, i) => (
            <div key={i} className={`wl-log wl-log--${log.level}`}>
              <span className="wl-log-time">
                {new Date(log.timestamp).toISOString().slice(11, 23)}
              </span>
              <span className="wl-log-level">{log.level}</span>
              <span className="wl-log-message">{log.message}</span>
              {log.data && Object.keys(log.data).length > 0 && (
                <pre className="wl-log-data">{JSON.stringify(log.data, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WeavesTab({ weaves }: { weaves: WeaveWithRepos[] }) {
  return (
    <div className="wl-section">
      <h3>Created Weaves</h3>
      <p className="wl-description">Weaves that were actually created and saved to the database.</p>

      {weaves.length === 0 ? (
        <div className="wl-empty">No weaves created yet.</div>
      ) : (
        <div className="wl-weaves">
          {weaves.map((w) => (
            <div key={w.id} className="wl-weave-card">
              <div className="wl-weave-header">
                <span className="wl-weave-title">{w.title}</span>
                <span className={`wl-weave-type wl-weave-type--${w.type}`}>
                  {w.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="wl-weave-repos">
                {w.sourceRepo.fullName} ↔ {w.targetRepo.fullName}
              </div>
              <div className="wl-weave-description">{w.description}</div>
              <div className="wl-weave-meta">
                <span>Score: {(w.score * 100).toFixed(0)}%</span>
                <span>Created: {formatDate(w.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function WeaveLogs({
  plexusId: _plexusId,
  runs,
  repos,
  glossaries,
  weaves,
}: WeaveLogsProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runs[0]?.id || null)
  const selectedRun = runs.find((r) => r.id === selectedRunId)

  return (
    <div className="wl-page">
      <PageHeader
        title="Weave Logs"
        subtitle="Raw data: glossaries, alignment attempts, and discovery logs"
      />

      <Tabs.Root defaultValue="runs">
        <Tabs.List>
          <Tabs.Tab value="runs">Discovery Runs ({runs.length})</Tabs.Tab>
          <Tabs.Tab value="glossaries">Glossaries ({glossaries.length})</Tabs.Tab>
          <Tabs.Tab value="weaves">Weaves ({weaves.length})</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>

        <Tabs.Panel value="runs">
          <div className="wl-runs-layout">
            <div className="wl-runs-list">
              <h3>Discovery Runs</h3>
              {runs.length === 0 ? (
                <div className="wl-empty">No discovery runs yet.</div>
              ) : (
                runs.map((run) => (
                  <button
                    type="button"
                    key={run.id}
                    className={`wl-run-item ${selectedRunId === run.id ? 'wl-run-item--selected' : ''}`}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <div className="wl-run-item-header">
                      <StatusBadge status={run.status} />
                      <span className="wl-run-item-date">{formatDate(run.startedAt)}</span>
                    </div>
                    <div className="wl-run-item-stats">
                      {run.repoPairsChecked}/{run.repoPairsTotal} pairs •{run.candidatesFound} found
                      •{run.weavesSaved} saved
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="wl-run-content">
              {selectedRun ? (
                <RunDetailTab run={selectedRun} repos={repos} />
              ) : (
                <div className="wl-empty">Select a run to view details</div>
              )}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="glossaries">
          <GlossariesTab glossaries={glossaries} repos={repos} />
        </Tabs.Panel>

        <Tabs.Panel value="weaves">
          <WeavesTab weaves={weaves} />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
